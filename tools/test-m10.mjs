// Modül 10 test paketi: node tools/test-m10.mjs
import DERSLER from '../src/lessons/m10-wifi.js';
import ICERIK, { KOD_101, KOD_102, KOD_103 } from '../src/lessons/icerik/m10-sesli.js';
import COZUMLER from './e2e/cozumler-m10.mjs';
import { calistir } from './ders-test-ortak.mjs';

const ekle = (kod, parcalar) => parcalar.reduce((k, [a, b]) => { if (!k.includes(a)) throw new Error('bulunamadi: ' + a); return k.replace(a, b); }, kod);

const gorevCozum = {
  'wifi-baglan': {
    'Başka bir ağa bağlan': KOD_101('Okul', 'deneyap24'),
    'Bağlanırken LED yanıp sönsün': ekle(KOD_101(), [
      ['  while (WiFi.status() != WL_CONNECTED) {\n    delay(500);', '  bool k = false;\n  while (WiFi.status() != WL_CONNECTED) {\n    k = !k;\n    digitalWrite(D0, k ? HIGH : LOW);\n    delay(500);'],
    ]),
    'Sinyal gücünü yazdır': ekle(KOD_101(), [
      ['  digitalWrite(D0, HIGH);', '  Serial.print("RSSI: ");\n  Serial.println(WiFi.RSSI());\n  digitalWrite(D0, HIGH);'],
    ]),
  },
  'ilk-web-sayfasi': {
    'Başlığı değiştir': KOD_102('Deneyap Atolyesi'),
    'Yeni yol: /merhaba': ekle(KOD_102(), [
      ['void setup() {', 'void merhaba() {\n  server.send(200, "text/plain", "Selam!");\n}\n\nvoid setup() {'],
      ['  server.begin();', '  server.on("/merhaba", merhaba);\n  server.begin();'],
    ]),
    'Sayfa bulunamadı (404)': ekle(KOD_102(), [
      ['void setup() {', 'void bulunamadi() {\n  server.send(404, "text/plain", "Sayfa yok!");\n}\n\nvoid setup() {'],
      ['  server.begin();', '  server.onNotFound(bulunamadi);\n  server.begin();'],
    ]),
  },
  'kendi-agin': {
    'Ağ adını değiştir': KOD_103('Sinif-AP'),
    'Durum yolu: /durum': ekle(KOD_103(), [
      ['void setup() {', 'void durum() {\n  server.send(200, "text/plain", ledAcik ? "ACIK" : "KAPALI");\n}\n\nvoid setup() {'],
      ['  server.begin();', '  server.on("/durum", durum);\n  server.begin();'],
    ]),
    'Açık ağ kur (şifresiz)': ekle(KOD_103(), [['WiFi.softAP("Deneyap-ESP32", "12345678");', 'WiFi.softAP("Misafir");']]),
  },
};

await calistir({ baslik: 'Modül 10', DERSLER, ICERIK, COZUMLER, gorevCozum, adet: 3 });
