# DMF RELIC 01 — Print Master Preflight Report
Generated: 2026-09-15T05:31:51.352Z
Source: dmf-studio-optimized.glb (7811.1 KB, glTF 2)

## Scene Structure
- Nodes: 1
- Meshes: 1
- Materials: 1
- Textures: 3 (PBR — will not survive print)

## Mesh Metrics
- Vertices: 105,734
- Triangles: 97,352
- Material: "material"

## Bounding Box (model units)
- X: [-1.0000, 1.0000] → 2.0000
- Y: [-1.0000, 1.0000] → 2.0000
- Z: [-1.0000, 1.0000] → 2.0000

## Manifold Analysis
- Total edges: 194,433
- Manifold (2 faces): 97,594
- Boundary (1 face): 96,829 ⚠ HOLES
- Non-manifold (3+): 10 ⚠ OVERLAPS
- **Watertight: NO ✗**

## Degenerate Triangles: 145

## Connected Components
- Total: 9,442
- Large (≥100 vertices): 149 — primary geometry
- Small (10–99 vertices): 1326 — detail pieces or noise
- Debris (<10 vertices): 7967 — floating orphan triangles
- Largest component: 1,731 vertices

## Thin Wall Estimation
- Sampled 100,000 opposing-normal vertex pairs
- Minimum wall distance: 0.013876 model units

## Scale Analysis — 150mm Edition
- Scale factor: 75.00x
- Physical width: 150.0 mm
- Physical height: 150.0 mm
- Physical depth: 150.0 mm
- Resin min feature (50μm) in model units: 0.000667
- Resin min wall (0.5mm) in model units: 0.006667

## Embedded Textures (render-only, removed for print)
- base_color: image/jpeg, 953.5 KB
- metallic_roughness: image/jpeg, 340.1 KB
- normal: image/jpeg, 418.6 KB

## Preflight Verdict

### Blockers for direct STL conversion
1. **96,829 boundary edges** — mesh is not closed; slicer will fail or produce garbage
2. **9,442 disconnected components** — thousands of orphan triangles from AI generation
3. **10 non-manifold edges** — T-junctions that confuse boolean operations
4. **145 degenerate triangles** — zero-area faces that break normal computation
5. **PBR textures** — color/metallic/normal maps have no physical equivalent

### Viable for print (with repair)
- Silhouette and primary structure are intact
- Wall thickness at scale (≥1.5mm) exceeds resin minimum (0.5mm)
- 150mm height is well within consumer resin printer build volume
- Detail features should resolve at resin resolution (50μm layer)

### Required geometry work (PR29)
1. Strip debris components (<10 vertices) — removes ~7967 orphan fragments
2. Merge overlapping vertices (weld within ε)
3. Fill boundary edges to close the mesh
4. Remove degenerate and zero-area triangles
5. Fix non-manifold edges
6. Add solid pedestal base for print stability
7. Boolean-union all remaining components into single watertight shell
8. Set origin and scale to 150mm height
9. Export STL (binary) and 3MF with manufacturing metadata
