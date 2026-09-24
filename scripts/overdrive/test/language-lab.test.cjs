'use strict';

// DMF V4.1 — language semantics, DMF Lab conversion scene, stage-aware governor, WebKit stage safety.
// Structural checks run on the source and the generated page (after the build chain); the language
// helpers and the governor are exercised as pure functions.
const fs = require('fs');
const path = require('path');
const { strict: assert } = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OUT = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const RELIC = fs.readFileSync(path.join(__dirname, '..', 'relic.js'), 'utf8');
const BUS = fs.readFileSync(path.join(__dirname, '..', 'signal-bus.js'), 'utf8');
const BUILD = fs.readFileSync(path.join(ROOT, 'scripts', 'build-3d.cjs'), 'utf8');
const INJECTORS = ['inject-codex.cjs', 'inject-oracle.cjs', 'inject-transmission.cjs', 'inject-training-state.cjs']
  .map((f) => [f, fs.readFileSync(path.join(ROOT, 'scripts', f), 'utf8')]);
const E = require(path.join(__dirname, '..', 'engine.js'));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); passed++; }
  catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); failed++; }
}
function count(hay, needle) { return hay.split(needle).length - 1; }
function fnFrom(src, name) {
  const m = src.match(new RegExp('function ' + name + '\\(([^)]*)\\)\\{([^\\n]*)\\}'));
  assert.ok(m, 'missing ' + name);
  return new Function(m[1], m[2]); // eslint-disable-line no-new-func
}
function dictFrom(src) {
  const a = src.indexOf('  var dict = {');
  const b = src.indexOf('\n  };', a);
  assert.ok(a > 0 && b > a, 'dictionary not found');
  return new Function(src.slice(a, b + 5).replace('var dict =', 'return') )(); // eslint-disable-line no-new-func
}
const DICT = dictFrom(SRC);

// === Language ===
test('Spanish is the default; only es/en are accepted; the browser language is never the authority', function () {
  const resolveLang = fnFrom(SRC, 'resolveLang');
  assert.equal(resolveLang(null), 'es');
  assert.equal(resolveLang(undefined), 'es');
  assert.equal(resolveLang('fr'), 'es');
  assert.equal(resolveLang('EN'), 'es', 'only the exact stored value en switches');
  assert.equal(resolveLang('es'), 'es');
  assert.equal(resolveLang('en'), 'en');
  assert.ok(/<html lang="es">/.test(SRC), 'html defaults to es');
  assert.ok(SRC.includes("var l='es';try{var s=localStorage.getItem('dmf_lang');if(s==='en'||s==='es')l=s;}catch(e){}document.documentElement.lang=l;"),
    'head sets <html lang> from dmf_lang before first paint');
  assert.ok(!/navigator\.languages?/.test(SRC), 'navigator.language is not used');
});

test('the button shows the language on screen (ES = Spanish page, EN = English page)', function () {
  const langLabel = fnFrom(SRC, 'langLabel');
  assert.equal(langLabel('es'), 'ES');
  assert.equal(langLabel('en'), 'EN');
  assert.ok(SRC.includes('btn.textContent = langLabel(lang);'));
  for (const [name, src] of [['index.html', SRC], ['public/index.html', OUT]]) {
    assert.ok(!/lang\s*===?\s*'en'\s*\?\s*'ES'\s*:\s*'EN'/.test(src), name + ' still has the inverted label');
  }
});

test('toggle flips es ⇄ en, persists dmf_lang and keeps <html lang> in sync', function () {
  assert.ok(SRC.includes("lang = lang === 'es' ? 'en' : 'es';"));
  assert.ok(SRC.includes("localStorage.setItem('dmf_lang', lang)"));
  assert.ok(!/localStorage\.setItem\('dmf_lang',\s*(?!\s|lang\))/.test(SRC), 'dmf_lang only ever stores the current lang');
  const apply = SRC.slice(SRC.indexOf('function applyLang(){'), SRC.indexOf('window.toggleLang'));
  assert.ok(apply.includes('document.documentElement.lang = lang;'));
  assert.ok(apply.indexOf('document.documentElement.lang = lang;') < apply.indexOf('btn.textContent = langLabel(lang);'),
    '<html lang> is set before the button text (components observe the button)');
  assert.ok(/renderReleases\(\);\s*renderLabels\(\);\s*renderSets\(\);\s*renderPlatforms\(\);\s*applyLang\(\);\s*\}\)\(\);/.test(SRC), 'applyLang runs at start');
});

test('every language-aware component reads <html lang>, none infers it from the button text', function () {
  const INVERSE = /textContent[^;]*toUpperCase\(\)\s*===?\s*'EN'/;
  for (const [name, src] of INJECTORS.concat([['relic.js', RELIC]])) {
    assert.ok(!INVERSE.test(src), name + ' infers the language from the button');
    assert.ok(/document\.documentElement\.lang/.test(src), name + ' does not read <html lang>');
  }
  assert.ok(!INVERSE.test(OUT), 'generated page still infers the language from the button');
});

test('ES and EN dictionaries match key for key and cover every data-i18n key', function () {
  const en = Object.keys(DICT.en), es = Object.keys(DICT.es);
  assert.deepEqual(en.slice().sort(), es.slice().sort());
  const used = new Set();
  for (const m of SRC.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) used.add(m[1]);
  for (const k of used) {
    assert.ok(k in DICT.en, 'missing en.' + k);
    assert.ok(k in DICT.es, 'missing es.' + k);
  }
});

test('Spanish is Spanish: no English editorial copy in the es dictionary (names, brands and gear aside)', function () {
  // Keys that are legitimately the same in both languages: names, brands, prices, musical terms.
  const SAME_OK = new Set(['navBio', 'navSets', 'navRider', 'navAcademy', 'navDemos', 'setsTitle', 'riderDjHead', 'riderLiveHead',
    'acadKicker', 'proofName1', 'proofName2', 'proofName3', 'proofStat1Num', 'proofStat2Num', 'proofStat3Num', 'tierStarterName',
    'tierStarterPrice', 'tierProName', 'tierProPrice', 'tierEliteName', 'tierElitePrice', 'demosTitle', 'tipsImgStat2', 'contactTitle']);
  for (const k of Object.keys(DICT.en)) {
    if (DICT.en[k] === DICT.es[k]) assert.ok(SAME_OK.has(k), 'es.' + k + ' is still the English text: ' + String(DICT.en[k]).slice(0, 60));
  }
  const PROPER = /The Martinez Brothers|Student Access|DMF Academy|Live Act|Beatport|SoundCloud|Ableton/g;
  const EN_WORDS = /(^|[^a-záéíóúñ])(the|and|your|with|you|our|learn|from|this|that|are)([^a-záéíóúñ]|$)/i;
  for (const [k, v] of Object.entries(DICT.es)) {
    const text = String(v).replace(/<[^>]+>/g, ' ').replace(PROPER, ' ');
    assert.ok(!EN_WORDS.test(text), 'es.' + k + ' reads as English: ' + text.slice(0, 80));
  }
  const EN_ONLY = /(^|[^a-záéíóúñ])(el|los|las|para|tu|con|música|módulo|aquí)([^a-záéíóúñ]|$)/i;
  for (const [k, v] of Object.entries(DICT.en)) {
    const text = String(v).replace(/<[^>]+>/g, ' ').replace(/Club La Feria|Festival Nómade|DJ Pierre|Cadenza|Circus/g, ' ');
    assert.ok(!EN_ONLY.test(text), 'en.' + k + ' reads as Spanish: ' + text.slice(0, 80));
  }
});

// === DMF Lab ===
function labSection(src) {
  const a = src.indexOf('<section id="demos"');
  assert.ok(a > 0, 'DMF Lab section missing');
  return src.slice(a, src.indexOf('</section>', a));
}

test('DMF Lab is no longer a video library: no <video>, no course MP4s, no renderDemos', function () {
  for (const [name, src] of [['index.html', SRC], ['public/index.html', OUT]]) {
    const lab = labSection(src);
    assert.ok(!/<video/i.test(lab), name + ': DMF Lab still has a <video>');
    assert.ok(!/assets\/videos\/[^"']*\.mp4/.test(src), name + ': course MP4s still referenced on the landing');
    assert.ok(!/renderDemos|demosEn|demosEs|lab-card/.test(src), name + ': the old video grid is still there');
  }
});

test('DMF Lab converges on Student Access: /login primary, #academy secondary, both translated', function () {
  const lab = labSection(SRC);
  assert.ok(/<a href="\/login" class="lab-gate" id="labGate"><span data-i18n="labCta">/.test(lab), 'primary CTA → /login');
  assert.ok(/<a href="#academy" class="lab-plans" data-i18n="labPlans">/.test(lab), 'secondary CTA → #academy');
  assert.equal(DICT.es.labCta, 'ENTRAR A STUDENT ACCESS');
  assert.equal(DICT.en.labCta, 'ENTER STUDENT ACCESS');
  assert.equal(DICT.es.labPlans, 'VER PLANES DE ACADEMY');
  assert.equal(DICT.en.labPlans, 'VIEW ACADEMY PLANS');
  assert.equal(DICT.es.labHeadline, 'Aquí no vienes a mirar clases. Vienes a terminar música.');
  assert.equal(DICT.es.labSub, 'Las sesiones completas, el método de Demian y el progreso módulo a módulo viven dentro de DMF Academy.');
  assert.equal(DICT.es.labMicro, 'Crea tu cuenta. Elige tu acceso. Continúa donde quedaste.');
  for (const k of ['labKicker', 'labHeadline', 'labSub', 'labMicro', 'labLocked', 'labChannel', 'labFact1', 'labFact2', 'labFact3', 'labFact4']) {
    assert.ok(lab.includes('data-i18n="' + k + '"'), k + ' not in the scene');
    assert.notEqual(DICT.es[k], DICT.en[k], k + ' is not translated');
  }
  assert.ok(lab.includes('class="lab-lock-visual" aria-hidden="true"'), 'the signal-lock visual is decorative');
  assert.ok(labSection(OUT).includes('href="/login" class="lab-gate"'), 'generated page carries the gate');
});

test('the gate arrives once, never loops, and is still under reduced motion', function () {
  const flat = SRC.replace(/\n/g, '');
  assert.ok(flat.includes('.dmf-choreo #demos.is-in .lab-gate,.is-stage-arrive .lab-gate{animation:dmfGateArrive'), 'one-shot arrival');
  assert.ok(!/lab-[a-z-]*\{[^}]*infinite/.test(flat), 'no looping lab animation');
  assert.ok(/prefers-reduced-motion:reduce\)\{\s*\.lab-gate,\.lab-gate::before,\.lab-gate-arrow\{transition:none!important;animation:none!important\}/.test(flat), 'reduced motion stills the gate');
  assert.ok(!/#fff(?:fff)?\b|255,\s*255,\s*255/i.test(labSection(SRC)), 'no pure white');
});

test('V4.1 adds no loops: gate pulse is event-driven, rate limited and off without the live clock', function () {
  const gate = SRC.slice(SRC.indexOf('// 4. DMF Lab gate'), SRC.indexOf('// 5. Hero depth'));
  assert.ok(gate.length > 50);
  assert.ok(!/requestAnimationFrame|setInterval|setTimeout/.test(gate), 'gate block schedules nothing');
  assert.ok(gate.includes("gate.addEventListener('mouseenter'") && gate.includes('(hover: hover) and (pointer: fine)'));
  assert.equal(count(SRC, 'setInterval('), 1, 'only the pre-existing learning-loop interval');
  assert.equal(count(SRC, 'requestAnimationFrame'), 2, 'only the existing one-shot scroll rAF and smoke fallback');
  const pulse = BUS.slice(BUS.indexOf('pulse: function (originDocY)'), BUS.indexOf('attachAudio: attachAudio'));
  assert.ok(pulse.includes('if (!hub.running || now - lastPulse < 1500) return false;'), 'pulse is gated and rate limited');
  assert.ok(pulse.includes('emitWave(0.5, false, originDocY)'), 'pulse stays below HYPERDRIVE/SINGULARITY strength');
});

// === WebKit stage safety ===
test('stage mask: standard + -webkit- masks, clip-path fallback, V3 band when neither exists', function () {
  assert.ok(RELIC.includes("if (CS.supports('mask-image', g)) return 'mask';"));
  assert.ok(RELIC.includes("if (CS.supports('-webkit-mask-image', g)) return 'webkit-mask';"));
  assert.ok(/CS\.supports\('clip-path', 'inset\(1px 0px 1px 0px\)'\) \|\| CS\.supports\('-webkit-clip-path'/.test(RELIC));
  assert.ok(RELIC.includes("&& maskMode !== 'none';"), 'no mask support → no stage (V3 band layout)');
  assert.ok(RELIC.includes("stageLayer.className = 'dmf-stage-layer dmf-stage-' + maskMode;"));
  assert.ok(BUILD.includes('-webkit-mask-image:linear-gradient(') && BUILD.includes(';mask-image:linear-gradient('), 'both mask properties');
  assert.ok(BUILD.includes('.dmf-stage-layer.dmf-stage-clip{-webkit-mask-image:none;mask-image:none;-webkit-clip-path:inset('), 'clip fallback');
  assert.ok(BUILD.includes('.dmf-stage-layer{inset:0 0 auto 0;height:100vh;height:100lvh}'), 'large-viewport layer: toolbars never resize the canvas');
  assert.ok(RELIC.includes('if (touch && staged && nw === lastResizeW) return;'), 'height-only (toolbar) resizes are ignored on touch');
  assert.ok(OUT.includes('dmf-stage-clip'), 'generated page carries the fallback');
});

// === Stage-aware frame-budget governor ===
function run(g, seq) {
  const events = [];
  for (const [fps, seconds] of seq) {
    for (let i = 0; i < Math.round(fps * seconds); i++) {
      const r = g.sample(1 / fps);
      if (r) events.push(r);
    }
  }
  return events;
}

test('governor: stage budget is stricter than the band (40 fps downgrades on stage only)', function () {
  assert.deepEqual(run(new E.DMFPerformanceGovernor('high', { mode: 'stage' }), [[40, 20]]), ['balanced']);
  assert.deepEqual(run(new E.DMFPerformanceGovernor('high', { mode: 'band' }), [[40, 20]]), []);
});

test('governor: isolated spikes never downgrade', function () {
  const g = new E.DMFPerformanceGovernor('high', { mode: 'stage' });
  const events = [];
  for (let i = 0; i < 60 * 40; i++) {
    const r = g.sample(i % 60 === 0 ? 0.2 : 1 / 60);   // one 200 ms hitch every second
    if (r) events.push(r);
  }
  assert.deepEqual(events, []);
});

test('governor: one way only — no ping-pong under alternating load, LITE is the floor', function () {
  const g = new E.DMFPerformanceGovernor('high', { mode: 'stage' });
  const seq = [];
  for (let i = 0; i < 20; i++) seq.push([i % 2 ? 60 : 20, 6]);
  const events = run(g, seq);
  assert.deepEqual(events, ['balanced', 'lite']);
  assert.equal(g.tier, 'lite');
  assert.deepEqual(run(g, [[10, 30]]), [], 'nothing below LITE');
});

test('governor: a hidden tab never costs quality (gaps reset, pause() grants a grace window)', function () {
  const g = new E.DMFPerformanceGovernor('high', { mode: 'stage' });
  run(g, [[60, 6]]);
  assert.equal(g.sample(8), null, 'an 8 s background gap is ignored');
  g.pause();
  assert.deepEqual(run(g, [[20, 3], [60, 12]]), [], 'the first window after returning is grace');
  assert.equal(g.tier, 'high');
});

test('governor: sustained pressure needs consecutive windows; deterministic', function () {
  const a = run(new E.DMFPerformanceGovernor('high', { mode: 'stage' }), [[30, 3], [30, 3], [60, 3], [30, 3], [60, 3]]);
  assert.deepEqual(a, [], 'non-consecutive pressure windows do not downgrade');
  const seq = [[60, 3], [25, 12], [60, 10]];
  assert.deepEqual(run(new E.DMFPerformanceGovernor('high', { mode: 'stage' }), seq), run(new E.DMFPerformanceGovernor('high', { mode: 'stage' }), seq));
});

test('governor: wired to the stage, paused on hidden tabs, telemetry debug-only, no performance.memory', function () {
  assert.ok(RELIC.includes("governor.setMode(on ? 'stage' : 'band');"));
  assert.ok(RELIC.includes("document.addEventListener('visibilitychange', function () { if (document.hidden) governor.pause(); });"));
  assert.ok(/if \(perf\) \{[\s\S]{0,400}perf\.frameBudgetMs = governor\.budget\(\);/.test(RELIC), 'governor telemetry only on the debug surface');
  for (const src of [RELIC, BUS, SRC]) assert.ok(!/performance\.memory/.test(src));
});

test('generated page is in sync with the source for V4.1', function () {
  for (const needle of ['function resolveLang(stored)', 'function langLabel(l)', '<section id="demos" class="section lab-portal">',
    '// 4. DMF Lab gate', 'labCta:\'ENTRAR A STUDENT ACCESS\'', 'dmfGateArrive']) {
    assert.ok(SRC.includes(needle), 'source missing ' + needle);
    assert.ok(OUT.includes(needle), 'public/index.html missing ' + needle + ' — run the build chain');
  }
});

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed');
if (failed > 0) process.exit(1);
