const PRODUCTION_SITE = 'https://clutchhub.net';
const DEVELOPMENT_SITE = 'http://localhost:3000';

function siteOrigin({ isPackaged, env }) {
  if (isPackaged) return PRODUCTION_SITE;
  if (env.CLUTCHUB_E2E === '1' && env.CLUTCHUB_TEST_SITE) {
    return new URL(env.CLUTCHUB_TEST_SITE).origin;
  }
  if (env.CLUTCHUB_DEV === '1') {
    const url = new URL(env.CLUTCHUB_DEV_SITE_URL || DEVELOPMENT_SITE);
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
      throw new Error('Development site must be a local HTTP origin.');
    }
    return url.origin;
  }
  return PRODUCTION_SITE;
}

module.exports = { siteOrigin };
