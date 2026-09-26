/* DMF BLACK SUN — pure cinematic layer for the Event Horizon director (V4). ES5, no DOM, no clock, no timers.
 * The director steps it after the V3 Stage Overdrive with the same state object. It turns the existing
 * signal (LOW / MID / HIGH / KICK, calm, section, scroll) into the terms that make the page one instrument:
 * the Black Sun behind the Receiver, one impact shot per meaningful kick, two architectural light blades,
 * a delayed reflection shock, typographic pressure, a compress → hold → open section cut, a once-per-session
 * reveal of the Receiver, and silence as an effect. Every term is hard-clamped here; the offer is a sanctuary.
 * Inlined into public/index.html by scripts/build-3d.cjs after stage-overdrive.js; required by tests. */
(function (root) {
  'use strict';

  var node = typeof module === 'object' && module.exports;
  var SN = node ? require('./spatial-narrative.js') : root.DMFSpatialNarrative;
  var SO = node ? require('./stage-overdrive.js') : root.DMFStageOverdrive;
  var Critical = SN.DMFCritical;
  var Mass = SO.DMFMass;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth01(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function win(t, a, b) { return smooth01((t - a) / (b - a)); }
  function envelope(cur, target, attack, release, dt) {
    return cur + (target - cur) * (1 - Math.exp(-(target > cur ? attack : release) * dt));
  }

  var LIMITS = {
    sunScale: 0.03,        // the disc breathes at most ±3%
    kickCompress: 0.025,   // one kick compresses it 2.5%, then a heavy return
    impactDur: 0.26,       // an impact shot lasts 260 ms (180–320 ms brief)
    impactGap: 0.9,        // and never more often than this
    impactKick: 0.6,       // only meaningful kicks
    transDur: 0.45,        // compress → near-black hold → depth opening
    revealDur: 1.4,        // dark → silhouette → Black Sun edge → material light → typography
    torsoLag: 0.03,
    liftMin: -0.3,
    liftMax: 1
  };
  // Sections where the stage may take an impact shot and the blades may open.
  var ENERGETIC = { hero: 1, relic: 1, band: 1, releases: 1, sets: 1 };
  // Crossings between neighbouring major sections get the cinematic cut.
  var MAJOR = { intro: 1, hero: 1, relic: 1, bio: 1, band: 1, releases: 1, sets: 1, academy: 1 };
  var QUIET = 0.06, QUIET_IN = 0.6, QUIET_FULL = 2.0;   // silence starts after 0.6 s of quiet, full at 2 s

  function DMFBlackSun() {
    this.sunLow = 0; this.iris = 0; this.halo = 0;
    this.kEnv = 0; this.kOut = 0;            // kick compression: instant hit, exponential return, eased
    this.gEnv = 0; this.gOut = 0;            // Receiver glow kick: shorter
    this.impactT = 9; this.impactK = 0; this.sinceImpact = 9;
    this.lift = new Mass(8, 0.8);            // the Receiver settles into frame after the push
    this.refl = new Critical(7);             // the reflection answers the impact late (critically damped follow)
    this.torso = new Critical(0.8);          // torso follows the shoulders, later still
    this.beam = 0; this.tp = 0;
    this.quietT = 0;
    this.transT = 9; this.sinceTrans = 9; this._idx = -1;
    this.revealed = false; this.revealT = -1; this.revealNow = false;
    this._ids = null; this._relicIdx = -1;
  }

  // st: the Event Horizon state (read and written in place), after DMFStageOverdrive.update.
  DMFBlackSun.prototype.update = function (st, inp, ids, dt) {
    var s = inp.s || st;
    var tier = st.performanceTier;
    var still = tier === 'static';
    var lite = tier === 'lite';
    var compact = !!st.compact;
    var calm = st.calm;
    var sanct = clamp01((calm - 0.6) / 0.25);                 // 1 inside the offer (calm > 0.85)
    var section = ids[st.index];
    var i;
    if (ids !== this._ids) {
      this._ids = ids; this._relicIdx = -1;
      for (i = 0; i < ids.length; i++) if (ids[i] === 'relic') { this._relicIdx = i; break; }
    }

    // --- SILENCE: after a short quiet the whole stage settles, heavily, on purpose ---
    var loud = (s.energy || 0) >= QUIET || !!s.beatFired;
    this.quietT = loud ? Math.max(0, Math.min(this.quietT, QUIET_FULL) - 4 * dt) : Math.min(this.quietT + dt, QUIET_FULL + 1);
    st.silence = smooth01((this.quietT - QUIET_IN) / (QUIET_FULL - QUIET_IN));

    // Authority: phones 45%, LITE 60%; silence and the offer take it away; STATIC has none.
    var devK = (compact ? 0.45 : 1) * (lite ? 0.6 : 1);
    var auth = st.wake * (1 - st.silence) * (1 - 0.95 * sanct) * (still ? 0 : 1);
    var energetic = ENERGETIC[section] ? 1 : 0;

    // --- REVEAL: once per session, the first time the Receiver's band arrives (or is already passed) ---
    this.revealNow = false;
    if (!this.revealed && this.revealT < 0 && st.running && this._relicIdx >= 0 && st.index >= this._relicIdx) {
      this.revealT = 0; this.revealNow = true;
    }
    if (this.revealT >= 0 && !this.revealed) { this.revealT += dt; if (this.revealT >= LIMITS.revealDur) this.revealed = true; }
    var rt = this.revealed || still ? LIMITS.revealDur : Math.max(0, this.revealT);
    st.reveal = clamp01(rt / LIMITS.revealDur);
    st.revealEdge = win(rt, 0.3, 0.75);
    st.revealLight = 0.25 + 0.75 * win(rt, 0.55, 1.1);
    st.revealType = win(rt, 0.85, 1.4);

    // --- BLACK SUN: LOW expands and deepens, MID draws the inner circumference, HIGH the thin edge ---
    this.sunLow = envelope(this.sunLow, st.low * auth, 6, 1.4, dt);
    this.iris = envelope(this.iris, st.mid * auth, 5, 1.6, dt);
    this.halo = envelope(this.halo, st.high * auth, 12, 3, dt);
    var kickHit = s.beatFired ? clamp01(0.35 + 0.65 * (s.kick || 0)) * auth : 0;
    // KICK: one fast compression, then a heavy return. Never a bounce, never a standing oscillation.
    this.kEnv = kickHit > this.kEnv ? kickHit : this.kEnv * Math.exp(-4 * dt);
    this.kOut = envelope(this.kOut, this.kEnv, 30, 30, dt);
    this.gEnv = kickHit > this.gEnv ? kickHit : this.gEnv * Math.exp(-7 * dt);
    this.gOut = envelope(this.gOut, this.gEnv, 30, 30, dt);
    st.blackSun = clamp01(this.sunLow) * devK;
    st.iris = clamp01(this.iris) * devK;
    st.gravity = clamp01(this.kOut) * devK;
    st.sunScale = clamp(0.02 * st.blackSun - LIMITS.kickCompress * st.gravity, -LIMITS.sunScale, LIMITS.sunScale);

    // --- IMPACT SHOT: meaningful kicks, energetic sections, never in calm areas, rate-limited ---
    this.sinceImpact += dt;
    if (s.beatFired && (s.kick || 0) >= LIMITS.impactKick && energetic && calm < 0.3 && !still && st.silence < 0.5 &&
        st.wake > 0.95 && st.running && this.sinceImpact >= LIMITS.impactGap) {
      this.impactT = 0; this.sinceImpact = 0;
      this.impactK = clamp01(0.5 + 0.5 * (s.kick || 0)) * devK;
      this.lift.v += 4 * this.impactK;
    }
    var imp = 0;
    if (this.impactT < LIMITS.impactDur) {
      this.impactT += dt;
      var t = this.impactT;
      imp = t < 0.04 ? t / 0.04 : Math.pow(clamp01(1 - (t - 0.04) / (LIMITS.impactDur - 0.04)), 2);
      if (t >= LIMITS.impactDur) imp = 0;
    }
    st.impact = clamp01(imp * this.impactK);
    st.halo = clamp01(clamp01(this.halo) * devK + 0.5 * st.impact);
    st.stageLift = clamp(this.lift.step(0, dt), LIMITS.liftMin, LIMITS.liftMax);
    // The model moves first; its reflection answers later (a critically damped follow of the impact).
    st.reflectionShock = clamp01(1.8 * this.refl.step(st.impact, dt));
    st.sheenK = (st.sheenK == null ? 1 : st.sheenK) * (1 + 0.35 * st.reflectionShock);

    // --- LIGHT BLADES: architectural light, almost always dark; HIGH and scroll open them a little ---
    var beamT = energetic * auth * (0.55 * st.high + 0.35 * st.speed / 0.8) + 0.5 * st.impact;
    this.beam = envelope(this.beam, clamp01(beamT), 5, 1.2, dt);
    st.beam = clamp01(this.beam) * (lite ? 0.5 : 1) * (1 - sanct);

    // --- SECTION CUT: compress → near-black hold → depth opening (≤ 450 ms, never blocks scroll) ---
    if (this._idx < 0) this._idx = st.index;
    this.sinceTrans += dt;
    if (st.index !== this._idx) {
      var from = ids[this._idx];
      if (st.running && !still && MAJOR[from] && MAJOR[section] && Math.abs(st.index - this._idx) === 1 && this.sinceTrans > 0.3 && calm < 0.5) {
        this.transT = 0; this.sinceTrans = 0;
      }
      this._idx = st.index;
    }
    var hold = 0, open = 0;
    if (this.transT < LIMITS.transDur) {
      this.transT += dt;
      var u = this.transT;
      hold = u < 0.12 ? smooth01(u / 0.12) : (u < 0.2 ? 1 : 1 - smooth01((u - 0.2) / 0.25));
      open = u < 0.2 ? 0 : Math.sin(Math.PI * clamp01((u - 0.2) / 0.25));
      if (u >= LIMITS.transDur) { hold = 0; open = 0; }
    }
    var cutK = (compact ? 0.6 : 1) * (1 - sanct);
    st.hold = clamp01(hold * cutK);
    st.open = clamp01(open * cutK);
    st.vignette = clamp01(Math.max(0.7 * st.impact, 0.85 * st.hold));
    st.shadowDepth = clamp01(0.4 * st.blackSun + 0.6 * st.hold);
    st.zk = clamp((st.zk == null ? 0.5 : st.zk) * (1 - 0.25 * st.hold + 0.3 * st.open), 0.05, 1);

    // --- TYPOGRAPHIC PRESSURE: LOW / KICK press the titles, barely; neutral in the offer ---
    this.tp = envelope(this.tp, Math.max(0.6 * st.low * auth, st.gravity), 18, 3, dt);
    st.titlePressure = clamp01(this.tp) * (compact ? 0.5 : 1) * (1 - sanct);
    st.chromatic = clamp01(0.8 * st.impact + 0.15 * st.titlePressure);

    // --- RECEIVER MATERIAL LIFE: LOW warmth + a short KICK impulse, only once its light is revealed ---
    st.receiverGlow = clamp01(0.55 * clamp01(this.sunLow) + 0.45 * clamp01(this.gOut)) * devK * st.revealLight;

    // --- FIGURE INERTIA: head → shoulders (V3 bodyLag) → torso, later still; silence returns it to rest ---
    st.torsoLag = clamp(this.torso.step(st.bodyLag || 0, dt), -LIMITS.torsoLag, LIMITS.torsoLag);
    st.breath = (st.breath || 0) * (1 - st.silence);
    return st;
  };

  // A composed, motionless frame (reduced motion, Save-Data, STATIC): revealed, nothing reacting.
  DMFBlackSun.prototype.compose = function (st) {
    st.blackSun = 0; st.iris = 0; st.gravity = 0; st.sunScale = 0; st.halo = 0;
    st.impact = 0; st.stageLift = 0; st.reflectionShock = 0; st.beam = 0;
    st.hold = 0; st.open = 0; st.vignette = 0; st.shadowDepth = 0;
    st.titlePressure = 0; st.chromatic = 0; st.receiverGlow = 0; st.torsoLag = 0; st.silence = 0;
    st.reveal = 1; st.revealEdge = 1; st.revealLight = 1; st.revealType = 1;
    return st;
  };

  var api = { LIMITS: LIMITS, ENERGETIC: ENERGETIC, MAJOR: MAJOR, DMFBlackSun: DMFBlackSun };
  if (node) module.exports = api;
  else root.DMFBlackSun = api;
})(typeof window !== 'undefined' ? window : this);
