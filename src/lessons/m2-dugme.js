// Modül 2: düğmeler ve değişkenler.
// Düğme basılınca pin YÜKSEK (1) olur. Senaryo (girdi) kullanıcının düğmeye basmasını sanal zamanda taklit eder.

const MODUL = 'Modül 2 · Düğmeler ve değişkenler';

// Düğme olaylarını kaydeden yardımcı: kontrol bu geçmişe bakar.
const bas = (sim, pin, v) => {
  sim.girdi[pin] = v;
  (sim.cihaz.girdiGecmisi ??= []).push({ t: sim.t, pin, deger: v });
};
const gecmis = (sim, pin) => (sim.cihaz.girdiGecmisi ?? []).filter(o => o.pin === pin);
// t anında pinin değeri (olay kaydından)
const degerAt = (olaylar, t) => { let d = 0; for (const o of olaylar) if (o.t <= t) d = o.deger; return d; };
const ledAt = (sim, pin, t) => degerAt(sim.olaylar.filter(o => o.pin === pin), t) > 0 ? 1 : 0;
const dugmeAt = (sim, pin, t) => degerAt(gecmis(sim, pin), t) > 0 ? 1 : 0;
// Tüm düğme olaylarından 100 ms sonrasındaki anlar
const ornekAnlar = sim => [...new Set((sim.cihaz.girdiGecmisi ?? []).map(o => o.t + 100))];

// ── Görevler sekmesi içeriği (kod görevleri + sorular) ──
const norm = s => String(s).toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
const sonSayi = s => { const m = /(-?\d+)\s*$/.exec(s); return m ? +m[1] : NaN; };
const yukselenler = (sim, pin) => sim.olaylar.filter(o => o.pin === pin && o.deger > 0);
const basislar = (sim, pin) => gecmis(sim, pin).filter(o => o.deger > 0);
const birakislar = (sim, pin) => gecmis(sim, pin).filter(o => o.deger === 0);
const yokMu = sim => !(sim.cihaz.girdiGecmisi ?? []).length;
const YOK = { ok: false, mesaj: 'Düğmeye basılmadı (senaryo çalışmadı).' };
// LED yanınca belirtilen ms sonra düğmeye basan (300 ms basılı tutan) senaryo; her süre bir tur
const tepkiGirdi = (...sureler) => async sim => {
  for (const r of sureler) {
    while (!sim.pin.D2.deger) await sim.tick();
    await sim.bekle(r); bas(sim, 'D5', 1);
    await sim.bekle(300); bas(sim, 'D5', 0);
    await sim.bekle(200);
  }
};

const G_BUTON = [
  { tip: 'soru', soru: 'Düğmeyi <b>durmadan</b> kontrol edebilmek için <code>digitalRead(D5)</code> kodu hangi bölüme yazılmalı?',
    secenekler: ['<code>setup()</code> içine', '<code>include</code> satırına', '<code>loop()</code> içine', 'Programın en sonuna, <code>return</code>\'den sonra'], dogru: 2,
    aciklama: '<code>setup()</code> yalnızca bir kez çalışır; <code>loop()</code> ise sürekli tekrarlanır. Düğmeye ne zaman basılacağı bilinmediği için okuma loop içinde yapılır.' },
  { tip: 'kod', baslik: 'Ters mantık',
    metin: 'Bu sefer LED <b>normalde yanık</b> dursun, düğmeye <b>basılınca sönsün</b>, bırakınca yine yansın. <span class="pin-etiket">D5</span> düğme, <span class="pin-etiket">D2</span> LED.',
    ipucu: 'Eğer / değilse bloğunda YÜKSEK ile DÜŞÜK yerlerini değiştirmeyi dene. Ya da düğme değerini tersleyen <b>değil</b> bloğunu kullan.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      for (const t of [300, ...ornekAnlar(sim)]) {
        const d = dugmeAt(sim, 'D5', t), l = ledAt(sim, 'D2', t);
        if (l === d) return { ok: false, mesaj: d ? 'Düğmeye basılıyken LED hâlâ yanıyor; sönmesi gerekiyor.' : 'Düğmeye basılmıyorken LED sönük; normalde yanık olmalı.' };
      }
      return { ok: true, mesaj: 'Doğru! LED düğmenin tersini yapıyor.' };
    } },
  { tip: 'soru', soru: 'Düğmenin bir ucu 3,3 V\'a, öteki ucu D5 pinine bağlı. Düğmeye basılmıyorken D5 pininin değeri <b>belirsiz</b> kalmasın diye pini toprağa (GND) büyük bir dirençle bağlarız. Bu dirence ne denir?',
    secenekler: ['Pull-up (yukarı çekme) direnci', 'Pull-down (aşağı çekme) direnci', 'Sigorta', 'Servo direnci'], dogru: 1,
    aciklama: 'Pini GND\'ye bağlayan direnç, düğme basılı değilken pini LOW\'da tutar. Buna pull-down denir. Pull-up ise pini 3,3 V\'a doğru çeker.' },
  { tip: 'kod', baslik: 'Kısa dokun, bir saniye yansın',
    metin: 'Düğmeye <b>kısa bir an</b> dokunman yetsin: LED yansın, tam <b>1 saniye</b> (1000 ms) yanık kalsın ve sonra sönsün. Düğmeyi bırakman LED\'i hemen söndürmemeli.',
    ipucu: 'Eğer düğmeye basılıysa: LED\'i yak, <b>1000 ms bekle</b>, LED\'i söndür.',
    sure: 5500,
    async girdi(sim) {
      await sim.bekle(500); bas(sim, 'D5', 1); await sim.bekle(150); bas(sim, 'D5', 0);
      await sim.bekle(2500); bas(sim, 'D5', 1); await sim.bekle(150); bas(sim, 'D5', 0);
      await sim.bekle(500);
    },
    kontrol(sim) {
      const p = basislar(sim, 'D5');
      if (!p.length) return YOK;
      if (ledAt(sim, 'D2', 300)) return { ok: false, mesaj: 'Düğmeye basmadan LED yanmamalı.' };
      for (const b of p) {
        if (!ledAt(sim, 'D2', b.t + 100)) return { ok: false, mesaj: 'Düğmeye dokununca LED yanmadı.' };
        if (!ledAt(sim, 'D2', b.t + 700)) return { ok: false, mesaj: 'Düğmeyi bırakınca LED hemen söndü. 1 saniye boyunca yanık kalmalı.' };
        if (ledAt(sim, 'D2', b.t + 1500)) return { ok: false, mesaj: 'LED 1 saniyeden uzun yanık kaldı. Bekleme süresi 1000 ms olsun, sonra LED sönsün.' };
      }
      return { ok: true, mesaj: 'Süper! LED her dokunuşta tam 1 saniye yandı.' };
    } },
  { tip: 'soru', soru: '<code>if (digitalRead(D5) == HIGH) { digitalWrite(D2, LOW); } else { digitalWrite(D2, HIGH); }</code><br>Bu kodda düğmeye <b>basılınca</b> LED ne yapar?',
    secenekler: ['Yanar', 'Yanıp söner', 'Hiçbir şey olmaz, kod hata verir', 'Söner'], dogru: 3,
    aciklama: 'Koşul (düğme basılı) doğru olunca <code>digitalWrite(D2, LOW)</code> çalışır, yani LED söner. Basılmayınca else kısmı LED\'i yakar.' },
  { tip: 'kod', baslik: 'Basılı tutarken yanıp sönsün',
    metin: 'Düğmeyi <b>basılı tuttuğun sürece</b> LED hızlıca <b>yanıp sönsün</b> (200 ms yanık, 200 ms sönük). Düğmeyi bırakınca LED sönük kalsın.',
    ipucu: 'Eğer düğmeye basılıysa: LED YÜKSEK, 200 ms bekle, LED DÜŞÜK, 200 ms bekle. Değilse LED\'i DÜŞÜK yap.',
    sure: 5500,
    async girdi(sim) {
      await sim.bekle(500); bas(sim, 'D5', 1); await sim.bekle(1500); bas(sim, 'D5', 0);
      await sim.bekle(1000); bas(sim, 'D5', 1); await sim.bekle(1200); bas(sim, 'D5', 0);
      await sim.bekle(800);
    },
    kontrol(sim) {
      const p = basislar(sim, 'D5'), r = birakislar(sim, 'D5');
      if (!p.length) return YOK;
      if (ledAt(sim, 'D2', 300)) return { ok: false, mesaj: 'Düğmeye basmadan LED yanmamalı.' };
      for (let i = 0; i < p.length; i++) {
        const son = r[i]?.t ?? p[i].t + 1000;
        const dogus = sim.olaylar.filter(o => o.pin === 'D2' && o.deger > 0 && o.t >= p[i].t && o.t <= son + 50).length;
        if (dogus < 2) return { ok: false, mesaj: 'Düğme basılıyken LED yanıp sönmedi. Yak, bekle, söndür, bekle adımlarının hepsi lazım.' };
        if (dogus > 8) return { ok: false, mesaj: 'LED çok hızlı yanıp sönüyor. Her yanma ve sönme arasında 200 ms bekle.' };
        if (ledAt(sim, 'D2', son + 450)) return { ok: false, mesaj: 'Düğmeyi bırakınca LED yanık kaldı; sönük olmalı.' };
      }
      return { ok: true, mesaj: 'Harika! LED, düğme basılıyken yanıp sönüyor.' };
    } },
];

const G_IKI = [
  { tip: 'soru', soru: 'C++ dilinde <code>&amp;&amp;</code> işareti hangi mantık işlemini yapar?',
    secenekler: ['VEYA (OR): biri doğruysa yeter', 'VE (AND): ikisi de doğru olmalı', 'DEĞİL (NOT): sonucu tersler', 'Eşitlik kontrolü'], dogru: 1,
    aciklama: '<code>&amp;&amp;</code> VE demektir: iki koşul birlikte doğruysa sonuç doğrudur. VEYA için <code>||</code>, DEĞİL için <code>!</code> kullanılır.' },
  { tip: 'kod', baslik: 'Hiçbirine basılmıyorsa yansın',
    metin: '<span class="pin-etiket">D2</span> LED\'i yalnızca <b>iki düğmeye de basılmıyorken</b> yansın. Düğmelerden birine basılır basılmaz sönsün. (<span class="pin-etiket">D3</span> LED\'ini kullanma.)',
    ipucu: '"İkisi de basılı değil" demek, "D5 veya D6 basılı" ifadesinin tersidir. Mantık kategorisindeki <b>değil</b> bloğunu düşün.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      for (const t of [200, ...ornekAnlar(sim)]) {
        const a = dugmeAt(sim, 'D5', t), b = dugmeAt(sim, 'D6', t);
        const beklenen = !a && !b ? 1 : 0;
        if (ledAt(sim, 'D2', t) !== beklenen) return { ok: false, mesaj: beklenen ? 'Hiçbir düğmeye basılmıyorken D2 sönük kalmış; yanmalı.' : 'Bir düğmeye basılıyorken D2 hâlâ yanıyor; sönmeli.' };
      }
      return { ok: true, mesaj: 'Doğru! D2 yalnızca hiçbir düğmeye basılmıyorken yanıyor.' };
    } },
  { tip: 'soru', soru: 'Hangi ifade "<b>iki düğme de basılı değil</b>" anlamına gelir? (LOW = basılı değil)',
    secenekler: ['<code>(a == HIGH) &amp;&amp; (b == HIGH)</code>', '<code>(a == HIGH) || (b == HIGH)</code>', '<code>(a == LOW) || (b == LOW)</code>', '<code>(a == LOW) &amp;&amp; (b == LOW)</code>'], dogru: 3,
    aciklama: 'İkisi birden LOW olmalı, o yüzden VE (<code>&amp;&amp;</code>) kullanılır. Üçüncü seçenek "en az biri basılı değil" demektir.' },
  { tip: 'kod', baslik: 'Öncelikli düğme',
    metin: '<span class="pin-etiket">D6</span> düğmesi <b>öncelikli</b> olsun. D3 LED\'i, D6\'ya basılıyken yansın. D2 LED\'i ise yalnızca <b>D5\'e basılıyor ve D6\'ya basılmıyorken</b> yansın.',
    ipucu: 'D3 doğrudan D6 düğmesini izler. D2 için ve bloğu kullan: D5 basılı VE D6 basılı DEĞİL.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      for (const t of [200, ...ornekAnlar(sim)]) {
        const a = dugmeAt(sim, 'D5', t), b = dugmeAt(sim, 'D6', t);
        if (ledAt(sim, 'D3', t) !== b) return { ok: false, mesaj: 'D3 LED\'i D6 düğmesini izlemeli: D6 basılıyken yanmalı, değilken sönük olmalı.' };
        if (ledAt(sim, 'D2', t) !== (a && !b ? 1 : 0)) return { ok: false, mesaj: 'D2 yalnızca D5 basılı ve D6 basılı değilken yanmalı.' };
      }
      return { ok: true, mesaj: 'Güzel! D6 her zaman önce geliyor, D5 ancak yalnız başınayken D2\'yi yakıyor.' };
    } },
  { tip: 'soru', soru: 'Bir an için a düğmesine basılı (<code>1</code>), b düğmesine basılı değil (<code>0</code>). <code>a &amp;&amp; b</code> ve <code>a || b</code> sonuçları sırasıyla nedir?',
    secenekler: ['1 ve 1', '1 ve 0', '0 ve 1', '0 ve 0'], dogru: 2,
    aciklama: 'VE için ikisi de 1 olmalı, burada b 0 olduğundan sonuç 0. VEYA için biri 1 olması yeter, sonuç 1.' },
  { tip: 'kod', baslik: 'Seri monitörde haber ver',
    metin: 'İki düğmeye <b>aynı anda</b> basılı olduğu sürece seri monitöre <code>IKISI</code> yazdır ve her yazışın ardından <b>200 ms bekle</b>. Tek düğmeye basılırken ya da hiçbirine basılmazken hiçbir şey yazma.',
    ipucu: 'Koşul: D5 basılı VE D6 basılı. Seri monitöre yaz bloğunu ve bekle bloğunu koşulun içine koy.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      const s = sim.seriCikti;
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazılmadı. İki düğmeye birden basınca IKISI yazmalı.' };
      if (s.some(x => !norm(x).includes('ikisi'))) return { ok: false, mesaj: 'Yalnızca iki düğme birden basılıyken IKISI yazılmalı; başka zamanlarda yazma.' };
      if (s.length < 2) return { ok: false, mesaj: 'Düğmeler basılı kaldığı sürece her 200 ms\'de bir satır yazılmalı.' };
      if (s.length > 10) return { ok: false, mesaj: 'Çok fazla satır var. Yazdıktan sonra 200 ms bekle ve yalnızca iki düğmeye birden basılıyken yaz.' };
      return { ok: true, mesaj: 'Mükemmel! Seri monitör yalnızca iki düğme birlikte basılıyken yazdı.' };
    } },
  { tip: 'kod', baslik: 'Biri ya da öteki (XOR)',
    metin: '<span class="pin-etiket">D2</span> LED\'i, düğmelerden <b>tam olarak birine</b> basılıyken yansın. <b>İkisine birden</b> basılırsa ya da hiçbirine basılmazsa sönsün. (<span class="pin-etiket">D3</span> LED\'ini kullanma.)',
    ipucu: '"En az biri basılı" VE "ikisi birden basılı DEĞİL" fikrini birleştir. Mantık kategorisinde ve, veya, değil blokları var.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      for (const t of [200, ...ornekAnlar(sim)]) {
        const a = dugmeAt(sim, 'D5', t), b = dugmeAt(sim, 'D6', t);
        const beklenen = a !== b ? 1 : 0;
        if (ledAt(sim, 'D2', t) !== beklenen) return { ok: false, mesaj: a && b ? 'İki düğmeye birden basılıyken D2 sönük olmalı.' : (a || b) ? 'Yalnızca bir düğmeye basılıyken D2 yanmalı.' : 'Hiçbir düğmeye basılmıyorken D2 sönük olmalı.' };
      }
      return { ok: true, mesaj: 'Çok iyi! Bu mantığa "özel veya" (XOR) denir.' };
    } },
];

const G_SERI = [
  { tip: 'soru', soru: '<code>Serial.begin(115200);</code> satırı ne yapar?',
    secenekler: ['Kartı 115200 ms uyutur', 'Seri monitördeki yazıyı siler', 'Seri haberleşmeyi 115200 baud hızında başlatır', 'D5 pinini giriş yapar'], dogru: 2,
    aciklama: 'Kart ile bilgisayar arasındaki seri iletişim bu satırla başlar. Hız (baud) iki tarafta da aynı olmalıdır; seri monitörde de 115200 seçilir.' },
  { tip: 'kod', baslik: 'Hazırım mesajı',
    metin: 'Program başlar başlamaz seri monitöre <b>bir kez</b> <code>Hazir</code> yazdır (döngüden önce). Sonra eskisi gibi her 200 ms\'de bir <b>D5 düğme değerini (0 / 1)</b> yazdırmaya devam et.',
    ipucu: '"Hazir" yazan seri bloğu sürekli tekrarla bloğunun <b>dışına</b>, üstüne koy. Döngünün içinde düğme değeri yazan blok kalsın.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      const s = sim.seriCikti;
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazılmadı.' };
      if (!norm(s[0]).includes('hazir')) return { ok: false, mesaj: 'İlk satır "Hazir" olmalı. Bu yazı döngüden önce yazılmalı.' };
      if (s.filter(x => norm(x).includes('hazir')).length !== 1) return { ok: false, mesaj: '"Hazir" yalnızca bir kez yazılmalı; sürekli tekrarla bloğunun dışına koy.' };
      const dg = s.slice(1).map(sonSayi);
      if (dg.length < 5 || dg.some(Number.isNaN)) return { ok: false, mesaj: 'Hazir\'dan sonra her satır düğme değeriyle (0 veya 1) bitmeli ve yeterince satır olmalı.' };
      if (!dg.includes(1)) return { ok: false, mesaj: 'Düğmeye basılınca 1 yazılmalı; hiç 1 görünmedi.' };
      return { ok: true, mesaj: 'Güzel! Önce Hazir, sonra düğme değerleri geliyor.' };
    } },
  { tip: 'soru', soru: '<code>Serial.println("Merhaba");</code> ile <code>Serial.print("Merhaba");</code> arasındaki fark nedir?',
    secenekler: ['<code>println</code> yazdıktan sonra yeni satıra geçer, <code>print</code> geçmez', '<code>print</code> yazıyı iki kez yazar', 'İkisi arasında hiçbir fark yoktur', '<code>println</code> yalnızca sayıları yazabilir'], dogru: 0,
    aciklama: '"ln" satır sonu (line) demektir. println sonrasında bir sonraki yazı alt satırdan başlar; print ile yazılar yan yana akar.' },
  { tip: 'kod', baslik: 'Basili / Birakildi',
    metin: 'Sayı yerine kelime yazdır: düğmeye <b>basılıyken</b> <code>Basili</code>, <b>basılmıyorken</b> <code>Birakildi</code> yazsın. Yine her yazıdan sonra 200 ms bekle.',
    ipucu: 'Eğer / değilse bloğu kullan: basılıysa bir metin, değilse öteki metin yazılsın. Türkçe harf (ı, ş) kullanma.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      const s = sim.seriCikti.map(norm);
      if (s.length < 5) return { ok: false, mesaj: 'Yeterince satır yazılmadı. Döngü ve 200 ms bekleme kullan.' };
      if (s.length > 60) return { ok: false, mesaj: 'Çok fazla satır yazıldı. Döngüye 200 ms bekle ekle.' };
      if (s.some(x => !x.includes('basili') && !x.includes('birakildi'))) return { ok: false, mesaj: 'Her satır "Basili" ya da "Birakildi" olmalı.' };
      const b = s.map(x => x.includes('basili') ? 1 : 0);
      const n = b.reduce((a, c) => a + c, 0);
      if (!n) return { ok: false, mesaj: 'Düğmeye basılınca "Basili" yazılmalı; hiç görünmedi.' };
      if (n === b.length) return { ok: false, mesaj: 'Hep "Basili" yazıyor. Düğme bırakılınca "Birakildi" yazmalı.' };
      const i1 = b.indexOf(1), i2 = b.lastIndexOf(1);
      if (b.slice(i1, i2 + 1).includes(0) || i1 === 0 || i2 === b.length - 1) return { ok: false, mesaj: 'Sıra Birakildi..., Basili..., Birakildi... olmalı.' };
      return { ok: true, mesaj: 'Süper! Sayılar yerine anlamlı kelimeler yazdırdın.' };
    } },
  { tip: 'soru', soru: 'Kodda <code>Serial.println(String("Değer: ") + String(digitalRead(D5)));</code> var. <code>String(digitalRead(D5))</code> ne işe yarar?',
    secenekler: ['Düğmeyi basılı hâle getirir', 'D5 pininin okuma hızını artırır', 'D5 pinini çıkış yapar', 'Okunan 0 / 1 sayısını metne çevirir, böylece yazıyla birleştirilebilir'], dogru: 3,
    aciklama: 'Metin ile sayı doğrudan toplanmaz. Sayıyı önce <code>String(...)</code> ile metne çevirir, sonra <code>+</code> ile yan yana ekleriz.' },
  { tip: 'kod', baslik: 'Sadece değişince yaz',
    metin: 'Ekran dolup taşmasın: seri monitöre yalnızca düğmenin durumu <b>değişince</b> yaz. Basılınca bir kez <code>Basildi</code>, bırakılınca bir kez <code>Birakildi</code>. Toplamda tam 2 satır çıkmalı.',
    ipucu: 'Bir değişkende düğmenin <b>önceki</b> durumunu sakla. Şimdiki durum öncekinden farklıysa yaz, sonra değişkeni güncelle.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      const s = sim.seriCikti.map(norm);
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazılmadı.' };
      if (s.length !== 2) return { ok: false, mesaj: `${s.length} satır yazıldı ama 2 olmalı: basınca bir, bırakınca bir. Yalnızca durum değişince yaz.` };
      if (!s[0].includes('basildi')) return { ok: false, mesaj: 'İlk satır "Basildi" olmalı.' };
      if (!s[1].includes('birakildi')) return { ok: false, mesaj: 'İkinci satır "Birakildi" olmalı.' };
      return { ok: true, mesaj: 'Harika! Durum değişimini yakaladın.' };
    } },
  { tip: 'kod', baslik: 'Basılı kalma süresini ölç',
    metin: 'Düğmeye basıldığı andan bırakıldığı ana kadar geçen süreyi <b>milisaniye</b> olarak ölç ve bırakılınca seri monitöre <b>bir kez</b> yazdır (örn. <code>Sure: 1500</code>).',
    ipucu: 'Basılana kadar bekle, <b>geçen süre (ms)</b> değerini bir değişkene kaydet. Bırakılana kadar bekle, şimdiki zamandan kaydettiğini çıkar.',
    sure: 4000,
    async girdi(sim) {
      await sim.bekle(800); bas(sim, 'D5', 1);
      await sim.bekle(1500); bas(sim, 'D5', 0);
      await sim.bekle(500);
    },
    kontrol(sim) {
      const p = basislar(sim, 'D5'), r = birakislar(sim, 'D5');
      if (!p.length || !r.length) return YOK;
      const gercek = r[0].t - p[0].t;
      const s = sim.seriCikti.filter(x => /\d/.test(x));
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre süre yazılmadı.' };
      if (sim.seriCikti.length > 3) return { ok: false, mesaj: 'Süreyi yalnızca bir kez, düğme bırakılınca yazdır.' };
      const sayi = sonSayi(s[s.length - 1]);
      if (Number.isNaN(sayi) || Math.abs(sayi - gercek) > 150) return { ok: false, mesaj: `Yazılan süre (${s[s.length - 1]}) gerçek süreye (~${gercek} ms) uymuyor. Bırakılma zamanından basılma zamanını çıkar.` };
      return { ok: true, mesaj: `Süper! Düğme ${sayi} ms basılı kaldı.` };
    } },
];

const G_SAYAC = [
  { tip: 'soru', soru: '<code>int sayac = 0;</code> satırı <code>loop()</code> içinde, en başta yazılırsa ne olur?',
    secenekler: ['Sayaç iki kat hızlı artar', 'Her döngüde sayaç sıfırlanır, bu yüzden hiç artamaz', 'Derleyici hata verir', 'Sayaç 0\'dan eksiye doğru gider'], dogru: 1,
    aciklama: 'Loop her turda baştan çalışır. Sayacı içeride sıfırlarsan bir önceki değer kaybolur. Başlangıç değeri döngüden önce verilir.' },
  { tip: 'kod', baslik: '5\'ten başla',
    metin: 'Sayacın başlangıç değeri <b>5</b> olsun. Düğmeye her basışta 1 artırıp seri monitöre yazdır: <b>6, 7, 8</b>. (Bırakılmasını beklemeyi unutma.)',
    ipucu: 'Sayaç değişkenini döngüden önce 5 yap. Gerisi dersteki çözümle aynı.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      const d = sim.seriCikti.map(sonSayi);
      if (!d.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazılmadı.' };
      if (d.length !== 3) return { ok: false, mesaj: `Düğmeye 3 kez basıldı ama ${d.length} satır yazıldı. Her basışta bir kez yaz ve bırakılmasını bekle.` };
      if (d.join() !== '6,7,8') return { ok: false, mesaj: 'Sayaç 6, 7, 8 diye artmalı. Başlangıç değeri 5 olmalı.' };
      return { ok: true, mesaj: 'Doğru! Sayaç 5\'ten başlayıp 6, 7, 8 oldu.' };
    } },
  { tip: 'soru', soru: 'Düğmenin <b>bırakılmasını beklemezsek</b> sayaç neden tek basışta çok hızlı artar?',
    secenekler: ['Loop çok hızlı döner; düğme basılı olduğu sürece her turda bir sayılır', 'Düğme bozulur ve sürekli HIGH okur', 'Seri monitör sayıyı iki kez yazar', 'Sayaç değişkeni kendiliğinden büyür'], dogru: 0,
    aciklama: 'Kart saniyede binlerce tur atar. Bir basış yüzlerce turda "basılı" görünür; bırakılmayı beklemezsek her turda sayaç artar.' },
  { tip: 'kod', baslik: 'İkişer ikişer',
    metin: 'Her basışta sayaç <b>2 artsın</b> ve seri monitöre yazdırılsın: <b>2, 4, 6</b>.',
    ipucu: 'Artır bloğundaki 1 değerini değiştir.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      const d = sim.seriCikti.map(sonSayi);
      if (!d.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazılmadı.' };
      if (d.length !== 3) return { ok: false, mesaj: `3 basış için 3 satır beklenir, ${d.length} satır yazıldı. Bırakılmasını beklediğinden emin ol.` };
      if (d.join() !== '2,4,6') return { ok: false, mesaj: 'Çıktı 2, 4, 6 olmalı. Sayaç başta 0 olsun ve her basışta 2 artsın.' };
      return { ok: true, mesaj: 'Süper! Sayaç ikişer ikişer artıyor.' };
    } },
  { tip: 'soru', soru: '<code>sayac += 1;</code> ifadesi ile aynı işi yapan ifade hangisidir?',
    secenekler: ['<code>sayac == 1;</code>', '<code>sayac = 1;</code>', '<code>sayac -= 1;</code>', '<code>sayac = sayac + 1;</code>'], dogru: 3,
    aciklama: '<code>+=</code> değişkene ekleme yapar: <code>sayac += 1</code>, <code>sayac = sayac + 1</code> ile aynıdır. <code>==</code> ise karşılaştırma yapar, değer atamaz.' },
  { tip: 'kod', baslik: '3. basışta bitsin',
    metin: 'İlk iki basışta sayacı yazdır (<b>1</b>, <b>2</b>). <b>3. basışta</b> sayı yerine <code>BITTI</code> yazdır. Toplam tam 3 satır olmalı.',
    ipucu: 'Sayacı artırdıktan sonra eğer / değilse kullan: sayaç 3 mü? Evetse BITTI, değilse sayacı yaz.',
    kontrol(sim) {
      if (yokMu(sim)) return YOK;
      const s = sim.seriCikti;
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazılmadı.' };
      if (s.length !== 3) return { ok: false, mesaj: `3 satır beklenir, ${s.length} satır yazıldı. Her basışta bir kez yaz, bırakılmasını bekle.` };
      if (sonSayi(s[0]) !== 1 || sonSayi(s[1]) !== 2) return { ok: false, mesaj: 'İlk iki satır 1 ve 2 olmalı.' };
      if (!norm(s[2]).includes('bitti')) return { ok: false, mesaj: '3. basışta sayı yerine BITTI yazılmalı.' };
      return { ok: true, mesaj: 'Harika! Sayaç belirli bir değere ulaşınca başka bir şey yaptırdın.' };
    } },
  { tip: 'soru', soru: '<code>sayac</code> değişkeninin değeri 5 iken <code>sayac = sayac - 1;</code> satırı çalışırsa <code>sayac</code> kaç olur?',
    secenekler: ['5', '6', '4', '1'], dogru: 2,
    aciklama: 'Önce sağ taraf hesaplanır: 5 - 1 = 4. Sonra sonuç yine <code>sayac</code> kutusuna yazılır.' },
  { tip: 'kod', baslik: 'İki basış arası süre',
    metin: 'İki basışın <b>başlangıçları</b> arasında geçen süreyi ölç: birinci basışta zamanı kaydet, ikinci basışta şimdiki zamandan çıkarıp seri monitöre yazdır (örn. <code>Aralik: 1100</code>). Sonuç tek satır olsun.',
    ipucu: 'Basılana kadar bekle, <b>geçen süre (ms)</b> değerini değişkene al, bırakılmasını bekle, tekrar basılmasını bekle ve farkı yazdır.',
    sure: 4000,
    async girdi(sim) {
      await sim.bekle(600); bas(sim, 'D5', 1); await sim.bekle(200); bas(sim, 'D5', 0);
      await sim.bekle(900); bas(sim, 'D5', 1); await sim.bekle(200); bas(sim, 'D5', 0);
      await sim.bekle(500);
    },
    kontrol(sim) {
      const p = basislar(sim, 'D5');
      if (p.length < 2) return YOK;
      const gercek = p[1].t - p[0].t;
      const s = sim.seriCikti.filter(x => /\d/.test(x));
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre süre yazılmadı.' };
      if (sim.seriCikti.length > 2) return { ok: false, mesaj: 'Yalnızca tek satır yazdır: ikinci basışta, iki basış arası süreyi.' };
      const sayi = sonSayi(s[s.length - 1]);
      if (Number.isNaN(sayi) || Math.abs(sayi - gercek) > 150) return { ok: false, mesaj: `Yazılan süre (${s[s.length - 1]}) gerçek aralığa (~${gercek} ms) uymuyor. İkinci basış zamanı eksi birinci basış zamanı olmalı.` };
      return { ok: true, mesaj: `Süper! İki basış arası ${sayi} ms.` };
    } },
];

const G_REFLEKS = [
  { tip: 'soru', soru: '<code>millis()</code> fonksiyonu ne döndürür?',
    secenekler: ['Saatin kaç olduğunu (saat:dakika)', 'D5 düğmesinin kaç ms basılı kaldığını', 'Kart çalışmaya başladığından beri geçen milisaniyeyi', 'Pinin voltajını milivolt olarak'], dogru: 2,
    aciklama: '<code>millis()</code> kart açıldığından (ya da sıfırlandığından) beri geçen milisaniyeyi verir. İki anın farkı alınarak süre ölçülür.' },
  { tip: 'kod', baslik: 'Üç saniye bekle',
    metin: 'Oyun biraz daha zorlaşsın: LED, program başladıktan <b>3 saniye (3000 ms) sonra</b> yansın. Düğmeye basılınca LED sönsün.',
    ipucu: 'Bekle bloğuna 3000 yaz, sonra D2 pinini YÜKSEK yap. LED\'i söndürmek için düğmenin basılmasını bekle.',
    kontrol(sim) {
      const y = yukselenler(sim, 'D2')[0];
      if (!y) return { ok: false, mesaj: 'LED hiç yanmadı.' };
      if (y.t < 2800) return { ok: false, mesaj: `LED çok erken yandı (${Math.round(y.t)} ms). 3000 ms beklemelisin.` };
      if (y.t > 3400) return { ok: false, mesaj: `LED çok geç yandı (${Math.round(y.t)} ms). Tam 3000 ms beklemelisin.` };
      if (!basislar(sim, 'D5').length) return YOK;
      if (ledAt(sim, 'D2', sim.t - 100)) return { ok: false, mesaj: 'Düğmeye basılınca LED sönmeli.' };
      return { ok: true, mesaj: 'Doğru! LED tam 3 saniye sonra yandı ve basınca söndü.' };
    } },
  { tip: 'soru', soru: 'Bir oyuncunun tepki süresi şöyle ölçülür: LED yanarken <code>baslangic = millis();</code> yazıldı. Düğmeye basılınca <code>millis()</code> değeri 5350. <code>baslangic</code> değeri 5000 ise tepki süresi kaç ms\'dir?',
    secenekler: ['5000', '5350', '10350', '350'], dogru: 3,
    aciklama: 'Süre = şimdiki zaman - başlangıç zamanı = 5350 - 5000 = 350 ms.' },
  { tip: 'kod', baslik: 'Hızlı mı, yavaş mı?',
    metin: 'Tepki süresini ölç ve değerlendir: süre <b>500 ms\'den azsa</b> seri monitöre <code>HIZLI</code>, değilse <code>YAVAS</code> yazdır. Süreyi yazdırmak zorunda değilsin.',
    ipucu: 'Önceki dersteki süre hesabına bir eğer / değilse ekle: süre &lt; 500 ise HIZLI, değilse YAVAS.',
    girdi: tepkiGirdi(700),
    kontrol(sim) {
      const y = yukselenler(sim, 'D2')[0], b = basislar(sim, 'D5')[0];
      if (!y) return { ok: false, mesaj: 'LED hiç yanmadı.' };
      if (!b) return YOK;
      const gercek = b.t - y.t;
      const beklenen = gercek < 500 ? 'hizli' : 'yavas';
      const s = sim.seriCikti.map(norm);
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre HIZLI ya da YAVAS yazılmadı.' };
      if (s.some(x => x.includes(beklenen === 'hizli' ? 'yavas' : 'hizli'))) return { ok: false, mesaj: `Tepki süresi ~${Math.round(gercek)} ms; bu ${beklenen === 'hizli' ? 'HIZLI' : 'YAVAS'} sayılır. Karşılaştırmayı kontrol et.` };
      if (!s.some(x => x.includes(beklenen))) return { ok: false, mesaj: `Tepki süresi ~${Math.round(gercek)} ms; seri monitörde ${beklenen === 'hizli' ? 'HIZLI' : 'YAVAS'} yazmalıydı.` };
      return { ok: true, mesaj: `Doğru! ${Math.round(gercek)} ms tepki ${beklenen === 'hizli' ? 'HIZLI' : 'YAVAS'} sayıldı.` };
    } },
  { tip: 'soru', soru: '<code>random(1000, 3000)</code> ifadesi ne verir?',
    secenekler: ['Her zaman 2000 değerini', '1000 ile 3000 arasında (3000 hariç) rastgele bir tam sayıyı', 'Her zaman 1000 ile 3000 arasındaki ortalama sayıyı', '1000 ms bekler, sonra 3000 ms bekler'], dogru: 1,
    aciklama: '<code>random(alt, üst)</code> alt sınır dahil, üst sınır hariç rastgele bir sayı üretir. Böylece LED\'in ne zaman yanacağı belli olmaz.' },
  { tip: 'kod', baslik: 'Erken basma cezası',
    metin: 'Hile yapanı yakalayalım: ilk <b>2 saniye</b> boyunca (LED yanmadan önce) düğmeye basılırsa seri monitöre <code>ERKEN</code> yazdır ve LED <b>hiç yanmasın</b>. Basılmazsa oyun her zamanki gibi LED\'i yaksın.',
    ipucu: 'Tek uzun bekleme yerine 2 saniyeyi küçük adımlara böl (örn. 20 ms\'lik bekleme) ve her adımda düğmeye bak. Basılırsa ERKEN yaz ve programı bitir.',
    sure: 5000,
    async girdi(sim) {
      await sim.bekle(800); bas(sim, 'D5', 1);
      await sim.bekle(200); bas(sim, 'D5', 0);
    },
    kontrol(sim) {
      if (!basislar(sim, 'D5').length) return YOK;
      if (yukselenler(sim, 'D2').length) return { ok: false, mesaj: 'Erken basılmasına rağmen LED yandı. Erken basınca LED hiç yanmamalı.' };
      if (!sim.seriCikti.some(x => norm(x).includes('erken'))) return { ok: false, mesaj: 'Erken basıldı ama seri monitöre ERKEN yazılmadı. Bekleme sırasında düğmeyi de kontrol etmelisin.' };
      return { ok: true, mesaj: 'Harika! Hile yapan oyuncu ERKEN uyarısı aldı.' };
    } },
  { tip: 'kod', baslik: 'İki tur, en iyi skor',
    metin: 'Oyunu <b>iki tur</b> oynat. Her turda 1 saniye bekle, LED\'i yak, tepki süresini ölç, LED\'i söndür. İki turdan sonra seri monitöre <b>en kısa</b> süreyi <b>bir kez</b> yazdır (örn. <code>En iyi: 260</code>).',
    ipucu: 'Bir <i>en_iyi</i> değişkeni başta çok büyük bir sayı (örn. 9999) olsun. Her turda ölçülen süre en_iyi\'den küçükse en_iyi\'ye ata. Turları saymak için döngü ya da iki kez kopyalama kullanabilirsin.',
    sure: 8000,
    girdi: tepkiGirdi(450, 260),
    kontrol(sim) {
      const yan = yukselenler(sim, 'D2'), bas_ = basislar(sim, 'D5');
      if (yan.length < 2) return { ok: false, mesaj: `LED ${yan.length} kez yandı; iki tur için iki kez yanmalı (her turdan sonra söndür).` };
      if (bas_.length < 2) return { ok: false, mesaj: 'İkinci tur tamamlanmadı. Her turda LED yanıp düğmeye basılana kadar beklemeli.' };
      let enIyi = Infinity;
      for (const b of bas_.slice(0, 2)) { const y = [...yan].reverse().find(o => o.t <= b.t); if (y) enIyi = Math.min(enIyi, b.t - y.t); }
      const s = sim.seriCikti.filter(x => /\d/.test(x));
      if (!s.length) return { ok: false, mesaj: 'Seri monitöre en iyi süre yazılmadı.' };
      if (sim.seriCikti.length > 2) return { ok: false, mesaj: 'Yalnızca iki turdan sonra tek satır yazdır: en iyi (en kısa) süre.' };
      const sayi = sonSayi(s[s.length - 1]);
      if (Number.isNaN(sayi) || Math.abs(sayi - enIyi) > 100) return { ok: false, mesaj: `Yazılan değer (${s[s.length - 1]}) en iyi süreye (~${Math.round(enIyi)} ms) uymuyor. İki sürenin küçüğünü yazdır.` };
      return { ok: true, mesaj: `Harika! En iyi tepki süren ${sayi} ms.` };
    } },
];

export default [
  {
    id: 'buton-led',
    gorevler: G_BUTON,
    ad: '2.1 · Düğme ile LED',
    modul: MODUL,
    sure: 4500,
    html: `<h2>Düğme ile LED</h2>
      <p>D5 pinine bir <b>düğme</b>, D2 pinine bir <b>LED</b> bağlı. Düğmeye basınca pin <b>YÜKSEK (1)</b> olur.</p>
      <ol>
        <li><b>Düğme</b> kategorisinden <b>sürekli tekrarla</b> içine bir <b>eğer / değilse</b> bloğu koy.</li>
        <li>Koşula <b>D5 düğmesine basılı mı?</b> bloğunu tak.</li>
        <li>Basılıysa <b>D2 pinini YÜKSEK</b>, değilse <b>DÜŞÜK</b> yap.</li>
      </ol>
      <p>İpucu: tek blokla da olur: <b>D2 pinini [D5 düğmesine basılı mı?] değerine eşitle</b>.</p>
      <p>Düğmeye fareyle tıkla (basılı tut) ve LED'i izle!</p>`,
    adimlar: [
      {
        baslik: 'Devreyi tanı',
        html: `<p>Sahnede bir <b>düğme</b> (<span class="pin-etiket">D5</span>) ve bir <b>sarı LED</b> (<span class="pin-etiket">D2</span>) var. Bu sefer kartı biz değil, <b>sen</b> kontrol edeceksin!</p>
          <div class="kutu bilgi"><b>Düğme nasıl okunur?</b> Düğmeye basılınca D5 pini 3,3 V olur, yani <code>HIGH</code> (1). Basmayınca <code>LOW</code> (0) kalır. Kart bunu <code>digitalRead(D5)</code> ile okur.</div>
          <p>3B sahnede düğmeye fareyle bas ve basılı tut. Düğmenin bastığını göreceksin. Henüz LED yanmaz, çünkü program yok.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p>Düğmeye ne zaman basılacağını bilemeyiz. O yüzden kart düğmeyi <b>durmadan kontrol etmeli</b>. <span class="chip akis">Akış</span> kategorisini aç ve <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına sürükle.</p>
          <pre><code>void loop() {
  ...
}</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu. Boş çalışma alanına bırak.',
      },
      {
        baslik: 'Eğer bloğunu ekle',
        html: `<p>Yine <span class="chip akis">Akış</span> içinden <span class="chip akis">eğer</span> bloğunu al ve <span class="chip akis">sürekli tekrarla</span> bloğunun <b>içine</b> koy.</p>
          <div class="kutu bilgi"><b>Eğer</b> bloğu bir şeyi sorar: koşul doğruysa içindeki bloklar çalışır.
          <pre><code>if (koşul) {
  ...
}</code></pre></div>
          <p>Bloğun üstündeki <b>⚙ dişli</b> simgesine tıklayıp <b>değilse</b> parçasını da ekle. Koşul doğru değilse o parça çalışır.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: { blok: 'controls_if', icinde: 'dy_surekli' },
        ipucu: 'Eğer bloğunu sürekli tekrarla bloğunun C şeklindeki boşluğuna yaklaştır; yerine oturunca takılır.',
      },
      {
        baslik: 'Düğme koşulunu tak',
        html: `<p><span class="chip dugme">Düğme</span> kategorisini aç. <span class="chip dugme">D5 düğmesine basılı mı?</span> bloğunu <b>eğer</b> bloğunun koşul yuvasına tak.</p>
          <pre><code>if (digitalRead(D5) == HIGH) {</code></pre>
          <p>Pin olarak <span class="pin-etiket">D5</span> seçili olsun.</p>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_basili' },
        bitti: { blok: 'dy_dugme_basili', alan: { PIN: 'D5' } },
        ipucu: 'Koşul yuvası eğer yazısının hemen sağındaki girinti. Blok oraya yapışır.',
      },
      {
        baslik: 'LED\'i yak ve söndür',
        html: `<p><span class="chip pin">Pinler</span> kategorisinden iki tane <span class="chip pin">pini yap</span> bloğu al. <b>Eğer</b> kısmına <span class="pin-etiket">D2</span> <b>YÜKSEK (1)</b>, <b>değilse</b> kısmına <span class="pin-etiket">D2</span> <b>DÜŞÜK (0)</b> koy.</p>
          <pre><code>if (digitalRead(D5) == HIGH) {
  digitalWrite(D2, HIGH);
} else {
  digitalWrite(D2, LOW);
}</code></pre>
          <div class="kutu dikkat"><b>Dikkat:</b> Pinleri D2 yap. Bloklar varsayılan olarak D0 gelir.</div>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: { blok: 'dy_yaz', alan: { PIN: 'D2' }, adet: 2, icinde: 'controls_if' },
        ipucu: 'Bir blok eğer kısmında, diğeri değilse kısmında olmalı. İkisinin de pinini D2 yapmayı unutma.',
      },
      {
        baslik: 'Çalıştır ve düğmeye bas',
        html: `<p><b>▶ Çalıştır</b> düğmesine bas. Program çalışırken 3B sahnedeki <b>düğmeye fareyle bas ve basılı tut</b>, sonra bırak. LED'i izle!</p>
          <div class="kutu bilgi"><b>Kısa yol:</b> <span class="chip dugme">D2 pinini [ ] değerine eşitle</span> bloğu (Düğme kategorisi) eğer / değilse işini tek başına yapar.</div>
          <div class="kutu hedef"><b>Hedef:</b> Düğmeye basınca LED yansın, bırakınca sönsün.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'LED düğmeyi geç takip ediyorsa sürekli tekrarla bloğunun içinde olduğundan emin ol.',
      },
    ],
    sahne: { parcalar: [{ tur: 'dugme', pin: 'D5', renk: 'kirmizi' }, { tur: 'led', pin: 'D2', renk: 'sari' }] },
    async girdi(sim) {
      await sim.bekle(500); bas(sim, 'D5', 1);
      await sim.bekle(1000); bas(sim, 'D5', 0);
      await sim.bekle(600); bas(sim, 'D5', 1);
      await sim.bekle(700); bas(sim, 'D5', 0);
    },
    kontrol(sim) {
      const anlar = ornekAnlar(sim);
      if (!anlar.length) return { ok: false, mesaj: 'Düğmeye basılmadı (senaryo çalışmadı).' };
      for (const t of anlar) {
        const d = dugmeAt(sim, 'D5', t), l = ledAt(sim, 'D2', t);
        if (d !== l) return { ok: false, mesaj: d ? 'Düğmeye basılıyken LED sönük kaldı.' : 'Düğmeyi bıraktığında LED hâlâ yanıyor.' };
      }
      return { ok: true, mesaj: 'Süper! LED düğmeyi takip ediyor.' };
    },
  },
  {
    id: 'iki-buton',
    gorevler: G_IKI,
    ad: '2.2 · İki düğme (AND / OR)',
    modul: MODUL,
    sure: 6000,
    html: `<h2>İki düğme: VE / VEYA</h2>
      <p>D5 ve D6'ya iki düğme, D2 ve D3'e iki LED bağlı.</p>
      <ul>
        <li><b>D2 (VE):</b> yalnızca <b>iki düğmeye de</b> basılıyken yansın.</li>
        <li><b>D3 (VEYA):</b> düğmelerden <b>en az birine</b> basılıyken yansın.</li>
      </ul>
      <p><b>Mantık</b> kategorisindeki <b>ve / veya</b> bloğunu kullan; iki <b>düğmesine basılı mı?</b> bloğunu içine tak.
      <b>Sürekli tekrarla</b> içinde iki <b>eşitle</b> bloğu yeter.</p>`,
    adimlar: [
      {
        baslik: 'Devreyi tanı',
        html: `<p>Bu sefer <b>iki düğme</b> (<span class="pin-etiket">D5</span> mavi, <span class="pin-etiket">D6</span> yeşil) ve <b>iki LED</b> (<span class="pin-etiket">D2</span> kırmızı, <span class="pin-etiket">D3</span> yeşil) var.</p>
          <ul>
            <li><span class="pin-etiket">D2</span>: iki düğmeye de basılınca yansın (<b>VE</b>).</li>
            <li><span class="pin-etiket">D3</span>: düğmelerden biri yetsin (<b>VEYA</b>).</li>
          </ul>`,
        vurgu: { parca: 2 },
      },
      {
        baslik: 'VE ve VEYA nedir?',
        html: `<div class="kutu bilgi"><b>VE (AND):</b> iki şart <i>birlikte</i> doğru olmalı. <b>VEYA (OR):</b> şartlardan <i>biri</i> doğru olsa yeter.
          <pre><code>(a == HIGH) &amp;&amp; (b == HIGH)   // VE
(a == HIGH) || (b == HIGH)   // VEYA</code></pre></div>
          <p>Bir örnek: "yağmur VE rüzgar var" ise şemsiye gerekir. "yağmur VEYA rüzgar var" ise de ceket giyersin.</p>`,
        vurgu: { parca: 3 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına sürükle. Düğmeler hep kontrol edilecek.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'İki eşitle bloğu',
        html: `<p><span class="chip dugme">Düğme</span> kategorisinden iki tane <span class="chip dugme">pinini [ ] değerine eşitle</span> bloğu al ve <b>sürekli tekrarla</b> içine alt alta koy. Birincisini <span class="pin-etiket">D2</span>, ikincisini <span class="pin-etiket">D3</span> yap.</p>
          <pre><code>digitalWrite(D2, ... ? HIGH : LOW);</code></pre>
          <p>Bu blok, yuvasına gelen doğru / yanlış değerine göre pini YÜKSEK ya da DÜŞÜK yapar.</p>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_yaz' },
        bitti: { blok: 'dy_dugme_yaz', adet: 2, icinde: 'dy_surekli' },
        ipucu: 'İkinci bloğu birincinin hemen altına bırak; iki blok birbirine yapışır.',
      },
      {
        baslik: 'VE / VEYA bloklarını tak',
        html: `<p><span class="chip mantik">Mantık</span> kategorisinden iki tane <span class="chip mantik">ve / veya</span> bloğu al ve eşitle bloklarının yuvalarına tak. D2'ninkini <b>ve</b>, D3'ünkini <b>veya</b> yap (blok üzerindeki açılır listeden).</p>
          <pre><code>digitalWrite(D2, (digitalRead(D5) == HIGH) &amp;&amp; (digitalRead(D6) == HIGH) ? HIGH : LOW);</code></pre>`,
        vurgu: { kategori: 'Mantık', blok: 'logic_operation' },
        bitti: { blok: 'logic_operation', adet: 2 },
        ipucu: 'Bloğun ortasındaki küçük liste "ve" ile "veya" arasında seçim yapar.',
      },
      {
        baslik: 'Düğme sorularını tak',
        html: `<p><span class="chip dugme">Düğme</span> kategorisinden dört tane <span class="chip dugme">düğmesine basılı mı?</span> bloğu al. Her ve / veya bloğunun içine biri <span class="pin-etiket">D5</span>, biri <span class="pin-etiket">D6</span> olacak şekilde tak.</p>
          <div class="kutu dikkat"><b>Dikkat:</b> Dört blokta da doğru pin (D5 ve D6) seçili olsun. Aynı pin iki kez olursa sonuç yanlış çıkar.</div>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_basili' },
        bitti: { blok: 'dy_dugme_basili', adet: 4 },
        ipucu: 'Bloğu kopyalamak için üzerine tıkla, Ctrl+C ve Ctrl+V yapabilirsin.',
      },
      {
        baslik: 'Çalıştır ve dene',
        html: `<p><b>▶ Çalıştır</b>'a bas. Sahnede önce sadece mavi, sonra sadece yeşil, en sonda ikisine birden fareyle bas.</p>
          <div class="kutu hedef"><b>Hedef:</b> <span class="pin-etiket">D3</span> bir düğmeyle bile yansın, <span class="pin-etiket">D2</span> yalnızca ikisi birden basılınca yansın.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'D2 tek düğmede yanıyorsa ve bloğunu veya yapmış olabilirsin.',
      },
    ],
    sahne: { parcalar: [
      { tur: 'dugme', pin: 'D5', renk: 'mavi' }, { tur: 'dugme', pin: 'D6', renk: 'yesil' },
      { tur: 'led', pin: 'D2', renk: 'kirmizi' }, { tur: 'led', pin: 'D3', renk: 'yesil' }] },
    async girdi(sim) {
      await sim.bekle(400); bas(sim, 'D5', 1);          // sadece A
      await sim.bekle(800); bas(sim, 'D5', 0);
      await sim.bekle(400); bas(sim, 'D6', 1);          // sadece B
      await sim.bekle(800); bas(sim, 'D6', 0);
      await sim.bekle(400); bas(sim, 'D5', 1); bas(sim, 'D6', 1);  // ikisi
      await sim.bekle(800); bas(sim, 'D5', 0); bas(sim, 'D6', 0);
      await sim.bekle(400);
    },
    kontrol(sim) {
      const anlar = ornekAnlar(sim);
      if (!anlar.length) return { ok: false, mesaj: 'Düğmeye basılmadı (senaryo çalışmadı).' };
      for (const t of anlar) {
        const a = dugmeAt(sim, 'D5', t), b = dugmeAt(sim, 'D6', t);
        if (ledAt(sim, 'D2', t) !== (a && b ? 1 : 0)) return { ok: false, mesaj: 'D2 (VE) LED hatalı: yalnızca iki düğmeye birden basılınca yanmalı.' };
        if (ledAt(sim, 'D3', t) !== (a || b ? 1 : 0)) return { ok: false, mesaj: 'D3 (VEYA) LED hatalı: en az bir düğmeye basılınca yanmalı.' };
      }
      return { ok: true, mesaj: 'Mükemmel! VE ve VEYA mantığı doğru çalışıyor.' };
    },
  },
  {
    id: 'seri-monitor',
    gorevler: G_SERI,
    ad: '2.3 · Seri monitör',
    modul: MODUL,
    sure: 4000,
    html: `<h2>Seri monitör</h2>
      <p>Seri monitör, kartın bilgisayara yazı göndermesini sağlar. Düğmenin durumunu sürekli yazdıralım.</p>
      <ol>
        <li><b>Sürekli tekrarla</b> içine <b>seri monitöre yaz</b> bloğunu koy.</li>
        <li>İçine <b>birleştir</b> bloğu tak: ilk parça <i>"Düğme: "</i>, ikinci parça <b>D5 düğme değeri (0 / 1)</b>.</li>
        <li>Sonra <b>200 ms bekle</b> ekle ki ekran dolup taşmasın.</li>
      </ol>
      <p>Düğmeye basınca satırlarda <b>1</b>, bırakınca <b>0</b> görmelisin.</p>`,
    adimlar: [
      {
        baslik: 'Seri monitör nedir?',
        html: `<p>Kartın <span class="pin-etiket">D5</span> pinine bağlı bir düğme var. Düğmenin durumunu bilgisayara <b>yazı</b> olarak göndereceğiz.</p>
          <div class="kutu bilgi"><b>Seri monitör</b>, kartın bilgisayara mesaj gönderdiği küçük bir ekrandır. Kod yazarken "içeride ne oluyor?" diye bakmanın en iyi yolu budur.
          <pre><code>Serial.begin(115200);
Serial.println("Merhaba");</code></pre></div>
          <p>Önce sahnede düğmeye basıp bırak, nasıl çalıştığını gör.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu çalışma alanına sürükle.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Seri monitöre yaz',
        html: `<p><span class="chip seri">Seri</span> kategorisini aç. <span class="chip seri">seri monitöre yaz</span> bloğunu <b>sürekli tekrarla</b> içine koy.</p>`,
        vurgu: { kategori: 'Seri', blok: 'dy_seri' },
        bitti: { blok: 'dy_seri', icinde: 'dy_surekli' },
        ipucu: 'Blok sürekli tekrarla bloğunun içindeki boşluğa oturmalı.',
      },
      {
        baslik: 'Yazıyı ve düğme değerini birleştir',
        html: `<p><span class="chip analog">Metin</span> kategorisinden <span class="chip analog">birleştir</span> bloğunu al ve <b>seri monitöre yaz</b> bloğunun yuvasına tak. İlk kutuya <i>Düğme: </i> yaz.</p>
          <p>Sonra <span class="chip dugme">Düğme</span> kategorisinden <span class="chip dugme">D5 düğme değeri (0 / 1)</span> bloğunu ikinci yuvaya tak.</p>
          <pre><code>Serial.println((String("Düğme: ") + String(digitalRead(D5))));</code></pre>
          <div class="kutu bilgi"><code>String(...)</code> sayıyı metne çevirir; <code>+</code> iki metni yan yana yapıştırır.</div>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_deger' },
        bitti: [{ blok: 'dy_degisken_birlestir' }, { blok: 'dy_dugme_deger', alan: { PIN: 'D5' } }],
        ipucu: 'Birleştir bloğu Metin kategorisinde. Düğme değeri bloğunun pini D5 olmalı.',
      },
      {
        baslik: 'Biraz bekle',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">ms bekle</span> bloğunu al, <b>seri monitöre yaz</b> bloğunun altına koy ve <b>200</b> yap.</p>
          <div class="kutu dikkat"><b>Dikkat:</b> Beklemezsen kart saniyede binlerce satır yazar ve ekran dolup taşar.</div>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'dy_surekli' },
        ipucu: 'Bekle bloğunun sayı kutusuna 200 yaz.',
      },
      {
        baslik: 'Çalıştır ve düğmeye bas',
        html: `<p><b>▶ Çalıştır</b>'a bas. Seri monitörde satırlar akarken sahnedeki <b>düğmeye fareyle bas, basılı tut</b> ve bırak.</p>
          <div class="kutu hedef"><b>Hedef:</b> Satırlar önce <b>0</b>, basarken <b>1</b>, bırakınca yine <b>0</b> olsun.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Hiç 1 görünmüyorsa D5 düğme değeri bloğunun pini D5 mi, kontrol et.',
      },
    ],
    sahne: { parcalar: [{ tur: 'dugme', pin: 'D5', renk: 'mavi' }] },
    async girdi(sim) {
      await sim.bekle(1000); bas(sim, 'D5', 1);
      await sim.bekle(1000); bas(sim, 'D5', 0);
    },
    kontrol(sim) {
      const deg = sim.seriCikti.map(s => { const m = /(\d+)\s*$/.exec(s); return m ? +m[1] : null; });
      if (sim.seriCikti.length < 5) return { ok: false, mesaj: 'Seri monitöre yeterince satır yazılmadı. Döngü ve bekleme kullandın mı?' };
      if (deg.some(d => d === null)) return { ok: false, mesaj: 'Her satır 0 veya 1 ile bitmeli (D5 düğme değerini ekle).' };
      if (sim.seriCikti.length > 60) return { ok: false, mesaj: 'Çok fazla satır yazıldı. Döngüye 200 ms bekle ekle.' };
      const bir = deg.filter(d => d === 1).length;
      if (!bir) return { ok: false, mesaj: 'Hiç 1 görünmedi. Düğmenin değerini yazdırdığından emin ol.' };
      if (bir < 2 || bir > 10) return { ok: false, mesaj: 'Basılı kaldığı süre kadar 1 yazılmalı (200 ms\'de bir).' };
      const ilk1 = deg.indexOf(1), son1 = deg.lastIndexOf(1);
      if (deg.slice(ilk1, son1 + 1).some(d => d !== 1) || ilk1 === 0 || son1 === deg.length - 1) return { ok: false, mesaj: 'Sıra 0...0, 1...1, 0...0 olmalı.' };
      return { ok: true, mesaj: 'Harika! Düğme durumunu seri monitörde görüyorsun.' };
    },
  },
  {
    id: 'dugme-sayaci',
    gorevler: G_SAYAC,
    ad: '2.4 · Düğme sayacı',
    modul: MODUL,
    sure: 5000,
    html: `<h2>Düğme sayacı</h2>
      <p>Değişken, sayıyı hatırlayan bir kutudur. Düğmeye her basışı sayalım.</p>
      <ol>
        <li><b>Değişkenler</b> kategorisinde <b>Değişken oluştur…</b> de, adı <i>sayac</i> olsun.</li>
        <li>Önce (döngüden önce) <b>sayac değerini 0 yap</b>.</li>
        <li><b>Sürekli tekrarla</b> içinde: <b>D5 düğmesi basılana kadar bekle</b>, <b>sayac değerini 1 artır</b>, sayacı seri monitöre yaz, sonra <b>D5 düğmesi bırakılana kadar bekle</b>.</li>
      </ol>
      <p>Seri monitörde 1, 2, 3 ... görmelisin. (Bırakılmasını beklemezsen sayaç hızla çılgına döner!)</p>`,
    adimlar: [
      {
        baslik: 'Sayaç fikri',
        html: `<p>Düğmeye kaç kez bastığını kart <b>hatırlamalı</b>. Bunun için bir <b>değişken</b> kullanacağız.</p>
          <div class="kutu bilgi"><b>Değişken</b>, sayı saklayan adlı bir kutudur. Kutuyu bir kez oluşturur, sonra içindeki sayıyı değiştirirsin.
          <pre><code>int sayac = 0;
sayac += 1;</code></pre></div>
          <p>Sahnedeki düğmeye (<span class="pin-etiket">D5</span>) bir kez bas, sonra programı yazalım.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Değişkeni oluştur ve sıfırla',
        html: `<p><span class="chip degisken">Değişkenler</span> kategorisini aç, <b>Değişken oluştur…</b> düğmesine bas ve adı <i>sayac</i> yap. Sonra <span class="chip degisken">sayac değerini [ ] yap</span> bloğunu çalışma alanına koy; değeri <b>0</b> olsun.</p>
          <pre><code>sayac = 0;</code></pre>
          <p>Bu blok döngünün <b>dışında</b> olsun. Sayaç yalnızca başta sıfırlanır.</p>`,
        vurgu: { kategori: 'Değişkenler', blok: 'variables_set' },
        bitti: { blok: 'variables_set' },
        ipucu: 'Değişken oluşturunca kategoride yeni bloklar belirir. "ata" bloğunu al.',
      },
      {
        baslik: 'Sürekli tekrarla ve basışı bekle',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu alıp sayaç bloğunun altına yerleştir. İçine <span class="chip dugme">Düğme</span> kategorisinden <span class="chip dugme">D5 düğmesi basılı kadar bekle</span> bloğunu koy ve durumunu <b>basılı</b> seç.</p>
          <pre><code>while (digitalRead(D5) != HIGH) {
  delay(1);
}</code></pre>
          <p>Kart burada düğmeye basılana kadar bekler.</p>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_bekle' },
        bitti: [{ blok: 'dy_surekli' }, { blok: 'dy_dugme_bekle', alan: { PIN: 'D5', DURUM: '1' }, icinde: 'dy_surekli' }],
        ipucu: 'Bekle bloğundaki durum listesinde basılı ve bırakılmış seçenekleri var. Şimdilik basılı lazım.',
      },
      {
        baslik: 'Sayacı artır ve yazdır',
        html: `<p><span class="chip degisken">sayac değerini [1] artır</span> bloğunu bekle bloğunun altına koy. Sonra <span class="chip seri">seri monitöre yaz</span> bloğuna <span class="chip degisken">sayac</span> değerini tak.</p>
          <pre><code>sayac += 1;
Serial.println(sayac);</code></pre>`,
        vurgu: { kategori: 'Değişkenler', blok: 'math_change' },
        bitti: [{ blok: 'math_change', icinde: 'dy_surekli' }, { blok: 'dy_seri', icinde: 'dy_surekli' }],
        ipucu: 'Artır bloğunu Değişkenler kategorisinde bul. Seri monitöre yaz bloğu Seri kategorisinde.',
      },
      {
        baslik: 'Bırakılmasını bekle',
        html: `<p>Son olarak <span class="chip dugme">D5 düğmesi bekle</span> bloğunu bir tane daha al, en alta koy ve durumunu <b>bırakılmış</b> yap.</p>
          <pre><code>while (digitalRead(D5) != LOW) {
  delay(1);
}</code></pre>
          <div class="kutu dikkat"><b>Dikkat:</b> Bu blok olmazsa düğme basılı kaldığı sürece sayaç çılgınca artar. Kart "bir basış" ile "basılı tutuş" arasındaki farkı bilmez!</div>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_bekle' },
        bitti: { blok: 'dy_dugme_bekle', alan: { PIN: 'D5', DURUM: '0' }, icinde: 'dy_surekli' },
        ipucu: 'Aynı blok, sadece durumu farklı: bu sefer bırakılmış seçili olsun.',
      },
      {
        baslik: 'Çalıştır ve 3 kez bas',
        html: `<p><b>▶ Çalıştır</b>'a bas. Sahnedeki düğmeye <b>3 kez</b> fareyle bas, her seferinde bırak.</p>
          <div class="kutu hedef"><b>Hedef:</b> Seri monitörde <b>1, 2, 3</b> yazsın.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Sayılar çok hızlı artıyorsa bırakılmasını bekleyen bloğu eklediğinden emin ol.',
      },
    ],
    sahne: { parcalar: [{ tur: 'dugme', pin: 'D5', renk: 'yesil' }] },
    async girdi(sim) {
      await sim.bekle(500);
      for (let i = 0; i < 3; i++) { bas(sim, 'D5', 1); await sim.bekle(300); bas(sim, 'D5', 0); await sim.bekle(500); }
    },
    kontrol(sim) {
      if (!sim.seriCikti.length) return { ok: false, mesaj: 'Seri monitöre hiçbir şey yazılmadı.' };
      const deg = sim.seriCikti.map(s => { const m = /(\d+)\s*$/.exec(s); return m ? +m[1] : NaN; });
      const bekl = [1, 2, 3];
      if (deg.length !== 3) return { ok: false, mesaj: `Düğmeye 3 kez basıldı ama ${deg.length} satır yazıldı. Her basışta bir kez yaz; bırakılmasını bekle.` };
      if (deg.some((d, i) => d !== bekl[i])) return { ok: false, mesaj: 'Sayaç 1, 2, 3 diye artmalı (başlangıç 0, her basışta +1).' };
      return { ok: true, mesaj: 'Süper! Değişkenle düğme basışlarını saydın.' };
    },
  },
  {
    id: 'refleks-oyunu',
    gorevler: G_REFLEKS,
    ad: '2.5 · Refleks oyunu',
    modul: MODUL,
    sure: 6000,
    html: `<h2>Refleks oyunu</h2>
      <p>LED rastgele bir an yanacak. Yanar yanmaz düğmeye bas; ne kadar hızlı olduğunu ölçelim!</p>
      <ol>
        <li><b>2000 ms bekle</b> (oyuncu LED'in ne zaman yanacağını bilmesin).</li>
        <li><b>D2 pinini YÜKSEK</b> yap ve <b>geçen süre (ms)</b> değerini <i>baslangic</i> değişkenine kaydet.</li>
        <li><b>D5 düğmesi basılana kadar bekle</b>.</li>
        <li><i>sure</i> = <b>geçen süre</b> − <i>baslangic</i>.</li>
        <li>Seri monitöre yaz: <i>"Tepki: "</i> + sure + <i>" ms"</i> (birleştir ve sayıyı metne çevir kullan). Sonunda D2'yi söndür.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Oyunun planı',
        html: `<p>Plan şöyle: kart biraz bekler, <span class="pin-etiket">D2</span> LED'ini yakar ve sen <span class="pin-etiket">D5</span> düğmesine basana kadar geçen süreyi ölçer.</p>
          <div class="kutu bilgi"><b>Zaman ölçmek:</b> Kart açıldığı andan beri milisaniye sayar. Yanma anını ve basış anını kaydedip farkını alırsak tepki süreni buluruz.
          <pre><code>baslangic = millis();
sure = millis() - baslangic;</code></pre></div>`,
        vurgu: { parca: 1 },
      },
      {
        baslik: 'Bekle ve LED\'i yak',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">ms bekle</span> bloğunu al ve <b>2000</b> yap. Altına <span class="chip pin">Pinler</span> kategorisinden <span class="chip pin">D2 pinini YÜKSEK (1) yap</span> bloğunu koy.</p>
          <pre><code>delay(2000);
digitalWrite(D2, HIGH);</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: [{ blok: 'dy_bekle' }, { blok: 'dy_yaz', alan: { PIN: 'D2', DEG: '1' } }],
        ipucu: 'Pin D2 ve değer YÜKSEK olmalı. Bekleme bloğu LED bloğunun üstünde dursun.',
      },
      {
        baslik: 'Başlangıç zamanını kaydet',
        html: `<p><span class="chip degisken">Değişkenler</span> kategorisinde <i>baslangic</i> adlı bir değişken oluştur ve <span class="chip degisken">baslangic değerini [ ] yap</span> bloğunu al. İçine <span class="chip analog">Metin</span> kategorisindeki <span class="chip analog">geçen süre (ms)</span> bloğunu tak.</p>
          <pre><code>baslangic = millis();</code></pre>`,
        vurgu: { kategori: 'Metin', blok: 'dy_degisken_zaman' },
        bitti: [{ blok: 'variables_set' }, { blok: 'dy_degisken_zaman' }],
        ipucu: 'Geçen süre bloğu Metin kategorisinde. Değişken ata bloğunun yuvasına tak.',
      },
      {
        baslik: 'Basılmasını bekle ve süreyi hesapla',
        html: `<p><span class="chip dugme">D5 düğmesi basılı kadar bekle</span> bloğunu al (<span class="chip dugme">Düğme</span> kategorisi). Altına <i>sure</i> adlı yeni bir değişken ata ve içine bir <span class="chip sayi">Sayı</span> kategorisinden <span class="chip sayi">çıkarma (−)</span> bloğu tak: <b>geçen süre</b> − <b>baslangic</b>.</p>
          <pre><code>while (digitalRead(D5) != HIGH) {
  delay(1);
}
sure = millis() - baslangic;</code></pre>
          <p>Bloğun işlem listesinden <b>−</b> seçmeyi unutma.</p>`,
        vurgu: { kategori: 'Düğme', blok: 'dy_dugme_bekle' },
        bitti: [{ blok: 'dy_dugme_bekle', alan: { PIN: 'D5', DURUM: '1' } }, { blok: 'math_arithmetic' }],
        ipucu: 'Çıkarma sırası önemli: şimdiki zaman eksi başlangıç zamanı.',
      },
      {
        baslik: 'Sonucu yazdır',
        html: `<p><span class="chip seri">seri monitöre yaz</span> bloğuna <span class="chip analog">birleştir</span> tak: <i>Tepki: </i> + <span class="chip analog">sure sayısını metne çevir</span>. Sonra bir birleştir daha ekleyip sonuna <i> ms</i> ekle.</p>
          <pre><code>Serial.println((String((String("Tepki: ") + String(String(sure)))) + String(" ms")));</code></pre>
          <div class="kutu bilgi">Kod karışık görünüyor ama yaptığı şey basit: metinleri uç uca yapıştırıyor.</div>
          <p>Son olarak <span class="pin-etiket">D2</span> pinini <b>DÜŞÜK</b> yaparak LED'i söndür.</p>`,
        vurgu: { kategori: 'Seri', blok: 'dy_seri' },
        bitti: [{ blok: 'dy_seri' }, { blok: 'dy_degisken_sayi_metin' }, { blok: 'dy_yaz', alan: { PIN: 'D2', DEG: '0' } }],
        ipucu: 'Sayıyı yazıyla birleştirmeden önce metne çevirmen gerekir.',
      },
      {
        baslik: 'Oyna!',
        html: `<p><b>▶ Çalıştır</b>'a bas. LED yanar yanmaz sahnedeki <b>düğmeye fareyle bas</b>.</p>
          <div class="kutu hedef"><b>Hedef:</b> Seri monitörde tepki süren (ms) yazsın.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Süre çok tuhaf çıkıyorsa baslangic değerini LED yandıktan hemen sonra kaydettiğine bak.',
      },
    ],
    sahne: { parcalar: [{ tur: 'dugme', pin: 'D5', renk: 'kirmizi' }, { tur: 'led', pin: 'D2', renk: 'yesil' }] },
    async girdi(sim) {
      while (!sim.pin.D2.deger) await sim.tick();
      await sim.bekle(350);
      bas(sim, 'D5', 1);
      await sim.bekle(300);
      bas(sim, 'D5', 0);
    },
    kontrol(sim) {
      const yan = sim.olaylar.find(o => o.pin === 'D2' && o.deger > 0);
      if (!yan) return { ok: false, mesaj: 'LED hiç yanmadı.' };
      if (yan.t < 500) return { ok: false, mesaj: 'LED hemen yandı. Önce biraz bekle ki oyun heyecanlı olsun.' };
      const bas1 = gecmis(sim, 'D5').find(o => o.deger > 0);
      const gercek = bas1.t - yan.t;
      const satir = sim.seriCikti.find(s => /\d/.test(s));
      if (!satir) return { ok: false, mesaj: 'Seri monitöre tepki süresi yazılmadı.' };
      const sayi = +(/(\d+)/.exec(satir)[1]);
      if (Math.abs(sayi - gercek) > 60) return { ok: false, mesaj: `Ölçülen süre (${sayi} ms) gerçek süreye (~${gercek} ms) uymuyor. LED yandığı anı ve basılma anını kaydet.` };
      return { ok: true, mesaj: `Tepki süren ${sayi} ms. Harika oyun!` };
    },
  },
];
