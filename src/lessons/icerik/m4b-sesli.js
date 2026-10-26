// Modül 4 ek dersler (4.5, 4.6) için sesli anlatım + "kodu değiştir" görevleri.
// Şema için m1-sesli.js dosyasına bak. `yaz` metinleri art arda eklenince dersin kontrolünü geçen tam bir C++ programı oluşur.
import { olaylar, sesler, acilar, aciSon, pencereler, pencereFrekans, asamaFrekanslari, asamaAcilari, analogSenaryo, frekansMap, hedefAci, tamam, hata, yakin } from '../m4b-ek.js';

const K = (...satirlar) => satirlar.join('\n') + '\n';

// ── 4.5 Işıkla çalan çalgı ──
const ISIK = (frekansSatiri = '  int frekans = map(isik, 0, 4095, 200, 2000);', ton = '  tone(BUZZER, frekans);', bekle = '  delay(20);') => K(
  '#define LDR A0', '#define BUZZER D8', '',
  'void setup() {', '  pinMode(BUZZER, OUTPUT);', '}', '',
  'void loop() {', '  int isik = analogRead(LDR);', frekansSatiri, ton, bekle, '}');

const D45_1 = [[0, 0], [1200, 4095], [2400, 2048]];
const D45_2 = [[0, 500], [1100, 3500], [2300, 500]];
const D45_3 = [[0, 500], [1200, 1500], [2400, 2500], [3600, 4000]];

// ── 4.6 Topuzla servo ──
const SERVO = (haritaSatiri = '  int aci = map(deger, 0, 4095, 0, 180);', yaz = '  servo.write(aci);') => K(
  '#include <ESP32Servo.h>', '', '#define POT A0', '', 'Servo servo;', '',
  'void setup() {', '  servo.attach(D5);', '}', '',
  'void loop() {', '  int deger = analogRead(POT);', haritaSatiri, yaz, '  delay(20);', '}');

const D46_1 = [[0, 0], [1200, 2048], [2400, 4095]];
const D46_2 = [[0, 0], [1200, 2048], [2400, 4095], [3600, 1024]];
const D46_3 = [[0, 500], [1200, 2048], [2400, 4095]];

export default {
  'isik-calgisi': {
    sesli: [
      { ses: 'Bugün ışıkla çalan bir çalgı yapıyoruz. Theremin adlı çalgı havada elini oynatarak çalınır. Bizimki ona benziyor: sensörün önünde elinle gölge yapıp sesin perdesini değiştireceğiz. Sensör A sıfır pininde, buzzer D sekiz pininde.', yaz: '#define LDR A0\n#define BUZZER D8\n\n', parca: 0 },
      { ses: 'Işık sensörü, yani LDR, ışık arttıkça daha büyük bir sayı verir. Kartın analog okuması on iki bitliktir. Bu yüzden sayı sıfırla dört bin doksan beş arasında değişir. Karanlıkta küçük, güneşte büyük olur.', parca: 0 },
      { ses: 'Setup bölümünde buzzer pinini çıkış yapıyoruz. Analog pinler okumaya zaten hazır olduğu için LDR için ayrıca bir ayar gerekmez.', yaz: 'void setup() {\n  pinMode(BUZZER, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Loop bölümünde önce ışığı okuyoruz. AnalogRead komutu sensörden gelen sayıyı isik adlı kutuya koyar.', yaz: 'void loop() {\n  int isik = analogRead(LDR);\n', parca: 0 },
      { ses: 'Küçük bir sorun var. Sayı sıfırdan dört bine kadar gidiyor, ama kulağımız iki yüz ile iki bin hertz arasını rahat ayırt eder. Map komutu bir sayıyı bir aralıktan başka bir aralığa orantılı çevirir. Karanlık iki yüz hertz, tam ışık iki bin hertz olsun.', yaz: '  int frekans = map(isik, 0, 4095, 200, 2000);\n' },
      { ses: 'Şimdi tone komutuyla bu frekansı buzzer\'a çaldırıyoruz. Işık değişince frekans da değişir, ses incelir ya da kalınlaşır.', yaz: '  tone(BUZZER, frekans);\n', parca: 1 },
      { ses: 'Döngünün sonunda yirmi milisaniye bekliyoruz. Böylece ses ışığa neredeyse anında yetişir, ama kart da gereksiz yere yorulmaz.', yaz: '  delay(20);\n}\n' },
      { ses: 'Çalıştıralım! Işık önce az, sonra giderek artacak, en sonda yine kararacak. Sesin ışığı izlediğini dinle.', calistir: true, parca: 0 },
      { ses: 'Işıkla çalan çalgın hazır! Görevler sekmesinde frekans aralığını, tepki hızını ve ses sınırını kendin ayarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Frekans aralığını daralt',
        metin: 'Çalgı şu an <b>200 Hz</b> ile <b>2000 Hz</b> arasında çalıyor. Aralığı değiştir: karanlıkta (0) <b>500 Hz</b>, tam ışıkta (4095) <b>1500 Hz</b> çalsın. Yalnızca map içindeki iki sayıyı değiştirmen yeter.',
        kod: ISIK(), degistir: [{ ara: '200, 2000' }], sure: 4000,
        girdi: analogSenaryo('A0', D45_1),
        cozum: ISIK('  int frekans = map(isik, 0, 4095, 500, 1500);'),
        ipucu: 'map\'in son iki sayısı çıktı aralığıdır: önce en düşük frekans, sonra en yüksek frekans. 500 ve 1500 yaz.',
        kontrol(sim) {
          if (olaylar(sim, 'A0', 'analog').length < D45_1.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
          const f = asamaFrekanslari(sim);
          const bek = [500, 1500, 1000];
          for (let i = 0; i < 3; i++) if (!yakin(f[i], bek[i], 20)) return hata(`Işık ${D45_1[i][1]} iken yaklaşık ${bek[i]} Hz çalmalı (şu an ${f[i] || 'sessiz'}).`);
          return tamam('Çalgı artık 500-1500 Hz aralığında çalıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Hızlı tepki',
        metin: 'Bu çalgı ışığa <b>geç</b> tepki veriyor: ışık değişince ses ancak çeyrek saniye sonra değişiyor. Tepkiyi hızlandır: ışık değiştikten sonra ses <b>70 ms içinde</b> değişsin. Yalnızca bekleme süresini değiştirmen gerekecek.',
        kod: ISIK(undefined, undefined, '  delay(200);'), degistir: [{ ara: 'delay(200)' }], sure: 3600,
        girdi: analogSenaryo('A0', D45_2),
        cozum: ISIK(),
        ipucu: 'Döngü sonundaki bekleme, kartın ışığa ne kadar sık baktığını belirler. 200 yerine çok daha küçük bir sayı yaz, örneğin 20.',
        kontrol(sim) {
          const a = olaylar(sim, 'A0', 'analog'), o = sesler(sim);
          if (a.length < D45_2.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
          for (let i = 1; i < a.length; i++) {
            const bek = frekansMap(a[i].deger, 200, 2000);
            const e = o.find(x => x.t >= a[i].t && Math.abs(x.deger - bek) <= bek * 0.08);
            if (!e) return hata(`Işık ${a[i].deger} olunca ses ${bek} Hz civarına gelmedi. Haritayı bozma, yalnızca beklemeyi değiştir.`);
            if (e.t - a[i].t > 70) return hata(`Işık değişince ses ${Math.round(e.t - a[i].t)} ms sonra değişti. 70 ms içinde olmalı; beklemeyi küçült.`);
          }
          return tamam('Çalgı ışığa anında tepki veriyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ses tavanı koy',
        metin: 'Güneşli bir günde çalgı çok tiz ötüyor ve kulakları rahatsız ediyor. <b>tone</b> komutunu değiştir: frekans hiçbir zaman <b>1200 Hz</b>\'i geçmesin, ama aşağıda eskisi gibi ışığı izlesin. (<code>constrain(x, en_az, en_çok)</code> sayıyı sınırlar.)',
        kod: ISIK(), degistir: [{ ara: 'tone(BUZZER, frekans)' }], sure: 4900,
        girdi: analogSenaryo('A0', D45_3),
        cozum: ISIK(undefined, '  tone(BUZZER, constrain(frekans, 200, 1200));'),
        ipucu: 'tone\'a frekans yerine constrain(frekans, 200, 1200) ver. Böylece sonuç hiçbir zaman 1200\'ü geçmez.',
        kontrol(sim) {
          if (olaylar(sim, 'A0', 'analog').length < D45_3.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
          const f = asamaFrekanslari(sim);
          if (f.some(v => v <= 0)) return hata('Her ışık seviyesinde ses çıkmalı.');
          const fazla = f.find(v => v > 1205);
          if (fazla) return hata(`Frekans ${fazla} Hz çıktı. 1200 Hz\'i geçmemeli.`);
          if (f[1] < f[0] + 100) return hata(`Düşük ışıkta çalgı ışığı izlemeli (${f[0]} → ${f[1]} Hz). Yalnızca üst sınırı koy.`);
          if (f[3] < 1150) return hata(`Çok ışıkta ses 1200 Hz\'e dayanmalı (şu an ${f[3]} Hz).`);
          return tamam('Ses tavanı koydun: hiçbir zaman 1200 Hz\'i geçmiyor!');
        },
      },
    ],
  },

  'pot-servo': {
    sesli: [
      { ses: 'Bugün potansiyometre topuzunu çevirdikçe servo kolunun aynı oranda dönmesini sağlayacağız. Pot A sıfır pininde, servo D beş pininde. Önce servo kütüphanesini ve pot pinini tanımlıyoruz.', yaz: '#include <ESP32Servo.h>\n\n#define POT A0\n\n', parca: 0 },
      { ses: 'Topuz tam sola çevrilince sıfır, tam sağa çevrilince dört bin doksan beş okunur. Servo ise sıfır ile yüz seksen derece arasında çalışır. İki ölçek farklı olduğu için aralarında bir çeviri gerekir.', parca: 0 },
      { ses: 'Önce servo nesnemizi oluşturuyoruz. Bu nesne, D beş pinindeki motoru temsil edecek.', yaz: 'Servo servo;\n\n' },
      { ses: 'Setup bölümünde servoyu D beş pinine bağlıyoruz. Bunu bir kez yapmak yeter.', yaz: 'void setup() {\n  servo.attach(D5);\n}\n\n', parca: 1 },
      { ses: 'Loop bölümünde potansiyometrenin değerini okuyoruz ve deger adlı kutuya koyuyoruz.', yaz: 'void loop() {\n  int deger = analogRead(POT);\n', parca: 0 },
      { ses: 'Map komutu dört bin doksan beşlik ölçeği yüz seksenlik ölçeğe orantılı çevirir. Topuz ortadayken değer yaklaşık iki bin kırk sekiz olur ve açı doksan derece çıkar.', yaz: '  int aci = map(deger, 0, 4095, 0, 180);\n' },
      { ses: 'Bulduğumuz açıyı servoya söylüyoruz. Write komutu kolu o açıya çevirir.', yaz: '  servo.write(aci);\n', parca: 1 },
      { ses: 'Servonun hedefe varabilmesi için yirmi milisaniye bekliyoruz. Sonra döngü başa dönüp topuza yeniden bakıyor.', yaz: '  delay(20);\n}\n' },
      { ses: 'Çalıştıralım! Topuz sırayla çevrilecek. Servo kolunun topuzu izlediğini göreceksin.', calistir: true, parca: 1 },
      { ses: 'Topuzla servon hazır! Görevler sekmesinde açı aralığını, yönü ve sınırı kendin ayarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Dar hareket aralığı',
        metin: 'Kol şu an topuzla birlikte <b>0°</b> ile <b>180°</b> arasında geziyor. Aralığı daralt: topuz tam solda iken kol <b>45°</b>, tam sağda iken <b>135°</b> olsun (ortada 90°).',
        kod: SERVO(), degistir: [{ ara: '0, 4095, 0, 180' }], sure: 4000,
        girdi: analogSenaryo('A0', D46_1),
        cozum: SERVO('  int aci = map(deger, 0, 4095, 45, 135);'),
        ipucu: 'map\'in son iki sayısı çıktı aralığıdır. 0 ve 180 yerine 45 ve 135 yaz; ilk iki sayıya (0, 4095) dokunma.',
        kontrol(sim) {
          if (olaylar(sim, 'A0', 'analog').length < D46_1.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
          if (!acilar(sim).length) return hata('Servo hiç hareket etmedi.');
          const ac = asamaAcilari(sim);
          for (let i = 0; i < 3; i++) {
            const bek = hedefAci(D46_1[i][1], 45, 135);
            if (ac[i] === null || !yakin(ac[i], bek, 3)) return hata(`Pot ${D46_1[i][1]} iken kol yaklaşık ${Math.round(bek)}° olmalı (şu an ${ac[i] === null ? 'hareketsiz' : Math.round(ac[i]) + '°'}).`);
          }
          return tamam('Kol artık 45°-135° arasında geziyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ters yön',
        metin: 'Topuz sağa döndükçe kol da sağa gidiyor. Yönü <b>tersine çevir</b>: topuz tam solda iken kol <b>180°</b>, tam sağda iken <b>0°</b> olsun.',
        kod: SERVO(), degistir: [{ ara: '0, 4095, 0, 180' }], sure: 4900,
        girdi: analogSenaryo('A0', D46_2),
        cozum: SERVO('  int aci = map(deger, 0, 4095, 180, 0);'),
        ipucu: 'map\'in çıktı aralığını ters yaz: önce 180, sonra 0.',
        kontrol(sim) {
          if (olaylar(sim, 'A0', 'analog').length < D46_2.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
          if (!acilar(sim).length) return hata('Servo hiç hareket etmedi.');
          const ac = asamaAcilari(sim);
          for (let i = 0; i < 4; i++) {
            const bek = hedefAci(D46_2[i][1], 180, 0);
            if (ac[i] === null || !yakin(ac[i], bek, 5)) return hata(`Pot ${D46_2[i][1]} iken kol yaklaşık ${Math.round(bek)}° olmalı (şu an ${ac[i] === null ? 'hareketsiz' : Math.round(ac[i]) + '°'}).`);
          }
          return tamam('Yön tersine döndü: topuz sağa, kol sola!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Güvenli sınır',
        metin: 'Servo kolu bir engele çarpıyor: <b>120°</b>\'den fazla açılmamalı. Alçak değerlerde eskisi gibi topuzu izlesin, ama kol hiçbir zaman <b>120°</b>\'yi geçmesin. (<code>constrain(x, en_az, en_çok)</code> sayıyı sınırlar.)',
        kod: SERVO(), degistir: [{ ara: 'servo.write(aci)' }], sure: 3900,
        girdi: analogSenaryo('A0', D46_3),
        cozum: SERVO(undefined, '  servo.write(constrain(aci, 0, 120));'),
        ipucu: 'servo.write\'a aci yerine constrain(aci, 0, 120) ver. Sınır, yazılacak açıyı kırpar.',
        kontrol(sim) {
          if (olaylar(sim, 'A0', 'analog').length < D46_3.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
          const o = acilar(sim);
          if (!o.length) return hata('Servo hiç hareket etmedi.');
          const fazla = o.find(x => x.deger > 120);
          if (fazla) return hata(`Kol ${Math.round(fazla.deger)}° açısına gitti. 120°'yi geçmemeli.`);
          const ac = asamaAcilari(sim);
          if (ac.some(v => v === null)) return hata('Servo her aşamada bir açıya gitmeli.');
          if (!yakin(ac[0], hedefAci(500), 4)) return hata(`Pot 500 iken kol yaklaşık ${Math.round(hedefAci(500))}° olmalı (şu an ${Math.round(ac[0])}°). Düşük değerlerde topuzu izlemeli.`);
          if (!yakin(ac[1], 90, 4)) return hata(`Pot 2048 iken kol yaklaşık 90° olmalı (şu an ${Math.round(ac[1])}°).`);
          if (!yakin(ac[2], 120, 3)) return hata(`Pot tam sağdayken kol 120°'de durmalı (şu an ${Math.round(ac[2])}°).`);
          return tamam('Kol 120°\'de duruyor, engele çarpmıyor!');
        },
      },
    ],
  },
};
