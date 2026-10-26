// Ders tanımı: anlatım + sahne + başlangıç blokları + kontrol.
// kontrol(sim) -> { ok: bool, mesaj: string }, program çalışıp bittikten (veya zaman aşımından) sonra çağrılır.

const gecisler = (sim, pin) => sim.olaylar.filter(o => o.pin === pin);

// ── GÖREVLER sekmesi içeriği (kod görevleri + sorular, karışık sıra) ──
const araliklar = g => g.slice(1).map((o, i) => o.t - g[i].t);
const hepsi = (dizi, a, b) => dizi.every(x => x >= a && x <= b);
// D0/D1 durum parçaları: [{d0, d1, sure}] (son parça açık uçlu, sim.t'ye kadar sayılır)
function parcalar(sim) {
  const p = []; let d0 = 0, d1 = 0, bas = 0, cakisma = false;
  for (const o of sim.olaylar) {
    if (o.pin !== 'D0' && o.pin !== 'D1') continue;
    if (o.t > bas) p.push({ d0, d1, sure: o.t - bas });
    bas = o.t;
    if (o.pin === 'D0') d0 = o.deger ? 1 : 0; else d1 = o.deger ? 1 : 0;
    if (d0 && d1) cakisma = true;
  }
  p.push({ d0, d1, sure: Math.max(0, sim.t - bas), son: true });
  return { p, cakisma };
}

const gorev11 = [
  {
    tip: 'kod', baslik: 'Bir kez yan ve sön',
    metin: `<span class="pin-etiket">D0</span> LED'i <b>yak</b>, yarım saniye (<b>500 ms</b>) <b>bekle</b>, sonra <b>söndür</b>. LED yalnızca <b>bir kez</b> yanıp sönsün, program orada bitsin. Sürekli tekrarla bloğu kullanma!`,
    ipucu: 'Üç blok yeterli: YÜKSEK yap, bekle, DÜŞÜK yap. Bu sefer döngüye gerek yok.',
    sure: 3000,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      if (!g.length) return { ok: false, mesaj: 'LED hiç yanmadı. Önce D0 pinini YÜKSEK yap.' };
      if (g[0].deger !== 1) return { ok: false, mesaj: 'İlk olarak LED yanmalı (D0 YÜKSEK).' };
      if (g.length === 1) return { ok: false, mesaj: 'LED yandı ama sönmedi. Beklemeden sonra D0 pinini DÜŞÜK yap.' };
      if (g.length > 2) return { ok: false, mesaj: 'LED birden fazla kez değişti. Sürekli tekrarla kullanma; yak, bekle, söndür yeterli.' };
      const s = g[1].t - g[0].t;
      if (s < 350 || s > 700) return { ok: false, mesaj: `LED ${s} ms yandı. Yaklaşık 500 ms yanmalı.` };
      return { ok: true, mesaj: 'Tam istediğimiz gibi: bir kez yandı ve söndü!' };
    },
  },
  {
    tip: 'soru', soru: `<code>digitalWrite(D0, HIGH);</code> komutu çalışınca ESP32-S3'ün <span class="pin-etiket">D0</span> pininde yaklaşık kaç volt olur?`,
    secenekler: ['0 V', '3,3 V', '5 V', '12 V'], dogru: 1,
    aciklama: 'ESP32-S3 pinleri 3,3 V ile çalışır: HIGH yaklaşık 3,3 V, LOW ise 0 V demektir.',
  },
  {
    tip: 'kod', baslik: 'Geç yansın',
    metin: `Program başlayınca LED <b>hemen yanmasın</b>: önce <b>300 ms bekle</b>, sonra <span class="pin-etiket">D0</span> LED'ini yak. LED yandıktan sonra <b>yanık kalsın</b>.`,
    ipucu: 'Bekleme bloğu LED bloğundan önce gelmeli. Komutlar yukarıdan aşağı çalışır, sıra önemli.',
    sure: 2000,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      if (!g.length) return { ok: false, mesaj: 'LED hiç yanmadı.' };
      if (g[0].t < 250) return { ok: false, mesaj: 'LED hemen yandı. Yakmadan önce 300 ms bekle.' };
      if (g[0].t > 450) return { ok: false, mesaj: `LED ${g[0].t} ms sonra yandı. Yaklaşık 300 ms beklemelisin.` };
      if (sim.pin.D0.deger !== 1 || g.length > 1) return { ok: false, mesaj: 'LED yandıktan sonra yanık kalmalı, tekrar sönmemeli.' };
      return { ok: true, mesaj: 'LED 300 ms sonra yandı ve yanık kaldı!' };
    },
  },
  {
    tip: 'soru', soru: `Bir Arduino programında <code>setup()</code> ve <code>loop()</code> arasındaki fark nedir?`,
    secenekler: ['İkisi de sonsuza kadar tekrar eder', 'setup() her turda, loop() yalnızca bir kez çalışır', 'setup() bir kez, loop() sürekli tekrar çalışır', 'loop() yalnızca düğmeye basılınca çalışır'], dogru: 2,
    aciklama: 'setup() kart açılınca bir kez çalışır (hazırlık için), loop() ise bitince başa dönerek sürekli çalışır.',
  },
  {
    tip: 'kod', baslik: 'Üç kez yanıp sön',
    metin: `<span class="pin-etiket">D0</span> LED'i <b>tam 3 kez</b> yanıp sönsün: her seferinde <b>200 ms yansın</b>, <b>200 ms sönsün</b>. Sonunda LED <b>sönük</b> kalsın. İstersen <b>say</b> döngüsü kullan.`,
    ipucu: '"i değerini 1\'den 3\'e say" bloğu içindekileri 3 kez tekrarlar. Sürekli tekrarla ise hiç bitmez.',
    sure: 3500,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      const yanma = g.filter(o => o.deger === 1).length;
      if (!yanma) return { ok: false, mesaj: 'LED hiç yanmadı.' };
      if (yanma < 3) return { ok: false, mesaj: `LED ${yanma} kez yandı, 3 kez yanmalı.` };
      if (yanma > 3) return { ok: false, mesaj: `LED ${yanma} kez yandı. Tam 3 kez yanıp durmalı; sürekli tekrarla yerine say döngüsü kullan.` };
      if (sim.pin.D0.deger !== 0) return { ok: false, mesaj: 'Son yanıştan sonra LED sönük kalmalı. D0 en sonda düşük olmalı.' };
      if (!hepsi(araliklar(g), 150, 260)) return { ok: false, mesaj: 'Yanma ve sönme süreleri yaklaşık 200 ms olmalı.' };
      return { ok: true, mesaj: 'LED tam 3 kez yanıp söndü!' };
    },
  },
  {
    tip: 'soru', soru: `Hangi komut <span class="pin-etiket">D0</span> pinine bağlı LED'i <b>yakar</b>?`,
    secenekler: ['<code>pinMode(D0, HIGH);</code>', '<code>delay(D0);</code>', '<code>digitalRead(D0, HIGH);</code>', '<code>digitalWrite(D0, HIGH);</code>'], dogru: 3,
    aciklama: 'Bir pine değer yazan komut digitalWrite()\'dır. pinMode() ise yalnızca pinin giriş mi çıkış mı olduğunu belirler.',
  },
  {
    tip: 'soru', soru: `<code>pinMode(D0, OUTPUT);</code> satırı ne işe yarar?`,
    secenekler: ['LED\'i yakar', 'D0 pinini çıkış yapar: karttan dışarıya gerilim verebilir', 'D0 pinini girdi yapar, sensör okur', 'Programı durdurur'], dogru: 1,
    aciklama: 'OUTPUT, pinin dışarıya sinyal vereceğini söyler. LED\'in yanması için ayrıca digitalWrite(HIGH) gerekir.',
  },
];

const gorev12 = [
  {
    tip: 'kod', baslik: 'Hızlı yanıp sönme',
    metin: `Bu sefer LED <b>hızlı</b> yanıp sönsün: <span class="pin-etiket">D0</span> <b>200 ms yansın</b>, <b>200 ms sönsün</b> ve bu sürekli tekrar etsin.`,
    ipucu: 'Bekle bloklarındaki 500 değerini değiştir. İki bekleme de aynı olmalı.',
    sure: 3000,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      if (g.length < 8) return { ok: false, mesaj: `LED sadece ${g.length} kez değişti. Sürekli tekrarla içinde yak-bekle-söndür-bekle yap.` };
      if (!hepsi(araliklar(g), 150, 260)) return { ok: false, mesaj: 'Hem yanma hem sönme süresi yaklaşık 200 ms olmalı. Bekle bloklarını kontrol et.' };
      return { ok: true, mesaj: 'LED hızlı hızlı yanıp sönüyor!' };
    },
  },
  {
    tip: 'soru', soru: `<code>delay(250);</code> komutu programı ne kadar bekletir?`,
    secenekler: ['250 saniye', '2,5 saniye', '0,25 saniye', '25 milisaniye'], dogru: 2,
    aciklama: 'delay() milisaniye cinsindendir. 1000 ms = 1 sn olduğundan 250 ms = çeyrek (0,25) saniyedir.',
  },
  {
    tip: 'kod', baslik: 'Nabız ritmi',
    metin: `LED kısa süre sönsün, uzun süre yansın: <span class="pin-etiket">D0</span> <b>800 ms yansın</b>, <b>200 ms sönsün</b>. Bu ritim sürekli tekrar etsin.`,
    ipucu: 'İki bekle bloğu artık farklı sayılar taşıyacak. Hangisi yanma, hangisi sönme süresi?',
    sure: 4200,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      if (g.length < 5) return { ok: false, mesaj: `LED sadece ${g.length} kez değişti. Döngü içinde yak, bekle, söndür, bekle yap.` };
      const yanik = [], sonuk = [];
      g.slice(0, -1).forEach((o, i) => (o.deger ? yanik : sonuk).push(g[i + 1].t - o.t));
      if (!hepsi(yanik, 700, 900)) return { ok: false, mesaj: 'LED yaklaşık 800 ms yanık kalmalı. Yaktıktan sonraki beklemeyi 800 yap.' };
      if (!hepsi(sonuk, 150, 260)) return { ok: false, mesaj: 'LED yaklaşık 200 ms sönük kalmalı. Söndürdükten sonraki beklemeyi 200 yap.' };
      return { ok: true, mesaj: 'Uzun yanan, kısa sönen bir ritim yakaladın!' };
    },
  },
  {
    tip: 'soru', soru: `LED yanıp sönerken, söndürme komutundan <b>sonraki</b> <code>delay()</code> satırını silersek ne olur?`,
    secenekler: ['LED hiç yanmaz', 'LED yanık kalır; sönük kaldığı an göz fark edemeyecek kadar kısadır', 'Kart hata verir ve durur', 'LED iki kat yavaş yanıp söner'], dogru: 1,
    aciklama: 'Söndürme ile bir sonraki yakma arasındaki süre çok kısa kalır; LED neredeyse hep yanıyormuş gibi görünür.',
  },
  {
    tip: 'kod', baslik: 'Gecikmeli başlangıç',
    metin: `Program başlayınca LED <b>1 saniye sönük</b> beklesin; <b>sonra</b> <span class="pin-etiket">D0</span> 500 ms yanıp 500 ms sönerek sürekli yanıp sönmeye başlasın.`,
    ipucu: 'Bir kez yapılacak şey (ilk bekleme) döngünün DIŞINDA, döngüden önce olmalı.',
    sure: 4200,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      if (!g.length) return { ok: false, mesaj: 'LED hiç yanmadı.' };
      if (g[0].t < 900) return { ok: false, mesaj: 'LED çok erken yandı. Döngüden önce 1000 ms bekle.' };
      if (g[0].t > 1200) return { ok: false, mesaj: `LED ${g[0].t} ms sonra yandı; yaklaşık 1000 ms olmalı.` };
      if (g.length < 5) return { ok: false, mesaj: 'İlk beklemeden sonra LED yanıp sönmeye devam etmeli (sürekli tekrarla).' };
      if (!hepsi(araliklar(g), 300, 700)) return { ok: false, mesaj: 'Başladıktan sonra yanma ve sönme süreleri yaklaşık 500 ms olmalı.' };
      return { ok: true, mesaj: 'Bir saniye bekledi, sonra yanıp sönmeye başladı!' };
    },
  },
  {
    tip: 'soru', soru: `LED'in bir kez yanıp sönmesi (500 ms yanık + 500 ms sönük) kaç saniye sürer?`,
    secenekler: ['0,5 saniye', '2 saniye', '5 saniye', '1 saniye'], dogru: 3,
    aciklama: '500 ms + 500 ms = 1000 ms = 1 saniye. Yani LED saniyede bir kez yanıp söner.',
  },
  {
    tip: 'kod', baslik: 'Tam beş kez',
    metin: `<span class="pin-etiket">D0</span> LED'i <b>tam 5 kez</b> yanıp sönsün (<b>300 ms yansın, 300 ms sönsün</b>) ve sonra <b>sönük</b> kalsın. Sonsuz döngü değil, sayılı bir döngü kullan.`,
    ipucu: '"i değerini 1\'den 5\'e say" bloğunun içine yak-bekle-söndür-bekle dörtlüsünü koy.',
    sure: 4200,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      const yanma = g.filter(o => o.deger === 1).length;
      if (!yanma) return { ok: false, mesaj: 'LED hiç yanmadı.' };
      if (yanma !== 5) return { ok: false, mesaj: `LED ${yanma} kez yandı; tam 5 kez yanmalı.` };
      if (sim.pin.D0.deger !== 0) return { ok: false, mesaj: 'Sonunda LED sönük kalmalı.' };
      if (!hepsi(araliklar(g), 250, 350)) return { ok: false, mesaj: 'Yanma ve sönme süreleri yaklaşık 300 ms olmalı.' };
      return { ok: true, mesaj: 'Beş kez yanıp söndü ve durdu. Süper!' };
    },
  },
];

const gorev13 = [
  {
    tip: 'soru', soru: `<code>digitalWrite(D0, HIGH);</code> ve <code>digitalWrite(D1, LOW);</code> çalıştıktan sonra hangi LED yanar?`,
    secenekler: ['İkisi de yanar', 'Yalnızca D0\'a bağlı kırmızı LED', 'Yalnızca D1\'e bağlı yeşil LED', 'İkisi de sönük kalır'], dogru: 1,
    aciklama: 'D0 3,3 V olduğu için kırmızı LED yanar; D1 0 V olduğundan yeşil LED sönük kalır.',
  },
  {
    tip: 'kod', baslik: 'Hızlı nöbet değişimi',
    metin: `Kırmızı (<span class="pin-etiket">D0</span>) ve yeşil (<span class="pin-etiket">D1</span>) LED bu sefer <b>200 ms</b>'de bir nöbet değiştirsin. Hiçbir an <b>ikisi birden</b> yanmasın.`,
    ipucu: 'Bekle bloklarındaki 400 değerini 200 yap. Önce yanan LED\'i söndür, sonra diğerini yak.',
    sure: 4000,
    kontrol(sim) {
      const a = gecisler(sim, 'D0'), b = gecisler(sim, 'D1');
      if (a.length < 8 || b.length < 8) return { ok: false, mesaj: 'İki LED de sürekli nöbetleşmeli (sürekli tekrarla).' };
      if (parcalar(sim).cakisma) return { ok: false, mesaj: 'İki LED aynı anda yandı. Önce birini söndür, sonra diğerini yak.' };
      if (!hepsi(araliklar(a), 150, 260)) return { ok: false, mesaj: 'Nöbet değişimi yaklaşık 200 ms\'de bir olmalı. Bekle bloklarını kontrol et.' };
      return { ok: true, mesaj: 'Hızlı ve düzenli bir nöbet değişimi!' };
    },
  },
  {
    tip: 'soru', soru: `İki LED'li programda döngüde iki tane <code>delay(400);</code> var. Döngünün bir turu yaklaşık kaç milisaniye sürer?`,
    secenekler: ['400 ms', '1200 ms', '800 ms', '4 ms'], dogru: 2,
    aciklama: 'Bekleme süreleri toplanır: 400 + 400 = 800 ms. digitalWrite komutları ise mikrosaniyeler sürer, ihmal edilir.',
  },
  {
    tip: 'kod', baslik: 'Yeşil önce başlasın',
    metin: `Sıra değişsin: önce <b>yeşil LED</b> (<span class="pin-etiket">D1</span>) yansın, <b>300 ms</b> sonra kırmızı (<span class="pin-etiket">D0</span>) yansın ve böyle sürekli nöbetleşsinler. Hiçbir an ikisi birden yanmasın.`,
    ipucu: 'İlk turda hangi pini YÜKSEK, hangisini DÜŞÜK yaptığına dikkat et. Bekleme 300 ms.',
    kontrol(sim) {
      const a = gecisler(sim, 'D0'), b = gecisler(sim, 'D1');
      if (!b.length) return { ok: false, mesaj: 'Yeşil LED (D1) hiç yanmadı.' };
      const ilk = sim.olaylar.find(o => o.deger === 1);
      if (!ilk || ilk.pin !== 'D1') return { ok: false, mesaj: 'İlk yanan LED yeşil (D1) olmalı. Kırmızı daha sonra yanmalı.' };
      if (parcalar(sim).cakisma) return { ok: false, mesaj: 'İki LED aynı anda yandı. Önce birini söndür, sonra diğerini yak.' };
      if (a.length < 6 || b.length < 6) return { ok: false, mesaj: 'İki LED de sürekli nöbetleşmeli.' };
      if (!hepsi(araliklar(b), 250, 350)) return { ok: false, mesaj: 'Nöbet değişimi yaklaşık 300 ms\'de bir olmalı.' };
      return { ok: true, mesaj: 'Yeşil başladı, kırmızı devam etti. Tam istenen gibi!' };
    },
  },
  {
    tip: 'soru', soru: `Program <code>digitalWrite(D1, HIGH)</code> yazdıktan sonra D1'e <b>bir daha hiçbir şey yazmazsa</b> yeşil LED ne olur?`,
    secenekler: ['Birkaç saniye sonra kendiliğinden söner', 'Yanık kalır; pin yeni bir değer yazılana kadar HIGH kalır', 'Kırmızı LED söner', 'Yanıp sönmeye başlar'], dogru: 1,
    aciklama: 'Bir pin, ona yeni değer yazılana kadar son durumunu korur. LED\'i söndürmek için LOW yazmak gerekir.',
  },
  {
    tip: 'kod', baslik: 'Araya karanlık gir',
    metin: `Nöbet değişirken araya kısa bir <b>karanlık</b> girsin: bir LED <b>400 ms</b> yansın, sonra <b>ikisi de 100 ms</b> sönük kalsın, sonra diğeri 400 ms yansın... Böyle sürekli devam etsin.`,
    ipucu: 'Önce yanan LED\'i söndür, 100 ms bekle, sonra diğerini yak. Bu bekleme iki LED\'in de sönük olduğu andır.',
    kontrol(sim) {
      const { p, cakisma } = parcalar(sim);
      if (cakisma) return { ok: false, mesaj: 'İki LED aynı anda yandı. Önce birini söndür, sonra diğerini yak.' };
      const ic = p.slice(0, -1);
      while (ic.length && !ic[0].d0 && !ic[0].d1) ic.shift();
      const yanik = ic.filter(x => x.d0 !== x.d1), karanlik = ic.filter(x => !x.d0 && !x.d1);
      if (yanik.length < 4) return { ok: false, mesaj: 'İki LED de sürekli nöbetleşmeli (sürekli tekrarla).' };
      if (karanlik.length < 3) return { ok: false, mesaj: 'Nöbet değişirken ikisinin de sönük olduğu bir ara yok. Söndür, 100 ms bekle, sonra diğerini yak.' };
      if (!karanlik.every(x => x.sure >= 80 && x.sure <= 200)) return { ok: false, mesaj: 'İki LED\'in birlikte sönük kaldığı ara yaklaşık 100 ms olmalı.' };
      if (!yanik.every(x => x.sure >= 300 && x.sure <= 500)) return { ok: false, mesaj: 'Her LED yaklaşık 400 ms yanık kalmalı.' };
      return { ok: true, mesaj: 'Araya karanlık girdi, harika bir nöbet düzeni!' };
    },
  },
  {
    tip: 'kod', baslik: 'Üçer tur ve dur',
    metin: `Kırmızı (<span class="pin-etiket">D0</span>) ve yeşil (<span class="pin-etiket">D1</span>) LED <b>tam 3 kez</b> nöbetleşsin (her biri 3 kez, <b>300 ms</b> yansın). Sonunda <b>ikisi de sönük</b> kalsın. Sürekli tekrarla yerine <b>say</b> döngüsü kullan.`,
    ipucu: 'Say döngüsünün içine sırayla şunları koy: kırmızı yak, bekle, kırmızı söndür, yeşil yak, bekle, yeşil söndür.',
    kontrol(sim) {
      const a = gecisler(sim, 'D0').filter(o => o.deger === 1).length;
      const b = gecisler(sim, 'D1').filter(o => o.deger === 1).length;
      if (!a || !b) return { ok: false, mesaj: 'İki LED de yanmalı.' };
      if (parcalar(sim).cakisma) return { ok: false, mesaj: 'İki LED aynı anda yandı. Önce birini söndür, sonra diğerini yak.' };
      if (a !== 3 || b !== 3) return { ok: false, mesaj: `Kırmızı ${a}, yeşil ${b} kez yandı; ikisi de tam 3 kez yanmalı.` };
      if (sim.pin.D0.deger || sim.pin.D1.deger) return { ok: false, mesaj: 'Sonunda iki LED de sönük kalmalı. Son turdaki LED\'i de söndür.' };
      const d0 = gecisler(sim, 'D0');
      if (!hepsi(araliklar(d0).filter((_, i) => d0[i].deger === 1), 250, 350)) return { ok: false, mesaj: 'Her LED yaklaşık 300 ms yanık kalmalı.' };
      return { ok: true, mesaj: 'Üç tur nöbetleştiler ve durdular!' };
    },
  },
];

export default [
  {
    id: 'led-yak',
    ad: '1.1 · LED yak',
    sure: 1500,
    gorevler: gorev11,
    html: `<h2>LED yak</h2>
      <p>D0 pinine bir LED bağlı. <b>D0 pinini YÜKSEK yap</b> bloğunu çalışma alanına sürükle ve ▶ Çalıştır'a bas.</p>`,
    adimlar: [
      {
        baslik: 'Devreyi tanı',
        html: `<p>3B sahnede <b>Deneyap Kart</b> ile bir <b>breadboard</b> var. Kartın <span class="pin-etiket">D0</span> pininden çıkan kırmızı kablo, breadboard üzerindeki <b>kırmızı LED</b>'e gidiyor.</p>
          <p>Sahneyi fareyle döndürebilir, tekerlekle yakınlaştırabilirsin. Yeşil halka LED'i gösteriyor.</p>
          <div class="kutu bilgi"><b>Pin nedir?</b> Kartın kenarındaki metal bacaklara <i>pin</i> denir. Her pin 0 V (<code>LOW</code>) ya da 3,3 V (<code>HIGH</code>) verebilir. LED, 3,3 V gelince yanar.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Pinler kategorisini aç',
        html: `<p>Sol taraftaki araç kutusunda <span class="chip pin">Pinler</span> kategorisine tıkla. Yanıp sönen yeşil çerçeve nereye bakacağını gösteriyor.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        ipucu: 'Araç kutusu çalışma alanının solunda, renkli şeritli liste. İlk sıradaki turuncu "Pinler" kategorisi.',
      },
      {
        baslik: 'Bloğu çalışma alanına sürükle',
        html: `<p><span class="chip pin">D0 pinini YÜKSEK (1) yap</span> bloğunu tutup beyaz çalışma alanına bırak.</p>
          <p>Bloğu bıraktığın anda sağ alttaki <b>Arduino C++</b> panelinde karşılığı belirir. Bak, ne yazıldı:</p>
          <pre><code>digitalWrite(D0, HIGH);</code></pre>
          <div class="kutu bilgi"><code>digitalWrite(pin, değer)</code> bir pine <code>HIGH</code> ya da <code>LOW</code> yazar. <code>pinMode(D0, OUTPUT)</code> satırını sen yazmadan biz ekledik: D0'ın çıkış olduğunu karta söyler.</div>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: { blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' } },
        ipucu: 'Blok üzerindeki D0 ve YÜKSEK (1) seçimlerinin değişmediğinden emin ol. Bloğu başka yere değil, boş çalışma alanına bırak.',
      },
      {
        baslik: 'Programı çalıştır',
        html: `<p>Sol alttaki <b>▶ Çalıştır</b> düğmesine bas. Programdaki komut kartta çalışır ve D0 pini 3,3 V olur.</p>
          <div class="kutu hedef"><b>Hedef:</b> 3B sahnedeki LED yansın ve <i>✔ LED yandı!</i> mesajını gör.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'LED yanmıyorsa pinin D0 ve değerin YÜKSEK (1) olduğundan emin ol.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'kirmizi' }] },
    kontrol(sim) {
      const son = sim.pin.D0.deger;
      return son === 1 ? { ok: true, mesaj: 'LED yandı!' } : { ok: false, mesaj: 'D0 hâlâ düşük. Pini YÜKSEK yap.' };
    },
  },
  {
    id: 'led-yanip-son',
    ad: '1.2 · Yanıp sönen LED',
    sure: 4200,
    gorevler: gorev12,
    html: `<h2>Yanıp sönen LED</h2>
      <p>LED'i <b>yüksek</b> yap, <b>500 ms bekle</b>, <b>düşük</b> yap, tekrar <b>500 ms bekle</b>.
      Bu dörtlüyü <b>sürekli tekrarla</b> bloğunun içine koy.</p>`,
    adimlar: [
      {
        baslik: 'Hedefi tanı',
        html: `<p>Yine <span class="pin-etiket">D0</span> pinine bağlı kırmızı LED var. Bu sefer LED'i bir kez yakmakla kalmayacağız: <b>yanıp sönecek</b>, tıpkı bir uyarı lambası gibi.</p>
          <div class="kutu bilgi"><b>Plan:</b> yak, biraz bekle, söndür, biraz bekle. Sonra bunu sonsuza kadar tekrar et. Bekleme olmazsa göz yanıp sönmeyi göremez, çünkü kart çok hızlıdır!</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla bloğunu al',
        html: `<p><span class="chip akis">Akış</span> kategorisini aç ve <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına bırak.</p>
          <div class="kutu bilgi">Bu blok, içindeki her şeyi durmadan baştan çalıştırır. Karttaki karşılığı:
            <pre><code>while (true) {
  ...
}</code></pre></div>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu. Boş çalışma alanına bırakman yeterli.',
      },
      {
        baslik: 'LED\'i yak',
        html: `<p><span class="chip pin">D0 pinini YÜKSEK (1) yap</span> bloğunu <span class="chip akis">sürekli tekrarla</span> bloğunun <b>içine</b> sürükle.</p>
          <pre><code>digitalWrite(D0, HIGH);</code></pre>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: { blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' }, icinde: 'dy_surekli' },
        ipucu: 'Bloğu döngünün ağzına yaklaştır; birleşecekleri yerde bir gölge göreceksin.',
      },
      {
        baslik: 'Bekle',
        html: `<p><span class="chip akis">500 ms bekle</span> bloğunu LED'i yakan bloğun hemen altına tak.</p>
          <div class="kutu bilgi"><code>delay</code> kartı verilen süre kadar bekletir. Süre <b>milisaniye</b> cinsindendir: 1000 ms = 1 saniye, yani 500 ms = yarım saniye.
            <pre><code>delay(500);</code></pre></div>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'dy_surekli' },
        ipucu: 'Bekle bloğu Akış kategorisinde. Döngünün içinde, LED bloğunun altında olmalı.',
      },
      {
        baslik: 'Söndür ve tekrar bekle',
        html: `<p>Şimdi ters işi yap: <span class="chip pin">D0 pinini DÜŞÜK (0) yap</span> bloğunu ekle (bloktaki seçimi değiştir), ardından bir <span class="chip akis">bekle</span> bloğu daha tak. Sıra şöyle olmalı:</p>
          <pre><code>digitalWrite(D0, HIGH);
delay(500);
digitalWrite(D0, LOW);
delay(500);</code></pre>
          <div class="kutu dikkat">İkinci bekleme çok önemli: o olmazsa LED sönük kalma süresi sıfır olur ve hep yanıyormuş gibi görünür.</div>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '0' }, icinde: 'dy_surekli' }, { blok: 'dy_bekle', adet: 2, icinde: 'dy_surekli' }],
        ipucu: 'Pin bloğundan iki tane olacak: biri YÜKSEK, biri DÜŞÜK. Bloktaki açılır listeden değeri seçebilirsin.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve LED'in ritmini izle.</p>
          <div class="kutu hedef"><b>Hedef:</b> LED yarım saniye yansın, yarım saniye sönsün ve bu sürekli tekrar etsin.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Yanma ve sönme süresi 0,3 ile 1,2 saniye arasında olmalı. Bekleme değerlerine bak.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'kirmizi' }] },
    baslangic: null,
    kontrol(sim) {
      const g = gecisler(sim, 'D0');
      if (g.length < 5) return { ok: false, mesaj: `LED sadece ${g.length} kez değişti. Döngü ve bekleme ekle.` };
      const araliklar = g.slice(1).map((o, i) => o.t - g[i].t);
      const iyi = araliklar.every(a => a >= 300 && a <= 1200);
      return iyi ? { ok: true, mesaj: 'Harika, LED yanıp sönüyor!' } : { ok: false, mesaj: 'Yanma/sönme süreleri 0.3-1.2 sn arasında olmalı.' };
    },
  },
  {
    id: 'iki-led',
    ad: '1.3 · Sırayla yanan iki LED',
    sure: 5000,
    gorevler: gorev13,
    html: `<h2>Sırayla yanan iki LED</h2>
      <p>D0 ve D1'e birer LED bağlı. Biri yanarken diğeri sönük olsun; her 400 ms'de rolleri değişsin (<i>sürekli tekrarla</i> kullan).</p>`,
    adimlar: [
      {
        baslik: 'İki LED, iki pin',
        html: `<p>Bu kez iki LED var: <b>kırmızı</b> olan <span class="pin-etiket">D0</span>'a, <b>yeşil</b> olan <span class="pin-etiket">D1</span>'e bağlı. Her pin kendi LED'ini yönetir.</p>
          <div class="kutu bilgi"><b>Hedef:</b> trafik ışığı gibi nöbetleşe yansınlar. Biri yanarken diğeri <b>mutlaka sönük</b> olmalı.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Döngüyü kur',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına koy. Önceki dersteki gibi her şey bunun içine girecek.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Birinci tur: kırmızı yanar',
        html: `<p>Döngünün içine sırayla şunları tak:</p>
          <ol><li><span class="chip pin">D0 pinini YÜKSEK yap</span></li>
          <li><span class="chip pin">D1 pinini DÜŞÜK yap</span> (pini D1, değeri 0 seç)</li></ol>
          <pre><code>digitalWrite(D0, HIGH);
digitalWrite(D1, LOW);</code></pre>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' }, icinde: 'dy_surekli' }, { blok: 'dy_yaz', alan: { PIN: 'D1', DEG: '0' }, icinde: 'dy_surekli' }],
        ipucu: 'Aynı bloğu iki kez al; birinde pini D1, değeri DÜŞÜK (0) yap.',
      },
      {
        baslik: '400 ms bekle',
        html: `<p>İki pin bloğunun altına <span class="chip akis">400 ms bekle</span> bloğunu ekle. Bloktaki sayıyı 500'den 400'e çevirmeyi unutma.</p>
          <pre><code>delay(400);</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'dy_surekli' },
        ipucu: 'Sayıya tıklayıp yeni değeri yazabilirsin.',
      },
      {
        baslik: 'İkinci tur: yeşil yanar',
        html: `<p>Rolleri değiştir: <span class="chip pin">D0 pinini DÜŞÜK</span>, <span class="chip pin">D1 pinini YÜKSEK</span> yap, sonra yine <span class="chip akis">400 ms bekle</span>.</p>
          <div class="kutu dikkat"><b>Sıra önemli!</b> Önce yanan LED'i söndür, sonra diğerini yak. Yoksa bir an için ikisi birden yanar.</div>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '0' }, icinde: 'dy_surekli' }, { blok: 'dy_yaz', alan: { PIN: 'D1', DEG: '1' }, icinde: 'dy_surekli' }, { blok: 'dy_bekle', adet: 2, icinde: 'dy_surekli' }],
        ipucu: 'Toplam dört pin bloğu ve iki bekle bloğu olmalı.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve iki LED'in nöbet değiştirmesini izle.</p>
          <div class="kutu hedef"><b>Hedef:</b> kırmızı ve yeşil LED sırayla yansın, hiçbir an ikisi birden yanmasın.</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'İkisi birden yanıyorsa söndürme bloğunun yakma bloğundan önce geldiğine bak.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'kirmizi' }, { tur: 'led', pin: 'D1', renk: 'yesil' }] },
    kontrol(sim) {
      const a = gecisler(sim, 'D0'), b = gecisler(sim, 'D1');
      if (a.length < 3 || b.length < 3) return { ok: false, mesaj: 'İki LED de birkaç kez değişmeli.' };
      // Aynı anda ikisi birden hiç yanmamalı
      let d0 = 0, d1 = 0, cakisma = false;
      for (const o of [...sim.olaylar].sort((x, y) => x.t - y.t)) {
        if (o.pin === 'D0') d0 = o.deger; if (o.pin === 'D1') d1 = o.deger;
        if (d0 && d1) cakisma = true;
      }
      return cakisma ? { ok: false, mesaj: 'İki LED aynı anda yandı. Önce birini söndür, sonra diğerini yak.' }
        : { ok: true, mesaj: 'Mükemmel, sırayla yanıyorlar!' };
    },
  },
];

// ── Ders şeması ──────────────────────────────────────────────────────────
// { id, ad, sure (sanal ms, program bu kadar çalışır), html, sahne:{ parcalar:[{tur,pin,...}] },
//   girdi?: async sim => { await sim.bekle(500); sim.girdi.D5 = 1; ... }   // kullanıcı etkileşimi senaryosu (otomatik test + demo)
//   kontrol(sim) -> {ok, mesaj} }   // sim.olaylar, sim.pin, sim.cihaz, sim.seriCikti, sim.t üzerinden
