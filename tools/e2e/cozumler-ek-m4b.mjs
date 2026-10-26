// Modül 4 ek dersler (4.5, 4.6) için referans C++ çözümleri (ders id -> kod).
// tools/e2e/e2e.mjs bu dosyayı tools/e2e/cozumler*.mjs deseniyle otomatik birleştirir.
// Döngüler delay(20) ile kısa tutulur: gerçek tarayıcı gecikmesinde bile sanal saat sırasını bozmaz.
export default {
  'isik-calgisi': `#define LDR A0
#define BUZZER D8

void setup() {
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  int isik = analogRead(LDR);                    // 0-4095
  int frekans = map(isik, 0, 4095, 200, 2000);   // ışık arttıkça frekans artar
  tone(BUZZER, frekans);
  delay(20);
}
`,

  'pot-servo': `#include <ESP32Servo.h>

#define POT A0

Servo servo;

void setup() {
  servo.attach(D5);
}

void loop() {
  int deger = analogRead(POT);                // 0-4095
  int aci = map(deger, 0, 4095, 0, 180);      // topuzu açıya çevir
  servo.write(aci);
  delay(20);
}
`,
};
