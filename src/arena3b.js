// Arena 3B: zemin (siyah çizgiler dokuda), duvarlar, engel kutuları. Birim: 1 cm = K sahne birimi (mm).
export const K = 1.5;
export const ARENA_MERKEZ = { x: 150, z: 0 };

export function arenaKur(THREE, ar) {
  const g = new THREE.Group();
  g.position.set(ARENA_MERKEZ.x, 0, ARENA_MERKEZ.z);
  const W = ar.genislik, H = ar.yukseklik;
  // zemin dokusu: 8 px / cm
  const PX = 8, c = document.createElement('canvas'); c.width = W * PX; c.height = H * PX;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f6fa'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#dfe5ee'; x.lineWidth = 1;
  for (let i = 0; i <= W; i += 10) { x.beginPath(); x.moveTo(i * PX, 0); x.lineTo(i * PX, c.height); x.stroke(); }
  for (let j = 0; j <= H; j += 10) { x.beginPath(); x.moveTo(0, j * PX); x.lineTo(c.width, j * PX); x.stroke(); }
  x.strokeStyle = '#111'; x.lineCap = 'round'; x.lineJoin = 'round';
  for (const cz of ar.cizgiler) {
    x.lineWidth = cz.genislik * PX; x.beginPath();
    cz.nokta.forEach(([px, py], i) => { const X = (px + W / 2) * PX, Y = (H / 2 - py) * PX; i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const zemin = new THREE.Mesh(new THREE.BoxGeometry(W * K, 2, H * K), [0, 1, 2, 3, 4, 5].map(i =>
    new THREE.MeshStandardMaterial(i === 2 ? { map: tex, roughness: .9 } : { color: 0xb8c2d2, roughness: .9 })));
  zemin.position.y = -1; g.add(zemin);
  // duvarlar
  const duvarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: .7 });
  const T = 3, Y = 7;
  for (const [w, d, px, pz] of [[W * K + 2 * T, T, 0, (H * K + T) / 2], [W * K + 2 * T, T, 0, -(H * K + T) / 2], [T, H * K, (W * K + T) / 2, 0], [T, H * K, -(W * K + T) / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, Y, d), duvarMat); m.position.set(px, Y / 2, pz); g.add(m);
  }
  // engeller
  const engelMat = new THREE.MeshStandardMaterial({ color: 0xff9a3c, roughness: .6, emissive: 0x402000 });
  for (const e of ar.engeller) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(e.w * K, 12, e.h * K), engelMat);
    m.position.set(e.x * K, 6, -e.y * K); g.add(m);
  }
  return g;
}
