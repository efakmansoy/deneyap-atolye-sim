import './style.css';
import { Blockly, generator, TOOLBOX } from './blocks.js';
import { Sim, DurdurSinyali } from './sim.js';
import { Sahne } from './scene.js';
import { DERSLER } from './lessons/index.js';
import { arduinoKod, renklendir } from './cpp.js';
import { cppDerle } from './cppcalistir.js';
import { Egitmen } from './egitmen.js';
import { Anlatici } from './anlatici.js';
import { tts } from './tts.js';
import { profil, depo as genel, AVATARLAR } from './profil.js';
import { oyun, XP, ROZETLER, konfeti, seviyeHesapla } from './oyun.js';
import { Telefon } from './telefon.js';
import { DIL, dilDegistir, sayfayiCevir } from './i18n.js';

const $ = id => document.getElementById(id);
const hash = new URLSearchParams(location.hash.slice(1));   // #ders=3&sekme=kod&gorunum=kod (paylaşılabilir/test bağlantısı)
const TEST = hash.has('test');
const MODULLER = { 1: 'LED ile başlangıç', 2: 'Düğmeler ve girişler', 3: 'Analog ve PWM', 4: 'Ses ve hareket', 5: 'Ekran ve proje', 6: 'Akıllı projeler', 7: 'Doğa ve güvenlik', 8: 'Robot araba', 9: "ESP32'ye geçiş", 10: 'Wi-Fi ve web' };
const modulNo = d => +(/^(\d+)\./.exec(d.ad)?.[1] ?? 0);
const kisaAd = d => d.ad.replace(/^[\d.]+\s*·\s*/, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const depo = { oku: (k, v) => profil.depo.oku(k, v), yaz: (k, v) => profil.depo.yaz(k, v) };   // aktif profilin verisi
tts.sessiz = TEST || genel.oku('sessiz', false);
oyun.dersleriBildir(DERSLER, modulNo);

const sim = new Sim();
const sahne = new Sahne($('sahne'));
let seriBekliyor = false;
sim.dinleyiciler.add(s => {
  sahne.guncelle(s);
  if (seriBekliyor) return;                                  // satır başına değil, kare başına bir kez çiz
  seriBekliyor = true;
  requestAnimationFrame(() => {
    seriBekliyor = false;
    const son = sim.seriCikti, fazla = son.length - 300;
    $('seri').textContent = (fazla > 0 ? `… (${fazla} satır daha)\n` : '') + son.slice(-300).join('\n');
    $('seri').scrollTop = 1e9;
  });
});

const koyuTema = Blockly.Theme.defineTheme('deneyapKoyu', {
  name: 'deneyapKoyu', base: Blockly.Themes.Classic,
  componentStyles: { workspaceBackgroundColour: '#fbfaff', toolboxBackgroundColour: '#212a5a', toolboxForegroundColour: '#eaf0ff', flyoutBackgroundColour: '#2a2660', flyoutForegroundColour: '#ecebff', flyoutOpacity: 0.96, scrollbarColour: '#8b85d9', insertionMarkerColour: '#6ee7b7', insertionMarkerOpacity: 0.4 },
});
const ws = Blockly.inject($('blokAlan'), { toolbox: TOOLBOX, trashcan: true, grid: { spacing: 24, length: 2, colour: '#d9d6f0', snap: true }, theme: koyuTema });
const yenidenBoyut = () => Blockly.svgResize(ws);
new ResizeObserver(yenidenBoyut).observe($('blokAlan'));

// ── Bildirimler (toast) ve üst çubuk: XP, seviye, seri, profil ──
function toast(html, tur = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + tur; t.innerHTML = html;
  $('toastlar').appendChild(t);
  setTimeout(() => t.classList.add('cikis'), 3600); setTimeout(() => t.remove(), 4100);
}
function ustCiz() {
  const p = profil.aktif(), sv = oyun.seviye(), seri = depo.oku('seri', { gun: 0 });
  $('profilAvatar').textContent = p.avatar; $('profilAd').textContent = p.ad;
  $('seviyeNo').textContent = `${DIL === 'en' ? 'Lv' : 'Sv'} ${sv.seviye}`; $('xpYazi').textContent = `${sv.xp} XP`;
  $('xpDolu').style.width = Math.round(sv.oran * 100) + '%';
  $('seriGun').textContent = `🔥 ${seri.gun ?? 0}`;
  $('xpKutu').title = `Sonraki seviyeye ${Math.max(0, sv.hi - sv.xp)} XP kaldı`;
}
oyun.dinle(o => {
  if (o.tur === 'xp') toast(`<b>+${o.miktar} XP</b> · ${esc(o.neden)}`, 'xp');
  else if (o.tur === 'seviye') { toast(`⬆️ <b>Seviye ${o.seviye}!</b> Harika gidiyorsun`, 'seviye'); konfeti(80); }
  else if (o.tur === 'rozet') toast(`${o.rozet.simge} <b>Yeni rozet: ${esc(o.rozet.ad)}</b><small>${esc(o.rozet.acik)}</small>`, 'rozet');
  else if (o.tur === 'seri') toast(`🔥 <b>${o.gun}. gün üst üste!</b>`, 'seri');
  ustCiz();
});

// ── Öğretmen ve "KOD" sekmesindeki adım şeridi ──
let telefonBekliyor = false;
const telefon = new Telefon({ kok: $('sekmeTelefon'), sim: () => sim, calistir: () => calistir(), durdur: () => { durdur(); $('sonuc').textContent = 'durduruldu'; $('sonuc').className = ''; }, calisiyor: () => $('seriDurum').textContent === 'ÇALIŞIYOR' });
sim.dinleyiciler.add(() => { if (telefonBekliyor) return; telefonBekliyor = true; requestAnimationFrame(() => { telefonBekliyor = false; telefon.durumCiz(); }); });
const egitmen = new Egitmen({ ws, sahne, el: $('anlatim') });
const seritEl = document.createElement('div');
seritEl.id = 'adimSerit';
$('sekmeKod').prepend(seritEl);
egitmen.onDegis = (a, i, n, gecis) => {
  if (!a) { seritEl.hidden = true; return; }
  seritEl.hidden = false;
  const ilkP = new DOMParser().parseFromString(a.html, 'text/html').querySelector('p');
  seritEl.innerHTML = `<b class="serit-baslik">Adım ${i + 1}/${n} · ${a.baslik ?? ''}</b>${ilkP ? `<div>${ilkP.innerHTML}</div>` : ''}<button class="acik-ders">Tam anlatımı aç</button>`;
  seritEl.querySelector('.acik-ders').onclick = () => sekme('ders');
  const blokGerek = a.vurgu?.kategori || a.vurgu?.blok || (a.bitti && JSON.stringify(a.bitti).includes('"blok"'));
  if (gecis && blokGerek && aktifSekme === 'ders') { sekme('kod'); if (kodGorunum && !ders.sadeceKod) gorunum(false); }
};

// ── Sekmeler ──
let aktifSekme = 'ders';
function sekme(ad) {
  aktifSekme = ad;
  document.querySelectorAll('.sekme').forEach(b => b.classList.toggle('aktif', b.dataset.sekme === ad));
  document.querySelectorAll('.evre-btn').forEach(b => b.classList.toggle('aktif', b.dataset.sekme === ad));
  document.querySelectorAll('.icerik').forEach(c => c.classList.toggle('aktif', c.id === 'sekme' + ad[0].toUpperCase() + ad.slice(1)));
  if (ad === 'kod') requestAnimationFrame(yenidenBoyut);
}
document.querySelectorAll('[data-sekme]').forEach(b => b.onclick = () => sekme(b.dataset.sekme));

// ── Blok / Kod (yazıyla kod) ──
// Kod görünümü düzenlenebilir bir C++ editörüdür. "Çalıştır" ekranda ne görünüyorsa onu çalıştırır:
// Bloklar görünümünde blokları, Kod görünümünde yazılı C++'ı (derleyip simülatörde koşturarak).
let kodGorunum = false, elleYazildi = false, kodZaman, yazimSatiri = false, duzenleHedef = null;
function editorBoya() {
  const t = $('kodYaz').value;
  $('kod').innerHTML = renklendir(t) + '\n';
  isaretleriCiz(t);
}
/** Editörün altındaki işaret katmanı: anlatıcının yazdığı satır (sarı zemin) ve "değiştirilecek yerler" (turuncu). */
function isaretleriCiz(t = $('kodYaz').value) {
  const sinif = new Uint8Array(t.length);
  if (yazimSatiri && t.length) { for (let i = t.lastIndexOf('\n', t.length - 2) + 1; i < t.length; i++) sinif[i] |= 1; }
  for (const h of duzenleHedef?.degistir ?? []) {
    for (let i = t.indexOf(h.ara); i >= 0; i = t.indexOf(h.ara, i + 1)) for (let j = i; j < i + h.ara.length; j++) sinif[j] |= 2;
  }
  let html = '';
  for (let i = 0; i < t.length; ) {
    let j = i; while (j < t.length && sinif[j] === sinif[i]) j++;
    const parca = esc(t.slice(i, j));
    html += sinif[i] ? `<span class="${sinif[i] & 2 ? 'dv' : 'sv'}">${parca}</span>` : parca;
    i = j;
  }
  $('kodIsaret').innerHTML = html + '\n';
}
function editorKaydir() {
  for (const id of ['kod', 'kodIsaret']) { $(id).scrollTop = $('kodYaz').scrollTop; $(id).scrollLeft = $('kodYaz').scrollLeft; }
}
function bloklardanUret() {
  try { $('kodYaz').value = arduinoKod(ws); }
  catch (e) { $('kodYaz').value = '// Kod üretilemedi: ' + e.message; console.error(e); }
  elleYazildi = false; $('modEtiket').hidden = true; editorBoya();
}
ws.addChangeListener(e => {
  if (e.isUiEvent || elleYazildi) return;
  clearTimeout(kodZaman); kodZaman = setTimeout(bloklardanUret, 120);
});
$('kodYaz').addEventListener('input', () => {
  elleYazildi = true; $('modEtiket').hidden = false; editorBoya();
});
$('kodYaz').addEventListener('scroll', editorKaydir);
$('kodYaz').addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Tab') {
    e.preventDefault();
    t.setRangeText('  ', t.selectionStart, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input'));
  } else if (e.key === 'Enter' && !e.ctrlKey) {            // girintiyi koru, { sonrası bir seviye içeri
    const a = t.selectionStart, satir = t.value.slice(t.value.lastIndexOf('\n', a - 1) + 1, a);
    const girinti = /^\s*/.exec(satir)[0] + (/\{\s*$/.test(satir) ? '  ' : '');
    e.preventDefault(); t.setRangeText('\n' + girinti, a, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input'));
  } else if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); calistir(); }
});
$('yenidenUret').onclick = () => { duzenleHedef = null; bloklardanUret(); };
const SABLON = 'void setup() {\n  \n}\n\nvoid loop() {\n  \n}\n';
/** sadeceKod dersler: blok sekmesi yok; editör ders.baslangicKod (yoksa boş setup/loop şablonu) ile açılır. */
function baslangicKodu() { return ders.baslangicKod ?? SABLON; }
function baslangicYukle() { $('kodYaz').value = baslangicKodu(); elleYazildi = true; $('modEtiket').hidden = true; editorBoya(); }
function gorunum(kod) {
  kod = kod || !!ders?.sadeceKod;
  kodGorunum = kod;
  $('editor').hidden = !kod; $('blokAlan').style.visibility = kod ? 'hidden' : 'visible';
  $('gKod').classList.toggle('aktif', kod); $('gBlok').classList.toggle('aktif', !kod);
  if (kod) { if (!elleYazildi) bloklardanUret(); if (!anlatici.calisiyor) $('kodYaz').focus(); } else requestAnimationFrame(yenidenBoyut);
}
$('gBlok').onclick = () => gorunum(false);
$('gKod').onclick = () => gorunum(true);
$('kodKopyala').onclick = async () => { try { await navigator.clipboard.writeText($('kodYaz').value); $('kodKopyala').textContent = '✓'; setTimeout(() => $('kodKopyala').textContent = '⧉', 1400); } catch {} };
$('sifirla').onclick = () => { if (ders.sadeceKod) { sim.sifirla(); telefon.sifirla(); $('sonuc').textContent = ''; duzenleHedef = null; baslangicYukle(); return; } ws.clear(); sim.sifirla(); $('sonuc').textContent = ''; elleYazildi = false; duzenleHedef = null; bloklardanUret(); };

// ── Sesli anlatıcı: anlatırken kodu satır satır editöre yazar ──
const anlatici = new Anlatici({
  editorAc() { sekme('kod'); gorunum(true); },
  editorTemizle() { $('kodYaz').value = ''; elleYazildi = true; $('modEtiket').hidden = true; duzenleHedef = null; editorBoya(); },
  editorEkle(s) { $('kodYaz').value += s; elleYazildi = true; editorBoya(); $('kodYaz').scrollTop = 1e9; editorKaydir(); },
  satirVurgu(n) { yazimSatiri = n != null; isaretleriCiz(); },
  parcaVurgu(i) { sahne.vurgu(i); },
  altyazi(metin, i, n) { $('altyazi').textContent = metin; $('sesliIlerleme').style.width = n ? Math.round(100 * (metin ? i + 1 : n) / n) + '%' : '0'; },
  durum: d => sesliBarCiz(d),
  calistir: () => calistir(),
  bitti() {
    if (!oyun.isaretle('anlatimlar', ders.id)) return;
    oyun.say('anlatimSay'); oyun.xpVer(XP.anlatim, 'Sesli anlatımı dinledin'); oyun.seriGuncelle();
    toast('Şimdi sıra sende: <b>Görevler</b> sekmesinde kodu değiştirerek dene', 'bilgi');
  },
});
Object.defineProperty(anlatici, 'calisiyor', { get() { return this.durum === 'caliyor' || this.durum === 'duraklatildi'; } });
function sesliBarCiz(d) {
  $('sesliBar').hidden = d === 'bos';
  const b = $('sOynat');
  b.textContent = { hazir: '🔊 Sesli anlat', bitti: '↻ Tekrar dinle', caliyor: '■ Durdur', duraklatildi: '▶ Devam' }[d] ?? '🔊 Sesli anlat';
  b.dataset.durum = d;
  $('sDuraklat').disabled = d !== 'caliyor' && d !== 'duraklatildi';
  $('sDuraklat').textContent = d === 'duraklatildi' ? '▶' : '⏸';
  $('sAtla').disabled = d !== 'caliyor' && d !== 'duraklatildi';
  $('sesliBar').classList.toggle('caliyor', d === 'caliyor');
}
$('sOynat').onclick = () => {
  const d = anlatici.durum;
  if (d === 'caliyor') anlatici.durdur(); else if (d === 'duraklatildi') anlatici.devam(); else anlatici.oynat();
};
$('sDuraklat').onclick = () => anlatici.durum === 'duraklatildi' ? anlatici.devam() : anlatici.duraklat();
$('sAtla').onclick = () => anlatici.atla();
function sesIkonu() { $('sSes').textContent = tts.sessiz ? '🔇' : '🔊'; $('sSes').title = tts.sessiz ? 'Ses kapalı (altyazı açık)' : 'Sesi kapat'; }
$('sSes').onclick = () => { tts.sessiz = !tts.sessiz; genel.yaz('sessiz', tts.sessiz); sesIkonu(); };
sesIkonu();

// ── Ders listesi (kenar çubuğu) ──
let tamam, gorevTamam;
function ilerlemeYukle() { tamam = new Set(depo.oku('tamam', [])); gorevTamam = new Set(depo.oku('gorevTamam', [])); }
ilerlemeYukle();
function kenarCiz() {
  const grup = {};
  DERSLER.forEach((d, i) => (grup[modulNo(d)] ??= []).push(i));
  $('kenar').innerHTML = Object.entries(grup).map(([m, idx]) => {
    const bitenSay = idx.filter(i => tamam.has(DERSLER[i].id)).length;
    return `<div class="mod-baslik"><span>MODÜL ${m} · ${(MODULLER[m] ?? '').toUpperCase()}</span><em>${bitenSay}/${idx.length}</em></div>` + idx.map(i => {
      const d = DERSLER[i], dk = Math.max(10, Math.round((d.adimlar?.length ?? 4) * 4 / 5) * 5);
      return `<button class="ders-oge ${i === suAn ? 'aktif' : ''} ${tamam.has(d.id) ? 'bitti' : ''}" data-i="${i}"><span class="no">${tamam.has(d.id) ? '✓' : d.ad.match(/^[\d.]+/)?.[0].split('.').pop()}</span><span><b>${kisaAd(d)}</b><small>${dk} dakika${d.sesli ? ' · 🔊' : ''}</small></span></button>`;
    }).join('');
  }).join('');
  $('kenar').querySelectorAll('.ders-oge').forEach(b => b.onclick = () => { dersYukle(+b.dataset.i); if (innerWidth <= 1100) $('uygulama').classList.add('kenar-kapali'); });
  $('ilerlemeYazi').textContent = `${tamam.size}/${DERSLER.length} ders`;
  $('ilerlemeDolu').style.width = (100 * tamam.size / DERSLER.length) + '%';
}

// ── Görevler sekmesi: ana hedef + kod görevleri + "kodu değiştir" görevleri + sorular ──
const gorevAnahtar = k => `${ders.id}:${k}`;
function gorevListesi() {
  const liste = [{ tip: 'ana', baslik: kisaAd(ders), metin: ders.gorev ?? `Bu dersin hedefini programla: <b>${kisaAd(ders)}</b>.`, ipucu: ders.adimlar?.at(-1)?.ipucu }];
  return liste.concat(ders.gorevler ?? []);
}
function gorevOdul(g) {
  if (g.tip === 'soru') { oyun.say('soruDogru'); oyun.xpVer(XP.soru, 'Doğru cevap'); }
  else if (g.tip === 'duzenle') { oyun.say('duzenleSay'); oyun.xpVer(XP.duzenleGorev, 'Kodu düzenledin'); }
  else { oyun.xpVer(XP.kodGorev, 'Kod görevi tamam'); }
  oyun.seriGuncelle(); oyun.rozetKontrol(); ustCiz();
}
function gorevCiz(sonuc) {
  const liste = gorevListesi();
  const bitiMi = (g, k) => gorevTamam.has(gorevAnahtar(k)) || (g.tip === 'ana' && tamam.has(ders.id));
  $('gorevSay').textContent = `${liste.filter(bitiMi).length}/${liste.length}`;
  const turAd = { ana: 'DERS GÖREVİ', kod: 'KOD GÖREVİ', duzenle: 'KODU DEĞİŞTİR', soru: 'SORU' };
  $('gorevler').innerHTML = `<p class="g-giris">Kod görevlerinde programı <b>Bloklar</b> ya da <b>Kod</b> (yazıyla) görünümünde değiştir, sonra <b>Denetle</b>'ye bas. "Kodu değiştir" görevlerinde turuncu işaretli yerleri düzenle. Sorularda bir şık seç.</p>
    <div class="g-ilerleme">${liste.map((g, k) => `<i class="${bitiMi(g, k) ? 'tamam' : ''}"></i>`).join('')}</div>` +
    liste.map((g, k) => {
      const bitti = bitiMi(g, k);
      const ust = `<div class="g-no">${bitti ? '✓' : k + 1}</div><div class="g-ic"><div class="g-tur">${turAd[g.tip] ?? ''}${g.baslik && g.tip !== 'soru' ? ' · ' + g.baslik.toUpperCase() : ''}</div>`;
      if (g.tip === 'soru') {
        return `<div class="g-kart ${bitti ? 'tamam' : ''}" data-k="${k}">${ust}<p>${g.soru}</p>${g.secenekler.map((o, j) => `<button class="g-sec" data-j="${j}">${o}</button>`).join('')}<div class="g-sonuc"></div></div></div>`;
      }
      return `<div class="g-kart kod-gorev ${g.tip === 'duzenle' ? 'duzenle-gorev' : ''} ${bitti ? 'tamam' : ''}" data-k="${k}">${ust}<p>${g.metin}</p>
        ${g.tip === 'duzenle' ? '<button class="g-btn yukle">Kodu editöre yükle</button>' : ''}
        <button class="g-btn denetle ${g.tip === 'duzenle' ? 'ikinci' : ''}">Denetle</button>${g.ipucu ? '<button class="g-btn ikinci ipucu">İpucu</button>' : ''}<button class="g-btn ikinci koda">Koda git</button>
        <div class="g-ipucu" hidden>${g.ipucu ?? ''}</div><div class="g-sonuc ${sonuc?.k === k ? (sonuc.ok ? 'ok' : 'no') : ''}">${sonuc?.k === k ? sonuc.metin : ''}</div></div></div>`;
    }).join('');
  $('gorevler').querySelectorAll('.g-kart').forEach(kart => {
    const k = +kart.dataset.k, g = liste[k], sonucEl = kart.querySelector('.g-sonuc');
    if (g.tip === 'soru') {
      kart.querySelectorAll('.g-sec').forEach(b => b.onclick = () => {
        const dogru = +b.dataset.j === g.dogru;
        b.classList.add(dogru ? 'dogru' : 'yanlis');
        sonucEl.textContent = dogru ? '✔ Doğru! ' + (g.aciklama ?? '') : '✘ Tekrar dene.';
        sonucEl.className = 'g-sonuc ' + (dogru ? 'ok' : 'no');
        if (dogru) {
          kart.querySelectorAll('.g-sec').forEach(x => x.disabled = true);
          if (!gorevTamam.has(gorevAnahtar(k))) { gorevTamam.add(gorevAnahtar(k)); depo.yaz('gorevTamam', [...gorevTamam]); gorevOdul(g); }
          $('gorevSay').textContent = `${liste.filter(bitiMi).length}/${liste.length}`;
        }
      });
      return;
    }
    kart.querySelector('.yukle')?.addEventListener('click', () => {
      anlatici.durdur(); sekme('kod'); gorunum(true);
      duzenleHedef = g; $('kodYaz').value = g.kod; elleYazildi = true; $('modEtiket').hidden = false; editorBoya();
      $('sonuc').textContent = 'Turuncu işaretli yerleri değiştir, sonra Denetle\'ye bas'; $('sonuc').className = '';
    });
    kart.querySelector('.denetle').onclick = async () => {
      if (g.tip === 'duzenle') {
        if (duzenleHedef !== g || !kodGorunum) { sekme('gorev'); return gorevCiz({ k, ok: false, metin: '✘ Önce "Kodu editöre yükle"ye bas, işaretli yerleri değiştir.' }); }
        if ($('kodYaz').value === g.kod) { sekme('kod'); $('sonuc').textContent = '✘ Kodu henüz değiştirmedin: turuncu işaretli yerleri düzenle'; $('sonuc').className = 'no'; return; }
      }
      sekme('kod');
      const s = await calistir(g.tip === 'ana' ? {} : { sure: g.sure, girdi: g.girdi, kontrol: g.kontrol });
      if (!s) return;
      if (s.ok && g.tip !== 'ana' && !gorevTamam.has(gorevAnahtar(k))) { gorevTamam.add(gorevAnahtar(k)); depo.yaz('gorevTamam', [...gorevTamam]); gorevOdul(g); }
      sekme('gorev');
      gorevCiz({ k, ok: s.ok, metin: (s.ok ? '✔ ' : '✘ ') + s.mesaj });
    };
    kart.querySelector('.ipucu')?.addEventListener('click', () => { const e = kart.querySelector('.g-ipucu'); e.hidden = !e.hidden; });
    kart.querySelector('.koda').onclick = () => sekme('kod');
  });
}

// ── Ders yükleme ve çalıştırma ──
let ders, suAn = 0, kosu = 0;
const denemeler = {};
function dersYukle(i) {
  anlatici.durdur(); durdur();
  suAn = i; ders = DERSLER[i]; duzenleHedef = null; yazimSatiri = false;
  $('sonuc').textContent = ''; $('sonuc').className = '';
  $('yolModul').textContent = `Modül ${modulNo(ders)} · ${MODULLER[modulNo(ders)] ?? ''}`;
  $('yolDers').textContent = kisaAd(ders);
  ws.clear(); sim.sifirla(); sahne.kur(ders.sahne, sim);
  const sk = !!ders.sadeceKod;
  $('gBlok').parentElement.style.display = sk ? 'none' : '';        // sadeceKod: Bloklar/Kod anahtarı gizli
  if (sk) { baslangicYukle(); gorunum(true); } else { elleYazildi = false; bloklardanUret(); gorunum(false); }
  $('sekmeTelefonBtn').hidden = !ders.telefon; telefon.sifirla();
  egitmen.yukle(ders); anlatici.yukle(ders); $('altyazi').textContent = '';
  kenarCiz(); gorevCiz(); sekme('ders');
  depo.yaz('ders', i);
}

function durumYaz(t) { $('seriDurum').textContent = t; telefon.durumCiz(); }
function durdur() { sim.iptal = true; kosu++; durumYaz('DURDU'); }

function dersTamamla(yaziliMi) {
  tamam.add(ders.id); depo.yaz('tamam', [...tamam]);
  const ilkDeneme = denemeler[ders.id] === 1;
  oyun.xpVer(XP.ders, `Ders tamamlandı: ${kisaAd(ders)}`);
  if (ilkDeneme) { oyun.say('ilkDenemeSay'); oyun.xpVer(XP.ilkDeneme, 'İlk denemede!'); }
  if (yaziliMi) { oyun.say('yaziliGecti'); oyun.xpVer(XP.yazili, 'Kodu kendin yazdın'); }
  const saat = new Date().getHours(); if (saat >= 22 || saat < 5) oyun.bayrak('geceDers');
  oyun.seriGuncelle(); oyun.rozetKontrol(); konfeti(); ustCiz(); kenarCiz(); gorevCiz();
}

/** Programı çalıştırır. Görünür olan kaynağı (bloklar ya da C++ metni) kullanır. opts: görev için sure/girdi/kontrol. */
async function calistir(opts = {}) {
  durdur();
  const benim = kosu;
  await sim.macro(); await sim.macro();   // eski programın DurdurSinyali ile bitmesini bekle (yarış durumunu önler)
  if (benim !== kosu) return null;
  sim.sifirla(); telefon.sifirla();
  const sure = opts.sure ?? ders.sure, girdi = opts.girdi ?? ders.girdi, kontrol = opts.kontrol ?? ders.kontrol;
  $('sonuc').textContent = 'çalışıyor…'; $('sonuc').className = '';
  let program;
  if (kodGorunum) {
    const d = cppDerle($('kodYaz').value, sim);
    if (d.hata) { $('sonuc').textContent = '✘ Kod hatası — ' + d.hata.mesaj; $('sonuc').className = 'no'; return null; }
    program = d.calistir();
  } else {
    const kod = generator.workspaceToCode(ws);
    try { program = new Function('sim', `return (async () => {\n${kod}\n})();`)(sim); }
    catch (e) { $('sonuc').textContent = 'Hata: ' + e.message; $('sonuc').className = 'no'; return null; }
  }
  if (!opts.kontrol) denemeler[ders.id] = (denemeler[ders.id] ?? 0) + 1;
  durumYaz('ÇALIŞIYOR');
  const bitir = sim.bekle(sure).catch(() => {});   // ders süresi de sanal saatte: programla aynı kuyruktan, kaymadan
  if (girdi) girdi(sim).catch(e => { if (!(e instanceof DurdurSinyali)) console.error(e); });
  try {
    await Promise.race([program.catch(e => { if (!(e instanceof DurdurSinyali)) throw e; }), bitir]);
  } catch (e) {
    $('sonuc').textContent = 'Hata: ' + e.message; $('sonuc').className = 'no'; durumYaz('DURDU'); return null;
  }
  if (benim !== kosu) return null;
  sim.t = Math.max(sim.t, sure);
  sim.iptal = true;
  durumYaz('DURDU');
  const s = kontrol(sim);
  $('sonuc').textContent = (s.ok ? '✔ ' : '✘ ') + s.mesaj;
  $('sonuc').className = s.ok ? 'ok' : 'no';
  if (!opts.kontrol) {
    if (s.ok && !tamam.has(ders.id)) dersTamamla(kodGorunum && elleYazildi && (!ders.sadeceKod || $('kodYaz').value.trim() !== baslangicKodu().trim()));
    egitmen.degisti({ calisti: true, basari: s.ok });
  }
  return s;
}

$('calistir').onclick = () => calistir();
$('durdur').onclick = () => { durdur(); $('sonuc').textContent = 'durduruldu'; $('sonuc').className = ''; };

// ── Profil / hesap penceresi ──
function modalAc(html, sinif = '') {
  $('modalIcerik').className = 'modal-kutu ' + sinif; $('modalIcerik').innerHTML = html;
  $('modal').hidden = false;
  $('modalIcerik').querySelector('.kapat')?.addEventListener('click', modalKapat);
}
function modalKapat() { $('modal').hidden = true; }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) modalKapat(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden) modalKapat(); });
function profilModal() {
  const p = profil.aktif(), sv = oyun.seviye(), d = oyun.durum(), seri = d.seri;
  const rozetHtml = ROZETLER.map(r => `<div class="rozet ${d.rozet[r.id] ? 'kazanildi' : ''}" title="${esc(r.acik)}"><span>${r.simge}</span><b>${esc(r.ad)}</b><small>${esc(r.acik)}</small></div>`).join('');
  const listeHtml = profil.liste().map(x => `<div class="profil-kart ${x.id === p.id ? 'aktif' : ''}" data-id="${x.id}"><span class="av">${x.avatar}</span><b>${esc(x.ad)}</b>${x.id === p.id ? '<em>aktif</em>' : '<button class="sec">Seç</button>'}<button class="sil ikinci" title="Profili sil">🗑</button></div>`).join('');
  modalAc(`<div class="modal-ust"><h2>${p.avatar} ${esc(p.ad)}</h2><button class="kapat ikon">✕</button></div>
    <div class="profil-ozet"><div><b>Seviye ${sv.seviye}</b><div class="xp-cubuk buyuk"><div style="width:${Math.round(sv.oran * 100)}%"></div></div><small>${sv.xp} XP · sonraki seviyeye ${Math.max(0, sv.hi - sv.xp)} XP</small></div>
      <div><b>🔥 ${seri.gun ?? 0} gün</b><small>üst üste çalışma serisi</small></div><div><b>${tamam.size}/${DERSLER.length}</b><small>ders tamamlandı</small></div></div>
    <h3>Rozetler <small>${Object.keys(d.rozet).length}/${ROZETLER.length}</small></h3><div class="rozetler">${rozetHtml}</div>
    <h3>Profiller</h3><div class="profil-liste">${listeHtml}</div>
    <form class="yeni-profil"><input name="ad" maxlength="20" placeholder="Yeni profil adı" aria-label="Yeni profil adı" required>
      <div class="avatar-sec">${AVATARLAR.map((a, i) => `<label><input type="radio" name="avatar" value="${a}" ${i === 0 ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div>
      <button class="birincil">Profil oluştur</button></form>
    <div class="hesap-islem"><button id="pDisa">⬇ Profili dışa aktar</button><label class="dosya">⬆ İçe aktar<input id="pIce" type="file" accept="application/json" hidden></label></div>
    <small class="not">Profiller yalnızca bu cihazda saklanır. Başka cihaza taşımak için dışa aktarıp içe aktarabilirsin.</small>`, 'profil');
  const m = $('modalIcerik');
  m.querySelectorAll('.profil-kart .sec').forEach(b => b.onclick = () => { profil.sec(b.closest('.profil-kart').dataset.id); location.reload(); });
  m.querySelectorAll('.profil-kart .sil').forEach(b => b.onclick = () => {
    const kart = b.closest('.profil-kart');
    if (!confirm(`"${kart.querySelector('b').textContent}" profili ve tüm ilerlemesi silinsin mi?`)) return;
    profil.sil(kart.dataset.id); location.reload();
  });
  m.querySelector('.yeni-profil').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); profil.olustur({ ad: f.get('ad'), avatar: f.get('avatar') }); location.reload(); };
  m.querySelector('#pDisa').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([profil.disaAktar()], { type: 'application/json' }));
    a.download = `deneyap-${p.ad.replace(/\W+/g, '-')}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  m.querySelector('#pIce').onchange = async e => {
    try { profil.iceAktar(await e.target.files[0].text()); location.reload(); } catch (err) { toast('İçe aktarılamadı: ' + esc(err.message), 'hata'); }
  };
}
$('profilBtn').onclick = profilModal;
$('xpKutu').onclick = profilModal;

// ── Üst çubuk, araçlar, panel genişliği ──
$('menu').onclick = () => $('uygulama').classList.toggle('kenar-kapali');
$('tema').onclick = () => {
  const acik = document.documentElement.dataset.tema !== 'acik';
  document.documentElement.dataset.tema = acik ? 'acik' : '';
  genel.yaz('tema', acik ? 'acik' : '');
};
document.documentElement.dataset.tema = genel.oku('tema', '');
// Dil: TR <-> EN (sayfa yeniden yüklenir)
$('dilBtn').textContent = DIL === 'en' ? 'TR' : 'EN';
$('dilBtn').title = DIL === 'en' ? 'Türkçe' : 'English';
$('dilBtn').onclick = () => dilDegistir(DIL === 'en' ? 'tr' : 'en');
sayfayiCevir();
document.querySelectorAll('#arac button').forEach(b => b.onclick = () => ({
  yakin: () => sahne.yakinlas(.8), uzak: () => sahne.yakinlas(1.25),
  sol: () => sahne.don(.4), sag: () => sahne.don(-.4), ev: () => sahne.basla(),
}[b.dataset.a]()));
{
  const ay = $('ayirac');
  ay.onpointerdown = e => {
    ay.setPointerCapture(e.pointerId); ay.classList.add('surukle');
    ay.onpointermove = m => { const w = Math.min(innerWidth * .75, Math.max(380, innerWidth - m.clientX - 3)); $('panel').style.setProperty('--panel-w', w + 'px'); };
    ay.onpointerup = () => { ay.classList.remove('surukle'); ay.onpointermove = ay.onpointerup = null; yenidenBoyut(); };
  };
}
if (innerWidth < 1100) $('uygulama').classList.add('kenar-kapali');
$('orta').addEventListener('pointerdown', () => { if (innerWidth <= 1100) $('uygulama').classList.add('kenar-kapali'); });

const ilk = Math.min(+(hash.get('ders') ?? depo.oku('ders', 0)) || 0, DERSLER.length - 1);
ustCiz();
dersYukle(ilk);
if (hash.get('sekme')) sekme(hash.get('sekme'));
if (hash.get('gorunum') === 'kod') gorunum(true);
if (hash.get('kodmetni')) {                                 // test kancası: #kodmetni=<url-kodlu C++>&calistir=1
  gorunum(true); $('kodYaz').value = hash.get('kodmetni'); elleYazildi = true; $('modEtiket').hidden = false; editorBoya();
  if (hash.get('calistir')) setTimeout(() => calistir(), 400);
}
if (hash.get('arena')) {                                    // test kancası: #arena=duz|engelli|cizgi&surus=ileri|sol
  sim.sifirla(); sahne.kur({ arena: hash.get('arena'), parcalar: [{ tur: 'araba' }] }, sim);
  const sr = hash.get('surus');
  if (sr) { sim.yaz('D0', sr === 'sol' ? 0 : 1); sim.yaz('D2', 1); sim.bekle(6000).catch(() => {}); }
}
if (hash.get('demo')) {                                     // test kancası: #demo=esp32  (src/lessons/_demo-esp32.js; kayıtlı ders değildir)
  import('./lessons/_demo-esp32.js').then(m => { DERSLER.push(...m.default); dersYukle(DERSLER.length - m.default.length + (+hash.get('demo') || 0)); if (hash.get('sekme')) sekme(hash.get('sekme')); if (hash.get('calistir')) setTimeout(() => calistir(), 400); });
}
if (hash.get('bakis') === 'ust') sahne.ust();
if (hash.get('isaret')) sahne.pinIsaretle();
if (TEST) window.__atolye = { telefon, ws, sim, sahne, egitmen, anlatici, tts, oyun, profil, depo, DERSLER, Blockly, dersYukle, calistir, gorunum, sekme, profilModal };   // E2E test kancası
setTimeout(() => $('sahneIpucu').style.opacity = '.0', 9000);
