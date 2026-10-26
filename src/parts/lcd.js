// 16x2 karakter LCD (1602, I2C). sim.cihaz.lcd = ['satır1','satır2'] okunur, canvas texture ile 3B ekranda gösterilir.
const SUTUN = 16, SATIR = 2;
const PW = 56, PD = 25;      // PCB genişlik (x) / derinlik (z)
const PY = 8;                // PCB alt yüzü (mm) - başlık pinleri üzerinde yükseltilmiş

export default {
  tur: 'lcd',
  olustur({ THREE }) {
    const group = new THREE.Group();
    // Canvas (node ortamında document yoksa texture'sız güvenli yedek)
    let tuval = null, bag = null, doku = null;
    try {
      if (typeof document !== 'undefined') {
        tuval = document.createElement('canvas');
        tuval.width = 512; tuval.height = 128;
        bag = tuval.getContext('2d');
        doku = new THREE.CanvasTexture(tuval);
        doku.colorSpace = THREE.SRGBColorSpace;
      }
    } catch { tuval = bag = doku = null; }

    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1b64b0, roughness: .55 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: .55 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc4c4ca, metalness: .75, roughness: .3 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });
    const yesilPcb = new THREE.MeshStandardMaterial({ color: 0x14508f, roughness: .6 });

    // PCB + köşe montaj delikleri
    add(new THREE.BoxGeometry(PW, 1.6, PD), pcbMat, 0, PY + .8, 0);
    const delikGeo = new THREE.CylinderGeometry(1.1, 1.1, .1, 12);
    const delikMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: .8, roughness: .3 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(delikGeo, delikMat, sx * (PW / 2 - 2.2), PY + 1.62, sz * (PD / 2 - 2.2));
    // Metal çerçeve (bezel) + cam arka ışık
    add(new THREE.BoxGeometry(50, 3, 17), metal, 0, PY + 1.6 + 1.5, 1.2);
    add(new THREE.BoxGeometry(48.2, .3, 12.6), siyah, 0, PY + 4.7, 1.2);
    const camMat = new THREE.MeshBasicMaterial({ color: doku ? 0xffffff : 0xa6d04a, map: doku ?? null });
    const ekran = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), camMat);
    ekran.rotation.x = -Math.PI / 2;
    ekran.position.set(0, PY + 4.9, 1.2);
    group.add(ekran);
    // Ekranın çevresindeki siyah çerçeve payı
    for (const [w, d, x, z] of [[48.2, 1.1, 0, 1.2 - 6.05], [48.2, 1.1, 0, 1.2 + 6.05], [2.1, 12.6, -23.05, 1.2], [2.1, 12.6, 23.05, 1.2]]) {
      add(new THREE.BoxGeometry(w, .45, d), siyah, x, PY + 4.8, z);
    }

    // Üstte 16 pin başlığı (arka kenarda) ve arkada I2C backpack
    const bz = -PD / 2 + 1.6;
    add(new THREE.BoxGeometry(16 * 2.54 * .62 + 1, 2.5, 2.5), siyah, 0, PY + 1.6 + 1.25, bz);
    const pinGeo = new THREE.BoxGeometry(.5, 8, .5);
    for (let i = 0; i < 16; i++) add(pinGeo, altin, (i - 7.5) * 2.54 * .62, PY + 1.6 + 1.2, bz);
    // Backpack (PCB'nin altında, başlığa lehimli) + IC + mavi trimpot + 4 pin
    add(new THREE.BoxGeometry(32, 1.4, 9), yesilPcb, 0, PY - 1.6, bz + 3);
    add(new THREE.BoxGeometry(9, 1.4, 4.6), siyah, -6, PY - 2.8, bz + 3);
    add(new THREE.BoxGeometry(5, 3, 5), new THREE.MeshStandardMaterial({ color: 0x2f7fe0, roughness: .5 }), 10, PY - 3, bz + 3);
    add(new THREE.BoxGeometry(10.2, 2.5, 2.5), siyah, -10, PY - 1.6 - 2, bz + 6.5);
    add(new THREE.BoxGeometry(.64, 8, .64), altin, -13.5, PY - 6, bz + 6.5);
    add(new THREE.BoxGeometry(.64, 8, .64), altin, -10.9, PY - 6, bz + 6.5);
    add(new THREE.BoxGeometry(.64, 8, .64), altin, -8.4, PY - 6, bz + 6.5);
    add(new THREE.BoxGeometry(.64, 8, .64), altin, -5.8, PY - 6, bz + 6.5);
    // Ana başlık pinlerinin breadboard'a uzanan kısmı (görsel ayak)
    for (const x of [-PW / 2 + 3, PW / 2 - 3]) add(new THREE.CylinderGeometry(.9, .9, PY, 8), metal, x, PY / 2, PD / 2 - 3);

    let onceki = null;
    function ciz(satirlar) {
      const anahtar = satirlar.join('\n');
      if (anahtar === onceki) return;
      onceki = anahtar;
      if (!bag) return;
      bag.fillStyle = '#a9d24e';
      bag.fillRect(0, 0, 512, 128);
      bag.fillStyle = '#1c3a0a';
      const w = 512 / SUTUN, h = 128 / SATIR;
      bag.font = 'bold 40px monospace';
      bag.textAlign = 'center'; bag.textBaseline = 'middle';
      for (let r = 0; r < SATIR; r++) {
        for (let c = 0; c < SUTUN; c++) {
          const x = c * w, y = r * h;
          bag.globalAlpha = .12;
          bag.fillRect(x + 2, y + 6, w - 4, h - 12); // boş hücre izi
          bag.globalAlpha = 1;
          const ch = satirlar[r][c];
          if (ch && ch !== ' ') bag.fillText(ch, x + w / 2, y + h / 2 + 2);
        }
      }
      doku.needsUpdate = true;
    }

    const duzelt = (s) => String(s ?? '').slice(0, SUTUN).padEnd(SUTUN, ' ');
    return {
      group,
      guncelle(sim) {
        const l = sim?.cihaz?.lcd;
        ciz([duzelt(l?.[0]), duzelt(l?.[1])]);
      },
    };
  },
};
