'use strict';

const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' must exist');
  let depth = 0;
  let opened = false;
  for (let index = start; index < source.length; index++) {
    if (source[index] === '{') { depth++; opened = true; }
    if (source[index] === '}') depth--;
    if (opened && depth === 0) return source.slice(start, index + 1);
  }
  throw new Error('Could not extract ' + name);
}

const selectCheckoutUrl = eval('(' + extractFunction('selectCheckoutUrl') + ')');
const preference = {
  init_point: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=production',
  sandbox_init_point: 'https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=test'
};

assert.equal(selectCheckoutUrl(preference, 'production'), preference.init_point);
assert.equal(selectCheckoutUrl(preference, 'sandbox'), preference.sandbox_init_point);
assert.equal(selectCheckoutUrl(preference), preference.init_point);
assert.match(source, /'X-Idempotency-Key': purchaseId/);
assert.match(source, /prefBody\.payer = \{ email: user\.email \}/);

console.log('PASS: production and sandbox checkout URLs are selected explicitly');
console.log('PASS: preference creation is idempotent and pre-fills authenticated email');
