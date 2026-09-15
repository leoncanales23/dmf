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

**Repair pipeline** (`scripts/repair-geometry.cjs` — Manufacturing Detail):

Approach: volumetric manifold rebuild via voxelization + marching cubes.
`repaired surfaces → voxel union (256³) → single shell → manifold validation`

1. Remove 145 degenerate triangles and 8,000 debris components
2. Spatial vertex weld (ε=5×10⁻⁴) → merged 38,707 duplicate vertices
3. Voxelize mesh surface (256³ grid, cell=0.011 units, ~0.76mm/voxel)
4. Add pedestal as solid voxel volume (fused, 8.4mm at scale)
5. Dilate surface shell (seal micro-gaps for watertight flood fill)
6. Flood fill exterior → identify and fill interior
7. Engrave text via stroke font: DMF RELIC 01 / THE RECEIVER / 001
8. Marching cubes isosurface extraction → single manifold shell
9. Validate topology gate (0/0/0/1) + fabrication gate
10. Export: `DMF_RELIC_01_ALPHA.stl` (750K triangles, 35.8 MB, 150mm height)

**Topology Gate** (0/0/0/1):
- boundary=0 ✓
- non-manifold=0 ✓
- degenerate=0 ✓ (area threshold, not just index equality)
- components=1 ✓
- watertight=YES ✓

**Fabrication Gate**:
- Envelope: 183.5 × 150.0 × 183.5 mm ✓ (fits 200mm build plate)
- Volume: 2015.7 cm³
- Surface area: 1722.4 cm²
- Normals: outward (positive signed volume) ✓
- Pedestal: 8.4mm fused solid ✓
- Engraving: stroke-font glyphs at 256³ resolution ✓

**CI validation**: `validate-print` job runs preflight + repair + gate checks
+ reproducibility (committed GEOMETRY_GATE.json must match regenerated).

**Pipeline**: `scripts/preflight-print.cjs` (analysis) → `scripts/repair-geometry.cjs` (repair) → CI validates `GEOMETRY_GATE.json`
