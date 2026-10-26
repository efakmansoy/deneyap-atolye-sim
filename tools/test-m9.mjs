// Modül 9 test paketi: node tools/test-m9.mjs
import DERSLER from '../src/lessons/m9-esp32.js';
import ICERIK from '../src/lessons/icerik/m9-sesli.js';
import COZUMLER from './e2e/cozumler-m9.mjs';
import { KOD_91, KOD_92, KOD_93, KOD_94 } from '../src/lessons/icerik/m9-sesli.js';
import { calistir } from './ders-test-ortak.mjs';

// Kod görevlerinin referans çözümleri (görev başlığı -> C++)
const gorevCozum = {
  'esp32-tanisma': {
    'Hızlı yanıp sön (250 ms)': KOD_91(250, 250),
    'Tam 3 kez yanıp sön': `void setup() {
  pinMode(D0, OUTPUT);
  for (int i = 0; i < 3; i++) {
    digitalWrite(D0, HIGH);
    delay(200);
    digitalWrite(D0, LOW);
    delay(200);
  }
}
void loop() {}
`,
    'Seri monitörde say': `int sayac = 0;
void setup() { Serial.begin(115200); }
void loop() {
  sayac += 1;
  Serial.println(sayac);
  delay(1000);
}
`,
  },
  'esp-led-devresi': {
    'Yarım parlaklık': `void setup() {
  ledcAttach(D0, 5000, 8);
  ledcWrite(D0, 128);
}
void loop() {}
`,
    'Hızlı nefes': KOD_92(5),
    'Üç kademe': `void setup() { ledcAttach(D0, 5000, 8); }
void loop() {
  ledcWrite(D0, 30);
  delay(500);
  ledcWrite(D0, 120);
  delay(500);
  ledcWrite(D0, 255);
  delay(500);
}
`,
  },
  'esp-dugme': {
    'Bas-bırak anahtarı (toggle)': `bool acik = false;
void setup() {
  pinMode(D5, INPUT_PULLUP);
  pinMode(D0, OUTPUT);
}
void loop() {
  if (digitalRead(D5) == LOW) {
    acik = !acik;
    digitalWrite(D0, acik ? HIGH : LOW);
    while (digitalRead(D5) == LOW) {
      delay(10);
    }
    delay(30);
  }
  delay(10);
}
`,
    'Normalde yanık, basınca sönük': KOD_93('HIGH'),
    'Basış sayacı': `int sayac = 0;
void setup() {
  Serial.begin(115200);
  pinMode(D5, INPUT_PULLUP);
}
void loop() {
  if (digitalRead(D5) == LOW) {
    sayac += 1;
    Serial.println(sayac);
    while (digitalRead(D5) == LOW) {
      delay(10);
    }
    delay(30);
  }
  delay(10);
}
`,
  },
  'dokunmatik-dugme': {
    'Daha sert eşik (25)': KOD_94(25),
    'Dokunurken yan, bırakınca sön': `void setup() {
  pinMode(D0, OUTPUT);
}
void loop() {
  if (touchRead(D4) < 40) {
    digitalWrite(D0, HIGH);
  } else {
    digitalWrite(D0, LOW);
  }
  delay(10);
}
`,
    'Dokunma sayacı': `int sayac = 0;
void setup() { Serial.begin(115200); }
void loop() {
  if (touchRead(D4) < 40) {
    sayac += 1;
    Serial.println(sayac);
    while (touchRead(D4) < 40) {
      delay(10);
    }
  }
  delay(20);
}
`,
  },
};

await calistir({ baslik: 'Modül 9', DERSLER, ICERIK, COZUMLER, gorevCozum, adet: 4 });
