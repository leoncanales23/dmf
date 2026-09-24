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
    // Visual lookahead for analyser mode only: render pipelines lag audio by a frame or two,
    // so predicted beats fire this early. Audio itself is never delayed.
    this.leadTime = opts.leadTime != null ? opts.leadTime : 0.05;
    this.forceActive = false;
    this.forceArmBar = 0;
    this.lastBeatIndex = null;
    this.lastFiredBeat = -1e9;
    this.prevSection = '';
    this.energySlow = 0;
    this.bodyStage = 0;
    this.audioCalm = 0;
    this.audioDropArmed = false;
    this.out = {
      low: 0, mid: 0, high: 0, energy: 0,
      kick: 0, snare: 0, transient: 0,
      beatPhase: 0, beatIndex: 0, bar: 0, barInCycle: 0,
      dropEnergy: 0, drive: 0, section: 'intro', bpm: this.bpm, source: 'clock',
      beatInterval: 60 / this.bpm, timeToBeat: 0, nextBeat: 0, timeToDrop: -1, dropHit: false,
      impulse: 0, impact: 0, body: 0, cinema: 0, release: 0, momentum: 0, beatFired: false
    };
  }

  // A forced drop lands on the next downbeat, so it stays musical and can be anticipated.
  DMFSignalEngine.prototype.setForceDrop = function (on) {
    on = !!on;
    if (on && !this.forceDrop) {
      this.forceArmBar = Math.floor((this.time * this.bpm / 60 + this.beatOffset) / 4);
      this.forceActive = false;
    }
    if (!on) this.forceActive = false;
    this.forceDrop = on;
  };

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

    if (this.forceDrop && !this.forceActive && bar !== this.forceArmBar) this.forceActive = true;
    var forced = this.forceActive;

    var drive, section, isDrop = 0, buildP = 0;
    if (forced) { drive = 1; section = 'drop'; isDrop = 1; }
    else if (barInCycle < 8) { drive = 0.3; section = 'intro'; }
    else if (barInCycle < 16) { drive = 0.55; section = 'groove'; }
    else if (barInCycle < 24) {
      buildP = (barInCycle - 16 + barPos) / 8;
      drive = 0.6 + 0.32 * buildP;
      section = 'build';
    } else { drive = 1; section = 'drop'; isDrop = 1; }

    // Kick: four-on-the-floor, silent on the last build bar for tension.
    var kickGate = (section === 'build' && barInCycle === 23 && !forced) ? 0 : 1;
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

    // === Beat predictor: known phase for the clock, measured interval/onsets for audio ===
    var audioLed = m > 0.5 && this.audioLastOnset >= 0;
    var interval, ttb;
    if (audioLed) {
      interval = this.audioInterval;
      var since = this.time - this.audioLastOnset;
      ttb = this.audioLastOnset + Math.max(1, Math.ceil(since / interval - 1e-6)) * interval - this.time;
    } else {
      interval = 60 / this.bpm;
      ttb = (1 - (beats - beatIndex)) * interval;
    }
    ttb = ttb < 0 ? 0 : (ttb > interval ? interval : ttb);
    o.beatInterval = interval;
    o.timeToBeat = ttb;
    o.nextBeat = this.time + ttb;

    // Time to the next drop downbeat (clock arrangement or an armed forced drop); -1 when unknown.
    if (audioLed || forced) o.timeToDrop = -1;
    else if (this.forceDrop) o.timeToDrop = (1 - barPos) * 4 * interval;
    else {
      var cycleBeats = CYCLE_BARS * 4;
      var cycleBeat = ((beats % cycleBeats) + cycleBeats) % cycleBeats;
      o.timeToDrop = (cycleBeat < 96 ? 96 - cycleBeat : cycleBeats - cycleBeat + 96) * interval;
    }
    o.dropHit = section === 'drop' && this.prevSection !== 'drop' && this.prevSection !== '' && !audioLed;
    this.prevSection = section;
    // An analyser drop must be earned: ≥4 s of calm, then sustained drop energy; it lands on the next beat.
    if (audioLed) {
      if (o.dropEnergy < 0.45) this.audioCalm += dt;
      if (!this.audioDropArmed && o.dropEnergy > 0.7 && this.audioCalm > 4) this.audioDropArmed = true;
    } else {
      this.audioCalm = 0;
      this.audioDropArmed = false;
    }

    // IMPULSE (0-90 ms): on the beat; in analyser mode on the predicted beat, leadTime early.
    var fired = 0;
    if (audioLed) {
      if (ttb <= this.leadTime && Math.abs(o.nextBeat - this.lastFiredBeat) > interval * 0.5) {
        fired = clamp01(0.55 + 0.45 * o.low);
        this.lastFiredBeat = o.nextBeat;
      } else if (this.audio && this.audio.kickOnset && this.time - this.lastFiredBeat > interval * 0.5) {
        fired = clamp01(0.55 + 0.45 * o.low);
        this.lastFiredBeat = this.time;
      }
    } else if (this.lastBeatIndex !== null && beatIndex !== this.lastBeatIndex && kickGate) {
      fired = clamp01((section === 'intro' ? 0.6 : 0.75) + 0.25 * drive);
    }
    this.lastBeatIndex = beatIndex;
    if (this.audioDropArmed && fired > 0) {
      o.dropHit = true;
      this.audioDropArmed = false;
      this.audioCalm = 0;
    }
    if (o.dropHit) fired = 1;
    o.beatFired = fired > 0;
    o.impulse = Math.max(o.impulse * Math.exp(-dt / 0.045), fired);
    o.impact = o.impulse;
    // BODY (90-320 ms): a two-stage follower so it peaks after the impulse, not with it.
    // CINEMA (250-1600 ms) follows the body.
    this.bodyStage = follow(this.bodyStage, o.impulse, 0.05, 0.05, dt);
    o.body = clamp01(follow(o.body, this.bodyStage * 2.6, 0.07, 0.07, dt));
    o.cinema = clamp01(follow(o.cinema, o.body * (0.4 + 0.6 * o.energy), 0.25, 1.0, dt));
    o.release = clamp01(o.body - o.impulse);
    this.energySlow = follow(this.energySlow, o.energy, 1.5, 1.5, dt);
    o.momentum = clamp01(follow(o.momentum, clamp01((o.energy - this.energySlow) * 4 + buildP * 0.9), 0.3, 0.8, dt));
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

  // HYPERDRIVE MOMENT — a finite 2-4 s cinematic event, never a state.
  // Earned from a drop downbeat (or an armed forced drop); one entry per drop, cooldown between events.
  // pre (0..1) rises during the 0.5 s before a predicted drop so the scene can contract first.
  var HD_PHASES = [[0.1, 'hit'], [0.3, 'push'], [0.6, 'wave'], [1.0, 'spread']];
  function DMFHyperdrive(opts) {
    opts = opts || {};
    this.duration = opts.duration || 3;
    this.cooldown = opts.cooldown || 8;
    this.active = false;
    this.phase = 'idle';
    this.t = 0;
    this.level = 0;
    this.pre = 0;
    this.id = 0;
    this.latch = false;
    this.sinceLast = 1e9;
  }
  DMFHyperdrive.prototype.canFire = function () {
    return !this.active && !this.latch && this.sinceLast >= this.cooldown;
  };
  DMFHyperdrive.prototype.fire = function () {
    if (!this.canFire()) return false;
    this.active = true;
    this.latch = true;
    this.t = 0;
    this.sinceLast = 0;
    this.id++;
    this.phase = 'hit';
    return true;
  };
  DMFHyperdrive.prototype.update = function (sig, dt) {
    this.sinceLast += dt;
    if (this.latch && !this.active && sig.dropEnergy < 0.5) this.latch = false;
    var predicted = sig.timeToDrop >= 0 && sig.timeToDrop <= 0.5 && this.canFire();
    this.pre = follow(this.pre, predicted ? 1 - sig.timeToDrop / 0.5 : 0, 0.05, 0.25, dt);
    if (sig.dropHit) this.fire();
    if (!this.active) { this.level = 0; this.phase = 'idle'; return this; }
    this.t += dt;
    if (this.t >= this.duration) {
      this.active = false;
      this.level = 0;
      this.phase = 'idle';
      return this;
    }
    this.pre = 0;
    this.level = this.t < 0.06 ? this.t / 0.06 : Math.exp(-(this.t - 0.06) * 1.6);
    this.phase = 'decay';
    for (var i = 0; i < HD_PHASES.length; i++) {
      if (this.t < HD_PHASES[i][0]) { this.phase = HD_PHASES[i][1]; break; }
    }
    return this;
  };

  // Dynamic render resolution inside a tier: steps down 0.1 on sustained low FPS, climbs 0.05 only
  // after three good windows, and never changes twice within minGap seconds — no per-second oscillation.
  function DMFRenderScaler(min, max, opts) {
    opts = opts || {};
    this.min = min;
    this.max = max;
    this.scale = max;
    this.window = opts.window || 2;
    this.minGap = opts.minGap || 4;
    this.acc = 0;
    this.frames = 0;
    this.time = 0;
    this.good = 0;
    this.lastChange = -1e9;
    this.fps = 60;
  }
  DMFRenderScaler.prototype.setRange = function (min, max) {
    this.min = min;
    this.max = max;
    this.scale = Math.min(Math.max(this.scale, min), max);
  };
  DMFRenderScaler.prototype.sample = function (realDt) {
    if (realDt > 0.25) { this.acc = 0; this.frames = 0; return null; }
    this.time += realDt;
    this.acc += realDt;
    this.frames++;
    if (this.acc < this.window) return null;
    this.fps = this.frames / this.acc;
    this.acc = 0;
    this.frames = 0;
    this.good = this.fps >= 58 ? this.good + 1 : 0;
    if (this.time - this.lastChange < this.minGap) return null;
    if (this.fps < 50 && this.scale > this.min + 1e-6) {
      this.scale = Math.max(this.min, Math.round((this.scale - 0.1) * 100) / 100);
      this.lastChange = this.time;
      this.good = 0;
      return this.scale;
    }
    if (this.good >= 3 && this.scale < this.max - 1e-6) {
      this.scale = Math.min(this.max, Math.round((this.scale + 0.05) * 100) / 100);
      this.lastChange = this.time;
      this.good = 0;
      return this.scale;
    }
    return null;
  };

  var api = {
    BPM: BPM,
    clamp01: clamp01,
    follow: follow,
    DMFSpring: DMFSpring,
    DMFSignalEngine: DMFSignalEngine,
    DMFStateMachine: DMFStateMachine,
    DMFPerformanceGovernor: DMFPerformanceGovernor,
    DMFHyperdrive: DMFHyperdrive,
    DMFRenderScaler: DMFRenderScaler
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFOverdrive = api;
})(typeof window !== 'undefined' ? window : this);
