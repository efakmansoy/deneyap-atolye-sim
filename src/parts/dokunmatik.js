// Kapasitif dokunmatik pad (ESP32 touchRead). tanim: { pin, renk? }. Parmağı pada bas-bırak: basılıyken sim.dokunma[pin] = 10 (touchRead ~10),
// bırakınca değer silinir (boşta touchRead ~70). Parmak şeffaf bir hayalet olarak pad üstünde durur; basınca iner ve parlar.
export const BOSTA = 70, DOKUNUNCA = 10;

export default {
  tur: 'dokunmatik',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'D4';
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z, ebeveyn = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); ebeveyn.add(m); return m; };
    const pcb = new THREE.MeshStandardMaterial({ color: 0x1f3a7a, roughness: .5 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });
    const bakir = new THREE.MeshStandardMaterial({ color: 0xc8793a, metalness: .75, roughness: .35, emissive: 0x000000 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .6 });
    const P = 2.54;

    // 3 pinli başlık (GND, VCC, SIG) breadboard'a girer; kart 24 x 1.6 x 30 mm, üstte kare bakır pad
    add(new THREE.BoxGeometry(2 * P + 2.5, 2.5, 2.5), siyah, P, 5.4, 0);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(.64, 9, .64), altin, i * P, 3, 0);
    add(new THREE.BoxGeometry(24, 1.6, 30), pcb, P, 7, 17);
    const pad = add(new THREE.BoxGeometry(17, .5, 17), bakir, P, 8.05, 20);
    pad.userData.pad = true;
    add(new THREE.BoxGeometry(5, 1, 3), siyah, P, 8, 6);                              // küçük IC
    // pad çevresinde ince koruma halkası
    const halka = add(new THREE.RingGeometry(9.6, 10.4, 4, 1, Math.PI / 4), new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: .5, side: THREE.DoubleSide }), P, 8.35, 20);
    halka.rotation.x = -Math.PI / 2;

    // Parmak: kapsül, hayalet halinde pad üstünde asılı
    const parmak = new THREE.Group(); group.add(parmak);
    const ten = new THREE.MeshStandardMaterial({ color: 0xf0c9a0, roughness: .6, transparent: true, opacity: .35 });
    add(new THREE.CylinderGeometry(4.2, 4.2, 22, 16), ten, 0, 11, 0, parmak);
    add(new THREE.SphereGeometry(4.2, 16, 12), ten, 0, 0, 0, parmak);
    parmak.position.set(P, 28, 20);
    const YUKARI = 28, ASAGI = 12;

    const ayarla = sim => {
      const v = sim.dokunma?.[pin] ?? BOSTA;
      const dokunuyor = v < 40;
      parmak.position.y = dokunuyor ? ASAGI : YUKARI;
      ten.opacity = dokunuyor ? .85 : .35;
      bakir.emissive.setHex(dokunuyor ? 0x5a3a10 : 0x000000);
    };
    return {
      group,
      guncelle: ayarla,
      pointerDown(sim) { (sim.dokunma ??= {})[pin] = DOKUNUNCA; ayarla(sim); },
      pointerUp(sim) { delete sim.dokunma?.[pin]; ayarla(sim); },
    };
  },
};
