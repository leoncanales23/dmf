import { PRODUCTS, resolveProduct } from './catalog.js';
import * as K from './klap.js';
import { verifyFirebaseUser, getServiceAccountToken, createStore, Conflict } from './google.js';

const ALLOWED_ORIGINS = new Set([
  'https://dmf.vibraalto.cl',
  'https://dmf-vibraalto.web.app',
  'https://dmf-vibraalto.firebaseapp.com'
]);
const MAX_WEBHOOK_BYTES = 16384;
const RECONCILE_EVERY_MS = 10000;

// Only these keys ever reach the logs: never keys, hashes, tokens, emails or card data.
const LOG_KEYS = ['environment', 'referenceId', 'orderId', 'productId', 'status', 'outcome', 'reason', 'kind'];
function log(message, fields) {
  const parts = ['[KLAP]', message, 'provider=klap'];
  for (const k of LOG_KEYS) if (fields && fields[k] != null) parts.push(k + '=' + String(fields[k]).slice(0, 80));
  console.log(parts.join(' '));
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  };
}

function json(origin, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export function defaultDeps() {
  return {
    fetch: (...args) => fetch(...args),
    catalog: PRODUCTS,
    uuid: () => crypto.randomUUID(),
    now: () => new Date(),
    async openStore(env) {
      const token = await getServiceAccountToken(env, this.fetch);
      return createStore(env.DMF_FIREBASE_PROJECT_ID, token, this.fetch);
    }
  };
}

async function authenticate(request, env, deps) {
  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try { return await verifyFirebaseUser(match[1], env, deps.fetch); } catch (_) { return null; }
}

async function fetchRemoteOrder(cfg, orderId, deps) {
  try {
    const res = await deps.fetch(cfg.apiBase + cfg.orderPath + '/' + encodeURIComponent(orderId), {
      headers: { Apikey: cfg.apiKey, Accept: 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function writeEnrollment(store, order, deps) {
  // Same document and shape the Mercado Pago Worker writes; setting it twice is harmless.
  await store.patch('enrollments', order.uid, {
    status: 'active',
    productId: order.productId,
    paymentId: order.klapOrderId,
    purchaseId: order.referenceId,
    provider: 'klap',
    activatedAt: deps.now()
  });
}

// One reconciliation step for an order, shared by webhooks and status polling. Klap's own record of the
// order (fetched server to server) is the source of truth; the webhook only says "look now".
export async function processOrder(store, cfg, deps, referenceId, hint) {
  const doc = await store.get('orders', referenceId);
  if (!doc) return { outcome: 'order-not-found' };
  const order = doc.data;
  const ctx = { environment: cfg.environment, referenceId, orderId: order.klapOrderId, kind: hint && hint.kind };
  if (order.provider !== 'klap') return { outcome: 'provider-mismatch' };
  if (order.environment !== cfg.environment) {
    log('environment mismatch', { ...ctx, reason: order.environment });
    return { outcome: 'environment-mismatch' };
  }
  if (!order.klapOrderId) return { outcome: 'no-order-id' };
  if (hint && hint.orderId && hint.orderId !== order.klapOrderId) {
    log('webhook order does not match stored order', ctx);
    return { outcome: 'order-mismatch' };
  }
  if (order.status === 'fulfilled' && !(hint && hint.includeRefunds)) return { outcome: 'duplicate' };

  const remote = await fetchRemoteOrder(cfg, order.klapOrderId, deps);
  if (!remote) {
    // An authenticated rejection can still close a pending order; approval always needs Klap's record.
    if (hint && hint.kind === 'reject') {
      const next = K.nextState(order.status, 'rejected');
      if (next) {
        try { await store.patch('orders', referenceId, { status: next, updatedAt: deps.now() }, { updateTime: doc.updateTime }); } catch (e) { if (!(e instanceof Conflict)) throw e; }
        return { outcome: 'rejected' };
      }
    }
    return { outcome: 'remote-unavailable' };
  }

  const remoteState = K.normalizeKlapStatus(remote.status);
  if (remoteState === 'approved') {
    const check = K.validateForFulfillment(order, remote, cfg.environment, deps.catalog);
    if (!check.valid) {
      log('validation failed — no fulfilment', { ...ctx, reason: check.reason });
      await store.patch('orders', referenceId, { lastError: check.reason, updatedAt: deps.now() }).catch(() => {});
      return { outcome: check.reason };
    }
    let current = doc;
    if (order.status !== 'approved') {
      if (!K.nextState(order.status, 'approved')) return { outcome: 'ignored-' + order.status };
      try {
        current = await store.patch('orders', referenceId, { status: 'approved', approvedAt: deps.now(), updatedAt: deps.now() }, { updateTime: doc.updateTime });
      } catch (e) {
        if (e instanceof Conflict) return { outcome: 'concurrent' };
        throw e;
      }
    }
    await writeEnrollment(store, order, deps);
    try {
      // Only the winner of this compare-and-set may run non-idempotent side effects (email, commissions…).
      await store.patch('orders', referenceId, { status: 'fulfilled', fulfilledAt: deps.now(), updatedAt: deps.now() }, { updateTime: current.updateTime });
    } catch (e) {
      if (e instanceof Conflict) return { outcome: 'duplicate' };
      throw e;
    }
    log('order fulfilled', { ...ctx, productId: order.productId, status: 'fulfilled' });
    return { outcome: 'fulfilled' };
  }

  if (remoteState === 'rejected' || remoteState === 'cancelled' || remoteState === 'refunded') {
    const next = K.nextState(order.status, remoteState);
    if (next) {
      try {
        await store.patch('orders', referenceId, { status: next, updatedAt: deps.now() }, { updateTime: doc.updateTime });
      } catch (e) { if (!(e instanceof Conflict)) throw e; }
      if (next === 'refunded' && order.status === 'fulfilled') log('refund on a fulfilled order — review access manually', { ...ctx, status: next });
      else log('order closed', { ...ctx, status: next });
    }
    return { outcome: remoteState };
  }
  return { outcome: 'pending' };
}

async function handleCreateOrder(request, origin, env, deps) {
  const cfg = K.resolveEnvironment(env);
  if (!cfg.ok) {
    log('not configured', { reason: cfg.error });
    return json(origin, 503, { ok: false, error: 'klap-not-configured', fallback: true });
  }
  const user = await authenticate(request, env, deps);
  if (!user) return json(origin, 401, { ok: false, error: 'Authentication required' });

  let body;
  try { body = await request.json(); } catch (_) { return json(origin, 400, { ok: false, error: 'Invalid JSON' }); }
  // Only productId is read from the browser; any amount/price/currency it sends is ignored.
  const resolved = resolveProduct(body && body.productId, deps.catalog);
  if (!resolved.ok) {
    return json(origin, 400, { ok: false, error: resolved.error, fallback: resolved.error === 'product-not-available' });
  }
  const { productId, product } = resolved;

  const referenceId = K.newReferenceId(deps.uuid());
  const store = await deps.openStore(env);
  await store.patch('orders', referenceId, {
    provider: 'klap',
    environment: cfg.environment,
    referenceId,
    productId,
    expectedAmount: product.amount,
    currency: product.currency,
    uid: user.uid,
    email: user.email || '',
    status: 'created',
    createdAt: deps.now()
  }, { exists: false });

  const fail = async (reason) => {
    log('order creation failed', { environment: cfg.environment, referenceId, reason });
    await store.patch('orders', referenceId, { status: 'error', lastError: reason, updatedAt: deps.now() }).catch(() => {});
    return json(origin, 502, { ok: false, error: 'provider-unavailable', fallback: true });
  };

  let res;
  try {
    res = await deps.fetch(cfg.apiBase + cfg.orderPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Apikey: cfg.apiKey },
      body: JSON.stringify(K.buildOrderRequest({ referenceId, productId, product, email: user.email, cfg }))
    });
  } catch (_) {
    return fail('network');
  }
  if (!res.ok) return fail('http-' + res.status);
  let parsed;
  try { parsed = K.parseOrderResponse(await res.json()); } catch (_) { parsed = { ok: false, error: 'invalid-response' }; }
  if (!parsed.ok) return fail(parsed.error);

  await store.patch('orders', referenceId, { klapOrderId: parsed.orderId, status: 'pending', updatedAt: deps.now() });
  log('order created', { environment: cfg.environment, referenceId, orderId: parsed.orderId, productId, status: 'pending' });
  return json(origin, 200, {
    ok: true,
    provider: 'klap',
    purchaseId: referenceId,
    paymentEnvironment: cfg.environment,
    checkoutUrl: parsed.redirectUrl,
    checkoutConfig: { provider: 'klap', orderId: parsed.orderId }
  });
}

async function handleWebhook(request, env, deps, kind, ctx) {
  const cfg = K.resolveEnvironment(env);
  if (!cfg.ok) {
    log('webhook while not configured', { kind, reason: cfg.error });
    return json('null', 503, { ok: false });
  }
  const text = await request.text();
  if (text.length > MAX_WEBHOOK_BYTES) return json('null', 413, { ok: false });
  let body;
  try { body = JSON.parse(text); } catch (_) { return json('null', 400, { ok: false }); }

  const auth = await K.verifyWebhook(request.headers, body, cfg.apiKey);
  if (!auth.ok) {
    log('webhook rejected', { environment: cfg.environment, kind, reason: auth.reason });
    return json('null', 401, { ok: false });
  }
  log('webhook received', { environment: cfg.environment, kind, referenceId: auth.referenceId, orderId: auth.orderId });

  // Klap needs a 2xx within ~10 s or it reverses the payment, so the authenticated notification is
  // acknowledged right away and the (idempotent) reconciliation continues in the background.
  const work = (async () => {
    const store = await deps.openStore(env);
    const result = await processOrder(store, cfg, deps, auth.referenceId, { kind, orderId: auth.orderId });
    log('webhook processed', { environment: cfg.environment, kind, referenceId: auth.referenceId, orderId: auth.orderId, outcome: result.outcome });
    return result;
  })().catch((e) => {
    log('webhook processing error', { environment: cfg.environment, kind, referenceId: auth.referenceId, reason: e && e.message });
    return { outcome: 'error' };
  });
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(work);
  else await work;
  return json('null', 200, { ok: true, received: true });
}

async function handleCheckStatus(request, origin, env, deps) {
  const cfg = K.resolveEnvironment(env);
  if (!cfg.ok) return json(origin, 503, { ok: false, error: 'klap-not-configured' });
  const user = await authenticate(request, env, deps);
  if (!user) return json(origin, 401, { ok: false, error: 'Authentication required' });

  const purchaseId = new URL(request.url).searchParams.get('purchaseId');
  if (!K.isReferenceId(purchaseId)) return json(origin, 400, { ok: false, error: 'Missing purchaseId' });

  const store = await deps.openStore(env);
  let doc = await store.get('orders', purchaseId);
  if (!doc) return json(origin, 404, { ok: false, error: 'Order not found' });
  if (doc.data.uid !== user.uid) return json(origin, 403, { ok: false, error: 'Access denied' });
  if (doc.data.environment !== cfg.environment) return json(origin, 409, { ok: false, error: 'environment-mismatch' });

  const open = ['created', 'pending', 'approved', 'rejected'].includes(doc.data.status);
  const last = Date.parse(doc.data.lastReconcileAt || '') || 0;
  if (open && doc.data.klapOrderId && deps.now().getTime() - last >= RECONCILE_EVERY_MS) {
    // Covers a webhook that was acknowledged but whose background fulfilment failed.
    await store.patch('orders', purchaseId, { lastReconcileAt: deps.now() }).catch(() => {});
    await processOrder(store, cfg, deps, purchaseId, { kind: 'poll' });
    doc = await store.get('orders', purchaseId);
  }
  return json(origin, 200, {
    ok: true,
    provider: 'klap',
    status: K.publicState(doc.data.status),
    enrolled: doc.data.status === 'fulfilled',
    productId: doc.data.productId || ''
  });
}

export async function route(request, env, ctx, deps) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'POST' && (url.pathname === '/webhook/klap/confirm' || url.pathname === '/webhook/klap/reject')) {
    try {
      return await handleWebhook(request, env, deps, url.pathname.endsWith('confirm') ? 'confirm' : 'reject', ctx);
    } catch (e) {
      log('webhook internal error', { reason: e && e.message });
      return json('null', 500, { ok: false });
    }
  }

  if (!ALLOWED_ORIGINS.has(origin)) return json(origin || 'null', 403, { ok: false, error: 'Origin not allowed' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

  try {
    if (url.pathname === '/health' && request.method === 'GET') {
      const cfg = K.resolveEnvironment(env);
      return json(origin, 200, { ok: true, service: 'dmf-klap-payments', environment: env.KLAP_ENVIRONMENT || null, configured: cfg.ok });
    }
    if (url.pathname === '/create-order' && request.method === 'POST') return await handleCreateOrder(request, origin, env, deps);
    if (url.pathname === '/check-status' && request.method === 'GET') return await handleCheckStatus(request, origin, env, deps);
  } catch (e) {
    log('internal error', { reason: e && e.message });
    return json(origin, 500, { ok: false, error: 'Internal error' });
  }
  return json(origin, 404, { ok: false, error: 'Not found' });
}

export default {
  fetch(request, env, ctx) {
    return route(request, env, ctx, defaultDeps());
  }
};
