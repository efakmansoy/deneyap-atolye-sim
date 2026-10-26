// Modül 4 ek içerik: sesli anlatım (kod satır satır yazılır) + "kodu değiştir" görevleri.
// Şema için m1-sesli.js dosyasına bak. `yaz` metinleri art arda eklenince dersin kontrolünü geçen tam bir C++ programı oluşur.
const olaylar = (sim, pin, tur) => sim.olaylar.filter(o => o.pin === pin && o.tur === tur);
const sirali = l => [...l].sort((a, b) => a.t - b.t);
const durumda = (l, t) => { let d = 0; for (const o of l) { if (o.t <= t) d = o.deger; else break; } return d; };
const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });
const yakin = (a, b, tol) => Math.abs(a - b) <= tol;

// Buzzer kaydını [{f, t, sure}] notalarına böler
const notalar = sim => {
  const out = []; let cur = null;
  for (const o of sirali(olaylar(sim, 'D8', 'ses'))) {
    if (cur) { cur.sure = o.t - cur.t; out.push(cur); cur = null; }
    if (o.deger > 0) cur = { f: o.deger, t: o.t, sure: 0 };
  }
  if (cur) { cur.sure = Math.max(sim.t, cur.t) - cur.t; out.push(cur); }
  return out;
};
const acilar = sim => sirali(olaylar(sim, 'D5', 'servo'));
const bipler = sim => sirali(olaylar(sim, 'D8', 'ses')).filter(x => x.deger > 0);

// Özel senaryolar (derslerdeki girdi mantığıyla aynı)
const mesafeSenaryo = asamalar => async sim => {
  sim.cihaz.mesafe ??= {};
  for (const [t, cm] of asamalar) {
    while (sim.t < t) await sim.tick();
    sim.cihaz.mesafe.D3 = cm;
    sim.olaylar.push({ t: sim.t, pin: 'D3', deger: cm, tur: 'mesafe' });
    sim.yay();
  }
};
const piyanoSenaryo = adimlar => async sim => {
  for (const [t, pin, v] of [...adimlar].sort((a, b) => a[0] - b[0])) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.girdi[pin] = v;
    sim.olaylar.push({ t: sim.t, pin, deger: v, tur: 'girdi' });
    sim.yay();
  }
};
// beklenen: [[pin, Hz], ...]  Tuşa basınca o nota çalmalı, bırakınca ses kesilmeli.
const tusKontrol = (sim, beklenen) => {
  const o = sirali(olaylar(sim, 'D8', 'ses'));
  for (const [pin, f] of beklenen) {
    const g = sirali(olaylar(sim, pin, 'girdi'));
    const bas = g.find(x => x.deger === 1), birak = g.find(x => x.deger === 0);
    if (!bas || !birak) return hata('Senaryo tamamlanmadı, tekrar dene.');
    const cal = durumda(o, bas.t + 200);
    if (!yakin(cal, f, 2)) return hata(`${pin} tuşuna basınca ${f} Hz çalmalı (şu an ${cal || 'sessiz'}).`);
    if (durumda(o, birak.t + 150) !== 0) return hata(`${pin} tuşunu bırakınca ses kesilmeli ama buzzer hâlâ ötüyor.`);
  }
  return null;
};
// Mesafe aşamaları: [{t, cm}] (girdi'nin yazdığı damgalardan)
const asamalar = sim => olaylar(sim, 'D3', 'mesafe');
const araliktaBip = (sim, a, b) => bipler(sim).filter(x => x.t >= a && x.t < b);

const BUZZER_KOD = '#define BUZZER D8\n\nint notalar[] = {262, 330, 392, 523, 392, 330, 262};\n\nvoid setup() {\n  for (int i = 0; i < 7; i++) {\n    tone(BUZZER, notalar[i]);\n    delay(300);\n    noTone(BUZZER);\n    delay(50);\n  }\n}\n\nvoid loop() {\n}\n';

const PARK_FONK = '// Mesafeyi santimetre olarak ölç\nlong mesafeOlc(int pin) {\n  pinMode(pin, OUTPUT);\n  digitalWrite(pin, LOW);\n  delayMicroseconds(2);\n  digitalWrite(pin, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(pin, LOW);\n  pinMode(pin, INPUT);\n  return pulseIn(pin, HIGH, 30000) / 58;\n}\n\n';
const park = (govde) => '#define MESAFE D3\n#define BUZZER D8\n\n' + PARK_FONK + 'void setup() {\n  pinMode(BUZZER, OUTPUT);\n}\n\nvoid loop() {\n  long cm = mesafeOlc(MESAFE);\n' + govde + '}\n';

const piyano = (notalarDizi, ilk = '  noTone(BUZZER);\n') => '#define BUZZER D8\n\nvoid setup() {\n  for (int i = 0; i < 7; i++) {\n    pinMode(D0 + i, INPUT);\n  }\n  pinMode(BUZZER, OUTPUT);\n}\n\nvoid loop() {\n' + ilk
  + notalarDizi.map((f, i) => `  if (digitalRead(D${i}) == HIGH) tone(BUZZER, ${f});\n`).join('') + '}\n';
const NORMAL = [262, 294, 330, 349, 392, 440, 494];

export default {
  'buzzer-melodi': {
    sesli: [
      { ses: 'Bugün kartın D sekiz pinindeki buzzer ile melodi çalacağız. Buzzer, küçük bir hoparlör gibi düşün. Ona hangi sesi çalacağını sayılarla söyleriz.', yaz: '#define BUZZER D8\n\n', parca: 0 },
      { ses: 'Ses, havanın saniyede kaç kez titreştiğidir. Bu sayıya frekans denir ve birimi hertzdir. Titreşim hızlandıkça ses incelir. Do notası iki yüz altmış iki hertz, Mi üç yüz otuz hertz, Sol üç yüz doksan iki hertzdir.' },
      { ses: 'Melodimizin notalarını bir listeye koyalım. Sırayla Do, Mi, Sol, tiz Do, Sol, Mi ve yine Do. Bu melodiyi tamamen kendimiz uydurduk.', yaz: '// Do Mi Sol Do\' Sol Mi Do\nint notalar[] = {262, 330, 392, 523, 392, 330, 262};\n\n', parca: 0 },
      { ses: 'Şimdi setup bölümü. Melodi bir kez çalsın istiyoruz. Yedi nota olduğu için bir döngü kuruyoruz. Bu döngü, listedeki notaları sırayla dolaşacak.', yaz: 'void setup() {\n  for (int i = 0; i < 7; i++) {\n' },
      { ses: 'Tone komutu buzzer\'a bir frekans çaldırır. Sırası gelen notayı listeden alıp çalıyoruz. Üç yüz milisaniye bekleyince nota kulağımıza yerleşir.', yaz: '    tone(BUZZER, notalar[i]);\n    delay(300);\n', parca: 0 },
      { ses: 'Sonra noTone ile sesi susturuyoruz ve çok kısa, elli milisaniye bekliyoruz. Bu küçük sessizlik olmazsa notalar birbirine karışır ve tek uzun bir ses gibi duyulur.', yaz: '    noTone(BUZZER);\n    delay(50);\n  }\n}\n\n', parca: 0 },
      { ses: 'Loop bölümünü boş bırakıyoruz, çünkü melodiyi sadece bir kere çalmak istiyoruz.', yaz: 'void loop() {\n}\n' },
      { ses: 'Haydi dinleyelim! Do, Mi, Sol, tiz Do, sonra aşağı iniyor.', calistir: true, parca: 0 },
      { ses: 'Harika, ilk melodin hazır! Görevler sekmesinde notaları, süreleri ve nota sayısını değiştirerek kendi melodini yapacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Melodinin başını değiştir',
        metin: 'Melodi şu an Do-Mi-Sol ile başlıyor. Listedeki <b>ilk üç sayıyı</b> değiştir: melodi <b>Sol (392), La (440), Si (494)</b> ile başlasın. Gerisi aynı kalsın.',
        kod: BUZZER_KOD, degistir: [{ ara: '262, 330, 392' }], sure: 3500,
        cozum: BUZZER_KOD.replace('{262, 330, 392,', '{392, 440, 494,'),
        ipucu: 'Süslü parantez içindeki ilk üç sayı sırayla 392, 440, 494 olmalı. Virgülleri silme.',
        kontrol(sim) {
          const n = notalar(sim);
          if (n.length < 7) return hata('Melodi eksik çalıyor, listeyi bozma: 7 nota olmalı.');
          const h = [392, 440, 494];
          for (let i = 0; i < 3; i++) if (!yakin(n[i].f, h[i], 3)) return hata(`${i + 1}. nota ${h[i]} Hz olmalı (şu an ${n[i].f} Hz).`);
          return tamam('Melodi artık Sol-La-Si ile başlıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yavaş melodi',
        metin: 'Notalar çok hızlı geçiyor. Her notanın <b>en az 500 ms</b> (yarım saniye) sürmesini sağla; 7 nota da çalsın.',
        kod: BUZZER_KOD, degistir: [{ ara: 'delay(300)' }], sure: 6000,
        cozum: BUZZER_KOD.replace('delay(300)', 'delay(600)'),
        ipucu: 'Nota ne kadar sürecekse tone komutundan sonraki delay o kadar bekler. 300 yerine daha büyük bir sayı yaz, örneğin 600.',
        kontrol(sim) {
          const n = notalar(sim);
          if (n.length < 7) return hata(`Sadece ${n.length} nota çaldı, 7 olmalı.`);
          const kisa = Math.min(...n.map(x => x.sure));
          if (kisa < 500) return hata(`En kısa nota ${Math.round(kisa)} ms sürüyor. Her nota en az 500 ms olmalı.`);
          if (n.some(x => x.sure > 900)) return hata('Notalar çok uzadı, 900 ms\'yi geçmesin.');
          return tamam('Melodi artık yavaş ve ağır çalıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Kısa melodi, uzun nefes',
        metin: 'Melodiyi <b>sadece ilk 4 nota</b> çalacak şekilde kısalt ve notalar arasındaki sessizliği <b>150-300 ms</b> yap.',
        kod: BUZZER_KOD, degistir: [{ ara: 'i < 7' }, { ara: 'delay(50)' }], sure: 3500,
        cozum: BUZZER_KOD.replace('i < 7', 'i < 4').replace('delay(50)', 'delay(200)'),
        ipucu: 'Döngü kaç kez dönerse o kadar nota çalar. Sessizlik, noTone\'dan sonraki delay\'dir.',
        kontrol(sim) {
          const n = notalar(sim);
          if (n.length !== 4) return hata(`${n.length} nota çaldı, tam 4 nota olmalı. Döngünün kaç kez döneceğini değiştir.`);
          const bosluk = n.slice(1).map((x, i) => x.t - (n[i].t + n[i].sure));
          if (bosluk.some(b => b < 150 || b > 300)) return hata(`Notalar arası sessizlik ${Math.round(bosluk[0])} ms. 150-300 ms olmalı.`);
          return tamam('4 notalık, ferah bir melodi oldu!');
        },
      },
    ],
  },

  'servo-motor': {
    sesli: [
      { ses: 'Bugün servo motoru çalıştıracağız. Sıradan bir motor sürekli döner. Servo ise kolunu sana verdiğin açıya getirir ve orada durur. Açı sıfır ile yüz seksen derece arasındadır.', yaz: '#include <ESP32Servo.h>\n\n', parca: 0 },
      { ses: 'Servoyu kullanmak için kütüphanesini ekledik. Şimdi servo adında bir nesne oluşturuyoruz. Bu nesne, motorumuzu temsil edecek.', yaz: 'Servo servo;\n\n' },
      { ses: 'Setup bölümünde servoyu D beş pinine bağlıyoruz. Attach komutu, "bu motor şu pinde" demektir.', yaz: 'void setup() {\n  servo.attach(D5);\n', parca: 0 },
      { ses: 'Şimdi kolu sıfırdan yüz seksene doğru süpürelim. Her seferinde otuz derece ilerleyen bir döngü kuruyoruz. Write komutu kolu istediğimiz açıya çevirir.', yaz: '  for (int aci = 0; aci <= 180; aci += 30) {\n    servo.write(aci);\n', parca: 0 },
      { ses: 'Servo hareket için zaman ister. Yüz milisaniye beklemezsek, kol hedefe varamadan yeni komut gelir ve hareket kopuk olur.', yaz: '    delay(100);\n  }\n' },
      { ses: 'Şimdi geri dönüş. Yüz elliden başlayıp otuzar derece azaltarak sıfıra iniyoruz. Böylece kol gidiş kadar yumuşak bir şekilde geri gelecek.', yaz: '  for (int aci = 150; aci >= 0; aci -= 30) {\n    servo.write(aci);\n    delay(100);\n  }\n}\n\n', parca: 0 },
      { ses: 'Tekrar etmesine gerek yok, bu yüzden loop bölümü boş kalıyor.', yaz: 'void loop() {\n}\n' },
      { ses: 'Çalıştıralım ve kolun gidip gelişini izleyelim!', calistir: true, parca: 0 },
      { ses: 'Güzel hareket! Görevler sekmesinde açıları ve hızı değiştirerek servoyu istediğin gibi oynatacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Daraltılmış hareket',
        metin: 'Kol şu an <b>0°</b> ile <b>180°</b> arasında gidip geliyor. Uçları değiştir: kol <b>30°</b> ile <b>150°</b> arasında gidip gelsin.',
        kod: '#include <ESP32Servo.h>\n\nServo servo;\n\nvoid setup() {\n  servo.attach(D5);\n}\n\nvoid loop() {\n  servo.write(0);\n  delay(1000);\n  servo.write(180);\n  delay(1000);\n}\n',
        degistir: [{ ara: 'write(0)' }, { ara: 'write(180)' }], sure: 4500,
        cozum: '#include <ESP32Servo.h>\n\nServo servo;\n\nvoid setup() {\n  servo.attach(D5);\n}\n\nvoid loop() {\n  servo.write(30);\n  delay(1000);\n  servo.write(150);\n  delay(1000);\n}\n',
        ipucu: 'İki write komutunun içindeki açıları değiştir: biri 30, öbürü 150 olsun.',
        kontrol(sim) {
          const o = acilar(sim).map(x => x.deger);
          if (o.length < 4) return hata('Servo yeterince hareket etmedi.');
          if (o.some(v => !yakin(v, 30, 3) && !yakin(v, 150, 3))) return hata(`Kol 30° ve 150° dışında bir açıya gitti (${o.find(v => !yakin(v, 30, 3) && !yakin(v, 150, 3))}°). Uçlar tam 30 ve 150 olmalı.`);
          if (!o.some(v => yakin(v, 30, 3)) || !o.some(v => yakin(v, 150, 3))) return hata('Kol hem 30° hem 150° konumuna gelmeli.');
          return tamam('Kol 30° ile 150° arasında gidip geliyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yavaş süpürme',
        metin: 'Kol çok hızlı süpürüyor. Kolu 0°\'den 180°\'ye <b>en fazla 12°</b>\'lik adımlarla ve toplam <b>en az 1,5 saniyede</b> götür. (İki sayıyı değiştirmen gerekecek.)',
        kod: '#include <ESP32Servo.h>\n\nServo servo;\n\nvoid setup() {\n  servo.attach(D5);\n  for (int aci = 0; aci <= 180; aci += 30) {\n    servo.write(aci);\n    delay(50);\n  }\n}\n\nvoid loop() {\n}\n',
        degistir: [{ ara: 'aci += 30' }, { ara: 'delay(50)' }], sure: 3500,
        cozum: '#include <ESP32Servo.h>\n\nServo servo;\n\nvoid setup() {\n  servo.attach(D5);\n  for (int aci = 0; aci <= 180; aci += 10) {\n    servo.write(aci);\n    delay(100);\n  }\n}\n\nvoid loop() {\n}\n',
        ipucu: 'Adım küçülürse adım sayısı artar. 10° adımla 18 adım olur; her adımda 100 ms beklersen 1,8 saniye eder.',
        kontrol(sim) {
          const o = acilar(sim);
          const a = o.findIndex(x => x.deger <= 5);
          const b = a < 0 ? -1 : o.findIndex((x, i) => i > a && x.deger >= 175);
          if (a < 0) return hata('Kol 0°\'ye gelmedi.');
          if (b < 0) return hata('Kol 180°\'ye ulaşmadı.');
          const yol = o.slice(a, b + 1);
          const adim = Math.max(...yol.slice(1).map((x, i) => Math.abs(x.deger - yol[i].deger)));
          if (adim > 12) return hata(`En büyük adım ${adim}°. 12°'yi geçmemeli, adımı küçült.`);
          const sure = o[b].t - o[a].t;
          if (sure < 1500) return hata(`Süpürme ${Math.round(sure)} ms sürdü, en az 1500 ms olmalı. Adımlar arası beklemeyi artır.`);
          return tamam('Kol artık yavaş ve yumuşak süpürüyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Dört kez selam',
        metin: 'Kol şu an iki kez <b>0°</b> ile <b>180°</b> arasında gidip geliyor. Onu <b>60°</b> ile <b>120°</b> arasında, <b>4 kez</b> gidip gelecek şekilde değiştir. Üç yeri değiştirmen gerekecek.',
        kod: '#include <ESP32Servo.h>\n\nServo servo;\n\nvoid setup() {\n  servo.attach(D5);\n  for (int i = 0; i < 2; i++) {\n    servo.write(0);\n    delay(300);\n    servo.write(180);\n    delay(300);\n  }\n}\n\nvoid loop() {\n}\n',
        degistir: [{ ara: 'i < 2' }, { ara: 'write(0)' }, { ara: 'write(180)' }], sure: 3800,
        cozum: '#include <ESP32Servo.h>\n\nServo servo;\n\nvoid setup() {\n  servo.attach(D5);\n  for (int i = 0; i < 4; i++) {\n    servo.write(60);\n    delay(300);\n    servo.write(120);\n    delay(300);\n  }\n}\n\nvoid loop() {\n}\n',
        ipucu: 'Döngüdeki 2 kaç kez tekrar edileceğini belirler. Açılar 60 ve 120 olmalı.',
        kontrol(sim) {
          const o = acilar(sim).map(x => x.deger);
          const yanlis = o.find(v => !yakin(v, 60, 3) && !yakin(v, 120, 3));
          if (yanlis !== undefined) return hata(`Kol 60° ve 120° dışına çıktı (${yanlis}°). Sadece bu iki açı kullanılmalı.`);
          const n120 = o.filter(v => yakin(v, 120, 3)).length, n60 = o.filter(v => yakin(v, 60, 3)).length;
          if (n120 < 4 || n60 < 4) return hata(`Kol ${Math.min(n120, n60)} kez gidip geldi. 4 kez olmalı.`);
          return tamam('Kol dört kez selam verdi!');
        },
      },
    ],
  },

  'park-sensoru': {
    sesli: [
      { ses: 'Bugün arabalardaki park sensörünü yapacağız. Engel yaklaştıkça bip sesi sıklaşacak. Kartın D üç pininde mesafe sensörü, D sekiz pininde buzzer var.', yaz: '#define MESAFE D3\n#define BUZZER D8\n\n', parca: 0 },
      { ses: 'Mesafe sensörü, yarasa gibi çalışır. Bir ses dalgası gönderir, engele çarpıp geri dönmesini bekler. Dönüş süresi uzadıkça engel uzaktadır. Bu süreyi santimetreye çeviren bir fonksiyon yazalım.', yaz: '// Mesafeyi santimetre olarak ölç\nlong mesafeOlc(int pin) {\n', parca: 0 },
      { ses: 'Önce sensörü uyandırıyoruz. Pini çıkış yapıp çok kısa bir darbe gönderiyoruz. Bu darbe, ses dalgasını yola çıkarır.', yaz: '  pinMode(pin, OUTPUT);\n  digitalWrite(pin, LOW);\n  delayMicroseconds(2);\n  digitalWrite(pin, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(pin, LOW);\n' },
      { ses: 'Sonra pini giriş yapıp yankının gelmesini bekliyoruz. PulseIn komutu yankının süresini ölçer. Bu süreyi elli sekize bölünce santimetre elde ederiz.', yaz: '  pinMode(pin, INPUT);\n  return pulseIn(pin, HIGH, 30000) / 58;\n}\n\n' },
      { ses: 'Setup bölümünde sadece buzzer pinini çıkış yapıyoruz.', yaz: 'void setup() {\n  pinMode(BUZZER, OUTPUT);\n}\n\n' },
      { ses: 'Loop bölümünde sürekli ölçüm yapacağız. Ölçtüğümüz santimetre değerini cm adlı bir kutuda saklıyoruz.', yaz: 'void loop() {\n  long cm = mesafeOlc(MESAFE);\n', parca: 0 },
      { ses: 'Engel yüz santimetreden yakınsa bip çalıyoruz. Bekleme süresini mesafenin dört katı yapıyoruz. Engel yaklaştıkça mesafe küçülür, bekleme kısalır, bip sıklaşır.', yaz: '  if (cm < 100) {\n    tone(BUZZER, 1000);\n    delay(cm * 4);\n    noTone(BUZZER);\n    delay(cm * 4);\n', parca: 1 },
      { ses: 'Engel uzaktaysa buzzer sessiz kalır. Döngü rahat dönsün diye yirmi milisaniye bekliyoruz.', yaz: '  } else {\n    delay(20);\n  }\n}\n' },
      { ses: 'Çalıştıralım! Engel yüz elli santimetreden başlayıp yaklaşacak. Bip hızını dinle.', calistir: true, parca: 1 },
      { ses: 'Müthiş, arabanın park sensörü hazır! Görevler sekmesinde eşik mesafesini, sesi ve bip hızını kendine göre ayarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Uyarı mesafesini kısalt',
        metin: 'Buzzer şu an engel <b>100 cm</b>\'den yakınsa ötüyor. Eşiği değiştir: sadece <b>30 cm</b>\'den yakın engellerde ötsün. (60 cm\'de sessiz, 20 cm\'de bip olmalı.)',
        kod: park('  if (cm < 100) {\n    tone(BUZZER, 1000);\n    delay(cm * 4);\n    noTone(BUZZER);\n    delay(cm * 4);\n  } else {\n    delay(20);\n  }\n'),
        degistir: [{ ara: 'cm < 100' }], sure: 6500,
        girdi: mesafeSenaryo([[0, 150], [1500, 60], [3000, 20], [4500, 150]]),
        cozum: park('  if (cm < 30) {\n    tone(BUZZER, 1000);\n    delay(cm * 4);\n    noTone(BUZZER);\n    delay(cm * 4);\n  } else {\n    delay(20);\n  }\n'),
        ipucu: 'Koşuldaki 100 sayısı "kaç santimetreden yakın" demek. 60\'tan küçük, 20\'den büyük bir sayı seç, örneğin 30.',
        kontrol(sim) {
          const a = asamalar(sim);
          if (a.length < 4) return hata('Senaryo tamamlanmadı, tekrar dene.');
          if (araliktaBip(sim, a[0].t + 100, a[1].t - 100).length) return hata('Engel 150 cm\'deyken buzzer ötmemeli.');
          if (araliktaBip(sim, a[1].t + 500, a[2].t - 100).length) return hata('Engel 60 cm\'deyken buzzer hâlâ ötüyor. Eşik 60\'tan küçük olmalı.');
          if (araliktaBip(sim, a[2].t + 500, a[3].t - 100).length < 3) return hata('Engel 20 cm\'deyken buzzer ötmedi. Eşik 20\'den büyük olmalı.');
          return tamam('Park sensörün artık sadece 30 cm\'den yakında uyarıyor!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Tiz ve telaşlı alarm',
        metin: 'Bip sesini <b>tizleştir</b> (1800-2500 Hz arası) ve <b>sıklaştır</b>: engel 20 cm\'deyken saniyede yaklaşık 10 bip veya daha çok olsun. Bekleme süresindeki çarpanı küçültmen gerekecek.',
        kod: park('  if (cm < 100) {\n    tone(BUZZER, 1000);\n    delay(cm * 4);\n    noTone(BUZZER);\n    delay(cm * 4);\n  } else {\n    delay(20);\n  }\n'),
        degistir: [{ ara: 'tone(BUZZER, 1000)' }, { ara: 'cm * 4' }], sure: 4500,
        girdi: mesafeSenaryo([[0, 150], [1000, 20], [3000, 150]]),
        cozum: park('  if (cm < 100) {\n    tone(BUZZER, 2000);\n    delay(cm * 2);\n    noTone(BUZZER);\n    delay(cm * 2);\n  } else {\n    delay(20);\n  }\n'),
        ipucu: 'Frekans 1000\'den büyük olsun, örneğin 2000. İki delay\'deki 4 çarpanını 2 yap; bekleme yarıya iner, bip iki kat sıklaşır.',
        kontrol(sim) {
          const a = asamalar(sim);
          if (a.length < 3) return hata('Senaryo tamamlanmadı, tekrar dene.');
          const b = araliktaBip(sim, a[1].t + 300, a[2].t - 100);
          if (!b.length) return hata('Engel 20 cm\'deyken buzzer ötmedi.');
          if (b.some(x => x.deger < 1800 || x.deger > 2500)) return hata(`Bip frekansı ${b.find(x => x.deger < 1800 || x.deger > 2500).deger} Hz. 1800-2500 Hz arasında olmalı.`);
          const sn = b.length / ((a[2].t - 100 - (a[1].t + 300)) / 1000);
          if (sn < 9) return hata(`Saniyede ${sn.toFixed(1)} bip var, en az 9 olmalı. Bekleme çarpanını küçült.`);
          return tamam('Tiz ve telaşlı bir alarm yaptın!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yaklaştıkça incelen ses',
        metin: 'Şu an her bip aynı <b>1000 Hz</b>. Bip frekansı sabit bir sayı yerine <b>mesafeye bağlı</b> olsun: engel yaklaştıkça ses <b>daha tiz</b> çıksın. Frekansı 100-5000 Hz arasında tut.',
        kod: park('  if (cm < 100) {\n    tone(BUZZER, 1000);\n    delay(cm * 4);\n    noTone(BUZZER);\n    delay(cm * 4);\n  } else {\n    delay(20);\n  }\n'),
        degistir: [{ ara: '1000' }], sure: 7500,
        girdi: mesafeSenaryo([[0, 150], [1500, 80], [3000, 40], [4500, 15]]),
        cozum: park('  if (cm < 100) {\n    tone(BUZZER, 2000 - cm * 10);\n    delay(cm * 4);\n    noTone(BUZZER);\n    delay(cm * 4);\n  } else {\n    delay(20);\n  }\n'),
        ipucu: 'cm küçüldükçe büyüyen bir ifade lazım. Örneğin 2000 - cm * 10: 80 cm\'de 1200, 15 cm\'de 1850 Hz olur.',
        kontrol(sim) {
          const a = asamalar(sim);
          if (a.length < 4) return hata('Senaryo tamamlanmadı, tekrar dene.');
          const f = [1, 2, 3].map(i => araliktaBip(sim, a[i].t + 500, i === 3 ? a[3].t + 1400 : a[i + 1].t - 100)[0]?.deger);
          if (f.some(v => !v)) return hata('Her mesafe aşamasında (80, 40 ve 15 cm) bip duyulmalı.');
          if (f.some(v => v < 100 || v > 5000)) return hata('Frekans 100-5000 Hz arasında kalmalı.');
          if (!(f[1] > f[0] + 100 && f[2] > f[1] + 100)) return hata(`Frekanslar 80 cm: ${f[0]}, 40 cm: ${f[1]}, 15 cm: ${f[2]} Hz. Yaklaştıkça artmalı (her adımda en az 100 Hz).`);
          return tamam('Engel yaklaştıkça ses incelip tizleşiyor!');
        },
      },
    ],
  },

  'dugme-piyano': {
    sesli: [
      { ses: 'Bugün yedi tuşlu bir piyano yapıyoruz! Tuşlar D sıfırdan D altıya kadar pinlere bağlı. Buzzer yine D sekiz pininde. Bir tuşa basınca o notayı çalacağız.', yaz: '#define BUZZER D8\n\n', parca: 0 },
      { ses: 'Setup bölümünde yedi tuş pinini birden giriş yapmamız lazım. Yedi satır yazmak yerine, bir döngüyle sıfırdan altıya sayıp D sıfırın üstüne ekliyoruz.', yaz: 'void setup() {\n  for (int i = 0; i < 7; i++) {\n    pinMode(D0 + i, INPUT);\n  }\n', parca: 0 },
      { ses: 'Buzzer pinini de çıkış yapıyoruz ve setup bölümünü kapatıyoruz.', yaz: '  pinMode(BUZZER, OUTPUT);\n}\n\n' },
      { ses: 'Loop bölümünün en başında sesi susturuyoruz. Böylece hiçbir tuşa basılmadığında ya da tuşu bıraktığında buzzer sessiz olur.', yaz: 'void loop() {\n  noTone(BUZZER);\n', parca: 1 },
      { ses: 'Şimdi ilk tuş. D sıfır tuşuna basılmışsa, yani pin yüksekse, buzzer\'a iki yüz altmış iki hertz çaldırıyoruz. Bu Do notasıdır. Re notası için D bire iki yüz doksan dört hertz yazıyoruz.', yaz: '  if (digitalRead(D0) == HIGH) tone(BUZZER, 262);\n  if (digitalRead(D1) == HIGH) tone(BUZZER, 294);\n', parca: 0 },
      { ses: 'Mi notası üç yüz otuz hertz, Fa notası üç yüz kırk dokuz hertz. Aynı kalıbı tekrarlıyoruz, sadece pin ve frekans değişiyor.', yaz: '  if (digitalRead(D2) == HIGH) tone(BUZZER, 330);\n  if (digitalRead(D3) == HIGH) tone(BUZZER, 349);\n', parca: 0 },
      { ses: 'Sol notası üç yüz doksan iki hertz. La dört yüz kırk, Si dört yüz doksan dört hertz. Son tuşu da ekleyip loop bölümünü kapatıyoruz.', yaz: '  if (digitalRead(D4) == HIGH) tone(BUZZER, 392);\n  if (digitalRead(D5) == HIGH) tone(BUZZER, 440);\n  if (digitalRead(D6) == HIGH) tone(BUZZER, 494);\n}\n', parca: 0 },
      { ses: 'Çalıştıralım! Program tuşlara kendisi basacak. Sonra sen de sahnedeki tuşlara tıklayıp çalabilirsin.', calistir: true, parca: 0 },
      { ses: 'Piyanon hazır! Görevler sekmesinde tuşların notalarını değiştirip kendi piyanonu ayarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Tuşları takas et',
        metin: 'D0 tuşu şu an Do (262 Hz), D5 tuşu La (440 Hz) çalıyor. İki notayı <b>takas et</b>: D0 tuşu <b>La (440)</b>, D5 tuşu <b>Do (262)</b> çalsın.',
        kod: piyano(NORMAL), degistir: [{ ara: 'tone(BUZZER, 262)' }, { ara: 'tone(BUZZER, 440)' }], sure: 2600,
        girdi: piyanoSenaryo([[500, 'D0', 1], [900, 'D0', 0], [1200, 'D5', 1], [1600, 'D5', 0]]),
        cozum: piyano([440, 294, 330, 349, 392, 262, 494]),
        ipucu: 'D0 satırındaki sayıyı 440, D5 satırındakini 262 yap. Pin numaralarına dokunma.',
        kontrol(sim) { return tusKontrol(sim, [['D0', 440], ['D5', 262]]) ?? tamam('Notalar takas edildi!'); },
      },
      {
        tip: 'duzenle', baslik: 'Akort ayarı',
        metin: 'Piyanonun üç tuşu akortsuz! Nota tablosuna bakarak <b>D1 (Re 294)</b>, <b>D4 (Sol 392)</b> ve <b>D6 (Si 494)</b> tuşlarının frekanslarını düzelt.',
        kod: piyano([262, 249, 330, 349, 429, 440, 460]), degistir: [{ ara: 'tone(BUZZER, 249)' }, { ara: 'tone(BUZZER, 429)' }, { ara: 'tone(BUZZER, 460)' }], sure: 3200,
        girdi: piyanoSenaryo([[500, 'D1', 1], [900, 'D1', 0], [1200, 'D4', 1], [1600, 'D4', 0], [1900, 'D6', 1], [2300, 'D6', 0]]),
        cozum: piyano(NORMAL),
        ipucu: 'Re = 294, Sol = 392, Si = 494 Hz. Her satırdaki yanlış sayıyı doğrusuyla değiştir.',
        kontrol(sim) { return tusKontrol(sim, [['D1', 294], ['D4', 392], ['D6', 494]]) ?? tamam('Piyano akortlandı, tüm tuşlar doğru!'); },
      },
      {
        tip: 'duzenle', baslik: 'Susmayan piyano',
        metin: 'Bu piyanoda tuşu bırakınca <b>ses kesilmiyor</b>! Döngünün başındaki sorunlu satırı, sesi susturan doğru komutla değiştir (buzzer D8 pininde).',
        kod: piyano(NORMAL, '  delay(1);\n'), degistir: [{ ara: 'delay(1);' }], sure: 2600,
        girdi: piyanoSenaryo([[500, 'D0', 1], [900, 'D0', 0], [1200, 'D2', 1], [1600, 'D2', 0]]),
        cozum: piyano(NORMAL),
        ipucu: 'Sesi susturan komutun adı noTone. İçine buzzer pinini yaz.',
        kontrol(sim) { return tusKontrol(sim, [['D0', 262], ['D2', 330]]) ?? tamam('Tuşu bırakınca ses artık kesiliyor!'); },
      },
    ],
  },
};
