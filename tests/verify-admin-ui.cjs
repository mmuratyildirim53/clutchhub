const { _electron: electron } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const site = process.env.CLUTCHUB_TEST_SITE;
  const password = process.env.CLUTCHUB_TEST_ADMIN_PASSWORD;
  if (!site || !password) throw new Error('Test site and admin password are required');
  const app = await electron.launch({
    executablePath: path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: [path.join(__dirname, '..')],
    env: { ...process.env, CLUTCHUB_E2E: '1' },
    timeout: 60000,
  });
  try {
    const page = await app.firstWindow();
    await page.waitForURL(`${site}/tr/room/great-hall`, { timeout: 60000 });
    await page.getByLabel('Nick', { exact: true }).fill('Laz');
    await page.getByLabel('Yönetici şifresi').fill(password);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
    await page.screenshot({ path: path.join(__dirname, '..', 'output', 'nick-preview.png') });
    await page.getByRole('button', { name: 'Sunucuya bağlan' }).click();
    await page.getByRole('heading', { name: 'Bir nick seç' }).waitFor({ state: 'hidden' });
    const button = page.getByRole('button', { name: 'Yönetim paneli' });
    await button.waitFor();
    await button.click();
    await page.getByRole('heading', { name: 'Yönetim paneli' }).waitFor();
    await page.screenshot({ path: path.join(__dirname, '..', 'output', 'admin-preview.png') });
    const status = await page.evaluate(async () => (await fetch('/desktop/session')).json());
    assert.equal(status.admin, true);
    console.log('PASS: Laz login opens authenticated admin panel');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
