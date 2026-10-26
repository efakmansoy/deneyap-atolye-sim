// Ders metinlerindeki blok adlarının İngilizce araç kutusu etiketleriyle uyumunu denetler: node tools/i18n/blok-adlari.mjs
import fs from 'node:fs'; import path from 'node:path';
const en = (await import(path.resolve('src/i18n/en.js').replace(/^/, 'file:///').replace('file:////', 'file:///'))).default;
const kok = path.resolve('src'); const dosyalar = [];
(function y(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? y(p) : p.endsWith('.js') && dosyalar.push(p); } })(kok);
// Blok etiketleri: blocks.js ve bloklar/*.js içindeki message0 dizeleri
const etiket = [];
for (const d of dosyalar.filter(f => /blocks\.js$|bloklar/.test(f))) for (const m of fs.readFileSync(d, 'utf8').matchAll(/message0:\s*'([^']+)'/g)) etiket.push(m[1]);
const kok_ = s => s.replace(/%\d/g, '|').split('|').map(x => x.trim()).filter(x => x.length > 2);
const sonuc = [];
for (const tr of etiket) {
  const e = en[tr]; if (!e) { sonuc.push(['ÇEVİRİSİ YOK', tr]); continue; }
  const trK = kok_(tr), enK = kok_(e);
  for (const [i, t] of trK.entries()) {
    const eK = enK[i]; if (!eK) continue;
    // Türkçe ders metinleri içinde bu blok adını anan İngilizce metinler
    let say = 0, yanlis = [];
    for (const [k, v] of Object.entries(en)) {
      if (k === tr || k.length < 25 || !k.toLowerCase().includes(t.toLowerCase())) continue;
      say++; if (!v.toLowerCase().includes(eK.toLowerCase())) yanlis.push(v.slice(0, 110));
    }
    if (yanlis.length) sonuc.push([`${t}  →  "${eK}"  (${yanlis.length}/${say} metinde yok)`, yanlis.slice(0, 3).join(' || ')]);
  }
}
for (const [a, b] of sonuc) console.log(a + '\n    ' + b);
console.log('etiket sayısı', etiket.length, 'sorunlu', sonuc.length);
