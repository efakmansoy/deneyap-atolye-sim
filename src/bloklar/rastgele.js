// Rastgele sayı bloğu (dy_rastgele). Kategori: Rastgele.
// JS (simülatör): Math.floor(Math.random() * (b - a + 1)) + a   -> a ve b dahil tamsayı
// C++ (src/cpp.js): random(a, b + 1)   (Arduino random üst sınırı DAHİL ETMEZ, bu yüzden +1)
export const tanimlar = [
  { type: 'dy_rastgele', message0: 'rastgele sayı %1 ile %2 arası (ikisi dahil)', args0: [
      { type: 'input_value', name: 'A', check: 'Number' },
      { type: 'input_value', name: 'B', check: 'Number' }],
    inputsInline: true, output: 'Number', colour: 260,
    tooltip: 'A ile B arasında (ikisi de dahil) rastgele bir tam sayı verir. Örnek: 1 ile 6 arası bir zar atar.' },
];

export function uret(G, Order) {
  G.forBlock.dy_rastgele = (b, g) => {
    const v = (ad, varsayilan) => g.valueToCode(b, ad, Order.NONE) || varsayilan;
    // a ve b yalnızca bir kez hesaplansın diye küçük bir işlev içinde kullanılır
    return [`((a, b) => Math.floor(Math.random() * (b - a + 1)) + a)(${v('A', '1')}, ${v('B', '6')})`, Order.FUNCTION_CALL];
  };
}

const sayi = n => ({ shadow: { type: 'math_number', fields: { NUM: n } } });

export const kategori = {
  kind: 'category', name: 'Rastgele', colour: 260, contents: [
    { kind: 'block', type: 'dy_rastgele', inputs: { A: sayi(1), B: sayi(6) } },
    { kind: 'block', type: 'controls_for', fields: { VAR: { name: 'i' } }, inputs: {
      FROM: sayi(1), TO: sayi(10), BY: sayi(1) } },
    { kind: 'block', type: 'variables_get', fields: { VAR: { name: 'i' } } },
  ],
};
