'use strict';

// ACADEMY PAGES — /login, /academy and /payment-result speak Spanish by default (English when the visitor chose it
// via dmf_lang), carry the DMF icon and metadata, and keep every authentication, payment and access guard intact.
// The translation is presentation only; this suite pins the logic by content so it holds on a shallow checkout.
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PAGES = {
  login: { file: 'public/login.html', route: '/login' },
  academy: { file: 'public/academy.html', route: '/academy' },
  result: { file: 'public/payment-result.html', route: '/payment-result' },
};
for (const k of Object.keys(PAGES)) PAGES[k].html = read(PAGES[k].file);
const LOGIN = PAGES.login.html;
const ACADEMY = PAGES.academy.html;
const RESULT = PAGES.result.html;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
function all(re, s) { const out = []; let m; while ((m = re.exec(s))) out.push(m); return out; }
function i18nScript(html) {
  const i = html.indexOf('window.DMF_I18N = (function () {');
  assert.ok(i > 0, 'DMF_I18N present');
  return html.slice(i, html.indexOf('</script>', i));
}
function dictionary(html) {
  const s = i18nScript(html);
  const a = s.indexOf('var UI = ') + 'var UI = '.length;
  return JSON.parse(s.slice(a, s.indexOf(';\n  function t(', a)));
}
function mainScript(html) {
  // Every inline script except the language helper (which is checked on its own).
  return all(/<script>([\s\S]*?)<\/script>/g, html).map((m) => m[1]).filter((s) => !s.includes('window.DMF_I18N = (function')).join('\n');
}

test('Spanish is the default document language; dmf_lang (es | en) is honoured, never inferred from the browser', function () {
  for (const k of Object.keys(PAGES)) {
    const html = PAGES[k].html;
    assert.ok(html.startsWith('<!DOCTYPE html>\n<html lang="es">'), k);
    assert.ok(html.includes("(function(){var l='es';try{var s=localStorage.getItem('dmf_lang');if(s==='en'||s==='es')l=s;}catch(e){}document.documentElement.lang=l;})();"), k + ' bootstrap');
    assert.ok(!/navigator\.languages?/.test(i18nScript(html)), k + ' no browser-language guess');
  }
});

test('favicon, theme colour, description, robots and Open Graph metadata on every page', function () {
  const icon = read('index.html').match(/<link rel="icon" type="image\/svg\+xml" href="[^"]+">/)[0];
  for (const k of Object.keys(PAGES)) {
    const html = PAGES[k].html;
    assert.ok(html.includes(icon), k + ' same inline icon as the landing');
    assert.ok(html.includes('<meta name="theme-color" content="#0a0806">') && html.includes('<meta name="color-scheme" content="dark">'), k);
    assert.ok(/<meta name="description" content="[^"]{30,}">/.test(html), k + ' description');
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), k + ' private pages stay out of search results');
    assert.ok(html.includes('<meta property="og:url" content="https://dmf.vibraalto.cl' + PAGES[k].route + '">'), k + ' og:url');
    for (const p of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:image', 'og:locale'])
      assert.ok(html.includes('property="' + p + '"'), k + ' ' + p);
    assert.equal((html.match(/<title>/g) || []).length, 1, k);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    assert.equal(title, dictionary(html).es.pageTitle, k + ' static title is the Spanish one');
  }
});

test('dictionaries are complete: same keys in ES and EN, no empty values, every key used exists', function () {
  for (const k of Object.keys(PAGES)) {
    const html = PAGES[k].html;
    const ui = dictionary(html);
    assert.deepEqual(Object.keys(ui.en).sort(), Object.keys(ui.es).sort(), k + ' ES/EN key sets');
    for (const lang of ['es', 'en']) for (const key of Object.keys(ui[lang])) assert.ok(String(ui[lang][key]).trim(), k + ' empty ' + lang + '.' + key);
    const used = new Set([
      ...all(/data-i18n(?:-placeholder)?="([^"]+)"/g, html).map((m) => m[1]),
      ...all(/\bT\('([^']+)'\)/g, mainScript(html)).map((m) => m[1]),
      'pageTitle', 'langSwitch', 'langSwitchAria',
    ]);
    assert.deepEqual([...used].filter((key) => !(key in ui.es)), [], k + ' keys used but not defined');
    assert.deepEqual(Object.keys(ui.es).filter((key) => !used.has(key)), [], k + ' keys defined but never used');
    assert.ok(Object.keys(ui.es).some((key) => ui.es[key] !== ui.en[key]), k + ' actually translated');
  }
});

test('first paint is Spanish: static markup carries the Spanish strings; the helper runs before Firebase loads', function () {
  for (const k of Object.keys(PAGES)) {
    const html = PAGES[k].html;
    const es = dictionary(html).es;
    for (const m of all(/data-i18n="([^"]+)"[^>]*>([^<]*)</g, html)) assert.equal(m[2], es[m[1]], k + ' ' + m[1]);
    const apply = html.indexOf('<script>window.DMF_I18N.apply();</script>');
    assert.ok(apply > 0 && apply < html.indexOf('<script src="/academy-env.js"></script>'), k + ' apply before the auth scripts');
    assert.ok(html.includes('data-lang-switch>English</button>'), k + ' language switch');
  }
  assert.ok(LOGIN.includes('id="formTitle">Acceso estudiantes<') && LOGIN.includes('id="loginBtn">Entrar al portal<'));
  assert.ok(LOGIN.includes('<span id="toggleText">¿No tienes cuenta?</span>'));
  assert.ok(!/>(Student Access|Enter Portal|Access Required|Processing Payment|Submit Work for Review|Logout)</.test(LOGIN + ACADEMY + RESULT), 'no English left in the static markup');
});

test('translated strings are plain text (they may be concatenated into markup, so no <, >, & or quotes)', function () {
  for (const k of Object.keys(PAGES)) {
    const ui = dictionary(PAGES[k].html);
    for (const lang of ['es', 'en']) for (const key of Object.keys(ui[lang])) assert.ok(!/[<>&"]/.test(ui[lang][key]), k + ' ' + lang + '.' + key);
  }
});

test('the language helper only reads/writes dmf_lang and touches nothing else', function () {
  for (const k of Object.keys(PAGES)) {
    const full = i18nScript(PAGES[k].html);
    const s = full.slice(0, full.indexOf('var UI = ')) + full.slice(full.indexOf(';\n  function t('));   // code only, not the copy
    assert.ok(!/firebase|firestore|fetch\(|XMLHttpRequest|sessionStorage|location\.search|URLSearchParams|innerHTML|purchase|enroll|token/i.test(s), k);
    assert.deepEqual(all(/localStorage\.\w+\('([^']+)'/g, s).map((m) => m[1]).filter((x) => x !== 'dmf_lang'), [], k + ' only dmf_lang');
  }
});

test('/login keeps its auth and checkout flow', function () {
  const js = mainScript(LOGIN);
  assert.ok(js.includes('var DEMO_MODE = !!(window.__DMF_ACADEMY_DEMO__);'), 'demo only from the build-time flag');
  assert.ok(!/location\.search|URLSearchParams|[?&]demo/.test(js), 'no URL switch for demo mode');
  assert.ok(js.includes("? 'https://dmf-payments-sandbox.vibraalto-cl.workers.dev'") && js.includes("(window.__DMF_PAYMENTS_URL__ || 'https://dmf-payments.vibraalto-cl.workers.dev')"));
  assert.ok(js.includes('firebase.auth().createUserWithEmailAndPassword(email, password)') && js.includes('firebase.auth().signInWithEmailAndPassword(email, password)'));
  assert.ok(js.includes("fetch(PAYMENTS_URL + '/create-preference', {") && js.includes("'Authorization': 'Bearer ' + idToken") && js.includes('body: JSON.stringify({ productId: intent })'));
  assert.ok(js.includes("sessionStorage.getItem('dmf_purchase_intent')") && js.includes("sessionStorage.removeItem('dmf_purchase_intent');"));
  assert.ok(js.includes('if (password.length < 6) {') && js.includes('if (password !== confirm) {'));
  assert.ok(js.includes('errorEl.textContent = msg;') && !/innerHTML|insertAdjacentHTML/.test(js), 'messages are text');
});

test('/payment-result verifies with the server only; never grants from URL parameters', function () {
  const js = mainScript(RESULT);
  assert.ok(js.includes('if (!purchaseId) {'), 'purchaseId required');
  assert.ok(js.includes("fetch(PAYMENTS_URL + '/check-status?purchaseId=' + encodeURIComponent(purchaseId), {") && js.includes("headers: { 'Authorization': 'Bearer ' + idToken }"));
  assert.ok(js.includes("if (data.enrolled) {\n            showState('approved', T('welcomeTitle'), T('welcomeMsg'));"), 'welcome only when the server says enrolled');
  assert.deepEqual(all(/params\.get\('([^']+)'\)/g, js).map((m) => m[1]).sort(), ['paymentEnvironment', 'purchaseId'], 'no status/approved parameter is read');
  assert.ok(!/innerHTML|insertAdjacentHTML/.test(js), 'buttons are built with textContent');
  assert.ok(js.includes('a.textContent = label;'));
  assert.ok(js.includes('var maxAttempts = 20;') && js.includes('var pollInterval = 3000;'));
});

test('/academy keeps its access guard, entitlement check and signed playback', function () {
  const js = mainScript(ACADEMY);
  assert.ok(js.includes("firebase.firestore().collection('enrollments').doc(uid).get()") && js.includes("callback(!!(data && data.status === 'active'));"));
  assert.ok(js.includes('firebase.auth().onAuthStateChanged(function (user) {'));
  assert.equal((js.match(/window\.location\.href = '\/login';/g) || []).length, 5, 'anonymous and signed-out visitors go to /login');
  assert.ok(js.includes('var DEMO_MODE = !!(window.__DMF_ACADEMY_DEMO__);'));
  assert.ok(!/location\.search|URLSearchParams/.test(js), 'nothing is read from the query string');
  assert.ok(js.includes("fetch(signerUrl + '/stream-token', {") && js.includes("'Authorization': 'Bearer ' + idToken"));
  assert.ok(js.includes('function hasCourseAccess() {\n    return hasAccess;\n  }'));
  assert.ok(js.includes('if (!hasCourseAccess()) {\n      noAccessView.style.display = \'block\';'));
  assert.ok(js.includes("var lang = window.DMF_I18N.lang;") && js.includes("return obj[lang] || obj.es || obj.en || '';"), 'course data follows the visitor language');
  const cfg = read('public/academy-config.js');
  assert.ok(/title: \{ en: '[^']+', es: '[^']+' \}/.test(cfg), 'course data is bilingual');
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/academy-pages-i18n.test.cjs'));
  assert.ok(read('.github/workflows/validate-3d.yml').includes('node scripts/overdrive/test/academy-pages-i18n.test.cjs'));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
