// Modül 6: Akıllı Projeler (7 Proje)
// 6.1 cop-kovasi      -> Mesafe (D3) + Servo (D5)
// 6.2 kisi-sayaci     -> Mesafe (D3) + LCD + Buzzer (D8)
// 6.3 yem-verici      -> Düğme (D2) + Servo (D5) + Buzzer (D8)
// 6.4 hirsiz-alarmi   -> LDR (A0) + Buzzer (D8) + LED (D0)
// 6.5 otopark-bariyeri-> Mesafe (D3) + Servo (D5) + LCD
// 6.6 gunes-takipci   -> LDR (A0) + Servo (D5)
// 6.7 gunes-paneli    -> LDR (A0) + LCD + LED (D0)

export const duz = s => String(s ?? '').toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
export const lcdMetin = sim => (sim.cihaz.lcd ?? ['', '']).map(s => String(s ?? ''));
export const canli = (sim, cihaz) => sim.cihaz === cihaz && !sim.iptal;
export const olaylar = (sim, pin, tur) => sim.olaylar.filter(o => o.pin === pin && (!tur || o.tur === tur));
export const sirali = liste => [...liste].sort((a, b) => a.t - b.t);
export const tamam = m => ({ ok: true, mesaj: m });
export const hata = m => ({ ok: false, mesaj: m });

export const mesafeSenaryo = (pin, asamalar) => async sim => {
  sim.cihaz.mesafe ??= {};
  for (const [t, cm] of asamalar) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.cihaz.mesafe[pin] = cm;
    sim.olaylar.push({ t: sim.t, pin, deger: cm, tur: 'mesafe' });
    sim.yay();
  }
};

export const analogSenaryo = (pin, asamalar) => async sim => {
  for (const [t, v] of asamalar) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.analog[pin] = v;
    sim.olaylar.push({ t: sim.t, pin, deger: v, tur: 'analog' });
    sim.yay();
  }
};

export const dugmeSenaryo = (pin, basmalar) => async sim => {
  for (const [t, sure] of basmalar) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.girdi[pin] = 1;
    sim.olaylar.push({ t: sim.t, pin, deger: 1, tur: 'girdi' });
    sim.yay();
    await sim.bekle(sure);
    sim.girdi[pin] = 0;
    sim.olaylar.push({ t: sim.t, pin, deger: 0, tur: 'girdi' });
    sim.yay();
  }
};

// ──────────────────────────────────────────────────────────
// 6.1 Akıllı Çöp Kovası
// ──────────────────────────────────────────────────────────
const G61_MESAFE = [[0, 80], [1000, 15], [3500, 70]];

const gorev61 = [
  {
    tip: 'kod', baslik: 'Daha geniş algılama mesafesi',
    metin: `Çöp kovası şu an 20 cm yaklaşınca açılıyor. Algılama mesafesini <b>35 cm</b> yap: el 30 cm uzaktayken de kapak açılsın.`,
    ipucu: 'Koşuldaki 20 sayısını 35 ile değiştir.',
    girdi: mesafeSenaryo('D3', [[0, 80], [1000, 30], [3500, 80]]),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      if (!acilar.length) return hata('Servo hiç hareket etmedi.');
      const acildi = acilar.some(a => a.t >= 1000 && a.t < 3500 && a.deger >= 80);
      if (!acildi) return hata('El 30 cm mesafedeyken kapak açılmadı. Eşiği 35 cm yaptın mı?');
      return tamam('Kapak artık 35 cm mesafeden algılıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Ultrasonik mesafe sensörünün ölçüm prensibi nedir?',
    secenekler: ['Ses dalgası gönderip yankının dönüş süresini hesaplamak', 'Lazer ışığıyla sıcaklığı ölçmek', 'Manyetik alan değişimini algılamak', 'Ortamdaki havanın nemini ölçmek'],
    dogru: 0, aciklama: 'HC-SR04 ses dalgası gönderir, dalga cisme çarpıp döner. Gidiş-dönüş süresinden mesafe hesaplanır.',
  },
  {
    tip: 'kod', baslik: 'Kapağı daha uzun açık tut',
    metin: `Çöp atmak için 2 saniye az geldi! Kapak açıldıktan sonra <b>4 saniye (4000 ms)</b> açık kalsın, sonra kapansın.`,
    ipucu: 'Kapağı açtıktan sonraki delay(2000) beklemesini delay(4000) yap.',
    girdi: mesafeSenaryo('D3', [[0, 80], [1000, 15], [5500, 80]]),
    sure: 6500,
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      const kapanis = acilar.find(a => a.t > 1500 && a.deger <= 10);
      if (!kapanis) return hata('Kapak hiç kapanmadı.');
      if (kapanis.t < 4800) return hata(`Kapak çok erken kapandı (${Math.round((kapanis.t - 1000) / 1000)} sn sonra). 4000 ms açık kalmalı.`);
      return tamam('Kapak 4 saniye boyunca açık kalıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Servo motorun 0 derece ve 90 derece olması ne anlama gelir?',
    secenekler: ['Motorun dönüş hızını belirler', 'Motor milinin duracağı açısal konumu belirler', 'Motora giden elektrik voltajını belirler', 'Sensörün çalışma süresini belirler'],
    dogru: 1, aciklama: 'Servo motorlar DC motor gibi sonsuz dönmez; 0-180 derece arasında belirtilen açıda sabit durur.',
  },
];

// ──────────────────────────────────────────────────────────
// 6.2 Kişi Sayacı Kapı / Turnike
// ──────────────────────────────────────────────────────────
const G62_MESAFE = [[0, 100], [800, 20], [1400, 90], [2200, 15], [2800, 80], [3600, 10], [4200, 100]];

const gorev62 = [
  {
    tip: 'kod', baslik: 'Bip tonunu kalınlaştır',
    metin: `Kapıdan geçen her kişi için çalan ses şu an 1500 Hz. Sesi daha tok ve kalın bir tona çevir: <b>600 Hz</b> yap.`,
    ipucu: 'tone(D8, 1500) fonksiyonundaki 1500 sayısını 600 yap.',
    girdi: mesafeSenaryo('D3', [[0, 100], [800, 20], [1500, 90]]),
    kontrol(sim) {
      const sesler = olaylar(sim, 'D8', 'ses');
      if (!sesler.length) return hata('Buzzer hiç çalmadı.');
      const ton = sesler.find(s => Math.abs(s.deger - 600) < 50);
      if (!ton) return hata(`Buzzer 600 Hz çalmadı (şu an ${sesler[0]?.deger || 0} Hz).`);
      return tamam('Geçiş sesi 600 Hz oldu!');
    },
  },
  {
    tip: 'soru', soru: 'Turnikeden geçen bir kişinin birden fazla kez sayılmaması için kodda ne kullanılır?',
    secenekler: ['Kişi uzaklaşana kadar (mesafe < 30) bekleyen bir döngü', 'Kartı kapatıp açmak', 'Ses çalmayı durdurmak', 'Ekranı sıfırlamak'],
    dogru: 0, aciklama: 'Kişi sensörün önündeyken sayacın sürekli artmaması için uzaklaşana kadar (mesafe normalleşene kadar) beklenir.',
  },
  {
    tip: 'kod', baslik: 'Kapasite uyarısı (5 kişi)',
    metin: `Oda kapasitesi 2 kişi! Kişi sayısı <b>2 veya daha fazla</b> olduğunda LCD 1. satırda <b>"DOLU!"</b> yazsın. 2'den azken "Kisi Sayisi:" kalsın.`,
    ipucu: 'sayac >= 2 ise lcd.print("DOLU!       ") yazdır.',
    girdi: mesafeSenaryo('D3', G62_MESAFE),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      const l = lcdMetin(sim);
      if (!duz(l[0]).includes('dolu')) return hata('2 kişi geçtikten sonra 1. satırda DOLU! yazmalı.');
      return tamam('Kapasite aşılınca DOLU! uyarısı göründü!');
    },
  },
  {
    tip: 'soru', soru: 'LCD 1602 ekranında ikinci satırın başına gitmek için hangi komut kullanılır?',
    secenekler: ['lcd.setCursor(0, 1);', 'lcd.setCursor(1, 0);', 'lcd.setCursor(2, 1);', 'lcd.setCursor(1, 2);'],
    dogru: 0, aciklama: 'setCursor(sütun, satır) indeksleri 0\'dan başlar: sütun 0 ilk sütun, satır 1 ikinci satırdır.',
  },
];

// ──────────────────────────────────────────────────────────
// 6.3 Akıllı Yem Verici
// ──────────────────────────────────────────────────────────
const gorev63 = [
  {
    tip: 'kod', baslik: 'Daha fazla yem dök',
    metin: `Kapak şu an 90 derece açılıyor. Büyük porsiyon için kapağı <b>150 dereceye</b> kadar aç!`,
    ipucu: 'servo.write(90) komutundaki açıyı 150 yap.',
    girdi: dugmeSenaryo('D2', [[500, 300]]),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      if (!acilar.some(a => a.deger >= 140)) return hata('Servo 150 dereceye açılmadı.');
      return tamam('Yem haznesi 150 derece açıldı, bol mama döküldü!');
    },
  },
  {
    tip: 'soru', soru: 'Yem vericide butona basıldığında ses çalmanın faydası nedir?',
    secenekler: ['Evcil hayvanın mama vaktini sesle öğrenmesini (şartlanmasını) sağlar', 'Servo motorun elektriğini artırır', 'Kartın hafızasını temizler', 'Yemin daha hızlı dökülmesini sağlar'],
    dogru: 0, aciklama: 'Bip sesi hayvan için sesli bir çağrıdır; mama döküldüğünü duyar duymaz kaba gelir.',
  },
  {
    tip: 'kod', baslik: 'Yem dökülme süresi',
    metin: `Yemin yavaş dökülmesi için kapak açıldıktan sonra <b>2 saniye (2000 ms)</b> açık beklesin, sonra kapansın.`,
    ipucu: 'Kapak açıldıktan sonraki bekleme süresini delay(2000) yap.',
    girdi: dugmeSenaryo('D2', [[500, 200]]),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      const acilis = acilar.find(a => a.deger >= 80);
      const kapanis = acilar.find(a => a.t > (acilis?.t ?? 0) && a.deger <= 10);
      if (!kapanis || !acilis) return hata('Servo açılıp kapanmadı.');
      if (kapanis.t - acilis.t < 1800) return hata(`Kapak sadece ${Math.round((kapanis.t - acilis.t) / 1000)} sn açık kaldı. 2000 ms beklemeli.`);
      return tamam('Kapak 2 saniye boyunca açık bekledi!');
    },
  },
  {
    tip: 'soru', soru: 'Düğmeye basılı tutulduğunda mamanın sürekli dökülmesini engellemek için ne yapılır?',
    secenekler: ['Düğme bırakılana kadar bekleyen while döngüsü kullanılır', 'Pili çıkarmak gerekir', 'Buzzer sesini kısmak gerekir', 'Servo açısını 0 yapmak yeterlidir'],
    dogru: 0, aciklama: 'while (digitalRead(D2) == HIGH) delay(20); satırı kullanıcı elini çekene kadar programı bekletir.',
  },
];

// ──────────────────────────────────────────────────────────
// 6.4 Hırsız Alarmı
// ──────────────────────────────────────────────────────────
const G64_ISIK = [[0, 3200], [1000, 600], [2500, 3400]];

const gorev64 = [
  {
    tip: 'kod', baslik: 'Hassas alarm eşiği',
    metin: `Alarm şu an ışık 1500'ün altına inince çalıyor. Daha hassas yap: ışık <b>2200'ün</b> altına indiğinde (hafif bir gölgede bile) alarm devreye girsin.`,
    ipucu: 'if (analogRead(A0) < 1500) koşulundaki 1500 sayısını 2200 yap.',
    girdi: analogSenaryo('A0', [[0, 3000], [1000, 1800], [2500, 3000]]),
    kontrol(sim) {
      const ses = olaylar(sim, 'D8', 'ses').some(s => s.t >= 1000 && s.t < 2500 && s.deger > 0);
      if (!ses) return hata('Işık 1800 iken alarm çalmadı. Eşik 2200 yapıldığında 1800 de alarm vermelidir.');
      return tamam('Hassas alarm devrede: hafif gölgede bile ötüyor!');
    },
  },
  {
    tip: 'soru', soru: 'LDR ışık sensörü karanlıkta analogRead ile nasıl bir değer üretir?',
    secenekler: ['Küçük bir sayı (0\'a yakın)', 'Büyük bir sayı (4095\'e yakın)', 'Her zaman tam 2048', 'Negatif bir sayı'],
    dogru: 0, aciklama: 'Atölyedeki simülasyonda LDR aydınlıkta yüksek değer (4095), karanlıkta/gölgede düşük değer (0) üretir.',
  },
  {
    tip: 'kod', baslik: 'Hızlı siren',
    metin: `Siren tonlarının bekleme sürelerini 150 ms yerine <b>60 ms</b> yap; ambulans gibi çok hızlı çalsın!`,
    ipucu: 'Siren içindeki delay(150) satırlarını delay(60) yap.',
    girdi: analogSenaryo('A0', [[0, 500]]),
    sure: 2000,
    kontrol(sim) {
      const sesler = olaylar(sim, 'D8', 'ses');
      if (sesler.length < 8) return hata('Siren yeterince hızlı çalmadı. Bekleme sürelerini 60 ms yaptın mı?');
      return tamam('Hızlı siren alarmı başarıyla çalışıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Bir LED\'i alarm durumunda yakıp normalde söndürmek için hangi komutlar kullanılır?',
    secenekler: ['digitalWrite(D0, HIGH) ve digitalWrite(D0, LOW)', 'analogRead(D0) ve analogWrite(D0)', 'tone(D0) ve noTone(D0)', 'servo.write(D0) ve delay(D0)'],
    dogru: 0, aciklama: 'Dijital çıkış HIGH olunca LED yanar, LOW olunca söner.',
  },
];

// ──────────────────────────────────────────────────────────
// 6.5 Otopark Bariyeri
// ──────────────────────────────────────────────────────────
const G65_MESAFE = [[0, 120], [1200, 15], [3200, 90]];

const gorev65 = [
  {
    tip: 'kod', baslik: 'Bariyer açılma mesafesini artır',
    metin: `Bariyer araç 25 cm yakına gelince açılıyor. Güvenlik için aracı daha uzaktan, <b>45 cm</b> mesafeden algılayıp aç.`,
    ipucu: 'if (mesafeOlc(D3) < 25) koşulundaki 25 sayısını 45 yap.',
    girdi: mesafeSenaryo('D3', [[0, 100], [1200, 35], [3200, 100]]),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      const acildi = acilar.some(a => a.t >= 1200 && a.t < 3200 && a.deger >= 80);
      if (!acildi) return hata('Araç 35 cm mesafedeyken bariyer açılmadı. Eşiği 45 yaptın mı?');
      return tamam('Bariyer artık 45 cm mesafeden algılayıp erken açılıyor!');
    },
  },
  {
    tip: 'soru', soru: 'LCD ekranda "DUR" yazdıktan sonra sonuna boşluk bırakmanın ("DUR         ") amacı nedir?',
    secenekler: ['Önceki uzun yazıdan ("Geciniz") kalan harfleri silmek', 'Ekranın parlaklığını artırmak', 'Kartın hızını ayarlamak', 'Yazının rengini değiştirmek'],
    dogru: 0, aciklama: 'LCD print önceki karakterlerin üstüne yazar. Boşluk bırakılmazsa "Geciniz" yazısının sonundaki "iz" harfleri ekranda kalır ("DURiniz").',
  },
  {
    tip: 'kod', baslik: 'Hoş geldiniz mesajı',
    metin: `Araç yaklaşınca 2. satırda "Geciniz" yerine <b>"Hos Geldiniz"</b> yazsın. Araç yokken yine <b>"DUR"</b> yazsın.`,
    ipucu: 'lcd.print("Geciniz     ") satırını lcd.print("Hos Geldiniz") yap.',
    girdi: mesafeSenaryo('D3', [[0, 100], [1200, 15]]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      const l = lcdMetin(sim);
      if (!duz(l[1]).includes('hos') && !k.some(x => duz(x[1]).includes('hos'))) return hata('Araç yaklaşınca ekranda "Hos Geldiniz" yazmalı.');
      return tamam('Ekranda Hos Geldiniz mesajı görüntülendi!');
    },
  },
  {
    tip: 'soru', soru: 'Bariyer kapalıyken servo kaç derece, açıkken kaç derece olmalıdır?',
    secenekler: ['Kapalıyken 0 derece, açıkken 90 derece', 'Kapalıyken 180 derece, açıkken 360 derece', 'Kapalıyken 500, açıkken 1000', 'Her zaman 45 derece'],
    dogru: 0, aciklama: 'Bariyer kolu yatayken 0 derece (kapalı), dikey kalktığında 90 derece (açık) olur.',
  },
];

// ──────────────────────────────────────────────────────────
// 6.6 Güneş Takipçi
// ──────────────────────────────────────────────────────────
const G66_ISIK = [[0, 400], [1000, 2048], [2000, 4095], [3000, 1024]];

const gorev66 = [
  {
    tip: 'kod', baslik: 'Hareket açısını sınırla',
    metin: `Servo panel mekanik olarak en fazla 120 dereceye dönebiliyor. Açıyı 0-180 yerine <b>0-120</b> aralığına sınırla.`,
    ipucu: 'map(isik, 0, 4095, 0, 180) satırındaki 180 sayısını 120 yap.',
    girdi: analogSenaryo('A0', [[0, 0], [1000, 4095]]),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      const son = acilar[acilar.length - 1]?.deger;
      if (son == null) return hata('Servo hiç hareket etmedi.');
      if (Math.abs(son - 120) > 10) return hata(`Tam ışıkta servo 120 derece olmalı (şu an ${son} derece).`);
      return tamam('Güneş takipçi açısı 0-120 dereceye sınırlandı!');
    },
  },
  {
    tip: 'soru', soru: 'Arduino/ESP32\'de <code>map(deger, 0, 4095, 0, 180)</code> fonksiyonu ne işe yarar?',
    secenekler: ['0-4095 arasındaki sensör değerini 0-180 arasındaki servo açısına orantılı çevirir', 'Kartın haritasını çıkarır', 'Sensörün GPS konumunu bulur', 'Açıyı 4095 ile çarpar'],
    dogru: 0, aciklama: 'map() matematiksel oran-orantı kurar; giriş aralığındaki sayıyı hedef aralığa dengeli olarak yayar.',
  },
  {
    tip: 'kod', baslik: 'Ters yönlü takip',
    metin: `Mekanizma ters bağlandı! Işık arttıkça servo 180'e değil 0'a doğru dönsün. Yani aralığı <b>180, 0</b> yap.`,
    ipucu: 'map(isik, 0, 4095, 180, 0) şeklinde yaz.',
    girdi: analogSenaryo('A0', [[0, 0], [1000, 4095]]),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      const son = acilar[acilar.length - 1]?.deger;
      if (son == null || son > 15) return hata(`Tam ışıkta servo 0 dereceye inmeli (şu an ${son} derece).`);
      return tamam('Ters yönlü takip başarıyla ayarlandı!');
    },
  },
  {
    tip: 'soru', soru: 'Güneş takip sistemlerinin sabit güneş panellerine göre avantajı nedir?',
    secenekler: ['Güneş ışınlarını dik açıyla alarak gün boyu maksimum elektrik üretir', 'Daha az yer kaplar', 'Gece elektrik üretir', 'Pilsiz çalışır'],
    dogru: 0, aciklama: 'Güneş ışınları panele 90 derece dik vurduğunda üretilen enerji en üst seviyeye çıkar.',
  },
];

// ──────────────────────────────────────────────────────────
// 6.7 Güneş Paneli İstasyonu
// ──────────────────────────────────────────────────────────
const G67_ISIK = [[0, 800], [1200, 3200], [2400, 1500], [3600, 3800]];

const gorev67 = [
  {
    tip: 'kod', baslik: 'Şarj eşiğini 70W yap',
    metin: `Şarj LED'i şu an 50W üzerinde yanıyor. Aküyü korumak için eşiği <b>70 Watt</b> yap: yalnızca 70W ve üstünde yansın.`,
    ipucu: 'if (guc >= 50) koşulundaki 50 sayısını 70 yap.',
    girdi: analogSenaryo('A0', [[0, 2400], [1000, 3200]]), // 2400 -> ~58W, 3200 -> ~78W
    kontrol(sim) {
      const ledler = olaylar(sim, 'D0');
      const yandi = ledler.some(l => l.t >= 1000 && l.deger === 1);
      const once = ledler.find(l => l.t < 1000 && l.deger === 1);
      if (once) return hata('58W güçte LED yanmamalı; eşik 70W olmalı.');
      if (!yandi) return hata('78W güçte LED yanmalı.');
      return tamam('Şarj eşiği 70 Watt olarak güncellendi!');
    },
  },
  {
    tip: 'soru', soru: 'Güneş paneli istasyonunda LCD\'de canlı güç göstermenin önemi nedir?',
    secenekler: ['Paneli temizleme zamanını ve üretilen anlık elektriği izlemeyi sağlar', 'LCD elektrik üretir', 'Güneşin batmasını engeller', 'Sensörün ısınmasını önler'],
    dogru: 0, aciklama: 'Kullanıcı veya teknisyen ekran sayesinde panelin ne kadar güç ürettiğini ve verimini anlık olarak görür.',
  },
  {
    tip: 'kod', baslik: 'Voltaj cinsinden göster',
    metin: `İstasyonda güç yerine voltaj göster: 0-4095 ışık değerini <b>0-12 Volt</b> aralığına çevir ve 2. satırda <b>"Volt: "</b> ile birlikte yazdır.`,
    ipucu: 'map(isik, 0, 4095, 0, 12) kullan ve lcd.print("Volt: ") yaz.',
    girdi: analogSenaryo('A0', [[0, 4095]]),
    kontrol(sim) {
      const l = lcdMetin(sim);
      if (!duz(l[1]).includes('volt')) return hata('2. satırda "Volt: " yazısı görünmeli.');
      if (!l[1].includes('12')) return hata('Tam ışıkta voltaj 12 Volt görünmeli.');
      return tamam('İstasyon artık voltaj değerini başarıyla gösteriyor!');
    },
  },
  {
    tip: 'soru', soru: '<code>lcd.print(" W   ");</code> satırındaki boşlukların işlevi nedir?',
    secenekler: ['Sayı basamağı azaldığında (100 -> 9) ekranda eski karakterlerin kalmasını önler', 'Ekranı kapatır', 'Voltajı dengeler', 'LED\'i yakar'],
    dogru: 0, aciklama: '3 basamaklı bir sayıdan 2 basamağa geçildiğinde en sondaki basamağı boşlukla temizlemek gerekir.',
  },
];

// ──────────────────────────────────────────────────────────
// Modül 6 Ders Listesi (DERSLER export)
// ──────────────────────────────────────────────────────────
export default [
  {
    id: 'cop-kovasi',
    ad: '6.1 · Akıllı çöp kovası',
    sure: 8000,
    gorevler: gorev61,
    html: `<h2>Akıllı çöp kovası</h2>
      <p>Elini yaklaştırdığında kapağı kendi kendine açılan, hijyenik ve akıllı bir çöp kovası yapıyoruz!</p>
      <ol>
        <li>Mesafe sensörü <b>D3</b> pininde, kapağı açıp kapatan servo motor <b>D5</b> pinindedir.</li>
        <li>El <b>20 cm</b>'den yakınsa kapağı <b>90 dereceye</b> aç.</li>
        <li>Çöpü atabilmek için <b>2 saniye (2000 ms)</b> bekle.</li>
        <li>Sonra kapağı kapatmak için servoyu <b>0 dereceye</b> getir.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>Mesafe sensörü (<span class="pin-etiket">D3</span>) yaklaşan elleri ölçer. Servo (<span class="pin-etiket">D5</span>) kapağı kaldırır.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli döngü',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Mesafe koşulu',
        html: `<p>Döngünün içine <span class="chip akis">eğer</span> bloğu koy. Koşuluna <span class="chip mantik">D3 mesafe &lt; 20</span> tak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_mesafe_oku', alan: { PIN: 'D3' } }],
        ipucu: 'Mesafe bloğu Ses ve hareket kategorisindedir.',
      },
      {
        baslik: 'Kapağı aç, bekle ve kapat',
        html: `<p>Eğer koluna <span class="chip ses">D5 servo yaz 90</span>, altına <span class="chip akis">2000 ms bekle</span>, altına <span class="chip ses">D5 servo yaz 0</span> koy.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: { blok: 'dy_servo_yaz', alan: { PIN: 'D5' }, adet: 2, icinde: 'controls_if' },
        ipucu: 'İlk servo 90, bekleme 2000 ms, ikinci servo 0.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Engel sensöre yaklaştığında kapak açılacak ve 2 saniye sonra kapanacak.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Programı çalıştırıp turuncu engeli sensöre yaklaştır.',
      },
    ],
    sahne: { parcalar: [{ tur: 'mesafe', pin: 'D3', konum: [50.06, 0, -3.97] }, { tur: 'servo', pin: 'D5', konum: [105.77, 0, -3.97] }] },
    girdi: mesafeSenaryo('D3', G61_MESAFE),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      if (!acilar.length) return hata('Servo hiç hareket etmedi. D5 servo yaz bloğunu kullandın mı?');
      const acildi = acilar.some(a => a.t >= 1000 && a.t < 3500 && a.deger >= 80);
      const kapandi = acilar.some(a => a.t >= 3000 && a.deger <= 10);
      if (!acildi) return hata('Engel 15 cm yaklaştığında kapak açılmadı. Koşul: mesafe < 20.');
      if (!kapandi) return hata('Kapak açıldıktan sonra geri kapanmadı.');
      return tamam('Harika! Akıllı çöp kovası yaklaşınca açılıyor ve otomatik kapanıyor.');
    },
  },

  {
    id: 'kisi-sayaci',
    ad: '6.2 · Kişi sayacı kapı',
    sure: 9000,
    gorevler: gorev62,
    html: `<h2>Kişi sayacı kapı</h2>
      <p>Kapıdan geçen kişileri ultrasonik sensörle sayıp LCD ekranda gösteren ve bip sesi veren akıllı turnike sistemi!</p>
      <ol>
        <li>Mesafe sensörü <b>D3</b>, LCD ekran I2C, buzzer <b>D8</b> pinindedir.</li>
        <li>Biri kapıdan geçtiğinde (mesafe &lt; 30 cm) kişi sayacını 1 artır.</li>
        <li>Buzzer ile kısa bir bip (1500 Hz, 100 ms) çal.</li>
        <li>LCD 1. satırda <i>Kisi Sayisi:</i>, 2. satırda sayacı göster.</li>
        <li>Kişi uzaklaşana kadar (mesafe &lt; 30 olduğu sürece) döngüde bekle.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>Mesafe sensörü (<span class="pin-etiket">D3</span>), LCD ve Buzzer (<span class="pin-etiket">D8</span>) hazır.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Başlangıç ekranı',
        html: `<p><span class="chip ekran">LCD satır 1 yaz</span> al ve içine <span class="chip analog">Kisi Sayisi:</span> yaz.</p>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: { blok: 'dy_lcd_yaz', alan: { SATIR: '0' } },
        ipucu: 'İlk satır 0 numaralı satırdır.',
      },
      {
        baslik: 'Döngü ve sayaç',
        html: `<p><span class="chip akis">sürekli tekrarla</span> koy. İçinde eğer mesafe &lt; 30 ise sayacı 1 artır.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }],
        ipucu: 'Değişken oluşturup değerini 1 artırabilirsin.',
      },
      {
        baslik: 'Ses ve ekrana yaz',
        html: `<p>Eğer içinde <span class="chip ses">D8 ses çal 1500</span>, <span class="chip akis">100 ms bekle</span>, <span class="chip ses">ses sustur</span> ekle. Ardından LCD satır 2\'ye sayacı yaz.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_cal' },
        bitti: [{ blok: 'dy_ses_cal', alan: { PIN: 'D8' } }, { blok: 'dy_lcd_yaz', alan: { SATIR: '1' } }],
        ipucu: 'Buzzer D8 pininde.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>\'a bas. Kişiler geçtikçe sayacın arttığını ve ekranın güncellendiğini izle.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Kişiler sırayla geçtikçe sayı artacaktır.',
      },
    ],
    sahne: { parcalar: [{ tur: 'mesafe', pin: 'D3', konum: [50.06, 0, -3.97] }, { tur: 'lcd', konum: [100.86, 0, 23.29] }, { tur: 'buzzer', pin: 'D8', konum: [112, 0, -6] }] },
    girdi: async sim => {
      sim.cihaz.kayit = [];
      const kaydet = async () => {
        sim.cihaz.kayit.push(lcdMetin(sim));
      };
      await mesafeSenaryo('D3', G62_MESAFE)(sim);
      await sim.bekle(100);
      await kaydet();
    },
    kontrol(sim) {
      const sesler = olaylar(sim, 'D8', 'ses');
      const l = lcdMetin(sim);
      if (!duz(l[0]).includes('kisi')) return hata('1. satırda "Kisi Sayisi:" başlığı olmalı.');
      if (!sesler.length) return hata('Geçişlerde buzzer çalmadı.');
      if (!l[1].includes('3') && !sim.cihaz.kayit?.some(x => x[1].includes('3'))) return hata('3 kişi geçtikten sonra sayaç 3 olmalı.');
      return tamam('Turnike başarıyla çalışıyor! Geçişler sayıldı ve sesle onaylandı.');
    },
  },

  {
    id: 'yem-verici',
    ad: '6.3 · Akıllı yem verici',
    sure: 8000,
    gorevler: gorev63,
    html: `<h2>Akıllı yem verici</h2>
      <p>Evcil hayvanlar için düğmeye basıldığında sesli çağrı yapan ve mama kapağını açan akıllı besleme makinesi!</p>
      <ol>
        <li>Düğme <b>D2</b>, servo motor <b>D5</b>, buzzer <b>D8</b> pinindedir.</li>
        <li>Düğmeye basıldığında (D2 HIGH):</li>
        <li>Buzzer ile <b>1000 Hz</b> frekansta <b>300 ms</b> mama çağrısı çal.</li>
        <li>Servo kapağı <b>90 dereceye</b> aç.</li>
        <li>Yemin dökülmesi için <b>1 saniye (1000 ms)</b> bekle ve kapağı <b>0 dereceye</b> kapat.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>Düğme (<span class="pin-etiket">D2</span>), Servo (<span class="pin-etiket">D5</span>) ve Buzzer (<span class="pin-etiket">D8</span>) hazır.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli döngü ve düğme kontrolü',
        html: `<p><span class="chip akis">sürekli tekrarla</span> içine <span class="chip akis">eğer D2 dijital oku == 1</span> koy.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_dijital_oku', alan: { PIN: 'D2' } }],
        ipucu: 'Düğme D2 pinindedir.',
      },
      {
        baslik: 'Sesli çağrı çal',
        html: `<p>Eğer koluna <span class="chip ses">D8 ses çal 1000</span>, <span class="chip akis">300 ms bekle</span> ve <span class="chip ses">ses sustur</span> ekle.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_cal' },
        bitti: { blok: 'dy_ses_cal', alan: { PIN: 'D8' }, icinde: 'controls_if' },
        ipucu: 'Buzzer D8 pininde.',
      },
      {
        baslik: 'Kapağı aç ve kapat',
        html: `<p><span class="chip ses">D5 servo yaz 90</span>, <span class="chip akis">1000 ms bekle</span> ve <span class="chip ses">D5 servo yaz 0</span> ekle.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: { blok: 'dy_servo_yaz', alan: { PIN: 'D5' }, adet: 2, icinde: 'controls_if' },
        ipucu: 'Servo D5 pinindedir.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>\'a bas. Düğmeye basıldığında ses çalacak ve kapak açılıp kapanacaktır.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Çalıştırıp düğmeye tıkla.',
      },
    ],
    sahne: { parcalar: [{ tur: 'dugme', pin: 'D2', konum: [42, 0, -4] }, { tur: 'servo', pin: 'D5', konum: [95.61, 0, -3.97] }, { tur: 'buzzer', pin: 'D8', konum: [110, 0, 22] }] },
    girdi: dugmeSenaryo('D2', [[500, 300]]),
    kontrol(sim) {
      const sesler = olaylar(sim, 'D8', 'ses');
      const acilar = olaylar(sim, 'D5', 'servo');
      if (!sesler.length) return hata('Düğmeye basılınca buzzer mama çağrısı çalmadı.');
      if (!acilar.length) return hata('Servo hiç hareket etmedi.');
      const acildi = acilar.some(a => a.deger >= 80);
      const kapandi = acilar.some(a => a.t > 800 && a.deger <= 10);
      if (!acildi) return hata('Kapak 90 dereceye açılmadı.');
      if (!kapandi) return hata('Kapak 1 saniye sonra geri kapanmadı.');
      return tamam('Yem verici harika çalışıyor! Sesli uyarı verdi ve mamayı döktü.');
    },
  },

  {
    id: 'hirsiz-alarmi',
    ad: '6.4 · Hırsız alarmı',
    sure: 9000,
    gorevler: gorev64,
    html: `<h2>Hırsız alarmı</h2>
      <p>Işık demeti veya lazer kesildiğinde devreye giren iki tonlu acil durum sireni ve flaşör LED!</p>
      <ol>
        <li>Işık sensörü <b>A0</b>, buzzer <b>D8</b>, kırmızı LED <b>D0</b> pinindedir.</li>
        <li>Sensörün üstü gölgelendiğinde (ışık &lt; 1500):</li>
        <li>Kırmızı LED\'i yak ve buzzer\'ı <b>1200 Hz</b> çal, <b>150 ms</b> bekle.</li>
        <li>LED\'i söndür ve buzzer\'ı <b>800 Hz</b> çal, <b>150 ms</b> bekle (iki tonlu siren).</li>
        <li>Işık normal ise LED sönsün ve buzzer sussun.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>LDR (<span class="pin-etiket">A0</span>), Kırmızı LED (<span class="pin-etiket">D0</span>) ve Buzzer (<span class="pin-etiket">D8</span>) hazır.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli döngü ve ışık koşulu',
        html: `<p><span class="chip akis">sürekli tekrarla</span> koy. İçine <span class="chip akis">eğer değilse</span> bloğu tak. Koşul: <span class="chip mantik">A0 analog &lt; 1500</span>.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }],
        ipucu: 'Dişliden değilse kolunu ekle.',
      },
      {
        baslik: 'Siren ve flaşör',
        html: `<p>Eğer koluna LED HIGH, ses 1200, 150 ms bekle; ardından LED LOW, ses 800, 150 ms bekle ekle.</p>`,
        vurgu: { kategori: 'Giriş ve Çıkış', blok: 'dy_dijital_yaz' },
        bitti: [{ blok: 'dy_dijital_yaz', alan: { PIN: 'D0' }, icinde: 'controls_if' }, { blok: 'dy_ses_cal', alan: { PIN: 'D8' } }],
        ipucu: 'LED D0 pininde.',
      },
      {
        baslik: 'Değilse durumunda sustur',
        html: `<p>Değilse koluna LED LOW ve ses sustur ekle.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_sustur' },
        bitti: { blok: 'dy_ses_sustur', icinde: 'controls_if' },
        ipucu: 'Ortam aydınlıkken alarm susmalıdır.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>\'a bas. Işık sensörüne gölge düştüğünde alarm çalacaktır.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Güneşi karartarak alarmı test et.',
      },
    ],
    sahne: { parcalar: [{ tur: 'ldr', pin: 'A0', konum: [91.97, 0, 6.19] }, { tur: 'buzzer', pin: 'D8', konum: [55, 0, 15] }, { tur: 'led', pin: 'D0', renk: 'kirmizi', konum: [75, 0, 15] }] },
    girdi: analogSenaryo('A0', G64_ISIK),
    kontrol(sim) {
      const sesler = olaylar(sim, 'D8', 'ses');
      const ledler = olaylar(sim, 'D0');
      const alarmSes = sesler.some(s => s.t >= 1000 && s.t < 2500 && s.deger > 0);
      const alarmLed = ledler.some(l => l.t >= 1000 && l.t < 2500 && l.deger === 1);
      if (!alarmSes) return hata('Işık kesilince buzzer alarmı çalmadı.');
      if (!alarmLed) return hata('Işık kesilince kırmızı LED flaş yapmadı.');
      const sakin = sesler.some(s => s.t >= 2500 && s.deger === 0) || ledler.some(l => l.t >= 2500 && l.deger === 0);
      if (!sakin) return hata('Işık normale dönünce alarm susmadı.');
      return tamam('Hırsız alarmı kusursuz çalışıyor! Işık kesilince siren çalıyor ve LED yanıyor.');
    },
  },

  {
    id: 'otopark-bariyeri',
    ad: '6.5 · Otopark bariyeri',
    sure: 9000,
    gorevler: gorev65,
    html: `<h2>Otopark bariyeri</h2>
      <p>Araç yaklaştığında bariyeri kaldıran ve LCD ekranda yönlendirme mesajı veren akıllı otopark sistemi!</p>
      <ol>
        <li>Mesafe sensörü <b>D3</b>, bariyer servosu <b>D5</b>, LCD ekran I2C bağlıdır.</li>
        <li>Araç yaklaştığında (mesafe &lt; 25 cm):</li>
        <li>Bariyeri aç (servo <b>90 derece</b>) ve LCD 2. satıra <i>Geciniz</i> yaz.</li>
        <li>Araç uzaktayken (mesafe &gt;= 25 cm):</li>
        <li>Bariyeri kapat (servo <b>0 derece</b>) ve LCD 2. satıra <i>DUR</i> yaz.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>Mesafe sensörü (<span class="pin-etiket">D3</span>), Servo bariyer (<span class="pin-etiket">D5</span>) ve LCD hazır.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'LCD başlığı',
        html: `<p>En başa <span class="chip ekran">LCD satır 1 yaz</span> koy ve içine <span class="chip analog">Otopark</span> yaz.</p>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: { blok: 'dy_lcd_yaz', alan: { SATIR: '0' } },
        ipucu: 'İlk satır 0 numaralı satırdır.',
      },
      {
        baslik: 'Mesafe ve bariyer kontrolü',
        html: `<p><span class="chip akis">sürekli tekrarla</span> içinde eğer mesafe &lt; 25 ise servo 90 ve LCD "Geciniz", değilse servo 0 ve LCD "DUR" koy.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_servo_yaz', alan: { PIN: 'D5' }, adet: 2 }],
        ipucu: 'Eğer-değilse bloğunu kullan.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>\'a bas. Araç yaklaşınca bariyer kalkacak ve LCD güncellenecektir.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Engeli yaklaşarak test et.',
      },
    ],
    sahne: { parcalar: [{ tur: 'mesafe', pin: 'D3', konum: [50.06, 0, -3.97] }, { tur: 'servo', pin: 'D5', konum: [105.77, 0, -3.97] }, { tur: 'lcd', konum: [100.86, 0, 25.83] }] },
    girdi: async sim => {
      sim.cihaz.kayit = [];
      await mesafeSenaryo('D3', G65_MESAFE)(sim);
      sim.cihaz.kayit.push(lcdMetin(sim));
    },
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      const l = lcdMetin(sim);
      if (!duz(l[0]).includes('otopark')) return hata('1. satırda "Otopark" başlığı olmalı.');
      if (!acilar.length) return hata('Bariyer servosu hiç hareket etmedi.');
      const acildi = acilar.some(a => a.t >= 1200 && a.t < 3200 && a.deger >= 80);
      const kapandi = acilar.some(a => a.t >= 3200 && a.deger <= 10);
      if (!acildi) return hata('Araç yaklaşınca bariyer açılmadı.');
      if (!kapandi) return hata('Araç uzaklaşınca bariyer kapanmadı.');
      return tamam('Otopark bariyeri başarıyla çalışıyor! Araç gelince açılıyor, gidince kapanıyor.');
    },
  },

  {
    id: 'gunes-takipci',
    ad: '6.6 · Güneş takipçi',
    sure: 9000,
    gorevler: gorev66,
    html: `<h2>Güneş takipçi</h2>
      <p>Güneş panelinin açısını ışığın geldiği yöne doğru otomatik çeviren tek eksenli solar tracker projesi!</p>
      <ol>
        <li>Işık sensörü <b>A0</b>, yön servosu <b>D5</b> pinindedir.</li>
        <li>A0 analog pininden ışık değerini (0-4095) oku.</li>
        <li>Bu değeri <b>harita (map)</b> bloğu ile <b>0-180 derece</b> servo açısına dönüştür.</li>
        <li>Dönüştürülen açıyı D5 servosuna yaz.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>LDR (<span class="pin-etiket">A0</span>) güneşi izler, Servo (<span class="pin-etiket">D5</span>) paneli döndürür.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Harita ile dönüştür ve servo yaz',
        html: `<p>Döngünün içine <span class="chip ses">D5 servo yaz</span> koy. Açısına <span class="chip sayi">harita</span> bloğu tak: A0 analog oku, 0-4095 aralığını 0-180 yap.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: [{ blok: 'dy_servo_yaz', alan: { PIN: 'D5' }, icinde: 'dy_surekli' }, { blok: 'dy_harita' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }],
        ipucu: 'Harita bloğu Sayı kategorisindedir.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>\'a bas. Güneşi hareket ettirdikçe servonun ışığı takip ettiğini gör.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Güneşin konumunu değiştirerek testi tamamla.',
      },
    ],
    sahne: { parcalar: [{ tur: 'ldr', pin: 'A0', konum: [69.11, 0, 6.19] }, { tur: 'servo', pin: 'D5', konum: [77.83, 0, 16.35] }] },
    girdi: analogSenaryo('A0', G66_ISIK),
    kontrol(sim) {
      const acilar = olaylar(sim, 'D5', 'servo');
      if (!acilar.length) return hata('Servo hiç hareket etmedi.');
      const a1 = acilar.find(a => a.t >= 1000 && a.t < 2000)?.deger;
      const a2 = acilar.find(a => a.t >= 2000 && a.t < 3000)?.deger;
      if (a1 == null || a2 == null) return hata('Servo ışık değişimlerini izlemedi.');
      if (Math.abs(a1 - 90) > 15) return hata(`Işık orta seviyedeyken açı ~90 olmalı (şu an ${a1}).`);
      if (Math.abs(a2 - 180) > 15) return hata(`Işık tam parlakken açı ~180 olmalı (şu an ${a2}).`);
      return tamam('Tebrikler! Güneş paneli ışığı hassas şekilde takip ediyor.');
    },
  },

  {
    id: 'gunes-paneli',
    ad: '6.7 · Güneş paneli istasyonu',
    sure: 9000,
    gorevler: gorev67,
    html: `<h2>Güneş paneli istasyonu</h2>
      <p>Güneş panelinin ürettiği elektrik gücünü ölçüp LCD ekranda gösteren ve yeterli güçte şarj LED'ini yakan izleme sistemi!</p>
      <ol>
        <li>Işık sensörü <b>A0</b>, LCD ekran I2C, yeşil LED <b>D0</b> pinindedir.</li>
        <li>A0 ışık değerini (0-4095) oku ve <b>0-100 Watt</b> güce dönüştür.</li>
        <li>LCD 1. satıra <i>Gunes Paneli</i>, 2. satıra <i>Guc: [Watt] W</i> yazdır.</li>
        <li>Güç <b>50 Watt ve üzerindeyse</b> yeşil LED yansın (şarj aktif), altındaysa sönsün.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>LDR (<span class="pin-etiket">A0</span>), LCD ve Yeşil LED (<span class="pin-etiket">D0</span>) hazır.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Başlık yaz',
        html: `<p><span class="chip ekran">LCD satır 1 yaz</span> bloğu ile <span class="chip analog">Gunes Paneli</span> yaz.</p>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: { blok: 'dy_lcd_yaz', alan: { SATIR: '0' } },
        ipucu: 'İlk satır 0 numaradır.',
      },
      {
        baslik: 'Güç hesabı ve ekrana yazma',
        html: `<p><span class="chip akis">sürekli tekrarla</span> içinde ışığı 0-100 aralığına çevirip LCD 2. satıra yaz.</p>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'dy_lcd_yaz', alan: { SATIR: '1' }, icinde: 'dy_surekli' }, { blok: 'dy_harita' }],
        ipucu: 'Harita bloğu Sayı kategorisindedir.',
      },
      {
        baslik: 'Şarj LED koşulu',
        html: `<p>Güç &gt;= 50 ise D0 LED HIGH, değilse D0 LED LOW yap.</p>`,
        vurgu: { kategori: 'Giriş ve Çıkış', blok: 'dy_dijital_yaz' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_dijital_yaz', alan: { PIN: 'D0' }, icinde: 'dy_surekli' }],
        ipucu: 'LED D0 pininde.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>\'a bas. Işığı değiştirerek üretilen gücü ve şarj durumunu gözlemle.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Güneş ışığını artırıp azaltarak test et.',
      },
    ],
    sahne: { parcalar: [{ tur: 'ldr', pin: 'A0', konum: [48.79, 0, 6.19] }, { tur: 'lcd', konum: [85.62, 0, 23.29] }, { tur: 'led', pin: 'D0', renk: 'yesil', konum: [48.79, 0, 18.89] }] },
    girdi: async sim => {
      sim.cihaz.kayit = [];
      await analogSenaryo('A0', G67_ISIK)(sim);
      sim.cihaz.kayit.push(lcdMetin(sim));
    },
    kontrol(sim) {
      const ledler = olaylar(sim, 'D0');
      const l = lcdMetin(sim);
      if (!duz(l[0]).includes('gunes')) return hata('1. satırda "Gunes Paneli" başlığı olmalı.');
      if (!duz(l[1]).includes('guc')) return hata('2. satırda "Guc: " yazısı olmalı.');
      const ledYandi = ledler.some(l => l.t >= 1200 && l.t < 2400 && l.deger === 1);
      const ledSondu = ledler.some(l => l.t >= 2400 && l.t < 3600 && l.deger === 0);
      if (!ledYandi) return hata('Işık yüksekken (güç >= 50W) yeşil şarj LED\'i yanmadı.');
      if (!ledSondu) return hata('Işık azalınca (güç < 50W) yeşil şarj LED\'i sönmedi.');
      return tamam('Güneş paneli istasyonu kusursuz çalışıyor! Güç ekranda ve şarj LED\'i aktif.');
    },
  },
];
