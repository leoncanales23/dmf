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

  var hub = window.DMFSignal = {
    signal: engine.out,
    state: 'DORMANT',
    overdriveMix: 0,
    hoverLevel: 0,
    forceDrop: false,
    reduced: reduce,
    saveData: saveData,
    running: false,
    fps: 60,
    qualityTier: 'none',
    setForceDrop: function (on) { hub.forceDrop = !!on; engine.setForceDrop(!!on); },
    onFrame: function (fn) { listeners.push(fn); },
    attachAudio: attachAudio,
    scan: scan
  };

  var perf = null;
  if (debug) {
    perf = window.__DMF_PERF__ = {
      fps: 0, qualityTier: 'none', state: 'DORMANT',
      low: 0, mid: 0, high: 0, energy: 0, kick: 0, overdrive: 0, source: 'clock'
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
  var TARGETS = '.nav, header.hero, .section, .contact, .band, .dmf-signal-band';
  var VARS = ['--dmf-energy', '--dmf-kick', '--dmf-low', '--dmf-high', '--dmf-peak', '--dmf-phase', '--dmf-overdrive'];
  var vals = [0, 0, 0, 0, 0, 0, 0];
  var visible = [];
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var el = entries[i].target;
      var idx = visible.indexOf(el);
      if (entries[i].isIntersecting) { if (idx < 0) visible.push(el); }
      else if (idx >= 0) {
        visible.splice(idx, 1);
        for (var k = 0; k < VARS.length; k++) el.style.removeProperty(VARS[k]);
        el.__dmfVals = null;
      }
    }
  }, { rootMargin: '8% 0px' }) : null;

  function scan() {
    if (!io) return;
    var list = document.querySelectorAll(TARGETS);
    for (var i = 0; i < list.length; i++) {
      if (!list[i].__dmfBus) { list[i].__dmfBus = true; io.observe(list[i]); }
    }
    pathRefresh();
  }

  function smooth01(e0, e1, x) { var t = O.clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); }

  var lastWrite = 0;
  function writeBus(now, s) {
    if (now - lastWrite < 33) return;
    lastWrite = now;
    vals[0] = s.energy;
    vals[1] = s.kick;
    vals[2] = s.low;
    vals[3] = s.high;
    vals[4] = O.clamp01((s.transient - 0.5) * 2) * smooth01(0.55, 0.85, s.energy);
    vals[5] = s.beatPhase;
    vals[6] = machine.overdriveMix;
    for (var i = 0; i < visible.length; i++) {
      var el = visible[i];
      var cache = el.__dmfVals || (el.__dmfVals = [-1, -1, -1, -1, -1, -1, -1]);
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
    resizeTimer = setTimeout(pathMeasure, 200);
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

  // === Frame loop — single rAF for bus, relic and HUD ===
  var last = 0, fpsAcc = 0, fpsFrames = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var raw = last ? (now - last) / 1000 : 0.016;
    last = now;
    var dt = raw > 0.1 ? 0.1 : raw;
    pollAudio(dt);
    var s = engine.update(dt);
    hub.state = machine.update(s, dt, { active: true, hoverLevel: hub.hoverLevel });
    hub.overdriveMix = machine.overdriveMix;
    for (var i = 0; i < listeners.length; i++) listeners[i](s, dt, raw, hub);
    writeBus(now, s);
    drivePath(s);
    if (raw < 0.25) { fpsAcc += raw; fpsFrames++; }
    if (fpsAcc >= 1) { hub.fps = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
    if (perf) {
      perf.fps = hub.fps; perf.qualityTier = hub.qualityTier; perf.state = hub.state;
      perf.low = s.low; perf.mid = s.mid; perf.high = s.high; perf.energy = s.energy;
      perf.kick = s.kick; perf.overdrive = machine.overdriveMix; perf.source = s.source;
    }
  }

  function start() {
    if (hub.running) return;
    hub.running = true;
    document.documentElement.classList.add('dmf-signal-live');
    scan();
    setTimeout(scan, 1500);
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
