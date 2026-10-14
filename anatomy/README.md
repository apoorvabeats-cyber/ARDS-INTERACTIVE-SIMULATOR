# Critical Care Hub: 3D anatomy viewer

Entry-point viewer for the simulators in this repository. Plain HTML, CSS and JavaScript with Three.js r170
(loaded from jsDelivr through an import map, the same way `index.html` loads it). No build step.

## Install on GitHub Pages
Copy these into the repository root, next to the simulator `.html` files:

```
anatomy-hub.html
anatomy/            (viewer.js, body-model.js, modules-data.js, hub.css, README.md)
models/             (optional, for a GLB)
```

Open `https://<user>.github.io/ARDS-INTERACTIVE-SIMULATOR/anatomy-hub.html`.
This does not touch your existing `index.html`. To make the viewer the landing page, back up `index.html`,
then rename `anatomy-hub.html` to `index.html` and change the fallback link inside it if needed.
Pages must be served over http(s); opening the file with `file://` blocks ES modules.

## What it does
- Real WebGL 3D body, head to toe, standing in anatomical position. Procedural, so there is no model download.
- Drag to rotate 360 degrees. Pinch or wheel to zoom. Two-finger drag pans while zoomed. Arrow keys and +/- also work.
- Front, Left (patient's left), Back, Right, Reset, Rotate left/right (45 degree steps, which gives oblique views),
  Zoom in/out, Auto-rotate (pauses on touch, resumes after 3.5 s idle, stops while something is selected).
- Select head, brain, neck, thyroid, chest, heart, lungs, abdomen, liver, stomach, spleen, intestines, kidneys,
  pelvis, arms or legs, by tapping the body or using the chips. The part glows cyan-green and is named.
- Layers: transparent skin, organs, skeleton, vessels.
- Selecting something opens its Learning lab and Practice arena links in the Clinical modules tab.
- Loading indicator, WebGL fallback (the region chips and module list still work), and a CDN-failure message.
- `prefers-reduced-motion` disables auto-rotate, the intro move, scan sweep and pulse ring.

## Editing the module links
Everything is in `anatomy/modules-data.js`. `ROOMS` holds the simulators (copied from the Human Atlas
`index.html`, including its `?v=` cache strings). `SELECTION` says which rooms open for each region or organ.
If the viewer is hosted somewhere other than the simulators, set `CONFIG.LINK_BASE` to the full base URL.

## Using a licensed GLB (optional)
1. Put the file at `models/anatomy-body.glb` (path set by `CONFIG.MODEL_URL`).
2. On load the viewer checks for it. If it exists, it is scaled to 1.9 m, stood on the platform, and used as the
   skin shell with the same hologram shader, so region selection, glow and picking work on it.
   If it is missing or fails, the built-in body is used without an error.
3. The organs, skeleton and vessels stay procedural. They line up best when the GLB is a standing adult in a
   neutral pose with arms slightly away from the body. To use the GLB's own organs, extend `adaptSkinGlb` in
   `body-model.js` (map mesh names to the `organs` entries) and hide `body.organsG`.
4. Optimize before committing: aim for under 150k triangles and under 5 MB. Draco compression is supported.
   `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp` is a good start.

No GLB is bundled. Check the license of any asset yourself before publishing. Sources people commonly use for
anatomy meshes are BodyParts3D (DBCLS) and Z-Anatomy; both were released under Creative Commons Share-Alike
terms the last time I knew of them, which means attribution and sharing derivatives under the same license.
Confirm on the source page. Also confirm the license allows use in a medical education site.

## Future integration points
- `body.organsG`, `body.boneG`, `body.vesselG` are plain groups: swap in organ GLBs or detailed vasculature.
- `body.organs[id]` holds each organ group, glow material and picking anchors; add entries in `makeOrgan`.
- `BAND` in `body-model.js` defines region ranges. `regionAt` maps a hit point to a region.

## Performance notes
Pixel ratio is capped at 2, the body is about 72k triangles (measured), plus the platform and effects, textures are tiny canvas gradients,
and there are no external image or model downloads unless you add a GLB.
