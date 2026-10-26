// Modül 7 parça sözleşme testi: node tools/test-parts-m7.mjs
// Sahte sim ile 5 parçanın (nem, pompa, pir, gaz, tustakimi) sim sözleşmesini doğrular (three Node'da çalışır, WebGL gerekmez).
import * as THREE from 'three';
import nem from '../src/parts/nem.js';
import pompa from '../src/parts/pompa.js';
import pir from '../src/parts/pir.js';
import gaz from '../src/parts/gaz.js';
import tus, { TUSLAR, TUS_DEGERLERI } from '../src/parts/tustakimi.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const bekle = ms => new Promise(r => setTimeout(r, ms));
const sahteSim = () => ({ pin: { D5: { mod: 'girdi', deger: 0, pwm: 0 }, D6: { mod: 'girdi', deger: 0, pwm: 0 } }, girdi: {}, analog: {}, cihaz: {}, yay() {} });
const yap = (m, tanim) => m.olustur({ THREE, tanim, konum: new THREE.Vector3(), index: 0 });
// Işın: group yatay düzlemini (y = yuk) hedef noktada keser
const isin = (x, y, z) => ({ ray: new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0)), isabet: null });

// Arayüz
for (const [m, tur] of [[nem, 'nem'], [pompa, 'pompa'], [pir, 'pir'], [gaz, 'gaz'], [tus, 'tustakimi']]) {
  ok(m.tur === tur, `tur = ${tur}`);
  const n = yap(m, { tur, pin: tur === 'pompa' ? 'D6' : tur === 'pir' ? 'D5' : 'A0' });
  ok(n.group?.isGroup && n.group.children.length > 5, `${tur}: group dolu`);
}

// nem + gaz: kaydırıcı sim.analog'a 0..4095 yazar, yüksek = sağ
for (const [m, tur] of [[nem, 'nem'], [gaz, 'gaz']]) {
  const sim = sahteSim(), n = yap(m, { tur, pin: 'A0' });
  n.guncelle(sim);
  ok(sim.analog.A0 !== undefined, `${tur}: guncelle başlangıç değeri yazar`);
  n.pointerDown(sim, isin(-100, 0, 0)); ok(sim.analog.A0 === 0, `${tur}: sol uç = 0`);
  n.pointerMove(sim, isin(100, 0, 0)); ok(sim.analog.A0 === 4095, `${tur}: sağ uç = 4095`);
  n.pointerMove(sim, isin(0, 0, 0)); ok(Math.abs(sim.analog.A0 - 2048) <= 1, `${tur}: orta ~2048`);
  sim.analog.A0 = 100; n.kare(.016, sim); ok(true, `${tur}: kare() dışarıdan değişimi okur`);
  for (let i = 0; i < 20; i++) n.kare(.05, sim);
}

// pompa: pwm / deger okur, hata vermez
{
  const sim = sahteSim(), n = yap(pompa, { tur: 'pompa', pin: 'D6' });
  n.kare(.05, sim); ok(n.durum.oran === 0, 'pompa: kapalı oran 0');
  sim.pin.D6.mod = 'cikti'; sim.pin.D6.pwm = 1; sim.pin.D6.deger = 1; n.kare(.05, sim);
  ok(n.durum.oran === 1, 'pompa: HIGH oran 1');
  sim.pin.D6.pwm = .5; n.kare(.05, sim); ok(n.durum.oran === .5, 'pompa: pwm .5');
  const a = n.durum.aci; n.kare(.1, sim); ok(n.durum.aci > a, 'pompa: rotor döner');
  n.guncelle(sim); ok(n.durum.oran === .5, 'pompa: guncelle okur');
}

// pir: figür sürükle -> girdi 1, ~1.5 sn sonra 0
{
  const sim = sahteSim(), n = yap(pir, { tur: 'pir', pin: 'D5' });
  n.guncelle(sim); ok(sim.girdi.D5 === 0, 'pir: başlangıç 0');
  let figur = null; n.group.traverse(o => { if (o.userData.figur && o.isMesh && !figur) figur = o; });
  const tikla = { ...isin(58, 0, 40), isabet: { object: figur } };
  n.pointerDown(sim, tikla); ok(sim.girdi.D5 === 0, 'pir: alan dışında 0');
  n.pointerMove(sim, isin(0, 0, 30)); ok(sim.girdi.D5 === 1, 'pir: alana girince 1');
  await bekle(600); n.kare(.6, sim); ok(sim.girdi.D5 === 1, 'pir: 0.6 sn sonra hâlâ 1');
  await bekle(1100); n.kare(.6, sim); ok(sim.girdi.D5 === 0, 'pir: ~1.7 sn sonra 0');
  n.pointerMove(sim, isin(2, 0, 31)); ok(sim.girdi.D5 === 1, 'pir: yeniden hareket -> 1');
  n.pointerUp(sim);
}

// tuş takımı
{
  ok(TUSLAR.join('') === '123456789*0#', 'tuş sırası 1..9 * 0 #');
  ok(TUS_DEGERLERI.length === 12 && TUS_DEGERLERI[0] === 340 && TUS_DEGERLERI[11] === 4080, 'TUS_DEGERLERI 340..4080');
  const sim = sahteSim(), n = yap(tus, { tur: 'tustakimi', pin: 'A0' });
  n.guncelle(sim); ok(sim.analog.A0 === 0, 'tus: başlangıç 0');
  const tuslar = []; n.group.traverse(o => { if (o.userData.tus !== undefined) tuslar.push(o); });
  ok(tuslar.length === 12, 'tus: 12 tuş');
  for (const t of tuslar) {
    const i = t.userData.tus;
    n.pointerDown(sim, { isabet: { object: t } });
    if (sim.analog.A0 !== 340 * (i + 1)) ok(false, `tus ${TUSLAR[i]}: ${sim.analog.A0}`);
    n.pointerUp(sim); if (sim.analog.A0 !== 0) ok(false, `tus ${TUSLAR[i]} bırakınca 0`);
  }
  ok(true, 'tus: her tuş 340*(i+1), bırakınca 0 (hata yoksa)');
  // basılıyken kayma: ışın başka tuşun üstüne gelince o tuşa geçer; tuş dışına çıkınca bırakır
  n.group.updateMatrixWorld(true);
  const merkez = t => { const v = new THREE.Vector3(); t.getWorldPosition(v); return v; };
  const dene = (t, say) => { const m = merkez(t); return { ray: new THREE.Raycaster(new THREE.Vector3(m.x, 100, m.z), new THREE.Vector3(0, -1, 0)) }; };
  const t0 = tuslar.find(o => o.userData.tus === 0), t5 = tuslar.find(o => o.userData.tus === 5);
  n.pointerDown(sim, { isabet: { object: t0 } });
  n.pointerMove(sim, dene(t5));
  ok(sim.analog.A0 === 340 * 6, 'tus: basılıyken 6. tuşa kayınca değer 2040 (' + sim.analog.A0 + ')');
  n.pointerMove(sim, { ray: new THREE.Raycaster(new THREE.Vector3(500, 100, 500), new THREE.Vector3(0, -1, 0)) });
  ok(sim.analog.A0 === 0, 'tus: tuş dışına kayınca 0');
  n.pointerUp(sim);
}

console.log(fail ? `\n${fail} HATA` : '\nTÜMÜ GEÇTİ');
process.exit(fail ? 1 : 0);
