const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const site = process.env.CLUTCHUB_TEST_SITE;
const adminPassword = process.env.CLUTCHUB_TEST_ADMIN_PASSWORD;
if (!site || !adminPassword) throw new Error('CLUTCHUB_TEST_SITE and CLUTCHUB_TEST_ADMIN_PASSWORD are required');

(async () => {
  const name = `Mod Test ${Date.now() % 100000}`;
  const app = await electron.launch({
    executablePath: path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: [path.join(__dirname, '..')],
    env: { ...process.env, CLUTCHUB_E2E: '1' },
    timeout: 60000,
  });
  try {
    const page = await app.firstWindow();
    await page.waitForURL(`${site}/tr/room/great-hall`, { timeout: 60000 });
    await page.getByLabel('Nick', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Sunucuya bağlan' }).click();
    await page.getByRole('heading', { name: 'Bir nick seç' }).waitFor({ state: 'hidden' });
    await page.goto(`${site}/tr/room/afk-room`);
    await page.getByRole('button', { name: 'Ses odasına katıl' }).click();
    await page.getByRole('button', { name: 'Basılı tutarak konuş' }).waitFor({ timeout: 40000 });

    const login = await fetch(`${site}/desktop/session`, {
      method: 'POST', headers: { origin: site, 'content-type': 'application/json' },
      body: JSON.stringify({ nick: 'Laz', password: adminPassword }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const headers = { origin: site, cookie, 'content-type': 'application/json' };
    const list = async () => {
      const response = await fetch(`${site}/desktop/admin?room=afk-room`, { headers });
      assert.equal(response.status, 200);
      return (await response.json()).participants;
    };
    let member;
    for (let i = 0; i < 12; i++) {
      member = (await list()).find(person => person.name === name);
      if (member) break;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    assert.ok(member, 'Joined participant must be visible to admin');

    await page.keyboard.down('v');
    await page.waitForFunction(() => document.querySelector('[aria-label="Basılı tutarak konuş"]')?.getAttribute('aria-pressed') === 'true');
    let unmuted = false;
    for (let i = 0; i < 12; i++) {
      unmuted = (await list()).find(person => person.identity === member.identity)?.muted === false;
      if (unmuted) break;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    assert.ok(unmuted, 'PTT must publish an active microphone');

    const mute = await fetch(`${site}/desktop/admin`, { method: 'POST', headers, body: JSON.stringify({ room: 'afk-room', identity: member.identity, action: 'mute' }) });
    assert.equal(mute.status, 200, await mute.text());
    assert.equal((await list()).find(person => person.identity === member.identity)?.muted, true);
    await page.keyboard.up('v');

    const kick = await fetch(`${site}/desktop/admin`, { method: 'POST', headers, body: JSON.stringify({ room: 'afk-room', identity: member.identity, action: 'kick' }) });
    assert.equal(kick.status, 200, await kick.text());
    await page.getByRole('button', { name: 'Ses odasına katıl' }).waitFor({ timeout: 15000 });
    console.log('PASS: admin lists, mutes and removes a real LiveKit participant');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
