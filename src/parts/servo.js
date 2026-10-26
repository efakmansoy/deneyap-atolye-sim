// Servo (SG90 mikro servo): sim.cihaz.servo[pin] = açı (0-180). Kol hedefe yumuşakça döner.
export default {
  tur: 'servo',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin;
    const group = new THREE.Group();

    const mavi = new THREE.MeshStandardMaterial({ color: 0x2d6cc4, roughness: .45 });
    const maviKoyu = new THREE.MeshStandardMaterial({ color: 0x1f56a6, roughness: .5 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .6 });
    const beyaz = new THREE.MeshStandardMaterial({ color: 0xf1f1ec, roughness: .4 });
    const delikMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: .9 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xb8b8bd, metalness: .7, roughness: .35 });

    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };

    // Gövde 22.5 x 22 x 12, montaj kulakları (toplam 32.5 mm) ve delikleri
    add(new THREE.BoxGeometry(22.5, 15.5, 12), mavi, 0, 7.75, 0);
    add(new THREE.BoxGeometry(22.5, 6.5, 12), maviKoyu, 0, 18.75, 0);           // üst kapak
    add(new THREE.BoxGeometry(32.5, 2, 12), mavi, 0, 16, 0);                    // montaj kulakları
    for (const sx of [-1, 1]) {
      add(new THREE.CylinderGeometry(1.1, 1.1, .2, 12), delikMat, sx * 14.5, 17.05, 0);
      add(new THREE.CylinderGeometry(1.1, 1.1, .2, 12), delikMat, sx * 14.5, 14.95, 0);
      add(new THREE.BoxGeometry(1, 3.2, 4), mavi, sx * 12.2, 14, 0);              // kulak takviyesi
    }
    // Dişli kutusu çıkıntıları ve çıkış mili
    add(new THREE.CylinderGeometry(6, 6, 2.2, 20), maviKoyu, 5, 23, 0);
    add(new THREE.CylinderGeometry(2.8, 2.8, 2.2, 16), maviKoyu, -.7, 22.9, 0);
    add(new THREE.CylinderGeometry(2.4, 2.4, 3.6, 16), beyaz, 5, 25.6, 0);
    add(new THREE.CylinderGeometry(1.6, 1.6, .3, 12), metal, 5, 27.5, 0);       // vida

    // Servo kolu (horn): göbek + ince kol + delikler
    const kol = new THREE.Group();
    kol.position.set(5, 25.2, 0);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 2, 18), beyaz);
    hub.position.y = 0;
    const kolGovde = new THREE.Mesh(new THREE.BoxGeometry(17, 1.4, 3.6), beyaz);
    kolGovde.position.set(6.5, -.3, 0);
    const kolUc = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.4, 14), beyaz);
    kolUc.position.set(15, -.3, 0);
    kol.add(hub, kolGovde, kolUc);
    for (const x of [6, 9, 12]) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 1.6, 8), delikMat);
      d.position.set(x, -.3, 0);
      kol.add(d);
    }
    const vida = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, .4, 12), metal);
    vida.position.y = 1.1;
    kol.add(vida);
    group.add(kol);

    // 3 telli kablo (kahverengi, kırmızı, turuncu) + 3'lü konnektör
    const tel = [[0x6b3a1e, 2.54], [0xd22b2b, 0], [0xf08a1c, -2.54]];
    for (const [renk, z] of tel) {
      const egri = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-11, 5, z * .45),
        new THREE.Vector3(-18, 4.2, z * .8),
        new THREE.Vector3(-27, 2, z),
        new THREE.Vector3(-35, 3.6, z),
      ]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(egri, 14, .6, 5, false), new THREE.MeshStandardMaterial({ color: renk, roughness: .6 }));
      group.add(t);
    }
    add(new THREE.BoxGeometry(2.8, 6, 3 * 2.54 + .6), siyah, -9.8, 5, 0);       // gövdeden çıkış lastiği
    const konn = add(new THREE.BoxGeometry(8.5, 2.6, 3 * 2.54 + .4), siyah, -38.8, 3.6, 0);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(2.5, 1, .8), metal, -43.3, 3.6, (i - 1) * 2.54);
    konn.userData.konnektor = true;

    const durum = { aci: 90, hedef: 90 };
    const uygula = () => { kol.rotation.y = -durum.aci * Math.PI / 180; };
    uygula();
    return {
      group, durum,
      guncelle(sim) { durum.hedef = Math.max(0, Math.min(180, sim.cihaz.servo?.[pin] ?? 90)); },
      kare(dt, sim) {
        if (sim) durum.hedef = Math.max(0, Math.min(180, sim.cihaz?.servo?.[pin] ?? 90));
        durum.aci += (durum.hedef - durum.aci) * (1 - Math.exp(-dt * 14));
        if (Math.abs(durum.hedef - durum.aci) < .05) durum.aci = durum.hedef;
        uygula();
      },
    };
  },
};
