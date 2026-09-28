/* DMF HYPERDRIVE V2 — cinematic choreography layer for the Event Horizon director (V7). ES5, no DOM, no
 * clock, no timers, no allocation per frame. The director steps it after V6 Lightspeed with the same state
 * object; it reads what already exists (bands, kick, the HYPERDRIVE moment, the kinetic SINGULARITY, the
 * beat predictor's time-to-drop, the section/calm/silence of the stage) and writes bounded, smoothed
 * choreography terms the Receiver and the page consume:
 *
 *   DMFEffectGovernor       authority per channel from tier, device, flags and measured FPS — effects shed
 *                           in priority order (overlays → particles → reflections → lights → camera), never
 *                           the Receiver's own interaction.
 *   DMFDropTimeline         the DROP as a sequence anchored on the HYPERDRIVE hit: T−700 compress,
 *                           T−100 edge, T impact, T+200 secondary highlight, T+600 recovery.
 *   DMFSingularityTreatment the rare SINGULARITY (kinetic.js decides when) as a staged treatment:
 *                           collapse → pull → one controlled flash → stretch → release → recovery (≤ 2.8 s).
 *   DMFLightDirector        key / rim / accent / key-sweep / background glow / fog exposure / emissive / side.
 *   DMFCameraDirector       named modes ICON ORBIT PUSH IMPACT FLYBY REVEAL SINGULARITY RECOVERY, followed by
 *                           critically damped, acceleration-limited springs (no swaps, no shake).
 *   DMFReflectionField      the signature reflections: a warm LOW band, a cold HIGH sweep, a kick wave that
 *                           travels through the object, compression toward the centre before a SINGULARITY.
 *   DMFPerformerMotion      head/DJ naturalness: low-passed mids, kick micro-delay, deterministic noise.
 *
 * Inlined into public/index.html by scripts/build-3d.cjs after lightspeed.js; required by tests. */
(function (root) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  function envelope(cur, target, attack, release, dt) { return approach(cur, target, target > cur ? attack : release, dt); }
  // Silent until `delay`, smooth attack, smooth return to exactly 0 at `end`.
  function pulse(t, delay, attack, end) {
    if (t < delay || t >= end) return 0;
    var u = t - delay;
    if (u < attack) return attack > 0 ? smooth01(u / attack) : 1;
    return 1 - smooth01((u - attack) / (end - delay - attack));
  }
  function frac(v) { return v - Math.floor(v); }
  // Deterministic value noise in [-1, 1]: smooth between hashed integer lattice points.
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function noise1(t) {
    var i = Math.floor(t), f = t - i;
    var u = f * f * (3 - 2 * f);
    return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
  }

  // ======================================================================================================
  // FLAGS — __DMF_COMMERCE__.effects from academy-env.js, handed in by the director. A false flag restores the pre-V7 behaviour of
  // its channel exactly (its V7 terms are zero); nothing else changes.
  // ======================================================================================================
  var FLAG_KEYS = ['audioReactive', 'reflections', 'particles', 'cinematicCamera', 'singularityFX'];
  function readFlags(raw) {
    raw = raw || {};
    var out = {};
    for (var i = 0; i < FLAG_KEYS.length; i++) out[FLAG_KEYS[i]] = raw[FLAG_KEYS[i]] !== false;
    return out;
  }

  // ======================================================================================================
  // EFFECT GOVERNOR — who may spend the frame. Priority: receiver > camera > lights > reflections >
  // particles > overlays. Under FPS pressure the lowest priorities shed first; the Receiver never does.
  // ======================================================================================================
  var CHANNELS = ['receiver', 'camera', 'lights', 'reflections', 'particles', 'overlays'];
  var TIER_BASE = {
    high: { receiver: 1, camera: 1, lights: 1, reflections: 1, particles: 1, overlays: 1 },
    balanced: { receiver: 1, camera: 0.85, lights: 0.9, reflections: 0.75, particles: 0.6, overlays: 0.6 },
    lite: { receiver: 1, camera: 0.45, lights: 0.6, reflections: 0.4, particles: 0.25, overlays: 0.2 },
    static: { receiver: 0, camera: 0, lights: 0, reflections: 0, particles: 0, overlays: 0 }
  };
  var COMPACT_CAP = { receiver: 1, camera: 0.4, lights: 0.6, reflections: 0.5, particles: 0.35, overlays: 0.35 };
  var FPS_TARGET = { high: 55, balanced: 45, lite: 30, static: 0 };
  // Shedding order: [channel, how many "steps" of pressure before it starts, floor it never goes under].
  var SHED = [['overlays', 0, 0], ['particles', 1, 0], ['reflections', 2, 0], ['lights', 3, 0.5], ['camera', 4, 0.5]];

  function DMFEffectGovernor() {
    this.pressure = 0;
    this.out = { receiver: 1, camera: 1, lights: 1, reflections: 1, particles: 1, overlays: 1, singularity: 1, pressure: 0 };
  }
  DMFEffectGovernor.prototype.update = function (tier, compact, flags, fps, dt) {
    var base = TIER_BASE[tier] || TIER_BASE.high;
    var target = FPS_TARGET[tier] || 0;
    var want = fps > 0 && target > 0 ? clamp01((target - fps) / 20) : 0;
    // Slow in, slower out: a single bad second never strips the stage, a recovered one restores it gently.
    this.pressure = envelope(this.pressure, want, 0.8, 0.25, dt);
    if (this.pressure < 1e-4) this.pressure = 0;
    var steps = this.pressure * 5;
    var o = this.out;
    for (var i = 0; i < CHANNELS.length; i++) {
      var ch = CHANNELS[i];
      o[ch] = compact ? Math.min(base[ch], COMPACT_CAP[ch]) : base[ch];
    }
    for (var s = 0; s < SHED.length; s++) {
      var cut = clamp01(steps - SHED[s][1]);
      o[SHED[s][0]] *= 1 - cut * (1 - SHED[s][2]);
    }
    if (flags && !flags.reflections) o.reflections = 0;
    if (flags && !flags.particles) o.particles = 0;
    if (flags && !flags.cinematicCamera) o.camera = 0;
    o.singularity = flags && !flags.singularityFX ? 0 : (tier === 'static' ? 0 : 1);
    o.pressure = this.pressure;
    return o;
  };

  // ======================================================================================================
  // DROP TIMELINE — anchored on the HYPERDRIVE hit (engine.js decides the drop; one per drop, 8 s apart).
  // The run-up uses the predictor's time-to-drop, so it only happens when a drop is actually coming.
  // ======================================================================================================
  var DROP = {
    lead: 0.7,                       // T−700 ms: light compresses, motion narrows, reflections retract
    edge: 0.1,                       // T−100 ms: micro blackout / energy compression
    punch: [0, 0.025, 0.2],          // T: impulse
    ring: [0, 0.05, 0.5],            // reflection ring
    secondary: [0.2, 0.06, 0.45],    // T+200 ms: secondary highlight
    recover: 0.6,                    // T+600 ms: recovery starts …
    end: 1.2                         // … and every term is exactly 0 at T+1.2 s
  };
  var DROP_PHASES = ['idle', 'compress', 'edge', 'impact', 'secondary', 'recovery'];

  function DMFDropTimeline() {
    this.t = 9;
    this.lastHyperId = -1;
    this.shots = 0;
    this.firedNow = false;
    this.phase = 'idle';
    this.compress = 0; this.edge = 0; this.punch = 0; this.ring = 0; this.secondary = 0; this.recovery = 0;
  }
  DMFDropTimeline.prototype.update = function (sig, hyper, dt, live) {
    this.firedNow = false;
    var hid = hyper ? hyper.id : 0;
    if (this.lastHyperId < 0) this.lastHyperId = hid;           // never fire for a moment that predates us
    if (hyper && hyper.active && hid !== this.lastHyperId) {
      this.t = 0; this.shots++; this.firedNow = live > 0;
    }
    this.lastHyperId = hid;
    var inEvent = this.t < DROP.end;
    if (inEvent) this.t += dt;
    var t = inEvent ? this.t : -1;

    var ttd = sig && sig.timeToDrop != null ? sig.timeToDrop : -1;
    var canFire = !hyper || typeof hyper.canFire !== 'function' || hyper.canFire();
    var approaching = !inEvent && ttd > 0 && ttd <= DROP.lead && canFire;
    var compress = 0, edge = 0;
    if (approaching) {
      compress = smooth01((DROP.lead - ttd) / (DROP.lead - DROP.edge));
      edge = ttd <= DROP.edge ? smooth01((DROP.edge - ttd) / DROP.edge) : 0;
    } else if (t >= 0) {
      compress = 1 - smooth01(t / 0.12);                      // the compression releases into the hit
    }
    this.compress = clamp01(compress * live);
    this.edge = clamp01(edge * live);
    this.punch = clamp01(pulse(t, DROP.punch[0], DROP.punch[1], DROP.punch[2]) * live);
    this.ring = clamp01(pulse(t, DROP.ring[0], DROP.ring[1], DROP.ring[2]) * live);
    this.secondary = clamp01(pulse(t, DROP.secondary[0], DROP.secondary[1], DROP.secondary[2]) * live);
    this.recovery = t >= DROP.recover && t < DROP.end ? clamp01((1 - smooth01((t - DROP.recover) / (DROP.end - DROP.recover))) * live) : 0;
    this.phase = t >= 0 ? (t < 0.2 ? 'impact' : (t < DROP.recover ? 'secondary' : 'recovery'))
      : (approaching && live > 0 ? (edge > 0 ? 'edge' : 'compress') : 'idle');
    return this;
  };
  DMFDropTimeline.prototype.compose = function () {
    this.t = 9; this.phase = 'idle';
    this.compress = 0; this.edge = 0; this.punch = 0; this.ring = 0; this.secondary = 0; this.recovery = 0;
    return this;
  };

  // ======================================================================================================
  // SINGULARITY TREATMENT — the kinetic SINGULARITY is already rare (≥ 12 s, every 2nd drop or an armed
  // forced drop, 700 ms predicted run-up). This turns it into one staged moment and adds its own ≥ 12 s
  // guard, so the flash can never repeat inside a cooldown whatever happens upstream.
  // ======================================================================================================
  var SING = {
    gap: 12,
    end: 2.8,
    flash: [0, 0.02, 0.16],          // one controlled flash at impact
    pull: [0, 0.08, 0.9],            // the camera is drawn in
    stretch: [0, 0.14, 1.5],         // the background field stretches backward
    dominance: [0, 0.1, 2.2],        // the Receiver dominates the frame
    release: [0.25, 0.25, 1.4],      // spatial release
    recover: 1.4
  };
  function DMFSingularityTreatment() {
    this.t = 9;
    this.since = 99;
    this.lastHitId = -1;
    this.shots = 0;
    this.firedNow = false;
    this.flashOK = false;
    this.phase = 'idle';
    this.collapse = 0; this.lightCompress = 0; this.pull = 0; this.flash = 0; this.stretch = 0;
    this.dominance = 0; this.release = 0; this.recovery = 0;
  }
  DMFSingularityTreatment.prototype.update = function (sing, dt, authority) {
    this.since += dt;
    this.firedNow = false;
    // kinetic.js numbers an event when its precompression starts; the impact is the frame `hit` is set.
    // One treatment per event id, whatever repeats upstream.
    var sid = sing ? sing.id : 0;
    if (sing && sing.hit && sid !== this.lastHitId) {
      this.lastHitId = sid;
      this.flashOK = this.since >= SING.gap;
      if (this.flashOK) { this.t = 0; this.since = 0; this.shots++; this.firedNow = authority > 0; }
    }
    var inEvent = this.t < SING.end;
    if (inEvent) this.t += dt;
    var t = inEvent ? this.t : -1;
    var pre = sing && sing.active && sing.t < 0 ? clamp01(sing.pre || 0) : 0;
    var ign = sing && sing.active ? clamp01(sing.ignition || 0) : 0;
    var a = clamp01(authority);
    // Before the hit: reflections collapse toward the centre and the light compresses with the precompression.
    this.collapse = clamp01(Math.max(pre, t >= 0 ? 1 - smooth01(t / 0.35) : 0) * a);
    this.lightCompress = clamp01(Math.max(pre, t >= 0 ? 1 - smooth01(t / 0.1) : 0) * a);
    this.pull = clamp01(Math.max(0.6 * ign, pulse(t, SING.pull[0], SING.pull[1], SING.pull[2])) * a);
    this.flash = this.flashOK ? clamp01(pulse(t, SING.flash[0], SING.flash[1], SING.flash[2]) * a) : 0;
    this.stretch = clamp01(Math.max(0.25 * pre, pulse(t, SING.stretch[0], SING.stretch[1], SING.stretch[2])) * a);
    this.dominance = clamp01(Math.max(0.4 * pre, pulse(t, SING.dominance[0], SING.dominance[1], SING.dominance[2])) * a);
    this.release = clamp01(pulse(t, SING.release[0], SING.release[1], SING.release[2]) * a);
    this.recovery = t >= SING.recover ? clamp01((1 - smooth01((t - SING.recover) / (SING.end - SING.recover))) * a) : 0;
    this.phase = t >= 0 ? (t < 0.25 ? 'impact' : (t < SING.recover ? 'release' : 'recovery')) : (pre > 0.01 && a > 0 ? 'precompression' : 'idle');
    return this;
  };
  DMFSingularityTreatment.prototype.compose = function () {
    this.t = 9; this.phase = 'idle';
    this.collapse = 0; this.lightCompress = 0; this.pull = 0; this.flash = 0; this.stretch = 0;
    this.dominance = 0; this.release = 0; this.recovery = 0;
    return this;
  };

  // ======================================================================================================
  // LIGHT DIRECTOR — every output bounded, then smoothed with its own attack/release, then clamped again.
  // Each section contributes its light (releases: side-lit observer; academy: recedes; offer: steps back).
  // ======================================================================================================
  var ACT_LIGHT = {
    intro: { key: 0.05, rim: 0.05, side: 0 },
    hero: { key: 0.08, rim: 0.12, side: 0 },
    relic: { key: 0.12, rim: 0.2, side: 0.2 },
    bio: { key: 0, rim: 0, side: 0.5 },
    band: { key: 0.05, rim: 0.1, side: 0.3 },
    releases: { key: -0.04, rim: 0.05, side: 1 },
    sets: { key: 0, rim: 0.1, side: 0.6 },
    platforms: { key: -0.04, rim: 0, side: 0.4 },
    rider: { key: -0.04, rim: 0, side: 0.3 },
    academy: { key: -0.12, rim: -0.1, side: 0 },
    offer: { key: -0.2, rim: -0.15, side: 0 },
    lab: { key: -0.1, rim: -0.05, side: 0.2 },
    tips: { key: 0, rim: 0.05, side: 0.3 },
    contact: { key: 0.1, rim: 0.15, side: 0.1 }
  };
  var LIGHT_BOUNDS = {
    key: [0.55, 1.4], rim: [0, 1], accent: [0, 1], sweep: [-0.35, 0.35], bg: [0, 1], fog: [-1, 1], emissive: [0, 0.05], side: [0, 1]
  };
  var LIGHT_RATES = { key: [18, 4], rim: [16, 3], accent: [20, 5], sweep: [6, 6], bg: [6, 1.5], fog: [8, 2], emissive: [20, 4], side: [3, 1.5] };
  var DEFAULT_ACT = { key: 0, rim: 0, side: 0 };

  var LIGHT_KEYS = ['key', 'rim', 'accent', 'sweep', 'bg', 'fog', 'emissive', 'side'];
  function DMFLightDirector() {
    this.out = { key: 1, rim: 0, accent: 0, sweep: 0, bg: 0, fog: 0, emissive: 0, side: 0 };
    this.target = { key: 1, rim: 0, accent: 0, sweep: 0, bg: 0, fog: 0, emissive: 0, side: 0 };
    this.phase = 0;
  }
  DMFLightDirector.prototype.update = function (st, drop, sing, hyperLevel, a, dt) {
    var act = ACT_LIGHT[st.section] || DEFAULT_ACT;
    var calmD = 1 - 0.7 * clamp01(st.calm || 0);
    var quiet = 1 - 0.6 * clamp01(st.silence || 0);
    var low = clamp01(st.low || 0), mid = clamp01(st.mid || 0), high = clamp01(st.high || 0);
    var e = clamp01(st.energy || 0), kick = clamp01(st.kick || 0), h = clamp01(hyperLevel || 0);
    // The key light travels around the object with the mids: highlights move across the metal.
    this.phase += dt * (0.05 + 0.3 * mid + 0.35 * h) * (1 - 0.85 * drop.compress) * (1 - 0.9 * sing.lightCompress);
    this.phase = frac(this.phase);
    var T = this.target;
    T.key = 1 + a * (act.key + 0.18 * low * calmD + 0.22 * drop.punch + 0.12 * h - 0.28 * drop.compress - 0.45 * drop.edge - 0.3 * sing.lightCompress + 0.35 * sing.flash);
    T.rim = a * ((0.3 * mid + 0.35 * kick + 0.3 * h + act.rim) * calmD * quiet + 0.4 * drop.ring + 0.3 * sing.release + 0.25 * sing.dominance);
    T.accent = a * ((0.5 * high + 0.2 * h) * calmD * quiet + 0.35 * drop.secondary);
    T.sweep = a * 0.3 * Math.sin(2 * Math.PI * this.phase);
    T.bg = a * ((0.3 * e + 0.25 * low) * calmD + 0.3 * drop.ring + 0.45 * sing.stretch);
    T.fog = a * (0.35 * drop.punch + 0.3 * sing.release - 0.6 * drop.compress - 0.5 * drop.edge - 0.45 * sing.lightCompress);
    T.emissive = a * (0.012 * e * calmD + 0.02 * drop.punch + 0.03 * sing.flash + 0.01 * h);
    T.side = a * act.side * (0.6 + 0.4 * mid) * calmD;
    var o = this.out;
    for (var i = 0; i < LIGHT_KEYS.length; i++) {
      var k = LIGHT_KEYS[i], b = LIGHT_BOUNDS[k], r = LIGHT_RATES[k];
      o[k] = clamp(envelope(o[k], clamp(T[k], b[0], b[1]), r[0], r[1], dt), b[0], b[1]);
    }
    return o;
  };
  DMFLightDirector.prototype.compose = function () {
    var o = this.out;
    o.key = 1; o.rim = 0; o.accent = 0; o.sweep = 0; o.bg = 0; o.fog = 0; o.emissive = 0; o.side = 0;
    return o;
  };

  // ======================================================================================================
  // CAMERA DIRECTOR — named modes; each mode is a target offset (dolly forward in world units, orbit in rad,
  // lift in world units, FOV in degrees) on top of the existing shot rig. The offset is followed by
  // critically damped springs with an acceleration limit, so a mode change is a change of force, never
  // of position. Hard bounds per device; no noise, no shake.
  // ======================================================================================================
  var MODES = ['ICON', 'ORBIT', 'PUSH', 'IMPACT', 'FLYBY', 'REVEAL', 'SINGULARITY', 'RECOVERY'];
  var MODE_TARGET = {
    ICON: { dolly: 0, orbit: 0, lift: 0, fov: 0, k: 30 },
    ORBIT: { dolly: 0.02, orbit: 0.035, lift: 0.01, fov: 0, k: 14 },
    PUSH: { dolly: 0.06, orbit: 0, lift: -0.01, fov: -0.6, k: 26 },
    IMPACT: { dolly: 0.16, orbit: 0, lift: -0.015, fov: -0.9, k: 220 },
    FLYBY: { dolly: -0.03, orbit: 0.04, lift: 0.03, fov: 0.4, k: 18 },
    REVEAL: { dolly: -0.05, orbit: 0.015, lift: 0.04, fov: 0.3, k: 12 },
    SINGULARITY: { dolly: 0.24, orbit: 0, lift: -0.02, fov: 1.2, k: 120 },
    RECOVERY: { dolly: 0, orbit: 0, lift: 0, fov: 0, k: 16 }
  };
  var CAM_BOUNDS = {
    wide: { dolly: [-0.08, 0.26], orbit: [-0.05, 0.05], lift: [-0.06, 0.06], fov: [-1.5, 1.5] },
    compact: { dolly: [-0.03, 0.08], orbit: [-0.02, 0.02], lift: [-0.025, 0.025], fov: [-0.6, 0.6] }
  };
  var CAM_MAX_A = { dolly: 9, orbit: 1.5, lift: 1.5, fov: 60 };     // per s²: no jolt at mode changes
  var CAM_KEYS = ['dolly', 'orbit', 'lift', 'fov'];
  var DWELL = 0.45;                                                   // ambient modes never flicker

  function DMFCameraDirector() {
    this.mode = 'ICON';
    this.modeId = 0;
    this.dwell = 9;
    this.orbitPhase = 0;
    this.x = { dolly: 0, orbit: 0, lift: 0, fov: 0 };
    this.v = { dolly: 0, orbit: 0, lift: 0, fov: 0 };
    this.out = { dolly: 0, orbit: 0, lift: 0, fov: 0 };
    this.targets = { dolly: 0, orbit: 0, lift: 0, fov: 0 };
    this.maxSpeed = 0;
  }
  DMFCameraDirector.prototype.pick = function (st, drop, sing) {
    if (sing.pull > 0.02 || sing.collapse > 0.05) return 'SINGULARITY';
    if (drop.punch > 0.02 || (drop.phase === 'impact')) return 'IMPACT';
    if (drop.recovery > 0.01 || drop.phase === 'secondary' || sing.recovery > 0.01 || sing.release > 0.02) return 'RECOVERY';
    if (drop.compress > 0.05) return 'PUSH';
    if ((st.reveal != null && st.reveal < 0.999) || (st.section === 'relic' && st.focus < 0.6 && st.transition > 0.05)) return 'REVEAL';
    if ((st.speed || 0) > 0.35) return 'FLYBY';
    if ((st.mid || 0) > 0.45 && (st.energy || 0) > 0.35) return 'ORBIT';
    return 'ICON';
  };
  var EVENT_MODE = { PUSH: 1, IMPACT: 1, SINGULARITY: 1, RECOVERY: 1, REVEAL: 1 };
  DMFCameraDirector.prototype.update = function (st, drop, sing, a, compact, dt) {
    var want = this.pick(st, drop, sing);
    this.dwell += dt;
    if (want !== this.mode && (EVENT_MODE[want] || EVENT_MODE[this.mode] || this.dwell >= DWELL)) {
      this.mode = want; this.modeId = MODES.indexOf(want); this.dwell = 0;
    }
    var T = MODE_TARGET[this.mode];
    this.orbitPhase = frac(this.orbitPhase + dt * 0.07);
    var dir = st.velocity < 0 ? -1 : 1;
    var orbitT = this.mode === 'ORBIT' ? T.orbit * Math.sin(2 * Math.PI * this.orbitPhase) : (this.mode === 'FLYBY' ? T.orbit * dir : T.orbit);
    var B = compact ? CAM_BOUNDS.compact : CAM_BOUNDS.wide;
    var targets = this.targets;
    targets.dolly = T.dolly; targets.orbit = orbitT; targets.lift = T.lift; targets.fov = T.fov;
    var k = T.k, c = 2 * Math.sqrt(k);                                // critically damped
    var n = dt > 1 / 120 ? Math.ceil(dt * 120) : 1, hh = dt / n;
    for (var i = 0; i < CAM_KEYS.length; i++) {
      var key = CAM_KEYS[i];
      var tg = clamp(targets[key] * a, B[key][0], B[key][1]);
      for (var s = 0; s < n; s++) {
        var acc = clamp(k * (tg - this.x[key]) - c * this.v[key], -CAM_MAX_A[key], CAM_MAX_A[key]);
        this.v[key] += acc * hh;
        this.x[key] += this.v[key] * hh;
      }
      this.x[key] = clamp(this.x[key], B[key][0], B[key][1]);
      this.out[key] = this.x[key];
    }
    var spd = Math.abs(this.v.dolly);
    if (spd > this.maxSpeed) this.maxSpeed = spd;
    return this.out;
  };
  DMFCameraDirector.prototype.compose = function () {
    this.mode = 'ICON'; this.modeId = 0; this.dwell = 9;
    for (var i = 0; i < CAM_KEYS.length; i++) { this.x[CAM_KEYS[i]] = 0; this.v[CAM_KEYS[i]] = 0; this.out[CAM_KEYS[i]] = 0; }
    return this.out;
  };

  // ======================================================================================================
  // REFLECTION FIELD — the signature element. Positions are 0..1 across the object (the shader maps them on
  // a diagonal through object space, with a per-zone phase offset so each part of the Receiver catches
  // the light at its own moment).
  // ======================================================================================================
  var RF = { kickTravel: 0.38, zonePhase: 0.11 };
  function DMFReflectionField() {
    this.warmPhase = 0.25;
    this.coldPhase = 0;
    this.kickT = 9;
    this.kickStrength = 0;
    this.out = { warmPos: 0.5, warmWidth: 0.22, warmAmp: 0, coldPos: -0.2, coldWidth: 0.045, coldAmp: 0, kickFront: 0, kickAmp: 0, collapse: 0, zonePhase: RF.zonePhase };
  }
  DMFReflectionField.prototype.update = function (st, sig, drop, sing, hyperLevel, a, dt) {
    var low = clamp01(st.low || 0), high = clamp01(st.high || 0), h = clamp01(hyperLevel || 0);
    var calmD = 1 - 0.7 * clamp01(st.calm || 0);
    var collapse = clamp01(Math.max(sing.collapse, 0.6 * drop.compress));
    // Retract / compress: travel slows and the bands converge on the centre before the event.
    var travel = (1 - 0.85 * collapse) * (1 + 0.8 * h);
    this.warmPhase = frac(this.warmPhase + dt * (0.04 + 0.16 * low) * travel);
    this.coldPhase = frac(this.coldPhase + dt * (0.12 + 0.85 * high + 0.5 * h) * travel);
    if (sig && sig.beatFired && a > 0) { this.kickT = 0; this.kickStrength = clamp01(0.35 + 0.65 * (sig.kick || 0)) * (1 + 0.6 * drop.punch); }
    if (this.kickT < RF.kickTravel) this.kickT += dt;
    var o = this.out;
    var warm = 0.5 + 0.55 * Math.sin(2 * Math.PI * this.warmPhase);
    var cold = this.coldPhase * 1.3 - 0.15;
    o.warmPos = clamp(warm + (0.5 - warm) * collapse, -0.2, 1.2);
    o.coldPos = clamp(cold + (0.5 - cold) * collapse, -0.2, 1.2);
    o.warmWidth = clamp((0.2 + 0.1 * low) * (1 - 0.7 * collapse), 0.02, 0.4);
    o.coldWidth = clamp(0.045 * (1 - 0.5 * collapse), 0.02, 0.4);
    o.warmAmp = clamp(a * ((0.08 + 0.32 * low) * calmD * (1 + 0.6 * h) * (1 - 0.5 * collapse) + 0.25 * drop.ring + 0.2 * sing.release), 0, 0.6);
    o.coldAmp = clamp(a * ((0.05 + 0.38 * high) * calmD * (1 + 0.6 * h) * (1 - 0.4 * collapse) + 0.3 * drop.secondary), 0, 0.6);
    var kf = this.kickT < RF.kickTravel ? this.kickT / RF.kickTravel : 1;
    o.kickFront = kf;
    o.kickAmp = kf < 1 ? clamp(a * this.kickStrength * (1 - kf) * (1 - kf) * 0.5 * calmD, 0, 0.6) : 0;
    o.collapse = clamp01(collapse * a);
    return o;
  };
  DMFReflectionField.prototype.compose = function () {
    var o = this.out;
    o.warmAmp = 0; o.coldAmp = 0; o.kickAmp = 0; o.kickFront = 0; o.collapse = 0;
    this.kickT = 9;
    return o;
  };

  // ======================================================================================================
  // PERFORMER MOTION — naturalness for the existing head/DJ springs (relic.js keeps the motion itself).
  // ======================================================================================================
  function DMFPerformerMotion() {
    this.midLP = 0;
    this.t = 0;
    this.out = { nod: 1, phase: 0, headDelay: 0.05, sway: 1, zeta: 0.38 };
  }
  DMFPerformerMotion.prototype.update = function (st, a, dt) {
    this.t += dt;
    this.midLP = approach(this.midLP, clamp01(st.mid || 0), 2.2, dt);   // ≈ 0.45 s low-pass
    var o = this.out;
    var n1 = noise1(this.t * 0.31), n2 = noise1(this.t * 0.23 + 17.3), n3 = noise1(this.t * 0.19 + 41.7);
    o.nod = clamp(1 + a * (0.3 * (this.midLP - 0.5) + 0.1 * n1), 0.8, 1.2);
    o.phase = clamp(a * 0.04 * n2, -0.05, 0.05);                       // beat fraction: breaks the loop
    o.headDelay = clamp(0.045 + 0.02 * (1 - this.midLP), 0.04, 0.07);   // the head trails the speakers
    o.sway = clamp(1 + a * 0.2 * n3, 0.75, 1.25);
    o.zeta = clamp(0.38 + 0.14 * clamp01(st.energy || 0) * a, 0.38, 0.52); // louder → tighter cones
    return o;
  };
  DMFPerformerMotion.prototype.compose = function () {
    var o = this.out;
    o.nod = 1; o.phase = 0; o.headDelay = 0.05; o.sway = 1; o.zeta = 0.38;
    return o;
  };

  // ======================================================================================================
  // COMPOSITE — stepped by DMFEventHorizon.update after DMFLightspeed; writes st.hv*, st.cam*, st.drop*,
  // st.sing*, st.rf*, st.pf*, st.fx* in place.
  // ======================================================================================================
  var ENERGETIC = { hero: 1, relic: 1, band: 1, releases: 1, sets: 1, platforms: 1, rider: 1, tips: 1, bio: 1, intro: 1 };

  function DMFHyperdriveV2() {
    this.flags = readFlags(null);
    this.governor = new DMFEffectGovernor();
    this.drop = new DMFDropTimeline();
    this.sing = new DMFSingularityTreatment();
    this.light = new DMFLightDirector();
    this.camera = new DMFCameraDirector();
    this.reflection = new DMFReflectionField();
    this.performer = new DMFPerformerMotion();
    this.hyperFiredNow = false;
    this.lastHyperId = -1;
  }
  DMFHyperdriveV2.prototype.setFlags = function (raw) { this.flags = readFlags(raw); return this.flags; };

  DMFHyperdriveV2.prototype.update = function (st, inp, ids, dt) {
    var tier = st.performanceTier;
    var compact = !!st.compact;
    var g = this.governor.update(tier, compact, this.flags, inp.fps || 0, dt);
    var still = tier === 'static';
    var calm = clamp01(st.calm || 0);
    // The offer never sees an event; silence (V4) holds everything down; only energetic sections choreograph.
    var sec = ids && ids[st.index] ? ids[st.index] : st.section;
    var live = still ? 0 : (1 - clamp01(st.silence || 0)) * (1 - clamp01((calm - 0.3) / 0.3)) * (ENERGETIC[sec] ? 1 : 0.35);
    var hyper = inp.hyper || null;
    var hyperLevel = hyper && hyper.active ? clamp01(hyper.level || 0) : 0;
    this.hyperFiredNow = false;
    var hid = hyper ? hyper.id : 0;
    if (this.lastHyperId < 0) this.lastHyperId = hid;
    if (hyper && hyper.active && hid !== this.lastHyperId && live > 0) this.hyperFiredNow = true;
    this.lastHyperId = hid;

    var drop = this.drop.update(inp.s || null, hyper, dt, live * (g.lights > 0 || g.camera > 0 ? 1 : 0));
    var sing = this.sing.update(inp.sing || null, dt, still ? 0 : g.singularity * (1 - clamp01((calm - 0.3) / 0.3)));
    var L = this.light.update(st, drop, sing, hyperLevel * live, still ? 0 : g.lights, dt);
    var C = this.camera.update(st, drop, sing, still ? 0 : g.camera, compact, dt);
    var R = this.reflection.update(st, inp.s || null, drop, sing, hyperLevel * live, still ? 0 : g.reflections, dt);
    var P = this.performer.update(st, still ? 0 : g.receiver, dt);

    st.hvKey = L.key; st.hvRim = L.rim; st.hvAccent = L.accent; st.hvSweep = L.sweep; st.hvBg = L.bg;
    st.hvFog = L.fog; st.hvEmissive = L.emissive; st.hvSide = L.side;
    st.camMode = this.camera.mode; st.camModeId = this.camera.modeId;
    st.camDolly = C.dolly; st.camOrbit = C.orbit; st.camLift = C.lift; st.camFov = C.fov;
    st.dropPhase = drop.phase; st.dropCompress = drop.compress; st.dropEdge = drop.edge; st.dropPunch = drop.punch;
    st.dropRing = drop.ring; st.dropSecondary = drop.secondary; st.dropRecovery = drop.recovery;
    st.singPhase = sing.phase; st.singCollapse = sing.collapse; st.singPull = sing.pull; st.singFlash = sing.flash;
    st.singStretch = sing.stretch; st.singDominance = sing.dominance; st.singRelease = sing.release;
    st.rfWarmPos = R.warmPos; st.rfWarmWidth = R.warmWidth; st.rfWarmAmp = R.warmAmp;
    st.rfColdPos = R.coldPos; st.rfColdWidth = R.coldWidth; st.rfColdAmp = R.coldAmp;
    st.rfKickFront = R.kickFront; st.rfKickAmp = R.kickAmp; st.rfCollapse = R.collapse; st.rfZone = R.zonePhase;
    st.pfNod = P.nod; st.pfPhase = P.phase; st.pfHeadDelay = P.headDelay; st.pfSway = P.sway; st.pfZeta = P.zeta;
    st.fxCamera = g.camera; st.fxLights = g.lights; st.fxReflections = g.reflections; st.fxParticles = g.particles;
    st.fxOverlays = g.overlays; st.fxPressure = g.pressure;
    // Particles: HIGH sparkle on top of the existing embers (0 when the flag is off or shed).
    st.hvSparkle = clamp01(g.particles * (0.6 * clamp01(st.high || 0) + 0.4 * drop.secondary + 0.5 * sing.release) * (1 - 0.7 * calm));
    return st;
  };

  // Composed and motionless (reduced motion, Save-Data, STATIC): every V7 term at rest.
  DMFHyperdriveV2.prototype.compose = function (st) {
    var L = this.light.compose(), C = this.camera.compose(), R = this.reflection.compose(), P = this.performer.compose();
    this.drop.compose(); this.sing.compose();
    st.hvKey = L.key; st.hvRim = 0; st.hvAccent = 0; st.hvSweep = 0; st.hvBg = 0; st.hvFog = 0; st.hvEmissive = 0; st.hvSide = 0;
    st.camMode = 'ICON'; st.camModeId = 0; st.camDolly = C.dolly; st.camOrbit = C.orbit; st.camLift = C.lift; st.camFov = C.fov;
    st.dropPhase = 'idle'; st.dropCompress = 0; st.dropEdge = 0; st.dropPunch = 0; st.dropRing = 0; st.dropSecondary = 0; st.dropRecovery = 0;
    st.singPhase = 'idle'; st.singCollapse = 0; st.singPull = 0; st.singFlash = 0; st.singStretch = 0; st.singDominance = 0; st.singRelease = 0;
    st.rfWarmPos = R.warmPos; st.rfWarmWidth = R.warmWidth; st.rfWarmAmp = 0; st.rfColdPos = R.coldPos; st.rfColdWidth = R.coldWidth;
    st.rfColdAmp = 0; st.rfKickFront = 0; st.rfKickAmp = 0; st.rfCollapse = 0; st.rfZone = R.zonePhase;
    st.pfNod = P.nod; st.pfPhase = 0; st.pfHeadDelay = P.headDelay; st.pfSway = 1; st.pfZeta = P.zeta;
    st.fxCamera = 0; st.fxLights = 0; st.fxReflections = 0; st.fxParticles = 0; st.fxOverlays = 0; st.fxPressure = 0; st.hvSparkle = 0;
    return st;
  };

  var api = {
    FLAG_KEYS: FLAG_KEYS, readFlags: readFlags,
    CHANNELS: CHANNELS, TIER_BASE: TIER_BASE, COMPACT_CAP: COMPACT_CAP, FPS_TARGET: FPS_TARGET, SHED: SHED,
    DROP: DROP, DROP_PHASES: DROP_PHASES, SING: SING, ACT_LIGHT: ACT_LIGHT, LIGHT_BOUNDS: LIGHT_BOUNDS,
    LIGHT_KEYS: LIGHT_KEYS, MODES: MODES, MODE_TARGET: MODE_TARGET, CAM_BOUNDS: CAM_BOUNDS, CAM_MAX_A: CAM_MAX_A, RF: RF,
    pulse: pulse, noise1: noise1,
    DMFEffectGovernor: DMFEffectGovernor, DMFDropTimeline: DMFDropTimeline, DMFSingularityTreatment: DMFSingularityTreatment,
    DMFLightDirector: DMFLightDirector, DMFCameraDirector: DMFCameraDirector, DMFReflectionField: DMFReflectionField,
    DMFPerformerMotion: DMFPerformerMotion, DMFHyperdriveV2: DMFHyperdriveV2
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFHyperdriveV2 = api;
})(typeof window !== 'undefined' ? window : this);
