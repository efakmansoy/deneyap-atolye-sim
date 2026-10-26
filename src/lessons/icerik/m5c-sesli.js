// Modül 5 ek içerik (5.3 LCD termometre, 5.4 Elektronik zar): sesli anlatım + "kodu değiştir" görevleri.
// Şema için m1-sesli.js ve m5-sesli.js dosyalarına bak.
import { termoKontrol, zarKontrol, zarGirdi, sicakGirdi, sicakSure, derece, ZAR_SURE } from '../m5b-ek.js';

const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });

// ── Başlangıç/çözüm programları ──
const TERMO = ({ kosul = 'sicaklik > 30', ondalik = 1, uyari = 'SICAK!', formul = 'ham * 50.0 / 4095.0', birim = 'C' } = {}) => `#include <LiquidCrystal_I2C.h>

#define SENSOR A1

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sicaklik");
}

void loop() {
  int ham = analogRead(SENSOR);
  float sicaklik = ${formul};
  lcd.setCursor(0, 1);
  lcd.print(sicaklik, ${ondalik});
  if (${kosul}) {
    lcd.print(" ${birim} ${uyari}   ");
  } else {
    lcd.print(" ${birim}          ");
  }
  delay(200);
}
`;

const ZAR = ({ ust = 7, kare = 10, bekle = 70, sutun = 0, baslik = 'Zar At' } = {}) => `#include <LiquidCrystal_I2C.h>

#define DUGME D5

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  pinMode(DUGME, INPUT);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("${baslik}");
}

void loop() {
  if (digitalRead(DUGME) == HIGH) {
    for (int i = 0; i < ${kare}; i++) {
      lcd.setCursor(${sutun}, 1);
      lcd.print(random(1, ${ust}));
      delay(${bekle});
    }
    while (digitalRead(DUGME) == HIGH) {
      delay(10);
    }
  }
}
`;

export default {
  'lcd-termometre': {
    sesli: [
      { ses: 'Bugün kartımızı bir termometreye çevireceğiz! Sıcaklık sensörünün verdiği sayıyı derece olarak LCD ekranda göstereceğiz. Önce ekran kütüphanesini ekliyoruz.', yaz: '#include <LiquidCrystal_I2C.h>\n\n', parca: 1 },
      { ses: 'Sensör A bir pinine bağlı, bu yüzden pine SENSOR adını veriyoruz. Sonra ekranımızı tanımlıyoruz: on altı sütun, iki satır.', yaz: '#define SENSOR A1\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n', parca: 0 },
      { ses: 'Setup bölümünde ekranı başlatıp arka ışığını açıyoruz. Üst satıra bir kez başlık yazıyoruz: Sicaklik. Başlık değişmeyeceği için loop içinde tekrar yazmaya gerek yok.', yaz: 'void setup() {\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Sicaklik");\n}\n\n', parca: 1 },
      { ses: 'Loop bölümünde önce sensörü okuyoruz. Kartın analog girişi sıfırdan dört bin doksan beşe kadar bir sayı verir. Bu sayıyı ham adlı bir değişkende saklıyoruz.', yaz: 'void loop() {\n  int ham = analogRead(SENSOR);\n', parca: 0 },
      { ses: 'Şimdi dönüşüm zamanı. Bu sensörde sıfır derece sıfıra, elli derece dört bin doksan beşe denk geliyor. Yani hamı elliyle çarpıp dört bin doksan beşe bölersek derece çıkar. Sayıların sonuna nokta sıfır yazdık ki bölme ondalıklı yapılsın.', yaz: '  float sicaklik = ham * 50.0 / 4095.0;\n', parca: 0 },
      { ses: 'Sonucu ekranın ikinci satırına yazıyoruz. Virgülden sonra bir basamak göstermesi için sayının yanına bir yazıyoruz.', yaz: '  lcd.setCursor(0, 1);\n  lcd.print(sicaklik, 1);\n', parca: 1 },
      { ses: 'Şimdi uyarı. Sıcaklık otuz dereceden büyükse yanına Sıcak ünlem yazıyoruz, değilse sadece C harfi yazıyoruz. Yazıların sonundaki boşluklar eski harfleri siler, çünkü ekran eski yazıyı kendiliğinden temizlemez.', yaz: '  if (sicaklik > 30) {\n    lcd.print(" C SICAK!   ");\n  } else {\n    lcd.print(" C          ");\n  }\n', parca: 1 },
      { ses: 'Son olarak iki yüz milisaniye bekliyoruz. Ekran saniyede beş kez güncellenir, bu da bir termometre için fazlasıyla yeterli.', yaz: '  delay(200);\n}\n' },
      { ses: 'Şimdi çalıştıralım! Sahnedeki sıcaklık kaydırıcısını sağa sola çek. Otuz dereceyi geçince uyarının çıktığını göreceksin.', calistir: true, parca: 0 },
      { ses: 'Harika, termometren hazır! Görevler sekmesinde eşiği, yazı biçimini ve birimi kendin değiştireceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Eşiği 25 yap',
        metin: 'Uyarı şu an <b>30 °C</b> üstünde çıkıyor. İşaretli sayıyı değiştirerek uyarıyı <b>25 °C</b> üstüne çek. Böylece 28 °C gibi ılık bir ortamda da SICAK! yazar.',
        kod: TERMO(),
        cozum: TERMO({ kosul: 'sicaklik > 25' }),
        degistir: [{ ara: 'sicaklik > 30' }],
        ipucu: 'Karşılaştırmadaki otuzu yirmi beş yap. İşareti ve değişken adını değiştirme.',
        sure: sicakSure(6),
        girdi: sicakGirdi([800, 1800, 2300, 3500, 1200, 3000]),
        kontrol(sim) {
          const s = termoKontrol(sim, { esik: 25 });
          return s.ok ? tamam('Uyarı artık 25 °C üstünde çıkıyor!') : s;
        },
      },
      {
        tip: 'duzenle', baslik: 'Tam sayı göster',
        metin: 'Ekran sıcaklığı <b>36.6</b> gibi ondalıklı gösteriyor. Sıcaklık <b>tam sayı</b> olarak (<b>37</b> gibi, virgülden sonrası olmadan) görünsün. İşaretli satırdaki ondalık basamak sayısını değiştir.',
        kod: TERMO(),
        cozum: TERMO({ ondalik: 0 }),
        degistir: [{ ara: 'lcd.print(sicaklik, 1)' }],
        ipucu: 'print komutundaki ikinci sayı, virgülden sonra kaç basamak yazılacağını söyler. Sıfır yazarsan hiç ondalık basamak olmaz.',
        sure: sicakSure(6),
        girdi: sicakGirdi([800, 2000, 3000, 2300, 3900, 1200]),
        kontrol(sim) {
          const s = termoKontrol(sim, { tamSayi: true });
          return s.ok ? tamam('Sıcaklık tam sayı olarak görünüyor!') : s;
        },
      },
      {
        tip: 'duzenle', baslik: 'Fahrenheit',
        metin: 'Bir arkadaşın sıcaklığı <b>Fahrenheit</b> (°F) olarak görmek istiyor. Dönüşüm: <code>F = C * 1.8 + 32</code>. Formülü uzat, uyarı eşiğini <b>86</b>\'ya çıkar (30 °C = 86 °F) ve iki yazıda birimi <b>F</b> yap.',
        kod: TERMO(),
        cozum: TERMO({ formul: 'ham * 50.0 / 4095.0 * 1.8 + 32', kosul: 'sicaklik > 86', birim: 'F' }),
        degistir: [{ ara: 'ham * 50.0 / 4095.0' }, { ara: 'sicaklik > 30' }, { ara: '" C SICAK!   "' }, { ara: '" C          "' }],
        ipucu: 'Formülün sonuna * 1.8 + 32 ekle. Eşik 86 olsun. Tırnak içindeki C harflerini F yap, boşluk sayılarını değiştirme.',
        sure: sicakSure(6),
        girdi: sicakGirdi([800, 2000, 3000, 2300, 3900, 1200]),
        kontrol(sim) {
          const s = termoKontrol(sim, { don: a => derece(a) * 1.8 + 32, esik: 86, birim: 'F' });
          return s.ok ? tamam('Sıcaklık Fahrenheit olarak görünüyor ve uyarı doğru çalışıyor!') : s;
        },
      },
    ],
  },

  'elektronik-zar': {
    sesli: [
      { ses: 'Bugün elektronik bir zar yapıyoruz! Düğmeye basınca ekranda sayılar hızla değişecek, sonra rastgele bir sayıda duracak. Önce ekran kütüphanesini ekleyelim.', yaz: '#include <LiquidCrystal_I2C.h>\n\n', parca: 1 },
      { ses: 'Düğme D beş pinine bağlı, ona DUGME adını veriyoruz. Sonra ekran nesnemizi tanımlıyoruz.', yaz: '#define DUGME D5\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n', parca: 0 },
      { ses: 'Setup bölümünde düğme pinini giriş olarak ayarlıyoruz, çünkü düğmeden bilgi okuyacağız. Sonra ekranı başlatıp arka ışığı açıyoruz.', yaz: 'void setup() {\n  pinMode(DUGME, INPUT);\n  lcd.init();\n  lcd.backlight();\n', parca: 0 },
      { ses: 'Üst satıra bir kez Zar At yazısı yazıyoruz. Alt satır sonuç için boş kalacak.', yaz: '  lcd.setCursor(0, 0);\n  lcd.print("Zar At");\n}\n\n', parca: 1 },
      { ses: 'Loop bölümünde düğmeyi sürekli kontrol ediyoruz. Düğmeye basılınca pin yüksek okunur. Sadece o zaman zar atacağız.', yaz: 'void loop() {\n  if (digitalRead(DUGME) == HIGH) {\n', parca: 0 },
      { ses: 'Yuvarlanma animasyonu için on tur dönen bir döngü kuruyoruz. Her turda alt satırın başına rastgele bir sayı yazıyoruz. Random komutu alt sınırı dahil eder ama üst sınırı dahil etmez. Bire altı arası sayı için yedi yazıyoruz.', yaz: '    for (int i = 0; i < 10; i++) {\n      lcd.setCursor(0, 1);\n      lcd.print(random(1, 7));\n', parca: 1 },
      { ses: 'Her sayıdan sonra yetmiş milisaniye bekliyoruz. Sayılar o kadar hızlı değişiyor ki zar yuvarlanıyormuş gibi görünüyor. Son tur bitince ekranda kalan sayı bizim zarımızın sonucu.', yaz: '      delay(70);\n    }\n' },
      { ses: 'Düğmeye basılı tutulursa zar tekrar tekrar atılmasın diye, düğme bırakılana kadar bekliyoruz. Bu bekleme sırasında kısa aralıklarla düğmeyi kontrol ediyoruz.', yaz: '    while (digitalRead(DUGME) == HIGH) {\n      delay(10);\n    }\n  }\n}\n', parca: 0 },
      { ses: 'Şimdi çalıştır ve sahnedeki düğmeye bas! Birkaç kez at ve her seferinde farklı sayı geldiğini gör.', calistir: true, parca: 0 },
      { ses: 'Zarın hazır! Görevler sekmesinde zarın yüzlerini, süresini ve yerini kendin değiştireceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Sekiz yüzlü zar',
        metin: 'Bu zar 1-6 arası sayı veriyor. Oyun masasında <b>sekiz yüzlü</b> bir zar gerekiyor: sayılar <b>1-8</b> arası olsun. Üst sınırın dahil olmadığını unutma!',
        kod: ZAR(),
        cozum: ZAR({ ust: 9 }),
        degistir: [{ ara: 'random(1, 7)' }],
        ipucu: 'Üst sınır dahil değildir. Son sayıyı, istediğin en büyük sayıdan bir fazla yap.',
        sure: ZAR_SURE,
        girdi: zarGirdi(),
        kontrol(sim) {
          const s = zarKontrol(sim, { ust: 8, kapsama: false, gerekli: g => (g.has(7) || g.has(8)) ? null : '7 ya da 8 hiç görünmedi. Sayılar 1-8 arasında gelmeli: random(1, 9) yaz.' });
          return s.ok ? tamam('Sekiz yüzlü zar çalışıyor!') : s;
        },
      },
      {
        tip: 'duzenle', baslik: 'Daha uzun yuvarlanma',
        metin: 'Zar şu an yaklaşık yarım saniye yuvarlanıyor. Yuvarlanmayı <b>uzat</b>: döngü <b>15 tur</b> dönsün. Yuvarlanma yine de yaklaşık bir saniyede bitmeli.',
        kod: ZAR(),
        cozum: ZAR({ kare: 15 }),
        degistir: [{ ara: 'i < 10' }],
        ipucu: 'Döngü koşulundaki 10 sayısını 15 yap. Bekleme süresini değiştirmene gerek yok.',
        sure: ZAR_SURE,
        girdi: zarGirdi(),
        kontrol(sim) {
          const s = zarKontrol(sim, { sonDegisim: 700 });
          return s.ok ? tamam('Zar daha uzun yuvarlanıyor!') : s;
        },
      },
      {
        tip: 'duzenle', baslik: 'Ortaya al',
        metin: 'Sayı şu an ekranın sol başında görünüyor. İki değişiklik yap: sayıyı <b>8. sütuna</b> (sütun numarası <b>7</b>) kaydır ve üst satırdaki yazıyı <b>ZAR</b> olarak değiştir.',
        kod: ZAR(),
        cozum: ZAR({ sutun: 7, baslik: 'ZAR' }),
        degistir: [{ ara: 'Zar At' }, { ara: 'lcd.setCursor(0, 1)' }],
        ipucu: 'Sütunlar sıfırdan sayılır; setCursor komutundaki ilk sayıyı yedi yap. Yazıyı tırnakların içinde değiştir.',
        sure: ZAR_SURE,
        girdi: zarGirdi(),
        kontrol(sim) {
          const s = zarKontrol(sim);
          if (!s.ok) return s;
          const z = sim.cihaz.zar;
          if (!z.every(p => p.lcd[0].trim() === 'ZAR')) return hata('Üst satırda yalnızca ZAR yazmalı (büyük harflerle).');
          if (!z.every(p => /\d/.test(p.lcd[1][7] ?? ''))) return hata('Sayı 8. sütunda (sütun numarası 7) görünmeli. setCursor\'ın ilk sayısını 7 yap.');
          if (z.some(p => /\d/.test(p.lcd[1][0] ?? ''))) return hata('Sayı hâlâ satırın başında görünüyor.');
          return tamam('Sayı ortada, başlık ZAR!');
        },
      },
    ],
  },
};
