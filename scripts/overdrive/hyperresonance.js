/* DMF HYPERRESONANCE — one normalized, reusable audio signal for the whole landing, and the Receiver's
 * bounded responses to it. ES5, no clock, no timers, no allocation per frame.
 *
 * It does not add a second analyser, loop or state machine. The bus already owns the Web Audio
 * AnalyserNode (signal-bus.js: bands, onsets, AGC; the idle clock when no audio plays), the beat predictor
 * and DMFStateMachine (energy levels with hysteresis bands; OVERDRIVE only after sustained drop energy,
 * released only after sustained calm). This layer reads them once per bus frame and publishes:
 *
 *   signal    bass · mids · treble · beat · energy · transient · smoothedEnergy · source (audio|clock|off)
 *   state     idle · armed · live · overdrive (DORMANT · AWAKENED · TRANSMITTING · OVERDRIVE)
 *   responses bounded 0..1 terms per target, scaled by the state, the quality tier and motion preference:
 *             bass   → cone, camPush, scalePulse
 *             mids   → head, torso, reflect
 *             treble → glint, scan
 *             beat   → impulse (a short one-shot envelope: never a continuous oscillation)
 *             overdrive → light, emissive, receiverPulse, camImpulse, stageAmp
 *
 * Reduced motion: every motion response is 0 and light responses are capped low. Save-Data: disabled (all 0).
 * Tier: high 1 · balanced .8 · lite .5 · static 0. A hidden tab pauses it (envelopes reset on return).
 * Inlined into public/index.html by scripts/build-3d.cjs right after signal-bus.js; required by tests. */
(function (root) {
  'use strict';

  function clamp01(v) { return v !== v ? 0 : (v < 0 ? 0 : (v > 1 ? 1 : v)); }
  function num(v) { return typeof v === 'number' && v === v ? v : 0; }
  // A light response: scaled by tier, capped low under reduced motion.
  function lightTerm(v, intensity, cap) { v = clamp01(v * intensity); return v > cap ? cap : v; }
  // Exponential follower with separate attack/release time constants (seconds).
  function follow(cur, target, attack, release, dt) {
    var tau = target > cur ? attack : release;
    return tau <= 0 ? target : cur + (target - cur) * (1 - Math.exp(-dt / tau));
  }

  var STATES = ['idle', 'armed', 'live', 'overdrive'];
  var FROM_MACHINE = { DORMANT: 0, AWAKENED: 1, TRANSMITTING: 2, OVERDRIVE: 3 };
  // How much of each response a state lets through: restrained at rest, full only in OVERDRIVE.
  var STATE_GAIN = [0.35, 0.6, 0.85, 1];
  var TIER_SCALE = { high: 1, balanced: 0.8, lite: 0.5, static: 0, none: 1 };
  var REDUCED_LIGHT_CAP = 0.35;
  var BEAT_DECAY = 0.12;          // s: the beat envelope is a short impulse, back under 1% in ~0.55 s
  var SMOOTH = { attack: 0.6, release: 1.4 };
  var MOTION_KEYS = ['cone', 'camPush', 'scalePulse', 'head', 'torso', 'receiverPulse', 'camImpulse'];
  var LIGHT_KEYS = ['reflect', 'glint', 'scan', 'light', 'emissive', 'stageAmp'];
  var RESPONSE_KEYS = MOTION_KEYS.concat(LIGHT_KEYS, ['impulse']);

  function DMFResonance() {
    this.reducedMotion = false;
    this.saveData = false;
    this.tier = 'none';
    this.paused = false;
    this.out = {
      enabled: true, source: 'off',
      bass: 0, mids: 0, treble: 0, beat: 0, energy: 0, transient: 0, smoothedEnergy: 0,
      state: 'idle', level: 0, overdriveMix: 0, intensity: 1, motion: 1, beatIndex: 0
    };
    for (var i = 0; i < RESPONSE_KEYS.length; i++) this.out[RESPONSE_KEYS[i]] = 0;
  }

  DMFResonance.prototype.configure = function (opts) {
    opts = opts || {};
    if (opts.reducedMotion != null) this.reducedMotion = !!opts.reducedMotion;
    if (opts.saveData != null) this.saveData = !!opts.saveData;
    if (opts.tier) this.tier = String(opts.tier);
    var o = this.out;
    o.enabled = !this.saveData;
    o.intensity = this.saveData ? 0 : (TIER_SCALE[this.tier] != null ? TIER_SCALE[this.tier] : 1);
    o.motion = this.reducedMotion ? 0 : 1;
    if (!o.enabled) this.rest();
    return o;
  };

  // Hidden tab / lost context: drop the envelopes so nothing fires from a stale frame on return.
  DMFResonance.prototype.pause = function () { this.paused = true; this.rest(); };
  DMFResonance.prototype.resume = function () { this.paused = false; };

  DMFResonance.prototype.rest = function () {
    var o = this.out;
    o.bass = o.mids = o.treble = o.beat = o.energy = o.transient = o.smoothedEnergy = 0;
    o.overdriveMix = 0;
    o.level = 0;
    o.state = 'idle';
    for (var i = 0; i < RESPONSE_KEYS.length; i++) o[RESPONSE_KEYS[i]] = 0;
  };

  // sig: the engine output (hub.signal). state: hub.state (DMFStateMachine). overdriveMix: hub.overdriveMix.
  DMFResonance.prototype.update = function (sig, state, overdriveMix, dt) {
    var o = this.out;
    if (!o.enabled || this.paused || !sig) { o.source = o.enabled ? o.source : 'off'; return o; }
    dt = num(dt);
    if (dt <= 0) return o;
    if (dt > 0.1) dt = 0.1;

    // --- signal: the bus's bands, already normalized by its AGC (analyser) or shaped by the idle clock ---
    o.source = sig.source === 'audio' ? 'audio' : 'clock';
    o.bass = clamp01(num(sig.low));
    o.mids = clamp01(num(sig.mid));
    o.treble = clamp01(num(sig.high));
    o.energy = clamp01(num(sig.energy));
    o.transient = clamp01(num(sig.transient));
    o.smoothedEnergy = clamp01(follow(o.smoothedEnergy, o.energy, SMOOTH.attack, SMOOTH.release, dt));
    // One-shot: jumps on a fired beat, then only decays. No beat, no motion.
    o.beat = sig.beatFired ? 1 : o.beat * Math.exp(-dt / BEAT_DECAY);
    if (o.beat < 1e-4) o.beat = 0;
    if (sig.beatFired) o.beatIndex = num(sig.beatIndex);

    // --- state: the existing machine's hysteresis, under the names the landing uses ---
    var lvl = FROM_MACHINE[state];
    o.level = lvl == null ? 0 : lvl;
    o.state = STATES[o.level];
    o.overdriveMix = clamp01(num(overdriveMix));

    // --- responses ---
    var g = STATE_GAIN[o.level] * o.intensity;
    var m = g * o.motion;
    var cap = o.motion ? 1 : REDUCED_LIGHT_CAP, k = o.intensity, sg = STATE_GAIN[o.level];
    var od = o.overdriveMix;

    o.impulse = clamp01(o.beat * m);
    o.cone = clamp01(o.bass * (0.5 + 0.5 * o.beat) * m);
    o.camPush = clamp01(o.bass * o.beat * m);
    o.scalePulse = clamp01(o.bass * o.beat * m);
    o.head = clamp01(o.mids * m);
    o.torso = clamp01(o.smoothedEnergy * 0.6 * m);
    o.reflect = lightTerm(o.mids * sg, k, cap);
    o.glint = lightTerm(o.treble * (0.4 + 0.6 * o.transient) * sg, k, cap);
    o.scan = lightTerm(o.treble * (0.5 + 0.5 * od) * sg, k, cap);
    o.light = lightTerm(od, k, cap);
    o.emissive = lightTerm(od * (0.6 + 0.4 * o.beat), k, cap);
    o.stageAmp = lightTerm(od, k, cap);
    o.receiverPulse = clamp01(od * o.beat * o.intensity * o.motion);
    o.camImpulse = clamp01(od * o.beat * o.intensity * o.motion);
    return o;
  };

  var api = {
    STATES: STATES, FROM_MACHINE: FROM_MACHINE, STATE_GAIN: STATE_GAIN, TIER_SCALE: TIER_SCALE,
    REDUCED_LIGHT_CAP: REDUCED_LIGHT_CAP, BEAT_DECAY: BEAT_DECAY, MOTION_KEYS: MOTION_KEYS, LIGHT_KEYS: LIGHT_KEYS,
    RESPONSE_KEYS: RESPONSE_KEYS, DMFResonance: DMFResonance
  };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  root.DMFResonance = api;

  // ======================================================================================================
  // BROWSER BINDING — one instance on the bus, stepped from the bus's own frame (no loop of its own).
  // ======================================================================================================
  var doc = root.document;
  var hub = root.DMFSignal;
  if (!doc || !hub || hub.resonance) return;

  var res = new DMFResonance();
  res.configure({ reducedMotion: hub.reduced, saveData: hub.saveData, tier: hub.qualityTier });
  hub.resonance = res.out;
  // Reduced motion / Save-Data: the bus never starts its clock; the published signal stays at rest.
  if (hub.reduced || hub.saveData || !hub.onFrame) return;

  doc.addEventListener('visibilitychange', function () { if (doc.hidden) res.pause(); else res.resume(); });
  var tierSeen = '';
  hub.onFrame(function (s, dt) {
    if (hub.qualityTier !== tierSeen) { tierSeen = hub.qualityTier; res.configure({ tier: tierSeen }); }
    res.update(s, hub.state, hub.overdriveMix, dt);
  });

  // DEV DIAGNOSTICS (?dmf-audio-debug=1 only): bass / mid / treble / energy / beat / state / tier / fps,
  // refreshed ~4 times a second, textContent only. Never created otherwise.
  if (!/[?&]dmf-audio-debug=1(&|$)/.test(root.location ? root.location.search : '')) return;
  function mountDebug() {
    var panel = doc.createElement('div');
    panel.className = 'dmf-audio-debug';
    panel.setAttribute('aria-hidden', 'true');
    panel.style.cssText = 'position:fixed;z-index:10002;left:12px;bottom:12px;padding:10px 12px;min-width:170px;' +
      'background:rgba(10,8,6,.9);border:1px solid rgba(255,91,30,.35);color:#f2ede6;font:10px/1.55 ui-monospace,Menlo,monospace;' +
      'letter-spacing:.06em;pointer-events:none;white-space:pre';
    doc.body.appendChild(panel);
    var acc = 0;
    hub.onFrame(function (s, dt) {
      acc += dt;
      if (acc < 0.25) return;
      acc = 0;
      var o = res.out;
      panel.textContent = 'DMF HYPERRESONANCE\n' +
        'source  ' + o.source + '\n' +
        'bass    ' + o.bass.toFixed(2) + '\n' +
        'mid     ' + o.mids.toFixed(2) + '\n' +
        'treble  ' + o.treble.toFixed(2) + '\n' +
        'energy  ' + o.energy.toFixed(2) + ' / ' + o.smoothedEnergy.toFixed(2) + '\n' +
        'beat    ' + o.beat.toFixed(2) + '\n' +
        'state   ' + o.state + '\n' +
        'tier    ' + (hub.qualityTier || 'none') + '\n' +
        'fps     ' + (hub.fps || 0);
    });
  }
  if (doc.body) mountDebug();
  else doc.addEventListener('DOMContentLoaded', mountDebug, { once: true });
})(typeof window !== 'undefined' ? window : this);
