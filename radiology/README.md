# Radiology Lab

Open `radiology.html`. It is reached from the fourth door (behind you) in the hall.

## What it is

A dependency-free, dark-theme image workstation plus a case engine. Four modules: chest X-ray (including lines and tubes), CT, MRI, ultrasound. 54 cases.

Each case has a presentation, a marking task graded against stored ground-truth regions, a reveal (findings, interpretation, differential, why it matters, ICU management) and a short question. Progress is kept in the browser only.

Viewer tools: pan, zoom, window/level (8-bit), invert, measure (pixels, uncalibrated), arrow, circle, point, undo, clear, side-by-side compare, full screen, pinch on touch screens.

## What it is not (yet)

- **No DICOM.** The images are JPEG or PNG teaching images already in this repo (`xrays/`, `cts/`, `mris/`, `scans/`). They have no DICOM header, no Hounsfield data and no calibration. The W/L tool changes display contrast only.
- **No CT or MR stacks, no MPR.** The viewer supports `kind: "stack"` (ordered frames, wheel to scroll), but no stack has been added.
- **No cine.** The viewer supports `kind: "cine"` (webm or mp4 with frame step, 0.25x and 0.5x, loop), but no loop has been added. Ultrasound cases are still frames and say so.
- **The ultrasound and echo images (`pocus/`, `echo/`) are stylised illustrations**, not clinical scans (perfectly round vessels, schematic chambers). The viewer labels them ILLUSTRATION. Replace them with real, licensed loops.
- **Normal references** exist for brain CT and a few ultrasound pairs only. Cases without one show an honest "not yet added" panel.
- **Provenance and licence of every image are unverified.** Record each source and licence before public release. Some images carry the source's own arrows and labels.
- All teaching text is a first draft and needs clinical review.

## Case format

`cases-*.js` call `RAD.add([...])`. Key fields: `id`, `mod` (cxr, ct, mri, us), `grp`, `t`, `img`, `kind` (image, stack, cine, dicom), `view`, `hx`, `task`, `reg` (regions `[cx, cy, rx, ry, label]` as fractions of image width and height), `cmp` (reference image), `panels` (crop rectangles for a multi-panel figure), `choice` (a question instead of marking), `find`, `rep`, `ddx`, `sig`, `icu`, `q`.

## Getting to real DICOM

1. Pick sources with redistribution rights (TCIA, MIMIC-CXR, OpenNeuro, licensed Radiopaedia or POCUS cases) and record licence, consent and attribution per case.
2. Anonymise and convert. Cine to webm or mp4. CT or MR to ordered frames or, for DICOM, a Cornerstone3D volume.
3. Host the large files outside the HTML. GitHub Pages can serve the viewer and small series, but its size limits make object storage (S3, R2) with a CDN the better home for bulk DICOM. A backend (Orthanc, DICOMweb) is needed only for access control, audit or a large archive.
4. Add a Cornerstone3D renderer behind `kind: "dicom"` in `viewer.js` and keep the case engine unchanged.
