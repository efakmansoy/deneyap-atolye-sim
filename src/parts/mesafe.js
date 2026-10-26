// Ultrasonik mesafe sensörü (HC-SR04). Turuncu engeli sürükle: sim.cihaz.mesafe[pin] = cm (2-200).
const OLCEK = .15;   // mm / cm
const OFSET = 8;     // sensör önünden engele başlangıç mesafesi (mm)
const CY = 12.5;     // PCB merkez yüksekliği (mm)

const P = 2.54;
// Dik duran modül: 4 pin (VCC, Trig, Echo, GND) aynı satırda ardışık sütunlarda, x = -3.81 -1.27 +1.27 +3.81 (konum.x = ilk pin deliği + 3.81).
// Sinyal: Trig (2. pin); GND: 4. pin. Dört bacak da deliğe girer.
export default {
  tur: 'mesafe',
  girisler: () => ({ pin: [[-1.27, 0]], gnd: [3.81, 0], bacaklar: [[-3.81, 0], [-1.27, 0], [1.27, 0], [3.81, 0]] }),
  olustur({ THREE, tanim }) {
    const pin = tanim.pin;
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };

    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1b64b0, roughness: .55 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .6 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cf, metalness: .7, roughness: .3 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });
    const meshMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: .8 });

    // PCB 45 x 20 x 1.6 (dik durur, alt kenar y=2.5 = başlığın üstü)
    add(new THREE.BoxGeometry(45, 20, 1.6), pcbMat, 0, CY, 0);
    // 4 pinli başlık (Vcc, Trig, Echo, Gnd): plastik gövde breadboard yüzeyinde, pinler deliğe iner (y -5)
    add(new THREE.BoxGeometry(10.2, 2.5, 2.5), siyah, 0, 1.25, 0);
    for (let i = 0; i < 4; i++) {
      add(new THREE.BoxGeometry(.64, 10, .64), altin, (i - 1.5) * P, 0, 0);
    }
    // İki transdüser "göz": gümüş silindir + koyu ızgara + arka gövde
    const govdeGeo = new THREE.CylinderGeometry(8, 8, 6.4, 24);
    const halkaGeo = new THREE.CylinderGeometry(6.4, 6.4, .3, 24);
    const izgaraGeo = new THREE.CylinderGeometry(5.6, 5.6, .5, 24);
    const merkezGeo = new THREE.CylinderGeometry(2, 2, .6, 12);
    for (const x of [-13, 13]) {
      const g = add(govdeGeo, metal, x, CY + 1.5, 4); g.rotation.x = Math.PI / 2;
      const h = add(halkaGeo, metal, x, CY + 1.5, 7.5); h.rotation.x = Math.PI / 2;
      const iz = add(izgaraGeo, meshMat, x, CY + 1.5, 7.45); iz.rotation.x = Math.PI / 2;
      const m = add(merkezGeo, metal, x, CY + 1.5, 7.6); m.rotation.x = Math.PI / 2;
      const arka = add(new THREE.CylinderGeometry(7, 7, 3, 20), siyah, x, CY + 1.5, -2); arka.rotation.x = Math.PI / 2;
    }
    // Kristal (ön yüzde, gözlerin arasında) ve küçük entegreler
    const kris = add(new THREE.CylinderGeometry(1.8, 1.8, 9, 14), metal, 0, CY - 5.5, 3.2); kris.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(8, 2, 1.4), siyah, 0, CY + 5.5, 1.5);
    add(new THREE.BoxGeometry(6, 5, 1), siyah, -3, CY - 1.2, -1.3);
    add(new THREE.BoxGeometry(2, 1.2, .6), siyah, 5, CY - 6, 1.1);

    // Engel + ışın
    const engelMat = new THREE.MeshStandardMaterial({ color: 0xff9a3c, roughness: .6, emissive: 0x402000 });
    const engel = new THREE.Mesh(new THREE.BoxGeometry(18, 14, 2), engelMat);
    engel.userData.engel = true;
    const isinMat = new THREE.MeshBasicMaterial({ color: 0x7ee0ff, transparent: true, opacity: .35, depthWrite: false });
    const isin = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), isinMat);
    // Engelin ayağı: zemine (y=0) basan taban + dikme (sürüklenebilir widget havada asılı kalmasın)
    const ayak = new THREE.Mesh(new THREE.BoxGeometry(18, 1, 7), engelMat), dikme = new THREE.Mesh(new THREE.BoxGeometry(3, CY - 7, 1.6), engelMat);
    ayak.userData.engel = true; dikme.userData.engel = true;
    group.add(engel, ayak, dikme, isin);

    const durum = { cm: 100 };
    let tutuyor = false;
    const yerlestir = () => {
      const z = OFSET + durum.cm * OLCEK;
      engel.position.set(0, CY, z);
      ayak.position.set(0, .5, z); dikme.position.set(0, (CY - 7) / 2, z);
      const u = Math.max(.1, z - 7.8);
      isin.scale.set(1.2, 1.2, u);
      isin.position.set(0, CY, 7.8 + u / 2);
    };
    yerlestir();

    function cmAyarla(sim, ray) {
      const wp = new THREE.Vector3(); group.getWorldPosition(wp);
      const duzlem = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(wp.y + CY));
      const nokta = new THREE.Vector3();
      if (!ray.intersectPlane(duzlem, nokta)) return;
      const cm = Math.round(Math.max(2, Math.min(200, (nokta.z - wp.z - OFSET) / OLCEK)));
      (sim.cihaz.mesafe ??= {})[pin] = cm;
      durum.cm = cm; yerlestir();
    }

    return {
      group, durum,
      guncelle(sim) {
        const m = (sim.cihaz.mesafe ??= {});
        if (m[pin] === undefined) m[pin] = 100;
        durum.cm = m[pin];
        engelMat.emissiveIntensity = durum.cm < 30 ? 2 : 1;
        yerlestir();
      },
      pointerDown(sim, ctx) {
        tutuyor = !!ctx?.isabet?.object?.userData?.engel;
        if (tutuyor && ctx.ray) cmAyarla(sim, ctx.ray);
      },
      pointerMove(sim, ctx) { if (tutuyor && ctx.ray) cmAyarla(sim, ctx.ray); },
      pointerUp() { tutuyor = false; },
    };
  },
};
