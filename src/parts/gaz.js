import { xOrani, sinirla } from '../ortak/m3-kaydirici.js';

// MQ-2 gaz/duman sensörü (metal ağ başlıklı silindir + mavi kart). Kaydırıcı: sim.analog[pin] = 0-4095 (YÜKSEK = ÇOK GAZ).
// Gaz arttıkça sensörün üstünde daha çok ve koyu duman parçacığı yükselir.
const MAX = 4095, UZ = 34, ZY = 22, N = 36;

export default {
  tur: 'gaz',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'A0';
    let deger = tanim.baslangic ?? 600;
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z, ebeveyn = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); ebeveyn.add(m); return m; };

    const pcb = new THREE.MeshStandardMaterial({ color: 0x1b64b0, roughness: .55 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .6 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cf, metalness: .75, roughness: .3 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: .2 });

    // Kart 20 x 28 + 4 pinli başlık (A0, D0, GND, VCC), trimpot, LM393, LED
    add(new THREE.BoxGeometry(20, 1.6, 28), pcb, 0, 6, 0);
    add(new THREE.BoxGeometry(10.2 + 2.5, 2.5, 2.5), siyah, 0, 4.9, -12);
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(.64, 7.6, .64), altin, (i - 1.5) * 2.54, 3.2, -12);
    add(new THREE.BoxGeometry(5, 4, 5), new THREE.MeshStandardMaterial({ color: 0x2a62c8, roughness: .45 }), 6, 8.8, -6);
    add(new THREE.BoxGeometry(6, 1.4, 4), siyah, -5, 7.5, -6);
    add(new THREE.BoxGeometry(1.4, .6, 1.4), ledMat, -7, 7, -9);

    // Sensör: metal ağ başlıklı silindir (çap 15), alt siyah taban, ağ deseni üzerinde halkalar
    add(new THREE.CylinderGeometry(7.6, 7.6, 3, 28), siyah, 0, 8, 4);
    add(new THREE.CylinderGeometry(7.4, 7.4, 8, 28), metal, 0, 13, 4);
    add(new THREE.CylinderGeometry(6.2, 6.2, .4, 28), new THREE.MeshStandardMaterial({ color: 0x3a3a3f, roughness: .8 }), 0, 17.1, 4);
    for (const r of [2, 3.6, 5.2]) add(new THREE.TorusGeometry(r, .22, 6, 28), metal, 0, 17.3, 4).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const b = add(new THREE.BoxGeometry(12.4, .2, .35), metal, 0, 17.35, 4); b.rotation.y = i * Math.PI / 6; }

    // Duman parçacıkları: sensörün üstünden yükselir, büyür, solar
    const dumanG = new THREE.IcosahedronGeometry(1, 1);
    const duman = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(dumanG, new THREE.MeshBasicMaterial({ color: 0x777777, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; group.add(m);
      duman.push({ m, t: i / N, ax: Math.random() * 6.28, r: Math.random(), h: .7 + Math.random() * .6 });
    }

    // Kaydırıcı: yol + gri-yeşil gaz bulutu topu (sağa = ÇOK GAZ)
    add(new THREE.BoxGeometry(UZ + 8, 1.5, 3), new THREE.MeshStandardMaterial({ color: 0x3a3a55 }), 0, .75, ZY);
    const sap = add(new THREE.CylinderGeometry(.6, .6, 12, 8), new THREE.MeshStandardMaterial({ color: 0x777790 }), 0, 7, ZY);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x9aa89a, roughness: .9 });
    const top = add(new THREE.SphereGeometry(4.2, 20, 16), topMat, 0, 14, ZY);

    const goster = () => {
      const t = deger / MAX;
      top.position.x = sap.position.x = (t - .5) * UZ;
      topMat.color.setRGB(.7 - t * .45, .72 - t * .45, .7 - t * .45);
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
      kare(dt, sim) {
        if (sim && sim.analog[pin] !== undefined && sim.analog[pin] !== deger) { deger = sim.analog[pin]; goster(); }
        const t = deger / MAX;
        const goren = Math.round(N * Math.min(1, t * 1.15));            // gaz arttıkça daha çok parçacık
        duman.forEach((d, i) => {
          const aktif = i < goren && t > .03;
          d.m.visible = aktif;
          if (!aktif) return;
          d.t = (d.t + dt * (.25 + t * .35) * d.h) % 1;
          const y = 18 + d.t * (14 + t * 30);
          const yay = 1.5 + d.t * (3 + t * 7) * d.r;
          d.m.position.set(Math.cos(d.ax + d.t * 2) * yay, y, 4 + Math.sin(d.ax + d.t * 2) * yay);
          const s = 1.2 + d.t * (2 + t * 3);
          d.m.scale.set(s, s, s);
          const k = .35 - t * .3;                                           // az gaz: açık gri, çok gaz: koyu
          d.m.material.color.setRGB(k + .2, k + .2, k + .2);
          d.m.material.opacity = (1 - d.t) * (.25 + t * .45);
        });
      },
      pointerDown: ayarla,
      pointerMove: ayarla,
    };
  },
};
