/* DMF RELIC RUNTIME — The Receiver: scene, DMFRelicAnimator, DMFCameraRig, DMF LIVE SIGNAL HUD.
 * Inlined into public/index.html by scripts/build-3d.cjs after engine.js and signal-bus.js. */
(function () {
  var RELIC_BPM = 124;

  function getLang() {
    var btn = document.querySelector('.lang-btn');
    return btn && btn.textContent.trim().toUpperCase() === 'EN' ? 'es' : 'en';
  }

  function mountDMFSignal() {
    var hero = document.querySelector('header.hero');
    if (!hero || document.querySelector('.dmf-signal-band')) return;

    var band = document.createElement('section');
    band.className = 'dmf-signal-band';
    band.id = 'relic';
    band.setAttribute('aria-label', 'DMF RELIC Collector Edition 01');
    band.innerHTML = [
      '<div class="dmf-signal-shell">',
        '<div class="dmf-signal-copy">',
          '<div class="dmf-signal-kicker" data-dmf-en="DMF // RELIC SERIES" data-dmf-es="DMF // SERIE RELIC">DMF // RELIC SERIES</div>',
          '<h2 class="dmf-signal-title" data-dmf-en="The Receiver" data-dmf-es="El Receptor">The Receiver</h2>',
          '<div class="dmf-signal-subtitle" data-dmf-en="Collector Edition 01" data-dmf-es="Edición de Colección 01">Collector Edition 01</div>',
          '<p class="dmf-signal-lede" data-dmf-en="The first terrestrial keeper of the formula. A digital relic from the DMF universe, preserved as a collectible and prepared for 3D print." data-dmf-es="El primer guardián terrestre de la fórmula. Una reliquia digital del universo DMF, preservada como pieza de colección y preparada para impresión 3D.">The first terrestrial keeper of the formula. A digital relic from the DMF universe, preserved as a collectible and prepared for 3D print.</p>',
          '<div class="dmf-relic-card">',
            '<div class="dmf-relic-card-title" data-dmf-en="Edition Record" data-dmf-es="Registro de Edición">Edition Record</div>',
            '<div class="dmf-relic-row"><span class="dmf-relic-label">Series</span><span class="dmf-relic-value">Relic Series</span></div>',
            '<div class="dmf-relic-row"><span class="dmf-relic-label" data-dmf-en="Edition" data-dmf-es="Edición">Edition</span><span class="dmf-relic-value">01</span></div>',
            '<div class="dmf-relic-row"><span class="dmf-relic-label">Material</span><span class="dmf-relic-value" data-dmf-en="Digital / Printable" data-dmf-es="Digital / Imprimible">Digital / Printable</span></div>',
            '<div class="dmf-relic-row"><span class="dmf-relic-label" data-dmf-en="Origin" data-dmf-es="Origen">Origin</span><span class="dmf-relic-value">DMF Signal Archive</span></div>',
            '<div class="dmf-relic-row"><span class="dmf-relic-label">Status</span><span class="dmf-relic-value" data-dmf-en="Collectible Prototype" data-dmf-es="Prototipo Coleccionable">Collectible Prototype</span></div>',
          '</div>',
          '<div class="dmf-signal-meta">',
            '<span class="dmf-signal-chip">Collector Artifact</span>',
            '<span class="dmf-signal-chip">Edition 01</span>',
            '<span class="dmf-signal-chip">3D Printable</span>',
          '</div>',
          '<div class="dmf-signal-actions">',
            '<a class="dmf-signal-cta dmf-signal-view3d" href="javascript:void(0)" role="button"><span data-dmf-en="Live Signal" data-dmf-es="Se\u00f1al en Vivo">Live Signal</span><span aria-hidden="true"> →</span></a>',
            '<a class="dmf-signal-cta dmf-signal-cta--secondary" href="assets/models/dmf-studio-optimized.glb" download><span data-dmf-en="Download Digital Relic" data-dmf-es="Descargar Reliquia Digital">Download Digital Relic</span></a>',
            '<a class="dmf-signal-cta dmf-signal-cta--tertiary" href="assets/models/DMF_RELIC_01.3mf" download><span data-dmf-en="3D Print Master" data-dmf-es="Modelo Impresión 3D">3D Print Master</span></a>',
          '</div>',
          '<span class="dmf-signal-hint" data-dmf-en="Interactive · drag to orbit" data-dmf-es="Interactivo · arrastra para rotar">Interactive · drag to orbit</span>',
        '</div>',
        '<div class="dmf-signal-visual">',
          '<div class="dmf-signal-fallback" aria-hidden="true">RELIC</div>',
          '<div class="dmf-signal-loader" aria-hidden="true"></div>',
          '<div class="dmf-signal-arrival" aria-hidden="true"></div>',
          '<div class="dmf-signal-scan" aria-hidden="true"></div>',
          '<div class="dmf-signal-scan2" aria-hidden="true"></div>',
          '<div class="dmf-signal-vignette" aria-hidden="true"></div>',
          '<div class="dmf-signal-corner" aria-hidden="true"><strong>DMF / RELIC 01</strong><span data-dmf-en="Signal Sculpture" data-dmf-es="Escultura Señal">Signal Sculpture</span><span class="dmf-relic-state">DORMANT</span></div>',
          '<div class="dmf-signal-edition-tag" aria-hidden="true" data-dmf-en="Collector Artifact · DMF Universe" data-dmf-es="Artefacto Coleccionable · Universo DMF">Collector Artifact · DMF Universe</div>',
          '<div class="dmf-relic-readout" aria-hidden="true"><div class="dmf-relic-readout-component"></div><div class="dmf-relic-readout-status"></div><div class="dmf-relic-readout-lore"></div></div>',
          '<div class="dmf-live-hud" aria-hidden="true">',
            '<div class="dmf-live-hud-top"><span class="dmf-live-hud-title">DMF Live Signal</span><span class="dmf-live-hud-bpm"><b>' + RELIC_BPM + '</b> BPM</span></div>',
            '<div class="dmf-live-hud-main">',
              '<div class="dmf-live-hud-state">DORMANT</div>',
              '<div class="dmf-live-hud-meter"><span data-dmf-en="Energy" data-dmf-es="Energía">Energy</span><i><em data-hud="energy"></em></i></div>',
              '<div class="dmf-live-hud-bands">',
                '<div><span>Low</span><i><em data-hud="low"></em></i></div>',
                '<div><span>Mid</span><i><em data-hud="mid"></em></i></div>',
                '<div><span>High</span><i><em data-hud="high"></em></i></div>',
              '</div>',
            '</div>',
            '<div class="dmf-live-hud-hint"><span class="dmf-live-hud-drop" data-dmf-en="Space / Tap — Drop" data-dmf-es="Espacio / Toca — Drop">Space / Tap — Drop</span><span data-dmf-en="Esc — Exit" data-dmf-es="Esc — Salir">Esc — Exit</span></div>',
          '</div>',
          '<button class="dmf-signal-fullscreen-close" aria-label="Close" type="button">✕</button>',
        '</div>',
      '</div>'
    ].join('');

    hero.insertAdjacentElement('afterend', band);

    function syncSignalLanguage() {
      var current = getLang();
      band.querySelectorAll('[data-dmf-en]').forEach(function (el) {
        el.textContent = current === 'es' ? el.getAttribute('data-dmf-es') : el.getAttribute('data-dmf-en');
      });
    }
    syncSignalLanguage();

    var langBtn = document.querySelector('.lang-btn');
    if (langBtn && 'MutationObserver' in window) {
      new MutationObserver(syncSignalLanguage).observe(langBtn, { childList: true, subtree: true, characterData: true });
    }

    var hub = window.DMFSignal;
    if (hub && hub.scan) hub.scan();
    if (!hub || hub.saveData) return;

    var visual = band.querySelector('.dmf-signal-visual');
    var threeScript = document.createElement('script');
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    threeScript.onload = function () {
      var loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
      loaderScript.onload = function () { initScene(visual, band, hub); };
      loaderScript.onerror = function () {};
      document.head.appendChild(loaderScript);
    };
    threeScript.onerror = function () {};
    document.head.appendChild(threeScript);
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function ease5(t) { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); }
  function frac(v) { return v - Math.floor(v); }
  function hash(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

  function initScene(container, band, hub) {
    var THREE = window.THREE;
    if (!THREE || !THREE.GLTFLoader) return;
    var O = window.DMFOverdrive;
    var reduceMotion = hub.reduced || !hub.onFrame;

    var w = container.clientWidth;
    var h = container.clientHeight;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040303);
    scene.fog = new THREE.FogExp2(0x040303, 0.011);

    var camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(4, 2.8, 5);
    camera.lookAt(0, 0.9, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // === QUALITY TIERS — static only for genuinely low-capability devices ===
    var mem = navigator.deviceMemory || 4;
    var cores = navigator.hardwareConcurrency || 4;
    var touch = 'ontouchstart' in window;
    var small = window.innerWidth < 480;
    var quality = (mem <= 2 || cores <= 2) ? 'static' : ((window.innerWidth < 768 || touch) ? 'balanced' : 'high');
    var motionScale = 1;

    // === LIGHTING — altar/museum treatment ===
    var ambientLight = new THREE.AmbientLight(0x0e0c0a, 0.35);
    scene.add(ambientLight);

    var keyLight = new THREE.SpotLight(0xffa866, 2.4, 22, Math.PI / 5.5, 0.55, 1.5);
    keyLight.position.set(4, 7, 5);
    keyLight.target.position.set(0, 1, 0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.002;
    scene.add(keyLight);
    scene.add(keyLight.target);

    var fillLight = new THREE.PointLight(0x2244aa, 0.35, 14);
    fillLight.position.set(-5, 3, 3);
    scene.add(fillLight);

    var rimLight = new THREE.PointLight(0xff5b1e, 0.9, 14);
    rimLight.position.set(-3, 5, -4);
    scene.add(rimLight);

    var screenGlow = new THREE.PointLight(0x4466aa, 0.3, 6);
    screenGlow.position.set(0, 2.5, 0);
    scene.add(screenGlow);

    var accentLight = new THREE.PointLight(0xff5b1e, 0.3, 10);
    accentLight.position.set(4, 0.5, -2);
    scene.add(accentLight);

    var underGlow = new THREE.PointLight(0xff5b1e, 0.2, 5);
    underGlow.position.set(0, 0.08, 0);
    scene.add(underGlow);

    var haloLight = new THREE.PointLight(0xff5b1e, 0.15, 8);
    haloLight.position.set(0, 2, -3);
    scene.add(haloLight);

    // === FLOOR — dark altar base ===
    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x060504, roughness: 0.92, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    var gridHelper = new THREE.GridHelper(16, 32, 0xff5b1e, 0x110f0c);
    gridHelper.position.y = 0.005;
    gridHelper.material.opacity = 0.08;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // === PEDESTAL — collector base ===
    var pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a08, roughness: 0.4, metalness: 0.6, emissive: 0xff5b1e, emissiveIntensity: 0.015
    });
    var pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.12, 8), pedestalMat);
    pedestal.position.y = 0.06;
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    scene.add(pedestal);

    var pedestalRimMat = new THREE.MeshBasicMaterial({ color: 0xff5b1e, transparent: true, opacity: 0.25 });
    var pedestalRim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.02, 8, 64), pedestalRimMat);
    pedestalRim.rotation.x = -Math.PI / 2;
    pedestalRim.position.y = 0.13;
    scene.add(pedestalRim);

    // === PEDESTAL INSCRIPTION ===
    var inscCanvas = document.createElement('canvas');
    inscCanvas.width = 512; inscCanvas.height = 64;
    var inscCtx = inscCanvas.getContext('2d');
    inscCtx.font = '600 18px Arial';
    inscCtx.textAlign = 'center';
    inscCtx.textBaseline = 'middle';
    inscCtx.fillStyle = 'rgba(255,91,30,0.25)';
    inscCtx.fillText('DMF RELIC · EDITION 01 · THE RECEIVER', 256, 32);
    var inscription = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.35),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(inscCanvas), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    inscription.rotation.x = -Math.PI / 2;
    inscription.position.set(0, 0.131, 2.5);
    scene.add(inscription);

    // === HALO — back glow ring ===
    var haloMat = new THREE.MeshBasicMaterial({
      color: 0xff5b1e, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false
    });
    var halo = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.04, 16, 64), haloMat);
    halo.position.set(0, 2.2, -2);
    halo.rotation.y = 0.3;
    scene.add(halo);

    var halo2Mat = haloMat.clone();
    halo2Mat.opacity = 0.04;
    var halo2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.02, 16, 64), halo2Mat);
    halo2.position.set(0, 2.2, -2.2);
    halo2.rotation.y = -0.2;
    scene.add(halo2);

    // === VOLUMETRIC LIGHT CONE ===
    var coneH = 8;
    var coneMat = new THREE.MeshBasicMaterial({
      color: 0xff8844, transparent: true, opacity: 0.015, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    var cone = new THREE.Mesh(new THREE.ConeGeometry(2.8, coneH, 32, 1, true), coneMat);
    cone.position.set(4, 7 - coneH / 2, 5);
    cone.lookAt(0, 1, 0);
    cone.rotateX(Math.PI);
    scene.add(cone);

    // === EMBER PARTICLES — allocated once; tiers change the draw range ===
    var PARTICLE_MAX = 160;
    var particleActive = PARTICLE_MAX;
    var pPositions = new Float32Array(PARTICLE_MAX * 3);
    var pSpeeds = new Float32Array(PARTICLE_MAX);
    var pPhases = new Float32Array(PARTICLE_MAX);
    for (var i = 0; i < PARTICLE_MAX; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 10;
      pPositions[i * 3 + 1] = Math.random() * 6;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      pSpeeds[i] = 0.002 + Math.random() * 0.006;
      pPhases[i] = Math.random() * Math.PI * 2;
    }
    var pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    var pCanvas = document.createElement('canvas');
    pCanvas.width = 32; pCanvas.height = 32;
    var pCtx = pCanvas.getContext('2d');
    var grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,91,30,1)');
    grad.addColorStop(0.3, 'rgba(255,91,30,0.5)');
    grad.addColorStop(1, 'rgba(255,91,30,0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 32, 32);
    var pMat = new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(pCanvas), size: 0.07, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    var particles = new THREE.Points(pGeom, pMat);
    scene.add(particles);

    // === GROUND RINGS + KICK SHOCKWAVE ===
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0xff5b1e, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var ring = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.0, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.14;
    scene.add(ring);

    var ring2Mat = ringMat.clone();
    ring2Mat.opacity = 0.025;
    var ring2 = new THREE.Mesh(new THREE.RingGeometry(4.5, 4.65, 64), ring2Mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.01;
    scene.add(ring2);

    var shockMat = ringMat.clone();
    shockMat.opacity = 0;
    var shock = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.36, 96), shockMat);
    shock.rotation.x = -Math.PI / 2;
    shock.position.y = 0.135;
    shock.visible = false;
    scene.add(shock);

    // === DMFRelicAnimator — shared uniforms for relic + overlays ===
    // The GLB is a single static mesh with no rig: motion is procedural in the
    // vertex shader around raw GLB object-space anchors (DJ head/neck, torso, monitor cones).
    var U = {
      uNod: { value: 0 }, uSway: { value: 0 }, uBounce: { value: 0 }, uTwist: { value: 0 },
      uCone: { value: 0 }, uCab: { value: 0 }, uLive: { value: 0 },
      uKick: { value: 0 }, uOverdrive: { value: 0 }, uIntensity: { value: 1 },
      uLogoLvl: { value: [0, 0, 0, 0, 0] }, uLogoPeak: { value: [0, 0, 0, 0, 0] }, uLogoGlow: { value: 0 },
      uSweep: { value: -1 }, uSweepAmt: { value: 0 },
      uActiveZone: { value: -1 }, uTime: { value: 0 }
    };
    var RELIC_CONES = [
      [-0.644, -0.064, -0.405], [0.652, -0.050, -0.395],
      [-0.630, -0.270, -0.040], [-0.620, -0.400, 0.165],
      [0.624, -0.280, -0.038], [0.624, -0.400, 0.173]
    ];
    var RELIC_MOTION_GLSL =
      'uniform float uNod;\nuniform float uSway;\nuniform float uBounce;\nuniform float uTwist;\n' +
      'uniform float uCone;\nuniform float uCab;\nuniform float uLive;\nvarying vec3 vObjPos;\n' +
      'vec3 relicMotion(vec3 p, vec3 n){\n' +
      '  float hw = 1.0 - smoothstep(0.12, 0.19, distance(p, vec3(0.305, 0.24, -0.2)));\n' +
      '  float a = uNod * uLive * hw;\n' +
      '  vec3 piv = vec3(0.305, 0.12, -0.21);\n' +
      '  vec3 r = p - piv;\n' +
      '  vec3 o = piv + vec3(r.x, r.y * cos(a) - r.z * sin(a), r.y * sin(a) + r.z * cos(a));\n' +
      '  float bw = max(hw, 1.0 - smoothstep(0.7, 1.0, length((p - vec3(0.31, 0.02, -0.24)) / vec3(0.26, 0.26, 0.18))));\n' +
      '  float tw = uTwist * bw * uLive;\n' +
      '  vec2 d = o.xz - vec2(0.31, -0.24);\n' +
      '  o.xz = vec2(0.31, -0.24) + vec2(d.x * cos(tw) - d.y * sin(tw), d.x * sin(tw) + d.y * cos(tw));\n' +
      '  o += vec3(uSway, -uBounce, 0.0) * bw * uLive;\n' +
      '  float cw = 0.0;\n' +
      '  float cab = 0.0;\n' +
      RELIC_CONES.map(function (c) {
        var v = 'vec3(' + c.join(', ') + ')';
        return '  cw += 1.0 - smoothstep(0.03, 0.07, distance(p, ' + v + '));\n' +
               '  cab += 1.0 - smoothstep(0.1, 0.2, distance(p, ' + v + '));\n';
      }).join('') +
      '  o += n * (min(cw, 1.0) * uCone * 0.02 + min(cab, 1.0) * uCab) * uLive;\n' +
      '  return o;\n' +
      '}\n';

    function injectRelicMotion(shader) {
      shader.uniforms.uNod = U.uNod;
      shader.uniforms.uSway = U.uSway;
      shader.uniforms.uBounce = U.uBounce;
      shader.uniforms.uTwist = U.uTwist;
      shader.uniforms.uCone = U.uCone;
      shader.uniforms.uCab = U.uCab;
      shader.uniforms.uLive = U.uLive;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + RELIC_MOTION_GLSL)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = relicMotion(position, normal);\nvObjPos = position;');
    }

    // === LOAD MODEL — RELIC Material Pass: zone-based painting ===
    var modelRef = null;
    var modelTargetScale = 0;
    var modelCurrentScale = 0;
    var entranceAngle = 0;
    var wireRef = null;
    var edgeRef = null;
    var relicMatRef = null;
    var baseRoughness = 1;
    var modelWorldMinY = 0, modelWorldMaxY = 3;
    var modelWorldMinX = -2, modelWorldMaxX = 2;
    var modelWorldMinZ = -2, modelWorldMaxZ = 2;

    new THREE.GLTFLoader().load(
      'assets/models/dmf-studio-optimized.glb',
      function (gltf) {
        var model = gltf.scene;
        modelRef = model;

        var box = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        var s = 4.0 / Math.max(size.x, size.y, size.z);
        modelTargetScale = s;
        model.scale.setScalar(0.01);
        model.position.set(-center.x * s, -box.min.y * s + 0.13, -center.z * s);

        modelWorldMinY = 0.13;
        modelWorldMaxY = 0.13 + size.y * s;
        modelWorldMinX = -size.x * s / 2;
        modelWorldMaxX = size.x * s / 2;
        modelWorldMinZ = -size.z * s / 2;
        modelWorldMaxZ = size.z * s / 2;

        model.traverse(function (child) {
          if (!child.isMesh || !child.geometry) return;
          var geo = child.geometry;
          if (!geo.attributes.normal) geo.computeVertexNormals();

          var posArr = geo.attributes.position.array;
          var vCount = posArr.length / 3;
          var yMin = Infinity, yMax = -Infinity, xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
          for (var vi = 0; vi < vCount; vi++) {
            var vx = posArr[vi * 3], vy = posArr[vi * 3 + 1], vz = posArr[vi * 3 + 2];
            if (vy < yMin) yMin = vy; if (vy > yMax) yMax = vy;
            if (vx < xMin) xMin = vx; if (vx > xMax) xMax = vx;
            if (vz < zMin) zMin = vz; if (vz > zMax) zMax = vz;
          }
          var yRange = yMax - yMin || 1, xRange = xMax - xMin || 1, zRange = zMax - zMin || 1;

          var zoneColors = [[0.55, 0.48, 0.44], [0.68, 0.62, 0.56], [0.72, 0.70, 0.78], [0.82, 0.78, 0.80]];
          var colors = new Float32Array(posArr.length);
          var zoneIdArr = new Float32Array(vCount);
          var normYArr = new Float32Array(vCount);
          for (vi = 0; vi < vCount; vi++) {
            var ny = (posArr[vi * 3 + 1] - yMin) / yRange;
            var nx = (posArr[vi * 3] - xMin) / xRange;
            var nz = (posArr[vi * 3 + 2] - zMin) / zRange;
            var dist = Math.sqrt(posArr[vi * 3] * posArr[vi * 3] + posArr[vi * 3 + 2] * posArr[vi * 3 + 2]);
            var zIdx = 3;
            if (ny < 0.20) zIdx = 0;
            else if (ny < 0.45) zIdx = 1;
            else if (ny < 0.70) zIdx = (Math.abs(nx - 0.5) > 0.38 || Math.abs(nz - 0.5) > 0.38) ? 1 : 2;
            zoneIdArr[vi] = zIdx;
            normYArr[vi] = ny;

            var zc = zoneColors[zIdx];
            var bnMax = Math.max(
              1.0 - Math.min(1.0, Math.abs(ny - 0.20) / 0.025),
              1.0 - Math.min(1.0, Math.abs(ny - 0.45) / 0.025),
              1.0 - Math.min(1.0, Math.abs(ny - 0.70) / 0.025)
            );
            var ef = Math.min(1, Math.max(0, dist - 0.35) / 0.55) * 0.04;
            colors[vi * 3] = Math.min(1.0, zc[0] + bnMax * 0.12 + ef * 0.8);
            colors[vi * 3 + 1] = Math.min(1.0, zc[1] + bnMax * 0.04 + ef * 0.2);
            colors[vi * 3 + 2] = Math.min(1.0, zc[2] + bnMax * 0.02);
          }
          geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          geo.setAttribute('aZoneId', new THREE.BufferAttribute(zoneIdArr, 1));
          geo.setAttribute('aNormY', new THREE.BufferAttribute(normYArr, 1));

          var relicMat = child.material.clone();
          relicMat.vertexColors = true;
          relicMat.emissive = new THREE.Color(0xff5b1e);
          relicMat.emissiveIntensity = 0.008;
          relicMat.envMapIntensity = 0.55;
          relicMat.onBeforeCompile = function (shader) {
            injectRelicMotion(shader);
            shader.uniforms.uActiveZone = U.uActiveZone;
            shader.uniforms.uTime = U.uTime;
            shader.uniforms.uIntensity = U.uIntensity;
            shader.uniforms.uKick = U.uKick;
            shader.uniforms.uOverdrive = U.uOverdrive;
            shader.uniforms.uLogoLvl = U.uLogoLvl;
            shader.uniforms.uLogoPeak = U.uLogoPeak;
            shader.uniforms.uLogoGlow = U.uLogoGlow;
            shader.uniforms.uSweep = U.uSweep;
            shader.uniforms.uSweepAmt = U.uSweepAmt;
            shader.vertexShader = shader.vertexShader
              .replace('#include <common>', '#include <common>\nattribute float aZoneId;\nattribute float aNormY;\nvarying float vZoneId;\nvarying float vNormY;')
              .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZoneId = aZoneId;\nvNormY = aNormY;');
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <common>', [
                '#include <common>',
                'uniform float uActiveZone;', 'uniform float uTime;', 'uniform float uIntensity;',
                'uniform float uKick;', 'uniform float uOverdrive;',
                'uniform float uLogoLvl[5];', 'uniform float uLogoPeak[5];', 'uniform float uLogoGlow;',
                'uniform float uSweep;', 'uniform float uSweepAmt;', 'uniform float uLive;',
                'varying float vZoneId;', 'varying float vNormY;', 'varying vec3 vObjPos;'
              ].join('\n'))
              .replace('#include <tonemapping_fragment>', [
                // DMF logo: segmented equalizer with peak hold; the M carries the brightest energy.
                'float logoMask = step(-0.57, vObjPos.z) * step(vObjPos.z, -0.5) *',
                '  step(-0.31, vObjPos.x) * step(vObjPos.x, 0.31) * step(0.1, vObjPos.y) * step(vObjPos.y, 0.56) *',
                '  smoothstep(0.08, 0.22, diffuseColor.r - diffuseColor.b) * uLive;',
                'if(logoMask > 0.0){',
                '  float lvl; float pk;',
                '  if(vObjPos.x < -0.235){ lvl = uLogoLvl[0]; pk = uLogoPeak[0]; }',
                '  else if(vObjPos.x < -0.16){ lvl = uLogoLvl[1]; pk = uLogoPeak[1]; }',
                '  else if(vObjPos.x < 0.15){ lvl = uLogoLvl[2]; pk = uLogoPeak[2]; }',
                '  else if(vObjPos.x < 0.215){ lvl = uLogoLvl[3]; pk = uLogoPeak[3]; }',
                '  else { lvl = uLogoLvl[4]; pk = uLogoPeak[4]; }',
                '  float ly = (vObjPos.y - 0.12) / 0.4;',
                '  float eq = 1.0 - smoothstep(lvl - 0.03, lvl + 0.03, ly);',
                '  float peakLine = (1.0 - smoothstep(0.0, 0.02, abs(ly - pk))) * step(0.05, pk);',
                '  float center = (1.0 - smoothstep(0.0, 0.16, abs(vObjPos.x))) * uLogoGlow;',
                '  float glow = eq * (0.3 + 0.7 * uKick) + peakLine * 0.8 + center;',
                '  gl_FragColor.rgb += vec3(1.0, 0.36, 0.08) * glow * logoMask * 0.85 * uIntensity * (1.0 + 0.4 * uOverdrive);',
                '}',
                // Reflective sweep: warm, multiplicative-first so it reads as light on surfaces, never a white strobe.
                'if(uSweepAmt > 0.001){',
                '  float sx = vObjPos.x * 0.5 + 0.5 + vObjPos.y * 0.22;',
                '  float sb = exp(-pow((sx - uSweep) / 0.07, 2.0));',
                '  gl_FragColor.rgb += (gl_FragColor.rgb * 0.85 + vec3(0.22, 0.14, 0.08)) * sb * uSweepAmt;',
                '}',
                'if(uActiveZone >= 0.0){',
                '  float zId = floor(vZoneId + 0.5);',
                '  float aZ = floor(uActiveZone + 0.5);',
                '  vec3 zCol;',
                '  if(aZ < 0.5) zCol = vec3(1.0, 0.35, 0.06);',
                '  else if(aZ < 1.5) zCol = vec3(0.85, 0.45, 0.12);',
                '  else if(aZ < 2.5) zCol = vec3(0.12, 0.55, 0.95);',
                '  else zCol = vec3(1.0, 0.38, 0.0);',
                '  if(zId == aZ){',
                '    float pulse = 0.5 + 0.5 * sin(uTime * 3.5 + vNormY * 18.0);',
                '    gl_FragColor.rgb += zCol * pulse * 0.12 * uIntensity;',
                '  }',
                '  if(aZ > 2.5){',
                '    float wf = fract(uTime * 4.5);',
                '    float wd = abs(vNormY - (1.0 - wf));',
                '    gl_FragColor.rgb += vec3(1.0, 0.35, 0.06) * smoothstep(0.12, 0.0, wd) * 0.2 * uIntensity;',
                '  }',
                '}',
                '#include <tonemapping_fragment>'
              ].join('\n'));
          };
          relicMat.needsUpdate = true;
          child.material = relicMat;
          relicMatRef = relicMat;
          baseRoughness = relicMat.roughness;
          child.castShadow = true;
          child.receiveShadow = true;

          var wireMat = new THREE.MeshBasicMaterial({
            color: 0x4488cc, wireframe: true, transparent: true, opacity: 0.025,
            blending: THREE.AdditiveBlending, depthWrite: false
          });
          wireMat.onBeforeCompile = injectRelicMotion;
          wireRef = new THREE.Mesh(geo, wireMat);
          child.parent.add(wireRef);

          var edgeMat = new THREE.MeshBasicMaterial({
            color: 0xff5b1e, side: THREE.BackSide, transparent: true, opacity: 0.04,
            blending: THREE.AdditiveBlending, depthWrite: false
          });
          edgeMat.onBeforeCompile = injectRelicMotion;
          edgeRef = new THREE.Mesh(geo, edgeMat);
          edgeRef.scale.setScalar(1.022);
          child.parent.add(edgeRef);
        });

        scene.add(model);
        band.classList.add('is-ready', 'has-scene');
        applyQuality(quality);

        if (reduceMotion || quality === 'static') {
          model.scale.setScalar(s);
          modelCurrentScale = s;
          computeShot('A', 4.5, SHOT_DUR.A, cur);
          renderStatic();
          return;
        }
        hub.onFrame(tick);
      },
      undefined,
      function () { band.classList.add('is-ready'); }
    );

    function applyQuality(tier) {
      quality = tier;
      hub.qualityTier = tier;
      var dpr = window.devicePixelRatio || 1;
      var shadowsOn = tier === 'high';
      if (tier === 'high') { renderer.setPixelRatio(Math.min(dpr, 1.75)); particleActive = 160; motionScale = 1; U.uIntensity.value = 1; }
      else if (tier === 'balanced') { renderer.setPixelRatio(Math.min(dpr, small ? 1.25 : 1.5)); particleActive = 80; motionScale = 0.7; U.uIntensity.value = 0.8; }
      else { renderer.setPixelRatio(1); particleActive = 40; motionScale = 0.6; U.uIntensity.value = 0.75; }
      renderer.shadowMap.enabled = shadowsOn;
      keyLight.castShadow = shadowsOn;
      pGeom.setDrawRange(0, particleActive);
      if (wireRef) wireRef.visible = tier === 'high';
      if (edgeRef) edgeRef.visible = tier !== 'lite';
      renderer.setSize(w, h);
    }

    // === CANVAS LABELS — floating edition tags ===
    function makeLabel(text, fontSize, color) {
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      ctx.font = fontSize + 'px Arial';
      c.width = Math.ceil(ctx.measureText(text).width) + 20;
      c.height = fontSize + 16;
      ctx.font = fontSize + 'px Arial';
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 10, c.height / 2);
      return new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.35,
        depthWrite: false, blending: THREE.AdditiveBlending
      }));
    }
    var labelEdition = makeLabel('EDITION 01', 18, 'rgba(255,91,30,0.5)');
    labelEdition.position.set(-3.2, 0.5, 2.5);
    labelEdition.scale.set(1.6, 0.4, 1);
    scene.add(labelEdition);
    var labelRelic = makeLabel('DMF RELIC', 16, 'rgba(255,91,30,0.3)');
    labelRelic.position.set(3.5, 4.2, -1);
    labelRelic.scale.set(1.4, 0.35, 1);
    scene.add(labelRelic);
    var labelSignal = makeLabel('SIGNAL RECEIVER', 14, 'rgba(100,130,180,0.3)');
    labelSignal.position.set(-2.5, 3.8, -2);
    labelSignal.scale.set(1.8, 0.35, 1);
    scene.add(labelSignal);

    // === DMFCameraRig — four eased shots, drag override, gentle resume ===
    // Poses are spherical (azimuth from +z, radius, height) around a look target so blends travel on arcs.
    function makePose() { return { az: 0, r: 0, y: 0, tx: 0, ty: 0, tz: 0, roll: 0 }; }
    function copyPose(a, b) { a.az = b.az; a.r = b.r; a.y = b.y; a.tx = b.tx; a.ty = b.ty; a.tz = b.tz; a.roll = b.roll; }
    function lerpPose(out, a, b, k) {
      out.az = a.az + (b.az - a.az) * k; out.r = a.r + (b.r - a.r) * k; out.y = a.y + (b.y - a.y) * k;
      out.tx = a.tx + (b.tx - a.tx) * k; out.ty = a.ty + (b.ty - a.ty) * k; out.tz = a.tz + (b.tz - a.tz) * k;
      out.roll = a.roll + (b.roll - a.roll) * k;
    }
    var SHOT_ORDER = ['A', 'B', 'C'];
    var SHOT_DUR = { A: 9, B: 8, C: 11, D: 1e9 };
    function computeShot(id, t, dur, out) {
      var k = t / dur, e, ms = motionScale;
      if (id === 'A') {        // ICON — front three-quarter portrait, slow push-in
        e = ease(k);
        out.az = 0.58 - 0.08 * e * ms; out.r = 6.3 - 1.1 * e * ms; out.y = 2.5 + 0.12 * e;
        out.tx = 0.4; out.ty = 1.62; out.tz = -0.1; out.roll = 0;
      } else if (id === 'B') { // SIGNAL — low angle on desk and monitors
        e = ease(k);
        out.az = -0.62 + 0.24 * e * ms; out.r = 4.6 - 0.3 * e * ms; out.y = 0.8 + 0.14 * e;
        out.tx = -0.5; out.ty = 1.02; out.tz = 0.45; out.roll = 0;
      } else if (id === 'C') { // RELIC — slow orbital reveal with vertical drift
        e = ease5(k);
        out.az = (-0.95 + 1.9 * e) * ms; out.r = 6.8; out.y = 2.55 + 0.55 * Math.sin(Math.PI * clamp(k, 0, 1)) * ms;
        out.tx = 0; out.ty = 1.35; out.tz = 0; out.roll = 0;
      } else {                 // OVERDRIVE — fast but smooth push with a roll that corrects to level
        e = ease5(t / 3.2);
        out.az = 0.24 - 0.06 * e; out.r = 5.2 - 1.2 * e * ms; out.y = 2.2 - 0.1 * e;
        out.tx = 0.42; out.ty = 1.72; out.tz = -0.15; out.roll = 0.045 * ms * (1 - ease(t / 2.6));
      }
    }

    var cur = makePose(), from = makePose(), shotPose = makePose(), user = makePose();
    var rig = { mode: 'auto', shot: 'A', shotIdx: 0, t: 0, blend: 1, blendDur: 2.8, lastInput: -1e9, velAz: 0, dragging: false };
    var RESUME_MS = 5000;
    computeShot('A', 0, SHOT_DUR.A, cur);

    function cut(next, blendDur) {
      copyPose(from, cur);
      rig.shot = next; rig.t = 0; rig.blend = 0; rig.blendDur = blendDur;
    }
    function clampUser() {
      user.az = clamp(user.az, -1.15, 1.15);
      user.y = clamp(user.y, 0.6, 4.4);
    }

    function rigUpdate(dt, nowMs) {
      if (rig.mode === 'user') {
        if (!rig.dragging) {
          user.az += rig.velAz * dt;
          rig.velAz *= Math.exp(-dt * 3);
          clampUser();
          if (nowMs - rig.lastInput > RESUME_MS) {
            rig.mode = 'auto';
            copyPose(cur, user);
            rig.shotIdx = 0;
            cut(hub.state === 'OVERDRIVE' ? 'D' : 'A', 3.4);
          }
        }
        if (rig.mode === 'user') { user.roll = 0; copyPose(cur, user); return; }
      }
      var od = hub.state === 'OVERDRIVE';
      if (od && rig.shot !== 'D') cut('D', 1.6);
      else if (!od && rig.shot === 'D') { rig.shotIdx = 2; cut('C', 3.0); }
      rig.t += dt;
      if (rig.shot !== 'D' && rig.t > SHOT_DUR[rig.shot]) {
        rig.shotIdx = (rig.shotIdx + 1) % SHOT_ORDER.length;
        cut(SHOT_ORDER[rig.shotIdx], 2.8);
      }
      computeShot(rig.shot, rig.t, SHOT_DUR[rig.shot], shotPose);
      if (rig.blend < 1) {
        rig.blend = Math.min(1, rig.blend + dt / rig.blendDur);
        lerpPose(cur, from, shotPose, ease5(rig.blend));
      } else copyPose(cur, shotPose);
    }

    var LOOK = new THREE.Vector3();
    var parallaxX = 0, parallaxY = 0;
    var autoAngle = 0;
    function applyCamera(dolly) {
      var aspect = w / h;
      var fit = aspect < 1.1 ? 1 + (1.1 - aspect) * 0.95 : 1;
      var auto = rig.mode === 'auto';
      var az = cur.az + (auto ? parallaxX * 0.08 + Math.sin(autoAngle) * 0.05 * motionScale : 0);
      var r = (cur.r - dolly) * fit;
      var y = cur.y + (auto ? -parallaxY * 0.22 + Math.sin(autoAngle * 0.8) * 0.08 * motionScale : 0);
      camera.position.set(Math.sin(az) * r, y, Math.cos(az) * r);
      LOOK.set(cur.tx, cur.ty, cur.tz);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK);
      if (cur.roll) camera.rotateZ(cur.roll);
    }

    // === INTERACTION — pointer orbit (mouse + touch), hover readout, fullscreen ===
    var mouseNDC = new THREE.Vector2(0, 0);
    var mouseInside = false, mouseMoved = false;
    var raycaster = new THREE.Raycaster();
    var projected = new THREE.Vector3();
    var readoutEl = container.querySelector('.dmf-relic-readout');
    var readoutComp = readoutEl.querySelector('.dmf-relic-readout-component');
    var readoutStatus = readoutEl.querySelector('.dmf-relic-readout-status');
    var readoutLore = readoutEl.querySelector('.dmf-relic-readout-lore');
    var stateEl = container.querySelector('.dmf-relic-state');
    var currentZone = '';

    var zones = [
      { test: function (nx, ny, nz) { return ny < 0.20; }, en: 'RELIC COMPONENT // PLATFORM BASE', es: 'COMPONENTE RELIC // BASE DE PLATAFORMA', statusEn: 'SIGNAL PATH ACTIVE', statusEs: 'RUTA DE SEÑAL ACTIVA', loreEn: 'Earthside anchor — terrestrial grounding node', loreEs: 'Anclaje terrestre — nodo de conexión' },
      { test: function (nx, ny, nz) { return ny < 0.45 || (ny < 0.70 && (Math.abs(nx - 0.5) > 0.38 || Math.abs(nz - 0.5) > 0.38)); }, en: 'RELIC COMPONENT // CORE FRAME', es: 'COMPONENTE RELIC // ESTRUCTURA CENTRAL', statusEn: 'ARCHIVE NODE 03', statusEs: 'NODO DE ARCHIVO 03', loreEn: 'Formula preservation unit — primary containment', loreEs: 'Unidad de preservación — contención primaria' },
      { test: function (nx, ny, nz) { return ny < 0.70; }, en: 'RELIC COMPONENT // SIGNAL CONSOLE', es: 'COMPONENTE RELIC // CONSOLA DE SEÑAL', statusEn: 'RECEIVING FREQUENCY', statusEs: 'FRECUENCIA DE RECEPCIÓN', loreEn: 'Terrestrial decoding interface — signal processing', loreEs: 'Interfaz de decodificación terrestre' },
      { test: function () { return true; }, en: 'RELIC COMPONENT // RECEIVER ARRAY', es: 'COMPONENTE RELIC // MATRIZ RECEPTORA', statusEn: 'TRANSMISSION ACTIVE', statusEs: 'TRANSMISIÓN ACTIVA', loreEn: 'Transmission channel — formula acquisition array', loreEs: 'Canal de transmisión — adquisición de fórmula' }
    ];

    function getZoneIndex(point) {
      var nx = clamp((point.x - modelWorldMinX) / (modelWorldMaxX - modelWorldMinX), 0, 1);
      var ny = clamp((point.y - modelWorldMinY) / (modelWorldMaxY - modelWorldMinY), 0, 1);
      var nz = clamp((point.z - modelWorldMinZ) / (modelWorldMaxZ - modelWorldMinZ), 0, 1);
      for (var zi = 0; zi < zones.length; zi++) if (zones[zi].test(nx, ny, nz)) return zi;
      return zones.length - 1;
    }

    function showReadout(zone) {
      var lang = getLang();
      readoutComp.textContent = lang === 'es' ? zone.es : zone.en;
      readoutStatus.textContent = lang === 'es' ? zone.statusEs : zone.statusEn;
      readoutLore.textContent = lang === 'es' ? zone.loreEs : zone.loreEn;
    }
    function hideReadout() {
      readoutEl.classList.remove('is-visible');
      currentZone = '';
    }

    var shownState = '';
    var shownPct = -1;
    var pctEl = document.createElement('span');
    pctEl.className = 'dmf-relic-state-pct';
    function renderRelicState(state, pct, labelChanged) {
      var lang = getLang();
      if (labelChanged) {
        stateEl.classList.remove('is-awakened', 'is-transmitting', 'is-overdrive');
        if (state === 'DORMANT') stateEl.textContent = lang === 'es' ? 'INACTIVO' : 'DORMANT';
        else if (state === 'AWAKENED') {
          stateEl.classList.add('is-awakened');
          stateEl.textContent = lang === 'es' ? 'SEÑAL DETECTADA' : 'SIGNAL DETECTED';
        } else if (state === 'OVERDRIVE') {
          stateEl.classList.add('is-overdrive');
          stateEl.textContent = 'OVERDRIVE';
        } else {
          stateEl.classList.add('is-transmitting');
          stateEl.textContent = lang === 'es' ? 'TRANSMISIÓN' : 'TRANSMITTING';
          stateEl.appendChild(pctEl);
        }
      }
      if (state === 'TRANSMITTING') pctEl.textContent = (lang === 'es' ? 'TRANSFERENCIA ' : 'FORMULA TRANSFER ') + pct + '%';
    }
    var langBtn2 = document.querySelector('.lang-btn');
    if (langBtn2 && 'MutationObserver' in window) {
      new MutationObserver(function () { shownState = ''; }).observe(langBtn2, { childList: true, subtree: true, characterData: true });
    }

    container.addEventListener('mousemove', function (e) {
      var rect = container.getBoundingClientRect();
      parallaxX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      parallaxY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseNDC.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      mouseInside = true;
      mouseMoved = true;
    });
    container.addEventListener('mouseleave', function () {
      parallaxX = 0; parallaxY = 0; mouseInside = false;
      hideReadout();
      hub.hoverLevel = 0;
    });

    var fsActive = false;
    function toggleDrop() {
      hub.setForceDrop(!hub.forceDrop);
      band.classList.toggle('is-drop-armed', hub.forceDrop);
    }

    var lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0, lastMoveT = 0;
    container.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (e.target.closest && e.target.closest('button, a'))) return;
      if (rig.mode === 'auto') copyPose(user, cur);
      rig.mode = 'user';
      rig.dragging = true;
      rig.velAz = 0;
      rig.lastInput = performance.now();
      lastX = downX = e.clientX; lastY = downY = e.clientY; downT = lastMoveT = rig.lastInput;
      container.classList.add('is-dragging');
    });
    container.addEventListener('pointermove', function (e) {
      if (!rig.dragging) return;
      var now = performance.now();
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      user.az -= dx * 0.006;
      if (e.pointerType === 'mouse') user.y += dy * 0.012;
      clampUser();
      var edt = Math.max(0.008, (now - lastMoveT) / 1000);
      rig.velAz = clamp(-dx * 0.006 / edt, -2.5, 2.5);
      lastMoveT = now;
      rig.lastInput = now;
      if (staticMode) { copyPose(cur, user); renderStatic(); }
    });
    function endDrag(e) {
      if (!rig.dragging) return;
      rig.dragging = false;
      container.classList.remove('is-dragging');
      rig.lastInput = performance.now();
      if (rig.lastInput - lastMoveT > 80) rig.velAz = 0;
      var tap = Math.abs(e.clientX - downX) < 6 && Math.abs(e.clientY - downY) < 6 && rig.lastInput - downT < 300;
      if (tap && fsActive && e.pointerType !== 'mouse' && !staticMode) toggleDrop();
    }
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', function (e) { rig.dragging = false; container.classList.remove('is-dragging'); rig.lastInput = performance.now(); });

    // === DMF LIVE SIGNAL — fullscreen performance mode ===
    var closeBtn = container.querySelector('.dmf-signal-fullscreen-close');
    var viewBtn = band.querySelector('.dmf-signal-view3d');
    var hud = container.querySelector('.dmf-live-hud');
    var hudState = hud.querySelector('.dmf-live-hud-state');
    var hudBpm = hud.querySelector('.dmf-live-hud-bpm b');
    var hudBars = {
      energy: hud.querySelector('[data-hud="energy"]'),
      low: hud.querySelector('[data-hud="low"]'),
      mid: hud.querySelector('[data-hud="mid"]'),
      high: hud.querySelector('[data-hud="high"]')
    };
    var hudLast = 0;
    var hudShownState = '';

    function enterFullscreen() {
      container.classList.add('is-fullscreen');
      fsActive = true;
      requestResize();
      if (container.requestFullscreen) container.requestFullscreen().catch(function () {});
    }
    function exitFullscreen() {
      container.classList.remove('is-fullscreen');
      fsActive = false;
      if (hub.forceDrop) toggleDrop();
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      requestResize();
    }
    if (viewBtn) viewBtn.addEventListener('click', function (e) { e.preventDefault(); enterFullscreen(); });
    if (closeBtn) closeBtn.addEventListener('click', exitFullscreen);
    document.addEventListener('fullscreenchange', function () {
      if (!document.fullscreenElement && fsActive) exitFullscreen();
      requestResize();
    });
    document.addEventListener('keydown', function (e) {
      if (!fsActive) return;
      if (e.key === 'Escape') exitFullscreen();
      else if ((e.code === 'Space' || e.key === ' ') && !staticMode) { e.preventDefault(); toggleDrop(); }
    });

    function updateHud(s, nowMs) {
      if (!fsActive || nowMs - hudLast < 66) return;
      hudLast = nowMs;
      if (hudShownState !== hub.state) { hudState.textContent = hub.state; hudShownState = hub.state; hud.setAttribute('data-state', hub.state); }
      hudBpm.textContent = s.bpm;
      hudBars.energy.style.transform = 'scaleX(' + s.energy.toFixed(3) + ')';
      hudBars.low.style.transform = 'scaleX(' + s.low.toFixed(3) + ')';
      hudBars.mid.style.transform = 'scaleX(' + s.mid.toFixed(3) + ')';
      hudBars.high.style.transform = 'scaleX(' + s.high.toFixed(3) + ')';
    }

    // === VISIBILITY, RESIZE ===
    var isVisible = true;
    var activationPending = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !band.classList.contains('is-receiving')) {
          band.classList.add('is-receiving');
          activationPending = true;
        }
      }, { threshold: 0.08 }).observe(band);
    }

    var resizePending = false;
    function requestResize() { resizePending = true; if (staticMode) renderStatic(); }
    function doResize() {
      resizePending = false;
      w = container.clientWidth;
      h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', requestResize);

    var staticMode = false;
    function renderStatic() {
      staticMode = true;
      if (resizePending) doResize();
      applyCamera(0);
      renderer.render(scene, camera);
    }

    // === DMFRelicAnimator — impact physics driven by the shared signal ===
    var SpringCtor = O.DMFSpring;
    var headSpring = new SpringCtor(160, 16);
    var torsoSpring = new SpringCtor(220, 18);
    var coneSpring = new SpringCtor(900, 26);
    var orbitSpring = new SpringCtor(4, 4);
    var lightSpring = new SpringCtor(10, 5);
    var dollySpring = new SpringCtor(40, 9);
    orbitSpring.x = 0.072;
    lightSpring.x = 0.675;
    var prevKick = 0, prevBar = -1;
    var liveTime = 0;
    var sweepPos = -1, sweepActive = false, sweepCooldown = 0;
    var shockT = 1, shockStrength = 0;
    var logoHold = [0, 0, 0, 0, 0];
    var frameCount = 0;
    var governor = new O.DMFPerformanceGovernor(quality);
    var wireZoneColors = [0x886633, 0xcc8844, 0x44ddff, 0xff6633];

    function kickAt(phase, d) { return Math.exp(-7 * frac(phase - d)); }

    function animateRelic(s, dt) {
      var od = hub.overdriveMix;
      liveTime += dt;

      if (modelRef && modelCurrentScale < modelTargetScale) {
        modelCurrentScale += (modelTargetScale - modelCurrentScale) * (1 - Math.exp(-dt * 1.8));
        if (modelTargetScale - modelCurrentScale < 0.001) modelCurrentScale = modelTargetScale;
        modelRef.scale.setScalar(modelCurrentScale);
        entranceAngle += dt * 1.2;
        modelRef.rotation.y = Math.sin(entranceAngle) * 0.12 * (1 - modelCurrentScale / modelTargetScale);
      }
      U.uLive.value = modelTargetScale > 0 ? modelCurrentScale / modelTargetScale : 0;

      var kickEdge = s.kick > 0.6 && prevKick < 0.35;
      prevKick = s.kick;
      var barEdge = s.bar !== prevBar;
      prevBar = s.bar;
      if (activationPending) {
        activationPending = false;
        kickEdge = true;
        barEdge = true;
        sweepCooldown = 0;
      }

      // Scene orbit with mass: drops raise the target velocity, kicks add impulse, drag settles it.
      orbitSpring.step(0.072 * (1 + 1.6 * s.dropEnergy), dt);
      if (kickEdge) orbitSpring.impulse(0.05 * s.energy * motionScale);
      autoAngle += dt * clamp(orbitSpring.x, 0.02, 0.4);

      // DJ — head accelerates on kicks, torso bounces, counter-rotation against the sway.
      var beats = s.beatIndex + s.beatPhase;
      var nodCurve = 0.5 + 0.5 * Math.cos(2 * Math.PI * (s.beatPhase - 0.12));
      headSpring.step((0.13 + 0.07 * od) * nodCurve * nodCurve * (0.55 + 0.45 * s.energy), dt);
      if (kickEdge) headSpring.impulse((0.6 + 1.4 * od) * s.kick);
      U.uNod.value = clamp(headSpring.x, -0.05, 0.24);
      var groove = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * s.beatPhase), 3);
      torsoSpring.step(0.005 * groove * (1 + 0.8 * od), dt);
      if (kickEdge) torsoSpring.impulse(0.05 * od * s.kick);
      U.uBounce.value = clamp(torsoSpring.x, -0.004, 0.012);
      var swayWave = Math.sin(Math.PI * beats);
      U.uSway.value = (0.006 + 0.004 * od) * swayWave;
      U.uTwist.value = clamp(-0.02 * (0.4 + 0.6 * od) * swayWave, -0.05, 0.05);

      // Monitors — fast attack, spring return; cabinets buzz only in OVERDRIVE.
      if (kickEdge) coneSpring.impulse(38 * s.kick * (0.75 + 0.5 * od));
      coneSpring.step(0, dt);
      U.uCone.value = clamp(coneSpring.x, -0.45, 1.3);
      U.uCab.value = od > 0.05 ? Math.sin(liveTime * 2 * Math.PI * 11) * 0.0014 * s.low * od : 0;
      U.uKick.value = s.kick;
      U.uOverdrive.value = od;

      // Logo — five segments from the bands, peak hold, then decay.
      var lv = U.uLogoLvl.value, pk = U.uLogoPeak.value;
      var targets0 = s.low * 0.9 + s.kick * 0.2;
      var targets1 = (s.low + s.mid) * 0.5;
      var targets2 = s.energy;
      var targets3 = (s.mid + s.high) * 0.5;
      var targets4 = s.high;
      for (var c = 0; c < 5; c++) {
        var tgt = c === 0 ? targets0 : c === 1 ? targets1 : c === 2 ? targets2 : c === 3 ? targets3 : targets4;
        tgt = clamp(tgt * (0.75 + 0.25 * hash(c * 7 + s.beatIndex)) * (1 + 0.25 * od), 0, 1);
        lv[c] += (tgt - lv[c]) * (1 - Math.exp(-dt / (tgt > lv[c] ? 0.02 : 0.18)));
        if (lv[c] >= pk[c]) { pk[c] = lv[c]; logoHold[c] = 0.35; }
        else if (logoHold[c] > 0) logoHold[c] -= dt;
        else pk[c] = Math.max(lv[c], pk[c] - 0.6 * dt);
      }
      U.uLogoGlow.value = s.energy * (0.25 + 0.5 * s.kick) * (0.6 + 0.4 * od);

      // Reflective sweeps — rate limited (≥1.2 s apart), warm, never strobing.
      sweepCooldown -= dt;
      var wantSweep = barEdge && ((od > 0.5) || (hub.state === 'TRANSMITTING' && s.bar % 2 === 0) || sweepCooldown < -8);
      if (wantSweep && sweepCooldown <= 0) { sweepPos = -0.2; sweepActive = true; sweepCooldown = 1.2; }
      if (sweepActive) { sweepPos += dt * 1.5; if (sweepPos > 1.4) sweepActive = false; }
      U.uSweep.value = sweepPos;
      U.uSweepAmt.value = sweepActive ? (0.3 + 0.25 * od) * U.uIntensity.value : 0;
      if (relicMatRef) {
        relicMatRef.roughness = baseRoughness * (1 - 0.22 * s.kick * od);
        relicMatRef.emissiveIntensity = 0.008 + 0.02 * s.kick * s.energy + 0.015 * od;
      }

      // Pedestal — kick shockwave travels outward, rings answer with delay.
      if (kickEdge && s.energy > 0.45) { shockT = 0; shockStrength = s.kick * (0.5 + 0.5 * od); }
      if (shockT < 0.8) {
        shockT += dt;
        var sk = Math.min(1, shockT / 0.8);
        shock.visible = true;
        shock.scale.set(1 + sk * 1.5, 1 + sk * 1.5, 1);
        shockMat.opacity = 0.25 * shockStrength * (1 - sk) * (1 - sk);
      } else shock.visible = false;
      var ringPulse = 1 + Math.sin(autoAngle * 1.8) * 0.06 + kickAt(s.beatPhase, 0.08) * 0.035 * (1 + od);
      ring.scale.set(ringPulse, ringPulse, 1);
      ringMat.opacity = 0.035 + Math.sin(autoAngle * 1.8) * 0.02 + kickAt(s.beatPhase, 0.08) * 0.05;
      var ring2Pulse = 1 + Math.sin(autoAngle * 1.1 + 1) * 0.05 + kickAt(s.beatPhase, 0.18) * 0.03 * (1 + od);
      ring2.scale.set(ring2Pulse, ring2Pulse, 1);
      ring2Mat.opacity = 0.018 + Math.sin(autoAngle * 1.1 + 1) * 0.012 + kickAt(s.beatPhase, 0.18) * 0.02;
      pedestalRimMat.opacity = 0.2 + Math.sin(autoAngle * 2.2) * 0.08 + s.kick * 0.15;
      pedestalMat.emissiveIntensity = 0.012 + Math.sin(autoAngle * 2.5) * 0.008 + s.low * 0.02 * (1 + od);

      // Lights — museum breathing plus a key light that gets pushed around in OVERDRIVE.
      lightSpring.step(0.675 + 0.25 * Math.sin(autoAngle * 1.3), dt);
      if (kickEdge && od > 0.3) lightSpring.impulse((s.beatIndex % 2 ? 1 : -1) * 0.9 * od);
      keyLight.position.set(Math.sin(lightSpring.x) * 6.4, 7, Math.cos(lightSpring.x) * 6.4);
      rimLight.intensity = 0.8 + Math.sin(autoAngle * 2.0) * 0.2 + s.kick * 0.25 * (1 + 0.6 * od);
      accentLight.intensity = 0.25 + Math.sin(autoAngle * 1.5 + 1) * 0.12 + s.high * 0.15;
      fillLight.intensity = 0.3 + Math.sin(autoAngle + 2) * 0.06;
      underGlow.intensity = 0.15 + Math.sin(autoAngle * 2.8) * 0.08 + s.low * 0.3 * (1 + od);
      haloLight.intensity = 0.12 + Math.sin(autoAngle * 1.3) * 0.06 + od * 0.1;
      screenGlow.color.setHSL(0.62 + Math.sin(autoAngle * 0.4) * 0.04, 0.45, 0.35);
      coneMat.opacity = 0.012 + Math.sin(autoAngle * 1.3) * 0.005 + od * 0.008;

      var speedMul = 1 + s.energy * 1.2 + od * 0.8;
      var pos = pGeom.attributes.position.array;
      for (var i = 0; i < particleActive; i++) {
        pos[i * 3 + 1] += pSpeeds[i] * speedMul * dt * 60;
        pos[i * 3] += Math.sin(autoAngle * 1.8 + pPhases[i]) * 0.0015;
        pos[i * 3 + 2] += Math.cos(autoAngle * 1.3 + pPhases[i]) * 0.0015;
        if (pos[i * 3 + 1] > 6) {
          pos[i * 3 + 1] = -0.5;
          pos[i * 3] = (Math.random() - 0.5) * 10;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
      }
      pGeom.attributes.position.needsUpdate = true;
      pMat.opacity = 0.4 + Math.sin(autoAngle * 1.6) * 0.12;

      haloMat.opacity = 0.06 + Math.sin(autoAngle * 0.9) * 0.03 + od * 0.04;
      halo2Mat.opacity = 0.03 + Math.sin(autoAngle * 0.7 + 1) * 0.015;
      halo.rotation.z += dt * 0.018 * (1 + od);
      halo2.rotation.z -= dt * 0.012 * (1 + od);
      labelEdition.material.opacity = 0.25 + Math.sin(autoAngle * 1.4) * 0.1;
      labelRelic.material.opacity = 0.2 + Math.sin(autoAngle * 1.1 + 2) * 0.08;
      labelSignal.material.opacity = 0.15 + Math.sin(autoAngle * 0.8 + 1) * 0.06;
      gridHelper.material.opacity = 0.06 + Math.sin(autoAngle) * 0.03 + s.low * 0.03;
      renderer.toneMappingExposure = 0.95 + Math.sin(autoAngle * 0.7) * 0.06 + od * 0.06;

      if (kickEdge) dollySpring.impulse(0.9 * s.energy * (0.5 + od) * motionScale);
      dollySpring.step(od * 0.25 * motionScale, dt);
      return kickEdge;
    }

    function hoverZone() {
      if (!modelRef || !mouseInside || rig.dragging) {
        if (currentZone) hideReadout();
        hoverZone.last = -1;
        return -1;
      }
      if (!mouseMoved && frameCount % 3 !== 0) return hoverZone.last;
      mouseMoved = false;
      raycaster.setFromCamera(mouseNDC, camera);
      var hits = raycaster.intersectObject(modelRef, true);
      if (!hits.length) {
        if (currentZone) hideReadout();
        container.style.cursor = '';
        hoverZone.last = -1;
        return -1;
      }
      var zi = getZoneIndex(hits[0].point);
      projected.copy(hits[0].point).project(camera);
      readoutEl.style.left = ((projected.x * 0.5 + 0.5) * w) + 'px';
      readoutEl.style.top = ((-projected.y * 0.5 + 0.5) * h) + 'px';
      if (zones[zi].en !== currentZone) { currentZone = zones[zi].en; showReadout(zones[zi]); }
      if (!readoutEl.classList.contains('is-visible')) readoutEl.classList.add('is-visible');
      container.style.cursor = 'crosshair';
      hoverZone.last = zi;
      return zi;
    }
    hoverZone.last = -1;

    function tick(s, dt, raw) {
      if (!isVisible && !fsActive) return;
      frameCount++;
      var downgrade = governor.sample(raw);
      if (downgrade) applyQuality(downgrade);
      if (resizePending) doResize();

      animateRelic(s, dt);
      rigUpdate(dt, performance.now());
      applyCamera(dollySpring.x);

      var activeZoneIdx = frameCount % 3 === 0 || mouseMoved ? hoverZone() : hoverZone.last;
      hub.hoverLevel = activeZoneIdx === 3 ? 2 : (activeZoneIdx >= 0 ? 1 : 0);
      U.uActiveZone.value = activeZoneIdx;
      U.uTime.value = autoAngle;

      var wireOp = 0.02 + Math.sin(autoAngle * 1.2) * 0.01;
      var edgeOp = 0.035 + Math.sin(autoAngle * 1.8) * 0.015 + hub.overdriveMix * 0.03;
      if (activeZoneIdx >= 0) {
        if (wireRef) { wireRef.material.color.setHex(wireZoneColors[activeZoneIdx]); wireOp = 0.055 + Math.sin(autoAngle * 2.5) * 0.02; }
        if (edgeRef) { edgeRef.material.color.setHex(wireZoneColors[activeZoneIdx]); edgeOp = 0.06 + Math.sin(autoAngle * 2.0) * 0.02; }
      } else {
        if (wireRef) wireRef.material.color.setHex(0x4488cc);
        if (edgeRef) edgeRef.material.color.setHex(0xff5b1e);
      }
      if (wireRef) wireRef.material.opacity = wireOp;
      if (edgeRef) edgeRef.material.opacity = edgeOp;

      var state = hub.state;
      var pct = state === 'TRANSMITTING' ? Math.floor(((autoAngle * 4.5) % 1.0) * 50) * 2 : 0;
      if (state !== shownState || pct !== shownPct) {
        var labelChanged = state !== shownState;
        if (labelChanged) band.classList.toggle('is-overdrive', state === 'OVERDRIVE');
        shownState = state;
        shownPct = pct;
        renderRelicState(state, pct, labelChanged);
      }
      updateHud(s, performance.now());

      renderer.render(scene, camera);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDMFSignal, { once: true });
  else mountDMFSignal();
})();
