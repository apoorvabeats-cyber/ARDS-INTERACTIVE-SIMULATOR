/* Doctor avatars for the shared ICU hall.
   Uses the same rigged human bodies as the ward patients (patients/male_ref.glb, female_ref.glb; bones are world-aligned in the
   T-pose, so a pose is a rotation per joint), puts them in scrubs and a white coat, and gives them a walking cycle and a name tag.
   createDoctor(T, gltf, { name, spec, sex, label }) -> { group, setMoving(speed 0..1), update(dt), setLabel(text) }          */
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { applyLook, sanitize } from "./doctor-look.js?v=20261124g";

const cache = {};
export function loadDoctorBody(sex) {
  const url = new URL("./patients/" + (sex === "f" ? "female_ref" : "male_ref") + ".glb", import.meta.url).href;
  if (!cache[url]) cache[url] = new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
  return cache[url];
}

export const SPEC = {
  intensivist: ["Intensivist", 0x1f77c4], pulmonologist: ["Pulmonologist", 0x16a39a], cardiologist: ["Cardiologist", 0xc2415a],
  nephrologist: ["Nephrologist", 0x7e57c2], infectious: ["Infectious disease", 0xd98a1d], gastroenterologist: ["Gastroenterologist", 0x4caf50],
  surgeon: ["Surgeon", 0x2f8f5b], neurologist: ["Neurologist", 0x8d6e63],
};
export const specInfo = (s) => SPEC[s] || ["Doctor", 0x4a90a4];
const clean = (n) => n.replace(/[.\s]/g, "");

function skeletonClone(T, src) {
  const c = src.clone(true), bonesBy = {}; c.traverse((o) => { if (o.isBone) bonesBy[o.name] = o; });
  const a = [], b = []; src.traverse((o) => { if (o.isSkinnedMesh) a.push(o); }); c.traverse((o) => { if (o.isSkinnedMesh) b.push(o); });
  b.forEach((m, i) => { const s = a[i], bones = s.skeleton.bones.map((x) => bonesBy[x.name]); m.skeleton = new T.Skeleton(bones, s.skeleton.boneInverses); m.bind(m.skeleton, s.bindMatrix); m.material = s.material; });
  return c;
}

export function nameTag(T, name, spec, accent) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d");
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = "rgba(8,16,28,.82)"; rr(4, 4, 504, 120, 28); g.fill();
  g.strokeStyle = "#" + new T.Color(accent).getHexString(); g.lineWidth = 5; rr(4, 4, 504, 120, 28); g.stroke();
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "700 46px system-ui, sans-serif"; g.fillText(name.length > 20 ? name.slice(0, 19) + "…" : name, 256, 48);
  g.fillStyle = "#" + new T.Color(accent).getHexString(); g.font = "600 30px system-ui, sans-serif"; g.fillText(spec, 256, 92);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.5, 0.375, 1); sp.renderOrder = 10; return sp;
}

export function createDoctor(T, gltf, o) {
  const lk = o.look ? sanitize(o.look, o.sex) : null; if (lk) o = { ...o, sex: lk.sex };
  const V = T.Vector3, g = new T.Group(), body = new T.Group(); g.add(body);
  const clone = skeletonClone(T, gltf.scene); body.add(clone);
  const B = (n) => { let f = null; const k = clean(n); clone.traverse((x) => { if (x.isBone && x.name === k) f = x; }); return f; };
  const [specName, accent] = specInfo(o.spec);
  const tints = [0xb98262, 0xa9714f, 0xc28e68, 0xb07a58, 0xc69773, 0x9f6a49];
  let h = 0; for (const ch of String(o.name || "x")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const skin = new T.MeshStandardMaterial({ color: tints[h % tints.length], roughness: 0.6 });
  const scrub = new T.MeshStandardMaterial({ color: accent, roughness: 0.85, side: T.DoubleSide });
  const coatM = new T.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.8, side: T.DoubleSide });
  const sm = []; clone.traverse((x) => { if (x.isSkinnedMesh) sm.push(x); });
  sm.forEach((x) => { x.frustumCulled = false; x.material = x.material && x.material.name === "gown" ? scrub : skin; });

  /* white coat: a slightly inflated copy of the upper part of the hospital top, skinned to the same bones */
  let coatMesh = null;
  if (lk ? false : o.spec !== "surgeon") {
    const src = sm.find((x) => x.material === scrub);
    if (src && src.geometry.index) {
      const g0 = src.geometry, pos = g0.attributes.position, nor = g0.attributes.normal, idx = g0.index.array, keep = [];
      const ok = (v) => pos.getY(v) > -0.1;
      for (let i = 0; i < idx.length; i += 3) if (ok(idx[i]) && ok(idx[i + 1]) && ok(idx[i + 2])) keep.push(idx[i], idx[i + 1], idx[i + 2]);
      if (keep.length) {
        const g1 = new T.BufferGeometry(), n = pos.count, P = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { P[i * 3] = pos.getX(i) + nor.getX(i) * 0.02; P[i * 3 + 1] = pos.getY(i) + nor.getY(i) * 0.02 - (pos.getY(i) < 0.2 ? 0.5 * (0.2 - pos.getY(i)) : 0); P[i * 3 + 2] = pos.getZ(i) + nor.getZ(i) * 0.02; }
        g1.setAttribute("position", new T.BufferAttribute(P, 3)); g1.setAttribute("normal", nor); g1.setAttribute("skinIndex", g0.attributes.skinIndex); g1.setAttribute("skinWeight", g0.attributes.skinWeight); g1.setIndex(keep);
        const cm = new T.SkinnedMesh(g1, coatM); cm.frustumCulled = false; coatMesh = cm; src.parent.add(cm); cm.bind(src.skeleton, src.bindMatrix);
      }
    }
  }
  /* hair, sized from the eye bones */
  const head = B("head"), eL = B("eye.L"), eR = B("eye.R");
  clone.updateMatrixWorld(true);
  let fit = { sx: 1, sz: 1, scale: 1, lean: 0 };
  if (lk) fit = applyLook(T, { clone, head, eL, eR, B, skin, scrub, coatM, coatMesh, sm, accent, name: o.name, specName }, lk);
  else if (head && eL && eR) {
    const wl = new V(), wr = new V(); eL.getWorldPosition(wl); eR.getWorldPosition(wr);
    const inv = new T.Matrix4().copy(head.matrixWorld).invert(), lL = wl.clone().applyMatrix4(inv), lR = wr.clone().applyMatrix4(inv), eyeD = lL.distanceTo(lR) || 0.062;
    const hair = new T.MeshStandardMaterial({ color: o.sex === "f" ? 0x1a100c : 0x141414, roughness: 0.85 }), hr = eyeD * 1.62, cx = (lL.x + lR.x) / 2, cy = (lL.y + lR.y) / 2, cz = (lL.z + lR.z) / 2;
    const cap = new T.Mesh(new T.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), hair);
    cap.scale.set(hr * 0.98, hr * 1.1, hr * 1.12); cap.position.set(cx, cy + eyeD * 0.75, cz - eyeD * 0.68); cap.rotation.x = -0.22; head.add(cap);
    if (o.sex === "f") { const bk = new T.Mesh(new T.SphereGeometry(1, 16, 12), hair); bk.scale.set(hr * 0.92, hr * 1.5, hr * 0.7); bk.position.set(cx, cy - eyeD * 0.35, cz - eyeD * 1.1); head.add(bk); }
  }

  /* arms down by the sides (A-pose); remember each bone's resting rotation so the swing can be layered on it */
  const aim = (bn, cn, dir) => {
    if (!bn || !cn) return; clone.updateMatrixWorld(true);
    const bp = new V(), cp = new V(); bn.getWorldPosition(bp); cn.getWorldPosition(cp);
    const q = new T.Quaternion().setFromUnitVectors(cp.sub(bp).normalize(), dir.clone().normalize());
    const bw = new T.Quaternion(), pw = new T.Quaternion(); bn.getWorldQuaternion(bw); bn.parent.getWorldQuaternion(pw);
    bn.quaternion.copy(pw.invert().multiply(q).multiply(bw)); clone.updateMatrixWorld(true);
  };
  [["L", 1], ["R", -1]].forEach(([s, k]) => {
    aim(B("upperarm01." + s), B("lowerarm01." + s), new V(k * 0.2, -0.97, 0.02));
    aim(B("lowerarm01." + s), B("wrist." + s), new V(k * 0.1, -0.95, 0.2));
  });
  const joints = {}; ["upperarm01.L", "upperarm01.R", "lowerarm01.L", "lowerarm01.R", "upperleg01.L", "upperleg01.R", "lowerleg01.L", "lowerleg01.R", "spine05", "head"].forEach((n) => { const b = B(n); if (b) joints[n] = { b, q: b.quaternion.clone() }; });
  const qx = new T.Quaternion(), AX = new V(1, 0, 0), swing = (n, a) => { const j = joints[n]; if (!j) return; qx.setFromAxisAngle(AX, a); j.b.quaternion.copy(qx).multiply(j.q); };

  /* scale so the figure matches the real model height, then stand on the floor */
  const box = new T.Box3().setFromObject(clone); const hgt = box.max.y - box.min.y || 1.7;
  body.position.y = -box.min.y; const k0 = (o.sex === "f" ? 1.66 : 1.76) / hgt * fit.scale; body.scale.set(k0 * fit.sx, k0, k0 * fit.sz); body.position.y *= k0;

  const tag = nameTag(T, o.name || "Doctor", specName, accent); tag.position.y = 2.12; g.add(tag);
  let phase = 0, mv = 0, want = 0, look = 0, seat = 0, seatWant = 0; const by0 = body.position.y;
  return {
    group: g, tag, accent,
    setMoving(v) { want = v; },
    setLook(r) { look = Math.max(-0.1, Math.min(0.1, r * 0.18)); }   /* only a slight turn of the head */,
    setSeated(v) { seatWant = v ? 1 : 0; },
    setLabel(name, specLabel) { const t = nameTag(T, name, specLabel, accent); tag.material.map.dispose(); tag.material.map = t.material.map; tag.material.needsUpdate = true; },
    update(dt) {
      seat += (seatWant - seat) * Math.min(1, dt * 5); mv += (want * (1 - seat) - mv) * Math.min(1, dt * 8); phase += dt * (3.2 + 4.2 * mv) * (mv > 0.05 ? 1 : 0.2);
      const s = Math.sin(phase), a = mv * 0.62;
      const sa = seat;                                          // seated: thighs level, shins down, hands out onto the table
      swing("upperleg01.L", -s * a - 1.5 * sa); swing("upperleg01.R", s * a - 1.5 * sa);
      swing("lowerleg01.L", Math.max(0, Math.sin(phase + 1.6)) * a * 1.5 + 1.5 * sa); swing("lowerleg01.R", Math.max(0, Math.sin(phase + 1.6 + Math.PI)) * a * 1.5 + 1.5 * sa);
      swing("upperarm01.L", s * a * 0.55 - 0.55 * sa); swing("upperarm01.R", -s * a * 0.55 - 0.55 * sa);
      swing("lowerarm01.L", -0.12 - mv * 0.25 - 0.8 * sa); swing("lowerarm01.R", -0.12 - mv * 0.25 - 0.8 * sa);
      swing("spine05", 0.03 * mv + fit.lean + 0.1 * sa);
      body.position.y = by0 - 0.47 * sa; body.position.z = -0.1 * sa;            // sitting lowers the hips onto the chair
      const j = joints.head; if (j) { qx.setFromAxisAngle(new V(0, 1, 0), look); j.b.quaternion.copy(qx).multiply(j.q); }
    },
  };
}
