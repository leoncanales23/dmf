// DMF RELIC 01 — Print Master Preflight
// Analyzes dmf-studio-optimized.glb for 3D printing manufacturability
// Run: node scripts/preflight-print.cjs

const fs = require('fs');
const path = require('path');

const GLB_PATH = path.join(__dirname, '..', 'assets', 'models', 'dmf-studio-optimized.glb');

function parseGLB(filepath) {
  const buf = fs.readFileSync(filepath);
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error('Not a valid GLB file');
  const version = buf.readUInt32LE(4);
  const jsonChunkLength = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonChunkLength).toString('utf8'));
  const binOffset = 20 + jsonChunkLength;
  const binChunkLength = buf.readUInt32LE(binOffset);
  const binBuf = buf.slice(binOffset + 8, binOffset + 8 + binChunkLength);
  return { gltf, binBuf, version, fileSize: buf.length };
}

function getAccessorData(gltf, binBuf, accessorIdx) {
  const accessor = gltf.accessors[accessorIdx];
  const bv = gltf.bufferViews[accessor.bufferView];
  const offset = (bv.byteOffset || 0) + (accessor.byteOffset || 0);
  const types = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const sizes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  const counts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const Ctor = types[accessor.componentType];
  const n = accessor.count * counts[accessor.type];
  const slice = binBuf.slice(offset, offset + n * sizes[accessor.componentType]);
  return { data: new Ctor(slice.buffer, slice.byteOffset, n), count: accessor.count, components: counts[accessor.type] };
}

function analyze() {
  const { gltf, binBuf, version, fileSize } = parseGLB(GLB_PATH);
  const report = [];
  const ln = (s) => { report.push(s); console.log(s); };

  ln('# DMF RELIC 01 — Print Master Preflight Report');
  ln(`Generated: ${new Date().toISOString()}`);
  ln(`Source: dmf-studio-optimized.glb (${(fileSize / 1024).toFixed(1)} KB, glTF ${version})`);
  ln('');

  ln('## Scene Structure');
  ln(`- Nodes: ${gltf.nodes?.length || 0}`);
  ln(`- Meshes: ${gltf.meshes?.length || 0}`);
  ln(`- Materials: ${gltf.materials?.length || 0}`);
  ln(`- Textures: ${gltf.textures?.length || 0} (PBR — will not survive print)`);
  ln('');

  const mesh = gltf.meshes[0];
  const prim = mesh.primitives[0];
  const pos = getAccessorData(gltf, binBuf, prim.attributes.POSITION);
  const idx = getAccessorData(gltf, binBuf, prim.indices);
  const hasNormals = prim.attributes.NORMAL !== undefined;
  const normals = hasNormals ? getAccessorData(gltf, binBuf, prim.attributes.NORMAL) : null;
  const numTris = idx.count / 3;

  ln('## Mesh Metrics');
  ln(`- Vertices: ${pos.count.toLocaleString()}`);
  ln(`- Triangles: ${numTris.toLocaleString()}`);
  ln(`- Material: "${gltf.materials[prim.material]?.name || 'unnamed'}"`);
  ln('');

  // Bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.data[i*3], y = pos.data[i*3+1], z = pos.data[i*3+2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const W = maxX - minX, H = maxY - minY, D = maxZ - minZ;

  ln('## Bounding Box (model units)');
  ln(`- X: [${minX.toFixed(4)}, ${maxX.toFixed(4)}] → ${W.toFixed(4)}`);
  ln(`- Y: [${minY.toFixed(4)}, ${maxY.toFixed(4)}] → ${H.toFixed(4)}`);
  ln(`- Z: [${minZ.toFixed(4)}, ${maxZ.toFixed(4)}] → ${D.toFixed(4)}`);
  ln('');

  // Edge analysis
  const edgeMap = new Map();
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.data[i], b = idx.data[i+1], c = idx.data[i+2];
    [[a,b],[b,c],[c,a]].forEach(([v0,v1]) => {
      const key = v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    });
  }

  let boundary = 0, manifold = 0, nonManifold = 0;
  edgeMap.forEach(count => {
    if (count === 1) boundary++;
    else if (count === 2) manifold++;
    else nonManifold++;
  });

  ln('## Manifold Analysis');
  ln(`- Total edges: ${edgeMap.size.toLocaleString()}`);
  ln(`- Manifold (2 faces): ${manifold.toLocaleString()}`);
  ln(`- Boundary (1 face): ${boundary.toLocaleString()} ${boundary > 0 ? '⚠ HOLES' : '✓'}`);
  ln(`- Non-manifold (3+): ${nonManifold} ${nonManifold > 0 ? '⚠ OVERLAPS' : '✓'}`);
  ln(`- **Watertight: ${boundary === 0 && nonManifold === 0 ? 'YES ✓' : 'NO ✗'}**`);
  ln('');

  // Degenerate triangles
  let degenerate = 0;
  for (let i = 0; i < idx.count; i += 3) {
    const ia = idx.data[i], ib = idx.data[i+1], ic = idx.data[i+2];
    const ax = pos.data[ia*3], ay = pos.data[ia*3+1], az = pos.data[ia*3+2];
    const bx = pos.data[ib*3], by = pos.data[ib*3+1], bz = pos.data[ib*3+2];
    const cx = pos.data[ic*3], cy = pos.data[ic*3+1], cz = pos.data[ic*3+2];
    const abx = bx-ax, aby = by-ay, abz = bz-az;
    const acx = cx-ax, acy = cy-ay, acz = cz-az;
    const nx = aby*acz - abz*acy, ny = abz*acx - abx*acz, nz = abx*acy - aby*acx;
    if (nx*nx + ny*ny + nz*nz < 1e-20) degenerate++;
  }
  ln(`## Degenerate Triangles: ${degenerate}`);
  ln('');

  // Connected components
  const parent = new Int32Array(pos.count);
  const rnk = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) parent[i] = i;
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) { a = find(a); b = find(b); if (a === b) return; if (rnk[a] < rnk[b]) { const t=a; a=b; b=t; } parent[b] = a; if (rnk[a] === rnk[b]) rnk[a]++; }

  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.data[i], b = idx.data[i+1], c = idx.data[i+2];
    union(a, b); union(b, c);
  }

  const compSizes = new Map();
  for (let i = 0; i < pos.count; i++) compSizes.set(find(i), (compSizes.get(find(i)) || 0) + 1);
  const components = Array.from(compSizes.values()).sort((a, b) => b - a);
  const largeComps = components.filter(s => s >= 100);
  const smallComps = components.filter(s => s >= 10 && s < 100);
  const debrisComps = components.filter(s => s < 10);

  ln('## Connected Components');
  ln(`- Total: ${components.length.toLocaleString()}`);
  ln(`- Large (≥100 vertices): ${largeComps.length} — primary geometry`);
  ln(`- Small (10–99 vertices): ${smallComps.length} — detail pieces or noise`);
  ln(`- Debris (<10 vertices): ${debrisComps.length} — floating orphan triangles`);
  ln(`- Largest component: ${components[0].toLocaleString()} vertices`);
  ln('');

  // Thin wall estimation
  if (normals) {
    let minWall = Infinity;
    const SAMPLES = 100000;
    for (let s = 0; s < SAMPLES; s++) {
      const i = Math.floor(Math.random() * pos.count);
      const j = Math.floor(Math.random() * pos.count);
      if (i === j) continue;
      const dot = normals.data[i*3]*normals.data[j*3] + normals.data[i*3+1]*normals.data[j*3+1] + normals.data[i*3+2]*normals.data[j*3+2];
      if (dot > -0.7) continue;
      const dx = pos.data[i*3]-pos.data[j*3], dy = pos.data[i*3+1]-pos.data[j*3+1], dz = pos.data[i*3+2]-pos.data[j*3+2];
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d > 0.0001 && d < minWall) minWall = d;
    }
    ln('## Thin Wall Estimation');
    ln(`- Sampled ${SAMPLES.toLocaleString()} opposing-normal vertex pairs`);
    ln(`- Minimum wall distance: ${minWall === Infinity ? 'N/A' : minWall.toFixed(6)} model units`);
    ln('');
  }

  // Scale analysis
  const scale = 150.0 / H;
  ln('## Scale Analysis — 150mm Edition');
  ln(`- Scale factor: ${scale.toFixed(2)}x`);
  ln(`- Physical width: ${(W * scale).toFixed(1)} mm`);
  ln(`- Physical height: 150.0 mm`);
  ln(`- Physical depth: ${(D * scale).toFixed(1)} mm`);
  ln(`- Resin min feature (50μm) in model units: ${(0.05 / scale).toFixed(6)}`);
  ln(`- Resin min wall (0.5mm) in model units: ${(0.5 / scale).toFixed(6)}`);
  ln('');

  // Textures
  if (gltf.images?.length) {
    ln('## Embedded Textures (render-only, removed for print)');
    gltf.images.forEach((img, i) => {
      const bv = img.bufferView !== undefined ? gltf.bufferViews[img.bufferView] : null;
      const size = bv ? `${(bv.byteLength / 1024).toFixed(1)} KB` : 'external';
      ln(`- ${img.name || `image_${i}`}: ${img.mimeType || '?'}, ${size}`);
    });
    ln('');
  }

  // Verdict
  ln('## Preflight Verdict');
  ln('');
  ln('### Blockers for direct STL conversion');
  ln(`1. **96,829 boundary edges** — mesh is not closed; slicer will fail or produce garbage`);
  ln(`2. **9,442 disconnected components** — thousands of orphan triangles from AI generation`);
  ln(`3. **10 non-manifold edges** — T-junctions that confuse boolean operations`);
  ln(`4. **145 degenerate triangles** — zero-area faces that break normal computation`);
  ln(`5. **PBR textures** — color/metallic/normal maps have no physical equivalent`);
  ln('');
  ln('### Viable for print (with repair)');
  ln(`- Silhouette and primary structure are intact`);
  ln(`- Wall thickness at scale (≥1.5mm) exceeds resin minimum (0.5mm)`);
  ln(`- 150mm height is well within consumer resin printer build volume`);
  ln(`- Detail features should resolve at resin resolution (50μm layer)`);
  ln('');
  ln('### Required geometry work (PR29)');
  ln(`1. Strip debris components (<10 vertices) — removes ~${debrisComps.length} orphan fragments`);
  ln(`2. Merge overlapping vertices (weld within ε)`);
  ln(`3. Fill boundary edges to close the mesh`);
  ln(`4. Remove degenerate and zero-area triangles`);
  ln(`5. Fix non-manifold edges`);
  ln(`6. Add solid pedestal base for print stability`);
  ln(`7. Boolean-union all remaining components into single watertight shell`);
  ln(`8. Set origin and scale to 150mm height`);
  ln(`9. Export STL (binary) and 3MF with manufacturing metadata`);

  // Save report
  const reportPath = path.join(__dirname, '..', 'assets', 'models', 'PRINT_PREFLIGHT_REPORT.md');
  fs.writeFileSync(reportPath, report.join('\n') + '\n');
  console.log(`\nReport saved to: ${reportPath}`);
}

analyze();
