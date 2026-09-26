/* DMF LIGHTSPEED — pure threshold layer for the Event Horizon director (V6). ES5, no DOM, no clock, no timers.
 * The director steps it after the V5 Mass Driver with the same state object. It never detects a beat: a
 * LIGHTSPEED event starts only on the onset of a Mass Driver release (st.drive rising from 0), at most once
 * per 6 s, and turns that one shot into a threshold crossing for the whole stage:
 *   T −120..0   SPACE COMPRESSION  (Mass Driver's precompression: FOV tightens, sun contracts, speakers hold)
 *   T +0..70    IGNITION           (head leads, camera pushes, centre light, speakers release)
 *   T +70..180  VELOCITY FRONT     (depth stretches, reflections streak, blades align, titles peak, floor wave)
 *   T +180..450 LIGHTSPEED         (FOV opens within bound, Receiver anchored, sun edge after the model)
 *   T +450..850 MASSIVE DECELERATION (heavy, no bounce; every term lands at exactly 0 — the authored pose)
 * Every term is hard-clamped here. The offer never sees an event. Inlined into public/index.html by
 * scripts/build-3d.cjs after mass-driver.js; required by tests. */
(function (root) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  // Silent until `delay`, smooth attack, coast, smooth heavy return to exactly 0 at `end` (no overshoot).
  function pulse(t, delay, attack, end) {
    if (t < delay || t >= end) return 0;
    var u = t - delay;
    if (u < attack) return smooth01(u / attack);
    return 1 - smooth01((u - attack) / (end - delay - attack));
  }

  var LIMITS = {
    end: 0.85,            // the event is over (exactly zero) 850 ms after ignition
    gap: 6,               // one major LIGHTSPEED event per ≥ 6 s, whatever the music
    fovDesktop: 3.5,      // degrees
    fovMobile: 1.2,
    dollyDesktop: 0.18,   // world units
    dollyMobile: 0.07,
    compressFov: 0.35,    // the compression tightens FOV by ≤ 35% of the open bound
    sunContract: 0.006,   // extra sun contraction / expansion (the V4 ±3% clamp still wins)
    sunExpand: 0.008,
    wooferHold: 0.25,     // speakers hold tension (−25% travel) …
    wooferRelease: 0.15   // … then release (+15%), inside the V3 4% budget
  };
  // Timeline from ignition (drive onset): [delay, attack, end].
  var T = {
    ignition: [0, 0.03, 0.12],
    head: [0, 0.05, 0.35],
    shoulder: [0.06, 0.07, 0.45],
    torso: [0.12, 0.1, 0.6],
    front: [0.07, 0.08, 0.6],
    depth: [0.03, 0.15, 0.8],
    fov: [0.03, 0.3, 0.85],
    core: [0, 0.3, 0.85],
    edge: [0.1, 0.06, 0.5],
    reflection: [0.12, 0.1, 0.7],
    blade: [0.1, 0.1, 0.75],
    floor: [0.14, 0.08, 0.6],
    title: [0.1, 0.1, 0.6],
    snap: [0.45, 0.1, 0.85]
  };
  function at(t, k) { return pulse(t, k[0], k[1], k[2]); }
  var ENERGETIC = { hero: 1, relic: 1, band: 1, releases: 1, sets: 1 };

  // Authority per tier and device (the V6 governor contract).
  function authority(tier, compact) {
    if (tier === 'static') return { cam: 0, refl: 0, type: 0, light: 0, body: 0 };
    var a = tier === 'lite' ? { cam: 0.4, refl: 0.35, type: 0.3, light: 0.4, body: 0.45 }
      : tier === 'balanced' ? { cam: 0.75, refl: 0.65, type: 0.6, light: 0.7, body: 1 }
      : { cam: 1, refl: 1, type: 1, light: 1, body: 1 };
    if (compact) { a.cam = Math.min(a.cam, 0.35); a.refl = Math.min(a.refl, 0.4); a.body = Math.min(a.body, 0.42); a.type = Math.min(a.type, 0.42); a.light = Math.min(a.light, 0.42); }
    return a;
  }
  var AUTH = {
    high: authority('high', false), balanced: authority('balanced', false), lite: authority('lite', false), static: authority('static', false),
    highC: authority('high', true), balancedC: authority('balanced', true), liteC: authority('lite', true), staticC: authority('static', true)
  };

  function DMFLightspeed() {
    this.t = 9;            // time since ignition (≥ end: idle)
    this.since = 99;       // time since the last event
    this.prevDrive = 0;
    this.shots = 0;
    this.firedNow = false;
  }

  // st: the Event Horizon state (read and written in place), after DMFMassDriver.update.
  DMFLightspeed.prototype.update = function (st, inp, ids, dt) {
    var tier = st.performanceTier;
    var compact = !!st.compact;
    var a = AUTH[(tier === 'balanced' || tier === 'lite' || tier === 'static' ? tier : 'high') + (compact ? 'C' : '')];
    var calm = st.calm;
    var silence = st.silence || 0;
    var still = tier === 'static';
    var drive = st.drive || 0;

    // --- TRIGGER: only a Mass Driver release, only where the stage is energetic, ≥ 6 s apart ---
    this.since += dt;
    this.firedNow = false;
    if (drive > 0 && this.prevDrive <= 0 && ENERGETIC[ids[st.index]] && calm < 0.3 && !still && silence < 0.3 && this.since >= LIMITS.gap) {
      this.t = 0; this.since = 0; this.shots++; this.firedNow = true;
    }
    this.prevDrive = drive;
    var t = -1;
    if (this.t < LIMITS.end) { this.t += dt; t = this.t; }
    var live = (1 - silence) * (1 - clamp01((calm - 0.3) / 0.3)) * (still ? 0 : 1);
    var on = t >= 0 && t < LIMITS.end ? live : 0;

    // --- SPACE COMPRESSION: rides the Mass Driver precompression (before and at ignition) ---
    var compression = clamp01(st.precompress || 0) * live * (still ? 0 : 1);
    st.spaceCompression = clamp01(compression * Math.max(a.cam, a.light));
    st.lensPressure = clamp01(compression * a.cam);

    // --- THE EVENT ---
    var ign = on * at(t, T.ignition);
    st.lightspeed = clamp01(on * at(t, T.core));
    st.velocityField = clamp01(on * at(t, T.front) * Math.max(a.refl, a.light));
    // Camera: desktop bound × camera authority, then the device's own hard bound (phones ≤ 1.2°, ≤ 0.07 u).
    var fovMax = compact ? LIMITS.fovMobile : LIMITS.fovDesktop;
    st.fovKick = clamp(a.cam * (on * at(t, T.fov) - LIMITS.compressFov * compression), -LIMITS.compressFov, 1);
    st.fovDeg = clamp(st.fovKick * LIMITS.fovDesktop, -LIMITS.compressFov * fovMax, fovMax);
    var dollyMax = compact ? LIMITS.dollyMobile : LIMITS.dollyDesktop;
    st.depthStretch = clamp01(a.cam * on * at(t, T.depth));
    st.depthDolly = clamp(st.depthStretch * LIMITS.dollyDesktop, 0, dollyMax);
    st.receiverAnchor = clamp01(0.7 * st.lightspeed * a.cam);
    st.reflectionVelocity = clamp01(a.refl * on * at(t, T.reflection));
    st.bladeVelocity = clamp01(a.light * on * at(t, T.blade));
    st.floorVelocity = clamp01(a.body * on * at(t, T.floor));
    st.titleTrail = clamp01(a.type * on * at(t, T.title));
    st.titleSnap = clamp01(a.type * on * at(t, T.snap));
    st.lsIgnition = clamp01(ign * a.light);
    st.lsHead = clamp01(a.body * on * at(t, T.head));
    st.lsShoulder = clamp01(a.body * on * at(t, T.shoulder));
    st.lsTorso = clamp01(a.body * on * at(t, T.torso));
    st.speakerHold = clamp01(compression * a.body);
    st.speakerRelease = clamp01(ign * a.body);

    // --- V3–V5 terms answer inside their own bounds (modulated, never rewritten) ---
    var edge = on * at(t, T.edge) * a.light;
    st.woofer = Math.min(0.04, (st.woofer || 0) * (1 - LIMITS.wooferHold * st.speakerHold + LIMITS.wooferRelease * st.speakerRelease));
    st.floorPress = clamp01(Math.max(st.floorPress || 0, st.floorVelocity));
    st.halo = clamp01(Math.max(st.halo || 0, 0.5 * edge, 0.35 * st.lightspeed * a.light));
    st.gravity = clamp01((st.gravity || 0) * (1 - 0.5 * st.lightspeed));
    st.sunScale = clamp((st.sunScale || 0) - LIMITS.sunContract * st.spaceCompression + LIMITS.sunExpand * st.lightspeed * a.light, -0.03, 0.03);
    st.reflectionShock = clamp01(Math.max(st.reflectionShock || 0, 0.6 * st.reflectionVelocity));
    st.lightVelocity = clamp01(Math.max(st.lightVelocity || 0, st.bladeVelocity));
    return st;
  };

  // Composed and motionless: every LIGHTSPEED term at rest (the authored pose).
  DMFLightspeed.prototype.compose = function (st) {
    st.lightspeed = 0; st.spaceCompression = 0; st.lensPressure = 0; st.velocityField = 0; st.fovKick = 0; st.fovDeg = 0;
    st.depthStretch = 0; st.depthDolly = 0; st.receiverAnchor = 0; st.reflectionVelocity = 0; st.bladeVelocity = 0;
    st.floorVelocity = 0; st.titleTrail = 0; st.titleSnap = 0; st.lsIgnition = 0; st.lsHead = 0; st.lsShoulder = 0;
    st.lsTorso = 0; st.speakerHold = 0; st.speakerRelease = 0;
    return st;
  };

  var api = { LIMITS: LIMITS, TIMELINE: T, ENERGETIC: ENERGETIC, AUTH: AUTH, pulse: pulse, DMFLightspeed: DMFLightspeed };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFLightspeed = api;
})(typeof window !== 'undefined' ? window : this);
