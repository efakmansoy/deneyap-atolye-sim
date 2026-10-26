import { xOrani, sinirla } from '../ortak/m3-kaydirici.js';

// Sıcaklık sensörü: kaydırıcıyla 0-50 °C arası ayarlanır; analog değer 0-4095 (sıcaklık / 50 * 4095).
const MAX = 4095, UZ = 34, Z = -7.62;

let P = null;
function paylasim(THREE) {
  if (P && P.THREE === THREE) return P;
  // TO-92 D-profili: düz yüz +z tarafında, yarım daire -z tarafında; y yönünde 5 mm
  const sh = new THREE.Shape(), r = 2.6;
  sh.moveTo(-r, 0); sh.lineTo(r, 0);
  sh.absarc(0, 0, r, 0, Math.PI, false);
  const govG = new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false, curveSegments: 14 });
  govG.rotateX(-Math.PI / 2);
  P = {
    THREE, govG,
    camG: new THREE.CylinderGeometry(1.6, 1.6, 20, 16),
    siviG: new THREE.CylinderGeometry(.9, .9, 1, 12),
    hazneG: new THREE.SphereGeometry(2.8, 16, 12),
    bacakG: new THREE.BoxGeometry(.5, 8, .3),
    yolG: new THREE.BoxGeometry(UZ + 8, 1.5, 3),
    tutacG: new THREE.BoxGeometry(5, 5, 5),
    cam: new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: .4 }),
    kirmizi: new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0x660000 }),
    govde: new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: .55 }),
    gumus: new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: .7, roughness: .3 }),
    yol: new THREE.MeshStandardMaterial({ color: 0x3a3a55 }),
  };
  return P;
}

export default {
  tur: 'sicaklik',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'A1';
    let deger = tanim.baslangic ?? 1500;
    const p = paylasim(THREE);
    const group = new THREE.Group();
    const cam = new THREE.Mesh(p.camG, p.cam);
    cam.position.set(0, 10, -8);
    const sivi = new THREE.Mesh(p.siviG, p.kirmizi);
    const hazne = new THREE.Mesh(p.hazneG, p.kirmizi);
    hazne.position.set(0, 2.8, -8);
    // TO-92 gövde: 2.54 aralıklı 3 bacak (x = 7.62, 10.16, 12.7)
    const govde = new THREE.Mesh(p.govG, p.govde);
    govde.position.set(10.16, 3, Z);
    group.add(govde);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(p.bacakG, p.gumus);
      b.position.set(7.62 + i * 2.54, 0, Z);
      group.add(b);
    }
    const yol = new THREE.Mesh(p.yolG, p.yol);
    yol.position.set(0, .75, 7);
    const tutacMat = new THREE.MeshStandardMaterial({ color: 0x4aa3ff });
    const tutac = new THREE.Mesh(p.tutacG, tutacMat);
    tutac.position.set(0, 4, 7);
    group.add(cam, sivi, hazne, yol, tutac);
    const goster = () => {
      const t = deger / MAX;
      const h = 2 + t * 16;
      sivi.scale.y = h; sivi.position.set(0, 3 + h / 2, -8);
      tutac.position.x = (t - .5) * UZ;
      tutacMat.color.setRGB(.2 + t * .8, .55 - t * .3, 1 - t * .8);
    };
    const ayarla = (sim, ctx) => {
      const o = xOrani(THREE, ctx, group, UZ, 4);
      if (o === null) return;
      deger = Math.round(sinirla(o, 0, 1) * MAX);
      sim.analog[pin] = deger; goster();
    };
    return {
      group,
      guncelle(sim) {
        if (sim.analog[pin] === undefined) sim.analog[pin] = deger; else deger = sim.analog[pin];
        goster();
      },
      kare(dt, sim) { if (sim && sim.analog[pin] !== undefined && sim.analog[pin] !== deger) { deger = sim.analog[pin]; goster(); } },
      pointerDown: ayarla,
      pointerMove: ayarla,
    };
  },
};
