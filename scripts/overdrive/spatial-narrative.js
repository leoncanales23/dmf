/* DMF SPATIAL NARRATIVE — pure mapping layer for the Event Horizon director (V2). ES5, no DOM, no clock.
 * "The page is not scrolling. The stage is moving around you."
 * DMFEventHorizon.update() calls DMFSpatialNarrative.update() once per director step with its own state;
 * this module turns section + progress + audio + pointer into one continuous camera and its companions:
 *   camera grammar (pan / tilt / roll / dolly / depth scale) with hard limits and critically damped motion,
 *   acoustic pressure (the weight of the low end), head/figure orientation, pointer gravity, one light
 *   source that crosses the whole page, the section afterimage and the once-per-visit hero moment.
 * Inlined into public/index.html by scripts/build-3d.cjs before event-horizon.js; required by tests. */
(function (root) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }

  // Hard limits. Degrees for angles; dolly and depth are fractions. Nothing past these, ever.
  var LIMITS = { pan: 1.2, tilt: 0.8, roll: 0.25, dolly: 0.025, headYaw: 0.03, headPitch: 0.02, gravity: 1 };

  // Camera grammar: the spatial state of each section. z = how much depth the section's planes carry.
  // sweep = lateral travel across the section (pan runs -sweep/2 .. +sweep/2 with progress).
  var POSES = {
    intro:     { pan: 0,     tilt: 0,     roll: 0,     dolly: -0.012, sweep: 0,   z: 0.5 },   // frontal, monumental
    hero:      { pan: 0.35,  tilt: -0.15, roll: 0,     dolly: 0.015,  sweep: 0,   z: 1 },     // slight dolly-in
    relic:     { pan: 0,     tilt: -0.1,  roll: 0,     dolly: 0.01,   sweep: 0,   z: 0.9 },
    bio:       { pan: -0.4,  tilt: 0.15,  roll: 0.12,  dolly: 0,      sweep: 0,   z: 0.8 },
    band:      { pan: 0.45,  tilt: 0,     roll: -0.1,  dolly: 0.01,   sweep: 0,   z: 0.9 },
    releases:  { pan: 0,     tilt: 0.1,   roll: 0,     dolly: 0,      sweep: 1.4, z: 0.8 },   // lateral pass
    sets:      { pan: -0.2,  tilt: -0.6,  roll: 0,     dolly: 0.012,  sweep: 0,   z: 0.9 },   // DJ: camera low
    platforms: { pan: 0.2,   tilt: -0.35, roll: 0,     dolly: 0.006,  sweep: 0,   z: 0.7 },
    rider:     { pan: -0.2,  tilt: -0.3,  roll: 0,     dolly: 0.004,  sweep: 0,   z: 0.7 },
    academy:   { pan: 0,     tilt: 0,     roll: 0,     dolly: 0,      sweep: 0,   z: 0.45 },  // stabilises
    offer:     { pan: 0,     tilt: 0,     roll: 0,     dolly: 0,      sweep: 0,   z: 0.15 },  // rest
    lab:       { pan: 0.2,   tilt: 0,     roll: 0,     dolly: 0.004,  sweep: 0,   z: 0.6 },
    tips:      { pan: -0.15, tilt: -0.6,  roll: 0,     dolly: 0.015,  sweep: 0,   z: 0.85 },  // mixer: low camera
    contact:   { pan: 0,     tilt: 0.25,  roll: 0,     dolly: -0.012, sweep: 0,   z: 0.5 }    // closing depth
  };
  var NEUTRAL = { pan: 0, tilt: 0, roll: 0, dolly: 0, sweep: 0, z: 0.5 };
  function poseOf(id) { return POSES[id] || NEUTRAL; }

  // Camera authority per tier / device. COMPACT keeps cameras almost neutral.
  var TIER_CAMERA = { high: 1, balanced: 0.75, lite: 0.5, static: 0 };
  var COMPACT_CAMERA = 0.3;
  var COMPACT_HEAD = 0.4;
  var AFTER_DUR = { high: 0.55, balanced: 0.42 };
  var AFTER_AMP = { high: 1, balanced: 0.6 };
  var MOMENT_DUR = 0.45;

  // Critically damped spring, semi-implicit, sub-stepped: returns to rest without overshoot.
  function DMFCritical(omega) { this.x = 0; this.v = 0; this.w = omega; }
  DMFCritical.prototype.step = function (target, dt) {
    var n = dt > 0.02 ? Math.ceil(dt / 0.02) : 1, h = dt / n, w = this.w;
    for (var i = 0; i < n; i++) {
      this.v += (w * w * (target - this.x) - 2 * w * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  };

  function DMFSpatialNarrative() {
    this.pan = new DMFCritical(2.2);
    this.tilt = new DMFCritical(2.2);
    this.roll = new DMFCritical(1.8);
    this.dolly = new DMFCritical(2.4);
    this.z = new DMFCritical(2);
    this.press = new DMFCritical(16);
    this.yaw = new DMFCritical(1.6);
    this.pitch = new DMFCritical(1.6);
    this.gx = new DMFCritical(4);
    this.gy = new DMFCritical(4);
    this.light = new DMFCritical(2.5);
    this.seenGate = 0;
    this.afterT = 9;
    this.afterDur = 0.55;
    this.afterAmp = 1;
    this.momentT = 9;
    this.heroFired = false;     // seeded from sessionStorage by the page: once per visit
    this.heroFiredNow = false;
    this.z.x = 0.5;
    this.light.x = 0.5;
  }

  // st: the Event Horizon state (read and written in place). inp: the director input. dt in seconds.
  DMFSpatialNarrative.prototype.update = function (st, inp, ids, dt) {
    var s = inp.s || st;
    var tier = st.performanceTier;
    var compact = !!st.compact;
    var calm = st.calm;
    var damp = st.wake * (1 - 0.55 * calm);

    // --- CAMERA GRAMMAR: this section's pose, easing into the next one over its last 40% ---
    var a = poseOf(ids[st.index]), b = poseOf(ids[st.index + 1]);
    var k = smooth01((st.progress - 0.6) / 0.4);
    var auth = (TIER_CAMERA[tier] == null ? 1 : TIER_CAMERA[tier]) * (compact ? COMPACT_CAMERA : 1) * (1 - calm);
    var pan = (a.pan + (b.pan - a.pan) * k + a.sweep * (st.progress - 0.5) * (1 - k)) * auth;
    var tilt = (a.tilt + (b.tilt - a.tilt) * k) * auth;
    var roll = (a.roll + (b.roll - a.roll) * k) * auth;
    var dolly = (a.dolly + (b.dolly - a.dolly) * k) * auth;
    var zk = (a.z + (b.z - a.z) * k) * (1 - 0.6 * calm);

    // --- AUDIO MASS: pressure is the low end's weight (ζ = 1); a kick loads it, it never bounces ---
    if (s.beatFired) this.press.v += 5 * clamp01(0.3 + 0.7 * (s.kick || 0)) * damp;
    var press = clamp(this.press.step(0.35 * st.low, dt), 0, 1);
    st.pressure = press;

    // --- HERO MOMENT: once per visit, the first strong kick after the stage is awake (intro/hero) ---
    this.heroFiredNow = false;
    if (!this.heroFired && st.wake >= 1 && s.beatFired && (s.kick || 0) >= 0.55 && (s.energy || 0) >= 0.3 &&
        (ids[st.index] === 'intro' || ids[st.index] === 'hero') && tier !== 'lite' && tier !== 'static') {
      this.heroFired = true;
      this.heroFiredNow = true;
      this.momentT = 0;
    }
    var moment = 0;
    if (this.momentT < MOMENT_DUR) {
      this.momentT += dt;
      var mt = this.momentT;
      moment = mt < 0.07 ? mt / 0.07 : Math.exp(-(mt - 0.07) * 9) * (1 - smooth01((mt - 0.3) / (MOMENT_DUR - 0.3)));
    }
    st.heroMoment = clamp01(moment);

    // Camera: the pose, compressed by pressure and the hero moment, followed critically damped.
    st.camPan = clamp(this.pan.step(pan, dt), -LIMITS.pan, LIMITS.pan);
    st.camTilt = clamp(this.tilt.step(tilt, dt), -LIMITS.tilt, LIMITS.tilt);
    st.camRoll = clamp(this.roll.step(roll, dt), -LIMITS.roll, LIMITS.roll);
    var dTarget = dolly - 0.006 * press * (compact ? 0.5 : 1) - 0.01 * st.heroMoment;
    st.dolly = clamp(this.dolly.step(dTarget, dt), -LIMITS.dolly, LIMITS.dolly);
    st.zk = clamp(this.z.step(zk, dt), 0.1, 1) * (compact ? 0.45 : 1);

    // --- HEAD / FIGURE: slow orientation to rest; pointer + camera + section focus + mids ---
    var headK = (compact ? COMPACT_HEAD : 1) * (tier === 'static' ? 0 : 1) * (1 - 0.6 * calm);
    var ptr = inp.pointerActive ? 1 : 0;
    var yawT = (0.55 * st.pointerX * ptr + 0.3 * (st.camPan / LIMITS.pan) + 0.15 * (st.focus - 0.5) * (a.pan >= 0 ? 1 : -1)) * headK;
    var pitchT = (-0.45 * st.pointerY * ptr + 0.35 * st.mid - 0.15 * (st.camTilt / LIMITS.tilt)) * headK;
    st.headYaw = clamp(this.yaw.step(yawT, dt), -1, 1) * LIMITS.headYaw;
    st.headPitch = clamp(this.pitch.step(pitchT, dt), -1, 1) * LIMITS.headPitch;

    // --- POINTER GRAVITY: soft attack, softer release, neutral at rest; fine pointer, HIGH/BALANCED only ---
    var gAuth = inp.pointerActive && !compact && (tier === 'high' || tier === 'balanced') ? (1 - 0.7 * calm) : 0;
    this.gx.w = gAuth > 0 ? 4 : 2.5;
    this.gy.w = this.gx.w;
    st.gravityX = clamp(this.gx.step(st.pointerX * gAuth, dt), -LIMITS.gravity, LIMITS.gravity);
    st.gravityY = clamp(this.gy.step(st.pointerY * gAuth, dt), -LIMITS.gravity, LIMITS.gravity);

    // --- ONE LIGHT SOURCE: crosses the whole page with scroll, nudged by pointer, speed and HIGH ---
    var lx = 0.5 + 0.34 * Math.sin(2 * Math.PI * 1.25 * clamp01(inp.docProgress || 0)) + 0.1 * st.pointerX * ptr + 0.08 * st.velocity + 0.05 * st.high;
    st.lightX = clamp(this.light.step(lx, dt), -0.1, 1.1);

    // --- AFTERIMAGE: the section left behind leaves one brief trace; the next one absorbs it ---
    if (st.gateId !== this.seenGate) {
      this.seenGate = st.gateId;
      if ((tier === 'high' || tier === 'balanced') && calm < 0.9) {
        this.afterT = 0;
        this.afterDur = AFTER_DUR[tier];
        this.afterAmp = AFTER_AMP[tier] * (compact ? 0.6 : 1);
        st.afterId++;
        st.afterFrom = st.prevIndex == null ? 0 : st.prevIndex;
      }
    }
    var after = 0;
    if (this.afterT < this.afterDur) {
      this.afterT += dt;
      var at = this.afterT / this.afterDur;
      after = this.afterAmp * Math.min(1, at / 0.1) * Math.pow(1 - clamp01(at), 1.6);
    }
    if (tier !== 'high' && tier !== 'balanced') { after = 0; this.afterT = 9; }
    st.afterimage = clamp01(after);
    return st;
  };

  // A still composition: every camera term at rest, nothing transient.
  DMFSpatialNarrative.prototype.compose = function (st) {
    st.camPan = 0; st.camTilt = 0; st.camRoll = 0; st.dolly = 0; st.zk = 0.5; st.pressure = 0;
    st.headYaw = 0; st.headPitch = 0; st.gravityX = 0; st.gravityY = 0; st.lightX = 0.5;
    st.afterimage = 0; st.heroMoment = 0;
    return st;
  };

  var api = {
    LIMITS: LIMITS,
    POSES: POSES,
    TIER_CAMERA: TIER_CAMERA,
    COMPACT_CAMERA: COMPACT_CAMERA,
    COMPACT_HEAD: COMPACT_HEAD,
    AFTER_DUR: AFTER_DUR,
    MOMENT_DUR: MOMENT_DUR,
    DMFCritical: DMFCritical,
    DMFSpatialNarrative: DMFSpatialNarrative
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFSpatialNarrative = api;
})(typeof window !== 'undefined' ? window : this);
