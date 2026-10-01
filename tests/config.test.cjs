const assert = require('node:assert/strict');
const test = require('node:test');
const { siteOrigin } = require('../src/config.cjs');

test('packaged client always uses the production HTTPS origin', () => {
  assert.equal(siteOrigin({ isPackaged: true, env: {
    CLUTCHUB_DEV: '1', CLUTCHUB_DEV_SITE_URL: 'http://localhost:3000',
    CLUTCHUB_E2E: '1', CLUTCHUB_TEST_SITE: 'http://127.0.0.1:3000',
  } }), 'https://clutchhub.net');
});

test('development mode uses localhost and rejects a remote override', () => {
  assert.equal(siteOrigin({ isPackaged: false, env: { CLUTCHUB_DEV: '1' } }), 'http://localhost:3000');
  assert.throws(() => siteOrigin({ isPackaged: false, env: {
    CLUTCHUB_DEV: '1', CLUTCHUB_DEV_SITE_URL: 'https://example.com',
  } }));
});

test('ordinary start and E2E mode retain their existing origins', () => {
  assert.equal(siteOrigin({ isPackaged: false, env: {} }), 'https://clutchhub.net');
  assert.equal(siteOrigin({ isPackaged: false, env: {
    CLUTCHUB_E2E: '1', CLUTCHUB_TEST_SITE: 'http://127.0.0.1:3100',
  } }), 'http://127.0.0.1:3100');
});
