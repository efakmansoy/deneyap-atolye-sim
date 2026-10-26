// Modül 6 için sesli anlatım parçaları ve "kodu değiştir" görevleri
import { olaylar, lcdMetin, duz, tamam, hata, mesafeSenaryo, analogSenaryo, dugmeSenaryo } from '../m6-projeler.js';

// ── 6.1 Çözüm ve Görev Kodları ──
const KOD_61 = (mesafeEsik = 20, bekleme = 2000) => `#include <ESP32Servo.h>

Servo servo;

void setup() {
  servo.attach(D5);
  servo.write(0);
}

void loop() {
  if (mesafeOlc(D3) < ${mesafeEsik}) {
    servo.write(90);
    delay(${bekleme});
    servo.write(0);
  }
  delay(50);
}
`;

// ── 6.2 Kişi Sayacı Çözüm ve Kodları ──
const KOD_62 = (esik = 30, frekans = 1500) => `#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
int sayac = 0;

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Kisi Sayisi:");
  lcd.setCursor(0, 1);
  lcd.print(sayac);
}

void loop() {
  if (mesafeOlc(D3) < ${esik}) {
    sayac += 1;
    tone(D8, ${frekans});
    delay(100);
    noTone(D8);
    lcd.setCursor(0, 1);
    lcd.print(sayac);
    lcd.print("   ");
    while (mesafeOlc(D3) < ${esik}) {
      delay(20);
    }
  }
  delay(30);
}
`;

// ── 6.3 Yem Verici Çözüm ve Kodları ──
const KOD_63 = (aci = 90, bekleme = 1000) => `#include <ESP32Servo.h>

Servo servo;

void setup() {
  pinMode(D2, INPUT);
  servo.attach(D5);
  servo.write(0);
}

void loop() {
  if (digitalRead(D2) == HIGH) {
    tone(D8, 1000);
    delay(300);
    noTone(D8);
    servo.write(${aci});
    delay(${bekleme});
    servo.write(0);
    while (digitalRead(D2) == HIGH) {
      delay(20);
    }
  }
  delay(30);
}
`;

// ── 6.4 Hırsız Alarmı Çözüm ve Kodları ──
const KOD_64 = (esik = 1500, delayMs = 150) => `void setup() {
  pinMode(D0, OUTPUT);
  pinMode(D8, OUTPUT);
}

void loop() {
  if (analogRead(A0) < ${esik}) {
    digitalWrite(D0, HIGH);
    tone(D8, 1200);
    delay(${delayMs});
    digitalWrite(D0, LOW);
    tone(D8, 800);
    delay(${delayMs});
  } else {
    digitalWrite(D0, LOW);
    noTone(D8);
    delay(50);
  }
}
`;

// ── 6.5 Otopark Bariyeri Çözüm ve Kodları ──
const KOD_65 = (esik = 25, aci = 90) => `#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>

Servo servo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  servo.attach(D5);
  servo.write(0);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Otopark");
  lcd.setCursor(0, 1);
  lcd.print("DUR         ");
}

void loop() {
  if (mesafeOlc(D3) < ${esik}) {
    servo.write(${aci});
    lcd.setCursor(0, 1);
    lcd.print("Geciniz     ");
  } else {
    servo.write(0);
    lcd.setCursor(0, 1);
    lcd.print("DUR         ");
  }
  delay(50);
}
`;

// ── 6.6 Güneş Takipçi Çözüm ve Kodları ──
const KOD_66 = (maxAci = 180) => `#include <ESP32Servo.h>

Servo servo;

void setup() {
  servo.attach(D5);
}

void loop() {
  int isik = analogRead(A0);
  int aci = map(isik, 0, 4095, 0, ${maxAci});
  servo.write(aci);
  delay(30);
}
`;

// ── 6.7 Güneş Paneli İstasyonu Çözüm ve Kodları ──
const KOD_67 = (esik = 50) => `#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  pinMode(D0, OUTPUT);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Gunes Paneli");
}

void loop() {
  int isik = analogRead(A0);
  int guc = map(isik, 0, 4095, 0, 100);
  lcd.setCursor(0, 1);
  lcd.print("Guc: ");
  lcd.print(guc);
  lcd.print(" W   ");
  if (guc >= ${esik}) {
    digitalWrite(D0, HIGH);
  } else {
    digitalWrite(D0, LOW);
  }
  delay(100);
}
`;

export default {
  // ──────────────────────────────────────────────────────────
  'cop-kovasi': {
    sesli: [
      { ses: 'Bu projede elini yaklaştırdığında kapağı kendiliğinden açılan hijyenik bir akıllı çöp kovası yapıyoruz.', parca: 0 },
      { ses: 'Servo motoru yönetmek için ESP otuz iki Servo kütüphanesini dahil ediyoruz ve servo nesnesi oluşturuyoruz.', yaz: '#include <ESP32Servo.h>\n\nServo servo;\n\n' },
      { ses: 'Setup bölümünde servoyu D beş pinine bağlıyoruz ve kapağı kapalı konuma, yani sıfır dereceye alıyoruz.', yaz: 'void setup() {\n  servo.attach(D5);\n  servo.write(0);\n}\n\n', parca: 1 },
      { ses: 'Loop döngüsünde ultrasonik mesafe sensörünü okuyoruz. Elimiz yirmi santimetreden yakınsa kapak açılacak.', yaz: 'void loop() {\n  if (mesafeOlc(D3) < 20) {\n', parca: 0 },
      { ses: 'Kapağı doksan dereceye kaldırıyoruz. Çöpü rahatça atabilmek için iki saniye boyunca açık bekletiyoruz.', yaz: '    servo.write(90);\n    delay(2000);\n' },
      { ses: 'İki saniye sonra kapağı kapatmak için servoyu tekrar sıfır dereceye getiriyoruz.', yaz: '    servo.write(0);\n  }\n' },
      { ses: 'Sensörü sürekli meşgul etmemek için elli milisaniye nefes aldırıp döngüyü tamamlıyoruz.', yaz: '  delay(50);\n}\n' },
      { ses: 'Şimdi çalıştıralım! Turuncu engeli sensöre yaklaştırıp kapağın açılıp kapandığını görelim.', calistir: true, parca: 0 },
      { ses: 'Akıllı çöp kovası hazır! Görevler sekmesinde mesafe ve süre ayarlarıyla projeni geliştirebilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Daha geniş algılama mesafesi (30 cm)',
        metin: 'Kapağın daha uzaktan açılması için algılama eşiğini <b>30 cm</b> yap.',
        kod: KOD_61(), degistir: [{ ara: '< 20' }],
        cozum: KOD_61(30), sure: 4000,
        girdi: mesafeSenaryo('D3', [[0, 80], [1000, 25], [3500, 80]]),
        ipucu: '< 20 ifadesindeki 20 sayısını 30 yap.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          if (!acilar.some(a => a.t >= 1000 && a.t < 3500 && a.deger >= 80)) return hata('25 cm yaklaşınca kapak açılmadı.');
          return tamam('Algılama mesafesi 30 cm olarak güncellendi!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Kapağı 3 saniye açık tut',
        metin: 'Kapağın açık kalma süresini <b>3 saniyeye (3000 ms)</b> çıkar.',
        kod: KOD_61(), degistir: [{ ara: 'delay(2000)' }],
        cozum: KOD_61(20, 3000), sure: 5500,
        girdi: mesafeSenaryo('D3', [[0, 80], [1000, 15], [4500, 80]]),
        ipucu: 'delay(2000) satırındaki 2000 sayısını 3000 yap.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          const kapandi = acilar.find(a => a.t > 1500 && a.deger <= 10);
          if (!kapandi || kapandi.t < 3800) return hata('Kapak 3 saniye açık kalmadı.');
          return tamam('Kapak 3 saniye boyunca açık kaldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Kapağı tam dik aç (110 derece)',
        metin: 'Çöp poşetinin rahat girmesi için açılma açısını <b>110 derece</b> yap.',
        kod: KOD_61(), degistir: [{ ara: 'servo.write(90)' }],
        cozum: KOD_61().replace('servo.write(90);', 'servo.write(110);'), sure: 4000,
        girdi: mesafeSenaryo('D3', [[0, 80], [1000, 15], [3500, 80]]),
        ipucu: 'servo.write(90) komutundaki 90 sayısını 110 yap.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          if (!acilar.some(a => a.deger >= 105)) return hata('Kapak 110 dereceye açılmadı.');
          return tamam('Kapak 110 derece dik açıldı!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'kisi-sayaci': {
    sesli: [
      { ses: 'Bu projede kapıdan geçen kişileri sayıp ekranda gösteren ve sesle onaylayan akıllı bir turnike yapıyoruz.', parca: 0 },
      { ses: 'LCD ekran kütüphanesini ekliyor ve sayac değişkenimizi sıfırdan başlatıyoruz.', yaz: '#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\nint sayac = 0;\n\n' },
      { ses: 'Setup bölümünde ekranı başlatıp ilk satıra Kişi Sayısı başlığını ve ikinci satıra başlangıç değeri olarak sıfırı yazıyoruz.', yaz: 'void setup() {\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Kisi Sayisi:");\n  lcd.setCursor(0, 1);\n  lcd.print(sayac);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde mesafe sensörünü okuyoruz. Biri otuz santimetreden yakına geldiğinde kapıdan biri geçiyor demektir.', yaz: 'void loop() {\n  if (mesafeOlc(D3) < 30) {\n', parca: 0 },
      { ses: 'Sayacı bir artırıyoruz ve buzzer ile bin beş yüz hertz frekansta kısa bir bip sesi çalıyoruz.', yaz: '    sayac += 1;\n    tone(D8, 1500);\n    delay(100);\n    noTone(D8);\n', parca: 2 },
      { ses: 'Güncel sayıyı ekranın ikinci satırına yazdırıyoruz.', yaz: '    lcd.setCursor(0, 1);\n    lcd.print(sayac);\n    lcd.print("   ");\n', parca: 1 },
      { ses: 'Kişi sensörün önünden çekilene kadar bekliyoruz. Böylece aynı kişiyi birden fazla kez saymayız.', yaz: '    while (mesafeOlc(D3) < 30) {\n      delay(20);\n    }\n  }\n' },
      { ses: 'Döngü sonuna kısa bir bekleme koyup programımızı tamamlıyoruz.', yaz: '  delay(30);\n}\n' },
      { ses: 'Turnikemiz hazır, çalıştırıp kişilerin geçişini izleyelim!', calistir: true, parca: 0 },
      { ses: 'Tebrikler! Kişi sayacı turnike projen başarıyla çalışıyor.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Bip frekansını değiştir',
        metin: 'Geçiş sesini <b>800 Hz</b> olarak ayarla.',
        kod: KOD_62(), degistir: [{ ara: '1500' }],
        cozum: KOD_62(30, 800), sure: 3000,
        girdi: mesafeSenaryo('D3', [[0, 100], [800, 20], [1500, 90]]),
        ipucu: 'tone fonksiyonundaki 1500 sayısını 800 yap.',
        kontrol(sim) {
          const sesler = olaylar(sim, 'D8', 'ses');
          if (!sesler.some(s => Math.abs(s.deger - 800) < 50)) return hata('Buzzer 800 Hz tonunda çalmadı.');
          return tamam('Geçiş sesi 800 Hz olarak ayarlandı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Daha dar kapı eşiği (20 cm)',
        metin: 'Yalnızca kapının tam ortasından geçenleri saymak için mesafeyi <b>20 cm</b> yap.',
        kod: KOD_62(), degistir: [{ ara: '< 30' }],
        cozum: KOD_62(20), sure: 4000,
        girdi: mesafeSenaryo('D3', [[0, 100], [800, 25], [1500, 15], [2200, 90]]),
        ipucu: '< 30 ifadesini < 20 yap (while içindekini de değiştirmeyi unutma).',
        kontrol(sim) {
          const l = lcdMetin(sim);
          if (!l[1].includes('1')) return hata('20 cm yakınına gelince sayaç 1 artmalıydı.');
          return tamam('Turnike eşiği 20 cm yapıldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Bip süresini uzat',
        metin: 'Onay bip sesinin süresini 100 ms yerine <b>250 ms</b> yap.',
        kod: KOD_62(), degistir: [{ ara: 'delay(100)' }],
        cozum: KOD_62().replace('delay(100);', 'delay(250);'), sure: 3000,
        girdi: mesafeSenaryo('D3', [[0, 100], [800, 20], [1500, 90]]),
        ipucu: 'delay(100) komutunu delay(250) yap.',
        kontrol(sim) {
          const sesler = olaylar(sim, 'D8', 'ses');
          const basla = sesler.find(s => s.deger > 0);
          const bitir = sesler.find(s => s.t > (basla?.t ?? 0) && s.deger === 0);
          if (!bitir || bitir.t - basla.t < 200) return hata('Bip sesi 250 ms sürmedi.');
          return tamam('Onay sesi 250 ms boyunca çaldı!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'yem-verici': {
    sesli: [
      { ses: 'Bu dersimizde evcil dostlarımız için sesli çağrı yapan ve kapağını açıp mama döken akıllı bir yem verici yapıyoruz.', parca: 0 },
      { ses: 'Servo kütüphanesini ekliyor ve servomuzu tanımlıyoruz.', yaz: '#include <ESP32Servo.h>\n\nServo servo;\n\n' },
      { ses: 'Setup içinde besleme düğmesini D iki pinine giriş, servoyu D beş pinine çıkış olarak atayıp kapağı sıfır derecede kapatıyoruz.', yaz: 'void setup() {\n  pinMode(D2, INPUT);\n  servo.attach(D5);\n  servo.write(0);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde düğmeye basılıp basılmadığını kontrol ediyoruz.', yaz: 'void loop() {\n  if (digitalRead(D2) == HIGH) {\n', parca: 0 },
      { ses: 'Düğmeye basıldığında hayvanı çağırmak için bin hertzde üç yüz milisaniye mama müziği çalıyoruz.', yaz: '    tone(D8, 1000);\n    delay(300);\n    noTone(D8);\n', parca: 2 },
      { ses: 'Şimdi kapağı doksan dereceye açıyor ve mamanın kaba dökülmesi için bir saniye bekletiyoruz.', yaz: '    servo.write(90);\n    delay(1000);\n' },
      { ses: 'Mamayı döktükten sonra kapağı kapatıyor ve elimizi düğmeden çekene kadar bekliyoruz.', yaz: '    servo.write(0);\n    while (digitalRead(D2) == HIGH) {\n      delay(20);\n    }\n  }\n' },
      { ses: 'Döngü sonuna küçük bir gecikme ekleyerek programı tamamlıyoruz.', yaz: '  delay(30);\n}\n' },
      { ses: 'Çalıştıralım! Düğmeye basıldığında sesli çağrı ve mama dökümü gerçekleşecek.', calistir: true, parca: 0 },
      { ses: 'Akıllı yem verici hazır! Dostlarımız aç kalmayacak.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Mama çağrı sesini incelt',
        metin: 'Mama çağrı tonunu 1000 Hz yerine <b>1800 Hz</b> yap.',
        kod: KOD_63(), degistir: [{ ara: '1000' }],
        cozum: KOD_63().replace('tone(D8, 1000);', 'tone(D8, 1800);'), sure: 3000,
        girdi: dugmeSenaryo('D2', [[500, 200]]),
        ipucu: 'tone fonksiyonundaki 1000 frekansını 1800 yap.',
        kontrol(sim) {
          const sesler = olaylar(sim, 'D8', 'ses');
          if (!sesler.some(s => Math.abs(s.deger - 1800) < 50)) return hata('Buzzer 1800 Hz frekansında çalmadı.');
          return tamam('Mama çağrı sesi 1800 Hz oldu!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Kapağı daha geniş aç (120 derece)',
        metin: 'İri taneli yemlerin geçebilmesi için kapağı <b>120 dereceye</b> kadar aç.',
        kod: KOD_63(), degistir: [{ ara: 'servo.write(90)' }],
        cozum: KOD_63(120), sure: 3000,
        girdi: dugmeSenaryo('D2', [[500, 200]]),
        ipucu: 'servo.write(90) yerine servo.write(120) yaz.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          if (!acilar.some(a => a.deger >= 115)) return hata('Servo 120 dereceye açılmadı.');
          return tamam('Kapak 120 derece genişliğinde açıldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Mama dökülme süresini artır',
        metin: 'Kapağın açık kalma süresini 1000 ms yerine <b>1500 ms</b> yap.',
        kod: KOD_63(), degistir: [{ ara: 'delay(1000)' }],
        cozum: KOD_63(90, 1500), sure: 3500,
        girdi: dugmeSenaryo('D2', [[500, 200]]),
        ipucu: 'Kapak açıldıktan sonraki delay(1000) süresini 1500 yap.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          const acilis = acilar.find(a => a.deger >= 80);
          const kapanis = acilar.find(a => a.t > (acilis?.t ?? 0) && a.deger <= 10);
          if (!kapanis || kapanis.t - acilis.t < 1400) return hata('Kapak 1.5 saniye açık kalmadı.');
          return tamam('Kapak 1.5 saniye açık kaldı!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'hirsiz-alarmi': {
    sesli: [
      { ses: 'Bu projede ışık demetinin kesilmesini algılayan ve iki tonlu polis sireni çalan bir hırsız alarmı yapıyoruz.', parca: 0 },
      { ses: 'Setup içinde kırmızı LED için D sıfır pinini ve buzzer için D sekiz pinini çıkış olarak ayarlıyoruz.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n  pinMode(D8, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde A sıfır pinindeki ışık sensörünü kontrol ediyoruz. Işık bin beş yüzün altına inerse birisi ışığı kesti demektir.', yaz: 'void loop() {\n  if (analogRead(A0) < 1500) {\n', parca: 0 },
      { ses: 'Alarm durumunda önce kırmızı LED\'i yakıp bin iki yüz hertzde tiz siren tonunu yüz elli milisaniye çalıyoruz.', yaz: '    digitalWrite(D0, HIGH);\n    tone(D8, 1200);\n    delay(150);\n', parca: 2 },
      { ses: 'Ardından LED\'i söndürüp sekiz yüz hertzde pes siren tonunu yüz elli milisaniye çalarak flaşör etkisi oluşturuyoruz.', yaz: '    digitalWrite(D0, LOW);\n    tone(D8, 800);\n    delay(150);\n  } else {\n' },
      { ses: 'Ortam güvenli ve aydınlıksa LED\'i söndürüyor ve ses susturuyoruz.', yaz: '    digitalWrite(D0, LOW);\n    noTone(D8);\n    delay(50);\n  }\n}\n' },
      { ses: 'Çalıştıralım! Güneşi karartıp siren ve flaşörün devreye girdiğini test edelim.', calistir: true, parca: 0 },
      { ses: 'Mükemmel! Hırsız alarmı projen göreve hazır.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Eşiği 2000 yap',
        metin: 'Alarmın daha erken çalması için ışık eşiğini <b>2000</b> yap.',
        kod: KOD_64(), degistir: [{ ara: '< 1500' }],
        cozum: KOD_64(2000), sure: 3500,
        girdi: analogSenaryo('A0', [[0, 3000], [1000, 1800], [2500, 3000]]),
        ipucu: '< 1500 yerine < 2000 yaz.',
        kontrol(sim) {
          const sesler = olaylar(sim, 'D8', 'ses');
          if (!sesler.some(s => s.t >= 1000 && s.t < 2500 && s.deger > 0)) return hata('Işık 1800 iken alarm çalmadı.');
          return tamam('Işık eşiği 2000 olarak güncellendi!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Daha tiz siren tonu',
        metin: 'Siren sesini daha dikkat çekici yap: tiz tonu 1200 yerine <b>2000 Hz</b> yap.',
        kod: KOD_64(), degistir: [{ ara: 'tone(D8, 1200)' }],
        cozum: KOD_64().replace('tone(D8, 1200);', 'tone(D8, 2000);'), sure: 3000,
        girdi: analogSenaryo('A0', [[0, 500]]),
        ipucu: '1200 sayısını 2000 ile değiştir.',
        kontrol(sim) {
          const sesler = olaylar(sim, 'D8', 'ses');
          if (!sesler.some(s => Math.abs(s.deger - 2000) < 50)) return hata('2000 Hz siren tonu çalmadı.');
          return tamam('Siren tonu 2000 Hz oldu!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Siren hızını iki katına çıkar',
        metin: 'Siren bekleme sürelerini 150 ms yerine <b>75 ms</b> yap.',
        kod: KOD_64(), degistir: [{ ara: 'delay(150)' }],
        cozum: KOD_64(1500, 75), sure: 3000,
        girdi: analogSenaryo('A0', [[0, 500]]),
        ipucu: 'delay(150) satırlarını delay(75) yap.',
        kontrol(sim) {
          const sesler = olaylar(sim, 'D8', 'ses');
          if (sesler.length < 6) return hata('Siren yeterince hızlı çalmadı.');
          return tamam('Siren iki kat hızlı çalıyor!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'otopark-bariyeri': {
    sesli: [
      { ses: 'Bu projede otoparka yaklaşan araçları algılayıp bariyeri kaldıran ve LCD ekranda yönlendirme yapan bir otopark sistemi yapıyoruz.', parca: 0 },
      { ses: 'Servo ve LCD kütüphanelerini ekleyip nesnelerimizi oluşturuyoruz.', yaz: '#include <ESP32Servo.h>\n#include <LiquidCrystal_I2C.h>\n\nServo servo;\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n' },
      { ses: 'Setup içinde servoyu D beş pinine bağlıyor, ekranı başlatıp birinci satıra Otopark başlığı, ikinci satıra DUR yazıyoruz.', yaz: 'void setup() {\n  servo.attach(D5);\n  servo.write(0);\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Otopark");\n  lcd.setCursor(0, 1);\n  lcd.print("DUR         ");\n}\n\n', parca: 1 },
      { ses: 'Loop içinde ultrasonik sensör ile araç mesafesini ölçüyoruz. Yirmi beş santimetreden yakınsa araç gelmiş demektir.', yaz: 'void loop() {\n  if (mesafeOlc(D3) < 25) {\n', parca: 0 },
      { ses: 'Bariyeri kaldırmak için servoyu doksan dereceye getiriyor ve ekranda Geçiniz mesajını gösteriyoruz.', yaz: '    servo.write(90);\n    lcd.setCursor(0, 1);\n    lcd.print("Geciniz     ");\n  } else {\n', parca: 2 },
      { ses: 'Araç uzaktaysa bariyeri sıfır dereceye indirip ekranda DUR yazısını koruyoruz.', yaz: '    servo.write(0);\n    lcd.setCursor(0, 1);\n    lcd.print("DUR         ");\n  }\n' },
      { ses: 'Elli milisaniye bekleyip döngümüzü tamamlıyoruz.', yaz: '  delay(50);\n}\n' },
      { ses: 'Çalıştıralım! Aracı yaklaştırdığında bariyer kalkacak ve ekran güncellenecek.', calistir: true, parca: 0 },
      { ses: 'Akıllı otopark bariyeri başarıyla çalışıyor! Güvenli sürüşler.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Bariyer açılma mesafesini 35 cm yap',
        metin: 'Bariyerin daha erken açılması için mesafeyi <b>35 cm</b> yap.',
        kod: KOD_65(), degistir: [{ ara: '< 25' }],
        cozum: KOD_65(35), sure: 4000,
        girdi: mesafeSenaryo('D3', [[0, 100], [1200, 30], [3200, 100]]),
        ipucu: '< 25 yerine < 35 yaz.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          if (!acilar.some(a => a.t >= 1200 && a.t < 3200 && a.deger >= 80)) return hata('30 cm mesafede bariyer açılmadı.');
          return tamam('Bariyer algılama mesafesi 35 cm oldu!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Bariyeri tam dik kaldır (100 derece)',
        metin: 'Bariyer kolunu 90 yerine <b>100 dereceye</b> kadar kaldır.',
        kod: KOD_65(), degistir: [{ ara: 'servo.write(90)' }],
        cozum: KOD_65(25, 100), sure: 3500,
        girdi: mesafeSenaryo('D3', [[0, 100], [1200, 15], [3200, 100]]),
        ipucu: 'servo.write(90) komutundaki 90 sayısını 100 yap.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          if (!acilar.some(a => a.deger >= 95)) return hata('Servo 100 dereceye kalkmadı.');
          return tamam('Bariyer 100 dereceye dik açıldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Hoş geldiniz mesajı',
        metin: 'Araç yaklaşınca ekranda "Geciniz     " yerine <b>"Hosgeldiniz "</b> yazdır.',
        kod: KOD_65(), degistir: [{ ara: '"Geciniz     "' }],
        cozum: KOD_65().replace('"Geciniz     "', '"Hosgeldiniz "'), sure: 3500,
        girdi: mesafeSenaryo('D3', [[0, 100], [1200, 15]]),
        ipucu: 'Geciniz yazısını Hosgeldiniz ile değiştir.',
        kontrol(sim) {
          const l = lcdMetin(sim);
          if (!duz(l[1]).includes('hos')) return hata('Ekranda Hosgeldiniz mesajı görünmedi.');
          return tamam('Ekranda Hosgeldiniz mesajı görüntülendi!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'gunes-takipci': {
    sesli: [
      { ses: 'Bu projede güneş panelinin açısını ışığı takip edecek şekilde ayarlayan akıllı bir solar tracker yapıyoruz.', parca: 0 },
      { ses: 'Servo motor kontrolü için Servo kütüphanesini dahil ediyoruz.', yaz: '#include <ESP32Servo.h>\n\nServo servo;\n\n' },
      { ses: 'Setup içinde servoyu D beş pinine bağlıyoruz.', yaz: 'void setup() {\n  servo.attach(D5);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde A sıfır pinindeki ışık sensöründen ortamdaki ışık seviyesini ölçüyoruz.', yaz: 'void loop() {\n  int isik = analogRead(A0);\n', parca: 0 },
      { ses: 'Map fonksiyonu ile sıfırla dört bin doksan beş arasındaki ışık değerini sıfırla yüz seksen derece servo açısına orantılı çeviriyoruz.', yaz: '  int aci = map(isik, 0, 4095, 0, 180);\n' },
      { ses: 'Elde ettiğimiz açıyı servoya yazarak panelin yönünü güneşe çeviriyoruz.', yaz: '  servo.write(aci);\n' },
      { ses: 'Otuz milisaniye bekleyerek servoya hareket payı bırakıyoruz.', yaz: '  delay(30);\n}\n' },
      { ses: 'Çalıştıralım! Güneşin konumunu değiştirdiğinde servonun ışığı izlediğini gözlemle.', calistir: true, parca: 0 },
      { ses: 'Güneş takipçi tamamlandı! Panel artık maksimum verimle elektrik üretecek.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Açıyı 0-120 dereceye sınırla',
        metin: 'Panelin aşırı dönmesini önlemek için maksimum açıyı <b>120 derece</b> yap.',
        kod: KOD_66(), degistir: [{ ara: '0, 180' }],
        cozum: KOD_66(120), sure: 3000,
        girdi: analogSenaryo('A0', [[0, 0], [1000, 4095]]),
        ipucu: 'map fonksiyonundaki 0, 180 yerine 0, 120 yaz.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          const son = acilar[acilar.length - 1]?.deger;
          if (son == null || Math.abs(son - 120) > 10) return hata('Tam ışıkta servo 120 derece olmadı.');
          return tamam('Maksimum açı 120 dereceye sınırlandı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ters yöne döndür (180 - 0)',
        metin: 'Paneli ters yönde hareket ettir: karanlıkta 180, tam ışıkta <b>0 derece</b> olsun.',
        kod: KOD_66(), degistir: [{ ara: '0, 180' }],
        cozum: KOD_66().replace('0, 180', '180, 0'), sure: 3000,
        girdi: analogSenaryo('A0', [[0, 0], [1000, 4095]]),
        ipucu: 'map aralığını 180, 0 olarak yaz.',
        kontrol(sim) {
          const acilar = olaylar(sim, 'D5', 'servo');
          const son = acilar[acilar.length - 1]?.deger;
          if (son == null || son > 15) return hata('Tam ışıkta servo 0 dereceye inmedi.');
          return tamam('Ters yönlü takip başarıyla ayarlandı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Hassas hareket beklemesi (15 ms)',
        metin: 'Servonun daha akıcı ve titreşimsiz hareket etmesi için bekleme süresini <b>15 ms</b> yap.',
        kod: KOD_66(), degistir: [{ ara: 'delay(30)' }],
        cozum: KOD_66().replace('delay(30);', 'delay(15);'), sure: 2500,
        girdi: analogSenaryo('A0', [[0, 1000], [1000, 3000]]),
        ipucu: 'delay(30) komutunu delay(15) yap.',
        kontrol(sim) {
          return tamam('Servo bekleme süresi 15 ms oldu!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'gunes-paneli': {
    sesli: [
      { ses: 'Bu projede güneş panelinin ürettiği elektrik gücünü ekranda gösteren ve akü şarj durumunu izleyen bir istasyon yapıyoruz.', parca: 0 },
      { ses: 'LCD kütüphanesini ekliyor ve ekranımızı başlatıyoruz.', yaz: '#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n' },
      { ses: 'Setup içinde şarj gösterge LED\'i için D sıfır pinini çıkış yapıyor, ekrana Güneş Paneli başlığını yazıyoruz.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Gunes Paneli");\n}\n\n', parca: 1 },
      { ses: 'Loop içinde sensörden gelen ışık değerini okuyoruz.', yaz: 'void loop() {\n  int isik = analogRead(A0);\n', parca: 0 },
      { ses: 'Map fonksiyonu ile ışık şiddetini sıfırla yüz Watt arasında bir elektriksel güce çeviriyoruz.', yaz: '  int guc = map(isik, 0, 4095, 0, 100);\n' },
      { ses: 'Ekranın ikinci satırına üretilen anlık Watt değerini yazdırıyoruz.', yaz: '  lcd.setCursor(0, 1);\n  lcd.print("Guc: ");\n  lcd.print(guc);\n  lcd.print(" W   ");\n', parca: 1 },
      { ses: 'Eğer üretilen güç elli Watt veya üzerindeyse akü şarj LED\'ini yakıyor, değilse söndürüyoruz.', yaz: '  if (guc >= 50) {\n    digitalWrite(D0, HIGH);\n  } else {\n    digitalWrite(D0, LOW);\n  }\n', parca: 2 },
      { ses: 'Yüz milisaniye bekleyip döngümüzü tamamlıyoruz.', yaz: '  delay(100);\n}\n' },
      { ses: 'Çalıştıralım! Işık seviyesini artırdıkça gücün yükseldiğini ve yeşil şarj LED\'inin yandığını izle.', calistir: true, parca: 0 },
      { ses: 'Güneş paneli istasyonu hazır! Temiz enerji takibi devrede.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Şarj eşiğini 65 Watt yap',
        metin: 'Yalnızca yüksek verimde şarj etmek için eşiği <b>65 Watt</b> yap.',
        kod: KOD_67(), degistir: [{ ara: '>= 50' }],
        cozum: KOD_67(65), sure: 3500,
        girdi: analogSenaryo('A0', [[0, 2300], [1000, 3100]]),
        ipucu: '>= 50 yerine >= 65 yaz.',
        kontrol(sim) {
          const ledler = olaylar(sim, 'D0');
          const yandi = ledler.some(l => l.t >= 1000 && l.deger === 1);
          if (!yandi) return hata('65W üzerinde LED yanmalıydı.');
          return tamam('Şarj eşiği 65 Watt yapıldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Güç aralığını 0-150 Watt yap',
        metin: 'Büyük boyutlu panel için maksimum gücü 100 yerine <b>150 Watt</b> yap.',
        kod: KOD_67(), degistir: [{ ara: '0, 100' }],
        cozum: KOD_67().replace('0, 100', '0, 150'), sure: 3000,
        girdi: analogSenaryo('A0', [[0, 4095]]),
        ipucu: 'map fonksiyonundaki 0, 100 yerine 0, 150 yaz.',
        kontrol(sim) {
          const l = lcdMetin(sim);
          if (!l[1].includes('150')) return hata('Maksimum ışıkta ekranda 150 W görünmeli.');
          return tamam('Panel kapasitesi 150 Watt olarak ayarlandı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ekran yenileme hızını artır (50 ms)',
        metin: 'Ekranın daha hızlı güncellenmesi için delay süresini <b>50 ms</b> yap.',
        kod: KOD_67(), degistir: [{ ara: 'delay(100)' }],
        cozum: KOD_67().replace('delay(100);', 'delay(50);'), sure: 2500,
        girdi: analogSenaryo('A0', [[0, 2000]]),
        ipucu: 'delay(100) komutunu delay(50) yap.',
        kontrol(sim) {
          return tamam('Ekran yenileme süresi 50 ms oldu!');
        },
      },
    ],
  },
};
