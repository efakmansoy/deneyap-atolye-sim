// Modül 5: LCD ekran ve Proje (otomatik perde).
const SERVO = 'D4', ISIK = 'A0';

// Türkçe karakterleri sadeleştirip küçük harfe çevir
const duz = s => String(s ?? '').toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
const lcdMetin = sim => (sim.cihaz.lcd ?? ['', '']).map(s => String(s ?? ''));
// Senaryo çalışırken yeni bir koşu başladıysa (cihaz sıfırlandıysa) senaryoyu bırak
const canli = (sim, cihaz) => sim.cihaz === cihaz && !sim.iptal;

// ── GÖREVLER sekmesi içeriği (kod görevleri + sorular, karışık sıra) ──
// LCD satır 2'de görülen sayıların (art arda tekrarsız) sırası; satır metni yoksa atlanır
const kayitlar = sim => [...(sim.cihaz.kayit ?? []), lcdMetin(sim)];
const sayiDizisi = (kayit, satir = 1) => {
  const d = [];
  for (const k of kayit) {
    const m = String(k[satir] ?? '').trim();
    if (/^-?\d+$/.test(m) && d[d.length - 1] !== +m) d.push(+m);
  }
  return d;
};
// Işık senaryosu: her değer için 1800 ms bekler, sonra servo ve LCD durumunu kaydeder
const isikSenaryosu = (degerler) => async (sim) => {
  const cihaz = sim.cihaz;
  cihaz.kayit = [];
  for (const deger of degerler) {
    sim.analog[ISIK] = deger;
    await sim.bekle(1800);
    if (!canli(sim, cihaz)) return;
    cihaz.kayit.push({ isik: deger, servo: cihaz.servo?.[SERVO], lcd: lcdMetin(sim) });
  }
};
const servoYok = k => k.every(x => x.servo == null);

const gorev51 = [
  {
    tip: 'kod', baslik: 'Sabit iki satır',
    metin: `LCD'nin <b>1. satırına</b> <i>Merhaba</i>, <b>2. satırına</b> <i>Deneyap</i> yaz. Sayaç ve döngü gerekmez; sadece iki <b>LCD satır yaz</b> bloğu kullan.`,
    ipucu: 'Aynı bloktan iki tane al; birinin satırını 2 yap ve yazısını değiştir. Türkçe karakter kullanma.',
    sure: 2000,
    kontrol(sim) {
      if (!sim.cihaz.lcd) return { ok: false, mesaj: 'Ekrana henüz bir şey yazılmadı. LCD satır yaz bloklarını kullan.' };
      const l = lcdMetin(sim);
      if (!duz(l[0]).includes('merhaba')) return { ok: false, mesaj: 'Satır 1\'de "Merhaba" yazmalı.' };
      if (!duz(l[1]).includes('deneyap')) return { ok: false, mesaj: 'Satır 2\'de "Deneyap" yazmalı. İkinci bloğun satır numarasını 2 yap.' };
      return { ok: true, mesaj: 'İki satır da ekranda!' };
    },
  },
  {
    tip: 'soru', soru: `16x2 bir LCD ekranda aynı anda en fazla kaç karakter görünür?`,
    secenekler: ['16', '18', '2', '32'], dogru: 3,
    aciklama: '2 satır x 16 sütun = 32 karakter. Her satıra en fazla 16 karakter sığar.',
  },
  {
    tip: 'kod', baslik: 'Geri sayım',
    metin: `LCD'nin <b>2. satırında 5'ten 1'e doğru geri say</b> (5, 4, 3, 2, 1), her sayı <b>500 ms</b> kalsın. Geri sayım bitince 2. satırda <i>Basla</i> yazsın.`,
    ipucu: '"say" bloğunda başlangıcı 5, bitişi 1 yap ve adımı -1 olarak ayarla (dişliden "her seferinde" değerine bak).',
    kontrol(sim) {
      const k = kayitlar(sim);
      const d = sayiDizisi(k);
      if (!d.length) return { ok: false, mesaj: 'Satır 2\'de sayı görünmedi. i değişkenini LCD\'nin 2. satırına yaz.' };
      if (d.join() !== '5,4,3,2,1') return { ok: false, mesaj: `Ekranda şu sayılar görüldü: ${d.join(', ')}. İstenen: 5, 4, 3, 2, 1.` };
      if (!duz(lcdMetin(sim)[1]).includes('basla')) return { ok: false, mesaj: 'Geri sayım bitince 2. satırda "Basla" yazmalı.' };
      return { ok: true, mesaj: 'Geri sayım tamam, "Basla"!' };
    },
  },
  {
    tip: 'soru', soru: `<code>for (int i = 1; i &lt;= 5; i += 1) { ... }</code> döngüsünün içindeki kod kaç kez çalışır?`,
    secenekler: ['4 kez', '5 kez', '6 kez', 'Sonsuza kadar'], dogru: 1,
    aciklama: 'i, 1\'den başlayıp 5 dahil olmak üzere 1, 2, 3, 4, 5 değerlerini alır: toplam 5 tur.',
  },
  {
    tip: 'kod', baslik: 'Çift sayılar',
    metin: `LCD'nin <b>2. satırında çift sayılar</b> görünsün: <b>2, 4, 6, 8, 10</b>. Her sayı <b>400 ms</b> kalsın. Döngünün adımını (her seferinde ne kadar artacağını) değiştirmen gerekecek.`,
    ipucu: '"say" bloğunda başlangıç 2, bitiş 10 olsun. Adım değerini 1 yerine 2 yap.',
    kontrol(sim) {
      const d = sayiDizisi(kayitlar(sim));
      if (!d.length) return { ok: false, mesaj: 'Satır 2\'de sayı görünmedi. i değişkenini LCD\'nin 2. satırına yaz.' };
      if (d.join() !== '2,4,6,8,10') return { ok: false, mesaj: `Ekranda şu sayılar görüldü: ${d.join(', ')}. İstenen: 2, 4, 6, 8, 10 (adım 2).` };
      return { ok: true, mesaj: 'Çift sayılar ekranda!' };
    },
  },
  {
    tip: 'soru', soru: `<code>lcd.setCursor(0, 1);</code> komutundan sonra <code>lcd.print("A");</code> yazılırsa "A" harfi nerede görünür?`,
    secenekler: ['1. satırın başında', '1. satırın sonunda', '2. satırın sonunda', '2. satırın başında'], dogru: 3,
    aciklama: 'setCursor(sütun, satır) içinde satır 0\'dan başlar: 1 numarası 2. satırdır, sütun 0 ise satırın başıdır.',
  },
  {
    tip: 'kod', baslik: 'Sayi: metni',
    metin: `LCD'nin <b>2. satırında</b> <i>Sayi: 1</i>, <i>Sayi: 2</i> ... <i>Sayi: 5</i> yazsın (her biri 500 ms). Bunun için <b>birleştir</b> bloğuyla yazıyı ve <b>i</b> sayısını yan yana getir.`,
    ipucu: 'Metin kategorisindeki "birleştir" bloğunun ilk yuvasına "Sayi: " yaz, ikinci yuvasına i değişkenini tak.',
    kontrol(sim) {
      const hepsiK = kayitlar(sim).map(k => duz(k[1]).trim());
      const d = [];
      for (const m of hepsiK) {
        const e = m.match(/^sayi:\s*(\d+)$/);
        if (e && d[d.length - 1] !== +e[1]) d.push(+e[1]);
      }
      if (!d.length) return { ok: false, mesaj: 'Satır 2\'de "Sayi: 1" gibi bir yazı görünmedi. Yazı ile i değişkenini birleştir bloğuyla birleştir.' };
      if (d.join() !== '1,2,3,4,5') return { ok: false, mesaj: `Ekranda şu sayılar görüldü: ${d.join(', ')}. İstenen: Sayi: 1 ... Sayi: 5.` };
      return { ok: true, mesaj: 'Yazı ve sayı birlikte ekranda!' };
    },
  },
  {
    tip: 'soru', soru: `Sayaç döngüsünün içindeki <code>delay(500);</code> satırını silersek ne görürüz?`,
    secenekler: ['Ekran boş kalır', 'Sayılar çok hızlı değişir; son sayı hemen görünür, ara sayıları göremeyiz', 'Sayılar iki kat yavaşlar', 'Kart hata verir'], dogru: 1,
    aciklama: 'Bekleme olmadan döngü milisaniyeden kısa sürede biter. Göz ara sayıları yakalayamaz, yalnızca sonuncuyu görür.',
  },
];

const gorev52 = [
  {
    tip: 'kod', baslik: 'Ters perde',
    metin: `Bu sefer perde <b>tersine</b> çalışsın (güneşlik gibi): ışık <b>2000'den büyükse</b> perde <b>kapansın</b> (servo <b>0</b>), ışık düşükken <b>açılsın</b> (servo <b>180</b>). Güneşi indirip çıkarınca denetlenir.`,
    ipucu: 'Koşulu değiştirme; "eğer" ve "değilse" kollarındaki servo açılarını yer değiştir.',
    girdi: isikSenaryosu([3600, 400, 3900, 300]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!k.length) return { ok: false, mesaj: 'Program ışığı sürekli izlemeli: tüm adımları sürekli tekrarla içine koy.' };
      if (servoYok(k)) return { ok: false, mesaj: `Servo hiç hareket etmedi. ${SERVO} servo yaz bloğunu kullan.` };
      if (!k.filter(x => x.isik > 2000).every(x => x.servo != null && x.servo <= 30)) return { ok: false, mesaj: 'Işık yüksekken perde kapanmalı: servoyu 0 yap.' };
      if (!k.filter(x => x.isik < 1500).every(x => x.servo != null && x.servo >= 150)) return { ok: false, mesaj: 'Işık düşükken perde açılmalı: servoyu 180 yap.' };
      return { ok: true, mesaj: 'Ters çalışan perde hazır!' };
    },
  },
  {
    tip: 'soru', soru: `ESP32-S3'te <code>analogRead()</code> varsayılan olarak hangi aralıkta bir sayı verir?`,
    secenekler: ['0 - 255', '0 - 1023', '0 - 4095', '0 - 65535'], dogru: 2,
    aciklama: 'ESP32-S3\'ün ADC\'si varsayılan 12 bitliktir: 2^12 = 4096 değer, yani 0 ile 4095 arası.',
  },
  {
    tip: 'kod', baslik: 'Işık değerini göster',
    metin: `Perde normal çalışsın (2000'den büyükse 180, değilse 0). Ayrıca LCD'nin <b>2. satırında ışık sensörünün değerini</b> (<span class="pin-etiket">${ISIK}</span> analog oku) <b>canlı</b> göster.`,
    ipucu: 'Analog oku bloğunu LCD satır 2 bloğunun yazı yuvasına tak. Bu LCD bloğu if dışında, döngünün içinde olsun ki hep güncellensin.',
    girdi: isikSenaryosu([400, 3600, 1200, 3900]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!k.length) return { ok: false, mesaj: 'Program ışığı sürekli izlemeli: tüm adımları sürekli tekrarla içine koy.' };
      if (servoYok(k)) return { ok: false, mesaj: `Servo hiç hareket etmedi. ${SERVO} servo yaz bloğunu kullan.` };
      if (!k.filter(x => x.isik > 2000).every(x => x.servo >= 150)) return { ok: false, mesaj: 'Işık yüksekken perde açılmalı: servoyu 180 yap.' };
      if (!k.filter(x => x.isik < 1500).every(x => x.servo != null && x.servo <= 30)) return { ok: false, mesaj: 'Işık düşükken perde kapanmalı: servoyu 0 yap.' };
      for (const x of k) {
        const n = parseInt(String(x.lcd[1]).trim(), 10);
        if (!Number.isFinite(n)) return { ok: false, mesaj: 'LCD\'nin 2. satırında ışık değeri (bir sayı) görünmeli.' };
        if (Math.abs(n - x.isik) > 1) return { ok: false, mesaj: `Işık ${x.isik} iken ekranda ${n} yazıyor. Ekran ışık değerini canlı göstermeli.` };
      }
      return { ok: true, mesaj: 'Perde çalışıyor ve ışık değeri ekranda!' };
    },
  },
  {
    tip: 'soru', soru: `Perde projesinde tüm kodun <b>sürekli tekrarla</b> içinde olmasının nedeni nedir?`,
    secenekler: ['Servo motoru yalnızca döngü içinde çalışır', 'Işık sürekli değişebilir; ölçümü ve kararı tekrar tekrar yapmak gerekir', 'LCD ekran döngü olmadan yazı gösteremez', 'Döngü olmazsa kart bozulur'], dogru: 1,
    aciklama: 'Güneş istediği an değişebilir. Işığı bir kez ölçüp bırakırsak perde sonraki değişiklikleri göremez.',
  },
  {
    tip: 'kod', baslik: 'Yüksek eşik',
    metin: `Perde daha "inatçı" olsun: ışık <b>3000'den büyükse</b> açılsın (servo <b>180</b>), aksi halde kapalı (servo <b>0</b>) olsun. 2500 gibi orta ışıkta perde <b>kapalı</b> kalmalı.`,
    ipucu: 'Karşılaştırma bloğundaki 2000 sayısını değiştir.',
    girdi: isikSenaryosu([2500, 3500, 2800, 3800, 1000]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!k.length) return { ok: false, mesaj: 'Program ışığı sürekli izlemeli: tüm adımları sürekli tekrarla içine koy.' };
      if (servoYok(k)) return { ok: false, mesaj: `Servo hiç hareket etmedi. ${SERVO} servo yaz bloğunu kullan.` };
      if (!k.filter(x => x.isik > 3000).every(x => x.servo >= 150)) return { ok: false, mesaj: 'Işık 3000\'den büyükken perde açılmalı (servo 180).' };
      if (!k.filter(x => x.isik <= 3000).every(x => x.servo != null && x.servo <= 30)) return { ok: false, mesaj: 'Işık 3000 ya da daha azken perde kapalı olmalı (servo 0). Eşik değerini 3000 yaptın mı?' };
      return { ok: true, mesaj: 'Eşik 3000 oldu, perde daha geç açılıyor!' };
    },
  },
  {
    tip: 'soru', soru: `Eşiği 2000'den 3000'e çıkarırsak perde ne zaman açılır?`,
    secenekler: ['Daha az ışıkta, yani daha erken', 'Daha çok ışık olunca, yani daha geç', 'Hiç açılmaz', 'Eşik açılma zamanını etkilemez'], dogru: 1,
    aciklama: 'Perde ışık > eşik olunca açılır. Eşik büyüyünce açılmak için daha parlak ışık gerekir.',
  },
  {
    tip: 'kod', baslik: 'Üç kademe',
    metin: `Perde artık <b>üç konumlu</b> olsun: ışık <b>1000'den küçükse</b> kapalı (servo <b>0</b>), <b>1000 ile 3000 arasındaysa</b> yarı açık (servo <b>90</b>), <b>3000'den büyükse</b> tam açık (servo <b>180</b>).`,
    ipucu: '"Değilse eğer" kolunu kullan: önce 3000\'den büyük mü bak, sonra 1000\'den büyük mü, hiçbiri değilse 0.',
    girdi: isikSenaryosu([500, 2000, 3800, 2000, 500]),
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!k.length) return { ok: false, mesaj: 'Program ışığı sürekli izlemeli: tüm adımları sürekli tekrarla içine koy.' };
      if (servoYok(k)) return { ok: false, mesaj: `Servo hiç hareket etmedi. ${SERVO} servo yaz bloğunu kullan.` };
      if (!k.filter(x => x.isik < 1000).every(x => x.servo != null && x.servo <= 10)) return { ok: false, mesaj: 'Işık 1000\'den azken perde kapalı olmalı (servo 0).' };
      if (!k.filter(x => x.isik >= 1000 && x.isik <= 3000).every(x => x.servo >= 80 && x.servo <= 100)) return { ok: false, mesaj: 'Işık 1000 ile 3000 arasındayken perde yarı açık olmalı (servo 90).' };
      if (!k.filter(x => x.isik > 3000).every(x => x.servo >= 170)) return { ok: false, mesaj: 'Işık 3000\'den fazlayken perde tam açık olmalı (servo 180).' };
      return { ok: true, mesaj: 'Üç konumlu akıllı perde tamam!' };
    },
  },
];

export default [
  {
    id: 'lcd-merhaba',
    ad: '5.1 · LCD ekran',
    sure: 5000,
    gorevler: gorev51,
    html: `<h2>LCD ekran</h2>
      <p>Kartına 16x2 karakterlik bir LCD bağlı: 2 satır, her satırda 16 harf sığar.</p>
      <ol>
        <li><b>Ekran</b> kategorisinden <b>LCD satır 1 yaz</b> bloğunu al ve içine <i>Merhaba</i> yaz.</li>
        <li>Bir tane daha <b>LCD satır 2 yaz</b> bloğu al; bu satırda bir <b>sayaç</b> göstereceğiz.</li>
        <li><b>i değerini 1'den 5'e say</b> bloğunu kullan; içinde satır 2'ye <b>i</b> değişkenini yaz ve <b>500 ms bekle</b>.</li>
      </ol>
      <p>Sayı 1, 2, 3... diye ekranda artmalı. Satır 1'de <b>Merhaba</b> yazısı kalsın.</p>`,
    adimlar: [
      {
        baslik: 'LCD ekranı tanı',
        html: `<p>Sahnede küçük bir <b>LCD ekran</b> var. <b>16x2</b>, yani 2 satır ve her satırda 16 harf sığar. Şimdiye kadar sadece LED yaktık; artık kart sana yazıyla cevap verebilir!</p>
          <div class="kutu bilgi">Kod tarafında ekran bir kütüphane ile yönetilir. Satırı seçip yazarız:
            <pre><code>lcd.setCursor(0, 0);
lcd.print("Merhaba");</code></pre>
            Burada ilk sayı sütunu, ikinci sayı satırı gösterir (0 = ilk satır).</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Satır 1\'e Merhaba yaz',
        html: `<p><span class="chip ekran">Ekran</span> kategorisini aç, <span class="chip ekran">LCD satır 1 yaz</span> bloğunu çalışma alanına sürükle. İçindeki yazı zaten <span class="chip analog">Merhaba</span>.</p>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: { blok: 'dy_lcd_yaz', alan: { SATIR: '0' } },
        ipucu: 'Bloktaki satır numarası 1 olmalı (kodda 0 olarak görünür).',
      },
      {
        baslik: 'Sayaç döngüsü',
        html: `<p>Aynı kategoriden <span class="chip ekran">say: i değeri 1'den 5'e</span> bloğunu al ve <b>Merhaba</b> bloğunun altına tak.</p>
          <div class="kutu bilgi"><b>Döngü</b>, aynı işi birkaç kez tekrarlar. <span class="chip degisken">i</span> bir <b>değişken</b>: her turda değeri 1 artar.
            <pre><code>for (int i = 1; i &lt;= 5; i += 1) {
  ...
}</code></pre></div>`,
        vurgu: { kategori: 'Ekran', blok: 'controls_for' },
        bitti: { blok: 'controls_for' },
        ipucu: 'Döngü bloğu Ekran kategorisinin altlarında, içinde "say" yazan blok.',
      },
      {
        baslik: 'Satır 2\'ye i yaz',
        html: `<p>Döngünün içine ikinci bir <span class="chip ekran">LCD satır yaz</span> bloğu koy ve satırını <b>2</b> yap. Yazının yerine <span class="chip degisken">i</span> değişkenini tak.</p>
          <pre><code>lcd.setCursor(0, 1);
lcd.print(i);</code></pre>`,
        vurgu: { kategori: 'Ekran', blok: 'variables_get' },
        bitti: [{ blok: 'dy_lcd_yaz', alan: { SATIR: '1' }, icinde: 'controls_for' }, { blok: 'variables_get', icinde: 'controls_for' }],
        ipucu: 'Önce LCD bloğunu döngüye koy, sonra "i" bloğunu onun yazı yuvasına sürükle (Merhaba yazısının üstüne bırakabilirsin).',
      },
      {
        baslik: 'Sayıyı yavaşlat',
        html: `<p>Döngünün içine, LCD bloğunun altına <span class="chip akis">500 ms bekle</span> ekle. Yoksa sayılar göz açıp kapayana kadar biter!</p>
          <pre><code>delay(500);</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', icinde: 'controls_for' },
        ipucu: 'Bekle bloğu döngünün içinde olmalı, dışında değil.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve ekranı izle.</p>
          <div class="kutu hedef"><b>Hedef:</b> ilk satırda <i>Merhaba</i> yazsın, ikinci satırda 1'den 5'e sayı saysın.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Sayı değişmiyorsa i bloğunun döngünün içindeki LCD bloğuna takılı olduğuna bak.',
      },
    ],
    sahne: { parcalar: [{ tur: 'lcd', kablo: false, konum: [78, 0, 10] }] },
    async girdi(sim) {
      const cihaz = sim.cihaz;
      cihaz.kayit = [];
      for (let i = 0; i < 18; i++) {
        await sim.bekle(250);
        if (!canli(sim, cihaz)) return;
        cihaz.kayit.push(lcdMetin(sim));
      }
    },
    kontrol(sim) {
      const l = lcdMetin(sim);
      if (!sim.cihaz.lcd) return { ok: false, mesaj: 'Ekrana henüz bir şey yazılmadı. LCD satır yaz bloklarını kullan.' };
      const kayit = [...(sim.cihaz.kayit ?? []), l];
      if (!kayit.some(k => duz(k[0]).includes('merhaba'))) return { ok: false, mesaj: 'Satır 1\'de "Merhaba" yazmalı.' };
      const sayilar = new Set(kayit.map(k => k[1].trim()).filter(s => /^-?\d+$/.test(s)));
      if (sayilar.size === 0) return { ok: false, mesaj: 'Satır 2\'de bir sayı göstermelisin (i değişkenini yaz).' };
      if (sayilar.size < 3) return { ok: false, mesaj: 'Sayı değişmeli: 1\'den 5\'e sayan döngü kur ve her turda 500 ms bekle.' };
      return { ok: true, mesaj: 'Süper, ekranda sayaç çalışıyor!' };
    },
  },
  {
    id: 'proje-perde',
    ad: '5.2 · Proje: otomatik perde',
    sure: 10000,
    gorevler: gorev52,
    html: `<h2>Proje: otomatik perde</h2>
      <p>Odanın perdesi güneşe göre kendi kendine açılıp kapansın! Pencerenin solundaki <b>güneşi yukarı-aşağı sürükleyerek</b> ışığı değiştirebilirsin.
      Servo motor <b>${SERVO}</b> pinine, ışık sensörü <b>${ISIK}</b> pinine bağlı.</p>
      <ol>
        <li><b>sürekli tekrarla</b> bloğunu çalışma alanına koy.</li>
        <li>İçinde <b>${ISIK} analog oku</b> bloğunu kullanarak ışığı ölç (0-4095).</li>
        <li><b>eğer</b> ışık <b>2000'den büyükse</b> (gün ışığı): <b>${SERVO} servo yaz 180</b> (perde açık).</li>
        <li><b>değilse</b>: <b>${SERVO} servo yaz 0</b> (perde kapalı).</li>
        <li>Aynı koşullara <b>LCD satır 1 yaz</b> ekle: açıkken <i>Perde: Acik</i>, kapalıyken <i>Perde: Kapali</i>.</li>
        <li>Döngünün sonuna <b>100 ms bekle</b> ekle ve ▶ Çalıştır'a bas. Güneşi indir-çıkar, perdeyi izle!</li>
      </ol>
      <h3>Kontrol listesi</h3>
      <ul>
        <li>Işık yüksekken perde açılıyor ve LCD "Perde: Acik" diyor</li>
        <li>Işık düşükken perde kapanıyor ve LCD "Perde: Kapali" diyor</li>
        <li>Program sürekli çalışıyor, ışık değişince perde de değişiyor</li>
      </ul>`,
    adimlar: [
      {
        baslik: 'Projeyi tanı',
        html: `<p>Sahnede bir pencere, perde ve LCD var. Perdeyi <b>servo motor</b> (<span class="pin-etiket">${SERVO}</span>) açıp kapatır, güneşin ışığını <b>ışık sensörü</b> (<span class="pin-etiket">${ISIK}</span>) ölçer.</p>
          <div class="kutu bilgi"><b>Fikir:</b> ışığı oku. Işık çoksa perde aç, azsa kapat. Bunu hep tekrarla. Daha önce öğrendiklerinin hepsi bu projede bir arada!</div>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli tekrarla',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al. Perde sürekli ışığı izleyecek.</p>
          <pre><code>while (true) {
  ...
}</code></pre>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Eğer bloğu ve ışık koşulu',
        html: `<p>Döngünün içine <span class="chip akis">eğer</span> bloğunu koy. Sonra koşul yuvasına <span class="chip mantik">karşılaştırma</span> bloğunu tak: <span class="chip analog">${ISIK} analog oku</span> <b>&gt;</b> <span class="chip sayi">2000</span>.</p>
          <div class="kutu bilgi"><code>analogRead</code> ışığı <b>0 ile 4095</b> arasında bir sayı olarak verir. Büyük sayı = çok ışık.
            <pre><code>if ((analogRead(${ISIK}) &gt; 2000)) {
  ...
}</code></pre></div>
          <div class="kutu dikkat">"Eğer" bloğundaki küçük dişli ile <b>değilse</b> kolunu ekleyebilirsin.</div>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'logic_compare' }, { blok: 'dy_analog_oku', alan: { PIN: ISIK } }],
        ipucu: 'Karşılaştırma Mantık kategorisinde, analog oku Analog kategorisinde. Karşılaştırmayı eğer bloğunun koşul yuvasına tak. "Değilse" için dişliye tıkla.',
      },
      {
        baslik: 'Perdeyi aç ve kapat',
        html: `<p><span class="chip ses">Ses ve hareket</span> kategorisinden <span class="chip ses">${SERVO} servo yaz</span> bloğunu <b>iki kez</b> kullan:</p>
          <ul><li><b>Eğer</b> kolunda açı <b>180</b> (perde açık)</li>
          <li><b>Değilse</b> kolunda açı <b>0</b> (perde kapalı)</li></ul>
          <pre><code>servo_${SERVO}.write(180);</code></pre>`,
        vurgu: { kategori: 'Ses ve hareket', blok: 'dy_servo_yaz' },
        bitti: { blok: 'dy_servo_yaz', alan: { PIN: SERVO }, adet: 2, icinde: 'dy_surekli' },
        ipucu: 'Servo bloğunun pini ' + SERVO + ' olmalı. Birinin açısı 180, diğerinin 0.',
      },
      {
        baslik: 'LCD\'ye durumu yaz',
        html: `<p><span class="chip ekran">Ekran</span> kategorisinden iki <span class="chip ekran">LCD satır 1 yaz</span> bloğu al; servo bloklarının yanına koy.</p>
          <ul><li>Perde açıkken: <span class="chip analog">Perde: Acik</span></li>
          <li>Perde kapalıyken: <span class="chip analog">Perde: Kapali</span></li></ul>
          <div class="kutu dikkat">Yazıyı tam böyle yaz. Türkçe karakter (ç, ı) kullanma, ekran onları göstermez.</div>`,
        vurgu: { kategori: 'Ekran', blok: 'dy_lcd_yaz' },
        bitti: { blok: 'dy_lcd_yaz', adet: 2, icinde: 'dy_surekli' },
        ipucu: 'Metin kutusuna tıklayıp yazıyı değiştirebilirsin.',
      },
      {
        baslik: 'Kısa bekle ve çalıştır',
        html: `<p>Döngünün sonuna <span class="chip akis">100 ms bekle</span> ekle, sonra ▶ <b>Çalıştır</b>'a bas. Güneşi aşağı yukarı sürükleyip perdeyi izle!</p>
          <pre><code>delay(100);</code></pre>
          <div class="kutu hedef"><b>Hedef:</b> ışık yüksekken perde açılsın ve LCD "Perde: Acik" desin; ışık azalınca kapansın ve "Perde: Kapali" yazsın.</div>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Çalışmıyorsa her şeyin sürekli tekrarla içinde olduğunu ve 180 / 0 değerlerini kontrol et.',
      },
    ],
    sahne: { parcalar: [
      { tur: 'perde', servoPin: SERVO, isikPin: ISIK, kablo: false, konum: [92, 0, -6] },
      { tur: 'lcd', kablo: false, konum: [70, 0, 24] },
    ] },
    async girdi(sim) {
      const cihaz = sim.cihaz;
      cihaz.kayit = [];
      const faz = async (deger) => {
        sim.analog[ISIK] = deger;
        await sim.bekle(1800);
        if (!canli(sim, cihaz)) return false;
        cihaz.kayit.push({ isik: deger, servo: cihaz.servo?.[SERVO], lcd: lcdMetin(sim).join('|') });
        return true;
      };
      for (const d of [400, 3600, 300, 3900]) if (!await faz(d)) return;
    },
    kontrol(sim) {
      const k = sim.cihaz.kayit ?? [];
      if (!k.length) return { ok: false, mesaj: 'Program ışığı sürekli izlemeli: tüm adımları bir sürekli tekrarla bloğunun içine koy ve ▶ ile çalıştır.' };
      const aydin = k.filter(x => x.isik > 2000), karanlik = k.filter(x => x.isik < 1500);
      const metin = x => duz(x.lcd);
      if (k.every(x => x.servo == null)) return { ok: false, mesaj: `Servo hiç hareket etmedi. ${SERVO} servo yaz bloğunu kullan.` };
      if (!aydin.every(x => x.servo >= 150)) return { ok: false, mesaj: 'Işık yüksekken perde açılmadı: servoyu 180 yap.' };
      if (!karanlik.every(x => x.servo != null && x.servo <= 30)) return { ok: false, mesaj: 'Işık düşükken perde kapanmadı: servoyu 0 yap.' };
      if (!aydin.every(x => metin(x).includes('acik'))) return { ok: false, mesaj: 'Perde açıkken LCD\'ye "Perde: Acik" yazmalısın.' };
      if (!karanlik.every(x => metin(x).includes('kapali'))) return { ok: false, mesaj: 'Perde kapalıyken LCD\'ye "Perde: Kapali" yazmalısın.' };
      return { ok: true, mesaj: 'Proje tamam! Perden ışığa göre kendi kendine açılıp kapanıyor.' };
    },
  },
];
