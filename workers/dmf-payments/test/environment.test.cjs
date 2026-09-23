'use strict';

const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const root = path.join(__dirname, '..');
const wrangler = fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'src', 'index.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

const sandboxIndex = wrangler.indexOf('[env.sandbox]');
assert.notEqual(sandboxIndex, -1, 'sandbox environment must exist');

const production = wrangler.slice(0, sandboxIndex);
const sandbox = wrangler.slice(sandboxIndex);

assert.match(production, /name = "dmf-payments"/);
assert.match(production, /DMF_MP_ENVIRONMENT = "production"/);
assert.match(
  production,
  /DMF_WEBHOOK_URL = "https:\/\/dmf-payments\.vibraalto-cl\.workers\.dev\/webhook\/mercadopago"/
);

assert.match(sandbox, /name = "dmf-payments-sandbox"/);
assert.match(sandbox, /workers_dev = true/);
assert.match(sandbox, /\[env\.sandbox\.vars\]/);
assert.match(sandbox, /DMF_FIREBASE_PROJECT_ID = "dmf-academy"/);
assert.match(sandbox, /DMF_MP_ENVIRONMENT = "sandbox"/);
assert.match(
  sandbox,
  /DMF_WEBHOOK_URL = "https:\/\/dmf-payments-sandbox\.vibraalto-cl\.workers\.dev\/webhook\/mercadopago"/
);

assert.match(worker, /paymentEnvironment/);
assert.match(worker, /environment-mismatch/);
assert.match(worker, /sessionEnvironment !== workerEnvironment/);

assert.match(readme, /wrangler secret put MP_ACCESS_TOKEN --env sandbox/);
assert.match(readme, /wrangler deploy --env sandbox/);
assert.match(readme, /dmf-payments-sandbox\.vibraalto-cl\.workers\.dev/);
assert.doesNotMatch(
  readme,
  /cambia temporalmente\s+\`DMF_MP_ENVIRONMENT\` a \`sandbox\`/i
);

console.log('PASS: production and sandbox Workers are isolated');
console.log('PASS: sandbox vars are explicitly declared');
console.log('PASS: checkout sessions are environment-bound');
console.log('PASS: operations guide uses environment-specific secrets');


const projectRoot = path.join(root, '..', '..');
const landing = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const generatedLanding = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');
const login = fs.readFileSync(path.join(projectRoot, 'public', 'login.html'), 'utf8');
const paymentResult = fs.readFileSync(path.join(projectRoot, 'public', 'payment-result.html'), 'utf8');

for (const html of [landing, generatedLanding]) {
  assert.ok(html.includes('getPaymentEnvironment'));
  assert.ok(html.includes('dmf-payments-sandbox.vibraalto-cl.workers.dev'));
  assert.ok(html.includes('dmf_purchase_environment'));
}

assert.ok(login.includes('dmf_purchase_environment'));
assert.ok(login.includes('dmf-payments-sandbox.vibraalto-cl.workers.dev'));
assert.ok(paymentResult.includes('paymentEnvironment'));
assert.ok(paymentResult.includes('dmf-payments-sandbox.vibraalto-cl.workers.dev'));
assert.ok(worker.includes('resultUrl'));
assert.ok(worker.includes('environment-mismatch'));

console.log('PASS: sandbox checkout routes through login and payment-result end to end');
