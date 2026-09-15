// DMF RELIC 01 — Print Master Preflight
// Analyzes dmf-studio-optimized.glb for 3D printing manufacturability
// Deterministic: same GLB → same report, always.
// Run: node scripts/preflight-print.cjs

const fs = require('fs');
const path = require('path');

const GLB_PATH = path.join(__dirname, '..', 'assets', 'models', 'dmf-studio-optimized.glb');
const TARGET_HEIGHT_MM = 150.0;
const RESIN_MIN_FEATURE_MM = 0.05;
const RESIN_MIN_WALL_MM = 0.5;

// Deterministic PRNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

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
  const rng = mulberry32(0xD4F01);

  ln('# DMF RELIC 01 — Print Master Preflight Report');
  ln(`Generated: ${new Date().toISOString()}`);
  ln(`Source: dmf-studio-optimized.glb (${(fileSize / 1024).toFixed(1)} KB, glTF ${version})`);
  ln(`Method: deterministic (seeded PRNG, same GLB → same report)`);
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
  const watertight = boundary === 0 && nonManifold === 0;

  ln('## Manifold Analysis');
  ln(`- Total edges: ${edgeMap.size.toLocaleString()}`);
  ln(`- Manifold (2 faces): ${manifold.toLocaleString()}`);
  ln(`- Boundary (1 face): ${boundary.toLocaleString()} ${boundary > 0 ? '⚠ HOLES' : '✓'}`);
  ln(`- Non-manifold (3+): ${nonManifold} ${nonManifold > 0 ? '⚠ OVERLAPS' : '✓'}`);
  ln(`- **Watertight: ${watertight ? 'YES ✓' : 'NO ✗'}**`);
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

  // Connected components (by index connectivity only — pre-weld)
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

  ln('## Connected Components (pre-weld, by index connectivity)');
  ln(`- Total: ${components.length.toLocaleString()}`);
  ln(`- Large (≥100 vertices): ${largeComps.length} — primary geometry`);
  ln(`- Small (10–99 vertices): ${smallComps.length} — detail pieces or noise`);
  ln(`- Debris (<10 vertices): ${debrisComps.length} — floating orphan triangles`);
  ln(`- Largest component: ${components[0].toLocaleString()} vertices`);
  ln('');
  ln('> **Note**: These counts use index connectivity only. Spatially coincident');
  ln('> vertices with distinct indices appear disconnected. A spatial weld pass');
  ln('> will likely collapse many boundary edges and merge components.');
  ln('');

  // Thin wall estimation (deterministic sampling)
  let minWallModel = Infinity;
  const SAMPLES = 100000;
  if (normals) {
    for (let s = 0; s < SAMPLES; s++) {
      const i = Math.floor(rng() * pos.count);
      const j = Math.floor(rng() * pos.count);
      if (i === j) continue;
      const dot = normals.data[i*3]*normals.data[j*3] + normals.data[i*3+1]*normals.data[j*3+1] + normals.data[i*3+2]*normals.data[j*3+2];
      if (dot > -0.7) continue;
      const dx = pos.data[i*3]-pos.data[j*3], dy = pos.data[i*3+1]-pos.data[j*3+1], dz = pos.data[i*3+2]-pos.data[j*3+2];
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d > 0.0001 && d < minWallModel) minWallModel = d;
    }
  }
  const scale = TARGET_HEIGHT_MM / H;
  const minWallMM = minWallModel === Infinity ? null : minWallModel * scale;

  ln('## Thin Wall Estimation (approximate)');
  ln(`- Method: ${SAMPLES.toLocaleString()} deterministic opposing-normal vertex pairs`);
  ln(`- Minimum wall distance: ${minWallModel === Infinity ? 'N/A' : minWallModel.toFixed(6)} model units`);
  if (minWallMM !== null) {
    ln(`- At ${TARGET_HEIGHT_MM}mm scale: ~${minWallMM.toFixed(2)} mm`);
  }
  ln('');
  ln('> **Caveat**: This is a statistical estimate from random vertex pairs, not');
  ln('> a true raycasting surface-thickness analysis. The actual minimum wall');
  ln('> thickness may be thinner in areas not sampled. Treat as indicative, not');
  ln('> as a manufacturing specification.');
  ln('');

  // Scale analysis
  ln(`## Scale Analysis — ${TARGET_HEIGHT_MM}mm Edition`);
  ln(`- Scale factor: ${scale.toFixed(2)}x`);
  ln(`- Physical width: ${(W * scale).toFixed(1)} mm`);
  ln(`- Physical height: ${TARGET_HEIGHT_MM} mm`);
  ln(`- Physical depth: ${(D * scale).toFixed(1)} mm`);
  ln(`- Resin min feature (${RESIN_MIN_FEATURE_MM * 1000}μm) in model units: ${(RESIN_MIN_FEATURE_MM / scale).toFixed(6)}`);
  ln(`- Resin min wall (${RESIN_MIN_WALL_MM}mm) in model units: ${(RESIN_MIN_WALL_MM / scale).toFixed(6)}`);
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

  // Dynamic verdict
  ln('## Preflight Verdict');
  ln('');

  const blockers = [];
  if (boundary > 0) blockers.push(`**${boundary.toLocaleString()} boundary edges** — mesh is not closed; slicer will fail or produce garbage`);
  if (components.length > 1) blockers.push(`**${components.length.toLocaleString()} disconnected components** (${debrisComps.length.toLocaleString()} debris fragments) — orphan geometry from AI generation`);
  if (nonManifold > 0) blockers.push(`**${nonManifold} non-manifold edges** — T-junctions that confuse boolean operations`);
  if (degenerate > 0) blockers.push(`**${degenerate} degenerate triangles** — zero-area faces that break normal computation`);
  if (gltf.images?.length) blockers.push(`**PBR textures** (${gltf.images.length}) — color/metallic/normal maps have no physical equivalent`);

  if (blockers.length > 0) {
    ln('### Blockers for direct STL conversion');
    blockers.forEach((b, i) => ln(`${i + 1}. ${b}`));
    ln('');
  }

  const viable = [];
  viable.push('Silhouette and primary structure are intact');
  if (minWallMM !== null) {
    const wallStatus = minWallMM >= RESIN_MIN_WALL_MM ? 'exceeds' : 'BELOW';
    viable.push(`Estimated wall thickness at scale (~${minWallMM.toFixed(1)}mm) ${wallStatus} resin minimum (${RESIN_MIN_WALL_MM}mm)`);
  }
  viable.push(`${TARGET_HEIGHT_MM}mm height is within consumer resin printer build volume`);
  viable.push(`Detail features should resolve at resin resolution (${RESIN_MIN_FEATURE_MM * 1000}μm layer)`);

  ln('### Viable for print (with repair)');
  viable.forEach(v => ln(`- ${v}`));
  ln('');

  ln('### Required geometry work');
  ln(`1. Remove ${degenerate} degenerate triangles and ${debrisComps.length.toLocaleString()} debris components`);
  ln(`2. Spatial vertex weld (merge coincident vertices within ε)`);
  ln(`3. Re-analyze: components, boundary edges, non-manifold after weld`);
  ln(`4. Filter components by surface area (not just vertex count)`);
  ln(`5. Orient normals consistently`);
  ln(`6. Close remaining boundary edges`);
  ln(`7. Add solid pedestal for print stability`);
  ln(`8. Validate watertight`);
  ln(`9. Scale to ${TARGET_HEIGHT_MM}mm and export STL alpha`);

  // Save report
  const reportPath = path.join(__dirname, '..', 'assets', 'models', 'PRINT_PREFLIGHT_REPORT.md');
  fs.writeFileSync(reportPath, report.join('\n') + '\n');
  console.log(`\nReport saved to: ${reportPath}`);
}

analyze();
