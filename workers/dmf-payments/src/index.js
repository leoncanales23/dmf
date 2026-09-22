'use strict';

const ALLOWED_ORIGINS = new Set([
  'https://dmf.vibraalto.cl',
  'https://dmf-vibraalto.web.app',
  'https://dmf-vibraalto.firebaseapp.com'
]);

const PRODUCTS = {
  starter: { title: 'DMF Academy — Starter', price: 247, currency: 'USD' },
  pro:     { title: 'DMF Academy — Pro',     price: 497, currency: 'USD' },
  elite:   { title: 'DMF Academy — Elite',   price: 997, currency: 'USD' },
  addon:   { title: 'DMF Academy — Labels',  price: 80,  currency: 'USD' }
};

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
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

async function verifyFirebaseUser(idToken, env) {
  const response = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' +
      encodeURIComponent(env.DMF_FIREBASE_WEB_API_KEY),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );

  if (!response.ok) {
    throw Object.assign(new Error('invalid-auth'), { statusCode: 401 });
  }

  const payload = await response.json();
  const user = payload && Array.isArray(payload.users) ? payload.users[0] : null;
  if (!user || !user.localId || user.disabled === true) {
    throw Object.assign(new Error('invalid-auth'), { statusCode: 401 });
  }

  return { uid: user.localId, email: user.email || null };
}

async function getServiceAccountToken(env) {
  const key = env.DMF_FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error('service-account-unavailable');

  const sa = JSON.parse(key);
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const payload = btoa(JSON.stringify(claimSet))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const pem = sa.private_key;
  const pemBody = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const sigInput = new TextEncoder().encode(header + '.' + payload);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, sigInput);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = header + '.' + payload + '.' + sigB64;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt
  });

  if (!tokenRes.ok) throw new Error('oauth-token-failed');
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function firestoreGet(projectId, collection, docId, accessToken) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/databases/(default)/documents/' + collection + '/' +
    encodeURIComponent(docId);

  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('firestore-read-failed');
  return res.json();
}

async function firestoreSet(projectId, collection, docId, fields, accessToken) {
  const basePath =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/databases/(default)/documents/' + collection + '/' +
    encodeURIComponent(docId);

  const mask = new URLSearchParams();
  for (const key of Object.keys(fields)) {
    mask.append('updateMask.fieldPaths', key);
  }

  const res = await fetch(basePath + '?' + mask.toString(), {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });

  if (!res.ok) throw new Error('firestore-write-failed');
  return res.json();
}

async function verifyWebhookSignature(request, env) {
  const xSignature = request.headers.get('x-signature') || '';
  const xRequestId = request.headers.get('x-request-id') || '';

  const url = new URL(request.url);
  const dataId = (url.searchParams.get('data.id') || '').toLowerCase();

  const tsMatch = xSignature.match(/ts=([^,]+)/);
  const hashMatch = xSignature.match(/v1=([a-f0-9]+)/);
  if (!tsMatch || !hashMatch) throw new Error('invalid-signature-format');

  const ts = tsMatch[1];
  const expectedHash = hashMatch[1];

  const manifest = 'id:' + dataId + ';request-id:' + xRequestId + ';ts:' + ts + ';';

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.MP_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  if (computed !== expectedHash) throw new Error('signature-mismatch');
  return { dataId, ts };
}

function validatePaymentIntegrity(payment, merchantOrder, session, products) {
  if (!payment || payment.status !== 'approved') {
    return { valid: false, reason: 'payment-not-approved' };
  }

  if (!payment.external_reference || payment.external_reference !== session.purchaseId) {
    return { valid: false, reason: 'payment-reference-mismatch' };
  }

  if (!merchantOrder || merchantOrder.external_reference !== session.purchaseId) {
    return { valid: false, reason: 'merchant-order-reference-mismatch' };
  }

  if (merchantOrder.preference_id !== session.preferenceId) {
    return { valid: false, reason: 'preference-mismatch' };
  }

  if (merchantOrder.status !== 'closed' && merchantOrder.order_status !== 'paid') {
    return { valid: false, reason: 'order-not-paid' };
  }

  if (typeof merchantOrder.paid_amount !== 'number' ||
      typeof merchantOrder.total_amount !== 'number' ||
      merchantOrder.paid_amount < merchantOrder.total_amount) {
    return { valid: false, reason: 'order-not-fully-paid' };
  }

  var payments = Array.isArray(merchantOrder.payments) ? merchantOrder.payments : [];
  var found = payments.some(
    function (p) { return String(p.id) === String(payment.id) && p.status === 'approved'; }
  );
  if (!found) {
    return { valid: false, reason: 'payment-not-in-order' };
  }

  if (!session.productId || !products[session.productId]) {
    return { valid: false, reason: 'product-mismatch' };
  }

  if (Array.isArray(merchantOrder.items) && merchantOrder.items.length > 0) {
    var itemMatch = merchantOrder.items.some(
      function (item) { return item.id === session.productId; }
    );
    if (!itemMatch) {
      return { valid: false, reason: 'product-mismatch' };
    }
  }

  return { valid: true, reason: null };
}

async function handleCreatePreference(request, origin, env) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return json(origin, 401, { ok: false, error: 'Authentication required' });
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json(origin, 400, { ok: false, error: 'Invalid JSON' });
  }

  const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
  const product = PRODUCTS[productId];
  if (!product) {
    return json(origin, 400, { ok: false, error: 'Unknown product' });
  }

  let user;
  try {
    user = await verifyFirebaseUser(match[1], env);
  } catch (e) {
    return json(origin, 401, { ok: false, error: 'Authentication required' });
  }

  const purchaseId = crypto.randomUUID();

  const saToken = await getServiceAccountToken(env);
  await firestoreSet(env.DMF_FIREBASE_PROJECT_ID, 'checkoutSessions', purchaseId, {
    uid: { stringValue: user.uid },
    email: { stringValue: user.email || '' },
    productId: { stringValue: productId },
    status: { stringValue: 'pending' },
    expectedAmount: { doubleValue: product.price },
    expectedCurrency: { stringValue: product.currency },
    createdAt: { timestampValue: new Date().toISOString() }
  }, saToken);

  const backBase = env.DMF_PUBLIC_URL || 'https://dmf.vibraalto.cl';

  const prefBody = {
    items: [{
      id: productId,
      title: product.title,
      quantity: 1,
      unit_price: product.price,
      currency_id: product.currency
    }],
    back_urls: {
      success: backBase + '/payment-result.html?purchaseId=' + purchaseId,
      failure: backBase + '/payment-result.html?purchaseId=' + purchaseId,
      pending: backBase + '/payment-result.html?purchaseId=' + purchaseId
    },
    auto_return: 'approved',
    statement_descriptor: 'DMF ACADEMY',
    external_reference: purchaseId,
    notification_url: env.DMF_WEBHOOK_URL || (
      'https://dmf-payments.vibraalto-cl.workers.dev/webhook/mercadopago'
    )
  };

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(prefBody)
  });

  if (!mpRes.ok) {
    return json(origin, 502, { ok: false, error: 'Payment service unavailable' });
  }

  const mpData = await mpRes.json();

  await firestoreSet(env.DMF_FIREBASE_PROJECT_ID, 'checkoutSessions', purchaseId, {
    preferenceId: { stringValue: mpData.id || '' },
    updatedAt: { timestampValue: new Date().toISOString() }
  }, saToken).catch(() => {});

  const initPoint = mpData.sandbox_init_point || mpData.init_point;
  if (!initPoint) {
    return json(origin, 502, { ok: false, error: 'No checkout URL returned by payment provider' });
  }

  return json(origin, 200, {
    ok: true,
    init_point: initPoint,
    purchaseId: purchaseId
  });
}

async function handleWebhook(request, env) {
  const nullOrigin = 'null';

  let webhookBody;
  try {
    webhookBody = await request.json();
  } catch (_) {
    return json(nullOrigin, 400, { ok: false });
  }

  console.log('[DMF PAYMENTS] webhook received: type=' + (webhookBody.type || 'unknown') + ' action=' + (webhookBody.action || 'unknown'));

  if (webhookBody.type !== 'payment') {
    return json(nullOrigin, 200, { ok: true, skipped: true });
  }

  let signatureResult;
  try {
    signatureResult = await verifyWebhookSignature(request, env);
  } catch (e) {
    console.log('[DMF PAYMENTS] signature verification failed: ' + e.message);
    return json(nullOrigin, 401, { ok: false, error: 'Invalid signature' });
  }

  const bodyDataId = webhookBody.data && webhookBody.data.id;
  if (bodyDataId != null && String(bodyDataId).toLowerCase() !== signatureResult.dataId) {
    console.log('[DMF PAYMENTS] data.id mismatch: query=' + signatureResult.dataId + ' body=' + String(bodyDataId).toLowerCase());
    return json(nullOrigin, 401, { ok: false, error: 'data.id mismatch' });
  }

  const rawTs = Number(signatureResult.ts);
  if (!Number.isFinite(rawTs)) {
    console.log('[DMF PAYMENTS] invalid signature timestamp');
    return json(nullOrigin, 401, { ok: false, error: 'Invalid signature timestamp' });
  }
  const tsMs = rawTs > 1e12 ? rawTs : rawTs * 1000;
  const tsAgeMs = Math.abs(Date.now() - tsMs);
  if (tsAgeMs > 300000) {
    console.log('[DMF PAYMENTS] signature expired: age=' + tsAgeMs + 'ms');
    return json(nullOrigin, 401, { ok: false, error: 'Signature expired' });
  }

  const paymentId = String(signatureResult.dataId);
  if (!paymentId) {
    return json(nullOrigin, 400, { ok: false, error: 'Missing payment id' });
  }

  const saToken = await getServiceAccountToken(env);
  const existing = await firestoreGet(
    env.DMF_FIREBASE_PROJECT_ID, 'payments', paymentId, saToken
  );
  if (existing && existing.fields && existing.fields.enrolled &&
      existing.fields.enrolled.booleanValue === true) {
    console.log('[DMF PAYMENTS] duplicate webhook for payment=' + paymentId);
    return json(nullOrigin, 200, { ok: true, duplicate: true });
  }

  const paymentRes = await fetch(
    'https://api.mercadopago.com/v1/payments/' + paymentId,
    { headers: { Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN } }
  );

  if (!paymentRes.ok) {
    console.log('[DMF PAYMENTS] MP payment API error: status=' + paymentRes.status);
    return json(nullOrigin, 502, { ok: false, error: 'Payment verification failed' });
  }

  const payment = await paymentRes.json();
  console.log('[DMF PAYMENTS] payment=' + paymentId + ' status=' + (payment.status || 'unknown'));

  await firestoreSet(env.DMF_FIREBASE_PROJECT_ID, 'payments', paymentId, {
    paymentId: { stringValue: paymentId },
    status: { stringValue: payment.status || 'unknown' },
    externalReference: { stringValue: payment.external_reference || '' },
    amount: { doubleValue: payment.transaction_amount || 0 },
    currency: { stringValue: payment.currency_id || '' },
    payerEmail: { stringValue: (payment.payer && payment.payer.email) || '' },
    processedAt: { timestampValue: new Date().toISOString() }
  }, saToken);

  if (payment.status !== 'approved') {
    console.log('[DMF PAYMENTS] payment not approved, skipping enrollment');
    if (payment.external_reference) {
      await firestoreSet(env.DMF_FIREBASE_PROJECT_ID, 'checkoutSessions', payment.external_reference, {
        paymentId: { stringValue: paymentId },
        paymentStatus: { stringValue: payment.status || 'unknown' },
        updatedAt: { timestampValue: new Date().toISOString() }
      }, saToken).catch(() => {});
    }
    return json(nullOrigin, 200, { ok: true, enrolled: false });
  }

  const purchaseId = payment.external_reference;
  if (!purchaseId) {
    console.log('[DMF PAYMENTS] no external_reference, skipping enrollment');
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'no-reference' });
  }

  const session = await firestoreGet(
    env.DMF_FIREBASE_PROJECT_ID, 'checkoutSessions', purchaseId, saToken
  );

  if (!session || !session.fields || !session.fields.uid) {
    console.log('[DMF PAYMENTS] checkout session not found for purchase=' + purchaseId);
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'session-not-found' });
  }

  const uid = session.fields.uid.stringValue;
  const productId = (session.fields.productId && session.fields.productId.stringValue) || '';
  const preferenceId = (session.fields.preferenceId && session.fields.preferenceId.stringValue) || '';

  const orderId = payment.order && payment.order.id;
  if (!orderId) {
    console.log('[DMF PAYMENTS] missing merchant order for payment=' + paymentId);
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'missing-merchant-order' });
  }

  const orderRes = await fetch(
    'https://api.mercadopago.com/merchant_orders/' + orderId,
    { headers: { Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN } }
  );
  if (!orderRes.ok) {
    console.log('[DMF PAYMENTS] merchant order API error: status=' + orderRes.status);
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'merchant-order-api-failed' });
  }

  const merchantOrder = await orderRes.json();
  console.log('[DMF PAYMENTS] merchant order fetched: id=' + orderId + ' status=' + (merchantOrder.status || 'unknown'));

  const integrity = validatePaymentIntegrity(
    payment,
    merchantOrder,
    { purchaseId, preferenceId, productId },
    PRODUCTS
  );
  if (!integrity.valid) {
    console.log('[DMF PAYMENTS] integrity check failed: ' + integrity.reason);
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: integrity.reason });
  }

  console.log('[DMF PAYMENTS] preference verified: ' + preferenceId);
  console.log('[DMF PAYMENTS] merchant order fully paid: ' + merchantOrder.paid_amount + '/' + merchantOrder.total_amount);
  if (payment.currency_id && PRODUCTS[productId] && payment.currency_id !== PRODUCTS[productId].currency) {
    console.log('[DMF PAYMENTS] converted payment accepted: ' + PRODUCTS[productId].currency + ' -> ' + payment.currency_id);
  }

  await firestoreSet(env.DMF_FIREBASE_PROJECT_ID, 'enrollments', uid, {
    status: { stringValue: 'active' },
    productId: { stringValue: productId },
    paymentId: { stringValue: paymentId },
    purchaseId: { stringValue: purchaseId },
    activatedAt: { timestampValue: new Date().toISOString() }
  }, saToken);

  await firestoreSet(env.DMF_FIREBASE_PROJECT_ID, 'payments', paymentId, {
    enrolled: { booleanValue: true },
    enrolledAt: { timestampValue: new Date().toISOString() }
  }, saToken).catch(() => {});

  await firestoreSet(env.DMF_FIREBASE_PROJECT_ID, 'checkoutSessions', purchaseId, {
    paymentId: { stringValue: paymentId },
    paymentStatus: { stringValue: 'approved' },
    enrolled: { booleanValue: true },
    updatedAt: { timestampValue: new Date().toISOString() }
  }, saToken).catch(() => {});

  console.log('[DMF PAYMENTS] enrollment activated: uid=' + uid + ' product=' + productId + ' payment=' + paymentId);
  return json(nullOrigin, 200, { ok: true, enrolled: true });
}

async function handleCheckStatus(request, origin, env) {
  const auth = request.headers.get('Authorization') || '';
  const authMatch = auth.match(/^Bearer\s+(.+)$/i);
  if (!authMatch) {
    return json(origin, 401, { ok: false, error: 'Authentication required' });
  }

  let user;
  try {
    user = await verifyFirebaseUser(authMatch[1], env);
  } catch (e) {
    return json(origin, 401, { ok: false, error: 'Authentication required' });
  }

  const url = new URL(request.url);
  const purchaseId = url.searchParams.get('purchaseId');
  if (!purchaseId || purchaseId.length < 10) {
    return json(origin, 400, { ok: false, error: 'Missing purchaseId' });
  }

  const saToken = await getServiceAccountToken(env);
  const session = await firestoreGet(
    env.DMF_FIREBASE_PROJECT_ID, 'checkoutSessions', purchaseId, saToken
  );

  if (!session || !session.fields) {
    return json(origin, 404, { ok: false, error: 'Session not found' });
  }

  const f = session.fields;
  if (!f.uid || f.uid.stringValue !== user.uid) {
    return json(origin, 403, { ok: false, error: 'Access denied' });
  }

  return json(origin, 200, {
    ok: true,
    status: (f.paymentStatus && f.paymentStatus.stringValue) || f.status.stringValue,
    enrolled: !!(f.enrolled && f.enrolled.booleanValue),
    productId: (f.productId && f.productId.stringValue) || ''
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (url.pathname === '/webhook/mercadopago' && request.method === 'POST') {
      try {
        return await handleWebhook(request, env);
      } catch (e) {
        console.log('[DMF PAYMENTS] webhook internal error: ' + e.message);
        return json('null', 500, { ok: false, error: 'Internal error' });
      }
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return json(origin || 'null', 403, { ok: false, error: 'Origin not allowed' });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return json(origin, 200, { ok: true, service: 'dmf-payments' });
    }

    if (url.pathname === '/create-preference' && request.method === 'POST') {
      try {
        return await handleCreatePreference(request, origin, env);
      } catch (e) {
        return json(origin, 500, { ok: false, error: 'Internal error' });
      }
    }

    if (url.pathname === '/check-status' && request.method === 'GET') {
      try {
        return await handleCheckStatus(request, origin, env);
      } catch (e) {
        return json(origin, 500, { ok: false, error: 'Internal error' });
      }
    }

    return json(origin || 'null', 404, { ok: false, error: 'Not found' });
  }
};
