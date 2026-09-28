'use strict';

// HYPERDRIVE V2 (V7) — deterministic coverage of the choreography layer and its integration:
// bounded light outputs, camera modes and continuity, the DROP timeline, SINGULARITY rarity, reduced motion /
// Save-Data, quality degradation order, effect flags, one clock, and payments untouched.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const H = require(path.join(ROOT, 'scripts/overdrive/hyperdrive-v2.js'));
const EHC = require(path.join(ROOT, 'scripts/overdrive/event-horizon.js'));
const KN = require(path.join(ROOT, 'scripts/overdrive/kinetic.js'));
const MOD = read('scripts/overdrive/hyperdrive-v2.js');
const EH = read('scripts/overdrive/event-horizon.js');
const RELIC = read('scripts/overdrive/relic.js');
const SRC = read('index.html');
const OUT = read('public/index.html');
const BUILD = read('scripts/build-3d.cjs');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
function count(s, needle) { return s.split(needle).length - 1; }
// Deterministic PRNG for fuzzing.
function rng(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }

const DT = 1 / 60;
function stage(over) {
  return Object.assign({ performanceTier: 'high', compact: false, calm: 0, silence: 0, section: 'relic', index: 0,
    low: 0, mid: 0, high: 0, energy: 0, kick: 0, speed: 0, velocity: 0, reveal: 1, focus: 1, transition: 0 }, over || {});
}
function world() {
  return {
    hyper: { id: 0, active: false, level: 0, _can: true, canFire() { return this._can; } },
    sing: { id: 0, active: false, hit: false, pre: 0, ignition: 0, t: 0 },
    s: { timeToDrop: -1, beatFired: false, kick: 0 }
  };
}
function step(hv, st, w, n, fps) {
  for (let i = 0; i < (n || 1); i++) hv.update(st, { s: w.s, hyper: w.hyper, sing: w.sing, fps: fps || 60 }, ['relic'], DT);
  return st;
}
// Runs a full drop: 700 ms run-up, the HYPERDRIVE hit, then `after` seconds. Returns samples.
function runDrop(hv, st, w, after) {
  const samples = [];
  for (let ttd = 0.7; ttd > 1e-6; ttd -= DT) {
    w.s.timeToDrop = ttd;
    step(hv, st, w);
    samples.push({ t: -ttd, phase: st.dropPhase, compress: st.dropCompress, edge: st.dropEdge, mode: st.camMode, dolly: st.camDolly });
  }
  w.s.timeToDrop = -1;
  w.hyper.id++; w.hyper.active = true; w.hyper.level = 1; w.hyper._can = false;
  for (let t = 0; t < after; t += DT) {
    step(hv, st, w);
    samples.push({ t: t + DT, phase: st.dropPhase, punch: st.dropPunch, ring: st.dropRing, secondary: st.dropSecondary, recovery: st.dropRecovery, mode: st.camMode, dolly: st.camDolly, key: st.hvKey });
    if (t > 2.9) w.hyper.active = false;
  }
  return samples;
}

test('light director: every output stays inside its bounds under 20 000 random frames', () => {
  const r = rng(7);
  const L = new H.DMFLightDirector();
  const drop = { compress: 0, edge: 0, punch: 0, ring: 0, secondary: 0 };
  const sing = { lightCompress: 0, flash: 0, release: 0, dominance: 0, stretch: 0 };
  for (let i = 0; i < 20000; i++) {
    const st = stage({ section: ['hero', 'relic', 'releases', 'academy', 'offer', 'nope'][i % 6], calm: r(), silence: r() * 0.5,
      low: r() * 1.5, mid: r() * 1.5, high: r() * 1.5, energy: r() * 1.5, kick: r() * 1.5 });
    for (const k of Object.keys(drop)) drop[k] = r() > 0.8 ? r() * 1.2 : 0;
    for (const k of Object.keys(sing)) sing[k] = r() > 0.9 ? r() * 1.2 : 0;
    const o = L.update(st, drop, sing, r() * 1.2, r() > 0.1 ? 1 : r(), r() * 0.12);
    for (const k of H.LIGHT_KEYS) {
      const b = H.LIGHT_BOUNDS[k];
      assert.ok(Number.isFinite(o[k]) && o[k] >= b[0] - 1e-9 && o[k] <= b[1] + 1e-9, k + ' = ' + o[k]);
    }
  }
  assert.deepEqual(H.LIGHT_BOUNDS.key, [0.55, 1.4]);
  assert.ok(H.LIGHT_BOUNDS.emissive[1] <= 0.05, 'never neon');
});

test('light director: authority 0 settles to the neutral pose (key 1, everything else 0)', () => {
  const L = new H.DMFLightDirector();
  const st = stage({ low: 1, mid: 1, high: 1, energy: 1, kick: 1 });
  const z = { compress: 0, edge: 0, punch: 1, ring: 1, secondary: 1, lightCompress: 0, flash: 1, release: 1, dominance: 1, stretch: 1 };
  for (let i = 0; i < 600; i++) L.update(st, z, z, 1, 0, DT);
  assert.ok(Math.abs(L.out.key - 1) < 1e-3);
  for (const k of ['rim', 'accent', 'sweep', 'bg', 'fog', 'emissive', 'side']) assert.ok(Math.abs(L.out[k]) < 1e-3, k);
});

test('drop timeline: T−700 compress, T−100 edge, T impact, T+200 secondary, T+600 recovery, T+1.2 s exactly zero', () => {
  const hv = new H.DMFHyperdriveV2();
  const st = stage({ low: 0.5, mid: 0.4, energy: 0.6 });
  const w = world();
  step(hv, st, w, 30);
  const s = runDrop(hv, st, w, 1.5);
  const at = (t) => s.reduce((b, x) => (Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b));
  assert.equal(at(-0.65).phase, 'compress');
  assert.ok(at(-0.65).compress > 0 && at(-0.65).compress < 0.2, 'compression starts gently');
  assert.ok(at(-0.2).compress > 0.7);
  assert.equal(at(-0.05).phase, 'edge');
  assert.ok(at(-0.02).edge > 0.5, 'micro blackout just before the beat');
  assert.equal(at(0.05).phase, 'impact');
  assert.ok(at(0.03).punch > 0.9, 'the hit lands at T');
  assert.equal(at(0.3).phase, 'secondary');
  assert.ok(at(0.26).secondary > 0.9, 'secondary highlight ≈ T+200 ms');
  assert.equal(at(0.8).phase, 'recovery');
  assert.ok(at(0.7).recovery > 0.8);
  const end = at(1.25);
  assert.equal(end.phase, 'idle');
  for (const k of ['punch', 'ring', 'secondary', 'recovery']) assert.equal(end[k], 0, k);
  assert.equal(hv.drop.shots, 1);
});

test('drop timeline: no run-up when the HYPERDRIVE cannot fire; nothing at all in the offer or in silence', () => {
  const D = new H.DMFDropTimeline();
  const hyper = { id: 0, active: false, canFire() { return false; } };
  D.update({ timeToDrop: 0.3 }, hyper, DT, 1);
  assert.equal(D.compress, 0);
  assert.equal(D.phase, 'idle');
  const hv = new H.DMFHyperdriveV2();
  for (const over of [{ calm: 1, section: 'offer' }, { silence: 1 }]) {
    const st = stage(over);
    const w = world();
    const s = runDrop(hv, st, w, 1);
    assert.ok(s.every((x) => (x.punch || 0) === 0 && (x.compress || 0) === 0), JSON.stringify(over));
    assert.equal(hv.drop.firedNow, false);
  }
});

test('camera director: a drop reads ICON/ORBIT → PUSH → IMPACT → RECOVERY → rest; forward push, then settle', () => {
  const hv = new H.DMFHyperdriveV2();
  const st = stage({ mid: 0.6, energy: 0.5 });
  const w = world();
  step(hv, st, w, 120);
  assert.equal(st.camMode, 'ORBIT');
  const s = runDrop(hv, st, w, 3.5);
  const modes = [];
  for (const x of s) if (modes[modes.length - 1] !== x.mode) modes.push(x.mode);
  assert.deepEqual(modes.slice(0, 4), ['ORBIT', 'PUSH', 'IMPACT', 'RECOVERY']);
  const peak = Math.max(...s.map((x) => x.dolly));
  assert.ok(peak > 0.1 && peak <= 0.26, 'forward punch ' + peak);
  assert.ok(Math.abs(s[s.length - 1].dolly) < 0.03, 'settled');
});

test('camera director: continuous — acceleration-limited springs, no jumps at mode changes, bounded per device', () => {
  for (const compact of [false, true]) {
    const C = new H.DMFCameraDirector();
    const r = rng(compact ? 3 : 11);
    const B = compact ? H.CAM_BOUNDS.compact : H.CAM_BOUNDS.wide;
    let prev = { dolly: 0, orbit: 0, lift: 0, fov: 0 }, prevV = { dolly: 0, orbit: 0, lift: 0, fov: 0 };
    for (let i = 0; i < 6000; i++) {
      const st = stage({ mid: r(), energy: r(), speed: r() * 0.8, velocity: r() - 0.5, reveal: r() > 0.95 ? r() : 1 });
      const drop = { punch: r() > 0.97 ? 1 : 0, phase: 'idle', recovery: r() > 0.95 ? 1 : 0, compress: r() > 0.9 ? r() : 0 };
      const sing = { pull: r() > 0.99 ? 1 : 0, collapse: 0, recovery: 0, release: 0 };
      const o = C.update(st, drop, sing, 1, compact, DT);
      for (const k of ['dolly', 'orbit', 'lift', 'fov']) {
        assert.ok(o[k] >= B[k][0] - 1e-9 && o[k] <= B[k][1] + 1e-9, k + ' bound');
        const v = (o[k] - prev[k]) / DT;
        assert.ok(Math.abs(v - prevV[k]) <= H.CAM_MAX_A[k] * DT * 1.01 + 1e-9, k + ' acceleration limit at frame ' + i);
        prevV[k] = v;
      }
      prev = Object.assign({}, o);
    }
  }
});

test('camera director: ambient modes respect a dwell (no flicker); events switch at once; authority 0 = no offset', () => {
  const C = new H.DMFCameraDirector();
  const z = { punch: 0, recovery: 0, compress: 0, phase: 'idle' };
  const zs = { pull: 0, collapse: 0, recovery: 0, release: 0 };
  let switches = 0, last = C.mode;
  for (let i = 0; i < 240; i++) {
    C.update(stage({ mid: i % 2 ? 0.9 : 0, energy: 0.9 }), z, zs, 1, false, DT);
    if (C.mode !== last) { switches++; last = C.mode; }
  }
  assert.ok(switches <= 240 * DT / 0.45 + 1, 'dwell ' + switches);
  C.update(stage(), { punch: 1, recovery: 0, compress: 0, phase: 'impact' }, zs, 1, false, DT);
  assert.equal(C.mode, 'IMPACT', 'an event mode is immediate');
  const K = new H.DMFCameraDirector();
  for (let i = 0; i < 300; i++) K.update(stage({ mid: 1, energy: 1, speed: 1 }), { punch: 1, recovery: 0, compress: 1, phase: 'impact' }, { pull: 1, collapse: 1, recovery: 0, release: 0 }, 0, false, DT);
  for (const k of ['dolly', 'orbit', 'lift', 'fov']) assert.ok(Math.abs(K.out[k]) < 1e-9, k);
  assert.deepEqual(H.MODES, ['ICON', 'ORBIT', 'PUSH', 'IMPACT', 'FLYBY', 'REVEAL', 'SINGULARITY', 'RECOVERY']);
});

test('singularity: rare — the kinetic event cannot restart within 12 s, and the treatment flashes once per ≥ 12 s', () => {
  // Kinetic layer (unchanged): armed forced drops every 2 s never start two events < 12 s apart.
  const sg = new KN.DMFSingularity();
  const starts = [];
  let ttd = 0.72, t = 0;
  for (let i = 0; i < 60 * 60; i++) {
    t += DT;
    if (i % 120 === 0) { sg.arm(true); ttd = 0.72; }
    ttd -= DT;
    const sig = { timeToDrop: ttd > 0 ? ttd : -1, dropHit: ttd <= 0 && ttd > -DT, dropEnergy: ttd <= 0 ? 1 : 0 };
    sg.update(sig, DT);
    if (sg.hit) starts.push(t);
  }
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= 12 - 1e-6, 'kinetic spacing');
  // Treatment layer: even if upstream produced hits closer together, only one flash per 12 s.
  const T = new H.DMFSingularityTreatment();
  const sing = { id: 0, active: false, hit: false, pre: 0, ignition: 0, t: 0 };
  let flashes = 0, wasFlash = false, longest = 0, runStart = -1;
  for (let i = 0; i < 60 * 30; i++) {
    // Like kinetic.js: the event is numbered when its precompression starts, the hit comes ~0.7 s later.
    if (i % (60 * 5) === 18) { sing.id++; sing.active = true; }
    const hitNow = i % (60 * 5) === 60;
    sing.hit = hitNow;
    T.update(sing, DT, 1);
    const on = T.flash > 0;
    if (on && !wasFlash) flashes++;
    wasFlash = on;
    const any = T.pull + T.stretch + T.dominance + T.release + T.recovery > 0;
    if (any && runStart < 0) runStart = i;
    if (!any && runStart >= 0) { longest = Math.max(longest, (i - runStart) * DT); runStart = -1; }
  }
  assert.equal(flashes, 2, 'hits every 5 s for 30 s → treatments only at 1 s and 16 s (≥ 12 s apart)');
  assert.ok(longest >= 1.5 && longest <= H.SING.end + 0.05, 'treatment lasts 1.5–3 s: ' + longest.toFixed(2));
});

test('regression: a forced drop requested during the clock\'s own drop section still lands its hit (no run-up without an impact)', () => {
  const O = require(path.join(ROOT, 'scripts/overdrive/engine.js'));
  const e = new O.DMFSignalEngine({ startBar: 8 });
  let t = 0;
  while (e.out.section !== 'drop' || t < 32) { e.update(DT); t += DT; }
  assert.equal(e.out.section, 'drop');
  e.setForceDrop(true, 0.72);
  let hits = 0, sawLead = false;
  for (let i = 0; i < 60 * 6; i++) { e.update(DT); if (e.out.timeToDrop > 0) sawLead = true; if (e.out.dropHit) hits++; }
  assert.ok(sawLead, 'the predictor announced the forced drop');
  assert.equal(hits, 1, 'and exactly one hit landed');
});

test('end to end with the real engine and kinetic SINGULARITY: a forced drop yields run-up, one flash, one impact', () => {
  const O = require(path.join(ROOT, 'scripts/overdrive/engine.js'));
  const e = new O.DMFSignalEngine({ startBar: 8 }), sg = new KN.DMFSingularity(), hd = new O.DMFHyperdrive();
  const hv = new H.DMFHyperdriveV2();
  const st = stage({ low: 0.6, mid: 0.5, high: 0.4, energy: 0.7 });
  let t = 0;
  const frame = () => { e.update(DT); hd.update(e.out, DT); sg.update(e.out, DT); hv.update(st, { s: e.out, hyper: hd, sing: sg, fps: 60 }, ['relic'], DT); t += DT; };
  while (t < 5) frame();
  sg.arm(sg.canStart());
  e.setForceDrop(true, 0.72);
  const seen = { pre: false, compress: false, flash: 0, impact: 0, pull: 0 };
  let wasFlash = false;
  for (let i = 0; i < 60 * 6; i++) {
    frame();
    if (st.singPhase === 'precompression') seen.pre = true;
    if (st.dropPhase === 'compress' || st.dropPhase === 'edge') seen.compress = true;
    if (st.singFlash > 0 && !wasFlash) seen.flash++;
    wasFlash = st.singFlash > 0;
    if (st.dropPhase === 'impact') seen.impact = 1;
    seen.pull = Math.max(seen.pull, st.singPull);
  }
  assert.ok(seen.pre && seen.compress, 'precompression and drop run-up');
  assert.equal(seen.flash, 1, 'exactly one flash');
  assert.equal(seen.impact, 1, 'the drop impact landed');
  assert.ok(seen.pull > 0.9, 'the camera was pulled in');
  assert.equal(hv.sing.shots, 1);
});

test('singularity: precompression collapses reflections to the centre and compresses light before the impact', () => {
  const hv = new H.DMFHyperdriveV2();
  const st = stage({ low: 0.6, high: 0.6, energy: 0.6 });
  const w = world();
  step(hv, st, w, 90);
  const before = { warmW: st.rfWarmWidth, key: st.hvKey };
  w.sing.active = true; w.sing.t = -0.3; w.sing.pre = 1; w.sing.ignition = 0.4; w.sing.id = 1;   // numbered at precompression
  step(hv, st, w, 20);
  assert.equal(st.singPhase, 'precompression');
  assert.equal(st.camMode, 'SINGULARITY');
  assert.ok(st.rfCollapse > 0.8 && st.rfWarmWidth < before.warmW * 0.5, 'reflections compress');
  assert.ok(Math.abs(st.rfWarmPos - 0.5) < 0.1 && Math.abs(st.rfColdPos - 0.5) < 0.1, 'toward the centre');
  assert.ok(st.hvKey < before.key, 'light compresses');
  w.sing.t = 0; w.sing.pre = 0; w.sing.hit = true;                                               // same id at impact
  step(hv, st, w, 2);
  w.sing.hit = false;
  assert.ok(st.singFlash > 0 && st.singPull > 0, 'one flash, the camera is pulled in');
  let maxStretch = 0;
  for (let i = 0; i < 60; i++) { step(hv, st, w); maxStretch = Math.max(maxStretch, st.singStretch); }
  assert.ok(maxStretch > 0.9, 'the background stretches backward');
  w.sing.active = false;
  step(hv, st, w, 60 * 3);
  assert.equal(st.singPhase, 'idle');
  assert.equal(st.singFlash + st.singStretch + st.singDominance + st.singPull, 0, 'back at rest');
});

test('reflection field: bounded; LOW warm band, HIGH cold sweep, kick wave climbs and fades; stronger in HYPERDRIVE', () => {
  const R = new H.DMFReflectionField();
  const z = { compress: 0, punch: 0, ring: 0, secondary: 0 }, zs = { collapse: 0, release: 0 };
  const r = rng(5);
  for (let i = 0; i < 10000; i++) {
    const o = R.update(stage({ low: r() * 1.3, high: r() * 1.3, calm: r() }), { beatFired: r() > 0.9, kick: r() }, { compress: r(), punch: r(), ring: r(), secondary: r() }, { collapse: r(), release: r() }, r() * 1.2, r() > 0.2 ? 1 : 0, r() * 0.1);
    for (const k of ['warmAmp', 'coldAmp', 'kickAmp']) assert.ok(o[k] >= 0 && o[k] <= 0.6, k);
    for (const k of ['warmPos', 'coldPos']) assert.ok(o[k] >= -0.2 && o[k] <= 1.2, k);
    for (const k of ['warmWidth', 'coldWidth']) assert.ok(o[k] >= 0.02 && o[k] <= 0.4, k);
  }
  const a = new H.DMFReflectionField(), b = new H.DMFReflectionField();
  let ampA = 0, ampB = 0;
  for (let i = 0; i < 120; i++) { ampA = a.update(stage({ low: 0.8, high: 0.8 }), null, z, zs, 0, 1, DT).warmAmp; ampB = b.update(stage({ low: 0.8, high: 0.8 }), null, z, zs, 1, 1, DT).warmAmp; }
  assert.ok(ampB > ampA * 1.4, 'HYPERDRIVE makes the reflections stronger');
  const k = new H.DMFReflectionField();
  k.update(stage(), { beatFired: true, kick: 1 }, z, zs, 0, 1, DT);
  const fronts = [];
  for (let i = 0; i < 30; i++) fronts.push(Object.assign({}, k.update(stage(), { beatFired: false }, z, zs, 0, 1, DT)));
  assert.ok(fronts[5].kickFront < fronts[15].kickFront, 'the kick wave travels up the object');
  assert.ok(fronts[29].kickAmp === 0, 'and is gone after ≈ 0.4 s');
});

test('quality degradation: effects shed in priority order (overlays → particles → reflections → lights → camera), never the Receiver', () => {
  const G = new H.DMFEffectGovernor();
  const flags = H.readFlags();
  const trail = [];
  for (let fps = 60; fps >= 20; fps -= 1) {
    for (let i = 0; i < 240; i++) G.update('high', false, flags, fps, DT);
    trail.push(Object.assign({ fps }, G.out));
  }
  const firstDrop = (ch) => (trail.find((x) => x[ch] < 0.999) || { fps: -1 }).fps;
  const order = ['overlays', 'particles', 'reflections', 'lights', 'camera'].map(firstDrop);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] < order[i - 1], 'order ' + order.join(' > '));
  assert.ok(trail.every((x) => x.receiver === 1), 'the Receiver keeps its interaction');
  const worst = trail[trail.length - 1];
  assert.ok(worst.lights >= 0.5 - 1e-9 && worst.camera >= 0.5 - 1e-9, 'essentials keep a floor');
  assert.equal(worst.overlays, 0);
  // Tiers and devices cap first; STATIC is nothing.
  const lite = new H.DMFEffectGovernor().update('lite', true, flags, 0, DT);
  assert.ok(lite.particles <= H.COMPACT_CAP.particles && lite.camera <= H.COMPACT_CAP.camera);
  const st = new H.DMFEffectGovernor().update('static', false, flags, 60, DT);
  for (const ch of H.CHANNELS) assert.equal(st[ch], 0, ch);
});

test('effect flags: defaults on; each false zeroes exactly its channel; flags flow from the build to the page', () => {
  assert.deepEqual(H.readFlags(), { audioReactive: true, reflections: true, particles: true, cinematicCamera: true, singularityFX: true });
  assert.deepEqual(H.readFlags({ reflections: false, particles: 'no' }).reflections, false);
  assert.equal(H.readFlags({ particles: 'no' }).particles, true, 'only an explicit false disables');
  const run = (flags) => {
    const hv = new H.DMFHyperdriveV2();
    hv.setFlags(flags);
    const st = stage({ low: 0.8, mid: 0.8, high: 0.8, energy: 0.8, kick: 0.8 });
    const w = world();
    step(hv, st, w, 60);
    runDrop(hv, st, w, 0.1);
    w.sing.active = true; w.sing.t = -0.2; w.sing.pre = 1;
    step(hv, st, w, 10);
    return st;
  };
  const off = run({ reflections: false, particles: false, cinematicCamera: false, singularityFX: false });
  assert.equal(off.rfWarmAmp + off.rfColdAmp + off.rfKickAmp + off.rfCollapse, 0, 'reflections off');
  assert.equal(off.hvSparkle, 0, 'particles off');
  assert.equal(Math.abs(off.camDolly) + Math.abs(off.camOrbit) + Math.abs(off.camFov) + Math.abs(off.camLift), 0, 'camera off');
  assert.equal(off.singCollapse + off.singPull + off.singStretch + off.singFlash, 0, 'singularity treatment off');
  const on = run({});
  assert.ok(on.rfWarmAmp > 0 && on.hvSparkle > 0 && on.singCollapse > 0 && Math.abs(on.camDolly) > 0);
  assert.ok(EH.includes('eh.hyperdrive.setFlags(root.__DMF_COMMERCE__ && root.__DMF_COMMERCE__.effects)'), 'page reads academy-env flags');
  const inject = read('scripts/inject-academy-env.cjs');
  for (const f of ['REFLECTIONS', 'PARTICLES', 'CINEMATIC_CAMERA', 'SINGULARITY_FX']) {
    assert.ok(inject.includes("process.env.DMF_EFFECT_" + f + " !== 'false'"), f);
    assert.ok(read('.github/workflows/deploy.yml').includes('DMF_EFFECT_' + f + ': ${{ vars.DMF_EFFECT_' + f + ' }}'), f + ' deploy');
  }
});

test('reduced motion and Save-Data: no clock, one composed frame with every V7 term at rest', () => {
  const eh = new EHC.DMFEventHorizon();
  eh.setMarkers([0, 800], ['hero', 'relic'], [1, 0.8], [0, 0], 2000);
  const st = eh.compose(1);
  assert.equal(st.hvKey, 1);
  for (const k of ['hvRim', 'hvAccent', 'hvSweep', 'hvBg', 'hvFog', 'hvEmissive', 'hvSide', 'hvSparkle', 'camDolly', 'camOrbit', 'camLift', 'camFov',
    'dropCompress', 'dropEdge', 'dropPunch', 'dropRing', 'dropSecondary', 'singCollapse', 'singPull', 'singFlash', 'singStretch', 'singDominance',
    'rfWarmAmp', 'rfColdAmp', 'rfKickAmp', 'rfCollapse', 'pfPhase', 'fxCamera', 'fxOverlays']) assert.equal(st[k], 0, k);
  assert.equal(st.camMode, 'ICON');
  assert.ok(EH.includes('var still = !!(hub.reduced || hub.saveData);') && EH.includes('if (still || !hub.onFrame) { composeStill(); return; }'), 'reduced motion / Save-Data never start a clock');
  assert.ok(/@media \(prefers-reduced-motion:reduce\)\{\.hv-fire\{animation:none\}\.hv-lit\{transform:none\}/.test(SRC), 'CSS microinteractions stop under reduced motion');
  assert.ok(SRC.includes('.eh-still .hv-glow,.eh-still .hv-ring,.eh-still .hv-dim,.eh-still .hv-flash'), 'field layers hidden when still');
});

test('the director steps V7 last, on its own state; the STATIC tier composes it', () => {
  const eh = new EHC.DMFEventHorizon();
  assert.ok(eh.hyperdrive instanceof H.DMFHyperdriveV2);
  eh.setMarkers([0, 800, 1600], ['hero', 'relic', 'offer'], [1, 0.8, 0.3], [0, 0, 1], 3000);
  const w = world();
  const inp = { scrollY: 900, vh: 800, velocity: 0, s: Object.assign({ energy: 0.7, low: 0.6, mid: 0.6, high: 0.5, beatFired: false }, w.s), forces: null,
    pointerX: 0, pointerY: 0, tier: 'high', compact: false, wakeT: -1, pre: 0, sing: w.sing, hyper: w.hyper, fps: 60 };
  for (let i = 0; i < 90; i++) eh.update(inp, DT);
  assert.ok(eh.state.rfWarmAmp > 0 && eh.state.hvKey !== 1, 'V7 terms live in hub.eventHorizon');
  const order = ['this.lightspeed.update(st, inp, this.ids, dt);', 'this.hyperdrive.update(st, inp, this.ids, dt);'].map((x) => EH.indexOf(x));
  assert.ok(order[0] > 0 && order[1] > order[0], 'after Lightspeed');
});

test('one clock: V7 owns no rAF, no timers, no audio graph; the page still has exactly the bus loop', () => {
  assert.equal(count(MOD, 'requestAnimationFrame'), 0);
  assert.ok(!/setTimeout\s*\(|setInterval\s*\(/.test(MOD + EH), 'no timers in the layer or the director');
  assert.ok(!/AudioContext|createAnalyser|createMediaElementSource|document\.|window\.(?!__)/.test(MOD.replace(/\/\/.*$/gm, '')), 'pure: no audio graph, no DOM');
  const bus = read('scripts/overdrive/signal-bus.js');
  assert.equal(count(OUT, 'requestAnimationFrame('), count(SRC, 'requestAnimationFrame(') + count(bus, 'requestAnimationFrame(') + count(read('scripts/overdrive/relic.js') + read('scripts/overdrive/mixer-stage.js'), 'requestAnimationFrame('), 'no new loop in the page');
  assert.equal(count(RELIC + read('scripts/overdrive/mixer-stage.js'), 'requestAnimationFrame'), 0);
});

test('build: inlined once, after Lightspeed and before the director; dev server watches it', () => {
  const i = (m) => BUILD.indexOf("inlineModule('" + m + "')");
  assert.ok(i('lightspeed.js') < i('hyperdrive-v2.js') && i('hyperdrive-v2.js') < i('event-horizon.js'));
  assert.equal(count(OUT, 'DMF HYPERDRIVE V2 — cinematic choreography layer'), 1);
  assert.ok(read('scripts/dev-hyperdrive.cjs').includes("'scripts/overdrive/hyperdrive-v2.js'"));
});

test('Receiver integration: bounded and additive — existing motion kept, V7 terms layered on top', () => {
  assert.ok(RELIC.includes('keyLight.intensity *= eh.hvKey * (1 + 0.45 * (eh.singFlash || 0));'), 'key light × [0.55, 1.4], lifted by the one flash');
  assert.ok(RELIC.includes('renderer.toneMappingExposure += clamp(0.06 * (eh.hvFog || 0) - 0.12 * (eh.dropEdge || 0) + 0.1 * (eh.dropPunch || 0), -0.16, 0.16) +'), 'exposure ±0.16');
  assert.ok(RELIC.includes('clamp(0.3 * (eh.singFlash || 0), 0, 0.3);'), 'one bounded SINGULARITY flash');
  assert.ok(RELIC.includes('modelRef.scale.multiplyScalar(1 + 0.02 * ehv.singDominance);'), 'dominance ≤ +2%');
  assert.ok(RELIC.includes('if (e5 && auto) { r -= (e5.camDolly || 0) * fit; az += e5.camOrbit || 0; }'), 'camera modes never fight a user drag');
  assert.ok(RELIC.includes("coneL.c = coneR.c = 2 * Math.sqrt(coneL.k) * eh.pfZeta;"), 'speaker damping from energy');
  assert.ok(RELIC.includes('if (headDelayT < 0) headK.impulse(headDelayAmp);'), 'the head trails the speaker impulse');
  assert.ok(RELIC.includes("'if(uRfWarm.z + uRfCold.z + uRfKick.y > 0.001){',"), 'reflection field costs nothing at rest');
  // Pinned V2–V6 behaviour is untouched.
  assert.ok(RELIC.includes('headK.step(-0.02 * lsHead + nodBase - 0.03 * pressure + ehPitch + 0.03 * mdHead, dt);'));
  assert.ok(RELIC.includes('var coneL = new KB(1000, 0.38, { maxA: 1600, maxJ: 200000, min: -0.45, max: 1.2 });'));
});

test('page: offer stays calm; pricing tiers get no V7 microinteraction; analytics carry no identity', () => {
  for (const cls of ['.hv-glow', '.hv-ring', '.hv-dim']) {
    const rule = SRC.slice(SRC.indexOf(cls + '{'), SRC.indexOf('}', SRC.indexOf(cls + '{')));
    assert.ok(rule.includes('(1 - var(--eh-calm,0))'), cls + ' steps back in the offer');
  }
  const cards = EH.slice(EH.indexOf("var CARDS = '"), EH.indexOf(';', EH.indexOf("var CARDS = '")));
  assert.ok(!/tier/.test(cards), 'no pricing card');
  const A = require(path.join(ROOT, 'public/commerce/analytics.js'));
  for (const e of ['hyperdrive_triggered', 'singularity_triggered', 'relic_interaction', 'drop_triggered']) assert.ok(A.EVENTS.includes(e), e);
  assert.ok(EH.includes("root.dmfTrack(name, { placement: st.section, tier: st.performanceTier }, { once: true })"), 'section + tier only, once per page');
  assert.ok(RELIC.includes("window.dmfTrack('relic_interaction', { placement: 'relic' }, { once: true });"));
});

test('payments and commerce untouched (behaviour): Workers, rules, Academy pages, router payment config', () => {
  let base = null;
  try { base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { base = null; }
  if (base) {
    const frozen = ['workers', 'firestore.rules', 'firebase.json', '.firebaserc', 'public/login.html', 'public/payment-result.html', 'public/academy.html',
      'public/academy-config.js', 'server.js', 'functions', 'assets'];
    assert.equal(execSync('git diff --name-only ' + base + ' -- ' + frozen.join(' '), { cwd: ROOT }).toString().trim(), '', 'frozen paths changed');
  }
  const R = require(path.join(ROOT, 'public/commerce/payment-router.js'));
  const c = R.readConfig({});
  assert.deepEqual(Object.assign({}, c.payments, { mercadopagoUrl: '' }), { provider: 'mercadopago', fallbackProvider: 'mercadopago', klapEnabled: false, klapFlexSdkUrl: '', klapUrl: '', mercadopagoUrl: '' });
  assert.ok(!/payment|checkout|klap|mercadopago|firebase|firestore|fetch\(/i.test(MOD), 'the layer knows nothing about commerce');
});

test('registered in npm run test:hyperdrive and in CI', () => {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/hyperdrive-v2.test.cjs'));
  const wf = read('.github/workflows/validate-3d.yml');
  assert.ok(wf.includes('node scripts/overdrive/test/hyperdrive-v2.test.cjs') && wf.includes("grep -q 'DMF HYPERDRIVE V2' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
