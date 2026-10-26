// Modül 1 (ek) içerik: 'iki-led' dersi için sesli anlatım + "kodu değiştir" görevleri.
// Şema için m1-sesli.js dosyasına bak.
const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });
// Bir pinin gerçek değişimleri (yazılan aynı değerler sayılmaz); başlangıç değeri 0
const degisim = (sim, pin) => {
  const g = []; let onceki = 0;
  for (const o of sim.olaylar) if (o.pin === pin && o.deger !== onceki) { onceki = o.deger; g.push(o); }
  return g;
};
// Pin her yanışında ne kadar yanık kaldı (ms)
const yanikSureler = (sim, pin) => {
  const g = degisim(sim, pin), s = [];
  for (let i = 0; i < g.length - 1; i++) if (g[i].deger === 1) s.push(g[i + 1].t - g[i].t);
  return s;
};
const cakisma = sim => {
  let d0 = 0, d1 = 0;
  for (const o of [...sim.olaylar].sort((x, y) => x.t - y.t)) {
    if (o.pin === 'D0') d0 = o.deger; if (o.pin === 'D1') d1 = o.deger;
    if (d0 && d1) return true;
  }
  return false;
};
const ort = a => a.reduce((x, y) => x + y, 0) / a.length;

const TEMEL = (bekle1, bekle2) => `#define KIRMIZI D0
#define YESIL D1

void setup() {
  pinMode(KIRMIZI, OUTPUT);
  pinMode(YESIL, OUTPUT);
}

void loop() {
  digitalWrite(YESIL, LOW);
  digitalWrite(KIRMIZI, HIGH);
  delay(${bekle1});
  digitalWrite(KIRMIZI, LOW);
  digitalWrite(YESIL, HIGH);
  delay(${bekle2});
}
`;

export default {
  'iki-led': {
    sesli: [
      { ses: 'Bu derste iki LED\'i nöbetleşe yakacağız, tıpkı bir trafik ışığı gibi. Kırmızı LED D0 pinine, yeşil LED D1 pinine bağlı. Önce bu pinlere anlamlı isimler verelim.', yaz: '#define KIRMIZI D0\n#define YESIL D1\n\n', parca: 0 },
      { ses: 'Define komutu, bir sayıya ya da pine kendi adımızı vermemizi sağlar. Artık D sıfır yerine kırmızı, D bir yerine yeşil diyebiliriz. Kod okuması çok kolaylaşır.' },
      { ses: 'Şimdi setup bölümü. İki LED\'e de enerjiyi kart verecek. Bu yüzden iki pini de çıkış yapıyoruz.', yaz: 'void setup() {\n  pinMode(KIRMIZI, OUTPUT);\n  pinMode(YESIL, OUTPUT);\n}\n\n', parca: 1 },
      { ses: 'Şimdi loop bölümü. Burada çok önemli bir sıra kuralı var. Önce yanan LED\'i söndüreceğiz, sonra diğerini yakacağız. Böylece iki LED asla aynı anda yanmaz.', yaz: 'void loop() {\n  digitalWrite(YESIL, LOW);\n', parca: 1 },
      { ses: 'Yeşil söndü. Şimdi kırmızıyı yakıyoruz. HIGH, üç virgül üç volt demektir.', yaz: '  digitalWrite(KIRMIZI, HIGH);\n', parca: 0 },
      { ses: 'Kırmızı LED\'in biraz yanık kalması için dört yüz milisaniye bekliyoruz. Bu, yaklaşık yarım saniyenin altında bir süredir.', yaz: '  delay(400);\n' },
      { ses: 'Roller değişiyor. Kırmızıyı söndürüyoruz, ardından yeşili yakıyoruz. Yine önce söndürmeyi, sonra yakmayı unutmuyoruz.', yaz: '  digitalWrite(KIRMIZI, LOW);\n  digitalWrite(YESIL, HIGH);\n', parca: 1 },
      { ses: 'Yeşil de dört yüz milisaniye yansın. Loop bitince baştan başlar ve ışıklar sonsuza kadar sırayla yanar.', yaz: '  delay(400);\n}\n' },
      { ses: 'Haydi çalıştıralım! Bak, kırmızı yanarken yeşil sönük, yeşil yanarken kırmızı sönük.', calistir: true, parca: 1 },
      { ses: 'Harika! Şimdi Görevler sekmesine geç. Orada kodun belli yerlerini değiştirerek ışıkların ritmini ve davranışını ayarlayacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Hızlı nöbet',
        metin: 'Işıklar şu an dört yüz milisaniyede bir değişiyor. İşaretli <b>iki bekleme süresini</b> de değiştirip nöbeti <b>çok hızlandır</b> (her biri 50 ile 150 milisaniye arası).',
        kod: TEMEL(400, 400),
        cozum: TEMEL(100, 100),
        degistir: [{ ara: 'delay(400)' }],
        ipucu: 'Küçük süre, hızlı değişim demektir. İki yerde de 100 gibi bir sayı yaz.',
        kontrol(sim) {
          const g = degisim(sim, 'D0');
          if (g.length < 8) return hata('Işıklar yeterince hızlı değişmiyor. Bekleme sürelerini küçült.');
          const ara = g.slice(1).map((o, i) => o.t - g[i].t);
          if (cakisma(sim)) return hata('İki LED aynı anda yandı. Sadece sayıları değiştir, sıraya dokunma.');
          return ara.every(a => a >= 40 && a <= 160) ? tamam('Çok hızlı bir nöbet, harika!') : hata(`Bekleme süreleri 50-150 ms arasında olmalı (şu an ~${Math.round(ort(ara))} ms).`);
        },
      },
      {
        tip: 'duzenle', baslik: 'Kırmızı kısa, yeşil uzun',
        metin: 'Bir trafik ışığı düşün: <b>kırmızı yaklaşık 200 ms</b>, <b>yeşil yaklaşık 800 ms</b> yansın. Hangi bekleme hangi LED\'e ait? İşaretli yerleri ona göre değiştir.',
        kod: TEMEL(400, 400),
        cozum: TEMEL(200, 800),
        degistir: [{ ara: 'delay(400)' }],
        ipucu: 'Birinci delay kırmızı yanıkken, ikinci delay yeşil yanıkken bekler.',
        kontrol(sim) {
          const k = yanikSureler(sim, 'D0'), y = yanikSureler(sim, 'D1');
          if (k.length < 2 || y.length < 2) return hata('İki LED de birkaç kez yanmalı.');
          const mk = ort(k), my = ort(y);
          if (mk < 130 || mk > 280) return hata(`Kırmızı ~${Math.round(mk)} ms yanıyor, yaklaşık 200 olmalı.`);
          return my >= 650 && my <= 950 ? tamam('Kırmızı kısa, yeşil uzun: tam istediğimiz gibi!') : hata(`Yeşil ~${Math.round(my)} ms yanıyor, yaklaşık 800 olmalı.`);
        },
      },
      {
        tip: 'duzenle', baslik: 'Hatayı bul',
        metin: 'Bu programda bir hata var: bazen <b>iki LED aynı anda yanıyor</b>. İşaretli yerde kırmızı LED söndürülmesi gerekirken yanık bırakılmış. Doğru kelimeyi yazarak hatayı düzelt.',
        kod: `#define KIRMIZI D0
#define YESIL D1

void setup() {
  pinMode(KIRMIZI, OUTPUT);
  pinMode(YESIL, OUTPUT);
}

void loop() {
  digitalWrite(YESIL, LOW);
  digitalWrite(KIRMIZI, HIGH);
  delay(400);
  digitalWrite(KIRMIZI, HIGH);  // sönmeli
  digitalWrite(YESIL, HIGH);
  delay(400);
}
`,
        cozum: TEMEL(400, 400),
        degistir: [{ ara: 'digitalWrite(KIRMIZI, HIGH);  // sönmeli' }],
        ipucu: 'Sönük için sıfır volt gerekir. HIGH yerine hangi kelime kullanılır?',
        kontrol(sim) {
          if (cakisma(sim)) return hata('İki LED hâlâ aynı anda yanıyor. Kırmızıyı söndüren satırda LOW kullan.');
          const a = degisim(sim, 'D0'), b = degisim(sim, 'D1');
          if (a.length < 3 || b.length < 3) return hata('İki LED de sırayla yanıp sönmeli.');
          return tamam('Hata düzeldi, LED\'ler artık sırayla yanıyor!');
        },
      },
    ],
  },
};
