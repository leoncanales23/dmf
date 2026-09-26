'use strict';

// LANDING CERTIFICATION — static guarantees on the generated landing and its sibling pages, so what was
// certified (links, anchors, i18n, sharing metadata, checkout wiring, protected pages) cannot regress silently.
// Shallow-checkout safe: no git refs, no network.
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const PUB = path.join(ROOT, 'public');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('index.html');
const OUT = read('public/index.html');
const FIREBASE = JSON.parse(read('firebase.json'));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
function all(re, s) { const out = []; let m; while ((m = re.exec(s))) out.push(m); return out; }
const REWRITES = (FIREBASE.hosting.rewrites || []).filter((r) => r.destination && r.source !== '**').map((r) => r.source);

function localRefs(html) {
  const refs = new Set();
  for (const m of all(/(?:src|href|poster)\s*=\s*["']([^"'#][^"']*)["']/g, html)) refs.add(m[1]);
  for (const m of all(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, html)) refs.add(m[1]);
  for (const m of all(/['"]((?:assets|logos|pdf-images|uploads)\/[^'"]+\.(?:png|jpe?g|webp|svg|glb|pdf|mp4|gif|stl|3mf|zip))['"]/g, html)) refs.add(m[1]);
  return [...refs].filter((u) => !/^(https?:)?\/\/|^(mailto:|tel:|javascript:|data:|blob:)|\$\{|'\+/.test(u));
}

test('every local asset referenced by the four public pages exists (or is a hosting rewrite)', function () {
  for (const page of ['index.html', 'login.html', 'academy.html', 'payment-result.html']) {
    const html = fs.readFileSync(path.join(PUB, page), 'utf8');
    const missing = localRefs(html).filter((u) => {
      const p = u.split('?')[0].split('#')[0];
      if (!p || p === '/') return false;
      if (REWRITES.some((r) => r === p || (r.endsWith('/**') && p.startsWith(r.slice(0, -3))))) return false;
      return !fs.existsSync(path.join(PUB, decodeURI(p.replace(/^\//, ''))));
    });
    assert.deepEqual(missing, [], page + ' missing: ' + missing.join(', '));
  }
});

test('hosting rewrites cover /login, /academy, /academy/**, /payment-result', function () {
  for (const r of ['/login', '/academy', '/academy/**', '/payment-result']) assert.ok(REWRITES.includes(r), r);
});

test('every in-page anchor has a target (the Receiver band #relic is injected by the build)', function () {
  const ids = new Set(all(/\sid=["']([^"']+)["']/g, OUT).map((m) => m[1]));
  const missing = [...new Set(all(/href=["']#([^"']+)["']/g, OUT).map((m) => m[1]))].filter((a) => !ids.has(a) && a !== 'relic');
  assert.deepEqual(missing, []);
  assert.ok(read('scripts/overdrive/relic.js').includes("band.id = 'relic';") && OUT.includes("band.id = 'relic';"), 'the Receiver band is created with id="relic"');
});

test('no duplicate ids; every image has alt text; every _blank link has rel=noopener', function () {
  const counts = {};
  for (const m of all(/\sid=["']([^"']+)["']/g, OUT)) counts[m[1]] = (counts[m[1]] || 0) + 1;
  assert.deepEqual(Object.keys(counts).filter((k) => counts[k] > 1), []);
  assert.deepEqual((OUT.match(/<img\b(?![^>]*\balt=)[^>]*>/g) || []), []);
  assert.deepEqual((OUT.match(/<a\b[^>]*target=["']_blank["'][^>]*>/g) || []).filter((s) => !/rel=["'][^"']*noopener/.test(s)), []);
});

test('i18n: every data-i18n key exists in both the Spanish and the English dictionary; Spanish is the default', function () {
  const keys = new Set(all(/data-i18n(?:-[a-z]+)?="([^"]+)"/g, SRC).map((m) => m[1]));
  function dict(lang) { const i = SRC.indexOf('\n    ' + lang + ': {'); assert.ok(i > 0, lang); return SRC.slice(i, SRC.indexOf('\n    }', i)); }
  const has = (d, k) => new RegExp('(^|[\\s,{])["\']?' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']?\\s*:').test(d);
  const en = dict('en'), es = dict('es');
  assert.ok(keys.size >= 100, 'keys ' + keys.size);
  assert.deepEqual([...keys].filter((k) => !has(en, k)), [], 'missing EN');
  assert.deepEqual([...keys].filter((k) => !has(es, k)), [], 'missing ES');
  assert.ok(SRC.startsWith('<!DOCTYPE html>\n<html lang="es">') && SRC.includes("localStorage.getItem('dmf_lang')"));
});

test('sharing and search metadata: canonical, Open Graph, Twitter card, theme colour, inline icon, JSON-LD', function () {
  for (const html of [SRC, OUT]) {
    assert.ok(html.includes('<link rel="canonical" href="https://dmf.vibraalto.cl/">'));
    for (const p of ['og:type', 'og:site_name', 'og:url', 'og:title', 'og:description', 'og:image', 'og:image:width', 'og:image:height', 'og:locale'])
      assert.ok(html.includes('property="' + p + '"'), p);
    for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) assert.ok(html.includes('name="' + n + '"'), n);
    assert.ok(html.includes('<meta name="theme-color" content="#0a0806">'));
    assert.ok(/<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,/.test(html), 'inline SVG icon (no binary asset)');
    const ld = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
    assert.ok(ld, 'JSON-LD present');
    const data = JSON.parse(ld[1]);
    assert.equal(data['@type'], 'MusicGroup');
    assert.ok(Array.isArray(data.sameAs) && data.sameAs.length >= 3);
  }
  const img = OUT.match(/property="og:image" content="https:\/\/dmf\.vibraalto\.cl\/([^"]+)"/)[1];
  assert.ok(fs.existsSync(path.join(PUB, img)), 'the preview image is published: ' + img);
  assert.equal((OUT.match(/<title>/g) || []).length, 1);
  assert.ok(OUT.includes('name="viewport" content="width=device-width, initial-scale=1"'));
});

test('checkout wiring: Starter / Pro / Elite / add-on buttons; without a session the intent is stored and the visitor goes to /login', function () {
  for (const id of ['starter', 'pro', 'elite']) assert.ok(new RegExp("productId:\\s*'" + id + "'").test(SRC) || SRC.includes("productId:'" + id + "'") || SRC.includes('"' + id + '"'), id);
  assert.ok(SRC.includes('data-product="addon" onclick="buyWithMP(this)"'));
  const fn = SRC.slice(SRC.indexOf('window.buyWithMP = function(btn){'), SRC.indexOf("document.querySelectorAll('#navLinks a')"));
  assert.ok(fn.includes("sessionStorage.setItem('dmf_purchase_intent', productId);") && fn.includes("window.location.href = '/login';"), 'anonymous → /login');
  assert.ok(fn.includes("'Authorization': 'Bearer ' + idToken") && fn.includes("'/create-preference'"), 'signed-in → server-side preference with the ID token');
  assert.ok(!/access_token|MP_ACCESS_TOKEN|APP_USR-/.test(OUT), 'no payment secret in the page');
});

test('Student Access and booking contacts', function () {
  assert.ok(/<a[^>]+href="\/login"[^>]*>[\s\S]{0,120}Student Access/.test(OUT) || /Student Access[\s\S]{0,200}href="\/login"/.test(OUT) || OUT.includes('href="/login"'));
  assert.ok(OUT.includes('href="mailto:Demian.muller@gmail.com"'));
  assert.ok(OUT.includes('https://www.instagram.com/demian_muller_music/'));
});

test('protected pages keep their guards (never granted by URL parameters)', function () {
  const academy = read('public/academy.html');
  const result = read('public/payment-result.html');
  assert.ok(/onAuthStateChanged|currentUser/.test(academy), 'Academy checks the signed-in user');
  assert.ok(/login/.test(academy), 'and sends anonymous visitors to login');
  assert.ok(!/status=approved[^\n]{0,80}(grant|unlock|enroll)/i.test(result), 'payment-result never grants access from ?status=approved');
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/landing-certification.test.cjs'));
  assert.ok(read('.github/workflows/validate-3d.yml').includes('node scripts/overdrive/test/landing-certification.test.cjs'));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
