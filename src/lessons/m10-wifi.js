// Modül 10: Wi-Fi ve web (hepsi sadece C++)
// 10.1 wifi-baglan     -> WiFi.begin, WL_CONNECTED, IP adresi
// 10.2 ilk-web-sayfasi -> WebServer ile HTML sayfa + LED bağlantıları, telefon paneli
// 10.3 kendi-agin      -> softAP: kendi Wi-Fi ağını kur
import { duz, olaylar, tamam, hata } from './m6-projeler.js';
import { durumAt, seriMetin } from './m9-esp32.js';

export { durumAt };
export const ipVar = (sim, ip) => seriMetin(sim).includes(ip);
export const sonCevap = (sim, yol) => [...(sim.ag?.gecmis ?? [])].reverse().find(x => x.yol === yol);
export const metinDuz = x => duz(x?.metin ?? '');

// ── Wi-Fi bağlantısı için Başlangıç Kodu (ssid/sifre hazır, gerisi öğrencide) ──
const BASLANGIC_101 = `#include <WiFi.h>

const char* ssid = "Atolye";
const char* sifre = "12345678";

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  // buraya yaz: WiFi.begin(ssid, sifre) ile baglan
}

void loop() {
}
`;

const BASLANGIC_102 = `#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "Atolye";
const char* sifre = "12345678";
WebServer server(80);

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  WiFi.begin(ssid, sifre);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  Serial.println(WiFi.localIP());
  // buraya yaz: server.on(...), server.begin()
}

void loop() {
  // buraya yaz: server.handleClient()
}
`;

const BASLANGIC_103 = `#include <WiFi.h>
#include <WebServer.h>

WebServer server(80);

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  // buraya yaz: WiFi.softAP(...) ile kendi agini kur
}

void loop() {
  // buraya yaz: server.handleClient()
}
`;

// ──────────────────────────────────────────────────────────
// 10.1 Wi-Fi'ye bağlan
// ──────────────────────────────────────────────────────────
const agKur = (aglar) => async sim => { sim.ag.aglar = aglar; };

const gorev101 = [
  {
    tip: 'kod', baslik: 'Başka bir ağa bağlan',
    metin: `Bu sefer okuldaki ağa bağlan: ağ adı <b>Okul</b>, şifre <b>deneyap24</b>. Bağlanınca seri monitöre IP adresini yazdır.`,
    ipucu: 'ssid ve sifre değişkenlerinin tırnak içindeki değerlerini değiştir.',
    sure: 6000,
    girdi: agKur({ Okul: 'deneyap24' }),
    kontrol(sim) {
      if (!sim.ag.bagli()) return hata(`Ağa bağlanılamadı (durum ${sim.ag.durum()}). Ağ adı "Okul", şifre "deneyap24" olmalı.`);
      if (!ipVar(sim, '192.168.1.42')) return hata('IP adresi seri monitöre yazılmadı.');
      return tamam('Okul ağına bağlandın!');
    },
  },
  {
    tip: 'soru', soru: '<code>WiFi.status() == WL_CONNECTED</code> ifadesi ne anlama gelir?',
    secenekler: ['Kart bir Wi-Fi ağına başarıyla bağlandı', 'Kart yeni bir ağ kurdu', 'Şifre yanlış girildi', 'Seri monitör açık'], dogru: 0,
    aciklama: 'WL_CONNECTED, kartın erişim noktasına bağlandığını ve IP adresi aldığını gösterir. Bağlanana kadar durum başka bir değerdedir.',
  },
  {
    tip: 'kod', baslik: 'Bağlanırken LED yanıp sönsün',
    metin: `Bağlanma sırasında <span class="pin-etiket">D0</span> LED'i <b>her 500 ms'de bir yanıp sönsün</b> (bekleme gösterge ışığı). Bağlantı kurulunca LED <b>sürekli yanık</b> kalsın.`,
    ipucu: 'while döngüsünün içinde bir bool değişkenini tersine çevirip LED\'e yaz. Döngüden çıkınca digitalWrite(D0, HIGH) yaz.',
    sure: 6000,
    girdi: agKur({ Atolye: '12345678' }),
    kontrol(sim) {
      const l = olaylar(sim, 'D0');
      if (!sim.ag.bagli()) return hata('Kart bağlanmadı: WiFi.begin(ssid, sifre) çağırdın mı?');
      const once = l.filter(o => o.t < 1400);
      if (once.length < 2) return hata('Bağlanırken LED yanıp sönmedi.');
      if (sim.pin.D0.deger !== 1) return hata('Bağlantı kurulunca LED yanık kalmalı.');
      return tamam('LED bağlanırken yanıp sönüyor, bağlanınca yanık kalıyor!');
    },
  },
  {
    tip: 'soru', soru: 'ESP32 neden bazı Wi-Fi ağlarını (ör. 5 GHz) bulamayabilir?',
    secenekler: ['Yalnızca 2,4 GHz ağlarını destekler', 'Şifreleri okuyamaz', 'Yalnızca açık ağlara bağlanır', 'Sadece kablolu çalışır'], dogru: 0,
    aciklama: 'Bu kartlardaki ESP32 yalnızca 2,4 GHz bandında çalışır. Telefonunu sıcak nokta yapıyorsan 2,4 GHz seçmelisin.',
  },
  {
    tip: 'kod', baslik: 'Sinyal gücünü yazdır',
    metin: `Bağlandıktan sonra seri monitöre <b>RSSI: </b> yazısıyla birlikte sinyal gücünü (<code>WiFi.RSSI()</code>) yazdır. Örnek: <i>RSSI: -55</i>.`,
    ipucu: 'Serial.print("RSSI: "); Serial.println(WiFi.RSSI());',
    sure: 6000,
    girdi: agKur({ Atolye: '12345678' }),
    kontrol(sim) {
      if (!sim.ag.bagli()) return hata('Kart ağa bağlanmadı.');
      if (!/RSSI:\s*-?\d+/.test(seriMetin(sim).replace(/\n/g, ''))) return hata('Seri monitörde "RSSI: " ve ardından sayı görünmedi.');
      return tamam('Sinyal gücü seri monitörde!');
    },
  },
  {
    tip: 'soru', soru: 'Bağlanma döngüsünde (<code>while (WiFi.status() != WL_CONNECTED)</code>) neden <code>delay(500)</code> kullanırız?',
    secenekler: ['Kartı sürekli meşgul etmemek ve bağlantıya zaman tanımak için', 'Şifreyi gizlemek için', 'LED\'i yakmak için', 'Seri monitörü kapatmak için'], dogru: 0,
    aciklama: 'Bağlanma saniyeler sürer. Kısa beklemeler kartı yormaz; ayrıca her turda bir nokta yazdırarak ilerlemeyi gösterebiliriz.',
  },
];

// ──────────────────────────────────────────────────────────
// 10.2 İlk web sayfası
// ──────────────────────────────────────────────────────────
const bekleHazir = async sim => { await sim.bekle(4000); };
const gorev102 = [
  {
    tip: 'kod', baslik: 'Başlığı değiştir',
    metin: `Sayfanın <b>&lt;h1&gt;</b> başlığında <b>Deneyap Atolyesi</b> yazsın (Merhaba kısmını silebilirsin).`,
    ipucu: 'anaSayfa() içindeki "<h1>Merhaba Deneyap!</h1>" satırını değiştir.',
    sure: 7000,
    girdi: async sim => { await bekleHazir(sim); await sim.ag.istek('/'); },
    kontrol(sim) {
      const y = sonCevap(sim, '/');
      if (!y || y.kod !== 200) return hata('Ana sayfa (/) cevap vermedi.');
      if (!metinDuz(y).includes('deneyap atolyesi')) return hata('Sayfada "Deneyap Atolyesi" başlığı yok.');
      return tamam('Yeni başlık sayfada görünüyor!');
    },
  },
  {
    tip: 'soru', soru: 'Tarayıcı bir sayfayı sorduğunda sunucu <b>404</b> kodu gönderirse bu ne demektir?',
    secenekler: ['İstenen sayfa bulunamadı', 'Her şey yolunda', 'Sunucu yeniden başlatıldı', 'Şifre yanlış'], dogru: 0,
    aciklama: '200 başarılı demektir, 404 ise o adreste bir sayfa olmadığını belirtir. server.onNotFound ile bu durum için özel cevap verebilirsin.',
  },
  {
    tip: 'kod', baslik: 'Yeni yol: /merhaba',
    metin: `Yeni bir adres ekle: <b>/merhaba</b> açılınca düz yazı (<code>text/plain</code>) olarak <b>Selam!</b> dönsün. Yol işleyici için ayrı bir <code>void</code> fonksiyon yaz.`,
    ipucu: 'void merhaba() { server.send(200, "text/plain", "Selam!"); } yaz ve setup içinde server.on("/merhaba", merhaba); ekle.',
    sure: 7000,
    girdi: async sim => { await bekleHazir(sim); await sim.ag.istek('/merhaba'); },
    kontrol(sim) {
      const y = sonCevap(sim, '/merhaba');
      if (!y || y.kod !== 200) return hata('/merhaba yolu 200 ile cevap vermedi; server.on("/merhaba", ...) ekledin mi?');
      if (!metinDuz(y).includes('selam')) return hata('Cevapta "Selam!" yazısı yok.');
      return tamam('/merhaba yolu çalışıyor!');
    },
  },
  {
    tip: 'soru', soru: 'Neden <code>server.handleClient();</code> satırı <code>loop()</code> içinde olmalıdır?',
    secenekler: ['Gelen istekleri sürekli kontrol edip cevaplamak için', 'Wi-Fi\'ye bağlanmak için', 'LED\'i yakmak için', 'Sayfayı güzelleştirmek için'], dogru: 0,
    aciklama: 'handleClient() her çağrıda bekleyen isteği işler. Loop sürekli döndüğü için telefon veya tarayıcıdan gelen isteklere hemen cevap verilir.',
  },
  {
    tip: 'kod', baslik: 'Sayfa bulunamadı (404)',
    metin: `Olmayan bir adres istenince (<code>/xyz</code> gibi) <b>404</b> koduyla <b>Sayfa yok!</b> yazısı dönsün. İpucu: <code>server.onNotFound(...)</code>.`,
    ipucu: 'void bulunamadi() { server.send(404, "text/plain", "Sayfa yok!"); } yaz, setup içinde server.onNotFound(bulunamadi); ekle.',
    sure: 7000,
    girdi: async sim => { await bekleHazir(sim); await sim.ag.istek('/xyz'); },
    kontrol(sim) {
      const y = sonCevap(sim, '/xyz');
      if (!y) return hata('/xyz isteği cevaplanmadı.');
      if (y.kod !== 404) return hata(`/xyz için 404 beklendi (gelen: ${y.kod}).`);
      if (!metinDuz(y).includes('sayfa yok')) return hata('404 cevabında "Sayfa yok!" yazmalı.');
      return tamam('404 sayfan hazır!');
    },
  },
  {
    tip: 'soru', soru: '<code>/led?durum=1</code> adresinde <code>server.arg("durum")</code> ne döndürür?',
    secenekler: ['"1" (metin olarak)', '"led"', 'Hata verir', 'HIGH'], dogru: 0,
    aciklama: 'Adresteki soru işaretinden sonraki değerler argümandır. server.arg("durum") bu değeri metin olarak verir; karşılaştırırken "1" ile kıyaslanır.',
  },
];

// ──────────────────────────────────────────────────────────
// 10.3 Kendi ağın (softAP)
// ──────────────────────────────────────────────────────────
const gorev103 = [
  {
    tip: 'kod', baslik: 'Ağ adını değiştir',
    metin: `Kurduğun Wi-Fi ağının adı <b>Sinif-AP</b> olsun (şifre aynı kalabilir).`,
    ipucu: 'WiFi.softAP("Deneyap-ESP32", ...) içindeki ilk metni değiştir.',
    sure: 6000,
    girdi: async sim => { await sim.bekle(3000); await sim.ag.istek('/'); },
    kontrol(sim) {
      const ap = sim.ag.wifi.ap;
      if (!ap) return hata('Ağ kurulmadı: WiFi.softAP(...) çağır.');
      if (ap.ssid !== 'Sinif-AP') return hata(`Ağ adı "${ap.ssid}"; "Sinif-AP" olmalı.`);
      return tamam('Ağın adı artık Sinif-AP!');
    },
  },
  {
    tip: 'soru', soru: 'Station (istasyon) modu ile Access Point (AP) modu arasındaki fark nedir?',
    secenekler: ['Station mevcut bir ağa bağlanır, AP kendi ağını kurar', 'Station ağ kurar, AP bağlanır', 'İkisi aynıdır', 'AP yalnızca Bluetooth içindir'], dogru: 0,
    aciklama: 'WiFi.begin() ile kart bir modeme bağlanan istemci olur (station). WiFi.softAP() ile kart kendisi modem gibi davranıp ağ yayar.',
  },
  {
    tip: 'kod', baslik: 'Durum yolu: /durum',
    metin: `Yeni bir adres ekle: <b>/durum</b> adresi LED yanıksa <b>ACIK</b>, sönükse <b>KAPALI</b> yazısını (<code>text/plain</code>) döndürsün.`,
    ipucu: 'ledAcik değişkenine göre server.send(200, "text/plain", ledAcik ? "ACIK" : "KAPALI"); yaz. server.on("/durum", ...) eklemeyi unutma.',
    sure: 8000,
    girdi: async sim => {
      await sim.bekle(3000);
      await sim.ag.istek('/durum');
      await sim.ag.istek('/led');
      await sim.ag.istek('/durum');
    },
    kontrol(sim) {
      const d = (sim.ag.gecmis ?? []).filter(x => x.yol === '/durum');
      if (d.length < 2 || d.some(x => x.kod !== 200)) return hata('/durum yolu cevap vermedi; server.on("/durum", ...) ekledin mi?');
      if (!metinDuz(d[0]).includes('kapali')) return hata('LED sönükken /durum "KAPALI" demeli.');
      if (!metinDuz(d[1]).includes('acik')) return hata('/led ile LED yanınca /durum "ACIK" demeli.');
      return tamam('Durum yolu doğru cevap veriyor!');
    },
  },
  {
    tip: 'soru', soru: 'ESP32 kendi ağını kurduğunda (softAP) varsayılan IP adresi nedir?',
    secenekler: ['192.168.4.1', '10.0.0.1', '127.0.0.2', '255.255.255.0'], dogru: 0,
    aciklama: 'ESP32\'nin kendi ağındaki adresi genellikle 192.168.4.1\'dir. Telefonu bu ağa bağlayıp tarayıcıda bu adresi açarsın.',
  },
  {
    tip: 'kod', baslik: 'Açık ağ kur (şifresiz)',
    metin: `Misafirler için <b>şifresiz</b> bir ağ kur: ağ adı <b>Misafir</b>, <b>şifre olmasın</b>. (Sadece oyun için; gerçek projelerde şifre kullan!)`,
    ipucu: 'softAP\'ye yalnızca ağ adını ver: WiFi.softAP("Misafir");',
    sure: 6000,
    girdi: async sim => { await sim.bekle(3000); await sim.ag.istek('/'); },
    kontrol(sim) {
      const ap = sim.ag.wifi.ap;
      if (!ap) return hata('Ağ kurulmadı.');
      if (ap.ssid !== 'Misafir') return hata(`Ağ adı "${ap.ssid}"; "Misafir" olmalı.`);
      if (ap.sifre) return hata('Bu ağda şifre olmamalı.');
      return tamam('Misafir ağı şifresiz yayında (gerçek hayatta dikkatli ol)!');
    },
  },
  {
    tip: 'soru', soru: 'Şifreli bir softAP ağı için şifre en az kaç karakter olmalıdır?',
    secenekler: ['8', '3', '1', '20'], dogru: 0,
    aciklama: 'WPA2 şifreleri en az 8 karakter olmalıdır. Daha kısa şifreyle ESP32 ağı şifresiz kurar ya da kurmaz.',
  },
];

// ──────────────────────────────────────────────────────────
// Modül 10 Ders Listesi
// ──────────────────────────────────────────────────────────
export default [
  {
    id: 'wifi-baglan',
    ad: '10.1 · Wi-Fi\'ye bağlan',
    sure: 6000,
    sadeceKod: true,
    telefon: false,
    baslangicKod: BASLANGIC_101,
    gorevler: gorev101,
    html: `<h2>Wi-Fi'ye bağlan</h2>
      <p>ESP32'nin en güçlü yanı Wi-Fi! Bu derste kartı evdeki (burada atölyedeki) kablosuz ağa bağlayıp IP adresini öğreneceğiz.</p>
      <ol>
        <li><code>#include &lt;WiFi.h&gt;</code> ile Wi-Fi kütüphanesini ekle.</li>
        <li>Ağ adı <b>Atolye</b>, şifre <b>12345678</b>. <code>WiFi.begin(ssid, sifre)</code> ile bağlanmayı başlat.</li>
        <li><code>WiFi.status()</code> <b>WL_CONNECTED</b> olana kadar bekle (her 500 ms'de bir nokta yazdır).</li>
        <li>Bağlanınca seri monitöre <b>IP adresini</b> yazdır ve <b>D0</b> LED'ini yak.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Wi-Fi kütüphanesi ve ağ bilgileri',
        html: `<p>Kodun başında <code>#include &lt;WiFi.h&gt;</code> var. Ağ adını ve şifreyi iki değişkende sakla: <code>ssid</code> ve <code>sifre</code>. Bunlar hazır geldi.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Bağlanmayı başlat',
        html: `<p><code>setup()</code> içinde <code>WiFi.begin(ssid, sifre);</code> yaz. Bu satır bağlanmayı başlatır ama beklemez; bağlanmak birkaç saniye sürer.</p>`,
        ipucu: 'Serial.begin(115200) ve pinMode zaten hazır; altına WiFi.begin ekle.',
      },
      {
        baslik: 'Bağlanana kadar bekle',
        html: `<p><code>while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }</code> döngüsü bağlantıyı bekler ve her yarım saniyede bir nokta yazar.</p>`,
        ipucu: 'WL_CONNECTED sabiti "bağlandı" anlamına gelir.',
      },
      {
        baslik: 'IP adresini yazdır ve LED\'i yak',
        html: `<p>Bağlanınca <code>Serial.println(WiFi.localIP());</code> ile IP adresini yaz, ardından <code>digitalWrite(D0, HIGH);</code> ile LED'i yak.</p>`,
        ipucu: 'IP adresi kartın ağdaki adresidir; 192.168.1.42 gibi görünür.',
      },
      {
        baslik: 'Çalıştır',
        html: `<p>▶ <b>Çalıştır</b>'a bas. Birkaç saniye sonra seri çıktıda noktalar, ardından IP adresi görünmeli ve LED yanmalı.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Bağlanma yaklaşık 1,5 saniye sürer.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'yesil' }] },
    girdi: agKur({ Atolye: '12345678' }),
    kontrol(sim) {
      if (sim.ag.durum() !== 3) return hata('Kart ağa bağlanmadı. WiFi.begin(ssid, sifre) çağırdın ve WL_CONNECTED\'i bekledin mi?');
      if (!ipVar(sim, '192.168.1.42')) return hata('IP adresi seri monitöre yazılmadı: Serial.println(WiFi.localIP());');
      if (sim.pin.D0.deger !== 1) return hata('Bağlanınca D0 LED\'i yanmalı.');
      return tamam('Harika! ESP32 Wi-Fi\'ye bağlandı, IP adresini öğrendin ve LED yandı.');
    },
  },

  {
    id: 'ilk-web-sayfasi',
    ad: '10.2 · İlk web sayfan',
    sure: 8000,
    sadeceKod: true,
    telefon: true,
    baslangicKod: BASLANGIC_102,
    gorevler: gorev102,
    html: `<h2>İlk web sayfan</h2>
      <p>ESP32'yi bir <b>web sunucusuna</b> çeviriyoruz: telefonun tarayıcısından kartın adresini açınca sayfa kartın içinden gelecek!</p>
      <ol>
        <li><code>WebServer server(80);</code> ile sunucu nesnesi oluştur (80 numaralı port web için standarttır).</li>
        <li>Ana sayfa için bir <code>void anaSayfa()</code> fonksiyonu yaz: HTML metnini <code>server.send(200, "text/html", ...)</code> ile gönder.</li>
        <li><code>/led?durum=1</code> ve <code>/led?durum=0</code> bağlantılarıyla LED'i aç/kapat.</li>
        <li>Telefon sekmesinden sayfayı aç ve bağlantılara dokun!</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'Sunucu nesnesi',
        html: `<p>Kodun başında <code>WebServer server(80);</code> hazır. Telefon bu kapıya (port 80) gelip kartla konuşur.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Sayfa fonksiyonu',
        html: `<p>Sayfayı gönderen fonksiyonu yaz: <code>void anaSayfa() { server.send(200, "text/html", s); }</code>. <b>200</b> "başarılı", <code>text/html</code> "bu bir web sayfası" demektir. Fonksiyonun bir adı olmalı; <code>server.on</code> ona adıyla başvurur.</p>`,
        ipucu: 'HTML metnini String s ile += kullanarak parça parça birleştirebilirsin.',
      },
      {
        baslik: 'LED yolu',
        html: `<p><code>void ledYolu()</code> içinde <code>server.arg("durum")</code> değerine bak: <code>"1"</code> ise LED yansın, değilse sönsün. Sonra yine sayfayı gönder.</p>`,
        ipucu: 'Cevap göndermeyen işleyici telefonun "cevap vermedi" demesine yol açar.',
      },
      {
        baslik: 'Yolları kaydet ve başlat',
        html: `<p><code>setup()</code> sonunda <code>server.on("/", anaSayfa);</code>, <code>server.on("/led", ledYolu);</code> ve <code>server.begin();</code> yaz. <code>loop()</code> içine <code>server.handleClient();</code> koy.</p>`,
        ipucu: 'server.on("/", anaSayfa()) değil, parantezsiz anaSayfa yaz!',
      },
      {
        baslik: 'Telefondan dene',
        html: `<p>▶ <b>Çalıştır</b>'a bas, ardından <b>📱 TELEFON</b> sekmesine geç. Sayfa açılacak; <b>LED Ac</b> ve <b>LED Kapat</b> bağlantılarına dokun.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Önce Çalıştır; kart bağlanana kadar birkaç saniye bekle.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'kirmizi' }] },
    girdi: async sim => {
      sim.ag.aglar = { Atolye: '12345678' };
      await sim.bekle(4000);
      await sim.ag.istek('/');
      await sim.ag.istek('/led?durum=1');
      await sim.bekle(300);
      await sim.ag.istek('/led?durum=0');
    },
    kontrol(sim) {
      const g = sim.ag.gecmis ?? [];
      const ana = g.find(x => x.yol === '/' && x.kod === 200);
      if (!ana) return hata('Telefona ana sayfa gelmedi: server.on("/", anaSayfa), server.begin() ve loop() içinde server.handleClient() var mı?');
      if (!/<html|<h1|<body/i.test(ana.metin)) return hata('Gelen cevap bir HTML sayfası gibi görünmüyor.');
      const l = olaylar(sim, 'D0');
      if (!l.some(o => o.deger === 1)) return hata('/led?durum=1 isteğinde LED yanmadı.');
      if (sim.pin.D0.deger !== 0) return hata('/led?durum=0 isteğinde LED sönmedi.');
      return tamam('Harika! ESP32 web sunucusu oldu: sayfa açıldı ve LED telefondan yanıp söndü.');
    },
  },

  {
    id: 'kendi-agin',
    ad: '10.3 · Kendi Wi-Fi ağın',
    sure: 7000,
    sadeceKod: true,
    telefon: true,
    baslangicKod: BASLANGIC_103,
    gorevler: gorev103,
    html: `<h2>Kendi Wi-Fi ağın</h2>
      <p>Modem yok mu? Sorun değil! ESP32 <b>kendi Wi-Fi ağını</b> kurabilir (softAP). Telefonunu bu ağa bağlayıp internetsiz bir web sayfası açacağız.</p>
      <ol>
        <li><code>WiFi.softAP("Deneyap-ESP32", "12345678")</code> ile ağı kur (şifre en az 8 karakter).</li>
        <li><code>WiFi.softAPIP()</code> kartın bu ağdaki adresidir: <b>192.168.4.1</b>.</li>
        <li>Sayfa HTML'ini <code>R"rawliteral(...)rawliteral"</code> ham metniyle yaz; tırnak kaçışı gerekmez.</li>
        <li>Telefon sekmesinden sayfayı aç, LED bağlantısına dokun.</li>
      </ol>`,
    adimlar: [
      {
        baslik: 'İki mod: bağlan ya da kur',
        html: `<p>Şimdiye dek <code>WiFi.begin()</code> ile mevcut bir ağa bağlandık. <code>WiFi.softAP()</code> ise kartı bir modem gibi yapar: telefonlar ona bağlanır.</p>`,
        vurgu: { parca: 0 },
      },
      {
        baslik: 'Ham metinle HTML',
        html: `<p>Sayfayı <code>const char* SAYFA = R"rawliteral( ...HTML... )rawliteral";</code> içine yaz. Bu biçimde HTML içindeki tırnakları kaçırmana gerek kalmaz.</p>`,
        ipucu: 'Tanımı kodun üstüne, fonksiyonlardan önce koy.',
      },
      {
        baslik: 'Yol fonksiyonları',
        html: `<p><code>anaSayfa()</code> sayfayı gönderir. <code>ledYolu()</code> ise bir <code>bool ledAcik</code> değişkenini tersine çevirir, LED'i buna göre yakıp söndürür ve sayfayı yine gönderir.</p>`,
        ipucu: 'ledAcik = !ledAcik; digitalWrite(D0, ledAcik ? HIGH : LOW);',
      },
      {
        baslik: 'Ağı kur ve sunucuyu başlat',
        html: `<p><code>setup()</code> içinde <code>WiFi.softAP(...)</code> ile ağı kur, <code>Serial.println(WiFi.softAPIP());</code> ile adresi yazdır, yolları kaydet, <code>server.begin();</code> de. <code>loop()</code> içine <code>server.handleClient();</code> unutma.</p>`,
        ipucu: 'Bu derste WiFi.begin() YOK; ağı sen kuruyorsun.',
      },
      {
        baslik: 'Telefondan dene',
        html: `<p>▶ <b>Çalıştır</b>'a bas ve <b>📱 TELEFON</b> sekmesinde sayfayı aç. <b>LED Degistir</b> bağlantısıyla LED'i yak/söndür.</p>`,
        vurgu: { parca: 0 },
        bitti: { basari: true },
        ipucu: 'Seri çıktıda 192.168.4.1 görmelisin.',
      },
    ],
    sahne: { parcalar: [{ tur: 'led', pin: 'D0', renk: 'sari' }] },
    girdi: async sim => {
      await sim.bekle(3000);
      await sim.ag.istek('/');
      await sim.ag.istek('/led');
    },
    kontrol(sim) {
      const ap = sim.ag.wifi.ap;
      if (!ap) return hata('Ağ kurulmadı: WiFi.softAP("ad", "şifre") çağır.');
      if (!ap.ssid) return hata('Ağın bir adı olmalı.');
      if (ap.sifre.length < 8) return hata('Şifre en az 8 karakter olmalı.');
      if (!ipVar(sim, '192.168.4.1')) return hata('Seri monitöre softAPIP() yazılmadı: Serial.println(WiFi.softAPIP());');
      const ana = (sim.ag.gecmis ?? []).find(x => x.yol === '/' && x.kod === 200);
      if (!ana) return hata('Telefona sayfa gelmedi: server.begin() ve loop() içinde server.handleClient() var mı?');
      if (sim.pin.D0.deger !== 1) return hata('/led isteğinden sonra LED yanmalı.');
      return tamam('Harika! Kendi Wi-Fi ağını kurdun ve telefondan LED\'i yaktın!');
    },
  },
];
