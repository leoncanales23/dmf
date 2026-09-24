/* DMF SPATIAL STAGE — pure, deterministic, ES5, no DOM.
 * V4 continuity engine: the landing is one stage. Scroll picks the destination (an ACT), audio supplies
 * force, kinetic bodies supply the motion. Inlined into public/index.html by scripts/build-3d.cjs after
 * kinetic.js; required directly by tests. */
(function (root) {
  'use strict';

  var K = typeof module === 'object' && module.exports ? require('./kinetic.js') : root.DMFKinetic;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function bump(t, a, b) { return t > a && t < b ? Math.sin(Math.PI * (t - a) / (b - a)) : 0; }
  function follow(current, target, attack, release, dt) {
    var tau = target > current ? attack : release;
    return current + (target - current) * (1 - Math.exp(-dt / tau));
  }

  var ACTS = ['ARRIVAL', 'SIGNAL', 'TRANSMISSION', 'ACADEMY', 'OFFER', 'CONTACT'];

  // === DMFStagePose — one authored composition per ACT ===
  // w: 0 = the Receiver lives in the relic band (ARRIVAL), 1 = docked to the viewport at (cx, cy) with a
  //    composition frame h × viewport height. az/r/y/ty/fov: camera journey offsets (rad, dolly fraction,
  //    world units, degrees). rotY/scale/depth: Receiver orientation, size and advance. light: key
  //    emphasis. opacity: how present the stage is behind the act's text.
  var POSE_KEYS = ['w', 'cx', 'cy', 'h', 'az', 'r', 'y', 'ty', 'fov', 'rotY', 'scale', 'depth', 'light', 'opacity'];
  function DMFStagePose(v) {
    for (var i = 0; i < POSE_KEYS.length; i++) this[POSE_KEYS[i]] = v && v[POSE_KEYS[i]] != null ? v[POSE_KEYS[i]] : 0;
  }
  DMFStagePose.prototype.copy = function (p) {
    for (var i = 0; i < POSE_KEYS.length; i++) this[POSE_KEYS[i]] = p[POSE_KEYS[i]];
    return this;
  };

  // Desktop: behind text the Receiver is a quiet presence docked toward an edge — right, left, right,
  // above the offer, then larger for the last word — and it only rises while the stage is moving.
  var POSES_WIDE = [
    { w: 0, cx: 0.5, cy: 0.5, h: 1, opacity: 1 },
    { w: 1, cx: 0.85, cy: 0.56, h: 0.78, az: 0.32, r: 0.06, y: 0.25, ty: 0.05, fov: -0.8, rotY: -0.22, scale: -0.04, light: 0.35, opacity: 0.3 },
    { w: 1, cx: 0.15, cy: 0.52, h: 0.78, az: -0.42, r: -0.04, y: -0.35, ty: -0.12, fov: 0.8, rotY: 0.28, depth: 0.05, light: 0.15, opacity: 0.3 },
    { w: 1, cx: 0.86, cy: 0.6, h: 0.7, az: 0.16, r: 0.14, y: 0.55, ty: 0.1, fov: -0.5, rotY: -0.12, scale: -0.06, depth: -0.04, light: -0.1, opacity: 0.26 },
    { w: 1, cx: 0.5, cy: 0.17, h: 0.5, r: 0.22, y: 0.3, ty: 0.08, fov: -1.2, scale: -0.08, depth: -0.06, light: -0.25, opacity: 0.2 },
    { w: 1, cx: 0.72, cy: 0.5, h: 0.92, az: 0.06, r: -0.08, y: 0.1, fov: -0.6, rotY: 0.05, scale: 0.02, depth: 0.04, light: 0.45, opacity: 0.45 }
  ];
  // Compact (phones): a composed stage of its own — centred, upper third, gentle camera, quieter behind text.
  var POSES_COMPACT = [
    { w: 0, cx: 0.5, cy: 0.5, h: 1, opacity: 1 },
    { w: 1, cx: 0.5, cy: 0.3, h: 0.55, az: 0.13, r: 0.03, y: 0.1, fov: -0.3, rotY: -0.1, scale: -0.03, light: 0.2, opacity: 0.24 },
    { w: 1, cx: 0.5, cy: 0.3, h: 0.55, az: -0.17, y: -0.14, fov: 0.3, rotY: 0.12, light: 0.1, opacity: 0.22 },
    { w: 1, cx: 0.5, cy: 0.28, h: 0.5, az: 0.06, r: 0.06, y: 0.22, rotY: -0.05, scale: -0.03, opacity: 0.2 },
    { w: 1, cx: 0.5, cy: 0.24, h: 0.46, r: 0.09, y: 0.12, fov: -0.5, scale: -0.04, light: -0.1, opacity: 0.18 },
    { w: 1, cx: 0.5, cy: 0.36, h: 0.62, az: 0.03, r: -0.03, fov: -0.3, light: 0.25, opacity: 0.32 }
  ];
  function buildPoses(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) out.push(new DMFStagePose(list[i]));
    return out;
  }

  // === DMFScrollField — conditioned scroll velocity ===
  // Raw position → px/s → normalized (clamped ±1) → low-pass → a critically damped, acceleration- and
  // jerk-limited body. Never raw wheel deltas. With the page still, everything reaches exactly zero.
  function DMFScrollField(opts) {
    opts = opts || {};
    this.vRef = opts.vRef || 2400;
    this.maxInfluence = opts.maxInfluence || 1;
    this.prev = null;
    this.raw = 0;
    this.lp = 0;
    this.body = new K.DMFKineticBody(90, 1, { maxA: 14, maxJ: 400, min: -1, max: 1 });
    this.velocity = 0;
    this.acceleration = 0;
    this.jerk = 0;
  }
  DMFScrollField.prototype.update = function (scrollY, dt) {
    if (!(dt > 0)) return this;
    var v = this.prev === null ? 0 : (scrollY - this.prev) / dt;
    this.prev = scrollY;
    this.raw = clamp(v / this.vRef, -1, 1);
    this.lp += (this.raw - this.lp) * (1 - Math.exp(-dt / 0.08));
    if (this.raw === 0 && Math.abs(this.lp) < 1e-4) this.lp = 0;
    var b = this.body;
    b.step(this.lp * this.maxInfluence, dt);
    if (this.lp === 0 && Math.abs(b.x) < 1e-4 && Math.abs(b.v) < 1e-3 && Math.abs(b.a) < 1e-2) b.reset(0);
    this.velocity = b.x;
    this.acceleration = b.a;
    this.jerk = b.jerk;
    return this;
  };

  // === DMFTransit — the V4 finite event for crossing an ACT boundary (~800 ms) ===
  // PRELOAD → OPEN (depth opens) → TRAVEL (Receiver + camera follow) → PASS (architecture passes) → SETTLE.
  // Its envelope is capped at 0.6 — always below SINGULARITY. No flash, no shake: it only shapes forces.
  var TRANSIT_PHASES = [[0.12, 'preload'], [0.26, 'open'], [0.52, 'travel'], [0.64, 'pass'], [0.8, 'settle']];
  var TRANSIT_PEAK = 0.6;
  function DMFTransit() {
    this.duration = 0.8;
    this.active = false;
    this.phase = 'idle';
    this.t = 0;
    this.from = 0;
    this.to = 0;
    this.dir = 0;
    this.id = 0;
    this.level = 0;
    this.preload = 0;
    this.open = 0;
    this.pass = 0;
  }
  DMFTransit.prototype.start = function (from, to) {
    this.active = true;
    this.t = 0;
    this.from = from;
    this.to = to;
    this.dir = to > from ? 1 : -1;
    this.id++;
    this.phase = 'preload';
  };
  DMFTransit.prototype.update = function (dt) {
    if (!this.active) { this.phase = 'idle'; this.level = this.preload = this.open = this.pass = 0; return this; }
    this.t += dt;
    var t = this.t;
    if (t >= this.duration) { this.active = false; this.phase = 'idle'; this.level = this.preload = this.open = this.pass = 0; return this; }
    this.phase = 'settle';
    for (var i = 0; i < TRANSIT_PHASES.length; i++) {
      if (t < TRANSIT_PHASES[i][0]) { this.phase = TRANSIT_PHASES[i][1]; break; }
    }
    this.preload = bump(t, 0, 0.2);
    this.open = bump(t, 0.1, 0.5);
    this.pass = bump(t, 0.48, 0.68);
    this.level = TRANSIT_PEAK * (t < 0.08 ? t / 0.08 : 1) * (1 - smooth01((t - 0.3) / (this.duration - 0.3)));
    return this;
  };

  // === DMFStageDirector — scroll → ACT, with dwell, cooldown and SINGULARITY hold ===
  // Markers are document tops of landing regions mapped to ACTs (measured by the page, not per frame).
  // The candidate ACT is the one under a focus line at 50% of the viewport; it must hold for `dwell`
  // before it is committed, so fast scrolling never fires a storm. A TRANSIT fires on a commit only
  // outside the cooldown. While a SINGULARITY holds the stage nothing is committed; when it ends the
  // director commits whatever ACT is current then — never the one it started in.
  function DMFStageDirector(opts) {
    opts = opts || {};
    this.dwell = opts.dwell || 0.28;
    this.cooldown = opts.cooldown || 1.2;
    this.compact = !!opts.compact;
    this.poses = buildPoses(this.compact ? POSES_COMPACT : POSES_WIDE);
    this.markerTop = [];
    this.markerAct = [];
    this.actStart = [0, 0, 0, 0, 0, 0];
    this.actEnd = [0, 0, 0, 0, 0, 0];
    this.act = 0;
    this.candidate = 0;
    this.progress = 0;
    this.pending = 0;
    this.sinceTransit = 1e9;
    this.transit = new DMFTransit();
    this.target = new DMFStagePose();
    this.transitStarted = false;
    this.commits = 0;
  }
  DMFStageDirector.ACTS = ACTS;
  DMFStageDirector.prototype.setCompact = function (on) {
    on = !!on;
    if (on === this.compact) return;
    this.compact = on;
    this.poses = buildPoses(on ? POSES_COMPACT : POSES_WIDE);
  };
  // tops/acts: parallel arrays in document order (acts non-decreasing).
  DMFStageDirector.prototype.setMarkers = function (tops, acts, docHeight) {
    this.markerTop = tops.slice();
    this.markerAct = acts.slice();
    for (var a = 0; a < ACTS.length; a++) { this.actStart[a] = -1; this.actEnd[a] = -1; }
    for (var i = 0; i < acts.length; i++) if (this.actStart[acts[i]] < 0) this.actStart[acts[i]] = tops[i];
    var next = docHeight || (tops.length ? tops[tops.length - 1] + 1 : 1);
    for (a = ACTS.length - 1; a >= 0; a--) {
      if (this.actStart[a] < 0) continue;
      this.actEnd[a] = Math.max(next, this.actStart[a] + 1);
      next = this.actStart[a];
    }
  };
  DMFStageDirector.prototype.update = function (scrollY, vh, dt, hold) {
    this.transitStarted = false;
    this.sinceTransit += dt;
    var focus = scrollY + vh * 0.5;
    var cand = 0;
    for (var i = 0; i < this.markerTop.length; i++) {
      if (this.markerTop[i] <= focus) cand = this.markerAct[i];
      else break;
    }
    if (cand !== this.candidate) { this.candidate = cand; this.pending = 0; }
    else this.pending += dt;
    if (!hold && cand !== this.act && this.pending >= this.dwell) {
      var from = this.act;
      this.act = cand;
      this.commits++;
      if (this.sinceTransit >= this.cooldown) {
        this.transit.start(from, cand);
        this.sinceTransit = 0;
        this.transitStarted = true;
      }
    }
    this.transit.update(dt);
    var s = this.actStart[this.act], e = this.actEnd[this.act];
    this.progress = s >= 0 && e > s ? clamp01((focus - s) / (e - s)) : 0;
    // Scroll sets the destination: the committed ACT's pose, drifting gently with progress through it.
    var p = this.poses[this.act];
    var tg = this.target.copy(p);
    if (p.w > 0) {
      var d = this.progress - 0.5;
      tg.az += d * (this.compact ? 0.03 : 0.08);
      tg.y -= d * (this.compact ? 0.04 : 0.1);
    }
    return this;
  };
  DMFStageDirector.prototype.actName = function () { return ACTS[this.act]; };

  // === DMFStageFollower — every pose key is a jerk-limited kinetic body ===
  // Anchor keys travel with a little overshoot (anticipation comes from the TRANSIT preload). Once a key
  // is within epsilon of its target at negligible speed it snaps exactly, so the stage rests exactly.
  var FOLLOW = {
    w: [22, 0.74, 8, 220], cx: [22, 0.74, 6, 160], cy: [22, 0.74, 6, 160], h: [26, 0.8, 5, 140],
    az: [16, 0.85, 1.2, 30], r: [16, 0.85, 1.2, 30], y: [16, 0.85, 2.4, 60], ty: [16, 0.85, 1.2, 30],
    fov: [20, 0.8, 30, 900], rotY: [18, 0.72, 2.2, 60], scale: [24, 0.7, 0.8, 30], depth: [24, 0.7, 0.8, 30],
    light: [8, 1, 4, 60], opacity: [10, 1, 3, 40]
  };
  var LIMITS = {
    w: [-0.1, 1.1], cx: [0, 1], cy: [0, 1], h: [0.3, 1.2], az: [-0.6, 0.6], r: [-0.25, 0.35], y: [-0.6, 0.8],
    ty: [-0.3, 0.3], fov: [-2.5, 2.5], rotY: [-0.45, 0.45], scale: [-0.12, 0.08], depth: [-0.12, 0.12],
    light: [-0.5, 0.6], opacity: [0, 1]
  };
  function DMFStageFollower() {
    this.bodies = {};
    this.pose = new DMFStagePose();
    this.aim = new DMFStagePose();
    for (var i = 0; i < POSE_KEYS.length; i++) {
      var k = POSE_KEYS[i], f = FOLLOW[k], l = LIMITS[k];
      this.bodies[k] = new K.DMFKineticBody(f[0], f[1], { maxA: f[2], maxJ: f[3], min: l[0], max: l[1] });
    }
    this.speed = 0;
    this.rest = true;
  }
  DMFStageFollower.prototype.reset = function (pose) {
    for (var i = 0; i < POSE_KEYS.length; i++) {
      var k = POSE_KEYS[i];
      this.bodies[k].reset(pose[k]);
      this.pose[k] = pose[k];
    }
    this.speed = 0;
    this.rest = true;
  };
  // transit (optional): anticipation against the travel direction, depth opening, a small pass push.
  DMFStageFollower.prototype.update = function (target, dt, transit, amp) {
    if (!(dt > 0)) return this.pose;
    amp = amp == null ? 1 : amp;
    var aim = this.aim.copy(target);
    if (transit && transit.active) {
      aim.cy -= transit.dir * 0.035 * transit.preload * amp;
      aim.r += 0.08 * transit.open * amp;
      aim.fov += 0.9 * transit.open * amp - 0.6 * transit.pass * amp;
      aim.depth += 0.05 * transit.pass * amp;
    }
    var speed = 0, rest = true;
    for (var i = 0; i < POSE_KEYS.length; i++) {
      var k = POSE_KEYS[i], b = this.bodies[k];
      var goal = clamp(aim[k], LIMITS[k][0], LIMITS[k][1]);
      b.step(goal, dt);
      if (Math.abs(b.x - goal) < 1e-5 && Math.abs(b.v) < 1e-4 && Math.abs(b.a) < 1e-2) b.reset(goal);
      else rest = false;
      this.pose[k] = b.x;
      if (k === 'w' || k === 'cx' || k === 'cy' || k === 'rotY') speed += Math.abs(b.v);
    }
    this.speed = speed;
    this.rest = rest;
    return this.pose;
  };

  // === DMFPortalField — when the spatial architecture shows, and how audio shapes it ===
  // Depth reveals itself with motion (stage travel, scroll, TRANSIT, SINGULARITY) and fades to exactly
  // nothing at rest. KICK: perspective punch, floor propagation, structural compression. LOW: stage depth
  // pressure. MID: lateral architecture. HIGH: edge travel speed. ENERGY: amplitude.
  function DMFPortalField() {
    this.intensity = 0;
    this.compression = 0;
    this.pressure = 0;
    this.lateral = 0;
    this.edgePhase = 0;
    this.floorT = 9;
    this.floorAmp = 0;
    this.punch = 0;
    this.prevKick = 0;
  }
  DMFPortalField.prototype.update = function (motion, scroll, transit, sing, f, dt) {
    if (!(dt > 0)) return this;
    var target = clamp01(0.9 * motion + 0.7 * Math.abs(scroll) + 1.1 * transit + sing);
    this.intensity = follow(this.intensity, target, 0.05, 0.55, dt);
    if (target === 0 && this.intensity < 1e-3) this.intensity = 0;
    var kick = f.forceKick;
    if (kick > 0.6 && this.prevKick <= 0.6) { this.floorT = 0; this.floorAmp = kick * (0.35 + 0.65 * f.amp); }
    this.prevKick = kick;
    this.floorT += dt;
    this.punch = follow(this.punch, kick > 0.6 ? kick : 0, 0.008, 0.09, dt);
    this.compression = follow(this.compression, kick * 0.6, 0.01, 0.12, dt);
    this.pressure = follow(this.pressure, f.forceLow, 0.08, 0.5, dt);
    this.lateral = follow(this.lateral, f.forceMid, 0.1, 0.4, dt);
    this.edgePhase = (this.edgePhase + dt * (0.25 + 1.6 * f.forceHigh)) % 1;
    return this;
  };

  var api = {
    ACTS: ACTS,
    POSE_KEYS: POSE_KEYS,
    POSES_WIDE: POSES_WIDE,
    POSES_COMPACT: POSES_COMPACT,
    TRANSIT_PEAK: TRANSIT_PEAK,
    DMFStagePose: DMFStagePose,
    DMFScrollField: DMFScrollField,
    DMFTransit: DMFTransit,
    DMFStageDirector: DMFStageDirector,
    DMFStageFollower: DMFStageFollower,
    DMFPortalField: DMFPortalField
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DMFStage = api;
})(typeof window !== 'undefined' ? window : this);
