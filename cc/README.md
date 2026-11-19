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
