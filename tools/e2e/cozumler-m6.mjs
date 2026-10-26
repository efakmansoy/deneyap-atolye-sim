// Modül 6 için referans C++ çözümleri (ders id -> kod).
// tools/e2e/e2e.mjs bu dosyayı otomatik birleştirir.

export default {
  'cop-kovasi': `#include <ESP32Servo.h>

Servo servo;

void setup() {
  servo.attach(D5);
  servo.write(0);
}

void loop() {
  if (mesafeOlc(D3) < 20) {
    servo.write(90);
    delay(2000);
    servo.write(0);
  }
  delay(50);
}
`,

  'kisi-sayaci': `#include <LiquidCrystal_I2C.h>

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
  if (mesafeOlc(D3) < 30) {
    sayac += 1;
    tone(D8, 1500);
    delay(100);
    noTone(D8);
    lcd.setCursor(0, 1);
    lcd.print(sayac);
    lcd.print("   ");
    while (mesafeOlc(D3) < 30) {
      delay(20);
    }
  }
  delay(30);
}
`,

  'yem-verici': `#include <ESP32Servo.h>

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
    servo.write(90);
    delay(1000);
    servo.write(0);
    while (digitalRead(D2) == HIGH) {
      delay(20);
    }
  }
  delay(30);
}
`,

  'hirsiz-alarmi': `void setup() {
  pinMode(D0, OUTPUT);
  pinMode(D8, OUTPUT);
}

void loop() {
  if (analogRead(A0) < 1500) {
    digitalWrite(D0, HIGH);
    tone(D8, 1200);
    delay(150);
    digitalWrite(D0, LOW);
    tone(D8, 800);
    delay(150);
  } else {
    digitalWrite(D0, LOW);
    noTone(D8);
    delay(50);
  }
}
`,

  'otopark-bariyeri': `#include <ESP32Servo.h>
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
  if (mesafeOlc(D3) < 25) {
    servo.write(90);
    lcd.setCursor(0, 1);
    lcd.print("Geciniz     ");
  } else {
    servo.write(0);
    lcd.setCursor(0, 1);
    lcd.print("DUR         ");
  }
  delay(50);
}
`,

  'gunes-takipci': `#include <ESP32Servo.h>

Servo servo;

void setup() {
  servo.attach(D5);
}

void loop() {
  int isik = analogRead(A0);
  int aci = map(isik, 0, 4095, 0, 180);
  servo.write(aci);
  delay(30);
}
`,

  'gunes-paneli': `#include <LiquidCrystal_I2C.h>

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
  if (guc >= 50) {
    digitalWrite(D0, HIGH);
  } else {
    digitalWrite(D0, LOW);
  }
  delay(100);
}
`,
};
