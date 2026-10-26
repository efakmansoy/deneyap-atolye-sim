// Blok çalışma alanından gerçek Arduino C++ (Deneyap Kart) üretir + sözdizimi renklendirme.
// Simülatör kodu (blocks.js) ayrıdır; bu dosya yalnızca öğrenciye "karşılığı olan kodu" göstermek içindir.
import { Blockly } from './blocks.js';

const C = new Blockly.Generator('Arduino');
C.INDENT = '  ';
C.scrub_ = function (block, code, thisOnly) {
  const sonraki = block.nextConnection && block.nextConnection.targetBlock();
  return code + (sonraki && !thisOnly ? this.blockToCode(sonraki) : '');
};

const ATOM = 0, NONE = 99;
const TR = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };
const RESERVED = new Set('void int long float double bool boolean String char const unsigned short byte if else for while do return break continue true false HIGH LOW OUTPUT INPUT INPUT_PULLUP setup loop delay millis map pow tone noTone lcd Serial Servo mesafeOlc tekrar new class switch case default'.split(' '));
const ad = s => { s = String(s).replace(/[çğıöşüÇĞİÖŞÜ]/g, c => TR[c]).replace(/[^A-Za-z0-9_]/g, '_'); if (/^[0-9]/.test(s) || RESERVED.has(s) || /^(D|A)\d+$/.test(s) || /^servo_/.test(s)) s = '_' + s; return s; };
const v = (b, g, n, d = '0') => g.valueToCode(b, n, NONE) || d;
const soyKos = s => (s.startsWith('(') && s.endsWith(')') && dengeli(s.slice(1, -1))) ? s.slice(1, -1) : s;
const dengeli = s => { let d = 0; for (const c of s) { if (c === '(') d++; if (c === ')' && --d < 0) return false; } return d === 0; };
const girinti = (s, n = 1) => s.split('\n').map(l => l ? C.INDENT.repeat(n) + l : l).join('\n');
const cikti = pin => C.ciktilar.add(pin);
const girdi = pin => C.girdiler.add(pin);
const deg = b => ad(b.getField('VAR').getText());
const metinMi = (b, ad_) => { const t = b?.getInputTargetBlock(ad_); return !!t && ['text', 'dy_degisken_birlestir', 'dy_degisken_sayi_metin'].includes(t.type); };

const F = C.forBlock;
F.dy_yaz = b => { const p = b.getFieldValue('PIN'); cikti(p); return `digitalWrite(${p}, ${b.getFieldValue('DEG') === '1' ? 'HIGH' : 'LOW'});\n`; };
F.dy_pwm = (b, g) => { const p = b.getFieldValue('PIN'); cikti(p); return `analogWrite(${p}, ${v(b, g, 'DEG')});\n`; };
F.dy_oku = b => { const p = b.getFieldValue('PIN'); girdi(p); return [`(digitalRead(${p}) == HIGH)`, ATOM]; };
F.dy_bekle = (b, g) => `delay(${v(b, g, 'MS')});\n`;
F.dy_surekli = (b, g) => `while (true) {\n${g.statementToCode(b, 'GOVDE')}}\n`;
F.dy_seri = (b, g) => { C.seri = true; return `Serial.println(${v(b, g, 'METIN', '""')});\n`; };
F.dy_analog_oku = b => [`analogRead(${b.getFieldValue('PIN')})`, ATOM];
F.dy_harita = (b, g) => [`map(${v(b, g, 'DEG')}, ${v(b, g, 'GMIN')}, ${v(b, g, 'GMAX', '4095')}, ${v(b, g, 'CMIN')}, ${v(b, g, 'CMAX', '255')})`, ATOM];
F.dy_analog_cubuk = (b, g) => {
  const bas = b.getFieldValue('PIN'); C.ciktilar.add(bas);
  const adet = b.getInputTargetBlock('ADET'), no = Number(bas.slice(1));
  const n = adet ? (adet.type === 'math_number' ? Number(adet.getFieldValue('NUM')) : 8) : 8;
  for (let k = 1; k < n && no + k <= 14; k++) C.ciktilar.add('D' + (no + k));
  return `for (int i = 0; i < ${v(b, g, 'ADET', '8')}; i++) {\n  digitalWrite(${bas} + i, i < ${v(b, g, 'SEVIYE')} ? HIGH : LOW);\n}\n`;
};
F.dy_degisken_birlestir = (b, g) => [`(String(${v(b, g, 'A', '""')}) + String(${v(b, g, 'B', '""')}))`, ATOM];
F.dy_degisken_sayi_metin = (b, g) => [`String(${v(b, g, 'SAYI')})`, ATOM];
F.dy_degisken_zaman = () => ['millis()', ATOM];
F.dy_dugme_basili = b => { const p = b.getFieldValue('PIN'); girdi(p); return [`(digitalRead(${p}) == HIGH)`, ATOM]; };
F.dy_dugme_deger = b => { const p = b.getFieldValue('PIN'); girdi(p); return [`digitalRead(${p})`, ATOM]; };
F.dy_dugme_bekle = b => { const p = b.getFieldValue('PIN'); girdi(p); return `while (digitalRead(${p}) != ${b.getFieldValue('DURUM') === '1' ? 'HIGH' : 'LOW'}) {\n  delay(1);\n}\n`; };
F.dy_dugme_yaz = (b, g) => { const p = b.getFieldValue('PIN'); cikti(p); return `digitalWrite(${p}, ${soyKos(v(b, g, 'DEG', 'false'))} ? HIGH : LOW);\n`; };
F.dy_lcd_yaz = (b, g) => { C.lcd = true; return `lcd.setCursor(0, ${Number(b.getFieldValue('SATIR'))});\nlcd.print(${v(b, g, 'METIN', '""')});\n`; };
F.dy_lcd_temizle = () => { C.lcd = true; return 'lcd.clear();\n'; };
F.dy_ses_cal = (b, g) => `tone(${b.getFieldValue('PIN')}, ${v(b, g, 'FREKANS')});\n`;
F.dy_ses_sustur = b => `noTone(${b.getFieldValue('PIN')});\n`;
F.dy_servo_yaz = (b, g) => { const p = b.getFieldValue('PIN'); C.servolar.add(p); return `servo_${p}.write(${v(b, g, 'ACI')});\n`; };
F.dy_mesafe_oku = b => { C.mesafe = true; return [`mesafeOlc(${b.getFieldValue('PIN')})`, ATOM]; };
F.dy_rastgele = (b, g) => { const ust = b.getInputTargetBlock('B'); return [`random(${v(b, g, 'A', '1')}, ${!ust ? 7 : ust.type === 'math_number' ? Number(ust.getFieldValue('NUM')) + 1 : soyKos(v(b, g, 'B')) + ' + 1'})`, ATOM]; };

// Yerleşik Blockly blokları
F.math_number = b => { const n = Number(b.getFieldValue('NUM')); return [String(n), n < 0 ? NONE : ATOM]; };
F.text = b => [JSON.stringify(b.getFieldValue('TEXT')), ATOM];
F.logic_boolean = b => [b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', ATOM];
F.logic_negate = (b, g) => [`(!${v(b, g, 'BOOL', 'false')})`, ATOM];
F.logic_compare = (b, g) => {
  const op = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' }[b.getFieldValue('OP')];
  return [`(${v(b, g, 'A')} ${op} ${v(b, g, 'B')})`, ATOM];
};
F.logic_operation = (b, g) => [`(${v(b, g, 'A', 'false')} ${b.getFieldValue('OP') === 'AND' ? '&&' : '||'} ${v(b, g, 'B', 'false')})`, ATOM];
F.math_arithmetic = (b, g) => {
  const op = b.getFieldValue('OP');
  if (op === 'POWER') return [`pow(${v(b, g, 'A')}, ${v(b, g, 'B')})`, ATOM];
  return [`(${v(b, g, 'A')} ${{ ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/' }[op]} ${v(b, g, 'B')})`, ATOM];
};
F.variables_get = b => { const n = deg(b); if (C.donguDeg.includes(n)) return [n, ATOM]; C.degiskenler.set(n, C.degiskenler.get(n) ?? 'int'); return [n, ATOM]; };
F.variables_set = (b, g) => {
  const n = deg(b);
  if (metinMi(b, 'VALUE')) C.degiskenler.set(n, 'String'); else if (!C.degiskenler.has(n)) C.degiskenler.set(n, 'int');
  return `${n} = ${soyKos(v(b, g, 'VALUE'))};\n`;
};
F.math_change = (b, g) => { const n = deg(b); if (!C.degiskenler.has(n)) C.degiskenler.set(n, 'int'); return `${n} += ${soyKos(v(b, g, 'DELTA'))};\n`; };
F.controls_repeat_ext = (b, g) => `for (int tekrar = 0; tekrar < ${soyKos(v(b, g, 'TIMES', '10'))}; tekrar++) {\n${g.statementToCode(b, 'DO')}}\n`;
F.controls_for = (b, g) => {
  const n = deg(b);
  const bas = `for (int ${n} = ${soyKos(v(b, g, 'FROM', '1'))}; ${n} <= ${soyKos(v(b, g, 'TO', '10'))}; ${n} += ${soyKos(v(b, g, 'BY', '1'))}) {\n`;
  C.donguDeg.push(n); // döngü değişkeni döngüde tanımlı: genel değişken olarak bildirilmez
  try { return bas + g.statementToCode(b, 'DO') + '}\n'; } finally { C.donguDeg.pop(); }
};
F.controls_whileUntil = (b, g) => {
  const k = soyKos(v(b, g, 'BOOL', 'false'));
  return `while (${b.getFieldValue('MODE') === 'UNTIL' ? `!(${k})` : k}) {\n${g.statementToCode(b, 'DO')}}\n`;
};
F.controls_if = (b, g) => {
  let kod = '';
  for (let i = 0; b.getInput('IF' + i); i++) {
    kod += `${i ? ' else ' : ''}if (${soyKos(v(b, g, 'IF' + i, 'false'))}) {\n${g.statementToCode(b, 'DO' + i)}}`;
  }
  if (b.getInput('ELSE')) kod += ` else {\n${g.statementToCode(b, 'ELSE')}}`;
  return kod + '\n';
};

const ANAHTAR = new Set('void int long float double bool boolean String char const unsigned if else for while do return break continue true false HIGH LOW OUTPUT INPUT INPUT_PULLUP'.split(' '));
const GOMULU = new Set('pinMode digitalWrite digitalRead analogWrite analogRead delay delayMicroseconds millis map pow tone noTone pulseIn'.split(' '));

/** Çalışma alanından Arduino C++ kodu üret. */
export function arduinoKod(ws) {
  C.init(ws);
  Object.assign(C, { girdiler: new Set(), ciktilar: new Set(), degiskenler: new Map(), servolar: new Set(), donguDeg: [], seri: false, lcd: false, mesafe: false });
  const ust = ws.getTopBlocks(true).filter(b => b.isEnabled() && !b.outputConnection);
  if (!ust.length) return '// Blokları ekledikçe karşılığı olan Arduino kodu burada görünür.\n\nvoid setup() {\n}\n\nvoid loop() {\n}\n';
  let kurulum = '', dongu = '';
  for (let i = 0; i < ust.length; i++) {
    if (ust[i].outputConnection) continue; // tek başına duran değer blokları kod üretmez
    for (let b = ust[i]; b; b = b.getNextBlock()) {
      if (b.type === 'dy_surekli') dongu += C.statementToCode(b, 'GOVDE');
      else kurulum += C.blockToCode(b, true);
    }
  }
  const k = [];
  if (C.servolar.size) k.push('#include <ESP32Servo.h>');
  if (C.lcd) k.push('#include <LiquidCrystal_I2C.h>');
  const g = [];
  for (const p of C.servolar) g.push(`Servo servo_${p};`);
  if (C.lcd) g.push('LiquidCrystal_I2C lcd(0x27, 16, 2);');
  for (const [n, t] of C.degiskenler) g.push(`${t} ${n}${t === 'int' ? ' = 0' : ''};`);
  const s = [];
  if (C.seri) s.push('Serial.begin(115200);');
  for (const p of C.ciktilar) s.push(`pinMode(${p}, OUTPUT);`);
  for (const p of C.girdiler) if (!C.ciktilar.has(p)) s.push(`pinMode(${p}, INPUT);`);
  for (const p of C.servolar) s.push(`servo_${p}.attach(${p});`);
  if (C.lcd) s.push('lcd.init();', 'lcd.backlight();');
  const yardimci = C.mesafe ? 'long mesafeOlc(int pin) {   // santimetre\n  pinMode(pin, OUTPUT);\n  digitalWrite(pin, LOW);\n  delayMicroseconds(2);\n  digitalWrite(pin, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(pin, LOW);\n  pinMode(pin, INPUT);\n  return pulseIn(pin, HIGH, 30000) / 58;\n}\n' : '';
  const parca = [k.join('\n'), g.join('\n'), yardimci,
    `void setup() {\n${girinti((s.join('\n') + (s.length && kurulum ? '\n' : '') + kurulum).replace(/\n$/, ''))}${s.length || kurulum ? '\n' : ''}}`,
    `void loop() {\n${dongu}}`].filter(Boolean);
  return parca.join('\n\n') + '\n';
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** C++ kodunu renkli HTML'e çevir. */
export function renklendir(kod) {
  const re = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(#\w+)|(\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)(\s*\()?|([^\sA-Za-z0-9_"/#]+|\s+|.)/g;
  let out = '', m;
  while ((m = re.exec(kod))) {
    const [, yor, str, onis, say, kim, par, dig] = m;
    if (yor) out += `<span class="k-yor">${esc(yor)}</span>`;
    else if (str) out += `<span class="k-str">${esc(str)}</span>`;
    else if (onis) out += `<span class="k-onis">${esc(onis)}</span>`;
    else if (say) out += `<span class="k-say">${say}</span>`;
    else if (kim) {
      const cls = ANAHTAR.has(kim) ? 'k-key' : GOMULU.has(kim) ? 'k-yerlesik' : par ? 'k-fn' : /^[DA]\d+$/.test(kim) ? 'k-pin' : '';
      out += (cls ? `<span class="${cls}">${kim}</span>` : kim) + (par ?? '');
    } else out += esc(dig ?? m[0]);
  }
  return out;
}
