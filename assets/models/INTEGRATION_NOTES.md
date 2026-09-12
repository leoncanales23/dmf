# 3D integration notes

The DMF hero keeps Demian's existing portrait as the primary human focal point. The Meshy-derived object is layered as a compact interactive studio signal inside the portrait frame rather than replacing the photography.

Interaction and performance choices:
- metallic orange material aligned with the existing `#ff5b1e` accent
- slow auto-rotation with manual orbit controls
- zoom disabled so mobile scrolling remains comfortable
- `prefers-reduced-motion` disables automatic rotation
- Save-Data and 2G connections skip the 3D layer entirely
- model load failure removes the 3D panel and leaves the original hero untouched
- IntersectionObserver pauses auto-rotation off-screen

This keeps the 3D treatment expressive without turning the landing into a heavy WebGL scene.
