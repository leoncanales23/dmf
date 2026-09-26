'use strict';

// EVENT HORIZON V3 — OVERDRIVE: deterministic simulations of the weight layer, plus structural guarantees
// on the runtime and the generated landing (run after the build chain).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { strict: assert } = require('assert');
const SO = require(path.join(__dirname, '..', 'stage-overdrive.js'));
const SN = require(path.join(__dirname, '..', 'spatial-narrative.js'));
const EH = require(path.join(__dirname, '..', 'event-horizon.js'));

const ROOT = path.join(__dirname, '..', '..', '..');
const DIR = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SRC = read('index.html');
const OUT = read('public/index.html');
const LAYER = fs.readFileSync(path.join(DIR, 'stage-overdrive.js'), 'utf8');
const MOD = fs.readFileSync(path.join(DIR, 'event-horizon.js'), 'utf8');
const BUS = fs.readFileSync(path.join(DIR, 'signal-bus.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(DIR, 'relic.js'), 'utf8');
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

const IDS = ['intro', 'hero', 'relic', 'bio', 'band', 'releases', 'sets', 'platforms', 'rider', 'academy', 'offer', 'lab', 'tips', 'contact'];
const TOPS = IDS.map((_, i) => i * 1000);
const CALMS = IDS.map((id) => (id === 'offer' ? 1 : id === 'lab' ? 0.6 : id === 'academy' ? 0.35 : id === 'contact' ? 0.3 : 0));
const VH = 900, DT = 1 / 60, DOC = 14500;
const L = SO.LIMITS;
function director() {
  const d = new EH.DMFEventHorizon();
  d.setMarkers(TOPS, IDS, IDS.map(() => 0.6), CALMS, DOC);
  return d;
}
function at(id, frac) { return TOPS[IDS.indexOf(id)] + 1000 * (frac == null ? 0.5 : frac) - VH * 0.45; }
function inp(o) {
  return Object.assign({ scrollY: 0, vh: VH, velocity: 0, s: {}, forces: {}, pointerX: 0, pointerY: 0, pointerActive: false,
    tier: 'high', compact: false, wakeT: -1, pre: 0, docProgress: 0 }, o);
}
function beat(i, every, kick) { return { energy: 0.85, kick: kick == null ? 1 : kick, low: 0.8, mid: 0.6, high: 0.6, beatFired: i % every === 0 }; }
const LOUD = { forceLow: 1, forceMid: 1, forceHigh: 1 };
function run(d, n, o) { let st; for (let i = 0; i < n; i++) st = d.update(inp(typeof o === 'function' ? o(i) : o), DT); return st; }

test('hard bounds hold under extreme input across the whole page', function () {
  const d = director();
  for (let i = 0; i < 3000; i++) {
    const st = d.update(inp({ scrollY: i * 5, velocity: (i % 80) < 40 ? 5 : -5, s: beat(i, 5), forces: LOUD,
      pointerX: (i % 60) / 30 - 1, pointerY: -1, pointerActive: true, docProgress: i / 3000, pre: 1 }), DT);
    assert.ok(Math.abs(st.modelYaw) <= L.modelYaw + 1e-9 && Math.abs(st.modelPitch) <= L.modelPitch + 1e-9, 'rotation');
    assert.ok(st.modelMass >= L.modelMassMin - 1e-9 && st.modelMass <= L.modelMassMax + 1e-9, 'mass');
    assert.ok(st.modelNear >= 0 && st.modelNear <= L.modelNear + 1e-9, 'near');
    assert.ok(st.woofer >= 0 && st.woofer <= 0.04 + 1e-9, 'woofer ≤ 4%: ' + st.woofer);
    assert.ok(Math.abs(st.bodyLag) <= L.bodyLag + 1e-9, 'body lag');
    assert.ok(st.zk >= 0.05 && st.zk <= 1 && st.compress >= 0 && st.compress <= 1, 'depth');
    assert.ok(st.lightX >= -0.1 && st.lightX <= 1.1, 'light');
    assert.ok(Math.abs(st.camPan) <= SN.LIMITS.pan + 1e-9 && Math.abs(st.dolly) <= SN.LIMITS.dolly + 1e-9, 'V2 camera limits still hold');
  }
});

test('model: monumental entry once, with a small overshoot that settles', function () {
  const d = director();
  run(d, 120, { scrollY: at('hero') });
  assert.equal(d.state.modelMass, 1, 'at rest before the Receiver arrives');
  let min = 9, max = 0, st;
  for (let i = 0; i < 240; i++) { st = d.update(inp({ scrollY: at('relic') }), DT); min = Math.min(min, st.modelMass); max = Math.max(max, st.modelMass); }
  assert.ok(min <= L.modelMassMin + 0.005, 'arrives with mass (starts small)');
  assert.ok(max > 1.002 && max <= L.modelMassMax, 'small overshoot: ' + max);
  assert.ok(Math.abs(st.modelMass - 1) < 0.002, 'settled: ' + st.modelMass);
  // Leaving and coming back does not replay the entry.
  run(d, 120, { scrollY: at('bio') });
  const again = run(d, 30, { scrollY: at('relic') });
  assert.ok(again.modelMass > 0.995, 'entry is once');
});

test('model: approach depth, micro rotation from pointer and scroll, camera push from LOW/KICK, light from HIGH', function () {
  const near = run(director(), 300, { scrollY: at('relic') });
  assert.ok(near.modelNear > L.modelNear * 0.8, 'closer when the Receiver section is in focus');
  const far = run(director(), 300, { scrollY: at('releases') });
  assert.ok(far.modelNear < 0.002, 'no approach elsewhere');
  const rot = run(director(), 200, { scrollY: at('relic'), pointerX: 1, pointerActive: true, velocity: 0.8 });
  assert.ok(rot.modelYaw > L.modelYaw * 0.8, 'pointer + scroll turn it');
  const idle = run(director(), 200, { scrollY: at('relic'), pointerX: 1, pointerActive: false });
  assert.ok(Math.abs(idle.modelYaw) < 1e-6, 'no fine pointer, no pointer rotation');
  const d = director();
  let push = 0, spec = 0;
  for (let i = 0; i < 240; i++) { const st = d.update(inp({ scrollY: at('relic'), s: beat(i, 30), forces: LOUD }), DT); push = Math.max(push, st.modelPush); spec = Math.max(spec, st.modelSpec); }
  assert.ok(push > 0.3 && push <= 1, 'camera push');
  assert.ok(spec > 0.3, 'HIGH lights it');
  assert.ok(RELIC.includes('modelRef.rotation.x = ehv ? ehv.modelPitch || 0 : 0;') && RELIC.includes('+ ehPush * 0.12'), 'Receiver applies it');
});

test('acoustic pressure: LOW is sustained, KICK is an impulse; fast attack, heavy release, never a vibration', function () {
  const d = director();
  // LOW only (no beats): sustained excursion.
  let st = Object.assign({}, run(d, 120, { scrollY: at('bio'), s: { energy: 0.8 }, forces: { forceLow: 1 } }));
  assert.ok(st.wooferLow > 0.6 && st.wooferKick < 0.01, 'LOW holds the cone out');
  const attack = run(director(), 12, { scrollY: at('bio'), s: { energy: 0.8 }, forces: { forceLow: 1 } }).wooferLow;
  assert.ok(attack > 0.35, 'fast attack (200 ms): ' + attack);
  st = run(d, 18, { scrollY: at('bio') });
  assert.ok(st.wooferLow > 0.2, 'heavy release (300 ms later still out): ' + st.wooferLow);
  // KICK only: impulse, back to rest, one soft settle.
  const k = director();
  run(k, 10, { scrollY: at('bio') });
  let peak = 0, settleMin = 0;
  for (let i = 0; i < 90; i++) {
    st = k.update(inp({ scrollY: at('bio'), s: { energy: 0.8, kick: 1, beatFired: i === 0 } }), DT);
    peak = Math.max(peak, st.wooferKick);
    settleMin = Math.min(settleMin, st.cabinet);
  }
  assert.ok(peak > 0.5, 'kick impulse reads: ' + peak);
  assert.ok(st.wooferKick < 0.005 && Math.abs(st.cabinet) < 0.02, 'back at rest after 1.5 s');
  assert.ok(settleMin > -0.4, 'settle is a soft return, not a bounce');
  // Silence: nothing moves.
  const q = run(director(), 400, { scrollY: at('bio') });
  assert.ok(q.woofer < 1e-4 && Math.abs(q.cabinet) < 1e-3, 'no permanent vibration');
  assert.ok(SRC.includes('.eh-cone--lf{width:78%;aspect-ratio:1;transform:scale(calc(1 + var(--eh-woofer,0)))}'), 'page cones use the bounded excursion');
});

test('figure: minimal breath, head bounds, body inertia, phones at 35–40%, still when static', function () {
  const d = director();
  let bmax = 0;
  for (let i = 0; i < 600; i++) bmax = Math.max(bmax, Math.abs(d.update(inp({ scrollY: at('relic') }), DT).breath));
  assert.ok(bmax > 0.5 && bmax <= 1, 'breath present and bounded');
  assert.ok(RELIC.includes('+ 0.0012 * ehBreath'), 'breath is a minimal torso term');
  const c = director();
  let cmax = 0;
  for (let i = 0; i < 600; i++) cmax = Math.max(cmax, Math.abs(c.update(inp({ scrollY: at('relic'), compact: true }), DT).breath));
  assert.ok(cmax <= 0.4 && cmax >= 0.3, 'phones 35–40%: ' + cmax);
  assert.ok(SN.COMPACT_HEAD >= 0.35 && SN.COMPACT_HEAD <= 0.4, 'head on phones 35–40%');
  const h = run(director(), 400, { scrollY: at('relic'), pointerX: 1, pointerY: 1, pointerActive: true, s: beat(0, 1), forces: LOUD });
  assert.ok(Math.abs(h.headYaw) <= SN.LIMITS.headYaw + 1e-9 && Math.abs(h.headPitch) <= SN.LIMITS.headPitch + 1e-9, 'head bounds');
  assert.ok(Math.abs(h.bodyLag) > 0.005 && Math.abs(h.bodyLag) <= Math.abs(h.headYaw) + 1e-6, 'the body follows the head, behind it');
  const s = director();
  run(s, 60, { scrollY: at('relic'), tier: 'static' });
  assert.equal(s.state.breath, 0, 'STATIC: no breath');
});

test('reflection field: trails the camera, reads more across hero → releases → sets, quiet in the offer', function () {
  const d = director();
  run(d, 300, { scrollY: at('releases') });
  assert.ok(d.state.sheenK >= 1.3, 'releases reads more');
  run(d, 300, { scrollY: at('sets') });
  assert.ok(d.state.sheenK >= 1.25, 'sets reads more');
  run(d, 400, { scrollY: at('offer') });
  assert.ok(d.state.sheenK <= 0.55, 'offer: quieter reflections');
  // A step in scroll velocity moves the light with a delay, never a jump.
  const e = director();
  run(e, 120, { scrollY: at('bio') });
  const before = e.state.lightX;
  const one = e.update(inp({ scrollY: at('bio'), velocity: 0.8 }), DT).lightX;
  assert.ok(Math.abs(one - before) < 0.01, 'physical delay behind the camera');
  const later = run(e, 90, { scrollY: at('bio'), velocity: 0.8 }).lightX;
  assert.ok(later - before > 0.04, 'but it does follow');
  assert.ok(SRC.includes('* var(--eh-sheenk,1));transform:translate3d(calc((var(--eh-lx,.5)'), 'CSS reads the section factor');
});

test('section transitions: depth compresses into each boundary and opens after it', function () {
  const d = director();
  const mid = Object.assign({}, run(d, 200, { scrollY: at('bio', 0.5) }));
  const edge = Object.assign({}, run(d, 200, { scrollY: at('bio', 0.97) }));
  assert.ok(edge.compress > 0.5 && mid.compress < 0.05, 'compression at the boundary only');
  assert.ok(edge.zk < mid.zk, 'depth authority drops through the transition');
});

test('one hero event: after wake, intro/hero only, first strong kick, ≤ 420 ms, once per session', function () {
  assert.ok(SN.MOMENT_DUR <= 0.42, 'duration');
  const d = director();
  let fires = 0, active = 0;
  for (let i = 0; i < 600; i++) {
    const st = d.update(inp({ scrollY: 0, s: beat(i, 12), forces: LOUD }), DT);
    if (d.narrative.heroFiredNow) fires++;
    if (st.heroMoment > 0) active++;
  }
  assert.equal(fires, 1);
  assert.ok(active * DT <= 0.42 + 0.02, 'lasts ' + active * DT);
  assert.ok(MOD.includes("var HERO_KEY = 'dmf_eh_moment';") && MOD.includes('root.sessionStorage.setItem(HERO_KEY'), 'once per session');
  const w = director();
  run(w, 120, (i) => ({ scrollY: 0, wakeT: 0.4, s: beat(i, 12) }));
  assert.equal(w.narrative.heroFired, false, 'never before wake');
  assert.ok(!/#fff\b|#ffffff|255,\s*255,\s*255/i.test(LAYER), 'no white anywhere in the layer');
});

test('offer sanctuary: ~28% response, near-neutral camera, still background, legible cards, gentle CTA', function () {
  const busy = run(director(), 600, (i) => ({ scrollY: at('sets'), s: beat(i, 20), forces: LOUD }));
  const off = run(director(), 600, (i) => ({ scrollY: at('offer'), s: beat(i, 20), forces: LOUD, pointerX: 1, pointerActive: true }));
  assert.ok(off.low <= busy.low * 0.33 && off.woofer <= busy.woofer * 0.4, 'audio response ~25–30%');
  assert.ok(Math.abs(off.camPan) < 0.02 && Math.abs(off.camTilt) < 0.02 && Math.abs(off.modelYaw) < L.modelYaw * 0.25, 'camera near neutral');
  assert.ok(off.zk < busy.zk * 0.5 && off.compress < 0.01, 'less depth, no transition compression');
  assert.ok(MOD.includes('var frozen = st.calm > 0.85;'), 'background frozen');
  assert.ok(SRC.includes('if(eh&&eh.calm>0.85) return;'), 'smoke holds still');
  assert.ok(MOD.includes("st.performanceTier === 'lite' ? 0 : 1 - 0.85 * st.calm"), 'CTA lean almost off');
  assert.ok(SRC.includes('html.eh-calm .tier-card{background-color:rgba(10,8,6,.9)}'), 'cards fully legible');
});

test('reduced motion, Save-Data and mobile degradation', function () {
  const d = director();
  run(d, 200, (i) => ({ scrollY: at('relic'), s: beat(i, 10), forces: LOUD, pointerX: 1, pointerActive: true }));
  const st = d.compose(IDS.indexOf('relic'));
  for (const k of ['modelNear', 'modelYaw', 'modelPitch', 'modelPush', 'modelSpec', 'wooferLow', 'wooferKick', 'woofer', 'cabinet', 'floorPress', 'breath', 'bodyLag', 'compress'])
    assert.equal(st[k], 0, k);
  assert.equal(st.modelMass, 1);
  assert.ok(MOD.includes('var still = !!(hub.reduced || hub.saveData);') && MOD.includes('if (still || !hub.onFrame) { composeStill(); return; }'));
  const wide = run(director(), 300, { scrollY: at('relic'), pointerX: 1, pointerActive: true, velocity: 0.8 });
  const comp = run(director(), 300, { scrollY: at('relic'), pointerX: 1, pointerActive: true, velocity: 0.8, compact: true });
  assert.ok(Math.abs(comp.modelYaw) <= Math.abs(wide.modelYaw) * 0.45, 'phones: less rotation');
  assert.ok(comp.modelNear <= wide.modelNear * 0.55, 'phones: less approach depth');
});

test('no additional loops, audio graph, WebGL, Three.js or GLTFLoader', function () {
  assert.equal(count(LAYER, 'requestAnimationFrame'), 0);
  assert.ok(!/setInterval\s*\(|setTimeout\s*\(/.test(LAYER), 'no timers');
  assert.ok(!/AudioContext|createAnalyser|WebGL|THREE|GLTFLoader|document|window\./.test(LAYER.slice(LAYER.indexOf("'use strict';"), LAYER.indexOf('var api = {'))), 'pure layer');
  assert.equal(count(BUS, 'requestAnimationFrame(frame)'), 2, 'the Signal Bus is the one persistent loop');
  assert.equal(count(SRC, 'requestAnimationFrame'), 1, 'page: one-shot scroll rAF only');
  assert.equal(count(OUT, 'actx = new AC()'), 1);
  assert.equal(count(OUT, 'createAnalyser()'), 1);
  assert.equal(count(OUT, 'new THREE.WebGLRenderer('), 2);
  assert.equal(count(OUT, 'three.js/r128/three.min.js'), 1);
  assert.equal(count(OUT, 'examples/js/loaders/GLTFLoader.js'), 1);
});

test('no allocations in the hot path', function () {
  const HOT_ALLOC = /\bnew [A-Z]|\[\s*\]|\{\s*\}|\.map\(|\.filter\(|\.concat\(|\.slice\(|function\s*\(/;
  for (const [name, code] of [
    ['DMFStageOverdrive.update', body(LAYER, 'DMFStageOverdrive.prototype.update = function (st, inp, ids, dt)')],
    ['DMFMass.step', body(LAYER, 'DMFMass.prototype.step = function (target, dt)')],
    ['relic applyReceiverTransform', body(RELIC, 'function applyReceiverTransform()')],
    ['director update', body(MOD, 'DMFEventHorizon.prototype.update = function (inp, dt)')],
    ['binding write', body(MOD, 'function write(force)')]
  ]) assert.ok(!HOT_ALLOC.test(code.slice(code.indexOf('{') + 1)), name + ' allocates per frame');
});

test('source and generated output stay synchronized; runtime inlined once, in order', function () {
  assert.equal(count(OUT, 'DMF STAGE OVERDRIVE — pure mapping layer'), 1);
  const order = ['spatial-narrative.js', 'stage-overdrive.js', 'event-horizon.js', 'relic.js'].map((m) => BUILD.indexOf("inlineModule('" + m + "')"));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'narrative → overdrive → director → relic');
  for (const needle of ['var(--eh-woofer,0)', 'var(--eh-settle,0) * 1.2px', 'var(--eh-floorp,0) * .42', 'var(--eh-sheenk,1)', 'if(eh&&eh.calm>0.85) return;'])
    assert.ok(SRC.includes(needle) && OUT.includes(needle), needle);
  assert.ok(MOD.includes('perf.stageOverdrive = {') && !MOD.includes('perf.overdrive ='), 'debug perf surface (does not clobber the engine perf.overdrive)');
});

test('mobile menu overlay is not clipped by the bar (backdrop-filter containing block)', function () {
  for (const html of [SRC, OUT]) {
    assert.ok(html.includes('.nav.nav-open{backdrop-filter:none;-webkit-backdrop-filter:none}'), 'bar drops its filter while open');
    assert.ok(html.includes("document.querySelector('.nav').classList.toggle('nav-open', open);"), 'toggle keeps the bar in sync');
    assert.ok(html.includes("document.querySelector('.nav').classList.remove('nav-open');"), 'a link closes both');
  }
});

test('frozen paths untouched', function () {
  const FROZEN = ['workers', 'firestore.rules', 'firebase.json', 'firebase.academy.json', 'public/login.html', 'public/payment-result.html',
    'public/academy.html', 'public/academy-config.js', 'server.js', 'functions', 'assets'];
  let base = null;
  try { base = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { base = null; }
  if (base) {
    const changed = execSync('git diff --name-only ' + base + ' -- ' + FROZEN.join(' '), { cwd: ROOT }).toString().trim();
    assert.equal(changed, '', 'frozen paths changed: ' + changed);
  }
  assert.ok(!/mercadopago|firebase|firestore|signer|checkout|payment|enroll|fetch\(|XMLHttpRequest|localStorage/i.test(LAYER));
});

test('registered in npm run test:hyperdrive and in CI', function () {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/overdrive.test.cjs'));
  const wf = read('.github/workflows/validate-3d.yml');
  assert.ok(wf.includes('node scripts/overdrive/test/overdrive.test.cjs'));
  assert.ok(wf.includes("grep -q 'DMF STAGE OVERDRIVE' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
