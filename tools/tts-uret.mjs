// Sesli anlatımı Evren voxcpm2 ile mp3'e çevirir: node tools/tts-uret.mjs <çıktı klasörü> <ders id> [ders id ...]
// Anahtar ortam değişkeninden okunur (dosyaya yazılmaz): EVREN_API_KEY
// Ses tonunu sabit tutmak için bir ders TEK istekte üretilir (aynı istek içinde ses sabit kalır), sonra
// cümle aralarındaki sessizliklere ve karakter oranına göre parçalara bölünür. Her parça ASR ile doğrulanır.
import fs from 'fs'; import path from 'path'; import { execFileSync, spawnSync } from 'child_process'; import { pathToFileURL } from 'url';
import { okunus } from './tts-okunus.mjs';
const SES_TARIFI = 'A calm Turkish male teacher in his thirties, medium-low pitch, warm and friendly, steady even tone, moderate pace, clear studio recording';
const URL = 'https://evren-llmapi.ssyz.org.tr/v1';
const [cikti, ...arg] = process.argv.slice(2);
const tek = arg.includes('--tek'), capa = arg.includes('--capa'), idler = arg.filter(a => !a.startsWith('--'));
// --capa: her isteğin başına AYNI cümle konur (aynı metin = aynı ses), böylece istekler arası ses rengi yakınlaşır; çapa parçası sonra atılır
const CAPA = 'Merhaba, ben Deneyap Atölye öğretmeniniz. Hazırsan başlayalım.';   // --tek: tüm dersler TEK istekte (ses her yerde aynı)
if (!process.env.EVREN_API_KEY || !cikti || !idler.length) { console.log('Kullanım: EVREN_API_KEY=... node tools/tts-uret.mjs <klasör> <ders id>...'); process.exit(1); }
fs.mkdirSync(cikti, { recursive: true });
const H = { Authorization: 'Bearer ' + process.env.EVREN_API_KEY };
const harf = s => s.toLowerCase().replace(/[^a-zçğıöşü0-9]/g, '');
const sure = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();
function sessizlikler(f) {
  const r = spawnSync('ffmpeg', ['-i', f, '-af', 'silencedetect=noise=-36dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const bas = [...r.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]), son = [...r.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  return bas.map((b, i) => ({ b, e: son[i] ?? b }));
}
// Ağ kesintisi / 429 / 5xx için artan beklemeyle yeniden dene
const tekrar = async (fn, ad, n = 6) => { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i >= n) throw e; const b = 8000 * (i + 1); console.log(`${ad}: ${e.cause?.code ?? e.message} — ${b / 1000} sn sonra yeniden (${i + 1}/${n})`); await new Promise(r => setTimeout(r, b)); } } };
async function asr(f) {
  const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(f)], { type: 'audio/mpeg' }), 'a.mp3'); fd.append('model', 'qwen3-asr-1.7b'); fd.append('language', 'tr');
  return tekrar(async () => { const r = await fetch(URL + '/audio/transcriptions', { method: 'POST', headers: H, body: fd }); if (r.status === 429 || r.status >= 500) throw new Error('asr http ' + r.status); return r.ok ? (await r.json()).text ?? '' : null; }, 'asr');
}
// iki metnin başlangıç ve bitiş kelimeleri tutuyor mu (kabaca)
function uyum(beklenen, duyulan) {
  const k = s => s.toLowerCase().replace(/[^a-zçğıöşü0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const b = k(beklenen), d = k(duyulan); if (!d.length) return 0;
  const ortak = new Set(d); return b.filter(w => ortak.has(w)).length / b.length;
}
const dir = path.resolve('src/lessons/icerik'); const EK = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) Object.assign(EK, (await import(pathToFileURL(path.join(dir, f)).href)).default);
let toplamKar = 0;
const dersParca = id => (EK[id]?.sesli ?? []).map((p, sira) => ({ ...p, ders: id, sira }));
// API tek istekte en fazla 4096 karakter alır: --tek ile dersler bu sınırı aşmayacak gruplara (ders bölünmeden) paketlenir.
const SINIR = 3900;
const paketle = () => { const g = []; let simdiki = null, say = 0;
  for (const id of idler) { const pr = dersParca(id); if (!pr.length) continue; const k = okunus(pr.map(x => x.ses).join(' ')).length + pr.length;
    if (!simdiki || say + k > SINIR) { simdiki = { id: 'grup' + String(g.length + 1).padStart(2, '0'), parcalar: [] }; g.push(simdiki); say = 0; }
    simdiki.parcalar.push(...pr); say += k; } return g; };
const gruplar = tek ? paketle() : idler.map(id => ({ id, parcalar: dersParca(id) }));
if (tek) console.log('gruplar:', gruplar.map(g => g.id + '=' + g.parcalar.length + ' parça').join(', '));
for (const g of gruplar) {
  const { id } = g; let parcalar = g.parcalar;
  const bitti = path.join(cikti, id + '.bitti'); if (fs.existsSync(bitti)) { console.log('atlandı (daha önce bitti):', id); continue; }
  if (!parcalar.length) { console.log('yok:', id); continue; }
  if (capa) parcalar = [{ ses: CAPA, ders: '_capa-' + id, sira: 0 }, ...parcalar];
  const metinler = parcalar.map(p => okunus(p.ses));
  const ham = path.join(cikti, id + '.ham.wav'), norm = path.join(cikti, id + '.tam.wav');
  const uretildi = await tekrar(async () => {
    const r = await fetch(URL + '/audio/speech', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'voxcpm2', input: metinler.join(' '), response_format: tek ? 'pcm' : 'wav', stream: tek, instructions: SES_TARIFI }) });
    if (r.status === 429 || r.status >= 500) throw new Error('tts http ' + r.status);
    if (!r.ok) { console.log(id, r.status, (await r.text()).slice(0, 200)); return false; }
    if (tek) {   // akışlı ham PCM (16 bit, mono, 48 kHz): geldikçe dosyaya yaz
      const hamPcm = path.join(cikti, id + '.pcm'), w = fs.createWriteStream(hamPcm); let bayt = 0;
      for await (const parca of r.body) { w.write(parca); bayt += parca.length; }
      await new Promise(c => w.end(c)); console.log('ham ses:', (bayt / 96000 / 60).toFixed(1), 'dk');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', '48000', '-ac', '1', '-i', hamPcm, ham]); fs.unlinkSync(hamPcm);
    } else fs.writeFileSync(ham, Buffer.from(await r.arrayBuffer()));
    return true;
  }, 'tts ' + id);
  if (!uretildi) continue;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', ham, '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-ar', '44100', norm]);
  const top = sure(norm), sess = sessizlikler(norm);
  const basla = sess[0]?.b < 0.05 ? sess[0].e : 0, bitir = sess.length && top - sess.at(-1).e < 0.05 ? sess.at(-1).b : top;
  // Tüm cümle sonlarının beklenen zamanı (karakter oranı) → sessizliklere monoton eşleme (DP); uzun sessizlik cümle sonu olmaya daha yatkın
  const cumleler = metinler.map(m => m.split(/(?<=[.!?])s+/).filter(Boolean));
  const say = cumleler.flat().map(c => harf(c).length), toplam = say.reduce((a, b) => a + b, 0);
  const sonCumle = []; { let n = 0; for (const c of cumleler) { n += c.length; sonCumle.push(n - 1); } }
  const J = say.length - 1, beklenen = []; { let c = 0; for (let j = 0; j < J; j++) { c += say[j]; beklenen.push(basla + (bitir - basla) * c / toplam); } }
  const aday = sess.filter(x => x.b > basla + 0.2 && x.e < bitir - 0.1).map(x => ({ o: (x.b + x.e) / 2, d: x.e - x.b }));
  const maliyet = (j, k) => Math.abs(aday[k].o - beklenen[j]) - 2 * aday[k].d;
  const dp = Array.from({ length: J }, () => Array(aday.length).fill(Infinity)), geri = Array.from({ length: J }, () => Array(aday.length).fill(-1));
  for (let k = 0; k < aday.length; k++) dp[0][k] = maliyet(0, k);
  for (let j = 1; j < J; j++) { let en = Infinity, ek = -1; for (let k = 0; k < aday.length; k++) { if (k > 0 && dp[j - 1][k - 1] < en) { en = dp[j - 1][k - 1]; ek = k - 1; } if (en < Infinity && dp[j - 1][ek] <= en) { dp[j][k] = en + maliyet(j, k); geri[j][k] = ek; } } }
  const secim = Array(J); { let k = dp[J - 1].indexOf(Math.min(...dp[J - 1])); for (let j = J - 1; j >= 0; j--) { secim[j] = k; k = geri[j][k]; } }
  const kesim = [basla]; for (let i = 0; i < parcalar.length - 1; i++) kesim.push(aday[secim[sonCumle[i]]].o);
  kesim.push(bitir);
  const adSon = i => path.join(cikti, `${parcalar[i].ders}-${String(parcalar[i].sira + 1).padStart(2, '0')}.mp3`);
  const kes = async i => {   // i. parçayı kesim[i]..kesim[i+1] arasından üret, ASR uyumunu döndür
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', norm, '-ss', String(Math.max(0, kesim[i] - (i ? 0.05 : 0.1))), '-to', String(Math.min(top, kesim[i + 1] + 0.1)), '-b:a', '96k', adSon(i)]);
    const d = await asr(adSon(i)); return { u: d == null ? -1 : uyum(metinler[i], d), d };
  };
  const sonuc = []; for (let i = 0; i < parcalar.length; i++) sonuc.push(await kes(i));
  // Düzeltme turu: uyumu düşük parçanın komşu sınırlarını yakın sessizliklere kaydırıp en iyisini seç
  for (let i = 1; i < parcalar.length; i++) {
    if (sonuc[i - 1].u >= 0.75 && sonuc[i].u >= 0.75) continue;
    const eski = kesim[i]; let en = { toplam: sonuc[i - 1].u + sonuc[i].u, t: eski };
    for (const a of aday.filter(x => Math.abs(x.o - eski) < 4 && Math.abs(x.o - eski) > 0.05 && x.o > kesim[i - 1] + 0.5 && x.o < kesim[i + 1] - 0.5)) {
      kesim[i] = a.o; const x = await kes(i - 1), y = await kes(i);
      if (x.u + y.u > en.toplam + 0.01) en = { toplam: x.u + y.u, t: a.o };
    }
    kesim[i] = en.t; sonuc[i - 1] = await kes(i - 1); sonuc[i] = await kes(i);
  }
  for (let i = 0; i < parcalar.length; i++) {
    const { u, d } = sonuc[i];
    console.log(parcalar[i].ders, parcalar[i].sira + 1, u < 0 ? 'asr yok' : u >= 0.75 ? `tamam (uyum ${u.toFixed(2)})` : `KONTROL ET (uyum ${u.toFixed(2)}): "${d.slice(0, 90)}"`);
    if (!parcalar[i].ders.startsWith('_capa')) toplamKar += parcalar[i].ses.length;
  }
  if (capa) fs.unlinkSync(adSon(0));
  fs.unlinkSync(ham); fs.unlinkSync(norm); fs.writeFileSync(bitti, new Date().toISOString());
}
console.log('karakter:', toplamKar);
