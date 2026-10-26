// Çevrilecek anahtarları seçip ~20 KB'lık kaynak parçalara böler: node tools/i18n/parcala.mjs
import fs from 'node:fs'; import path from 'node:path';
import { TR_HARF } from './ortak.mjs';
const d = import.meta.dirname, a = JSON.parse(fs.readFileSync(path.join(d, '_adaylar.json'), 'utf8'));
const SW = /\b(ve|bir|icin|ile|bu|yap|olur|nedir|hangi|gibi|sonra|once|kadar|degil|var|yok|mi|mu|ise|ama|veya|her|cok|daha|yaz|oku|bekle|yan|son|yerine|gelmedi|hareket|ilerlemedi|saniye|ekle)\b/i;
const kodMu = k => /[;{}]\s*$|\n|\(\)|^\s*[a-z]+\.[a-z]+\(|=>|\$\.|sim\./.test(k.replace(/\{\d+\}/g, '')) && !/<[a-z]/i.test(k);
const sec = a.map((x, id) => ({ ...x, id })).filter(x => TR_HARF.test(x.k) || (SW.test(x.k) && !kodMu(x.k) && x.k.length < 400));
fs.writeFileSync(path.join(d, '_secili.json'), JSON.stringify(sec.map(x => [x.id, x.k])));
sec.sort((p, q) => (p.d[0] < q.d[0] ? -1 : p.d[0] > q.d[0] ? 1 : p.id - q.id));
let n = 0, boyut = 0, cikti = [];
const yaz = () => { if (cikti.length) fs.writeFileSync(path.join(d, 'ceviri', `kaynak-${String(n).padStart(2, '0')}.txt`), cikti.join('')); n++; cikti = []; boyut = 0; };
for (const x of sec) { const s = `@@${x.id}\n${x.k}\n`; if (boyut + s.length > 22000) yaz(); cikti.push(s); boyut += s.length; }
yaz();
console.log('seçili', sec.length, 'parça', n);
