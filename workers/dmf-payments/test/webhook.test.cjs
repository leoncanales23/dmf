'use strict';

const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'index.js'),
  'utf8'
);

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

function getWebhookFn() {
  return SRC.substring(
    SRC.indexOf('async function handleWebhook'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleWebhook')) + 2
  );
}

function getSignatureFn() {
  return SRC.substring(
    SRC.indexOf('async function verifyWebhookSignature'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function verifyWebhookSignature')) + 2
  );
}

// --- Test 1: Timestamp in seconds (10 digits) accepted ---

test('1. Timestamp normalization supports seconds (10-digit)', function () {
  const fn = getWebhookFn();
  assert.ok(
    fn.includes('rawTs > 1e12'),
    'must check if rawTs > 1e12 to distinguish seconds from milliseconds'
  );
  assert.ok(
    fn.includes('rawTs * 1000'),
    'must multiply seconds by 1000 to convert to milliseconds'
  );
});

// --- Test 2: Timestamp in milliseconds (13 digits) accepted ---

test('2. Timestamp normalization supports milliseconds (13-digit)', function () {
  const fn = getWebhookFn();
  assert.ok(
    fn.includes('rawTs > 1e12 ? rawTs : rawTs * 1000'),
    'must use ternary to pass milliseconds through and convert seconds'
  );
  assert.ok(
    fn.includes('Date.now() - tsMs'),
    'must compare Date.now() (ms) against normalized tsMs'
  );
});

// --- Test 3: Non-numeric timestamp rejected ---

test('3. Non-numeric timestamp returns 401', function () {
  const fn = getWebhookFn();
  assert.ok(
    fn.includes('Number.isFinite(rawTs)'),
    'must validate rawTs with Number.isFinite'
  );
  assert.ok(
    fn.includes("'Invalid signature timestamp'"),
    'must return Invalid signature timestamp error'
  );
});

// --- Test 4: Expired timestamp rejected (> 5 min) ---

test('4. Expired timestamp returns 401 after 300000ms', function () {
  const fn = getWebhookFn();
  assert.ok(
    fn.includes('tsAgeMs > 300000'),
    'must reject when tsAgeMs > 300000 (5 minutes in ms)'
  );
  assert.ok(
    fn.includes("'Signature expired'"),
    'must return Signature expired error'
  );
});

// --- Test 5: Invalid signature format (no ts=, no v1=) rejected ---

test('5. Invalid signature format returns 401', function () {
  const fn = getSignatureFn();
  assert.ok(
    fn.includes("throw new Error('invalid-signature-format')"),
    'must throw invalid-signature-format when ts or v1 missing'
  );
  assert.ok(
    fn.includes('/ts=([^,]+)/'),
    'must parse ts= from x-signature header'
  );
  assert.ok(
    fn.includes('/v1=([a-f0-9]+)/'),
    'must parse v1= hex hash from x-signature header'
  );
});

// --- Test 6: Signature mismatch rejected ---

test('6. HMAC signature mismatch returns 401', function () {
  const fn = getSignatureFn();
  assert.ok(
    fn.includes("throw new Error('signature-mismatch')"),
    'must throw signature-mismatch when computed hash != expected hash'
  );
  assert.ok(
    fn.includes('computed !== expectedHash'),
    'must compare computed HMAC against expected hash'
  );
});

// --- Test 7: data.id query != body data.id rejected ---

test('7. data.id mismatch between query and body returns 401', function () {
  const fn = getWebhookFn();
  assert.ok(
    fn.includes('bodyDataId'),
    'must extract bodyDataId from webhook body'
  );
  assert.ok(
    fn.includes('String(bodyDataId).toLowerCase() !== signatureResult.dataId'),
    'must compare lowercased body data.id against signed query data.id'
  );
  assert.ok(
    fn.includes("'data.id mismatch'"),
    'must return data.id mismatch error'
  );
});

// --- Test 8: Matching data.id passes (structural) ---

test('8. data.id validation only rejects on mismatch (null body data.id passes)', function () {
  const fn = getWebhookFn();
  assert.ok(
    fn.includes('bodyDataId != null'),
    'must skip validation when body data.id is null/undefined'
  );
});

// --- Test 9: Enrollment write uses merge-safe firestoreSet ---

test('9. Enrollment write uses merge-safe firestoreSet with correct fields', function () {
  const fn = getWebhookFn();
  const enrollmentIdx = fn.indexOf("'enrollments'");
  assert.ok(enrollmentIdx !== -1, 'must write to enrollments collection');

  const enrollmentWrite = fn.substring(enrollmentIdx, enrollmentIdx + 400);
  assert.ok(enrollmentWrite.includes('status'), 'enrollment must include status');
  assert.ok(enrollmentWrite.includes('productId'), 'enrollment must include productId');
  assert.ok(enrollmentWrite.includes('paymentId'), 'enrollment must include paymentId');
  assert.ok(enrollmentWrite.includes('purchaseId'), 'enrollment must include purchaseId');
  assert.ok(enrollmentWrite.includes('activatedAt'), 'enrollment must include activatedAt');
});

// --- Test 10: Idempotency — duplicate payment already enrolled ---

test('10. Duplicate payment (already enrolled) returns 200 with duplicate flag', function () {
  const fn = getWebhookFn();
  assert.ok(
    fn.includes('enrolled.booleanValue === true'),
    'must check enrolled.booleanValue === true for idempotency'
  );
  assert.ok(
    fn.includes('duplicate: true'),
    'must return duplicate: true for already-enrolled payments'
  );
});

// --- Bonus: Diagnostic logs are safe ---

test('B1. Diagnostic logs use [DMF PAYMENTS] prefix', function () {
  const logs = SRC.match(/console\.log\('\[DMF PAYMENTS\]/g) || [];
  assert.ok(logs.length >= 5, 'must have at least 5 diagnostic logs with [DMF PAYMENTS] prefix, found ' + logs.length);
});

test('B2. No secrets logged', function () {
  const logLines = SRC.match(/console\.log\(.+\)/g) || [];
  for (const line of logLines) {
    assert.ok(
      !line.includes('MP_WEBHOOK_SECRET'),
      'must never log MP_WEBHOOK_SECRET'
    );
    assert.ok(
      !line.includes('MP_ACCESS_TOKEN'),
      'must never log MP_ACCESS_TOKEN'
    );
    assert.ok(
      !line.includes('x-signature'),
      'must never log raw x-signature header value'
    );
    assert.ok(
      !line.includes('DMF_FIREBASE_PRIVATE_KEY'),
      'must never log private key'
    );
  }
});

// --- Summary ---
console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) {
  process.exit(1);
}
