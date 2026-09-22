'use strict';

const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

// Extract validatePaymentIntegrity from the Worker source (pure function, no deps)
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'index.js'),
  'utf8'
);

const marker = 'function validatePaymentIntegrity(';
const start = SRC.indexOf(marker);
if (start === -1) {
  console.error('FAIL: validatePaymentIntegrity not found in source');
  process.exit(1);
}

let braceCount = 0;
let end = start;
let foundFirst = false;
for (let i = start; i < SRC.length; i++) {
  if (SRC[i] === '{') { braceCount++; foundFirst = true; }
  if (SRC[i] === '}') braceCount--;
  if (foundFirst && braceCount === 0) { end = i + 1; break; }
}

const fnSource = SRC.substring(start, end);
const validatePaymentIntegrity = eval('(' + fnSource + ')');

// --- Test fixtures ---

const PRODUCTS = {
  starter: { title: 'DMF Academy — Starter', price: 247, currency: 'USD' },
  pro:     { title: 'DMF Academy — Pro',     price: 497, currency: 'USD' },
  elite:   { title: 'DMF Academy — Elite',   price: 997, currency: 'USD' },
  addon:   { title: 'DMF Academy — Labels',  price: 80,  currency: 'USD' }
};

function makePayment(overrides) {
  return Object.assign({
    id: 179270751947,
    status: 'approved',
    external_reference: 'purchase-abc-123',
    transaction_amount: 238417,
    currency_id: 'CLP'
  }, overrides);
}

function makeMerchantOrder(overrides) {
  return Object.assign({
    id: 99887766,
    external_reference: 'purchase-abc-123',
    preference_id: 'pref-xyz-456',
    status: 'closed',
    order_status: 'paid',
    total_amount: 238417,
    paid_amount: 238417,
    payments: [
      { id: 179270751947, status: 'approved', transaction_amount: 238417 }
    ],
    items: [
      { id: 'starter', title: 'DMF Academy — Starter', quantity: 1 }
    ]
  }, overrides);
}

function makeSession(overrides) {
  return Object.assign({
    purchaseId: 'purchase-abc-123',
    preferenceId: 'pref-xyz-456',
    productId: 'starter'
  }, overrides);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
    passed++;
  } catch (e) {
    console.error('FAIL: ' + name);
    console.error('  ' + e.message);
    failed++;
  }
}

// --- Test 1: USD session -> CLP payment, same preference/order, fully paid => PASS ---

test('1. Converted payment (USD->CLP) with valid merchant order passes', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder(),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);
});

// --- Test 2: Preference mismatch => FAIL ---

test('2. Preference mismatch is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ preference_id: 'wrong-pref-id' }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'preference-mismatch');
});

// --- Test 3: External reference mismatch => FAIL ---

test('3. External reference mismatch is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ external_reference: 'wrong-purchase-id' }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'merchant-order-reference-mismatch');
});

// --- Test 4: Payment ID not in merchant order => FAIL ---

test('4. Payment not in merchant order is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ payments: [{ id: 999999, status: 'approved', transaction_amount: 238417 }] }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'payment-not-in-order');
});

// --- Test 5: Payment rejected => FAIL ---

test('5. Non-approved payment is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment({ status: 'rejected' }),
    makeMerchantOrder(),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'payment-not-approved');
});

// --- Test 6: Merchant order opened (not closed/paid) => FAIL ---

test('6. Open merchant order is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ status: 'opened', order_status: 'payment_required' }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'order-not-paid');
});

// --- Test 7: paid_amount < total_amount => FAIL ---

test('7. Partially paid merchant order is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ paid_amount: 100000, total_amount: 238417 }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'order-not-fully-paid');
});

// --- Test 8: Product mismatch => FAIL ---

test('8. Invalid product ID is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder(),
    makeSession({ productId: 'nonexistent' }),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'product-mismatch');
});

// --- Test 9: Duplicate approved webhook remains idempotent (structural) ---

test('9. Idempotent enrollment check still present in webhook handler', function () {
  const webhookFn = SRC.substring(
    SRC.indexOf('async function handleWebhook'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleWebhook')) + 2
  );
  assert.ok(
    webhookFn.includes('enrolled.booleanValue === true'),
    'must check enrolled.booleanValue for idempotency'
  );
  assert.ok(
    webhookFn.includes('duplicate: true'),
    'must return duplicate flag'
  );
});

// --- Test 10: Pending payment can be processed when it becomes approved ---

test('10. Payment reference mismatch between payment and session is rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment({ external_reference: 'different-purchase' }),
    makeMerchantOrder(),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'payment-reference-mismatch');
});

// --- Bonus: Merchant order items validation ---

test('B1. Mismatched merchant order items are rejected', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ items: [{ id: 'pro', title: 'DMF Academy — Pro', quantity: 1 }] }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'product-mismatch');
});

test('B2. Empty merchant order items array passes (items not always provided)', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ items: [] }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, true);
});

test('B3. Merchant order with order_status=paid (alternative to status=closed) passes', function () {
  const result = validatePaymentIntegrity(
    makePayment(),
    makeMerchantOrder({ status: 'opened', order_status: 'paid' }),
    makeSession(),
    PRODUCTS
  );
  assert.equal(result.valid, true);
});

test('B4. Webhook handler uses validatePaymentIntegrity', function () {
  const webhookFn = SRC.substring(
    SRC.indexOf('async function handleWebhook'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleWebhook')) + 2
  );
  assert.ok(
    webhookFn.includes('validatePaymentIntegrity('),
    'webhook must call validatePaymentIntegrity'
  );
  assert.ok(
    webhookFn.includes('merchant_orders/'),
    'webhook must fetch merchant order from MP API'
  );
});

// --- Summary ---
console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) {
  process.exit(1);
}
