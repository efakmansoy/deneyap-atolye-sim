// Breadboard delik ızgarası (merkez 78,10; 30 sütun; a-e / f-j). Saf sayı işlemi: THREE gerektirmez, testler de kullanır.
export const CX = 78, CZ = 10, P = 2.54;
export const SATIR = { a: -13.97, b: -11.43, c: -8.89, d: -6.35, e: -3.81, f: 3.81, g: 6.35, h: 8.89, i: 11.43, j: 13.97 };

/** Dünya konumunu (x,z) en yakın deliğe oturtur; satir verilirse z o satıra sabitlenir (ör. orta kanalı kapayan parçalar için 'e'). */
export function izgaraKonum([x, , z], satir) {
  const c = Math.max(0, Math.min(29, Math.round((x - CX) / P + 14.5)));
  let en = satir ?? 'a', fark = Infinity;
  if (!satir) for (const [h, sz] of Object.entries(SATIR)) { const d = Math.abs(z - CZ - sz); if (d < fark) { fark = d; en = h; } }
  return [CX + (c - 14.5) * P, 0, CZ + SATIR[en]];
}

/** LED'in direnci anot sütunundan 2 satır ötededir; +z tarafı kanala/tahta dışına düşecekse -1 (ters yön). */
export function direncYonu(z) {
  const r = z - CZ;
  return [SATIR.d, SATIR.e, SATIR.i, SATIR.j].some(s => Math.abs(s - r) < .3) ? -1 : 1;
}
