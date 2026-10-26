// İngilizce modda ekranda kalan Türkçe metinleri bulur: node tools/i18n/tara-kalan.mjs <port> [ders sırası…]
// (önce: npx vite --port <port>)
import puppeteer from 'puppeteer-core';
const PORT = process.argv[2] || 5231, secili = process.argv.slice(3).map(Number);
const tr = /[çğıöşüÇĞİÖŞÜ]/;
const t = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', defaultViewport: { width: 1700, height: 950 },
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const s = await t.newPage(); const hatalar = []; s.on('pageerror', e => hatalar.push(e.message));
await s.goto(`http://localhost:${PORT}/#test`, { waitUntil: 'load' });
await s.evaluate(() => localStorage.setItem('dil', 'en'));
const n = (await (async () => { await s.reload({ waitUntil: 'load' }); await s.waitForFunction(() => window.__atolye, { timeout: 30000 }); return s.evaluate(() => window.__atolye.DERSLER.length); })());
const bulunan = new Map();
const ekle = (kaynak, metin) => { for (const satir of metin.split('\n').map(x => x.trim()).filter(Boolean)) if (tr.test(satir)) { const a = bulunan.get(satir) ?? new Set(); a.add(kaynak); bulunan.set(satir, a); } };
for (const i of secili.length ? secili : Array.from({ length: n }, (_, i) => i)) {
  await s.evaluate(i => { window.__atolye.dersYukle(i); }, i);
  for (const sekme of ['ders', 'kod', 'gorev']) {
    await s.evaluate(k => window.__atolye.sekme(k), sekme); await new Promise(r => setTimeout(r, 150));
    const metin = await s.evaluate(() => [...document.querySelectorAll('.icerik.aktif, #kenar, #ust, #evre')].map(e => e.innerText).join('\n'));
    ekle(`d${i}/${sekme}`, metin);
  }
  // kod editörü (başlangıç kodu)
  ekle(`d${i}/editor`, await s.evaluate(() => document.getElementById('kodYaz')?.value ?? ''));
}
for (const [m, k] of bulunan) console.log(`[${[...k].slice(0, 3).join(',')}${k.size > 3 ? '+' + (k.size - 3) : ''}] ${m.slice(0, 160)}`);
console.log('benzersiz Türkçe satır:', bulunan.size, 'sayfa hataları:', hatalar.length, hatalar.slice(0, 3));
await t.close();
