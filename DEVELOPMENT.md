# Geliştirici notları

"Deneyap Atölye": Deneyap Kart 1A v2 (ESP32-S3) / Arduino için tarayıcıda çalışan 3B laboratuvar ve ders uygulaması (Vite + three + blockly). Arayüz ve içerik Türkçe; kod yorumları, dosya ve değişken adları da Türkçe.

## Komutlar

```
npm run dev                       # vite geliştirme sunucusu
npm run build                     # dist/ (public/ses ~42 MB ekler; 500 kB chunk uyarısı normal)
node tools/e2e/e2e.mjs            # tam uçtan uca test (gerçek Chrome + vite build/preview, port 5199) — 64 senaryo
node tools/test-m7.mjs            # tek modül paketi (test-m2 … test-m10, test-cpp, test-araba, test-esp32 …)
node tools/test-parts-m7.mjs      # parça sözleşmesi (Node'da three, WebGL gerekmez)
node tools/test-yerlesim.mjs      # tüm sahnelerde parça üst üste binme / breadboard taşma kontrolü
```

- Linter yok. Testler bağımsız `node tools/*.mjs` betikleri; hata varsa çıkış kodu ≠ 0.
- E2E ve ekran araçları Chrome'u `C:/Program Files/Google/Chrome/Application/chrome.exe` yolundan, puppeteer-core ile başsız çalıştırır (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-sandbox`). Eski bir vite/preview sunucusu 5199'da kalırsa E2E zaman aşımına düşer; önce kapat.
- Görsel kontrol: `npx vite --port N` açıkken `node tools/ekran-gez.mjs N klasör [ders sırası…]`, `tools/ekran-sayfa.mjs` (3x3 özet sayfa), `tools/ekran-sekme.mjs` (Kod/Görevler/Telefon sekmeleri). Çıktılar `shots/`. Hash: `#ders=N&test` (N 0 tabanlı sıra), `#test` test kancalarını açar.
- Windows'ta `curl` schannel hatası verir; ağ çağrıları için Node `fetch` kullan.

## Mimari

Tek sayfa; `src/main.js` (CRLF satır sonlu) her şeyi bağlar. Çekirdek parçalar:

- **`sim.js`**: pin durumu (`sim.pin`, `sim.girdi`, `sim.analog`, `sim.cihaz`, `sim.ag`). Parçalar ve çalışan program yalnız buradan haberleşir.
- **İki kod yolu, tek simülatör**: Blockly blokları (`blocks.js`, `bloklar/`) ve C++ (`cpp.js` ayrıştırır, `cppcalistir.js` ~1000 satır yorumlayıp çalıştırır; Arduino/ESP32 API'si burada taklit edilir). Modül 9–10 dersleri `sadeceKod`.
- **`scene.js` / `breadboard.js`**: three.js sahnesi. `Sahne.basla()` kart + breadboard + parçaların sınır küresine kamerayı oturtur (kullanıcı kamerayı oynatmadıysa `boyutla()`'da yeniden). Arena dersleri (M8) eski kamerayı korur.
- **`parts/*.js`**: her parça `{ tur, olustur({THREE,tanim,konum,index}) → { group, guncelle(sim), kare(dt,sim), pointer* } }` sözleşmesi. Breadboard merkezi (78,10), 86×54 mm; ders sahnesinde çakışma olursa parçaya açık `konum` ver (`test-yerlesim.mjs` doğrular). PIR kutusu algılama alanını içerdiği için testten muaf.
- **Modül 8**: `araba-dunya.js` (saf JS fizik) + `parts/araba.js` + `arena3b.js`; sözleşme `tools/ARABA-SOZLESME.md`. **Modül 9–10** (ESP32, Wi-Fi, `ag.js`, `telefon.js`, dokunmatik): `tools/ESP32-SOZLESME.md`. Ders yazarken ilgili sözleşmeyi oku.
- **Dersler**: `src/lessons/m*.js` her biri `export default [ders…]`; `index.js` `import.meta.glob` ile yükler ve "doğal sıra" (m2 < m10, m4 < m4b) ile dizer. Toplam 47 ders, modül 1–10. `ad` mutlaka `"<modül>.<no> · Ad"`. Ek içerik (`sesli` anlatım parçaları, `duzenle` "kodu değiştir" görevleri) ders dosyalarına dokunmadan `src/lessons/icerik/*.js` içinde ders `id`'sine bağlanır ve `index.js` birleştirir.
- **Anlatıcı / ses**: `anlatici.js` `sesli` parçalarını sırayla okutur; `tts.js` varsayılan sağlayıcı "Kayıtlı ses"tir: `public/ses/<ders id>-<NN>.mp3` (NN = 1 tabanlı parça sırası) çalar, `public/ses/liste.json` (`{ders id: parça sayısı}`) yalnız mp3 seti tam olan dersleri listeler. public/ses/ git dışındadır (.gitignore); klonda mp3 yoksa tüm dersler tarayıcı sesiyle okunur. Listede olmayan ders baştan sona tarayıcı sesiyle okunur (aynı derste ses karışmasın), mp3 hata verirse yine tarayıcı sesine düşer.
- Diğer: `egitmen.js` (yönlendirme/ipuçları), `oyun.js` (oyunlaştırma), `profil.js` (yerel hesap, localStorage; bulut yok), `style.css`.

## Dil (TR/EN) ve paketleme

- Kaynak kod Türkçe kalır. `tools/i18n/eklenti.mjs` (vite.config.js'te) derleme sırasında `src/i18n/en.js` sözlüğünde karşılığı olan her Türkçe dizeyi/şablonu `__t()` / `__tp` ile sarar; çalışma zamanı `src/i18n.js` (dil: localStorage 'dil' ya da `?lang=en`, değişince sayfa yenilenir). Karşılaştırma/arama argümanı olan dizeler ve `ses` alanları sarılmaz. Karşılığı olmayan metin İngilizce modda sessizce Türkçe kalır.
- Sözlük elle düzenlenmez: `tools/i18n/ceviri/en-*.txt` (`@@id` + çeviri; `@@=anahtar` ile literal anahtar) → `node tools/i18n/birlestir.mjs`. id'ler `_adaylar.json`/`_secili.json` sırasına bağlıdır: `cikar.mjs`/`parcala.mjs`'i yeniden çalıştırma (id'ler kayar). Kaynakta bir Türkçe metni değiştirirsen anahtarı değişir; `_secili.json`'daki anahtarı güncelle ya da `@@=` ile yeni kayıt ekle.
- Denetim: `node tools/e2e/e2e.mjs --en` (İngilizce mod), `tools/i18n/tara-kalan.mjs <port>` (ekranda kalan Türkçe), `tools/i18n/blok-adlari.mjs` (ders metni ile blok etiketi uyumu).
- Masaüstü: `electron/` (`npm run electron:dir|pack`, çıktı `release/`, app:// protokolü). Mobil: Capacitor (`capacitor.config.json`, `android/`, `npm run cap:sync`). Ayrıntılar README.md.

## Ses üretimi (Evren voxcpm2 TTS)

```
NODE_OPTIONS=--dns-result-order=ipv4first EVREN_API_KEY=... node tools/tts-uret.mjs public/ses --tek --capa <ders id…>
node tools/ses-liste.mjs          # liste.json'u yeniden yaz
```

- Anahtar yalnız ortam değişkeninden okunur; hiçbir dosyaya yazma. `--dns-result-order=ipv4first` olmadan her çağrı 10 sn bağlantı zaman aşımına düşer.
- `--tek` dersleri ≤3900 karakterlik gruplara paketler (API sınırı 4096), tek istekte üretir (ses sabit), sessizliklerden parçalara böler, her parçayı ASR ile doğrular; `--capa` her isteğin başına aynı çapa cümlesini koyup sonra atar. Çıktı deterministiktir: aynı metin ve parametre aynı sesi verir.
- Okunuş düzeltmeleri (İngilizce kelimeler, HIGH/LOW…) `tools/tts-okunus.mjs` içinde; değiştirince ilgili grubu yeniden üret. "KONTROL ET" satırları çoğunlukla ASR yazım farkıdır, sınır kayması şüphesi olanlar elle dinlenmeli.

## Dikkat edilecekler

- Senaryo/test girdisi (`sim.girdi`) parçanın kendi zamanlayıcısıyla ezilmemeli (PIR'de `kendi` bayrağı bu yüzden var).
- Sahne düzeni değişince `test-yerlesim.mjs` ve E2E'yi çalıştır; ders ekleyince `tools/e2e/cozumler*.mjs` dosyalarına çözümünü ekle.
