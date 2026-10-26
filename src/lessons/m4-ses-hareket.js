// Modül 4: Ses ve hareket. Bloklar sim.olaylar'a {t, pin, deger, tur:'ses'|'servo'} satırı ekler.

const olaylar = (sim, pin, tur) => sim.olaylar.filter(o => o.pin === pin && o.tur === tur);
// t anında pinin değeri (son olay)
const durumda = (liste, t) => { let d = 0; for (const o of liste) { if (o.t <= t) d = o.deger; else break; } return d; };
const sirali = liste => [...liste].sort((a, b) => a.t - b.t);

const NOTA_TABLOSU = `<table class="nota">
  <tr><th>Do</th><th>Re</th><th>Mi</th><th>Fa</th><th>Sol</th><th>La</th><th>Si</th><th>Do'</th></tr>
  <tr><td>262</td><td>294</td><td>330</td><td>349</td><td>392</td><td>440</td><td>494</td><td>523</td></tr></table>`;

// ── Park sensörü senaryosu: engel yaklaşıyor ──
export const PARK_ASAMALARI = [[0, 150], [1000, 80], [2000, 40], [3000, 15]];
// ── Piyano senaryosu: [pin, basma ms, bırakma ms, beklenen Hz] ──
export const PIYANO_SENARYO = [['D0', 500, 900, 262], ['D2', 1200, 1600, 330], ['D4', 1900, 2300, 392], ['D6', 2600, 3000, 494]];

const DERSLER = [
  {
    id: 'buzzer-melodi',
    ad: '4.1 · Buzzer ile melodi',
    sure: 4500,
    html: `<h2>Buzzer ile melodi</h2>
      <p>D8 pinine bir buzzer bağlı. <b>D8 pinine ... Hz ses çal</b> bloğu buzzer'a bir nota çaldırır, <b>sesi sustur</b> bloğu keser.</p>
      <p>Nota frekansları (Hz):</p>${NOTA_TABLOSU}
      <ol>
        <li>Bir nota çal (örn. Do = 262).</li>
        <li><b>300 ms bekle</b>, sonra sesi sustur ve <b>50 ms bekle</b>; yoksa notalar birbirine karışır.</li>
        <li>Bunu en az 5 nota için tekrarla, örneğin: Do Mi Sol Do' Sol Mi Do.</li>
      </ol>
      <p>İpucu: Notalar için tekrarlı kod yazmak yerine ardışık blokları çoğaltabilirsin.</p>`,
    adimlar: [
      {
        baslik: 'Buzzer\'ı tanı',
        html: `<p>Kartın <span class="pin-etiket">D8</span> pinine bir <b>buzzer</b> (ses üreten küçük hoparlör) bağlı. Yeşil halka onu gösteriyor.</p>
          <div class="kutu bilgi"><b>Frekans nedir?</b> Ses, havanın saniyede kaç kez titreştiğidir. Bu sayıya <b>frekans</b> denir, birimi <b>Hz</b> (hertz). Titreşim ne kadar hızlıysa ses o kadar <i>ince</i> çıkar. Her notanın bir frekansı vardır:
          <br>Do (C4) = 262 Hz, Re (D4) = 294, Mi (E4) = 330, Fa (F4) = 349, Sol (G4) = 392, La (A4) = 440, Si (B4) = 494.</div>
          <div class="kutu hedef"><b>Hedef:</b> En az 5 notalı, 4 farklı sesli bir melodi çal.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Ses çal bloğunu al',
        html: `<p><span class="chip ses">Ses ve hareket</span> kategorisini aç ve <span class="chip ses">D8 pinine ... Hz ses çal</span> bloğunu çalışma alanına bırak. Frekansı <b>262</b> (Do) yap.</p>
          <pre><code>tone(D8, 262);</code></pre>
          <div class="kutu bilgi"><code>tone(pin, frekans)</code> buzzer'a o frekansta sürekli ses çaldırır. Sen susturana kadar ses devam eder!</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_cal' },
        bitti: { blok: 'dy_ses_cal', alan: { PIN: 'D8' } },
        ipucu: 'Pin D8 olmalı. Sayı kutusuna tıklayıp 262 yazabilirsin.',
      },
      {
        baslik: 'Bekle ve sustur',
        html: `<p>Notanın duyulması için <span class="chip akis">300 ms bekle</span> bloğunu altına tak. Sonra <span class="chip ses">D8 pinindeki sesi sustur</span> ve <span class="chip akis">50 ms bekle</span> ekle.</p>
          <pre><code>tone(D8, 262);
delay(300);
noTone(D8);
delay(50);</code></pre>
          <div class="kutu bilgi"><code>noTone(pin)</code> sesi keser.</div>
          <div class="kutu dikkat">Susturup kısa bir an beklemezsen ardışık notalar birbirine karışır ve tek uzun ses gibi duyulur.</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_sustur' },
        bitti: [{ blok: 'dy_ses_sustur', alan: { PIN: 'D8' } }, { blok: 'dy_bekle', adet: 2 }],
        ipucu: 'Bekle bloğu Akış kategorisinde. Sıra: çal, bekle, sustur, bekle.',
      },
      {
        baslik: 'Melodiyi tamamla',
        html: `<p>Dört blokluk grubu seçip kopyala (Ctrl+C, Ctrl+V) ve alt alta ekle. Her kopyada frekansı değiştir. Örnek melodi: <b>Do Mi Sol Do' Sol Mi Do</b>.</p>
          <p>En az <b>5 nota</b> ve <b>4 farklı frekans</b> olsun. Frekanslar 100-2000 Hz arasında kalsın.</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_cal' },
        bitti: { blok: 'dy_ses_cal', adet: 5 },
        ipucu: 'Do\' = 523 Hz. Blokları kopyalamak sıfırdan sürüklemekten hızlıdır.',
      },
      {
        baslik: 'Çalıştır ve dinle',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve melodini dinle.</p>
          <div class="kutu hedef"><b>Hedef:</b> Notalar net ayrılsın, melodi baştan sona çalsın.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Notalar karışıyorsa her notadan sonra sustur ve kısa bekle. Çok az nota çaldıysa blok grubunu daha çok kopyala.',
      },
    ],
    sahne: { parcalar: [{ tur: 'buzzer', pin: 'D8' }] },
    kontrol(sim) {
      const o = sirali(olaylar(sim, 'D8', 'ses')).filter(x => x.deger > 0);
      if (o.length < 5) return { ok: false, mesaj: `Sadece ${o.length} nota çaldın. En az 5 nota çal.` };
      if (new Set(o.map(x => x.deger)).size < 4) return { ok: false, mesaj: 'Melodide en az 4 farklı nota olmalı.' };
      if (o.some(x => x.deger < 100 || x.deger > 2000)) return { ok: false, mesaj: 'Nota frekansları 100-2000 Hz arasında olmalı (tabloya bak).' };
      const kisa = o.slice(1).some((x, i) => x.t - o[i].t < 150);
      if (kisa) return { ok: false, mesaj: 'Notalar çok hızlı geçiyor. Her notadan sonra bekle ve sesi sustur.' };
      return { ok: true, mesaj: 'Güzel melodi!' };
    },
  },
  {
    id: 'servo-motor',
    ad: '4.2 · Servo motor',
    sure: 4000,
    html: `<h2>Servo motor</h2>
      <p>D5 pinine bir servo bağlı. <b>D5 servosunu ... ° yap</b> bloğu kolu 0 ile 180 derece arasında bir açıya getirir.</p>
      <ol>
        <li>Önce kolu <b>0°</b> yap.</li>
        <li>Kolu 30° adımlarla (30, 60, 90 ... ) <b>180°</b>'ye kadar çevir; her adımda <b>100 ms bekle</b>.</li>
        <li>Sonra aynı şekilde <b>180°'den 0°'ye</b> geri getir.</li>
      </ol>
      <p>İpucu: Bir adım bloğunu (servo + bekle) çoğaltıp açıyı değiştirmek işi hızlandırır. Adımlar 45°'den büyük olmasın.</p>`,
    adimlar: [
      {
        baslik: 'Servo motoru tanı',
        html: `<p><span class="pin-etiket">D5</span> pinine bir <b>servo motor</b> bağlı. Yeşil halkalı kolu görüyor musun?</p>
          <div class="kutu bilgi"><b>Servo açısı:</b> Normal motor sürekli döner. Servo ise kolunu senin verdiğin <b>açıya</b> getirip orada durur. Açı <b>0° ile 180°</b> arasındadır: 0° bir uç, 90° orta, 180° öbür uçtur.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Kolu 0° yap',
        html: `<p><span class="chip ses">Ses ve hareket</span> kategorisinden <span class="chip ses">D5 servosunu ... ° yap</span> bloğunu al. Açıyı <b>0</b> yap.</p>
          <pre><code>servo_D5.write(0);</code></pre>
          <div class="kutu bilgi"><code>servo.write(açı)</code> kolu o açıya çevirir. Servo kütüphanesini (<code>ESP32Servo.h</code>) biz otomatik ekliyoruz.</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: { blok: 'dy_servo_yaz', alan: { PIN: 'D5' } },
        ipucu: 'Pin D5 olmalı. Açı kutusuna tıklayıp 0 yaz.',
      },
      {
        baslik: '0°\'den 180°\'ye süpür',
        html: `<p>Servo bloğunun altına <span class="chip akis">100 ms bekle</span> ekle. Sonra bu ikiliyi kopyalayıp açıyı <b>30, 60, 90, 120, 150, 180</b> yap.</p>
          <pre><code>servo_D5.write(0);
delay(100);
servo_D5.write(30);
delay(100);
...</code></pre>
          <div class="kutu dikkat">Servo hareket için zaman ister. Bekleme koymazsan kol hedefe varamadan yeni komut gelir.</div>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: [{ blok: 'dy_servo_yaz', adet: 7 }, { blok: 'dy_bekle', adet: 6 }],
        ipucu: 'Toplam 7 servo bloğu olmalı: 0, 30, 60, 90, 120, 150, 180. Her açının ardından bir bekle.',
      },
      {
        baslik: '180°\'den geri dön',
        html: `<p>Aynı şekilde kolu geri getir: <b>150, 120, 90, 60, 30, 0</b>. Her adımda yine 100 ms bekle. Adımlar 45°'den büyük olmasın!</p>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: [{ blok: 'dy_servo_yaz', adet: 10 }, { blok: 'dy_bekle', adet: 10 }],
        ipucu: 'Blokları yukarıdan kopyalamak işini hızlandırır. Toplam 13 servo bloğu çıkar.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve kolun gidip gelişini izle.</p>
          <div class="kutu hedef"><b>Hedef:</b> Kol 0°'den 180°'ye gitsin, sonra 0°'ye geri dönsün.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Kol 180°\'ye ulaşmıyorsa son açıyı kontrol et. Hareket kopuksa adımları küçült.',
      },
    ],
    sahne: { parcalar: [{ tur: 'servo', pin: 'D5', konum: [87.99, 0, -3.97] }] },
    kontrol(sim) {
      const o = sirali(olaylar(sim, 'D5', 'servo'));
      if (o.length < 6) return { ok: false, mesaj: 'Servo çok az hareket etti. Kolu küçük adımlarla döndür.' };
      const a = o.findIndex(x => x.deger <= 5);
      const b = a < 0 ? -1 : o.findIndex((x, i) => i > a && x.deger >= 175);
      const c = b < 0 ? -1 : o.findIndex((x, i) => i > b && x.deger <= 5);
      if (a < 0) return { ok: false, mesaj: 'Kol hiç 0°\'ye gelmedi.' };
      if (b < 0) return { ok: false, mesaj: 'Kol 180°\'ye ulaşmadı.' };
      if (c < 0) return { ok: false, mesaj: 'Kol 180°\'den 0°\'ye geri dönmedi.' };
      if (o.slice(1).some((x, i) => Math.abs(x.deger - o[i].deger) > 45)) return { ok: false, mesaj: 'Adımlar çok büyük. Yaklaşık 10° adımlarla ilerle.' };
      return { ok: true, mesaj: 'Servo 0\'dan 180\'e, sonra geri süpürdü!' };
    },
  },
  {
    id: 'park-sensoru',
    ad: '4.3 · Park sensörü',
    sure: 6000,
    html: `<h2>Park sensörü</h2>
      <p>D3'e mesafe sensörü, D8'e buzzer bağlı. Çalıştırınca bir engel arabaya adım adım yaklaşır (150, 80, 40, 15 cm; her biri yaklaşık 1 sn).</p>
      <ol>
        <li><b>sürekli tekrarla</b> içinde <b>D3 mesafe sensörü (cm)</b> değerini oku.</li>
        <li>Mesafe <b>100'den küçükse</b> bip: sesi çal (örn. 1000 Hz), mesafeye bağlı bir süre bekle, sustur ve aynı süre tekrar bekle.</li>
        <li>Bekleme süresi mesafeyle orantılı olsun (örn. <b>mesafe × 4</b> ms): engel yaklaştıkça bip sıklaşır.</li>
        <li>Mesafe 100 veya daha büyükse sessiz kal (kısa bir bekleme koy).</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Park sensörünü tanı',
        html: `<p><span class="pin-etiket">D3</span> pinindeki <b>mesafe sensörü</b> önündeki engele olan uzaklığı santimetre (cm) olarak ölçer. <span class="pin-etiket">D8</span> pinindeki buzzer ise uyarı verir.</p>
          <p>Çalıştırınca engel adım adım yaklaşacak: 150, 80, 40, 15 cm. Sahnedeki nesneyi fareyle sürüklemeyi de deneyebilirsin.</p>
          <div class="kutu bilgi"><b>Plan:</b> Engel uzaksa sessiz kal. Yakınsa bip çal. Yaklaştıkça bip aralığı kısalsın, yani bip <b>sıklaşsın</b>.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Sensör sürekli ölçmeli. <span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Mesafeyi oku ve karşılaştır',
        html: `<p><span class="chip akis">eğer</span> bloğunu döngüye koy. Koşulu için <span class="chip mantik">karşılaştırma</span> bloğunu al, soluna <span class="chip ses">D3 mesafe sensörü (cm)</span>, sağına <span class="chip sayi">100</span> koy. İşareti <b>&lt;</b> yap.</p>
          <pre><code>if ((mesafeOlc(D3) &lt; 100)) {
  ...
}</code></pre>
          <div class="kutu bilgi"><code>mesafeOlc(D3)</code> sensörden gelen cm değeridir. Koşul "100 cm'den yakın mı?" sorusunu sorar.</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_mesafe_oku' },
        bitti: [{ blok: 'dy_mesafe_oku', alan: { PIN: 'D3' }, icinde: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'logic_compare' }],
        ipucu: 'Eğer bloğu Akış, karşılaştırma Mantık, mesafe bloğu Ses ve hareket kategorisinde.',
      },
      {
        baslik: 'Bip çal',
        html: `<p>Eğer bloğunun içine sırayla şunları koy: <span class="chip ses">D8 pinine 1000 Hz ses çal</span>, <span class="chip akis">bekle</span>, <span class="chip ses">D8 sesi sustur</span>, <span class="chip akis">bekle</span>.</p>
          <p>İki bekleme süresi için <span class="chip sayi">aritmetik</span> bloğundan <b>mesafe × 4</b> yap. Mesafe ne kadar küçükse bekleme o kadar kısa, bip o kadar sık olur.</p>
          <pre><code>tone(D8, 1000);
delay((mesafeOlc(D3) * 4));
noTone(D8);
delay((mesafeOlc(D3) * 4));</code></pre>
          <div class="kutu bilgi">15 cm için bekleme 60 ms, 80 cm için 320 ms olur. Yaklaştıkça bip hızlanır.</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_cal' },
        bitti: [{ blok: 'dy_ses_cal', alan: { PIN: 'D8' }, icinde: 'controls_if' }, { blok: 'dy_ses_sustur', icinde: 'controls_if' }, { blok: 'math_arithmetic' }, { blok: 'dy_mesafe_oku', adet: 3 }],
        ipucu: 'Mesafe bloğundan üç tane lazım: biri karşılaştırmada, ikisi bekleme sürelerinde. Çarpma işareti aritmetik bloğunun listesinde.',
      },
      {
        baslik: 'Uzakta sessiz kal',
        html: `<p>Eğer bloğuna <b>değilse</b> kolu ekle (mavi dişli) ve içine kısa bir <span class="chip akis">50 ms bekle</span> koy. Uzaktayken buzzer ötmez, döngü rahatça döner.</p>
          <div class="kutu dikkat">Sessiz durumda bile döngüde küçük bir bekleme olmalı.</div>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: { blok: 'dy_bekle', adet: 3 },
        ipucu: 'Toplamda üç bekle bloğu olmalı: ikisi bip içinde, biri değilse kolunda.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Engel yaklaşırken bip hızını dinle.</p>
          <div class="kutu hedef"><b>Hedef:</b> 150 cm'de sessizlik, sonra her adımda daha sık bip.</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Bip sıklaşmıyorsa bekleme süresini sabit sayıya değil, mesafe x 4 ifadesine bağla.',
      },
    ],
    sahne: { parcalar: [{ tur: 'mesafe', pin: 'D3', konum: [50.06, 0, -3.97] }, { tur: 'buzzer', pin: 'D8', konum: [104, 0, 12] }] },
    async girdi(sim) {
      sim.cihaz.mesafe ??= {};
      for (const [t, cm] of PARK_ASAMALARI) {
        // Zamanı programın kendi sanal saatine göre izle (sim.t'yi kendisi ilerletmez).
        while (sim.t < t) await sim.tick();
        sim.cihaz.mesafe.D3 = cm;
        // Değişim anı kayda geçer; kontrol bu damgaları kullanır.
        sim.olaylar.push({ t: sim.t, pin: 'D3', deger: cm, tur: 'mesafe' });
        sim.yay();
      }
    },
    kontrol(sim) {
      const bip = olaylar(sim, 'D8', 'ses').filter(x => x.deger > 0).map(x => x.t);
      const asama = olaylar(sim, 'D3', 'mesafe');
      if (asama.length < 4) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
      const son = Math.max(asama[3].t + 300, ...bip) + 150; // gerçek sanal saat, zaman aşımından geride kalabilir
      const hiz = asama.map((x, i) => {
        const a = i === 0 ? 0 : x.t + 300, b = i === 3 ? son : asama[i + 1].t;
        return bip.filter(t => t >= a && t < b).length / Math.max(1, b - a);
      });
      if (hiz[0] > 0) return { ok: false, mesaj: 'Engel uzakken (150 cm) buzzer ötmemeli.' };
      if (hiz[1] <= 0) return { ok: false, mesaj: 'Engel 80 cm yakınına gelince buzzer ötmedi. Koşul: mesafe < 100.' };
      if (!(hiz[2] > hiz[1] * 1.2 && hiz[3] > hiz[2] * 1.2)) return { ok: false, mesaj: 'Engel yaklaştıkça bip sıklaşmalı. Bekleme süresini mesafeye bağla.' };
      return { ok: true, mesaj: 'Park sensörün çalışıyor, yaklaştıkça bip sıklaşıyor!' };
    },
  },
  {
    id: 'dugme-piyano',
    ad: '4.4 · Düğme piyanosu',
    sure: 3800,
    html: `<h2>Düğme piyanosu</h2>
      <p>Piyanonun yedi tuşu D0-D6 pinlerine bağlı; D8'de buzzer var. Tuşa bastığında o notanın sesi çıksın.</p>
      ${NOTA_TABLOSU}
      <ol>
        <li><b>sürekli tekrarla</b> içinde önce <b>D8'deki sesi sustur</b>.</li>
        <li>Her tuş için: <b>D0 pini yüksek mi?</b> ise D8'e o notayı çal (D0 = 262, D1 = 294, D2 = 330, D3 = 349, D4 = 392, D5 = 440, D6 = 494).</li>
      </ol>
      <p>Kendin de deneyebilirsin: çalıştırdıktan sonra sahnede piyano tuşlarına tıkla.</p>`,
    adimlar: [
      {
        baslik: 'Piyanoyu tanı',
        html: `<p>Yedi tuşlu piyano <span class="pin-etiket">D0</span>-<span class="pin-etiket">D6</span> pinlerine bağlı. Buzzer <span class="pin-etiket">D8</span> pininde. Tuşlara fareyle tıklayarak basabilirsin.</p>
          <div class="kutu bilgi"><b>Tuş-nota eşlemesi:</b> D0 = Do 262 Hz, D1 = Re 294, D2 = Mi 330, D3 = Fa 349, D4 = Sol 392, D5 = La 440, D6 = Si 494.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Önce sesi sustur',
        html: `<p><span class="chip akis">sürekli tekrarla</span> bloğu al. İçine <span class="chip ses">D8 pinindeki sesi sustur</span> koy.</p>
          <pre><code>noTone(D8);</code></pre>
          <div class="kutu bilgi">Her turun başında susturursak, hiçbir tuşa basılmadığında buzzer sessiz kalır. Tuşu bırakınca ses kesilir.</div>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_ses_sustur' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'dy_ses_sustur', alan: { PIN: 'D8' }, icinde: 'dy_surekli' }],
        ipucu: 'Sürekli tekrarla Akış, sustur Ses ve hareket kategorisinde.',
      },
      {
        baslik: 'İlk tuş: D0 = Do',
        html: `<p><span class="chip akis">eğer</span> bloğunu al. Koşulu için <span class="chip pin">D0 pini yüksek mi?</span> bloğunu tak. İçine <span class="chip ses">D8 pinine 262 Hz ses çal</span> koy.</p>
          <pre><code>if ((digitalRead(D0) == HIGH)) {
  tone(D8, 262);
}</code></pre>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_oku' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_oku', alan: { PIN: 'D0' } }, { blok: 'dy_ses_cal', alan: { PIN: 'D8' }, icinde: 'controls_if' }],
        ipucu: 'Pin okuma bloğu Pinler kategorisinde.',
      },
      {
        baslik: 'Diğer altı tuşu ekle',
        html: `<p>Eğer bloğunu kopyalayıp her tuş için çoğalt, pini ve frekansı değiştir.</p>
          ${NOTA_TABLOSU}
          <p>D1 = 294, D2 = 330, D3 = 349, D4 = 392, D5 = 440, D6 = 494.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', adet: 7 }, { blok: 'dy_ses_cal', adet: 7 }],
        ipucu: 'Toplam 7 eğer bloğu ve 7 ses çal bloğu olacak. Kopyalamak sürüklemekten hızlıdır.',
      },
      {
        baslik: 'Çalıştır ve çal',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Program tuşlara basma senaryosunu kendisi oynatır. Sonra sahnedeki piyano tuşlarına tıklayarak kendin de çal.</p>
          <div class="kutu hedef"><b>Hedef:</b> Her tuş kendi notasını çalsın, tuşu bırakınca ses kesilsin.</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Yanlış nota çalıyorsa pin ile frekans eşleşmesine bak. Ses kesilmiyorsa döngü başındaki sustur bloğunu kontrol et.',
      },
    ],
    sahne: { parcalar: [
      { tur: 'piyano', pinler: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'], konum: [46.25, 0, 11.97] },
      { tur: 'buzzer', pin: 'D8', konum: [100, 0, -8] }] },
    async girdi(sim) {
      const adimlar = PIYANO_SENARYO.flatMap(([pin, bas, birak]) => [[bas, pin, 1], [birak, pin, 0]]);
      for (const [t, pin, v] of adimlar) {
        if (t > sim.t) await sim.bekle(t - sim.t);
        sim.girdi[pin] = v;
        sim.olaylar.push({ t: sim.t, pin, deger: v, tur: 'girdi' });
        sim.yay();
      }
    },
    kontrol(sim) {
      const o = sirali(olaylar(sim, 'D8', 'ses'));
      for (const [pin, , , f] of PIYANO_SENARYO) {
        const g = sirali(olaylar(sim, pin, 'girdi'));
        const bas = g.find(x => x.deger === 1), birak = g.find(x => x.deger === 0);
        if (!bas || !birak) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        const cal = durumda(o, bas.t + 200);
        if (cal !== f) return { ok: false, mesaj: `${pin} tuşuna basınca ${f} Hz çalmalı (şu an ${cal || 'sessiz'}).` };
        if (durumda(o, birak.t + 150) !== 0) return { ok: false, mesaj: 'Tuşu bırakınca ses kesilmeli. Döngünün başında sesi sustur.' };
      }
      return { ok: true, mesaj: 'Piyanon hazır, tuşlar doğru notaları çalıyor!' };
    },
  },
];

// ───────── GÖREVLER sekmesi ─────────
// Ses kaydını [{f, t, sure}] parçalarına böler (f>0: çalan nota).
const notalar = sim => {
  const out = []; let cur = null;
  for (const o of sirali(olaylar(sim, 'D8', 'ses'))) {
    if (cur) { cur.sure = o.t - cur.t; out.push(cur); cur = null; }
    if (o.deger > 0) cur = { f: o.deger, t: o.t, sure: 0 };
  }
  if (cur) { cur.sure = Math.max(sim.t, cur.t) - cur.t; out.push(cur); }
  return out;
};
const yakin = (a, b, tol) => Math.abs(a - b) <= tol;
// Sıralı alt dizi arama: hedef frekanslar sırayla (toleransla) geçiyor mu?
const siraylaVar = (liste, hedef, tol) => { let i = 0; for (const n of liste) if (i < hedef.length && yakin(n.f, hedef[i], tol)) i++; return i; };
const aciDegerleri = sim => sirali(olaylar(sim, 'D5', 'servo'));

// Özel mesafe senaryosu üretici (derslerdeki girdi ile aynı mantık)
const mesafeSenaryo = asamalar => async sim => {
  sim.cihaz.mesafe ??= {};
  for (const [t, cm] of asamalar) {
    while (sim.t < t) await sim.tick();
    sim.cihaz.mesafe.D3 = cm;
    sim.olaylar.push({ t: sim.t, pin: 'D3', deger: cm, tur: 'mesafe' });
    sim.yay();
  }
};
// Özel piyano senaryosu üretici: adimlar = [[ms, pin, 0|1], ...]
const piyanoSenaryo = adimlar => async sim => {
  for (const [t, pin, v] of [...adimlar].sort((a, b) => a[0] - b[0])) {
    if (t > sim.t) await sim.bekle(t - sim.t);
    sim.girdi[pin] = v;
    sim.olaylar.push({ t: sim.t, pin, deger: v, tur: 'girdi' });
    sim.yay();
  }
};
// Bir pinin n. basma/bırakma zamanları
const tuslar = (sim, pin) => sirali(olaylar(sim, pin, 'girdi'));
const park = (sim) => olaylar(sim, 'D3', 'mesafe');
// [a, b] aralığında step ms aralıkla örnekle
const ornekle = (o, a, b, adim) => { const r = []; for (let t = a; t <= b; t += adim) r.push(durumda(o, t)); return r; };

export const PARK_K1 = [[0, 150], [1500, 10], [3500, 150]];
export const PARK_K2 = [[0, 150], [1000, 70], [2500, 20], [3800, 150]];
export const PIYANO_K1 = [[500, 'D0', 1], [900, 'D0', 0], [1200, 'D1', 1], [1600, 'D1', 0]];
export const PIYANO_K2 = [[500, 'D0', 1], [900, 'D2', 1], [1300, 'D2', 0], [1700, 'D0', 0]];
export const PIYANO_K3 = [[500, 'D3', 1], [700, 'D3', 0]];
export const PIYANO_K4 = [[500, 'D0', 1], [800, 'D0', 0], [1200, 'D6', 1], [1300, 'D0', 1], [1700, 'D0', 0], [1800, 'D6', 0], [2100, 'D0', 1], [2400, 'D0', 0]];

const GOREVLER = {
  'buzzer-melodi': [
    { tip: 'kod', baslik: 'Bir oktav yukarı',
      metin: `<p>Buzzer <span class="pin-etiket">D8</span> pininde. Do-Mi-Sol melodisini <b>bir oktav yukarıdan</b> çal: <b>523 Hz, 659 Hz, 784 Hz</b>.</p><p>Her nota en az 150 ms sürsün ve çaldığın hiçbir nota 500 Hz'in altında kalmasın.</p>`,
      ipucu: 'Her nota için: sesi çal, bekle, sustur, kısa bekle. Frekans sayılarını tam yaz.',
      kontrol(sim) {
        const n = notalar(sim);
        if (!n.length) return { ok: false, mesaj: 'Buzzer hiç ötmedi. D8 pinine ses çal.' };
        if (n.some(x => x.f < 500)) return { ok: false, mesaj: 'Düşük oktavdan nota çaldın. Tüm notalar 500 Hz ve üstünde olmalı.' };
        const k = siraylaVar(n, [523, 659, 784], 8);
        if (k < 3) return { ok: false, mesaj: `Sırayla 523, 659 ve 784 Hz notalarını çalmalısın (şu an ${k}/3 tanesi doğru sırada).` };
        if (n.some(x => x.sure < 150)) return { ok: false, mesaj: 'Bazı notalar çok kısa. Her notadan sonra en az 150 ms bekle.' };
        return { ok: true, mesaj: 'Melodi bir oktav yukarıdan çalıyor!' };
      } },
    { tip: 'soru', soru: 'Buzzer\'a önce <code>440</code> Hz, sonra <code>880</code> Hz çaldırıyorsun. Hangi ses daha <b>ince</b> duyulur?',
      secenekler: ['440 Hz', '880 Hz', 'İkisi de aynı', 'Hz sesin inceliğini değil, uzunluğunu belirler'], dogru: 1,
      aciklama: 'Frekans arttıkça titreşim hızlanır ve ses incelir. 880 Hz, 440 Hz\'in iki katıdır; bir oktav yukarıdır.' },
    { tip: 'kod', baslik: 'Do\'dan Si\'ye gam',
      metin: `<p>Yedi notalık <b>gamı</b> sırayla çal: Do 262, Re 294, Mi 330, Fa 349, Sol 392, La 440, Si 494 Hz.</p><p>Notalar net ayrılsın: her biri en az 120 ms sürsün.</p>`,
      ipucu: 'Bir nota bloğu grubunu kopyalayıp frekansı değiştir. Ya da elle yazıyorsan bir döngü ile frekans dizisini dolaş.',
      kontrol(sim) {
        const n = notalar(sim);
        const k = siraylaVar(n, [262, 294, 330, 349, 392, 440, 494], 6);
        if (k < 7) return { ok: false, mesaj: `Gamda 7 notanın hepsi sırayla çalmalı (şu an ${k}/7). Tabloya bak: 262, 294, 330, 349, 392, 440, 494.` };
        if (n.some(x => x.sure < 120)) return { ok: false, mesaj: 'Bazı notalar çok kısa. Her nota en az 120 ms sürmeli.' };
        return { ok: true, mesaj: 'Gam tam: Do Re Mi Fa Sol La Si!' };
      } },
    { tip: 'soru', soru: '<code>tone(D8, 262);</code> komutunu yazdın ama hiç <code>noTone</code> kullanmadın. Ne olur?',
      secenekler: ['Ses ben susturana (ya da başka frekans verene) kadar sürer', 'Ses kendiliğinden 1 saniye sonra kesilir', 'Buzzer hiç ses çıkarmaz', 'Kart yeniden başlar'], dogru: 0,
      aciklama: '<code>tone(pin, frekans)</code> sürekli ses çaldırır. Susturmak için <code>noTone(pin)</code> gerekir.' },
    { tip: 'kod', baslik: 'Siren sesi',
      metin: `<p>Ambulans sireni yap: iki nota arasında gidip gel. Düşük nota <b>440 Hz</b>, yüksek nota tam <b>iki katı (880 Hz)</b> olsun.</p><p>Bu geçişi en az <b>3 kez</b> tekrarla (toplam en az 6 nota); her nota en az 100 ms sürsün.</p>`,
      ipucu: 'Bir döngü kullanabilirsin: 440 çal, bekle, 880 çal, bekle. Toplam süre 4,5 sn.',
      kontrol(sim) {
        const n = notalar(sim);
        if (n.length < 6) return { ok: false, mesaj: `Sadece ${n.length} nota çaldın. Sirenin en az 6 notası (3 gidiş-geliş) olmalı.` };
        const f = [...new Set(n.map(x => x.f))];
        if (f.length !== 2) return { ok: false, mesaj: `Siren tam iki farklı frekanstan oluşmalı (şu an ${f.length} farklı frekans var).` };
        const [a, b] = f.sort((x, y) => x - y);
        if (!yakin(b / a, 2, 0.05)) return { ok: false, mesaj: 'Yüksek nota, düşük notanın tam iki katı olmalı (440 ve 880).' };
        if (n.slice(1).some((x, i) => x.f === n[i].f)) return { ok: false, mesaj: 'Notalar sırayla değişmeli: düşük, yüksek, düşük, yüksek...' };
        if (n.some(x => x.sure < 100)) return { ok: false, mesaj: 'Bazı notalar çok kısa. Her notada en az 100 ms bekle.' };
        return { ok: true, mesaj: 'Siren çalıyor!' };
      } },
    { tip: 'soru', soru: 'Notalar arasına <code>noTone</code> ve kısa bir <code>delay</code> koymamızın asıl nedeni nedir?',
      secenekler: ['Buzzer ısınmasın diye', 'Frekansı artırmak için', 'Ardışık notalar tek uzun ses gibi karışmasın diye', '<code>tone</code> komutu <code>noTone</code> olmadan hata verir'], dogru: 2,
      aciklama: 'Notalar arasında kısa bir sessizlik olmazsa aynı frekanstaki ardışık notalar birbirine karışır ve melodi ayırt edilemez.' },
    { tip: 'kod', baslik: 'Geri sayım bipi',
      metin: `<p>Roket fırlatma geri sayımı yap: <b>3 kısa bip</b> (her biri 60-300 ms), arkasından <b>1 uzun bip</b> (600 ms veya daha uzun).</p><p>Bipler arasında sessizlik olsun. Uzun bip bitince sesi sustur; uzun bip 2,5 saniyeyi geçmesin.</p>`,
      ipucu: 'Kısa bip: çal, ~150 ms bekle, sustur, ~150 ms bekle. Uzun bip için bekleme süresini büyüt (örn. 800 ms).',
      kontrol(sim) {
        const n = notalar(sim);
        if (n.length < 4) return { ok: false, mesaj: `Sadece ${n.length} bip duydum. 3 kısa + 1 uzun = 4 bip gerekli.` };
        for (let i = 0; i + 3 < n.length; i++) {
          const kisa = [0, 1, 2].every(j => n[i + j].sure >= 60 && n[i + j].sure <= 300);
          const uzun = n[i + 3].sure >= 600 && n[i + 3].sure <= 2500;
          const ayrik = [0, 1, 2].every(j => n[i + j + 1].t - (n[i + j].t + n[i + j].sure) >= 20);
          if (kisa && uzun && ayrik) return { ok: true, mesaj: 'Geri sayım tamam: tik tik tik, uuuu!' };
        }
        return { ok: false, mesaj: 'Art arda 3 kısa bip (60-300 ms, aralarında sessizlik) ve ardından 600-2500 ms\'lik bir uzun bip bulamadım.' };
      } },
  ],

  'servo-motor': [
    { tip: 'kod', baslik: '45° ile 135° arası',
      metin: `<p><span class="pin-etiket">D5</span> servosunun kolu <b>45°'ye</b> gitsin, sonra <b>135°'ye</b>, sonra tekrar <b>45°'ye</b> dönsün.</p><p>Kol hiçbir zaman 40°'nin altına ya da 140°'nin üstüne çıkmasın.</p>`,
      ipucu: 'Önce servo.write(45), biraz bekle, sonra 135, sonra yine 45. Her hareketten sonra bekle.',
      kontrol(sim) {
        const o = aciDegerleri(sim).map(x => x.deger);
        if (!o.length) return { ok: false, mesaj: 'Servo hiç hareket etmedi.' };
        if (o.some(v => v < 40 || v > 140)) return { ok: false, mesaj: 'Kol 45°-135° aralığının dışına çıktı (40°-140° sınırını aşmamalı).' };
        const a = o.findIndex(v => v <= 50);
        const b = a < 0 ? -1 : o.findIndex((v, i) => i > a && v >= 130);
        const c = b < 0 ? -1 : o.findIndex((v, i) => i > b && v <= 50);
        if (a < 0) return { ok: false, mesaj: 'Kol 45° civarına gelmedi.' };
        if (b < 0) return { ok: false, mesaj: 'Kol 135° civarına ulaşmadı.' };
        if (c < 0) return { ok: false, mesaj: 'Kol 135°\'den 45°\'ye geri dönmedi.' };
        return { ok: true, mesaj: 'Kol 45° ile 135° arasında gidip geldi!' };
      } },
    { tip: 'soru', soru: '<code>servo.write(90)</code> komutu kolu nereye getirir?',
      secenekler: ['Kolu dakikada 90 tur döndürür', 'Kolu orta konuma (90°) getirir ve orada tutar', 'Kolu 90 saniye boyunca döndürür', 'Kolu uç noktaya (180°) getirir'], dogru: 1,
      aciklama: 'Servo, verdiğin açıya gider ve orada durur. 90° yaklaşık orta konumdur.' },
    { tip: 'kod', baslik: 'Selam ver',
      metin: `<p>Servo kolu <b>selam versin</b>: <b>0°'den 90°'ye</b> çıkıp tekrar <b>0°</b>'ye insin. Bunu <b>3 kez</b> tekrarla.</p><p>Her hareketten sonra en az 200 ms bekle; kol 100°'yi geçmesin.</p>`,
      ipucu: 'Bir sayaçlı döngü ya da kopyalanmış bloklar kullan: 0, bekle, 90, bekle. 3 kez tekrar.',
      kontrol(sim) {
        const o = aciDegerleri(sim);
        if (o.length < 6) return { ok: false, mesaj: 'Kol yeterince gidip gelmedi. 3 selam için en az 6 hareket gerekir.' };
        if (o.some(x => x.deger > 100)) return { ok: false, mesaj: 'Kol 100°\'yi geçti. Selamda en fazla 90° kullan.' };
        let sayi = 0, asagida = false;
        for (const x of o) {
          if (x.deger <= 5) asagida = true;
          else if (asagida && yakin(x.deger, 90, 5)) { sayi++; asagida = false; }
        }
        if (sayi < 3) return { ok: false, mesaj: `Kol 0°'den 90°'ye sadece ${sayi} kez çıktı. 3 kez gerekli.` };
        const hizli = o.slice(1).some((x, i) => Math.abs(x.deger - o[i].deger) > 40 && x.t - o[i].t < 200);
        if (hizli) return { ok: false, mesaj: 'Hareketler çok hızlı. Her hareketten sonra en az 200 ms bekle.' };
        return { ok: true, mesaj: 'Servo 3 kez selam verdi!' };
      } },
    { tip: 'soru', soru: 'Standart bir servo motorun kolu hangi açı aralığında hareket eder?',
      secenekler: ['Sınırsız, sürekli döner', '0°-360°', '0°-180°', '0°-90°'], dogru: 2,
      aciklama: 'Bu atölyedeki gibi standart servoların kolu 0° ile 180° arasında hareket eder.' },
    { tip: 'kod', baslik: 'Üç tur süpür',
      metin: `<p>Kol <b>0°'den 180°'ye</b> gidip <b>0°'ye</b> dönsün; bunu <b>3 tur</b> yap.</p><p>Adımlar 45°'den büyük olmasın ve her adımda bekle.</p>`,
      ipucu: 'İç içe düşün: 3 kez tekrarla { 0\'dan 180\'e adım adım, 180\'den 0\'a adım adım }. Adım 30° olabilir.',
      kontrol(sim) {
        const o = aciDegerleri(sim).map(x => x.deger);
        if (o.length < 6) return { ok: false, mesaj: 'Servo çok az hareket etti.' };
        if (o.slice(1).some((v, i) => Math.abs(v - o[i]) > 45)) return { ok: false, mesaj: 'Adımlar çok büyük. 45°\'den küçük adımlarla ilerle.' };
        let tur = 0, yukarida = false;
        for (const v of o) { if (v >= 175) yukarida = true; else if (yukarida && v <= 5) { tur++; yukarida = false; } }
        if (tur < 3) return { ok: false, mesaj: `Sadece ${tur} tam tur yaptı. 0°→180°→0° turunu 3 kez tamamla.` };
        return { ok: true, mesaj: 'Üç tam tur tamam!' };
      } },
    { tip: 'soru', soru: 'Servo motor kolunun hangi açıya gideceğini <b>nereden</b> bilir?',
      secenekler: ['Kendisine gelen kısa darbelerin (PWM sinyalinin) genişliğinden', 'Pil gerilimi ne kadar yüksekse o kadar döner', 'Kartın rengine bakarak', 'Sadece bağlı olduğu pin numarasından'], dogru: 0,
      aciklama: 'Servo, sinyal kablosundan gelen darbelerin genişliğini ölçer; kütüphane bu darbeleri senin verdiğin açıya göre üretir.' },
    { tip: 'kod', baslik: 'Yavaş süpürme',
      metin: `<p>Kolu <b>0°'den 180°'ye çok yavaş</b> çevir: adımlar en fazla <b>10°</b> olsun ve süpürme en az <b>1,5 saniye</b> sürsün.</p><p>Önce kol 0°'de olsun.</p>`,
      ipucu: '0\'dan 180\'e 10\'ar derece artan bir döngü yaz; her adımda 100 ms bekle (18 adım x 100 ms = 1,8 sn).',
      kontrol(sim) {
        const o = aciDegerleri(sim);
        const a = o.findIndex(x => x.deger <= 5);
        if (a < 0) return { ok: false, mesaj: 'Kol 0°\'ye gelmedi. Önce 0° yap.' };
        const b = o.findIndex((x, i) => i > a && x.deger >= 175);
        if (b < 0) return { ok: false, mesaj: 'Kol 180°\'ye ulaşmadı.' };
        const yol = o.slice(a, b + 1);
        if (yol.slice(1).some((x, i) => Math.abs(x.deger - yol[i].deger) > 10)) return { ok: false, mesaj: 'Adımlar 10°\'den büyük. Daha küçük adımlar kullan.' };
        const sure = o[b].t - o[a].t;
        if (sure < 1500) return { ok: false, mesaj: `Süpürme ${sure} ms sürdü. En az 1500 ms olmalı; adımlar arasında daha çok bekle.` };
        return { ok: true, mesaj: 'Kol yavaşça süpürdü!' };
      } },
    { tip: 'soru', soru: 'Kolu 0°\'den 180°\'ye <b>yumuşak</b> götürmek istiyorsun. Hangisi doğru yöntemdir?',
      secenekler: ['Beklemeden art arda 180 tane <code>write</code> komutu yazmak', '<code>servo.write(-180)</code> yazmak', 'Yalnızca bir kez <code>write(180)</code> yazıp hiç beklememek', 'Küçük açı adımlarıyla <code>write</code> yapıp aralarda kısa <code>delay</code> koymak'], dogru: 3,
      aciklama: 'Servo kolu sınırlı hızla döner. Küçük adımlar ve aralarda bekleme, hareketi yumuşak ve kontrollü yapar.' },
  ],

  'park-sensoru': [
    { tip: 'soru', soru: 'Ultrasonik mesafe sensörü uzaklığı nasıl ölçer?',
      secenekler: ['Havadaki ısı farkından', 'Engelin rengini görerek', 'Ses dalgası gönderip yankının dönme süresini ölçerek', 'Kamerayla fotoğraf çekerek'], dogru: 2,
      aciklama: 'Sensör ultrasonik bir ses gönderir; ses engele çarpıp geri döner. Dönüş süresi ne kadar uzunsa engel o kadar uzaktadır.' },
    { tip: 'kod', baslik: '20 cm altında kesintisiz ses',
      metin: `<p>Engel <b>20 cm'den yakınsa</b> buzzer (<span class="pin-etiket">D8</span>) <b>kesintisiz</b> ötsün (bip bip değil, sürekli ses). Engel uzaktayken sessiz kalsın.</p><p>Senaryo: engel önce 150 cm'de, sonra 10 cm'ye yaklaşır, sonra tekrar 150 cm'ye uzaklaşır.</p>`,
      ipucu: 'Döngüde mesafeyi oku: 20\'den küçükse tone çal, değilse noTone. Tek tone yeter, delay uzun olmasın.',
      sure: 7000, girdi: mesafeSenaryo(PARK_K1),
      kontrol(sim) {
        const a = park(sim), o = sirali(olaylar(sim, 'D8', 'ses'));
        if (a.length < 3) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        const uzak = ornekle(o, a[0].t + 200, a[1].t - 100, 100);
        if (uzak.some(v => v > 0)) return { ok: false, mesaj: 'Engel 150 cm\'deyken buzzer ötmemeli.' };
        const yakin1 = ornekle(o, a[1].t + 300, a[2].t - 100, 50);
        if (!yakin1.some(v => v > 0)) return { ok: false, mesaj: 'Engel 10 cm\'ye yaklaşınca buzzer ötmedi. Koşul: mesafe < 20.' };
        if (yakin1.some(v => v === 0)) return { ok: false, mesaj: 'Ses kesik kesik geliyor. Yakınken kesintisiz çal: bip yapma, sürekli tone kullan.' };
        const son = ornekle(o, a[2].t + 300, Math.min(sim.t, a[2].t + 1200), 100);
        if (son.some(v => v > 0)) return { ok: false, mesaj: 'Engel uzaklaşınca ses kesilmeli (noTone).' };
        return { ok: true, mesaj: 'Yakınken kesintisiz ses, uzakta sessizlik!' };
      } },
    { tip: 'soru', soru: 'Sensör 2000 µs sonra yankı aldı. Ses yaklaşık <code>0,0343 cm/µs</code> hızla gider ve <b>gidiş-dönüş</b> yapar. Engel kaç cm uzaktadır?',
      secenekler: ['34,3 cm', '68,6 cm', '17,2 cm', '2000 cm'], dogru: 0,
      aciklama: '2000 × 0,0343 = 68,6 cm gidiş-dönüş yoldur. Engele olan uzaklık bunun yarısı: 34,3 cm.' },
    { tip: 'kod', baslik: 'Üç kademeli uyarı',
      metin: `<p>Üç bölgeli park uyarısı yap:</p><ul><li>100 cm'den uzak: <b>sessiz</b></li><li>40-100 cm arası: <b>bip bip</b> (aralıklı)</li><li>40 cm'den yakın: <b>kesintisiz ses</b></li></ul><p>Senaryo: engel 150 cm, sonra 70 cm, sonra 20 cm, sonunda yine 150 cm olur.</p>`,
      ipucu: 'Önce yakın durumu (< 40), sonra orta durumu (< 100) kontrol et: eğer / değilse eğer / değilse zinciri kur.',
      sure: 8000, girdi: mesafeSenaryo(PARK_K2),
      kontrol(sim) {
        const a = park(sim), o = sirali(olaylar(sim, 'D8', 'ses'));
        if (a.length < 4) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        if (ornekle(o, a[0].t + 200, a[1].t - 100, 50).some(v => v > 0)) return { ok: false, mesaj: '150 cm\'de sessiz kalmalı.' };
        const orta = ornekle(o, a[1].t + 300, a[2].t - 100, 40);
        if (!orta.some(v => v > 0)) return { ok: false, mesaj: '70 cm\'de bip duyulmadı. 40-100 cm arası bip bip çalmalı.' };
        if (!orta.some(v => v === 0)) return { ok: false, mesaj: '70 cm\'de ses kesintisiz çıktı; bu bölgede aralıklı bip olmalı (çal, bekle, sustur, bekle).' };
        const yakinB = ornekle(o, a[2].t + 300, a[3].t - 100, 40);
        if (yakinB.some(v => v === 0)) return { ok: false, mesaj: '20 cm\'de ses kesintisiz olmalı; kesik kesik duyuluyor.' };
        if (ornekle(o, a[3].t + 300, Math.min(sim.t, a[3].t + 1000), 50).some(v => v > 0)) return { ok: false, mesaj: 'Engel uzaklaşınca ses kesilmeli.' };
        return { ok: true, mesaj: 'Üç kademeli park uyarısı hazır!' };
      } },
    { tip: 'kod', baslik: 'Mesafeyi seri monitöre yaz',
      metin: `<p>Sensörün ölçtüğü mesafeyi <b>Seri Monitör</b>'e yazdır. Engel 150, 80, 40 ve 15 cm'ye geldikçe bu sayıların <b>her biri</b> sırayla ekranda görünsün.</p><p>Satırda yazı da olabilir (örn. <code>Mesafe: 80</code>), ama sayı net okunmalı.</p>`,
      ipucu: 'Sürekli tekrarla içinde mesafeyi oku ve seri porta yaz. Döngüde kısa bir bekleme koy, yoksa ekran dolar.',
      kontrol(sim) {
        const sayilar = sim.seriCikti.map(s => { const m = String(s).match(/-?\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; });
        if (!sim.seriCikti.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazmadın.' };
        let son = -1;
        for (const h of [150, 80, 40, 15]) {
          const i = sayilar.findIndex((v, k) => k > son && v === h);
          if (i < 0) return { ok: false, mesaj: `Seri monitörde ${h} cm değeri (sırayla) görünmedi. Mesafeyi sürekli oku ve yaz.` };
          son = i;
        }
        return { ok: true, mesaj: 'Mesafe değerleri seri monitörde sırayla göründü!' };
      } },
    { tip: 'soru', soru: '<code>mesafeOlc(D3) &lt; 100</code> koşulu ne zaman doğrudur?',
      secenekler: ['Engel 100 cm\'den daha uzaktayken', 'Engel 100 cm\'den daha yakınken', 'Engel tam 100 cm\'deyken', 'Sensör bağlı değilken'], dogru: 1,
      aciklama: '<code>&lt;</code> "küçüktür" demektir. Ölçülen mesafe 100\'den küçükse engel 100 cm\'den yakındır.' },
    { tip: 'kod', baslik: 'Yaklaştıkça incelen ses',
      metin: `<p>Buzzer'ın <b>frekansı mesafeye göre değişsin</b>: engel yaklaştıkça ses <b>incelsin</b> (frekans artsın).</p><p>Engel 80, 40 ve 15 cm'deyken ses çalsın ve her yakın aşamada frekans bir öncekinden en az 50 Hz yüksek olsun. Örnek formül: <code>frekans = 2000 − mesafe × 10</code>.</p>`,
      ipucu: 'tone bloğunun frekans kutusuna sabit sayı yerine bir hesap koy: 2000 eksi mesafe çarpı 10. Mesafe küçüldükçe sonuç büyür.',
      sure: 7000,
      kontrol(sim) {
        const a = park(sim), o = sirali(olaylar(sim, 'D8', 'ses'));
        if (a.length < 4) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        const fr = [];
        for (let i = 1; i <= 3; i++) {
          const b = a[i].t + 300, s = i === 3 ? Math.min(sim.t, a[3].t + 800) : a[i + 1].t - 100;
          fr.push(Math.max(durumda(o, b), ...o.filter(x => x.t >= b && x.t <= s).map(x => x.deger)));
        }
        if (fr.some(f => f <= 0)) return { ok: false, mesaj: 'Engel 80, 40 ve 15 cm\'deyken buzzer ötmeli.' };
        if (!(fr[1] >= fr[0] + 50 && fr[2] >= fr[1] + 50)) return { ok: false, mesaj: `Frekans yaklaştıkça artmalı (şu an ${fr.map(Math.round).join(' → ')} Hz). Frekansı mesafeye bağla.` };
        return { ok: true, mesaj: `Ses yaklaştıkça incelip ${fr.map(Math.round).join(' → ')} Hz oldu!` };
      } },
    { tip: 'soru', soru: 'Engel yaklaştıkça bip <b>sıklaşsın</b> istiyoruz. Bip arasındaki bekleme süresi hangisi olmalı?',
      secenekler: ['Sabit 500 ms', '1000 − mesafe ms', 'Rastgele bir sayı', 'mesafe × 4 ms'], dogru: 3,
      aciklama: 'Mesafe küçüldükçe bekleme de küçülmelidir. Mesafeyle doğru orantılı olan mesafe × 4 bunu sağlar; 1000 − mesafe ise tersini yapar.' },
  ],

  'dugme-piyano': [
    { tip: 'kod', baslik: 'İki tuşlu piyano',
      metin: `<p>Sadece iki tuşu çalıştır: <span class="pin-etiket">D0</span> tuşu <b>La (440 Hz)</b>, <span class="pin-etiket">D1</span> tuşu <b>Mi' (659 Hz)</b> çalsın.</p><p>Tuşlar bırakılınca ve hiçbir tuşa basılmıyorken buzzer (<span class="pin-etiket">D8</span>) sessiz olsun.</p>`,
      ipucu: 'Döngü başında noTone, sonra D0 için bir eğer, D1 için bir eğer.',
      sure: 3500, girdi: piyanoSenaryo(PIYANO_K1),
      kontrol(sim) {
        const o = sirali(olaylar(sim, 'D8', 'ses'));
        const d0 = tuslar(sim, 'D0'), d1 = tuslar(sim, 'D1');
        const b0 = d0.find(x => x.deger === 1), r0 = d0.find(x => x.deger === 0), b1 = d1.find(x => x.deger === 1), r1 = d1.find(x => x.deger === 0);
        if (!b0 || !r0 || !b1 || !r1) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        if (durumda(o, b0.t - 50) !== 0) return { ok: false, mesaj: 'Tuşa basmadan buzzer ötmemeli.' };
        const f0 = durumda(o, b0.t + 200);
        if (!yakin(f0, 440, 3)) return { ok: false, mesaj: `D0 tuşuna basınca 440 Hz çalmalı (şu an ${f0 || 'sessiz'}).` };
        if (durumda(o, r0.t + 150) !== 0) return { ok: false, mesaj: 'D0 bırakılınca ses kesilmeli.' };
        const f1 = durumda(o, b1.t + 200);
        if (!yakin(f1, 659, 3)) return { ok: false, mesaj: `D1 tuşuna basınca 659 Hz çalmalı (şu an ${f1 || 'sessiz'}).` };
        if (durumda(o, r1.t + 150) !== 0) return { ok: false, mesaj: 'D1 bırakılınca ses kesilmeli.' };
        return { ok: true, mesaj: 'İki tuşlu piyanon çalışıyor!' };
      } },
    { tip: 'soru', soru: 'Piyanoda bir tuşa basıldığında o tuşun pini okununca hangi değer gelir?',
      secenekler: ['LOW (0)', 'HIGH (1)', 'Rastgele bir sayı', '4095'], dogru: 1,
      aciklama: 'Bu piyanoda basılan tuş HIGH (1), bırakılan tuş LOW (0) verir; bu yüzden koşul <code>digitalRead(D0) == HIGH</code> olur.' },
    { tip: 'kod', baslik: 'Üst tuş öncelikli',
      metin: `<p>Bazen iki tuşa aynı anda basılır. Buzzer tek nota çalabilir, bu yüzden bir kural koy: <b>D0 ve D2 birlikte basılıysa D2'nin notası (Mi, 330 Hz) çalsın</b>.</p><p>Sadece D0 basılıyken Do (262 Hz) çalmalı; tuşlar bırakılınca sessizlik.</p>`,
      ipucu: 'Eğer bloklarının sırası önemli: sonra çalışan tone öncekini ezer. Ya da "değilse eğer" kullan.',
      sure: 3800, girdi: piyanoSenaryo(PIYANO_K2),
      kontrol(sim) {
        const o = sirali(olaylar(sim, 'D8', 'ses'));
        const d0 = tuslar(sim, 'D0'), d2 = tuslar(sim, 'D2');
        const b0 = d0.find(x => x.deger === 1), r0 = d0.find(x => x.deger === 0), b2 = d2.find(x => x.deger === 1), r2 = d2.find(x => x.deger === 0);
        if (!b0 || !r0 || !b2 || !r2) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        const t1 = durumda(o, b2.t - 100);
        if (!yakin(t1, 262, 3)) return { ok: false, mesaj: `Sadece D0 basılıyken 262 Hz çalmalı (şu an ${t1 || 'sessiz'}).` };
        const t2 = durumda(o, b2.t + 200);
        if (!yakin(t2, 330, 3)) return { ok: false, mesaj: `D0 ve D2 birlikte basılıyken 330 Hz (D2) çalmalı (şu an ${t2 || 'sessiz'}).` };
        const t3 = durumda(o, r2.t + 200);
        if (!yakin(t3, 262, 3)) return { ok: false, mesaj: `D2 bırakılınca D0'ın 262 Hz notası çalmaya devam etmeli (şu an ${t3 || 'sessiz'}).` };
        if (durumda(o, r0.t + 150) !== 0) return { ok: false, mesaj: 'Tüm tuşlar bırakılınca ses kesilmeli.' };
        return { ok: true, mesaj: 'Öncelik kuralı çalışıyor: üst tuş kazanıyor!' };
      } },
    { tip: 'soru', soru: 'Piyanoda La (A4) 440 Hz. Bir oktav yukarıdaki La (A5) kaç Hz\'dir?',
      secenekler: ['880 Hz', '660 Hz', '460 Hz', '220 Hz'], dogru: 0,
      aciklama: 'Bir oktav yukarı çıkmak frekansı iki katına çıkarır: 440 × 2 = 880 Hz. 220 Hz ise bir oktav aşağıdır.' },
    { tip: 'kod', baslik: 'Melodi tuşu',
      metin: `<p><span class="pin-etiket">D3</span> tuşuna <b>kısa bir an</b> basılınca buzzer otomatik olarak <b>Do (262), Mi (330), Sol (392)</b> notalarını sırayla çalsın.</p><p>Her nota en az 150 ms sürsün. Tuşa basmadan ses çıkmasın ve melodi bitince buzzer sussun. (Tuş melodi bitmeden bırakılır; melodi yine de sonuna kadar çalmalı.)</p>`,
      ipucu: 'Tuşa basıldığını gören eğer bloğunun içine üç nota koy: çal, bekle, sustur, kısa bekle.',
      sure: 3500, girdi: piyanoSenaryo(PIYANO_K3),
      kontrol(sim) {
        const n = notalar(sim), o = sirali(olaylar(sim, 'D8', 'ses'));
        const bas = tuslar(sim, 'D3').find(x => x.deger === 1);
        if (!bas) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        if (n.some(x => x.t < bas.t - 20)) return { ok: false, mesaj: 'Tuşa basmadan buzzer ötmemeli.' };
        const k = siraylaVar(n, [262, 330, 392], 4);
        if (k < 3) return { ok: false, mesaj: `Tuşa basınca 262, 330 ve 392 Hz sırayla çalmalı (şu an ${k}/3 nota doğru).` };
        if (n.some(x => x.sure < 150)) return { ok: false, mesaj: 'Bazı notalar çok kısa. Her nota en az 150 ms sürmeli.' };
        if (durumda(o, sim.t) !== 0) return { ok: false, mesaj: 'Melodi bitince sesi sustur.' };
        return { ok: true, mesaj: 'Tek tuşla melodi çalıyor!' };
      } },
    { tip: 'soru', soru: 'Aynı anda iki tuşa basılırken tek bir buzzer pini (<code>D8</code>) varsa ne duyarız?',
      secenekler: ['İki nota karışık, akor gibi çalar', 'Hiç ses çıkmaz', 'İki nota otomatik olarak sırayla çalar', 'Buzzer tek frekans çalabilir; en son verilen <code>tone</code> komutunun notası duyulur'], dogru: 3,
      aciklama: 'Bir pin aynı anda tek frekans üretir. Peş peşe iki tone komutu verirsen sonuncusu öncekini ezer.' },
    { tip: 'kod', baslik: 'Oktav kaydırma tuşu',
      metin: `<p><span class="pin-etiket">D6</span> tuşu <b>kaydırma tuşu</b> olsun: D6 basılıyken D0 tuşu <b>bir oktav yukarıdan</b> çalsın (Do' = 2 × 262 = 524 Hz). D6 basılı değilken D0 normal Do (262 Hz) çalsın.</p><p>Tuşlar bırakılınca sessizlik.</p>`,
      ipucu: 'Bir çarpan değişkeni kullan: D6 basılıysa 2, değilse 1. Sonra D0 için tone(D8, 262 × çarpan).',
      sure: 4000, girdi: piyanoSenaryo(PIYANO_K4),
      kontrol(sim) {
        const o = sirali(olaylar(sim, 'D8', 'ses'));
        const bas = tuslar(sim, 'D0').filter(x => x.deger === 1), birak = tuslar(sim, 'D0').filter(x => x.deger === 0);
        if (bas.length < 3 || birak.length < 3) return { ok: false, mesaj: 'Senaryo tamamlanmadı, tekrar dene.' };
        const a = durumda(o, bas[0].t + 200);
        if (!yakin(a, 262, 3)) return { ok: false, mesaj: `Sadece D0 basılıyken 262 Hz çalmalı (şu an ${a || 'sessiz'}).` };
        const b = durumda(o, bas[1].t + 200);
        if (!yakin(b, 524, 4)) return { ok: false, mesaj: `D6 basılıyken D0 bir oktav yukarı (524 Hz) çalmalı (şu an ${b || 'sessiz'}).` };
        const c = durumda(o, bas[2].t + 200);
        if (!yakin(c, 262, 3)) return { ok: false, mesaj: `D6 bırakılınca D0 yine 262 Hz çalmalı (şu an ${c || 'sessiz'}).` };
        if (durumda(o, birak[2].t + 150) !== 0) return { ok: false, mesaj: 'Tuş bırakılınca ses kesilmeli.' };
        return { ok: true, mesaj: 'Oktav kaydırma tuşun çalışıyor!' };
      } },
    { tip: 'soru', soru: 'Döngünün başındaki <code>noTone(D8)</code> olmasaydı ne olurdu?',
      secenekler: ['Hiçbir tuş çalışmazdı', 'Notalar daha ince çıkardı', 'Tuşu bıraksak da son nota susmaz, çalmaya devam ederdi', 'Program derlenmezdi'], dogru: 2,
      aciklama: '<code>tone</code> sürekli ses verir. Her turun başında susturmazsak tuş bırakılsa bile son çalan nota sürer.' },
  ],
};

export default DERSLER.map(d => ({ ...d, gorevler: GOREVLER[d.id] }));
