# Anatomical model credits and scope

## Primary source — Human Reference Atlas

Kristen Browne and Heidi Schlehlein, **3D Reference Organ Set for United, Male, v1.5** (2023), published by HuBMAP. Created using Visible Human Male data provided by the US National Library of Medicine.

- DOI: https://doi.org/10.48539/HBM646.RKKC.257
- Library: https://humanatlas.io/3d-reference-library
- Original GLB: https://cdn.humanatlas.io/digital-objects/ref-organ/united-male/v1.5/assets/3d-vh-m-united.glb
- Authoritative credits/license: https://cdn.humanatlas.io/digital-objects/ref-organ/united-male/v1.5/README.md
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)

Adaptations: selected skin, eye surfaces, brain, spinal-cord segments, lung lobes, cardiac structures, liver, pancreas, spleen, kidneys, intestines, bladder and major vessels; baked source transforms; moved the feet onto y=0; welded duplicate vertices; simplified with meshoptimizer (0.3% relative error bound); grouped surfaces by selectable organ; applied display colors. No primitive geometry substitutes for these structures. Source node names and conversion statistics are retained in `model-manifest.json` and GLB node extras.

The HRA is a reference assembly, not a scan of one person's complete anatomy. Its brain and other components incorporate reference sources curated by HRA. Some structures overlap (for example capsule and organ segments), and this subset does not include every anatomical structure.

## Stomach — BodyParts3D

**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International**.

- Source geometry: BodyParts3D 4.0, FJ2564 / FMA7148 (Stomach).
- Official license (updated 2025-02-27): https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Dataset: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Publication: https://doi.org/10.1093/nar/gkn613
- Browser geometry intermediary: https://github.com/ashemag/human-atlas (`public/models/atlas.json` and `body-9.bin`). The intermediary's packed anatomy data is CC BY 4.0; its application code was not incorporated.

HRA United Male v1.5 does not include a stomach surface. The actual BodyParts3D stomach mesh fills this gap. It was scaled by the reference-body height ratio and translated upward 35 mm to register with this assembly. This is an educational composite registration, not a patient-specific alignment or a validated surgical model. It is identified separately in the viewer's organ information and model manifest.

## Library dependencies

Three.js **0.170.0**, GLTFLoader, OrbitControls and BufferGeometryUtils are bundled under `vendor/three/` under the MIT license (see `vendor/three/LICENSE`). These run locally on GitHub Pages; the anatomy does not depend on a model CDN at runtime. Optional Google Fonts can fail without preventing the viewer from working.

The existing `models/body.glb` (MakeHuman-derived shell) and procedural viewers are not used by the new opening-screen viewer.
