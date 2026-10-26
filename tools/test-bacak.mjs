// Tüm ders sahnelerinde breadboard'a oturan parçaların her bacağı gerçek bir deliğe denk geliyor mu?
// Ayrıca farklı parçaların bacakları aynı sütun şeridinde olmasın (kısa devre). Kullanım: node tools/test-bacak.mjs
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { CX, CZ, P, SATIR as SATIR_O, izgaraKonum } from '../src/ortak/izgara.js';
const SATIR = Object.values(SATIR_O);
const kok = path.resolve(import.meta.dirname, '..');
const parcalar = {};
for (const f of fs.readdirSync(path.join(kok, 'src/parts')).filter(f => f.endsWith('.js'))) {
  try { const m = (await import(pathToFileURL(path.join(kok, 'src/parts', f)))).default; if (m?.girisler) parcalar[m.tur] = m; } catch { /* WebGL gerektiren parça: atla */ }
}
const sutunX = c => CX + (c - 15.5) * P;                 // c: 1 tabanlı sütun
const sutunDe = x => (x - CX) / P + 15.5;                // x -> ondalıklı sütun
let sorun = 0, sahne = 0;
const dir = path.join(kok, 'src/lessons');
for (const f of fs.readdirSync(dir).filter(f => /^m.*\.js$/.test(f))) {
  const dersler = (await import(pathToFileURL(path.join(dir, f)))).default;
  for (const d of dersler) {
    const ps = d.sahne?.parcalar ?? d.parcalar ?? []; if (d.sahne?.arena) continue; sahne++;
    const kullan = new Map();
    ps.forEach((p, i) => {
      const m = parcalar[p.tur]; if (!m) return;
      let konum = p.konum ?? [sutunX(5 + (i % 5) * 5), 0, CZ + SATIR[m.izgaraSatir ? 4 : i < 5 ? 5 : 1]];
      if (m.izgara) konum = izgaraKonum(konum, m.izgaraSatir);   // sahne de böyle oturtur
      for (const [dx, dz] of m.girisler(p, konum).bacaklar) {
        const x = konum[0] + dx, z = konum[2] + dz - CZ;
        const c = sutunDe(x), cr = Math.round(c);
        const satir = SATIR.findIndex(s => Math.abs(s - z) < .35);
        if (Math.abs(c - cr) > .15 || cr < 1 || cr > 30 || satir < 0) { sorun++; console.log(`${d.ad} | ${p.tur}${i} bacağı deliğe denk gelmiyor (sütun ${c.toFixed(2)}, z ${z.toFixed(2)})`); continue; }
        const k = cr + '|' + (satir < 5 ? 'ust' : 'alt'); if (!kullan.has(k)) kullan.set(k, new Set()); kullan.get(k).add(i);
      }
    });
    for (const [k, s] of kullan) if (s.size > 1) { sorun++; console.log(`${d.ad} | sütun/şerit ${k} birden çok parçada: ${[...s].map(i => ps[i].tur + i).join(' ')}`); }
  }
}
console.log(sorun ? `\n${sorun} sorun (${sahne} sahne)` : `TÜMÜ GEÇTİ (${sahne} sahne)`);
process.exit(sorun ? 1 : 0);
