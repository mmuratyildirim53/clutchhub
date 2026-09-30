const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const site = process.env.CLUTCHUB_TEST_SITE || 'https://clutchhub.net';
const password = process.env.CLUTCHUB_TEST_ADMIN_PASSWORD;
if (!password) throw new Error('CLUTCHUB_TEST_ADMIN_PASSWORD is required');

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'clutchub-feature-test-'));
  const peerProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'clutchub-peer-test-'));
  const name = `Feature Test ${Date.now() % 100000}`;
  const app = await electron.launch({
    executablePath: path.join(__dirname, '..', 'dist', 'win-unpacked', 'ClutchHub.exe'),
    env: { ...process.env, CLUTCHUB_E2E: '1', APPDATA: profile, LOCALAPPDATA: profile },
    timeout: 60000,
  });
  let identity;
  let headers;
  let peerApp;
  try {
    const page = await app.firstWindow();
    await page.waitForURL(`${site}/tr/room/great-hall`, { timeout: 60000 });
    await page.getByLabel('Nick', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Sunucuya bağlan' }).click();
    await page.getByRole('heading', { name: 'Bir nick seç' }).waitFor({ state: 'hidden' });
    identity = await page.evaluate(() => localStorage.getItem('clutchub.desktopIdentity'));
    assert.ok(identity);
    assert.equal(await page.evaluate(() => localStorage.getItem('clutchub.lastNick')), name);

    await page.goto(`${site}/tr/room/afk-room`);
    let intercepted = false;
    await page.route('**/livekit-token', async route => {
      if (!intercepted) {
        intercepted = true;
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"temporary outage"}' });
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Ses odasına katıl' }).click();
    await page.getByRole('button', { name: 'Basılı tutarak konuş' }).waitFor({ timeout: 45000 });
    assert.equal(intercepted, true, 'first token request should fail for reconnect test');
    await page.unroute('**/livekit-token');

    peerApp = await electron.launch({
      executablePath: path.join(__dirname, '..', 'dist', 'win-unpacked', 'ClutchHub.exe'),
      env: { ...process.env, CLUTCHUB_E2E: '1', APPDATA: peerProfile, LOCALAPPDATA: peerProfile },
      timeout: 60000,
    });
    const peerPage = await peerApp.firstWindow();
    await peerPage.waitForURL(`${site}/tr/room/great-hall`, { timeout: 60000 });
    await peerPage.getByLabel('Nick', { exact: true }).fill('Volume Peer');
    await peerPage.getByRole('button', { name: 'Sunucuya bağlan' }).click();
    await peerPage.getByRole('heading', { name: 'Bir nick seç' }).waitFor({ state: 'hidden' });
    await peerPage.goto(`${site}/tr/room/afk-room`);
    await peerPage.getByRole('button', { name: 'Ses odasına katıl' }).click();
    await peerPage.getByRole('button', { name: 'Basılı tutarak konuş' }).waitFor({ timeout: 40000 });
    const volume = page.getByRole('slider', { name: 'Volume Peer ses seviyesi' });
    await volume.waitFor({ timeout: 15000 });
    await volume.fill('40');
    const peerIdentity = await peerPage.evaluate(() => localStorage.getItem('clutchub.desktopIdentity'));
    assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('clutchub.participantVolumes'))[id], peerIdentity), 40);
    await peerApp.close();
    peerApp = null;

    const login = await fetch(`${site}/desktop/session`, {
      method: 'POST', headers: { origin: site, 'content-type': 'application/json' },
      body: JSON.stringify({ nick: 'Laz', password }),
    });
    assert.equal(login.status, 200, await login.text());
    headers = { origin: site, cookie: login.headers.get('set-cookie').split(';')[0], 'content-type': 'application/json' };
    const list = async () => {
      const response = await fetch(`${site}/desktop/admin?room=afk-room`, { headers });
      if (response.status !== 200) throw new Error(`Admin list failed: ${response.status} ${await response.text()}`);
      return response.json();
    };
    const members = await list();
    assert.ok(members.participants.some(person => person.identity === identity));
    const act = async action => {
      const response = await fetch(`${site}/desktop/admin`, { method: 'POST', headers, body: JSON.stringify({ room: 'afk-room', identity, action }) });
      assert.equal(response.status, 200, await response.text());
    };
    await act('ban');
    assert.ok((await list()).bans.some(ban => ban.identity === identity));
    const token = async () => fetch(`${site}/v2/api/livekit-token`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomName: 'afk-room', identity, name, role: 'speaker' }),
    });
    assert.equal((await token()).status, 403);
    await act('unban');
    assert.ok(!(await list()).bans.some(ban => ban.identity === identity));
    assert.equal((await token()).status, 200);
    console.log('PASS: remembered nick, automatic reconnect, per-user volume, admin ban/unban and token enforcement');
  } finally {
    if (identity && headers) {
      await fetch(`${site}/desktop/admin`, { method: 'POST', headers, body: JSON.stringify({ room: 'afk-room', identity, action: 'unban' }) }).catch(() => {});
    }
    if (peerApp) await peerApp.close();
    await app.close();
    fs.rmSync(profile, { recursive: true, force: true });
    fs.rmSync(peerProfile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
