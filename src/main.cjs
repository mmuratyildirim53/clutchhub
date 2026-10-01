const { app, BrowserWindow, Menu, Tray, nativeImage, session, shell } = require('electron');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const { siteOrigin } = require('./config.cjs');

const SITE = siteOrigin({ isPackaged: app.isPackaged, env: process.env });
// The query flag is deliberate: it makes the premium desktop shell independent
// of renderer storage and keeps the ordinary browser page unchanged.
const SITE_URL = `${SITE}/tr/room/great-hall?desktop=1`;
const allowedKeys = new Set([
  ...Array.from({ length: 26 }, (_, i) => `Key${String.fromCharCode(65 + i)}`),
  ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
  'Space',
]);
let window = null;
let tray = null;
let keyProcess = null;
let quitting = false;
let keyReady = false;

app.setAppUserModelId('net.clutchub.desktop');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
if (process.env.CLUTCHUB_E2E === '1') {
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
  app.commandLine.appendSwitch('use-fake-device-for-media-stream');
}

function secureOrigin(url) {
  try { return new URL(url).origin === SITE; } catch { return false; }
}

function showWindow() {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

function createWindow() {
  window = new BrowserWindow({
    title: 'ClutchHub',
    width: 1180,
    height: 720,
    minWidth: 760,
    minHeight: 530,
    backgroundColor: '#11161c',
    icon: path.join(__dirname, '..', 'assets', 'clutchub.ico'),
    show: process.env.CLUTCHUB_E2E !== '1',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  window.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    window.hide();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (secureOrigin(url)) window.loadURL(url);
    else if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!secureOrigin(url)) event.preventDefault();
  });
  window.loadURL(SITE_URL);
}

function helperPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'keys', 'Clutchub.Keys.exe')
    : path.join(__dirname, '..', 'native', 'Keys', 'bin', 'Release', 'net9.0-windows', 'win-x64', 'publish', 'Clutchub.Keys.exe');
}

function startKeyHelper() {
  const executable = helperPath();
  if (!fs.existsSync(executable)) { console.error('Keyboard helper missing:', executable); return; }
  keyProcess = spawn(executable, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  createInterface({ input: keyProcess.stdout }).on('line', (line) => {
    if (line === 'READY') { keyReady = true; tray?.setToolTip('ClutchHub — bas-konuş hazır'); return; }
    if (!keyReady || !window || window.isDestroyed() || window.isFocused()) return;
    let event;
    try { event = JSON.parse(line); } catch { return; }
    if (!allowedKeys.has(event.code) || typeof event.down !== 'boolean') return;
    window.webContents.send('clutchub:global-key', event);
  });
  keyProcess.stderr.on('data', (chunk) => console.error('Keyboard helper:', String(chunk).trim()));
  keyProcess.on('error', (error) => console.error('Keyboard helper:', error));
  keyProcess.on('exit', () => {
    keyReady = false;
    keyProcess = null;
    if (!quitting) {
      tray?.setToolTip('ClutchHub — bas-konuş yeniden bağlanıyor');
      setTimeout(startKeyHelper, 1500);
    }
  });
}

function createTray() {
  const image = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'clutchub.ico'));
  tray = new Tray(image);
  tray.setToolTip('ClutchHub');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'ClutchHub\u2019ı aç', click: showWindow },
    { label: 'Çıkış', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('double-click', showWindow);
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const origin = details.requestingUrl || contents.getURL();
    callback(secureOrigin(origin) && (permission === 'media' || permission === 'clipboard-sanitized-write'));
  });
  session.defaultSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) =>
    secureOrigin(requestingOrigin) && (permission === 'media' || permission === 'clipboard-sanitized-write'));
  createWindow();
  createTray();
  startKeyHelper();
});

app.on('activate', showWindow);
app.on('before-quit', () => {
  quitting = true;
  if (keyProcess && !keyProcess.killed) {
    keyProcess.stdin.end('QUIT\n');
    keyProcess.kill();
  }
});
app.on('window-all-closed', () => { if (quitting) app.quit(); });
