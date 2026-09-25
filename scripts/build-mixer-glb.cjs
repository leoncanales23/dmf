#!/usr/bin/env node
/* Offline tool — rebuilds assets/models/pioneer-djm-900nxs2-mixer-slide.glb from the owner's master STL.
 * Not part of the site build; the STL is not in the repository (see assets/models/PIONEER_DJM_900NXS2_SLIDE.md).
 *
 *   npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer@1
 *   node scripts/build-mixer-glb.cjs "<path>/Meshy_AI_Pioneer DJM-900NXS2 Mixer_1790293327_texture.stl"
 *
 * Pipeline (geometry is only ever reduced, never added):
 *   1. read the binary STL, verify its SHA-256 against the documented master;
 *   2. orient: the STL is Z-up with the control surface facing -Y (Meshy built it from the top-down product
 *      photo). A 180° turn about X (y → -y, z → -z) puts the control surface up and the crossfader end towards
 *      +Z. A proper rotation, so the winding stays outward;
 *   3. weld coincident vertices, drop degenerate triangles;
 *   4. meshoptimizer simplify to TARGET_TRIS (error-bounded);
 *   5. bake crease-split normals (area-weighted, split above CREASE_DEG) so hard edges stay hard;
 *   6. write a GLB: float positions, KHR_mesh_quantization int8 normals, the DMF_Mixer_Metal PBR material.
 *      (Quantized positions are not used: Three.js r128 does not display them correctly.) */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MASTER_SHA256 = 'f8de22b178dff355d5108d695a5fd0db074671da218b1b39945297ba807c318f';
const TARGET_TRIS = 30000;
const CREASE_DEG = 38;
const OUT = path.join(__dirname, '..', 'assets', 'models', 'pioneer-djm-900nxs2-mixer-slide.glb');

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('usage: node scripts/build-mixer-glb.cjs <master.stl>');
  const d = fs.readFileSync(input);
  const sha = crypto.createHash('sha256').update(d).digest('hex');
  if (sha !== MASTER_SHA256) throw new Error('STL SHA-256 ' + sha + ' is not the documented master');
  const n = d.readUInt32LE(80);
  if (d.length !== 84 + 50 * n) throw new Error('not a binary STL');

  const { Document, NodeIO } = require('@gltf-transform/core');
  const { KHRMeshQuantization } = require('@gltf-transform/extensions');
  const { quantize } = require('@gltf-transform/functions');
  const { MeshoptSimplifier } = require('meshoptimizer');
  await MeshoptSimplifier.ready;

  // 2 + 3. orient and weld
  const map = new Map();
  const pos = [];
  const tri = [];
  for (let t = 0; t < n; t++) {
    const face = [];
    for (let v = 0; v < 3; v++) {
      const o = 84 + 50 * t + 12 + v * 12;
      const x = d.readFloatLE(o), y = -d.readFloatLE(o + 4), z = -d.readFloatLE(o + 8);
      const k = Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4);
      let i = map.get(k);
      if (i === undefined) { i = pos.length / 3; map.set(k, i); pos.push(x, y, z); }
      face.push(i);
    }
    if (face[0] !== face[1] && face[1] !== face[2] && face[0] !== face[2]) tri.push(face[0], face[1], face[2]);
  }
  const P = new Float32Array(pos);
  let I = Uint32Array.from(tri);
  console.log('master: ' + n + ' triangles, welded ' + P.length / 3 + ' vertices');

  // 4. simplify
  const [simplified, error] = MeshoptSimplifier.simplify(I, P, 3, TARGET_TRIS * 3, 0.02, []);
  I = simplified;
  console.log('simplified: ' + I.length / 3 + ' triangles, relative error ' + error.toFixed(5));

  // 5. crease-split normals
  const T = I.length / 3;
  const fn = new Float32Array(T * 3);
  const adj = new Map();
  for (let t = 0; t < T; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    fn[t * 3] = uy * vz - uz * vy; fn[t * 3 + 1] = uz * vx - ux * vz; fn[t * 3 + 2] = ux * vy - uy * vx;
    for (let v = 0; v < 3; v++) {
      const k = I[t * 3 + v];
      let l = adj.get(k);
      if (!l) adj.set(k, l = []);
      l.push(t);
    }
  }
  function unit(t) {
    const x = fn[t * 3], y = fn[t * 3 + 1], z = fn[t * 3 + 2], L = Math.hypot(x, y, z) || 1;
    return [x / L, y / L, z / L];
  }
  const cos = Math.cos(CREASE_DEG * Math.PI / 180);
  const outMap = new Map(), OP = [], ON = [], OI = new Uint32Array(T * 3);
  for (let t = 0; t < T; t++) {
    const f = unit(t);
    for (let v = 0; v < 3; v++) {
      const vi = I[t * 3 + v];
      let nx = 0, ny = 0, nz = 0;
      for (const u of adj.get(vi)) {
        const g = unit(u);
        if (g[0] * f[0] + g[1] * f[1] + g[2] * f[2] >= cos) { nx += fn[u * 3]; ny += fn[u * 3 + 1]; nz += fn[u * 3 + 2]; }
      }
      let L = Math.hypot(nx, ny, nz);
      if (L < 1e-12) { nx = f[0]; ny = f[1]; nz = f[2]; L = 1; }
      nx /= L; ny /= L; nz /= L;
      const k = vi + ':' + Math.round(nx * 127) + ',' + Math.round(ny * 127) + ',' + Math.round(nz * 127);
      let o = outMap.get(k);
      if (o === undefined) { o = OP.length / 3; outMap.set(k, o); OP.push(P[vi * 3], P[vi * 3 + 1], P[vi * 3 + 2]); ON.push(nx, ny, nz); }
      OI[t * 3 + v] = o;
    }
  }

  // 6. GLB
  const doc = new Document();
  const buf = doc.createBuffer();
  const verts = OP.length / 3;
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(OP)).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(ON)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(verts < 65536 ? Uint16Array.from(OI) : OI).setBuffer(buf))
    .setMaterial(doc.createMaterial('DMF_Mixer_Metal')
      .setBaseColorFactor([0.1216, 0.1216, 0.1333, 1]).setRoughnessFactor(0.28).setMetallicFactor(0.72));
  const mesh = doc.createMesh('pioneer_djm_900nxs2').addPrimitive(prim);
  doc.createScene('pioneer-djm-900nxs2').addChild(doc.createNode('pioneer_djm_900nxs2').setMesh(mesh));
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  await doc.transform(quantize({ pattern: /^NORMAL$/, quantizeNormal: 8 }));
  const glb = await new NodeIO().registerExtensions([KHRMeshQuantization]).writeBinary(doc);
  fs.writeFileSync(OUT, glb);
  console.log('wrote ' + path.relative(process.cwd(), OUT) + ': ' + verts + ' vertices / ' + T + ' triangles / ' + glb.length + ' bytes');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
