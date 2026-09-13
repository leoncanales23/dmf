'use strict';

const crypto = require('crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const VBC_SERVICE_KEY = defineSecret('VBC_SERVICE_KEY');
const VBC_COMPUTE_URL = process.env.VBC_COMPUTE_URL || 'https://vbc-compute-layer.fly.dev/compute/execute';

const ALLOWED_ORIGINS = new Set([
  'https://dmf.vibraalto.cl',
  'https://dmf-vibraalto.web.app',
  'https://dmf-vibraalto.firebaseapp.com',
]);

const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function allowRequest(req) {
  const key = clientIp(req);
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_PER_WINDOW;
}

function sanitizeObject(value, allowedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const key of allowedKeys) {
    if (typeof value[key] === 'string') out[key] = value[key].slice(0, 120);
  }
  return out;
}

function extractJson(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) { return null; }
}

function cleanString(value, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function buildSystem(lang) {
  const language = lang === 'es' ? 'Spanish' : 'English';
  return `You are DMF ORACLE, the digital training interface for DMF Academy / Dynamic Music Formula by Demian Muller.

Your job is to interpret a producer's current obstacle and route it to ONE module in the real DMF curriculum.

DMF MODULE INDEXES:
0 = Track structure & development
1 = Mixing & balance
2 = Sound Selection
3 = Bass creation / kick-bass relationship
4 = Workflow & efficiency
5 = Producer Mindset / finishing projects
6 = Music Market / labels / release positioning
7 = Mastering & final preparation

RULES:
- Ground every answer in this curriculum. Do not invent modules, credentials, results, labels, student outcomes, or supernatural facts.
- The Codex / Oracle / transmission mythology is brand language only. Never present extraterrestrial, divine, supernatural, or mystical origins as literal fact.
- Demian is the human mentor. You prepare the student for training; you do not impersonate him or claim to replace him.
- Diagnose the production bottleneck, choose exactly one module, give one immediate action, and state exactly what the student should bring to the session.
- Be concrete. Avoid generic motivation.
- If BPM or a stage such as intro, break, build, drop, outro, mix, master is explicit, preserve it.
- Write the fields diagnosis, directive and artifact in ${language}.

Return ONLY valid JSON using exactly this shape:
{
  "moduleIndex": 0,
  "diagnosis": "...",
  "directive": "...",
  "artifact": "...",
  "bpm": 126,
  "stage": "drop",
  "confidence": "HIGH"
}

moduleIndex must be an integer from 0 to 7. bpm may be null. stage may be null. confidence must be HIGH, MEDIUM, or ASSISTED.`;
}

function normalizeOutput(parsed) {
  if (!parsed || !Number.isInteger(Number(parsed.moduleIndex))) return null;
  const moduleIndex = Math.max(0, Math.min(7, Number(parsed.moduleIndex)));
  const diagnosis = cleanString(parsed.diagnosis, 900);
  const directive = cleanString(parsed.directive, 900);
  const artifact = cleanString(parsed.artifact, 500);
  if (!diagnosis || !directive || !artifact) return null;

  let bpm = null;
  if (parsed.bpm !== null && parsed.bpm !== undefined && parsed.bpm !== '') {
    const n = Number(parsed.bpm);
    if (Number.isFinite(n) && n >= 40 && n <= 260) bpm = Math.round(n);
  }

  const stage = parsed.stage === null || parsed.stage === undefined
    ? null
    : cleanString(String(parsed.stage), 80) || null;
  const rawConfidence = String(parsed.confidence || '').toUpperCase();
  const confidence = ['HIGH', 'MEDIUM', 'ASSISTED'].includes(rawConfidence) ? rawConfidence : 'MEDIUM';

  return { moduleIndex, diagnosis, directive, artifact, bpm, stage, confidence };
}

exports.dmfTraining = onRequest({
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 5,
  secrets: [VBC_SERVICE_KEY],
  cors: false,
}, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST required' });
  }

  const origin = String(req.headers.origin || '');
  const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (origin && !ALLOWED_ORIGINS.has(origin) && !localOrigin) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }

  if (!allowRequest(req)) {
    return res.status(429).json({ ok: false, error: 'Training signal rate limit reached' });
  }

  const body = req.body || {};
  const text = cleanString(body.text, 1200);
  const lang = body.lang === 'es' ? 'es' : 'en';
  if (text.length < 12) {
    return res.status(400).json({ ok: false, error: 'Transmission is too short' });
  }

  const profile = sanitizeObject(body.profile, ['mission', 'system', 'discipline']);
  const oracle = sanitizeObject(body.oracle, ['blocker']);
  const history = Array.isArray(body.history)
    ? body.history.slice(0, 3).map((item) => ({
        text: cleanString(item?.text, 320),
        module: Number.isInteger(Number(item?.module)) ? Number(item.module) : null,
      })).filter((item) => item.text)
    : [];

  const serviceKey = VBC_SERVICE_KEY.value();
  if (!serviceKey) {
    return res.status(503).json({ ok: false, error: 'VBC uplink is not configured' });
  }

  const idempotencyKey = `dmf-${crypto.randomUUID()}`;
  const userPrompt = JSON.stringify({
    studentTransmission: text,
    language: lang,
    codexProfile: profile,
    oracleState: oracle,
    recentSignals: history,
  }, null, 2);

  const startedAt = Date.now();
  try {
    const response = await fetch(VBC_COMPUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VBC-Service-Key': serviceKey,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        task: 'chat',
        priority: 'standard',
        complexity: 'medium',
        engine: 'auto',
        system: buildSystem(lang),
        prompt: userPrompt,
        maxTokens: 700,
        context: {
          product: 'dmf-academy',
          interface: 'transmission-10',
          profile,
          oracle,
        },
        idempotencyKey,
      }),
      signal: AbortSignal.timeout(18_000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      console.error('[DMF uplink] VBC rejected request', response.status, data.code || data.error || 'unknown');
      return res.status(502).json({ ok: false, error: 'VBC uplink unavailable' });
    }

    const parsed = normalizeOutput(extractJson(data.result));
    if (!parsed) {
      console.error('[DMF uplink] Could not parse structured training response');
      return res.status(502).json({ ok: false, error: 'Training response was not structured' });
    }

    return res.json({
      ok: true,
      ...parsed,
      source: `VBC COMPUTE / ${String(data.engine || 'auto').toUpperCase()}`,
      engine: data.engine || 'auto',
      fallback: !!data.fallback,
      costUnits: Number(data.costUnits || 0),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('[DMF uplink] request failed', error.message);
    return res.status(502).json({ ok: false, error: 'VBC uplink timeout' });
  }
});
