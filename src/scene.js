import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { breadboardOlustur } from './breadboard.js';
import { arenaKur } from './arena3b.js';
import { hazirArena } from './araba-dunya.js';

// src/parts/*.js otomatik yüklenir: { tur, olustur({THREE,tanim,konum,index}) -> {group, guncelle?, kare?, pointerDown?, pointerMove?, pointerUp?} }
const dosyalar = import.meta.glob('./parts/*.js', { eager: true });
const PARCALAR = Object.fromEntries(Object.values(dosyalar).map(m => [m.default.tur, m.default]));

export class Sahne {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.s = new THREE.Scene();
    this.s.background = new THREE.Color(0xd3deec);
    this.k = new THREE.PerspectiveCamera(40, 1, 1, 2000);
    this.k.position.set(75, 125, 175);
    this.o = new OrbitControls(this.k, canvas);
    this.o.target.set(32, 0, 0);
    this.o.enableDamping = true;
    this.o.addEventListener('start', () => { this.elleHareket = true; });
    this.s.add(new THREE.HemisphereLight(0xffffff, 0x303060, 1.1));
    const d = new THREE.DirectionalLight(0xffffff, 1.6);
    d.position.set(60, 140, 80);
    this.s.add(d);
    this.nesneler = [];
    this.kabloSira = 0;
    this.sim = null;
    this.halka = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 12, 48), new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, depthTest: false }));
    this.halka.rotation.x = Math.PI / 2; this.halka.visible = false; this.halka.renderOrder = 10; this.s.add(this.halka);
    this.parcalar = new THREE.Group();
    this.s.add(this.parcalar);
    const zemin = new THREE.GridHelper(400, 40, 0xa9b9d0, 0xbfcce0);
    zemin.position.y = -9;
    this.s.add(zemin);
    this.#golge();
    this.#kartYukle();
    this.#etkilesim(canvas);
    new ResizeObserver(() => this.boyutla()).observe(canvas.parentElement);
    this.boyutla();
    this.saat = new THREE.Timer();
    this.r.setAnimationLoop(() => {
      this.saat.update();
      const dt = this.saat.getDelta();
      for (const n of this.nesneler) n.kare?.(dt, this.sim);
      if (this.halka.visible) { const t = performance.now() / 400; this.halka.scale.setScalar(1 + Math.sin(t) * .08); this.halka.material.opacity = .55 + Math.sin(t) * .3; }
      this.o.update();
      this.r.render(this.s, this.k);
    });
  }

  /** Zemine yumuşak gölge lekesi (kart ve breadboard altında). */
  #golge() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(30,40,70,.45)'); g.addColorStop(1, 'rgba(30,40,70,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    for (const [px, pz, w, h] of [[78, 10, 130, 100], [14, 32, 60, 100]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(px, -8.9, pz); this.s.add(m);
    }
  }

  /** Kamera denetimleri (araç çubuğu). */
  yakinlas(f) { const d = this.k.position.clone().sub(this.o.target).multiplyScalar(f); this.k.position.copy(this.o.target).add(d); }
  don(aci) { const d = this.k.position.clone().sub(this.o.target); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), aci); this.k.position.copy(this.o.target).add(d); }
  ust() { const x = this.arenaVar ? 150 : 32; this.k.position.set(x, this.arenaVar ? 380 : 230, 0.01); this.o.target.set(x, 0, 0); }
  /** Hata ayıklama: tüm pin konumlarına renkli küre koy (#isaret=1). */
  async pinIsaretle() {
    await this.kartHazir;
    const m = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });
    for (const ad of [...Sahne.PIN_SOL, ...Sahne.PIN_SAG]) {
      const v = this.kartPin(ad); if (!v) continue;
      const r = ad === 'D0' ? 2.2 : ad === 'A0' ? 1.8 : .9;
      const kure = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: ad === 'D0' ? 0xff0000 : ad === 'A0' ? 0x0000ff : ad.startsWith('D') ? 0xffff00 : 0x00ff00, depthTest: false }));
      kure.position.copy(v); kure.renderOrder = 20; this.s.add(kure);
    }
  }
  /** Kamerayı ilk konuma getirir; normal derslerde kart + breadboard + parçalar canvas'a tam sığacak uzaklıkta durur (dar/geniş panelde de kesilmez). */
  basla() {
    this.elleHareket = false;
    if (this.arenaVar) { this.k.position.set(150, 340, 210); this.o.target.set(150, 0, 0); return; }
    const kutu = new THREE.Box3().setFromObject(this.parcalar);
    if (this.kartKutu) kutu.union(this.kartKutu);
    if (kutu.isEmpty()) { this.k.position.set(75, 125, 175); this.o.target.set(32, 0, 0); return; }
    const merkez = kutu.getCenter(new THREE.Vector3()), r = kutu.getSize(new THREE.Vector3()).length() / 2;
    const dikey = THREE.MathUtils.degToRad(this.k.fov) / 2, yatay = Math.atan(Math.tan(dikey) * this.k.aspect);
    const uzak = r / Math.sin(Math.min(dikey, yatay)) * 0.95;
    this.o.target.copy(merkez);
    this.k.position.copy(merkez).addScaledVector(new THREE.Vector3(43, 125, 175).normalize(), uzak);
  }

  boyutla() {
    const c = this.r.domElement.parentElement;
    this.r.setSize(c.clientWidth, c.clientHeight, false);
    this.k.aspect = c.clientWidth / c.clientHeight;
    this.k.updateProjectionMatrix();
    if (!this.elleHareket && this.parcalar.children.length) this.basla();
  }

  #kartYukle() {
    this.kartHazir = new Promise(coz => { this.#kartCoz = coz; });
    new GLTFLoader().load('/models/deneyap-1a-v2-renkli.glb', g => {
      const m = g.scene; // STEP: Z yukarı, mm; renkler dosyadan gelir
      const kutu = new THREE.Group();
      kutu.add(m);
      m.rotation.x = -Math.PI / 2;
      kutu.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(kutu), c = b.getCenter(new THREE.Vector3());
      m.position.set(-12 - c.x, -b.min.y, 0 - c.z); // kartı x=-12, z=0 civarına, tabanı y=0'a yerleştir
      this.kart = kutu;
      this.s.add(kutu);
      kutu.updateMatrixWorld(true);
      this.kartKutu = new THREE.Box3().setFromObject(kutu);
      this.#kartCoz();
    }, undefined, () => {
      // Model dosyası yoksa (depoda yok, README'ye bak) düz bir kart levhası çiz; uygulama yine çalışsın
      const kutu = new THREE.Group();
      kutu.add(new THREE.Mesh(new THREE.BoxGeometry(60, 1.6, 26), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 })));
      kutu.children[0].position.set(-12, 0.8, 0);
      this.kart = kutu;
      this.s.add(kutu);
      kutu.updateMatrixWorld(true);
      this.kartKutu = new THREE.Box3().setFromObject(kutu);
      this.#kartCoz();
    });
  }

  #kartCoz = () => {};

  /** Parçalar fare/dokunma ile etkileşime girebilir (düğme, potansiyometre...). */
  #etkilesim(canvas) {
    const ray = new THREE.Raycaster(), nokta = new THREE.Vector2();
    let aktif = null;
    const bul = e => {
      const b = canvas.getBoundingClientRect();
      nokta.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(nokta, this.k);
      const isabet = ray.intersectObjects(this.parcalar.children, true)[0];
      if (!isabet) return null;
      let o = isabet.object;
      while (o && !o.userData.nesne) o = o.parent;
      return o ? { nesne: o.userData.nesne, isabet, ray } : null;
    };
    canvas.addEventListener('pointerdown', e => {
      const h = bul(e);
      if (!h?.nesne.pointerDown) return;
      aktif = h.nesne;
      this.o.enabled = false;
      canvas.setPointerCapture(e.pointerId);
      h.nesne.pointerDown(this.sim, { ...h, event: e, kamera: this.k });
      this.sim.yay();
    });
    canvas.addEventListener('pointermove', e => {
      if (!aktif?.pointerMove) return;
      const b = canvas.getBoundingClientRect();
      nokta.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(nokta, this.k);
      aktif.pointerMove(this.sim, { ray, event: e, kamera: this.k });
      this.sim.yay();
    });
    const birak = e => {
      if (!aktif) return;
      aktif.pointerUp?.(this.sim, { event: e });
      aktif = null;
      this.o.enabled = true;
      this.sim.yay();
    };
    canvas.addEventListener('pointerup', birak);
    canvas.addEventListener('pointercancel', birak);
  }

  /** Ders sahnesini kur: tanim.parcalar = [{ tur, pin, ... }]. Parçalar breadboard üzerinde ızgaraya dizilir. */
  kur(tanim, sim) {
    this.sim = sim;
    this.parcalar.clear();
    this.nesneler = [];
    this.arenaVar = !!tanim.arena;
    if (this.arenaVar) {
      this.parcalar.add(arenaKur(THREE, hazirArena(tanim.arena)));
      this.delik = () => new THREE.Vector3(); this.ray = () => new THREE.Vector3(); this.enYakinDelik = v => v.clone();
      this.basla();
    } else {
      const bb = breadboardOlustur(THREE, 78, 10);
      this.parcalar.add(bb.group);
      this.delik = bb.delik;
      this.ray = bb.ray;
      this.enYakinDelik = bb.enYakin;
    }
    (tanim.parcalar ?? []).forEach((p, i) => {
      const mod = PARCALAR[p.tur];
      if (!mod) throw new Error('Bilinmeyen parça türü: ' + p.tur);
      const konum = p.konum ? new THREE.Vector3(...p.konum) : this.delik(i < 5 ? 'f' : 'b', 5 + (i % 5) * 5);
      const n = mod.olustur({ THREE, tanim: p, konum, index: i, sahne: tanim });
      if (!mod.konumSabit) n.group.position.copy(konum);
      n.group.userData.nesne = n;
      this.parcalar.add(n.group);
      this.nesneler.push(n);
    });
    this.#kablolari(tanim);
    this.guncelle(sim);
    this.basla();
    this.kartHazir.then(() => { if (!this.elleHareket) this.basla(); });
  }

  // ── Kablolar: kartın gerçek pin konumlarından breadboard deliklerine ──
  // Deneyap Kart 1A v2 (üstten bakış, USB aşağıda): sol başlık üstten alta 1..16, sağ başlık 32..17.
  static PIN_SOL = ['EN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'D14', 'D13', 'D12', '3V3', 'BAT', '5V', 'GND'];
  static PIN_SAG = ['GND', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', '3V3', '3V3', 'GND'];
  static KABLO_RENK = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0x14b8a6, 0xec4899, 0xeab308];

  /** Pin adı -> dünya konumu (kartın PCB üst yüzü, pad merkezi). Kart yüklenmeden null. */
  kartPin(ad) {
    const k = this.kartKutu; if (!k) return null;
    const A = Sahne.KART_AYAR;
    const uzun = k.max.z - k.min.z, genis = k.max.x - k.min.x;
    for (const [taraf, liste] of [['sol', Sahne.PIN_SOL], ['sag', Sahne.PIN_SAG]]) {
      const i = liste.indexOf(ad === 'D2' ? 'D2' : ad);
      if (i < 0) continue;
      const mesafe = A.ilkPad + i * 2.54;                       // anten ucundan
      const z = A.antenZMax ? k.max.z - mesafe : k.min.z + mesafe;
      const solTaraf = A.solXMin ? k.min.x : k.max.x;
      const sagTaraf = A.solXMin ? k.max.x : k.min.x;
      const yon = taraf === 'sol' ? (A.solXMin ? 1 : -1) : (A.solXMin ? -1 : 1);
      const x = (taraf === 'sol' ? solTaraf : sagTaraf) + yon * A.kenar;
      return new THREE.Vector3(x, k.min.y + A.pcbUst, z);
    }
    return null;
  }

  async #kablolari(tanim) {
    const sira = ++this.kabloSira;
    this.kabloGrup?.removeFromParent();
    this.kabloGrup = new THREE.Group();
    this.s.add(this.kabloGrup);
    await this.kartHazir;
    if (sira !== this.kabloSira) return;
    let renk = 0, gnd = 0;
    (tanim.parcalar ?? []).forEach((p, i) => {
      const n = this.nesneler[i]; if (!n) return;
      const pinler = [...new Set([p.pin, ...(Array.isArray(p.pinler) ? p.pinler : []), p.servoPin, p.isikPin].filter(Boolean))];
      if (p.kablo === false || p.tur === 'araba' || !pinler.length) return;
      const konum = n.group.position;
      pinler.forEach((pin, k) => {
        const bas = this.kartPin(pin); if (!bas) return;
        const son = this.enYakinDelik(new THREE.Vector3(konum.x - 2.54 * (k + 1), 0, konum.z));
        this.#kablo(bas, son, Sahne.KABLO_RENK[renk++ % Sahne.KABLO_RENK.length], 10 + (renk % 4) * 4);
      });
      // GND: karttan breadboard'un (−) rayına, her parça için ayrı delik
      const g = this.kartPin('GND');
      if (g && gnd < 1) this.#kablo(g, this.ray('ust', '-', 1), 0x111827, 22);
      gnd++;
    });
  }

  /** İki nokta arasında jumper kablo: pinden dik çık, yay çiz, deliğe dik in. */
  #kablo(a, b, renk, yukseklik = 12) {
    const yukari = (v, h) => v.clone().setY(v.y + h);
    const orta = a.clone().lerp(b, .5); orta.y = Math.max(a.y, b.y) + yukseklik;
    const yol = new THREE.CatmullRomCurve3([a, yukari(a, 4), yukari(a.clone().lerp(orta, .5), yukseklik * .85), orta, yukari(b.clone().lerp(orta, .5), yukseklik * .85), yukari(b, 4), b], false, 'centripetal');
    const mat = new THREE.MeshStandardMaterial({ color: renk, roughness: .45 });
    this.kabloGrup.add(new THREE.Mesh(new THREE.TubeGeometry(yol, 64, .55, 10), mat));
    const uc = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: .7 }), metal = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: .9, roughness: .3 });
    for (const v of [a, b]) {
      const kap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5, 2.4), uc); kap.position.set(v.x, v.y + 2.5, v.z);
      const tel = new THREE.Mesh(new THREE.BoxGeometry(.6, 4, .6), metal); tel.position.set(v.x, v.y - 1.6, v.z);
      this.kabloGrup.add(kap, tel);
    }
  }

  /** Kart yerleşim ayarı: yön bayrakları, görsel kontrolle ayarlanır. */
  static KART_AYAR = { antenZMax: false, solXMin: true, ilkPad: 6.85, kenar: 1.27, pcbUst: 8.0 };

  /** Bir parçayı (dizin) yeşil halkayla vurgula; null = kapat. */
  vurgu(i) {
    const n = i == null ? null : this.nesneler[i];
    this.halka.visible = !!n;
    if (!n) return;
    const kutu = new THREE.Box3().setFromObject(n.group), c = kutu.getCenter(new THREE.Vector3()), b = kutu.getSize(new THREE.Vector3());
    this.halka.position.set(c.x, kutu.min.y + .3, c.z);
    this.halka.geometry.dispose();
    this.halka.geometry = new THREE.TorusGeometry(Math.max(b.x, b.z) * .75 + 3, .35, 12, 48);
  }

  guncelle(sim) { for (const n of this.nesneler) n.guncelle?.(sim); }
}
