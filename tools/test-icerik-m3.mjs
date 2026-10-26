// M3 sesli içerik testi: node tools/test-icerik-m3.mjs
import { Sim } from '../src/sim.js';
import { cppDerle } from '../src/cppcalistir.js';
import m3 from '../src/lessons/m3-analog.js';
import ICERIK from '../src/lessons/icerik/m3-sesli.js';

const HIZ = 2, DURDURMA_MS = 1300;
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function kos(kod, girdi, sure, kontrol) {
  const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
  const d = cppDerle(kod, sim);
  if (d.hata) return { hata: 'Derleme: ' + d.hata.mesaj };
  const hatalar = [];
  const yut = e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); };
  const g = girdi ? girdi(sim).catch(yut) : Promise.resolve();
  const prog = d.calistir().catch(yut);
  let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
  while (sim.t < sure && !hatalar.length) {
    await bekle(5);
    if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
    if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (sure / HIZ) * 4 + 5000) break;
  }
  sim.t = Math.max(sim.t, sure); sim.iptal = true;
  await Promise.all([g, prog]);
  if (hatalar.length) return { hata: String(hatalar[0]) };
  return { sonuc: kontrol(sim) };
}

let fail = 0;
const tamam = (ad, k, ek = '') => { if (!k) { console.log('FAIL ' + ad + (ek ? '  -> ' + ek : '')); fail++; } else console.log('OK   ' + ad); };

for (const ders of m3) {
  const ic = ICERIK[ders.id];
  if (!ic) { tamam(`${ders.id} içerik var`, false); continue; }
  const n = ic.sesli.length;
  tamam(`${ders.id} sesli parça sayısı 7-10 (${n})`, n >= 7 && n <= 10);
  tamam(`${ders.id} son parça Görevler'e yönlendirir`, /Görevler/.test(ic.sesli.at(-1).ses));
  tamam(`${ders.id} calistir parçası var`, ic.sesli.some(p => p.calistir));
  ic.sesli.forEach((p, i) => {
    tamam(`${ders.id} ses[${i}] 1-400 karakter (${p.ses?.length})`, !!p.ses && p.ses.trim() && p.ses.length <= 400);
    if (p.parca !== undefined) tamam(`${ders.id} ses[${i}] parca geçerli`, p.parca < ders.sahne.parcalar.length);
    if (p.yaz !== undefined) tamam(`${ders.id} ses[${i}] yaz satır sonlu`, p.yaz.endsWith('\n'));
  });
  const kod = ic.sesli.map(p => p.yaz ?? '').join('');
  const r = await kos(kod, ders.girdi, ders.sure, s => ders.kontrol(s));
  tamam(`${ders.id} sesli birleşik kod kontrolü geçer`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);

  const g = ic.duzenle;
  tamam(`${ders.id} duzenle 2-3 görev (${g.length})`, g.length >= 2 && g.length <= 3);
  for (const t of g) {
    const ad = `${ders.id}/${t.baslik}`;
    tamam(`${ad} alanlar`, t.tip === 'duzenle' && t.metin && t.ipucu && t.kod && t.cozum && typeof t.kontrol === 'function' && t.degistir?.length);
    tamam(`${ad} cozum != kod`, t.cozum !== t.kod);
    for (const d of t.degistir) tamam(`${ad} ara "${d.ara}" kod içinde`, t.kod.includes(d.ara));
    const sure = t.sure ?? ders.sure;
    const a = await kos(t.kod, t.girdi, sure, t.kontrol);
    tamam(`${ad} başlangıç derlenir`, !a.hata, a.hata);
    tamam(`${ad} başlangıç kontrolü GEÇMEZ`, a.sonuc?.ok === false, a.sonuc?.mesaj);
    const b = await kos(t.cozum, t.girdi, sure, t.kontrol);
    tamam(`${ad} cozum GEÇER`, b.sonuc?.ok === true, b.hata ?? b.sonuc?.mesaj);
  }
}
console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
