// Modül 3 görev testi: node tools/test-gorev-m3.mjs
import { Sim } from '../src/sim.js';
import DERSLER from '../src/lessons/m3-analog.js';

let hata = 0;
const kontrolEt = (ad, kosul, ek = '') => { if (!kosul) { hata++; console.log('  HATA:', ad, ek); } };
const map = (v, a, b, c, d) => Math.trunc((v - a) * (d - c) / (b - a) + c);
const D8 = [0, 1, 2, 3, 4, 5, 6, 7].map(i => 'D' + i);
const dongu = f => async sim => { while (true) { await sim.tick(); await f(sim); await sim.bekle(10); } };
const rgb = (r, g, b) => async sim => { sim.pwmYaz('D0', r); sim.pwmYaz('D1', g); sim.pwmYaz('D2', b); };
const cubuk = hesap => dongu(sim => { const a = sim.analogOku('A0'); D8.forEach((p, i) => sim.yaz(p, hesap(a, i))); });

// Her derste kod görevi sırasıyla referans çözümler
const REF = {
  'rgb-led': [
    rgb(255, 255, 0),
    rgb(255, 128, 0),
    rgb(128, 128, 128),
    async sim => { for (const c of [[255, 0, 0], [0, 255, 0], [0, 0, 255]]) { sim.pwmYaz('D0', c[0]); sim.pwmYaz('D1', c[1]); sim.pwmYaz('D2', c[2]); await sim.bekle(500); } },
  ],
  'pwm-parlaklik': [
    async sim => sim.pwmYaz('D0', 128),
    async sim => { for (let i = 0; i <= 255; i += 5) { sim.pwmYaz('D0', i); await sim.bekle(20); } },
    async sim => { for (let i = 255; i >= 0; i -= 5) { sim.pwmYaz('D0', i); await sim.bekle(20); } },
    async sim => { for (let k = 0; k < 2; k++) { for (let i = 0; i <= 255; i += 5) { sim.pwmYaz('D0', i); await sim.bekle(20); } for (let i = 255; i >= 0; i -= 5) { sim.pwmYaz('D0', i); await sim.bekle(20); } } },
  ],
  'potansiyometre': [
    dongu(sim => sim.pwmYaz('D0', 255 - map(sim.analogOku('A0'), 0, 4095, 0, 255))),
    dongu(sim => sim.pwmYaz('D0', map(sim.analogOku('A0'), 0, 4095, 0, 127))),
    dongu(sim => sim.pwmYaz('D0', sim.analogOku('A0') > 2048 ? 255 : 0)),
    dongu(sim => { const a = sim.analogOku('A0'); sim.pwmYaz('D0', a < 1365 ? 0 : a < 2730 ? 128 : 255); }),
  ],
  'ldr-gece-lambasi': [
    dongu(sim => sim.yaz('D0', sim.analogOku('A0') >= 1000 ? 1 : 0)),
    dongu(sim => sim.yaz('D0', sim.analogOku('A0') < 2000 ? 1 : 0)),
    dongu(sim => sim.pwmYaz('D0', map(sim.analogOku('A0'), 0, 4095, 255, 0))),
    async sim => {
      while (true) {
        await sim.tick();
        if (sim.analogOku('A0') < 1000) { sim.yaz('D0', 1); await sim.bekle(300); sim.yaz('D0', 0); await sim.bekle(300); } else sim.yaz('D0', 0);
        await sim.bekle(10);
      }
    },
  ],
  'sicaklik-gostergesi': [
    dongu(sim => sim.yaz('D0', sim.analogOku('A1') > 2000 ? 1 : 0)),
    dongu(sim => sim.yaz('D0', sim.analogOku('A1') < 1000 ? 1 : 0)),
    dongu(sim => sim.pwmYaz('D0', map(sim.analogOku('A1'), 0, 4095, 0, 255))),
    async sim => {
      while (true) {
        await sim.tick();
        const a = sim.analogOku('A1');
        if (a >= 2500) { sim.yaz('D0', 1); await sim.bekle(250); sim.yaz('D0', 0); await sim.bekle(250); }
        else sim.yaz('D0', a >= 1500 ? 1 : 0);
        await sim.bekle(10);
      }
    },
  ],
  'led-cubugu': [
    cubuk((a, i) => (i < 8 - map(a, 0, 4095, 0, 8) ? 1 : 0)),
    cubuk((a, i) => (i < map(a, 0, 4095, 0, 4) ? 1 : 0)),
    cubuk((a, i) => (i === 7 && a > 3072 ? 1 : 0)),
    cubuk((a, i) => (i === map(a, 0, 4095, 0, 7) ? 1 : 0)),
  ],
};
// Ders ana hedefinin çözümleri (görevlerde geçmemeli)
const ANA = {
  'rgb-led': rgb(255, 0, 255),
  'pwm-parlaklik': async sim => { for (let i = 0; i <= 255; i += 5) { sim.pwmYaz('D0', i); await sim.bekle(20); } for (let i = 255; i >= 0; i -= 5) { sim.pwmYaz('D0', i); await sim.bekle(20); } },
  'potansiyometre': dongu(sim => sim.pwmYaz('D0', map(sim.analogOku('A0'), 0, 4095, 0, 255))),
  'ldr-gece-lambasi': dongu(sim => sim.yaz('D0', sim.analogOku('A0') < 1000 ? 1 : 0)),
  'sicaklik-gostergesi': dongu(sim => sim.yaz('D0', sim.analogOku('A1') > 2500 ? 1 : 0)),
  'led-cubugu': cubuk((a, i) => (i < map(a, 0, 4095, 0, 8) ? 1 : 0)),
};

async function calistir(ders, g, fn) {
  const sim = new Sim(); sim.hiz = 1;
  const sure = g.sure ?? ders.sure, girdi = g.girdi ?? ders.girdi;
  const bitir = new Promise(r => setTimeout(r, sure / sim.hiz));
  girdi?.(sim).catch(e => { if (e.constructor.name !== 'DurdurSinyali') console.error(e); });
  const p = fn(sim).catch(e => { if (e.constructor.name !== 'DurdurSinyali') throw e; });
  await Promise.race([p, bitir]);
  sim.t = Math.max(sim.t, sure); sim.iptal = true;
  return g.kontrol(sim);
}

await Promise.all(DERSLER.map(async d => {
  const G = d.gorevler;
  kontrolEt(`${d.id}: gorevler var`, Array.isArray(G));
  const kod = G.filter(g => g.tip === 'kod'), soru = G.filter(g => g.tip === 'soru');
  kontrolEt(`${d.id}: 3-4 kod görevi`, kod.length >= 3 && kod.length <= 4, kod.length);
  kontrolEt(`${d.id}: 3-4 soru`, soru.length >= 3 && soru.length <= 4, soru.length);
  kontrolEt(`${d.id}: karışık sıra`, G[0].tip !== G[1].tip);
  kontrolEt(`${d.id}: referans sayısı`, REF[d.id].length === kod.length);
  for (const s of soru) {
    const ad = `${d.id} soru "${s.soru.slice(0, 30)}"`;
    kontrolEt(ad + ' şık sayısı', s.secenekler.length >= 3 && s.secenekler.length <= 4);
    kontrolEt(ad + ' dogru aralıkta', Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < s.secenekler.length);
    kontrolEt(ad + ' tekrar eden şık yok', new Set(s.secenekler).size === s.secenekler.length);
    kontrolEt(ad + ' açıklama', typeof s.aciklama === 'string' && s.aciklama.length > 10);
  }
  console.log(`${d.id}: doğru indexler = ${soru.map(s => s.dogru).join(',')}`);
  await Promise.all(kod.map(async (g, i) => {
    const ad = `${d.id} görev ${i + 1} (${g.baslik})`;
    kontrolEt(ad + ' alanlar', g.metin && g.ipucu && typeof g.kontrol === 'function');
    const a = await calistir(d, g, REF[d.id][i]);
    kontrolEt(ad + ' referans -> ok:true', a.ok === true, a.mesaj);
    const b = await calistir(d, g, async () => {});
    kontrolEt(ad + ' boş -> ok:false', b.ok === false && !!b.mesaj, b.mesaj);
    const c = await calistir(d, g, ANA[d.id]);
    kontrolEt(ad + ' ana çözüm -> ok:false', c.ok === false, c.mesaj);
    console.log(`  ${ad}: boş="${b.mesaj}" | ana="${c.mesaj}"`);
  }));
}));

console.log(hata ? `\n${hata} HATA` : '\nTÜM GÖREV TESTLERİ GEÇTİ');
process.exit(hata ? 1 : 0);
