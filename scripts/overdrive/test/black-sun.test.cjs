'use strict';

// EVENT HORIZON V4 — BLACK SUN: deterministic simulations of the cinematic layer through the full director,
// plus structural guarantees on the runtime and the generated landing (run after the build chain).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { strict: assert } = require('assert');
const BS = require(path.join(__dirname, '..', 'black-sun.js'));
const SN = require(path.join(__dirname, '..', 'spatial-narrative.js'));
const SO = require(path.join(__dirname, '..', 'stage-overdrive.js'));
const EH = require(path.join(__dirname, '..', 'event-horizon.js'));

const ROOT = path.join(__dirname, '..', '..', '..');
const DIR = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('index.html');
const OUT = read('public/index.html');
const LAYER = fs.readFileSync(path.join(DIR, 'black-sun.js'), 'utf8');
const MOD = fs.readFileSync(path.join(DIR, 'event-horizon.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(DIR, 'relic.js'), 'utf8');
const BUILD = read('scripts/build-3d.cjs');
const DEV = read('scripts/dev-hyperdrive.cjs');
const L = BS.LIMITS;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
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
// Code only (comments stripped) so prose never trips a structural check.
function code(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1'); }

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
function loud(i, every, kick) { return { energy: 0.85, kick: kick == null ? 1 : kick, low: 0.8, mid: 0.6, high: 0.6, beatFired: i % every === 0 }; }
function run(d, n, o) { let st; for (let i = 0; i < n; i++) st = d.update(inp(typeof o === 'function' ? o(i) : o), DT); return st; }
const V4 = ['blackSun', 'iris', 'gravity', 'halo', 'impact', 'reflectionShock', 'beam', 'hold', 'open', 'vignette', 'shadowDepth',
  'titlePressure', 'chromatic', 'receiverGlow'];
function maxOver(d, n, o, keys) {
  const m = {}; keys.forEach((k) => { m[k] = 0; });
  for (let i = 0; i < n; i++) { const st = d.update(inp(typeof o === 'function' ? o(i) : o), DT); keys.forEach((k) => { m[k] = Math.max(m[k], Math.abs(st[k])); }); }
  return m;
}

test('1 · every V4 term is hard-clamped under extreme input across the whole page', function () {
  const d = director();
  for (let i = 0; i < 4000; i++) {
    const st = d.update(inp({ scrollY: (i * 7) % 14000, velocity: (i % 90) < 45 ? 5 : -5, s: { energy: 5, kick: 9, low: 9, mid: 9, high: 9, beatFired: i % 3 === 0 },
      forces: { forceLow: 9, forceMid: 9, forceHigh: 9 }, pointerX: 3, pointerY: -3, pointerActive: true, pre: 5 }), i % 17 === 0 ? 0.5 : DT);
    for (const k of V4.concat(['silence', 'reveal', 'revealEdge', 'revealType'])) assert.ok(st[k] >= 0 && st[k] <= 1, k + '=' + st[k]);
    assert.ok(st.revealLight >= 0.25 && st.revealLight <= 1, 'revealLight');
    assert.ok(Math.abs(st.sunScale) <= L.sunScale + 1e-12, 'sunScale ' + st.sunScale);
    assert.ok(st.stageLift >= L.liftMin && st.stageLift <= L.liftMax, 'stageLift');
    assert.ok(Math.abs(st.torsoLag) <= L.torsoLag + 1e-12, 'torsoLag');
    assert.ok(st.zk >= 0.05 && st.zk <= 1, 'zk');
    assert.ok(st.sheenK <= 1.35 * 1.35 + 1e-9, 'sheen factor');
    assert.ok(Math.abs(st.headYaw) <= SN.LIMITS.headYaw + 1e-9 && Math.abs(st.headPitch) <= SN.LIMITS.headPitch + 1e-9, 'head limits unchanged');
    assert.ok(st.woofer <= SO.LIMITS.woofer + 1e-9, 'woofer budget unchanged');
    assert.ok(Math.abs(st.camPan) <= SN.LIMITS.pan + 1e-9 && Math.abs(st.dolly) <= SN.LIMITS.dolly + 1e-9, 'camera limits unchanged');
  }
});

test('2 · no additional requestAnimationFrame loop', function () {
  assert.equal(count(LAYER, 'requestAnimationFrame'), 0);
  assert.equal(count(RELIC, 'requestAnimationFrame'), 0);
  assert.equal(count(OUT, 'requestAnimationFrame'), 3, 'bus self-scheduling (2) + one-shot page scroll (1), as on main');
});

test('3 · no AudioContext or analyser created', function () {
  assert.ok(!/AudioContext|createAnalyser|createGain|createMediaElementSource|new Audio\b/.test(LAYER));
  assert.equal(count(OUT, 'actx = new AC()'), 1);
  assert.equal(count(OUT, 'createAnalyser()'), 1);
});

test('4 · no new WebGLRenderer', function () {
  assert.ok(!/WebGLRenderer|getContext/.test(LAYER));
  assert.equal(count(RELIC, 'new THREE.WebGLRenderer('), 1);
  assert.equal(count(OUT, 'new THREE.WebGLRenderer('), 2);
});

test('5 · no new Three.js import', function () {
  assert.ok(!/THREE|three\.min|<script/.test(code(LAYER)));
  assert.equal(count(OUT, 'three.js/r128/three.min.js'), 1);
});

test('6 · no new GLTFLoader', function () {
  assert.equal(count(RELIC, 'new THREE.GLTFLoader()'), 1);
  assert.equal(count(OUT, 'examples/js/loaders/GLTFLoader.js'), 1);
});

test('7 · no timer-based animation', function () {
  for (const src of [LAYER, body(RELIC, 'function placeSun()')]) assert.ok(!/setTimeout|setInterval|Date\.now|performance\.now/.test(code(src)));
  assert.ok(!/setTimeout|setInterval/.test(code(MOD)), 'the director binding has no timers either');
});

test('8 · no allocations in the hot path', function () {
  const HOT_ALLOC = /\bnew [A-Z]|\[\s*\]|\{\s*\}|\.map\(|\.filter\(|\.concat\(|\.slice\(|function\s*\(/;
  for (const [name, c] of [
    ['DMFBlackSun.update', body(LAYER, 'DMFBlackSun.prototype.update = function (st, inp, ids, dt)')],
    ['relic placeSun', body(RELIC, 'function placeSun()')],
    ['relic material life', between(RELIC, '// V4 MATERIAL LIFE', 'var over = vf.reflect')],
    ['director update', body(MOD, 'DMFEventHorizon.prototype.update = function (inp, dt)')],
    ['binding write', body(MOD, 'function write(force)')]
  ]) assert.ok(!HOT_ALLOC.test(code(c).slice(code(c).indexOf('{') + 1)), name + ' allocates per frame');
});

test('9 · the Black Sun answers LOW and KICK, then returns to rest', function () {
  const d = director();
  run(d, 120, { scrollY: at('relic') });
  assert.ok(d.state.blackSun < 0.01 && Math.abs(d.state.sunScale) < 1e-3, 'at rest: a barely visible void');
  const low = run(d, 120, { scrollY: at('relic'), s: { energy: 0.8 }, forces: { forceLow: 1 } });
  assert.ok(low.blackSun > 0.6 && low.sunScale > 0.01 && low.sunScale <= 0.02 + 1e-9, 'LOW expands (≤ 2%)');
  const k = director();
  run(k, 120, { scrollY: at('relic'), s: { energy: 0.8 } });
  let minScale = 1, peakG = 0, g = [];
  for (let i = 0; i < 120; i++) {
    const st = k.update(inp({ scrollY: at('relic'), s: { energy: 0.8, kick: 1, beatFired: i === 0 } }), DT);
    minScale = Math.min(minScale, st.sunScale); peakG = Math.max(peakG, st.gravity); g.push(st.gravity);
  }
  assert.ok(peakG > 0.6 && minScale >= -L.sunScale && minScale < -0.012, 'one compression pulse, ≤ 3%: ' + minScale);
  let turns = 0;
  for (let i = 2; i < g.length; i++) if ((g[i] - g[i - 1]) * (g[i - 1] - g[i - 2]) < -1e-12) turns++;
  assert.ok(turns <= 1, 'fast attack, heavy return, no bouncing (turns ' + turns + ')');
  const rest = run(k, 240, { scrollY: at('relic') });
  assert.ok(rest.gravity < 1e-3 && rest.blackSun < 0.02, 'no permanent oscillation');
});

test('10 · impact shot: meaningful kicks only, energetic sections only, 180–320 ms, rate-limited', function () {
  assert.ok(L.impactDur >= 0.18 && L.impactDur <= 0.32);
  const d = director();
  run(d, 60, { scrollY: at('relic') });
  let frames = 0, shots = 0, prev = 0;
  for (let i = 0; i < 600; i++) {
    const st = d.update(inp({ scrollY: at('relic'), s: loud(i, 6) }), DT);
    if (st.impact > 0) frames++;
    if (st.impact > 0 && prev === 0) shots++;
    prev = st.impact;
  }
  assert.ok(shots >= 5 && shots <= Math.ceil(10 / L.impactGap), 'rate-limited: ' + shots + ' in 10 s of kicks every 100 ms');
  assert.ok(frames / shots * DT <= L.impactDur + DT && frames / shots * DT >= 0.18, 'each lasts ' + (frames / shots * DT).toFixed(3) + ' s');
  const weak = maxOver(director(), 300, (i) => ({ scrollY: at('relic'), s: loud(i, 20, 0.3) }), ['impact']);
  assert.equal(weak.impact, 0, 'weak kicks never take a shot');
  for (const id of ['bio', 'platforms', 'academy', 'offer', 'tips', 'contact']) {
    const m = maxOver(director(), 300, (i) => ({ scrollY: at(id), s: loud(i, 20) }), ['impact']);
    assert.equal(m.impact, 0, 'no impact in ' + id);
  }
  const hero = maxOver(director(), 300, (i) => ({ scrollY: at('hero'), s: loud(i, 20) }), ['impact']);
  assert.ok(hero.impact > 0.5, 'HERO takes the shot');
});

test('11 · no white flash, no strobe, no full-screen jump', function () {
  assert.ok(!/#fff\b|#ffffff|255,\s*255,\s*255|vec3\(1\.0,\s*1\.0,\s*1\.0\)/i.test(LAYER + body(RELIC, 'function placeSun()')));
  const sun = between(RELIC, 'var sunMesh = new THREE.Mesh', 'sunMesh.renderOrder');
  assert.ok(sun.includes('vec3(1.0, 0.78, 0.6) * edge') && sun.includes('(0.05 + 0.4 * uHalo)'), 'the edge is warm and thin, ≤ 45% alpha');
  assert.ok(!/1\.0,\s*1\.0,\s*1\.0/.test(sun), 'no pure white in the Black Sun');
  const css = between(SRC, '.eh-blade{', '@media(prefers-reduced-motion:reduce)');
  assert.ok(!/#fff\b|255,255,255|255, 255, 255/.test(css), 'blades and vignette are warm/dark only');
  assert.ok(css.includes('rgba(255,91,30,.16)') && css.includes('rgba(4,3,3,.9)'));
  // A kick every frame for 10 s never produces more impacts than the rate limit, and the sun never scales > 3%.
  const d = director();
  let shots = 0, prev = 0, maxScale = 0;
  for (let i = 0; i < 600; i++) {
    const st = d.update(inp({ scrollY: at('sets'), s: loud(i, 1) }), DT);
    if (st.impact > 0 && prev === 0) shots++;
    prev = st.impact; maxScale = Math.max(maxScale, Math.abs(st.sunScale));
  }
  assert.ok(shots <= Math.ceil(10 / L.impactGap), 'no strobe: ' + shots);
  assert.ok(maxScale <= 0.03 + 1e-9);
  assert.ok(!/scale\(1\.[1-9]|scale\([2-9]/.test(css), 'no full-screen scale jump');
});

test('12 · at most two light blades; phones and LITE get one', function () {
  for (const html of [SRC, OUT]) {
    assert.equal(count(html, 'class="eh-blade '), 2);
    assert.ok(html.includes('.eh-compact .eh-blade--2,.eh-tier-lite .eh-blade--2{display:none}'));
    assert.ok(html.includes('.eh-still .eh-blade,.eh-tier-static .eh-blade'));
  }
  const css = between(SRC, '.eh-blade{', '.eh-blade--1');
  assert.ok(css.includes('pointer-events:none') && /transform:translate3d/.test(css) && !/\bleft:calc/.test(css), 'transform/opacity only, never in the way');
  assert.ok(!/<canvas|<svg/.test(between(SRC, '<div class="eh-field"', '</div>')), 'no canvas or SVG');
});

test('13 · phones get reduced authority, not a scaled desktop', function () {
  const wide = maxOver(director(), 600, (i) => ({ scrollY: at('relic'), s: loud(i, 30), forces: LOUD }), V4);
  const phone = maxOver(director(), 600, (i) => ({ scrollY: at('relic'), s: loud(i, 30), forces: LOUD, compact: true }), V4);
  assert.ok(phone.blackSun <= wide.blackSun * 0.5 + 1e-9 && phone.blackSun >= wide.blackSun * 0.4 - 1e-9, 'Black Sun 40–50%');
  assert.ok(phone.impact <= wide.impact * 0.5 + 1e-9, 'impact');
  assert.ok(phone.titlePressure <= wide.titlePressure * 0.5 + 1e-9, 'title pressure');
  assert.ok(phone.hold <= 0.6 + 1e-9, 'section cut');
  assert.ok(SN.COMPACT_HEAD >= 0.35 && SN.COMPACT_HEAD <= 0.4, 'figure 35–40%');
});

test('14 · STATIC tier is completely still', function () {
  const d = director();
  const m = maxOver(d, 400, (i) => ({ scrollY: at(i < 200 ? 'relic' : 'band'), s: loud(i, 10), forces: LOUD, tier: 'static', velocity: 0.8 }), V4.concat(['torsoLag', 'stageLift', 'breath']));
  for (const k of Object.keys(m)) assert.ok(m[k] < 1e-9, k + ' moved under STATIC: ' + m[k]);
  assert.equal(d.state.reveal, 1, 'composed, revealed');
  assert.ok(MOD.includes("if (tier === 'static') {") && MOD.includes('eh.compose('));
});

function composedStill(label) {
  const d = director();
  run(d, 300, (i) => ({ scrollY: at('relic'), s: loud(i, 10), forces: LOUD }));
  const st = d.compose(IDS.indexOf('relic'));
  for (const k of V4.concat(['torsoLag', 'stageLift', 'silence', 'sunScale'])) assert.equal(st[k], 0, label + ': ' + k);
  for (const k of ['reveal', 'revealEdge', 'revealLight', 'revealType']) assert.equal(st[k], 1, label + ': ' + k);
}

test('15 · prefers-reduced-motion is completely still', function () {
  composedStill('reduced motion');
  assert.ok(MOD.includes('var still = !!(hub.reduced || hub.saveData);') && MOD.includes('if (still || !hub.onFrame) { composeStill(); return; }'));
  const rm = between(SRC, '@media(prefers-reduced-motion:reduce){', '</style>');
  assert.ok(rm.includes('.eh-blade,.eh-vig{display:none}') && rm.includes('.dmf-signal-title{opacity:1;translate:none;scale:none}'));
});

test('16 · Save-Data is completely still', function () {
  composedStill('Save-Data');
  assert.ok(/saveData/.test(read('scripts/overdrive/signal-bus.js')), 'the bus reports Save-Data');
});

test('17 · silence returns the stage to equilibrium, and music takes it back fast', function () {
  const d = director();
  run(d, 300, (i) => ({ scrollY: at('relic'), s: loud(i, 20), forces: LOUD }));
  const q = run(d, 240, { scrollY: at('relic') });
  assert.equal(q.silence, 1, 'silence authority');
  for (const k of ['impact', 'gravity', 'titlePressure', 'hold', 'vignette']) assert.ok(q[k] < 1e-3, k + '=' + q[k]);
  assert.ok(q.blackSun < 0.05 && q.beam < 0.05 && q.receiverGlow < 0.05, 'sun, blades and glow settle');
  assert.ok(Math.abs(q.breath) === 0, 'the figure returns precisely to rest');
  assert.ok(q.woofer < 1e-3 && Math.abs(q.cabinet) < 1e-3, 'woofers settle');
  // Rest is the section's composed pose (V2 camera grammar). The figure settles into it with mass —
  // monotonic, sub-degree, never a twitch — and then holds perfectly still.
  const trace = [];
  for (let i = 0; i < 600; i++) { const st = d.update(inp({ scrollY: at('relic') }), DT); trace.push([st.headYaw, st.headPitch, st.torsoLag]); }
  for (let k = 0; k < 3; k++) {
    let turns = 0;
    for (let i = 2; i < trace.length; i++) if ((trace[i][k] - trace[i - 1][k]) * (trace[i - 1][k] - trace[i - 2][k]) < -1e-14) turns++;
    assert.ok(turns === 0, 'settles without oscillating (axis ' + k + ')');
    assert.ok(Math.abs(trace[60][k] - trace[0][k]) < 0.003, 'sub-degree settle (axis ' + k + ')');
    assert.ok(Math.abs(trace[599][k] - trace[539][k]) < 2e-5, 'then holds still (axis ' + k + ')');
  }
  const back = run(d, 20, (i) => ({ scrollY: at('relic'), s: loud(i, 20), forces: LOUD }));
  assert.ok(back.silence < 0.2, 'music resumes the stage within ~330 ms: ' + back.silence);
  assert.ok(!/setTimeout|setInterval/.test(code(LAYER)), 'derived from signal + dt');
});

test('18 · the reflection shock lags the impact instead of jumping', function () {
  const d = director();
  run(d, 60, { scrollY: at('relic'), s: { energy: 0.8 } });
  let tImp = -1, tRef = -1, pImp = 0, pRef = 0, firstRef = -1;
  for (let i = 0; i < 90; i++) {
    const st = d.update(inp({ scrollY: at('relic'), s: { energy: 0.8, kick: 1, beatFired: i === 0 } }), DT);
    if (i === 0) firstRef = st.reflectionShock;
    if (st.impact > pImp) { pImp = st.impact; tImp = i; }
    if (st.reflectionShock > pRef) { pRef = st.reflectionShock; tRef = i; }
  }
  assert.ok(pImp > 0.5 && pRef > 0.1, 'both answer');
  assert.ok(tRef > tImp + 3, 'reflection peaks later (frame ' + tRef + ' vs ' + tImp + ')');
  assert.ok(firstRef < 0.02, 'no jump on the hit frame');
  assert.ok(RELIC.includes('env4 = 1 + 0.5 * (e4m.reflectionShock || 0)'), 'the Receiver reflection answers it');
});

test('19 · offer sanctuary suppresses V4', function () {
  const d = director();
  run(d, 300, { scrollY: at('offer') });
  const m = maxOver(d, 600, (i) => ({ scrollY: at('offer'), s: loud(i, 15), forces: LOUD, velocity: 0.8, pointerX: 1, pointerActive: true }), V4);
  for (const k of ['impact', 'beam', 'titlePressure', 'vignette', 'hold', 'chromatic']) assert.ok(m[k] < 1e-3, k + '=' + m[k]);
  assert.ok(m.blackSun < 0.05 && m.gravity < 0.08 && m.receiverGlow < 0.05, 'Black Sun nearly static, Receiver settled');
  assert.ok(SRC.includes('html.eh-calm .dmf-signal-title{scale:none}') && SRC.includes('html.eh-calm .section-title,html.eh-calm .acad-title{scale:none}'));
  assert.ok(between(SRC, '.eh-blade{', '.eh-blade--1').includes('(1 - var(--eh-calm,0))'), 'blades vanish with calm');
  assert.ok(SRC.includes('html.eh-calm .tier-card{background-color:rgba(10,8,6,.9)}'), 'cards stay dominant');
});

test('20 · Receiver materials are cached at load, never traversed per frame', function () {
  const loadCb = between(RELIC, "new THREE.GLTFLoader().load(", 'function animateRelic(');
  assert.ok(loadCb.includes('relicMats.push(relicMat);'), 'cached in the load callback');
  assert.ok(loadCb.includes('relicMat.isMeshStandardMaterial || relicMat.isMeshPhysicalMaterial') && loadCb.includes('relicMat.emissive'), 'unsupported materials are skipped');
  const frame = body(RELIC, 'function animateRelic(s, dt)');
  assert.ok(!/traverse\(|getObjectBy|children\[/.test(frame), 'no traversal in the frame loop');
  const life = between(RELIC, '// V4 MATERIAL LIFE', 'var over = vf.reflect');
  assert.ok(life.includes('relicRoughBase[mi]') && life.includes('relicEmisBase[mi] + glow4'), 'each material from its own base (identity preserved)');
  assert.ok(life.includes('0.018 * (e4m.receiverGlow || 0)'), 'never neon: ≤ +0.018 emissive');
  assert.equal(count(RELIC, 'relicMats.push('), 1);
});

test('21 · source and generated output are synchronized; runtime inlined once, in order', function () {
  assert.equal(count(OUT, 'DMF BLACK SUN — pure cinematic layer'), 1);
  const order = ['stage-overdrive.js', 'black-sun.js', 'event-horizon.js', 'relic.js'].map((m) => BUILD.indexOf("inlineModule('" + m + "')"));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'overdrive → black sun → director → relic');
  assert.ok(DEV.indexOf('black-sun.js') > DEV.indexOf('stage-overdrive.js') && DEV.indexOf('black-sun.js') < DEV.indexOf('event-horizon.js'));
  for (const needle of ['.eh-blade{', '.eh-vig{', "var(--eh-tp,0) * .012", 'var(--eh-reveal,1)', '(1 - var(--eh-hold,0) * .35)', 'class="eh-blade eh-blade--1"'])
    assert.ok(SRC.includes(needle) && OUT.includes(needle), needle);
  assert.ok(OUT.includes('function placeSun()') && OUT.includes("var REVEAL_KEY = 'dmf_eh_reveal';"));
});

test('22 · frozen paths untouched', function () {
  const FROZEN = ['workers', 'firestore.rules', 'firebase.json', 'firebase.academy.json', '.firebaserc', 'public/academy-config.js', 'server.js', 'functions', 'assets'];
  let base = null;
  try { base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { base = null; }
  if (base) {
    const changed = execSync('git diff --name-only ' + base + ' -- ' + FROZEN.join(' '), { cwd: ROOT }).toString().trim();
    assert.equal(changed, '', 'frozen paths changed: ' + changed);
    const bin = execSync('git diff --name-only ' + base + ' -- "*.glb" "*.stl" "*.3mf" "*.png" "*.jpg" "*.webp" "*.mp4"', { cwd: ROOT }).toString().trim();
    assert.equal(bin, '', 'no binary assets: ' + bin);
  }
  assert.ok(!/mercadopago|firebase|firestore|signer|checkout|payment|enroll|price|fetch\(|XMLHttpRequest|localStorage|sessionStorage/i.test(LAYER));
});

test('23 · existing payment and Academy checks still pass', function () {
  const dir = path.join(ROOT, 'workers', 'dmf-payments', 'test');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.cjs'));
  assert.ok(files.length >= 5);
  for (const f of files) execSync('node ' + JSON.stringify(path.join(dir, f)), { cwd: ROOT, stdio: 'ignore' });
  assert.ok(OUT.includes('DMF_ACADEMY_LINK'), 'Academy link injected');
  assert.ok(/href="\/login"[^>]*>[^<]*Student Access|Student Access[\s\S]{0,200}\/login/.test(OUT) || OUT.includes('href="/login"'), 'Student Access still points at /login');
});

test('24 · mobile navigation regression stays green', function () {
  for (const html of [SRC, OUT]) {
    assert.ok(html.includes('.nav.nav-open{backdrop-filter:none;-webkit-backdrop-filter:none}'));
    assert.ok(html.includes("document.querySelector('.nav').classList.toggle('nav-open', open);"));
    assert.ok(html.includes("document.querySelector('.nav').classList.remove('nav-open');"));
  }
  const field = between(SRC, '.eh-field{', '}');
  assert.ok(field.includes('pointer-events:none'), 'the field (blades, vignette) never intercepts a tap');
  assert.ok(between(SRC, '.eh-vig{', '}').includes('pointer-events:none'));
});

test('reveal plays once per session in ≤ 1.4 s, and the section cut in ≤ 450 ms', function () {
  assert.ok(L.revealDur <= 1.4 && L.transDur <= 0.45);
  const d = director();
  run(d, 120, { scrollY: at('hero') });
  assert.equal(d.state.reveal, 0, 'dark before the Receiver arrives');
  assert.equal(d.state.revealLight, 0.25, 'a faint silhouette');
  let n = 0, fired = 0;
  for (let i = 0; i < 200; i++) { const st = d.update(inp({ scrollY: at('relic') }), DT); if (st.reveal < 1) n++; if (d.blackSun.revealNow) fired++; }
  assert.equal(fired, 1);
  assert.ok(n * DT <= 1.4 + DT, 'reveal lasts ' + (n * DT).toFixed(2));
  run(d, 120, { scrollY: at('hero') });
  assert.equal(d.state.reveal, 1, 'never replays on scroll');
  assert.ok(MOD.includes("root.sessionStorage.getItem(REVEAL_KEY) === '1'") && MOD.includes('root.sessionStorage.setItem(REVEAL_KEY'), 'once per session');
  const deep = director();
  run(deep, 5, { scrollY: at('academy') });
  assert.ok(deep.blackSun.revealT >= 0, 'a deep link past the Receiver reveals it too');
  const c = director();
  run(c, 60, { scrollY: at('bio', 0.9) });
  let cut = 0;
  for (let i = 0; i < 90; i++) { const st = c.update(inp({ scrollY: at('band', 0.1) }), DT); if (st.hold > 0 || st.open > 0) cut++; }
  assert.ok(cut > 0 && cut * DT <= 0.45 + DT, 'cut lasts ' + (cut * DT).toFixed(2));
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/black-sun.test.cjs'));
  const wf = read('.github/workflows/validate-3d.yml');
  assert.ok(wf.includes('node scripts/overdrive/test/black-sun.test.cjs'));
  assert.ok(wf.includes("grep -q 'DMF BLACK SUN' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
