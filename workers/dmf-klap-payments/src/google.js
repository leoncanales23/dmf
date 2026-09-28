// Firebase Auth (ID token lookup) and Firestore REST with preconditions. `fetchImpl` is injected so the
// handlers can be exercised end to end in tests without a network.

function b64url(input) {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function verifyFirebaseUser(idToken, env, fetchImpl) {
  const response = await fetchImpl(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(env.DMF_FIREBASE_WEB_API_KEY || ''),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  if (!response.ok) throw Object.assign(new Error('invalid-auth'), { statusCode: 401 });
  const payload = await response.json();
  const user = payload && Array.isArray(payload.users) ? payload.users[0] : null;
  if (!user || !user.localId || user.disabled === true) throw Object.assign(new Error('invalid-auth'), { statusCode: 401 });
  return { uid: user.localId, email: user.email || null };
}

export async function getServiceAccountToken(env, fetchImpl) {
  const key = env.DMF_FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error('service-account-unavailable');
  const sa = JSON.parse(key);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const pemBody = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(header + '.' + payload));
  const jwt = header + '.' + payload + '.' + b64url(String.fromCharCode(...new Uint8Array(sig)));
  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt
  });
  if (!res.ok) throw new Error('oauth-token-failed');
  return (await res.json()).access_token;
}

// --- Firestore value encoding (only the types this Worker writes) ---
export function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) fields[k] = { nullValue: null };
    else if (v instanceof Date) fields[k] = { timestampValue: v.toISOString() };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else fields[k] = { stringValue: String(v) };
  }
  return fields;
}

export function fromFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('integerValue' in v) out[k] = Number(v.integerValue);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('timestampValue' in v) out[k] = v.timestampValue;
    else out[k] = null;
  }
  return out;
}

export class Conflict extends Error {
  constructor() { super('precondition-failed'); this.conflict = true; }
}

export function createStore(projectId, accessToken, fetchImpl) {
  const base = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/databases/(default)/documents/';
  const url = (collection, id) => base + collection + '/' + encodeURIComponent(id);
  const auth = { Authorization: 'Bearer ' + accessToken };

  async function get(collection, id) {
    const res = await fetchImpl(url(collection, id), { headers: auth });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('firestore-read-failed');
    const doc = await res.json();
    return { data: fromFields(doc.fields), updateTime: doc.updateTime };
  }

  // precondition: { exists: false } to create only, { updateTime } for compare-and-set.
  async function patch(collection, id, data, precondition) {
    const q = new URLSearchParams();
    for (const key of Object.keys(data)) q.append('updateMask.fieldPaths', key);
    if (precondition && precondition.exists === false) q.append('currentDocument.exists', 'false');
    if (precondition && precondition.updateTime) q.append('currentDocument.updateTime', precondition.updateTime);
    const res = await fetchImpl(url(collection, id) + '?' + q.toString(), {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFields(data) })
    });
    if (res.status === 409 || res.status === 412) throw new Conflict();
    if (res.status === 400) {
      const text = await res.text();
      if (/FAILED_PRECONDITION|ALREADY_EXISTS/.test(text)) throw new Conflict();
      throw new Error('firestore-write-failed');
    }
    if (!res.ok) throw new Error('firestore-write-failed');
    const doc = await res.json();
    return { data: fromFields(doc.fields), updateTime: doc.updateTime };
  }

  return { get, patch };
}
