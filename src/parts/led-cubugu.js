// LED çubuğu modülü: pinler [...] (varsayılan 8) — her segment kendi pininin PWM değerine göre parlar.
// Gerçek modül gibi: siyah plastik gövde, 2.54 mm aralıklı segmentler, iki sıra bacak (7.62 mm arayla, orta kanalın iki yanına).
const P = 2.54, ARA = 7.62, Y0 = 1.0;
let HALE = null;
function haleDoku(THREE) {
  if (HALE !== null) return HALE || null;
  HALE = false;
  try {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    HALE = new THREE.CanvasTexture(c);
  } catch { HALE = false; }
  return HALE || null;
}

export default {
  tur: 'led-cubugu',
  olustur({ THREE, tanim }) {
    const pinler = tanim.pinler ?? ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
    const n = pinler.length;
    const group = new THREE.Group();
    const L = n * P + .8, orta = (n - 1) * P / 2;
    const plastik = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .55 });
    const kasa = new THREE.Mesh(new THREE.BoxGeometry(L, 4.4, 9.6), plastik);
    kasa.position.set(orta, Y0 + 2.2, ARA / 2);
    group.add(kasa);
    // segmentler: yarı saydam renkli lens + yanında içeriden parlama
    const lensG = new THREE.BoxGeometry(P - .6, .35, 6.4);
    const doku = haleDoku(THREE);
    const parcalar = pinler.map((_, i) => {
      const renk = i < n * .5 ? 0x38ef7d : i < n * .8 ? 0xffd23b : 0xff3b3b;
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(renk).multiplyScalar(.55), emissive: renk, emissiveIntensity: 0, transparent: true, opacity: .92, roughness: .25 });
      const l = new THREE.Mesh(lensG, m);
      l.position.set(i * P, Y0 + 4.4 + .1, ARA / 2);
      group.add(l);
      return { m, renk, h: null };
    });
    parcalar.forEach((p, i) => {
      if (!doku) return;
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: doku, color: p.renk, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      h.position.set(i * P, Y0 + 6, ARA / 2); h.scale.setScalar(6.5); group.add(h); p.h = h;
    });
    // pin-1 işareti (köşe pah): küçük açık gri işaret
    const isaret = new THREE.Mesh(new THREE.BoxGeometry(.9, .15, .9), new THREE.MeshStandardMaterial({ color: 0x8a8a94, roughness: .6 }));
    isaret.position.set(-L / 2 + orta + .8, Y0 + 4.45, ARA / 2 + 4);
    group.add(isaret);
    // bacaklar
    const metal = new THREE.MeshStandardMaterial({ color: 0xcfcfd6, metalness: .9, roughness: .3 });
    const telG = new THREE.BoxGeometry(.5, Y0 + 4.2, .5);
    for (let i = 0; i < n; i++) for (const z of [0, ARA]) {
      const t = new THREE.Mesh(telG, metal); t.position.set(i * P, (Y0 - 4.2) / 2, z); group.add(t);
    }
    return {
      group,
      guncelle(sim) {
        pinler.forEach((p, i) => {
          const s = sim.pin[p];
          const a = s && s.mod === 'cikti' ? s.pwm : 0;
          parcalar[i].m.emissiveIntensity = a * 2.2;
          if (parcalar[i].h) parcalar[i].h.material.opacity = a * .75;
        });
      },
    };
  },
};
