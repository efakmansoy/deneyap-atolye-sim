import { xOrani, sinirla } from '../ortak/m3-kaydirici.js';

// Toprak nem sensörü (çatal iki prob + karşılaştırıcı kartı). Mavi damlayı kaydır: sim.analog[pin] = 0-4095.
// YÜKSEK = ISLAK. Toprak ve su katmanı nem arttıkça koyulaşır/parlar.
const MAX = 4095, UZ = 34, ZY = -14, P2 = 2.54; // başlık pinleri x=-2.54, 0, 2.54 (z=0); kart +z yönünde uzanır
const KURU = [.62, .46, .28], ISLAK = [.17, .11, .07];

export default {
  tur: 'nem',
  // Başlık: A0 (sol, sinyal), V (orta), G (sağ, GND)
  girisler: () => ({ pin: [[-P2, 0]], gnd: [P2, 0], bacaklar: [[-P2, 0], [0, 0], [P2, 0]] }),
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'A0';
    let deger = tanim.baslangic ?? 2000;
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z, ebeveyn = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); ebeveyn.add(m); return m; };

    const pcb = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: .55 });
    const probMat = new THREE.MeshStandardMaterial({ color: 0x20202a, roughness: .5 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: .6 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cf, metalness: .7, roughness: .3 });
    const mavi = new THREE.MeshStandardMaterial({ color: 0x2a62c8, roughness: .45 });
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: .2 });

    // Kontrol kartı 16 x 16 x 1.6 (LM393, mavi trimpot, LED), 2.5 mm siyah başlık üstünde; 3 pin breadboard deliklerine iner (z=0 satırı)
    add(new THREE.BoxGeometry(16, 1.6, 16), pcb, 0, 3.3, 7);
    add(new THREE.BoxGeometry(8, 1.4, 4), siyah, 0, 4.8, 9);
    add(new THREE.BoxGeometry(6, 5, 6), mavi, 4, 6.6, 4);
    add(new THREE.CylinderGeometry(1.4, 1.4, .5, 12), metal, 4, 9.3, 4);
    add(new THREE.BoxGeometry(1.4, .6, 1.4), ledMat, -5, 4.4, 12);
    add(new THREE.BoxGeometry(7.62 + 2.5, 2.5, 2.5), siyah, 0, 1.25, 0);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(.64, 8, .64), altin, (i - 1) * P2, -1, 0);

    // İki prob (çatal): koyu zemin + altın kaplama iz, ortada çatal sapı
    for (const x of [-4.8, 4.8]) {
      add(new THREE.BoxGeometry(4.2, 1.4, 14), probMat, x, 3.3, 22);
      add(new THREE.BoxGeometry(1.8, .3, 12), altin, x, 4.1, 22);
    }
    add(new THREE.BoxGeometry(14, 1.4, 4), probMat, 0, 3.3, 14);

    // Toprak kabı: nemle koyulaşan toprak + üstünde parlak su filmi (problar toprağa gömülü)
    const toprakMat = new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: .95 });
    add(new THREE.BoxGeometry(24, 8, 12), toprakMat, 0, 4.2, 23);
    const suMat = new THREE.MeshStandardMaterial({ color: 0x3a8fd9, transparent: true, opacity: 0, roughness: .1, metalness: .2, depthWrite: false });
    add(new THREE.BoxGeometry(23.4, .5, 11.4), suMat, 0, 8.4, 23);
    const kap = new THREE.MeshStandardMaterial({ color: 0xb85c38, roughness: .8 });
    add(new THREE.BoxGeometry(26, 1.2, 1.2), kap, 0, 8.2, 29);
    add(new THREE.BoxGeometry(26, 1.2, 1.2), kap, 0, 8.2, 17);
    add(new THREE.BoxGeometry(1.2, 1.2, 12), kap, -12.6, 8.2, 23);
    add(new THREE.BoxGeometry(1.2, 1.2, 12), kap, 12.6, 8.2, 23);

    // Kaydırıcı: yol + mavi su damlası (sağa = ISLAK)
    add(new THREE.BoxGeometry(UZ + 8, 1.5, 3), new THREE.MeshStandardMaterial({ color: 0x3a3a55 }), 0, .75, ZY);
    const damla = new THREE.Group(); damla.position.set(0, 14, ZY); group.add(damla);
    const damlaMat = new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x1060c0, emissiveIntensity: .6, roughness: .2 });
    add(new THREE.SphereGeometry(4, 20, 16), damlaMat, 0, 0, 0, damla);
    add(new THREE.ConeGeometry(3.6, 6, 20), damlaMat, 0, 5, 0, damla);
    const sap = add(new THREE.CylinderGeometry(.6, .6, 12, 8), new THREE.MeshStandardMaterial({ color: 0x777790 }), 0, 7, ZY);

    const goster = () => {
      const t = deger / MAX;
      damla.position.x = sap.position.x = (t - .5) * UZ;
      toprakMat.color.setRGB(KURU[0] + (ISLAK[0] - KURU[0]) * t, KURU[1] + (ISLAK[1] - KURU[1]) * t, KURU[2] + (ISLAK[2] - KURU[2]) * t);
      toprakMat.roughness = .95 - t * .4;
      suMat.opacity = Math.max(0, t - .45) * .5;
      ledMat.emissiveIntensity = .2 + t * 2;
    };
    goster();
    const ayarla = (sim, ctx) => {
      const o = xOrani(THREE, ctx, group, UZ, 14);
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
