// Modül 3: analog okuma, harita (map) ve LED çubuğu blokları.
const PINLER_A = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'].map(p => [p, p]);
const PINLER_D = Array.from({ length: 15 }, (_, i) => ['D' + i, 'D' + i]);

export const tanimlar = [
  { type: 'dy_analog_oku', message0: '%1 analog değerini oku (0-4095)', args0: [
      { type: 'field_dropdown', name: 'PIN', options: PINLER_A }],
    output: 'Number', colour: 45, tooltip: 'analogRead: 12 bitlik ADC, 0 ile 4095 arası sayı verir' },
  { type: 'dy_harita', message0: '%1 sayısını %2 - %3 aralığından %4 - %5 aralığına çevir', args0: [
      { type: 'input_value', name: 'DEG', check: 'Number' },
      { type: 'input_value', name: 'GMIN', check: 'Number' },
      { type: 'input_value', name: 'GMAX', check: 'Number' },
      { type: 'input_value', name: 'CMIN', check: 'Number' },
      { type: 'input_value', name: 'CMAX', check: 'Number' }],
    inputsInline: true, output: 'Number', colour: 45, tooltip: 'map(değer, girdiMin, girdiMax, çıktıMin, çıktıMax)' },
  { type: 'dy_analog_cubuk', message0: 'LED çubuğu: %1 pininden başlayan %2 LED, seviye %3', args0: [
      { type: 'field_dropdown', name: 'PIN', options: PINLER_D },
      { type: 'input_value', name: 'ADET', check: 'Number' },
      { type: 'input_value', name: 'SEVIYE', check: 'Number' }],
    inputsInline: true, previousStatement: null, nextStatement: null, colour: 45,
    tooltip: 'Seviye kadar LED yanar, diğerleri söner' },
];

export function uret(G, Order) {
  const v = (b, g, ad, varsayilan = '0') => g.valueToCode(b, ad, Order.NONE) || varsayilan;
  G.forBlock.dy_analog_oku = b => [`sim.analogOku('${b.getFieldValue('PIN')}')`, Order.FUNCTION_CALL];
  G.forBlock.dy_harita = (b, g) => {
    const kod = `((v, a, b, c, d) => a === b ? c : Math.trunc((v - a) * (d - c) / (b - a) + c))(${v(b, g, 'DEG')}, ${v(b, g, 'GMIN')}, ${v(b, g, 'GMAX', '4095')}, ${v(b, g, 'CMIN')}, ${v(b, g, 'CMAX', '255')})`;
    return [kod, Order.FUNCTION_CALL];
  };
  G.forBlock.dy_analog_cubuk = (b, g) => {
    const bas = b.getFieldValue('PIN').slice(1);
    return `{\nconst __n = ${v(b, g, 'ADET', '8')}, __s = ${v(b, g, 'SEVIYE')};\nfor (let __i = 0; __i < __n; __i++) { if (${bas} + __i <= 14) sim.yaz('D' + (${bas} + __i), __i < __s ? 1 : 0); }\n}\n`;
  };
}

const sayi = n => ({ shadow: { type: 'math_number', fields: { NUM: n } } });

export const kategori = {
  kind: 'category', name: 'Analog', colour: 45, contents: [
    { kind: 'block', type: 'dy_analog_oku' },
    { kind: 'block', type: 'dy_harita', inputs: {
      DEG: { block: { type: 'dy_analog_oku' } }, GMIN: sayi(0), GMAX: sayi(4095), CMIN: sayi(0), CMAX: sayi(255) } },
    { kind: 'block', type: 'dy_analog_cubuk', inputs: { ADET: sayi(8), SEVIYE: sayi(4) } },
    { kind: 'block', type: 'controls_for', fields: { VAR: { name: 'i' } }, inputs: { FROM: sayi(0), TO: sayi(255), BY: sayi(5) } },
    { kind: 'block', type: 'variables_get', fields: { VAR: { name: 'i' } } },
  ],
};
