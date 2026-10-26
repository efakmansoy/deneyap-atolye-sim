// Modül 4 testi: node tools/test-m4.mjs
import * as THREE from 'three';
import { Sim } from '../src/sim.js';
import dersler from '../src/lessons/m4-ses-hareket.js';
import * as blok from '../src/bloklar/ses-servo.js';
import buzzer from '../src/parts/buzzer.js';
import servo from '../src/parts/servo.js';
import mesafe from '../src/parts/mesafe.js';
import piyano from '../src/parts/piyano.js';

const HIZ = 2;
let hata = 0;
const tamam = (kosul, ad) => { if (!kosul) { hata++; console.log('  HATA:', ad); } else console.log('  ok  :', ad); };

// ── Blok üreticisi (sahte Blockly) ──
const G = { forBlock: {} };
const Order = { NONE: 0, ATOMIC: 0 };
blok.uret(G, Order);
const sahteBlok = (alanlar, girdiler = {}) => ({ getFieldValue: k => alanlar[k] });
const sahteG = girdiler => ({ valueToCode: (b, ad) => String(girdiler[ad] ?? '') });
const kod = (tip, alanlar, girdiler = {}) => G.forBlock[tip](sahteBlok(alanlar), sahteG(girdiler));
const calis = (sim, js) => new Function('sim', js)(sim);
const cal = (sim, pin, f) => calis(sim, kod('dy_ses_cal', { PIN: pin }, { FREKANS: f }));
const sustur = (sim, pin) => calis(sim, kod('dy_ses_sustur', { PIN: pin }));
const servoYaz = (sim, pin, a) => calis(sim, kod('dy_servo_yaz', { PIN: pin }, { ACI: a }));
const mesafeOku = (sim, pin) => calis(sim, 'return ' + G.forBlock.dy_mesafe_oku(sahteBlok({ PIN: pin }))[0]);

// ── Referans çözümler ──
const dogru = {
  'buzzer-melodi': async sim => {
    for (const f of [262, 330, 392, 523, 392, 330, 262]) { cal(sim, 'D8', f); await sim.bekle(300); sustur(sim, 'D8'); await sim.bekle(50); }
  },
  'servo-motor': async sim => {
    for (let a = 0; a <= 180; a += 30) { servoYaz(sim, 'D5', a); await sim.bekle(100); }
    for (let a = 150; a >= 0; a -= 30) { servoYaz(sim, 'D5', a); await sim.bekle(100); }
  },
  'park-sensoru': async sim => {
    while (true) {
      await sim.tick();
      const d = mesafeOku(sim, 'D3');
      if (d < 100) { cal(sim, 'D8', 1000); await sim.bekle(d * 4); sustur(sim, 'D8'); await sim.bekle(d * 4); }
      else await sim.bekle(50);
    }
  },
  'dugme-piyano': async sim => {
    const f = [262, 294, 330, 349, 392, 440, 494];
    while (true) {
      await sim.tick();
      sustur(sim, 'D8');
      for (let i = 0; i < 7; i++) if (sim.oku('D' + i) > 0) cal(sim, 'D8', f[i]);
    }
  },
};
const yanlis = {
  'buzzer-melodi': async sim => { cal(sim, 'D8', 440); await sim.bekle(300); },
  'servo-motor': async sim => { servoYaz(sim, 'D5', 0); await sim.bekle(100); servoYaz(sim, 'D5', 180); await sim.bekle(100); },
  'park-sensoru': async sim => { while (true) { await sim.tick(); cal(sim, 'D8', 1000); await sim.bekle(300); sustur(sim, 'D8'); await sim.bekle(300); } },
  'dugme-piyano': async sim => { while (true) { await sim.tick(); cal(sim, 'D8', 440); await sim.bekle(50); } },
};

async function kos(ders, program) {
  const sim = new Sim(); sim.hiz = HIZ;
  let za;
  const bitir = new Promise(r => { za = setTimeout(r, ders.sure / sim.hiz); });
  if (ders.girdi) ders.girdi(sim).catch(e => { if (e?.constructor?.name !== 'DurdurSinyali') console.error(e); });
  const p = program(sim).catch(e => { if (e?.constructor?.name !== 'DurdurSinyali') throw e; });
  await Promise.race([p, bitir]);
  clearTimeout(za);
  sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
  if (process.env.DBG && ders.id === "park-sensoru" && program === dogru[ders.id]) console.log(JSON.stringify(sim.olaylar.map(o => [o.tur[0] + o.t, o.deger])));
  return ders.kontrol(sim);
}

console.log('Dersler:');
await Promise.all(dersler.map(async d => {
  const [ok, no] = await Promise.all([kos(d, dogru[d.id]), kos(d, yanlis[d.id])]);
  tamam(ok.ok === true, `${d.id}: doğru çözüm ok (${ok.mesaj})`);
  tamam(no.ok === false, `${d.id}: yanlış çözüm reddedildi (${no.mesaj})`);
}));

// ── Bloklar ──
console.log('Bloklar:');
{
  const s = new Sim();
  cal(s, 'D8', 440); cal(s, 'D8', 440); sustur(s, 'D8');
  tamam(s.olaylar.length === 2 && s.cihaz.ses.D8 === 0 && s.olaylar[0].tur === 'ses', 'ses olayları tekrarsız');
  servoYaz(s, 'D5', 999);
  tamam(s.cihaz.servo.D5 === 180 && s.olaylar.at(-1).tur === 'servo', 'servo açısı 0-180 sınırlı');
  tamam(mesafeOku(s, 'D3') === 200, 'mesafe varsayılanı 200');
  s.cihaz.mesafe = { D3: 33 };
  tamam(mesafeOku(s, 'D3') === 33, 'mesafe okuma');
}

// ── Parçalar ──
console.log('Parçalar:');
for (const d of dersler) for (const p of d.sahne.parcalar) {
  const sim = new Sim();
  const mod = { buzzer, servo, mesafe, piyano }[p.tur];
  let n;
  try { n = mod.olustur({ THREE, tanim: p, konum: new THREE.Vector3(...(p.konum ?? [52, 0, -12])), index: 0 }); n.group.position.set(...(p.konum ?? [52, 0, -12])); } catch (e) { tamam(false, p.tur + ' oluştur: ' + e.message); continue; }
  n.group.updateMatrixWorld(true);
  n.guncelle?.(sim);
  n.kare?.(.016, sim);
  tamam(true, `${d.id}/${p.tur}: oluştur + guncelle + kare`);
}
{
  const sim = new Sim();
  const m = mesafe.olustur({ THREE, tanim: { pin: 'D3' }, konum: new THREE.Vector3() });
  m.guncelle(sim);
  tamam(sim.cihaz.mesafe.D3 === 100, 'mesafe başlangıç 100');
  // Yukarıdan sensörün 60 cm uzağındaki noktaya bak: z = 8 + 60*.15 = 17
  const ray = new THREE.Ray(new THREE.Vector3(0, 100, 17), new THREE.Vector3(0, -1, 0));
  const engel = m.group.children.find(c => c.userData.engel);
  m.pointerDown(sim, { isabet: { object: engel }, ray });
  tamam(sim.cihaz.mesafe.D3 === 60, 'mesafe pointerDown cm=' + sim.cihaz.mesafe.D3);
  m.pointerMove(sim, { ray: new THREE.Ray(new THREE.Vector3(0, 100, 500), new THREE.Vector3(0, -1, 0)) });
  tamam(sim.cihaz.mesafe.D3 === 200, 'mesafe üst sınır 200');
  m.pointerMove(sim, { ray: new THREE.Ray(new THREE.Vector3(0, 100, -50), new THREE.Vector3(0, -1, 0)) });
  tamam(sim.cihaz.mesafe.D3 === 2, 'mesafe alt sınır 2');
  m.pointerUp(sim);
  m.pointerMove(sim, { ray });
  tamam(sim.cihaz.mesafe.D3 === 2, 'bırakınca sürükleme durur');
}
{
  const sim = new Sim();
  const p = piyano.olustur({ THREE, tanim: { pinler: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'] }, konum: new THREE.Vector3() });
  const tus = p.group.children.find(c => c.userData.tus === 2);
  p.pointerDown(sim, { isabet: { object: tus } });
  tamam(sim.girdi.D2 === 1, 'piyano basınca girdi=1');
  p.guncelle(sim);
  tamam(tus.position.y < 5, 'tuş aşağı iner');
  p.pointerUp(sim, {});
  tamam(sim.girdi.D2 === 0, 'bırakınca girdi=0');
}
{
  const sim = new Sim();
  const s = servo.olustur({ THREE, tanim: { pin: 'D5' }, konum: new THREE.Vector3() });
  sim.cihaz.servo = { D5: 0 };
  for (let i = 0; i < 200; i++) s.kare(.016, sim);
  tamam(s.durum.aci === 0, 'servo hedefe ulaşır');
  sim.cihaz.servo.D5 = 180; s.kare(.016, sim);
  tamam(s.durum.aci > 0 && s.durum.aci < 180, 'servo yumuşak döner');
}

console.log(hata ? `\n${hata} HATA` : '\nTÜM TESTLER GEÇTİ');
process.exit(hata ? 1 : 0);
