'use strict';

// EVENT HORIZON V5 — MASS DRIVER: deterministic simulations of the acceleration layer through the full
// director, plus structural guarantees on the runtime and the generated landing (run after the build chain).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { strict: assert } = require('assert');
const MD = require(path.join(__dirname, '..', 'mass-driver.js'));
const SN = require(path.join(__dirname, '..', 'spatial-narrative.js'));
const SO = require(path.join(__dirname, '..', 'stage-overdrive.js'));
const EH = require(path.join(__dirname, '..', 'event-horizon.js'));

const ROOT = path.join(__dirname, '..', '..', '..');
const DIR = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('index.html');
const OUT = read('public/index.html');
const LAYER = fs.readFileSync(path.join(DIR, 'mass-driver.js'), 'utf8');
const MOD = fs.readFileSync(path.join(DIR, 'event-horizon.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(DIR, 'relic.js'), 'utf8');
const BUILD = read('scripts/build-3d.cjs');
const DEV = read('scripts/dev-hyperdrive.cjs');
const L = MD.LIMITS;

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
// 120 BPM with the engine's beat prediction (timeToBeat counts down to the next beat).
function beat(i, kick) {
  return { energy: 0.85, kick: kick == null ? 1 : kick, low: 0.8, mid: 0.6, high: 0.6, beatFired: i % 30 === 0, timeToBeat: ((30 - (i % 30)) % 30) / 60 };
}
function run(d, n, o) { let st; for (let i = 0; i < n; i++) st = d.update(inp(typeof o === 'function' ? o(i) : o), DT); return st; }
const V5 = ['charge', 'precompress', 'drive', 'driveLift', 'driveMass', 'driveSettle', 'driveHead', 'driveTorso', 'wavefront', 'floorWave',
  'lightVelocity', 'lightCompression', 'typeVelocity', 'typeSettle'];
const SIGNED = ['driveDolly', 'driveRoll', 'driveLateral', 'driveShoulder'];
// Runs loud music in a section until the first shot, then records every term per frame for 1 s.
function firstShot(opts) {
  const d = director();
  const o = Object.assign({ id: 'relic', tier: 'high', compact: false }, opts || {});
  let fired = -1; const trace = [];
  for (let i = 0; i < 900; i++) {
    const st = d.update(inp({ scrollY: at(o.id), s: beat(i), forces: LOUD, tier: o.tier, compact: o.compact }), DT);
    if (fired < 0 && d.massDriver.firedNow) fired = i;
    if (fired >= 0) { const row = {}; V5.concat(SIGNED, ['halo', 'gravity', 'sunScale', 'reflectionShock', 'woofer']).forEach((k) => { row[k] = st[k]; }); trace.push(row); }
    if (fired >= 0 && trace.length >= 60) break;
  }
  return { d, fired, trace };
}
function onset(trace, k) { for (let i = 0; i < trace.length; i++) if (Math.abs(trace[i][k]) > 0.01) return i; return -1; }
function peakAt(trace, k) { let m = 0, a = -1; trace.forEach((r, i) => { if (Math.abs(r[k]) > m) { m = Math.abs(r[k]); a = i; } }); return a; }

test('hard bounds: every V5 term is clamped and V1–V4 bounds still hold under extreme input', function () {
  const d = director();
  for (let i = 0; i < 5000; i++) {
    const st = d.update(inp({ scrollY: (i * 9) % 14000, velocity: (i % 70) < 35 ? 7 : -7, s: { energy: 9, kick: 9, low: 9, mid: 9, high: 9, beatFired: i % 2 === 0, timeToBeat: (i % 7) / 60 },
      forces: { forceLow: 9, forceMid: 9, forceHigh: 9 }, pointerX: 4, pointerY: -4, pointerActive: true, pre: 5 }), i % 23 === 0 ? 0.4 : DT);
    for (const k of V5) assert.ok(st[k] >= 0 && st[k] <= 1, k + '=' + st[k]);
    for (const k of SIGNED) assert.ok(st[k] >= -1 && st[k] <= 1, k + '=' + st[k]);
    assert.ok(st.driveDolly >= -0.35, 'dolly compression bounded');
    assert.ok(Math.abs(st.sunScale) <= 0.03 + 1e-12, 'Black Sun stays inside V4 bounds');
    assert.ok(st.woofer <= SO.LIMITS.woofer + 1e-12, 'woofer stays inside the V3 4% budget');
    for (const k of ['gravity', 'halo', 'reflectionShock', 'titlePressure', 'floorPress']) assert.ok(st[k] >= 0 && st[k] <= 1, k);
    assert.ok(Math.abs(st.headYaw) <= SN.LIMITS.headYaw + 1e-9 && Math.abs(st.headPitch) <= SN.LIMITS.headPitch + 1e-9, 'head limits unchanged');
    assert.ok(Math.abs(st.camPan) <= SN.LIMITS.pan + 1e-9 && Math.abs(st.dolly) <= SN.LIMITS.dolly + 1e-9, 'V2 camera limits unchanged');
  }
});

test('no new loop, audio graph, renderer, Three.js, loader, timers or network', function () {
  const c = code(LAYER);
  assert.ok(!/requestAnimationFrame|setTimeout|setInterval|Date\.now|performance\.now/.test(c), 'no clock of its own');
  assert.ok(!/AudioContext|createAnalyser|new Audio\b|WebGL|getContext|THREE|GLTFLoader|document|window\.|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|console\./.test(c), 'pure, silent layer');
  assert.equal(count(OUT, 'requestAnimationFrame'), 3, 'bus (2) + one-shot page scroll (1), as on main');
  assert.equal(count(OUT, 'actx = new AC()'), 1);
  assert.equal(count(OUT, 'createAnalyser()'), 1);
  assert.equal(count(OUT, 'new THREE.WebGLRenderer('), 2);
  assert.equal(count(OUT, 'three.js/r128/three.min.js'), 1);
  assert.equal(count(OUT, 'examples/js/loaders/GLTFLoader.js'), 1);
  assert.equal(count(RELIC, 'new THREE.GLTFLoader()'), 1);
  assert.equal(count(OUT, 'setInterval('), 2, 'no new intervals');
  assert.equal(count(OUT, 'setTimeout('), 15, 'no new timeouts');
});

test('no allocations in the hot path', function () {
  const HOT_ALLOC = /\bnew [A-Z]|\[\s*\]|\{\s*\}|\.map\(|\.filter\(|\.concat\(|\.slice\(|function\s*\(/;
  for (const [name, c] of [
    ['DMFMassDriver.update', body(LAYER, 'DMFMassDriver.prototype.update = function (st, inp, ids, dt)')],
    ['pulse', body(LAYER, 'function pulse(t, delay, attack, end)')],
    ['relic applyCamera', body(RELIC, 'function applyCamera(dolly)')],
    ['relic applyReceiverTransform', body(RELIC, 'function applyReceiverTransform()')],
    ['director update', body(MOD, 'DMFEventHorizon.prototype.update = function (inp, dt)')],
    ['binding write', body(MOD, 'function write(force)')]
  ]) assert.ok(!HOT_ALLOC.test(code(c).slice(code(c).indexOf('{') + 1)), name + ' allocates per frame');
});

test('A · charge builds slowly from sustained LOW + ENERGY, drains in silence, is suppressed in the offer', function () {
  const d = director();
  run(d, 60, { scrollY: at('relic') });
  const q = run(d, 6, { scrollY: at('relic'), s: { energy: 0.9 }, forces: { forceLow: 1 } });
  assert.ok(q.charge < 0.1, 'never jumps: ' + q.charge);
  const full = run(d, 240, { scrollY: at('relic'), s: { energy: 0.9 }, forces: { forceLow: 1 } });
  assert.ok(full.charge > 0.6, 'stores potential over seconds: ' + full.charge);
  const drained = run(d, 300, { scrollY: at('relic') });
  assert.ok(drained.charge < 0.01, 'silence drains it: ' + drained.charge);
  const o = director();
  let m = 0;
  for (let i = 0; i < 900; i++) { const c = o.update(inp({ scrollY: at('offer'), s: beat(i), forces: LOUD }), DT).charge; if (i > 300) m = Math.max(m, c); }
  assert.ok(m < 0.05, 'offer sanctuary (once calm has settled): ' + m);
});

test('B · precompression anticipates the kick (≤ 180 ms) and is bounded', function () {
  const d = director();
  run(d, 300, (i) => ({ scrollY: at('relic'), s: { energy: 0.85, low: 0.8, beatFired: false, timeToBeat: 1 }, forces: LOUD }));
  assert.ok(d.state.charge >= L.fireCharge, 'charged');
  let pre = 0, frames = 0;
  for (let i = 0; i < 12; i++) {
    const st = d.update(inp({ scrollY: at('relic'), s: { energy: 0.85, low: 0.8, beatFired: false, timeToBeat: Math.max(0, (12 - i) / 60) }, forces: LOUD }), DT);
    pre = Math.max(pre, st.precompress); if (st.precompress > 0.05) frames++;
  }
  assert.ok(pre > 0.3 && pre <= 0.8 + 1e-9, 'anticipation, not a flash: ' + pre);
  assert.ok(frames * DT <= 0.18, 'within the 150 ms window: ' + frames * DT);
  assert.ok(L.anticipate <= 0.18);
});

test('C · a shot reads PRECOMPRESSION → RELEASE → COAST → RECOVERY in 450–750 ms and lands at exactly zero, no bounce', function () {
  const { fired, trace } = firstShot();
  assert.ok(fired > 0, 'fires once charged');
  const active = trace.filter((r) => r.drive > 0 || r.precompress > 0.01).length;
  assert.ok(L.shotEnd >= 0.45 && L.shotEnd <= 0.75);
  assert.ok(active * DT <= L.shotEnd + DT && active * DT >= 0.45, 'lasts ' + (active * DT).toFixed(2) + ' s');
  assert.ok(onset(trace, 'precompress') <= 1 && onset(trace, 'precompress') < onset(trace, 'drive'), 'pressure first');
  const p = peakAt(trace, 'drive');
  for (let i = p + 1; i < trace.length; i++) assert.ok(trace[i].drive <= trace[i - 1].drive + 1e-12, 'monotonic recovery (no bounce) at ' + i);
  assert.equal(trace[Math.ceil(L.shotEnd / DT) + 2].drive, 0, 'lands at exactly zero');
  // Heavy recovery: still more than a third up halfway through the coast.
  assert.ok(trace[p + Math.round(0.2 / DT)].drive > 0.3, 'coasts before recovering');
});

test('C · rate limit ≥ 1.2 s, meaningful kicks only, energetic sections only, never the offer', function () {
  const d = director();
  const times = [];
  for (let i = 0; i < 1800; i++) { d.update(inp({ scrollY: at('sets'), s: beat(i), forces: LOUD }), DT); if (d.massDriver.firedNow) times.push(i * DT); }
  assert.ok(times.length >= 4, 'fires in energetic music: ' + times.length);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= L.gap - 1e-9, 'gap ' + (times[i] - times[i - 1]));
  for (const id of ['bio', 'platforms', 'academy', 'offer', 'lab', 'tips', 'contact']) {
    const o = director(); let n = 0;
    for (let i = 0; i < 900; i++) { o.update(inp({ scrollY: at(id), s: beat(i), forces: LOUD }), DT); if (o.massDriver.firedNow) n++; }
    assert.equal(n, 0, 'no shot in ' + id);
  }
  const w = director(); let n = 0;
  for (let i = 0; i < 900; i++) { w.update(inp({ scrollY: at('relic'), s: beat(i, 0.4), forces: LOUD }), DT); if (w.massDriver.firedNow) n++; }
  assert.equal(n, 0, 'weak kicks never fire');
  const m = director(); n = 0;
  for (let i = 0; i < 900; i++) { m.update(inp({ scrollY: at('relic'), s: Object.assign(beat(i), { energy: 0.5 }), forces: { forceLow: 0.4 } }), DT); if (m.massDriver.firedNow) n++; }
  assert.equal(n, 0, 'moderate music never charges enough to fire');
});

test('C · the 1.2 s rate limit holds on its own, even with the charge pinned at maximum', function () {
  const md = new MD.DMFMassDriver();
  const st = { performanceTier: 'high', compact: false, calm: 0, silence: 0, wake: 1, running: true, index: 2, low: 1, energy: 1, speed: 0,
    velocity: 0, hold: 0, gravity: 0, sunScale: 0, halo: 0, reflectionShock: 0, titlePressure: 0, woofer: 0, floorPress: 0 };
  const times = [];
  for (let i = 0; i < 1200; i++) {
    md.charge = 1;
    md.update(st, { s: { energy: 1, kick: 1, beatFired: i % 6 === 0, timeToBeat: 0.05 } }, IDS, DT);
    if (md.firedNow) times.push(i * DT);
  }
  assert.ok(times.length >= 10, 'fires repeatedly: ' + times.length);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 1.2 - 1e-9, 'gap ' + (times[i] - times[i - 1]).toFixed(3));
  assert.ok(L.gap >= 1.2);
});

test('N · the signature: every system answers the same event, each a little later', function () {
  const { trace } = firstShot();
  const o = (k) => onset(trace, k);
  assert.ok(o('precompress') <= o('drive') && o('drive') < o('wavefront') && o('wavefront') < o('floorWave'), 'pressure → release → speakers → floor');
  assert.ok(o('drive') * DT >= 0.02 && o('drive') * DT <= 0.06 + DT, 'release 20–60 ms: ' + o('drive') * DT);
  assert.ok(o('wavefront') * DT >= 0.05 - DT && o('wavefront') * DT <= 0.12, 'speakers 50–120 ms');
  assert.ok(o('lightVelocity') * DT >= 0.08 - DT && o('lightVelocity') * DT <= 0.16, 'light 80–160 ms');
  const T = MD.TIMELINE;
  assert.ok(T.edge[0] >= 0.08 && T.edge[0] <= 0.16 && T.refl[0] >= 0.12 && T.refl[0] <= 0.22, 'Black Sun edge 80–160 ms, reflections 120–220 ms');
  assert.ok(T.edge[0] > T.release[0] && T.refl[0] > T.edge[0], 'the edge responds after the model, the reflection after the edge');
  assert.ok(T.settle[2] >= 0.2 && T.settle[2] <= 0.75, 'coast/recovery 200–750 ms');
  assert.ok(o('driveHead') < o('driveShoulder') && o('driveShoulder') < o('driveTorso'), 'head → shoulders → torso');
  assert.ok(peakAt(trace, 'driveMass') < peakAt(trace, 'driveSettle'), 'the Receiver resists, then settles');
});

test('D · camera acceleration: bounded, no teleport, no zoom pulse, phones ≤ 45%', function () {
  const cam = body(RELIC, 'function applyCamera(dolly)');
  assert.ok(cam.includes('var r = (cur.r - dolly) * fit;') && cam.includes("r -= (e5 ? 0.28 * (e5.driveDolly || 0) : 0) * fit;"), 'dolly ≤ 0.28 units (~4–5% of 4.6–6.8)');
  assert.ok(cam.includes('0.0105 * (e5.driveRoll || 0)'), 'roll ≤ 0.6°');
  assert.ok(0.0105 * 180 / Math.PI <= 0.61);
  assert.ok(cam.includes('0.012 * (e5.driveLateral || 0)') && cam.includes('0.05 * (e5.driveLift || 0)'), 'lateral and lift are small');
  assert.ok(!/fov/.test(between(cam, 'var e5 = hub.eventHorizon;', 'var sp = staged')), 'no FOV zoom pulse from V5');
  const wide = firstShot().trace, phone = firstShot({ compact: true }).trace;
  const mx = (t, k) => Math.max.apply(null, t.map((r) => Math.abs(r[k])));
  assert.ok(mx(phone, 'driveDolly') <= 0.45 * mx(wide, 'driveDolly') + 1e-9, 'phone dolly ≤ 45%');
  assert.ok(mx(phone, 'driveRoll') <= 0.45 * mx(wide, 'driveRoll') + 1e-9, 'phone roll ≤ 45%');
});

test('E · Receiver mass: head first, shoulders later, torso last — inside the existing clamps', function () {
  assert.ok(RELIC.includes('+ ehPitch + 0.03 * mdHead, dt);') && RELIC.includes('+ 0.25 * ehLag + 0.012 * mdShoulder, dt);') && RELIC.includes('+ 0.0012 * ehBreath + 0.004 * mdTorso, dt);'));
  for (const needle of ["var headK = new KB(380, 0.67, { maxA: 160, maxJ: 9000, min: -0.06, max: 0.22 });",
    "var shoulderK = new KB(90, 0.55, { maxA: 4, maxJ: 300, min: -0.03, max: 0.03 });",
    "var torsoK = new KB(70, 0.6, { maxA: 1.2, maxJ: 90, min: -0.003, max: 0.015 });",
    "var twistK = new KB(50, 0.7, { maxA: 3, maxJ: 150, min: -0.05, max: 0.05 });"]) assert.ok(RELIC.includes(needle), 'clamp unchanged: ' + needle.slice(4, 16));
  assert.ok(RELIC.includes('- (ehL ? 0.05 * (ehL.driveMass || 0) : 0);') && RELIC.includes('+ 0.015 * (ehL ? ehL.driveSettle || 0 : 0);'), 'resists, then settles');
});

test('F · speaker propagation travels: cones first, floor later; the 4% cone budget holds', function () {
  const { trace } = firstShot();
  assert.ok(onset(trace, 'wavefront') < onset(trace, 'floorWave') && peakAt(trace, 'wavefront') < peakAt(trace, 'floorWave'));
  assert.ok(trace.every((r) => r.woofer <= 0.04 + 1e-12));
  assert.ok(RELIC.includes('+ 0.3 * mdWave;') && RELIC.includes('+ 0.04 * mdFloor, dt);'), 'existing cones and pedestal carry it (no new meshes)');
  // Pinned to the V4 baseline (works on shallow CI checkouts): the Receiver scene gains no meshes in V5.
  assert.equal(count(RELIC, 'new THREE.Mesh('), 15, 'no extra Receiver meshes');
  assert.equal(count(OUT, 'new THREE.Mesh('), 19, 'no extra meshes on the page');
});

test('G · Black Sun: precompression contracts it inside V4 bounds; its edge answers after the model; heavy return', function () {
  const { trace } = firstShot();
  const pre = trace.slice(0, 5);
  assert.ok(pre.some((r) => r.gravity > 0.3), 'gravity rises in the precompression');
  assert.ok(trace.every((r) => Math.abs(r.sunScale) <= 0.03 + 1e-12), 'never beyond ±3%');
  assert.ok(peakAt(trace, 'halo') > peakAt(trace, 'drive'), 'the edge responds after the model');
  assert.ok(!/blackSun\s*=|st\.iris\s*=|st\.blackSun\s*=/.test(code(LAYER)), 'V4 core terms are modulated, never rewritten');
});

test('H · light velocity: narrower, more directional blades; blade counts unchanged', function () {
  for (const html of [SRC, OUT]) {
    assert.equal(count(html, 'class="eh-blade '), 2);
    assert.ok(html.includes('.eh-compact .eh-blade--2,.eh-tier-lite .eh-blade--2{display:none}'));
    assert.ok(html.includes('.eh-still .eh-blade,.eh-tier-static .eh-blade'));
  }
  const css = between(SRC, '.eh-blade{', '.eh-blade--1');
  assert.ok(css.includes('rotate(calc(var(--r) * (1 - var(--eh-lv,0) * .4)') && css.includes('(1 - var(--eh-lv,0) * .35 - var(--eh-lc,0) * .2)'), 'velocity narrows and straightens');
  assert.ok(css.includes('var(--eh-lv,0) * .12') && css.includes('(1 - var(--eh-calm,0))'), 'a little edge energy, never in the offer');
  const { trace } = firstShot();
  assert.ok(trace.some((r) => r.lightVelocity > 0.3) && trace.some((r) => r.lightCompression > 0.2));
});

test('I · temporal typography: ≤ 1% deformation, transform only, no layout shift, neutral offer', function () {
  const rule = between(SRC, '.section-title,.acad-title{transform-origin', '}');
  assert.ok(rule.includes('- var(--eh-tv,0) * .006') && rule.includes('+ var(--eh-tv,0) * .01') && rule.includes('- var(--eh-tv,0) * 2px + var(--eh-ts,0) * 1px'));
  assert.ok(!/letter-spacing|font-size|width|height|filter|blur/.test(rule), 'transform/text-shadow only');
  const sig = between(SRC, '.dmf-signal-title{transform-origin', '}');
  assert.ok(sig.includes('+ var(--eh-tv,0) * .01') && !/blur|filter|letter-spacing/.test(sig));
  assert.ok(SRC.includes('html.eh-calm .section-title,html.eh-calm .acad-title{scale:none}') && SRC.includes('html.eh-calm .dmf-signal-title{scale:none}'));
  const o = director(); let m = 0;
  for (let i = 0; i < 900; i++) { const st = o.update(inp({ scrollY: at('offer'), s: beat(i), forces: LOUD, velocity: 0.8 }), DT); if (i > 300) m = Math.max(m, st.typeVelocity, st.typeSettle, st.precompress); }
  assert.ok(m < 1e-6, 'offer typography neutral: ' + m);
});

test('J · section launch: the V4 cut taken at speed launches after the dark hold; slow scrolls never do', function () {
  // Music is playing (not a silence vacuum) but kicks are weak, so only the scroll can launch.
  const music = (i) => ({ energy: 0.8, kick: 0.3, low: 0.5, beatFired: i % 30 === 0 });
  function cross(vel) {
    const d = director();
    run(d, 90, (i) => ({ scrollY: at('bio', 0.9), velocity: vel, s: music(i) }));
    let launched = -1, firstDrive = -1;
    for (let i = 0; i < 90; i++) {
      const st = d.update(inp({ scrollY: at('band', 0.1), velocity: vel, s: music(i) }), DT);
      if (d.massDriver.firedNow && launched < 0) launched = i;
      if (st.drive > 0.01 && firstDrive < 0) firstDrive = i;
    }
    return { launched, firstDrive };
  }
  const fast = cross(0.6);
  assert.ok(fast.launched >= 0, 'launches at speed');
  assert.ok((fast.firstDrive - fast.launched) * DT >= L.launchDelay, 'compress + dark hold before the launch');
  assert.equal(cross(0.1).launched, -1, 'a slow scroll never launches');
  const d = director(); let n = 0;
  for (let i = 0; i < 600; i++) { d.update(inp({ scrollY: at('academy', (i % 60) / 60), velocity: 0.8, s: music(i) }), DT); if (d.massDriver.firedNow) n++; }
  assert.ok(n === 0, 'not inside calm areas');
});

test('K · silence vacuum: everything drains to rest; music wakes it in 250–400 ms without an instant shot', function () {
  const d = director();
  run(d, 600, (i) => ({ scrollY: at('relic'), s: beat(i), forces: LOUD }));
  const q = run(d, 240, { scrollY: at('relic') });
  assert.equal(q.silence, 1);
  for (const k of V5.concat(SIGNED)) assert.ok(Math.abs(q[k]) < 1e-3, k + '=' + q[k]);
  let woke = -1, shot = -1;
  for (let i = 0; i < 90; i++) {
    const st = d.update(inp({ scrollY: at('relic'), s: beat(i), forces: LOUD }), DT);
    if (woke < 0 && st.silence < 0.05) woke = i;
    if (shot < 0 && d.massDriver.firedNow) shot = i;
  }
  assert.ok(woke * DT >= 0.25 - DT && woke * DT <= 0.4, 'wakes in ' + (woke * DT).toFixed(2) + ' s');
  assert.ok(shot < 0 || shot * DT >= 1, 'no instant shot after silence (charge must rebuild)');
});

test('L · governor: HIGH full, BALANCED keeps camera/model, LITE ~45%, STATIC none, phones ≤ 45%', function () {
  const mx = (t, k) => Math.max.apply(null, t.map((r) => Math.abs(r[k])));
  const hi = firstShot().trace, bal = firstShot({ tier: 'balanced' }).trace, lite = firstShot({ tier: 'lite' }).trace, phone = firstShot({ compact: true }).trace;
  assert.ok(Math.abs(mx(bal, 'driveDolly') - mx(hi, 'driveDolly')) < 1e-9 && Math.abs(mx(bal, 'driveMass') - mx(hi, 'driveMass')) < 1e-9, 'BALANCED keeps the physical response');
  assert.ok(mx(bal, 'typeVelocity') <= 0.6 * mx(hi, 'typeVelocity') + 1e-9, 'BALANCED trims type/light');
  for (const k of ['driveDolly', 'driveMass', 'typeVelocity', 'wavefront']) {
    assert.ok(mx(lite, k) <= 0.5 * mx(hi, k) + 1e-9 && mx(lite, k) >= 0.4 * mx(hi, k) - 1e-9, 'LITE ' + k);
    assert.ok(mx(phone, k) <= 0.45 * mx(hi, k) + 1e-9, 'phone ' + k);
  }
  const s = director(); let m = 0;
  for (let i = 0; i < 900; i++) { const st = s.update(inp({ scrollY: at('relic'), s: beat(i), forces: LOUD, tier: 'static', velocity: 0.8 }), DT); V5.concat(SIGNED).forEach((k) => { m = Math.max(m, Math.abs(st[k])); }); }
  assert.equal(m, 0, 'STATIC: absolutely no V5 motion');
});

test('reduced motion and Save-Data compose a still frame', function () {
  const d = director();
  run(d, 600, (i) => ({ scrollY: at('relic'), s: beat(i), forces: LOUD }));
  const st = d.compose(IDS.indexOf('relic'));
  for (const k of V5.concat(SIGNED)) assert.equal(st[k], 0, k);
  assert.ok(MOD.includes('var still = !!(hub.reduced || hub.saveData);') && MOD.includes('if (still || !hub.onFrame) { composeStill(); return; }'));
  assert.ok(MOD.includes('if (this.massDriver) this.massDriver.compose(st);'));
});

test('M · observability on the existing debug surface, no console output', function () {
  const rep = between(MOD, 'perf.massDriver = {', '};');
  for (const k of ['charge', 'precompress', 'drive', 'driveDolly', 'driveLift', 'driveRoll', 'driveMass', 'driveSettle', 'wavefront', 'floorWave', 'lightVelocity', 'typeVelocity'])
    assert.ok(rep.includes(k + ':'), k);
  const st = director().state;
  for (const k of V5.concat(SIGNED)) assert.ok(k in st, 'hub.eventHorizon.' + k);
  assert.ok(!/console\./.test(code(LAYER)));
});

test('source and generated output are synchronized; inlined once, after the Black Sun', function () {
  assert.equal(count(OUT, 'DMF MASS DRIVER — pure acceleration layer'), 1);
  const order = ['black-sun.js', 'mass-driver.js', 'event-horizon.js', 'relic.js'].map((m) => BUILD.indexOf("inlineModule('" + m + "')"));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'black sun → mass driver → director → relic');
  assert.ok(DEV.indexOf('mass-driver.js') > DEV.indexOf('black-sun.js') && DEV.indexOf('mass-driver.js') < DEV.indexOf('event-horizon.js'));
  for (const needle of ['var(--eh-tv,0) * .006', 'var(--eh-lv,0) * .35', "r -= (e5 ? 0.28 * (e5.driveDolly || 0) : 0) * fit;"])
    assert.ok((SRC.includes(needle) || RELIC.includes(needle)) && OUT.includes(needle), needle);
});

test('frozen paths untouched; payment tests and the mobile nav still pass', function () {
  const FROZEN = ['workers', 'firestore.rules', 'firebase.json', 'firebase.academy.json', '.firebaserc', 'public/login.html',
    'public/payment-result.html', 'public/academy.html', 'public/academy-config.js', 'server.js', 'functions', 'assets'];
  let base = null;
  try { base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { base = null; }
  if (base) {
    assert.equal(execSync('git diff --name-only ' + base + ' -- ' + FROZEN.join(' '), { cwd: ROOT }).toString().trim(), '', 'frozen paths changed');
    assert.equal(execSync('git diff --name-only ' + base + ' -- "*.glb" "*.stl" "*.3mf" "*.mp4" "*.png" "*.jpg" "*.webp"', { cwd: ROOT }).toString().trim(), '', 'binary assets changed');
  }
  assert.ok(!/mercadopago|firebase|firestore|signer|checkout|payment|enroll|price|localStorage|sessionStorage/i.test(LAYER));
  const dir = path.join(ROOT, 'workers', 'dmf-payments', 'test');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.test.cjs'))) execSync('node ' + JSON.stringify(path.join(dir, f)), { cwd: ROOT, stdio: 'ignore' });
  for (const html of [SRC, OUT]) assert.ok(html.includes('.nav.nav-open{backdrop-filter:none;-webkit-backdrop-filter:none}'));
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/mass-driver.test.cjs'));
  const wf = read('.github/workflows/validate-3d.yml');
  assert.ok(wf.includes('node scripts/overdrive/test/mass-driver.test.cjs'));
  assert.ok(wf.includes("grep -q 'DMF MASS DRIVER' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
