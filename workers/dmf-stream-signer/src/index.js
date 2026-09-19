'use strict';

const ALLOWED_ORIGINS = new Set([
  'https://dmf.vibraalto.cl',
  'https://dmf-vibraalto.web.app',
  'https://dmf-vibraalto.firebaseapp.com'
]);

const STREAM_UIDS = new Set([
  '9bb8ec71e5f2cf3054979e77b65c1bba',
  '50498c021ed78bf0913f4cac9fca9abf',
  '87da20f0d21e697054a3e84c0e6c78c7',
  '27ee0d56d12a968546d5b80da955fdbc',
  '4581cdfceeb66d354e3955f8ed1dcd2f',
  '180062ebab5a977e26de4c795c7cd8bb',
  'c6dc2d298f6d8e27d97e4d6d0a50328d',
  'befcbb6d84febc96d250621c8cfa5e0f',
  '4ffdfd64e37d8b403a43b6edd512deb2',
  '86cbcecd235e9c28a79004a1d6996ccd',
  '88d5de963525591ca88cf6f0c58ac4ca',
  'dc376fe4c26dec1815663f1a2b4792d6',
  '2d7916aade419637676f917cbcc14dce'
]);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      encodeURIComponent(env.DMF_FIREBASE_API_KEY),
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

async function requireActiveEnrollment(uid, idToken, env) {
  const url =
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(env.DMF_FIREBASE_PROJECT_ID) +
    '/databases/(default)/documents/enrollments/' +
    encodeURIComponent(uid);

  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + idToken }
  });

  if (!response.ok) {
    throw Object.assign(new Error('enrollment-unavailable'), {
      statusCode: response.status === 404 || response.status === 403 ? 403 : 502
    });
  }

  const doc = await response.json();
  const status = doc &&
    doc.fields &&
    doc.fields.status &&
    doc.fields.status.stringValue;

  if (status !== 'active') {
    throw Object.assign(new Error('inactive-enrollment'), { statusCode: 403 });
  }
}

async function createStreamToken(videoUid, env) {
  const exp = Math.floor(Date.now() / 1000) + (2 * 60 * 60);
  const response = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/' +
      env.DMF_CLOUDFLARE_ACCOUNT_ID +
      '/stream/' +
      videoUid +
      '/token',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.DMF_CLOUDFLARE_STREAM_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ exp })
    }
  );

  const payload = await response.json().catch(() => ({}));
  const token = payload && payload.result && payload.result.token;

  if (!response.ok || typeof token !== 'string' || token.length < 32) {
    throw Object.assign(new Error('stream-token-unavailable'), { statusCode: 502 });
  }

  return { token, exp };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (!ALLOWED_ORIGINS.has(origin)) {
      return json(origin || 'null', 403, { ok: false, error: 'Origin not allowed' });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST' || url.pathname !== '/stream-token') {
      return json(origin, 405, { ok: false, error: 'POST /stream-token required' });
    }

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

    const videoUid = typeof body.videoUid === 'string' ? body.videoUid.trim() : '';
    if (!STREAM_UIDS.has(videoUid)) {
      return json(origin, 400, { ok: false, error: 'Unknown lesson video' });
    }

    try {
      const idToken = match[1];
      const user = await verifyFirebaseUser(idToken, env);
      await requireActiveEnrollment(user.uid, idToken, env);
      const signed = await createStreamToken(videoUid, env);

      return json(origin, 200, {
        ok: true,
        token: signed.token,
        expiresAt: signed.exp
      });
    } catch (error) {
      const status = Number(error.statusCode) || 502;
      return json(origin, status, {
        ok: false,
        error: status === 401
          ? 'Authentication required'
          : status === 403
            ? 'Active enrollment required'
            : 'Stream authorization unavailable'
      });
    }
  }
};
