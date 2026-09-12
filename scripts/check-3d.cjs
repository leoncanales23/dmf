const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const root = process.cwd();
const parts = [0,1,2,3].map(i => fs.readFileSync(path.join(root, `assets/models/dmf-signal.part${i}.b64`), 'utf8'));
const glb = Buffer.from(parts.join(''), 'base64');

if (glb.length !== 16416) throw new Error(`Unexpected DMF GLB size: ${glb.length}`);
if (glb.toString('ascii', 0, 4) !== 'glTF') throw new Error('DMF GLB header is invalid');
if (glb.readUInt32LE(4) !== 2) throw new Error('DMF GLB version is not 2');
if (glb.readUInt32LE(8) !== glb.length) throw new Error('DMF GLB declared length mismatch');

const checksum = crypto.createHash('sha256').update(glb).digest('hex');
console.log(`DMF GLB OK: ${glb.length} bytes, sha256 ${checksum}`);
