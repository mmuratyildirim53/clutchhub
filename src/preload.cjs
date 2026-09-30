const { ipcRenderer } = require('electron');
localStorage.setItem('clutchub.desktop', '1');

const allowed = new Set([
  ...Array.from({ length: 26 }, (_, i) => `Key${String.fromCharCode(65 + i)}`),
  ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
  'Space',
]);

function selectedCode() {
  try {
    const bindings = JSON.parse(localStorage.getItem('talkraid.keybinds') || '[]');
    const ptt = Array.isArray(bindings) ? bindings.find((item) => item.id === 'ptt') : null;
    if (allowed.has(ptt?.code)) return ptt.code;
    if (/^[A-Z]$/.test(ptt?.keys || '')) return `Key${ptt.keys}`;
    if (/^[0-9]$/.test(ptt?.keys || '')) return `Digit${ptt.keys}`;
    if (ptt?.keys === 'Space' || ptt?.keys === 'Boşluk') return 'Space';
  } catch { /* Use the default binding if saved settings are unavailable. */ }
  return 'KeyV';
}

ipcRenderer.on('clutchub:global-key', (_event, data) => {
  if (!data || !allowed.has(data.code) || data.code !== selectedCode()) return;
  const key = data.code === 'Space' ? ' ' : data.code.replace(/^(Key|Digit)/, '').toLowerCase();
  window.dispatchEvent(new KeyboardEvent(data.down ? 'keydown' : 'keyup', {
    bubbles: true,
    cancelable: true,
    code: data.code,
    key,
    ctrlKey: Boolean(data.ctrl),
    altKey: Boolean(data.alt),
    shiftKey: Boolean(data.shift),
    metaKey: Boolean(data.meta),
  }));
});
