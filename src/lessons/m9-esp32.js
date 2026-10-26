// Modül 9: ESP32'ye geçiş
// 9.1 esp32-tanisma     -> LED (D0) + Seri monitör
// 9.2 esp-led-devresi   -> LED (D0) PWM / ledc ile parlaklık
// 9.3 esp-dugme         -> Düğme (D5, INPUT_PULLUP) + LED (D0)
// 9.4 dokunmatik-dugme  -> Dokunmatik pad (D4, touchRead) + LED (D0)   [sadece C++]
import { duz, olaylar, tamam, hata, dugmeSenaryo } from './m6-projeler.js';

// t anında pinin çıkış değeri (olay kaydından)
export const durumAt = (liste, t) => { let d = 0; for (const o of liste) if (o.t <= t) d = o.deger; return d; };
export const seriMetin = sim => (sim.seriCikti ?? []).join('\n');
const araliklar = g => g.slice(1).map((o, i) => o.t - g[i].t);
const hepsi = (dizi, a, b) => dizi.every(x => x >= a && x <= b);
export const dokunmaSenaryo = (pin, dokunuslar) => async sim => {
  for (const [t, sure, deger = 10] of dokunuslar) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.dokunma[pin] = deger;
    await sim.bekle(sure);
    delete sim.dokunma[pin];
  }
};

// ──────────────────────────────────────────────────────────
// 9.1 ESP32 ile tanışma
// ──────────────────────────────────────────────────────────
const gorev91 = [
  {
    tip: 'kod', baslik: 'Hızlı yanıp sön (250 ms)',
    metin: `<span class="pin-etiket">D0</span> LED'i daha hızlı yanıp söndür: <b>250 ms yansın</b>, <b>250 ms sönsün</b>, sürekli tekrar etsin.`,
    ipucu: 'İki bekleme süresini de 250 yap.',
    sure: 2600,
    kontrol(sim) {
      const g = olaylar(sim, 'D0');
      if (g.length < 4) return hata('LED yeterince yanıp sönmedi.');
      if (!hepsi(araliklar(g), 200, 300)) return hata('Yanma ve sönme süreleri yaklaşık 250 ms olmalı.');
      return tamam('LED saniyede iki kez yanıp sönüyor!');
    },
  },
  {
    tip: 'soru', soru: 'ESP32 pinlerinin çalışma gerilimi (HIGH seviyesi) yaklaşık kaçtır?',
    secenekler: ['1,8 V', '3,3 V', '5 V', '12 V'], dogru: 1,
    aciklama: 'ESP32 pinleri 3,3 V ile çalışır. Üstüne 5 V verirsen kart zarar görebilir; bu yüzden sensör ve modüllerin gerilimine dikkat edilir.',
  },
  {
    tip: 'kod', baslik: 'Tam 3 kez yanıp sön',
    metin: `<span class="pin-etiket">D0</span> LED'i <b>tam 3 kez</b> yanıp sönsün: her seferinde <b>200 ms yansın</b>, <b>200 ms sönsün</b>. Sonra dursun ve <b>sönük</b> kalsın.`,
    ipucu: 'Kodu loop() yerine setup() içine yaz ya da bir for döngüsü kullan. loop() sonsuza kadar tekrarlar!',
    sure: 3200,
    kontrol(sim) {
      const g = olaylar(sim, 'D0');
      const yanma = g.filter(o => o.deger === 1).length;
      if (!yanma) return hata('LED hiç yanmadı.');
      if (yanma !== 3) return hata(`LED ${yanma} kez yandı, tam 3 kez yanmalı.`);
      if (sim.pin.D0.deger !== 0) return hata('Son yanıştan sonra LED sönük kalmalı.');
      if (!hepsi(araliklar(g), 150, 260)) return hata('Yanma ve sönme süreleri yaklaşık 200 ms olmalı.');
      return tamam('LED tam 3 kez yanıp söndü!');
    },
  },
  {
    tip: 'soru', soru: '<code>Serial.begin(115200);</code> satırındaki 115200 neyi belirler?',
    secenekler: ['Kartın saat hızını (Hz)', 'Seri haberleşme hızını (baud)', 'LED parlaklığını', 'Wi-Fi kanalını'], dogru: 1,
    aciklama: '115200, kart ile bilgisayar arasındaki haberleşme hızıdır (baud). Seri Monitör de aynı hıza ayarlı olmalı, yoksa yazılar bozuk görünür.',
  },
  {
    tip: 'kod', baslik: 'Seri monitörde say',
    metin: `Her <b>1 saniyede</b> bir seri monitöre bir sayı yazdır: <b>1, 2, 3, 4…</b> diye birer birer artsın.`,
    ipucu: 'Bir sayaç değişkeni oluştur, her turda 1 artır ve Serial.println ile yazdır; sonra delay(1000).',
    sure: 4600,
    kontrol(sim) {
      const s = (sim.seriCikti ?? []).map(x => String(x).trim()).filter(x => /^\d+$/.test(x)).map(Number);
      if (s.length < 4) return hata('Seri monitörde yeterince sayı yok (her saniye bir sayı gerekir).');
      if (s[0] !== 1 || !s.every((x, i) => i === 0 || x === s[i - 1] + 1)) return hata('Sayılar 1\'den başlayıp birer birer artmalı.');
      return tamam('Seri monitör saniyede bir sayıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Aşağıdakilerden hangisi ESP32\'yi klasik Arduino Uno\'dan ayıran en önemli özelliktir?',
    secenekler: ['Wi-Fi ve Bluetooth\'un kartın üzerinde hazır olması', 'LED\'lerin daha parlak yanması', 'Sadece blokla programlanabilmesi', 'Hiç bellek içermemesi'], dogru: 0,
    aciklama: 'ESP32 çift çekirdekli, hızlı ve kablosuz haberleşmesi dahili bir karttır. Wi-Fi ile web sayfası sunmak bu yüzden mümkün olur.',
  },
];

// ──────────────────────────────────────────────────────────
// 9.2 LED devresi ve PWM
// ──────────────────────────────────────────────────────────
const gorev92 = [
  {
    tip: 'kod', baslik: 'Yarım parlaklık',
    metin: `LED'i sürekli <b>yarım parlaklıkta</b> yak: PWM değeri 255'in yarısı, yani yaklaşık <b>128</b> olsun ve hiç değişmesin.`,
    ipucu: 'ledcWrite(D0, 128) ya da analogWrite(D0, 128) yaz; yanıp sönme döngüsü kurma.',
    sure: 1500,
    kontrol(sim) {
      const g = olaylar(sim, 'D0');
      if (!g.length) return hata('LED\'e hiç değer yazılmadı.');
      const son = g[g.length - 1].deger;
      if (son < 0.4 || son > 0.6) return hata(`LED yaklaşık yarı parlaklıkta (128/255) olmalı (şu an %${Math.round(son * 100)}).`);
      if (g.some(o => o.deger > 0.65)) return hata('LED hiçbir an yarıdan fazla parlak olmamalı.');
      return tamam('LED yarım parlaklıkta sabit yanıyor!');
    },
  },
  {
    tip: 'soru', soru: 'LED\'in önüne direnç koymamızın asıl nedeni nedir?',
    secenekler: ['LED\'in rengini değiştirmek', 'Akımı sınırlayıp LED\'i ve pini korumak', 'Kartı hızlandırmak', 'Wi-Fi sinyalini güçlendirmek'], dogru: 1,
    aciklama: 'LED akımı sınırlamaz; dirençsiz bağlanırsa fazla akım çekip yanabilir. Genelde 220 ile 330 ohm arası bir direnç kullanılır.',
  },
  {
    tip: 'kod', baslik: 'Hızlı nefes',
    metin: `LED'in tam parlaklığa ulaşma süresini kısalt: LED <b>600 ms içinde</b> en parlak hâline gelsin. Sonra yavaşça sönmesi yine sürebilir.`,
    ipucu: 'Parlaklık adımları arasındaki bekleme süresini (örneğin 20 ms) 5 ms yap.',
    sure: 2500,
    kontrol(sim) {
      const g = olaylar(sim, 'D0');
      if (g.length < 5) return hata('LED parlaklığı kademeli değişmedi.');
      const tepe = g.find(o => o.deger >= 0.9);
      if (!tepe) return hata('LED hiçbir zaman tam parlaklığa ulaşmadı.');
      if (tepe.t - g[0].t > 600) return hata(`Tam parlaklığa ${tepe.t - g[0].t} ms\'de ulaştı. 600 ms içinde ulaşmalı.`);
      return tamam('LED çok hızlı bir nefes alıyor!');
    },
  },
  {
    tip: 'soru', soru: '8 bit PWM çözünürlüğünde (ledcAttach(D0, 5000, 8)) LED\'e yazılabilecek en büyük değer nedir?',
    secenekler: ['8', '100', '255', '1023'], dogru: 2,
    aciklama: '8 bit demek 2^8 = 256 farklı değer demektir: 0 ile 255 arası. 255 tam parlaklık, 0 ise söndürmek anlamına gelir.',
  },
  {
    tip: 'kod', baslik: 'Üç kademe',
    metin: `LED'i sırayla üç kademeden geçir ve tekrarla: <b>kısık (~30)</b>, <b>orta (~120)</b>, <b>parlak (255)</b>. Her kademe <b>500 ms</b> sürsün.`,
    ipucu: 'loop() içinde üç kez ledcWrite (ya da analogWrite) çağır, aralarına delay(500) koy.',
    sure: 3200,
    kontrol(sim) {
      const g = olaylar(sim, 'D0');
      const vals = g.map(o => Math.round(o.deger * 255));
      const var_ = (a, b) => vals.some(v => v >= a && v <= b);
      if (!var_(15, 50) || !var_(100, 140) || !var_(240, 255)) return hata('Kısık (~30), orta (~120) ve parlak (255) kademelerinin üçü de görünmeli.');
      const s = g.slice(1).map((o, i) => o.t - g[i].t);
      if (!hepsi(s, 400, 600)) return hata('Her kademe yaklaşık 500 ms sürmeli.');
      return tamam('Üç kademeli parlaklık çalışıyor!');
    },
  },
  {
    tip: 'soru', soru: 'PWM ile LED\'in parlaklığı nasıl değişir?',
    secenekler: ['Pinin gerilimi 0 ile 3,3 V arasında yavaşça ayarlanır', 'Pin çok hızlı açılıp kapanır; açık kalma oranı parlaklığı belirler', 'LED\'in rengi değişir', 'Direnç değeri değişir'], dogru: 1,
    aciklama: 'PWM pini saniyede binlerce kez açıp kapatır. Açık kalma oranı (görev döngüsü) büyüdükçe göz ortalama parlaklığı daha yüksek algılar.',
  },
];

// ──────────────────────────────────────────────────────────
// 9.3 Düğme ve INPUT_PULLUP
// ──────────────────────────────────────────────────────────
const G93_BASMA = [[500, 600], [1800, 400]];
const gorev93 = [
  {
    tip: 'kod', baslik: 'Bas-bırak anahtarı (toggle)',
    metin: `Düğmeye <b>her basışta</b> LED'in durumu değişsin: bir basış yakar, bir sonraki söndürür. Düğmeyi basılı tutsan bile <b>tek</b> basış sayılsın.`,
    ipucu: 'Bir bool değişken tut (acik = !acik). Basışı yakaladıktan sonra düğme bırakılana kadar bekle (while).',
    sure: 4500,
    girdi: dugmeSenaryo('D5', [[500, 200], [1500, 800], [2800, 200]]),
    kontrol(sim) {
      const l = olaylar(sim, 'D0');
      if (durumAt(l, 400) !== 0) return hata('Düğmeye basmadan LED yanık olmamalı.');
      if (durumAt(l, 1100) !== 1) return hata('1. basıştan sonra LED yanmalı.');
      if (durumAt(l, 2200) !== 0) return hata('2. basıştan sonra LED sönmeli (düğmeyi uzun tutsan da tek basış sayılmalı).');
      if (durumAt(l, 3300) !== 1) return hata('3. basıştan sonra LED yeniden yanmalı.');
      return tamam('Toggle çalışıyor: her basış LED\'i tersine çeviriyor!');
    },
  },
  {
    tip: 'soru', soru: '<code>pinMode(D5, INPUT_PULLUP);</code> kullanıldığında düğmeye <b>basılmıyorken</b> digitalRead ne verir?',
    secenekler: ['LOW (0)', 'HIGH (1)', 'Belirsiz, rastgele', 'Hata verir'], dogru: 1,
    aciklama: 'İç pull-up direnci pini 3,3 V\'a doğru çeker, bu yüzden boşta HIGH okunur. Düğmeye basılınca pin GND\'ye bağlanır ve LOW okunur.',
  },
  {
    tip: 'kod', baslik: 'Normalde yanık, basınca sönük',
    metin: `Ters çalışan bir gösterge yap: LED <b>normalde yansın</b>, düğmeye <b>basılı olduğu sürece sönsün</b>, bırakınca tekrar yansın.`,
    ipucu: 'Düğme boşta HIGH okunur. LED\'i yakacak koşul, düğmenin HIGH olduğu durumdur.',
    sure: 3000,
    girdi: dugmeSenaryo('D5', [[1000, 700]]),
    kontrol(sim) {
      const l = olaylar(sim, 'D0');
      if (durumAt(l, 600) !== 1) return hata('Düğmeye basmıyorken LED yanık olmalı.');
      if (durumAt(l, 1400) !== 0) return hata('Düğmeye basılıyken LED sönük olmalı.');
      if (durumAt(l, 2300) !== 1) return hata('Düğmeyi bırakınca LED tekrar yanmalı.');
      return tamam('Ters mantıklı gösterge çalışıyor!');
    },
  },
  {
    tip: 'soru', soru: 'INPUT_PULLUP ile bağlanan bir düğmenin iki ucu nereye bağlanır?',
    secenekler: ['Biri pine, biri GND\'ye', 'Biri pine, biri 5 V\'a', 'İkisi de aynı pine', 'Biri pine, biri LED\'e'], dogru: 0,
    aciklama: 'Pull-up direnci kartın içinde olduğu için dışarıdan direnç gerekmez; düğmenin bir ucu pine, diğer ucu GND\'ye bağlanır.',
  },
  {
    tip: 'kod', baslik: 'Basış sayacı',
    metin: `Düğmeye her basışta seri monitöre <b>basış sayısını</b> yazdır: <b>1, 2, 3…</b> (her basış için yalnızca bir satır).`,
    ipucu: 'Basışı yakalayınca sayacı artır, yazdır ve düğme bırakılana kadar bekle.',
    sure: 3600,
    girdi: dugmeSenaryo('D5', [[400, 500], [1400, 500], [2400, 500]]),
    kontrol(sim) {
      const s = (sim.seriCikti ?? []).map(x => String(x).trim()).filter(x => /^\d+$/.test(x)).map(Number);
      if (!s.length) return hata('Seri monitöre sayı yazılmadı.');
      if (s.join(',') !== '1,2,3') return hata(`3 basış için 1, 2, 3 yazılmalıydı (şu an: ${s.join(', ')}).`);
      return tamam('Her basış doğru sayıldı!');
    },
  },
  {
    tip: 'soru', soru: 'Düğmeye bir kez basıp bırakınca sayaç birden fazla artıyorsa en olası sebep nedir?',
    secenekler: ['Kartın hafızası dolmuştur', 'Düğmenin basılı kaldığı sürece loop() birçok kez basış görür', 'Seri monitör bozuktur', 'Wi-Fi açıktır'], dogru: 1,
    aciklama: 'loop() saniyede binlerce kez döner. Düğme basılı kaldıkça her turda "basıldı" görülür; bu yüzden bırakılana kadar beklemek gerekir.',
  },
];

// ──────────────────────────────────────────────────────────
// 9.4 Dokunmatik düğme (touchRead)
// ──────────────────────────────────────────────────────────
const gorev94 = [
  {
    tip: 'kod', baslik: 'Daha sert eşik (25)',
    metin: `Hafif temaslar (değer yaklaşık <b>30</b>) LED'i değiştirmesin. Eşiği <b>25</b> yap: yalnızca sağlam bir dokunuş (değer ~10) LED'i değiştirsin.`,
    ipucu: 'Eşik değerini tutan sabiti (ESIK) 40 yerine 25 yap.',
    sure: 3600,
    girdi: async sim => { await dokunmaSenaryo('D4', [[500, 400, 30], [1500, 400, 10]])(sim); },
    kontrol(sim) {
      const l = olaylar(sim, 'D0');
      if (durumAt(l, 1100) !== 0) return hata('Hafif temas (değer 30) LED\'i yaktı; eşik 25 olmalı.');
      if (durumAt(l, 2200) !== 1) return hata('Sağlam dokunuş (değer 10) LED\'i yakmadı.');
      return tamam('Eşik 25 oldu: hafif temaslar artık yok sayılıyor!');
    },
  },
  {
    tip: 'soru', soru: 'ESP32\'de parmağını dokunmatik pine değdirince <code>touchRead()</code> değeri nasıl değişir?',
    secenekler: ['Küçülür (örneğin 70\'ten 10\'a)', 'Büyür', 'Hiç değişmez', 'Negatif olur'], dogru: 0,
    aciklama: 'Parmak pinin kapasitansını artırır. ESP32 bunu sayaç olarak ölçer; dokunma arttıkça okunan sayı küçülür. Bu yüzden koşul "değer < eşik" biçimindedir.',
  },
  {
    tip: 'kod', baslik: 'Dokunurken yan, bırakınca sön',
    metin: `Bu sefer toggle değil: LED <b>sadece parmağın pad'e değdiği sürece</b> yansın, parmak çekilince sönsün.`,
    ipucu: 'Döngüde touchRead(D4) < ESIK ise LED\'i yak, değilse söndür.',
    sure: 3000,
    girdi: dokunmaSenaryo('D4', [[700, 700]]),
    kontrol(sim) {
      const l = olaylar(sim, 'D0');
      if (durumAt(l, 400) !== 0) return hata('Dokunmuyorken LED sönük olmalı.');
      if (durumAt(l, 1100) !== 1) return hata('Dokunurken LED yanmalı.');
      if (durumAt(l, 2000) !== 0) return hata('Parmağı çekince LED sönmeli.');
      return tamam('LED yalnızca dokunurken yanıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Dokunmatik algılama için neden bir eşik değeri (ör. 40) kullanırız?',
    secenekler: ['Boşta (~70) ile dokunmuşken (~10) okunan değerin ortasında bir sınır çizmek için', 'Kartı yavaşlatmak için', 'Pin numarasını seçmek için', 'LED\'in rengini seçmek için'], dogru: 0,
    aciklama: 'Ölçülen değer ortama göre biraz oynar. İki durum arasında bir eşik seçersek küçük oynamalar yanlış dokunma sayılmaz.',
  },
  {
    tip: 'kod', baslik: 'Dokunma sayacı',
    metin: `Pad'e her dokunduğunda seri monitöre <b>kaçıncı dokunuş</b> olduğunu yazdır: <b>1, 2, 3…</b> (değeri değil, sayacı). LED toggle'ı olmasa da olur.`,
    ipucu: 'Bir int sayaç tut; dokunuşu yakalayınca artır, Serial.println(sayac) yaz ve parmak çekilene kadar bekle.',
    sure: 3600,
    girdi: dokunmaSenaryo('D4', [[500, 500], [1500, 500], [2500, 500]]),
    kontrol(sim) {
      const s = (sim.seriCikti ?? []).map(x => String(x).trim()).filter(x => /^\d+$/.test(x)).map(Number);
      if (!s.length) return hata('Seri monitöre sayı yazılmadı.');
      if (s.join(',') !== '1,2,3') return hata(`3 dokunuş için 1, 2, 3 yazılmalıydı (şu an: ${s.join(', ')}).`);
      return tamam('Dokunuşlar doğru sayılıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Dokunmatik düğmenin mekanik düğmeye göre bir avantajı nedir?',
    secenekler: ['Aşınan hareketli parçası yoktur', 'Hiç elektrik kullanmaz', 'Kodla okunamaz', 'Sadece blokla çalışır'], dogru: 0,
    aciklama: 'Kapasitif dokunmatik pad\'in hareketli parçası olmadığı için aşınmaz; üstüne cam veya plastik kaplanarak şık paneller yapılabilir.',
  },
];

// ──────────────────────────────────────────────────────────
// Modül 9 Ders Listesi
// ──────────────────────────────────────────────────────────
export default [
  {
    id: 'esp32-tanisma',
    ad: '9.1 · ESP32 ile tanışma',
    sure: 3600,
    gorevler: gorev91,
    html: `<h2>ESP32 ile tanışma</h2>
      <p>Yeni parkura hoş geldin! Bu modülde kartımızın <b>ESP32</b> beynini tanıyacak, Wi-Fi ve web sayfası yapacak kadar ilerleyeceğiz.</p>
      <ol>
        <li>Sahnede gördüğün kırmızı kart <b>Deneyap Kart 1A v2</b>: içinde bir <b>ESP32-S3</b> çipi var, yani ESP32 ailesinden. Pinleri <b>3,3 V</b> ile çalışır; D0 pinine bir LED bağlı.</li>
        <li>LED'i <b>500 ms</b> yakıp <b>500 ms</b> söndür, sürekli tekrarla.</li>
        <li>Kartın "ben buradayım" demesi için <b>Seri Monitör</b>'e bir selam yaz: <i>Merhaba ESP32!</i></li>
      </ol>`,
    adimlar: [
      {
        baslik: 'ESP32 ile tanış',
        html: `<p>ESP32, hızlı ve <b>Wi-Fi + Bluetooth</b> yerleşik bir çip ailesidir. Sahnedeki Deneyap Kart 1A v2 bu ailenin <b>ESP32-S3</b> çipini taşır; yani burada öğrendiklerin diğer ESP32 kartlarında da geçerlidir. Pinleri <b>3,3 V</b> ile çalışır. Sahnedeki LED <span class="pin-etiket">D0</span> pinine bağlı.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli döngü',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al. Kart açık kaldığı sürece içindekini tekrar eder.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'LED\'i yak ve bekle',
        html: `<p><span class="chip pin">D0 pinini YÜKSEK (1) yap</span> bloğunu döngünün içine koy, altına <span class="chip akis">500 ms bekle</span> ekle.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' }, icinde: 'dy_surekli' }, { blok: 'dy_bekle', icinde: 'dy_surekli' }],
        ipucu: 'LED D0 pininde. Bekleme bloğu LED bloğunun altında olmalı.',
      },
      {
        baslik: 'LED\'i söndür ve bekle',
        html: `<p>Şimdi <span class="chip pin">D0 pinini DÜŞÜK (0) yap</span> ve ardından bir <span class="chip akis">500 ms bekle</span> daha ekle.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '0' }, icinde: 'dy_surekli' }, { blok: 'dy_bekle', adet: 2, icinde: 'dy_surekli' }],
        ipucu: 'Yak, bekle, söndür, bekle: dört blok.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. LED saniyede bir yanıp sönecek. <b>Kod</b> görünümünde bloklarının ESP32 C++ karşılığını da incele.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'LED 500 ms yanıp 500 ms sönmeli.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'kirmizi' }] },
    kontrol(sim) {
      const g = olaylar(sim, 'D0');
      if (!g.length) return hata('LED hiç yanmadı. D0 pinini YÜKSEK yaptın mı?');
      if (g.length < 4) return hata('LED yanıp sönmeli: yak, bekle, söndür, bekle. Sürekli tekrarla içine koydun mu?');
      if (g[0].deger !== 1) return hata('İlk önce LED yanmalı (D0 YÜKSEK).');
      if (!hepsi(araliklar(g), 350, 700)) return hata('Yanma ve sönme süreleri yaklaşık 500 ms olmalı.');
      return tamam('Harika! ESP32\'de ilk programın çalışıyor: LED saniyede bir yanıp sönüyor.');
    },
  },

  {
    id: 'esp-led-devresi',
    ad: '9.2 · LED devresi ve PWM',
    sure: 4300,
    gorevler: gorev92,
    html: `<h2>LED devresi ve PWM</h2>
      <p>LED'i yalnızca yakıp söndürmek yetmez; <b>parlaklığını</b> da ayarlayabiliriz. ESP32'de bunu <b>PWM</b> (ledc) yapar.</p>
      <ol>
        <li>LED, <b>220 ohm</b> direnç üzerinden <b>D0</b> pinine bağlıdır (direnç LED'i korur).</li>
        <li>PWM değeri <b>0 (sönük)</b> ile <b>255 (tam parlak)</b> arasındadır.</li>
        <li>Parlaklığı yavaşça artırıp azalt: LED <b>nefes alsın</b>.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Devreyi tanı',
        html: `<p>Sahnedeki LED, akımı sınırlayan bir direnç üzerinden <span class="pin-etiket">D0</span> pinine bağlı. Uzun bacak (+) pine, kısa bacak GND tarafına gider.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli döngü',
        html: `<p><span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına al.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinde.',
      },
      {
        baslik: 'Parlaklığı ayarla',
        html: `<p><span class="chip pin">D0 pinine PWM (0-255)</span> bloğunu döngüye koy. Ardına <span class="chip akis">bekle</span> bloğu ekle. Birkaç farklı değerle (ör. 0, 85, 170, 255) tekrarla.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_pwm' },
        bitti: [{ blok: 'dy_pwm', alan: { PIN: 'D0' }, adet: 4, icinde: 'dy_surekli' }, { blok: 'dy_bekle', adet: 4, icinde: 'dy_surekli' }],
        ipucu: 'Parlaklığı 0\'dan 255\'e çıkarıp sonra geri indir: 0, 85, 170, 255, 170, 85… Her adım arasında kısa bir bekleme (ör. 100 ms).',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. LED yavaşça parlayıp sönmeli. Kod görünümünde ledc/analogWrite karşılığına bak.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'LED hem parlamalı hem sönmeli; ara parlaklıklar da görünmeli.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'sari' }] },
    kontrol(sim) {
      const g = olaylar(sim, 'D0');
      if (!g.length) return hata('LED\'e hiç değer yazılmadı.');
      const v = g.map(o => o.deger);
      const tepeIdx = v.findIndex(x => x >= 0.9);
      if (tepeIdx < 0) return hata('LED hiç tam parlaklığa (255) ulaşmadı.');
      if (!v.some(x => x > 0.1 && x < 0.8)) return hata('Ara parlaklıklar yok: LED yalnızca yanıp sönüyor. 0 ile 255 arasında değerler kullan.');
      if (!v.slice(tepeIdx).some(x => x < 0.5)) return hata('LED parladıktan sonra tekrar kısılmadı.');
      return tamam('Harika! LED nefes alıyor: parlaklık yavaşça artıp azalıyor.');
    },
  },

  {
    id: 'esp-dugme',
    ad: '9.3 · Düğme ve INPUT_PULLUP',
    sure: 3600,
    gorevler: gorev93,
    html: `<h2>Düğme ve INPUT_PULLUP</h2>
      <p>Düğmeler için dışarıya direnç eklemeye gerek yok: ESP32'nin <b>içindeki pull-up direncini</b> açabiliriz.</p>
      <ol>
        <li>Düğmenin bir ucu <b>D5</b> pinine, diğer ucu <b>GND</b>'ye bağlı.</li>
        <li><b>INPUT_PULLUP</b> ile pin boşta <b>HIGH</b>, düğmeye basılınca <b>LOW</b> okunur (ters mantık).</li>
        <li>Düğmeye basılınca <b>D0</b> LED'i yansın, bırakınca sönsün.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Devreyi tanı',
        html: `<p>Düğme (<span class="pin-etiket">D5</span>) ve LED (<span class="pin-etiket">D0</span>) hazır. Pull-up sayesinde düğme boşta <b>HIGH</b> okunur; basınca pin GND'ye bağlanıp <b>LOW</b> olur.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Döngü ve düğme koşulu',
        html: `<p><span class="chip akis">sürekli tekrarla</span> içine <span class="chip akis">eğer / değilse</span> bloğu koy. Koşulu <span class="chip pin">D5 düğmesine basılı mı?</span> olsun.</p>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_basili' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_dugme_basili', alan: { PIN: 'D5' } }],
        ipucu: 'Düğme kategorisindeki "basılı mı?" bloğunu D5 ile kullan.',
      },
      {
        baslik: 'LED\'i yak / söndür',
        html: `<p>Eğer kolunda <span class="chip pin">D0 pinini YÜKSEK yap</span>, değilse kolunda <span class="chip pin">D0 pinini DÜŞÜK yap</span> olsun.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' }, icinde: 'controls_if' }, { blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '0' }, icinde: 'controls_if' }],
        ipucu: 'Basılıysa yak, değilse söndür.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve sahnedeki düğmeye basılı tut. Kod görünümünde <code>INPUT_PULLUP</code> ile yazılmış hâlini de görebilirsin: orada <code>== LOW</code> koşulu "basıldı" demektir.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Düğmeye basınca LED yanmalı.',
      },
    ],
    sahne: { parcalar: [{ tur: 'dugme', pin: 'D5', renk: 'kirmizi' }, { tur: 'led', pin: 'D0', renk: 'yesil' }] },
    girdi: dugmeSenaryo('D5', G93_BASMA),
    kontrol(sim) {
      const l = olaylar(sim, 'D0');
      if (durumAt(l, 300) !== 0) return hata('Düğmeye basmıyorken LED sönük olmalı.');
      if (durumAt(l, 900) !== 1) return hata('Düğmeye basılıyken LED yanmalı.');
      if (durumAt(l, 1500) !== 0) return hata('Düğme bırakılınca LED sönmeli.');
      if (durumAt(l, 2000) !== 1) return hata('İkinci basışta da LED yanmalı.');
      return tamam('Harika! Düğme çalışıyor: basınca LED yanıyor, bırakınca sönüyor.');
    },
  },

  {
    id: 'dokunmatik-dugme',
    ad: '9.4 · Dokunmatik düğme',
    sure: 4300,
    sadeceKod: true,
    baslangicKod: `// Dokunmatik düğme: pad'e dokununca LED durumu değişsin
const int ESIK = 40;      // 70 (boşta) ile 10 (dokunmuş) arasında bir sınır

void setup() {
  pinMode(D0, OUTPUT);
}

void loop() {
  // buraya yaz: touchRead(D4) ile pad'i oku
}
`,
    gorevler: gorev94,
    html: `<h2>Dokunmatik düğme</h2>
      <p>ESP32'nin bazı pinleri <b>dokunmayı hissedebilir</b>: bunlara kapasitif dokunmatik pin denir. Hiç düğme olmadan, parmağınla LED'i kontrol edeceğiz.</p>
      <ol>
        <li>Dokunmatik pad <b>D4</b> pinine, LED <b>D0</b> pinine bağlı.</li>
        <li><code>touchRead(D4)</code> boşta yaklaşık <b>70</b>, parmak değince yaklaşık <b>10</b> verir.</li>
        <li>Değer <b>40</b>'ın altına inerse dokunulmuş say: her dokunuşta LED durumu <b>tersine dönsün</b>.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Devreyi tanı',
        html: `<p>Sahnedeki mavi kartın bakır pad'i <span class="pin-etiket">D4</span> pinine bağlı. Pad'e basılı tutarak dokunma taklidi yapabilirsin. Boşta okunan değer ~70, dokununca ~10.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Değeri oku',
        html: `<p><code>loop()</code> içinde <code>int deger = touchRead(D4);</code> yaz. İstersen <code>Serial.println(deger)</code> ile değeri izle.</p>`,
        ipucu: 'Serial kullanacaksan setup() içine Serial.begin(115200); eklemeyi unutma.',
      },
      {
        baslik: 'Eşikle karşılaştır',
        html: `<p><code>if (deger &lt; ESIK)</code> koşulu dokunuşu yakalar. İçinde bir <code>bool acik</code> değişkenini tersine çevir (<code>acik = !acik;</code>) ve LED'e yaz.</p>`,
        ipucu: 'digitalWrite(D0, acik ? HIGH : LOW); biçimini kullanabilirsin.',
      },
      {
        baslik: 'Parmak çekilene kadar bekle',
        html: `<p>Tek dokunuşta birçok kez saymamak için <code>while (touchRead(D4) &lt; ESIK) { delay(10); }</code> ile parmağın çekilmesini bekle.</p>`,
        ipucu: 'Bu bekleme, 9.3\'teki düğme bırakma bekleyişiyle aynı mantıktır.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas, sahnedeki pad'e dokun. Her dokunuşta LED yanıp sönmeli.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Dokunuş başına LED durumu bir kez değişmeli.',
      },
    ],
    sahne: { parcalar: [{ tur: 'dokunmatik', pin: 'D4', konum: [50, 0, 0] }, { tur: 'led', pin: 'D0', renk: 'mavi', konum: [100, 0, 10] }] },
    girdi: dokunmaSenaryo('D4', [[500, 400], [1400, 600], [2600, 400]]),
    kontrol(sim) {
      const l = olaylar(sim, 'D0');
      if (durumAt(l, 400) !== 0) return hata('Dokunmadan LED yanık olmamalı.');
      if (durumAt(l, 1100) !== 1) return hata('İlk dokunuştan sonra LED yanmalı. touchRead(D4) < ESIK koşulunu kullandın mı?');
      if (durumAt(l, 2200) !== 0) return hata('İkinci dokunuşta LED sönmeli (uzun dokunuş tek sayılmalı).');
      if (durumAt(l, 3300) !== 1) return hata('Üçüncü dokunuşta LED yeniden yanmalı.');
      return tamam('Harika! Parmağınla LED\'i açıp kapatıyorsun, hiç düğme yok!');
    },
  },
];
