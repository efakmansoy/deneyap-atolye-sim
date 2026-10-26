// Modül 7: Doğa ve güvenlik (5 proje)
// 7.1 saksi-sulama    -> Toprak nem sensörü (A0) + Su pompası (D6)
// 7.2 pir-lamba       -> PIR hareket sensörü (D5) + Lamba/LED (D0)
// 7.3 hava-istasyonu  -> Sıcaklık (A1) + LDR (A0) + LCD + Seri monitör
// 7.4 gaz-alarmi      -> MQ-2 gaz sensörü (A0) + Buzzer (D8) + LED (D0)
// 7.5 sifreli-kasa    -> 12 tuşlu analog tuş takımı (A0) + Servo kilit (D5) + LCD + LED (D0)
// Şema için m4b-ek.js / m6-projeler.js'ye bak. Bu dosya m*.js glob'u ile otomatik yüklenir.
// Girdi senaryoları sanal saatte (sim.bekle) çalışır; değişimler sim.olaylar'a yazılır, kontroller sanal zamana bakar.

export const duz = s => String(s ?? '').toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
export const lcdMetin = sim => (sim.cihaz.lcd ?? ['', '']).map(s => String(s ?? ''));
export const olaylar = (sim, pin, tur) => sim.olaylar.filter(o => o.pin === pin && (!tur || o.tur === tur));
/** Dijital/PWM çıkış olayları (senaryonun yazdığı girdi olayları hariç) */
export const cikis = (sim, pin) => sim.olaylar.filter(o => o.pin === pin && !o.tur);
/** t anındaki değer: t'ye kadarki son olay; olay yoksa `ilk` */
export const durumda = (liste, t, ilk = 0) => { let d = ilk; for (const o of liste) { if (o.t <= t) d = o.deger; else break; } return d; };
export const tamam = m => ({ ok: true, mesaj: m });
export const hata = m => ({ ok: false, mesaj: m });
export const sayilar = s => (String(s ?? '').match(/\d+/g) ?? []).map(Number);

/** Tek analog pini sırayla değiştirir: asamalar = [[sanal ms, değer], ...] */
export const analogSenaryo = (pin, asamalar) => async sim => {
  for (const [t, v] of asamalar) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.analog[pin] = v;
    sim.olaylar.push({ t: sim.t, pin, deger: v, tur: 'analog' });
    sim.yay();
  }
};
/** Dijital girdiye (PIR, düğme) darbe verir: darbeler = [[başlangıç ms, süre ms], ...] */
export const darbeSenaryo = (pin, darbeler) => async sim => {
  for (const [t, sure] of darbeler) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.girdi[pin] = 1; sim.olaylar.push({ t: sim.t, pin, deger: 1, tur: 'girdi' }); sim.yay();
    await sim.bekle(sure);
    sim.girdi[pin] = 0; sim.olaylar.push({ t: sim.t, pin, deger: 0, tur: 'girdi' }); sim.yay();
  }
};
/** Birden çok analog pini tek zaman çizelgesinde değiştirir; `anlik` anlarında LCD ve seri çıktının fotoğrafını sim.cihaz.kayit'a koyar.
 *  asamalar = [[ms, { A0: 100, A1: 200 }], ...], anlik = [ms, ...] */
export const cokluSenaryo = (asamalar, anlik = []) => async sim => {
  sim.cihaz.kayit = [];
  const liste = [...asamalar.map(([t, d]) => ({ t, d })), ...anlik.map(t => ({ t, anlik: true }))]
    .sort((a, b) => a.t - b.t || (a.anlik ? 1 : 0) - (b.anlik ? 1 : 0));
  for (const o of liste) {
    if (o.t > sim.t) await sim.bekle(o.t - sim.t);
    if (o.anlik) sim.cihaz.kayit.push({ t: o.t, lcd: lcdMetin(sim), seri: [...sim.seriCikti] });
    else for (const [pin, v] of Object.entries(o.d)) { sim.analog[pin] = v; sim.olaylar.push({ t: sim.t, pin, deger: v, tur: 'analog' }); }
    sim.yay();
  }
};

// ──────────────────────────────────────────────────────────
// 7.1 Saksı sulama (nem A0, pompa D6)
// ──────────────────────────────────────────────────────────
export const G71 = [[0, 3000], [1500, 700], [4500, 3000]];          // ıslak -> kuru -> sulandı
const pompa = sim => cikis(sim, 'D6');

const gorev71 = [
  {
    tip: 'kod', baslik: 'Daha hassas sulama',
    metin: `Saksı şu an toprak nemi 1500'ün altına inince sulanıyor. Çiçek biraz daha çabuk susasın: nem <b>2000'in altına</b> inince pompa çalışsın.`,
    ipucu: 'if koşulundaki 1500 sayısını 2000 yap. Nem 1800 iken pompa çalışmalı, 3000 iken çalışmamalı.',
    girdi: analogSenaryo('A0', [[0, 3000], [1000, 1800], [3000, 3000]]), sure: 4500,
    kontrol(sim) {
      const p = pompa(sim);
      if (durumda(p, 500) !== 0) return hata('Toprak ıslakken (3000) pompa çalışmamalı.');
      if (durumda(p, 2000) !== 1) return hata('Nem 1800 iken pompa çalışmadı. Eşik 2000 olunca 1800 kuru sayılır.');
      if (durumda(p, 3800) !== 0) return hata('Toprak tekrar ıslanınca (3000) pompa durmadı.');
      return tamam('Saksı artık 2000 eşiğine göre daha hassas sulanıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Bu derste kullandığımız toprak nem sensörü ıslak toprakta nasıl bir sayı verir?',
    secenekler: ['Küçük bir sayı (sıfıra yakın)', 'Büyük bir sayı (4095\'e yakın)', 'Her zaman tam 2048', 'Hiçbir sayı vermez'],
    dogru: 1, aciklama: 'Toprak ne kadar ıslaksa elektrik o kadar iyi iletilir ve sensör o kadar büyük sayı verir. Kuru toprakta sayı küçüktür, bu yüzden "nem < eşik" olunca sularız.',
  },
  {
    tip: 'kod', baslik: 'Darbeli sulama',
    metin: `Pompa sürekli çalışırsa saksı su basar. Toprak kuruyken pompa <b>2 saniye (2000 ms)</b> çalışsın, sonra <b>3 saniye (3000 ms)</b> dinlensin; toprak hâlâ kuruysa bu döngü tekrarlansın.`,
    ipucu: 'Kuru dalında: pompayı HIGH yap, delay(2000), pompayı LOW yap, delay(3000).',
    girdi: analogSenaryo('A0', [[0, 600]]), sure: 7200,
    kontrol(sim) {
      const p = pompa(sim);
      const ac1 = p.find(o => o.deger === 1);
      if (!ac1) return hata('Toprak kuruyken pompa hiç çalışmadı.');
      const kapa1 = p.find(o => o.t > ac1.t && o.deger === 0);
      if (!kapa1) return hata('Pompa hiç durmadı. Sulamadan sonra pompayı LOW yapıp dinlendirmelisin.');
      const sure = kapa1.t - ac1.t;
      if (sure < 1800 || sure > 2400) return hata(`Pompa ${Math.round(sure)} ms çalıştı; 2000 ms çalışmalı.`);
      const ac2 = p.find(o => o.t > kapa1.t && o.deger === 1);
      if (!ac2) return hata('Dinlenmeden sonra toprak hâlâ kuruysa pompa tekrar çalışmalı.');
      const ara = ac2.t - kapa1.t;
      if (ara < 2700 || ara > 3400) return hata(`Pompa ${Math.round(ara)} ms dinlendi; 3000 ms dinlenmeli.`);
      return tamam('Pompa 2 sn çalışıp 3 sn dinleniyor: saksı su basmıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Su pompasını doğrudan kartın pinine bağlamak yerine neden röle ya da transistörlü bir modül kullanılır?',
    secenekler: ['Röle pompayı daha sessiz çalıştırır', 'Pinler suyla temas edince bozulur', 'Pompa kartın bir pininin verebileceğinden çok daha fazla akım çeker', 'Modül olmadan nem sensörü çalışmaz'],
    dogru: 2, aciklama: 'Kartın bir pini yalnızca birkaç on miliamper verebilir. Pompa ise yüzlerce miliamper çeker; röle/transistör küçük pin sinyaliyle büyük akımı açıp kapatır.',
  },
  {
    tip: 'kod', baslik: 'Nem yüzdesini seri monitöre yaz',
    metin: `Bahçıvanlar "nem yüzde kaç?" diye sorar. Nem değerini <b>0-100 yüzde</b> aralığına çevir (<code>map</code>) ve her turda seri monitöre <code>Serial.println</code> ile yazdır. (Önce <code>Serial.begin(115200);</code> unutma.)`,
    ipucu: 'int yuzde = map(nem, 0, 4095, 0, 100); Serial.println(yuzde); Tam ıslakta 100, yarı nemde 50 yazmalı.',
    girdi: analogSenaryo('A0', [[0, 4095], [1200, 2048], [2500, 1024]]), sure: 3500,
    kontrol(sim) {
      const satirlar = sim.seriCikti.map(sayilar).filter(a => a.length);
      if (!sim.seriCikti.length) return hata('Seri monitöre hiçbir şey yazılmadı. Serial.println kullandın mı?');
      const dizi = satirlar.map(a => a[0]);
      if (dizi.some(v => v > 100)) return hata('Yüzde 100\'ü geçmemeli; ham sensör sayısını map ile 0-100 aralığına çevir.');
      const i100 = dizi.indexOf(100), i50 = dizi.indexOf(50), i25 = dizi.indexOf(25);
      if (i100 < 0) return hata('Tam ıslak toprakta (4095) 100 yazmalı.');
      if (i50 < i100) return hata('Nem yarıya düşünce (2048) 50 yazmalı.');
      if (i25 < i50) return hata('Nem çeyreğe düşünce (1024) 25 yazmalı.');
      return tamam('Nem yüzdesi seri monitörde: 100 → 50 → 25!');
    },
  },
  {
    tip: 'soru', soru: 'Eşik değerini 1500 yerine 4000 yaparsak ne olur?',
    secenekler: ['Toprak neredeyse her zaman "kuru" sayılır ve pompa neredeyse sürekli çalışır', 'Pompa hiç çalışmaz', 'Sensör bozulur', 'Kart yeniden başlar'],
    dogru: 0, aciklama: 'Nem sayısı en fazla 4095 olabilir. Eşik çok yüksekse neredeyse her ölçüm eşiğin altında kalır; toprak ıslak olsa bile pompa çalışır ve saksı su basar.',
  },
];

// ──────────────────────────────────────────────────────────
// 7.2 PIR lamba (PIR D5, lamba D0)
// ──────────────────────────────────────────────────────────
export const G72 = [[600, 300], [4500, 300]];                       // iki ayrı hareket
const lamba = sim => cikis(sim, 'D0');

const gorev72 = [
  {
    tip: 'kod', baslik: 'Lamba 5 saniye yansın',
    metin: `Koridorda yürümek 2 saniyeden uzun sürüyor! Hareket algılanınca lamba <b>5 saniye (5000 ms)</b> yansın, sonra sönsün.`,
    ipucu: 'Lambayı yaktıktan sonraki delay(2000) bekleme süresini delay(5000) yap.',
    girdi: darbeSenaryo('D5', [[600, 300]]), sure: 7500,
    kontrol(sim) {
      const l = lamba(sim);
      if (durumda(l, 400) !== 0) return hata('Hareket yokken lamba sönük olmalı.');
      if (durumda(l, 1500) <= 0) return hata('Hareket algılanınca lamba yanmadı.');
      if (durumda(l, 4500) <= 0) return hata('Lamba çok erken söndü; hareketten sonra 5 saniye yanık kalmalı.');
      if (durumda(l, 6900) !== 0) return hata('Lamba 5 saniye sonra sönmedi.');
      return tamam('Lamba hareketten sonra tam 5 saniye yanıyor!');
    },
  },
  {
    tip: 'soru', soru: 'PIR sensörü hareketi nasıl algılar?',
    secenekler: ['Ses dalgası gönderip yankıyı dinler', 'İnsan vücudunun yaydığı kızılötesi ısıdaki değişimi algılar', 'Kameradan görüntü alıp karşılaştırır', 'Havadaki gaz miktarını ölçer'],
    dogru: 1, aciklama: 'PIR (Pasif Kızılötesi) sensörü ortamdaki ısı ışınımının değişmesini fark eder. Sıcak bir cisim (insan, hayvan) önünden geçince çıkışını HIGH yapar.',
  },
  {
    tip: 'kod', baslik: 'Hareket sayacı',
    metin: `Bekçi her hareketi saymak istiyor. Bir <b>sayac</b> değişkeni tut: her hareket algılandığında sayacı 1 artır ve <code>Serial.println(sayac)</code> ile seri monitöre yaz. Lamba yine yansın.`,
    ipucu: 'int sayac = 0; if içinde sayac += 1; Serial.println(sayac); Serial.begin(115200) setup içinde olmalı. Lamba yanık beklerken PIR sönmüş olacağı için aynı hareket iki kez sayılmaz.',
    girdi: darbeSenaryo('D5', [[500, 300], [3500, 300], [6500, 300]]), sure: 9200,
    kontrol(sim) {
      if (!sim.seriCikti.length) return hata('Seri monitöre hiçbir şey yazılmadı.');
      const dizi = sim.seriCikti.map(sayilar).filter(a => a.length).map(a => a[0]);
      if (Math.max(...dizi, 0) > 3) return hata('Sayaç 3\'ü geçti: aynı hareketi birden çok kez saydın. Sayacı yalnızca hareket algılanınca bir kez artır.');
      if (dizi[dizi.length - 1] !== 3) return hata(`3 hareket oldu ama son yazılan sayı ${dizi[dizi.length - 1] ?? 'yok'}. Sayaç 1, 2, 3 diye artmalı.`);
      return tamam('Hareketler sayılıyor: 1, 2, 3!');
    },
  },
  {
    tip: 'soru', soru: 'PIR sensörü açıldıktan sonra neden ilk 30-60 saniye yanlış sinyaller verebilir?',
    secenekler: ['Pili henüz şarj olmamıştır', 'Sensör önce ses dinler', 'Lamba çok parlaktır', 'Çevrenin kızılötesi görüntüsünü öğrenmesi (kalibrasyon) gerekir'],
    dogru: 3, aciklama: 'PIR ilk açıldığında ortamın "normal" ısı haritasını öğrenir. Bu süre içinde hareket etmemek en iyisidir.',
  },
  {
    tip: 'kod', baslik: 'Yavaşça sönen lamba',
    metin: `Lamba bir anda sönünce göz kamaşıyor. Süre dolunca lamba <b>yavaş yavaş sönsün</b>: parlaklığı <code>analogWrite(LAMBA, değer)</code> ile 255'ten 0'a doğru küçük adımlarla (örneğin 5'er 5'er, her adımda 20 ms bekleyerek) azalt.`,
    ipucu: 'for (int i = 255; i >= 0; i -= 5) { analogWrite(D0, i); delay(20); }',
    girdi: darbeSenaryo('D5', [[600, 300]]), sure: 7000,
    kontrol(sim) {
      const l = lamba(sim);
      if (durumda(l, 1500) < 0.9) return hata('Hareket algılanınca lamba tam parlaklıkta yanmalı.');
      const ara = [...new Set(l.map(o => o.deger).filter(v => v > 0 && v < 1))];
      if (ara.length < 6) return hata('Lamba yavaş sönmedi. Parlaklığı 255\'ten 0\'a küçük adımlarla azaltmalısın.');
      if (durumda(l, 6500) !== 0) return hata('Lamba sonunda tamamen sönmeli.');
      return tamam('Lamba kademeli olarak sönüyor, göz kamaşmıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Lambayı <code>delay(2000)</code> ile yanık tutmanın dezavantajı nedir?',
    secenekler: ['O iki saniye boyunca kart başka hiçbir şeye bakamaz; yeni hareketi o sırada fark edemez', 'Lamba daha parlak yanar', 'PIR sensörü bozulur', 'Hiçbir dezavantajı yoktur'],
    dogru: 0, aciklama: 'delay() sırasında program bekler. Daha gelişmiş projelerde bunun yerine millis() ile geçen süre ölçülür; böylece kart beklerken de sensörlere bakmaya devam eder.',
  },
];

// ──────────────────────────────────────────────────────────
// 7.3 Hava istasyonu (sıcaklık A1, LDR A0, LCD)
// ──────────────────────────────────────────────────────────
// A1: 1638 -> 20°C, 2457 -> 30°C, 819 -> 10°C (0-4095 = 0-50°C);  A0: 2048 -> %50, 4095 -> %100, 1024 -> %25
export const HAVA_ASAMA = [[0, { A1: 1638, A0: 2048 }], [1500, { A1: 2457, A0: 4095 }], [3000, { A1: 819, A0: 1024 }]];
export const HAVA_ANLIK = [1400, 2900, 4400];
export const havaGirdi = cokluSenaryo(HAVA_ASAMA, HAVA_ANLIK);
const kayitlar = sim => sim.cihaz.kayit ?? [];

const gorev73 = [
  {
    tip: 'kod', baslik: 'Fahrenheit göster',
    metin: `Amerikalı arkadaşın sıcaklığı Fahrenheit ile okuyor. LCD'nin 1. satırında sıcaklığı <b>Fahrenheit</b> olarak göster: <code>F = C * 9 / 5 + 32</code> ve sonuna " F" yaz. (20 °C → 68 F)`,
    ipucu: 'int fahr = sic * 9 / 5 + 32; Sonra lcd.print(fahr); lcd.print(" F  "); yaz.',
    girdi: havaGirdi, sure: 4500,
    kontrol(sim) {
      const k = kayitlar(sim);
      if (k.length < 3) return hata('Senaryo tamamlanmadı, tekrar dene.');
      const bekle = [68, 86, 50];
      for (let i = 0; i < 3; i++) {
        if (!sayilar(k[i].lcd[0]).includes(bekle[i])) return hata(`1. satırda ${bekle[i]} F görünmeli (şu an "${k[i].lcd[0].trim()}"). Formül: C * 9 / 5 + 32.`);
      }
      return tamam('LCD artık Fahrenheit gösteriyor: 68 → 86 → 50 F!');
    },
  },
  {
    tip: 'soru', soru: '<code>Serial.print</code> ile <code>Serial.println</code> arasındaki fark nedir?',
    secenekler: ['print sayı, println yazı yazdırır', 'println yazdıktan sonra alt satıra geçer, print geçmez', 'print seri monitörü, println LCD\'yi kullanır', 'Aralarında hiçbir fark yoktur'],
    dogru: 1, aciklama: 'println ("print line") yazının sonuna satır sonu ekler; sıradaki yazı yeni satırdan başlar. print ile art arda yazılanlar aynı satırda yan yana görünür.',
  },
  {
    tip: 'kod', baslik: 'Sıcaklık uyarısı',
    metin: `Sıcaklık <b>25 °C'yi geçince</b> seri monitöre <b>UYARI: Cok sicak</b> mesajı yazılsın (<code>Serial.println</code>). 25 °C ve altında bu mesaj yazılmasın.`,
    ipucu: 'if (sic > 25) { Serial.println("UYARI: Cok sicak"); } Sıcaklık 20 iken yazmamalı, 30 iken yazmalı.',
    girdi: havaGirdi, sure: 4500,
    kontrol(sim) {
      const k = kayitlar(sim);
      if (k.length < 3) return hata('Senaryo tamamlanmadı, tekrar dene.');
      if (k[0].seri.some(s => duz(s).includes('uyari'))) return hata('Sıcaklık 20 °C iken UYARI yazılmamalı.');
      if (!k[1].seri.some(s => duz(s).includes('uyari'))) return hata('Sıcaklık 30 °C olunca seri monitöre "UYARI: Cok sicak" yazılmalı.');
      return tamam('Sıcaklık 25 °C\'yi geçince uyarı çıkıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Sıcaklık sensöründen gelen 0-4095 sayısını neden <code>map</code> ile 0-50 aralığına çeviririz?',
    secenekler: ['Sensörü ısıtmak için', 'LCD\'nin parlaklığını ayarlamak için', 'Ham sayıyı insanın anlayacağı derece (°C) değerine çevirmek için', 'Kartın hızını artırmak için'],
    dogru: 2, aciklama: 'Sensör gerilim/sayı üretir, derece üretmez. map() ham ölçümü anlamlı bir birime (burada 0-50 °C) orantılı çevirir.',
  },
  {
    tip: 'kod', baslik: 'Gece / gündüz yazısı',
    metin: `Işık yüzdesi <b>30'un altına</b> inince LCD'nin 2. satırında "Isik: ..." yerine <b>Gece</b>, değilse <b>Gunduz</b> yazsın.`,
    ipucu: 'if (isik < 30) { lcd.print("Gece       "); } else { lcd.print("Gunduz     "); } Yazıların sonuna boşluk ekleyerek eski harfleri sil.',
    girdi: havaGirdi, sure: 4500,
    kontrol(sim) {
      const k = kayitlar(sim);
      if (k.length < 3) return hata('Senaryo tamamlanmadı, tekrar dene.');
      if (!duz(k[1].lcd[1]).includes('gunduz')) return hata('Işık yüksekken (%100) 2. satırda "Gunduz" yazmalı.');
      if (!duz(k[2].lcd[1]).includes('gece')) return hata('Işık %25 iken 2. satırda "Gece" yazmalı.');
      return tamam('İstasyon gece ile gündüzü ayırt ediyor!');
    },
  },
  {
    tip: 'soru', soru: '<code>lcd.print(" %  ")</code> gibi bir yazının sonundaki boşluklar ne işe yarar?',
    secenekler: ['Önceki daha uzun yazıdan (örneğin 100) kalan karakterleri ekrandan silmek', 'Ekranı daha parlak yapmak', 'Seri monitörü açmak', 'Sıcaklığı hesaplamak'],
    dogru: 0, aciklama: 'LCD yeni yazıyı eskinin üstüne yazar. Sayı 100\'den 25\'e inince "100" ün son rakamı ekranda kalmasın diye sona boşluk eklenir.',
  },
];

// ──────────────────────────────────────────────────────────
// 7.4 Gaz alarmı (MQ-2 A0, buzzer D8, LED D0)
// ──────────────────────────────────────────────────────────
export const G74 = [[0, 600], [1200, 1800], [2400, 3200], [3800, 700]];
const bip = sim => olaylar(sim, 'D8', 'ses');
const led0 = sim => cikis(sim, 'D0');
const alarmDurum = (sim, t) => ({ led: durumda(led0(sim), t), ses: durumda(bip(sim), t) });

const gorev74 = [
  {
    tip: 'kod', baslik: 'Daha erken uyar',
    metin: `Alarm şu an gaz 2000'in üstüne çıkınca ötüyor. Güvenlik için eşiği <b>1500</b> yap: gaz 1800 iken bile alarm çalsın.`,
    ipucu: 'if (gaz > 2000) koşulundaki 2000 sayısını 1500 yap.',
    girdi: analogSenaryo('A0', [[0, 600], [1000, 1800], [2500, 600]]), sure: 3500,
    kontrol(sim) {
      const a = alarmDurum(sim, 500), b = alarmDurum(sim, 1800), c = alarmDurum(sim, 3200);
      if (a.led || a.ses) return hata('Gaz azken (600) alarm çalmamalı.');
      if (!b.led || !b.ses) return hata('Gaz 1800 iken LED yanmalı ve buzzer ötmeli. Eşik 1500 olunca 1800 tehlikelidir.');
      if (c.led || c.ses) return hata('Gaz azalınca (600) alarm susmalı.');
      return tamam('Alarm 1500 eşiğinde daha erken devreye giriyor!');
    },
  },
  {
    tip: 'soru', soru: 'MQ-2 sensörü hangi gazlara karşı duyarlıdır?',
    secenekler: ['Yalnızca oksijene', 'LPG, metan, duman ve alkol gibi yanıcı gazlara', 'Yalnızca suya', 'Radyo dalgalarına'],
    dogru: 1, aciklama: 'MQ-2 yanıcı gaz ve duman sensörüdür. Gaz miktarı arttıkça çıkışı yükselir; bu yüzden "gaz > eşik" olunca alarm veririz.',
  },
  {
    tip: 'kod', baslik: 'İki kademeli alarm',
    metin: `Gaz <b>2000-3000</b> arasındaysa yalnızca <b>LED yansın</b> (uyarı); gaz <b>3000'in üstüne</b> çıkarsa LED yanmaya devam etsin ve <b>buzzer da ötsün</b> (tehlike). 2000'in altında her şey sönük olsun.`,
    ipucu: 'if (gaz > 3000) { LED+tone } else if (gaz > 2000) { LED yak, noTone } else { LED söndür, noTone }',
    girdi: analogSenaryo('A0', [[0, 600], [1000, 2500], [2500, 3600], [4000, 600]]), sure: 5000,
    kontrol(sim) {
      const a = alarmDurum(sim, 500), b = alarmDurum(sim, 1800), c = alarmDurum(sim, 3200), d = alarmDurum(sim, 4600);
      if (a.led || a.ses) return hata('Gaz azken her şey sönük olmalı.');
      if (!b.led) return hata('Gaz 2500 iken uyarı LED\'i yanmalı.');
      if (b.ses) return hata('Gaz 2500 iken yalnızca LED yanmalı; buzzer henüz susmalı.');
      if (!c.led || !c.ses) return hata('Gaz 3600 iken LED yanık kalmalı ve buzzer da ötmeli.');
      if (d.led || d.ses) return hata('Gaz azalınca LED ve buzzer sönmeli.');
      return tamam('Uyarı ve tehlike kademeleri çalışıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Bir gaz alarmında neden hem ses hem ışık kullanılır?',
    secenekler: ['Işık sensörü beslemek için', 'Ses ve ışık aynı elektrik hattını paylaşır', 'Gürültülü ortamda ışık, uyuyan ya da göremeyen birinde ses uyarır; ikisi güvenliği artırır', 'Buzzer tek başına çalışamaz'],
    dogru: 2, aciklama: 'Tek kanala bağlı alarm kaçırılabilir. Ses ve ışığı birlikte kullanmak farklı durumdaki herkesin uyarıyı fark etmesini sağlar.',
  },
  {
    tip: 'kod', baslik: 'Flaşörlü alarm',
    metin: `Alarm sırasında LED sabit yanmasın, <b>yanıp sönsün</b>: her turda LED'i 200 ms yak, 200 ms söndür. Buzzer alarm boyunca ötmeye devam etsin. Gaz azalınca LED söner, buzzer susar.`,
    ipucu: 'Alarm dalında: digitalWrite(LED, HIGH); tone(BUZZER, 1000); delay(200); digitalWrite(LED, LOW); delay(200);',
    girdi: analogSenaryo('A0', [[0, 600], [1000, 3500], [3000, 600]]), sure: 4000,
    kontrol(sim) {
      const yanma = led0(sim).filter(o => o.deger === 1 && o.t >= 1000 && o.t <= 3000).length;
      if (yanma < 4) return hata(`Alarm sırasında LED ${yanma} kez yandı; en az 4 kez yanıp sönmeli (200 ms yan, 200 ms sön).`);
      if (!alarmDurum(sim, 2500).ses) return hata('Alarm sırasında buzzer ötmeli.');
      const son = alarmDurum(sim, 3700);
      if (son.led || son.ses) return hata('Gaz azalınca LED ve buzzer sönmeli.');
      return tamam('Alarm flaşör gibi yanıp sönüyor!');
    },
  },
  {
    tip: 'soru', soru: 'Gaz alarmında eşiği çok düşük seçersek ne olur?',
    secenekler: ['Hafif bir duman ya da koku bile yanlış alarm verir', 'Alarm hiç çalmaz', 'Buzzer bozulur', 'Sensör kendini ısıtır'],
    dogru: 0, aciklama: 'Eşik çok düşükse normal ortam değişimleri bile alarmı tetikler. Çok yüksekse gerçek tehlike kaçırılır. Eşiği seri monitörden değerleri izleyerek seçeriz.',
  },
];

// ──────────────────────────────────────────────────────────
// 7.5 Şifreli kasa (tuş takımı A0, servo D5, LCD, LED D0)
// ──────────────────────────────────────────────────────────
/** Tuş takımı senaryosu: parcalar = [[başlangıç ms, [tuş no, ...]], ...] — her tuş 200 ms basılı, 500 ms aralıkla. Tuş no: 1-9, 10 = *, 11 = 0, 12 = #. */
export const kasaSenaryo = (parcalar, anlik = []) => cokluSenaryo([
  [0, { A0: 0 }],
  ...parcalar.flatMap(([bas, tuslar]) => tuslar.flatMap((n, i) => [[bas + i * 500, { A0: 340 * n }], [bas + i * 500 + 200, { A0: 0 }]])),
], anlik);
export const G75 = [[500, [1, 2, 3, 5]], [4200, [1, 2, 3, 4]]];       // önce yanlış, sonra doğru şifre
const servo = sim => olaylar(sim, 'D5', 'servo');

/** o: { yanlisSon: bu ana kadar kilit açılmamalı, ac: [a, b] doğru şifrede açılma aralığı, acikMin/acikMax: açık kalma süresi, led: [a, b] | null } */
export const kasaKontrol = (sim, o) => {
  const s = servo(sim);
  if (!s.length) return hata('Servo hiç hareket etmedi. Kilit servosunu D5\'e bağlayıp servo.write ile döndür.');
  if (s.some(a => a.deger >= 80 && a.t < o.yanlisSon)) return hata('Yanlış şifrede kilit açıldı! Servo yalnızca doğru şifrede 90 dereceye gitmeli.');
  const ac = s.find(a => a.deger >= 80 && a.t >= o.ac[0] && a.t <= o.ac[1]);
  if (!ac) return hata('Doğru şifre girildi ama kilit açılmadı (servo 90 derece olmalı).');
  const kapa = s.find(a => a.t > ac.t && a.deger <= 10);
  if (!kapa) return hata('Kilit açıldıktan sonra tekrar kapanmadı (servo 0 dereceye dönmeli).');
  const acik = kapa.t - ac.t;
  if (acik < o.acikMin) return hata(`Kilit çok erken kapandı (${Math.round(acik)} ms). En az ${o.acikMin} ms açık kalmalı.`);
  if (acik > o.acikMax) return hata(`Kilit çok geç kapandı (${Math.round(acik)} ms). En fazla ${o.acikMax} ms açık kalmalı.`);
  if (o.led && !led0(sim).some(l => l.deger === 1 && l.t >= o.led[0] && l.t <= o.led[1])) return hata('Yanlış şifrede kırmızı LED (D0) yanmadı.');
  return tamam('Kasa doğru şifrede açılıp kapanıyor, yanlış şifrede kapalı kalıyor!');
};
const KASA = { yanlisSon: 4200, ac: [5500, 6600], acikMin: 2500, acikMax: 4000, led: [1900, 3800] };

const gorev75 = [
  {
    tip: 'kod', baslik: 'Kendi şifreni belirle',
    metin: `Kasanın şifresi şu an <b>1-2-3-4</b>. Şifreyi <b>2-4-6-8</b> yap. Önce yanlış (1-2-3-4) sonra doğru (2-4-6-8) deneme yapılacak.`,
    ipucu: 'Şifre dizisini int sifre[4] = {2, 4, 6, 8}; olarak değiştir.',
    girdi: kasaSenaryo([[500, [1, 2, 3, 4]], [4200, [2, 4, 6, 8]]]), sure: 9500,
    kontrol: sim => kasaKontrol(sim, { ...KASA, led: [1900, 3800] }),
  },
  {
    tip: 'soru', soru: 'Tek bir analog pine 12 tuşlu tuş takımı nasıl bağlanabilir?',
    secenekler: ['Her tuşun arkasına ayrı bir sensör konur', 'Tuşlar bir direnç merdivenine bağlanır; her tuş farklı bir gerilim üretir', 'Tuşlar radyo ile haberleşir', 'Her tuş aynı sayıyı üretir, kart sırayla sayar'],
    dogru: 1, aciklama: 'Her tuşa basıldığında devreye farklı değerde bir direnç girer ve analog pin farklı bir sayı okur. Bizde 1. tuş 340, 2. tuş 680, ... 12. tuş 4080 üretir.',
  },
  {
    tip: 'kod', baslik: 'Kasa açık kalma süresi',
    metin: `Kasanın içine uzanmak 3 saniyeye sığmıyor! Doğru şifrede kilit <b>5 saniye (5000 ms)</b> açık kalsın, sonra tekrar kapansın.`,
    ipucu: 'Servo 90 yazıldıktan sonraki delay(3000) süresini delay(5000) yap.',
    girdi: kasaSenaryo([[500, [1, 2, 3, 4]]]), sure: 8500,
    kontrol: sim => kasaKontrol(sim, { yanlisSon: 1800, ac: [2000, 3000], acikMin: 4500, acikMax: 6000, led: null }),
  },
  {
    tip: 'soru', soru: 'Şifreyi kodun içine düz yazı gibi yazmanın (sifre = {1, 2, 3, 4}) güvenlik açısından zayıf yanı nedir?',
    secenekler: ['Kart şifreyi hemen unutur', 'Servo yanlış açıya gider', 'Tuş takımı bozulur', 'Kodu okuyan ya da karttan programı çeken herkes şifreyi görebilir'],
    dogru: 3, aciklama: 'Gerçek kasalarda şifre açıkça saklanmaz; karıştırılmış (hash) biçimde ve korumalı bellekte tutulur. Bu ders bir öğrenme projesidir.',
  },
  {
    tip: 'kod', baslik: 'Yıldız (*) tuşuyla iptal',
    metin: `Yanlış tuşa basınca baştan başlamak için <b>*</b> tuşu (tuş numarası <b>10</b>) kullanılsın: * basılınca girilen tuş sayısı sıfırlansın ve hata bilgisi temizlensin. Senaryoda <b>1-2-*-1-2-3-4</b> girilecek; kasa açılmalı.`,
    ipucu: 'if (tus == 10) { girilen = 0; dogru = true; } else { eski karşılaştırma ve girilen += 1; }',
    girdi: kasaSenaryo([[500, [1, 2, 10, 1, 2, 3, 4]]]), sure: 7500,
    kontrol: sim => kasaKontrol(sim, { yanlisSon: 3400, ac: [3500, 4600], acikMin: 100, acikMax: 6000, led: null }),
  },
  {
    tip: 'soru', soru: 'Kodda <code>while (tusOku() &gt; 0) { delay(20); }</code> satırı neden var?',
    secenekler: ['Kullanıcı tuştan elini çekene kadar bekler; böylece bir basış yalnızca bir kez sayılır', 'Servoyu hızlandırır', 'Şifreyi siler', 'LCD\'yi kapatır'],
    dogru: 0, aciklama: 'Kart çok hızlı döner; bir basış yüzlerce kez okunabilir. Tuş bırakılana kadar beklemek her basışı tek bir tuş olarak saymayı sağlar.',
  },
];

// ──────────────────────────────────────────────────────────
// Modül 7 Ders Listesi
// ──────────────────────────────────────────────────────────
export default [
  {
    id: 'saksi-sulama',
    ad: '7.1 · Akıllı saksı sulama',
    modul: 7,
    sure: 6500,
    gorevler: gorev71,
    html: `<h2>Akıllı saksı sulama</h2>
      <p>Toprağı kuruyan çiçeğini kendi kendine sulayan bir sistem yapıyoruz: toprak nem sensörü <b>A0</b>, su pompası <b>D6</b> pininde.</p>
      <ol>
        <li><b>sürekli tekrarla</b> içinde <b>A0</b> nem değerini oku (0-4095; <b>ıslak = büyük sayı</b>).</li>
        <li>Nem <b>1500'ün altındaysa</b> toprak kurudur: <b>D6</b> pompasını <b>HIGH</b> yap.</li>
        <li>Değilse (toprak yeterince nemli) pompayı <b>LOW</b> yap.</li>
        <li>Sona <b>100 ms bekle</b> ve ▶ Çalıştır'a bas. Toprak önce nemli, sonra kuru, sonra tekrar nemli olacak.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Saksıyı tanı',
        html: `<p>Sahnede bir <b>toprak nem sensörü</b> (<span class="pin-etiket">A0</span>) ve bir <b>su pompası</b> (<span class="pin-etiket">D6</span>) var.</p>
          <div class="kutu bilgi"><b>Islak = büyük sayı:</b> Sensörün iki ucu toprağa batar. Toprak ıslaksa elektrik iyi geçer ve <code>analogRead</code> 4095'e yaklaşır; kuruysa sayı küçülür.
          <pre><code>int nem = analogRead(A0);</code></pre></div>
          <div class="kutu hedef"><b>Hedef:</b> Nem 1500'ün altına inince pompa çalışsın, toprak ıslanınca dursun.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Toprağın durumu her an değişebilir. <span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına bırak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Nem eşiği: eğer - değilse',
        html: `<p><span class="chip akis">eğer</span> bloğunu döngünün içine koy; dişli simgesiyle bir <b>değilse</b> kolu ekle. Koşula <span class="chip mantik">karşılaştır</span> bloğunu tak: <span class="chip analog">A0 analog değerini oku</span> <b>&lt; 1500</b>.</p>
          <pre><code>if (analogRead(A0) &lt; 1500) { ... } else { ... }</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }, { blok: 'logic_compare' }],
        ipucu: 'Karşılaştır bloğu Mantık kategorisinde, A0 okuma bloğu Analog kategorisinde. Karşılaştırma işaretini &lt; yap.',
      },
      {
        baslik: 'Pompayı aç ve kapat',
        html: `<p><span class="chip pin">Pinler</span> kategorisinden iki <b>pinini yap</b> bloğu al. "Eğer" koluna <b>D6 pinini YÜKSEK yap</b>, "değilse" koluna <b>D6 pinini DÜŞÜK yap</b> koy.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: { blok: 'dy_yaz', alan: { PIN: 'D6' }, adet: 2, icinde: 'controls_if' },
        ipucu: 'Bloğun pin kutusunu D6 yap. İlki YÜKSEK, ikincisi DÜŞÜK olmalı.',
      },
      {
        baslik: 'Küçük bir bekleme',
        html: `<p><span class="chip akis">100 ms bekle</span> bloğunu eğer-değilse bloğunun altına, <b>sürekli tekrarla</b> içine koy.</p>
          <div class="kutu dikkat">Toprak nemi saniyede binlerce kez ölçülecek kadar hızlı değişmez. Kısa bir bekleme kartı gereksiz yormaz.</div>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'dy_surekli' },
        ipucu: 'Bekle bloğu sürekli tekrarla içinde kalsın.',
      },
      {
        baslik: 'Çalıştır ve sula',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Toprak önce nemli, sonra kuru olur ve pompanın çalıştığını gör. Sonra toprak tekrar ıslanınca pompa durur. Sensörü sahnede kendin de sürükleyebilirsin.</p>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Pompa hiç çalışmıyorsa eşik karşılaştırmasının yönüne (nem &lt; 1500) ve pompa pinine (D6) bak.',
      },
    ],
    sahne: { parcalar: [{ tur: 'nem', pin: 'A0', konum: [51.33, 0, 6.19] }, { tur: 'pompa', pin: 'D6', konum: [84.35, 0, 4.03] }] },
    girdi: analogSenaryo('A0', G71),
    kontrol(sim) {
      const p = pompa(sim);
      if (!p.length) return hata('Pompa hiç çalışmadı. Nem eşiğin altına inince D6 pinini YÜKSEK yap.');
      if (durumda(p, 1000) !== 0) return hata('Toprak ıslakken (3000) pompa çalışmamalı.');
      if (durumda(p, 3000) !== 1) return hata('Toprak kuruyunca (nem 700) pompa çalışmadı. Koşul: nem < 1500.');
      if (durumda(p, 5500) !== 0) return hata('Toprak tekrar ıslanınca pompa durmadı. "Değilse" koluna D6 DÜŞÜK ekle.');
      return tamam('Saksın kendi kendini suluyor: kuruyunca pompa çalışıyor, ıslanınca duruyor!');
    },
  },

  {
    id: 'pir-lamba',
    ad: '7.2 · Hareketle yanan lamba',
    modul: 7,
    sure: 8200,
    gorevler: gorev72,
    html: `<h2>Hareketle yanan lamba</h2>
      <p>Koridora giren biri olunca kendiliğinden yanan, sonra sönen bir lamba yapıyoruz: PIR hareket sensörü <b>D5</b>, lamba (LED) <b>D0</b> pininde.</p>
      <ol>
        <li><b>sürekli tekrarla</b> içinde <b>D5 yüksek mi?</b> diye PIR'a bak (hareket varsa HIGH).</li>
        <li>Hareket varsa <b>D0</b> lambasını yak.</li>
        <li><b>2 saniye (2000 ms)</b> bekle, sonra lambayı söndür.</li>
        <li>Sona <b>50 ms bekle</b> ve ▶ Çalıştır'a bas. İki kez hareket olacak.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'PIR sensörünü tanı',
        html: `<p>Sahnedeki <b>PIR</b> (<span class="pin-etiket">D5</span>) bir insanın yaydığı kızılötesi ısıdaki değişimi fark eder. Hareket varken çıkışı <b>HIGH</b>, yokken <b>LOW</b> olur. Lamba <span class="pin-etiket">D0</span> pininde.</p>
          <div class="kutu bilgi"><b>Dijital girdi:</b> PIR bir düğme gibi okunur: <code>digitalRead(D5)</code> hareket varken 1 verir.</div>
          <div class="kutu hedef"><b>Hedef:</b> Hareket algılanınca lamba 2 saniye yansın, sonra sönsün.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Hareket her an gelebilir. <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına bırak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Hareket var mı?',
        html: `<p>Döngünün içine <span class="chip akis">eğer</span> bloğu koy. Koşuluna <span class="chip pin">D5 pini yüksek mi?</span> bloğunu tak.</p>
          <pre><code>if (digitalRead(D5) == HIGH) { ... }</code></pre>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_oku' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_oku', alan: { PIN: 'D5' } }],
        ipucu: 'Pin kutusunu D5 yap.',
      },
      {
        baslik: 'Lambayı yak, bekle, söndür',
        html: `<p>"Eğer" içine sırayla <span class="chip pin">D0 pinini YÜKSEK yap</span>, <span class="chip akis">2000 ms bekle</span>, <span class="chip pin">D0 pinini DÜŞÜK yap</span> koy.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0' }, adet: 2, icinde: 'controls_if' }, { blok: 'dy_bekle', icinde: 'controls_if' }],
        ipucu: 'Bekleme süresini 2000 yap. İlk D0 bloğu YÜKSEK, ikincisi DÜŞÜK olmalı.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. İki ayrı hareket gelecek: lamba her birinde yanıp sönmeli. PIR'ı sahnede fareyle de tetikleyebilirsin.</p>
          <div class="kutu dikkat">Gerçek PIR hareketten sonra bir süre HIGH kalır. Bu ders için sorun değil: lamba 2 saniye bekledikten sonra PIR çoktan LOW olmuştur.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Lamba hiç yanmıyorsa PIR pini (D5) ve lamba pini (D0) doğru mu?',
      },
    ],
    sahne: { parcalar: [{ tur: 'pir', pin: 'D5', konum: [64.03, 0, 6.03] }, { tur: 'led', pin: 'D0', renk: 'sari', konum: [108, 0, 10] }] },
    girdi: darbeSenaryo('D5', G72),
    kontrol(sim) {
      const l = lamba(sim);
      if (!l.length) return hata('Lamba hiç yanmadı. PIR (D5) HIGH olunca D0 pinini YÜKSEK yap.');
      if (durumda(l, 400) !== 0) return hata('Hareket yokken lamba sönük olmalı.');
      if (durumda(l, 1500) <= 0) return hata('İlk harekette lamba yanmadı.');
      if (durumda(l, 3500) !== 0) return hata('Lamba 2 saniye sonra sönmedi. Bekledikten sonra D0 pinini DÜŞÜK yap.');
      if (durumda(l, 5300) <= 0) return hata('İkinci harekette lamba tekrar yanmadı. Her şey sürekli tekrarla içinde olmalı.');
      if (durumda(l, 7500) !== 0) return hata('Lamba ikinci harekette de sönmeli.');
      return tamam('Hareket gelince lamba yanıyor, 2 saniye sonra sönüyor!');
    },
  },

  {
    id: 'hava-istasyonu',
    ad: '7.3 · Mini hava istasyonu',
    modul: 7,
    sure: 4500,
    gorevler: gorev73,
    html: `<h2>Mini hava istasyonu</h2>
      <p>Sıcaklığı ve ışığı ölçüp LCD ekranda ve seri monitörde gösteren bir hava istasyonu: sıcaklık sensörü <b>A1</b>, ışık sensörü (LDR) <b>A0</b>, LCD ekran I2C.</p>
      <ol>
        <li><b>A1</b> değerini <b>harita</b> ile <b>0-50 °C</b> aralığına çevir.</li>
        <li><b>A0</b> ışık değerini <b>0-100 yüzde</b> aralığına çevir.</li>
        <li>LCD'nin 1. satırına <i>Sicaklik: 20 C</i>, 2. satırına <i>Isik: 50 %</i> yaz.</li>
        <li>Aynı değerleri <b>seri monitöre</b> yaz ve <b>500 ms</b> bekle.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'İstasyonu tanı',
        html: `<p>Sahnede <b>sıcaklık sensörü</b> (<span class="pin-etiket">A1</span>), <b>ışık sensörü</b> (<span class="pin-etiket">A0</span>) ve <b>LCD</b> var.</p>
          <div class="kutu bilgi"><b>Ham sayıdan gerçek birime:</b> İki sensör de 0-4095 arası bir sayı verir. Sıcaklık için bu sayı 0-50 °C'ye, ışık için 0-100 yüzdeye karşılık gelir. Çevirmek için <b>harita (map)</b> kullanırız.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Hava durumu değişir. <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına bırak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Sıcaklığı LCD\'ye yaz',
        html: `<p><span class="chip ekran">LCD satır 1 yaz</span> bloğunu döngüye koy. Metin yerine <span class="chip metin">birleştir</span> bloğu tak: ilk kutuya <b>Sicaklik: </b> yaz, ikinciye <span class="chip analog">harita</span> bloğunu tak. Haritada okuma <span class="pin-etiket">A1</span>, çıktı aralığı <b>0 - 50</b> olsun.</p>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: [{ blok: 'dy_lcd_yaz', alan: { SATIR: '0' }, icinde: 'dy_surekli' }, { blok: 'dy_harita' }, { blok: 'dy_analog_oku', alan: { PIN: 'A1' } }],
        ipucu: 'Harita bloğu Analog kategorisinde dolu gelir; A0 yazan yeri A1 yap, son iki sayıyı 0 ve 50 yap.',
      },
      {
        baslik: 'Işığı LCD\'ye yaz',
        html: `<p>Aynısını 2. satır için yap: <span class="chip ekran">LCD satır 2 yaz</span>, birleştir <b>Isik: </b> ve harita (okuma <span class="pin-etiket">A0</span>, çıktı <b>0 - 100</b>).</p>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: [{ blok: 'dy_lcd_yaz', alan: { SATIR: '1' }, icinde: 'dy_surekli' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }],
        ipucu: 'LCD bloğunun satır kutusunu 2 yap.',
      },
      {
        baslik: 'Seri monitöre yaz',
        html: `<p><span class="chip seri">Seri</span> kategorisinden <span class="chip seri">seri monitöre yaz</span> bloğunu al ve sıcaklık değerini oraya da gönder. Seri monitör, bilgisayarda değerleri satır satır görmeni sağlar.</p>`,
        vurgu: { kategori: 'Seri', blok: 'dy_seri' },
        bitti: { blok: 'dy_seri', icinde: 'dy_surekli' },
        ipucu: 'Metin kutusuna birleştir ya da harita bloğu takabilirsin.',
      },
      {
        baslik: 'Bekle ve çalıştır',
        html: `<p>Döngünün sonuna <span class="chip akis">500 ms bekle</span> koy ve ▶ <b>Çalıştır</b>'a bas. Sıcaklık 20, 30, 10 °C olacak; ışık da değişecek. Ekranın ve seri monitörün güncellendiğini izle.</p>`,
        vurgu: { parca: 2 },
        bitti: { basari: true },
        ipucu: 'Ekran güncellenmiyorsa bekle bloğunun sürekli tekrarla içinde olduğundan emin ol.',
      },
    ],
    sahne: { parcalar: [{ tur: 'ldr', pin: 'A0', konum: [51.33, 0, 6.19] }, { tur: 'sicaklik', pin: 'A1', konum: [107.19, 0, 6.19] }, { tur: 'lcd', konum: [78, 0, 23.29] }] },
    girdi: havaGirdi,
    kontrol(sim) {
      const k = kayitlar(sim);
      if (k.length < 3) return hata('Senaryo tamamlanmadı, tekrar dene.');
      const bek = [[20, 50], [30, 100], [10, 25]];
      for (let i = 0; i < 3; i++) {
        const [s, is] = bek[i];
        if (!sayilar(k[i].lcd[0]).includes(s)) return hata(`LCD 1. satırda sıcaklık ${s} görünmeli (şu an "${k[i].lcd[0].trim()}"). A1'i 0-50 aralığına çevirdin mi?`);
        if (!sayilar(k[i].lcd[1]).includes(is)) return hata(`LCD 2. satırda ışık yüzdesi ${is} görünmeli (şu an "${k[i].lcd[1].trim()}"). A0'ı 0-100 aralığına çevirdin mi?`);
      }
      if (!sim.seriCikti.length) return hata('Seri monitöre hiçbir şey yazılmadı.');
      const s = sim.seriCikti.map(sayilar);
      const i20 = s.findIndex(a => a.includes(20)), i30 = s.findIndex(a => a.includes(30)), i10 = s.findIndex(a => a.includes(10));
      if (i20 < 0 || i30 < i20 || i10 < i30) return hata('Seri monitörde sıcaklık 20 → 30 → 10 olarak görünmeli.');
      return tamam('Hava istasyonu çalışıyor: ekran ve seri monitör sıcaklık ile ışığı gösteriyor!');
    },
  },

  {
    id: 'gaz-alarmi',
    ad: '7.4 · Gaz kaçağı alarmı',
    modul: 7,
    sure: 5200,
    gorevler: gorev74,
    html: `<h2>Gaz kaçağı alarmı</h2>
      <p>Mutfaktaki gaz kaçağını fark eden bir güvenlik sistemi: MQ-2 gaz sensörü <b>A0</b>, buzzer <b>D8</b>, kırmızı LED <b>D0</b> pininde.</p>
      <ol>
        <li><b>A0</b> gaz değerini oku (0-4095; <b>çok gaz = büyük sayı</b>) ve seri monitöre yaz.</li>
        <li>Gaz <b>2000'in üstündeyse</b> LED'i yak ve buzzer'ı <b>1000 Hz</b> çal.</li>
        <li>Değilse LED'i söndür ve buzzer'ı sustur.</li>
        <li>Sona <b>100 ms bekle</b> ve ▶ Çalıştır'a bas.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Alarmı tanı',
        html: `<p>Sahnede <b>MQ-2 gaz sensörü</b> (<span class="pin-etiket">A0</span>), <b>buzzer</b> (<span class="pin-etiket">D8</span>) ve <b>kırmızı LED</b> (<span class="pin-etiket">D0</span>) var.</p>
          <div class="kutu bilgi"><b>Çok gaz = büyük sayı:</b> MQ-2 yanıcı gaz ve dumanı algılar. Havada gaz arttıkça <code>analogRead</code> sayısı büyür.
          <pre><code>int gaz = analogRead(A0);</code></pre></div>
          <div class="kutu dikkat">Gerçek MQ-2 sensörü ısınmak için birkaç dakika ister ve alarm eşiği ortama göre ayarlanır. Bu yüzden değerleri seri monitörden izleyip eşik seçilir.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Gaz her an sızabilir. <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına bırak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Eşik koşulu',
        html: `<p><span class="chip akis">eğer</span> bloğunu koy, dişliyle <b>değilse</b> kolunu ekle. Koşul: <span class="chip analog">A0 analog değerini oku</span> <b>&gt; 2000</b> (karşılaştırma işaretini &gt; yap).</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }, { blok: 'logic_compare' }],
        ipucu: 'Karşılaştır bloğu Mantık, A0 okuma bloğu Analog kategorisinde.',
      },
      {
        baslik: 'Alarm: LED ve buzzer',
        html: `<p>"Eğer" koluna <span class="chip pin">D0 pinini YÜKSEK yap</span> ve <span class="chip ses">D8 pinine 1000 Hz ses çal</span> koy.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_cal' },
        bitti: [{ blok: 'dy_ses_cal', alan: { PIN: 'D8' }, icinde: 'controls_if' }, { blok: 'dy_yaz', alan: { PIN: 'D0' }, icinde: 'controls_if' }],
        ipucu: 'Buzzer D8, LED D0 pininde. Ses bloğunun frekansını 1000 yap.',
      },
      {
        baslik: 'Güvenliyse sustur',
        html: `<p>"Değilse" koluna <span class="chip pin">D0 pinini DÜŞÜK yap</span> ve <span class="chip ses">D8 pinindeki sesi sustur</span> koy. Sonra <span class="chip akis">100 ms bekle</span> ekle.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_sustur' },
        bitti: [{ blok: 'dy_ses_sustur', alan: { PIN: 'D8' }, icinde: 'controls_if' }, { blok: 'dy_bekle', icinde: 'dy_surekli' }],
        ipucu: 'Sustur bloğu da Ses ve hareket kategorisinde.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Gaz önce az, sonra artar. Alarm yalnızca gaz 2000'i aşınca çalmalı. Sensörü sahnede kendin de sürükleyebilirsin.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Alarm 1800 iken çalıyorsa eşik 2000\'den küçük kalmış olabilir.',
      },
    ],
    sahne: { parcalar: [{ tur: 'gaz', pin: 'A0', konum: [58.95, 0, 6.19] }, { tur: 'buzzer', pin: 'D8', konum: [104, 0, -6] }, { tur: 'led', pin: 'D0', renk: 'kirmizi', konum: [110, 0, 18] }] },
    girdi: analogSenaryo('A0', G74),
    kontrol(sim) {
      if (!led0(sim).length && !bip(sim).length) return hata('Alarm hiç çalışmadı. Gaz 2000\'i aşınca LED yak ve buzzer çal.');
      const a = alarmDurum(sim, 800), b = alarmDurum(sim, 1900), c = alarmDurum(sim, 3000), d = alarmDurum(sim, 4600);
      if (a.led || a.ses) return hata('Gaz azken (600) alarm çalmamalı.');
      if (b.led || b.ses) return hata('Gaz 1800 iken alarm çalmamalı; eşik 2000.');
      if (!c.led) return hata('Gaz 3200 iken kırmızı LED yanmalı.');
      if (!c.ses) return hata('Gaz 3200 iken buzzer ötmeli.');
      if (d.led || d.ses) return hata('Gaz azalınca (700) LED ve buzzer sönmeli. "Değilse" koluna ekle.');
      return tamam('Gaz alarmı çalışıyor: eşik aşılınca LED yanıyor ve buzzer ötüyor!');
    },
  },

  {
    id: 'sifreli-kasa',
    ad: '7.5 · Şifreli kasa',
    modul: 7,
    sure: 9500,
    gorevler: gorev75,
    html: `<h2>Şifreli kasa</h2>
      <p>12 tuşlu tuş takımıyla açılan bir kasa: tuş takımı <b>A0</b>, kilit servosu <b>D5</b>, kırmızı LED <b>D0</b>, durum ekranı için LCD.</p>
      <ol>
        <li>Tuş takımı tek bir analog pinde çalışır: <b>n. tuş = 340 × n</b> (1. tuş 340, 2. tuş 680 ...). Hiçbir tuşa basılmıyorsa <b>0</b>.</li>
        <li>Şifre <b>1-2-3-4</b>. Doğru sırada 4 tuşa basılırsa servo <b>90 dereceye</b> dönüp kilidi açar.</li>
        <li><b>3 saniye</b> sonra servo <b>0 dereceye</b> dönüp kilidi kapatır.</li>
        <li>Yanlış tuşa basılırsa kırmızı LED yanıp kilit kapalı kalır.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Kasayı tanı',
        html: `<p>Sahnede <b>tuş takımı</b> (<span class="pin-etiket">A0</span>), kilit <b>servosu</b> (<span class="pin-etiket">D5</span>), <b>LCD</b> ve <b>LED</b> (<span class="pin-etiket">D0</span>) var.</p>
          <div class="kutu bilgi"><b>Tek pin, 12 tuş:</b> Tuşlar bir direnç merdivenine bağlıdır. Her tuş farklı bir sayı verir: 1. tuş 340, 2. tuş 680, 3. tuş 1020, 4. tuş 1360 ... Hiç tuşa basılmazsa 0. Kart sayıya bakarak hangi tuşa basıldığını anlar.</div>
          <div class="kutu hedef"><b>Hedef:</b> 1, 2, 3, 4 sırasıyla basılırsa servo kilidi 3 saniye açsın; yanlış tuşta kırmızı LED yansın.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Adım sayacı ve döngü',
        html: `<p><span class="chip degisken">Değişkenler</span> kategorisinden <b>adim</b> adlı bir değişken oluştur ve başta <b>0</b> yap. Sonra <span class="chip akis">sürekli tekrarla</span> bloğunu altına bağla.</p>
          <div class="kutu bilgi"><b>adim</b> şifrenin kaçıncı tuşunu beklediğimizi tutar: 0 = 1. tuş, 1 = 2. tuş, 2 = 3. tuş, 3 = 4. tuş.</div>`,
        vurgu: { kategori: 'Değişkenler' },
        bitti: [{ blok: 'variables_set' }, { blok: 'dy_surekli' }],
        ipucu: 'Değişkenler kategorisinde "Değişken oluştur" de, adını adim yaz. "adim değerini 0 yap" bloğunu sürekli tekrarla bloğunun üstüne koy.',
      },
      {
        baslik: 'Bir tuşa basıldı mı?',
        html: `<p>Döngünün içine <span class="chip akis">eğer</span> koy. Koşul: <span class="chip analog">A0 analog değerini oku</span> <b>&gt; 150</b>. (Hiç tuşa basılmıyorsa değer 0'dır.)</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }],
        ipucu: 'Karşılaştır bloğunun işaretini &gt; yap ve sağ kutuya 150 yaz.',
      },
      {
        baslik: 'Doğru tuş mu?',
        html: `<p>Bu "eğer"in içine bir tane daha <span class="chip akis">eğer - değilse eğer - ... - değilse</span> zinciri kur (dişli ile 3 "değilse eğer" ve 1 "değilse" ekle). Her kolun koşulu: <b>adim = k</b> <span class="chip mantik">ve</span> <b>A0, k+1. tuşun aralığında</b>. Örneğin 1. tuş (340) için: <b>A0 &gt; 170</b> ve <b>A0 &lt; 510</b>. Doğruysa adim'ı bir artır.</p>
          <pre><code>if (adim == 0 &amp;&amp; A0 &gt; 170 &amp;&amp; A0 &lt; 510) adim = 1;
else if (adim == 1 &amp;&amp; A0 &gt; 510 &amp;&amp; A0 &lt; 850) adim = 2; ...</code></pre>
          <div class="kutu bilgi">Tuş aralıkları 340 aralıklıdır: 2. tuş 510-850, 3. tuş 850-1190, 4. tuş 1190-1530 arasında okunur.</div>`,
        vurgu: { kategori: 'Mantık', blok: 'logic_operation' },
        bitti: [{ blok: 'controls_if', adet: 2 }, { blok: 'logic_operation' }, { blok: 'variables_get' }],
        ipucu: 'Önce zincirin tamamını tek kolla kurup test edebilirsin; sonra dişliden kolları çoğalt. Koşullarda ve bloğu kullan.',
      },
      {
        baslik: 'Kilidi aç',
        html: `<p>Son kolda (4. tuş doğruysa) <b>adim</b> değerini 0 yap ve servoyu aç-bekle-kapat: <span class="chip ses">D5 servosunu 90 yap</span>, <span class="chip akis">3000 ms bekle</span>, <span class="chip ses">D5 servosunu 0 yap</span>.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: { blok: 'dy_servo_yaz', alan: { PIN: 'D5' }, adet: 2, icinde: 'controls_if' },
        ipucu: 'İlk servo bloğunda 90, ikincisinde 0 yaz. Aralarına 3000 ms bekle bloğu gelir.',
      },
      {
        baslik: 'Yanlış tuş: LED',
        html: `<p>Zincirin son "değilse" koluna (yanlış tuş) <b>adim</b> değerini 0 yap, sonra <span class="chip pin">D0 pinini YÜKSEK yap</span>, <span class="chip akis">500 ms bekle</span>, <span class="chip pin">D0 pinini DÜŞÜK yap</span>. Dış "eğer"in sonuna <span class="chip akis">300 ms bekle</span> koy ki bir basış iki kez sayılmasın. Döngü sonuna 20 ms bekle ekle.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0' }, adet: 2, icinde: 'controls_if' }, { blok: 'dy_bekle', icinde: 'dy_surekli' }],
        ipucu: 'Basılı tuş yaklaşık 200 ms sürer; 300 ms beklemek bir basışı yalnızca bir kez saymanı sağlar.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Önce yanlış bir şifre (1-2-3-5) girilir: LED yanmalı, kasa kapalı kalmalı. Sonra doğru şifre (1-2-3-4) girilir: servo kilidi açıp 3 saniye sonra kapatmalı. Tuşlara sahnede kendin de basabilirsin.</p>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Kilit yanlış şifrede de açılıyorsa her kolun koşulunda adim değerini kontrol ettiğinden emin ol.',
      },
    ],
    sahne: { parcalar: [{ tur: 'tustakimi', pin: 'A0', konum: [51.33, 0, 0.47] }, { tur: 'servo', pin: 'D5', konum: [105.77, 0, -3.97] }, { tur: 'lcd', konum: [98.32, 0, 25.83] }, { tur: 'led', pin: 'D0', renk: 'kirmizi', konum: [68, 0, 32] }] },
    girdi: kasaSenaryo(G75),
    kontrol: sim => kasaKontrol(sim, KASA),
  },
];
