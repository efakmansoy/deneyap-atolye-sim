// Arayüz dili: 'tr' (varsayılan) veya 'en'. Dil değişince sayfa yeniden yüklenir.
// Kaynak kodda Türkçe yazılan metinler derleme sırasında (tools/i18n/eklenti.mjs) __t() / __tp`` çağrılarına sarılır;
// İngilizce sözlük src/i18n/en.js içindedir (tools/i18n/birlestir.mjs üretir). Sesli anlatım (`ses` alanları) çevrilmez.
const depo = typeof localStorage === 'undefined' ? null : localStorage;
const oku = () => {
  try {
    const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
    if (q === 'tr' || q === 'en') { depo?.setItem('dil', q); return q; }
    return depo?.getItem('dil') === 'en' ? 'en' : 'tr';
  } catch { return 'tr'; }
};
export const DIL = oku();
const EN = DIL === 'en' ? (await import('./i18n/en.js')).default : null;

export function dilDegistir(d) { try { depo?.setItem('dil', d); } catch {} location.reload(); }

// Düz metin
export const __t = s => (EN && EN[s]) || s;

// Şablon etiketi: __tp`LED ${n} ms yandı` → anahtar "LED {0} ms yandı"
export function __tp(parcalar, ...v) {
  const tr = () => parcalar.reduce((s, p, i) => s + (i ? v[i - 1] : '') + p, '');
  if (!EN) return tr();
  const anahtar = parcalar.reduce((s, p, i) => s + (i ? `{${i - 1}}` : '') + p, '');
  const sablon = EN[anahtar];
  return sablon == null ? tr() : sablon.replace(/\{(\d+)\}/g, (_, i) => v[+i]);
}

// index.html'deki sabit metinler (metin düğümleri ve title / aria-label / placeholder)
export function sayfayiCevir(kok = document.body) {
  if (!EN) return;
  document.documentElement.lang = 'en';
  const cevir = s => { const t = s.trim(); return t && EN[t] ? s.replace(t, EN[t]) : s; };
  const yuru = d => {
    if (d.nodeType === 3) { const y = cevir(d.nodeValue); if (y !== d.nodeValue) d.nodeValue = y; return; }
    if (d.nodeType !== 1 || /^(SCRIPT|STYLE|CANVAS)$/.test(d.tagName)) return;
    for (const a of ['title', 'aria-label', 'placeholder']) if (d.hasAttribute(a)) d.setAttribute(a, cevir(d.getAttribute(a)));
    d.childNodes.forEach(yuru);
  };
  yuru(kok);
  if (EN[document.title]) document.title = EN[document.title];
}
