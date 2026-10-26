// Her dersin ana hedefini çözen Arduino C++ programları (ders id -> kod).
// tools/test-cozumler.mjs bunları simülatörde çalıştırıp ders.kontrol(sim) ile doğrular.
export default {
  // ── Modül 1: LED ──
  'led-yak': `#define LED D0

void setup() {
  pinMode(LED, OUTPUT);
  digitalWrite(LED, HIGH);  // LED'i yak
}

void loop() {
}
`,

  'led-yanip-son': `#define LED D0

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  digitalWrite(LED, HIGH);  // yak
  delay(500);
  digitalWrite(LED, LOW);   // söndür
  delay(500);
}
`,

  'iki-led': `#define KIRMIZI D0
#define YESIL D1

void setup() {
  pinMode(KIRMIZI, OUTPUT);
  pinMode(YESIL, OUTPUT);
}

void loop() {
  // Kırmızı yanar (önce yeşili söndür, iki LED asla birlikte yanmasın)
  digitalWrite(YESIL, LOW);
  digitalWrite(KIRMIZI, HIGH);
  delay(400);
  // Roller değişir
  digitalWrite(KIRMIZI, LOW);
  digitalWrite(YESIL, HIGH);
  delay(400);
}
`,

  // ── Modül 2: Düğme ──
  'buton-led': `#define DUGME D5
#define LED D2

void setup() {
  pinMode(DUGME, INPUT);
  pinMode(LED, OUTPUT);
}

void loop() {
  if (digitalRead(DUGME) == HIGH) {
    digitalWrite(LED, HIGH);  // basılıyken yan
  } else {
    digitalWrite(LED, LOW);
  }
}
`,

  'iki-buton': `#define DUGME_A D5
#define DUGME_B D6
#define LED_VE D2
#define LED_VEYA D3

void setup() {
  pinMode(DUGME_A, INPUT);
  pinMode(DUGME_B, INPUT);
  pinMode(LED_VE, OUTPUT);
  pinMode(LED_VEYA, OUTPUT);
}

void loop() {
  bool a = digitalRead(DUGME_A) == HIGH;
  bool b = digitalRead(DUGME_B) == HIGH;
  digitalWrite(LED_VE, a && b);    // ikisi birlikte
  digitalWrite(LED_VEYA, a || b);  // en az biri
}
`,

  'seri-monitor': `#define DUGME D5

void setup() {
  Serial.begin(115200);
  pinMode(DUGME, INPUT);
}

void loop() {
  Serial.print("Düğme: ");
  Serial.println(digitalRead(DUGME));  // 0 ya da 1
  delay(200);
}
`,

  'dugme-sayaci': `#define DUGME D5

int sayac = 0;

void setup() {
  Serial.begin(115200);
  pinMode(DUGME, INPUT);
}

void loop() {
  if (digitalRead(DUGME) == HIGH) {
    sayac++;
    Serial.println(sayac);
    // Düğme bırakılana kadar bekle
    while (digitalRead(DUGME) == HIGH) {
    }
  }
}
`,

  'refleks-oyunu': `#define DUGME D5
#define LED D2

unsigned long baslangic;
unsigned long sure;

void setup() {
  Serial.begin(115200);
  pinMode(DUGME, INPUT);
  pinMode(LED, OUTPUT);

  delay(2000);                 // oyuncu ne zaman yanacağını bilmesin
  digitalWrite(LED, HIGH);
  baslangic = millis();        // yanma anı

  while (digitalRead(DUGME) == LOW) {
    // düğmeye basılmasını bekle
  }
  sure = millis() - baslangic;

  Serial.print("Tepki: ");
  Serial.print(sure);
  Serial.println(" ms");
  digitalWrite(LED, LOW);
}

void loop() {
}
`,

  // ── Modül 3: Analog ──
  'rgb-led': `#define KIRMIZI D0
#define YESIL D1
#define MAVI D2

void setup() {
  pinMode(KIRMIZI, OUTPUT);
  pinMode(YESIL, OUTPUT);
  pinMode(MAVI, OUTPUT);
  // Kırmızı + mavi = mor
  analogWrite(KIRMIZI, 255);
  analogWrite(YESIL, 0);
  analogWrite(MAVI, 255);
}

void loop() {
}
`,

  'pwm-parlaklik': `#define LED D0

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  // Yavaşça parla
  for (int i = 0; i <= 255; i += 5) {
    analogWrite(LED, i);
    delay(20);
  }
  // Yavaşça sön
  for (int i = 255; i >= 0; i -= 5) {
    analogWrite(LED, i);
    delay(20);
  }
}
`,

  'potansiyometre': `#define POT A0
#define LED D0

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  int deger = analogRead(POT);                   // 0-4095
  analogWrite(LED, map(deger, 0, 4095, 0, 255)); // 0-255'e küçült
  delay(10);
}
`,

  'ldr-gece-lambasi': `#define LDR A0
#define LED D0

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  if (analogRead(LDR) < 1000) {
    digitalWrite(LED, HIGH);  // karanlık: yak
  } else {
    digitalWrite(LED, LOW);   // aydınlık: söndür
  }
  delay(10);
}
`,

  'sicaklik-gostergesi': `#define SICAKLIK A1
#define ALARM D0

void setup() {
  pinMode(ALARM, OUTPUT);
}

void loop() {
  if (analogRead(SICAKLIK) > 2500) {
    digitalWrite(ALARM, HIGH);  // çok sıcak
  } else {
    digitalWrite(ALARM, LOW);
  }
  delay(10);
}
`,

  'led-cubugu': `#define POT A0

void setup() {
  for (int i = 0; i < 8; i++) {
    pinMode(D0 + i, OUTPUT);
  }
}

void loop() {
  int seviye = map(analogRead(POT), 0, 4095, 0, 8);  // 0-8 LED
  for (int i = 0; i < 8; i++) {
    digitalWrite(D0 + i, i < seviye);
  }
  delay(10);
}
`,

  // ── Modül 4: Ses ve hareket ──
  'buzzer-melodi': `#define BUZZER D8

// Do Mi Sol Do' Sol Mi Do
int notalar[] = {262, 330, 392, 523, 392, 330, 262};

void setup() {
  for (int i = 0; i < 7; i++) {
    tone(BUZZER, notalar[i]);
    delay(300);
    noTone(BUZZER);
    delay(50);
  }
}

void loop() {
}
`,

  'servo-motor': `#include <ESP32Servo.h>

Servo servo;

void setup() {
  servo.attach(D5);
  // 0'dan 180'e 30 derecelik adımlarla
  for (int aci = 0; aci <= 180; aci += 30) {
    servo.write(aci);
    delay(100);
  }
  // 180'den 0'a geri
  for (int aci = 150; aci >= 0; aci -= 30) {
    servo.write(aci);
    delay(100);
  }
}

void loop() {
}
`,

  'park-sensoru': `#define MESAFE D3
#define BUZZER D8

// Mesafeyi santimetre olarak ölç
long mesafeOlc(int pin) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);
  delayMicroseconds(2);
  digitalWrite(pin, HIGH);
  delayMicroseconds(10);
  digitalWrite(pin, LOW);
  pinMode(pin, INPUT);
  return pulseIn(pin, HIGH, 30000) / 58;
}

void setup() {
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  long cm = mesafeOlc(MESAFE);
  if (cm < 100) {
    tone(BUZZER, 1000);
    delay(cm * 4);   // yaklaştıkça bip sıklaşır
    noTone(BUZZER);
    delay(cm * 4);
  } else {
    delay(20);       // uzakta sessiz kal
  }
}
`,

  'dugme-piyano': `#define BUZZER D8

void setup() {
  for (int i = 0; i < 7; i++) {
    pinMode(D0 + i, INPUT);
  }
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  noTone(BUZZER);  // tuş yoksa sessiz
  if (digitalRead(D0) == HIGH) tone(BUZZER, 262);  // Do
  if (digitalRead(D1) == HIGH) tone(BUZZER, 294);  // Re
  if (digitalRead(D2) == HIGH) tone(BUZZER, 330);  // Mi
  if (digitalRead(D3) == HIGH) tone(BUZZER, 349);  // Fa
  if (digitalRead(D4) == HIGH) tone(BUZZER, 392);  // Sol
  if (digitalRead(D5) == HIGH) tone(BUZZER, 440);  // La
  if (digitalRead(D6) == HIGH) tone(BUZZER, 494);  // Si
}
`,

  // ── Modül 5: Proje ──
  'lcd-merhaba': `#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Merhaba");       // 1. satır
  for (int i = 1; i <= 5; i++) {
    lcd.setCursor(0, 1);
    lcd.print(i);            // 2. satır: sayaç
    delay(500);
  }
}

void loop() {
}
`,

  'proje-perde': `#include <ESP32Servo.h>
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
  if (isik > 2000) {
    perde.write(180);                // gün ışığı: perde açık
    lcd.print("Perde: Acik     ");
  } else {
    perde.write(0);                  // karanlık: perde kapalı
    lcd.print("Perde: Kapali   ");
  }
  delay(100);
}
`,
};
