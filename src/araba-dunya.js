// Robot araba dünyası: saf JS (three yok). Sanal saat (sim.t) ve sim.olaylar üzerinden ÇÖZÜMSEL poz entegrasyonu.
// Birim: cm. Orijin arena merkezi, +x sağ, +y ileri/yukarı, yön (rad) 0 = +x, saat yönünün tersi pozitif.
// Kullanım belgesi: tools/ARABA-SOZLESME.md

export const VMAX = 25;          // tam güçte tekerlek hızı (cm/s)
export const IZ = 12;            // tekerlek aralığı (cm)
export const YARICAP = 10;       // çarpışma dairesi (cm)
export const BURUN = 10;         // mesafe sensörünün merkezden öne uzaklığı
export const CIZGI_ON = 9;       // çizgi sensörlerinin merkezden öne uzaklığı
export const CIZGI_YAN = 3.5;    // çizgi sensörlerinin eksenden yanal uzaklığı
export const ESIK = 0.15;        // kalkış eşiği (|güç| bunun altında motor dönmez)
const ADIM = 10;                 // entegrasyon alt adımı (sanal ms)

export const VARSAYILAN_PINLER = {
  solIleri: 'D0', solGeri: 'D1', sagIleri: 'D2', sagGeri: 'D3', solHiz: null, sagHiz: null,
  mesafe: 'D4', cizgiSol: 'D5', cizgiSag: 'D6',
};

/** Köşeleri yuvarlak dikdörtgen çizgi parkuru (kapalı, saat yönünün tersi, alt kenarın ortasından başlar). */
function yuvarlakDikdortgen(hx, hy, r, n = 8) {
  const p = [[0, -hy]];
  const yay = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  yay(hx - r, -hy + r, -Math.PI / 2); yay(hx - r, hy - r, 0); yay(-hx + r, hy - r, Math.PI / 2); yay(-hx + r, -hy + r, Math.PI);
  p.push([0, -hy]);
  return p.map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]);
}

const ARENALAR = {
  duz: () => ({ ad: 'duz', genislik: 160, yukseklik: 100, engeller: [], cizgiler: [], baslangic: { x: -60, y: 0, yonDerece: 0 } }),
  engelli: () => ({
    ad: 'engelli', genislik: 160, yukseklik: 100,
    engeller: [{ x: -25, y: 0, w: 12, h: 30 }, { x: 20, y: 18, w: 30, h: 30 }, { x: 0, y: -30, w: 20, h: 20 }, { x: 55, y: -15, w: 14, h: 14 }],
    cizgiler: [], baslangic: { x: -65, y: 0, yonDerece: 0 },
  }),
  cizgi: () => ({
    ad: 'cizgi', genislik: 160, yukseklik: 120, engeller: [],
    cizgiler: [{ genislik: 4, nokta: yuvarlakDikdortgen(60, 40, 20) }],
    baslangic: { x: 0, y: -40, yonDerece: 0 },
  }),
};

/** Arena adı ya da özel nesne -> tam arena nesnesi. */
export function hazirArena(a = 'duz') {
  if (typeof a === 'string') { const f = ARENALAR[a]; if (!f) throw new Error('Bilinmeyen arena: ' + a); return f(); }
  return { ad: 'ozel', genislik: 160, yukseklik: 100, engeller: [], cizgiler: [], baslangic: { x: -60, y: 0, yonDerece: 0 }, ...a };
}

/** Işın (ox,oy yönü d) ile arena içi: duvara ve engellere en yakın mesafe (cm). */
function isinMesafe(ar, ox, oy, yon) {
  const dx = Math.cos(yon), dy = Math.sin(yon);
  let en = Infinity;
  // duvarlar (içeriden)
  const hx = ar.genislik / 2, hy = ar.yukseklik / 2;
  if (dx > 1e-9) en = Math.min(en, (hx - ox) / dx); else if (dx < -1e-9) en = Math.min(en, (-hx - ox) / dx);
  if (dy > 1e-9) en = Math.min(en, (hy - oy) / dy); else if (dy < -1e-9) en = Math.min(en, (-hy - oy) / dy);
  en = Math.max(0, en);
  for (const e of ar.engeller) {
    const x0 = e.x - e.w / 2, x1 = e.x + e.w / 2, y0 = e.y - e.h / 2, y1 = e.y + e.h / 2;
    if (ox >= x0 && ox <= x1 && oy >= y0 && oy <= y1) return 0;
    let t0 = 0, t1 = Infinity, ok = true;
    for (const [o, d, a0, a1] of [[ox, dx, x0, x1], [oy, dy, y0, y1]]) {
      if (Math.abs(d) < 1e-9) { if (o < a0 || o > a1) { ok = false; break; } continue; }
      let ta = (a0 - o) / d, tb = (a1 - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    }
    if (ok && t0 <= t1) en = Math.min(en, t0);
  }
  return en;
}

function noktaSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

/** (x,y) noktasının tüm çizgilerin ORTA ÇİZGİSİNE en kısa uzaklığı (cm); çizgi yoksa Infinity. */
export function cizgiUzaklik(ar, x, y) {
  let d = Infinity;
  for (const c of ar.cizgiler) for (let i = 0; i + 1 < c.nokta.length; i++) {
    const [ax, ay] = c.nokta[i], [bx, by] = c.nokta[i + 1];
    d = Math.min(d, noktaSegment(x, y, ax, ay, bx, by));
  }
  return d;
}
function sikSiyahMi(ar, x, y) {
  for (const c of ar.cizgiler) for (let i = 0; i + 1 < c.nokta.length; i++) {
    const [ax, ay] = c.nokta[i], [bx, by] = c.nokta[i + 1];
    if (noktaSegment(x, y, ax, ay, bx, by) <= c.genislik / 2) return 1;
  }
  return 0;
}

function carpisiyor(ar, x, y) {
  const hx = ar.genislik / 2 - YARICAP, hy = ar.yukseklik / 2 - YARICAP;
  if (Math.abs(x) > hx || Math.abs(y) > hy) return true;
  for (const e of ar.engeller) {
    const cx = Math.max(e.x - e.w / 2, Math.min(x, e.x + e.w / 2)), cy = Math.max(e.y - e.h / 2, Math.min(y, e.y + e.h / 2));
    if (Math.hypot(x - cx, y - cy) < YARICAP) return true;
  }
  return false;
}

export class ArabaDunya {
  constructor(arena = 'duz', pinler = {}, baslangic = null) {
    this.arena = hazirArena(arena);
    this.pinler = { ...VARSAYILAN_PINLER, ...pinler };
    this.b0 = baslangic ?? this.arena.baslangic;
    this.durum = {};
    this.sifirla();
  }

  sifirla() {
    const b = this.b0;
    this.t = 0; this.idx = 0; this.pwm = {};
    Object.assign(this.durum, { x: b.x, y: b.y, yon: (b.yonDerece ?? 0) * Math.PI / 180, yonDerece: b.yonDerece ?? 0, hiz: 0, solGuc: 0, sagGuc: 0, carpti: false, yol: 0, iz: [{ t: 0, x: b.x, y: b.y, yon: (b.yonDerece ?? 0) * Math.PI / 180 }] });
    this.olaylarRef = null;
  }

  #guc(ileri, geri, hiz) {
    const p = n => (n ? (this.pwm[n] ?? 0) : null);
    let g = (p(ileri) ?? 0) - (p(geri) ?? 0);
    if (hiz) g *= p(hiz);
    return Math.abs(g) < ESIK ? 0 : Math.max(-1, Math.min(1, g));
  }
  gucler() { const P = this.pinler; return [this.#guc(P.solIleri, P.solGeri, P.solHiz), this.#guc(P.sagIleri, P.sagGeri, P.sagHiz)]; }

  /** Durum d'yi mevcut motor güçleriyle ms kadar ilerlet (çözümsel yay, alt adımlarla çarpışma denetimi). */
  #ilerle(d, ms) {
    const [gl, gr] = this.gucler();
    d.solGuc = gl; d.sagGuc = gr;
    const vl = gl * VMAX, vr = gr * VMAX, v = (vl + vr) / 2, w = (vr - vl) / IZ; // cm/s, rad/s
    d.hiz = v;
    let kalan = ms;
    while (kalan > 1e-9) {
      const dt = Math.min(ADIM, kalan) / 1000; kalan -= ADIM;
      const th = d.yon, th2 = th + w * dt;
      let nx, ny;
      if (Math.abs(w) < 1e-6) { nx = d.x + v * Math.cos(th) * dt; ny = d.y + v * Math.sin(th) * dt; }
      else { nx = d.x + (v / w) * (Math.sin(th2) - Math.sin(th)); ny = d.y - (v / w) * (Math.cos(th2) - Math.cos(th)); }
      if (carpisiyor(this.arena, nx, ny)) {
        if (v !== 0) { d.carpti = true; d.hiz = 0; }
        nx = d.x; ny = d.y;                              // öteleme engellendi, dönme serbest
      }
      d.yol += Math.hypot(nx - d.x, ny - d.y);
      d.x = nx; d.y = ny; d.yon = th2;
    }
    d.yonDerece = ((d.yon * 180 / Math.PI) % 360 + 360) % 360;
  }

  /** sim.olaylar'daki pin geçişlerini sanal t'ye kadar işleyip konumu entegre eder. */
  guncelle(sim = this.sim, tHedef = sim?.t ?? this.t) {
    if (sim) {
      if (this.olaylarRef !== sim.olaylar || tHedef < this.t) { this.sifirla(); this.olaylarRef = sim.olaylar; }
      const ol = sim.olaylar;
      while (this.idx < ol.length && ol[this.idx].t <= tHedef) {
        const e = ol[this.idx++];
        if (e.t > this.t) { this.#ilerle(this.durum, e.t - this.t); this.t = e.t; }
        if (typeof e.pin === 'string' && e.tur === undefined) this.pwm[e.pin] = e.deger;
        this.durum.iz.push({ t: e.t, x: this.durum.x, y: this.durum.y, yon: this.durum.yon });
      }
    }
    if (tHedef > this.t) { this.#ilerle(this.durum, tHedef - this.t); this.t = tHedef; }
    else if (!sim) this.#ilerle(this.durum, 0);
    return this.durum;
  }

  /** Görsel için: işlenmiş duruma, motorlar aynı kalırsa tHedef'e kadar ek ilerleme (kalıcı değil). */
  onizle(tHedef) {
    const d = { ...this.durum, iz: undefined };
    if (tHedef > this.t) this.#ilerle(d, tHedef - this.t);
    return d;
  }

  /** Ultrasonik: cm, tam sayı, 2..200. */
  mesafe(d = this.durum) {
    const m = isinMesafe(this.arena, d.x + BURUN * Math.cos(d.yon), d.y + BURUN * Math.sin(d.yon), d.yon);
    return Math.max(2, Math.min(200, Math.round(m)));
  }
  #sensorNokta(d, yan) {
    const c = Math.cos(d.yon), s = Math.sin(d.yon);
    return [d.x + CIZGI_ON * c - yan * s, d.y + CIZGI_ON * s + yan * c];
  }
  /** [sol, sağ] çizgi sensörleri (1 = siyah). Sol = arabanın solu (+yan). */
  cizgi(d = this.durum) {
    return [sikSiyahMi(this.arena, ...this.#sensorNokta(d, CIZGI_YAN)), sikSiyahMi(this.arena, ...this.#sensorNokta(d, -CIZGI_YAN))];
  }
  cizgiMesafe(d = this.durum) { return cizgiUzaklik(this.arena, d.x, d.y); }

  /** Sensörleri sim'e bağla: canlı getter'lar (okuma anında sim.t'ye kadar entegre eder). */
  baglan(sim) {
    this.sim = sim;
    const P = this.pinler;
    const canli = (nesne, pin, fn) => {
      if (!pin) return;
      const g = Object.getOwnPropertyDescriptor(nesne, pin);
      if (g?.get?.dunya === this) return;
      const get = () => { this.guncelle(sim); return fn(); };
      get.dunya = this;
      Object.defineProperty(nesne, pin, { get, set() {}, configurable: true, enumerable: true });
    };
    sim.cihaz.mesafe ??= {};
    canli(sim.cihaz.mesafe, P.mesafe, () => this.mesafe());
    canli(sim.girdi, P.cizgiSol, () => this.cizgi()[0]);
    canli(sim.girdi, P.cizgiSag, () => this.cizgi()[1]);
    sim.cihaz.araba = this.durum;
    return this;
  }
}

const DUNYALAR = new WeakMap();
/** Sahne tanımından (tanim.arena + tur:'araba' parçası) dünyayı kur/getir ve sim'e bağla. sim.sifirla() sonrası yeniden çağır. */
export function arabaBagla(sim, sahne = {}) {
  const p = (sahne.parcalar ?? []).find(x => x.tur === 'araba') ?? {};
  const anahtar = JSON.stringify([sahne.arena ?? 'duz', p.pinler ?? null, p.baslangic ?? null]);
  let k = DUNYALAR.get(sim);
  if (!k || k.anahtar !== anahtar) {
    k = { anahtar, dunya: new ArabaDunya(sahne.arena ?? 'duz', p.pinler ?? {}, p.baslangic ?? null) };
    DUNYALAR.set(sim, k);
  }
  k.dunya.baglan(sim).guncelle(sim);
  return k.dunya;
}
