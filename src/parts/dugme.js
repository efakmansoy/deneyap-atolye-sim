// Basmalı düğme (6 mm tact switch). tanim: { pin, renk? }. Basılınca sim.girdi[pin] = 1 (fiziksel "basılı"), bırakılınca 0. pinMode(pin, INPUT_PULLUP) iken sim.oku bunu ters çevirir (boşta 1, basılınca 0).
// Siyah plastik gövde, gümüş metal kapak (yuvarlak delikli), renkli yuvarlak düğme başı, 4 bacak (5.08 x 7.62 mm: orta kanalı kapar).
const RENK = { kirmizi: 0xe23b3b, mavi: 0x3b82e2, yesil: 0x2fbf6a, sari: 0xe2c13b, siyah: 0x222222 };
const P = 2.54;
let ORT = null;
function ortak(THREE) {
  if (ORT) return ORT;
  // gümüş kapak: kare plaka, ortasında yuvarlak delik
  const sh = new THREE.Shape(); const h = 2.9;
  sh.moveTo(-h, -h); sh.lineTo(h, -h); sh.lineTo(h, h); sh.lineTo(-h, h); sh.closePath();
  const delik = new THREE.Path(); delik.absarc(0, 0, 1.9, 0, Math.PI * 2, true); sh.holes.push(delik);
  const plaka = new THREE.ExtrudeGeometry(sh, { depth: .35, bevelEnabled: false, curveSegments: 16 }); plaka.rotateX(-Math.PI / 2);
  // düğme başı: hafif pahlı silindir (lathe)
  const bas = new THREE.CylinderGeometry(2.8, 3.0, 3.2, 24);
  ORT = {
    plaka, bas,
    gov: new THREE.BoxGeometry(6, 3.4, 6),
    govMat: new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: .6 }),
    gumus: new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: .85, roughness: .3 }),
    kol: new THREE.BoxGeometry(.5, 1, .5),
    yat: new THREE.BoxGeometry(1.1, .5, .5),
    kolMat: new THREE.MeshStandardMaterial({ color: 0xc0c0c8, metalness: .8, roughness: .3 }),
  };
  return ORT;
}

export default {
  tur: 'dugme',
  olustur({ THREE, tanim }) {
    const renk = RENK[tanim.renk] ?? RENK.kirmizi;
    const O = ortak(THREE);
    const group = new THREE.Group();
    const cx = P, cz = 1.5 * P;                   // gövde merkezi: bacak dikdörtgeninin ortası (ana delik köşede)
    const Y0 = .5, YG = Y0 + 3.4;                 // gövde tabanı / üstü
    const gov = new THREE.Mesh(O.gov, O.govMat); gov.position.set(cx, Y0 + 1.7, cz);
    const plaka = new THREE.Mesh(O.plaka, O.gumus); plaka.position.set(cx, YG, cz);
    group.add(gov, plaka);
    // dört bacak: gövde yanından çıkıp deliğe iner
    for (const x of [0, 2 * P]) for (const z of [0, 3 * P]) {
      const yon = z === 0 ? -1 : 1;
      const dik = new THREE.Mesh(O.kol, O.kolMat); dik.scale.set(1, Y0 + 1.6 + 4.2, 1); dik.position.set(x, (Y0 + 1.6 - 4.2) / 2 + .0, z);
      const yat = new THREE.Mesh(O.yat, O.kolMat); yat.position.set(x, Y0 + 1.6, z - yon * .55);
      yat.rotation.y = Math.PI / 2;
      group.add(dik, yat);
    }
    // hareketli kısım: sap + renkli kafa
    const matKapak = new THREE.MeshStandardMaterial({ color: renk, roughness: .4, emissive: 0x000000 });
    // test/davranış uyumu: kapak doğrudan group çocuğu ve CylinderGeometry (pahlı kenar için üst yarıçap küçük)
    const kapak = new THREE.Mesh(O.bas, matKapak);
    const YUKARI = YG + 1.2 + 1.6, ASAGI = YUKARI - .8;
    kapak.position.set(cx, YUKARI, cz);
    group.add(kapak);
    let hedef = YUKARI;
    const ayarla = sim => {
      const bas = (sim.girdi[tanim.pin] ?? 0) > 0;
      hedef = bas ? ASAGI : YUKARI;
      matKapak.emissive.setHex(bas ? 0x333333 : 0x000000);
      kapak.position.y = hedef; // anında; kare() yumuşatma gerekmez
    };
    return {
      group,
      guncelle: ayarla,
      pointerDown(sim) { sim.girdi[tanim.pin] = 1; ayarla(sim); },
      pointerUp(sim) { sim.girdi[tanim.pin] = 0; ayarla(sim); },
    };
  },
};
