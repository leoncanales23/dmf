const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourcePath = path.join(root, 'index.html');
const outputPath = path.join(root, 'public', 'index.html');

let html = fs.readFileSync(sourcePath, 'utf8');

const HEAD_MARKER = '<!-- DMF_MESHY_3D_HEAD -->';
const BODY_MARKER = '<!-- DMF_MESHY_3D_BODY -->';

const headInjection = `${HEAD_MARKER}
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"></script>
<style>
/* DMF x Meshy — atmospheric 3D sculpture */
.hero-img{isolation:isolate}
.hero-img-overlay{z-index:2}
.dmf-3d-stage{position:absolute;z-index:4;left:clamp(10px,2vw,24px);bottom:clamp(10px,2vw,24px);width:min(72%,420px);aspect-ratio:4/5;overflow:hidden;border:none;border-radius:6px;background:radial-gradient(ellipse at 50% 35%,rgba(255,91,30,.12),transparent 55%),radial-gradient(ellipse at 20% 80%,rgba(255,91,30,.06),transparent 40%),linear-gradient(160deg,rgba(18,14,10,.94),rgba(6,5,4,.88));box-shadow:0 0 80px rgba(255,91,30,.10),0 0 40px rgba(255,91,30,.06),0 30px 80px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,91,30,.10);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transform:translateY(10px);opacity:0;transition:opacity .8s ease,transform .8s cubic-bezier(.16,.8,.2,1)}
.dmf-3d-stage::before{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;background:radial-gradient(ellipse at 50% 40%,transparent 50%,rgba(6,5,4,.4) 100%)}
.dmf-3d-stage::after{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0,rgba(255,255,255,.012) 1px,transparent 1px,transparent 4px);opacity:.35}
.dmf-3d-stage.is-mounted{opacity:1;transform:translateY(0)}
.dmf-3d-stage:hover{box-shadow:0 0 90px rgba(255,91,30,.15),0 0 50px rgba(255,91,30,.08),0 30px 80px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,91,30,.18)}
.dmf-3d-model{position:absolute;inset:0;width:100%;height:100%;background:transparent;--poster-color:transparent;opacity:0;transform:scale(.96);transition:opacity .8s ease,transform 1s cubic-bezier(.16,.8,.2,1);filter:drop-shadow(0 16px 24px rgba(0,0,0,.45))}
.dmf-3d-stage.is-ready .dmf-3d-model{opacity:1;transform:scale(1)}
.dmf-3d-tag{position:absolute;z-index:5;bottom:14px;left:16px;font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,181,153,.5);pointer-events:none;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.dmf-3d-loader{position:absolute;z-index:1;left:16px;right:16px;bottom:12px;height:1px;overflow:hidden;background:rgba(242,237,230,.06)}
.dmf-3d-loader::after{content:'';display:block;width:38%;height:100%;background:#ff5b1e;box-shadow:0 0 10px rgba(255,91,30,.7);animation:dmf3dLoad 1.5s ease-in-out infinite}
.dmf-3d-stage.is-ready .dmf-3d-loader{opacity:0;transition:opacity .4s}
@keyframes dmf3dLoad{0%{transform:translateX(-110%)}100%{transform:translateX(360%)}}
@media(max-width:760px){.dmf-3d-stage{width:min(64%,300px);left:10px;bottom:10px;aspect-ratio:1/1;background:radial-gradient(ellipse at 50% 35%,rgba(255,91,30,.10),transparent 50%),rgba(8,7,6,.90)}.dmf-3d-tag{font-size:7px;bottom:10px;left:12px}}
@media(max-width:440px){.dmf-3d-stage{width:58%;left:8px;bottom:8px}}
@media(prefers-reduced-motion:reduce){.dmf-3d-stage,.dmf-3d-model{transition:none}.dmf-3d-loader::after{animation:none;width:100%;opacity:.5}}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  function mountDMF3D(){
    var host = document.querySelector('.hero-img');
    if(!host || host.querySelector('.dmf-3d-stage')) return;

    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var constrained = connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''));
    if(constrained) return;

    var stage = document.createElement('div');
    stage.className = 'dmf-3d-stage';
    stage.setAttribute('aria-label','Interactive 3D DMF studio sculpture');
    stage.innerHTML = '<div class="dmf-3d-tag">DMF</div><div class="dmf-3d-loader" aria-hidden="true"></div>';

    var model = document.createElement('model-viewer');
    model.className = 'dmf-3d-model';
    model.setAttribute('src','assets/models/dmf-signal-chrome.glb');
    model.setAttribute('alt','DMF studio represented as an interactive metallic 3D sculpture');
    model.setAttribute('camera-controls','');
    model.setAttribute('disable-zoom','');
    model.setAttribute('interaction-prompt','none');
    model.setAttribute('touch-action','pan-y');
    model.setAttribute('loading','lazy');
    model.setAttribute('environment-image','neutral');
    model.setAttribute('shadow-intensity','1.4');
    model.setAttribute('shadow-softness','0.9');
    model.setAttribute('exposure','1.2');
    model.setAttribute('camera-orbit','22deg 72deg auto');
    model.setAttribute('field-of-view','24deg');
    model.setAttribute('rotation-per-second','2.5deg');
    model.setAttribute('auto-rotate-delay','600');
    model.setAttribute('tone-mapping','commerce');

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduceMotion) model.setAttribute('auto-rotate','');

    model.addEventListener('load', function(){ stage.classList.add('is-ready'); }, {once:true});
    model.addEventListener('error', function(){ stage.remove(); }, {once:true});
    stage.appendChild(model);
    host.appendChild(stage);
    requestAnimationFrame(function(){ stage.classList.add('is-mounted'); });

    if('IntersectionObserver' in window && !reduceMotion){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting) model.setAttribute('auto-rotate','');
          else model.removeAttribute('auto-rotate');
        });
      }, {threshold:.12});
      io.observe(host);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDMF3D, {once:true});
  else mountDMF3D();
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
