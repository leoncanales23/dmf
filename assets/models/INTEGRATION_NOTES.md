# DMF RELIC 01 — Integration Notes

## WEB RELIC (live at dmf.vibraalto.cl)

The Receiver exists as a full-section 3D experience below the hero.
It is not layered inside the portrait — it occupies its own `dmf-signal-band`
section with dedicated canvas, HUD overlay, and state machine.

**Renderer**: Three.js r128 with `MeshStandardMaterial` + `onBeforeCompile`
shader injection for GPU-side reactive anatomy and cinematic glow.

**Interaction**:
- slow FPS-independent auto-rotation (`dt * 0.072`)
- manual orbit controls on pointer drag
- per-vertex zone detection via GPU `aZoneId` attribute
- DORMANT / AWAKENED / TRANSMITTING state machine
- bilingual HUD (EN/ES) with `MutationObserver` language sync
- **Live set** (124 BPM beat clock): the GLB is a single static mesh with no
  rig, so motion is procedural in the vertex shader using object-space
  anchors — DJ head nods around a neck pivot, torso sways/bounces, monitor
  cones pump on the kick, and the DMF logo bars light up like an equalizer.
  Pedestal rim, rings and under-glow are kick-synced. The same displacement
  is applied to the wireframe/edge overlays so they stay aligned.
- `IntersectionObserver` pauses render off-screen; `getDelta()` clamped
  to 50ms to prevent time jump on re-entry

**Performance**:
- quality tiers: HIGH (desktop) / BALANCED (mobile ≥480px) / STATIC (<480px)
- `prefers-reduced-motion` disables auto-rotation and the live set
- Save-Data / 2G connections skip the 3D layer entirely
- model load failure removes the section cleanly

**Source**: `dmf-studio-optimized.glb` (105,734 vertices, single mesh)
processed by `scripts/build-3d.cjs` → injected into `public/index.html`.

---

## PRINT MASTER (in development)

The same artifact reinterpreted for physical fabrication.

**Digital → Physical translation**:
- PBR + shader + signal + animation → geometry + silhouette + engraving + pedestal + material
- luminous signal lines → engraved grooves
- "01" identifier → physical pedestal inscription
- "THE RECEIVER" → embossed text

**Target**: 150mm resin print (Edition 01)

**Preflight status**: see `PRINT_PREFLIGHT_REPORT.md` for full geometry analysis.
The web-optimized GLB is **not printable** as-is:
- 96,829 boundary edges (mesh has holes)
- 9,442 disconnected components (AI generation debris)
- 145 degenerate triangles
- PBR textures have no physical equivalent

Wall thickness at scale (~0.93mm estimated) exceeds resin minimum (0.5mm).
This is a statistical estimate from opposing-normal vertex pairs, not a
raycasting measurement — treat as indicative, not a manufacturing spec.
The silhouette and primary structure are viable — they need repair,
fusion, and a stability pedestal before export to STL/3MF.

**Repair pipeline** (`scripts/repair-geometry.cjs` — Manufacturing Master):

Approach: volumetric manifold rebuild via voxelization + marching cubes,
with shell hollowing, designated-drain routing, true internal drainability,
bidirectional surface fidelity, and dual-format export (STL + 3MF).
`repaired surfaces → voxel union (256³) → hollow shell → drains → drain verify → manifold validation`

1. Remove 145 degenerate triangles and 8,000 debris components
2. Spatial vertex weld (ε=5×10⁻⁴) → merged 38,707 duplicate vertices
3. Voxelize mesh surface (256³ grid, cell≈0.011 units, ~0.76mm/voxel)
4. Add pedestal as solid voxel volume (fused, ~8.4mm at scale)
5. Dilate surface shell (seal micro-gaps for watertight flood fill)
6. Flood fill exterior → identify and fill interior
7. Hollow interior — BFS distance transform carves voxels deeper than
   shell thickness (2.5mm / ~4 voxels), pedestal stays solid
7b. Carve drain holes — 2× ~2.5mm channels through pedestal bottom
7c. Connect sealed cavities to designated drains — receives drain positions
    from step 7b, BFS from each sealed cavity to nearest drain-column air
    (never routes through the figure's exterior surface)
7d. Verify drainability — true internal metric: flood fill from borders
    with drain columns blocked identifies exterior ocean; normal flood fill
    identifies all reachable air; internal void = total air − ocean;
    drain-reachable internal = reachable − ocean; reports sealed cavity
    count, sealed air voxels, and drain-reachable percentage
8. Engrave text via stroke font: DMF RELIC 01 / THE RECEIVER / 001
9. Marching cubes isosurface extraction → single manifold shell
9a. Keep largest connected component (remove marching cubes artifacts)
9b. Bidirectional surface deviation — forward (output→original) and
    reverse (original→output) nearest-neighbor lookup via spatial hash;
    reports per-direction mean/P95/max and bidirectional max
10. Validate topology + fabrication + drainability gates
11. Export STL + 3MF (with metadata) + SHA-256 hashes

**Topology Gate** (0/0/0/1):
- boundary=0 ✓
- non-manifold=0 ✓
- degenerate=0 ✓ (area threshold, not just index equality)
- components=1 ✓
- watertight=YES ✓

**Fabrication Gate** (Generic Resin 200mm):
- Envelope: fits 200×200×200mm build plate ✓
- Shell thickness: ~3.1mm (≥1.5mm minimum) ✓
- Drains: 2× ~3.1mm (≥2.0mm minimum) through pedestal ✓
- Material volume: reduced ≥50% from solid ✓
- Normals: outward (positive signed volume) ✓
- Pedestal: solid fused ✓
- Engraving: stroke-font glyphs at 256³ resolution ✓

**Drainability Gate** (true internal metric):
- Exterior ocean excluded from denominator
- Sealed cavity count: 0 ✓
- Sealed air voxels: 0 ✓
- Drain-reachable internal air: 100% ✓
- Routing: designated-drain only (never exterior surface)

**Fidelity Gate** (bidirectional, GLB ↔ Print Master):
- Forward (output→original): measures added geometry
- Reverse (original→output): detects lost features
- Pedestal/margin vertices excluded from forward measurement
- Reports per-direction mean/P95/max and bidirectional max
- Gate: worst P95 ≤ 15mm (catches catastrophic deformation)

**Component Filter Gate**:
- `keepLargestComponent()` removes marching cubes artifacts
- Safety limit: removed triangles ≤ 1% of total (catches real geometry loss)
- Reports `removedComponents`, `removedTriangles`, `removedPct` in gate JSON

**Printer Profiles**:
- `plateWidthMM` / `plateDepthMM` / `buildHeightMM` — unambiguous axis naming
- Currently: Generic Resin 200mm (200×200×200)
- Swappable for real printer specs in PR34

**Export Formats**:
- STL: binary, scaled to mm, SHA-256 in gate
- 3MF: ZIP container with XML model, metadata (title, designer,
  description, deterministic creation date), scaled to mm, SHA-256 in gate
- Creation date uses `SOURCE_DATE_EPOCH` if set, otherwise fixed release date
- Print Master button on landing page downloads the 3MF file

**Reproducibility**:
- STL + 3MF SHA-256 committed in GEOMETRY_GATE.json
- 3MF creation date is deterministic (fixed constant, not `new Date()`)
- CI verifies gate + preflight + both hashes match regenerated

**CI validation**: `validate-print` job runs preflight + repair + gate checks
(including drainability + fidelity + component filter) + 3MF structural
validation (`unzip -t`, required entries, XML well-formedness) + STL/3MF
SHA-256 verification + reproducibility (committed artifacts must match).

**Pipeline**: `scripts/preflight-print.cjs` (analysis) → `scripts/repair-geometry.cjs` (repair) → CI validates `GEOMETRY_GATE.json` + STL/3MF hashes
