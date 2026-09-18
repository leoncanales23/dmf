#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'public', 'index.html');

console.log('DMF Academy // Injecting Student Access link into nav...');

let html = fs.readFileSync(HTML_PATH, 'utf8');

const MARKER = 'DMF_ACADEMY_LINK';
if (html.includes(MARKER)) {
  console.log('Student Access link already present — skipping.');
  process.exit(0);
}

const LINK_HTML = `<!-- ${MARKER} --><a href="/login" class="nav-link" style="color:#ff5b1e;font-weight:700">Student Access</a>`;

const hamburgerClose = '</button>\n  </div>\n</nav>';
if (!html.includes(hamburgerClose)) {
  console.error('Could not find nav hamburger/close pattern in public/index.html');
  process.exit(1);
}

html = html.replace(
  hamburgerClose,
  '</button>\n    ' + LINK_HTML + '\n  </div>\n</nav>'
);

fs.writeFileSync(HTML_PATH, html, 'utf8');
console.log('Student Access link injected into nav.');
