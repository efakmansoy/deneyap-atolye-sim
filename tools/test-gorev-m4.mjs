// Modül 4 görev testi: node tools/test-gorev-m4.mjs
import { Sim } from '../src/sim.js';
import dersler from '../src/lessons/m4-ses-hareket.js';
import * as blok from '../src/bloklar/ses-servo.js';

const HIZ = 2;
let hata = 0;
const tamam = (k, ad) => { if (!k) { hata++; console.log('  HATA:', ad); } else console.log('  ok  :', ad); };

const G = { forBlock: {} };
blok.uret(G, { NONE: 0, ATOMIC: 0 });
const sb = a => ({ getFieldValue: k => a[k] });
const sg = g => ({ valueToCode: (b, ad) => String(g[ad] ?? '') });
const kod = (tip, a, g = {}) => G.forBlock[tip](sb(a), sg(g));
const calis = (sim, js) => new Function('sim', js)(sim);
const cal = (sim, f) => calis(sim, kod('dy_ses_cal', { PIN: 'D8' }, { FREKANS: f }));
const sustur = sim => calis(sim, kod('dy_ses_sustur', { PIN: 'D8' }));
const servo = (sim, a) => calis(sim, kod('dy_servo_yaz', { PIN: 'D5' }, { ACI: a }));
const mesafe = sim => calis(sim, 'return ' + G.forBlock.dy_mesafe_oku(sb({ PIN: 'D3' }))[0]);
const bip = async (sim, f, ms, ara = 50) => { cal(sim, f); await sim.bekle(ms); sustur(sim); await sim.bekle(ara); };
const bos = async sim => { await sim.bekle(100); };

// Referans (dogru) ve yanlış çözümler: id -> görev sırasına göre KOD görevleri
const dogru = {
  'buzzer-melodi': [
    async sim => { for (const f of [523, 659, 784]) await bip(sim, f, 300); },
    async sim => { for (const f of [262, 294, 330, 349, 392, 440, 494]) await bip(sim, f, 300); },
    async sim => { for (let i = 0; i < 4; i++) { await bip(sim, 440, 300); await bip(sim, 880, 300); } },
    async sim => { for (let i = 0; i < 3; i++) await bip(sim, 1000, 150, 150); await bip(sim, 1000, 800); },
  ],
  'servo-motor': [
    async sim => { for (const a of [45, 135, 45]) { servo(sim, a); await sim.bekle(300); } },
    async sim => { for (let i = 0; i < 3; i++) { servo(sim, 0); await sim.bekle(250); servo(sim, 90); await sim.bekle(250); } servo(sim, 0); await sim.bekle(250); },
    async sim => { for (let i = 0; i < 3; i++) { for (let a = 0; a <= 180; a += 30) { servo(sim, a); await sim.bekle(60); } for (let a = 150; a >= 0; a -= 30) { servo(sim, a); await sim.bekle(60); } } },
    async sim => { for (let a = 0; a <= 180; a += 10) { servo(sim, a); await sim.bekle(100); } },
  ],
  'park-sensoru': [
    async sim => { while (true) { await sim.tick(); if (mesafe(sim) < 20) cal(sim, 1000); else sustur(sim); await sim.bekle(50); } },
    async sim => { while (true) { await sim.tick(); const d = mesafe(sim); if (d < 40) { cal(sim, 1000); await sim.bekle(20); } else if (d < 100) { cal(sim, 1000); await sim.bekle(200); sustur(sim); await sim.bekle(200); } else { sustur(sim); await sim.bekle(50); } } },
    async sim => { while (true) { await sim.tick(); sim.seri('Mesafe: ' + mesafe(sim)); await sim.bekle(100); } },
    async sim => { while (true) { await sim.tick(); cal(sim, 2000 - mesafe(sim) * 10); await sim.bekle(50); } },
  ],
  'dugme-piyano': [
    async sim => { while (true) { await sim.tick(); sustur(sim); if (sim.oku('D0') > 0) cal(sim, 440); if (sim.oku('D1') > 0) cal(sim, 659); } },
    async sim => { while (true) { await sim.tick(); sustur(sim); if (sim.oku('D0') > 0) cal(sim, 262); if (sim.oku('D2') > 0) cal(sim, 330); } },
    async sim => { while (true) { await sim.tick(); if (sim.oku('D3') > 0) { for (const f of [262, 330, 392]) await bip(sim, f, 250); await sim.bekle(2000); } } },
    async sim => { while (true) { await sim.tick(); sustur(sim); const c = sim.oku('D6') > 0 ? 2 : 1; if (sim.oku('D0') > 0) cal(sim, 262 * c); } },
  ],
};
// Her kod görevi için yanlış çözüm: sürekli 300 Hz çalıp / servoyu oynatıp / hiçbir şey yapmayan
const yanlisGenel = {
  'buzzer-melodi': async sim => { cal(sim, 262); await sim.bekle(300); },
  'servo-motor': async sim => { servo(sim, 90); await sim.bekle(100); },
  'park-sensoru': async sim => { while (true) { await sim.tick(); cal(sim, 1000); await sim.bekle(300); sustur(sim); await sim.bekle(300); } },
  'dugme-piyano': async sim => { while (true) { await sim.tick(); cal(sim, 262); await sim.bekle(50); } },
};

async function kos(ders, g, program) {
  const sim = new Sim(); sim.hiz = HIZ;
  const sure = g.sure ?? ders.sure, girdi = g.girdi ?? ders.girdi;
  const bitir = new Promise(r => { setTimeout(r, sure / sim.hiz); });
  if (girdi) girdi(sim).catch(e => { if (e?.constructor?.name !== 'DurdurSinyali') console.error(e); });
  const p = program(sim).catch(e => { if (e?.constructor?.name !== 'DurdurSinyali') throw e; });
  await Promise.race([p, bitir]);
  sim.t = Math.max(sim.t, sure); sim.iptal = true;
  return g.kontrol(sim);
}

for (const d of dersler) {
  console.log(d.id);
  const gl = d.gorevler;
  tamam(Array.isArray(gl), 'gorevler dizisi var');
  const kodlar = gl.filter(g => g.tip === 'kod'), sorular = gl.filter(g => g.tip === 'soru');
  tamam(kodlar.length >= 3 && kodlar.length <= 4, `kod görevi sayısı ${kodlar.length}`);
  tamam(sorular.length >= 3 && sorular.length <= 4, `soru sayısı ${sorular.length}`);
  tamam(gl.some((g, i) => i && g.tip !== gl[i - 1].tip), 'karışık sıra');
  for (const s of sorular) {
    tamam(s.secenekler.length >= 3 && s.secenekler.length <= 4, 'şık sayısı');
    tamam(Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < s.secenekler.length, 'dogru aralıkta');
    tamam(new Set(s.secenekler).size === s.secenekler.length, 'şıklar tekrarsız');
    tamam(s.soru && s.aciklama, 'soru+açıklama dolu');
  }
  tamam(new Set(sorular.map(s => s.dogru)).size >= 3, 'dogru indexleri dağıtılmış');
  tamam(dogru[d.id].length === kodlar.length, 'referans çözüm sayısı = kod görevi');
  for (let i = 0; i < kodlar.length; i++) {
    const g = kodlar[i];
    tamam(g.baslik && g.metin && g.ipucu && typeof g.kontrol === 'function', `${g.baslik}: alanlar dolu`);
    const ok = await kos(d, g, dogru[d.id][i]);
    tamam(ok.ok === true, `${g.baslik}: doğru çözüm ok (${ok.mesaj})`);
    const no = await kos(d, g, bos);
    tamam(no.ok === false && no.mesaj, `${g.baslik}: boş çözüm reddedildi (${no.mesaj})`);
    // Başka görevin çözümü bu görevi geçmemeli
    const no2 = await kos(d, g, yanlisGenel[d.id]);
    tamam(no2.ok === false, `${g.baslik}: yanlış çözüm reddedildi (${no2.mesaj})`);
  }
}
console.log(hata ? `\n${hata} HATA` : '\nTÜM TESTLER GEÇTİ');
process.exit(hata ? 1 : 0);
