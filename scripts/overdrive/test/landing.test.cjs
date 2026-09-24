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

test('bus writes CSS vars only on visible blocks, ~30 Hz, immediate only on impact', function () {
  assert.ok(BUS.includes('new IntersectionObserver'));
  assert.ok(BUS.includes('if (!urgent && now - lastWrite < 33) return;'));
  assert.ok(BUS.includes('writeBus(now, s, s.beatFired || hdHit);'));
  assert.equal(count(BUS, 'writeBus('), 2, 'writeBus must have a single call site');
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

test('pixel ratio is capped on every tier and never exceeds the device ratio', function () {
  assert.ok(RELIC.includes("if (tier === 'high') return [1.35, 1.75];"));
  assert.ok(RELIC.includes("if (tier === 'balanced') return [1, small ? 1.25 : 1.5];"));
  assert.ok(RELIC.includes('renderScale = Math.min(window.devicePixelRatio || 1, renderScaler.scale);'));
});

test('payment, auth and print systems are not referenced by the overdrive runtime', function () {
  for (const src of [BUS, RELIC]) {
    for (const forbidden of ['create-preference', 'check-status', 'firebase', 'enrollments', 'MP_ACCESS_TOKEN', 'repair-geometry']) {
      assert.ok(!src.includes(forbidden), 'overdrive runtime references ' + forbidden);
    }
  }
});

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
const LAYOUT_READS = /getBoundingClientRect|offsetTop|offsetHeight|offsetWidth|clientHeight|scrollHeight|getComputedStyle/;
const CHOREO = SRC.slice(SRC.indexOf('/* DMF HYPERDRIVE — scroll choreography'));

test('no layout reads in any per-frame hot path', function () {
  const hot = [
    ['bus frame', body(BUS, 'function frame(now)')],
    ['bus writeBus', body(BUS, 'function writeBus(now, s, urgent)')],
    ['bus waveAt', body(BUS, 'function waveAt(el)')],
    ['relic animateRelic', body(RELIC, 'function animateRelic(s, dt)')],
    ['relic rigUpdate', body(RELIC, 'function rigUpdate(dt, nowMs)')],
    ['relic applyCamera', body(RELIC, 'function applyCamera(dolly)')],
    ['relic updateHud', body(RELIC, 'function updateHud(s, nowMs)')],
    ['scroll update', body(CHOREO, 'function update()')]
  ];
  for (const [name, code] of hot) assert.ok(!LAYOUT_READS.test(code), name + ' reads layout');
});

test('no uncontrolled requestAnimationFrame loops: one global loop, one-shot scroll rAF', function () {
  assert.equal(count(RELIC, 'requestAnimationFrame'), 0, 'relic must run on the shared loop');
  assert.equal(count(BUS, 'requestAnimationFrame(frame)'), 2, 'bus owns exactly one self-scheduling loop');
  assert.equal(count(CHOREO, 'requestAnimationFrame('), 1, 'choreography uses a one-shot rAF');
  assert.ok(CHOREO.includes('if (!ticking) { ticking = true; requestAnimationFrame(update); }'));
  assert.ok(SRC.includes('if(hub&&hub.onFrame&&!hub.reduced&&!hub.saveData) hub.onFrame(frame);'), 'smoke must share the loop');
});

test('HYPERDRIVE and impact lens stay inside safety limits', function () {
  assert.ok(RELIC.includes('lens.fov = clamp(lensSpring.x, -3, 3);'), 'FOV displacement must be <= 3 degrees');
  assert.ok(RELIC.includes('lens.roll = clamp(rollSpring.x, -0.026, 0.026);'), 'roll must be <= 1.5 degrees');
  assert.ok(BUS.includes('var hyper = new O.DMFHyperdrive();'));
  assert.ok(!/#fff(?:fff)?\b|255,\s*255,\s*255/i.test(RELIC + BUS), 'no pure white flashes');
});

test('reduced motion disables dynamic effects everywhere', function () {
  assert.ok(/if \(reduce \|\| saveData\) return;/.test(BUS));
  assert.ok(CHOREO.includes("if (reduce || !('IntersectionObserver' in window)) return;"));
  assert.ok(/prefers-reduced-motion:reduce\)\{[^}]*\.hero-plane,\.hero-ghost--2,\.hero-ghost--3\{display:none\}/.test(SRC));
  assert.ok(RELIC.includes('if (reduceMotion || quality === \'static\')'));
});

test('generated public/index.html is in sync with its sources (no stale or hand-edited output)', function () {
  const ENGINE = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  for (const [name, code] of [['engine.js', ENGINE], ['signal-bus.js', BUS], ['relic.js', RELIC]]) {
    assert.ok(OUT.includes(code), name + ' in public/index.html is stale — run the build chain');
  }
  assert.ok(OUT.includes(CHOREO.slice(0, CHOREO.indexOf('</script>'))), 'choreography in public/index.html is stale');
});

test('debug instrumentation exposes the V2 diagnostics', function () {
  for (const k of ['fps', 'qualityTier', 'renderScale', 'source', 'bpm', 'state', 'overdrive', 'hyperdrive', 'impact', 'timeToBeat', 'visibleSections', 'cameraShot']) {
    assert.ok(new RegExp('perf\\.' + k + ' = |' + k + ':').test(BUS), 'missing ' + k);
  }
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
