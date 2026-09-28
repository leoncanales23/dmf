# DMF Hyperdrive V2 — cinematic audio-reactive landing (V7)

Choreography on top of the engine that already works. Nothing is rebuilt: the bands, onsets, the
HYPERDRIVE moment (`engine.js`), the kinetic SINGULARITY (`kinetic.js`), the Spatial Stage, the one rAF
(`signal-bus.js`), both performance governors and the V2–V6 Event Horizon layers stay as they are.

## Where it lives

| Piece | File | Role |
|---|---|---|
| Choreography core | `scripts/overdrive/hyperdrive-v2.js` | Pure ES5 layer, no clock/DOM/timers/allocation per frame. Stepped by `DMFEventHorizon.update` after V6 Lightspeed; writes `hv*`, `cam*`, `drop*`, `sing*`, `rf*`, `pf*`, `fx*` into `hub.eventHorizon`. |
| Director wiring | `scripts/overdrive/event-horizon.js` | Hands in the SINGULARITY, the HYPERDRIVE and the bus FPS; reads the flags; writes the field/section CSS variables; click wave, card light; analytics. |
| Receiver | `scripts/overdrive/relic.js` | Consumes the terms: lights, camera offsets, reflection shader, speaker damping, head delay, nod/sway, sparkle, dominance, portal stretch. |
| Page | `index.html` (source of truth) → `public/index.html` (build) | Field layers (`.hv-glow`, `.hv-ring`, `.hv-dim`, `.hv-flash`), stretch, sheen reflections, microinteractions. |

## Subsystems

- **DMFLightDirector** — key ×[0.55, 1.4], rim/accent/background/side ∈ [0, 1], key sweep ±0.35 rad,
  fog exposure ∈ [−1, 1], emissive ≤ 0.05. Bounded, then smoothed with attack/release, then clamped.
  Per section: releases side-lit, academy recedes, offer steps back.
- **DMFCameraDirector** — `ICON ORBIT PUSH IMPACT FLYBY REVEAL SINGULARITY RECOVERY`. Each mode is a
  target offset (dolly, orbit, lift, FOV) followed by critically damped springs with an acceleration
  limit: a mode change is a change of force, never of position. Desktop ≤ 0.26 u forward, ±1.5°;
  phones ≤ 0.08 u, ±0.6°. Only in auto mode (never against a drag). No noise, no shake.
- **DMFReflectionField** — warm wide LOW band, cold narrow HIGH sweep, a kick wave climbing the object,
  per-zone phase offsets; stronger in HYPERDRIVE, retracted before a drop, collapsed toward the centre
  before a SINGULARITY. In the relic fragment shader (zero cost at rest) and on the page sheens.
- **DMFDropTimeline** — T−700 ms compress, T−100 ms edge (micro blackout), T impact, T+200 ms
  secondary highlight, T+600 ms recovery, T+1.2 s exactly zero. Anchored on the existing HYPERDRIVE hit
  (8 s cooldown) and the predictor's time-to-drop; no new clock.
- **DMFSingularityTreatment** — on the existing kinetic SINGULARITY (≥ 12 s, every 2nd drop or an armed
  forced drop): reflections collapse, light compresses, camera is pulled in, one flash, background
  stretches, release, recovery (≤ 2.8 s). Its own ≥ 12 s guard.
- **DMFPerformerMotion** — mids low-passed (~0.45 s), head impulse trails the speakers by 40–70 ms,
  deterministic noise on nod phase/scale and sway, cone damping 0.38–0.52 from energy.
- **DMFEffectGovernor** — authority per channel from tier, device, flags and measured FPS (targets:
  high 55, balanced 45, lite 30). Sheds overlays → particles → reflections → lights (floor 50%) →
  camera (floor 50%); the Receiver never.

## Flags (`academy-env.js` → `window.__DMF_COMMERCE__.effects`)

| Repository variable | Flag | `false` means |
|---|---|---|
| `DMF_EFFECT_AUDIO_REACTIVE` | `audioReactive` | no analyser; the stage runs on its idle clock |
| `DMF_EFFECT_REFLECTIONS` | `reflections` | no V7 reflection field (V2–V6 sweeps stay) |
| `DMF_EFFECT_PARTICLES` | `particles` | no V7 HIGH sparkle on the embers |
| `DMF_EFFECT_CINEMATIC_CAMERA` | `cinematicCamera` | no V7 camera modes (the shot rig stays) |
| `DMF_EFFECT_SINGULARITY_FX` | `singularityFX` | no V7 SINGULARITY treatment (the kinetic event stays) |

All default on. `academy-env.js` is served `no-cache`, so a flag change takes effect on the next deploy.

## Reduced motion / Save-Data / STATIC

No clock starts; the director composes one frame with every V7 term at rest. CSS hides the field layers
and freezes the microinteractions. Pricing tiers never receive a V7 microinteraction; every field layer
multiplies by `(1 − calm)`, so the offer stays quiet.

## Rollback

Set the four `DMF_EFFECT_*` variables to `false` (instant, next deploy), or revert the V7 commits:
`hyperdrive-v2.js` is inlined once and every consumer reads its terms with a neutral default.
