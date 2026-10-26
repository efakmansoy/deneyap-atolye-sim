// Modül 5 ek içerik: sesli anlatım (kod satır satır yazılır) + "kodu değiştir" görevleri.
// Şema için m1-sesli.js dosyasına bak.
const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });
const duz = s => String(s ?? '').toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
const lcdMetin = sim => (sim.cihaz.lcd ?? ['', '']).map(s => String(s ?? ''));
const canli = (sim, cihaz) => sim.cihaz === cihaz && !sim.iptal;
const SERVO = 'D4', ISIK = 'A0';

// LCD satır 2'de görülen sayıların (art arda tekrarsız) sırası
const sayiDizisi = sim => {
  const d = [];
  for (const k of [...(sim.cihaz.kayit ?? []), lcdMetin(sim)]) {
    const m = String(k[1] ?? '').trim();
    if (/^-?\d+$/.test(m) && d[d.length - 1] !== +m) d.push(+m);
  }
  return d;
};

// ── Işık senaryosu: her değer için 1800 ms bekler, servo ve LCD durumunu kaydeder
const isikGirdi = degerler => async sim => {
  const cihaz = sim.cihaz; cihaz.kayit = [];
  for (const deger of degerler) {
    sim.analog[ISIK] = deger;
    await sim.bekle(1800);
    if (!canli(sim, cihaz)) return;
    cihaz.kayit.push({ isik: deger, servo: cihaz.servo?.[SERVO], lcd: lcdMetin(sim).join('|') });
  }
};

// ── Başlangıç/çözüm programları
const LCD = (ad, baslangic, kosul, artis, ust, sutun) => `#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("${ad}");
  for (int i = ${baslangic}; i ${kosul}; i${artis}) {
    lcd.setCursor(${sutun}, 1);
    lcd.print(i);
    delay(500);
  }
}

void loop() {
}
`;

const PERDE = (esik = '>', sayi = 2000, ac = 180, acikYazi = 'Perde: Acik     ', kapaliYazi = 'Perde: Kapali   ') => `#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>

#define ISIK A0
#define SERVO_PIN D4

Servo perde;
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  perde.attach(SERVO_PIN);
  lcd.init();
  lcd.backlight();
}

void loop() {
  int isik = analogRead(ISIK);
  lcd.setCursor(0, 0);
  if (isik ${esik} ${sayi}) {
    perde.write(${ac});
    lcd.print("${acikYazi}");
  } else {
    perde.write(0);
    lcd.print("${kapaliYazi}");
  }
  delay(100);
}
`;

export default {
  'lcd-merhaba': {
    sesli: [
      { ses: 'Bugün kartımıza bir ekran bağlıyoruz! Bu, on altıya iki karakterlik bir LCD ekran. Yani iki satırı var ve her satıra on altı harf sığıyor. Kart artık bize yazıyla cevap verebilecek.', yaz: '#include <LiquidCrystal_I2C.h>\n\n', parca: 0 },
      { ses: 'Ekranı kullanmak için hazır bir kütüphane ekledik. Kütüphane, ekranla konuşmanın zor kısımlarını bizim yerimize halleder. Şimdi ekranımıza bir isim verelim: lcd.', yaz: 'LiquidCrystal_I2C lcd(0x27, 16, 2);\n\n', parca: 0 },
      { ses: 'Parantezin içinde ekranın adresi ve boyutu var. On altı sütun, iki satır. Şimdi setup bölümünde ekranı başlatalım ve arka ışığını açalım.', yaz: 'void setup() {\n  lcd.init();\n  lcd.backlight();\n', parca: 0 },
      { ses: 'Yazmadan önce imleci yerleştiriyoruz. İlk sayı sütunu, ikinci sayı satırı gösterir. Saymaya sıfırdan başlanır, yani sıfır, ilk satır demektir. Sonra Merhaba yazıyoruz.', yaz: '  lcd.setCursor(0, 0);\n  lcd.print("Merhaba");\n', parca: 0 },
      { ses: 'Şimdi ikinci satırda bir sayaç yapalım. Bir for döngüsü kuruyoruz. Değişkenimiz i, birden başlıyor, beşe kadar gidiyor ve her turda bir artıyor.', yaz: '  for (int i = 1; i <= 5; i++) {\n' },
      { ses: 'Döngünün içinde imleci ikinci satırın başına götürüyoruz, yani sütun sıfır, satır bir. Sonra i değişkeninin o anki değerini yazdırıyoruz.', yaz: '    lcd.setCursor(0, 1);\n    lcd.print(i);\n', parca: 0 },
      { ses: 'Sayılar çok hızlı geçmesin diye beş yüz milisaniye bekliyoruz. Döngüyü ve setup bölümünü kapatıyoruz. Loop bu derste boş kalacak, çünkü sayma işini bir kez yapmamız yeter.', yaz: '    delay(500);\n  }\n}\n\nvoid loop() {\n}\n' },
      { ses: 'Şimdi çalıştıralım! Üst satırda Merhaba yazıyor, alt satırda sayılar birden beşe kadar artıyor.', calistir: true, parca: 0 },
      { ses: 'Çok güzel! Şimdi Görevler sekmesine geç. Orada yazıları, sayma yönünü ve sayının ekrandaki yerini kendin değiştireceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Yazıyı değiştir',
        metin: 'Ekranın ilk satırında <b>Merhaba</b> yazıyor. İşaretli yazıyı <b>Selam</b> olarak değiştir. Tırnak işaretlerini silme!',
        kod: LCD('Merhaba', 1, '<= 5', '++', 0, 0),
        cozum: LCD('Selam', 1, '<= 5', '++', 0, 0),
        degistir: [{ ara: 'Merhaba' }],
        ipucu: 'Yazı, çift tırnağın içindedir. Sadece harfleri değiştir.',
        kontrol(sim) {
          const kayit = [...(sim.cihaz.kayit ?? []), lcdMetin(sim)];
          if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı.');
          if (kayit.some(k => duz(k[0]).includes('selam'))) return tamam('Ekranda Selam yazıyor!');
          return hata('Satır 1\'de "Selam" yazmalı. Tırnak içindeki yazıyı değiştir.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Geri sayım',
        metin: 'Sayaç şu an birden beşe sayıyor. İşaretli üç yeri değiştirerek <b>beşten bire geriye</b> saymasını sağla: başlangıç, koşul ve artış.',
        kod: LCD('Merhaba', 1, '<= 5', '++', 0, 0),
        cozum: LCD('Merhaba', 5, '>= 1', '--', 0, 0),
        degistir: [{ ara: 'int i = 1' }, { ara: 'i <= 5' }, { ara: 'i++' }],
        ipucu: 'Beşten başla, i sıfıra düşmeden dur (i büyük eşit bir olsun) ve her turda bir azalt (i, eksi eksi).',
        kontrol(sim) {
          const d = sayiDizisi(sim);
          if (!d.length) return hata('Satır 2\'de sayı görünmedi.');
          const ist = [5, 4, 3, 2, 1];
          return d.join(',') === ist.join(',') ? tamam('Geri sayım çalışıyor: 5, 4, 3, 2, 1!') : hata(`Ekranda sayılar şu sırayla göründü: ${d.join(', ')}. İstenen: 5, 4, 3, 2, 1.`);
        },
      },
      {
        tip: 'duzenle', baslik: 'Sayıyı sağa al',
        metin: 'İkinci satırdaki sayı sol başta görünüyor. İşaretli sütun numarasını değiştirip sayıyı satırın <b>en sağına</b> (on beşinci sütuna) al. Ayrıca ilk satırdaki yazıyı <b>Selam</b> yap.',
        kod: LCD('Merhaba', 1, '<= 5', '++', 0, 0),
        cozum: LCD('Selam', 1, '<= 5', '++', 0, 15),
        degistir: [{ ara: 'Merhaba' }, { ara: 'lcd.setCursor(0, 1)' }],
        ipucu: 'Sütunlar sıfırdan başlar ve on altı sütun vardır. En sağ sütun numarası on beştir.',
        kontrol(sim) {
          const kayit = [...(sim.cihaz.kayit ?? []), lcdMetin(sim)];
          if (!sim.cihaz.lcd) return hata('Ekrana henüz bir şey yazılmadı.');
          if (!kayit.some(k => duz(k[0]).includes('selam'))) return hata('Satır 1\'de "Selam" yazmalı.');
          const sag = kayit.some(k => /\d/.test(String(k[1] ?? '')[15] ?? ''));
          const sol = kayit.some(k => /\d/.test(String(k[1] ?? '')[0] ?? ''));
          if (sol) return hata('Sayı hâlâ satırın başında görünüyor. setCursor\'ın ilk sayısını büyüt.');
          return sag ? tamam('Sayı sağ köşede, Selam yukarıda. Süper!') : hata('Sayı satırın en sağ köşesinde (sütun 15) görünmeli.');
        },
      },
    ],
  },

  'proje-perde': {
    sesli: [
      { ses: 'Bugün gerçek bir proje yapıyoruz: kendi kendine açılıp kapanan akıllı perde! Pencereden giren güneş ışığına göre perde açılacak ya da kapanacak. Önce gerekli kütüphaneleri ekliyoruz.', yaz: '#include <ESP32Servo.h>\n#include <LiquidCrystal_I2C.h>\n\n', parca: 0 },
      { ses: 'Işık sensörü A sıfır pinine, perdeyi çeken servo motor D dört pinine bağlı. Pinlere anlamlı isimler veriyoruz.', yaz: '#define ISIK A0\n#define SERVO_PIN D4\n\n', parca: 0 },
      { ses: 'Şimdi iki nesne tanımlıyoruz. Perde adlı bir servo motor ve ekranımız. Servo, istediğimiz açıya dönebilen bir motordur.', yaz: 'Servo perde;\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n', parca: 0 },
      { ses: 'Setup bölümünde servoyu D dört pinine bağlıyoruz, ekranı başlatıp arka ışığını yakıyoruz.', yaz: 'void setup() {\n  perde.attach(SERVO_PIN);\n  lcd.init();\n  lcd.backlight();\n}\n\n', parca: 0 },
      { ses: 'Loop bölümünde önce ışığı ölçüyoruz. Kartın analog girişi on iki bit çalışır, yani sıfırdan dört bin doksan beşe kadar bir sayı verir. Büyük sayı çok ışık demektir. Sonra ekranda yazı yazacağımız yere gidiyoruz.', yaz: 'void loop() {\n  int isik = analogRead(ISIK);\n  lcd.setCursor(0, 0);\n', parca: 0 },
      { ses: 'Şimdi karar veriyoruz. Işık iki bin den büyükse gün ışığı var demektir. Perdeyi yüz seksen dereceye çevirip açıyoruz ve ekrana Perde iki nokta Açık yazıyoruz.', yaz: '  if (isik > 2000) {\n    perde.write(180);\n    lcd.print("Perde: Acik     ");\n', parca: 0 },
      { ses: 'Değilse, yani ortam karanlıksa perdeyi sıfır dereceye getirip kapatıyoruz ve ekrana Kapalı yazıyoruz. Ekranda Türkçe harf kullanmıyoruz, çünkü ekran onları gösteremez.', yaz: '  } else {\n    perde.write(0);\n    lcd.print("Perde: Kapali   ");\n  }\n', parca: 1 },
      { ses: 'Son olarak yüz milisaniye bekleyip döngüyü kapatıyoruz. Program saniyede on kez ışığı kontrol eder. Bu, perde için fazlasıyla hızlıdır.', yaz: '  delay(100);\n}\n' },
      { ses: 'Şimdi çalıştır ve penceredeki güneşi yukarı aşağı sürükle! Işık artınca perde açılıyor, azalınca kapanıyor.', calistir: true, parca: 0 },
      { ses: 'Projen çalışıyor! Görevler sekmesinde perdenin davranışını değiştirerek kendi akıllı perdeni tasarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Sadece çok parlakta aç',
        metin: 'Perde şu an ışık iki binden büyük olunca açılıyor. İşaretli sayıyı değiştir: perde <b>sadece çok parlak ışıkta</b> (üç bin ve üzeri) açılsın. Orta ışıkta (yaklaşık iki bin beş yüz) kapalı kalsın.',
        kod: PERDE('>', 2000),
        cozum: PERDE('>', 3000),
        degistir: [{ ara: '2000' }],
        ipucu: 'Eşik büyüdükçe perdenin açılması için gereken ışık da artar. İki bin beş yüzden büyük, üç bin beşyüzden küçük bir eşik seç, örneğin 3000.',
        sure: 10000,
        girdi: isikGirdi([2500, 3600, 1000, 3300]),
        kontrol(sim) {
          const k = sim.cihaz.kayit ?? [];
          if (k.length < 4) return hata('Program ışığı sürekli izlemeli, döngüyü bozma.');
          const orta = k.filter(x => x.isik === 2500), parlak = k.filter(x => x.isik >= 3300);
          if (!parlak.every(x => x.servo >= 150)) return hata('Çok parlak ışıkta perde açılmadı. Eşik fazla büyük olmasın (3000 gibi).');
          if (!orta.every(x => x.servo != null && x.servo <= 30)) return hata('Orta ışıkta (2500) perde hâlâ açılıyor. Eşiği 2500\'den büyük yap.');
          return tamam('Perde artık sadece çok parlak ışıkta açılıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yarım açık perde',
        metin: 'Perde ışıkta tamamen açılıyor (yüz seksen derece). İşaretli açıyı <b>doksan</b> yap ve ekran yazısını <b>Perde: Yari</b> olarak değiştir. Karanlıkta eskisi gibi kapanmaya devam etsin.',
        kod: PERDE('>', 2000, 180),
        cozum: PERDE('>', 2000, 90, 'Perde: Yari     '),
        degistir: [{ ara: 'perde.write(180)' }, { ara: 'Perde: Acik' }],
        ipucu: 'write komutunun parantezindeki sayı servonun açısıdır. Yazıda sadece Acik kelimesini değiştirmen yeter.',
        sure: 10000,
        girdi: isikGirdi([400, 3600, 300, 3900]),
        kontrol(sim) {
          const k = sim.cihaz.kayit ?? [];
          if (k.length < 4) return hata('Program ışığı sürekli izlemeli.');
          const aydin = k.filter(x => x.isik > 2000), karanlik = k.filter(x => x.isik < 1500);
          if (!aydin.every(x => x.servo != null && x.servo >= 80 && x.servo <= 100)) return hata('Işıkta perde yaklaşık doksan dereceye açılmalı.');
          if (!aydin.every(x => duz(x.lcd).includes('yari'))) return hata('Işıkta ekranda "Perde: Yari" yazmalı.');
          if (!karanlik.every(x => x.servo != null && x.servo <= 30 && duz(x.lcd).includes('kapali'))) return hata('Karanlıkta perde kapanmalı ve ekranda Kapali yazmalı. Bu kısma dokunma.');
          return tamam('Perde yarım açılıyor ve ekran doğru yazıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ters çalışan perde',
        metin: 'Bu perde ışık varken açılıyor. Biz <b>tersini</b> istiyoruz: ortam <b>karanlıkken açılsın</b>, ışıkta kapansın. Karşılaştırma işaretini ters çevir.',
        kod: PERDE('>', 2000),
        cozum: PERDE('<', 2000, 180, 'Perde: Acik     ', 'Perde: Kapali   '),
        degistir: [{ ara: 'isik > 2000' }],
        ipucu: 'Büyüktür işareti ile küçüktür işareti birbirinin tersidir. Karanlıkta sayı küçük olur.',
        sure: 10000,
        girdi: isikGirdi([400, 3600, 300, 3900]),
        kontrol(sim) {
          const k = sim.cihaz.kayit ?? [];
          if (k.length < 4) return hata('Program ışığı sürekli izlemeli.');
          const aydin = k.filter(x => x.isik > 2000), karanlik = k.filter(x => x.isik < 1500);
          if (!karanlik.every(x => x.servo != null && x.servo >= 150)) return hata('Karanlıkta perde açılmalı (servo 180). Karşılaştırma işaretini ters çevir.');
          if (!aydin.every(x => x.servo != null && x.servo <= 30)) return hata('Işıkta perde kapanmalı (servo 0).');
          if (!karanlik.every(x => duz(x.lcd).includes('acik'))) return hata('Perde açıkken ekranda "Perde: Acik" yazmalı.');
          return tamam('Perde ters çalışıyor: karanlıkta açıp ışıkta kapatıyor!');
        },
      },
    ],
  },
};
