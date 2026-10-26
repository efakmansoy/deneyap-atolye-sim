// Modül 4 ek dersleri (4.5 isik-calgisi, 4.6 pot-servo) testi: node tools/test-ek-m4b.mjs
// (a) yükleme ve adım şeması  (b) C++ çözümü + boş program  (c) sesli anlatım ve "kodu değiştir" görevleri
// (d) kod görevleri (referans C++ çözümleri) ve sorular  (e) BLOK çözümü (başsız Blockly)
// Hepsi Vite SSR ile yüklenir; sanal saat deterministiktir (sim.bekle tek olay kuyruğu), hız sabit tutulur.
import { createServer } from 'vite';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import BlocklyCekirdek from './_blockly-shim.mjs';

const SHIM = new URL('./_blockly-shim.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });

const HIZ = 2;            // sabit sanal hız (sanal ms / gerçek ms)
const DURDURMA_MS = 1300; // sim.t bu kadar gerçek ms değişmezse program bitti sayılır
const EN_FAZLA = 3;       // aynı anda koşan senaryo sayısı
const BOS = 'void setup() {} void loop() {}';
const IDLER = ['isik-calgisi', 'pot-servo'];
const bekle = ms => new Promise(r => setTimeout(r, ms));

let fail = 0;
const satirlar = [];
const rapor = (ad, k, ek = '') => { satirlar.push((k ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!k) fail++; };

try {
  const { Blockly, generator, TOOLBOX } = await vite.ssrLoadModule('/src/blocks.js');
  const { Sim, DurdurSinyali } = await vite.ssrLoadModule('/src/sim.js');
  const { cppDerle } = await vite.ssrLoadModule('/src/cppcalistir.js');
  const { DERSLER } = await vite.ssrLoadModule('/src/lessons/index.js');
  const ICERIK = (await vite.ssrLoadModule('/src/lessons/icerik/m4b-sesli.js')).default;
  const COZUM = (await import(pathToFileURL(new URL('./e2e/cozumler-ek-m4b.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')).href)).default;

  const sessiz = e => e?.constructor?.name === 'DurdurSinyali';
  // Sanal saatin deterministik kalması için sim.tick() kısa tutulur: Windows'ta her setTimeout(0) ~15 ms sürer; program bu yüzden
  // gerçek saatin gerisine düşer ve ders girdisinin olayları programın sanal zamanını "atlar". Burada tick çoğunlukla yalnızca
  // mikro-görev bekler (zaman bekleyen programlar sim.bekle ile sıralanır); bekleme içermeyen döngüler için her 64 çağrıda bir gerçek macro verilir.
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
  // C++ programını ders (ya da görev) senaryosuyla koşturur: { hata } ya da { sonuc }
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
  // Blok programı (JS üretilmiş) koşturur
  async function kosJs(ders, js) {
    const sim = yeniSim();
    const hatalar = [];
    const yut = e => { if (!sessiz(e)) hatalar.push(e); };
    const girdi = ders.girdi ? ders.girdi(sim).catch(yut) : Promise.resolve();
    const prog = new Function('sim', `return (async () => {\n${js}\n})();`)(sim).catch(yut);
    const bitir = sim.bekle(ders.sure).catch(() => {});   // uygulamadaki gibi: ders süresi de sanal saatte
    await Promise.race([prog, bitir]);
    sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
    await Promise.all([girdi, prog]);
    if (hatalar.length) return { hata: String(hatalar[0]) };
    return { sonuc: ders.kontrol(sim) };
  }

  const dersOf = id => DERSLER.find(d => d.id === id);
  const gorevler = id => dersOf(id).gorevler;

  // ───────── (a) Yükleme ve adım şeması ─────────
  const BLOKLAR = new Set(Object.keys(BlocklyCekirdek.Blocks));
  const KATEGORILER = new Set(TOOLBOX.contents.map(c => c.name));
  const PARCA_TURLERI = new Set(fs.readdirSync(new URL('../src/parts', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')).flatMap(f => {
    const m = fs.readFileSync(new URL('../src/parts/' + f, import.meta.url)).toString().match(/\btur:\s*'([^']+)'/); return m ? [m[1]] : [];
  }));
  {
    const idler = DERSLER.map(d => d.id), adlar = DERSLER.map(d => d.ad);
    rapor('id\'ler benzersiz', new Set(idler).size === idler.length);
    rapor('ad\'lar benzersiz', new Set(adlar).size === adlar.length);
    rapor('iki yeni ders yüklendi', IDLER.every(i => idler.includes(i)));
    const k = idler.indexOf('dugme-piyano');
    rapor('dersler 4.4\'ten sonra, 4.5 sonra 4.6 sırasında', idler.indexOf('isik-calgisi') > k && idler.indexOf('pot-servo') === idler.indexOf('isik-calgisi') + 1);
    rapor('4.5 / 4.6 ad ve modül', dersOf('isik-calgisi')?.ad === '4.5 · Işıkla çalan çalgı' && dersOf('pot-servo')?.ad === '4.6 · Topuzla servo' && IDLER.every(i => dersOf(i)?.modul === 4));
    rapor('parça türleri bilinen', IDLER.every(i => dersOf(i).sahne.parcalar.every(p => PARCA_TURLERI.has(p.tur))), [...PARCA_TURLERI].join(','));
  }
  for (const id of IDLER) {
    const d = dersOf(id);
    const a = d.adimlar;
    rapor(`${id}: alanlar dolu`, !!(d.ad && d.html && d.sure > 0 && d.sahne?.parcalar?.length && typeof d.kontrol === 'function' && typeof d.girdi === 'function'));
    rapor(`${id}: adım sayısı 5-7`, a.length >= 5 && a.length <= 7, String(a.length));
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
    rapor(`${id}: son adım basari`, JSON.stringify(a.at(-1).bitti).includes('"basari":true'));
    rapor(`${id}: ilk adım bitti'siz tanıtım`, !a[0].bitti);
    const gl = d.gorevler;
    const kodlar = gl.filter(g => g.tip === 'kod'), sorular = gl.filter(g => g.tip === 'soru'), duz = gl.filter(g => g.tip === 'duzenle');
    rapor(`${id}: 3-4 kod, 3-4 soru, 3 duzenle`, kodlar.length >= 3 && kodlar.length <= 4 && sorular.length >= 3 && sorular.length <= 4 && duz.length === 3, `${kodlar.length}/${sorular.length}/${duz.length}`);
    rapor(`${id}: karışık sıra`, gl.slice(0, kodlar.length + sorular.length).some((g, i, l) => i && g.tip !== l[i - 1].tip));
    rapor(`${id}: sesli parça sayısı 8-10`, d.sesli?.length >= 8 && d.sesli.length <= 10, String(d.sesli?.length));
  }

  // Dikkat: tüm koşular tek bir görev listesinde toplanır, EN_FAZLA kadarı aynı anda koşar.
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
    rapor(`${id}: sesli içerik var ve derse bağlı`, !!ic && d.sesli === ic.sesli && ic.sesli.length >= 8 && ic.sesli.length <= 10);
    rapor(`${id}: ses uzunlukları (<=400)`, ic.sesli.every(p => p.ses && p.ses.trim() && p.ses.length <= 400), String(Math.max(...ic.sesli.map(p => p.ses.length))));
    rapor(`${id}: son parça Görevler, calistir parçası var`, /Görevler/.test(ic.sesli.at(-1).ses) && ic.sesli.some(p => p.calistir));
    rapor(`${id}: sesli parçalarda rakam/sembol yok (ses metni okunabilir)`, ic.sesli.every(p => !/\d|[{}();=<>]/.test(p.ses)), ic.sesli.filter(p => /\d|[{}();=<>]/.test(p.ses)).map(p => p.ses.slice(0, 30)).join(' | '));
    rapor(`${id}: parca indeksleri sınırda`, ic.sesli.every(p => p.parca == null || (p.parca >= 0 && p.parca < d.sahne.parcalar.length)));
    ekle(`c:${id}`, async out => {
      const kod = ic.sesli.map(p => p.yaz ?? '').join('');
      const r = await kos(d, kod);
      out(`${id}: sesli program ders kontrolünü geçer`, r.sonuc?.ok === true, r.hata ?? r.sonuc?.mesaj);
      out(`${id}: sesli program, E2E çözümüyle aynı davranış`, (await kos(d, COZUM[id])).sonuc?.ok === true);
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
  const AYAR45 = 'void setup() { pinMode(D8, OUTPUT); }\n';
  const AYAR46 = '#include <ESP32Servo.h>\nServo servo;\nvoid setup() { servo.attach(D5); }\n';
  const DOGRU = {
    'isik-calgisi': [
      { d: AYAR45 + 'void loop() { if (analogRead(A0) > 2000) { tone(D8, 880); } else { noTone(D8); } delay(20); }', y: [AYAR45 + 'void loop() { tone(D8, 880); delay(20); }', AYAR45 + 'void loop() { if (analogRead(A0) < 2000) { tone(D8, 880); } else { noTone(D8); } delay(20); }'] },
      { d: AYAR45 + 'void loop() { int x = analogRead(A0); tone(D8, map(x, 0, 4095, 200, 2000)); delay(20); }', y: [AYAR45 + 'void loop() { tone(D8, map(analogRead(A0), 0, 4095, 2000, 200)); delay(20); }', AYAR45 + 'void loop() { tone(D8, map(analogRead(A0), 0, 4095, 200, 1000)); delay(20); }'] },
      { d: AYAR45 + 'void loop() { tone(D8, map(analogRead(A0), 0, 4095, 2000, 200)); delay(20); }', y: [AYAR45 + 'void loop() { tone(D8, map(analogRead(A0), 0, 4095, 200, 2000)); delay(20); }', AYAR45 + 'void loop() { tone(D8, 1000); delay(20); }'] },
      { d: AYAR45 + 'void loop() { int x = analogRead(A0); int f = 523; if (x < 1024) f = 262; else if (x < 2048) f = 330; else if (x < 3072) f = 392; tone(D8, f); delay(20); }', y: [AYAR45 + 'void loop() { tone(D8, 262); delay(20); }', AYAR45 + 'void loop() { tone(D8, map(analogRead(A0), 0, 4095, 262, 523)); delay(20); }'] },
    ],
    'pot-servo': [
      { d: AYAR46 + 'void loop() { int x = analogRead(A0); if (x < 1365) servo.write(0); else if (x < 2730) servo.write(90); else servo.write(180); delay(20); }', y: [AYAR46 + 'void loop() { servo.write(90); delay(20); }', AYAR46 + 'void loop() { servo.write(map(analogRead(A0), 0, 4095, 0, 180)); delay(20); }'] },
      { d: AYAR46 + 'void loop() { servo.write(map(analogRead(A0), 0, 4095, 180, 0)); delay(20); }', y: [AYAR46 + 'void loop() { servo.write(map(analogRead(A0), 0, 4095, 0, 180)); delay(20); }', AYAR46 + 'void loop() { servo.write(90); delay(20); }'] },
      { d: AYAR46 + 'void loop() { servo.write(map(analogRead(A0), 0, 4095, 45, 135)); delay(20); }', y: [AYAR46 + 'void loop() { servo.write(map(analogRead(A0), 0, 4095, 0, 180)); delay(20); }', AYAR46 + 'void loop() { servo.write(45); delay(20); }'] },
      { d: AYAR46 + 'int aci = 0;\nvoid loop() { int hedef = map(analogRead(A0), 0, 4095, 0, 180); if (aci < hedef) aci = min(aci + 3, hedef); else if (aci > hedef) aci = max(aci - 3, hedef); servo.write(aci); delay(20); }', y: [AYAR46 + 'void loop() { servo.write(map(analogRead(A0), 0, 4095, 0, 180)); delay(20); }', AYAR46 + 'void loop() { servo.write(0); delay(20); }'] },
    ],
  };
  for (const id of IDLER) {
    const gl = gorevler(id);
    const kodlar = gl.filter(g => g.tip === 'kod'), sorular = gl.filter(g => g.tip === 'soru');
    rapor(`${id}: referans çözüm sayısı = kod görevi sayısı`, DOGRU[id].length === kodlar.length);
    kodlar.forEach((g, i) => {
      rapor(`${id} / ${g.baslik}: alanlar dolu`, !!(g.baslik && g.metin && g.ipucu && g.sure > 0 && typeof g.girdi === 'function' && typeof g.kontrol === 'function'));
      ekle(`d:${id}:${i}`, async out => {
        const ref = DOGRU[id][i];
        const ok = await kos(g, ref.d);
        out(`${id} / ${g.baslik}: doğru çözüm ok:true`, ok.sonuc?.ok === true, ok.hata ?? ok.sonuc?.mesaj);
        const no = await kos(g, BOS);
        out(`${id} / ${g.baslik}: boş program ok:false`, no.sonuc?.ok === false && !!no.sonuc?.mesaj, no.hata ?? no.sonuc?.mesaj);
        for (const [j, y] of ref.y.entries()) {
          const r = await kos(g, y);
          out(`${id} / ${g.baslik}: yanlış çözüm ${j + 1} reddedilir`, !r.hata && r.sonuc?.ok === false, r.hata ?? r.sonuc?.mesaj);
        }
      });
    });
    const dogruIdx = new Set(sorular.map(s => s.dogru));
    rapor(`${id}: doğru şık indeksleri dağıtılmış`, dogruIdx.size >= 3, [...dogruIdx].join(','));
    for (const s of sorular) {
      rapor(`${id} soru "${s.soru.slice(0, 30)}…": şık/dogru/açıklama`,
        s.secenekler.length >= 3 && s.secenekler.length <= 4 && Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < s.secenekler.length
        && new Set(s.secenekler).size === s.secenekler.length && !!s.soru && !!s.aciklama);
    }
  }

  // ───────── (e) BLOK ile çözülebilirlik (başsız Blockly) ─────────
  const num = n => ({ type: 'math_number', fields: { NUM: n } });
  const analog = pin => ({ type: 'dy_analog_oku', fields: { PIN: pin } });
  const harita = (c, d) => ({ type: 'dy_harita', inputs: { DEG: { block: analog('A0') }, GMIN: { block: num(0) }, GMAX: { block: num(4095) }, CMIN: { block: num(c) }, CMAX: { block: num(d) } } });
  const zincir = (...b) => { for (let i = 0; i < b.length - 1; i++) b[i].next = { block: b[i + 1] }; return b[0]; };
  const surekli = (...b) => ({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir(...b) } } });
  const bekleB = ms => ({ type: 'dy_bekle', inputs: { MS: { block: num(ms) } } });
  const sesB = (pin, f) => ({ type: 'dy_ses_cal', fields: { PIN: pin }, inputs: { FREKANS: { block: f } } });
  const servoB = (pin, a) => ({ type: 'dy_servo_yaz', fields: { PIN: pin }, inputs: { ACI: { block: a } } });
  const kodUret = blok => {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [blok] } }, ws);
    const kod = generator.workspaceToCode(ws); ws.dispose(); return kod;
  };
  const BLOK = {
    'isik-calgisi': { d: surekli(sesB('D8', harita(200, 2000)), bekleB(20)), y: surekli(sesB('D8', harita(2000, 200)), bekleB(20)), bos: surekli(bekleB(20)) },
    'pot-servo': { d: surekli(servoB('D5', harita(0, 180)), bekleB(20)), y: surekli(servoB('D5', harita(180, 0)), bekleB(20)), bos: surekli(bekleB(20)) },
  };
  for (const id of IDLER) ekle(`e:${id}`, async out => {
    const d = dersOf(id), b = BLOK[id];
    const js = kodUret(b.d);
    const r = await kosJs(d, js);
    out(`${id}: blok çözümü ders kontrolünü geçer`, r.sonuc?.ok === true, r.hata ?? (r.sonuc?.ok ? r.sonuc.mesaj : r.sonuc?.mesaj + '\n' + js));
    const y = await kosJs(d, kodUret(b.y));
    out(`${id}: ters haritalı blok programı reddedilir`, !y.hata && y.sonuc?.ok === false, y.hata ?? y.sonuc?.mesaj);
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
