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
- Edit pins in cc/src/marks_src.py and regenerate: `cd cc/src && python3 marks_src.py ../../sepsis/marks.json`. Cache-bust string is 20261119f.
