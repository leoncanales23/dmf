'use strict';

const path = require('path');
const { strict: assert } = require('assert');
const O = require(path.join(__dirname, '..', 'engine.js'));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}

const DT = 1 / 60;
const BEAT = 60 / O.BPM;
const BAR = BEAT * 4;

function run(engine, machine, seconds, onFrame) {
  const frames = Math.round(seconds / DT);
  for (let i = 0; i < frames; i++) {
    const s = engine.update(DT);
    if (machine) machine.update(s, DT, { active: true });
    if (onFrame) onFrame(s, machine, i);
  }
}

test('synthetic clock is deterministic for identical frame sequences', function () {
  const a = new O.DMFSignalEngine({ startBar: 8 });
  const b = new O.DMFSignalEngine({ startBar: 8 });
  const trace = [];
  run(a, null, 10, s => trace.push(s.energy.toFixed(6) + s.kick.toFixed(6)));
  let i = 0;
  run(b, null, 10, s => assert.equal(s.energy.toFixed(6) + s.kick.toFixed(6), trace[i++]));
});

test('all normalized outputs stay within 0..1 across a full 32-bar cycle', function () {
  const e = new O.DMFSignalEngine();
  run(e, null, BAR * 32 + 1, function (s) {
    for (const k of ['low', 'mid', 'high', 'energy', 'kick', 'snare', 'transient', 'beatPhase', 'dropEnergy']) {
      assert.ok(s[k] >= 0 && s[k] <= 1, k + ' out of range: ' + s[k]);
    }
  });
});

test('kick peaks on every beat of the groove at 124 BPM', function () {
  const e = new O.DMFSignalEngine({ startBar: 8 });
  let peaks = 0;
  let prev = 0;
  run(e, null, BAR * 2 - DT, function (s) {
    if (s.kick > 0.7 && prev < 0.2) peaks++;
    prev = s.kick;
  });
  assert.equal(peaks, 8);
});

test('smoothed energy has no frame-to-frame jitter once settled, across section changes', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  let prevEnergy = null;
  let prevDelta = 0;
  let maxStep = 0;
  let reversals = 0;
  run(e, null, BAR * 34, function (s, m, i) {
    if (i * DT > 1 && prevEnergy !== null) {
      const d = s.energy - prevEnergy;
      maxStep = Math.max(maxStep, Math.abs(d));
      if (Math.abs(d) > 0.002 && Math.abs(prevDelta) > 0.002 && Math.sign(d) !== Math.sign(prevDelta)) reversals++;
      prevDelta = d;
    }
    prevEnergy = s.energy;
  });
  assert.ok(maxStep < 0.05, 'attack step too large: ' + maxStep);
  assert.ok(reversals <= 34 * 4 * 2, 'energy oscillates frame-to-frame: ' + reversals + ' reversals');
});

test('state climbs DORMANT → AWAKENED → TRANSMITTING → OVERDRIVE across the arrangement', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  const m = new O.DMFStateMachine();
  const seen = [];
  run(e, m, BAR * 30, function (s, mm) {
    if (seen[seen.length - 1] !== mm.state) seen.push(mm.state);
  });
  const order = ['DORMANT', 'AWAKENED', 'TRANSMITTING', 'OVERDRIVE'];
  let idx = 0;
  for (const st of seen) if (st === order[idx]) idx++;
  assert.equal(idx, 4, 'sequence was ' + seen.join(' > '));
});

test('OVERDRIVE is earned: never during intro/groove/build, only after sustained drop', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  const m = new O.DMFStateMachine();
  let firstOverdriveBar = -1;
  run(e, m, BAR * 32, function (s, mm) {
    if (mm.overdrive && firstOverdriveBar < 0) firstOverdriveBar = s.barInCycle;
  });
  assert.equal(firstOverdriveBar, 24, 'overdrive entered at bar ' + firstOverdriveBar);
});

test('OVERDRIVE has hysteresis: one entry and one exit per cycle, no flicker', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  const m = new O.DMFStateMachine();
  let transitions = 0;
  let prev = false;
  run(e, m, BAR * 40, function (s, mm) {
    if (mm.overdrive !== prev) transitions++;
    prev = mm.overdrive;
  });
  assert.equal(transitions, 2);
});

test('forced drop (SPACE / TAP) reaches OVERDRIVE within ~3 seconds', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  const m = new O.DMFStateMachine();
  e.setForceDrop(true);
  let t = -1;
  run(e, m, 5, function (s, mm, i) { if (mm.overdrive && t < 0) t = i * DT; });
  assert.ok(t > 1 && t < 3, 'overdrive after ' + t + 's');
});

test('inactive context forces DORMANT and releases OVERDRIVE immediately', function () {
  const e = new O.DMFSignalEngine({ startBar: 24 });
  const m = new O.DMFStateMachine();
  run(e, m, 4);
  assert.equal(m.state, 'OVERDRIVE');
  m.update(e.update(DT), DT, { active: false });
  assert.equal(m.state, 'DORMANT');
});

test('analyser input crossfades in and drives kick from onsets', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  let maxKick = 0;
  for (let i = 0; i < 180; i++) {
    const onset = i % 29 === 0;
    e.inputAudio({ low: onset ? 0.9 : 0.3, mid: 0.4, high: 0.3, kickOnset: onset, snareOnset: false });
    const s = e.update(DT);
    if (i > 120) maxKick = Math.max(maxKick, s.kick);
  }
  assert.equal(e.out.source, 'audio');
  assert.ok(maxKick > 0.8, 'kick ' + maxKick);
  assert.ok(Math.abs(e.out.bpm - 124) <= 2, 'bpm estimate ' + e.out.bpm);
  e.clearAudio();
  run(e, null, 4);
  assert.equal(e.out.source, 'clock');
});

test('spring impulse settles back to rest (mass + drag, no runaway)', function () {
  const s = new O.DMFSpring(180, 14);
  s.impulse(3);
  let peak = 0;
  for (let i = 0; i < 120; i++) peak = Math.max(peak, Math.abs(s.step(0, DT)));
  assert.ok(peak > 0.05, 'impulse too weak ' + peak);
  assert.ok(Math.abs(s.x) < 0.001 && Math.abs(s.v) < 0.05, 'did not settle: ' + s.x);
});

test('spring stays stable at 20 fps frames', function () {
  const s = new O.DMFSpring(400, 18);
  for (let i = 0; i < 60; i++) { if (i % 10 === 0) s.impulse(4); s.step(0, 0.05); }
  assert.ok(Math.abs(s.x) < 1, 'unstable: ' + s.x);
});

test('governor downgrades HIGH→BALANCED once on sustained low FPS and never upgrades', function () {
  const g = new O.DMFPerformanceGovernor('high');
  const events = [];
  for (let i = 0; i < 30 * 12; i++) { const r = g.sample(1 / 30); if (r) events.push(r); }
  for (let i = 0; i < 60 * 12; i++) { const r = g.sample(1 / 60); if (r) events.push(r); }
  assert.deepEqual(events, ['balanced']);
  assert.equal(g.tier, 'balanced');
});

test('governor ignores the first window (shader compile) and offscreen gaps', function () {
  const g = new O.DMFPerformanceGovernor('high');
  const events = [];
  for (let i = 0; i < 20 * 3; i++) { const r = g.sample(1 / 20); if (r) events.push(r); }
  assert.deepEqual(events, []);
  assert.equal(g.sample(5), null);
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
