// Piyano: 7 tuşlu mini klavye. Basılı tuş -> sim.girdi[pin] = 1, bırakınca 0.
// Siyah gövde + arka duvar, yuvarlatılmış beyaz tuşlar, her tuşta renk işareti; basılan tuş iner ve renklenir.
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const VARSAYILAN = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
const RENKLER = [0xff5a5a, 0xff9a3c, 0xffd23b, 0x56d86b, 0x4aa3ff, 0x7a6bff, 0xd36bff];
let ORT = null;
function ortak(THREE) {
  if (ORT) return ORT;
  ORT = {
    tus: new RoundedBoxGeometry(5.4, 4, 19, 2, .6),
    isaret: new THREE.CylinderGeometry(.9, .9, .12, 12),
    govde: new THREE.BoxGeometry(7 * 6 + 2, 3, 26),
    arka: new THREE.BoxGeometry(7 * 6 + 2, 9, 4.5),
    yan: new THREE.BoxGeometry(1.2, 6, 21.5),
    plastik: new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: .5 }),
    ahsap: new THREE.MeshStandardMaterial({ color: 0x251a14, roughness: .7 }),
    bacak: new THREE.BoxGeometry(.5, 6.5, .5),
    metal: new THREE.MeshStandardMaterial({ color: 0xcfcfd6, metalness: .9, roughness: .3 }),
  };
  return ORT;
}

const PIN_X = i => (i + 4) * 2.54;   // 7 sinyal bacağı ardışık sütunlarda (konum.x = ilk bacak deliği - 10.16), ön kenarda z = +12
export default {
  tur: 'piyano',
  girisler: tanim => { const n = (tanim.pinler ?? VARSAYILAN).length, s = [...Array(n).keys()]; return { pin: s.map(i => [PIN_X(i), 12]), gnd: null, bacaklar: s.map(i => [PIN_X(i), 12]) }; },
  olustur({ THREE, tanim }) {
    const pinler = tanim.pinler ?? VARSAYILAN;
    const O = ortak(THREE);
    const group = new THREE.Group();
    const taban = new THREE.Mesh(O.govde, O.plastik); taban.position.set(18, 1.5, 0);
    const arka = new THREE.Mesh(O.arka, O.ahsap); arka.position.set(18, 4.5, -10.75);
    const solY = new THREE.Mesh(O.yan, O.ahsap); solY.position.set(-2.6, 6, 1.5);
    const sagY = new THREE.Mesh(O.yan, O.ahsap); sagY.position.set(38.6, 6, 1.5);
    group.add(taban, arka, solY, sagY);
    // alt bacaklar (breadboard'a bağlanan 7 sinyal pini)
    pinler.forEach((_, i) => { const b = new THREE.Mesh(O.bacak, O.metal); b.position.set(PIN_X(i), -2.25, 12); group.add(b); });
    const tuslar = pinler.map((pin, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: .35, emissive: RENKLER[i % 7], emissiveIntensity: 0 });
      const m = new THREE.Mesh(O.tus, mat);
      m.position.set(i * 6, 5, 1.5);
      m.userData.tus = i;
      const isMat = new THREE.MeshStandardMaterial({ color: RENKLER[i % 7], roughness: .5 });
      const is = new THREE.Mesh(O.isaret, isMat); is.position.set(0, 2.02, 6.5); is.userData.tus = i;
      m.add(is);
      group.add(m);
      return { m, mat, pin };
    });
    let basili = -1;
    const bas = (sim, i) => { basili = i; sim.girdi[pinler[i]] = 1; };
    return {
      group,
      guncelle(sim) {
        for (const t of tuslar) {
          const a = sim.girdi[t.pin] ? 1 : 0;
          t.m.position.y = 5 - a * 1.6;
          t.mat.emissiveIntensity = a * .9;
        }
      },
      pointerDown(sim, ctx) {
        const i = ctx?.isabet?.object?.userData?.tus;
        if (i !== undefined) bas(sim, i);
      },
      pointerUp(sim) {
        if (basili >= 0) sim.girdi[pinler[basili]] = 0;
        basili = -1;
      },
    };
  },
};
