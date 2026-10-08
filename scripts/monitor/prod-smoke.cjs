#!/usr/bin/env node
'use strict';

// DMF production monitor — read-only smoke checks of what a visitor, a student and a buyer depend on.
// Run by .github/workflows/monitor.yml every 3 hours; runnable by hand:
//
//   node scripts/monitor/prod-smoke.cjs                                  # production
//   node scripts/monitor/prod-smoke.cjs --base http://localhost:8765 --skip-workers
//   node scripts/monitor/prod-smoke.cjs --summary "$GITHUB_STEP_SUMMARY" --json monitor.json
//
// Three groups: landing (the page, its runtime, prices, 3D assets), técnica (Academy pages, runtime config,
// payment and video Workers) and soporte (contact and legal reachable). Every request is a GET/HEAD, except
// one unauthenticated POST to the video signer that must be refused (proof it is alive, no side effects).
// Exit code 1 when any "error" check fails; "warn" checks are reported but never fail the run.

const fs = require('fs');

const DEFAULTS = {
  base: 'https://dmf.vibraalto.cl',
  payments: 'https://dmf-payments.vibraalto-cl.workers.dev',
  klap: 'https://dmf-klap-payments.vibraalto-cl.workers.dev',
  signer: 'https://dmf-stream-signer.vibraalto-cl.workers.dev',
  timeoutMs: 15000,
  slowMs: 8000
};
const SUPPORT_MAIL = 'mailto:Demian.muller@gmail.com';
const STARTER_PRICE = "tierStarterPrice:'$100'";

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip-workers') o.skipWorkers = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
  }
  return o;
}

async function request(fetchImpl, url, init, timeoutMs) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  const t0 = Date.now();
  try {
    const r = await fetchImpl(url, Object.assign({ redirect: 'follow', signal: ctrl ? ctrl.signal : undefined }, init || {}));
    const body = init && init.method === 'HEAD' ? '' : await r.text();
    return { status: r.status, body, headers: r.headers, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, body: '', headers: null, ms: Date.now() - t0, error: e && e.name === 'AbortError' ? 'timeout' : String(e && e.message || e) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function header(r, name) { return r.headers && typeof r.headers.get === 'function' ? r.headers.get(name) : null; }

// Each check: { group, name, level: 'error' | 'warn', ok, detail }.
async function runChecks(opts, fetchImpl) {
  const cfg = Object.assign({}, DEFAULTS, opts || {});
  const base = cfg.base.replace(/\/+$/, '');
  const get = (url, init) => request(fetchImpl, url, init, cfg.timeoutMs);
  const out = [];
  const add = (group, name, level, ok, detail) => out.push({ group, name, level, ok: !!ok, detail: detail || '' });
  const page = async (path) => get(base + path);
  const status = (r) => (r.error ? r.error : 'HTTP ' + r.status) + ' · ' + r.ms + ' ms';
  // The Workers answer only the landing's own origin (403 "Origin not allowed" otherwise), so every Worker
  // request carries the Origin header a visitor's browser would send.
  const landingOrigin = new URL(base).origin;

  // ---------------- landing ----------------
  const home = await page('/');
  add('landing', 'Landing responde', 'error', home.status === 200, status(home));
  add('landing', 'Landing carga en < ' + cfg.slowMs / 1000 + ' s', 'warn', home.status === 200 && home.ms < cfg.slowMs, home.ms + ' ms');
  const markers = [['runtime 3D (relic)', 'DMF RELIC RUNTIME'], ['capa de audio', 'DMF HYPERRESONANCE'], ['grilla de precios', 'id="tiersGrid"'],
    ['botón de compra', 'buyWithMP'], ['router de pagos', '/commerce/payment-router.js']];
  for (const [label, m] of markers) add('landing', 'Landing incluye ' + label, 'error', home.body.includes(m), m);
  add('landing', 'Precio Starter de lanzamiento (USD 100)', 'error', home.body.includes(STARTER_PRICE), STARTER_PRICE);
  for (const [path, needle] of [['/commerce/payment-router.js', 'DMFCommerce'], ['/commerce/analytics.js', 'dmfTrack']]) {
    const r = await page(path);
    add('landing', path, 'error', r.status === 200 && r.body.includes(needle), status(r));
  }
  for (const [path, min] of [['/assets/models/dmf-studio-web.glb', 1e6], ['/assets/models/dmf-studio-optimized.glb', 1e6], ['/assets/images/dmf-relic-poster.webp', 1e4]]) {
    const r = await get(base + path, { method: 'HEAD' });
    const len = Number(header(r, 'content-length') || 0);
    add('landing', path, 'error', r.status === 200 && (len === 0 || len >= min), status(r) + (len ? ' · ' + Math.round(len / 1024) + ' KB' : ''));
  }

  // ---------------- técnica (Academy + payments + video) ----------------
  for (const [path, title] of [['/login', 'DMF Academy — Acceso estudiantes'], ['/academy', 'DMF Academy — Portal del estudiante'], ['/payment-result', 'DMF Academy — Resultado del pago']]) {
    const r = await page(path);
    add('tecnica', path, 'error', r.status === 200 && r.body.includes('<title>' + title + '</title>'), status(r));
  }
  const env = await page('/academy-env.js');
  const envOk = env.status === 200;
  add('tecnica', 'academy-env.js', 'error', envOk, status(env));
  for (const v of ['__DMF_FIREBASE_CONFIG__', '__DMF_STREAM_BASE__', '__DMF_STREAM_SIGNER_URL__', '__DMF_PAYMENTS_URL__', '__DMF_COMMERCE__']) {
    add('tecnica', 'Configuración ' + v, 'error', envOk && env.body.includes('window.' + v + ' ='), envOk ? 'presente: ' + env.body.includes('window.' + v + ' =') : 'sin academy-env.js');
  }
  let commerce = null;
  const cm = env.body.match(/window\.__DMF_COMMERCE__ = (\{.*\});/);
  if (cm) { try { commerce = JSON.parse(cm[1]); } catch (e) { commerce = null; } }
  const provider = commerce && commerce.payments ? commerce.payments.provider + (commerce.payments.klapEnabled ? ' (Klap activo)' : '') : 'desconocido';
  add('tecnica', 'Proveedor de pago configurado', 'warn', !!commerce, provider);
  const signerFromEnv = (env.body.match(/__DMF_STREAM_SIGNER_URL__ = "(https:\/\/[^"]+)"/) || [])[1];

  const ac = await page('/academy-config.js');
  const lessons = (ac.body.match(/streamUid: '([0-9a-f]{32})'/g) || []).length;
  const emptyLessons = (ac.body.match(/streamUid: ''/g) || []).length;
  add('tecnica', 'Clases publicadas en la Academy', 'error', ac.status === 200 && lessons > 0, lessons + ' lecciones con video' + (emptyLessons ? ' · ' + emptyLessons + ' sin video' : ''));
  add('tecnica', 'Todas las lecciones tienen video', 'warn', ac.status === 200 && emptyLessons === 0, emptyLessons + ' sin video');

  if (!cfg.skipWorkers) {
    const mp = await get(cfg.payments + '/health', { headers: { Origin: landingOrigin } });
    let mpJson = null; try { mpJson = JSON.parse(mp.body); } catch (e) { mpJson = null; }
    add('tecnica', 'Pagos Mercado Pago (Worker)', 'error', mp.status === 200 && mpJson && mpJson.ok === true, status(mp));
    const klapActive = !!(commerce && commerce.payments && commerce.payments.provider === 'klap' && commerce.payments.klapEnabled);
    const kl = await get(cfg.klap + '/health', { headers: { Origin: landingOrigin } });
    let klJson = null; try { klJson = JSON.parse(kl.body); } catch (e) { klJson = null; }
    add('tecnica', 'Pagos Klap (Worker)' + (klapActive ? '' : ' — no activo en la landing'), klapActive ? 'error' : 'warn',
      kl.status === 200 && klJson && klJson.ok === true && (!klapActive || klJson.configured === true), status(kl) + (klJson ? ' · configured=' + klJson.configured : ''));
    const signer = (signerFromEnv || cfg.signer).replace(/\/+$/, '');
    const sg = await get(signer + '/stream-token', { method: 'POST', headers: { Origin: landingOrigin, 'Content-Type': 'application/json' }, body: '{}' });
    add('tecnica', 'Firma de video (Stream signer) responde y exige sesión', 'error', sg.status === 401, status(sg) + ' (se espera 401)');
  }

  // ---------------- soporte ----------------
  add('soporte', 'Email de soporte en la landing', 'error', home.body.includes(SUPPORT_MAIL), SUPPORT_MAIL);
  const pr = await page('/payment-result');
  add('soporte', 'Botón de soporte en el resultado de pago', 'error', pr.body.includes(SUPPORT_MAIL), status(pr));
  for (const [path, h1] of [['/terminos', 'Términos y condiciones'], ['/privacidad', 'Política de privacidad'], ['/reembolsos', 'Política de reembolsos']]) {
    const r = await page(path);
    add('soporte', 'Página ' + path, 'warn', r.status === 200 && r.body.includes('<h1>' + h1 + '</h1>') && r.body.includes(SUPPORT_MAIL), status(r));
  }
  for (const path of ['/robots.txt', '/sitemap.xml']) {
    const r = await page(path);
    add('soporte', path, 'warn', r.status === 200 && !/<html/i.test(r.body), status(r));
  }
  return out;
}

function report(checks, meta) {
  const failed = checks.filter((c) => !c.ok && c.level === 'error');
  const warned = checks.filter((c) => !c.ok && c.level === 'warn');
  const head = failed.length ? '🔴 ' + failed.length + ' falla(s) crítica(s)' : (warned.length ? '🟡 OK con ' + warned.length + ' advertencia(s)' : '🟢 Todo OK');
  const groups = { landing: 'Landing', tecnica: 'Técnica (Academy, pagos, video)', soporte: 'Soporte y legal' };
  let md = '## Monitor de producción DMF — ' + head + '\n\n' + (meta || '') + '\n';
  for (const g of Object.keys(groups)) {
    md += '\n### ' + groups[g] + '\n\n| | Chequeo | Detalle |\n|---|---|---|\n';
    for (const c of checks.filter((x) => x.group === g)) md += '| ' + (c.ok ? '✅' : (c.level === 'error' ? '❌' : '⚠️')) + ' | ' + c.name + ' | ' + String(c.detail).replace(/\|/g, '\\|') + ' |\n';
  }
  return { failed, warned, head, md };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const opts = {};
  if (args.base) opts.base = args.base;
  if (args.skipWorkers) opts.skipWorkers = true;
  const checks = await runChecks(opts, fetch);
  const meta = 'Base: ' + (opts.base || DEFAULTS.base) + ' · ' + new Date().toISOString();
  const r = report(checks, meta);
  if (args.summary) fs.appendFileSync(args.summary, r.md);
  if (args.json) fs.writeFileSync(args.json, JSON.stringify({ head: r.head, failed: r.failed, warned: r.warned, checks }, null, 2));
  process.stdout.write(r.md + '\n');
  process.exitCode = r.failed.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { runChecks, report, DEFAULTS, STARTER_PRICE, SUPPORT_MAIL };
