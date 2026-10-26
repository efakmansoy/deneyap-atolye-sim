// Modül 8: Robot araba (4 ders)
// 8.1 araba-motorlar  -> iki DC motoru ileri / geri / dur          (arena: düz zemin)
// 8.2 araba-donus     -> sağa / sola dönüş, kare çizme              (arena: düz zemin)
// 8.3 engelden-kacan  -> ultrasonik mesafe, engel yakınsa geri+dön  (arena: tek duvar engeli)
// 8.4 cizgi-izleyen   -> iki çizgi sensörü ile siyah çizgiyi izle   (arena: çizgi parkuru)
//
// Altyapı sözleşmesi: tools/ARABA-SOZLESME.md. Pinler (varsayılan): sol motor D0 ileri / D1 geri, sağ motor D2 ileri / D3 geri,
// mesafe sensörü D4, çizgi sensörleri D5 (sol) ve D6 (sağ).
import { arabaBagla } from '../araba-dunya.js';
import { olaylar, tamam, hata, duz } from './m6-projeler.js';

export { olaylar, tamam, hata, duz };

const PARCALAR = [{ tur: 'araba' }];
export const SAHNE_DUZ = { arena: 'duz', parcalar: PARCALAR };
export const ARENA_ENGEL = { genislik: 160, yukseklik: 100, engeller: [{ x: 0, y: 0, w: 10, h: 50 }], baslangic: { x: -65, y: 0, yonDerece: 0 } };
export const SAHNE_ENGEL = { arena: ARENA_ENGEL, parcalar: PARCALAR };
export const SAHNE_CIZGI = { arena: 'cizgi', parcalar: PARCALAR };

// ── Kontrol yardımcıları ──
/** Sanal saat bitince arabanın son durumunu (dünya fiziğiyle) hesaplar. */
export const durum = (sim, sahne) => {
  const dunya = arabaBagla(sim, sahne);
  dunya.guncelle(sim, sim.t);
  const a = sim.cihaz.araba;
  return { a, dunya, iz: a.iz, x0: dunya.b0.x, y0: dunya.b0.y, yaw0: dunya.b0.yonDerece ?? 0 };
};
/** İki açı (derece) arasındaki en küçük fark. */
export const aciFark = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
/** Pin YÜKSEK yapılan olaylar (sıralı). */
export const yukselen = (sim, pin) => olaylar(sim, pin).filter(o => o.deger > 0).sort((p, q) => p.t - q.t);
/** Pin DÜŞÜK yapılan olaylar (sıralı). */
export const dusen = (sim, pin) => olaylar(sim, pin).filter(o => !(o.deger > 0)).sort((p, q) => p.t - q.t);
/** Olay anındaki araba konumu. */
export const konumT = (iz, t) => iz.find(p => p.t === t) ?? [...iz].reverse().find(p => p.t <= t) ?? iz[0];
/** Çizgiden en büyük uzaklık (cm) ve bitiş noktası dahil. */
export const enBuyukSapma = d => Math.max(0, ...d.iz.map(p => d.dunya.cizgiMesafe(p)), d.dunya.cizgiMesafe(d.a));
/** t anındaki yön (derece). Sonunda dünya sim.t'ye geri sarılır. */
export const yonT = (sim, sahne, t) => {
  const d = arabaBagla(sim, sahne);
  d.guncelle(sim, t);
  const y = sim.cihaz.araba.yonDerece;
  d.guncelle(sim, sim.t);
  return y;
};
const ilkHareket = sim => [...yukselen(sim, 'D0'), ...yukselen(sim, 'D1'), ...yukselen(sim, 'D2'), ...yukselen(sim, 'D3')].sort((p, q) => p.t - q.t)[0];

// ──────────────────────────────────────────────────────────
// 8.1 Motorları sür
// ──────────────────────────────────────────────────────────
const yol81 = (sim, minIleri = 35, minGeri = 15) => {
  const d = durum(sim, SAHNE_DUZ), { a } = d;
  if (a.yol < 5) return { hata: 'Araba hiç kıpırdamadı. Sol motor için D0, sağ motor için D2 pinini YÜKSEK yapmalısın.' };
  const maxX = Math.max(...d.iz.map(p => p.x), a.x);
  if (maxX < d.x0 + minIleri) return { hata: `Araba yeterince ileri gitmedi (en fazla ${Math.round(maxX - d.x0)} cm). İki motor da ileri dönmeli.` };
  return { d, a, maxX, minGeri };
};

const gorev81 = [
  {
    tip: 'kod', baslik: 'Uzun yol: 3 saniye ileri, 3 saniye geri',
    metin: `Araba şu an 2 saniye ileri gidiyor. <b>3 saniye ileri</b> git, <b>500 ms dur</b>, sonra <b>3 saniye geri</b> gelip başladığın yere dön ve motorları durdur.`,
    ipucu: 'ileri(); delay(3000); dur(); delay(500); geri(); delay(3000); dur(); sırasını kur.',
    sure: 8000,
    kontrol(sim) {
      const r = yol81(sim, 60); if (r.hata) return hata(r.hata);
      const { a, d, maxX } = r;
      if (a.x > maxX - 60) return hata('Araba 3 saniye geri gelmedi; başladığı yere dönmeli.');
      if (Math.abs(a.x - d.x0) > 8) return hata('Araba başladığı noktaya dönmedi: ileri ve geri süreleri eşit olmalı.');
      if (a.solGuc || a.sagGuc) return hata('Program bitince motorları durdurmayı unutma.');
      return tamam('Araba 75 cm ileri gitti ve aynı yoldan geri döndü!');
    },
  },
  {
    tip: 'soru', soru: 'Robot arabada motorlar neden doğrudan Deneyap Kart pinine bağlanmaz, motor sürücü (L298N) kullanılır?',
    secenekler: ['Pinler motoru sürecek büyük akımı veremez; sürücü bu akımı pilden alıp motora verir', 'Motor sürücü arabayı daha hızlı yapar', 'Pinler yalnızca LED yakabilir', 'Motorlar kodu doğrudan okuyamaz'],
    dogru: 0, aciklama: 'Bir pin birkaç mA verebilir, DC motor yüzlerce mA çeker. Sürücü, pinden gelen küçük sinyalle pilden gelen büyük akımı açıp kapatır.',
  },
  {
    tip: 'kod', baslik: 'Tek motor: kavisli yol',
    metin: `Yalnızca <b>sol motoru</b> 2 saniye ileri çalıştır (sağ motor hiç çalışmasın) ve sonra durdur. Araba kavis çizip bir yöne dönmeli.`,
    ipucu: 'Sadece D0 pinini HIGH yap, 2000 ms bekle, sonra D0 pinini LOW yap.',
    sure: 4000,
    kontrol(sim) {
      const d = durum(sim, SAHNE_DUZ), { a } = d;
      if (yukselen(sim, 'D2').length || yukselen(sim, 'D3').length) return hata('Sağ motor (D2, D3) hiç çalışmamalı.');
      if (!yukselen(sim, 'D0').length) return hata('Sol motoru ileri çalıştırmak için D0 pinini YÜKSEK yap.');
      if (a.yol < 10) return hata('Araba yeterince hareket etmedi.');
      if (aciFark(a.yonDerece, d.yaw0) < 40) return hata('Araba kavis çizip dönmedi. Yalnız sol motor çalışınca araba yön değiştirir.');
      if (a.solGuc || a.sagGuc) return hata('2 saniye sonra motoru durdurmayı unutma.');
      return tamam('Tek motorla araba kavis çizerek sağa döndü!');
    },
  },
  {
    tip: 'soru', soru: 'Aynı motorun hem ileri hem geri pini aynı anda YÜKSEK yapılırsa ne olur?',
    secenekler: ['Motor dönmez; iki yön birbirini götürür', 'Motor iki kat hızlı döner', 'Motor ileri döner', 'Motor geri döner'],
    dogru: 0, aciklama: 'Motor sürücü iki yön pinini karşılaştırır. İkisi aynıysa (ikisi de 0 ya da ikisi de 1) motorun uçlarında gerilim farkı oluşmaz ve motor durur.',
  },
  {
    tip: 'kod', baslik: 'Zikzak: 3 kez ileri-geri',
    metin: `Araba <b>1 saniye ileri</b>, sonra <b>1 saniye geri</b> gitsin; bunu <b>3 kez</b> tekrarla. Her adımdan sonra dur() ile motorları durdur.`,
    ipucu: 'for (int i = 0; i < 3; i++) { ileri(); delay(1000); dur(); geri(); delay(1000); dur(); } döngüsünü kur.',
    sure: 7000,
    kontrol(sim) {
      const d = durum(sim, SAHNE_DUZ), { a } = d;
      const ileriSay = yukselen(sim, 'D0').length, geriSay = yukselen(sim, 'D1').length;
      if (ileriSay < 3) return hata(`Araba ${ileriSay} kez ileri gitti; 3 kez ileri gitmeli.`);
      if (geriSay < 3) return hata(`Araba ${geriSay} kez geri gitti; 3 kez geri gitmeli.`);
      if (Math.abs(a.x - d.x0) > 8) return hata('Her ileri hareketin ardından aynı süre geri gelmeli; araba başladığı yere dönmeli.');
      if (a.carpti) return hata('Araba duvara çarptı.');
      return tamam('Üç kez ileri-geri yaptın, araba başladığı yerde!');
    },
  },
  {
    tip: 'soru', soru: 'Sol motor ileri, sağ motor dururken araba hangi yöne kavis çizer?',
    secenekler: ['Sağa (sol tekerlek ileri iter, sağ tekerlek yerinde kalır)', 'Sola', 'Düz ileri gider', 'Olduğu yerde geri gider'],
    dogru: 0, aciklama: 'Sol tekerlek sağ tekerlekten hızlı döndüğü için araba sağ tekerleğin etrafında sağa doğru döner.',
  },
];

// ──────────────────────────────────────────────────────────
// 8.2 Dönüşler ve kare
// ──────────────────────────────────────────────────────────
/** Kapalı şekil kontrolü: bitiş başlangıca yakın mı, yön ayni mı. */
const kapali = (d, tol = 8, yonTol = 18) => {
  const { a } = d;
  if (Math.hypot(a.x - d.x0, a.y - d.y0) > tol) return `Araba başladığı noktaya dönmedi (${Math.round(Math.hypot(a.x - d.x0, a.y - d.y0))} cm uzakta).`;
  if (aciFark(a.yonDerece, d.yaw0) > yonTol) return `Araba başladığı yöne bakmıyor (${Math.round(aciFark(a.yonDerece, d.yaw0))} derece sapma).`;
  return null;
};
const sinirlar = d => {
  const xs = [...d.iz.map(p => p.x), d.a.x], ys = [...d.iz.map(p => p.y), d.a.y];
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

const gorev82 = [
  {
    tip: 'kod', baslik: 'Sola doğru kare',
    metin: `Araba şu an kareyi <b>sağa</b> dönerek çiziyor. Kareyi <b>sola</b> dönerek çiz: araba yukarı (+y) tarafa doğru gitsin ve yine başladığı yere dönsün.`,
    ipucu: 'Dönüş fonksiyonunu saga() yerine sola() yap. Süreleri değiştirme.',
    sure: 8000,
    kontrol(sim) {
      const d = durum(sim, SAHNE_DUZ), s = sinirlar(d);
      if (d.a.yol < 60) return hata('Araba yeterince yol almadı. Kareyi 4 kenar boyunca çizmelisin.');
      if (s.maxY < d.y0 + 18) return hata('Araba sola (yukarı) dönmedi. Sola dönmek için sol motor geri, sağ motor ileri çalışmalı.');
      const k = kapali(d); if (k) return hata(k);
      return tamam('Araba sola doğru kare çizip başladığı yere döndü!');
    },
  },
  {
    tip: 'soru', soru: 'Araba olduğu yerde sağa dönmek için motorlar nasıl çalışmalı?',
    secenekler: ['Sol motor ileri, sağ motor geri', 'Sol motor geri, sağ motor ileri', 'İki motor da ileri', 'İki motor da dursun'],
    dogru: 0, aciklama: 'Sol tekerlek ileri, sağ tekerlek geri dönerse araba saat yönünde (sağa) kendi etrafında döner. Tersi sola döndürür.',
  },
  {
    tip: 'kod', baslik: 'Büyük kare (35 cm kenar)',
    metin: `Kare şu an 25 cm kenarlı. Kenar uzunluğunu <b>35 cm</b> yap (tekerlekler 25 cm/s ile döner: 35 cm için <b>1400 ms</b> ileri git). Dönüşler 90 derece kalsın.`,
    ipucu: 'İleri giderken kullanılan delay(1000) değerini 1400 yap; dönüş süresine dokunma.',
    sure: 9500,
    kontrol(sim) {
      const d = durum(sim, SAHNE_DUZ), s = sinirlar(d);
      if (d.a.yol < 120) return hata(`Araba toplam ${Math.round(d.a.yol)} cm gitti; 35 cm kenarlı karede yaklaşık 140 cm gitmeli.`);
      if (Math.max(s.maxX - s.minX, s.maxY - s.minY) < 30) return hata('Kare yeterince büyük değil: kenar 35 cm olmalı.');
      const k = kapali(d, 10); if (k) return hata(k);
      return tamam('35 cm kenarlı büyük kareyi tamamladın!');
    },
  },
  {
    tip: 'soru', soru: 'Dönüş süresini (delay) 2 katına çıkarırsak araba kaç derece döner?',
    secenekler: ['180 derece', '45 derece', '90 derece, ama daha yavaş', '360 derece'],
    dogru: 0, aciklama: 'Dönme hızı sabit olduğu için dönme açısı süreyle orantılıdır: 380 ms yaklaşık 90 derece, 760 ms yaklaşık 180 derecedir.',
  },
  {
    tip: 'kod', baslik: 'U dönüşü',
    metin: `Araba <b>1 saniye ileri</b> gitsin, <b>olduğu yerde 180 derece</b> dönsün (760 ms), sonra <b>1 saniye daha</b> ileri gitsin ve dursun. Araba başladığı noktaya, ters yöne bakarak varmalı.`,
    ipucu: 'ileri(); delay(1000); saga(); delay(760); ileri(); delay(1000); dur(); sırasını yaz.',
    sure: 4500,
    kontrol(sim) {
      const d = durum(sim, SAHNE_DUZ), { a } = d;
      if (a.yol < 40) return hata('Araba iki kez ileri gitmedi.');
      if (aciFark(a.yonDerece, d.yaw0 + 180) > 20) return hata(`Araba ters yöne bakmıyor (${Math.round(a.yonDerece)} derece). 180 derece dönmek için yaklaşık 760 ms gerekir.`);
      if (Math.abs(a.x - d.x0) > 8 || Math.abs(a.y - d.y0) > 10) return hata('Araba başladığı noktaya geri dönmedi. İki ileri süresi eşit olmalı.');
      if (a.solGuc || a.sagGuc) return hata('Sonunda motorları durdur.');
      return tamam('U dönüşü başarılı: araba geri döndü!');
    },
  },
  {
    tip: 'soru', soru: 'Kare çizerken her dönüşten sonra neden kısa bir dur() ve bekleme koyuyoruz?',
    secenekler: ['Araba ilerlerken ataletle kaymasın, dönüş temiz başlasın diye', 'Pil boşalmasın diye', 'Sensörlerin açılması için', 'Kod daha hızlı derlensin diye'],
    dogru: 0, aciklama: 'Hareket halindeki araba aniden yön değiştirirse savrulur. Kısa bir duruş, dönüşlerin tutarlı ve tekrarlanabilir olmasını sağlar.',
  },
];

// ──────────────────────────────────────────────────────────
// 8.3 Engelden kaçan araba
// ──────────────────────────────────────────────────────────
/** İlk "geri" manevrasının başladığı an ve araba konumu. */
const ilkGeri = (sim, d) => {
  const g = yukselen(sim, 'D1')[0];
  return g ? { t: g.t, p: konumT(d.iz, g.t) } : null;
};

const gorev83 = [
  {
    tip: 'kod', baslik: 'Daha erken fren: 40 cm',
    metin: `Araba engele 30 cm kala geri dönüyor. Daha güvenli olması için <b>40 cm</b>'den yakın olduğunda tepki versin.`,
    ipucu: 'mesafeOlc(D4) < 30 koşulundaki 30 sayısını 40 yap.',
    sure: 5000, sahne: SAHNE_ENGEL,
    kontrol(sim) {
      const d = durum(sim, SAHNE_ENGEL), g = ilkGeri(sim, d);
      if (!g) return hata('Araba engele yaklaşınca hiç geri gitmedi. D1 ve D3 pinlerini YÜKSEK yapan geri() çağrısı var mı?');
      if (g.p.x > -50) return hata(`Araba engele çok yaklaşınca geri gitti (x = ${Math.round(g.p.x)}). 40 cm'de tepki vermeli.`);
      if (yukselen(sim, 'D1').length < 2) return hata('Araba kaçınma manevrasını tekrarlamadı.');
      return tamam('Araba engele 40 cm kala geri dönüyor!');
    },
  },
  {
    tip: 'soru', soru: 'Ultrasonik sensör engelin mesafesini nasıl ölçer?',
    secenekler: ['Ses dalgası gönderir, yankı dönene kadar geçen süreyi ölçer', 'Kameradan görüntü alır', 'Engelin rengine bakar', 'Engelin sıcaklığını ölçer'],
    dogru: 0, aciklama: 'Sensör yüksek frekanslı bir ses darbesi yollar. Ses engele çarpıp döner; gidiş-dönüş süresinden mesafe cm olarak hesaplanır.',
  },
  {
    tip: 'kod', baslik: 'Geri giderken buzzer uyarısı',
    metin: `Araba engelden kaçarken <b>D8</b> pinindeki buzzer <b>1000 Hz</b> uyarı sesi çalsın. Yol açıkken buzzer sussun (noTone).`,
    ipucu: 'Engel koşulunun içine tone(D8, 1000); else kısmına noTone(D8); ekle.',
    sure: 5000, sahne: SAHNE_ENGEL,
    kontrol(sim) {
      const d = durum(sim, SAHNE_ENGEL);
      const ses = olaylar(sim, 'D8', 'ses');
      if (!ses.some(s => s.deger > 0)) return hata('Buzzer hiç çalmadı. Engel yakınken tone(D8, 1000) kullan.');
      if (!ses.some(s => s.deger === 0)) return hata('Buzzer hiç susmadı. Yol açılınca noTone(D8) çağır.');
      if (!ses.some(s => Math.abs(s.deger - 1000) < 20)) return hata('Buzzer 1000 Hz çalmadı.');
      if (!yukselen(sim, 'D1').length) return hata('Araba engelden kaçmadı (geri gitmedi).');
      if (d.a.carpti) return hata('Araba engele çarptı.');
      return tamam('Engel yakınken buzzer uyarı veriyor!');
    },
  },
  {
    tip: 'soru', soru: 'Engelden kaçmadan önce araba neden önce geri gider, sonra döner?',
    secenekler: ['Dönerken engele sürtmemek için önce biraz uzaklaşmak gerekir', 'Geri gitmek daha hızlı olduğu için', 'Sensör yalnızca geriyi ölçtüğü için', 'Pil tasarrufu için'],
    dogru: 0, aciklama: 'Araba engele yakınken yerinde dönerse gövdesi engele çarpabilir. Geri çekilmek dönmek için boşluk açar.',
  },
  {
    tip: 'kod', baslik: 'Kaçarken LED yansın',
    metin: `Araba engelden kaçarken <b>D7</b> pinindeki LED yansın, yol açıkken sönsün.`,
    ipucu: 'Engel koşulunda digitalWrite(D7, HIGH); else kısmında digitalWrite(D7, LOW); yaz. D7 için pinMode(D7, OUTPUT); unutma.',
    sure: 5000, sahne: SAHNE_ENGEL,
    kontrol(sim) {
      const d = durum(sim, SAHNE_ENGEL);
      const led = olaylar(sim, 'D7');
      if (!led.some(o => o.deger > 0)) return hata('D7 LED\'i hiç yanmadı.');
      if (!led.some(o => o.deger === 0 && led.some(p => p.deger > 0 && p.t < o.t))) return hata('LED yandıktan sonra sönmedi. Yol açılınca digitalWrite(D7, LOW) yaz.');
      if (!yukselen(sim, 'D1').length) return hata('Araba engelden kaçmadı (geri gitmedi).');
      if (d.a.carpti) return hata('Araba engele çarptı.');
      return tamam('LED engel yakınken yanıp yol açılınca sönüyor!');
    },
  },
  {
    tip: 'soru', soru: 'Tek bir ultrasonik sensör araba için hangi sınırlamayı getirir?',
    secenekler: ['Yalnızca baktığı doğrultudaki engeli görür, yan taraftakini göremez', 'Yalnızca siyah engelleri görür', 'Gece çalışmaz', 'Yalnızca 5 cm altını ölçer'],
    dogru: 0, aciklama: 'Sensör dar bir ışın gibi çalışır; arabanın yanındaki engel görülmez. Bu yüzden araba dönerken kenar köşelere çarpabilir.',
  },
];

// ──────────────────────────────────────────────────────────
// 8.4 Çizgi izleyen araba
// ──────────────────────────────────────────────────────────
const gorev84 = [
  {
    tip: 'kod', baslik: 'Düzeltirken buzzer',
    metin: `Araba çizgiyi düzeltmek için döndüğünde <b>D8</b> buzzer <b>800 Hz</b> çalsın, düz giderken sussun. Araba yine çizgiyi izlemeye devam etmeli.`,
    ipucu: 'sola() ve saga() çağrılarının yanına tone(D8, 800); ekle; ileri() olan else kolunda noTone(D8); yaz.',
    sure: 8000, sahne: SAHNE_CIZGI,
    kontrol(sim) {
      const d = durum(sim, SAHNE_CIZGI), ses = olaylar(sim, 'D8', 'ses');
      if (!ses.some(s => s.deger > 0)) return hata('Buzzer hiç çalmadı.');
      if (!ses.some(s => s.deger === 0)) return hata('Buzzer hiç susmadı: düz giderken noTone(D8) çağır.');
      if (d.a.yol < 100) return hata('Araba çizgiyi izleyip ilerlemedi.');
      if (d.a.carpti || enBuyukSapma(d) > 6) return hata('Araba çizgiden çıktı. Önce çizgi izleme kodu çalışmalı.');
      return tamam('Buzzer düzeltme anlarında çalıyor, araba çizgide!');
    },
  },
  {
    tip: 'soru', soru: 'Çizgi izleyen sensör (siyah çizgi üstünde) dijital olarak ne okur?',
    secenekler: ['Çizgi üstünde 1 (HIGH), beyaz zeminde 0 (LOW)', 'Her zaman 0', 'Çizgi üstünde 0, beyaz zeminde 1', 'Sıcaklık değeri'],
    dogru: 0, aciklama: 'Bu derste sensörler siyah çizgi üstündeyken 1, beyaz zeminde 0 verir. Siyah yüzey ışığı az yansıttığı için sensör çizgiyi böyle ayırt eder.',
  },
  {
    tip: 'kod', baslik: 'Seri monitörden sensörleri izle',
    metin: `Her döngüde sol ve sağ sensör değerini seri monitöre yazdır (Serial.begin(9600) ile başlat; Serial.println ile sol, sonra sağ değeri yaz). Araba yine çizgiyi izlesin.`,
    ipucu: 'setup içine Serial.begin(9600); ekle. loop içinde sensörleri okuduktan sonra Serial.println(sol); Serial.println(sag); yaz.',
    sure: 8000, sahne: SAHNE_CIZGI,
    kontrol(sim) {
      const d = durum(sim, SAHNE_CIZGI), seri = sim.seriCikti.map(s => String(s).trim());
      if (seri.length < 40) return hata(`Seri monitöre yalnızca ${seri.length} satır yazıldı. Her döngüde iki değer yazmalısın.`);
      if (!seri.includes('1') || !seri.includes('0')) return hata('Seri monitörde hem 0 hem 1 görünmeli (sensör değerleri).');
      if (d.a.yol < 100) return hata('Araba çizgiyi izleyip ilerlemedi.');
      if (d.a.carpti || enBuyukSapma(d) > 6) return hata('Araba çizgiden çıktı.');
      return tamam('Sensör değerleri seri monitörde akıyor, araba çizgide!');
    },
  },
  {
    tip: 'soru', soru: 'Sol sensör çizgiyi görürse araba hangi yöne düzeltme yapmalı?',
    secenekler: ['Sola; çizgi arabanın solundadır', 'Sağa; çizgiden kaçmalı', 'Geri gitmeli', 'Durmalı ve beklemeli'],
    dogru: 0, aciklama: 'Sol sensör siyahı görüyorsa çizgi arabanın solunda demektir. Araba sola dönerek çizgiyi iki sensörün ortasına geri alır.',
  },
  {
    tip: 'kod', baslik: 'Düzeltirken LED yansın',
    metin: `Araba sola ya da sağa düzeltme yaptığında <b>D7</b> LED yansın; düz giderken sönsün. Araba çizgiyi izlemeye devam etmeli.`,
    ipucu: 'pinMode(D7, OUTPUT); ekle. sola/saga kollarında digitalWrite(D7, HIGH); ileri() kolunda digitalWrite(D7, LOW); yaz.',
    sure: 8000, sahne: SAHNE_CIZGI,
    kontrol(sim) {
      const d = durum(sim, SAHNE_CIZGI), led = olaylar(sim, 'D7');
      if (!led.some(o => o.deger > 0)) return hata('D7 LED\'i hiç yanmadı.');
      if (!led.some(o => o.deger === 0 && led.some(p => p.deger > 0 && p.t < o.t))) return hata('LED yandıktan sonra hiç sönmedi (düz giderken digitalWrite(D7, LOW)).');
      if (d.a.yol < 100) return hata('Araba çizgiyi izleyip ilerlemedi.');
      if (d.a.carpti || enBuyukSapma(d) > 6) return hata('Araba çizgiden çıktı.');
      return tamam('LED düzeltme anlarında yanıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Çizgi izleyen arabada kontrol döngüsünün (delay) çok uzun olması ne soruna yol açar?',
    secenekler: ['Araba iki ölçüm arasında çizgiyi kaçırabilir', 'Araba daha hızlı gider', 'Sensör bozulur', 'Hiçbir şey olmaz'],
    dogru: 0, aciklama: 'Araba her ölçümden sonra delay süresi boyunca görmeden ilerler. Süre uzunsa çizgi sensörlerin altından çıkıp gider.',
  },
];

// ──────────────────────────────────────────────────────────
// Dersler
// ──────────────────────────────────────────────────────────
export default [
  {
    id: 'araba-motorlar',
    modul: 8,
    ad: '8.1 · Robot araba: motorlar',
    sure: 5000,
    gorevler: gorev81,
    html: `<h2>Robot araba: motorlar</h2>
      <p>İki DC motorlu robot arabanı sürmeyi öğreniyoruz: ileri, geri ve dur!</p>
      <ol>
        <li>Her motorun <b>iki yön pini</b> vardır: sol motor <b>D0 (ileri)</b> ve <b>D1 (geri)</b>, sağ motor <b>D2 (ileri)</b> ve <b>D3 (geri)</b>.</li>
        <li>Araba <b>2 saniye ileri</b> gitsin.</li>
        <li>Sonra <b>dur</b> ve yarım saniye bekle.</li>
        <li>Ardından <b>1 saniye geri</b> gel ve motorları durdur.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Arabayı tanı',
        html: `<p>Arabanın iki tekerleği iki ayrı DC motorla döner. Her motor bir <b>motor sürücü</b> üzerinden iki pinle yönetilir: ileri pini ve geri pini.</p><p>Sol motor: <span class="pin-etiket">D0</span> ileri, <span class="pin-etiket">D1</span> geri. Sağ motor: <span class="pin-etiket">D2</span> ileri, <span class="pin-etiket">D3</span> geri.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'İleri: iki motoru çalıştır',
        html: `<p><span class="chip pin">Pinler</span> kategorisinden <span class="chip pin">pinini yap</span> bloğunu al: <b>D0 → YÜKSEK</b>. Sonra <b>D2 → YÜKSEK</b> yap. İki geri pini (D1, D3) DÜŞÜK kalsın.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' } }, { blok: 'dy_yaz', alan: { PIN: 'D2', DEG: '1' } }],
        ipucu: 'İki blok: D0 YÜKSEK (1) ve D2 YÜKSEK (1).',
      },
      {
        baslik: '2 saniye yürüsün',
        html: `<p>Motorlar çalışırken araba ilerler. <span class="chip akis">Akış</span> kategorisinden <span class="chip akis">ms bekle</span> bloğunu ekle ve <b>2000</b> yaz.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle' },
        ipucu: '1 saniye = 1000 ms; 2 saniye için 2000 yaz.',
      },
      {
        baslik: 'Dur',
        html: `<p>Durmak için <b>D0</b> ve <b>D2</b> pinlerini <b>DÜŞÜK</b> yap (dört pin de DÜŞÜK olsun). Sonra yarım saniye bekle.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '0' } }, { blok: 'dy_yaz', alan: { PIN: 'D2', DEG: '0' } }],
        ipucu: 'D0 DÜŞÜK (0) ve D2 DÜŞÜK (0) bloklarını ekle.',
      },
      {
        baslik: 'Geri gel',
        html: `<p>Geri gitmek için bu kez <b>geri pinleri</b> çalıştır: <b>D1 → YÜKSEK</b> ve <b>D3 → YÜKSEK</b>. 1 saniye bekle, sonra tüm pinleri DÜŞÜK yap.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D1', DEG: '1' } }, { blok: 'dy_yaz', alan: { PIN: 'D3', DEG: '1' } }],
        ipucu: 'Geri pinleri D1 ve D3 tür.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Araba ileri gidip duracak, sonra geri gelecek.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Çalıştırdıktan sonra kontrol sonucu görünür.',
      },
    ],
    sahne: SAHNE_DUZ,
    kontrol(sim) {
      const r = yol81(sim); if (r.hata) return hata(r.hata);
      const { a, maxX } = r;
      if (a.x > maxX - 15) return hata('Araba ileri gittikten sonra geri gelmedi. Geri gitmek için D1 ve D3 pinlerini YÜKSEK yap.');
      if (a.solGuc || a.sagGuc) return hata('Program bitince motorları durdurmayı unutma (tüm pinleri DÜŞÜK yap).');
      if (a.carpti) return hata('Araba duvara çarptı.');
      return tamam('Harika! Araba ileri gitti, durdu ve geri geldi.');
    },
  },

  {
    id: 'araba-donus',
    modul: 8,
    ad: '8.2 · Robot araba: dönüşler',
    sure: 8000,
    gorevler: gorev82,
    html: `<h2>Robot araba: dönüşler</h2>
      <p>İki motoru zıt yönde çalıştırarak arabayı olduğu yerde döndürüyoruz ve bir <b>kare</b> çizdiriyoruz.</p>
      <ol>
        <li><b>Sağa dönüş:</b> sol motor ileri, sağ motor geri.</li>
        <li><b>Sola dönüş:</b> sol motor geri, sağ motor ileri.</li>
        <li>Tam güçte araba yaklaşık <b>380 ms</b>'de 90 derece döner.</li>
        <li>Kare: 4 kez { <b>1 saniye ileri</b> (25 cm), <b>sağa 90 derece dön</b> } yap.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Dönmek için zıt yön',
        html: `<p>Araba düz giderken iki tekerlek de aynı yöne döner. <b>Olduğu yerde sağa dönmek</b> için sol tekerlek ileri, sağ tekerlek geri döner. Sola dönmek için tersi.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'İleri 1 saniye',
        html: `<p>Önce 25 cm gideceğiz: <span class="chip pin">D0</span> ve <span class="chip pin">D2</span> pinlerini YÜKSEK yap, <span class="chip akis">1000 ms bekle</span>.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' } }, { blok: 'dy_bekle' }],
        ipucu: 'D0 YÜKSEK, D2 YÜKSEK, 1000 ms bekle.',
      },
      {
        baslik: 'Sağa 90 derece',
        html: `<p>Sağa dönmek için <b>D0 → YÜKSEK</b>, <b>D1 → DÜŞÜK</b>, <b>D2 → DÜŞÜK</b>, <b>D3 → YÜKSEK</b> yap ve <b>380 ms</b> bekle.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: { blok: 'dy_yaz', alan: { PIN: 'D3', DEG: '1' } },
        ipucu: 'Sol motor ileri (D0), sağ motor geri (D3).',
      },
      {
        baslik: 'Dört kere tekrarla',
        html: `<p>Kare 4 kenardan oluşur. <span class="chip akis">Akış</span> kategorisinden <span class="chip akis">tekrarla</span> bloğunu al, <b>4</b> yaz ve ileri + dönüş bloklarını içine koy.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_repeat_ext' },
        bitti: { blok: 'dy_yaz', icinde: 'controls_repeat_ext', adet: 4 },
        ipucu: 'Tekrarla bloğunun içine pin yazan blokları sürükle.',
      },
      {
        baslik: 'Durup nefes al',
        html: `<p>Her dönüşten sonra tüm pinleri <b>DÜŞÜK</b> yap ve <b>200 ms</b> bekle. Araba savrulmadan bir sonraki kenara başlasın.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_bekle' },
        bitti: { blok: 'dy_bekle', adet: 3, icinde: 'controls_repeat_ext' },
        ipucu: 'Tekrar bloğunun içinde 3 bekleme olmalı: ileri, dönüş, dur.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Araba kare çizip başladığı yere dönmeli.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Dönüş 380 ms, ileri 1000 ms olmalı.',
      },
    ],
    sahne: SAHNE_DUZ,
    kontrol(sim) {
      const d = durum(sim, SAHNE_DUZ), s = sinirlar(d);
      if (d.a.yol < 60) return hata('Araba yeterince yol almadı. Kareyi dört kenar boyunca çizmelisin.');
      if (s.minY > d.y0 - 18) return hata('Araba sağa dönmedi. Sağa dönmek için sol motor ileri, sağ motor geri çalışmalı.');
      if (d.a.yol < 85) return hata(`Araba ${Math.round(d.a.yol)} cm gitti; her kenar 1 saniye (25 cm) olmalı.`);
      const k = kapali(d); if (k) return hata(k);
      if (d.a.carpti) return hata('Araba duvara çarptı.');
      return tamam('Harika! Araba kareyi çizip başladığı noktaya döndü.');
    },
  },

  {
    id: 'engelden-kacan',
    modul: 8,
    ad: '8.3 · Robot araba: engelden kaçan',
    sure: 15000,
    gorevler: gorev83,
    html: `<h2>Engelden kaçan araba</h2>
      <p>Arabanın burnundaki ultrasonik sensörle önündeki engele olan uzaklığı ölçüyoruz. Engel yakınsa araba geri çekilip dönerek kaçıyor!</p>
      <ol>
        <li>Mesafe sensörü <b>D4</b> pinindedir. Motor pinleri: D0, D1 (sol), D2, D3 (sağ).</li>
        <li>Engel <b>30 cm</b>'den yakınsa: <b>400 ms geri</b> git, sonra <b>380 ms sağa</b> dön (yaklaşık 90 derece).</li>
        <li>Yol açıksa: <b>ileri</b> git.</li>
        <li>Kontrolü her <b>50 ms</b>'de bir tekrarla.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Sensör araba burnunda',
        html: `<p>Ultrasonik sensör (<span class="pin-etiket">D4</span>) arabanın önüne bakar ve önündeki engele kaç cm kaldığını ölçer. Arenadaki dikdörtgen engele çarpmadan dolaşacağız.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli kontrol et',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al; kontrolleri onun içinde yapacağız.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Engel yakın mı?',
        html: `<p>Döngünün içine <span class="chip akis">eğer</span> bloğu koy (değilse koluyla). Koşuluna <span class="chip mantik">D4 mesafe sensörü &lt; 30</span> tak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_mesafe_oku', alan: { PIN: 'D4' } }],
        ipucu: 'Mesafe bloğu Ses ve hareket kategorisindedir; karşılaştırma bloğu Mantık kategorisindedir.',
      },
      {
        baslik: 'Geri git ve dön',
        html: `<p>Eğer koluna: <b>D1 ve D3 → YÜKSEK</b> (geri), D0 ve D2 DÜŞÜK, <b>400 ms bekle</b>; sonra <b>D0 ve D3 → YÜKSEK</b> (sağa dön), D1 ve D2 DÜŞÜK, <b>380 ms bekle</b>.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D1', DEG: '1' }, icinde: 'controls_if' }, { blok: 'dy_bekle', icinde: 'controls_if', adet: 2 }],
        ipucu: 'Geri: D1 + D3. Sağa dönüş: D0 + D3.',
      },
      {
        baslik: 'Yol açıksa ileri',
        html: `<p>Değilse koluna <b>D0 ve D2 → YÜKSEK</b> (ileri), D1 ve D3 DÜŞÜK. Döngünün sonuna <b>50 ms bekle</b> ekle.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D0', DEG: '1' }, icinde: 'dy_surekli' }, { blok: 'dy_bekle', icinde: 'dy_surekli', adet: 3 }],
        ipucu: 'ileri için D0 ve D2 YÜKSEK olmalı.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Araba engele yaklaşınca geri çekilip dönecek ve çarpmadan dolaşacak.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Araba 15 saniye boyunca engele çarpmadan dolaşmalı.',
      },
    ],
    sahne: SAHNE_ENGEL,
    kontrol(sim) {
      const d = durum(sim, SAHNE_ENGEL), { a } = d, geriSay = yukselen(sim, 'D1').length;
      if (a.yol < 30) return hata('Araba neredeyse hiç ilerlemedi. Yol açıkken ileri gitmelisin (D0 ve D2 YÜKSEK).');
      if (a.carpti) return hata('Araba duvara ya da engele çarptı. Engele daha uzaktan tepki ver, geri çekilmeyi ihmal etme.');
      if (geriSay < 3) return hata(`Araba engelden yalnızca ${geriSay} kez geri çekildi. Mesafe < 30 olunca geri gitmelidir.`);
      if (a.yol < 150) return hata('Araba kaçtıktan sonra yoluna devam etmedi.');
      return tamam('Harika! Araba engele çarpmadan dolaşıyor.');
    },
  },

  {
    id: 'cizgi-izleyen',
    modul: 8,
    ad: '8.4 · Robot araba: çizgi izleyen',
    sure: 17000,
    gorevler: gorev84,
    html: `<h2>Çizgi izleyen araba</h2>
      <p>Arabanın altındaki iki çizgi sensörü siyah çizgiyi arar. Çizgi hangi sensörün altına girerse araba o yöne dönerek çizgiyi geri bulur!</p>
      <ol>
        <li>Sol çizgi sensörü <b>D5</b>, sağ çizgi sensörü <b>D6</b> pinindedir. Siyah çizgi üstünde <b>1</b>, beyaz zeminde <b>0</b> okurlar.</li>
        <li>Sol sensör çizgiyi görürse: <b>sola</b> dön.</li>
        <li>Sağ sensör çizgiyi görürse: <b>sağa</b> dön.</li>
        <li>İkisi de görmüyorsa (çizgi ortada): <b>ileri</b> git.</li>
        <li>Kontrolü her <b>50 ms</b>'de bir tekrarla.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Çizgi sensörleri',
        html: `<p>Arabanın burnunun altında iki sensör vardır: <span class="pin-etiket">D5</span> solda, <span class="pin-etiket">D6</span> sağda. Çizgi (4 cm) ikisinin <b>ortasından</b> geçerken ikisi de beyazı görür.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sürekli kontrol',
        html: `<p><span class="chip akis">Akış</span> kategorisinden <span class="chip akis">sürekli tekrarla</span> bloğunu al.</p>`,
        vurgu: { kategori: 'Akış', blok: 'dy_surekli' },
        bitti: { blok: 'dy_surekli' },
        ipucu: 'Akış kategorisinin ilk bloğu.',
      },
      {
        baslik: 'Sol sensör çizgide mi?',
        html: `<p>Döngüye <span class="chip akis">eğer</span> bloğu koy ve <b>değilse eğer</b> + <b>değilse</b> kollarını ekle. İlk koşula <span class="chip pin">D5 pini yüksek mi?</span>, ikinci koşula <span class="chip pin">D6 pini yüksek mi?</span> tak.</p>`,
        vurgu: { kategori: 'Akış', blok: 'controls_if' },
        bitti: [{ blok: 'controls_if', icinde: 'dy_surekli' }, { blok: 'dy_oku', alan: { PIN: 'D5' } }, { blok: 'dy_oku', alan: { PIN: 'D6' } }],
        ipucu: 'Pinler kategorisindeki "pini yüksek mi?" bloğu sensörü okur.',
      },
      {
        baslik: 'Sola dön',
        html: `<p>İlk koluna <b>sola dönüş</b>: <b>D0 → DÜŞÜK</b>, <b>D1 → YÜKSEK</b>, <b>D2 → YÜKSEK</b>, <b>D3 → DÜŞÜK</b>.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: { blok: 'dy_yaz', alan: { PIN: 'D1', DEG: '1' }, icinde: 'controls_if' },
        ipucu: 'Sol motor geri (D1), sağ motor ileri (D2).',
      },
      {
        baslik: 'Sağa dön ve ileri git',
        html: `<p>İkinci koluna <b>sağa dönüş</b> (D0 YÜKSEK, D3 YÜKSEK), değilse koluna <b>ileri</b> (D0 ve D2 YÜKSEK) yaz. Döngü sonuna <b>50 ms bekle</b> koy.</p>`,
        vurgu: { kategori: 'Pinler', blok: 'dy_yaz' },
        bitti: [{ blok: 'dy_yaz', alan: { PIN: 'D3', DEG: '1' }, icinde: 'controls_if' }, { blok: 'dy_bekle', icinde: 'dy_surekli' }],
        ipucu: 'Sağa dönüş: sol motor ileri (D0), sağ motor geri (D3).',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Araba siyah çizgiyi izleyerek parkuru dolaşmalı.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Araba çizgiden çıkıyorsa dönüş yönlerini kontrol et.',
      },
    ],
    sahne: SAHNE_CIZGI,
    kontrol(sim) {
      const d = durum(sim, SAHNE_CIZGI), { a } = d;
      if (a.yol < 30) return hata('Araba neredeyse hiç ilerlemedi. Çizgi ortadayken ileri gitmelisin.');
      if (a.carpti) return hata('Araba duvara çarptı; çizgiden çıkmış olmalı. Sol sensör çizgiyi görürse sola, sağ sensör görürse sağa dönmelisin.');
      const sapma = enBuyukSapma(d);
      if (sapma > 6) return hata(`Araba çizgiden ${Math.round(sapma)} cm uzaklaştı. Dönüş yönlerini ve kontrol aralığını kontrol et.`);
      if (a.yol < 300) return hata(`Araba çizgiyi izleyerek yalnızca ${Math.round(a.yol)} cm gitti; en az 300 cm gitmeli.`);
      return tamam('Harika! Araba çizgiyi bırakmadan parkuru dolaştı.');
    },
  },
];

// kodu değiştir görevleri için dışa aktar
export { gorev81, gorev82, gorev83, gorev84, ilkGeri, ilkHareket, kapali, sinirlar, yol81 };
