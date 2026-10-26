// Vite eklentisi: src/ içindeki Türkçe dizeleri, İngilizce sözlükte karşılığı varsa __t() / __tp`` ile sarar.
// Türkçe modda bu çağrılar metni aynen döndürür; İngilizce modda sözlükten çevirir.
import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { tara } from './ortak.mjs';

export default function dilEklentisi() {
  let sozluk = null;
  const yukle = async () => { try { sozluk = (await import(pathToFileURL(path.resolve('src/i18n/en.js')).href + '?t=' + Date.now())).default; } catch { sozluk = {}; } };
  return {
    name: 'deneyap-dil', enforce: 'pre',
    async buildStart() { await yukle(); },
    async transform(kod, id) {
      const yol = id.split('?')[0].split(String.fromCharCode(92)).join('/');
      if (!/\/src\/.*\.js$/.test(yol) || /\/src\/i18n(\.js|\/)/.test(yol)) return null;
      if (!sozluk) await yukle();
      const hit = tara(kod, yol).filter(b => sozluk[b.anahtar] != null).sort((a, b) => b.bas - a.bas);
      if (!hit.length) return null;
      let c = kod;
      for (const b of hit) {
        c = b.tur === 'dize' ? c.slice(0, b.bas) + '__t(' + c.slice(b.bas, b.son) + ')' + c.slice(b.son) : c.slice(0, b.bas) + '__tp' + c.slice(b.bas);
      }
      return { code: `import { __t, __tp } from '/src/i18n.js';\n` + c, map: null };
    },
  };
}
