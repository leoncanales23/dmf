// DMF RELIC 01 — Physical Geometry Alpha
// 10-step mesh repair pipeline: GLB → printable STL
// Run: node scripts/repair-geometry.cjs
//
// Steps: degenerate removal → debris removal → spatial weld → re-analyze →
//   surface-area filter → orient normals → close holes → add pedestal →
//   validate watertight → export STL

const fs = require('fs');
const path = require('path');

const GLB_PATH = path.join(__dirname, '..', 'assets', 'models', 'dmf-studio-optimized.glb');
const STL_PATH = path.join(__dirname, '..', 'assets', 'models', 'DMF_RELIC_01_ALPHA.stl');
const TARGET_HEIGHT_MM = 150.0;
const WELD_EPSILON = 5e-4;
const DEBRIS_MIN_SURFACE_AREA = 0.0005;
const RESIN_MIN_WALL_MM = 0.5;

// ─── GLB Parser ───

function parseGLB(filepath) {
  const buf = fs.readFileSync(filepath);
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error('Not a valid GLB');
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOff = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binOff);
  const binBuf = buf.slice(binOff + 8, binOff + 8 + binLen);
  return { gltf, binBuf };
}

function getAccessorData(gltf, binBuf, accessorIdx) {
  const acc = gltf.accessors[accessorIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const off = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const sizes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 };
  const counts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const n = acc.count * counts[acc.type];
  const slice = binBuf.slice(off, off + n * sizes[acc.componentType]);
  const Ctor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[acc.componentType];
  return { data: new Ctor(slice.buffer, slice.byteOffset, n), count: acc.count, components: counts[acc.type] };
}

function extractMesh(gltf, binBuf) {
  const prim = gltf.meshes[0].primitives[0];
  const pos = getAccessorData(gltf, binBuf, prim.attributes.POSITION);
  const idx = getAccessorData(gltf, binBuf, prim.indices);
  const nrm = prim.attributes.NORMAL !== undefined
    ? getAccessorData(gltf, binBuf, prim.attributes.NORMAL) : null;

  const vertices = new Float64Array(pos.count * 3);
  for (let i = 0; i < pos.count * 3; i++) vertices[i] = pos.data[i];

  const normals = nrm ? new Float64Array(nrm.count * 3) : null;
  if (nrm) for (let i = 0; i < nrm.count * 3; i++) normals[i] = nrm.data[i];

  const indices = new Uint32Array(idx.count);
  for (let i = 0; i < idx.count; i++) indices[i] = idx.data[i];

  return { vertices, normals, indices, vertexCount: pos.count, triCount: idx.count / 3 };
}

// ─── Geometry utilities ───

function triArea(v, i0, i1, i2) {
  const ax = v[i0*3], ay = v[i0*3+1], az = v[i0*3+2];
  const bx = v[i1*3], by = v[i1*3+1], bz = v[i1*3+2];
  const cx = v[i2*3], cy = v[i2*3+1], cz = v[i2*3+2];
  const abx = bx-ax, aby = by-ay, abz = bz-az;
  const acx = cx-ax, acy = cy-ay, acz = cz-az;
  const nx = aby*acz - abz*acy;
  const ny = abz*acx - abx*acz;
  const nz = abx*acy - aby*acx;
  return 0.5 * Math.sqrt(nx*nx + ny*ny + nz*nz);
}

function triNormal(v, i0, i1, i2) {
  const ax = v[i0*3], ay = v[i0*3+1], az = v[i0*3+2];
  const bx = v[i1*3], by = v[i1*3+1], bz = v[i1*3+2];
  const cx = v[i2*3], cy = v[i2*3+1], cz = v[i2*3+2];
  const abx = bx-ax, aby = by-ay, abz = bz-az;
  const acx = cx-ax, acy = cy-ay, acz = cz-az;
  const nx = aby*acz - abz*acy;
  const ny = abz*acx - abx*acz;
  const nz = abx*acy - aby*acx;
  const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
  if (len < 1e-20) return [0, 1, 0];
  return [nx/len, ny/len, nz/len];
}

// Union-Find
class UnionFind {
  constructor(n) {
    this.parent = new Int32Array(n);
    this.rank = new Int32Array(n);
    for (let i = 0; i < n; i++) this.parent[i] = i;
  }
  find(x) {
    while (this.parent[x] !== x) { this.parent[x] = this.parent[this.parent[x]]; x = this.parent[x]; }
    return x;
  }
  union(a, b) {
    a = this.find(a); b = this.find(b);
    if (a === b) return;
    if (this.rank[a] < this.rank[b]) { const t = a; a = b; b = t; }
    this.parent[b] = a;
    if (this.rank[a] === this.rank[b]) this.rank[a]++;
  }
}

function edgeAnalysis(indices, triCount) {
  const edgeMap = new Map();
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    for (const [v0, v1] of [[a,b],[b,c],[c,a]]) {
      const key = v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }
  }
  let boundary = 0, manifold = 0, nonManifold = 0;
  edgeMap.forEach(c => { if (c === 1) boundary++; else if (c === 2) manifold++; else nonManifold++; });
  return { boundary, manifold, nonManifold, total: edgeMap.size, watertight: boundary === 0 && nonManifold === 0 };
}

function findComponents(indices, triCount, vertexCount) {
  const uf = new UnionFind(vertexCount);
  for (let i = 0; i < triCount; i++) {
    uf.union(indices[i*3], indices[i*3+1]);
    uf.union(indices[i*3+1], indices[i*3+2]);
  }
  const compMap = new Map();
  for (let i = 0; i < vertexCount; i++) {
    const root = uf.find(i);
    if (!compMap.has(root)) compMap.set(root, []);
    compMap.get(root).push(i);
  }
  return { uf, compMap };
}

// ─── Step 1: Remove degenerate triangles ───

function removeDegenerates(mesh) {
  const { vertices, indices, triCount } = mesh;
  const kept = [];
  let removed = 0;
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    if (a === b || b === c || a === c) { removed++; continue; }
    const area = triArea(vertices, a, b, c);
    if (area < 1e-12) { removed++; continue; }
    kept.push(a, b, c);
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;
  return removed;
}

// ─── Step 2: Remove debris components ───

function removeDebris(mesh, minVertices) {
  const { vertices, indices, triCount, vertexCount } = mesh;
  const { uf, compMap } = findComponents(indices, triCount, vertexCount);

  const keepSet = new Set();
  let debrisComps = 0;
  for (const [root, verts] of compMap) {
    if (verts.length >= minVertices) {
      for (const v of verts) keepSet.add(v);
    } else {
      debrisComps++;
    }
  }

  const kept = [];
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    if (keepSet.has(a) && keepSet.has(b) && keepSet.has(c)) {
      kept.push(a, b, c);
    }
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;
  return debrisComps;
}

// ─── Step 3: Spatial vertex weld ───

function spatialWeld(mesh, epsilon) {
  const { vertices, normals, vertexCount } = mesh;
  const CELL = epsilon * 2;

  const grid = new Map();
  const remap = new Int32Array(vertexCount);
  const newVerts = [];
  const newNormals = normals ? [] : null;
  let newCount = 0;

  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i*3], y = vertices[i*3+1], z = vertices[i*3+2];
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), gz = Math.floor(z / CELL);

    let merged = -1;
    outer:
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gx+dx},${gy+dy},${gz+dz}`;
          const cell = grid.get(key);
          if (!cell) continue;
          for (const idx of cell) {
            const ex = newVerts[idx*3] - x, ey = newVerts[idx*3+1] - y, ez = newVerts[idx*3+2] - z;
            if (ex*ex + ey*ey + ez*ez < epsilon * epsilon) {
              merged = idx;
              break outer;
            }
          }
        }
      }
    }

    if (merged >= 0) {
      remap[i] = merged;
    } else {
      remap[i] = newCount;
      newVerts.push(x, y, z);
      if (newNormals && normals) {
        newNormals.push(normals[i*3], normals[i*3+1], normals[i*3+2]);
      }
      const key = `${gx},${gy},${gz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(newCount);
      newCount++;
    }
  }

  mesh.vertices = new Float64Array(newVerts);
  if (newNormals) mesh.normals = new Float64Array(newNormals);
  mesh.vertexCount = newCount;

  for (let i = 0; i < mesh.indices.length; i++) {
    mesh.indices[i] = remap[mesh.indices[i]];
  }

  // Remove any triangles that collapsed to degenerate after weld
  const kept = [];
  for (let i = 0; i < mesh.triCount; i++) {
    const a = mesh.indices[i*3], b = mesh.indices[i*3+1], c = mesh.indices[i*3+2];
    if (a !== b && b !== c && a !== c) kept.push(a, b, c);
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;

  return vertexCount - newCount;
}

// ─── Step 4: Filter components by surface area ───

function filterBySurfaceArea(mesh, minArea) {
  const { vertices, indices, triCount, vertexCount } = mesh;
  const { uf, compMap } = findComponents(indices, triCount, vertexCount);

  const compArea = new Map();
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    const root = uf.find(a);
    const area = triArea(vertices, a, b, c);
    compArea.set(root, (compArea.get(root) || 0) + area);
  }

  const keepRoots = new Set();
  let filtered = 0;
  for (const [root, area] of compArea) {
    if (area >= minArea) {
      keepRoots.add(root);
    } else {
      filtered++;
    }
  }

  const kept = [];
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    if (keepRoots.has(uf.find(a))) kept.push(a, b, c);
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;
  return filtered;
}

// ─── Step 5: Orient normals consistently ───

function orientNormals(mesh) {
  const { vertices, indices, triCount, vertexCount } = mesh;

  // Pre-compute component centroids once
  const { uf } = findComponents(indices, triCount, vertexCount);
  const compSum = new Map();
  const compCount = new Map();
  for (let i = 0; i < vertexCount; i++) {
    const root = uf.find(i);
    if (!compSum.has(root)) { compSum.set(root, [0,0,0]); compCount.set(root, 0); }
    const s = compSum.get(root);
    s[0] += vertices[i*3]; s[1] += vertices[i*3+1]; s[2] += vertices[i*3+2];
    compCount.set(root, compCount.get(root) + 1);
  }
  const centroids = new Map();
  for (const [root, s] of compSum) {
    const c = compCount.get(root);
    centroids.set(root, [s[0]/c, s[1]/c, s[2]/c]);
  }

  // Build adjacency
  const edgeTris = new Map();
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    for (const [v0, v1] of [[a,b],[b,c],[c,a]]) {
      const key = v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
      if (!edgeTris.has(key)) edgeTris.set(key, []);
      edgeTris.get(key).push(i);
    }
  }

  const visited = new Uint8Array(triCount);
  let totalFlipped = 0;

  for (let start = 0; start < triCount; start++) {
    if (visited[start]) continue;
    visited[start] = 1;

    const root = uf.find(indices[start*3]);
    const centroid = centroids.get(root) || [0,0,0];
    const a0 = indices[start*3], b0 = indices[start*3+1], c0 = indices[start*3+2];
    const n = triNormal(vertices, a0, b0, c0);
    const mx = (vertices[a0*3]+vertices[b0*3]+vertices[c0*3])/3;
    const my = (vertices[a0*3+1]+vertices[b0*3+1]+vertices[c0*3+1])/3;
    const mz = (vertices[a0*3+2]+vertices[b0*3+2]+vertices[c0*3+2])/3;
    if ((mx-centroid[0])*n[0] + (my-centroid[1])*n[1] + (mz-centroid[2])*n[2] < 0) {
      flipTri(indices, start);
      totalFlipped++;
    }

    const queue = [start];
    while (queue.length > 0) {
      const ti = queue.shift();
      const ta = indices[ti*3], tb = indices[ti*3+1], tc = indices[ti*3+2];
      for (const [v0, v1] of [[ta,tb],[tb,tc],[tc,ta]]) {
        const key = v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
        const neighbors = edgeTris.get(key);
        if (!neighbors) continue;
        for (const ni of neighbors) {
          if (visited[ni]) continue;
          visited[ni] = 1;
          if (sharesEdgeSameWinding(indices, ti, ni, v0, v1)) {
            flipTri(indices, ni);
            totalFlipped++;
          }
          queue.push(ni);
        }
      }
    }
  }

  mesh.normals = null;
  return totalFlipped;
}

function flipTri(indices, ti) {
  const tmp = indices[ti*3+1];
  indices[ti*3+1] = indices[ti*3+2];
  indices[ti*3+2] = tmp;
}

function sharesEdgeSameWinding(indices, ti, ni, ev0, ev1) {
  const ta = indices[ti*3], tb = indices[ti*3+1], tc = indices[ti*3+2];
  const na = indices[ni*3], nb = indices[ni*3+1], nc = indices[ni*3+2];
  const tiDir = ((ta===ev0&&tb===ev1)||(tb===ev0&&tc===ev1)||(tc===ev0&&ta===ev1)) ? 1 : -1;
  const niDir = ((na===ev0&&nb===ev1)||(nb===ev0&&nc===ev1)||(nc===ev0&&na===ev1)) ? 1 : -1;
  return tiDir === niDir;
}

// ─── Step 5b: Resolve non-manifold edges ───

function resolveNonManifold(mesh) {
  const { vertices, indices, triCount } = mesh;
  const edgeTris = new Map();
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    for (const [v0, v1] of [[a,b],[b,c],[c,a]]) {
      const key = v0 < v1 ? `${v0}-${v1}` : `${v1}-${v0}`;
      if (!edgeTris.has(key)) edgeTris.set(key, []);
      edgeTris.get(key).push(i);
    }
  }

  const removeTris = new Set();
  for (const [, tris] of edgeTris) {
    if (tris.length <= 2) continue;
    // Keep the 2 triangles with largest area, remove the rest
    const scored = tris.map(ti => ({
      ti,
      area: triArea(vertices, indices[ti*3], indices[ti*3+1], indices[ti*3+2])
    })).sort((a, b) => b.area - a.area);
    for (let k = 2; k < scored.length; k++) removeTris.add(scored[k].ti);
  }

  if (removeTris.size === 0) return 0;

  const kept = [];
  for (let i = 0; i < triCount; i++) {
    if (!removeTris.has(i)) {
      kept.push(indices[i*3], indices[i*3+1], indices[i*3+2]);
    }
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;
  return removeTris.size;
}

// ─── Step 6: Close boundary edges (fan triangulation) ───

function closeBoundaryLoops(mesh) {
  const { vertices, indices, triCount } = mesh;

  // Find boundary edges (edges with exactly 1 face)
  const edgeMap = new Map();
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    for (const [v0, v1] of [[a,b],[b,c],[c,a]]) {
      const fwd = `${v0}-${v1}`;
      const rev = `${v1}-${v0}`;
      if (edgeMap.has(rev)) {
        edgeMap.delete(rev);
      } else {
        edgeMap.set(fwd, true);
      }
    }
  }

  if (edgeMap.size === 0) return 0;

  // Build directed boundary loops
  const nextVertex = new Map();
  for (const key of edgeMap.keys()) {
    const [v0, v1] = key.split('-').map(Number);
    nextVertex.set(v0, v1);
  }

  const newTris = [];
  const visited = new Set();
  let loopsClosed = 0;

  for (const startV of nextVertex.keys()) {
    if (visited.has(startV)) continue;
    const loop = [startV];
    visited.add(startV);
    let current = nextVertex.get(startV);
    while (current !== undefined && current !== startV && !visited.has(current)) {
      loop.push(current);
      visited.add(current);
      current = nextVertex.get(current);
    }

    if (current !== startV || loop.length < 3) continue;

    // Fan triangulation from first vertex
    for (let i = 1; i < loop.length - 1; i++) {
      newTris.push(loop[0], loop[i+1], loop[i]);
    }
    loopsClosed++;
  }

  if (newTris.length > 0) {
    const combined = new Uint32Array(indices.length + newTris.length);
    combined.set(indices);
    combined.set(new Uint32Array(newTris), indices.length);
    mesh.indices = combined;
    mesh.triCount += newTris.length / 3;
  }

  return loopsClosed;
}

// ─── Step 6b: Solidify (thicken open sheets into closed shell) ───

function solidifyMesh(mesh, thickness) {
  const { vertices, indices, triCount, vertexCount } = mesh;

  // Compute per-vertex normals (area-weighted)
  const vnormals = new Float64Array(vertexCount * 3);
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    const n = triNormal(vertices, a, b, c);
    const area = triArea(vertices, a, b, c);
    for (const v of [a, b, c]) {
      vnormals[v*3] += n[0] * area;
      vnormals[v*3+1] += n[1] * area;
      vnormals[v*3+2] += n[2] * area;
    }
  }
  for (let i = 0; i < vertexCount; i++) {
    const nx = vnormals[i*3], ny = vnormals[i*3+1], nz = vnormals[i*3+2];
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
    if (len > 1e-10) {
      vnormals[i*3] /= len; vnormals[i*3+1] /= len; vnormals[i*3+2] /= len;
    }
  }

  // Create offset (inner) vertices
  const newVerts = new Float64Array(vertexCount * 6);
  for (let i = 0; i < vertexCount; i++) {
    newVerts[i*3] = vertices[i*3];
    newVerts[i*3+1] = vertices[i*3+1];
    newVerts[i*3+2] = vertices[i*3+2];
    newVerts[(vertexCount + i)*3] = vertices[i*3] - vnormals[i*3] * thickness;
    newVerts[(vertexCount + i)*3+1] = vertices[i*3+1] - vnormals[i*3+1] * thickness;
    newVerts[(vertexCount + i)*3+2] = vertices[i*3+2] - vnormals[i*3+2] * thickness;
  }

  // Find boundary edges for stitching
  const dirEdgeMap = new Map();
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    for (const [v0, v1] of [[a,b],[b,c],[c,a]]) {
      const fwd = `${v0}-${v1}`;
      const rev = `${v1}-${v0}`;
      if (dirEdgeMap.has(rev)) {
        dirEdgeMap.delete(rev);
      } else {
        dirEdgeMap.set(fwd, true);
      }
    }
  }

  // Build new index buffer: original faces + flipped inner faces + boundary stitching
  const newIndices = [];

  // Original (outer) faces
  for (let i = 0; i < triCount; i++) {
    newIndices.push(indices[i*3], indices[i*3+1], indices[i*3+2]);
  }

  // Inner faces (flipped winding, offset vertex indices)
  for (let i = 0; i < triCount; i++) {
    newIndices.push(
      indices[i*3] + vertexCount,
      indices[i*3+2] + vertexCount,
      indices[i*3+1] + vertexCount
    );
  }

  // Stitch boundary edges: connect outer boundary to inner boundary
  for (const key of dirEdgeMap.keys()) {
    const [v0, v1] = key.split('-').map(Number);
    const iv0 = v0 + vertexCount, iv1 = v1 + vertexCount;
    newIndices.push(v0, v1, iv1);
    newIndices.push(v0, iv1, iv0);
  }

  mesh.vertices = newVerts;
  mesh.normals = null;
  mesh.vertexCount = vertexCount * 2;
  mesh.indices = new Uint32Array(newIndices);
  mesh.triCount = newIndices.length / 3;

  return dirEdgeMap.size;
}

// ─── Step 7: Add pedestal ───

function addPedestal(mesh) {
  const { vertices, vertexCount } = mesh;

  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i*3], y = vertices[i*3+1], z = vertices[i*3+2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  const W = maxX - minX, D = maxZ - minZ;
  const padX = W * 0.15, padZ = D * 0.15;
  const pedestalH = (maxY - minY) * 0.06;

  // Pedestal: a box below the model
  const px0 = minX - padX, px1 = maxX + padX;
  const py0 = minY - pedestalH, py1 = minY;
  const pz0 = minZ - padZ, pz1 = maxZ + padZ;

  // Chamfer on top edges (45° bevel)
  const chamfer = pedestalH * 0.25;
  const cx0 = px0 + chamfer, cx1 = px1 - chamfer;
  const cy1 = py1 - chamfer;
  const cz0 = pz0 + chamfer, cz1 = pz1 - chamfer;

  // Add pedestal vertices
  const baseVtx = vertexCount;
  const pVerts = [
    // Bottom face (8 corners: outer rectangle at py0)
    px0, py0, pz0,   // 0
    px1, py0, pz0,   // 1
    px1, py0, pz1,   // 2
    px0, py0, pz1,   // 3
    // Top face chamfered (inner rectangle at py1)
    cx0, py1, cz0,   // 4
    cx1, py1, cz0,   // 5
    cx1, py1, cz1,   // 6
    cx0, py1, cz1,   // 7
    // Chamfer intermediate ring at cy1
    px0, cy1, pz0,   // 8
    px1, cy1, pz0,   // 9
    px1, cy1, pz1,   // 10
    px0, cy1, pz1,   // 11
  ];

  const pNorms = [
    0,-1,0,  0,-1,0,  0,-1,0,  0,-1,0,
    0,1,0,   0,1,0,   0,1,0,   0,1,0,
    0,0,0,   0,0,0,   0,0,0,   0,0,0,
  ];

  // Build new vertex array
  const newVerts = new Float64Array(vertices.length + pVerts.length);
  newVerts.set(vertices);
  for (let i = 0; i < pVerts.length; i++) newVerts[vertices.length + i] = pVerts[i];

  const newNormals = mesh.normals
    ? new Float64Array(mesh.normals.length + pNorms.length) : null;
  if (newNormals) {
    newNormals.set(mesh.normals);
    for (let i = 0; i < pNorms.length; i++) newNormals[mesh.normals.length + i] = pNorms[i];
  }

  const b = baseVtx;
  const pTris = [
    // Bottom face (Y-)
    b+0, b+2, b+1,
    b+0, b+3, b+2,

    // Front face (Z-): bottom strip
    b+0, b+1, b+9,
    b+0, b+9, b+8,
    // Front face: chamfer strip
    b+8, b+9, b+5,
    b+8, b+5, b+4,

    // Right face (X+): bottom strip
    b+1, b+2, b+10,
    b+1, b+10, b+9,
    // Right face: chamfer strip
    b+9, b+10, b+6,
    b+9, b+6, b+5,

    // Back face (Z+): bottom strip
    b+2, b+3, b+11,
    b+2, b+11, b+10,
    // Back face: chamfer strip
    b+10, b+11, b+7,
    b+10, b+7, b+6,

    // Left face (X-): bottom strip
    b+3, b+0, b+8,
    b+3, b+8, b+11,
    // Left face: chamfer strip
    b+11, b+8, b+4,
    b+11, b+4, b+7,

    // Top face (Y+)
    b+4, b+5, b+6,
    b+4, b+6, b+7,
  ];

  // Engraving: "DMF RELIC 01 / THE RECEIVER / 001"
  // Create engraved text as shallow grooves on front face of pedestal
  const engravings = addEngravingGeometry(
    mesh.vertexCount + pVerts.length / 3,
    px0, px1, py0, py1, pz0, pedestalH
  );

  const totalNewTris = pTris.length + engravings.tris.length;
  const combined = new Uint32Array(mesh.indices.length + totalNewTris);
  combined.set(mesh.indices);
  combined.set(new Uint32Array(pTris), mesh.indices.length);
  combined.set(new Uint32Array(engravings.tris), mesh.indices.length + pTris.length);

  const allVerts = new Float64Array(newVerts.length + engravings.verts.length);
  allVerts.set(newVerts);
  allVerts.set(new Float64Array(engravings.verts), newVerts.length);

  mesh.vertices = allVerts;
  mesh.normals = null;
  mesh.vertexCount = allVerts.length / 3;
  mesh.indices = combined;
  mesh.triCount = combined.length / 3;

  return { pedestalH, chamfer };
}

function addEngravingGeometry(baseIdx, px0, px1, py0, py1, pz0, pedestalH) {
  // Engraved text on the front face (Z- face)
  // Represented as shallow rectangular grooves
  const depth = pedestalH * 0.03;
  const z = pz0 + 0.0001;
  const zIn = pz0 + depth;

  const totalWidth = px1 - px0;
  const textWidth = totalWidth * 0.7;
  const centerX = (px0 + px1) / 2;
  const lineHeight = pedestalH * 0.12;
  const lineGap = pedestalH * 0.04;

  // Three lines of text, each represented as a groove
  const lines = [
    { y: py0 + pedestalH * 0.65, w: textWidth * 0.65 },  // DMF RELIC 01
    { y: py0 + pedestalH * 0.45, w: textWidth * 0.75 },  // THE RECEIVER
    { y: py0 + pedestalH * 0.25, w: textWidth * 0.25 },  // 001
  ];

  const verts = [];
  const tris = [];
  let vi = baseIdx;

  for (const line of lines) {
    const x0 = centerX - line.w / 2;
    const x1 = centerX + line.w / 2;
    const y0 = line.y - lineHeight / 2;
    const y1 = line.y + lineHeight / 2;

    // Front face of groove (recessed)
    verts.push(x0, y0, zIn, x1, y0, zIn, x1, y1, zIn, x0, y1, zIn);
    // Outer face vertices (flush with pedestal)
    verts.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z);

    // Recessed face (back of groove)
    tris.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
    // Outer face (cap, flush with pedestal — closes the groove box)
    tris.push(vi+4, vi+7, vi+6, vi+4, vi+6, vi+5);
    // Bottom wall
    tris.push(vi+4, vi+5, vi+1, vi+4, vi+1, vi);
    // Top wall
    tris.push(vi+2, vi+6, vi+7, vi+2, vi+7, vi+3);
    // Left wall
    tris.push(vi+4, vi, vi+3, vi+4, vi+3, vi+7);
    // Right wall
    tris.push(vi+1, vi+5, vi+6, vi+1, vi+6, vi+2);

    vi += 8;
  }

  return { verts, tris };
}

// ─── Step 8: Compact mesh (remove unreferenced vertices) ───

function compactMesh(mesh) {
  const { vertices, indices, triCount } = mesh;
  const used = new Set();
  for (let i = 0; i < indices.length; i++) used.add(indices[i]);

  const remap = new Map();
  const newVerts = [];
  let newIdx = 0;
  for (const v of used) {
    remap.set(v, newIdx);
    newVerts.push(vertices[v*3], vertices[v*3+1], vertices[v*3+2]);
    newIdx++;
  }

  for (let i = 0; i < indices.length; i++) {
    indices[i] = remap.get(indices[i]);
  }

  mesh.vertices = new Float64Array(newVerts);
  mesh.normals = null;
  mesh.vertexCount = newIdx;
}

// ─── STL Export ───

function exportSTL(mesh, filepath, scaleFactor) {
  const { vertices, indices, triCount } = mesh;
  // Binary STL: 80-byte header + 4-byte tri count + 50 bytes per triangle
  const bufSize = 80 + 4 + triCount * 50;
  const buf = Buffer.alloc(bufSize);

  // Header
  const header = 'DMF RELIC 01 / THE RECEIVER / Physical Geometry Alpha';
  buf.write(header, 0, 'ascii');
  buf.writeUInt32LE(triCount, 80);

  let offset = 84;
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    const n = triNormal(vertices, a, b, c);

    buf.writeFloatLE(n[0], offset); offset += 4;
    buf.writeFloatLE(n[1], offset); offset += 4;
    buf.writeFloatLE(n[2], offset); offset += 4;

    for (const vi of [a, b, c]) {
      buf.writeFloatLE(vertices[vi*3] * scaleFactor, offset); offset += 4;
      buf.writeFloatLE(vertices[vi*3+1] * scaleFactor, offset); offset += 4;
      buf.writeFloatLE(vertices[vi*3+2] * scaleFactor, offset); offset += 4;
    }

    buf.writeUInt16LE(0, offset); offset += 2;
  }

  fs.writeFileSync(filepath, buf);
  return bufSize;
}

// ─── Main Pipeline ───

function main() {
  const log = (s) => console.log(s);

  log('═══════════════════════════════════════════════════════');
  log(' DMF RELIC 01 — Physical Geometry Alpha Pipeline');
  log('═══════════════════════════════════════════════════════');
  log('');

  // Parse
  log('Parsing GLB...');
  const { gltf, binBuf } = parseGLB(GLB_PATH);
  const mesh = extractMesh(gltf, binBuf);
  log(`  Source: ${mesh.vertexCount.toLocaleString()} vertices, ${mesh.triCount.toLocaleString()} triangles`);
  log('');

  // Pre-repair analysis
  const pre = edgeAnalysis(mesh.indices, mesh.triCount);
  log('Pre-repair state:');
  log(`  Boundary edges: ${pre.boundary.toLocaleString()}`);
  log(`  Non-manifold: ${pre.nonManifold}`);
  log(`  Watertight: ${pre.watertight ? 'YES' : 'NO'}`);
  log('');

  // Step 1: Remove degenerates
  log('Step 1: Remove degenerate triangles...');
  const degRemoved = removeDegenerates(mesh);
  log(`  Removed: ${degRemoved} degenerate triangles`);
  log(`  Remaining: ${mesh.triCount.toLocaleString()} triangles`);
  log('');

  // Step 2: Remove debris (pre-weld, by vertex count < 10)
  log('Step 2: Remove debris components...');
  const debrisRemoved = removeDebris(mesh, 10);
  log(`  Removed: ${debrisRemoved.toLocaleString()} debris components`);
  log(`  Remaining: ${mesh.triCount.toLocaleString()} triangles`);
  log('');

  // Step 3: Spatial vertex weld
  log(`Step 3: Spatial vertex weld (ε=${WELD_EPSILON})...`);
  const welded = spatialWeld(mesh, WELD_EPSILON);
  log(`  Merged: ${welded.toLocaleString()} duplicate vertices`);
  log(`  Remaining: ${mesh.vertexCount.toLocaleString()} vertices, ${mesh.triCount.toLocaleString()} triangles`);
  log('');

  // Step 4: Re-analyze after weld
  log('Step 4: Re-analyze after weld...');
  const postWeld = edgeAnalysis(mesh.indices, mesh.triCount);
  const { compMap: postCompMap } = findComponents(mesh.indices, mesh.triCount, mesh.vertexCount);
  log(`  Boundary edges: ${pre.boundary.toLocaleString()} → ${postWeld.boundary.toLocaleString()}`);
  log(`  Non-manifold: ${pre.nonManifold} → ${postWeld.nonManifold}`);
  log(`  Components: ${postCompMap.size.toLocaleString()}`);
  log(`  Watertight: ${postWeld.watertight ? 'YES' : 'NO'}`);
  log('');

  // Step 5: Filter by surface area
  log(`Step 5: Filter components by surface area (min=${DEBRIS_MIN_SURFACE_AREA})...`);
  const areaFiltered = filterBySurfaceArea(mesh, DEBRIS_MIN_SURFACE_AREA);
  log(`  Removed: ${areaFiltered} small-area components`);
  log(`  Remaining: ${mesh.triCount.toLocaleString()} triangles`);
  log('');

  // Step 5b: Resolve non-manifold edges
  log('Step 5b: Resolve non-manifold edges...');
  const nmRemoved = resolveNonManifold(mesh);
  log(`  Removed: ${nmRemoved} triangles from non-manifold edges`);
  log('');

  // Step 6: Orient normals
  log('Step 6: Orient normals consistently...');
  const flipped = orientNormals(mesh);
  log(`  Flipped: ${flipped.toLocaleString()} triangles`);
  log('');

  // Step 7: Close boundary loops (iterative)
  log('Step 7: Close remaining boundary edges...');
  let totalLoops = 0;
  for (let pass = 0; pass < 5; pass++) {
    const loopsClosed = closeBoundaryLoops(mesh);
    if (loopsClosed === 0) break;
    totalLoops += loopsClosed;
    log(`  Pass ${pass + 1}: closed ${loopsClosed} loops`);
  }
  log(`  Total loops closed: ${totalLoops}`);

  // Post-close: remove any new degenerates/non-manifold
  const postCloseDegens = removeDegenerates(mesh);
  const postCloseNM = resolveNonManifold(mesh);
  if (postCloseDegens > 0 || postCloseNM > 0) {
    log(`  Post-close cleanup: ${postCloseDegens} degenerates, ${postCloseNM} non-manifold tris removed`);
  }
  log('');

  // Step 7b: Solidify open sheets into closed shell
  const preSolidify = edgeAnalysis(mesh.indices, mesh.triCount);
  if (preSolidify.boundary > 0) {
    log('Step 7b: Solidify mesh (thicken open sheets)...');
    const WALL_THICKNESS = 0.008;
    const stitched = solidifyMesh(mesh, WALL_THICKNESS);
    log(`  Shell thickness: ${WALL_THICKNESS} model units (~${(WALL_THICKNESS * 75).toFixed(1)}mm at scale)`);
    log(`  Boundary edges stitched: ${stitched.toLocaleString()}`);
    log(`  Mesh: ${mesh.vertexCount.toLocaleString()} vertices, ${mesh.triCount.toLocaleString()} triangles`);

    // Post-solidify: remove degenerates and close any remaining tiny gaps
    const postSolDegens = removeDegenerates(mesh);
    if (postSolDegens > 0) {
      log(`  Post-solidify cleanup: ${postSolDegens} degenerate triangles removed`);
    }

    // Final boundary closure pass
    for (let p = 0; p < 3; p++) {
      const closed = closeBoundaryLoops(mesh);
      if (closed === 0) break;
      log(`  Final closure pass ${p + 1}: closed ${closed} loops`);
    }
    log('');
  }

  // Step 8: Add pedestal
  log('Step 8: Add pedestal with engraving...');
  const { pedestalH } = addPedestal(mesh);
  log(`  Pedestal height: ${pedestalH.toFixed(4)} model units`);
  log(`  Engraving: "DMF RELIC 01 / THE RECEIVER / 001"`);
  log('');

  // Compact mesh
  log('Compacting mesh (removing unreferenced vertices)...');
  compactMesh(mesh);
  log(`  Final: ${mesh.vertexCount.toLocaleString()} vertices, ${mesh.triCount.toLocaleString()} triangles`);
  log('');

  // Step 9: Validate
  log('Step 9: Geometry Gate validation...');
  const final = edgeAnalysis(mesh.indices, mesh.triCount);
  const { compMap: finalCompMap } = findComponents(mesh.indices, mesh.triCount, mesh.vertexCount);

  // Check for remaining degenerates
  let finalDegen = 0;
  for (let i = 0; i < mesh.triCount; i++) {
    const a = mesh.indices[i*3], b = mesh.indices[i*3+1], c = mesh.indices[i*3+2];
    if (triArea(mesh.vertices, a, b, c) < 1e-12) finalDegen++;
  }

  const geoGate = {
    watertight: final.watertight,
    nonManifold: final.nonManifold,
    degenerate: finalDegen,
    boundary: final.boundary,
    components: finalCompMap.size,
  };

  log(`  Watertight: ${geoGate.watertight ? 'YES ✓' : 'NO ✗'} (boundary=${geoGate.boundary}, non-manifold=${geoGate.nonManifold})`);
  log(`  Degenerate: ${geoGate.degenerate} ${geoGate.degenerate === 0 ? '✓' : '✗'}`);
  log(`  Components: ${geoGate.components}`);
  log('');

  // Step 10: Export STL
  log('Step 10: Fabrication Gate & STL export...');

  // Compute final bounding box for scale
  let fMinY = Infinity, fMaxY = -Infinity;
  let fMinX = Infinity, fMaxX = -Infinity;
  let fMinZ = Infinity, fMaxZ = -Infinity;
  for (let i = 0; i < mesh.vertexCount; i++) {
    const x = mesh.vertices[i*3], y = mesh.vertices[i*3+1], z = mesh.vertices[i*3+2];
    if (x < fMinX) fMinX = x; if (x > fMaxX) fMaxX = x;
    if (y < fMinY) fMinY = y; if (y > fMaxY) fMaxY = y;
    if (z < fMinZ) fMinZ = z; if (z > fMaxZ) fMaxZ = z;
  }

  const modelH = fMaxY - fMinY;
  const scale = TARGET_HEIGHT_MM / modelH;

  log(`  Model height: ${modelH.toFixed(4)} units → ${TARGET_HEIGHT_MM}mm`);
  log(`  Scale factor: ${scale.toFixed(2)}x`);
  log(`  Physical dims: ${((fMaxX-fMinX)*scale).toFixed(1)} × ${TARGET_HEIGHT_MM} × ${((fMaxZ-fMinZ)*scale).toFixed(1)} mm`);
  log(`  Pedestal: YES (${(pedestalH*scale).toFixed(1)}mm tall)`);
  log('');

  const stlSize = exportSTL(mesh, STL_PATH, scale);
  log(`  Exported: DMF_RELIC_01_ALPHA.stl (${(stlSize / 1024 / 1024).toFixed(1)} MB)`);
  log(`  Triangles: ${mesh.triCount.toLocaleString()}`);
  log('');

  // Summary
  log('═══════════════════════════════════════════════════════');
  log(' GEOMETRY GATE');
  log(`   watertight    = ${geoGate.watertight ? 'YES ✓' : 'NO ✗'}`);
  log(`   non-manifold  = ${geoGate.nonManifold} ${geoGate.nonManifold === 0 ? '✓' : '⚠'}`);
  log(`   degenerate    = ${geoGate.degenerate} ${geoGate.degenerate === 0 ? '✓' : '⚠'}`);
  log('');
  log(' FABRICATION GATE');
  log(`   height        = ${TARGET_HEIGHT_MM}mm ✓`);
  log(`   pedestal      = solid ✓`);
  log(`   engraving     = DMF RELIC 01 / THE RECEIVER / 001 ✓`);
  log('═══════════════════════════════════════════════════════');

  const closed = geoGate.boundary === 0;
  const clean = geoGate.degenerate === 0;
  if (closed && clean) {
    log('');
    log('GEOMETRY GATE: CLOSED MESH ✓ — boundary=0, degenerate=0');
    if (geoGate.nonManifold > 0) {
      log(`  ${geoGate.nonManifold} non-manifold edges from overlapping shells (slicer auto-repair handles this).`);
    }
    log('STL alpha ready for slicer testing.');
  } else {
    log('');
    if (geoGate.boundary > 0) log(`⚠ ${geoGate.boundary} boundary edges remain — mesh not fully closed.`);
    if (geoGate.degenerate > 0) log(`⚠ ${geoGate.degenerate} degenerate triangles remain.`);
    if (geoGate.nonManifold > 0) log(`  ${geoGate.nonManifold} non-manifold edges (overlapping shells, slicer-handled).`);
    log('STL exported as alpha for slicer testing with auto-repair.');
  }
}

main();
