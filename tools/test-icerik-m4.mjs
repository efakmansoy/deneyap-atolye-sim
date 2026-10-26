// Modül 4 sesli içerik testi: node tools/test-icerik-m4.mjs
import { Sim } from '../src/sim.js';
import { cppDerle } from '../src/cppcalistir.js';
import m4 from '../src/lessons/m4-ses-hareket.js';
import ICERIK from '../src/lessons/icerik/m4-sesli.js';

const HIZ = 2, DURDURMA_MS = 1300;
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
  let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
  while (sim.t < ders.sure && !hatalar.length) {
    await bekle(5);
    if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
    if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (ders.sure / HIZ) * 4 + 5000) break;
  }
  sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
  await Promise.all([girdi, prog]);
  if (hatalar.length) return { hata: String(hatalar[0]) };
  return { sonuc: ders.kontrol(sim) };
}

let fail = 0;
const t = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };

for (const id of ['buzzer-melodi', 'servo-motor', 'park-sensoru', 'dugme-piyano']) {
  const ders = m4.find(d => d.id === id), ic = ICERIK[id];
  if (!ders || !ic) { t(id + ' mevcut', false); continue; }
  t(`${id} sesli parça sayısı 7-10`, ic.sesli.length >= 7 && ic.sesli.length <= 10, String(ic.sesli.length));
  t(`${id} duzenle 2-3 görev`, ic.duzenle.length >= 2 && ic.duzenle.length <= 3);
  t(`${id} ses uzunlukları`, ic.sesli.every(p => p.ses && p.ses.trim() && p.ses.length <= 400), String(Math.max(...ic.sesli.map(p => p.ses.length))));
  t(`${id} son parça Görevler`, /Görevler/.test(ic.sesli.at(-1).ses));
  t(`${id} calistir parçası var`, ic.sesli.some(p => p.calistir));
  const kod = ic.sesli.map(p => p.yaz ?? '').join('');
  const r = await kos(ders, kod);
  t(`${id} sesli program ders kontrolünü geçer`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
  for (const g of ic.duzenle) {
    const ad = `${id} / ${g.baslik}`;
    t(`${ad}: ara metinleri kodda`, g.degistir.every(x => g.kod.includes(x.ara)), g.degistir.filter(x => !g.kod.includes(x.ara)).map(x => x.ara).join(' | '));
    t(`${ad}: cozum != kod`, g.cozum !== g.kod);
    t(`${ad}: ipucu/metin dolu`, !!g.ipucu && !!g.metin);
    const k = await kos(g, g.kod);
    t(`${ad}: başlangıç kodu derlenir ve GEÇMEZ`, !k.hata && k.sonuc?.ok === false, k.hata ?? k.sonuc?.mesaj);
    const c = await kos(g, g.cozum);
    t(`${ad}: çözüm GEÇER`, c.sonuc?.ok === true, c.hata ?? c.sonuc?.mesaj);
  }
}
console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
