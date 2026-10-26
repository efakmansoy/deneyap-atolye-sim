# Deneyap Workshop (Deneyap Atölye)

A browser-based 3D lab and course for learning Arduino-style programming on the **Deneyap Kart 1A v2 (ESP32-S3)**. Students wire virtual parts on a breadboard, build programs with blocks or write C++, and watch the circuit react in real time.

Türkçe: [README.tr.md](README.tr.md)

## Features

- **47 lessons in 10 modules**: LEDs, buttons, analog and PWM, sound and motion, LCD projects, smart projects, nature and safety, a robot car, ESP32 basics, Wi-Fi and the web.
- **3D simulator** (three.js): the board, a breadboard with real hole positions, jumper wires and parts (LED, RGB LED, buzzer, servo, LCD, ultrasonic and PIR sensors, potentiometer, keypad, pump and more). Click or drag parts to interact.
- **Two ways to code, one simulator**: Blockly blocks and Arduino C++ (a built-in interpreter supports the Arduino/ESP32 APIs the lessons need, including Wi-Fi and a virtual web server with a phone panel).
- **Guided lessons**: explanation, step-by-step narration that types the code for you, graded tasks with hints, "edit the code" exercises and quizzes.
- **Progress and fun**: XP, levels, badges, streaks and local profiles (stored in the browser only).
- **Languages**: Turkish (default) and English. Use the **EN / TR** button in the header. Voice narration is Turkish only; its subtitles stay Turkish.

## Download

Ready-made builds are attached to the [latest release](../../releases/latest): a Windows installer and a portable exe, and an Android APK. They do not include the voice narration recordings (the app then reads lessons with the browser's built-in voice).

- Windows: the executables are not code-signed, so SmartScreen may warn on first run ("More info" → "Run anyway").
- Android: the APK is signed with the author's own key, not distributed through Google Play. Allow installing from unknown sources to install it.

## Getting started

Requirements: Node.js 20+.

```
npm install
npm run dev        # development server
npm run build      # production build in dist/
```

Open the printed local address. Add `?lang=en` to the URL (or press **EN**) for English.

## 3D board model

The 3D model of the Deneyap Kart is **not stored in this repository**. It comes from the official [deneyapkart/deneyapkart-arduino-core](https://github.com/deneyapkart/deneyapkart-arduino-core) repository (LGPL-2.1):

- STEP: [docs/3B Model (.step).STEP](https://github.com/deneyapkart/deneyapkart-arduino-core/blob/master/docs/3B%20Model%20(.step).STEP)
- STL: [DK_v2_3BModel(.stl).STL](https://github.com/deneyapkart/deneyapkart-arduino-core/blob/master/DK_v2_3BModel(.stl).STL)

The app loads `public/models/deneyap-1a-v2-renkli.glb`. To create it from the STEP file:

```
node tools/step2glb.mjs "3B Model (.step).STEP" public/models/deneyap-1a-v2-renkli.glb
```

Without that file the app still runs and draws a plain red board slab instead of the real model. A glb made from the upstream STEP has not been compared with the one used during development, so colors and simplification may differ slightly.

## Tests

All tests are plain Node scripts that exit non-zero on failure.

```
node tools/e2e/e2e.mjs           # end-to-end: real Chrome + built app, solves every lesson (needs Google Chrome)
node tools/test-m7.mjs           # one module's suite (test-m2 ... test-m10, test-cpp, test-araba, test-esp32, ...)
node tools/test-parts-m7.mjs     # part contracts (no WebGL needed)
node tools/test-yerlesim.mjs     # no overlapping parts / nothing off the breadboard in any scene
```

The end-to-end test can also run in English: `node tools/e2e/e2e.mjs --en`.

Screenshot helpers for visual checks: `tools/ekran-gez.mjs`, `tools/ekran-sayfa.mjs`, `tools/ekran-sekme.mjs` (headless Chrome via puppeteer-core).

## Project layout

```
src/main.js            app wiring (UI, tabs, run/stop, progress)
src/sim.js             pin state shared by parts and the running program
src/cpp.js, cppcalistir.js   Blockly -> C++ and the C++ interpreter
src/scene.js, breadboard.js  3D scene, breadboard, jumper wires
src/parts/             one file per virtual part
src/lessons/m*.js      lessons; src/lessons/icerik/*.js adds narration and "edit the code" tasks
src/anlatici.js, tts.js      narration player (pre-recorded mp3 in public/ses)
src/i18n.js, src/i18n/en.js  language layer and English dictionary
tools/                 tests, screenshot tools, TTS and translation tooling
```

## Language support (how it works)

Source files keep their Turkish text. At build time a Vite plugin (`tools/i18n/eklenti.mjs`) wraps every Turkish string that has an English entry in `src/i18n/en.js`, so the same lesson code serves both languages. In English mode, strings without an entry simply stay Turkish.

The dictionary is generated from `tools/i18n/ceviri/en-*.txt` (`@@<id>` followed by the translation):

```
node tools/i18n/cikar.mjs        # scan src/ for translatable strings
node tools/i18n/parcala.mjs      # split them into source chunks
node tools/i18n/birlestir.mjs    # merge en-*.txt into src/i18n/en.js (checks placeholders and HTML tags)
```

Narration (`ses` fields) is deliberately excluded, as are code identifiers and program output strings; only code comments are translated.

## Voice narration

Narration is Turkish speech played from pre-generated files: `public/ses/<lesson id>-<NN>.mp3` plus an index, `public/ses/liste.json`.

**The recordings are not part of this repository** (`public/ses/` is git-ignored, about 42 MB). Without them the app still works: every lesson is read aloud with the browser's built-in voice instead (`speechSynthesis`; quality and available Turkish voices depend on your browser and OS).

To generate the recordings yourself:

```
NODE_OPTIONS=--dns-result-order=ipv4first EVREN_API_KEY=<your key> node tools/tts-uret.mjs public/ses --tek --capa <lesson id ...>
node tools/ses-liste.mjs          # rewrite public/ses/liste.json
```

- `tools/tts-uret.mjs` uses the Evren voxcpm2 text-to-speech service, so you need your own API key and must follow that service's terms. The key is read only from the `EVREN_API_KEY` environment variable and must never be written to a file or committed.
- `--dns-result-order=ipv4first` avoids a 10 s connection timeout on every request.
- Pronunciation fixes (English words, HIGH/LOW, ...) live in `tools/tts-okunus.mjs`; regenerate the affected lessons after editing it.
- The same input and parameters give the same voice. Lessons missing from `liste.json` are read with the browser voice, so you can generate only some of them.

See [DEVELOPMENT.md](DEVELOPMENT.md) for details (Turkish).

## Desktop (Windows, Electron)

`electron/` wraps the built app (`npm run electron:dir` for an unpacked folder, `npm run electron:pack` for the installer and portable exe; output in `release/`). The executables are not signed, so Windows SmartScreen shows a warning on first run. Details in [electron/README.md](electron/README.md). Ready-made builds, if any, are attached to GitHub Releases rather than stored in the repository.

## Mobile (Capacitor)

The web build is wrapped as an Android app with Capacitor (`com.deneyap.atolye`, config: `capacitor.config.json`, webDir `dist`). No web code changes are needed.

```
npm install
npm run cap:sync       # npm run build + cap sync (copies dist/ into android/)
npm run cap:android    # same + opens the project in Android Studio
npm run cap:apk        # same + gradlew assembleDebug
node tools/apk-derle.mjs [debug|release]   # build script that sets the JDK itself (see below)
```

- Requirements: Android Studio (or command-line SDK with platform 36), JDK 21 or newer (Capacitor 8; Android Studio's bundled JBR works), Gradle is fetched by the wrapper (needs internet).
- `tools/apk-derle.mjs` runs the web build and `cap sync`, then Gradle with Android Studio's JBR as `JAVA_HOME` (override with `APK_JAVA_HOME`; the system `JAVA_HOME` is ignored, so an older JDK does not break the build), and finally checks the signature with `apksigner`. On machines where the Gradle wrapper cannot download, it uses a Gradle already cached in `~/.gradle`.
- Release signing: create your own keystore (`keytool -genkeypair ...`), keep it outside the repository and set `KS_PASS` (and optionally `KS_FILE`, `KS_ALIAS`) as environment variables before running `node tools/apk-derle.mjs release`. Nothing about the keystore is stored in the repo, and `*.jks`/`*.keystore` are git-ignored.
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (about 17 MB without narration; the `public/ses` mp3 files, if you generated them, add ~42 MB).
- `android/` is generated by `npx cap add android`; if it goes into git, keep its own `.gitignore` (ignores `build/`, `local.properties`, `app/src/main/assets/public`, `capacitor.config.json` copies) and do not commit `android/**/build`.
- iOS (macOS only): `npm i @capacitor/ios && npx cap add ios && npx cap sync ios && npx cap open ios`, then build in Xcode.

## License

The code is released under the [MIT License](LICENSE). The Deneyap name and the Deneyap Kart design belong to their respective owners (T3 Foundation / TÜBİTAK); this is an unofficial educational project and is not affiliated with them. The 3D model is not included here and keeps its original license (see above).
