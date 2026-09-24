const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'public', 'index.html');
if (!fs.existsSync(target)) throw new Error('DMF Codex: public/index.html not found. Run build-3d first.');

let html = fs.readFileSync(target, 'utf8');

const HEAD_MARKER = '<!-- DMF_CODEX_HEAD -->';
const BODY_MARKER = '<!-- DMF_CODEX_BODY -->';

const headInjection = `${HEAD_MARKER}
<style>
/* DMF CODEX // initiation protocol */
.dmf-initiation-protocol{position:relative;overflow:hidden;margin:0 0 clamp(52px,7vw,86px);border:1px solid rgba(255,91,30,.22);background:radial-gradient(circle at 82% 15%,rgba(255,91,30,.11),transparent 28%),radial-gradient(circle at 12% 88%,rgba(75,92,150,.07),transparent 26%),linear-gradient(145deg,rgba(14,11,9,.98),rgba(7,6,5,.98));box-shadow:0 30px 90px rgba(0,0,0,.28),inset 0 0 0 1px rgba(242,237,230,.025)}
.dmf-initiation-protocol::before{content:'';position:absolute;z-index:0;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(90deg,rgba(0,0,0,.9),rgba(0,0,0,.22))}
.dmf-initiation-protocol::after{content:'';position:absolute;z-index:1;left:-28%;right:-28%;top:0;height:1px;background:linear-gradient(90deg,transparent,#ff5b1e 48%,transparent);box-shadow:0 0 20px rgba(255,91,30,.45);animation:dmfCodexSweep 8s ease-in-out infinite;opacity:.65}
@keyframes dmfCodexSweep{0%,100%{transform:translateY(12px)}50%{transform:translateY(440px)}}
.dmf-codex-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(260px,.72fr) minmax(420px,1.28fr)}
.dmf-codex-copy{padding:clamp(30px,4vw,54px);border-right:1px solid rgba(242,237,230,.07)}
.dmf-codex-kicker{display:flex;align-items:center;gap:12px;font-size:9px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#ff5b1e}
.dmf-codex-kicker::before{content:'';width:28px;height:1px;background:#ff5b1e;box-shadow:0 0 9px rgba(255,91,30,.5)}
.dmf-codex-title{font-family:'Anton',sans-serif;font-size:clamp(34px,4.4vw,62px);font-weight:400;line-height:.94;letter-spacing:.01em;text-transform:uppercase;margin-top:16px;color:#f2ede6}
.dmf-codex-lede{margin-top:18px;max-width:470px;font-size:14px;line-height:1.72;color:#a99f95}
.dmf-codex-origin{margin-top:24px;padding-top:18px;border-top:1px solid rgba(242,237,230,.08);display:grid;gap:8px;font-size:8px;letter-spacing:.19em;text-transform:uppercase;color:#615950}
.dmf-codex-origin strong{color:#b8afa5;font-weight:600}
.dmf-codex-console{padding:clamp(30px,4vw,54px)}
.dmf-codex-console-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}
.dmf-codex-console-head strong{font-family:'Anton',sans-serif;font-size:17px;font-weight:400;letter-spacing:.08em;text-transform:uppercase;color:#f2ede6}
.dmf-codex-status{display:flex;align-items:center;gap:8px;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#6f665f}
.dmf-codex-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#ff5b1e;box-shadow:0 0 12px rgba(255,91,30,.65);animation:dmfCodexPulse 1.8s ease-in-out infinite}
@keyframes dmfCodexPulse{0%,100%{opacity:.35}50%{opacity:1}}
.dmf-codex-steps{display:grid;gap:20px}
.dmf-codex-step{display:grid;grid-template-columns:74px 1fr;gap:16px;align-items:start}
.dmf-codex-step-label{padding-top:9px;font-size:8px;font-weight:700;letter-spacing:.19em;text-transform:uppercase;color:#6c635a}
.dmf-codex-options{display:flex;flex-wrap:wrap;gap:8px}
.dmf-codex-option{appearance:none;border:1px solid rgba(242,237,230,.13);background:rgba(255,255,255,.018);color:#958b82;padding:10px 12px;font:600 9px/1 'Archivo',sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:border-color .2s,background .2s,color .2s,box-shadow .2s,transform .2s}
.dmf-codex-option:hover{border-color:rgba(255,91,30,.48);color:#e4dcd3;transform:translateY(-1px)}
.dmf-codex-option.is-selected{border-color:#ff5b1e;background:rgba(255,91,30,.09);color:#ff9a72;box-shadow:0 0 18px rgba(255,91,30,.08)}
.dmf-codex-result{display:none;margin-top:26px;padding:20px;border:1px solid rgba(255,91,30,.3);background:rgba(255,91,30,.035)}
.dmf-codex-result.is-ready{display:block;animation:dmfCodexReveal .45s ease-out both}
@keyframes dmfCodexReveal{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.dmf-codex-result-tag{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#ff5b1e}
.dmf-codex-result-main{font-family:'Anton',sans-serif;font-size:clamp(20px,2.5vw,32px);font-weight:400;letter-spacing:.03em;text-transform:uppercase;color:#f2ede6;margin-top:8px}
.dmf-codex-result-route{margin-top:10px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#9a9188}
.dmf-codex-result-note{margin-top:12px;font-size:13px;line-height:1.6;color:#837a72}
.dmf-codex-reset{margin-top:14px;border:0;background:none;padding:0;color:#ff7040;font:600 8px/1 'Archivo',sans-serif;letter-spacing:.17em;text-transform:uppercase;cursor:pointer}
.dmf-codex-beacon{position:fixed;z-index:46;right:14px;top:50%;transform:translate3d(14px,-50%,0);opacity:0;pointer-events:none;writing-mode:vertical-rl;padding:12px 8px;border:1px solid rgba(255,91,30,.22);background:rgba(7,6,5,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:7px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#8e8177;transition:opacity .35s,transform .35s}
.dmf-codex-beacon.is-visible{opacity:1;transform:translate3d(0,-50%,0)}
.dmf-codex-beacon span{color:#ff5b1e}
.signal-node.is-recommended::before{background:#ff5b1e!important;border-color:#ff5b1e!important;box-shadow:0 0 20px rgba(255,91,30,.55)!important}
.signal-node.is-recommended{padding-left:14px;background:linear-gradient(90deg,rgba(255,91,30,.045),transparent 52%)}
.signal-node.is-recommended::after{content:attr(data-codex);display:inline-block;margin-top:9px;padding:5px 7px;border:1px solid rgba(255,91,30,.28);font-size:7px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:#d77e5d}
@media(max-width:860px){.dmf-codex-shell{grid-template-columns:1fr}.dmf-codex-copy{border-right:0;border-bottom:1px solid rgba(242,237,230,.07)}.dmf-codex-beacon{display:none}}
@media(max-width:560px){.dmf-codex-step{grid-template-columns:1fr;gap:8px}.dmf-codex-copy,.dmf-codex-console{padding:28px 20px}.dmf-codex-console-head{align-items:flex-start;flex-direction:column}.dmf-codex-option{padding:10px 9px}}
@media(prefers-reduced-motion:reduce){.dmf-initiation-protocol::after,.dmf-codex-status::before{animation:none}}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  var STORAGE_KEY = 'dmf_codex_profile_v1';
  var state = { mission:null, system:null, discipline:null };
  var vectors = {
    finish:[0,4,7],
    mix:[1,2,3,7],
    workflow:[0,4,5],
    labels:[0,6,7]
  };

  function lang(){
    return String(document.documentElement.lang||'es').toLowerCase().indexOf('en')===0 ? 'en' : 'es';
  }

  function copy(){
    var es=lang()==='es';
    return es ? {
      kicker:'DMF // CÓDEX 08', title:'PROTOCOLO DE INICIACIÓN',
      lede:'Una fórmula forjada durante dos décadas entre estudio y cabina, ahora transmitida como protocolo de entrenamiento. Calibra tu señal antes de entrar a la ruta de ocho etapas.',
      origin1:'ORIGEN',origin1v:'20+ AÑOS DE ESTUDIO Y CABINA',origin2:'TRANSMISIÓN',origin2v:'MÉTODO DMF / 8 ETAPAS',origin3:'INTERFAZ',origin3v:'ENTRENAMIENTO HUMANO + SISTEMA DIGITAL',
      head:'CALIBRA TU SEÑAL',online:'CÓDEX EN LÍNEA',mission:'MISIÓN',system:'SISTEMA',discipline:'DISCIPLINA',
      missions:[['finish','Terminar tracks'],['mix','Mejorar mezcla'],['workflow','Dominar workflow'],['labels','Llegar a sellos']],
      systems:[['ableton','Ableton'],['logic','Logic'],['fl','FL Studio'],['other','Otro DAW']],
      times:[['2h','2 h / semana'],['4h','4 h / semana'],['6h','6+ h / semana']],
      ready:'PERFIL TERRESTRE CALIBRADO',route:'ÉNFASIS RECOMENDADO',reset:'RECALIBRAR',beacon:'CÓDEX // SEÑAL DE ENTRENAMIENTO ',recommended:'ÉNFASIS RECOMENDADO',
      notes:{finish:'Tu enemigo es abandonar antes de cerrar. El sistema enfatiza estructura, flujo y preparación final.',mix:'Tu señal necesita definición. El sistema enfatiza balance, selección sonora, low-end y preparación final.',workflow:'La velocidad nace de decisiones repetibles. El sistema enfatiza estructura, eficiencia y mentalidad de productor.',labels:'Primero termina. Después presenta. El sistema enfatiza estructura, mercado y preparación para lanzamiento.'}
    } : {
      kicker:'DMF // CODEX 08', title:'INITIATION PROTOCOL',
      lede:'A formula forged through two decades in studios and booths, now transmitted as a training protocol. Calibrate your signal before entering the eight-stage path.',
      origin1:'ORIGIN',origin1v:'20+ YEARS OF STUDIO + BOOTH',origin2:'TRANSMISSION',origin2v:'DMF METHOD / 8 STAGES',origin3:'INTERFACE',origin3v:'HUMAN TRAINING + DIGITAL SYSTEM',
      head:'CALIBRATE YOUR SIGNAL',online:'CODEX ONLINE',mission:'MISSION',system:'SYSTEM',discipline:'DISCIPLINE',
      missions:[['finish','Finish tracks'],['mix','Improve my mix'],['workflow','Master workflow'],['labels','Reach labels']],
      systems:[['ableton','Ableton'],['logic','Logic'],['fl','FL Studio'],['other','Other DAW']],
      times:[['2h','2 h / week'],['4h','4 h / week'],['6h','6+ h / week']],
      ready:'EARTHSIDE PROFILE CALIBRATED',route:'RECOMMENDED EMPHASIS',reset:'RECALIBRATE',beacon:'CODEX // TRAINING SIGNAL ',recommended:'RECOMMENDED EMPHASIS',
      notes:{finish:'Your enemy is abandonment before closure. The system emphasizes structure, flow and final preparation.',mix:'Your signal needs definition. The system emphasizes balance, sound selection, low-end and final preparation.',workflow:'Speed comes from repeatable decisions. The system emphasizes structure, efficiency and producer mindset.',labels:'Finish first. Present second. The system emphasizes structure, market and release readiness.'}
    };
  }

  function optionButtons(items,key){
    return items.map(function(item){
      return '<button type="button" class="dmf-codex-option'+(state[key]===item[0]?' is-selected':'')+'" data-codex-key="'+key+'" data-codex-value="'+item[0]+'">'+item[1]+'</button>';
    }).join('');
  }

  function loadState(){
    try{
      var saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(saved && typeof saved==='object') state={mission:saved.mission||null,system:saved.system||null,discipline:saved.discipline||null};
    }catch(e){}
  }

  function saveState(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}
  }

  function selectedLabel(items,value){
    var found=items.find(function(i){return i[0]===value;});
    return found ? found[1] : value;
  }

  function applyRecommendation(){
    var c=copy();
    var nodes=document.querySelectorAll('#modulesGrid .signal-node');
    nodes.forEach(function(n){n.classList.remove('is-recommended');n.removeAttribute('data-codex');});
    if(!state.mission || !vectors[state.mission]) return;
    vectors[state.mission].forEach(function(idx){
      if(nodes[idx]){nodes[idx].classList.add('is-recommended');nodes[idx].setAttribute('data-codex',c.recommended);}
    });
  }

  function renderResult(root){
    var c=copy();
    var result=root.querySelector('.dmf-codex-result');
    if(!(state.mission&&state.system&&state.discipline)){result.classList.remove('is-ready');applyRecommendation();return;}
    var route=(vectors[state.mission]||[]).map(function(i){return String(i+1).padStart(2,'0');}).join(' → ');
    result.innerHTML='<div class="dmf-codex-result-tag">'+c.ready+'</div><div class="dmf-codex-result-main">'+selectedLabel(c.missions,state.mission)+' / '+selectedLabel(c.systems,state.system)+'</div><div class="dmf-codex-result-route">'+c.route+' // '+route+'</div><div class="dmf-codex-result-note">'+c.notes[state.mission]+'</div><button type="button" class="dmf-codex-reset">'+c.reset+'</button>';
    result.classList.add('is-ready');
    var reset=result.querySelector('.dmf-codex-reset');
    reset.addEventListener('click',function(){state={mission:null,system:null,discipline:null};saveState();render(root);});
    applyRecommendation();
  }

  function render(root){
    var c=copy();
    root.innerHTML='<div class="dmf-codex-shell"><div class="dmf-codex-copy"><div class="dmf-codex-kicker">'+c.kicker+'</div><h3 class="dmf-codex-title">'+c.title+'</h3><p class="dmf-codex-lede">'+c.lede+'</p><div class="dmf-codex-origin"><div>'+c.origin1+' // <strong>'+c.origin1v+'</strong></div><div>'+c.origin2+' // <strong>'+c.origin2v+'</strong></div><div>'+c.origin3+' // <strong>'+c.origin3v+'</strong></div></div></div><div class="dmf-codex-console"><div class="dmf-codex-console-head"><strong>'+c.head+'</strong><span class="dmf-codex-status">'+c.online+'</span></div><div class="dmf-codex-steps"><div class="dmf-codex-step"><div class="dmf-codex-step-label">01 / '+c.mission+'</div><div class="dmf-codex-options">'+optionButtons(c.missions,'mission')+'</div></div><div class="dmf-codex-step"><div class="dmf-codex-step-label">02 / '+c.system+'</div><div class="dmf-codex-options">'+optionButtons(c.systems,'system')+'</div></div><div class="dmf-codex-step"><div class="dmf-codex-step-label">03 / '+c.discipline+'</div><div class="dmf-codex-options">'+optionButtons(c.times,'discipline')+'</div></div></div><div class="dmf-codex-result"></div></div></div>';
    root.querySelectorAll('.dmf-codex-option').forEach(function(btn){
      btn.addEventListener('click',function(){state[btn.getAttribute('data-codex-key')]=btn.getAttribute('data-codex-value');saveState();render(root);});
    });
    renderResult(root);
  }

  function mount(){
    var academy=document.getElementById('academy');
    if(!academy || document.querySelector('.dmf-initiation-protocol')) return;
    loadState();
    var root=document.createElement('div');
    root.className='dmf-initiation-protocol';
    root.setAttribute('aria-label','DMF Codex initiation protocol');
    var badge=academy.querySelector('.acad-badge');
    if(badge) badge.insertAdjacentElement('afterend',root); else academy.prepend(root);

    var beacon=document.createElement('div');
    beacon.className='dmf-codex-beacon';
    beacon.innerHTML='<span>●</span> '+copy().beacon+'ONLINE';
    document.body.appendChild(beacon);

    render(root);

    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){beacon.classList.toggle('is-visible',entries[0].isIntersecting);},{threshold:.08});
      io.observe(academy);
    }

    var langBtn=document.querySelector('.lang-btn');
    if(langBtn && 'MutationObserver' in window){
      new MutationObserver(function(){
        setTimeout(function(){render(root);var c=copy();beacon.innerHTML='<span>●</span> '+c.beacon+'ONLINE';applyRecommendation();},0);
      }).observe(langBtn,{childList:true,subtree:true,characterData:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
</script>`;

if (!html.includes(HEAD_MARKER)) {
  if (!html.includes('</head>')) throw new Error('DMF Codex: </head> not found');
  html = html.replace('</head>', `${headInjection}\n</head>`);
}

if (!html.includes(BODY_MARKER)) {
  if (!html.includes('</body>')) throw new Error('DMF Codex: </body> not found');
  html = html.replace('</body>', `${bodyInjection}\n</body>`);
}

fs.writeFileSync(target, html, 'utf8');
console.log('DMF Codex initiation injected into public/index.html');
