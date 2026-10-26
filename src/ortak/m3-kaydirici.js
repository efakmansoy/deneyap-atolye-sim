// Modül 3 parçaları için ortak yardımcılar (parts/ klasöründe DEĞİL, otomatik yüklenmez).
export const sinirla = (v, a, b) => Math.max(a, Math.min(b, v));

function kesisim(THREE, ctx, group, yuk) {
  const r = ctx?.ray?.ray;
  if (!r) return null;
  const duzlem = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(group.position.y + yuk));
  return r.intersectPlane(duzlem, new THREE.Vector3());
}

/** Işını group'un üstündeki yatay düzleme (yuk yüksekliği) çarp; x ekseninde 0..1 oran döndür (yoksa null). */
export function xOrani(THREE, ctx, group, uzunluk, yuk = 0) {
  const n = kesisim(THREE, ctx, group, yuk);
  if (!n) return null;
  return sinirla((n.x - group.position.x) / uzunluk + 0.5, 0, 1);
}

/** Işının yatay düzlemle kesişiminin group merkezine göre açısı (x,z). */
export function aci(THREE, ctx, group, yuk = 0) {
  const n = kesisim(THREE, ctx, group, yuk);
  if (!n) return null;
  return Math.atan2(n.z - group.position.z, n.x - group.position.x);
}
