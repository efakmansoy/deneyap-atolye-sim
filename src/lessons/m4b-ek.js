// Modül 4 ek dersler: 4.5 Işıkla çalan çalgı (LDR -> buzzer), 4.6 Topuzla servo (pot -> servo).
// Şema için m4-ses-hareket.js'ye bak. Bu dosya m*.js glob'u ile otomatik yüklenir ('m4b' adı 'm4-' dosyasından sonra sıralanır).
// Girdi senaryoları sanal saatte (sim.bekle) çalışır; değişim anları sim.olaylar'a {tur:'analog'} olarak yazılır, kontroller bunlara bakar.

export const olaylar = (sim, pin, tur) => sim.olaylar.filter(o => o.pin === pin && o.tur === tur);
export const sirali = liste => [...liste].sort((a, b) => a.t - b.t);
// t anında pinin değeri (son olay); olay yoksa 0
export const durumda = (liste, t) => { let d = 0; for (const o of liste) { if (o.t <= t) d = o.deger; else break; } return d; };
export const tamam = m => ({ ok: true, mesaj: m });
export const hata = m => ({ ok: false, mesaj: m });
export const yakin = (a, b, tol) => Math.abs(a - b) <= tol;

/** Analog girdiyi sırayla değiştiren senaryo: asamalar = [[sanal ms, değer], ...] */
export const analogSenaryo = (pin, asamalar) => async sim => {
  for (const [t, v] of asamalar) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.analog[pin] = v;
    sim.olaylar.push({ t: sim.t, pin, deger: v, tur: 'analog' });
    sim.yay();
  }
};
/** Her aşama için [başlangıç, bitiş] penceresi: değişimden `pay` ms sonra başlar, sonraki değişimden 100 ms önce biter.
 *  Son aşama `son` ms sürer. */
export const pencereler = (sim, pin, son = 1200, pay = 300) => {
  const a = olaylar(sim, pin, 'analog');
  return a.map((x, i) => [x.t + pay, (i + 1 < a.length ? a[i + 1].t : x.t + son) - 100]);
};

// ── Buzzer (D8) yardımcıları ──
export const sesler = sim => sirali(olaylar(sim, 'D8', 'ses'));
/** Pencere içindeki en yüksek frekans (0 = sessiz). Aralıklı bip çalan programlar da yakalanır. */
export const pencereFrekans = (o, [b0, b1]) => Math.max(durumda(o, b0), ...o.filter(x => x.t >= b0 && x.t <= b1).map(x => x.deger));
/** Aşamalardaki frekanslar: analog pin A0'daki senaryoya göre */
export const asamaFrekanslari = (sim, son = 1200) => { const o = sesler(sim); return pencereler(sim, 'A0', son).map(w => pencereFrekans(o, w)); };
export const frekansMap = (v, c, d) => c + Math.trunc(v * (d - c) / 4095);

// ── Servo (D5) yardımcıları ──
export const acilar = sim => sirali(olaylar(sim, 'D5', 'servo'));
/** t anındaki son servo açısı (hiç olay yoksa null) */
export const aciSon = (o, t) => { let d = null; for (const e of o) { if (e.t <= t) d = e.deger; else break; } return d; };
export const hedefAci = (v, c = 0, d = 180) => c + (v * (d - c)) / 4095;
/** Aşama sonlarındaki açıları döndürür */
export const asamaAcilari = (sim, son = 1200, pay = 300) => { const o = acilar(sim); return pencereler(sim, 'A0', son, pay).map(w => aciSon(o, w[1])); };

// ── Senaryolar ──
// 4.5: ışık adım adım artar, sonra tekrar kararır (A0, LDR)
export const IS_ASAMALARI = [[0, 400], [1200, 1600], [2400, 2800], [3600, 4000], [4800, 400]];
// 4.6: topuz adım adım çevrilir (A0, potansiyometre)
export const POT_ASAMALARI = [[0, 0], [1200, 1024], [2400, 2048], [3600, 3072], [4800, 4095], [6000, 1024]];

// Görev senaryoları
export const G45_1 = [[0, 500], [1200, 3500], [2400, 500], [3600, 3800]];
export const G45_2 = [[0, 0], [1200, 1024], [2400, 2048], [3600, 4095]];
export const G45_3 = [[0, 300], [1200, 1500], [2400, 2700], [3600, 3900]];
export const G45_4 = [[0, 500], [1200, 1500], [2400, 2500], [3600, 3500], [4800, 1500]];
export const G46_1 = [[0, 300], [1200, 2000], [2400, 3800], [3600, 1000]];
export const G46_2 = [[0, 0], [1200, 1024], [2400, 2048], [3600, 4095]];
export const G46_3 = [[0, 0], [1200, 2048], [2400, 4095], [3600, 1024]];
export const G46_4 = [[0, 0], [1800, 4095], [3900, 1024]];

const DERSLER = [
  {
    id: 'isik-calgisi',
    ad: '4.5 · Işıkla çalan çalgı',
    modul: 4,
    sure: 6200,
    html: `<h2>Işıkla çalan çalgı</h2>
      <p>A0 pinine bir ışık sensörü (LDR), D8 pinine bir buzzer bağlı. Işık arttıkça buzzer'ın sesi <b>incelsin</b> (frekans yükselsin). Elini sensörün önüne tutup gölge yaparak ses perdesini oynatabilirsin.</p>
      <ol>
        <li><b>sürekli tekrarla</b> içinde <b>A0 analog değerini oku</b> (0-4095).</li>
        <li><b>harita</b> bloğuyla bu sayıyı <b>200 - 2000 Hz</b> aralığına çevir.</li>
        <li>Sonucu <b>D8 pinine ... Hz ses çal</b> bloğuna ver.</li>
        <li>Sona kısa bir <b>20 ms bekle</b> koy ve ▶ Çalıştır'a bas. Işık önce az, sonra giderek artar; sonra yine kararır.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Işıkla çalan çalgıyı tanı',
        html: `<p>Sahnede bir <b>LDR</b> (ışık sensörü) ve bir <b>buzzer</b> var. LDR <span class="pin-etiket">A0</span> pininde, buzzer <span class="pin-etiket">D8</span> pininde.</p>
          <div class="kutu bilgi"><b>Işık ne kadar çoksa sayı o kadar büyük:</b> ESP32-S3'ün analog okuması 12 bitliktir. Yani <code>analogRead(A0)</code> karanlıkta 0'a yakın, çok aydınlıkta 4095'e yakın bir sayı verir. Elinle sensöre gölge yaparsan sayı küçülür.
          <pre><code>int isik = analogRead(A0);</code></pre></div>
          <div class="kutu hedef"><b>Hedef:</b> Işık arttıkça buzzer'ın frekansı yükselsin; ışık azalınca ses pesleşsin. Bu, elinle çalınan <i>theremin</i> adlı çalgıya benzer bir fikirdir.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Işık her an değişebilir; kartın sensöre sürekli bakması lazım. <span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına bırak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Harita ile sayıyı frekansa çevir',
        html: `<p>Sorun şu: ışık sayısı <b>0-4095</b> arasında, ama kulağımız rahatça <b>200-2000 Hz</b> arasını ayırt eder. Sayıyı bir aralıktan öbürüne <b>orantılı</b> çeviren komut <code>map</code>.</p>
          <p><span class="chip analog">Analog</span> kategorisinden <span class="chip analog">harita</span> bloğunu çalışma alanına al. İçinde zaten <span class="pin-etiket">A0</span> okuması ve 0-4095 aralığı var. Son iki sayıyı <b>200</b> ve <b>2000</b> yap.</p>
          <pre><code>map(analogRead(A0), 0, 4095, 200, 2000)</code></pre>
          <div class="kutu bilgi"><b>map(değer, girdiMin, girdiMax, çıktıMin, çıktıMax):</b> Karanlıkta (0) sonuç 200, tam ışıkta (4095) sonuç 2000 olur. Ortada (2048) yaklaşık 1100 çıkar.</div>`,
        vurgu: { kategori: 'Analog', blok: 'dy_harita' },
        bitti: [{ blok: 'dy_harita' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }],
        ipucu: 'Harita bloğu hazır dolu gelir. Sonda 255 yazan kutuyu 2000, ondan önceki 0 kutusunu 200 yap.',
      },
      {
        baslik: 'Frekansı buzzer\'a ver',
        html: `<p><span class="chip ses">Ses ve hareket</span> kategorisinden <span class="chip ses">D8 pinine ... Hz ses çal</span> bloğunu <b>sürekli tekrarla</b> içine koy. Frekans kutusuna sabit sayı yerine az önceki <span class="chip analog">harita</span> bloğunu tak.</p>
          <pre><code>tone(D8, map(analogRead(A0), 0, 4095, 200, 2000));</code></pre>
          <div class="kutu bilgi"><code>tone(pin, frekans)</code> frekans her değiştiğinde buzzer'ın sesi de değişir. Işık değişince döngü yeniden döner ve yeni frekans çalınır.</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_cal' },
        bitti: [{ blok: 'dy_ses_cal', alan: { PIN: 'D8' }, icinde: 'dy_surekli' }, { blok: 'dy_harita', icinde: 'dy_ses_cal' }],
        ipucu: 'Harita bloğunu ses çal bloğunun frekans yuvasına sürükle. Pin D8 olmalı.',
      },
      {
        baslik: 'Döngüye küçük bir bekleme',
        html: `<p><span class="chip akis">20 ms bekle</span> bloğunu ses bloğunun altına, yine <b>sürekli tekrarla</b> içine koy.</p>
          <pre><code>delay(20);</code></pre>
          <div class="kutu dikkat">Bekleme olmazsa kart saniyede binlerce kez okuyup aynı sesi yeniden ister. 20 ms (saniyede 50 okuma) kulağa anlık görünür, ama kartı yormaz.</div>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'dy_surekli' },
        ipucu: 'Bekle bloğunun varsayılanı 500 ms; 20 yap. Hepsi sürekli tekrarla içinde kalsın.',
      },
      {
        baslik: 'Çalıştır ve çal',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Program ışığı sırayla artırıp sonunda yine karartır. Buzzer'ın ses perdesi ışığı izlemeli. Sahnedeki LDR'nin güneşini kendin de sürükleyebilirsin.</p>
          <div class="kutu hedef"><b>Hedef:</b> Işık arttıkça ses incelsin, ışık azalınca pesleşsin.</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Ses ışıkla zıt yönde değişiyorsa harita bloğunun son iki sayısını kontrol et: küçük sayı önce, büyük sayı sonra gelmeli. Hiç ses yoksa buzzer pinini kontrol et.',
      },
    ],
    sahne: { parcalar: [{ tur: 'ldr', pin: 'A0', konum: [58.95, 0, 6.19] }, { tur: 'buzzer', pin: 'D8', konum: [104, 0, 12] }] },
    girdi: analogSenaryo('A0', IS_ASAMALARI),
    kontrol(sim) {
      const a = olaylar(sim, 'A0', 'analog');
      if (a.length < IS_ASAMALARI.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
      const f = asamaFrekanslari(sim);
      const ad = a.map(x => x.deger);
      const sessiz = f.findIndex(v => v <= 0);
      if (sessiz >= 0) return hata(`Işık ${ad[sessiz]} iken buzzer ötmedi. Döngüde ışığı okuyup D8'e ses çal.`);
      const disari = f.findIndex(v => v < 100 || v > 5000);
      if (disari >= 0) return hata(`Frekans ${f[disari]} Hz çıktı. Duyulur bir aralıkta (100-5000 Hz) kalmalı; harita bloğunda çıktı aralığını 200-2000 yap.`);
      if (new Set(f).size < 3) return hata('Ses ışığa göre değişmiyor. Frekansı sabit sayı yerine harita bloğuyla ışık değerine bağla.');
      for (let i = 1; i <= 3; i++) {
        if (f[i] < f[i - 1] - 5) return hata(`Işık arttıkça ses pesleşiyor (${f[i - 1]} → ${f[i]} Hz). Harita bloğunun çıktı aralığı küçükten büyüğe olmalı: 200, 2000.`);
        if (f[i] < f[i - 1] + 50) return hata(`Işık ${ad[i - 1]} → ${ad[i]} olunca frekans yeterince yükselmedi (${f[i - 1]} → ${f[i]} Hz). Işığa daha duyarlı bir aralık kullan.`);
      }
      if (f[4] > f[1] - 50) return hata(`Işık yine azalınca ses pesleşmedi (${f[4]} Hz). Frekans canlı olarak ışığı izlemeli: her turda ışığı yeniden oku.`);
      return tamam(`Çalgın ışığı izliyor: ${f.join(' → ')} Hz!`);
    },
  },
  {
    id: 'pot-servo',
    ad: '4.6 · Topuzla servo',
    modul: 4,
    sure: 7400,
    html: `<h2>Topuzla servo</h2>
      <p>A0 pinine bir potansiyometre, D5 pinine bir servo bağlı. Topuzu çevirdikçe servo kolu <b>aynı oranda</b> dönsün: topuz tam solda iken kol 0°, ortada iken 90°, tam sağda iken 180° olsun.</p>
      <ol>
        <li><b>sürekli tekrarla</b> içinde <b>A0 analog değerini oku</b> (0-4095).</li>
        <li><b>harita</b> bloğuyla bu sayıyı <b>0 - 180</b> aralığına çevir.</li>
        <li>Sonucu <b>D5 servosunu ... ° yap</b> bloğuna ver.</li>
        <li>Sona kısa bir <b>20 ms bekle</b> koy ve ▶ Çalıştır'a bas. Topuz kendiliğinden adım adım çevrilir.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Topuz ve servo',
        html: `<p>Sahnede bir <b>potansiyometre</b> (çevirmeli direnç) ve bir <b>servo</b> var. Pot <span class="pin-etiket">A0</span> pininde, servo <span class="pin-etiket">D5</span> pininde.</p>
          <div class="kutu bilgi"><b>İki farklı ölçek:</b> Pot topuzu tam solda <code>analogRead</code> ile <b>0</b>, tam sağda <b>4095</b> verir. Servo ise yalnızca <b>0°-180°</b> arasında bir açı ister. Bu iki ölçeği birbirine <code>map</code> ile bağlayacağız.</div>
          <div class="kutu hedef"><b>Hedef:</b> Topuzu çevirdikçe servo kolu aynı oranda dönsün: sol uç 0°, orta 90°, sağ uç 180°.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Topuz her an çevrilebilir, o yüzden kartın sürekli okuması lazım. <span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Topuz değerini açıya çevir',
        html: `<p><span class="chip analog">Analog</span> kategorisinden <span class="chip analog">harita</span> bloğunu al. İçinde <span class="pin-etiket">A0</span> okuması ve 0-4095 aralığı hazır. Son iki sayıyı <b>0</b> ve <b>180</b> yap.</p>
          <pre><code>map(analogRead(A0), 0, 4095, 0, 180)</code></pre>
          <div class="kutu bilgi">Orantı basit: 4095 değer 180 dereceye bölünür, yani her 22,75 birim yaklaşık 1° eder. Pot ortadayken değer 2048 civarıdır ve sonuç 90° çıkar.</div>`,
        vurgu: { kategori: 'Analog', blok: 'dy_harita' },
        bitti: [{ blok: 'dy_harita' }, { blok: 'dy_analog_oku', alan: { PIN: 'A0' } }],
        ipucu: 'Sondaki 255 yazan kutuyu 180 yap; ondan önceki kutu 0 kalsın.',
      },
      {
        baslik: 'Açıyı servoya ver',
        html: `<p><span class="chip ses">Ses ve hareket</span> kategorisinden <span class="chip ses">D5 servosunu ... ° yap</span> bloğunu <b>sürekli tekrarla</b> içine koy. Açı kutusuna <span class="chip analog">harita</span> bloğunu tak.</p>
          <pre><code>servo.write(map(analogRead(A0), 0, 4095, 0, 180));</code></pre>
          <div class="kutu bilgi"><code>servo.write(açı)</code> kolu o açıya çevirir. Servo kütüphanesini ve <code>attach</code> işlemini bloklar kendisi halleder.</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: [{ blok: 'dy_servo_yaz', alan: { PIN: 'D5' }, icinde: 'dy_surekli' }, { blok: 'dy_harita', icinde: 'dy_servo_yaz' }],
        ipucu: 'Harita bloğunu servo bloğunun açı yuvasına sürükle. Pin D5 olmalı.',
      },
      {
        baslik: 'Kısa bir bekleme ekle',
        html: `<p><span class="chip akis">20 ms bekle</span> bloğunu servo bloğunun altına, yine döngünün içine koy.</p>
          <pre><code>delay(20);</code></pre>
          <div class="kutu dikkat">Servo kolunun hedefe varması zaman alır. Çok sık komut göndermek işe yaramaz: 20 ms (saniyede 50 komut) hem akıcı hem rahattır.</div>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'dy_surekli' },
        ipucu: 'Bekle bloğunun varsayılanı 500 ms; 20 yap. Hepsi sürekli tekrarla içinde kalsın.',
      },
      {
        baslik: 'Çalıştır ve çevir',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Program topuzu sırayla çevirir; servo kolu onu izlemeli. Kendin de sahnedeki topuzu sürükleyebilirsin.</p>
          <div class="kutu hedef"><b>Hedef:</b> Topuz sol uçta iken 0°, ortada iken 90°, sağ uçta iken 180° olsun.</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Kol ters yöne dönüyorsa harita çıktısı 180 - 0 yazılmıştır, 0 - 180 olmalı. Kol hiç kıpırdamıyorsa servo pini D5 mi?',
      },
    ],
    sahne: { parcalar: [{ tur: 'pot', pin: 'A0', konum: [46.25, 0, 13.81] }, { tur: 'servo', pin: 'D5', konum: [100.69, 0, -3.97] }] },
    girdi: analogSenaryo('A0', POT_ASAMALARI),
    kontrol(sim) {
      const a = olaylar(sim, 'A0', 'analog');
      if (a.length < POT_ASAMALARI.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
      if (!acilar(sim).length) return hata('Servo hiç hareket etmedi. D5 servosuna bir açı yazmalısın.');
      const ac = asamaAcilari(sim);
      const ad = a.map(x => x.deger);
      if (ac.some(v => v === null)) return hata('Servo her aşamada bir açıya gitmeli. Komutu sürekli tekrarla içine koy.');
      if (new Set(ac.map(Math.round)).size < 3) return hata('Kol topuzu izlemiyor. Açıyı sabit sayı yerine harita bloğuyla pot değerine bağla.');
      for (let i = 0; i < ac.length; i++) {
        const bek = hedefAci(ad[i]);
        if (!yakin(ac[i], bek, 6)) return hata(`Pot ${ad[i]} iken kol yaklaşık ${Math.round(bek)}° olmalı, ama ${Math.round(ac[i])}°. Harita: 0-4095 → 0-180.`);
      }
      return tamam(`Servo topuzu izliyor: ${ac.map(Math.round).join('° → ')}°!`);
    },
  },
];

// ───────── GÖREVLER sekmesi ─────────

const GOREVLER = {
  'isik-calgisi': [
    { tip: 'kod', baslik: 'Aydınlıkta çal, karanlıkta sus',
      metin: `<p>Işık sensörü <span class="pin-etiket">A0</span> pininde, buzzer <span class="pin-etiket">D8</span> pininde. Işık <b>2000'den büyükse</b> (aydınlık) buzzer <b>880 Hz</b> çalsın, değilse <b>sussun</b>.</p><p>Senaryo: ışık sırayla az, çok, az, çok olur.</p>`,
      ipucu: 'Döngüde ışığı oku. Eğer okuma > 2000 ise tone(D8, 880), değilse noTone(D8). En sonda kısa bir bekleme koy.',
      sure: 4900, girdi: analogSenaryo('A0', G45_1),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G45_1.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        const f = asamaFrekanslari(sim);
        const bek = [0, 880, 0, 880];
        for (let i = 0; i < 4; i++) {
          if (bek[i] === 0 && f[i] > 0) return hata(`Işık ${G45_1[i][1]} (karanlık) iken buzzer susmalı, ama ${f[i]} Hz çalıyor.`);
          if (bek[i] > 0 && !yakin(f[i], 880, 5)) return hata(`Işık ${G45_1[i][1]} (aydınlık) iken 880 Hz çalmalı (şu an ${f[i] || 'sessiz'}).`);
        }
        return tamam('Aydınlıkta ses, karanlıkta sessizlik!');
      } },
    { tip: 'soru', soru: 'ESP32-S3 kartında <code>analogRead(A0)</code> en çok hangi sayıyı verebilir?',
      secenekler: ['255', '1023', '4095', '65535'], dogru: 2,
      aciklama: 'Kartın analog okuyucusu (ADC) 12 bitliktir: 2<sup>12</sup> = 4096 farklı değer okur, yani 0 ile 4095 arası. (255 ise <code>analogWrite</code>\'ın üst sınırıdır.)' },
    { tip: 'kod', baslik: '200-2000 Hz theremin',
      metin: `<p>Gerçek bir ışık çalgısı yap: buzzer frekansı ışık değeriyle <b>orantılı</b> değişsin. Karanlıkta (0) <b>200 Hz</b>, tam ışıkta (4095) <b>2000 Hz</b> çalsın; arası orantılı olsun.</p><p>Kontrol: ışık 0, 1024, 2048 ve 4095 iken beklenen frekansa 30 Hz yaklaşmalı.</p>`,
      ipucu: 'map(analogRead(A0), 0, 4095, 200, 2000) ifadesini tone komutunun frekans yerine yaz. Döngüde delay(20) kullan.',
      sure: 4900, girdi: analogSenaryo('A0', G45_2),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G45_2.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        const f = asamaFrekanslari(sim);
        for (let i = 0; i < 4; i++) {
          const bek = frekansMap(G45_2[i][1], 200, 2000);
          if (!yakin(f[i], bek, 30)) return hata(`Işık ${G45_2[i][1]} iken yaklaşık ${bek} Hz çalmalı (şu an ${f[i] || 'sessiz'}). map(değer, 0, 4095, 200, 2000) kullan.`);
        }
        return tamam('200-2000 Hz aralığında ışıkla çalan çalgı hazır!');
      } },
    { tip: 'soru', soru: '<code>map(2048, 0, 4095, 200, 2000)</code> yaklaşık kaç verir?',
      secenekler: ['Yaklaşık 1100', 'Yaklaşık 200', 'Yaklaşık 2000', 'Yaklaşık 2048'], dogru: 0,
      aciklama: '2048, 0-4095 aralığının yaklaşık ortasıdır. Çıktı aralığı 200-2000 olduğu için sonuç da ortada, yani (200 + 2000) / 2 = 1100 civarı çıkar.' },
    { tip: 'kod', baslik: 'Ters theremin',
      metin: `<p>Bu sefer ters çalsın: ışık <b>arttıkça</b> frekans <b>düşsün</b>. Karanlıkta yüksek (tiz), aydınlıkta alçak (pes) ses çıksın.</p><p>Işık 300, 1500, 2700, 3900 olarak artarken frekans her adımda <b>en az 100 Hz</b> düşmeli ve 100-5000 Hz arasında kalmalı.</p>`,
      ipucu: 'map\'in son iki sayısının yerini değiştir: büyük sayı önce, küçük sayı sonra. Örneğin map(değer, 0, 4095, 2000, 200).',
      sure: 4900, girdi: analogSenaryo('A0', G45_3),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G45_3.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        const f = asamaFrekanslari(sim);
        if (f.some(v => v <= 0)) return hata('Her ışık seviyesinde buzzer ötmeli.');
        if (f.some(v => v < 100 || v > 5000)) return hata('Frekans 100-5000 Hz arasında kalmalı.');
        for (let i = 1; i < 4; i++) if (f[i] > f[i - 1] - 100) return hata(`Işık arttıkça frekans düşmeli (en az 100 Hz). Şu an ${f.join(' → ')} Hz.`);
        return tamam(`Ters çalgı: ${f.join(' → ')} Hz. Işık arttıkça ses pesleşiyor!`);
      } },
    { tip: 'soru', soru: 'Çalgında <code>frekans = map(isik, 0, 4095, 200, 2000)</code> kullanıyorsun. Elinle LDR\'ye gölge yaparak ışığı azaltırsan ses nasıl değişir?',
      secenekler: ['Daha ince (tiz) olur', 'Daha kalın (pes) olur', 'Hiç değişmez', 'Buzzer tamamen susar'], dogru: 1,
      aciklama: 'Işık azalınca analogRead küçük bir sayı verir, map\'in sonucu da 200 Hz\'e yaklaşır. Düşük frekans daha kalın (pes) duyulur.' },
    { tip: 'kod', baslik: 'Nota basamakları',
      metin: `<p>Sürekli kayan ses yerine <b>dört basamaklı</b> bir çalgı yap. Işık değerine göre şu notalar çalsın:</p><ul><li>1024'ten küçük: <b>Do (262 Hz)</b></li><li>1024-2047: <b>Mi (330 Hz)</b></li><li>2048-3071: <b>Sol (392 Hz)</b></li><li>3072 ve üstü: <b>tiz Do (523 Hz)</b></li></ul><p>Işık önce 500, 1500, 2500, 3500, sonra yine 1500 olur; son aşamada tekrar Mi çalmalı.</p>`,
      ipucu: 'eğer / değilse eğer zinciri kur: isik < 1024 ise 262, değilse isik < 2048 ise 330, değilse isik < 3072 ise 392, değilse 523. Hesabı kullanarak (isik / 1024) da çözebilirsin.',
      sure: 6100, girdi: analogSenaryo('A0', G45_4),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G45_4.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        const f = asamaFrekanslari(sim);
        const bek = [262, 330, 392, 523, 330];
        for (let i = 0; i < bek.length; i++) {
          if (!yakin(f[i], bek[i], 4)) return hata(`Işık ${G45_4[i][1]} iken ${bek[i]} Hz çalmalı (şu an ${f[i] || 'sessiz'}).`);
        }
        return tamam('Dört basamaklı ışık çalgısı hazır: Do, Mi, Sol, tiz Do!');
      } },
    { tip: 'soru', soru: 'Çalgı programının döngüsünde sonda <code>delay(20)</code> var. Bu satırın amacı hangisidir?',
      secenekler: ['Sesi 20 Hz yükseltmek', 'Işık sensörünü ısıtıp kalibre etmek', '<code>tone</code> komutunun çalışması için zorunludur; yoksa program derlenmez', 'Döngünün saniyede binlerce kez dönüp kartı gereksiz yormasını önlemek; ses yine de ışığa anında yetişir'], dogru: 3,
      aciklama: 'Kısa bir bekleme, okumaları makul bir hıza (saniyede ~50) indirir. 20 ms insan kulağı için anlık olduğundan çalgı yine canlı çalışır.' },
  ],

  'pot-servo': [
    { tip: 'kod', baslik: 'Üç konumlu anahtar',
      metin: `<p>Pot <span class="pin-etiket">A0</span> pininde, servo <span class="pin-etiket">D5</span> pininde. Servo kolu yalnızca <b>üç konuma</b> gitsin:</p><ul><li>Pot değeri <b>1365'ten küçükse</b>: <b>0°</b></li><li><b>1365-2729</b> arasında: <b>90°</b></li><li><b>2730 ve üstü</b>: <b>180°</b></li></ul>`,
      ipucu: 'Servo.attach(D5) unutma. Döngüde değeri oku; eğer değer < 1365 ise write(0), değilse eğer değer < 2730 ise write(90), değilse write(180).',
      sure: 4900, girdi: analogSenaryo('A0', G46_1),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G46_1.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        if (!acilar(sim).length) return hata('Servo hiç hareket etmedi.');
        const ac = asamaAcilari(sim), bek = [0, 90, 180, 0];
        for (let i = 0; i < 4; i++) {
          if (ac[i] === null || !yakin(ac[i], bek[i], 5)) return hata(`Pot ${G46_1[i][1]} iken kol ${bek[i]}° olmalı (şu an ${ac[i] === null ? 'hareketsiz' : Math.round(ac[i]) + '°'}).`);
        }
        return tamam('Üç konumlu servo anahtarı çalışıyor!');
      } },
    { tip: 'soru', soru: '<code>map(analogRead(A0), 0, 4095, 0, 180)</code> ifadesinde pot tam ortadayken (değer yaklaşık 2048) servo kolu kaç derece olur?',
      secenekler: ['0°', '45°', '90°', '180°'], dogru: 2,
      aciklama: '2048, 0-4095 aralığının yarısıdır. Çıktı aralığının (0-180) yarısı da 90\'dır. Yani kol tam ortada durur.' },
    { tip: 'kod', baslik: 'Ayna servo',
      metin: `<p>Servoyu <b>ters yönde</b> çalıştır: topuz sağa döndükçe kol sola gitsin. Pot 0 iken <b>180°</b>, pot 4095 iken <b>0°</b> olsun; arası orantılı.</p><p>Kontrol: pot 0, 1024, 2048, 4095 iken sırasıyla 180°, 135°, 90°, 0° (6° tolerans).</p>`,
      ipucu: 'map\'in çıktı aralığını ters yaz: map(değer, 0, 4095, 180, 0).',
      sure: 4900, girdi: analogSenaryo('A0', G46_2),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G46_2.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        if (!acilar(sim).length) return hata('Servo hiç hareket etmedi.');
        const ac = asamaAcilari(sim);
        for (let i = 0; i < 4; i++) {
          const bek = hedefAci(G46_2[i][1], 180, 0);
          if (ac[i] === null || !yakin(ac[i], bek, 6)) return hata(`Pot ${G46_2[i][1]} iken kol yaklaşık ${Math.round(bek)}° olmalı (şu an ${ac[i] === null ? 'hareketsiz' : Math.round(ac[i]) + '°'}).`);
        }
        return tamam('Ayna servo hazır: topuz sağa, kol sola!');
      } },
    { tip: 'soru', soru: 'Aynı potla servoyu yalnızca <b>45° ile 135°</b> arasında gezdirmek istiyorsun. <code>map(değer, 0, 4095, ?, ?)</code> ifadesinin son iki sayısı ne olmalı?',
      secenekler: ['0, 180', '45, 135', '135, 45', '0, 4095'], dogru: 1,
      aciklama: 'map\'in son iki sayısı çıktı aralığıdır. Pot en solda iken sonuç ilk sayı (45), en sağda iken ikinci sayı (135) olur.' },
    { tip: 'kod', baslik: 'Dar aralık: 45° - 135°',
      metin: `<p>Servo kolu çok açılıp zorlanmasın: topuzun tüm hareketi kolu yalnızca <b>45° ile 135°</b> arasında gezdirsin. Pot 0 iken 45°, 2048 iken 90°, 4095 iken 135° olsun.</p><p>Kol hiçbir zaman 40°'nin altına ya da 140°'nin üstüne çıkmasın.</p>`,
      ipucu: 'map(değer, 0, 4095, 45, 135) tek satırda çözer.',
      sure: 4900, girdi: analogSenaryo('A0', G46_3),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G46_3.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        const o = acilar(sim);
        if (!o.length) return hata('Servo hiç hareket etmedi.');
        const dis = o.find(x => x.deger < 40 || x.deger > 140);
        if (dis) return hata(`Kol ${Math.round(dis.deger)}° açısına gitti. 40°-140° dışına çıkmamalı.`);
        const ac = asamaAcilari(sim);
        for (let i = 0; i < 4; i++) {
          const bek = hedefAci(G46_3[i][1], 45, 135);
          if (ac[i] === null || !yakin(ac[i], bek, 4)) return hata(`Pot ${G46_3[i][1]} iken kol yaklaşık ${Math.round(bek)}° olmalı (şu an ${ac[i] === null ? 'hareketsiz' : Math.round(ac[i]) + '°'}).`);
        }
        return tamam('Kol 45°-135° arasında topuzu izliyor!');
      } },
    { tip: 'soru', soru: 'Pot değerini (0-4095) <b>hiç çevirmeden</b> doğrudan <code>servo.write(analogRead(A0))</code> diye servoya verirsek ne olur?',
      secenekler: ['Servo çok daha hassas çalışır', 'Program derlenmez', 'Kol ters yöne döner', 'Servo yalnızca 0-180° anlar; sayı hemen bu aralığı aşar, kol topuzun çok küçük bir kısmında hareket eder, sonra uçta takılı kalır'], dogru: 3,
      aciklama: 'Servo açısı 0-180 aralığındadır. Pot değeri yaklaşık 180\'e (topuzun %4,4\'üne) varınca sınır aşılır; geri kalan hareket kolu hiç kıpırdatmaz. Bu yüzden map ile ölçeği küçültmek gerekir.' },
    { tip: 'kod', baslik: 'Yumuşak takip',
      metin: `<p>Kol topuzu <b>anında</b> değil <b>yumuşakça</b> izlesin. Hedef açıyı <code>map</code> ile hesapla (0-180), ama kol her turda hedefe doğru <b>en fazla 3°</b> ilerlesin.</p><p>Kontrol: ardışık iki servo komutu arasında <b>6°'den büyük sıçrama</b> olmamalı; topuz değiştikten yaklaşık 1,5 saniye sonra kol hedefe (4° tolerans) varmış olmalı. Pot sırayla 0, 4095, 1024 olur.</p>`,
      ipucu: 'Bir "aci" değişkeni tut. Her turda: hedef = map(...); aci < hedef ise aci = min(aci + 3, hedef); aci > hedef ise aci = max(aci - 3, hedef); sonra servo.write(aci); delay(20).',
      sure: 6000, girdi: analogSenaryo('A0', G46_4),
      kontrol(sim) {
        if (olaylar(sim, 'A0', 'analog').length < G46_4.length) return hata('Senaryo tamamlanmadı, tekrar dene.');
        const o = acilar(sim);
        if (!o.length) return hata('Servo hiç hareket etmedi.');
        const buyuk = o.slice(1).findIndex((x, i) => Math.abs(x.deger - o[i].deger) > 6);
        if (buyuk >= 0) return hata(`Kol bir anda ${Math.round(o[buyuk].deger)}° → ${Math.round(o[buyuk + 1].deger)}° sıçradı. Her turda hedefe en fazla 3° yaklaş.`);
        const ac = asamaAcilari(sim, 2100, 1500);
        const bek = [0, 180, 45];
        for (let i = 0; i < 3; i++) {
          if (ac[i] === null || !yakin(ac[i], bek[i], 4)) return hata(`Pot ${G46_4[i][1]} iken kol 1,5 sn sonra yaklaşık ${bek[i]}° olmalı (şu an ${ac[i] === null ? 'hareketsiz' : Math.round(ac[i]) + '°'}). Adım 3° ve bekleme 20 ms ise kol yeterince hızlıdır.`);
        }
        return tamam('Kol topuzu yumuşakça takip ediyor!');
      } },
    { tip: 'soru', soru: '<code>servo.attach(D5)</code> satırı neden <code>loop()</code> yerine <code>setup()</code> içine yazılır?',
      secenekler: ['Servonun hangi pine bağlı olduğunu karta bir kez söylemek yeter; her turda tekrarlamak gerekmez', 'Her turda yeniden yazılmazsa servo durur', 'Sinyal kablosunu fiziksel olarak bağlar', 'Servoyu başlangıçta 90° konumuna getirir'], dogru: 0,
      aciklama: '<code>attach</code> bir ayar komutudur: servo nesnesini pine bağlar. Bu bağlantı program boyunca geçerli kalır, o yüzden setup içinde bir kez yapılır.' },
  ],
};

export default DERSLER.map(d => ({ ...d, gorevler: GOREVLER[d.id] }));
