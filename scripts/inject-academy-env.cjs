#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, '..', 'public', 'academy-env.js');

const STREAM_BASE = process.env.DMF_STREAM_BASE || '';
const DEMO = process.env.DMF_ACADEMY_DEMO === 'true';

const FIREBASE_API_KEY = process.env.DMF_FIREBASE_API_KEY || '';
const FIREBASE_AUTH_DOMAIN = process.env.DMF_FIREBASE_AUTH_DOMAIN || '';
const FIREBASE_PROJECT_ID = process.env.DMF_FIREBASE_PROJECT_ID || 'dmf-academy';

const lines = [];
lines.push('// DMF Academy — Runtime Environment (generated at build time)');

if (STREAM_BASE) {
  lines.push('window.__DMF_STREAM_BASE__ = ' + JSON.stringify(STREAM_BASE) + ';');
}

if (DEMO) {
  lines.push('window.__DMF_ACADEMY_DEMO__ = true;');
}

if (FIREBASE_API_KEY) {
  lines.push('window.__DMF_FIREBASE_CONFIG__ = ' + JSON.stringify({
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN || FIREBASE_PROJECT_ID + '.firebaseapp.com',
    projectId: FIREBASE_PROJECT_ID
  }) + ';');
}

const content = lines.join('\n') + '\n';
fs.writeFileSync(OUT_PATH, content, 'utf8');

console.log('DMF Academy // Environment config written to public/academy-env.js');
if (STREAM_BASE) console.log('  STREAM_BASE: ' + STREAM_BASE);
if (DEMO) console.log('  DEMO MODE: enabled');
if (FIREBASE_API_KEY) console.log('  FIREBASE AUTH: configured');
if (!STREAM_BASE && !DEMO && !FIREBASE_API_KEY) console.log('  (no env vars set — defaults will apply)');
