// Modül 5 ek dersleri testi (5.3 LCD termometre, 5.4 Elektronik zar):  node tools/test-ek-m5b.mjs
// (a) ders/adım şeması   (b) C++ çözüm + boş program   (c) sesli parçalar + düzenle görevleri
// (d) Görevler sekmesi (kod görevleri + sorular)   (e) blok çözümü (başsız Blockly) + dy_rastgele JS/C++ üretimi
// Rastgelelik: Math.random tohumlu bir üreteçle değiştirilir (kararlı test). Tohumsuz deneme için RASTGELE=1.
import { createServer } from 'vite';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SHIM = new URL('./_blockly-shim.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });

let fail = 0;
const tamam = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek && (!k || process.env.AYRINTI) ? '  -> ' + ek : '')); if (!k) fail++; };

// ── tohumlu Math.random ──
const GERCEK_RANDOM = Math.random;
let tohum = 1;
const tohumla = n => {
  if (process.env.RASTGELE) return;
  tohum = n >>> 0;
  Math.random = () => { tohum = (tohum + 0x6D2B79F5) >>> 0; let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

const HIZ = 3, DURDURMA_MS = 1300;
const bekle = ms => new Promise(r => setTimeout(r, ms));

try {
  const { Sim } = await vite.ssrLoadModule('/src/sim.js');
  const { cppDerle } = await vite.ssrLoadModule('/src/cppcalistir.js');
  const { Blockly, generator, TOOLBOX } = await vite.ssrLoadModule('/src/blocks.js');
  const { arduinoKod } = await vite.ssrLoadModule('/src/cpp.js');
  const { DERSLER } = await vite.ssrLoadModule('/src/lessons/index.js');
  const ekDersler = (await vite.ssrLoadModule('/src/lessons/m5b-ek.js')).default;
  const ICERIK = (await vite.ssrLoadModule('/src/lessons/icerik/m5c-sesli.js')).default;
  const COZUM = (await import(pathToFileURL(path.resolve('tools/e2e/cozumler-ek-m5b.mjs')).href)).default;

  const IDLER = ['lcd-termometre', 'elektronik-zar'];
  const BOS = 'void setup() {} void loop() {}';
  const ders = id => DERSLER.find(d => d.id === id);

  // sim üzerinde program çalıştır (C++ ya da JS) + senaryo, sonra kontrolü döndür
  async function kos(d, program, gorev = {}, tohumNo = 7) {
    tohumla(tohumNo);
    const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
    const sure = gorev.sure ?? d.sure, girdiFn = gorev.girdi ?? d.girdi, kontrol = gorev.kontrol ?? d.kontrol;
    let calistir;
    if (program.js != null) calistir = () => new Function('sim', `return (async () => {\n${program.js}\n})();`)(sim);
    else {
      const c = cppDerle(program, sim);
      if (c.hata) return { hata: c.hata.mesaj };
      calistir = () => c.calistir();
    }
    const hatalar = [];
    const yut = e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); };
    const girdi = girdiFn ? girdiFn(sim).catch(yut) : Promise.resolve();
    const prog = Promise.resolve().then(calistir).catch(yut);
    let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
    while (sim.t < sure && !hatalar.length) {
      await bekle(5);
      if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
      if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (sure / HIZ) * 4 + 5000) break;
    }
    sim.t = Math.max(sim.t, sure); sim.iptal = true;
    await Promise.all([girdi, prog]);
    if (hatalar.length) return { hata: String(hatalar[0]?.stack ?? hatalar[0]) };
    return { sonuc: kontrol(sim), sim };
  }

  // ───────────── (a) ders ve adım şeması ─────────────
  console.log('\n# (a) şema');
  const tumIdler = DERSLER.map(d => d.id), tumAdlar = DERSLER.map(d => d.ad);
  tamam('id benzersiz', new Set(tumIdler).size === tumIdler.length);
  tamam('ad benzersiz', new Set(tumAdlar).size === tumAdlar.length);
  tamam('iki ders yüklendi (index.js), proje-perde sonrasında', IDLER.every(i => tumIdler.indexOf(i) > tumIdler.indexOf('proje-perde')), tumIdler.join(','));
  tamam('ekDersler id sırası', ekDersler.map(d => d.id).join() === IDLER.join());
  tamam('adlar', ders('lcd-termometre')?.ad === '5.3 · LCD termometre' && ders('elektronik-zar')?.ad === '5.4 · Elektronik zar');
  const TIP = new Set(['dy_yaz', 'dy_pwm', 'dy_oku', 'dy_bekle', 'dy_surekli', 'dy_seri', 'controls_repeat_ext', 'controls_if', 'controls_for', 'controls_whileUntil', 'logic_compare', 'logic_operation', 'logic_boolean', 'logic_negate', 'math_number', 'math_arithmetic', 'text', 'variables_set', 'variables_get', 'math_change', 'dy_analog_oku', 'dy_harita', 'dy_analog_cubuk', 'dy_dugme_basili', 'dy_dugme_deger', 'dy_dugme_bekle', 'dy_dugme_yaz', 'dy_degisken_birlestir', 'dy_degisken_sayi_metin', 'dy_degisken_zaman', 'dy_lcd_yaz', 'dy_lcd_temizle', 'dy_ses_cal', 'dy_ses_sustur', 'dy_servo_yaz', 'dy_mesafe_oku', 'dy_rastgele']);
  const kategoriler = new Map(TOOLBOX.contents.map(c => [c.name, (c.contents ?? []).map(x => x.type)]));
  tamam('araç kutusunda Rastgele kategorisi + dy_rastgele', kategoriler.get('Rastgele')?.includes('dy_rastgele'), [...kategoriler.keys()].join(','));
  for (const id of IDLER) {
    const d = ders(id), a = d.adimlar ?? [];
    const sorun = [];
    tamam(`${id}: alanlar (modul 5, sure, html, sahne)`, d.modul === 5 && d.sure > 0 && d.html && d.sahne?.parcalar?.length === 2 && typeof d.girdi === 'function' && typeof d.kontrol === 'function');
    tamam(`${id}: adım sayısı 5-7`, a.length >= 5 && a.length <= 7, String(a.length));
    a.forEach((s, i) => {
      if (!s.baslik || !s.html) sorun.push(`#${i} baslik/html`);
      for (const c of [].concat(s.bitti ?? [])) {
        if (c.blok && !TIP.has(c.blok)) sorun.push(`#${i} bilinmeyen blok ${c.blok}`);
        if (c.icinde && !TIP.has(c.icinde)) sorun.push(`#${i} bilinmeyen icinde ${c.icinde}`);
      }
      const v = s.vurgu;
      if (v?.kategori && !kategoriler.has(v.kategori)) sorun.push(`#${i} geçersiz kategori ${v.kategori}`);
      if (v?.blok && !TIP.has(v.blok)) sorun.push(`#${i} bilinmeyen vurgu.blok ${v.blok}`);
      if (v?.kategori && v?.blok && kategoriler.has(v.kategori) && !kategoriler.get(v.kategori).includes(v.blok)) sorun.push(`#${i} ${v.blok} ${v.kategori} kategorisinde yok`);
      if (v?.parca != null && !(v.parca >= 0 && v.parca < d.sahne.parcalar.length)) sorun.push(`#${i} parca sınır dışı`);
    });
    tamam(`${id}: adımlar geçerli (blok tipleri, kategori, parça)`, !sorun.length, sorun.join('; '));
    tamam(`${id}: son adım basari`, JSON.stringify(a.at(-1)?.bitti ?? null).includes('"basari":true'));
    const c = d.gorevler ?? [];
    tamam(`${id}: gorevler = temel + düzenle görevleri`, c.filter(g => g.tip === 'duzenle').length === 3 && c.filter(g => g.tip === 'kod').length >= 3 && c.filter(g => g.tip === 'kod').length <= 4 && c.filter(g => g.tip === 'soru').length >= 3 && c.filter(g => g.tip === 'soru').length <= 4);
    tamam(`${id}: sesli yüklendi`, Array.isArray(d.sesli) && d.sesli.length === ICERIK[id].sesli.length);
  }

  // ───────────── (b) C++ çözümü ─────────────
  console.log('\n# (b) C++ çözümü');
  for (const id of IDLER) {
    const d = ders(id);
    const r = await kos(d, COZUM[id]);
    tamam(`${id} çözüm`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
    const b = await kos(d, BOS);
    tamam(`${id} boş program reddedilir`, b.sonuc?.ok === false && !!b.sonuc.mesaj, b.hata ?? b.sonuc?.mesaj);
  }
  // yanlış programlar yakalanır
  {
    const t = ders('lcd-termometre'), z = ders('elektronik-zar');
    const ham = COZUM['lcd-termometre'].replace('float sicaklik = ham * 50.0 / 4095.0;', 'float sicaklik = ham;');
    tamam('termometre: dönüşümsüz (ham değer) program reddedilir', (await kos(t, ham)).sonuc?.ok === false);
    const uyarisiz = COZUM['lcd-termometre'].replace('sicaklik > 30', 'sicaklik > 99');
    tamam('termometre: uyarısız program reddedilir', (await kos(t, uyarisiz)).sonuc?.ok === false);
    const tamsayiBolme = COZUM['lcd-termometre'].replace('float sicaklik = ham * 50.0 / 4095.0;', 'float sicaklik = ham * 50 / 4095;').replace('lcd.print(sicaklik, 1)', 'lcd.print(sicaklik, 1)');
    tamam('termometre: tamsayı bölmeli çözüm de ±1 °C içinde kabul edilir', (await kos(t, tamsayiBolme)).sonuc?.ok === true);
    const sabit = COZUM['elektronik-zar'].replace('random(1, 7)', '3');
    tamam('zar: hep aynı sayı reddedilir', (await kos(z, sabit)).sonuc?.ok === false);
    const animasyonsuz = COZUM['elektronik-zar'].replace('i < 10', 'i < 1');
    tamam('zar: animasyonsuz program reddedilir', (await kos(z, animasyonsuz)).sonuc?.ok === false);
    const altiYok = COZUM['elektronik-zar'].replace('random(1, 7)', 'random(1, 6)');
    const altiR = await kos(z, altiYok);
    tamam('zar: random(1, 6) (6 hiç gelmez) reddedilir', altiR.sonuc?.ok === false, altiR.sonuc?.mesaj);
    const sifirli = COZUM['elektronik-zar'].replace('random(1, 7)', 'random(0, 7)');
    tamam('zar: random(0, 7) (0 görünür) reddedilir', (await kos(z, sifirli)).sonuc?.ok === false);
    const surekli = COZUM['elektronik-zar'].replace('if (digitalRead(DUGME) == HIGH) {', 'if (true) {');
    tamam('zar: düğmeye bakmadan atan program reddedilir', (await kos(z, surekli)).sonuc?.ok === false);
  }

  // ───────────── (c) sesli + düzenle ─────────────
  console.log('\n# (c) sesli ve düzenle');
  for (const id of IDLER) {
    const d = ders(id), ic = ICERIK[id];
    const pSay = d.sahne.parcalar.length;
    tamam(`${id} sesli 8-10 parça`, ic.sesli.length >= 8 && ic.sesli.length <= 10, String(ic.sesli.length));
    tamam(`${id} ses dolu ve <=400`, ic.sesli.every(p => p.ses && p.ses.trim() && p.ses.length <= 400), String(Math.max(...ic.sesli.map(p => p.ses.length))));
    tamam(`${id} parca indeksleri geçerli`, ic.sesli.every(p => p.parca == null || (p.parca >= 0 && p.parca < pSay)));
    tamam(`${id} calistir var, son parça Görevler'e yönlendirir`, ic.sesli.some(p => p.calistir) && /Görevler/.test(ic.sesli.at(-1).ses));
    const kod = ic.sesli.map(p => p.yaz ?? '').join('');
    tamam(`${id} sesli kod = e2e çözümü`, kod === COZUM[id]);
    const r = await kos(d, kod);
    tamam(`${id} sesli kod -> kontrol`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
    tamam(`${id} düzenle 3 görev`, ic.duzenle.length === 3);
    for (const g of ic.duzenle) {
      const ad = `${id} / ${g.baslik}`;
      tamam(`${ad}: tip ve alanlar`, g.tip === 'duzenle' && g.metin && g.ipucu && g.kod && g.cozum && g.degistir?.length && typeof g.kontrol === 'function' && typeof g.girdi === 'function' && g.sure > 0);
      tamam(`${ad}: ara kod içinde (tek yerde)`, g.degistir.every(x => g.kod.includes(x.ara) && g.kod.split(x.ara).length === 2));
      tamam(`${ad}: cozum != kod`, g.cozum !== g.kod);
      const a = await kos(d, g.kod, g);
      tamam(`${ad}: kod derlenir`, !a.hata, a.hata);
      tamam(`${ad}: kod GEÇMEZ`, a.sonuc?.ok === false && !!a.sonuc.mesaj, a.sonuc?.mesaj);
      const b = await kos(d, g.cozum, g);
      tamam(`${ad}: cozum GEÇER`, b.sonuc?.ok === true, b.hata ?? b.sonuc?.mesaj);
      const e = await kos(d, BOS, g);
      tamam(`${ad}: boş program GEÇMEZ`, e.sonuc?.ok === false, e.hata ?? e.sonuc?.mesaj);
    }
  }

  // ───────────── (d) Görevler sekmesi ─────────────
  console.log('\n# (d) görevler');
  const HDR = `#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n`;
  const ZHDR = `#include <LiquidCrystal_I2C.h>\n\n#define DUGME D5\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n`;
  const ZSETUP = (b = 'Zar At') => `void setup() {\n  pinMode(DUGME, INPUT);\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("${b}");\n}\n\n`;
  const TSETUP = (b) => `void setup() {\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("${b}");\n}\n\n`;
  const REF = {
    'lcd-termometre': {
      'Ham değeri göster': HDR + TSETUP('Ham deger') + `void loop() {\n  lcd.setCursor(0, 1);\n  lcd.print(analogRead(A1));\n  lcd.print("    ");\n  delay(200);\n}\n`,
      'Soğuk uyarısı': HDR + TSETUP('Sicaklik') + `void loop() {\n  float sicaklik = analogRead(A1) * 50.0 / 4095.0;\n  lcd.setCursor(0, 1);\n  lcd.print(sicaklik, 1);\n  if (sicaklik < 10) {\n    lcd.print(" C SOGUK!   ");\n  } else {\n    lcd.print(" C          ");\n  }\n  delay(200);\n}\n`,
      'Üç durum': HDR + TSETUP('Sicaklik') + `void loop() {\n  float sicaklik = analogRead(A1) * 50.0 / 4095.0;\n  lcd.setCursor(0, 1);\n  lcd.print(sicaklik, 1);\n  if (sicaklik > 30) {\n    lcd.print(" C SICAK    ");\n  } else if (sicaklik < 10) {\n    lcd.print(" C SOGUK    ");\n  } else {\n    lcd.print(" C NORMAL   ");\n  }\n  delay(200);\n}\n`,
      'En yüksek sıcaklık': HDR + `float enYuksek = 0;\n\nvoid setup() {\n  lcd.init();\n  lcd.backlight();\n}\n\nvoid loop() {\n  float sicaklik = analogRead(A1) * 50.0 / 4095.0;\n  if (sicaklik > enYuksek) {\n    enYuksek = sicaklik;\n  }\n  lcd.setCursor(0, 0);\n  lcd.print("Simdi: ");\n  lcd.print(sicaklik, 1);\n  lcd.print(" C   ");\n  lcd.setCursor(0, 1);\n  lcd.print("Max: ");\n  lcd.print(enYuksek, 1);\n  lcd.print(" C   ");\n  delay(200);\n}\n`,
    },
    'elektronik-zar': {
      'Tek atış': ZHDR + ZSETUP() + `void loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    lcd.setCursor(0, 1);\n    lcd.print(random(1, 7));\n    delay(300);\n  }\n}\n`,
      'İki zar': ZHDR + ZSETUP() + `void loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    int a = random(1, 7);\n    int b = random(1, 7);\n    lcd.setCursor(0, 1);\n    lcd.print(a);\n    lcd.print("  ");\n    lcd.print(b);\n    delay(300);\n  }\n}\n`,
      'Atış sayacı': ZHDR + `int atis = 0;\n\n` + ZSETUP('Zar') + `void loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    atis++;\n    lcd.setCursor(0, 0);\n    lcd.print("Atis: ");\n    lcd.print(atis);\n    lcd.setCursor(0, 1);\n    lcd.print(random(1, 7));\n    delay(300);\n  }\n}\n`,
      'En iyi atış': ZHDR + `int enIyi = 0;\n\n` + ZSETUP('Zar') + `void loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    int zar = random(1, 7);\n    if (zar > enIyi) {\n      enIyi = zar;\n    }\n    lcd.setCursor(0, 0);\n    lcd.print("En iyi: ");\n    lcd.print(enIyi);\n    lcd.setCursor(0, 1);\n    lcd.print(zar);\n    delay(300);\n  }\n}\n`,
    },
  };
  // bilerek yanlış programlar (görev başlığı -> kod)
  const YANLIS = {
    'Soğuk uyarısı': REF['lcd-termometre']['Soğuk uyarısı'].replace('sicaklik < 10', 'sicaklik > 10'),
    'Üç durum': REF['lcd-termometre']['Üç durum'].replace('NORMAL', 'SICAK '),
    'En yüksek sıcaklık': REF['lcd-termometre']['En yüksek sıcaklık'].replace('if (sicaklik > enYuksek) {', 'if (true) {'),
    'Atış sayacı': REF['elektronik-zar']['Atış sayacı'].replace('    delay(300);\n', ''),
    'En iyi atış': REF['elektronik-zar']['En iyi atış'].replace('zar > enIyi', 'zar < enIyi || enIyi == 0'),
    'İki zar': REF['elektronik-zar']['İki zar'].replace('int b = random(1, 7);', 'int b = a;'),
  };
  for (const id of IDLER) {
    const d = ders(id), gs = d.gorevler;
    const kodlar = gs.filter(g => g.tip === 'kod'), sorular = gs.filter(g => g.tip === 'soru');
    tamam(`${id}: ${kodlar.length} kod görevi, ${sorular.length} soru`, kodlar.length >= 3 && kodlar.length <= 4 && sorular.length >= 3 && sorular.length <= 4);
    tamam(`${id}: karışık sıra`, gs.some((g, i) => i > 0 && g.tip !== gs[i - 1].tip) && gs[0].tip !== gs[1].tip);
    tamam(`${id}: doğru indeksler dağıtılmış`, new Set(sorular.map(s => s.dogru)).size >= 2);
    tamam(`${id}: kod görevi başlıkları benzersiz`, new Set(kodlar.map(g => g.baslik)).size === kodlar.length);
    for (const [i, s] of sorular.entries()) {
      const n = s.secenekler.length;
      tamam(`${id} soru${i + 1}: geçerli`, n >= 3 && n <= 4 && Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < n && new Set(s.secenekler.map(x => x.trim().toLowerCase())).size === n && typeof s.soru === 'string' && !!s.soru && !!s.aciklama);
    }
    for (const g of kodlar) {
      const ad = `${id} "${g.baslik}"`;
      tamam(`${ad}: alanlar`, g.baslik && g.metin && g.ipucu && g.sure > 0 && typeof g.girdi === 'function' && typeof g.kontrol === 'function');
      const ref = REF[id][g.baslik];
      tamam(`${ad}: referans çözüm var`, !!ref);
      if (!ref) continue;
      const a = await kos(d, ref, g);
      tamam(`${ad}: referans ok:true`, a.sonuc?.ok === true, a.hata ?? a.sonuc?.mesaj);
      const e = await kos(d, BOS, g);
      tamam(`${ad}: boş program ok:false`, e.sonuc?.ok === false && !!e.sonuc.mesaj, e.hata ?? e.sonuc?.mesaj);
      if (YANLIS[g.baslik]) {
        const w = await kos(d, YANLIS[g.baslik], g);
        tamam(`${ad}: yanlış çözüm ok:false`, w.sonuc?.ok === false, w.hata ?? w.sonuc?.mesaj);
      }
    }
  }

  // ───────────── (e) blok çözümü ve dy_rastgele ─────────────
  console.log('\n# (e) bloklar');
  const num = n => ({ type: 'math_number', fields: { NUM: n } });
  const txt = t => ({ type: 'text', fields: { TEXT: t } });
  const get = v => ({ type: 'variables_get', fields: { VAR: { id: v } } });
  const zincir = (...b) => { for (let i = 0; i < b.length - 1; i++) b[i].next = { block: b[i + 1] }; return b[0]; };
  const surekli = (...b) => ({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir(...b) } } });
  const bek = ms => ({ type: 'dy_bekle', inputs: { MS: { block: num(ms) } } });
  const lcdYaz = (satir, metin) => ({ type: 'dy_lcd_yaz', fields: { SATIR: satir }, inputs: { METIN: { block: metin } } });
  const birl = (a, b) => ({ type: 'dy_degisken_birlestir', inputs: { A: { block: a }, B: { block: b } } });
  const analog = p => ({ type: 'dy_analog_oku', fields: { PIN: p } });
  const harita = () => ({ type: 'dy_harita', inputs: { DEG: { block: analog('A1') }, GMIN: { block: num(0) }, GMAX: { block: num(4095) }, CMIN: { block: num(0) }, CMAX: { block: num(50) } } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const eger = (kosul, ...govde) => ({ type: 'controls_if', inputs: { IF0: { block: kosul }, DO0: { block: zincir(...govde) } } });
  const rastgele = (a, b) => ({ type: 'dy_rastgele', inputs: { A: { block: a }, B: { block: b } } });
  const dongu = (...govde) => ({ type: 'controls_for', fields: { VAR: { id: 'v1' } }, inputs: { FROM: { block: num(1) }, TO: { block: num(10) }, BY: { block: num(1) }, DO: { block: zincir(...govde) } } });

  const yukle = (bloklar, degiskenler = []) => {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: bloklar }, variables: degiskenler.map(([id, name]) => ({ id, name })) }, ws);
    return ws;
  };
  const uret = (bloklar, degiskenler = []) => {
    const ws = yukle(bloklar, degiskenler);
    const js = generator.workspaceToCode(ws), cpp = arduinoKod(ws);
    ws.dispose(); return { js, cpp };
  };

  // dy_rastgele: JS üretimi
  {
    const { js } = uret([lcdYaz('1', rastgele(num(1), num(6)))]);
    tamam('dy_rastgele JS: Math.floor(Math.random() * (b - a + 1)) + a', /Math\.floor\(Math\.random\(\) \* \(b - a \+ 1\)\) \+ a/.test(js), js);
    tohumla(11);
    const ifade = /\(\(a, b\) => [^\n]*\)\(1, 6\)/.exec(js)?.[0];
    tamam('dy_rastgele JS: ifade bulundu (1, 6)', !!ifade, js);
    const gor = new Set(); let aralik = true;
    const fn = new Function(`return ${ifade}`);
    for (let i = 0; i < 3000; i++) { const x = fn(); gor.add(x); if (!Number.isInteger(x) || x < 1 || x > 6) aralik = false; }
    tamam('dy_rastgele JS: 1-6 tam sayı, hepsi görülür', aralik && gor.size === 6, [...gor].sort().join());
    const k = uret([lcdYaz('0', rastgele(num(3), num(5)))]).js;
    const fn2 = new Function(`return ${/\(\(a, b\) => [^\n]*\)\(3, 5\)/.exec(k)?.[0]}`);
    const g2 = new Set(); for (let i = 0; i < 2000; i++) g2.add(fn2());
    tamam('dy_rastgele JS: 3-5 arası ikisi dahil', [...g2].sort().join() === '3,4,5', [...g2].join());
    const bos = uret([lcdYaz('0', { type: 'dy_rastgele' })]).js;
    tamam('dy_rastgele JS: boş girişte varsayılan 1-6', /\)\(1, 6\)/.test(bos), bos);
  }
  // dy_rastgele: C++ üretimi (arduinoKod)
  {
    const { cpp } = uret([lcdYaz('1', rastgele(num(1), num(6)))]);
    tamam('dy_rastgele C++: random(1, 7)', /lcd\.print\(random\(1, 7\)\);/.test(cpp), cpp);
    const c2 = uret([lcdYaz('1', rastgele(num(2), num(12)))]).cpp;
    tamam('dy_rastgele C++: sabit sınır random(2, 13)', /random\(2, 13\)/.test(c2), c2);
    const c3 = uret([{ type: 'variables_set', fields: { VAR: { id: 'v1' } }, inputs: { VALUE: { block: num(8) } } }, lcdYaz('1', rastgele(num(1), get('v1')))], [['v1', 'n']]).cpp;
    tamam('dy_rastgele C++: değişkenli üst sınır random(1, n + 1)', /random\(1, n \+ 1\)/.test(c3), c3);
    const c4 = uret([lcdYaz('1', rastgele(num(1), { type: 'math_arithmetic', fields: { OP: 'ADD' }, inputs: { A: { block: num(2) }, B: { block: num(3) } } }))]).cpp;
    tamam('dy_rastgele C++: ifadeli üst sınır random(1, 2 + 3 + 1)', /random\(1, 2 \+ 3 \+ 1\)/.test(c4), c4);
    const c5 = uret([lcdYaz('1', { type: 'dy_rastgele' })]).cpp;
    tamam('dy_rastgele C++: boş girişte random(1, 7)', /random\(1, 7\)/.test(c5), c5);
    // üretilen C++ gerçekten derlenip çalışır ve 1..6 verir
    tohumla(5);
    const sim = new Sim(); sim.cihaz = {};
    const d = cppDerle(c3.replace(/n \+ 1/, 'n + 1'), sim);
    tamam('dy_rastgele C++: üretilen kod derlenir', !d.hata, d.hata?.mesaj);
  }

  // Blok çözümleri: 5.3 ve 5.4
  const PAD = ' C          ';
  const TERMO_BLOK = [
    zincir(lcdYaz('0', txt('Sicaklik')),
      surekli(
        { type: 'controls_if', extraState: { hasElse: true }, inputs: {
          IF0: { block: cmp('GT', harita(), num(30)) },
          DO0: { block: lcdYaz('1', birl(harita(), txt(' C SICAK!   '))) },
          ELSE: { block: lcdYaz('1', birl(harita(), txt(PAD))) } } },
        bek(200))),
  ];
  const ZAR_BLOK = [
    zincir(lcdYaz('0', txt('Zar At')),
      surekli(
        eger({ type: 'dy_dugme_basili', fields: { PIN: 'D5' } },
          dongu(lcdYaz('1', rastgele(num(1), num(6))), bek(70)),
          { type: 'dy_dugme_bekle', fields: { PIN: 'D5', DURUM: '0' } }))),
  ];
  const BLOKLAR = { 'lcd-termometre': { bloklar: TERMO_BLOK, vars: [] }, 'elektronik-zar': { bloklar: ZAR_BLOK, vars: [['v1', 'i']] } };
  for (const id of IDLER) {
    const d = ders(id), { bloklar, vars } = BLOKLAR[id];
    const { js, cpp } = uret(bloklar, vars);
    const r = await kos(d, { js });
    tamam(`${id}: BLOK çözümü (JS) -> kontrol ok`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj); if (r.sonuc?.ok === false && process.env.DEBUG) console.log(JSON.stringify(r.sim.cihaz.zar.map(p => ({ a: p.a, b: p.b, s: p.seri.map(x => x.n + "@" + x.t).join(" ") })), null, 1), js);
    // blokların ürettiği C++ de aynı dersi geçmeli
    const rc = await kos(d, cpp);
    tamam(`${id}: bloktan üretilen C++ -> kontrol ok`, rc.sonuc?.ok === true, rc.hata ?? rc.sonuc?.mesaj + '\n' + cpp);
    console.log('  --- ' + id + ' blok C++ ---\n' + cpp.split('\n').map(s => '  | ' + s).join('\n'));
    // boş çalışma alanı
    const e = await kos(d, { js: '' });
    tamam(`${id}: boş blok programı reddedilir`, e.sonuc?.ok === false, e.hata ?? e.sonuc?.mesaj);
  }
  // Adımlardaki bitti koşulları gerçek blok programıyla sağlanıyor mu?
  {
    const sagla = (ws, c) => {
      if (Array.isArray(c)) return c.every(x => sagla(ws, x));
      if (c.basari || c.calistir) return true;
      const atasi = (b, tur) => { for (let p = b.getSurroundParent(); p; p = p.getSurroundParent()) if (p.type === tur) return true; return false; };
      const uyan = ws.getAllBlocks(false).filter(b => b.type === c.blok && (!c.alan || Object.entries(c.alan).every(([k, v]) => String(b.getFieldValue(k)) === String(v))) && (!c.icinde || atasi(b, c.icinde)));
      return uyan.length >= (c.adet ?? 1);
    };
    for (const id of IDLER) {
      const ws = yukle(BLOKLAR[id].bloklar, BLOKLAR[id].vars);
      const bitmeyen = ders(id).adimlar.map((a, i) => [a, i]).filter(([a]) => a.bitti && !sagla(ws, a.bitti)).map(([, i]) => i + 1);
      tamam(`${id}: tüm adım koşulları çözüm bloklarıyla sağlanır`, !bitmeyen.length, 'sağlanmayan adımlar: ' + bitmeyen.join());
      ws.dispose();
    }
  }
} finally {
  Math.random = GERCEK_RANDOM;
  await vite.close();
}
console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
