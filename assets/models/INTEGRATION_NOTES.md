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

**Pipeline**: `scripts/preflight-print.cjs` (analysis) → PR29 geometry repair → PR30 export
