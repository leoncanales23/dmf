'use strict';

// V4 SPATIAL STAGE — deterministic simulations of the pure runtime, plus structural guarantees on the
// generated landing (run after the build chain).
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');
const ST = require(path.join(__dirname, '..', 'spatial-stage.js'));
const K = require(path.join(__dirname, '..', 'kinetic.js'));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}

// A synthetic landing: hero + relic (ARRIVAL), bio/releases (SIGNAL), sets/platforms/rider (TRANSMISSION),
// academy (ACADEMY), pricing/demos/tips (OFFER), contact (CONTACT).
const TOPS = [0, 900, 1600, 2400, 3300, 4000, 4700, 5400, 7000, 7800, 8400, 9200];
const ACTS = [0, 0, 1, 1, 2, 2, 2, 3, 4, 4, 4, 5];
const DOC = 10000, VH = 900;
function director(opts) {
  const d = new ST.DMFStageDirector(opts);
  d.setMarkers(TOPS, ACTS, DOC);
  return d;
}
function scrollRun(d, path, dt, hold) {
  const log = [];
  for (let i = 0; i < path.length; i++) {
    d.update(path[i], VH, dt, hold ? hold(i * dt) : false);
    if (d.transitStarted) log.push({ t: i * dt, from: d.transit.from, to: d.transit.to });
  }
  return log;
}
function linear(from, to, pxPerS, dt, tail) {
  const out = [];
  const n = Math.ceil(Math.abs(to - from) / pxPerS / dt);
  for (let i = 0; i <= n; i++) out.push(from + (to - from) * Math.min(1, i / n));
  for (let i = 0; i < Math.round((tail || 1) / dt); i++) out.push(to);
  return out;
}

test('ACTs commit in page order with one TRANSIT per boundary on a slow read', function () {
  const d = director();
  const log = scrollRun(d, linear(0, DOC - VH, 300, 1 / 60, 2), 1 / 60);
  assert.deepEqual(log.map((e) => e.to), [1, 2, 3, 4, 5]);
  log.forEach((e) => assert.equal(e.to, e.from + 1, 'consecutive'));
  assert.equal(d.act, 5);
  assert.equal(d.actName(), 'CONTACT');
});

test('no TRANSIT storm: a fast fling fires one event at most, a boundary jitter fires none', function () {
  const d = director();
  const fling = scrollRun(d, linear(0, DOC - VH, 9000, 1 / 60, 2), 1 / 60);
  assert.ok(fling.length <= 1, 'fling fired ' + fling.length);
  assert.equal(d.act, 5, 'lands on the final ACT');
  const j = director();
  const jitter = [];
  for (let i = 0; i < 600; i++) jitter.push(TOPS[4] - VH * 0.5 + (Math.floor(i / 9) % 2 ? 150 : -150));
  assert.equal(scrollRun(j, jitter, 1 / 60).length, 0, 'jitter faster than the dwell never commits');
  const slow = director();
  const saw = [];
  for (let i = 0; i < 600; i++) saw.push(TOPS[4] - VH * 0.5 + (Math.floor(i / 30) % 2 ? 150 : -150));
  const events = scrollRun(slow, saw, 1 / 60);
  assert.ok(events.length <= Math.ceil(10 / 1.2) + 1, 'cooldown bounds the rate: ' + events.length);
  for (let i = 1; i < events.length; i++) assert.ok(events[i].t - events[i - 1].t >= 1.2 - 1e-9, 'cooldown respected');
});

test('SINGULARITY holds the stage and hands back to the ACT that is current when it ends', function () {
  const d = director();
  scrollRun(d, linear(0, TOPS[2] - VH * 0.3, 400, 1 / 60, 1), 1 / 60);
  assert.equal(d.act, 1, 'in SIGNAL');
  // During a 3.5 s SINGULARITY the reader scrolls on into ACADEMY.
  const during = linear(TOPS[2] - VH * 0.3, TOPS[7] + 200, 1500, 1 / 60, 3.5 - (TOPS[7] + 200 - TOPS[2] + VH * 0.3) / 1500);
  const held = scrollRun(d, during, 1 / 60, () => true);
  assert.equal(held.length, 0, 'nothing fires while held');
  assert.equal(d.act, 1, 'stage stays where the SINGULARITY took it');
  const after = scrollRun(d, linear(TOPS[7] + 200, TOPS[7] + 200, 1, 1 / 60, 1), 1 / 60);
  assert.equal(d.act, 3, 'returns to the current ACT (ACADEMY), not the starting one');
  assert.equal(after.length, 1);
  assert.equal(after[0].to, 3);
});

test('scroll velocity is conditioned: bounded, acceleration and jerk capped, exactly zero at rest', function () {
  for (const dt of [1 / 30, 1 / 60, 1 / 144]) {
    const sf = new ST.DMFScrollField();
    let y = 0, maxV = 0, maxA = 0, maxJ = 0;
    const n1 = Math.round(1 / dt), n2 = Math.round(3 / dt);
    for (let i = 0; i < n1 + n2; i++) {
      if (i < n1) y += 3000 * dt;
      if (i === 20) y += 50000;                  // a jump-link teleport
      sf.update(y, dt);
      maxV = Math.max(maxV, Math.abs(sf.velocity));
      maxA = Math.max(maxA, Math.abs(sf.acceleration));
      maxJ = Math.max(maxJ, Math.abs(sf.jerk));
    }
    assert.ok(maxV <= 1 + 1e-9, 'bounded ' + maxV);
    assert.ok(maxA <= 14 + 1e-9, 'acceleration cap ' + maxA);
    assert.ok(maxJ <= 400 + 1e-6, 'jerk cap ' + maxJ);
    assert.equal(sf.velocity, 0, 'exact zero after stopping (dt ' + dt + ')');
    assert.equal(sf.acceleration, 0);
  }
});

function followRun(fromPose, toPose, fps, seconds, transit) {
  const f = new ST.DMFStageFollower();
  f.reset(fromPose);
  const dt = 1 / fps;
  const tr = transit ? new ST.DMFTransit() : null;
  if (tr) tr.start(1, 2);
  const trace = [];
  const maxA = {};
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    if (tr) tr.update(dt);
    const p = f.update(toPose, dt, tr);
    for (const k of ST.POSE_KEYS) maxA[k] = Math.max(maxA[k] || 0, Math.abs(f.bodies[k].a));
    trace.push(Object.assign({ t: (i + 1) * dt }, p));
  }
  return { f, trace, maxA };
}

test('Receiver/camera travel between ACTs: acceleration and jerk limited, overshoot then settle', function () {
  const from = new ST.DMFStagePose(ST.POSES_WIDE[1]), to = new ST.DMFStagePose(ST.POSES_WIDE[2]);
  const { f, trace } = followRun(from, to, 60, 6, true);
  const limits = { cx: 6, cy: 6, w: 8, rotY: 2.2, fov: 30 };
  for (const k of Object.keys(limits)) assert.ok(f.bodies[k].maxA === limits[k]);
  let minCx = 1;
  trace.forEach((p) => { minCx = Math.min(minCx, p.cx); });
  assert.ok(minCx < to.cx, 'overshoots the destination a little: ' + minCx);
  assert.ok(to.cx - minCx < 0.06, 'overshoot stays small: ' + (to.cx - minCx));
  const early = trace[Math.round(0.05 * 60)];
  assert.ok(early.cx > from.cx - 0.02, 'no instant jump at the start');
});

test('stage converges back to rest exactly', function () {
  const from = new ST.DMFStagePose(ST.POSES_WIDE[0]), to = new ST.DMFStagePose(ST.POSES_WIDE[4]);
  const { f } = followRun(from, to, 60, 8, true);
  for (const k of ST.POSE_KEYS) assert.equal(f.pose[k], to[k], k + ' not exactly at rest');
  assert.ok(f.rest);
  assert.equal(f.speed, 0);
});

test('30 / 60 / 144 fps follow the same route', function () {
  const from = new ST.DMFStagePose(ST.POSES_WIDE[1]), to = new ST.DMFStagePose(ST.POSES_WIDE[3]);
  const at = {};
  for (const fps of [30, 60, 144]) {
    const { trace } = followRun(from, to, fps, 1.2, true);
    at[fps] = trace[Math.round(0.6 * fps) - 1];
  }
  for (const k of ['w', 'cx', 'cy', 'h', 'az', 'fov']) {
    const vals = [at[30][k], at[60][k], at[144][k]];
    assert.ok(Math.max(...vals) - Math.min(...vals) < 0.03, k + ' diverges across frame rates: ' + vals.join(','));
  }
});

test('TRANSIT: phase order, ~800 ms, capped below SINGULARITY, ends at exact zero', function () {
  const tr = new ST.DMFTransit();
  tr.start(2, 3);
  const phases = [];
  let peak = 0, frames = 0;
  while (tr.active || frames === 0) {
    tr.update(1 / 60);
    frames++;
    if (phases[phases.length - 1] !== tr.phase) phases.push(tr.phase);
    peak = Math.max(peak, tr.level);
  }
  assert.deepEqual(phases, ['preload', 'open', 'travel', 'pass', 'settle', 'idle']);
  assert.ok(frames / 60 >= 0.5 && frames / 60 <= 0.9, 'duration ' + frames / 60);
  assert.ok(peak <= ST.TRANSIT_PEAK && ST.TRANSIT_PEAK < 1, 'weaker than SINGULARITY (peak 1)');
  assert.equal(tr.level, 0);
  assert.equal(tr.dir, 1);
});

test('portal architecture: reveals with motion, exactly nothing at rest; kick propagates on edges only', function () {
  const pf = new ST.DMFPortalField();
  const quiet = { forceKick: 0, forceLow: 0, forceMid: 0, forceHigh: 0, amp: 0.5 };
  for (let i = 0; i < 30; i++) pf.update(0.6, 0.4, 0, 0, quiet, 1 / 60);
  assert.ok(pf.intensity > 0.5, 'reveals with motion');
  for (let i = 0; i < 300; i++) pf.update(0, 0, 0, 0, quiet, 1 / 60);
  assert.equal(pf.intensity, 0, 'disappears at rest');
  let resets = 0;
  for (let i = 0; i < 120; i++) {
    const kick = i % 30 < 3 ? 1 : 0;
    pf.update(0, 0, 0, 0, Object.assign({}, quiet, { forceKick: kick }), 1 / 60);
    if (pf.floorT === 1 / 60) resets++;
  }
  assert.equal(resets, 4, 'one floor wave per kick onset');
});

test('compact (phone) poses are a gentler stage, not the desktop one squeezed', function () {
  for (let a = 1; a < 6; a++) {
    const c = ST.POSES_COMPACT[a], wd = ST.POSES_WIDE[a];
    assert.equal(c.cx, 0.5, 'centred');
    assert.ok(Math.abs(c.az || 0) <= Math.abs(wd.az || 0) + 1e-9 && Math.abs(c.az || 0) <= 0.2, 'smaller orbit');
    assert.ok(Math.abs(c.y || 0) <= Math.abs(wd.y || 0) + 1e-9, 'smaller vertical moves');
    assert.ok(c.opacity <= 0.5, 'quiet behind text');
  }
  const d = new ST.DMFStageDirector({ compact: true });
  assert.equal(d.poses[1].cy, ST.POSES_COMPACT[1].cy);
});

test('deterministic', function () {
  function run() {
    const d = director();
    const f = new ST.DMFStageFollower();
    f.reset(d.poses[0]);
    const sf = new ST.DMFScrollField();
    const out = [];
    const path = linear(0, DOC - VH, 700, 1 / 60, 3);
    for (const y of path) {
      sf.update(y, 1 / 60);
      d.update(y, VH, 1 / 60, false);
      const p = f.update(d.target, 1 / 60, d.transit);
      out.push(p.cx.toFixed(9) + p.fov.toFixed(9) + sf.velocity.toFixed(9));
    }
    return out.join('|');
  }
  assert.equal(run(), run());
});

// === Structural guarantees on the sources and the generated page ===
const ROOT = path.join(__dirname, '..', '..', '..');
const OUT = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const STAGE = fs.readFileSync(path.join(__dirname, '..', 'spatial-stage.js'), 'utf8');
const BUS = fs.readFileSync(path.join(__dirname, '..', 'signal-bus.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(__dirname, '..', 'relic.js'), 'utf8');
function count(hay, needle) { return hay.split(needle).length - 1; }
function body(src, signature) {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, 'missing ' + signature);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(src.indexOf('{', start) + 1, i);
  }
  throw new Error('unbalanced ' + signature);
}

test('generated page includes the spatial stage runtime exactly once, after kinetic and before the bus', function () {
  assert.equal(count(OUT, 'function DMFStageDirector('), 1);
  const at = ['function DMFKineticBody(', 'function DMFStageDirector(', 'window.DMFSignal = {', 'function initScene('].map((n) => OUT.indexOf(n));
  assert.deepEqual(at.slice().sort((a, b) => a - b), at);
  assert.ok(OUT.includes(STAGE), 'spatial-stage.js in public/index.html is stale — run the build chain');
});

test('reduced motion and Save-Data never start V4; mobile and LITE degrade', function () {
  const guard = BUS.indexOf('if (reduce || saveData) return;');
  assert.ok(guard > 0 && BUS.indexOf('director.update(') > guard, 'director only runs on the live clock');
  assert.ok(/stageEligible = !reduceMotion && quality !== 'static'/.test(RELIC), 'relic never stages under reduced motion');
  assert.ok(RELIC.includes("var stageWanted = stageEligible && !fsActive && quality !== 'lite';"), 'LITE and fullscreen fall back to the V3 band');
  assert.ok(RELIC.includes('stage.setCompact(compactStage)'), 'phones get the compact stage');
  assert.ok(/portalCount\(tier\)[\s\S]{0,400}'lite'[\s\S]{0,40}0/.test(RELIC), 'LITE has no spatial geometry');
});

test('V4 hot paths: no layout reads, no allocations, no timers, no extra loops, no pure white', function () {
  const LAYOUT = /getBoundingClientRect|offsetTop|offsetHeight|offsetWidth|clientHeight|clientWidth|scrollHeight|getComputedStyle/;
  const ALLOC = /\bnew [A-Z]|\[\s*\]|\{\s*\}|\.map\(|\.filter\(|\.concat\(|\.slice\(|function\s*\(/;
  const hot = [
    ['DMFScrollField.update', body(STAGE, 'DMFScrollField.prototype.update = function (scrollY, dt)')],
    ['DMFTransit.update', body(STAGE, 'DMFTransit.prototype.update = function (dt)')],
    ['DMFStageDirector.update', body(STAGE, 'DMFStageDirector.prototype.update = function (scrollY, vh, dt, hold)')],
    ['DMFStageFollower.update', body(STAGE, 'DMFStageFollower.prototype.update = function (target, dt, transit, amp)')],
    ['DMFPortalField.update', body(STAGE, 'DMFPortalField.prototype.update = function (motion, scroll, transit, sing, f, dt)')],
    ['relic stageFrame', body(RELIC, 'function stageFrame(s, dt)')],
    ['relic updatePortal', body(RELIC, 'function updatePortal(s, dt)')],
    ['bus stageTick', body(BUS, 'function stageTick(dt)')]
  ];
  for (const [name, code] of hot) {
    assert.ok(!LAYOUT.test(code), name + ' reads layout');
    assert.ok(!ALLOC.test(code), name + ' allocates per frame');
  }
  for (const [name, src] of [['stage', STAGE], ['bus', BUS], ['relic', RELIC]]) {
    assert.ok(!/setInterval\s*\(/.test(src), name + ' uses setInterval');
    assert.ok(!/#fff(?:fff)?\b|255,\s*255,\s*255|0xffffff\b/i.test(src), name + ' uses pure white');
  }
  assert.equal(count(STAGE, 'requestAnimationFrame'), 0);
  assert.equal(count(RELIC, 'requestAnimationFrame'), 0);
  assert.equal(count(BUS, 'requestAnimationFrame(frame)'), 2, 'still exactly one self-scheduling loop');
  assert.ok(RELIC.includes('new THREE.InstancedMesh('), 'repeated structures are instanced');
});

test('V4 debug telemetry is debug-only; runtime has no payment/auth/backend references', function () {
  for (const k of ['stageAct', 'stageProgress', 'stageTransition', 'scrollVelocity', 'scrollAcceleration', 'cameraJourney',
    'receiverStageDepth', 'portalIntensity', 'spatialVelocity', 'spatialTier', 'drawCalls', 'triangles']) {
    assert.ok(new RegExp('perf\\.' + k + ' = ').test(BUS + RELIC), 'missing ' + k);
  }
  assert.ok(/if \(perf\) \{[\s\S]{0,120}perf\.drawCalls = /.test(RELIC), 'renderer.info only read in debug');
  for (const src of [STAGE, BUS, RELIC]) {
    for (const forbidden of ['create-preference', 'check-status', 'firebase', 'enrollments', 'MP_ACCESS_TOKEN', 'mercadopago', 'stream-signer', 'repair-geometry']) {
      assert.ok(!src.toLowerCase().includes(forbidden.toLowerCase()), 'runtime references ' + forbidden);
    }
  }
});

test('DOM coherence is authored in the source index.html, settles, and respects reduced motion', function () {
  assert.ok(SRC.includes('.is-stage-arrive'), 'arrival choreography lives in the source');
  assert.ok(OUT.includes('.is-stage-arrive'));
  assert.ok(/prefers-reduced-motion:reduce\)\{[^}]*is-stage-arrive/.test(SRC.replace(/\n/g, '')), 'reduced motion disables arrival motion');
  assert.ok(!/is-stage-arrive[^{]*\{[^}]*infinite/.test(SRC), 'arrival animations never loop');
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
