const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'public', 'index.html');
if (!fs.existsSync(target)) throw new Error('DMF Oracle: public/index.html not found. Run build-3d and inject-codex first.');

let html = fs.readFileSync(target, 'utf8');

const HEAD_MARKER = '<!-- DMF_ORACLE_HEAD -->';
const BODY_MARKER = '<!-- DMF_ORACLE_BODY -->';

const headInjection = `${HEAD_MARKER}
<style>
/* DMF ORACLE // guidance engine */
.dmf-oracle{position:relative;overflow:hidden;margin:0 0 clamp(52px,7vw,86px);border:1px solid rgba(108,130,255,.22);background:radial-gradient(circle at 16% 30%,rgba(64,86,190,.12),transparent 30%),radial-gradient(circle at 82% 62%,rgba(255,91,30,.10),transparent 30%),linear-gradient(145deg,#070708,#0b0908 56%,#080706);box-shadow:0 38px 110px rgba(0,0,0,.34),inset 0 0 0 1px rgba(242,237,230,.025)}
.dmf-oracle::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.055) 1px,transparent 0);background-size:28px 28px;mask-image:linear-gradient(90deg,rgba(0,0,0,.85),rgba(0,0,0,.12));opacity:.36}
.dmf-oracle::after{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(108,130,255,.9),#ff5b1e,transparent);box-shadow:0 0 24px rgba(108,130,255,.42);animation:oracleSweep 9s ease-in-out infinite;opacity:.7}
@keyframes oracleSweep{0%,100%{transform:translateY(12px)}50%{transform:translateY(520px)}}
.dmf-oracle-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(280px,.78fr) minmax(440px,1.22fr)}
.dmf-oracle-myth{padding:clamp(32px,4.5vw,60px);border-right:1px solid rgba(242,237,230,.07);display:flex;flex-direction:column;justify-content:center}
.dmf-oracle-kicker{font-size:9px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#8498ff}
.dmf-oracle-title{font-family:'Anton',sans-serif;font-size:clamp(42px,5.7vw,82px);line-height:.9;font-weight:400;text-transform:uppercase;color:#f2ede6;margin-top:16px;max-width:7ch}
.dmf-oracle-lede{margin-top:20px;max-width:470px;color:#a89f97;font-size:14px;line-height:1.72}
.dmf-oracle-source{display:grid;gap:8px;margin-top:28px;padding-top:20px;border-top:1px solid rgba(242,237,230,.08);font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#635c56}
.dmf-oracle-source strong{color:#b9b0a8;font-weight:600}
.dmf-oracle-sigil{position:relative;width:118px;height:118px;margin-top:30px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(108,130,255,.24);background:radial-gradient(circle,rgba(255,91,30,.09),transparent 57%)}
.dmf-oracle-sigil::before,.dmf-oracle-sigil::after{content:'';position:absolute;border-radius:50%;border:1px solid rgba(255,91,30,.22)}
.dmf-oracle-sigil::before{inset:12px;animation:oracleSpin 16s linear infinite}
.dmf-oracle-sigil::after{inset:27px;border-style:dashed;animation:oracleSpin 11s linear infinite reverse}
.dmf-oracle-sigil span{font-family:'Anton',sans-serif;font-size:23px;letter-spacing:.08em;color:#ff7a45;text-shadow:0 0 22px rgba(255,91,30,.34)}
@keyframes oracleSpin{to{transform:rotate(360deg)}}
.dmf-oracle-console{padding:clamp(32px,4.5vw,60px)}
.dmf-oracle-head{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:26px}
.dmf-oracle-head strong{font-family:'Anton',sans-serif;font-size:19px;font-weight:400;letter-spacing:.07em;text-transform:uppercase;color:#f2ede6}
.dmf-oracle-status{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#7486df;display:flex;align-items:center;gap:7px}
.dmf-oracle-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#8498ff;box-shadow:0 0 12px rgba(132,152,255,.75);animation:oraclePulse 1.8s ease-in-out infinite}
@keyframes oraclePulse{0%,100%{opacity:.35}50%{opacity:1}}
.dmf-oracle-profile{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:rgba(242,237,230,.08);border:1px solid rgba(242,237,230,.08);margin-bottom:24px}
.dmf-oracle-profile div{background:#090807;padding:13px 12px}
.dmf-oracle-profile span{display:block;font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#5f5852;margin-bottom:5px}
.dmf-oracle-profile strong{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#cfc5bc;font-weight:600}
.dmf-oracle-prompt{font-size:8px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff6e3a;margin-bottom:12px}
.dmf-oracle-options{display:flex;flex-wrap:wrap;gap:8px}
.dmf-oracle-option{appearance:none;border:1px solid rgba(242,237,230,.12);background:rgba(255,255,255,.018);color:#8f857d;padding:10px 12px;font:600 9px/1 'Archivo',sans-serif;letter-spacing:.11em;text-transform:uppercase;cursor:pointer;transition:.2s ease}
.dmf-oracle-option:hover{border-color:rgba(132,152,255,.55);color:#e5dfda;transform:translateY(-1px)}
.dmf-oracle-option.is-selected{border-color:#8498ff;background:rgba(132,152,255,.08);color:#b9c4ff;box-shadow:0 0 18px rgba(132,152,255,.08)}
.dmf-oracle-output{margin-top:24px;padding:20px;border:1px solid rgba(255,91,30,.25);background:linear-gradient(135deg,rgba(255,91,30,.035),rgba(108,130,255,.025));display:none}
.dmf-oracle-output.is-ready{display:block;animation:oracleReveal .4s ease-out both}
@keyframes oracleReveal{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.dmf-oracle-transmission{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#8498ff}
.dmf-oracle-module{font-family:'Anton',sans-serif;font-size:clamp(25px,3.2vw,40px);font-weight:400;text-transform:uppercase;color:#f2ede6;margin-top:7px}
.dmf-oracle-directive{margin-top:12px;color:#afa69e;font-size:13px;line-height:1.65}
.dmf-oracle-artifact{margin-top:14px;padding-top:13px;border-top:1px solid rgba(242,237,230,.08);font-size:9px;letter-spacing:.11em;text-transform:uppercase;color:#7f756e;line-height:1.65}
.dmf-oracle-artifact strong{color:#ff8b60}
.dmf-oracle-lock{padding:22px;border:1px solid rgba(242,237,230,.09);background:rgba(255,255,255,.015)}
.dmf-oracle-lock strong{font-family:'Anton',sans-serif;font-size:21px;font-weight:400;text-transform:uppercase;color:#f2ede6}
.dmf-oracle-lock p{margin-top:9px;color:#7e756e;font-size:13px;line-height:1.6}
.dmf-oracle-lock button{margin-top:15px;border:1px solid #ff5b1e;background:rgba(255,91,30,.05);color:#ff7a45;padding:11px 14px;font:600 9px/1 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.dmf-oracle-seal{position:fixed;left:14px;bottom:16px;z-index:45;display:none;align-items:center;gap:9px;padding:9px 12px;border:1px solid rgba(132,152,255,.22);background:rgba(7,7,8,.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:7px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#777b99;pointer-events:none}
.dmf-oracle-seal.is-visible{display:flex}
.dmf-oracle-seal i{width:6px;height:6px;border-radius:50%;background:#8498ff;box-shadow:0 0 10px rgba(132,152,255,.7)}
.signal-node.is-oracle-active{padding-left:16px;background:linear-gradient(90deg,rgba(108,130,255,.075),rgba(255,91,30,.025),transparent 58%)}
.signal-node.is-oracle-active::before{background:#8498ff!important;border-color:#8498ff!important;box-shadow:0 0 21px rgba(132,152,255,.65)!important}
.signal-node.is-oracle-active::after{content:attr(data-oracle);display:inline-block;margin-top:9px;padding:5px 7px;border:1px solid rgba(132,152,255,.3);font-size:7px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:#9cabff}
@media(max-width:860px){.dmf-oracle-shell{grid-template-columns:1fr}.dmf-oracle-myth{border-right:0;border-bottom:1px solid rgba(242,237,230,.07)}.dmf-oracle-sigil{width:96px;height:96px}.dmf-oracle-seal{display:none!important}}
@media(max-width:560px){.dmf-oracle-myth,.dmf-oracle-console{padding:28px 20px}.dmf-oracle-profile{grid-template-columns:1fr}.dmf-oracle-head{align-items:flex-start;flex-direction:column}.dmf-oracle-option{padding:10px 9px}}
@media(prefers-reduced-motion:reduce){.dmf-oracle::after,.dmf-oracle-sigil::before,.dmf-oracle-sigil::after,.dmf-oracle-status::before{animation:none}}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  var PROFILE_KEY='dmf_codex_profile_v1';
  var ORACLE_KEY='dmf_oracle_state_v1';
  var oracleState={blocker:null};
  var moduleNamesEn=['Track structure & development','Mixing & balance','Sound Selection','Bass creation','Workflow & efficiency','Producer Mindset','Music Market','Mastering & final prep'];
  var moduleNamesEs=['Estructura y desarrollo de un track','Mixing y balance','Sound Selection','Creación de bajos','Workflow y eficiencia','Producer Mindset','Music Market','Mastering y preparación final'];

  var blockerMap={
    structure:0,mix:1,sound:2,bass:3,workflow:4,finish:5,labels:6,mastering:7
  };

  var missionDefault={finish:'structure',mix:'mix',workflow:'workflow',labels:'labels'};

  var guidance={
    en:{
      structure:{directive:'Bring one unfinished track and expose its full arrangement. The first task is to identify what the song is asking for: intro, break, build, drop, outro and energy movement.',artifact:'One unfinished project with the arrangement visible.'},
      mix:{directive:'Do not start with more plugins. Bring the session and a current bounce. The first transmission is balance: what is too loud, too masked or occupying the wrong space?',artifact:'Project file + latest stereo bounce.'},
      sound:{directive:'Choose one 16-bar section where the production feels weak. We will isolate kick, bass, percussion, synths and textures, then replace only what fails the role.',artifact:'One 16-bar section + the sounds you are unsure about.'},
      bass:{directive:'The low end must become one system. Bring the kick and bass relationship exactly as it exists now; the training begins with groove, space and frequency ownership.',artifact:'Project with kick and bass separated and editable.'},
      workflow:{directive:'Your first correction is not musical, it is procedural. Bring a project where you lose time and we will map the decisions that repeat, stall or create unnecessary branches.',artifact:'One project that feels slow or chaotic to finish.'},
      finish:{directive:'The block is not lack of ideas. It is closure. Bring the project you have avoided finishing and identify the exact moment where decisions stop. That is the training target.',artifact:'The unfinished project you have postponed the longest.'},
      labels:{directive:'Before contact strategy, the music must survive the final filter. Bring your strongest finished track and the labels you believe fit it. We will test positioning before outreach.',artifact:'One finished track + 3 target labels.'},
      mastering:{directive:'Final preparation starts before the limiter. Bring the pre-master and project. We will inspect headroom, balance and whether the mix is actually ready to be finalized.',artifact:'Pre-master WAV + original project.'}
    },
    es:{
      structure:{directive:'Trae un track sin terminar y muestra su arreglo completo. La primera tarea es detectar qué está pidiendo la canción: intro, break, build, drop, outro y movimiento de energía.',artifact:'Un proyecto sin terminar con el arreglo visible.'},
      mix:{directive:'No partas agregando más plugins. Trae la sesión y el bounce actual. La primera transmisión es balance: qué está demasiado fuerte, enmascarado u ocupando el espacio equivocado.',artifact:'Proyecto + último bounce estéreo.'},
      sound:{directive:'Elige una sección de 16 compases donde la producción se sienta débil. Vamos a aislar kick, bajo, percusión, synths y texturas, y reemplazar solo lo que no cumple su función.',artifact:'Una sección de 16 compases + los sonidos que te generan dudas.'},
      bass:{directive:'El low-end debe convertirse en un solo sistema. Trae la relación kick/bajo tal como existe hoy; el entrenamiento comienza con groove, espacio y propiedad de frecuencias.',artifact:'Proyecto con kick y bajo separados y editables.'},
      workflow:{directive:'La primera corrección no es musical, es procedural. Trae un proyecto donde pierdes tiempo y vamos a mapear las decisiones que se repiten, se traban o abren ramas innecesarias.',artifact:'Un proyecto que se sienta lento o caótico de terminar.'},
      finish:{directive:'El bloqueo no es falta de ideas. Es cierre. Trae el proyecto que has evitado terminar e identifica el momento exacto donde dejas de decidir. Ese es el objetivo de entrenamiento.',artifact:'El proyecto sin terminar que llevas más tiempo postergando.'},
      labels:{directive:'Antes de la estrategia de contacto, la música debe pasar el filtro final. Trae tu track terminado más fuerte y los sellos que crees que encajan. Probamos posicionamiento antes del outreach.',artifact:'Un track terminado + 3 sellos objetivo.'},
      mastering:{directive:'La preparación final empieza antes del limiter. Trae el pre-master y el proyecto. Revisaremos headroom, balance y si la mezcla realmente está lista para finalizar.',artifact:'Pre-master WAV + proyecto original.'}
    }
  };

  function lang(){
    var btn=document.querySelector('.lang-btn');
    return btn && btn.textContent.trim().toUpperCase()==='EN' ? 'es':'en';
  }

  function profile(){
    try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');}catch(e){return null;}
  }

  function profileReady(p){return !!(p&&p.mission&&p.system&&p.discipline);}

  function loadOracle(){
    try{var s=JSON.parse(localStorage.getItem(ORACLE_KEY)||'null');if(s&&typeof s==='object')oracleState.blocker=s.blocker||null;}catch(e){}
  }

  function saveOracle(){try{localStorage.setItem(ORACLE_KEY,JSON.stringify(oracleState));}catch(e){}}

  function labels(){
    var es=lang()==='es';
    return es ? {
      kicker:'DMF // ORÁCULO 09',title:'LA FÓRMULA HABLA',
      lede:'La leyenda es la interfaz. El entrenamiento es real. El Oráculo interpreta tu calibración y convierte dos décadas de decisiones de estudio en la siguiente directiva práctica.',
      source:'FUENTE',sourceV:'DEMIAN MULLER',classL:'CLASE DE TRANSMISIÓN',classV:'MÉTODO ASCENDIDO / APLICACIÓN TERRESTRE',engine:'MOTOR',engineV:'CÓDEX + RUTA DMF + TU BLOQUEO ACTUAL',
      head:'MOTOR DE GUÍA',online:'ORÁCULO EN LÍNEA',mission:'MISIÓN',system:'SISTEMA',discipline:'DISCIPLINA',
      prompt:'ENTRADA TERRESTRE // ¿QUÉ TE ESTÁ BLOQUEANDO AHORA?',
      options:[['structure','Estructura'],['mix','Mezcla'],['sound','Selección sonora'],['bass','Bajo / low-end'],['workflow','Workflow'],['finish','No termino'],['labels','Sellos'],['mastering','Mastering']],
      transmission:'TRANSMISIÓN ACTIVA',artifact:'LLEVA A LA SESIÓN',locked:'ORÁCULO BLOQUEADO',lockedBody:'Primero completa la calibración del Códex. El Oráculo necesita misión, sistema y disciplina antes de emitir una directiva.',lockedCta:'CALIBRAR CÓDEX',active:'DIRECTIVA DEL ORÁCULO'
    } : {
      kicker:'DMF // ORACLE 09',title:'THE FORMULA SPEAKS',
      lede:'The legend is the interface. The training is real. The Oracle reads your calibration and turns two decades of studio decisions into the next practical directive.',
      source:'SOURCE',sourceV:'DEMIAN MULLER',classL:'TRANSMISSION CLASS',classV:'ASCENDED METHOD / EARTHSIDE APPLICATION',engine:'ENGINE',engineV:'CODEX + DMF PATH + YOUR CURRENT BLOCK',
      head:'GUIDANCE ENGINE',online:'ORACLE ONLINE',mission:'MISSION',system:'SYSTEM',discipline:'DISCIPLINE',
      prompt:'EARTHSIDE INPUT // WHAT IS BLOCKING YOU RIGHT NOW?',
      options:[['structure','Structure'],['mix','Mix'],['sound','Sound selection'],['bass','Bass / low-end'],['workflow','Workflow'],['finish','I do not finish'],['labels','Labels'],['mastering','Mastering']],
      transmission:'ACTIVE TRANSMISSION',artifact:'BRING TO SESSION',locked:'ORACLE LOCKED',lockedBody:'Complete the Codex calibration first. The Oracle needs mission, system and discipline before it can issue a directive.',lockedCta:'CALIBRATE CODEX',active:'ORACLE DIRECTIVE'
    };
  }

  function valueLabel(key,value){
    var es=lang()==='es';
    var maps={
      mission:{finish:es?'Terminar tracks':'Finish tracks',mix:es?'Mejorar mezcla':'Improve mix',workflow:es?'Dominar workflow':'Master workflow',labels:es?'Llegar a sellos':'Reach labels'},
      system:{ableton:'Ableton',logic:'Logic',fl:'FL Studio',other:es?'Otro DAW':'Other DAW'},
      discipline:{'2h':es?'2 h / semana':'2 h / week','4h':es?'4 h / semana':'4 h / week','6h':es?'6+ h / semana':'6+ h / week'}
    };
    return maps[key]&&maps[key][value]?maps[key][value]:value;
  }

  function clearModuleHighlight(){
    document.querySelectorAll('#modulesGrid .signal-node').forEach(function(n){n.classList.remove('is-oracle-active');n.removeAttribute('data-oracle');});
  }

  function highlightModule(idx){
    clearModuleHighlight();
    var nodes=document.querySelectorAll('#modulesGrid .signal-node');
    var c=labels();
    if(nodes[idx]){nodes[idx].classList.add('is-oracle-active');nodes[idx].setAttribute('data-oracle',c.active);}
  }

  function defaultBlocker(p){return p&&missionDefault[p.mission]?missionDefault[p.mission]:null;}

  function render(root,seal){
    var c=labels();
    var p=profile();
    var ready=profileReady(p);
    var names=lang()==='es'?moduleNamesEs:moduleNamesEn;

    var left='<div class="dmf-oracle-myth"><div class="dmf-oracle-kicker">'+c.kicker+'</div><h3 class="dmf-oracle-title">'+c.title+'</h3><p class="dmf-oracle-lede">'+c.lede+'</p><div class="dmf-oracle-source"><div>'+c.source+' // <strong>'+c.sourceV+'</strong></div><div>'+c.classL+' // <strong>'+c.classV+'</strong></div><div>'+c.engine+' // <strong>'+c.engineV+'</strong></div></div><div class="dmf-oracle-sigil" aria-hidden="true"><span>DMF</span></div></div>';

    var right='<div class="dmf-oracle-console"><div class="dmf-oracle-head"><strong>'+c.head+'</strong><span class="dmf-oracle-status">'+c.online+'</span></div>';
    if(!ready){
      right+='<div class="dmf-oracle-lock"><strong>'+c.locked+'</strong><p>'+c.lockedBody+'</p><button type="button" class="dmf-oracle-calibrate">'+c.lockedCta+'</button></div></div>';
      root.innerHTML='<div class="dmf-oracle-shell">'+left+right+'</div>';
      clearModuleHighlight();
      seal.classList.remove('is-visible');
      var calibrate=root.querySelector('.dmf-oracle-calibrate');
      if(calibrate)calibrate.addEventListener('click',function(){var el=document.querySelector('.dmf-initiation-protocol');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});});
      return;
    }

    if(!oracleState.blocker)oracleState.blocker=defaultBlocker(p);
    var profileHtml='<div class="dmf-oracle-profile"><div><span>'+c.mission+'</span><strong>'+valueLabel('mission',p.mission)+'</strong></div><div><span>'+c.system+'</span><strong>'+valueLabel('system',p.system)+'</strong></div><div><span>'+c.discipline+'</span><strong>'+valueLabel('discipline',p.discipline)+'</strong></div></div>';
    var opts=c.options.map(function(o){return '<button type="button" class="dmf-oracle-option'+(oracleState.blocker===o[0]?' is-selected':'')+'" data-oracle-block="'+o[0]+'">'+o[1]+'</button>';}).join('');
    right+=profileHtml+'<div class="dmf-oracle-prompt">'+c.prompt+'</div><div class="dmf-oracle-options">'+opts+'</div><div class="dmf-oracle-output"></div></div>';
    root.innerHTML='<div class="dmf-oracle-shell">'+left+right+'</div>';

    root.querySelectorAll('.dmf-oracle-option').forEach(function(btn){btn.addEventListener('click',function(){oracleState.blocker=btn.getAttribute('data-oracle-block');saveOracle();render(root,seal);});});

    var idx=blockerMap[oracleState.blocker];
    var g=guidance[lang()][oracleState.blocker];
    var output=root.querySelector('.dmf-oracle-output');
    if(typeof idx==='number'&&g){
      output.innerHTML='<div class="dmf-oracle-transmission">'+c.transmission+' // MODULE '+String(idx+1).padStart(2,'0')+'</div><div class="dmf-oracle-module">'+names[idx]+'</div><div class="dmf-oracle-directive">'+g.directive+'</div><div class="dmf-oracle-artifact"><strong>'+c.artifact+'</strong> // '+g.artifact+'</div>';
      output.classList.add('is-ready');
      highlightModule(idx);
      seal.innerHTML='<i></i> ORACLE // MODULE '+String(idx+1).padStart(2,'0')+' // SIGNAL ACTIVE';
      seal.classList.add('is-visible');
    }
  }

  function mount(){
    var academy=document.getElementById('academy');
    var codex=document.querySelector('.dmf-initiation-protocol');
    if(!academy||!codex||document.querySelector('.dmf-oracle'))return;
    loadOracle();

    var root=document.createElement('div');
    root.className='dmf-oracle';
    root.setAttribute('aria-label','DMF Oracle guidance engine');
    codex.insertAdjacentElement('afterend',root);

    var seal=document.createElement('div');
    seal.className='dmf-oracle-seal';
    document.body.appendChild(seal);

    render(root,seal);

    document.addEventListener('click',function(e){
      if(e.target.closest('.dmf-codex-option')||e.target.closest('.dmf-codex-reset'))setTimeout(function(){render(root,seal);},40);
    });

    var observer=new MutationObserver(function(){setTimeout(function(){render(root,seal);},20);});
    observer.observe(codex,{childList:true,subtree:true});

    var langBtn=document.querySelector('.lang-btn');
    if(langBtn&&'MutationObserver'in window)new MutationObserver(function(){setTimeout(function(){render(root,seal);},0);}).observe(langBtn,{childList:true,subtree:true,characterData:true});

    if('IntersectionObserver'in window){
      var io=new IntersectionObserver(function(entries){if(!entries[0].isIntersecting)seal.classList.remove('is-visible');else if(profileReady(profile())&&oracleState.blocker)seal.classList.add('is-visible');},{threshold:.05});
      io.observe(academy);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(mount,0);},{once:true});else setTimeout(mount,0);
})();
</script>`;

if (!html.includes(HEAD_MARKER)) {
  if (!html.includes('</head>')) throw new Error('DMF Oracle: </head> not found');
  html = html.replace('</head>', `${headInjection}\n</head>`);
}

if (!html.includes(BODY_MARKER)) {
  if (!html.includes('</body>')) throw new Error('DMF Oracle: </body> not found');
  html = html.replace('</body>', `${bodyInjection}\n</body>`);
}

fs.writeFileSync(target, html, 'utf8');
console.log('DMF Oracle guidance engine injected into public/index.html');
