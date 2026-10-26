// Telefon paneli / dokunmatik parça ekran görüntüsü: node tools/_ekran-esp32.mjs  (shots/esp32-*.png)
import fs from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

const PORT = 5188;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const vite = await createServer({ server: { port: PORT, hmr: false }, logLevel: 'error' });
await vite.listen();
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const bekle = ms => new Promise(r => setTimeout(r, ms));
let kod = 0;
try {
  const p = await b.newPage();
  await p.setViewport({ width: 1400, height: 860 });
  p.on('pageerror', e => { console.log('PAGEERROR', e.message); kod = 1; });
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.goto(`http://localhost:${PORT}/#test=1&demo=0&sekme=telefon&calistir=1`);
  await bekle(6500);
  await p.screenshot({ path: 'shots/esp32-1-baglandi.png' });
  const durum = await p.evaluate(() => ({ ag: document.querySelector('.t-ag').textContent, yollar: [...document.querySelectorAll('.t-yollar button')].map(x => x.textContent), tab: !document.getElementById('sekmeTelefonBtn').hidden, segGizli: document.getElementById('gBlok').parentElement.style.display }));
  console.log(JSON.stringify(durum));
  await p.click('.t-yollar button'); await bekle(1200);
  await p.screenshot({ path: 'shots/esp32-2-anasayfa.png' });
  // iframe içindeki "Ac" düğmesine tıkla (düğme bir bağlantının içinde)
  const kare = await (await p.$('.t-sayfa')).contentFrame();
  const link = await kare.$('a[href="/led?durum=1"]'); await link.click(); await bekle(1500);
  await p.screenshot({ path: 'shots/esp32-3-led.png' });
  const sonuc = await p.evaluate(() => ({ url: document.querySelector('.t-url').value, bilgi: document.querySelector('.t-bilgi').textContent, led: window.__atolye.sim.pin.D0.deger, gecmis: window.__atolye.sim.ag.gecmis.map(g => g.kod + ' ' + g.yol) }));
  console.log(JSON.stringify(sonuc));
  if (sonuc.led !== 1) { console.log('FAIL: LED yanmadı'); kod = 1; }
  // dokunmatik parça (sahne) ve kod sekmesi
  await p.evaluate(() => window.__atolye.sekme('kod'));
  await bekle(500);
  await p.screenshot({ path: 'shots/esp32-4-kod.png' });
} finally { await b.close(); await vite.close(); }
process.exit(kod);
