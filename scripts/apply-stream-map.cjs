#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const mapPath = process.argv[2] || '.dmf-stream-map.local.json';
const configPath = path.join(__dirname, '..', 'public', 'academy-config.js');

if (!fs.existsSync(mapPath)) {
  console.error('Stream map not found: ' + mapPath);
  process.exit(1);
}

const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
let config = fs.readFileSync(configPath, 'utf8');
const keys = Object.keys(mapping);

if (!keys.length) {
  console.error('Stream map is empty.');
  process.exit(1);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
}

let updated = 0;

for (const key of keys) {
  const uid = String(mapping[key] || '');
  if (!/^[0-9a-f]{32}$/i.test(uid)) {
    console.error('Invalid Cloudflare Stream UID for ' + key + ': ' + uid);
    process.exit(1);
  }

  const re = new RegExp(
    "(streamKey:\\s*'" + escapeRegExp(key) + "'[\\s\\S]{0,500}?streamUid:\\s*)(?:null|'[0-9a-fA-F]{32}')"
  );

  if (!re.test(config)) {
    console.error('Could not find streamKey in academy-config.js: ' + key);
    process.exit(1);
  }

  config = config.replace(re, "$1'" + uid + "'");
  updated++;
}

fs.writeFileSync(configPath, config, 'utf8');

const configured = (config.match(/streamUid:\s*'[0-9a-fA-F]{32}'/g) || []).length;
const pending = (config.match(/streamUid:\s*null/g) || []).length;

console.log('DMF Academy stream map applied.');
console.log('  mappings processed: ' + updated);
console.log('  configured lessons: ' + configured);
console.log('  pending lessons: ' + pending);

if (configured !== 13 || pending !== 0) {
  console.error('Expected 13 configured lessons and 0 pending lessons after the full upload map.');
  process.exit(1);
}
