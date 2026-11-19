# Organ meshes

`organs/*.glb` are real anatomical meshes used by the Pathology Live specimen viewer (`sepsis/path-stage.js`). The viewer swaps their material for the tissue shader, so Normal, Diseased, Play and the cut plane work on them.

## Source and licence

Derived from **BodyParts3D**, © 2008 Life Science Integrated Database Center (DBCLS), licensed under [Creative Commons Attribution-Share Alike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en). The original STL files are in the public repository `Kevin-Mattheus-Moerman/BodyParts3D`.

What was changed: parts were merged, converted to glTF binary, rotated to y-up, centred, scaled to a common size and decimated (lung 42k, heart 40k, bowel 40k, brain 60k, liver 19k, kidney 12k, pancreas 11k, muscle 22k, skin 9k faces). The skin model is a cropped lower-leg segment. The brain is assembled from the cortical gyri parts plus the cerebellum, so deep structures are absent.

These adapted files are shared under the same licence (CC BY-SA 2.1 JP). The viewer shows the credit line when a mesh is on screen.

| File | BodyParts3D parts |
|---|---|
| lung.glb | FMA7333, FMA7383, FMA7337, FMA7370, FMA7371 (five lobes) |
| kidney.glb | FMA7204 (right kidney) |
| heart.glb | FMA7274 (wall of heart) |
| liver.glb | FMA7197 |
| pancreas.glb | FMA7198nsn |
| bowel.glb | FMA7206, FMA7207, FMA7208 (duodenum, jejunum, ileum) |
| muscle.glb | FMA45957 (medial head of right gastrocnemius) |
| skin.glb | FMA7163, right leg, cropped |
| brain.glb | cortical gyri parts and FMA67944 (cerebellum) |

## Using your own mesh

Set `glb` in the complication's JSON entry to a .glb path (relative to the page). Add `glbRot: [x, y, z]` in degrees if it needs turning. The mesh is centred and scaled automatically. No code change is needed.
