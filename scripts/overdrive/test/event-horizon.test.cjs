'use strict';

// DMF EVENT HORIZON — deterministic simulations of the director, plus structural guarantees on the source,
// the runtime modules and the generated landing (run after the build chain).
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');
const EH = require(path.join(__dirname, '..', 'event-horizon.js'));

const ROOT = path.join(__dirname, '..', '..', '..');
const DIR = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OUT = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const MOD = fs.readFileSync(path.join(DIR, 'event-horizon.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(DIR, 'relic.js'), 'utf8');
const MIXER = fs.readFileSync(path.join(DIR, 'mixer-stage.js'), 'utf8');
const BUILD = fs.readFileSync(path.join(ROOT, 'scripts', 'build-3d.cjs'), 'utf8');
const WORKFLOW = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'validate-3d.yml'), 'utf8');
const PKG = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');

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

// A synthetic landing: intro, hero, bio, releases, academy, offer (calm 1), contact.
const TOPS = [0, 900, 1800, 2900, 4000, 5200, 6400];
const IDS = ['intro', 'hero', 'bio', 'releases', 'academy', 'offer', 'contact'];
const LIGHTS = [1, 0.9, 0.55, 0.5, 0.5, 0.3, 0.45];
const CALMS = [0, 0, 0, 0, 0.35, 1, 0.3];
const VH = 900, DT = 1 / 60;
function director() {
  const d = new EH.DMFEventHorizon();
  d.setMarkers(TOPS, IDS, LIGHTS, CALMS, 7400);
  return d;
}
function input(over) {
  return Object.assign({ scrollY: 0, vh: VH, velocity: 0, s: {}, forces: {}, pointerX: 0, pointerY: 0, tier: 'high', compact: false, wakeT: -1, pre: 0 }, over);
}
function beat(i, every) { return { energy: 0.8, kick: 0.9, low: 0.7, mid: 0.4, high: 0.3, beatFired: i % every === 0 }; }

test('state shape: hub.eventHorizon exposes the documented stage fields', function () {
  const st = director().update(input({}), DT);
  for (const k of ['section', 'progress', 'velocity', 'energy', 'tension', 'depth', 'focus', 'transition', 'performanceTier', 'calm', 'wake'])
    assert.ok(k in st, 'missing ' + k);
});

test('sections: the focus line picks the active block; progress runs 0..1 inside it', function () {
  const d = director();
  let st = d.update(input({ scrollY: 0 }), DT);
  assert.equal(st.section, 'intro');
  st = d.update(input({ scrollY: 1800 - VH * 0.45 + 10 }), DT);
  assert.equal(st.section, 'bio');
  assert.ok(st.progress >= 0 && st.progress < 0.05);
  st = d.update(input({ scrollY: 5200 - VH * 0.45 + 600 }), DT);
  assert.equal(st.section, 'offer');
  assert.ok(st.progress > 0.4 && st.progress < 0.6);
});

test('signal gates: one short envelope per crossing, rate limited, never into the offer', function () {
  const d = director();
  d.update(input({ scrollY: 0 }), DT);
  let st = d.update(input({ scrollY: 900 - VH * 0.45 + 5 }), DT);   // intro -> hero
  assert.equal(st.gateId, 1, 'gate fires on crossing');
  let peak = 0, frames = 0;
  for (let i = 0; i < 120; i++) { st = d.update(input({ scrollY: 900 - VH * 0.45 + 5 }), DT); peak = Math.max(peak, st.transition); if (st.transition > 0.01) frames++; }
  assert.ok(peak > 0.6 && peak <= 1, 'visible envelope, bounded');
  assert.ok(frames / 60 < EH.GATE_DUR + 0.1, 'almost subliminal (< ~0.7 s)');
  assert.equal(st.transition < 0.01, true, 'returns to rest');
  // Two crossings inside GATE_GAP: only the first fires.
  const d2 = director();
  d2.update(input({ scrollY: 0 }), DT);
  d2.update(input({ scrollY: 900 - VH * 0.45 + 5 }), DT);
  st = d2.update(input({ scrollY: 1800 - VH * 0.45 + 5 }), DT);
  assert.equal(st.gateId, 1, 'rate limited');
  // Into the conversion area: no gate at all.
  const d3 = director();
  d3.update(input({ scrollY: 4000 }), DT);
  for (let i = 0; i < 120; i++) d3.update(input({ scrollY: 4000 }), DT);
  st = d3.update(input({ scrollY: 5200 - VH * 0.45 + 5 }), DT);
  assert.equal(st.gateId, 0, 'the offer arrives without a sweep');
  // LITE and STATIC tiers never fire gates.
  const d4 = director();
  d4.update(input({ scrollY: 0, tier: 'lite' }), DT);
  st = d4.update(input({ scrollY: 900 - VH * 0.45 + 5, tier: 'lite' }), DT);
  assert.equal(st.gateId, 0);
});

test('depth is a damped spring: kicks compress it, silence returns it to rest without ringing', function () {
  const d = director();
  let st, maxD = 0, minD = 0;
  for (let i = 0; i < 240; i++) { st = d.update(input({ s: beat(i, 30), forces: { forceLow: 0.6 } }), DT); maxD = Math.max(maxD, st.depth); }
  assert.ok(maxD > 0.1 && maxD <= 1, 'kicks give weight');
  for (let i = 0; i < 180; i++) { st = d.update(input({ s: { energy: 0 }, forces: { forceLow: 0 } }), DT); minD = Math.min(minD, st.depth); }
  assert.ok(Math.abs(st.depth) < 0.01, 'back at rest after 3 s: ' + st.depth);
  assert.ok(minD > -0.1, 'no bounce through rest: ' + minD);
});

test('energy is an envelope, and the conversion area pulls every audio term down', function () {
  const d = director();
  let st;
  for (let i = 0; i < 180; i++) st = d.update(input({ scrollY: 1800, s: beat(i, 30), forces: { forceLow: 0.7, forceMid: 0.5, forceHigh: 0.4 } }), DT);
  const loud = { e: st.energy, low: st.low, mid: st.mid };
  assert.ok(loud.e > 0.7, 'follows energy');
  for (let i = 0; i < 20; i++) st = d.update(input({ scrollY: 1800, s: { energy: 0 } }), DT);
  assert.ok(st.energy < loud.e && st.energy > 0.3, 'releases slowly, never snaps');
  const c = director();
  for (let i = 0; i < 300; i++) st = c.update(input({ scrollY: 5200, s: beat(i, 30), forces: { forceLow: 0.7, forceMid: 0.5, forceHigh: 0.4 } }), DT);
  assert.ok(st.calm > 0.95, 'calm settles in the offer');
  assert.ok(st.energy < loud.e * 0.5 && st.low < loud.low * 0.5 && st.mid < loud.mid * 0.5, 'spectacle steps back');
});

test('scroll velocity is clamped hard and tension never exceeds 1', function () {
  const d = director();
  let st;
  for (let i = 0; i < 60; i++) st = d.update(input({ velocity: 5, pre: 1 }), DT);
  assert.ok(Math.abs(st.velocity) <= 0.8 && st.speed <= 0.8);
  assert.ok(st.tension <= 1 && st.tension > 0.5);
});

test('wake: the stage powers on over ~2.2 s; a returning visitor is awake at once', function () {
  const d = director();
  assert.equal(d.update(input({ wakeT: 0 }), DT).wake, 0);
  assert.ok(d.update(input({ wakeT: 1.1 }), DT).wake > 0.3);
  assert.equal(d.update(input({ wakeT: EH.WAKE_DUR + 0.1 }), DT).wake, 1);
  assert.equal(director().update(input({ wakeT: -1 }), DT).wake, 1);
  // While waking, audio is held back.
  const w = director();
  let st;
  for (let i = 0; i < 30; i++) st = w.update(input({ wakeT: 0.05, s: beat(i, 10) }), DT);
  assert.ok(st.energy < 0.05, 'no reaction before the stage is on');
});

test('compose(): a still stage for reduced motion, Save-Data and STATIC', function () {
  const d = director();
  const st = d.compose(5);
  assert.equal(st.section, 'offer');
  for (const k of ['energy', 'low', 'mid', 'high', 'kick', 'depth', 'tension', 'transition', 'velocity']) assert.equal(st[k], 0, k);
  assert.equal(st.wake, 1);
  assert.equal(st.calm, 1);
});

test('tiers: HIGH/BALANCED/LITE/STATIC exist; unknown tiers resolve by device', function () {
  for (const t of ['high', 'balanced', 'lite', 'static']) assert.ok(EH.TIERS[t], t);
  assert.equal(EH.TIERS.lite.rate, 2, 'LITE halves noncritical updates');
  assert.equal(EH.TIERS.static.rate, 0, 'STATIC is one composed frame');
  assert.equal(EH.tierOf('none', true), 'balanced');
  assert.equal(EH.tierOf('none', false), 'high');
  assert.equal(EH.tierOf('lite', false), 'lite');
});

test('one clock: no rAF, no timers, no audio graph, one bus listener', function () {
  assert.equal(count(MOD, 'requestAnimationFrame'), 0);
  assert.ok(!/setInterval\s*\(|setTimeout\s*\(/.test(MOD), 'no timers');
  assert.ok(!/AudioContext\s*[(|]|webkitAudioContext|createAnalyser|createMediaElementSource/.test(MOD), 'no audio graph');
  assert.equal(count(MOD, 'hub.onFrame('), 1, 'subscribes once to the DMF Signal Bus');
  assert.ok(MOD.includes('hub.eventHorizon = st;'), 'publishes hub.eventHorizon');
});

test('one Three.js, one GLTFLoader, one runtime copy — in order in the generated page', function () {
  assert.equal(count(OUT, 'three.js/r128/three.min.js'), 1);
  assert.equal(count(OUT, 'examples/js/loaders/GLTFLoader.js'), 1);
  assert.ok(!/three\.min\.js|GLTFLoader\.js|createElement\(\s*['"]script/.test(MOD), 'Event Horizon loads nothing');
  assert.equal(count(OUT, 'DMF EVENT HORIZON — one director'), 1, 'runtime inlined exactly once');
  const order = ['signal-bus.js', 'event-horizon.js', 'relic.js', 'mixer-stage.js'].map((m) => BUILD.indexOf("inlineModule('" + m + "')"));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'bus → event horizon → relic → mixer');
  const at = ['window.DMFSignal = {', 'DMF EVENT HORIZON — one director', 'DMF RELIC RUNTIME'].map((m) => OUT.indexOf(m));
  assert.ok(at[0] > 0 && at[1] > at[0] && at[2] > at[1], 'generated order');
});

test('source and generated output stay synchronized', function () {
  for (const needle of ["d.classList.add(w?'eh-woken':'eh-wake')", '<div class="eh-field" aria-hidden="true">', '<div class="eh-signal" aria-hidden="true">',
    'class="eh-stack eh-stack--l"', '<g class="eh-logo-glow">', '<g class="eh-logo-solid">', 'class="eh-sheen"',
    '.eh-gate{', 'html.eh-wake .eh-signal', 'html.eh-calm .tier-card', "live=!!(hub&&hub.onFrame&&!hub.reduced&&!hub.saveData);"]) {
    assert.ok(SRC.includes(needle), 'source: ' + needle);
    assert.ok(OUT.includes(needle), 'public: ' + needle);
  }
  assert.ok(!SRC.includes('DMF EVENT HORIZON — one director'), 'the runtime lives in scripts/overdrive, not in the source page');
});

test('visibility gating: only visible blocks get variables; the intro pauses off-screen', function () {
  assert.ok(MOD.includes("new IntersectionObserver(") && MOD.includes('visible.splice(at, 1)'), 'IntersectionObserver-driven visible set');
  assert.ok(MOD.includes('el.style.removeProperty(SECTION_VARS[k])'), 'variables are removed when a block leaves');
  assert.ok(MOD.includes("el.classList.toggle('eh-off', !entries[i].isIntersecting)"));
  assert.ok(SRC.includes('.concert-intro.eh-off,.concert-intro.eh-off *'), 'CSS pauses the intro loops');
  assert.ok(MOD.includes('bus.stage.layout !== seenLayout'), 'markers re-measured on the bus layout counter, never per frame');
});

test('reduced motion and Save-Data: composed once, no choreography', function () {
  assert.ok(MOD.includes('var still = !!(hub.reduced || hub.saveData);'));
  assert.ok(MOD.includes('if (still || !hub.onFrame) { composeStill(); return; }'), 'no frame listener without the live clock');
  assert.ok(/prefers-reduced-motion:reduce\)\{\s*\.concert-beam,\.concert-particle,\.concert-fog/.test(SRC), 'intro loops stop under reduced motion');
  assert.ok(SRC.includes(".fly-card,.tips-img,.section-title,.acad-title{translate:none;scale:none}"), 'depth drift off under reduced motion');
  assert.ok(SRC.includes("matchMedia('(prefers-reduced-motion: reduce)').matches||sessionStorage.getItem('dmf_eh_woken')==='1'"), 'reduced motion starts awake');
  assert.ok(!/requestAnimationFrame/.test(SRC.slice(SRC.indexOf('// SMOKE'), SRC.indexOf('// Init'))), 'smoke has no fallback loop');
});

test('mobile safeguards: compact depth, no pointer field on touch, deliberate phone composition', function () {
  assert.ok(MOD.includes("var coarse = !!(mm && mm('(pointer: coarse)').matches);") && MOD.includes("if (compact) html.classList.add('eh-compact');"));
  assert.ok(MOD.includes('if (fine && !still)'), 'pointer field only on fine pointers');
  assert.ok(MOD.includes("if (e.pointerType && e.pointerType !== 'mouse') return;"));
  assert.ok(MOD.includes('tierK.depth * (compact ? 0.45 : 1)'), 'depth reduced on compact');
  assert.ok(SRC.includes('.eh-compact{--eh-z3:-6px;--eh-z4:4px}'));
  assert.ok(/@media\(max-width:700px\)\{\s*\.eh-stack\{width:64px/.test(SRC), 'phone monitors, not hidden desktop stacks');
  assert.ok(SRC.includes('.eh-compact .eh-field i:nth-child(n+5)'), 'fewer specks on phones');
});

test('hot paths allocate nothing per frame', function () {
  const HOT_ALLOC = /\bnew [A-Z]|\[\s*\]|\{\s*\}|\.map\(|\.filter\(|\.concat\(|\.slice\(|function\s*\(/;
  for (const [name, code] of [
    ['DMFEventHorizon.update', body(MOD, 'DMFEventHorizon.prototype.update = function (inp, dt)')],
    ['binding tick', body(MOD, 'function tick(s, dt, raw, bus)')],
    ['binding write', body(MOD, 'function write(force)')],
    ['binding put', body(MOD, 'function put(el, cache, i, name, v, q)')]
  ]) assert.ok(!HOT_ALLOC.test(code.slice(code.indexOf('{') + 1)), name + ' allocates per frame');
});

test('performance design: DOM writes are throttled and quantized; debug perf only twice a second', function () {
  assert.ok(MOD.includes('if (writeT >= 0.033 || st.transition > 0.01 || s.beatFired)'), '~30 Hz writes');
  assert.ok(MOD.includes('v = Math.round(v * q) / q;') && MOD.includes('if (cache[i] !== v)'), 'quantized, change-only');
  assert.ok(MOD.includes('if (perf && perfT > 0.5)'), 'perf surface at 2 Hz, debug only');
  assert.ok(!/console\.(log|info|debug)/.test(MOD), 'never logs');
  assert.ok(!/filter\s*:\s*blur|animation:[^;}]*blur/i.test(SRC.slice(SRC.indexOf('DMF EVENT HORIZON (scripts/overdrive/event-horizon.js)'))), 'no blur animation');
  assert.ok(!SRC.includes('logoPulse'), 'the infinite drop-shadow filter loop is gone');
});

test('the existing 3D systems read the director without new loops', function () {
  assert.ok(RELIC.includes('var eh = hub.eventHorizon;') && RELIC.includes('var ehQuiet = eh ? 1 - 0.45 * eh.calm : 1;'), 'Receiver reads calm');
  assert.ok(RELIC.includes('* 0.82 * ehQuiet;'), 'speakers heavier and quieter in calm sections');
  assert.ok(RELIC.includes('0.25 * ehFocus'), 'rim answers the Receiver section focus');
  assert.ok(RELIC.includes('(hub.eventHorizon ? 1 - 0.6 * hub.eventHorizon.calm : 1)'), 'portal steps back behind the offer');
  assert.ok(MIXER.includes('var eh = bus.eventHorizon;') && MIXER.includes('(1 + 0.04 * stage.dolly)'), 'mixer dolly a few percent');
  assert.equal(count(RELIC + MIXER, 'requestAnimationFrame'), 0);
});

test('conversion area: calmer and clearer, payment logic untouched', function () {
  assert.ok(EH.SECTIONS.some((s) => s[1] === 'offer' && s[3] === 1), 'offer is the calmest section');
  assert.ok(!/mercadopago|firebase|firestore|signer|checkout|payment|enroll|fetch\(|XMLHttpRequest|localStorage/i.test(MOD), 'no payments/auth/storage in the director');
  assert.ok(MOD.includes("html.classList.toggle('eh-calm', calmOn)"));
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(PKG.includes('node scripts/overdrive/test/event-horizon.test.cjs'));
  assert.ok(WORKFLOW.includes('node scripts/overdrive/test/event-horizon.test.cjs'));
  assert.ok(WORKFLOW.includes("grep -q 'DMF EVENT HORIZON' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
