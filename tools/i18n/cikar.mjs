// Çevrilebilir metin adaylarını çıkarır: node tools/i18n/cikar.mjs  → tools/i18n/_adaylar.json
import fs from 'node:fs'; import path from 'node:path';
import { tara, TR_HARF } from './ortak.mjs';
const kok = path.resolve(import.meta.dirname, '../../src');
const dosyalar = []; (function yuru(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? yuru(p) : p.endsWith('.js') && dosyalar.push(p); } })(kok);
const harita = new Map();   // anahtar → {dosyalar:Set, tur}
for (const d of dosyalar) {
  const kod = fs.readFileSync(d, 'utf8');
  for (const b of tara(kod, d)) {
    const e = harita.get(b.anahtar) ?? { dosya: new Set(), tur: b.tur, oz: new Set() }; e.oz.add(b.oz); e.dosya.add(path.relative(kok, d).split(path.sep).join('/')); harita.set(b.anahtar, e);
  }
}
const cikti = [...harita].map(([k, v]) => ({ k, d: [...v.dosya], t: v.tur, o: [...v.oz] }));
fs.writeFileSync(path.join(import.meta.dirname, '_adaylar.json'), JSON.stringify(cikti));
const A = cikti.filter(x => TR_HARF.test(x.k)), B = cikti.filter(x => !TR_HARF.test(x.k));
console.log('toplam', cikti.length, 'Türkçe harfli', A.length, 'karakter', A.reduce((s, x) => s + x.k.length, 0), 'diğer', B.length);
