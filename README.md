# Critical Care Human Atlas

The opening screen (`index.html`) is an interactive 360° anatomy model. Drag to turn it, pinch or scroll to zoom, or use the Front, Back, Auto-rotate and Reset controls. Select an organ on the model or in the organ menu to enter its Learning Lab or Practice Arena.

## Run locally

No build or package installation is required. From the repository root:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Open `http://localhost:3000/`. Serve over HTTP(S); ES modules do not work over `file://`. Three.js r170 and OrbitControls use the existing jsDelivr import map, so the 3D view needs access to that CDN.

## Opening screen files

- `body3d.js`: camera, mesh picking, neutral arm pose, rotation, zoom and transitions into the existing rooms.
- `anatomy/scan-room.css` and `anatomy/scan-structure.js`: reference-inspired scan-room layout, skeleton/vessels, illuminated platform and scan cage.
- `assets/*-scan.webp`, `assets/system-scans.webp`, `assets/anatomy-surface.webp`: crops of the user-supplied reference for surrounding illustrations and projected skin detail. Graphs are decorative anatomical illustrations, not patient measurements.
- `models/body.glb`: bundled human shell (asset metadata identifies the MakeHuman base/rig as CC0).
- `anatomy/atlas-organs.js`: volumetric schematic organ meshes aligned to the bundled body, including posterior kidneys. These are teaching illustrations, not diagnostic or patient-specific anatomy.
- `index.html`: room/module links, responsive controls and the existing audio implementation and recordings.

Arrow keys rotate the focused canvas, +/− zoom, and Home restores the front view. Automatic rotation starts paused when reduced motion is requested. Dragging or pinching pauses rotation and does not select an organ.

If the body asset fails, a procedural shell remains visible. If WebGL or the CDN is unavailable, the picture and organ menu still open the rooms. Some rooms have no dedicated simulator yet; their existing availability messages appear in the portals.

The separate `anatomy-hub.html` viewer is documented in [anatomy/README.md](anatomy/README.md).
