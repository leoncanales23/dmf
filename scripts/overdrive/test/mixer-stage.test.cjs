'use strict';

// Pioneer DJM-900NXS2 slide (#tips): asset, integration and budget guarantees. Run after the build chain.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OUT = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const MIXER = fs.readFileSync(path.join(__dirname, '..', 'mixer-stage.js'), 'utf8');
const RELIC = fs.readFileSync(path.join(__dirname, '..', 'relic.js'), 'utf8');
const BUILD = fs.readFileSync(path.join(ROOT, 'scripts', 'build-3d.cjs'), 'utf8');
const GLB_PATH = path.join(ROOT, 'assets', 'models', 'pioneer-djm-900nxs2-mixer-slide.glb');
const MODEL_URL = 'assets/models/pioneer-djm-900nxs2-mixer-slide.glb';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
function count(hay, needle) { return hay.split(needle).length - 1; }
function tipsBlock(html) {
  const a = html.indexOf('<section id="tips"');
  return html.slice(a, html.indexOf('</section>', a));
}

test('the GLB exists, is glTF 2 binary, and is the documented build of the master STL', function () {
  const b = fs.readFileSync(GLB_PATH);
  assert.equal(b.toString('ascii', 0, 4), 'glTF');
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  const json = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString('utf8'));
  const prim = json.meshes[0].primitives[0];
  assert.ok(prim.attributes.POSITION !== undefined && prim.attributes.NORMAL !== undefined, 'positions and baked normals');
  const tris = json.accessors[prim.indices].count / 3;
  assert.ok(tris >= 20000 && tris <= 60000, 'slide LOD from the master, got ' + tris + ' triangles');
  // r128 does not display quantized positions; only normals may be quantized.
  assert.equal(json.accessors[prim.attributes.POSITION].componentType, 5126, 'float positions');
  const doc = fs.readFileSync(path.join(ROOT, 'assets', 'models', 'PIONEER_DJM_900NXS2_SLIDE.md'), 'utf8');
  const sha = crypto.createHash('sha256').update(b).digest('hex');
  assert.ok(doc.includes(sha), 'GLB SHA-256 documented');
  assert.ok(doc.includes('f8de22b178dff355d5108d695a5fd0db074671da218b1b39945297ba807c318f'), 'master STL SHA-256 documented');
  assert.ok(b.length < 1024 * 1024, 'stays under 1 MiB');
});

test('the Tips slide renders the 3D mixer instead of the 2D console photo (source and generated)', function () {
  for (const [name, html] of [['source', SRC], ['public', OUT]]) {
    const tips = tipsBlock(html);
    assert.ok(tips.includes('class="tips-img dmf-mixer"'), name + ': mixer host');
    assert.ok(tips.includes('class="dmf-mixer-stage"'), name + ': stage');
    assert.ok(tips.includes('class="dmf-mixer-fallback"'), name + ': fallback always in the DOM');
    assert.ok(!tips.includes('jpg_13_lookup.jpg'), name + ': the old console photo is gone');
    assert.ok(!/<img\b/.test(tips), name + ': no 2D stand-in');
  }
  assert.equal(count(OUT, 'DMF MIXER STAGE'), 1, 'mixer runtime inlined once');
  assert.ok(MIXER.includes("'" + MODEL_URL + "'"), 'loads the served asset path');
  const order = ['relic.js', 'mixer-stage.js'].map((m) => BUILD.indexOf("inlineModule('" + m + "')"));
  assert.ok(order[0] > 0 && order[1] > order[0], 'inlined after relic.js');
});

test('one Three.js: the mixer never loads Three.js or GLTFLoader itself', function () {
  assert.ok(!/createElement\(\s*['"]script['"]\s*\)/.test(MIXER), 'no script injection');
  assert.ok(!/cdnjs|jsdelivr|unpkg|three\.min\.js|three\.module|GLTFLoader\.js/.test(MIXER), 'no Three.js URL');
  assert.equal(count(OUT, 'three.js/r128/three.min.js'), 1, 'one Three.js r128 load in the page');
  assert.equal(count(OUT, 'examples/js/loaders/GLTFLoader.js'), 1, 'one GLTFLoader load in the page');
  assert.ok(MIXER.includes('window.THREE') && MIXER.includes('THREE.GLTFLoader'), 'uses the shared globals');
  assert.ok(RELIC.includes("announceThree('ready')") && RELIC.includes("announceThree('failed')"), 'relic announces the load');
  assert.ok(MIXER.includes("addEventListener('dmf:three'") && MIXER.includes('hub.three'), 'mixer waits on the announcement');
});

test('one clock: no own rAF loop, no timers, no AudioContext', function () {
  assert.equal(count(MIXER, 'requestAnimationFrame'), 0);
  assert.ok(!/setInterval\s*\(|setTimeout\s*\(/.test(MIXER), 'no timers');
  assert.ok(!/AudioContext\s*[(|]|webkitAudioContext|createAnalyser|createMediaElementSource/.test(MIXER), 'no audio graph');
  assert.ok(MIXER.includes('hub.onFrame(tick)'), 'driven by the DMF Signal Bus');
  assert.equal(count(MIXER, 'hub.onFrame('), 1, 'one listener');
  for (const key of ['forceLow', 'forceMid', 'forceHigh', 'forceKick', 's.energy', 's.beatFired']) {
    assert.ok(MIXER.includes(key), 'reacts to ' + key);
  }
});

test('lazy: loads near the viewport, renders only while visible and the tab is shown', function () {
  assert.ok(/new IntersectionObserver\([\s\S]*?near = true[\s\S]*?rootMargin: '600px 0px'/.test(MIXER), 'near-viewport load');
  assert.ok(/visible = entries\[i\]\.isIntersecting/.test(MIXER), 'visibility tracked');
  assert.ok(MIXER.includes('if (!visible || document.hidden) return;'), 'no invisible or hidden-tab frames');
  const start = MIXER.slice(MIXER.indexOf('function maybeStart'), MIXER.indexOf('function maybeStart') + 400);
  assert.ok(start.includes('!near'), 'nothing is created before the slide is near');
});

test('bounded reactivity and pointer (physical, not jelly)', function () {
  assert.ok(MIXER.includes('body.position.y = drive.lift * 0.009'), 'LOW lift ≤ 0.9%');
  assert.ok(MIXER.includes('1 + (drive.lift * 0.008 + Math.max(0, drive.punch) * 0.004)'), 'scale ≤ 1.2%');
  assert.ok(MIXER.includes('2 * 0.8 * Math.sqrt(k)'), 'kick spring is damped (ζ = 0.8)');
  assert.ok(MIXER.includes('var POINTER_MAX = 4 * Math.PI / 180;'), 'pointer parallax ±4°');
  assert.ok(MIXER.includes("matchMedia('(hover: hover) and (pointer: fine)')"), 'pointer only on a fine pointer');
  assert.ok(MIXER.includes('hub.pulse('), 'hover sends the existing Hyperdrive pulse');
  assert.ok(!/touchstart|touchmove/.test(MIXER), 'touch never depends on hover or drag');
});

test('reduced motion keeps the lit model and freezes motion; governor tiers are followed one way', function () {
  assert.ok(MIXER.includes('var staticMode = reduced || tier ==='), 'reduced motion → static render');
  assert.ok(MIXER.includes('if (staticMode) settle();'), 'lighting settled, no entrance');
  assert.ok(MIXER.includes('if (!staticMode) hub.onFrame(tick);'), 'no frame listener under reduced motion');
  assert.ok(MIXER.includes('if (!reduced && window.matchMedia'), 'no parallax under reduced motion');
  assert.ok(/prefers-reduced-motion:reduce\)\{[^}]*\.dmf-mixer-canvas/.test(SRC), 'CSS drops the sweep and fades');
  assert.ok(MIXER.includes('var nextTier = bus.qualityTier || tier;'), 'reads the governor tier');
  assert.ok(MIXER.includes("var DPR_CAP = { high: 1.75, balanced: 1.25, lite: 1, static: 1"), 'bounded DPR per tier');
  assert.ok(MIXER.includes("if (tier === 'lite')"), 'LITE halves the mixer cost');
  assert.ok(!/qualityTier\s*=[^=]/.test(MIXER), 'never writes the tier (no ping-pong)');
});

test('Save-Data, WebGL loss and asset failure degrade to the CSS fallback, never an empty box', function () {
  assert.ok(MIXER.includes("if (!stageEl || !hub || hub.saveData) { host.classList.add('is-fallback'); return; }"));
  assert.ok(MIXER.includes("addEventListener('webglcontextlost'"), 'context loss handled');
  assert.ok(MIXER.includes('}, undefined, fail);'), 'GLB load error handled');
  assert.ok(MIXER.includes('try { api = createScene(); } catch (e) { api = null; fail(); }'), 'renderer creation guarded');
  assert.ok(MIXER.includes("if (st === 'failed') { fail(); return; }"), 'Three.js load failure handled');
  assert.ok(SRC.includes('.dmf-mixer.is-live .dmf-mixer-canvas{opacity:1}'), 'canvas only shown after its first frame');
  assert.ok(SRC.includes('.dmf-mixer.is-fallback .dmf-mixer-canvas{display:none}'));
});

test('the one-time entrance does not loop', function () {
  assert.ok(/@keyframes dmfMixerSweep/.test(SRC) && /animation:dmfMixerSweep 1\.6s cubic-bezier\(\.4,0,\.2,1\) 1 forwards/.test(SRC), 'sweep runs once');
  assert.ok(!/infinite/.test(SRC.slice(SRC.indexOf('/* Tips slide: Pioneer'), SRC.indexOf('@keyframes dmfMixerSweep') + 200)), 'no infinite animation');
  assert.ok(MIXER.includes('if (!env.done) entrance(s, dt);'), 'entrance stops once done');
});

test('payments, auth and video signing are untouched by the mixer', function () {
  assert.ok(!/mercadopago|firebase|firestore|stream|signer|payment|enroll/i.test(MIXER));
  assert.ok(!/fetch\(|XMLHttpRequest|localStorage|document\.cookie/.test(MIXER), 'no network or storage beyond the GLB loader');
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
