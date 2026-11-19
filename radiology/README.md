# Radiology Lab

Open `radiology.html`. It is reached from the fourth door (behind you) in the hall.

## What it is

A dependency-free, dark-theme image workstation plus a case engine. Four modules: chest X-ray (including lines and tubes), CT, MRI, ultrasound. 60 cases, 8 of them real cine loops.

Each case has a presentation, a marking task graded against stored ground-truth regions, a reveal (findings, interpretation, differential, why it matters, ICU management) and a short question. Progress is kept in the browser only.

Viewer tools: pan, zoom, window/level (8-bit), invert, measure (pixels, uncalibrated), arrow, circle, point, undo, clear, side-by-side compare, full screen, pinch on touch screens.

## Real data in the lab

Credits, licences and the changes made are in [CREDITS.md](CREDITS.md), on `radiology-credits.html`, and under each case.

- **CT cine (2 cases).** One real chest CT, 135 slices, from the TCIA ACRIN-NSCLC-FDG-PET collection (CC BY 3.0), shown as a scroll in a lung window and in a mediastinal window. It comes from a lung cancer trial. It has not been read for this lab, so the teaching is about scrolling, windows and anatomy, not a diagnosis.
- **MRI cine (3 cases).** The MNI ICBM152 2009a normal T1 template, scrolled in the axial, coronal and sagittal planes. It is an average of many normal adults, so it is smooth and is an anatomy reference, not a patient. Its licence is a permissive copyright notice, not Creative Commons.
- **Ultrasound cine (3 cases).** Lung ultrasound clips from open-access papers (CC BY 4.0 and CC BY 2.0): B-lines, subpleural consolidation, white lung. The clips are cropped and curated by [jannisborn/covid19_ultrasound](https://github.com/jannisborn/covid19_ultrasound). Only clips with a named paper, DOI and licence were used.
- **Chest X-ray reference (all 14 cases).** One real adult PA film reported as no finding (Hannover Medical School, CC BY 3.0), shown through Compare.

`radiology/tools/build-media.py` rebuilds every file in `radiology/media/` from the original sources. Only display changes are made: crop, window, scale, re-encode.

## What it is not (yet)

- **No DICOM.** Still images are JPEG or PNG teaching images already in this repo (`xrays/`, `cts/`, `mris/`, `scans/`) with no DICOM header and no Hounsfield data. The CT and MRI cine are 8-bit video, so the W/L tool changes display contrast only and there is no MPR.
- **Cine exists for 8 cases only.** The pathology cases in CT and MRI are still single images. No licensed CT or MR volume with these pathologies (haemorrhage, infarct, abscess, PE) was found, so they stay as stills and say so.
- **Ultrasound outside the lung is still illustrations.** Effusion, M-mode, echo views, IVC, FAST, gallbladder, kidney, bladder, DVT and optic nerve (`pocus/`, `echo/`) are stylised drawings labelled ILLUSTRATION. No licensed real cine for them was found. A normal lung (A-lines, sliding) cine was not added because no candidate clip had a named paper and licence.
- **Normal references.** Chest X-ray cases show the real PA reference (an erect PA film, so heart size and vessels differ from portable AP films). Brain CT and a few ultrasound pairs still use their older references. Chest and abdomen CT, MRI sequences and most ultrasound cases show a "not yet added" panel, and nothing is generated to fill it. A sequence-matched normal MRI and a normal chest CT with a licence were not found.
- **Provenance and licence of the older still images are unverified.** Record each source and licence before public release. Some carry the source's own arrows and labels.
- All teaching text is a first draft and needs clinical review.

## Case format

`cases-*.js` call `RAD.add([...])`. Key fields: `id`, `mod` (cxr, ct, mri, us), `grp`, `t`, `img`, `kind` (image, stack, cine, dicom), `view`, `hx`, `task`, `reg` (regions `[cx, cy, rx, ry, label]` as fractions of image width and height), `cmp` (reference image, `{src, cap, sourceTag, cr}`), `fps` and `unit` (cine frame rate and counter label), `sourceTag` (`{tag, chip, real, text}`) and `cr` (ids into `credits.js`), `panels` (crop rectangles for a multi-panel figure), `choice` (a question instead of marking), `find`, `rep`, `ddx`, `sig`, `icu`, `q`.

## Getting to real DICOM

1. Pick sources with redistribution rights (TCIA, MIMIC-CXR, OpenNeuro, licensed Radiopaedia or POCUS cases) and record licence, consent and attribution per case.
2. Anonymise and convert. Cine to webm or mp4. CT or MR to ordered frames or, for DICOM, a Cornerstone3D volume.
3. Host the large files outside the HTML. GitHub Pages can serve the viewer and small series, but its size limits make object storage (S3, R2) with a CDN the better home for bulk DICOM. A backend (Orthanc, DICOMweb) is needed only for access control, audit or a large archive.
4. Add a Cornerstone3D renderer behind `kind: "dicom"` in `viewer.js` and keep the case engine unchanged.
