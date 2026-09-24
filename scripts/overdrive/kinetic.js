/* DMF KINETIC SINGULARITY — pure, deterministic, ES5, no DOM.
 * Mass, force and acceleration primitives for the Receiver and the landing.
 * Inlined into public/index.html by scripts/build-3d.cjs after engine.js; required directly by tests. */
(function (root) {
  'use strict';

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function follow(current, target, attack, release, dt) {
    var tau = target > current ? attack : release;
    return current + (target - current) * (1 - Math.exp(-dt / tau));
  }

  // === DMFKineticBody — a 1D mass with position, velocity, acceleration and target acceleration ===
  // Unit mass on a spring (k) with damping from a damping ratio (zeta < 1 overshoots once, then settles).
  // Forces never set velocity directly: impulse() adds a short decaying force, and acceleration can only
  // change at maxJ per second (jerk limit) and never exceed maxA. So a strong beat reads as
  // acceleration → impact → overshoot → counter-motion → settle, with no instantaneous jumps.
  var SUBSTEP = 1 / 120;
  function DMFKineticBody(k, zeta, opts) {
    opts = opts || {};
    this.k = k;
    this.c = 2 * Math.sqrt(k) * (zeta == null ? 1 : zeta);
    this.maxA = opts.maxA || 1e9;
    this.maxJ = opts.maxJ || 1e12;
    this.min = opts.min != null ? opts.min : -1e9;
    this.max = opts.max != null ? opts.max : 1e9;
    this.forceTau = opts.forceTau || 0.03;
    this.x = 0;
    this.v = 0;
    this.a = 0;
    this.targetA = 0;
    this.jerk = 0;
    this.f = 0;
  }
  // Adds a force that delivers ~dv of velocity over forceTau (before spring and limits act).
  DMFKineticBody.prototype.impulse = function (dv) { this.f += dv / this.forceTau; };
  DMFKineticBody.prototype.reset = function (x) {
    this.x = x || 0; this.v = 0; this.a = 0; this.targetA = 0; this.jerk = 0; this.f = 0;
  };
  DMFKineticBody.prototype.step = function (target, dt) {
    if (!(dt > 0)) return this.x;
    var n = dt > SUBSTEP ? Math.ceil(dt / SUBSTEP) : 1;
    var h = dt / n;
    var fDecay = Math.exp(-h / this.forceTau);
    var jLim = this.maxJ * h;
    for (var i = 0; i < n; i++) {
      this.targetA = this.k * (target - this.x) - this.c * this.v + this.f;
      var da = this.targetA - this.a;
      if (da > jLim) da = jLim;
      else if (da < -jLim) da = -jLim;
      var a = this.a + da;
      if (a > this.maxA) a = this.maxA;
      else if (a < -this.maxA) a = -this.maxA;
      this.jerk = (a - this.a) / h;
      this.a = a;
      this.v += a * h;
      this.x += this.v * h;
      if (this.x > this.max) { this.x = this.max; if (this.v > 0) this.v = 0; if (this.a > 0) this.a = 0; }
      else if (this.x < this.min) { this.x = this.min; if (this.v < 0) this.v = 0; if (this.a < 0) this.a = 0; }
      this.f *= fDecay;
    }
    return this.x;
  };

  // === DMFForceMatrix — one deterministic audio → motion mapping ===
  // Bands are conditioned first (the kick uses the engine's impulse layer; low/mid/high get their own
  // attack/release followers), then a fixed matrix routes each band to its own channels only.
  // Nothing downstream reads raw FFT values: consumers apply these as forces on kinetic bodies.
  var BANDS = ['kick', 'low', 'mid', 'high'];
  var MATRIX = {
    cone:     [1, 0, 0, 0],   // KICK: instantaneous speaker cone force
    head:     [1, 0, 0, 0],   //       DJ head snap
    camera:   [1, 0, 0, 0],   //       camera impulse
    pedestal: [1, 0, 0, 0],   //       pedestal radial shock
    torso:    [0, 1, 0, 0],   // LOW:  torso mass
    cabinet:  [0, 1, 0, 0],   //       cabinet pressure
    floor:    [0, 1, 0, 0],   //       floor / grid compression
    depth:    [0, 1, 0, 0],   //       slow model translation
    shoulder: [0, 0, 1, 0],   // MID:  shoulders / upper body
    logo:     [0, 0, 1, 0],   //       logo articulation
    torque:   [0, 0, 1, 0],   //       scene lateral torque
    metal:    [0, 0, 0, 1],   // HIGH: metallic reflections
    edge:     [0, 0, 0, 1],   //       light edge speed
    detail:   [0, 0, 0, 1]    //       particles / small details
  };
  var CHANNELS = [];
  for (var ch in MATRIX) if (Object.prototype.hasOwnProperty.call(MATRIX, ch)) CHANNELS.push(ch);

  function DMFForceMatrix() {
    this.band = [0, 0, 0, 0];
    this.out = { forceKick: 0, forceLow: 0, forceMid: 0, forceHigh: 0, amp: 0, travel: 0, env: 0 };
    for (var i = 0; i < CHANNELS.length; i++) this.out[CHANNELS[i]] = 0;
  }
  DMFForceMatrix.prototype.update = function (s, dt) {
    var b = this.band;
    b[0] = clamp01(s.impulse);
    b[1] = follow(b[1], clamp01(s.low), 0.06, 0.35, dt);
    b[2] = follow(b[2], clamp01(s.mid), 0.05, 0.3, dt);
    b[3] = follow(b[3], clamp01(s.high), 0.02, 0.15, dt);
    var o = this.out;
    for (var i = 0; i < CHANNELS.length; i++) {
      var row = MATRIX[CHANNELS[i]];
      o[CHANNELS[i]] = clamp01(row[0] * b[0] + row[1] * b[1] + row[2] * b[2] + row[3] * b[3]);
    }
    o.forceKick = b[0]; o.forceLow = b[1]; o.forceMid = b[2]; o.forceHigh = b[3];
    // ENERGY: global motion amplitude, camera travel strength, environment intensity.
    var e = clamp01(s.energy);
    o.amp = 0.35 + 0.65 * e;
    o.travel = e * e;
    o.env = 0.2 + 0.8 * e;
    return o;
  };

  // === DMFSingularity — a finite, rare event above HYPERDRIVE ===
  // It needs a predicted drop (clock arrangement or an armed forced drop) so it can start 700 ms early:
  // PRECOMPRESSION → IGNITION (-120 ms) → IMPACT (0) → BREAKTHROUGH (+80..220) → PROPAGATION (+250..700)
  // → DECAY (..2200) → RESOLVE (..3500), then everything is exactly back at rest.
  // Natural drops earn it every `every`-th drop; SPACE arms the next predicted drop. One per drop
  // (latched until the drop ends), a cooldown of ≥12 s from impact, and an abort if the drop is withdrawn.
  var SING_PHASES = [[-0.12, 'precompression'], [0, 'ignition'], [0.08, 'impact'], [0.25, 'breakthrough'],
    [0.7, 'propagation'], [2.2, 'decay']];
  function DMFSingularity(opts) {
    opts = opts || {};
    this.lead = 0.7;
    this.duration = 3.5;
    this.cooldown = Math.max(12, opts.cooldown || 12);
    this.every = opts.every || 2;
    this.armed = false;
    this.active = false;
    this.phase = 'idle';
    this.t = 0;
    this.id = 0;
    this.hit = false;
    this.latch = false;
    this.sinceLast = 1e9;
    this.drops = 0;
    this.pre = 0;
    this.ignition = 0;
    this.level = 0;
    this.breakthrough = 0;
    this.propagation = 0;
  }
  DMFSingularity.prototype.canStart = function () {
    return !this.active && !this.latch && this.sinceLast >= this.cooldown;
  };
  DMFSingularity.prototype.arm = function (on) { this.armed = !!on; };
  DMFSingularity.prototype.clear = function () {
    this.active = false;
    this.phase = 'idle';
    this.pre = 0; this.ignition = 0; this.level = 0; this.breakthrough = 0; this.propagation = 0;
  };
  DMFSingularity.prototype.update = function (sig, dt) {
    this.sinceLast += dt;
    this.hit = false;
    if (this.latch && !this.active && sig.dropEnergy < 0.5) this.latch = false;
    var ttd = sig.timeToDrop;

    if (!this.active) {
      if (sig.dropHit) this.drops++;
      var earned = this.armed || this.drops % this.every === this.every - 1;
      if (earned && ttd > 0 && ttd <= this.lead && this.canStart()) {
        this.active = true;
        this.latch = true;
        this.armed = false;
        this.t = -ttd;
        this.id++;
      } else {
        this.clear();
        return this;
      }
    }

    if (this.t < 0) {
      if (sig.dropHit) {
        this.t = 0;
        this.hit = true;
        this.sinceLast = 0;
        this.drops++;
      } else if (ttd > 0 && ttd <= this.lead + 0.2) {
        this.t = -ttd;
      } else {
        // The predicted drop was withdrawn (disarmed, or audio took over): stand down without firing.
        this.latch = false;
        this.clear();
        return this;
      }
    } else {
      this.t += dt;
    }

    var t = this.t;
    if (t >= this.duration) { this.clear(); return this; }
    this.phase = 'resolve';
    for (var i = 0; i < SING_PHASES.length; i++) {
      if (t < SING_PHASES[i][0]) { this.phase = SING_PHASES[i][1]; break; }
    }
    if (t < 0) {
      this.pre = smooth01((t + this.lead) / (this.lead - 0.12));
      this.ignition = clamp01((t + 0.12) / 0.12);
      this.level = 0;
      this.breakthrough = 0;
      this.propagation = 0;
    } else {
      var rel = 1 - clamp01(t / 0.12);
      this.pre = rel * rel;
      this.ignition = 0;
      var attack = t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) * 1.1);
      this.level = attack * (1 - smooth01((t - 2.2) / (this.duration - 2.2)));
      this.breakthrough = t > 0.06 && t < 0.24 ? Math.sin(Math.PI * (t - 0.06) / 0.18) : 0;
      this.propagation = t > 0.25 && t < 0.7 ? Math.sin(Math.PI * (t - 0.25) / 0.45) : 0;
    }
    return this;
  };

  // === DMFVelocityField — motion → shader drives ===
  // Smooths a relative velocity vector (Receiver minus camera), then derives: a stable unit direction,
  // a soft-saturated magnitude for anisotropic highlight stretch, acceleration/jerk magnitudes, a
  // reflection drive from energy + acceleration + angular velocity + view angle, and a short echo level.
  // Everything decays smoothly to exactly nothing at rest.
  function DMFVelocityField(opts) {
    opts = opts || {};
    this.vRef = opts.vRef || 1.2;
    this.aRef = opts.aRef || 14;
    this.wRef = opts.wRef || 2.5;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.dirX = 0; this.dirY = 0; this.dirZ = 1;
    this.speed = 0;
    this.accel = 0;
    this.jerk = 0;
    this.mag = 0;
    this.stretch = 0;
    this.reflect = 0;
    this.echo = 0;
  }
  DMFVelocityField.prototype.update = function (vx, vy, vz, angular, energy, view, echoTrigger, dt) {
    if (!(dt > 0)) return this;
    var k = 1 - Math.exp(-dt / 0.03);
    var px = this.vx, py = this.vy, pz = this.vz;
    this.vx += (vx - this.vx) * k;
    this.vy += (vy - this.vy) * k;
    this.vz += (vz - this.vz) * k;
    var ax = (this.vx - px) / dt, ay = (this.vy - py) / dt, az = (this.vz - pz) / dt;
    var accel = Math.sqrt(ax * ax + ay * ay + az * az);
    var prevAccel = this.accel;
    this.accel = follow(this.accel, accel, 0.02, 0.12, dt);
    this.jerk = follow(this.jerk, Math.abs(this.accel - prevAccel) / dt, 0.02, 0.12, dt);
    var speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);
    this.speed = speed;
    if (speed > 1e-4) { this.dirX = this.vx / speed; this.dirY = this.vy / speed; this.dirZ = this.vz / speed; }
    this.mag = 1 - Math.exp(-speed / this.vRef);
    if (this.mag < 1e-4) this.mag = 0;
    this.stretch = follow(this.stretch, this.mag, 0.03, 0.18, dt);
    if (this.stretch < 1e-3 && this.mag === 0) this.stretch = 0;
    var accelN = 1 - Math.exp(-this.accel / this.aRef);
    var angN = 1 - Math.exp(-Math.abs(angular) / this.wRef);
    var target = clamp01(accelN * (0.55 + 0.25 * clamp01(energy)) + 0.35 * angN) * (0.55 + 0.45 * clamp01(view));
    this.reflect = follow(this.reflect, target, 0.03, 0.25, dt);
    if (this.reflect < 1e-3 && target < 1e-3) this.reflect = 0;
    // Echo: a short motion memory for high impacts only; gone within ~220 ms of the last trigger.
    this.echo *= Math.exp(-dt / 0.047);
    if (echoTrigger > this.echo) this.echo = clamp01(echoTrigger);
    if (this.echo < 0.01) this.echo = 0;
    return this;
  };

  var api = {
    clamp01: clamp01,
    smooth01: smooth01,
    DMFKineticBody: DMFKineticBody,
    DMFForceMatrix: DMFForceMatrix,
    FORCE_MATRIX: MATRIX,
    FORCE_BANDS: BANDS,
    DMFSingularity: DMFSingularity,
    DMFVelocityField: DMFVelocityField
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFKinetic = api;
})(typeof window !== 'undefined' ? window : this);
