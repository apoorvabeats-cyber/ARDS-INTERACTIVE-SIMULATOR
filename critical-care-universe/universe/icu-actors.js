/* Patients on beds, ventilators and masks for the Living ICU (Meshy models, converted to small GLB files in ./icu-assets).
   Each patient GLB is a single static mesh (patient + bed, no skeleton), so the "alive" motion is done in the vertex shader:
     - the chest and upper belly rise and fall with the patient's respiratory phase (breath in 0..1),
     - the head turns and nods a little about the neck (masks and the tube are parented to it, so they follow),
     - the fingers curl and twitch now and then.
   Model frame: metres, long axis z, head toward -z, up +y, the patient looks toward +z. Visual only. */
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const cache = {};
export const loadGLB = (url) => cache[url] || (cache[url] = new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej)));
export const assetURL = (n) => new URL("./icu-assets/" + n + ".glb", import.meta.url).href;

/* Where things are on each patient (model frame). face = nose-to-mouth point on the skin surface: x, y (between nose and mouth), z (nose tip).
   Measured on the models; heads differ a little in height and turn. */
export const CFG = {
  f1: { hair: 0.012, x: -0.005, y: 0.478, z: -0.533, hand: 0 },
  f2: { hair: 0.02, x: 0.005, y: 0.480, z: -0.510, hand: 0 },
  f3: { hair: 0.03, x: 0.020, y: 0.470, z: -0.537, hand: 0, },
  m1: { hair: 0.02, x: 0.030, y: 0.480, z: -0.534, hand: 0 },
  m2: { hair: 0.012, x: 0.000, y: 0.498, z: -0.534, hand: 0 },
  m3: { hair: 0.015, x: 0.030, y: 0.495, z: -0.529, hand: 0 }
};
export const FLOOR = -0.627;     /* model y of the floor under the wheels */

/* which model for which cubicle: by sex, three each, in order (wraps if the case mix is lopsided) */
export function assignModels(P) {
  const n = { m: 0, f: 0 };
  return P.map((p) => { const s = (p.sx === "f" || /^\d+\s*F/i.test(p.hx || "")) ? "f" : "m"; return s + (1 + (n[s]++ % 3)); });
}

const VERT_DECL = `
uniform float uT; uniform float uBreath; uniform float uAmp; uniform vec3 uPivot; uniform vec3 uHeadC; uniform mat3 uHeadR;
uniform vec3 uChestC; uniform vec4 uFing; uniform vec3 uHandA; uniform vec3 uHandB;`;
const VERT_MOVE = `
vec3 transformed = vec3( position );
{
  /* chest and upper belly: swell outward along the surface with each breath */
  vec3 q = (position - uChestC) / vec3(0.24, 0.15, 0.22);
  float wc = 1.0 - smoothstep(0.55, 1.25, length(q));
  transformed += normalize(objectNormal) * (uBreath * uAmp) * wc + vec3(0.0, 0.4 * uBreath * uAmp * wc, 0.0);
  /* head: turn and nod about the neck */
  vec3 hq = (position - uHeadC) * vec3(1.0, 0.8, 1.0);
  float wh = 1.0 - smoothstep(0.125, 0.235, length(hq));
  vec3 rot = uHeadR * (position - uPivot) + uPivot;
  transformed += (rot - position) * wh;
  /* fingers: a slow curl and an occasional twitch on both hands */
  for (int k = 0; k < 2; k++) {
    vec3 hc = k == 0 ? uHandA : uHandB; float tw = k == 0 ? uFing.x : uFing.y;
    vec3 d = (position - hc) * vec3(1.0, 1.7, 1.0);
    float wf = 1.0 - smoothstep(0.035, 0.085, length(d));
    float fr = 0.5 + 0.5 * sin(position.x * 220.0 + position.z * 90.0);
    transformed.y += wf * (0.0035 * tw * (0.35 + fr) + 0.0012 * sin(uT * 1.3 + position.x * 60.0 + float(k) * 2.0));
    transformed.z += wf * 0.0025 * tw * fr;
    transformed.x += wf * 0.0018 * tw * (fr - 0.5);
  }
}`;

function motionMaterial(src, U) {
  const m = src.clone();
  m.customProgramCacheKey = () => "icuMotion1";
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VERT_DECL)
      .replace("#include <begin_vertex>", VERT_MOVE);
  };
  return m;
}

/* clone a loaded GLB scene for one cubicle (own materials, shared geometry), with the motion shader */
export function makePatient(T, gltf, key, phase) {
  const cfg = CFG[key], V = T.Vector3;
  const root = new T.Group(), model = gltf.scene.clone(true); root.add(model);
  const face = new V(cfg.x, cfg.y, cfg.z);
  const U = {
    uT: { value: 0 }, uBreath: { value: 0 }, uAmp: { value: 0.008 },
    uPivot: { value: new V(cfg.x, 0.33, cfg.z - 0.07) }, uHeadC: { value: new V(cfg.x, cfg.y + 0.06, cfg.z - 0.085) },
    uHeadR: { value: new T.Matrix3() }, uChestC: { value: new V(0, 0.2, -0.3) },
    uFing: { value: new T.Vector4(0, 0, 0, 0) }, uHandA: { value: new V(0.145, 0.10, -0.03) }, uHandB: { value: new V(-0.15, 0.10, -0.03) }
  };
  model.traverse((o) => { if (o.isMesh) { o.material = motionMaterial(o.material, U); o.frustumCulled = false; } });
  /* everything that rides on the head hangs from this pivot, so it follows the head's motion */
  const pivot = new T.Group(); pivot.position.copy(U.uPivot.value); root.add(pivot);
  const q = new T.Quaternion(), qa = new T.Quaternion(), qb = new T.Quaternion(), ax = new V(0, 0.97, 0.24).normalize(), ex = new V(1, 0, 0);
  const m4 = new T.Matrix4();
  const hm = cfg.hair || 0.015;
  const head = { C: new V(cfg.x, cfg.y + 0.06, cfg.z - 0.115), a: new V(0.082 + hm, 0.125 + hm * 0.6, 0.105 + hm) };   /* ellipsoid round the skull and hair, model frame */
  const A = { root, model, pivot, face, cfg, U, key, head };
  /* breath: 0..1 phase of the inspiration; rr: breaths a minute; effort: 0..1 (more movement when breathing hard) */
  A.tick = (t, breath, rr, effort) => {
    const tt = t + phase;
    U.uT.value = tt; U.uBreath.value = breath;
    U.uAmp.value = 0.011 + 0.007 * Math.min(1, Math.max(0, (rr - 14) / 22)) + 0.004 * (effort || 0);
    qa.setFromAxisAngle(ax, 0.05 * Math.sin(tt * 0.31) + 0.025 * Math.sin(tt * 0.83 + 1.0));
    qb.setFromAxisAngle(ex, 0.022 * Math.sin(tt * 0.47 + 0.6) + 0.01 * (breath - 0.5));
    q.copy(qa).multiply(qb); pivot.quaternion.copy(q);
    m4.makeRotationFromQuaternion(q); U.uHeadR.value.setFromMatrix4(m4);
    const pulse = (ph, per) => { const s = Math.sin(tt * 6.283 / per + ph); return Math.pow(Math.max(0, s), 8); };
    U.uFing.value.set(pulse(0.3, 5.3) + 0.15 * Math.sin(tt * 0.7), pulse(2.1, 7.1) + 0.15 * Math.sin(tt * 0.6 + 1), 0, 0);
  };
  return A;
}

/* ---- face equipment, modelled in the pivot frame (pivot at the neck) ---- */
const FACE_N = [0, 0.12, 0.993];
/* a copy of the mask geometry without the blue strap triangles (the strap colour is read from the texture) */
function bodyOnly(gl, mesh) {
  if (gl.userData.body) return gl.userData.body;
  const ge = mesh.geometry.clone(), uv = ge.attributes.uv, gp = ge.attributes.position, img = mesh.material.map && mesh.material.map.image;
  if (!img || !uv) return ge;
  const c = document.createElement("canvas"), w = c.width = 256, h = c.height = 256, x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h); const px = x.getImageData(0, 0, w, h).data;
  const blue = new Uint8Array(uv.count);
  for (let i = 0; i < uv.count; i++) { const k = (Math.min(h - 1, Math.max(0, Math.floor(uv.getY(i) * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(uv.getX(i) * w)))) * 4, r = px[k], g = px[k + 1], b = px[k + 2]; blue[i] = b > 90 && b > r * 1.5 && b > g * 1.3 ? 1 : 0; }
  const old = ge.index.array, keep = [];
  for (let i = 0; i < old.length; i += 3) if (blue[old[i]] + blue[old[i + 1]] + blue[old[i + 2]] < 1 || (gp.getZ(old[i]) + gp.getZ(old[i + 1]) + gp.getZ(old[i + 2])) / 3 > 0.16) keep.push(old[i], old[i + 1], old[i + 2]);
  ge.setIndex(keep); gl.userData.body = ge; gl.userData.blue = blue; return ge;
}

export function placeMask(T, A, mgltf, kind) {
  const V = T.Vector3, g = new T.Group(), m = mgltf.scene.clone(true);
  const S = kind === "niv" ? 0.12 : 0.066;
  const anchor = kind === "niv" ? new V(0, -0.2, 0.25) : new V(0, 0.0, -0.5);        /* the point of the mask that touches the face */
  const f = A.face, off = kind === "niv" ? { dy: -0.028 - (A.cfg.nivDy || 0), dz: -0.005 } : { dy: -0.008, dz: -0.026 };
  m.position.copy(anchor).multiplyScalar(-1); g.add(m);
  g.scale.set(S, kind === "niv" ? S : S * 0.95, S);
  g.position.set(f.x, f.y + off.dy, f.z + off.dz).sub(A.pivot.position);
  g.rotation.x = kind === "niv" ? 0.12 : -0.2;
  g.updateMatrix();
  if (kind === "niv" || kind === "mask") {
    /* the headgear drawn in the model is far too loose and cannot be fitted, so only the mask body is used: its blue strap triangles are
       removed (found from the texture) and snug straps are built to follow this patient's head */
    if (kind === "niv") m.traverse((o) => { if (o.isMesh) { o.geometry = bodyOnly(mgltf, o); o.frustumCulled = false; } });
    const C0 = A.head.C.clone().sub(A.pivot.position), f = A.face.clone().sub(A.pivot.position);
    const strapM = new T.MeshStandardMaterial({ color: kind === "niv" ? 0x1b3a9c : 0xe9f1f2, roughness: 0.8 });
    /* the head surface is probed in the model's own frame (a private copy of the skin at identity), so it works wherever the ward later puts the patient */
    A.root.updateMatrixWorld(true);
    const ray = new T.Raycaster(), skinG = new T.Group(), inv = new T.Matrix4().copy(A.root.matrixWorld).invert(), probeM = new T.MeshBasicMaterial({ side: T.DoubleSide });
    A.model.traverse((o) => {
      if (!o.isMesh) return;
      const pm = new T.Mesh(o.geometry, probeM); pm.matrixAutoUpdate = false; pm.matrix.multiplyMatrices(inv, o.matrixWorld); skinG.add(pm);
    });
    skinG.updateMatrixWorld(true);
    const skin = skinG.children, pp = A.pivot.position;
    const surf = (o, d) => {                                           /* first point of the head met from o (pivot frame) looking along d: the real skull/hair surface */
      ray.set(o.clone().add(pp), d.clone().normalize()); ray.far = 1.2;
      const h = ray.intersectObjects(skin, false)[0];
      return h ? h.point.clone().sub(pp) : null;
    };
    const ring = (y, x0, a0, a1, out) => {                              /* strap round the head at height y: from the clip at x0 on the face round to the back */
      const c = new V(C0.x, y, C0.z), pts = [], clip = surf(new V(x0, y, f.z + 0.2), new V(0, 0, -1));
      if (clip) pts.push(clip.add(new V(0, 0, out)));
      for (let i = 0; i <= 24; i++) {
        const t = (a0 + (a1 - a0) * i / 24) * Math.PI / 180, d = new V(Math.sin(t) * Math.sign(x0 || 1), 0, Math.cos(t)), o = c.clone().add(d.clone().multiplyScalar(0.4)),
          p = surf(o, d.clone().negate()); if (p && Math.hypot(p.x - c.x, p.z - c.z) < 0.145) pts.push(p.add(d.multiplyScalar(out)));
      }
      return pts;
    };
    A.probe = { ring };
    const straps = new T.Group(); straps.visible = false;
    const add = (pts, r) => { if (pts.length > 3) straps.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 70, r, 6), strapM)); };
    const crown = surf(new V(C0.x, f.y + 0.5, C0.z), new V(0, -1, 0));
    const yF = f.y + 0.062, y1 = f.y + 0.006, y2 = f.y - 0.032;
    if (kind === "mask") [-1, 1].forEach((sg) => {      /* thin elastic: from the mask sides, over the ears, round the back of the head */
      add(ring(f.y + 0.012, sg * 0.05, 14, 168, 0.003), 0.0028);
      add(ring(f.y - 0.022, sg * 0.047, 14, 168, 0.003), 0.0028);
    });
    else {
      /* the headgear clips that stay on the mask body: find them in the fitted mask, then run one strap back from each group of clips */
      g.updateMatrixWorld(true);
      const clips = [], bl = mgltf.userData.blue;
      m.traverse((o) => {
        if (!o.isMesh || !bl) return;
        const ix = o.geometry.index.array, seen = new Set(), pos = o.geometry.attributes.position;
        for (let i = 0; i < ix.length; i++) { const v = ix[i]; if (bl[v] && !seen.has(v)) { seen.add(v); clips.push(new V().fromBufferAttribute(pos, v).applyMatrix4(o.matrixWorld)); } }
      });
      [-1, 1].forEach((sg) => {
        const side = clips.filter((p) => p.x * sg > 0.03).sort((p, q) => p.y - q.y), groups = [];
        side.forEach((p) => { const gr = groups[groups.length - 1]; if (gr && p.y - gr.max < 0.014) { gr.pts.push(p); gr.max = p.y; } else groups.push({ pts: [p], max: p.y }); });
        groups.filter((gr) => gr.pts.length >= 10).forEach((gr) => {
          const c = gr.pts.reduce((a, p) => a.add(p), new V()).multiplyScalar(1 / gr.pts.length);
          const r = ring(c.y, c.x, 20, 168, 0.0035); r.unshift(c.clone());
          add(r, 0.0046);
        });
      });
      const top = clips.filter((p) => Math.abs(p.x) < 0.03 && p.y > f.y + 0.03);
      if (crown && top.length) {         /* strap from the forehead pad over the crown to the back of the head */
        const t0 = top.reduce((a, p) => a.add(p), new V()).multiplyScalar(1 / top.length), c = new V(C0.x, f.y + 0.03, C0.z), pts = [t0];
        for (let i = 0; i <= 22; i++) {
          const t = (14 + 140 * i / 22) * Math.PI / 180, d = new V(0, Math.sin(t), Math.cos(t)), p = surf(c.clone().add(d.clone().multiplyScalar(0.4)), d.clone().negate());
          if (p && Math.hypot(p.y - c.y, p.z - c.z) < 0.15) pts.push(p.add(d.multiplyScalar(0.0035)));
        }
        add(pts, 0.0046);
      }
    }
    g.add(straps); straps.matrixAutoUpdate = true;
    g.userData.straps = straps; straps.visible = true;
    /* the straps are in the pivot frame, not the mask frame: keep them there */
    g.remove(straps); A.pivot.add(straps); A.straps = straps;
  }
  g.rotation.x = kind === "niv" ? 0.12 : -0.2;
  g.userData.part = kind === "niv" ? "NIV mask" : "Oxygen mask";
  g.visible = false; A.pivot.add(g); A.mask = A.mask || {}; A.mask[kind] = g;
  { const sv = A.straps; Object.defineProperty(g, "visible", { get() { return this._v; }, set(v) { this._v = v; sv.visible = v; } }); g._v = false; sv.visible = false; }
  return g;
}

export function placeTube(T, A) {
  const V = T.Vector3, g = new T.Group(), f = A.face;
  const tube = new T.MeshStandardMaterial({ color: 0xe9f1f5, roughness: 0.35, transparent: true, opacity: 0.95 });
  const blue = new T.MeshStandardMaterial({ color: 0x2f8fe0, roughness: 0.5 }), white = new T.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.8 });
  const n = new V(0, 0.1, 0.995).normalize(), up = new V(0, 1, 0);
  const mouth = new V(f.x, f.y - 0.011, f.z + 0.002);                      /* centre of the lips */
  const along = (r, a, b, mat) => { const L = b.clone().sub(a), c = new T.Mesh(new T.CylinderGeometry(r, r, L.length(), 14), mat); c.position.copy(a).addScaledVector(L, 0.5); c.quaternion.setFromUnitVectors(up, L.clone().normalize()); g.add(c); return c; };
  const tin = mouth.clone().addScaledVector(n, -0.02), tout = mouth.clone().addScaledVector(n, 0.085);
  along(0.0075, tin, tout, tube);                                           /* the tube goes in between the lips and out along the face */
  along(0.0115, tout, tout.clone().addScaledVector(n, 0.03), blue);          /* connector */
  const plate = new T.Mesh(new T.BoxGeometry(0.05, 0.022, 0.005), white); plate.position.copy(mouth).addScaledVector(n, 0.008); plate.quaternion.setFromUnitVectors(new V(0, 0, 1), n); g.add(plate);   /* tube holder */
  /* tape / tie: a white tie from each side of the holder plate, over the cheeks, past the ears and round the back of the head */
  [-1, 1].forEach((sg) => {
    const pts = A.probe.ring(mouth.y - A.pivot.position.y - 0.001, sg * 0.027, 12, 168, 0.003);
    pts.unshift(new V(mouth.x + sg * 0.022, mouth.y, mouth.z + 0.004).sub(A.pivot.position));
    if (pts.length > 3) { const t = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 70, 0.0034, 6), white); t.position.add(A.pivot.position); g.add(t); }
  });
  g.position.sub(A.pivot.position); g.userData.part = "Endotracheal tube"; g.visible = false; A.pivot.add(g); A.tube = g;
  A.connector = tout.clone().addScaledVector(n, 0.03);      /* where the ventilator circuit clips on (model frame) */
  return g;
}

/* small sleeping-level fix for phones: halve the textures so six patients fit in memory */
export function shrinkTextures(root, max) {
  root.traverse((o) => {
    if (!o.isMesh) return; const m = o.material;
    ["map", "normalMap", "metalnessMap", "roughnessMap"].forEach((k) => {
      const t = m[k]; if (!t || !t.image || !t.image.width || t.image.width <= max) return;
      const c = document.createElement("canvas"), r = max / t.image.width; c.width = max; c.height = Math.round(t.image.height * r);
      c.getContext("2d").drawImage(t.image, 0, 0, c.width, c.height); t.image = c; t.needsUpdate = true;
    });
  });
}
