// End-to-end tests of the real Worker router against a simulated HTTP world: Firebase Auth, Google OAuth,
// Firestore REST (with updateTime / exists preconditions) and the Klap API. Nothing here reads source text.
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { route, defaultDeps } from '../src/index.js';

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + (e && e.stack || e)); failed++; }
}

const CATALOG = {
  starter: { title: 'DMF Academy — Starter', amount: 150000, currency: 'CLP' },
  pro: { title: 'DMF Academy — Pro', amount: 290000, currency: 'CLP' },
  elite: { title: 'DMF Academy — Elite', amount: null, currency: 'CLP' }
};
const ORIGIN = 'https://dmf.vibraalto.cl';
const KEYS = { sandbox: 'sandbox-key-0001', production: 'production-key-0002' };

// A real RSA key so the service-account JWT path runs exactly as in production.
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
const SERVICE_ACCOUNT = JSON.stringify({ client_email: 'worker@dmf.iam', private_key: '-----BEGIN PRIVATE KEY-----\n' + pkcs8.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n' });

function envFor(environment, extra = {}) {
  const env = {
    KLAP_ENVIRONMENT: environment,
    KLAP_API_BASE: 'https://klap.test/api',
    KLAP_WEBHOOK_BASE: 'https://hooks.test',
    DMF_FIREBASE_PROJECT_ID: 'dmf-academy',
    DMF_FIREBASE_WEB_API_KEY: 'web-key',
    DMF_FIREBASE_PRIVATE_KEY: SERVICE_ACCOUNT,
    ...extra
  };
  env[environment === 'sandbox' ? 'KLAP_API_KEY_SANDBOX' : 'KLAP_API_KEY_PRODUCTION'] = KEYS[environment];
  return env;
}

function world() {
  const docs = new Map();
  let clock = 0;
  const w = {
    docs,
    klapOrders: new Map(),
    klapCreates: [],
    remoteFails: false,
    klapCreateStatus: 200,
    failEnrollmentWrites: 0,
    enrollmentWrites: 0,
    fulfilledTransitions: 0,
    latency: 0,
    async fetch(url, init = {}) {
      // Simulated network latency so concurrent requests genuinely interleave their reads and writes.
      if (w.latency) await new Promise((r) => setTimeout(r, w.latency));
      const u = new URL(url);
      const method = init.method || 'GET';
      const reply = (status, body) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (u.host === 'identitytoolkit.googleapis.com') {
        const token = JSON.parse(init.body).idToken;
        const users = { 'tok-alice': { localId: 'alice', email: 'alice@example.cl' }, 'tok-bob': { localId: 'bob', email: 'bob@example.cl' } };
        return users[token] ? reply(200, { users: [users[token]] }) : reply(400, { error: 'INVALID_ID_TOKEN' });
      }
      if (u.host === 'oauth2.googleapis.com') return reply(200, { access_token: 'sa-token' });
      if (u.host === 'firestore.googleapis.com') {
        const key = decodeURIComponent(u.pathname.split('/documents/')[1]);
        const doc = docs.get(key);
        if (method === 'GET') return doc ? reply(200, { fields: doc.fields, updateTime: doc.updateTime }) : reply(404, {});
        if (key.startsWith('enrollments/')) {
          w.enrollmentWrites++;
          if (w.failEnrollmentWrites > 0) { w.failEnrollmentWrites--; return reply(503, {}); }
        }
        if (u.searchParams.get('currentDocument.exists') === 'false' && doc) return reply(409, { error: { status: 'ALREADY_EXISTS' } });
        const pre = u.searchParams.get('currentDocument.updateTime');
        if (pre && (!doc || doc.updateTime !== pre)) return reply(400, { error: { status: 'FAILED_PRECONDITION' } });
        const fields = JSON.parse(init.body).fields;
        if (key.startsWith('orders/') && fields.status && fields.status.stringValue === 'fulfilled') w.fulfilledTransitions++;
        const next = { fields: { ...(doc ? doc.fields : {}), ...fields }, updateTime: 't' + (++clock) };
        docs.set(key, next);
        return reply(200, next);
      }
      if (u.host === 'klap.test') {
        const env = init.headers && init.headers.Apikey;
        if (!Object.values(KEYS).includes(env)) return reply(401, { error: 'bad key' });
        if (method === 'POST' && u.pathname === '/api/orders') {
          if (w.klapCreateStatus !== 200) return reply(w.klapCreateStatus, { error: 'down' });
          const body = JSON.parse(init.body);
          const orderId = 'KO-' + (w.klapCreates.length + 1);
          w.klapCreates.push({ body, apikey: env });
          w.klapOrders.set(orderId, { order_id: orderId, reference_id: body.reference_id, status: 'pending', amount: { ...body.amount } });
          return reply(200, { order_id: orderId, redirect_url: 'https://pay.klap.test/' + orderId });
        }
        if (method === 'GET' && u.pathname.startsWith('/api/orders/')) {
          if (w.remoteFails) return reply(503, {});
          const o = w.klapOrders.get(decodeURIComponent(u.pathname.slice('/api/orders/'.length)));
          return o ? reply(200, o) : reply(404, {});
        }
      }
      throw new Error('unexpected fetch ' + method + ' ' + url);
    },
    order(ref) {
      const d = docs.get('orders/' + ref);
      if (!d) return null;
      const out = {};
      for (const [k, v] of Object.entries(d.fields)) out[k] = Object.values(v)[0];
      return out;
    },
    enrollment(uid) {
      const d = docs.get('enrollments/' + uid);
      return d ? Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, Object.values(v)[0]])) : null;
    }
  };
  let n = 0;
  w.deps = { ...defaultDeps(), fetch: (...a) => w.fetch(...a), catalog: CATALOG, uuid: () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'), now: () => new Date(1790000000000 + clock * 60000) };
  return w;
}

async function call(w, env, method, path, { token, body, headers = {}, origin = ORIGIN } = {}) {
  const h = new Headers(headers);
  if (origin) h.set('Origin', origin);
  if (token) h.set('Authorization', 'Bearer ' + token);
  if (body !== undefined) h.set('Content-Type', 'application/json');
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const res = await route(new Request('https://worker.test' + path, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) }), env, ctx, w.deps);
  const background = await Promise.all(pending);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, background };
}

async function createOrder(w, env, productId = 'pro', token = 'tok-alice', extra = {}) {
  return call(w, env, 'POST', '/create-order', { token, body: { productId, ...extra } });
}

function sign(ref, orderId, key) {
  return createHash('sha256').update(ref + orderId + key).digest('hex');
}

async function webhook(w, env, kind, ref, orderId, key, opts = {}) {
  return call(w, env, 'POST', '/webhook/klap/' + kind, { origin: null, body: { reference_id: ref, order_id: orderId, ...(opts.extra || {}) }, headers: opts.noHeader ? {} : { Apikey: opts.apikey || sign(ref, orderId, key) } });
}

const SB = envFor('sandbox');
const PROD = envFor('production');

await test('create order: amount from the server catalog, reference stored before checkout, safe response', async () => {
  const w = world();
  const r = await createOrder(w, SB, 'pro');
  assert.equal(r.status, 200);
  assert.equal(r.body.provider, 'klap');
  assert.match(r.body.purchaseId, /^dmf-[0-9a-f]{32}$/);
  assert.equal(r.body.checkoutConfig.orderId, 'KO-1');
  assert.equal(r.body.checkoutUrl, 'https://pay.klap.test/KO-1');
  assert.equal(r.body.paymentEnvironment, 'sandbox');
  assert.ok(!JSON.stringify(r.body).includes(KEYS.sandbox), 'no ApiKey in the response');
  const o = w.order(r.body.purchaseId);
  assert.equal(o.status, 'pending');
  assert.equal(o.expectedAmount, '290000');
  assert.equal(o.currency, 'CLP');
  assert.equal(o.uid, 'alice');
  assert.equal(o.environment, 'sandbox');
  assert.equal(o.klapOrderId, 'KO-1');
  assert.equal(w.klapCreates[0].apikey, KEYS.sandbox, 'sandbox Worker uses the sandbox key');
  assert.deepEqual(w.klapCreates[0].body.amount, { currency: 'CLP', total: 290000 });
});

await test('price tampering: amount/price/currency sent by the browser are ignored', async () => {
  const w = world();
  const r = await createOrder(w, SB, 'starter', 'tok-alice', { amount: 1, price: 1, total: 1, currency: 'USD', expectedAmount: 1 });
  assert.equal(r.status, 200);
  assert.deepEqual(w.klapCreates[0].body.amount, { currency: 'CLP', total: 150000 });
  assert.equal(w.order(r.body.purchaseId).expectedAmount, '150000');
});

await test('invalid product, product without CLP price, missing auth, bad JSON, foreign origin', async () => {
  const w = world();
  let r = await createOrder(w, SB, 'platinum');
  assert.equal(r.status, 400); assert.equal(r.body.error, 'unknown-product');
  r = await createOrder(w, SB, 'elite');
  assert.equal(r.status, 400); assert.equal(r.body.error, 'product-not-available'); assert.equal(r.body.fallback, true);
  r = await createOrder(w, SB, 'pro', 'tok-forged');
  assert.equal(r.status, 401);
  r = await call(w, SB, 'POST', '/create-order', { token: 'tok-alice', body: '{nope' });
  assert.equal(r.status, 400);
  r = await call(w, SB, 'POST', '/create-order', { token: 'tok-alice', body: { productId: 'pro' }, origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  assert.equal(w.klapCreates.length, 0, 'Klap was never called');
});

await test('environment isolation: missing base, foreign key or wrong environment answer 503 with fallback', async () => {
  const w = world();
  for (const env of [
    envFor('sandbox', { KLAP_API_BASE: '' }),
    envFor('sandbox', { KLAP_API_KEY_PRODUCTION: KEYS.production }),
    envFor('production', { KLAP_API_KEY_SANDBOX: KEYS.sandbox }),
    { ...SB, KLAP_ENVIRONMENT: 'prod' }
  ]) {
    const r = await createOrder(w, env);
    assert.equal(r.status, 503); assert.equal(r.body.error, 'klap-not-configured'); assert.equal(r.body.fallback, true);
  }
  const health = await call(w, envFor('sandbox', { KLAP_API_KEY_PRODUCTION: KEYS.production }), 'GET', '/health');
  assert.equal(health.body.configured, false);
  assert.ok(!JSON.stringify(health.body).includes('key'), 'health exposes no credential');
  assert.equal(w.klapCreates.length, 0);
});

await test('Klap unavailable: 502 with fallback, order marked error, never pending', async () => {
  const w = world();
  w.klapCreateStatus = 500;
  const r = await createOrder(w, SB);
  assert.equal(r.status, 502); assert.equal(r.body.error, 'provider-unavailable'); assert.equal(r.body.fallback, true);
  const ref = [...w.docs.keys()].find((k) => k.startsWith('orders/')).slice(7);
  assert.equal(w.order(ref).status, 'error');
});

await test('approved flow: authenticated confirm webhook → 200 at once → verified against Klap → enrollment', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'completed';
  const r = await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, received: true });
  assert.equal(r.background[0].outcome, 'fulfilled');
  assert.equal(w.order(body.purchaseId).status, 'fulfilled');
  const e = w.enrollment('alice');
  assert.equal(e.status, 'active'); assert.equal(e.productId, 'pro'); assert.equal(e.provider, 'klap'); assert.equal(e.purchaseId, body.purchaseId);
  const s = await call(w, SB, 'GET', '/check-status?purchaseId=' + body.purchaseId, { token: 'tok-alice' });
  assert.deepEqual(s.body, { ok: true, provider: 'klap', status: 'approved', enrolled: true, productId: 'pro' });
});

await test('invalid webhook authentication: 401, nothing changes', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'completed';
  for (const opts of [{ apikey: sign(body.purchaseId, 'KO-1', KEYS.production) }, { apikey: KEYS.sandbox }, { noHeader: true }, { apikey: sign(body.purchaseId, 'KO-2', KEYS.sandbox) }]) {
    const r = await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox, opts);
    assert.equal(r.status, 401);
  }
  const bad = await call(w, SB, 'POST', '/webhook/klap/confirm', { origin: null, body: 'not json', headers: { Apikey: 'x' } });
  assert.equal(bad.status, 400);
  assert.equal(w.order(body.purchaseId).status, 'pending');
  assert.equal(w.enrollment('alice'), null);
});

await test('webhook for a different order_id than the one stored is refused', async () => {
  const w = world();
  const a = await createOrder(w, SB, 'pro');
  await createOrder(w, SB, 'starter', 'tok-bob');
  w.klapOrders.get('KO-2').status = 'completed';
  // Correctly signed by Klap, but pairs alice's reference with bob's Klap order.
  const r = await webhook(w, SB, 'confirm', a.body.purchaseId, 'KO-2', KEYS.sandbox);
  assert.equal(r.status, 200);
  assert.equal(r.background[0].outcome, 'order-mismatch');
  assert.equal(w.enrollment('alice'), null);
});

await test('amount mismatch and reference mismatch at Klap: no enrollment', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  Object.assign(w.klapOrders.get('KO-1'), { status: 'completed', amount: { total: 1000, currency: 'CLP' } });
  let r = await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.background[0].outcome, 'amount-mismatch');
  assert.equal(w.order(body.purchaseId).lastError, 'amount-mismatch');
  Object.assign(w.klapOrders.get('KO-1'), { amount: { total: 290000, currency: 'CLP' }, reference_id: 'dmf-ffffffffffffffffffffffffffffffff' });
  r = await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.background[0].outcome, 'reference-mismatch');
  assert.equal(w.enrollment('alice'), null);
  assert.notEqual(w.order(body.purchaseId).status, 'fulfilled');
});

await test('environment mismatch: a sandbox order can never be fulfilled by the production Worker', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'completed';
  const r = await webhook(w, PROD, 'confirm', body.purchaseId, 'KO-1', KEYS.production);
  assert.equal(r.status, 200);
  assert.equal(r.background[0].outcome, 'environment-mismatch');
  assert.equal(w.enrollment('alice'), null);
  const s = await call(w, PROD, 'GET', '/check-status?purchaseId=' + body.purchaseId, { token: 'tok-alice' });
  assert.equal(s.status, 409);
});

await test('duplicate webhooks: fulfilment happens exactly once', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'completed';
  await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  const writes = w.enrollmentWrites;
  const again = await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(again.status, 200);
  assert.equal(again.background[0].outcome, 'duplicate');
  assert.equal(w.enrollmentWrites, writes, 'no second enrollment write');
  assert.equal(w.fulfilledTransitions, 1);
});

await test('concurrent webhooks: the compare-and-set lets only one reach fulfilled', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'completed';
  w.latency = 3;
  const results = await Promise.all([1, 2, 3].map(() => webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox)));
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(w.fulfilledTransitions, 1);
  assert.equal(w.order(body.purchaseId).status, 'fulfilled');
  assert.equal(results.filter((r) => r.background[0].outcome === 'fulfilled').length, 1);
});

await test('concurrent retries on an already-approved order still fulfil exactly once', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'completed';
  w.failEnrollmentWrites = 1;
  await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(w.order(body.purchaseId).status, 'approved');
  w.latency = 3;
  const results = await Promise.all([1, 2, 3].map(() => webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox)));
  assert.equal(results.filter((r) => r.background[0].outcome === 'fulfilled').length, 1);
  assert.equal(w.fulfilledTransitions, 1);
});

await test('rejected flow: reject webhook closes the order; status says rejected, not enrolled', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'rejected';
  const r = await webhook(w, SB, 'reject', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.status, 200);
  assert.equal(w.order(body.purchaseId).status, 'rejected');
  const s = await call(w, SB, 'GET', '/check-status?purchaseId=' + body.purchaseId, { token: 'tok-alice' });
  assert.equal(s.body.status, 'rejected'); assert.equal(s.body.enrolled, false);
  // An authenticated rejection is still honoured when Klap's API is briefly unreachable.
  const w2 = world();
  const o2 = await createOrder(w2, SB, 'pro');
  w2.remoteFails = true;
  await webhook(w2, SB, 'reject', o2.body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(w2.order(o2.body.purchaseId).status, 'rejected');
});

await test('late rejection after a payment and unknown remote states never undo or grant access', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'mystery';
  let r = await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.background[0].outcome, 'pending');
  assert.equal(w.enrollment('alice'), null);
  w.klapOrders.get('KO-1').status = 'completed';
  await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  w.klapOrders.get('KO-1').status = 'rejected';
  r = await webhook(w, SB, 'reject', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.background[0].outcome, 'duplicate');
  assert.equal(w.order(body.purchaseId).status, 'fulfilled');
});

await test('refund: a refunded order is recorded and never fulfilled', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'refund';
  const r = await webhook(w, SB, 'reject', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.background[0].outcome, 'refunded');
  assert.equal(w.order(body.purchaseId).status, 'refunded');
  assert.equal(w.enrollment('alice'), null);
  const s = await call(w, SB, 'GET', '/check-status?purchaseId=' + body.purchaseId, { token: 'tok-alice' });
  assert.equal(s.body.status, 'refunded');
});

await test('reconciliation: a webhook whose background fulfilment failed is completed by status polling', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  w.klapOrders.get('KO-1').status = 'completed';
  w.failEnrollmentWrites = 1;
  const r = await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
  assert.equal(r.status, 200, 'Klap still gets its 2xx');
  assert.equal(r.background[0].outcome, 'error');
  assert.equal(w.order(body.purchaseId).status, 'approved');
  assert.equal(w.enrollment('alice'), null);
  const s = await call(w, SB, 'GET', '/check-status?purchaseId=' + body.purchaseId, { token: 'tok-alice' });
  assert.equal(s.body.enrolled, true);
  assert.equal(w.enrollment('alice').status, 'active');
  assert.equal(w.fulfilledTransitions, 1);
});

await test('check-status: owner only, validated id, never grants from the query string', async () => {
  const w = world();
  const { body } = await createOrder(w, SB, 'pro');
  let s = await call(w, SB, 'GET', '/check-status?purchaseId=' + body.purchaseId, { token: 'tok-bob' });
  assert.equal(s.status, 403);
  s = await call(w, SB, 'GET', '/check-status?purchaseId=' + body.purchaseId + '&status=approved&enrolled=true', { token: 'tok-alice' });
  assert.equal(s.body.enrolled, false); assert.equal(s.body.status, 'pending');
  s = await call(w, SB, 'GET', '/check-status?purchaseId=../../enrollments/alice', { token: 'tok-alice' });
  assert.equal(s.status, 400);
  s = await call(w, SB, 'GET', '/check-status?purchaseId=' + body.purchaseId);
  assert.equal(s.status, 401);
});

await test('logs never contain the ApiKey, webhook hashes, ID tokens or emails', async () => {
  const w = world();
  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    const { body } = await createOrder(w, SB, 'pro');
    w.klapOrders.get('KO-1').status = 'completed';
    await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox);
    await webhook(w, SB, 'confirm', body.purchaseId, 'KO-1', KEYS.sandbox, { apikey: 'deadbeef' });
  } finally { console.log = orig; }
  const all = lines.join('\n');
  assert.ok(lines.length >= 3 && lines.every((l) => l.startsWith('[KLAP]')));
  for (const secret of [KEYS.sandbox, 'tok-alice', 'alice@example.cl', 'deadbeef']) assert.ok(!all.includes(secret), 'leaked ' + secret);
  assert.ok(!/[0-9a-f]{64}/.test(all), 'no full hashes');
  assert.ok(/provider=klap environment=sandbox referenceId=dmf-/.test(all));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
