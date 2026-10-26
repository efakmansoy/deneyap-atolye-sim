// Sanal donanım: pin durumları, olay kaydı ve SANAL SAAT.
// Sanal saat belirleyicidir (deterministik): tüm bekleyenler (program, ders girdi senaryosu, ders süresi) tek bir
// olay kuyruğunda sanal zamana göre sıralanır. Gerçek zaman yalnızca hızı ayarlar (hiz = sanal ms / gerçek ms);
// CPU gecikse bile olaylar sanal zaman sırasıyla işlenir, programlar birbirinden kaymaz.
import { Ag } from './ag.js';
export const PINLER = ['D0','D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','A0','A1','A2','A3','A4','A5','A6','A7'];

export class DurdurSinyali extends Error {}

const simdi = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const macro = () => new Promise(r => setTimeout(r, 0));

export class Sim {
  constructor() {
    this.hiz = 1; this.dinleyiciler = new Set();
    this.kuyruk = []; this.sayac = 0; this.zamanlayici = null; this.zamanlayiciHedef = 0; this.isliyor = false;
    this._iptal = false;
    this.sifirla();
  }

  /** iptal = true: bekleyen her şey DurdurSinyali ile uyandırılır, programlar sonlanır. */
  get iptal() { return this._iptal; }
  set iptal(v) { this._iptal = !!v; if (v) { this.#bekleyenleriReddet(); this.ag?.bosalt('Program durdu'); } }
  iptalEt() { this.iptal = true; }

  sifirla() {
    this.#bekleyenleriReddet();
    this.pin = Object.fromEntries(PINLER.map(p => [p, { mod: 'girdi', deger: 0, pwm: 0 }]));
    this.girdi = {};            // dijital girdiler (düğme vb.): pin -> 0/1
    this.dokunma = {};          // dokunmatik (touchRead) ham değerleri: pin -> sayı; yoksa boşta ~70, parmakla ~10
    this.ag?.bosalt('Program sıfırlandı');
    this.ag = new Ag(this);     // sanal Wi-Fi + WebServer
    this.analog = {};           // analog girdiler (pot, LDR...): pin -> 0..4095
    this.cihaz = {};            // parçaların serbest durumu: servo açısı, buzzer frekansı, LCD satırları...
    this.olaylar = [];          // {t, pin, deger}
    this.t = 0;                 // sanal ms
    this.gercekBas = null;      // sanal 0 anının gerçek saat karşılığı (ilk bekleyişte belirlenir)
    this.seriCikti = [];
    this._iptal = false;
    this.yay();
  }

  yay() { for (const f of this.dinleyiciler) f(this); }
  pinModu(p, mod) { this.pin[p].mod = mod; }
  yaz(p, v) {
    const s = this.pin[p]; if (!s) throw new Error('Böyle bir pin yok: ' + p);
    if (s.mod !== 'cikti') s.mod = 'cikti';
    v = v ? 1 : 0;
    if (s.deger !== v) { s.deger = v; this.olaylar.push({ t: this.t, pin: p, deger: v }); }
    s.pwm = v; this.yay();
  }
  pwmYaz(p, v) {
    const s = this.pin[p]; s.mod = 'cikti';
    s.pwm = Math.max(0, Math.min(255, v)) / 255; s.deger = s.pwm > 0 ? 1 : 0;
    this.olaylar.push({ t: this.t, pin: p, deger: s.pwm }); this.yay();
  }
  /** Dijital okuma. sim.girdi[p] = 'fiziksel basılı/yüksek' (düğme parçası basılınca 1 yazar).
   *  INPUT_PULLUP modunda ters mantık: boşta 1, düğme basılıyken (girdi=1) 0 okunur. */
  oku(p) {
    const g = this.girdi[p] ?? 0;
    return this.pin[p]?.mod === 'pullup' ? (g > 0 ? 0 : 1) : g;
  }
  /** touchRead: boşta ~70, parmak değince ~10 (sim.dokunma[pin] ile ezilir). */
  dokunmaOku(p) { return Math.round(this.dokunma[p] ?? 70); }
  analogOku(p) { return Math.round(this.analog[p] ?? 0); }
  seri(s) { this.seriCikti.push(String(s)); this.yay(); }

  /** Gerçek saatin sanal karşılığı. */
  sanalSimdi() { return this.gercekBas == null ? this.t : (simdi() - this.gercekBas) * this.hiz; }
  #saatiBaslat() { if (this.gercekBas == null) this.gercekBas = simdi() - this.t / this.hiz; }

  /** `ms` sanal milisaniye bekle. Aynı sanal ana düşen bekleyenler birlikte, kayıt sırasıyla uyanır. */
  bekle(ms) {
    if (this._iptal) return Promise.reject(new DurdurSinyali());
    this.#saatiBaslat();
    return new Promise((coz, red) => {
      this.kuyruk.push({ hedef: this.t + Math.max(0, Number(ms) || 0), coz, red, sira: this.sayac++ });
      this.#planla();
    });
  }

  /** Bekleme yapmayan (meşgul) döngüler için: olay döngüsüne nefes aldırır, sanal zamanı bir sonraki bekleyene kadar ilerletir. */
  async tick() {
    if (this._iptal) throw new DurdurSinyali();
    this.#saatiBaslat();
    await macro();
    if (this._iptal) throw new DurdurSinyali();
    // Not: tick sanal zamanı ilerletmez; zaman yalnızca bekle() ile (ve bekleyenlerin sırasıyla) ilerler.
  }

  macro() { return macro(); }

  #planla() {
    if (!this.kuyruk.length) return;
    const sonraki = Math.min(...this.kuyruk.map(w => w.hedef));
    if (this.zamanlayici && this.zamanlayiciHedef <= sonraki) return;
    clearTimeout(this.zamanlayici);
    this.zamanlayiciHedef = sonraki;
    const gecikme = Math.max(0, this.gercekBas + sonraki / this.hiz - simdi());
    this.zamanlayici = setTimeout(() => { this.zamanlayici = null; this.#isle(); }, gecikme);
  }

  async #isle() {
    if (this.isliyor) return;
    this.isliyor = true;
    try {
      while (this.kuyruk.length && !this._iptal) {
        const hedef = Math.min(...this.kuyruk.map(w => w.hedef));
        if (hedef > this.sanalSimdi()) break;
        const grup = this.kuyruk.filter(w => w.hedef === hedef).sort((a, b) => a.sira - b.sira);
        this.kuyruk = this.kuyruk.filter(w => w.hedef !== hedef);
        this.t = hedef;
        for (const w of grup) w.coz();
        await macro();               // uyanan programlar bu sanal anda çalışıp bitsin, sonra bir sonrakine geç
      }
    } finally { this.isliyor = false; this.#planla(); }
  }

  #bekleyenleriReddet() {
    clearTimeout(this.zamanlayici); this.zamanlayici = null;
    const k = this.kuyruk; this.kuyruk = [];
    for (const w of k) w.red(new DurdurSinyali());
  }
}
