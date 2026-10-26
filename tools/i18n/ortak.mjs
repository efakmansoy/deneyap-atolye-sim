// Dil katmanı ortak kodu: kaynak dosyalardaki çevrilebilir metinleri (dize ve şablon) bulur.
// Hem çıkarma aracı (tools/i18n/cikar.mjs) hem Vite eklentisi (tools/i18n/eklenti.mjs) aynı kuralı kullanır.
import { parseAst } from 'rolldown/parseAst';

export const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
// Sözel (konuşulan) metin sesle okunur, çevrilmez: { ses: '...' }
const ATLA_ANAHTAR = new Set(['ses']);

// Şablon anahtarı: ifadeler {0}, {1}... olur
export const sablonAnahtar = quasis => quasis.map((q, i) => (i ? `{${i - 1}}` : '') + q).join('');

export function tara(kod, ad = 'x.js') {
  const ast = parseAst(kod, { lang: 'js', sourceType: 'module' });
  const bulunan = [];
  const gez = (n, ebeveyn, alan, oz = null) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string') {
      const e = ebeveyn;
      const anahtarMi = e && (e.type === 'Property' || e.type === 'MethodDefinition' || e.type === 'PropertyDefinition') && alan === 'key' && !e.computed;
      const kaynakMi = e && /^(Import|Export)/.test(e.type) && alan === 'source';
      const yonerge = e && e.type === 'ExpressionStatement' && e.directive;
      const sesMi = e && e.type === 'Property' && alan === 'value' && !e.computed && ATLA_ANAHTAR.has(e.key.name ?? e.key.value);
      const etiket = e && e.type === 'TaggedTemplateExpression';
      // Karşılaştırma / arama argümanı olan dizeler mantık için kullanılır, görüntü için değil: çevrilmez
      const mantik = e && ((e.type === 'BinaryExpression' && /^[!=]==?$/.test(e.operator)) || e.type === 'SwitchCase' || (e.type === 'CallExpression' && alan === 'arguments' && e.callee.type === 'MemberExpression' && /^(includes|startsWith|endsWith|indexOf|match|test|split|replaceAll|replace|localeCompare|has|get|set|add|delete|getItem|setItem|removeItem|querySelector|querySelectorAll|closest|matches|addEventListener|getAttribute|setAttribute|toggle|contains|remove|getElementById)$/.test(e.callee.property.name ?? '')));
      if (!anahtarMi && !kaynakMi && !yonerge && !sesMi && !etiket && !mantik) bulunan.push({ oz, tur: 'dize', bas: n.start, son: n.end, anahtar: n.value });
      return;
    }
    if (n.type === 'TemplateLiteral') {
      const sesMi = ebeveyn && ebeveyn.type === 'Property' && alan === 'value' && !ebeveyn.computed && ATLA_ANAHTAR.has(ebeveyn.key.name ?? ebeveyn.key.value);
      if (!sesMi && !(ebeveyn && ebeveyn.type === 'TaggedTemplateExpression')) {
        const q = n.quasis.map(x => x.value.cooked);
        if (q.every(x => x != null)) bulunan.push({ oz, tur: 'sablon', bas: n.start, son: n.end, anahtar: sablonAnahtar(q), sayi: n.expressions.length });
      }
    }
    const oz2 = n.type === 'Property' && !n.computed ? (n.key.name ?? n.key.value) : oz;
    for (const k of Object.keys(n)) {
      if (k === 'type' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(x => gez(x, n, k, oz2)); else if (v && typeof v === 'object') gez(v, n, k, oz2);
    }
  };
  gez(ast.program ?? ast, null, null);
  return bulunan;
}
