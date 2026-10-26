// Düğme blokları (dy_dugme_*). Düğme basılınca pin YÜKSEK (1) okunur.
import { PINLER } from '../sim.js';
const pinSec = PINLER.map(p => [p, p]);
const pinAlan = { type: 'field_dropdown', name: 'PIN', options: pinSec };

export const tanimlar = [
  { type: 'dy_dugme_basili', message0: '%1 düğmesine basılı mı?', args0: [pinAlan], output: 'Boolean', colour: 20, tooltip: 'Düğmeye basılıysa doğru' },
  { type: 'dy_dugme_deger', message0: '%1 düğme değeri (0 / 1)', args0: [pinAlan], output: 'Number', colour: 20, tooltip: 'Basılıysa 1, değilse 0' },
  { type: 'dy_dugme_bekle', message0: '%1 düğmesi %2 kadar bekle', args0: [pinAlan,
      { type: 'field_dropdown', name: 'DURUM', options: [['basılana', '1'], ['bırakılana', '0']] }],
    previousStatement: null, nextStatement: null, colour: 20, tooltip: 'Düğme durumu değişene kadar bekler' },
  { type: 'dy_dugme_yaz', message0: '%1 pinini %2 değerine eşitle', args0: [pinAlan, { type: 'input_value', name: 'DEG', check: 'Boolean' }],
    previousStatement: null, nextStatement: null, colour: 20, tooltip: 'Mantık değerine göre pini YÜKSEK/DÜŞÜK yapar' },
];

export function uret(G, Order) {
  G.forBlock.dy_dugme_basili = b => [`(sim.oku('${b.getFieldValue('PIN')}') > 0)`, Order.RELATIONAL];
  G.forBlock.dy_dugme_deger = b => [`(sim.oku('${b.getFieldValue('PIN')}') > 0 ? 1 : 0)`, Order.CONDITIONAL];
  G.forBlock.dy_dugme_bekle = b => `while (!((sim.oku('${b.getFieldValue('PIN')}') > 0) === ${b.getFieldValue('DURUM') === '1'})) { await sim.tick(); }\n`;
  G.forBlock.dy_dugme_yaz = (b, g) => `sim.yaz('${b.getFieldValue('PIN')}', ${g.valueToCode(b, 'DEG', Order.NONE) || 'false'} ? 1 : 0);\n`;
}

export const kategori = {
  kind: 'category', name: 'Düğme', colour: 20, contents: [
    { kind: 'block', type: 'dy_dugme_basili' },
    { kind: 'block', type: 'dy_dugme_deger' },
    { kind: 'block', type: 'dy_dugme_bekle' },
    { kind: 'block', type: 'dy_dugme_yaz' },
    { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
  ],
};
