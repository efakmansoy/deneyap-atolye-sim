// Modül 10 için sesli anlatım parçaları ve "kodu değiştir" görevleri
import { olaylar, tamam, hata } from '../m6-projeler.js';
import { seriMetin } from '../m9-esp32.js';
import { ipVar, sonCevap, metinDuz } from '../m10-wifi.js';

// ── Referans C++ çözümleri (tools/e2e/cozumler-m10.mjs bunları kullanır) ──
export const KOD_101 = (ssid = 'Atolye', sifre = '12345678', mesaj = 'Baglandi!', bekleme = 500) => `#include <WiFi.h>

const char* ssid = "${ssid}";
const char* sifre = "${sifre}";

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  WiFi.begin(ssid, sifre);
  Serial.print("Baglaniyor");
  while (WiFi.status() != WL_CONNECTED) {
    delay(${bekleme});
    Serial.print(".");
  }
  Serial.println();
  Serial.println("${mesaj}");
  Serial.println(WiFi.localIP());
  digitalWrite(D0, HIGH);
}

void loop() {
}
`;

export const KOD_102 = (baslik = 'Merhaba Deneyap!', yol = '/led', stil = 'text-align:center') => `#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "Atolye";
const char* sifre = "12345678";
WebServer server(80);

void anaSayfa() {
  String s = "<html><body style='font-family:sans-serif;${stil}'>";
  s += "<h1>${baslik}</h1>";
  s += "<a href='${yol}?durum=1'>LED Ac</a> ";
  s += "<a href='${yol}?durum=0'>LED Kapat</a>";
  s += "</body></html>";
  server.send(200, "text/html", s);
}

void ledYolu() {
  if (server.arg("durum") == "1") {
    digitalWrite(D0, HIGH);
  } else {
    digitalWrite(D0, LOW);
  }
  anaSayfa();
}

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  WiFi.begin(ssid, sifre);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  Serial.println(WiFi.localIP());
  server.on("/", anaSayfa);
  server.on("${yol}", ledYolu);
  server.begin();
}

void loop() {
  server.handleClient();
  delay(2);
}
`;

export const KOD_103 = (ssid = 'Deneyap-ESP32', sifre = '12345678', baslik = 'Kendi Agim') => `#include <WiFi.h>
#include <WebServer.h>

WebServer server(80);
bool ledAcik = false;

const char* SAYFA = R"rawliteral(
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;text-align:center">
  <h1>${baslik}</h1>
  <p>Bu sayfa internetsiz, dogrudan ESP32'den geliyor.</p>
  <a href="/led">LED Degistir</a>
</body>
</html>
)rawliteral";

void anaSayfa() {
  server.send(200, "text/html", SAYFA);
}

void ledYolu() {
  ledAcik = !ledAcik;
  digitalWrite(D0, ledAcik ? HIGH : LOW);
  server.send(200, "text/html", SAYFA);
}

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  WiFi.softAP("${ssid}", "${sifre}");
  Serial.println(WiFi.softAPIP());
  server.on("/", anaSayfa);
  server.on("/led", ledYolu);
  server.begin();
}

void loop() {
  server.handleClient();
  delay(2);
}
`;

const girdi102 = (...yollar) => async sim => {
  sim.ag.aglar = { Atolye: '12345678' };
  await sim.bekle(4000);
  for (const y of yollar) await sim.ag.istek(y);
};

export default {
  // ──────────────────────────────────────────────────────────
  'wifi-baglan': {
    sesli: [
      { ses: 'ESP32\'nin en güçlü yanı Wi-Fi! Bu derste kartı kablosuz ağa bağlayıp IP adresini öğreneceğiz.', parca: 0 },
      { ses: 'Önce Wi-Fi kütüphanesini ekliyoruz. Ağın adını ve şifresini de iki değişkende saklıyoruz, böylece sonradan değiştirmek kolay olur.', yaz: '#include <WiFi.h>\n\nconst char* ssid = "Atolye";\nconst char* sifre = "12345678";\n\n' },
      { ses: 'Setup bölümünde seri haberleşmeyi başlatıyor ve LED pinini çıkış yapıyoruz.', yaz: 'void setup() {\n  Serial.begin(115200);\n  pinMode(D0, OUTPUT);\n', parca: 0 },
      { ses: 'WiFi nokta begin ile bağlanmayı başlatıyoruz. Bu satır beklemez; bağlanmak birkaç saniye sürer, o yüzden ekrana Bağlanıyor yazıyoruz.', yaz: '  WiFi.begin(ssid, sifre);\n  Serial.print("Baglaniyor");\n' },
      { ses: 'Durum bağlandı olana kadar döngüde bekliyoruz. Her yarım saniyede bir nokta yazarak ilerlemeyi gösteriyoruz.', yaz: '  while (WiFi.status() != WL_CONNECTED) {\n    delay(500);\n    Serial.print(".");\n  }\n' },
      { ses: 'Döngüden çıktıysak bağlandık demektir. Satırı bitirip bağlandı mesajını yazıyoruz.', yaz: '  Serial.println();\n  Serial.println("Baglandi!");\n' },
      { ses: 'Kartın ağdaki adresini, yani IP adresini yazdırıyoruz. Sonraki derste telefon bu adrese gelecek. Son olarak LED\'i yakıyoruz.', yaz: '  Serial.println(WiFi.localIP());\n  digitalWrite(D0, HIGH);\n}\n\n', parca: 0 },
      { ses: 'Her şey setup içinde bittiği için loop boş kalabilir.', yaz: 'void loop() {\n}\n' },
      { ses: 'Çalıştıralım! Birkaç saniye sonra noktaları, ardından IP adresini göreceksin.', calistir: true, parca: 0 },
      { ses: 'Harika! Kartın artık ağda. Görevlerde farklı ağlara bağlanmayı ve sinyal gücünü okumayı deneyebilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Kütüphane ağına bağlan',
        metin: 'Ağ adını <b>Kutuphane</b>, şifreyi <b>kitap2024</b> yap. (Sadece bu ağ kabul ediliyor.)',
        kod: KOD_101(), degistir: [{ ara: '"Atolye"' }, { ara: '"12345678"' }],
        cozum: KOD_101('Kutuphane', 'kitap2024'), sure: 6000,
        girdi: async sim => { sim.ag.aglar = { Kutuphane: 'kitap2024' }; },
        ipucu: 'Tırnakları koruyarak içindeki metinleri değiştir.',
        kontrol(sim) {
          if (!sim.ag.bagli()) return hata('Kart ağa bağlanamadı: ağ adı ve şifreyi kontrol et.');
          return tamam('Kütüphane ağına bağlandın!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Bağlandı mesajını değiştir',
        metin: 'Bağlanınca seri monitöre <b>Hazirim!</b> yazılsın.',
        kod: KOD_101(), degistir: [{ ara: '"Baglandi!"' }],
        cozum: KOD_101('Atolye', '12345678', 'Hazirim!'), sure: 6000,
        girdi: async sim => { sim.ag.aglar = { Atolye: '12345678' }; },
        ipucu: '"Baglandi!" yazısını "Hazirim!" yap.',
        kontrol(sim) {
          if (!seriMetin(sim).includes('Hazirim!')) return hata('Seri monitörde "Hazirim!" görünmedi.');
          return tamam('Yeni mesaj yazıldı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Daha sık nokta (250 ms)',
        metin: 'Bağlanırken noktalar daha sık çıksın: bekleme süresini <b>250 ms</b> yap.',
        kod: KOD_101(), degistir: [{ ara: 'delay(500)' }],
        cozum: KOD_101('Atolye', '12345678', 'Baglandi!', 250), sure: 6000,
        girdi: async sim => { sim.ag.aglar = { Atolye: '12345678' }; },
        ipucu: 'while içindeki delay(500) değerini 250 yap.',
        kontrol(sim) {
          const nokta = (seriMetin(sim).split('\n')[0].match(/\./g) ?? []).length;
          if (nokta < 5) return hata(`Yalnızca ${nokta} nokta yazıldı; 250 ms beklemeyle yaklaşık 6 nokta çıkmalı.`);
          return tamam('Noktalar daha sık geliyor!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'ilk-web-sayfasi': {
    sesli: [
      { ses: 'Şimdi ESP32\'yi bir web sunucusuna çeviriyoruz. Telefonun tarayıcısı kartın adresini açınca sayfa kartın içinden gelecek.', parca: 0 },
      { ses: 'Wi-Fi ve WebServer kütüphanelerini ekliyoruz, ağ bilgilerini yazıyoruz ve seksen numaralı portta çalışan bir sunucu nesnesi oluşturuyoruz.', yaz: '#include <WiFi.h>\n#include <WebServer.h>\n\nconst char* ssid = "Atolye";\nconst char* sifre = "12345678";\nWebServer server(80);\n\n' },
      { ses: 'Ana sayfa fonksiyonu HTML metnini parça parça birleştiriyor. Önce sayfanın başlangıcı ve büyük bir başlık geliyor.', yaz: 'void anaSayfa() {\n  String s = "<html><body style=\'font-family:sans-serif;text-align:center\'>";\n  s += "<h1>Merhaba Deneyap!</h1>";\n' },
      { ses: 'İki bağlantı ekliyoruz. Biri LED\'i açan, diğeri kapatan adrese gidiyor. Soru işaretinden sonraki durum, kartın okuyacağı argümandır.', yaz: '  s += "<a href=\'/led?durum=1\'>LED Ac</a> ";\n  s += "<a href=\'/led?durum=0\'>LED Kapat</a>";\n' },
      { ses: 'Sayfayı kapatıp telefona gönderiyoruz. İki yüz, başarılı demektir; text slash html de bunun bir web sayfası olduğunu söyler.', yaz: '  s += "</body></html>";\n  server.send(200, "text/html", s);\n}\n\n' },
      { ses: 'LED yolu, durum argümanı bir ise LED\'i yakıyor, değilse söndürüyor. Sonra sayfayı yeniden gönderiyor ki kullanıcı sayfada kalsın.', yaz: 'void ledYolu() {\n  if (server.arg("durum") == "1") {\n    digitalWrite(D0, HIGH);\n  } else {\n    digitalWrite(D0, LOW);\n  }\n  anaSayfa();\n}\n\n', parca: 0 },
      { ses: 'Setup içinde pini hazırlıyor, ağa bağlanıyor ve bağlanana kadar bekliyoruz. IP adresini yazdırıyoruz.', yaz: 'void setup() {\n  Serial.begin(115200);\n  pinMode(D0, OUTPUT);\n  WiFi.begin(ssid, sifre);\n  while (WiFi.status() != WL_CONNECTED) {\n    delay(500);\n  }\n  Serial.println(WiFi.localIP());\n' },
      { ses: 'Şimdi hangi adresin hangi fonksiyonu çalıştıracağını kaydediyoruz. Fonksiyon adını parantezsiz yazıyoruz. Sonra sunucuyu başlatıyoruz.', yaz: '  server.on("/", anaSayfa);\n  server.on("/led", ledYolu);\n  server.begin();\n}\n\n' },
      { ses: 'Loop içinde handleClient çağırarak gelen istekleri sürekli karşılıyoruz.', yaz: 'void loop() {\n  server.handleClient();\n  delay(2);\n}\n' },
      { ses: 'Çalıştır, sonra Telefon sekmesine geç. Sayfa açılınca LED bağlantılarına dokun!', calistir: true, parca: 0 },
      { ses: 'Tebrikler, ilk web sayfan hazır! Görevlerde yeni yollar ve özel hata sayfaları ekleyebilirsin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Başlığı değiştir',
        metin: 'Sayfa başlığı <b>Merhaba Atolye!</b> olsun.',
        kod: KOD_102(), degistir: [{ ara: 'Merhaba Deneyap!' }],
        cozum: KOD_102('Merhaba Atolye!'), sure: 7000,
        girdi: girdi102('/'),
        ipucu: '<h1> içindeki yazıyı değiştir.',
        kontrol(sim) {
          const y = sonCevap(sim, '/');
          if (!y || !y.metin.includes('Merhaba Atolye!')) return hata('Sayfada "Merhaba Atolye!" başlığı görünmedi.');
          return tamam('Yeni başlık sayfada!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Sarı arka plan',
        metin: 'Sayfanın arka planı sarımsı olsun: stil metninin sonuna <code>;background:lightyellow</code> ekle.',
        kod: KOD_102(), degistir: [{ ara: 'text-align:center' }],
        cozum: KOD_102('Merhaba Deneyap!', '/led', 'text-align:center;background:lightyellow'), sure: 7000,
        girdi: girdi102('/'),
        ipucu: 'text-align:center ifadesinden sonra noktalı virgül ve background:lightyellow yaz.',
        kontrol(sim) {
          const y = sonCevap(sim, '/');
          if (!y || !metinDuz(y).includes('lightyellow')) return hata('Sayfa stilinde background:lightyellow görünmedi.');
          return tamam('Sayfan artık sarımsı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yolu /isik yap',
        metin: 'LED yolu <b>/isik</b> olsun: sayfadaki iki bağlantıyı ve <code>server.on</code> satırını değiştir.',
        kod: KOD_102(), degistir: [{ ara: '/led' }],
        cozum: KOD_102('Merhaba Deneyap!', '/isik'), sure: 7000,
        girdi: girdi102('/', '/isik?durum=1'),
        ipucu: '/led yazan üç yeri de /isik yap (turuncu işaretliler).',
        kontrol(sim) {
          const y = sonCevap(sim, '/');
          if (!y || !y.metin.includes('/isik')) return hata('Sayfadaki bağlantılar /isik adresini göstermeli.');
          if (sim.pin.D0.deger !== 1) return hata('/isik?durum=1 isteğinde LED yanmadı; server.on("/isik", ...) yazdın mı?');
          return tamam('LED yolu artık /isik!');
        },
      },
    ],
  },

  // ──────────────────────────────────────────────────────────
  'kendi-agin': {
    sesli: [
      { ses: 'Modem yok mu? ESP32 kendi Wi-Fi ağını kurabilir. Telefonu bu ağa bağlayıp internetsiz bir sayfa açacağız.', parca: 0 },
      { ses: 'Kütüphaneleri ekliyor, sunucuyu oluşturuyor ve LED\'in durumunu tutan bir değişken tanımlıyoruz.', yaz: '#include <WiFi.h>\n#include <WebServer.h>\n\nWebServer server(80);\nbool ledAcik = false;\n\n' },
      { ses: 'Sayfayı ham metin olarak yazıyoruz. Bu biçimde HTML içindeki tırnakları kaçırmak gerekmiyor. Sayfada bir başlık ve LED\'i değiştiren bir bağlantı var.', yaz: 'const char* SAYFA = R"rawliteral(\n<!DOCTYPE html>\n<html>\n<body style="font-family:sans-serif;text-align:center">\n  <h1>Kendi Agim</h1>\n' },
      { ses: 'Bir açıklama satırı ve LED bağlantısını ekleyip ham metni kapatıyoruz.', yaz: '  <p>Bu sayfa internetsiz, dogrudan ESP32\'den geliyor.</p>\n  <a href="/led">LED Degistir</a>\n</body>\n</html>\n)rawliteral";\n\n' },
      { ses: 'Ana sayfa fonksiyonu bu metni telefona gönderiyor.', yaz: 'void anaSayfa() {\n  server.send(200, "text/html", SAYFA);\n}\n\n' },
      { ses: 'LED yolu, durum değişkenini tersine çeviriyor, LED\'i buna göre yakıp söndürüyor ve sayfayı yeniden gönderiyor.', yaz: 'void ledYolu() {\n  ledAcik = !ledAcik;\n  digitalWrite(D0, ledAcik ? HIGH : LOW);\n  server.send(200, "text/html", SAYFA);\n}\n\n', parca: 0 },
      { ses: 'Setup içinde bu sefer WiFi nokta softAP ile kendi ağımızı kuruyoruz: bir ad ve en az sekiz karakterlik bir şifre veriyoruz. Kartın bu ağdaki adresini de yazdırıyoruz.', yaz: 'void setup() {\n  Serial.begin(115200);\n  pinMode(D0, OUTPUT);\n  WiFi.softAP("Deneyap-ESP32", "12345678");\n  Serial.println(WiFi.softAPIP());\n' },
      { ses: 'Yolları kaydedip sunucuyu başlatıyoruz.', yaz: '  server.on("/", anaSayfa);\n  server.on("/led", ledYolu);\n  server.begin();\n}\n\n' },
      { ses: 'Loop içinde gelen istekleri karşılamaya devam ediyoruz.', yaz: 'void loop() {\n  server.handleClient();\n  delay(2);\n}\n' },
      { ses: 'Çalıştır ve Telefon sekmesinden sayfayı aç. LED bağlantısına dokunarak LED\'i değiştir!', calistir: true, parca: 0 },
      { ses: 'Mükemmel! Artık modemsiz de çalışan bir ESP32 web sunucun var.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Ağ adını değiştir',
        metin: 'Ağın adı <b>Atolye-AP</b> olsun.',
        kod: KOD_103(), degistir: [{ ara: '"Deneyap-ESP32"' }],
        cozum: KOD_103('Atolye-AP'), sure: 6000,
        girdi: async sim => { await sim.bekle(3000); await sim.ag.istek('/'); },
        ipucu: 'softAP içindeki ilk metni değiştir.',
        kontrol(sim) {
          const ap = sim.ag.wifi.ap;
          if (!ap || ap.ssid !== 'Atolye-AP') return hata(`Ağ adı "${ap?.ssid ?? ''}"; "Atolye-AP" olmalı.`);
          return tamam('Ağın adı Atolye-AP oldu!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yeni şifre',
        metin: 'Ağ şifresi <b>deneyap123</b> olsun.',
        kod: KOD_103(), degistir: [{ ara: '"12345678"' }],
        cozum: KOD_103('Deneyap-ESP32', 'deneyap123'), sure: 6000,
        girdi: async sim => { await sim.bekle(3000); await sim.ag.istek('/'); },
        ipucu: 'softAP içindeki ikinci metni değiştir.',
        kontrol(sim) {
          const ap = sim.ag.wifi.ap;
          if (!ap || ap.sifre !== 'deneyap123') return hata('Şifre "deneyap123" olmalı.');
          return tamam('Şifre güncellendi!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Sayfa başlığı',
        metin: 'Sayfa başlığı <b>Sinif Agi</b> olsun.',
        kod: KOD_103(), degistir: [{ ara: 'Kendi Agim' }],
        cozum: KOD_103('Deneyap-ESP32', '12345678', 'Sinif Agi'), sure: 6000,
        girdi: async sim => { await sim.bekle(3000); await sim.ag.istek('/'); },
        ipucu: '<h1> içindeki yazıyı değiştir.',
        kontrol(sim) {
          const y = sonCevap(sim, '/');
          if (!y || !metinDuz(y).includes('sinif agi')) return hata('Sayfada "Sinif Agi" başlığı görünmedi.');
          return tamam('Yeni başlık sayfada!');
        },
      },
    ],
  },
};
