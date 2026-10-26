// Modül 3 ek içerik: sesli anlatım (kod satır satır yazılır) + "kodu değiştir" görevleri.
// Şema için m1-sesli.js dosyasının başındaki açıklamalara bak.
const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });
const K = (...satirlar) => satirlar.join('\n') + '\n';
const D8 = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];

/** Girdi senaryosu: analog pini sırayla değiştirir, her değişimden sonra bekleyip pinleri örnekler. */
const orn = (analogPin, degerler, pinler = ['D0'], bekle = 400) => async sim => {
  for (const d of degerler) {
    sim.analog[analogPin] = d;
    await sim.bekle(bekle);
    (sim.cihaz.ornekler ??= []).push(pinler.map(p => sim.pin[p].pwm));
  }
};
const ornekler = sim => sim.cihaz.ornekler ?? [];
const yuzde = x => `%${Math.round(x * 100)}`;
const enUzunKosu = (v, yon) => {
  let en = 0, k = 0;
  for (let i = 1; i < v.length; i++) {
    if ((v[i] - v[i - 1]) * yon > 0) { k++; en = Math.max(en, k); } else if (v[i] !== v[i - 1]) k = 0;
  }
  return en;
};
const medyan = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** D0 LED'inin örneklenen yanık/sönük durumlarını beklenenle karşılaştırır (1 = yanık). */
function ikiliDenetle(sim, degerler, hedef, analogAd, basari) {
  const o = ornekler(sim).map(x => x[0]);
  if (o.length < degerler.length) return hata('Program çok erken bitti. Her şey loop içinde kalmalı.');
  for (let i = 0; i < degerler.length; i++) {
    const yanik = o[i] > .5;
    if (yanik !== !!hedef[i]) return hata(`${analogAd} = ${degerler[i]} iken LED ${hedef[i] ? 'yanmalıydı' : 'sönük olmalıydı'}, ama ${yanik ? 'yanıyor' : 'sönük'}.`);
  }
  return tamam(basari);
}
function parlaklikDenetle(sim, degerler, hedef, tol, basari) {
  const o = ornekler(sim).map(x => x[0]);
  if (o.length < degerler.length) return hata('Program çok erken bitti. Her şey loop içinde kalmalı.');
  for (let i = 0; i < degerler.length; i++) {
    if (Math.abs(o[i] - hedef[i]) > tol) return hata(`Pot ${degerler[i]} iken LED ${yuzde(hedef[i])} parlak olmalıydı, şu an ${yuzde(o[i])}.`);
  }
  return tamam(basari);
}
function cubukDenetle(sim, degerler, hedef, basari) {
  const o = ornekler(sim).map(x => x.filter(p => p > .5).length);
  if (o.length < degerler.length) return hata('Program çok erken bitti. Her şey loop içinde kalmalı.');
  for (let i = 0; i < degerler.length; i++) {
    if (o[i] !== hedef[i]) return hata(`Pot ${degerler[i]} iken ${hedef[i]} LED yanmalıydı, ${o[i]} LED yanıyor.`);
  }
  return tamam(basari);
}
const rgb = sim => ['D0', 'D1', 'D2'].map(p => sim.pin[p].pwm);

// Ortak başlangıç/çözüm programları
const PWM_ASAMA = (ust, adim, bek) => K(
  'void setup() {', '  pinMode(D0, OUTPUT);', '}', '',
  'void loop() {',
  `  for (int i = 0; i <= ${ust}; i += 5) {`, '    analogWrite(D0, i);', `    delay(${bek});`, '  }',
  `  for (int i = ${ust}; i >= 0; i -= ${adim}) {`, '    analogWrite(D0, i);', `    delay(${bek});`, '  }', '}');
const POT_PROG = (a, b, c, d, pin = 'A0') => K(
  'void setup() {', '  pinMode(D0, OUTPUT);', '}', '',
  'void loop() {', `  int deger = analogRead(${pin});`, `  analogWrite(D0, map(deger, ${a}, ${b}, ${c}, ${d}));`, '  delay(10);', '}');
const LDR_PROG = (esik, yanDeger, sonDeger) => K(
  'void setup() {', '  pinMode(D0, OUTPUT);', '}', '',
  'void loop() {', '  int isik = analogRead(A0);', `  if (isik < ${esik}) {`, `    analogWrite(D0, ${yanDeger});`, '  } else {', `    analogWrite(D0, ${sonDeger});`, '  }', '  delay(10);', '}');
const SICAKLIK_PROG = (pin, kosul) => K(
  `void setup() {`, `  pinMode(${pin}, OUTPUT);`, '}', '',
  'void loop() {', '  int sicaklik = analogRead(A1);', `  if (${kosul}) {`, `    digitalWrite(${pin}, HIGH);`, '  } else {', `    digitalWrite(${pin}, LOW);`, '  }', '  delay(10);', '}');
const CUBUK_PROG = (a, b, c, d, kos = 'i < seviye') => K(
  'void setup() {', '  for (int i = 0; i < 8; i++) {', '    pinMode(D0 + i, OUTPUT);', '  }', '}', '',
  'void loop() {', `  int seviye = map(analogRead(A0), ${a}, ${b}, ${c}, ${d});`,
  '  for (int i = 0; i < 8; i++) {', `    digitalWrite(D0 + i, ${kos});`, '  }', '  delay(10);', '}');

export default {
  'rgb-led': {
    sesli: [
      { ses: 'Bu derste renkli bir ışık yapacağız. RGB LED\'in içinde üç minik ışık var: kırmızı, yeşil ve mavi. Bunların parlaklığını karıştırarak istediğimiz rengi elde ederiz.', parca: 0 },
      { ses: 'Önce setup bölümünü açıyoruz. Kırmızı ışık kartın D sıfır pinine bağlı. Bu pin kartın çıkışı olacak, o yüzden OUTPUT diyoruz.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n', parca: 0 },
      { ses: 'Yeşil ışık D bir pininde, mavi ışık D iki pininde. Onları da çıkış yapalım.', yaz: '  pinMode(D1, OUTPUT);\n  pinMode(D2, OUTPUT);\n', parca: 0 },
      { ses: 'Şimdi parlaklık zamanı. Bu LED için sadece açık ya da kapalı yetmez. analogWrite komutu bir pine sıfırdan iki yüz elli beşe kadar bir sayı yazar. Sıfır sönük, iki yüz elli beş en parlak demektir. Kırmızıyı tam parlak yapalım.', yaz: '  analogWrite(D0, 255);\n', parca: 0 },
      { ses: 'Yeşili sıfır yapıyoruz. Yani yeşil ışık hiç yanmayacak.', yaz: '  analogWrite(D1, 0);\n', parca: 0 },
      { ses: 'Maviyi de tam parlak yapıyoruz. Kırmızı ile mavi karışınca mor çıkar. Sonra setup bölümünü kapatıyoruz.', yaz: '  analogWrite(D2, 255);\n}\n\n', parca: 0 },
      { ses: 'Loop bölümüne şimdilik sadece küçük bir bekleme koyuyoruz. Renk zaten setup\'ta ayarlandı ve loop boyunca öyle kalacak.', yaz: 'void loop() {\n  delay(1000);\n}\n' },
      { ses: 'Haydi çalıştıralım. Bak, LED mor yandı!', calistir: true, parca: 0 },
      { ses: 'Işıkta renkler boyadan farklı karışır. Kırmızı ile yeşil sarı, yeşil ile mavi turkuaz, üçü birden beyaz verir. Şimdi Görevler sekmesine geç ve sayıları değiştirerek yeni renkler yap.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Turkuaz yap',
        metin: 'LED şu an mor yanıyor. İşaretli iki değeri değiştirerek <b>turkuaz</b> (yeşil + mavi) elde et: kırmızı <b>sönük</b>, yeşil <b>tam parlak</b> olsun, mavi aynı kalsın.',
        kod: K('void setup() {', '  pinMode(D0, OUTPUT);', '  pinMode(D1, OUTPUT);', '  pinMode(D2, OUTPUT);', '  analogWrite(D0, 255);', '  analogWrite(D1, 0);', '  analogWrite(D2, 255);', '}', '', 'void loop() {', '  delay(1000);', '}'),
        degistir: [{ ara: 'analogWrite(D0, 255)' }, { ara: 'analogWrite(D1, 0)' }], sure: 1500,
        ipucu: 'Kırmızıyı (D0) 0 yap, yeşili (D1) 255 yap. Mavi (D2) olduğu gibi kalsın.',
        cozum: K('void setup() {', '  pinMode(D0, OUTPUT);', '  pinMode(D1, OUTPUT);', '  pinMode(D2, OUTPUT);', '  analogWrite(D0, 0);', '  analogWrite(D1, 255);', '  analogWrite(D2, 255);', '}', '', 'void loop() {', '  delay(1000);', '}'),
        kontrol(sim) {
          const [r, g, b] = rgb(sim);
          if (r < .1 && g > .8 && b > .8) return tamam('Turkuaz oldu! Yeşil ile mavi karışımı tam bu renk.');
          if (r > .1) return hata('Kırmızı (D0) sönük olmalı, yoksa renk turkuazdan uzaklaşır.');
          if (g < .8) return hata('Yeşil (D1) tam parlak (255) olmalı.');
          return hata('Mavi (D2) tam parlak (255) kalmalı.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Turuncuya çevir',
        metin: 'LED şu an sarı. Turuncu, kırmızıya biraz yeşil katınca olur. İşaretli <b>yeşil değerini</b> yarıya indir (yaklaşık <b>128</b>).',
        kod: K('void setup() {', '  pinMode(D0, OUTPUT);', '  pinMode(D1, OUTPUT);', '  pinMode(D2, OUTPUT);', '  analogWrite(D0, 255);', '  analogWrite(D1, 255);', '  analogWrite(D2, 0);', '}', '', 'void loop() {', '  delay(1000);', '}'),
        degistir: [{ ara: 'analogWrite(D1, 255)' }], sure: 1500,
        ipucu: 'Yeşil kanalı D1 yönetiyor. 255 yerine 128 yaz.',
        cozum: K('void setup() {', '  pinMode(D0, OUTPUT);', '  pinMode(D1, OUTPUT);', '  pinMode(D2, OUTPUT);', '  analogWrite(D0, 255);', '  analogWrite(D1, 128);', '  analogWrite(D2, 0);', '}', '', 'void loop() {', '  delay(1000);', '}'),
        kontrol(sim) {
          const [r, g, b] = rgb(sim);
          if (r > .8 && g > .3 && g < .7 && b < .1) return tamam('Turuncu oldu! Yeşili azaltınca sarı turuncuya kaydı.');
          if (g >= .7) return hata(`Yeşil hâlâ çok parlak (${yuzde(g)}), renk sarı. D1\'i yaklaşık 128 yap.`);
          if (g <= .3) return hata(`Yeşil çok az (${yuzde(g)}), renk kırmızıya yakın. D1\'i yaklaşık 128 yap.`);
          return hata('Kırmızı (D0) tam parlak, mavi (D2) sönük kalmalı.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Soluk mor',
        metin: 'Mor çok parlak ve göz yoruyor. İşaretli <b>iki değeri</b> de değiştir: kırmızı ve mavi <b>yarım parlaklıkta</b> (yaklaşık <b>128</b>) olsun, yeşil sönük kalsın.',
        kod: K('void setup() {', '  pinMode(D0, OUTPUT);', '  pinMode(D1, OUTPUT);', '  pinMode(D2, OUTPUT);', '  analogWrite(D0, 255);', '  analogWrite(D1, 0);', '  analogWrite(D2, 255);', '}', '', 'void loop() {', '  delay(1000);', '}'),
        degistir: [{ ara: 'analogWrite(D0, 255)' }, { ara: 'analogWrite(D2, 255)' }], sure: 1500,
        ipucu: 'İki yerde de 255 yazıyor. İkisini de 128 yap; yeşile (D1) dokunma.',
        cozum: K('void setup() {', '  pinMode(D0, OUTPUT);', '  pinMode(D1, OUTPUT);', '  pinMode(D2, OUTPUT);', '  analogWrite(D0, 128);', '  analogWrite(D1, 0);', '  analogWrite(D2, 128);', '}', '', 'void loop() {', '  delay(1000);', '}'),
        kontrol(sim) {
          const [r, g, b] = rgb(sim);
          if (g > .1) return hata('Yeşil (D1) sönük kalmalı.');
          if (r > .7 || b > .7) return hata(`Hâlâ çok parlak (kırmızı ${yuzde(r)}, mavi ${yuzde(b)}). İkisini de yaklaşık 128 yap.`);
          if (r < .3 || b < .3) return hata(`Çok sönük (kırmızı ${yuzde(r)}, mavi ${yuzde(b)}). İkisini de yaklaşık 128 yap.`);
          return Math.abs(r - b) <= .1 ? tamam('Soluk bir mor! Değerleri küçültünce renk aynı kalır, sadece parlaklık azalır.') : hata('Kırmızı ve mavi birbirine yakın olmalı.');
        },
      },
    ],
  },

  'pwm-parlaklik': {
    sesli: [
      { ses: 'Bu derste LED\'i nefes alır gibi yavaşça parlatıp söndüreceğiz. Bunun için PWM dediğimiz bir yöntem kullanacağız. Kart pini saniyede binlerce kez açıp kapatır. Açık kaldığı süre uzadıkça LED daha parlak görünür.', parca: 0 },
      { ses: 'Önce setup bölümüne D sıfır pinini çıkış yapan komutu yazalım.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\n', parca: 0 },
      { ses: 'Şimdi loop bölümünü açıyoruz. Parlaklığı yavaş yavaş artırmak için bir sayaç gerekiyor.', yaz: 'void loop() {\n' },
      { ses: 'Bu satır bir for döngüsü. I adında bir sayaç sıfırdan başlıyor ve iki yüz elli beşe kadar, beşer beşer artıyor. Yani her turda biraz daha büyük bir sayı elde ediyoruz.', yaz: '  for (int i = 0; i <= 255; i += 5) {\n' },
      { ses: 'Her turda LED\'in parlaklığına sayacın değerini yazıyoruz. Önce sıfır, sonra beş, sonra on. LED adım adım parlıyor.', yaz: '    analogWrite(D0, i);\n', parca: 0 },
      { ses: 'Her adımdan sonra yirmi milisaniye bekliyoruz. Beklemezsek elli iki adım göz açıp kapayana kadar biter ve parlamayı göremeyiz.', yaz: '    delay(20);\n  }\n' },
      { ses: 'LED tam parlak oldu. Şimdi ikinci döngüyle tersini yapacağız. Bu sefer sayaç iki yüz elli beşten başlayıp sıfıra kadar beşer beşer azalıyor.', yaz: '  for (int i = 255; i >= 0; i -= 5) {\n' },
      { ses: 'Aynı iki satırı yine yazıyoruz: parlaklığa sayacın değeri, ardından küçük bir bekleme. Sonra loop bölümünü kapatıyoruz.', yaz: '    analogWrite(D0, i);\n    delay(20);\n  }\n}\n', parca: 0 },
      { ses: 'Haydi çalıştıralım. LED yavaşça parlıyor, sonra yavaşça sönüyor. Tıpkı nefes almak gibi!', calistir: true, parca: 0 },
      { ses: 'Güzel! Şimdi Görevler sekmesine geç. Bekleme süresini, tepe parlaklığı ve adım büyüklüğünü değiştirerek LED\'in davranışını kendi istediğin gibi ayarla.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Hızlı nefes',
        metin: 'LED yavaş nefes alıyor. İşaretli <b>bekleme sürelerini</b> küçülterek (her biri <b>2 ile 10 milisaniye</b> arası) çok daha hızlı parlayıp sönmesini sağla.',
        kod: PWM_ASAMA(255, 5, 20), degistir: [{ ara: 'delay(20)' }], sure: 4500,
        ipucu: 'İki delay satırında da 20 yazıyor. 5 gibi küçük bir sayı yaz.',
        cozum: PWM_ASAMA(255, 5, 5),
        kontrol(sim) {
          const t = sim.olaylar.filter(o => o.pin === 'D0').map(o => o.t);
          if (t.length < 60) return hata('LED yeterince adım atmadı.');
          const m = medyan(t.slice(1).map((x, i) => x - t[i]));
          if (m > 10) return hata(`Adımlar arası ~${Math.round(m)} ms, hâlâ yavaş. Bekleme süresini 10 ms veya altına indir.`);
          if (m < 2) return hata('Bekleme çok kısa, parlayıp sönme göz açıp kapayana kadar biter. En az 2 ms bekle.');
          return tamam('Hızlı nefes! Bekleme süresini kısaltınca animasyon hızlandı.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Loş nefes',
        metin: 'LED şu an tam parlaklığa kadar çıkıyor. İşaretli sayıları değiştir: LED en fazla <b>yarım parlaklığa</b> (yaklaşık <b>128</b>) çıksın, sonra tekrar sönsün.',
        kod: PWM_ASAMA(255, 5, 20), degistir: [{ ara: 'i <= 255' }, { ara: 'int i = 255' }], sure: 4500,
        ipucu: 'İlk döngünün üst sınırını (i <= 255) ve ikinci döngünün başlangıcını (int i = 255) 128 yap.',
        cozum: PWM_ASAMA(128, 5, 20),
        kontrol(sim) {
          const v = sim.olaylar.filter(o => o.pin === 'D0').map(o => o.deger);
          if (!v.length) return hata('D0 pinine hiç PWM yazılmadı.');
          const mx = Math.max(...v);
          if (mx > .6) return hata(`LED en fazla ${yuzde(mx)} parlaklığa çıkıyor, çok yüksek. Hem parlama hem sönme döngüsünde 255 yerine 128 yaz.`);
          if (mx < .4) return hata(`LED en fazla ${yuzde(mx)} parlaklığa çıkıyor, çok düşük. Tepe değer 128 civarı olmalı.`);
          if (enUzunKosu(v, 1) < 15 || enUzunKosu(v, -1) < 15) return hata('LED hem yumuşakça parlamalı hem yumuşakça sönmeli. İki döngüde de aynı tepe değeri kullan.');
          return tamam('Loş bir nefes! Tepe parlaklığı yarıya indirdin.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Hızlı sönen LED',
        metin: 'LED parlarken yumuşak, sönerken <b>daha hızlı</b> olsun. Sönme döngüsündeki <b>adım büyüklüğünü</b> (<code>i -= 5</code>) 5\'ten <b>15</b>\'e çıkar. Parlama döngüsü aynı kalsın.',
        kod: PWM_ASAMA(255, 5, 20), degistir: [{ ara: 'i -= 5' }], sure: 4500,
        ipucu: 'Sönme döngüsünün sonundaki i -= 5 ifadesinde 5 yerine 15 yaz.',
        cozum: PWM_ASAMA(255, 15, 20),
        kontrol(sim) {
          const v = sim.olaylar.filter(o => o.pin === 'D0').map(o => o.deger);
          if (!v.length) return hata('D0 pinine hiç PWM yazılmadı.');
          const yukari = enUzunKosu(v, 1), asagi = enUzunKosu(v, -1);
          if (yukari < 45) return hata('Parlama yumuşak kalmalı: ilk döngüye (i += 5) dokunma.');
          if (asagi > 25) return hata('Sönme hâlâ yavaş. Sönme döngüsünde i -= 15 yaz.');
          if (asagi < 8) return hata('Adım çok büyük, sönme yumuşak görünmüyor. 15 civarı bir değer kullan.');
          return tamam('Parlayış yumuşak, sönüş hızlı. Adım büyüklüğü hızı belirliyor!');
        },
      },
    ],
  },

  'potansiyometre': {
    sesli: [
      { ses: 'Bu derste bir potansiyometre ile LED\'in parlaklığını ayarlayacağız. Potansiyometre, çevirdikçe değişen bir düğmedir. Radyodaki ses düğmesi gibi düşünebilirsin.', parca: 0 },
      { ses: 'Önce setup bölümü. Pot kartın A sıfır girişine bağlı, ona bir ayar gerekmez. Sadece LED\'in bağlı olduğu D sıfır pinini çıkış yapıyoruz.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Şimdi loop bölümü. Pot her an çevrilebilir, o yüzden kart sürekli bakmalı.', yaz: 'void loop() {\n' },
      { ses: 'analogRead komutu potun konumunu bir sayı olarak okur. Kartın okuyucusu on iki bit olduğu için sayı sıfırdan dört bin doksan beşe kadar gider. Tam sol sıfır, tam sağ dört bin doksan beş. Bu sayıyı deger adlı bir kutuda saklıyoruz.', yaz: '  int deger = analogRead(A0);\n', parca: 0 },
      { ses: 'Ama bir sorunumuz var. LED sıfırdan iki yüz elli beşe kadar anlıyor, pot ise dört bin doksan beşe kadar gidiyor. Sayıyı küçültmemiz gerek.', },
      { ses: 'map komutu tam bunu yapar. Bir sayıyı bir aralıktan başka bir aralığa çevirir. Burada sıfırdan dört bin doksan beşe olan aralığı, sıfırdan iki yüz elli beşe çeviriyoruz ve LED\'e yazıyoruz. Potun ortası, yaklaşık yarım parlaklık olur.', yaz: '  analogWrite(D0, map(deger, 0, 4095, 0, 255));\n', parca: 1 },
      { ses: 'Sonuna on milisaniye bekleme koyuyoruz ki kart çok hızlı koşup yorulmasın. Sonra loop bölümünü kapatıyoruz.', yaz: '  delay(10);\n}\n' },
      { ses: 'Çalıştıralım! Şimdi potun topuzunu fareyle çevir. Bak, LED potla birlikte parlıyor ve sönüyor.', calistir: true, parca: 0 },
      { ses: 'Harika, kendi ışık ayarlayıcını yaptın! Görevler sekmesinde kodun bazı sayılarını değiştirerek ayarlayıcıyı kendi isteğine göre değiştireceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Eski alışkanlık: bin yirmi üç',
        metin: 'Bu programı eski bir Arduino kartına göre yazmışlar: orada pot en çok <b>1023</b> verir. Bizim kartta ise <b>4095</b> verir. İşaretli sayıyı düzelt ki LED potun tüm aralığında doğru parlasın.',
        kod: POT_PROG(0, 1023, 0, 255), degistir: [{ ara: '1023' }], sure: 3500, girdi: orn('A0', [0, 1024, 2048, 4095]),
        ipucu: 'Bu kartta analogRead 0 ile 4095 arası okur. map komutunun ikinci aralığının üst sınırı da bu olmalı.',
        cozum: POT_PROG(0, 4095, 0, 255),
        kontrol: sim => parlaklikDenetle(sim, [0, 1024, 2048, 4095], [0, .25, .5, 1], .08, 'Artık pot tüm aralıkta doğru çalışıyor!'),
      },
      {
        tip: 'duzenle', baslik: 'Üst parlaklığı sınırla',
        metin: 'LED potun sonunda çok parlak oluyor. Göz yormasın diye en parlak değeri <b>255 yerine 100</b> yap. Pot tam sağdayken LED yaklaşık yüzde 40 parlaklıkta olsun.',
        kod: POT_PROG(0, 4095, 0, 255), degistir: [{ ara: '0, 255' }], sure: 3500, girdi: orn('A0', [0, 2048, 4095]),
        ipucu: 'map komutundaki son sayı, LED\'e yazılacak en büyük değerdir.',
        cozum: POT_PROG(0, 4095, 0, 100),
        kontrol(sim) {
          const o = ornekler(sim).map(x => x[0]);
          if (o.length < 3) return hata('Program çok erken bitti. Her şey loop içinde kalmalı.');
          if (o[2] > .47) return hata(`Pot tam sağdayken LED ${yuzde(o[2])} parlıyor, çok yüksek. map komutunun son sayısını 100 yap.`);
          if (o[2] < .33) return hata(`Pot tam sağdayken LED ${yuzde(o[2])} parlıyor, fazla sönük. Son sayı 100 civarı olmalı.`);
          if (o[0] > .05) return hata('Pot tam soldayken LED sönük olmalı. Baştaki 0 değerine dokunma.');
          return Math.abs(o[1] - o[2] / 2) < .08 ? tamam('Parlaklık güvenle sınırlandı. Pot yine yumuşakça çalışıyor.') : hata('Pot ortadayken parlaklık, tam sağdakinin yaklaşık yarısı olmalı.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Ters çalışan pot',
        metin: 'Pot sağa gidince LED sönsün, sola gidince en parlak yansın. <code>map</code> komutundaki <b>hedef aralığın iki sayısını</b> yer değiştir.',
        kod: POT_PROG(0, 4095, 0, 255), degistir: [{ ara: '0, 255' }], sure: 3500, girdi: orn('A0', [0, 2048, 4095]),
        ipucu: 'map komutunun son iki sayısı hedef aralık. Küçük sayıyı sona, büyük sayıyı başa yaz: 255, 0.',
        cozum: POT_PROG(0, 4095, 255, 0),
        kontrol: sim => parlaklikDenetle(sim, [0, 2048, 4095], [1, .5, 0], .1, 'Ters çalışan pot hazır! Sol tam parlak, sağ sönük.'),
      },
    ],
  },

  'ldr-gece-lambasi': {
    sesli: [
      { ses: 'Bu derste bir gece lambası yapacağız. Ortam kararınca kendiliğinden yanan, ışık gelince sönen bir lamba. Bunun için ışık sensörü olan LDR kullanacağız.', parca: 0 },
      { ses: 'LDR, ışık çoksa büyük, karanlıkta küçük bir sayı verir. Sayı sıfırdan dört bin doksan beşe kadar değişir. Önce setup bölümünde LED\'in pinini çıkış yapalım.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Loop bölümünü açıyoruz. Kart sürekli ortamın ne kadar aydınlık olduğuna bakacak.', yaz: 'void loop() {\n' },
      { ses: 'LDR kartın A sıfır girişine bağlı. Okuduğumuz sayıyı isik adlı bir kutuda saklıyoruz.', yaz: '  int isik = analogRead(A0);\n', parca: 0 },
      { ses: 'Şimdi karar verme zamanı. If, yani eğer komutu bir soru sorar. Işık sayısı bin\'den küçükse, ortam karanlıktır. Bin sayısına eşik değeri diyoruz. Bu sayı karanlıkla aydınlığı ayıran sınırdır.', yaz: '  if (isik < 1000) {\n' },
      { ses: 'Ortam karanlıksa LED\'i yakıyoruz.', yaz: '    digitalWrite(D0, HIGH);\n', parca: 1 },
      { ses: 'Else, yani değilse bölümünde ise ortam aydınlık demektir. O zaman LED\'i söndürüyoruz.', yaz: '  } else {\n    digitalWrite(D0, LOW);\n  }\n', parca: 1 },
      { ses: 'Yine kısa bir bekleme koyup loop bölümünü kapatıyoruz.', yaz: '  delay(10);\n}\n' },
      { ses: 'Çalıştıralım. Önce ortam aydınlık, LED sönük. Şimdi ortam kararıyor. LED yandı! Işık geri gelince yine söndü.', calistir: true, parca: 0 },
      { ses: 'Gece lamban hazır! Görevler sekmesine geçip eşik değerini ve LED davranışını değiştirerek lambayı kendi odana göre ayarla.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Daha erken yansın',
        metin: 'Lamba şu an ancak çok karanlıkta yanıyor. Akşam loşluğunda da yansın: <b>eşik değerini</b> 1000\'den <b>2500</b>\'e çıkar.',
        kod: LDR_PROG(1000, 255, 0), degistir: [{ ara: '1000' }], sure: 4000, girdi: orn('A0', [3500, 2000, 300]),
        ipucu: 'if içindeki 1000 sayısını değiştir. Okuma 2500\'ün altına düşünce lamba yansın.',
        cozum: LDR_PROG(2500, 255, 0),
        kontrol: sim => ikiliDenetle(sim, [3500, 2000, 300], [0, 1, 1], 'LDR', 'Loşlukta da yanan bir gece lambası!'),
      },
      {
        tip: 'duzenle', baslik: 'Aydınlık göstergesi',
        metin: 'Bu program karanlıkta yanıyor. Tersini istiyoruz: ortam <b>aydınlıkken</b> LED yansın, karanlıkta sönsün. Karşılaştırma işaretini değiştir.',
        kod: LDR_PROG(1000, 255, 0), degistir: [{ ara: '<' }], sure: 4000, girdi: orn('A0', [3000, 300, 3000]),
        ipucu: 'Küçüktür (<) işareti yerine büyüktür (>) işaretini kullan.',
        cozum: LDR_PROG(1000, 255, 0).replace('isik < 1000', 'isik > 1000'),
        kontrol: sim => ikiliDenetle(sim, [3000, 300, 3000], [1, 0, 1], 'LDR', 'Işıkta yanan, karanlıkta sönen bir gösterge yaptın!'),
      },
      {
        tip: 'duzenle', baslik: 'Loş gece lambası',
        metin: 'Gece lambası yüzünü yakmasın! Karanlıkta LED tam parlak değil, <b>loş</b> yansın (yaklaşık <b>80</b>). Ayrıca eşik değerini <b>2000</b> yap ki akşam loşluğunda da devreye girsin.',
        kod: LDR_PROG(1000, 255, 0), degistir: [{ ara: '1000' }, { ara: 'analogWrite(D0, 255)' }], sure: 4000, girdi: orn('A0', [3500, 1700, 300]),
        ipucu: 'İki değişiklik var: if içindeki eşiği 2000 yap, yanma durumundaki analogWrite satırında 255 yerine 80 yaz.',
        cozum: LDR_PROG(2000, 80, 0),
        kontrol(sim) {
          const o = ornekler(sim).map(x => x[0]);
          if (o.length < 3) return hata('Program çok erken bitti. Her şey loop içinde kalmalı.');
          if (o[0] > .05) return hata('Ortam aydınlıkken (LDR 3500) LED sönük olmalı.');
          if (o[1] < .02) return hata('LDR 1700 iken LED yanmalıydı. Eşik değeri 2000 olmalı.');
          if (o[2] < .02) return hata('Karanlıkta LED yanmalıydı.');
          if (o[1] > .45 || o[2] > .45) return hata(`LED çok parlak (${yuzde(Math.max(o[1], o[2]))}). Yanarken analogWrite değeri 80 civarı olmalı.`);
          return o[1] > .15 && o[2] > .15 ? tamam('Loş ve rahat bir gece lambası!') : hata('LED çok sönük. analogWrite değerini 80 civarı yap.');
        },
      },
    ],
  },

  'sicaklik-gostergesi': {
    sesli: [
      { ses: 'Bu derste bir sıcaklık alarmı yapacağız. Ortam çok ısınınca kırmızı bir uyarı lambası yanacak.', parca: 0 },
      { ses: 'Sıcaklık sensörü kartın A bir girişine bağlı. Alarm lambası ise D sıfır pininde. Alarm lambasını çıkış yapıyoruz.', yaz: 'void setup() {\n  pinMode(D0, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Şimdi loop bölümünü açıyoruz. Kart sıcaklığı sürekli kontrol edecek.', yaz: 'void loop() {\n' },
      { ses: 'Sıcaklık arttıkça analogRead sayısı da büyür. Bu sayı sıfırdan dört bin doksan beşe kadar gidebilir. Okuduğumuz değeri sicaklik adlı bir kutuda saklıyoruz.', yaz: '  int sicaklik = analogRead(A1);\n', parca: 0 },
      { ses: 'Yaklaşık iki bin beş yüzün üstünü çok sıcak sayacağız. Bu sayıya eşik değeri deniyor. Sıcaklık bu eşiği geçerse alarm çalışmalı.', yaz: '  if (sicaklik > 2500) {\n' },
      { ses: 'Çok sıcaksa alarm lambasını yakıyoruz.', yaz: '    digitalWrite(D0, HIGH);\n', parca: 1 },
      { ses: 'Değilse, yani sıcaklık normalse, lambayı söndürüyoruz.', yaz: '  } else {\n    digitalWrite(D0, LOW);\n  }\n', parca: 1 },
      { ses: 'Kısa bir bekleme koyup loop bölümünü kapatıyoruz.', yaz: '  delay(10);\n}\n' },
      { ses: 'Çalıştıralım. Sıcaklık düşükken lamba sönük. Sıcaklık yükseldi, alarm yandı! Tekrar soğudu, alarm sustu.', calistir: true, parca: 0 },
      { ses: 'Harika, bir uyarı sistemi yaptın! Görevler sekmesinde eşik değerini, pini ve karşılaştırmayı değiştirerek alarmı kendi isteğine göre ayarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Daha hassas alarm',
        metin: 'Alarm ancak çok sıcakta çalıyor. Biraz ılıkta da çalsın: <b>eşik değerini</b> 2500\'den <b>1800</b>\'e düşür.',
        kod: SICAKLIK_PROG('D0', 'sicaklik > 2500'), degistir: [{ ara: '2500' }], sure: 4500, girdi: orn('A1', [1000, 2200, 3300, 1200]),
        ipucu: 'if içindeki 2500 sayısını değiştir. Eşik küçülünce alarm daha erken çalar.',
        cozum: SICAKLIK_PROG('D0', 'sicaklik > 1800'),
        kontrol: sim => ikiliDenetle(sim, [1000, 2200, 3300, 1200], [0, 1, 1, 0], 'A1', 'Alarm artık daha hassas!'),
      },
      {
        tip: 'duzenle', baslik: 'Yanlış pin',
        metin: 'Bu programda alarm <b>D1</b> pinine bağlanmış, ama sahnedeki kırmızı alarm LED\'i <b>D0</b> pininde. Alarm çalışsın diye <b>D1</b> yazan her yeri <b>D0</b> yap.',
        kod: SICAKLIK_PROG('D1', 'sicaklik > 2500'), degistir: [{ ara: 'D1' }], sure: 4500, girdi: orn('A1', [1200, 3300, 1500]),
        ipucu: 'D1, kodda üç yerde geçiyor: pinMode içinde ve iki digitalWrite satırında. Hepsini D0 yap.',
        cozum: SICAKLIK_PROG('D0', 'sicaklik > 2500'),
        kontrol: sim => ikiliDenetle(sim, [1200, 3300, 1500], [0, 1, 0], 'A1', 'Doğru pin, doğru alarm! Pin numarası yanlışsa program çalışır ama LED tepki vermez.'),
      },
      {
        tip: 'duzenle', baslik: 'Soğuk alarmı',
        metin: 'Bu kez alarm <b>soğuktan</b> korusun, buzlanma uyarısı gibi. Sensör sayısı <b>800\'ün altına</b> düşünce LED yansın, daha sıcakken sönük kalsın. Karşılaştırma işaretini ve eşiği değiştir.',
        kod: SICAKLIK_PROG('D0', 'sicaklik > 2500'), degistir: [{ ara: '> 2500' }], sure: 4500, girdi: orn('A1', [300, 1500, 3000, 600]),
        ipucu: 'Büyüktür (>) yerine küçüktür (<) kullan ve 2500 yerine 800 yaz.',
        cozum: SICAKLIK_PROG('D0', 'sicaklik < 800'),
        kontrol: sim => ikiliDenetle(sim, [300, 1500, 3000, 600], [1, 0, 0, 1], 'A1', 'Soğuk alarmı hazır! Küçüktür işareti ile ters çalışan bir alarm yaptın.'),
      },
    ],
  },

  'led-cubugu': {
    sesli: [
      { ses: 'Bu derste sekiz LED\'lik bir çubuk göstergesi yapacağız. Potu çevirdikçe yanan LED sayısı değişecek, tıpkı müzik çalardaki ses seviyesi göstergesi gibi.', parca: 0 },
      { ses: 'Çubuk, D sıfırdan D yediye kadar sekiz pine bağlı. Sekiz pini tek tek yazmak yerine bir for döngüsü kullanacağız. Önce setup bölümünü açalım.', yaz: 'void setup() {\n', parca: 0 },
      { ses: 'Sayaç sıfırdan yediye kadar sayıyor. D sıfır artı sayaç, sırayla D sıfır, D bir, D iki diye gidiyor. Böylece her pini çıkış yapıyoruz.', yaz: '  for (int i = 0; i < 8; i++) {\n    pinMode(D0 + i, OUTPUT);\n  }\n}\n\n', parca: 0 },
      { ses: 'Şimdi loop bölümü. Pot her an çevrilebilir, o yüzden kart sürekli okuyacak.', yaz: 'void loop() {\n' },
      { ses: 'Pot sıfırdan dört bin doksan beşe kadar bir sayı veriyor. Ama çubukta sadece sekiz LED var. map komutuyla sayıyı sıfırdan sekize çeviriyoruz. Bunu seviye adlı bir kutuda saklıyoruz. Seviye üç ise üç LED yanacak.', yaz: '  int seviye = map(analogRead(A0), 0, 4095, 0, 8);\n', parca: 1 },
      { ses: 'Şimdi her LED için ayrı karar vereceğiz. Yine bir for döngüsüyle sekiz LED\'in hepsini geziyoruz.', yaz: '  for (int i = 0; i < 8; i++) {\n' },
      { ses: 'Burada küçük bir hile var. Sayaç seviyeden küçükse bu doğru olur ve LED yanar. Değilse yanlış olur ve LED söner. Mesela seviye üç ise, sıfır, bir ve iki numaralı LED\'ler yanar.', yaz: '    digitalWrite(D0 + i, i < seviye);\n  }\n', parca: 0 },
      { ses: 'Son olarak kısa bir bekleme koyup loop bölümünü kapatıyoruz.', yaz: '  delay(10);\n}\n' },
      { ses: 'Çalıştıralım. Potu çevir ve çubuğun dolup boşalmasını izle!', calistir: true, parca: 0 },
      { ses: 'Süper! Artık kendi seviye göstergen var. Görevler sekmesine geç; eşleştirmeyi ve karşılaştırmayı değiştirerek çubuğu farklı şekillerde çalıştır.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Hep en az bir LED',
        metin: 'Pot tam solda iken bile çubuğun <b>ilk LED\'i yansın</b>, her seviyede bir LED fazla yanık olsun. Karşılaştırma işaretini değiştir.',
        kod: CUBUK_PROG(0, 4095, 0, 8), degistir: [{ ara: 'i < seviye' }], sure: 4500, girdi: orn('A0', [0, 2048, 4095, 1024], D8),
        ipucu: 'Küçüktür (<) yerine küçük eşittir (<=) kullan.',
        cozum: CUBUK_PROG(0, 4095, 0, 8, 'i <= seviye'),
        kontrol: sim => cubukDenetle(sim, [0, 2048, 4095, 1024], [1, 5, 8, 3], 'Her seviyede bir LED fazla yanıyor!'),
      },
      {
        tip: 'duzenle', baslik: 'Dört LED\'lik gösterge',
        metin: 'Çubuğun sadece <b>ilk 4 LED\'i</b> kullanılsın: pot tam sağdayken en fazla 4 LED yansın. <code>map</code> komutunun son sayısını değiştir.',
        kod: CUBUK_PROG(0, 4095, 0, 8), degistir: [{ ara: '0, 8)' }], sure: 4500, girdi: orn('A0', [0, 2048, 4095, 1024], D8),
        ipucu: 'map komutunun son sayısı, en çok kaç LED yanacağını belirler. 8 yerine 4 yaz.',
        cozum: CUBUK_PROG(0, 4095, 0, 4),
        kontrol: sim => cubukDenetle(sim, [0, 2048, 4095, 1024], [0, 2, 4, 1], 'Dört LED\'lik gösterge hazır!'),
      },
      {
        tip: 'duzenle', baslik: 'Duyarlı pot',
        metin: 'Çubuk potun tam yarı yolunda <b>tamamen dolsun</b>. Yani pot <b>2048</b> iken 8 LED yanmalı. Pot okumasının üst sınırını <code>map</code> komutunda düzelt.',
        kod: CUBUK_PROG(0, 4095, 0, 8), degistir: [{ ara: '0, 4095' }], sure: 4500, girdi: orn('A0', [0, 1024, 2048, 4095], D8),
        ipucu: 'map\'in ilk aralığı pot okumasıdır. 4095 yerine 2048 yaz; daha küçük bir sayıya ulaşınca çubuk dolar.',
        cozum: CUBUK_PROG(0, 2048, 0, 8),
        kontrol: sim => cubukDenetle(sim, [0, 1024, 2048, 4095], [0, 4, 8, 8], 'Duyarlı pot! Çubuk yarı yolda doldu.'),
      },
    ],
  },
};
