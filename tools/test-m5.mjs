import * as THREE from 'three';
import { Sim } from '../src/sim.js';
import dersler from '../src/lessons/m5-proje.js';
import lcd from '../src/parts/lcd.js';
import perde from '../src/parts/perde.js';
import * as lcdBlok from '../src/bloklar/lcd.js';

let hata = 0;
const ok = (c, m) => { if (!c) { hata++; console.log('FAIL', m); } else console.log('ok  ', m); };
const AF = Object.getPrototypeOf(async () => {}).constructor;

// Blok kodu üretimi (sahte generator)
const G = { forBlock: {} }, Order = { NONE: 0 };
lcdBlok.uret(G, Order);
const blok = (f) => ({ getFieldValue: () => f });
const g = { valueToCode: () => '"Merhaba Dunya ve daha uzun"' };
const kod = G.forBlock.dy_lcd_yaz(blok('1'), g);
{ const s = new Sim(); await new AF('sim', kod)(s); ok(s.cihaz.lcd[1] === 'Merhaba Dunya ve' && s.cihaz.lcd[1].length === 16, 'dy_lcd_yaz keser'); 
  await new AF('sim', G.forBlock.dy_lcd_temizle())(s); ok(s.cihaz.lcd[0] === '' , 'dy_lcd_temizle'); }

const cozumler = {
  'lcd-merhaba': {
    dogru: async sim => {
      const w = (r, t) => { const l = (sim.cihaz.lcd ??= ['', '']); l[r] = String(t).slice(0, 16).padEnd(16); sim.yay(); };
      w(0, 'Merhaba');
      for (let i = 1; i <= 5; i++) { w(1, i); await sim.bekle(500); }
    },
    yanlis: async sim => { sim.cihaz.lcd = ['Merhaba', '7']; sim.yay(); await sim.bekle(100); },
  },
  'proje-perde': {
    dogru: async sim => {
      sim.cihaz.servo ??= {};
      while (true) {
        await sim.tick();
        const v = sim.analogOku('A0');
        const l = (sim.cihaz.lcd ??= ['', '']);
        if (v > 2000) { sim.cihaz.servo.D4 = 180; l[0] = 'Perde: Acik'; } else { sim.cihaz.servo.D4 = 0; l[0] = 'Perde: Kapali'; }
        await sim.bekle(100);
      }
    },
    yanlis: async sim => { sim.cihaz.servo ??= {}; sim.cihaz.servo.D4 = 180; sim.cihaz.lcd = ['Perde: Acik', '']; await sim.bekle(50); },
  },
};

async function kos(ders, fn) {
  const sim = new Sim(); sim.hiz = 40;
  const sure = ders.sure;
  const bitir = new Promise(r => setTimeout(r, sure / sim.hiz));
  ders.girdi?.(sim).catch(() => {});
  const p = fn(sim).catch(() => {});
  await Promise.race([p, bitir]);
  sim.t = Math.max(sim.t, sure); sim.iptal = true;
  return ders.kontrol(sim);
}
for (const d of dersler) {
  const c = cozumler[d.id];
  const a = await kos(d, c.dogru); ok(a.ok, `${d.id} dogru: ${a.mesaj}`);
  const b = await kos(d, c.yanlis); ok(!b.ok, `${d.id} yanlis: ${b.mesaj}`);
  const bos = await kos(d, async () => {}); ok(!bos.ok, `${d.id} bos: ${bos.mesaj}`);
}

// Parçalar
const sim = new Sim();
const l = lcd.olustur({ THREE, tanim: { tur: 'lcd' }, konum: new THREE.Vector3(), index: 0 });
sim.cihaz.lcd = ['Merhaba', '12']; l.guncelle(sim); l.guncelle(new Sim()); ok(true, 'lcd olustur/guncelle');
const p = perde.olustur({ THREE, tanim: { tur: 'perde', servoPin: 'D4', isikPin: 'A0' }, konum: new THREE.Vector3(), index: 1 });
p.group.position.set(100, 0, -6);
const cam = new THREE.PerspectiveCamera(40, 1, 1, 2000); cam.position.set(90, 120, 130); cam.lookAt(100, 20, -6); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
const ray = new THREE.Raycaster();
const ndc = (wy) => { const v = new THREE.Vector3(100 - 28, wy, -6).project(cam); return new THREE.Vector2(v.x, v.y); };
ray.setFromCamera(ndc(10), cam);
p.pointerDown(sim, { ray }); const alt = sim.analog.A0;
ray.setFromCamera(ndc(40), cam); p.pointerMove(sim, { ray }); const ust = sim.analog.A0;
p.pointerUp(sim, {});
ok(alt >= 0 && ust > alt && ust <= 4095, `perde surukle ${alt} -> ${ust}`);
sim.cihaz.servo = { D4: 180 }; p.guncelle(sim);
for (let i = 0; i < 60; i++) p.kare(.05, sim);
ok(p.group.children.some(c => c.scale.x < 0.2), 'perde aciliyor (olcek kuculdu)');
sim.cihaz.servo.D4 = 0; for (let i = 0; i < 60; i++) p.kare(.05, sim);
ok(p.group.children.some(c => c.scale.x > .95), 'perde kapaniyor');
p.guncelle(new Sim()); ok(true, 'perde bos sim');
console.log(hata ? `${hata} HATA` : 'TUMU GECTI');
process.exit(hata ? 1 : 0);
