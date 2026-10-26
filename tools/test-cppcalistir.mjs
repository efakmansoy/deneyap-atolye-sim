// cppcalistir.js testi: node tools/test-cppcalistir.mjs
import { createServer } from 'vite';

const SHIM = new URL('./_blockly-shim.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });
let fail = 0;
const tamam = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (!k && ek ? '\n' + ek : '')); if (!k) fail++; };
const bekle = ms => new Promise(r => setTimeout(r, ms));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const { Sim } = await vite.ssrLoadModule('/src/sim.js');
  const { cppDerle } = await vite.ssrLoadModule('/src/cppcalistir.js');
  const { Blockly, generator } = await vite.ssrLoadModule('/src/blocks.js');
  const { arduinoKod } = await vite.ssrLoadModule('/src/cpp.js');

  // sanal süre T'ye kadar çalıştır
  async function kos(isle, T, hazirla) {
    const sim = new Sim(); sim.hiz = 20; hazirla?.(sim);
    const hatalar = [];
    const p = isle(sim).catch(e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); });
    const t0 = Date.now();
    while (sim.t < T && !hatalar.length && Date.now() - t0 < 15000) await bekle(3);
    sim.iptal = true; await p;
    return { sim, hatalar };
  }
  const cpp = (kod, T, hazirla) => kos(async sim => { const d = cppDerle(kod, sim); if (d.hata) throw new Error(d.hata.mesaj); await d.calistir(); }, T, hazirla);
  const cppOk = async (ad, kod, T, kontrol, hazirla) => {
    const { sim, hatalar } = await cpp(kod, T, hazirla);
    const s = hatalar.map(String);
    if (!s.length) { try { const r = kontrol(sim); if (r !== true && r !== undefined) s.push('beklenmeyen: ' + (typeof r === 'string' ? r : JSON.stringify(r))); } catch (e) { s.push(String(e)); } }
    tamam(ad, !s.length, s.join('\n'));
  };
  const ev = (sim, pin) => sim.olaylar.filter(o => o.pin === pin && !o.tur).map(o => [Math.round(o.t), o.deger]);
  const yakin = (a, b, tol = 50) => Math.abs(a - b) <= Math.max(tol, a * 0.2);

  // ── (1) elle yazılmış programlar ──
  await cppOk('yanıp sönen LED', `#define LED 2
void setup() { pinMode(LED, OUTPUT); }
void loop() { digitalWrite(LED, HIGH); delay(500); digitalWrite(LED, LOW); delay(500); }`, 2300, sim => {
    const e = ev(sim, 'D2'); if (e.length < 4) return 'az olay ' + JSON.stringify(e);
    return e.slice(0, 4).every(([t, d], i) => d === (i + 1) % 2 && yakin(t, i * 500)) || JSON.stringify(e);
  });
  await cppOk('if/else düğme', `const int led = D2; const int dugme = D5;
void setup() { pinMode(led, OUTPUT); pinMode(dugme, INPUT); }
void loop() { if (digitalRead(dugme) == HIGH) { digitalWrite(led, HIGH); } else { digitalWrite(led, LOW); } delay(10); }`, 300,
    sim => sim.pin.D2.deger === 1 || 'led yanmadı', sim => { sim.girdi.D5 = 1; });
  await cppOk('for ile LED şeridi', `void setup() { for (int i = 0; i < 5; i++) { pinMode(D0 + i, OUTPUT); digitalWrite(D0 + i, i % 2); } }
void loop() { delay(50); }`, 100, sim => eq([0, 1, 2, 3, 4].map(i => sim.pin['D' + i].deger), [0, 1, 0, 1, 0]) || 'şerit yanlış');
  await cppOk('sayaç + Serial', `int sayac = 0; float oran = 1.0 / 4;
void setup() { Serial.begin(115200); }
void loop() { sayac++; Serial.print("n="); Serial.print(sayac); Serial.print(" "); Serial.println(oran); delay(100); }`, 350,
    sim => eq(sim.seriCikti.slice(0, 3), ['n=1 0.25', 'n=2 0.25', 'n=3 0.25']) || sim.seriCikti);
  await cppOk('PWM yumuşak kısma', `void setup() { pinMode(D1, OUTPUT); }
void loop() { for (int i = 0; i <= 255; i += 51) { analogWrite(D1, i); delay(10); } for (int i = 255; i >= 0; i -= 51) { analogWrite(D1, i); delay(10); } }`, 300,
    sim => eq(sim.olaylar.slice(0, 6).map(o => o.deger), [0, 0.2, 0.4, 0.6, 0.8, 1]) || JSON.stringify(sim.olaylar.slice(0, 8)));
  await cppOk('map + analogRead', `void setup() { Serial.begin(9600); }
void loop() { int v = analogRead(A0); Serial.println(map(v, 0, 4095, 0, 255)); delay(100); }`, 150,
    sim => sim.seriCikti[0] === '127' || sim.seriCikti, sim => { sim.analog.A0 = 2048; });
  await cppOk('servo süpürme', `#include <ESP32Servo.h>
Servo s;
void setup() { s.attach(D9); }
void loop() { for (int a = 0; a <= 180; a += 90) { s.write(a); delay(20); } }`, 200,
    sim => eq(sim.olaylar.filter(o => o.tur === 'servo').slice(0, 3).map(o => o.deger), [0, 90, 180]) || JSON.stringify(sim.olaylar));
  await cppOk('tone melodi dizisi', `int nota[] = {262, 294, 330}; int n = sizeof(nota) / sizeof(nota[0]);
void setup() {}
void loop() { for (int i = 0; i < n; i++) { tone(D8, nota[i]); delay(100); } noTone(D8); delay(100); }`, 450,
    sim => eq(sim.olaylar.filter(o => o.tur === 'ses').slice(0, 4).map(o => o.deger), [262, 294, 330, 0]) || JSON.stringify(sim.olaylar));
  await cppOk('tone süreli', `void setup() { tone(D8, 440, 100); } void loop() { delay(300); }`, 400,
    sim => { const e = sim.olaylar.filter(o => o.tur === 'ses'); return (eq(e.map(o => o.deger), [440, 0]) && yakin(e[1].t, 100)) || JSON.stringify(e); });
  await cppOk('LCD', `#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2);
void setup() { lcd.init(); lcd.backlight(); lcd.setCursor(0, 0); lcd.print("Merhaba"); lcd.setCursor(0, 1); lcd.print(3.14159); lcd.setCursor(10, 0); lcd.print(42); }
void loop() { delay(100); }`, 150, sim => eq(sim.cihaz.lcd, ['Merhaba   42    ', '3.14            ']) || JSON.stringify(sim.cihaz.lcd));
  await cppOk('mesafe + bip', `long mesafeOlc(int pin) { pinMode(pin, OUTPUT); digitalWrite(pin, LOW); delayMicroseconds(2); digitalWrite(pin, HIGH); delayMicroseconds(10); digitalWrite(pin, LOW); pinMode(pin, INPUT); return pulseIn(pin, HIGH, 30000) / 58; }
void setup() { Serial.begin(115200); }
void loop() { long cm = mesafeOlc(D4); Serial.println(cm); if (cm < 20) tone(D8, 1000); else noTone(D8); delay(100); }`, 250,
    sim => (eq(sim.seriCikti.slice(0, 2), ['15', '15']) && sim.cihaz.ses.D8 === 1000) || JSON.stringify([sim.seriCikti, sim.cihaz]), sim => { sim.cihaz.mesafe = { D4: 15 }; });
  await cppOk('kullanıcı fonksiyonları + özyineleme', `int kare(int x) { return x * x; }
int fakt(int n) { if (n <= 1) return 1; return n * fakt(n - 1); }
float yarisi(float x) { return x / 2; }
void yaz(String s, int k) { Serial.println(s + k); }
void setup() { Serial.begin(9600); yaz("kare=", kare(7)); Serial.println(fakt(5)); Serial.println(yarisi(5)); yaz2(); }
void yaz2() { Serial.println("sonra"); }
void loop() { delay(100); }`, 50, sim => eq(sim.seriCikti, ['kare=49', '120', '2.50', 'sonra']) || sim.seriCikti);
  await cppOk('dizi, 2B dizi, sizeof', `int a[5] = {1, 2, 3}; int m[2][2] = {{1, 2}, {3, 4}}; String isim[] = {"x", "yy"};
void setup() { a[4] = 9; int t = 0; for (int i = 0; i < sizeof(a) / sizeof(a[0]); i++) t += a[i]; Serial.println(t); Serial.println(m[1][0] + m[0][1]); Serial.println(isim[1].length()); }
void loop() { delay(100); }`, 50, sim => eq(sim.seriCikti, ['15', '5', '2']) || sim.seriCikti);
  await cppOk('switch / do-while / ternary / while', `void setup() { for (int k = 0; k < 4; k++) { switch (k) { case 0: Serial.println("sifir"); break; case 1: case 2: Serial.println("bir-iki"); break; default: Serial.println("diger"); } }
  int c = 0; do { c += 2; } while (c < 7); Serial.println(c); int w = 10; while (w > 0) { w -= 3; if (w < 5) break; } Serial.println(w > 5 ? "buyuk" : "kucuk"); Serial.println(w); }
void loop() { delay(100); }`, 50, sim => eq(sim.seriCikti, ['sifir', 'bir-iki', 'bir-iki', 'diger', '8', 'kucuk', '4']) || sim.seriCikti);
  await cppOk('int bölme / float / cast / işleçler', `void setup() { int a = 7 / 2; float b = 7 / 2.0; int c = (int)(7.9); float d = (float)7 / 2; int e = 7.9; int f = -7 / 2; int g = -7 % 3;
  Serial.println(a); Serial.println(b); Serial.println(c); Serial.println(d); Serial.println(e); Serial.println(f); Serial.println(g);
  int h = 10; h /= 4; h <<= 2; h |= 1; Serial.println(h); Serial.println((5 & 3) + (5 ^ 3) + (~0 & 7)); bool z = !(3 > 2) || (1 == 1 && 2 != 2); Serial.println(z); Serial.println(constrain(15, 0, 10) + min(3, 2) + max(1, 4) + abs(-5)); Serial.println(sqrt(16)); Serial.println(pow(2, 10)); Serial.println(String(3.14159, 3)); Serial.println(String(255, HEX)); }
void loop() { delay(100); }`, 50, sim => eq(sim.seriCikti, ['3', '3.50', '7', '3.50', '7', '-3', '-1', '9', '14', '0', '21', '4.00', '1024.00', '3.142', 'FF']) || sim.seriCikti);
  await cppOk('String sınıfı + millis + printf', `String s = "Merhaba Dunya";
void setup() { Serial.println(s.substring(0, 7)); Serial.println(s.indexOf("Dunya")); Serial.println(String("42").toInt() + 1); Serial.println(s.charAt(1)); s.toUpperCase(); Serial.println(s); Serial.println("t=" + String(millis())); Serial.printf("%d-%s-%.1f\\n", 5, "a", 2.5); Serial.println(s == "MERHABA DUNYA"); }
void loop() { delay(100); }`, 50, sim => eq(sim.seriCikti, ['Merhaba', '8', '43', 'e', 'MERHABA DUNYA', 't=0', '5-a-2.5\n1']) || sim.seriCikti);
  await cppOk('millis ile yanıp sönme (delay yok)', `unsigned long onceki = 0; bool acik = false;
void setup() { pinMode(D2, OUTPUT); }
void loop() { if (millis() - onceki >= 200) { onceki = millis(); acik = !acik; digitalWrite(D2, acik); } delay(10); }`, 700,
    sim => ev(sim, 'D2').length >= 3 || JSON.stringify(ev(sim, 'D2')));
  await cppOk('LED_BUILTIN, sayısal pin, random', `void setup() { pinMode(LED_BUILTIN, OUTPUT); digitalWrite(LED_BUILTIN, HIGH); pinMode(A1, INPUT); randomSeed(5); int r = random(10); int q = random(5, 6); Serial.println(q); Serial.println(r >= 0 && r < 10); analogRead(16); digitalWrite(14, HIGH); }
void loop() { delay(100); }`, 50, sim => (sim.pin.D13.deger === 1 && sim.pin.D14.deger === 1 && eq(sim.seriCikti, ['5', '1'])) || JSON.stringify(sim.seriCikti));

  // ── (4) sonsuz döngü iptal ──
  {
    const sim = new Sim(); sim.hiz = 20; const d = cppDerle('void setup() { while (true) {} } void loop() {}', sim);
    const t0 = Date.now(); const p = d.calistir(); await bekle(100); sim.iptal = true;
    let hata = null; await p.catch(e => { hata = e; });
    tamam('while(true){} sim.iptal ile durur', !d.hata && !hata && Date.now() - t0 < 3000, String(hata) + JSON.stringify(d.hata));
    const sim2 = new Sim(); const d2 = cppDerle('void setup() {} void loop() { int i = 0; for (;;) { i++; } }', sim2);
    const p2 = d2.calistir(); await bekle(100); sim2.iptal = true; let h2 = null; await p2.catch(e => { h2 = e; });
    tamam('for(;;) içinde loop() iptal ile durur', !h2, String(h2));
  }

  // ── (3) hata mesajları ──
  const hataDene = (ad, kod, desen, satir) => {
    const d = cppDerle(kod, new Sim());
    tamam('hata: ' + ad, !!d.hata && desen.test(d.hata.mesaj) && (satir === undefined || d.hata.satir === satir), JSON.stringify(d.hata));
  };
  hataDene('eksik ;', 'void setup() {\n  pinMode(2, OUTPUT)\n  digitalWrite(2, HIGH);\n}\nvoid loop() {}', /';' eksik/, 2);
  hataDene('eksik }', 'void setup() {\n  pinMode(2, OUTPUT);\nvoid loop() {}\n', /'\{'.*kapatılmamış/);
  hataDene('fazla }', 'void setup() {}\n}\nvoid loop() {}', /Fazladan '\}'/, 2);
  hataDene('bilinmeyen fonksiyon', 'void setup() {\n  digitalwrite(2, HIGH);\n}\nvoid loop() {}', /digitalWrite/, 2);
  hataDene('bilinmeyen değişken', 'void setup() {\n  int a = b + 1;\n}\nvoid loop() {}', /'b' tanımlanmamış/, 2);
  hataDene('yanlış argüman sayısı', 'void setup() { digitalWrite(2); }\nvoid loop() {}', /2 değer ister ama 1/, 1);
  hataDene('setup yok', 'void loop() {}', /setup\(\)/);
  hataDene('loop yok', 'void setup() {}', /loop\(\)/);
  hataDene('bilinmeyen tür', 'void setup() {\n  Int x = 5;\n}\nvoid loop() {}', /bilinmeyen bir tür/, 2);
  hataDene('kapanmamış metin', 'void setup() {\n  Serial.println("abc);\n}\nvoid loop() {}', /Metin/, 2);
  hataDene('Servo include eksik', 'Servo s;\nvoid setup() {}\nvoid loop() {}', /ESP32Servo/, 1);
  hataDene('String -> int', 'void setup() { int x = "abc"; }\nvoid loop() {}', /String/, 1);
  hataDene('tanımsız LCD komutu', '#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(0x27,16,2);\nvoid setup() { lcd.prnt("a"); }\nvoid loop() {}', /print/, 3);
  hataDene('pointer', 'void setup() { int *p; }\nvoid loop() {}', /İşaretçi/, 1);
  hataDene('const atama', 'const int a = 1;\nvoid setup() {\n a = 2;\n}\nvoid loop() {}', /const/, 3);
  {
    const r = await cpp('void setup() { int a = 0; Serial.println(5 / a); } void loop() {}', 50);
    tamam('çalışma hatası: sıfıra bölme', r.hatalar.length === 1 && /Satır 1: Sıfıra bölme/.test(r.hatalar[0].message), String(r.hatalar));
    const r2 = await cpp('int d[3];\nvoid setup() {\n d[5] = 1;\n}\nvoid loop() {}', 50);
    tamam('çalışma hatası: dizi sınırı', r2.hatalar.length === 1 && /Satır 3: Dizi sınırı/.test(r2.hatalar[0].message), String(r2.hatalar));
    const r3 = await cpp('void setup() { digitalWrite(99, HIGH); } void loop() {}', 50);
    tamam('çalışma hatası: geçersiz pin', r3.hatalar.length === 1 && /Böyle bir pin yok/.test(r3.hatalar[0].message), String(r3.hatalar));
  }

  // ── (2) diferansiyel test: bloklar -> JS  vs  bloklar -> C++ -> cppDerle ──
  const num = n => ({ type: 'math_number', fields: { NUM: n } });
  const txt = t => ({ type: 'text', fields: { TEXT: t } });
  const get = v => ({ type: 'variables_get', fields: { VAR: { id: v } } });
  const set = (v, d) => ({ type: 'variables_set', fields: { VAR: { id: v } }, inputs: { VALUE: { block: d } } });
  const yaz = (p, d) => ({ type: 'dy_yaz', fields: { PIN: p, DEG: d } });
  const bekleB = ms => ({ type: 'dy_bekle', inputs: { MS: { block: num(ms) } } });
  const seri = m => ({ type: 'dy_seri', inputs: { METIN: { block: m } } });
  const zincir = (...b) => { for (let i = 0; i < b.length - 1; i++) b[i].next = { block: b[i + 1] }; return b[0]; };
  const surekli = (...b) => ({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir(...b) } } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const ar = (op, a, b) => ({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const sayiMetin = x => ({ type: 'dy_degisken_sayi_metin', inputs: { SAYI: { block: x } } });
  const birlestir = (a, b) => ({ type: 'dy_degisken_birlestir', inputs: { A: { block: a }, B: { block: b } } });
  const analog = p => ({ type: 'dy_analog_oku', fields: { PIN: p } });
  const wsKur = (bloklar, vars = []) => {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: bloklar }, variables: vars.map(([id, name]) => ({ id, name })) }, ws);
    return ws;
  };
  const AD = Object.getPrototypeOf(async function () {}).constructor;
  const senaryolar = [
    ['blink', [surekli(yaz('D0', '1'), bekleB(300), yaz('D0', '0'), bekleB(300))], [], {}, 1500],
    ['düğme if/else', [surekli({ type: 'controls_if', extraState: { hasElse: true }, inputs: { IF0: { block: { type: 'dy_dugme_basili', fields: { PIN: 'D5' } } }, DO0: { block: yaz('D2', '1') }, ELSE: { block: yaz('D2', '0') } } }, bekleB(50))], [], { girdi: { D5: 1 } }, 400],
    ['sayaç + seri', [zincir(set('v1', num(0)), surekli({ type: 'math_change', fields: { VAR: { id: 'v1' } }, inputs: { DELTA: { block: num(1) } } }, seri(birlestir(txt('n='), sayiMetin(get('v1')))), bekleB(100)))], [['v1', 'sayac']], {}, 650],
    ['metin değişkeni', [zincir(set('v1', txt('Selam')), surekli(seri(get('v1')), bekleB(200)))], [['v1', 'isim']], {}, 500],
    ['pot -> PWM', [surekli({ type: 'dy_pwm', fields: { PIN: 'D1' }, inputs: { DEG: { block: { type: 'dy_harita', inputs: { DEG: { block: analog('A0') }, GMIN: { block: num(0) }, GMAX: { block: num(4095) }, CMIN: { block: num(0) }, CMAX: { block: num(255) } } } } } }, bekleB(100))], [], { analog: { A0: 2048 } }, 350],
    ['servo', [surekli({ type: 'dy_servo_yaz', fields: { PIN: 'D9' }, inputs: { ACI: { block: num(45) } } }, bekleB(100), { type: 'dy_servo_yaz', fields: { PIN: 'D9' }, inputs: { ACI: { block: num(135) } } }, bekleB(100))], [], {}, 650],
    ['buzzer', [surekli({ type: 'dy_ses_cal', fields: { PIN: 'D8' }, inputs: { FREKANS: { block: num(440) } } }, bekleB(100), { type: 'dy_ses_sustur', fields: { PIN: 'D8' } }, bekleB(100))], [], {}, 650],
    ['LCD', [surekli({ type: 'dy_lcd_yaz', fields: { SATIR: '0' }, inputs: { METIN: { block: txt('Merhaba') } } }, { type: 'dy_lcd_yaz', fields: { SATIR: '1' }, inputs: { METIN: { block: txt('Dunya') } } }, bekleB(200))], [], {}, 450],
    ['mesafe + seri', [surekli(seri(sayiMetin({ type: 'dy_mesafe_oku', fields: { PIN: 'D4' } })), bekleB(100))], [], { mesafe: { D4: 37 } }, 350],
    ['controls_for + PWM', [{ type: 'controls_for', fields: { VAR: { id: 'v1' } }, inputs: { FROM: { block: num(0) }, TO: { block: num(255) }, BY: { block: num(85) }, DO: { block: zincir({ type: 'dy_pwm', fields: { PIN: 'D1' }, inputs: { DEG: { block: get('v1') } } }, bekleB(50)) } } }], [['v1', 'i']], {}, 400],
    ['repeat + LED çubuğu', [surekli({ type: 'controls_repeat_ext', inputs: { TIMES: { block: num(3) }, DO: { block: yaz('D0', '1') } } }, { type: 'dy_analog_cubuk', fields: { PIN: 'D0' }, inputs: { ADET: { block: num(4) }, SEVIYE: { block: num(2) } } }, bekleB(100))], [], {}, 300],
    ['mantık + aritmetik', [surekli({ type: 'controls_if', inputs: { IF0: { block: { type: 'logic_operation', fields: { OP: 'AND' }, inputs: { A: { block: cmp('GT', analog('A0'), num(100)) }, B: { block: cmp('NEQ', ar('ADD', num(1), ar('MULTIPLY', num(2), num(3))), num(8)) } } } }, DO0: { block: yaz('D3', '1') } } }, bekleB(100))], [], { analog: { A0: 500 } }, 300],
    ['dugme_yaz', [surekli({ type: 'dy_dugme_yaz', fields: { PIN: 'D6' }, inputs: { DEG: { block: { type: 'dy_dugme_basili', fields: { PIN: 'D5' } } } } }, bekleB(100))], [], { girdi: { D5: 1 } }, 300],
  ];
  const kosB = (isle, T, ort) => kos(isle, T, sim => { Object.assign(sim.girdi, ort.girdi ?? {}); Object.assign(sim.analog, ort.analog ?? {}); if (ort.mesafe) sim.cihaz.mesafe = { ...ort.mesafe }; });
  for (const [ad, bloklar, vars, ort, T] of senaryolar) {
    try {
      const ws = wsKur(bloklar, vars);
      const js = generator.workspaceToCode(ws); const kodCpp = arduinoKod(ws); ws.dispose();
      const A = await kosB(sim => new AD('sim', js)(sim), T, ort);
      const B = await kosB(async sim => { const d = cppDerle(kodCpp, sim); if (d.hata) throw new Error(d.hata.mesaj); await d.calistir(); }, T, ort);
      const sorun = [...A.hatalar.map(String), ...B.hatalar.map(String)];
      // mesafe sensörü pininin tetik darbeleri yalnızca C++ yolunda görünür (gerçek donanım gibi): süz
      const sayfa = s => s.olaylar.filter(o => !(ort.mesafe && o.pin in ort.mesafe)).map(o => ({ ...o }));
      const sa0 = r => r.sim.seriCikti.length; const ea = sayfa(A.sim), eb = sayfa(B.sim), n = Math.min(ea.length, eb.length);
      if (Math.abs(ea.length - eb.length) > 1 || (ea.length + sa0(A) + Object.keys(A.sim.cihaz).length === 0)) sorun.push(`olay sayısı ${ea.length} / ${eb.length}`);
      for (let i = 0; i < n; i++) {
        const x = ea[i], y = eb[i];
        if (x.pin !== y.pin || x.deger !== y.deger || x.tur !== y.tur || !yakin(x.t, y.t)) { sorun.push(`olay #${i}: ${JSON.stringify(x)} <> ${JSON.stringify(y)}`); break; }
      }
      const sa = A.sim.seriCikti, sb = B.sim.seriCikti, m = Math.min(sa.length, sb.length);
      if (Math.abs(sa.length - sb.length) > 1) sorun.push(`seri sayısı ${sa.length} / ${sb.length}`);
      if (!eq(sa.slice(0, m), sb.slice(0, m))) sorun.push(`seri: ${JSON.stringify(sa)} <> ${JSON.stringify(sb)}`);
      const cih = s => { const c = JSON.parse(JSON.stringify(s.cihaz)); delete c.mesafe; return c; };
      if (!eq(cih(A.sim), cih(B.sim))) sorun.push(`cihaz: ${JSON.stringify(cih(A.sim))} <> ${JSON.stringify(cih(B.sim))}`);
      const pinler = p => Object.fromEntries(Object.entries(p).filter(([k]) => !(ort.mesafe && k in ort.mesafe)).map(([k, v]) => [k, +v.pwm.toFixed(3)]));
      if (!eq(pinler(A.sim.pin), pinler(B.sim.pin)) && ea.length === eb.length) sorun.push('pin durumları: ' + JSON.stringify(pinler(A.sim.pin)) + ' <> ' + JSON.stringify(pinler(B.sim.pin)));
      tamam('diferansiyel: ' + ad + ` (${ea.length} olay, ${sa.length} seri)`, !sorun.length, sorun.join('\n') + '\n' + kodCpp);
    } catch (e) { tamam('diferansiyel: ' + ad, false, String(e.stack)); }
  }

  // cpp.js'in ürettiği çeşitli programlar hatasız derlenmeli
  {
    const ornekler = [
      [yaz('D0', '1')], [surekli(yaz('D0', '1'), bekleB(500), yaz('D0', '0'), bekleB(500))],
      [{ type: 'dy_analog_cubuk', fields: { PIN: 'D0' }, inputs: { ADET: { block: num(3) }, SEVIYE: { block: num(2) } } }],
      [{ type: 'dy_dugme_bekle', fields: { PIN: 'D5', DURUM: '1' } }, yaz('D2', '1')],
      [set('v1', txt('Merhaba "dünya"')), surekli(seri(get('v1')))],
      [{ type: 'dy_lcd_temizle' }, { type: 'dy_ses_cal', fields: { PIN: 'D8' }, inputs: { FREKANS: { block: num(440) } } }],
      [surekli(seri(sayiMetin({ type: 'dy_mesafe_oku', fields: { PIN: 'D4' } })))],
      [surekli({ type: 'dy_servo_yaz', fields: { PIN: 'D9' }, inputs: { ACI: { block: num(90) } } })],
      [surekli({ type: 'controls_whileUntil', fields: { MODE: 'UNTIL' }, inputs: { BOOL: { block: { type: 'dy_oku', fields: { PIN: 'D1' } } }, DO: { block: yaz('D0', '1') } } })],
      [set('v1', num(0)), surekli({ type: 'math_change', fields: { VAR: { id: 'v1' } }, inputs: { DELTA: { block: num(1) } } })],
      [{ type: 'dy_ses_sustur', fields: { PIN: 'D8' } }],
    ];
    ornekler.forEach((b, i) => {
      const ws = wsKur(b, i === 4 || i === 8 ? [['v1', 'delay']] : []); const kod = arduinoKod(ws); ws.dispose();
      const d = cppDerle(kod, new Sim());
      tamam(`cpp.js çıktısı derlenir #${i}`, !d.hata, JSON.stringify(d.hata) + '\n' + kod);
    });
  }
} finally { await vite.close(); }
console.log(fail ? `\n${fail} HATA` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
