/* DMF OVERDRIVE ENGINE — pure, deterministic, ES5, no DOM.
 * Inlined into public/index.html by scripts/build-3d.cjs; required directly by tests. */
(function (root) {
  'use strict';

  var BPM = 124;
  var CYCLE_BARS = 32;

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function frac(v) { return v - Math.floor(v); }

  // Frame-rate independent attack/release follower (time constants in seconds).
  function follow(current, target, attack, release, dt) {
    var tau = target > current ? attack : release;
    return current + (target - current) * (1 - Math.exp(-dt / tau));
  }

  // Damped spring: impulses add velocity, step() integrates toward a target.
  function DMFSpring(stiffness, damping) {
    this.x = 0;
    this.v = 0;
    this.k = stiffness;
    this.c = damping;
  }
  DMFSpring.prototype.impulse = function (j) { this.v += j; };
  DMFSpring.prototype.step = function (target, dt) {
    var steps = dt > 0.016 ? Math.ceil(dt / 0.016) : 1;
    var h = dt / steps;
    for (var i = 0; i < steps; i++) {
      this.v += (this.k * (target - this.x) - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  };

  // Synthetic 124 BPM performance with a 32-bar arrangement
  // (intro 0-7, groove 8-15, build 16-23, drop 24-31) plus optional analyser input.
  function DMFSignalEngine(opts) {
    opts = opts || {};
    this.bpm = opts.bpm || BPM;
    this.time = 0;
    this.beatOffset = (opts.startBar || 0) * 4;
    this.forceDrop = false;
    this.audioMix = 0;
    this.audio = null;
    this.audioKick = 0;
    this.audioSnare = 0;
    this.audioLastOnset = -1;
    this.audioInterval = 60 / this.bpm;
    this.out = {
      low: 0, mid: 0, high: 0, energy: 0,
      kick: 0, snare: 0, transient: 0,
      beatPhase: 0, beatIndex: 0, bar: 0, barInCycle: 0,
      dropEnergy: 0, drive: 0, section: 'intro', bpm: this.bpm, source: 'clock'
    };
  }

  DMFSignalEngine.prototype.setForceDrop = function (on) { this.forceDrop = !!on; };

  // bands: {low, mid, high} normalized 0..1, kickOnset/snareOnset booleans.
  DMFSignalEngine.prototype.inputAudio = function (bands) { this.audio = bands; };
  DMFSignalEngine.prototype.clearAudio = function () { this.audio = null; };

  DMFSignalEngine.prototype.update = function (dt) {
    dt = dt > 0.1 ? 0.1 : (dt < 0 ? 0 : dt);
    this.time += dt;
    var o = this.out;

    var beats = this.time * this.bpm / 60 + this.beatOffset;
    var beatIndex = Math.floor(beats);
    var phase = beats - beatIndex;
    var bar = Math.floor(beats / 4);
    var barPos = frac(beats / 4);
    var barInCycle = ((bar % CYCLE_BARS) + CYCLE_BARS) % CYCLE_BARS;
    var beatInBar = ((beatIndex % 4) + 4) % 4;

    var drive, section, isDrop = 0, buildP = 0;
    if (this.forceDrop) { drive = 1; section = 'drop'; isDrop = 1; }
    else if (barInCycle < 8) { drive = 0.3; section = 'intro'; }
    else if (barInCycle < 16) { drive = 0.55; section = 'groove'; }
    else if (barInCycle < 24) {
      buildP = (barInCycle - 16 + barPos) / 8;
      drive = 0.6 + 0.32 * buildP;
      section = 'build';
    } else { drive = 1; section = 'drop'; isDrop = 1; }

    // Kick: four-on-the-floor, silent on the last build bar for tension.
    var kickGate = (section === 'build' && barInCycle === 23 && !this.forceDrop) ? 0 : 1;
    var kick = Math.exp(-phase * 7) * kickGate * (section === 'intro' ? 0.75 : 1);

    // Snare on 2 and 4; rolls into 8ths then 16ths during the build.
    var snare;
    if (section === 'build' && barInCycle >= 20) {
      var sub = barInCycle >= 22 ? 4 : 2;
      snare = Math.exp(-frac(beats * sub) * 10) * (0.45 + 0.55 * buildP);
    } else {
      snare = (beatInBar === 1 || beatInBar === 3) ? Math.exp(-phase * 9) * (section === 'intro' ? 0.5 : 1) : 0;
    }

    var openHat = Math.exp(-frac(beats + 0.5) * 6) * (drive > 0.5 ? 1 : 0.45);
    var closedHat = Math.exp(-frac(beats * 4) * 12) * 0.35 * drive;
    var riser = section === 'build' ? buildP * buildP * 0.5 : 0;
    var bass = (section === 'intro' ? 0.15 : 0.35) * (1 - Math.exp(-phase * 4)) * (1 - phase) * 2;
    var pad = 0.25 * drive * (0.5 + 0.5 * Math.sin(2 * Math.PI * beats / 8));

    var rawLow = clamp01(kick * 0.9 + bass);
    var rawMid = clamp01(snare * 0.8 + pad);
    var rawHigh = clamp01(openHat * 0.6 + closedHat + riser);
    var rawKick = kick;
    var rawSnare = snare;

    // Analyser input crossfades over the synthetic clock.
    this.audioMix = follow(this.audioMix, this.audio ? 1 : 0, 0.3, 1.5, dt);
    this.audioKick *= Math.exp(-dt * 14);
    this.audioSnare *= Math.exp(-dt * 16);
    if (this.audio) {
      var a = this.audio;
      if (a.kickOnset) {
        if (this.audioLastOnset >= 0) {
          var iv = this.time - this.audioLastOnset;
          if (iv > 0.3 && iv < 1.0) this.audioInterval += (iv - this.audioInterval) * 0.2;
        }
        this.audioLastOnset = this.time;
        this.audioKick = 1;
      }
      if (a.snareOnset) this.audioSnare = 1;
    }
    var m = this.audioMix;
    if (m > 0.001) {
      var al = this.audio ? this.audio.low : 0;
      var am = this.audio ? this.audio.mid : 0;
      var ah = this.audio ? this.audio.high : 0;
      rawLow = rawLow + (clamp01(al) - rawLow) * m;
      rawMid = rawMid + (clamp01(am) - rawMid) * m;
      rawHigh = rawHigh + (clamp01(ah) - rawHigh) * m;
      rawKick = rawKick + (this.audioKick - rawKick) * m;
      rawSnare = rawSnare + (this.audioSnare - rawSnare) * m;
      var audioDrive = clamp01((al * 0.5 + am * 0.3 + ah * 0.2) * 1.3);
      drive = drive + (audioDrive - drive) * m;
      isDrop = isDrop + ((audioDrive > 0.75 ? 1 : 0) - isDrop) * m;
      if (m > 0.5 && this.audioLastOnset >= 0) {
        phase = clamp01((this.time - this.audioLastOnset) / this.audioInterval);
      }
    }

    o.low = follow(o.low, rawLow, 0.012, 0.16, dt);
    o.mid = follow(o.mid, rawMid, 0.015, 0.2, dt);
    o.high = follow(o.high, rawHigh, 0.008, 0.12, dt);
    var bandMix = 0.5 * o.low + 0.3 * o.mid + 0.2 * o.high;
    o.energy = clamp01(follow(o.energy, 0.35 * bandMix + 0.65 * drive, 0.08, 0.6, dt));
    o.dropEnergy = clamp01(follow(o.dropEnergy, isDrop ? 1 : drive * 0.6, 0.4, 1.2, dt));
    o.kick = clamp01(rawKick);
    o.snare = clamp01(rawSnare);
    o.transient = o.kick > o.snare ? o.kick : o.snare;
    o.beatPhase = phase;
    o.beatIndex = beatIndex;
    o.bar = bar;
    o.barInCycle = barInCycle;
    o.drive = drive;
    o.section = section;
    o.source = m > 0.5 ? 'audio' : 'clock';
    o.bpm = m > 0.5 ? Math.round(60 / this.audioInterval) : this.bpm;
    return o;
  };

  var LEVELS = ['DORMANT', 'AWAKENED', 'TRANSMITTING'];

  // DORMANT → AWAKENED → TRANSMITTING by energy (with hysteresis bands);
  // OVERDRIVE only after sustained drop energy, released after sustained calm.
  function DMFStateMachine() {
    this.level = 0;
    this.overdrive = false;
    this.odTimer = 0;
    this.overdriveMix = 0;
    this.state = 'DORMANT';
  }

  DMFStateMachine.prototype.update = function (sig, dt, ctx) {
    ctx = ctx || {};
    var active = ctx.active !== false;
    var e = sig.energy;
    var lvl = this.level;
    if (!active) lvl = 0;
    else {
      if (lvl === 0 && e > 0.3) lvl = 1;
      else if (lvl === 1 && e < 0.22) lvl = 0;
      if (lvl === 1 && e > 0.62) lvl = 2;
      else if (lvl === 2 && e < 0.5) lvl = 1;
    }
    this.level = lvl;

    if (!this.overdrive) {
      if (active && sig.dropEnergy > 0.78) {
        this.odTimer += dt;
        if (this.odTimer > 1.2) { this.overdrive = true; this.odTimer = 0; }
      } else this.odTimer = 0;
    } else if (!active) {
      this.overdrive = false;
      this.odTimer = 0;
    } else if (sig.dropEnergy < 0.45) {
      this.odTimer += dt;
      if (this.odTimer > 0.9) { this.overdrive = false; this.odTimer = 0; }
    } else this.odTimer = 0;

    this.overdriveMix = follow(this.overdriveMix, this.overdrive ? 1 : 0, 0.6, 1.2, dt);
    var shown = Math.max(lvl, ctx.hoverLevel || 0);
    this.state = this.overdrive ? 'OVERDRIVE' : LEVELS[shown];
    return this.state;
  };

  // One-way quality downgrade from rolling FPS; never upgrades, so tiers cannot oscillate.
  function DMFPerformanceGovernor(tier, opts) {
    opts = opts || {};
    this.tier = tier;
    this.window = opts.window || 3;
    this.acc = 0;
    this.frames = 0;
    this.windows = 0;
    this.fps = 60;
  }

  DMFPerformanceGovernor.prototype.sample = function (realDt) {
    if (realDt > 0.25) { this.acc = 0; this.frames = 0; return null; }
    this.acc += realDt;
    this.frames++;
    if (this.acc < this.window) return null;
    this.fps = this.frames / this.acc;
    this.acc = 0;
    this.frames = 0;
    this.windows++;
    if (this.windows < 2) return null;
    if (this.tier === 'high' && this.fps < 35) { this.tier = 'balanced'; return 'balanced'; }
    if (this.tier === 'balanced' && this.fps < 24) { this.tier = 'lite'; return 'lite'; }
    return null;
  };

  var api = {
    BPM: BPM,
    clamp01: clamp01,
    follow: follow,
    DMFSpring: DMFSpring,
    DMFSignalEngine: DMFSignalEngine,
    DMFStateMachine: DMFStateMachine,
    DMFPerformanceGovernor: DMFPerformanceGovernor
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFOverdrive = api;
})(typeof window !== 'undefined' ? window : this);
