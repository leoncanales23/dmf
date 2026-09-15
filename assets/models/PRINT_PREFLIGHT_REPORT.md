# DMF RELIC 01 — Print Master Preflight Report
Generated: 2026-09-15T05:52:26.271Z
Source: dmf-studio-optimized.glb (7811.1 KB, glTF 2)
Method: deterministic (seeded PRNG, same GLB → same report)

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

## Connected Components (pre-weld, by index connectivity)
- Total: 9,442
- Large (≥100 vertices): 149 — primary geometry
- Small (10–99 vertices): 1326 — detail pieces or noise
- Debris (<10 vertices): 7967 — floating orphan triangles
- Largest component: 1,731 vertices

> **Note**: These counts use index connectivity only. Spatially coincident
> vertices with distinct indices appear disconnected. A spatial weld pass
> will likely collapse many boundary edges and merge components.

## Thin Wall Estimation (approximate)
- Method: 100,000 deterministic opposing-normal vertex pairs
- Minimum wall distance: 0.012414 model units
- At 150mm scale: ~0.93 mm

> **Caveat**: This is a statistical estimate from random vertex pairs, not
> a true raycasting surface-thickness analysis. The actual minimum wall
> thickness may be thinner in areas not sampled. Treat as indicative, not
> as a manufacturing specification.

## Scale Analysis — 150mm Edition
- Scale factor: 75.00x
- Physical width: 150.0 mm
- Physical height: 150 mm
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
2. **9,442 disconnected components** (7,967 debris fragments) — orphan geometry from AI generation
3. **10 non-manifold edges** — T-junctions that confuse boolean operations
4. **145 degenerate triangles** — zero-area faces that break normal computation
5. **PBR textures** (3) — color/metallic/normal maps have no physical equivalent

### Viable for print (with repair)
- Silhouette and primary structure are intact
- Estimated wall thickness at scale (~0.9mm) exceeds resin minimum (0.5mm)
- 150mm height is within consumer resin printer build volume
- Detail features should resolve at resin resolution (50μm layer)

### Required geometry work
1. Remove 145 degenerate triangles and 7,967 debris components
2. Spatial vertex weld (merge coincident vertices within ε)
3. Re-analyze: components, boundary edges, non-manifold after weld
4. Filter components by surface area (not just vertex count)
5. Orient normals consistently
6. Close remaining boundary edges
7. Add solid pedestal for print stability
8. Validate watertight
9. Scale to 150mm and export STL alpha
