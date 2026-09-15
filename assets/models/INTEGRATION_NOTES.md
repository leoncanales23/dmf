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

Wall thickness at scale (≥1.0mm) exceeds resin minimum (0.5mm).
The silhouette and primary structure are viable — they need repair,
fusion, and a stability pedestal before export to STL/3MF.

**Repair pipeline** (`scripts/repair-geometry.cjs`):
1. Remove 145 degenerate triangles and 8,000 debris components
2. Spatial vertex weld (ε=5×10⁻⁴) → merged 38,707 duplicate vertices
3. Re-analyze: boundary 96,829 → 66,602, non-manifold 10 → 794
4. Filter components by surface area
5. Resolve non-manifold edges (1,090 triangles removed)
6. Orient normals consistently (40,223 flipped)
7. Close boundary loops (87 loops), solidify open sheets (0.6mm wall)
8. Add chamfered pedestal (8.5mm) with engraving: DMF RELIC 01 / THE RECEIVER / 001
9. Validate: boundary=0, degenerate=0, 5 components
10. Export: `DMF_RELIC_01_ALPHA.stl` (300K triangles, 14.3 MB, 150mm height)

**Gate status**:
- Geometry Gate: boundary=0 ✓, degenerate=0 ✓, non-manifold=14,617 (overlapping shells from solidify — slicer auto-repair)
- Fabrication Gate: 150mm ✓, solid pedestal ✓, engraving ✓

**Pipeline**: `scripts/preflight-print.cjs` (analysis) → `scripts/repair-geometry.cjs` (repair) → PR30 refinement
