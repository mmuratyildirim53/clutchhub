const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const electron = require('electron');
const child = spawn(electron, [root], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CLUTCHUB_DEV: '1' },
});

child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
