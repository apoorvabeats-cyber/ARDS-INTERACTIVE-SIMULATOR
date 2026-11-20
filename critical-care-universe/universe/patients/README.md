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

## Bed and 3D bed view
`../icu-bed.js` builds the ICU bed (chassis, columns, casters, split side rails with control pads, mattress, pillow, sheet) as
separate groups tagged `userData.part`. In the bed screen, "3D view" lets you orbit, zoom and tap a part to select it
(patient, bed frame, mattress, side rails, pillow, bedding, ventilator, monitor, IV pole and pumps, circuit, airway).
The body is seated from the pelvis joint, arms are aimed with `aim()` in `../patient3d.js`, skin pores and blotches come
from a shader (no UVs needed), and hospital shorts are a skinned copy of the pelvis triangles.
A photoreal MetaHuman / Character Creator GLB prepared as described above drops in without code changes.

## Male patient body (male_ref.glb)
All male patients use `male_ref.glb`, the Human Reference Atlas "Visible Human Male" skin from `models/anatomy/human-reference.glb`
(Kristen Browne and Heidi Schlehlein / HuBMAP, **CC BY 4.0**), rigged and given a hospital top and shorts by `../../../tools/rig_reference.py`
(bone-distance skin weights, same bone names as the MakeHuman bodies, about 1.8 MB, 1.72 m). Females still use the MakeHuman archetypes.
Re-run: `python3 tools/rig_reference.py models/anatomy/human-reference.glb critical-care-universe/universe/patients/male_ref.glb`
