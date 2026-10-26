// Gerçekçi yarım boy breadboard: 30 sütun, a-e / f-j terminal şeritleri, orta kanal, 4 güç rayı.
// Birim mm, üst yüzey y=0. Merkez (cx, cz).
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const P = 2.54;                        // 0.1" delik aralığı
const SUTUN = 30;
const SATIR_Z = {                      // merkeze göre z
  a: -13.97, b: -11.43, c: -8.89, d: -6.35, e: -3.81,
  f: 3.81, g: 6.35, h: 8.89, i: 11.43, j: 13.97,
};
const RAY_Z = [-20.3, -17.8, 17.8, 20.3];   // üst: -(kırmızı +? mavi), alt
const RAY_RENK = ['#3b82f6', '#ef4444', '#ef4444', '#3b82f6']; // üst: mavi(-), kırmızı(+); alt: kırmızı(+), mavi(-)

export const BB_L = 86, BB_W = 54;

const sutunX = i => (i - (SUTUN - 1) / 2) * P;
const rayX = i => (i - 12) * P + Math.floor(i / 5) * 1.3 - 2.6;

export function breadboardOlustur(THREE, cx, cz) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);

  const govde = new THREE.Mesh(new RoundedBoxGeometry(BB_L, 8.5, BB_W, 3, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xf6f1e3, roughness: .5, metalness: 0 }));
  govde.position.y = -4.25;
  g.add(govde);

  // Üst yüzey baskısı: sütun numaraları, satır harfleri, ray çizgileri, orta kanal
  const pxMm = 14, c = document.createElement('canvas');
  c.width = BB_L * pxMm; c.height = BB_W * pxMm;
  const x = c.getContext('2d');
  const px = (mx, mz) => [(mx + BB_L / 2) * pxMm, (mz + BB_W / 2) * pxMm];
  // orta kanal
  x.fillStyle = '#d9d5c7';
  const [k0, kz0] = px(-BB_L / 2 + 2, -1.9), [k1, kz1] = px(BB_L / 2 - 2, 1.9);
  x.fillRect(k0, kz0, k1 - k0, kz1 - kz0);
  x.fillStyle = '#bdb8a6';
  x.fillRect(k0, kz0, k1 - k0, 3);
  x.fillRect(k0, kz1 - 3, k1 - k0, 3);
  // ray çizgileri
  RAY_Z.forEach((z, i) => {
    x.strokeStyle = RAY_RENK[i]; x.lineWidth = 5;
    const eksi = i === 0 || i === 3, [a, y] = px(rayX(0) - 1.8, z + (eksi === z < 0 ? -2.0 : 2.0)), [b] = px(rayX(24) + 1.8, 0);
    x.beginPath(); x.moveTo(a, y); x.lineTo(b, y); x.stroke();
    x.fillStyle = RAY_RENK[i]; x.font = 'bold 26px sans-serif'; x.textAlign = 'center';
    x.fillText(i === 0 || i === 3 ? '–' : '+', a - 18, y + 9);
  });
  // sütun numaraları (1, 5, 10, ...)
  x.fillStyle = '#8c8878'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center';
  for (let i = 0; i < SUTUN; i++) {
    const n = i + 1;
    if (n !== 1 && n % 5) continue;
    const [px_, pz] = px(sutunX(i), 0);
    x.fillText(String(n), px_, px(0, -SATIR_Z.e + 1.4)[1] - 1.5 * pxMm + 52);
    x.fillText(String(n), px_, px(0, SATIR_Z.f - 1.4)[1] + 1.5 * pxMm - 30);
  }
  // satır harfleri
  x.textAlign = 'center';
  for (const [h, z] of Object.entries(SATIR_Z)) {
    const [, pz] = px(0, z);
    x.fillText(h, px(-BB_L / 2 + 3.2, 0)[0], pz + 8);
    x.fillText(h, px(BB_L / 2 - 3.2, 0)[0], pz + 8);
  }
  const doku = new THREE.CanvasTexture(c);
  doku.colorSpace = THREE.SRGBColorSpace; doku.anisotropy = 8;
  const baski = new THREE.Mesh(new THREE.PlaneGeometry(BB_L, BB_W),
    new THREE.MeshBasicMaterial({ map: doku, transparent: true, depthWrite: false }));
  baski.rotation.x = -Math.PI / 2; baski.position.y = .02;
  g.add(baski);

  // Delikler (instanced): kare, koyu, hafif çukur görünümü
  const noktalar = [];
  for (let i = 0; i < SUTUN; i++) for (const z of Object.values(SATIR_Z)) noktalar.push([sutunX(i), z]);
  RAY_Z.forEach(z => { for (let i = 0; i < 25; i++) noktalar.push([rayX(i), z]); });
  const delikGeo = new THREE.BoxGeometry(1.55, .3, 1.55);
  const delikler = new THREE.InstancedMesh(delikGeo, new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: .9 }), noktalar.length);
  const m = new THREE.Matrix4();
  noktalar.forEach(([hx, hz], i) => { m.makeTranslation(hx, .05, hz); delikler.setMatrixAt(i, m); });
  g.add(delikler);
  // Deliğin metal teli (parlak ince iç kare) – derinlik hissi
  const tel = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, .2, .9), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: .8, roughness: .35 }), noktalar.length);
  noktalar.forEach(([hx, hz], i) => { m.makeTranslation(hx, .12, hz); tel.setMatrixAt(i, m); });
  g.add(tel);

  // Ayaklar
  const ayakMat = new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: .9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1, 16), ayakMat);
    a.position.set(sx * (BB_L / 2 - 5), -9, sz * (BB_W / 2 - 5)); g.add(a);
  }
  /** Delik dünya konumu: delik('f', 12) -> Vector3 (sütun 1 tabanlı) */
  const delik = (satir, sutun) => new THREE.Vector3(cx + sutunX(sutun - 1), 0, cz + SATIR_Z[satir]);
  /** Güç rayı deliği: ray('ust'|'alt', '+'|'-', 0..24) */
  const ray = (taraf, kutup, i) => {
    const z = taraf === 'ust' ? (kutup === '-' ? RAY_Z[0] : RAY_Z[1]) : (kutup === '+' ? RAY_Z[2] : RAY_Z[3]);
    return new THREE.Vector3(cx + rayX(i), 0, cz + z);
  };
  /** Dünya konumuna en yakın terminal deliği (a-j) */
  const enYakin = v => {
    const s = Math.max(0, Math.min(SUTUN - 1, Math.round((v.x - cx) / P + (SUTUN - 1) / 2)));
    let en = 'a', fark = Infinity;
    for (const [h, z] of Object.entries(SATIR_Z)) { const d = Math.abs(v.z - cz - z); if (d < fark) { fark = d; en = h; } }
    return delik(en, s + 1);
  };
  return { group: g, delik, ray, enYakin };
}
