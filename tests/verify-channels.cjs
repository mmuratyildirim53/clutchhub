const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const site = 'https://clutchhub.net';
const password = process.env.CLUTCHUB_TEST_ADMIN_PASSWORD;
if (!password) throw new Error('CLUTCHUB_TEST_ADMIN_PASSWORD is required');

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'clutchub-role-test-'));
  const app = await electron.launch({
    executablePath: path.join(__dirname, '..', 'dist', 'win-unpacked', 'ClutchHub.exe'),
    env: { ...process.env, CLUTCHUB_E2E: '1', APPDATA: profile, LOCALAPPDATA: profile },
    timeout: 60000,
  });
  let identity, headers;
  try {
    const page = await app.firstWindow();
    await page.waitForURL(`${site}/tr/room/great-hall`, { timeout: 60000 });
    await page.getByLabel('Nick', { exact: true }).fill('Role Test');
    await page.getByRole('button', { name: 'Sunucuya bağlan' }).click();
    await page.getByRole('heading', { name: 'Bir nick seç' }).waitFor({ state: 'hidden' });
    identity = await page.evaluate(() => localStorage.getItem('clutchub.desktopIdentity'));
    await page.goto(`${site}/tr/room/afk-room`);
    await page.getByRole('button', { name: 'Ses odasına katıl' }).click();
    await page.getByRole('button', { name: 'Basılı tutarak konuş' }).waitFor({ timeout: 40000 });

    const guestAction = (action, name, id) => page.evaluate(async input => {
      const response = await fetch('/desktop/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      return { status: response.status, body: await response.json() };
    }, { action, name, id });
    assert.equal((await guestAction('add', 'Yetkisiz Kanal')).status, 403);

    const login = await fetch(`${site}/desktop/session`, { method: 'POST', headers: { origin: site, 'content-type': 'application/json' }, body: JSON.stringify({ nick: 'Laz', password }) });
    assert.equal(login.status, 200);
    headers = { origin: site, cookie: login.headers.get('set-cookie').split(';')[0], 'content-type': 'application/json' };
    const grant = async permissions => {
      const response = await fetch(`${site}/desktop/admin`, { method: 'POST', headers, body: JSON.stringify({ room: 'afk-room', identity, action: 'set-permissions', permissions }) });
      assert.equal(response.status, 200, await response.text());
    };
    await grant(['channels']);
    const added = await guestAction('add', 'Geçici Yetki Testi');
    assert.equal(added.status, 200, JSON.stringify(added.body));
    const channel = added.body.channels.find(item => item.name === 'Geçici Yetki Testi');
    assert.ok(channel);
    assert.equal((await guestAction('rename', 'Yetkili Test Kanalı', channel.id)).status, 200);
    const route = await fetch(`${site}/tr/room/${channel.id}`);
    assert.equal(route.status, 200);
    await grant([]);
    assert.equal((await guestAction('rename', 'Yetkisiz Değişiklik', channel.id)).status, 403);
    console.log(`PASS: guest denied, admin grants channel permission, delegated user adds/renames ${channel.id}, revoked permission denied`);
  } finally {
    if (identity && headers) await fetch(`${site}/desktop/admin`, { method: 'POST', headers, body: JSON.stringify({ room: 'afk-room', identity, action: 'set-permissions', permissions: [] }) }).catch(() => {});
    await app.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
