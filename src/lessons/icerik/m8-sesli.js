// Modül 8 (Robot araba) için sesli anlatım parçaları ve "kodu değiştir" görevleri.
// Kod fabrikaları (KOD_81 ... KOD_84) dışa aktarılır: tools/test-m8.mjs ve tools/e2e/cozumler-m8.mjs aynı kodu kullanır.
import {
  SAHNE_DUZ, SAHNE_ENGEL, SAHNE_CIZGI, durum, aciFark, yukselen, dusen, olaylar, ilkGeri, ilkHareket, kapali, sinirlar, yol81, yonT, enBuyukSapma, tamam, hata,
} from '../m8-araba.js';

// ── Ortak kod parçaları (hepsi tek satır birimleri) ──
const PIN_MOD = '  pinMode(D0, OUTPUT);\n  pinMode(D1, OUTPUT);\n  pinMode(D2, OUTPUT);\n  pinMode(D3, OUTPUT);\n';
const FN_ILERI = 'void ileri() {\n  digitalWrite(D0, HIGH);\n  digitalWrite(D1, LOW);\n  digitalWrite(D2, HIGH);\n  digitalWrite(D3, LOW);\n}\n\n';
const FN_GERI = 'void geri() {\n  digitalWrite(D0, LOW);\n  digitalWrite(D1, HIGH);\n  digitalWrite(D2, LOW);\n  digitalWrite(D3, HIGH);\n}\n\n';
const FN_SAGA = 'void saga() {\n  digitalWrite(D0, HIGH);\n  digitalWrite(D1, LOW);\n  digitalWrite(D2, LOW);\n  digitalWrite(D3, HIGH);\n}\n\n';
const FN_SOLA = 'void sola() {\n  digitalWrite(D0, LOW);\n  digitalWrite(D1, HIGH);\n  digitalWrite(D2, HIGH);\n  digitalWrite(D3, LOW);\n}\n\n';
const FN_DUR = 'void dur() {\n  digitalWrite(D0, LOW);\n  digitalWrite(D1, LOW);\n  digitalWrite(D2, LOW);\n  digitalWrite(D3, LOW);\n}\n\n';

// ── 8.1 Motorlar ──
const PIN_NOT = '// Sol motor: D0 ileri, D1 geri. Sag motor: D2 ileri, D3 geri.\n\n';
const P81 = ({ ileri = 2000, bek = 500, geri = 1000 } = {}) => [
  PIN_NOT, FN_ILERI, FN_GERI, FN_DUR,
  'void setup() {\n' + PIN_MOD,
  `  ileri();\n  delay(${ileri});\n  dur();\n  delay(${bek});\n`,
  `  geri();\n  delay(${geri});\n  dur();\n}\n\n`,
  'void loop() {\n}\n',
];
export const KOD_81 = o => P81(o).join('');

// ── 8.2 Dönüşler ──
const P82 = ({ adet = 4, kenar = 1000, don = 380, yon = 'saga' } = {}) => [
  '// Kare: ileri git, saga don; 4 kez tekrarla.\n\n', FN_ILERI, FN_SAGA, FN_SOLA, FN_DUR,
  'void setup() {\n' + PIN_MOD,
  `  for (int i = 0; i < ${adet}; i++) {\n    ileri();\n    delay(${kenar});\n`,
  `    ${yon}();\n    delay(${don});\n`,
  '    dur();\n    delay(200);\n  }\n}\n\n',
  'void loop() {\n}\n',
];
export const KOD_82 = o => P82(o).join('');

// ── 8.3 Engelden kaçan ──
const P83 = ({ esik = 30, geriMs = 400, yon = 'saga' } = {}) => [
  '// Mesafe sensoru D4: engel yakinsa geri git ve don.\n\n', FN_ILERI, FN_GERI, FN_SAGA, FN_SOLA,
  'void setup() {\n' + PIN_MOD + '  pinMode(D4, INPUT);\n}\n\n',
  `void loop() {\n  if (mesafeOlc(D4) < ${esik}) {\n`,
  `    geri();\n    delay(${geriMs});\n    ${yon}();\n    delay(380);\n`,
  '  } else {\n    ileri();\n  }\n  delay(50);\n}\n',
];
export const KOD_83 = o => P83(o).join('');

// ── 8.4 Çizgi izleyen ──
const P84 = ({ bekle = 1000, solPin = 'D5', sagPin = 'D6', dongu = 50 } = {}) => [
  '// Cizgi sensoru: siyah cizgide 1, beyaz zeminde 0.\n\n', FN_ILERI, FN_SOLA, FN_SAGA,
  'void setup() {\n' + PIN_MOD + `  pinMode(D5, INPUT);\n  pinMode(D6, INPUT);\n  delay(${bekle});\n}\n\n`,
  `void loop() {\n  int sol = digitalRead(${solPin});\n  int sag = digitalRead(${sagPin});\n`,
  `  if (sol == 1) {\n    sola();\n  } else if (sag == 1) {\n    saga();\n  } else {\n    ileri();\n  }\n  delay(${dongu});\n}\n`,
];
export const KOD_84 = o => P84(o).join('');


export default {
  // ──────────────────────────────────────────────────────────
  'araba-motorlar': {
    sesli: [
      { ses: 'Merhaba! Bu derste iki motorlu robot arabamızı sürmeyi öğreniyoruz. Önce ileri, sonra geri, sonra da durmayı kodlayacağız.', parca: 0 },
      { ses: 'Her motorun iki yön pini var. Sol motor için D sıfır ileri, D bir geri. Sağ motor için D iki ileri, D üç geri. Bunu bir yorum olarak yazıyoruz.', yaz: P81()[0], parca: 0 },
      { ses: 'İleri fonksiyonunda iki ileri pini yüksek, iki geri pini düşük yapıyoruz. İki tekerlek de aynı yöne dönünce araba düz ileri gider.', yaz: P81()[1] },
      { ses: 'Geri fonksiyonu tam tersi. İleri pinleri düşük, geri pinleri yüksek. Tekerlekler ters dönünce araba geri gelir.', yaz: P81()[2] },
      { ses: 'Dur fonksiyonunda dört pini de düşük yapıyoruz. Pinler eşitlenince motorlar durur.', yaz: P81()[3] },
      { ses: 'Setup bölümünde dört motor pinini çıkış olarak ayarlıyoruz.', yaz: P81()[4] },
      { ses: 'Arabayı iki saniye ileri sürüyoruz. Bekleme bitince durup yarım saniye bekliyoruz. Bir saniye yaklaşık yirmi beş santimetre yol demek.', yaz: P81()[5] },
      { ses: 'Sonra bir saniye geri geliyoruz ve motorları durduruyoruz. Loop bölümü bu derste boş kalıyor, çünkü hareketi bir kez yapacağız.', yaz: P81()[6] + P81()[7], parca: 0 },
      { ses: 'Şimdi çalıştıralım! Arabanın ileri gidip durduğunu, sonra geri geldiğini izle.', calistir: true, parca: 0 },
      { ses: 'Arabamız artık komutlarımızı dinliyor. Görevler sekmesinde süreleri değiştirerek farklı yollar çizebilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Üç saniye ileri',
        metin: 'Araba şu an 2 saniye ileri gidiyor. İleri gitme süresini <b>3 saniyeye (3000 ms)</b> çıkar.',
        kod: KOD_81(), degistir: [{ ara: 'delay(2000)' }], cozum: KOD_81({ ileri: 3000 }), sure: 6000,
        ipucu: 'İleri() çağrısından sonraki delay(2000) değerini 3000 yap.',
        kontrol(sim) {
          const r = yol81(sim, 60); if (r.hata) return hata(r.hata);
          return tamam('Araba 3 saniye ileri gitti!');
        },
      },
      {
        tip: 'duzenle', baslik: 'İki saniye geri',
        metin: 'Araba geri gelirken yalnızca 1 saniye gidiyor. Geri gitme süresini <b>2 saniye (2000 ms)</b> yap; araba başladığı yere dönsün.',
        kod: KOD_81(), degistir: [{ ara: 'delay(1000)' }], cozum: KOD_81({ geri: 2000 }), sure: 6000,
        ipucu: 'geri() çağrısından sonraki delay(1000) değerini 2000 yap.',
        kontrol(sim) {
          const r = yol81(sim, 35); if (r.hata) return hata(r.hata);
          if (r.a.x > r.maxX - 45) return hata('Araba yeterince geri gelmedi (en az 45 cm geri gitmeli).');
          return tamam('Araba 2 saniye geri geldi ve başladığı yere döndü!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Dururken 2 saniye bekle',
        metin: 'İleri gittikten sonra araba yalnızca yarım saniye duruyor. Bu bekleme süresini <b>2 saniye (2000 ms)</b> yap.',
        kod: KOD_81(), degistir: [{ ara: 'delay(500)' }], cozum: KOD_81({ bek: 2000 }), sure: 6500,
        ipucu: 'dur() çağrısından sonraki delay(500) değerini 2000 yap.',
        kontrol(sim) {
          const bitis = dusen(sim, 'D0')[0], geri = yukselen(sim, 'D1')[0];
          if (!bitis || !geri) return hata('Araba ileri gidip sonra geri gelmedi.');
          const bos = geri.t - bitis.t;
          if (bos < 1800) return hata(`Araba ${Math.round(bos)} ms durdu; en az 2000 ms durmalı.`);
          return tamam('Araba ileri ve geri arasında 2 saniye durdu!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'araba-donus': {
    sesli: [
      { ses: 'Bu derste arabayı olduğu yerde döndürmeyi öğreniyoruz. Sonra da dönüşleri kullanarak yerde bir kare çizdireceğiz.', parca: 0 },
      { ses: 'Yine bir yorumla başlıyoruz: ileri git, sağa dön, dört kez tekrarla. Sonra ileri fonksiyonunu yazıyoruz; iki motor da ileri döner.', yaz: P82()[0] + P82()[1], parca: 0 },
      { ses: 'Sağa dönmek için sol motor ileri, sağ motor geri çalışır. Tekerlekler zıt yönde dönünce araba saat yönünde, yani sağa döner.', yaz: P82()[2] },
      { ses: 'Sola dönüş bunun tersi. Sol motor geri, sağ motor ileri. Bu fonksiyonu görevlerde kullanacağız.', yaz: P82()[3] },
      { ses: 'Dur fonksiyonu dört pini de düşük yapar. Sonra setup içinde motor pinlerini çıkış yapıyoruz.', yaz: P82()[4] + P82()[5] },
      { ses: 'Kare dört kenardan oluşur, o yüzden bir for döngüsü kuruyoruz. Her turda arabayı bir saniye ileri sürüyoruz; bu yaklaşık yirmi beş santimetre eder.', yaz: P82()[6], parca: 0 },
      { ses: 'Sonra sağa dönüyoruz. Üç yüz seksen milisaniye yaklaşık doksan derece döndürür. Dönme açısı süreyle orantılı olduğu için süreyi değiştirerek açıyı ayarlarız.', yaz: P82()[7] },
      { ses: 'Dönüşten sonra motorları durdurup kısa bir süre bekliyoruz. Araba savrulmadan bir sonraki kenara hazırlanıyor.', yaz: P82()[8] + P82()[9] },
      { ses: 'Şimdi çalıştıralım! Araba dört kez ileri gidip sağa dönerek kareyi tamamlayacak ve başladığı yere dönecek.', calistir: true, parca: 0 },
      { ses: 'Kare tamam! Görevler sekmesinde sola kare, büyük kare ve U dönüşü gibi yeni şekiller deneyebilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Üçgen çiz',
        metin: 'Kare yerine <b>eşkenar üçgen</b> çiz: döngü <b>3</b> kez dönsün ve her dönüş <b>120 derece</b> (yaklaşık <b>507 ms</b>) olsun.',
        kod: KOD_82(), degistir: [{ ara: 'i < 4' }, { ara: 'delay(380)' }], cozum: KOD_82({ adet: 3, don: 507 }), sure: 6500,
        ipucu: 'i < 4 yerine i < 3 yaz, delay(380) yerine delay(507) yaz.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_DUZ);
          if (d.a.yol < 60 || d.a.yol > 90) return hata(`Araba ${Math.round(d.a.yol)} cm gitti; üçgenin 3 kenarı yaklaşık 75 cm etmeli.`);
          const k = kapali(d, 9, 20); if (k) return hata(k);
          return tamam('Üçgen tamam, araba başladığı yere döndü!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Gidiş-dönüş yolu',
        metin: 'Araba bir ileri gitsin, <b>180 derece</b> (yaklaşık <b>760 ms</b>) dönsün, geri gelsin ve tekrar dönsün. Döngü <b>2</b> kez çalışsın.',
        kod: KOD_82(), degistir: [{ ara: 'i < 4' }, { ara: 'delay(380)' }], cozum: KOD_82({ adet: 2, don: 760 }), sure: 5500,
        ipucu: 'i < 2 ve delay(760) yaz. Araba aynı doğru üzerinde gidip gelmeli.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_DUZ), s = sinirlar(d);
          if (d.a.yol < 40 || d.a.yol > 62) return hata(`Araba ${Math.round(d.a.yol)} cm gitti; iki kenar yaklaşık 50 cm etmeli.`);
          if (s.maxY - s.minY > 10) return hata('Araba aynı doğru üzerinde gidip gelmedi. Dönüşler 180 derece olmalı.');
          const k = kapali(d, 9, 20); if (k) return hata(k);
          return tamam('Araba gidip geldi ve aynı yere döndü!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Dönüş süresi hatası',
        metin: 'Bu kare bir türlü kapanmıyor! Dönüş süresi çok kısa olduğu için araba 90 derece dönemiyor. Süreyi <b>380 ms</b> yap.',
        kod: KOD_82({ don: 300 }), degistir: [{ ara: 'delay(300)' }], cozum: KOD_82(), sure: 8000,
        ipucu: 'saga() çağrısından sonraki delay(300) değerini 380 yap.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_DUZ);
          if (d.a.yol < 85) return hata('Araba kareyi tamamlamadı.');
          const k = kapali(d, 9, 20); if (k) return hata(k);
          return tamam('Dönüşler 90 derece oldu, kare kapandı!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'engelden-kacan': {
    sesli: [
      { ses: 'Şimdi arabamıza göz takıyoruz! Burnundaki ultrasonik sensörle önündeki engelin uzaklığını ölçecek ve engele yaklaşınca kaçacak.', parca: 0 },
      { ses: 'Ultrasonik sensör D dört pininde. Yorumdan sonra ileri ve geri fonksiyonlarını yazıyoruz; bunları önceki derslerden biliyoruz.', yaz: P83()[0] + P83()[1] + P83()[2], parca: 0 },
      { ses: 'Engelden kaçarken sağa döneceğiz, o yüzden saga fonksiyonu gerekli. Sola fonksiyonunu da hazır tutuyoruz.', yaz: P83()[3] + P83()[4] },
      { ses: 'Setup bölümünde motor pinlerini çıkış, mesafe sensörünün pinini giriş yapıyoruz.', yaz: P83()[5] },
      { ses: 'Loop içinde mesafe ölç fonksiyonu sensörden santimetre cinsinden uzaklığı okur. Engel otuz santimetreden yakınsa kaçma manevrasına başlıyoruz.', yaz: P83()[6], parca: 0 },
      { ses: 'Önce dört yüz milisaniye geri gidiyoruz. Böylece dönerken engele sürtmeyecek kadar boşluk kalıyor. Sonra üç yüz seksen milisaniye sağa dönüyoruz.', yaz: P83()[7] },
      { ses: 'Yol açıksa, yani engel uzaktaysa araba ileri gider. Her kontrol arasında elli milisaniye bekleyerek döngüyü bitiriyoruz.', yaz: P83()[8] },
      { ses: 'Şimdi çalıştıralım! Araba duvara yaklaşınca geri çekilip dönecek ve çarpmadan dolaşacak.', calistir: true, parca: 0 },
      { ses: 'Engelden kaçan arabamız hazır! Görevler sekmesinde tepki mesafesini, buzzer uyarısını ve LED ışığını deneyebilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Daha yakın tepki: 25 cm',
        metin: 'Araba engele 30 cm kala tepki veriyor. Eşiği <b>25 cm</b> yap; araba engele biraz daha yaklaşıp sonra geri dönsün.',
        kod: KOD_83(), degistir: [{ ara: '< 30' }], cozum: KOD_83({ esik: 25 }), sure: 5000,
        ipucu: 'mesafeOlc(D4) < 30 koşulundaki 30 yerine 25 yaz.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_ENGEL), g = ilkGeri(sim, d);
          if (!g) return hata('Araba engele yaklaşınca hiç geri gitmedi.');
          if (g.p.x < -42.5) return hata(`Araba çok erken geri gitti (x = ${Math.round(g.p.x)}). Eşik 25 cm olmalı.`);
          if (yukselen(sim, 'D1').length < 2) return hata('Araba kaçınma manevrasını tekrarlamadı.');
          return tamam('Eşik 25 cm: araba engele biraz daha yaklaşıp geri döndü!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Sola kaçsın',
        metin: 'Araba kaçarken sağa dönüyor. Bunu değiştir: engelden <b>sola</b> dönerek kaçsın.',
        kod: KOD_83(), degistir: [{ ara: 'saga();' }], cozum: KOD_83({ yon: 'sola' }), sure: 5000,
        ipucu: 'Dönüş fonksiyonunu saga() yerine sola() yap.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_ENGEL), g = ilkGeri(sim, d);
          if (!g) return hata('Araba engele yaklaşınca hiç geri gitmedi.');
          const yon = yonT(sim, SAHNE_ENGEL, g.t + 800);
          if (aciFark(yon, 90) > 30) return hata(`Araba sola dönmedi (yön ${Math.round(yon)} derece). Sola dönüşte sol motor geri, sağ motor ileri çalışır.`);
          return tamam('Araba engelden sola dönerek kaçtı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Daha uzun geri çekilme',
        metin: 'Araba engelden kaçarken geri çekilme süresini <b>600 ms</b> yap; engelden daha fazla uzaklaşsın.',
        kod: KOD_83(), degistir: [{ ara: 'delay(400)' }], cozum: KOD_83({ geriMs: 600 }), sure: 5000,
        ipucu: 'geri() çağrısından sonraki delay(400) değerini 600 yap.',
        kontrol(sim) {
          const ilk = yukselen(sim, 'D1')[0];
          if (!ilk) return hata('Araba engele yaklaşınca hiç geri gitmedi.');
          const son = dusen(sim, 'D1').find(o => o.t > ilk.t);
          if (!son) return hata('Geri hareket bitmedi.');
          const sure = son.t - ilk.t;
          if (sure < 550 || sure > 750) return hata(`Araba ${Math.round(sure)} ms geri gitti; yaklaşık 600 ms gitmeli.`);
          return tamam('Araba 600 ms geri çekildi!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'cizgi-izleyen': {
    sesli: [
      { ses: 'Son robot arabamız çizgi izleyici! Zeminde siyah bir çizgi var ve arabanın altında iki sensör bu çizgiyi arıyor.', parca: 0 },
      { ses: 'Sensörler siyah çizgi üstündeyken bir, beyaz zeminde sıfır okur. Önce bir yorum yazıp ileri fonksiyonunu tanımlıyoruz.', yaz: P84()[0] + P84()[1], parca: 0 },
      { ses: 'Çizgi solda kalırsa sola dönmemiz lazım. Sola fonksiyonu sol motoru geri, sağ motoru ileri çalıştırarak arabayı olduğu yerde sola çevirir.', yaz: P84()[2] },
      { ses: 'Sağa fonksiyonu da tersini yapar. Çizgi sağda kalırsa araba olduğu yerde sağa döner.', yaz: P84()[3] },
      { ses: 'Setup bölümünde motor pinlerini çıkış, iki çizgi sensörünün pinlerini giriş yapıyoruz. Yarışa başlamadan önce bir saniye de bekliyoruz.', yaz: P84()[4] },
      { ses: 'Loop içinde önce iki sensörü okuyoruz. Sol sensör D beşte, sağ sensör D altıda.', yaz: P84()[5], parca: 0 },
      { ses: 'Sol sensör çizgiyi görürse sola dönüyoruz. Değilse ve sağ sensör görüyorsa sağa dönüyoruz. İkisi de görmüyorsa çizgi arabanın tam ortasında demektir, düz ileri gidiyoruz.', yaz: P84()[6].slice(0, P84()[6].indexOf('  delay')) },
      { ses: 'Sonunda elli milisaniye bekliyoruz. Bu süre çok uzun olursa araba iki ölçüm arasında çizgiyi kaçırır.', yaz: P84()[6].slice(P84()[6].indexOf('  delay')) },
      { ses: 'Şimdi çalıştıralım! Araba çizgiden ayrılmadan parkuru dolaşmalı.', calistir: true, parca: 0 },
      { ses: 'Çizgi izleyen arabamız hazır! Görevler sekmesinde buzzer, seri monitör ve LED ile geliştirmeler yapabilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Üç saniye hazırlık',
        metin: 'Araba yarışa başlamadan önce 1 saniye bekliyor. Bekleme süresini <b>3 saniye (3000 ms)</b> yap.',
        kod: KOD_84(), degistir: [{ ara: 'delay(1000)' }], cozum: KOD_84({ bekle: 3000 }), sure: 7500,
        ipucu: 'setup içindeki delay(1000) değerini 3000 yap.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_CIZGI), ilk = ilkHareket(sim);
          if (!ilk) return hata('Araba hiç hareket etmedi.');
          if (ilk.t < 2800) return hata(`Araba ${Math.round(ilk.t)} ms sonra hareket etti; 3000 ms beklemeli.`);
          if (d.a.yol < 60) return hata('Araba bekledikten sonra yeterince ilerlemedi.');
          if (d.a.carpti || enBuyukSapma(d) > 6) return hata('Araba çizgiden çıktı.');
          return tamam('Araba 3 saniye bekleyip çizgiyi izlemeye başladı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ters bağlanmış sensörler',
        metin: 'Araba çizgiden hemen kaçıyor! Sol ve sağ sensör pinleri kodda ters okunuyor. <b>Sol sensörü D5, sağ sensörü D6</b> olarak düzelt.',
        kod: KOD_84({ solPin: 'D6', sagPin: 'D5' }), degistir: [{ ara: 'digitalRead(D6)' }, { ara: 'digitalRead(D5)' }], cozum: KOD_84(), sure: 8000,
        ipucu: 'int sol = digitalRead(D5); ve int sag = digitalRead(D6); olmalı.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_CIZGI);
          if (d.a.carpti) return hata('Araba çizgiden çıkıp duvara çarptı. Sensör pinleri doğru okunuyor mu?');
          const sapma = enBuyukSapma(d);
          if (sapma > 6) return hata(`Araba çizgiden ${Math.round(sapma)} cm uzaklaştı.`);
          if (d.a.yol < 100) return hata('Araba çizgiyi izleyerek yeterince ilerlemedi.');
          return tamam('Sensörler doğru okunuyor, araba çizgide!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Çok yavaş kontrol',
        metin: 'Araba çizgiyi sürekli kaçırıyor çünkü iki ölçüm arasında yarım saniye bekliyor. Kontrol aralığını <b>50 ms</b> yap.',
        kod: KOD_84({ dongu: 500 }), degistir: [{ ara: 'delay(500)' }], cozum: KOD_84(), sure: 8000,
        ipucu: 'loop sonundaki delay(500) değerini 50 yap.',
        kontrol(sim) {
          const d = durum(sim, SAHNE_CIZGI);
          if (d.a.carpti) return hata('Araba çizgiyi kaçırıp duvara çarptı. Ölçümler arasındaki bekleme çok uzun.');
          const sapma = enBuyukSapma(d);
          if (sapma > 6) return hata(`Araba çizgiden ${Math.round(sapma)} cm uzaklaştı. Ölçümleri daha sık yap.`);
          if (d.a.yol < 100) return hata('Araba çizgiyi izleyerek yeterince ilerlemedi.');
          return tamam('Araba artık çizgiyi kaçırmıyor!');
        },
      },
    ],
  },
};
