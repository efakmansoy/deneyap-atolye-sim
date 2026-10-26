// Modül 7 (Doğa ve güvenlik) için sesli anlatım + "kodu değiştir" görevleri.
// Şema için m1-sesli.js / m4b-sesli.js dosyalarına bak. `yaz` metinleri art arda eklenince dersin kontrolünü geçen tam bir C++ programı oluşur.
// KOD şablonları tools/e2e/cozumler-m7.mjs tarafından da kullanılır (adlandırılmış dışa aktarım; ders yükleyici yalnızca default'u alır).
import { olaylar, cikis, durumda, duz, sayilar, tamam, hata, analogSenaryo, darbeSenaryo, havaGirdi, kasaSenaryo, kasaKontrol } from '../m7-doga.js';

// ── 7.1 Saksı sulama ──
const K71 = (esik = 1500) => `#define NEM A0
#define POMPA D6

void setup() {
  pinMode(POMPA, OUTPUT);
}

void loop() {
  int nem = analogRead(NEM);
  if (nem < ${esik}) {
    digitalWrite(POMPA, HIGH);
  } else {
    digitalWrite(POMPA, LOW);
  }
  delay(100);
}
`;
const K71D = (acik = 1000) => `#define NEM A0
#define POMPA D6

void setup() {
  pinMode(POMPA, OUTPUT);
}

void loop() {
  int nem = analogRead(NEM);
  if (nem < 1500) {
    digitalWrite(POMPA, HIGH);
    delay(${acik});
    digitalWrite(POMPA, LOW);
    delay(4000);
  } else {
    digitalWrite(POMPA, LOW);
    delay(100);
  }
}
`;
const K71S = (bekle = 100) => `#define NEM A0
#define POMPA D6

void setup() {
  Serial.begin(115200);
  pinMode(POMPA, OUTPUT);
}

void loop() {
  int nem = analogRead(NEM);
  Serial.println(nem);
  if (nem < 1500) {
    digitalWrite(POMPA, HIGH);
  } else {
    digitalWrite(POMPA, LOW);
  }
  delay(${bekle});
}
`;

// ── 7.2 PIR lamba ──
const K72 = (sure = 2000) => `#define PIR D5
#define LAMBA D0

void setup() {
  pinMode(PIR, INPUT);
  pinMode(LAMBA, OUTPUT);
}

void loop() {
  if (digitalRead(PIR) == HIGH) {
    digitalWrite(LAMBA, HIGH);
    delay(${sure});
    digitalWrite(LAMBA, LOW);
  }
  delay(50);
}
`;
const K72P = (parlaklik = 255) => `#define PIR D5
#define LAMBA D0

void setup() {
  pinMode(PIR, INPUT);
  pinMode(LAMBA, OUTPUT);
}

void loop() {
  if (digitalRead(PIR) == HIGH) {
    analogWrite(LAMBA, ${parlaklik});
    delay(2000);
    analogWrite(LAMBA, 0);
  }
  delay(50);
}
`;
const K72S = (mesaj = 'Hareket var') => `#define PIR D5
#define LAMBA D0

void setup() {
  Serial.begin(115200);
  pinMode(PIR, INPUT);
  pinMode(LAMBA, OUTPUT);
}

void loop() {
  if (digitalRead(PIR) == HIGH) {
    Serial.println("${mesaj}");
    digitalWrite(LAMBA, HIGH);
    delay(2000);
    digitalWrite(LAMBA, LOW);
  }
  delay(50);
}
`;

// ── 7.3 Hava istasyonu ──
const K73 = ({ sicMax = 50, etiket = 'Sicaklik: ', bekle = 500 } = {}) => `#include <LiquidCrystal_I2C.h>

#define SICAKLIK A1
#define LDR A0

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  lcd.init();
  lcd.backlight();
}

void loop() {
  int sic = map(analogRead(SICAKLIK), 0, 4095, 0, ${sicMax});
  int isik = map(analogRead(LDR), 0, 4095, 0, 100);
  lcd.setCursor(0, 0);
  lcd.print("${etiket}");
  lcd.print(sic);
  lcd.print(" C  ");
  lcd.setCursor(0, 1);
  lcd.print("Isik: ");
  lcd.print(isik);
  lcd.print(" %  ");
  Serial.print("Sicaklik=");
  Serial.print(sic);
  Serial.print(" Isik=");
  Serial.println(isik);
  delay(${bekle});
}
`;

// ── 7.4 Gaz alarmı ──
const K74 = ({ esik = 2000, frekans = 1000, bekle = 100 } = {}) => `#define GAZ A0
#define LED D0
#define BUZZER D8

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  int gaz = analogRead(GAZ);
  Serial.println(gaz);
  if (gaz > ${esik}) {
    digitalWrite(LED, HIGH);
    tone(BUZZER, ${frekans});
  } else {
    digitalWrite(LED, LOW);
    noTone(BUZZER);
  }
  delay(${bekle});
}
`;

// ── 7.5 Şifreli kasa ──
const K75 = ({ sifre = '1, 2, 3, 4', acik = 3000, aci = 90, led = 1000 } = {}) => `#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>

#define TUS A0
#define LED D0

Servo kilit;
LiquidCrystal_I2C lcd(0x27, 16, 2);
int sifre[4] = {${sifre}};
int girilen = 0;
bool dogru = true;

int tusOku() {
  int v = analogRead(TUS);
  return (v + 170) / 340;
}

void setup() {
  pinMode(LED, OUTPUT);
  kilit.attach(D5);
  kilit.write(0);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sifre girin:");
  lcd.setCursor(0, 1);
  lcd.print("KILITLI         ");
}

void loop() {
  int tus = tusOku();
  if (tus > 0) {
    if (tus != sifre[girilen]) {
      dogru = false;
    }
    girilen += 1;
    lcd.setCursor(0, 1);
    for (int i = 0; i < girilen; i++) {
      lcd.print("*");
    }
    lcd.print("                ");
    while (tusOku() > 0) {
      delay(20);
    }
    if (girilen == 4) {
      lcd.setCursor(0, 1);
      if (dogru) {
        lcd.print("ACIK!           ");
        kilit.write(${aci});
        delay(${acik});
        kilit.write(0);
      } else {
        lcd.print("YANLIS!         ");
        digitalWrite(LED, HIGH);
        delay(${led});
        digitalWrite(LED, LOW);
      }
      lcd.setCursor(0, 1);
      lcd.print("KILITLI         ");
      girilen = 0;
      dogru = true;
    }
  }
  delay(20);
}
`;

export const KOD = { K71, K72, K73, K74, K75 };

const KASA = { yanlisSon: 4200, ac: [5500, 6600], acikMin: 2500, acikMax: 4000, led: [1900, 3800] };
const pompa = sim => cikis(sim, 'D6');
const lamba = sim => cikis(sim, 'D0');
const kayit = sim => sim.cihaz.kayit ?? [];
const alarm = (sim, t) => ({ led: durumda(cikis(sim, 'D0'), t), ses: durumda(olaylar(sim, 'D8', 'ses'), t) });

export default {
  // ──────────────────────────────────────────────────────────
  'saksi-sulama': {
    sesli: [
      { ses: 'Bugün çiçeğini kendi kendine sulayan bir sistem yapıyoruz. Toprak nem sensörü A sıfır pininde, su pompası D altı pininde. Toprak kuruyunca pompa çalışacak, ıslanınca duracak.', yaz: '#define NEM A0\n#define POMPA D6\n\n', parca: 0 },
      { ses: 'Setup bölümünde pompa pinini çıkış yapıyoruz. Pompaya enerjiyi kart verecek, o yüzden çıkış olması gerekiyor.', yaz: 'void setup() {\n  pinMode(POMPA, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde önce nem sensörünü okuyoruz. Analog okuma sıfırla dört bin doksan beş arasında bir sayı verir.', yaz: 'void loop() {\n  int nem = analogRead(NEM);\n', parca: 0 },
      { ses: 'Dikkat: bu sensörde ıslak toprak büyük sayı verir. Toprak ne kadar ıslaksa sayı o kadar büyür. Kuru toprakta sayı küçüktür. Yani küçük sayı, susamış toprak demek.', parca: 0 },
      { ses: 'Nem bin beş yüzün altındaysa toprak kurudur. O zaman pompa pinine HIGH yazıp pompayı çalıştırıyoruz.', yaz: '  if (nem < 1500) {\n    digitalWrite(POMPA, HIGH);\n', parca: 1 },
      { ses: 'Değilse toprak yeterince nemlidir. Pompa pinine LOW yazarak pompayı durduruyoruz.', yaz: '  } else {\n    digitalWrite(POMPA, LOW);\n  }\n' },
      { ses: 'Döngünün sonunda yüz milisaniye bekliyoruz. Toprağın nemi çok hızlı değişmez, kartı boşuna yormaya gerek yok.', yaz: '  delay(100);\n}\n' },
      { ses: 'Çalıştıralım! Toprak önce nemli, sonra kuru olacak ve pompanın çalıştığını göreceksin. Sonra yeniden ıslanınca pompa duracak.', calistir: true, parca: 1 },
      { ses: 'Saksı sulama sistemin hazır! Görevler sekmesinde eşiği, darbeli sulamayı ve nem yüzdesini kendin ayarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Eşiği 2500 yap',
        metin: 'Çiçek çok susuz kalmasın: toprak nemi <b>2500\'ün altına</b> inince pompa çalışsın. Yalnızca eşik sayısını değiştir.',
        kod: K71(), degistir: [{ ara: '< 1500' }], sure: 3600,
        girdi: analogSenaryo('A0', [[0, 3500], [1000, 2200], [2500, 3500]]),
        cozum: K71(2500),
        ipucu: '< 1500 yerine < 2500 yaz. Nem 2200 iken pompa çalışmalı.',
        kontrol(sim) {
          const p = pompa(sim);
          if (durumda(p, 500) !== 0) return hata('Toprak ıslakken (3500) pompa çalışmamalı.');
          if (durumda(p, 1800) !== 1) return hata('Nem 2200 iken pompa çalışmadı; eşik 2500 olmalı.');
          if (durumda(p, 3200) !== 0) return hata('Toprak tekrar ıslanınca pompa durmalı.');
          return tamam('Eşik 2500 oldu, saksı daha erken sulanıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Pompa 3 saniye çalışsın',
        metin: 'Pompa her sulamada <b>1 saniye</b> çalışıyor, bu yetmiyor. Çalışma süresini <b>3 saniyeye (3000 ms)</b> çıkar.',
        kod: K71D(), degistir: [{ ara: 'delay(1000)' }], sure: 6000,
        girdi: analogSenaryo('A0', [[0, 600]]),
        cozum: K71D(3000),
        ipucu: 'Pompa HIGH olduktan sonraki delay(1000) süresini delay(3000) yap.',
        kontrol(sim) {
          const p = pompa(sim);
          const ac = p.find(o => o.deger === 1), kapa = p.find(o => ac && o.t > ac.t && o.deger === 0);
          if (!ac || !kapa) return hata('Pompa açılıp kapanmadı.');
          const sure = kapa.t - ac.t;
          if (sure < 2800 || sure > 3300) return hata(`Pompa ${Math.round(sure)} ms çalıştı; 3000 ms çalışmalı.`);
          return tamam('Pompa artık 3 saniye çalışıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Nemi saniyede bir yaz',
        metin: 'Seri monitör nem sayısıyla doldu taştı! Ölçüm aralığını <b>1 saniyeye (1000 ms)</b> çıkar; böylece saniyede bir satır yazılsın.',
        kod: K71S(), degistir: [{ ara: 'delay(100)' }], sure: 4500,
        girdi: analogSenaryo('A0', [[0, 3000]]),
        cozum: K71S(1000),
        ipucu: 'Döngünün sonundaki delay(100) komutunu delay(1000) yap.',
        kontrol(sim) {
          const n = sim.seriCikti.length;
          if (n < 3) return hata('Seri monitöre yeterince değer yazılmadı.');
          if (n > 6) return hata(`4,5 saniyede ${n} satır yazıldı; saniyede bir satır (en fazla 5-6) olmalı.`);
          return tamam('Nem artık saniyede bir kez yazılıyor!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'pir-lamba': {
    sesli: [
      { ses: 'Bu projede koridora biri girince kendiliğinden yanan, birkaç saniye sonra sönen bir lamba yapıyoruz. Hareket sensörü D beş pininde, lamba D sıfır pininde.', yaz: '#define PIR D5\n#define LAMBA D0\n\n', parca: 0 },
      { ses: 'PIR sensörü, insan vücudunun yaydığı kızılötesi ısıdaki değişimi fark eder. Hareket olunca çıkışı HIGH olur, hareket yokken LOW kalır. Biz onu bir düğme gibi okuyacağız.', parca: 0 },
      { ses: 'Setup bölümünde PIR pinini giriş, lamba pinini çıkış yapıyoruz.', yaz: 'void setup() {\n  pinMode(PIR, INPUT);\n  pinMode(LAMBA, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde PIR pinine bakıyoruz. Eğer HIGH ise biri hareket ediyor demektir.', yaz: 'void loop() {\n  if (digitalRead(PIR) == HIGH) {\n', parca: 0 },
      { ses: 'Önce lambayı yakıyoruz, sonra iki saniye boyunca yanık bırakıyoruz. İki bin milisaniye, iki saniye eder.', yaz: '    digitalWrite(LAMBA, HIGH);\n    delay(2000);\n', parca: 1 },
      { ses: 'İki saniye dolunca lambayı söndürüyoruz. Eğer bloğu da burada kapanıyor.', yaz: '    digitalWrite(LAMBA, LOW);\n  }\n' },
      { ses: 'Döngünün sonunda elli milisaniye bekleyip programı tamamlıyoruz.', yaz: '  delay(50);\n}\n' },
      { ses: 'Çalıştıralım! İki ayrı hareket gelecek. Lamba her birinde yanıp sönecek.', calistir: true, parca: 0 },
      { ses: 'Hareketle yanan lamban hazır! Görevler sekmesinde süreyi, hareket sayacını ve yavaşça sönme efektini deneyeceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Lamba 4 saniye yansın',
        metin: 'Lamba hareketten sonra <b>4 saniye (4000 ms)</b> yanık kalsın.',
        kod: K72(), degistir: [{ ara: 'delay(2000)' }], sure: 6000,
        girdi: darbeSenaryo('D5', [[600, 300]]),
        cozum: K72(4000),
        ipucu: 'Lamba yandıktan sonraki delay(2000) süresini delay(4000) yap.',
        kontrol(sim) {
          const l = lamba(sim);
          if (durumda(l, 1500) <= 0) return hata('Hareket algılanınca lamba yanmadı.');
          if (durumda(l, 3500) <= 0) return hata('Lamba çok erken söndü; 4 saniye yanık kalmalı.');
          if (durumda(l, 5500) !== 0) return hata('Lamba 4 saniye sonra sönmedi.');
          return tamam('Lamba 4 saniye yanıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Loş gece lambası',
        metin: 'Gece lambası göz almasın: parlaklığı <b>255 yerine 80</b> yap (analogWrite ile 0-255 arası parlaklık verilir).',
        kod: K72P(), degistir: [{ ara: 'analogWrite(LAMBA, 255)' }], sure: 4000,
        girdi: darbeSenaryo('D5', [[600, 300]]),
        cozum: K72P(80),
        ipucu: 'analogWrite(LAMBA, 255) satırındaki 255 sayısını 80 yap.',
        kontrol(sim) {
          const v = durumda(lamba(sim), 1500);
          if (v <= 0) return hata('Hareket algılanınca lamba yanmadı.');
          if (v < 0.25 || v > 0.4) return hata(`Lamba parlaklığı ${(v * 255).toFixed(0)}; yaklaşık 80 olmalı.`);
          return tamam('Lamba loş yanıyor, göz almıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Mesajı değiştir',
        metin: 'Seri monitörde hareket olunca <b>Hareket var</b> yazıyor. Bunu <b>Hareket algilandi</b> olarak değiştir.',
        kod: K72S(), degistir: [{ ara: '"Hareket var"' }], sure: 3500,
        girdi: darbeSenaryo('D5', [[600, 300]]),
        cozum: K72S('Hareket algilandi'),
        ipucu: 'Tırnak içindeki yazıyı Hareket algilandi yap. Tırnakları silme.',
        kontrol(sim) {
          if (!sim.seriCikti.length) return hata('Seri monitöre hiçbir şey yazılmadı.');
          if (!sim.seriCikti.some(s => duz(s).includes('algilandi'))) return hata(`Mesaj "Hareket algilandi" olmalı (şu an "${sim.seriCikti[0]}").`);
          return tamam('Mesaj güncellendi!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'hava-istasyonu': {
    sesli: [
      { ses: 'Bugün mini bir hava istasyonu yapıyoruz. Sıcaklık sensörü A bir pininde, ışık sensörü A sıfır pininde. Değerleri hem LCD ekranda hem de seri monitörde göstereceğiz.', yaz: '#include <LiquidCrystal_I2C.h>\n\n#define SICAKLIK A1\n#define LDR A0\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\n', parca: 0 },
      { ses: 'Setup bölümünde seri haberleşmeyi yüz on beş bin iki yüz baud hızında başlatıyoruz. Ardından ekranı açıp arka ışığını yakıyoruz.', yaz: 'void setup() {\n  Serial.begin(115200);\n  lcd.init();\n  lcd.backlight();\n}\n\n', parca: 2 },
      { ses: 'Sensörler bize sıfırla dört bin doksan beş arasında ham bir sayı verir. Bu sayı derece değildir. Bu yüzden harita, yani map komutuyla gerçek birime çevireceğiz.', parca: 0 },
      { ses: 'Sıcaklık sayısını sıfır ile elli derece aralığına çeviriyoruz. Işık sayısını da sıfır ile yüz arasında bir yüzdeye çeviriyoruz.', yaz: 'void loop() {\n  int sic = map(analogRead(SICAKLIK), 0, 4095, 0, 50);\n  int isik = map(analogRead(LDR), 0, 4095, 0, 100);\n', parca: 1 },
      { ses: 'Ekranın ilk satırına sıcaklığı yazıyoruz. Sonuna biraz boşluk koyuyoruz ki sayı küçülünce eski rakamlar ekranda kalmasın.', yaz: '  lcd.setCursor(0, 0);\n  lcd.print("Sicaklik: ");\n  lcd.print(sic);\n  lcd.print(" C  ");\n', parca: 2 },
      { ses: 'İkinci satıra ışık yüzdesini yazıyoruz.', yaz: '  lcd.setCursor(0, 1);\n  lcd.print("Isik: ");\n  lcd.print(isik);\n  lcd.print(" %  ");\n', parca: 2 },
      { ses: 'Aynı değerleri seri monitöre de gönderiyoruz. Print komutu yazıyı satır sonu eklemeden yazar. Println ise yazdıktan sonra alt satıra geçer.', yaz: '  Serial.print("Sicaklik=");\n  Serial.print(sic);\n  Serial.print(" Isik=");\n  Serial.println(isik);\n' },
      { ses: 'Yarım saniye bekleyip döngüyü tamamlıyoruz. Hava bir anda değişmez, saniyede iki ölçüm yeterlidir.', yaz: '  delay(500);\n}\n' },
      { ses: 'Çalıştıralım! Sıcaklık ve ışık sırayla değişecek. Ekranın ve seri monitörün güncellendiğini izle.', calistir: true, parca: 2 },
      { ses: 'Hava istasyonun hazır! Görevler sekmesinde Fahrenheit hesabı, sıcaklık uyarısı ve gece gündüz yazısı seni bekliyor.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Sensör aralığını 0-100 derece yap',
        metin: 'Sanayi tipi bir sıcaklık sensörü <b>0-100 °C</b> ölçüyor. Sıcaklık haritasının son sayısını <b>50 yerine 100</b> yap.',
        kod: K73(), degistir: [{ ara: '0, 4095, 0, 50' }], sure: 4500,
        girdi: havaGirdi,
        cozum: K73({ sicMax: 100 }),
        ipucu: 'map(analogRead(SICAKLIK), 0, 4095, 0, 50) içindeki son sayıyı 100 yap.',
        kontrol(sim) {
          const k = kayit(sim);
          if (k.length < 3) return hata('Senaryo tamamlanmadı, tekrar dene.');
          if (!sayilar(k[0].lcd[0]).includes(40) || !sayilar(k[1].lcd[0]).includes(60)) return hata(`Sensör 0-100 derece ölçerse LCD 40 ve 60 göstermeli (şu an "${k[0].lcd[0].trim()}" ve "${k[1].lcd[0].trim()}").`);
          return tamam('Sıcaklık aralığı 0-100 derece oldu!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ölçümü saniyede bire indir',
        metin: 'Seri monitör çok hızlı akıyor, okunmuyor. Bekleme süresini <b>1000 ms</b> yap; saniyede bir satır yazılsın.',
        kod: K73(), degistir: [{ ara: 'delay(500)' }], sure: 4500,
        girdi: havaGirdi,
        cozum: K73({ bekle: 1000 }),
        ipucu: 'Döngü sonundaki delay(500) komutunu delay(1000) yap.',
        kontrol(sim) {
          const n = sim.seriCikti.length;
          if (n < 3) return hata('Seri monitöre yeterince satır yazılmadı.');
          if (n > 6) return hata(`4,5 saniyede ${n} satır yazıldı; saniyede bir satır olmalı.`);
          return tamam('Seri monitör saniyede bir kez güncelleniyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Başlığı "Isi:" yap',
        metin: 'LCD\'nin ilk satırında <b>Sicaklik: </b> yazıyor. Yerine daha kısa <b>Isi: </b> yaz.',
        kod: K73(), degistir: [{ ara: '"Sicaklik: "' }], sure: 4500,
        girdi: havaGirdi,
        cozum: K73({ etiket: 'Isi: ' }),
        ipucu: 'lcd.print içindeki "Sicaklik: " yazısını "Isi: " yap. Tırnakları silme.',
        kontrol(sim) {
          const k = kayit(sim);
          if (k.length < 3) return hata('Senaryo tamamlanmadı, tekrar dene.');
          const l = duz(k[0].lcd[0]);
          if (l.includes('sicak')) return hata('Başlık hâlâ "Sicaklik: " yazıyor.');
          if (!l.includes('isi')) return hata('1. satır "Isi: ..." diye başlamalı.');
          return tamam('Başlık "Isi:" oldu!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'gaz-alarmi': {
    sesli: [
      { ses: 'Bu projede mutfaktaki gaz kaçağını fark eden bir alarm yapıyoruz. Gaz sensörü A sıfır pininde, kırmızı LED D sıfır pininde, buzzer D sekiz pininde.', yaz: '#define GAZ A0\n#define LED D0\n#define BUZZER D8\n\n', parca: 0 },
      { ses: 'Kullandığımız sensör MQ iki. Yanıcı gazlara ve dumana duyarlıdır. Havada gaz arttıkça sensörün verdiği sayı büyür.', parca: 0 },
      { ses: 'Setup içinde seri monitörü başlatıyoruz. Değerleri izlemek, eşik seçmenin en iyi yoludur. LED ve buzzer pinlerini de çıkış yapıyoruz.', yaz: 'void setup() {\n  Serial.begin(115200);\n  pinMode(LED, OUTPUT);\n  pinMode(BUZZER, OUTPUT);\n}\n\n', parca: 2 },
      { ses: 'Loop içinde gazı okuyup seri monitöre yazıyoruz.', yaz: 'void loop() {\n  int gaz = analogRead(GAZ);\n  Serial.println(gaz);\n', parca: 0 },
      { ses: 'Gaz iki binin üstüne çıkarsa tehlike var demektir. O zaman LED yanar ve buzzer bin hertz ile öter.', yaz: '  if (gaz > 2000) {\n    digitalWrite(LED, HIGH);\n    tone(BUZZER, 1000);\n', parca: 1 },
      { ses: 'Gaz azsa her şey sakin. LED sönük kalır ve noTone komutuyla buzzer susturulur.', yaz: '  } else {\n    digitalWrite(LED, LOW);\n    noTone(BUZZER);\n  }\n', parca: 2 },
      { ses: 'Yüz milisaniye bekleyip döngüyü tamamlıyoruz. Saniyede on ölçüm, bir gaz alarmı için yeterince hızlıdır.', yaz: '  delay(100);\n}\n' },
      { ses: 'Çalıştıralım! Gaz önce az, sonra eşiğe yakın, sonra çok olacak. Alarm yalnızca gerçek tehlikede çalmalı.', calistir: true, parca: 0 },
      { ses: 'Gaz alarmın hazır! Görevler sekmesinde eşiği ayarlayacak, iki kademeli ve flaşörlü alarm yapacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Yanlış alarmları azalt',
        metin: 'Mutfakta kızartma yapınca alarm boşuna çalıyor. Eşiği <b>2500</b> yap; gaz 2200 iken alarm çalmasın.',
        kod: K74(), degistir: [{ ara: '> 2000' }], sure: 4400,
        girdi: analogSenaryo('A0', [[0, 600], [1000, 2200], [2200, 3200], [3600, 600]]),
        cozum: K74({ esik: 2500 }),
        ipucu: 'if koşulundaki 2000 sayısını 2500 yap.',
        kontrol(sim) {
          const a = alarm(sim, 500), b = alarm(sim, 1800), c = alarm(sim, 2900), d = alarm(sim, 4000);
          if (a.led || a.ses || b.led || b.ses) return hata('Gaz 2200 iken alarm çalmamalı; eşik 2500 olmalı.');
          if (!c.led || !c.ses) return hata('Gaz 3200 iken alarm çalmalı.');
          if (d.led || d.ses) return hata('Gaz azalınca alarm susmalı.');
          return tamam('Eşik 2500 oldu, boş alarmlar azaldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Tiz alarm sesi',
        metin: 'Alarm sesi daha dikkat çekici olsun: buzzer frekansını <b>1000 Hz yerine 2500 Hz</b> yap.',
        kod: K74(), degistir: [{ ara: 'tone(BUZZER, 1000)' }], sure: 2500,
        girdi: analogSenaryo('A0', [[0, 600], [1000, 3200]]),
        cozum: K74({ frekans: 2500 }),
        ipucu: 'tone(BUZZER, 1000) satırındaki 1000 sayısını 2500 yap.',
        kontrol(sim) {
          const ses = olaylar(sim, 'D8', 'ses').filter(o => o.deger > 0);
          if (!ses.length) return hata('Alarm sırasında buzzer ötmedi.');
          if (!ses.some(o => Math.abs(o.deger - 2500) < 100)) return hata(`Buzzer ${ses[0].deger} Hz çaldı; 2500 Hz olmalı.`);
          return tamam('Alarm 2500 Hz ile tiz tiz ötüyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Gazı yarım saniyede bir yaz',
        metin: 'Seri monitör saniyede on satır yazıyor. Bekleme süresini <b>500 ms</b> yap.',
        kod: K74(), degistir: [{ ara: 'delay(100)' }], sure: 4400,
        girdi: analogSenaryo('A0', [[0, 600]]),
        cozum: K74({ bekle: 500 }),
        ipucu: 'Döngünün sonundaki delay(100) komutunu delay(500) yap.',
        kontrol(sim) {
          const n = sim.seriCikti.length;
          if (n < 5) return hata('Seri monitöre yeterince değer yazılmadı.');
          if (n > 12) return hata(`4,4 saniyede ${n} satır yazıldı; yarım saniyede bir satır (yaklaşık 9) olmalı.`);
          return tamam('Gaz değeri yarım saniyede bir yazılıyor!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'sifreli-kasa': {
    sesli: [
      { ses: 'Bu projede on iki tuşlu bir tuş takımıyla açılan şifreli bir kasa yapıyoruz. Doğru şifrede servo kilidi açacak, yanlış şifrede kırmızı LED yanacak. Önce gerekli kütüphaneleri ve değişkenleri hazırlıyoruz.', yaz: '#include <ESP32Servo.h>\n#include <LiquidCrystal_I2C.h>\n\n#define TUS A0\n#define LED D0\n\nServo kilit;\nLiquidCrystal_I2C lcd(0x27, 16, 2);\nint sifre[4] = {1, 2, 3, 4};\nint girilen = 0;\nbool dogru = true;\n\n', parca: 0 },
      { ses: 'Tuş takımı tek bir analog pine bağlı. Her tuş farklı bir gerilim, yani farklı bir sayı üretir. Birinci tuş üç yüz kırk, ikinci tuş altı yüz seksen, her tuşta üç yüz kırk daha artar. Hiçbir tuşa basılmazsa sıfır okunur.', parca: 0 },
      { ses: 'Tusoku fonksiyonu analog sayıdan tuş numarasını bulur. Sayıya yüz yetmiş ekleyip üç yüz kırka bölüyoruz. Böylece sayı biraz oynasa bile doğru tuşu buluruz. Tuşa basılmıyorsa sonuç sıfır çıkar.', yaz: 'int tusOku() {\n  int v = analogRead(TUS);\n  return (v + 170) / 340;\n}\n\n', parca: 0 },
      { ses: 'Setup içinde LED pinini çıkış yapıyor, servoyu D beş pinine bağlayıp kilidi kapalı konuma, yani sıfır dereceye getiriyoruz. Ekrana da şifre girin yazısı ve kilitli durumu yazıyoruz.', yaz: 'void setup() {\n  pinMode(LED, OUTPUT);\n  kilit.attach(D5);\n  kilit.write(0);\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Sifre girin:");\n  lcd.setCursor(0, 1);\n  lcd.print("KILITLI         ");\n}\n\n', parca: 1 },
      { ses: 'Loop içinde tuşu okuyoruz. Sıfırdan büyükse bir tuşa basılmış demektir.', yaz: 'void loop() {\n  int tus = tusOku();\n  if (tus > 0) {\n', parca: 0 },
      { ses: 'Basılan tuş, şifrenin sıradaki rakamıyla aynı değilse dogru değişkenini yanlış yapıyoruz. Sonra girilen tuş sayısını bir artırıyoruz.', yaz: '    if (tus != sifre[girilen]) {\n      dogru = false;\n    }\n    girilen += 1;\n' },
      { ses: 'Ekranın ikinci satırına girilen tuş sayısı kadar yıldız basıyoruz. Şifre ekranda görünmesin. Sonra kullanıcı tuştan elini çekene kadar bekliyoruz, böylece bir basış iki kez sayılmaz.', yaz: '    lcd.setCursor(0, 1);\n    for (int i = 0; i < girilen; i++) {\n      lcd.print("*");\n    }\n    lcd.print("                ");\n    while (tusOku() > 0) {\n      delay(20);\n    }\n', parca: 2 },
      { ses: 'Dört tuşa basıldıysa şifre tamamlanmıştır. Hepsi doğruysa ekrana açık yazıyoruz, servoyu doksan dereceye çevirip kilidi üç saniye açık tutuyoruz ve tekrar kapatıyoruz.', yaz: '    if (girilen == 4) {\n      lcd.setCursor(0, 1);\n      if (dogru) {\n        lcd.print("ACIK!           ");\n        kilit.write(90);\n        delay(3000);\n        kilit.write(0);\n', parca: 1 },
      { ses: 'Yanlış girildiyse ekrana yanlış yazıyoruz ve kırmızı LED\'i bir saniye yakıyoruz. Kilit kapalı kalıyor.', yaz: '      } else {\n        lcd.print("YANLIS!         ");\n        digitalWrite(LED, HIGH);\n        delay(1000);\n        digitalWrite(LED, LOW);\n      }\n', parca: 3 },
      { ses: 'Sonunda ekranı kilitli durumuna alıp sayaçları sıfırlıyoruz, yeni deneme için hazırlanıyoruz. Döngüye de yirmi milisaniyelik kısa bir bekleme koyuyoruz.', yaz: '      lcd.setCursor(0, 1);\n      lcd.print("KILITLI         ");\n      girilen = 0;\n      dogru = true;\n    }\n  }\n  delay(20);\n}\n' },
      { ses: 'Çalıştıralım! Önce yanlış bir şifre girilecek: LED yanmalı, kasa kapalı kalmalı. Sonra doğru şifre girilecek ve servo kilidi açacak.', calistir: true, parca: 0 },
      { ses: 'Şifreli kasan hazır! Görevler sekmesinde şifreni değiştirecek, süreyi ayarlayacak ve iptal tuşu ekleyeceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Yanlış şifrede LED 2 saniye yansın',
        metin: 'Hırsız şifreyi yanlış girince kırmızı LED <b>2 saniye (2000 ms)</b> yanık kalsın.',
        kod: K75(), degistir: [{ ara: 'delay(1000)' }], sure: 6000,
        girdi: kasaSenaryo([[500, [1, 2, 3, 5]]]),
        cozum: K75({ led: 2000 }),
        ipucu: 'LED yandıktan sonraki delay(1000) süresini delay(2000) yap.',
        kontrol(sim) {
          const l = cikis(sim, 'D0');
          const ac = l.find(o => o.deger === 1), kapa = l.find(o => ac && o.t > ac.t && o.deger === 0);
          if (!ac) return hata('Yanlış şifrede LED yanmadı.');
          if (!kapa) return hata('LED hiç sönmedi.');
          const sure = kapa.t - ac.t;
          if (sure < 1800 || sure > 2400) return hata(`LED ${Math.round(sure)} ms yandı; 2000 ms yanmalı.`);
          return tamam('Yanlış şifrede LED 2 saniye yanıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Şifreyi 4-3-2-1 yap',
        metin: 'Kasanın şifresini <b>4-3-2-1</b> olarak değiştir. Önce yanlış (1-2-3-4) sonra doğru (4-3-2-1) şifre denenecek.',
        kod: K75(), degistir: [{ ara: '{1, 2, 3, 4}' }], sure: 9500,
        girdi: kasaSenaryo([[500, [1, 2, 3, 4]], [4200, [4, 3, 2, 1]]]),
        cozum: K75({ sifre: '4, 3, 2, 1' }),
        ipucu: 'int sifre[4] = {1, 2, 3, 4}; dizisindeki sayıları 4, 3, 2, 1 yap.',
        kontrol: sim => kasaKontrol(sim, KASA),
      },
      {
        tip: 'duzenle', baslik: 'Kilidi daha geniş aç',
        metin: 'Kilit mandalı daha geniş açılmalı: servoyu <b>90 yerine 120 dereceye</b> çevir.',
        kod: K75(), degistir: [{ ara: 'kilit.write(90)' }], sure: 6000,
        girdi: kasaSenaryo([[500, [1, 2, 3, 4]]]),
        cozum: K75({ aci: 120 }),
        ipucu: 'Doğru şifre dalındaki kilit.write(90) komutunun 90 sayısını 120 yap.',
        kontrol(sim) {
          const ac = olaylar(sim, 'D5', 'servo').filter(a => a.deger >= 80);
          if (!ac.length) return hata('Doğru şifrede kilit açılmadı.');
          if (!ac.some(a => a.deger >= 115 && a.deger <= 125)) return hata(`Servo ${ac[0].deger} dereceye gitti; 120 dereceye gitmeli.`);
          return tamam('Kilit 120 dereceye kadar açılıyor!');
        },
      },
    ],
  },
};
