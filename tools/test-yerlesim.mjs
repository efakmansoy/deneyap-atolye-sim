// Ders sahnelerinde parçaların üst üste binmediğini ve breadboard'dan taşmadığını denetler: node tools/test-yerlesim.mjs
// Kutular parçaların gerçek 3B geometrisinden (XZ düzlemi) hesaplanır; kablosuz üst yapı (LCD, servo kolu...) dahildir.
import * as THREE from 'three';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const kok = path.resolve(import.meta.dirname, '..');
const PARCALAR = {};
for (const f of fs.readdirSync(path.join(kok, 'src/parts'))) { const m = (await import(pathToFileURL(path.join(kok, 'src/parts', f)).href)).default; PARCALAR[m.tur] = m; }
const dersler = [];
for (const f of fs.readdirSync(path.join(kok, 'src/lessons')).filter(f => /^m\d.*\.js$/.test(f))) dersler.push(...(await import(pathToFileURL(path.join(kok, 'src/lessons', f)).href)).default);

const CX = 78, CZ = 10, BB_L = 86, BB_W = 54, P = 2.54;
const sutunX = i => (i - 14.5) * P, SATIR_Z = { f: 3.81, b: -11.43 };
const TASMA = 14, ORTUSME = 2;     // mm
let hata = 0, sayi = 0;
for (const d of dersler) {
  if (!d.sahne?.parcalar || d.sahne.arena) continue;
  const kutular = d.sahne.parcalar.map((p, i) => {
    const mod = PARCALAR[p.tur]; if (!mod) { console.log(`FAIL ${d.id}: bilinmeyen parça ${p.tur}`); hata++; return null; }
    const konum = p.konum ? new THREE.Vector3(...p.konum) : new THREE.Vector3(CX + sutunX(5 + (i % 5) * 5 - 1), 0, CZ + SATIR_Z[i < 5 ? 'f' : 'b']);
    const n = mod.olustur({ THREE, tanim: p, konum, index: i, sahne: d.sahne });
    if (!mod.konumSabit) n.group.position.copy(konum);
    n.group.updateMatrixWorld(true);
    return { ad: p.tur, b: new THREE.Box3().setFromObject(n.group), alan: p.tur === 'pir' };
  }).filter(Boolean);
  const sorun = [];
  kutular.forEach(({ ad, b, alan }) => { if (alan) return;
    const t = Math.max(CX - BB_L / 2 - b.min.x, b.max.x - (CX + BB_L / 2), CZ - BB_W / 2 - b.min.z, b.max.z - (CZ + BB_W / 2));
    if (t > TASMA) sorun.push(`${ad} breadboard dışına ${t.toFixed(0)} mm taşıyor`);
  });
  for (let i = 0; i < kutular.length; i++) for (let j = i + 1; j < kutular.length; j++) {
    if (kutular[i].alan || kutular[j].alan) continue;
    const a = kutular[i].b, b = kutular[j].b;
    const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x), oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    if (ox > ORTUSME && oz > ORTUSME) sorun.push(`${kutular[i].ad} ↔ ${kutular[j].ad} üst üste (x ${ox.toFixed(0)}, z ${oz.toFixed(0)} mm)`);
  }
  sayi++;
  if (sorun.length) { hata += sorun.length; console.log(`FAIL ${d.id}\n   ` + sorun.join('\n   ')); } else console.log(`ok   ${d.id}`);
}
console.log(hata ? `\n${hata} SORUN (${sayi} sahne)` : `\nTÜMÜ GEÇTİ (${sayi} sahne)`);
process.exit(hata ? 1 : 0);
