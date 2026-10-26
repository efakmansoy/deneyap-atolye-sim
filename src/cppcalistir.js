// Arduino C++ alt kümesini tarayıcıda simülatörde çalıştırır: C++ -> JS çevirisi (derleme) + new Function.
// Arayüz: cppDerle(kod, sim) -> { hata: null | { mesaj, satir }, calistir: async () => void }
// Kullanıcı fonksiyonları async'tir; delay/delayMicroseconds await edilir; her döngü gövdesi ucuz bir yield içerir.
import { PINLER, DurdurSinyali } from './sim.js';

class CppHata extends Error { constructor(mesaj, satir) { super(mesaj); this.satir = satir; } }

// ───────────────────────── Sözcük çözümleme ─────────────────────────
const OPLAR = ['<<=', '>>=', '...', '->', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '::'];
const KACIS = { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', '"': '"', "'": "'", a: '\x07', b: '\b', f: '\f', v: '\v' };

function sozcukle(src, ilkSatir = 1) {
  const T = []; let i = 0, satir = ilkSatir; const n = src.length;
  let satirBasi = true;
  const kacis = (bas) => { // src[i] == '\\'
    const c = src[i + 1];
    if (c === 'x') { const m = /^[0-9a-fA-F]{1,2}/.exec(src.slice(i + 2)); if (m) { i += 2 + m[0].length; return String.fromCharCode(parseInt(m[0], 16)); } }
    i += 2; return c in KACIS ? KACIS[c] : c;
  };
  while (i < n) {
    const c = src[i];
    if (c === '\n') { satir++; i++; satirBasi = true; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const son = src.indexOf('*/', i + 2);
      if (son < 0) throw new CppHata("Yorum '/*' açılmış ama '*/' ile kapatılmamış", satir);
      for (const ch of src.slice(i, son)) if (ch === '\n') satir++;
      i = son + 2; continue;
    }
    if (c === '#' && satirBasi) {
      const bas = satir; let m = '';
      while (i < n && src[i] !== '\n') {
        if (src[i] === '\\' && src[i + 1] === '\n') { i += 2; satir++; continue; }
        if (src[i] === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; break; }
        m += src[i++];
      }
      T.push({ t: 'pp', v: m.trim(), line: bas }); continue;
    }
    satirBasi = false;
    if (c === 'R' && src[i + 1] === '"') { // ham metin: R"ayirac( ... )ayirac"
      const m = /^R"([^()\\\s"]{0,16})\(/.exec(src.slice(i));
      if (m) {
        const son = src.indexOf(')' + m[1] + '"', i + m[0].length);
        if (son < 0) throw new CppHata('Ham metin R"(...)" kapatılmamış: ")" ile bitmeli', satir);
        const govde = src.slice(i + m[0].length, son), bas = satir;
        for (const ch of govde) if (ch === '\n') satir++;
        T.push({ t: 'str', v: govde, line: bas }); i = son + m[1].length + 2; continue;
      }
    }
    if (/[A-Za-z_]/.test(c)) { let j = i + 1; while (j < n && /\w/.test(src[j])) j++; T.push({ t: 'id', v: src.slice(i, j), line: satir }); i = j; continue; }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
      const m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([uUlLfF]*)/.exec(src.slice(i));
      const hex = /^0[xXbB]/.test(m[1]);
      const ondalik = !hex && (/[.eE]/.test(m[1]) || /[fF]/.test(m[2]));
      T.push({ t: 'num', v: Number(m[1]), float: ondalik, line: satir }); i += m[0].length; continue;
    }
    if (c === '"') {
      let s = ''; const bas = satir; i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === '\n') throw new CppHata("Metin (\") kapatılmamış: kapanış çift tırnağı eksik", bas);
        s += src[i] === '\\' ? kacis() : src[i++];
      }
      if (i >= n) throw new CppHata("Metin (\") kapatılmamış: kapanış çift tırnağı eksik", bas);
      i++; T.push({ t: 'str', v: s, line: bas }); continue;
    }
    if (c === "'") {
      i++; let s = '';
      if (src[i] === '\\') s = kacis(); else if (i < n) s = src[i++];
      if (src[i] !== "'") throw new CppHata("Karakter (') kapatılmamış ya da birden fazla karakter içeriyor", satir);
      i++; T.push({ t: 'chr', v: s.charCodeAt(0), line: satir }); continue;
    }
    const op = OPLAR.find(o => src.startsWith(o, i));
    if (op) { T.push({ t: 'op', v: op, line: satir }); i += op.length; continue; }
    if ('+-*/%=<>!&|^~?:;,.(){}[]'.includes(c)) { T.push({ t: 'op', v: c, line: satir }); i++; continue; }
    throw new CppHata(`Tanınmayan karakter: '${c}'`, satir);
  }
  return T;
}

// Önişlemci: #include kaydı, #define sabitleri (nesne benzeri), makro açılımı.
function onisle(T) {
  const makro = new Map(), ekler = new Set(), out = [];
  const aç = (tok, derin, ziyaret) => {
    if (tok.t === 'id' && makro.has(tok.v) && derin < 12 && !ziyaret.has(tok.v)) {
      const z = new Set(ziyaret).add(tok.v);
      for (const b of makro.get(tok.v)) aç({ ...b, line: tok.line }, derin + 1, z);
    } else out.push(tok);
  };
  for (const tok of T) {
    if (tok.t === 'pp') {
      const m = /^#\s*(\w+)\s*(.*)$/.exec(tok.v);
      if (!m) continue;
      if (m[1] === 'include') { const a = /[<"]([^>"]+)[>"]/.exec(m[2]); if (a) ekler.add(a[1]); }
      else if (m[1] === 'define') {
        const d = /^([A-Za-z_]\w*)(\()?\s*(.*)$/.exec(m[2]);
        if (!d) throw new CppHata('#define için bir isim yazmalısın', tok.line);
        if (d[2]) throw new CppHata('Parametreli makrolar (#define F(x) ...) bu simülatörde desteklenmiyor; fonksiyon yaz', tok.line);
        makro.set(d[1], sozcukle(d[3], tok.line));
      } else if (m[1] === 'undef') makro.delete(m[2].trim());
      continue;
    }
    aç(tok, 0, new Set());
  }
  return { T: out, ekler };
}

function parantezDenetle(T) {
  const yig = [], es = { ')': '(', '}': '{', ']': '[' }, kapat = { '(': ')', '{': '}', '[': ']' };
  for (const k of T) {
    if (k.t !== 'op') continue;
    if ('({['.includes(k.v) && k.v.length === 1) yig.push(k);
    else if (')}]'.includes(k.v) && k.v.length === 1) {
      const ust = yig.pop();
      if (!ust) throw new CppHata(`Fazladan '${k.v}' var: bunu kapatacak açılmış bir '${es[k.v]}' yok`, k.line);
      if (ust.v !== es[k.v]) throw new CppHata(`'${ust.v}' (satır ${ust.line}) açılmış ama '${kapat[ust.v]}' ile kapatılmamış; burada '${k.v}' geldi`, ust.line);
    }
  }
  if (yig.length) { const u = yig[yig.length - 1]; throw new CppHata(`'${u.v}' açılmış ama kapatılmamış: '${kapat[u.v]}' eksik`, u.line); }
}

// ───────────────────────── Türler ve yerleşikler ─────────────────────────
const MOD = new Set(['const', 'static', 'volatile', 'unsigned', 'signed', 'extern', 'register']);
const TUR = new Map(Object.entries({
  int: 'int', long: 'int', short: 'int', byte: 'int', word: 'int', char: 'char', bool: 'bool', boolean: 'bool', float: 'float', double: 'float',
  void: 'void', String: 'String', Servo: 'Servo', LiquidCrystal_I2C: 'LCD', WebServer: 'Server', IPAddress: 'String',
  uint8_t: 'int', uint16_t: 'int', uint32_t: 'int', uint64_t: 'int', int8_t: 'int', int16_t: 'int', int32_t: 'int', int64_t: 'int', size_t: 'int',
}));
const SIRA = { int: 1, bool: 1, char: 2, float: 3, String: 4, Servo: 4, LCD: 4, Server: 4, void: 5 };
const BOYUT = { int: 4, bool: 1, char: 1, float: 4, String: 12, Servo: 4, LCD: 4, Server: 4 };
const SABIT = {
  HIGH: ['1', 'int'], LOW: ['0', 'int'], INPUT: ['0', 'int'], OUTPUT: ['1', 'int'], INPUT_PULLUP: ['2', 'int'], LED_BUILTIN: ['13', 'int'],
  true: ['true', 'bool'], false: ['false', 'bool'], PI: ['Math.PI', 'float'], HALF_PI: ['(Math.PI/2)', 'float'], TWO_PI: ['(Math.PI*2)', 'float'],
  DEG_TO_RAD: ['(Math.PI/180)', 'float'], RAD_TO_DEG: ['(180/Math.PI)', 'float'],
  INPUT_PULLDOWN: ['3', 'int'], WL_IDLE_STATUS: ['0', 'int'], WL_NO_SSID_AVAIL: ['1', 'int'], WL_CONNECTED: ['3', 'int'], WL_CONNECT_FAILED: ['4', 'int'], WL_CONNECTION_LOST: ['5', 'int'], WL_DISCONNECTED: ['6', 'int'],
  WIFI_OFF: ['0', 'int'], WIFI_STA: ['1', 'int'], WIFI_AP: ['2', 'int'], WIFI_AP_STA: ['3', 'int'], HTTP_GET: ['1', 'int'], HTTP_POST: ['3', 'int'], HTTP_ANY: ['0', 'int'],
  DEC: ['10', 'int'], HEX: ['16', 'int'], OCT: ['8', 'int'], BIN: ['2', 'int'], NULL: ['0', 'int'],
};
const YASAK = new Set('struct class enum union typedef using namespace template goto new delete try catch throw public private protected virtual friend operator'.split(' '));

// Yerleşik fonksiyonlar: [parametre türleri (i=tamsayı, f=ondalık, a=olduğu gibi), dönüş, seçenekler {min, aw}]
const BI = {
  pinMode: ['ii', 'void'], digitalWrite: ['ii', 'void'], digitalRead: ['i', 'int'], analogWrite: ['ii', 'void'], analogRead: ['i', 'int'],
  delay: ['i', 'void', { aw: 1 }], delayMicroseconds: ['i', 'void', { aw: 1 }], millis: ['', 'int'], micros: ['', 'int'],
  map: ['iiiii', 'int'], pow: ['ff', 'float'], sqrt: ['f', 'float'], sin: ['f', 'float'], cos: ['f', 'float'], tan: ['f', 'float'],
  asin: ['f', 'float'], acos: ['f', 'float'], atan: ['f', 'float'], atan2: ['ff', 'float'], log: ['f', 'float'], log10: ['f', 'float'], exp: ['f', 'float'],
  floor: ['f', 'float'], ceil: ['f', 'float'], round: ['f', 'int'], fabs: ['f', 'float'], radians: ['f', 'float'], degrees: ['f', 'float'],
  randomSeed: ['i', 'void'], random: ['ii', 'int', { min: 1 }], tone: ['iii', 'void', { min: 2 }], noTone: ['i', 'void'],
  pulseIn: ['iii', 'int', { min: 2 }], mesafeOlc: ['i', 'int'], analogReadResolution: ['i', 'void'], analogSetAttenuation: ['a', 'void'], yield: ['', 'void'],
  touchRead: ['i', 'int'], temperatureRead: ['', 'float'], ledcSetup: ['iii', 'int'], ledcAttachPin: ['ii', 'void'], ledcAttach: ['iii', 'int'], ledcWrite: ['ii', 'void'],
  lowByte: ['i', 'int'], highByte: ['i', 'int'], bitRead: ['ii', 'int'],
  constrain: ['aaa', '*'], min: ['aa', '*'], max: ['aa', '*'], abs: ['a', '*'], sq: ['a', '*'],
};

const STR_YONTEM = { // ad: [min, max, dönüş, parametre türleri]
  length: [0, 0, 'int'], substring: [1, 2, 'String', 'ii'], toInt: [0, 0, 'int'], toFloat: [0, 0, 'float'], charAt: [1, 1, 'char', 'i'],
  indexOf: [1, 2, 'int', 'si'], lastIndexOf: [1, 1, 'int', 's'], equals: [1, 1, 'bool', 's'], equalsIgnoreCase: [1, 1, 'bool', 's'],
  startsWith: [1, 1, 'bool', 's'], endsWith: [1, 1, 'bool', 's'], c_str: [0, 0, 'String'], toString: [0, 0, 'String'], isEmpty: [0, 0, 'bool'], compareTo: [1, 1, 'int', 's'],
  toUpperCase: [0, 0, 'void', '', 'mut'], toLowerCase: [0, 0, 'void', '', 'mut'], trim: [0, 0, 'void', '', 'mut'],
  replace: [2, 2, 'void', 'ss', 'mut'], remove: [1, 2, 'void', 'ii', 'mut'], concat: [1, 1, 'bool', 's', 'mut'], reserve: [1, 1, 'void', 'i'],
};
const SERVO_YONTEM = { attach: [1, 3, 'int', 'iii'], write: [1, 1, 'void', 'i'], writeMicroseconds: [1, 1, 'void', 'i'], read: [0, 0, 'int'], detach: [0, 0, 'void'], attached: [0, 0, 'bool'] };
const LCD_YONTEM = {
  init: [0, 0, 'void'], begin: [0, 2, 'void', 'ii'], backlight: [0, 0, 'void'], noBacklight: [0, 0, 'void'], display: [0, 0, 'void'], noDisplay: [0, 0, 'void'],
  clear: [0, 0, 'void'], home: [0, 0, 'void'], setCursor: [2, 2, 'void', 'ii'], cursor: [0, 0, 'void'], noCursor: [0, 0, 'void'], blink: [0, 0, 'void'], noBlink: [0, 0, 'void'],
  print: [1, 2, 'int', 'print'], println: [1, 2, 'int', 'print'], write: [1, 1, 'int', 'print'], createChar: [2, 2, 'void', 'aa'],
};
const SERIAL_YONTEM = {
  begin: [0, 2, 'void', 'aa'], end: [0, 0, 'void'], print: [0, 2, 'int', 'print'], println: [0, 2, 'int', 'print'], printf: [1, 99, 'int', 'printf'],
  write: [1, 1, 'int', 'print'], available: [0, 0, 'int'], read: [0, 0, 'int'], peek: [0, 0, 'int'], flush: [0, 0, 'void'], parseInt: [0, 0, 'int'], parseFloat: [0, 0, 'float'],
  readString: [0, 0, 'String'], setTimeout: [1, 1, 'void', 'i'],
};
const WIFI_YONTEM = {
  begin: [0, 2, 'int', 'ss'], status: [0, 0, 'int'], localIP: [0, 0, 'String'], softAP: [1, 3, 'bool', 'ssi'], softAPIP: [0, 0, 'String'], disconnect: [0, 2, 'bool'],
  mode: [1, 1, 'bool', 'i'], SSID: [0, 0, 'String'], RSSI: [0, 0, 'int'], macAddress: [0, 0, 'String'], isConnected: [0, 0, 'bool'], reconnect: [0, 0, 'bool'], setHostname: [1, 1, 'bool', 's'], setSleep: [1, 1, 'bool', 'i'],
};
const SERVER_YONTEM = {
  on: [2, 3, 'void', 'special'], onNotFound: [1, 1, 'void', 'special'], begin: [0, 1, 'void', 'i'], handleClient: [0, 0, 'void'], stop: [0, 0, 'void'], close: [0, 0, 'void'],
  send: [1, 3, 'void', 'iss'], sendHeader: [2, 3, 'void', 'ssi'], arg: [1, 1, 'String', 's'], hasArg: [1, 1, 'bool', 's'], uri: [0, 0, 'String'], method: [0, 0, 'int'], args: [0, 0, 'int'],
};
const WIRE_YONTEM = { begin: [0, 2, 'void', 'ii'], setClock: [1, 1, 'void', 'i'] };

const uzaklik = (a, b) => { // Levenshtein
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

const V = (c, t, ek = {}) => ({ c, t, lv: false, dims: 0, ...ek });
const ATAMA = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
const ONCELIK = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };

// ───────────────────────── Derleyici ─────────────────────────
class Derleyici {
  constructor(T, ekler) {
    this.T = T; this.p = 0; this.ekler = ekler; this.scopes = [new Map()]; this.fns = new Map();
    this.dongu = 0; this.sw = 0; this.fn = null;
  }
  get cur() { return this.T[this.p] ?? { t: 'eof', v: '', line: this.T.length ? this.T[this.T.length - 1].line : 1 }; }
  nextTok(k = 1) { return this.T[this.p + k] ?? { t: 'eof', v: '', line: 0 }; }
  hata(m, satir = this.cur.line) { throw new CppHata(m, satir); }
  op(v) { return this.cur.t === 'op' && this.cur.v === v; }
  idIs(v) { return this.cur.t === 'id' && this.cur.v === v; }
  eat(v) { if (this.op(v)) { this.p++; return true; } return false; }
  oncekiSatir() { const pr = this.T[this.p - 1]; const c = this.cur; return (c.t === 'eof' || (pr && c.line > pr.line)) && pr ? pr.line : c.line; }
  need(v) {
    if (this.eat(v)) return;
    const m = { ';': "';' eksik olabilir", ')': "')' eksik olabilir", '(': "'(' bekleniyordu", '}': "'}' eksik olabilir", ']': "']' eksik olabilir", ':': "':' eksik olabilir" }[v]
      ?? `'${v}' bekleniyordu`;
    this.hata(m + (this.cur.t !== 'eof' && v !== ';' ? ` ('${this.cur.v}' yerine)` : ''), this.oncekiSatir());
  }
  isTypeTok(k) { return k.t === 'id' && (MOD.has(k.v) || TUR.has(k.v)); }

  // kapsam
  ac() { this.scopes.push(new Map()); } kapa() { this.scopes.pop(); }
  ara(ad) { for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].has(ad)) return this.scopes[i].get(ad); return null; }
  tanimla(ad, bilgi, satir) {
    const s = this.scopes[this.scopes.length - 1];
    if (s.has(ad)) this.hata(`'${ad}' bu bölümde zaten tanımlanmış`, satir);
    if (SABIT[ad] || /^(D([0-9]|1[0-4])|A[0-7])$/.test(ad) || TUR.has(ad) || YASAK.has(ad)) this.hata(`'${ad}' ayrılmış bir isimdir, değişken adı olarak kullanılamaz`, satir);
    s.set(ad, bilgi);
  }
  oner(ad) {
    const aday = new Set([...Object.keys(BI), ...this.fns.keys(), ...Object.keys(SABIT)]);
    for (const s of this.scopes) for (const k of s.keys()) aday.add(k);
    let en = null, ed = 3;
    for (const a of aday) { const d = uzaklik(ad, a); if (d < ed && d <= Math.max(1, Math.floor(ad.length / 3))) { ed = d; en = a; } }
    return en ? ` Bunu mu demek istedin: ${en}?` : '';
  }

  // tür dönüşümü
  donustur(v, hedef, satir = this.cur.line) {
    const k = v.t;
    if (v.dims) this.hata('Dizi bir değer olarak kullanılamaz (köşeli parantezle eleman seç: dizi[0])', satir);
    if (hedef === k || hedef === 'void') return v.c;
    if (k === 'void') this.hata('Değer döndürmeyen (void) bir fonksiyonun sonucu kullanılamaz', satir);
    if (hedef === 'String') return this.metne(v, null, satir);
    if (k === 'String') this.hata(`String (metin) ${hedef === 'bool' ? 'mantıksal' : 'sayı'} değerine dönüştürülemez; sayıya çevirmek için toInt() kullan`, satir);
    if (k === 'Servo' || k === 'LCD' || k === 'Server' || hedef === 'Servo' || hedef === 'LCD' || hedef === 'Server') this.hata('Bu tür değerler (Servo/LCD) böyle kullanılamaz', satir);
    if (hedef === 'int' || hedef === 'char') return k === 'float' ? `Math.trunc(${v.c})` : k === 'bool' ? `(${v.c} ? 1 : 0)` : v.c;
    if (hedef === 'float') return k === 'bool' ? `(${v.c} ? 1 : 0)` : v.c;
    if (hedef === 'bool') return `(${v.c} != 0)`;
    return v.c;
  }
  metne(v, ek, satir = this.cur.line) {
    if (v.dims) this.hata('Dizi yazdırılamaz; elemanlarını tek tek yazdır', satir);
    switch (v.t) {
      case 'String': return v.c;
      case 'int': return ek ? `$.taban(${v.c}, ${this.donustur(ek, 'int')})` : `String(${v.c})`;
      case 'float': return `$.f2(${v.c}${ek ? ', ' + this.donustur(ek, 'int') : ''})`;
      case 'bool': return `(${v.c} ? "1" : "0")`;
      case 'char': return `String.fromCharCode(${v.c})`;
      default: return this.hata(`${v.t === 'void' ? 'Değer döndürmeyen bir fonksiyonun sonucu' : 'Bu değer'} yazıya çevrilemez`, satir);
    }
  }
  yukselt(a, b) { return a.t === 'float' || b.t === 'float' ? 'float' : 'int'; }

  // ── üst düzey ──
  derle() {
    this.onTara();
    const parcalar = [];
    while (this.cur.t !== 'eof') parcalar.push(this.ustDuzey());
    for (const ad of ['setup', 'loop']) {
      const f = this.fns.get(ad);
      if (!f || !f.tanimli) this.hata(`${ad}() fonksiyonu bulunamadı: programda "void ${ad}() { ... }" olmalı`, 1);
      if (f.ret !== 'void' || f.params.length) this.hata(`${ad}() fonksiyonu "void ${ad}()" biçiminde olmalı`, f.satir);
    }
    return `let $y = 1000;\n${parcalar.join('\n')}\nreturn { setup: f_setup, loop: f_loop };`;
  }
  // Fonksiyon imzalarını önceden topla (tanımdan önce çağrı yapılabilsin).
  onTara() {
    const T = this.T; let d = 0, bas = 0;
    const tipSozu = k => this.isTypeTok(k) || (k.t === 'op' && k.v === '*');
    for (let i = 0; i < T.length; i++) {
      const k = T[i]; if (k.t !== 'op') continue;
      if (k.v === '(') {
        if (d === 0 && i > bas + 1 && T[i - 1].t === 'id' && this.isTypeTok(T[bas])) {
          let tamam = true; for (let j = bas; j < i - 1; j++) if (!tipSozu(T[j])) tamam = false;
          if (tamam && !T.slice(bas, i).some(x => x.v === 'LiquidCrystal_I2C' || x.v === 'Servo' || x.v === 'WebServer')) { const sk = this.p; this.p = bas; try { this.imza(false); } catch { /* asıl geçişte bildirilir */ } this.p = sk; }
        }
        d++;
      } else if (k.v === '{' || k.v === '[') d++;
      else if (k.v === ')' || k.v === ']') d--;
      else if (k.v === '}') { d--; if (d === 0) bas = i + 1; } else if (k.v === ';' && d === 0) bas = i + 1;
    }
    this.p = 0;
  }
  imza(sonKayit) { // tür ad ( parametreler ) -> kaydeder
    const satir = this.cur.line;
    const { t } = this.tur(); const ad = this.ad(); this.need('(');
    const params = this.parametreler();
    const f = this.fns.get(ad);
    if (f && f.imzaVar && sonKayit === 'tanim' && f.tanimli) this.hata(`'${ad}' fonksiyonu zaten tanımlanmış`, satir);
    if (!f) this.fns.set(ad, { ret: t, params, satir, imzaVar: true, tanimli: false });
    return this.fns.get(ad);
  }
  ad() {
    const k = this.cur;
    if (k.t !== 'id') this.hata(`Bir isim bekleniyordu${k.t === 'eof' ? '' : `, ama '${k.v}' bulundu`}`, k.t === 'eof' ? this.oncekiSatir() : k.line);
    this.p++; return k.v;
  }
  tur() {
    const k0 = this.cur; let taban = null, sabit = false, say = 0;
    while (this.isTypeTok(this.cur)) {
      const w = this.cur.v; say++;
      if (w === 'const') sabit = true;
      if (TUR.has(w)) { const t = TUR.get(w); if (taban === null || SIRA[t] > SIRA[taban]) taban = t; }
      this.p++;
    }
    if (!say) this.hata('Bir tür bekleniyordu', k0.line);
    taban ??= 'int';
    if (this.op('*')) {
      if (taban === 'char') { this.p++; taban = 'String'; } else this.hata('İşaretçiler (*) bu simülatörde desteklenmiyor', this.cur.line);
    }
    if (this.op('&')) this.hata('Referanslar (&) bu simülatörde desteklenmiyor; değeri return ile geri döndür', this.cur.line);
    this.turDenetle(taban, k0.line);
    return { t: taban, sabit };
  }
  turDenetle(t, satir) {
    if (t === 'Servo' && ![...this.ekler].some(e => /Servo/i.test(e))) this.hata("'Servo' tanınmıyor: dosyanın başına #include <ESP32Servo.h> eklemeyi unuttun mu?", satir);
    if (t === 'Server' && ![...this.ekler].some(e => /WebServer/i.test(e))) this.hata("'WebServer' tanınmıyor: dosyanın başına #include <WebServer.h> eklemeyi unuttun mu?", satir);
    if (t === 'LCD' && ![...this.ekler].some(e => /LiquidCrystal_I2C/i.test(e))) this.hata("'LiquidCrystal_I2C' tanınmıyor: dosyanın başına #include <LiquidCrystal_I2C.h> eklemeyi unuttun mu?", satir);
  }
  parametreler() { // '(' okundu
    const ps = [];
    if (this.eat(')')) return ps;
    if (this.idIs('void') && this.nextTok().t === 'op' && this.nextTok().v === ')') { this.p += 2; return ps; }
    for (;;) {
      if (!this.isTypeTok(this.cur)) this.hata(`Parametre türü bekleniyordu (ör. int x)${this.cur.t === 'eof' ? '' : `, ama '${this.cur.v}' bulundu`}`, this.cur.line);
      const { t } = this.tur(); const ad = this.ad(); let dims = 0;
      while (this.eat('[')) { if (!this.op(']')) this.expr(); this.need(']'); dims++; }
      if (this.op('=')) this.hata('Parametrelere varsayılan değer verilemez (void f(int x = 5) desteklenmiyor)');
      ps.push({ ad, t, dims });
      if (this.eat(',')) continue;
      this.need(')'); return ps;
    }
  }
  ustDuzey() {
    const k = this.cur;
    if (k.t === 'id' && YASAK.has(k.v)) this.hata(`'${k.v}' bu simülatörde desteklenmiyor`, k.line);
    if (!this.isTypeTok(k)) this.hata(`Burada '${k.v}' beklenmiyordu; fonksiyon ya da değişken tanımı (ör. int sayi = 0;) olmalı`, k.line);
    const bas = this.p; const { t, sabit } = this.tur(); const satir = k.line;
    const ad = this.ad();
    if (this.op('(') && t !== 'Servo' && t !== 'LCD' && t !== 'Server') {
      this.p = bas; const f = this.imza('tanim'); // imza (yeniden)
      if (this.eat(';')) return '';
      if (!this.op('{')) this.hata("Fonksiyon gövdesi için '{' bekleniyordu", this.oncekiSatir());
      if (f.tanimli) this.hata(`'${ad}' fonksiyonu zaten tanımlanmış`, satir);
      f.tanimli = true; f.satir = satir;
      this.ac(); this.fn = f;
      for (const q of f.params) this.tanimla(q.ad, { t: q.t, dims: q.dims, js: 'v_' + q.ad }, satir);
      const g = this.blokIc();
      this.kapa(); this.fn = null;
      return `async function f_${ad}(${f.params.map(q => 'v_' + q.ad).join(', ')}) {\n${g}}`;
    }
    this.p = bas; this.tur();
    return this.degiskenler(t, sabit, true);
  }
  blokIc() { // '{' ... '}' (kapsam çağıran tarafından açılır)
    this.need('{'); let s = '';
    while (!this.op('}')) { if (this.cur.t === 'eof') this.hata("'}' eksik olabilir", this.oncekiSatir()); s += this.stmt() + '\n'; }
    this.p++; return s;
  }

  // ── değişken bildirimi ── (tür zaten okundu)
  degiskenler(t, sabit, glob) {
    let kod = '';
    for (;;) {
      kod += this.bildirici(t, sabit);
      if (this.eat(',')) continue;
      this.need(';'); return kod;
    }
  }
  varsayilan(t, satir) {
    switch (t) {
      case 'int': case 'float': case 'char': return '0';
      case 'bool': return 'false'; case 'String': return '""'; case 'Servo': return 'new $.Servo()'; case 'Server': return 'new $.WebServer(80)';
      default: return this.hata('LiquidCrystal_I2C için adres ve boyut gerekir: LiquidCrystal_I2C lcd(0x27, 16, 2);', satir);
    }
  }
  bildirici(t, sabit) {
    const satir = this.cur.line; const ad = this.ad();
    if (t === 'void') this.hata("Değişken türü 'void' olamaz", satir);
    const boyut = [];
    while (this.eat('[')) { boyut.push(this.op(']') ? null : this.donustur(this.expr(), 'int')); this.need(']'); }
    let js, bilgi = { t, dims: boyut.length, js: 'v_' + ad, sabit };
    if (boyut.length) {
      if (t === 'char') this.hata("Karakter dizileri (char dizi[]) desteklenmiyor; String kullan", satir);
      let ilk = null;
      if (this.eat('=')) { if (!this.op('{')) this.hata("Dizi için '{ ... }' listesi bekleniyordu", this.cur.line); ilk = this.liste(t, boyut.length); }
      else if (boyut[0] === null) this.hata(`'${ad}' dizisinin boyutu belli değil: boyut yaz (ör. int ${ad}[5]) ya da değerleri ver`, satir);
      const bs = boyut.map((b, i) => b ?? (i === 0 ? ilk.sayi : this.hata('Dizinin ilk boyutu dışındakiler yazılmalı', satir)));
      js = ilk && boyut[0] === null && boyut.length === 1 ? ilk.kod : `$.dizi([${bs.join(', ')}], () => ${this.varsayilan(t, satir)}${ilk ? ', ' + ilk.kod : ''})`;
    } else if (this.eat('=')) {
      if (this.op('{')) this.hata("Tek değişkene '{ }' listesi verilemez; dizi tanımlamak için ad[] yaz", this.cur.line);
      const d = this.assign(); js = this.donustur(d, t, satir);
    } else if (this.op('(')) {
      this.p++; const a = this.argumanlar();
      if (t === 'LCD') js = `new $.LCD(${a.map(x => this.donustur(x, 'int')).join(', ')})`;
      else if (t === 'Servo') js = 'new $.Servo()';
      else if (t === 'Server') js = `new $.WebServer(${a.length ? this.donustur(a[0], 'int') : 80})`;
      else if (a.length === 1) js = this.donustur(a[0], t, satir);
      else this.hata(`'${ad}' için kurucu bu şekilde desteklenmiyor`, satir);
    } else js = this.varsayilan(t, satir);
    this.tanimla(ad, bilgi, satir);
    return `$.L=${satir}; let v_${ad} = ${js};\n`;
  }
  liste(t, derinlik) { // '{' ... '}' -> {kod, sayi}
    this.need('{'); const ogeler = [];
    while (!this.op('}')) {
      if (this.op('{')) { if (derinlik < 2) this.hata('Bu dizi için iç içe { } kullanılamaz', this.cur.line); ogeler.push(this.liste(t, derinlik - 1).kod); }
      else ogeler.push(this.donustur(this.assign(), t));
      if (!this.eat(',')) break;
    }
    this.need('}');
    return { kod: `[${ogeler.join(', ')}]`, sayi: ogeler.length };
  }

  // ── deyimler ──
  govde() { this.ac(); const s = this.stmt(); this.kapa(); return `{ ${s} }`; }
  yield() { return 'if (--$y < 0) { $y = 1000; await sim.tick(); } '; }
  kosul() { this.need('('); const e = this.virgul(); this.need(')'); return this.kosulIfade(e); }
  stmt() {
    const k = this.cur;
    if (k.t === 'op') {
      if (k.v === '{') { this.ac(); const s = this.blokIc(); this.kapa(); return `{\n${s}}`; }
      if (k.v === ';') { this.p++; return ''; }
    }
    if (k.t === 'id') {
      if (YASAK.has(k.v)) this.hata(`'${k.v}' bu simülatörde desteklenmiyor`, k.line);
      switch (k.v) {
        case 'if': {
          this.p++; const c = this.kosul(); let s = `if (${c}) ${this.govde()}`;
          if (this.idIs('else')) { this.p++; s += ` else ${this.govde()}`; }
          return s;
        }
        case 'else': return this.hata("'else' için önce bir 'if' olmalı", k.line);
        case 'while': { this.p++; const c = this.kosul(); this.dongu++; const g = this.govde(); this.dongu--; return `while (${c}) { ${this.yield()}${g} }`; }
        case 'do': {
          this.p++; this.dongu++; const g = this.govde(); this.dongu--;
          if (!this.idIs('while')) this.hata("do { ... } bloğundan sonra 'while (koşul);' gerekir", this.oncekiSatir());
          this.p++; const c = this.kosul(); this.need(';');
          return `do { ${this.yield()}${g} } while (${c});`;
        }
        case 'for': return this.forDongu();
        case 'switch': return this.switchDeyim();
        case 'break': this.p++; if (!this.dongu && !this.sw) this.hata("'break' yalnızca döngü ya da switch içinde kullanılabilir", k.line); this.need(';'); return 'break;';
        case 'continue': this.p++; if (!this.dongu) this.hata("'continue' yalnızca döngü içinde kullanılabilir", k.line); this.need(';'); return 'continue;';
        case 'return': {
          this.p++; const f = this.fn;
          if (this.eat(';')) { if (f.ret !== 'void') this.hata(`Bu fonksiyon ${f.ret} döndürmeli: 'return değer;' yaz`, k.line); return 'return;'; }
          if (f.ret === 'void') this.hata('void fonksiyon değer döndüremez', k.line);
          const e = this.virgul(); this.need(';');
          return `$.L=${k.line}; return ${this.donustur(e, f.ret, k.line)};`;
        }
      }
      if (this.isTypeTok(k)) { const { t, sabit } = this.tur(); return this.degiskenler(t, sabit, false); }
      const sn = this.nextTok();
      if (sn.t === 'id' && !this.ara(k.v) && !BI[k.v] && !this.fns.has(k.v) && !SABIT[k.v]) this.hata(`'${k.v}' bilinmeyen bir tür ya da komut.${this.oner(k.v)}`, k.line);
    }
    const e = this.virgul(); this.need(';');
    return `$.L=${k.line}; ${e.c};`;
  }
  forDongu() {
    const k = this.cur; this.p++; this.need('(');
    this.ac(); let ilk = '';
    if (!this.op(';')) {
      if (this.isTypeTok(this.cur)) {
        const { t, sabit } = this.tur(); const parca = [];
        for (;;) { parca.push(this.bildirici(t, sabit).replace(/^\$\.L=\d+; let /, '').replace(/;\n$/, '')); if (!this.eat(',')) break; }
        ilk = 'let ' + parca.join(', ');
      } else ilk = this.virgul().c;
    }
    this.need(';');
    const c = this.op(';') ? 'true' : this.kosulIfade(this.virgul()); this.need(';');
    const art = this.op(')') ? '' : this.virgul().c; this.need(')');
    this.dongu++; const g = this.govde(); this.dongu--; this.kapa();
    return `$.L=${k.line}; for (${ilk}; ${c}; ${art}) { ${this.yield()}${g} }`;
  }
  kosulIfade(e) { return e.t === 'String' ? this.hata('Koşul String olamaz; karşılaştırma kullan (ör. s == "a")') : e.c; }
  switchDeyim() {
    const k = this.cur; this.p++; this.need('('); const e = this.virgul(); this.need(')');
    if (e.t === 'String' || e.t === 'float') this.hata('switch yalnızca tamsayı/karakter değerleriyle çalışır', k.line);
    this.need('{'); this.ac(); this.sw++; let s = `switch (${this.donustur(e, 'int')}) {\n`;
    while (!this.op('}')) {
      if (this.cur.t === 'eof') this.hata("'}' eksik olabilir", this.oncekiSatir());
      if (this.idIs('case')) { this.p++; const c = this.ternary(); this.need(':'); s += `case ${this.donustur(c, 'int')}:\n`; }
      else if (this.idIs('default')) { this.p++; this.need(':'); s += 'default:\n'; }
      else s += this.stmt() + '\n';
    }
    this.p++; this.sw--; this.kapa(); return s + '}';
  }

  // ── ifadeler ──
  virgul() { let e = this.assign(); while (this.op(',')) { this.p++; const r = this.assign(); e = V(`(${e.c}, ${r.c})`, r.t); } return e; }
  expr() { return this.assign(); }
  assign() {
    const L = this.ternary(); const k = this.cur;
    if (k.t === 'op' && ATAMA.has(k.v)) {
      if (!L.lv) this.hata('Atamanın sol tarafı bir değişken (ya da dizi elemanı) olmalı', k.line);
      if (L.sabit) this.hata('const (sabit) bir değişkene değer atanamaz', k.line);
      this.p++; const R = this.assign();
      let deger;
      if (k.v === '=') deger = this.donustur(R, L.t, k.line);
      else {
        if (L.dims) this.hata('Dizinin tamamına işlem uygulanamaz', k.line);
        const r = this.ikili(k.v.slice(0, -1), L, R, k.line);
        deger = this.donustur(r, L.t, k.line);
      }
      return V(`(${L.c} = ${deger})`, L.t);
    }
    return L;
  }
  ternary() {
    const c = this.ikiliAra(1);
    if (!this.op('?')) return c;
    this.p++; const a = this.assign(); this.need(':'); const b = this.assign();
    let t = a.t;
    if (a.t !== b.t) { if (a.t === 'String' || b.t === 'String') t = 'String'; else t = this.yukselt(a, b); }
    return V(`(${this.kosulIfade(c)} ? ${this.donustur(a, t)} : ${this.donustur(b, t)})`, t);
  }
  ikiliAra(min) {
    let sol = this.unary();
    for (;;) {
      const k = this.cur; const o = k.t === 'op' ? ONCELIK[k.v] : undefined;
      if (!o || o < min) return sol;
      this.p++; const sag = this.ikiliAra(o + 1);
      sol = this.ikili(k.v, sol, sag, k.line);
    }
  }
  ikili(op, A, B, satir) {
    if (A.dims || B.dims) this.hata('Dizi bu işlemde kullanılamaz', satir);
    if (A.t === 'void' || B.t === 'void') this.hata('Değer döndürmeyen (void) bir fonksiyonun sonucu kullanılamaz', satir);
    if (['Servo', 'LCD', 'Server', 'WiFi'].includes(A.t) || ['Servo', 'LCD', 'Server', 'WiFi'].includes(B.t)) this.hata('Servo/LCD/WebServer nesneleri işlemlerde kullanılamaz', satir);
    if (op === '&&' || op === '||') return V(`(${A.c} ${op} ${B.c})`, 'bool');
    const as = A.t === 'String', bs = B.t === 'String';
    if (op === '+' && (as || bs)) return V(`(${this.metne(A)} + ${this.metne(B)})`, 'String');
    if (as || bs) {
      if (!as || !bs) this.hata(`String ile sayı '${op}' ile birlikte kullanılamaz; sayıyı String(x) ile metne çevir`, satir);
      if (op === '==') return V(`(${A.c} === ${B.c})`, 'bool'); if (op === '!=') return V(`(${A.c} !== ${B.c})`, 'bool');
      if (['<', '>', '<=', '>='].includes(op)) return V(`(${A.c} ${op} ${B.c})`, 'bool');
      this.hata(`String'lerle '${op}' işlemi yapılamaz`, satir);
    }
    if (['==', '!=', '<', '>', '<=', '>='].includes(op)) return V(`(${A.c} ${op} ${B.c})`, 'bool');
    const ond = A.t === 'float' || B.t === 'float';
    if (op === '/') return ond ? V(`(${A.c} / ${B.c})`, 'float') : V(`$.bol(${A.c}, ${B.c})`, 'int');
    if (op === '%') {
      if (ond) this.hata("'%' (kalan) yalnızca tamsayılarla kullanılabilir", satir);
      return V(`$.kalan(${A.c}, ${B.c})`, 'int');
    }
    if (['+', '-', '*'].includes(op)) return V(`(${A.c} ${op} ${B.c})`, ond ? 'float' : 'int');
    if (ond) this.hata(`'${op}' işlemi ondalıklı sayılarla yapılamaz`, satir);
    return V(`(${A.c} ${op} ${B.c})`, 'int');
  }
  unary() {
    const k = this.cur;
    if (k.t === 'op') {
      switch (k.v) {
        case '!': { this.p++; const e = this.unary(); return V(`(!${this.kosulIfade(e)})`, 'bool'); }
        case '-': case '+': { this.p++; const e = this.unary(); if (e.t === 'String') this.hata("String'e '-' uygulanamaz", k.line); return V(k.v === '-' ? `(-${e.c})` : e.c, e.t === 'float' ? 'float' : 'int'); }
        case '~': { this.p++; const e = this.unary(); return V(`(~${e.c})`, 'int'); }
        case '++': case '--': {
          this.p++; const e = this.unary();
          if (!e.lv) this.hata(`'${k.v}' yalnızca değişkene uygulanabilir`, k.line);
          if (e.sabit) this.hata('const (sabit) bir değişken değiştirilemez', k.line);
          return V(`(${k.v}${e.c})`, e.t);
        }
        case '*': case '&': return this.hata('İşaretçiler ve adres işleci (* ve &) bu simülatörde desteklenmiyor', k.line);
        case '(':
          if (this.isTypeTok(this.nextTok()) && this.castMi()) {
            this.p++; const { t } = this.tur(); this.need(')');
            const e = this.unary();
                        return V(this.donustur(e, t), t);
          }
      }
    }
    if (k.t === 'id' && k.v === 'sizeof') return this.sizeofIfade();
    return this.sonek(this.birincil());
  }
  castMi() { let j = this.p + 1; while (this.isTypeTok(this.T[j] ?? {}) || (this.T[j]?.t === 'op' && this.T[j].v === '*')) j++; return this.T[j]?.t === 'op' && this.T[j].v === ')'; }
  sizeofIfade() {
    this.p++; this.need('(');
    let r;
    if (this.isTypeTok(this.cur)) { const { t } = this.tur(); r = V(String(BOYUT[t] ?? 4), 'int'); }
    else { const e = this.assign(); const b = BOYUT[e.t] ?? 4; r = V(e.dims ? `($.say(${e.c}) * ${b})` : String(b), 'int'); }
    this.need(')'); return r;
  }
  sonek(e) {
    for (;;) {
      const k = this.cur;
      if (k.t !== 'op') return e;
      if (k.v === '[') {
        this.p++; const i = this.virgul(); this.need(']');
        if (e.dims) {
          const ic = this.donustur(i, 'int', k.line);
          e = V(`${e.c}[$.ix(${e.c}, ${ic})]`, e.t, { lv: true, dims: e.dims - 1, sabit: e.sabit });
        } else if (e.t === 'String') e = V(`$.harf(${e.c}, ${this.donustur(i, 'int')})`, 'char');
        else this.hata('Köşeli parantez yalnızca dizilerde (ve String\'lerde) kullanılabilir', k.line);
      } else if (k.v === '++' || k.v === '--') {
        if (!e.lv) this.hata(`'${k.v}' yalnızca değişkene uygulanabilir`, k.line);
        if (e.sabit) this.hata('const (sabit) bir değişken değiştirilemez', k.line);
        this.p++; e = V(`(${e.c}${k.v})`, e.t);
      } else if (k.v === '.') {
        this.p++; e = this.uye(e, k.line);
      } else return e;
    }
  }
  argumanlar() { // '(' okundu; ')' dahil okur
    const a = [];
    if (this.eat(')')) return a;
    for (;;) {
      a.push(this.assign());
      if (this.eat(',')) continue;
      if (this.eat(')')) return a;
      this.hata("',' ya da ')' eksik olabilir" + (this.cur.t !== 'eof' ? ` ('${this.cur.v}' yerine)` : ''), this.oncekiSatir());
    }
  }
  sayiDenetle(ad, a, min, max, satir) {
    if (a.length < min || a.length > max) {
      const bek = min === max ? `${min}` : `${min}-${max === 99 ? '...' : max}`;
      this.hata(`${ad}() ${bek} değer ister ama ${a.length} değer verilmiş`, satir);
    }
  }
  yazdirKodu(a, satir) { // print/println/write argümanları -> [metin ifadesi]
    return a.length ? this.metne(a[0], a[1], satir) : '""';
  }
  uye(nesne, satir) {
    const ad = this.ad(); const tablo = { String: STR_YONTEM, Servo: SERVO_YONTEM, LCD: LCD_YONTEM, Serial: SERIAL_YONTEM, Wire: WIRE_YONTEM, WiFi: WIFI_YONTEM, Server: SERVER_YONTEM }[nesne.t];
    if (!tablo || nesne.dims) return this.hata(`Bu değerin '${ad}' üyesi yok`, satir);
    const m = tablo[ad];
    if (!m) {
      const oner = Object.keys(tablo).find(x => uzaklik(x, ad) <= 1);
      return this.hata(`${nesne.t === 'LCD' ? 'LCD' : nesne.t}'in '${ad}' diye bir komutu yok${oner ? `. Bunu mu demek istedin: ${oner}?` : ''}`, satir);
    }
    if (!this.op('(')) this.hata(`'${ad}' bir komuttur; sonuna () ve ; koy`, satir);
    if (nesne.t === 'Server' && m[3] === 'special') return this.yolKaydi(nesne, ad, satir);
    this.p++; const a = this.argumanlar();
    this.sayiDenetle(`${nesne.c === 'serial' ? 'Serial.' : ''}${ad}`, a, m[0], m[1], satir);
    const tur = m[3];
    let args;
    if (nesne.t === 'Wire') return V('0', 'void');
    if (tur === 'print') {
      if (nesne.t === 'LCD') return V(`${nesne.c}.print(${this.yazdirKodu(a, satir)})`, 'int');
      args = this.yazdirKodu(a, satir);
      if (nesne.t === 'Serial') return V(`$.${ad === 'println' ? 'println' : 'print'}(${args})`, 'int');
    } else if (tur === 'printf') {
      if (a[0].t !== 'String') this.hata('Serial.printf ilk değer olarak biçim metni ("...") ister', satir);
      return V(`$.printf(${a.map(x => this.metneDeger(x)).join(', ')})`, 'int');
    }
    if (nesne.t === 'Serial') {
      if (ad === 'begin' || ad === 'end' || ad === 'flush' || ad === 'setTimeout') return V('0', 'void');
      if (ad === 'write') return V(`$.print(${this.metne(a[0], null, satir)})`, 'int');
      return V(ad === 'available' ? '0' : ad === 'parseInt' || ad === 'read' || ad === 'peek' ? (ad === 'parseInt' ? '0' : '-1') : ad === 'parseFloat' ? '0' : '""', m[2]);
    }
    // String ve Servo / LCD genel çağrı
    const kv = (a, tur) => a.map((x, i) => {
      const c = tur?.[i] ?? 'a';
      return c === 'i' ? this.donustur(x, 'int', satir) : c === 's' ? this.metne(x, null, satir) : this.donustur(x, 'int', satir);
    });
    args = kv(a, tur).join(', ');
    if (nesne.t === 'String') {
      if (m[4] === 'mut') {
        if (!nesne.lv) this.hata(`${ad}() yalnızca bir String değişkenine uygulanabilir`, satir);
        const fn = ad === 'concat' ? 'concat' : ad;
        return V(`(${nesne.c} = $.s_${fn}(${nesne.c}${args ? ', ' + args : ''}), ${ad === 'concat' ? 'true' : '0'})`, m[2]);
      }
      if (ad === 'length') return V(`${nesne.c}.length`, 'int');
      if (ad === 'c_str' || ad === 'toString') return V(nesne.c, 'String');
      return V(`$.s_${ad}(${nesne.c}${args ? ', ' + args : ''})`, m[2]);
    }
    if (nesne.t === 'LCD' && ad === 'createChar') return V('0', 'void');
    if (nesne.t === 'Server' && ad === 'handleClient') return V(`(await ${nesne.c}.handleClient())`, 'void');
    return V(`${nesne.c}.${ad}(${args})`, m[2]);
  }
  /** server.on("/yol", fonksiyon) / server.on("/yol", HTTP_GET, fonksiyon) / server.onNotFound(fonksiyon) */
  yolKaydi(nesne, ad, satir) {
    this.p++; // '('
    let yol = null;
    if (ad === 'on') {
      const y = this.assign(); if (y.t !== 'String') this.hata('server.on() ilk değer olarak yol ister, ör. server.on("/", anaSayfa);', satir);
      yol = y.c;
      this.need(',');
      if (this.cur.t === 'id' && /^HTTP_/.test(this.cur.v)) { this.p++; this.need(','); }
    }
    const k = this.cur;
    if (k.t !== 'id' || !this.fns.has(k.v)) this.hata(`server.${ad}() son değer olarak bir fonksiyonun adını ister (ör. server.on("/", anaSayfa); — sonuna () koyma). Fonksiyonu önce "void anaSayfa() { ... }" diye yazmalısın; "[]() {...}" biçimi desteklenmiyor`, k.line);
    const f = this.fns.get(k.v);
    if (f.params.length || f.ret !== 'void') this.hata(`'${k.v}' fonksiyonu "void ${k.v}()" biçiminde olmalı (parametresiz, değer döndürmez)`, k.line);
    this.p++;
    if (this.op('(')) this.hata(`server.${ad}() içine fonksiyonun adını yaz, çağırma: ${k.v} (sonuna () koyma)`, k.line);
    this.need(')');
    return V(ad === 'on' ? `${nesne.c}.on(${yol}, f_${k.v})` : `${nesne.c}.onNotFound(f_${k.v})`, 'void');
  }
  metneDeger(x) { return x.t === 'String' ? x.c : x.t === 'float' ? x.c : x.t === 'bool' ? `(${x.c} ? 1 : 0)` : x.c; }
  birincil() {
    const k = this.cur;
    switch (k.t) {
      case 'num': this.p++; return V(String(k.v), k.float ? 'float' : 'int');
      case 'str': { this.p++; let s = k.v; while (this.cur.t === 'str') { s += this.cur.v; this.p++; } return V(JSON.stringify(s), 'String'); }
      case 'chr': this.p++; return V(String(k.v), 'char');
      case 'op':
        if (k.v === '(') { this.p++; const e = this.virgul(); this.need(')'); return { ...e, c: `(${e.c})`, lv: false }; }
        return this.hata(`Burada '${k.v}' beklenmiyordu${k.v === ')' || k.v === ';' ? ': bir değer ya da ifade eksik olabilir' : ''}`, k.line);
      case 'eof': return this.hata('Kod beklenmedik şekilde bitti: ifade yarım kalmış', this.oncekiSatir());
      case 'id': break;
      default: return this.hata('Beklenmeyen simge', k.line);
    }
    const ad = k.v; this.p++;
    const parantez = this.op('(');
    if (parantez && TUR.has(ad)) return this.donusumCagri(ad, k.line);
    if (parantez) { this.p++; return this.cagri(ad, k.line); }
    const v = this.ara(ad);
    if (v) return V(v.js, v.t, { lv: true, dims: v.dims, sabit: v.sabit });
    if (ad in SABIT && Object.hasOwn(SABIT, ad)) return V(SABIT[ad][0], SABIT[ad][1]);
    let m = /^D(\d+)$/.exec(ad);
    if (m) { if (+m[1] > 14) this.hata(`D${m[1]} diye bir pin yok (D0 - D14 kullanılabilir)`, k.line); return V(m[1], 'int'); }
    m = /^A(\d+)$/.exec(ad);
    if (m) { if (+m[1] > 7) this.hata(`A${m[1]} diye bir pin yok (A0 - A7 kullanılabilir)`, k.line); return V(String(15 + +m[1]), 'int'); }
    if (ad === 'Serial') return V('serial', 'Serial');
    if (ad === 'Wire') return V('wire', 'Wire');
    if (ad === 'WiFi') {
      if (![...this.ekler].some(e => /WiFi/i.test(e))) this.hata("'WiFi' tanınmıyor: dosyanın başına #include <WiFi.h> eklemeyi unuttun mu?", k.line);
      return V('$.wifi', 'WiFi');
    }
    if (this.fns.has(ad)) this.hata(`'${ad}' bir fonksiyondur; çağırmak için ${ad}() yaz`, k.line);
    return this.hata(`'${ad}' tanımlanmamış: böyle bir değişken ya da fonksiyon yok.${this.oner(ad)}`, k.line);
  }
  donusumCagri(ad, satir) { // int(x), float(x), String(x[,n])
    this.p++; const a = this.argumanlar(); const t = TUR.get(ad);
    if (t === 'String') {
      this.sayiDenetle('String', a, 0, 2, satir);
      return V(a.length ? this.metne(a[0], a[1], satir) : '""', 'String');
    }
    if (t === 'Servo' || t === 'LCD' || t === 'void') this.hata(`'${ad}(...)' bu şekilde kullanılamaz`, satir);
    this.sayiDenetle(ad, a, 1, 1, satir);
    return V(this.donustur(a[0], t, satir), t);
  }
  cagri(ad, satir) {
    const a = this.argumanlar();
    const f = this.fns.get(ad);
    if (f) {
      if (a.length !== f.params.length) this.hata(`${ad}() ${f.params.length} değer ister ama ${a.length} değer verilmiş`, satir);
      const args = a.map((x, i) => {
        const q = f.params[i];
        if (q.dims) { if (x.dims !== q.dims) this.hata(`${ad}() fonksiyonunun ${i + 1}. değeri bir dizi olmalı`, satir); return x.c; }
        return this.donustur(x, q.t, satir);
      });
      return V(`(await f_${ad}(${args.join(', ')}))`, f.ret);
    }
    const b = BI[ad];
    if (!b || !Object.hasOwn(BI, ad)) this.hata(`'${ad}' diye bir fonksiyon yok.${this.oner(ad)}`, satir);
    const [tur, ret, opt = {}] = b; const min = opt.min ?? tur.length;
    this.sayiDenetle(ad, a, min, tur.length, satir);
    let rt = ret;
    if (ret === '*') {
      for (const x of a) { if (x.t === 'String' || x.dims) this.hata(`${ad}() sayılarla çalışır`, satir); }
      rt = a.map(x => x.t).includes('float') ? 'float' : 'int';
      const args = a.map(x => this.donustur(x, x.t === 'bool' ? 'int' : x.t, satir)).join(', ');
      return V(`$.${ad}(${args})`, rt);
    }
    const args = a.map((x, i) => {
      const c = tur[i];
      if (c === 'f') return this.donustur(x, 'float', satir);
      if (c === 'a') return this.donustur(x, x.t === 'bool' ? 'int' : x.t, satir);
      return this.donustur(x, 'int', satir);
    }).join(', ');
    const cg = `$.${ad}(${args})`;
    return V(opt.aw ? `(await ${cg})` : cg, rt);
  }
}

// ───────────────────────── Çalışma zamanı ─────────────────────────
const f2 = (x, n = 2) => Number.isNaN(x) ? 'nan' : !Number.isFinite(x) ? (x < 0 ? '-inf' : 'inf') : x.toFixed(Math.max(0, Math.min(20, n)));

function calismaZamani(sim) {
  const R = { L: 0 };
  const hata = m => { throw new Error(`Satır ${R.L}: ${m}`); };
  const ledc = { kanal: {}, bit: {}, pin: {} };
  const tonlar = {}; let tampon = '', us = 0, tohum = null;
  const pinAd = p => {
    if (typeof p === 'string' && p in sim.pin) return p;
    const a = PINLER[Math.trunc(p)];
    if (!a) hata(`Böyle bir pin yok: ${p}. D0-D14 (0-14) ve A0-A7 (15-22) pinlerini kullanabilirsin`);
    return a;
  };
  const olay = (grup, tur, pin, v, ilk) => {
    const d = (sim.cihaz[grup] ??= {});
    if ((d[pin] ?? ilk) !== v) { d[pin] = v; sim.olaylar.push({ t: sim.t, pin, deger: v, tur }); }
    sim.yay();
  };
  const rnd = () => {
    if (tohum === null) return Math.random();
    tohum = (tohum + 0x6D2B79F5) | 0; let t = Math.imul(tohum ^ (tohum >>> 15), 1 | tohum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const yazdir = s => { tampon += s; return s.length; };
  Object.assign(R, {
    f2, taban: (x, b) => { b = b || 10; return (b === 10 ? String(x) : (x >>> 0).toString(b).toUpperCase()); },
    bol: (a, b) => { if (b === 0) hata('Sıfıra bölme hatası: tamsayı bölmede bölen 0 olamaz'); return Math.trunc(a / b); },
    kalan: (a, b) => { if (b === 0) hata('Sıfıra bölme hatası: kalan (%) işleminde bölen 0 olamaz'); return a % b; },
    ix: (dizi, i) => { if (!(i >= 0 && i < dizi.length)) hata(`Dizi sınırı aşıldı: ${i}. eleman istendi ama dizide ${dizi.length} eleman var (geçerli: 0-${dizi.length - 1})`); return i; },
    harf: (s, i) => (i >= 0 && i < s.length ? s.charCodeAt(i) : 0),
    say: d => (Array.isArray(d) ? d.length * (Array.isArray(d[0]) ? R.say(d[0]) : 1) : 1),
    dizi: (boyut, varsayilan, ilk) => {
      const yap = (k, kaynak) => Array.from({ length: boyut[k] }, (_, i) => k === boyut.length - 1 ? (kaynak?.[i] ?? varsayilan()) : yap(k + 1, kaynak?.[i]));
      if (boyut[0] > 1e6) hata('Dizi çok büyük');
      return yap(0, ilk);
    },
    // pinler
    pinMode: (p, m) => sim.pinModu(pinAd(p), m === 1 ? 'cikti' : m === 2 ? 'pullup' : 'girdi'),
    touchRead: p => sim.dokunmaOku(pinAd(p)), temperatureRead: () => 38.5,
    ledcSetup: (k, f, bit) => { ledc.bit[k] = bit; return f; }, ledcAttachPin: (p, k) => { ledc.kanal[k] = pinAd(p); },
    ledcAttach: (p, f, bit) => { ledc.pin[pinAd(p)] = bit; return f; },
    ledcWrite: (x, duty) => {
      const kanalMi = x in ledc.kanal, n = kanalMi ? ledc.kanal[x] : pinAd(x);
      const bit = kanalMi ? (ledc.bit[x] ?? 8) : ledc.pin[n] ?? hata('ledcWrite için önce ledcSetup + ledcAttachPin (ya da ledcAttach) ile bir pin bağlamalısın');
      sim.pwmYaz(n, Math.round(duty * 255 / (2 ** bit - 1)));
    },
    digitalWrite: (p, v) => sim.yaz(pinAd(p), v),
    digitalRead: p => (sim.oku(pinAd(p)) > 0 ? 1 : 0),
    analogWrite: (p, v) => sim.pwmYaz(pinAd(p), v),
    analogRead: p => sim.analogOku(pinAd(p)),
    pulseIn: (p, _, zaman) => { const cm = (sim.cihaz.mesafe ?? {})[pinAd(p)] ?? 200; const u = Math.round(cm * 58); return u > (zaman ?? 1000000) ? 0 : u; },
    mesafeOlc: p => (sim.cihaz.mesafe ?? {})[pinAd(p)] ?? 200,
    tone: (p, f, sure) => {
      const n = pinAd(p); olay('ses', 'ses', n, Math.max(0, Number(f) || 0), 0);
      if (sure > 0) tonlar[n] = sim.t + sure; else delete tonlar[n];
    },
    noTone: p => { const n = pinAd(p); olay('ses', 'ses', n, 0, 0); delete tonlar[n]; },
    // zaman
    delay: async ms => {
      let kalan = Math.max(0, Math.trunc(ms) || 0);
      for (;;) {
        let en = null, pn = null;
        for (const k in tonlar) { const d = tonlar[k] - sim.t; if (d <= kalan && (en === null || d < en)) { en = d; pn = k; } }
        if (pn === null) { await sim.bekle(kalan); return; }
        const w = Math.max(0, en); await sim.bekle(w); kalan -= w;
        olay('ses', 'ses', pn, 0, 0); delete tonlar[pn];
      }
    },
    delayMicroseconds: async u => {
      u = Math.max(0, Math.trunc(u) || 0); us += u;
      if (us >= 1000) { const ms = Math.floor(us / 1000); us -= ms * 1000; await R.delay(ms); }
    },
    millis: () => Math.floor(sim.t), micros: () => Math.floor(sim.t * 1000) + us,
    yield: () => 0,
    // matematik
    map: (x, a, b, c, d) => (a === b ? c : Math.trunc((x - a) * (d - c) / (b - a)) + c),
    constrain: (x, a, b) => (x < a ? a : x > b ? b : x), min: (a, b) => (a < b ? a : b), max: (a, b) => (a > b ? a : b),
    abs: x => Math.abs(x), sq: x => x * x, pow: Math.pow, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos,
    atan: Math.atan, atan2: Math.atan2, log: Math.log, log10: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, fabs: Math.abs,
    round: x => Math.round(x), radians: x => x * Math.PI / 180, degrees: x => x * 180 / Math.PI,
    random: (a, b) => { if (b === undefined) { b = a; a = 0; } return b <= a ? a : a + Math.floor(rnd() * (b - a)); },
    randomSeed: n => { tohum = n | 0; },
    analogReadResolution: () => 0, analogSetAttenuation: () => 0,
    lowByte: x => x & 255, highByte: x => (x >> 8) & 255, bitRead: (x, n) => (x >> n) & 1,
    // seri
    print: yazdir,
    println: s => { sim.seri(tampon + s); tampon = ''; return s.length + 2; },
    printf: (bicim, ...a) => {
      let i = 0;
      return yazdir(bicim.replace(/%([-+ 0#]*)(\d+)?(?:\.(\d+))?(?:ll|l|h)?([diuxXfcsegG%])/g, (m, fl, w, pr, c) => {
        if (c === '%') return '%';
        const v = a[i++]; let r;
        if ('diu'.includes(c)) r = String(Math.trunc(Number(v)));
        else if (c === 'x' || c === 'X') { r = (Number(v) >>> 0).toString(16); if (c === 'X') r = r.toUpperCase(); }
        else if (c === 'f' || c === 'e' || c === 'g' || c === 'G') r = f2(Number(v), pr === undefined ? 6 : +pr);
        else if (c === 'c') r = typeof v === 'number' ? String.fromCharCode(v) : String(v);
        else r = String(v);
        if (w) r = fl.includes('-') ? r.padEnd(+w) : r.padStart(+w, fl.includes('0') && c !== 's' ? '0' : ' ');
        return r;
      }));
    },
    // String yöntemleri
    s_substring: (s, a, b) => s.substring(a, b), s_toInt: s => Number.parseInt(s, 10) || 0, s_toFloat: s => Number.parseFloat(s) || 0,
    s_charAt: (s, i) => R.harf(s, i), s_indexOf: (s, x, k) => s.indexOf(x, k), s_lastIndexOf: (s, x) => s.lastIndexOf(x),
    s_equals: (s, x) => s === x, s_equalsIgnoreCase: (s, x) => s.toLowerCase() === x.toLowerCase(), s_startsWith: (s, x) => s.startsWith(x),
    s_endsWith: (s, x) => s.endsWith(x), s_isEmpty: s => s.length === 0, s_compareTo: (s, x) => (s < x ? -1 : s > x ? 1 : 0),
    s_toUpperCase: s => s.toUpperCase(), s_toLowerCase: s => s.toLowerCase(), s_trim: s => s.trim(),
    s_replace: (s, a, b) => s.split(a).join(b), s_remove: (s, i, n) => s.slice(0, i) + (n === undefined ? '' : s.slice(i + n)),
    s_concat: (s, x) => s + x, s_reserve: () => 0,
  });
  R.Servo = class {
    constructor() { this.pin = null; this.aci = 0; }
    attach(p) { this.pin = pinAd(p); return 1; }
    detach() { this.pin = null; }
    attached() { return this.pin !== null; }
    write(a) {
      if (this.pin === null) hata('Servo kullanılmadan önce servo.attach(pin) ile bir pine bağlanmalı (genellikle setup() içinde)');
      this.aci = Math.max(0, Math.min(180, Number(a) || 0)); olay('servo', 'servo', this.pin, this.aci, null);
    }
    writeMicroseconds(u) { this.write((u - 544) * 180 / (2400 - 544)); }
    read() { return Math.round(this.aci); }
  };
  R.wifi = {
    begin: (ssid, sifre) => { sim.ag.baglan(ssid, sifre); return sim.ag.durum(); },
    status: () => sim.ag.durum(),
    localIP: () => (sim.ag.bagli() ? sim.ag.ip : '0.0.0.0'),
    softAP: (ssid, sifre) => sim.ag.apAc(ssid, sifre),
    softAPIP: () => (sim.ag.wifi.ap ? sim.ag.apIp : '0.0.0.0'),
    disconnect: () => { sim.ag.kes(); return true; },
    mode: m => { sim.ag.wifi.mod = m; return true; },
    SSID: () => (sim.ag.bagli() ? sim.ag.wifi.ssid : ''),
    RSSI: () => (sim.ag.bagli() ? -55 : 0),
    macAddress: () => 'A4:CF:12:34:56:78',
    isConnected: () => sim.ag.bagli(),
    reconnect: () => { const w = sim.ag.wifi; if (w.ssid != null) sim.ag.baglan(w.ssid, w.sifre); return true; },
    setHostname: () => true, setSleep: () => true,
  };
  R.WebServer = class {
    constructor(port) { this.port = port || 80; this.basladi = false; this.yollar = new Map(); this.bulunamadi = null; this.cur = null; sim.ag.sunucuKaydet(this); }
    on(yol, fn) { this.yollar.set(yol, fn); sim.yay(); }
    onNotFound(fn) { this.bulunamadi = fn; }
    begin() { this.basladi = true; sim.yay(); }
    stop() { this.basladi = false; sim.yay(); } close() { this.stop(); }
    async handleClient() {
      if (!this.basladi) return;
      const r = sim.ag.al(this.port); if (!r) return;
      this.cur = { yol: r.yol, arg: r.arg, yontem: r.yontem, yanit: null, basliklar: {} };
      let hataNesne = null;
      try {
        const fn = this.yollar.get(r.yol) ?? this.bulunamadi;
        if (fn) await fn(); else this.send(404, 'text/plain', 'File Not Found\n\nURI: ' + r.yol);
      } catch (e) { hataNesne = e; }
      const y = this.cur.yanit; this.cur = null;
      sim.ag.yanitla(r, y);
      if (hataNesne) throw hataNesne;
    }
    send(kod, tip = 'text/plain', metin = '') {
      if (!this.cur) hata('server.send() yalnızca bir yol işleyicisi (server.on ile bağlanan fonksiyon) içinde çağrılabilir');
      this.cur.yanit = { kod, tip, metin: String(metin), basliklar: this.cur.basliklar };
    }
    sendHeader(ad, deger) { if (this.cur) this.cur.basliklar[ad] = String(deger); }
    arg(ad) { return this.cur?.arg[ad] ?? ''; }
    hasArg(ad) { return !!this.cur && ad in this.cur.arg; }
    args() { return this.cur ? Object.keys(this.cur.arg).length : 0; }
    uri() { return this.cur?.yol ?? ''; }
    method() { return this.cur?.yontem === 'POST' ? 3 : 1; }
  };
  R.LCD = class {
    constructor(adres, sut = 16, satir = 2) { this.c = 0; this.r = 0; this.sut = sut || 16; this.satirSayisi = satir || 2; }
    init() {} begin() {} backlight() {} noBacklight() {} display() {} noDisplay() {} cursor() {} noCursor() {} blink() {} noBlink() {}
    clear() { sim.cihaz.lcd = ['', '']; this.c = 0; this.r = 0; sim.yay(); }
    home() { this.c = 0; this.r = 0; }
    setCursor(c, r) { this.c = c; this.r = r; }
    print(s) {
      s = String(s); const l = (sim.cihaz.lcd ??= ['', '']);
      if (this.r >= 0 && this.r < l.length) {
        const satir = (l[this.r] ?? '').padEnd(16, ' ').split('');
        for (const ch of s) { if (this.c >= 0 && this.c < 16) satir[this.c] = ch; this.c++; }
        l[this.r] = satir.join('');
      } else this.c += s.length;
      sim.yay(); return s.length;
    }
    println(s) { return this.print(s); }
    write(s) { return this.print(s); }
  };
  return R;
}

/** C++ kodunu derler. Hata varsa { hata: { mesaj, satir } }, yoksa calistir() ile çalıştırılır. */
export function cppDerle(kod, sim) {
  let fabrika;
  try {
    const { T, ekler } = onisle(sozcukle(String(kod)));
    parantezDenetle(T);
    const js = new Derleyici(T, ekler).derle();
    try { fabrika = new Function('sim', '$', 'serial', 'wire', `return (async () => {\n${js}\n})();`); }
    catch (e) { throw new CppHata('Kod çevrilemedi (beklenmeyen bir yazım): ' + e.message, 1); }
  } catch (e) {
    if (!(e instanceof CppHata)) throw e;
    return { hata: { mesaj: `Satır ${e.satir}: ${e.message}`, satir: e.satir }, calistir: async () => {} };
  }
  return {
    hata: null,
    calistir: async () => {
      const R = calismaZamani(sim);
      try {
        const { setup, loop } = await fabrika(sim, R, 'serial', 'wire');
        await setup();
        while (!sim.iptal) { await loop(); await sim.tick(); }
      } catch (e) {
        if (e instanceof DurdurSinyali) return;
        if (e instanceof RangeError && /call stack/i.test(e.message)) throw new Error(`Satır ${R.L}: Fonksiyon kendini sonsuza kadar çağırıyor (özyineleme bitmiyor)`);
        throw e;
      }
    },
  };
}
