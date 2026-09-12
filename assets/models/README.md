# DMF 3D signal asset

The source Meshy GLB used for the landing was optimized for web delivery and stylized as a lightweight metallic-orange DMF sculpture.

As of PR10 the model is no longer mounted inside Demian's portrait. It is presented in a dedicated full-width **DMF Signal** band between the hero and biography, where the low-poly aesthetic reads as an intentional digital sculpture instead of a small embedded widget.

The deploy workflow reconstructs `dmf-signal-chrome.glb` from four Base64 text chunks because repository automation here writes UTF-8 text files. `scripts/check-3d.cjs` validates the reconstructed payload before deployment.

Expected GLB:
- Size: 16,416 bytes
- SHA-256: `f389cc121e01b4240e0ea49a506a83e699dfac7d55ae1a91c3009f72e8d8d146`
- glTF version: 2

The original high-resolution Meshy source is intentionally not deployed to Firebase Hosting because it is approximately 89.8 MB.
