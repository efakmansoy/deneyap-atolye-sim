// Deneyap Atölye - Electron ana süreci. dist/ klasörünü özel app:// şemasıyla sunar (file:// yok).
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const HOST = 'deneyap';
const ORIGIN = `app://${HOST}`;
const DIST = path.join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

function istekCoz(request) {
  const url = new URL(request.url);
  if (url.host !== HOST) return new Response('Yasak', { status: 403 });
  let yol = decodeURIComponent(url.pathname);
  if (yol === '/' || yol === '') yol = '/index.html';
  const tam = path.normalize(path.join(DIST, yol));
  if (tam !== DIST && !tam.startsWith(DIST + path.sep)) return new Response('Yasak', { status: 403 });
  if (!fs.existsSync(tam) || !fs.statSync(tam).isFile()) return new Response('Bulunamadı', { status: 404 });
  // net.fetch Range başlığını iletir (mp3 ileri/geri sarma için gerekli)
  return net.fetch(pathToFileURL(tam).toString(), { headers: request.headers });
}

function disAc(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') shell.openExternal(url);
  } catch { /* yok say */ }
}

function pencereAc() {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 360, minHeight: 480,
    title: 'Deneyap Atölye',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      autoplayPolicy: 'user-gesture-required',
    },
  });
  win.on('page-title-updated', (e) => e.preventDefault()); // başlık hep "Deneyap Atölye"
  win.webContents.setWindowOpenHandler(({ url }) => { disAc(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN + '/')) { e.preventDefault(); disAc(url); }
  });
  win.loadURL(`${ORIGIN}/index.html`);
}

// Tek kopya
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(() => {
    protocol.handle('app', istekCoz);
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Görünüm', submenu: [
        { role: 'reload', label: 'Yenile' }, { role: 'togglefullscreen', label: 'Tam ekran' },
        { role: 'zoomIn', label: 'Yakınlaştır' }, { role: 'zoomOut', label: 'Uzaklaştır' }, { role: 'resetZoom', label: 'Yakınlaştırmayı sıfırla' },
      ] },
      { label: 'Çık', submenu: [{ role: 'quit', label: 'Çıkış' }] },
    ]));
    pencereAc();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) pencereAc(); });
  });
  app.on('window-all-closed', () => app.quit());
}
