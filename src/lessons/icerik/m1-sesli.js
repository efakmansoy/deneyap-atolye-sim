// Modül 1 ek içerik: sesli anlatım (kod satır satır yazılır) + "kodu değiştir" görevleri.
// SESLİ PARÇA ŞEMASI: { ses, yaz?, temizle?, parca?, calistir?, bekle? }  (src/anlatici.js)
//   - Parçaların `yaz` metinleri ART ARDA eklenir ve sonunda GEÇERLİ, dersin kontrolünü geçen bir C++ programı oluşturur.
//   - `ses`: doğal, kısa cümleler (TTS okuyacak): kısaltma/rakam yerine okunuşu yaz ("üç virgül üç volt"), kod sembollerini okutma.
// DÜZENLE GÖREVİ ŞEMASI: { tip:'duzenle', baslik, metin, kod, degistir:[{ara}], ipucu, sure?, girdi?, kontrol(sim) }
//   - kod: editöre yüklenen BAŞLANGIÇ programı (çalışır durumda); `degistir[].ara` metinleri editörde turuncu işaretlenir.
//   - kontrol: davranışı doğrular (sim.olaylar/pin/cihaz/seriCikti/t); başlangıç kodu kontrolü GEÇMEMELİ.
const gecis = (sim, pin) => sim.olaylar.filter(o => o.pin === pin);
const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });

export default {
  'led-yak': {
    sesli: [
      { ses: 'Merhaba! Bugün kartın D0 pinine bağlı kırmızı LED\'i yakacağız. Her Arduino programının iki bölümü vardır: setup ve loop. Önce setup bölümünü yazalım.', yaz: 'void setup() {\n', parca: 0 },
      { ses: 'Setup, kart çalışmaya başlayınca yalnızca bir kez çalışır. Burada D0 pinine bir çıkış olduğunu söylüyoruz, çünkü LED\'e enerjiyi kart verecek.', yaz: '  pinMode(D0, OUTPUT);\n}\n\n', parca: 0 },
      { ses: 'Şimdi loop bölümü. Kart açık kaldığı sürece buradaki komutlar tekrar tekrar çalışır.', yaz: 'void loop() {\n' },
      { ses: 'digitalWrite komutu bir pine HIGH ya da LOW yazar. HIGH, üç virgül üç volt demektir. Bu gerilim LED\'in yanmasını sağlar.', yaz: '  digitalWrite(D0, HIGH);\n}\n', parca: 0 },
      { ses: 'Şimdi programı çalıştıralım. Bak, LED yandı!', calistir: true, parca: 0 },
      { ses: 'Harika! Görevler sekmesinde, kodun belli yerlerini değiştirerek farklı şeyler deneyeceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'LED\'i söndür',
        metin: 'Bu program LED\'i yakıyor. Turuncu işaretli <b>HIGH</b> yerine doğru kelimeyi yaz ki LED <b>sönük</b> kalsın.',
        kod: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(D0, HIGH);\n}\n',
        degistir: [{ ara: 'HIGH' }], sure: 1200,
        ipucu: 'HIGH üç virgül üç volt demekti. Sıfır volt için hangi kelime kullanılır?',
        kontrol: sim => sim.pin.D0.mod === 'cikti' && sim.pin.D0.deger === 0 ? tamam('LED sönük kaldı, tam istediğimiz gibi!') : hata('LED hâlâ yanıyor. HIGH yerine LOW yazmayı dene.'),
      },
      {
        tip: 'duzenle', baslik: 'Yarım parlaklık',
        metin: 'LED şu an tam parlaklıkta. <code>digitalWrite(D0, HIGH)</code> satırını, 0-255 arasında bir değerle çalışan <code>analogWrite</code> ile değiştirip LED\'i <b>yarım parlaklığa</b> (128 civarı) getir.',
        kod: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(D0, HIGH);\n}\n',
        degistir: [{ ara: 'digitalWrite(D0, HIGH)' }], sure: 1200,
        ipucu: 'analogWrite(pin, değer) biçiminde yazılır. 255 tam parlaklık, 0 sönük demektir.',
        kontrol: sim => { const p = sim.pin.D0.pwm; return p > .35 && p < .65 ? tamam('Yarım parlaklık tam isabet!') : hata(`LED parlaklığı %${Math.round(p * 100)}. Yaklaşık %50 olmalı (128).`); },
      },
    ],
  },

  'led-yanip-son': {
    sesli: [
      { ses: 'Bu derste LED\'i yanıp söndüreceğiz, tıpkı bir uyarı lambası gibi. Önce D0 pinini çıkış yapan setup bölümünü yazalım.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\n', parca: 0 },
      { ses: 'Loop bölümü sürekli tekrar ettiği için, LED\'i yakıp söndürme işini buraya koyacağız. Önce LED\'i yakıyoruz.', yaz: 'void loop() {\n  digitalWrite(D0, HIGH);\n', parca: 0 },
      { ses: 'Eğer hemen söndürseydik, LED o kadar hızlı yanıp sönerdi ki hiçbir şey göremezdik. Bu yüzden delay komutuyla bekliyoruz. Delay milisaniye ile çalışır; beş yüz milisaniye yarım saniyedir.', yaz: '  delay(500);\n' },
      { ses: 'Şimdi LED\'i söndürüyoruz. Sıfır volt için LOW yazıyoruz.', yaz: '  digitalWrite(D0, LOW);\n', parca: 0 },
      { ses: 'Sönük kalma süresi için bir kez daha bekliyoruz. Loop bitince baştan başlayacak, yani LED sonsuza kadar yanıp sönecek.', yaz: '  delay(500);\n}\n' },
      { ses: 'Haydi çalıştıralım ve yanıp sönmeyi izleyelim!', calistir: true, parca: 0 },
      { ses: 'Güzel! Şimdi Görevler sekmesinde bekleme sürelerini değiştirerek farklı ritimler yapacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Hızlı yanıp sönme',
        metin: 'LED şu an yarım saniyede bir yanıp sönüyor. İşaretli iki bekleme süresini de değiştirip LED\'i <b>çok daha hızlı</b> (her biri 50 ile 150 milisaniye arası) yanıp söndür.',
        kod: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(D0, HIGH);\n  delay(500);\n  digitalWrite(D0, LOW);\n  delay(500);\n}\n',
        degistir: [{ ara: '500' }], sure: 3000,
        ipucu: 'İki yerde de 500 yazıyor. 100 gibi küçük bir sayı yaz.',
        kontrol(sim) {
          const g = gecis(sim, 'D0'); if (g.length < 8) return hata('LED yeterince hızlı yanıp sönmüyor. Bekleme sürelerini küçült.');
          const ara = g.slice(1).map((o, i) => o.t - g[i].t);
          return ara.every(a => a >= 40 && a <= 160) ? tamam('Çok hızlı yanıp sönüyor, harika!') : hata(`Bekleme süreleri 50-150 ms arasında olmalı (şu an ~${Math.round(ara[1] ?? ara[0])} ms).`);
        },
      },
      {
        tip: 'duzenle', baslik: 'Kalp atışı ritmi',
        metin: 'LED kısa süre yansın, uzun süre sönük kalsın: <b>yanık 150 ms</b>, <b>sönük 850 ms</b> (yaklaşık). İşaretli iki bekleme süresini bunlara göre değiştir.',
        kod: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(D0, HIGH);\n  delay(500);\n  digitalWrite(D0, LOW);\n  delay(500);\n}\n',
        degistir: [{ ara: 'delay(500)' }], sure: 4000,
        ipucu: 'Birinci delay LED yanıkken, ikinci delay LED sönükken bekler.',
        kontrol(sim) {
          const g = gecis(sim, 'D0'); if (g.length < 4) return hata('LED yeterince değişmedi.');
          const yanik = g.filter(o => o.deger === 1).map(o => g[g.indexOf(o) + 1]?.t - o.t).filter(Number.isFinite);
          const sonuk = g.filter(o => o.deger === 0).map(o => g[g.indexOf(o) + 1]?.t - o.t).filter(Number.isFinite);
          if (!yanik.length || !sonuk.length) return hata('Hem yanma hem sönme süresi ölçülemedi.');
          const y = yanik[0], s = sonuk[0];
          return y >= 100 && y <= 220 && s >= 700 && s <= 1000 ? tamam('Kalp atışı gibi bir ritim yakaladın!') : hata(`Yanık ${Math.round(y)} ms, sönük ${Math.round(s)} ms. İstenen: yaklaşık 150 ve 850.`);
        },
      },
    ],
  },
};
