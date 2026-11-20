/* The MetaPerson avatar for the auditorium. The model is a T-pose skeleton with no animation of its own, so every pose is built here:
   each bone is turned to an absolute orientation (relative to its rest pose, in the figure's own frame: x to her left, y up, z forward),
   which works whatever the bone's local axes are.
   createVisitor(T, gltf, { mode: "walk" | "sit", height }) -> { group, update(dt, moving 0..1), hipsHeight }                                       */
import { GLTFLoader } from "./vendor/GLTFLoader.js";

let once = null;
export function loadVisitor() {
  if (!once) once = new Promise((res, rej) => new GLTFLoader().load(new URL("./avatar/visitor.glb", import.meta.url).href, res, undefined, rej));
  return once;
}
/* each caller gets its own copy of the model (a skinned mesh cannot be shared between two bodies) */
export function loadVisitorCopy() { return new Promise((res, rej) => new GLTFLoader().load(new URL("./avatar/visitor.glb", import.meta.url).href, res, undefined, rej)); }

export function createVisitor(T, gltf, o) {
  o = o || {};
  const V = T.Vector3, Q = T.Quaternion, root = gltf.scene, g = new T.Group(), inner = new T.Group(); g.add(inner); inner.add(root);
  root.traverse((n) => { if (n.isMesh) { n.frustumCulled = false; n.castShadow = false; n.receiveShadow = false; const m = n.material; if (m) { m.side = T.FrontSide; if (m.map) m.map.anisotropy = 4; } } });
  /* the bones that really move the skin (the file has a few empty helper nodes with the same names) */
  const bones = {}; root.traverse((n) => { if (n.isSkinnedMesh) n.skeleton.bones.forEach((b) => { if (!bones[b.name] || b.children.length > bones[b.name].children.length) bones[b.name] = b; }); });
  root.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(root), hgt = (box.max.y - box.min.y) || 1.8, sc = (o.height || 1.66) / (bones.Head ? bones.Head.getWorldPosition(new V()).y + 0.12 : hgt);
  inner.scale.setScalar(sc);
  const rest = {}, wq = new Q();
  const J = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftArm", "RightArm", "LeftForeArm", "RightForeArm", "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg", "LeftFoot", "RightFoot", "LeftHand", "RightHand"];
  J.forEach((n) => { const b = bones[n]; if (b) { b.getWorldQuaternion(wq); rest[n] = { b, w: wq.clone(), l: b.quaternion.clone(), p: b.position.clone() }; } });
  const X = new V(1, 0, 0), Y = new V(0, 1, 0), Z = new V(0, 0, 1), qa = new Q(), qb = new Q(), pq = new Q(), rq = new Q();
  /* the figure's frame in the world: the rest world rotations were taken with the group at identity, so remove the group's own turn */
  const R = (ax, a) => new Q().setFromAxisAngle(ax, a);
  /* turn bone n so that its world orientation is  rot * rest  (rot is expressed in the figure's frame) */
  const aim = (n, rot) => {
    const r = rest[n]; if (!r) return; const b = r.b;
    b.parent.getWorldQuaternion(pq); g.getWorldQuaternion(rq);
    /* desired world = group * rot * (rest relative to the group at rest) */
    qa.copy(rq).multiply(rot).multiply(r.w);
    b.quaternion.copy(pq.invert().multiply(qa)); b.updateMatrixWorld(true);
  };
  const rz = (a) => R(Z, a), rx = (a) => R(X, a), ry = (a) => R(Y, a);
  const armDown = 1.18;
  let phase = Math.random() * 6, mv = 0, sit = 0, look = 0, lookT = 0;
  const standHip = rest.Hips ? rest.Hips.p.y : 0.95;
  const api = {
    group: g, scale: sc, hipsHeight: standHip * sc, mode: o.mode || "walk",
    update(dt, moving) {
      mv += ((moving == null ? 1 : moving) - mv) * Math.min(1, dt * 6);
      phase += dt * (2.2 + 3.4 * mv) * (mv > 0.05 ? 1 : 0.15);
      lookT -= dt; if (lookT < 0) { lookT = 2 + Math.random() * 3; look = (Math.random() - 0.5) * (api.mode === "sit" ? 0.9 : 0.35); }
      const s = Math.sin(phase), c = Math.cos(phase);
      if (api.mode === "sit") {
        /* seated: thighs forward, shins down, hands resting on the lap, a slight lean; breathing moves the shoulders */
        const br = Math.sin(phase * 0.5) * 0.015;
        aim("Hips", rx(0.08));
        aim("Spine", rx(0.04 + br)); aim("Spine1", rx(0.03 + br)); aim("Spine2", rx(0.02 + br));
        aim("LeftUpLeg", rx(-1.38).multiply(rz(-0.05))); aim("RightUpLeg", rx(-1.38).multiply(rz(0.05)));
        aim("LeftLeg", rx(0.12)); aim("RightLeg", rx(0.12));
        aim("LeftFoot", rx(-0.05)); aim("RightFoot", rx(-0.05));
        aim("LeftArm", rx(-0.32).multiply(rz(-armDown + 0.08))); aim("RightArm", rx(-0.32).multiply(rz(armDown - 0.08)));
        aim("LeftForeArm", rx(-1.3).multiply(rz(-armDown - 0.62))); aim("RightForeArm", rx(-1.3).multiply(rz(armDown + 0.62)));
        aim("Neck", ry(look * 0.4)); aim("Head", ry(look * 0.7).multiply(rx(0.05)));
      } else {
        const A = 0.5 * mv, K = 0.95 * mv, arm = 0.5 * mv;
        const fl = A * s, fr = -A * s;                                        /* forward swing of each thigh, in radians */
        aim("Hips", ry(0.06 * s * mv).multiply(rz(0.025 * c * mv)));
        aim("Spine", ry(-0.05 * s * mv)); aim("Spine1", ry(-0.04 * s * mv)); aim("Spine2", ry(-0.03 * s * mv).multiply(rx(0.03 * mv)));
        aim("LeftUpLeg", rx(-fl)); aim("RightUpLeg", rx(-fr));
        aim("LeftLeg", rx(-fl + K * Math.max(0, Math.sin(phase + 1.7)))); aim("RightLeg", rx(-fr + K * Math.max(0, Math.sin(phase + 1.7 + Math.PI))));
        aim("LeftFoot", rx(-fl * 0.15 + 0.18 * Math.max(0, Math.sin(phase + 1.7)) * mv)); aim("RightFoot", rx(-fr * 0.15 + 0.18 * Math.max(0, Math.sin(phase + 1.7 + Math.PI)) * mv));
        aim("LeftArm", rx(arm * s).multiply(rz(-armDown))); aim("RightArm", rx(-arm * s).multiply(rz(armDown)));
        aim("LeftForeArm", rx(arm * s - 0.25 - 0.3 * mv).multiply(rz(-armDown + 0.05))); aim("RightForeArm", rx(-arm * s - 0.25 - 0.3 * mv).multiply(rz(armDown - 0.05)));
        aim("Neck", ry(look * 0.3)); aim("Head", ry(look * 0.6));
        inner.position.y = Math.abs(Math.cos(phase)) * 0.012 * mv;           /* a faint rise and fall with each step */
      }
    },
  };
  api.update(0, o.mode === "sit" ? 0 : 1);
  return api;
}
