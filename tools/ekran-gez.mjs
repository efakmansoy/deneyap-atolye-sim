// Tüm dersleri gerçek tarayıcıda gezip ekran görüntüsü alır: node tools/ekran-gez.mjs [port] [çıktı klasörü] [ders sırası...]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const PORT = process.argv[2] || 5188, OUT = process.argv[3] || 'shots/gez';
const secili = process.argv.slice(4).map(Number);
fs.mkdirSync(OUT, { recursive: true });
const tarayici = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', defaultViewport: { width: 1700, height: 950 },
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const s = await tarayici.newPage();
const hatalar = []; s.on('pageerror', e => hatalar.push(e.message));
await s.goto(`http://localhost:${PORT}/#test`, { waitUntil: 'load' });
const sayi = secili.length ? 0 : 47;
const liste = secili.length ? secili : Array.from({ length: sayi }, (_, i) => i);
for (const i of liste) {
  await s.goto(`http://localhost:${PORT}/#ders=${i}&test`, { waitUntil: 'load' }); await s.reload({ waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));
  const olcu = await s.evaluate(() => { const c = document.querySelector('canvas'); const r = c?.getBoundingClientRect(); return r ? [Math.round(r.left), Math.round(r.width), c.width, c.clientWidth] : null; });
  await s.screenshot({ path: `${OUT}/d${String(i).padStart(2, '0')}.png` });
  console.log(i, JSON.stringify(olcu));
}
console.log('sayfa hataları:', hatalar.length, hatalar.slice(0, 5));
await tarayici.close();
