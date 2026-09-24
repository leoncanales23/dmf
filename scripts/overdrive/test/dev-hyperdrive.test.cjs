'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;

const root = path.resolve(__dirname, '..', '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'scripts', 'dev-hyperdrive.cjs'), 'utf8');

assert.equal(pkg.scripts['dev:hyperdrive'], 'node scripts/dev-hyperdrive.cjs');
assert.equal(pkg.scripts['build:hyperdrive'], 'node scripts/dev-hyperdrive.cjs --build-only');
assert.equal(pkg.scripts['dev:hyperdrive:once'], 'node scripts/dev-hyperdrive.cjs --no-watch');

[
  'scripts/check-3d.cjs',
  'scripts/verify-3d-checksum.cjs',
  'scripts/build-3d.cjs',
  'scripts/inject-codex.cjs',
  'scripts/inject-oracle.cjs',
  'scripts/inject-transmission.cjs',
  'scripts/inject-compute-uplink.cjs',
  'scripts/inject-training-state.cjs',
  'scripts/inject-academy-link.cjs',
  'scripts/inject-academy-env.cjs'
].forEach((step) => assert.ok(script.includes(step), 'missing canonical build step: ' + step));

assert.ok(script.includes('dmf-signal-chrome.glb'));
assert.ok(script.includes('dmf-studio-optimized.glb'));
assert.ok(script.includes('DMF_RELIC_01.3mf'));
assert.ok(script.includes('?dmfdebug=1'));
assert.ok(script.includes('window.__DMF_PERF__'));
assert.ok(script.includes('Web Preview'));
assert.ok(!/MP_ACCESS_TOKEN\s*=|DMF_FIREBASE_PRIVATE_KEY\s*=|MP_WEBHOOK_SECRET\s*=/.test(script));

console.log('PASS: npm run dev:hyperdrive is wired');
console.log('PASS: canonical build and asset staging are included');
console.log('PASS: localhost debug instrumentation is surfaced');
console.log('PASS: dev orchestrator contains no embedded payment or Firebase secrets');
