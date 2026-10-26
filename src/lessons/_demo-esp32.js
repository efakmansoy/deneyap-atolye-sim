// Geliştirme/test amaçlı örnek ders (kayıtlı ders DEĞİL, 'm*.js' glob'una girmez): http://localhost:5173/#test=1&demo=0&sekme=telefon&calistir=1
// sadeceKod + telefon + dokunmatik parça şemasının çalışan bir örneği (ders yazarları için kopyalanabilir).
const KOD = `#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "Atolye";
const char* sifre = "12345678";
WebServer server(80);
bool ledAcik = false;

String sayfa() {
  String s = "<html><body style='font-family:sans-serif;text-align:center;padding:16px'>";
  s += "<h2>Deneyap LED</h2><p style='font-size:20px'>LED: <b>";
  s += ledAcik ? "ACIK" : "KAPALI";
  s += "</b></p><p><a href='/led?durum=1'><button style='font-size:18px;padding:10px 18px'>Ac</button></a> ";
  s += "<a href='/led?durum=0'><button style='font-size:18px;padding:10px 18px'>Kapat</button></a></p>";
  s += "<p>Dokunmatik: " + String(touchRead(D4)) + "</p></body></html>";
  return s;
}
void anaSayfa() { server.send(200, "text/html", sayfa()); }
void ledYolu() {
  ledAcik = server.arg("durum") == "1";
  digitalWrite(D0, ledAcik ? HIGH : LOW);
  server.send(200, "text/html", sayfa());
}

void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  WiFi.begin(ssid, sifre);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println(WiFi.localIP());
  server.on("/", anaSayfa);
  server.on("/led", ledYolu);
  server.begin();
}

void loop() { server.handleClient(); delay(2); }
`;

export default [{
  id: 'demo-telefon', ad: '10.9 · Telefon demosu', sadeceKod: true, telefon: true, baslangicKod: KOD,
  sahne: { parcalar: [{ tur: 'led', pin: 'D0' }, { tur: 'dokunmatik', pin: 'D4' }] },
  adimlar: [{ baslik: 'Demo', html: '<p>Telefon panelini dene: Çalıştır, sonra <b>Telefon</b> sekmesinde Aç/Kapat.</p>' }],
  gorev: 'Telefondan LED\'i yak.',
  sure: 60000,
  girdi: async sim => { await sim.bekle(4000); await sim.ag.istek('/led?durum=1'); },
  kontrol: sim => (sim.pin.D0.deger === 1 ? { ok: true, mesaj: 'LED telefondan yandı!' } : { ok: false, mesaj: 'LED yanmadı.' }),
}];
