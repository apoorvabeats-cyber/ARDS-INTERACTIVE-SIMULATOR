/* Real-body patients for the Living ICU ward.
   Loads a rigged human GLB (MakeHuman, CC0 output, or a MetaHuman / Character Creator export prepared the same way),
   lies it in the bed, and adds hair, eyelids and a hospital gown tint. One GLB is loaded per archetype and cloned.
   Bones are world-aligned in the T-pose, so a pose is one rotation per joint.
   Bed frame used by ward3d: head toward -x, feet toward +x, up = +y. */
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const cache = {};
const clean = (n) => n.replace(/[.\s]/g, "");

export function patientFile(p) {
  const m = /^(\d+)\s*([MF])/i.exec(p.hx || "");
  const age = m ? +m[1] : 50, sex = (m ? m[2] : p.sx || "M").toLowerCase() === "f" ? "f" : "m";
  return { sex, age, key: sex + (age < 36 ? "28" : age < 58 ? "48" : "68") };
}

export function loadArchetype(url) {
  if (!cache[url]) cache[url] = new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
  return cache[url];
}

/* find a bone by its original name */
const bone = (root, name) => { let f = null; const k = clean(name); root.traverse((o) => { if (o.isBone && o.name === k) f = o; }); return f; };

export function build(T, gltf, p, opt) {
  const g = new T.Group();
  const clone = skeletonClone(T, gltf.scene);
  g.add(clone);
  const B = (n) => bone(clone, n);
  const tint = (opt && opt.skin) || 0xb98262;
  const skinMat = new T.MeshPhysicalMaterial({ color: tint, roughness: 0.55, metalness: 0, sheen: 0.5, sheenColor: new T.Color(0xff9a80), sheenRoughness: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.5 });
  const gownMat = new T.MeshStandardMaterial({ color: (opt && opt.gown) || 0x8fc4d6, roughness: 0.9, side: T.DoubleSide });
  const sm = [];
  clone.traverse((o) => { if (o.isSkinnedMesh) sm.push(o); });
  sm.forEach((o) => { o.frustumCulled = false; o.material = o.material && o.material.name === "skin" ? skinMat : (o.material && o.material.name === "gown" ? gownMat : skinMat); });

  /* ---- pose (T-pose → resting in bed) ---- */
  const rot = (b, x, y, z) => { if (b) b.rotation.set(x || 0, y || 0, z || 0); };
  const inc = (opt && opt.incline) != null ? opt.incline : 0.52;
  rot(B("spine05"), inc);
  rot(B("neck01"), 0.3); rot(B("head"), 0.22);
  [["L", 1], ["R", -1]].forEach(([s, k]) => {
    rot(B("upperarm01." + s), 0.05, 0, -k * 0.5);            /* arms come down beside the body */
    rot(B("lowerarm01." + s), 0.0, 0, -k * 0.08);
    rot(B("upperleg01." + s), 0, 0, -k * 0.1);
    rot(B("clavicle." + s), 0, 0, -k * 0.08);
  });
  clone.updateMatrixWorld(true);

  /* ---- bed transform: model (y up, +z front) → bed (head -x, face up) ---- */
  const mat = new T.Matrix4().makeBasis(new T.Vector3(0, 0, -1), new T.Vector3(-1, 0, 0), new T.Vector3(0, 1, 0));
  g.quaternion.setFromRotationMatrix(mat);

  /* hair, eyelids, brows: attached to the head bone, sized from the eye bones */
  const head = B("head"), eL = B("eye.L"), eR = B("eye.R");
  const extras = new T.Group();
  if (head && eL && eR) {
    const wl = new T.Vector3(), wr = new T.Vector3(), wh = new T.Vector3();
    eL.getWorldPosition(wl); eR.getWorldPosition(wr); head.getWorldPosition(wh);
    const inv = new T.Matrix4().copy(head.matrixWorld).invert();
    const lL = wl.clone().applyMatrix4(inv), lR = wr.clone().applyMatrix4(inv);
    const eyeD = lL.distanceTo(lR) || 0.062;
    const hairMat = new T.MeshStandardMaterial({ color: (opt && opt.hair) || 0x141414, roughness: 0.85 });
    const cx = (lL.x + lR.x) / 2, cy = (lL.y + lR.y) / 2, cz = (lL.z + lR.z) / 2;
    const hr = eyeD * 1.62;
    const cap = new T.Mesh(new T.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
    cap.scale.set(hr * 0.98, hr * 1.1, hr * 1.12); cap.position.set(cx, cy + eyeD * 0.75, cz - eyeD * 0.68); cap.rotation.x = -0.22;
    extras.add(cap);
    if (p.sx === "f" || (opt && opt.longHair)) {
      const back = new T.Mesh(new T.SphereGeometry(1, 20, 14), hairMat);
      back.scale.set(hr * 0.92, hr * 1.35, hr * 0.7); back.position.set(cx, cy - eyeD * 0.15, cz - eyeD * 1.1);
      extras.add(back);
    }
    const lidMat = skinMat.clone();
    [lL, lR].forEach((q, i) => {
      const lid = new T.Mesh(new T.SphereGeometry(1, 16, 12), lidMat);
      lid.scale.set(eyeD * 0.3, eyeD * 0.19, eyeD * 0.2); lid.position.set(q.x, q.y, q.z + eyeD * 0.08);
      extras.add(lid);
      const lash = new T.Mesh(new T.TorusGeometry(eyeD * 0.17, eyeD * 0.012, 6, 16, Math.PI), new T.MeshBasicMaterial({ color: 0x1a0f0c }));
      lash.position.set(q.x, q.y - eyeD * 0.01, q.z + eyeD * 0.27); lash.rotation.z = Math.PI;
      extras.add(lash);
      void i;
    });
    head.add(extras);
  }
  return { group: g, root: clone, B, skinMat, gownMat, inc };
}

/* SkeletonUtils.clone without the add-on: rebuild skin bindings on a deep clone */
function skeletonClone(T, src) {
  const c = src.clone(true);
  const bonesBy = {}; c.traverse((o) => { if (o.isBone) bonesBy[o.name] = o; });
  const srcMeshes = [], dstMeshes = [];
  src.traverse((o) => { if (o.isSkinnedMesh) srcMeshes.push(o); });
  c.traverse((o) => { if (o.isSkinnedMesh) dstMeshes.push(o); });
  dstMeshes.forEach((m, i) => {
    const s = srcMeshes[i];
    const bones = s.skeleton.bones.map((b) => bonesBy[b.name]);
    m.skeleton = new T.Skeleton(bones, s.skeleton.boneInverses);
    m.bind(m.skeleton, s.bindMatrix);
    m.material = s.material;
  });
  return c;
}

/* breathing: the chest bone widens a little. v is 0..1 from the case's respiratory cycle. */
export function breathe(h, v, amp) {
  const c = h.B("spine03"); if (!c) return;
  const a = amp || 0.03;
  c.scale.set(1 + a * v, 1, 1 + a * 1.3 * v);
}
