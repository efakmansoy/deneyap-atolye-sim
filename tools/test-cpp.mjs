// cpp.js testi: node tools/test-cpp.mjs  (Vite SSR ile blocks.js + cpp.js yüklenir)
import { createServer } from 'vite';

const SHIM = new URL('./_blockly-shim.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });
let fail = 0;
const tamam = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (!k && ek ? '\n' + ek : '')); if (!k) fail++; };

// Basit C++ sağlık denetimi: parantez dengesi, noktalı virgül, tanımsız değişken
function saglik(kod) {
  const sorun = [];
  const temiz = kod.replace(/\/\/[^\n]*/g, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
  for (const [a, b] of ['()', '{}']) {
    let d = 0; for (const c of temiz) { if (c === a) d++; else if (c === b && --d < 0) break; }
    if (d !== 0) sorun.push(`${a}${b} dengesiz`);
  }
  for (const l of temiz.split('\n')) {
    const t = l.trim();
    if (!t || /[{};]$/.test(t) || t.startsWith('#') || /^(void|long) \w+\(.*\) \{$/.test(t)) continue;
    sorun.push('noktalı virgül yok: ' + t);
  }
  const tanimli = new Set(['i', 'tekrar']);
  for (const m of temiz.matchAll(/^(?:int|String|float|long) (\w+)/gm)) tanimli.add(m[1]);
  for (const m of temiz.matchAll(/for \(int (\w+)/g)) tanimli.add(m[1]);
  const fonk = new Set('if while for else return void setup loop'.split(' '));
  const gov = temiz.slice(temiz.indexOf('void setup'));
  for (const m of gov.matchAll(/^\s*(\w+) (?:=|\+=)/gm)) if (!tanimli.has(m[1])) sorun.push('tanımsız değişken: ' + m[1]);
  void fonk;
  // girinti: süslü parantez derinliğine uygun mu
  let d = 0;
  for (const l of temiz.split('\n')) {
    const t = l.trim(); if (!t) continue;
    const ac = t.startsWith('}') ? d - 1 : d;
    if (l.length - l.trimStart().length !== ac * 2) { sorun.push('girinti: ' + JSON.stringify(l)); break; }
    d += (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
  }
  return sorun;
}

try {
  const { Blockly } = await vite.ssrLoadModule('/src/blocks.js');
  const { arduinoKod, renklendir } = await vite.ssrLoadModule('/src/cpp.js');

  const num = n => ({ type: 'math_number', fields: { NUM: n } });
  const txt = t => ({ type: 'text', fields: { TEXT: t } });
  const get = v => ({ type: 'variables_get', fields: { VAR: { id: v } } });
  const set = (v, d) => ({ type: 'variables_set', fields: { VAR: { id: v } }, inputs: { VALUE: { block: d } } });
  const yaz = (p, d) => ({ type: 'dy_yaz', fields: { PIN: p, DEG: d } });
  const bekle = ms => ({ type: 'dy_bekle', inputs: { MS: { block: num(ms) } } });
  const seri = m => ({ type: 'dy_seri', inputs: { METIN: { block: m } } });
  const zincir = (...b) => { for (let i = 0; i < b.length - 1; i++) b[i].next = { block: b[i + 1] }; return b[0]; };
  const surekli = (...b) => ({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir(...b) } } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const ar = (op, a, b) => ({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const mant = (op, a, b) => ({ type: 'logic_operation', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const dugme = p => ({ type: 'dy_dugme_basili', fields: { PIN: p } });

  const uret = (bloklar, vars = [], ek) => {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: bloklar }, variables: vars.map(([id, name]) => ({ id, name })) }, ws);
    if (ek) ek(ws);
    const kod = arduinoKod(ws); ws.dispose(); return kod;
  };
  const dene = (ad, bloklar, vars, desenler, yok = [], ek) => {
    let kod; try { kod = uret(bloklar, vars, ek); } catch (e) { tamam(ad, false, String(e.stack)); return ''; }
    const sorun = saglik(kod);
    for (const d of desenler) if (!d.test(kod)) sorun.push('beklenen kalıp yok: ' + d);
    for (const d of yok) if (d.test(kod)) sorun.push('olmaması gereken kalıp: ' + d);
    tamam(ad, !sorun.length, sorun.join('\n') + '\n--- kod ---\n' + kod);
    return kod;
  };

  dene('boş workspace', [], [], [/void setup\(\) \{\n\}/, /void loop\(\) \{\n\}/]);
  dene('LED yak', [yaz('D0', '1')], [], [/void setup\(\) \{\n  pinMode\(D0, OUTPUT\);\n  digitalWrite\(D0, HIGH\);\n\}/, /void loop\(\) \{\n\}/]);
  dene('yanıp sönen LED', [surekli(yaz('D0', '1'), bekle(500), yaz('D0', '0'), bekle(500))], [],
    [/pinMode\(D0, OUTPUT\);/, /void loop\(\) \{\n  digitalWrite\(D0, HIGH\);\n  delay\(500\);\n  digitalWrite\(D0, LOW\);\n  delay\(500\);\n\}/], [/while \(true\)/]);
  dene('if/else düğme', [surekli({ type: 'controls_if', extraState: { hasElse: true }, inputs: {
    IF0: { block: dugme('D5') }, DO0: { block: yaz('D2', '1') }, ELSE: { block: yaz('D2', '0') } } })], [],
    [/if \(digitalRead\(D5\) == HIGH\) \{\n    digitalWrite\(D2, HIGH\);\n  \} else \{/, /pinMode\(D5, INPUT\);/, /pinMode\(D2, OUTPUT\);/], [/if \(\(/]);
  dene('değişken sayacı', [zincir(set('v1', num(0)), surekli(
    { type: 'math_change', fields: { VAR: { id: 'v1' } }, inputs: { DELTA: { block: num(1) } } },
    seri({ type: 'dy_degisken_sayi_metin', inputs: { SAYI: { block: get('v1') } } }), bekle(100)))], [['v1', 'sayaç']],
    [/^int sayac = 0;$/m, /Serial\.begin\(115200\);/, /sayac = 0;/, /sayac \+= 1;/, /Serial\.println\(String\(sayac\)\);/], [/sayaç/]);
  dene('metin değişkeni', [set('v1', txt('Merhaba "dünya"')), surekli(seri(get('v1')))], [['v1', 'isim']], [/^String isim;$/m, /isim = "Merhaba \\"dünya\\"";/]);
  dene('potansiyometre -> PWM', [surekli({ type: 'dy_pwm', fields: { PIN: 'D1' }, inputs: { DEG: { block: {
    type: 'dy_harita', inputs: { DEG: { block: { type: 'dy_analog_oku', fields: { PIN: 'A0' } } }, GMIN: { block: num(0) }, GMAX: { block: num(4095) }, CMIN: { block: num(0) }, CMAX: { block: num(255) } } } } } })], [],
    [/analogWrite\(D1, map\(analogRead\(A0\), 0, 4095, 0, 255\)\);/, /pinMode\(D1, OUTPUT\);/]);
  dene('servo', [surekli({ type: 'dy_servo_yaz', fields: { PIN: 'D9' }, inputs: { ACI: { block: num(90) } } })], [],
    [/#include <ESP32Servo\.h>/, /^Servo servo_D9;$/m, /servo_D9\.attach\(D9\);/, /servo_D9\.write\(90\);/]);
  dene('buzzer', [surekli({ type: 'dy_ses_cal', fields: { PIN: 'D8' }, inputs: { FREKANS: { block: num(440) } } }, ), ], [], [/tone\(D8, 440\);/]);
  dene('LCD', [surekli({ type: 'dy_lcd_yaz', fields: { SATIR: '1' }, inputs: { METIN: { block: txt('Selam') } } })], [],
    [/#include <LiquidCrystal_I2C\.h>/, /LiquidCrystal_I2C lcd\(0x27, 16, 2\);/, /lcd\.init\(\);/, /lcd\.setCursor\(0, 1\);/, /lcd\.print\("Selam"\);/]);
  dene('mesafe', [surekli(seri({ type: 'dy_degisken_sayi_metin', inputs: { SAYI: { block: { type: 'dy_mesafe_oku', fields: { PIN: 'D4' } } } } }))], [],
    [/long mesafeOlc\(int pin\)/, /String\(mesafeOlc\(D4\)\)/]);
  dene('controls_repeat_ext', [zincir(yaz('D0', '1'), { type: 'controls_repeat_ext', inputs: { TIMES: { block: num(3) }, DO: { block: zincir(bekle(1), yaz('D0', '0')) } } })], [],
    [/for \(int tekrar = 0; tekrar < 3; tekrar\+\+\) \{\n    delay\(1\);\n    digitalWrite\(D0, LOW\);\n  \}/]);
  dene('controls_for', [{ type: 'controls_for', fields: { VAR: { id: 'v1' } }, inputs: { FROM: { block: num(0) }, TO: { block: num(255) }, BY: { block: num(5) }, DO: { block: { type: 'dy_pwm', fields: { PIN: 'D1' }, inputs: { DEG: { block: get('v1') } } } } } }], [['v1', 'i']],
    [/for \(int i = 0; i <= 255; i \+= 5\) \{\n    analogWrite\(D1, i\);\n  \}/], [/^int i = 0;/m]);
  dene('logic_compare/operation + math', [surekli({ type: 'controls_if', inputs: {
    IF0: { block: mant('AND', cmp('GT', { type: 'dy_analog_oku', fields: { PIN: 'A0' } }, num(5)), cmp('NEQ', ar('ADD', num(1), ar('MULTIPLY', num(2), num(3))), num(7))) },
    DO0: { block: yaz('D0', '1') } } })], [], [/if \(\(analogRead\(A0\) > 5\) && \(\(1 \+ \(2 \* 3\)\) != 7\)\) \{/], [/if \(\(\(/]);
  dene('devre dışı blok', [yaz('D0', '1'), yaz('D1', '1')], [], [/D0/], [/D1/], ws => ws.getTopBlocks(true).find(b => b.getFieldValue('PIN') === 'D1').setDisabledReason(true, 'test'));
  dene('tek başına değer bloğu yok sayılır', [num(5), yaz('D0', '1')], [], [/digitalWrite\(D0, HIGH\)/], [/\b5\b/]);
  dene('LED çubuğu', [{ type: 'dy_analog_cubuk', fields: { PIN: 'D0' }, inputs: { ADET: { block: num(3) }, SEVIYE: { block: num(2) } } }], [], [/pinMode\(D2, OUTPUT\);/]);
  dene('ayrılmış değişken adı', [set('v1', num(1))], [['v1', 'delay']], [/_delay = 1;/]);

  // renklendir
  const ornekler = [uret([surekli(yaz('D0', '1'), bekle(5))]), uret([set('v1', txt('a<b & "c" // x')), surekli(seri(get('v1')))], [['v1', 'x']]), '#include <a.h>\nif (a < b && c > 0x27) { /* x */ } "açık', 'a / b // yorum <b>\n'];
  const sok = h => h.replace(/<\/?span[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  ornekler.forEach((k, i) => {
    const h = renklendir(k);
    const ac = (h.match(/<span /g) || []).length, kapa = (h.match(/<\/span>/g) || []).length;
    const hamEtiket = h.replace(/<\/?span[^>]*>/g, '');
    tamam(`renklendir #${i}: orijinali yeniden üretir`, sok(h) === k, JSON.stringify(sok(h)));
    tamam(`renklendir #${i}: span dengeli, ham < > & yok`, ac === kapa && !/[<>]/.test(hamEtiket) && !/&(?!amp;|lt;|gt;)/.test(hamEtiket));
  });
} finally { await vite.close(); }
console.log(fail ? `\n${fail} HATA` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
