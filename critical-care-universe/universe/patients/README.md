# Ward patients (real 3D human bodies)

Six archetypes (`m28 m48 m68 f28 f48 f68`), one rigged GLB each (~0.6 MB, 14.5k verts, 38 bones).
The ward picks one from each patient's age/sex (`patientFile()` in `../patient3d.js`) and loads it lazily the first
time the ward is shown. If a GLB fails to load, the procedural patient stays in the bed.

## Source and licence
Generated headlessly with **MakeHuman 1.x** by `../tools/make_patient.py`. MakeHuman's exported models are CC0
(public domain). The MakeHuman *program* is AGPL; it is not shipped here, only its output.
Skin shading, hair, eyelids and the gown tint are added in Three.js (`patient3d.js`).

Regenerate (from MakeHuman's `makehuman/` folder):
`python make_patient.py m48.glb 1 48 0.5 0.5 0.5 0.1 0.1 0.8`
(args: gender 0..1, age years, weight, muscle, height, african, asian, caucasian)

## Using MetaHuman or Character Creator instead
Those need Unreal Engine / Reallusion desktop apps and their own licences, so they can't be generated here.
To swap in an export: prepare it in Blender, export a **GLB** with one skinned mesh, T-pose, Y up, facing +Z, metres,
materials named `skin` (and optionally `gown`), and these bone names (dots allowed): `root, spine05, spine03, neck01,
head, clavicle.L/R, upperarm01.L/R, lowerarm01.L/R, wrist.L/R, upperleg01.L/R, eye.L/R`. Keep the file under ~1 MB
(decimate to ~15k tris, 1k textures or none) so six patients load quickly on a phone. Drop it in this folder under the
archetype name.
