/* DMF MIXER STAGE — Pioneer DJM-900NXS2 in the Tips slide (#tips .dmf-mixer).
 * The owner's GLB (assets/models/pioneer-djm-900nxs2-mixer-slide.glb, derived from their STL) lit as a product
 * shot and driven by the DMF Signal Bus. It borrows everything it needs from the landing:
 *   - Three.js r128 + GLTFLoader loaded once by relic.js (announced on hub.three / 'dmf:three');
 *   - the single bus clock (hub.onFrame) — no own loop, no timers, no AudioContext;
 *   - the governor's tier (hub.qualityTier), which only ever steps down, so there is no ping-pong.
 * Loads when the slide nears the viewport, renders only while it is visible. Reduced motion renders one
 * lit frame; Save-Data, a missing WebGL context or a failed asset keep the CSS fallback in place.
 * Inlined into public/index.html by scripts/build-3d.cjs after relic.js. */
(function () {
  'use strict';
  var MODEL_URL = 'assets/models/pioneer-djm-900nxs2-mixer-slide.glb';
  var ORANGE = 0xff5b1e, AMBER = 0xff8a3d, COOL = 0x7f93b8, SPEC = 0xffd2b0;
  // Framing is derived from the model's Box3; these are only the viewing angles (3/4, slightly above).
  var VIEW_AZIMUTH = -0.62, VIEW_ELEVATION = 0.62, FOV = 24;
  var POINTER_MAX = 4 * Math.PI / 180;   // ±4° parallax on a fine pointer
  var DPR_CAP = { high: 1.75, balanced: 1.25, lite: 1, static: 1, none: 1.25 };

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }

  function radialTexture(THREE, stops) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (var i = 0; i < stops.length; i++) grad.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // A dark studio for the metal to reflect: one DMF-orange strip behind-left, one cold softbox front-right,
  // a dim warm ceiling. Baked once through PMREM; nothing in it is pure white.
  function studioEnvironment(THREE, renderer) {
    var env = new THREE.Scene();
    var room = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x050404, side: THREE.BackSide }));
    env.add(room);
    function panel(color, gain, w, h, x, y, z) {
      var m = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
      m.color.multiplyScalar(gain);
      var p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(x, y, z);
      p.lookAt(0, 0, 0);
      env.add(p);
    }
    panel(ORANGE, 1.8, 1.2, 7, -5.5, 1.5, -3);
    panel(COOL, 1.1, 4, 2.5, 4.5, 2.5, 4);
    panel(0x3a2a20, 1.4, 7, 7, 0, 5.8, 0);
    panel(0x6a5a50, 0.5, 6, 2.2, 1.5, 3.8, -4.5);   // warm-grey softbox the top plate mirrors
    var pmrem = new THREE.PMREMGenerator(renderer);
    var rt = pmrem.fromScene(env, 0.04);
    pmrem.dispose();
    env.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return rt.texture;
  }

  function mount() {
    var host = document.querySelector('#tips .dmf-mixer');
    if (!host) return;
    var stageEl = host.querySelector('.dmf-mixer-stage');
    var hub = window.DMFSignal;
    // Save-Data (and no bus at all): the relic never loads Three.js, so the slide keeps its CSS fallback.
    if (!stageEl || !hub || hub.saveData) { host.classList.add('is-fallback'); return; }

    var reduced = !!hub.reduced;
    var near = !('IntersectionObserver' in window);
    var visible = near;
    var started = false, failed = false, api = null;

    function fail() {
      if (failed) return;
      failed = true;
      host.classList.remove('is-live', 'is-sweep');
      host.classList.add('is-fallback');
      if (api) api.dispose();
    }

    function threeState() {
      var T = window.THREE;
      if (T && T.GLTFLoader) return 'ready';
      return hub.three || 'loading';
    }
    function maybeStart() {
      if (started || failed || !near) return;
      var st = threeState();
      if (st === 'failed') { fail(); return; }
      if (st !== 'ready') return;
      started = true;
      try { api = createScene(); } catch (e) { api = null; fail(); }
    }
    document.addEventListener('dmf:three', maybeStart);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { near = true; maybeStart(); }
      }, { rootMargin: '600px 0px' }).observe(host);
      new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          visible = entries[i].isIntersecting;
          if (visible && api) api.onVisible();
        }
      }, { threshold: 0 }).observe(host);
    }

    maybeStart();

    function createScene() {
      var THREE = window.THREE;
      var tier = hub.qualityTier || 'none';
      var renderer = new THREE.WebGLRenderer({ antialias: tier !== 'lite' && tier !== 'static', alpha: false, powerPreference: 'high-performance' });
      renderer.setClearColor(0x0a0806, 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      var canvas = renderer.domElement;
      canvas.className = 'dmf-mixer-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fail(); });
      stageEl.appendChild(canvas);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
      var envMap = studioEnvironment(THREE, renderer);

      // Light rig — rim first (the silhouette), then a cold fill, then a slow specular that travels.
      var hemi = new THREE.HemisphereLight(0x1a1c22, 0x0a0706, 0.6);
      var rim = new THREE.DirectionalLight(ORANGE, 0);
      rim.position.set(-2.2, 1.6, -2.4);
      var fill = new THREE.DirectionalLight(COOL, 0);
      fill.position.set(2.4, 1.2, 2.2);
      var spec = new THREE.PointLight(SPEC, 0, 0, 1);
      scene.add(hemi, rim, fill, spec);

      var rig = new THREE.Group();     // pointer parallax + idle drift
      var body = new THREE.Group();    // bus response (lift, scale, punch)
      rig.add(body);
      scene.add(rig);

      var hueNow = new THREE.Color(ORANGE), hueA = new THREE.Color(ORANGE), hueB = new THREE.Color(AMBER);
      var mats = [], edges = null, halo = null, shadow = null;
      var radius = 1, baseDist = 4, target = new THREE.Vector3(), floorY = 0;
      var ready = false, disposed = false;
      var w = 0, h = 0, sizeDirty = true, needsRender = true;
      var staticMode = reduced || tier === 'static';
      var liteSkip = false;

      var env = { t: 0, reveal: 0, rim: 0, fill: 0, edge: 0, awaitingKick: false, done: staticMode };
      var drive = { lift: 0, scale: 0, punch: 0, punchV: 0, mid: 0, high: 0, energy: 0.3, halo: 0 };
      var ptr = { x: 0, y: 0, yaw: 0, pitch: 0 };
      // Event Horizon layer: section focus (dolly, edge light), scroll inertia (lean), hover focus.
      var stage = { focus: 0, dolly: 0, lean: 0, hover: 0, hoverTarget: 0, low: 0 };
      var clock = 0;

      new THREE.GLTFLoader().load(MODEL_URL, function (gltf) {
        if (disposed) return;
        var model = gltf.scene;
        model.traverse(function (o) {
          if (!o.isMesh) return;
          // Crease-split normals are baked into the GLB (scripts/build-mixer-glb.cjs); this is only a guard.
          if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
          var src = o.material || {};
          // The asset's own PBR, nudged toward graphite: slightly more metal, a touch rougher, a real env.
          var m = new THREE.MeshStandardMaterial({
            color: (src.color ? src.color.clone() : new THREE.Color(0x1f1f22)).multiplyScalar(0.7),
            metalness: Math.min(0.86, (src.metalness != null ? src.metalness : 0.72) + 0.08),
            roughness: Math.max(0.24, (src.roughness != null ? src.roughness : 0.28) + 0.06),
            envMap: envMap,
            envMapIntensity: 0,
            emissive: new THREE.Color(ORANGE),
            emissiveIntensity: 0
          });
          o.material = m;
          mats.push(m);
          if (!edges) {
            // Feature edges of the asset itself — used for the HIGH shimmer and the first-kick light-up.
            var eg = new THREE.EdgesGeometry(o.geometry, 32);
            edges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
            o.add(edges);
          }
        });

        // Auto-center / auto-scale from the Box3: widest horizontal side becomes 1 unit, feet on y = 0.
        var box = new THREE.Box3().setFromObject(model);
        var size = box.getSize(new THREE.Vector3());
        var center = box.getCenter(new THREE.Vector3());
        var s = 1 / Math.max(size.x, size.z, 1e-6);
        model.scale.setScalar(s);
        model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
        body.add(model);
        var sw = size.x * s, sh = size.y * s, sd = size.z * s;
        radius = 0.5 * Math.sqrt(sw * sw + sh * sh + sd * sd);
        target.set(0, sh * 0.42, 0);
        floorY = 0;

        halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
          map: radialTexture(THREE, [[0, 'rgba(255,110,40,0.85)'], [0.35, 'rgba(255,91,30,0.28)'], [1, 'rgba(255,91,30,0)']]),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0
        }));
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = floorY - 0.004;
        halo.scale.set(sw * 2.1, sd * 1.9, 1);
        shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
          map: radialTexture(THREE, [[0, 'rgba(0,0,0,0.92)'], [0.55, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]),
          transparent: true, depthWrite: false
        }));
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = floorY - 0.002;
        shadow.scale.set(sw * 1.25, sd * 1.2, 1);
        body.add(halo, shadow);
        rim.target = body; fill.target = body;

        ready = true;
        host.classList.add('has-model');
        if (staticMode) settle();
        if (visible) onVisible();
        if (hub.perf) hub.perf.mixer = 'ready';
      }, undefined, fail);

      function frameCamera() {
        var rect = stageEl.getBoundingClientRect();
        w = Math.max(1, Math.round(rect.width));
        h = Math.max(1, Math.round(rect.height));
        var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP[tier] || 1);
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Fit the bounding sphere into the narrower field of view.
        var v = FOV * Math.PI / 180;
        var hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
        baseDist = radius / Math.sin(Math.min(v, hf) / 2) * 1.32;   // the sphere fit plus editorial air
        camera.near = baseDist / 50; camera.far = baseDist * 6;
        camera.updateProjectionMatrix();
        sizeDirty = false;
        if (hub.perf) hub.perf.mixerFit = { w: w, h: h, dpr: dpr, radius: +radius.toFixed(3), dist: +baseDist.toFixed(3), tier: tier };
      }

      function placeCamera() {
        var d = baseDist * (1 - 0.012 * drive.punch) * (1 + 0.04 * stage.dolly);
        // V2 camera grammar: in the mixer's section the camera sits up to ~3° lower.
        var elev = VIEW_ELEVATION - 0.05 * stage.low;
        var ce = Math.cos(elev);
        camera.position.set(
          target.x + d * ce * Math.sin(VIEW_AZIMUTH),
          target.y + d * Math.sin(elev),
          target.z + d * ce * Math.cos(VIEW_AZIMUTH));
        camera.lookAt(target);
      }

      function applyLook() {
        // ENERGY sets the global material intensity; MID warms the rim; HIGH brightens edges and the specular.
        var e = drive.energy, rv = env.reveal;
        hueNow.copy(hueA).lerp(hueB, clamp01(drive.mid * 0.8));
        rim.color.copy(hueNow);
        rim.intensity = env.rim * (1.15 + drive.mid * 0.6) * (1 + 0.18 * stage.hover);
        fill.intensity = env.fill * 0.95;
        spec.intensity = rv * (0.18 + drive.high * 0.35 + 0.1 * stage.hover);
        for (var i = 0; i < mats.length; i++) {
          mats[i].envMapIntensity = rv * (0.75 + 0.35 * e + drive.mid * 0.15);
          mats[i].emissiveIntensity = 0.018 * e * rv + env.edge * 0.04;
        }
        if (edges) edges.material.opacity = Math.min(0.6, env.edge * 0.5 + drive.high * 0.18 * rv + (0.05 + 0.04 * stage.focus) * rv);
        if (halo) halo.material.opacity = (0.42 + 0.3 * drive.halo + 0.12 * e) * env.rim;
        if (shadow) shadow.material.opacity = 0.35 + 0.65 * env.rim;
      }

      // The specular sits opposite the camera so its mirror image lands on the top plate, and drifts across it.
      function placeSpec(t) {
        var sweep = Math.sin(t * 0.23) * 0.9;
        spec.position.set(
          -Math.sin(VIEW_AZIMUTH + sweep) * radius * 1.6,
          target.y + radius * 1.1,
          -Math.cos(VIEW_AZIMUTH + sweep) * radius * 1.6);
      }

      function settle() {
        env.t = 3; env.reveal = 1; env.rim = 1; env.fill = 1; env.edge = 0; env.done = true;
        placeSpec(0.9);
        host.classList.add('is-revealed');
      }

      function render() {
        if (sizeDirty) frameCamera();
        placeCamera();
        applyLook();
        renderer.render(scene, camera);
        needsRender = false;
        if (!host.classList.contains('is-live')) host.classList.add('is-live');
      }

      function onVisible() {
        if (!ready || failed) return;
        if (!env.done && !host.classList.contains('is-sweep')) host.classList.add('is-sweep');
        if (staticMode || !hub.running) render();
      }

      // Entrance, once: dark → orange sweep (CSS) → rim silhouette → surface → the first kick lights the edges.
      function entrance(s, dt) {
        env.t += dt;
        var t = env.t;
        env.rim = smooth((t - 0.35) / 0.9);
        env.reveal = smooth((t - 1.0) / 1.3);
        env.fill = env.reveal;
        if (!env.awaitingKick && t > 2.3) env.awaitingKick = true;
        if (env.awaitingKick && s.beatFired) { env.edge = 1; env.awaitingKick = false; env.done = true; host.classList.add('is-revealed'); }
        if (env.awaitingKick && t > 6) { env.awaitingKick = false; env.done = true; host.classList.add('is-revealed'); }
      }

      function tick(s, dt, raw, bus) {
        if (!ready || failed || disposed) return;
        var nextTier = bus.qualityTier || tier;
        if (nextTier !== tier) { tier = nextTier; sizeDirty = true; if (tier === 'static') { staticMode = true; settle(); needsRender = true; } }
        if (!visible || document.hidden) return;
        if (staticMode) { if (needsRender || sizeDirty) render(); return; }
        // LITE halves the mixer's own cost; the bus keeps its full rate.
        if (tier === 'lite') { liteSkip = !liteSkip; if (liteSkip) return; dt = Math.min(0.1, dt * 2); }
        clock += dt;
        if (!env.done) entrance(s, dt);
        env.edge = approach(env.edge, 0, 2.2, dt);

        var fo = bus.forces || {};
        drive.energy = approach(drive.energy, clamp01(s.energy), 1.5, dt);
        drive.mid = approach(drive.mid, fo.forceMid || 0, 4, dt);
        drive.high = approach(drive.high, fo.forceHigh || 0, 9, dt);
        drive.lift = approach(drive.lift, fo.forceLow || 0, 6, dt);
        drive.halo = approach(drive.halo, Math.max(fo.forceKick || 0, (fo.forceLow || 0) * 0.5), 10, dt);
        // KICK: a damped spring, not a wobble — ζ≈0.8 so it settles without ringing.
        if (s.beatFired) drive.punchV += 6 * clamp01(s.kick + 0.35);
        var k = 120, c = 2 * 0.8 * Math.sqrt(k);
        drive.punchV += (-k * drive.punch - c * drive.punchV) * dt;
        drive.punch = Math.max(-0.3, Math.min(1, drive.punch + drive.punchV * dt));

        // LOW: ≤0.9% lift, ≤1.2% scale.
        body.position.y = drive.lift * 0.009 * env.reveal;
        body.scale.setScalar(1 + (drive.lift * 0.008 + Math.max(0, drive.punch) * 0.004) * env.reveal);

        // EVENT HORIZON: as the Tips section arrives the camera dollies in ~4%, the edges gain a little
        // orange; scroll inertia leans the view ≤1.6°; a hover focus lifts rim and specular for a moment.
        var eh = bus.eventHorizon;
        var ehFocus = eh ? (eh.section === 'tips' ? eh.focus : 0.35) : 1;
        stage.focus = approach(stage.focus, ehFocus, 2, dt);
        stage.dolly = approach(stage.dolly, 1 - ehFocus, 2, dt);
        stage.lean = approach(stage.lean, eh ? eh.velocity : 0, 5, dt);
        stage.hover = approach(stage.hover, stage.hoverTarget, 4, dt);
        stage.low = approach(stage.low, eh && eh.section === 'tips' ? clamp01(-(eh.camTilt || 0) / 0.8) : 0, 1.5, dt);

        ptr.yaw = approach(ptr.yaw, ptr.x * POINTER_MAX, 4, dt);
        ptr.pitch = approach(ptr.pitch, ptr.y * POINTER_MAX * 0.6, 4, dt);
        rig.rotation.y = ptr.yaw + Math.sin(clock * 0.21) * 0.012;
        rig.rotation.x = ptr.pitch + stage.lean * 0.035;

        // The specular travels slowly across the top plate.
        placeSpec(clock);
        render();
      }
      if (!staticMode) hub.onFrame(tick);

      // Desktop fine pointer: bounded parallax and one Hyperdrive pulse on entry. Touch never depends on it.
      if (!reduced && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        host.addEventListener('pointermove', function (e) {
          var r = host.getBoundingClientRect();
          ptr.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
          ptr.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        });
        host.addEventListener('pointerenter', function () {
          stage.hoverTarget = 1;
          if (!hub.pulse) return;
          var r = host.getBoundingClientRect();
          hub.pulse(r.top + (window.pageYOffset || 0) + r.height / 2);
        });
        host.addEventListener('pointerleave', function () { ptr.x = 0; ptr.y = 0; stage.hoverTarget = 0; });
      }

      if ('ResizeObserver' in window) {
        new ResizeObserver(function () {
          sizeDirty = true; needsRender = true;
          if (ready && visible && (staticMode || !hub.running)) render();
        }).observe(stageEl);
      }

      return {
        onVisible: onVisible,
        dispose: function () {
          disposed = true;
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
          renderer.dispose();
        }
      };
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
