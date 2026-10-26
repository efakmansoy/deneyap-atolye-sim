// Smoke test: node electron/smoke.mjs "<exe yolu>"  (varsayılan release/win-unpacked)
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const exe = process.argv[2] || 'release/win-unpacked/Deneyap Atölye.exe';
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'deneyap-smoke-'));
const PORT = 9333;
const sonuc = []; const ok = (ad, v, d = '') => { sonuc.push(v); console.log(v ? 'OK  ' : 'FAIL', ad, d); };
const bekle = (ms) => new Promise(r => setTimeout(r, ms));
function baslat() { return spawn(exe, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${ud}`], { stdio: 'ignore' }); }
async function baglan() {
  for (let i = 0; i < 60; i++) { try { const b = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: null }); return b; } catch { await bekle(500); } }
  throw new Error('bağlanılamadı');
}
async function sayfa(b) { for (let i = 0; i < 40; i++) { const p = (await b.pages()).find(x => x.url().startsWith('app://')); if (p) return p; await bekle(500); } throw new Error('sayfa yok'); }
async function kapat(proc, b) { try { await b.close(); } catch {} await bekle(2500); try { proc.kill(); } catch {} await bekle(500); }
let proc = baslat(), b = await baglan(), p = await sayfa(b);
try {
  ok('pencere/başlık', (await p.title()) === 'Deneyap Atölye', await p.title());
  await p.waitForSelector('.ders-oge', { timeout: 30000 });
  await bekle(3000);
  const n = await p.$$eval('.ders-oge', e => e.length); ok('.ders-oge = 47', n === 47, String(n));
  const kutu = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]; if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  let cv = { yok: true };
  if (kutu) { const buf = await p.screenshot({ clip: kutu }); const { data } = await sharp(buf).resize(64, 64, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true }); const st = new Set(); for (let i = 0; i < data.length; i += 3) st.add((data[i] >> 3) + ',' + (data[i + 1] >> 3) + ',' + (data[i + 2] >> 3)); cv = { ...kutu, renkler: st.size }; }
  ok('3B canvas çiziyor', !cv.yok && cv.renkler > 10, JSON.stringify(cv));
  const f = await p.evaluate(async () => { const r = await fetch('/ses/liste.json'); if (!r.ok) return { liste: r.status, yok: true }; const j = await r.json(); const id = Object.keys(j)[0]; const m = await fetch(`/ses/${id}-01.mp3`, { headers: { Range: 'bytes=0-99' } }); return { liste: r.status, mp3: m.status, tip: m.headers.get('content-type'), id }; });
  ok('liste.json 200 + mp3 (ses paketlenmediyse yok: tarayıcı sesine düşülür)', f.yok || (f.liste === 200 && (f.mp3 === 200 || f.mp3 === 206)), JSON.stringify(f));
  await p.evaluate(() => localStorage.setItem('smoke', 'kalici'));
  await p.click('#dilBtn'); await bekle(1500);
  const dil = await p.evaluate(() => ({ lang: document.documentElement.lang, btn: document.querySelector('#dilBtn').textContent, body: document.body.innerText.slice(0, 400) }));
  console.log('dil sonrası:', JSON.stringify(dil).slice(0, 300));
  ok('dil EN', /en/i.test(dil.lang) || /EN|English/.test(dil.btn) || /Lesson|Run|Code|Tasks/.test(dil.body));
  await bekle(1000);
} finally { await kapat(proc, b); }
proc = baslat(); b = await baglan(); p = await sayfa(b);
try { await bekle(1500); ok('localStorage kalıcı', (await p.evaluate(() => localStorage.getItem('smoke'))) === 'kalici'); await p.evaluate(() => localStorage.removeItem('smoke')); }
finally { await kapat(proc, b); }
try { fs.rmSync(ud, { recursive: true, force: true }); } catch {}
console.log(sonuc.every(Boolean) ? 'SMOKE GEÇTİ' : 'SMOKE BAŞARISIZ'); process.exit(sonuc.every(Boolean) ? 0 : 1);
