// shots/gez/dNN.png dosyalarını kontak sayfalarına (3x3) toplar: node tools/ekran-sayfa.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const dir = path.resolve(process.argv[2] || 'shots/gez');
const dosyalar = fs.readdirSync(dir).filter(f => /^d\d+\.png$/.test(f)).sort();
const tarayici = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', defaultViewport: { width: 1800, height: 1000 } });
const s = await tarayici.newPage();
for (let i = 0; i < dosyalar.length; i += 9) {
  const grup = dosyalar.slice(i, i + 9);
  const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(3,600px);gap:2px">${grup.map(f => `<div style="position:relative;width:600px;height:333px"><img src="${pathToFileURL(path.join(dir, f))}" style="width:600px"><b style="position:absolute;left:4px;top:2px;color:#fff;background:#000a;font:700 16px sans-serif">${f}</b></div>`).join('')}</body>`;
  fs.writeFileSync(path.join(dir, '_s.html'), html);
  await s.goto(pathToFileURL(path.join(dir, '_s.html')).href); await new Promise(r => setTimeout(r, 400));
  await s.screenshot({ path: path.join(dir, `sayfa${String(i / 9 + 1).padStart(2, '0')}.png`), clip: { x: 0, y: 0, width: 1804, height: 962 } });
}
await tarayici.close();
