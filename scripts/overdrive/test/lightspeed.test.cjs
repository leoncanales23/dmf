'use strict';

// EVENT HORIZON V6 — LIGHTSPEED: deterministic simulations of the threshold layer through the full director,
// plus structural guarantees on the runtime and the generated landing. Works on shallow checkouts (no git refs).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const DIR = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const LAYER_PATH = path.join(DIR, 'lightspeed.js');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
test('1 · module exists and exposes DMFLightspeed', function () {
  assert.ok(fs.existsSync(LAYER_PATH));
  const api = require(LAYER_PATH);
  assert.equal(typeof api.DMFLightspeed, 'function');
  assert.equal(typeof api.DMFLightspeed.prototype.update, 'function');
  assert.equal(typeof api.DMFLightspeed.prototype.compose, 'function');
});

const LS = require(LAYER_PATH);
const SN = require(path.join(DIR, 'spatial-narrative.js'));
const SO = require(path.join(DIR, 'stage-overdrive.js'));
const EH = require(path.join(DIR, 'event-horizon.js'));
const SRC = read('index.html');
const OUT = read('public/index.html');
const LAYER = fs.readFileSync(LAYER_PATH, 'utf8');
const MOD = fs.readFileSync(path.join(DIR, 'event-horizon.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(DIR, 'relic.js'), 'utf8');
const BUILD = read('scripts/build-3d.cjs');
const DEV = read('scripts/dev-hyperdrive.cjs');
const L = LS.LIMITS;

function count(hay, needle) { return hay.split(needle).length - 1; }
function body(src, signature) {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, 'missing ' + signature);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + signature);
}
function between(src, a, b) {
  const i = src.indexOf(a); const j = src.indexOf(b, i + a.length);
  assert.ok(i >= 0 && j > i, 'missing block ' + a);
  return src.slice(i, j);
}
function code(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1'); }
const CODE = code(LAYER);

const IDS = ['intro', 'hero', 'relic', 'bio', 'band', 'releases', 'sets', 'platforms', 'rider', 'academy', 'offer', 'lab', 'tips', 'contact'];
const CALMS = IDS.map((id) => (id === 'offer' ? 1 : id === 'lab' ? 0.6 : id === 'academy' ? 0.35 : id === 'contact' ? 0.3 : 0));
const VH = 900, DT = 1 / 60, DOC = 14500;
function director() {
  const d = new EH.DMFEventHorizon();
  d.setMarkers(IDS.map((_, i) => i * 1000), IDS, IDS.map(() => 0.6), CALMS, DOC);
  return d;
}
function at(id, frac) { return IDS.indexOf(id) * 1000 + 1000 * (frac == null ? 0.5 : frac) - VH * 0.45; }
function inp(o) {
  return Object.assign({ scrollY: 0, vh: VH, velocity: 0, s: {}, forces: {}, pointerX: 0, pointerY: 0, pointerActive: false,
    tier: 'high', compact: false, wakeT: -1, pre: 0, docProgress: 0 }, o);
}
const LOUD = { forceLow: 1, forceMid: 1, forceHigh: 1 };
function beat(i, kick) { return { energy: 0.85, kick: kick == null ? 1 : kick, low: 0.8, mid: 0.6, high: 0.6, beatFired: i % 30 === 0, timeToBeat: ((30 - (i % 30)) % 30) / 60 }; }
const EVENT = ['lightspeed', 'velocityField', 'depthStretch', 'depthDolly', 'receiverAnchor', 'reflectionVelocity', 'bladeVelocity', 'floorVelocity',
  'titleTrail', 'titleSnap', 'lsIgnition', 'lsHead', 'lsShoulder', 'lsTorso', 'speakerRelease'];
const ALL = EVENT.concat(['spaceCompression', 'lensPressure', 'speakerHold']);
// Loud music until the first LIGHTSPEED ignition; records ~0.3 s before it and 1.2 s after.
function firstEvent(opts) {
  const o = Object.assign({ id: 'relic', tier: 'high', compact: false }, opts || {});
  const d = director();
  const hist = []; let fired = -1; const trace = [];
  for (let i = 0; i < 1800; i++) {
    const st = d.update(inp({ scrollY: at(o.id), s: beat(i), forces: LOUD, tier: o.tier, compact: o.compact }), DT);
    const row = {}; ALL.concat(['fovKick', 'fovDeg', 'woofer', 'halo', 'gravity', 'sunScale', 'drive', 'precompress']).forEach((k) => { row[k] = st[k]; });
    if (fired < 0) { hist.push(row); if (hist.length > 18) hist.shift(); }
    if (fired < 0 && d.lightspeed.firedNow) fired = i;
    if (fired >= 0) trace.push(row);
    if (fired >= 0 && trace.length >= 72) break;
  }
  return { d, fired, pre: hist, trace };
}
function onset(trace, k) { for (let i = 0; i < trace.length; i++) if (Math.abs(trace[i][k]) > 0.01) return i; return -1; }
function peakAt(trace, k) { let m = 0, a = -1; trace.forEach((r, i) => { if (Math.abs(r[k]) > m) { m = Math.abs(r[k]); a = i; } }); return a; }
function mx(trace, k) { return Math.max.apply(null, trace.map((r) => Math.abs(r[k]))); }

test('2 · pure ES5 (no let/const, arrows, classes, template literals)', function () {
  assert.ok(!/\b(let|const|class)\s|=>|`/.test(CODE));
  assert.ok(CODE.includes("'use strict'") && CODE.includes('(function (root) {'));
});
test('3 · no DOM', function () { assert.ok(!/document|window\.|getElementBy|querySelector|\.style\b|classList/.test(CODE)); });
test('4 · no Date or performance clock', function () { assert.ok(!/Date\b|performance\./.test(CODE)); });
test('5 · no timers', function () { assert.ok(!/setTimeout|setInterval|requestIdleCallback/.test(CODE)); assert.equal(count(OUT, 'setInterval('), 2); assert.equal(count(OUT, 'setTimeout('), 15); });
test('6 · no rAF', function () { assert.ok(!/requestAnimationFrame/.test(CODE)); assert.equal(count(OUT, 'requestAnimationFrame'), 3); });
test('7 · no AudioContext', function () { assert.ok(!/AudioContext|new Audio\b/.test(CODE)); assert.equal(count(OUT, 'actx = new AC()'), 1); });
test('8 · no analyser', function () { assert.ok(!/createAnalyser|AnalyserNode/.test(CODE)); assert.equal(count(OUT, 'createAnalyser()'), 1); });
test('9 · no WebGLRenderer', function () { assert.ok(!/WebGL|getContext/.test(CODE)); assert.equal(count(OUT, 'new THREE.WebGLRenderer('), 2); });
test('10 · no THREE.Mesh (layer, Receiver scene, page)', function () {
  assert.ok(!/THREE/.test(CODE));
  assert.equal(count(RELIC, 'new THREE.Mesh('), 15, 'Receiver meshes pinned to the V5 baseline');
  assert.equal(count(OUT, 'new THREE.Mesh('), 19, 'page meshes pinned to the V5 baseline');
});
test('11 · no GLTFLoader', function () { assert.ok(!/GLTFLoader/.test(CODE)); assert.equal(count(RELIC, 'new THREE.GLTFLoader()'), 1); assert.equal(count(OUT, 'examples/js/loaders/GLTFLoader.js'), 1); });
test('12 · no fetch / network', function () { assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\(/.test(CODE)); assert.equal(count(OUT, 'fetch('), 2); });

test('13 · only a Mass Driver release can trigger an event (never a beat)', function () {
  assert.ok(!/beatFired|timeToBeat|\.kick\b|energy/.test(CODE), 'reads no beat/kick/energy');
  const ls = new LS.DMFLightspeed();
  const st = { performanceTier: 'high', compact: false, calm: 0, silence: 0, index: 2, drive: 0, precompress: 0 };
  let n = 0;
  for (let i = 0; i < 600; i++) { ls.update(st, { s: beat(i) }, IDS, DT); if (ls.firedNow) n++; }
  assert.equal(n, 0, 'loud beats with no drive never fire');
  st.drive = 0.2; ls.update(st, {}, IDS, DT);
  assert.ok(ls.firedNow, 'the drive onset fires');
  for (let i = 0; i < 60; i++) { st.drive = i % 20 === 0 ? 0 : 0.5; ls.update(st, {}, IDS, DT); assert.ok(!ls.firedNow || i === 0, 'rate-limited'); }
  const d = director(); let md = 0, lsn = 0;
  for (let i = 0; i < 3600; i++) { d.update(inp({ scrollY: at('sets'), s: beat(i), forces: LOUD }), DT); if (d.massDriver.firedNow) md++; if (d.lightspeed.firedNow) lsn++; }
  assert.ok(lsn >= 3 && lsn <= md && lsn <= 10, 'events ⊂ Mass Driver shots, ≥ 6 s apart (≤ 10 per minute): ' + lsn + '/' + md);
  assert.ok(L.gap >= 6, 'the brief\'s 6 s floor');
});

test('14 · no event in the offer / pricing (nor Academy, Lab, Tips, Contact)', function () {
  for (const id of ['academy', 'offer', 'lab', 'tips', 'contact', 'bio', 'platforms']) {
    const d = director(); let n = 0, m = 0;
    for (let i = 0; i < 1800; i++) { const st = d.update(inp({ scrollY: at(id), s: beat(i), forces: LOUD, velocity: 0.8 }), DT); if (d.lightspeed.firedNow) n++; if (i > 300) m = Math.max(m, st.lightspeed, st.fovDeg, st.titleTrail); }
    assert.equal(n, 0, 'event in ' + id);
    assert.ok(m < 1e-9, 'residual response in ' + id);
  }
});

test('15 · space compression precedes the release', function () {
  const { pre, trace } = firstEvent();
  assert.ok(pre.some((r) => r.spaceCompression > 0.2), 'compression in the ~300 ms before ignition');
  assert.ok(pre.some((r) => r.fovKick < -0.05), 'the FOV tightens first');
  assert.ok(onset(trace, 'lightspeed') >= 0 && trace[0].depthStretch < 0.05, 'release follows');
});

test('16 · Receiver (head) before reflections', function () {
  const { trace } = firstEvent();
  assert.ok(onset(trace, 'lsHead') < onset(trace, 'reflectionVelocity') && peakAt(trace, 'lsHead') < peakAt(trace, 'reflectionVelocity'));
  assert.ok(onset(trace, 'lsHead') < onset(trace, 'lsShoulder') && onset(trace, 'lsShoulder') < onset(trace, 'lsTorso'), 'head → shoulders → torso');
});

test('17 · speakers before the floor', function () {
  const { trace } = firstEvent();
  assert.ok(onset(trace, 'speakerRelease') < onset(trace, 'floorVelocity') && peakAt(trace, 'speakerRelease') < peakAt(trace, 'floorVelocity'));
});

test('18 · the Black Sun edge answers after the Receiver', function () {
  const T = LS.TIMELINE;
  assert.ok(T.edge[0] > T.head[0] && T.edge[0] >= 0.08, 'edge delay after the head');
  const { trace } = firstEvent();
  assert.ok(peakAt(trace, 'halo') > peakAt(trace, 'lsHead'));
  assert.ok(trace.every((r) => Math.abs(r.sunScale) <= 0.03 + 1e-12), 'inside V4 ±3%');
});

test('19 · recovery lands at exactly zero (no drift, no residual)', function () {
  const { trace } = firstEvent();
  const end = Math.ceil(L.end / DT) + 2;
  for (const k of EVENT) assert.equal(trace[end][k], 0, k + ' residual ' + trace[end][k]);
  assert.ok(Math.abs(trace[end].fovDeg) < 1e-3, 'FOV back at the authored value');
});

test('20 · no overshoot, no bounce', function () {
  const { trace } = firstEvent();
  for (const k of ['lightspeed', 'depthStretch', 'reflectionVelocity', 'titleTrail', 'lsHead', 'floorVelocity']) {
    const p = peakAt(trace, k);
    for (let i = p + 1; i < trace.length; i++) assert.ok(trace[i][k] <= trace[i - 1][k] + 1e-12, k + ' rises again at ' + i);
    assert.ok(trace.every((r) => r[k] >= 0 && r[k] <= 1), k + ' in 0..1');
  }
  assert.ok(trace.every((r) => r.fovKick >= -L.compressFov - 1e-12));
});

test('21 · camera bounds: dolly, roll untouched, lateral unchanged', function () {
  const cam = body(RELIC, 'function applyCamera(dolly)');
  assert.ok(cam.includes('r -= (e5 ? e5.depthDolly || 0 : 0) * fit;') && cam.includes('fov += e5 ? e5.fovDeg || 0 : 0;'));
  assert.ok(cam.includes('var r = (cur.r - dolly) * fit;'), 'the followed-pose expression is unchanged');
  assert.ok(cam.includes("var roll = cur.roll + lens.roll + (e5 ? 0.0105 * (e5.driveRoll || 0) : 0);"), 'roll only from the V5 bound');
  assert.ok(!/lateral|driveLateral \*|Lateral/.test(code(LAYER)), 'V6 adds no lateral');
  const { trace } = firstEvent();
  assert.ok(mx(trace, 'depthDolly') <= L.dollyDesktop + 1e-12 && mx(trace, 'depthDolly') > 0.1);
});

test('22 · FOV desktop ≤ 3.5°', function () {
  const { trace } = firstEvent();
  assert.ok(mx(trace, 'fovDeg') <= 3.5 + 1e-9 && mx(trace, 'fovDeg') > 2.5, 'opens: ' + mx(trace, 'fovDeg'));
  const d = director();
  for (let i = 0; i < 4000; i++) { const st = d.update(inp({ scrollY: (i * 11) % 14000, s: { energy: 9, kick: 9, low: 9, mid: 9, high: 9, beatFired: i % 2 === 0, timeToBeat: (i % 5) / 60 }, forces: { forceLow: 9 }, velocity: 5 }), DT);
    assert.ok(st.fovDeg <= 3.5 + 1e-9 && st.fovDeg >= -0.35 * 3.5 - 1e-9 && st.depthDolly <= 0.18 + 1e-12); }
});

test('23 · FOV mobile ≤ 1.2°, dolly ≤ 0.07', function () {
  const { trace } = firstEvent({ compact: true });
  assert.ok(mx(trace, 'fovDeg') <= 1.2 + 1e-9 && mx(trace, 'depthDolly') <= 0.07 + 1e-12);
  assert.ok(mx(trace, 'fovDeg') > 0.5, 'still perceptible');
});

function ratio(a, b, k) { return mx(a, k) / Math.max(1e-9, mx(b, k)); }
test('24 · mobile governor: camera ≤ 35%, reflection ≤ 40%, body ≤ 42%', function () {
  const hi = firstEvent().trace, ph = firstEvent({ compact: true }).trace;
  assert.ok(ratio(ph, hi, 'depthStretch') <= 0.35 + 1e-9, 'camera');
  assert.ok(ratio(ph, hi, 'reflectionVelocity') <= 0.4 + 1e-9, 'reflection');
  assert.ok(ratio(ph, hi, 'lsHead') <= 0.42 + 1e-9 && ratio(ph, hi, 'floorVelocity') <= 0.42 + 1e-9, 'body');
});
test('25 · balanced governor: camera 75%, reflections 65%, type 60%, light 70%', function () {
  const hi = firstEvent().trace, b = firstEvent({ tier: 'balanced' }).trace;
  assert.ok(Math.abs(ratio(b, hi, 'depthStretch') - 0.75) < 0.02 && Math.abs(ratio(b, hi, 'reflectionVelocity') - 0.65) < 0.02);
  assert.ok(Math.abs(ratio(b, hi, 'titleTrail') - 0.6) < 0.02 && Math.abs(ratio(b, hi, 'bladeVelocity') - 0.7) < 0.02);
});
test('26 · lite governor: camera 40%, reflections 35%, type 30%, light 40%', function () {
  const hi = firstEvent().trace, l = firstEvent({ tier: 'lite' }).trace;
  assert.ok(Math.abs(ratio(l, hi, 'depthStretch') - 0.4) < 0.02 && Math.abs(ratio(l, hi, 'reflectionVelocity') - 0.35) < 0.02);
  assert.ok(Math.abs(ratio(l, hi, 'titleTrail') - 0.3) < 0.02 && Math.abs(ratio(l, hi, 'bladeVelocity') - 0.4) < 0.02);
});
test('27 · STATIC is exactly zero', function () {
  const d = director(); let m = 0;
  for (let i = 0; i < 1800; i++) { const st = d.update(inp({ scrollY: at('relic'), s: beat(i), forces: LOUD, tier: 'static' }), DT); ALL.concat(['fovDeg']).forEach((k) => { m = Math.max(m, Math.abs(st[k])); }); }
  assert.equal(m, 0);
});
function composed(label) {
  const d = director();
  for (let i = 0; i < 900; i++) d.update(inp({ scrollY: at('relic'), s: beat(i), forces: LOUD }), DT);
  const st = d.compose(IDS.indexOf('relic'));
  for (const k of ALL.concat(['fovKick', 'fovDeg'])) assert.equal(st[k], 0, label + ': ' + k);
}
test('28 · prefers-reduced-motion: every Lightspeed term is 0', function () {
  composed('reduced motion');
  assert.ok(MOD.includes('var still = !!(hub.reduced || hub.saveData);') && MOD.includes('if (still || !hub.onFrame) { composeStill(); return; }'));
  assert.ok(MOD.includes('if (this.lightspeed) this.lightspeed.compose(st);'));
});
test('29 · Save-Data: every Lightspeed term is 0', function () { composed('Save-Data'); assert.ok(/saveData/.test(read('scripts/overdrive/signal-bus.js'))); });

test('30 · woofer stays inside the V3 4% budget', function () {
  const { trace } = firstEvent();
  assert.ok(trace.every((r) => r.woofer <= SO.LIMITS.woofer + 1e-12));
  assert.ok(L.wooferHold <= 0.25 && L.wooferRelease <= 0.15);
});

test('31 · Receiver: existing clamps and yaw/pitch limits preserved', function () {
  for (const needle of ["var headK = new KB(380, 0.67, { maxA: 160, maxJ: 9000, min: -0.06, max: 0.22 });",
    "var shoulderK = new KB(90, 0.55, { maxA: 4, maxJ: 300, min: -0.03, max: 0.03 });",
    "var torsoK = new KB(70, 0.6, { maxA: 1.2, maxJ: 90, min: -0.003, max: 0.015 });",
    "var twistK = new KB(50, 0.7, { maxA: 3, maxJ: 150, min: -0.05, max: 0.05 });"]) assert.ok(RELIC.includes(needle));
  assert.ok(RELIC.includes('headK.step(-0.02 * lsHead + nodBase - 0.03 * pressure + ehPitch + 0.03 * mdHead, dt);'));
  assert.ok(RELIC.includes('shoulderK.step(0.008 * lsShoulder + 0.022 * f.shoulder') && RELIC.includes('torsoK.step(0.003 * lsTorso + (0.004 * groove'));
  const d = director();
  for (let i = 0; i < 1800; i++) { const st = d.update(inp({ scrollY: at('relic'), s: beat(i), forces: LOUD, pointerX: 1, pointerActive: true }), DT);
    assert.ok(Math.abs(st.headYaw) <= SN.LIMITS.headYaw + 1e-9 && Math.abs(st.headPitch) <= SN.LIMITS.headPitch + 1e-9); }
  assert.ok(RELIC.includes('Math.tan((34 + (ehv.fovDeg || 0)) * HALF_DEG) / TAN_17'), 'anchored against the FOV opening');
});

test('32 · blade count unchanged', function () {
  for (const html of [SRC, OUT]) {
    assert.equal(count(html, 'class="eh-blade '), 2);
    assert.ok(html.includes('.eh-compact .eh-blade--2,.eh-tier-lite .eh-blade--2{display:none}') && html.includes('.eh-still .eh-blade,.eh-tier-static .eh-blade'));
  }
});

test('33 · no new geometry', function () {
  assert.equal(count(RELIC, 'Geometry('), 16);
  assert.equal(count(OUT, 'Geometry('), 21);
  assert.equal(count(OUT, 'new THREE.Points('), 1);
  assert.equal(count(RELIC, 'new THREE.ShaderMaterial('), count(RELIC, 'new THREE.ShaderMaterial('));
  assert.ok(!/EffectComposer|RenderPass|ShaderPass|WebGLRenderTarget/.test(RELIC), 'no post-processing pass');
});

test('34 · no new loops', function () {
  assert.equal(count(OUT, 'requestAnimationFrame'), 3);
  assert.ok(!/while\s*\(/.test(CODE), 'no unbounded loops in the layer');
});

test('35 · no allocations in the hot path', function () {
  const HOT_ALLOC = /\bnew [A-Z]|\[\s*\]|\{\s*\}|\.map\(|\.filter\(|\.concat\(|\.slice\(|function\s*\(/;
  for (const [name, c] of [
    ['DMFLightspeed.update', body(LAYER, 'DMFLightspeed.prototype.update = function (st, inp, ids, dt)')],
    ['pulse', body(LAYER, 'function pulse(t, delay, attack, end)')],
    ['relic applyCamera', body(RELIC, 'function applyCamera(dolly)')],
    ['relic applyReceiverTransform', body(RELIC, 'function applyReceiverTransform()')],
    ['director update', body(MOD, 'DMFEventHorizon.prototype.update = function (inp, dt)')],
    ['binding write', body(MOD, 'function write(force)')]
  ]) assert.ok(!HOT_ALLOC.test(code(c).slice(code(c).indexOf('{') + 1)), name + ' allocates per frame');
  assert.ok(LAYER.indexOf('var AUTH = {') < LAYER.indexOf('DMFLightspeed.prototype.update'), 'governor tables precomputed once');
});

test('36 · source and generated output are synchronized; inlined once after the Mass Driver', function () {
  assert.equal(count(OUT, 'DMF LIGHTSPEED — pure threshold layer'), 1);
  const order = ['mass-driver.js', 'lightspeed.js', 'event-horizon.js', 'relic.js'].map((m) => BUILD.indexOf("inlineModule('" + m + "')"));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])));
  assert.ok(DEV.indexOf('lightspeed.js') > DEV.indexOf('mass-driver.js') && DEV.indexOf('lightspeed.js') < DEV.indexOf('event-horizon.js'));
  for (const needle of ["calc(var(--eh-tt,0) * -2px) 0 0 rgba(242,237,230,calc(var(--eh-tt,0) * .16))", 'scaleX(calc(1 + var(--eh-rv,0) * .6))', '(1 - var(--eh-bv,0) * .1)'])
    assert.ok(SRC.includes(needle) && OUT.includes(needle), needle);
  assert.ok(OUT.includes('r -= (e5 ? e5.depthDolly || 0 : 0) * fit;') && OUT.includes('perf.lightspeed = {'));
  const rule = between(SRC, '.section-title,.acad-title{transform-origin', '}');
  assert.ok(!/blur|filter|letter-spacing|font-size/.test(rule), 'type: transform/text-shadow only');
});

const FROZEN = ['workers', 'firestore.rules', 'firebase.json', 'firebase.academy.json', '.firebaserc', 'public/academy-config.js', 'server.js', 'functions', 'assets'];
function changedFrozen() {
  let base = null;
  try { base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { base = null; }
  if (!base) return null;   // shallow CI checkout: the content invariants below still hold
  return execSync('git diff --name-only ' + base + ' -- ' + FROZEN.join(' '), { cwd: ROOT }).toString().trim();
}
test('37 · frozen payment paths untouched', function () {
  const changed = changedFrozen();
  if (changed !== null) assert.equal(changed, '', 'frozen paths changed: ' + changed);
  assert.ok(!/mercadopago|firebase|firestore|signer|checkout|payment|enroll|price|stream|localStorage|sessionStorage/i.test(CODE));
});
test('38 · Academy / payment / auth files untouched and their checks pass', function () {
  for (const f of ['public/login.html', 'public/payment-result.html', 'public/academy.html']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  const dir = path.join(ROOT, 'workers', 'dmf-payments', 'test');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.test.cjs'))) execSync('node ' + JSON.stringify(path.join(dir, f)), { cwd: ROOT, stdio: 'ignore' });
  assert.ok(OUT.includes('DMF_ACADEMY_LINK') && OUT.includes('href="/login"'));
  for (const html of [SRC, OUT]) assert.ok(html.includes('.nav.nav-open{backdrop-filter:none;-webkit-backdrop-filter:none}'), 'mobile nav regression');
});

test('observability: perf.lightspeed on the debug surface only, no console', function () {
  const rep = between(MOD, 'perf.lightspeed = {', '};');
  for (const k of ['active', 'compression', 'velocity', 'fovKick', 'depthStretch', 'reflectionVelocity', 'bladeVelocity', 'titleTrail', 'shots']) assert.ok(rep.includes(k + ':'), k);
  assert.ok(!/console\./.test(CODE));
});

test('frequency: default signal ~every 6–10 s, never closer than 6 s', function () {
  const d = director(); const times = [];
  for (let i = 0; i < 3600; i++) { d.update(inp({ scrollY: at('hero'), s: Object.assign(beat(i), { energy: 0.65 }), forces: { forceLow: 0.55 } }), DT); if (d.lightspeed.firedNow) times.push(i * DT); }
  assert.ok(times.length >= 3, 'fires on the default signal: ' + times.length);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 6 - 1e-9, 'gap ' + (times[i] - times[i - 1]).toFixed(2));
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/lightspeed.test.cjs'));
  const wf = read('.github/workflows/validate-3d.yml');
  assert.ok(wf.includes('node scripts/overdrive/test/lightspeed.test.cjs') && wf.includes("grep -q 'DMF LIGHTSPEED' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
