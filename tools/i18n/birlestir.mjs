// tools/i18n/ceviri/en-NN.txt dosyalarını src/i18n/en.js sözlüğüne birleştirir: node tools/i18n/birlestir.mjs
// Biçim:  "@@<id>" satırı + çeviri metni (çok satırlı olabilir). "@@=<Türkçe anahtar>" satırı da geçerlidir (sabit HTML metinleri).
import fs from 'node:fs'; import path from 'node:path';
const d = import.meta.dirname, secili = new Map(JSON.parse(fs.readFileSync(path.join(d, '_secili.json'), 'utf8')));
// Derslerdeki blok çipleri (<span class="chip ...">) araç kutusundaki gerçek İngilizce blok etiketleriyle aynı yazılsın
const HL = d => (d === 'HIGH' ? 1 : 0);
const ADLAR = [
  [/^set pin (D\d+|\[ \]) (?:to )?(HIGH|LOW)(?: \([01]\))?$/, (_, p, d) => `set ${p} to ${d} (${HL(d)})`],
  [/^set (D\d+) (?:to )?(HIGH|LOW)( \([01]\))?$/, (_, p, d) => `set ${p} to ${d} (${HL(d)})`],
  [/^(?:set )?pin (D\d+) (HIGH|LOW)$/, (_, p, d) => `set ${p} to ${d} (${HL(d)})`],
  [/^(D\d+) (HIGH|LOW)$/, (_, p, d) => `set ${p} to ${d} (${HL(d)})`],
  [/^set (D[0-9]+) servo to/, 'set servo $1 to'],
  [/^is pin (\S+) high\?$/, 'is $1 high?'],
  [/^(?:write(?: to)? LCD line|LCD row) ?(\d)?( write)?$/, (_, n) => (n ? `LCD row ${n} write` : 'LCD row write')],
  [/^play 1000 Hz tone on pin (D\d+)$/, 'play 1000 Hz sound on pin $1'],
  [/^(D\d+) play tone (\d+)$/, 'play $2 Hz sound on pin $1'],
  [/^stop the sound on (D\d+)$/, 'stop the sound on pin $1'],
  [/^read analog value (A\d)$/, 'read analog value of $1 (0-4095)'],
  [/^(D\d+) button value \(0 \/ 1\)$/, 'button $1 value (0 / 1)'],
  [/^(D\d+) distance sensor \(cm\)$/, 'distance sensor $1 (cm)'],
];
const chipDuzelt = s => s.replace(/(<span class="chip[^"]*">)([^<]+)(<\/span>)/g, (m, a, t, c) => { for (const [re, yer] of ADLAR) if (re.test(t)) return a + t.replace(re, yer) + c; return m; });
const sozluk = {}; let say = 0, bos = 0; const eksik = new Set(secili.keys());
for (const f of fs.readdirSync(path.join(d, 'ceviri')).filter(f => /^en-.*\.txt$/.test(f)).sort()) {
  const metin = fs.readFileSync(path.join(d, 'ceviri', f), 'utf8').replace(/\r\n/g, '\n');
  for (const blok of metin.split(/^@@/m).slice(1)) {
    const nl = blok.indexOf('\n'), baslik = blok.slice(0, nl); let govde = blok.slice(nl + 1).replace(/\n$/, '');
    let anahtar;
    if (baslik.startsWith('=')) anahtar = baslik.slice(1); else { const id = +baslik; anahtar = secili.get(id); eksik.delete(id); if (anahtar == null) { console.log('bilinmeyen id', f, baslik); continue; } }
    if (!govde.trim()) { bos++; continue; }
    // Anahtarın baştaki/sondaki boşluk ve satır sonları çeviriye aynen taşınır
    govde = anahtar.match(/^\s*/)[0] + govde.trim() + anahtar.match(/\s*$/)[0];
    // Yer tutucular ({0}…) aynı kalmalı
    const yt = s => (s.match(/\{\d+\}/g) ?? []).sort().join();
    if (yt(anahtar) !== yt(govde)) console.log('YER TUTUCU FARKI', f, JSON.stringify(anahtar.slice(0, 60)), '→', JSON.stringify(govde.slice(0, 60)));
    // HTML etiket sayısı aynı olmalı
    const et = s => (s.match(/<\/?[a-z][^>]*>/gi) ?? []).length;
    if (et(anahtar) !== et(govde)) console.log('ETİKET FARKI', f, JSON.stringify(anahtar.slice(0, 60)), et(anahtar), et(govde));
    sozluk[anahtar] = chipDuzelt(govde); say++;
  }
}
fs.writeFileSync(path.join(d, '../../src/i18n/en.js'), '// OTOMATİK ÜRETİLDİ (tools/i18n/birlestir.mjs) — elle düzenleme; kaynak: tools/i18n/ceviri/en-*.txt\nexport default ' + JSON.stringify(sozluk) + ';\n');
console.log('çevrilen', say, 'boş', bos, 'çevrilmeyen', eksik.size);
if (process.argv[2] === '--eksik') console.log([...eksik].slice(0, 20));
