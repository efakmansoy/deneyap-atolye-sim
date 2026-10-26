// Oyunlaştırma: XP, seviye, günlük seri, rozetler, konfeti ve bildirimler. Profil başına saklanır.
import { profil } from './profil.js';

export const XP = { ders: 100, ilkDeneme: 25, yazili: 30, kodGorev: 40, duzenleGorev: 50, soru: 15, anlatim: 20 };
export const seviyeEsigi = s => 60 * (s - 1) ** 2;                 // seviye s için gereken toplam XP
export const seviyeHesapla = xp => 1 + Math.floor(Math.sqrt(xp / 60));

// Rozet tanımları: kosul(durum) -> bool. durum = { xp, ders:Set, modulBitti:Set, soruDogru, seriGun, yaziliGecti, ilkDenemeSay, saat, anlatimSay, duzenleSay }
export const ROZETLER = [
  { id: 'ilk-isik', ad: 'İlk Işık', simge: '💡', acik: 'İlk dersini tamamla', kosul: d => d.ders.size >= 1 },
  { id: 'bes-ders', ad: 'Isınıyoruz', simge: '🔥', acik: '5 ders tamamla', kosul: d => d.ders.size >= 5 },
  { id: 'on-ders', ad: 'Yarı Yolda', simge: '🚩', acik: '10 ders tamamla', kosul: d => d.ders.size >= 10 },
  { id: 'tum-dersler', ad: 'Mühendis', simge: '🎓', acik: 'Tüm dersleri tamamla', kosul: d => d.ders.size >= d.toplamDers && d.toplamDers > 0 },
  { id: 'mod-1', ad: 'LED Ustası', simge: '🔴', acik: 'Modül 1\'i bitir', kosul: d => d.modulBitti.has(1) },
  { id: 'mod-2', ad: 'Düğme Ustası', simge: '🔘', acik: 'Modül 2\'yi bitir', kosul: d => d.modulBitti.has(2) },
  { id: 'mod-3', ad: 'Analog Büyücü', simge: '🎛️', acik: 'Modül 3\'ü bitir', kosul: d => d.modulBitti.has(3) },
  { id: 'mod-4', ad: 'Ses ve Hareket', simge: '🎵', acik: 'Modül 4\'ü bitir', kosul: d => d.modulBitti.has(4) },
  { id: 'mod-5', ad: 'Proje Yöneticisi', simge: '🏗️', acik: 'Modül 5\'i bitir', kosul: d => d.modulBitti.has(5) },
  { id: 'yazar', ad: 'Kod Yazarı', simge: '⌨️', acik: 'Elle yazdığın C++ ile bir dersi geç', kosul: d => d.yaziliGecti >= 1 },
  { id: 'yazar-5', ad: 'Klavye Kahramanı', simge: '🦾', acik: 'Elle yazdığın C++ ile 5 ders geç', kosul: d => d.yaziliGecti >= 5 },
  { id: 'soru-10', ad: 'Soru Avcısı', simge: '🎯', acik: '10 soruyu doğru cevapla', kosul: d => d.soruDogru >= 10 },
  { id: 'ilk-deneme', ad: 'Tek Atış', simge: '🏹', acik: '3 dersi ilk denemede geç', kosul: d => d.ilkDenemeSay >= 3 },
  { id: 'duzenleyici', ad: 'Kod Cerrahı', simge: '🩺', acik: '3 "kodu değiştir" görevini çöz', kosul: d => d.duzenleSay >= 3 },
  { id: 'dinleyici', ad: 'İyi Dinleyici', simge: '🎧', acik: '5 sesli anlatımı sonuna kadar dinle', kosul: d => d.anlatimSay >= 5 },
  { id: 'seri-3', ad: '3 Gün Seri', simge: '📅', acik: '3 gün üst üste çalış', kosul: d => d.seriGun >= 3 },
  { id: 'seri-7', ad: 'Haftalık Seri', simge: '🌈', acik: '7 gün üst üste çalış', kosul: d => d.seriGun >= 7 },
  { id: 'gece-kusu', ad: 'Gece Kuşu', simge: '🦉', acik: 'Gece 22:00 ile 05:00 arasında bir ders tamamla', kosul: d => d.geceDers },
  { id: 'xp-500', ad: '500 XP', simge: '⭐', acik: '500 XP topla', kosul: d => d.xp >= 500 },
  { id: 'xp-1500', ad: '1500 XP', simge: '🌟', acik: '1500 XP topla', kosul: d => d.xp >= 1500 },
];

const bugun = () => new Date().toISOString().slice(0, 10);
const gunFarki = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

class Oyun {
  constructor() { this.dinleyiciler = new Set(); this.modulBoyutlari = {}; this.toplamDers = 0; }

  durum() {
    const d = profil.depo;
    return {
      xp: d.oku('xp', 0), rozet: d.oku('rozet', {}), seri: d.oku('seri', { son: null, gun: 0 }),
      ist: d.oku('ist', { soruDogru: 0, yaziliGecti: 0, ilkDenemeSay: 0, anlatimSay: 0, duzenleSay: 0, geceDers: false, anlatimlar: [] }),
    };
  }
  seviye() { const { xp } = this.durum(); const s = seviyeHesapla(xp); const lo = seviyeEsigi(s), hi = seviyeEsigi(s + 1); return { seviye: s, xp, lo, hi, oran: (xp - lo) / (hi - lo) }; }

  /** Dersler listesini bildir (modül tamamlama ve toplam için). */
  dersleriBildir(DERSLER, modulNo) { this.modulBoyutlari = {}; DERSLER.forEach(d => { const m = modulNo(d); (this.modulBoyutlari[m] ??= []).push(d.id); }); this.toplamDers = DERSLER.length; }

  /** XP ver ve olayı bildir. neden: kısa Türkçe açıklama. */
  xpVer(miktar, neden) {
    const d = profil.depo, xp = d.oku('xp', 0), once = seviyeHesapla(xp);
    d.yaz('xp', xp + miktar);
    this.#yay({ tur: 'xp', miktar, neden });
    const sonra = seviyeHesapla(xp + miktar);
    if (sonra > once) this.#yay({ tur: 'seviye', seviye: sonra });
    this.rozetKontrol();
  }

  /** Listeye benzersiz kimlik ekler (ör. dinlenen anlatımlar). Yeni eklendiyse true. */
  isaretle(anahtar, id) { const d = profil.depo, ist = d.oku('ist', {}), l = ist[anahtar] ?? []; if (l.includes(id)) return false; ist[anahtar] = [...l, id]; d.yaz('ist', ist); return true; }

  /** İstatistik sayaç artır. */
  say(anahtar, n = 1) { const d = profil.depo, ist = d.oku('ist', {}); ist[anahtar] = (ist[anahtar] ?? 0) + n; d.yaz('ist', ist); }
  bayrak(anahtar, v = true) { const d = profil.depo, ist = d.oku('ist', {}); ist[anahtar] = v; d.yaz('ist', ist); }

  /** Günlük seriyi güncelle (her ders/görev tamamlandığında çağrılır). */
  seriGuncelle() {
    const d = profil.depo, s = d.oku('seri', { son: null, gun: 0 }), b = bugun();
    if (s.son === b) return s;
    const yeni = { son: b, gun: s.son && gunFarki(s.son, b) === 1 ? s.gun + 1 : 1 };
    d.yaz('seri', yeni);
    if (yeni.gun > 1) this.#yay({ tur: 'seri', gun: yeni.gun });
    return yeni;
  }

  rozetKontrol() {
    const d = profil.depo, tamam = new Set(d.oku('tamam', [])), { xp, rozet, seri, ist } = this.durum();
    const modulBitti = new Set(Object.entries(this.modulBoyutlari).filter(([, ids]) => ids.length && ids.every(i => tamam.has(i))).map(([m]) => +m));
    const durum = { xp, ders: tamam, modulBitti, toplamDers: this.toplamDers, seriGun: seri.gun, soruDogru: ist.soruDogru ?? 0, yaziliGecti: ist.yaziliGecti ?? 0, ilkDenemeSay: ist.ilkDenemeSay ?? 0, anlatimSay: ist.anlatimSay ?? 0, duzenleSay: ist.duzenleSay ?? 0, geceDers: !!ist.geceDers };
    const yeni = ROZETLER.filter(r => !rozet[r.id] && r.kosul(durum));
    if (!yeni.length) return [];
    for (const r of yeni) rozet[r.id] = new Date().toISOString();
    d.yaz('rozet', rozet);
    for (const r of yeni) this.#yay({ tur: 'rozet', rozet: r });
    return yeni;
  }

  dinle(f) { this.dinleyiciler.add(f); return () => this.dinleyiciler.delete(f); }
  #yay(o) { for (const f of this.dinleyiciler) f(o); }
}
export const oyun = new Oyun();

/** Basit konfeti (canvas, kendi kendini kaldırır). */
export function konfeti(adet = 120) {
  if (typeof document === 'undefined') return;
  const c = document.createElement('canvas');
  Object.assign(c.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 });
  c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
  const x = c.getContext('2d'), renkler = ['#2dd4bf', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#34d399'];
  const p = Array.from({ length: adet }, () => ({ x: c.width / 2 + (Math.random() - .5) * 200, y: c.height * .55, vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 4, r: 4 + Math.random() * 5, k: renkler[Math.random() * renkler.length | 0], d: Math.random() * 6, v: (Math.random() - .5) * .3 }));
  let t = 0;
  (function kare() {
    x.clearRect(0, 0, c.width, c.height);
    for (const q of p) { q.vy += .35; q.x += q.vx; q.y += q.vy; q.d += q.v; x.save(); x.translate(q.x, q.y); x.rotate(q.d); x.fillStyle = q.k; x.fillRect(-q.r, -q.r / 2, q.r * 2, q.r); x.restore(); }
    if (++t < 130) requestAnimationFrame(kare); else c.remove();
  })();
}
