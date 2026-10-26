import { xOrani, sinirla } from '../ortak/m3-kaydirici.js';

// LDR (ışık sensörü) + sürüklenebilir güneş/lamba. Işık ne kadar çoksa değer o kadar büyük (0-4095).
const MAX = 4095, UZ = 34, Z = -7.62;

// CdS yüzey deseni: bej zemin üstünde iki tarak elektrot (kıvrımlı kırmızı-kahve iz)
function izDoku(THREE) {
  try {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); if (!g) return null;
    g.fillStyle = '#d9b98a'; g.fillRect(0, 0, 256, 256);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    const n = 8, y0 = 46, y1 = 210;
    for (let i = 0; i <= n; i++) {
      const y = y0 + (y1 - y0) * i / n;
      g.lineTo(i % 2 ? 194 : 62, y); g.lineTo(i % 2 ? 62 : 194, y);
    }
    g.strokeStyle = '#7a2e1c'; g.lineWidth = 13; g.stroke();
    g.strokeStyle = '#a2492b'; g.lineWidth = 5; g.stroke();
    const t = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  } catch { return null; }
}

let P = null;
function paylasim(THREE) {
  if (P && P.THREE === THREE) return P;
  const tex = izDoku(THREE);
  P = {
    THREE,
    diskG: new THREE.CylinderGeometry(4.5, 4.5, 1.6, 28),
    yuzG: new THREE.CircleGeometry(4.1, 28),
    bacakG: new THREE.CylinderGeometry(.3, .3, 9, 8),
    yolG: new THREE.BoxGeometry(UZ + 8, 1.5, 3),
    kureG: new THREE.SphereGeometry(4.5, 20, 16),
    sapG: new THREE.CylinderGeometry(.6, .6, 16, 8),
    disk: new THREE.MeshStandardMaterial({ color: 0xcfb084, roughness: .7 }),
    yuz: new THREE.MeshStandardMaterial(tex ? { map: tex, roughness: .35 } : { color: 0xa8552e, roughness: .35 }),
    gumus: new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: .7, roughness: .3 }),
    yol: new THREE.MeshStandardMaterial({ color: 0x3a3a55 }),
    sap: new THREE.MeshStandardMaterial({ color: 0x777790 }),
  };
  return P;
}

export default {
  tur: 'ldr',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'A0';
    let deger = tanim.baslangic ?? 2800;
    const p = paylasim(THREE);
    const group = new THREE.Group();
    const disk = new THREE.Mesh(p.diskG, p.disk);
    disk.position.set(0, 4.6, Z);
    const yuz = new THREE.Mesh(p.yuzG, p.yuz);
    yuz.rotation.x = -Math.PI / 2; yuz.position.set(0, 5.42, Z);
    group.add(disk, yuz);
    for (const x of [-1.27, 1.27]) {
      const b = new THREE.Mesh(p.bacakG, p.gumus);
      b.position.set(x, 1.5, Z);
      group.add(b);
    }
    const yol = new THREE.Mesh(p.yolG, p.yol);
    yol.position.set(0, .75, 7);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0xffd23b, emissive: 0xffa500, emissiveIntensity: 1 });
    const gun = new THREE.Group();
    const kure = new THREE.Mesh(p.kureG, gunMat);
    const sap = new THREE.Mesh(p.sapG, p.sap);
    sap.position.y = -9;
    kure.position.y = 4;
    gun.add(kure, sap);
    gun.position.set(0, 18, 7);
    const isik = new THREE.PointLight(0xffe08a, 0, 80);
    gun.add(isik);
    group.add(yol, gun);
    const goster = () => {
      const t = deger / MAX;
      gun.position.x = (t - .5) * UZ;
      gunMat.emissiveIntensity = .1 + t * 1.6;
      gunMat.color.setRGB(.35 + t * .65, .3 + t * .6, .15 + t * .2);
      isik.intensity = t * 500;
    };
    const ayarla = (sim, ctx) => {
      const o = xOrani(THREE, ctx, group, UZ, 18);
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
