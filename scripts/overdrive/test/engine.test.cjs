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

test('forced drop (SPACE / TAP) lands on the next downbeat and reaches OVERDRIVE within ~4.5 s', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  const m = new O.DMFStateMachine();
  run(e, m, BEAT * 1.5);
  e.setForceDrop(true);
  let hitAt = -1;
  let odAt = -1;
  run(e, m, 6, function (s, mm, i) {
    if (s.dropHit && hitAt < 0) hitAt = i * DT;
    if (mm.overdrive && odAt < 0) odAt = i * DT;
  });
  assert.ok(Math.abs(hitAt - BEAT * 2.5) < DT * 1.5, 'drop hit at ' + hitAt + ', expected next downbeat');
  assert.ok(odAt > hitAt && odAt < 4.5, 'overdrive after ' + odAt + 's');
});

test('beat predictor: timeToBeat stays in [0, interval] and nextBeat matches the real beat', function () {
  const e = new O.DMFSignalEngine({ startBar: 8 });
  let predicted = null;
  let checked = 0;
  run(e, null, BAR * 4, function (s) {
    assert.ok(s.timeToBeat >= 0 && s.timeToBeat <= s.beatInterval + 1e-9, 'ttb ' + s.timeToBeat);
    if (s.beatFired && predicted !== null) {
      assert.ok(Math.abs(e.time - predicted) <= DT + 1e-9, 'beat at ' + e.time + ' predicted ' + predicted);
      checked++;
    }
    predicted = s.nextBeat;
  });
  assert.ok(checked >= 14, 'checked ' + checked + ' beats');
});

test('beat predictor is deterministic', function () {
  const a = new O.DMFSignalEngine({ startBar: 3 });
  const b = new O.DMFSignalEngine({ startBar: 3 });
  const trace = [];
  run(a, null, 6, s => trace.push(s.timeToBeat.toFixed(6) + s.impulse.toFixed(6) + s.timeToDrop.toFixed(4)));
  let i = 0;
  run(b, null, 6, s => assert.equal(s.timeToBeat.toFixed(6) + s.impulse.toFixed(6) + s.timeToDrop.toFixed(4), trace[i++]));
});

test('impact pulse decays cleanly: monotonic between beats and gone within 150 ms', function () {
  const e = new O.DMFSignalEngine({ startBar: 8 });
  let prev = 0;
  let sinceFire = 1e9;
  run(e, null, BAR * 2, function (s) {
    if (s.beatFired) sinceFire = 0; else sinceFire += DT;
    if (!s.beatFired) assert.ok(s.impulse <= prev + 1e-12, 'impulse rose without a beat');
    if (sinceFire >= 0.15 && sinceFire < 1e8) assert.ok(s.impulse < 0.05, 'impulse lingers: ' + s.impulse);
    prev = s.impulse;
  });
});

test('response layers are ordered: impulse peaks first, body later, cinema last', function () {
  const e = new O.DMFSignalEngine({ startBar: 24 });
  run(e, null, BAR);
  const peaks = { impulse: [0, 0], body: [0, 0], cinema: [0, 0] };
  let t = -1;
  run(e, null, BEAT * 0.98 - DT, function (s) {
    if (s.beatFired) t = 0;
    if (t < 0) return;
    t += DT;
    for (const k of Object.keys(peaks)) if (s[k] > peaks[k][0]) peaks[k] = [s[k], t];
  });
  assert.ok(peaks.impulse[1] < peaks.body[1], 'body should peak after impulse');
  assert.ok(peaks.body[1] >= 0.06 && peaks.body[1] <= 0.32, 'body peak at ' + peaks.body[1]);
  assert.ok(peaks.cinema[1] > peaks.body[1], 'cinema should peak after body');
});

test('timeToDrop counts down to the build → drop downbeat and dropHit fires once per cycle', function () {
  const e = new O.DMFSignalEngine({ startBar: 20 });
  let hits = 0;
  let prevTtd = null;
  run(e, null, BAR * 5, function (s) {
    if (s.dropHit) {
      hits++;
      assert.ok(prevTtd !== null && prevTtd <= DT * 1.5, 'timeToDrop before hit was ' + prevTtd);
    }
    prevTtd = s.timeToDrop;
  });
  assert.equal(hits, 1);
});

test('HYPERDRIVE: one entry per drop, anticipation before the hit, clean exit', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  const hd = new O.DMFHyperdrive();
  let entries = 0;
  let prevId = 0;
  let maxPreBeforeHit = 0;
  let exits = 0;
  let wasActive = false;
  run(e, null, BAR * 70, function (s) {
    hd.update(s, DT);
    if (!hd.active) maxPreBeforeHit = Math.max(maxPreBeforeHit, hd.pre);
    if (hd.id !== prevId) { entries++; prevId = hd.id; }
    if (wasActive && !hd.active) {
      exits++;
      assert.equal(hd.level, 0);
      assert.equal(hd.phase, 'idle');
    }
    assert.ok(hd.level >= 0 && hd.level <= 1 && hd.pre >= 0 && hd.pre <= 1);
    wasActive = hd.active;
  });
  assert.equal(entries, 2, 'two drops in 70 bars must give exactly two moments');
  assert.equal(exits, 2);
  assert.ok(maxPreBeforeHit > 0.6, 'pre-impact contraction too weak: ' + maxPreBeforeHit);
});

test('HYPERDRIVE lasts 2-4 s and walks hit → push → wave → spread → decay', function () {
  const hd = new O.DMFHyperdrive();
  const sig = { dropEnergy: 1, timeToDrop: -1, dropHit: true };
  hd.update(sig, DT);
  sig.dropHit = false;
  const phases = [];
  let t = 0;
  while (hd.active && t < 10) {
    if (phases[phases.length - 1] !== hd.phase) phases.push(hd.phase);
    hd.update(sig, DT);
    t += DT;
  }
  assert.deepEqual(phases, ['hit', 'push', 'wave', 'spread', 'decay']);
  assert.ok(t >= 2 && t <= 4, 'duration ' + t);
});

test('HYPERDRIVE ignores repeated triggers inside the same drop and during cooldown', function () {
  const hd = new O.DMFHyperdrive();
  const sig = { dropEnergy: 1, timeToDrop: -1, dropHit: true };
  let fires = 0;
  let prevId = 0;
  for (let i = 0; i < 60 * 20; i++) {
    sig.dropHit = i % 30 === 0;
    hd.update(sig, DT);
    if (hd.id !== prevId) { fires++; prevId = hd.id; }
  }
  assert.equal(fires, 1);
});

test('analyser lookahead fires the impulse ~leadTime before the measured beat', function () {
  const e = new O.DMFSignalEngine({ startBar: 0, leadTime: 0.05 });
  const period = 29;
  const leads = [];
  let lastFire = -1;
  for (let i = 0; i < 60 * 8; i++) {
    const onset = i % period === 0;
    e.inputAudio({ low: onset ? 0.9 : 0.3, mid: 0.4, high: 0.3, kickOnset: onset, snareOnset: false });
    const s = e.update(DT);
    if (s.beatFired) lastFire = i;
    if (onset && i > 240 && lastFire >= 0) leads.push((i - lastFire) * DT);
  }
  const avg = leads.reduce((a, b) => a + b, 0) / leads.length;
  assert.ok(avg >= 0.02 && avg <= 0.09, 'average lead ' + avg);
});

test('render scaler never oscillates on noisy FPS and climbs back slowly', function () {
  const r = new O.DMFRenderScaler(1.35, 1.75);
  let changes = 0;
  for (let w = 0; w < 30; w++) {
    const fps = w % 2 ? 44 : 62;
    for (let f = 0; f < fps * 2; f++) if (r.sample(1 / fps) !== null) changes++;
  }
  assert.ok(changes <= 60 / 4 + 1, 'too many changes: ' + changes);
  const low = new O.DMFRenderScaler(1.35, 1.75);
  for (let f = 0; f < 40 * 30; f++) low.sample(1 / 40);
  assert.equal(low.scale, 1.35);
  let t = 0;
  while (low.scale < 1.75 && t < 120) { low.sample(1 / 60); t += 1 / 60; }
  assert.ok(t >= 30, 'climbed back too fast: ' + t + 's');
});

test('new signal fields stay within normalized bounds', function () {
  const e = new O.DMFSignalEngine({ startBar: 0 });
  run(e, null, BAR * 33, function (s) {
    for (const k of ['impulse', 'impact', 'body', 'cinema', 'release', 'momentum']) {
      assert.ok(s[k] >= 0 && s[k] <= 1, k + ' out of range: ' + s[k]);
    }
  });
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
