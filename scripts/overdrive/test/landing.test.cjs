'use strict';

// Structural guarantees for the generated landing: run after the build chain.
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const OUT = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const BUS = fs.readFileSync(path.join(__dirname, '..', 'signal-bus.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(__dirname, '..', 'relic.js'), 'utf8');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
function count(hay, needle) { return hay.split(needle).length - 1; }

test('generated page inlines engine, bus and relic exactly once', function () {
  assert.equal(count(OUT, 'function DMFSignalEngine('), 1);
  assert.equal(count(OUT, 'window.DMFSignal = {'), 1);
  assert.equal(count(OUT, 'function initScene('), 1);
  assert.equal(count(OUT, '<!-- DMF_MESHY_3D_BODY -->'), 1);
});

test('source index.html carries the hero and choreography (not generated-only edits)', function () {
  for (const needle of ['class="hero-ghost"', 'class="hero-cta"', 'class="hero-signal"', "classList.add('dmf-choreo')", '--dmf-peak', 'heroCta:']) {
    assert.ok(SRC.includes(needle), 'index.html missing ' + needle);
    assert.ok(OUT.includes(needle), 'public/index.html missing ' + needle);
  }
});

test('reduced motion and Save-Data never start the signal clock', function () {
  assert.ok(/if \(reduce \|\| saveData\) return;/.test(BUS));
  assert.ok(RELIC.includes('if (!hub || hub.saveData) return;'));
  assert.ok(RELIC.includes('var reduceMotion = hub.reduced || !hub.onFrame;'));
  assert.ok(SRC.includes("if (reduce || !('IntersectionObserver' in window)) return;"));
});

test('performance instrumentation is development-only', function () {
  assert.ok(BUS.includes('var debug = /^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname)'));
  assert.ok(/if \(debug\) \{\s*perf = window\.__DMF_PERF__/.test(BUS));
});

test('bus writes CSS vars only on visible blocks and throttles to ~30 Hz', function () {
  assert.ok(BUS.includes('new IntersectionObserver'));
  assert.ok(BUS.includes('if (now - lastWrite < 33) return;'));
});

test('reflective sweeps are rate limited well under 3 flashes per second', function () {
  const m = RELIC.match(/sweepActive = true; sweepCooldown = (\d+(?:\.\d+)?);/);
  assert.ok(m && parseFloat(m[1]) >= 1, 'sweep cooldown too short');
});

test('hot loop reuses particle buffers and throttles hover raycasts', function () {
  assert.ok(RELIC.includes('pGeom.setDrawRange(0, particleActive)'));
  assert.ok(RELIC.includes("frameCount % 3 === 0 || mouseMoved ? hoverZone() : hoverZone.last"));
  assert.ok(!/setFromCamera\(\{/.test(RELIC), 'raycaster must reuse a Vector2');
});

test('pixel ratio is capped on every tier', function () {
  assert.ok(RELIC.includes('Math.min(dpr, 1.75)'));
  assert.ok(RELIC.includes('Math.min(dpr, small ? 1.25 : 1.5)'));
});

test('payment, auth and print systems are not referenced by the overdrive runtime', function () {
  for (const src of [BUS, RELIC]) {
    for (const forbidden of ['create-preference', 'check-status', 'firebase', 'enrollments', 'MP_ACCESS_TOKEN', 'repair-geometry']) {
      assert.ok(!src.includes(forbidden), 'overdrive runtime references ' + forbidden);
    }
  }
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
