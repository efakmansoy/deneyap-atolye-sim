import { aci, sinirla } from '../ortak/m3-kaydirici.js';

// Potansiyometre: düğmeyi sürükleyerek çevir, 0-4095 (ESP32-S3 ADC 12-bit) -> sim.analog[pin]
const MAX = 4095, SUPURME = Math.PI * 1.5, BASLA = -Math.PI * 0.75 - Math.PI / 2;

// Paylaşımlı geometri / malzeme
let P = null;
function paylasim(THREE) {
  if (P && P.THREE === THREE) return P;
  // Tırtıllı topuz: dişli yıldız profil, y yönünde 5 mm ekstrüzyon
  const sh = new THREE.Shape(), n = 20;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 5.0 : 5.5;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sh.closePath();
  const topuzG = new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false });
  topuzG.rotateX(-Math.PI / 2);
  P = {
    THREE, topuzG,
    govG: new THREE.BoxGeometry(13, 4.6, 13),
    kapakG: new THREE.CylinderGeometry(5.4, 5.4, .5, 28),
    halkaG: new THREE.CylinderGeometry(2.2, 2.2, 1.6, 20),
    milG: new THREE.CylinderGeometry(1.7, 1.7, 3, 20),
    yuvaG: new THREE.BoxGeometry(6.4, .7, 1.1),
    cizgiG: new THREE.BoxGeometry(3.4, .35, 1),
    bacakG: new THREE.BoxGeometry(.6, 6, .3),
    vidaG: new THREE.CylinderGeometry(1.1, 1.1, .3, 12),
    mavi: new THREE.MeshStandardMaterial({ color: 0x1f5fc4, roughness: .55, metalness: .05 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: .3, metalness: .85 }),
    gumus: new THREE.MeshStandardMaterial({ color: 0xc8c8d0, roughness: .3, metalness: .85 }),
    siyah: new THREE.MeshStandardMaterial({ color: 0x17171b, roughness: .5 }),
    beyaz: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .5 }),
  };
  return P;
}

export default {
  tur: 'pot',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'A0';
    let deger = tanim.baslangic ?? 2048, onceki = 0;
    const p = paylasim(THREE);
    const group = new THREE.Group();

    // Mavi gövde + gümüş kapak + pirinç halka/mil
    const gov = new THREE.Mesh(p.govG, p.mavi); gov.position.y = 3.2;
    const kapak = new THREE.Mesh(p.kapakG, p.gumus); kapak.position.y = 5.75;
    const halka = new THREE.Mesh(p.halkaG, p.metal); halka.position.y = 6.3;
    const mil = new THREE.Mesh(p.milG, p.metal); mil.position.y = 7.6;
    group.add(gov, kapak, halka, mil);
    for (const [x, z] of [[-5.6, -5.6], [5.6, -5.6], [-5.6, 5.6], [5.6, 5.6]]) {
      const v = new THREE.Mesh(p.vidaG, p.gumus); v.position.set(x, 5.55, z); group.add(v);
    }

    // Döner topuz: siyah tırtıllı, üstte metal tornavida yuvası ve beyaz işaret çizgisi
    const dugme = new THREE.Group();
    dugme.position.y = 7.8;
    const topuz = new THREE.Mesh(p.topuzG, p.siyah);
    const yuva = new THREE.Mesh(p.yuvaG, p.metal); yuva.position.y = 5.0;
    const cizgi = new THREE.Mesh(p.cizgiG, p.beyaz); cizgi.position.set(3.0, 5.0, 0);
    dugme.add(topuz, yuva, cizgi);
    group.add(dugme);

    // 3 bacak: 2.54 mm ızgarasına oturur (5.08 aralık)
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(p.bacakG, p.gumus);
      b.position.set(-5.08 + i * 5.08, -.2, 5.08);
      group.add(b);
    }

    const goster = () => { dugme.rotation.y = -(BASLA + (deger / MAX) * SUPURME); };
    const yaz = sim => { deger = Math.round(sinirla(deger, 0, MAX)); sim.analog[pin] = deger; goster(); };
    return {
      group,
      guncelle(sim) {
        if (sim.analog[pin] === undefined) sim.analog[pin] = deger; else deger = sim.analog[pin];
        goster();
      },
      kare(dt, sim) { if (sim && sim.analog[pin] !== undefined && sim.analog[pin] !== deger) { deger = sim.analog[pin]; goster(); } },
      pointerDown(sim, ctx) { onceki = aci(THREE, ctx, group, 8) ?? 0; },
      pointerMove(sim, ctx) {
        const a = aci(THREE, ctx, group, 8);
        if (a === null) return;
        let d = a - onceki;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        onceki = a;
        deger += (d / SUPURME) * MAX;
        yaz(sim);
      },
    };
  },
};
