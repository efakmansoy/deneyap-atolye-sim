// Metin / zaman blokları (dy_degisken_*): metin birleştirme, sayı->metin, geçen süre.
export const tanimlar = [
  { type: 'dy_degisken_birlestir', message0: 'birleştir %1 ve %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }],
    output: 'String', colour: 160, tooltip: 'İki parçayı yan yana birleştirir' },
  { type: 'dy_degisken_sayi_metin', message0: '%1 sayısını metne çevir', args0: [{ type: 'input_value', name: 'SAYI', check: 'Number' }],
    output: 'String', colour: 160, tooltip: 'Sayıyı metin yapar' },
  { type: 'dy_degisken_zaman', message0: 'geçen süre (ms)', output: 'Number', colour: 160, tooltip: 'Program başladığından beri geçen sanal süre (millis)' },
];

export function uret(G, Order) {
  const al = (b, g, ad, v) => g.valueToCode(b, ad, Order.NONE) || v;
  G.forBlock.dy_degisken_birlestir = (b, g) => [`(String(${al(b, g, 'A', "''")}) + String(${al(b, g, 'B', "''")}))`, Order.ATOMIC];
  G.forBlock.dy_degisken_sayi_metin = (b, g) => [`String(${al(b, g, 'SAYI', '0')})`, Order.FUNCTION_CALL];
  G.forBlock.dy_degisken_zaman = () => ['sim.t', Order.MEMBER];
}

const metin = t => ({ shadow: { type: 'text', fields: { TEXT: t } } });
export const kategori = {
  kind: 'category', name: 'Metin', colour: 160, contents: [
    { kind: 'block', type: 'text' },
    { kind: 'block', type: 'dy_degisken_birlestir', inputs: { A: metin('Sayı: '), B: metin('') } },
    { kind: 'block', type: 'dy_degisken_sayi_metin' },
    { kind: 'block', type: 'dy_degisken_zaman' },
  ],
};
