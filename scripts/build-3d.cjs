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
/* DMF Signal Band — Meshy 3D studio model */
.hero-img{isolation:isolate}
.hero-img-overlay{z-index:2}

.dmf-signal-band{position:relative;z-index:2;overflow:hidden;border-top:1px solid rgba(242,237,230,.08);border-bottom:1px solid rgba(242,237,230,.08);background:linear-gradient(180deg,#080706 0%,#0b0806 48%,#080706 100%)}
.dmf-signal-band::after{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.017) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(90deg,transparent,rgba(0,0,0,.9) 42%,rgba(0,0,0,.9));opacity:.32}
.dmf-signal-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(300px,.82fr) minmax(440px,1.18fr);min-height:clamp(390px,45vw,590px);max-width:1600px;margin:0 auto}
.dmf-signal-copy{position:relative;display:flex;flex-direction:column;justify-content:center;padding:clamp(54px,7vw,96px) clamp(24px,5vw,72px);border-right:1px solid rgba(242,237,230,.07)}
.dmf-signal-kicker{display:flex;align-items:center;gap:14px;margin-bottom:22px;font-size:10px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#ff5b1e}
.dmf-signal-kicker::before{content:'';width:38px;height:1px;background:#ff5b1e;box-shadow:0 0 10px rgba(255,91,30,.55)}
.dmf-signal-title{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(48px,7.2vw,112px);line-height:.88;letter-spacing:.005em;text-transform:uppercase;max-width:7ch;color:#f2ede6;text-wrap:balance}
.dmf-signal-lede{max-width:540px;margin-top:26px;font-size:clamp(14px,1.25vw,17px);line-height:1.72;color:#b8afa5;text-wrap:pretty}
.dmf-signal-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.dmf-signal-chip{display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border:1px solid rgba(255,91,30,.28);background:rgba(255,91,30,.045);font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#d9a18c}
.dmf-signal-actions{display:flex;align-items:center;flex-wrap:wrap;gap:18px;margin-top:34px}
.dmf-signal-cta{display:inline-flex;align-items:center;gap:14px;padding:15px 22px;border:1px solid #ff5b1e;background:rgba(255,91,30,.06);font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#ff7a45;text-decoration:none;transition:background .25s,color .25s,transform .25s,box-shadow .25s}
.dmf-signal-cta:hover{background:#ff5b1e;color:#0a0806;transform:translateY(-2px);box-shadow:0 12px 34px rgba(255,91,30,.18)}
.dmf-signal-hint{font-size:9px;letter-spacing:.17em;text-transform:uppercase;color:#665f58}

.dmf-signal-visual{position:relative;min-height:clamp(390px,45vw,590px);overflow:hidden;background:#060504}
.dmf-signal-visual canvas{display:block;width:100%!important;height:100%!important;position:absolute;inset:0}
.dmf-signal-visual::after{content:'';position:absolute;z-index:3;inset:0;pointer-events:none;background:linear-gradient(90deg,#080706 0%,rgba(8,7,6,.55) 8%,transparent 28%,transparent 84%,rgba(8,7,6,.25) 100%),linear-gradient(180deg,rgba(8,7,6,.30),transparent 16%,transparent 80%,rgba(8,7,6,.50));box-shadow:inset 0 0 100px rgba(0,0,0,.4)}
.dmf-signal-scan{position:absolute;z-index:4;left:8%;right:8%;top:18%;height:1px;background:linear-gradient(90deg,transparent,#ff5b1e 28%,rgba(255,91,30,.15) 65%,transparent);box-shadow:0 0 18px rgba(255,91,30,.45);opacity:.28;animation:dmfSignalScan 7s ease-in-out infinite;pointer-events:none}
.dmf-signal-corner{position:absolute;z-index:5;right:clamp(18px,3vw,38px);top:clamp(18px,3vw,32px);display:flex;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none}
.dmf-signal-corner strong{font-family:'Anton',sans-serif;font-size:12px;font-weight:400;letter-spacing:.16em;color:#ff5b1e}
.dmf-signal-corner span{font-size:8px;letter-spacing:.19em;text-transform:uppercase;color:#6f665f}
.dmf-signal-loader{position:absolute;z-index:6;left:18%;right:18%;bottom:14%;height:1px;overflow:hidden;background:rgba(242,237,230,.06)}
.dmf-signal-loader::after{content:'';display:block;width:34%;height:100%;background:#ff5b1e;box-shadow:0 0 14px rgba(255,91,30,.65);animation:dmfSignalLoad 1.55s ease-in-out infinite}
.dmf-signal-band.is-ready .dmf-signal-loader{opacity:0;transition:opacity .35s}
.dmf-signal-fallback{position:absolute;z-index:1;inset:0;display:grid;place-items:center;font-family:'Anton',sans-serif;font-size:clamp(38px,7vw,88px);letter-spacing:.05em;text-transform:uppercase;color:rgba(242,237,230,.055)}

@keyframes dmfSignalLoad{0%{transform:translateX(-120%)}100%{transform:translateX(400%)}}
@keyframes dmfSignalScan{0%,100%{transform:translateY(0);opacity:.15}50%{transform:translateY(clamp(150px,26vw,330px));opacity:.32}}

@media(max-width:900px){
  .dmf-signal-shell{grid-template-columns:1fr;min-height:auto}
  .dmf-signal-copy{border-right:none;border-bottom:1px solid rgba(242,237,230,.07);padding-bottom:44px}
  .dmf-signal-title{max-width:9ch;font-size:clamp(52px,15vw,92px)}
  .dmf-signal-visual{min-height:430px}
}
@media(max-width:560px){
  .dmf-signal-copy{padding:48px 20px 38px}
  .dmf-signal-lede{font-size:14px}
  .dmf-signal-visual{min-height:350px}
  .dmf-signal-corner{right:16px;top:16px}
  .dmf-signal-hint{display:none}
}
@media(prefers-reduced-motion:reduce){
  .dmf-signal-scan,.dmf-signal-loader::after{animation:none}
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
    band.setAttribute('aria-label','DMF interactive 3D studio study');
    band.innerHTML = [
      '<div class="dmf-signal-shell">',
        '<div class="dmf-signal-copy">',
          '<div class="dmf-signal-kicker" data-dmf-en="DMF // SIGNAL 01" data-dmf-es="DMF // SEÑAL 01">DMF // SIGNAL 01</div>',
          '<h2 class="dmf-signal-title" data-dmf-en="Sound becomes form" data-dmf-es="El sonido toma forma">Sound becomes form</h2>',
          '<p class="dmf-signal-lede" data-dmf-en="The original Meshy 3D studio — Demian\\u2019s creative space captured as a real-time digital sculpture. Every detail from the reference, rendered live." data-dmf-es="El estudio 3D original de Meshy — el espacio creativo de Demian capturado como escultura digital en tiempo real. Cada detalle de la referencia, renderizado en vivo.">The original Meshy 3D studio — Demian\\u2019s creative space captured as a real-time digital sculpture. Every detail from the reference, rendered live.</p>',
          '<div class="dmf-signal-meta">',
            '<span class="dmf-signal-chip" data-dmf-en="Meshy 3D" data-dmf-es="Meshy 3D">Meshy 3D</span>',
            '<span class="dmf-signal-chip" data-dmf-en="Real-time" data-dmf-es="Tiempo real">Real-time</span>',
            '<span class="dmf-signal-chip" data-dmf-en="PBR textured" data-dmf-es="Textura PBR">PBR textured</span>',
          '</div>',
          '<div class="dmf-signal-actions">',
            '<a class="dmf-signal-cta" href="#academy"><span data-dmf-en="Explore the methodology" data-dmf-es="Explorar la metodología">Explore the methodology</span><span aria-hidden="true"> \\u2192</span></a>',
            '<span class="dmf-signal-hint" data-dmf-en="Interactive \\u00b7 drag to orbit" data-dmf-es="Interactivo \\u00b7 arrastra para rotar">Interactive \\u00b7 drag to orbit</span>',
          '</div>',
        '</div>',
        '<div class="dmf-signal-visual">',
          '<div class="dmf-signal-fallback" aria-hidden="true">DMF</div>',
          '<div class="dmf-signal-loader" aria-hidden="true"></div>',
          '<div class="dmf-signal-scan" aria-hidden="true"></div>',
          '<div class="dmf-signal-corner" aria-hidden="true"><strong>STUDIO / 3D</strong><span>DMF visual system</span></div>',
        '</div>',
      '</div>'
    ].join('');

    hero.insertAdjacentElement('afterend', band);

    function syncSignalLanguage(){
      var btn = document.querySelector('.lang-btn');
      var current = btn && btn.textContent.trim().toUpperCase() === 'EN' ? 'es' : 'en';
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
    scene.background = new THREE.Color(0x060504);
    scene.fog = new THREE.FogExp2(0x060504, 0.012);

    var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(4, 2.5, 5);
    camera.lookAt(0, 0.8, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Lighting: warm key + cool fill + orange accent
    var ambientLight = new THREE.AmbientLight(0x1a1612, 0.5);
    scene.add(ambientLight);

    var keyLight = new THREE.SpotLight(0xffa866, 2.0, 20, Math.PI / 5, 0.5, 1.5);
    keyLight.position.set(4, 6, 5);
    keyLight.target.position.set(0, 1, 0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.002;
    scene.add(keyLight);
    scene.add(keyLight.target);

    var fillLight = new THREE.PointLight(0x3355aa, 0.4, 14);
    fillLight.position.set(-5, 3, 3);
    scene.add(fillLight);

    var rimLight = new THREE.PointLight(0xff5b1e, 0.7, 12);
    rimLight.position.set(-3, 5, -4);
    scene.add(rimLight);

    var screenGlow = new THREE.PointLight(0x5577bb, 0.35, 5);
    screenGlow.position.set(0, 2.5, 0);
    scene.add(screenGlow);

    var accentLight = new THREE.PointLight(0xff5b1e, 0.3, 8);
    accentLight.position.set(4, 0.5, -2);
    scene.add(accentLight);

    // Floor for shadows
    var floorGeo = new THREE.PlaneGeometry(30, 30);
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 0.95, metalness: 0.02 });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Load the model
    var loader = new THREE.GLTFLoader();
    loader.load(
      'assets/models/dmf-studio-optimized.glb',
      function(gltf){
        var model = gltf.scene;

        // Center and scale model
        var box = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var scale = 4.0 / maxDim;
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

        model.traverse(function(child){
          if(child.isMesh){
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(model);
        band.classList.add('is-ready');

        if(reduceMotion){
          renderer.render(scene, camera);
          return;
        }
        startAnimation();
      },
      undefined,
      function(){ band.classList.add('is-ready'); }
    );

    // Camera interaction
    var mouseX = 0, mouseY = 0;
    var currentRotY = 0, currentRotX = 0;
    var autoAngle = 0;
    var baseRadius = Math.sqrt(4*4 + 5*5);
    var baseY = 2.5;

    container.addEventListener('mousemove', function(e){
      var rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
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
        if(!isVisible) return;

        autoAngle += 0.0012;

        var targetRotY = Math.sin(autoAngle) * 0.5 + mouseX * 0.25;
        var targetRotX = mouseY * 0.12;

        currentRotY += (targetRotY - currentRotY) * 0.02;
        currentRotX += (targetRotX - currentRotX) * 0.02;

        var orbitAngle = 0.68 + currentRotY * 0.3;
        camera.position.x = baseRadius * Math.sin(orbitAngle);
        camera.position.y = baseY + currentRotX * 0.4 + Math.sin(autoAngle * 1.1) * 0.1;
        camera.position.z = baseRadius * Math.cos(orbitAngle);
        camera.lookAt(0, 1.0, 0);

        rimLight.intensity = 0.6 + Math.sin(autoAngle * 2.3) * 0.15;
        accentLight.intensity = 0.25 + Math.sin(autoAngle * 1.7 + 1) * 0.1;

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
