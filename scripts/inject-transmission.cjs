const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'public', 'index.html');
if (!fs.existsSync(target)) throw new Error('DMF Transmission: public/index.html not found. Run previous injectors first.');

let html = fs.readFileSync(target, 'utf8');

const HEAD_MARKER = '<!-- DMF_TRANSMISSION_HEAD -->';
const BODY_MARKER = '<!-- DMF_TRANSMISSION_BODY -->';

const headInjection = `${HEAD_MARKER}
<style>
/* DMF TRANSMISSION 10 // natural-language training interface */
.dmf-transmission{position:relative;overflow:hidden;margin:0 0 clamp(52px,7vw,86px);border:1px solid rgba(81,224,193,.20);background:radial-gradient(circle at 78% 18%,rgba(81,224,193,.09),transparent 26%),radial-gradient(circle at 14% 78%,rgba(132,152,255,.10),transparent 30%),linear-gradient(145deg,#060808,#0a0908 56%,#070605);box-shadow:0 42px 120px rgba(0,0,0,.36),inset 0 0 0 1px rgba(242,237,230,.02)}
.dmf-transmission::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px);background-size:30px 30px;mask-image:radial-gradient(circle at 70% 30%,black,transparent 74%);opacity:.38}
.dmf-transmission::after{content:'';position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,#51e0c1 32%,#8498ff 68%,transparent);box-shadow:0 0 20px rgba(81,224,193,.36);animation:dmfTransmitSweep 8.5s ease-in-out infinite;opacity:.62}
@keyframes dmfTransmitSweep{0%,100%{transform:translateY(10px)}50%{transform:translateY(620px)}}
.dmf-transmission-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(280px,.72fr) minmax(460px,1.28fr)}
.dmf-transmission-copy{padding:clamp(32px,4.6vw,62px);border-right:1px solid rgba(242,237,230,.07);display:flex;flex-direction:column;justify-content:center}
.dmf-transmission-kicker{font-size:9px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#51e0c1}
.dmf-transmission-title{font-family:'Anton',sans-serif;font-size:clamp(42px,5.6vw,82px);font-weight:400;line-height:.9;text-transform:uppercase;color:#f2ede6;margin-top:16px;max-width:8ch}
.dmf-transmission-lede{margin-top:20px;max-width:480px;color:#aaa19a;font-size:14px;line-height:1.72}
.dmf-transmission-chain{margin-top:26px;padding-top:18px;border-top:1px solid rgba(242,237,230,.08);font-size:8px;letter-spacing:.17em;text-transform:uppercase;color:#625c56;line-height:2}
.dmf-transmission-chain strong{color:#b9b1aa;font-weight:600}
.dmf-transmission-listener{margin-top:28px;display:flex;align-items:center;gap:12px;color:#6d7775;font-size:8px;letter-spacing:.18em;text-transform:uppercase}
.dmf-transmission-listener i{position:relative;width:42px;height:42px;border-radius:50%;border:1px solid rgba(81,224,193,.25);display:block}
.dmf-transmission-listener i::before,.dmf-transmission-listener i::after{content:'';position:absolute;border-radius:50%;border:1px solid rgba(81,224,193,.22);inset:8px;animation:dmfListen 2.8s ease-in-out infinite}
.dmf-transmission-listener i::after{inset:15px;animation-delay:.5s}
@keyframes dmfListen{0%,100%{opacity:.25;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}
.dmf-transmission-console{padding:clamp(32px,4.6vw,62px)}
.dmf-transmission-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
.dmf-transmission-head strong{font-family:'Anton',sans-serif;font-size:19px;font-weight:400;letter-spacing:.07em;text-transform:uppercase;color:#f2ede6}
.dmf-transmission-status{display:flex;align-items:center;gap:7px;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#70a89d}
.dmf-transmission-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#51e0c1;box-shadow:0 0 12px rgba(81,224,193,.72);animation:dmfTransmitPulse 1.8s ease-in-out infinite}
@keyframes dmfTransmitPulse{0%,100%{opacity:.35}50%{opacity:1}}
.dmf-transmission-context{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}
.dmf-transmission-context span{padding:6px 8px;border:1px solid rgba(242,237,230,.08);font-size:7px;letter-spacing:.15em;text-transform:uppercase;color:#69625d;background:rgba(255,255,255,.012)}
.dmf-transmission-context span b{color:#a9a099;font-weight:600}
.dmf-transmission-input-wrap{position:relative;border:1px solid rgba(242,237,230,.13);background:rgba(255,255,255,.018);transition:border-color .2s,box-shadow .2s}
.dmf-transmission-input-wrap:focus-within{border-color:rgba(81,224,193,.52);box-shadow:0 0 28px rgba(81,224,193,.055)}
.dmf-transmission-input{display:block;width:100%;min-height:126px;resize:vertical;border:0;outline:0;background:transparent;color:#e9e2dc;padding:18px 18px 48px;font:500 14px/1.65 'Archivo',sans-serif}
.dmf-transmission-input::placeholder{color:#5f5a55}
.dmf-transmission-counter{position:absolute;left:16px;bottom:13px;font-size:7px;letter-spacing:.15em;text-transform:uppercase;color:#504b47}
.dmf-transmission-send{position:absolute;right:10px;bottom:9px;border:1px solid rgba(81,224,193,.42);background:rgba(81,224,193,.07);color:#77ead2;padding:9px 12px;font:700 8px/1 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:.2s ease}
.dmf-transmission-send:hover{background:#51e0c1;color:#06100e;transform:translateY(-1px)}
.dmf-transmission-send:disabled{opacity:.38;cursor:wait;transform:none}
.dmf-transmission-examples{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
.dmf-transmission-example{border:0;background:none;color:#697672;padding:3px 0;font:600 8px/1.4 'Archivo',sans-serif;letter-spacing:.08em;cursor:pointer;text-align:left}
.dmf-transmission-example:hover{color:#8edccb}
.dmf-transmission-example::before{content:'↳ ';color:#51e0c1}
.dmf-transmission-readout{display:none;margin-top:22px;border:1px solid rgba(81,224,193,.22);background:linear-gradient(135deg,rgba(81,224,193,.035),rgba(132,152,255,.025));padding:20px}
.dmf-transmission-readout.is-ready{display:block;animation:dmfTransmitReveal .42s ease-out both}
@keyframes dmfTransmitReveal{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.dmf-transmission-readout-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.dmf-transmission-tag{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#51e0c1}
.dmf-transmission-confidence{font-size:7px;letter-spacing:.16em;text-transform:uppercase;color:#6b7471}
.dmf-transmission-module{font-family:'Anton',sans-serif;font-size:clamp(24px,3vw,38px);font-weight:400;text-transform:uppercase;color:#f2ede6;margin-top:7px}
.dmf-transmission-metrics{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
.dmf-transmission-metrics span{padding:6px 8px;border:1px solid rgba(242,237,230,.08);font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:#77706a}
.dmf-transmission-diagnosis{margin-top:14px;font-size:13px;line-height:1.68;color:#aaa29b}
.dmf-transmission-directive{margin-top:14px;padding:14px 15px;border-left:2px solid #51e0c1;background:rgba(81,224,193,.025);font-size:13px;line-height:1.68;color:#c2bab3}
.dmf-transmission-artifact{margin-top:13px;padding-top:12px;border-top:1px solid rgba(242,237,230,.08);font-size:9px;line-height:1.6;letter-spacing:.1em;text-transform:uppercase;color:#77706a}
.dmf-transmission-artifact strong{color:#ff8b60}
.dmf-transmission-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}
.dmf-transmission-actions button{border:1px solid rgba(242,237,230,.12);background:rgba(255,255,255,.015);color:#9d958e;padding:9px 11px;font:700 8px/1 'Archivo',sans-serif;letter-spacing:.13em;text-transform:uppercase;cursor:pointer}
.dmf-transmission-actions button:first-child{border-color:rgba(81,224,193,.35);color:#76d8c4}
.dmf-transmission-history{margin-top:20px;padding-top:16px;border-top:1px solid rgba(242,237,230,.07)}
.dmf-transmission-history-head{font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#514c48;margin-bottom:8px}
.dmf-transmission-history-list{display:grid;gap:5px}
.dmf-transmission-history-item{display:flex;justify-content:space-between;gap:12px;padding:8px 9px;background:rgba(255,255,255,.012);font-size:8px;color:#6f6963;cursor:pointer}
.dmf-transmission-history-item:hover{color:#9f9891}
.dmf-transmission-history-item span:last-child{color:#536d67;white-space:nowrap}
.signal-node.is-transmission-active{padding-left:18px;background:linear-gradient(90deg,rgba(81,224,193,.09),rgba(132,152,255,.035),transparent 62%)}
.signal-node.is-transmission-active::before{background:#51e0c1!important;border-color:#51e0c1!important;box-shadow:0 0 24px rgba(81,224,193,.65)!important}
.signal-node.is-transmission-active::after{content:attr(data-transmission);display:inline-block;margin-top:9px;padding:5px 7px;border:1px solid rgba(81,224,193,.3);font-size:7px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:#76d8c4}
@media(max-width:860px){.dmf-transmission-shell{grid-template-columns:1fr}.dmf-transmission-copy{border-right:0;border-bottom:1px solid rgba(242,237,230,.07)}}
@media(max-width:560px){.dmf-transmission-copy,.dmf-transmission-console{padding:28px 20px}.dmf-transmission-head,.dmf-transmission-readout-top{align-items:flex-start;flex-direction:column}.dmf-transmission-send{position:static;margin:0 14px 14px}.dmf-transmission-counter{display:none}.dmf-transmission-input{padding-bottom:16px}}
@media(prefers-reduced-motion:reduce){.dmf-transmission::after,.dmf-transmission-listener i::before,.dmf-transmission-listener i::after,.dmf-transmission-status::before{animation:none}}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  var PROFILE_KEY='dmf_codex_profile_v1';
  var ORACLE_KEY='dmf_oracle_state_v1';
  var HISTORY_KEY='dmf_transmission_history_v1';

  var moduleNames={
    en:['Track structure & development','Mixing & balance','Sound Selection','Bass creation','Workflow & efficiency','Producer Mindset','Music Market','Mastering & final prep'],
    es:['Estructura y desarrollo de un track','Mixing y balance','Sound Selection','Creación de bajos','Workflow y eficiencia','Producer Mindset','Music Market','Mastering y preparación final']
  };

  var rules=[
    {module:0,keys:['structure','arrangement','arrange','intro','break','build','drop','energy','estructura','arreglo','intro','quiebre','subida','caida','caída','energia','energía']},
    {module:1,keys:['mix','mixing','balance','muddy','harsh','masking','mezcla','balance','opaco','sucio','enmascara','fuerte','volumen']},
    {module:2,keys:['sound','sample','synth','texture','timbre','selection','sonido','sample','sinte','textura','timbre','seleccion','selección']},
    {module:3,keys:['bass','kick','low end','low-end','sub','bajo','bombo','grave','graves','subgrave']},
    {module:4,keys:['workflow','slow','organize','template','decision','lento','orden','organizar','plantilla','decision','decisión','demoro','demora']},
    {module:5,keys:['finish','unfinished','stuck','blocked','procrast','terminar','termino','incompleto','bloqueado','bloqueo','posterg','traba','trabado']},
    {module:6,keys:['label','labels','demo','release','pitch','sello','sellos','lanzamiento','enviar','presentar','outreach']},
    {module:7,keys:['master','mastering','limiter','lufs','loudness','premaster','pre-master','masterizar','limitador','volumen final']}
  ];

  var guidance={
    en:[
      {diagnosis:'The problem reads as an arrangement and energy-flow issue. The track needs a clearer structural intention before more sound design.',directive:'Mark the exact section where momentum dies. Reduce the problem to 16–32 bars, identify what changes before and after the drop, and rebuild the energy transition before adding new elements.',artifact:'Bring the project with arrangement markers visible and one reference track with a transition you trust.'},
      {diagnosis:'The signal points to balance and frequency ownership rather than a lack of processing.',directive:'Freeze new plugin decisions. Compare the current bounce at matched loudness, then isolate the three elements competing most for space. Correct level and masking before adding processing.',artifact:'Bring the project + latest stereo bounce + one commercial reference.'},
      {diagnosis:'The weakness appears to come from source choice. Better processing will not rescue a sound that does not fit its role.',directive:'Loop the weakest 16 bars. Solo the essential roles, then audition replacements one role at a time. Keep only sounds that improve the section before processing.',artifact:'Bring the 16-bar section and the candidate sounds or instruments you are considering.'},
      {diagnosis:'The low-end relationship is unstable. Kick and bass are behaving as separate objects instead of one rhythmic system.',directive:'Work on kick and bass before the rest of the mix. Inspect timing, envelope, octave and frequency overlap. Make the groove readable at low volume before adding weight.',artifact:'Bring kick and bass on separate editable channels and a bounce with no mastering chain.'},
      {diagnosis:'The bottleneck is procedural. Too many open decisions are consuming time that should become repetitions.',directive:'Document the last five decisions that slowed the session. Turn repeatable choices into defaults, then define a fixed order for the next 45-minute production block.',artifact:'Bring one project where you repeatedly lose momentum and your current template if you use one.'},
      {diagnosis:'The signal is a closure problem. The project likely needs fewer possibilities and a finish criterion.',directive:'Define what “finished enough” means for this track. Lock sound selection, write the remaining tasks as a maximum of five decisions, and do not reopen solved sections until the list is complete.',artifact:'Bring the unfinished project you have avoided the longest and a current bounce.'},
      {diagnosis:'The issue has moved from production into positioning. The track must be tested against the context of the labels you want to approach.',directive:'Choose three realistic target labels. Compare your track against their recent releases for arrangement, sonic density and identity. Fix fit before writing outreach.',artifact:'Bring one finished track + three target labels + one recent release from each.'},
      {diagnosis:'The signal belongs to final preparation. The first question is whether the mix is ready to be mastered at all.',directive:'Bypass the final limiter and inspect headroom, tonal balance and transient integrity. Correct mix problems in the mix, then print a clean pre-master for mastering decisions.',artifact:'Bring pre-master WAV + original project + current mastered reference.'}
    ],
    es:[
      {diagnosis:'El problema se lee como estructura y flujo de energía. El track necesita una intención de arreglo más clara antes de sumar más diseño sonoro.',directive:'Marca el punto exacto donde muere el impulso. Reduce el problema a 16–32 compases, identifica qué cambia antes y después del drop y reconstruye la transición de energía antes de agregar elementos.',artifact:'Trae el proyecto con marcadores de arreglo visibles y un track de referencia con una transición que confíes.'},
      {diagnosis:'La señal apunta a balance y propiedad de frecuencias más que a falta de procesamiento.',directive:'Congela nuevas decisiones de plugins. Compara el bounce actual a volumen igualado y aísla los tres elementos que más compiten por espacio. Corrige nivel y enmascaramiento antes de procesar más.',artifact:'Trae el proyecto + último bounce estéreo + una referencia comercial.'},
      {diagnosis:'La debilidad parece venir de la fuente elegida. Más procesamiento no rescata un sonido que no cumple su función.',directive:'Lopea los 16 compases más débiles. Deja solo los roles esenciales y prueba reemplazos de a uno. Conserva únicamente los sonidos que mejoren la sección antes del procesamiento.',artifact:'Trae la sección de 16 compases y los sonidos o instrumentos candidatos.'},
      {diagnosis:'La relación del low-end es inestable. Kick y bajo están funcionando como objetos separados en vez de un solo sistema rítmico.',directive:'Trabaja kick y bajo antes que el resto de la mezcla. Revisa timing, envolvente, octava y solapamiento de frecuencias. Haz que el groove se entienda a bajo volumen antes de agregar peso.',artifact:'Trae kick y bajo en canales separados y editables, más un bounce sin cadena de mastering.'},
      {diagnosis:'El cuello de botella es procedural. Demasiadas decisiones abiertas consumen el tiempo que debería transformarse en repetición.',directive:'Anota las últimas cinco decisiones que frenaron la sesión. Convierte las decisiones repetibles en defaults y define un orden fijo para el siguiente bloque de 45 minutos.',artifact:'Trae un proyecto donde pierdas impulso repetidamente y tu template actual si usas uno.'},
      {diagnosis:'La señal es un problema de cierre. El proyecto probablemente necesita menos posibilidades y un criterio concreto de término.',directive:'Define qué significa “suficientemente terminado” para este track. Cierra la selección de sonidos, escribe un máximo de cinco decisiones pendientes y no reabras secciones resueltas hasta completar la lista.',artifact:'Trae el proyecto sin terminar que más tiempo llevas evitando y un bounce actual.'},
      {diagnosis:'El problema ya pasó de producción a posicionamiento. El track debe probarse contra el contexto de los sellos a los que quieres llegar.',directive:'Elige tres sellos objetivo realistas. Compara tu track con sus lanzamientos recientes en arreglo, densidad sonora e identidad. Corrige encaje antes de redactar outreach.',artifact:'Trae un track terminado + tres sellos objetivo + un lanzamiento reciente de cada uno.'},
      {diagnosis:'La señal pertenece a preparación final. La primera pregunta es si la mezcla realmente está lista para masterizar.',directive:'Bypassea el limiter final y revisa headroom, balance tonal e integridad de transientes. Corrige problemas de mezcla dentro de la mezcla y luego imprime un pre-master limpio.',artifact:'Trae pre-master WAV + proyecto original + referencia masterizada actual.'}
    ]
  };

  function lang(){
    var btn=document.querySelector('.lang-btn');
    return btn && btn.textContent.trim().toUpperCase()==='EN' ? 'es':'en';
  }

  function safeJSON(key){
    try{return JSON.parse(localStorage.getItem(key)||'null');}catch(e){return null;}
  }

  function norm(text){
    return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function scoreText(text){
    var t=norm(text), scores=[0,0,0,0,0,0,0,0];
    rules.forEach(function(rule){rule.keys.forEach(function(k){var kk=norm(k);if(t.indexOf(kk)>-1)scores[rule.module]+=kk.indexOf(' ')>-1?3:2;});});
    if(/drop/.test(t)) scores[0]+=3;
    if(/no (funciona|works)|doesn.t work|no pega|sin fuerza/.test(t)){scores[0]+=2;scores[2]+=1;}
    if(/no (termino|acabo)|can.t finish|cannot finish/.test(t)) scores[5]+=5;
    var best=0;for(var i=1;i<scores.length;i++)if(scores[i]>scores[best])best=i;
    return {module:best,score:scores[best],scores:scores};
  }

  function inferFromState(){
    var oracle=safeJSON(ORACLE_KEY)||{};
    var blockerMap={structure:0,mix:1,sound:2,bass:3,workflow:4,finish:5,labels:6,mastering:7};
    if(oracle.blocker && blockerMap[oracle.blocker]!==undefined)return blockerMap[oracle.blocker];
    var p=safeJSON(PROFILE_KEY)||{};
    var missionMap={finish:0,mix:1,workflow:4,labels:6};
    return missionMap[p.mission]!==undefined?missionMap[p.mission]:0;
  }

  function parseBpm(text){
    var m=String(text||'').match(/(?:^|\D)([7-9]\d|1\d\d)\s*(?:bpm)?\b/i);
    if(!m)return null;var n=parseInt(m[1],10);return n>=70&&n<=190?n:null;
  }

  function parseStage(text){
    var t=norm(text);
    var pairs=[['drop','DROP'],['break','BREAK'],['intro','INTRO'],['build','BUILD'],['outro','OUTRO'],['mezcla','MIX'],['mix','MIX'],['master','MASTER'],['bajo','LOW-END'],['bass','LOW-END']];
    for(var i=0;i<pairs.length;i++)if(t.indexOf(norm(pairs[i][0]))>-1)return pairs[i][1];
    return null;
  }

  function confidence(score){return score>=6?'HIGH':score>=3?'MEDIUM':'ASSISTED';}

  function localAnalyze(text){
    var l=lang(), scored=scoreText(text), module=scored.score?scored.module:inferFromState();
    var g=guidance[l][module], bpm=parseBpm(text), stage=parseStage(text);
    return {source:'DMF LOCAL METHOD ENGINE',module:module,bpm:bpm,stage:stage,confidence:confidence(scored.score),diagnosis:g.diagnosis,directive:g.directive,artifact:g.artifact};
  }

  function endpoint(){return window.DMF_TRAINING_ENDPOINT || '';}

  function remoteAnalyze(text){
    var url=endpoint();if(!url)return Promise.resolve(null);
    var payload={text:text,lang:lang(),profile:safeJSON(PROFILE_KEY),oracle:safeJSON(ORACLE_KEY)};
    return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){if(!r.ok)throw new Error('uplink');return r.json();})
      .then(function(data){
        if(!data || typeof data.moduleIndex!=='number')return null;
        var fallback=localAnalyze(text);
        return {source:'DMF AI UPLINK',module:Math.max(0,Math.min(7,data.moduleIndex)),bpm:data.bpm||fallback.bpm,stage:data.stage||fallback.stage,confidence:data.confidence||'AI',diagnosis:data.diagnosis||fallback.diagnosis,directive:data.directive||fallback.directive,artifact:data.artifact||fallback.artifact};
      }).catch(function(){return null;});
  }

  function labels(){
    return lang()==='es'?{
      kicker:'DMF // TRANSMISIÓN 10',title:'EL SISTEMA ESCUCHA',lede:'Describe el problema con tus propias palabras. La interfaz lee tu señal, la cruza con el Códex y el Oracle, y la traduce a una acción dentro de la fórmula DMF.',chain:'ENTRADA HUMANA → LECTURA DE SEÑAL → MÓDULO → DIRECTIVA → SESIÓN',listener:'CANAL DE ENTRENAMIENTO ABIERTO',head:'ENVÍA TU SEÑAL',online:'LISTENING',placeholder:'Ej: Tengo un track a 126 BPM. Llegué al drop, pero pierde fuerza y no sé si el problema es el arreglo o los sonidos…',send:'TRANSMITIR',examples:['Tengo un track a 126 BPM y el drop no funciona','Mi mezcla está embarrada y kick/bajo chocan','Tengo muchos loops pero nunca termino tracks'],parsed:'SEÑAL INTERPRETADA',bring:'LLEVA A LA SESIÓN',open:'ABRIR MÓDULO',again:'NUEVA TRANSMISIÓN',history:'MEMORIA DE SEÑAL',empty:'Escribe al menos 12 caracteres para transmitir.',profile:'CÓDEX',oracle:'ORACLE',uplink:'UPLINK',local:'LOCAL'}:{
      kicker:'DMF // TRANSMISSION 10',title:'THE SYSTEM LISTENS',lede:'Describe the problem in your own words. The interface reads your signal, crosses it with Codex and Oracle context, and translates it into an action inside the DMF formula.',chain:'HUMAN INPUT → SIGNAL READ → MODULE → DIRECTIVE → SESSION',listener:'TRAINING CHANNEL OPEN',head:'TRANSMIT YOUR SIGNAL',online:'LISTENING',placeholder:'Example: I have a track at 126 BPM. I reached the drop, but it loses energy and I do not know if the problem is arrangement or sound choice…',send:'TRANSMIT',examples:['I have a track at 126 BPM and the drop does not work','My mix is muddy and kick/bass are fighting','I have lots of loops but I never finish tracks'],parsed:'SIGNAL INTERPRETED',bring:'BRING TO SESSION',open:'OPEN MODULE',again:'NEW TRANSMISSION',history:'SIGNAL MEMORY',empty:'Write at least 12 characters before transmitting.',profile:'CODEX',oracle:'ORACLE',uplink:'UPLINK',local:'LOCAL'};
  }

  function contextHTML(){
    var c=labels(),p=safeJSON(PROFILE_KEY)||{},o=safeJSON(ORACLE_KEY)||{};
    return '<span>'+c.profile+' <b>'+(p.mission||'—')+'</b></span><span>DAW <b>'+(p.system||'—')+'</b></span><span>'+c.oracle+' <b>'+(o.blocker||'—')+'</b></span><span>'+c.uplink+' <b>'+(endpoint()?'READY':c.local)+'</b></span>';
  }

  function clearModule(){document.querySelectorAll('#modulesGrid .signal-node').forEach(function(n){n.classList.remove('is-transmission-active');n.removeAttribute('data-transmission');});}
  function highlightModule(idx){
    clearModule();var nodes=document.querySelectorAll('#modulesGrid .signal-node');if(nodes[idx]){nodes[idx].classList.add('is-transmission-active');nodes[idx].setAttribute('data-transmission','TRANSMISSION ACTIVE');}
  }

  function loadHistory(){var h=safeJSON(HISTORY_KEY);return Array.isArray(h)?h:[];}
  function saveHistory(text,result){
    var h=loadHistory();h.unshift({text:text,module:result.module,ts:Date.now()});h=h.slice(0,3);try{localStorage.setItem(HISTORY_KEY,JSON.stringify(h));}catch(e){}return h;
  }

  function historyHTML(){
    var c=labels(),h=loadHistory();if(!h.length)return '';
    return '<div class="dmf-transmission-history"><div class="dmf-transmission-history-head">'+c.history+'</div><div class="dmf-transmission-history-list">'+h.map(function(x){var s=x.text.length>62?x.text.slice(0,62)+'…':x.text;return '<div class="dmf-transmission-history-item" data-history-text="'+encodeURIComponent(x.text)+'"><span>'+s.replace(/</g,'&lt;')+'</span><span>M'+String(x.module+1).padStart(2,'0')+'</span></div>';}).join('')+'</div></div>';
  }

  function renderResult(root,text,result){
    var c=labels(),out=root.querySelector('.dmf-transmission-readout');var names=moduleNames[lang()];
    var metrics=[];if(result.bpm)metrics.push('<span>'+result.bpm+' BPM</span>');if(result.stage)metrics.push('<span>'+result.stage+'</span>');metrics.push('<span>'+result.source+'</span>');
    out.innerHTML='<div class="dmf-transmission-readout-top"><div><div class="dmf-transmission-tag">'+c.parsed+'</div><div class="dmf-transmission-module">'+String(result.module+1).padStart(2,'0')+' / '+names[result.module]+'</div></div><div class="dmf-transmission-confidence">CONFIDENCE // '+result.confidence+'</div></div><div class="dmf-transmission-metrics">'+metrics.join('')+'</div><div class="dmf-transmission-diagnosis">'+result.diagnosis+'</div><div class="dmf-transmission-directive">'+result.directive+'</div><div class="dmf-transmission-artifact"><strong>'+c.bring+' //</strong> '+result.artifact+'</div><div class="dmf-transmission-actions"><button type="button" data-action="module">'+c.open+'</button><button type="button" data-action="again">'+c.again+'</button></div>';
    out.classList.add('is-ready');highlightModule(result.module);saveHistory(text,result);bindHistory(root);
    out.querySelector('[data-action="module"]').addEventListener('click',function(){var nodes=document.querySelectorAll('#modulesGrid .signal-node');if(nodes[result.module])nodes[result.module].scrollIntoView({behavior:'smooth',block:'center'});});
    out.querySelector('[data-action="again"]').addEventListener('click',function(){root.querySelector('.dmf-transmission-input').focus();});
  }

  function bindHistory(root){
    var holder=root.querySelector('.dmf-transmission-history');if(holder)holder.remove();
    var html=historyHTML();if(html)root.querySelector('.dmf-transmission-console').insertAdjacentHTML('beforeend',html);
    root.querySelectorAll('.dmf-transmission-history-item').forEach(function(item){item.addEventListener('click',function(){var input=root.querySelector('.dmf-transmission-input');input.value=decodeURIComponent(item.getAttribute('data-history-text'));updateCount(root);input.focus();});});
  }

  function updateCount(root){var input=root.querySelector('.dmf-transmission-input'),counter=root.querySelector('.dmf-transmission-counter');counter.textContent=input.value.length+' / 600';}

  function transmit(root){
    var c=labels(),input=root.querySelector('.dmf-transmission-input'),button=root.querySelector('.dmf-transmission-send'),text=input.value.trim();
    if(text.length<12){root.querySelector('.dmf-transmission-counter').textContent=c.empty;return;}
    button.disabled=true;button.textContent='SCANNING…';
    remoteAnalyze(text).then(function(remote){var result=remote||localAnalyze(text);renderResult(root,text,result);button.disabled=false;button.textContent=c.send;});
  }

  function render(root){
    var c=labels();
    root.innerHTML='<div class="dmf-transmission-shell"><div class="dmf-transmission-copy"><div class="dmf-transmission-kicker">'+c.kicker+'</div><h3 class="dmf-transmission-title">'+c.title+'</h3><p class="dmf-transmission-lede">'+c.lede+'</p><div class="dmf-transmission-chain"><strong>'+c.chain+'</strong></div><div class="dmf-transmission-listener"><i></i><span>'+c.listener+'</span></div></div><div class="dmf-transmission-console"><div class="dmf-transmission-head"><strong>'+c.head+'</strong><span class="dmf-transmission-status">'+c.online+'</span></div><div class="dmf-transmission-context">'+contextHTML()+'</div><div class="dmf-transmission-input-wrap"><textarea class="dmf-transmission-input" maxlength="600" placeholder="'+c.placeholder.replace(/"/g,'&quot;')+'"></textarea><span class="dmf-transmission-counter">0 / 600</span><button type="button" class="dmf-transmission-send">'+c.send+'</button></div><div class="dmf-transmission-examples">'+c.examples.map(function(x){return '<button type="button" class="dmf-transmission-example" data-example="'+encodeURIComponent(x)+'">'+x+'</button>';}).join('')+'</div><div class="dmf-transmission-readout"></div></div></div>';
    var input=root.querySelector('.dmf-transmission-input');input.addEventListener('input',function(){updateCount(root);});
    input.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter')transmit(root);});
    root.querySelector('.dmf-transmission-send').addEventListener('click',function(){transmit(root);});
    root.querySelectorAll('.dmf-transmission-example').forEach(function(btn){btn.addEventListener('click',function(){input.value=decodeURIComponent(btn.getAttribute('data-example'));updateCount(root);transmit(root);});});
    bindHistory(root);
  }

  function mount(){
    var academy=document.getElementById('academy');if(!academy||document.querySelector('.dmf-transmission'))return;
    var root=document.createElement('div');root.className='dmf-transmission';root.setAttribute('aria-label','DMF natural-language training transmission interface');
    var oracle=document.querySelector('.dmf-oracle');var codex=document.querySelector('.dmf-initiation-protocol');
    if(oracle)oracle.insertAdjacentElement('afterend',root);else if(codex)codex.insertAdjacentElement('afterend',root);else{var badge=academy.querySelector('.acad-badge');if(badge)badge.insertAdjacentElement('afterend',root);else academy.prepend(root);}
    render(root);
    var langBtn=document.querySelector('.lang-btn');if(langBtn&&'MutationObserver' in window){new MutationObserver(function(){setTimeout(function(){render(root);clearModule();},0);}).observe(langBtn,{childList:true,subtree:true,characterData:true});}
    window.addEventListener('storage',function(e){if(e.key===PROFILE_KEY||e.key===ORACLE_KEY)render(root);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
</script>`;

if (!html.includes(HEAD_MARKER)) {
  if (!html.includes('</head>')) throw new Error('DMF Transmission: </head> not found');
  html = html.replace('</head>', `${headInjection}\n</head>`);
}

if (!html.includes(BODY_MARKER)) {
  if (!html.includes('</body>')) throw new Error('DMF Transmission: </body> not found');
  html = html.replace('</body>', `${bodyInjection}\n</body>`);
}

fs.writeFileSync(target, html, 'utf8');
console.log('DMF Transmission interface injected into public/index.html');
