// RGB LED (5 mm, 4 bacaklı, ortak katot): pinler [r, g, b] — her kanal PWM ile karışır.
// Bacak sırası: R, katot (en uzun), G, B; x = 0, 2.54, 5.08, 7.62 (deliklere girer). Gövde süt beyazı difüz epoksi.
const P = 2.54, Y0 = 1.6;
let ORT = null, HALE = null;
function haleDoku(THREE) {
  if (HALE !== null) return HALE || null;
  HALE = false;
  try {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    HALE = new THREE.CanvasTexture(c);
  } catch { HALE = false; }
  return HALE || null;
}
function ortak(THREE) {
  if (ORT) return ORT;
  const sh = new THREE.Shape(), R = 3.0, kes = 2.5, a = Math.acos(kes / R);
  sh.absarc(0, 0, R, a, Math.PI * 2 - a, false); sh.lineTo(kes, Math.sin(a) * R);
  const flans = new THREE.ExtrudeGeometry(sh, { depth: .9, bevelEnabled: false, curveSegments: 16 });
  flans.rotateX(-Math.PI / 2);
  const govde = new THREE.CylinderGeometry(2.6, 2.6, 4.4, 20, 1, true); govde.translate(0, 2.2, 0);
  const kubbe = new THREE.SphereGeometry(2.6, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); kubbe.translate(0, 4.4, 0);
  ORT = {
    flans, govde, kubbe,
    tel: new THREE.BoxGeometry(.5, 1, .5),
    cip: new THREE.BoxGeometry(.9, .35, .9),
    cekirdek: new THREE.SphereGeometry(2.0, 12, 8),
    metal: new THREE.MeshStandardMaterial({ color: 0xcfcfd6, metalness: .9, roughness: .3 }),
  };
  return ORT;
}

export default {
  tur: 'rgb-led',
  izgara: true,
  // Bacaklar R, katot, G, B (x = 0..3P)
  girisler: () => ({ pin: [[0, 0], [2 * P, 0], [3 * P, 0]], gnd: [P, 0], bacaklar: [[0, 0], [P, 0], [2 * P, 0], [3 * P, 0]] }),
  olustur({ THREE, tanim }) {
    const pinler = tanim.pinler ?? ['D0', 'D1', 'D2'];
    const O = ortak(THREE);
    const group = new THREE.Group();
    // süt beyazı difüz epoksi; yanınca rengi karışımla boyanır
    const epoksi = new THREE.MeshStandardMaterial({ color: 0xe9e9ee, emissive: 0x000000, emissiveIntensity: 1, transparent: true, opacity: .62, roughness: .35, depthWrite: false });
    const flansMat = new THREE.MeshStandardMaterial({ color: 0xe9e9ee, emissive: 0x000000, emissiveIntensity: 1, transparent: true, opacity: .8, roughness: .35, depthWrite: false });
    // bacaklar (katot en uzun)
    [0, 1, 2, 3].forEach((_, i) => {
      const b = new THREE.Mesh(O.tel, O.metal), ust = Y0 + .2, a = i === 1 ? -6.8 : -4.6;
      b.scale.set(1, ust - a, 1); b.position.set(i * P, (ust + a) / 2, 0); group.add(b);
    });
    const govde = new THREE.Mesh(O.govde, epoksi); govde.position.set(1.5 * P, Y0 + .9, 0); group.add(govde); // group.children[4]
    const led = new THREE.Group(); led.position.set(1.5 * P, Y0, 0); group.add(led);
    const flans = new THREE.Mesh(O.flans, flansMat);
    const kubbe = new THREE.Mesh(O.kubbe, epoksi); kubbe.position.y = .9;
    // içte: dört tel, ortadaki (katot) kasede 3 çip
    const cerceve = new THREE.Group(); cerceve.position.y = .9; led.add(cerceve);
    [-1.5, -.5, .5, 1.5].forEach((k, i) => {
      const t = new THREE.Mesh(O.tel, O.metal); const h = i === 1 ? 3.4 : 2.8;
      t.scale.set(i === 1 ? 2.2 : 1, h, 1); t.position.set(k * P * (i === 1 ? .15 : .45), h / 2, 0);
      cerceve.add(t);
    });
    const cipRenk = [0xff2020, 0x20ff40, 0x2860ff];
    const cipler = cipRenk.map((c, i) => {
      const m = new THREE.MeshStandardMaterial({ color: 0x444444, emissive: c, emissiveIntensity: 0, roughness: .5 });
      const cp = new THREE.Mesh(O.cip, m); cp.position.set((i - 1) * 1.0, 3.2, (i === 1 ? .6 : -.4)); cerceve.add(cp);
      return m;
    });
    const cekMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const cekirdek = new THREE.Mesh(O.cekirdek, cekMat); cekirdek.position.set(0, 3.8, 0);
    led.add(cekirdek, flans, kubbe);
    const doku = haleDoku(THREE);
    let hale = null;
    if (doku) {
      hale = new THREE.Sprite(new THREE.SpriteMaterial({ map: doku, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      hale.position.set(1.5 * P, Y0 + 4.8, 0); hale.scale.setScalar(16); group.add(hale);
    }
    const isik = new THREE.PointLight(0xffffff, 0, 70);
    isik.position.set(1.5 * P, 13, 0);
    group.add(isik);
    const gecici = new THREE.Color();
    function ciz(sim) {
      const [r, g, b] = pinler.map(p => { const s = sim.pin[p]; return s && s.mod === 'cikti' ? s.pwm : 0; });
      gecici.setRGB(r, g, b);
      const siddet = Math.max(r, g, b);
      epoksi.emissive.copy(gecici); epoksi.emissiveIntensity = siddet * 1.4;
      flansMat.emissive.copy(gecici); flansMat.emissiveIntensity = siddet * 1.1;
      epoksi.color.setRGB(.8 + r * .2, .8 + g * .2, .8 + b * .2);
      [r, g, b].forEach((v, i) => { cipler[i].emissiveIntensity = v * 2; });
      cekMat.color.copy(gecici); cekMat.opacity = siddet * .8;
      if (hale) { hale.material.color.copy(gecici); hale.material.opacity = siddet * .65; }
      isik.color.copy(gecici);
      isik.intensity = siddet * 900;
    }
    return { group, guncelle: ciz };
  },
};
