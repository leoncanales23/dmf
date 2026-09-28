// Pure Klap Checkout Flex logic. No I/O here: everything is testable in Node and runs unchanged in the
// Worker (Web Crypto only). Anything that depends on Klap's exact wire format lives in one function so it
// can be aligned with developers.klap.cl in a single place.

export const ENVIRONMENTS = Object.freeze(['sandbox', 'production']);

// Universal payment states shared with the Mercado Pago Worker and consumed by the frontend.
export const PUBLIC_STATES = Object.freeze(['created', 'pending', 'approved', 'rejected', 'cancelled', 'refunded']);

const REF_RE = /^[A-Za-z0-9_-]{8,64}$/;
const ORDER_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

// Each environment reads its own, differently named secret. A Worker that also sees the other
// environment's key refuses to run, so production credentials can never be used for a sandbox test
// (or the reverse) by editing a single binding.
export function resolveEnvironment(env) {
  const environment = env && env.KLAP_ENVIRONMENT;
  if (!ENVIRONMENTS.includes(environment)) return { ok: false, error: 'invalid-environment' };
  const own = environment === 'sandbox' ? 'KLAP_API_KEY_SANDBOX' : 'KLAP_API_KEY_PRODUCTION';
  const foreign = environment === 'sandbox' ? 'KLAP_API_KEY_PRODUCTION' : 'KLAP_API_KEY_SANDBOX';
  if (env[foreign]) return { ok: false, error: 'foreign-credential' };
  const apiKey = env[own];
  if (typeof apiKey !== 'string' || apiKey.length < 8) return { ok: false, error: 'missing-credential' };
  const apiBase = typeof env.KLAP_API_BASE === 'string' ? env.KLAP_API_BASE.replace(/\/+$/, '') : '';
  if (!/^https:\/\//.test(apiBase)) return { ok: false, error: 'missing-api-base' };
  const webhookBase = typeof env.KLAP_WEBHOOK_BASE === 'string' ? env.KLAP_WEBHOOK_BASE.replace(/\/+$/, '') : '';
  if (!/^https:\/\//.test(webhookBase)) return { ok: false, error: 'missing-webhook-base' };
  return {
    ok: true,
    environment,
    apiKey,
    apiBase,
    webhookBase,
    orderPath: typeof env.KLAP_ORDER_PATH === 'string' && env.KLAP_ORDER_PATH.startsWith('/') ? env.KLAP_ORDER_PATH : '/orders',
    publicUrl: (env.DMF_PUBLIC_URL || 'https://dmf.vibraalto.cl').replace(/\/+$/, '')
  };
}

export function newReferenceId(uuid) {
  return 'dmf-' + String(uuid).replace(/-/g, '').slice(0, 32);
}

export function isReferenceId(value) {
  return typeof value === 'string' && REF_RE.test(value);
}

export function isOrderId(value) {
  return typeof value === 'string' && ORDER_ID_RE.test(value);
}

// Order creation body. VERIFY against the current developers.klap.cl schema before the sandbox run.
export function buildOrderRequest({ referenceId, productId, product, email, cfg }) {
  const resultUrl = cfg.publicUrl + '/payment-result?purchaseId=' + encodeURIComponent(referenceId) +
    '&provider=klap&paymentEnvironment=' + cfg.environment;
  const body = {
    reference_id: referenceId,
    description: product.title,
    amount: { currency: product.currency, total: product.amount },
    items: [{ code: productId, name: product.title, unit_price: product.amount, quantity: 1 }],
    urls: { return_url: resultUrl, cancel_url: resultUrl },
    webhooks: {
      webhook_confirm: cfg.webhookBase + '/webhook/klap/confirm',
      webhook_reject: cfg.webhookBase + '/webhook/klap/reject'
    }
  };
  if (email) body.user = { email };
  return body;
}

export function parseOrderResponse(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalid-response' };
  const orderId = data.order_id != null ? String(data.order_id) : '';
  if (!isOrderId(orderId)) return { ok: false, error: 'missing-order-id' };
  const redirectUrl = typeof data.redirect_url === 'string' && /^https:\/\//.test(data.redirect_url) ? data.redirect_url : null;
  return { ok: true, orderId, redirectUrl };
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  let out = '';
  for (const b of new Uint8Array(digest)) out += b.toString(16).padStart(2, '0');
  return out;
}

// Klap signs each webhook with Apikey = sha256(reference_id + order_id + private ApiKey), hex.
export function expectedWebhookApiKey(referenceId, orderId, apiKey) {
  return sha256Hex(String(referenceId) + String(orderId) + String(apiKey));
}

export function timingSafeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

export function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key]) : '';
}

export async function verifyWebhook(headers, body, apiKey) {
  const referenceId = body && typeof body.reference_id === 'string' ? body.reference_id : '';
  const orderId = body && body.order_id != null ? String(body.order_id) : '';
  if (!isReferenceId(referenceId)) return { ok: false, reason: 'invalid-reference' };
  if (!isOrderId(orderId)) return { ok: false, reason: 'invalid-order-id' };
  const received = headerValue(headers, 'apikey').trim().toLowerCase();
  if (!received) return { ok: false, reason: 'missing-apikey-header' };
  const expected = await expectedWebhookApiKey(referenceId, orderId, apiKey);
  if (!timingSafeEqual(received, expected)) return { ok: false, reason: 'apikey-mismatch' };
  return { ok: true, referenceId, orderId };
}

// Klap state names → universal states. Unknown names are never treated as paid.
const STATUS_MAP = {
  completed: 'approved', approved: 'approved', paid: 'approved', confirmed: 'approved', success: 'approved',
  created: 'pending', pending: 'pending', in_process: 'pending', processing: 'pending',
  rejected: 'rejected', failed: 'rejected', declined: 'rejected', error: 'rejected',
  cancelled: 'cancelled', canceled: 'cancelled', expired: 'cancelled', abandoned: 'cancelled',
  refund: 'refunded', refunded: 'refunded', reversed: 'refunded', reverse: 'refunded', voided: 'refunded'
};

export function normalizeKlapStatus(status) {
  const key = String(status || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(STATUS_MAP, key) ? STATUS_MAP[key] : 'unknown';
}

export function remoteAmount(remote) {
  if (!remote) return NaN;
  const a = remote.amount;
  if (a && typeof a === 'object') return Number(a.total);
  return Number(a);
}

export function remoteCurrency(remote) {
  if (!remote) return '';
  if (remote.amount && typeof remote.amount === 'object' && remote.amount.currency) return String(remote.amount.currency);
  return String(remote.currency || '');
}

// Everything that must hold before the business action runs. `order` is our stored record,
// `remote` is Klap's own view of the order fetched server-to-server.
export function validateForFulfillment(order, remote, workerEnvironment, catalog) {
  if (!order) return { valid: false, reason: 'order-not-found' };
  if (order.provider !== 'klap') return { valid: false, reason: 'provider-mismatch' };
  if (order.environment !== workerEnvironment) return { valid: false, reason: 'environment-mismatch' };
  if (!remote) return { valid: false, reason: 'remote-unavailable' };
  if (String(remote.reference_id || '') !== order.referenceId) return { valid: false, reason: 'reference-mismatch' };
  if (String(remote.order_id || '') !== order.klapOrderId) return { valid: false, reason: 'order-mismatch' };
  if (normalizeKlapStatus(remote.status) !== 'approved') return { valid: false, reason: 'not-approved' };
  const product = catalog[order.productId];
  if (!product) return { valid: false, reason: 'product-mismatch' };
  if (order.expectedAmount !== product.amount) return { valid: false, reason: 'catalog-amount-changed' };
  if (remoteAmount(remote) !== order.expectedAmount) return { valid: false, reason: 'amount-mismatch' };
  const currency = remoteCurrency(remote);
  if (currency && currency.toUpperCase() !== order.currency) return { valid: false, reason: 'currency-mismatch' };
  return { valid: true, reason: null };
}

// Order lifecycle. Returns the next state or null when the event must not change anything
// (duplicates, late rejections after a payment, anything after fulfilment except a refund).
const TRANSITIONS = {
  created: { pending: 'pending', approved: 'approved', rejected: 'rejected', cancelled: 'cancelled', error: 'error' },
  pending: { approved: 'approved', rejected: 'rejected', cancelled: 'cancelled', refunded: 'refunded' },
  rejected: { approved: 'approved' },
  cancelled: {},
  error: {},
  approved: { fulfilled: 'fulfilled', refunded: 'refunded' },
  fulfilled: { refunded: 'refunded' },
  refunded: {}
};

export function nextState(current, event) {
  const row = TRANSITIONS[current];
  if (!row) return null;
  return Object.prototype.hasOwnProperty.call(row, event) ? row[event] : null;
}

export function publicState(internal) {
  if (internal === 'fulfilled') return 'approved';
  if (internal === 'error') return 'rejected';
  return PUBLIC_STATES.includes(internal) ? internal : 'pending';
}
