// src/lessons/m*.js dosyaları otomatik yüklenir (dosya adına göre sıralı). Her dosya `export default [ders, ...]` verir.
// src/lessons/icerik/*.js dosyaları derslere EK içerik bağlar (ders dosyalarına dokunmadan):
//   export default { '<ders id>': { sesli: [...], duzenle: [ {tip:'duzenle', ...}, ... ] }, ... }
//   sesli   → sesli anlatım parçaları (src/anlatici.js şeması)
//   duzenle → "kodu değiştir" görevleri; dersin gorevler listesinin sonuna eklenir
const modüller = import.meta.glob('./m*.js', { eager: true });
const ekler = import.meta.glob('./icerik/*.js', { eager: true });
const EK = Object.assign({}, ...Object.values(ekler).map(m => m.default));

// Doğal sıralama: m2-… < m10-… (modül numarası sayı olarak), aynı modülde ad sırası (m4-…, m4b-…)
const sira = k => { const m = /\/m(\d+)([^/]*)\.js$/.exec(k); return [+m[1], m[2]]; };
const anahtarlar = Object.keys(modüller).sort((a, b) => { const [x, xs] = sira(a), [y, ys] = sira(b); return x - y || xs.localeCompare(ys); });
export const DERSLER = anahtarlar.flatMap(k => modüller[k].default).map(d => {
  const e = EK[d.id];
  if (!e) return d;
  return { ...d, sesli: e.sesli ?? d.sesli, gorevler: [...(d.gorevler ?? []), ...(e.duzenle ?? [])] };
});
