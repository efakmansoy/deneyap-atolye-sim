// İçerik testi: node tools/test-icerik-m5.mjs   (m5-sesli.js + m1b-sesli.js)
import { Sim } from '../src/sim.js';
import { cppDerle } from '../src/cppcalistir.js';
import m1 from '../src/lessons/m1-led.js';
import m5 from '../src/lessons/m5-proje.js';
import icM5 from '../src/lessons/icerik/m5-sesli.js';
import icM1b from '../src/lessons/icerik/m1b-sesli.js';

const DERSLER = [...m1, ...m5];
const ICERIK = { ...icM1b, ...icM5 };
const HIZ = 2, DURDURMA_MS = 1300;
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function kos(ders, kod, gorev = {}) {
  const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
  const d = cppDerle(kod, sim);
  if (d.hata) return { hata: d.hata.mesaj };
  const sure = gorev.sure ?? ders.sure, girdiFn = gorev.girdi ?? ders.girdi, kontrol = gorev.kontrol ?? ders.kontrol;
  const hatalar = [];
  const yut = e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); };
  const girdi = girdiFn ? girdiFn(sim).catch(yut) : Promise.resolve();
  const prog = d.calistir().catch(yut);
  let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
  while (sim.t < sure && !hatalar.length) {
    await bekle(5);
    if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
    if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (sure / HIZ) * 4 + 5000) break;
  }
  sim.t = Math.max(sim.t, sure); sim.iptal = true;
  await Promise.all([girdi, prog]);
  if (hatalar.length) return { hata: String(hatalar[0]) };
  return { sonuc: kontrol(sim) };
}

let fail = 0;
const tamam = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };

for (const [id, ic] of Object.entries(ICERIK)) {
  const ders = DERSLER.find(d => d.id === id);
  tamam(`${id} ders var`, !!ders); if (!ders) continue;
  const pSay = ders.sahne?.parcalar?.length ?? 0;
  tamam(`${id} sesli 7-10 parça`, ic.sesli.length >= 7 && ic.sesli.length <= 10, String(ic.sesli.length));
  tamam(`${id} ses dolu ve <=400`, ic.sesli.every(p => p.ses && p.ses.trim() && p.ses.length <= 400), String(Math.max(...ic.sesli.map(p => p.ses.length))));
  tamam(`${id} parca indeksleri geçerli`, ic.sesli.every(p => p.parca == null || (p.parca >= 0 && p.parca < pSay)));
  tamam(`${id} calistir var, son parça yönlendirir`, ic.sesli.some(p => p.calistir) && /Görevler/.test(ic.sesli.at(-1).ses));
  const kod = ic.sesli.map(p => p.yaz ?? '').join('');
  const r = await kos(ders, kod);
  tamam(`${id} sesli kod -> kontrol`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
  tamam(`${id} görev sayısı 2-3`, ic.duzenle.length >= 2 && ic.duzenle.length <= 3);
  for (const g of ic.duzenle) {
    const ad = `${id} / ${g.baslik}`;
    tamam(`${ad}: tip ve alanlar`, g.tip === 'duzenle' && g.metin && g.ipucu && g.kod && g.cozum && g.degistir?.length && typeof g.kontrol === 'function');
    tamam(`${ad}: ara kod içinde`, g.degistir.every(x => g.kod.includes(x.ara)));
    tamam(`${ad}: cozum != kod`, g.cozum !== g.kod);
    const a = await kos(ders, g.kod, g);
    tamam(`${ad}: kod derlenir`, !a.hata, a.hata);
    tamam(`${ad}: kod GEÇMEZ`, a.sonuc?.ok === false, a.sonuc?.mesaj);
    const b = await kos(ders, g.cozum, g);
    tamam(`${ad}: cozum GEÇER`, b.sonuc?.ok === true, b.hata ?? b.sonuc?.mesaj);
  }
}
console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
