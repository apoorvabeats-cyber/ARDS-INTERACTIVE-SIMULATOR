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
  return { sex, age, key: sex === "m" ? "male_ref" : sex + (age < 36 ? "28" : age < 58 ? "48" : "68") };
}

export function loadArchetype(url) {
  if (!cache[url]) cache[url] = new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
  return cache[url];
}

/* find a bone by its original name */
const bone = (root, name) => { let f = null; const k = clean(name); root.traverse((o) => { if (o.isBone && o.name === k) f = o; }); return f; };


/* Skin detail without UVs: pores, fine wrinkles, tonal blotches, redness and a soft sub-surface rim, all from noise in the
   model's rest-pose position (so it does not swim when the body is posed). Detail fades with distance to avoid shimmer. */
function skinShade(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vRest;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
varying vec3 vRest;
float h31(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float skinH(vec3 p){
  float pores=smoothstep(.62,.92,vn(p*380.0));
  float fine=vn(p*900.0);
  float crease=abs(vn(p*70.0)-.5);
  return -pores*.9+fine*.3+crease*.9;
}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
{ float t1=vn(vRest*13.0), t2=vn(vRest*47.0);
  diffuseColor.rgb*=mix(vec3(.92,.89,.89),vec3(1.06,1.01,.99),t1);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,.8,.76),smoothstep(.55,.92,t2)*.4); }`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ float h=skinH(vRest); vec3 dx=dFdx(-vViewPosition), dy=dFdy(-vViewPosition);
  float px=length(dx)+length(dy); float fade=smoothstep(.0065,.0016,px);
  vec3 r1=cross(dy,normal), r2=cross(normal,dx); float det=dot(dx,r1);
  vec3 grad=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);
  normal=normalize(abs(det)*normal-grad*.00032*fade); }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
{ float fr=pow(1.0-saturate(dot(normalize(normal),normalize(vViewPosition))),2.2); totalEmissiveRadiance+=vec3(.30,.07,.04)*fr*.5; }`);
  };
  mat.customProgramCacheKey = () => "skin1";
  return mat;
}

export function build(T, gltf, p, opt) {
  const g = new T.Group();
  const clone = skeletonClone(T, gltf.scene);
  g.add(clone);
  const B = (n) => bone(clone, n);
  const tint = (opt && opt.skin) || 0xb98262;
  const skinMat = new T.MeshPhysicalMaterial({ color: tint, roughness: 0.55, metalness: 0, sheen: 0.5, sheenColor: new T.Color(0xff9a80), sheenRoughness: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.5 });
  skinShade(skinMat);
  const gownMat = new T.MeshStandardMaterial({ color: (opt && opt.gown) || 0x8fc4d6, roughness: 0.9, side: T.DoubleSide });
  const sm = [];
  clone.traverse((o) => { if (o.isSkinnedMesh) sm.push(o); });
  /* hospital shorts: a slightly inflated copy of the skin triangles around the pelvis and thighs, skinned to the same bones */
  { const src = sm.find((o) => o.material && o.material.name === "skin");
    if (src && src.geometry.index && !((src.parent && src.parent.userData.noShorts) || src.userData.noShorts)) {
      const g0 = src.geometry, pos = g0.attributes.position, nor = g0.attributes.normal, idx = g0.index.array, keep = [];
      const ok = (v) => { const y = pos.getY(v); return y > -0.3 && y < 0.17 && Math.abs(pos.getX(v)) < 0.3; };
      for (let i = 0; i < idx.length; i += 3) if (ok(idx[i]) && ok(idx[i + 1]) && ok(idx[i + 2])) keep.push(idx[i], idx[i + 1], idx[i + 2]);
      if (keep.length) {
        const g1 = new T.BufferGeometry(), n = pos.count, P = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { P[i * 3] = pos.getX(i) + nor.getX(i) * 0.007; P[i * 3 + 1] = pos.getY(i) + nor.getY(i) * 0.007; P[i * 3 + 2] = pos.getZ(i) + nor.getZ(i) * 0.007; }
        g1.setAttribute("position", new T.BufferAttribute(P, 3)); g1.setAttribute("normal", nor); g1.setAttribute("skinIndex", g0.attributes.skinIndex); g1.setAttribute("skinWeight", g0.attributes.skinWeight);
        g1.setIndex(keep);
        const sh = new T.SkinnedMesh(g1, gownMat); sh.name = "shorts"; sh.frustumCulled = false;
        src.parent.add(sh); sh.bind(src.skeleton, src.bindMatrix);
      }
    } }
  sm.forEach((o) => { o.frustumCulled = false; o.material = o.material && o.material.name === "skin" ? skinMat : (o.material && o.material.name === "gown" ? gownMat : skinMat); });

  /* ---- pose (T-pose → resting in bed) ---- */
  const rot = (b, x, y, z) => { if (b) b.rotation.set(x || 0, y || 0, z || 0); };
  const inc = (opt && opt.incline) != null ? opt.incline : 0.52;
  rot(B("spine05"), inc);
  rot(B("neck01"), 0.3); rot(B("head"), 0.22);
  const arm = (opt && opt.pose) || 0;
  /* aim a bone so that the line to its child points along a model-space direction (bones are world-aligned in the T-pose) */
  const aim = (bn, cn, dir) => {
    if (!bn || !cn) return;
    clone.updateMatrixWorld(true);
    const bp = new T.Vector3(), cp = new T.Vector3(); bn.getWorldPosition(bp); cn.getWorldPosition(cp);
    const q = new T.Quaternion().setFromUnitVectors(cp.sub(bp).normalize(), dir.clone().normalize());
    const bw = new T.Quaternion(), pw = new T.Quaternion(); bn.getWorldQuaternion(bw); bn.parent.getWorldQuaternion(pw);
    bn.quaternion.copy(pw.invert().multiply(q).multiply(bw)); clone.updateMatrixWorld(true);
  };
  [["L", 1], ["R", -1]].forEach(([s, k]) => {
    /* arms rest beside the body; on some patients the near forearm is folded across the abdomen */
    const fold = (arm % 3 === 1 && s === "L") || (arm % 3 === 2 && s === "R");
    aim(B("upperarm01." + s), B("lowerarm01." + s), new T.Vector3(k * 0.2, -0.95, -0.26));
    aim(B("lowerarm01." + s), B("wrist." + s), fold ? new T.Vector3(-k * 0.55, -0.55, 0.45) : new T.Vector3(k * 0.1, -0.99, -0.03));
    rot(B("upperleg01." + s), 0, 0, -k * 0.07);
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
    const lidMat = skinShade(skinMat.clone());
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
