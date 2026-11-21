/* The look of a doctor: the choices made on the "Create your doctor" screen, kept on the device, sent to the other doctors in an MDT
   session and applied to the rigged body in doctor-avatar.js.
   A look is a small plain object, so it travels in a few hundred bytes:
   { v:1, sex:"m"|"f", skin:0-11, face:0-4, eyes:0-4, age:0-2, build:0-4, height:0-2, hair:"short", hairc:0-6, facial:"none",
     outfit:"coat"|"icu"|"surgical", scrub:-1..7 (-1 = the specialty colour), acc:["steth","badge","glasses","mask","cap","gloves"] }   */

export const KEY = "ccu-doctor-look-v1";
export const SKINS = [0xf6dcc6, 0xefcdb0, 0xe4b894, 0xd8a47c, 0xc99068, 0xb87d56, 0xa66b47, 0x93593a, 0x7f4a30, 0x6b3d28, 0x58311f, 0x452619];
export const HAIRC = [0x121212, 0x2a1a11, 0x5b3a22, 0x7d3b1c, 0xc7a15a, 0xb5b5b5, 0xeeeeee];
export const EYEC = [0x4a2c17, 0x7a5a28, 0x3f7a4c, 0x3d78b8, 0x7d8a96];
export const SCRUBS = [0x1fa3a3, 0x2f6fc4, 0x2f9a62, 0x24324f, 0x8a2f45, 0x6b7480, 0x6b4fa3, 0x1c1f24];
export const SCRUB_NAMES = ["Teal", "Blue", "Green", "Navy", "Maroon", "Grey", "Purple", "Black"];
export const SKIN_NAMES = ["Very fair", "Fair", "Light", "Light brown", "Medium", "Wheatish", "Tan", "Brown", "Deep brown", "Dark", "Darker", "Deepest"];
export const HAIR_NAMES = ["Black", "Dark brown", "Brown", "Auburn", "Blonde", "Grey", "White"];
export const EYE_NAMES = ["Brown", "Hazel", "Green", "Blue", "Grey"];
export const OPT = {
  hair: [["bald", "Bald"], ["crew", "Crew cut"], ["short", "Short"], ["side", "Side part"], ["curly", "Curly"], ["wavy", "Wavy"], ["bob", "Bob"], ["long", "Long"], ["pony", "Ponytail"], ["bun", "Bun"]],
  facial: [["none", "Clean-shaven"], ["stubble", "Stubble"], ["moustache", "Moustache"], ["goatee", "Goatee"], ["beard", "Beard"]],
  face: ["Oval", "Round", "Long", "Square", "Narrow"],
  build: ["Slim", "Average", "Athletic", "Broad", "Heavy"],
  height: ["Short", "Medium", "Tall"],
  age: ["Young", "Middle-aged", "Older"],
  outfit: [["coat", "White coat"], ["icu", "ICU scrubs"], ["surgical", "Surgical scrubs"]],
  acc: [["steth", "Stethoscope"], ["badge", "ID badge"], ["glasses", "Glasses"], ["mask", "Face mask"], ["cap", "Surgical cap"], ["gloves", "Gloves"]],
};
const HAIRS = OPT.hair.map((x) => x[0]), FACIALS = OPT.facial.map((x) => x[0]), OUTFITS = OPT.outfit.map((x) => x[0]), ACCS = OPT.acc.map((x) => x[0]);
const ci = (v, n, d) => { v = Math.round(Number(v)); return v >= 0 && v < n ? v : d; };

export function defaultLook(sex) {
  return sex === "f"
    ? { v: 1, sex: "f", skin: 5, face: 0, eyes: 0, age: 1, build: 1, height: 1, hair: "long", hairc: 0, facial: "none", outfit: "coat", scrub: -1, acc: ["steth", "badge"] }
    : { v: 1, sex: "m", skin: 5, face: 0, eyes: 0, age: 1, build: 1, height: 1, hair: "short", hairc: 0, facial: "none", outfit: "coat", scrub: -1, acc: ["steth", "badge"] };
}
/* a look that came from the net or from storage is never trusted: every field is forced into its range */
export function sanitize(l, sex) {
  const d = defaultLook(l && l.sex === "f" ? "f" : sex === "f" ? "f" : "m"); if (!l || typeof l !== "object") return d;
  return {
    v: 1, sex: d.sex, skin: ci(l.skin, SKINS.length, d.skin), face: ci(l.face, 5, d.face), eyes: ci(l.eyes, EYEC.length, d.eyes), age: ci(l.age, 3, d.age), build: ci(l.build, 5, d.build), height: ci(l.height, 3, d.height),
    hair: HAIRS.includes(l.hair) ? l.hair : d.hair, hairc: ci(l.hairc, HAIRC.length, d.hairc), facial: FACIALS.includes(l.facial) ? l.facial : d.facial, outfit: OUTFITS.includes(l.outfit) ? l.outfit : d.outfit,
    scrub: l.scrub === -1 ? -1 : ci(l.scrub, SCRUBS.length, -1), acc: Array.isArray(l.acc) ? ACCS.filter((a) => l.acc.includes(a)) : d.acc,
  };
}
export function loadLook() { try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); return j ? sanitize(j) : null; } catch (e) { return null; } }
export function saveLook(l) { try { localStorage.setItem(KEY, JSON.stringify(sanitize(l))); return true; } catch (e) { return false; } }


/* cutting a triangle mesh with planes: a triangle that crosses a plane is split, so the edge of a garment or of the hair is a clean line.
   A plane is [nx, ny, nz, d]: points with n·p >= d are kept. getV(i) gives { x, y, z, nx, ny, nz, si?, sw? } for vertex i of the source mesh. */
function clipTris(idx, getV, planes, keepFn) {
  const out = [], lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, nx: a.nx + (b.nx - a.nx) * t, ny: a.ny + (b.ny - a.ny) * t, nz: a.nz + (b.nz - a.nz) * t, si: t < 0.5 ? a.si : b.si, sw: t < 0.5 ? a.sw : b.sw });
  for (let i = 0; i < idx.length; i += 3) {
    let poly = [getV(idx[i]), getV(idx[i + 1]), getV(idx[i + 2])];
    for (let k = 0; k < planes.length && poly.length; k++) {
      const [nx, ny, nz, d] = planes[k], ds = poly.map((p) => nx * p.x + ny * p.y + nz * p.z - d);
      if (ds.every((q) => q >= 0)) continue; if (ds.every((q) => q < 0)) { poly = []; break; }
      const np = []; for (let j = 0; j < poly.length; j++) { const a = poly[j], b = poly[(j + 1) % poly.length], da = ds[j], db = ds[(j + 1) % poly.length]; if (da >= 0) np.push(a); if ((da >= 0) !== (db >= 0)) np.push(lerp(a, b, da / (da - db))); } poly = np;
    }
    if (poly.length < 3) continue;
    if (keepFn) { let cx = 0, cy = 0, cz = 0; poly.forEach((p) => { cx += p.x; cy += p.y; cz += p.z; }); if (!keepFn(cx / poly.length, cy / poly.length, cz / poly.length)) continue; }
    for (let j = 1; j < poly.length - 1; j++) out.push(poly[0], poly[j], poly[j + 1]);
  }
  return out;
}
function geoFrom(T, verts, th, skinned) {
  const n = verts.length, P = new Float32Array(n * 3), N = new Float32Array(n * 3), SI = skinned ? new Uint16Array(n * 4) : null, SW = skinned ? new Float32Array(n * 4) : null;
  verts.forEach((v, i) => { P[i * 3] = v.x + v.nx * th; P[i * 3 + 1] = v.y + v.ny * th; P[i * 3 + 2] = v.z + v.nz * th; N[i * 3] = v.nx; N[i * 3 + 1] = v.ny; N[i * 3 + 2] = v.nz; if (skinned) for (let k = 0; k < 4; k++) { SI[i * 4 + k] = v.si[k]; SW[i * 4 + k] = v.sw[k]; } });
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(P, 3)); g.setAttribute("normal", new T.BufferAttribute(N, 3)); if (skinned) { g.setAttribute("skinIndex", new T.BufferAttribute(SI, 4)); g.setAttribute("skinWeight", new T.BufferAttribute(SW, 4)); } return g;
}

const rnd = (n) => Math.floor(Math.random() * n);
export function randomLook(sex) {
  const f = sex === "f", l = defaultLook(sex);
  l.skin = rnd(SKINS.length); l.face = rnd(5); l.eyes = rnd(EYEC.length); l.age = rnd(3); l.build = rnd(5); l.height = rnd(3); l.hairc = rnd(5);
  const pool = f ? ["short", "side", "wavy", "bob", "long", "pony", "bun", "curly"] : ["bald", "crew", "short", "side", "curly", "wavy"]; l.hair = pool[rnd(pool.length)];
  l.facial = f ? "none" : FACIALS[rnd(FACIALS.length)]; l.outfit = OUTFITS[rnd(3)]; l.scrub = rnd(SCRUBS.length);
  l.acc = ACCS.filter((a) => (a === "steth" || a === "badge") ? Math.random() < 0.85 : Math.random() < 0.18);
  return sanitize(l, sex);
}

/* ---------------------------------------------------------------- applying a look to the body */
const mixc = (T, a, b, t) => new T.Color(a).lerp(new T.Color(b), t);
/* ctx: { clone, head, eL, eR, B(name), skin, scrub, coatM, sm[], accent, name, spec }  ->  { sx, sz, scale, lean }   */
export function applyLook(T, ctx, look) {
  const { clone, head, B } = ctx, V = T.Vector3, L = look, f = L.sex === "f", old = L.age === 2 ? 0.85 : L.age === 1 ? 0.14 : 0;
  const dm = (c, rough = 0.8, extra = {}) => new T.MeshStandardMaterial({ color: c, roughness: rough, ...extra });
  const skinC = mixc(T, SKINS[L.skin], 0x8a7a70, old * 0.18); ctx.skin.color.copy(skinC);
  const hairC = mixc(T, HAIRC[L.hairc], 0xd8d8d8, L.hairc >= 5 ? 0 : old * (L.age === 2 ? 0.8 : 0.5)), hair = dm(hairC, 0.85);
  const scrubC = L.scrub >= 0 ? SCRUBS[L.scrub] : (L.outfit === "surgical" ? SCRUBS[2] : ctx.accent); ctx.scrub.color.set(scrubC);
  const wb = (obj, bone, wp) => { bone.add(obj); obj.position.copy(bone.worldToLocal(wp.clone())); return obj; };       // pin something to a bone at a world position
  const wpos = (b) => { const v = new V(); b.getWorldPosition(v); return v; };
  clone.updateMatrixWorld(true);

  /* body proportions */
  const BUILD = [[0.9, 0.9], [1, 1], [1.07, 1.02], [1.14, 1.08], [1.2, 1.3]][L.build], sexW = f ? 0.95 : 1;
  const out = { sx: BUILD[0] * sexW, sz: BUILD[1], scale: [0.94, 1, 1.07][L.height] * (f ? 1 : 1), lean: old > 0.5 ? 0.07 : old > 0.2 ? 0.025 : 0 };

  if (ctx.coatMesh) ctx.coatMesh.visible = false;

  /* clothes: made from the body's own skin triangles, pushed out a little and skinned to the same bones, so every edge is as fine as the body's mesh */
  const skinMesh = ctx.sm.find((m) => m.material === ctx.skin), dress = [];
  ctx.sm.forEach((m) => { if (m.material === ctx.scrub) m.visible = false; });
  if (skinMesh && skinMesh.geometry.index) {
    const g0 = skinMesh.geometry, pos = g0.attributes.position, nor = g0.attributes.normal, gownMesh = ctx.sm.find((m) => m.material === ctx.scrub), idx = gownMesh && gownMesh.geometry.index ? Uint32Array.from([...g0.index.array, ...gownMesh.geometry.index.array]) : g0.index.array; g0.computeBoundingBox();   /* skin triangles plus the gown's: together they are the whole body */ const y0 = g0.boundingBox.min.y, H = g0.boundingBox.max.y - y0;
    /* the groin is smoothed back to the line of the thighs and belly - in the body mesh itself, so neither the clothes nor a bare patch show the anatomy */
    const Y0 = y0 + 0, YH = (f) => Y0 + H * f;
    let zA = -9; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), ax = Math.abs(pos.getX(i)); if (y > YH(0.43) && y < YH(0.45) && ax > 0.11 && ax < 0.16 && pos.getZ(i) > zA) zA = pos.getZ(i); }
    const slope = (0.157 - zA) / (YH(0.56) - YH(0.43));
    for (let i = 0; i < pos.count; i++) {
      const ax = Math.abs(pos.getX(i)), y = pos.getY(i); if (ax >= 0.11 || y <= YH(0.33) || y >= YH(0.56)) continue;
      const f = (y - Y0) / H, bump = Math.max(0, Math.min(1, (f - 0.33) / 0.07, (0.54 - f) / 0.07)), lim0 = zA + slope * (y - YH(0.43)) - 0.034 * bump, lim = f < 0.5 && ax < 0.09 ? Math.min(lim0, 0.015 + Math.max(0, f - 0.33) * 0.55 + Math.max(0, ax - 0.05) * 3) : lim0, z = pos.getZ(i);
      if (z > lim) { const k = Math.min(1, (0.11 - ax) / 0.04); pos.setZ(i, z + (lim - z) * k); const nx = nor.getX(i) * (1 - k), ny = nor.getY(i) * (1 - k), nz = nor.getZ(i) * (1 - k) + k, nl = Math.hypot(nx, ny, nz) || 1; nor.setXYZ(i, nx / nl, ny / nl, nz / nl); }
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
    const si = g0.attributes.skinIndex, sw = g0.attributes.skinWeight, cache = new Array(pos.count);
    const getV = (i) => cache[i] || (cache[i] = { x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i), nx: nor.getX(i), ny: nor.getY(i), nz: nor.getZ(i), si: [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)], sw: [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)] });
    const cloth = (planes, th, mat, tweak) => {
      const v = clipTris(idx, getV, planes); if (!v.length) return null; if (tweak) tweak(v);
      const m = new T.SkinnedMesh(geoFrom(T, v, th, true), mat); m.frustumCulled = false; skinMesh.parent.add(m); m.bind(skinMesh.skeleton, skinMesh.bindMatrix); dress.push(m); return m;
    };
    const Y = (f) => y0 + H * f;
    /* a garment on the trunk: below the shoulder line (a gentle V at the neck), above the hem, out to the sleeve end; the two halves are cut separately so the neckline can slope */
    const trunk = (hem, sleeve, th, mat) => [1, -1].forEach((sd) => cloth([[0, 1, 0, Y(hem)], [-sd, 0, 0, -sleeve], [sd, 0, 0, 0], [-0.58 * sd * 0 - 0, -1, 0, -(Y(0.815) + 0)]].slice(0, 3).concat([[0.58 * sd, -1, 0, -Y(0.815)]]), th, mat));
    const top = dm(scrubC, 0.88, { side: T.DoubleSide }), tr = dm(mixc(T, scrubC, 0x1d2430, L.outfit === "coat" ? 0.72 : 0.3), 0.9, { side: T.DoubleSide });
    trunk(0.56, 0.27, 0.011, top);
    if (L.outfit === "coat") trunk(0.5, 0.405, 0.024, ctx.coatM);
    /* trousers hang straight: the groin is smoothed back to the line of the lower belly instead of following the body */
    cloth([[0, 1, 0, Y(0.066)], [0, -1, 0, -Y(0.64)], [-1, 0, 0, -0.26], [1, 0, 0, -0.26]], 0.009, tr);
    cloth([[0, -1, 0, -Y(0.07)]], 0.007, dm(L.outfit === "surgical" ? 0xf2f4f6 : 0x20252b, 0.55));
  }

  if (!head || !ctx.eL || !ctx.eR) return out;
  /* the head, measured: its skin vertices in the head bone's own frame, so every piece below sits right on this face */
  const nV = skinMesh.geometry.attributes.position.count, HP = new Float32Array(nV * 3), HN = new Float32Array(nV * 3), v = new V(), nv = new V(), hq = head.getWorldQuaternion(new T.Quaternion()).invert(), nA = skinMesh.geometry.attributes.normal;
  for (let i = 0; i < nV; i++) { skinMesh.getVertexPosition(i, v); skinMesh.localToWorld(v); head.worldToLocal(v); HP[i * 3] = v.x; HP[i * 3 + 1] = v.y; HP[i * 3 + 2] = v.z; nv.fromBufferAttribute(nA, i).transformDirection(skinMesh.matrixWorld).applyQuaternion(hq); HN[i * 3] = nv.x; HN[i * 3 + 1] = nv.y; HN[i * 3 + 2] = nv.z; }
  const prof = {}; for (let i = 0; i < nV; i++) { if (Math.abs(HP[i * 3]) < 0.014 && HP[i * 3 + 1] > -0.12 && HP[i * 3 + 1] < 0.3) { const k = Math.round(HP[i * 3 + 1] / 0.005); if (HP[i * 3 + 2] > (prof[k] === undefined ? -9 : prof[k])) prof[k] = HP[i * 3 + 2]; } }
  const fz = (y) => { const k = Math.round(y / 0.005); return prof[k] !== undefined ? prof[k] : prof[k - 1] !== undefined ? prof[k - 1] : 0.11; };
  const wl = wpos(ctx.eL), wr = wpos(ctx.eR), lL = head.worldToLocal(wl.clone()), lR = head.worldToLocal(wr.clone()), EY = (lL.y + lR.y) / 2, EX = Math.abs(lL.x - lR.x) / 2 || 0.034;
  let top = -9, back = 9; for (let i = 0; i < nV; i++) { const y = HP[i * 3 + 1], x = HP[i * 3]; if (y > 0 && y < 0.3 && Math.abs(x) < 0.1) { if (y > top) top = y; if (y > 0.05 && HP[i * 3 + 2] < back) back = HP[i * 3 + 2]; } }
  const A = head, tiltF = (z) => 0.62 * (z - back);                                        // hairline: low at the nape, high on the forehead
  const hv = new Array(nV), hget = (i) => hv[i] || (hv[i] = { x: HP[i * 3], y: HP[i * 3 + 1], z: HP[i * 3 + 2], nx: HN[i * 3], ny: HN[i * 3 + 1], nz: HN[i * 3 + 2] });
  /* a skin-hugging layer (hair, beard, mask): planes cut it cleanly, keepFn drops what is left of a region (lips) */
  const shell = (planes, th, mat, keepFn) => {
    const v = clipTris(skinMesh.geometry.index.array, hget, planes, keepFn); if (!v.length) return null;
    const m = new T.Mesh(geoFrom(T, v, th, false), mat); m.frustumCulled = false; A.add(m); return m;
  };
  const PY = (y) => [0, 1, 0, y], PYM = (y) => [0, -1, 0, -y], PZ = (z) => [0, 0, 1, z], PX = (x) => [1, 0, 0, x], PXM = (x) => [-1, 0, 0, -x];
  const tilt = (y0h, lift = 0) => { const k = 0.62, n = Math.hypot(k, 1); return [0, 1 / n, -k / n, (y0h + lift + k * (-back)) / n]; };         // y - k*(z-back) >= y0h
  const add = (geo, mat, sx, sy, sz, px, py, pz, rx = 0, rz = 0, parent = A) => { const m = new T.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(px, py, pz); m.rotation.set(rx, 0, rz); parent.add(m); return m; };
  const S1 = new T.SphereGeometry(1, 20, 14), BX = new T.BoxGeometry(1, 1, 1);
  const zc = (back + fz(EY + 0.03)) / 2;

  /* the face: shape through the head bone's scale (the body's own width is taken back off, so a heavy doctor does not get a huge head) */
  const FACE = [[1, 1, 1], [1.08, 0.98, 1.04], [0.94, 1.07, 1], [1.07, 1.0, 1.0], [0.92, 1.03, 0.98]][L.face];
  A.scale.set(FACE[0] / out.sx, FACE[1], FACE[2] / out.sz);

  /* eyes: white, iris in the chosen colour, pupil; brows in the hair colour */
  const eyeR = 0.0125, irisM = dm(EYEC[L.eyes], 0.3), white = dm(0xf4f1ec, 0.25), dark = dm(0x0b0b0c, 0.3), ez = fz(EY) - 0.0055 - EX * EX * 2.2;
  [-1, 1].forEach((s) => {
    const g = new T.Group(); g.position.set(s * EX, EY, ez - 0.004); A.add(g);
    add(S1, white, eyeR * 1.2, eyeR * (f ? 0.9 : 0.8), eyeR * 0.75, 0, 0, 0, 0, 0, g);
    add(new T.CircleGeometry(1, 20), irisM, eyeR * 0.68, eyeR * 0.68, 1, 0, 0, eyeR * 0.755, 0, 0, g);
    add(new T.CircleGeometry(1, 16), dark, eyeR * 0.33, eyeR * 0.33, 1, 0, 0, eyeR * 0.76, 0, 0, g);
    add(BX, hair, 0.036, f ? 0.004 : 0.0065, 0.008, s * (EX + 0.003), EY + 0.027, fz(EY + 0.027) - 0.01 - EX * EX * 2.2, 0, s * -0.12);   // brow
  });

  /* hair, grown as a shell on the scalp, with extra masses for the long styles */
  const capOn = L.acc.includes("cap"), hs = L.hair;
  if (capOn) {
    const cm = dm(scrubC, 0.9); shell([tilt(0.06), PX(-0.1), PXM(0.1), PZ(back - 0.02)], 0.02, cm);
    add(S1, cm, 0.088, 0.085, 0.055, 0, 0.055, back + 0.012);
  } else if (hs !== "bald") {
    const th = { crew: 0.004, short: 0.012, side: 0.014, curly: 0.02, wavy: 0.016, bob: 0.012, long: 0.012, pony: 0.012, bun: 0.012 }[hs], lift = hs === "crew" ? 0.03 : 0;
    shell([tilt(0.035, lift), PX(-0.1), PXM(0.1), PZ(back - 0.03)], th, hair);
    if (hs === "side") add(S1, hair, 0.05, 0.012, 0.045, 0.026, top - 0.045, 0.085, 0.55, -0.25);
    if (hs === "curly") for (let i = 0; i < 34; i++) { const a = i * 2.399, ph = 0.2 + (i % 8) * 0.14, r = 1.0, px = Math.sin(ph) * Math.cos(a) * 0.098 * r, py = 0.075 + Math.cos(ph) * 0.15, pz = zc + Math.sin(ph) * Math.sin(a) * 0.115 * r; if (py > 0.04 + tiltF(pz) + 0.02) add(S1, hair, 0.026, 0.026, 0.026, px, py, pz); }
    if (hs === "wavy") { add(S1, hair, 0.092, 0.13, 0.055, 0, 0.0, back - 0.005); [-1, 1].forEach((s2) => add(S1, hair, 0.022, 0.1, 0.055, s2 * 0.087, 0.01, -0.02)); }
    if (hs === "bob") { add(S1, hair, 0.092, 0.085, 0.052, 0, 0.03, back - 0.002); [-1, 1].forEach((s2) => add(S1, hair, 0.02, 0.075, 0.06, s2 * 0.088, 0.03, -0.01)); }
    if (hs === "long") { add(S1, hair, 0.094, 0.23, 0.052, 0, -0.04, back - 0.004); [-1, 1].forEach((s2) => add(S1, hair, 0.024, 0.15, 0.06, s2 * 0.089, -0.03, -0.015)); }
    if (hs === "pony") { add(S1, hair, 0.032, 0.032, 0.032, 0, 0.165, back - 0.005); add(S1, hair, 0.02, 0.11, 0.02, 0, 0.08, back - 0.03, 0.3); }
    if (hs === "bun") add(S1, hair, 0.043, 0.043, 0.043, 0, top + 0.01, back + 0.04);
  }

  /* facial hair on the lower face */
  if (L.facial !== "none") {
    const jn = Math.hypot(0.33, 1), JAW = [0, 1 / jn, 0.33 / jn, 0.034 / jn];                 // jaw line: low at the chin, rising towards the ear
    const lip = (x, y, z) => Math.abs(x) < 0.028 && y > 0.002 && y < 0.026 && z > 0.09;
    if (L.facial === "stubble") shell([PYM(0.04), JAW, PZ(-0.01), PX(-0.09), PXM(0.09)], 0.0015, dm(hairC, 1, { transparent: true, opacity: 0.5 }), (x, y, z) => y > 0.0 || z > 0.05);
    if (L.facial === "beard") shell([PYM(0.08), JAW, PZ(-0.02), PX(-0.1), PXM(0.1)], 0.011, hair, (x, y, z) => (y < 0.04 || Math.abs(x) > 0.06) && (y > 0.0 || z > 0.05) && !lip(x, y, z));
    if (L.facial === "goatee") shell([PYM(-0.004), JAW, PZ(0.06), PX(-0.038), PXM(0.038)], 0.011, hair, (x, y, z) => z > 0.05 && !lip(x, y, z));
    if (L.facial !== "stubble") [-1, 1].forEach((sd) => add(S1, hair, 0.021, 0.0075, 0.012, sd * 0.0165, 0.034, fz(0.034) - 0.001, 0, sd * -0.28));
  }

  /* accessories on the face */
  if (L.acc.includes("glasses")) {
    const gm = dm(0x16191d, 0.35, { metalness: 0.5 }), gz = fz(EY) + 0.012;
    [-1, 1].forEach((s) => { const r = new T.Mesh(new T.TorusGeometry(0.0215, 0.0018, 8, 26), gm); r.position.set(s * EX, EY, gz - EX * EX * 2.2 + 0.002); A.add(r); add(BX, gm, 0.003, 0.003, 0.1, s * 0.0795, EY + 0.002, gz - 0.058 - 0.0); });
    add(BX, gm, 0.02, 0.003, 0.003, 0, EY + 0.008, gz + 0.001);
  }
  if (L.acc.includes("mask")) {
    shell([PYM(0.083), PY(-0.07), PZ(-0.005), PX(-0.1), PXM(0.1)], 0.007, dm(0x9fd4e8, 0.9, { side: T.DoubleSide }), (x, y, z) => y > 0.0 || z > 0.05);
    [-1, 1].forEach((s) => add(BX, dm(0xe8f4f8, 0.9), 0.0025, 0.0025, 0.09, s * 0.086, 0.025, 0.03));
  }

  /* chest things: found from the real torso, so they sit on whatever the build is */
  const dressMeshes = () => ctx.sm.filter((m) => m.visible).concat(dress);
  const chest = B("spine03") || B("spine05"), neck = B("neck01");
  if (chest && neck) {
    clone.updateMatrixWorld(true);
    const np = wpos(neck), cp = wpos(chest), ray = new T.Raycaster(), meshes = dressMeshes(), hitZ = (y, x = 0) => { ray.set(new V(x, y, 1.5), new V(0, 0, -1)); const h = ray.intersectObjects(meshes, false)[0]; return h ? h.point.z : 0.12; };
    const cy2 = np.y - 0.2, zf = hitZ(cy2) + (L.outfit === "coat" ? 0.022 : 0.008), unit = 1;
    if (L.acc.includes("steth")) {
      const sm2 = dm(0x1b1f24, 0.45), met = dm(0xc9d1d8, 0.3, { metalness: 0.8 });
      const ring = new T.Mesh(new T.TorusGeometry(0.095, 0.0075, 8, 28, Math.PI * 1.7), sm2); ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI * 0.65 + Math.PI * 0.15; wb(ring, chest, new V(0, np.y - 0.015, np.z - 0.005));
      [-1, 1].forEach((s) => { const t = new T.Mesh(new T.CylinderGeometry(0.0065, 0.0065, 0.3, 6), sm2); t.rotation.z = s * 0.1; wb(t, chest, new V(s * 0.085, np.y - 0.16, zf + 0.0)); });
      const cpiece = new T.Mesh(new T.CylinderGeometry(0.026, 0.026, 0.012, 16), met); cpiece.rotation.x = Math.PI / 2; wb(cpiece, chest, new V(0.0, np.y - 0.33, zf + 0.008));
    }
    if (L.acc.includes("badge")) {
      const c = document.createElement("canvas"); c.width = 128; c.height = 176; const g = c.getContext("2d"); g.fillStyle = "#f4f7fa"; g.fillRect(0, 0, 128, 176); g.fillStyle = "#" + new T.Color(ctx.accent).getHexString(); g.fillRect(0, 0, 128, 34);
      g.fillStyle = "#cfd8de"; g.fillRect(34, 46, 60, 60); g.fillStyle = "#6b7882"; g.beginPath(); g.arc(64, 68, 14, 0, 7); g.fill(); g.fillRect(48, 86, 32, 18); g.fillStyle = "#1c2630"; g.font = "700 15px system-ui"; g.textAlign = "center"; g.fillText((ctx.name || "Doctor").slice(0, 12), 64, 130); g.font = "600 12px system-ui"; g.fillStyle = "#" + new T.Color(ctx.accent).getHexString(); g.fillText((ctx.specName || "").slice(0, 16), 64, 152);
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      const bd = new T.Mesh(new T.PlaneGeometry(0.052, 0.07), new T.MeshStandardMaterial({ map: tex, roughness: 0.5 })); wb(bd, chest, new V(0.085, np.y - 0.17, hitZ(np.y - 0.17, 0.085) + (L.outfit === "coat" ? 0.03 : 0.014)));
      const lan = new T.Mesh(new T.CylinderGeometry(0.0035, 0.0035, 0.17, 5), dm(ctx.accent, 0.6)); lan.rotation.z = -0.38; wb(lan, chest, new V(0.043, np.y - 0.085, zf));
    }
    if (L.acc.includes("gloves")) {
      const gl = dm(0x5aa8e6, 0.55); ["L", "R"].forEach((s) => { const w = B("wrist." + s); if (!w) return; const p = wpos(w); const m = new T.Mesh(S1, gl); m.scale.set(0.034, 0.075, 0.03); wb(m, w, new V(p.x, p.y - 0.07, p.z + 0.01)); const cf = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.05, 12), gl); wb(cf, w, new V(p.x, p.y + 0.005, p.z)); });
    }
  }
  return out;
}
