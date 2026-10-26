# Modül 8 — Robot araba sözleşmesi (ders yazarları için)

Dosyalar: `src/araba-dunya.js` (saf JS fizik), `src/parts/araba.js` (3B model), `src/arena3b.js` (zemin/duvar/çizgi), test: `tools/test-araba.mjs`.

## 1. Sahne tanımı

```js
sahne: {
  arena: 'engelli',                       // 'duz' | 'engelli' | 'cizgi'  (ya da özel nesne, bkz. §3)
  parcalar: [{
    tur: 'araba',
    pinler: {                             // hepsi opsiyonel; verilmeyenler varsayılan
      solIleri: 'D0', solGeri: 'D1',      // sol motor yön pinleri (L298N IN1, IN2)
      sagIleri: 'D2', sagGeri: 'D3',      // sağ motor yön pinleri (IN3, IN4)
      solHiz: null,   sagHiz: null,       // opsiyonel PWM "enable" pinleri (ENA/ENB), örn. 'D9','D10'
      mesafe: 'D4',                       // ultrasonik sensör (tek pin; mevcut 'mesafe' parçasıyla aynı sözleşme)
      cizgiSol: 'D5', cizgiSag: 'D6',     // çizgi sensörleri
    },
    baslangic: { x: 0, y: 0, yonDerece: 0 },   // opsiyonel, arena varsayılanını ezer
  }],
}
```
`tanim.arena` yalnızca arabalı derslerde verilir; verildiğinde breadboard gösterilmez, arena kartın sağında çizilir ve kamera ona bakar. `araba` parçası arena yoksa `'duz'` kullanır.

## 2. Motor kuralları (programın yapacağı)
- Bir motorun gücü = `(ileriPin.pwm - geriPin.pwm)` × (varsa `Hiz` pininin pwm'i; `Hiz` pini tanımlıysa ve hiç yazılmadıysa 0 = motor dönmez; tanımlı değilse 1). `digitalWrite(pin,HIGH)` pwm=1, `analogWrite(pin,0..255)` pwm=v/255.
- Yalnız ileri pin yüksek: ileri; yalnız geri pin yüksek: geri; ikisi aynı: dur.
- |güç| < 0.15 ise motor dönmez (kalkış eşiği). Tam güçte tekerlek hızı 25 cm/s.
- Her iki motor ileri: düz gider. Sol dur + sağ ileri: sola döner (saat yönünün tersi). Sol ileri + sağ geri: olduğu yerde sağa döner. Tekerlek aralığı 12 cm.
- Arabanın yarıçapı 10 cm (daire olarak çarpışır); duvara/engele çarpınca o yöne ilerleyemez (durur), dönebilir.
- Fizik sanal saate (`sim.t`) göre ÇÖZÜMSEL entegre edilir: `sim.olaylar` içindeki pin geçişleri sırayla işlenir.

## 3. Arena

Hazır adlar (birim cm, orijin = arena merkezi, +x sağ, +y yukarı/ileri):

| ad | boyut | içerik | başlangıç (x,y,yön) |
|---|---|---|---|
| `duz` | 160 x 100 | boş düz zemin | (-60, 0, 0°) → +x'e bakar |
| `engelli` | 160 x 100 | 4 kutu engel: (-25,0) 12x30 [başlangıç yolunun tam üstünde], (20,18) 30x30, (0,-30) 20x20, (55,-15) 14x14 (x,y,genişlik,yükseklik) | (-65, 0, 0°) |
| `cizgi` | 160 x 120 | beyaz zemin üzerinde siyah kapalı çizgi parkuru (köşeleri yuvarlak dikdörtgen, çizgi 4 cm) | çizginin alt kenarı üstünde, +x'e bakar |

Özel arena: `arena: { genislik, yukseklik, engeller: [{x,y,w,h}], cizgiler: [{genislik:4, nokta:[[x,y],[x,y],...]}], baslangic:{x,y,yonDerece} }`.

## 4. Sensörler (sim üzerinden okunur — ders programı normal `pulseIn`/`digitalRead` karşılıklarını kullanır)
- Ultrasonik: `sim.cihaz.mesafe[mesafePin]` = cm (tam sayı, 2–200), arabanın burnundan baktığı yönde en yakın duvar/engele. Her okumada güncel hesaplanır (canlı getter).
- Çizgi: `sim.girdi[cizgiSolPin]` / `sim.girdi[cizgiSagPin]` = 1 siyah çizgi üzerinde, 0 beyaz zeminde (`sim.oku(pin)` / `digitalRead`). Sensörler burnun 9 cm önünde, eksenin ±3.5 cm yanında.

## 5. Durum (derslerin `kontrol(sim)` fonksiyonları için)
`sim.cihaz.araba = { x, y, yon, yonDerece, hiz, solGuc, sagGuc, carpti, yol }`
- `x,y` cm; `yon` radyan (0 = +x, saat yönünün tersi pozitif); `yonDerece` 0..360; `hiz` cm/s (işaretli, ileri +);
- `carpti`: şimdiye kadar duvar/engele çarptı mı; `yol`: toplam kat edilen yol (cm).
- Konum geçmişi: `sim.cihaz.araba.iz` = `[{t,x,y,yon}]` (her pin değişiminde bir nokta).

Saf-JS kullanım (node/ders testleri için ZORUNLU, tarayıcıda parça bunu kendisi yapar):
```js
import { arabaBagla } from '../araba-dunya.js';
const dunya = arabaBagla(sim, ders.sahne);   // sim'e sensör getter'larını ve sim.cihaz.araba'yı kurar; aynı sim için tekrar çağırmak aynı dünyayı döner
// ... program/senaryo çalışır, sim.t ilerler ...
dunya.guncelle();                            // sim.t'ye kadar entegre et (kontrol'den önce çağır)
const a = sim.cihaz.araba;                   // {x,y,yon,hiz,...}
dunya.mesafe(); dunya.cizgi();               // anlık sensör değerleri ([sol,sag] için cizgi())
```
`sim.sifirla()` sonrası `arabaBagla` yeniden çağrılmalıdır (tarayıcıda parçanın `guncelle`'si bunu otomatik yapar; node'da `kos()` içinde `cppDerle`'den ÖNCE çağırın). Başka yardımcılar: `hazirArena(ad)`, `ArabaDunya`.

## 6. Ders kontrolü için ipuçları
- Nominal: 1 sn tam güç ileri = 25 cm. Yerinde 90° dönmek için (tek tekerlek ters) ~ 0.9 sn tam güçte: ω = (vR−vL)/12 = 4.17 rad/s → 90° ≈ 0.38 sn.
- Engelden kaçan: başlangıç (-65,0) → engellere çarpmadan x > 60'a ulaşma kontrol edilebilir (`!a.carpti`).
- Çizgi izleyen: yolun kapalı parkurda ilerlemesini `a.yol` ve çizgiden hiç uzaklaşmamasını (dünya `cizgiMesafe()`) ile kontrol edin.

## 7. Görsel test kancası
`http://localhost:5173/#arena=engelli&surus=ileri` (arena: duz|engelli|cizgi, surus: ileri|sol) arenayı ders olmadan açar ve motorları sürer.
