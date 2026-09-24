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

// Runtime: the launcher must serve the generated public/ build (what Firebase
// Hosting deploys), never the repository root or the unbuilt source page.
assert.ok(!script.includes("'server.js'"), 'launcher must not spawn server.js (it serves the repo root first)');

const os = require('os');
const http = require('http');
const { createDevServer, resolveRequest } = require(path.join(root, 'scripts', 'dev-hyperdrive.cjs'));

function get(port, url, method) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method: method || 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function listen(dir) {
  return new Promise((resolve) => {
    const srv = createDevServer(dir);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const pub = path.join(root, 'public');
  const srv = await listen(pub);
  const port = srv.address().port;
  try {
    for (const url of ['/', '/?dmfdebug=1', '/index.html', '/some/deep/link']) {
      const r = await get(port, url);
      assert.equal(r.status, 200, url);
      assert.ok(r.headers['content-type'].startsWith('text/html'), url);
      assert.ok(r.body.includes('function DMFSignalEngine('), url + ' must serve the built page with the Hyperdrive engine');
      assert.ok(r.body.includes('function initScene('), url + ' must include the relic runtime');
    }
    console.log('PASS: / serves the generated Hyperdrive build (Firebase Hosting parity)');

    const login = await get(port, '/login');
    assert.equal(login.body, fs.readFileSync(path.join(pub, 'login.html'), 'utf8'));
    const lesson = await get(port, '/academy/module-1/lesson-2');
    assert.equal(lesson.body, fs.readFileSync(path.join(pub, 'academy.html'), 'utf8'));
    const result = await get(port, '/payment-result?status=approved');
    assert.equal(result.body, fs.readFileSync(path.join(pub, 'payment-result.html'), 'utf8'));
    console.log('PASS: firebase.json rewrites (/login, /academy/**, /payment-result) are mirrored');

    const glb = await get(port, '/assets/models/dmf-studio-optimized.glb', 'HEAD');
    if (fs.existsSync(path.join(pub, 'assets', 'models', 'dmf-studio-optimized.glb'))) {
      assert.equal(glb.status, 200);
      assert.equal(glb.headers['content-type'], 'model/gltf-binary');
    }
    const page = await get(port, '/');
    assert.equal(page.headers['cache-control'], 'no-store', 'rebuilds must show on a plain reload');
    assert.equal((await get(port, '/', 'POST')).status, 405);
    assert.equal((await get(port, '/api/dmf/training')).status, 404);

    for (const url of ['/server.js', '/package.json', '/workers/dmf-payments/wrangler.toml', '/../server.js', '/%2e%2e/server.js', '/..%2fserver.js']) {
      const r = await get(port, url);
      assert.ok(!r.body.includes('MercadoPagoConfig') && !r.body.includes('"dependencies"') && !r.body.includes('[env.'), url + ' leaked repository files');
    }
    console.log('PASS: repository root is never served');
  } finally {
    srv.close();
  }

  // Traversal and dotfiles against a synthetic tree.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dmf-dev-'));
  const site = path.join(tmp, 'site');
  fs.mkdirSync(site);
  fs.writeFileSync(path.join(site, 'index.html'), 'INDEX');
  fs.writeFileSync(path.join(site, '.env'), 'DOTFILE');
  fs.writeFileSync(path.join(tmp, 'outside.txt'), 'OUTSIDE');
  fs.writeFileSync(path.join(tmp, 'site-evil.txt'), 'SIBLING');
  try {
    for (const url of ['/.env', '/%2e%2e/outside.txt', '/..%2foutside.txt', '/%2e%2e%2fsite-evil.txt', '/..\\outside.txt']) {
      const file = resolveRequest(site, url);
      assert.equal(file, path.join(site, 'index.html'), url + ' escaped the public dir: ' + file);
    }
    assert.equal(resolveRequest(site, '/%E0%A4%A'), null, 'malformed URLs are rejected');
    console.log('PASS: traversal, encoded traversal and dotfiles stay inside public/');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error('FAIL: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
