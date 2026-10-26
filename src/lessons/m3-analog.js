// Modül 3 · PWM ve analog. Ders şeması için lessons/m1-led.js dosyasının altındaki yoruma bak.
// girdi senaryosu "kullanıcıyı" simüle eder: sensör değerini değiştirir ve her değişimden sonra
// ilgili pinlerin durumunu sim.cihaz.ornekler içine kaydeder (kontrol bunlara bakar).

const D8 = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
const ornekAl = (sim, pinler) => (sim.cihaz.ornekler ??= []).push(pinler.map(p => sim.pin[p].pwm));
const yakinMi = (a, b, tol) => Math.abs(a - b) <= tol;

/** Dizide en uzun art arda artan (yon=1) veya azalan (yon=-1) dizinin uzunluğu. */
function enUzunKosu(v, yon) {
  let en = 0, k = 0;
  for (let i = 1; i < v.length; i++) {
    if ((v[i] - v[i - 1]) * yon > 0) { k++; en = Math.max(en, k); } else if (v[i] !== v[i - 1]) k = 0;
  }
  return en;
}

const DERSLER = [
  {
    id: 'rgb-led',
    ad: '3.1 · RGB LED',
    sure: 1500,
    html: `<h2>RGB LED: renk karıştırma</h2>
      <p>RGB LED'in içinde üç küçük ışık var: <b>kırmızı (D0)</b>, <b>yeşil (D1)</b>, <b>mavi (D2)</b>. Üçünü karıştırarak her rengi yapabilirsin.</p>
      <ol>
        <li><b>PWM</b> bloğunu üç kez al (Pinler kutusu).</li>
        <li>D0'a <b>255</b>, D1'e <b>0</b>, D2'ye <b>255</b> yaz.</li>
        <li>▶ Çalıştır'a bas. Kırmızı + mavi = <b>mor</b>!</li>
      </ol>
      <p>0 = tamamen sönük, 255 = en parlak. Başka renkler de dene.</p>`,
    adimlar: [
      {
        baslik: 'RGB LED\'i tanı',
        html: `<p>Sahnedeki <b>RGB LED</b>'in içinde üç minik ışık var: <b>kırmızı</b> (<span class="pin-etiket">D0</span>), <b>yeşil</b> (<span class="pin-etiket">D1</span>) ve <b>mavi</b> (<span class="pin-etiket">D2</span>). Yeşil halka LED'i gösteriyor.</p>
          <div class="kutu bilgi"><b>Renk karışımı:</b> Ressamlar boyayı karıştırır, biz ışığı! Kırmızı + mavi = mor, kırmızı + yeşil = sarı, üçü birden = beyaz. Her rengin parlaklığını ayrı ayrı ayarlayacağız.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'PWM bloğunu al',
        html: `<p><span class="chip pin">Pinler</span> kategorisini aç ve <span class="chip pin">PWM</span> bloğunu çalışma alanına sürükle.</p>
          <div class="kutu bilgi"><b>PWM nedir?</b> Pin sadece açık/kapalı olmak zorunda değil. PWM ile pine <b>0 ile 255</b> arası bir sayı yazarız: 0 sönük, 255 en parlak, ortası yarım parlak.
            <pre><code>analogWrite(D0, 255);</code></pre></div>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_pwm' },
        bitti: { blok: 'dy_pwm' },
        ipucu: 'Pinler kategorisinde ikinci sıradaki blok. Boş çalışma alanına bırak.',
      },
      {
        baslik: 'Kırmızı ve mavi: tam parlak',
        html: `<p>Üç tane <span class="chip pin">PWM</span> bloğu olacak. Birincisi <span class="pin-etiket">D0</span> pinine <b>255</b>, ikincisi <span class="pin-etiket">D2</span> pinine <b>255</b> yazsın. Blokları alt alta tak.</p>
          <pre><code>analogWrite(D0, 255);
analogWrite(D2, 255);</code></pre>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_pwm' },
        bitti: [{ blok: 'dy_pwm', alan: { PIN: 'D0' } }, { blok: 'dy_pwm', alan: { PIN: 'D2' } }],
        ipucu: 'Pin adını bloktaki açılır listeden seç. Sayıya tıklayıp 255 yazabilirsin.',
      },
      {
        baslik: 'Yeşili söndür',
        html: `<p>Üçüncü <span class="chip pin">PWM</span> bloğunu <span class="pin-etiket">D1</span> pinine ayarla ve değerini <b>0</b> yap. Yeşil kapalı kalsın ki renk saf mor olsun.</p>
          <pre><code>analogWrite(D1, 0);</code></pre>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_pwm' },
        bitti: { blok: 'dy_pwm', alan: { PIN: 'D1' } },
        ipucu: 'Üç blokta üç farklı pin olmalı: D0, D1, D2.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve LED'in rengine bak.</p>
          <div class="kutu hedef"><b>Hedef:</b> RGB LED <b>mor</b> yansın. Sonra sayıları değiştirip başka renkler de dene!</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Mor için: D0 = 255, D1 = 0, D2 = 255.',
      },
    ],
    sahne: { parcalar: [{ tur: 'rgb-led', pinler: ['D0', 'D1', 'D2'], konum: [78, 0, 10] }] },
    kontrol(sim) {
      const [r, g, b] = ['D0', 'D1', 'D2'].map(p => sim.pin[p].pwm);
      if (r > .8 && b > .8 && g < .1) return { ok: true, mesaj: 'Harika, mor renk yaptın!' };
      if (r < .1 && g < .1 && b < .1) return { ok: false, mesaj: 'LED sönük. D0 ve D2 pinlerine 255 yaz.' };
      return { ok: false, mesaj: 'Mor için kırmızı (D0) ve mavi (D2) tam parlak, yeşil (D1) sönük olmalı.' };
    },
  },
  {
    id: 'pwm-parlaklik',
    ad: '3.2 · Parlaklık ayarı',
    sure: 4500,
    html: `<h2>Yumuşak yanıp sönme (PWM)</h2>
      <p>PWM, LED'i çok hızlı açıp kapatarak parlaklığı ayarlar. 0 = sönük, 255 = en parlak.</p>
      <ol>
        <li><b>say: i değeri 0'dan 255'e, 5'er 5'er</b> döngüsünü al (Analog kutusu).</li>
        <li>İçine <b>D0 pinine PWM</b> koy ve değer olarak <b>i</b> değişkenini ver.</li>
        <li>Altına <b>20 ms bekle</b> ekle. LED yavaşça parlar.</li>
        <li>İkinci bir döngü yap: <b>255'ten 0'a</b> (5'er 5'er). LED yavaşça söner.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Hedefi tanı',
        html: `<p><span class="pin-etiket">D0</span> pinindeki LED'i bu sefer sadece yakıp söndürmeyeceğiz. Önce <b>yavaşça parlayacak</b>, sonra <b>yavaşça sönecek</b>, tıpkı nefes alıyormuş gibi.</p>
          <div class="kutu bilgi"><b>PWM:</b> Kart pini saniyede binlerce kez açıp kapatır. Açık kalma süresi uzadıkça LED daha parlak görünür. <code>analogWrite</code> için sayı <b>0-255</b> arasıdır.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sayaç döngüsünü al',
        html: `<p><span class="chip analog">Analog</span> kategorisini aç ve <span class="chip analog">say: i değeri 0'dan 255'e, 5'er 5'er</span> döngüsünü çalışma alanına bırak.</p>
          <div class="kutu bilgi"><code>i</code> bir <b>değişken</b>: 0'dan başlar, her turda 5 artar, 255'e kadar gider.
            <pre><code>for (int i = 0; i &lt;= 255; i += 5) {
  ...
}</code></pre></div>`,
        vurgu: { kategori: 'Analog', blok: 'controls_for' },
        bitti: { blok: 'controls_for' },
        ipucu: 'Analog kategorisinin en altına doğru, "say" yazan döngü bloğu.',
      },
      {
        baslik: 'PWM yaz, değer i olsun',
        html: `<p><span class="chip pin">PWM</span> bloğunu döngünün <b>içine</b> koy, pini <span class="pin-etiket">D0</span> yap. Değer kutusuna <span class="chip degisken">i</span> bloğunu tak (<span class="chip analog">Analog</span> kategorisinin sonunda).</p>
          <pre><code>analogWrite(D0, i);</code></pre>
          <p>Böylece her turda parlaklık 5 artar.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_pwm' },
        bitti: [{ blok: 'dy_pwm', alan: { PIN: 'D0' }, icinde: 'controls_for' }, { blok: 'variables_get' }],
        ipucu: 'i bloğunu sayı kutusunun üstüne bırakırsan onun yerine geçer.',
      },
      {
        baslik: 'Küçük bir bekleme ekle',
        html: `<p><span class="chip akis">20 ms bekle</span> bloğunu PWM bloğunun altına, döngünün içine koy.</p>
          <div class="kutu dikkat">Bekleme olmazsa 52 adım göz açıp kapayana kadar biter ve parlamayı göremezsin.</div>
          <pre><code>delay(20);</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'controls_for' },
        ipucu: 'Bekle bloğu Akış kategorisinde; varsayılan 500 yazar, onu 20 yap.',
      },
      {
        baslik: 'Sönme döngüsü',
        html: `<p>Aynısından bir tane daha yap, ama bu sefer <b>255'ten 0'a</b> saysın. Döngü bloğunu bir daha al, <b>başlangıç 255, bitiş 0, adım 5</b> yap. İçine yine <span class="chip pin">PWM</span> (D0, değer <span class="chip degisken">i</span>) ve <span class="chip akis">20 ms bekle</span> koy. İkinci döngüyü ilkinin altına tak.</p>
          <div class="kutu bilgi">Bitiş başlangıçtan küçükse Blockly adımı otomatik geriye sayar: 255, 250, 245, ...</div>`,
        vurgu: { kategori: 'Analog', blok: 'controls_for' },
        bitti: [{ blok: 'controls_for', adet: 2 }, { blok: 'dy_pwm', adet: 2 }, { blok: 'dy_bekle', adet: 2 }],
        ipucu: 'İlk döngüyü kopyalamak için bloğa tıkla, Ctrl+C ve Ctrl+V yap, sonra sayıları değiştir.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas.</p>
          <div class="kutu hedef"><b>Hedef:</b> LED yavaşça tam parlaklığa çıksın, sonra yavaşça sönsün.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Parlamıyorsa değerin i olduğundan ve bekleme bloğunun döngü içinde olduğundan emin ol.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'kirmizi', konum: [78, 0, 10] }] },
    kontrol(sim) {
      const v = sim.olaylar.filter(o => o.pin === 'D0').map(o => o.deger);
      if (!v.length) return { ok: false, mesaj: 'D0 pinine hiç PWM yazılmadı.' };
      const yukari = enUzunKosu(v, 1), asagi = enUzunKosu(v, -1), max = Math.max(...v);
      if (yukari < 15) return { ok: false, mesaj: 'LED yumuşakça parlamıyor. 0\'dan 255\'e küçük adımlarla say ve her adımda PWM yaz.' };
      if (max < .95) return { ok: false, mesaj: 'LED en parlak değere (255) kadar çıkmadı.' };
      if (asagi < 15) return { ok: false, mesaj: 'Parladıktan sonra yumuşakça sönmeli. 255\'ten 0\'a sayan ikinci bir döngü ekle.' };
      return { ok: true, mesaj: 'Süper! LED yumuşakça parlıyor ve sönüyor.' };
    },
  },
  {
    id: 'potansiyometre',
    ad: '3.3 · Potansiyometre',
    sure: 3500,
    html: `<h2>Potansiyometre ile parlaklık</h2>
      <p>Potansiyometre (pot) çevirdikçe değişen bir sayı verir: <b>0 ile 4095</b> arası. LED ise <b>0 ile 255</b> arası parlaklık anlar. Bu yüzden sayıyı <b>harita</b> bloğu ile küçültürüz.</p>
      <ol>
        <li><b>sürekli tekrarla</b> bloğunu al.</li>
        <li>İçine <b>D0 pinine PWM</b> koy.</li>
        <li>Değer yerine <b>harita</b> bloğunu tak: A0'ı oku, 0-4095 aralığını 0-255'e çevir.</li>
        <li>Sona <b>10 ms bekle</b> ekle. ▶ Çalıştır'a bas, potu çevir (kendiliğinden de çevrilir).</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Potansiyometreyi tanı',
        html: `<p>Sahnede bir <b>potansiyometre</b> ve bir <b>sarı LED</b> var. Pot, <span class="pin-etiket">A0</span> pinine bağlı. LED ise <span class="pin-etiket">D0</span> pininde.</p>
          <p>3B sahnede <b>potansiyometre topuzunu fareyle döndür</b>. Program bittiğinde LED'in buna tepki vermesini göreceksin.</p>
          <div class="kutu bilgi"><b>analogRead:</b> Pot çevrildikçe karta <b>0 ile 4095</b> arası bir sayı gider (12 bit). Tam sol 0, tam sağ 4095.
            <pre><code>analogRead(A0)</code></pre></div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Pot hep değişebilir, o yüzden kartın hep bakması lazım. <span class="chip akis">sürekli tekrarla</span> bloğunu <span class="chip akis">Akış</span> kategorisinden al.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'LED\'e PWM yaz',
        html: `<p><span class="chip pin">PWM</span> bloğunu döngünün içine koy ve pini <span class="pin-etiket">D0</span> yap.</p>
          <div class="kutu dikkat"><b>Sorun:</b> Pot 0-4095 verir ama <code>analogWrite</code> sadece 0-255 anlar. Sayıyı küçültmemiz gerek!</div>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_pwm' },
        bitti: { blok: 'dy_pwm', alan: { PIN: 'D0' }, icinde: 'dy_surekli' },
        ipucu: 'PWM bloğu Pinler kategorisinde. Döngünün ağzına yaklaştır.',
      },
      {
        baslik: 'Harita bloğuyla ölçekle',
        html: `<p><span class="chip analog">Analog</span> kategorisinden <span class="chip analog">harita</span> bloğunu al ve PWM'in değer kutusuna tak. İçinde zaten <span class="pin-etiket">A0</span> okuması ve 0-4095 → 0-255 var.</p>
          <div class="kutu bilgi"><b>map:</b> Bir sayıyı bir aralıktan başka aralığa çevirir. Ortadaki 2048, 127 civarına dönüşür.
            <pre><code>analogWrite(D0, map(analogRead(A0), 0, 4095, 0, 255));</code></pre></div>`,
        vurgu: { kategori: 'Analog', blok: 'dy_harita' },
        bitti: [{ blok: 'dy_harita', icinde: 'dy_pwm' }, { blok: 'dy_analog_oku' }],
        ipucu: 'Harita bloğu hazır dolu geliyor; sadece PWM bloğundaki sayının yerine tak.',
      },
      {
        baslik: 'Bekle ve çalıştır',
        html: `<p>PWM bloğunun altına <span class="chip akis">10 ms bekle</span> ekle, sonra ▶ <b>Çalıştır</b>'a bas. Çalışırken <b>potansiyometre topuzunu fareyle döndür</b>, LED parlaklığı değişsin.</p>
          <div class="kutu hedef"><b>Hedef:</b> Pot sola gidince LED sönsün, sağa gidince en parlak yansın.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Bekle bloğunun varsayılanı 500 ms; 10 yap. Hepsi sürekli tekrarla içinde olsun.',
      },
    ],
    sahne: { parcalar: [
      { tur: 'pot', pin: 'A0', konum: [91.97, 0, 13.81] },
      { tur: 'led', pin: 'D0', renk: 'sari', konum: [56, 0, 12] }] },
    async girdi(sim) {
      for (const d of [0, 1024, 2048, 4095]) {
        sim.analog.A0 = d;
        await sim.bekle(400);
        ornekAl(sim, ['D0']);
      }
    },
    kontrol(sim) {
      const o = sim.cihaz.ornekler ?? [], hedef = [0, .25, .5, 1];
      if (o.length < 4) return { ok: false, mesaj: 'Program çok erken bitti. Her şeyi "sürekli tekrarla" içine koy.' };
      if (o.every(x => x[0] === 0)) return { ok: false, mesaj: 'LED hiç yanmadı. D0 pinine PWM yazıyor musun?' };
      const iyi = o.every((x, i) => yakinMi(x[0], hedef[i], .08));
      return iyi ? { ok: true, mesaj: 'Pot çevrildikçe LED parlaklığı değişiyor!' }
        : { ok: false, mesaj: 'Parlaklık pot ile uyuşmuyor. Harita bloğunda 0-4095 → 0-255 olmalı.' };
    },
  },
  {
    id: 'ldr-gece-lambasi',
    ad: '3.4 · Gece lambası',
    sure: 4000,
    html: `<h2>Gece lambası (LDR)</h2>
      <p>LDR bir ışık sensörüdür. Işık çoksa büyük, karanlıkta küçük bir sayı verir (0-4095). Güneşi sola çekersen karanlık olur.</p>
      <ol>
        <li><b>sürekli tekrarla</b> içine <b>eğer</b> bloğu koy.</li>
        <li>Koşul: <b>A0 analog değeri &lt; 1000</b> (karanlık).</li>
        <li>Doğruysa <b>D0 yüksek</b>, değilse <b>D0 düşük</b> yap (eğer-değilse).</li>
        <li>▶ Çalıştır. Güneş gidince LED yanmalı!</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'LDR\'yi tanı',
        html: `<p>Sahnede bir <b>LDR</b> (ışık sensörü) ve <b>sarı LED</b> var. LDR <span class="pin-etiket">A0</span> pininde, LED <span class="pin-etiket">D0</span> pininde.</p>
          <p>3B sahnede <b>güneşi sürükleyerek</b> LDR'den uzaklaştır, ortam kararsın.</p>
          <div class="kutu bilgi"><b>Aydınlık ve karanlık:</b> Işık çoksa <code>analogRead</code> büyük sayı (4095'e yakın), karanlıkta küçük sayı (0'a yakın) verir.
            <pre><code>analogRead(A0)</code></pre></div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla ve eğer',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al, içine <span class="chip akis">eğer</span> bloğunu koy.</p>
          <div class="kutu bilgi">"Değilse" kolunu eklemek için eğer bloğundaki <b>dişli simgesine</b> tıkla ve "değilse"yi içeri sürükle.
            <pre><code>if (...) {
  ...
} else {
  ...
}</code></pre></div>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }],
        ipucu: 'Eğer bloğu Akış kategorisinin sonunda. Dişli simgesi bloğun sol üstünde.',
      },
      {
        baslik: 'Eşik değeri: karanlık mı?',
        html: `<p><span class="chip mantik">Mantık</span> kategorisinden <span class="chip mantik">karşılaştır</span> bloğunu eğer'in koşuluna tak. Soldaki yuvaya <span class="chip analog">A0 analog değeri</span>, sağdaki yuvaya <span class="chip sayi">1000</span> koy. İşareti <b>&lt;</b> yap.</p>
          <div class="kutu bilgi"><b>Eşik değeri:</b> "Karanlık" ile "aydınlık" arasındaki sınır sayıdır. Biz 1000 seçtik: bunun altı karanlık.
            <pre><code>if (analogRead(A0) &lt; 1000) {</code></pre></div>`,
        vurgu: { kategori: 'Mantık', blok: 'logic_compare' },
        bitti: [{ blok: 'logic_compare', icinde: 'controls_if' }, { blok: 'dy_analog_oku' }],
        ipucu: 'A0 okuma bloğu Analog kategorisinde. Sayı için Sayı kategorisine bak.',
      },
      {
        baslik: 'LED\'i yak ve söndür',
        html: `<p>Eğer kolunun içine <span class="chip pin">D0 pinini YÜKSEK (1) yap</span>, değilse kolunun içine <span class="chip pin">D0 pinini DÜŞÜK (0) yap</span> koy. Sona <span class="chip akis">10 ms bekle</span> eklemeyi unutma.</p>
          <pre><code>digitalWrite(D0, HIGH);
...
digitalWrite(D0, LOW);</code></pre>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' }, icinde: 'controls_if' }, { blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '0' }, icinde: 'controls_if' }],
        ipucu: 'İki ayrı pin bloğu lazım: biri karanlıkta yanar, biri aydınlıkta söner.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Sonra 3B sahnede <b>güneşi LDR'den uzaklaştırıp yaklaştır</b>.</p>
          <div class="kutu hedef"><b>Hedef:</b> Karanlıkta LED yansın, aydınlıkta sönsün. Gece lambası hazır!</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'LED hep yanıksa "değilse" kolunda D0 DÜŞÜK olmalı. Hiç yanmıyorsa işaret < mi?',
      },
    ],
    sahne: { parcalar: [
      { tur: 'ldr', pin: 'A0', konum: [86.89, 0, 6.19] },
      { tur: 'led', pin: 'D0', renk: 'sari', konum: [52, 0, 12] }] },
    async girdi(sim) {
      for (const d of [3000, 300, 3000]) {
        sim.analog.A0 = d;
        await sim.bekle(600);
        ornekAl(sim, ['D0']);
      }
    },
    kontrol(sim) {
      const o = (sim.cihaz.ornekler ?? []).map(x => x[0] > .5 ? 1 : 0);
      if (o.length < 3) return { ok: false, mesaj: 'Program çok erken bitti. "sürekli tekrarla" kullan.' };
      const iyi = o[0] === 0 && o[1] === 1 && o[2] === 0;
      if (iyi) return { ok: true, mesaj: 'Karanlıkta LED yandı, aydınlıkta söndü. Gece lambası hazır!' };
      if (o.every(x => x === 0)) return { ok: false, mesaj: 'LED hiç yanmadı. Karanlıkta (değer < 1000) D0\'ı yüksek yap.' };
      if (o.every(x => x === 1)) return { ok: false, mesaj: 'LED hep yanık. Işık varken söndürmeyi unutma (değilse kolu).' };
      return { ok: false, mesaj: 'Işık varken LED sönük, karanlıkta yanık olmalı.' };
    },
  },
  {
    id: 'sicaklik-gostergesi',
    ad: '3.5 · Sıcaklık göstergesi',
    sure: 4500,
    html: `<h2>Sıcaklık alarmı</h2>
      <p>Sıcaklık sensörü A1 pininden sayı gönderir: sıcaklık arttıkça sayı büyür (0-4095). Yaklaşık <b>2500</b> üstü "çok sıcak" demektir.</p>
      <ol>
        <li><b>sürekli tekrarla</b> içine <b>eğer-değilse</b> koy.</li>
        <li>Koşul: <b>A1 analog değeri &gt; 2500</b>.</li>
        <li>Doğruysa kırmızı alarm LED'i (<b>D0</b>) yansın, değilse sönsün.</li>
        <li>▶ Çalıştır. Sıcaklık kaydırıcısı sağa gidince alarm çalmalı.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Sensörü tanı',
        html: `<p>Sahnede bir <b>sıcaklık sensörü</b> (<span class="pin-etiket">A1</span>) ve bir <b>kırmızı alarm LED'i</b> (<span class="pin-etiket">D0</span>) var.</p>
          <p>3B sahnede <b>sıcaklık kaydırıcısını sürükle</b>: sağa gittikçe ortam ısınır.</p>
          <div class="kutu bilgi">Sıcaklık arttıkça <code>analogRead(A1)</code> sayısı büyür (0-4095). Yaklaşık <b>2500</b>'ün üstüne "çok sıcak" diyeceğiz. Bu sayı bizim <b>eşik değerimiz</b>.</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Döngü ve eğer-değilse',
        html: `<p><span class="chip akis">sürekli tekrarla</span> bloğunun içine <span class="chip akis">eğer</span> bloğunu koy. Dişli simgesiyle "değilse" kolunu da ekle.</p>
          <pre><code>if (...) {
  ...
} else {
  ...
}</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'controls_if', icinde: 'dy_surekli' }],
        ipucu: 'İkisi de Akış kategorisinde.',
      },
      {
        baslik: 'Koşul: A1 > 2500',
        html: `<p><span class="chip mantik">karşılaştır</span> bloğunu eğer'e tak. Sol yuvaya <span class="chip analog">analog değeri</span> bloğunu koy ve pini <span class="pin-etiket">A1</span> yap. Sağ yuvaya <span class="chip sayi">2500</span> yaz, işareti <b>&gt;</b> seç.</p>
          <pre><code>if (analogRead(A1) &gt; 2500) {</code></pre>
          <div class="kutu dikkat">Pini A0 bırakma! Sıcaklık sensörü A1'e bağlı.</div>`,
        vurgu: { kategori: 'Mantık', blok: 'logic_compare' },
        bitti: [{ blok: 'logic_compare', icinde: 'controls_if' }, { blok: 'dy_analog_oku', alan: { PIN: 'A1' } }],
        ipucu: 'Analog okuma bloğundaki pin listesinden A1 seç.',
      },
      {
        baslik: 'Alarmı yak ve söndür',
        html: `<p>Doğruysa kolunda <span class="chip pin">D0 YÜKSEK</span>, değilse kolunda <span class="chip pin">D0 DÜŞÜK</span> olsun. Sona <span class="chip akis">10 ms bekle</span> ekle.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' }, icinde: 'controls_if' }, { blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '0' }, icinde: 'controls_if' }],
        ipucu: 'Pin bloğunu iki kez alıp birinde değeri DÜŞÜK (0) yap.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas, sonra <b>sıcaklık kaydırıcısını</b> sağa sola çek.</p>
          <div class="kutu hedef"><b>Hedef:</b> Sıcaklık yükselince alarm LED'i yansın, soğuyunca sönsün.</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Alarm hiç çalmıyorsa pin A1 mi ve işaret &gt; mü diye bak.',
      },
    ],
    sahne: { parcalar: [
      { tur: 'sicaklik', pin: 'A1', konum: [86.89, 0, 6.19] },
      { tur: 'led', pin: 'D0', renk: 'kirmizi', konum: [52, 0, 12] }] },
    async girdi(sim) {
      for (const d of [1200, 3300, 1500]) {
        sim.analog.A1 = d;
        await sim.bekle(600);
        ornekAl(sim, ['D0']);
      }
    },
    kontrol(sim) {
      const o = (sim.cihaz.ornekler ?? []).map(x => x[0] > .5 ? 1 : 0);
      if (o.length < 3) return { ok: false, mesaj: 'Program çok erken bitti. "sürekli tekrarla" kullan.' };
      if (o[0] === 0 && o[1] === 1 && o[2] === 0) return { ok: true, mesaj: 'Sıcak olunca alarm çalıyor, soğuyunca duruyor!' };
      if (o.every(x => x === 0)) return { ok: false, mesaj: 'Alarm hiç çalmadı. A1 > 2500 olunca D0 yüksek olmalı.' };
      if (o.every(x => x === 1)) return { ok: false, mesaj: 'Alarm hep yanık. Soğuyunca D0\'ı düşük yap.' };
      return { ok: false, mesaj: 'Sıcakken LED yanık, soğukken sönük olmalı.' };
    },
  },
  {
    id: 'led-cubugu',
    ad: '3.6 · LED çubuğu',
    sure: 4500,
    html: `<h2>LED çubuğu: seviye göstergesi</h2>
      <p>8 LED'lik çubuk D0'dan D7'ye bağlı. Potu çevirince yanan LED sayısı değişsin (ses seviyesi göstergesi gibi).</p>
      <ol>
        <li><b>sürekli tekrarla</b> bloğunu al.</li>
        <li>İçine <b>LED çubuğu</b> bloğunu koy: D0'dan başlayan <b>8</b> LED.</li>
        <li>Seviye yerine <b>harita</b> tak: A0 oku, 0-4095 aralığını <b>0-8</b>'e çevir.</li>
        <li>Sona <b>10 ms bekle</b>. ▶ Çalıştır, potu çevir.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Çubuğu tanı',
        html: `<p>Sahnede <b>8 LED'lik çubuk</b> var, <span class="pin-etiket">D0</span>'dan <span class="pin-etiket">D7</span>'ye bağlı. Yanında <span class="pin-etiket">A0</span> pininde bir potansiyometre duruyor.</p>
          <p>Pot çevrildikçe yanan LED sayısı artacak, tıpkı bir ses seviyesi göstergesi gibi. 3B sahnede <b>potun topuzunu fareyle döndürerek</b> sonucu deneyeceksin.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al. Pot hep okunmalı.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'LED çubuğu bloğu',
        html: `<p><span class="chip analog">Analog</span> kategorisinden <span class="chip analog">LED çubuğu</span> bloğunu döngünün içine koy: <span class="pin-etiket">D0</span>'dan başlayan <b>8</b> LED.</p>
          <div class="kutu bilgi">Blok arkada küçük bir döngü çalıştırır: seviye kadar LED yanar, kalanı söner.
            <pre><code>for (int i = 0; i &lt; 8; i++) {
  digitalWrite(D0 + i, i &lt; seviye ? HIGH : LOW);
}</code></pre></div>`,
        vurgu: { kategori: 'Analog', blok: 'dy_analog_cubuk' },
        bitti: { blok: 'dy_analog_cubuk', icinde: 'dy_surekli' },
        ipucu: 'Bloğun başlangıç pini D0, LED sayısı 8 olsun.',
      },
      {
        baslik: 'Seviyeyi pottan al',
        html: `<p>Seviye yuvasına <span class="chip analog">harita</span> bloğunu tak. Pot 0-4095 verir, çubuk ise 0-8 LED gösterir. Bu yüzden harita bloğunun son sayısını <b>255</b> yerine <b>8</b> yap.</p>
          <pre><code>map(analogRead(A0), 0, 4095, 0, 8)</code></pre>
          <div class="kutu dikkat">Sadece son sayıyı değiştir: 0-4095 aynı kalacak, hedef aralık 0-8 olacak.</div>`,
        vurgu: { kategori: 'Analog', blok: 'dy_harita' },
        bitti: [{ blok: 'dy_harita', icinde: 'dy_analog_cubuk' }, { blok: 'dy_analog_oku' }],
        ipucu: 'Harita bloğunun en sağdaki sayı kutusuna tıkla ve 8 yaz.',
      },
      {
        baslik: 'Bekle ve çalıştır',
        html: `<p>Çubuk bloğunun altına <span class="chip akis">10 ms bekle</span> ekle, ▶ <b>Çalıştır</b>'a bas ve <b>pot topuzunu fareyle döndür</b>.</p>
          <div class="kutu hedef"><b>Hedef:</b> Pot sola gidince LED'ler sönsün, sağa gittikçe çubuk dolsun.</div>`,
        vurgu: { parca: 1 },
        bitti: { basari: true },
        ipucu: 'Çubuk dolmuyorsa harita bloğundaki son sayının 8 olduğunu kontrol et.',
      },
    ],
    sahne: { parcalar: [
      { tur: 'led-cubugu', pinler: D8, konum: [76, 0, -10] },
      { tur: 'pot', pin: 'A0', konum: [61.49, 0, 13.81] }] },
    async girdi(sim) {
      for (const d of [0, 2048, 4095, 1024]) {
        sim.analog.A0 = d;
        await sim.bekle(400);
        ornekAl(sim, D8);
      }
    },
    kontrol(sim) {
      const o = (sim.cihaz.ornekler ?? []).map(x => x.filter(p => p > .5).length), hedef = [0, 4, 8, 2];
      if (o.length < 4) return { ok: false, mesaj: 'Program çok erken bitti. "sürekli tekrarla" kullan.' };
      if (o.every(n => n === 0)) return { ok: false, mesaj: 'Hiç LED yanmadı. LED çubuğu bloğuna seviye ver.' };
      const iyi = o.every((n, i) => Math.abs(n - hedef[i]) <= 1);
      return iyi ? { ok: true, mesaj: 'Pot çevrildikçe çubuk dolup boşalıyor!' }
        : { ok: false, mesaj: 'Seviye pot ile uyuşmuyor. Harita bloğunda 0-4095 → 0-8 olmalı.' };
    },
  },
];

// ───────────────────────── GÖREVLER sekmesi ─────────────────────────
// Kod görevleri artan zorlukta; kontroller yalnızca davranışa (sim.olaylar / sim.pin / sim.cihaz) bakar.

/** Analog girdiyi sırayla değiştirir, her değişimden sonra bekleyip pinleri örnekler. */
const orn = (pin, degerler, pinler = ['D0'], bekle = 400) => async sim => {
  for (const d of degerler) { sim.analog[pin] = d; await sim.bekle(bekle); ornekAl(sim, pinler); }
};

/** Örneklenen D0 parlaklıklarını hedeflerle karşılaştırır (ikili: yanık/sönük anlatımı). */
function ornekDenetle(sim, pin, degerler, hedef, tol, ikili) {
  const o = (sim.cihaz.ornekler ?? []).map(x => x[0]);
  if (o.length < degerler.length) return { ok: false, mesaj: 'Program çok erken bitti. Her şeyi "sürekli tekrarla" içine koy.' };
  if (hedef.some(h => h > .5) && o.every(x => x < .02)) return { ok: false, mesaj: 'LED hiç yanmadı. D0 pinine yazdığından emin ol.' };
  for (let i = 0; i < degerler.length; i++) {
    if (yakinMi(o[i], hedef[i], tol)) continue;
    const bekl = ikili ? (hedef[i] > .5 ? 'yanmalıydı' : 'sönük olmalıydı') : `%${Math.round(hedef[i] * 100)} parlaklıkta olmalıydı (şu an %${Math.round(o[i] * 100)})`;
    return { ok: false, mesaj: `${pin} = ${degerler[i]} iken LED ${bekl}.` };
  }
  return { ok: true };
}
const sonuc = (s, basari) => (s.ok ? { ok: true, mesaj: basari } : s);

/** RGB LED'in zaman içindeki durumlarını (en az minSure ms kalanlar) saf renk adlarına çevirir. */
function renkSirasi(sim, minSure) {
  const pinler = ['D0', 'D1', 'D2'], d = [0, 0, 0], parca = [];
  let son = 0;
  for (const o of sim.olaylar) {
    const i = pinler.indexOf(o.pin); if (i < 0) continue;
    parca.push({ d: [...d], sure: o.t - son }); d[i] = o.deger; son = o.t;
  }
  parca.push({ d: [...d], sure: sim.t - son });
  const ad = ([r, g, b]) => (r > .8 && g < .1 && b < .1 ? 'kirmizi' : g > .8 && r < .1 && b < .1 ? 'yesil' : b > .8 && r < .1 && g < .1 ? 'mavi' : null);
  return parca.filter(p => p.sure >= minSure).map(p => ad(p.d)).filter(Boolean);
}

function cubukDenetle(sim, degerler, hedef, tol) {
  const o = (sim.cihaz.ornekler ?? []).map(x => x.filter(p => p > .5).length);
  if (o.length < degerler.length) return { ok: false, mesaj: 'Program çok erken bitti. "sürekli tekrarla" kullan.' };
  if (hedef.some(h => h > 0) && o.every(n => n === 0)) return { ok: false, mesaj: 'Hiç LED yanmadı. Çubuğa seviye ver.' };
  for (let i = 0; i < degerler.length; i++) {
    if (Math.abs(o[i] - hedef[i]) > tol) return { ok: false, mesaj: `A0 = ${degerler[i]} iken ${hedef[i]} LED yanmalıydı, ${o[i]} LED yanıyor.` };
  }
  return { ok: true };
}

const GOREVLER = {
  'rgb-led': [
    {
      tip: 'kod', baslik: 'Sarı yap',
      metin: `<p>Sarı, kırmızı ve yeşil ışığın karışımıdır. RGB LED <b>sarı</b> yansın: <span class="pin-etiket">D0</span> (kırmızı) ve <span class="pin-etiket">D1</span> (yeşil) tam parlak, <span class="pin-etiket">D2</span> (mavi) sönük olsun.</p>`,
      ipucu: 'Mor için kırmızı + mavi karıştırmıştın. Şimdi hangi iki rengi karıştırmalısın?',
      kontrol(sim) {
        const [r, g, b] = ['D0', 'D1', 'D2'].map(p => sim.pin[p].pwm);
        if (r > .8 && g > .8 && b < .1) return { ok: true, mesaj: 'Parlak sarı! Kırmızı + yeşil = sarı.' };
        if (b > .1) return { ok: false, mesaj: 'Mavi (D2) sönük olmalı, yoksa renk sarıdan uzaklaşır.' };
        if (r < .8) return { ok: false, mesaj: 'Kırmızı (D0) tam parlak (255) olmalı.' };
        return { ok: false, mesaj: 'Yeşil (D1) tam parlak (255) olmalı.' };
      },
    },
    {
      tip: 'soru', soru: 'RGB LED\'de <b>kırmızı ve yeşil tam parlak, mavi sönük</b> olursa hangi renk görünür?',
      secenekler: ['Mor', 'Sarı', 'Turkuaz (camgöbeği)', 'Beyaz'], dogru: 1,
      aciklama: 'Işıkta kırmızı + yeşil = sarı. Kırmızı + mavi mor, yeşil + mavi turkuaz, üçü birden beyaz verir.',
    },
    {
      tip: 'kod', baslik: 'Turuncu yap',
      metin: `<p>Turuncu, kırmızıya biraz yeşil katınca olur. <span class="pin-etiket">D0</span> tam parlak (255), <span class="pin-etiket">D1</span> <b>yarı parlak</b> (yaklaşık 128), <span class="pin-etiket">D2</span> sönük olsun.</p>`,
      ipucu: 'Yeşili tam açarsan sarı olur. Yeşilin değerini 0 ile 255 arasında bir yere koy.',
      kontrol(sim) {
        const [r, g, b] = ['D0', 'D1', 'D2'].map(p => sim.pin[p].pwm);
        if (r > .8 && g > .3 && g < .7 && b < .1) return { ok: true, mesaj: 'Turuncu oldu! Yeşili azaltınca renk sarıdan turuncuya kaydı.' };
        if (b > .1) return { ok: false, mesaj: 'Mavi (D2) sönük kalmalı.' };
        if (r < .8) return { ok: false, mesaj: 'Kırmızı (D0) tam parlak (255) olmalı.' };
        return { ok: false, mesaj: g >= .7 ? 'Yeşil çok parlak, renk sarıya döndü. D1\'i yaklaşık 128 yap.' : 'Yeşil çok az, renk kırmızıya yakın kaldı. D1\'i yaklaşık 128 yap.' };
      },
    },
    {
      tip: 'soru', soru: '<code>analogWrite(D1, 0);</code> komutu RGB LED\'de ne yapar?',
      secenekler: ['Yeşil ışığı söndürür', 'Yeşil ışığı tam parlak yapar', 'D1 pinini giriş yapar', 'LED\'in tamamını kapatır'], dogru: 0,
      aciklama: 'PWM değeri 0 ise o renk hiç yanmaz. Diğer iki renk (D0, D2) etkilenmez, onlar kendi değerlerine göre yanmaya devam eder.',
    },
    {
      tip: 'kod', baslik: 'Yumuşak beyaz',
      metin: `<p>Üç rengi de <b>aynı ve orta parlaklıkta</b> (yaklaşık 128) yak. Çıkan renk gözü yormayan soluk bir beyaz olsun.</p>`,
      ipucu: 'Beyaz için üç kanal eşit olmalı. "Orta parlaklık" 0 ile 255 arasının neresi?',
      kontrol(sim) {
        const c = ['D0', 'D1', 'D2'].map(p => sim.pin[p].pwm), mx = Math.max(...c), mn = Math.min(...c);
        if (mx - mn > .1) return { ok: false, mesaj: 'Üç rengin değeri birbirine yakın olmalı, yoksa renkli görünür.' };
        if (mx > .7) return { ok: false, mesaj: 'Çok parlak. Üç değeri de yaklaşık 128 yap.' };
        if (mn < .3) return { ok: false, mesaj: 'Çok sönük. Üç değeri de yaklaşık 128 yap.' };
        return { ok: true, mesaj: 'Soluk beyaz! Eşit karışım beyaz, düşük değer ise daha az parlak.' };
      },
    },
    {
      tip: 'soru', soru: 'Bir renk kanalına <code>analogWrite</code> ile 0\'dan 255\'e kadar yazabiliyoruz. Bir kanal <b>kaç farklı parlaklık düzeyi</b> gösterebilir?',
      secenekler: ['128', '255', '512', '256'], dogru: 3,
      aciklama: '0 ile 255 arasında 256 sayı vardır (0 da sayılır). Bir RGB LED\'in üç kanalı 256 × 256 × 256 farklı renk üretebilir.',
    },
    {
      tip: 'kod', baslik: 'Kırmızı, yeşil, mavi sırayla', sure: 3000,
      metin: `<p>LED sırayla <b>kırmızı, yeşil, mavi</b> yansın. Her renk en az yarım saniye <code>delay(500)</code> kadar görünsün. Renkler saf olmalı: bir renk yanarken diğer ikisi sönük.</p>`,
      ipucu: 'Bir rengi yakınca ötekilerin 0 olduğundan emin ol, sonra bekle ve sıradaki renge geç.',
      kontrol(sim) {
        const s = renkSirasi(sim, 250), eks = [];
        let i = 0;
        for (const r of ['kirmizi', 'yesil', 'mavi']) {
          const j = s.indexOf(r, i);
          if (j < 0) eks.push({ kirmizi: 'kırmızı', yesil: 'yeşil', mavi: 'mavi' }[r]); else i = j + 1;
        }
        if (!eks.length) return { ok: true, mesaj: 'Kırmızı, yeşil, mavi sırayla yandı!' };
        if (!s.length) return { ok: false, mesaj: 'Hiç saf renk görünmedi. Bir renk yanarken diğer ikisi 0 olmalı ve renk en az 250 ms kalmalı (bekle bloğu ekle).' };
        return { ok: false, mesaj: `Sırada eksik ya da yanlış yerde: ${eks.join(', ')}. Sıra kırmızı, yeşil, mavi olmalı ve her biri bekleme ile görünmeli.` };
      },
    },
    {
      tip: 'soru', soru: 'Üç rengin de PWM değeri <b>128</b> ise LED nasıl görünür?',
      secenekler: ['Koyu mavi', 'Kırmızı', 'Soluk beyaz (açık gri)', 'Tamamen sönük'], dogru: 2,
      aciklama: 'Üç renk eşit karışınca beyaz oluşur. Değer yarım olduğu için parlaklık da yarıdır, yani soluk beyaz.',
    },
  ],

  'pwm-parlaklik': [
    {
      tip: 'kod', baslik: 'Yarım parlaklık', sure: 1500,
      metin: `<p><span class="pin-etiket">D0</span> LED\'i <b>yarım parlaklıkta</b> sabit yak. Tam parlak (255) değil, aralığın ortası.</p>`,
      ipucu: '0 sönük, 255 tam parlak. Yarısı kaç eder?',
      kontrol(sim) {
        const p = sim.pin.D0.pwm;
        if (p < .02) return { ok: false, mesaj: 'LED sönük. D0 pinine PWM ile bir değer yaz.' };
        if (p > .55) return { ok: false, mesaj: `LED çok parlak (%${Math.round(p * 100)}). Yarım parlaklık için yaklaşık 128 yaz.` };
        if (p < .45) return { ok: false, mesaj: `LED fazla sönük (%${Math.round(p * 100)}). Yarım parlaklık için yaklaşık 128 yaz.` };
        return { ok: true, mesaj: 'Tam yarım parlaklık!' };
      },
    },
    {
      tip: 'soru', soru: '<b>PWM</b> kısaltması neyin baş harfleridir?',
      secenekler: ['Power Wire Mode', 'Pin Write Memory', 'Pulse Width Modulation (darbe genişliği ayarı)', 'Program Wait Method'], dogru: 2,
      aciklama: 'PWM, pini çok hızlı açıp kapatır ve açık kalma süresini (darbe genişliğini) değiştirerek parlaklığı ayarlar.',
    },
    {
      tip: 'kod', baslik: 'Sadece parlayıp kal',
      metin: `<p>LED <b>0\'dan 255\'e yavaşça parlasın</b> ve tam parlak halde kalsın. Bu sefer geri sönme olmasın.</p>`,
      ipucu: 'Derste yaptığın iki döngüden yalnızca birine ihtiyacın var. Hangisi?',
      kontrol(sim) {
        const v = sim.olaylar.filter(o => o.pin === 'D0').map(o => o.deger);
        if (!v.length) return { ok: false, mesaj: 'D0 pinine hiç PWM yazılmadı.' };
        if (enUzunKosu(v, 1) < 15) return { ok: false, mesaj: 'LED yumuşakça parlamıyor. 0\'dan 255\'e küçük adımlarla say ve her adımda PWM yaz.' };
        if (enUzunKosu(v, -1) >= 3) return { ok: false, mesaj: 'LED sönmeye başlıyor. Sönme döngüsünü kaldır, parlak kalsın.' };
        if (sim.pin.D0.pwm < .95) return { ok: false, mesaj: 'Sonunda LED tam parlak (255) olmalı.' };
        return { ok: true, mesaj: 'LED yavaşça parladı ve tam parlak kaldı.' };
      },
    },
    {
      tip: 'soru', soru: '<code>analogWrite(D0, 64);</code> LED\'i yaklaşık yüzde kaç parlaklıkta yakar?',
      secenekler: ['%25', '%64', '%50', '%100'], dogru: 0,
      aciklama: '64 / 255 yaklaşık 0,25 eder. Yani tam parlaklığın dörtte biri, yaklaşık %25.',
    },
    {
      tip: 'kod', baslik: 'Yavaş yavaş sönen LED',
      metin: `<p>Bu kez LED <b>tam parlak başlasın</b> ve 255\'ten 0\'a <b>yavaşça sönsün</b>. Sönünce kapalı kalsın (parlama olmasın).</p>`,
      ipucu: 'Döngü 255\'ten başlayıp 5\'er 5\'er azalmalı; her adımda küçük bir bekleme olsun.',
      kontrol(sim) {
        const v = sim.olaylar.filter(o => o.pin === 'D0').map(o => o.deger);
        if (!v.length) return { ok: false, mesaj: 'D0 pinine hiç PWM yazılmadı.' };
        if (v[0] < .9) return { ok: false, mesaj: 'LED tam parlak başlamalı: ilk değer 255 civarı olmalı.' };
        if (enUzunKosu(v, -1) < 15) return { ok: false, mesaj: 'LED yumuşakça sönmüyor. 255\'ten 0\'a küçük adımlarla say.' };
        if (enUzunKosu(v, 1) >= 3) return { ok: false, mesaj: 'LED tekrar parlıyor. Sadece sönme olmalı.' };
        if (sim.pin.D0.pwm > .05) return { ok: false, mesaj: 'Sonunda LED tamamen sönmeli (0).' };
        return { ok: true, mesaj: 'LED tam parlaklıktan yavaşça söndü.' };
      },
    },
    {
      tip: 'soru', soru: 'Parlama döngüsündeki <code>delay(20)</code> kaldırılırsa ne olur?',
      secenekler: ['LED daha parlak olur', 'Parlama o kadar hızlı biter ki gözle fark edilmez', 'Program derlenmez', 'LED hiç yanmaz'], dogru: 1,
      aciklama: '52 adım birkaç milisaniyede biter. Bekleme, her parlaklık düzeyinin gözümüzün görebileceği kadar süre kalmasını sağlar.',
    },
    {
      tip: 'kod', baslik: 'İki kez nefes al', sure: 5000,
      metin: `<p>LED <b>iki kez</b> art arda yumuşakça parlayıp sönsün (parla, sön, parla, sön). Her seferinde tam parlaklığa (255) çıksın.</p>`,
      ipucu: 'Parlama ve sönme döngülerini ikinci kez tekrarla ya da hepsini bir dış döngünün içine al.',
      kontrol(sim) {
        const v = sim.olaylar.filter(o => o.pin === 'D0').map(o => o.deger);
        if (!v.length) return { ok: false, mesaj: 'D0 pinine hiç PWM yazılmadı.' };
        if (enUzunKosu(v, 1) < 15) return { ok: false, mesaj: 'LED yumuşakça parlamıyor. Küçük adımlarla say.' };
        if (enUzunKosu(v, -1) < 15) return { ok: false, mesaj: 'LED yumuşakça sönmüyor. 255\'ten 0\'a sayan bir döngü ekle.' };
        let tepe = 0;
        v.forEach((x, i) => { if (x >= .95 && (i === 0 || v[i - 1] < .95)) tepe++; });
        if (tepe < 2) return { ok: false, mesaj: `LED yalnızca ${tepe} kez tam parladı. Parla-sön hareketini iki kez yaptır.` };
        return { ok: true, mesaj: 'LED iki kez nefes aldı!' };
      },
    },
  ],

  'potansiyometre': [
    {
      tip: 'kod', baslik: 'Ters çalışsın',
      metin: `<p>Pot <b>sola</b> (değer küçük) giderken LED <b>tam parlak</b>, pot <b>sağa</b> (<span class="pin-etiket">A0</span> büyük) gittikçe LED <b>sönsün</b>. Yani ters orantılı.</p>`,
      ipucu: 'Harita bloğunun çıkış aralığını ters çevirebilirsin ya da 255\'ten çıkarma yapabilirsin.',
      girdi: orn('A0', [0, 1024, 2048, 4095]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A0', [0, 1024, 2048, 4095], [1, .75, .5, 0], .1), 'Pot sağa gittikçe LED sönüyor, ters çalışıyor!');
      },
    },
    {
      tip: 'soru', soru: 'ESP32-S3\'te <code>analogRead</code> çözünürlüğü 12 bittir. Okunabilecek <b>en büyük değer</b> kaçtır?',
      secenekler: ['255', '1023', '4095', '65535'], dogru: 2,
      aciklama: '12 bit = 2 üzeri 12 = 4096 değer demektir, 0\'dan 4095\'e kadar. 255 8 bite, 1023 10 bite karşılık gelir.',
    },
    {
      tip: 'kod', baslik: 'En fazla yarı parlak',
      metin: `<p>LED en fazla <b>yarım parlaklığa</b> çıksın: pot tamamen sağdayken bile LED yarım güçte yansın (yaklaşık 127). Pot sola gidince yine sönsün.</p>`,
      ipucu: 'Harita bloğundaki hedef aralığın üst sınırı 255 yerine ne olmalı?',
      girdi: orn('A0', [0, 1024, 2048, 4095]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A0', [0, 1024, 2048, 4095], [0, .125, .25, .5], .07), 'LED en fazla yarım parlaklıkta kalıyor!');
      },
    },
    {
      tip: 'soru', soru: 'Pot değerini LED parlaklığına çevirmek için neden <b>map</b> (harita) kullanırız?',
      secenekler: ['Okunan aralık (0-4095) ile yazılabilen aralık (0-255) farklı olduğu için', 'Pot yavaş olduğu için', 'LED yalnızca map ile yandığı için', 'map, delay yerine geçtiği için'], dogru: 0,
      aciklama: '<code>map</code> bir sayıyı bir aralıktan başka bir aralığa orantılı çevirir. 4095\'i doğrudan analogWrite\'a verirsek 255 sınırı aşılır.',
    },
    {
      tip: 'kod', baslik: 'Eşikli lamba',
      metin: `<p>Parlaklık ayarı yok: pot <b>ortadan (yaklaşık 2048) sağa</b> geçince LED <b>tam parlak</b> yansın, ortadan solda iken <b>sönük</b> kalsın. Pot bir anahtar gibi davransın.</p>`,
      ipucu: 'Bu kez map yerine "eğer … büyükse" kullan. Eşik değeri pot tam ortası olsun.',
      girdi: orn('A0', [500, 1500, 2600, 4000]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A0', [500, 1500, 2600, 4000], [0, 0, 1, 1], .1), 'Pot ortayı geçince lamba tam yanıyor, solda sönük!');
      },
    },
    {
      tip: 'soru', soru: 'Pot tam ortadayken <code>analogRead(A0)</code> yaklaşık kaç okur?',
      secenekler: ['0', '4095', '1024', '2048'], dogru: 3,
      aciklama: 'Aralık 0-4095 olduğundan tam ortası yaklaşık 2048\'dir. Bu değeri <code>map</code> ile 0-255\'e çevirirsen 127 civarı çıkar.',
    },
    {
      tip: 'kod', baslik: 'Üç seviyeli lamba',
      metin: `<p>Pot aralığını üçe böl. Değer <b>1365\'ten küçükse LED sönük</b>, <b>1365 ile 2730 arasında yarım parlak</b> (yaklaşık 128), <b>2730\'dan büyükse tam parlak</b> (255) olsun.</p>`,
      ipucu: 'Önce büyük eşiği kontrol eden bir eğer, değilse kolunda ikinci bir eğer kullanabilirsin.',
      girdi: orn('A0', [500, 2000, 3500]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A0', [500, 2000, 3500], [0, .5, 1], .1), 'Üç seviye de doğru: sönük, yarım, tam!');
      },
    },
  ],

  'ldr-gece-lambasi': [
    {
      tip: 'kod', baslik: 'Gündüz lambası (ters)',
      metin: `<p>Mantığı ters çevir: ortam <b>aydınlıkken</b> LED <b>yansın</b>, <b>karanlıkta</b> sönsün. (Güneş paneli göstergesi gibi!) Eşik yine 1000 olabilir.</p>`,
      ipucu: 'Karşılaştırma işaretini ters çevirmek yeterli: küçüktür yerine ne?',
      girdi: orn('A0', [3000, 300, 3000]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A0', [3000, 300, 3000], [1, 0, 1], .1, true), 'Işık varken LED yanıyor, karanlıkta sönüyor!');
      },
    },
    {
      tip: 'soru', soru: 'Kodda <b>eşik değeri</b> ne işe yarar?',
      secenekler: ['Işığın rengini seçer', 'Karar verirken kullandığımız sınır sayıdır', 'LED\'in en büyük parlaklığını belirler', 'Pinin adını değiştirir'], dogru: 1,
      aciklama: 'Eşik, "karanlık mı aydınlık mı?" kararını veren sınırdır. Sensör değeri bu sayının altındaysa bir şey yapar, üstündeyse başka bir şey yapar.',
    },
    {
      tip: 'kod', baslik: 'Daha erken yansın (eşik 2000)',
      metin: `<p>Lamba akşam alacakaranlığında da yansın: eşik değerini yükselt. A0 değeri <b>2000\'in altına</b> düşünce LED yansın, 2000 ve üstünde sönük olsun.</p>`,
      ipucu: 'Karşılaştırma bloğundaki 1000 sayısını değiştir. Hangi sayı 1800\'ü "karanlık" sayar ama 2500\'ü saymaz?',
      girdi: orn('A0', [500, 1500, 2500, 1800]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A0', [500, 1500, 2500, 1800], [1, 1, 0, 1], .1, true), 'Eşik yükseldi, lamba alacakaranlıkta da yanıyor!');
      },
    },
    {
      tip: 'soru', soru: 'LDR\'ye daha çok ışık düştükçe <b>direnci</b> ne olur?',
      secenekler: ['Artar', 'Değişmez', 'Hep 1 kΩ olur', 'Azalır'], dogru: 3,
      aciklama: 'LDR ışık arttıkça iletkenleşir, direnci düşer. Direnç bölücü bir devrede bu, A0 pinindeki gerilimin (ve okunan sayının) değişmesini sağlar.',
    },
    {
      tip: 'kod', baslik: 'Otomatik parlaklık',
      metin: `<p>LED artık sadece yanıp sönmesin: ortam ne kadar karanlıksa LED o kadar <b>parlak</b> yansın. A0 = 0 (zifiri karanlık) iken tam parlak (255), A0 = 4095 (çok aydınlık) iken sönük olsun.</p>`,
      ipucu: 'Harita bloğunu kullan: giriş 0-4095, çıkış 255\'ten 0\'a doğru (ters sıra).',
      girdi: orn('A0', [0, 2048, 4095]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A0', [0, 2048, 4095], [1, .5, 0], .1), 'Karanlıkta daha parlak yanan akıllı lamba!');
      },
    },
    {
      tip: 'soru', soru: '<code>if (analogRead(A0) &lt; 1000) { digitalWrite(D0, HIGH); } else { digitalWrite(D0, LOW); }</code> kodunda A0 = 300 ise LED ne yapar?',
      secenekler: ['Söner', 'Yarım parlak yanar', 'Yanar', 'Yanıp söner'], dogru: 2,
      aciklama: '300, 1000\'den küçük olduğu için koşul doğrudur ve D0 YÜKSEK olur. LED yanar.',
    },
    {
      tip: 'kod', baslik: 'Karanlıkta yanıp sönen uyarı', sure: 5000,
      metin: `<p>Karanlıkta LED sabit yanmasın, <b>yanıp sönsün</b> (yaklaşık yarım saniye açık, yarım saniye kapalı). Işık geri gelince LED <b>sönük</b> kalsın.</p>`,
      ipucu: 'Eğer kolunun içine yak, bekle, söndür, bekle koy. Değilse kolunda LED\'i söndür.',
      girdi: async sim => {
        sim.analog.A0 = 3000; await sim.bekle(600);
        const bas = sim.olaylar.length;
        sim.analog.A0 = 300; await sim.bekle(2400);
        sim.cihaz.pencere = { bas, bit: sim.olaylar.length };
        sim.analog.A0 = 3000; await sim.bekle(1200);
        ornekAl(sim, ['D0']);
      },
      kontrol(sim) {
        const p = sim.cihaz.pencere, o = sim.cihaz.ornekler;
        if (!p || !o) return { ok: false, mesaj: 'Program çok erken bitti. Her şeyi "sürekli tekrarla" içine koy.' };
        if (sim.olaylar.slice(0, p.bas).some(e => e.pin === 'D0' && e.deger > .5)) return { ok: false, mesaj: 'Işık varken LED yanmamalı.' };
        const ev = sim.olaylar.slice(p.bas, p.bit).filter(e => e.pin === 'D0');
        if (ev.length < 3) return { ok: false, mesaj: ev.length ? 'LED yeterince yanıp sönmedi. Yak, bekle, söndür, bekle sırasını eğer kolunun içine koy.' : 'Karanlıkta LED yanıp sönmedi. Karanlık kolunda LED\'i önce yak, sonra söndür.' };
        if (o[0][0] > .5) return { ok: false, mesaj: 'Işık geri gelince LED sönük kalmalı.' };
        return { ok: true, mesaj: 'Karanlıkta yanıp sönüyor, ışıkta sönük kalıyor!' };
      },
    },
  ],

  'sicaklik-gostergesi': [
    {
      tip: 'kod', baslik: 'Erken uyarı (eşik 2000)',
      metin: `<p>Alarm daha erken çalsın: <span class="pin-etiket">A1</span> değeri <b>2000\'i geçince</b> <span class="pin-etiket">D0</span> alarm LED\'i yansın, altında sönük olsun.</p>`,
      ipucu: 'Karşılaştırma bloğundaki eşik sayısını düşür. 1800\'de alarm olmamalı, 2200\'de olmalı.',
      girdi: orn('A1', [1500, 2200, 3000, 1800]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A1', [1500, 2200, 3000, 1800], [0, 1, 1, 0], .1, true), 'Alarm artık 2000 üstünde çalıyor!');
      },
    },
    {
      tip: 'soru', soru: '<code>analogRead(A1) &gt; 2500</code> ifadesi sıcaklık sensörü için ne söyler?',
      secenekler: ['Sıcaklık eşiğin altında', 'Sensörden okunan sayı 2500\'den büyük, yani sıcaklık yüksek', 'A1 pini çıkış yapılmış', 'LED zaten yanıyor'], dogru: 1,
      aciklama: 'Bu sensörde sıcaklık arttıkça sayı büyür. Koşul, sayının eşiği aşıp aşmadığını kontrol eder.',
    },
    {
      tip: 'kod', baslik: 'Soğuk alarmı',
      metin: `<p>Bu kez <b>soğuk</b> uyarısı yapalım (buzdolabı gibi). <span class="pin-etiket">A1</span> değeri <b>1000\'in altına</b> inince LED yansın, 1000 ve üstünde sönük olsun.</p>`,
      ipucu: 'Önceki alarmın işaretini ve eşik sayısını değiştirmen yeter.',
      girdi: orn('A1', [500, 2000, 3500, 800]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A1', [500, 2000, 3500, 800], [1, 0, 0, 1], .1, true), 'Soğuyunca alarm çalıyor, ısınınca susuyor!');
      },
    },
    {
      tip: 'soru', soru: 'ESP32-S3\'in 12 bitlik ADC\'si toplam <b>kaç farklı değer</b> okuyabilir?',
      secenekler: ['256', '1024', '4096', '4095'], dogru: 2,
      aciklama: '2 üzeri 12 = 4096 farklı değer vardır: 0\'dan 4095\'e kadar. En büyük değer 4095 olsa da değer sayısı 4096\'dır.',
    },
    {
      tip: 'kod', baslik: 'Sıcaklıkla parlaklık',
      metin: `<p>Alarm yerine bir <b>sıcaklık göstergesi</b> yap: <span class="pin-etiket">A1</span> değeri arttıkça LED\'in parlaklığı da <b>kademeli</b> artsın. A1 = 0 iken sönük, A1 = 4095 iken tam parlak olsun.</p>`,
      ipucu: 'Potansiyometre dersindeki harita bloğunu hatırla; bu sefer A1\'i oku.',
      girdi: orn('A1', [0, 1024, 2048, 4095]),
      kontrol(sim) {
        return sonuc(ornekDenetle(sim, 'A1', [0, 1024, 2048, 4095], [0, .25, .5, 1], .08), 'Sıcaklık arttıkça LED de parlıyor!');
      },
    },
    {
      tip: 'soru', soru: 'Alarm kodunda <b>değilse</b> kolu (<code>else</code>) hiç yazılmazsa ve sıcaklık sonradan düşerse ne olur?',
      secenekler: ['LED hiç yanmaz', 'Program hata verir', 'LED yanıp söner', 'LED, kimse söndürmediği için yanık kalır'], dogru: 3,
      aciklama: 'Pin bir kez YÜKSEK yapılınca, yeniden DÜŞÜK yapılana kadar öyle kalır. Bu yüzden söndüren bir kol gerekir.',
    },
    {
      tip: 'kod', baslik: 'İki aşamalı alarm', sure: 5000,
      metin: `<p>Üç durum olsun: A1 <b>1500\'ün altında</b> LED sönük. <b>1500 ile 2500 arasında</b> LED sabit yansın (uyarı). <b>2500 üstünde</b> LED <b>yanıp sönsün</b> (tehlike).</p>`,
      ipucu: 'Önce en tehlikeli durumu kontrol et. Yanıp sönmek için yak, bekle, söndür, bekle (yaklaşık 250 ms) kullan.',
      girdi: async sim => {
        sim.analog.A1 = 1000; await sim.bekle(700);
        ornekAl(sim, ['D0']);
        sim.analog.A1 = 2000; await sim.bekle(500);
        const sb = sim.olaylar.length;
        await sim.bekle(700);
        ornekAl(sim, ['D0']);
        sim.cihaz.sabit = { bas: sb, bit: sim.olaylar.length };
        sim.analog.A1 = 3300; await sim.bekle(300);
        const yb = sim.olaylar.length;
        await sim.bekle(2000);
        sim.cihaz.yanip = { bas: yb, bit: sim.olaylar.length };
      },
      kontrol(sim) {
        const o = sim.cihaz.ornekler, s = sim.cihaz.sabit, y = sim.cihaz.yanip;
        if (!o || o.length < 2 || !y) return { ok: false, mesaj: 'Program çok erken bitti. Her şeyi "sürekli tekrarla" içine koy.' };
        if (o[0][0] > .5) return { ok: false, mesaj: 'Sıcaklık düşükken (A1 = 1000) LED sönük olmalı.' };
        const sabitOlay = sim.olaylar.slice(s.bas, s.bit).filter(e => e.pin === 'D0').length;
        if (o[1][0] < .5) return { ok: false, mesaj: 'A1 = 2000 iken (uyarı) LED yanmalı.' };
        if (sabitOlay > 0) return { ok: false, mesaj: 'A1 = 2000 iken LED sabit yanmalı, yanıp sönmemeli.' };
        const yanip = sim.olaylar.slice(y.bas, y.bit).filter(e => e.pin === 'D0').length;
        if (yanip < 3) return { ok: false, mesaj: 'A1 = 3300 iken (tehlike) LED yanıp sönmeli: yak, bekle, söndür, bekle.' };
        return { ok: true, mesaj: 'Üç durum da doğru: sönük, sabit uyarı, yanıp sönen tehlike!' };
      },
    },
  ],

  'led-cubugu': [
    {
      tip: 'kod', baslik: 'Ters dolan çubuk',
      metin: `<p>Çubuk <b>tersine</b> çalışsın: pot sola iken <b>8 LED</b> da yansın, pot sağa gittikçe LED\'ler <b>teker teker sönsün</b>, tam sağda hiçbiri yanmasın.</p>`,
      ipucu: '8 eksi hesapladığın seviye ya da harita bloğunun çıkış aralığını 8\'den 0\'a çevirmek işe yarar.',
      girdi: orn('A0', [0, 2048, 4095, 1024], D8),
      kontrol(sim) {
        return sonuc(cubukDenetle(sim, [0, 2048, 4095, 1024], [8, 4, 0, 6], 1), 'Pot sağa gittikçe çubuk boşalıyor!');
      },
    },
    {
      tip: 'soru', soru: '<code>map(2048, 0, 4095, 0, 8)</code> sonucu kaçtır?',
      secenekler: ['2', '4', '8', '16'], dogru: 1,
      aciklama: '2048, 0-4095 aralığının tam ortasıdır. 0-8 aralığında ortası 4 eder.',
    },
    {
      tip: 'kod', baslik: 'Yalnızca 4 LED\'lik çubuk',
      metin: `<p>Çubuğun sadece <b>ilk 4 LED\'i</b> (D0-D3) kullanılsın. Pot tam sağdayken 4 LED, ortadayken 2 LED yansın, tam solda hiçbiri yanmasın. Diğer 4 LED hep sönük kalsın.</p>`,
      ipucu: 'Harita bloğunun çıkış aralığı artık 0 ile kaç olmalı? Çubuğun LED sayısını da ayarla.',
      girdi: orn('A0', [0, 2048, 4095, 1024], D8),
      kontrol(sim) {
        const s = cubukDenetle(sim, [0, 2048, 4095, 1024], [0, 2, 4, 1], 1);
        if (s.ok && sim.cihaz.ornekler.some(x => x.slice(4).some(p => p > .5))) return { ok: false, mesaj: 'D4-D7 LED\'leri hiç yanmamalı. Çubuğu 4 LED yap.' };
        return sonuc(s, 'Dört LED\'lik çubuk pota göre doluyor!');
      },
    },
    {
      tip: 'soru', soru: 'LED çubuğu bloğunda seviye <b>3</b> iken hangi LED\'ler yanar? (Çubuk D0\'dan başlıyor.)',
      secenekler: ['D0, D1, D2', 'Yalnızca D3', 'D0, D1, D2, D3', 'D5, D6, D7'], dogru: 0,
      aciklama: 'Seviye kadar LED soldan başlayarak yanar: 3 LED, yani D0, D1 ve D2. D3 dördüncü LED olduğu için sönük kalır.',
    },
    {
      tip: 'kod', baslik: 'Uyarı LED\'i (%75)',
      metin: `<p>Yalnızca <b>son LED (D7)</b> yansın ve sadece pot <b>%75\'in üstüne</b> çıkınca (yaklaşık A0 &gt; 3072). Pot daha azsa <b>hiçbir LED</b> yanmasın. D0-D6 hep sönük kalsın.</p>`,
      ipucu: 'Çubuk bloğu yerine eğer bloğu ve tek pin yazma bloğu kullan.',
      girdi: orn('A0', [500, 2000, 3200, 4095, 1500], D8),
      kontrol(sim) {
        const o = sim.cihaz.ornekler ?? [], A = [500, 2000, 3200, 4095, 1500], hedef = [0, 0, 1, 1, 0];
        if (o.length < A.length) return { ok: false, mesaj: 'Program çok erken bitti. "sürekli tekrarla" kullan.' };
        for (let i = 0; i < A.length; i++) {
          if (o[i].slice(0, 7).some(p => p > .5)) return { ok: false, mesaj: `A0 = ${A[i]} iken D0-D6 sönük olmalı, yalnız D7 yanabilir.` };
          if ((o[i][7] > .5 ? 1 : 0) !== hedef[i]) return { ok: false, mesaj: `A0 = ${A[i]} iken D7 ${hedef[i] ? 'yanmalıydı' : 'sönük olmalıydı'}.` };
        }
        return { ok: true, mesaj: 'Pot %75\'i geçince uyarı LED\'i yanıyor!' };
      },
    },
    {
      tip: 'soru', soru: '8 LED\'lik çubuk için harita bloğunun hedef aralığı neden <b>0-255</b> değil de <b>0-8</b> seçilir?',
      secenekler: ['Pot yalnızca 8 değer verdiği için', 'Çubuk 255 renkli olduğu için', 'Çubuk PWM kullanmadığı için delay gerekir', 'Çıkan sayı yanacak LED sayısı olmalı ve çubukta 8 LED var'], dogru: 3,
      aciklama: 'Çubuk bloğu "kaç LED yansın?" sorusuna sayıyla cevap bekler. En çok 8 LED yanabileceğinden değer 0-8 aralığında olmalıdır.',
    },
    {
      tip: 'kod', baslik: 'Tek LED gezinsin',
      metin: `<p>Çubuk dolmasın: bunun yerine <b>sadece tek bir LED</b> yansın ve pot çevrildikçe bu ışık soldan sağa <b>gezinsin</b>. Pot tam solda D0, tam sağda D7 yansın, aradaki konumlarda ona denk gelen LED yansın.</p>`,
      ipucu: 'Önce potu 0-7 arası bir sayıya çevir (konum). Sonra her LED için "konum bu LED\'e eşitse yak, değilse söndür" yaz.',
      girdi: orn('A0', [0, 2048, 4095, 1024], D8),
      kontrol(sim) {
        const o = sim.cihaz.ornekler ?? [], A = [0, 2048, 4095, 1024], aralik = [[0, 0], [3, 4], [7, 7], [1, 2]];
        if (o.length < A.length) return { ok: false, mesaj: 'Program çok erken bitti. "sürekli tekrarla" kullan.' };
        for (let i = 0; i < A.length; i++) {
          const yan = o[i].map((p, k) => (p > .5 ? k : -1)).filter(k => k >= 0);
          if (yan.length !== 1) return { ok: false, mesaj: `A0 = ${A[i]} iken tam olarak 1 LED yanmalı, ${yan.length} LED yanıyor.` };
          if (yan[0] < aralik[i][0] || yan[0] > aralik[i][1]) return { ok: false, mesaj: `A0 = ${A[i]} iken D${aralik[i][0]}${aralik[i][1] !== aralik[i][0] ? '-D' + aralik[i][1] : ''} yanmalıydı, D${yan[0]} yanıyor.` };
        }
        return { ok: true, mesaj: 'Işık noktası pot ile birlikte geziniyor!' };
      },
    },
  ],
};

for (const d of DERSLER) d.gorevler = GOREVLER[d.id];

export default DERSLER;
