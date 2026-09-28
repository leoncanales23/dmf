'use strict';

// RELIC FALLBACK — the Receiver's stage is never a black panel. The real relic.js bootstrap runs in a minimal
// fake DOM through every path without a live scene (Save-Data, Three/GLTFLoader failed, no WebGL); the poster
// asset, the CSS contract and the build output are checked alongside.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const RELIC = read('scripts/overdrive/relic.js');
const BUILD = read('scripts/build-3d.cjs');
const OUT = read('public/index.html');
const POSTER = 'assets/images/dmf-relic-poster.webp';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}

// --- a DOM just large enough for mountDMFSignal / initScene up to the renderer ---
function classList() {
  const set = new Set();
  return { add: (...c) => c.forEach((x) => set.add(x)), remove: (...c) => c.forEach((x) => set.delete(x)), contains: (c) => set.has(c), toggle: (c, on) => (on ? set.add(c) : set.delete(c)), _set: set };
}
function el(tag) {
  const attrs = {};
  const node = {
    tagName: String(tag).toUpperCase(), classList: classList(), style: {}, children: [], innerHTML: '', clientWidth: 800, clientHeight: 600,
    setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: (k) => (k in attrs ? attrs[k] : null),
    querySelector: () => el('div'), querySelectorAll: () => [], addEventListener: () => {},
    appendChild: (c) => { node.children.push(c); return c; }, insertAdjacentElement: (pos, c) => { node.inserted = c; return c; }
  };
  Object.defineProperty(node, 'className', { get: () => [...node.classList._set].join(' '), set: (v) => { node.classList._set.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => node.classList._set.add(c)); } });
  return node;
}
function boot(opts) {
  const html = el('html');
  html.lang = 'es';
  const hero = el('header');
  const head = el('head');
  const tracked = [];
  const document = {
    readyState: 'complete', documentElement: html, head: head, body: el('body'),
    querySelector: (s) => (s === 'header.hero' ? hero : null), querySelectorAll: () => [],
    createElement: el, addEventListener: () => {}, dispatchEvent: () => true
  };
  const hub = opts.hub === null ? undefined : Object.assign({ scan() {}, saveData: false, reduced: false, onFrame() {} }, opts.hub || {});
  const window = { DMFSignal: hub, THREE: opts.THREE, dmfTrack: (name, props) => tracked.push([name, props]), addEventListener: () => {} };
  const ctx = { window, document, CustomEvent: function (t, d) { this.type = t; this.detail = d && d.detail; }, MutationObserver: undefined, console };
  vm.runInNewContext(RELIC, ctx);
  return { band: hero.inserted, scripts: head.children, html, hub, tracked };
}
const byUrl = (scripts, re) => scripts.find((s) => re.test(s.src));
function isStatic(band) { return band.classList.contains('is-static-relic') && band.classList.contains('is-ready'); }

test('Save-Data: no 3D is requested and the still is the stage', () => {
  const r = boot({ hub: { saveData: true } });
  assert.ok(isStatic(r.band), 'static relic');
  assert.equal(r.band.getAttribute('data-relic-static'), 'save-data');
  assert.equal(r.scripts.length, 0, 'no Three / decoder request');
  assert.ok(r.html.classList.contains('dmf-relic-static'), 'the stage layer is retired');
  assert.equal(JSON.stringify(r.tracked), JSON.stringify([['3d_loaded', { status: 'static', reason: 'save-data' }]]), 'reported once, no identity');
});

test('no signal bus: still, not a broken panel', () => {
  const r = boot({ hub: null });
  assert.ok(isStatic(r.band));
  assert.equal(r.band.getAttribute('data-relic-static'), 'no-signal');
});

test('Three.js fails to load: static; the mixer is told Three failed', () => {
  const r = boot({});
  assert.ok(!isStatic(r.band), 'live path while loading');
  byUrl(r.scripts, /three\.min\.js/).onerror();
  assert.ok(isStatic(r.band));
  assert.equal(r.band.getAttribute('data-relic-static'), 'three');
  assert.equal(r.hub.three, 'failed', 'hub.three still announced for the Tips mixer');
});

test('GLTFLoader fails to load: static', () => {
  const r = boot({});
  byUrl(r.scripts, /three\.min\.js/).onload();
  const loader = r.scripts.find((s) => /GLTFLoader/.test(s.src));
  loader.onerror();
  assert.ok(isStatic(r.band));
  assert.equal(r.band.getAttribute('data-relic-static'), 'three');
});

test('WebGL unavailable: the renderer throws, the page does not; static', () => {
  function Stub() { this.position = { set() {} }; this.lookAt = () => {}; }
  const THREE = {
    GLTFLoader: function () {}, Scene: function () {}, Color: function () {}, FogExp2: function () {}, PerspectiveCamera: Stub,
    WebGLRenderer: function () { throw new Error('Error creating WebGL context.'); }
  };
  const r = boot({ THREE });
  byUrl(r.scripts, /meshopt_decoder/).onerror();
  byUrl(r.scripts, /three\.min\.js/).onload();
  r.scripts.find((s) => /GLTFLoader/.test(s.src)).onload();
  assert.ok(isStatic(r.band), 'static relic');
  assert.equal(r.band.getAttribute('data-relic-static'), 'webgl');
});

test('model load error and a lost context hand the stage back to the still', () => {
  assert.ok(RELIC.includes("function () { relicStatic(band, 'model'); }"), 'GLB error callback');
  assert.ok(RELIC.includes("renderer.domElement.addEventListener('webglcontextlost', function () { relicStatic(band, 'context-lost'); });"), 'context lost');
  assert.ok(!RELIC.includes("function () { band.classList.add('is-ready'); }"), 'the old silent failure is gone');
});

test('poster: one WebP asset, same bytes in assets/ and public/, small, dimensions match the markup', () => {
  const a = fs.readFileSync(path.join(ROOT, POSTER));
  const b = fs.readFileSync(path.join(ROOT, 'public', POSTER));
  assert.ok(a.equals(b), 'deploy copies assets/images over public/assets/images: keep them identical');
  assert.equal(a.toString('ascii', 0, 4), 'RIFF');
  assert.equal(a.toString('ascii', 8, 12), 'WEBP');
  assert.ok(a.length < 150 * 1024, 'poster ≤ 150 KB (is ' + a.length + ')');
  let w = 0, h = 0;
  const chunk = a.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') { w = a.readUInt16LE(26) & 0x3fff; h = a.readUInt16LE(28) & 0x3fff; }
  else if (chunk === 'VP8L') { const bits = a.readUInt32LE(21); w = (bits & 0x3fff) + 1; h = ((bits >> 14) & 0x3fff) + 1; }
  else if (chunk === 'VP8X') { w = 1 + a.readUIntLE(24, 3); h = 1 + a.readUIntLE(27, 3); }
  const m = RELIC.match(/dmf-signal-poster" src="([^"]+)" alt="" width="(\d+)" height="(\d+)"/);
  assert.ok(m, 'poster markup');
  assert.equal(m[1], POSTER);
  assert.deepEqual([w, h], [+m[2], +m[3]], 'width/height attributes reserve the real aspect');
  assert.ok(/dmf-signal-poster"[^>]*loading="lazy" decoding="async"/.test(RELIC), 'lazy, async decode: never competes with the hero');
});

test('CSS: poster under the loader, canvas fades in only with the scene, static hides live-only controls', () => {
  assert.ok(BUILD.includes('.dmf-signal-band:not(.has-scene) .dmf-signal-visual canvas{opacity:0}'), 'no black frame while loading');
  assert.ok(BUILD.includes('.dmf-signal-band.has-scene .dmf-signal-fallback{opacity:0}'), 'the still leaves when the scene is in');
  assert.ok(BUILD.includes('.dmf-signal-band.is-static-relic .dmf-signal-fallback{opacity:1}'), 'static keeps the still');
  const hidden = BUILD.match(/([^\n{}]+)\{display:none\}\n\.dmf-signal-band\.is-static-relic \.dmf-signal-visual\{cursor:default\}/);
  assert.ok(hidden, 'static hide rule');
  for (const sel of ['.dmf-signal-view3d', '.dmf-signal-loader', '.dmf-signal-hint', '.dmf-live-hud', '.dmf-signal-visual canvas']) {
    assert.ok(hidden[1].includes('.dmf-signal-band.is-static-relic ' + sel), sel + ' hidden when static');
  }
  assert.ok(!/is-static-relic \.dmf-signal-cta--secondary/.test(BUILD), 'the download stays available');
  assert.ok(BUILD.includes('.dmf-relic-static .dmf-stage-layer{display:none}'), 'the fixed stage layer is retired');
});

test('build output carries the poster and the static contract', () => {
  assert.ok(OUT.includes('dmf-relic-poster.webp'), 'poster in public/index.html');
  assert.ok(OUT.includes('is-static-relic'), 'static CSS/JS in public/index.html');
  assert.ok(!OUT.includes('aria-hidden="true">RELIC</div>'), 'the old text placeholder is gone');
});

test('registered in npm and CI', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts['test:hyperdrive'].includes('scripts/overdrive/test/relic-fallback.test.cjs'), 'npm run test:hyperdrive');
  assert.ok(read('.github/workflows/validate-3d.yml').includes('node scripts/overdrive/test/relic-fallback.test.cjs'), 'CI');
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed) process.exit(1);
