// public/ses/ içindeki mp3'leri ders sesli parçalarıyla karşılaştırıp public/ses/liste.json yazar: { "<ders id>": parça sayısı }
// Yalnızca TÜM parçaları mevcut olan dersler listeye girer (uygulama eksik dersi baştan sona tarayıcı sesiyle okur).
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const dir = path.resolve('src/lessons/icerik'), EK = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) Object.assign(EK, (await import(pathToFileURL(path.join(dir, f)).href)).default);
const ses = path.resolve('public/ses'), liste = {}, eksik = [];
for (const [id, e] of Object.entries(EK)) {
  const n = e.sesli?.length ?? 0; if (!n) continue;
  const var_ = Array.from({ length: n }, (_, i) => fs.existsSync(path.join(ses, `${id}-${String(i + 1).padStart(2, '0')}.mp3`)));
  if (var_.every(Boolean)) liste[id] = n; else eksik.push(`${id} (${var_.filter(Boolean).length}/${n})`);
}
fs.writeFileSync(path.join(ses, 'liste.json'), JSON.stringify(liste));
console.log(`${Object.keys(liste).length} ders tam, ${Object.values(liste).reduce((a, b) => a + b, 0)} parça`); if (eksik.length) console.log('EKSİK:', eksik.join(', '));
