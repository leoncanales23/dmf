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
/* DMF x Meshy — PR10 premium signal band */
.hero-img{isolation:isolate}
.hero-img-overlay{z-index:2}

.dmf-signal-band{position:relative;z-index:2;overflow:hidden;border-top:1px solid rgba(242,237,230,.08);border-bottom:1px solid rgba(242,237,230,.08);background:linear-gradient(180deg,#080706 0%,#0b0806 48%,#080706 100%)}
.dmf-signal-band::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 72% 48%,rgba(255,91,30,.18),transparent 30%),radial-gradient(circle at 88% 24%,rgba(255,91,30,.08),transparent 22%),linear-gradient(90deg,transparent 0 49.92%,rgba(255,91,30,.045) 50%,transparent 50.08%);mix-blend-mode:screen}
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
.dmf-signal-cta{display:inline-flex;align-items:center;gap:14px;padding:15px 22px;border:1px solid #ff5b1e;background:rgba(255,91,30,.06);font-family:'Anton',sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#ff7a45;transition:background .25s,color .25s,transform .25s,box-shadow .25s}
.dmf-signal-cta:hover{background:#ff5b1e;color:#0a0806;transform:translateY(-2px);box-shadow:0 12px 34px rgba(255,91,30,.18)}
.dmf-signal-hint{font-size:9px;letter-spacing:.17em;text-transform:uppercase;color:#665f58}

.dmf-signal-visual{position:relative;min-height:clamp(390px,45vw,590px);overflow:hidden;background:radial-gradient(ellipse at 64% 44%,rgba(255,91,30,.09),transparent 37%),linear-gradient(135deg,rgba(15,11,8,.18),rgba(4,4,4,.3))}
.dmf-signal-visual::before{content:'DMF';position:absolute;z-index:0;right:-.035em;bottom:-.22em;font-family:'Anton',sans-serif;font-size:clamp(170px,30vw,460px);line-height:1;color:rgba(242,237,230,.022);letter-spacing:-.04em;pointer-events:none}
.dmf-signal-visual::after{content:'';position:absolute;z-index:3;inset:0;pointer-events:none;background:linear-gradient(90deg,#080706 0%,rgba(8,7,6,.60) 9%,transparent 30%,transparent 82%,rgba(8,7,6,.30) 100%),linear-gradient(180deg,rgba(8,7,6,.35),transparent 18%,transparent 78%,rgba(8,7,6,.55));box-shadow:inset 0 0 120px rgba(0,0,0,.5)}
.dmf-signal-model{position:absolute;z-index:2;inset:-6% -4% -8% -5%;width:110%;height:114%;background:transparent;--poster-color:transparent;opacity:0;transform:translate3d(3%,2%,0) scale(.92);transition:opacity 1s ease,transform 1.25s cubic-bezier(.16,.8,.2,1);filter:drop-shadow(0 28px 38px rgba(0,0,0,.55)) drop-shadow(0 0 24px rgba(255,91,30,.08))}
.dmf-signal-band.is-ready .dmf-signal-model{opacity:1;transform:translate3d(0,0,0) scale(1)}
.dmf-signal-scan{position:absolute;z-index:4;left:8%;right:8%;top:18%;height:1px;background:linear-gradient(90deg,transparent,#ff5b1e 28%,rgba(255,91,30,.15) 65%,transparent);box-shadow:0 0 18px rgba(255,91,30,.45);opacity:.28;animation:dmfSignalScan 7s ease-in-out infinite;pointer-events:none}
.dmf-signal-corner{position:absolute;z-index:5;right:clamp(18px,3vw,38px);top:clamp(18px,3vw,32px);display:flex;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none}
.dmf-signal-corner strong{font-family:'Anton',sans-serif;font-size:12px;font-weight:400;letter-spacing:.16em;color:#ff5b1e}
.dmf-signal-corner span{font-size:8px;letter-spacing:.19em;text-transform:uppercase;color:#6f665f}
.dmf-signal-loader{position:absolute;z-index:1;left:18%;right:18%;bottom:14%;height:1px;overflow:hidden;background:rgba(242,237,230,.06)}
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
  .dmf-signal-model{inset:-4% -9% -8% -9%;width:118%;height:112%}
}
@media(max-width:560px){
  .dmf-signal-copy{padding:48px 20px 38px}
  .dmf-signal-lede{font-size:14px}
  .dmf-signal-visual{min-height:350px}
  .dmf-signal-corner{right:16px;top:16px}
  .dmf-signal-hint{display:none}
}
@media(prefers-reduced-motion:reduce){
  .dmf-signal-model{transition:none}
  .dmf-signal-loader::after,.dmf-signal-scan{animation:none}
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
          '<p class="dmf-signal-lede" data-dmf-en="An interactive 3D study born from the DMF studio. Not a gadget inside the portrait, but a separate visual statement: sound, structure and process translated into form." data-dmf-es="Un estudio 3D interactivo nacido desde el estudio DMF. Ya no vive como un gadget dentro del retrato, sino como una pieza visual propia: sonido, estructura y proceso traducidos en forma.">An interactive 3D study born from the DMF studio. Not a gadget inside the portrait, but a separate visual statement: sound, structure and process translated into form.</p>',
          '<div class="dmf-signal-meta">',
            '<span class="dmf-signal-chip" data-dmf-en="Interactive 3D" data-dmf-es="3D interactivo">Interactive 3D</span>',
            '<span class="dmf-signal-chip" data-dmf-en="Real-time" data-dmf-es="Tiempo real">Real-time</span>',
            '<span class="dmf-signal-chip" data-dmf-en="Studio study" data-dmf-es="Estudio visual">Studio study</span>',
          '</div>',
          '<div class="dmf-signal-actions">',
            '<a class="dmf-signal-cta" href="#academy"><span data-dmf-en="Explore the methodology" data-dmf-es="Explorar la metodología">Explore the methodology</span><span aria-hidden="true">→</span></a>',
            '<span class="dmf-signal-hint" data-dmf-en="Drag to orbit · auto-rotates" data-dmf-es="Arrastra para rotar · giro automático">Drag to orbit · auto-rotates</span>',
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

    var visual = band.querySelector('.dmf-signal-visual');
    var model = document.createElement('model-viewer');
    model.className = 'dmf-signal-model';
    model.setAttribute('src','assets/models/dmf-signal-chrome.glb');
    model.setAttribute('alt','Interactive metallic DMF studio sculpture');
    model.setAttribute('camera-controls','');
    model.setAttribute('disable-zoom','');
    model.setAttribute('interaction-prompt','none');
    model.setAttribute('touch-action','pan-y');
    model.setAttribute('loading','lazy');
    model.setAttribute('environment-image','neutral');
    model.setAttribute('shadow-intensity','1.7');
    model.setAttribute('shadow-softness','0.85');
    model.setAttribute('exposure','1.18');
    model.setAttribute('camera-orbit','28deg 68deg auto');
    model.setAttribute('field-of-view','21deg');
    model.setAttribute('rotation-per-second','1.8deg');
    model.setAttribute('auto-rotate-delay','450');
    model.setAttribute('tone-mapping','commerce');

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduceMotion) model.setAttribute('auto-rotate','');

    model.addEventListener('load', function(){ band.classList.add('is-ready'); }, {once:true});
    model.addEventListener('error', function(){ model.remove(); }, {once:true});
    visual.appendChild(model);

    if('IntersectionObserver' in window && !reduceMotion){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting) model.setAttribute('auto-rotate','');
          else model.removeAttribute('auto-rotate');
        });
      }, {threshold:.08});
      io.observe(band);
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
console.log(`DMF premium signal band ready: ${path.relative(root, outputPath)}`);
