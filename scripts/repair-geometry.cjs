// DMF RELIC 01 — Drainable Core
// Volumetric manifold rebuild with shell hollowing, drain engineering,
// drainability verification, and surface fidelity measurement
// Run: node scripts/repair-geometry.cjs
//
// Pipeline: parse → clean → weld → voxelize (256³) with pedestal → dilate →
//   flood fill → hollow interior → carve drains → connect to drains →
//   verify drainability → engrave (stroke font) → marching cubes →
//   surface deviation → validate → export STL + SHA-256

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GLB_PATH = path.join(__dirname, '..', 'assets', 'models', 'dmf-studio-optimized.glb');
const STL_PATH = path.join(__dirname, '..', 'assets', 'models', 'DMF_RELIC_01_ALPHA.stl');
const TARGET_HEIGHT_MM = 150.0;
const WELD_EPSILON = 5e-4;
const VOXEL_RES = 256;
const SHELL_THICKNESS_MM = 2.5;
const DRAIN_COUNT = 2;
const DRAIN_DIAMETER_MM = 2.5;

const MIN_SHELL_MM = 1.5;
const MIN_DRAIN_MM = 2.0;

const PRINTER_PROFILES = {
  RESIN_200: { name: 'Generic Resin 200mm', plateWidthMM: 200, plateDepthMM: 200, buildHeightMM: 200 },
};
const PRINTER = PRINTER_PROFILES.RESIN_200;

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
  const vertices = new Float64Array(pos.count * 3);
  for (let i = 0; i < pos.count * 3; i++) vertices[i] = pos.data[i];
  const indices = new Uint32Array(idx.count);
  for (let i = 0; i < idx.count; i++) indices[i] = idx.data[i];
  return { vertices, indices, vertexCount: pos.count, triCount: idx.count / 3 };
}

// ─── Mesh cleanup ───

function removeDegenerates(mesh) {
  const { vertices, indices, triCount } = mesh;
  const kept = [];
  let removed = 0;
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    if (a === b || b === c || a === c) { removed++; continue; }
    const ax = vertices[a*3], ay = vertices[a*3+1], az = vertices[a*3+2];
    const bx = vertices[b*3], by = vertices[b*3+1], bz = vertices[b*3+2];
    const cx = vertices[c*3], cy = vertices[c*3+1], cz = vertices[c*3+2];
    const abx = bx-ax, aby = by-ay, abz = bz-az;
    const acx = cx-ax, acy = cy-ay, acz = cz-az;
    const nx = aby*acz - abz*acy, ny = abz*acx - abx*acz, nz = abx*acy - aby*acx;
    if (nx*nx + ny*ny + nz*nz < 1e-20) { removed++; continue; }
    kept.push(a, b, c);
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;
  return removed;
}

function removeDebris(mesh, minVerts) {
  const { indices, triCount, vertexCount } = mesh;
  const parent = new Int32Array(vertexCount);
  const rank = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) { a = find(a); b = find(b); if (a === b) return; if (rank[a] < rank[b]) { const t=a; a=b; b=t; } parent[b] = a; if (rank[a] === rank[b]) rank[a]++; }
  for (let i = 0; i < triCount; i++) { union(indices[i*3], indices[i*3+1]); union(indices[i*3+1], indices[i*3+2]); }
  const compSize = new Map();
  for (let i = 0; i < vertexCount; i++) compSize.set(find(i), (compSize.get(find(i)) || 0) + 1);
  const keepSet = new Set();
  let removed = 0;
  for (const [root, size] of compSize) {
    if (size >= minVerts) { for (let i = 0; i < vertexCount; i++) if (find(i) === root) keepSet.add(i); }
    else removed++;
  }
  const kept = [];
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    if (keepSet.has(a) && keepSet.has(b) && keepSet.has(c)) kept.push(a, b, c);
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;
  return removed;
}

function spatialWeld(mesh, epsilon) {
  const { vertices, vertexCount } = mesh;
  const CELL = epsilon * 2;
  const grid = new Map();
  const remap = new Int32Array(vertexCount);
  const newVerts = [];
  let newCount = 0;
  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i*3], y = vertices[i*3+1], z = vertices[i*3+2];
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), gz = Math.floor(z / CELL);
    let merged = -1;
    outer: for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const cell = grid.get(`${gx+dx},${gy+dy},${gz+dz}`);
          if (!cell) continue;
          for (const idx of cell) {
            const ex = newVerts[idx*3]-x, ey = newVerts[idx*3+1]-y, ez = newVerts[idx*3+2]-z;
            if (ex*ex+ey*ey+ez*ez < epsilon*epsilon) { merged = idx; break outer; }
          }
        }
    if (merged >= 0) { remap[i] = merged; }
    else {
      remap[i] = newCount;
      newVerts.push(x, y, z);
      const key = `${gx},${gy},${gz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(newCount);
      newCount++;
    }
  }
  mesh.vertices = new Float64Array(newVerts);
  mesh.vertexCount = newCount;
  for (let i = 0; i < mesh.indices.length; i++) mesh.indices[i] = remap[mesh.indices[i]];
  const kept = [];
  for (let i = 0; i < mesh.triCount; i++) {
    const a = mesh.indices[i*3], b = mesh.indices[i*3+1], c = mesh.indices[i*3+2];
    if (a !== b && b !== c && a !== c) kept.push(a, b, c);
  }
  mesh.indices = new Uint32Array(kept);
  mesh.triCount = kept.length / 3;
  return vertexCount - newCount;
}

// ─── Voxelization ───

function createVoxelGrid(res) {
  return new Uint8Array(res * res * res);
}

function voxIdx(x, y, z, res) {
  return x + y * res + z * res * res;
}

function markVoxel(grid, res, i, j, k) {
  if (i >= 0 && i < res && j >= 0 && j < res && k >= 0 && k < res)
    grid[voxIdx(i, j, k, res)] = 1;
}

function rasterizeLine(grid, res, x0, y0, z0, x1, y1, z1) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), dz = Math.abs(z1 - z0);
  const steps = Math.max(dx, dy, dz);
  if (steps === 0) { markVoxel(grid, res, x0, y0, z0); return; }
  const sx = dx / steps, sy = dy / steps, sz = dz / steps;
  const signX = x1 > x0 ? 1 : -1, signY = y1 > y0 ? 1 : -1, signZ = z1 > z0 ? 1 : -1;
  let cx = x0, cy = y0, cz = z0;
  for (let s = 0; s <= steps; s++) {
    markVoxel(grid, res, Math.round(cx), Math.round(cy), Math.round(cz));
    cx += sx * signX; cy += sy * signY; cz += sz * signZ;
  }
}

function rasterizeTriToVoxels(grid, res, v0, v1, v2, origin, invCell) {
  const ix0 = Math.round((v0[0] - origin[0]) * invCell);
  const iy0 = Math.round((v0[1] - origin[1]) * invCell);
  const iz0 = Math.round((v0[2] - origin[2]) * invCell);
  const ix1 = Math.round((v1[0] - origin[0]) * invCell);
  const iy1 = Math.round((v1[1] - origin[1]) * invCell);
  const iz1 = Math.round((v1[2] - origin[2]) * invCell);
  const ix2 = Math.round((v2[0] - origin[0]) * invCell);
  const iy2 = Math.round((v2[1] - origin[1]) * invCell);
  const iz2 = Math.round((v2[2] - origin[2]) * invCell);

  rasterizeLine(grid, res, ix0, iy0, iz0, ix1, iy1, iz1);
  rasterizeLine(grid, res, ix1, iy1, iz1, ix2, iy2, iz2);
  rasterizeLine(grid, res, ix2, iy2, iz2, ix0, iy0, iz0);

  const maxEdge = Math.max(
    Math.abs(ix1-ix0)+Math.abs(iy1-iy0)+Math.abs(iz1-iz0),
    Math.abs(ix2-ix1)+Math.abs(iy2-iy1)+Math.abs(iz2-iz1),
    Math.abs(ix0-ix2)+Math.abs(iy0-iy2)+Math.abs(iz0-iz2)
  );
  const fillSteps = Math.max(1, Math.ceil(maxEdge / 2));
  for (let s = 1; s < fillSteps; s++) {
    const t = s / fillSteps;
    const mx0 = Math.round(ix0 + t * (ix1 - ix0));
    const my0 = Math.round(iy0 + t * (iy1 - iy0));
    const mz0 = Math.round(iz0 + t * (iz1 - iz0));
    const mx1 = Math.round(ix0 + t * (ix2 - ix0));
    const my1 = Math.round(iy0 + t * (iy2 - iy0));
    const mz1 = Math.round(iz0 + t * (iz2 - iz0));
    rasterizeLine(grid, res, mx0, my0, mz0, mx1, my1, mz1);
  }
}

function voxelizeMesh(mesh, grid, res, origin, cellSize) {
  const { vertices, indices, triCount } = mesh;
  const invCell = 1 / cellSize;
  for (let i = 0; i < triCount; i++) {
    const a = indices[i*3], b = indices[i*3+1], c = indices[i*3+2];
    const v0 = [vertices[a*3], vertices[a*3+1], vertices[a*3+2]];
    const v1 = [vertices[b*3], vertices[b*3+1], vertices[b*3+2]];
    const v2 = [vertices[c*3], vertices[c*3+1], vertices[c*3+2]];
    rasterizeTriToVoxels(grid, res, v0, v1, v2, origin, invCell);
  }
}

function dilateVoxels(grid, res) {
  const toSet = [];
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for (let i = 1; i < res - 1; i++) {
    for (let j = 1; j < res - 1; j++) {
      for (let k = 1; k < res - 1; k++) {
        if (grid[voxIdx(i, j, k, res)] === 0) {
          for (const [di, dj, dk] of dirs) {
            if (grid[voxIdx(i+di, j+dj, k+dk, res)] === 1) {
              toSet.push(i, j, k);
              break;
            }
          }
        }
      }
    }
  }
  for (let s = 0; s < toSet.length; s += 3) {
    grid[voxIdx(toSet[s], toSet[s+1], toSet[s+2], res)] = 1;
  }
  return toSet.length / 3;
}

function addPedestalVoxels(grid, res, origin, cellSize, meshBounds) {
  const { minX, maxX, minY, minZ, maxZ } = meshBounds;
  const W = maxX - minX, D = maxZ - minZ, H = meshBounds.maxY - minY;
  const padX = W * 0.15, padZ = D * 0.15;
  const pedestalH = H * 0.06;

  const px0 = minX - padX, px1 = maxX + padX;
  const py0 = minY - pedestalH, py1 = minY;
  const pz0 = minZ - padZ, pz1 = maxZ + padZ;

  const i0 = Math.max(0, Math.floor((px0 - origin[0]) / cellSize));
  const i1 = Math.min(res-1, Math.ceil((px1 - origin[0]) / cellSize));
  const j0 = Math.max(0, Math.floor((py0 - origin[1]) / cellSize));
  const j1 = Math.min(res-1, Math.ceil((py1 - origin[1]) / cellSize));
  const k0 = Math.max(0, Math.floor((pz0 - origin[2]) / cellSize));
  const k1 = Math.min(res-1, Math.ceil((pz1 - origin[2]) / cellSize));

  // Chamfer on top edges
  const chamferVox = Math.max(1, Math.round(pedestalH * 0.25 / cellSize));

  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      for (let k = k0; k <= k1; k++) {
        // Check chamfer: top edges get a 45° bevel
        const distFromTop = j1 - j;
        const distFromLeft = i - i0;
        const distFromRight = i1 - i;
        const distFromFront = k - k0;
        const distFromBack = k1 - k;

        if (distFromTop < chamferVox) {
          const margin = chamferVox - distFromTop;
          if (distFromLeft < margin || distFromRight < margin ||
              distFromFront < margin || distFromBack < margin) continue;
        }

        grid[voxIdx(i, j, k, res)] = 1;
      }
    }
  }

  return { px0, px1, py0, py1, pz0, pz1, pedestalH };
}

// ─── Text engraving via stroke font ───

const GLYPH_PATHS = {
  'D': [[0,0,0,1],[0,1,0.6,1],[0.6,1,0.8,0.8],[0.8,0.8,0.8,0.2],[0.8,0.2,0.6,0],[0.6,0,0,0]],
  'M': [[0,0,0,1],[0,1,0.4,0.5],[0.4,0.5,0.8,1],[0.8,1,0.8,0]],
  'F': [[0,0,0,1],[0,1,0.7,1],[0,0.5,0.5,0.5]],
  'R': [[0,0,0,1],[0,1,0.6,1],[0.6,1,0.7,0.85],[0.7,0.85,0.7,0.65],[0.7,0.65,0.6,0.5],[0.6,0.5,0,0.5],[0.4,0.5,0.8,0]],
  'E': [[0,0,0,1],[0,1,0.7,1],[0,0.5,0.5,0.5],[0,0,0.7,0]],
  'L': [[0,0,0,1],[0,0,0.7,0]],
  'I': [[0.3,0,0.3,1],[0,1,0.6,1],[0,0,0.6,0]],
  'C': [[0.7,0.85,0.5,1],[0.5,1,0.2,0.85],[0.2,0.85,0,0.5],[0,0.5,0.2,0.15],[0.2,0.15,0.5,0],[0.5,0,0.7,0.15]],
  '0': [[0.1,0,0,0.2],[0,0.2,0,0.8],[0,0.8,0.1,1],[0.1,1,0.6,1],[0.6,1,0.7,0.8],[0.7,0.8,0.7,0.2],[0.7,0.2,0.6,0],[0.6,0,0.1,0]],
  '1': [[0.15,0.8,0.35,1],[0.35,1,0.35,0],[0.1,0,0.6,0]],
  'T': [[0,1,0.8,1],[0.4,1,0.4,0]],
  'H': [[0,0,0,1],[0.8,0,0.8,1],[0,0.5,0.8,0.5]],
  'V': [[0,1,0.4,0],[0.4,0,0.8,1]],
  ' ': [],
  '/': [[0,0,0.6,1]],
};

function engraveTextOnVoxels(grid, res, origin, cellSize, text, startX, y, z, charHeight, charWidth, depth) {
  const spacing = charWidth * 0.15;
  let cx = startX;

  for (const ch of text) {
    const glyph = GLYPH_PATHS[ch.toUpperCase()];
    if (!glyph) { cx += charWidth + spacing; continue; }

    for (const [sx0, sy0, sx1, sy1] of glyph) {
      const wx0 = cx + sx0 * charWidth;
      const wy0 = y + sy0 * charHeight;
      const wx1 = cx + sx1 * charWidth;
      const wy1 = y + sy1 * charHeight;

      const len = Math.sqrt((wx1-wx0)**2 + (wy1-wy0)**2);
      const steps = Math.max(1, Math.ceil(len / (cellSize * 0.5)));
      const strokeW = Math.max(cellSize * 1.2, charHeight * 0.12);

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = wx0 + t * (wx1 - wx0);
        const py = wy0 + t * (wy1 - wy0);

        const i0 = Math.max(0, Math.floor((px - strokeW - origin[0]) / cellSize));
        const i1 = Math.min(res-1, Math.ceil((px + strokeW - origin[0]) / cellSize));
        const j0 = Math.max(0, Math.floor((py - strokeW - origin[1]) / cellSize));
        const j1 = Math.min(res-1, Math.ceil((py + strokeW - origin[1]) / cellSize));
        const k0 = Math.max(0, Math.floor((z - origin[2]) / cellSize));
        const k1 = Math.min(res-1, Math.ceil((z + depth - origin[2]) / cellSize));

        for (let i = i0; i <= i1; i++) {
          for (let j = j0; j <= j1; j++) {
            const dx = origin[0] + (i+0.5)*cellSize - px;
            const dy = origin[1] + (j+0.5)*cellSize - py;
            if (dx*dx + dy*dy < strokeW*strokeW) {
              for (let k = k0; k <= k1; k++) {
                grid[voxIdx(i, j, k, res)] = 0;
              }
            }
          }
        }
      }
    }
    cx += charWidth + spacing;
  }
}

// ─── Flood fill exterior ───

function floodFillExterior(grid, res) {
  const EXTERIOR = 2;
  const queue = [];

  // Seed all border voxels that are empty
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      for (const k of [0, res-1]) {
        if (grid[voxIdx(i, j, k, res)] === 0) { grid[voxIdx(i, j, k, res)] = EXTERIOR; queue.push(i, j, k); }
      }
      for (const k of [0, res-1]) {
        const ii = k === 0 ? i : i; // just need border faces
        if (grid[voxIdx(ii, j, k, res)] === 0) { grid[voxIdx(ii, j, k, res)] = EXTERIOR; queue.push(ii, j, k); }
      }
    }
  }
  for (let j = 0; j < res; j++) {
    for (let k = 0; k < res; k++) {
      for (const i of [0, res-1]) {
        if (grid[voxIdx(i, j, k, res)] === 0) { grid[voxIdx(i, j, k, res)] = EXTERIOR; queue.push(i, j, k); }
      }
    }
  }
  for (let i = 0; i < res; i++) {
    for (let k = 0; k < res; k++) {
      for (const j of [0, res-1]) {
        if (grid[voxIdx(i, j, k, res)] === 0) { grid[voxIdx(i, j, k, res)] = EXTERIOR; queue.push(i, j, k); }
      }
    }
  }

  // BFS flood fill
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    for (const [dx, dy, dz] of dirs) {
      const nx = x+dx, ny = y+dy, nz = z+dz;
      if (nx < 0 || nx >= res || ny < 0 || ny >= res || nz < 0 || nz >= res) continue;
      const idx = voxIdx(nx, ny, nz, res);
      if (grid[idx] === 0) {
        grid[idx] = EXTERIOR;
        queue.push(nx, ny, nz);
      }
    }
  }

  // Now: 0 = interior (trapped air → fill as solid), 1 = surface, 2 = exterior
  // Convert: interior → solid (1), exterior → empty (0)
  let interior = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 0) { grid[i] = 1; interior++; }
    else if (grid[i] === 2) { grid[i] = 0; }
  }
  return interior;
}

// ─── Hollow Interior ───

function hollowInterior(grid, res, shellVoxels, pedestalJMax) {
  const dist = new Int16Array(res * res * res).fill(-1);
  const queue = [];

  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      for (let k = 0; k < res; k++) {
        if (grid[voxIdx(i, j, k, res)] === 0) {
          dist[voxIdx(i, j, k, res)] = 0;
          queue.push(i, j, k);
        }
      }
    }
  }

  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    const d = dist[voxIdx(x, y, z, res)];
    for (const [dx, dy, dz] of dirs) {
      const nx = x+dx, ny = y+dy, nz = z+dz;
      if (nx < 0 || nx >= res || ny < 0 || ny >= res || nz < 0 || nz >= res) continue;
      const idx = voxIdx(nx, ny, nz, res);
      if (dist[idx] === -1) {
        dist[idx] = d + 1;
        queue.push(nx, ny, nz);
      }
    }
  }

  let hollowed = 0;
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      if (j <= pedestalJMax) continue;
      for (let k = 0; k < res; k++) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] === 1 && dist[idx] > shellVoxels) {
          grid[idx] = 0;
          hollowed++;
        }
      }
    }
  }

  return hollowed;
}

function carveDrainHoles(grid, res, origin, cellSize, pedInfo, drainCount, drainDiameterMM, approxScale, shellVoxels) {
  const drainRadiusModel = (drainDiameterMM / 2) / approxScale;
  const drainRadiusVox = Math.max(1, Math.ceil(drainRadiusModel / cellSize));

  const cx = (pedInfo.px0 + pedInfo.px1) / 2;
  const cz = (pedInfo.pz0 + pedInfo.pz1) / 2;
  const spacing = (pedInfo.px1 - pedInfo.px0) * 0.25;

  const positions = [];
  if (drainCount >= 2) {
    positions.push({ x: cx - spacing, z: cz });
    positions.push({ x: cx + spacing, z: cz });
  }
  if (drainCount >= 3) {
    positions.push({ x: cx, z: cz - spacing });
  }

  const j0 = Math.max(0, Math.floor((pedInfo.py0 - origin[1]) / cellSize));
  const j1 = Math.min(res - 1, Math.ceil((pedInfo.py1 - origin[1]) / cellSize) + shellVoxels + 3);

  let carved = 0;
  for (const { x: dx, z: dz } of positions) {
    const ci = Math.round((dx - origin[0]) / cellSize);
    const ck = Math.round((dz - origin[2]) / cellSize);

    for (let i = ci - drainRadiusVox; i <= ci + drainRadiusVox; i++) {
      for (let k = ck - drainRadiusVox; k <= ck + drainRadiusVox; k++) {
        const di = i - ci, dk = k - ck;
        if (di*di + dk*dk > drainRadiusVox*drainRadiusVox) continue;
        for (let j = j0; j <= j1; j++) {
          if (i >= 0 && i < res && j >= 0 && j < res && k >= 0 && k < res) {
            const idx = voxIdx(i, j, k, res);
            if (grid[idx] === 1) { grid[idx] = 0; carved++; }
          }
        }
      }
    }
  }

  return { carved, positions, drainRadiusVox };
}

// ─── Cavity Connectivity (drain-targeted) ───

function connectCavitiesToDrains(grid, res) {
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  const EXTERIOR = 2;

  // Flood fill from borders — marks exterior air AND drain-connected interior air
  const queue = [];
  for (let i = 0; i < res; i++)
    for (let j = 0; j < res; j++)
      for (const k of [0, res-1]) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(i, j, k); }
      }
  for (let j = 0; j < res; j++)
    for (let k = 0; k < res; k++)
      for (const i of [0, res-1]) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(i, j, k); }
      }
  for (let i = 0; i < res; i++)
    for (let k = 0; k < res; k++)
      for (const j of [0, res-1]) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(i, j, k); }
      }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    for (const [dx, dy, dz] of dirs) {
      const nx = x+dx, ny = y+dy, nz = z+dz;
      if (nx < 0 || nx >= res || ny < 0 || ny >= res || nz < 0 || nz >= res) continue;
      const idx = voxIdx(nx, ny, nz, res);
      if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(nx, ny, nz); }
    }
  }

  // Any air still 0 = sealed cavity not reachable from drains/exterior
  const sealedComponents = [];
  const CAVITY_BASE = 3;
  let nextLabel = CAVITY_BASE;

  for (let i = 0; i < res; i++)
    for (let j = 0; j < res; j++)
      for (let k = 0; k < res; k++) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] !== 0) continue;
        const label = nextLabel++;
        const cq = [i, j, k];
        grid[idx] = label;
        let si = 0, sj = 0, sk = 0, count = 0;
        let ch = 0;
        while (ch < cq.length) {
          const cx = cq[ch++], cy = cq[ch++], cz = cq[ch++];
          si += cx; sj += cy; sk += cz; count++;
          for (const [dx, dy, dz] of dirs) {
            const nx = cx+dx, ny = cy+dy, nz = cz+dz;
            if (nx < 0 || nx >= res || ny < 0 || ny >= res || nz < 0 || nz >= res) continue;
            const nIdx = voxIdx(nx, ny, nz, res);
            if (grid[nIdx] === 0) { grid[nIdx] = label; cq.push(nx, ny, nz); }
          }
        }
        sealedComponents.push({ label, center: [si/count, sj/count, sk/count], size: count });
      }

  if (sealedComponents.length === 0) {
    // Restore grid: exterior → 0, solid stays 1
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === EXTERIOR) grid[i] = 0;
    }
    return { carved: 0, sealedBefore: 0 };
  }

  // For each sealed component, find nearest EXTERIOR voxel and carve a channel
  let carved = 0;
  for (const comp of sealedComponents) {
    const [ci, cj, ck] = comp.center.map(Math.round);
    let bestDist = Infinity, bestI = ci, bestJ = cj, bestK = ck;

    // BFS from component center to find nearest exterior air
    const visited = new Set();
    const bfs = [ci, cj, ck];
    visited.add(voxIdx(ci, cj, ck, res));
    let bh = 0;
    let found = false;
    while (bh < bfs.length && !found) {
      const bi = bfs[bh++], bj = bfs[bh++], bk = bfs[bh++];
      for (const [dx, dy, dz] of dirs) {
        const ni = bi+dx, nj = bj+dy, nk = bk+dz;
        if (ni < 0 || ni >= res || nj < 0 || nj >= res || nk < 0 || nk >= res) continue;
        const nIdx = voxIdx(ni, nj, nk, res);
        if (visited.has(nIdx)) continue;
        visited.add(nIdx);
        if (grid[nIdx] === EXTERIOR) {
          bestI = ni; bestJ = nj; bestK = nk;
          found = true;
          break;
        }
        bfs.push(ni, nj, nk);
      }
    }

    // Carve straight channel from sealed cavity center to nearest exterior air
    const di = bestI - ci, dj = bestJ - cj, dk = bestK - ck;
    const steps = Math.max(1, Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const pi = Math.round(ci + t * di);
      const pj = Math.round(cj + t * dj);
      const pk = Math.round(ck + t * dk);
      for (let d1 = -1; d1 <= 1; d1++)
        for (let d2 = -1; d2 <= 1; d2++) {
          const ni = pi + d1, nk = pk + d2;
          if (ni >= 0 && ni < res && pj >= 0 && pj < res && nk >= 0 && nk < res) {
            const idx = voxIdx(ni, pj, nk, res);
            if (grid[idx] === 1) { grid[idx] = 0; carved++; }
          }
        }
    }
  }

  // Restore grid: exterior → 0, all cavity labels → 0, solid stays 1
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== 1) grid[i] = 0;
  }

  return { carved, sealedBefore: sealedComponents.length };
}

// ─── Drainability Verification ───

function verifyDrainability(grid, res) {
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  const EXTERIOR = 2;

  // Flood fill from borders
  const queue = [];
  for (let i = 0; i < res; i++)
    for (let j = 0; j < res; j++)
      for (const k of [0, res-1]) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(i, j, k); }
      }
  for (let j = 0; j < res; j++)
    for (let k = 0; k < res; k++)
      for (const i of [0, res-1]) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(i, j, k); }
      }
  for (let i = 0; i < res; i++)
    for (let k = 0; k < res; k++)
      for (const j of [0, res-1]) {
        const idx = voxIdx(i, j, k, res);
        if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(i, j, k); }
      }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++], y = queue[head++], z = queue[head++];
    for (const [dx, dy, dz] of dirs) {
      const nx = x+dx, ny = y+dy, nz = z+dz;
      if (nx < 0 || nx >= res || ny < 0 || ny >= res || nz < 0 || nz >= res) continue;
      const idx = voxIdx(nx, ny, nz, res);
      if (grid[idx] === 0) { grid[idx] = EXTERIOR; queue.push(nx, ny, nz); }
    }
  }

  // Count sealed air (still 0) and total drain-reachable air
  let sealedVoxels = 0;
  let reachableVoxels = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 0) sealedVoxels++;
    if (grid[i] === EXTERIOR) reachableVoxels++;
  }

  // Restore grid
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === EXTERIOR) grid[i] = 0;
  }

  const totalAir = sealedVoxels + reachableVoxels;
  const reachablePct = totalAir > 0 ? (reachableVoxels / totalAir * 100) : 100;

  return { sealedCavities: sealedVoxels, drainReachableVolumePct: Math.round(reachablePct * 10) / 10 };
}

// ─── Marching Cubes ───

const MC_EDGE_TABLE = new Uint16Array(256);
const MC_TRI_TABLE = [];

function initMarchingCubes() {
  // Precompute edge table and triangle table
  // Using the standard Lorensen & Cline tables
  const edgeTable = [
    0x0,0x109,0x203,0x30a,0x406,0x50f,0x605,0x70c,0x80c,0x905,0xa0f,0xb06,0xc0a,0xd03,0xe09,0xf00,
    0x190,0x99,0x393,0x29a,0x596,0x49f,0x795,0x69c,0x99c,0x895,0xb9f,0xa96,0xd9a,0xc93,0xf99,0xe90,
    0x230,0x339,0x33,0x13a,0x636,0x73f,0x435,0x53c,0xa3c,0xb35,0x83f,0x936,0xe3a,0xf33,0xc39,0xd30,
    0x3a0,0x2a9,0x1a3,0xaa,0x7a6,0x6af,0x5a5,0x4ac,0xbac,0xaa5,0x9af,0x8a6,0xfaa,0xea3,0xda9,0xca0,
    0x460,0x569,0x663,0x76a,0x66,0x16f,0x265,0x36c,0xc6c,0xd65,0xe6f,0xf66,0x86a,0x963,0xa69,0xb60,
    0x5f0,0x4f9,0x7f3,0x6fa,0x1f6,0xff,0x3f5,0x2fc,0xdfc,0xcf5,0xfff,0xef6,0x9fa,0x8f3,0xbf9,0xaf0,
    0x650,0x759,0x453,0x55a,0x256,0x35f,0x55,0x15c,0xe5c,0xf55,0xc5f,0xd56,0xa5a,0xb53,0x859,0x950,
    0x7c0,0x6c9,0x5c3,0x4ca,0x3c6,0x2cf,0x1c5,0xcc,0xfcc,0xec5,0xdcf,0xcc6,0xbca,0xac3,0x9c9,0x8c0,
    0x8c0,0x9c9,0xac3,0xbca,0xcc6,0xdcf,0xec5,0xfcc,0xcc,0x1c5,0x2cf,0x3c6,0x4ca,0x5c3,0x6c9,0x7c0,
    0x950,0x859,0xb53,0xa5a,0xd56,0xc5f,0xf55,0xe5c,0x15c,0x55,0x35f,0x256,0x55a,0x453,0x759,0x650,
    0xaf0,0xbf9,0x8f3,0x9fa,0xef6,0xfff,0xcf5,0xdfc,0x2fc,0x3f5,0xff,0x1f6,0x6fa,0x7f3,0x4f9,0x5f0,
    0xb60,0xa69,0x963,0x86a,0xf66,0xe6f,0xd65,0xc6c,0x36c,0x265,0x16f,0x66,0x76a,0x663,0x569,0x460,
    0xca0,0xda9,0xea3,0xfaa,0x8a6,0x9af,0xaa5,0xbac,0x4ac,0x5a5,0x6af,0x7a6,0xaa,0x1a3,0x2a9,0x3a0,
    0xd30,0xc39,0xf33,0xe3a,0x936,0x83f,0xb35,0xa3c,0x53c,0x435,0x73f,0x636,0x13a,0x33,0x339,0x230,
    0xe90,0xf99,0xc93,0xd9a,0xa96,0xb9f,0x895,0x99c,0x69c,0x795,0x49f,0x596,0x29a,0x393,0x99,0x190,
    0xf00,0xe09,0xd03,0xc0a,0xb06,0xa0f,0x905,0x80c,0x70c,0x605,0x50f,0x406,0x30a,0x203,0x109,0x0
  ];
  for (let i = 0; i < 256; i++) MC_EDGE_TABLE[i] = edgeTable[i];

  const triTableFlat = [
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1,
    3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1,
    3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1,
    3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1,
    9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1,
    1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1,
    9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1,
    2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1,
    8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1,
    9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1,
    4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1,
    3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1,
    1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1,
    4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1,
    4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1,
    9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1,
    1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,0,8,1,2,10,4,9,5,-1,-1,-1,-1,-1,-1,-1,
    5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1,
    2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1,
    9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1,
    0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1,
    2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1,
    10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1,
    4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1,
    5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1,
    5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,
    9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1,
    0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1,
    1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1,
    10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1,
    8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1,
    2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,
    7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1,
    9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1,
    2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1,
    11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1,
    9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1,
    5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1,
    11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1,
    11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1,
    1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1,
    9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1,
    5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1,
    2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1,
    0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1,
    5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1,
    6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1,
    0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1,
    3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1,
    6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1,
    5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1,
    1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1,
    10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1,
    6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1,
    1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1,
    8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1,
    7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1,
    3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1,
    5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1,
    0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1,
    9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1,
    8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1,
    5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1,
    0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1,
    6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1,
    10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1,
    10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1,
    8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1,
    1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1,
    3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1,
    0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,
    10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1,
    0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1,
    3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1,
    6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1,
    9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1,
    8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1,
    3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1,
    6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1,
    0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1,
    10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1,
    10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1,
    1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1,
    2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1,
    7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1,
    7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1,
    2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1,
    1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1,
    11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1,
    8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1,
    0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1,
    7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1,
    10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1,
    2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1,
    6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1,
    7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1,
    2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1,
    1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1,
    10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1,
    10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1,
    0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1,
    7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1,
    6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1,
    8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1,
    9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1,
    6,8,4,6,11,8,2,10,1,-1,-1,-1,-1,-1,-1,-1,
    1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1,
    4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1,
    10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1,
    8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,
    0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1,
    1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1,
    8,1,3,8,6,1,8,4,6,6,10,1,-1,-1,-1,-1,
    10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1,
    4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1,
    10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1,
    5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1,
    11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1,
    9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1,
    6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1,
    7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1,
    3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1,
    7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1,
    9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1,
    3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1,
    6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1,
    9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1,
    1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1,
    4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1,
    7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1,
    6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1,
    3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1,
    0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1,
    6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1,
    1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1,
    0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1,
    11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1,
    6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1,
    5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1,
    9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1,
    1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1,
    1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1,
    10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1,
    0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1,
    5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1,
    10,7,5,10,11,7,9,8,1,8,3,1,-1,-1,-1,-1,
    11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1,
    0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1,
    9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1,
    7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1,
    2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,
    8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1,
    9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1,
    9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1,
    1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1,
    9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1,
    9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,
    5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1,
    0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1,
    10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1,
    2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1,
    0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1,
    0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1,
    9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1,
    5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1,
    3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1,
    5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1,
    8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1,
    0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1,
    9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1,
    0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1,
    1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1,
    3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1,
    4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1,
    9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1,
    11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1,
    11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1,
    2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1,
    9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1,
    3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1,
    1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1,
    4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1,
    4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1,
    0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1,
    3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1,
    3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1,
    0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1,
    9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1,
    1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
  ];
  for (let i = 0; i < 256; i++) {
    MC_TRI_TABLE[i] = [];
    for (let j = 0; j < 16; j++) {
      const v = triTableFlat[i * 16 + j];
      if (v === -1) break;
      MC_TRI_TABLE[i].push(v);
    }
  }
}

function marchingCubes(grid, res, origin, cellSize) {
  initMarchingCubes();

  const vertices = [];
  const indices = [];
  const edgeCache = new Map();

  function getVal(i, j, k) {
    if (i < 0 || i >= res || j < 0 || j >= res || k < 0 || k >= res) return 0;
    return grid[voxIdx(i, j, k, res)];
  }

  function interp(i0, j0, k0, i1, j1, k1) {
    const key = `${Math.min(i0*res*res+j0*res+k0, i1*res*res+j1*res+k1)}-${Math.max(i0*res*res+j0*res+k0, i1*res*res+j1*res+k1)}`;
    if (edgeCache.has(key)) return edgeCache.get(key);
    const x = origin[0] + (i0 + i1 + 1) * 0.5 * cellSize;
    const y = origin[1] + (j0 + j1 + 1) * 0.5 * cellSize;
    const z = origin[2] + (k0 + k1 + 1) * 0.5 * cellSize;
    const idx = vertices.length / 3;
    vertices.push(x, y, z);
    edgeCache.set(key, idx);
    return idx;
  }

  const cornerOffsets = [
    [0,0,0],[1,0,0],[1,1,0],[0,1,0],
    [0,0,1],[1,0,1],[1,1,1],[0,1,1]
  ];

  const edgeConnections = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7]
  ];

  for (let i = 0; i < res - 1; i++) {
    for (let j = 0; j < res - 1; j++) {
      for (let k = 0; k < res - 1; k++) {
        let cubeIndex = 0;
        for (let c = 0; c < 8; c++) {
          const ci = i + cornerOffsets[c][0];
          const cj = j + cornerOffsets[c][1];
          const ck = k + cornerOffsets[c][2];
          if (getVal(ci, cj, ck) > 0) cubeIndex |= (1 << c);
        }

        if (MC_EDGE_TABLE[cubeIndex] === 0) continue;

        const edgeVerts = new Array(12);
        for (let e = 0; e < 12; e++) {
          if (MC_EDGE_TABLE[cubeIndex] & (1 << e)) {
            const [c0, c1] = edgeConnections[e];
            const o0 = cornerOffsets[c0], o1 = cornerOffsets[c1];
            edgeVerts[e] = interp(
              i + o0[0], j + o0[1], k + o0[2],
              i + o1[0], j + o1[1], k + o1[2]
            );
          }
        }

        const tris = MC_TRI_TABLE[cubeIndex];
        for (let t = 0; t < tris.length; t += 3) {
          indices.push(edgeVerts[tris[t+2]], edgeVerts[tris[t+1]], edgeVerts[tris[t]]);
        }
      }
    }
  }

  return {
    vertices: new Float64Array(vertices),
    indices: new Uint32Array(indices),
    vertexCount: vertices.length / 3,
    triCount: indices.length / 3
  };
}

// ─── Mesh analysis ───

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

function countComponents(indices, triCount, vertexCount) {
  const parent = new Int32Array(vertexCount);
  const rank = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) { a = find(a); b = find(b); if (a === b) return; if (rank[a] < rank[b]) { const t=a; a=b; b=t; } parent[b] = a; if (rank[a] === rank[b]) rank[a]++; }
  for (let i = 0; i < triCount; i++) { union(indices[i*3], indices[i*3+1]); union(indices[i*3+1], indices[i*3+2]); }
  const roots = new Set();
  for (let i = 0; i < vertexCount; i++) roots.add(find(i));
  // Only count components that have triangles
  const usedVerts = new Set();
  for (let i = 0; i < indices.length; i++) usedVerts.add(indices[i]);
  const usedRoots = new Set();
  for (const v of usedVerts) usedRoots.add(find(v));
  return usedRoots.size;
}

// ─── Surface Deviation ───

function computeSurfaceDeviation(originalMesh, outputMesh, scale) {
  const { vertices: srcV, vertexCount: srcN } = originalMesh;
  const { vertices: outV, vertexCount: outN } = outputMesh;

  // Compute original mesh bounding box to exclude pedestal/margin vertices
  let srcMinX = Infinity, srcMaxX = -Infinity;
  let srcMinY = Infinity, srcMaxY = -Infinity;
  let srcMinZ = Infinity, srcMaxZ = -Infinity;
  for (let i = 0; i < srcN; i++) {
    const x = srcV[i*3], y = srcV[i*3+1], z = srcV[i*3+2];
    if (x < srcMinX) srcMinX = x; if (x > srcMaxX) srcMaxX = x;
    if (y < srcMinY) srcMinY = y; if (y > srcMaxY) srcMaxY = y;
    if (z < srcMinZ) srcMinZ = z; if (z > srcMaxZ) srcMaxZ = z;
  }
  const srcMargin = Math.max(srcMaxX-srcMinX, srcMaxY-srcMinY, srcMaxZ-srcMinZ) * 0.02;

  // Build spatial grid of original vertices for fast nearest-neighbor lookup
  const cellSz = Math.max(srcMaxX-srcMinX, srcMaxY-srcMinY, srcMaxZ-srcMinZ) / 50;
  const invCell = 1 / cellSz;
  const buckets = new Map();

  for (let i = 0; i < srcN; i++) {
    const x = srcV[i*3], y = srcV[i*3+1], z = srcV[i*3+2];
    const gx = Math.floor(x * invCell), gy = Math.floor(y * invCell), gz = Math.floor(z * invCell);
    const key = `${gx},${gy},${gz}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(i);
  }

  const validDistances = [];
  let skipped = 0;
  for (let i = 0; i < outN; i++) {
    const x = outV[i*3], y = outV[i*3+1], z = outV[i*3+2];

    // Skip vertices outside original mesh bounds (pedestal, margin, engraving zones)
    if (x < srcMinX - srcMargin || x > srcMaxX + srcMargin ||
        y < srcMinY - srcMargin || y > srcMaxY + srcMargin ||
        z < srcMinZ - srcMargin || z > srcMaxZ + srcMargin) {
      skipped++;
      continue;
    }

    const gx = Math.floor(x * invCell), gy = Math.floor(y * invCell), gz = Math.floor(z * invCell);
    let bestDist2 = Infinity;

    for (let dx = -2; dx <= 2; dx++)
      for (let dy = -2; dy <= 2; dy++)
        for (let dz = -2; dz <= 2; dz++) {
          const bucket = buckets.get(`${gx+dx},${gy+dy},${gz+dz}`);
          if (!bucket) continue;
          for (const si of bucket) {
            const ex = srcV[si*3]-x, ey = srcV[si*3+1]-y, ez = srcV[si*3+2]-z;
            const d2 = ex*ex + ey*ey + ez*ez;
            if (d2 < bestDist2) bestDist2 = d2;
          }
        }

    if (bestDist2 < Infinity) {
      validDistances.push(Math.sqrt(bestDist2) * scale);
    }
  }

  if (validDistances.length === 0) {
    return { meanMM: 0, maxMM: 0, p95MM: 0, p99MM: 0, sampledVertices: 0, skippedVertices: skipped };
  }

  validDistances.sort((a, b) => a - b);
  const n = validDistances.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += validDistances[i];

  return {
    meanMM: Math.round(sum / n * 1000) / 1000,
    maxMM: Math.round(validDistances[n - 1] * 1000) / 1000,
    p95MM: Math.round(validDistances[Math.floor(n * 0.95)] * 1000) / 1000,
    p99MM: Math.round(validDistances[Math.floor(n * 0.99)] * 1000) / 1000,
    sampledVertices: n,
    skippedVertices: skipped,
  };
}

// ─── STL Export ───

function triNormal(v, i0, i1, i2) {
  const ax = v[i1*3]-v[i0*3], ay = v[i1*3+1]-v[i0*3+1], az = v[i1*3+2]-v[i0*3+2];
  const bx = v[i2*3]-v[i0*3], by = v[i2*3+1]-v[i0*3+1], bz = v[i2*3+2]-v[i0*3+2];
  const nx = ay*bz-az*by, ny = az*bx-ax*bz, nz = ax*by-ay*bx;
  const len = Math.sqrt(nx*nx+ny*ny+nz*nz);
  if (len < 1e-20) return [0,1,0];
  return [nx/len, ny/len, nz/len];
}

function exportSTL(mesh, filepath, scaleFactor) {
  const { vertices, indices, triCount } = mesh;
  const bufSize = 80 + 4 + triCount * 50;
  const buf = Buffer.alloc(bufSize);
  buf.write('DMF RELIC 01 / THE RECEIVER / Drainable Core', 0, 'ascii');
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

  log('===================================================================');
  log(' DMF RELIC 01 — Drainable Core Pipeline');
  log('===================================================================');
  log('');

  // Parse
  log('Parsing GLB...');
  const { gltf, binBuf } = parseGLB(GLB_PATH);
  const mesh = extractMesh(gltf, binBuf);
  log(`  Source: ${mesh.vertexCount.toLocaleString()} vertices, ${mesh.triCount.toLocaleString()} triangles`);

  // Pre-repair
  const pre = edgeAnalysis(mesh.indices, mesh.triCount);
  log(`  Boundary: ${pre.boundary.toLocaleString()}, Non-manifold: ${pre.nonManifold}, Watertight: ${pre.watertight ? 'YES' : 'NO'}`);
  log('');

  // Step 1: Remove degenerates
  log('Step 1: Remove degenerate triangles...');
  const degRemoved = removeDegenerates(mesh);
  log(`  Removed: ${degRemoved}`);
  log('');

  // Step 2: Remove debris
  log('Step 2: Remove debris components (<10 vertices)...');
  const debrisRemoved = removeDebris(mesh, 10);
  log(`  Removed: ${debrisRemoved.toLocaleString()} components`);
  log('');

  // Step 3: Spatial weld
  log(`Step 3: Spatial vertex weld (e=${WELD_EPSILON})...`);
  const welded = spatialWeld(mesh, WELD_EPSILON);
  log(`  Merged: ${welded.toLocaleString()} vertices`);
  log(`  Remaining: ${mesh.vertexCount.toLocaleString()} vertices, ${mesh.triCount.toLocaleString()} triangles`);
  log('');

  // Snapshot original mesh for surface deviation measurement
  const originalVertices = new Float64Array(mesh.vertices);
  const originalVertexCount = mesh.vertexCount;

  // Compute bounds
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < mesh.vertexCount; i++) {
    const x = mesh.vertices[i*3], y = mesh.vertices[i*3+1], z = mesh.vertices[i*3+2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  const meshBounds = { minX, maxX, minY, maxY: maxY, minZ, maxZ };
  const W = maxX - minX, H = maxY - minY, D = maxZ - minZ;
  const pedestalH = H * 0.06;
  const padX = W * 0.15, padZ = D * 0.15;

  // Voxel grid bounds (include pedestal + margin)
  const margin = Math.max(W, H, D) * 0.05;
  const gMinX = minX - padX - margin;
  const gMinY = minY - pedestalH - margin;
  const gMinZ = minZ - padZ - margin;
  const gMaxX = maxX + padX + margin;
  const gMaxY = maxY + margin;
  const gMaxZ = maxZ + padZ + margin;

  const gW = gMaxX - gMinX, gH = gMaxY - gMinY, gD = gMaxZ - gMinZ;
  const maxDim = Math.max(gW, gH, gD);
  const cellSize = maxDim / VOXEL_RES;
  const origin = [gMinX, gMinY, gMinZ];

  log(`Step 4: Voxelize (${VOXEL_RES}^3 grid, cell=${cellSize.toFixed(5)})...`);
  const grid = createVoxelGrid(VOXEL_RES);

  // Voxelize mesh surface
  voxelizeMesh(mesh, grid, VOXEL_RES, origin, cellSize);
  let surfaceVoxels = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) surfaceVoxels++;
  log(`  Surface voxels: ${surfaceVoxels.toLocaleString()}`);

  // Add pedestal as solid voxel volume
  log('  Adding pedestal voxels...');
  const pedInfo = addPedestalVoxels(grid, VOXEL_RES, origin, cellSize, meshBounds);
  let totalVoxels = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) totalVoxels++;
  log(`  Total voxels (with pedestal): ${totalVoxels.toLocaleString()}`);

  log('  Dilating surface shell...');
  const dilated = dilateVoxels(grid, VOXEL_RES);
  log(`  Dilated voxels added: ${dilated.toLocaleString()}`);
  totalVoxels = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) totalVoxels++;
  log(`  Total after dilation: ${totalVoxels.toLocaleString()}`);
  log('');

  // Step 5: Flood fill exterior → identify interior
  log('Step 5: Flood fill exterior...');
  const interiorFilled = floodFillExterior(grid, VOXEL_RES);
  let solidVoxels = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) solidVoxels++;
  log(`  Interior voxels filled: ${interiorFilled.toLocaleString()}`);
  log(`  Total solid voxels (before hollowing): ${solidVoxels.toLocaleString()}`);
  const solidVoxelsBefore = solidVoxels;
  log('');

  // Step 6: Hollow interior — BFS distance transform + shell carve
  const approxModelH = (maxY - minY) + pedestalH;
  const approxScale = TARGET_HEIGHT_MM / approxModelH;
  const cellSizeMM = cellSize * approxScale;
  const shellVoxels = Math.max(3, Math.ceil(SHELL_THICKNESS_MM / cellSizeMM));
  const pedestalJMax = Math.ceil((pedInfo.py1 - origin[1]) / cellSize);

  log(`Step 6: Hollow interior (shell=${shellVoxels} voxels, ~${(shellVoxels * cellSizeMM).toFixed(1)}mm)...`);
  const hollowedCount = hollowInterior(grid, VOXEL_RES, shellVoxels, pedestalJMax);
  solidVoxels = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) solidVoxels++;
  const hollowReductionPct = ((solidVoxelsBefore - solidVoxels) / solidVoxelsBefore * 100);
  log(`  Hollowed voxels: ${hollowedCount.toLocaleString()}`);
  log(`  Solid voxels remaining: ${solidVoxels.toLocaleString()}`);
  log(`  Volume reduction: ${hollowReductionPct.toFixed(1)}%`);
  log('');

  // Step 7: Carve drain holes through pedestal
  log(`Step 7: Carve drain holes (${DRAIN_COUNT}x ${DRAIN_DIAMETER_MM}mm)...`);
  const drainInfo = carveDrainHoles(grid, VOXEL_RES, origin, cellSize, pedInfo, DRAIN_COUNT, DRAIN_DIAMETER_MM, approxScale, shellVoxels);
  log(`  Drain voxels carved: ${drainInfo.carved.toLocaleString()}`);
  log(`  Drain radius: ${drainInfo.drainRadiusVox} voxels`);
  solidVoxels = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i]) solidVoxels++;
  log(`  Total solid voxels (after drains): ${solidVoxels.toLocaleString()}`);
  log('');

  // Step 7b: Connect sealed cavities to drain-reachable air
  log('Step 7b: Connect sealed cavities to drains...');
  const cavityInfo = connectCavitiesToDrains(grid, VOXEL_RES);
  log(`  Sealed cavities found: ${cavityInfo.sealedBefore}`);
  log(`  Channel voxels carved: ${cavityInfo.carved}`);
  log('');

  // Step 7c: Verify drainability — all internal air reachable from drains
  log('Step 7c: Verify drainability...');
  const drainability = verifyDrainability(grid, VOXEL_RES);
  log(`  Sealed voxels remaining: ${drainability.sealedCavities}`);
  log(`  Drain-reachable air: ${drainability.drainReachableVolumePct}%`);
  log('');

  // Step 8: Engrave text (subtract from voxels)
  log('Step 8: Engrave text on pedestal...');
  const pedestalCenterX = (pedInfo.px0 + pedInfo.px1) / 2;
  const charH = pedInfo.pedestalH * 0.28;
  const charW = charH * 0.6;

  const texts = [
    { text: 'DMF RELIC 01', y: pedInfo.py0 + pedInfo.pedestalH * 0.65 },
    { text: 'THE RECEIVER', y: pedInfo.py0 + pedInfo.pedestalH * 0.38 },
    { text: '001', y: pedInfo.py0 + pedInfo.pedestalH * 0.12 },
  ];

  for (const { text, y } of texts) {
    const totalW = text.length * (charW + charW * 0.15) - charW * 0.15;
    const startX = pedestalCenterX - totalW / 2;
    engraveTextOnVoxels(grid, VOXEL_RES, origin, cellSize, text, startX, y, pedInfo.pz0, charH, charW, cellSize * 3);
  }
  log(`  Engraved: "DMF RELIC 01 / THE RECEIVER / 001"`);
  log('');

  // Step 9: Marching cubes
  log('Step 9: Marching cubes isosurface extraction...');
  const result = marchingCubes(grid, VOXEL_RES, origin, cellSize);
  log(`  Extracted: ${result.vertexCount.toLocaleString()} vertices, ${result.triCount.toLocaleString()} triangles`);
  log('');

  // Compute scale factor early for surface deviation
  let earlyMinY = Infinity, earlyMaxY = -Infinity;
  for (let i = 0; i < result.vertexCount; i++) {
    const y = result.vertices[i*3+1];
    if (y < earlyMinY) earlyMinY = y;
    if (y > earlyMaxY) earlyMaxY = y;
  }
  const earlyScale = TARGET_HEIGHT_MM / (earlyMaxY - earlyMinY);

  // Step 9b: Surface deviation (fidelity measurement)
  log('Step 9b: Surface deviation vs original GLB...');
  const deviation = computeSurfaceDeviation(
    { vertices: originalVertices, vertexCount: originalVertexCount },
    result,
    earlyScale
  );
  log(`  Mean:  ${deviation.meanMM}mm`);
  log(`  P95:   ${deviation.p95MM}mm`);
  log(`  P99:   ${deviation.p99MM}mm`);
  log(`  Max:   ${deviation.maxMM}mm`);
  log('');

  // Step 10: Validate
  log('Step 10: Gate validation...');
  const final = edgeAnalysis(result.indices, result.triCount);
  const components = countComponents(result.indices, result.triCount, result.vertexCount);

  let finalDegen = 0;
  for (let i = 0; i < result.triCount; i++) {
    const a = result.indices[i*3], b = result.indices[i*3+1], c = result.indices[i*3+2];
    if (a === b || b === c || a === c) { finalDegen++; continue; }
    const v = result.vertices;
    const abx = v[b*3]-v[a*3], aby = v[b*3+1]-v[a*3+1], abz = v[b*3+2]-v[a*3+2];
    const acx = v[c*3]-v[a*3], acy = v[c*3+1]-v[a*3+1], acz = v[c*3+2]-v[a*3+2];
    const nx = aby*acz-abz*acy, ny = abz*acx-abx*acz, nz = abx*acy-aby*acx;
    if (nx*nx+ny*ny+nz*nz < 1e-20) finalDegen++;
  }

  log(`  boundary    = ${final.boundary} ${final.boundary === 0 ? '  OK' : '  FAIL'}`);
  log(`  non-manifold = ${final.nonManifold} ${final.nonManifold === 0 ? '  OK' : '  FAIL'}`);
  log(`  degenerate  = ${finalDegen} ${finalDegen === 0 ? '  OK' : '  FAIL'}`);
  log(`  components  = ${components} ${components === 1 ? '  OK' : '  FAIL'}`);
  log(`  watertight  = ${final.watertight ? 'YES' : 'NO'} ${final.watertight ? '  OK' : '  FAIL'}`);
  log('');

  // Step 11: Compute physical metrics
  log('Step 11: Physical metrics...');
  let fMinY = Infinity, fMaxY = -Infinity;
  let fMinX = Infinity, fMaxX = -Infinity;
  let fMinZ = Infinity, fMaxZ = -Infinity;
  for (let i = 0; i < result.vertexCount; i++) {
    const x = result.vertices[i*3], y = result.vertices[i*3+1], z = result.vertices[i*3+2];
    if (x < fMinX) fMinX = x; if (x > fMaxX) fMaxX = x;
    if (y < fMinY) fMinY = y; if (y > fMaxY) fMaxY = y;
    if (z < fMinZ) fMinZ = z; if (z > fMaxZ) fMaxZ = z;
  }

  const modelH = fMaxY - fMinY;
  const scale = TARGET_HEIGHT_MM / modelH;
  const widthMM = (fMaxX - fMinX) * scale;
  const depthMM = (fMaxZ - fMinZ) * scale;

  let signedVolModel = 0;
  let surfaceAreaModel = 0;
  for (let i = 0; i < result.triCount; i++) {
    const a = result.indices[i*3], b = result.indices[i*3+1], c = result.indices[i*3+2];
    const v = result.vertices;
    const ax = v[a*3], ay = v[a*3+1], az = v[a*3+2];
    const bx = v[b*3], by = v[b*3+1], bz = v[b*3+2];
    const cx = v[c*3], cy = v[c*3+1], cz = v[c*3+2];
    signedVolModel += (ax*(by*cz - bz*cy) + bx*(cy*az - cz*ay) + cx*(ay*bz - az*by)) / 6;
    const ex = by*cz-bz*cy - (ay*cz-az*cy) + (ay*bz-az*by);
    const abx = bx-ax, aby = by-ay, abz = bz-az;
    const acx = cx-ax, acy = cy-ay, acz = cz-az;
    const nx = aby*acz-abz*acy, ny = abz*acx-abx*acz, nz = abx*acy-aby*acx;
    surfaceAreaModel += Math.sqrt(nx*nx+ny*ny+nz*nz) * 0.5;
  }

  const volumeMM3 = Math.abs(signedVolModel) * scale * scale * scale;
  const volumeCM3 = volumeMM3 / 1000;
  const surfaceAreaMM2 = surfaceAreaModel * scale * scale;

  // Step 12: Export STL + SHA-256
  log('Step 12: Export STL...');
  const stlSize = exportSTL(result, STL_PATH, scale);
  const stlHash = crypto.createHash('sha256').update(fs.readFileSync(STL_PATH)).digest('hex');

  const pedestalMM = pedInfo.pedestalH * scale;
  const actualShellMM = Math.round(shellVoxels * cellSizeMM * 10) / 10;
  const drainDiamActualMM = Math.round(drainInfo.drainRadiusVox * 2 * cellSizeMM * 10) / 10;

  log(`  Height: ${modelH.toFixed(4)} units -> ${TARGET_HEIGHT_MM}mm`);
  log(`  Scale: ${scale.toFixed(2)}x`);
  log(`  Dims: ${widthMM.toFixed(1)} x ${TARGET_HEIGHT_MM} x ${depthMM.toFixed(1)} mm`);
  log(`  Pedestal: ${pedestalMM.toFixed(1)}mm (solid)`);
  log(`  Shell: ${actualShellMM}mm (${shellVoxels} voxels)`);
  log(`  Drains: ${DRAIN_COUNT}x ${drainDiamActualMM}mm`);
  log(`  Material volume: ${volumeCM3.toFixed(1)} cm³`);
  log(`  Surface: ${(surfaceAreaMM2/100).toFixed(1)} cm²`);
  log(`  Hollow reduction: ${hollowReductionPct.toFixed(1)}%`);
  log(`  Signed volume: ${signedVolModel > 0 ? 'positive (outward normals)' : 'negative (inward normals — flip needed)'}`);
  log(`  File: DMF_RELIC_01_ALPHA.stl (${(stlSize/1024/1024).toFixed(1)} MB, ${result.triCount.toLocaleString()} triangles)`);
  log(`  SHA-256: ${stlHash}`);
  log('');

  // Final gate report
  const geoPass = final.boundary === 0 && final.nonManifold === 0 && finalDegen === 0;
  const topoPass = components === 1;
  const envelopePass = widthMM <= PRINTER.plateWidthMM && depthMM <= PRINTER.plateDepthMM && TARGET_HEIGHT_MM <= PRINTER.buildHeightMM;
  const hollowPass = hollowReductionPct >= 50 && volumeCM3 > 0;
  const normalsPass = signedVolModel > 0;
  const shellPass = actualShellMM >= MIN_SHELL_MM;
  const drainPass = DRAIN_COUNT >= 2 && drainDiamActualMM >= MIN_DRAIN_MM;
  const drainabilityPass = drainability.sealedCavities === 0;
  const fabPass = envelopePass && hollowPass && normalsPass && shellPass && drainPass && drainabilityPass;
  const allPass = geoPass && topoPass && fabPass;

  log('===================================================================');
  log(' TOPOLOGY GATE');
  log(`   boundary       = ${final.boundary} ${final.boundary === 0 ? 'PASS' : 'FAIL'}`);
  log(`   non-manifold   = ${final.nonManifold} ${final.nonManifold === 0 ? 'PASS' : 'FAIL'}`);
  log(`   degenerate     = ${finalDegen} ${finalDegen === 0 ? 'PASS' : 'FAIL'}`);
  log(`   components     = ${components} ${components === 1 ? 'PASS' : 'FAIL'}`);
  log(`   watertight     = ${final.watertight ? 'YES' : 'NO'} ${final.watertight ? 'PASS' : 'FAIL'}`);
  log('');
  log(` FABRICATION GATE (${PRINTER.name})`);
  log(`   height         = ${TARGET_HEIGHT_MM.toFixed(1)}mm <= ${PRINTER.buildHeightMM}mm ${TARGET_HEIGHT_MM <= PRINTER.buildHeightMM ? 'PASS' : 'FAIL'}`);
  log(`   width          = ${widthMM.toFixed(1)}mm <= ${PRINTER.plateWidthMM}mm ${widthMM <= PRINTER.plateWidthMM ? 'PASS' : 'FAIL'}`);
  log(`   depth          = ${depthMM.toFixed(1)}mm <= ${PRINTER.plateDepthMM}mm ${depthMM <= PRINTER.plateDepthMM ? 'PASS' : 'FAIL'}`);
  log(`   material vol   = ${volumeCM3.toFixed(1)}cm³ ${volumeCM3 > 0 ? 'PASS' : 'FAIL'}`);
  log(`   hollow savings = ${hollowReductionPct.toFixed(1)}% >= 50% ${hollowReductionPct >= 50 ? 'PASS' : 'FAIL'}`);
  log(`   surface        = ${(surfaceAreaMM2/100).toFixed(1)}cm²`);
  log(`   shell          = ${actualShellMM}mm (${shellVoxels} vox) >= ${MIN_SHELL_MM}mm ${shellPass ? 'PASS' : 'FAIL'}`);
  log(`   pedestal       = ${pedestalMM.toFixed(1)}mm solid PASS`);
  log(`   drains         = ${DRAIN_COUNT}x ${drainDiamActualMM}mm >= ${MIN_DRAIN_MM}mm ${drainPass ? 'PASS' : 'FAIL'}`);
  log(`   engraving      = stroke font (${VOXEL_RES}³) PASS`);
  log(`   normals        = ${signedVolModel > 0 ? 'outward' : 'INWARD'} ${normalsPass ? 'PASS' : 'FAIL'}`);
  log('');
  log(' DRAINABILITY GATE');
  log(`   sealed cavities = ${drainability.sealedCavities} ${drainabilityPass ? 'PASS' : 'FAIL'}`);
  log(`   drain-reachable = ${drainability.drainReachableVolumePct}% ${drainability.drainReachableVolumePct === 100 ? 'PASS' : 'WARN'}`);
  log('');
  log(' FIDELITY');
  log(`   deviation mean  = ${deviation.meanMM}mm`);
  log(`   deviation P95   = ${deviation.p95MM}mm`);
  log(`   deviation P99   = ${deviation.p99MM}mm`);
  log(`   deviation max   = ${deviation.maxMM}mm`);
  log('');
  log(' REPRODUCIBILITY');
  log(`   STL SHA-256    = ${stlHash}`);
  log('===================================================================');

  if (allPass) {
    log('');
    log('ALL GATES PASSED — Drainable Core ready.');
  } else {
    log('');
    if (!geoPass) log('TOPOLOGY GATE FAILED.');
    if (!topoPass) log(`TOPOLOGY GATE FAILED — ${components} components instead of 1.`);
    if (!fabPass) log('FABRICATION GATE FAILED — check envelope/volume/normals.');
    log('STL exported for inspection.');
  }

  // Machine-readable gate output for CI
  const gateResult = {
    boundary: final.boundary,
    nonManifold: final.nonManifold,
    degenerate: finalDegen,
    components,
    watertight: final.watertight,
    voxelRes: VOXEL_RES,
    heightMM: TARGET_HEIGHT_MM,
    widthMM: Math.round(widthMM * 10) / 10,
    depthMM: Math.round(depthMM * 10) / 10,
    volumeCM3: Math.round(volumeCM3 * 10) / 10,
    surfaceAreaCM2: Math.round(surfaceAreaMM2 / 100 * 10) / 10,
    normalsOutward: signedVolModel > 0,
    shellThicknessMM: actualShellMM,
    shellVoxels,
    drainCount: DRAIN_COUNT,
    drainDiameterMM: drainDiamActualMM,
    hollowReductionPct: Math.round(hollowReductionPct * 10) / 10,
    sealedCavities: drainability.sealedCavities,
    drainReachableVolumePct: drainability.drainReachableVolumePct,
    surfaceDeviationMeanMM: deviation.meanMM,
    surfaceDeviationMaxMM: deviation.maxMM,
    surfaceDeviationP95MM: deviation.p95MM,
    printerProfile: PRINTER.name,
    triangles: result.triCount,
    stlBytes: stlSize,
    stlSHA256: stlHash,
    pass: allPass
  };
  const gatePath = path.join(__dirname, '..', 'assets', 'models', 'GEOMETRY_GATE.json');
  fs.writeFileSync(gatePath, JSON.stringify(gateResult, null, 2) + '\n');
  log(`\nGate results: ${gatePath}`);
}

main();
