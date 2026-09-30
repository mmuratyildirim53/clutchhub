const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

(async () => {
  const executablePath = process.env.CLUTCHUB_DESKTOP_EXE || path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
  const desktop = await electron.launch({
    executablePath,
    args: process.env.CLUTCHUB_DESKTOP_EXE ? [] : [path.join(__dirname, '..')],
    env: { ...process.env, CLUTCHUB_E2E: '1' },
    timeout: 60000,
  });
  try {
    const page = await desktop.firstWindow();
    const site = process.env.CLUTCHUB_TEST_SITE || 'https://clutchhub.net';
    await page.waitForURL(url => url.origin === site && url.pathname === '/tr/room/great-hall' && url.searchParams.get('desktop') === '1', { timeout: 60000 });
    await page.getByLabel('Nick', { exact: true }).fill('Windows Test');
    await page.getByRole('button', { name: 'Sunucuya bağlan' }).click();
    await page.getByRole('heading', { name: 'Bir nick seç' }).waitFor({ state: 'hidden' });
    await page.goto(`${site}/tr/room/afk-room?desktop=1`);
    await page.getByRole('button', { name: 'Ses odasına katıl', exact: true }).click();
    await page.getByRole('button', { name: 'Basılı tutarak konuş', exact: true }).waitFor({ timeout: 40000 });
    await page.locator('[data-participant]').filter({ hasText: 'Windows Test' }).first().waitFor();
    const listDisplay = await page.locator('[data-participant]').first().evaluate(element =>
      getComputedStyle(element.parentElement).display);
    assert.equal(listDisplay, 'flex', 'Voice client must show a compact member list');
    await page.screenshot({ path: path.join(__dirname, '..', 'output', 'desktop-preview.png') });
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].blur());
    const keyboard = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'press-key.ps1')], { windowsHide: true });
    try {
      await page.getByRole('button', { name: 'Basılı tutarak konuş', exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('[aria-label="Basılı tutarak konuş"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
      await page.waitForFunction(() => document.querySelector('[aria-label="Basılı tutarak konuş"]')?.getAttribute('aria-pressed') === 'false', null, { timeout: 5000 });
    } finally {
      if (keyboard.exitCode === null) keyboard.kill();
    }
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
    const hiddenKeyboard = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'press-key.ps1')], { windowsHide: true });
    try {
      await page.waitForFunction(() => document.querySelector('[aria-label="Basılı tutarak konuş"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
      await page.waitForFunction(() => document.querySelector('[aria-label="Basılı tutarak konuş"]')?.getAttribute('aria-pressed') === 'false', null, { timeout: 5000 });
    } finally {
      if (hiddenKeyboard.exitCode === null) hiddenKeyboard.kill();
    }
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
    await page.getByRole('button', { name: 'Odadan ayrıl', exact: true }).click();
    console.log('PASS: Electron loads Clutchub, joins live room, applies desktop layout, receives PTT down/up while unfocused and hidden, and leaves');
  } finally {
    await desktop.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
