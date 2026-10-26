// Modül 5 ek dersleri (5.3, 5.4) için referans C++ çözümleri (ders id -> kod).
// tools/e2e/e2e.mjs, tools/e2e/cozumler*.mjs dosyalarını birleştirir.
export default {
  'lcd-termometre': `#include <LiquidCrystal_I2C.h>

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
  float sicaklik = ham * 50.0 / 4095.0;
  lcd.setCursor(0, 1);
  lcd.print(sicaklik, 1);
  if (sicaklik > 30) {
    lcd.print(" C SICAK!   ");
  } else {
    lcd.print(" C          ");
  }
  delay(200);
}
`,

  'elektronik-zar': `#include <LiquidCrystal_I2C.h>

#define DUGME D5

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  pinMode(DUGME, INPUT);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Zar At");
}

void loop() {
  if (digitalRead(DUGME) == HIGH) {
    for (int i = 0; i < 10; i++) {
      lcd.setCursor(0, 1);
      lcd.print(random(1, 7));
      delay(70);
    }
    while (digitalRead(DUGME) == HIGH) {
      delay(10);
    }
  }
}
`,
};
