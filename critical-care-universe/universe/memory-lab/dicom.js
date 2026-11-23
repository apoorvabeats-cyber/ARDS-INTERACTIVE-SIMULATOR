/* CRITICAL CARE HUB · MEMORY LAB — DICOM reader.
   Runs entirely in the browser. It reads a DICOM file, renders the pixels to an 8-bit picture and DISCARDS every header tag
   (patient name, ID, dates, institution and so on are never copied, shown or stored). Nothing is uploaded.
   Supported: uncompressed (implicit/explicit little endian, explicit big endian, deflated), RLE lossless, JPEG baseline (8-bit),
   mono and RGB/YBR, multi-frame, and multi-file stacks. Not supported (a clear message is shown): JPEG lossless, JPEG-LS, JPEG 2000, video, waveforms. */

export const TS = {
  IMPL: "1.2.840.10008.1.2", EXPL: "1.2.840.10008.1.2.1", DEFL: "1.2.840.10008.1.2.1.99", BE: "1.2.840.10008.1.2.2",
  RLE: "1.2.840.10008.1.2.5", JPEG_BASE: "1.2.840.10008.1.2.4.50",
};
const TS_NAME = {
  "1.2.840.10008.1.2.4.51": "JPEG extended (12-bit)", "1.2.840.10008.1.2.4.57": "JPEG lossless", "1.2.840.10008.1.2.4.70": "JPEG lossless",
  "1.2.840.10008.1.2.4.80": "JPEG-LS", "1.2.840.10008.1.2.4.81": "JPEG-LS", "1.2.840.10008.1.2.4.90": "JPEG 2000", "1.2.840.10008.1.2.4.91": "JPEG 2000",
  "1.2.840.10008.1.2.4.92": "JPEG 2000", "1.2.840.10008.1.2.4.93": "JPEG 2000", "1.2.840.10008.1.2.4.201": "High-throughput JPEG 2000",
  "1.2.840.10008.1.2.4.202": "High-throughput JPEG 2000", "1.2.840.10008.1.2.4.203": "High-throughput JPEG 2000",
};
const LONGVR = new Set(["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "SV", "UC", "UN", "UR", "UT", "UV"]);
const UNDEF = 0xffffffff;
const T = (g, e) => ((g << 16) | e) >>> 0;
const PIXEL = T(0x7fe0, 0x0010);
const WANT = {
  [T(0x0008, 0x0016)]: ["sop", "s"], [T(0x0008, 0x0060)]: ["mod", "s"], [T(0x0018, 0x0015)]: ["body", "s"],
  [T(0x0020, 0x0013)]: ["inst", "i"], [T(0x0020, 0x1041)]: ["sloc", "d"], [T(0x0020, 0x0032)]: ["ipp", "d"],
  [T(0x0028, 0x0002)]: ["spp", "u"], [T(0x0028, 0x0004)]: ["photo", "s"], [T(0x0028, 0x0006)]: ["planar", "u"],
  [T(0x0028, 0x0008)]: ["frames", "i"], [T(0x0028, 0x0010)]: ["rows", "u"], [T(0x0028, 0x0011)]: ["cols", "u"],
  [T(0x0028, 0x0100)]: ["alloc", "u"], [T(0x0028, 0x0101)]: ["stored", "u"], [T(0x0028, 0x0103)]: ["pixrep", "u"],
  [T(0x0028, 0x0301)]: ["burned", "s"], [T(0x0028, 0x1050)]: ["wc", "d"], [T(0x0028, 0x1051)]: ["ww", "d"],
  [T(0x0028, 0x1052)]: ["icpt", "d"], [T(0x0028, 0x1053)]: ["slope", "d"],
};
// Presence only (value is never read): patient name, ID, birth date, other IDs, accession, institution, physician names
const IDENT = new Set([T(0x0010, 0x0010), T(0x0010, 0x0020), T(0x0010, 0x0030), T(0x0010, 0x1000), T(0x0008, 0x0050), T(0x0008, 0x0080), T(0x0008, 0x0090), T(0x0008, 0x1050)]);

const fail = (code, msg) => { const e = new Error(msg); e.code = code; return e; };

export function windowPresets() {
  return [["auto", "Auto (from file)", null, null], ["full", "Full range", null, null], ["lung", "CT lung", -600, 1500], ["med", "CT mediastinum", 40, 350], ["abd", "CT abdomen", 50, 400],
    ["brain", "CT brain", 40, 80], ["sub", "CT subdural", 75, 200], ["bone", "CT bone", 500, 2000]];
}

export async function isDicomFile(f) {
  try { const b = new Uint8Array(await f.slice(128, 132).arrayBuffer()); return b.length === 4 && b[0] === 68 && b[1] === 73 && b[2] === 67 && b[3] === 77; } catch (e) { return false; }
}

async function inflate(u8) {
  if (typeof DecompressionStream === "undefined") throw fail("unsupported", "This browser cannot open deflated DICOM. Export it as uncompressed DICOM, PNG or JPEG.");
  // Some writers leave bytes after the deflate stream; browsers then error at the very end, so keep what was decoded before that.
  const ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(), rd = ds.readable.getReader(), parts = []; let n = 0;
  w.write(u8).catch(() => {}); w.close().catch(() => {});
  try { for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; } } catch (e) { if (!n) throw fail("bad", "This deflated DICOM file could not be decompressed."); }
  const out = new Uint8Array(n); let o = 0; parts.forEach((x) => { out.set(x, o); o += x.length; }); return out;
}

/* Parse a DICOM Part 10 file. opts.headerOnly stops at pixel data. Returns a plain object with the few values needed to draw the image. */
export async function dcmParse(buf, opts = {}) {
  let u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u8.length < 140 || u8[128] !== 68 || u8[129] !== 73 || u8[130] !== 67 || u8[131] !== 77) throw fail("notdicom", "This does not look like a DICOM file (no DICM header).");
  let dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), pos = 132, ts = TS.EXPL;
  const str = (d, o, n) => { let s = ""; for (let i = 0; i < n; i++) { const c = d.getUint8(o + i); if (c === 0) break; s += String.fromCharCode(c); } return s.trim(); };
  // file meta group (always explicit little endian)
  while (pos + 8 <= u8.length && dv.getUint16(pos, true) === 2) {
    const e = dv.getUint16(pos + 2, true), vr = String.fromCharCode(u8[pos + 4], u8[pos + 5]);
    let len, vp; if (LONGVR.has(vr)) { len = dv.getUint32(pos + 8, true); vp = pos + 12; } else { len = dv.getUint16(pos + 6, true); vp = pos + 8; }
    if (e === 0x0010) ts = str(dv, vp, len);
    pos = vp + len;
  }
  let body = u8.subarray(pos);
  if (ts === TS.DEFL) body = await inflate(body);
  u8 = body; dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); pos = 0;
  const explicit = ts !== TS.IMPL, le = ts !== TS.BE;
  const ds = { ts, le, explicit, u8, dv, hasIds: false, pixel: null };
  const rd = (p) => {
    if (p + 8 > u8.length) return null;
    const g = dv.getUint16(p, le), e = dv.getUint16(p + 2, le), tag = T(g, e);
    if (g === 0xfffe) return { g, e, tag, vr: null, len: dv.getUint32(p + 4, le), vp: p + 8 };
    if (explicit) {
      const vr = String.fromCharCode(u8[p + 4], u8[p + 5]);
      if (LONGVR.has(vr)) { if (p + 12 > u8.length) return null; return { g, e, tag, vr, len: dv.getUint32(p + 8, le), vp: p + 12 }; }
      return { g, e, tag, vr, len: dv.getUint16(p + 6, le), vp: p + 8 };
    }
    return { g, e, tag, vr: null, len: dv.getUint32(p + 4, le), vp: p + 8 };
  };
  // skip an undefined-length sequence or item content; returns the position after its delimiter
  const skipSeq = (p) => {
    for (let guard = 0; guard < 1e6; guard++) {
      const el = rd(p); if (!el) return u8.length;
      if (el.tag === T(0xfffe, 0xe0dd)) return el.vp;
      if (el.tag === T(0xfffe, 0xe000)) { p = el.len === UNDEF ? skipItem(el.vp) : el.vp + el.len; continue; }
      p = el.vp + (el.len === UNDEF ? 0 : el.len); if (el.len === UNDEF) p = skipSeq(el.vp);
    }
    return u8.length;
  };
  const skipItem = (p) => {
    for (let guard = 0; guard < 1e6; guard++) {
      const el = rd(p); if (!el) return u8.length;
      if (el.tag === T(0xfffe, 0xe00d)) return el.vp;
      p = el.len === UNDEF ? skipSeq(el.vp) : el.vp + el.len;
    }
    return u8.length;
  };
  while (pos < u8.length) {
    const el = rd(pos); if (!el) break;
    if (el.g === 0xfffe) { pos = el.vp + (el.len === UNDEF ? 0 : el.len); continue; }
    if (el.tag === PIXEL) { ds.pixel = { vp: el.vp, len: el.len, vr: el.vr }; break; }
    if (el.g > 0x7fe0) break;
    const w = WANT[el.tag];
    if (w && el.len !== UNDEF && el.vp + el.len <= u8.length) {
      const [k, ty] = w;
      if (ty === "s") ds[k] = str(dv, el.vp, el.len);
      else if (ty === "u") ds[k] = el.len >= 2 ? dv.getUint16(el.vp, le) : undefined;
      else if (ty === "i") { const n = parseInt(str(dv, el.vp, el.len), 10); if (!isNaN(n)) ds[k] = n; }
      else { const a = str(dv, el.vp, el.len).split("\\").map(parseFloat).filter((x) => !isNaN(x)); if (a.length) ds[k] = a; }
    }
    if (IDENT.has(el.tag) && el.len > 0) ds.hasIds = true;
    pos = el.len === UNDEF ? skipSeq(el.vp) : el.vp + el.len;
  }
  if (opts.headerOnly) return ds;
  if (!ds.pixel) throw fail("nopix", /^1\.2\.840\.10008\.5\.1\.4\.1\.1\.9\./.test(ds.sop || "") ? "This DICOM file is a waveform (for example an ECG), not an image. Export the trace as PNG or JPEG from your viewer." : "This DICOM file has no image pixels (it may be a report, a DICOMDIR or a presentation state). Choose the image file.");
  if (!ds.rows || !ds.cols) throw fail("bad", "The image size is missing from this DICOM file.");
  ds.spp = ds.spp || 1; ds.alloc = ds.alloc || 8; ds.stored = ds.stored || ds.alloc; ds.pixrep = ds.pixrep || 0; ds.frames = ds.frames || 1; ds.photo = (ds.photo || "MONOCHROME2").toUpperCase();
  if (ds.photo === "PALETTE COLOR") throw fail("unsupported", "Palette-colour DICOM is not supported. Export it as PNG or JPEG.");
  return ds;
}

function fragments(ds) {
  // encapsulated pixel data: [basic offset table item][fragment items...][sequence delimiter]
  const { u8, dv, le } = ds, out = []; let p = ds.pixel.vp, bot = [], first = true, base = 0;
  for (let guard = 0; guard < 1e6 && p + 8 <= u8.length; guard++) {
    const g = dv.getUint16(p, le), e = dv.getUint16(p + 2, le), len = dv.getUint32(p + 4, le);
    if (g !== 0xfffe) break;
    if (e === 0xe0dd) break;
    if (e === 0xe000) {
      if (first) { first = false; for (let i = 0; i + 4 <= len; i += 4) bot.push(dv.getUint32(p + 8 + i, le)); base = p + 8 + len; p = base; continue; }
      out.push({ off: p + 8, len, item: p - base }); p += 8 + len; continue;
    }
    p += 8;
  }
  return { frags: out, bot };
}

function encFrames(ds) {
  const { frags, bot } = fragments(ds), n = ds.frames;
  if (!frags.length) throw fail("bad", "No image data was found in this compressed DICOM file.");
  if (n === 1) return [frags];
  if (bot.length === n) { const g = bot.map(() => []); frags.forEach((f) => { let k = 0; for (let i = 0; i < bot.length; i++) if (bot[i] <= f.item) k = i; g[k].push(f); }); return g; }
  if (frags.length === n) return frags.map((f) => [f]);
  throw fail("unsupported", "This multi-frame compressed file cannot be split into frames. Export a single frame as PNG or JPEG.");
}
const joinFrags = (ds, list) => { const n = list.reduce((s, f) => s + f.len, 0), out = new Uint8Array(n); let o = 0; list.forEach((f) => { out.set(ds.u8.subarray(f.off, f.off + f.len), o); o += f.len; }); return out; };

function decodeRLE(b, rows, cols, spp, alloc, signed) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), n = dv.getUint32(0, true), bpp = alloc >> 3, np = rows * cols;
  if (n !== spp * bpp) throw fail("bad", "Unexpected RLE segment count.");
  const segs = []; for (let i = 0; i < n; i++) segs.push(dv.getUint32(4 + 4 * i, true)); segs.push(b.length);
  const planes = [];
  for (let s = 0; s < n; s++) {
    const dst = new Uint8Array(np); let ip = segs[s], ie = segs[s + 1], op = 0;
    while (ip < ie && op < np) { const c = b[ip++]; if (c < 128) { const m = c + 1; for (let k = 0; k < m && op < np; k++) dst[op++] = b[ip++]; } else if (c > 128) { const m = 257 - c, v = b[ip++]; for (let k = 0; k < m && op < np; k++) dst[op++] = v; } }
    planes.push(dst);
  }
  if (spp === 1 && bpp === 1) return planes[0];
  if (spp === 1 && bpp === 2) { const o = signed ? new Int16Array(np) : new Uint16Array(np); for (let i = 0; i < np; i++) o[i] = (planes[0][i] << 8) | planes[1][i]; return o; }
  if (spp === 3 && bpp === 1) { const o = new Uint8Array(np * 3); for (let i = 0; i < np; i++) { o[3 * i] = planes[0][i]; o[3 * i + 1] = planes[1][i]; o[3 * i + 2] = planes[2][i]; } return o; }
  throw fail("unsupported", "This RLE layout is not supported.");
}

/* Returns {kind:"raw", data, spp} or {kind:"bitmap", bitmap} for frame i (0-based). */
export async function dcmFrame(ds, i) {
  const { u8, dv, rows, cols, spp, alloc, pixrep, le } = ds, np = rows * cols;
  i = Math.max(0, Math.min(ds.frames - 1, i | 0));
  if (ds.pixel.len === UNDEF) {
    const groups = encFrames(ds), list = groups[Math.min(i, groups.length - 1)];
    if (ds.ts === TS.RLE) return { kind: "raw", data: decodeRLE(joinFrags(ds, list), rows, cols, spp, alloc, pixrep === 1), spp, planar: 0 };
    if (ds.ts === TS.JPEG_BASE) {
      if (typeof createImageBitmap === "undefined") throw fail("unsupported", "This browser cannot decode JPEG DICOM.");
      try { return { kind: "bitmap", bitmap: await createImageBitmap(new Blob([joinFrags(ds, list)], { type: "image/jpeg" })) }; } catch (e) { throw fail("bad", "The embedded JPEG could not be decoded."); }
    }
    throw fail("unsupported", (TS_NAME[ds.ts] || "This compression (" + ds.ts + ")") + " DICOM cannot be opened in the browser. In your viewer choose Export, then PNG/JPEG, or save as uncompressed DICOM.");
  }
  if (spp !== 1 && spp !== 3) throw fail("unsupported", "Unsupported number of samples per pixel.");
  if (alloc !== 8 && alloc !== 16) throw fail("unsupported", alloc + "-bit pixel data is not supported. Export as PNG or JPEG.");
  const fb = np * spp * (alloc >> 3), off = ds.pixel.vp + i * fb;
  if (off + fb > u8.length) throw fail("bad", "The pixel data is truncated.");
  if (alloc === 8) return { kind: "raw", data: u8.slice(off, off + fb), spp, planar: ds.planar || 0 };
  const n = np * spp, signed = pixrep === 1;
  if (le) { const ab = u8.buffer.slice(u8.byteOffset + off, u8.byteOffset + off + fb); return { kind: "raw", data: signed ? new Int16Array(ab) : new Uint16Array(ab), spp, planar: ds.planar || 0 }; }
  const o = signed ? new Int16Array(n) : new Uint16Array(n);
  for (let k = 0; k < n; k++) o[k] = signed ? dv.getInt16(off + 2 * k, le) : dv.getUint16(off + 2 * k, le);
  return { kind: "raw", data: o, spp, planar: ds.planar || 0 };
}

/* Window/level. Returns {c,w,lo,hi} for the grey values (after rescale). */
export function pickWindow(ds, data, preset, custom) {
  const sl = (ds.slope && ds.slope[0]) || 1, ic = (ds.icpt && ds.icpt[0]) || 0;
  if (custom && custom.w > 0) return { c: custom.c, w: custom.w };
  const P = windowPresets().find((p) => p[0] === preset);
  if (P && P[2] != null) return { c: P[2], w: P[3] };
  if (preset === "auto" && ds.wc && ds.ww && ds.ww[0] > 1) return { c: ds.wc[0], w: ds.ww[0] };
  // full range, or auto without tags: use the 0.5–99.5 percentile of a sample so a bright marker does not wash out the picture
  const st = Math.max(1, Math.floor(data.length / 60000)), s = []; for (let k = 0; k < data.length; k += st) s.push(data[k] * sl + ic);
  s.sort((a, b) => a - b);
  let lo = s[0], hi = s[s.length - 1];
  if (preset !== "full") { lo = s[Math.floor(s.length * 0.005)]; hi = s[Math.min(s.length - 1, Math.ceil(s.length * 0.995))]; }
  if (hi <= lo) hi = lo + 1;
  return { c: (lo + hi) / 2, w: hi - lo };
}

/* Pure: grey values -> RGBA bytes. */
export function greyToRGBA(data, n, sl, ic, win, invert) {
  const out = new Uint8ClampedArray(n * 4), lo = win.c - win.w / 2, k = 255 / win.w;
  for (let i = 0; i < n; i++) { let v = ((data[i] * sl + ic) - lo) * k; v = v < 0 ? 0 : v > 255 ? 255 : v; if (invert) v = 255 - v; out[4 * i] = out[4 * i + 1] = out[4 * i + 2] = v; out[4 * i + 3] = 255; }
  return out;
}

/* Draw a decoded frame to a canvas at native size. Returns {canvas, win, fixed} (fixed = already 8-bit, window not adjustable). */
export function dcmDraw(ds, fr, opts = {}) {
  const { rows, cols } = ds, cv = document.createElement("canvas"), ctx = cv.getContext("2d"); let win = null, fixed = false;
  const mono1 = ds.photo === "MONOCHROME1";
  if (fr.kind === "bitmap") {
    cv.width = fr.bitmap.width; cv.height = fr.bitmap.height; ctx.drawImage(fr.bitmap, 0, 0); fixed = true;
    if (mono1 !== !!opts.invert) { const im = ctx.getImageData(0, 0, cv.width, cv.height), d = im.data; for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } ctx.putImageData(im, 0, 0); }
    return { canvas: cv, win, fixed };
  }
  cv.width = cols; cv.height = rows; const np = rows * cols;
  if (fr.spp === 1) {
    win = pickWindow(ds, fr.data, opts.preset || "auto", opts.custom);
    const rgba = greyToRGBA(fr.data, np, (ds.slope && ds.slope[0]) || 1, (ds.icpt && ds.icpt[0]) || 0, win, mono1 !== !!opts.invert);
    ctx.putImageData(new ImageData(rgba, cols, rows), 0, 0);
  } else {
    const d = fr.data, rgba = new Uint8ClampedArray(np * 4), planar = fr.planar === 1, ybr = ds.photo.startsWith("YBR"); fixed = true;
    if (ds.photo === "YBR_FULL_422" || ds.photo === "YBR_PARTIAL_422") throw fail("unsupported", "Subsampled colour DICOM is not supported. Export as PNG or JPEG.");
    for (let i = 0; i < np; i++) {
      let r = planar ? d[i] : d[3 * i], g = planar ? d[np + i] : d[3 * i + 1], b = planar ? d[2 * np + i] : d[3 * i + 2];
      if (ybr) { const Y = r, Cb = g - 128, Cr = b - 128; r = Y + 1.402 * Cr; g = Y - 0.344136 * Cb - 0.714136 * Cr; b = Y + 1.772 * Cb; }
      rgba[4 * i] = r; rgba[4 * i + 1] = g; rgba[4 * i + 2] = b; rgba[4 * i + 3] = 255;
    }
    ctx.putImageData(new ImageData(rgba, cols, rows), 0, 0);
  }
  return { canvas: cv, win, fixed };
}

/* Resize to at most 1100 px and return a JPEG data URL (no metadata). */
export function canvasToJpeg(src, max = 1100) {
  const k = Math.min(1, max / Math.max(src.width, src.height)), cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(src.width * k)); cv.height = Math.max(1, Math.round(src.height * k));
  cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.85);
}

/* Which image type to preselect (ids from MODS in app.js), or null when unsure. */
export function suggestMod(ds) {
  const m = (ds.mod || "").toUpperCase(), b = (ds.body || "").toUpperCase();
  if (m === "CT") return "ct"; if (m === "MR") return "mri";
  if (m === "CR" || m === "DX" || m === "DR" || m === "RG") return /CHEST|LUNG|THORAX|^$/.test(b) ? "cxr" : "other";
  if (m === "US") return /HEART|CARD/.test(b) ? "us_echo" : /CHEST|LUNG|THORAX/.test(b) ? "us_lung" : /ABD|PELV/.test(b) ? "us_fast" : null;
  return null;
}
export const modLabel = (ds) => ({ CT: "CT", MR: "MRI", CR: "X-ray (CR)", DX: "X-ray (DX)", DR: "X-ray", RG: "X-ray", US: "Ultrasound", XA: "Angiography" }[(ds.mod || "").toUpperCase()] || (ds.mod || "Image"));

/* Order a stack of files by instance number or slice position. Reads only the first 512 KB of each file. */
export async function dcmStack(files, onProgress) {
  const rows = [];
  for (let i = 0; i < files.length; i++) {
    let h = null; try { h = await dcmParse(await files[i].slice(0, 524288).arrayBuffer(), { headerOnly: true }); } catch (e) { h = null; }
    if (h && h.pixel) rows.push({ f: files[i], inst: h.inst, z: h.ipp && h.ipp.length === 3 ? h.ipp[2] : h.sloc ? h.sloc[0] : null, name: files[i].name, h });
    else if (h === null) rows.push({ f: files[i], inst: null, z: null, name: files[i].name, h: null, bad: true });
    if (onProgress && i % 25 === 0) onProgress(i + 1, files.length);
  }
  const ok = rows.filter((r) => !r.bad && r.h);
  if (!ok.length) { if (files.length === 1) await dcmParse(await files[0].arrayBuffer()); throw fail("nopix", "None of the selected files contain an image."); }
  ok.sort((a, b) => (a.z != null && b.z != null && a.z !== b.z ? a.z - b.z : a.inst != null && b.inst != null && a.inst !== b.inst ? a.inst - b.inst : a.name.localeCompare(b.name, undefined, { numeric: true })));
  return { items: ok, skipped: files.length - ok.length };
}
