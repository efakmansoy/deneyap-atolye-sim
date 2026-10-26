// Robot araba fiziği birim testi: node tools/test-araba.mjs
import { Sim } from '../src/sim.js';
import { arabaBagla, hazirArena, cizgiUzaklik } from '../src/araba-dunya.js';

let fail = 0;
const rapor = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };
const yakin = (a, b, tol) => Math.abs(a - b) <= tol;

function kur(arena, pinler) {
  const sim = new Sim();
  const d = arabaBagla(sim, { arena, parcalar: [{ tur: 'araba', pinler }] });
  return { sim, d };
}
const ilerle = (sim, ms) => { sim.t += ms; };
const motor = (sim, sl, sg, gl = 0, gg = 0) => { sim.yaz('D0', sl); sim.yaz('D1', gl); sim.yaz('D2', sg); sim.yaz('D3', gg); };

console.log('\n--- Araba Testleri ---\n');

// ileri: 2 sn tam güç = 50 cm
{ const { sim, d } = kur('duz'); motor(sim, 1, 1); ilerle(sim, 2000); d.guncelle(sim);
  const a = sim.cihaz.araba;
  rapor('ileri 2 sn = 50 cm', yakin(a.x, -60 + 50, 0.5) && yakin(a.y, 0, .1), `x=${a.x.toFixed(2)}`);
  rapor('hız 25 cm/s', yakin(a.hiz, 25, .01)); }

// geri
{ const { sim, d } = kur('duz'); motor(sim, 0, 0, 1, 1); ilerle(sim, 1000); d.guncelle(sim);
  rapor('geri 1 sn = -25 cm (duvara çarpmadan)', yakin(sim.cihaz.araba.x, -60 - 25, 0.5) || sim.cihaz.araba.carpti, `x=${sim.cihaz.araba.x}`); }

// pwm yarım güç + olay sırası (önce ileri 1 sn, sonra dur 1 sn, sonra yarım güç 2 sn)
{ const { sim, d } = kur('duz'); motor(sim, 1, 1); ilerle(sim, 1000); motor(sim, 0, 0); ilerle(sim, 1000);
  sim.pwmYaz('D0', 127.5); sim.pwmYaz('D2', 127.5); ilerle(sim, 2000); d.guncelle(sim);
  rapor('olay sıralı entegrasyon: 25 + 0 + 25 cm', yakin(sim.cihaz.araba.x, -60 + 50, 0.5), `x=${sim.cihaz.araba.x.toFixed(2)}`); }

// yerinde dönüş: sol geri sağ ileri (sola, CCW). w = 50/12 rad/s; 90 derece = 0.377 sn
{ const { sim, d } = kur('duz'); motor(sim, 0, 1, 1, 0); ilerle(sim, Math.round(Math.PI / 2 / (50 / 12) * 1000)); motor(sim, 0, 0); d.guncelle(sim);
  const a = sim.cihaz.araba;
  rapor('yerinde sola 90 derece', yakin(a.yonDerece, 90, 1) && yakin(a.x, -60, .5), `yon=${a.yonDerece.toFixed(1)}`); }

// tek tekerlek (sol dur, sağ ileri) yay çizer, sola kıvrılır: y artar
{ const { sim, d } = kur('duz'); motor(sim, 0, 1); ilerle(sim, 1500); d.guncelle(sim);
  const a = sim.cihaz.araba; rapor('tek tekerlek yay: sola kıvrılır', a.y > 5 && a.yon > 0.5, `y=${a.y.toFixed(1)} yon=${a.yon.toFixed(2)}`); }

// ölü bölge
{ const { sim, d } = kur('duz'); sim.pwmYaz('D0', 20); sim.pwmYaz('D2', 20); ilerle(sim, 1000); d.guncelle(sim);
  rapor('eşik altı pwm: durur', sim.cihaz.araba.x === -60); }

// enable pini
{ const { sim, d } = kur('duz', { solHiz: 'D9', sagHiz: 'D10' }); sim.yaz('D0', 1); sim.yaz('D2', 1); ilerle(sim, 1000); d.guncelle(sim);
  const x0 = sim.cihaz.araba.x; sim.pwmYaz('D9', 255); sim.pwmYaz('D10', 255); ilerle(sim, 1000); d.guncelle(sim);
  rapor('enable pini olmadan durur, sonra gider', x0 === -60 && yakin(sim.cihaz.araba.x, -35, .5)); }

// mesafe: canlı getter
{ const { sim } = kur('duz'); rapor('mesafe duz arena başlangıç 130', sim.cihaz.mesafe.D4 === 130, String(sim.cihaz.mesafe.D4)); }

// çarpışma: duvara tam güç
{ const { sim, d } = kur('duz'); motor(sim, 1, 1); ilerle(sim, 10000); d.guncelle(sim);
  const a = sim.cihaz.araba;
  rapor('duvara çarpınca durur (x = 80-10)', yakin(a.x, 70, .5) && a.carpti, `x=${a.x.toFixed(2)}`);
  rapor('duvarda mesafe minimum 2', sim.cihaz.mesafe.D4 === 2, String(sim.cihaz.mesafe.D4));
  // aynı yerden dönebilir
  motor(sim, 0, 1, 1, 0); ilerle(sim, 300); d.guncelle(sim); rapor('çarptıktan sonra dönebilir', sim.cihaz.araba.yonDerece > 50); }

// engelli arena: ilk engel
{ const { sim, d } = kur('engelli'); const m = sim.cihaz.mesafe.D4; // x=-65+10=-55 ; engel x=-31.. -> 24
  rapor('engele mesafe 24 cm', m === 24, String(m));
  motor(sim, 1, 1); ilerle(sim, 5000); d.guncelle(sim);
  rapor('engele çarpıp durur', sim.cihaz.araba.carpti && yakin(sim.cihaz.araba.x, -41, .5), `x=${sim.cihaz.araba.x.toFixed(1)}`); }
function YA() { return 10; }

// sim.sifirla sonrası yeniden bağlama
{ const { sim, d } = kur('duz'); motor(sim, 1, 1); ilerle(sim, 1000); d.guncelle(sim); sim.sifirla();
  const d2 = arabaBagla(sim, { arena: 'duz', parcalar: [{ tur: 'araba' }] });
  rapor('sifirla sonrası başa döner', d2 === d && sim.cihaz.araba.x === -60 && sim.cihaz.mesafe.D4 === 130); }

// çizgi
{ const ar = hazirArena('cizgi');
  rapor('çizgi başlangıcı çizgi üzerinde', cizgiUzaklik(ar, 0, -40) < 0.1);
  const { sim, d } = kur('cizgi');
  rapor('başlangıçta iki sensör de beyaz', sim.girdi.D5 === 0 && sim.girdi.D6 === 0);
  // sola dönük: sol sensör (+y tarafı) ... araba çizgiyi izlemeden 1 sn ileri: çizgi boyunca gider
  motor(sim, 1, 1); ilerle(sim, 1000); d.guncelle(sim);
  rapor('çizgi boyunca giderken ortada kalır', cizgiUzaklik(ar, sim.cihaz.araba.x, sim.cihaz.araba.y) < .1 && sim.girdi.D5 === 0 && sim.girdi.D6 === 0);
  // sola 1 sn kıvır: sol sensör dışarı..., sağ tekerlek ileri sol dur: araba sola döner -> sol sensör çizgiyi (iç tarafta) görmez; sağ sensör çizgiye girer
  motor(sim, 0, 1); let sag = 0, sol = 0;
  for (let i = 0; i < 40; i++) { ilerle(sim, 50); if (sim.girdi.D6) sag++; if (sim.girdi.D5) sol++; }
  rapor('sola kıvrılınca bir sensör çizgiyi görür', sag + sol > 0, `sol=${sol} sag=${sag}`); }
{ const ar = hazirArena('cizgi');
  // manuel poz ile sensör geometrisi: araba çizgi üstünde y=-40, yön 0; sensör sol(+y) = y -36.5 -> sapma 3.5 > 2 : 0
  // arabayı 3 cm sola (y=-37) kaydır: sol sensör y=-33.5 (dışarıda), sağ sensör y=-40.5 -> çizgide (<=2 sapma)
  const { sim, d } = kur('cizgi'); d.durum.y = -37;
  rapor('araba çizginin solundaysa sağ sensör siyah', d.cizgi()[1] === 1 && d.cizgi()[0] === 0);
  d.durum.y = -43; rapor('araba çizginin sağındaysa sol sensör siyah', d.cizgi()[0] === 1 && d.cizgi()[1] === 0); }

console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
