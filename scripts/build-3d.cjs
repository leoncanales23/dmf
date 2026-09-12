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
/* DMF x Meshy — lightweight 3D studio signal */
.hero-img{isolation:isolate}
.hero-img-overlay{z-index:2}
.dmf-3d-stage{position:absolute;z-index:4;left:clamp(12px,2.4vw,30px);bottom:clamp(14px,2.6vw,32px);width:min(61%,350px);aspect-ratio:1/1;overflow:hidden;border:1px solid rgba(255,91,30,.36);background:radial-gradient(circle at 58% 38%,rgba(255,91,30,.17),transparent 34%),linear-gradient(145deg,rgba(22,16,12,.92),rgba(7,6,5,.82));box-shadow:0 22px 70px rgba(0,0,0,.48),inset 0 0 0 1px rgba(242,237,230,.035);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,0 100%);transform:translateY(8px);opacity:0;transition:opacity .7s ease,transform .7s cubic-bezier(.2,.8,.2,1),border-color .25s ease}
.dmf-3d-stage::before{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;background:linear-gradient(90deg,transparent 49.7%,rgba(255,91,30,.07) 50%,transparent 50.3%),linear-gradient(0deg,transparent 49.7%,rgba(255,91,30,.05) 50%,transparent 50.3%);mix-blend-mode:screen}
.dmf-3d-stage::after{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 5px);opacity:.46}
.dmf-3d-stage.is-mounted{opacity:1;transform:translateY(0)}
.dmf-3d-stage:hover{border-color:rgba(255,91,30,.72)}
.dmf-3d-model{position:absolute;inset:0;width:100%;height:100%;background:transparent;--poster-color:transparent;opacity:0;transform:scale(.94);transition:opacity .65s ease,transform .8s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 12px 18px rgba(0,0,0,.38))}
.dmf-3d-stage.is-ready .dmf-3d-model{opacity:1;transform:scale(1)}
.dmf-3d-label{position:absolute;z-index:5;top:12px;left:14px;display:flex;align-items:center;gap:8px;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ffb599;pointer-events:none;text-shadow:0 1px 8px #000}
.dmf-3d-label::before{content:'';width:18px;height:1px;background:#ff5b1e;box-shadow:0 0 8px rgba(255,91,30,.75)}
.dmf-3d-orbit{position:absolute;z-index:5;right:11px;bottom:10px;width:28px;height:28px;display:grid;place-items:center;border:1px solid rgba(242,237,230,.18);border-radius:50%;font-size:10px;line-height:1;color:#c9c0b6;background:rgba(10,8,6,.48);pointer-events:none}
.dmf-3d-loader{position:absolute;z-index:1;left:14px;right:14px;bottom:12px;height:1px;overflow:hidden;background:rgba(242,237,230,.08)}
.dmf-3d-loader::after{content:'';display:block;width:42%;height:100%;background:#ff5b1e;box-shadow:0 0 10px rgba(255,91,30,.7);animation:dmf3dLoad 1.25s ease-in-out infinite}
.dmf-3d-stage.is-ready .dmf-3d-loader{opacity:0;transition:opacity .3s}
@keyframes dmf3dLoad{0%{transform:translateX(-110%)}100%{transform:translateX(340%)}}
@media(max-width:760px){.dmf-3d-stage{width:min(56%,260px);left:12px;bottom:12px;background:radial-gradient(circle at 55% 38%,rgba(255,91,30,.14),transparent 34%),rgba(8,7,6,.86)}.dmf-3d-label{font-size:8px;top:9px;left:10px}.dmf-3d-orbit{display:none}}
@media(max-width:440px){.dmf-3d-stage{width:52%;left:9px;bottom:9px}.dmf-3d-label{letter-spacing:.12em}.dmf-3d-label::before{width:12px}}
@media(prefers-reduced-motion:reduce){.dmf-3d-stage,.dmf-3d-model{transition:none}.dmf-3d-loader::after{animation:none;width:100%;opacity:.5}}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  function mountDMF3D(){
    const host = document.querySelector('.hero-img');
    if(!host || host.querySelector('.dmf-3d-stage')) return;

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const constrained = connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ''));
    if(constrained) return;

    const stage = document.createElement('div');
    stage.className = 'dmf-3d-stage';
    stage.setAttribute('aria-label','Interactive 3D DMF studio sculpture');
    stage.innerHTML = '<div class="dmf-3d-label">DMF // STUDIO 3D</div><div class="dmf-3d-loader" aria-hidden="true"></div><div class="dmf-3d-orbit" aria-hidden="true">↻</div>';

    const model = document.createElement('model-viewer');
    model.className = 'dmf-3d-model';
    model.setAttribute('src','assets/models/dmf-signal-chrome.glb');
    model.setAttribute('alt','DMF studio represented as an interactive metallic 3D sculpture');
    model.setAttribute('camera-controls','');
    model.setAttribute('disable-zoom','');
    model.setAttribute('interaction-prompt','none');
    model.setAttribute('touch-action','pan-y');
    model.setAttribute('loading','lazy');
    model.setAttribute('environment-image','neutral');
    model.setAttribute('shadow-intensity','1');
    model.setAttribute('shadow-softness','.75');
    model.setAttribute('exposure','1.08');
    model.setAttribute('camera-orbit','28deg 68deg auto');
    model.setAttribute('field-of-view','28deg');
    model.setAttribute('rotation-per-second','4deg');
    model.setAttribute('auto-rotate-delay','900');

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduceMotion) model.setAttribute('auto-rotate','');

    model.addEventListener('load', function(){ stage.classList.add('is-ready'); }, {once:true});
    model.addEventListener('error', function(){ stage.remove(); }, {once:true});
    stage.appendChild(model);
    host.appendChild(stage);
    requestAnimationFrame(function(){ stage.classList.add('is-mounted'); });

    if('IntersectionObserver' in window && !reduceMotion){
      const io = new IntersectionObserver(function(entries){
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
