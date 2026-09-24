'use strict';

// Deterministic simulations of the KINETIC SINGULARITY primitives (no DOM, no clock).
const path = require('path');
const { strict: assert } = require('assert');
const K = require(path.join(__dirname, '..', 'kinetic.js'));
const E = require(path.join(__dirname, '..', 'engine.js'));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}

function sig(over) {
  return Object.assign({ impulse: 0, low: 0, mid: 0, high: 0, energy: 0.5 }, over);
}
const BAND_OF = { kick: 0, low: 1, mid: 2, high: 3 };

test('force matrix: every channel is driven by exactly one band', function () {
  for (const ch of Object.keys(K.FORCE_MATRIX)) {
    const row = K.FORCE_MATRIX[ch];
    assert.equal(row.filter((v) => v !== 0).length, 1, ch + ' mixes bands');
  }
});

test('force matrix: band separation (kick, low, mid, high only drive their own channels)', function () {
  const inputs = {
    kick: sig({ impulse: 1 }), low: sig({ low: 0.8 }), mid: sig({ mid: 0.8 }), high: sig({ high: 0.8 })
  };
  for (const band of Object.keys(inputs)) {
    const m = new K.DMFForceMatrix();
    for (let i = 0; i < 90; i++) m.update(inputs[band], 1 / 60);
    for (const ch of Object.keys(K.FORCE_MATRIX)) {
      const own = K.FORCE_MATRIX[ch][BAND_OF[band]] !== 0;
      if (own) assert.ok(m.out[ch] > 0.5, band + ' should drive ' + ch + ' (' + m.out[ch] + ')');
      else assert.equal(m.out[ch], 0, band + ' leaked into ' + ch);
    }
  }
});

test('sustained bass: torso, cabinets, floor and depth carry it; cones, head and camera stay still', function () {
  const m = new K.DMFForceMatrix();
  for (let i = 0; i < 180; i++) m.update(sig({ low: 0.8, energy: 0.8 }), 1 / 60);
  for (const ch of ['torso', 'cabinet', 'floor', 'depth']) assert.ok(Math.abs(m.out[ch] - 0.8) < 0.01, ch);
  for (const ch of ['cone', 'head', 'camera', 'pedestal']) assert.equal(m.out[ch], 0, ch);
  assert.ok(m.out.amp > 0.8 && m.out.travel > 0.6, 'energy scales amplitude and camera travel');
});

function simulate(body, seconds, dt, drive) {
  const trace = [];
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    const target = drive ? drive(i * dt, body) : 0;
    body.step(target, dt);
    trace.push({ t: (i + 1) * dt, x: body.x, v: body.v, a: body.a, j: body.jerk });
  }
  return trace;
}

test('kick impulse: acceleration → impact → overshoot → counter-motion → settle (no bobblehead)', function () {
  const head = new K.DMFKineticBody(380, 0.67, { maxA: 160, maxJ: 9000, min: -0.06, max: 0.22 });
  head.impulse(4);
  const tr = simulate(head, 2, 1 / 60);
  assert.ok(Math.abs(tr[0].a) < 9000 / 60 + 1e-6, 'acceleration builds under the jerk limit');
  let peak = 0, peakT = 0, trough = 0;
  for (const p of tr) { if (p.x > peak) { peak = p.x; peakT = p.t; } if (p.x < trough) trough = p.x; }
  assert.ok(peak > 0.05 && peak <= 0.22, 'impact peak inside the head limit: ' + peak);
  assert.ok(peakT > 0.02 && peakT < 0.15, 'impact lands within ~150 ms: ' + peakT);
  assert.ok(trough < -0.002, 'counter-motion after the overshoot: ' + trough);
  assert.ok(trough > -0.06, 'counter-motion stays small');
  const last = tr[tr.length - 1];
  assert.ok(Math.abs(last.x) < 1e-3 && Math.abs(last.v) < 1e-2, 'settles to rest');
});

test('acceleration and jerk are clamped, position limits are hard', function () {
  const b = new K.DMFKineticBody(1000, 0.5, { maxA: 50, maxJ: 2000, min: -0.1, max: 0.1 });
  let maxA = 0, maxJ = 0, maxX = 0, minX = 0;
  for (let i = 0; i < 400; i++) {
    if (i % 25 === 0) b.impulse(i % 50 ? -30 : 30);
    b.step(0, 1 / 60);
    maxA = Math.max(maxA, Math.abs(b.a));
    maxJ = Math.max(maxJ, Math.abs(b.jerk));
    maxX = Math.max(maxX, b.x);
    minX = Math.min(minX, b.x);
  }
  assert.ok(maxA <= 50 + 1e-9, 'maxA ' + maxA);
  assert.ok(maxJ <= 2000 + 1e-6, 'maxJ ' + maxJ);
  assert.ok(maxX <= 0.1 && minX >= -0.1, 'position limits');
});

test('springs converge and are frame-rate independent (30 / 60 / 144 fps)', function () {
  const finals = [];
  const mids = [];
  for (const fps of [30, 60, 144]) {
    const b = new K.DMFKineticBody(60, 0.8, { maxA: 40, maxJ: 3000 });
    const tr = simulate(b, 3, 1 / fps, () => 1);
    finals.push(tr[tr.length - 1].x);
    mids.push(tr[Math.round(0.4 * fps) - 1].x);
  }
  for (const x of finals) assert.ok(Math.abs(x - 1) < 1e-3, 'converges: ' + x);
  assert.ok(Math.max(...mids) - Math.min(...mids) < 0.02, 'same trajectory at any frame rate: ' + mids.join(','));
});

test('rapid transient sequence stays bounded and recovers to neutral', function () {
  const cone = new K.DMFKineticBody(1000, 0.38, { maxA: 900, maxJ: 90000, min: -0.45, max: 1.2 });
  let bad = false;
  for (let i = 0; i < 240; i++) {
    if (i < 120 && i % 4 === 0) cone.impulse(46);
    cone.step(0, 1 / 60);
    if (!isFinite(cone.x) || cone.x > 1.2 || cone.x < -0.45) bad = true;
  }
  assert.ok(!bad, 'cone stays finite and inside its excursion limits');
  assert.ok(Math.abs(cone.x) < 1e-3, 'recovers: ' + cone.x);
});

test('engine: a forced drop with minLead never lands closer than the lead', function () {
  const eng = new E.DMFSignalEngine({ startBar: 8 });
  // Run until 0.3 s before a bar line, then arm with a 0.72 s lead: it must skip to the following bar.
  let s;
  do { s = eng.update(1 / 60); } while (!(s.timeToBeat < 0.3 && s.beatIndex % 4 === 3 && s.bar > 8));
  const bar = s.bar;
  eng.setForceDrop(true, 0.72);
  s = eng.update(1 / 60);
  assert.ok(s.timeToDrop > 0.72, 'lead respected: ' + s.timeToDrop);
  let hitBar = -1;
  for (let i = 0; i < 400 && hitBar < 0; i++) { s = eng.update(1 / 60); if (s.dropHit) hitBar = s.bar; }
  assert.equal(hitBar, bar + 2, 'lands on the downbeat after next');
  const plain = new E.DMFSignalEngine({ startBar: 8 });
  plain.update(0.5);
  const b0 = plain.out.bar;
  plain.setForceDrop(true);
  let hb = -1;
  for (let i = 0; i < 400 && hb < 0; i++) { const o = plain.update(1 / 60); if (o.dropHit) hb = o.bar; }
  assert.equal(hb, b0 + 1, 'without a lead it still lands on the next downbeat');
});

// Drive a singularity from a real engine; returns the per-frame log.
function runSingularity(opts) {
  const eng = new E.DMFSignalEngine({ startBar: opts.startBar || 8 });
  const sing = new K.DMFSingularity(opts.sing);
  const dt = 1 / 60;
  const log = [];
  for (let i = 0; i < Math.round(opts.seconds / dt); i++) {
    const t = i * dt;
    if (opts.onFrame) opts.onFrame(t, eng, sing);
    const s = eng.update(dt);
    sing.update(s, dt);
    log.push({ t, phase: sing.phase, hit: sing.hit, dropHit: s.dropHit, level: sing.level, pre: sing.pre,
      ignition: sing.ignition, breakthrough: sing.breakthrough, ttd: s.timeToDrop, active: sing.active });
  }
  return { log, sing, eng };
}
function phases(log) {
  const out = [];
  for (const f of log) if (out[out.length - 1] !== f.phase) out.push(f.phase);
  return out;
}

test('SINGULARITY: armed forced drop runs every phase in order and lands on the drop downbeat', function () {
  const { log } = runSingularity({
    seconds: 7,
    onFrame: (t, eng, sing) => { if (Math.abs(t - 1) < 1e-9) { eng.setForceDrop(true, 0.72); sing.arm(true); } }
  });
  assert.deepEqual(phases(log), ['idle', 'precompression', 'ignition', 'impact', 'breakthrough', 'propagation', 'decay', 'resolve', 'idle']);
  const hits = log.filter((f) => f.hit);
  assert.equal(hits.length, 1);
  assert.ok(hits[0].dropHit, 'impact is the drop downbeat');
  const pre = log.filter((f) => f.phase === 'precompression' || f.phase === 'ignition');
  assert.ok(pre.length * (1 / 60) >= 0.68, 'full ~700 ms run-up: ' + pre.length / 60);
  const ign = log.filter((f) => f.phase === 'ignition');
  assert.ok(ign.length >= 6 && ign.length <= 8, 'ignition ~120 ms');
  assert.ok(Math.max(...log.map((f) => f.breakthrough)) > 0.95, 'breakthrough peaks');
  const start = log.findIndex((f) => f.hit);
  const done = log.findIndex((f, i) => i > start && f.phase === 'idle');
  assert.ok(Math.abs((done - start) / 60 - 3.5) < 0.05, 'resolves at 3.5 s: ' + (done - start) / 60);
});

test('SINGULARITY: returns completely to neutral (event and a driven camera rig)', function () {
  const dolly = new K.DMFKineticBody(40, 0.8, { maxA: 60, maxJ: 3000, min: -0.9, max: 3.5 });
  const { log, sing } = runSingularity({
    seconds: 9,
    onFrame: (t, eng, s) => {
      if (Math.abs(t - 1) < 1e-9) { eng.setForceDrop(true, 0.72); s.arm(true); }
      if (s.hit) dolly.impulse(6);
      dolly.step(-0.6 * s.pre + 1.2 * s.breakthrough, 1 / 60);
    }
  });
  const end = log[log.length - 1];
  assert.equal(end.phase, 'idle');
  for (const k of ['level', 'pre', 'ignition', 'breakthrough']) assert.equal(end[k], 0, k);
  assert.equal(sing.propagation, 0);
  assert.ok(Math.abs(dolly.x) < 1e-3 && Math.abs(dolly.v) < 1e-2, 'camera back at rest: ' + dolly.x);
  assert.ok(Math.max(...log.map((f) => f.level)) <= 1, 'level bounded');
});

test('SINGULARITY: cooldown ≥ 12 s from impact', function () {
  let impactAt = -1;
  const starts = [];
  const { log } = runSingularity({
    seconds: 30,
    onFrame: (t, eng, s) => {
      if (Math.abs(t - 1) < 1e-9) { eng.setForceDrop(true, 0.72); s.arm(true); }
      if (s.hit) impactAt = t;
      if (impactAt > 0 && Math.abs(t - (impactAt + 4)) < 1e-9) eng.setForceDrop(false);          // drop ends
      if (impactAt > 0 && Math.abs(t - (impactAt + 7)) < 1e-9) { eng.setForceDrop(true, 0.72); s.arm(true); }  // too soon
      if (impactAt > 0 && Math.abs(t - (impactAt + 8)) < 1e-9) eng.setForceDrop(false);
      if (impactAt > 0 && Math.abs(t - (impactAt + 13)) < 1e-9) { eng.setForceDrop(true, 0.72); s.arm(true); }
    }
  });
  log.forEach((f) => { if (f.hit) starts.push(f.t); });
  assert.equal(starts.length, 2, 'second one only after the cooldown: ' + starts.join(','));
  assert.ok(starts[1] - starts[0] >= 12, 'spacing ' + (starts[1] - starts[0]));
});

test('SINGULARITY: exactly one per drop, never two inside the same drop', function () {
  // A forced drop held for 25 s with the arm pressed again and again: one event only.
  const held = runSingularity({
    seconds: 30,
    onFrame: (t, eng, s) => {
      if (Math.abs(t - 1) < 1e-9) eng.setForceDrop(true, 0.72);
      if (Math.abs(t % 2) < 1e-9) s.arm(true);
    }
  });
  assert.equal(held.log.filter((f) => f.hit).length, 1);
  // Natural arrangement over four 32-bar cycles: every drop earns one when every=1, every other when every=2.
  const cycle = 32 * 4 * 60 / 124;
  for (const every of [1, 2]) {
    const run = runSingularity({ seconds: cycle * 4 + 5, sing: { every } });
    const drops = run.log.filter((f) => f.dropHit).length;
    const hits = run.log.filter((f) => f.hit).length;
    assert.equal(drops, 4);
    assert.equal(hits, every === 1 ? 4 : 2, 'every=' + every + ' → ' + hits);
    run.log.forEach((f) => { if (f.hit) assert.ok(f.dropHit, 'lands on a drop'); });
  }
});

test('SINGULARITY: withdrawn drop during precompression stands down without firing', function () {
  const { log, sing } = runSingularity({
    seconds: 5,
    onFrame: (t, eng, s) => {
      if (Math.abs(t - 1) < 1e-9) { eng.setForceDrop(true, 0.72); s.arm(true); }
      if (s.phase === 'precompression' && s.pre > 0.3 && eng.forceDrop) { eng.setForceDrop(false); s.arm(false); }
    }
  });
  assert.equal(log.filter((f) => f.hit).length, 0);
  assert.equal(sing.phase, 'idle');
  assert.equal(sing.latch, false, 'can be armed again');
});

test('SINGULARITY: never starts without a predicted drop (analyser-led audio)', function () {
  const sing = new K.DMFSingularity({ every: 1 });
  sing.arm(true);
  for (let i = 0; i < 600; i++) sing.update({ timeToDrop: -1, dropHit: i === 300, dropEnergy: 0.9 }, 1 / 60);
  assert.equal(sing.id, 0);
});

test('velocity field: stretch, reflection and echo vanish smoothly at rest', function () {
  const vf = new K.DMFVelocityField();
  let peakStretch = 0, peakReflect = 0;
  for (let i = 0; i < 18; i++) {
    vf.update(0, 0, 2.5, 1.5, 0.9, 1, i === 0 ? 1 : 0, 1 / 60);
    peakStretch = Math.max(peakStretch, vf.stretch);
    peakReflect = Math.max(peakReflect, vf.reflect);
  }
  assert.ok(peakStretch > 0.5 && peakReflect > 0.3, 'responds to motion');
  assert.ok(Math.abs(Math.hypot(vf.dirX, vf.dirY, vf.dirZ) - 1) < 1e-6, 'unit direction');
  let prev = vf.stretch, monotonic = true;
  for (let i = 0; i < 120; i++) {
    vf.update(0, 0, 0, 0, 0.9, 1, 0, 1 / 60);
    if (vf.stretch > prev + 1e-9) monotonic = false;
    prev = vf.stretch;
  }
  assert.ok(monotonic, 'decays without rebounds');
  assert.equal(vf.stretch, 0);
  assert.equal(vf.reflect, 0);
  assert.equal(vf.echo, 0);
});

test('velocity field: an echo lasts under 220 ms', function () {
  const vf = new K.DMFVelocityField();
  vf.update(0, 0, 0, 0, 0, 1, 1, 1 / 60);
  let t = 0;
  while (vf.echo > 0 && t < 1) { vf.update(0, 0, 0, 0, 0, 1, 0, 1 / 60); t += 1 / 60; }
  assert.ok(t <= 0.22, 'echo lifetime ' + t);
});

test('kinetic primitives are deterministic and stay in 0..1 where normalized', function () {
  function run() {
    const eng = new E.DMFSignalEngine({ startBar: 20 });
    const m = new K.DMFForceMatrix();
    const vf = new K.DMFVelocityField();
    const b = new K.DMFKineticBody(120, 0.7, { maxA: 80, maxJ: 5000 });
    const out = [];
    for (let i = 0; i < 1200; i++) {
      const s = eng.update(1 / 60);
      const f = m.update(s, 1 / 60);
      if (s.beatFired) b.impulse(f.head * 2);
      b.step(f.torso * 0.2, 1 / 60);
      vf.update(b.v, 0, 0, b.v * 3, s.energy, 1, f.forceKick > 0.9 ? f.forceKick : 0, 1 / 60);
      for (const k of Object.keys(f)) assert.ok(f[k] >= 0 && f[k] <= 1, k + ' out of range');
      for (const k of ['mag', 'stretch', 'reflect', 'echo']) assert.ok(vf[k] >= 0 && vf[k] <= 1, k);
      out.push(b.x.toFixed(9) + vf.reflect.toFixed(9));
    }
    return out.join('|');
  }
  assert.equal(run(), run());
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
