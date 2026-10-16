# Critical Care Human Atlas

The opening screen starts with the **external body** in an interactive Three.js anatomy viewer with a locally bundled **anatomical GLB**. It includes an external body, translucent internal anatomy, and isolated organ examination. The human and organs use source anatomical geometry, not primitive shapes or image projections.

## Run locally or on GitHub Pages

No build, package installation, API key, or model CDN is needed:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Open `http://localhost:3000/`. Serve the complete repository over HTTP(S); ES modules cannot run through `file://`. Relative URLs support GitHub Pages at `/ARDS-INTERACTIVE-SIMULATOR/`. Deploy the repository root, including `vendor/`, `models/`, and `anatomy/`.

## Explore

- Drag with a mouse or one finger to rotate through 360°. Scroll or pinch with two fingers to zoom. Gestures pause automatic rotation.
- Choose **External body** or **Internal anatomy**. With the canvas focused, use **[ / ]** to select an organ and **Isolate organ** to inspect it without entering a room. Changes fade smoothly.
- Tap a visible organ to zoom into the actual 3D organ, then open its full-screen portal room. Choose **Learning Lab** or **Practice Arena** there; Back returns to the portals, then the full body. Keyboard users can select with **[ / ]** and open with **Enter**.
- The 12 groups are brain, spinal cord, lungs, heart, liver, stomach, spleen, pancreas, kidneys, intestines, bladder, and major blood vessels.
- The viewer has no right-side organ panel or **Organs +** tab. If the model cannot load, an organ catalogue appears so clinical rooms remain reachable. Desktop **Organ layer** controls remain available.
- Camera controls reset the view, show the front/back, and toggle automatic rotation. With the canvas focused, arrow keys rotate, +/− zoom, Home resets, and Space toggles rotation.
- **Learning Lab** and **Practice Arena** open the existing clinical rooms. Rooms without a simulator show their availability message. Original audio recordings and sound functions are retained; browser playback starts after interaction.

The HUD retains a subtle scan line and floor grid; decorative scan/targeting circles and Live 3D / Reference headings are removed. Its readouts describe viewer state, not patient measurements. No bottom tabs or bottom-right camera buttons are used.

## Anatomical assets and scope

`models/anatomy/human-reference.glb` is a 4.79 MB, 264,860-triangle assembly derived from **Human Reference Atlas United Male v1.5** (Kristen Browne and Heidi Schlehlein / HuBMAP, Visible Human Male data from NLM), plus the actual **BodyParts3D FJ2564 stomach** (© DBCLS). Both sources are CC BY 4.0. The small **Credits** link opens [a separate page](credits.html) containing required attribution and library details. The stomach is registered into the HRA assembly and identified separately in the model manifest and credits.

This is simplified anatomical reference geometry with warm skin and tissue display colours under neutral lighting. Selection uses a subtle glow in each tissue’s own colour, avoiding a green tint. It is not photorealistically textured, patient-specific, or clinically validated. Some source component surfaces overlap. See [full attribution, sources, licenses and adaptations](models/anatomy/ATTRIBUTION.md) and the [conversion manifest](models/anatomy/model-manifest.json).

## Files and dependencies

| File | Purpose |
| --- | --- |
| `index.html` | Complete entry page, HUD markup, existing clinical rooms and audio |
| `body3d.js` | GLTFLoader, camera, mode transitions, mesh picking, visibility and error states |
| `anatomy/explorer-data.js` | Model configuration, required organ IDs, descriptions and room mapping |
| `anatomy/explorer.css` | Responsive dark green/cyan HUD and reduced-motion styling |
| `models/anatomy/` | Bundled GLB, provenance and attribution |
| `vendor/three/` | Three.js **r170 / 0.170.0**, GLTFLoader, OrbitControls, BufferGeometryUtils; MIT license included |
| `scripts/build-anatomy-model.mjs` | Optional source-asset conversion; not required to run the site |

The 3D runtime and model load locally. Optional Google Fonts is the only visual CDN dependency; system fonts work without it. WebGL 2 and ES module/import-map support are required (including modern mobile Safari). The viewer caps pixel ratio at 1.5 and rendering at 30 fps, renders stationary views only when changed, and pauses in hidden tabs/clinical rooms. No real-device Safari performance result is implied.

### Loading and failure behavior

The loader streams the local GLB with progress, a 12 MiB download limit and a 45-second fetch timeout. It verifies the skin, all required organ groups and metre-scale body dimensions before declaring anatomy loaded. If the GLB is missing/malformed, WebGL fails, or the library cannot load, a clear message appears. **No substitute body, silhouette, image or procedural anatomy is displayed.** Retry is available for model/GPU failure. Organ information and clinical links remain usable when the module initializes but the GPU/model fails.

To replace the asset, update `MODEL` in `anatomy/explorer-data.js` and provide a metre-scale GLB with a mesh named `body` carrying `extras.anatomyId: "body"`; each organ mesh must carry its matching `anatomyId` from the catalogue. Multiple meshes can share one organ ID. Eye meshes may use `eyes`, `irises`, `pupils`. Keep provenance and credits current.

## Optional model rebuild

Use Node.js and install conversion-only tools in a separate directory:

```sh
mkdir -p /tmp/anatomy-tools
npm install --prefix /tmp/anatomy-tools @gltf-transform/core@4.2.1 meshoptimizer@0.22.0 gl-matrix@3.4.3
```

Download the [original HRA GLB](https://cdn.humanatlas.io/digital-objects/ref-organ/united-male/v1.5/assets/3d-vh-m-united.glb), and `public/models/atlas.json` plus `public/models/body-9.bin` from the [BodyParts3D browser geometry intermediary](https://github.com/ashemag/human-atlas). Then run:

```sh
ANATOMY_TOOLS_ROOT=/tmp/anatomy-tools node scripts/build-anatomy-model.mjs \
  /path/to/3d-vh-m-united.glb /path/to/atlas.json /path/to/body-9.bin \
  models/anatomy/human-reference.glb
```

The script bakes source transforms, groups anatomical surfaces, simplifies with a 0.3% relative error bound, and writes the GLB and provenance manifest. Conversion tools are not browser dependencies. Review attribution when modifying/replacing source assets.

The separate legacy `anatomy-hub.html` viewer is documented in [anatomy/README.md](anatomy/README.md). Its older model/procedural modules and reference crops are not used by the opening screen.
