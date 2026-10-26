// Ses ve hareket blokları: buzzer, servo, mesafe sensörü.
import { PINLER } from '../sim.js';

const pinSec = PINLER.map(p => [p, p]);

export const tanimlar = [
  { type: 'dy_ses_cal', message0: '%1 pinine %2 Hz ses çal', args0: [
      { type: 'field_dropdown', name: 'PIN', options: pinSec },
      { type: 'input_value', name: 'FREKANS', check: 'Number' }],
    previousStatement: null, nextStatement: null, colour: 330, tooltip: 'tone(pin, frekans)' },
  { type: 'dy_ses_sustur', message0: '%1 pinindeki sesi sustur', args0: [
      { type: 'field_dropdown', name: 'PIN', options: pinSec }],
    previousStatement: null, nextStatement: null, colour: 330, tooltip: 'noTone(pin)' },
  { type: 'dy_servo_yaz', message0: '%1 servosunu %2 ° yap (0-180)', args0: [
      { type: 'field_dropdown', name: 'PIN', options: pinSec },
      { type: 'input_value', name: 'ACI', check: 'Number' }],
    previousStatement: null, nextStatement: null, colour: 330, tooltip: 'servo.write(açı)' },
  { type: 'dy_mesafe_oku', message0: '%1 mesafe sensörü (cm)', args0: [
      { type: 'field_dropdown', name: 'PIN', options: pinSec }],
    output: 'Number', colour: 330, tooltip: 'Ultrasonik sensörün ölçtüğü mesafe (cm)' },
];

export function uret(G, Order) {
  const deger = (b, g, ad) => g.valueToCode(b, ad, Order.NONE) || '0';
  // Değer değiştiyse sim.olaylar'a {t, pin, deger, tur} satırı ekler; ders kontrolleri bunu kullanır.
  const yaz = (grup, tur, pin, ifade, ilk) =>
    `{ const __v = ${ifade}; const __d = (sim.cihaz.${grup} ??= {}); if ((__d['${pin}'] ?? ${ilk}) !== __v) { __d['${pin}'] = __v; ` +
    `sim.olaylar.push({ t: sim.t, pin: '${pin}', deger: __v, tur: '${tur}' }); } sim.yay(); }\n`;

  G.forBlock.dy_ses_cal = (b, g) =>
    yaz('ses', 'ses', b.getFieldValue('PIN'), `Math.max(0, Number(${deger(b, g, 'FREKANS')}) || 0)`, '0');
  G.forBlock.dy_ses_sustur = b => yaz('ses', 'ses', b.getFieldValue('PIN'), '0', '0');
  G.forBlock.dy_servo_yaz = (b, g) =>
    yaz('servo', 'servo', b.getFieldValue('PIN'), `Math.max(0, Math.min(180, Number(${deger(b, g, 'ACI')}) || 0))`, 'null');
  G.forBlock.dy_mesafe_oku = b => [`((sim.cihaz.mesafe ?? {})['${b.getFieldValue('PIN')}'] ?? 200)`, Order.ATOMIC];
}

const sayi = n => ({ shadow: { type: 'math_number', fields: { NUM: n } } });

export const kategori = {
  kind: 'category', name: 'Ses ve hareket', colour: 330, contents: [
    { kind: 'block', type: 'dy_ses_cal', inputs: { FREKANS: sayi(440) } },
    { kind: 'block', type: 'dy_ses_sustur' },
    { kind: 'block', type: 'dy_servo_yaz', inputs: { ACI: sayi(90) } },
    { kind: 'block', type: 'dy_mesafe_oku' },
  ],
};
