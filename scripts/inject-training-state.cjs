const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'public', 'index.html');
if (!fs.existsSync(target)) throw new Error('DMF Training State: public/index.html not found. Run previous injectors first.');

let html = fs.readFileSync(target, 'utf8');

const HEAD_MARKER = '<!-- DMF_TRAINING_STATE_HEAD -->';
const BODY_MARKER = '<!-- DMF_TRAINING_STATE_BODY -->';

const headInjection = `${HEAD_MARKER}
<style>
/* DMF MEMORY CORE 11 // persistent student training state */
.dmf-training-memory{position:relative;overflow:hidden;margin:0 0 clamp(52px,7vw,86px);border:1px solid rgba(255,91,30,.20);background:radial-gradient(circle at 12% 12%,rgba(255,91,30,.10),transparent 27%),radial-gradient(circle at 84% 72%,rgba(81,224,193,.06),transparent 30%),linear-gradient(145deg,#080705,#0a0908 56%,#060808);box-shadow:0 42px 120px rgba(0,0,0,.34),inset 0 0 0 1px rgba(242,237,230,.02)}
.dmf-training-memory::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at 40% 35%,black,transparent 78%);opacity:.32}
.dmf-memory-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(270px,.68fr) minmax(480px,1.32fr)}
.dmf-memory-copy{padding:clamp(32px,4.6vw,62px);border-right:1px solid rgba(242,237,230,.07);display:flex;flex-direction:column;justify-content:center}
.dmf-memory-kicker{font-size:9px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#ff6a32}
.dmf-memory-title{font-family:'Anton',sans-serif;font-size:clamp(42px,5.2vw,78px);font-weight:400;line-height:.9;text-transform:uppercase;color:#f2ede6;margin:16px 0 0;max-width:9ch}
.dmf-memory-lede{margin-top:20px;max-width:470px;color:#aaa19a;font-size:14px;line-height:1.72}
.dmf-memory-gate{margin-top:26px;padding-top:17px;border-top:1px solid rgba(242,237,230,.08);font-size:8px;letter-spacing:.16em;line-height:1.8;text-transform:uppercase;color:#716a64}
.dmf-memory-gate strong{color:#ff8051;font-weight:700}
.dmf-memory-console{padding:clamp(30px,4.4vw,58px)}
.dmf-memory-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}
.dmf-memory-head strong{font-family:'Anton',sans-serif;font-size:20px;font-weight:400;letter-spacing:.06em;text-transform:uppercase;color:#f2ede6}
.dmf-memory-online{display:inline-flex;align-items:center;gap:7px;font-size:7px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:#7aaea4}
.dmf-memory-online::before{content:'';width:6px;height:6px;border-radius:50%;background:#51e0c1;box-shadow:0 0 11px rgba(81,224,193,.65);animation:dmfMemoryPulse 2s ease-in-out infinite}
@keyframes dmfMemoryPulse{0%,100%{opacity:.35}50%{opacity:1}}
.dmf-memory-stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid rgba(242,237,230,.08);margin-bottom:15px}
.dmf-memory-stat{padding:13px 12px;border-right:1px solid rgba(242,237,230,.07);min-width:0}
.dmf-memory-stat:last-child{border-right:0}
.dmf-memory-stat span{display:block;font-size:7px;letter-spacing:.16em;text-transform:uppercase;color:#5e5853;margin-bottom:6px}
.dmf-memory-stat b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#bbb3ac;font-size:10px;font-weight:600}
.dmf-memory-task{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.dmf-memory-card{border:1px solid rgba(242,237,230,.08);background:rgba(255,255,255,.014);padding:15px}
.dmf-memory-card label{display:block;font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#635d57;margin-bottom:8px}
.dmf-memory-card p{margin:0;color:#aaa29b;font-size:12px;line-height:1.65}
.dmf-memory-card.is-evidence{border-color:rgba(255,91,30,.20)}
.dmf-memory-card.is-evidence label{color:#d06c47}
.dmf-memory-path{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;margin-top:15px}
.dmf-memory-node{position:relative;min-height:54px;border:1px solid rgba(242,237,230,.07);background:rgba(255,255,255,.01);padding:9px 7px;transition:.2s ease}
.dmf-memory-node span{display:block;font-size:7px;letter-spacing:.12em;color:#534e49}
.dmf-memory-node b{display:block;margin-top:7px;font-size:7px;line-height:1.25;color:#77706a;font-weight:600;text-transform:uppercase}
.dmf-memory-node[data-state="active"]{border-color:rgba(81,224,193,.45);background:rgba(81,224,193,.055);box-shadow:inset 0 0 22px rgba(81,224,193,.035)}
.dmf-memory-node[data-state="active"] span,.dmf-memory-node[data-state="active"] b{color:#77d8c4}
.dmf-memory-node[data-state="review"]{border-color:rgba(255,91,30,.52);background:rgba(255,91,30,.055)}
.dmf-memory-node[data-state="review"] span,.dmf-memory-node[data-state="review"] b{color:#ff8b60}
.dmf-memory-node[data-state="seen"]{border-color:rgba(242,237,230,.12)}
.dmf-memory-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.dmf-memory-actions button{border:1px solid rgba(242,237,230,.12);background:rgba(255,255,255,.015);color:#978f88;padding:10px 12px;font:700 8px/1 'Archivo',sans-serif;letter-spacing:.13em;text-transform:uppercase;cursor:pointer;transition:.2s ease}
.dmf-memory-actions button[data-action="evidence"]{border-color:rgba(255,91,30,.38);color:#ff8b60}
.dmf-memory-actions button:hover{transform:translateY(-1px);border-color:rgba(242,237,230,.28);color:#ddd5ce}
.dmf-memory-actions button:disabled{cursor:default;opacity:.55;transform:none}
.dmf-memory-timeline{margin-top:18px;padding-top:15px;border-top:1px solid rgba(242,237,230,.07)}
.dmf-memory-timeline-head{font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#534e49;margin-bottom:8px}
.dmf-memory-event{display:grid;grid-template-columns:54px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(242,237,230,.045);font-size:8px;color:#706963}
.dmf-memory-event:last-child{border-bottom:0}
.dmf-memory-event b{font-weight:600;color:#9c948d}
.dmf-memory-event em{font-style:normal;color:#57756e;font-size:7px;letter-spacing:.1em;text-transform:uppercase}
@media(max-width:900px){.dmf-memory-shell{grid-template-columns:1fr}.dmf-memory-copy{border-right:0;border-bottom:1px solid rgba(242,237,230,.07)}}
@media(max-width:650px){.dmf-memory-copy,.dmf-memory-console{padding:28px 20px}.dmf-memory-stats{grid-template-columns:1fr 1fr}.dmf-memory-stat:nth-child(2){border-right:0}.dmf-memory-stat:nth-child(-n+2){border-bottom:1px solid rgba(242,237,230,.07)}.dmf-memory-task{grid-template-columns:1fr}.dmf-memory-path{grid-template-columns:repeat(4,1fr)}}
@media(prefers-reduced-motion:reduce){.dmf-memory-online::before{animation:none}}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  var STATE_KEY='dmf_training_state_v1';
  var PROFILE_KEY='dmf_codex_profile_v1';
  var ORACLE_KEY='dmf_oracle_state_v1';
  var VERSION=1;
  var moduleNames={
    en:['Structure','Mixing','Sound','Bass','Workflow','Mindset','Market','Mastering'],
    es:['Estructura','Mezcla','Sonido','Bajos','Workflow','Mindset','Mercado','Mastering']
  };

  function now(){return Date.now();}
  function safeJSON(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(e){return null;}}
  function clean(v,max){return typeof v==='string'?v.trim().slice(0,max||600):'';}
  function blankModules(){return Array.from({length:8},function(_,i){return {module:i,status:'unseen',attempts:0,lastSeen:null};});}
  function defaultState(){return {version:VERSION,createdAt:now(),updatedAt:now(),currentModule:null,previousModule:null,blocker:'',bpm:null,stage:'',lastSignal:'',lastDiagnosis:'',activeDirective:'',requiredEvidence:'',evidenceStatus:'pending',mentorGate:'required',transmissions:0,modules:blankModules(),timeline:[]};}
  function normalize(raw){
    var base=defaultState(),s=raw&&typeof raw==='object'?raw:{};
    base.createdAt=Number(s.createdAt)||base.createdAt;base.updatedAt=Number(s.updatedAt)||base.updatedAt;
    base.currentModule=Number.isInteger(s.currentModule)&&s.currentModule>=0&&s.currentModule<8?s.currentModule:null;
    base.previousModule=Number.isInteger(s.previousModule)&&s.previousModule>=0&&s.previousModule<8?s.previousModule:null;
    base.blocker=clean(s.blocker,180);base.bpm=Number.isFinite(Number(s.bpm))?Number(s.bpm):null;base.stage=clean(s.stage,80);
    base.lastSignal=clean(s.lastSignal,700);base.lastDiagnosis=clean(s.lastDiagnosis,900);base.activeDirective=clean(s.activeDirective,900);base.requiredEvidence=clean(s.requiredEvidence,600);
    base.evidenceStatus=['pending','ready_for_review'].includes(s.evidenceStatus)?s.evidenceStatus:'pending';base.transmissions=Math.max(0,Number(s.transmissions)||0);
    if(Array.isArray(s.modules)&&s.modules.length===8){base.modules=s.modules.map(function(m,i){return {module:i,status:['unseen','seen','active','review'].includes(m&&m.status)?m.status:'unseen',attempts:Math.max(0,Number(m&&m.attempts)||0),lastSeen:Number(m&&m.lastSeen)||null};});}
    if(Array.isArray(s.timeline))base.timeline=s.timeline.slice(0,8).map(function(e){return {ts:Number(e.ts)||now(),module:Number.isInteger(e.module)?e.module:null,signal:clean(e.signal,180),stage:clean(e.stage,60),bpm:Number.isFinite(Number(e.bpm))?Number(e.bpm):null,type:clean(e.type,30)||'transmission'};});
    return base;
  }
  function read(){return normalize(safeJSON(STATE_KEY));}
  function write(state){state.updatedAt=now();try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch(e){}window.dispatchEvent(new CustomEvent('dmf:training-state',{detail:snapshot(state)}));return state;}
  function snapshot(input){var s=input||read();return {version:1,currentModule:s.currentModule,previousModule:s.previousModule,blocker:s.blocker,bpm:s.bpm,stage:s.stage,activeDirective:clean(s.activeDirective,420),requiredEvidence:clean(s.requiredEvidence,320),evidenceStatus:s.evidenceStatus,mentorGate:'required',transmissions:s.transmissions,moduleStates:s.modules.map(function(m){return {module:m.module,status:m.status,attempts:m.attempts};})};}
  function isSpanish(){var b=document.querySelector('.lang-btn');return !!(b&&String(b.textContent||'').trim().toUpperCase()==='EN');}
  function labels(){return isSpanish()?{kicker:'DMF // NÚCLEO DE MEMORIA 11',title:'EL SISTEMA RECUERDA',lede:'Cada transmisión actualiza tu estado de entrenamiento. El sistema conserva dónde estás, qué te bloqueó, qué debes ejecutar y qué evidencia falta antes de la revisión humana.',gate:'LA MEMORIA GUÍA. <strong>EL AVANCE REQUIERE REVISIÓN.</strong>',head:'ESTADO DE ENTRENAMIENTO',online:'MEMORIA ONLINE',module:'MÓDULO ACTIVO',blocker:'BLOQUEO',signals:'SEÑALES',status:'ESTADO',directive:'DIRECTIVA ACTIVA',evidence:'EVIDENCIA REQUERIDA',emptyDirective:'Envía una transmisión para generar una directiva de trabajo.',emptyEvidence:'La evidencia aparecerá después del diagnóstico.',evidenceReady:'EVIDENCIA LISTA PARA REVISIÓN',markEvidence:'MARCAR EVIDENCIA LISTA',open:'ABRIR MÓDULO ACTIVO',timeline:'MEMORIA RECIENTE',pending:'EN PRÁCTICA',review:'ESPERANDO REVISIÓN'}:{kicker:'DMF // MEMORY CORE 11',title:'THE SYSTEM REMEMBERS',lede:'Every transmission updates your training state. The system keeps where you are, what blocked you, what you must execute, and what evidence is still required before human review.',gate:'MEMORY GUIDES. <strong>ADVANCEMENT REQUIRES REVIEW.</strong>',head:'TRAINING STATE',online:'MEMORY ONLINE',module:'ACTIVE MODULE',blocker:'BLOCKER',signals:'SIGNALS',status:'STATUS',directive:'ACTIVE DIRECTIVE',evidence:'REQUIRED EVIDENCE',emptyDirective:'Send a transmission to generate an active training directive.',emptyEvidence:'Required evidence will appear after diagnosis.',evidenceReady:'EVIDENCE READY FOR REVIEW',markEvidence:'MARK EVIDENCE READY',open:'OPEN ACTIVE MODULE',timeline:'RECENT MEMORY',pending:'IN PRACTICE',review:'AWAITING REVIEW'};}

  function extractArtifact(el){if(!el)return '';var t=String(el.textContent||'').trim();var parts=t.split('//');return clean(parts.length>1?parts.slice(1).join('//'):t,600);}
  var lastSignature='';
  function captureTransmission(){
    var out=document.querySelector('.dmf-transmission-readout.is-ready');if(!out)return;
    var mod=out.querySelector('.dmf-transmission-module'),diag=out.querySelector('.dmf-transmission-diagnosis'),dir=out.querySelector('.dmf-transmission-directive'),art=out.querySelector('.dmf-transmission-artifact'),input=document.querySelector('.dmf-transmission-input');
    if(!mod||!diag||!dir)return;
    var match=String(mod.textContent||'').match(/^\s*(\d{1,2})/),idx=match?Math.max(0,Math.min(7,parseInt(match[1],10)-1)):null;if(idx===null)return;
    var metrics=Array.from(out.querySelectorAll('.dmf-transmission-metrics span')).map(function(n){return String(n.textContent||'').trim();});
    var bpm=null,stage='';metrics.forEach(function(v){var b=v.match(/^(\d{2,3})\s*BPM$/i);if(b)bpm=Number(b[1]);else if(!/DMF|VBC|LOCAL|UPLINK|COMPUTE/i.test(v)&&!stage)stage=clean(v,80);});
    var signal=clean(input&&input.value,700),diagnosis=clean(diag.textContent,900),directive=clean(dir.textContent,900),evidence=extractArtifact(art),signature=[idx,signal,diagnosis,directive,evidence].join('|');if(signature===lastSignature)return;lastSignature=signature;
    var s=read(),o=safeJSON(ORACLE_KEY)||{};
    if(s.currentModule!==null&&s.currentModule!==idx){s.previousModule=s.currentModule;if(s.modules[s.currentModule]&&s.modules[s.currentModule].status==='active')s.modules[s.currentModule].status='seen';}
    s.currentModule=idx;s.blocker=clean(o.blocker||s.blocker,180);s.bpm=bpm||s.bpm;s.stage=stage||s.stage;s.lastSignal=signal;s.lastDiagnosis=diagnosis;s.activeDirective=directive;s.requiredEvidence=evidence;s.evidenceStatus='pending';s.transmissions+=1;
    var m=s.modules[idx];m.status='active';m.attempts+=1;m.lastSeen=now();
    s.timeline.unshift({ts:now(),module:idx,signal:clean(signal,180),stage:s.stage,bpm:s.bpm,type:'transmission'});s.timeline=s.timeline.slice(0,8);
    write(s);render();
  }

  function markEvidenceReady(){var s=read();if(s.currentModule===null)return;s.evidenceStatus='ready_for_review';s.modules[s.currentModule].status='review';s.timeline.unshift({ts:now(),module:s.currentModule,signal:clean(s.requiredEvidence,180),stage:s.stage,bpm:s.bpm,type:'evidence'});s.timeline=s.timeline.slice(0,8);write(s);render();}
  function openModule(){var s=read();if(s.currentModule===null)return;var nodes=document.querySelectorAll('#modulesGrid .signal-node');if(nodes[s.currentModule])nodes[s.currentModule].scrollIntoView({behavior:'smooth',block:'center'});}

  function installFetchBridge(){
    if(window.__DMF_MEMORY_FETCH_WRAPPED)return;window.__DMF_MEMORY_FETCH_WRAPPED=true;var nativeFetch=window.fetch.bind(window);
    window.fetch=function(resource,options){
      try{
        var url=typeof resource==='string'?resource:(resource&&resource.url)||'';var opts=options||{};
        if(url.indexOf('/api/dmf/training')!==-1&&String(opts.method||'GET').toUpperCase()==='POST'&&typeof opts.body==='string'){
          var body=JSON.parse(opts.body);body.trainingState=snapshot();opts=Object.assign({},opts,{body:JSON.stringify(body)});return nativeFetch(resource,opts);
        }
      }catch(e){}
      return nativeFetch(resource,options);
    };
  }

  function makeNode(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function render(){
    var root=document.querySelector('.dmf-training-memory');if(!root)return;var s=read(),c=labels(),names=moduleNames[isSpanish()?'es':'en'];root.innerHTML='';
    var shell=makeNode('div','dmf-memory-shell');var copy=makeNode('div','dmf-memory-copy');var kicker=makeNode('div','dmf-memory-kicker',c.kicker);var title=makeNode('h3','dmf-memory-title',c.title);var lede=makeNode('p','dmf-memory-lede',c.lede);var gate=makeNode('div','dmf-memory-gate');gate.innerHTML=c.gate;copy.append(kicker,title,lede,gate);
    var consoleEl=makeNode('div','dmf-memory-console');var head=makeNode('div','dmf-memory-head');head.append(makeNode('strong','',c.head),makeNode('span','dmf-memory-online',c.online));consoleEl.appendChild(head);
    var stats=makeNode('div','dmf-memory-stats');
    var statData=[[c.module,s.currentModule===null?'—':String(s.currentModule+1).padStart(2,'0')+' / '+names[s.currentModule]],[c.blocker,s.blocker||'—'],[c.signals,String(s.transmissions)],[c.status,s.evidenceStatus==='ready_for_review'?c.review:c.pending]];
    statData.forEach(function(x){var st=makeNode('div','dmf-memory-stat');st.append(makeNode('span','',x[0]),makeNode('b','',x[1]));stats.appendChild(st);});consoleEl.appendChild(stats);
    var task=makeNode('div','dmf-memory-task');var d=makeNode('div','dmf-memory-card');d.append(makeNode('label','',c.directive),makeNode('p','',s.activeDirective||c.emptyDirective));var e=makeNode('div','dmf-memory-card is-evidence');e.append(makeNode('label','',c.evidence),makeNode('p','',s.requiredEvidence||c.emptyEvidence));task.append(d,e);consoleEl.appendChild(task);
    var pathEl=makeNode('div','dmf-memory-path');s.modules.forEach(function(m,i){var n=makeNode('div','dmf-memory-node');n.dataset.state=m.status;n.append(makeNode('span','',String(i+1).padStart(2,'0')),makeNode('b','',names[i]));pathEl.appendChild(n);});consoleEl.appendChild(pathEl);
    var actions=makeNode('div','dmf-memory-actions');var evidenceBtn=makeNode('button','',s.evidenceStatus==='ready_for_review'?c.evidenceReady:c.markEvidence);evidenceBtn.dataset.action='evidence';evidenceBtn.disabled=s.currentModule===null||s.evidenceStatus==='ready_for_review';evidenceBtn.addEventListener('click',markEvidenceReady);var openBtn=makeNode('button','',c.open);openBtn.disabled=s.currentModule===null;openBtn.addEventListener('click',openModule);actions.append(evidenceBtn,openBtn);consoleEl.appendChild(actions);
    if(s.timeline.length){var tl=makeNode('div','dmf-memory-timeline');tl.appendChild(makeNode('div','dmf-memory-timeline-head',c.timeline));s.timeline.slice(0,4).forEach(function(ev){var row=makeNode('div','dmf-memory-event');row.append(makeNode('span','',ev.module===null?'—':'M'+String(ev.module+1).padStart(2,'0')),makeNode('b','',ev.type==='evidence'?(c.evidenceReady):clean(ev.signal,90)||'Signal'),makeNode('em','',ev.type==='evidence'?'review':(ev.bpm?ev.bpm+' BPM':ev.stage||'signal')));tl.appendChild(row);});consoleEl.appendChild(tl);}
    shell.append(copy,consoleEl);root.appendChild(shell);
  }

  function mount(){
    installFetchBridge();var transmission=document.querySelector('.dmf-transmission');if(!transmission)return;
    if(!document.querySelector('.dmf-training-memory')){var root=document.createElement('div');root.className='dmf-training-memory';root.setAttribute('aria-label','DMF persistent student training memory');transmission.insertAdjacentElement('afterend',root);}render();
    var out=document.querySelector('.dmf-transmission-readout');if(out&&'MutationObserver' in window)new MutationObserver(function(){setTimeout(captureTransmission,0);}).observe(out,{childList:true,subtree:true,characterData:true,attributes:true});
    var langBtn=document.querySelector('.lang-btn');if(langBtn&&'MutationObserver' in window)new MutationObserver(function(){setTimeout(render,0);}).observe(langBtn,{childList:true,subtree:true,characterData:true});
    window.addEventListener('storage',function(ev){if(ev.key===STATE_KEY)render();});
  }

  window.DMFTrainingState={read:read,snapshot:function(){return snapshot();},markEvidenceReady:markEvidenceReady};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
</script>`;

if (!html.includes(HEAD_MARKER)) {
  if (!html.includes('</head>')) throw new Error('DMF Training State: </head> not found');
  html = html.replace('</head>', `${headInjection}\n</head>`);
}

if (!html.includes(BODY_MARKER)) {
  if (!html.includes('</body>')) throw new Error('DMF Training State: </body> not found');
  html = html.replace('</body>', `${bodyInjection}\n</body>`);
}

fs.writeFileSync(target, html, 'utf8');
console.log('DMF persistent training memory injected into public/index.html');
