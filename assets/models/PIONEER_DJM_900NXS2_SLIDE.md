# Pioneer DJM-900NXS2 — DMF slide 3D asset

Source supplied by León:
- `Meshy_AI_Pioneer DJM-900NXS2 Mixer_1790293327_texture.stl`
- source size: 6,185,384 bytes
- source triangles: 123,706 (61,821 welded vertices, positive signed volume, outward winding)
- source SHA-256: `f8de22b178dff355d5108d695a5fd0db074671da218b1b39945297ba807c318f`
- the STL is **not** committed: everything in `assets/models/` is published by the deploy, and the master
  stays with the owner.

Web slide asset:
- `assets/models/pioneer-djm-900nxs2-mixer-slide.glb`, served at `/assets/models/pioneer-djm-900nxs2-mixer-slide.glb`
- 30,000 triangles / 35,516 vertices / 749,432 bytes
- SHA-256 `46214e44e45aa07f27a96da55228c90b3594dcc2778a0fb77eb7208a4b09d8ef`
- float positions, baked crease-split normals (38°) as `KHR_mesh_quantization` int8 — no decoder needed in Three.js r128
- material `DMF_Mixer_Metal`: baseColor [0.1216, 0.1216, 0.1333], roughness 0.28, metallic 0.72
- rebuilt deterministically from the master with `node scripts/build-mixer-glb.cjs <master.stl>`
  (it verifies the SHA-256 above; the tool dependencies are installed with `--no-save`, see the script header)

Orientation:
- The STL is Z-up with the control surface facing −Y: Meshy built it from the top-down product photo.
- The GLB bakes a 180° turn about X (y → −y, z → −z): control surface up (+Y), crossfader end towards +Z,
  the embossed model plate at the front. The runtime only auto-centers and auto-scales from the Box3.
- The first proxy (566 triangles) kept the STL axes, so its flat "top" was the back of the unit. It is replaced.

Decimation:
- meshoptimizer, error-bounded, relative error 0.00043 at 30k triangles. Knobs, faders, the FX/jog section and
  the embossed plate survive at slide size. Geometry is only reduced — nothing is modelled or added.
- A 60k-triangle build is ~1.06 MB; at the slide's size (≤ ~560 CSS px) it was indistinguishable, so 30k ships.

Important:
- STL carries geometry, not the original Meshy texture/PBR maps despite the filename.
- Do not replace this with a generated 2D image or a third-party model.
- Rendered by `scripts/overdrive/mixer-stage.js` on the DMF Signal Bus clock and the performance governor tier.
- Do not touch payment, Auth, Firestore, signed video, or the frozen print master while integrating this slide.
