/* DMF MASS DRIVER — pure acceleration layer for the Event Horizon director (V5). ES5, no DOM, no clock, no timers.
 * The director steps it after the V4 Black Sun with the same state object. It stores the music as charge,
 * anticipates a meaningful kick with a short precompression, and — once charged — fires one drive shot:
 * PRECOMPRESSION → RELEASE → COAST → RECOVERY. Every system answers that same physical event, each a little
 * later than the one before (the signature): pressure at 0 ms, Receiver/camera release ~40 ms, head before
 * shoulders before torso, speakers ~60 ms and floor ~100 ms, Black Sun edge and light ~100 ms, reflections
 * ~150 ms, then coast and a heavy recovery to ~740 ms. A neighbouring-section cut taken at speed can launch
 * it too. Silence drains everything; the offer never fires. Every term is hard-clamped here.
 * Inlined into public/index.html by scripts/build-3d.cjs after black-sun.js; required by tests. */
(function (root) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function envelope(cur, target, attack, release, dt) {
    return cur + (target - cur) * (1 - Math.exp(-(target > cur ? attack : release) * dt));
  }
  // One response to the shot: silent until `delay`, a smooth attack, a coast, then a smooth, heavy return
  // that lands at 0 by `end` (no overshoot, no bounce, never negative).
  function pulse(t, delay, attack, end) {
    if (t < delay || t >= end) return 0;
    var u = t - delay;
    if (u < attack) return smooth01(u / attack);
    return 1 - smooth01((u - attack) / (end - delay - attack));
  }

  var LIMITS = {
    shotEnd: 0.74,         // PRECOMPRESSION → RELEASE → COAST → RECOVERY, ~740 ms
    gap: 1.2,              // hard rate limit between shots
    fireKick: 0.6,         // only meaningful kicks
    fireCharge: 0.5,       // only once enough potential is stored (sustained, strong signal)
    anticipate: 0.15,      // precompression window before a predicted beat
    launchDelay: 0.2,      // a section launch releases after the V4 cut's dark hold
    launchSpeed: 0.25,     // and only when the scroll carries real velocity
    sunContract: 0.012,    // added contraction; the V4 ±3% clamp still wins
    wooferAdd: 0.012       // wavefront pressure; the V3 4% cone budget still wins
  };
  // The shot's timeline (seconds from the release reference): [delay, attack, end].
  var T = {
    pre: [0, 0.03, 0.12],
    release: [0.04, 0.07, 0.68],
    head: [0.03, 0.05, 0.35],
    shoulder: [0.07, 0.07, 0.45],
    torso: [0.12, 0.1, 0.6],
    mass: [0.04, 0.05, 0.32],
    settle: [0.28, 0.12, 0.72],
    wave: [0.06, 0.03, 0.22],
    floor: [0.1, 0.05, 0.4],
    edge: [0.1, 0.06, 0.5],
    refl: [0.15, 0.07, 0.55],
    type: [0.08, 0.06, 0.45],
    typeSettle: [0.3, 0.12, 0.72],
    lift: [0.06, 0.12, 0.62],
    roll: [0.05, 0.1, 0.6]
  };
  function at(t, k) { return pulse(t, k[0], k[1], k[2]); }
  var ENERGETIC = { hero: 1, relic: 1, band: 1, releases: 1, sets: 1 };

  function DMFMassDriver() {
    this.charge = 0;
    this.antic = 0;
    this.driveT = 9;          // time since the shot's release reference (≥ shotEnd: idle)
    this.amp = 0;
    this.sign = 1;
    this.sinceDrive = 9;
    this.prevHold = 0;
    this.shots = 0;
    this.firedNow = false;
  }

  // st: the Event Horizon state (read and written in place), after DMFBlackSun.update.
  DMFMassDriver.prototype.update = function (st, inp, ids, dt) {
    var s = inp.s || st;
    var tier = st.performanceTier;
    var still = tier === 'static';
    var lite = tier === 'lite';
    var balanced = tier === 'balanced';
    var compact = !!st.compact;
    var calm = st.calm;
    var sanct = clamp01((calm - 0.6) / 0.25);
    var silence = st.silence || 0;
    var energetic = ENERGETIC[ids[st.index]] ? 1 : 0;

    // Authority per tier. Phones reduce camera acceleration hardest; BALANCED keeps the physical camera
    // and model response, trims light and type; LITE ~45%; STATIC none.
    var camK = still ? 0 : (compact ? 0.35 : 1) * (lite ? 0.45 : 1);
    var bodyK = still ? 0 : (compact ? 0.42 : 1) * (lite ? 0.45 : 1);
    var detailK = still ? 0 : (compact ? 0.42 : 1) * (lite ? 0.45 : (balanced ? 0.6 : 1));
    var sunK = (compact ? 0.45 : 1) * (lite ? 0.6 : 1);
    var live = st.wake * (1 - silence) * (1 - sanct) * (still ? 0 : 1);

    // --- CHARGE: sustained LOW + ENERGY store potential slowly; silence and the offer drain it ---
    var feed = clamp01(0.6 * st.low + 0.4 * st.energy) * live;
    this.charge = envelope(this.charge, feed, 0.35, 0.8 + 2.5 * silence, dt);
    st.charge = clamp01(this.charge);

    this.sinceDrive += dt;
    var ready = energetic && calm < 0.3 && !still && silence < 0.3 && st.wake > 0.95 && st.running;

    // --- PRECOMPRESSION (anticipation): in the last 150 ms before a predicted beat, once charged ---
    var ttb = s.timeToBeat;
    var armed = ready && st.charge >= LIMITS.fireCharge && this.sinceDrive >= LIMITS.gap - LIMITS.anticipate && (s.energy || 0) >= 0.5;
    var aT = armed && ttb > 0 && ttb <= LIMITS.anticipate ? 1 - ttb / LIMITS.anticipate : 0;
    this.antic = envelope(this.antic, aT, 25, 14, dt);

    // --- FIRE: a meaningful kick after enough charge, rate-limited; the shot spends the charge ---
    this.firedNow = false;
    if (s.beatFired && (s.kick || 0) >= LIMITS.fireKick && ready && st.charge >= LIMITS.fireCharge && this.sinceDrive >= LIMITS.gap) {
      this.driveT = 0; this.sinceDrive = 0; this.sign = -this.sign; this.shots++; this.firedNow = true;
      this.amp = clamp01(0.55 + 0.45 * st.charge);
      this.charge *= 0.15;                                  // the shot spends most of the stored potential
      st.charge = this.charge;
    }
    // --- SECTION LAUNCH: the V4 cut, taken at speed between neighbouring major sections ---
    var hold = st.hold || 0;
    if (hold > 0.001 && this.prevHold <= 0.001 && Math.abs(st.velocity) >= LIMITS.launchSpeed && this.sinceDrive >= LIMITS.gap &&
        calm < 0.3 && !still && silence < 0.5 && st.wake > 0.95 && st.running) {
      this.driveT = -LIMITS.launchDelay; this.sinceDrive = 0; this.shots++; this.firedNow = true;
      this.sign = st.velocity >= 0 ? 1 : -1;
      this.amp = 0.7;
    }
    this.prevHold = hold;

    var t = -1;
    if (this.driveT < LIMITS.shotEnd) { this.driveT += dt; t = this.driveT; }
    var a = t >= 0 && t < LIMITS.shotEnd ? this.amp * (1 - silence) * (1 - sanct) : 0;

    // --- THE SHOT: every system answers the same event, each a little later ---
    var pre = a * at(t, T.pre);
    st.precompress = clamp01(Math.max(this.antic * 0.8 * live, pre));
    st.drive = clamp01(a * at(t, T.release));
    st.driveDolly = clamp(camK * (st.drive - 0.35 * st.precompress), -0.35, 1);
    st.driveLift = clamp01(camK * a * at(t, T.lift));
    st.driveRoll = clamp(camK * a * at(t, T.roll) * this.sign, -1, 1);
    st.driveLateral = clamp(camK * a * at(t, T.roll) * this.sign * 0.8, -1, 1);
    st.driveMass = clamp01(bodyK * a * at(t, T.mass));
    st.driveSettle = clamp01(bodyK * a * at(t, T.settle));
    st.driveHead = clamp01(bodyK * a * at(t, T.head));
    st.driveShoulder = clamp(bodyK * a * at(t, T.shoulder) * this.sign, -1, 1);
    st.driveTorso = clamp01(bodyK * a * at(t, T.torso));
    st.wavefront = clamp01(bodyK * a * at(t, T.wave));
    st.floorWave = clamp01(bodyK * a * at(t, T.floor));
    var edge = a * at(t, T.edge);
    var refl = a * at(t, T.refl);
    st.lightVelocity = clamp01(detailK * Math.max(edge, 0.6 * st.speed / 0.8 * live));
    st.lightCompression = clamp01(detailK * st.precompress);
    st.typeVelocity = clamp01(detailK * a * at(t, T.type));
    st.typeSettle = clamp01(detailK * a * at(t, T.typeSettle));

    // --- V4 / V3 terms answer inside their own bounds (never rewritten, only modulated) ---
    st.gravity = clamp01(Math.max(st.gravity || 0, 0.8 * st.precompress * sunK));
    st.sunScale = clamp((st.sunScale || 0) - LIMITS.sunContract * st.precompress * sunK, -0.03, 0.03);
    st.halo = clamp01(Math.max(st.halo || 0, 0.6 * edge * sunK));
    st.reflectionShock = clamp01(Math.max(st.reflectionShock || 0, 0.7 * refl * detailK));
    st.titlePressure = clamp01(Math.max(st.titlePressure || 0, 0.5 * st.precompress * detailK));
    st.woofer = Math.min(0.04, (st.woofer || 0) + LIMITS.wooferAdd * st.wavefront);
    st.floorPress = clamp01(Math.max(st.floorPress || 0, st.floorWave));
    return st;
  };

  // Composed and motionless: nothing charged, nothing driving.
  DMFMassDriver.prototype.compose = function (st) {
    st.charge = 0; st.precompress = 0; st.drive = 0; st.driveDolly = 0; st.driveLift = 0; st.driveRoll = 0;
    st.driveLateral = 0; st.driveMass = 0; st.driveSettle = 0; st.driveHead = 0; st.driveShoulder = 0; st.driveTorso = 0;
    st.wavefront = 0; st.floorWave = 0; st.lightVelocity = 0; st.lightCompression = 0; st.typeVelocity = 0; st.typeSettle = 0;
    return st;
  };

  var api = { LIMITS: LIMITS, TIMELINE: T, ENERGETIC: ENERGETIC, pulse: pulse, DMFMassDriver: DMFMassDriver };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFMassDriver = api;
})(typeof window !== 'undefined' ? window : this);
