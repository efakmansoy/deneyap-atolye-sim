// ESP32 altyapısı testi (Modül 9-10): node tools/test-esp32.mjs
// INPUT_PULLUP, touchRead/dokunmatik parça, sanal Wi-Fi + WebServer (sim.ag), ham metin, ledc*.
import { createServer } from 'vite';
import * as THREE from 'three';

const SHIM = new URL('./_blockly-shim.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });
let fail = 0;
const tamam = (ad, k, ek = '') => { console.log((k ? 'OK   ' : 'FAIL ') + ad + (!k && ek ? '\n' + ek : '')); if (!k) fail++; };
const bekle = ms => new Promise(r => setTimeout(r, ms));

try {
  const { Sim } = await vite.ssrLoadModule('/src/sim.js');
  const { cppDerle } = await vite.ssrLoadModule('/src/cppcalistir.js');
  const dokunmatik = (await vite.ssrLoadModule('/src/parts/dokunmatik.js')).default;
  const dugme = (await vite.ssrLoadModule('/src/parts/dugme.js')).default;

  // Programı ve (varsa) ders girdi senaryosunu birlikte T sanal ms çalıştırır. girdi(sim) -> sonuç dizisine yazabilir.
  async function kos(kod, T, girdi, hazirla) {
    const sim = new Sim(); sim.hiz = 20; hazirla?.(sim);
    const d = cppDerle(kod, sim); if (d.hata) return { derlemeHatasi: d.hata.mesaj, sim, hatalar: [] };
    const hatalar = [], sonuc = {};
    const p = d.calistir().catch(e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); });
    const g = girdi ? girdi(sim, sonuc).catch(e => { if (e?.constructor?.name !== 'DurdurSinyali') hatalar.push(e); }) : null;
    const bit = sim.bekle(T).catch(() => {});
    await Promise.race([p, bit]);
    sim.t = Math.max(sim.t, T); sim.iptal = true; await p; await g;
    return { sim, hatalar, sonuc };
  }
  const ok = async (ad, kod, T, kontrol, girdi, hazirla) => {
    const r = await kos(kod, T, girdi, hazirla);
    const s = r.derlemeHatasi ? [r.derlemeHatasi] : r.hatalar.map(String);
    if (!s.length) { try { const x = kontrol(r.sim, r.sonuc); if (x !== true && x !== undefined) s.push('beklenmeyen: ' + JSON.stringify(x)); } catch (e) { s.push(String(e)); } }
    tamam(ad, !s.length, s.join('\n'));
  };
  const derleHata = (ad, kod, parca) => {
    const d = cppDerle(kod, new Sim());
    tamam(ad, d.hata && d.hata.mesaj.includes(parca), d.hata ? d.hata.mesaj : 'hata beklenirdi');
  };

  // ── (1) INPUT_PULLUP ──
  const PULLUP = `void setup() { pinMode(D5, INPUT_PULLUP); pinMode(D0, OUTPUT); Serial.begin(115200); }
void loop() { int v = digitalRead(D5); digitalWrite(D0, v == LOW ? HIGH : LOW); Serial.println(v); delay(50); }`;
  await ok('pullup: boşta 1, LED sönük', PULLUP, 400, sim => sim.seriCikti[0] === '1' && sim.pin.D0.deger === 0 || `seri=${sim.seriCikti[0]} led=${sim.pin.D0.deger}`);
  await ok('pullup: düğmeye basınca 0, LED yanar, bırakınca tekrar 1', PULLUP, 1000, sim => {
    const led = sim.olaylar.filter(o => o.pin === 'D0'); return (led.length === 2 && led[0].deger === 1 && led[1].deger === 0 && sim.seriCikti.at(-1) === '1') || JSON.stringify(led);
  }, async sim => { await sim.bekle(300); sim.girdi.D5 = 1; await sim.bekle(300); sim.girdi.D5 = 0; });
  await ok('INPUT modunda düğme: basılınca 1 (ters değil)', `void setup(){ pinMode(D5, INPUT); } void loop(){ Serial.println(digitalRead(D5)); delay(100); }`, 500,
    sim => sim.seriCikti.includes('0') && sim.seriCikti.includes('1'), async sim => { await sim.bekle(250); sim.girdi.D5 = 1; });
  await ok('pullup: dugme parçası (pointerDown/Up) ile uyumlu', PULLUP, 900, sim => sim.seriCikti.some(s => s === '0'), async sim => {
    const n = dugme.olustur({ THREE, tanim: { tur: 'dugme', pin: 'D5' }, konum: new THREE.Vector3(), index: 0 });
    await sim.bekle(200); n.pointerDown(sim); await sim.bekle(300); n.pointerUp(sim);
  });

  // ── (2) touchRead ──
  await ok('touchRead: boş ~70, dokununca ~10', `void setup(){ Serial.begin(115200); } void loop(){ Serial.println(touchRead(D4)); delay(100); }`, 700, sim => {
    const s = sim.seriCikti.map(Number); return (s[0] === 70 && s.at(-1) === 10) || JSON.stringify(s);
  }, async sim => { await sim.bekle(350); sim.dokunma.D4 = 10; });
  await ok('touchRead eşiği: LED dokununca yanar', `void setup(){ pinMode(D0, OUTPUT); } void loop(){ if (touchRead(D4) < 40) digitalWrite(D0, HIGH); else digitalWrite(D0, LOW); delay(20); }`.replace('#define EŞIK 40\n', ''), 600,
    sim => { const l = sim.olaylar.filter(o => o.pin === 'D0'); return (l.length === 2 && l[0].deger === 1 && l[0].t >= 200) || JSON.stringify(l); },
    async sim => { await sim.bekle(200); sim.dokunma.D4 = 8; await sim.bekle(200); delete sim.dokunma.D4; });
  {
    const sim = new Sim(), s = { girdi: sim.dokunma };
    const n = dokunmatik.olustur({ THREE, tanim: { tur: 'dokunmatik', pin: 'D4' }, konum: new THREE.Vector3(), index: 0 });
    n.guncelle(sim); tamam('dokunmatik parça: group dolu, başlangıç değer yazılmaz/boş', n.group.isGroup && n.group.children.length > 5 && sim.dokunmaOku('D4') === 70);
    n.pointerDown(sim); tamam('dokunmatik: pointerDown -> ~10', sim.dokunmaOku('D4') === 10);
    n.pointerUp(sim); tamam('dokunmatik: pointerUp -> 70', sim.dokunmaOku('D4') === 70);
    tamam('dokunmatik: tur', dokunmatik.tur === 'dokunmatik');
  }

  // ── (3) Wi-Fi + WebServer ──
  const SUNUCU = `#include <WiFi.h>
#include <WebServer.h>
const char* ssid = "Atolye";
const char* sifre = "12345678";
WebServer server(80);
bool ledAcik = false;
String sayfa() {
  String s = "<h1>Deneyap</h1><p>LED: ";
  s += ledAcik ? "ACIK" : "KAPALI";
  s += "</p><a href=\\"/led?durum=1\\">Ac</a>";
  return s;
}
void anaSayfa() { server.send(200, "text/html", sayfa()); }
void ledYolu() {
  if (server.hasArg("durum")) { ledAcik = server.arg("durum") == "1"; digitalWrite(D0, ledAcik ? HIGH : LOW); }
  server.send(200, "text/html", sayfa());
}
void yok() { server.send(404, "text/plain", "Sayfa yok: " + server.uri()); }
void setup() {
  Serial.begin(115200);
  pinMode(D0, OUTPUT);
  WiFi.begin(ssid, sifre);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println(WiFi.localIP());
  server.on("/", anaSayfa);
  server.on("/led", HTTP_GET, ledYolu);
  server.onNotFound(yok);
  server.begin();
}
void loop() { server.handleClient(); delay(2); }`;
  await ok('WebServer: bağlan, IP yaz, / ve /led, 404', SUNUCU, 6000, (sim, so) => {
    const e = [];
    if (!sim.seriCikti.some(s => s.includes('192.168.1.42'))) e.push('IP yazılmadı: ' + sim.seriCikti.join('|'));
    if (!/LED: KAPALI/.test(so.a?.metin ?? '') || so.a?.kod !== 200 || so.a?.tip !== 'text/html') e.push('ana sayfa ' + JSON.stringify(so.a));
    if (!/LED: ACIK/.test(so.b?.metin ?? '')) e.push('led ' + JSON.stringify(so.b));
    if (so.c?.kod !== 404 || !so.c.metin.includes('/nope')) e.push('404 ' + JSON.stringify(so.c));
    if (sim.pin.D0.deger !== 1) e.push('LED yanmadı');
    if (sim.ag.gecmis.filter(g => g.kod).length !== 3) e.push('geçmiş ' + sim.ag.gecmis.length);
    if (sim.ag.yollar().join() !== '/,/led') e.push('yollar ' + sim.ag.yollar());
    return e.length ? e.join('; ') : true;
  }, async (sim, so) => {
    await sim.bekle(3000);
    so.a = await sim.ag.istek('/');
    so.b = await sim.ag.istek('/led', { arg: { durum: 1 } });
    so.c = await sim.ag.istek('/nope?x=1');
  });
  await ok('istek: Wi-Fi bağlanmadan hata döner', SUNUCU, 300, (sim, so) => (so.a.kod === 0 && /ağa bağlı değil/.test(so.a.hata)) || JSON.stringify(so.a),
    async (sim, so) => { await sim.bekle(100); so.a = await sim.ag.istek('/'); });
  await ok('softAP: IP 192.168.4.1, sunucu telefonu karşılar', `#include <WiFi.h>
#include <WebServer.h>
WebServer server;
void kok() { server.send(200, "text/plain", "merhaba " + server.arg("ad")); }
void setup() { Serial.begin(115200); WiFi.softAP("Deneyap-ESP", "12345678"); Serial.println(WiFi.softAPIP()); server.on("/", kok); server.begin(); }
void loop() { server.handleClient(); }`, 400, (sim, so) => (sim.seriCikti[0] === '192.168.4.1' && so.a.metin === 'merhaba Ece') || JSON.stringify([sim.seriCikti, so.a]),
    async (sim, so) => { await sim.bekle(100); so.a = await sim.ag.istek('/?ad=Ece'); });
  await ok('yanlış şifre -> WL_CONNECT_FAILED', `#include <WiFi.h>
void setup() { Serial.begin(115200); WiFi.begin("Atolye", "yanlis"); delay(2000); Serial.println(WiFi.status()); } void loop() {}`, 2500,
    sim => sim.seriCikti[0] === '4' || sim.seriCikti[0], null, sim => { sim.ag.aglar = { Atolye: '12345678' }; });
  await ok('bilinmeyen ağ -> WL_NO_SSID_AVAIL, bağlı değil', `#include <WiFi.h>
void setup() { WiFi.begin("Yok", "x"); delay(2000); Serial.println(WiFi.status() == WL_NO_SSID_AVAIL); Serial.println(WiFi.localIP()); } void loop() {}`, 2500,
    sim => (sim.seriCikti.join('|') === '1|0.0.0.0') || sim.seriCikti.join('|'), null, sim => { sim.ag.aglar = { Atolye: '12345678' }; });
  await ok('handler send çağırmazsa istek hata ile biter', `#include <WiFi.h>
#include <WebServer.h>
WebServer server(80); void bos() {}
void setup() { WiFi.softAP("a"); server.on("/", bos); server.begin(); } void loop() { server.handleClient(); }`, 400,
    (sim, so) => (so.a.kod === 0 && /send/.test(so.a.hata)) || JSON.stringify(so.a), async (sim, so) => { await sim.bekle(50); so.a = await sim.ag.istek('/'); });
  await ok('program durunca bekleyen istek hata ile biter (takılmaz)', `#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);
void setup() { WiFi.softAP("a"); server.begin(); } void loop() { delay(10); }`, 300,
    (sim, so) => (so.a.kod === 0) || JSON.stringify(so.a), async (sim, so) => { await sim.bekle(50); so.a = await sim.ag.istek('/'); });
  await ok('ham metin R"( )" + bitişik metinler + ledc', `#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);
void kok() { server.send(200, "text/html", R"rawliteral(<html><body class="x">Merhaba "dünya"</body></html>)rawliteral" "!"); }
void setup() { ledcSetup(0, 5000, 8); ledcAttachPin(D1, 0); ledcWrite(0, 128); ledcAttach(D2, 1000, 10); ledcWrite(D2, 1023);
  WiFi.softAP("a"); server.on("/", kok); server.begin(); }
void loop() { server.handleClient(); }`, 300, (sim, so) => {
    const e = []; if (so.a.metin !== '<html><body class="x">Merhaba "dünya"</body></html>!') e.push(so.a.metin);
    if (Math.round(sim.pin.D1.pwm * 255) !== 128) e.push('ledc kanal ' + sim.pin.D1.pwm); if (sim.pin.D2.pwm !== 1) e.push('ledcAttach ' + sim.pin.D2.pwm);
    return e.length ? e.join(';') : true;
  }, async (sim, so) => { await sim.bekle(50); so.a = await sim.ag.istek('/'); });

  // ── (4) derleme hataları (öğrenciye anlaşılır) ──
  derleHata('WebServer include eksik', `WebServer s(80); void setup(){} void loop(){}`, '#include <WebServer.h>');
  derleHata('WiFi include eksik', `void setup(){ WiFi.begin("a","b"); } void loop(){}`, '#include <WiFi.h>');
  derleHata('lambda desteklenmiyor mesajı', `#include <WebServer.h>\nWebServer s(80); void setup(){ s.on("/", []() { s.send(200); }); } void loop(){}`, 'fonksiyonun adını');
  derleHata('server.on parantezli çağrı', `#include <WebServer.h>\nWebServer s(80); void kok(){} void setup(){ s.on("/", kok()); } void loop(){}`, 'sonuna () koyma');
  derleHata('send olmayan üye', `#include <WebServer.h>\nWebServer s(80); void setup(){ s.gonder(1); } void loop(){}`, 'komutu yok');
} finally { await vite.close(); }

console.log(fail ? `\n${fail} HATA` : '\nTÜMÜ GEÇTİ');
process.exit(fail ? 1 : 0);
