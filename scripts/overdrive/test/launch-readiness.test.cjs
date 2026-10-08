'use strict';

// LAUNCH READINESS — what a buyer meets around the purchase: the payment result page never tells someone who may
// already have paid that they were declined; Pro / Elite buyers learn the next step; the legal pages exist, are
// served and linked; SEO basics; the Elite CTA says what it does. Behavioural checks run the real page script.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const RESULT = read('public/payment-result.html');
const SRC = read('index.html');
const OUT = read('public/index.html');
const LOGIN = read('public/login.html');
const LEGAL = ['terminos', 'privacidad', 'reembolsos'];

let passed = 0;
let failed = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

// --- the real payment-result scripts in a minimal DOM ---
const inline = [...RESULT.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
function el(id) {
  const node = { id, textContent: '', className: '', style: {}, href: '', children: [], listeners: {},
    appendChild(c) { this.children.push(c); return c; }, removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
    addEventListener(t, f) { this.listeners[t] = f; }, setAttribute() {}, getAttribute() { return null; } };
  Object.defineProperty(node, 'firstChild', { get() { return this.children[0] || null; } });
  return node;
}
async function runResult({ search, firebase, status }) {
  const els = {};
  ['resultTitle', 'resultMsg', 'resultStatus', 'resultSpinner', 'resultActions', 'resultCard'].forEach((id) => { els[id] = el(id); });
  const document = { documentElement: { lang: 'es' }, getElementById: (id) => els[id] || null, querySelectorAll: () => [], createElement: (t) => el(t), title: '' };
  const window = { location: { search, reload() {} }, document, localStorage: { getItem: () => null, setItem() {} } };
  window.window = window;
  window.firebase = firebase;
  window.fetch = async () => ({ json: async () => status });
  const ctx = vm.createContext({ window, document, localStorage: window.localStorage, URLSearchParams, setTimeout: () => 0, console, firebase, fetch: window.fetch, Object, String, Math, Date, encodeURIComponent, Promise });
  for (const code of [inline[0], inline[inline.length - 1]]) vm.runInContext(code, ctx);
  for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
  const a = els.resultActions.children.map((c) => ({ text: c.textContent, href: c.href }));
  return { title: els.resultTitle.textContent, msg: els.resultMsg.textContent, badge: els.resultStatus.textContent, cls: els.resultStatus.className, actions: a };
}
function fakeFirebase(user) {
  return { auth: () => ({ currentUser: user, onAuthStateChanged: (cb) => cb(user) }) };
}
const signedIn = { getIdToken: () => Promise.resolve('token') };
const NEVER_PAY_AGAIN = /otro medio de pago/i;

test('no session on return (e.g. paid in the MP app, back in another browser): neutral, sign in, never "pay again"', async () => {
  const r = await runResult({ search: '?purchaseId=dmf-1', firebase: fakeFirebase(null) });
  assert.equal(r.badge, 'Inicia sesión');
  assert.ok(!/rejected/.test(r.cls), 'not styled as declined: ' + r.cls);
  assert.ok(/no vuelvas a pagar/i.test(r.msg), r.msg);
  assert.ok(r.actions.some((a) => a.href === '/login'), 'sign-in button');
  assert.ok(!r.actions.some((a) => NEVER_PAY_AGAIN.test(a.text)), 'no retry-payment button');
});

test('auth service down: neutral, retry + support, never "declined"', async () => {
  const r = await runResult({ search: '?purchaseId=dmf-1', firebase: undefined });
  assert.ok(!/rejected/.test(r.cls) && r.badge !== 'Rechazado', r.badge + ' / ' + r.cls);
  assert.ok(/tu pago queda registrado/i.test(r.msg), r.msg);
  assert.ok(r.actions.some((a) => /^mailto:/.test(a.href)), 'support');
  assert.ok(!r.actions.some((a) => NEVER_PAY_AGAIN.test(a.text)));
});

test('invalid link: says so, offers the way back, never "declined"', async () => {
  const r = await runResult({ search: '', firebase: fakeFirebase(signedIn) });
  assert.equal(r.badge, 'Enlace no válido');
  assert.ok(!/rejected/.test(r.cls));
  assert.ok(!r.actions.some((a) => NEVER_PAY_AGAIN.test(a.text)));
});

test('a real provider decline is still shown as declined, with the retry', async () => {
  const r = await runResult({ search: '?purchaseId=dmf-1', firebase: fakeFirebase(signedIn), status: { ok: true, enrolled: false, status: 'rejected' } });
  assert.equal(r.badge, 'Rechazado');
  assert.ok(r.actions.some((a) => NEVER_PAY_AGAIN.test(a.text)));
  assert.equal((RESULT.match(/showState\('rejected'/g) || []).length, 1, 'only the provider decline uses the declined state');
});

test('Pro / Elite approved: the next step (live classes within 24 h) and a scheduling contact; Starter: none', async () => {
  for (const productId of ['pro', 'elite']) {
    const r = await runResult({ search: '?purchaseId=dmf-1', firebase: fakeFirebase(signedIn), status: { ok: true, enrolled: true, productId } });
    assert.equal(r.badge, 'Aprobado');
    assert.ok(/clases en vivo/.test(r.msg) && /24 horas/.test(r.msg), r.msg);
    assert.ok(r.actions.some((a) => a.text === 'Agendar mis clases →' && /^mailto:.*clases%20en%20vivo/.test(a.href)), JSON.stringify(r.actions));
    assert.ok(r.actions.some((a) => a.href === '/academy'), 'still enters the Academy');
  }
  const s = await runResult({ search: '?purchaseId=dmf-1', firebase: fakeFirebase(signedIn), status: { ok: true, enrolled: true, productId: 'starter' } });
  assert.ok(!/clases en vivo/.test(s.msg) && !s.actions.some((a) => /Agendar/.test(a.text)));
});

test('Elite CTA describes a purchase, not an application', () => {
  for (const html of [SRC, OUT]) {
    assert.ok(html.includes("tierEliteCta:'Inscribirme en Elite'") && html.includes("tierEliteCta:'Join Elite'"));
    assert.ok(!/tierEliteCta:'(Postular|Apply)/.test(html));
  }
});

test('legal pages: present, complete, consistent with the landing guarantee, no placeholders', () => {
  const guarantee = /30 d[ií]as/;
  assert.ok(SRC.includes('Garant\\u00eda de devoluci\\u00f3n a 30 d\\u00edas'), 'the landing promises 30 days');
  for (const slug of LEGAL) {
    const p = read('public/' + slug + '.html');
    assert.ok(p.startsWith('<!doctype html>') && p.includes('<html lang="es">'), slug);
    assert.ok(p.includes('mailto:Demian.muller@gmail.com'), slug + ': seller contact');
    assert.ok(p.includes('<link rel="canonical" href="https://dmf.vibraalto.cl/' + slug + '">'), slug + ': canonical');
    assert.ok(!/\[(completar|RUT|TODO)|\bTODO\b|XXX|[Ll]orem ipsum/.test(p), slug + ': no placeholder text');
    for (const other of LEGAL) if (other !== slug) assert.ok(p.includes('href="/' + other + '"'), slug + ' links ' + other);
  }
  const terms = read('public/terminos.html'), refunds = read('public/reembolsos.html'), privacy = read('public/privacidad.html');
  assert.ok(guarantee.test(terms) && guarantee.test(refunds), '30-day guarantee in terms and refunds');
  assert.ok(/100% de lo pagado/.test(refunds) && /sin preguntas/i.test(refunds), 'same promise as the landing');
  assert.ok(/Ley 19\.496/.test(terms) && /retract/i.test(terms) && /retract/i.test(refunds), 'consumer law / right of withdrawal');
  assert.ok(/SERNAC/.test(terms), 'where to complain');
  assert.ok(/Ley 19\.628/.test(privacy) && /no recibimos ni guardamos datos de tu tarjeta/i.test(privacy), 'privacy law, no card data');
  for (const provider of ['Mercado Pago', 'Klap', 'Firebase', 'Cloudflare']) assert.ok(privacy.includes(provider), 'processor named: ' + provider);
});

test('legal pages are served (Firebase rewrites before the catch-all, dev server) and linked (footer, signup)', () => {
  const fb = JSON.parse(read('firebase.json'));
  const rw = fb.hosting.rewrites.map((r) => r.source);
  for (const slug of LEGAL) {
    const i = rw.indexOf('/' + slug);
    assert.ok(i >= 0 && i < rw.indexOf('**'), '/' + slug + ' rewrite before **');
    assert.equal(fb.hosting.rewrites[i].destination, '/' + slug + '.html');
    assert.ok(read('scripts/dev-hyperdrive.cjs').includes("[/^\\/" + slug + "\\/?$/, '" + slug + ".html']"), 'dev route ' + slug);
    for (const html of [SRC, OUT]) assert.ok(html.includes('<a href="/' + slug + '" data-i18n='), 'footer links ' + slug);
  }
  assert.ok(SRC.includes("footerTerms:'Terms'") && SRC.includes("footerTerms:'T\\u00e9rminos'"), 'footer labels in EN and ES');
  assert.ok(LOGIN.includes('<a href="/terminos" data-i18n="legalTerms">') && LOGIN.includes('<a href="/privacidad" data-i18n="legalPrivacy">'), 'consent at signup');
});

test('SEO: robots keeps private routes out and points to the sitemap; sitemap lists the public pages', () => {
  const robots = read('public/robots.txt'), sitemap = read('public/sitemap.xml');
  for (const r of ['/academy', '/login', '/payment-result']) assert.ok(robots.includes('Disallow: ' + r), r);
  assert.ok(robots.includes('Sitemap: https://dmf.vibraalto.cl/sitemap.xml'));
  for (const u of ['/', '/terminos', '/privacidad', '/reembolsos']) assert.ok(sitemap.includes('<loc>https://dmf.vibraalto.cl' + u + '</loc>'), u);
  assert.ok(!/academy|login|payment-result/.test(sitemap), 'no private routes in the sitemap');
});

test('social image: a real 1200×630 JPEG, identical in assets/ and public/, referenced by og and twitter', () => {
  const a = fs.readFileSync(path.join(ROOT, 'assets/images/dmf-og.jpg'));
  assert.ok(a.equals(fs.readFileSync(path.join(ROOT, 'public/assets/images/dmf-og.jpg'))));
  assert.equal(a.readUInt16BE(0), 0xffd8, 'JPEG');
  let i = 2, dims = null;
  while (i < a.length && !dims) {
    const marker = a.readUInt16BE(i), len = a.readUInt16BE(i + 2);
    if (marker >= 0xffc0 && marker <= 0xffc2) dims = [a.readUInt16BE(i + 7), a.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  assert.deepEqual(dims, [1200, 630]);
  assert.ok(a.length < 200 * 1024, 'light enough for link previews');
  for (const html of [SRC, OUT]) {
    assert.ok(html.includes('<meta property="og:image" content="https://dmf.vibraalto.cl/assets/images/dmf-og.jpg">'));
    assert.ok(html.includes('<meta property="og:image:width" content="1200">') && html.includes('<meta property="og:image:height" content="630">'));
    assert.ok(html.includes('<meta name="twitter:image" content="https://dmf.vibraalto.cl/assets/images/dmf-og.jpg">'));
  }
});

test('registered in npm run test:hyperdrive and in CI', () => {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/launch-readiness.test.cjs'));
  assert.ok(read('.github/workflows/validate-3d.yml').includes('node scripts/overdrive/test/launch-readiness.test.cjs'));
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); console.log('PASS: ' + name); passed++; }
    catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
  }
  console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
  if (failed > 0) process.exit(1);
})();
