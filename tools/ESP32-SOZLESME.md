# Modül 9–10 — ESP32 altyapısı sözleşmesi (ders yazarları için)

Dosyalar: `src/ag.js` (sanal Wi-Fi/sunucu durumu = `sim.ag`), `src/cppcalistir.js` (C++ API), `src/sim.js` (pullup/dokunma), `src/parts/dokunmatik.js` (parça), `src/telefon.js` (Telefon paneli), örnek ders: `src/lessons/_demo-esp32.js`, test: `tools/test-esp32.mjs`.
Dersler `src/lessons/m9-*.js`, `m10-*.js` dosyalarında (otomatik yüklenir). Hepsi **sadece C++** olabilir (blok yok).

## 1. Ders şemasına yeni alanlar

```js
{
  id, ad: '9.1 · …',                 // "ad" mutlaka "<modül>.<no> · Ad" biçiminde
  sadeceKod: true,                   // Bloklar sekmesi/anahtarı gizlenir; C++ editörü açık gelir (blok bazlı adım koşulu kullanma)
  baslangicKod: '…C++…',             // editörde açılan kod; verilmezse boş setup()/loop() şablonu. "↺" düğmesi buna döner
  telefon: true,                     // sağ panelde "📱 TELEFON" sekmesi (Wi-Fi/WebServer dersleri için)
  sahne: { parcalar: [ … ] },
  sure, girdi(sim), kontrol(sim), adimlar, gorevler …   // mevcut şema aynen
}
```
- `sadeceKod` derste "ders tamamlandı + yazıyla kod" bonusu, kod `baslangicKod`'dan farklıysa verilir.
- `telefon: true` yalnız sekmeyi gösterir; telefonu ders `girdi()` ile de sürebilirsin (aşağıda).
- Adım koşulları `{ calistir:true }` ve `{ basari:true }` kullanılabilir; `{ blok: … }` kullanma.

## 2. C++ API (cppcalistir.js)

Mevcut Arduino alt kümesine ek olarak (hepsi sanal saatte çalışır; `delay()` sanal zamanı ilerletir):

| Konu | Desteklenen |
|---|---|
| Pin modu | `pinMode(p, INPUT \| OUTPUT \| INPUT_PULLUP \| INPUT_PULLDOWN)` |
| Dokunma | `touchRead(D4)` → boşta **70**, parmakla **10** (int). Eşik örneği: `if (touchRead(D4) < 40)` |
| ESP32 PWM | `ledcSetup(kanal, frekans, bit)`, `ledcAttachPin(pin, kanal)`, `ledcWrite(kanal, deger)`; yeni çekirdek: `ledcAttach(pin, frekans, bit)`, `ledcWrite(pin, deger)` (deger 0..2^bit-1 → pwm oranı) |
| Diğer | `temperatureRead()` (38.5), `analogReadResolution`, `analogRead` (0..4095), `Serial.printf`, ham metin `R"rawliteral(...)rawliteral"`, bitişik metinler `"a" "b"` |
| Wi-Fi | `#include <WiFi.h>` şart. `WiFi.begin(ssid, sifre)`, `WiFi.status()`, `WiFi.localIP()` (String; `IPAddress ip = …` da olur), `WiFi.softAP(ssid[, sifre])`, `WiFi.softAPIP()`, `WiFi.disconnect()`, `WiFi.mode(WIFI_STA\|WIFI_AP\|WIFI_AP_STA)`, `WiFi.SSID()`, `WiFi.RSSI()`, `WiFi.macAddress()`, `WiFi.isConnected()`, `WiFi.reconnect()` |
| Sabitler | `WL_IDLE_STATUS 0, WL_NO_SSID_AVAIL 1, WL_CONNECTED 3, WL_CONNECT_FAILED 4, WL_CONNECTION_LOST 5, WL_DISCONNECTED 6`, `WIFI_OFF/STA/AP/AP_STA`, `HTTP_GET`, `HTTP_POST`, `HTTP_ANY` |
| Sunucu | `#include <WebServer.h>` şart. `WebServer server(80);` `server.on("/yol", fonksiyonAdi);` (veya `server.on("/yol", HTTP_GET, fonksiyonAdi)`), `server.onNotFound(fn)`, `server.begin()`, `server.handleClient()`, `server.send(kod, "text/html", metin)`, `server.sendHeader(a, b)`, `server.arg("ad")` (String, yoksa ""), `server.hasArg("ad")`, `server.args()`, `server.uri()`, `server.method()`, `server.stop()` |

Kurallar ve sınırlar (hata mesajları öğrenciye Türkçe, satır numarasıyla çıkar):
- Yol işleyicisi **adı verilen** `void f()` olmalı: `server.on("/", anaSayfa);`. Lambda (`[](){...}`) ve `anaSayfa()` biçimi **yok** (anlaşılır hata verir).
- Işleyici `server.send(...)` çağırmazsa telefon "cevap vermedi" hatası alır (gerçek ESP32'de de istek asılı kalırdı).
- `handleClient()` her çağrıda **bir** bekleyen isteği işler; `loop()` içinde çağrılmalı. Bekleme için `delay(2)` yeterli.
- `WiFi.begin()` sonrası bağlanma **1500 sanal ms** sürer (`sim.ag.baglanmaSuresi`); `while (WiFi.status() != WL_CONNECTED) { delay(500); }` doğal çalışır.
- İstasyon IP: **192.168.1.42**; softAP IP: **192.168.4.1**. Bağlı değilken `localIP()` "0.0.0.0" döner.
- Tek sunucu/port 80 (başka port de olur: `WebServer s(8080)`; telefon varsayılanı 80).
- HTTP POST gövdesi/JSON yok; form `GET` ile (`server.arg`) çalışır. `String`, `+`, `String(x)`, `.toInt()` vb. normal.
- Çoklu görev/FreeRTOS, `EEPROM`, `Preferences`, `SPIFFS`, mDNS, `attachInterrupt` **yok** (derleme hatası verir).

## 3. Sim alanları (kontrol / girdi için)

```js
sim.girdi[pin]      // FİZİKSEL durum: düğme basılı = 1. INPUT'ta digitalRead aynısını verir;
                    // INPUT_PULLUP'ta TERS: boşta 1, basılıyken (girdi=1) 0. Yani senaryoda yine "bas = 1, bırak = 0" yaz.
sim.pin[p].mod      // 'girdi' | 'cikti' | 'pullup'
sim.dokunma[pin]    // touchRead ham değeri; tanımsızsa 70. Senaryo: sim.dokunma.D4 = 10 (dokun), delete sim.dokunma.D4 (bırak)
sim.dokunmaOku(pin) // touchRead'in döndürdüğü değer
sim.ag              // sanal ağ (aşağıda)
```

`sim.ag`:
```js
// Telefon tarafı (girdi senaryosunda ya da kontrolde)
const y = await sim.ag.istek('/');                          // → { kod, tip, metin, hata?, yol, arg, t }
await sim.ag.istek('/led?durum=1');                         // sorgu dizgisi
await sim.ag.istek('/led', { arg: { durum: 1 } });          // ya da arg nesnesi
await sim.ag.istek('/', { port: 8080, yontem: 'POST' });
// Hata durumunda hemen döner (kod: 0, hata: '...'): ağ yok / server.begin() yok / program durdu.
// Normal durumda programın server.handleClient() çağırmasını bekler.

sim.ag.gecmis       // [{ t, yol, arg, kod, tip, metin, hata? }]  tüm istekler (kontrol bunlara bakar)
sim.ag.sonCevap()   // son cevap ya da null
sim.ag.bagli()      // STA bağlı mı;  sim.ag.durum() = WiFi.status();  sim.ag.adres() = telefonun görebildiği IP ya da null
sim.ag.wifi         // { ssid, sifre, ap: {ssid, sifre} | null, mod, durum }
sim.ag.yollar()     // server.on ile kayıtlı yollar (["/", "/led"])
// Ders düzeneği (girdi'den ÖNCE, hazirla aşamasında ya da girdi başında):
sim.ag.aglar = { 'Atolye': '12345678' };   // null (varsayılan): her ağ kabul. Doluysa: bilinmeyen SSID → WL_NO_SSID_AVAIL, yanlış şifre → WL_CONNECT_FAILED
sim.ag.baglanmaSuresi = 1500;
sim.ag.ip = '192.168.1.42';
```
Ders `girdi(sim)` içinden telefon örneği (zamanlama sanal saatte; ESP32 bağlanana kadar 1.5 sn + sunucu hazırlığı için bekle):
```js
girdi: async sim => {
  await sim.bekle(4000);                          // Wi-Fi bağlansın, server.begin() çağrılsın
  await sim.ag.istek('/');                        // ana sayfa
  await sim.ag.istek('/led', { arg: { durum: 1 } });
  await sim.bekle(500);
  sim.dokunma.D4 = 10;                            // parmak değdi
},
kontrol: sim => {
  const g = sim.ag.gecmis.filter(x => x.kod === 200);
  if (!g.length) return { ok: false, mesaj: 'Telefona hiç sayfa gelmedi: server.begin() ve loop() içinde server.handleClient() var mı?' };
  if (!/LED/.test(g[0].metin)) return { ok: false, mesaj: 'Sayfada "LED" yazısı yok.' };
  if (sim.pin.D0.deger !== 1) return { ok: false, mesaj: 'LED yanmadı.' };
  return { ok: true, mesaj: 'Telefondan LED yandı!' };
}
```
`kontrol` süresi dolunca (sim.iptal) çağrılır; bekleyen telefon istekleri `kod: 0, hata: 'Program durdu'` ile biter, yani `await` asla takılmaz. Çıktılar (Serial): `sim.seriCikti` (satır dizisi); IP satırı `sim.seriCikti.some(s => s.includes('192.168.1.42'))`.

LED/PWM çıkışları eskisi gibi: `sim.olaylar` (`!o.tur` → çıkış), `sim.pin[p].deger/pwm`.

## 4. Sahne tanımı

```js
sahne: { parcalar: [
  { tur: 'dokunmatik', pin: 'D4' },               // kapasitif pad: parmağa bas-bırak → sim.dokunma[pin] = 10 / silinir (touchRead 70)
  { tur: 'led', pin: 'D0', renk: 'kirmizi' },
  { tur: 'dugme', pin: 'D5' },                    // INPUT_PULLUP ile kullanılabilir (basılı = 0 okunur)
] }
```
- `dokunmatik`: breadboard üzerinde mavi kart + bakır pad; üstünde yarı saydam hayalet parmak (basınca iner, pad parlar). Sahnede pad'e **basılı tut** → dokunma; bırak → 70. Sim değeri dışarıdan (`sim.dokunma.D4 = 10`) değişirse görsel de güncellenir. Tipik ders pini D4.
- Telefon ayrı bir parça değildir: `telefon: true` olan dersin sağ panelinde 4. sekme (**📱 TELEFON**) görünür.

### Telefon paneli (kullanıcı tarafı)
Sağ panelde telefon çerçevesi: üstte `ESP32: çalışıyor · 📶 SSID · IP` durum çubuğu (+ Çalıştır/Durdur), adres çubuğu (yaz + Enter, geri `‹`, yenile `↻`), ekran (sunucunun gönderdiği HTML **iframe** içinde, kendi betikleri çalışır), altta `server.on` ile kayıtlı yolların hızlı düğmeleri.
- Sayfadaki `<a href="/led?durum=1">`, `<form>` (GET) ve `fetch('/yol')` çağrıları telefon üzerinden `sim.ag.istek` ile ESP32'ye gider; `fetch` yanıtında `.text()`, `.json()`, `.ok`, `.status` vardır. `XMLHttpRequest`, harici kaynaklar (CDN, görsel URL'si) çalışmaz; stil/JS **inline** yaz.
- Metin türü HTML değilse (`text/plain`, `application/json`) düz yazı olarak gösterilir. Hata (kod 0) "Bu siteye ulaşılamıyor" sayfası çıkar. 4 sn cevap gelmezse "cevap vermedi" ipucu çıkar.
- Telefon yalnız program **çalışırken** cevap alır (Çalıştır'a bas, sonra Telefon sekmesine geç; program durmaz).

## 5. Ders yazarken öneriler
- İlk dersler: `touchRead` ile eşik (`< 40`), sonra LED/buzzer tepkisi; `INPUT_PULLUP` ile düğme (basınca LOW).
- Wi-Fi dersleri `baslangicKod`'da `ssid/sifre` hazır versin; `girdi` 4000 ms beklesin; `sure` en az 8000.
- HTML'i C++ içinde ham metin ile yaz (`R"rawliteral(...)rawliteral"`) — tırnak kaçışı sorunu olmaz; değişkenli kısımlar için `String` birleştirme.
- Kontrolde yalnız `sim.ag.gecmis`, `sim.pin`, `sim.seriCikti`, `sim.olaylar`'a bak; gerçek zamana bağlı hiçbir şey kullanma.
- Hata durumları (Wi-Fi'ye bağlanamama) için `sim.ag.aglar = { … }` ile yanlış şifre dersi kurulabilir.

## 6. Test ve görsel doğrulama
- `node tools/test-esp32.mjs` — pullup, touch, dokunmatik parça, Wi-Fi/WebServer, ham metin, ledc, derleme hataları. Kendi ders testlerinde `tools/test-esp32.mjs` içindeki `kos(kod, T, girdi, hazirla)` kalıbını kopyalayabilirsin (vite ssr + `cppDerle` + `girdi` senaryosu).
- Görsel: `node tools/_ekran-esp32.mjs` demo dersi açar (`http://localhost:5173/#test=1&demo=0&sekme=telefon&calistir=1`), telefon panelinde tıklar, `shots/esp32-*.png` üretir.
- Test kancası: `#demo=<n>` `src/lessons/_demo-esp32.js` içindeki n. dersi (kayıtsız) yükler.
