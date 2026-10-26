// Sesli anlatıcı: ders anlatımını seslendirirken kodu editöre SATIR SATIR (harf harf) yazar.
//
// Ders şeması:   sesli: [ { ses, yaz?, temizle?, git?, parca?, kategori?, bekle? }, ... ]
//   ses       : seslendirilecek metin (aynı zamanda altyazı). Kısa, doğal cümleler.
//   yaz       : bu parçada editöre eklenecek kod (birden çok satır olabilir; anlatım sürerken yazılır)
//   temizle   : true ise parçaya başlamadan önce editör boşaltılır
//   parca     : 3B sahnede vurgulanacak parça indeksi (sahne.parcalar)      kategori: araç kutusu vurgusu (kullanılmıyorsa yok)
//   calistir  : true ise parçanın sonunda program çalıştırılır (sesli demo)
//   bekle     : parça sonrası ek bekleme (ms, varsayılan 350)
import { tts } from './tts.js';

const uyu = ms => new Promise(r => setTimeout(r, ms));

export class Anlatici {
  /** arayuz: { editorAc(), editorTemizle(), editorEkle(str) -> void, satirVurgu(n|null), parcaVurgu(i|null), altyazi(metin, i, n), durum(durum), calistir(), bitti(tamamlandi) } */
  constructor(arayuz) { this.a = arayuz; this.parcalar = []; this.i = 0; this.durum = 'bos'; this.belirteç = 0; this.duraklatildi = false; this.kapi = null; this.yazilan = 0; }

  yukle(ders) { this.durdur(); this.parcalar = ders.sesli ?? []; this.dersId = ders.id; this.i = 0; this.durum = this.parcalar.length ? 'hazir' : 'bos'; this.a.durum(this.durum); }
  get var() { return this.parcalar.length > 0; }

  async oynat(basla = 0) {
    if (!this.var) return;
    this.durdur(false);
    const b = ++this.belirteç;
    this.i = basla; this.durum = 'caliyor'; this.a.durum('caliyor');
    this.a.editorAc();
    if (basla === 0) this.a.editorTemizle();
    for (; this.i < this.parcalar.length; this.i++) {
      if (b !== this.belirteç) return;
      await this.#kapidaBekle(b);
      if (b !== this.belirteç) return;
      const p = this.parcalar[this.i];
      this.a.altyazi(p.ses, this.i, this.parcalar.length);
      this.a.parcaVurgu(p.parca ?? null);
      if (p.temizle && this.i > 0) this.a.editorTemizle();
      const sure = tts.sure(p.ses);
      const konus = tts.konus(p.ses, { ders: this.dersId, sira: this.i });
      const yaz = p.yaz ? this.#yaz(p.yaz, Math.min(sure * .9, Math.max(400, p.yaz.length * 55)), b) : Promise.resolve();
      await Promise.all([konus, yaz]);
      if (b !== this.belirteç) return;
      this.a.satirVurgu(null);
      if (p.calistir) await this.a.calistir();
      await uyu(p.bekle ?? 350);
    }
    if (b !== this.belirteç) return;
    this.durum = 'bitti'; this.a.durum('bitti'); this.a.parcaVurgu(null); this.a.satirVurgu(null); this.a.altyazi('', this.parcalar.length, this.parcalar.length);
    this.a.bitti(true);
  }

  /** Kodu karakter karakter ekler; yazılan satırı editörde vurgular. Süre: tüm kodun yazılma süresi (ms). */
  async #yaz(kod, sure, b) {
    const adim = Math.max(8, sure / Math.max(1, kod.length));
    let satir = 0; this.yazilan = 0;
    this.a.satirVurgu(satir);
    // okunabilirlik: harfleri 2'şer 3'er grup halinde ekle, satır sonlarında kısa nefes
    for (let k = 0; k < kod.length; ) {
      if (b !== this.belirteç) return;
      await this.#kapidaBekle(b);
      const n = Math.min(kod.length - k, 1 + (Math.random() * 2 | 0));
      const parca = kod.slice(k, k + n);
      this.a.editorEkle(parca);
      if (parca.includes('\n')) { satir++; this.a.satirVurgu(satir); }
      k += n; this.yazilan = k;
      await uyu(adim * n * (parca.includes('\n') ? 1.8 : 1));
    }
  }

  duraklat() { if (this.durum !== 'caliyor') return; this.duraklatildi = true; this.durum = 'duraklatildi'; this.a.durum('duraklatildi'); tts.duraklat(); }
  devam() { if (this.durum !== 'duraklatildi') return; this.duraklatildi = false; this.durum = 'caliyor'; this.a.durum('caliyor'); tts.devam(); this.kapi?.(); }
  #kapidaBekle(b) { return this.duraklatildi && b === this.belirteç ? new Promise(r => { this.kapi = r; }).then(() => { this.kapi = null; }) : Promise.resolve(); }

  /** Sıradaki parçaya atla (kod yazımını hemen tamamlar). */
  atla() {
    if (this.durum !== 'caliyor' && this.durum !== 'duraklatildi') return;
    const sonraki = this.i + 1;
    // mevcut parçanın kodunu tamamla, ardından kalan parçaları hızla uygula
    this.durdur(false);
    const p = this.parcalar[this.i];
    if (p?.yaz) this.a.editorEkle(p.yaz.slice(this.yazilan));
    this.oynat(sonraki >= this.parcalar.length ? this.parcalar.length - 1 : sonraki);
  }

  durdur(bildir = true) {
    this.belirteç++; this.duraklatildi = false; this.kapi?.(); this.kapi = null;
    tts.durdur(); this.a.satirVurgu(null);
    if (this.durum === 'caliyor' || this.durum === 'duraklatildi') this.durum = 'hazir';
    if (bildir) { this.a.durum(this.parcalar.length ? 'hazir' : 'bos'); this.a.parcaVurgu(null); this.a.altyazi('', 0, this.parcalar.length); }
  }
}
