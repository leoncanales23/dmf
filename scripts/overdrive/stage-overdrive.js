/* DMF STAGE OVERDRIVE — pure mapping layer for the Event Horizon director (V3). ES5, no DOM, no clock.
 * One choreography, not a set of effects. The director steps it after the V2 Spatial Narrative, with the
 * same state object, and it adds the weight: the Receiver's monumental presence, acoustic pressure that
 * separates LOW from KICK, a figure that breathes and carries inertia, a light that trails the camera,
 * depth compression across section boundaries and a quieter offer. Every term is bounded here.
 * Inlined into public/index.html by scripts/build-3d.cjs after spatial-narrative.js; required by tests. */
(function (root) {
  'use strict';

  var SN = typeof module === 'object' && module.exports ? require('./spatial-narrative.js') : root.DMFSpatialNarrative;
  var Critical = SN.DMFCritical;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function envelope(cur, target, attack, release, dt) {
    return cur + (target - cur) * (1 - Math.exp(-(target > cur ? attack : release) * dt));
  }

  // Hard limits (radians for rotations, fractions for scale / excursion).
  var LIMITS = {
    modelYaw: 0.03,        // ±1.7°
    modelPitch: 0.017,     // ±1°
    modelMassMin: 0.94,    // entry starts 6% small …
    modelMassMax: 1.03,    // … and may overshoot at most 3%
    modelNear: 0.035,      // +3.5% when the visitor comes close
    woofer: 0.04,          // cone excursion ≤ 4%
    breath: 1,
    bodyLag: 0.03
  };

  // Sections where the framed images line up (HERO → RELEASES → SETS): the reflection reads more there.
  var SHEEN = { hero: 1.25, band: 1.2, releases: 1.35, sets: 1.3 };

  // Underdamped spring (ζ < 1) for the one place a small overshoot is wanted: the Receiver's entry.
  function DMFMass(omega, zeta) { this.x = 0; this.v = 0; this.w = omega; this.z = zeta; }
  DMFMass.prototype.step = function (target, dt) {
    var n = dt > 0.02 ? Math.ceil(dt / 0.02) : 1, h = dt / n, w = this.w, z = this.z;
    for (var i = 0; i < n; i++) {
      this.v += (w * w * (target - this.x) - 2 * z * w * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  };

  function DMFStageOverdrive() {
    this.mass = new DMFMass(6.5, 0.55);      // ~0.8% overshoot on a 6% entry, settles in ~1.2 s
    this.mass.x = 1;                          // at rest until the Receiver arrives
    this.arrived = false;
    this.near = new Critical(1.8);
    this.yaw = new Critical(2.2);
    this.pitch = new Critical(2.2);
    this.push = new Critical(10);
    this.kickEnv = 0;                         // KICK: instant hit, heavy exponential release …
    this.kickOut = 0;                         // … eased over ~30 ms so the cone never pops
    this.settle = new DMFMass(9, 0.85);       // cabinet settle after the kick, one soft return
    this.bodyLag = new Critical(1.1);
    this.light = new Critical(1.6);           // the light trails the camera
    this.woofer = 0;
    this.spec = 0;
    this.compress = 0;
    this.breathT = 0;
    this.light.x = 0.5;
  }

  // st: the Event Horizon state (read and written in place), after DMFSpatialNarrative.update.
  DMFStageOverdrive.prototype.update = function (st, inp, ids, dt) {
    var s = inp.s || st;
    var tier = st.performanceTier;
    var compact = !!st.compact;
    var calm = st.calm;
    var still = tier === 'static';
    var live = st.wake * (1 - 0.72 * calm) * (still ? 0 : 1);   // the offer keeps ~28% of the response
    var section = ids[st.index];
    var kickHit = s.beatFired ? clamp01(0.35 + 0.65 * (s.kick || 0)) * live : 0;

    // --- RECEIVER: monumental entry (once), approach depth, micro rotation, camera push, HIGH light ---
    if (!this.arrived && section === 'relic' && st.running) {
      this.arrived = true;
      this.mass.x = LIMITS.modelMassMin;
      this.mass.v = 0;
    }
    st.modelMass = clamp(this.mass.step(1, dt), LIMITS.modelMassMin, LIMITS.modelMassMax);
    var nearT = (section === 'relic' || section === 'hero' ? st.focus : 0) * (1 - calm);
    st.modelNear = clamp01(this.near.step(nearT, dt)) * LIMITS.modelNear * (compact ? 0.5 : 1);
    var rotK = (compact ? 0.4 : 1) * (1 - 0.8 * calm) * (still ? 0 : 1);
    var ptr = inp.pointerActive ? 1 : 0;
    st.modelYaw = clamp(this.yaw.step((0.6 * st.pointerX * ptr + 0.4 * st.velocity / 0.8) * rotK, dt), -1, 1) * LIMITS.modelYaw;
    st.modelPitch = clamp(this.pitch.step((-0.5 * st.pointerY * ptr + 0.3 * st.velocity / 0.8) * rotK, dt), -1, 1) * LIMITS.modelPitch;
    if (kickHit > 0) this.push.v += 6 * kickHit;
    st.modelPush = clamp(this.push.step(0.4 * st.low * live, dt), 0, 1);
    this.spec = envelope(this.spec, st.high * live, 12, 3, dt);
    st.modelSpec = clamp01(this.spec);

    // --- ACOUSTIC PRESSURE: LOW is sustained (fast attack, heavy release); KICK is an impulse ---
    this.woofer = envelope(this.woofer, st.low * live, 16, 2.2, dt);
    st.wooferLow = clamp01(this.woofer);
    this.kickEnv = kickHit > this.kickEnv ? kickHit : this.kickEnv * Math.exp(-5 * dt);
    this.kickOut = envelope(this.kickOut, this.kickEnv, 30, 30, dt);
    st.wooferKick = clamp01(this.kickOut);
    // Total excursion stays inside the 4% budget whatever the mix.
    st.woofer = Math.min(LIMITS.woofer, 0.028 * st.wooferLow + 0.012 * st.wooferKick + 0.008 * (st.heroMoment || 0));
    // The cabinet settles after a kick (one soft return, never a vibration).
    if (kickHit > 0) this.settle.v += 5 * kickHit;
    st.cabinet = clamp(this.settle.step(0, dt), -0.4, 1);
    st.floorPress = clamp01(Math.max(0.7 * st.wooferLow, st.wooferKick) + 0.5 * (st.heroMoment || 0));

    // --- FIGURE: minimal breath, body inertia behind the head, phones at 38% ---
    this.breathT += dt;
    var figK = (compact ? 0.38 : 1) * (1 - 0.7 * calm) * st.wake * (still ? 0 : 1);
    st.breath = Math.sin(this.breathT * 2 * Math.PI * 0.21) * figK;
    st.bodyLag = clamp(this.bodyLag.step(st.headYaw || 0, dt), -LIMITS.bodyLag, LIMITS.bodyLag);

    // --- REFLECTION FIELD: the V2 light, trailing the camera and pushed by scroll velocity ---
    var target = (st.lightX == null ? 0.5 : st.lightX) + 0.06 * (st.camPan || 0) / SN.LIMITS.pan + 0.1 * st.velocity;
    st.lightX = clamp(this.light.step(target, dt), -0.1, 1.1);
    st.sheenK = (SHEEN[section] || 1) * (1 - 0.5 * calm);

    // --- SECTION TRANSITIONS: depth compresses into a boundary and opens after it ---
    var edge = Math.min(st.progress, 1 - st.progress);
    this.compress = envelope(this.compress, edge < 0.12 ? 1 - edge / 0.12 : 0, 6, 3, dt);
    st.compress = clamp01(this.compress) * (1 - calm);
    st.zk = clamp((st.zk == null ? 0.5 : st.zk) * (1 - 0.35 * st.compress), 0.05, 1);
    return st;
  };

  DMFStageOverdrive.prototype.compose = function (st) {
    st.modelMass = 1; st.modelNear = 0; st.modelYaw = 0; st.modelPitch = 0; st.modelPush = 0; st.modelSpec = 0;
    st.wooferLow = 0; st.wooferKick = 0; st.woofer = 0; st.cabinet = 0; st.floorPress = 0;
    st.breath = 0; st.bodyLag = 0; st.sheenK = 1; st.compress = 0;
    return st;
  };

  var api = { LIMITS: LIMITS, SHEEN: SHEEN, DMFMass: DMFMass, DMFStageOverdrive: DMFStageOverdrive };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFStageOverdrive = api;
})(typeof window !== 'undefined' ? window : this);
