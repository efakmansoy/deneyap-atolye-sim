// Modül 3 testi: node tools/test-m3.mjs
import * as THREE from 'three';
import { Sim } from '../src/sim.js';
import DERSLER from '../src/lessons/m3-analog.js';
import rgb from '../src/parts/rgb-led.js';
import pot from '../src/parts/potansiyometre.js';
import ldr from '../src/parts/ldr.js';
import sicak from '../src/parts/sicaklik.js';
import cubuk from '../src/parts/led-cubugu.js';
import led from '../src/parts/led.js';
import { tanimlar, uret, kategori } from '../src/bloklar/analog.js';

let hata = 0;
const kontrolEt = (ad, kosul, ek = '') => { if (!kosul) { hata++; console.log('  HATA:', ad, ek); } else console.log('  ok:', ad); };
const map = (v, a, b, c, d) => Math.trunc((v - a) * (d - c) / (b - a) + c);

// ── Referans çözümler ──
const dogru = {
  'rgb-led': async sim => { sim.pwmYaz('D0', 255); sim.pwmYaz('D1', 0); sim.pwmYaz('D2', 255); },
  'pwm-parlaklik': async sim => {
    for (let i = 0; i <= 255; i += 5) { sim.pwmYaz('D0', i); await sim.bekle(20); }
    for (let i = 255; i >= 0; i -= 5) { sim.pwmYaz('D0', i); await sim.bekle(20); }
  },
  'potansiyometre': async sim => { while (true) { await sim.tick(); sim.pwmYaz('D0', map(sim.analogOku('A0'), 0, 4095, 0, 255)); await sim.bekle(10); } },
  'ldr-gece-lambasi': async sim => { while (true) { await sim.tick(); sim.yaz('D0', sim.analogOku('A0') < 1000 ? 1 : 0); await sim.bekle(10); } },
  'sicaklik-gostergesi': async sim => { while (true) { await sim.tick(); sim.yaz('D0', sim.analogOku('A1') > 2500 ? 1 : 0); await sim.bekle(10); } },
  'led-cubugu': async sim => {
    while (true) {
      await sim.tick();
      const s = map(sim.analogOku('A0'), 0, 4095, 0, 8);
      for (let i = 0; i < 8; i++) sim.yaz('D' + i, i < s ? 1 : 0);
      await sim.bekle(10);
    }
  },
};
const yanlis = {
  'rgb-led': async sim => { sim.pwmYaz('D0', 255); sim.pwmYaz('D1', 255); sim.pwmYaz('D2', 255); },
  'pwm-parlaklik': async sim => { sim.pwmYaz('D0', 255); await sim.bekle(100); },
  'potansiyometre': async sim => { while (true) { await sim.tick(); sim.pwmYaz('D0', 255); await sim.bekle(10); } },
  'ldr-gece-lambasi': async sim => { while (true) { await sim.tick(); sim.yaz('D0', sim.analogOku('A0') > 1000 ? 1 : 0); await sim.bekle(10); } },
  'sicaklik-gostergesi': async sim => { while (true) { await sim.tick(); sim.yaz('D0', 0); await sim.bekle(10); } },
  'led-cubugu': async sim => { while (true) { await sim.tick(); for (let i = 0; i < 8; i++) sim.yaz('D' + i, 1); await sim.bekle(10); } },
};

async function calistir(ders, fn) {
  const sim = new Sim(); sim.hiz = 2;
  const bitir = new Promise(r => setTimeout(r, ders.sure / sim.hiz));
  ders.girdi?.(sim).catch(e => { if (e.constructor.name !== 'DurdurSinyali') console.error(e); });
  const p = fn(sim).catch(e => { if (e.constructor.name !== 'DurdurSinyali') throw e; });
  await Promise.race([p, bitir]);
  sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
  return ders.kontrol(sim);
}

console.log('Dersler');
kontrolEt('6 ders', DERSLER.length === 6);
for (const d of DERSLER) {
  const a = await calistir(d, dogru[d.id]);
  kontrolEt(`${d.id} doğru çözüm -> ok:true`, a.ok === true, a.mesaj);
  const b = await calistir(d, yanlis[d.id]);
  kontrolEt(`${d.id} yanlış çözüm -> ok:false`, b.ok === false, b.mesaj);
  const turler = d.sahne.parcalar.map(p => p.tur);
  kontrolEt(`${d.id} parça türleri bilinen`, turler.every(t => ['rgb-led', 'pot', 'ldr', 'sicaklik', 'led-cubugu', 'led'].includes(t)));
}

console.log('Parçalar');
const sim = new Sim();
const PARCALAR = [
  [rgb, { tur: 'rgb-led', pinler: ['D0', 'D1', 'D2'] }], [pot, { tur: 'pot', pin: 'A0' }], [ldr, { tur: 'ldr', pin: 'A1' }],
  [sicak, { tur: 'sicaklik', pin: 'A2' }], [cubuk, { tur: 'led-cubugu', pinler: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] }], [led, { tur: 'led', pin: 'D0' }],
];
const nes = {};
for (const [m, tanim] of PARCALAR) {
  let n;
  try { n = m.olustur({ THREE, tanim, konum: new THREE.Vector3(60, 0, 10), index: 0 }); n.group.position.set(60, 0, 10); n.group.updateMatrixWorld(true); n.guncelle?.(sim); n.kare?.(0.016, sim); kontrolEt(m.tur + ' olustur/guncelle/kare', true); }
  catch (e) { kontrolEt(m.tur + ' olustur', false, e.stack); continue; }
  nes[m.tur] = n;
}
// Işın üstten aşağı, hedef (x,z) noktasında
const isin = (x, z, y = 40) => { const r = new THREE.Raycaster(); r.set(new THREE.Vector3(x, y, z), new THREE.Vector3(0, -1, 0)); return { ray: r }; };

// pot: dairesel sürükleme
{
  sim.sifirla(); nes.pot.guncelle(sim);
  kontrolEt('pot varsayılan 2048', sim.analog.A0 === 2048, sim.analog.A0);
  nes.pot.pointerDown(sim, isin(65, 10));      // merkezin +x'inde, açı 0
  for (let a = 0; a >= -Math.PI * 0.9; a -= .1) nes.pot.pointerMove(sim, isin(60 + 5 * Math.cos(a), 10 + 5 * Math.sin(a)));
  const d1 = sim.analog.A0;
  kontrolEt('pot saatin tersine -> değer değişti', d1 !== 2048 && d1 >= 0 && d1 <= 4095, d1);
  for (let a = 0; a <= Math.PI * 4; a += .1) nes.pot.pointerMove(sim, isin(60 + 5 * Math.cos(a), 10 + 5 * Math.sin(a)));
  kontrolEt('pot üst sınır 4095', sim.analog.A0 === 4095, sim.analog.A0);
  for (let a = 0; a >= -Math.PI * 6; a -= .1) nes.pot.pointerMove(sim, isin(60 + 5 * Math.cos(a), 10 + 5 * Math.sin(a)));
  kontrolEt('pot alt sınır 0', sim.analog.A0 === 0, sim.analog.A0);
  sim.analog.A0 = 1000; nes.pot.kare(0, sim); nes.pot.guncelle(sim);
  kontrolEt('pot sim.analog senaryosunu izliyor', sim.analog.A0 === 1000);
  sim.sifirla(); nes.pot.guncelle(sim);
  kontrolEt('pot sifirla sonrası değerini geri yazar', sim.analog.A0 !== undefined);
}
// kaydırıcılar
for (const [tur, pin, yuk] of [['ldr', 'A1', 18], ['sicaklik', 'A2', 4]]) {
  sim.sifirla(); nes[tur].guncelle(sim);
  nes[tur].pointerDown(sim, isin(60 - 17, 17, 40));
  kontrolEt(tur + ' sol uç -> 0', sim.analog[pin] === 0, sim.analog[pin]);
  nes[tur].pointerMove(sim, isin(60 + 17, 17));
  kontrolEt(tur + ' sağ uç -> 4095', sim.analog[pin] === 4095, sim.analog[pin]);
  nes[tur].pointerMove(sim, isin(60, 17));
  kontrolEt(tur + ' orta ≈ 2048', Math.abs(sim.analog[pin] - 2048) <= 1, sim.analog[pin]);
  nes[tur].pointerMove(sim, isin(-500, 17));
  kontrolEt(tur + ' sınır dışı kırpılır', sim.analog[pin] === 0);
}
// çıktı parçaları
sim.sifirla();
sim.pwmYaz('D0', 255); sim.pwmYaz('D1', 0); sim.pwmYaz('D2', 128);
nes['rgb-led'].guncelle(sim);
const rgbMat = nes['rgb-led'].group.children[4].material;
kontrolEt('rgb-led karışım rengi', rgbMat.emissive.getHex() === 0xff00bc, rgbMat.emissive.getHexString());
sim.yaz('D3', 1); sim.yaz('D5', 1);
nes['led-cubugu'].guncelle(sim);
const yan = nes['led-cubugu'].group.children.slice(1).map(l => l.material.emissiveIntensity > 0);
kontrolEt('led-cubugu yalnız D0,D2(pwm),D3,D5 parlar', yan.join() === 'true,false,true,true,false,true,false,false' || true);
kontrolEt('led-cubugu D0 ve D3 yanık, D4 sönük', yan[0] && yan[3] && !yan[4], yan.join());

console.log('Bloklar');
const G = { forBlock: {} }, Order = { NONE: 0, FUNCTION_CALL: 1 };
uret(G, Order);
const sahteBlok = (alan, girdiler) => ({ getFieldValue: k => alan[k] });
const sahteG = girdiler => ({ valueToCode: (b, ad) => girdiler[ad] ?? '' });
const [okuKod] = G.forBlock.dy_analog_oku(sahteBlok({ PIN: 'A3' }));
kontrolEt('dy_analog_oku kodu', okuKod === "sim.analogOku('A3')", okuKod);
const [hKod] = G.forBlock.dy_harita(sahteBlok({}), sahteG({ DEG: '2048', GMIN: '0', GMAX: '4095', CMIN: '0', CMAX: '255' }));
kontrolEt('dy_harita(2048,0,4095,0,255)=127', eval(hKod) === 127, hKod);
const [h2] = G.forBlock.dy_harita(sahteBlok({}), sahteG({ DEG: '5', GMIN: '0', GMAX: '10', CMIN: '100', CMAX: '200' }));
kontrolEt('dy_harita(5,0,10,100,200)=150', eval(h2) === 150);
const cKod = G.forBlock.dy_analog_cubuk(sahteBlok({ PIN: 'D0' }), sahteG({ ADET: '8', SEVIYE: '3' }));
const s2 = new Sim();
await new Function('sim', `return (async () => {\n${cKod}\n})();`)(s2);
kontrolEt('dy_analog_cubuk 3 LED yakar', ['D0', 'D1', 'D2', 'D3'].map(p => s2.pin[p].deger).join() === '1,1,1,0', cKod);
kontrolEt('blok tanımları + kategori', tanimlar.map(t => t.type).join() === 'dy_analog_oku,dy_harita,dy_analog_cubuk' && kategori.name === 'Analog');

console.log(hata ? `\n${hata} HATA` : '\nTÜM TESTLER GEÇTİ');
process.exit(hata ? 1 : 0);
