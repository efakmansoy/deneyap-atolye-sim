// 5 mm LED (yarı saydam epoksi, flanş, anot/katot tel çerçeve, çip) + 220 Ω seri direnç (kırmızı-kırmızı-kahverengi-altın).
// Anot ana delikte (x=0), katot bir delik sağda (x=+2.54), uzun bacak anot. Direnç iki satır ötede, anot sütununa bağlı.
// tanim: { pin, renk }. Davranış: sim.pin[pin].pwm ile parlar.
const RENK = { kirmizi: 0xff3b3b, yesil: 0x38ef7d, sari: 0xffd23b, mavi: 0x4aa3ff };
const P = 2.54, Y0 = 1.6; // flanş tabanı (bacaklar bükülüp LED'i delik üstünde tutar)

let ORT = null; // paylaşımlı geometri/malzeme
let HALE = null;
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
  // flanş: yuvarlak, katot (+x) tarafı düz kesik
  const sh = new THREE.Shape(), R = 2.9, kes = 2.35, a = Math.acos(kes / R);
  sh.absarc(0, 0, R, a, Math.PI * 2 - a, false); sh.lineTo(kes, Math.sin(a) * R);
  const flans = new THREE.ExtrudeGeometry(sh, { depth: .9, bevelEnabled: false, curveSegments: 16 });
  flans.rotateX(-Math.PI / 2);
  const govde = new THREE.CylinderGeometry(2.5, 2.5, 4.6, 20, 1, true);
  govde.translate(0, 2.3, 0);
  const kubbe = new THREE.SphereGeometry(2.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  kubbe.translate(0, 4.6, 0);
  // direnç gövdesi: ince orta + uç şişlikleri (LatheGeometry, x ekseni boyunca)
  const prof = [[0, -3.3], [1.0, -3.3], [1.35, -3.0], [1.35, -2.3], [1.0, -2.0], [1.0, 2.0], [1.35, 2.3], [1.35, 3.0], [1.0, 3.3], [0, 3.3]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const dGovde = new THREE.LatheGeometry(prof, 14); dGovde.rotateZ(Math.PI / 2);
  const bant = new THREE.CylinderGeometry(1.4, 1.4, .55, 14); bant.rotateZ(Math.PI / 2);
  ORT = {
    flans, govde, kubbe, dGovde, bant,
    tel: new THREE.BoxGeometry(.5, 1, .5),
    cip: new THREE.BoxGeometry(1.1, .35, 1.1),
    cekirdek: new THREE.SphereGeometry(1.9, 12, 8),
    metal: new THREE.MeshStandardMaterial({ color: 0xcfcfd6, metalness: .9, roughness: .3 }),
    altin: new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: .8, roughness: .35 }),
    dMat: new THREE.MeshStandardMaterial({ color: 0xd9b27c, roughness: .8 }),
    bantMat: [0xd62828, 0xd62828, 0x6b3a1a, 0xc9a227].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .6 })),
  };
  return ORT;
}

export default {
  tur: 'led',
  olustur({ THREE, tanim }) {
    const renk = RENK[tanim.renk] ?? RENK.kirmizi;
    const O = ortak(THREE);
    const group = new THREE.Group();
    const led = new THREE.Group();            // LED gövdesi, merkez iki bacağın ortasında
    led.position.set(P / 2, Y0, 0);
    group.add(led);
    const solid = new THREE.Color(renk).lerp(new THREE.Color(0xffffff), .35);
    const epoksi = new THREE.MeshStandardMaterial({ color: solid, emissive: renk, emissiveIntensity: 0, transparent: true, opacity: .55, roughness: .12, metalness: 0, depthWrite: false });
    const flansMat = new THREE.MeshStandardMaterial({ color: solid, emissive: renk, emissiveIntensity: 0, transparent: true, opacity: .75, roughness: .2, depthWrite: false });
    const flans = new THREE.Mesh(O.flans, flansMat);
    const govde = new THREE.Mesh(O.govde, epoksi); govde.position.y = .9;
    const kubbe = new THREE.Mesh(O.kubbe, epoksi); kubbe.position.y = .9;
    // içte: anot (ince direk + kafa) ve katot (çip tutucu kase) tel çerçevesi, çip
    const cerceve = new THREE.Group(); cerceve.position.y = .9; led.add(cerceve);
    const anot = new THREE.Mesh(O.tel, O.metal); anot.scale.set(1, 3.6, 1); anot.position.set(-P / 2, 1.8, 0);
    const katot = new THREE.Mesh(O.tel, O.metal); katot.scale.set(1.8, 3.2, 1); katot.position.set(P / 2, 1.6, 0);
    const kase = new THREE.Mesh(O.cip, O.metal); kase.scale.set(1.9, 1.4, 1.9); kase.position.set(P / 2, 3.25, 0);
    const kafa = new THREE.Mesh(O.cip, O.metal); kafa.scale.set(.5, 1.4, .5); kafa.position.set(-P / 2, 3.7, 0);
    const cipMat = new THREE.MeshStandardMaterial({ color: 0x555555, emissive: renk, emissiveIntensity: 0, roughness: .5 });
    const cip = new THREE.Mesh(O.cip, cipMat); cip.scale.set(.8, 1, .8); cip.position.set(P / 2, 3.6, 0);
    cerceve.add(anot, katot, kase, kafa, cip);
    // içten parlama çekirdeği
    const cekMat = new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const cekirdek = new THREE.Mesh(O.cekirdek, cekMat); cekirdek.position.set(0, 3.8, 0);
    led.add(cekirdek, flans, govde, kubbe);
    // bacaklar: anot uzun (-5.5), katot kısa (-4); breadboard içine girer
    const bacakUz = (x, alt) => {
      const b = new THREE.Mesh(O.tel, O.metal);
      const ust = Y0 + .2;
      b.scale.set(1, ust - alt, 1); b.position.set(x, (ust + alt) / 2, 0);
      group.add(b);
    };
    bacakUz(0, -5.5); bacakUz(P, -4.2);
    // halo
    const doku = haleDoku(THREE);
    let hale = null;
    if (doku) {
      hale = new THREE.Sprite(new THREE.SpriteMaterial({ map: doku, color: renk, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      hale.position.set(P / 2, Y0 + 4.8, 0); hale.scale.setScalar(14);
      group.add(hale);
    }
    const isik = new THREE.PointLight(renk, 0, 60);
    isik.position.set(P / 2, 12, 0);
    group.add(isik);

    // 220 Ω direnç: anot sütunundan 3 delik sola, iki satır ötede yatay
    const dz = 2 * P, d = new THREE.Group(); d.position.set(0, 0, dz); group.add(d);
    const dxA = -3 * P, uzun = 3 * P;       // sol bacak x, aralık
    const dg = new THREE.Mesh(O.dGovde, O.dMat); dg.position.set(dxA + uzun / 2, 1.55, 0); d.add(dg);
    const bx = [-2.0, -1.0, 0.0, 1.9];       // 3 bant yakın, altın tolerans bandı ayrık
    bx.forEach((x, i) => { const b = new THREE.Mesh(O.bant, O.bantMat[i]); b.position.set(dxA + uzun / 2 + x, 1.55, 0); d.add(b); });
    for (const [x, yon] of [[dxA, 1], [dxA + uzun, -1]]) {
      const dik = new THREE.Mesh(O.tel, O.metal); dik.scale.set(1, 1.55 + 4, 1); dik.position.set(x, (1.55 - 4) / 2, 0);
      const yat = new THREE.Mesh(O.tel, O.metal); yat.scale.set(1, .9, 1); yat.rotation.z = Math.PI / 2; yat.position.set(x + yon * .35, 1.55, 0);
      d.add(dik, yat);
    }

    return {
      group,
      guncelle(sim) {
        const p = sim.pin[tanim.pin];
        const a = p.mod === 'cikti' ? p.pwm : 0;
        epoksi.emissiveIntensity = a * 1.1;
        flansMat.emissiveIntensity = a * .9;
        cipMat.emissiveIntensity = a * 2;
        cekMat.opacity = a * .85;
        if (hale) hale.material.opacity = a * .65;
        isik.intensity = a * 900;
      },
    };
  },
};
