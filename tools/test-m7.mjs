// Modül 7 (Doğa ve güvenlik) test paketi: node tools/test-m7.mjs
// (a) şema/yükleme  (b) C++ çözümü + boş program  (c) sesli anlatım (birleşim = çözüm) ve "kodu değiştir" görevleri
// (d) kod görevleri (doğru/yanlış referans çözümler) ve sorular  (e) BLOK çözümü (başsız Blockly)
// Parçalar (nem, pompa, pir, gaz, tuş takımı) henüz olmasa bile çalışır: senaryolar doğrudan sim.analog / sim.girdi üzerine yazılır.
import { createServer } from 'vite';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import BlocklyCekirdek from './_blockly-shim.mjs';

const yol = u => new URL(u, import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const SHIM = yol('./_blockly-shim.mjs');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });

const HIZ = 6;            // sabit sanal hız (sanal ms / gerçek ms)
const DURDURMA_MS = 1300; // sim.t bu kadar gerçek ms değişmezse program bitti sayılır
const EN_FAZLA = 3;       // aynı anda koşan senaryo sayısı
const BOS = 'void setup() {} void loop() {}';
const IDLER = ['saksi-sulama', 'pir-lamba', 'hava-istasyonu', 'gaz-alarmi', 'sifreli-kasa'];
const bekle = ms => new Promise(r => setTimeout(r, ms));

let fail = 0;
const satirlar = [];
const rapor = (ad, k, ek = '') => { satirlar.push((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };

try {
  const { Blockly, generator, TOOLBOX } = await vite.ssrLoadModule('/src/blocks.js');
  const { Sim, DurdurSinyali } = await vite.ssrLoadModule('/src/sim.js');
  const { cppDerle } = await vite.ssrLoadModule('/src/cppcalistir.js');
  const { DERSLER } = await vite.ssrLoadModule('/src/lessons/index.js');
  const ICERIK = (await vite.ssrLoadModule('/src/lessons/icerik/m7-sesli.js')).default;
  const COZUM = (await import(pathToFileURL(yol('./e2e/cozumler-m7.mjs')).href)).default;
  const KOD = (await vite.ssrLoadModule('/src/lessons/icerik/m7-sesli.js')).KOD;

  const sessiz = e => e?.constructor?.name === 'DurdurSinyali';
  // Sanal saatin deterministik kalması için sim.tick() kısa tutulur (bkz. test-ek-m4b.mjs)
  const yeniSim = () => {
    const sim = new Sim(); sim.hiz = HIZ; sim.cihaz = {};
    let n = 0;
    sim.tick = async () => {
      if (sim.iptal) throw new DurdurSinyali();
      if (++n % 64 === 0) await sim.macro(); else await Promise.resolve();
      if (sim.iptal) throw new DurdurSinyali();
    };
    return sim;
  };
  async function kos(ders, kod) {
    const sim = yeniSim();
    const d = cppDerle(kod, sim);
    if (d.hata) return { hata: d.hata.mesaj };
    const hatalar = [];
    const yut = e => { if (!sessiz(e)) hatalar.push(e); };
    const girdi = ders.girdi ? ders.girdi(sim).catch(yut) : Promise.resolve();
    const prog = d.calistir().catch(yut);
    let son = -1, sonDegisim = Date.now(); const t0 = Date.now();
    while (sim.t < ders.sure && !hatalar.length) {
      await bekle(5);
      if (sim.t !== son) { son = sim.t; sonDegisim = Date.now(); }
      if (Date.now() - sonDegisim > DURDURMA_MS || Date.now() - t0 > (ders.sure / HIZ) * 4 + 5000) break;
    }
    sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
    await Promise.all([girdi, prog]);
    if (hatalar.length) return { hata: String(hatalar[0]) };
    return { sonuc: ders.kontrol(sim) };
  }
  async function kosJs(ders, js) {
    const sim = yeniSim();
    const hatalar = [];
    const yut = e => { if (!sessiz(e)) hatalar.push(e); };
    const girdi = ders.girdi ? ders.girdi(sim).catch(yut) : Promise.resolve();
    const prog = new Function('sim', `return (async () => {\n${js}\n})();`)(sim).catch(yut);
    const bitir = sim.bekle(ders.sure).catch(() => {});
    await Promise.race([prog, bitir]);
    sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
    await Promise.all([girdi, prog]);
    if (hatalar.length) return { hata: String(hatalar[0]) };
    return { sonuc: ders.kontrol(sim) };
  }

  const dersOf = id => DERSLER.find(d => d.id === id);
  const gorevler = id => dersOf(id).gorevler;

  // ───────── (a) Yükleme ve şema ─────────
  const BLOKLAR = new Set(Object.keys(BlocklyCekirdek.Blocks));
  const KATEGORILER = new Set(TOOLBOX.contents.map(c => c.name));
  const PARCA_TURLERI = new Set(['nem', 'pompa', 'pir', 'gaz', 'tustakimi', 'led', 'buzzer', 'servo', 'lcd', 'sicaklik', 'ldr']);
  const MEVCUT_PARCALAR = new Set(fs.readdirSync(yol('../src/parts')).flatMap(f => {
    const m = fs.readFileSync(yol('../src/parts/' + f)).toString().match(/\btur:\s*'([^']+)'/); return m ? [m[1]] : [];
  }));
  {
    const idler = DERSLER.map(d => d.id), adlar = DERSLER.map(d => d.ad);
    rapor('id\'ler benzersiz', new Set(idler).size === idler.length);
    rapor('ad\'lar benzersiz', new Set(adlar).size === adlar.length);
    rapor('5 yeni ders yüklendi, doğru sırada', JSON.stringify(idler.filter(i => IDLER.includes(i))) === JSON.stringify(IDLER));
    rapor('7.N adları ve modül 7', IDLER.every((i, n) => dersOf(i)?.ad.startsWith(`7.${n + 1} · `) && dersOf(i)?.modul === 7));
    rapor('7. modül dersleri 6. modülden sonra', idler.indexOf('saksi-sulama') > idler.indexOf('gunes-paneli'));
    rapor('sahne parça türleri bilinen', IDLER.every(i => dersOf(i).sahne.parcalar.every(p => PARCA_TURLERI.has(p.tur))));
    rapor('sahnede aynı analog pini iki parça kullanmıyor', IDLER.every(i => { const p = dersOf(i).sahne.parcalar.filter(x => /^A/.test(x.pin ?? '')).map(x => x.pin); return new Set(p).size === p.length; }));
    rapor('parça türleri (bilgi): henüz olmayanlar', true, [...PARCA_TURLERI].filter(t => !MEVCUT_PARCALAR.has(t)).join(',') || 'hepsi var');
    rapor('cozumler-m7 5 ders için', IDLER.every(i => typeof COZUM[i] === 'string' && COZUM[i].includes('void loop')));
  }
  for (const id of IDLER) {
    const d = dersOf(id);
    const a = d.adimlar;
    rapor(`${id}: alanlar dolu`, !!(d.ad && d.html && d.sure > 0 && d.sahne?.parcalar?.length && typeof d.kontrol === 'function' && typeof d.girdi === 'function'));
    rapor(`${id}: adım sayısı 5-8`, a.length >= 5 && a.length <= 8, String(a.length));
    let sorun = '';
    a.forEach((s, i) => {
      if (!s.baslik || !s.html) sorun += ` #${i} baslik/html`;
      for (const c of [].concat(s.bitti ?? [])) {
        if (c.blok && !BLOKLAR.has(c.blok)) sorun += ` #${i} blok ${c.blok}`;
        if (c.icinde && !BLOKLAR.has(c.icinde)) sorun += ` #${i} icinde ${c.icinde}`;
        if (!c.blok && !c.basari && !c.calistir) sorun += ` #${i} koşul`;
      }
      if (s.vurgu?.kategori && !KATEGORILER.has(s.vurgu.kategori)) sorun += ` #${i} kategori ${s.vurgu.kategori}`;
      if (s.vurgu?.blok && !BLOKLAR.has(s.vurgu.blok)) sorun += ` #${i} vurgu.blok ${s.vurgu.blok}`;
      if (s.vurgu?.parca != null && !(s.vurgu.parca >= 0 && s.vurgu.parca < d.sahne.parcalar.length)) sorun += ` #${i} parca`;
    });
    rapor(`${id}: adımlar geçerli (blok tipleri, kategori, parça)`, !sorun, sorun);
    rapor(`${id}: son adım basari, ilk adım bitti'siz`, JSON.stringify(a.at(-1).bitti).includes('"basari":true') && !a[0].bitti);
    const gl = d.gorevler;
    const kodlar = gl.filter(g => g.tip === 'kod'), sorular = gl.filter(g => g.tip === 'soru'), duz = gl.filter(g => g.tip === 'duzenle');
    rapor(`${id}: 3-4 kod, 3-4 soru, 3 duzenle`, kodlar.length >= 3 && kodlar.length <= 4 && sorular.length >= 3 && sorular.length <= 4 && duz.length === 3, `${kodlar.length}/${sorular.length}/${duz.length}`);
    rapor(`${id}: karışık sıra (kod/soru dönüşümlü)`, gl.slice(0, kodlar.length + sorular.length).some((g, i, l) => i && g.tip !== l[i - 1].tip));
    rapor(`${id}: sesli parça sayısı 8-12`, d.sesli?.length >= 8 && d.sesli.length <= 12, String(d.sesli?.length));
  }

  const gorevListesi = [];
  const ekle = (ad, fn) => gorevListesi.push({ ad, fn });

  // ───────── (b) C++ çözümü + boş program ─────────
  for (const id of IDLER) ekle(`b:${id}`, async out => {
    const d = dersOf(id);
    const r = await kos(d, COZUM[id] ?? BOS);
    out(`${id}: C++ çözümü ders kontrolünü geçer`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
    const b = await kos(d, BOS);
    out(`${id}: boş program reddedilir`, b.sonuc?.ok === false && !!b.sonuc?.mesaj, b.hata ?? b.sonuc?.mesaj);
  });

  // ───────── (c) Sesli anlatım ve duzenle ─────────
  for (const id of IDLER) {
    const d = dersOf(id), ic = ICERIK[id];
    rapor(`${id}: sesli içerik var ve derse bağlı`, !!ic && d.sesli === ic.sesli && ic.sesli.length >= 8 && ic.sesli.length <= 12);
    rapor(`${id}: ses uzunlukları (<=400)`, ic.sesli.every(p => p.ses && p.ses.trim() && p.ses.length <= 400), String(Math.max(...ic.sesli.map(p => p.ses.length))));
    rapor(`${id}: son parça Görevler, calistir parçası var`, /Görevler/.test(ic.sesli.at(-1).ses) && ic.sesli.some(p => p.calistir));
    rapor(`${id}: sesli parçalarda rakam/sembol yok`, ic.sesli.every(p => !/\d|[{}();=<>]/.test(p.ses)), ic.sesli.filter(p => /\d|[{}();=<>]/.test(p.ses)).map(p => p.ses.slice(0, 30)).join(' | '));
    rapor(`${id}: parca indeksleri sınırda`, ic.sesli.every(p => p.parca == null || (p.parca >= 0 && p.parca < d.sahne.parcalar.length)));
    rapor(`${id}: sesli yaz birleşimi = C++ çözümü`, ic.sesli.map(p => p.yaz ?? '').join('') === COZUM[id]);
    ekle(`c:${id}`, async out => {
      const kod = ic.sesli.map(p => p.yaz ?? '').join('');
      const r = await kos(d, kod);
      out(`${id}: sesli program ders kontrolünü geçer`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
    });
    ic.duzenle.forEach(g => {
      const ad = `${id} / ${g.baslik}`;
      rapor(`${ad}: ara metinleri kodda`, g.degistir.length > 0 && g.degistir.every(x => g.kod.includes(x.ara)), g.degistir.filter(x => !g.kod.includes(x.ara)).map(x => x.ara).join(' | '));
      rapor(`${ad}: cozum != kod, alanlar dolu`, g.cozum !== g.kod && !!g.ipucu && !!g.metin && g.tip === 'duzenle' && typeof g.girdi === 'function' && g.sure > 0);
      ekle(`c:${ad}`, async out => {
        const k = await kos(g, g.kod);
        out(`${ad}: başlangıç kodu derlenir ve GEÇMEZ`, !k.hata && k.sonuc?.ok === false, k.hata ?? k.sonuc?.mesaj);
        const c = await kos(g, g.cozum);
        out(`${ad}: çözüm GEÇER`, c.sonuc?.ok === true, c.hata ?? c.sonuc?.mesaj);
      });
    });
  }

  // ───────── (d) Kod görevleri ve sorular ─────────
  const A71 = '#define NEM A0\n#define POMPA D6\n';
  const A72 = '#define PIR D5\n#define LAMBA D0\nvoid setup() { Serial.begin(115200); pinMode(PIR, INPUT); pinMode(LAMBA, OUTPUT); }\n';
  const K73 = KOD.K73, K74 = KOD.K74, K75 = KOD.K75;
  const degis = (kod, a, b) => { if (!kod.includes(a)) throw new Error('yama bulunamadı: ' + a); return kod.replace(a, b); };
  const PATCH75 = '    if (tus != sifre[girilen]) {\n      dogru = false;\n    }\n    girilen += 1;\n';
  const iptal = (k, tamam = true) => degis(k, PATCH75, `    if (tus == 10) {\n${tamam ? '      girilen = 0;\n' : ''}      dogru = true;\n    } else {\n      if (tus != sifre[girilen]) {\n        dogru = false;\n      }\n      girilen += 1;\n    }\n`);
  const GAZ4 = (govde) => `#define GAZ A0\n#define LED D0\n#define BUZZER D8\nvoid setup() { pinMode(LED, OUTPUT); pinMode(BUZZER, OUTPUT); }\nvoid loop() { int gaz = analogRead(GAZ); ${govde} delay(100); }\n`;
  const DOGRU = {
    'saksi-sulama': [
      { d: KOD.K71(2000), y: [KOD.K71(), KOD.K71(4000)] },
      { d: A71 + 'void setup() { pinMode(POMPA, OUTPUT); }\nvoid loop() { if (analogRead(NEM) < 1500) { digitalWrite(POMPA, HIGH); delay(2000); digitalWrite(POMPA, LOW); delay(3000); } else { digitalWrite(POMPA, LOW); delay(100); } }',
        y: [KOD.K71(), A71 + 'void setup() { pinMode(POMPA, OUTPUT); }\nvoid loop() { if (analogRead(NEM) < 1500) { digitalWrite(POMPA, HIGH); delay(1000); digitalWrite(POMPA, LOW); delay(3000); } else { digitalWrite(POMPA, LOW); delay(100); } }'] },
      { d: A71 + 'void setup() { Serial.begin(115200); pinMode(POMPA, OUTPUT); }\nvoid loop() { int nem = analogRead(NEM); int y = map(nem, 0, 4095, 0, 100); Serial.println(y); if (nem < 1500) digitalWrite(POMPA, HIGH); else digitalWrite(POMPA, LOW); delay(100); }',
        y: [KOD.K71(), A71 + 'void setup() { Serial.begin(115200); pinMode(POMPA, OUTPUT); }\nvoid loop() { int nem = analogRead(NEM); Serial.println(nem); delay(100); }'] },
    ],
    'pir-lamba': [
      { d: KOD.K72(5000), y: [KOD.K72(), KOD.K72(3000)] },
      { d: A72 + 'int sayac = 0;\nvoid loop() { if (digitalRead(PIR) == HIGH) { sayac += 1; Serial.println(sayac); digitalWrite(LAMBA, HIGH); delay(2000); digitalWrite(LAMBA, LOW); } delay(50); }',
        y: [KOD.K72(), A72 + 'int sayac = 0;\nvoid loop() { if (digitalRead(PIR) == HIGH) { sayac += 1; Serial.println(sayac); } delay(50); }'] },
      { d: A72 + 'void loop() { if (digitalRead(PIR) == HIGH) { analogWrite(LAMBA, 255); delay(2000); for (int i = 255; i >= 0; i -= 5) { analogWrite(LAMBA, i); delay(20); } } delay(50); }',
        y: [KOD.K72(), A72 + 'void loop() { if (digitalRead(PIR) == HIGH) { analogWrite(LAMBA, 255); delay(2000); analogWrite(LAMBA, 0); } delay(50); }'] },
    ],
    'hava-istasyonu': [
      { d: degis(K73(), 'lcd.print(sic);\n  lcd.print(" C  ");', 'lcd.print(sic * 9 / 5 + 32);\n  lcd.print(" F  ");'),
        y: [K73(), degis(K73(), 'lcd.print(sic);\n  lcd.print(" C  ");', 'lcd.print(sic * 9 / 5);\n  lcd.print(" F  ");')] },
      { d: degis(K73(), '  delay(500);', '  if (sic > 25) {\n    Serial.println("UYARI: Cok sicak");\n  }\n  delay(500);'),
        y: [K73(), degis(K73(), '  delay(500);', '  Serial.println("UYARI: Cok sicak");\n  delay(500);')] },
      { d: degis(K73(), 'lcd.print("Isik: ");\n  lcd.print(isik);\n  lcd.print(" %  ");', 'if (isik < 30) {\n    lcd.print("Gece       ");\n  } else {\n    lcd.print("Gunduz     ");\n  }'),
        y: [K73(), degis(K73(), 'lcd.print("Isik: ");\n  lcd.print(isik);\n  lcd.print(" %  ");', 'if (isik > 30) {\n    lcd.print("Gece       ");\n  } else {\n    lcd.print("Gunduz     ");\n  }')] },
    ],
    'gaz-alarmi': [
      { d: K74({ esik: 1500 }), y: [K74(), K74({ esik: 3000 })] },
      { d: GAZ4('if (gaz > 3000) { digitalWrite(LED, HIGH); tone(BUZZER, 1000); } else if (gaz > 2000) { digitalWrite(LED, HIGH); noTone(BUZZER); } else { digitalWrite(LED, LOW); noTone(BUZZER); }'),
        y: [K74(), GAZ4('if (gaz > 2000) { digitalWrite(LED, HIGH); } else { digitalWrite(LED, LOW); noTone(BUZZER); }')] },
      { d: GAZ4('if (gaz > 2000) { digitalWrite(LED, HIGH); tone(BUZZER, 1000); delay(200); digitalWrite(LED, LOW); delay(200); } else { digitalWrite(LED, LOW); noTone(BUZZER); }'),
        y: [K74(), GAZ4('if (gaz > 2000) { digitalWrite(LED, HIGH); delay(200); digitalWrite(LED, LOW); delay(200); } else { digitalWrite(LED, LOW); noTone(BUZZER); }')] },
    ],
    'sifreli-kasa': [
      { d: K75({ sifre: '2, 4, 6, 8' }), y: [K75(), K75({ sifre: '2, 4, 6, 9' })] },
      { d: K75({ acik: 5000 }), y: [K75(), K75({ acik: 9000 })] },
      { d: iptal(K75()), y: [K75(), iptal(K75(), false)] },
    ],
  };
  for (const id of IDLER) {
    const gl = gorevler(id);
    const kodlar = gl.filter(g => g.tip === 'kod'), sorular = gl.filter(g => g.tip === 'soru');
    rapor(`${id}: referans çözüm sayısı = kod görevi sayısı`, DOGRU[id].length === kodlar.length);
    kodlar.forEach((g, i) => {
      rapor(`${id} / ${g.baslik}: alanlar dolu`, !!(g.baslik && g.metin && g.ipucu && g.sure > 0 || (g.baslik && g.metin && g.ipucu)) && typeof g.girdi === 'function' && typeof g.kontrol === 'function');
      ekle(`d:${id}:${i}`, async out => {
        const ref = DOGRU[id][i];
        const gg = { ...g, sure: g.sure ?? dersOf(id).sure };
        const ok = await kos(gg, ref.d);
        out(`${id} / ${g.baslik}: doğru çözüm ok:true`, ok.sonuc?.ok === true, ok.hata ?? ok.sonuc?.mesaj);
        const no = await kos(gg, BOS);
        out(`${id} / ${g.baslik}: boş program ok:false`, no.sonuc?.ok === false && !!no.sonuc?.mesaj, no.hata ?? no.sonuc?.mesaj);
        for (const [j, y] of ref.y.entries()) {
          const r = await kos(gg, y);
          out(`${id} / ${g.baslik}: yanlış çözüm ${j + 1} reddedilir`, !r.hata && r.sonuc?.ok === false, r.hata ?? r.sonuc?.mesaj);
        }
      });
    });
    const dogruIdx = new Set(sorular.map(s => s.dogru));
    rapor(`${id}: doğru şık indeksleri dağıtılmış`, dogruIdx.size >= Math.min(3, sorular.length), [...dogruIdx].join(','));
    for (const s of sorular) {
      rapor(`${id} soru "${s.soru.slice(0, 30)}…": şık/dogru/açıklama`,
        s.secenekler.length >= 3 && s.secenekler.length <= 4 && Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < s.secenekler.length
        && new Set(s.secenekler).size === s.secenekler.length && !!s.soru && !!s.aciklama);
    }
  }

  // ───────── (e) BLOK ile çözülebilirlik (başsız Blockly) ─────────
  const num = n => ({ type: 'math_number', fields: { NUM: n } });
  const txt = t => ({ type: 'text', fields: { TEXT: t } });
  const analog = pin => ({ type: 'dy_analog_oku', fields: { PIN: pin } });
  const harita = (pin, g, c, d) => ({ type: 'dy_harita', inputs: { DEG: { block: analog(pin) }, GMIN: { block: num(0) }, GMAX: { block: num(g) }, CMIN: { block: num(c) }, CMAX: { block: num(d) } } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const ve = (a, b) => ({ type: 'logic_operation', fields: { OP: 'AND' }, inputs: { A: { block: a }, B: { block: b } } });
  const get = v => ({ type: 'variables_get', fields: { VAR: { id: v } } });
  const set = (v, d) => ({ type: 'variables_set', fields: { VAR: { id: v } }, inputs: { VALUE: { block: d } } });
  const zincir = (...b) => { for (let i = 0; i < b.length - 1; i++) b[i].next = { block: b[i + 1] }; return b[0]; };
  const surekli = (...b) => ({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir(...b) } } });
  const bekleB = ms => ({ type: 'dy_bekle', inputs: { MS: { block: num(ms) } } });
  const yazB = (pin, d) => ({ type: 'dy_yaz', fields: { PIN: pin, DEG: String(d) } });
  const sesB = (pin, f) => ({ type: 'dy_ses_cal', fields: { PIN: pin }, inputs: { FREKANS: { block: num(f) } } });
  const sustur = pin => ({ type: 'dy_ses_sustur', fields: { PIN: pin } });
  const servoB = (pin, a) => ({ type: 'dy_servo_yaz', fields: { PIN: pin }, inputs: { ACI: { block: num(a) } } });
  const lcdB = (satir, m) => ({ type: 'dy_lcd_yaz', fields: { SATIR: String(satir) }, inputs: { METIN: { block: m } } });
  const birles = (a, b) => ({ type: 'dy_degisken_birlestir', inputs: { A: { block: a }, B: { block: b } } });
  const seriB = m => ({ type: 'dy_seri', inputs: { METIN: { block: m } } });
  const eger = (kosul, yap, degilse) => ({ type: 'controls_if', inputs: { IF0: { block: kosul }, DO0: { block: yap }, ...(degilse ? { ELSE: { block: degilse } } : {}) }, ...(degilse ? { extraState: { hasElse: true } } : {}) });
  // 7.5: tuş k (1-12) aralığı: 340k-170 < A0 < 340k+170
  const tusB = k => ve(cmp('GT', analog('A0'), num(340 * k - 170)), cmp('LT', analog('A0'), num(340 * k + 170)));
  const adimVe = (a, k) => ve(cmp('EQ', get('adim'), num(a)), tusB(k));
  const kasaBlok = (sifre = [1, 2, 3, 4]) => {
    const zinc = { type: 'controls_if', extraState: { elseIfCount: 3, hasElse: true }, inputs: {
      IF0: { block: adimVe(0, sifre[0]) }, DO0: { block: set('adim', num(1)) },
      IF1: { block: adimVe(1, sifre[1]) }, DO1: { block: set('adim', num(2)) },
      IF2: { block: adimVe(2, sifre[2]) }, DO2: { block: set('adim', num(3)) },
      IF3: { block: adimVe(3, sifre[3]) }, DO3: { block: zincir(set('adim', num(0)), servoB('D5', 90), bekleB(3000), servoB('D5', 0)) },
      ELSE: { block: zincir(set('adim', num(0)), yazB('D0', 1), bekleB(500), yazB('D0', 0)) } } };
    return zincir(set('adim', num(0)), surekli(eger(cmp('GT', analog('A0'), num(150)), zincir(zinc, bekleB(300))), bekleB(20)));
  };
  const kodUret = (blok, vars = []) => {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [blok] }, variables: vars.map(([id, name]) => ({ id, name })) }, ws);
    const kod = generator.workspaceToCode(ws); ws.dispose(); return kod;
  };
  const BLOK = {
    'saksi-sulama': { d: surekli(eger(cmp('LT', analog('A0'), num(1500)), yazB('D6', 1), yazB('D6', 0)), bekleB(100)), y: surekli(eger(cmp('GT', analog('A0'), num(1500)), yazB('D6', 1), yazB('D6', 0)), bekleB(100)), bos: surekli(bekleB(100)) },
    'pir-lamba': { d: surekli(eger({ type: 'dy_oku', fields: { PIN: 'D5' } }, zincir(yazB('D0', 1), bekleB(2000), yazB('D0', 0))), bekleB(50)), y: surekli(eger({ type: 'dy_oku', fields: { PIN: 'D5' } }, zincir(yazB('D0', 1), yazB('D0', 0))), bekleB(50)), bos: surekli(bekleB(50)) },
    'hava-istasyonu': {
      d: surekli(lcdB(0, birles(txt('Sicaklik: '), harita('A1', 4095, 0, 50))), lcdB(1, birles(txt('Isik: '), harita('A0', 4095, 0, 100))), seriB(birles(txt('Sicaklik='), harita('A1', 4095, 0, 50))), bekleB(500)),
      y: surekli(lcdB(0, birles(txt('Sicaklik: '), harita('A1', 4095, 0, 100))), lcdB(1, birles(txt('Isik: '), harita('A0', 4095, 0, 100))), seriB(birles(txt('Sicaklik='), harita('A1', 4095, 0, 100))), bekleB(500)),
      bos: surekli(bekleB(500)) },
    'gaz-alarmi': { d: surekli(eger(cmp('GT', analog('A0'), num(2000)), zincir(yazB('D0', 1), sesB('D8', 1000)), zincir(yazB('D0', 0), sustur('D8'))), bekleB(100)), y: surekli(eger(cmp('GT', analog('A0'), num(1500)), zincir(yazB('D0', 1), sesB('D8', 1000)), zincir(yazB('D0', 0), sustur('D8'))), bekleB(100)), bos: surekli(bekleB(100)) },
    'sifreli-kasa': { d: kasaBlok(), y: kasaBlok([4, 3, 2, 1]), bos: surekli(bekleB(100)), vars: [['adim', 'adim']] },
  };
  for (const id of IDLER) ekle(`e:${id}`, async out => {
    const d = dersOf(id), b = BLOK[id];
    const js = kodUret(b.d, b.vars);
    const r = await kosJs(d, js);
    out(`${id}: blok çözümü ders kontrolünü geçer`, r.sonuc?.ok === true, r.hata ?? (r.sonuc?.ok ? r.sonuc.mesaj : r.sonuc?.mesaj + '\n' + js));
    const y = await kosJs(d, kodUret(b.y, b.vars));
    out(`${id}: yanlış blok programı reddedilir`, !y.hata && y.sonuc?.ok === false, y.hata ?? y.sonuc?.mesaj);
    const bs = await kosJs(d, kodUret(b.bos));
    out(`${id}: boş döngü bloğu reddedilir`, !bs.hata && bs.sonuc?.ok === false, bs.hata ?? bs.sonuc?.mesaj);
    const bos = await kosJs(d, '');
    out(`${id}: hiç blok yok -> reddedilir`, !bos.hata && bos.sonuc?.ok === false, bos.hata ?? bos.sonuc?.mesaj);
  });

  // ───────── Koşular (EN_FAZLA paralel) ─────────
  const sonuclar = new Array(gorevListesi.length);
  let sira = 0;
  await Promise.all(Array.from({ length: EN_FAZLA }, async () => {
    while (sira < gorevListesi.length) {
      const i = sira++, satir = [];
      try { await gorevListesi[i].fn((ad, k, ek) => satir.push([ad, k, ek])); }
      catch (e) { satir.push([gorevListesi[i].ad + ' (istisna)', false, e.stack]); }
      sonuclar[i] = satir;
    }
  }));
  for (const s of sonuclar) for (const [ad, k, ek] of s) rapor(ad, k, ek);
} finally { await vite.close(); }

console.log(satirlar.join('\n'));
console.log(fail ? `\n${fail} test BAŞARISIZ` : `\nTüm testler geçti (${satirlar.length})`);
process.exit(fail ? 1 : 0);
