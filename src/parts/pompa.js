// Mini su pompası + röle modülü: sim.pin[pin] (deger/pwm) okur. Çalışınca rotor döner, röle LED'i yanar, ağızdan su akar.
// Hız = pwm (0-1); analogWrite ile yavaşlar, digitalWrite(HIGH) tam hız.
const N = 30;                                   // su parçacığı sayısı
const AGIZ = { x: 18.5, y: 10, z: 14 };         // çıkış ağzı (pompa grubunun yerel koordinatı)
const YER = 0;                                   // zemin (yerel y)
const G = 120;                                   // yerçekimi (mm/sn²)

// Breadboard: röle modülünün 3 pini (GND, VCC, IN) arka kenarda x = -2.54 0 +2.54, z = -8 (konum.x = orta pin deliği, konum.z = satır z + 8).
// Pompa breadboard yüzeyinde, rölenin sağında durur (kablosu röle klemensine bağlı).
export default {
  tur: 'pompa',
  girisler: () => ({ pin: [[2.54, -8]], gnd: [-2.54, -8], bacaklar: [[-2.54, -8], [0, -8], [2.54, -8]] }),
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'D6';
    const group = new THREE.Group();
    // Röle modülü doğrudan group'a eklenir ve DY kadar alçaltılır (PCB alt yüzü y=2.5; başlık plastiği yüzeyde, pinler deliğe iner)
    const DY = -1.7;
    const add = (geo, mat, x, y, z, ebeveyn = group, dy = ebeveyn === group ? DY : 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y + dy, z); ebeveyn.add(m); return m; };

    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1b64b0, roughness: .55 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .6 });
    const klemens = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: .5 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cf, metalness: .7, roughness: .3 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });
    const kasa = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: .45 });
    const sari = new THREE.MeshStandardMaterial({ color: 0xe5c542, roughness: .5 });
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x1c7a2a, emissive: 0x30ff60, emissiveIntensity: 0 });

    // Röle modülü 26 x 20 (mavi PCB, mavi röle küpü, LED, vidalı klemens, 3 pinli başlık)
    add(new THREE.BoxGeometry(26, 1.6, 20), pcbMat, 0, 5, 0);
    add(new THREE.BoxGeometry(15, 12, 12), new THREE.MeshStandardMaterial({ color: 0x1d3d78, roughness: .4 }), -1, 11.8, 1);
    add(new THREE.BoxGeometry(14, .4, 11), siyah, -1, 18, 1);
    add(new THREE.BoxGeometry(1.6, .8, 1.6), ledMat, 8.5, 6, -7);
    add(new THREE.BoxGeometry(3.5, 3, 3), siyah, 8, 6.9, 5);
    add(new THREE.BoxGeometry(10, 7, 6), klemens, 0, 8.8, 8.2);
    for (const x of [-3.3, 0, 3.3]) add(new THREE.CylinderGeometry(1.2, 1.2, .5, 10), metal, x, 12.5, 8.2);
    add(new THREE.BoxGeometry(7.62 + 2.5, 2.5, 2.5), siyah, 0, 2.95, -8);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(.64, 10, .64), altin, (i - 1) * 2.54, 1.2, -8);
    for (const x of [-9, 9]) add(new THREE.BoxGeometry(3, 2.5, 3), siyah, x, 2.95, 7.5);    // ön destek ayakları

    // Pompa: yatay motor silindiri + sarı pervane kapağı + yana bakan çıkış borusu
    const pompa = new THREE.Group(); pompa.position.set(28, 0, 0); group.add(pompa);   // breadboard yüzeyinde (gövde altı y=0)
    add(new THREE.CylinderGeometry(7, 7, 22, 24), kasa, 0, 7, 0, pompa).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(8.2, 8.2, 6, 24), sari, 0, 7, 14, pompa).rotation.x = Math.PI / 2;
    const rotor = new THREE.Group(); rotor.position.set(0, 7, 17.2); pompa.add(rotor);
    for (let i = 0; i < 4; i++) {
      const k = add(new THREE.BoxGeometry(1, 5.4, .8), metal, 0, 0, 0, rotor);
      k.rotation.z = i * Math.PI / 2; k.position.set(-Math.sin(i * Math.PI / 2) * 2.7, Math.cos(i * Math.PI / 2) * 2.7, 0);
    }
    add(new THREE.CylinderGeometry(1.6, 1.6, 1, 12), metal, 0, 0, 0, rotor).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(2.2, 2.2, 14, 14), sari, 10, 10, 14, pompa).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(2.8, 2.8, 2, 14), sari, 17.5, 10, 14, pompa).rotation.z = Math.PI / 2;
    for (const z of [-5, 5]) add(new THREE.BoxGeometry(12, 1.2, 3), siyah, 0, .6, z, pompa);   // taban takozları
    // Kırmızı-siyah kablo: pompanın sol yanından röle klemensine
    for (const [renk, dz] of [[0xd22b2b, 1.4], [0x111111, -1.4]]) {
      const egri = new THREE.CatmullRomCurve3([new THREE.Vector3(21.5, 8, 4 + dz), new THREE.Vector3(17, 12, 6 + dz * 1.5), new THREE.Vector3(11, 12, 8 + dz * 1.5), new THREE.Vector3(5 + dz * 2, 11, 8.2 + dz)]);
      add(new THREE.TubeGeometry(egri, 12, .5, 5, false), new THREE.MeshStandardMaterial({ color: renk, roughness: .6 }), 0, 0, 0, group, 0);
    }

    // Su parçacıkları: ağızdan çıkıp yay çizerek düşer, yere varınca gizlenir
    const damlaG = new THREE.SphereGeometry(.9, 8, 6);
    const suMat = new THREE.MeshStandardMaterial({ color: 0x4aa8ff, transparent: true, opacity: .85, roughness: .1 });
    const su = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(damlaG, suMat); m.visible = false; pompa.add(m);
      su.push({ m, t: i / N });
    }
    const havuzMat = new THREE.MeshStandardMaterial({ color: 0x3a8fd9, transparent: true, opacity: .55, roughness: .1, depthWrite: false });
    const havuz = add(new THREE.CylinderGeometry(1, 1, .4, 24), havuzMat, 0, YER + .3, 14, pompa); havuz.visible = false;

    const durum = { oran: 0, aci: 0 };
    return {
      group, durum,
      guncelle(sim) { const p = sim.pin[pin]; durum.oran = p?.mod === 'cikti' ? p.pwm : 0; },
      kare(dt, sim) {
        const p = sim?.pin?.[pin];
        const o = p && p.mod === 'cikti' ? p.pwm : 0;
        durum.oran = o;
        durum.aci += dt * o * 40;
        rotor.rotation.z = durum.aci;
        ledMat.emissiveIntensity = o > 0 ? 2.2 : 0;
        const vx = 12 + o * 28, vy = 8 + o * 10;
        for (const s of su) {
          s.t = o > 0 ? (s.t + dt * (.6 + o * 1.2)) % 1 : 1;
          const z = s.t * .75;                                  // uçuş süresi (sn)
          const y = AGIZ.y + vy * z - .5 * G * z * z;
          s.m.visible = o > 0 && y > YER;
          s.m.position.set(AGIZ.x + vx * z, y, AGIZ.z);
        }
        havuz.visible = o > 0;
        if (o > 0) { const r = 3 + 5 * o; havuz.scale.set(r, 1, r * .8); havuz.position.x = AGIZ.x + vx * .55; }
      },
    };
  },
};
