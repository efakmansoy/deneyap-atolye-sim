// Modül 6 test paketi: node tools/test-m6.mjs
// (a) Şema ve yükleme  (b) C++ çözümleri + negatif boş program
// (c) Sesli anlatım (kod birleşimi = çözüm)  (d) "Kodu değiştir" görevleri (ara/değiştir/çözüm geçer)
// (e) Çoktan seçmeli soruların biçimi ve dağılımı
import { Sim } from '../src/sim.js';
import { cppDerle } from '../src/cppcalistir.js';
import DERSLER_M6 from '../src/lessons/m6-projeler.js';
import ICERIK_M6 from '../src/lessons/icerik/m6-sesli.js';
import COZUMLER_M6 from './e2e/cozumler-m6.mjs';

const HIZ = 4;
const DURDURMA_MS = 1000;
const BOS = 'void setup() {} void loop() {}';
const bekle = ms => new Promise(r => setTimeout(r, ms));

async function kos(ders, kod, girdiOverride = null, sureOverride = null) {
  const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
  const d = cppDerle(kod, sim);
  if (d.hata) return { hata: d.hata.mesaj };
  const hatalar = [];
  const yut = e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); };
  const fnGirdi = girdiOverride ?? ders.girdi;
  const girdi = fnGirdi ? fnGirdi(sim).catch(yut) : Promise.resolve();
  const prog = d.calistir().catch(yut);
  const hedefSure = sureOverride ?? ders.sure;

  let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
  while (sim.t < hedefSure && !hatalar.length) {
    await bekle(5);
    if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
    if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (hedefSure / HIZ) * 4 + 4000) break;
  }
  sim.t = Math.max(sim.t, hedefSure); sim.iptal = true;
  await Promise.all([girdi, prog]);
  if (hatalar.length) return { hata: String(hatalar[0]) };
  const sonuc = ders.kontrol(sim);
  return { sonuc };
}

let fail = 0;
const rapor = (ad, k, ek = '') => {
  console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : ''));
  if (!k) fail++;
};

console.log('\n--- Modül 6 Testleri ---\n');

// ── (a) Şema Doğrulama ──
rapor('7 proje dersi tanımlı', DERSLER_M6.length === 7, `${DERSLER_M6.length} ders`);
rapor('Her ders için çözüm var', DERSLER_M6.every(d => COZUMLER_M6[d.id]));
rapor('Her ders için sesli içerik var', DERSLER_M6.every(d => ICERIK_M6[d.id]?.sesli));
rapor('Her ders için 3 adet düzenle görevi var', DERSLER_M6.every(d => ICERIK_M6[d.id]?.duzenle?.length === 3));

// ── (b) C++ Çözümleri ve Boş Program Kontrolü ──
for (const ders of DERSLER_M6) {
  const kod = COZUMLER_M6[ders.id];
  const r = await kos(ders, kod);
  rapor(`${ders.id} C++ çözümü geçer`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);

  const b = await kos(ders, BOS);
  rapor(`${ders.id} boş program reddedilir`, b.sonuc?.ok === false, b.hata ?? b.sonuc?.mesaj);
}

// ── (c) Sesli Anlatım Tutarlılığı ──
for (const ders of DERSLER_M6) {
  const icerik = ICERIK_M6[ders.id];
  const sesli = icerik.sesli;
  rapor(`${ders.id} sesli 8-10 parça`, sesli.length >= 8 && sesli.length <= 10, `${sesli.length} parça`);
  rapor(`${ders.id} calistir adımı var`, sesli.some(s => s.calistir));

  const birlesik = sesli.map(s => s.yaz ?? '').join('').trim();
  const beklenen = COZUMLER_M6[ders.id].trim();
  rapor(`${ders.id} sesli yaz parçaları = C++ çözümü`, birlesik === beklenen);
}

// ── (d) Kodu Değiştir Görevleri ──
for (const ders of DERSLER_M6) {
  const icerik = ICERIK_M6[ders.id];
  for (const g of icerik.duzenle) {
    const araVar = g.degistir.every(d => g.kod.includes(d.ara));
    rapor(`${ders.id} / ${g.baslik}: ara metni kod içinde mevcut`, araVar);
    rapor(`${ders.id} / ${g.baslik}: kod != cozum`, g.kod !== g.cozum);

    // Çözüm derlenir ve geçer
    const simCozum = new Sim(); simCozum.hiz = HIZ; simCozum.cihaz = {};
    const dCozum = cppDerle(g.cozum, simCozum);
    rapor(`${ders.id} / ${g.baslik}: çözüm derlenir`, !dCozum.hata, dCozum.hata?.mesaj);

    if (g.kontrol) {
      const hatalar = [];
      const yut = e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); };
      const girdi = g.girdi ? g.girdi(simCozum).catch(yut) : Promise.resolve();
      const prog = dCozum.calistir ? dCozum.calistir().catch(yut) : Promise.resolve();
      const s = g.sure ?? ders.sure;
      let son = -1, sonDegisim = Date.now(), t0 = Date.now();
      while (simCozum.t < s && !hatalar.length) {
        await bekle(5);
        if (simCozum.t !== son) { son = simCozum.t; sonDegisim = Date.now(); }
        if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (s / HIZ) * 4 + 3000) break;
      }
      simCozum.t = Math.max(simCozum.t, s); simCozum.iptal = true;
      await Promise.all([girdi, prog]);
      const res = g.kontrol(simCozum);
      rapor(`${ders.id} / ${g.baslik}: çözüm kontrolü geçer`, res?.ok === true, res?.mesaj);
    }
  }
}

// ── (e) Soruların Doğruluğu ──
for (const ders of DERSLER_M6) {
  const sorular = ders.gorevler.filter(g => g.tip === 'soru');
  rapor(`${ders.id}: en az 2 soru var`, sorular.length >= 2, `${sorular.length} soru`);
  for (const s of sorular) {
    rapor(`${ders.id} soru geçerli`, s.secenekler.length >= 3 && Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < s.secenekler.length && !!s.aciklama);
  }
}

console.log(fail ? `\n${fail} test BAŞARISIZ` : `\nTüm Modül 6 testleri geçti!`);
process.exit(fail ? 1 : 0);
