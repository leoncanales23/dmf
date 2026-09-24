/* DMF SIGNAL BUS — browser runtime. One clock drives the relic and the landing.
 * Inlined into public/index.html by scripts/build-3d.cjs after engine.js. */
(function () {
  'use strict';
  var O = window.DMFOverdrive;
  if (!O || window.DMFSignal) return;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
  var debug = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]dmfdebug=1/.test(location.search);

  var engine = new O.DMFSignalEngine({ startBar: 8 });
  var machine = new O.DMFStateMachine();
  var listeners = [];

  var hyper = new O.DMFHyperdrive();

  var hub = window.DMFSignal = {
    signal: engine.out,
    hyper: hyper,
    state: 'DORMANT',
    overdriveMix: 0,
    hoverLevel: 0,
    forceDrop: false,
    reduced: reduce,
    saveData: saveData,
    running: false,
    fps: 60,
    qualityTier: 'none',
    renderScale: 1,
    cameraShot: 'ICON',
    // A forced drop lands on the next downbeat; the drop hit is what earns a HYPERDRIVE moment.
    setForceDrop: function (on) { hub.forceDrop = !!on; engine.setForceDrop(!!on); },
    onFrame: function (fn) { listeners.push(fn); },
    attachAudio: attachAudio,
    scan: scan
  };

  var perf = null;
  if (debug) {
    perf = window.__DMF_PERF__ = {
      fps: 0, qualityTier: 'none', renderScale: 1, source: 'clock', bpm: 124, state: 'DORMANT',
      overdrive: 0, hyperdrive: 'idle', hyperLevel: 0, impact: 0, timeToBeat: 0, cameraShot: 'ICON',
      low: 0, mid: 0, high: 0, energy: 0, kick: 0, visibleSections: ''
    };
  }

  if (reduce || saveData) return;

  // === DMFAudioReactive — same-origin <video>/<audio> feed a real analyser when playing ===
  var AC = window.AudioContext || window.webkitAudioContext;
  var actx = null, analyser = null, freq = null, sources = [];
  var bins = null;
  var agc = [0.2, 0.2, 0.2];
  var prevBand = [0, 0, 0];
  var fluxAvg = [0, 0, 0];
  var sinceOnset = [1, 1];
  var audioFrame = { low: 0, mid: 0, high: 0, kickOnset: false, snareOnset: false };

  function attachAudio(el) {
    if (!AC || !el) return;
    if (el.__dmfAudio) { if (actx && actx.resume) actx.resume(); return; }
    try {
      if (new URL(el.currentSrc || el.src, location.href).origin !== location.origin) return;
    } catch (_) { return; }
    if (!actx) { try { actx = new AC(); } catch (_) { return; } }
    var ready = actx.resume ? actx.resume() : null;
    var connect = function () {
      if (actx.state !== 'running' || el.__dmfAudio) return;
      try {
        if (!analyser) {
          analyser = actx.createAnalyser();
          analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.55;
          freq = new Uint8Array(analyser.frequencyBinCount);
          var hz = actx.sampleRate / analyser.fftSize;
          bins = [[Math.max(1, Math.round(20 / hz)), Math.round(150 / hz)],
                  [Math.round(150 / hz), Math.round(2000 / hz)],
                  [Math.round(2000 / hz), Math.min(freq.length - 1, Math.round(12000 / hz))]];
          analyser.connect(actx.destination);
        }
        actx.createMediaElementSource(el).connect(analyser);
        el.__dmfAudio = true;
        sources.push(el);
      } catch (_) {}
    };
    if (ready && ready.then) ready.then(connect, function () {});
    else connect();
  }

  document.addEventListener('play', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'VIDEO' || t.tagName === 'AUDIO')) attachAudio(t);
  }, true);

  function bandLevel(b) {
    var sum = 0, lo = bins[b][0], hi = bins[b][1];
    for (var i = lo; i <= hi; i++) sum += freq[i];
    return sum / ((hi - lo + 1) * 255);
  }

  function pollAudio(dt) {
    var playing = false;
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (!s.paused && !s.ended && !s.muted && s.volume > 0) { playing = true; break; }
    }
    if (!playing || !analyser || actx.state !== 'running') {
      if (engine.audio) engine.clearAudio();
      return;
    }
    analyser.getByteFrequencyData(freq);
    for (var b = 0; b < 3; b++) {
      var v = bandLevel(b);
      agc[b] = Math.max(agc[b] * Math.exp(-dt * 0.35), v, 0.04);
      var n = v / agc[b];
      var flux = Math.max(0, n - prevBand[b]);
      prevBand[b] = n;
      var isOnset = b < 2 && flux > fluxAvg[b] * 2.2 + 0.06 && sinceOnset[b] > 0.22;
      fluxAvg[b] += (flux - fluxAvg[b]) * 0.1;
      if (b === 0) { audioFrame.low = n; audioFrame.kickOnset = isOnset; }
      else if (b === 1) { audioFrame.mid = n; audioFrame.snareOnset = isOnset; }
      else audioFrame.high = n;
      if (b < 2) sinceOnset[b] = isOnset ? 0 : sinceOnset[b] + dt;
    }
    engine.inputAudio(audioFrame);
  }

  // === DMFLandingBus — CSS custom properties on visible blocks only ===
  // Simulation runs every frame; DOM writes are throttled to ~30 Hz except on an impact,
  // which writes immediately so the page lands on the beat.
  var TARGETS = '.nav, header.hero, .section, .contact, .band, .dmf-signal-band';
  var VARS = ['--dmf-energy', '--dmf-kick', '--dmf-low', '--dmf-high', '--dmf-peak', '--dmf-phase', '--dmf-overdrive',
    '--dmf-impulse', '--dmf-hyper', '--dmf-hyper-pre', '--dmf-wave'];
  var WAVE_VAR = VARS.length - 1;
  var vals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var visible = [];
  var visibleDirty = true;
  var scrollY = window.pageYOffset || 0;
  var relicBand = null;

  // Document positions come from IntersectionObserver rects (no forced layout) and a debounced resize pass.
  function cachePos(el, rect) {
    el.__dmfTop = rect.top + scrollY;
    el.__dmfBottom = el.__dmfTop + rect.height;
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var el = entries[i].target;
      var idx = visible.indexOf(el);
      cachePos(el, entries[i].boundingClientRect);
      if (entries[i].isIntersecting) { if (idx < 0) { visible.push(el); visibleDirty = true; } }
      else if (idx >= 0) {
        visible.splice(idx, 1);
        visibleDirty = true;
        for (var k = 0; k < VARS.length; k++) el.style.removeProperty(VARS[k]);
        el.__dmfVals = null;
      }
    }
  }, { rootMargin: '8% 0px' }) : null;
  window.addEventListener('scroll', function () { scrollY = window.pageYOffset || 0; }, { passive: true });

  function scan() {
    if (!io) return;
    var list = document.querySelectorAll(TARGETS);
    for (var i = 0; i < list.length; i++) {
      if (!list[i].__dmfBus) { list[i].__dmfBus = true; io.observe(list[i]); }
    }
    relicBand = document.getElementById('relic');
    pathRefresh();
  }

  function smooth01(e0, e1, x) { var t = O.clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }

  // === GLOBAL SIGNAL WAVE — one pulse travels through the page from the Receiver outward ===
  // Each block lights when the front reaches its top edge (distance / speed), so sections answer in sequence.
  var WAVE_SPEED = 2600;
  var WAVE_WIDTH = 0.12 * WAVE_SPEED;
  var wave = { t: 9, strength: 0, origin: 0 };
  function emitWave(strength) {
    wave.origin = relicBand && relicBand.__dmfTop != null
      ? (relicBand.__dmfTop + relicBand.__dmfBottom) / 2
      : scrollY + window.innerHeight * 0.5;
    wave.t = 0;
    wave.strength = strength;
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('dmf:wave', { detail: { strength: strength, delayFor: waveDelay } }));
    }
  }
  // Seconds until the wave front reaches an element's nearest edge (rare: once per wave event).
  function waveDelay(el) {
    var top = el.__dmfTop, bottom = el.__dmfBottom;
    if (top == null) {
      var r = el.getBoundingClientRect();
      top = r.top + scrollY;
      bottom = top + r.height;
    }
    var d = top > wave.origin ? top - wave.origin : (bottom < wave.origin ? wave.origin - bottom : 0);
    return d / WAVE_SPEED;
  }
  function waveAt(el) {
    if (wave.strength <= 0) return 0;
    var d;
    if (el.__dmfFixed) d = Math.abs(scrollY - wave.origin);
    else if (el.__dmfTop == null) return 0;
    else d = el.__dmfTop > wave.origin ? el.__dmfTop - wave.origin : (el.__dmfBottom < wave.origin ? wave.origin - el.__dmfBottom : 0);
    var x = (wave.t * WAVE_SPEED - d) / WAVE_WIDTH;
    return wave.strength * Math.exp(-x * x) * Math.exp(-wave.t * 0.6);
  }

  var lastWrite = 0;
  function writeBus(now, s, urgent) {
    if (!urgent && now - lastWrite < 33) return;
    lastWrite = now;
    vals[0] = s.energy;
    vals[1] = s.kick;
    vals[2] = s.low;
    vals[3] = s.high;
    vals[4] = O.clamp01((s.transient - 0.5) * 2) * smooth01(0.55, 0.85, s.energy);
    vals[5] = s.beatPhase;
    vals[6] = machine.overdriveMix;
    vals[7] = s.impulse;
    vals[8] = hyper.active ? hyper.level : 0;
    vals[9] = hyper.pre;
    for (var i = 0; i < visible.length; i++) {
      var el = visible[i];
      vals[WAVE_VAR] = waveAt(el);
      var cache = el.__dmfVals || (el.__dmfVals = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
      for (var k = 0; k < VARS.length; k++) {
        var v = Math.round(vals[k] * 1000) / 1000;
        if (cache[k] !== v) { cache[k] = v; el.style.setProperty(VARS[k], v); }
      }
    }
  }

  // Academy signal path: one node goes live per bar and the line fills to it.
  var path = null, pathNodes = null, pathTops = null, pathVisible = false, liveNode = -1;
  var pathIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
    pathVisible = en[0].isIntersecting;
  }) : null;
  var pathMO = 'MutationObserver' in window ? new MutationObserver(function () { pathMeasure(); }) : null;

  function pathRefresh() {
    var p = document.getElementById('modulesGrid');
    if (!p || p === path) return;
    path = p;
    if (pathIO) pathIO.observe(p);
    if (pathMO) pathMO.observe(p, { childList: true });
    pathMeasure();
  }
  function pathMeasure() {
    if (!path) return;
    pathNodes = path.querySelectorAll('.signal-node');
    var h = path.offsetHeight || 1;
    pathTops = [];
    for (var i = 0; i < pathNodes.length; i++) pathTops.push((pathNodes[i].offsetTop + 31) / h);
    liveNode = -1;
  }
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      scrollY = window.pageYOffset || 0;
      for (var i = 0; i < visible.length; i++) cachePos(visible[i], visible[i].getBoundingClientRect());
      pathMeasure();
    }, 200);
  });

  function drivePath(s) {
    if (!pathVisible || !pathNodes || !pathNodes.length) return;
    var idx = ((s.bar % pathNodes.length) + pathNodes.length) % pathNodes.length;
    if (idx === liveNode) return;
    if (liveNode >= 0 && pathNodes[liveNode]) pathNodes[liveNode].classList.remove('is-live');
    pathNodes[idx].classList.add('is-live');
    liveNode = idx;
    path.style.setProperty('--dmf-path', pathTops[idx].toFixed(3));
  }

  // === Frame loop — single rAF for bus, relic, HUD and hero pointer ===
  var last = 0, fpsAcc = 0, fpsFrames = 0, lastHdId = 0, waveBar = -1;
  function frame(now) {
    requestAnimationFrame(frame);
    var raw = last ? (now - last) / 1000 : 0.016;
    last = now;
    var dt = raw > 0.1 ? 0.1 : raw;
    pollAudio(dt);
    var s = engine.update(dt);
    hub.state = machine.update(s, dt, { active: true, hoverLevel: hub.hoverLevel });
    hub.overdriveMix = machine.overdriveMix;
    hyper.update(s, dt);

    var hdHit = hyper.active && hyper.id !== lastHdId;
    lastHdId = hyper.id;
    if (hdHit) emitWave(1);
    else if (s.beatFired && s.beatIndex % 4 === 0 && s.bar !== waveBar) {
      waveBar = s.bar;
      if (machine.overdrive) emitWave(0.55);
      else if (hub.state === 'TRANSMITTING' && s.bar % 4 === 0) emitWave(0.3);
    }
    wave.t += dt;
    if (wave.t > 3) wave.strength = 0;

    for (var i = 0; i < listeners.length; i++) listeners[i](s, dt, raw, hub);
    writeBus(now, s, s.beatFired || hdHit);
    drivePath(s);
    if (raw < 0.25) { fpsAcc += raw; fpsFrames++; }
    if (fpsAcc >= 1) { hub.fps = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
    if (perf) {
      perf.fps = hub.fps; perf.qualityTier = hub.qualityTier; perf.renderScale = hub.renderScale;
      perf.source = s.source; perf.bpm = s.bpm; perf.state = hub.state; perf.overdrive = machine.overdriveMix;
      perf.hyperdrive = hyper.active ? hyper.phase : (hyper.pre > 0.01 ? 'pre' : 'idle');
      perf.hyperLevel = hyper.active ? hyper.level : 0;
      perf.impact = s.impulse; perf.timeToBeat = s.timeToBeat; perf.cameraShot = hub.cameraShot;
      perf.low = s.low; perf.mid = s.mid; perf.high = s.high; perf.energy = s.energy; perf.kick = s.kick;
      if (visibleDirty) {
        visibleDirty = false;
        var names = [];
        for (var v = 0; v < visible.length; v++) names.push(visible[v].id || visible[v].className.split(' ')[0]);
        perf.visibleSections = names.join(',');
      }
    }
  }

  function start() {
    if (hub.running) return;
    hub.running = true;
    document.documentElement.classList.add('dmf-signal-live');
    var nav = document.querySelector('.nav');
    if (nav) nav.__dmfFixed = true;
    scan();
    setTimeout(scan, 1500);
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
