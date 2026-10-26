// Sanal Wi-Fi + WebServer (sim.ag). Tarayıcıda ve node'da çalışır, DOM'a dokunmaz.
// Programın tarafı (WiFi.begin, server.on/handleClient/send) src/cppcalistir.js içindedir; bu sınıf ortak durumdur.
// Telefon tarafı (UI ya da ders girdi senaryosu): sim.ag.istek('/led?durum=1') -> Promise<{kod,tip,metin,hata?,yol,arg}>

export const WL = { IDLE: 0, NO_SSID: 1, SCAN: 2, CONNECTED: 3, FAILED: 4, LOST: 5, DISCONNECTED: 6 };

export class Ag {
  constructor(sim) {
    this.sim = sim;
    this.wifi = { mod: 0, ssid: null, sifre: null, baglanmaT: null, durum: WL.IDLE, ap: null };
    this.ip = '192.168.1.42';          // istasyon (STA) IP adresi
    this.apIp = '192.168.4.1';         // softAP IP adresi
    this.baglanmaSuresi = 1500;        // WiFi.begin'den bağlanmaya kadar sanal ms
    this.aglar = null;                 // null: her ağ kabul. { 'SSID': 'şifre' }: yalnızca bunlar (yanlış şifre -> FAILED, bilinmeyen -> NO_SSID)
    this.sunucular = new Map();        // port -> { port, basladi, yollar:[...], bulunamadi }
    this.kuyruk = [];                  // bekleyen istekler (handleClient bekler)
    this.gecmis = [];                  // {t, yol, arg, kod, tip, metin, hata?}
    this.sayfa = null;                 // son cevap
  }

  /** WiFi.begin(ssid, sifre) */
  baglan(ssid, sifre) {
    const w = this.wifi;
    w.ssid = String(ssid ?? ''); w.sifre = sifre == null ? '' : String(sifre); w.baglanmaT = this.sim.t + this.baglanmaSuresi; w.durum = WL.DISCONNECTED;
    this.sim.yay();
  }
  /** WiFi.status() değeri; sanal saate göre belirlenir. */
  durum() {
    const w = this.wifi;
    if (w.ssid == null) return WL.IDLE;
    if (w.durum !== WL.DISCONNECTED) return w.durum;
    if (this.sim.t < w.baglanmaT) return WL.DISCONNECTED;
    if (this.aglar) {
      if (!(w.ssid in this.aglar)) w.durum = WL.NO_SSID;
      else if (this.aglar[w.ssid] !== w.sifre) w.durum = WL.FAILED;
      else w.durum = WL.CONNECTED;
    } else w.durum = w.ssid ? WL.CONNECTED : WL.NO_SSID;
    this.sim.yay();
    return w.durum;
  }
  bagli() { return this.durum() === WL.CONNECTED; }
  kes() { Object.assign(this.wifi, { ssid: null, sifre: null, baglanmaT: null, durum: WL.IDLE }); this.sim.yay(); }
  apAc(ssid, sifre) { this.wifi.ap = { ssid: String(ssid ?? ''), sifre: sifre == null ? '' : String(sifre) }; this.sim.yay(); return true; }
  /** Telefonun gördüğü ağ: istasyon bağlıysa o IP, değilse softAP varsa AP IP, yoksa null. */
  adres() { return this.bagli() ? this.ip : this.wifi.ap ? this.apIp : null; }

  // ── sunucu kaydı (programın WebServer nesnesi çağırır) ──
  sunucuKaydet(s) { this.sunucular.set(s.port, s); this.sim.yay(); }
  yollar(port = 80) { return [...(this.sunucular.get(port)?.yollar.keys() ?? [])]; }

  /**
   * Telefondan istek: istek('/') | istek('/led?durum=1') | istek('/led', { arg: { durum: 1 } }).
   * Programın handleClient() çağırmasını bekler. Program yoksa/sunucu açık değilse hemen { kod: 0, hata } döner.
   */
  istek(adres = '/', { arg = {}, port = 80, yontem = 'GET' } = {}) {
    let yol = String(adres || '/'), qs = '';
    yol = yol.replace(/^https?:\/\/[^/]+/i, '');
    const q = yol.indexOf('?'); if (q >= 0) { qs = yol.slice(q + 1); yol = yol.slice(0, q); }
    if (!yol.startsWith('/')) yol = '/' + yol;
    const argl = { ...Object.fromEntries(new URLSearchParams(qs)), ...Object.fromEntries(Object.entries(arg).map(([k, v]) => [k, String(v)])) };
    const bitir = (hata) => { const y = { kod: 0, tip: '', metin: '', hata, yol, arg: argl }; this.#kaydet(y); return Promise.resolve(y); };
    if (this.sim.iptal) return bitir('Program çalışmıyor: önce Çalıştır\'a bas');
    if (!this.adres()) return bitir('Telefon bir ağa bağlı değil: ESP32 henüz Wi-Fi\'ye bağlanmadı (WiFi.begin) ve softAP açık değil');
    const s = this.sunucular.get(port);
    if (!s || !s.basladi) return bitir('Sunucu çalışmıyor: server.begin() çağrılmadı');
    return new Promise(coz => this.kuyruk.push({ yol, arg: argl, yontem, port, t: this.sim.t, coz }));
  }
  /** handleClient(): sıradaki isteği al (yoksa null). */
  al(port = 80) {
    const i = this.kuyruk.findIndex(r => r.port === port);
    return i < 0 ? null : this.kuyruk.splice(i, 1)[0];
  }
  yanitla(r, y) {
    const c = y ? { ...y, yol: r.yol, arg: r.arg } : { kod: 0, tip: '', metin: '', hata: 'Sunucu cevap vermedi: yol işleyicisi server.send(...) çağırmadı', yol: r.yol, arg: r.arg };
    this.#kaydet(c); r.coz(c);
  }
  #kaydet(c) { c.t = this.sim.t; this.gecmis.push(c); this.sayfa = c; this.sim.yay(); }
  /** Program durunca/sıfırlanınca bekleyen istekleri hata ile bitir. */
  bosalt(neden) {
    const k = this.kuyruk; this.kuyruk = [];
    for (const r of k) { const c = { kod: 0, tip: '', metin: '', hata: neden, yol: r.yol, arg: r.arg, t: this.sim.t }; this.gecmis.push(c); this.sayfa = c; r.coz(c); }
  }
  /** Ders kontrolü için: son cevap (gecmis'in sonuncusu) ya da null. */
  sonCevap() { return this.gecmis.at(-1) ?? null; }
}
