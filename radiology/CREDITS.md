# Radiology Lab credits

Real images and cine loops in the Radiology Lab. Images not listed here are teaching images or illustrations whose source is still to be recorded. The files in `radiology/media/` are rebuilt from these sources by `radiology/tools/build-media.py`.

## Chest CT scroll (lung and mediastinal windows)

- Authors: Kinahan P, Muzi M, Bialecki B, Herman B, Coombs L (2019)
- Source: Data from the ACRIN 6668 Trial NSCLC-FDG-PET (Version 2). The Cancer Imaging Archive. https://doi.org/10.7937/tcia.2019.30ilqfcl
- Licence: CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)
- Obtained via: One anonymised study, copied from the OHIF viewer-testdata repository (github.com/OHIF/viewer-testdata, folder dcm/acrin).
- Changes: Only the CT series "CT IMAGES" (135 axial slices) is used. Cropped, converted to 8 bit with a lung window (centre -600, width 1500) and a mediastinal window (centre 40, width 400), enlarged 2x and encoded as VP9 video. PET, segmentation and scout images are not used.
- Also cite: Clark K, et al. The Cancer Imaging Archive (TCIA): maintaining and operating a public information repository. J Digit Imaging 2013;26:1045-1057.

## Normal brain T1 scroll (axial, coronal, sagittal)

- Authors: Fonov VS, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL, and the Brain Development Cooperative Group
- Source: ICBM 152 nonlinear symmetric 2009a T1-weighted template, 1 mm. Fonov et al., NeuroImage 54(1), 2011 (doi 10.1016/j.neuroimage.2010.07.033). Fonov et al., NeuroImage 47(Suppl 1), 2009, p. S102. https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009
- Licence: Copyright (C) 1993-2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Permission to use, copy, modify and distribute for any purpose without fee, provided this notice appears.. A permissive licence, not a Creative Commons one.
- Obtained via: File mni_icbm152_t1_tal_nlin_sym_09a_converted.nii.gz, shipped inside the nilearn 0.14.1 Python package.
- Changes: Slices exported in three planes, shown in radiological convention, enlarged and encoded as VP9 video. This is an average of many normal adults, so it is smooth. It is an anatomy reference, not one person's scan, and not a pathology case.

## Lung ultrasound, B-lines and pleural thickening

- Authors: Volpicelli G, Gargani L (2020)
- Source: Sonographic signs and patterns of COVID-19 pneumonia. The Ultrasound Journal 12, article 22. https://doi.org/10.1186/s13089-020-00171-w
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
- Obtained via: Clip as cropped by the curators of github.com/jannisborn/covid19_ultrasound (file Cov_convex_volpecelli_sonographic_v5).
- Changes: Re-encoded as VP9 video. No image content was altered by this lab. The curators' crop removed on-screen text.

## Lung ultrasound, subpleural consolidation (linear probe)

- Authors: Tsung JW, Kessler DO, Shah VP (2012)
- Source: Prospective application of clinician-performed lung ultrasonography during the 2009 H1N1 influenza A pandemic: distinguishing viral from bacterial pneumonia. Critical Ultrasound Journal 4:16. https://doi.org/10.1186/2036-7902-4-16
- Licence: CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/)
- Obtained via: Clip as cropped by the curators of github.com/jannisborn/covid19_ultrasound (file Pneu_prospective_file3).
- Changes: Re-encoded as VP9 video. No image content was altered by this lab.

## Lung ultrasound, "white lung" in H1N1 pneumonia

- Authors: Testa A, Soldati G, Copetti R, Giannuzzi R, Portale G, Gentiloni-Silveri N (2012)
- Source: Early recognition of the 2009 pandemic influenza A (H1N1) pneumonia by chest ultrasound. Critical Care 16:R30. https://doi.org/10.1186/cc11201
- Licence: CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/)
- Obtained via: Clip as cropped by the curators of github.com/jannisborn/covid19_ultrasound (file Vir_whitelung_h1n1).
- Changes: Re-encoded as VP9 video. No image content was altered by this lab.

## Reference chest radiograph, PA, reported as no finding

- Authors: Institute for Diagnostic and Interventional Radiology, Hannover Medical School (Winther H et al.)
- Source: COVID-19 image repository, image id ada8c494. Figshare dataset doi 10.6084/m9.figshare.12275009. https://github.com/ml-workgroup/covid-19-image-repository
- Licence: CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). A PA erect film is shown beside AP and portable films. Projection changes heart size and vessel pattern.
- Obtained via: Located through the metadata of github.com/ieee8023/covid-chestxray-dataset, which lists this image as PA, finding "No Finding", licence CC BY 3.0.
- Changes: Scaled to 1400 px and saved as JPEG. The label "no finding" comes from the source dataset. This lab has not read the film and it is a single example, so it may show age-related change.

