// 12 tuşlu analog tuş takımı (direnç merdiveni, tek analog pin). Tuşa bas: sim.analog[pin] = 340*(i+1) (340...4080); bırakınca 0.
// Tuş sırası: 1 2 3 / 4 5 6 / 7 8 9 / * 0 #
export const TUSLAR = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
export const TUS_DEGERLERI = TUSLAR.map((_, i) => 340 * (i + 1));

const ADIM = 11, TUS = 9;   // tuş aralığı ve tuş boyu (mm)

function tusDoku(THREE, harf) {
  try {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); if (!g) return null;
    g.fillStyle = '#e9e9e4'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#222'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(harf, 32, harf === '*' ? 40 : 34);
    const t = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  } catch { return null; }
}

export default {
  tur: 'tustakimi',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'A0';
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };

    const pcb = new THREE.MeshStandardMaterial({ color: 0x1f4fa8, roughness: .5 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .6 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });

    // Membran tuş takımı: 4 satır x 3 sütun tuş + alta 3 pinli başlık (bu sürümde tek A0 çıkışı)
    const en = 3 * ADIM + 6, boy = 4 * ADIM + 6;
    add(new THREE.BoxGeometry(en, 1.6, boy), pcb, 0, 6, 0);
    add(new THREE.BoxGeometry(en - 2, .8, boy - 2), siyah, 0, 7, 0);
    add(new THREE.BoxGeometry(7.62 + 2.5, 2.5, 2.5), siyah, 0, 5, -boy / 2 - 1.5);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(.64, 7, .64), altin, (i - 1) * 2.54, 3, -boy / 2 - 1.5);

    const tuslar = TUSLAR.map((harf, i) => {
      const x = (i % 3 - 1) * ADIM, z = (Math.floor(i / 3) - 1.5) * ADIM;
      const doku = tusDoku(THREE, harf);
      const ust = new THREE.MeshStandardMaterial(doku ? { map: doku, roughness: .45 } : { color: 0xe9e9e4, roughness: .45 });
      const yan = new THREE.MeshStandardMaterial({ color: 0xcfcfc8, roughness: .5 });
      const t = new THREE.Mesh(new THREE.BoxGeometry(TUS, 3.2, TUS), [yan, yan, ust, yan, yan, yan]);   // +y yüzü etiketli
      t.position.set(x, 9, z);
      t.userData.tus = i;
      group.add(t);
      return { t, y0: 9, bas: 0 };
    });

    const durum = { basili: -1 };
    const goster = () => tuslar.forEach((k, i) => { k.t.position.y = durum.basili === i ? k.y0 - 1.6 : k.y0; });
    const sec = (sim, ctx) => {
      const i = ctx?.isabet?.object?.userData?.tus;
      if (i === undefined) return;
      durum.basili = i; sim.analog[pin] = TUS_DEGERLERI[i]; goster();
    };
    return {
      group, durum,
      guncelle(sim) {
        const v = sim.analog[pin] ?? 0;
        if (sim.analog[pin] === undefined) sim.analog[pin] = 0;
        const i = v > 0 ? TUS_DEGERLERI.findIndex(d => Math.abs(d - v) < 170) : -1;
        if (i !== durum.basili) { durum.basili = i; goster(); }
      },
      pointerDown: sec,
      // basılıyken parmak başka tuşa kayarsa o tuşa geç; tuşların dışına çıkınca bırak
      pointerMove(sim, ctx) {
        const h = ctx?.ray?.intersectObjects(group.children, true).find(x => x.object.userData.tus !== undefined);
        if (h) { if (h.object.userData.tus !== durum.basili) sec(sim, { isabet: h }); }
        else if (durum.basili >= 0) { durum.basili = -1; sim.analog[pin] = 0; goster(); }
      },
      pointerUp(sim) { durum.basili = -1; sim.analog[pin] = 0; goster(); },
    };
  },
};
