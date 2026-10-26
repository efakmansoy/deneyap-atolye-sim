// Modül 9 için sesli anlatım parçaları ve "kodu değiştir" görevleri
import { olaylar, tamam, hata, dugmeSenaryo } from '../m6-projeler.js';
import { durumAt, seriMetin, dokunmaSenaryo } from '../m9-esp32.js';

// ── Referans C++ çözümleri (tools/e2e/cozumler-m9.mjs bunları kullanır) ──
export const KOD_91 = (yan = 500, son = 500, mesaj = 'Merhaba ESP32!') => `void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  Serial.println("${mesaj}");
}

void loop() {
  digitalWrite(D0, HIGH);
  delay(${yan});
  digitalWrite(D0, LOW);
  delay(${son});
}
`;

export const KOD_92 = (bekle = 20, tepe = 255, adim = 5) => `void setup() {
  ledcAttach(D0, 5000, 8);
}

void loop() {
  for (int p = 0; p <= ${tepe}; p += ${adim}) {
    ledcWrite(D0, p);
    delay(${bekle});
  }
  for (int p = ${tepe}; p >= 0; p -= ${adim}) {
    ledcWrite(D0, p);
    delay(${bekle});
  }
}
`;

export const KOD_93 = (kosul = 'LOW', yak = 'digitalWrite(D0, HIGH);', sonOnce = '') => `void setup() {
  pinMode(D5, INPUT_PULLUP);
  pinMode(D0, OUTPUT);
}

void loop() {
  if (digitalRead(D5) == ${kosul}) {
    ${yak}
  } else {
    ${sonOnce}digitalWrite(D0, LOW);
  }
  delay(10);
}
`;

export const KOD_94 = (esik = 40, mesaj = 'deger') => `const int ESIK = ${esik};
bool acik = false;

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
}

void loop() {
  int deger = touchRead(D4);
  if (deger < ESIK) {
    acik = !acik;
    digitalWrite(D0, acik ? HIGH : LOW);
    Serial.println(${mesaj});
    while (touchRead(D4) < ESIK) {
      delay(10);
    }
  }
  delay(20);
}
`;

export default {
  // ──────────────────────────────────────────────────────────
  'esp32-tanisma': {
    sesli: [
      { ses: 'Yeni parkurumuza hoş geldin! Sahnedeki Deneyap Kart, ESP32-S3 çipi taşıyan bir ESP32 ailesi kartıdır. Bu derste bununla ilk programımızı yazıyoruz: yanıp sönen bir LED ve seri monitöre bir selam.', parca: 0 },
      { ses: 'Setup bölümü kart açılınca bir kez çalışır. Önce seri haberleşmeyi yüz on beş bin iki yüz hızında başlatıyoruz, böylece bilgisayara yazı gönderebileceğiz.', yaz: 'void setup() {\n  Serial.begin(115200);\n' },
      { ses: 'LED D sıfır pinine bağlı. Bu pini çıkış olarak ayarlıyoruz, çünkü LED\'e akım gönderecek olan biziz.', yaz: '  pinMode(D0, OUTPUT);\n', parca: 0 },
      { ses: 'Seri monitöre kartın selamını yazıyoruz. Pinler üç virgül üç volt ile çalıştığı için, bağlantılarda her zaman gerilime dikkat ederiz.', yaz: '  Serial.println("Merhaba ESP32!");\n}\n\n' },
      { ses: 'Loop bölümü sürekli tekrar eder. Önce LED\'i yakıyoruz.', yaz: 'void loop() {\n  digitalWrite(D0, HIGH);\n', parca: 0 },
      { ses: 'Yanık halde yarım saniye, yani beş yüz milisaniye bekliyoruz.', yaz: '  delay(500);\n' },
      { ses: 'Sonra LED\'i söndürüyoruz.', yaz: '  digitalWrite(D0, LOW);\n', parca: 0 },
      { ses: 'Sönük halde de yarım saniye bekleyip döngüyü kapatıyoruz. Kart bunu sonsuza kadar tekrar edecek.', yaz: '  delay(500);\n}\n' },
      { ses: 'Şimdi çalıştıralım! LED saniyede bir yanıp sönecek.', calistir: true, parca: 0 },
      { ses: 'ESP32 ile ilk programın hazır! Görevler sekmesinde hızı ve davranışı değiştirerek denemeler yapabilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Yavaş yanıp sön (1000 ms)',
        metin: 'LED daha yavaş yanıp sönsün: yanma ve sönme sürelerini <b>1000 ms</b> yap.',
        kod: KOD_91(), degistir: [{ ara: 'delay(500)' }],
        cozum: KOD_91(1000, 1000), sure: 4500,
        ipucu: 'İki delay(500) satırını da delay(1000) yap.',
        kontrol(sim) {
          const g = olaylar(sim, 'D0');
          if (g.length < 3) return hata('LED yeterince değişmedi.');
          const a = g.slice(1).map((o, i) => o.t - g[i].t);
          if (!a.every(x => x >= 850 && x <= 1150)) return hata('Süreler yaklaşık 1000 ms olmalı.');
          return tamam('LED artık saniyede bir değişiyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Mesajı değiştir',
        metin: 'Seri monitöre <b>Merhaba Atolye!</b> yazdır.',
        kod: KOD_91(), degistir: [{ ara: '"Merhaba ESP32!"' }],
        cozum: KOD_91(500, 500, 'Merhaba Atolye!'), sure: 1500,
        ipucu: 'Tırnak içindeki yazıyı değiştir; tırnakları silme.',
        kontrol(sim) {
          if (!seriMetin(sim).includes('Merhaba Atolye!')) return hata('Seri monitörde "Merhaba Atolye!" yazısı görünmedi.');
          return tamam('Yeni mesaj seri monitöre yazıldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Kısa parlama',
        metin: 'LED <b>100 ms</b> parlasın, sonra <b>900 ms</b> sönük kalsın (fener gibi kısa çakma).',
        kod: KOD_91(), degistir: [{ ara: 'delay(500);\n  digitalWrite(D0, LOW)' }, { ara: 'delay(500);\n}' }],
        cozum: KOD_91(100, 900), sure: 3200,
        ipucu: 'İlk delay 100, ikinci delay 900 olmalı.',
        kontrol(sim) {
          const g = olaylar(sim, 'D0');
          if (g.length < 4) return hata('LED yeterince değişmedi.');
          const yanik = g[1].t - g[0].t, sonuk = g[2].t - g[1].t;
          if (yanik < 60 || yanik > 180) return hata(`LED ${yanik} ms yandı, 100 ms olmalı.`);
          if (sonuk < 800 || sonuk > 1000) return hata(`LED ${sonuk} ms sönük kaldı, 900 ms olmalı.`);
          return tamam('Kısa çakma efekti hazır!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'esp-led-devresi': {
    sesli: [
      { ses: 'Bu derste LED\'in parlaklığını ayarlıyoruz. Önce devreye bakalım: LED, bir direnç üzerinden D sıfır pinine bağlı. Direnç, LED\'in fazla akım çekip yanmasını önler.', parca: 0 },
      { ses: 'ESP32\'de parlaklık için ledc denen PWM çıkışını kullanırız. Setup içinde D sıfır pinini beş bin hertz frekans ve sekiz bit çözünürlükle ayarlıyoruz. Sekiz bit, sıfırdan iki yüz elli beşe kadar değer demektir.', yaz: 'void setup() {\n  ledcAttach(D0, 5000, 8);\n}\n\n' },
      { ses: 'Loop içinde önce parlaklığı artırıyoruz. P değişkeni sıfırdan iki yüz elli beşe, beşer beşer yükselecek.', yaz: 'void loop() {\n  for (int p = 0; p <= 255; p += 5) {\n', parca: 0 },
      { ses: 'Her adımda bu değeri LED\'e yazıyor ve yirmi milisaniye bekliyoruz. Böylece parlaklık yumuşakça artıyor.', yaz: '    ledcWrite(D0, p);\n    delay(20);\n  }\n' },
      { ses: 'Şimdi ters yönde, iki yüz elli beşten sıfıra doğru azaltıyoruz.', yaz: '  for (int p = 255; p >= 0; p -= 5) {\n' },
      { ses: 'Aynı şekilde değeri yazıp bekliyoruz ve döngüyü kapatıyoruz. LED nefes alıyormuş gibi parlayıp sönecek.', yaz: '    ledcWrite(D0, p);\n    delay(20);\n  }\n}\n', parca: 0 },
      { ses: 'Küçük bir bilgi: Pin saniyede binlerce kez açılıp kapanır. Açık kalma oranı büyüdükçe göz LED\'i daha parlak görür.' },
      { ses: 'Çalıştıralım ve nefes alan LED\'i izleyelim!', calistir: true, parca: 0 },
      { ses: 'Harika! Bekleme süresini ve adım büyüklüğünü değiştirerek nefes hızını kendin ayarlayabilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Hızlı nefes (5 ms)',
        metin: 'LED daha hızlı parlasın: bekleme süresini <b>5 ms</b> yap.',
        kod: KOD_92(), degistir: [{ ara: 'delay(20)' }],
        cozum: KOD_92(5), sure: 2500,
        ipucu: 'İki delay(20) satırını da delay(5) yap.',
        kontrol(sim) {
          const g = olaylar(sim, 'D0'); const tepe = g.find(o => o.deger >= 0.9);
          if (!tepe) return hata('LED tam parlaklığa ulaşmadı.');
          if (tepe.t - g[0].t > 600) return hata(`Tam parlaklığa ${tepe.t - g[0].t} ms'de ulaştı; 600 ms içinde ulaşmalı.`);
          return tamam('Hızlı nefes hazır!');
        },
      },
      {
        tip: 'duzenle', baslik: 'En fazla yarım parlaklık',
        metin: 'LED hiçbir zaman yarıdan fazla parlamasın: en yüksek değeri <b>128</b> yap.',
        kod: KOD_92(), degistir: [{ ara: '255' }],
        cozum: KOD_92(20, 128), sure: 3000,
        ipucu: '255 sayısı iki yerde geçiyor; ikisini de 128 yap.',
        kontrol(sim) {
          const v = olaylar(sim, 'D0').map(o => o.deger);
          if (!v.length) return hata('LED\'e değer yazılmadı.');
          const m = Math.max(...v);
          if (m > 0.55) return hata('LED yarıdan fazla parladı. En yüksek değer 128 olmalı.');
          if (m < 0.4) return hata('LED çok az parladı; tepe değer 128 olmalı.');
          return tamam('Parlaklık yarıyla sınırlandı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Basamaklı parlaklık (adım 15)',
        metin: 'Parlaklık basamakları belirgin olsun: adım büyüklüğünü <b>15</b> yap (p += 15 ve p -= 15).',
        kod: KOD_92(), degistir: [{ ara: 'p += 5' }, { ara: 'p -= 5' }],
        cozum: KOD_92(20, 255, 15), sure: 2500,
        ipucu: 'İki for döngüsünde de 5 yerine 15 yaz.',
        kontrol(sim) {
          const g = olaylar(sim, 'D0'); const i = g.findIndex(o => o.deger >= 0.9);
          if (i < 0) return hata('LED tam parlaklığa ulaşmadı.');
          if (i < 5 || i > 25) return hata(`Tam parlaklığa ${i + 1} adımda ulaştı; yaklaşık 18 adım beklenir (adım 15).`);
          return tamam('Daha büyük basamaklarla parlıyor!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'esp-dugme': {
    sesli: [
      { ses: 'Bu derste düğmeyi ESP32\'nin iç pull-up direnciyle kullanıyoruz. Dışarıdan direnç bağlamaya gerek kalmıyor.', parca: 0 },
      { ses: 'Düğmeyi D beş pinine INPUT PULLUP moduyla bağlıyoruz. Düğme boştayken pin yüksek okunur, basılınca toprağa bağlanıp düşük okunur.', yaz: 'void setup() {\n  pinMode(D5, INPUT_PULLUP);\n', parca: 0 },
      { ses: 'LED\'in bağlı olduğu D sıfır pinini çıkış yapıyoruz ve setup bölümünü kapatıyoruz.', yaz: '  pinMode(D0, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde düğmeyi okuyoruz. Ters mantık olduğunu unutma: düşük, düğmeye basıldı demektir.', yaz: 'void loop() {\n  if (digitalRead(D5) == LOW) {\n', parca: 0 },
      { ses: 'Düğmeye basılıyken LED\'i yakıyoruz.', yaz: '    digitalWrite(D0, HIGH);\n', parca: 1 },
      { ses: 'Basılı değilse yani pin yüksekse, LED\'i söndürüyoruz.', yaz: '  } else {\n    digitalWrite(D0, LOW);\n  }\n', parca: 1 },
      { ses: 'Döngünün sonuna çok kısa bir bekleme koyup programı tamamlıyoruz.', yaz: '  delay(10);\n}\n' },
      { ses: 'Çalıştıralım! Sahnedeki düğmeye basılı tutunca LED yanacak, bırakınca sönecek.', calistir: true, parca: 0 },
      { ses: 'Tebrikler! Pull-up sayesinde düğmeyi sadece iki kabloyla bağladın. Görevlerde toggle ve sayaç gibi ilginç şeyler deneyebilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Normalde yanık, basınca sönük',
        metin: 'Mantığı tersine çevir: LED <b>normalde yansın</b>, düğmeye <b>basılınca sönsün</b>. İpucu: koşuldaki LOW yerine HIGH yaz.',
        kod: KOD_93(), degistir: [{ ara: '== LOW' }],
        cozum: KOD_93('HIGH'), sure: 2200,
        girdi: dugmeSenaryo('D5', [[500, 600]]),
        ipucu: '== LOW ifadesini == HIGH yap.',
        kontrol(sim) {
          const l = olaylar(sim, 'D0');
          if (durumAt(l, 300) !== 1) return hata('Düğmeye basmıyorken LED yanık olmalı.');
          if (durumAt(l, 900) !== 0) return hata('Düğmeye basılıyken LED sönük olmalı.');
          return tamam('Ters mantık çalışıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yarım parlaklıkta yan',
        metin: 'Düğmeye basınca LED <b>yarım parlaklıkta</b> yansın: <code>digitalWrite(D0, HIGH)</code> yerine <code>analogWrite(D0, 128)</code> yaz.',
        kod: KOD_93(), degistir: [{ ara: 'digitalWrite(D0, HIGH)' }],
        cozum: KOD_93('LOW', 'analogWrite(D0, 128);'), sure: 2200,
        girdi: dugmeSenaryo('D5', [[500, 600]]),
        ipucu: 'Satırın tamamını analogWrite(D0, 128) olarak değiştir.',
        kontrol(sim) {
          const l = olaylar(sim, 'D0');
          const d = durumAt(l, 900);
          if (d < 0.4 || d > 0.6) return hata('Basılıyken LED yarım parlaklıkta (128/255) olmalı.');
          return tamam('LED yarım parlaklıkta yanıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Bırakınca yarım saniye daha yan',
        metin: 'Düğmeyi bırakınca LED hemen sönmesin, <b>500 ms daha yanık kalsın</b>. İpucu: söndürmeden önce <code>delay(500);</code> ekle.',
        kod: KOD_93(), degistir: [{ ara: 'digitalWrite(D0, LOW)' }],
        cozum: KOD_93('LOW', 'digitalWrite(D0, HIGH);', 'delay(500);\n    '), sure: 3000,
        girdi: dugmeSenaryo('D5', [[800, 600]]),
        ipucu: 'else içinde digitalWrite(D0, LOW) satırının üstüne delay(500); yaz.',
        kontrol(sim) {
          const l = olaylar(sim, 'D0');
          if (durumAt(l, 1100) !== 1) return hata('Düğmeye basılıyken LED yanmalı.');
          if (durumAt(l, 1600) !== 1) return hata('Düğme bırakılınca LED hemen söndü; 500 ms daha yanık kalmalı.');
          if (durumAt(l, 2400) !== 0) return hata('Birazdan LED sönmeli.');
          return tamam('LED, bırakıldıktan sonra yarım saniye daha yanıyor!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'dokunmatik-dugme': {
    sesli: [
      { ses: 'Şimdi hiç düğme olmadan, sadece parmağımızla LED\'i kontrol edeceğiz. ESP32\'nin dokunmatik pinleri bunu mümkün kılıyor.', parca: 0 },
      { ses: 'Önce bir eşik değeri tanımlıyoruz. Boşta okunan değer yetmiş civarında, dokununca on civarında. Kırk, ikisinin ortasında güzel bir sınır.', yaz: 'const int ESIK = 40;\nbool acik = false;\n\n' },
      { ses: 'Setup içinde seri haberleşmeyi başlatıyor ve LED pinini çıkış yapıyoruz.', yaz: 'void setup() {\n  Serial.begin(115200);\n  pinMode(D0, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Loop içinde dokunmatik pini, yani D dördü okuyoruz. touchRead fonksiyonu dokunma şiddetini sayı olarak verir.', yaz: 'void loop() {\n  int deger = touchRead(D4);\n', parca: 0 },
      { ses: 'Değer eşikten küçükse parmak değiyor demektir. O zaman LED\'in durumunu tersine çeviriyoruz.', yaz: '  if (deger < ESIK) {\n    acik = !acik;\n', parca: 0 },
      { ses: 'Yeni duruma göre LED\'i yakıp söndürüyor ve okunan değeri seri monitöre yazıyoruz.', yaz: '    digitalWrite(D0, acik ? HIGH : LOW);\n    Serial.println(deger);\n', parca: 1 },
      { ses: 'Parmak çekilene kadar bekliyoruz. Böylece tek dokunuş, tek değişiklik olarak sayılıyor.', yaz: '    while (touchRead(D4) < ESIK) {\n      delay(10);\n    }\n  }\n' },
      { ses: 'Döngüyü kısa bir beklemeyle kapatıyoruz.', yaz: '  delay(20);\n}\n' },
      { ses: 'Çalıştıralım! Sahnedeki pad\'e basılı tutarak dokunma taklidi yapabilirsin.', calistir: true, parca: 0 },
      { ses: 'Mükemmel! Artık hareketli parçası olmayan bir düğmen var. Görevlerde eşik değerini değiştirerek hassasiyeti ayarlamayı dene.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Daha sert eşik (20)',
        metin: 'Hafif temaslar (değer ~25) sayılmasın. Eşiği <b>20</b> yap.',
        kod: KOD_94(), degistir: [{ ara: 'ESIK = 40' }],
        cozum: KOD_94(20), sure: 3600,
        girdi: dokunmaSenaryo('D4', [[500, 400, 25], [1500, 400, 10]]),
        ipucu: 'ESIK = 40 ifadesindeki 40 sayısını 20 yap.',
        kontrol(sim) {
          const l = olaylar(sim, 'D0');
          if (durumAt(l, 1100) !== 0) return hata('Hafif temas (değer 25) LED\'i değiştirdi; eşik 20 olmalı.');
          if (durumAt(l, 2200) !== 1) return hata('Sağlam dokunuş LED\'i yakmadı.');
          return tamam('Eşik 20 oldu; hafif temaslar yok sayılıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Hassas eşik (60)',
        metin: 'Pad çok hassas olsun: değer <b>55</b> bile dokunuş sayılsın. Eşiği <b>60</b> yap.',
        kod: KOD_94(), degistir: [{ ara: 'ESIK = 40' }],
        cozum: KOD_94(60), sure: 3000,
        girdi: dokunmaSenaryo('D4', [[500, 400, 55]]),
        ipucu: 'ESIK = 40 ifadesindeki 40 sayısını 60 yap.',
        kontrol(sim) {
          if (durumAt(olaylar(sim, 'D0'), 1100) !== 1) return hata('Değer 55 iken LED yanmadı; eşik 60 olmalı.');
          return tamam('Pad artık çok hassas!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Seri monitöre mesaj',
        metin: 'Her dokunuşta seri monitöre sayı yerine <b>Dokunuldu</b> yazdır.',
        kod: KOD_94(), degistir: [{ ara: 'Serial.println(deger)' }],
        cozum: KOD_94(40, '"Dokunuldu"'), sure: 2500,
        girdi: dokunmaSenaryo('D4', [[500, 400]]),
        ipucu: 'println içindeki deger yerine "Dokunuldu" yaz (tırnaklı).',
        kontrol(sim) {
          if (!seriMetin(sim).includes('Dokunuldu')) return hata('Seri monitörde "Dokunuldu" görünmedi.');
          return tamam('Dokunuş mesajı yazıldı!');
        },
      },
    ],
  },
};
