// Pure Klap logic: environment isolation, order body, webhook authentication, status normalisation,
// fulfilment validation and the order state machine.
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import * as K from '../src/klap.js';
import { PRODUCTS, resolveProduct } from '../src/catalog.js';

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}

const BASE = { KLAP_API_BASE: 'https://klap.example', KLAP_WEBHOOK_BASE: 'https://hooks.example' };

await test('environment: each Worker reads only its own key and refuses the other one', () => {
  const sb = K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'sandbox', KLAP_API_KEY_SANDBOX: 'sandbox-key-123' });
  assert.equal(sb.ok, true);
  assert.equal(sb.apiKey, 'sandbox-key-123');
  assert.equal(sb.environment, 'sandbox');
  const prod = K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'production', KLAP_API_KEY_PRODUCTION: 'prod-key-12345' });
  assert.equal(prod.apiKey, 'prod-key-12345');
  assert.deepEqual(K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'sandbox', KLAP_API_KEY_SANDBOX: 'sandbox-key-123', KLAP_API_KEY_PRODUCTION: 'prod-key-12345' }), { ok: false, error: 'foreign-credential' });
  assert.deepEqual(K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'production', KLAP_API_KEY_PRODUCTION: 'prod-key-12345', KLAP_API_KEY_SANDBOX: 'x-sandbox-key' }), { ok: false, error: 'foreign-credential' });
  assert.equal(K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'production', KLAP_API_KEY_SANDBOX: 'sandbox-key-123' }).error, 'foreign-credential');
  assert.equal(K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'production' }).error, 'missing-credential');
  assert.equal(K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'staging', KLAP_API_KEY_SANDBOX: 'sandbox-key-123' }).error, 'invalid-environment');
  assert.equal(K.resolveEnvironment({ KLAP_ENVIRONMENT: 'sandbox', KLAP_API_KEY_SANDBOX: 'sandbox-key-123', KLAP_WEBHOOK_BASE: 'https://h.example' }).error, 'missing-api-base');
  assert.equal(K.resolveEnvironment({ KLAP_ENVIRONMENT: 'sandbox', KLAP_API_KEY_SANDBOX: 'sandbox-key-123', KLAP_API_BASE: 'http://insecure.example', KLAP_WEBHOOK_BASE: 'https://h.example' }).error, 'missing-api-base');
});

await test('catalog: unknown products and products without a CLP amount are refused', () => {
  assert.equal(resolveProduct('platinum').error, 'unknown-product');
  assert.equal(resolveProduct('__proto__').error, 'unknown-product');
  assert.equal(resolveProduct(42).error, 'unknown-product');
  // Every product is sold in whole CLP: the USD list price at 1 USD ≈ 1.000 CLP, in retail form (…990).
  for (const id of Object.keys(PRODUCTS)) {
    const r = resolveProduct(id);
    assert.equal(r.ok, true, id + ' is sellable through Klap');
    assert.ok(Number.isInteger(r.product.amount) && r.product.currency === 'CLP', id + ' in whole CLP');
    assert.equal(r.product.amount, r.product.usd * 1000 - 10, id + ' = USD ' + r.product.usd + ' × 1.000 − 10');
  }
  assert.equal(PRODUCTS.starter.amount, 99990, 'Starter launch price: USD 100 ≈ $99.990');
  const cat = { starter: { title: 'S', amount: 150000, currency: 'CLP' }, bad: { title: 'B', amount: 99.5, currency: 'CLP' }, usd: { title: 'U', amount: 247, currency: 'USD' }, none: { title: 'N', amount: null, currency: 'CLP' } };
  assert.equal(resolveProduct('none', cat).error, 'product-not-available', 'no CLP amount → refused');
  assert.equal(resolveProduct('starter', cat).ok, true);
  assert.equal(resolveProduct('bad', cat).error, 'product-not-available');
  assert.equal(resolveProduct('usd', cat).error, 'product-not-available');
});

await test('order body: amount from the catalog, reference, return URL and both webhooks', () => {
  const cfg = K.resolveEnvironment({ ...BASE, KLAP_ENVIRONMENT: 'sandbox', KLAP_API_KEY_SANDBOX: 'sandbox-key-123' });
  const ref = K.newReferenceId('123e4567-e89b-12d3-a456-426614174000');
  assert.equal(ref, 'dmf-123e4567e89b12d3a456426614174000');
  assert.ok(K.isReferenceId(ref));
  const body = K.buildOrderRequest({ referenceId: ref, productId: 'pro', product: { title: 'DMF Academy — Pro', amount: 290000, currency: 'CLP' }, email: 'a@b.cl', cfg });
  assert.equal(body.reference_id, ref);
  assert.deepEqual(body.amount, { currency: 'CLP', total: 290000 });
  assert.equal(body.items[0].unit_price, 290000);
  assert.equal(body.webhooks.webhook_confirm, 'https://hooks.example/webhook/klap/confirm');
  assert.equal(body.webhooks.webhook_reject, 'https://hooks.example/webhook/klap/reject');
  assert.equal(body.urls.return_url, 'https://dmf.vibraalto.cl/payment-result?purchaseId=' + ref + '&provider=klap&paymentEnvironment=sandbox');
  assert.ok(!JSON.stringify(body).includes('sandbox-key-123'), 'the ApiKey never goes in the body');
});

await test('order response: order_id required, redirect only over https', () => {
  assert.deepEqual(K.parseOrderResponse({ order_id: 'KO-1', redirect_url: 'https://pay.example/x' }), { ok: true, orderId: 'KO-1', redirectUrl: 'https://pay.example/x' });
  assert.equal(K.parseOrderResponse({ order_id: 'KO-1', redirect_url: 'javascript:alert(1)' }).redirectUrl, null);
  assert.equal(K.parseOrderResponse({}).ok, false);
  assert.equal(K.parseOrderResponse({ order_id: 'bad id with spaces' }).ok, false);
  assert.equal(K.parseOrderResponse(null).ok, false);
});

await test('webhook auth: Apikey = sha256(reference_id + order_id + ApiKey), constant-time compare', async () => {
  const ref = 'dmf-0123456789abcdef0123456789abcdef';
  const expected = createHash('sha256').update(ref + 'KO-77' + 'secret-api-key').digest('hex');
  assert.equal(await K.expectedWebhookApiKey(ref, 'KO-77', 'secret-api-key'), expected);
  const body = { reference_id: ref, order_id: 'KO-77' };
  assert.deepEqual(await K.verifyWebhook({ Apikey: expected }, body, 'secret-api-key'), { ok: true, referenceId: ref, orderId: 'KO-77' });
  assert.equal((await K.verifyWebhook(new Headers({ apikey: expected.toUpperCase() }), body, 'secret-api-key')).ok, true, 'header name and hex case are not significant');
  assert.equal((await K.verifyWebhook({ Apikey: expected }, body, 'other-key')).reason, 'apikey-mismatch');
  assert.equal((await K.verifyWebhook({ Apikey: expected }, { ...body, order_id: 'KO-78' }, 'secret-api-key')).reason, 'apikey-mismatch');
  assert.equal((await K.verifyWebhook({}, body, 'secret-api-key')).reason, 'missing-apikey-header');
  assert.equal((await K.verifyWebhook({ Apikey: 'secret-api-key' }, body, 'secret-api-key')).reason, 'apikey-mismatch', 'the raw key is not accepted');
  assert.equal((await K.verifyWebhook({ Apikey: expected }, { order_id: 'KO-77' }, 'secret-api-key')).reason, 'invalid-reference');
  assert.equal(K.timingSafeEqual('abc', 'abc'), true);
  assert.equal(K.timingSafeEqual('abc', 'abd'), false);
  assert.equal(K.timingSafeEqual('abc', 'abcd'), false);
  assert.equal(K.timingSafeEqual('', ''), true);
});

await test('status normalisation: only explicit success is approved; unknown is never paid', () => {
  for (const s of ['completed', 'APPROVED', 'paid']) assert.equal(K.normalizeKlapStatus(s), 'approved', s);
  for (const s of ['rejected', 'failed']) assert.equal(K.normalizeKlapStatus(s), 'rejected', s);
  for (const s of ['cancelled', 'expired']) assert.equal(K.normalizeKlapStatus(s), 'cancelled', s);
  for (const s of ['refund', 'reversed']) assert.equal(K.normalizeKlapStatus(s), 'refunded', s);
  for (const s of ['', null, 'weird', 'approvedish']) assert.equal(K.normalizeKlapStatus(s), 'unknown', String(s));
  assert.equal(K.publicState('fulfilled'), 'approved');
  assert.equal(K.publicState('error'), 'rejected');
  assert.equal(K.publicState('whatever'), 'pending');
  for (const s of K.PUBLIC_STATES) assert.equal(K.publicState(s), s);
});

await test('fulfilment validation: reference, order, status, product, amount, currency, environment', () => {
  const catalog = { pro: { title: 'Pro', amount: 290000, currency: 'CLP' } };
  const order = { provider: 'klap', environment: 'sandbox', referenceId: 'dmf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', klapOrderId: 'KO-1', productId: 'pro', expectedAmount: 290000, currency: 'CLP' };
  const remote = { reference_id: order.referenceId, order_id: 'KO-1', status: 'completed', amount: { total: 290000, currency: 'CLP' } };
  assert.deepEqual(K.validateForFulfillment(order, remote, 'sandbox', catalog), { valid: true, reason: null });
  const why = (o, r, env = 'sandbox', c = catalog) => K.validateForFulfillment(o, r, env, c).reason;
  assert.equal(why(order, remote, 'production'), 'environment-mismatch');
  assert.equal(why({ ...order, provider: 'mercadopago' }, remote), 'provider-mismatch');
  assert.equal(why(order, null), 'remote-unavailable');
  assert.equal(why(order, { ...remote, reference_id: 'dmf-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }), 'reference-mismatch');
  assert.equal(why(order, { ...remote, order_id: 'KO-2' }), 'order-mismatch');
  assert.equal(why(order, { ...remote, status: 'pending' }), 'not-approved');
  assert.equal(why(order, { ...remote, amount: { total: 1000, currency: 'CLP' } }), 'amount-mismatch');
  assert.equal(why(order, { ...remote, amount: 290000 }), null, 'a flat amount field is accepted too');
  assert.equal(why(order, { ...remote, amount: { total: 290000, currency: 'USD' } }), 'currency-mismatch');
  assert.equal(why({ ...order, productId: 'elite' }, remote), 'product-mismatch');
  assert.equal(why(order, remote, 'sandbox', { pro: { ...catalog.pro, amount: 310000 } }), 'catalog-amount-changed');
});

await test('state machine: forward only, duplicates are no-ops, a late rejection cannot undo a payment', () => {
  assert.equal(K.nextState('created', 'pending'), 'pending');
  assert.equal(K.nextState('pending', 'approved'), 'approved');
  assert.equal(K.nextState('approved', 'fulfilled'), 'fulfilled');
  assert.equal(K.nextState('rejected', 'approved'), 'approved', 'a retried payment on the same order');
  assert.equal(K.nextState('fulfilled', 'fulfilled'), null);
  assert.equal(K.nextState('fulfilled', 'rejected'), null);
  assert.equal(K.nextState('approved', 'rejected'), null);
  assert.equal(K.nextState('fulfilled', 'refunded'), 'refunded');
  assert.equal(K.nextState('refunded', 'approved'), null);
  assert.equal(K.nextState('cancelled', 'approved'), null);
  assert.equal(K.nextState('nonsense', 'approved'), null);
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
