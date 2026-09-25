/* DMF RELIC RUNTIME — The Receiver: scene, DMFRelicAnimator, DMFCameraRig, DMF LIVE SIGNAL HUD.
 * Inlined into public/index.html by scripts/build-3d.cjs after engine.js and signal-bus.js. */
(function () {
  var RELIC_BPM = 124;

  function getLang() {
    // Single source of truth: the page sets <html lang> (es default, en when chosen).
    return String(document.documentElement.lang || 'es').toLowerCase().indexOf('en') === 0 ? 'en' : 'es';
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
            '<div class="dmf-live-hud-top">',
              '<span class="dmf-live-hud-title">DMF Live Signal</span>',
              '<svg class="dmf-live-hud-phase" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"></circle><circle class="dmf-live-hud-phase-arc" cx="10" cy="10" r="8" pathLength="1"></circle></svg>',
              '<span class="dmf-live-hud-bpm"><b>' + RELIC_BPM + '</b> BPM</span>',
            '</div>',
            '<div class="dmf-live-hud-meta"><span>Kinetic <b data-hud="kinetic">REST</b></span><span>Accel <b data-hud="accel">0.0</b></span><span>Cam <b data-hud="shot">ICON</b></span><span>Tier <b data-hud="tier">HIGH</b></span><span>FPS <b data-hud="fps">60</b></span><span>Act <b data-hud="act">ARRIVAL</b></span></div>',
            '<div class="dmf-live-hud-main">',
              '<div class="dmf-live-hud-tags"><span class="dmf-live-hud-hyper">Hyperdrive</span><span class="dmf-live-hud-sing" data-hud="sing">Singularity</span></div>',
              '<div class="dmf-live-hud-state">DORMANT</div>',
              '<div class="dmf-live-hud-impact"><span>Impact</span><i data-hud="impact"></i></div>',
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
    // The one Three.js r128 + GLTFLoader load of the page; other scenes (the Tips mixer) wait on hub.three.
    function announceThree(state) {
      hub.three = state;
      document.dispatchEvent(new CustomEvent('dmf:three', { detail: { state: state } }));
    }
    hub.three = 'loading';
    var threeScript = document.createElement('script');
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    threeScript.onload = function () {
      var loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
      loaderScript.onload = function () { announceThree('ready'); initScene(visual, band, hub); };
      loaderScript.onerror = function () { announceThree('failed'); };
      document.head.appendChild(loaderScript);
    };
    threeScript.onerror = function () { announceThree('failed'); };
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
    var KN = window.DMFKinetic;
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

    // === SPATIAL STAGE (V4) — one renderer for the whole landing ===
    // On HIGH/BALANCED the canvas moves (once) into a fixed layer behind the page and the relic band turns
    // transparent. setViewOffset anchors the composition: locked to the band in ARRIVAL, docked where each
    // ACT wants it afterwards, with every move followed by kinetic bodies. Fullscreen LIVE SIGNAL, LITE and
    // reduced motion keep the V3 band layout; the renderer is never recreated.
    var ST = window.DMFStage;
    var stageHub = hub.stage;
    var stage = stageHub && stageHub.director;
    // WebKit safety: the band-following mask needs mask-image (or -webkit-mask-image); clip-path inset is a
    // hard-edged fallback; with none of them the stage stays off and the Receiver keeps the V3 band layout.
    function stageMaskMode() {
      var CS = window.CSS;
      if (!CS || !CS.supports) return 'none';
      var g = 'linear-gradient(to bottom, transparent calc(20px - 10px), #000 20px)';
      if (CS.supports('mask-image', g)) return 'mask';
      if (CS.supports('-webkit-mask-image', g)) return 'webkit-mask';
      if (CS.supports('clip-path', 'inset(1px 0px 1px 0px)') || CS.supports('-webkit-clip-path', 'inset(1px 0px 1px 0px)')) return 'clip';
      return 'none';
    }
    var maskMode = stageMaskMode();
    var stageEligible = !reduceMotion && quality !== 'static' && !!ST && !!stage && maskMode !== 'none';
    var compactStage = window.innerWidth < 768 || touch;
    if (stage) stage.setCompact(compactStage);
    var follower = ST ? new ST.DMFStageFollower() : null;
    if (follower && stage) follower.reset(stage.poses[0]);
    var portal = ST ? new ST.DMFPortalField() : null;
    var stageStarted = false, shownMaskTop = -1e9, shownMaskBot = -1e9;
    var staged = false, stageVisible = false, stageLayer = null, shownStageOpacity = -1, seenLayout = -1;
    var stageActNow = 0, stageMotion = 0, frameAspect = 1.3, midTorque = 0, portalScaleNow = 0;
    var vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    var visTop = 0, visLeft = 0, visW = 0, visH = 0;
    var perf = hub.perf || null;   // debug surface only (created by the bus when ?dmfdebug=1 / localhost)

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

    // === SINGULARITY TUNNEL — three warm rings rush from behind the Receiver past the lens during
    // BREAKTHROUGH (+60..340 ms). Allocated once, hidden the rest of the time.
    var tunnelRings = [];
    var tunnelMat = new THREE.MeshBasicMaterial({
      color: 0xff6a2a, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    });
    for (var ti = 0; ti < 3; ti++) {
      var tr = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.635, 96), tunnelMat.clone());
      tr.visible = false;
      tr.renderOrder = 5;
      scene.add(tr);
      tunnelRings.push(tr);
    }

    // === TEMPORAL ECHO — two ghost copies of the Receiver share its geometry and deformation and
    // trail its (camera-relative) motion by a few frames during high impacts only. World matrices are
    // written in place from a preallocated history ring; nothing is allocated per frame.
    var ghosts = [];
    var GHOST_LAG = [2, 4];
    var GHOST_OPACITY = [0.07, 0.035];

    // === PORTAL / DEPTH ARCHITECTURE (V4) — instanced, warm, additive; hidden (zero cost) at rest ===
    // Transmission rings recede behind the Receiver, light frames line both sides like a stage truss, and
    // floor transmission lines mark depth. Brightness lives in instance colours (additive), so there is
    // one draw call per structure and nothing is allocated per frame.
    var RING_MAX = 10, FRAME_MAX = 8, LINE_MAX = 16;
    var portalMat = new THREE.MeshBasicMaterial({
      color: 0xff7a3d, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, transparent: true,
      depthWrite: false, toneMapped: false
    });
    function frameOutline(fw, fh, t) {
      var g = new THREE.BufferGeometry();
      var x = fw / 2, y = fh / 2;
      var quads = [[-x, y - t, x, y], [-x, -y, x, -y + t], [-x, -y, -x + t, y], [x - t, -y, x, y]];
      var pos = [];
      for (var q = 0; q < quads.length; q++) {
        var a = quads[q];
        pos.push(a[0], a[1], 0, a[2], a[1], 0, a[2], a[3], 0, a[0], a[1], 0, a[2], a[3], 0, a[0], a[3], 0);
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      return g;
    }
    var portalRings = new THREE.InstancedMesh(new THREE.RingGeometry(2.6, 2.625, 96, 1), portalMat, RING_MAX);
    var portalFrames = new THREE.InstancedMesh(frameOutline(2.4, 3.8, 0.018), portalMat.clone(), FRAME_MAX);
    var floorLineGeo = new THREE.PlaneGeometry(18, 0.014);
    floorLineGeo.rotateX(-Math.PI / 2);
    var portalLines = new THREE.InstancedMesh(floorLineGeo, portalMat.clone(), LINE_MAX);
    var PORTAL_MESHES = [portalRings, portalFrames, portalLines];
    var pM = new THREE.Matrix4(), pP = new THREE.Vector3(), pQ = new THREE.Quaternion(), pS = new THREE.Vector3();
    var pE = new THREE.Euler(), pC = new THREE.Color();
    for (var pmi = 0; pmi < PORTAL_MESHES.length; pmi++) {
      var pm = PORTAL_MESHES[pmi];
      pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (var pj = 0; pj < pm.count; pj++) { pm.setMatrixAt(pj, pM); pm.setColorAt(pj, pC.setRGB(0, 0, 0)); }
      pm.frustumCulled = false;
      pm.visible = false;
      pm.renderOrder = 2;
      scene.add(pm);
    }
    // LITE has no spatial geometry; BALANCED keeps half of each structure.
    function portalCount(tier) {
      if (tier === 'high') return 1;
      if (tier === 'balanced') return 0.5;
      if (tier === 'lite') return 0;
      return 0;
    }

    // === DMFRelicAnimator — shared uniforms for relic + overlays ===
    // The GLB is a single static mesh with no rig: motion is procedural in the
    // vertex shader around raw GLB object-space anchors (DJ head/neck, torso, monitor cones).
    var U = {
      uNod: { value: 0 }, uSway: { value: 0 }, uBounce: { value: 0 }, uTwist: { value: 0 },
      uConeL: { value: 0 }, uConeR: { value: 0 }, uCabL: { value: 0 }, uCabR: { value: 0 }, uLive: { value: 0 },
      uShoulder: { value: 0 },
      uVelView: { value: new THREE.Vector3(0, 0, 1) }, uVelMag: { value: 0 }, uReflectDrive: { value: 0 },
      uDeskT: { value: 9 }, uDeskAmp: { value: 0 },
      uKick: { value: 0 }, uOverdrive: { value: 0 }, uIntensity: { value: 1 },
      uLogoLvl: { value: [0, 0, 0, 0, 0] }, uLogoPeak: { value: [0, 0, 0, 0, 0] }, uLogoGlow: { value: 0 },
      uLogoWave: { value: 9 }, uLogoWaveAmp: { value: 0 },
      uSweep: { value: -1 }, uSweepAmt: { value: 0 },
      uActiveZone: { value: -1 }, uTime: { value: 0 }
    };
    var RELIC_CONES = [
      [-0.644, -0.064, -0.405], [0.652, -0.050, -0.395],
      [-0.630, -0.270, -0.040], [-0.620, -0.400, 0.165],
      [0.624, -0.280, -0.038], [0.624, -0.400, 0.173]
    ];
    function coneMasks(side) {
      return RELIC_CONES.filter(function (c) { return side < 0 ? c[0] < 0 : c[0] > 0; }).map(function (c) {
        var v = 'vec3(' + c.join(', ') + ')';
        var sd = side < 0 ? 'L' : 'R';
        return '  cw' + sd + ' += 1.0 - smoothstep(0.03, 0.07, distance(p, ' + v + '));\n' +
               '  cab' + sd + ' += 1.0 - smoothstep(0.1, 0.2, distance(p, ' + v + '));\n';
      }).join('');
    }
    // Head/neck, torso and cone anchors are raw GLB object-space coordinates.
    // Desk wave: a radial ripple across the lower geometry (desk, cases, pedestal-side monitors),
    // centred on the mixer and masked away from the DJ's body.
    var RELIC_MOTION_GLSL =
      'uniform float uNod;\nuniform float uSway;\nuniform float uBounce;\nuniform float uTwist;\n' +
      'uniform float uConeL;\nuniform float uConeR;\nuniform float uCabL;\nuniform float uCabR;\nuniform float uLive;\n' +
      'uniform float uShoulder;\n' +
      'uniform float uDeskT;\nuniform float uDeskAmp;\nvarying vec3 vObjPos;\n' +
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
      // Shoulders (mids): the upper body rolls laterally about the torso centre, above it only.
      '  float sw = bw * smoothstep(-0.02, 0.12, p.y) * uShoulder * uLive;\n' +
      '  vec2 sq = o.xy - vec2(0.31, 0.02);\n' +
      '  o.xy = vec2(0.31, 0.02) + vec2(sq.x * cos(sw) - sq.y * sin(sw), sq.x * sin(sw) + sq.y * cos(sw));\n' +
      '  float cwL = 0.0;\n  float cwR = 0.0;\n  float cabL = 0.0;\n  float cabR = 0.0;\n' +
      coneMasks(-1) + coneMasks(1) +
      '  o += n * ((min(cwL, 1.0) * uConeL + min(cwR, 1.0) * uConeR) * 0.02 + min(cabL, 1.0) * uCabL + min(cabR, 1.0) * uCabR) * uLive;\n' +
      '  float dr = length(p.xz - vec2(0.0, 0.35));\n' +
      '  float dm = (1.0 - bw) * (1.0 - smoothstep(-0.12, -0.04, p.y));\n' +
      '  o.y += dm * exp(-pow((dr - uDeskT * 1.4) / 0.08, 2.0)) * exp(-uDeskT * 3.0) * uDeskAmp * 0.006 * uLive;\n' +
      '  return o;\n' +
      '}\n';

    function injectRelicMotion(shader) {
      shader.uniforms.uNod = U.uNod;
      shader.uniforms.uSway = U.uSway;
      shader.uniforms.uBounce = U.uBounce;
      shader.uniforms.uTwist = U.uTwist;
      shader.uniforms.uConeL = U.uConeL;
      shader.uniforms.uConeR = U.uConeR;
      shader.uniforms.uCabL = U.uCabL;
      shader.uniforms.uCabR = U.uCabR;
      shader.uniforms.uShoulder = U.uShoulder;
      shader.uniforms.uLive = U.uLive;
      shader.uniforms.uDeskT = U.uDeskT;
      shader.uniforms.uDeskAmp = U.uDeskAmp;
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
    var modelBase = new THREE.Vector3();

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
        modelBase.copy(model.position);

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
            shader.uniforms.uLogoWave = U.uLogoWave;
            shader.uniforms.uLogoWaveAmp = U.uLogoWaveAmp;
            shader.uniforms.uSweep = U.uSweep;
            shader.uniforms.uSweepAmt = U.uSweepAmt;
            shader.uniforms.uVelView = U.uVelView;
            shader.uniforms.uVelMag = U.uVelMag;
            shader.uniforms.uReflectDrive = U.uReflectDrive;
            shader.vertexShader = shader.vertexShader
              .replace('#include <common>', '#include <common>\nattribute float aZoneId;\nattribute float aNormY;\nvarying float vZoneId;\nvarying float vNormY;')
              .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZoneId = aZoneId;\nvNormY = aNormY;');
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <common>', [
                '#include <common>',
                'uniform float uActiveZone;', 'uniform float uTime;', 'uniform float uIntensity;',
                'uniform float uKick;', 'uniform float uOverdrive;',
                'uniform float uLogoLvl[5];', 'uniform float uLogoPeak[5];', 'uniform float uLogoGlow;',
                'uniform float uLogoWave;', 'uniform float uLogoWaveAmp;',
                'uniform float uSweep;', 'uniform float uSweepAmt;', 'uniform float uLive;',
                'uniform vec3 uVelView;', 'uniform float uVelMag;', 'uniform float uReflectDrive;',
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
                // Transient travels from the centre of the M outward through the bars.
                '  float front = exp(-pow((abs(vObjPos.x) - uLogoWave * 1.1) / 0.035, 2.0)) * exp(-uLogoWave * 3.5) * uLogoWaveAmp;',
                '  float glow = eq * (0.3 + 0.7 * uKick) + peakLine * 0.8 + center + front * 0.9;',
                '  gl_FragColor.rgb += vec3(1.0, 0.36, 0.08) * glow * logoMask * 0.85 * uIntensity * (1.0 + 0.4 * uOverdrive);',
                '}',
                // Reflective sweep: warm, multiplicative-first so it reads as light on surfaces, never a white strobe.
                'if(uSweepAmt > 0.001){',
                '  float sx = vObjPos.x * 0.5 + 0.5 + vObjPos.y * 0.22;',
                '  float sb = exp(-pow((sx - uSweep) / 0.07, 2.0));',
                '  gl_FragColor.rgb += (gl_FragColor.rgb * 0.85 + vec3(0.22, 0.14, 0.08)) * sb * uSweepAmt;',
                '}',
                // VELOCITY FIELD: under acceleration, highlights on surfaces running across the motion stretch
                // (brightened anisotropically) and edges trailing the motion carry a warm emissive bias.
                // View-space velocity from the kinetic rig; zero at rest, so this costs nothing when still.
                'if(uVelMag > 0.002){',
                '  vec3 vn = normalize(normal);',
                '  vec3 vv = normalize(vViewPosition);',
                '  float rim = 1.0 - abs(dot(vn, vv));',
                '  float along = dot(vn, uVelView);',
                '  float across = 1.0 - abs(along);',
                '  float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));',
                '  float spec = smoothstep(0.28, 0.85, lum);',
                '  gl_FragColor.rgb += gl_FragColor.rgb * spec * across * across * (0.35 + 0.65 * uReflectDrive) * uVelMag * 0.9;',
                '  gl_FragColor.rgb += vec3(1.0, 0.36, 0.08) * max(-along, 0.0) * rim * rim * uVelMag * 0.22 * uIntensity;',
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

          for (var gi = 0; gi < GHOST_LAG.length; gi++) {
            var ghostMat = new THREE.MeshBasicMaterial({
              color: 0xff7a3d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
            });
            ghostMat.onBeforeCompile = injectRelicMotion;
            var ghost = new THREE.Mesh(geo, ghostMat);
            ghost.matrixAutoUpdate = false;
            ghost.visible = false;
            ghost.frustumCulled = false;
            ghost.userData.source = child;
            scene.add(ghost);
            ghosts.push(ghost);
          }
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

    // Tier ranges for dynamic render resolution; the scaler moves inside them, the governor moves between them.
    function tierRange(tier) {
      // The full-viewport stage fills ~2x the pixels of the band, so it gets a lower ceiling.
      if (staged && tier === 'high') return [1.1, 1.5];
      if (staged && tier === 'balanced') return [1, small ? 1.1 : 1.25];
      if (tier === 'high') return [1.35, 1.75];
      if (tier === 'balanced') return [1, small ? 1.25 : 1.5];
      return [1, 1];
    }
    function applyPixelRatio() {
      renderScale = Math.min(window.devicePixelRatio || 1, renderScaler.scale);
      renderer.setPixelRatio(renderScale);
      renderer.setSize(w, h);
      hub.renderScale = renderScale;
    }
    function applyQuality(tier) {
      quality = tier;
      hub.qualityTier = tier;
      var shadowsOn = tier === 'high';
      if (tier === 'high') { particleActive = 160; motionScale = 1; U.uIntensity.value = 1; }
      else if (tier === 'balanced') { particleActive = 80; motionScale = 0.7; U.uIntensity.value = 0.8; }
      else { particleActive = 40; motionScale = 0.6; U.uIntensity.value = 0.75; }
      // Kinetic detail: echoes only on high; velocity-field detail and the tunnel scale down, then off.
      echoOn = tier === 'high';
      velDetail = tier === 'high' ? 1 : (tier === 'balanced' ? 0.6 : 0);
      tunnelOn = tier !== 'lite';
      portalScaleNow = portalCount(tier);
      if (stageHub) stageHub.spatialTier = staged ? 'stage-' + tier : (fsActive ? 'fullscreen' : 'band');
      portalRings.count = Math.round(RING_MAX * portalScaleNow);
      portalFrames.count = Math.round(FRAME_MAX * portalScaleNow);
      portalLines.count = Math.round(LINE_MAX * portalScaleNow);
      if (!echoOn) for (var gk = 0; gk < ghosts.length; gk++) ghosts[gk].visible = false;
      var range = tierRange(tier);
      renderScaler.setRange(range[0], range[1]);
      renderer.shadowMap.enabled = shadowsOn;
      keyLight.castShadow = shadowsOn;
      pGeom.setDrawRange(0, particleActive);
      if (wireRef) wireRef.visible = tier === 'high';
      if (edgeRef) edgeRef.visible = tier !== 'lite';
      applyPixelRatio();
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

    // aim is where the shot choreography wants the camera; cur follows it through critically damped
    // kinetic bodies, so cuts and blends never change camera velocity abruptly (no teleports, no snaps).
    var cur = makePose(), aim = makePose(), from = makePose(), shotPose = makePose(), user = makePose();
    var rig = { mode: 'auto', shot: 'A', shotIdx: 0, t: 0, blend: 1, blendDur: 2.8, lastInput: -1e9, velAz: 0, dragging: false };
    var RESUME_MS = 5000;
    var POSE_KEYS = ['az', 'r', 'y', 'tx', 'ty', 'tz', 'roll'];
    var poseBodies = {};
    for (var pk = 0; pk < POSE_KEYS.length; pk++) poseBodies[POSE_KEYS[pk]] = new KN.DMFKineticBody(36, 1, { maxA: 30, maxJ: 400 });
    function syncPose(p) {
      for (var i = 0; i < POSE_KEYS.length; i++) poseBodies[POSE_KEYS[i]].reset(p[POSE_KEYS[i]]);
    }
    function followPose(dt) {
      for (var i = 0; i < POSE_KEYS.length; i++) {
        var key = POSE_KEYS[i];
        cur[key] = poseBodies[key].step(aim[key], dt);
      }
    }
    computeShot('A', 0, SHOT_DUR.A, cur);
    copyPose(aim, cur);
    syncPose(cur);

    function cut(next, blendDur) {
      copyPose(from, aim);
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
            copyPose(aim, user);
            syncPose(user);
            rig.shotIdx = 0;
            cut(hub.state === 'OVERDRIVE' ? 'D' : 'A', 3.4);
          }
        }
        if (rig.mode === 'user') { user.roll = 0; copyPose(cur, user); copyPose(aim, user); syncPose(user); return; }
      }
      var od = hub.state === 'OVERDRIVE';
      // Docked behind an ACT the camera holds the ICON portrait (the journey offsets move it); the
      // ICON → SIGNAL → RELIC cycle only runs while the Receiver lives in its own band.
      var docked = staged && stageActNow > 0;
      if (od && rig.shot !== 'D') cut('D', 1.6);
      else if (!od && rig.shot === 'D') { rig.shotIdx = docked ? 0 : 2; cut(docked ? 'A' : 'C', 3.0); }
      else if (docked && rig.shot !== 'A') { rig.shotIdx = 0; cut('A', 2.8); }
      rig.t += dt;
      if (!docked && rig.shot !== 'D' && rig.t > SHOT_DUR[rig.shot]) {
        rig.shotIdx = (rig.shotIdx + 1) % SHOT_ORDER.length;
        cut(SHOT_ORDER[rig.shotIdx], 2.8);
      }
      computeShot(rig.shot, rig.t, SHOT_DUR[rig.shot], shotPose);
      if (rig.blend < 1) {
        rig.blend = Math.min(1, rig.blend + dt / rig.blendDur);
        lerpPose(aim, from, shotPose, ease5(rig.blend));
      } else copyPose(aim, shotPose);
      followPose(dt);
    }

    var LOOK = new THREE.Vector3();
    var parallaxX = 0, parallaxY = 0;
    var autoAngle = 0;
    // Camera = shot pose + kinetic overlay: dolly travel, lateral ORBIT arc (mids + pointer inertia),
    // pointer height inertia, impact lens. The pointer never drives the camera directly.
    function applyCamera(dolly) {
      var aspect = staged ? frameAspect : w / h;
      var fit = aspect < 1.1 ? 1 + (1.1 - aspect) * 0.95 : 1;
      var auto = rig.mode === 'auto';
      var az = cur.az + latK.x + (auto ? Math.sin(autoAngle) * 0.05 * motionScale : 0);
      var r = (cur.r - dolly) * fit;
      var y = cur.y + (auto ? parYK.x + Math.sin(autoAngle * 0.8) * 0.08 * motionScale : 0);
      // CAMERA JOURNEY: the ACT's authored dolly/orbit/height/target/FOV, followed by kinetic bodies.
      // Scroll speed stretches the lens a little; the kick punches it only while the stage is moving.
      var sp = staged ? follower.pose : null;
      var stageFov = 0, lookLift = 0;
      if (sp) {
        az += sp.az;
        r *= 1 + sp.r;
        y += sp.y;
        lookLift = sp.ty;
        stageFov = sp.fov + 1.2 * Math.abs(stageHub.scroll.velocity) - 0.5 * portal.punch * portal.intensity;
      }
      camera.position.set(Math.sin(az) * r, y, Math.cos(az) * r);
      var fov = 34 + clamp(lens.fov + stageFov, -3.5, 3.5);
      if (Math.abs(camera.fov - fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }
      LOOK.set(cur.tx, cur.ty + lookLift, cur.tz);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK);
      var roll = cur.roll + lens.roll;
      if (roll) camera.rotateZ(roll);
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
    var shownHd = false;
    var shownSg = false;
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

    // Pointer velocity is accumulated here (event time) and spent once per frame as a small force.
    // Touch and coarse pointers never move anything; the audio choreography is unchanged for them.
    var finePointer = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var ptrAcc = 0, ptrLastX = -1, ptrSpin = 0;
    container.addEventListener('mousemove', function (e) {
      var rect = container.getBoundingClientRect();
      if (finePointer && !staged) {
        var nx = (e.clientX - rect.left) / rect.width;
        if (ptrLastX >= 0) ptrAcc += nx - ptrLastX;
        ptrLastX = nx;
      }
      parallaxX = finePointer ? ((e.clientX - rect.left) / rect.width - 0.5) * 2 : 0;
      parallaxY = finePointer ? ((e.clientY - rect.top) / rect.height - 0.5) * 2 : 0;
      if (staged) mouseNDC.set((e.clientX / vw) * 2 - 1, -(e.clientY / vh) * 2 + 1);
      else mouseNDC.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      mouseInside = true;
      mouseMoved = true;
    });
    // On the spatial stage the pointer is felt page-wide (fine pointers only), still only as velocity.
    var ptrPageX = -1;
    if (finePointer) {
      window.addEventListener('mousemove', function (e) {
        if (!staged) { ptrPageX = -1; return; }
        var nx = e.clientX / vw;
        if (ptrPageX >= 0) ptrAcc += nx - ptrPageX;
        ptrPageX = nx;
      }, { passive: true });
    }
    container.addEventListener('mouseleave', function () {
      parallaxX = 0; parallaxY = 0; mouseInside = false; ptrLastX = -1;
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
    var hudPhase = hud.querySelector('.dmf-live-hud-phase-arc');
    var hudImpact = hud.querySelector('[data-hud="impact"]');
    var hudShot = hud.querySelector('[data-hud="shot"]');
    var hudTier = hud.querySelector('[data-hud="tier"]');
    var hudKinetic = hud.querySelector('[data-hud="kinetic"]');
    var hudAccel = hud.querySelector('[data-hud="accel"]');
    var hudFps = hud.querySelector('[data-hud="fps"]');
    var hudSing = hud.querySelector('[data-hud="sing"]');
    var hudAct = hud.querySelector('[data-hud="act"]');
    var hudShownAct = '';
    var hudLast = 0;
    var hudShownState = '';
    var hudShownShot = '';
    var hudShownTier = '';
    var hudShownHd = false;
    var hudShownKinetic = '';
    var hudShownAccel = '';
    var hudShownFps = -1;
    var hudShownSing = '';

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

    // HUD writes only while fullscreen, ~30 Hz, transforms and short text only.
    function updateHud(s, nowMs) {
      if (!fsActive || nowMs - hudLast < 33) return;
      hudLast = nowMs;
      if (hudShownState !== hub.state) { hudState.textContent = hub.state; hudShownState = hub.state; hud.setAttribute('data-state', hub.state); }
      hudBpm.textContent = s.bpm;
      hudPhase.style.strokeDashoffset = (1 - s.beatPhase).toFixed(3);
      hudImpact.style.transform = 'scale(' + (0.35 + s.impulse * 1.3).toFixed(3) + ')';
      hudImpact.style.opacity = (0.25 + s.impulse * 0.75).toFixed(3);
      var shot = hub.cameraShot || 'ICON';
      if (shot !== hudShownShot) { hudShot.textContent = shot; hudShownShot = shot; }
      var tier = quality.toUpperCase() + ' ' + renderScale.toFixed(2) + '\u00d7';
      if (tier !== hudShownTier) { hudTier.textContent = tier; hudShownTier = tier; }
      var hdOn = !!(hub.hyper && hub.hyper.active);
      if (hdOn !== hudShownHd) { hud.classList.toggle('is-hyperdrive', hdOn); hudShownHd = hdOn; }
      var kn = hub.kinetic;
      if (kn.state !== hudShownKinetic) { hudKinetic.textContent = kn.state; hudShownKinetic = kn.state; }
      var accel = kn.accel.toFixed(1);
      if (accel !== hudShownAccel) { hudAccel.textContent = accel; hudShownAccel = accel; }
      if (hub.fps !== hudShownFps) { hudFps.textContent = hub.fps; hudShownFps = hub.fps; }
      var actName = stage ? stage.actName() : 'ARRIVAL';
      if (actName !== hudShownAct) { hudAct.textContent = actName; hudShownAct = actName; }
      var sg = hub.singularity;
      var sing = !sg ? 'off' : (sg.active ? sg.phase : (sg.armed ? 'armed' : (sg.sinceLast < sg.cooldown ? 'cooldown' : 'idle')));
      if (sing !== hudShownSing) {
        hudShownSing = sing;
        hudSing.textContent = sing === 'idle' || sing === 'off' ? 'Singularity' : 'Singularity \u00b7 ' + sing;
        hud.setAttribute('data-sing', sing);
      }
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
      vw = window.innerWidth || vw;
      vh = window.innerHeight || vh;
      var r = container.getBoundingClientRect();
      var sy = window.pageYOffset || 0;
      visTop = r.top + sy; visLeft = r.left; visW = r.width; visH = r.height;
      var nowCompact = vw < 768 || touch;
      if (nowCompact !== compactStage) { compactStage = nowCompact; if (stage) stage.setCompact(compactStage); }
      if (staged) {
        // The layer is sized to the large viewport (100lvh), so mobile toolbars never resize the canvas.
        vh = (stageLayer && stageLayer.clientHeight) || vh;
        w = vw;
        h = vh;
        renderer.setSize(w, h);
        camPrevSet = false;
        return;
      }
      w = container.clientWidth;
      h = container.clientHeight;
      camera.clearViewOffset();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      // A layout change re-frames the camera; it is not motion, so the velocity field restarts from here.
      camPrevSet = false;
    }
    var lastResizeW = window.innerWidth;
    window.addEventListener('resize', function () {
      var nw = window.innerWidth;
      // iOS / Android toolbars change only the height while scrolling: not a layout change for the stage.
      if (touch && staged && nw === lastResizeW) return;
      lastResizeW = nw;
      requestResize();
    });
    // A hidden tab never costs quality: the governor drops its window and skips the first one back.
    document.addEventListener('visibilitychange', function () { if (document.hidden) governor.pause(); });

    var staticMode = false;
    function renderStatic() {
      staticMode = true;
      if (resizePending) doResize();
      applyCamera(0);
      renderer.render(scene, camera);
    }

    // === DMFRelicAnimator — three response layers on kinetic bodies (KINETIC SINGULARITY) ===
    // IMPULSE (0-90 ms): cones, head snap, pedestal shock, camera impulse. BODY (90-320 ms): torso,
    // cabinets, shoulders, logo. CINEMA (250-1600 ms): camera travel, lens, exposure, environment.
    // Every major transform is a DMFKineticBody (position, velocity, acceleration, jerk-limited target
    // acceleration) fed by the bus force matrix — never by raw FFT values — with hard limits on each.
    var SpringCtor = O.DMFSpring;
    var KB = KN.DMFKineticBody;
    var headK = new KB(380, 0.67, { maxA: 160, maxJ: 9000, min: -0.06, max: 0.22 });  // kick snap, small rebound
    var headSlow = new SpringCtor(60, 11);                                               // delayed counter-motion
    var torsoK = new KB(70, 0.6, { maxA: 1.2, maxJ: 90, min: -0.003, max: 0.015 });     // low-band mass
    var twistK = new KB(50, 0.7, { maxA: 3, maxJ: 150, min: -0.05, max: 0.05 });        // counter-rotation
    var shoulderK = new KB(90, 0.55, { maxA: 4, maxJ: 300, min: -0.03, max: 0.03 });    // mids: upper body
    var coneL = new KB(1000, 0.38, { maxA: 1600, maxJ: 200000, min: -0.45, max: 1.2 });
    var coneR = new KB(1000, 0.38, { maxA: 1600, maxJ: 200000, min: -0.45, max: 1.2 });
    var cabL = new KB(1400, 0.13, { maxA: 40, maxJ: 8000, min: -0.02, max: 0.02 });    // ~6 Hz resonance
    var cabR = new KB(1250, 0.15, { maxA: 40, maxJ: 8000, min: -0.02, max: 0.02 });    // detuned: spatial asymmetry
    var depthK = new KB(60, 0.75, { maxA: 40, maxJ: 3000, min: -0.06, max: 0.14 });    // Receiver Z drive (world)
    var scaleK = new KB(90, 0.6, { maxA: 12, maxJ: 900, min: -0.02, max: 0.035 });     // depth/scale impulse
    var pedK = new KB(220, 0.5, { maxA: 8, maxJ: 900, min: 0, max: 0.14 });            // pedestal compression
    var orbitSpring = new SpringCtor(4, 4);
    var lightSpring = new SpringCtor(10, 5);
    var dollyK = new KB(40, 0.72, { maxA: 140, maxJ: 6000, min: -0.9, max: 3.6 });     // camera travel (+ forward)
    var lensSpring = new KB(90, 0.68, { maxA: 1600, maxJ: 90000 });                   // impact lens (FOV degrees)
    var rollSpring = new KB(60, 0.58, { maxA: 10, maxJ: 800 });
    var latK = new KB(30, 0.8, { maxA: 1.5, maxJ: 60, min: -0.1, max: 0.1 });         // ORBIT arc + pointer (rad)
    var parYK = new KB(20, 0.9, { maxA: 2, maxJ: 60 });
    orbitSpring.x = 0.072;
    lightSpring.x = 0.675;
    var prevBar = -1, lastHdId = 0, hdHitFrame = false;
    var liveTime = 0;
    var sweepPos = -1, sweepActive = false, sweepCooldown = 0, sweepSpeed = 1.5, reflectHigh = false;
    var shockT = 1, shockStrength = 0;
    var sinceHit = 9, hitStrength = 0, pressure = 0;
    var coneRDelay = -1, coneRAmp = 0, cabRAmp = 0;
    var logoHold = [0, 0, 0, 0, 0];
    var frameCount = 0;
    var governor = new O.DMFPerformanceGovernor(quality);
    var renderScaler = new O.DMFRenderScaler(1.35, 1.75);
    var renderScale = 1;
    var lens = { fov: 0, roll: 0 };
    var dollyAim = 0;
    var wireZoneColors = [0x886633, 0xcc8844, 0x44ddff, 0xff6633];
    var SHOT_NAMES = { A: 'ICON', B: 'SIGNAL', C: 'RELIC', D: 'OVERDRIVE' };
    var baseFog = scene.fog.density;
    var echoOn = true, velDetail = 1, tunnelOn = true;
    var vf = new KN.DMFVelocityField();
    var HIST = 8, HSTRIDE = 7;
    var hist = new Float32Array(HIST * HSTRIDE);
    var histIdx = 0, histCount = 0;
    var camPrevX = 0, camPrevY = 0, camPrevZ = 0, camPrevSet = false;
    var FWD = new THREE.Vector3();

    // Gaussian bump: how strongly a ring at `delay` seconds from the impact is lit right now.
    function pulseAt(t, delay, width) { var x = (t - delay) / width; return Math.exp(-x * x); }

    // Receiver transform: base + depth drive toward the camera; the pedestal compresses and the
    // Receiver sinks with it (pedestal top = 0.12 × its y-scale), so it reads heavy, not floaty.
    function applyReceiverTransform() {
      var cx = camera.position.x, cz = camera.position.z;
      var cl = Math.sqrt(cx * cx + cz * cz) || 1;
      var sink = 0.12 * pedK.x;
      // RECEIVER CONTINUITY: each ACT gives it an orientation, a size and an advance; MID adds torque.
      var sp = staged ? follower.pose : null;
      var adv = depthK.x + (sp ? sp.depth : 0);
      if (modelRef) {
        modelRef.position.set(modelBase.x + cx / cl * adv, modelBase.y - sink, modelBase.z + cz / cl * adv);
        if (modelCurrentScale >= modelTargetScale) {
          modelRef.scale.setScalar(modelTargetScale * (1 + scaleK.x) * (sp ? 1 + sp.scale : 1));
          modelRef.rotation.y = sp ? sp.rotY + midTorque : 0;
        }
      }
      pedestal.scale.y = 1 - pedK.x;
      pedestal.position.y = 0.06 * (1 - pedK.x);
      pedestalRim.position.y = 0.13 - sink;
      inscription.position.y = 0.131 - sink;
      shock.position.y = 0.135 - sink;
    }

    function animateRelic(s, dt) {
      var od = hub.overdriveMix;
      var hd = hub.hyper;
      var sg = hub.singularity;
      var f = hub.forces;
      var ms = motionScale;
      var hdLevel = hd && hd.active ? hd.level : 0;
      var hdPre = hd ? hd.pre : 0;
      var sPre = sg ? sg.pre : 0, sIgn = sg ? sg.ignition : 0, sLvl = sg ? sg.level : 0, sBrk = sg ? sg.breakthrough : 0;
      var sHit = !!(sg && sg.hit);
      // EVENT HORIZON: quiet and conversion sections settle the stage (speakers, glow, portal); the Receiver
      // gains focus as its own section arrives; stage depth loads the cabinets with the low band.
      var eh = hub.eventHorizon;
      var ehQuiet = eh ? 1 - 0.45 * eh.calm : 1;
      var ehFocus = eh && eh.section === 'relic' ? eh.focus : 0;
      var ehDepth = eh ? Math.max(0, eh.depth) : 0;
      // PRECOMPRESSION: the Receiver's groove almost freezes while pressure builds.
      var freeze = 1 - 0.85 * sPre;
      liveTime += dt;

      if (modelRef && modelCurrentScale < modelTargetScale) {
        modelCurrentScale += (modelTargetScale - modelCurrentScale) * (1 - Math.exp(-dt * 1.8));
        if (modelTargetScale - modelCurrentScale < 0.001) modelCurrentScale = modelTargetScale;
        modelRef.scale.setScalar(modelCurrentScale);
        entranceAngle += dt * 1.2;
        modelRef.rotation.y = Math.sin(entranceAngle) * 0.12 * (1 - modelCurrentScale / modelTargetScale);
      }
      U.uLive.value = modelTargetScale > 0 ? modelCurrentScale / modelTargetScale : 0;

      var hit = s.beatFired ? s.impulse : 0;
      var barEdge = s.bar !== prevBar;
      prevBar = s.bar;
      var hdHit = !!(hd && hd.active && hd.id !== lastHdId);
      if (hd) lastHdId = hd.id;
      hdHitFrame = hdHit;
      if (activationPending) {
        activationPending = false;
        hit = Math.max(hit, 0.9);
        barEdge = true;
        sweepCooldown = 0;
      }
      if (hdHit || sHit) hit = 1;

      // Anticipation: in energetic passages the rig leans back in the ~100 ms before a predicted beat.
      pressure = s.energy > 0.55 ? clamp(1 - s.timeToBeat / 0.1, 0, 1) * (s.energy - 0.55) / 0.45 * (0.4 + 0.6 * s.dropEnergy) * freeze : 0;

      // IMPULSE — cones punch (right side 14 ms later: spatial delay), cabinets recoil, head snaps,
      // the pedestal takes the shock. SINGULARITY impacts add their own, larger forces.
      if (hit > 0) {
        sinceHit = 0;
        hitStrength = hit * (0.6 + 0.4 * s.energy) * (1 + 0.5 * od + hdLevel + (sHit ? 1.5 : 0));
        var punch = 46 * hit * (0.8 + 0.5 * od + 0.5 * hdLevel + (sHit ? 0.6 : 0)) * 0.82 * ehQuiet;
        coneL.impulse(punch);
        coneRDelay = 0.014;
        coneRAmp = punch;
        cabRAmp = -0.35 * hit * (0.6 + 0.4 * od + (sHit ? 0.8 : 0));
        cabL.impulse(cabRAmp * 1.1);
        headK.impulse((2.6 + 1.6 * od + 1.4 * hdLevel + (sHit ? 2.4 : 0)) * hit);
        pedK.impulse((0.25 * f.pedestal * f.amp + (sHit ? 0.6 : 0)) * hit);
        orbitSpring.impulse(0.05 * s.energy * ms);
        // Camera impulse per kick, OVERDRIVE only: silence between events matters.
        if (od > 0.5 && !sHit && !hdHit) dollyK.impulse(0.35 * f.camera * f.travel * ms);
      } else sinceHit += dt;
      if (coneRDelay >= 0) {
        coneRDelay -= dt;
        if (coneRDelay < 0) { coneR.impulse(coneRAmp); cabR.impulse(cabRAmp); }
      }
      // IGNITION preloads the cones inward; LOW pressure loads the cabinets (right side detuned).
      coneL.step(-0.35 * sIgn, dt);
      coneR.step(-0.35 * sIgn, dt);
      var cabPress = -0.008 * f.cabinet * f.amp * ehQuiet * (1 + 0.6 * ehDepth);
      cabL.step(cabPress, dt);
      cabR.step(cabPress * 0.85, dt);
      U.uConeL.value = coneL.x;
      U.uConeR.value = coneR.x;
      U.uCabL.value = cabL.x * 0.25;
      U.uCabR.value = cabR.x * 0.25;
      U.uDeskT.value = sinceHit;
      U.uDeskAmp.value = clamp(hitStrength, 0, 1.6);
      U.uLogoWave.value = sinceHit;
      U.uLogoWaveAmp.value = clamp(hitStrength * 0.8, 0, 1.4);
      U.uKick.value = s.kick;
      U.uOverdrive.value = od;

      // DJ — groove nod, kick snap, delayed counter-motion; torso carries the low band with mass;
      // shoulders answer the mids; the torso counter-rotates on IGNITION.
      var beats = s.beatIndex + s.beatPhase;
      var nodBase = (0.05 + 0.03 * od) * (0.5 + 0.5 * Math.cos(2 * Math.PI * (s.beatPhase - 0.18))) * s.energy * freeze;
      headK.step(nodBase - 0.03 * pressure, dt);
      headSlow.step(headK.x, dt);
      U.uNod.value = clamp(headK.x - 0.3 * headSlow.x, -0.06, 0.22);
      var groove = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * s.beatPhase), 3);
      torsoK.step((0.004 * groove * (1 + 0.6 * od) + 0.004 * f.torso * f.amp + s.body * 0.009 * (1 + od + hdLevel)) * freeze + 0.012 * sLvl, dt);
      U.uBounce.value = torsoK.x;
      var swayWave = Math.sin(Math.PI * beats);
      U.uSway.value = (0.006 + 0.004 * od) * swayWave * freeze;
      twistK.step(clamp(-0.015 * (0.4 + 0.6 * od) * swayWave * freeze - 0.12 * (headK.x - nodBase) - 0.035 * sIgn + 0.005 * Math.sin(liveTime * 0.17) * ehQuiet, -0.05, 0.05), dt);
      U.uTwist.value = twistK.x;
      shoulderK.step(0.022 * f.shoulder * f.amp * swayWave * freeze, dt);
      U.uShoulder.value = shoulderK.x;

      // RECEIVER DEPTH DRIVE — low energy pushes it toward the camera; PRECOMPRESSION draws it back and
      // in; the SINGULARITY impact throws it forward and swells it, then mass and damping bring it home.
      if (sHit) { depthK.impulse(0.7 * ms); scaleK.impulse(0.35); }
      depthK.step((0.05 * f.depth * f.amp - 0.03 * sPre) * ms, dt);
      scaleK.step(-0.012 * sPre, dt);
      pedK.step(0.05 * f.floor * f.amp + 0.03 * sPre, dt);
      applyReceiverTransform();

      // Logo — five segments with peak hold; mids articulate the inner bars; PRECOMPRESSION concentrates
      // the energy into the M, and the impact front explodes outward from it (shader).
      var lv = U.uLogoLvl.value, pk = U.uLogoPeak.value;
      for (var c = 0; c < 5; c++) {
        var tgt = c === 0 ? s.low * 0.9 + s.kick * 0.2 : c === 1 ? (s.low + s.mid) * 0.5 : c === 2 ? s.energy : c === 3 ? (s.mid + s.high) * 0.5 : s.high;
        if (c > 0 && c < 4) tgt += 0.2 * f.logo;
        tgt = clamp(tgt * (0.75 + 0.25 * hash(c * 7 + s.beatIndex)) * (1 + 0.25 * od + 0.3 * hdLevel) * (c === 2 ? 1 + 0.8 * sPre : 1 - 0.7 * sPre), 0, 1);
        lv[c] += (tgt - lv[c]) * (1 - Math.exp(-dt / (tgt > lv[c] ? 0.02 : 0.18)));
        if (lv[c] >= pk[c]) { pk[c] = lv[c]; logoHold[c] = 0.35; }
        else if (logoHold[c] > 0) logoHold[c] -= dt;
        else pk[c] = Math.max(lv[c], pk[c] - 0.6 * dt);
      }
      U.uLogoGlow.value = s.energy * (0.25 + 0.5 * s.body) * (0.6 + 0.4 * od) + hdLevel * 0.35 + sPre * 0.9 + sLvl * 0.5;

      // Reflective sweeps — rate limited (≥1.2 s apart), warm, never strobing. Fast motion can also
      // start one (kineticField), sharing the same cooldown.
      sweepCooldown -= dt;
      var wantSweep = hdHit || sHit || (eh && eh.speed > 0.45 && eh.calm < 0.5) || (barEdge && ((od > 0.5) || (hub.state === 'TRANSMITTING' && s.bar % 2 === 0) || sweepCooldown < -8));
      if (wantSweep && sweepCooldown <= 0) { sweepPos = -0.2; sweepActive = true; sweepCooldown = 1.2; sweepSpeed = 1.5; }
      if (sweepActive) { sweepPos += dt * sweepSpeed; if (sweepPos > 1.4) sweepActive = false; }
      U.uSweep.value = sweepPos;
      U.uSweepAmt.value = sweepActive ? (0.3 + 0.25 * od + 0.15 * hdLevel + 0.2 * sLvl) * U.uIntensity.value * (1 - 0.6 * sPre) : 0;

      // Pedestal — the kick lands in the centre first, then rim, inner ring, outer ring, floor grid.
      var wv = hitStrength * Math.exp(-sinceHit * 1.6);
      if (hit > 0 && s.energy > 0.45) { shockT = 0; shockStrength = hit * (0.5 + 0.5 * od + 0.5 * hdLevel + (sHit ? 1.1 : 0)); }
      if (shockT < 0.8) {
        shockT += dt;
        var sk = Math.min(1, shockT / 0.8);
        shock.visible = true;
        shock.scale.set(1 + sk * 1.5, 1 + sk * 1.5, 1);
        shockMat.opacity = Math.min(0.4, 0.25 * shockStrength) * (1 - sk) * (1 - sk);
      } else shock.visible = false;
      pedestalMat.emissiveIntensity = 0.012 + Math.sin(autoAngle * 2.5) * 0.008 + pulseAt(sinceHit, 0, 0.05) * 0.05 * wv + s.low * 0.01;
      pedestalRimMat.opacity = 0.2 + Math.sin(autoAngle * 2.2) * 0.08 + pulseAt(sinceHit, 0.05, 0.05) * 0.25 * wv;
      var ringPulse = 1 + Math.sin(autoAngle * 1.8) * 0.06 + pulseAt(sinceHit, 0.12, 0.07) * 0.05 * wv;
      ring.scale.set(ringPulse, ringPulse, 1);
      ringMat.opacity = 0.035 + Math.sin(autoAngle * 1.8) * 0.02 + pulseAt(sinceHit, 0.12, 0.07) * 0.08 * wv;
      var ring2Pulse = 1 + Math.sin(autoAngle * 1.1 + 1) * 0.05 + pulseAt(sinceHit, 0.22, 0.09) * 0.04 * wv;
      ring2.scale.set(ring2Pulse, ring2Pulse, 1);
      ring2Mat.opacity = 0.018 + Math.sin(autoAngle * 1.1 + 1) * 0.012 + pulseAt(sinceHit, 0.22, 0.09) * 0.04 * wv;
      gridHelper.material.opacity = 0.06 + Math.sin(autoAngle) * 0.03 + pulseAt(sinceHit, 0.32, 0.12) * 0.05 * wv + 0.02 * f.floor;

      // Scene orbit with mass; the key light is pushed around by hits in OVERDRIVE / HYPERDRIVE.
      orbitSpring.step(0.072 * (1 + 1.6 * s.dropEnergy) * (1 - 0.5 * hdPre) * freeze, dt);
      autoAngle += dt * clamp(orbitSpring.x, 0.02, 0.4);
      lightSpring.step(0.675 + 0.25 * Math.sin(autoAngle * 1.3), dt);
      if (hit > 0 && (od > 0.3 || hdLevel > 0 || sHit)) lightSpring.impulse((s.beatIndex % 2 ? 1 : -1) * (0.9 * od + 1.2 * hdLevel + (sHit ? 1.4 : 0)));
      keyLight.position.set(Math.sin(lightSpring.x) * 6.4, 7, Math.cos(lightSpring.x) * 6.4);

      // BODY lights; HIGH drives the light edges; each ACT sets its own key/rim emphasis.
      var stageLight = staged ? follower.pose.light : 0;
      midTorque = staged ? 0.035 * f.forceMid * f.amp * Math.sin(Math.PI * beats / 2) * freeze : 0;
      keyLight.intensity = 2.4 * (1 + 0.35 * stageLight) * (0.7 + 0.3 * ehQuiet);
      rimLight.intensity = 0.8 + Math.sin(autoAngle * 2.0) * 0.2 + s.body * 0.3 * (1 + 0.6 * od) + hdLevel * 0.4 + sLvl * 0.5 + 0.3 * stageLight + 0.25 * ehFocus;
      accentLight.intensity = 0.25 + Math.sin(autoAngle * 1.5 + 1) * 0.12 + s.high * 0.15 + f.edge * 0.2;
      fillLight.intensity = 0.3 + Math.sin(autoAngle + 2) * 0.06;
      underGlow.intensity = (0.15 + Math.sin(autoAngle * 2.8) * 0.08 + s.body * 0.35 * (1 + od) + hdLevel * 0.3 + sLvl * 0.4) * ehQuiet;
      haloLight.intensity = 0.12 + Math.sin(autoAngle * 1.3) * 0.06 + od * 0.1 + hdLevel * 0.2 + sLvl * 0.25;
      screenGlow.color.setHSL(0.62 + Math.sin(autoAngle * 0.4) * 0.04, 0.45, 0.35);
      coneMat.opacity = (0.012 + Math.sin(autoAngle * 1.3) * 0.005 + od * 0.008 + hdLevel * 0.01) * ehQuiet;

      // Embers slow down while the scene contracts, then surge; HIGH adds small detail speed.
      var speedMul = (1 + s.energy * 1.2 + od * 0.8 + hdLevel * 1.5 + sLvl * 2 + f.detail * 0.6) * (1 - 0.6 * hdPre) * (1 - 0.8 * sPre);
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

      haloMat.opacity = 0.06 + Math.sin(autoAngle * 0.9) * 0.03 + od * 0.04 + hdLevel * 0.05 + sLvl * 0.05;
      halo2Mat.opacity = 0.03 + Math.sin(autoAngle * 0.7 + 1) * 0.015;
      halo.rotation.z += dt * 0.018 * (1 + od + 2 * hdLevel + 3 * sLvl) * freeze;
      halo2.rotation.z -= dt * 0.012 * (1 + od + 2 * hdLevel + 3 * sLvl) * freeze;
      labelEdition.material.opacity = 0.25 + Math.sin(autoAngle * 1.4) * 0.1;
      labelRelic.material.opacity = 0.2 + Math.sin(autoAngle * 1.1 + 2) * 0.08;
      labelSignal.material.opacity = 0.15 + Math.sin(autoAngle * 0.8 + 1) * 0.06;

      // CINEMA — exposure and fog breathe; the environment darkens and contracts before a big hit.
      renderer.toneMappingExposure = 0.95 + Math.sin(autoAngle * 0.7) * 0.06 + od * 0.06 + s.cinema * 0.05 + hdLevel * 0.1 - hdPre * 0.08 - sPre * 0.12 + sLvl * 0.08;
      scene.fog.density = baseFog + hdPre * 0.012 + sPre * 0.014 - hdLevel * 0.003 - sLvl * 0.004;

      // CAMERA SHOT ENGINE V3 — kinetic overlay on the shot pose.
      // PRESSURE: before a predicted beat/drop the camera eases back and the FOV opens slightly.
      // IMPACT: a short forward acceleration. SINGULARITY: back on precompression, velocity rising on
      // ignition, a hard push at impact, a second acceleration through BREAKTHROUGH, then RECOVERY.
      // Limits: FOV ±3°, roll ±1.5°; no random shake anywhere.
      if (sHit) {
        dollyK.impulse(5.5 * ms);
        lensSpring.impulse(-45 * ms);
        rollSpring.impulse((sg.id % 2 ? 1 : -1) * 0.26 * ms);
      } else if (hdHit) {
        dollyK.impulse(3.2 * ms);
        lensSpring.impulse(-38 * ms);
        rollSpring.impulse((hd.id % 2 ? 1 : -1) * 0.22 * ms);
      } else if (hit > 0 && barEdge && od > 0.5) {
        lensSpring.impulse(-9 * ms);
      }
      // The HYPERDRIVE pre-impact pullback lives in the dolly too, so its release is a push with mass,
      // never a one-frame jump.
      dollyAim = (od * 0.25 - 0.45 * hdPre - 0.55 * sPre + 0.9 * sIgn + 2.2 * sBrk - 0.08 * pressure) * ms;
      dollyK.step(dollyAim, dt);
      lensSpring.step((hdPre * 1.2 + sPre * 1.4) * ms, dt);
      rollSpring.step(0, dt);
      lens.fov = clamp(lensSpring.x, -3, 3);
      lens.roll = clamp(rollSpring.x, -0.026, 0.026);
      // ORBIT: mids swing a tiny lateral arc; pointer velocity adds inertia, never a direct follow.
      var auto = rig.mode === 'auto';
      if (ptrAcc !== 0 && dt > 0) {
        var pv = clamp(ptrAcc / dt, -4, 4);
        ptrAcc = 0;
        if (auto) latK.impulse(-0.006 * pv * ms);
        twistK.impulse(0.004 * pv * ms);
        ptrSpin = pv;
      } else ptrSpin *= Math.exp(-dt * 8);
      latK.step(auto ? (0.035 * f.torque * f.travel * Math.sin(Math.PI * beats / 2) * freeze + parallaxX * 0.08) * ms : 0, dt);
      parYK.step(auto ? -parallaxY * 0.22 : 0, dt);
    }

    // VELOCITY FIELD, reflection acceleration, temporal echo, tunnel and telemetry.
    // Runs after the camera is placed, so camera-relative velocity is exact for this frame.
    function kineticField(s, dt) {
      var sg = hub.singularity;
      var cp = camera.position;
      var cvx = 0, cvy = 0, cvz = 0;
      if (camPrevSet && dt > 0) { cvx = (cp.x - camPrevX) / dt; cvy = (cp.y - camPrevY) / dt; cvz = (cp.z - camPrevZ) / dt; }
      camPrevX = cp.x; camPrevY = cp.y; camPrevZ = cp.z; camPrevSet = true;
      var cl = Math.sqrt(cp.x * cp.x + cp.z * cp.z) || 1;
      var radial = depthK.v + 2 * scaleK.v;
      var rvx = cp.x / cl * radial, rvy = -0.12 * pedK.v, rvz = cp.z / cl * radial;
      var rx = rvx - cvx, ry = rvy - cvy, rz = rvz - cvz;
      // Stage travel and scrolling move the Receiver across the screen: feed that to the highlight stretch.
      var stx = 0, sty = 0;
      if (staged) {
        stx = follower.bodies.cx.v * 6;
        sty = -follower.bodies.cy.v * 6 + stageHub.scroll.velocity * 1.5;
      }
      // Relative velocity in view space (rotation part of the view matrix) for the shader.
      var e = camera.matrixWorldInverse.elements;
      var vx = e[0] * rx + e[4] * ry + e[8] * rz + stx;
      var vy = e[1] * rx + e[5] * ry + e[9] * rz + sty;
      var vz = e[2] * rx + e[6] * ry + e[10] * rz;
      var sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      var ang = Math.abs(headK.v) * 0.5 + Math.abs(twistK.v) * 2 + Math.abs(rollSpring.v) * 4 + Math.abs(ptrSpin) * 0.3;
      var echoTrig = sg && sg.hit ? 1 : (hdHitFrame ? 0.7 : 0);
      vf.update(vx, vy, vz, ang, s.energy, sp > 1e-4 ? Math.abs(vz) / sp : 0, echoTrig, dt);
      U.uVelView.value.set(vf.dirX, vf.dirY, vf.dirZ);
      U.uVelMag.value = vf.stretch * velDetail;
      U.uReflectDrive.value = vf.reflect;

      // REFLECTION ACCELERATION — metal answers the rate of change, not only energy: sharper and brighter
      // under acceleration, narrower during PRECOMPRESSION, and fast motion starts a short sweep.
      var sPre = sg ? sg.pre : 0;
      if (relicMatRef) {
        relicMatRef.roughness = baseRoughness * (1 - 0.22 * s.body * hub.overdriveMix) * (1 - 0.25 * vf.reflect) * (1 + 0.3 * sPre);
        relicMatRef.envMapIntensity = 0.55 * (1 + 0.8 * vf.reflect) * (1 - 0.35 * sPre);
        relicMatRef.emissiveIntensity = 0.008 + 0.02 * s.body * s.energy + 0.015 * hub.overdriveMix +
          0.02 * (hub.hyper && hub.hyper.active ? hub.hyper.level : 0) + 0.03 * (sg ? sg.level : 0);
      }
      var over = vf.reflect > 0.55;
      if (over && !reflectHigh && sweepCooldown <= 0) {
        sweepPos = -0.2; sweepActive = true; sweepCooldown = 1.2; sweepSpeed = 1.5 + 2.5 * vf.reflect;
      }
      reflectHigh = over;

      // TEMPORAL ECHO — history of the Receiver's displacement/scale and the camera position.
      var hb = histIdx * HSTRIDE;
      hist[hb] = modelRef ? modelRef.position.x - modelBase.x : 0;
      hist[hb + 1] = modelRef ? modelRef.position.y - modelBase.y : 0;
      hist[hb + 2] = modelRef ? modelRef.position.z - modelBase.z : 0;
      hist[hb + 3] = cp.x; hist[hb + 4] = cp.y; hist[hb + 5] = cp.z;
      hist[hb + 6] = 1 + scaleK.x;
      var echo = echoOn ? vf.echo : 0;
      if (echo > 0 && modelRef) modelRef.updateMatrixWorld();
      for (var g = 0; g < ghosts.length; g++) {
        var ghost = ghosts[g];
        var lag = GHOST_LAG[g % GHOST_LAG.length];
        if (echo <= 0 || histCount <= lag || !modelRef) { if (ghost.visible) ghost.visible = false; continue; }
        var ob = ((histIdx - lag + HIST) % HIST) * HSTRIDE;
        // Where the Receiver was, relative to where the camera was: exaggerated a little to stay readable.
        var ox = (hist[ob] - hist[hb]) * 2.2 + (cp.x - hist[ob + 3]) * 0.6;
        var oy = (hist[ob + 1] - hist[hb + 1]) * 2.2 + (cp.y - hist[ob + 4]) * 0.6;
        var oz = (hist[ob + 2] - hist[hb + 2]) * 2.2 + (cp.z - hist[ob + 5]) * 0.6;
        var r = 1 + (hist[ob + 6] / hist[hb + 6] - 1) * 2.2;
        var src = ghost.userData.source.matrixWorld.elements;
        var m = ghost.matrix.elements;
        var px = modelRef.position.x, py = modelRef.position.y, pz = modelRef.position.z;
        for (var k = 0; k < 12; k++) m[k] = k % 4 === 3 ? src[k] : src[k] * r;
        m[12] = px + (src[12] - px) * r + ox;
        m[13] = py + (src[13] - py) * r + oy;
        m[14] = pz + (src[14] - pz) * r + oz;
        m[15] = 1;
        ghost.matrixWorldNeedsUpdate = true;
        ghost.material.opacity = GHOST_OPACITY[g % GHOST_OPACITY.length] * echo;
        if (!ghost.visible) ghost.visible = true;
      }
      histIdx = (histIdx + 1) % HIST;
      if (histCount < HIST) histCount++;

      // BREAKTHROUGH TUNNEL — rings rush from behind the Receiver past the lens (+60..340 ms).
      var tt = sg && sg.active ? sg.t : -1;
      var tunnelLive = tunnelOn && tt > 0.06 && tt < 0.34;
      if (tunnelLive) FWD.set(0, 0, -1).applyQuaternion(camera.quaternion);
      for (var q = 0; q < tunnelRings.length; q++) {
        var ringT = tunnelRings[q];
        var ph = tunnelLive ? clamp((tt - 0.06 - q * 0.05) / 0.2, 0, 1) : 0;
        if (!tunnelLive || ph <= 0 || ph >= 1) { if (ringT.visible) ringT.visible = false; continue; }
        var dist = 7.5 - 7 * ease(ph);
        ringT.position.set(cp.x + FWD.x * dist, cp.y + FWD.y * dist, cp.z + FWD.z * dist);
        ringT.quaternion.copy(camera.quaternion);
        ringT.material.opacity = 0.16 * Math.sin(Math.PI * ph) * (1 - q * 0.22) * U.uIntensity.value;
        ringT.visible = true;
      }

      // Telemetry (read by the debug surface and the HUD).
      var kn = hub.kinetic;
      kn.accel = vf.accel;
      kn.jerk = vf.jerk;
      kn.cameraVelocity = Math.sqrt(cvx * cvx + cvy * cvy + cvz * cvz);
      kn.receiverVelocity = Math.sqrt(rvx * rvx + rvy * rvy + rvz * rvz);
      kn.reflectionDrive = vf.reflect;
      kn.echoLevel = echo;
      var hdPre = hub.hyper ? hub.hyper.pre : 0;
      kn.state = sg && sg.active ? 'SINGULARITY'
        : (sinceHit < 0.12 && hitStrength > 0.6 ? 'IMPACT'
        : (pressure > 0.25 || hdPre > 0.1 ? 'PRESSURE'
        : (vf.accel > 6 ? 'SURGE'
        : (Math.abs(dollyK.x - dollyAim) > 0.08 || Math.abs(depthK.v) > 0.05 ? 'RECOVERY' : 'REST'))));
    }

    function cameraShot() {
      if (rig.mode === 'user') return 'USER';
      var sg = hub.singularity;
      if (sg && sg.active) return sg.t < 0.7 ? 'SINGULARITY' : 'RECOVERY';
      if ((hub.hyper && hub.hyper.pre > 0.1) || pressure > 0.35) return 'PRESSURE';
      if (dollyK.v > 0.4) return 'IMPACT';
      if (dollyK.x - dollyAim > 0.1 && dollyK.v < 0) return 'RECOVERY';
      if (Math.abs(latK.v) > 0.015 && hub.forces.torque > 0.35) return 'ORBIT';
      return SHOT_NAMES[rig.shot];
    }

    // Moves the one canvas between the fixed stage layer and the relic band (fullscreen / LITE).
    function setStaged(on) {
      staged = on;
      if (on) {
        if (!stageLayer) {
          stageLayer = document.createElement('div');
          stageLayer.className = 'dmf-stage-layer dmf-stage-' + maskMode;
          stageLayer.setAttribute('aria-hidden', 'true');
          document.body.insertBefore(stageLayer, document.body.firstChild);
        }
        stageLayer.appendChild(renderer.domElement);
        band.classList.add('is-staged');
        shownStageOpacity = -1;
        // A page opened (or returned to) mid-scroll starts docked where it is, not flown in from the band.
        if (!stageStarted) { stageStarted = true; follower.reset(stage.target); }
      } else {
        container.appendChild(renderer.domElement);
        band.classList.remove('is-staged');
        for (var i = 0; i < PORTAL_MESHES.length; i++) PORTAL_MESHES[i].visible = false;
        if (stageLayer) stageLayer.style.opacity = '0';
        stageHub.portalIntensity = 0;
      }
      stageHub.spatialTier = on ? 'stage-' + quality : (fsActive ? 'fullscreen' : 'band');
      stageHub.originY = -1;
      governor.setMode(on ? 'stage' : 'band');
      var range = tierRange(quality);
      renderScaler.setRange(range[0], range[1]);
      renderScale = Math.min(window.devicePixelRatio || 1, renderScaler.scale);
      renderer.setPixelRatio(renderScale);
      hub.renderScale = renderScale;
      resizePending = true;
    }

    // The ACT's pose → a composition frame on screen. ARRIVAL locks it to the relic band (scroll-linked,
    // exact); docked ACTs place it in the viewport. w blends the two, so leaving the band is one
    // continuous, physically followed move. Only cached numbers are read here.
    function stageFrame(s, dt) {
      var tr = stage.transit;
      var sg = hub.singularity;
      var P = follower.update(stage.target, dt, tr, compactStage ? 0.6 : 1);
      stageActNow = stage.act;
      var sy = stageHub.scrollY;
      var bh = visH > 0 ? visH : vh * 0.7;
      var bx = visLeft + (visW > 0 ? visW : vw) * 0.5;
      var by = visTop - sy + bh * 0.5;
      var wgt = P.w;
      var fh = bh + (P.h * vh - bh) * wgt;
      var cxp = bx + (P.cx * vw - bx) * wgt;
      var cyp = by + (P.cy * vh - by) * wgt;
      frameAspect = visW > 0 && visH > 0 ? visW / visH : vw / vh;
      if (compactStage && frameAspect < 0.9) frameAspect = 0.9;
      var fw = fh * frameAspect;
      camera.aspect = fw / fh;
      camera.setViewOffset(fw, fh, fw * 0.5 - cxp, fh * 0.5 - cyp, vw, vh);
      stageHub.originY = cyp;
      // Presence: fades in (off screen) as the band approaches from below, then follows the ACT; it rises
      // only while the stage moves (TRANSIT, scrolling) and settles back to the ACT's quiet level.
      var approach = clamp((vh * 1.25 - (visTop - sy)) / (vh * 0.25), 0, 1);
      stageVisible = approach > 0;
      var lift = wgt > 0.05 ? 0.3 * tr.level + 0.25 * Math.abs(stageHub.scroll.velocity) : 0;
      var op = Math.min(P.opacity + lift, 1) * approach;
      // Mask: in ARRIVAL the stage shows only through the band (feathered); docking opens it to the page.
      var open = clamp(wgt, 0, 1);
      var mTop = (visTop - sy) * (1 - open) - vh * 0.3 * open;
      var mBot = (visTop - sy + bh) * (1 - open) + vh * 1.3 * open;
      if (Math.abs(mTop - shownMaskTop) > 1 || Math.abs(mBot - shownMaskBot) > 1) {
        shownMaskTop = mTop;
        shownMaskBot = mBot;
        stageLayer.style.setProperty('--dmf-stage-top', mTop.toFixed(0) + 'px');
        stageLayer.style.setProperty('--dmf-stage-bottom', mBot.toFixed(0) + 'px');
      }
      if (Math.abs(op - shownStageOpacity) > 0.004 || (op === 0 && shownStageOpacity !== 0)) {
        shownStageOpacity = op;
        stageLayer.style.opacity = op.toFixed(3);
      }
      stageMotion = clamp(follower.speed * 1.5, 0, 1);
      stageHub.cameraJourney = sg && sg.active ? 'singularity' : (tr.active ? 'transit' : (follower.speed > 0.02 ? 'travel' : 'hold'));
      stageHub.receiverStageDepth = P.depth;
      stageHub.spatialVelocity = follower.speed;
    }

    // Portal architecture: rings recede behind the Receiver, frames line the sides, floor lines mark depth.
    // KICK: floor propagation + structural compression; LOW: depth pressure; MID: lateral sway;
    // HIGH: a highlight travelling down the frames. Hidden outright when there is nothing to show.
    function updatePortal(s, dt) {
      var sg = hub.singularity;
      var f = hub.forces;
      portal.update(stageMotion, stageHub.scroll.velocity, stage.transit.level, sg && sg.active ? sg.level : 0, f, dt);
      var scale = staged ? portalScaleNow : 0;
      var inten = portal.intensity * scale * (hub.eventHorizon ? 1 - 0.6 * hub.eventHorizon.calm : 1);
      var floorGain = portal.floorAmp * Math.exp(-portal.floorT * 1.2) * scale;
      stageHub.portalIntensity = inten;
      if (inten < 0.002 && floorGain < 0.02) {
        if (portalRings.visible) for (var h0 = 0; h0 < PORTAL_MESHES.length; h0++) PORTAL_MESHES[h0].visible = false;
        return;
      }
      var amp = 0.6 + 0.4 * f.amp;
      var spacing = 2.2 * (1 + 0.15 * portal.pressure) * (1 - 0.1 * portal.compression);
      var rs = 1 - 0.06 * portal.compression;
      pQ.set(0, 0, 0, 1);
      for (var i = 0; i < portalRings.count; i++) {
        var depth = i / (RING_MAX - 1);
        pP.set(0, 1.5, -3 - i * spacing);
        pS.set(rs * (1 + 0.04 * i), rs * (1 + 0.04 * i), 1);
        pM.compose(pP, pQ, pS);
        portalRings.setMatrixAt(i, pM);
        var k = inten * amp * (0.9 - 0.6 * depth);
        portalRings.setColorAt(i, pC.setRGB(k, k, k));
      }
      var half = portalFrames.count >> 1;
      var sway = 0.25 * portal.lateral * Math.sin(Math.PI * (s.beatIndex + s.beatPhase) / 4) + 0.05 * clamp(ptrSpin, -4, 4);
      for (var j = 0; j < portalFrames.count; j++) {
        var side = j < half ? -1 : 1;
        var idx = j < half ? j : j - half;
        pE.set(0, side * Math.PI / 2, 0);
        pQ.setFromEuler(pE);
        pP.set(side * (4.4 + sway * side), 1.9, 1.5 - idx * 2.6 * (1 - 0.08 * portal.compression));
        pS.set(1, 1, 1);
        pM.compose(pP, pQ, pS);
        portalFrames.setMatrixAt(j, pM);
        var ph = portal.edgePhase - idx / Math.max(1, half);
        ph -= Math.floor(ph);
        var edge = Math.exp(-Math.pow((ph - 0.5) / 0.12, 2));
        var kf = inten * amp * (0.18 + 0.6 * edge) * (1 - 0.1 * idx);
        portalFrames.setColorAt(j, pC.setRGB(kf, kf, kf));
      }
      pQ.set(0, 0, 0, 1);
      pS.set(1 + 0.1 * portal.pressure, 1, 1);
      for (var l = 0; l < portalLines.count; l++) {
        var z = 4.5 - l * 1.25 * (LINE_MAX / Math.max(1, portalLines.count));
        pP.set(0, 0.012, z);
        pM.compose(pP, pQ, pS);
        portalLines.setMatrixAt(l, pM);
        var x = (portal.floorT * 7 - Math.abs(z)) / 0.8;
        var pulse = floorGain * Math.exp(-x * x);
        var kl = inten * amp * 0.45 + pulse * (0.12 + 0.88 * inten);
        portalLines.setColorAt(l, pC.setRGB(kl, kl, kl));
      }
      for (var m = 0; m < PORTAL_MESHES.length; m++) {
        var mesh = PORTAL_MESHES[m];
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.visible = mesh.count > 0;
      }
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
      var rox = staged ? -visLeft : 0, roy = staged ? -(visTop - stageHub.scrollY) : 0;
      readoutEl.style.left = ((projected.x * 0.5 + 0.5) * w + rox) + 'px';
      readoutEl.style.top = ((-projected.y * 0.5 + 0.5) * h + roy) + 'px';
      if (zones[zi].en !== currentZone) { currentZone = zones[zi].en; showReadout(zones[zi]); }
      if (!readoutEl.classList.contains('is-visible')) readoutEl.classList.add('is-visible');
      container.style.cursor = 'crosshair';
      hoverZone.last = zi;
      return zi;
    }
    hoverZone.last = -1;

    function tick(s, dt, raw) {
      var stageWanted = stageEligible && !fsActive && quality !== 'lite';
      if (stageWanted !== staged) setStaged(stageWanted);
      if (staged && stageHub.layout !== seenLayout) { seenLayout = stageHub.layout; resizePending = true; }
      if (resizePending) doResize();
      if (staged) stageFrame(s, dt);
      if (staged ? !stageVisible : (!isVisible && !fsActive)) return;
      frameCount++;
      var downgrade = governor.sample(raw);
      if (downgrade) applyQuality(downgrade);
      else if (renderScaler.sample(raw) !== null) applyPixelRatio();

      animateRelic(s, dt);
      rigUpdate(dt, performance.now());
      applyCamera(dollyK.x);
      camera.updateMatrixWorld();
      kineticField(s, dt);
      if (staged) updatePortal(s, dt);

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
      hub.cameraShot = cameraShot();
      var hdOn = !!(hub.hyper && hub.hyper.active);
      if (hdOn !== shownHd) { shownHd = hdOn; band.classList.toggle('is-hyperdrive', hdOn); }
      var sgOn = !!(hub.singularity && hub.singularity.active);
      if (sgOn !== shownSg) { shownSg = sgOn; band.classList.toggle('is-singularity', sgOn); }
      updateHud(s, performance.now());

      renderer.render(scene, camera);
      if (perf) {
        perf.drawCalls = renderer.info.render.calls;
        perf.triangles = renderer.info.render.triangles;
        perf.governorMode = governor.mode;
        perf.governorTier = governor.tier;
        perf.frameMs = governor.frameMs;
        perf.frameBudgetMs = governor.budget();
        perf.frameOverRatio = governor.overRatio;
        perf.governorPressure = governor.pressure;
        perf.stageMask = maskMode;
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDMFSignal, { once: true });
  else mountDMFSignal();
})();
