"""Rebuilds the real-data media used by the Radiology Lab from the original sources.
Sources and licences are listed in radiology/CREDITS.md. Needs: numpy, opencv-python, pydicom, pyjpegls, nibabel, ffmpeg.
Usage: python3 build-media.py <acrin_dicom_dir> <mni_t1.nii.gz> <covid19_ultrasound/data/pocus_videos> <cxr.jpg> <out_dir>
Only display changes are made: cropping, windowing to 8 bit, scaling, re-encoding. No pixel content is added or painted."""
import sys, os, glob, subprocess, shutil, tempfile
import numpy as np, cv2, pydicom, nibabel as nib

acrin, mni, usdir, cxr, out = sys.argv[1:6]
os.makedirs(out, exist_ok=True)

def encode(frames, name, fps, crf=30):
    d = tempfile.mkdtemp()
    for i, f in enumerate(frames):
        cv2.imwrite(os.path.join(d, "%04d.png" % i), f)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(d, "%04d.png"),
                    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", str(crf), "-pix_fmt", "yuv420p", "-an", os.path.join(out, name)], check=True)
    shutil.rmtree(d)

def win(a, l, w):
    return (np.clip((a - (l - w / 2)) / w, 0, 1) * 255).astype(np.uint8)

# 1. CT chest (ACRIN-NSCLC-FDG-PET, CC BY 3.0). Series "CT IMAGES", 135 axial slices, inferior to superior.
S = []
for f in glob.glob(os.path.join(acrin, "*.dcm")):
    d = pydicom.dcmread(f)
    if d.get("Modality") == "CT" and d.get("SeriesDescription") == "CT IMAGES" and d.Rows == 512:
        S.append((float(d.ImagePositionPatient[2]), d.pixel_array.astype(np.float32) * float(d.RescaleSlope) + float(d.RescaleIntercept)))
S.sort(key=lambda t: t[0])
for name, l, w in (("ct-chest-lung.webm", -600, 1500), ("ct-chest-mediastinum.webm", 40, 400)):
    fr = [cv2.resize(win(a, l, w)[20:400, 20:492], None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC) for _, a in S]
    encode(fr, name, 12, 27)

# 2. MNI ICBM152 2009a nonlinear symmetric T1 template (average of normal adults). Radiological display: patient right on image left.
v = nib.load(mni).get_fdata().astype(np.float32)          # axes R, A, S
def ax(k):  return np.flipud(v[:, :, k].T)[:, ::-1]
def cor(k): return np.flipud(v[:, k, :].T)[:, ::-1]
def sag(k): return np.flipud(v[k, :, :].T)[:, ::-1]   # anterior on the left
def prep(a, sc=3): return cv2.resize(np.clip(a, 0, 255).astype(np.uint8), None, fx=sc / 1.5, fy=sc / 1.5, interpolation=cv2.INTER_CUBIC)
encode([prep(ax(k)) for k in range(20, 175)], "mri-t1-axial.webm", 15, 24)
encode([prep(cor(k)) for k in range(25, 205)], "mri-t1-coronal.webm", 15, 24)
encode([prep(sag(k)) for k in range(30, 168)], "mri-t1-sagittal.webm", 15, 24)

# 3. Lung ultrasound clips (CC BY, each cropped by the dataset authors). Re-encoded only.
for src, name, fps in (("convex/Cov_convex_volpecelli_sonographic_v5.mov", "us-blines-covid.webm", 39),
                       ("linear/Pneu_prospective_file3.mp4", "us-pneumonia-linear.webm", 25),
                       ("convex/Vir_whitelung_h1n1.mp4", "us-whitelung-h1n1.webm", 25)):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(usdir, src), "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "33",
                    "-pix_fmt", "yuv420p", "-r", str(fps), os.path.join(out, name)], check=True)

# 4. Normal PA chest radiograph (COVID-19 image repository, CC BY 3.0). Scaled to 1400 px.
im = cv2.imread(cxr, 0)
cv2.imwrite(os.path.join(out, "cxr-normal-pa.jpg"), cv2.resize(im, (1400, 1400), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
