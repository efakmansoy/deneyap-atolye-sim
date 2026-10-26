// Ders çözümleri testi: node tools/test-cozumler.mjs
// Her ders için tools/e2e/cozumler.mjs'deki C++ programını simülatörde çalıştırır, ders.kontrol(sim) -> ok:true bekler.
// Boş program (setup/loop boş) için ok:false beklenir.
import { Sim } from '../src/sim.js';
import { cppDerle } from '../src/cppcalistir.js';
import m1 from '../src/lessons/m1-led.js';
import m2 from '../src/lessons/m2-dugme.js';
import m3 from '../src/lessons/m3-analog.js';
import m4 from '../src/lessons/m4-ses-hareket.js';
import m5 from '../src/lessons/m5-proje.js';
import COZUMLER from './e2e/cozumler.mjs';

const DERSLER = [...m1, ...m2, ...m3, ...m4, ...m5];
const HIZ = 2;           // Windows zamanlayıcısı kaba (~15 ms): yavaş koşup sanal saati güvenilir tut
const DURDURMA_MS = 1300; // sim.t bu kadar gerçek ms değişmezse program bitti sayılır (en uzun tek bekleme 2000/HIZ = 1000 ms)
const BOS = 'void setup() {} void loop() {}';
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function kos(ders, kod) {
  const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
  const d = cppDerle(kod, sim);
  if (d.hata) return { hata: d.hata.mesaj };
  const hatalar = [];
  const yut = e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); };
  const girdi = ders.girdi ? ders.girdi(sim).catch(yut) : Promise.resolve();
  const prog = d.calistir().catch(yut);
  // Sanal saat sim.t ders.sure'ye ulaşana kadar bekle. Bekleme içermeyen ya da bitmiş programlar sim.t'yi
  // ilerletmez: sim.t DURDURMA_MS gerçek süre boyunca değişmezse bitmiş say. (Windows zamanlayıcısı kaba olduğundan
  // HIZ küçük tutulur; sanal zaman damgaları sim.t'den geldiği için kayma sonucu bozmaz.)
  let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
  while (sim.t < ders.sure && !hatalar.length) {
    await bekle(5);
    if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
    if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (ders.sure / HIZ) * 4 + 5000) break;
  }
  sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
  await Promise.all([girdi, prog]);
  if (hatalar.length) return { hata: String(hatalar[0]) };
  const sonuc = ders.kontrol(sim);
  return { sonuc };
}

let fail = 0;
const tamam = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };

tamam('20 ders ve 20 çözüm', DERSLER.length === 20 && DERSLER.every(d => COZUMLER[d.id]), `${DERSLER.length} ders`);
for (const ders of DERSLER) {
  const r = await kos(ders, COZUMLER[ders.id] ?? BOS);
  tamam(`${ders.id} çözüm`, r.sonuc?.ok === true, r.hata ?? (r.sonuc?.mesaj));
  const b = await kos(ders, BOS);
  tamam(`${ders.id} boş program reddedilir`, b.sonuc?.ok === false, b.hata ?? b.sonuc?.mesaj);
}
console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
