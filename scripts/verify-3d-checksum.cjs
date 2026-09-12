const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const root = process.cwd();
const parts = [0,1,2,3].map(i => fs.readFileSync(path.join(root, `assets/models/dmf-signal.part${i}.b64`), 'utf8'));
const glb = Buffer.from(parts.join(''), 'base64');
const expected = 'f389cc121e01b4240e0ea49a506a83e699dfac7d55ae1a91c3009f72e8d8d146';
const checksum = crypto.createHash('sha256').update(glb).digest('hex');
if (checksum !== expected) throw new Error(`DMF GLB checksum mismatch: ${checksum}`);
console.log(`DMF GLB checksum OK: ${checksum}`);
