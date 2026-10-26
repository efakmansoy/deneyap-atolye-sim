import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { DIL } from './i18n.js';
import { javascriptGenerator as G, Order } from 'blockly/javascript';
import { PINLER } from './sim.js';

Blockly.setLocale(DIL === 'en' ? await import('blockly/msg/en') : await import('blockly/msg/tr'));
const pinSec = PINLER.map(p => [p, p]);

Blockly.common.defineBlocksWithJsonArray([
  { type: 'dy_yaz', message0: '%1 pinini %2 yap', args0: [
      { type: 'field_dropdown', name: 'PIN', options: pinSec },
      { type: 'field_dropdown', name: 'DEG', options: [['YÜKSEK (1)', '1'], ['DÜŞÜK (0)', '0']] }],
    previousStatement: null, nextStatement: null, colour: 20, tooltip: 'digitalWrite' },
  { type: 'dy_pwm', message0: '%1 pinine PWM %2 (0-255)', args0: [
      { type: 'field_dropdown', name: 'PIN', options: pinSec },
      { type: 'input_value', name: 'DEG', check: 'Number' }],
    previousStatement: null, nextStatement: null, colour: 20, tooltip: 'analogWrite' },
  { type: 'dy_oku', message0: '%1 pini yüksek mi?', args0: [
      { type: 'field_dropdown', name: 'PIN', options: pinSec }],
    output: 'Boolean', colour: 20, tooltip: 'digitalRead' },
  { type: 'dy_bekle', message0: '%1 ms bekle', args0: [{ type: 'input_value', name: 'MS', check: 'Number' }],
    previousStatement: null, nextStatement: null, colour: 120, tooltip: 'delay' },
  { type: 'dy_surekli', message0: 'sürekli tekrarla %1 %2', args0: [
      { type: 'input_dummy' }, { type: 'input_statement', name: 'GOVDE' }],
    previousStatement: null, colour: 120 },
  { type: 'dy_seri', message0: 'seri monitöre yaz %1', args0: [{ type: 'input_value', name: 'METIN' }],
    previousStatement: null, nextStatement: null, colour: 290 },
]);

const deger = (b, g, ad, varsayilan = '0') => g.valueToCode(b, ad, Order.NONE) || varsayilan;
G.forBlock.dy_yaz = b => `sim.yaz('${b.getFieldValue('PIN')}', ${b.getFieldValue('DEG')});\n`;
G.forBlock.dy_pwm = (b, g) => `sim.pwmYaz('${b.getFieldValue('PIN')}', ${deger(b, g, 'DEG')});\n`;
G.forBlock.dy_oku = b => [`(sim.oku('${b.getFieldValue('PIN')}') > 0)`, Order.RELATIONAL];
G.forBlock.dy_bekle = (b, g) => `await sim.bekle(${deger(b, g, 'MS')});\n`;
G.forBlock.dy_surekli = (b, g) => `while (true) {\nawait sim.tick();\n${g.statementToCode(b, 'GOVDE')}}\n`;
G.forBlock.dy_seri = (b, g) => `sim.seri(${deger(b, g, 'METIN', "''")});\n`;
G.INFINITE_LOOP_TRAP = 'await sim.tick();\n';

const sayi = n => ({ shadow: { type: 'math_number', fields: { NUM: n } } });

export const TOOLBOX = {
  kind: 'categoryToolbox', contents: [
    { kind: 'category', name: 'Pinler', colour: 20, contents: [
      { kind: 'block', type: 'dy_yaz' },
      { kind: 'block', type: 'dy_pwm', inputs: { DEG: sayi(128) } },
      { kind: 'block', type: 'dy_oku' }] },
    { kind: 'category', name: 'Akış', colour: 120, contents: [
      { kind: 'block', type: 'dy_surekli' },
      { kind: 'block', type: 'dy_bekle', inputs: { MS: sayi(500) } },
      { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: sayi(5) } },
      { kind: 'block', type: 'controls_if' }] },
    { kind: 'category', name: 'Mantık', colour: 210, contents: [
      { kind: 'block', type: 'logic_compare' }, { kind: 'block', type: 'logic_operation' }, { kind: 'block', type: 'logic_boolean' }] },
    { kind: 'category', name: 'Sayı', colour: 230, contents: [
      { kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }] },
    { kind: 'category', name: 'Seri', colour: 290, contents: [
      { kind: 'block', type: 'dy_seri' }, { kind: 'block', type: 'text' }] },
  ],
};

// src/bloklar/*.js otomatik yüklenir: { tanimlar: [json blok], uret(G, Order), kategori: toolbox kategorisi }
const ekler = import.meta.glob('./bloklar/*.js', { eager: true });
for (const m of Object.values(ekler)) {
  Blockly.common.defineBlocksWithJsonArray(m.tanimlar ?? []);
  m.uret?.(G, Order);
  if (m.kategori) TOOLBOX.contents.splice(-1, 0, m.kategori);
}

export { Blockly, G as generator };
