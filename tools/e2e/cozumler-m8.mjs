// Modül 8 (robot araba) için referans C++ çözümleri (ders id -> kod).
// tools/e2e/e2e.mjs bu dosyayı otomatik birleştirir. Bu metinler src/lessons/icerik/m8-sesli.js içindeki sesli anlatımla birebir aynıdır.

export default {
  'araba-motorlar': `// Sol motor: D0 ileri, D1 geri. Sag motor: D2 ileri, D3 geri.

void ileri() {
  digitalWrite(D0, HIGH);
  digitalWrite(D1, LOW);
  digitalWrite(D2, HIGH);
  digitalWrite(D3, LOW);
}

void geri() {
  digitalWrite(D0, LOW);
  digitalWrite(D1, HIGH);
  digitalWrite(D2, LOW);
  digitalWrite(D3, HIGH);
}

void dur() {
  digitalWrite(D0, LOW);
  digitalWrite(D1, LOW);
  digitalWrite(D2, LOW);
  digitalWrite(D3, LOW);
}

void setup() {
  pinMode(D0, OUTPUT);
  pinMode(D1, OUTPUT);
  pinMode(D2, OUTPUT);
  pinMode(D3, OUTPUT);
  ileri();
  delay(2000);
  dur();
  delay(500);
  geri();
  delay(1000);
  dur();
}

void loop() {
}
`,

  'araba-donus': `// Kare: ileri git, saga don; 4 kez tekrarla.

void ileri() {
  digitalWrite(D0, HIGH);
  digitalWrite(D1, LOW);
  digitalWrite(D2, HIGH);
  digitalWrite(D3, LOW);
}

void saga() {
  digitalWrite(D0, HIGH);
  digitalWrite(D1, LOW);
  digitalWrite(D2, LOW);
  digitalWrite(D3, HIGH);
}

void sola() {
  digitalWrite(D0, LOW);
  digitalWrite(D1, HIGH);
  digitalWrite(D2, HIGH);
  digitalWrite(D3, LOW);
}

void dur() {
  digitalWrite(D0, LOW);
  digitalWrite(D1, LOW);
  digitalWrite(D2, LOW);
  digitalWrite(D3, LOW);
}

void setup() {
  pinMode(D0, OUTPUT);
  pinMode(D1, OUTPUT);
  pinMode(D2, OUTPUT);
  pinMode(D3, OUTPUT);
  for (int i = 0; i < 4; i++) {
    ileri();
    delay(1000);
    saga();
    delay(380);
    dur();
    delay(200);
  }
}

void loop() {
}
`,

  'engelden-kacan': `// Mesafe sensoru D4: engel yakinsa geri git ve don.

void ileri() {
  digitalWrite(D0, HIGH);
  digitalWrite(D1, LOW);
  digitalWrite(D2, HIGH);
  digitalWrite(D3, LOW);
}

void geri() {
  digitalWrite(D0, LOW);
  digitalWrite(D1, HIGH);
  digitalWrite(D2, LOW);
  digitalWrite(D3, HIGH);
}

void saga() {
  digitalWrite(D0, HIGH);
  digitalWrite(D1, LOW);
  digitalWrite(D2, LOW);
  digitalWrite(D3, HIGH);
}

void sola() {
  digitalWrite(D0, LOW);
  digitalWrite(D1, HIGH);
  digitalWrite(D2, HIGH);
  digitalWrite(D3, LOW);
}

void setup() {
  pinMode(D0, OUTPUT);
  pinMode(D1, OUTPUT);
  pinMode(D2, OUTPUT);
  pinMode(D3, OUTPUT);
  pinMode(D4, INPUT);
}

void loop() {
  if (mesafeOlc(D4) < 30) {
    geri();
    delay(400);
    saga();
    delay(380);
  } else {
    ileri();
  }
  delay(50);
}
`,

  'cizgi-izleyen': `// Cizgi sensoru: siyah cizgide 1, beyaz zeminde 0.

void ileri() {
  digitalWrite(D0, HIGH);
  digitalWrite(D1, LOW);
  digitalWrite(D2, HIGH);
  digitalWrite(D3, LOW);
}

void sola() {
  digitalWrite(D0, LOW);
  digitalWrite(D1, HIGH);
  digitalWrite(D2, HIGH);
  digitalWrite(D3, LOW);
}

void saga() {
  digitalWrite(D0, HIGH);
  digitalWrite(D1, LOW);
  digitalWrite(D2, LOW);
  digitalWrite(D3, HIGH);
}

void setup() {
  pinMode(D0, OUTPUT);
  pinMode(D1, OUTPUT);
  pinMode(D2, OUTPUT);
  pinMode(D3, OUTPUT);
  pinMode(D5, INPUT);
  pinMode(D6, INPUT);
  delay(1000);
}

void loop() {
  int sol = digitalRead(D5);
  int sag = digitalRead(D6);
  if (sol == 1) {
    sola();
  } else if (sag == 1) {
    saga();
  } else {
    ileri();
  }
  delay(50);
}
`,
};
