'use strict';

// EVENT HORIZON V2 — SPATIAL NARRATIVE: deterministic simulations of the camera grammar and its companions,
// plus structural guarantees on the runtime and the generated landing (run after the build chain).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { strict: assert } = require('assert');
const SN = require(path.join(__dirname, '..', 'spatial-narrative.js'));
const EH = require(path.join(__dirname, '..', 'event-horizon.js'));

const ROOT = path.join(__dirname, '..', '..', '..');
const DIR = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('index.html');
const OUT = read('public/index.html');
const NARR = fs.readFileSync(path.join(DIR, 'spatial-narrative.js'), 'utf8');
const MOD = fs.readFileSync(path.join(DIR, 'event-horizon.js'), 'utf8');
const BUS = fs.readFileSync(path.join(DIR, 'signal-bus.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(DIR, 'relic.js'), 'utf8');
const MIXER = fs.readFileSync(path.join(DIR, 'mixer-stage.js'), 'utf8');
const BUILD = read('scripts/build-3d.cjs');

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

// A synthetic landing with every section the grammar knows.
const IDS = ['intro', 'hero', 'relic', 'bio', 'band', 'releases', 'sets', 'platforms', 'rider', 'academy', 'offer', 'lab', 'tips', 'contact'];
const TOPS = IDS.map((_, i) => i * 1000);
const LIGHTS = IDS.map(() => 0.6);
const CALMS = IDS.map((id) => (id === 'offer' ? 1 : id === 'lab' ? 0.6 : id === 'academy' ? 0.35 : id === 'contact' ? 0.3 : 0));
const VH = 900, DT = 1 / 60, DOC = 14500;
const L = SN.LIMITS;
function director() {
  const d = new EH.DMFEventHorizon();
  d.setMarkers(TOPS, IDS, LIGHTS, CALMS, DOC);
  return d;
}
function at(id, frac) { return TOPS[IDS.indexOf(id)] + 1000 * (frac == null ? 0.5 : frac) - VH * 0.45; }
function inp(o) {
  return Object.assign({ scrollY: 0, vh: VH, velocity: 0, s: {}, forces: {}, pointerX: 0, pointerY: 0, pointerActive: false,
    tier: 'high', compact: false, wakeT: -1, pre: 0, docProgress: 0 }, o);
}
function sig(i, every, kick) { return { energy: 0.8, kick: kick == null ? 0.9 : kick, low: 0.7, mid: 0.6, high: 0.5, beatFired: i % every === 0 }; }
function run(d, n, o) { let st; for (let i = 0; i < n; i++) st = d.update(inp(typeof o === 'function' ? o(i) : o), DT); return st; }
function within(st) {
  assert.ok(Math.abs(st.camPan) <= L.pan + 1e-9, 'pan ' + st.camPan);
  assert.ok(Math.abs(st.camTilt) <= L.tilt + 1e-9, 'tilt ' + st.camTilt);
  assert.ok(Math.abs(st.camRoll) <= L.roll + 1e-9, 'roll ' + st.camRoll);
  assert.ok(Math.abs(st.dolly) <= L.dolly + 1e-9, 'dolly ' + st.dolly);
  assert.ok(Math.abs(st.headYaw) <= L.headYaw + 1e-9 && Math.abs(st.headPitch) <= L.headPitch + 1e-9, 'head');
  assert.ok(Math.abs(st.gravityX) <= L.gravity && Math.abs(st.gravityY) <= L.gravity, 'gravity');
}

test('camera grammar: every section has a pose, and every pose sits inside the hard limits', function () {
  for (const id of IDS) {
    const p = SN.POSES[id];
    assert.ok(p, 'pose for ' + id);
    assert.ok(Math.abs(p.pan) + Math.abs(p.sweep) / 2 <= L.pan && Math.abs(p.tilt) <= L.tilt && Math.abs(p.roll) <= L.roll && Math.abs(p.dolly) <= L.dolly, id);
  }
  assert.ok(L.pan <= 1.5 && L.tilt <= 1 && L.roll <= 0.3 && L.dolly <= 0.03, 'limits stay nausea-safe');
  assert.ok(SN.POSES.hero.dolly > 0, 'hero dollies in');
  assert.ok(SN.POSES.sets.tilt < 0 && SN.POSES.tips.tilt < 0, 'DJ / mixer: camera low');
  assert.ok(SN.POSES.releases.sweep > 0, 'releases: lateral pass');
  assert.ok(SN.POSES.offer.pan === 0 && SN.POSES.offer.tilt === 0 && SN.POSES.offer.dolly === 0, 'offer at rest');
  assert.ok(SN.POSES.contact.dolly < 0, 'contact pulls back to close the stage');
});

test('camera, dolly and head stay bounded under a full-page run with extreme inputs', function () {
  const d = director();
  for (let i = 0; i < 2400; i++) {
    const st = d.update(inp({ scrollY: i * 6, velocity: (i % 90) < 45 ? 5 : -5, s: sig(i, 7, 1), forces: { forceLow: 1, forceMid: 1, forceHigh: 1 },
      pointerX: (i % 50) / 25 - 1, pointerY: 1, pointerActive: true, docProgress: i / 2400, pre: 1 }), DT);
    within(st);
  }
});

test('continuity: crossing a boundary never jumps the camera (critically damped, no reset)', function () {
  const d = director();
  let prev = null, maxStep = 0;
  for (let i = 0; i < 1800; i++) {
    const st = d.update(inp({ scrollY: 3000 + i * 3, docProgress: (3000 + i * 3) / DOC }), DT);
    if (prev) maxStep = Math.max(maxStep, Math.abs(st.camPan - prev.pan), Math.abs(st.camTilt - prev.tilt), Math.abs(st.dolly - prev.dolly) * 40);
    prev = { pan: st.camPan, tilt: st.camTilt, dolly: st.dolly };
  }
  assert.ok(maxStep < 0.02, 'per-frame camera step ' + maxStep);
});

test('neutral return: pointer, audio and scroll released → head, gravity and pressure settle at rest', function () {
  const d = director();
  run(d, 240, (i) => ({ scrollY: at('relic'), s: sig(i, 20), forces: { forceLow: 0.8, forceMid: 0.8 }, pointerX: 0.9, pointerY: -0.8, pointerActive: true }));
  const st = run(d, 600, { scrollY: at('relic') });
  const pose = SN.POSES.relic;
  assert.ok(Math.abs(st.gravityX) < 0.01 && Math.abs(st.gravityY) < 0.01, 'gravity neutral');
  assert.ok(st.pressure < 0.02, 'pressure released');
  assert.ok(Math.abs(st.camPan - pose.pan) < 0.01 && Math.abs(st.camTilt - pose.tilt) < 0.01, 'camera back on the section pose');
  assert.ok(Math.abs(st.headYaw) < L.headYaw * 0.35 && Math.abs(st.headPitch) < L.headPitch * 0.35, 'head near its natural rest');
});

test('pressure is critically damped: a kick loads it, silence returns it without overshoot', function () {
  const n = new SN.DMFSpatialNarrative();
  const c = new SN.DMFCritical(16);
  c.v = 5;
  let min = 0;
  for (let i = 0; i < 180; i++) { c.step(0, DT); min = Math.min(min, c.x); }
  assert.ok(Math.abs(c.x) < 1e-3, 'at rest');
  assert.ok(min > -1e-3, 'no undershoot through rest');
  assert.ok(n.press.w >= 10, 'short, heavy');
});

test('hero moment: fires once, on the first strong kick after wake, only in intro/hero, < 500 ms', function () {
  const d = director();
  // Waking: no moment.
  let st = run(d, 60, (i) => ({ scrollY: 0, wakeT: 0.5 + i * DT, s: sig(i, 10) }));
  assert.equal(st.heroMoment, 0, 'not while waking');
  // Awake, weak kicks: no moment.
  st = run(d, 60, (i) => ({ scrollY: 0, s: sig(i, 10, 0.3) }));
  assert.equal(d.narrative.heroFired, false);
  // First strong kick: fires.
  let active = 0, peak = 0, fires = 0;
  for (let i = 0; i < 600; i++) {
    st = d.update(inp({ scrollY: 0, s: sig(i, 12) }), DT);
    if (d.narrative.heroFiredNow) fires++;
    if (st.heroMoment > 0) active++;
    peak = Math.max(peak, st.heroMoment);
  }
  assert.equal(fires, 1, 'exactly once');
  assert.ok(peak > 0.8 && peak <= 1, 'real, bounded');
  assert.ok(active * DT < SN.MOMENT_DUR + 0.02 && SN.MOMENT_DUR < 0.5, 'duration ' + active * DT);
  // Outside intro/hero, or already seen this visit: never.
  const e = director();
  run(e, 300, (i) => ({ scrollY: at('bio'), s: sig(i, 12) }));
  assert.equal(e.narrative.heroFired, false, 'not in other sections');
  const f = director();
  f.narrative.heroFired = true;
  st = run(f, 300, (i) => ({ scrollY: 0, s: sig(i, 12) }));
  assert.equal(st.heroMoment, 0, 'seeded from sessionStorage: no replay');
  // LITE / STATIC: never.
  const g = director();
  run(g, 300, (i) => ({ scrollY: 0, tier: 'lite', s: sig(i, 12) }));
  assert.equal(g.narrative.heroFired, false, 'not on LITE');
});

test('afterimage: once per valid crossing, 350–650 ms, max one active, never into the offer', function () {
  const d = director();
  run(d, 30, { scrollY: at('bio') });
  let st = d.update(inp({ scrollY: at('band', 0.05) }), DT);
  assert.equal(st.afterId, 1, 'fires on the crossing');
  let frames = 0;
  for (let i = 0; i < 90; i++) { st = d.update(inp({ scrollY: at('band', 0.05) }), DT); if (st.afterimage > 0.001) frames++; }
  assert.ok(frames * DT >= 0.3 && frames * DT <= 0.65, 'duration ' + frames * DT);
  assert.equal(st.afterimage, 0, 'gone');
  assert.equal(st.afterId, 1, 'no second trace without a second crossing');
  // Into the offer: no gate, no afterimage.
  const o = director();
  run(o, 200, { scrollY: at('academy') });
  st = o.update(inp({ scrollY: at('offer', 0.02) }), DT);
  run(o, 60, { scrollY: at('offer', 0.02) });
  assert.equal(o.state.afterId, 0, 'offer arrives clean');
  // LITE / STATIC: none.
  for (const tier of ['lite', 'static']) {
    const t = director();
    run(t, 30, { scrollY: at('bio'), tier });
    run(t, 60, { scrollY: at('band', 0.05), tier });
    assert.equal(t.state.afterimage, 0, tier);
  }
});

test('BALANCED keeps the narrative with a lighter afterimage; COMPACT keeps cameras almost neutral', function () {
  const hi = director(), ba = director();
  for (const d of [hi, ba]) run(d, 30, { scrollY: at('bio') });
  let pk = { hi: 0, ba: 0 };
  for (let i = 0; i < 60; i++) {
    pk.hi = Math.max(pk.hi, hi.update(inp({ scrollY: at('band', 0.05) }), DT).afterimage);
    pk.ba = Math.max(pk.ba, ba.update(inp({ scrollY: at('band', 0.05), tier: 'balanced' }), DT).afterimage);
  }
  assert.ok(pk.ba > 0 && pk.ba < pk.hi, 'balanced: less afterimage');
  const wide = run(director(), 400, { scrollY: at('sets') });
  const comp = run(director(), 400, { scrollY: at('sets'), compact: true });
  assert.ok(Math.abs(comp.camTilt) <= Math.abs(wide.camTilt) * SN.COMPACT_CAMERA + 0.01, 'compact camera ≤ 30%');
  assert.ok(comp.zk <= wide.zk * 0.5 + 1e-9, 'compact depth 40–50%');
  assert.ok(SN.COMPACT_HEAD >= 0.35 && SN.COMPACT_HEAD <= 0.45, 'head orientation 35–45% on phones');
});

test('pointer gravity: fine pointer only, HIGH/BALANCED only, soft, quieter in the sanctuary', function () {
  const on = run(director(), 200, { scrollY: at('hero'), pointerX: 1, pointerActive: true });
  assert.ok(on.gravityX > 0.9, 'follows a fine pointer');
  assert.equal(run(director(), 200, { scrollY: at('hero'), pointerX: 1, pointerActive: false }).gravityX, 0, 'no fine pointer, no gravity');
  assert.equal(run(director(), 200, { scrollY: at('hero'), pointerX: 1, pointerActive: true, compact: true }).gravityX, 0, 'touch devices: off');
  assert.equal(run(director(), 200, { scrollY: at('hero'), pointerX: 1, pointerActive: true, tier: 'lite' }).gravityX, 0, 'LITE: off');
  const calm = run(director(), 400, { scrollY: at('offer'), pointerX: 1, pointerActive: true });
  assert.ok(calm.gravityX < 0.35, 'sanctuary quiets it');
  // Soft attack: one frame of pointer moves gravity only a little.
  const d = director();
  const one = d.update(inp({ scrollY: at('hero'), pointerX: 1, pointerActive: true }), DT);
  assert.ok(one.gravityX < 0.05, 'no snap');
  assert.ok(MOD.includes('if (fine && !still)') && MOD.includes("if (e.pointerType && e.pointerType !== 'mouse') return;"), 'binding: fine mouse only');
  assert.ok(MOD.includes('input.pointerActive = ptrClientX >= 0;'));
});

test('conversion sanctuary: the offer rests the camera and cuts the audio response', function () {
  const busy = run(director(), 600, (i) => ({ scrollY: at('sets'), s: sig(i, 20), forces: { forceLow: 0.8, forceMid: 0.8, forceHigh: 0.8 } }));
  const off = run(director(), 600, (i) => ({ scrollY: at('offer'), s: sig(i, 20), forces: { forceLow: 0.8, forceMid: 0.8, forceHigh: 0.8 } }));
  assert.ok(off.calm > 0.95);
  assert.ok(Math.abs(off.camPan) < 0.02 && Math.abs(off.camTilt) < 0.02 && Math.abs(off.camRoll) < 0.01, 'camera at rest');
  assert.ok(Math.abs(off.dolly) < 0.004, 'no drift');
  assert.ok(off.low < busy.low * 0.4 && off.mid < busy.mid * 0.4, 'audio response ~30%');
  assert.ok(off.zk < busy.zk * 0.5, 'depth recedes');
  assert.ok(RELIC.includes('* approach * (1 - 0.65 * ehCalm)'), 'the Receiver recedes behind the offer');
  assert.ok(SRC.includes('html.eh-calm .tier-card{background-color:rgba(10,8,6,.9)}'), 'cards gain contrast');
});

test('one light source: continuous across the page and resolved per surface', function () {
  const d = director();
  let prev = null, jump = 0;
  for (let i = 0; i < 1200; i++) {
    const st = d.update(inp({ scrollY: i * 10, docProgress: i / 1200 }), DT);
    if (prev != null) jump = Math.max(jump, Math.abs(st.lightX - prev));
    prev = st.lightX;
  }
  assert.ok(jump < 0.02, 'no jumps: ' + jump);
  assert.ok(SRC.includes("calc((var(--eh-lx,.5) - var(--eh-l,0)) / var(--eh-w,1) * 277.8% - 50%)"), 'each frame resolves the light by its own place');
  assert.ok(MOD.includes("sheens[q].style.setProperty('--eh-l'") && MOD.includes("sheens[q].style.setProperty('--eh-w'"), 'measured once per layout');
  for (const t of ['<div class="release-card"><span class="eh-sheen" aria-hidden="true"></span>', '<div class="set-card"><span class="eh-sheen" aria-hidden="true"></span>'])
    assert.ok(SRC.includes(t) && OUT.includes(t), 'reflection continuity reaches ' + t.slice(12, 24));
});

test('reduced motion and Save-Data: composed still, no camera, no afterimage, no hero moment', function () {
  const d = director();
  run(d, 120, (i) => ({ scrollY: at('sets'), s: sig(i, 10), pointerX: 1, pointerActive: true }));
  const st = d.compose(IDS.indexOf('sets'));
  for (const k of ['camPan', 'camTilt', 'camRoll', 'dolly', 'pressure', 'headYaw', 'headPitch', 'gravityX', 'gravityY', 'afterimage', 'heroMoment']) assert.equal(st[k], 0, k);
  assert.ok(MOD.includes('var still = !!(hub.reduced || hub.saveData);') && MOD.includes('if (still || !hub.onFrame) { composeStill(); return; }'));
  const rm = SRC.slice(SRC.lastIndexOf('@media(prefers-reduced-motion:reduce){'));
  assert.ok(rm.includes('.hero-ghost,.hero-img,.hero-img img,.band img,.release-card,.set-card,.label-item,.concert-logo-wrap,.eh-stack{translate:none;scale:none}'));
  assert.ok(rm.includes('.eh-after{display:none}'));
  assert.ok(SRC.includes('.eh-calm .eh-after,.eh-still .eh-after,.eh-tier-lite .eh-after,.eh-tier-static .eh-after{display:none!important}'));
});

test('one clock, one audio graph, one Three.js, one GLTFLoader, no new renderer', function () {
  assert.equal(count(NARR, 'requestAnimationFrame') + count(MOD, 'requestAnimationFrame'), 0, 'narrative and director own no loop');
  assert.equal(count(BUS, 'requestAnimationFrame(frame)'), 2, 'the Signal Bus is the only persistent loop');
  assert.equal(count(SRC, 'requestAnimationFrame'), 1, 'the page keeps only its one-shot scroll rAF');
  assert.ok(!/setInterval\s*\(|setTimeout\s*\(/.test(NARR + MOD), 'no timers');
  assert.ok(!/AudioContext\s*[(|]|webkitAudioContext|createAnalyser|createMediaElementSource/.test(NARR + MOD), 'no audio graph');
  assert.equal(count(OUT, 'actx = new AC()'), 1, 'one AudioContext in the page (the bus)');
  assert.equal(count(OUT, 'createAnalyser()'), 1, 'one analyser');
  assert.equal(count(OUT, 'three.js/r128/three.min.js'), 1);
  assert.equal(count(OUT, 'examples/js/loaders/GLTFLoader.js'), 1);
  assert.equal(count(OUT, 'new THREE.WebGLRenderer('), 2, 'the Receiver and the mixer, nothing new');
  assert.ok(!/THREE|WebGL|getContext\(|document|window\./.test(NARR.slice(NARR.indexOf("'use strict';"), NARR.indexOf('var api = {'))), 'the narrative is pure');
});

test('source and generated output stay synchronized; runtime inlined once, in order', function () {
  assert.equal(count(OUT, 'DMF SPATIAL NARRATIVE — pure mapping layer'), 1);
  const order = ['signal-bus.js', 'spatial-narrative.js', 'event-horizon.js', 'relic.js'].map((m) => BUILD.indexOf("inlineModule('" + m + "')"));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'bus → narrative → director → relic');
  for (const needle of ['<span class="eh-after"></span>', 'EVENT HORIZON V2 — SPATIAL NARRATIVE', '.eh-field.eh-after-on .eh-after{display:block}',
    '.concert-logo-wrap{scale:calc(1 + var(--eh-moment,0) * .012)', 'html.eh-calm .section-title,html.eh-calm .acad-title{scale:none}']) {
    assert.ok(SRC.includes(needle), 'source: ' + needle);
    assert.ok(OUT.includes(needle), 'public: ' + needle);
  }
});

test('hot paths allocate nothing per frame', function () {
  const HOT_ALLOC = /\bnew [A-Z]|\[\s*\]|\{\s*\}|\.map\(|\.filter\(|\.concat\(|\.slice\(|function\s*\(/;
  for (const [name, code] of [
    ['DMFSpatialNarrative.update', body(NARR, 'DMFSpatialNarrative.prototype.update = function (st, inp, ids, dt)')],
    ['DMFCritical.step', body(NARR, 'DMFCritical.prototype.step = function (target, dt)')],
    ['DMFEventHorizon.update', body(MOD, 'DMFEventHorizon.prototype.update = function (inp, dt)')],
    ['binding tick', body(MOD, 'function tick(s, dt, raw, bus)')],
    ['binding write', body(MOD, 'function write(force)')]
  ]) assert.ok(!HOT_ALLOC.test(code.slice(code.indexOf('{') + 1)), name + ' allocates per frame');
});

test('observability: spatialNarrative on the debug perf surface, 2 Hz, never logged', function () {
  const rep = body(MOD, 'function report()');
  for (const k of ['cameraPan', 'cameraTilt', 'cameraRoll', 'dolly', 'pressure', 'afterimage', 'pointerGravity', 'heroMoment', 'activeSection', 'tier'])
    assert.ok(rep.includes(k + ':'), k);
  assert.ok(MOD.includes('if (perf && perfT > 0.5)'));
  assert.ok(!/console\.(log|info|debug|warn)/.test(NARR + MOD));
});

test('the Receiver and the mixer read the narrative without new loops', function () {
  assert.ok(RELIC.includes('+ ehPan * 0.0175') && RELIC.includes('+ ehTilt * 0.06'), 'Receiver camera follows the grammar');
  assert.ok(RELIC.includes('+ ehDolly * 4'), 'Receiver dolly');
  assert.ok(RELIC.includes('nodBase - 0.03 * pressure + ehPitch') && RELIC.includes('ehQuiet + ehYaw, -0.05, 0.05)'), 'figure orientation, clamped by the existing limits');
  assert.ok(RELIC.includes('(1 + 0.6 * ehDepth + 0.4 * ehPress)'), 'cabinets carry acoustic pressure');
  assert.ok(MIXER.includes('var elev = VIEW_ELEVATION - 0.05 * stage.low;'), 'mixer camera ≤ ~3° lower in its section');
  assert.equal(count(RELIC + MIXER, 'requestAnimationFrame'), 0);
});

test('payments, auth, entitlement, signing and geometry are untouched', function () {
  const FROZEN = ['workers', 'firestore.rules', 'firebase.json', 'firebase.academy.json', 'public/login.html', 'public/payment-result.html',
    'public/academy.html', 'server.js', 'functions', 'assets/models'];
  let base = null;
  try { base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { base = null; }
  if (base) {
    const changed = execSync('git diff --name-only ' + base + ' -- ' + FROZEN.join(' '), { cwd: ROOT }).toString().trim();
    assert.equal(changed, '', 'frozen paths changed: ' + changed);
  }
  // Content invariant (also holds on a shallow CI checkout): the narrative layer knows nothing about them.
  assert.ok(!/mercadopago|firebase|firestore|signer|checkout|payment|enroll|fetch\(|XMLHttpRequest|localStorage/i.test(NARR));
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/spatial-narrative.test.cjs'));
  const wf = read('.github/workflows/validate-3d.yml');
  assert.ok(wf.includes('node scripts/overdrive/test/spatial-narrative.test.cjs'));
  assert.ok(wf.includes("grep -q 'DMF SPATIAL NARRATIVE' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
