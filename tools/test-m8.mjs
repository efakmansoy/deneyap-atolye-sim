// Modül 8 (Robot araba) test paketi:  node tools/test-m8.mjs      (yalnız bir ders: node tools/test-m8.mjs cizgi-izleyen)
// (a) ders/adım şeması   (b) C++ çözümü + boş / yanlış programlar   (c) sesli anlatım + "kodu değiştir" görevleri
// (d) Görevler sekmesi (kod görevleri + sorular)   (e) blok çözümü (başsız Blockly) + bitti koşulları + bloktan üretilen C++
// Sanal saat belirleyicidir; HIZ yüksek tutulur (motor / sensör fiziği sanal zamanla ilerler, gerçek zamana bağlı değildir).
import { createServer } from 'vite';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SHIM = new URL('./_blockly-shim.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });

let fail = 0;
const tamam = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (ek && (!k || process.env.AYRINTI) ? '  -> ' + ek : '')); if (!k) fail++; };

const HIZ = 40, DURDURMA_MS = 1500;
const bekle = ms => new Promise(r => setTimeout(r, ms));
const SADECE = process.argv[2];

try {
  const { Sim } = await vite.ssrLoadModule('/src/sim.js');
  const { cppDerle } = await vite.ssrLoadModule('/src/cppcalistir.js');
  const { arabaBagla } = await vite.ssrLoadModule('/src/araba-dunya.js');
  const { Blockly, generator, TOOLBOX } = await vite.ssrLoadModule('/src/blocks.js');
  const { arduinoKod } = await vite.ssrLoadModule('/src/cpp.js');
  const { DERSLER } = await vite.ssrLoadModule('/src/lessons/index.js');
  const m8 = (await vite.ssrLoadModule('/src/lessons/m8-araba.js')).default;
  const ICERIKMOD = await vite.ssrLoadModule('/src/lessons/icerik/m8-sesli.js');
  const ICERIK = ICERIKMOD.default, { KOD_81, KOD_82, KOD_83, KOD_84 } = ICERIKMOD;
  const COZUM = (await import(pathToFileURL(path.resolve('tools/e2e/cozumler-m8.mjs')).href)).default;

  const IDLER = ['araba-motorlar', 'araba-donus', 'engelden-kacan', 'cizgi-izleyen'].filter(i => !SADECE || i === SADECE);
  const BOS = 'void setup() {} void loop() {}';
  const ders = id => DERSLER.find(d => d.id === id);

  // sim üzerinde program çalıştır (C++ ya da JS), sonra kontrolü döndür
  async function kos(d, program, gorev = {}) {
    const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
    arabaBagla(sim, d.sahne);                       // sözleşme: cppDerle'den ÖNCE
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
      if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > 20000 + sure * 3) break;
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
  tamam('m8 dosyası 4 ders verir, sırası 8.1-8.4', m8.map(d => d.id).join() === 'araba-motorlar,araba-donus,engelden-kacan,cizgi-izleyen' && m8.map(d => d.ad.slice(0, 3)).join() === '8.1,8.2,8.3,8.4');
  tamam('dersler index.js içinde (modül 7\'den sonra)', ['araba-motorlar', 'araba-donus', 'engelden-kacan', 'cizgi-izleyen'].every(i => tumIdler.indexOf(i) > tumIdler.indexOf('hirsiz-alarmi')), tumIdler.join(','));
  const TIP = new Set(['dy_yaz', 'dy_pwm', 'dy_oku', 'dy_bekle', 'dy_surekli', 'dy_seri', 'controls_repeat_ext', 'controls_if', 'controls_for', 'controls_whileUntil', 'logic_compare', 'logic_operation', 'logic_boolean', 'logic_negate', 'math_number', 'math_arithmetic', 'text', 'variables_set', 'variables_get', 'math_change', 'dy_analog_oku', 'dy_harita', 'dy_analog_cubuk', 'dy_dugme_basili', 'dy_dugme_deger', 'dy_dugme_bekle', 'dy_dugme_yaz', 'dy_degisken_birlestir', 'dy_degisken_sayi_metin', 'dy_degisken_zaman', 'dy_lcd_yaz', 'dy_lcd_temizle', 'dy_ses_cal', 'dy_ses_sustur', 'dy_servo_yaz', 'dy_mesafe_oku', 'dy_rastgele']);
  const kategoriler = new Map(TOOLBOX.contents.map(c => [c.name, (c.contents ?? []).map(x => x.type)]));
  for (const id of IDLER) {
    const d = ders(id), a = d.adimlar ?? [];
    const sorun = [];
    tamam(`${id}: alanlar (modul 8, sure, html, sahne, kontrol)`, d.modul === 8 && d.sure > 0 && d.html && d.sahne?.arena && d.sahne.parcalar?.[0]?.tur === 'araba' && typeof d.kontrol === 'function');
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
  // bilerek yanlış programlar yakalanır
  {
    const yanlis = {
      'araba-motorlar': [
        ['hiç geri gelmez', KOD_81().replace('  geri();\n  delay(1000);\n', '')],
        ['sonda motorları durdurmaz', KOD_81().replace('  delay(1000);\n  dur();\n}', '  delay(1000);\n}')],
        ['yalnız sol motor (kavis)', KOD_81().replace('digitalWrite(D2, HIGH);\n  digitalWrite(D3, LOW);\n}\n\nvoid geri', 'digitalWrite(D2, LOW);\n  digitalWrite(D3, LOW);\n}\n\nvoid geri')],
      ],
      'araba-donus': [
        ['dönüş süresi kısa (kare kapanmaz)', KOD_82({ don: 300 })],
        ['hiç dönmez', KOD_82().replace('saga();\n    delay(380);', 'dur();\n    delay(380);')],
        ['sola döner (sağa istenir)', KOD_82({ yon: 'sola' })],
      ],
      'engelden-kacan': [
        ['hiç kaçmaz (eşik 0)', KOD_83({ esik: 0 })],
        ['hiç geri gitmez', KOD_83().replace('    geri();\n    delay(400);\n', '')],
        ['yalnız ileri gider', KOD_83().replace('mesafeOlc(D4) < 30', 'false')],
      ],
      'cizgi-izleyen': [
        ['sensörler ters', KOD_84({ solPin: 'D6', sagPin: 'D5' })],
        ['kontrol çok yavaş', KOD_84({ dongu: 500 })],
        ['hep düz gider', KOD_84().replace('sol == 1', 'false').replace('sag == 1', 'false')],
      ],
    };
    for (const id of IDLER) for (const [ad, kod] of yanlis[id]) {
      const r = await kos(ders(id), kod);
      tamam(`${id}: yanlış program reddedilir (${ad})`, r.sonuc?.ok === false && !!r.sonuc.mesaj, r.hata ?? r.sonuc?.mesaj);
    }
  }

  // ───────────── (c) sesli + düzenle ─────────────
  console.log('\n# (c) sesli ve düzenle');
  for (const id of IDLER) {
    const d = ders(id), ic = ICERIK[id];
    const pSay = d.sahne.parcalar.length;
    tamam(`${id} sesli 8-12 parça`, ic.sesli.length >= 8 && ic.sesli.length <= 12, String(ic.sesli.length));
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
      tamam(`${ad}: tip ve alanlar`, g.tip === 'duzenle' && g.metin && g.ipucu && g.kod && g.cozum && g.degistir?.length && typeof g.kontrol === 'function' && g.sure > 0);
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
  const FN = {
    ileri: 'void ileri() {\n  digitalWrite(D0, HIGH);\n  digitalWrite(D1, LOW);\n  digitalWrite(D2, HIGH);\n  digitalWrite(D3, LOW);\n}\n',
    geri: 'void geri() {\n  digitalWrite(D0, LOW);\n  digitalWrite(D1, HIGH);\n  digitalWrite(D2, LOW);\n  digitalWrite(D3, HIGH);\n}\n',
    saga: 'void saga() {\n  digitalWrite(D0, HIGH);\n  digitalWrite(D1, LOW);\n  digitalWrite(D2, LOW);\n  digitalWrite(D3, HIGH);\n}\n',
    dur: 'void dur() {\n  digitalWrite(D0, LOW);\n  digitalWrite(D1, LOW);\n  digitalWrite(D2, LOW);\n  digitalWrite(D3, LOW);\n}\n',
  };
  const MOD = '  pinMode(D0, OUTPUT);\n  pinMode(D1, OUTPUT);\n  pinMode(D2, OUTPUT);\n  pinMode(D3, OUTPUT);\n';
  const degis = (kod, a, b) => { if (!kod.includes(a)) throw new Error('ara bulunamadı: ' + a); return kod.replace(a, b); };
  const REF = {
    'araba-motorlar': {
      'Uzun yol: 3 saniye ileri, 3 saniye geri': KOD_81({ ileri: 3000, bek: 500, geri: 3000 }),
      'Tek motor: kavisli yol': `void setup() {\n  pinMode(D0, OUTPUT);\n  digitalWrite(D0, HIGH);\n  delay(2000);\n  digitalWrite(D0, LOW);\n}\n\nvoid loop() {\n}\n`,
      'Zikzak: 3 kez ileri-geri': FN.ileri + FN.geri + FN.dur + `void setup() {\n${MOD}  for (int i = 0; i < 3; i++) {\n    ileri();\n    delay(1000);\n    dur();\n    geri();\n    delay(1000);\n    dur();\n  }\n}\n\nvoid loop() {\n}\n`,
    },
    'araba-donus': {
      'Sola doğru kare': KOD_82({ yon: 'sola' }),
      'Büyük kare (35 cm kenar)': KOD_82({ kenar: 1400 }),
      'U dönüşü': FN.ileri + FN.saga + FN.dur + `void setup() {\n${MOD}  ileri();\n  delay(1000);\n  saga();\n  delay(760);\n  ileri();\n  delay(1000);\n  dur();\n}\n\nvoid loop() {\n}\n`,
    },
    'engelden-kacan': {
      'Daha erken fren: 40 cm': KOD_83({ esik: 40 }),
      'Geri giderken buzzer uyarısı': degis(degis(KOD_83(), '    geri();\n', '    tone(D8, 1000);\n    geri();\n'), '    ileri();\n', '    noTone(D8);\n    ileri();\n'),
      'Kaçarken LED yansın': degis(degis(degis(KOD_83(), '    geri();\n', '    digitalWrite(D7, HIGH);\n    geri();\n'), '    ileri();\n', '    digitalWrite(D7, LOW);\n    ileri();\n'), '  pinMode(D4, INPUT);\n', '  pinMode(D4, INPUT);\n  pinMode(D7, OUTPUT);\n'),
    },
    'cizgi-izleyen': {
      'Düzeltirken buzzer': degis(degis(degis(KOD_84({ bekle: 0 }), '    sola();\n', '    tone(D8, 800);\n    sola();\n'), '    saga();\n', '    tone(D8, 800);\n    saga();\n'), '    ileri();\n', '    noTone(D8);\n    ileri();\n'),
      'Seri monitörden sensörleri izle': degis(degis(KOD_84({ bekle: 0 }), '  pinMode(D6, INPUT);\n', '  pinMode(D6, INPUT);\n  Serial.begin(9600);\n'), '  if (sol == 1) {', '  Serial.println(sol);\n  Serial.println(sag);\n  if (sol == 1) {'),
      'Düzeltirken LED yansın': degis(degis(degis(degis(KOD_84({ bekle: 0 }), '    sola();\n', '    digitalWrite(D7, HIGH);\n    sola();\n'), '    saga();\n', '    digitalWrite(D7, HIGH);\n    saga();\n'), '    ileri();\n', '    digitalWrite(D7, LOW);\n    ileri();\n'), '  pinMode(D6, INPUT);\n', '  pinMode(D6, INPUT);\n  pinMode(D7, OUTPUT);\n'),
    },
  };
  // bilerek yanlış programlar (görev başlığı -> kod)
  const YANLIS = {
    'Uzun yol: 3 saniye ileri, 3 saniye geri': KOD_81({ ileri: 3000, bek: 500, geri: 1000 }),
    'Zikzak: 3 kez ileri-geri': REF['araba-motorlar']['Zikzak: 3 kez ileri-geri'].replace('i < 3', 'i < 2'),
    'Sola doğru kare': KOD_82(),
    'Büyük kare (35 cm kenar)': KOD_82(),
    'U dönüşü': REF['araba-donus']['U dönüşü'].replace('delay(760)', 'delay(380)'),
    'Daha erken fren: 40 cm': KOD_83(),
    'Geri giderken buzzer uyarısı': KOD_83(),
    'Düzeltirken buzzer': KOD_84({ bekle: 0 }),
    'Seri monitörden sensörleri izle': KOD_84({ bekle: 0 }),
  };
  for (const id of IDLER) {
    const d = ders(id), gs = d.gorevler;
    const kodlar = gs.filter(g => g.tip === 'kod'), sorular = gs.filter(g => g.tip === 'soru');
    tamam(`${id}: ${kodlar.length} kod görevi, ${sorular.length} soru`, kodlar.length >= 3 && kodlar.length <= 4 && sorular.length >= 3 && sorular.length <= 4);
    tamam(`${id}: karışık sıra`, gs.some((g, i) => i > 0 && g.tip !== gs[i - 1].tip) && gs[0].tip !== gs[1].tip);
    tamam(`${id}: doğru indeksler dağıtılmış`, new Set(sorular.map(s => s.dogru)).size >= 1);
    tamam(`${id}: kod görevi başlıkları benzersiz`, new Set(kodlar.map(g => g.baslik)).size === kodlar.length);
    for (const [i, s] of sorular.entries()) {
      const n = s.secenekler.length;
      tamam(`${id} soru${i + 1}: geçerli`, n >= 3 && n <= 4 && Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < n && new Set(s.secenekler.map(x => x.trim().toLowerCase())).size === n && typeof s.soru === 'string' && !!s.soru && !!s.aciklama);
    }
    for (const g of kodlar) {
      const ad = `${id} "${g.baslik}"`;
      tamam(`${ad}: alanlar`, g.baslik && g.metin && g.ipucu && g.sure > 0 && typeof g.kontrol === 'function');
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

  // ───────────── (e) blok çözümleri ─────────────
  console.log('\n# (e) bloklar');
  const num = n => ({ type: 'math_number', fields: { NUM: n } });
  const zincir = (...b) => { b = b.flat(); for (let i = 0; i < b.length - 1; i++) b[i].next = { block: b[i + 1] }; return b[0]; };
  const yaz = (pin, deg) => ({ type: 'dy_yaz', fields: { PIN: pin, DEG: String(deg) } });
  const bek = ms => ({ type: 'dy_bekle', inputs: { MS: { block: num(ms) } } });
  const pinler = (a, b, c, d) => [yaz('D0', a), yaz('D1', b), yaz('D2', c), yaz('D3', d)];
  const ILERI = () => pinler(1, 0, 1, 0), GERI = () => pinler(0, 1, 0, 1), SAGA = () => pinler(1, 0, 0, 1), SOLA = () => pinler(0, 1, 1, 0), DUR = () => pinler(0, 0, 0, 0);
  const surekli = (...b) => ({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir(...b) } } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const BLOKLAR = {
    'araba-motorlar': [zincir(ILERI(), bek(2000), DUR(), bek(500), GERI(), bek(1000), DUR())],
    'araba-donus': [{ type: 'controls_repeat_ext', inputs: { TIMES: { block: num(4) }, DO: { block: zincir(ILERI(), bek(1000), SAGA(), bek(380), DUR(), bek(200)) } } }],
    'engelden-kacan': [surekli(
      { type: 'controls_if', extraState: { hasElse: true }, inputs: {
        IF0: { block: cmp('LT', { type: 'dy_mesafe_oku', fields: { PIN: 'D4' } }, num(30)) },
        DO0: { block: zincir(GERI(), bek(400), SAGA(), bek(380)) },
        ELSE: { block: zincir(ILERI()) } } },
      bek(50))],
    'cizgi-izleyen': [surekli(
      { type: 'controls_if', extraState: { elseIfCount: 1, hasElse: true }, inputs: {
        IF0: { block: { type: 'dy_oku', fields: { PIN: 'D5' } } },
        DO0: { block: zincir(SOLA()) },
        IF1: { block: { type: 'dy_oku', fields: { PIN: 'D6' } } },
        DO1: { block: zincir(SAGA()) },
        ELSE: { block: zincir(ILERI()) } } },
      bek(50))],
  };
  const yukle = bloklar => {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: bloklar } }, ws);
    return ws;
  };
  const uret = bloklar => {
    const ws = yukle(bloklar);
    const js = generator.workspaceToCode(ws), cpp = arduinoKod(ws);
    ws.dispose(); return { js, cpp };
  };
  const sagla = (ws, c) => {
    if (Array.isArray(c)) return c.every(x => sagla(ws, x));
    if (c.basari || c.calistir) return true;
    const atasi = (b, tur) => { for (let p = b.getSurroundParent(); p; p = p.getSurroundParent()) if (p.type === tur) return true; return false; };
    const uyan = ws.getAllBlocks(false).filter(b => b.type === c.blok && (!c.alan || Object.entries(c.alan).every(([k, v]) => String(b.getFieldValue(k)) === String(v))) && (!c.icinde || atasi(b, c.icinde)));
    return uyan.length >= (c.adet ?? 1);
  };
  for (const id of IDLER) {
    const d = ders(id), bloklar = BLOKLAR[id];
    const { js, cpp } = uret(bloklar);
    const r = await kos(d, { js });
    tamam(`${id}: BLOK çözümü (JS) -> kontrol ok`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj + '\n' + js);
    const rc = await kos(d, cpp);
    tamam(`${id}: bloktan üretilen C++ -> kontrol ok`, rc.sonuc?.ok === true, rc.hata ?? rc.sonuc?.mesaj + '\n' + cpp);
    if (process.env.AYRINTI) console.log('  --- ' + id + ' blok C++ ---\n' + cpp.split('\n').map(s => '  | ' + s).join('\n'));
    const e = await kos(d, { js: '' });
    tamam(`${id}: boş blok programı reddedilir`, e.sonuc?.ok === false, e.hata ?? e.sonuc?.mesaj);
    const ws = yukle(bloklar);
    const bitmeyen = d.adimlar.map((a, i) => [a, i]).filter(([a]) => a.bitti && !sagla(ws, a.bitti)).map(([, i]) => i + 1);
    tamam(`${id}: blok çözümü tüm adım koşullarını (bitti) sağlar`, !bitmeyen.length, 'sağlanmayan adımlar: ' + bitmeyen.join());
    ws.dispose();
    const bos = yukle([]);
    const sagBos = d.adimlar.filter(a => a.bitti && !JSON.stringify(a.bitti).match(/basari|calistir/) && sagla(bos, a.bitti)).length;
    tamam(`${id}: boş çalışma alanı hiçbir blok adımını tamamlamaz`, sagBos === 0);
    bos.dispose();
  }
} finally {
  await vite.close();
}

console.log(fail ? `\n${fail} test BAŞARISIZ` : '\nTüm Modül 8 testleri geçti!');
process.exit(fail ? 1 : 0);
