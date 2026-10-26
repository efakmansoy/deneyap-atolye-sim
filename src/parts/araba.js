// Robot araba: gövde, 2 dönen tekerlek, ultrasonik mesafe sensörü, 2 çizgi sensörü. Fizik: src/araba-dunya.js
// Sahne: { arena:'duz'|'engelli'|'cizgi', parcalar:[{ tur:'araba', pinler:{...}, baslangic:{...} }] } — bkz. tools/ARABA-SOZLESME.md
import { arabaBagla, VMAX, BURUN, CIZGI_ON, CIZGI_YAN } from '../araba-dunya.js';
import { K, ARENA_MERKEZ } from '../arena3b.js';

const R = 3.2;  // tekerlek yarıçapı (cm)

export default {
  tur: 'araba',
  konumSabit: true,
  olustur({ THREE, tanim, sahne }) {
    const root = new THREE.Group();
    root.position.set(ARENA_MERKEZ.x, 0, ARENA_MERKEZ.z);
    const arac = new THREE.Group(); arac.scale.setScalar(K); root.add(arac);
    const add = (geo, mat, x, y, z, ebeveyn = arac) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); ebeveyn.add(m); return m; };
    const std = (renk, ek = {}) => new THREE.MeshStandardMaterial({ color: renk, roughness: .6, ...ek });
    const govde = std(0x2563eb), siyah = std(0x15151a), metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cf, metalness: .7, roughness: .3 });
    const pcb = std(0x1b64b0);

    // şasi + pil kutusu + kart
    add(new THREE.BoxGeometry(20, 1.2, 12), govde, 0, R - .2, 0);
    add(new THREE.BoxGeometry(8, 2.4, 7), std(0xf59e0b), -4, R + 1.6, 0);
    add(new THREE.BoxGeometry(6, .8, 5), std(0x0f9d58), 4.5, R + .8, 0);
    // arka bilye tekerlek
    add(new THREE.SphereGeometry(1.4, 12, 8), metal, -8.5, 1.4, 0);

    // tekerlekler (eksen z, sol = -z)
    const tekerlekler = [];
    for (const z of [-6.8, 6.8]) {
      const pivot = new THREE.Group(); pivot.position.set(2, R, z); arac.add(pivot);
      const t = add(new THREE.CylinderGeometry(R, R, 2.4, 24), std(0x1f2937, { roughness: .9 }), 0, 0, 0, pivot); t.rotation.x = Math.PI / 2;
      const jant = add(new THREE.CylinderGeometry(R * .6, R * .6, 2.6, 16), std(0xe5e7eb), 0, 0, 0, pivot); jant.rotation.x = Math.PI / 2;
      add(new THREE.BoxGeometry(.8, R * 1.1, 2.7), std(0xef4444), 0, R * .3, 0, pivot);   // dönüşü gösteren işaret
      tekerlekler.push(pivot);
    }

    // ultrasonik sensör (ön, burunda)
    add(new THREE.BoxGeometry(1.6, 2.4, 9), pcb, BURUN - .8, R + 2.2, 0);
    for (const z of [-2.4, 2.4]) {
      const g = add(new THREE.CylinderGeometry(1.5, 1.5, 1.6, 20), metal, BURUN + .4, R + 2.4, z); g.rotation.z = Math.PI / 2;
      const m = add(new THREE.CylinderGeometry(1.1, 1.1, .3, 16), std(0x2a2a2e), BURUN + 1.3, R + 2.4, z); m.rotation.z = Math.PI / 2;
    }

    // çizgi sensörleri (sol = -z sahnede; dünya +yan = sol)
    const isikMat = [], isikGeo = new THREE.SphereGeometry(.55, 10, 8);
    for (const yan of [CIZGI_YAN, -CIZGI_YAN]) {
      const z = -yan;
      add(new THREE.BoxGeometry(2.2, .5, 2), pcb, CIZGI_ON, 1.2, z);
      add(new THREE.BoxGeometry(.4, 1.4, .4), siyah, CIZGI_ON - 1, 1.9, z);
      const mat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xff0000, emissiveIntensity: 0, roughness: .4 });
      add(isikGeo, mat, CIZGI_ON, .7, z); isikMat.push(mat);
    }
    // sensör ışını (mesafe)
    const isin = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x7ee0ff, transparent: true, opacity: .3, depthWrite: false }));
    arac.add(isin);

    let dunya = null;
    const baglan = sim => { dunya = arabaBagla(sim, sahne ?? { arena: 'duz', parcalar: [tanim] }); return dunya; };
    const koy = d => {
      arac.position.set(d.x * K, 0, -d.y * K);
      arac.rotation.y = d.yon;
      const m = dunya.mesafe(d), u = Math.max(.1, m);
      isin.scale.set(u, .8, 1.5); isin.position.set(BURUN + 1.4 + u / 2, R + 2.4, 0);
      const c = dunya.cizgi(d);
      isikMat[0].emissiveIntensity = c[0] ? 2.5 : 0; isikMat[1].emissiveIntensity = c[1] ? 2.5 : 0;
    };

    return {
      group: root, konumSabit: true,
      guncelle(sim) { baglan(sim); koy(dunya.guncelle(sim)); },
      kare(dt, sim) {
        if (!sim || !dunya) return;
        dunya.guncelle(sim);
        const d = sim.kuyruk?.length ? dunya.onizle(sim.sanalSimdi()) : dunya.durum;
        koy(d);
        const k = d.carpti ? .3 : 1;
        tekerlekler[0].rotation.z -= ((d.solGuc ?? 0) * VMAX / R) * dt * k;
        tekerlekler[1].rotation.z -= ((d.sagGuc ?? 0) * VMAX / R) * dt * k;
      },
    };
  },
};
