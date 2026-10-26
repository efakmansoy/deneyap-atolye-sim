// Konuşma (TTS) arayüzü. Varsayılan: tarayıcının konuşma sentezi (tr-TR). Kendi TTS'inizi bağlamak için:
//
//   window.DeneyapTTS.saglayiciAyarla({
//     konus(metin, { hiz }) { /* sesi çal; ses bitince çözülen bir Promise döndür */ },
//     durdur() { /* çalan sesi kes */ },
//     duraklat?() {}, devam?() {},           // isteğe bağlı
//   });
//
// `konus` Promise'i ses BİTİNCE çözülmelidir; anlatıcı kod yazma animasyonunu buna göre eşler.
// Ses yoksa/kapalıysa ("sessiz" mod) okuma hızına göre bir süre beklenir ve altyazı yine akar.

const OKUMA_MS_KARAKTER = 62;   // ortalama Türkçe konuşma hızı (≈ 16 karakter/sn)

const tarayici = {
  ad: 'Tarayıcı sesi',
  uygun: () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined',
  konus(metin, { hiz = 1 } = {}) {
    return new Promise(coz => {
      const u = new SpeechSynthesisUtterance(metin);
      u.lang = 'tr-TR'; u.rate = hiz; u.pitch = 1;
      const ses = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang));
      if (ses) u.voice = ses;
      u.onend = u.onerror = () => coz();
      speechSynthesis.speak(u);
    });
  },
  durdur() { speechSynthesis.cancel(); },
  duraklat() { speechSynthesis.pause(); },
  devam() { speechSynthesis.resume(); },
};

// Önceden üretilmiş öğretmen sesi: public/ses/<ders id>-<NN>.mp3 (tools/tts-uret.mjs ile üretilir). Dosya yoksa/çalmazsa tarayıcı sesine düşer.
const kayitli = {
  ad: 'Kayıtlı ses',
  uygun: () => typeof Audio !== 'undefined',
  ses: null, belirtec: 0,
  // public/ses/liste.json: tüm parçaları üretilmiş dersler. Listede olmayan ders baştan sona tarayıcı sesiyle okunur (aynı derste ses karışmasın).
  liste: typeof fetch === 'undefined' ? Promise.resolve({}) : fetch(`${import.meta.env?.BASE_URL ?? '/'}ses/liste.json`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
  async konus(metin, { hiz = 1, ders, sira } = {}) {
    const b = ++this.belirtec;
    if (!ders || sira == null || !(ders in await this.liste)) return tarayici.konus(metin, { hiz });
    if (b !== this.belirtec) return;
    const url = `${import.meta.env?.BASE_URL ?? '/'}ses/${ders}-${String(sira + 1).padStart(2, '0')}.mp3`;
    return new Promise(coz => {
      const a = new Audio(url); this.ses = a; this.coz = coz; a.playbackRate = hiz; a.preservesPitch = true;
      const yedek = () => { a.onended = a.onerror = null; if (b === this.belirtec) tarayici.konus(metin, { hiz }).then(coz); else coz(); };
      a.onended = () => { if (this.ses === a) { this.ses = null; this.coz = null; } coz(); };
      a.onerror = yedek;
      a.play().catch(yedek);
    });
  },
  durdur() { this.belirtec++; const a = this.ses, c = this.coz; this.ses = this.coz = null; if (a) { a.onended = a.onerror = null; a.pause(); } tarayici.durdur(); c?.(); },
  duraklat() { this.ses?.pause(); tarayici.duraklat(); },
  devam() { this.ses?.play?.().catch(() => {}); tarayici.devam(); },
};

class TTS {
  constructor() { this.saglayici = kayitli.uygun() ? kayitli : tarayici.uygun() ? tarayici : null; this.sessiz = false; this.hiz = 1; this.zamanlayicilar = new Set(); }

  saglayiciAyarla(s) { this.saglayici = s; }
  get sesVar() { return !!this.saglayici && !this.sessiz; }

  /** Konuşma süresi tahmini (ms): kod yazma animasyonunu eşlemek için. */
  sure(metin) { return Math.max(600, (metin.length * OKUMA_MS_KARAKTER) / this.hiz); }

  /** Metni seslendirir; ses bitince çözülür. durdur() çağrılırsa hemen çözülür. */
  konus(metin, bag = {}) {
    if (this.sesVar) {
      return Promise.race([
        this.saglayici.konus(metin, { hiz: this.hiz, ...bag }),
        new Promise(coz => this.zamanlayicilar.add(setTimeout(coz, this.sure(metin) * 4 + 4000))),   // takılan sağlayıcıya karşı emniyet
      ]).catch(() => {});
    }
    return new Promise(coz => { const z = setTimeout(() => { this.zamanlayicilar.delete(z); coz(); }, this.sure(metin)); this.zamanlayicilar.add(z); });
  }

  durdur() { try { this.saglayici?.durdur?.(); } catch {} for (const z of this.zamanlayicilar) clearTimeout(z); this.zamanlayicilar.clear(); }
  duraklat() { try { this.saglayici?.duraklat?.(); } catch {} }
  devam() { try { this.saglayici?.devam?.(); } catch {} }
}

export const tts = new TTS();
if (typeof window !== 'undefined') window.DeneyapTTS = tts;
