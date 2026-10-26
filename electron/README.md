# Electron sarmalayıcı

Web uygulaması (`dist/`) özel `app://deneyap/` şemasıyla sunulur (`protocol.handle`, Range destekli; file:// yok). `vite.config.js` değişmedi. contextIsolation açık, nodeIntegration kapalı, sandbox açık; dış bağlantılar varsayılan tarayıcıda açılır.

## Komutlar
- `npm run electron:dev` — build + `electron .`
- `npm run electron:pack` — build + `release/` altına NSIS kurulum ve portable .exe (x64)
- `npm run electron:dir` — yalnız `release/win-unpacked/`
- `node electron/ikon-uret.mjs` — index.html'deki marka SVG'sinden `electron/icon.png` üretir (electron-builder ICO'yu kendisi yapar)
- `node electron/smoke.mjs ["exe yolu"]` — uygulamayı `--remote-debugging-port=9333` ile açıp puppeteer-core ile doğrular

## Notlar
- `release/` ve electron-builder önbellekleri (`%LOCALAPPDATA%\electron-builder\Cache`, `electron\Cache`) sürüm denetimine alınmamalıdır.
- Build imzasızdır: Windows SmartScreen "bilinmeyen yayıncı" uyarısı verir (Daha fazla bilgi > Yine de çalıştır). `signAndEditExecutable:false` olduğundan .exe dosyasının gömülü simgesi varsayılan Electron simgesi olabilir; pencere simgesi marka ikonudur.
- Boyut: kurulum ~170 MB, portable ~158 MB (Chromium + ~42 MB ses).
