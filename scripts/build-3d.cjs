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

.dmf-signal-visual{position:relative;min-height:clamp(420px,48vw,640px);overflow:hidden;background:#040303;touch-action:pan-y;cursor:grab;-webkit-user-select:none;user-select:none}
.dmf-signal-visual.is-dragging{cursor:grabbing}
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
/* DMF OVERDRIVE — state, arrival from the hero signal line, LIVE SIGNAL HUD */
.dmf-signal-band.has-scene .dmf-signal-fallback{opacity:0}
.dmf-signal-band{box-shadow:inset 0 1px 0 rgba(255,91,30,calc(var(--dmf-overdrive,0) * .45)),inset 0 -1px 0 rgba(255,91,30,calc(var(--dmf-overdrive,0) * .25))}
.dmf-relic-state.is-overdrive{color:#fff1e6;text-shadow:0 0 12px rgba(255,91,30,.75),0 0 2px rgba(255,91,30,.9)}
.dmf-signal-band.is-overdrive .dmf-signal-corner strong{color:#fff1e6;text-shadow:0 0 14px rgba(255,91,30,.55)}
.dmf-signal-band.is-overdrive .dmf-signal-vignette{background:radial-gradient(ellipse 60% 52% at 50% 50%,transparent 30%,rgba(4,3,3,.8) 100%);transition:background 1s}
.dmf-signal-arrival{position:absolute;z-index:4;left:50%;top:0;width:1px;height:0;opacity:0;pointer-events:none;background:linear-gradient(to bottom,rgba(255,91,30,0),#ff5b1e 70%,#ffb599);box-shadow:0 0 12px rgba(255,91,30,.6)}
.dmf-signal-band.is-receiving .dmf-signal-arrival{animation:dmfArrival 1.6s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes dmfArrival{0%{height:0;opacity:1}55%{height:46%;opacity:1}100%{height:46%;opacity:0}}

.dmf-live-hud{position:absolute;inset:0;z-index:9;display:none;pointer-events:none;font-family:'Archivo',sans-serif;color:#f2ede6}
.dmf-signal-visual.is-fullscreen .dmf-live-hud{display:block}
.dmf-signal-visual.is-fullscreen .dmf-signal-corner,.dmf-signal-visual.is-fullscreen .dmf-signal-edition-tag,.dmf-signal-visual.is-fullscreen .dmf-signal-scan2{display:none}
.dmf-live-hud-top{position:absolute;left:76px;top:28px;display:flex;align-items:baseline;gap:18px}
.dmf-live-hud-title{font-size:9px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:#ff5b1e}
.dmf-live-hud-bpm{font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:#8a8178}
.dmf-live-hud-bpm b{font-family:'Anton',sans-serif;font-weight:400;font-size:15px;letter-spacing:.06em;color:#f2ede6;margin-right:4px}
.dmf-live-hud-main{position:absolute;left:clamp(20px,3vw,40px);bottom:clamp(24px,4vw,44px);width:min(300px,64vw)}
.dmf-live-hud-state{font-family:'Anton',sans-serif;font-size:clamp(34px,5vw,64px);line-height:.9;letter-spacing:.02em;color:rgba(242,237,230,.88);margin-bottom:18px;transition:color .6s,text-shadow .6s}
.dmf-live-hud[data-state="DORMANT"] .dmf-live-hud-state{color:rgba(242,237,230,.32)}
.dmf-live-hud[data-state="OVERDRIVE"] .dmf-live-hud-state{color:#ff5b1e;text-shadow:0 0 28px rgba(255,91,30,.35)}
.dmf-live-hud-meter,.dmf-live-hud-bands div{display:grid;grid-template-columns:56px 1fr;align-items:center;gap:12px;font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:#8a8178}
.dmf-live-hud-meter{margin-bottom:12px}
.dmf-live-hud-bands{display:grid;gap:7px}
.dmf-live-hud i{display:block;height:1px;background:rgba(242,237,230,.12);overflow:hidden}
.dmf-live-hud-meter i{height:2px}
.dmf-live-hud em{display:block;height:100%;background:#ff5b1e;transform-origin:left center;transform:scaleX(0)}
.dmf-live-hud-bands em{background:rgba(242,237,230,.7)}
.dmf-live-hud-hint{position:absolute;right:clamp(20px,3vw,40px);bottom:clamp(24px,4vw,44px);display:flex;flex-direction:column;align-items:flex-end;gap:7px;font-size:8px;letter-spacing:.26em;text-transform:uppercase;color:#665f58}
.dmf-signal-band.is-drop-armed .dmf-live-hud-drop{color:#ff5b1e}
.dmf-live-hud-phase{width:15px;height:15px;align-self:center;transform:rotate(-90deg)}
.dmf-live-hud-phase circle{fill:none;stroke:rgba(242,237,230,.14);stroke-width:1.5}
.dmf-live-hud-phase .dmf-live-hud-phase-arc{stroke:#ff5b1e;stroke-dasharray:1;stroke-dashoffset:1}
.dmf-live-hud-meta{position:absolute;left:76px;top:54px;display:flex;flex-wrap:wrap;gap:6px 18px;max-width:calc(100% - 96px);font-size:7px;letter-spacing:.26em;text-transform:uppercase;color:#665f58}
.dmf-live-hud-meta b{font-weight:600;color:#a89e94;margin-left:6px}
.dmf-live-hud-hyper{display:inline-block;margin-bottom:10px;padding:4px 9px;border:1px solid rgba(255,91,30,.3);font-size:7px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,91,30,.35);transition:color .25s,border-color .25s,background .25s}
.dmf-live-hud.is-hyperdrive .dmf-live-hud-hyper{color:#0a0806;background:#ff5b1e;border-color:#ff5b1e}
.dmf-live-hud-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.dmf-live-hud-tags .dmf-live-hud-hyper{margin-bottom:0}
.dmf-live-hud-sing{display:inline-block;padding:4px 9px;border:1px solid rgba(255,91,30,.2);font-size:7px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,91,30,.3);transition:color .25s,border-color .25s,background .25s}
.dmf-live-hud[data-sing="armed"] .dmf-live-hud-sing{color:#ff5b1e;border-color:#ff5b1e}
.dmf-live-hud[data-sing="cooldown"] .dmf-live-hud-sing{color:rgba(242,237,230,.22);border-color:rgba(242,237,230,.1)}
.dmf-live-hud:not([data-sing]) .dmf-live-hud-sing,.dmf-live-hud[data-sing="idle"] .dmf-live-hud-sing{color:rgba(255,91,30,.3)}
.dmf-live-hud[data-sing="precompression"] .dmf-live-hud-sing,.dmf-live-hud[data-sing="ignition"] .dmf-live-hud-sing,.dmf-live-hud[data-sing="impact"] .dmf-live-hud-sing,.dmf-live-hud[data-sing="breakthrough"] .dmf-live-hud-sing,.dmf-live-hud[data-sing="propagation"] .dmf-live-hud-sing,.dmf-live-hud[data-sing="decay"] .dmf-live-hud-sing,.dmf-live-hud[data-sing="resolve"] .dmf-live-hud-sing{color:#0a0806;background:#ffb599;border-color:#ffb599}
.dmf-live-hud-impact{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:#8a8178}
.dmf-live-hud-impact i{display:block;width:8px;height:8px;border-radius:50%;overflow:visible;background:#ff5b1e;transform:scale(.35);opacity:.25}
/* HYPERDRIVE: contraction before the hit, warm edge on impact — never a white flash */
.dmf-signal-visual::before{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;box-shadow:inset 0 0 calc(max(var(--dmf-hyper-pre,0),var(--dmf-sing-pre,0)) * 240px) calc(max(var(--dmf-hyper-pre,0),var(--dmf-sing-pre,0)) * 50px) rgba(4,3,3,.85),inset 0 0 0 1px rgba(255,91,30,calc(max(var(--dmf-hyper,0),var(--dmf-sing,0)) * .55))}
/* SPATIAL STAGE (V4): the one canvas lives in a fixed layer behind the page; the relic band becomes a
   transparent window onto it. Fullscreen LIVE SIGNAL, LITE and reduced motion keep the canvas in the band. */
.dmf-stage-layer{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0;overflow:hidden;contain:strict;-webkit-mask-image:linear-gradient(to bottom,transparent calc(var(--dmf-stage-top,0px) - 90px),#000 var(--dmf-stage-top,0px),#000 var(--dmf-stage-bottom,100vh),transparent calc(var(--dmf-stage-bottom,100vh) + 90px));mask-image:linear-gradient(to bottom,transparent calc(var(--dmf-stage-top,0px) - 90px),#000 var(--dmf-stage-top,0px),#000 var(--dmf-stage-bottom,100vh),transparent calc(var(--dmf-stage-bottom,100vh) + 90px))}
.dmf-stage-layer{inset:0 0 auto 0;height:100vh;height:100lvh}
.dmf-stage-layer canvas{position:absolute;inset:0;display:block;width:100%!important;height:100%!important}
/* WebKit / no-mask fallback: a hard-edged clip of the same band-following window. */
.dmf-stage-layer.dmf-stage-clip{-webkit-mask-image:none;mask-image:none;-webkit-clip-path:inset(max(0px,var(--dmf-stage-top,0px)) 0 max(0px,calc(100% - var(--dmf-stage-bottom,100%))) 0);clip-path:inset(max(0px,var(--dmf-stage-top,0px)) 0 max(0px,calc(100% - var(--dmf-stage-bottom,100%))) 0)}
.dmf-signal-band.is-staged,.dmf-signal-band.is-staged .dmf-signal-visual:not(.is-fullscreen){background:transparent}
.dmf-signal-band.is-staged .dmf-signal-copy{position:relative;z-index:1;background:linear-gradient(90deg,#060505 78%,rgba(6,5,5,0))}
@media(max-width:900px){.dmf-signal-band.is-staged .dmf-signal-copy{background:linear-gradient(180deg,#060505 85%,rgba(6,5,5,0))}}
/* SINGULARITY: deeper contraction on precompression, warm edge and state glow through the event */
.dmf-signal-band.is-singularity .dmf-signal-corner strong{color:#ffd3bf;text-shadow:0 0 22px rgba(255,91,30,.8)}
.dmf-signal-band.is-singularity .dmf-relic-state{color:#ffd3bf}
.dmf-signal-band.is-hyperdrive .dmf-signal-corner strong{color:#ffd3bf;text-shadow:0 0 18px rgba(255,91,30,.7)}
/* Relic exit: the pulse leaves from the Receiver and spreads into the next section's divider */
.dmf-signal-band::before{content:'';position:absolute;z-index:3;left:0;right:0;bottom:0;height:1px;pointer-events:none;background:linear-gradient(90deg,transparent,#ff5b1e 45%,#ffb599 70.5%,#ff5b1e 85%,transparent);box-shadow:0 0 12px rgba(255,91,30,.45);transform-origin:70.5% 50%;transform:scaleX(var(--dmf-exit,0))}
@media(max-width:560px){
  .dmf-live-hud-top{left:70px;top:30px;flex-direction:column;gap:4px}
  .dmf-live-hud-meta{left:70px;top:74px}
  .dmf-live-hud-hint{right:20px;top:30px;bottom:auto}
}
@media(prefers-reduced-motion:reduce){
  .dmf-signal-scan,.dmf-signal-scan2,.dmf-signal-loader::after{animation:none}
  .dmf-signal-arrival{display:none}
  .dmf-live-hud-drop{display:none}
}
</style>`;

const OVERDRIVE_DIR = path.join(root, 'scripts', 'overdrive');
function inlineModule(name) {
  const code = fs.readFileSync(path.join(OVERDRIVE_DIR, name), 'utf8');
  if (/<\/script/i.test(code)) throw new Error('DMF 3D build: ' + name + ' must not contain a closing script tag');
  return '<script>\n' + code + '\n</script>';
}

const bodyInjection = [
  BODY_MARKER,
  inlineModule('engine.js'),
  inlineModule('kinetic.js'),
  inlineModule('spatial-stage.js'),
  inlineModule('signal-bus.js'),
  inlineModule('relic.js'),
  inlineModule('mixer-stage.js')
].join('\n');

if (!html.includes(HEAD_MARKER)) {
  if (!html.includes('</head>')) throw new Error('DMF 3D build: </head> not found');
  html = html.replace('</head>', () => headInjection + '\n</head>');
}

if (!html.includes(BODY_MARKER)) {
  if (!html.includes('</body>')) throw new Error('DMF 3D build: </body> not found');
  html = html.replace('</body>', () => bodyInjection + '\n</body>');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log('DMF 3D build ready: ' + path.relative(root, outputPath));
