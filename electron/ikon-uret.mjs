// index.html'deki marka SVG'sinden electron/icon.png (512x512) üretir. Kullanım: node electron/ikon-uret.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512">
<rect width="32" height="32" rx="6" fill="#0f172a"/>
<g transform="translate(16 16) scale(0.82) translate(-16 -16)">
<rect x="8" y="8" width="16" height="16" rx="3" fill="none" stroke="#2dd4bf" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="#fbbf24"/>
<path d="M12 8V3M16 8V3M20 8V3M12 29v-5M16 29v-5M20 29v-5M3 12h5M3 16h5M3 20h5M24 12h5M24 16h5M24 20h5" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round"/></g></svg>`;
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'icon.png');
await sharp(Buffer.from(svg)).png().toFile(out);
console.log('yazıldı:', out);
