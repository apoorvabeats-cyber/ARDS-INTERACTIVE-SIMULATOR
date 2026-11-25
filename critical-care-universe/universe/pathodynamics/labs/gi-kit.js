/* Small 3D helpers shared by the gastroenterology and hepatology labs: ducts that can widen, a fixed branching tree, a gall-stone-like pebble,
   bubbles, and one place to load the liver and the bowel meshes. Everything here is 3D; nothing draws a flat picture. */
import { THREE } from "../stage.js?v=20261126gi";
import { organ } from "../anatomy.js?v=20261126gi";

export const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
export const lerp = (a, b, k) => a + (b - a) * k;
export const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

/* a straight duct from a to b. Its width can be scaled (setWidth) without moving the axis, so the duct dilates in place. */
export function seg(grp, a, b, r, mat) {
  const A = V3(a), B = V3(b), d = B.clone().sub(A), len = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, false), mat);
  m.position.copy(A.clone().add(B).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.userData.r = r; m.userData.a = A; m.userData.b = B;
  m.scale.set(r, len, r); grp.add(m); return m;
}
export const setWidth = (m, k) => { m.scale.x = m.scale.z = m.userData.r * k; };
/* a fixed branching tree (same every time): returns the list of segments. dir is a vector, each branch splits into two. */
export function branchTree(grp, mat, root, dir, len, r, depth, seed, spread) {
  const R = rng(seed), out = [], sp = spread || 0.55;
  (function grow(p, d, l, rr, k) {
    const q = [p[0] + d.x * l, p[1] + d.y * l, p[2] + d.z * l], m = seg(grp, p, q, rr, mat); m.userData.depth = depth - k; out.push(m);
    if (k <= 0) return;
    [-1, 1].forEach((sg) => { const nd = d.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), sg * sp * (0.7 + 0.6 * R())).applyAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 0.8).normalize(); grow(q, nd, l * (0.7 + 0.1 * R()), rr * 0.74, k - 1); });
  })(root, dir.clone().normalize(), len, r, depth);
  return out;
}
/* a lumpy pebble (stone) or a round bubble */
export function pebble(r, hex) { const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const f = 1 + 0.18 * Math.sin(v.x * 70) * Math.cos(v.y * 60 + v.z * 30); p.setXYZ(i, v.x * f, v.y * f, v.z * f); } g.computeVertexNormals(); return new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: hex || 0xe0b84a, emissive: 0x3a2a00, shininess: 70 })); }
export const ball = (r, hex, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial(Object.assign({ color: hex || 0xffffff }, o || {})));
/* the liver and the bowel, once, shared by every lab. fit boxes are given by the lab. */
export const loadLiver = (fit) => organ("liver", { fit });
export const loadBowel = (fit) => organ("bowel", { fit });
/* a soft ellipsoid, for fallback shapes and cavities */
export function ellip(rx, ry, rz) { const g = new THREE.SphereGeometry(1, 36, 26); g.scale(rx, ry, rz); return g; }
export const rate = (f, v) => { if (f) f.rate = Math.max(0, Math.min(1, v)); };
export const CREDIT_BP3D = "Liver and bowel: BodyParts3D © DBCLS, CC BY-SA 2.1 JP. Adapted for teaching.";
