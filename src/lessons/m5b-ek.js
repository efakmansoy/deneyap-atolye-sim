// Modül 5 ek dersleri: 5.3 LCD termometre, 5.4 Elektronik zar.
// Sanal saat belirleyicidir: tüm senaryolar sim.bekle ile tek olay kuyruğunda sıralanır.
const SENSOR = 'A1', DUGME = 'D5';

const duz = s => String(s ?? '').toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
const lcdMetin = sim => (sim.cihaz.lcd ?? ['', '']).map(s => String(s ?? ''));
const canli = (sim, cihaz) => sim.cihaz === cihaz && !sim.iptal;
const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });

// ───────────────────────── 5.3 LCD termometre: senaryo ve denetim ─────────────────────────
// Sanal sensör: kaydırıcı 0-50 °C aralığını 0-4095'e eşler  =>  °C = değer * 50 / 4095
const derece = a => a * 50 / 4095;
const ilkSayi = s => { const m = String(s ?? '').match(/-?\d+(?:\.\d+)?/); return m ? m[0] : null; };

// Her değer için 1500 ms bekler, ekranı kaydeder; sonda 200 ms ek bekleme (süre = adet * 1500 + 200)
const sicakSure = adet => adet * 1500 + 200;
const sicakGirdi = degerler => async sim => {
  const cihaz = sim.cihaz;
  cihaz.kayit = [];
  for (const deger of degerler) {
    sim.analog[SENSOR] = deger;
    await sim.bekle(1500);
    if (!canli(sim, cihaz)) return;
    cihaz.kayit.push({ analog: deger, lcd: lcdMetin(sim) });
  }
  await sim.bekle(200);
};
const SICAK_VARSAYILAN = [800, 2000, 3000, 2300, 3900, 1200];   // 9.8, 24.4, 36.6, 28.1, 47.6, 14.7 °C

// Ortak denetim: başlık, değer (dönüşüm doğruluğu) ve uyarı. Seçenekler görev başına değişir.
function termoKontrol(sim, o = {}) {
  const { esik = 30, don = derece, birim = null, tamSayi = false, tol = 1.05, baslik = 'sicaklik', uyari = true } = o;
  const k = sim.cihaz.kayit ?? [];
  if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı. LCD satır yaz bloklarını kullan.');
  if (k.length < 4) return hata('Program çok erken bitti. Okuma ve yazma işlerini sürekli tekrarla içine koy.');
  for (const x of k) {
    const [l0, l1] = x.lcd, bekle = don(x.analog);
    if (baslik && !duz(l0).includes(baslik)) return hata(`1. satırda "${baslik[0].toUpperCase() + baslik.slice(1)}" başlığı görünmeli.`);
    const s = ilkSayi(l1);
    if (s === null) return hata(`Sensör ${x.analog} iken 2. satırda sıcaklık (bir sayı) görünmeli. Şu an: "${l1.trim()}".`);
    if (Math.abs(parseFloat(s) - bekle) > tol) return hata(`Sensör ${x.analog} iken ekranda ${s} yazıyor; beklenen yaklaşık ${bekle.toFixed(1)}. Dönüşüm: sayı * 50 / 4095 (0-4095 aralığı 0-50 °C'ye denk).`);
    if (tamSayi && s.includes('.')) return hata(`Ekranda ondalık sayı var (${s}). Sıcaklık tam sayı olarak görünmeli.`);
    if (birim && !new RegExp(`\\d\\s*${birim}(?![A-Za-z])`).test(l1)) return hata(`Değerin yanında birim (${birim}) görünmeli. Şu an: "${l1.trim()}".`);
    if (uyari) {
      const sicak = duz(l1).includes('sicak');
      if (don(x.analog) > (o.uyariEsigi ?? esik) && !sicak) return hata(`Sensör ${x.analog} iken (eşik ${esik} üstü) 2. satırda SICAK! uyarısı görünmeli.`);
      if (don(x.analog) < (o.uyariEsigi ?? esik) && sicak) return hata(`Sensör ${x.analog} iken henüz eşik aşılmadı, SICAK! uyarısı çıkmamalı.`);
    }
  }
  const dizi = new Set(k.map(x => ilkSayi(x.lcd[1])));
  if (dizi.size < 3) return hata('Ekran sensörü canlı izlemeli: sıcaklık değişince sayı da değişmeli.');
  return tamam('Sıcaklık doğru dereceye çevriliyor ve eşik aşılınca uyarı çıkıyor!');
}

// ───────────────────────── 5.4 Elektronik zar: senaryo ve denetim ─────────────────────────
// Ekranın 2. satırında görülen son tam sayı
const sayiOku = s => { const m = String(s ?? '').match(/\d+/g); return m ? +m[m.length - 1] : null; };
const ZAR_SURE = 10700;
// Düğmeye 6 kez basar (200 ms basılı). Her basıştan sonra 1,3 sn ve 1,6 sn'de ekranı okur.
// Basış anından itibaren 2. satırdaki sayının DEĞİŞİMLERİ (anı ile birlikte) kaydedilir: yuvarlanma animasyonu.
const zarGirdi = (adet = 6) => async sim => {
  const cihaz = sim.cihaz;
  const z = cihaz.zar = [];
  let cur = null;
  const l2 = () => lcdMetin(sim)[1];
  const dinle = () => {
    if (!cur) return;
    const n = sayiOku(l2());
    if (n !== cur.seri[cur.seri.length - 1].n) cur.seri.push({ n, t: sim.t - cur.t0 });
  };
  sim.dinleyiciler.add(dinle);
  try {
    await sim.bekle(400);
    if (!canli(sim, cihaz)) return;
    cihaz.zarBos = sayiOku(l2());
    for (let k = 0; k < adet; k++) {
      cur = { t0: sim.t, seri: [{ n: sayiOku(l2()), t: 0 }] };
      z.push(cur);
      sim.girdi[DUGME] = 1;
      await sim.bekle(200);
      sim.girdi[DUGME] = 0;
      await sim.bekle(1100); cur.a = sayiOku(l2());
      await sim.bekle(300); cur.b = sayiOku(l2()); cur.lcd = lcdMetin(sim);
      cur = null;
      await sim.bekle(k === adet - 1 ? 200 : 100);
      if (!canli(sim, cihaz)) return;
    }
  } finally {
    sim.dinleyiciler.delete(dinle);
    sim.girdi[DUGME] = 0;
  }
};

const zarOn = sim => {
  const z = sim.cihaz.zar ?? [];
  if (!z.length) return hata('Düğmeye basma senaryosu çalışmadı. Programı ▶ ile çalıştır.');
  if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı. LCD satır yaz bloklarını kullan.');
  if (sim.cihaz.zarBos != null) return hata('Düğmeye basmadan ekranın 2. satırında sayı görünüyor. Zar yalnızca düğmeye basılınca atılmalı.');
  return null;
};
// Ortak zar denetimi: aralık, yuvarlanma animasyonu, sabit sonuç, farklı sonuçlar
function zarKontrol(sim, o = {}) {
  const { alt = 1, ust = 6, anim = true, gerekli = null, enAz = 4, sonDegisim = 0, kapsama = true } = o;
  const on = zarOn(sim); if (on) return on;
  const z = sim.cihaz.zar;
  const gorulen = new Set(), finaller = [];
  let kare = 0;
  for (const [i, p] of z.entries()) {
    const s = p.seri.slice(1).filter(x => x.n !== null);
    if (p.b == null) return hata(`${i + 1}. basışta 2. satırda sayı görünmedi. Düğmeye basınca LCD satır 2'ye rastgele sayı yaz.`);
    for (const x of s) {
      if (x.n < alt || x.n > ust) return hata(`Ekranda ${x.n} göründü; sayılar ${alt}-${ust} arasında olmalı. random(${alt}, ${ust + 1}) kullan (üst sınır dahil değildir).`);
      gorulen.add(x.n);
    }
    if (p.b < alt || p.b > ust) return hata(`${i + 1}. atışın sonucu ${p.b}; zar ${alt}-${ust} arasında olmalı.`);
    if (p.a !== p.b) return hata('Sonuç ekranda sabit kalmadı. Yuvarlanma yaklaşık 1 saniyede bitmeli, sonra son sayı ekranda kalmalı.');
    if (anim && s.length < enAz) return hata('Yuvarlanma animasyonu görünmedi. Düğmeye basınca birkaç rastgele sayı hızla art arda görünmeli (döngü içinde yaz ve kısa bekle).');
    if (sonDegisim && Math.max(0, ...s.map(x => x.t)) < sonDegisim) return hata(`Animasyon çok kısa sürdü. Sayılar basıştan en az ${sonDegisim} ms sonrasına kadar değişmeli.`);
    kare += s.length;
    finaller.push(p.b);
  }
  if (new Set(finaller).size < 2) return hata('Her atışta aynı sayı çıktı. Sonucu rastgele sayı üretimiyle bul.');
  if (anim && kapsama && kare >= 40) {
    if (!gorulen.has(alt)) return hata(`${alt} hiç görünmedi. random(${alt}, ${ust + 1}) yazdığından emin ol (ilk sayı dahil).`);
    if (!gorulen.has(ust)) return hata(`${ust} hiç görünmedi. Üst sınır dahil olmadığı için random(${alt}, ${ust + 1}) yazmalısın.`);
  }
  if (gerekli) { const m = gerekli(gorulen); if (m) return hata(m); }
  return tamam('Zar yuvarlanıp rastgele bir sayıda duruyor!');
}

// ───────────────────────── GÖREVLER ─────────────────────────
const gorev53 = [
  {
    tip: 'kod', baslik: 'Ham değeri göster',
    metin: `LCD'nin <b>1. satırına</b> <i>Ham deger</i> yaz. <b>2. satırda</b> sıcaklık sensörünün (<span class="pin-etiket">${SENSOR}</span>) <b>ham sayısını</b> (0-4095) canlı göster. Dereceye çevirmene gerek yok.`,
    ipucu: 'Analog değeri oku bloğunu LCD satır 2 bloğunun yazı yuvasına tak. Hepsi sürekli tekrarla içinde olsun, sonuna kısa bir bekleme koy.',
    sure: sicakSure(4),
    girdi: sicakGirdi([500, 3000, 1500, 4000]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı.');
      if (k.length < 4) return hata('Program çok erken bitti. Sürekli tekrarla kullan.');
      for (const x of k) {
        if (!duz(x.lcd[0]).includes('ham')) return hata('1. satırda "Ham deger" yazmalı.');
        const s = ilkSayi(x.lcd[1]);
        if (s === null) return hata('2. satırda sensörün ham değeri (bir sayı) görünmeli.');
        if (Math.abs(parseFloat(s) - x.analog) > 1) return hata(`Sensör ${x.analog} iken ekranda ${s} yazıyor. Eski haneler kalmış olabilir: sayının arkasına birkaç boşluk yazdır.`);
      }
      return tamam('Ham değer ekranda canlı görünüyor!');
    },
  },
  {
    tip: 'soru', soru: `Sensörden <code>2048</code> okundu (0-4095 aralığı 0-50 °C'ye denk). Sıcaklık yaklaşık kaç derecedir?`,
    secenekler: ['Yaklaşık 12 °C', 'Yaklaşık 25 °C', 'Yaklaşık 41 °C', 'Tam 50 °C'], dogru: 1,
    aciklama: '2048, 0-4095 aralığının tam ortasıdır. 0-50 aralığının ortası da 25 olduğundan sıcaklık yaklaşık 25 °C bulunur (2048 * 50 / 4095 = 25,006).',
  },
  {
    tip: 'kod', baslik: 'Soğuk uyarısı',
    metin: `Ekran sıcaklığı <b>derece</b> olarak göstersin: 1. satırda <i>Sicaklik</i>, 2. satırda değer ve <i>C</i>. Sıcaklık <b>10 °C'nin altına</b> inince 2. satırda ayrıca <b>SOGUK!</b> yazsın; 10 ve üstünde yazmasın.`,
    ipucu: 'Önce sensörü dereceye çevir. Sonra eşiği büyüktür yerine küçüktür ile kontrol et ve SOGUK! yazısını yalnızca bu durumda göster.',
    sure: sicakSure(5),
    girdi: sicakGirdi([3000, 500, 2000, 300, 1200]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı.');
      if (k.length < 5) return hata('Program çok erken bitti. Sürekli tekrarla kullan.');
      for (const x of k) {
        if (!duz(x.lcd[0]).includes('sicaklik')) return hata('1. satırda "Sicaklik" başlığı olmalı.');
        const s = ilkSayi(x.lcd[1]), d = derece(x.analog);
        if (s === null || Math.abs(parseFloat(s) - d) > 1.05) return hata(`Sensör ${x.analog} iken 2. satırda yaklaşık ${d.toFixed(1)} yazmalı; şu an: "${x.lcd[1].trim()}".`);
        const soguk = duz(x.lcd[1]).includes('soguk');
        if (d < 10 && !soguk) return hata(`Sıcaklık ${d.toFixed(1)} °C iken (10 altı) SOGUK! uyarısı çıkmalı.`);
        if (d >= 10 && soguk) return hata(`Sıcaklık ${d.toFixed(1)} °C iken SOGUK! uyarısı çıkmamalı. Eşik 10: küçüktür kullan.`);
      }
      return tamam('Soğuk uyarısı doğru çalışıyor!');
    },
  },
  {
    tip: 'soru', soru: `<code>float sicaklik = ham * 50 / 4095;</code> satırında (<code>ham</code> bir <code>int</code>) <b>50.0</b> yerine <b>50</b> yazılırsa ne olur?`,
    secenekler: ['Hiçbir şey değişmez', 'Kart hata verir', 'Tamsayı bölme yapılır; virgülden sonrası atılır, 25,4 yerine 25 gibi sonuç çıkar', 'Sıcaklık hep 0 çıkar'], dogru: 2,
    aciklama: 'Her sayı tamsayı olunca C++ tamsayı bölmesi yapar ve ondalık kısmı atar. 50.0 yazınca işlem ondalıklı (float) sayılarla yapılır. (Bu satırda ham * 50 önce tamsayı olarak çarpılır, sonra 4095\'e bölünürken ondalık kısım kaybolur.)',
  },
  {
    tip: 'kod', baslik: 'Üç durum',
    metin: `2. satırda sıcaklığın yanında bir durum yazısı olsun: <b>10 °C altı</b> <i>SOGUK</i>, <b>10-30 °C arası</b> <i>NORMAL</i>, <b>30 °C üstü</b> <i>SICAK</i>. 1. satırda yine <i>Sicaklik</i> yazsın.`,
    ipucu: 'Eğer / değilse eğer / değilse zinciri kur: önce 30\'dan büyük mü, sonra 10\'dan küçük mü bak, geri kalanı NORMAL olsun.',
    sure: sicakSure(6),
    girdi: sicakGirdi([500, 2000, 3600, 1500, 300, 3000]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı.');
      if (k.length < 6) return hata('Program çok erken bitti. Sürekli tekrarla kullan.');
      for (const x of k) {
        const d = derece(x.analog), y = duz(x.lcd[1]);
        if (!duz(x.lcd[0]).includes('sicaklik')) return hata('1. satırda "Sicaklik" başlığı olmalı.');
        const durum = d < 10 ? 'soguk' : d > 30 ? 'sicak' : 'normal';
        const var_ = ['soguk', 'normal', 'sicak'].filter(w => y.includes(w));
        if (var_.length !== 1 || var_[0] !== durum) return hata(`Sıcaklık ${d.toFixed(1)} °C iken 2. satırda yalnızca ${durum.toUpperCase()} yazmalı; şu an: "${x.lcd[1].trim()}".`);
      }
      return tamam('Üç durum da doğru: SOGUK, NORMAL, SICAK!');
    },
  },
  {
    tip: 'soru', soru: `Ekranda <code>36.6 C</code> yazıyor. Sıcaklık 9,8'e düşünce program yalnızca <code>9.8 C</code> yazdırırsa (arkaya boşluk koymazsa) LCD'de ne görünür?`,
    secenekler: ['9.8 C', '36.6 C aynen kalır', 'Ekran boşalır', '9.8 CC: eski yazıdan bir C harfi kalır'], dogru: 3,
    aciklama: 'LCD yeni yazıyı eskisinin üstüne yazar, kalan harfleri silmez. "36.6 C" 6 karakterdir, "9.8 C" 5 karakter: son karakter (C) olduğu gibi kalır. Bu yüzden satır sonuna boşluk yazdırırız ya da ekranı temizleriz.',
  },
  {
    tip: 'kod', baslik: 'En yüksek sıcaklık',
    metin: `1. satırda <b>Simdi: </b> ve anlık sıcaklık, 2. satırda <b>Max: </b> ve şimdiye kadar ölçülen <b>en yüksek</b> sıcaklık (°C) görünsün. Max değeri hiç düşmemeli. Bunun için bir <b>değişken</b> tut ve yalnızca daha yüksek değer gelince güncelle.`,
    ipucu: 'Döngünün dışında (üstte) bir değişken tanımla. Döngüde: sıcaklık değişkenden büyükse değişkene ata. Sonra ikisini de ekrana yaz.',
    sure: sicakSure(5),
    girdi: sicakGirdi([1000, 3000, 2000, 3800, 500]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı.');
      if (k.length < 5) return hata('Program çok erken bitti. Sürekli tekrarla kullan.');
      let en = 0;
      for (const x of k) {
        const d = derece(x.analog); en = Math.max(en, d);
        if (!duz(x.lcd[0]).includes('simdi') || !duz(x.lcd[1]).includes('max')) return hata('1. satır "Simdi: ..." ile, 2. satır "Max: ..." ile başlamalı.');
        const a = ilkSayi(x.lcd[0].replace(/simdi/i, '')), b = ilkSayi(x.lcd[1].replace(/max/i, ''));
        if (a === null || Math.abs(parseFloat(a) - d) > 1.05) return hata(`Sensör ${x.analog} iken 1. satırda yaklaşık ${d.toFixed(1)} yazmalı.`);
        if (b === null || Math.abs(parseFloat(b) - en) > 1.05) return hata(`Şimdiye kadarki en yüksek sıcaklık ${en.toFixed(1)} °C; 2. satırda ${b ?? 'sayı yok'} görünüyor. Max yalnızca büyüyebilir.`);
      }
      return tamam('En yüksek sıcaklık hafızada tutuluyor!');
    },
  },
  {
    tip: 'soru', soru: `En yüksek sıcaklığı tutan değişken neden <b>loop()</b> içinde değil de <b>dışında</b> (üstte) tanımlanır?`,
    secenekler: ['Loop içinde değişken tanımlanamaz', 'Loop her turda yeniden başlar; içeride tanımlanan değişken her turda sıfırlanır ve eski rekoru unuturdu', 'Dışarıdaki değişkenler daha hızlıdır', 'Ekran yalnızca global değişkenleri yazabilir'], dogru: 1,
    aciklama: 'loop() her turda baştan çalışır. İçinde tanımlanan değişken her tur yeniden yaratılır ve önceki değerini kaybeder. Rekoru hatırlamak için değişken loop() dışında (global) tanımlanır.',
  },
];

const gorev54 = [
  {
    tip: 'kod', baslik: 'Tek atış',
    metin: `Önce animasyonsuz basit zar yap: <span class="pin-etiket">${DUGME}</span> düğmesine <b>basınca</b> LCD'nin <b>2. satırında 1-6 arası rastgele bir sayı</b> görünsün ve düğmeyi bırakınca ekranda kalsın. Düğmeye basmadan sayı görünmesin.`,
    ipucu: 'Eğer düğmeye basılıysa: LCD satır 2 yaz, rastgele sayı (1 ile 6 arası, ikisi dahil). Basış kısa sürer; sonuna biraz bekleme koy.',
    sure: ZAR_SURE,
    girdi: zarGirdi(),
    kontrol: sim => zarKontrol(sim, { anim: false }),
  },
  {
    tip: 'soru', soru: `Arduino'da <code>random(1, 7)</code> hangi sayıları üretir?`,
    secenekler: ['1, 2, 3, 4, 5, 6, 7', '1, 2, 3, 4, 5, 6', '0, 1, 2, 3, 4, 5, 6', '2, 3, 4, 5, 6, 7'], dogru: 1,
    aciklama: 'random(a, b) alt sınırı (a) dahil eder, üst sınırı (b) dahil etmez. Zar için 1 ile 6 arası istediğimizden üst sınıra 7 yazarız. Rastgele sayı bloğu bu +1 işini senin yerine yapar: kutulara 1 ve 6 yazarsın.',
  },
  {
    tip: 'kod', baslik: 'İki zar',
    metin: `İki zar birden atılsın: düğmeye basınca LCD'nin <b>2. satırında iki sayı</b> görünsün (örneğin <i>3  5</i>). İki zar <b>birbirinden bağımsız</b> olmalı, ikisi de 1-6 arası olmalı.`,
    ipucu: 'İki ayrı rastgele sayı üret (iki değişken ya da iki blok). Aralarına boşluk yazdırarak ekrana ikisini birden yaz.',
    sure: ZAR_SURE,
    girdi: zarGirdi(),
    kontrol(sim) {
      const on = zarOn(sim); if (on) return on;
      const c = sim.cihaz.zar.map(p => (p.lcd?.[1].match(/\d+/g) ?? []).map(Number));
      for (const [i, x] of c.entries()) {
        if (x.length !== 2) return hata(`${i + 1}. atışta 2. satırda ${x.length} sayı var; iki zar için tam iki sayı görünmeli.`);
        if (x.some(n => n < 1 || n > 6)) return hata(`${i + 1}. atışta ekranda ${x.join(' ve ')} var; her zar 1-6 arası olmalı.`);
      }
      if (!c.some(x => x[0] !== x[1])) return hata('İki zar hep aynı geldi. Her zar için ayrı bir rastgele sayı üret.');
      if (new Set(c.map(x => x[0])).size < 2 || new Set(c.map(x => x[1])).size < 2) return hata('Her iki zar da değişmeli. İkisini de rastgele üret.');
      return tamam('İki zar da rastgele atılıyor!');
    },
  },
  {
    tip: 'soru', soru: `Zar atma kodunda düğme için <code>while (digitalRead(D5) == HIGH) { delay(10); }</code> satırı ne işe yarar?`,
    secenekler: ['Düğmeye basılana kadar bekler', 'Düğme bırakılana kadar bekler; böylece basılı tutunca zar tekrar tekrar atılmaz', 'LCD ekranı temizler', 'Zarı daha hızlı yuvarlar'], dogru: 1,
    aciklama: 'Döngü, düğme YÜKSEK (basılı) olduğu sürece döner ve 10 ms bekler. Düğme bırakılınca koşul yanlış olur ve döngüden çıkılır. Böylece tek basış tek atış sayılır.',
  },
  {
    tip: 'kod', baslik: 'Atış sayacı',
    metin: `Animasyonlu zarı hazırla (ya da basit tutabilirsin). <b>1. satırda</b> kaç kez atıldığı yazsın: <i>Atis: 1</i>, <i>Atis: 2</i> ... <b>2. satırda</b> o atışın sonucu (1-6) görünsün. Düğmeye bir kez basmak sayacı yalnızca <b>bir</b> artırmalı.`,
    ipucu: 'Döngünün dışında bir sayaç değişkeni tut. Her basışta sayacı bir artır ve 1. satıra yazdır. Basışın tekrar sayılmaması için biraz bekle.',
    sure: ZAR_SURE,
    girdi: zarGirdi(),
    kontrol(sim) {
      const on = zarOn(sim); if (on) return on;
      const z = sim.cihaz.zar;
      for (const [i, p] of z.entries()) {
        if (!duz(p.lcd[0]).includes('atis')) return hata('1. satır "Atis: ..." ile başlamalı.');
        const n = sayiOku(p.lcd[0]);
        if (n !== i + 1) return hata(`${i + 1}. basıştan sonra 1. satırda ${n ?? 'sayı yok'} yazıyor; ${i + 1} olmalı. Bir basış sayacı yalnızca bir kez artırmalı.`);
        if (p.b == null || p.b < 1 || p.b > 6) return hata(`${i + 1}. atışta 2. satırda 1-6 arası sonuç görünmeli.`);
      }
      if (new Set(z.map(p => p.b)).size < 2) return hata('Her atışta aynı sonuç çıktı. Rastgele sayı kullan.');
      return tamam('Atış sayacı doğru artıyor, sonuç yanında!');
    },
  },
  {
    tip: 'soru', soru: `Adil bir zarda art arda iki kez <b>6</b> gelme olasılığı kaçtır?`,
    secenekler: ['1/6', '1/12', '1/36', '2/6'], dogru: 2,
    aciklama: 'İki atış birbirinden bağımsızdır. Her birinde 6 gelme olasılığı 1/6 olduğundan ikisinin birden olasılığı 1/6 * 1/6 = 1/36 olur.',
  },
  {
    tip: 'kod', baslik: 'En iyi atış',
    metin: `<b>1. satırda</b> şimdiye kadar gelen <b>en yüksek</b> zar yazsın (<i>En iyi: 5</i>), <b>2. satırda</b> son atışın sonucu görünsün. Her basışta yeni bir zar atılır; en iyi değer yalnızca daha yüksek sayı gelince değişir.`,
    ipucu: 'Zarı bir değişkene al. Değişken, saklanan rekordan büyükse rekoru güncelle. Sonra ikisini de ekrana yaz.',
    sure: ZAR_SURE,
    girdi: zarGirdi(),
    kontrol(sim) {
      const on = zarOn(sim); if (on) return on;
      const z = sim.cihaz.zar;
      let en = 0;
      for (const [i, p] of z.entries()) {
        if (p.b == null || p.b < 1 || p.b > 6) return hata(`${i + 1}. atışta 2. satırda 1-6 arası sonuç görünmeli.`);
        en = Math.max(en, p.b);
        if (!duz(p.lcd[0]).includes('en iyi')) return hata('1. satır "En iyi: ..." ile başlamalı.');
        const n = sayiOku(p.lcd[0]);
        if (n !== en) return hata(`${i + 1}. atıştan sonra en iyi sonuç ${en} olmalı ama 1. satırda ${n ?? 'sayı yok'} yazıyor. Rekoru yalnızca daha yüksek sayı gelince güncelle.`);
      }
      if (new Set(z.map(p => p.b)).size < 2) return hata('Her atışta aynı sonuç çıktı. Rastgele sayı kullan.');
      return tamam('En iyi atış hafızada tutuluyor!');
    },
  },
  {
    tip: 'soru', soru: `Zarın <b>hiç 6 göstermemesine</b> (yalnızca 1-5 gelmesine) yol açan hata hangisidir?`,
    secenekler: ['random(1, 7) yazmak', 'random(0, 7) yazmak', 'random(1, 6) yazmak', 'random(6, 1) yazmak'], dogru: 2,
    aciklama: 'random(1, 6) üst sınırı (6) dahil etmez ve yalnızca 1-5 üretir. Zar için üst sınıra 7 yazılır. Rastgele sayı bloğunda ise B kutusuna 6 yazarsın, +1 işi bloğun içindedir.',
  },
];

// ───────────────────────── DERSLER ─────────────────────────
const ders53 = {
  id: 'lcd-termometre',
  ad: '5.3 · LCD termometre',
  modul: 5,
  sure: sicakSure(SICAK_VARSAYILAN.length),
  gorevler: gorev53,
  html: `<h2>LCD termometre</h2>
    <p>Sıcaklık sensörü <b>${SENSOR}</b> pininden 0-4095 arası bir sayı gönderir. Bu sayıyı <b>°C</b> olarak LCD'de göstereceğiz. Sanal sensörün kaydırıcısı 0 °C'yi 0'a, 50 °C'yi 4095'e eşler. Sıcaklık eşiği <b>30 °C</b>.</p>
    <ol>
      <li><b>LCD satır 1 yaz</b> bloğuyla başlığı yaz: <i>Sicaklik</i> (Türkçe karakter kullanma).</li>
      <li><b>sürekli tekrarla</b> içinde <b>harita</b> bloğuyla sayıyı çevir: ${SENSOR} oku, 0-4095 aralığını <b>0-50</b>'ye dönüştür.</li>
      <li><b>LCD satır 2 yaz</b> ile sonucu <b>birleştir</b> bloğunu kullanarak <i> C</i> yazısıyla yan yana göster (sonuna boşluklar bırak).</li>
      <li><b>eğer</b> sıcaklık <b>30'dan büyükse</b> aynı satıra <i> C SICAK!</i>, <b>değilse</b> normal yazıyı yaz.</li>
      <li>Sonuna <b>200 ms bekle</b> koy ve ▶ Çalıştır. Kaydırıcıyı sağa sola çek.</li>
    </ol>
    <h3>Kontrol listesi</h3>
    <ul>
      <li>1. satırda başlık, 2. satırda sıcaklık (°C) görünüyor</li>
      <li>Kaydırıcıyı oynatınca değer canlı değişiyor</li>
      <li>30 °C üstünde 2. satırda SICAK! uyarısı çıkıyor, altında çıkmıyor</li>
    </ul>`,
  adimlar: [
    {
      baslik: 'Devreyi tanı',
      html: `<p>Sahnede bir <b>sıcaklık sensörü</b> (<span class="pin-etiket">${SENSOR}</span>) ve <b>16x2 LCD</b> var. Sensörün altındaki mavi <b>kaydırıcıyı</b> sürükleyerek ortamı ısıtıp soğutabilirsin.</p>
        <div class="kutu bilgi"><b>Dönüşüm:</b> Kartın analog girişi <b>0-4095</b> arası sayı okur. Bu sahnedeki sensör 0 °C'yi <b>0</b>'a, 50 °C'yi <b>4095</b>'e eşler. Yani
          <pre><code>sicaklik = analogRead(${SENSOR}) * 50.0 / 4095.0;</code></pre>
          2048 okunursa sıcaklık yaklaşık 25 °C'dir. (Gerçek sensörlerde dönüşüm formülü, sensörün veri sayfasına göre değişir.)</div>`,
      vurgu: { parca: 0 },
    },
    {
      baslik: 'Başlığı yaz',
      html: `<p><span class="chip ekran">Ekran</span> kategorisinden <span class="chip ekran">LCD satır 1 yaz</span> bloğunu çalışma alanına koy ve yazıyı <span class="chip analog">Sicaklik</span> yap. Bu bloğu <b>sürekli tekrarla'nın dışına</b>, en üste koyacaksın: başlık bir kez yazılır.</p>
        <pre><code>lcd.setCursor(0, 0);
lcd.print("Sicaklik");</code></pre>`,
      vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
      bitti: { blok: 'dy_lcd_yaz', alan: { SATIR: '0' } },
      ipucu: 'Bloktaki satır numarası 1 olmalı (kodda 0 olarak görünür).',
    },
    {
      baslik: 'Sürekli tekrarla',
      html: `<p>Sıcaklık hep değişebilir, bu yüzden ölçüm tekrarlanmalı. <span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al ve başlık bloğunun altına tak.</p>
        <pre><code>while (true) {
  ...
}</code></pre>`,
      vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
      bitti: { blok: 'dy_surekli' },
      ipucu: 'Akış kategorisinin ilk bloğu.',
    },
    {
      baslik: 'Sayıyı dereceye çevir',
      html: `<p><span class="chip ekran">Ekran</span> kategorisinden bir <span class="chip ekran">LCD satır yaz</span> bloğunu döngüye koy ve satırını <b>2</b> yap. Yazı yuvasına <span class="chip degisken">birleştir</span> bloğunu (Metin), onun ilk yuvasına da <span class="chip analog">harita</span> bloğunu (Analog) tak.</p>
        <ul><li>harita: <b>${SENSOR} analog oku</b>, girdi <b>0 - 4095</b>, çıktı <b>0 - 50</b></li>
        <li>birleştir'in ikinci yuvası: <span class="chip analog"> C          </span> (başında bir boşluk, sonunda on boşluk)</li></ul>
        <div class="kutu bilgi">Blokların ürettiği kod:
          <pre><code>lcd.setCursor(0, 1);
lcd.print((String(map(analogRead(${SENSOR}), 0, 4095, 0, 50)) + String(" C          ")));</code></pre>
          <code>map</code> tam sayı verir, yani 36,6 yerine 36 görünür. Ondalık göstermek için kod dersinde <code>float</code> kullanırız. Sondaki boşluklar eski yazıdan kalan harfleri siler: LCD yeni yazıyı eskisinin üstüne yazar, ama silmez.</div>
        <div class="kutu dikkat">Harita bloğundaki pini A0 bırakma! Sıcaklık sensörü ${SENSOR}'e bağlı. Son sayı 255 değil <b>50</b> olmalı.</div>`,
      vurgu: { kategori: 'Analog', blok: 'dy_harita' },
      bitti: [{ blok: 'dy_lcd_yaz', alan: { SATIR: '1' }, icinde: 'dy_surekli' }, { blok: 'dy_degisken_birlestir', icinde: 'dy_surekli' }, { blok: 'dy_harita', icinde: 'dy_surekli' }, { blok: 'dy_analog_oku', alan: { PIN: SENSOR } }],
      ipucu: 'Önce LCD bloğuna birleştir, birleştir bloğuna haritayı tak. Harita bloğunun içindeki analog oku bloğunun pinini A1 yap.',
    },
    {
      baslik: 'Sıcak uyarısı',
      html: `<p><span class="chip akis">eğer</span> bloğunu döngüye koy, dişlisiyle <b>değilse</b> kolunu ekle. Koşul: <span class="chip mantik">karşılaştırma</span> ile <b>sıcaklık &gt; 30</b> (sıcaklığı yine <span class="chip analog">harita</span> bloğuyla hesapla).</p>
        <ul><li><b>Eğer</b> kolunda: LCD satır 2, yazısı <span class="chip analog"> C SICAK!   </span></li>
        <li><b>Değilse</b> kolunda: önceki LCD bloğu (<span class="chip analog"> C          </span>)</li></ul>
        <pre><code>if (map(analogRead(${SENSOR}), 0, 4095, 0, 50) &gt; 30) {
  lcd.setCursor(0, 1);
  lcd.print((String(map(...)) + String(" C SICAK!   ")));
} else {
  lcd.setCursor(0, 1);
  lcd.print((String(map(...)) + String(" C          ")));
}</code></pre>
        <div class="kutu bilgi">Her iki yazının uzunluğu aynı olsun (sondaki boşluklarla): böylece uyarı kalkınca eski <i>SICAK!</i> harfleri ekranda artık kalmaz.</div>`,
      vurgu: { kategori: 'Akış', blok: 'controls_if' },
      bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'logic_compare' }, { blok: 'dy_lcd_yaz', alan: { SATIR: '1' }, adet: 2, icinde: 'dy_surekli' }],
      ipucu: 'Önceki LCD bloğunu değilse koluna sürükle, bir kopyasını (Ctrl+C, Ctrl+V) eğer koluna koy ve yazıyı SICAK! yap.',
    },
    {
      baslik: 'Bekle ve çalıştır',
      html: `<p>Döngünün sonuna <span class="chip akis">200 ms bekle</span> ekle, sonra ▶ <b>Çalıştır</b>'a bas. Kaydırıcıyı sağa çekip <b>30 °C</b>'yi geçince uyarıyı izle!</p>
        <pre><code>delay(200);</code></pre>
        <div class="kutu hedef"><b>Hedef:</b> 1. satırda <i>Sicaklik</i>, 2. satırda sıcaklık °C olarak canlı görünsün; 30 °C üstünde yanında <i>SICAK!</i> çıksın.</div>`,
      vurgu: { parca: 1 },
      bitti: { basari: true },
      ipucu: 'Değer değişmiyorsa tüm okuma-yazma bloklarının sürekli tekrarla içinde olduğunu kontrol et.',
    },
  ],
  sahne: { parcalar: [
    { tur: 'sicaklik', pin: SENSOR, konum: [99.59, 0, 6.19] },
    { tur: 'lcd', kablo: false, konum: [70.38, 0, 23.29] },
  ] },
  girdi: sicakGirdi(SICAK_VARSAYILAN),
  kontrol(sim) {
    const s = termoKontrol(sim);
    return s.ok ? tamam('Termometre hazır: sıcaklık °C olarak görünüyor, 30 °C üstünde uyarı çıkıyor!') : s;
  },
};

const ders54 = {
  id: 'elektronik-zar',
  ad: '5.4 · Elektronik zar',
  modul: 5,
  sure: ZAR_SURE,
  gorevler: gorev54,
  html: `<h2>Elektronik zar</h2>
    <p>Düğmeye bastıkça LCD'de bir zar yuvarlansın: sayılar hızla değişsin, sonunda <b>1 ile 6 arası</b> rastgele bir sayıda dursun. Düğme <b>${DUGME}</b> pinine bağlı.</p>
    <ol>
      <li><b>sürekli tekrarla</b> içinde <b>eğer ${DUGME} düğmesine basılı mı</b> koşulunu kur.</li>
      <li>Eğerin içinde <b>say (1'den 10'a)</b> döngüsü kur: her turda <b>LCD satır 2</b>'ye <b>rastgele sayı (1 ile 6 arası)</b> yaz ve <b>70 ms bekle</b>.</li>
      <li>Döngüden sonra <b>${DUGME} düğmesi bırakılana kadar bekle</b> bloğunu ekle; tek basış tek atış olsun.</li>
      <li>İstersen en başa <b>LCD satır 1</b> ile <i>Zar At</i> başlığını yaz.</li>
      <li>▶ Çalıştır ve düğmeye bas!</li>
    </ol>
    <h3>Kontrol listesi</h3>
    <ul>
      <li>Düğmeye basmadan zar atılmıyor</li>
      <li>Basınca sayılar hızla değişiyor (yuvarlanma)</li>
      <li>Son sayı 1-6 arası ve ekranda sabit kalıyor; her atış farklı olabiliyor</li>
    </ul>`,
  adimlar: [
    {
      baslik: 'Devreyi tanı',
      html: `<p>Sahnede bir <b>düğme</b> (<span class="pin-etiket">${DUGME}</span>) ve <b>16x2 LCD</b> var. Düğmeye basınca pin YÜKSEK okunur. Programımız bu anı yakalayıp zar atacak.</p>
        <div class="kutu bilgi"><b>Rastgelelik:</b> Bilgisayar sayıları aslında hesapla üretir. <code>random()</code> komutu bu hesabı öyle karıştırır ki sonuç tahmin edilemez görünür. ESP32'nin kendi rastgele sayı üretecini kullandığı için ek bir hazırlık (<code>randomSeed</code>) gerekmez.</div>`,
      vurgu: { parca: 0 },
    },
    {
      baslik: 'Düğmeye basılınca',
      html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al, içine <span class="chip akis">eğer</span> bloğunu koy. Koşula <span class="chip dugme">${DUGME} düğmesine basılı mı?</span> bloğunu (Düğme) tak.</p>
        <pre><code>if (digitalRead(${DUGME}) == HIGH) {
  ...
}</code></pre>`,
      vurgu: { kategori: 'Düğme', blok: 'dy_dugme_basili' },
      bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_dugme_basili', alan: { PIN: DUGME } }],
      ipucu: 'Düğme bloğundaki pin listesinden D5 seç. Eğer ve sürekli bloğu Akış kategorisinde.',
    },
    {
      baslik: 'Rastgele sayı bloğu',
      html: `<p><span class="chip sayi">Rastgele</span> kategorisini aç ve <span class="chip sayi">rastgele sayı 1 ile 6 arası (ikisi dahil)</span> bloğunu çalışma alanına çıkar. Varsayılan değerler zar için hazır: <b>1</b> ve <b>6</b>.</p>
        <div class="kutu bilgi">C++'ta karşılığı:
          <pre><code>random(1, 7)</code></pre>
          Arduino'da <code>random(a, b)</code> alt sınırı dahil eder, <b>üst sınırı dahil etmez</b>. 1-6 arası sayı için üst sınıra 7 yazılır. Blokta bu +1'i sen düşünmezsin; kutulara 1 ve 6 yazarsın.</div>`,
      vurgu: { kategori: 'Rastgele', blok: 'dy_rastgele' },
      bitti: { blok: 'dy_rastgele' },
      ipucu: 'Rastgele kategorisinin ilk bloğu. Kutular zaten 1 ve 6.',
    },
    {
      baslik: 'Sayıyı ekrana yaz',
      html: `<p><span class="chip ekran">Ekran</span> kategorisinden <span class="chip ekran">LCD satır yaz</span> bloğunu eğer bloğunun içine koy, satırını <b>2</b> yap. Yazı yuvasına rastgele sayı bloğunu tak.</p>
        <pre><code>lcd.setCursor(0, 1);
lcd.print(random(1, 7));</code></pre>`,
      vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
      bitti: [{ blok: 'dy_lcd_yaz', alan: { SATIR: '1' }, icinde: 'controls_if' }, { blok: 'dy_rastgele', icinde: 'controls_if' }],
      ipucu: 'Rastgele sayı bloğunu LCD bloğunun üstündeki "Merhaba" yazısının üzerine bırakabilirsin.',
    },
    {
      baslik: 'Yuvarlanma animasyonu',
      html: `<p>Tek sayı yetmez; zar <b>yuvarlansın</b>! LCD bloğunu <span class="chip sayi">say: i değeri 1'den 10'a</span> döngüsünün içine al ve döngüye <span class="chip akis">70 ms bekle</span> ekle. Sayı 10 kez, her 70 ms'de bir değişir; son sayı ekranda kalır.</p>
        <pre><code>for (int i = 1; i &lt;= 10; i += 1) {
  lcd.setCursor(0, 1);
  lcd.print(random(1, 7));
  delay(70);
}</code></pre>
        <div class="kutu bilgi">Göz 70 ms'lik değişimleri akıcı bir "titreme" gibi görür. Sayıyı ve süreyi değiştirerek yuvarlanmayı uzatıp kısaltabilirsin.</div>`,
      vurgu: { kategori: 'Rastgele', blok: 'controls_for' },
      bitti: [{ blok: 'controls_for', icinde: 'controls_if' }, { blok: 'dy_rastgele', icinde: 'controls_for' }, { blok: 'dy_bekle', icinde: 'controls_for' }],
      ipucu: 'Döngü bloğu hem Ekran hem Rastgele kategorisinde. LCD ve bekle blokları döngünün içinde olmalı.',
    },
    {
      baslik: 'Düğme bırakılana kadar bekle',
      html: `<p>Düğmeye basılı tutulursa zar durmadan tekrar atılır. <span class="chip dugme">D5 düğmesi bırakılana kadar bekle</span> bloğunu (Düğme) döngüden sonra, <b>eğer bloğunun içine</b> koy ve seçeneği <b>bırakılana</b> yap.</p>
        <pre><code>while (digitalRead(${DUGME}) != LOW) {
  delay(1);
}</code></pre>
        <div class="kutu dikkat">Bu bloğu <b>say</b> döngüsünün içine koyma; döngünün hemen altına, eğer'in içine koy. İstersen en başa <span class="chip ekran">LCD satır 1 yaz</span> ile <i>Zar At</i> başlığı da ekle.</div>`,
      vurgu: { kategori: 'Düğme', blok: 'dy_dugme_bekle' },
      bitti: { blok: 'dy_dugme_bekle', alan: { PIN: DUGME, DURUM: '0' }, icinde: 'controls_if' },
      ipucu: 'Bloktaki pin D5 ve ikinci seçenek "bırakılana" olmalı.',
    },
    {
      baslik: 'Çalıştır ve zar at',
      html: `<p>▶ <b>Çalıştır</b>'a bas. Sonra 3B sahnedeki <b>düğmeye kısa bas</b> ve LCD'yi izle. Birkaç kez at!</p>
        <div class="kutu hedef"><b>Hedef:</b> Her basışta sayılar kısa süre hızla değişsin, sonra 1-6 arası bir sayıda dursun. Farklı atışlarda farklı sayılar gelsin.</div>`,
      vurgu: { parca: 0 },
      bitti: { basari: true },
      ipucu: 'Sayı hiç değişmiyorsa LCD bloğunun say döngüsünün içinde olduğuna ve rastgele sayı bloğunun LCD bloğuna takılı olduğuna bak.',
    },
  ],
  sahne: { parcalar: [
    { tur: 'dugme', pin: DUGME, renk: 'kirmizi', konum: [109.75, 0, 6.19] },
    { tur: 'lcd', kablo: false, konum: [70.38, 0, 23.29] },
  ] },
  girdi: zarGirdi(),
  kontrol(sim) {
    const s = zarKontrol(sim);
    return s.ok ? tamam('Zarın yuvarlanıp rastgele bir sayıda duruyor. Bol şans!') : s;
  },
};

export default [ders53, ders54];

// Yardımcılar, "kodu değiştir" görevleri için icerik/m5c-sesli.js tarafından da kullanılır.
export { termoKontrol, zarKontrol, zarGirdi, sicakGirdi, sicakSure, derece, ZAR_SURE, SICAK_VARSAYILAN };
