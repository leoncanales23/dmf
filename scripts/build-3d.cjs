const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourcePath = path.join(root, 'index.html');
const outputPath = path.join(root, 'public', 'index.html');

let html = fs.readFileSync(sourcePath, 'utf8');

const HEAD_MARKER = '<!-- DMF_MESHY_3D_HEAD -->';
const BODY_MARKER = '<!-- DMF_MESHY_3D_BODY -->';

const headInjection = `${HEAD_MARKER}
<style>
/* DMF RELIC — Collector Edition 01 */
.hero-img{isolation:isolate}
.hero-img-overlay{z-index:2}

.dmf-signal-band{position:relative;z-index:2;overflow:hidden;border-top:1px solid rgba(242,237,230,.08);border-bottom:1px solid rgba(242,237,230,.08);background:linear-gradient(180deg,#050404 0%,#080706 48%,#050404 100%)}
.dmf-signal-band::after{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.010) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(90deg,transparent,rgba(0,0,0,.9) 42%,rgba(0,0,0,.9));opacity:.25}
.dmf-signal-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(300px,.82fr) minmax(440px,1.18fr);min-height:clamp(420px,48vw,640px);max-width:1600px;margin:0 auto}
.dmf-signal-copy{position:relative;display:flex;flex-direction:column;justify-content:center;padding:clamp(54px,7vw,96px) clamp(24px,5vw,72px);border-right:1px solid rgba(242,237,230,.05)}
.dmf-signal-kicker{display:flex;align-items:center;gap:14px;margin-bottom:18px;font-size:9px;font-weight:700;letter-spacing:.32em;text-transform:uppercase;color:#ff5b1e}
.dmf-signal-kicker::before{content:'';width:38px;height:1px;background:#ff5b1e;box-shadow:0 0 10px rgba(255,91,30,.55)}
.dmf-signal-title{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(44px,6.5vw,100px);line-height:.88;letter-spacing:.005em;text-transform:uppercase;max-width:10ch;color:#f2ede6;text-wrap:balance}
.dmf-signal-subtitle{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(14px,1.6vw,20px);letter-spacing:.12em;text-transform:uppercase;color:rgba(255,91,30,.55);margin-top:6px}
.dmf-signal-lede{max-width:540px;margin-top:22px;font-size:clamp(13px,1.15vw,16px);line-height:1.72;color:#b8afa5;text-wrap:pretty}

.dmf-relic-card{margin-top:24px;padding:16px 18px;border:1px solid rgba(255,91,30,.12);background:rgba(255,91,30,.02);max-width:320px}
.dmf-relic-card-title{font-size:8px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#ff5b1e;margin-bottom:10px}
.dmf-relic-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(242,237,230,.04);font-size:11px;letter-spacing:.04em}
.dmf-relic-row:last-child{border-bottom:none}
.dmf-relic-label{color:#665f58;text-transform:uppercase;font-size:9px;letter-spacing:.12em}
.dmf-relic-value{color:#d9a18c;font-weight:600}

.dmf-signal-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
.dmf-signal-chip{display:inline-flex;align-items:center;min-height:28px;padding:0 11px;border:1px solid rgba(255,91,30,.22);background:rgba(255,91,30,.035);font-size:8px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#d9a18c}
.dmf-signal-actions{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-top:28px}
.dmf-signal-cta{display:inline-flex;align-items:center;gap:14px;padding:14px 20px;border:1px solid #ff5b1e;background:rgba(255,91,30,.06);font-family:'Anton',sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#ff7a45;text-decoration:none;transition:background .25s,color .25s,transform .25s,box-shadow .25s}
.dmf-signal-cta:hover{background:#ff5b1e;color:#0a0806;transform:translateY(-2px);box-shadow:0 12px 34px rgba(255,91,30,.18)}
.dmf-signal-cta--secondary{border-color:rgba(255,91,30,.25);background:transparent;color:#a08070}
.dmf-signal-cta--secondary:hover{background:rgba(255,91,30,.08);color:#ff7a45;border-color:#ff5b1e}
.dmf-signal-cta--tertiary{border-color:rgba(242,237,230,.08);background:transparent;color:#4a443e;cursor:default;gap:8px}
.dmf-signal-cta--tertiary:hover{background:transparent;color:#4a443e;transform:none;box-shadow:none}
.dmf-signal-chip-inline{font-size:7px;padding:2px 6px;border:1px solid rgba(255,91,30,.18);color:#665f58;letter-spacing:.14em}
.dmf-signal-hint{font-size:9px;letter-spacing:.17em;text-transform:uppercase;color:#665f58}

.dmf-signal-visual{position:relative;min-height:clamp(420px,48vw,640px);overflow:hidden;background:#040303}
.dmf-signal-visual canvas{display:block;width:100%!important;height:100%!important;position:absolute;inset:0}
.dmf-signal-visual::after{content:'';position:absolute;z-index:3;inset:0;pointer-events:none;background:linear-gradient(90deg,#050404 0%,rgba(5,4,4,.55) 8%,transparent 28%,transparent 84%,rgba(5,4,4,.25) 100%),linear-gradient(180deg,rgba(5,4,4,.30),transparent 16%,transparent 80%,rgba(5,4,4,.50));box-shadow:inset 0 0 100px rgba(0,0,0,.5)}
.dmf-signal-scan{position:absolute;z-index:4;left:8%;right:8%;top:18%;height:1px;background:linear-gradient(90deg,transparent,#ff5b1e 28%,rgba(255,91,30,.15) 65%,transparent);box-shadow:0 0 18px rgba(255,91,30,.45),0 0 40px rgba(255,91,30,.15);opacity:.22;animation:dmfSignalScan 7s ease-in-out infinite;pointer-events:none}
.dmf-signal-scan2{position:absolute;z-index:4;left:12%;right:12%;top:65%;height:1px;background:linear-gradient(90deg,transparent,rgba(85,119,187,.6) 40%,rgba(85,119,187,.1) 70%,transparent);box-shadow:0 0 12px rgba(85,119,187,.35);opacity:.14;animation:dmfSignalScan2 11s ease-in-out infinite;pointer-events:none}
.dmf-signal-vignette{position:absolute;z-index:3;inset:0;pointer-events:none;background:radial-gradient(ellipse 65% 55% at 50% 50%,transparent 35%,rgba(4,3,3,.7) 100%)}
.dmf-signal-corner{position:absolute;z-index:5;right:clamp(18px,3vw,38px);top:clamp(18px,3vw,32px);display:flex;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none}
.dmf-signal-corner strong{font-family:'Anton',sans-serif;font-size:11px;font-weight:400;letter-spacing:.18em;color:#ff5b1e}
.dmf-signal-corner span{font-size:7px;letter-spacing:.22em;text-transform:uppercase;color:#6f665f}
.dmf-signal-loader{position:absolute;z-index:6;left:18%;right:18%;bottom:14%;height:1px;overflow:hidden;background:rgba(242,237,230,.06)}
.dmf-signal-loader::after{content:'';display:block;width:34%;height:100%;background:#ff5b1e;box-shadow:0 0 14px rgba(255,91,30,.65);animation:dmfSignalLoad 1.55s ease-in-out infinite}
.dmf-signal-band.is-ready .dmf-signal-loader{opacity:0;transition:opacity .35s}
.dmf-signal-fallback{position:absolute;z-index:1;inset:0;display:grid;place-items:center;font-family:'Anton',sans-serif;font-size:clamp(38px,7vw,88px);letter-spacing:.05em;text-transform:uppercase;color:rgba(242,237,230,.04)}
.dmf-signal-edition-tag{position:absolute;z-index:5;left:clamp(18px,3vw,38px);bottom:clamp(18px,3vw,32px);pointer-events:none;font-size:7px;letter-spacing:.22em;text-transform:uppercase;color:#4a443e}

.dmf-relic-readout{position:absolute;z-index:10;pointer-events:none;padding:6px 14px;border-left:2px solid #ff5b1e;background:rgba(4,3,3,.88);transform:translate(18px,-50%);opacity:0;transition:opacity .25s,transform .25s}
.dmf-relic-readout.is-visible{opacity:1;transform:translate(14px,-50%)}
.dmf-relic-readout-component{font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#ff5b1e;white-space:nowrap}
.dmf-relic-readout-status{font-size:7px;letter-spacing:.15em;text-transform:uppercase;color:#665f58;margin-top:2px;white-space:nowrap}
.dmf-relic-readout-lore{font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#8b7d70;margin-top:3px;white-space:nowrap;font-style:italic;opacity:.85}

.dmf-relic-state{font-size:7px;letter-spacing:.22em;text-transform:uppercase;color:#4a443e;transition:color .4s,text-shadow .4s}
.dmf-relic-state.is-awakened{color:#d9a18c}
.dmf-relic-state.is-transmitting{color:#ff5b1e;text-shadow:0 0 10px rgba(255,91,30,.4)}
.dmf-relic-state-pct{display:block;font-size:6px;letter-spacing:.18em;color:rgba(255,91,30,.5);margin-top:2px;opacity:0;transition:opacity .3s}
.dmf-relic-state.is-transmitting .dmf-relic-state-pct{opacity:1}

.dmf-signal-visual.is-fullscreen{position:fixed!important;inset:0;z-index:9999;min-height:100vh!important;background:#040303}
.dmf-signal-visual.is-fullscreen .dmf-signal-corner{right:24px;top:24px}
.dmf-signal-visual.is-fullscreen .dmf-signal-edition-tag{left:24px;bottom:24px}
.dmf-signal-fullscreen-close{position:absolute;z-index:10001;top:20px;left:20px;width:36px;height:36px;border:1px solid rgba(255,91,30,.3);background:rgba(4,3,3,.8);color:#ff5b1e;font-size:16px;cursor:pointer;display:none;place-items:center;font-family:'Archivo',sans-serif;transition:background .2s,border-color .2s}
.dmf-signal-fullscreen-close:hover{background:rgba(255,91,30,.12);border-color:#ff5b1e}
.dmf-signal-visual.is-fullscreen .dmf-signal-fullscreen-close{display:grid}

@keyframes dmfSignalLoad{0%{transform:translateX(-120%)}100%{transform:translateX(400%)}}
@keyframes dmfSignalScan{0%,100%{transform:translateY(0);opacity:.12}50%{transform:translateY(clamp(150px,26vw,330px));opacity:.28}}
@keyframes dmfSignalScan2{0%,100%{transform:translateY(0);opacity:.08}50%{transform:translateY(clamp(-100px,-18vw,-220px));opacity:.18}}

@media(max-width:900px){
  .dmf-signal-shell{grid-template-columns:1fr;min-height:auto}
  .dmf-signal-copy{border-right:none;border-bottom:1px solid rgba(242,237,230,.05);padding-bottom:44px}
  .dmf-signal-title{max-width:12ch;font-size:clamp(48px,13vw,80px)}
  .dmf-signal-visual{min-height:460px}
  .dmf-relic-card{max-width:100%}
}
@media(max-width:560px){
  .dmf-signal-copy{padding:44px 20px 34px}
  .dmf-signal-lede{font-size:13px}
  .dmf-signal-visual{min-height:380px}
  .dmf-signal-corner{right:14px;top:14px}
  .dmf-signal-hint{display:none}
  .dmf-signal-edition-tag{left:14px;bottom:14px}
}
@media(prefers-reduced-motion:reduce){
  .dmf-signal-scan,.dmf-signal-scan2,.dmf-signal-loader::after{animation:none}
}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  function mountDMFSignal(){
    var hero = document.querySelector('header.hero');
    if(!hero || document.querySelector('.dmf-signal-band')) return;

    var band = document.createElement('section');
    band.className = 'dmf-signal-band';
    band.setAttribute('aria-label','DMF RELIC Collector Edition 01');
    band.innerHTML = [
      '<div class="dmf-signal-shell">',
        '<div class="dmf-signal-copy">',
          '<div class="dmf-signal-kicker" data-dmf-en="DMF // RELIC SERIES" data-dmf-es="DMF // SERIE RELIC">DMF // RELIC SERIES</div>',
          '<h2 class="dmf-signal-title" data-dmf-en="The Receiver" data-dmf-es="El Receptor">The Receiver</h2>',
          '<div class="dmf-signal-subtitle" data-dmf-en="Collector Edition 01" data-dmf-es="Edici\\u00f3n de Colecci\\u00f3n 01">Collector Edition 01</div>',
          '<p class="dmf-signal-lede" data-dmf-en="The first terrestrial keeper of the formula. A digital relic from the DMF universe, preserved as a collectible and prepared for 3D print." data-dmf-es="El primer guardi\\u00e1n terrestre de la f\\u00f3rmula. Una reliquia digital del universo DMF, preservada como pieza de colecci\\u00f3n y preparada para impresi\\u00f3n 3D.">The first terrestrial keeper of the formula. A digital relic from the DMF universe, preserved as a collectible and prepared for 3D print.</p>',
          '<div class="dmf-relic-card">',
            '<div class="dmf-relic-card-title" data-dmf-en="Edition Record" data-dmf-es="Registro de Edici\\u00f3n">Edition Record</div>',
            '<div class="dmf-relic-row"><span class="dmf-relic-label">Series</span><span class="dmf-relic-value">Relic Series</span></div>',
            '<div class="dmf-relic-row"><span class="dmf-relic-label" data-dmf-en="Edition" data-dmf-es="Edici\\u00f3n">Edition</span><span class="dmf-relic-value">01</span></div>',
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
            '<a class="dmf-signal-cta dmf-signal-view3d" href="javascript:void(0)" role="button"><span data-dmf-en="View Relic" data-dmf-es="Ver Reliquia">View Relic</span><span aria-hidden="true"> \\u2192</span></a>',
            '<a class="dmf-signal-cta dmf-signal-cta--secondary" href="assets/models/dmf-studio-optimized.glb" download><span data-dmf-en="Download Digital Relic" data-dmf-es="Descargar Reliquia Digital">Download Digital Relic</span></a>',
            '<a class="dmf-signal-cta dmf-signal-cta--tertiary" href="assets/models/DMF_RELIC_01.3mf" download><span data-dmf-en="3D Print Master" data-dmf-es="Modelo Impresi\\u00f3n 3D">3D Print Master</span></a>',
          '</div>',
          '<span class="dmf-signal-hint" data-dmf-en="Interactive \\u00b7 drag to orbit" data-dmf-es="Interactivo \\u00b7 arrastra para rotar">Interactive \\u00b7 drag to orbit</span>',
        '</div>',
        '<div class="dmf-signal-visual">',
          '<div class="dmf-signal-fallback" aria-hidden="true">RELIC</div>',
          '<div class="dmf-signal-loader" aria-hidden="true"></div>',
          '<div class="dmf-signal-scan" aria-hidden="true"></div>',
          '<div class="dmf-signal-scan2" aria-hidden="true"></div>',
          '<div class="dmf-signal-vignette" aria-hidden="true"></div>',
          '<div class="dmf-signal-corner" aria-hidden="true"><strong>DMF / RELIC 01</strong><span data-dmf-en="Signal Sculpture" data-dmf-es="Escultura Se\\u00f1al">Signal Sculpture</span><span class="dmf-relic-state">DORMANT</span></div>',
          '<div class="dmf-signal-edition-tag" aria-hidden="true" data-dmf-en="Collector Artifact \\u00b7 DMF Universe" data-dmf-es="Artefacto Coleccionable \\u00b7 Universo DMF">Collector Artifact \\u00b7 DMF Universe</div>',
          '<div class="dmf-relic-readout" aria-hidden="true"><div class="dmf-relic-readout-component"></div><div class="dmf-relic-readout-status"></div><div class="dmf-relic-readout-lore"></div></div>',
          '<button class="dmf-signal-fullscreen-close" aria-label="Close" type="button">\\u2715</button>',
        '</div>',
      '</div>'
    ].join('');

    hero.insertAdjacentElement('afterend', band);

    function syncSignalLanguage(){
      var btn = document.querySelector('.lang-btn');
      var current = btn && btn.textContent.trim().toUpperCase() === 'EN' ? 'en' : 'es';
      band.querySelectorAll('[data-dmf-en]').forEach(function(el){
        el.textContent = current === 'es' ? el.getAttribute('data-dmf-es') : el.getAttribute('data-dmf-en');
      });
    }
    syncSignalLanguage();

    var langBtn = document.querySelector('.lang-btn');
    if(langBtn && 'MutationObserver' in window){
      new MutationObserver(syncSignalLanguage).observe(langBtn,{childList:true,subtree:true,characterData:true});
    }

    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var constrained = connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''));
    if(constrained) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var visual = band.querySelector('.dmf-signal-visual');

    var threeScript = document.createElement('script');
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    threeScript.onload = function(){
      var loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
      loaderScript.onload = function(){ initScene(visual, band, reduceMotion); };
      loaderScript.onerror = function(){};
      document.head.appendChild(loaderScript);
    };
    threeScript.onerror = function(){};
    document.head.appendChild(threeScript);
  }

  function initScene(container, band, reduceMotion){
    var THREE = window.THREE;
    if(!THREE || !THREE.GLTFLoader) return;

    var w = container.clientWidth;
    var h = container.clientHeight;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040303);
    scene.fog = new THREE.FogExp2(0x040303, 0.011);

    var camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(4, 2.8, 5);
    camera.lookAt(0, 0.9, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // === QUALITY TIER — adaptive performance ===
    var isMobile = w < 768 || ('ontouchstart' in window);
    var isLowEnd = isMobile && w < 480;
    var quality = isLowEnd ? 'static' : (isMobile ? 'balanced' : 'high');
    if(quality === 'balanced'){
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else if(quality === 'static'){
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1);
    }

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
    var floorGeo = new THREE.PlaneGeometry(30, 30);
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x060504, roughness: 0.92, metalness: 0.05 });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    var gridSize = 16;
    var gridDiv = 32;
    var gridHelper = new THREE.GridHelper(gridSize, gridDiv, 0xff5b1e, 0x110f0c);
    gridHelper.position.y = 0.005;
    gridHelper.material.opacity = 0.08;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // === PEDESTAL — collector base ===
    var pedestalGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.12, 8);
    var pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a08,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0xff5b1e,
      emissiveIntensity: 0.015
    });
    var pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.06;
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    scene.add(pedestal);

    var pedestalRimGeo = new THREE.TorusGeometry(2.3, 0.02, 8, 64);
    var pedestalRimMat = new THREE.MeshBasicMaterial({
      color: 0xff5b1e,
      transparent: true,
      opacity: 0.25
    });
    var pedestalRim = new THREE.Mesh(pedestalRimGeo, pedestalRimMat);
    pedestalRim.rotation.x = -Math.PI / 2;
    pedestalRim.position.y = 0.13;
    scene.add(pedestalRim);

    // === PEDESTAL INSCRIPTION ===
    var inscCanvas = document.createElement('canvas');
    inscCanvas.width = 512; inscCanvas.height = 64;
    var inscCtx = inscCanvas.getContext('2d');
    inscCtx.fillStyle = 'rgba(0,0,0,0)';
    inscCtx.fillRect(0, 0, 512, 64);
    inscCtx.font = '600 18px Arial';
    inscCtx.textAlign = 'center';
    inscCtx.textBaseline = 'middle';
    inscCtx.fillStyle = 'rgba(255,91,30,0.25)';
    inscCtx.fillText('DMF RELIC \\u00b7 EDITION 01 \\u00b7 THE RECEIVER', 256, 32);
    var inscTex = new THREE.CanvasTexture(inscCanvas);
    var inscGeo = new THREE.PlaneGeometry(4.2, 0.35);
    var inscMat = new THREE.MeshBasicMaterial({
      map: inscTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var inscription = new THREE.Mesh(inscGeo, inscMat);
    inscription.rotation.x = -Math.PI / 2;
    inscription.position.set(0, 0.131, 2.5);
    scene.add(inscription);

    // === HALO — back glow ring ===
    var haloGeo = new THREE.TorusGeometry(3.0, 0.04, 16, 64);
    var haloMat = new THREE.MeshBasicMaterial({
      color: 0xff5b1e,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(0, 2.2, -2);
    halo.rotation.y = 0.3;
    scene.add(halo);

    var halo2Geo = new THREE.TorusGeometry(3.6, 0.02, 16, 64);
    var halo2Mat = haloMat.clone();
    halo2Mat.opacity = 0.04;
    var halo2 = new THREE.Mesh(halo2Geo, halo2Mat);
    halo2.position.set(0, 2.2, -2.2);
    halo2.rotation.y = -0.2;
    scene.add(halo2);

    // === VOLUMETRIC LIGHT CONE ===
    var coneH = 8;
    var coneR = 2.8;
    var coneGeo = new THREE.ConeGeometry(coneR, coneH, 32, 1, true);
    var coneMat = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.015,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(4, 7 - coneH / 2, 5);
    cone.lookAt(0, 1, 0);
    cone.rotateX(Math.PI);
    scene.add(cone);

    // === EMBER PARTICLES ===
    var particleCount = quality === 'high' ? 160 : quality === 'balanced' ? 80 : 30;
    var pPositions = new Float32Array(particleCount * 3);
    var pSizes = new Float32Array(particleCount);
    var pSpeeds = new Float32Array(particleCount);
    var pPhases = new Float32Array(particleCount);

    for(var i = 0; i < particleCount; i++){
      pPositions[i*3]   = (Math.random() - 0.5) * 10;
      pPositions[i*3+1] = Math.random() * 6;
      pPositions[i*3+2] = (Math.random() - 0.5) * 10;
      pSizes[i] = 1.5 + Math.random() * 3;
      pSpeeds[i] = 0.002 + Math.random() * 0.006;
      pPhases[i] = Math.random() * Math.PI * 2;
    }

    var pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeom.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    var pCanvas = document.createElement('canvas');
    pCanvas.width = 32; pCanvas.height = 32;
    var pCtx = pCanvas.getContext('2d');
    var grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,91,30,1)');
    grad.addColorStop(0.3, 'rgba(255,91,30,0.5)');
    grad.addColorStop(1, 'rgba(255,91,30,0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 32, 32);
    var pTex = new THREE.CanvasTexture(pCanvas);

    var pMat = new THREE.PointsMaterial({
      map: pTex,
      size: 0.07,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    var particles = new THREE.Points(pGeom, pMat);
    scene.add(particles);

    // === GROUND RINGS ===
    var ringGeo = new THREE.RingGeometry(2.8, 3.0, 64);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0xff5b1e,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.14;
    scene.add(ring);

    var ring2Geo = new THREE.RingGeometry(4.5, 4.65, 64);
    var ring2Mat = ringMat.clone();
    ring2Mat.opacity = 0.025;
    var ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.01;
    scene.add(ring2);

    // === LIVE SET — procedural performance on the static mesh (GLB has no rig) ===
    // Anchors are raw GLB object-space coordinates: DJ head/neck, monitor cones.
    var RELIC_BPM = 124;
    var liveBeatTime = 0;
    var relicMotion = {
      uKick: {value: 0}, uNod: {value: 0}, uSway: {value: 0},
      uBounce: {value: 0}, uBeatIndex: {value: 0}, uLive: {value: 0}
    };
    var RELIC_CONES = [
      [-0.644, -0.064, -0.405], [0.652, -0.050, -0.395],
      [-0.630, -0.270, -0.040], [-0.620, -0.400, 0.165],
      [0.624, -0.280, -0.038], [0.624, -0.400, 0.173]
    ];
    var RELIC_MOTION_GLSL =
      'uniform float uKick;\\nuniform float uNod;\\nuniform float uSway;\\nuniform float uBounce;\\nuniform float uLive;\\nvarying vec3 vObjPos;\\n' +
      'vec3 relicMotion(vec3 p, vec3 n){\\n' +
      '  float hw = 1.0 - smoothstep(0.12, 0.19, distance(p, vec3(0.305, 0.24, -0.2)));\\n' +
      '  float a = uNod * uLive * hw;\\n' +
      '  vec3 piv = vec3(0.305, 0.12, -0.21);\\n' +
      '  vec3 r = p - piv;\\n' +
      '  vec3 o = piv + vec3(r.x, r.y * cos(a) - r.z * sin(a), r.y * sin(a) + r.z * cos(a));\\n' +
      '  float bw = max(hw, 1.0 - smoothstep(0.7, 1.0, length((p - vec3(0.31, 0.02, -0.24)) / vec3(0.26, 0.26, 0.18))));\\n' +
      '  o += vec3(uSway, -uBounce, 0.0) * bw * uLive;\\n' +
      '  float cw = 0.0;\\n' +
      RELIC_CONES.map(function(c){
        return '  cw += 1.0 - smoothstep(0.03, 0.07, distance(p, vec3(' + c.join(', ') + ')));\\n';
      }).join('') +
      '  o += n * min(cw, 1.0) * uKick * 0.018 * uLive;\\n' +
      '  return o;\\n' +
      '}\\n';

    function injectRelicMotion(shader){
      shader.uniforms.uKick = relicMotion.uKick;
      shader.uniforms.uNod = relicMotion.uNod;
      shader.uniforms.uSway = relicMotion.uSway;
      shader.uniforms.uBounce = relicMotion.uBounce;
      shader.uniforms.uLive = relicMotion.uLive;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\\n' + RELIC_MOTION_GLSL)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\\ntransformed = relicMotion(position, normal);\\nvObjPos = position;');
    }

    // === LOAD MODEL — RELIC Material Pass: zone-based painting ===
    var modelRef = null;
    var modelTargetScale = 0;
    var modelCurrentScale = 0;
    var entranceAngle = 0;
    var wireRef = null;
    var edgeRef = null;
    var relicShaderRef = null;
    var modelWorldMinY = 0;
    var modelWorldMaxY = 3;
    var modelWorldMinX = -2;
    var modelWorldMaxX = 2;
    var modelWorldMinZ = -2;
    var modelWorldMaxZ = 2;

    var loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/dmf-studio-optimized.glb',
      function(gltf){
        var model = gltf.scene;
        modelRef = model;

        var box = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var s = 4.0 / maxDim;
        modelTargetScale = s;
        model.scale.setScalar(0.01);
        model.position.set(-center.x * s, -box.min.y * s + 0.13, -center.z * s);

        modelWorldMinY = 0.13;
        modelWorldMaxY = 0.13 + size.y * s;
        var halfXW = size.x * s / 2;
        var halfZW = size.z * s / 2;
        modelWorldMinX = -halfXW;
        modelWorldMaxX = halfXW;
        modelWorldMinZ = -halfZW;
        modelWorldMaxZ = halfZW;

        model.traverse(function(child){
          if(child.isMesh && child.geometry){
            var geo = child.geometry;
            if(!geo.attributes.normal) geo.computeVertexNormals();

            var posArr = geo.attributes.position.array;
            var vCount = posArr.length / 3;
            var yMin = Infinity, yMax = -Infinity;
            for(var vi = 0; vi < vCount; vi++){
              var vy = posArr[vi * 3 + 1];
              if(vy < yMin) yMin = vy;
              if(vy > yMax) yMax = vy;
            }
            var yRange = yMax - yMin || 1;

            var xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
            for(var vi = 0; vi < vCount; vi++){
              var vx = posArr[vi * 3], vz = posArr[vi * 3 + 2];
              if(vx < xMin) xMin = vx; if(vx > xMax) xMax = vx;
              if(vz < zMin) zMin = vz; if(vz > zMax) zMax = vz;
            }
            var xRange = xMax - xMin || 1;
            var zRange = zMax - zMin || 1;

            var zoneColors = [
              [0.55, 0.48, 0.44],
              [0.68, 0.62, 0.56],
              [0.72, 0.70, 0.78],
              [0.82, 0.78, 0.80]
            ];

            var colors = new Float32Array(posArr.length);
            var vZoneIdx = new Uint8Array(vCount);
            for(var vi = 0; vi < vCount; vi++){
              var ny = (posArr[vi * 3 + 1] - yMin) / yRange;
              var nx = (posArr[vi * 3] - xMin) / xRange;
              var nz = (posArr[vi * 3 + 2] - zMin) / zRange;
              var dist = Math.sqrt((posArr[vi*3]) * (posArr[vi*3]) + (posArr[vi*3+2]) * (posArr[vi*3+2]));

              var zIdx = 3;
              if(ny < 0.20){ zIdx = 0; }
              else if(ny < 0.45){ zIdx = 1; }
              else if(ny < 0.70){
                var dx2 = Math.abs(nx - 0.5), dz2 = Math.abs(nz - 0.5);
                zIdx = (dx2 > 0.38 || dz2 > 0.38) ? 1 : 2;
              } else { zIdx = 3; }
              vZoneIdx[vi] = zIdx;

              var zc = zoneColors[zIdx];
              var cr = zc[0], cg = zc[1], cb = zc[2];

              var bn1 = 1.0 - Math.min(1.0, Math.abs(ny - 0.20) / 0.025);
              var bn2 = 1.0 - Math.min(1.0, Math.abs(ny - 0.45) / 0.025);
              var bn3 = 1.0 - Math.min(1.0, Math.abs(ny - 0.70) / 0.025);
              var bnMax = Math.max(bn1, bn2, bn3);
              cr = Math.min(1.0, cr + bnMax * 0.12);
              cg = Math.min(1.0, cg + bnMax * 0.04);
              cb = Math.min(1.0, cb + bnMax * 0.02);

              var ef = Math.max(0, dist - 0.35) / 0.55;
              ef = Math.min(1, ef) * 0.04;
              cr = Math.min(1.0, cr + ef * 0.8);
              cg = Math.min(1.0, cg + ef * 0.2);

              colors[vi * 3] = cr;
              colors[vi * 3 + 1] = cg;
              colors[vi * 3 + 2] = cb;
            }

            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            var zoneIdArr = new Float32Array(vCount);
            var normYArr = new Float32Array(vCount);
            for(var ai = 0; ai < vCount; ai++){
              zoneIdArr[ai] = vZoneIdx[ai];
              normYArr[ai] = (posArr[ai * 3 + 1] - yMin) / yRange;
            }
            geo.setAttribute('aZoneId', new THREE.BufferAttribute(zoneIdArr, 1));
            geo.setAttribute('aNormY', new THREE.BufferAttribute(normYArr, 1));

            var relicMat = child.material.clone();
            relicMat.vertexColors = true;
            relicMat.emissive = new THREE.Color(0xff5b1e);
            relicMat.emissiveIntensity = 0.008;
            relicMat.envMapIntensity = 0.55;
            relicMat.onBeforeCompile = function(shader){
              shader.uniforms.uActiveZone = {value: -1.0};
              shader.uniforms.uTime = {value: 0.0};
              shader.uniforms.uIntensity = {value: quality === 'balanced' ? 0.7 : 1.0};
              injectRelicMotion(shader);
              shader.uniforms.uBeatIndex = relicMotion.uBeatIndex;
              shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                '#include <common>\\nattribute float aZoneId;\\nattribute float aNormY;\\nvarying float vZoneId;\\nvarying float vNormY;'
              );
              shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\\nvZoneId = aZoneId;\\nvNormY = aNormY;'
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                '#include <common>\\nuniform float uActiveZone;\\nuniform float uTime;\\nuniform float uIntensity;\\nvarying float vZoneId;\\nvarying float vNormY;\\n' +
                'uniform float uKick;\\nuniform float uLive;\\nuniform float uBeatIndex;\\nvarying vec3 vObjPos;\\n' +
                'float relicHash(float n){ return fract(sin(n) * 43758.5453); }'
              );
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <tonemapping_fragment>',
                'float logoMask = step(-0.57, vObjPos.z) * step(vObjPos.z, -0.5) *\\n' +
                '  step(-0.31, vObjPos.x) * step(vObjPos.x, 0.31) * step(0.1, vObjPos.y) * step(vObjPos.y, 0.56) *\\n' +
                '  smoothstep(0.08, 0.22, diffuseColor.r - diffuseColor.b) * uLive;\\n' +
                'if(logoMask > 0.0){\\n' +
                '  float col = vObjPos.x < -0.235 ? 0.0 : (vObjPos.x < -0.16 ? 1.0 : (vObjPos.x < 0.15 ? 2.0 : (vObjPos.x < 0.215 ? 3.0 : 4.0)));\\n' +
                '  float lvl = 0.25 + 0.75 * relicHash(col * 12.9898 + uBeatIndex * 78.233);\\n' +
                '  float ly = (vObjPos.y - 0.12) / 0.4;\\n' +
                '  float eq = col == 2.0 ? 1.0 : 1.0 - smoothstep(lvl - 0.04, lvl + 0.04, ly);\\n' +
                '  gl_FragColor.rgb += vec3(1.0, 0.36, 0.08) * eq * (0.2 + 0.8 * uKick) * logoMask * 0.9 * uIntensity;\\n' +
                '}\\n' +
                'if(uActiveZone >= 0.0){\\n' +
                '  float zId = floor(vZoneId + 0.5);\\n' +
                '  float aZ = floor(uActiveZone + 0.5);\\n' +
                '  vec3 zCol;\\n' +
                '  if(aZ < 0.5) zCol = vec3(1.0, 0.35, 0.06);\\n' +
                '  else if(aZ < 1.5) zCol = vec3(0.85, 0.45, 0.12);\\n' +
                '  else if(aZ < 2.5) zCol = vec3(0.12, 0.55, 0.95);\\n' +
                '  else zCol = vec3(1.0, 0.38, 0.0);\\n' +
                '  if(zId == aZ){\\n' +
                '    float pulse = 0.5 + 0.5 * sin(uTime * 3.5 + vNormY * 18.0);\\n' +
                '    gl_FragColor.rgb += zCol * pulse * 0.12 * uIntensity;\\n' +
                '  }\\n' +
                '  if(aZ > 2.5){\\n' +
                '    float wf = fract(uTime * 4.5);\\n' +
                '    float wp = 1.0 - wf;\\n' +
                '    float wd = abs(vNormY - wp);\\n' +
                '    float wave = smoothstep(0.12, 0.0, wd);\\n' +
                '    gl_FragColor.rgb += vec3(1.0, 0.35, 0.06) * wave * 0.2 * uIntensity;\\n' +
                '  }\\n' +
                '}\\n' +
                '#include <tonemapping_fragment>'
              );
              relicShaderRef = shader;
            };
            relicMat.needsUpdate = true;
            child.material = relicMat;
            child.castShadow = true;
            child.receiveShadow = true;

            var wireMat = new THREE.MeshBasicMaterial({
              color: 0x4488cc,
              wireframe: true,
              transparent: true,
              opacity: 0.025,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            });
            wireMat.onBeforeCompile = injectRelicMotion;
            wireRef = new THREE.Mesh(geo, wireMat);
            child.parent.add(wireRef);

            var edgeMat = new THREE.MeshBasicMaterial({
              color: 0xff5b1e,
              side: THREE.BackSide,
              transparent: true,
              opacity: 0.04,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            });
            edgeMat.onBeforeCompile = injectRelicMotion;
            edgeRef = new THREE.Mesh(geo, edgeMat);
            edgeRef.scale.setScalar(1.022);
            child.parent.add(edgeRef);
          }
        });

        scene.add(model);
        band.classList.add('is-ready');

        if(reduceMotion || quality === 'static'){
          model.scale.setScalar(s);
          renderer.render(scene, camera);
          return;
        }
        startAnimation();
      },
      undefined,
      function(){ band.classList.add('is-ready'); }
    );

    // === CANVAS LABELS — floating edition tags ===
    function makeLabel(text, fontSize, color){
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      ctx.font = (fontSize || 24) + 'px Arial';
      var metrics = ctx.measureText(text);
      c.width = Math.ceil(metrics.width) + 20;
      c.height = (fontSize || 24) + 16;
      ctx.font = (fontSize || 24) + 'px Arial';
      ctx.fillStyle = color || 'rgba(255,91,30,0.4)';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 10, c.height / 2);
      var tex = new THREE.CanvasTexture(c);
      var spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      return new THREE.Sprite(spriteMat);
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

    // === CAMERA & INTERACTION ===
    var mouseX = 0, mouseY = 0;
    var mouseNDCx = 0, mouseNDCy = 0;
    var currentRotY = 0, currentRotX = 0;
    var autoAngle = 0;
    var baseRadius = Math.sqrt(4*4 + 5*5);
    var baseY = 2.8;
    var clock = new THREE.Clock();

    var raycaster = new THREE.Raycaster();
    var currentZone = '';
    var relicState = 'dormant';
    var lastStatePct = -1;
    var readoutEl = container.querySelector('.dmf-relic-readout');
    var readoutComp = readoutEl.querySelector('.dmf-relic-readout-component');
    var readoutStatus = readoutEl.querySelector('.dmf-relic-readout-status');
    var readoutLore = readoutEl.querySelector('.dmf-relic-readout-lore');
    var stateEl = container.querySelector('.dmf-relic-state');

    var zones = [
      {test: function(nx,ny,nz){ return ny < 0.20; }, en: 'RELIC COMPONENT // PLATFORM BASE', es: 'COMPONENTE RELIC // BASE DE PLATAFORMA', statusEn: 'SIGNAL PATH ACTIVE', statusEs: 'RUTA DE SE\\u00d1AL ACTIVA', loreEn: 'Earthside anchor \\u2014 terrestrial grounding node', loreEs: 'Anclaje terrestre \\u2014 nodo de conexi\\u00f3n'},
      {test: function(nx,ny,nz){ return ny < 0.45 || (ny < 0.70 && (Math.abs(nx-0.5)>0.38 || Math.abs(nz-0.5)>0.38)); }, en: 'RELIC COMPONENT // CORE FRAME', es: 'COMPONENTE RELIC // ESTRUCTURA CENTRAL', statusEn: 'ARCHIVE NODE 03', statusEs: 'NODO DE ARCHIVO 03', loreEn: 'Formula preservation unit \\u2014 primary containment', loreEs: 'Unidad de preservaci\\u00f3n \\u2014 contenci\\u00f3n primaria'},
      {test: function(nx,ny,nz){ return ny < 0.70; }, en: 'RELIC COMPONENT // SIGNAL CONSOLE', es: 'COMPONENTE RELIC // CONSOLA DE SE\\u00d1AL', statusEn: 'RECEIVING FREQUENCY', statusEs: 'FRECUENCIA DE RECEPCI\\u00d3N', loreEn: 'Terrestrial decoding interface \\u2014 signal processing', loreEs: 'Interfaz de decodificaci\\u00f3n terrestre'},
      {test: function(){ return true; }, en: 'RELIC COMPONENT // RECEIVER ARRAY', es: 'COMPONENTE RELIC // MATRIZ RECEPTORA', statusEn: 'TRANSMISSION ACTIVE', statusEs: 'TRANSMISI\\u00d3N ACTIVA', loreEn: 'Transmission channel \\u2014 formula acquisition array', loreEs: 'Canal de transmisi\\u00f3n \\u2014 adquisici\\u00f3n de f\\u00f3rmula'}
    ];

    function getZone(point){
      var nx = (point.x - modelWorldMinX) / (modelWorldMaxX - modelWorldMinX);
      var ny = (point.y - modelWorldMinY) / (modelWorldMaxY - modelWorldMinY);
      var nz = (point.z - modelWorldMinZ) / (modelWorldMaxZ - modelWorldMinZ);
      nx = Math.max(0, Math.min(1, nx));
      ny = Math.max(0, Math.min(1, ny));
      nz = Math.max(0, Math.min(1, nz));
      for(var zi = 0; zi < zones.length; zi++){
        if(zones[zi].test(nx, ny, nz)) return zones[zi];
      }
      return zones[zones.length - 1];
    }

    function getLang(){
      var btn = document.querySelector('.lang-btn');
      return btn && btn.textContent.trim().toUpperCase() === 'EN' ? 'en' : 'es';
    }

    function renderRelicState(pct){
      var lang = getLang();
      stateEl.classList.remove('is-awakened', 'is-transmitting');
      if(relicState === 'dormant'){
        stateEl.textContent = lang === 'es' ? 'INACTIVO' : 'DORMANT';
      } else if(relicState === 'awakened'){
        stateEl.classList.add('is-awakened');
        stateEl.textContent = lang === 'es' ? 'SE\\u00d1AL DETECTADA' : 'SIGNAL DETECTED';
      } else {
        stateEl.classList.add('is-transmitting');
        stateEl.innerHTML = (lang === 'es' ? 'TRANSMISI\\u00d3N' : 'TRANSMITTING') +
          '<span class="dmf-relic-state-pct">' +
          (lang === 'es' ? 'TRANSFERENCIA ' : 'FORMULA TRANSFER ') + pct + '%</span>';
      }
    }

    var langBtn2 = document.querySelector('.lang-btn');
    if(langBtn2 && 'MutationObserver' in window){
      new MutationObserver(function(){ renderRelicState(lastStatePct < 0 ? 0 : lastStatePct); }).observe(langBtn2,{childList:true,subtree:true,characterData:true});
    }

    function showReadout(zone){
      var lang = getLang();
      readoutComp.textContent = lang === 'es' ? zone.es : zone.en;
      readoutStatus.textContent = lang === 'es' ? zone.statusEs : zone.statusEn;
      readoutLore.textContent = lang === 'es' ? zone.loreEs : zone.loreEn;
    }

    function hideReadout(){
      readoutEl.classList.remove('is-visible');
      currentZone = '';
    }

    container.addEventListener('mousemove', function(e){
      var rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseNDCx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDCy = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    container.addEventListener('mouseleave', function(){
      mouseX = 0; mouseY = 0;
      hideReadout();
    });

    // === FULLSCREEN VIEW ===
    var closeBtn = container.querySelector('.dmf-signal-fullscreen-close');
    var viewBtn = band.querySelector('.dmf-signal-view3d');

    function enterFullscreen(){
      container.classList.add('is-fullscreen');
      onResize();
      if(container.requestFullscreen) container.requestFullscreen().catch(function(){});
    }

    function exitFullscreen(){
      container.classList.remove('is-fullscreen');
      if(document.fullscreenElement) document.exitFullscreen().catch(function(){});
      onResize();
    }

    if(viewBtn) viewBtn.addEventListener('click', function(e){
      e.preventDefault();
      enterFullscreen();
    });

    if(closeBtn) closeBtn.addEventListener('click', exitFullscreen);

    document.addEventListener('fullscreenchange', function(){
      if(!document.fullscreenElement) container.classList.remove('is-fullscreen');
      onResize();
    });

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && container.classList.contains('is-fullscreen')){
        exitFullscreen();
      }
    });

    var isVisible = true;
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        isVisible = entries[0].isIntersecting;
      }, {threshold: 0.08});
      io.observe(band);
    }

    function onResize(){
      w = container.clientWidth;
      h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    function startAnimation(){
      function animate(){
        requestAnimationFrame(animate);
        var dt = Math.min(clock.getDelta(), 0.05);
        if(!isVisible) return;
        autoAngle += dt * 0.072;

        // Live set — beat clock drives head nod, body groove, cone pump, logo EQ
        liveBeatTime += dt;
        var beats = liveBeatTime * RELIC_BPM / 60;
        var beatPhase = beats - Math.floor(beats);
        var kick = Math.exp(-beatPhase * 7);
        var nodCurve = 0.5 + 0.5 * Math.cos(2 * Math.PI * (beatPhase - 0.12));
        relicMotion.uKick.value = kick;
        relicMotion.uNod.value = 0.13 * nodCurve * nodCurve;
        relicMotion.uSway.value = 0.006 * Math.sin(Math.PI * beats);
        relicMotion.uBounce.value = 0.005 * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * beatPhase), 3);
        relicMotion.uBeatIndex.value = Math.floor(beats) % 64;
        relicMotion.uLive.value = modelTargetScale > 0 ? modelCurrentScale / modelTargetScale : 0;

        // Model entrance
        if(modelRef && modelCurrentScale < modelTargetScale){
          modelCurrentScale += (modelTargetScale - modelCurrentScale) * 0.03;
          if(modelTargetScale - modelCurrentScale < 0.001) modelCurrentScale = modelTargetScale;
          modelRef.scale.setScalar(modelCurrentScale);
          entranceAngle += 0.02;
          modelRef.rotation.y = Math.sin(entranceAngle) * 0.12 * (1 - modelCurrentScale / modelTargetScale);
        }

        // Camera orbit
        var targetRotY = Math.sin(autoAngle) * 0.5 + mouseX * 0.3;
        var targetRotX = mouseY * 0.15;
        currentRotY += (targetRotY - currentRotY) * 0.02;
        currentRotX += (targetRotX - currentRotX) * 0.02;

        var orbitAngle = 0.68 + currentRotY * 0.3;
        camera.position.x = baseRadius * Math.sin(orbitAngle);
        camera.position.y = baseY + currentRotX * 0.4 + Math.sin(autoAngle * 0.8) * 0.12;
        camera.position.z = baseRadius * Math.cos(orbitAngle);
        camera.lookAt(0, 1.1 + Math.sin(autoAngle * 0.6) * 0.04, 0);

        // Dynamic lighting — museum breathing
        rimLight.intensity = 0.8 + Math.sin(autoAngle * 2.0) * 0.2 + kick * 0.25;
        accentLight.intensity = 0.25 + Math.sin(autoAngle * 1.5 + 1) * 0.12;
        fillLight.intensity = 0.3 + Math.sin(autoAngle * 1.0 + 2) * 0.06;
        underGlow.intensity = 0.15 + Math.sin(autoAngle * 2.8) * 0.08 + kick * 0.3;
        haloLight.intensity = 0.12 + Math.sin(autoAngle * 1.3) * 0.06;

        var hShift = Math.sin(autoAngle * 0.4) * 0.04;
        screenGlow.color.setHSL(0.62 + hShift, 0.45, 0.35);

        // Volumetric cone
        coneMat.opacity = 0.012 + Math.sin(autoAngle * 1.3) * 0.005;

        // Embers
        var pos = pGeom.attributes.position.array;
        for(var i = 0; i < particleCount; i++){
          pos[i*3+1] += pSpeeds[i];
          pos[i*3]   += Math.sin(autoAngle * 1.8 + pPhases[i]) * 0.0015;
          pos[i*3+2] += Math.cos(autoAngle * 1.3 + pPhases[i]) * 0.0015;
          if(pos[i*3+1] > 6){
            pos[i*3+1] = -0.5;
            pos[i*3]   = (Math.random() - 0.5) * 10;
            pos[i*3+2] = (Math.random() - 0.5) * 10;
          }
        }
        pGeom.attributes.position.needsUpdate = true;
        pMat.opacity = 0.4 + Math.sin(autoAngle * 1.6) * 0.12;

        // Rings
        var ringPulse = 1 + Math.sin(autoAngle * 1.8) * 0.06 + kick * 0.035;
        ring.scale.set(ringPulse, ringPulse, 1);
        ringMat.opacity = 0.035 + Math.sin(autoAngle * 1.8) * 0.02 + kick * 0.05;

        var ring2Pulse = 1 + Math.sin(autoAngle * 1.1 + 1) * 0.05;
        ring2.scale.set(ring2Pulse, ring2Pulse, 1);
        ring2Mat.opacity = 0.018 + Math.sin(autoAngle * 1.1 + 1) * 0.012;

        // Pedestal rim glow
        pedestalRimMat.opacity = 0.2 + Math.sin(autoAngle * 2.2) * 0.08 + kick * 0.15;

        // Halo breathing
        haloMat.opacity = 0.06 + Math.sin(autoAngle * 0.9) * 0.03;
        halo2Mat.opacity = 0.03 + Math.sin(autoAngle * 0.7 + 1) * 0.015;
        halo.rotation.z += 0.0003;
        halo2.rotation.z -= 0.0002;

        // Label opacity pulse
        labelEdition.material.opacity = 0.25 + Math.sin(autoAngle * 1.4) * 0.1;
        labelRelic.material.opacity = 0.2 + Math.sin(autoAngle * 1.1 + 2) * 0.08;
        labelSignal.material.opacity = 0.15 + Math.sin(autoAngle * 0.8 + 1) * 0.06;

        // Grid
        gridHelper.material.opacity = 0.06 + Math.sin(autoAngle * 1.0) * 0.03;

        // Pedestal emissive pulse
        pedestalMat.emissiveIntensity = 0.012 + Math.sin(autoAngle * 2.5) * 0.008;

        // Wireframe + edge breathing (base)
        var wireBaseOp = 0.02 + Math.sin(autoAngle * 1.2) * 0.01;
        var edgeBaseOp = 0.035 + Math.sin(autoAngle * 1.8) * 0.015;

        // Hover raycasting — cursor-following readout
        var activeZoneIdx = -1;
        if(modelRef && mouseNDCx !== 0 && mouseNDCy !== 0){
          raycaster.setFromCamera({x: mouseNDCx, y: mouseNDCy}, camera);
          var hits = raycaster.intersectObject(modelRef, true);
          if(hits.length > 0){
            var hit = hits[0];
            var zone = getZone(hit.point);
            var zoneKey = zone.en;
            var projected = hit.point.clone().project(camera);
            var sx = (projected.x * 0.5 + 0.5) * w;
            var sy = (-projected.y * 0.5 + 0.5) * h;
            readoutEl.style.left = sx + 'px';
            readoutEl.style.top = sy + 'px';
            if(zoneKey !== currentZone){
              currentZone = zoneKey;
              showReadout(zone);
            }
            if(!readoutEl.classList.contains('is-visible')){
              readoutEl.classList.add('is-visible');
            }
            container.style.cursor = 'crosshair';
            for(var zi = 0; zi < zones.length; zi++){
              if(zones[zi].en === zoneKey){ activeZoneIdx = zi; break; }
            }
          } else {
            if(currentZone){ hideReadout(); }
            container.style.cursor = '';
          }
        }

        // GPU reactive anatomy — shader uniform updates (2 uniforms vs ~105K vertices/frame)
        var wireZoneColors = [0x886633, 0xcc8844, 0x44ddff, 0xff6633];
        if(relicShaderRef){
          relicShaderRef.uniforms.uActiveZone.value = activeZoneIdx;
          relicShaderRef.uniforms.uTime.value = autoAngle;
        }
        if(activeZoneIdx >= 0){
          if(wireRef){
            wireRef.material.color.setHex(wireZoneColors[activeZoneIdx]);
            wireBaseOp = 0.055 + Math.sin(autoAngle * 2.5) * 0.02;
          }
          if(edgeRef){
            edgeRef.material.color.setHex(wireZoneColors[activeZoneIdx]);
            edgeBaseOp = 0.06 + Math.sin(autoAngle * 2.0) * 0.02;
          }
        } else {
          if(wireRef) wireRef.material.color.setHex(0x4488cc);
          if(edgeRef) edgeRef.material.color.setHex(0xff5b1e);
        }
        if(wireRef) wireRef.material.opacity = wireBaseOp;
        if(edgeRef) edgeRef.material.opacity = edgeBaseOp;

        // Relic signal state — DORMANT / AWAKENED / TRANSMITTING
        var newState;
        if(activeZoneIdx === 3) newState = 'transmitting';
        else if(activeZoneIdx >= 0) newState = 'awakened';
        else newState = 'dormant';
        if(newState !== relicState){
          relicState = newState;
          lastStatePct = -1;
          renderRelicState(0);
        }
        if(relicState === 'transmitting'){
          var wPct = Math.floor(((autoAngle * 4.5) % 1.0) * 100);
          if(wPct !== lastStatePct){
            lastStatePct = wPct;
            renderRelicState(wPct);
          }
        }

        // Tone mapping
        renderer.toneMappingExposure = 0.95 + Math.sin(autoAngle * 0.7) * 0.06;

        renderer.render(scene, camera);
      }
      animate();
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDMFSignal, {once:true});
  else mountDMFSignal();
})();
</script>`;

if (!html.includes(HEAD_MARKER)) {
  if (!html.includes('</head>')) throw new Error('DMF 3D build: </head> not found');
  html = html.replace('</head>', `${headInjection}\n</head>`);
}

if (!html.includes(BODY_MARKER)) {
  if (!html.includes('</body>')) throw new Error('DMF 3D build: </body> not found');
  html = html.replace('</body>', `${bodyInjection}\n</body>`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`DMF 3D build ready: ${path.relative(root, outputPath)}`);
