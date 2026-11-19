# Complication engine

One JSON database (`db.json`) drives a generic map (`map.html?d=<disease>`) and a generic 3D lab (`lab.html?d=<disease>&c=<complication>`).
Edit the Python sources in `src/` and run `python3 build_db.py ../db.json` from `src/` to rebuild and validate the database.

## Photoreal specimens (Pathology Live)

Each complication opens on a photoreal specimen. The interactive model with stages, drugs and outputs is one tap away ("Interactive model").

* `pathology-models.json` holds one entry per complication. The id is `<disease>-<complication>` and must match `db.json`. The DKA labs use `../dka/pathology-models.json`.
* An entry gives the organ, the healthy and diseased textures, a reversibility share, the text for the Organ, Cut surface and Cells views, and the tap-to-inspect wording (`picks`). `glb` points to a .glb file that replaces the gross model (add `glbRot` in degrees if it needs turning). The cell scene stays. Real BodyParts3D meshes in `../models/organs/` are used for lung, kidney, heart, liver, brain, pancreas, bowel, muscle and skin; see `../models/README.md` for the source and licence (CC BY-SA 2.1 JP).
* Organs: lung, kidney, heart, liver, brain and vessel live in `../sepsis/path-stage.js`. `path-extra.js` adds pancreas, muscle, skin, bowel and bleed through `PathStage.register(name, {gross, cells, apply})`. A new organ is one more `register` call. A new complication that reuses an organ is one more JSON entry and no code.
* `specimen.js` connects the viewer to a lab page. Severity follows the engine: drugs and the severity slider change the specimen.
* Surface markers (fat necrosis plaques, purpura, petechiae) are re-seated on the real mesh surface. Vessel and bleed models have no mesh and stay procedural.
* Textures in `tex/` are generated procedurally from the existing healthy photographs. They are not clinical photographs. Replace a file with a real, licensed image of the same name to upgrade it. No code change is needed.
* The teaching text is original and needs clinical review.

## Pins, Normal/Diseased and offline 3D

* `../sepsis/marks.json` holds the labelled pins. It is generated: edit `src/marks_src.py`, then run `python3 marks_src.py ../../sepsis/marks.json` from `src/`. `spec.<id>` lists the lesion pins for one complication and `organ.<organ>` lists the normal-anatomy pins shared by that organ. A pin has `kind` (lesion or part), `view` (organ, cut, cells), `label`, `title`, `body` and `care`, plus a position: `dir` (organ view, a direction ray onto the surface), `cut` (right, up on the cut face), `part` (the tap title of a scene object, in the cell view or on a tagged organ part) or `at` (x, y, z).
* Lesion pins fade in as severity rises and are hidden in the Normal state. Tapping a pin opens its text and flies the camera to it. The "Pins" button toggles them and "Reset" returns the camera.
* The Normal and Diseased buttons set the severity the specimen shows. Play runs the progression.
* Three.js r128 and its GLTFLoader are copied into `../vendor/three128/`, so the 3D labs no longer depend on a CDN. The pages keep working when the network blocks `cdnjs`.
* The pin text is original teaching material and needs clinical review.

## Nephrology-style lab shell (all 47 complication labs)
Every 3D lab (cc/lab.html, sepsis/lab-*.html except lab-shock, dka/lab-*.html) uses one layout: a single large stage with a
live readout (HUD), a severity thermometer, view chips (Organ / Cut-away / Cells) and four tabs: Explore, Output, Drugs, Disease.
- `Specimen.init({leader:true, ...})` mounts PathStage with leader-line labels; `stage.pins()` lists labels and `stage.focus(i)` flies to one.
- cc/lab.html has the shell built in. Sepsis labs call `LabShell.attach({stage, views, names, go})` (sepsis/lab-shell.js), which rearranges the
  existing page so each lab's own script keeps working. DKA labs share the cc/lab.html template.
- Cut-away is a real cross-section: GLB meshes are sliced at plane `x = entry.cutX` and the loops are triangulated into a cap (`buildCap`).
  The lung is cut through the right lung (`cutX = -0.6`). Cut pins use `cut:[u,v]` as fractions of the cap bounding box (x1.6).
- Procedural organs (vessel, bleed, pancreas, bowel, muscle, skin) still use the simple disc cut and have organ and cell pins only.
- Edit pins in cc/src/marks_src.py and regenerate: `cd cc/src && python3 marks_src.py ../../sepsis/marks.json`. Cache-bust string is 20261119h.

## Flow model: particle key and voice-over (cc/flow-aid.js)
`FlowAid.mount({stage, key, intro, state, stages, outro})` adds three buttons to the flow-model stage: **Key** (a panel that names every coloured particle and shape), **Explain flow** (a male voice-over that walks through the scene, the key rows, the current readings, each camera stage and the drugs) and **Voice on/off**.
- cc/lab.html: each archetype in `AR.*` returns `key` (rows of `[css colour, "Red dots", "meaning", optional shape class]`) and `say` (one-line scene description). Cell scenes build the key from the scene colours and `scene.kn` in db.json (meanings of inside, outside, leak and toxin particles for that complication). Keep `key` in step with any new particle set.
- DKA labs (dka/lab-*.html) and sepsis/lab-shock.html pass their own `key` rows to the same mount call.
- `FlowAid.vo(text, queue)` speaks on a standalone page; inside Pathology Live it posts `{vo, q}` to the parent, which owns the voice. `{stopvo:1}` cancels it.
- sepsis/lab-shock.html now uses the same shell as the DKA labs (Specimen key `shock`, with fluid slider in the Drugs tab). Cache-bust string is 20261119h.

## Disease-level labs ("<Disease> itself")
Every disease tab in Pathology Live also has a lab for the disease itself: a photoreal specimen (Organ / Cut-away / Cells, Normal and Diseased) plus the interactive 3D model.
- Open it by tapping the centre circle of the disease map, or the "<Disease> itself" button under the map. `cc/lab.html?d=<disease>&c=main`. Sepsis uses `sepsis/lab-main.html` (a redirect to the same page). DKA/HHS keeps `dka/lab-meta.html` as its disease-level lab.
- Data: `cc/src/d6.py` holds `MAIN` (one `main` record per disease, built with `comp("main", ...)`), `MODELS` (specimen entries `<disease>-main`) and `KN` (cell-particle meanings). `build_db.py` attaches `d['main']`; `gen_models.py` rewrites `cc/pathology-models.json`; `marks_main.py` adds the pins to `sepsis/marks.json` (regenerate with `cd cc/src && python3 marks_src.py ../../sepsis/marks.json`).
- Specimens reuse the existing organ models and textures with disease-specific text and pins. The clinical wording needs specialist review.
- To add a disease: add a `MAIN` entry, a `MODELS` entry, marks in `marks_main.py`, and `["main","<Disease> itself"]` in `MODS` in `pathology-live.html`.

### Sepsis itself (cc/path-sepsis.js)
Sepsis does not use an organ or a tissue block. `organ: "septic"` is a purpose-built plugin with three photoreal 3D scenes, picked with the view buttons:
- **Pathogen-host** (`organ`): Gram-negative rods and Gram-positive cocci on an epithelial barrier, complement coat, macrophage with TLR4 receptors, neutrophils leaving a venule, NETs, bacteraemia.
- **Cytokine storm** (`storm`): a cut-open venule with TNF-alpha, IL-1 beta, IL-6, IL-8 and IL-10 clouds, activated endothelium, glycocalyx loss, plasma leak, micro clots.
- **Immune dysregulation** (`cells`): hyperinflammation against immune paralysis (exhausted T cell with PD-1, low HLA-DR monocyte, apoptotic lymphocytes) with a balance beam.
Severity drives all three. Custom view ids need `still`, `cam` and `dist` per view in the spec (see `d6.py`); `nav` gives the button label. Pins use `part` titles from the scene.
