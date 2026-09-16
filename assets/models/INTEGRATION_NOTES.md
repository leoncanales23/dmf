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
- `IntersectionObserver` pauses render off-screen; `getDelta()` clamped
  to 50ms to prevent time jump on re-entry

**Performance**:
- quality tiers: HIGH (desktop) / BALANCED (mobile ≥480px) / STATIC (<480px)
- `prefers-reduced-motion` disables auto-rotation
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

**Repair pipeline** (`scripts/repair-geometry.cjs` — Drainable Core):

Approach: volumetric manifold rebuild via voxelization + marching cubes,
with shell hollowing, drain engineering, drainability verification, and
surface fidelity measurement.
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
7c. Connect sealed cavities to drain-reachable air — flood fill from
    borders identifies exterior+drain-connected air, then carves channels
    from each sealed cavity to nearest drain-connected voxel
7d. Verify drainability — final flood fill confirms sealed cavities = 0
    and drain-reachable volume = 100%
8. Engrave text via stroke font: DMF RELIC 01 / THE RECEIVER / 001
9. Marching cubes isosurface extraction → single manifold shell
9b. Surface deviation measurement — spatial-hash nearest-neighbor lookup
    comparing output mesh vertices to original GLB vertices (in mm at scale)
10. Validate topology + fabrication + drainability gates
11. Export STL + SHA-256 hash

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

**Drainability Gate**:
- Sealed cavities after drain connection: 0 ✓
- Drain-reachable internal air: 100% ✓
- All cavity air reachable from at least one drain hole

**Surface Fidelity** (GLB → Print Master):
- Mean deviation: ~2.6mm (voxel quantization at 256³)
- P95: ~7.3mm, Max: ~14.0mm (concavities/thin features smoothed)
- Pedestal/margin vertices excluded from measurement

**Printer Profiles**:
- `plateWidthMM` / `plateDepthMM` / `buildHeightMM` — unambiguous axis naming
- Currently: Generic Resin 200mm (200×200×200)
- Swappable for real printer specs in PR34

**Reproducibility**:
- STL SHA-256 committed in GEOMETRY_GATE.json
- CI verifies gate + preflight + STL hash match regenerated

**CI validation**: `validate-print` job runs preflight + repair + gate checks
(including drainability + fidelity) + STL SHA-256 verification +
reproducibility (committed artifacts must match).

**Pipeline**: `scripts/preflight-print.cjs` (analysis) → `scripts/repair-geometry.cjs` (repair) → CI validates `GEOMETRY_GATE.json` + STL hash
