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

// --- Structural checks on firestoreSet ---

test('1. firestoreSet uses updateMask.fieldPaths', function () {
  const fnBody = SRC.substring(
    SRC.indexOf('async function firestoreSet'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function firestoreSet')) + 2
  );
  assert.ok(
    fnBody.includes("updateMask.fieldPaths"),
    'firestoreSet must use updateMask.fieldPaths'
  );
});

test('2. updateMask is constructed from Object.keys(fields)', function () {
  const fnBody = SRC.substring(
    SRC.indexOf('async function firestoreSet'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function firestoreSet')) + 2
  );
  assert.ok(
    fnBody.includes('Object.keys(fields)'),
    'updateMask must be built from Object.keys(fields)'
  );
});

// --- Structural checks on initial checkoutSession write ---

test('3. expectedAmount is in the first checkoutSession write', function () {
  const createPrefFn = SRC.substring(
    SRC.indexOf('async function handleCreatePreference'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleCreatePreference')) + 2
  );
  const firstFirestoreSet = createPrefFn.indexOf('firestoreSet(');
  const secondFirestoreSet = createPrefFn.indexOf('firestoreSet(', firstFirestoreSet + 1);
  const firstWrite = createPrefFn.substring(firstFirestoreSet, secondFirestoreSet);
  assert.ok(
    firstWrite.includes('expectedAmount'),
    'expectedAmount must be in the first checkoutSession write'
  );
});

test('4. expectedCurrency is in the first checkoutSession write', function () {
  const createPrefFn = SRC.substring(
    SRC.indexOf('async function handleCreatePreference'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleCreatePreference')) + 2
  );
  const firstFirestoreSet = createPrefFn.indexOf('firestoreSet(');
  const secondFirestoreSet = createPrefFn.indexOf('firestoreSet(', firstFirestoreSet + 1);
  const firstWrite = createPrefFn.substring(firstFirestoreSet, secondFirestoreSet);
  assert.ok(
    firstWrite.includes('expectedCurrency'),
    'expectedCurrency must be in the first checkoutSession write'
  );
});

test('5. post-preference write does not contain expectedAmount or expectedCurrency', function () {
  const createPrefFn = SRC.substring(
    SRC.indexOf('async function handleCreatePreference'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleCreatePreference')) + 2
  );
  const firstFirestoreSet = createPrefFn.indexOf('firestoreSet(');
  const secondFirestoreSet = createPrefFn.indexOf('firestoreSet(', firstFirestoreSet + 1);
  const secondWrite = createPrefFn.substring(secondFirestoreSet);
  const secondWriteEnd = secondWrite.indexOf(');') + 2;
  const postPrefWrite = secondWrite.substring(0, secondWriteEnd);
  assert.ok(
    !postPrefWrite.includes('expectedAmount'),
    'post-preference write must NOT contain expectedAmount'
  );
  assert.ok(
    !postPrefWrite.includes('expectedCurrency'),
    'post-preference write must NOT contain expectedCurrency'
  );
});

// --- Fail-closed checks ---

test('6. webhook fails if expectedAmount is missing', function () {
  const webhookFn = SRC.substring(
    SRC.indexOf('async function handleWebhook'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleWebhook')) + 2
  );
  assert.ok(
    webhookFn.includes('expectedAmount == null'),
    'webhook must check expectedAmount == null'
  );
  assert.ok(
    webhookFn.includes('session-integrity-error'),
    'webhook must return session-integrity-error when expectedAmount missing'
  );
});

test('7. webhook fails if expectedCurrency is missing', function () {
  const webhookFn = SRC.substring(
    SRC.indexOf('async function handleWebhook'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleWebhook')) + 2
  );
  assert.ok(
    webhookFn.includes('!expectedCurrency'),
    'webhook must check !expectedCurrency'
  );
  assert.ok(
    webhookFn.includes('session-integrity-error'),
    'webhook must return session-integrity-error when expectedCurrency missing'
  );
});

test('8. check-status fails if uid is absent', function () {
  const checkStatusFn = SRC.substring(
    SRC.indexOf('async function handleCheckStatus'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleCheckStatus')) + 2
  );
  assert.ok(
    checkStatusFn.includes('!f.uid'),
    'check-status must deny access when uid is absent'
  );
  assert.ok(
    checkStatusFn.includes('403'),
    'check-status must return 403 for uid issues'
  );
});

test('9. check-status fails if uid does not match', function () {
  const checkStatusFn = SRC.substring(
    SRC.indexOf('async function handleCheckStatus'),
    SRC.indexOf('\n}\n', SRC.indexOf('async function handleCheckStatus')) + 2
  );
  assert.ok(
    checkStatusFn.includes('f.uid.stringValue !== user.uid'),
    'check-status must compare f.uid.stringValue to user.uid'
  );
});

// --- Merge semantics simulation ---

test('10. Simulated merge: updateMask preserves unmentioned fields', function () {
  // Simulate what firestoreSet's updateMask means:
  // If document has fields {a, b, c} and we write {b: newB, d: newD} with
  // updateMask.fieldPaths=[b, d], the result should be {a, b: newB, c, d: newD}

  function simulateMergeWrite(existingFields, newFields) {
    const result = Object.assign({}, existingFields);
    const mask = Object.keys(newFields);
    for (const key of mask) {
      result[key] = newFields[key];
    }
    return result;
  }

  // Initial checkoutSession write
  const initial = {
    uid: 'user123',
    email: 'test@test.com',
    productId: 'starter',
    status: 'pending',
    expectedAmount: 247,
    expectedCurrency: 'USD',
    createdAt: '2025-01-01T00:00:00Z'
  };

  // Post-preference write (only preferenceId + updatedAt)
  const postPref = {
    preferenceId: 'pref_abc',
    updatedAt: '2025-01-01T00:00:01Z'
  };

  const afterPostPref = simulateMergeWrite(initial, postPref);

  // Verify initial fields preserved
  assert.equal(afterPostPref.uid, 'user123', 'uid preserved after post-pref write');
  assert.equal(afterPostPref.expectedAmount, 247, 'expectedAmount preserved');
  assert.equal(afterPostPref.expectedCurrency, 'USD', 'expectedCurrency preserved');
  assert.equal(afterPostPref.productId, 'starter', 'productId preserved');
  assert.equal(afterPostPref.preferenceId, 'pref_abc', 'preferenceId added');

  // Webhook payment write
  const paymentWrite = {
    paymentId: 'pay_123',
    paymentStatus: 'approved',
    enrolled: true,
    updatedAt: '2025-01-01T00:01:00Z'
  };

  const afterPayment = simulateMergeWrite(afterPostPref, paymentWrite);

  // All original fields must still be there
  assert.equal(afterPayment.uid, 'user123', 'uid still preserved after payment write');
  assert.equal(afterPayment.expectedAmount, 247, 'expectedAmount still preserved');
  assert.equal(afterPayment.expectedCurrency, 'USD', 'expectedCurrency still preserved');
  assert.equal(afterPayment.preferenceId, 'pref_abc', 'preferenceId still preserved');
  assert.equal(afterPayment.enrolled, true, 'enrolled added');
  assert.equal(afterPayment.paymentId, 'pay_123', 'paymentId added');
});

test('11. Simulated merge: concurrent writes do not clobber', function () {
  function simulateMergeWrite(existingFields, newFields) {
    const result = Object.assign({}, existingFields);
    for (const key of Object.keys(newFields)) {
      result[key] = newFields[key];
    }
    return result;
  }

  const base = { a: 1, b: 2, c: 3 };
  const write1 = { b: 20, d: 4 };
  const write2 = { c: 30, e: 5 };

  const after1 = simulateMergeWrite(base, write1);
  const after2 = simulateMergeWrite(after1, write2);

  assert.equal(after2.a, 1, 'untouched field a preserved');
  assert.equal(after2.b, 20, 'write1 field b applied');
  assert.equal(after2.c, 30, 'write2 field c applied');
  assert.equal(after2.d, 4, 'write1 new field d added');
  assert.equal(after2.e, 5, 'write2 new field e added');
});

// --- Summary ---
console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) {
  process.exit(1);
}
