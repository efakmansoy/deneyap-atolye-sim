// LCD blokları: dy_lcd_yaz, dy_lcd_temizle. Kategori: Ekran.
export const tanimlar = [
  { type: 'dy_lcd_yaz', message0: 'LCD satır %1 yaz %2', args0: [
      { type: 'field_dropdown', name: 'SATIR', options: [['1', '0'], ['2', '1']] },
      { type: 'input_value', name: 'METIN' }],
    previousStatement: null, nextStatement: null, colour: 175, tooltip: 'LCD satırına metin/sayı yazar (en çok 16 karakter)' },
  { type: 'dy_lcd_temizle', message0: 'LCD ekranı temizle',
    previousStatement: null, nextStatement: null, colour: 175, tooltip: 'LCD ekranı siler' },
];

export function uret(G, Order) {
  G.forBlock.dy_lcd_yaz = (b, g) => {
    const metin = g.valueToCode(b, 'METIN', Order.NONE) || "''";
    return `{ const _l = (sim.cihaz.lcd ??= ['', '']); _l[${Number(b.getFieldValue('SATIR'))}] = String(${metin}).slice(0, 16).padEnd(16, ' '); sim.yay(); }\n`;
  };
  G.forBlock.dy_lcd_temizle = () => `sim.cihaz.lcd = ['', '']; sim.yay();\n`;
}

export const kategori = {
  kind: 'category', name: 'Ekran', colour: 175, contents: [
    { kind: 'block', type: 'dy_lcd_yaz', inputs: { METIN: { shadow: { type: 'text', fields: { TEXT: 'Merhaba' } } } } },
    { kind: 'block', type: 'dy_lcd_temizle' },
    { kind: 'block', type: 'controls_for', fields: { VAR: { name: 'i' } }, inputs: {
      FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
      TO: { shadow: { type: 'math_number', fields: { NUM: 5 } } },
      BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
    { kind: 'block', type: 'variables_get', fields: { VAR: { name: 'i' } } },
  ],
};
