const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'public', 'index.html');
if (!fs.existsSync(target)) throw new Error('DMF Compute Uplink: public/index.html not found. Run previous injectors first.');

let html = fs.readFileSync(target, 'utf8');

const HEAD_MARKER = '<!-- DMF_COMPUTE_UPLINK_HEAD -->';
const BODY_MARKER = '<!-- DMF_COMPUTE_UPLINK_BODY -->';

const headInjection = `${HEAD_MARKER}
<style>
.dmf-compute-uplink{display:inline-flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid rgba(81,224,193,.18);background:rgba(81,224,193,.025);font-size:7px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#6fa99d;white-space:nowrap}
.dmf-compute-uplink::before{content:'';width:5px;height:5px;border-radius:50%;background:#51e0c1;box-shadow:0 0 10px rgba(81,224,193,.65);animation:dmfComputeLinkPulse 1.8s ease-in-out infinite}
@keyframes dmfComputeLinkPulse{0%,100%{opacity:.35}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){.dmf-compute-uplink::before{animation:none}}
</style>`;

const bodyInjection = `${BODY_MARKER}
<script>
(function(){
  window.DMF_TRAINING_ENDPOINT = '/api/dmf/training';
  window.DMF_COMPUTE_UPLINK = 'VBC COMPUTE';

  function attachBadge(){
    var head=document.querySelector('.dmf-transmission-head');
    if(!head || head.querySelector('.dmf-compute-uplink')) return !!head;
    var badge=document.createElement('span');
    badge.className='dmf-compute-uplink';
    badge.textContent='VBC COMPUTE // SECURE UPLINK';
    head.appendChild(badge);
    return true;
  }

  function mount(){
    if(attachBadge()) return;
    var tries=0;
    var timer=setInterval(function(){
      tries+=1;
      if(attachBadge() || tries>40) clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
</script>`;

if (!html.includes(HEAD_MARKER)) {
  if (!html.includes('</head>')) throw new Error('DMF Compute Uplink: </head> not found');
  html = html.replace('</head>', `${headInjection}\n</head>`);
}

if (!html.includes(BODY_MARKER)) {
  if (!html.includes('</body>')) throw new Error('DMF Compute Uplink: </body> not found');
  html = html.replace('</body>', `${bodyInjection}\n</body>`);
}

fs.writeFileSync(target, html, 'utf8');
console.log('DMF secure VBC Compute uplink injected into public/index.html');
