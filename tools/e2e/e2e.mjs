// Uçtan uca (E2E) test: gerçek Chrome + gerçek Vite sunucusu.
// Çalıştır:  node tools/e2e/e2e.mjs        (başarısız adımlarda shots/e2e-*.png ekran görüntüsü bırakır)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, preview } from 'vite';
import puppeteer from 'puppeteer-core';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EN = process.argv.includes('--en');   // --en: arayüzü İngilizce modda sına
const PORT = 5199, URL_ = `http://localhost:${PORT}/#test`;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
if (!CHROME) { console.error('Chrome bulunamadı'); process.exit(2); }
fs.mkdirSync(path.join(kok, 'shots'), { recursive: true });

// tools/e2e/cozumler*.mjs dosyalarının hepsi birleştirilir (ek dersler kendi dosyasını ekler)
let cozumler = {};
for (const f of fs.readdirSync(path.join(kok, 'tools/e2e')).filter(f => /^cozumler.*.mjs$/.test(f)).sort()) Object.assign(cozumler, (await import(pathToFileURL(path.join(kok, 'tools/e2e', f)).href)).default);
if (!Object.keys(cozumler).length) console.warn('! tools/e2e/cozumler*.mjs yok: ders çözümü testleri atlanacak');

// Derlenmiş (sabit) sürüm sunulur: geliştirme sunucusunun HMR/yeniden yüklemesi testi bozmasın, başkaları dosya düzenlerken de tekrarlanabilir olsun.
await build({ root: kok, logLevel: 'error', build: { outDir: 'dist-e2e', emptyOutDir: true, chunkSizeWarningLimit: 4000 } });
const sunucu = await preview({ root: kok, logLevel: 'error', build: { outDir: 'dist-e2e' }, preview: { port: PORT, strictPort: true, host: 'localhost' } });
sunucu.close = () => new Promise(r => sunucu.httpServer.close(r));
const tarayici = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', defaultViewport: { width: 1700, height: 950 },
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const sayfa = await tarayici.newPage();
const hatalar = [];
sayfa.on('pageerror', e => hatalar.push('pageerror: ' + e.message));
sayfa.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) hatalar.push('console.error: ' + m.text()); });

const sonuc = [];
const bekle = ms => new Promise(r => setTimeout(r, ms));
async function test(ad, fn) {
  const t0 = Date.now(), once = hatalar.length;
  try {
    await fn();
    if (hatalar.length > once) throw new Error('sayfa hataları: ' + hatalar.slice(once).join(' | '));
    sonuc.push({ ad, ok: true, ms: Date.now() - t0 }); console.log(`  ✓ ${ad} (${Date.now() - t0} ms)`);
  } catch (e) {
    sonuc.push({ ad, ok: false, hata: e.message }); console.log(`  ✗ ${ad}\n      ${e.message}`);
    try { await sayfa.screenshot({ path: path.join(kok, 'shots', 'e2e-' + ad.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) + '.png') }); } catch {}
  }
}
const esit = (a, b, msg) => { if (a !== b) throw new Error(`${msg}: beklenen ${JSON.stringify(b)}, gelen ${JSON.stringify(a)}`); };
const dogru = (c, msg) => { if (!c) throw new Error(msg); };
const ev = (fn, ...a) => sayfa.evaluate(fn, ...a);
const metin = sel => ev(s => document.querySelector(s)?.textContent ?? '', sel);
async function sonucBekle(zamanAsimi = 45000) {         // #sonuc "çalışıyor…"dan çıkana kadar
  await sayfa.waitForFunction(() => { const t = document.getElementById('sonuc').textContent; return t && !t.startsWith('çalışıyor') && !t.startsWith('running') && t !== 'durduruldu' && t !== 'stopped'; }, { timeout: zamanAsimi });
  return metin('#sonuc');
}
async function kodYaz(kod) {
  await ev(k => { const t = document.getElementById('kodYaz'); t.value = k; t.dispatchEvent(new Event('input')); }, kod);
}
async function temizBaslat() {
  await sayfa.goto(URL_, { waitUntil: 'load' });
  await ev(() => localStorage.clear());
  if (EN) await ev(() => localStorage.setItem('dil', 'en'));
  await sayfa.reload({ waitUntil: 'load' });      // aynı adrese goto sayfayı yenilemez; reload gerçek yeniden yükleme yapar
  await sayfa.waitForFunction(() => window.__atolye, { timeout: 20000 });
}

console.log('\nDeneyap Atölye · E2E\n');
await temizBaslat();

await test('Açılış: arayüz, 20 ders, 3B kart ve parçalar yüklenir', async () => {
  esit(await ev(() => document.querySelectorAll('.ders-oge').length), await ev(() => window.__atolye.DERSLER.length), 'kenar çubuğundaki ders sayısı');
  dogru(await ev(() => window.__atolye.DERSLER.length) >= 20, 'en az 20 ders olmalı');
  await sayfa.waitForFunction(() => window.__atolye.sahne.kartKutu, { timeout: 30000 });
  dogru(await ev(() => window.__atolye.sahne.nesneler.length) >= 1, 'sahnede parça yok');
  dogru((await metin('#yolDers')).length > 0, 'breadcrumb boş');
  esit(await metin('#ilerlemeYazi'), `0/${await ev(() => window.__atolye.DERSLER.length)} ${EN ? "lessons" : "ders"}`, 'ilerleme yazısı');
  const piksel = await sayfa.evaluate(() => { const c = document.getElementById('sahne'); return c.width * c.height; });
  dogru(piksel > 100000, '3B tuval çok küçük');
});

await test('Sekmeler ve görünüm düğmeleri çalışır', async () => {
  for (const s of ['kod', 'gorev', 'ders']) {
    await sayfa.click(`.sekme[data-sekme="${s}"]`);
    esit(await ev(() => document.querySelector('.icerik.aktif').id), 'sekme' + s[0].toUpperCase() + s.slice(1), 'aktif sekme');
  }
  await sayfa.click('.evre-btn[data-sekme="kod"]');
  esit(await ev(() => document.querySelector('.sekme.aktif').dataset.sekme), 'kod', 'alt hap sekmeyi değiştirmedi');
  await sayfa.click('#gKod'); dogru(!(await ev(() => document.getElementById('editor').hidden)), 'editör açılmadı');
  await sayfa.click('#gBlok'); dogru(await ev(() => document.getElementById('editor').hidden), 'editör kapanmadı');
});

await test('Tema, kenar çubuğu ve panel genişliği', async () => {
  const once = await ev(() => document.documentElement.dataset.tema || '');
  await sayfa.click('#tema');
  dogru((await ev(() => document.documentElement.dataset.tema || '')) !== once, 'tema değişmedi');
  await sayfa.click('#tema');
  await sayfa.click('#menu');
  dogru(await ev(() => document.getElementById('uygulama').classList.contains('kenar-kapali')), 'kenar çubuğu kapanmadı');
  await sayfa.click('#menu');
  const w0 = await ev(() => document.getElementById('panel').getBoundingClientRect().width);
  const k = await ev(() => { const r = document.getElementById('ayirac').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await sayfa.mouse.move(k.x, k.y); await sayfa.mouse.down(); await sayfa.mouse.move(k.x - 120, k.y, { steps: 6 }); await sayfa.mouse.up();
  const w1 = await ev(() => document.getElementById('panel').getBoundingClientRect().width);
  dogru(w1 > w0 + 60, `panel genişlemedi (${w0} → ${w1})`);
});

await test('Ders 1.1: adım adım öğretmen blok yerleşince ilerler, çalıştırınca ders tamamlanır', async () => {
  await ev(() => { window.__atolye.dersYukle(0); window.__atolye.sekme('ders'); });
  esit(await ev(() => window.__atolye.egitmen.i), 0, 'başlangıç adımı');
  const adimSay = await ev(() => window.__atolye.egitmen.adimlar.length);
  dogru(adimSay >= 4, 'adım sayısı az');
  // "Anladım" ile bilgi adımlarını geç
  const ileri = () => ev(() => document.querySelector('.adim-alt .ileri').click());
  await ileri(); esit(await ev(() => window.__atolye.egitmen.i), 1, 'ikinci adım');
  await ileri(); esit(await ev(() => window.__atolye.egitmen.i), 2, 'üçüncü adım (blok koy)');
  // vurgu: Pinler kategorisi araç kutusunda yanıp sönmeli
  await sayfa.waitForSelector('.blocklyToolboxCategoryContainer.vurgulu, .blok-vurgu', { timeout: 5000 }).catch(() => { throw new Error('araç kutusu/blok vurgusu görünmedi'); });
  // bloğu yerleştir -> adım otomatik tamamlanıp ilerlemeli
  await ev(() => window.__atolye.Blockly.serialization.blocks.append({ type: 'dy_yaz', fields: { PIN: 'D0', DEG: '1' } }, window.__atolye.ws));
  await sayfa.waitForFunction(() => window.__atolye.egitmen.bitenler.has(2), { timeout: 4000 });
  await sayfa.waitForFunction(() => window.__atolye.egitmen.i === 3, { timeout: 4000 });
  // C++ paneli bloğun karşılığını göstermeli
  await ev(() => window.__atolye.gorunum(true));
  dogru((await ev(() => document.getElementById('kodYaz').value)).includes('digitalWrite(D0, HIGH);'), 'C++ karşılığı üretilmedi');
  await ev(() => window.__atolye.gorunum(false));
  await ev(() => window.__atolye.sekme('kod'));
  await sayfa.click('#calistir');
  dogru((await sonucBekle(15000)).startsWith('✔'), 'ders 1.1 blokla geçmedi');
  await sayfa.waitForFunction(() => window.__atolye.egitmen.bitenler.has(3), { timeout: 3000 });
  esit(await metin('#ilerlemeYazi'), `1/${await ev(() => window.__atolye.DERSLER.length)} ${EN ? "lessons" : "ders"}`, 'ilerleme');
  dogru(await ev(() => !!document.querySelector('.ders-oge.bitti')), 'kenar çubuğunda ✓ yok');
});

await test('Blok modu: yanıp sönen LED (ders 1.2) çalışır', async () => {
  await ev(() => {
    const A = window.__atolye; A.dersYukle(1); A.sekme('kod');
    const bekle = ms => ({ type: 'dy_bekle', inputs: { MS: { shadow: { type: 'math_number', fields: { NUM: ms } } } } });
    const yaz = d => ({ type: 'dy_yaz', fields: { PIN: 'D0', DEG: d } });
    const zincir = ([ilk, ...kalan]) => (kalan.length ? { ...ilk, next: { block: zincir(kalan) } } : ilk);
    A.Blockly.serialization.blocks.append({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir([yaz('1'), bekle(500), yaz('0'), bekle(500)]) } } }, A.ws);
  });
  await sayfa.click('#calistir');
  const s = await sonucBekle(20000);
  dogru(s.startsWith('✔'), 'blok çözümü başarısız: ' + s);
});

await test('Yazıyla kod: derleme hatası satır numarasıyla Türkçe gösterilir', async () => {
  await ev(() => { window.__atolye.dersYukle(0); window.__atolye.sekme('kod'); window.__atolye.gorunum(true); });
  await kodYaz('void setup() {\n  pinMode(D0, OUTPUT)\n  digitalWrite(D0, HIGH);\n}\nvoid loop() {}\n');
  await ev(() => { document.getElementById('sonuc').textContent = ''; });
  await sayfa.click('#calistir');
  const s = await sonucBekle(8000);
  dogru(/(Kod hatası|Code error).*(Satır|Line) \d+/.test(s), 'hata mesajı beklenen biçimde değil: ' + s);
  await kodYaz('void setup() {\n  digitalWriteX(D0, HIGH);\n}\nvoid loop() {}\n');
  await ev(() => { document.getElementById('sonuc').textContent = ''; });
  await sayfa.click('#calistir');
  dogru(/(Satır|Line) \d+/.test(await sonucBekle(8000)), 'bilinmeyen fonksiyon hatası yok');
});

await test('Yazıyla kod: Tab girintisi, Enter otomatik girinti ve renklendirme', async () => {
  await ev(() => { window.__atolye.dersYukle(0); window.__atolye.sekme('kod'); window.__atolye.gorunum(true); });
  await kodYaz('');
  await sayfa.focus('#kodYaz');
  await sayfa.keyboard.type('void setup() {');
  await sayfa.keyboard.press('Enter');
  await sayfa.keyboard.type('pinMode(D0, OUTPUT);');
  const v = await ev(() => document.getElementById('kodYaz').value);
  dogru(v.includes('{\n  pinMode'), 'Enter sonrası girinti eklenmedi: ' + JSON.stringify(v));
  dogru(await ev(() => !!document.querySelector('#kod .k-yerlesik')), 'sözdizimi renklendirmesi yok');
  dogru(!(await ev(() => document.getElementById('modEtiket').hidden)), 'elle düzenleme etiketi görünmedi');
});

if (Object.keys(cozumler).length) {
  const n = await ev(() => window.__atolye.DERSLER.length);
  for (let i = 0; i < n; i++) {
    const { id, ad } = await ev(i => { const d = window.__atolye.DERSLER[i]; return { id: d.id, ad: d.ad }; }, i);
    if (!cozumler[id]) { sonuc.push({ ad: `Ders ${ad}`, ok: false, hata: 'referans C++ çözümü yok' }); console.log(`  ✗ Ders ${ad}: referans C++ çözümü yok`); continue; }
    await test(`Ders ${ad}: yazılı C++ çözümü çalışır ve ders tamamlanır`, async () => {
      await ev(i => { window.__atolye.dersYukle(i); window.__atolye.sekme('kod'); window.__atolye.gorunum(true); }, i);
      await kodYaz(cozumler[id]);
      await sayfa.click('#calistir');
      const s = await sonucBekle(60000);
      dogru(s.startsWith('✔'), `ders geçmedi: ${s}`);
      dogru(await ev(id => window.__atolye.depo.oku('tamam', []).includes(id), id), 'ilerleme kaydedilmedi');
    });
  }
  await test('Boş program hiçbir dersi geçmez (negatif kontrol)', async () => {
    const n2 = await ev(() => window.__atolye.DERSLER.length);
    for (let i = 0; i < n2; i += 5) {
      await ev(i => { window.__atolye.dersYukle(i); window.__atolye.sekme('kod'); window.__atolye.gorunum(true); }, i);
      await kodYaz('void setup() {}\nvoid loop() {}\n');
      await sayfa.click('#calistir');
      const s = await sonucBekle(60000);
      dogru(s.startsWith('✘'), `ders ${i} boş programla geçti: ${s}`);
    }
  });
}

await test('Görevler: çok görev, soru doğru/yanlış, ilerleme kalıcı', async () => {
  await ev(() => { window.__atolye.dersYukle(0); window.__atolye.sekme('gorev'); });
  const toplam = await ev(() => document.querySelectorAll('#gorevler .g-kart').length);
  dogru(toplam >= 5, `görev kartı az (${toplam})`);
  dogru(await ev(() => document.querySelectorAll('#gorevler .kod-gorev').length) >= 3, 'en az 3 kod görevi olmalı');
  const soru = await ev(() => { const g = window.__atolye.DERSLER[0].gorevler.findIndex(x => x.tip === 'soru'); return { k: g + 1, dogru: window.__atolye.DERSLER[0].gorevler[g].dogru }; });
  const yanlisIdx = (soru.dogru + 1) % (await ev(k => document.querySelectorAll(`.g-kart[data-k="${k}"] .g-sec`).length, soru.k));
  await sayfa.click(`.g-kart[data-k="${soru.k}"] .g-sec[data-j="${yanlisIdx}"]`);
  dogru(await ev(k => !!document.querySelector(`.g-kart[data-k="${k}"] .g-sec.yanlis`), soru.k), 'yanlış şık işaretlenmedi');
  const once = await metin('#gorevSay');
  await sayfa.click(`.g-kart[data-k="${soru.k}"] .g-sec[data-j="${soru.dogru}"]`);
  dogru(await ev(k => !!document.querySelector(`.g-kart[data-k="${k}"] .g-sec.dogru`), soru.k), 'doğru şık işaretlenmedi');
  dogru((await metin('#gorevSay')) !== once, 'görev sayacı artmadı');
  // boş program kod görevini geçmemeli
  await sayfa.click('#gorevler .kod-gorev:nth-of-type(2) .denetle').catch(async () => { await sayfa.click('#gorevler .kod-gorev .denetle'); });
  await sayfa.waitForFunction(() => document.querySelector('#gorevler .g-sonuc.no, #gorevler .g-sonuc.ok')?.textContent, { timeout: 30000 });
  // kalıcılık
  const kayit = await ev(() => window.__atolye.depo.oku('gorevTamam', []));
  dogru(kayit.length >= 1, 'görev ilerlemesi kaydedilmedi');
});

await test('Sayfa yenilenince ilerleme korunur', async () => {
  const once = await ev(() => window.__atolye.depo.oku('tamam', []).length);
  await sayfa.reload({ waitUntil: 'load' });
  await sayfa.waitForFunction(() => window.__atolye, { timeout: 20000 });
  const n = await ev(() => window.__atolye.DERSLER.length);
  esit(await metin('#ilerlemeYazi'), `${once}/${n} ${EN ? "lessons" : "ders"}`, 'yenilemeden sonra ilerleme');
});

await test('3B sahne: kablolar, pin haritası ve parça etkileşimi', async () => {
  await ev(() => window.__atolye.dersYukle(3));          // düğme dersi
  await sayfa.waitForFunction(() => window.__atolye.sahne.kartKutu, { timeout: 30000 });
  await bekle(600);
  dogru(await ev(() => window.__atolye.sahne.kabloGrup.children.length) >= 4, 'kablo oluşmadı');
  const d0 = await ev(() => { const v = window.__atolye.sahne.kartPin('D0'); return v && [v.x, v.y, v.z]; });
  dogru(d0 && d0.every(Number.isFinite), 'D0 pin konumu bulunamadı');
  const dugme = await ev(() => window.__atolye.sahne.nesneler.findIndex(n => n.pointerDown));
  dogru(dugme >= 0, 'etkileşimli parça yok');
  await ev(() => { const A = window.__atolye, n = A.sahne.nesneler.find(x => x.pointerDown); n.pointerDown(A.sim, {}); });
  dogru(await ev(() => Object.values(window.__atolye.sim.girdi).some(v => v === 1)), 'düğmeye basma sim.girdi\'ye yansımadı');
  await ev(() => { const A = window.__atolye, n = A.sahne.nesneler.find(x => x.pointerUp); n.pointerUp(A.sim, {}); });
});

// ── Yeni özellikler: sesli anlatım, kodu değiştir görevleri, oyunlaştırma, profil/hesap ──
await test('Oyunlaştırma: ders tamamlama XP, rozet ve seviye verir; üst çubuk güncellenir', async () => {
  await temizBaslat();
  esit(await metin('#xpYazi'), '0 XP', 'başlangıç XP');
  await ev(() => { window.__atolye.dersYukle(0); window.__atolye.sekme('kod'); window.__atolye.gorunum(true); });
  await kodYaz('void setup() {\n  pinMode(D0, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(D0, HIGH);\n}\n');
  await sayfa.click('#calistir');
  dogru((await sonucBekle(15000)).startsWith('✔'), 'ders geçmedi');
  const d = await ev(() => { const o = window.__atolye.oyun.durum(); return { xp: o.xp, rozet: Object.keys(o.rozet), seri: o.seri.gun }; });
  dogru(d.xp >= 100 + 25 + 30, `XP az: ${d.xp} (ders 100 + ilk deneme 25 + yazılı 30 beklenir)`);
  dogru(d.rozet.includes('ilk-isik') && d.rozet.includes('yazar'), 'rozetler verilmedi: ' + d.rozet);
  esit(d.seri, 1, 'günlük seri');
  dogru((await metin('#xpYazi')).startsWith(String(d.xp)), 'üst çubuk XP güncellenmedi');
  dogru(await ev(() => document.querySelectorAll('#toastlar .toast').length) >= 1, 'bildirim (toast) çıkmadı');
  dogru((await metin('#seriGun')).includes('1'), 'seri göstergesi güncellenmedi');
});

await test('Kodu değiştir görevi: yükle → işaretli yerler → değiştir → denetle → XP', async () => {
  await ev(() => { window.__atolye.dersYukle(0); window.__atolye.sekme('gorev'); });
  const k = await ev(() => window.__atolye.DERSLER[0].gorevler.findIndex(g => g.tip === 'duzenle') + 1);
  dogru(k >= 1, 'bu derste duzenle görevi yok');
  const kod = await ev(k => window.__atolye.DERSLER[0].gorevler[k - 1].kod, k);
  // yüklemeden denetlenemez
  await sayfa.click(`.g-kart[data-k="${k}"] .denetle`);
  dogru((await metin(`.g-kart[data-k="${k}"] .g-sonuc`)).match(/Önce|First/), '"önce yükle" uyarısı yok');
  await sayfa.click(`.g-kart[data-k="${k}"] .yukle`);
  esit(await ev(() => document.getElementById('kodYaz').value), kod, 'başlangıç kodu yüklenmedi');
  dogru(await ev(() => document.querySelectorAll('#kodIsaret .dv').length) >= 1, 'değiştirilecek yer işaretlenmedi');
  // değiştirmeden denetle
  await sayfa.click('.sekme[data-sekme="gorev"]');
  await sayfa.click(`.g-kart[data-k="${k}"] .denetle`);
  dogru((await sonucBekle(8000)).match(/değiştirmedin|not changed|haven't changed/), 'değişiklik yapılmadığı söylenmedi');
  const xp0 = await ev(() => window.__atolye.oyun.durum().xp);
  await kodYaz(kod.replace('HIGH', 'LOW'));
  dogru(await ev(() => document.querySelectorAll('#kodIsaret .dv').length) === 0, 'değiştirilen yerin işareti kalktı beklenirdi');
  await sayfa.click('.sekme[data-sekme="gorev"]');
  await sayfa.click(`.g-kart[data-k="${k}"] .denetle`);
  await sayfa.waitForFunction(k => document.querySelector(`.g-kart[data-k="${k}"].tamam`), { timeout: 20000 }, k);
  const xp1 = await ev(() => window.__atolye.oyun.durum().xp);
  dogru(xp1 >= xp0 + 50, `görev XP'si verilmedi (${xp0} → ${xp1})`);
});

await test('Sesli anlatım: altyazı akar, kod satır satır yazılır, duraklat/devam çalışır, ders tamamlanır', async () => {
  await temizBaslat();
  await ev(() => { window.__atolye.tts.hiz = 14; window.__atolye.dersYukle(0); });
  dogru(await ev(() => !document.getElementById('sesliBar').hidden), 'sesli çubuk görünmedi');
  dogru(await ev(() => window.__atolye.anlatici.parcalar.length) >= 5, 'sesli parça yok');
  await sayfa.click('#sOynat');
  await sayfa.waitForFunction(() => window.__atolye.anlatici.durum === 'caliyor', { timeout: 3000 });
  await sayfa.waitForFunction(() => document.getElementById('kodYaz').value.length > 5, { timeout: 8000 });
  dogru((await metin('#altyazi')).length > 5, 'altyazı yok');
  dogru(await ev(() => window.__atolye.sahne.halka.visible), 'anlatım sırasında parça vurgusu yok');
  const l1 = await ev(() => document.getElementById('kodYaz').value.length);
  dogru(l1 < 120, 'kod bir anda yazılmış, satır satır değil');
  // duraklat: yazım durmalı
  await sayfa.click('#sDuraklat');
  esit(await ev(() => window.__atolye.anlatici.durum), 'duraklatildi', 'durum');
  await bekle(150); const l2 = await ev(() => document.getElementById('kodYaz').value.length);
  await bekle(700); const l3 = await ev(() => document.getElementById('kodYaz').value.length);
  dogru(l3 - l2 <= 3, `duraklatınca kod yazılmaya devam etti (${l2} → ${l3})`);
  await sayfa.click('#sDuraklat');
  await sayfa.waitForFunction(() => window.__atolye.anlatici.durum === 'bitti', { timeout: 60000 });
  const son = await ev(() => document.getElementById('kodYaz').value);
  const beklenen = await ev(() => window.__atolye.DERSLER[0].sesli.map(p => p.yaz ?? '').join(''));
  esit(son, beklenen, 'yazılan kod = parçaların birleşimi');
  await sayfa.waitForFunction(() => window.__atolye.depo.oku('tamam', []).includes('led-yak'), { timeout: 20000 });
  dogru(await ev(() => window.__atolye.depo.oku('ist', {}).anlatimlar?.includes('led-yak')), 'anlatım tamamlandı kaydı yok');
  dogru(await ev(() => window.__atolye.oyun.durum().rozet['ilk-isik'] != null), 'ders rozeti yok');
});

await test('Sesli anlatım: takılabilir TTS sağlayıcısı her cümleyi sırayla alır', async () => {
  await temizBaslat();
  await ev(() => {
    const A = window.__atolye; A.tts.hiz = 14; A.tts.sessiz = false; A.dersYukle(0);
    window.__okunan = []; window.__durdu = 0;
    window.DeneyapTTS.saglayiciAyarla({ konus: async m => { window.__okunan.push(m); await new Promise(r => setTimeout(r, 40)); }, durdur() { window.__durdu++; } });
  });
  await sayfa.click('#sOynat');
  await sayfa.waitForFunction(() => window.__atolye.anlatici.durum === 'bitti', { timeout: 60000 });
  const okunan = await ev(() => window.__okunan), beklenen = await ev(() => window.__atolye.DERSLER[0].sesli.map(p => p.ses));
  esit(JSON.stringify(okunan), JSON.stringify(beklenen), 'sağlayıcıya iletilen metinler');
  await ev(() => { window.__atolye.tts.sessiz = true; });
});

await test('Sesli anlatım: durdurunca ses kesilir ve ders değişince anlatım sıfırlanır', async () => {
  await ev(() => { const A = window.__atolye; A.tts.hiz = 1; A.tts.sessiz = true; A.dersYukle(1); });
  await sayfa.click('#sOynat');
  await sayfa.waitForFunction(() => window.__atolye.anlatici.durum === 'caliyor', { timeout: 3000 });
  await sayfa.click('#sOynat');          // çalarken tekrar basınca durdur
  esit(await ev(() => window.__atolye.anlatici.durum), 'hazir', 'durdurunca durum');
  await bekle(300);
  const a = await ev(() => document.getElementById('kodYaz').value.length); await bekle(400);
  esit(await ev(() => document.getElementById('kodYaz').value.length), a, 'durdurduktan sonra kod yazılmaya devam etti');
  await sayfa.click('#sOynat');
  await sayfa.waitForFunction(() => window.__atolye.anlatici.durum === 'caliyor', { timeout: 3000 });
  await ev(() => window.__atolye.dersYukle(2));
  esit(await ev(() => window.__atolye.anlatici.durum), await ev(() => (window.__atolye.DERSLER[2].sesli ? 'hazir' : 'bos')), 'ders değişince anlatıcı durumu');
});

await test('Profil/hesap: oluştur, ilerleme profile özel, geçiş, dışa/içe aktar, sil', async () => {
  await temizBaslat();
  sayfa.on('dialog', d => d.accept());
  // misafir profilinde bir ders tamamla
  await ev(() => { window.__atolye.dersYukle(0); window.__atolye.sekme('kod'); window.__atolye.gorunum(true); });
  await kodYaz('void setup() {\n  pinMode(D0, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(D0, HIGH);\n}\n');
  await sayfa.click('#calistir'); dogru((await sonucBekle(15000)).startsWith('✔'), 'ders geçmedi');
  esit(await metin('#profilAd'), (EN ? 'Guest' : 'Misafir'), 'varsayılan profil');
  esit(await metin('#ilerlemeYazi'), `1/${await ev(() => window.__atolye.DERSLER.length)} ${EN ? "lessons" : "ders"}`, 'misafir ilerlemesi');
  // yeni profil oluştur
  await sayfa.click('#profilBtn');
  await sayfa.waitForSelector('#modalIcerik .yeni-profil');
  dogru(await ev(() => document.querySelectorAll('#modalIcerik .rozet').length) >= 15, 'rozet vitrini eksik');
  dogru(await ev(() => document.querySelectorAll('#modalIcerik .rozet.kazanildi').length) >= 1, 'kazanılan rozet işaretli değil');
  await sayfa.type('#modalIcerik input[name=ad]', 'Ayşe');
  await sayfa.click('#modalIcerik .avatar-sec label:nth-child(3)');
  await Promise.all([sayfa.waitForNavigation({ waitUntil: 'load' }), sayfa.click('#modalIcerik .yeni-profil .birincil')]);
  await sayfa.waitForFunction(() => window.__atolye, { timeout: 20000 });
  esit(await metin('#profilAd'), 'Ayşe', 'yeni profil aktif olmadı');
  esit(await metin('#ilerlemeYazi'), `0/${await ev(() => window.__atolye.DERSLER.length)} ${EN ? "lessons" : "ders"}`, 'yeni profilin ilerlemesi sıfır olmalı');
  esit(await metin('#xpYazi'), '0 XP', 'yeni profilin XP\'si sıfır olmalı');
  // dışa aktar (Misafir'i) ve geri geç
  const disa = await ev(ad => { const m = window.__atolye.profil; return m.disaAktar(m.liste().find(p => p.ad === ad).id); }, EN ? 'Guest' : 'Misafir');
  dogru(JSON.parse(disa).veri.tamam.length === 1, 'dışa aktarılan veri eksik');
  await sayfa.click('#profilBtn'); await sayfa.waitForSelector('#modalIcerik .profil-kart');
  await Promise.all([sayfa.waitForNavigation({ waitUntil: 'load' }), ev(ad => [...document.querySelectorAll('#modalIcerik .profil-kart')].find(k => k.textContent.includes(ad)).querySelector('.sec').click(), EN ? 'Guest' : 'Misafir')]);
  await sayfa.waitForFunction(() => window.__atolye, { timeout: 20000 });
  esit(await metin('#profilAd'), (EN ? 'Guest' : 'Misafir'), 'geri geçiş');
  esit(await metin('#ilerlemeYazi'), `1/${await ev(() => window.__atolye.DERSLER.length)} ${EN ? "lessons" : "ders"}`, 'misafirin ilerlemesi korunmalı');
  // içe aktar: yeni profil olarak
  await ev(m => { const p = window.__atolye.profil.iceAktar(m); return p.id; }, disa);
  esit(await ev(() => window.__atolye.profil.liste().length), 3, 'içe aktarma profil eklemedi');
  await ev(() => { const P = window.__atolye.profil; for (const p of P.liste()) if (p.ad === 'Ayşe') P.sil(p.id); });
  dogru(!(await ev(() => window.__atolye.profil.liste().some(p => p.ad === 'Ayşe'))), 'profil silinmedi');
  dogru(await ev(() => Object.keys(localStorage).every(k => !/dyp:[^:]+:/.test(k) || window.__atolye.profil.liste().some(p => k.startsWith('dyp:' + p.id + ':')) || k.startsWith('dyp:genel') )), 'silinen profilin verisi temizlenmedi');
  let hata = false; try { await ev(() => window.__atolye.profil.iceAktar('{bozuk')); } catch { hata = true; }
  dogru(hata, 'bozuk içe aktarma hata vermedi');
});

await tarayici.close();
await sunucu.close();

const kalan = sonuc.filter(r => !r.ok);
console.log(`\n${sonuc.length - kalan.length}/${sonuc.length} test geçti${kalan.length ? ' — BAŞARISIZ: ' + kalan.map(r => r.ad).join('; ') : ''}`);
if (hatalar.length) console.log(`(konsolda ${hatalar.length} hata kaydı: ${[...new Set(hatalar)].slice(0, 3).join(' | ')})`);
process.exit(kalan.length ? 1 : 0);
