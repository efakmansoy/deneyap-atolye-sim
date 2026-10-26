# Deneyap Atölye

**Deneyap Kart 1A v2 (ESP32-S3)** ile Arduino tarzı programlamayı öğrenmek için tarayıcıda çalışan 3B laboratuvar ve ders uygulaması. Öğrenciler sanal parçaları breadboard üzerinde bağlar, bloklarla ya da C++ ile program yazar ve devrenin gerçek zamanlı tepkisini izler.

English: [README.md](README.md)

> **Durum: geliştirme aşamasında.** Proje çalışıyor, ancak dersler, 3B parçalar ve uygulamanın kendisi hâlâ değişiyor; eksikler ve uyumsuz değişiklikler olabilir. İlk sürüm (v0.1.0) ön sürümdür. Hata bildirimleri ve öneriler [issue](../../issues) olarak memnuniyetle karşılanır.

## Özellikler

- **10 modülde 47 ders**: LED, düğmeler, analog ve PWM, ses ve hareket, LCD projeleri, akıllı projeler, doğa ve güvenlik, robot araba, ESP32 tanışma, Wi-Fi ve web.
- **3B simülatör** (three.js): kart, gerçek delik konumlu breadboard, jumper kablolar ve parçalar (LED, RGB LED, buzzer, servo, LCD, ultrasonik ve PIR sensör, potansiyometre, tuş takımı, pompa vb.). Parçalara tıklayarak ya da sürükleyerek etkileşebilirsin.
- **İki kodlama yolu, tek simülatör**: Blockly blokları ve Arduino C++ (yerleşik yorumlayıcı derslerin ihtiyaç duyduğu Arduino/ESP32 komutlarını, Wi-Fi'yi ve telefon panelli sanal web sunucusunu destekler).
- **Rehberli dersler**: anlatım, kodu senin yerine yazan adım adım sesli anlatım, ipuçlu görevler, "kodu değiştir" alıştırmaları ve sorular.
- **İlerleme ve oyunlaştırma**: XP, seviye, rozet, seri ve yerel profiller (yalnızca tarayıcıda saklanır).
- **Diller**: Türkçe (varsayılan) ve İngilizce. Üst çubuktaki **EN / TR** düğmesini kullan. Sesli anlatım yalnızca Türkçedir, altyazısı da Türkçe kalır.

## İndir

Hazır sürümler [son sürüm](../../releases/latest) sayfasındadır: bir Windows kurulum dosyası ve taşınabilir exe, bir de Android APK. Sesli anlatım kayıtları içlerinde yoktur (uygulama dersleri tarayıcının yerleşik sesiyle okur).

- Windows: exe dosyaları kod imzalı değildir, ilk çalıştırmada SmartScreen uyarı verebilir ("Daha fazla bilgi" → "Yine de çalıştır").
- Android: APK, yazarın kendi anahtarıyla imzalıdır, Google Play'den dağıtılmaz. Kurmak için bilinmeyen kaynaklardan yüklemeye izin vermelisin.

## Başlarken

Gereksinim: Node.js 20+.

```
npm install
npm run dev        # geliştirme sunucusu
npm run build      # dist/ içine üretim derlemesi
```

Yazdırılan yerel adresi aç. İngilizce için adrese `?lang=en` ekle ya da **EN** düğmesine bas.

## 3B kart modeli

Deneyap Kart 3B modeli **bu depoda tutulmaz**. Resmi [deneyapkart/deneyapkart-arduino-core](https://github.com/deneyapkart/deneyapkart-arduino-core) deposundan gelir (LGPL-2.1):

- STEP: [docs/3B Model (.step).STEP](https://github.com/deneyapkart/deneyapkart-arduino-core/blob/master/docs/3B%20Model%20(.step).STEP)
- STL: [DK_v2_3BModel(.stl).STL](https://github.com/deneyapkart/deneyapkart-arduino-core/blob/master/DK_v2_3BModel(.stl).STL)

Uygulama `public/models/deneyap-1a-v2-renkli.glb` dosyasını yükler. STEP dosyasından üretmek için:

```
node tools/step2glb.mjs "3B Model (.step).STEP" public/models/deneyap-1a-v2-renkli.glb
```

Bu dosya olmadan da uygulama çalışır, gerçek model yerine düz kırmızı bir kart levhası çizer. Resmi STEP'ten üretilen glb, geliştirmede kullanılanla karşılaştırılmadı; renkler ve sadeleştirme biraz farklı olabilir.

## Testler

Tüm testler, hata olunca sıfırdan farklı kodla çıkan düz Node betikleridir.

```
node tools/e2e/e2e.mjs           # uçtan uca: gerçek Chrome + derlenmiş uygulama, her dersi çözer (Google Chrome gerekir)
node tools/test-m7.mjs           # tek modülün testi (test-m2 ... test-m10, test-cpp, test-araba, test-esp32, ...)
node tools/test-parts-m7.mjs     # parça sözleşmeleri (WebGL gerekmez)
node tools/test-yerlesim.mjs     # hiçbir sahnede parça üst üste binmesin / breadboard dışına taşmasın
```

Uçtan uca test İngilizce modda da çalışır: `node tools/e2e/e2e.mjs --en`.

Görsel kontrol araçları: `tools/ekran-gez.mjs`, `tools/ekran-sayfa.mjs`, `tools/ekran-sekme.mjs`.

## Dil desteği

Kaynak dosyalar Türkçe metni korur. Derleme sırasında bir Vite eklentisi (`tools/i18n/eklenti.mjs`), `src/i18n/en.js` sözlüğünde İngilizcesi olan her Türkçe metni sarar; böylece aynı ders kodu iki dili de sunar. İngilizce modda karşılığı olmayan metinler Türkçe kalır. Sözlük `tools/i18n/ceviri/en-*.txt` dosyalarından `node tools/i18n/birlestir.mjs` ile üretilir. Sesli anlatım (`ses` alanları), kod tanımlayıcıları ve program çıktı metinleri çevrilmez; kodda yalnızca yorumlar çevrilir.

## Sesli anlatım

Anlatım, önceden üretilmiş Türkçe ses dosyalarından çalınır: `public/ses/<ders id>-<NN>.mp3` ve dizin `public/ses/liste.json`.

**Ses kayıtları bu depoda yoktur** (`public/ses/` git dışında tutulur, yaklaşık 42 MB). Dosyalar olmadan da uygulama çalışır: her ders tarayıcının yerleşik sesiyle (`speechSynthesis`) okunur; kalite ve mevcut Türkçe sesler tarayıcına ve işletim sistemine bağlıdır.

Kayıtları kendin üretmek için:

```
NODE_OPTIONS=--dns-result-order=ipv4first EVREN_API_KEY=<anahtarın> node tools/tts-uret.mjs public/ses --tek --capa <ders id ...>
node tools/ses-liste.mjs          # public/ses/liste.json'u yeniden yaz
```

- `tools/tts-uret.mjs` Evren voxcpm2 metinden sese hizmetini kullanır: kendi API anahtarın olmalı ve hizmetin kullanım koşullarına uymalısın. Anahtar yalnızca `EVREN_API_KEY` ortam değişkeninden okunur; hiçbir dosyaya yazma, commit'leme.
- `--dns-result-order=ipv4first` her istekte 10 sn'lik bağlantı zaman aşımını önler.
- Okunuş düzeltmeleri (İngilizce kelimeler, HIGH/LOW, ...) `tools/tts-okunus.mjs` içindedir; düzenledikten sonra ilgili dersleri yeniden üret.
- Aynı girdi ve parametre aynı sesi verir. `liste.json`'da olmayan dersler tarayıcı sesiyle okunur; yani yalnızca bazı dersleri üretebilirsin.

Ayrıntılar için [DEVELOPMENT.md](DEVELOPMENT.md).

## Masaüstü (Windows, Electron)

`electron/` derlenmiş uygulamayı sarar (`npm run electron:dir` açılmış klasör, `npm run electron:pack` kurulum ve taşınabilir exe; çıktı `release/`). Exe'ler imzasızdır, bu yüzden Windows SmartScreen ilk çalıştırmada uyarı gösterir. Ayrıntılar: [electron/README.md](electron/README.md). Hazır derlemeler varsa depoda değil, GitHub Releases'te yer alır.

## Mobil (Capacitor)

Web derlemesi Capacitor ile Android uygulamasına sarılır (`com.deneyap.atolye`, ayar: `capacitor.config.json`, webDir `dist`). Web koduna dokunmak gerekmez.

```
npm install
npm run cap:sync       # npm run build + cap sync (dist/ -> android/)
npm run cap:android    # aynısı + projeyi Android Studio'da açar
npm run cap:apk        # aynısı + gradlew assembleDebug
node tools/apk-derle.mjs [debug|release]   # JDK'yı kendisi ayarlayan derleme betiği (aşağıya bak)
```

- Gereksinimler: Android Studio (veya komut satırı SDK, platform 36), JDK 21 ya da üstü (Capacitor 8; Android Studio'nun JBR'si yeterli), Gradle'ı wrapper indirir (internet gerekir).
- `tools/apk-derle.mjs` web derlemesini ve `cap sync`'i çalıştırır, sonra Gradle'ı Android Studio JBR'si `JAVA_HOME` olacak şekilde çalıştırır (`APK_JAVA_HOME` ile değiştirilir; sistemdeki `JAVA_HOME` yok sayılır, eski bir JDK derlemeyi bozmaz) ve en sonda `apksigner` ile imzayı doğrular. Wrapper'ın indiremediği makinelerde `~/.gradle` içindeki önbellekli bir Gradle'ı kullanır.
- Release imzası: kendi anahtar deponu üret (`keytool -genkeypair ...`), depo dışında tut ve `node tools/apk-derle.mjs release` çalıştırmadan önce `KS_PASS` (isteğe bağlı `KS_FILE`, `KS_ALIAS`) ortam değişkenlerini ayarla. Anahtar deposuyla ilgili hiçbir şey repoda tutulmaz, `*.jks`/`*.keystore` git dışındadır.
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (anlatımsız yaklaşık 17 MB; üretirsen `public/ses` mp3'leri ~42 MB ekler).
- `android/`, `npx cap add android` ile üretilir; git'e girerse kendi `.gitignore`'u kalsın (`build/`, `local.properties`, `app/src/main/assets/public` hariç tutulur); `android/**/build` commit'lenmez.
- iOS (yalnız macOS): `npm i @capacitor/ios && npx cap add ios && npx cap sync ios && npx cap open ios`, sonra Xcode'da derle.

## Lisans

Kod [MIT Lisansı](LICENSE) ile yayımlanır. Deneyap adı ve Deneyap Kart tasarımı ilgili sahiplerine (T3 Vakfı / TÜBİTAK) aittir; bu, resmi olmayan bir eğitim projesidir ve onlarla bağlantılı değildir. 3B model bu depoda yoktur, özgün lisansıyla kalır (yukarıya bak).
