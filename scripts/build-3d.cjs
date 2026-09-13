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
/* DMF Signal Band — Three.js procedural studio */
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
.dmf-signal-fallback{position:absolute;z-index:1;inset:0;display:grid;place-items:center;font-family:'Anton',sans-serif;font-size:clamp(38px,7vw,88px);letter-spacing:.05em;text-transform:uppercase;color:rgba(242,237,230,.055)}

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
  .dmf-signal-scan{animation:none}
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
          '<p class="dmf-signal-lede" data-dmf-en="A procedural 3D scene built from code — the DMF studio reimagined as a real-time digital sculpture. Dark atmosphere, warm light, electronic form." data-dmf-es="Una escena 3D procedural construida desde código — el estudio DMF reimaginado como escultura digital en tiempo real. Atmósfera oscura, luz cálida, forma electrónica.">A procedural 3D scene built from code — the DMF studio reimagined as a real-time digital sculpture. Dark atmosphere, warm light, electronic form.</p>',
          '<div class="dmf-signal-meta">',
            '<span class="dmf-signal-chip" data-dmf-en="Procedural 3D" data-dmf-es="3D procedural">Procedural 3D</span>',
            '<span class="dmf-signal-chip" data-dmf-en="Real-time" data-dmf-es="Tiempo real">Real-time</span>',
            '<span class="dmf-signal-chip" data-dmf-en="Code-built" data-dmf-es="Hecho en código">Code-built</span>',
          '</div>',
          '<div class="dmf-signal-actions">',
            '<a class="dmf-signal-cta" href="#academy"><span data-dmf-en="Explore the methodology" data-dmf-es="Explorar la metodología">Explore the methodology</span><span aria-hidden="true"> →</span></a>',
            '<span class="dmf-signal-hint" data-dmf-en="Interactive · auto-animates" data-dmf-es="Interactivo · animación automática">Interactive · auto-animates</span>',
          '</div>',
        '</div>',
        '<div class="dmf-signal-visual">',
          '<div class="dmf-signal-fallback" aria-hidden="true">DMF</div>',
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

    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = function(){ initScene(visual, band, reduceMotion); };
    script.onerror = function(){};
    document.head.appendChild(script);
  }

  function initScene(container, band, reduceMotion){
    var THREE = window.THREE;
    if(!THREE) return;

    var w = container.clientWidth;
    var h = container.clientHeight;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060504);
    scene.fog = new THREE.FogExp2(0x060504, 0.018);

    var camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(5.5, 3.2, 7);
    camera.lookAt(0, 1, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    container.appendChild(renderer.domElement);

    var matDark = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.85, metalness: 0.1 });
    var matMetal = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.3, metalness: 0.85 });
    var matOrange = new THREE.MeshStandardMaterial({ color: 0xff5b1e, roughness: 0.4, metalness: 0.6, emissive: 0xff5b1e, emissiveIntensity: 0.15 });
    var matScreen = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.2, metalness: 0.4, emissive: 0x1a2030, emissiveIntensity: 0.3 });
    var matWarm = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.7, metalness: 0.2 });
    var matGlow = new THREE.MeshStandardMaterial({ color: 0xff5b1e, emissive: 0xff5b1e, emissiveIntensity: 0.8, roughness: 0.5, metalness: 0.3 });

    // Floor
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x0e0c0a, roughness: 0.9, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    var wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshStandardMaterial({ color: 0x12100d, roughness: 0.92, metalness: 0.05 }));
    wall.position.set(0, 4, -4);
    wall.receiveShadow = true;
    scene.add(wall);

    // Desk
    var deskTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 2), matDark);
    deskTop.position.set(0, 1.6, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    scene.add(deskTop);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 1.8), matDark);
    legL.position.set(-2.5, 0.8, 0);
    scene.add(legL);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 1.8), matDark);
    legR.position.set(2.5, 0.8, 0);
    scene.add(legR);

    // Center monitor
    var monitorBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 16), matMetal);
    monitorBase.position.set(0, 1.67, -0.3);
    scene.add(monitorBase);
    var monitorArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), matMetal);
    monitorArm.position.set(0, 2.2, -0.5);
    scene.add(monitorArm);
    var monScreen = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 0.05), matScreen);
    monScreen.position.set(0, 2.85, -0.6);
    monScreen.castShadow = true;
    scene.add(monScreen);
    var monFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.25, 0.03), matMetal);
    monFrame.position.set(0, 2.85, -0.62);
    scene.add(monFrame);

    // Side monitors (angled)
    [-1, 1].forEach(function(side){
      var sm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.04), matScreen);
      sm.position.set(side * 1.85, 2.6, -0.4);
      sm.rotation.y = side * -0.35;
      sm.castShadow = true;
      scene.add(sm);
      var sf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.03), matMetal);
      sf.position.set(side * 1.85, 2.6, -0.42);
      sf.rotation.y = side * -0.35;
      scene.add(sf);
    });

    // Studio monitors / speakers
    [-1, 1].forEach(function(side){
      var spkBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.45), matDark);
      spkBody.position.set(side * 3.0, 2.0, -0.2);
      spkBody.castShadow = true;
      scene.add(spkBody);
      var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 16), matMetal);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(side * 3.0, 2.1, 0.06);
      scene.add(cone);
      var tweeter = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 12), matOrange);
      tweeter.rotation.x = Math.PI / 2;
      tweeter.position.set(side * 3.0, 2.28, 0.06);
      scene.add(tweeter);
    });

    // Keyboard / controller on desk
    var kb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.5), matMetal);
    kb.position.set(-0.5, 1.66, 0.5);
    scene.add(kb);

    // Pad controller
    var pads = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.5), matDark);
    pads.position.set(1.2, 1.66, 0.5);
    scene.add(pads);
    for(var py = 0; py < 2; py++){
      for(var px = 0; px < 4; px++){
        var pad = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.1), px === 1 && py === 0 ? matOrange : matMetal);
        pad.position.set(0.98 + px * 0.14, 1.7, 0.35 + py * 0.14);
        scene.add(pad);
      }
    }

    // Seated figure (abstract / sculptural)
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), matWarm);
    torso.position.set(0, 2.2, 1.5);
    torso.castShadow = true;
    scene.add(torso);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), matWarm);
    head.position.set(0, 2.82, 1.45);
    head.castShadow = true;
    scene.add(head);
    var seatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.65, 8), matDark);
    seatBase.position.set(0, 1.1, 1.5);
    scene.add(seatBase);
    var seatPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), matMetal);
    seatPole.position.set(0, 0.4, 1.5);
    scene.add(seatPole);
    // Arms reaching toward desk
    [-1, 1].forEach(function(side){
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), matWarm);
      arm.position.set(side * 0.38, 1.92, 1.1);
      arm.rotation.x = -0.65;
      scene.add(arm);
    });

    // DMF logo on back wall (flat orange letters)
    var dmfSign = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.02), new THREE.MeshStandardMaterial({
      color: 0xff5b1e, emissive: 0xff5b1e, emissiveIntensity: 0.12, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.35
    }));
    dmfSign.position.set(0, 5.2, -3.95);
    scene.add(dmfSign);

    // Glow strip under desk
    var glowStrip = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.02, 0.02), matGlow);
    glowStrip.position.set(0, 0.02, 0.9);
    scene.add(glowStrip);

    // Orange accent line on back wall
    var wallLine = new THREE.Mesh(new THREE.BoxGeometry(6, 0.01, 0.01), matGlow);
    wallLine.position.set(0, 1.2, -3.98);
    scene.add(wallLine);

    // Equipment rack (side)
    var rack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.8, 0.5), matDark);
    rack.position.set(-4.0, 1.4, -1.5);
    rack.castShadow = true;
    scene.add(rack);
    for(var ri = 0; ri < 5; ri++){
      var rackUnit = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.03), ri === 2 ? matOrange : matMetal);
      rackUnit.position.set(-4.0, 0.5 + ri * 0.5, -1.24);
      scene.add(rackUnit);
    }

    // Cable bundle (decorative)
    var cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5, 6), matDark);
    cable.position.set(-3.6, 1.7, -2);
    cable.rotation.z = 0.08;
    scene.add(cable);

    // Lighting
    var ambientLight = new THREE.AmbientLight(0x1a1612, 0.4);
    scene.add(ambientLight);

    var keyLight = new THREE.SpotLight(0xff8844, 1.8, 18, Math.PI / 5, 0.6, 1.5);
    keyLight.position.set(3, 6, 4);
    keyLight.target.position.set(0, 1.5, 0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.002;
    scene.add(keyLight);
    scene.add(keyLight.target);

    var fillLight = new THREE.PointLight(0x3344aa, 0.35, 12);
    fillLight.position.set(-4, 3, 2);
    scene.add(fillLight);

    var rimLight = new THREE.PointLight(0xff5b1e, 0.6, 10);
    rimLight.position.set(-2, 4.5, -3);
    scene.add(rimLight);

    var screenGlow = new THREE.PointLight(0x4466aa, 0.3, 4);
    screenGlow.position.set(0, 3, -0.2);
    scene.add(screenGlow);

    var accentLight = new THREE.PointLight(0xff5b1e, 0.25, 6);
    accentLight.position.set(3.5, 0.5, -1);
    scene.add(accentLight);

    // Camera orbit state
    var mouseX = 0, mouseY = 0;
    var targetRotY = 0, targetRotX = 0;
    var currentRotY = 0, currentRotX = 0;
    var autoAngle = 0;

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

    band.classList.add('is-ready');

    if(reduceMotion){
      renderer.render(scene, camera);
      return;
    }

    function animate(){
      requestAnimationFrame(animate);
      if(!isVisible) return;

      autoAngle += 0.0015;

      targetRotY = Math.sin(autoAngle) * 0.6 + mouseX * 0.3;
      targetRotX = mouseY * 0.15;

      currentRotY += (targetRotY - currentRotY) * 0.02;
      currentRotX += (targetRotX - currentRotX) * 0.02;

      camera.position.x = 5.5 * Math.cos(currentRotY * 0.3) + Math.sin(autoAngle * 0.7) * 0.3;
      camera.position.y = 3.2 + currentRotX * 0.5 + Math.sin(autoAngle * 1.1) * 0.15;
      camera.position.z = 7 * Math.cos(currentRotY * 0.15);
      camera.lookAt(0, 1.2, 0);

      rimLight.intensity = 0.5 + Math.sin(autoAngle * 2.3) * 0.15;
      accentLight.intensity = 0.2 + Math.sin(autoAngle * 1.7 + 1) * 0.1;

      renderer.render(scene, camera);
    }
    animate();
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
