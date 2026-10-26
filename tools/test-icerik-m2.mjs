// Modül 2 sesli içerik testi: node tools/test-icerik-m2.mjs
//  (1) sesli parçaların `yaz` metinleri birleşince derlenir ve dersin kontrolünü geçer
//  (2) duzenle görevleri: kod derlenir ve kontrolü GEÇMEZ, cozum GEÇER, degistir.ara kod içinde, cozum != kod
//  (3) ses boş değil, <= 400 karakter
import { Sim } from '../src/sim.js';
import { cppDerle } from '../src/cppcalistir.js';
import m2 from '../src/lessons/m2-dugme.js';
import icerik from '../src/lessons/icerik/m2-sesli.js';

const HIZ = 2, DURDURMA_MS = 1300;
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function kos(ders, kod, girdi, sure) {
  const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
  const d = cppDerle(kod, sim);
  if (d.hata) return { derleHata: d.hata.mesaj };
  const hatalar = [];
  const yut = e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); };
  const g = girdi(sim).catch(yut);
  const prog = d.calistir().catch(yut);
  let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
  while (sim.t < sure && !hatalar.length) {
    await bekle(5);
    if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
    if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (sure / HIZ) * 4 + 5000) break;
  }
  sim.t = Math.max(sim.t, sure); sim.iptal = true;
  await Promise.all([g, prog]);
  if (hatalar.length) return { calismaHata: String(hatalar[0]) };
  return { sonuc: ders.kontrol(sim) };
}

let fail = 0;
const t = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };

for (const ders of m2) {
  const ic = icerik[ders.id];
  if (!ic) { t(`${ders.id} içerik var`, false); continue; }
  // (3) ses + parça sayısı
  t(`${ders.id} sesli parça sayısı 7-10`, ic.sesli.length >= 7 && ic.sesli.length <= 10, String(ic.sesli.length));
  ic.sesli.forEach((p, i) => t(`${ders.id} ses[${i}] 1-400 karakter`, typeof p.ses === 'string' && p.ses.trim().length > 0 && p.ses.length <= 400, String(p.ses?.length)));
  t(`${ders.id} calistir parçası var`, ic.sesli.some(p => p.calistir === true));
  t(`${ders.id} parca indeksleri sahnede`, ic.sesli.every(p => p.parca == null || (p.parca >= 0 && p.parca < ders.sahne.parcalar.length)));
  // (1) sesli yaz birleşimi
  const kod = ic.sesli.map(p => p.yaz ?? '').join('');
  const r = await kos(ders, kod, ders.girdi, ders.sure);
  t(`${ders.id} sesli program geçer`, r.sonuc?.ok === true, r.derleHata ?? r.calismaHata ?? r.sonuc?.mesaj);
  // (2) duzenle görevleri
  t(`${ders.id} 2-3 duzenle görevi`, ic.duzenle.length >= 2 && ic.duzenle.length <= 3, String(ic.duzenle.length));
  for (const g of ic.duzenle) {
    const ad = `${ders.id} / ${g.baslik}`;
    t(`${ad}: alanlar`, g.tip === 'duzenle' && g.metin && g.ipucu && g.kod && g.cozum && typeof g.kontrol === 'function' && g.degistir?.length > 0);
    t(`${ad}: degistir.ara kod içinde`, g.degistir.every(d => g.kod.includes(d.ara)), g.degistir.filter(d => !g.kod.includes(d.ara)).map(d => d.ara).join(' | '));
    t(`${ad}: cozum != kod`, g.cozum !== g.kod);
    const girdi = g.girdi ?? ders.girdi, sure = g.sure ?? ders.sure;
    const a = await kos(g, g.kod, girdi, sure);
    t(`${ad}: kod derlenir ve çalışır`, !a.derleHata && !a.calismaHata, a.derleHata ?? a.calismaHata);
    t(`${ad}: kod kontrolü geçmez`, a.sonuc?.ok === false, a.sonuc?.mesaj);
    const b = await kos(g, g.cozum, girdi, sure);
    t(`${ad}: cozum geçer`, b.sonuc?.ok === true, b.derleHata ?? b.calismaHata ?? b.sonuc?.mesaj);
  }
}
console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
