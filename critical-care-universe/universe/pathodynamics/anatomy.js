/* PATHODYNAMICS anatomy: real organ meshes for the labs, in place of the hand-made shapes.

   models/organs/*.glb   BodyParts3D (CC BY-SA 2.1 JP): heart wall, lungs, brain, pancreas, liver, bowel, kidney
   kidney/kidney.glb     Human Reference Atlas kidney (CC BY 4.0): capsule, cortex, columns, pyramids, papillae, calyces, pelvis
   Credits are in CREDIT; each lab names its own and the app shows it on the model.

   Each loader returns plain BufferGeometry, already centred and fitted to the box the lab was built around, so the lab's own
   coordinates (vessels, clots, territories, painting) still land on the right place. The labs keep their simple shape until the mesh
   arrives, then swap. If a mesh cannot be loaded the lab keeps the simple shape and still works. */
import { THREE } from "./stage.js?v=20261126gk";
import { GLTFLoader } from "../vendor/GLTFLoader.js";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";

export const CREDIT = {
  bp3d: "Anatomy: BodyParts3D © DBCLS, CC BY-SA 2.1 JP. Adapted for teaching.",
  hra: "Kidney: HuBMAP Human Reference Atlas (Browne & Schlehlein), CC BY 4.0. Adapted for teaching.",
};
const cache = {};
const url = (p) => new URL("../../../" + p, import.meta.url).href;
const gltf = (p) => cache[p] || (cache[p] = new Promise((res, rej) => new GLTFLoader().load(url(p), res, undefined, rej)));

/* every mesh of a scene as geometry with its transform baked in; only position and normal kept, so pieces can be merged */
function bake(scene) {
  scene.updateMatrixWorld(true); const out = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    if (!g.index) { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); }
    if (!g.attributes.normal) g.computeVertexNormals();
    out.push({ name: o.name, geom: g });
  });
  return out;
}
const merge = (list) => { if (!list.length) return null; const g = list.length === 1 ? list[0].clone() : mergeGeometries(list.map((x) => x.clone()), false); return g; };
const boxOf = (geoms) => { const b = new THREE.Box3(); geoms.forEach((g) => { g.computeBoundingBox(); b.union(g.boundingBox); }); return b; };

/* turn, then fit the box of the mesh into the ellipsoid box { c: centre, r: radii }. mode "fit": each axis to its own radius. "uniform": one scale, the tallest axis wins. */
function place(geoms, rot, fitTo, mode) {
  const R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0));
  geoms.forEach((g) => g.applyMatrix4(R));
  const b = boxOf(geoms), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const k = mode === "uniform" ? (() => { const u = Math.min(2 * fitTo.r[0] / s.x, 2 * fitTo.r[1] / s.y, 2 * fitTo.r[2] / s.z); return [u, u, u]; })() : [2 * fitTo.r[0] / s.x, 2 * fitTo.r[1] / s.y, 2 * fitTo.r[2] / s.z];
  const M = new THREE.Matrix4().makeTranslation(fitTo.c[0], fitTo.c[1], fitTo.c[2]).multiply(new THREE.Matrix4().makeScale(k[0], k[1], k[2])).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
  geoms.forEach((g) => { g.applyMatrix4(M); g.computeVertexNormals(); });
  return M;
}

/* mirror a geometry about one axis (0 x, 1 y, 2 z) and keep the triangles facing outwards */
export function mirror(g, axis) {
  const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { p.array[i * 3 + axis] *= -1; if (n) n.array[i * 3 + axis] *= -1; }
  const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  p.needsUpdate = true; if (n) n.needsUpdate = true; g.index.needsUpdate = true; return g;
}
/* the triangles of g whose centroid passes test(cx, cy, cz), as a compact geometry */
export function subset(g, test) {
  const p = g.attributes.position, n = g.attributes.normal, ix = g.index.array, map = new Map(), pos = [], nor = [], out = [];
  const add = (v) => { let k = map.get(v); if (k == null) { k = pos.length / 3; map.set(v, k); pos.push(p.getX(v), p.getY(v), p.getZ(v)); if (n) nor.push(n.getX(v), n.getY(v), n.getZ(v)); } return k; };
  for (let i = 0; i < ix.length; i += 3) { const a = ix[i], b = ix[i + 1], c = ix[i + 2]; if (test((p.getX(a) + p.getX(b) + p.getX(c)) / 3, (p.getY(a) + p.getY(b) + p.getY(c)) / 3, (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3)) out.push(add(a), add(b), add(c)); }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); if (n) r.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); r.setIndex(out); return r;
}
/* split a pair of lungs (or hemispheres) at the emptiest x in the middle of the mesh; returns [negative side, positive side] */
export function splitLR(g) {
  const P = g.attributes.position; g.computeBoundingBox(); const lo = g.boundingBox.min.x, hi = g.boundingBox.max.x, a = lo + (hi - lo) * 0.3, b = lo + (hi - lo) * 0.7, N = 60, h = new Array(N).fill(0);
  for (let i = 0; i < P.count; i++) { const x = P.getX(i); if (x > a && x < b) h[Math.min(N - 1, Math.floor(((x - a) / (b - a)) * N))]++; }
  let k = 0; for (let i = 1; i < N; i++) if (h[i] < h[k]) k = i; const x0 = a + ((k + 0.5) / N) * (b - a);
  return [subset(g, (x) => x <= x0), subset(g, (x) => x > x0)];
}
/* fit one geometry into a box { c: centre, r: radii } */
export function fitGeom(g, fit, mode) { place([g], [0, 0, 0], fit, mode || "fit"); return g; }

/* one organ from models/organs. opts: { rot: [x,y,z] radians, fit: { c, r }, mode, bigX: +1|-1 puts the larger lung on that side, frontZ: +1|-1 puts the front of the brain on that side, flipX } -> BufferGeometry */
export async function organ(name, opts) {
  opts = opts || {}; const g = await gltf("models/organs/" + name + ".glb"), parts = bake(g.scene), geoms = parts.map((p) => p.geom);
  const m = merge(geoms);
  if (opts.rot) m.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0)));
  m.computeBoundingBox(); const cb = m.boundingBox.getCenter(new THREE.Vector3()), P = m.attributes.position;
  if (opts.flipX) mirror(m, 0);
  if (opts.bigX) {   /* the larger lung is the one with more surface */
    let a = 0, b = 0; for (let i = 0; i < P.count; i++) { if (P.getX(i) > cb.x) a++; else b++; } if ((a > b ? 1 : -1) !== opts.bigX) mirror(m, 0);
  }
  if (opts.frontZ) {   /* the cerebellum is the low, posterior part: the lowest fifth of the brain sits behind */
    const ys = []; for (let i = 0; i < P.count; i++) ys.push(P.getY(i)); ys.sort((x, y) => x - y); const y20 = ys[Math.floor(ys.length * 0.2)]; let sz = 0, c = 0; for (let i = 0; i < P.count; i++) if (P.getY(i) < y20) { sz += P.getZ(i) - cb.z; c++; }
    const backIsPlus = sz / c > 0; if ((backIsPlus ? -1 : 1) !== opts.frontZ) mirror(m, 2);
  }
  if (opts.fit) { m.computeBoundingBox(); fitGeom(m, opts.fit, opts.mode); }
  m.computeBoundingBox(); return m;
}

/* the kidney, in its parts. Height is the given height; the hilum faces +x. Returns geometries in a group-local frame centred on the kidney. */
const KID = { cortex: /outer_cortex|renal_column/, pyramids: /renal_pyramid|renal_papilla/, pelvis: /renal_pelvis|calyx/, hilum: /hilum_of/ };
export async function kidney(height, rotY) {
  const g = await gltf("kidney/kidney.glb"), parts = bake(g.scene), pick = (re) => parts.filter((p) => re.test(p.name)).map((p) => p.geom);
  const body = parts.filter((p) => /capsule|outer_cortex|renal_column|pyramid|papilla|calyx|pelvis|hilum/.test(p.name)).map((p) => p.geom);   /* not the ureter or the vessels */
  const b = boxOf(body), c = b.getCenter(new THREE.Vector3()), h = b.getSize(new THREE.Vector3()).y, k = height / h;
  const M = new THREE.Matrix4().makeRotationY(rotY == null ? Math.PI : rotY).multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
  parts.forEach((p) => { p.geom.applyMatrix4(M); p.geom.computeVertexNormals(); });
  /* stand the long axis of the kidney upright: it lies tilted in the atlas (it sits tilted in the body) */
  { const cg = merge(pick(KID.cortex)), pa = cg.attributes.position; let mx = 0, my = 0; const n = pa.count; for (let i = 0; i < n; i++) { mx += pa.getX(i); my += pa.getY(i); } mx /= n; my /= n;
    let sxx = 0, syy = 0, sxy = 0; for (let i = 0; i < n; i++) { const dx = pa.getX(i) - mx, dy = pa.getY(i) - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), r1 = Math.PI / 2 - th, r2 = -Math.PI / 2 - th;   /* two ways to make the long axis vertical: take the smaller turn */
    const c2 = new THREE.Matrix4().makeRotationZ(Math.abs(r1) < Math.abs(r2) ? r1 : r2);
    parts.forEach((p) => { p.geom.applyMatrix4(c2); p.geom.computeVertexNormals(); }); const cc = boxOf(body).getCenter(new THREE.Vector3()); parts.forEach((p) => p.geom.translate(-cc.x, -cc.y, -cc.z)); }
  const out = {}; for (const [key, re] of Object.entries(KID)) out[key] = merge(pick(re));
  const pc = boxOf(pick(KID.pelvis)).getCenter(new THREE.Vector3()); out.pelvisCentre = pc;
  out.size = boxOf(body).getSize(new THREE.Vector3());
  return out;
}

/* a standard look for a real organ: soft, slightly glossy, with a rim so the shape reads */
export const organMat = (hex, o) => new THREE.MeshPhongMaterial(Object.assign({ color: hex, shininess: 38, specular: 0x3a2a2a }, o || {}));
