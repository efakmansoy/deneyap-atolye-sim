// Görevler sekmesi testi: Modül 1 (1.1-1.3) ve Modül 5 (5.1-5.2) kod görevleri + sorular.
import { Sim } from '../src/sim.js';
import m1 from '../src/lessons/m1-led.js';
import m5 from '../src/lessons/m5-proje.js';

let hata = 0;
const ok = (c, m) => { if (!c) { hata++; console.log('FAIL', m); } else console.log('ok  ', m); };

const D = (s, ...a) => async sim => { for (const f of a) await f(sim); };
const y = (p, v) => async sim => sim.yaz(p, v);
const b = ms => async sim => sim.bekle(ms);
const donguSonsuz = (...a) => async sim => { while (true) { await sim.tick(); for (const f of a) await f(sim); } };
const dongu = (n, ...a) => async sim => { for (let i = 0; i < n; i++) for (const f of a) await f(sim); };
const lcdW = (r, t) => async sim => { const l = (sim.cihaz.lcd ??= ['', '']); l[r] = String(t).slice(0, 16).padEnd(16); sim.yay(); };
const servoYaz = a => async sim => { (sim.cihaz.servo ??= {}).D4 = a; };

// Perde döngüsü: karar(v) -> açı
const perde = (karar, lcdIsik = false) => async sim => {
  while (true) {
    await sim.tick();
    const v = sim.analogOku('A0');
    await servoYaz(karar(v))(sim);
    if (lcdIsik) await lcdW(1, v)(sim);
    await sim.bekle(100);
  }
};
const normal = v => v > 2000 ? 180 : 0;

const coz = {
  'led-yak': {
    'Bir kez yan ve sön': { dogru: D(0, y('D0', 1), b(500), y('D0', 0)), yanlis: y('D0', 1) },
    'Geç yansın': { dogru: D(0, b(300), y('D0', 1)), yanlis: y('D0', 1) },
    'Üç kez yanıp sön': { dogru: dongu(3, y('D0', 1), b(200), y('D0', 0), b(200)), yanlis: donguSonsuz(y('D0', 1), b(200), y('D0', 0), b(200)) },
  },
  'led-yanip-son': {
    'Hızlı yanıp sönme': { dogru: donguSonsuz(y('D0', 1), b(200), y('D0', 0), b(200)), yanlis: donguSonsuz(y('D0', 1), b(500), y('D0', 0), b(500)) },
    'Nabız ritmi': { dogru: donguSonsuz(y('D0', 1), b(800), y('D0', 0), b(200)), yanlis: donguSonsuz(y('D0', 1), b(500), y('D0', 0), b(500)) },
    'Gecikmeli başlangıç': { dogru: D(0, b(1000), donguSonsuz(y('D0', 1), b(500), y('D0', 0), b(500))), yanlis: donguSonsuz(y('D0', 1), b(500), y('D0', 0), b(500)) },
    'Tam beş kez': { dogru: dongu(5, y('D0', 1), b(300), y('D0', 0), b(300)), yanlis: donguSonsuz(y('D0', 1), b(300), y('D0', 0), b(300)) },
  },
  'iki-led': {
    'Hızlı nöbet değişimi': { dogru: donguSonsuz(y('D1', 0), y('D0', 1), b(200), y('D0', 0), y('D1', 1), b(200)), yanlis: donguSonsuz(y('D0', 1), y('D1', 0), b(400), y('D0', 0), y('D1', 1), b(400)) },
    'Yeşil önce başlasın': { dogru: donguSonsuz(y("D0", 0), y("D1", 1), b(300), y("D1", 0), y("D0", 1), b(300)), yanlis: donguSonsuz(y('D0', 1), y('D1', 0), b(300), y('D0', 0), y('D1', 1), b(300)) },
    'Araya karanlık gir': { dogru: donguSonsuz(y('D0', 1), b(400), y('D0', 0), b(100), y('D1', 1), b(400), y('D1', 0), b(100)), yanlis: donguSonsuz(y('D0', 1), y('D1', 0), b(400), y('D0', 0), y('D1', 1), b(400)) },
    'Üçer tur ve dur': { dogru: dongu(3, y('D0', 1), b(300), y('D0', 0), y('D1', 1), b(300), y('D1', 0)), yanlis: donguSonsuz(y('D0', 1), b(300), y('D0', 0), y('D1', 1), b(300), y('D1', 0)) },
  },
  'lcd-merhaba': {
    'Sabit iki satır': { dogru: D(0, lcdW(0, 'Merhaba'), lcdW(1, 'Deneyap')), yanlis: lcdW(0, 'Merhaba') },
    'Geri sayım': { dogru: async sim => { await lcdW(0, 'Merhaba')(sim); for (let i = 5; i >= 1; i--) { await lcdW(1, i)(sim); await sim.bekle(500); } await lcdW(1, 'Basla')(sim); },
      yanlis: async sim => { for (let i = 1; i <= 5; i++) { await lcdW(1, i)(sim); await sim.bekle(500); } } },
    'Çift sayılar': { dogru: async sim => { for (let i = 2; i <= 10; i += 2) { await lcdW(1, i)(sim); await sim.bekle(400); } },
      yanlis: async sim => { for (let i = 1; i <= 5; i++) { await lcdW(1, i)(sim); await sim.bekle(400); } } },
    'Sayi: metni': { dogru: async sim => { for (let i = 1; i <= 5; i++) { await lcdW(1, 'Sayi: ' + i)(sim); await sim.bekle(500); } },
      yanlis: async sim => { for (let i = 1; i <= 5; i++) { await lcdW(1, i)(sim); await sim.bekle(500); } } },
  },
  'proje-perde': {
    'Ters perde': { dogru: perde(v => v > 2000 ? 0 : 180), yanlis: perde(normal) },
    'Işık değerini göster': { dogru: perde(normal, true), yanlis: perde(normal, false) },
    'Yüksek eşik': { dogru: perde(v => v > 3000 ? 180 : 0), yanlis: perde(normal) },
    'Üç kademe': { dogru: perde(v => v > 3000 ? 180 : v > 1000 ? 90 : 0), yanlis: perde(normal) },
  },
};

async function kos(ders, g, fn) {
  const sim = new Sim(); sim.hiz = 5;
  const sure = g.sure ?? ders.sure, girdi = g.girdi ?? ders.girdi;
  const bitir = new Promise(r => setTimeout(r, sure / sim.hiz));
  girdi?.(sim).catch(() => {});
  const p = fn(sim).catch(() => {});
  await Promise.race([p, bitir]);
  sim.t = Math.max(sim.t, sure); sim.iptal = true;
  return g.kontrol(sim);
}

for (const d of [...m1, ...m5]) {
  const gs = d.gorevler;
  ok(Array.isArray(gs), `${d.id}: gorevler var`);
  const kodlar = gs.filter(g => g.tip === 'kod'), sorular = gs.filter(g => g.tip === 'soru');
  ok(kodlar.length >= 3 && kodlar.length <= 4, `${d.id}: ${kodlar.length} kod gorevi`);
  ok(sorular.length >= 3 && sorular.length <= 4, `${d.id}: ${sorular.length} soru`);
  ok(gs.every(g => g.tip === 'kod' || g.tip === 'soru'), `${d.id}: tipler gecerli`);
  ok(gs.some((g, i) => i > 0 && g.tip !== gs[i - 1].tip), `${d.id}: karisik sira`);
  ok(new Set(sorular.map(s => s.dogru)).size >= 2, `${d.id}: dogru indexleri dagitilmis`);
  for (const [i, s] of sorular.entries()) {
    const n = s.secenekler.length;
    ok(n >= 3 && n <= 4 && Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < n, `${d.id} soru${i + 1}: sik sayisi ${n}, dogru ${s.dogru} aralikta`);
    ok(new Set(s.secenekler.map(x => x.trim().toLowerCase())).size === n, `${d.id} soru${i + 1}: tekrar eden sik yok`);
    ok(typeof s.soru === 'string' && s.soru && s.aciklama, `${d.id} soru${i + 1}: soru/aciklama dolu`);
  }
  for (const g of kodlar) {
    const c = coz[d.id]?.[g.baslik];
    ok(!!c, `${d.id} "${g.baslik}": referans cozum var`);
    ok(g.baslik && g.metin && g.ipucu && typeof g.kontrol === 'function', `${d.id} "${g.baslik}": alanlar dolu`);
    if (!c) continue;
    const a = await kos(d, g, c.dogru); ok(a.ok === true, `${d.id} "${g.baslik}" dogru: ${a.mesaj}`);
    const w = await kos(d, g, c.yanlis); ok(w.ok === false && !!w.mesaj, `${d.id} "${g.baslik}" yanlis: ${w.mesaj}`);
    const e = await kos(d, g, async () => {}); ok(e.ok === false && !!e.mesaj, `${d.id} "${g.baslik}" bos: ${e.mesaj}`);
  }
}
console.log(hata ? `${hata} HATA` : 'TUMU GECTI');
process.exit(hata ? 1 : 0);
