'use strict';

// The production monitor against fake HTTP: a healthy production passes; each real failure mode is caught at
// the right level; requests are read-only; the scheduled workflow is wired as documented.
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const M = require(path.join(ROOT, 'scripts/monitor/prod-smoke.cjs'));
const WF = fs.readFileSync(path.join(ROOT, '.github/workflows/monitor.yml'), 'utf8');

let passed = 0;
let failed = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

const B = 'https://dmf.vibraalto.cl';
const D = M.DEFAULTS;
const ENV = 'window.__DMF_STREAM_SIGNER_URL__ = "' + D.signer + '";\nwindow.__DMF_PAYMENTS_URL__ = "' + D.payments + '";\n' +
  'window.__DMF_STREAM_BASE__ = "https://customer-x.cloudflarestream.com";\nwindow.__DMF_FIREBASE_CONFIG__ = {"apiKey":"k"};\n' +
  'window.__DMF_COMMERCE__ = {"payments":{"provider":"mercadopago","klapEnabled":false}};';
function healthy() {
  const page = (title) => '<html><title>' + title + '</title>' + M.SUPPORT_MAIL + '</html>';
  const legal = (h1) => '<h1>' + h1 + '</h1><a href="' + M.SUPPORT_MAIL + '">';
  return {
    [B + '/']: { body: 'DMF RELIC RUNTIME DMF HYPERRESONANCE id="tiersGrid" buyWithMP /commerce/payment-router.js ' + M.STARTER_PRICE + ' ' + M.SUPPORT_MAIL },
    [B + '/commerce/payment-router.js']: { body: 'root.DMFCommerce = api' },
    [B + '/commerce/analytics.js']: { body: 'root.dmfTrack = track' },
    [B + '/assets/models/dmf-studio-web.glb']: { headers: { 'content-length': '2900000' } },
    [B + '/assets/models/dmf-studio-optimized.glb']: { headers: { 'content-length': '8000000' } },
    [B + '/assets/images/dmf-relic-poster.webp']: { headers: { 'content-length': '85000' } },
    [B + '/login']: { body: page('DMF Academy — Acceso estudiantes') },
    [B + '/academy']: { body: page('DMF Academy — Portal del estudiante') },
    [B + '/payment-result']: { body: page('DMF Academy — Resultado del pago') },
    [B + '/academy-env.js']: { body: ENV },
    [B + '/academy-config.js']: { body: "streamUid: '9bb8ec71e5f2cf3054979e77b65c1bba', streamUid: '50498c021ed78bf0913f4cac9fca9abf'" },
    [D.payments + '/health']: { origin: B, body: '{"ok":true,"service":"dmf-payments"}' },
    [D.klap + '/health']: { origin: B, body: '{"ok":true,"service":"dmf-klap-payments","configured":false}' },
    [D.signer + '/stream-token']: { origin: B, status: 401, body: '{"ok":false,"error":"Authentication required"}' },
    [B + '/terminos']: { body: legal('Términos y condiciones') },
    [B + '/privacidad']: { body: legal('Política de privacidad') },
    [B + '/reembolsos']: { body: legal('Política de reembolsos') },
    [B + '/robots.txt']: { body: 'User-agent: *' },
    [B + '/sitemap.xml']: { body: '<?xml version="1.0"?><urlset/>' }
  };
}
function fakeFetch(routes, calls) {
  return async (url, init) => {
    calls && calls.push({ url, method: (init && init.method) || 'GET', headers: (init && init.headers) || {} });
    const r = routes[url];
    if (r === 'hang') return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); }));
    if (!r) return { status: 200, text: async () => '<html><!-- SPA catch-all --></html>', headers: { get: () => null } };
    // Like the real Workers: a request without the landing's Origin is refused before any route runs.
    if (r.origin && ((init && init.headers) || {}).Origin !== r.origin) return { status: 403, text: async () => '{"ok":false,"error":"Origin not allowed"}', headers: { get: () => null } };
    const h = r.headers || {};
    return { status: r.status || 200, text: async () => r.body || '', headers: { get: (k) => h[k.toLowerCase()] || null } };
  };
}
async function run(mutate, opts) {
  const routes = healthy();
  if (mutate) mutate(routes);
  const calls = [];
  const checks = await M.runChecks(Object.assign({ timeoutMs: 200 }, opts || {}), fakeFetch(routes, calls));
  return { checks, calls, rep: M.report(checks, ''), byName: (n) => checks.find((c) => c.name === n) };
}

test('healthy production: no failure, no warning', async () => {
  const { rep } = await run();
  assert.deepEqual(rep.failed.map((c) => c.name), []);
  assert.deepEqual(rep.warned.map((c) => c.name), []);
  assert.ok(rep.head.includes('Todo OK'));
});

test('landing down or broken is critical', async () => {
  assert.ok((await run((r) => { r[B + '/'] = { status: 503, body: '' }; })).rep.failed.some((c) => c.name === 'Landing responde'));
  const noRuntime = await run((r) => { r[B + '/'].body = r[B + '/'].body.replace('DMF RELIC RUNTIME', ''); });
  assert.ok(noRuntime.rep.failed.some((c) => /runtime 3D/.test(c.name)));
});

test('Starter price drifting from the launch price is critical', async () => {
  const r = await run((x) => { x[B + '/'].body = x[B + '/'].body.replace(M.STARTER_PRICE, "tierStarterPrice:'$247'"); });
  assert.ok(r.rep.failed.some((c) => /Precio Starter/.test(c.name)));
});

test('payments, video signer and Academy config failures are critical', async () => {
  assert.ok((await run((r) => { r[D.payments + '/health'] = { status: 500 }; })).rep.failed.some((c) => /Mercado Pago/.test(c.name)));
  assert.ok((await run((r) => { r[D.signer + '/stream-token'] = { status: 200, body: '{"ok":true}' }; })).rep.failed.some((c) => /Stream signer/.test(c.name)), 'signer answering without a session is a failure');
  assert.ok((await run((r) => { r[D.signer + '/stream-token'] = 'hang'; })).byName('Firma de video (Stream signer) responde y exige sesión').detail.startsWith('timeout'));
  assert.ok((await run((r) => { r[B + '/academy-env.js'].body = r[B + '/academy-env.js'].body.replace(/window\.__DMF_STREAM_BASE__ =[^\n]*\n/, ''); })).rep.failed.some((c) => /STREAM_BASE/.test(c.name)));
  assert.ok((await run((r) => { r[B + '/academy-config.js'].body = ''; })).rep.failed.some((c) => /Clases publicadas/.test(c.name)));
});

test('Klap: a warning while inactive, critical once the landing sells through it', async () => {
  const inactive = await run((r) => { r[D.klap + '/health'] = { status: 503 }; });
  assert.ok(inactive.rep.warned.some((c) => /Klap/.test(c.name)) && !inactive.rep.failed.some((c) => /Klap/.test(c.name)));
  const active = await run((r) => { r[B + '/academy-env.js'].body = ENV.replace('"provider":"mercadopago","klapEnabled":false', '"provider":"klap","klapEnabled":true'); });
  assert.ok(active.rep.failed.some((c) => /Klap/.test(c.name)), 'active Klap must be configured');
});

test('legal pages and SEO files missing (SPA catch-all) are warnings, never a red run', async () => {
  const r = await run((x) => { delete x[B + '/terminos']; delete x[B + '/robots.txt']; });
  assert.ok(r.rep.warned.some((c) => c.name === 'Página /terminos') && r.rep.warned.some((c) => c.name === '/robots.txt'));
  assert.equal(r.rep.failed.length, 0);
});

test('read-only: GET/HEAD only, plus one unauthenticated POST to the signer', async () => {
  const { calls } = await run();
  const writes = calls.filter((c) => c.method !== 'GET' && c.method !== 'HEAD');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].url, D.signer + '/stream-token');
  assert.ok(!Object.keys(writes[0].headers).some((h) => /authorization/i.test(h)), 'never authenticated');
  assert.ok(!/fetch\([^)]*(create-preference|create-order|webhook)/.test(fs.readFileSync(path.join(ROOT, 'scripts/monitor/prod-smoke.cjs'), 'utf8')), 'never touches checkout or webhooks');
});

test('Worker requests carry the landing Origin (the Workers refuse any other with 403)', async () => {
  const { calls, rep } = await run();
  const workerCalls = calls.filter((c) => c.url.startsWith(D.payments) || c.url.startsWith(D.klap) || c.url.startsWith(D.signer));
  assert.equal(workerCalls.length, 3);
  for (const c of workerCalls) assert.equal(c.headers.Origin, B, c.url);
  assert.equal(rep.failed.length, 0);
});

test('--skip-workers runs the page checks only', async () => {
  const { calls } = await run(null, { skipWorkers: true });
  assert.ok(!calls.some((c) => c.url.startsWith(D.payments) || c.url.startsWith(D.klap) || c.url.startsWith(D.signer)));
});

test('workflow: every 3 hours + on demand, least privilege, issue on failure, closes on recovery', () => {
  assert.ok(/schedule:\s*\n\s*- cron: '17 \*\/3 \* \* \*'/.test(WF), 'every 3 h');
  assert.ok(WF.includes('workflow_dispatch:'));
  assert.ok(/permissions:\s*\n\s*contents: read\s*\n\s*issues: write/.test(WF));
  assert.ok(WF.includes('node scripts/monitor/prod-smoke.cjs --summary "$GITHUB_STEP_SUMMARY" --json monitor.json'));
  assert.ok(WF.includes('gh issue create') && WF.includes('gh issue comment') && WF.includes('gh issue close'));
  assert.ok(!/secrets\./.test(WF), 'needs no secrets');
});

test('registered in npm and CI', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:monitor'], 'node scripts/monitor/test/prod-smoke.test.cjs');
  assert.equal(pkg.scripts.monitor, 'node scripts/monitor/prod-smoke.cjs');
  const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/validate-3d.yml'), 'utf8');
  assert.ok(ci.includes('validate-monitor:') && ci.includes('node scripts/monitor/test/prod-smoke.test.cjs'), 'CI job');
  assert.ok(ci.includes("- 'scripts/monitor/**'"), 'CI runs when the monitor changes');
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); console.log('PASS: ' + name); passed++; }
    catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
  }
  console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
  if (failed > 0) process.exit(1);
})();
