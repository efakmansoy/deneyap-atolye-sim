// Android APK derler: node tools/apk-derle.mjs [debug|release]   (varsayılan release, imzalı)
// release için KS_PASS ortam değişkeni şart (KS_FILE, KS_ALIAS isteğe bağlı); parola hiçbir dosyaya yazılmaz.
// npm run cap:apk bu makinede çalışmaz (JDK 17 + wrapper indirmesi); burada önbellekteki Gradle ve Android Studio JBR kullanılır.
import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const tur = process.argv[2] === 'debug' ? 'debug' : 'release', kok = path.resolve(import.meta.dirname, '..'), home = os.homedir();
if (tur === 'release' && !process.env.KS_PASS) { console.error('KS_PASS ortam değişkeni yok (anahtar deposu parolası)'); process.exit(1); }
const jbr = process.env.APK_JAVA_HOME || 'C:/Program Files/Android/Android Studio/jbr'; // sistem JAVA_HOME (JDK 17) kullanılmaz
const gdir = path.join(home, '.gradle/wrapper/dists/gradle-9.5.0-bin'), gsurum = fs.readdirSync(gdir).find(d => fs.existsSync(path.join(gdir, d, 'gradle-9.5.0')));
const gradle = path.join(gdir, gsurum, 'gradle-9.5.0/bin/gradle.bat');
const env = { ...process.env, JAVA_HOME: jbr, ANDROID_HOME: process.env.ANDROID_HOME || path.join(home, 'AppData/Local/Android/Sdk') };
const run = (c, a, cwd) => spawnSync(c, a, { cwd, env, stdio: 'inherit', shell: true });
let r = run('npm', ['run', 'cap:sync'], kok); if (r.status) process.exit(r.status);
const proxy = process.env.HTTPS_PROXY || 'http://127.0.0.1:10809', [ph, pp] = new URL(proxy).host.split(':');
r = run(`"${gradle}"`, [tur === 'release' ? 'assembleRelease' : 'assembleDebug', `-Dhttps.proxyHost=${ph}`, `-Dhttps.proxyPort=${pp}`], path.join(kok, 'android')); if (r.status) process.exit(r.status);
const apk = path.join(kok, 'android/app/build/outputs/apk', tur, tur === 'release' ? 'app-release.apk' : 'app-debug.apk');
console.log('APK:', apk, (fs.statSync(apk).size / 1e6).toFixed(1) + ' MB');
const bt = path.join(env.ANDROID_HOME, 'build-tools'), son = fs.readdirSync(bt).sort().pop();
run(`"${path.join(bt, son, 'apksigner.bat')}"`, ['verify', '--verbose', '--print-certs', `"${apk}"`], kok);
