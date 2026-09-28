'use strict';

// VibraAlto Immersive Commerce frontend core: provider routing, response normalisation, Klap → Mercado Pago
// fallback, launch mode, analytics sanitising, and how the three pages and the landing are wired to it.
// Behavioural tests run the real files in Node; the wiring checks are content invariants.
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const R = require(path.join(ROOT, 'public/commerce/payment-router.js'));
const A = require(path.join(ROOT, 'public/commerce/analytics.js'));

let passed = 0;
let failed = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

const MP = 'https://dmf-payments.vibraalto-cl.workers.dev';
const MP_SB = 'https://dmf-payments-sandbox.vibraalto-cl.workers.dev';
const KLAP = 'https://dmf-klap-payments.vibraalto-cl.workers.dev';
const KLAP_SB = 'https://dmf-klap-payments-sandbox.vibraalto-cl.workers.dev';
const cfg = (payments) => R.readConfig({ __DMF_COMMERCE__: { payments: payments || {} } });

function fakeFetch(routes) {
  const calls = [];
  const fn = (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const r = routes[url];
    if (!r) return Promise.reject(new Error('offline'));
    return Promise.resolve({ ok: r.status < 400, status: r.status, json: () => (r.body === undefined ? Promise.reject(new Error('no json')) : Promise.resolve(r.body)) });
  };
  fn.calls = calls;
  return fn;
}

test('defaults keep production on Mercado Pago; unknown values cannot enable anything', () => {
  const c = R.readConfig({});
  assert.equal(c.payments.provider, 'mercadopago');
  assert.equal(c.payments.klapEnabled, false);
  assert.equal(c.payments.fallbackProvider, 'mercadopago');
  assert.equal(c.effects.audioReactive, true);
  const odd = cfg({ provider: 'KLAP', klapEnabled: 'true', klapFlexSdkUrl: 'javascript:alert(1)', klapUrl: 'http://insecure' });
  assert.equal(odd.payments.provider, 'mercadopago');
  assert.equal(odd.payments.klapEnabled, false);
  assert.equal(odd.payments.klapFlexSdkUrl, '');
  assert.equal(odd.payments.klapUrl, '');
});

test('provider selection: build flag + enable switch; ?provider=klap only inside sandbox', () => {
  assert.equal(R.selectProvider(cfg(), '', 'production'), 'mercadopago');
  assert.equal(R.selectProvider(cfg({ provider: 'klap' }), '', 'production'), 'mercadopago', 'provider alone is not enough');
  assert.equal(R.selectProvider(cfg({ provider: 'klap', klapEnabled: true }), '', 'production'), 'klap');
  assert.equal(R.selectProvider(cfg(), '?provider=klap', 'production'), 'mercadopago', 'a URL cannot switch production');
  assert.equal(R.selectProvider(cfg(), '?payments=sandbox&provider=klap', 'sandbox'), 'klap');
  assert.equal(R.environmentFrom('?payments=sandbox'), 'sandbox');
  assert.equal(R.environmentFrom('?payments=sandboxed'), 'production');
  assert.equal(R.environmentFrom(''), 'production');
});

test('endpoints: sandbox Workers are fixed; production honours configured https overrides', () => {
  assert.equal(R.endpoint(cfg(), 'mercadopago', 'sandbox'), MP_SB);
  assert.equal(R.endpoint(cfg(), 'klap', 'sandbox'), KLAP_SB);
  assert.equal(R.endpoint(cfg(), 'mercadopago', 'production'), MP);
  assert.equal(R.endpoint(cfg(), 'klap', 'production'), KLAP);
  assert.equal(R.endpoint(cfg({ klapUrl: 'https://k.example/' }), 'klap', 'production'), 'https://k.example');
  assert.equal(R.statusUrl(cfg(), 'klap', 'sandbox', 'dmf-a b'), KLAP_SB + '/check-status?purchaseId=dmf-a%20b');
  assert.equal(R.statusUrl(cfg(), 'evil', 'production', 'x'), MP + '/check-status?purchaseId=x');
});

test('normalised response: one shape for both providers; unsafe URLs never navigate', () => {
  assert.deepEqual(R.normalizeResponse('mercadopago', 'production', { ok: true, init_point: 'https://mp.example/pay', purchaseId: 'p1' }),
    { provider: 'mercadopago', purchaseId: 'p1', paymentEnvironment: 'production', checkoutUrl: 'https://mp.example/pay', checkoutConfig: null });
  assert.deepEqual(R.normalizeResponse('klap', 'sandbox', { ok: true, purchaseId: 'dmf-1', paymentEnvironment: 'sandbox', checkoutUrl: 'https://pay.klap/x', checkoutConfig: { orderId: 'KO-1' } }),
    { provider: 'klap', purchaseId: 'dmf-1', paymentEnvironment: 'sandbox', checkoutUrl: 'https://pay.klap/x', checkoutConfig: { provider: 'klap', orderId: 'KO-1' } });
  assert.throws(() => R.normalizeResponse('mercadopago', 'production', { ok: true, init_point: 'javascript:alert(1)' }), /no-checkout/);
  assert.throws(() => R.normalizeResponse('klap', 'production', { ok: true }), (e) => e.fallback === true);
  assert.throws(() => R.normalizeResponse('klap', 'production', { ok: false, error: 'klap-not-configured', fallback: true }), (e) => e.message === 'klap-not-configured' && e.fallback);
});

test('createCheckout sends only productId + ID token to the chosen Worker', async () => {
  const f = fakeFetch({ [KLAP_SB + '/create-order']: { status: 200, body: { ok: true, purchaseId: 'dmf-1', checkoutConfig: { orderId: 'KO-1' } } } });
  const r = await R.createCheckout('klap', 'pro', 'ID-TOKEN', { config: cfg(), environment: 'sandbox', fetch: f });
  assert.equal(r.provider, 'klap');
  assert.deepEqual(f.calls[0].body, { productId: 'pro' });
  assert.equal(f.calls[0].init.headers.Authorization, 'Bearer ID-TOKEN');
  await assert.rejects(R.createCheckout('stripe', 'pro', 't', { config: cfg(), fetch: f }), /unknown-provider/);
});

test('fallback: Klap unavailable → Mercado Pago; no fallback when disabled or when MP itself fails', async () => {
  const routes = {
    [KLAP + '/create-order']: { status: 503, body: { ok: false, error: 'klap-not-configured', fallback: true } },
    [MP + '/create-preference']: { status: 200, body: { ok: true, init_point: 'https://mp.example/pay', purchaseId: 'p9' } }
  };
  const on = cfg({ provider: 'klap', klapEnabled: true });
  let f = fakeFetch(routes);
  const r = await R.checkout('pro', 't', { config: on, search: '', fetch: f });
  assert.equal(r.provider, 'mercadopago');
  assert.deepEqual(f.calls.map((c) => c.url), [KLAP + '/create-order', MP + '/create-preference']);
  f = fakeFetch(routes);
  await assert.rejects(R.checkout('pro', 't', { config: cfg({ provider: 'klap', klapEnabled: true, fallbackProvider: 'none' }), search: '', fetch: f }), /klap-not-configured/);
  assert.equal(f.calls.length, 1);
  // A product/validation error is not a provider outage: no silent switch.
  f = fakeFetch({ [KLAP + '/create-order']: { status: 400, body: { ok: false, error: 'unknown-product', fallback: false } } });
  await assert.rejects(R.checkout('nope', 't', { config: on, search: '', fetch: f }), /unknown-product/);
  assert.equal(f.calls.length, 1);
  // Network failure towards Klap also falls back.
  f = fakeFetch({ [MP + '/create-preference']: routes[MP + '/create-preference'] });
  assert.equal((await R.checkout('pro', 't', { config: on, search: '', fetch: f })).provider, 'mercadopago');
});

test('launch: hosted redirect by default; Klap Flex only with a configured SDK', async () => {
  const went = [];
  const nav = (u) => went.push(u);
  assert.equal(await R.launch({ provider: 'mercadopago', checkoutUrl: 'https://mp.example/pay' }, { config: cfg(), navigate: nav }), 'redirect');
  assert.equal(await R.launch({ provider: 'klap', checkoutUrl: 'https://pay.klap/x', checkoutConfig: { orderId: 'KO-1' } }, { config: cfg(), navigate: nav }), 'redirect');
  assert.deepEqual(went, ['https://mp.example/pay', 'https://pay.klap/x']);
  await assert.rejects(R.launch({ provider: 'klap', checkoutUrl: null, checkoutConfig: null }, { config: cfg(), navigate: nav }), /no-checkout/);
});

test('analytics: whitelisted events and properties only; no personal or payment data survives', () => {
  const pushed = [];
  global.dataLayer = { push: (x) => pushed.push(x) };
  assert.equal(A.track('not_an_event', {}), false);
  assert.equal(A.track('checkout_started', { provider: 'klap', product: 'pro', email: 'a@b.cl', uid: 'u1', idToken: 'eyJ', orderId: 'KO-1', amount: 290000 }), true);
  assert.deepEqual(pushed[0], { provider: 'klap', product: 'pro', event: 'checkout_started' });
  A.track('placement_test_ignored');
  assert.deepEqual(A.sanitize({ placement: '<img onerror=x>' }), { placement: 'imgonerrorx' });
  assert.equal(A.track('landing_view', null, { once: true }), true);
  assert.equal(A.track('landing_view', null, { once: true }), false);
  for (const e of ['landing_view', 'hero_interaction', 'audio_enabled', '3d_loaded', 'academy_view', 'pricing_view', 'cta_click', 'checkout_started', 'checkout_provider', 'payment_approved', 'payment_rejected', 'conversion_complete'])
    assert.ok(A.EVENTS.includes(e), e);
  delete global.dataLayer;
});

test('landing: router + analytics loaded (versioned), legacy Mercado Pago path kept as fallback, funnel hooks', () => {
  const SRC = read('index.html');
  const OUT = read('public/index.html');
  for (const html of [SRC, OUT]) {
    assert.ok(html.includes('<script src="/commerce/analytics.js?v=1"></script>'));
    assert.ok(html.includes('<script src="/commerce/payment-router.js?v=1" defer></script>'));
    assert.ok(html.indexOf('/commerce/analytics.js') > html.indexOf('<script src="/academy-env.js"></script>'), 'config first');
  }
  const fn = SRC.slice(SRC.indexOf('window.buyWithMP = function(btn){'), SRC.indexOf("document.querySelectorAll('#navLinks a')"));
  assert.ok(fn.includes('commerce.checkout(productId, idToken, { environment: paymentEnvironment, provider: paymentProvider })'));
  assert.ok(fn.includes("fetch(PAYMENTS_URL + '/create-preference', {"), 'direct Mercado Pago still sells if the router did not load');
  assert.ok(fn.includes("sessionStorage.setItem('dmf_purchase_provider', paymentProvider);"));
  assert.ok(!/amount|price/i.test(fn.replace(/\/\/.*$/gm, '')), 'the browser never sends a price');
  assert.ok(SRC.includes('data-track-view="academy_view"') && SRC.includes('data-track-view="pricing_view"') && SRC.includes('data-track="cta_click" data-track-placement="hero"'));
  const bus = read('scripts/overdrive/signal-bus.js');
  assert.ok(bus.includes("if (fx && fx.audioReactive === false) return;") && bus.includes("window.dmfTrack('audio_enabled'"));
  const relic = read('scripts/overdrive/relic.js');
  assert.ok(relic.includes("window.dmfTrack('3d_loaded'"));
});

test('login and payment-result use the router for provider choice; access still decided by the server', () => {
  const login = read('public/login.html');
  assert.ok(login.includes('<script src="/commerce/payment-router.js?v=1"></script>'));
  assert.ok(login.includes("commerce.checkout(intent, idToken, { environment: purchaseEnvironment, provider: purchaseProvider })"));
  assert.ok(login.includes("sessionStorage.getItem('dmf_purchase_provider') === 'klap' ? 'klap' : 'mercadopago'"));
  assert.ok(login.includes("sessionStorage.removeItem('dmf_purchase_provider');"));
  const result = read('public/payment-result.html');
  assert.ok(result.includes("var paymentProvider = params.get('provider') === 'klap' ? 'klap' : 'mercadopago';"));
  assert.ok(result.includes("fetch(PAYMENTS_URL + '/check-status?purchaseId=' + encodeURIComponent(purchaseId), {"));
  assert.ok(result.includes("if (data.enrolled) {") && !/params\.get\('(status|enrolled|approved)'\)/.test(result));
  for (const s of ['approved', 'rejected', 'cancelled', 'refunded', 'pending', 'error']) assert.ok(result.includes("state === '" + s + "'"), s);
  assert.ok(result.includes('var MAX_WAIT_MS = 180000;') && result.includes('delay = Math.min(MAX_DELAY, Math.round(delay * 1.5));'), 'backoff');
});

test('build config: flags written to academy-env.js with safe defaults; deploy passes them through', () => {
  const inject = read('scripts/inject-academy-env.cjs');
  assert.ok(inject.includes("provider: process.env.DMF_PAYMENT_PROVIDER === 'klap' ? 'klap' : 'mercadopago'"));
  assert.ok(inject.includes("klapEnabled: process.env.DMF_KLAP_ENABLED === 'true'"));
  assert.ok(inject.includes("lines.push('window.__DMF_COMMERCE__ = ' + JSON.stringify(COMMERCE) + ';');"));
  const deploy = read('.github/workflows/deploy.yml');
  for (const v of ['DMF_PAYMENT_PROVIDER', 'DMF_KLAP_ENABLED', 'DMF_KLAP_FLEX_SDK_URL']) assert.ok(deploy.includes(v + ': ${{ vars.' + v + ' }}'), v);
  assert.ok(!/KLAP_API_KEY/.test(deploy + inject), 'no Klap credential goes near the frontend build');
});

test('no Klap or Mercado Pago secret anywhere in the frontend', () => {
  for (const f of ['public/index.html', 'public/login.html', 'public/academy.html', 'public/payment-result.html', 'public/commerce/payment-router.js', 'public/commerce/analytics.js'])
    assert.ok(!/KLAP_API_KEY|MP_ACCESS_TOKEN|APP_USR-|DMF_FIREBASE_PRIVATE_KEY|private_key/.test(read(f)), f);
});

test('registered in npm run test:hyperdrive and in CI', () => {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/commerce.test.cjs'));
  assert.ok(read('.github/workflows/validate-3d.yml').includes('node scripts/overdrive/test/commerce.test.cjs'));
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); console.log('PASS: ' + name); passed++; }
    catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
  }
  console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
  if (failed > 0) process.exit(1);
})();
