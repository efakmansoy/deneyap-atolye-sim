// Seçilen derslerde Kod / Görevler / Telefon sekmelerinin ekran görüntüsü: node tools/ekran-sekme.mjs <port> <klasör> <ders sırası...>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const [PORT, OUT, ...idx] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const t = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', defaultViewport: { width: 1700, height: 950 }, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const s = await t.newPage(); const hatalar = []; s.on('pageerror', e => hatalar.push(e.message));
for (const i of idx) {
  await s.goto(`http://localhost:${PORT}/#ders=${i}&test`, { waitUntil: 'load' }); await s.reload({ waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2000));
  for (const ad of ['kod', 'gorev', 'telefon']) {
    const var_ = await s.evaluate(ad => { const b = document.querySelector(`.sekme[data-sekme="${ad}"]`); if (!b || b.hidden) return false; b.click(); return true; }, ad);
    if (!var_) continue;
    await new Promise(r => setTimeout(r, 1200));
    await s.screenshot({ path: `${OUT}/s${String(i).padStart(2, '0')}-${ad}.png` });
  }
}
console.log('hatalar', hatalar.length, hatalar.slice(0, 3)); await t.close();
