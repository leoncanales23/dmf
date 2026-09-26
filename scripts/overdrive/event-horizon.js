/* DMF EVENT HORIZON — one director for the landing's audiovisual world.
 * It owns no loop, no audio graph and no renderer. It listens to the DMF Signal Bus clock (hub.onFrame),
 * folds scroll, section, audio, pointer, visibility and the governor tier into one stage state
 * (hub.eventHorizon), and hands that state to the systems that already exist: CSS on the visible blocks,
 * the Receiver (relic.js), the Pioneer stage (mixer-stage.js) and the ambient smoke.
 *
 * The core (DMFEventHorizon) is pure, deterministic ES5 with no DOM, so tests can require it. The browser
 * binding at the bottom only runs in a page. Inlined into public/index.html by scripts/build-3d.cjs after
 * signal-bus.js and before relic.js. */
(function (root) {
  'use strict';

  // V2 Spatial Narrative: a pure mapping layer the director steps with its own state (no clock of its own).
  var SN = typeof module === 'object' && module.exports ? require('./spatial-narrative.js') : root.DMFSpatialNarrative;
  // V3 Overdrive: the weight layer, stepped after the narrative on the same state (no clock of its own).
  var SO = typeof module === 'object' && module.exports ? require('./stage-overdrive.js') : root.DMFStageOverdrive;
  // V4 Black Sun: the cinematic layer, stepped after the overdrive on the same state (no clock of its own).
  var BS = typeof module === 'object' && module.exports ? require('./black-sun.js') : root.DMFBlackSun;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  // Frame-rate independent approach toward a target; `rate` is 1/s.
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  // Separate attack/release rates: fast in, slow out — an envelope, never a constant maximum.
  function envelope(cur, target, attack, release, dt) { return approach(cur, target, target > cur ? attack : release, dt); }

  // The sections of the stage, top to bottom: selector, id, ambient light (field density) and calm
  // (1 = conversion area: the spectacle steps back so the offer reads first).
  var SECTIONS = [
    ['#concertIntro', 'intro', 1.0, 0],
    ['header.hero', 'hero', 0.9, 0],
    ['#relic', 'relic', 0.8, 0],
    ['#bio', 'bio', 0.55, 0],
    ['.band', 'band', 0.7, 0],
    ['#releases', 'releases', 0.5, 0],
    ['#sets', 'sets', 0.55, 0],
    ['#platforms', 'platforms', 0.45, 0],
    ['#rider', 'rider', 0.5, 0],
    ['#academy', 'academy', 0.5, 0.35],
    ['#tiersGrid', 'offer', 0.3, 1],
    ['#demos', 'lab', 0.5, 0.6],
    ['#tips', 'tips', 0.6, 0],
    ['#contact', 'contact', 0.45, 0.3]
  ];

  // Tier contract. HIGH: everything. BALANCED: no pointer field on the field layer, half the ambient.
  // LITE: noncritical updates at half rate. STATIC: one composed frame.
  var TIERS = {
    high: { rate: 1, ambient: 1, depth: 1, gates: true },
    balanced: { rate: 1, ambient: 0.6, depth: 0.7, gates: true },
    lite: { rate: 2, ambient: 0.35, depth: 0.45, gates: false },
    static: { rate: 0, ambient: 0.35, depth: 0, gates: false }
  };
  function tierOf(qualityTier, compact) {
    if (qualityTier === 'high' || qualityTier === 'balanced' || qualityTier === 'lite' || qualityTier === 'static') return qualityTier;
    return compact ? 'balanced' : 'high';
  }

  var NONE = {};            // shared stand-in for a missing signal/forces record (never allocated per frame)
  var GATE_DUR = 0.62;      // a signal gate is almost subliminal
  var GATE_GAP = 1.2;       // and never more often than this
  var WAKE_DUR = 2.2;       // the stage finishes powering on at ~2.2 s
  var FOCUS_LINE = 0.45;    // where in the viewport a section counts as "arrived"

  function DMFEventHorizon() {
    this.tops = [];
    this.ids = [];
    this.lights = [];
    this.calms = [];
    this.docH = 1;
    this.measured = false;
    // The published state. Numbers only (plus the section id and tier), written in place every frame.
    this.state = {
      section: 'intro', index: 0, progress: 0,
      velocity: 0, speed: 0, energy: 0, tension: 0, depth: 0, focus: 1,
      transition: 0, gate: 0, gateId: 0, calm: 0, light: 1, wake: 0,
      low: 0, mid: 0, high: 0, kick: 0,
      pointerX: 0, pointerY: 0,
      performanceTier: 'high', compact: false, running: false,
      // V2 Spatial Narrative (written by DMFSpatialNarrative.update)
      camPan: 0, camTilt: 0, camRoll: 0, dolly: 0, zk: 0.5, pressure: 0,
      headYaw: 0, headPitch: 0, gravityX: 0, gravityY: 0, lightX: 0.5,
      afterimage: 0, afterId: 0, afterFrom: 0, heroMoment: 0, prevIndex: 0,
      // V3 Overdrive (written by DMFStageOverdrive.update)
      modelMass: 1, modelNear: 0, modelYaw: 0, modelPitch: 0, modelPush: 0, modelSpec: 0,
      wooferLow: 0, wooferKick: 0, woofer: 0, cabinet: 0, floorPress: 0,
      breath: 0, bodyLag: 0, sheenK: 1, compress: 0,
      // V4 Black Sun (written by DMFBlackSun.update)
      blackSun: 0, iris: 0, gravity: 0, sunScale: 0, halo: 0, impact: 0, stageLift: 0, reflectionShock: 0,
      beam: 0, hold: 0, open: 0, vignette: 0, shadowDepth: 0, titlePressure: 0, chromatic: 0,
      receiverGlow: 0, torsoLag: 0, silence: 0, reveal: 1, revealEdge: 1, revealLight: 1, revealType: 1
    };
    this.narrative = SN ? new SN.DMFSpatialNarrative() : null;
    this.overdrive = SO && this.narrative ? new SO.DMFStageOverdrive() : null;
    this.blackSun = BS && this.overdrive ? new BS.DMFBlackSun() : null;
    this._depthV = 0;
    this._gateT = 9;
    this._sinceGate = 9;
    this._t = 0;
  }

  DMFEventHorizon.prototype.setMarkers = function (tops, ids, lights, calms, docH) {
    this.tops = tops; this.ids = ids; this.lights = lights; this.calms = calms;
    this.docH = docH || 1;
    this.measured = tops.length > 0;
  };

  // Index of the last section whose top is above the focus line.
  DMFEventHorizon.prototype.sectionAt = function (y) {
    var t = this.tops, idx = 0;
    for (var i = 0; i < t.length; i++) { if (t[i] <= y) idx = i; else break; }
    return idx;
  };

  // inp: { scrollY, vh, velocity (-1..1, already inertial), s (bus signal), forces, pointerX, pointerY,
  //        tier, compact, wakeT (s since the page woke, or -1 when already awake), pre (0..1 anticipation) }
  DMFEventHorizon.prototype.update = function (inp, dt) {
    var st = this.state;
    if (!(dt > 0)) dt = 0.016;
    this._t += dt;
    var s = inp.s || NONE;
    var f = inp.forces || NONE;
    st.performanceTier = inp.tier;
    st.compact = !!inp.compact;

    // WAKE — the stage powers on once; a returning visitor starts awake.
    st.wake = inp.wakeT < 0 ? 1 : smooth01(inp.wakeT / WAKE_DUR);

    // SECTION / PROGRESS / FOCUS
    var line = inp.scrollY + inp.vh * FOCUS_LINE;
    var idx = this.measured ? this.sectionAt(line) : 0;
    if (this.measured) {
      var top = this.tops[idx];
      var next = idx + 1 < this.tops.length ? this.tops[idx + 1] : this.docH;
      st.progress = clamp01((line - top) / Math.max(1, next - top));
    }
    var edge = Math.min(st.progress, 1 - st.progress);
    st.focus = approach(st.focus, smooth01(edge / 0.16), 5, dt);

    // SIGNAL GATE — crossing into the next section fires one short, rate-limited envelope.
    this._sinceGate += dt;
    if (idx !== st.index) {
      var wasMeasured = st.running;
      st.prevIndex = st.index;     // the section being left (either scroll direction)
      st.index = idx;
      st.section = this.ids[idx] || 'intro';
      if (wasMeasured && this._sinceGate >= GATE_GAP && TIERS[inp.tier].gates && (this.calms[idx] || 0) < 0.9) {
        this._gateT = 0;
        this._sinceGate = 0;
        st.gateId++;
      }
    }
    st.running = this.measured;
    if (this._gateT < GATE_DUR) {
      this._gateT += dt;
      var g = clamp01(this._gateT / GATE_DUR);
      st.gate = g;                                   // sweep position 0..1
      st.transition = Math.sin(Math.PI * g) * (1 - 0.35 * g);
    } else {
      st.gate = 0;
      st.transition = approach(st.transition, 0, 12, dt);
    }

    // SCROLL VELOCITY — already inertial on the bus; clamp hard, it is a feeling, not a force.
    st.velocity = clamp(inp.velocity || 0, -0.8, 0.8);
    st.speed = approach(st.speed, Math.abs(st.velocity), 6, dt);

    // CALM + LIGHT — the conversion area pulls everything down; the field follows the section's light.
    st.calm = approach(st.calm, this.calms[idx] || 0, 2.5, dt);
    st.light = approach(st.light, this.lights[idx] == null ? 1 : this.lights[idx], 1.5, dt);
    // Conversion sanctuary: in the offer the stage keeps only ~28% of its audio response.
    var damp = st.wake * (1 - 0.72 * st.calm);

    // AUDIO — ENERGY is an envelope; LOW/MID/HIGH arrive from the bus force matrix (already physical).
    st.energy = envelope(st.energy, clamp01(s.energy || 0) * damp, 3, 0.8, dt);
    st.low = envelope(st.low, clamp01(f.forceLow != null ? f.forceLow : (s.low || 0)) * damp, 8, 2.5, dt);
    st.mid = envelope(st.mid, clamp01(f.forceMid != null ? f.forceMid : (s.mid || 0)) * damp, 5, 1.8, dt);
    st.high = envelope(st.high, clamp01(f.forceHigh != null ? f.forceHigh : (s.high || 0)) * damp, 14, 4, dt);
    st.kick = envelope(st.kick, (s.beatFired ? clamp01(0.4 + 0.6 * (s.kick || 0)) : 0) * damp, 40, 7, dt);

    // DEPTH — mass on a damped spring (ζ≈0.85): a kick compresses the stage, then it settles. Never bounces.
    if (s.beatFired) this._depthV += 2.2 * clamp01(0.35 + 0.65 * (s.kick || 0)) * damp;
    var k = 90, c = 2 * 0.85 * Math.sqrt(k);
    var rest = 0.25 * st.low;
    this._depthV += (-k * (st.depth - rest) - c * this._depthV) * dt;
    st.depth = clamp(st.depth + this._depthV * dt, -0.25, 1);

    // TENSION — scroll inertia plus anticipation before a predicted drop.
    st.tension = approach(st.tension, clamp01(0.7 * st.speed / 0.8 + 0.3 * clamp01(inp.pre || 0)) * (1 - 0.5 * st.calm), 4, dt);

    // POINTER — damped, never a direct follow.
    st.pointerX = approach(st.pointerX, clamp(inp.pointerX || 0, -1, 1), 5, dt);
    st.pointerY = approach(st.pointerY, clamp(inp.pointerY || 0, -1, 1), 5, dt);
    if (this.narrative) this.narrative.update(st, inp, this.ids, dt);
    if (this.overdrive) this.overdrive.update(st, inp, this.ids, dt);
    if (this.blackSun) this.blackSun.update(st, inp, this.ids, dt);
    return st;
  };

  // A composed, motionless state (reduced motion, Save-Data, STATIC tier): awake, calm-aware, no energy.
  DMFEventHorizon.prototype.compose = function (idx) {
    var st = this.state;
    st.index = idx || 0;
    st.section = this.ids[st.index] || 'intro';
    st.wake = 1; st.energy = 0; st.low = 0; st.mid = 0; st.high = 0; st.kick = 0;
    st.depth = 0; st.tension = 0; st.transition = 0; st.gate = 0; st.velocity = 0; st.speed = 0; st.focus = 1;
    st.calm = this.calms[st.index] || 0;
    st.light = this.lights[st.index] == null ? 1 : this.lights[st.index];
    if (this.narrative) this.narrative.compose(st);
    if (this.overdrive) this.overdrive.compose(st);
    if (this.blackSun) this.blackSun.compose(st);
    return st;
  };

  var api = {
    SECTIONS: SECTIONS,
    TIERS: TIERS,
    GATE_DUR: GATE_DUR,
    GATE_GAP: GATE_GAP,
    WAKE_DUR: WAKE_DUR,
    tierOf: tierOf,
    DMFEventHorizon: DMFEventHorizon
  };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  root.DMFEventHorizonCore = api;

  // ======================================================================================================
  // BROWSER BINDING — runs only in the page.
  // ======================================================================================================
  var doc = root.document;
  if (!doc) return;

  // Blocks that receive per-section variables while visible (never the whole document).
  var MAGNETS = '.hero-cta, .hero-cta-2, .tier-cta, .lab-gate, .tips-cta, .acad-cta, .acad-cta-free, .dmf-signal-cta, .nav-logo';
  var SECTION_VARS = ['--eh-focus', '--eh-rel', '--eh-split', '--eh-energy', '--eh-mid', '--eh-high', '--eh-speed', '--eh-vel', '--eh-lx',
    '--eh-pan', '--eh-tilt', '--eh-dolly', '--eh-zk', '--eh-sheenk', '--eh-tp', '--eh-chroma', '--eh-reveal'];
  function freshCache(n) { var c = []; for (var i = 0; i < n; i++) c.push(-9); return c; }

  function mount() {
    var hub = root.DMFSignal;
    if (!hub || hub.eventHorizon) return;
    var html = doc.documentElement;
    var eh = new DMFEventHorizon();
    var st = eh.state;
    hub.eventHorizon = st;

    var mm = root.matchMedia;
    var coarse = !!(mm && mm('(pointer: coarse)').matches);
    var fine = !!(mm && mm('(hover: hover) and (pointer: fine)').matches);
    var compact = (root.innerWidth || 1024) < 768 || coarse;
    st.compact = compact;
    if (compact) html.classList.add('eh-compact');
    // No live clock (reduced motion or Save-Data): the stage is composed once and stays still.
    var still = !!(hub.reduced || hub.saveData);
    // The head script decided eh-wake / eh-woken before first paint; wake time counts from there.
    var wakeAt = typeof root.__dmfWakeAt === 'number' ? root.__dmfWakeAt : (root.performance ? performance.now() : 0);
    var awake = still || !html.classList.contains('eh-wake');

    // --- markers (document tops), measured with the bus's own layout counter, never per frame ---
    var secEls = [], seenLayout = -1;
    function measure() {
      var tops = [], ids = [], lights = [], calms = [];
      var y = root.pageYOffset || 0;
      secEls.length = 0;
      for (var i = 0; i < SECTIONS.length; i++) {
        var el = doc.querySelector(SECTIONS[i][0]);
        if (!el) continue;
        var top = el.getBoundingClientRect().top + y;
        if (tops.length && top < tops[tops.length - 1]) continue;
        tops.push(top); ids.push(SECTIONS[i][1]); lights.push(SECTIONS[i][2]); calms.push(SECTIONS[i][3]);
        secEls.push(el);
        el.__ehIdx = secEls.length - 1;
      }
      eh.setMarkers(tops, ids, lights, calms, doc.documentElement.scrollHeight);
      // REFLECTION CONTINUITY: each framed surface learns where it sits across the viewport, so the one
      // light source (--eh-lx) lands on it at the right place — the band continues from frame to frame.
      var vw = root.innerWidth || 1;
      var sheens = doc.querySelectorAll('.eh-sheen');
      for (var q = 0; q < sheens.length; q++) {
        var host = sheens[q].parentNode.getBoundingClientRect();
        sheens[q].style.setProperty('--eh-l', (Math.round(host.left / vw * 1000) / 1000).toString());
        sheens[q].style.setProperty('--eh-w', (Math.max(0.05, Math.round(host.width / vw * 1000) / 1000)).toString());
      }
      for (var j = 0; j < secEls.length; j++) if (!secEls[j].__ehSeen) { secEls[j].__ehSeen = true; if (io) io.observe(secEls[j]); }
    }

    // --- visibility: only visible sections receive variables; the intro pauses its loops off-screen ---
    var visible = [];
    var io = 'IntersectionObserver' in root ? new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var el = entries[i].target;
        var at = visible.indexOf(el);
        el.__ehTop = entries[i].boundingClientRect.top + (root.pageYOffset || 0);
        el.__ehH = entries[i].boundingClientRect.height || 1;
        if (entries[i].isIntersecting) {
          if (at < 0) { visible.push(el); el.__ehVals = el.__ehVals || freshCache(SECTION_VARS.length); }
        } else if (at >= 0) {
          visible.splice(at, 1);
          for (var k = 0; k < SECTION_VARS.length; k++) el.style.removeProperty(SECTION_VARS[k]);
          if (el.__ehVals) for (var m = 0; m < el.__ehVals.length; m++) el.__ehVals[m] = -9;
        }
        if (el.id === 'concertIntro') el.classList.toggle('eh-off', !entries[i].isIntersecting);
      }
    }, { rootMargin: '10% 0px' }) : null;

    // Decorative layers that live in the source markup.
    var field = doc.querySelector('.eh-field');
    var intro = doc.getElementById('concertIntro');
    var fieldVals = freshCache(17);
    // Intro variables go to the few elements that read them (never the intro, whose subtree holds the SVG).
    var introEls = doc.querySelectorAll('#concertIntro .eh-stack, #concertIntro .eh-floor, #concertIntro .eh-halo');
    for (var ie = 0; ie < introEls.length; ie++) introEls[ie].__ehVals = freshCache(11);
    // The logo only hears the hero moment and pointer gravity (both rare), never the per-frame audio.
    var logoWrap = doc.querySelector('#concertIntro .concert-logo-wrap');
    var logoVals = freshCache(3);
    // AFTERIMAGE: one shared transient layer, reused; max one active.
    var afterEl = doc.querySelector('.eh-after');
    var afterVals = freshCache(1), seenAfter = 0, afterOn = false;
    // HERO MOMENT: once per visit.
    var HERO_KEY = 'dmf_eh_moment';
    if (eh.narrative) { try { if (root.sessionStorage.getItem(HERO_KEY) === '1') eh.narrative.heroFired = true; } catch (e) { eh.narrative.heroFired = true; } }
    // V4 REVEAL: the Receiver's first appearance plays once per session.
    var REVEAL_KEY = 'dmf_eh_reveal';
    if (eh.blackSun) { try { if (root.sessionStorage.getItem(REVEAL_KEY) === '1') eh.blackSun.revealed = true; } catch (e) { eh.blackSun.revealed = true; } }

    // Once per crossing (never per frame): the trace carries the title of the section being left.
    function setAfterText() {
      var from = secEls[st.afterFrom];
      var t = from ? from.querySelector('.section-title, .acad-title, .dmf-signal-title, h1, .band-text p') : null;
      var txt = t ? String(t.textContent || '').replace(/\s+/g, ' ').trim() : '';
      // Whole words only, ≤ 28 characters: a trace, not a quote.
      if (txt.length > 28) { txt = txt.slice(0, 28); txt = txt.slice(0, Math.max(txt.lastIndexOf(' '), 8)); }
      afterEl.textContent = txt || 'DMF';
    }

    function put(el, cache, i, name, v, q) {
      v = Math.round(v * q) / q;
      if (cache[i] !== v) { cache[i] = v; el.style.setProperty(name, v); }
    }

    // --- pointer field: desktop fine pointers only; small, damped, never in the way of a click ---
    var ptrX = 0, ptrY = 0, ptrClientX = -1, ptrClientY = -1, ptrDirty = false;
    var magnet = null, magnetX = 0, magnetY = 0, magnetTX = 0, magnetTY = 0;
    if (fine && !still) {
      doc.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        ptrClientX = e.clientX; ptrClientY = e.clientY;
        ptrX = (e.clientX / (root.innerWidth || 1)) * 2 - 1;
        ptrY = (e.clientY / (root.innerHeight || 1)) * 2 - 1;
        ptrDirty = true;
      }, { passive: true });
      doc.addEventListener('pointerleave', function () { ptrX = 0; ptrY = 0; ptrClientX = -1; ptrDirty = true; });
    }
    // Magnets are read on pointer movement only (rects of the few candidates near the pointer).
    function pickMagnet() {
      ptrDirty = false;
      var best = null, bestD = 90, bx = 0, by = 0;
      if (ptrClientX >= 0) {
        var list = doc.querySelectorAll(MAGNETS);
        for (var i = 0; i < list.length; i++) {
          var r = list[i].getBoundingClientRect();
          if (r.bottom < 0 || r.top > (root.innerHeight || 0) || r.width === 0) continue;
          var dx = ptrClientX < r.left ? r.left - ptrClientX : (ptrClientX > r.right ? ptrClientX - r.right : 0);
          var dy = ptrClientY < r.top ? r.top - ptrClientY : (ptrClientY > r.bottom ? ptrClientY - r.bottom : 0);
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestD) { bestD = d; best = list[i]; bx = ptrClientX - (r.left + r.width / 2); by = ptrClientY - (r.top + r.height / 2); }
        }
      }
      if (best !== magnet && magnet) { magnet.style.removeProperty('--eh-mx'); magnet.style.removeProperty('--eh-my'); magnetX = magnetY = 0; }
      magnet = best;
      if (best) {
        // Toward the pointer, at most 3 px, falling off with distance.
        var fall = 1 - bestD / 90;
        magnetTX = clamp(bx * 0.06, -3, 3) * fall;
        magnetTY = clamp(by * 0.1, -2, 2) * fall;
      } else { magnetTX = 0; magnetTY = 0; }
    }

    // --- write the stage to the page: visible sections, the field layer, the intro ---
    var writeT = 0;
    function write(force) {
      var vh = hub.stage && hub.stage.vh ? hub.stage.vh : (root.innerHeight || 800);
      var y = root.pageYOffset || 0;
      var tierK = TIERS[st.performanceTier] || TIERS.high;
      var depthK = tierK.depth * (compact ? 0.45 : 1);
      for (var i = 0; i < visible.length; i++) {
        var el = visible[i], c = el.__ehVals;
        // The intro is a section for the director but reads no section variables (its subtree holds the SVG).
        if (!c || el.__ehTop == null || el === intro) continue;
        var center = el.__ehTop + Math.min(el.__ehH, vh) * 0.5 - y;
        var rel = clamp((center - vh * 0.5) / vh, -1, 1);
        var own = el.__ehIdx === st.index;
        put(el, c, 0, '--eh-focus', own ? st.focus : 0.6, 100);
        put(el, c, 1, '--eh-rel', rel * depthK, 100);
        put(el, c, 2, '--eh-split', own ? st.transition : 0, 100);
        put(el, c, 3, '--eh-energy', st.energy, 50);
        put(el, c, 4, '--eh-mid', st.mid, 50);
        put(el, c, 5, '--eh-high', st.high, 50);
        put(el, c, 6, '--eh-speed', st.speed * depthK, 100);
        put(el, c, 7, '--eh-vel', st.velocity * depthK, 100);
        // V2: one light source for the whole page; each framed surface resolves it against its own place.
        put(el, c, 8, '--eh-lx', st.lightX, 400);
        // V2 camera grammar.
        put(el, c, 9, '--eh-pan', st.camPan, 100);
        put(el, c, 10, '--eh-tilt', st.camTilt, 100);
        put(el, c, 11, '--eh-dolly', st.dolly, 2000);
        put(el, c, 12, '--eh-zk', st.zk * tierK.depth, 100);
        put(el, c, 13, '--eh-sheenk', st.sheenK, 50);     // V3: reflections read more across hero → releases → sets
        // V4: typographic pressure (LOW / KICK), the impact's warm fringe, and the Receiver's reveal.
        put(el, c, 14, '--eh-tp', st.titlePressure, 20);
        put(el, c, 15, '--eh-chroma', st.chromatic, 20);
        put(el, c, 16, '--eh-reveal', st.revealType, 20);
      }
      // V3: in the offer the background holds still (only its light and calm keep settling).
      var frozen = st.calm > 0.85;
      if (field) {
        put(field, fieldVals, 1, '--eh-light', st.light * tierK.ambient, 50);
        put(field, fieldVals, 2, '--eh-calm', st.calm, 50);
        // V4: blades, vignette and the section cut keep settling in the offer (their CSS multiplies by calm).
        put(field, fieldVals, 12, '--eh-beam', st.beam, 100);
        put(field, fieldVals, 13, '--eh-bx', st.lightX, 200);
        put(field, fieldVals, 14, '--eh-vig', st.vignette, 100);
        put(field, fieldVals, 15, '--eh-shadow', st.shadowDepth, 50);
        put(field, fieldVals, 16, '--eh-hold', st.hold, 50);
      }
      if (field && !frozen) {
        put(field, fieldVals, 0, '--eh-energy', st.energy, 50);
        put(field, fieldVals, 3, '--eh-gate', st.gate, 200);
        put(field, fieldVals, 4, '--eh-gate-a', st.transition, 100);
        put(field, fieldVals, 5, '--eh-depth', st.depth * depthK, 100);
        put(field, fieldVals, 6, '--eh-high', st.high, 50);
        put(field, fieldVals, 7, '--eh-scroll', clamp01(y / Math.max(1, eh.docH - vh)), 500);
        put(field, fieldVals, 8, '--eh-pan', st.camPan, 100);
        put(field, fieldVals, 9, '--eh-tilt', st.camTilt, 100);
        put(field, fieldVals, 10, '--eh-roll', st.camRoll, 200);
        put(field, fieldVals, 11, '--eh-dolly', st.dolly, 2000);
      }
      if (intro && !intro.classList.contains('eh-off')) {
        for (var n = 0; n < introEls.length; n++) {
          var ie2 = introEls[n], iv = ie2.__ehVals;
          put(ie2, iv, 0, '--eh-energy', st.energy, 50);
          put(ie2, iv, 1, '--eh-low', st.low, 50);
          put(ie2, iv, 2, '--eh-kick', st.kick, 50);
          put(ie2, iv, 3, '--eh-depth', st.depth, 50);
          put(ie2, iv, 4, '--eh-px', st.pointerX, 50);
          put(ie2, iv, 5, '--eh-py', st.pointerY, 50);
          put(ie2, iv, 6, '--eh-press', st.pressure, 50);
          put(ie2, iv, 7, '--eh-moment', st.heroMoment, 50);
          // V3 acoustic pressure: woofer excursion (≤ 4%, already bounded), cabinet settle, floor pressure.
          put(ie2, iv, 8, '--eh-woofer', st.woofer, 1000);
          put(ie2, iv, 9, '--eh-settle', st.cabinet, 50);
          put(ie2, iv, 10, '--eh-floorp', Math.max(st.floorPress, 0.8 * st.impact), 50);
        }
        if (logoWrap) {
          put(logoWrap, logoVals, 0, '--eh-moment', st.heroMoment, 50);
          put(logoWrap, logoVals, 1, '--eh-gx', st.gravityX, 50);
          put(logoWrap, logoVals, 2, '--eh-gy', st.gravityY, 50);
        }
      }
      if (afterEl) {
        if (st.afterId !== seenAfter) { seenAfter = st.afterId; setAfterText(); }
        var on = st.afterimage > 0.005;
        if (on !== afterOn) { afterOn = on; field.classList.toggle('eh-after-on', on); }
        if (on) put(afterEl, afterVals, 0, '--eh-after', st.afterimage, 100);
      }
      if (magnet) {
        var gk = st.performanceTier === 'lite' ? 0 : 1 - 0.85 * st.calm;   // V3: barely a lean in the offer
        // Soft attack, softer release.
        var rate = magnetTX !== 0 || magnetTY !== 0 ? 6 : 3;
        magnetX = approach(magnetX, magnetTX * gk, rate, 0.033);
        magnetY = approach(magnetY, magnetTY * gk, rate, 0.033);
        magnet.style.setProperty('--eh-mx', magnetX.toFixed(2));
        magnet.style.setProperty('--eh-my', magnetY.toFixed(2));
      }
      var gating = st.transition > 0.01;
      if (field && gating !== field.__ehGating) { field.__ehGating = gating; field.classList.toggle('eh-gating', gating); }
      var calmOn = st.calm > 0.5;
      if (calmOn !== html.classList.contains('eh-calm')) html.classList.toggle('eh-calm', calmOn);
    }

    var tierClass = '';
    function applyTier(t) {
      if (('eh-tier-' + t) === tierClass) return;
      if (tierClass) html.classList.remove(tierClass);
      tierClass = 'eh-tier-' + t;
      html.classList.add(tierClass);
    }

    // --- observability (debug only: ?dmfdebug=1 / localhost), twice a second, never logged ---
    var perf = hub.perf || null, perfT = 0;
    function report() {
      if (!perf) return;
      perf.eventHorizon = {
        section: st.section, progress: +st.progress.toFixed(2), velocity: +st.velocity.toFixed(3),
        energy: +st.energy.toFixed(2), tension: +st.tension.toFixed(2), depth: +st.depth.toFixed(3),
        focus: +st.focus.toFixed(2), calm: +st.calm.toFixed(2), gates: st.gateId, wake: +st.wake.toFixed(2),
        tier: st.performanceTier, compact: compact, still: still
      };
      var systems = ['eventHorizon', 'signalBus'];
      if (hub.qualityTier && hub.qualityTier !== 'none') systems.push('receiver');
      if (perf.mixer === 'ready') systems.push('mixer');
      if (doc.getElementById('smoke-canvas')) systems.push('smoke');
      perf.activeSystems = systems.join(',');
      perf.webglScenes = doc.querySelectorAll('.dmf-signal-visual canvas, .dmf-stage-layer canvas, .dmf-mixer-canvas').length;
      perf.spatialNarrative = {
        cameraPan: +st.camPan.toFixed(3), cameraTilt: +st.camTilt.toFixed(3), cameraRoll: +st.camRoll.toFixed(3),
        dolly: +st.dolly.toFixed(4), pressure: +st.pressure.toFixed(2), afterimage: +st.afterimage.toFixed(2),
        afterimages: st.afterId, pointerGravity: +Math.max(Math.abs(st.gravityX), Math.abs(st.gravityY)).toFixed(2),
        heroMoment: eh.narrative ? (eh.narrative.heroFired ? 'fired' : 'armed') : 'off',
        headYaw: +st.headYaw.toFixed(4), headPitch: +st.headPitch.toFixed(4), lightX: +st.lightX.toFixed(2),
        activeSection: st.section, tier: st.performanceTier
      };
      perf.stageOverdrive = {
        modelMass: +st.modelMass.toFixed(3), modelNear: +st.modelNear.toFixed(3), modelYaw: +st.modelYaw.toFixed(4),
        modelPitch: +st.modelPitch.toFixed(4), modelPush: +st.modelPush.toFixed(2), woofer: +st.woofer.toFixed(4),
        cabinet: +st.cabinet.toFixed(3), floorPress: +st.floorPress.toFixed(2), breath: +st.breath.toFixed(2),
        bodyLag: +st.bodyLag.toFixed(4), sheenK: +st.sheenK.toFixed(2), compress: +st.compress.toFixed(2)
      };
      perf.blackSun = {
        blackSun: +st.blackSun.toFixed(2), iris: +st.iris.toFixed(2), halo: +st.halo.toFixed(2), gravity: +st.gravity.toFixed(2),
        sunScale: +st.sunScale.toFixed(4), impact: +st.impact.toFixed(2), beam: +st.beam.toFixed(2), vignette: +st.vignette.toFixed(2),
        titlePressure: +st.titlePressure.toFixed(2), reflectionShock: +st.reflectionShock.toFixed(2), receiverGlow: +st.receiverGlow.toFixed(2),
        stageLift: +st.stageLift.toFixed(3), torsoLag: +st.torsoLag.toFixed(4), silence: +st.silence.toFixed(2), reveal: +st.reveal.toFixed(2),
        revealed: eh.blackSun ? eh.blackSun.revealed : true
      };
      perf.dprCaps = { receiver: hub.renderScale || 1, mixer: perf.mixerFit ? perf.mixerFit.dpr : null, smoke: Math.min(root.devicePixelRatio || 1, 1.5) };
    }

    var frameN = 0, acc = 0;
    // One input record, reused every frame (the director reads it; nothing is allocated per frame).
    var input = { scrollY: 0, vh: 800, velocity: 0, s: null, forces: null, pointerX: 0, pointerY: 0, tier: 'high', compact: compact, wakeT: -1, pre: 0,
      docProgress: 0, pointerActive: false };
    function tick(s, dt, raw, bus) {
      var tier = tierOf(bus.qualityTier, compact);
      applyTier(tier);
      if (bus.stage && bus.stage.layout !== seenLayout) { seenLayout = bus.stage.layout; measure(); }
      if (tier === 'static') {
        if (st.performanceTier !== 'static') { st.performanceTier = 'static'; eh.compose(eh.sectionAt((root.pageYOffset || 0) + (root.innerHeight || 800) * FOCUS_LINE)); write(true); }
        return;
      }
      // LITE: the director runs every other frame on the summed time step.
      frameN++;
      acc += dt;
      if (TIERS[tier].rate === 2 && (frameN & 1)) return;
      var step = acc; acc = 0;
      if (ptrDirty) pickMagnet();
      var wakeT = awake ? -1 : ((root.performance ? performance.now() : 0) - wakeAt) / 1000;
      // The wake class stays: its one-shot animations hold their final frame (swapping classes would replay them).
      if (!awake && wakeT > WAKE_DUR) awake = true;
      var sg = bus.singularity, hd = bus.hyper;
      var pre = Math.max(sg ? sg.pre || 0 : 0, hd ? hd.pre || 0 : 0);
      input.scrollY = bus.stage ? bus.stage.scrollY : (root.pageYOffset || 0);
      input.vh = bus.stage ? bus.stage.vh : (root.innerHeight || 800);
      input.velocity = bus.stage && bus.stage.scroll ? bus.stage.scroll.velocity : 0;
      input.s = s; input.forces = bus.forces; input.pointerX = ptrX; input.pointerY = ptrY;
      input.tier = tier; input.wakeT = wakeT; input.pre = pre;
      input.docProgress = clamp01(input.scrollY / Math.max(1, eh.docH - input.vh));
      input.pointerActive = ptrClientX >= 0;
      eh.update(input, step);
      if (eh.narrative && eh.narrative.heroFiredNow) { try { root.sessionStorage.setItem(HERO_KEY, '1'); } catch (e) { /* once per page then */ } }
      if (eh.blackSun && eh.blackSun.revealNow) { try { root.sessionStorage.setItem(REVEAL_KEY, '1'); } catch (e) { /* once per page then */ } }
      // DOM at ~30 Hz, except on a gate or a kick so the page lands on the beat.
      writeT += step;
      if (writeT >= 0.033 || st.transition > 0.01 || s.beatFired) { writeT = 0; write(false); }
      perfT += step;
      if (perf && perfT > 0.5) { perfT = 0; report(); }
    }

    function composeStill() {
      measure();
      applyTier('static');
      eh.compose(eh.sectionAt((root.pageYOffset || 0) + (root.innerHeight || 800) * FOCUS_LINE));
      st.performanceTier = 'static';
      html.classList.add('eh-still');
      write(true);
      report();
    }

    if (still || !hub.onFrame) { composeStill(); return; }
    measure();
    hub.onFrame(tick);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})(typeof window !== 'undefined' ? window : this);
