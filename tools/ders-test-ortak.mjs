// Modül 9/10 test paketi için ortak çalıştırıcı (test-m9.mjs, test-m10.mjs kullanır).
// (a) şema  (b) C++ çözümü geçer + boş program reddedilir  (c) sesli = çözüm  (d) düzenle görevleri
// (e) sorular  (f) kod görevlerinin referans çözümleri (gorevCozum) geçer, değişmemiş ders çözümü geçmez
import { Sim } from '../src/sim.js';
import { cppDerle } from '../src/cppcalistir.js';

const HIZ = 6;
const DURDURMA_MS = 1500;
const BOS = 'void setup() {} void loop() {}';
const bekle = ms => new Promise(r => setTimeout(r, ms));

export async function kos(kod, kontrol, girdiFn, sure) {
  const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
  const d = cppDerle(kod, sim);
  if (d.hata) return { hata: d.hata.mesaj };
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

export async function calistir({ baslik, DERSLER, ICERIK, COZUMLER, gorevCozum = {}, adet }) {
  let fail = 0;
  const rapor = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };
  console.log(`\n--- ${baslik} Testleri ---\n`);

  rapor(`${adet} ders tanımlı`, DERSLER.length === adet, `${DERSLER.length} ders`);
  for (const d of DERSLER) {
    const ic = ICERIK[d.id];
    rapor(`${d.id}: ad biçimi`, /^\d+\.\d+ · /.test(d.ad));
    rapor(`${d.id}: çözüm + sesli + 3 duzenle`, !!COZUMLER[d.id] && !!ic?.sesli && ic.duzenle?.length === 3);
    rapor(`${d.id}: adımlar, kontrol, sahne`, d.adimlar?.length >= 4 && typeof d.kontrol === 'function' && d.sahne?.parcalar?.length > 0 && d.sure >= 3000);
    const kodGorev = d.gorevler.filter(g => g.tip === 'kod').length, soru = d.gorevler.filter(g => g.tip === 'soru').length;
    rapor(`${d.id}: en az 3 kod görevi ve 3 soru`, kodGorev >= 3 && soru >= 3, `${kodGorev} kod, ${soru} soru`);
    if (d.sadeceKod) rapor(`${d.id}: sadeceKod + baslangicKod`, !!d.baslangicKod && d.baslangicKod.trim() !== COZUMLER[d.id].trim());
    for (const a of d.adimlar ?? []) if (d.sadeceKod && JSON.stringify(a.bitti ?? {}).includes('"blok"')) rapor(`${d.id}: sadeceKod adımında blok koşulu yok`, false);
  }

  for (const d of DERSLER) {
    const r = await kos(COZUMLER[d.id], d.kontrol.bind(d), d.girdi, d.sure);
    rapor(`${d.id} C++ çözümü geçer`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
    const b = await kos(BOS, d.kontrol.bind(d), d.girdi, d.sure);
    rapor(`${d.id} boş program reddedilir`, b.sonuc?.ok === false, b.hata ?? b.sonuc?.mesaj);
  }

  for (const d of DERSLER) {
    const s = ICERIK[d.id].sesli;
    rapor(`${d.id} sesli 8-12 parça`, s.length >= 8 && s.length <= 12, `${s.length}`);
    rapor(`${d.id} calistir adımı var`, s.some(x => x.calistir));
    rapor(`${d.id} sesli yaz parçaları = C++ çözümü`, s.map(x => x.yaz ?? '').join('').trim() === COZUMLER[d.id].trim());
  }

  for (const d of DERSLER) {
    for (const g of ICERIK[d.id].duzenle) {
      const ad = `${d.id} / ${g.baslik}`;
      rapor(`${ad}: ara metni kodda var`, g.degistir.every(x => g.kod.includes(x.ara)));
      rapor(`${ad}: kod != cozum`, g.kod !== g.cozum);
      const c = await kos(g.cozum, g.kontrol, g.girdi ?? d.girdi, g.sure ?? d.sure);
      rapor(`${ad}: çözüm kontrolü geçer`, c.sonuc?.ok === true, c.hata ?? c.sonuc?.mesaj);
      const b = await kos(g.kod, g.kontrol, g.girdi ?? d.girdi, g.sure ?? d.sure);
      rapor(`${ad}: başlangıç kodu geçmez`, b.sonuc?.ok === false, b.hata ?? b.sonuc?.mesaj);
    }
  }

  for (const d of DERSLER) {
    for (const s of d.gorevler.filter(g => g.tip === 'soru')) {
      rapor(`${d.id} soru geçerli`, s.secenekler.length >= 3 && Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < s.secenekler.length && !!s.aciklama);
    }
  }

  for (const d of DERSLER) {
    for (const g of d.gorevler.filter(x => x.tip === 'kod')) {
      const kod = gorevCozum[d.id]?.[g.baslik];
      if (!kod) { rapor(`${d.id} / ${g.baslik}: referans çözümü tanımlı`, false); continue; }
      const c = await kos(kod, g.kontrol, g.girdi ?? d.girdi, g.sure ?? d.sure);
      rapor(`${d.id} / ${g.baslik}: görev çözümü geçer`, c.sonuc?.ok === true, c.hata ?? c.sonuc?.mesaj);
      const b = await kos(COZUMLER[d.id], g.kontrol, g.girdi ?? d.girdi, g.sure ?? d.sure);
      rapor(`${d.id} / ${g.baslik}: değişmemiş ders çözümü geçmez`, b.sonuc?.ok === false, b.hata ?? b.sonuc?.mesaj);
    }
  }

  console.log(fail ? `\n${fail} test BAŞARISIZ` : `\nTüm ${baslik} testleri geçti!`);
  process.exit(fail ? 1 : 0);
}
