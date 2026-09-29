'use strict';

// PR88 HYPERRESONANCE — the normalized audio signal, the idle/armed/live/overdrive states (with the existing
// machine's hysteresis), bounded responses, reduced motion / Save-Data / tier scaling, one clock, the Receiver's
// consumers, the dev-only HUD, the build output, and payments untouched.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const R = require(path.join(ROOT, 'scripts/overdrive/hyperresonance.js'));
const O = require(path.join(ROOT, 'scripts/overdrive/engine.js'));
const MOD = read('scripts/overdrive/hyperresonance.js');
const RELIC = read('scripts/overdrive/relic.js');
const BUILD = read('scripts/build-3d.cjs');
const OUT = read('public/index.html');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
let seed = 7;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
const DT = 1 / 60;
function sig(over) { return Object.assign({ source: 'clock', low: 0.5, mid: 0.5, high: 0.5, energy: 0.5, transient: 0.2, beatFired: false, beatIndex: 0 }, over || {}); }
function fresh(opts) { const r = new R.DMFResonance(); r.configure(Object.assign({ tier: 'high' }, opts || {})); return r; }

test('signal: the requested fields, normalized to 0..1, source audio|clock', () => {
  const r = fresh();
  const o = r.update(sig({ source: 'audio', low: 1.7, mid: -0.2, high: 0.4, energy: 2, transient: 0.9 }), 'TRANSMITTING', 0, DT);
  for (const k of ['bass', 'mids', 'treble', 'beat', 'energy', 'transient', 'smoothedEnergy']) {
    assert.ok(typeof o[k] === 'number' && o[k] >= 0 && o[k] <= 1, k + ' in [0, 1]');
  }
  assert.equal(o.bass, 1); assert.equal(o.mids, 0); assert.equal(o.treble, 0.4); assert.equal(o.source, 'audio');
  assert.equal(r.update(sig(), 'TRANSMITTING', 0, DT).source, 'clock', 'no analyser → the idle clock');
});

test('audio unavailable: missing / NaN / undefined input never throws and stays finite', () => {
  const r = fresh();
  const inputs = [undefined, null, {}, { low: NaN, mid: undefined, high: 'x', energy: Infinity, transient: -Infinity }, sig({ energy: NaN })];
  for (const s of inputs) {
    const o = r.update(s, undefined, NaN, DT);
    for (const k of R.RESPONSE_KEYS.concat(['bass', 'mids', 'treble', 'energy', 'smoothedEnergy', 'beat'])) assert.ok(Number.isFinite(o[k]), k + ' finite');
  }
  assert.doesNotThrow(() => r.update(sig(), 'NOT_A_STATE', 0, 0));
  assert.equal(r.update(sig(), 'NOT_A_STATE', 0, DT).state, 'idle');
});

test('smoothedEnergy follows slowly (no spike rides through)', () => {
  const r = fresh();
  for (let i = 0; i < 120; i++) r.update(sig({ energy: 0.2 }), 'AWAKENED', 0, DT);
  const before = r.out.smoothedEnergy;
  r.update(sig({ energy: 1 }), 'AWAKENED', 0, DT);
  assert.ok(r.out.smoothedEnergy - before < 0.03, 'one spike frame barely moves it');
  for (let i = 0; i < 180; i++) r.update(sig({ energy: 1 }), 'AWAKENED', 0, DT);
  assert.ok(r.out.smoothedEnergy > 0.9, 'sustained energy gets there');
});

test('beat: a short one-shot impulse, never a continuous oscillation', () => {
  const r = fresh();
  r.update(sig({ beatFired: true, beatIndex: 4 }), 'TRANSMITTING', 0, DT);
  assert.equal(r.out.beat, 1);
  let prev = 1;
  for (let i = 0; i < 40; i++) {
    r.update(sig(), 'TRANSMITTING', 0, DT);
    assert.ok(r.out.beat <= prev, 'only decays between beats');
    prev = r.out.beat;
  }
  assert.ok(r.out.beat < 0.01, 'gone well before the next beat (~0.67 s)');
  const q = fresh();
  for (let i = 0; i < 300; i++) q.update(sig({ low: 1, energy: 1 }), 'OVERDRIVE', 1, DT);
  assert.equal(q.out.beat + q.out.impulse + q.out.camPush + q.out.scalePulse + q.out.receiverPulse + q.out.camImpulse, 0, 'no beat → no beat motion, however loud');
});

test('states: DORMANT/AWAKENED/TRANSMITTING/OVERDRIVE → idle/armed/live/overdrive', () => {
  const r = fresh();
  assert.deepEqual(['DORMANT', 'AWAKENED', 'TRANSMITTING', 'OVERDRIVE'].map((s) => r.update(sig(), s, 0, DT).state), ['idle', 'armed', 'live', 'overdrive']);
});

test('overdrive hysteresis (the real DMFStateMachine): spikes never enter, sustained energy does, dips never leave', () => {
  const m = new O.DMFStateMachine();
  const r = fresh();
  const step = (e, d) => { const st = m.update({ energy: e, dropEnergy: d }, DT, { active: true }); return r.update(sig({ energy: e }), st, m.overdriveMix, DT).state; };
  for (let i = 0; i < 600; i++) {                 // 10 s of isolated spikes: 1 hot frame in every 20
    const st = step(i % 20 === 0 ? 1 : 0.5, i % 20 === 0 ? 1 : 0.5);
    assert.notEqual(st, 'overdrive', 'a spike at frame ' + i + ' must not enter overdrive');
  }
  let entered = -1;
  for (let i = 0; i < 180 && entered < 0; i++) if (step(0.9, 0.9) === 'overdrive') entered = i;
  assert.ok(entered * DT > 1.0, 'enters only after sustained energy (' + (entered * DT).toFixed(2) + ' s)');
  for (let i = 0; i < 40; i++) assert.equal(step(0.3, 0.3), 'overdrive', 'a short dip (< 0.9 s) keeps it');
  step(0.9, 0.9);
  let left = -1;
  for (let i = 0; i < 180 && left < 0; i++) if (step(0.2, 0.2) !== 'overdrive') left = i;
  assert.ok(left * DT > 0.8, 'released only after sustained calm');
  // Energy levels have their own bands: armed enters above 0.3, leaves below 0.22.
  const m2 = new O.DMFStateMachine();
  m2.update({ energy: 0.35, dropEnergy: 0 }, DT, {});
  assert.equal(r.update(sig(), m2.update({ energy: 0.25, dropEnergy: 0 }, DT, {}), 0, DT).state, 'armed', 'inside the band it holds');
});

test('responses: bounded 0..1 under fuzz, restrained at rest (≤ idle gain)', () => {
  for (const tier of ['high', 'balanced', 'lite']) {
    const r = fresh({ tier });
    for (let i = 0; i < 20000; i++) {
      const st = ['DORMANT', 'AWAKENED', 'TRANSMITTING', 'OVERDRIVE'][Math.floor(rnd() * 4)];
      const o = r.update(sig({ low: rnd() * 1.5, mid: rnd() * 1.5, high: rnd() * 1.5, energy: rnd(), transient: rnd(), beatFired: rnd() < 0.05 }), st, rnd(), DT * (0.5 + rnd()));
      for (const k of R.RESPONSE_KEYS) assert.ok(o[k] >= 0 && o[k] <= 1, tier + ' ' + k + ' = ' + o[k]);
    }
  }
  const idle = fresh();
  for (let i = 0; i < 60; i++) idle.update(sig({ low: 1, mid: 1, high: 1, energy: 1, transient: 1, beatFired: i % 30 === 0 }), 'DORMANT', 0, DT);
  for (const k of R.RESPONSE_KEYS) if (k !== 'impulse') assert.ok(idle.out[k] <= R.STATE_GAIN[0] + 1e-9, 'idle ' + k + ' restrained');
  assert.equal(idle.out.light + idle.out.emissive + idle.out.stageAmp + idle.out.receiverPulse + idle.out.camImpulse, 0, 'overdrive terms are 0 outside overdrive');
});

test('reduced motion reduces intensity: no motion at all, light capped low', () => {
  const full = fresh();
  const calm = fresh({ reducedMotion: true });
  for (let i = 0; i < 90; i++) {
    const s = sig({ low: 1, mid: 1, high: 1, energy: 1, transient: 1, beatFired: i % 20 === 0 });
    full.update(s, 'OVERDRIVE', 1, DT);
    calm.update(s, 'OVERDRIVE', 1, DT);
  }
  for (const k of R.MOTION_KEYS) assert.equal(calm.out[k], 0, k + ' is 0 under reduced motion');
  for (const k of R.LIGHT_KEYS) {
    assert.ok(calm.out[k] <= R.REDUCED_LIGHT_CAP, k + ' capped');
    assert.ok(calm.out[k] <= full.out[k], k + ' never above the full version');
  }
  assert.ok(full.out.light > calm.out.light, 'measurably reduced');
});

test('Save-Data disables the reactive layer entirely', () => {
  const r = fresh({ saveData: true });
  const o = r.update(sig({ low: 1, energy: 1, beatFired: true }), 'OVERDRIVE', 1, DT);
  assert.equal(o.enabled, false);
  assert.equal(o.source, 'off');
  for (const k of R.RESPONSE_KEYS.concat(['bass', 'mids', 'treble', 'energy', 'beat'])) assert.equal(o[k], 0, k);
  // In the page the bus never starts its clock with Save-Data, and the Receiver shows its still (PR87).
  assert.ok(MOD.includes('if (hub.reduced || hub.saveData || !hub.onFrame) return;'));
});

test('quality tiers scale the response; static is still', () => {
  const peak = (tier) => { const r = fresh({ tier }); let s = 0; for (let i = 0; i < 60; i++) { const o = r.update(sig({ low: 1, mid: 1, energy: 1, beatFired: i === 0 }), 'OVERDRIVE', 1, DT); if (i === 0) s = o.cone + o.light + o.head; } return s; };
  const h = peak('high'), b = peak('balanced'), l = peak('lite'), st = peak('static');
  assert.ok(h > b && b > l && l > 0, 'high > balanced > lite (' + [h, b, l].map((v) => v.toFixed(2)) + ')');
  assert.equal(st, 0, 'static tier');
});

test('hidden tab: pause resets the envelopes; nothing moves while paused', () => {
  const r = fresh();
  for (let i = 0; i < 30; i++) r.update(sig({ energy: 1, beatFired: i === 29 }), 'OVERDRIVE', 1, DT);
  r.pause();
  assert.equal(r.out.beat + r.out.smoothedEnergy + r.out.cone + r.out.light, 0, 'reset');
  r.update(sig({ energy: 1, beatFired: true }), 'OVERDRIVE', 1, DT);
  assert.equal(r.out.beat, 0, 'paused: no update');
  r.resume();
  r.update(sig({ energy: 1, beatFired: true }), 'OVERDRIVE', 1, 5);
  assert.ok(r.out.smoothedEnergy < 0.2, 'a long gap after return is clamped (dt ≤ 0.1 s)');
});

test('one clock: no loop, timer or per-frame allocation in the layer; stepped from the bus', () => {
  const code = MOD.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/requestAnimationFrame|setTimeout|setInterval/.test(code), 'no loop or timer of its own');
  assert.equal((MOD.match(/hub\.onFrame\(/g) || []).length, 2, 'the bus frame (and the dev HUD) only');
  const decl = code.indexOf('DMFResonance.prototype.update');
  const body = code.slice(code.indexOf('{', decl) + 1, code.indexOf('var api ='));
  assert.ok(!/function\s*\(|new\s|=\s*\{|=\s*\[/.test(body), 'update allocates nothing');
  const n = (t) => t.split('requestAnimationFrame(').length - 1;
  assert.equal(n(OUT), n(read('index.html')) + n(read('scripts/overdrive/signal-bus.js')) + n(RELIC) + n(read('scripts/overdrive/mixer-stage.js')),
    'every rAF in the page is one that already existed: no new loop');
  assert.ok(!OUT.slice(OUT.indexOf('DMF HYPERRESONANCE'), OUT.indexOf('DMF SPATIAL NARRATIVE')).includes('requestAnimationFrame('), 'the inlined layer adds no rAF');
});

test('visibility: the binding pauses on a hidden tab', () => {
  assert.ok(MOD.includes("doc.addEventListener('visibilitychange', function () { if (doc.hidden) res.pause(); else res.resume(); });"));
});

test('Receiver consumers: the gaps only, each bounded', () => {
  const pins = [
    'if (rz && auto) { r -= 0.035 * rz.camPush * fit; az += 0.004 * rz.camImpulse * (rz.beatIndex % 2 ? 1 : -1); }',
    'if (rzp) modelRef.scale.multiplyScalar(1 + 0.006 * rzp.scalePulse + 0.008 * rzp.receiverPulse);',
    'if (hub.resonance) punch *= 1 + 0.25 * hub.resonance.cone * hub.resonance.overdriveMix;',
    'rimLight.intensity += 0.45 * rzl.light;', 'haloLight.intensity += 0.3 * rzl.light;', 'accentLight.intensity += 0.3 * rzl.glint;',
    '* (1 + 0.2 * (rzm ? rzm.reflect : 0));', '0.02 * (rzm ? rzm.emissive : 0);',
    '+ 0.0015 * (hub.resonance ? hub.resonance.torso : 0) + 0.0012 * ehBreath',
    '(1 + 0.3 * (hub.resonance ? hub.resonance.stageAmp : 0));',
    "if (scanQ !== shownScan) { shownScan = scanQ; band.style.setProperty('--dmf-res-scan', scanQ); }"
  ];
  for (const p of pins) assert.ok(RELIC.includes(p), 'missing: ' + p);
  assert.ok(BUILD.includes('.dmf-signal-scan,.dmf-signal-scan2{filter:brightness(calc(1 + var(--dmf-res-scan,0) * 1.6))}'));
  assert.ok(!/#[0-9a-f]{6}/i.test(MOD.replace(/rgba\(255,91,30,\.35\)|#f2ede6/g, '')), 'no new colours: the rig is already #ff5b1e');
});

test('debug HUD: dev-only via ?dmf-audio-debug=1, textContent only', () => {
  assert.ok(MOD.includes("if (!/[?&]dmf-audio-debug=1(&|$)/.test(root.location ? root.location.search : '')) return;"));
  assert.ok(MOD.indexOf('dmf-audio-debug=1') < MOD.indexOf('function mountDebug'), 'gated before anything is created');
  assert.ok(!/innerHTML/.test(MOD), 'never innerHTML');
  for (const f of ['bass', 'mid', 'treble', 'energy', 'beat', 'tier', 'fps']) assert.ok(new RegExp("'" + f + '\\s').test(MOD), 'shows ' + f);
});

test('build: public/index.html carries the same runtime, after the bus and before its consumers', () => {
  assert.ok(OUT.includes(MOD.trim()), 'the module is inlined verbatim');
  assert.ok(BUILD.includes("inlineModule('signal-bus.js'),\n  inlineModule('hyperresonance.js'),"), 'build order');
  assert.ok(read('scripts/dev-hyperdrive.cjs').includes("'scripts/overdrive/signal-bus.js',\n    'scripts/overdrive/hyperresonance.js',"), 'dev server watches it');
  const i = OUT.indexOf('DMF SIGNAL BUS'), j = OUT.indexOf('DMF HYPERRESONANCE'), k = OUT.indexOf('DMF RELIC RUNTIME');
  assert.ok(i < j && j < k);
});

test('payments, Auth, Firestore, Academy, Klap, Mercado Pago and Workers untouched', () => {
  let base = null;
  base = require('./visual-base.cjs')(ROOT);   // null unless this branch changes a visual layer module
  if (base) {
    const frozen = ['workers', 'firestore.rules', 'firebase.json', '.firebaserc', 'public/login.html', 'public/payment-result.html', 'public/academy.html',
      'public/academy-config.js', 'public/commerce', 'server.js', 'functions', 'assets'];
    assert.equal(execSync('git diff --name-only ' + base + ' -- ' + frozen.join(' '), { cwd: ROOT }).toString().trim(), '', 'frozen paths changed');
  }
  assert.ok(!/payment|checkout|klap|mercadopago|firebase|firestore|fetch\(|auth/i.test(MOD), 'the layer knows nothing about commerce or identity');
});

test('registered in npm run test:hyperdrive and in CI', () => {
  assert.ok(read('package.json').includes('node scripts/overdrive/test/hyperresonance.test.cjs'));
  const wf = read('.github/workflows/validate-3d.yml');
  assert.ok(wf.includes('node scripts/overdrive/test/hyperresonance.test.cjs') && wf.includes("grep -q 'DMF HYPERRESONANCE' public/index.html"));
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
