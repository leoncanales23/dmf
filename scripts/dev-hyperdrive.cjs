#!/usr/bin/env node
'use strict';

/**
 * DMF HYPERDRIVE DEV
 * One command for the canonical visual build, asset staging, local server,
 * source watching and the ?dmfdebug=1 instrumentation surface.
 *
 * Usage:
 *   npm run dev:hyperdrive
 *   npm run dev:hyperdrive -- --port 8080
 *   npm run build:hyperdrive
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const buildOnly = args.includes('--build-only');
const noWatch = args.includes('--no-watch') || buildOnly;

function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const publicDir = path.join(root, 'public');
const assetGroups = ['images', 'logos', 'docs', 'models'];
const buildSteps = [
  'scripts/check-3d.cjs',
  'scripts/verify-3d-checksum.cjs',
  'scripts/build-3d.cjs',
  'scripts/inject-codex.cjs',
  'scripts/inject-oracle.cjs',
  'scripts/inject-transmission.cjs',
  'scripts/inject-compute-uplink.cjs',
  'scripts/inject-training-state.cjs',
  'scripts/inject-academy-link.cjs',
  'scripts/inject-academy-env.cjs'
];

function log(message) {
  process.stdout.write('[HYPERDRIVE] ' + message + '\n');
}

function fail(message) {
  process.stderr.write('[HYPERDRIVE] ERROR: ' + message + '\n');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDirContents(src, dst) {
  if (!fs.existsSync(src)) return;
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(from, to, { recursive: true, force: true });
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function runNode(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(script + ' failed with exit code ' + result.status);
  }
}

function reconstructSignalAsset() {
  const parts = [0, 1, 2, 3].map((i) =>
    path.join(root, 'assets', 'models', 'dmf-signal.part' + i + '.b64')
  );
  if (!parts.every((file) => fs.existsSync(file))) {
    throw new Error('DMF signal asset parts are missing');
  }
  const encoded = parts.map((file) => fs.readFileSync(file, 'utf8')).join('');
  const glb = Buffer.from(encoded, 'base64');
  if (glb.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('Reconstructed DMF signal asset is not a valid GLB');
  }
  const out = path.join(publicDir, 'assets', 'models', 'dmf-signal-chrome.glb');
  fs.writeFileSync(out, glb);
  for (let i = 0; i < 4; i++) {
    const copiedPart = path.join(publicDir, 'assets', 'models', 'dmf-signal.part' + i + '.b64');
    if (fs.existsSync(copiedPart)) fs.rmSync(copiedPart);
  }
  return glb.length;
}

function verifyRuntimeAssets() {
  const required = [
    'assets/models/dmf-studio-optimized.glb',
    'assets/models/DMF_RELIC_01.3mf',
    'assets/models/pioneer-djm-900nxs2-mixer-slide.glb',
    'scripts/overdrive/engine.js',
    'scripts/overdrive/kinetic.js',
    'scripts/overdrive/spatial-stage.js',
    'scripts/overdrive/signal-bus.js',
    'scripts/overdrive/spatial-narrative.js',
    'scripts/overdrive/stage-overdrive.js',
    'scripts/overdrive/black-sun.js',
    'scripts/overdrive/event-horizon.js',
    'scripts/overdrive/relic.js',
    'scripts/overdrive/mixer-stage.js'
  ];
  const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
  if (missing.length) {
    throw new Error('Required Hyperdrive assets missing: ' + missing.join(', '));
  }
}

let buildNumber = 0;
function canonicalBuild(reason) {
  const started = Date.now();
  buildNumber += 1;
  log('BUILD #' + buildNumber + ' · ' + reason);
  verifyRuntimeAssets();

  for (const group of assetGroups) {
    ensureDir(path.join(publicDir, 'assets', group));
  }

  for (const step of buildSteps) runNode(step);

  for (const group of assetGroups) {
    copyDirContents(path.join(root, 'assets', group), path.join(publicDir, 'assets', group));
  }

  if (fs.existsSync(path.join(root, 'assets', 'videos'))) {
    copyDirContents(path.join(root, 'assets', 'videos'), path.join(publicDir, 'assets', 'videos'));
  }

  const signalBytes = reconstructSignalAsset();
  const htmlPath = path.join(publicDir, 'index.html');
  const htmlBytes = fs.statSync(htmlPath).size;
  const modelBytes = fs.statSync(path.join(publicDir, 'assets', 'models', 'dmf-studio-optimized.glb')).size;

  log(
    'READY · ' +
    Math.round((Date.now() - started) / 10) / 100 + 's · HTML ' +
    Math.round(htmlBytes / 1024) + ' KiB · RELIC ' +
    Math.round(modelBytes / 1024 / 1024 * 10) / 10 + ' MiB · SIGNAL ' +
    Math.round(signalBytes / 1024) + ' KiB'
  );
}

function collectFiles(target, out) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    out.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
}

const watchTargets = [
  path.join(root, 'index.html'),
  path.join(root, 'scripts', 'build-3d.cjs'),
  path.join(root, 'scripts', 'overdrive'),
  path.join(root, 'assets', 'images'),
  path.join(root, 'assets', 'logos'),
  path.join(root, 'assets', 'docs'),
  path.join(root, 'assets', 'models')
];

function snapshot() {
  const files = [];
  for (const target of watchTargets) collectFiles(target, files);
  const snap = new Map();
  for (const file of files) {
    const stat = fs.statSync(file);
    snap.set(file, stat.mtimeMs + ':' + stat.size);
  }
  return snap;
}

function changed(a, b) {
  if (a.size !== b.size) return true;
  for (const [key, value] of a) {
    if (b.get(key) !== value) return true;
  }
  return false;
}

// Serves public/ exactly like Firebase Hosting does in production: static
// files first, then the firebase.json rewrites, never the repository root
// (server.js puts express.static('.') first, which answers / with the unbuilt
// source index.html and exposes the whole repo).
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.glb': 'model/gltf-binary',
  '.stl': 'model/stl',
  '.3mf': 'model/3mf'
};

const REWRITES = [
  [/^\/login\/?$/, 'login.html'],
  [/^\/academy(\/.*)?$/, 'academy.html'],
  [/^\/payment-result\/?$/, 'payment-result.html']
];

function staticFile(dir, pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.some((p) => p.startsWith('.'))) return null; // firebase.json ignores **/.*
  const file = path.resolve(dir, '.' + path.sep + parts.join(path.sep));
  if (file !== dir && !file.startsWith(dir + path.sep)) return null;
  try {
    const stat = fs.statSync(file);
    if (stat.isFile()) return file;
    if (stat.isDirectory() && fs.statSync(path.join(file, 'index.html')).isFile()) {
      return path.join(file, 'index.html');
    }
  } catch (err) {
    return null;
  }
  return null;
}

function resolveRequest(dir, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch (err) {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const direct = staticFile(dir, pathname);
  if (direct) return direct;
  if (pathname.startsWith('/api/')) return null; // Cloud Functions are not emulated here
  for (const [pattern, target] of REWRITES) {
    if (pattern.test(pathname)) return staticFile(dir, '/' + target);
  }
  return staticFile(dir, '/index.html');
}

function createDevServer(dir) {
  const base = path.resolve(dir);
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    const file = resolveRequest(base, req.url);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': fs.statSync(file).size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}

let server = null;
function startServer(port) {
  server = createDevServer(publicDir);
  server.on('error', (err) => {
    fail(err.code === 'EADDRINUSE'
      ? 'port ' + port + ' is already in use (try --port ' + (port + 1) + ')'
      : 'server error: ' + err.message);
    process.exit(1);
  });
  server.listen(port, () => {
    log('SERVER · http://localhost:' + port + ' · public/ with firebase.json rewrites');
    log('DEBUG  · http://localhost:' + port + '/?dmfdebug=1');
    log('CLOUD SHELL · Web Preview → Preview on port ' + port);
    log('PERF · console: window.__DMF_PERF__');
    log('LIVE SIGNAL · fullscreen + SPACE arms the next downbeat; ESC exits');
  });
}

function shutdown() {
  if (server) server.close();
  process.exit(0);
}

function main() {
  process.chdir(root);

  const port = Number(argValue('--port', process.env.HYPERDRIVE_PORT || process.env.PORT || '8080'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail('Invalid --port value: ' + port);
    process.exit(1);
  }

  process.on('SIGINT', () => {
    log('stopping');
    shutdown();
  });
  process.on('SIGTERM', shutdown);

  try {
    canonicalBuild('initial');
  } catch (err) {
    fail(err && err.stack ? err.stack : String(err));
    process.exit(1);
  }

  if (buildOnly) {
    log('build-only complete');
    process.exit(0);
  }

  startServer(port);

  if (noWatch) {
    log('watch disabled');
    return;
  }

  let last = snapshot();
  setInterval(() => {
    let next;
    try {
      next = snapshot();
    } catch (err) {
      fail('watch snapshot failed: ' + err.message);
      return;
    }
    if (!changed(last, next)) return;
    try {
      canonicalBuild('source change');
    } catch (err) {
      fail(err && err.stack ? err.stack : String(err));
    }
    // Rebuilds are synchronous, so edits made during one are caught here.
    last = next;
  }, 900).unref();

  log('WATCH · source + Overdrive runtime + visual assets');
}

if (require.main === module) main();

module.exports = { createDevServer, resolveRequest };
