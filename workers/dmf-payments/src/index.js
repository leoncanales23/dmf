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
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/databases/(default)/documents/' + collection + '/' +
    encodeURIComponent(docId);

  const res = await fetch(url, {
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
    expectedAmount: { doubleValue: product.price },
    expectedCurrency: { stringValue: product.currency },
    updatedAt: { timestampValue: new Date().toISOString() }
  }, saToken).catch(() => {});

  return json(origin, 200, {
    ok: true,
    init_point: mpData.init_point,
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

  if (webhookBody.type !== 'payment') {
    return json(nullOrigin, 200, { ok: true, skipped: true });
  }

  let signatureResult;
  try {
    signatureResult = await verifyWebhookSignature(request, env);
  } catch (e) {
    return json(nullOrigin, 401, { ok: false, error: 'Invalid signature' });
  }

  const tsAge = Math.abs(Date.now() / 1000 - Number(signatureResult.ts));
  if (tsAge > 300) {
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
    return json(nullOrigin, 200, { ok: true, duplicate: true });
  }

  const paymentRes = await fetch(
    'https://api.mercadopago.com/v1/payments/' + paymentId,
    { headers: { Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN } }
  );

  if (!paymentRes.ok) {
    return json(nullOrigin, 502, { ok: false, error: 'Payment verification failed' });
  }

  const payment = await paymentRes.json();

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
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'no-reference' });
  }

  const session = await firestoreGet(
    env.DMF_FIREBASE_PROJECT_ID, 'checkoutSessions', purchaseId, saToken
  );

  if (!session || !session.fields || !session.fields.uid) {
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'session-not-found' });
  }

  const uid = session.fields.uid.stringValue;
  const productId = (session.fields.productId && session.fields.productId.stringValue) || '';

  const expectedAmount = session.fields.expectedAmount && session.fields.expectedAmount.doubleValue;
  const expectedCurrency = session.fields.expectedCurrency && session.fields.expectedCurrency.stringValue;
  if (expectedAmount != null && payment.transaction_amount !== expectedAmount) {
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'amount-mismatch' });
  }
  if (expectedCurrency && payment.currency_id !== expectedCurrency) {
    return json(nullOrigin, 200, { ok: true, enrolled: false, reason: 'currency-mismatch' });
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
  if (f.uid && f.uid.stringValue !== user.uid) {
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
