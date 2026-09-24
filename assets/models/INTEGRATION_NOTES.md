# DMF RELIC 01 — Integration Notes

## WEB RELIC (live at dmf.vibraalto.cl)

The Receiver exists as a full-section 3D experience below the hero.
It is not layered inside the portrait — it occupies its own `dmf-signal-band`
section with dedicated canvas, HUD overlay, and state machine.

**Renderer**: Three.js r128 with `MeshStandardMaterial` + `onBeforeCompile`
shader injection for GPU-side reactive anatomy and cinematic glow.

**DMF Overdrive architecture** (`scripts/build-3d.cjs` inlines, in order):
- `scripts/overdrive/engine.js` — pure ES5, unit-tested (`test/engine.test.cjs`):
  `DMFSignalEngine` (synthetic 124 BPM performance with a 32-bar arrangement
  intro → groove → build → drop, crossfading to real analyser data when a
  same-origin `<video>/<audio>` plays), `DMFStateMachine`
  (DORMANT → AWAKENED → TRANSMITTING → OVERDRIVE with hysteresis; OVERDRIVE is
  earned by sustained drop energy), `DMFSpring` (impulse + drag physics) and
  `DMFPerformanceGovernor` (one-way HIGH → BALANCED → LITE downgrade from a
  3 s rolling FPS window; never upgrades, so tiers cannot oscillate).
- `scripts/overdrive/signal-bus.js` — `window.DMFSignal`: one rAF clock for the
  whole landing; `DMFAudioReactive` analyser (attack/release smoothing, onset
  flux, auto-gain); landing bus writing `--dmf-energy/kick/low/high/peak/phase/overdrive`
  only on visible blocks (~30 Hz); Academy signal path node per bar;
  `window.__DMF_PERF__` on localhost or `?dmfdebug=1` only.
- `scripts/overdrive/relic.js` — the Receiver scene, `DMFRelicAnimator`
  (head spring + torso impulse + counter-twist, cone excursion with spring
  return, OVERDRIVE cabinet buzz, 5-segment logo EQ with peak hold, warm
  reflective sweeps ≥1.2 s apart, pedestal shockwave), `DMFCameraRig`
  (ICON / SIGNAL / RELIC shots on a loop, OVERDRIVE push-in with roll
  correction, eased spherical blends, drag override with 5 s gentle resume),
  and the fullscreen **DMF LIVE SIGNAL** HUD (state, BPM, energy, LOW/MID/HIGH;
  SPACE / tap toggles the drop, ESC exits).

**DMF Hyperdrive V2 — perceptual motion architecture**:
- Three response layers from the engine: IMPULSE (0-90 ms: cones, head snap,
  wave origins), BODY (90-320 ms: torso compression, cabinets, lights, logo)
  and CINEMA (250-1600 ms: impact lens, exposure, environment).
- Beat predictor: `timeToBeat`, `nextBeat`, `timeToDrop`; analyser mode fires
  the visual impulse ~50 ms before the predicted beat (audio is never delayed).
- `DMFHyperdrive`: a finite 3 s event (pre → hit → push → wave → spread →
  decay) earned from a drop downbeat or a forced drop in Live Signal; one entry
  per drop, 8 s cooldown, clean exit.
- Relic: left/right monitors 14 ms apart, cabinet resonance, radial desk wave,
  pedestal wave centre → rim → rings → grid, logo transient from the M outward,
  impact lens (FOV ≤ ±3°, roll ≤ ±1.5°, pre-impact pullback).
- Landing: one global wave travels from the Receiver at 2600 px/s using cached
  document positions; scroll-linked `--dmf-enter/--dmf-exit` make each block's
  exit hand the signal line to the next; hero depth field, per-letter wave,
  signal plane; pointer depth on fine pointers only.
- Dynamic render resolution inside each tier (`DMFRenderScaler`, hysteresis,
  ≥4 s between changes); the governor still only downgrades tiers.

**DMF Hyperdrive V3 — KINETIC SINGULARITY** (`scripts/overdrive/kinetic.js`,
inlined between the engine and the bus, tested by `test/kinetic.test.cjs`):
- `DMFKineticBody`: a unit mass with position, velocity, acceleration and
  jerk-limited target acceleration (spring + damping ratio, `maxA`, `maxJ`,
  hard min/max). Impulses are short decaying forces, never velocity jumps, so
  a beat reads acceleration → impact → overshoot → counter-motion → settle.
  Head, torso, twist, shoulders, cones, cabinets, Receiver depth/scale,
  pedestal compression, camera travel, lens, roll, lateral arc and the shot
  pose follower are all kinetic bodies with strict limits.
- `DMFForceMatrix`: one deterministic audio → motion mapping on the bus
  (`DMFSignal.forces`). KICK → cones, head, camera, pedestal; LOW → torso,
  cabinets, floor, depth; MID → shoulders, logo, lateral torque; HIGH →
  metal, light edges, details; ENERGY → amplitude, camera travel, environment.
  Each channel is driven by exactly one conditioned band, never raw FFT.
- `DMFSingularity`: a rare finite event above HYPERDRIVE that needs a
  predicted drop. PRECOMPRESSION (−700 ms) → IGNITION (−120 ms) → IMPACT →
  BREAKTHROUGH (+80..220 ms) → PROPAGATION (+250..700 ms) → DECAY (..2.2 s) →
  RESOLVE (..3.5 s), then exactly back to rest. Every second natural drop earns
  it; SPACE in Live Signal arms the next drop and moves it to a downbeat
  ≥720 ms away so the run-up is never cut short. One per drop, ≥12 s cooldown,
  stands down if the drop is withdrawn. Not available when the analyser leads
  (no predictable drop); HYPERDRIVE still handles those.
- `DMFVelocityField`: camera-relative Receiver velocity in view space drives
  a shader-side anisotropic highlight stretch and a warm trailing-edge bias
  (no screen blur, zero at rest); reflections answer acceleration, angular
  velocity and view angle, and fast motion starts a rate-limited sweep.
- Temporal echo: two ghost copies sharing the geometry and deformation trail
  the camera-relative motion by 2 and 4 frames during high impacts only
  (< 220 ms, very low opacity, HIGH tier only, no per-frame allocations).
- Breakthrough tunnel: three warm rings rush past the lens (HIGH/BALANCED).
- Camera shot engine V3: ICON / PRESSURE / IMPACT / ORBIT / SINGULARITY /
  RECOVERY as a kinetic overlay on the existing shots; the shot pose itself is
  followed through critically damped bodies, so cuts never change velocity
  abruptly. The camera reacts before a predicted beat.
- Landing: wave speed scales with impact strength (1800–3400 px/s); headings
  compress in depth and release, dividers carry a travelling pulse, the Academy
  timeline lights node by node, pricing resolves, contact takes the last echo.
- Pointer (fine pointers only): velocity becomes a small force on the camera arc
  and Receiver torque; touch keeps the audio choreography only.
- Debug (`?dmfdebug=1` / localhost): `kineticState`, `singularity`,
  `singularityPhase`, `accel`, `jerk`, `cameraVelocity`, `receiverVelocity`,
  `reflectionDrive`, `echoLevel`, `forceKick/Low/Mid/High`; the Live Signal
  HUD shows KINETIC, ACCEL, SINGULARITY, CAM, TIER and FPS.

**Interaction**:
- pointer orbit (mouse + touch, `touch-action: pan-y` keeps vertical scroll)
- per-vertex zone detection via GPU `aZoneId`; hover raycast throttled to ~20 Hz
- bilingual HUD (EN/ES) with `MutationObserver` language sync
- the GLB is a single static mesh with no rig: all motion is procedural in the
  vertex shader around object-space anchors (DJ head/neck, torso, monitor cones);
  the wireframe/edge overlays receive the same displacement
- render pauses off-screen (`IntersectionObserver`); the signal clock keeps
  feeding the landing

**Performance**:
- quality tiers: HIGH (desktop) / BALANCED (mobile, touch) / STATIC (≤2 GB RAM or ≤2 cores)
- DPR caps 1.75 / 1.5 (1.25 under 480 px) / 1; shadows HIGH only; particle
  draw range 160 / 80 / 40; overlays trimmed on lower tiers
- `prefers-reduced-motion`: static ICON composition, no clock, no choreography,
  no flashes; drag still re-renders on demand
- Save-Data / 2G connections skip the 3D layer and the signal clock entirely
- model load failure leaves the section with its typographic fallback

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
