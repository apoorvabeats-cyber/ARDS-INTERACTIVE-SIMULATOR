/* The five doctor avatars (Meshy models, converted to small GLB files in ./avatars) for the shared team room.
   Each model is one static mesh, so it is posed in the vertex shader (the same idea as the ward patients): the legs swing and bend at hip and
   knee, the arms swing at shoulder and elbow, the body leans at the waist and the head turns. Weights come from where a vertex sits on the
   standing figure, so the white coat follows the thighs and the sleeves follow the arms.
   createRigDoctor(T, gltf, { name, spec, key, outfit:{coat,scrub}, noTag }) -> { group, tag, accent, setMoving(0..1), setSeated(bool), setLook(rad), setLabel(name, spec), update(dt) }
   Visual only. */
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { nameTag, specInfo } from "./doctor-avatar.js?v=20261124g";

export const AVATARS = {
  dr1: { sex: "m", label: "Dark hair, beard", h: 1.78 },
  dr2: { sex: "f", label: "Hair up, smiling", h: 1.66 },
  dr3: { sex: "f", label: "Blonde bob", h: 1.68 },
  dr4: { sex: "m", label: "Glasses", h: 1.76 },
  dr5: { sex: "m", label: "Silver hair, beard", h: 1.80 },
};
export const AVATAR_KEYS = Object.keys(AVATARS);
export const avatarThumb = (k) => new URL("./avatars/" + k + ".jpg", import.meta.url).href;

const cache = {};
export const loadAvatar = (k) => {
  if (!AVATARS[k]) return Promise.reject(new Error("unknown avatar"));
  const url = new URL("./avatars/" + k + ".glb", import.meta.url).href;
  return cache[url] || (cache[url] = new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej)));
};

/* joints of the standing figure (the model is 1.9 m tall, feet at y = -0.95, facing +z) */
const R = { hipY: -0.03, hipX: 0.085, kneeY: -0.47, shY: 0.58, shX: 0.18, elY: 0.03, waistY: 0.04, neckY: 0.63, H: 1.9 };

/* optional change of clothes: the white coat and the blue scrubs are found by colour in the texture and re-tinted (shoes and face are left alone) */
const FDECL = `
uniform vec3 uCoat, uScrub; uniform float uOutfit; varying float vRy;
vec3 outfit(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float sat = (mx - mn) / max(mx, 1e-4);
  float warm = smoothstep(0.55, 0.85, c.b / max(c.r, 1e-3));                                    /* skin and hair are warm; coat, shadows and scrubs are not */
  float blueW = smoothstep(0.52, 0.72, sat) * smoothstep(0.35, 0.55, (c.b - max(c.r, c.g * 0.8)) / max(mx, 1e-3)) * step(0.02, mx);
  float body = smoothstep(-0.88, -0.84, vRy) * (1.0 - smoothstep(0.58, 0.64, vRy));            /* not the shoes, not the head */
  float whiteW = (1.0 - smoothstep(0.22, 0.45, sat)) * smoothstep(0.08, 0.24, mx) * warm * body;
  vec3 coat = uCoat * clamp(lum / 0.80, 0.0, 1.25), scrub = uScrub * clamp(lum / 0.16, 0.0, 1.7);
  return mix(mix(c, coat, whiteW), scrub, blueW * body);
}`;

const DECL = `
uniform vec2 uHip, uKnee, uSh, uEl; uniform float uLean, uYaw;
const float hipY = ${R.hipY.toFixed(3)}, hipX = ${R.hipX.toFixed(3)}, kneeY = ${R.kneeY.toFixed(3)}, shY = ${R.shY.toFixed(3)}, shX = ${R.shX.toFixed(3)}, elY = ${R.elY.toFixed(3)}, waistY = ${R.waistY.toFixed(3)}, neckY = ${R.neckY.toFixed(3)};
/* forward angle a about the x axis through pivot pv, weighted by w */
void rotX(inout vec3 p, inout vec3 n, vec3 pv, float a, float w) {
  float t = a * w; if (abs(t) < 0.0004) return; float c = cos(t), s = sin(t);
  vec3 d = p - pv; p = pv + vec3(d.x, c * d.y + s * d.z, -s * d.y + c * d.z);
  n = vec3(n.x, c * n.y + s * n.z, -s * n.y + c * n.z);
}
void rotY(inout vec3 p, inout vec3 n, vec3 pv, float a, float w) {
  float t = a * w; if (abs(t) < 0.0004) return; float c = cos(t), s = sin(t);
  vec3 d = p - pv; p = pv + vec3(c * d.x + s * d.z, d.y, -s * d.x + c * d.z);
  n = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z);
}
void pose(vec3 p0, vec3 n0, out vec3 pOut, out vec3 nOut) {
  float aw = smoothstep(0.20, 0.26, abs(p0.x)) * (1.0 - smoothstep(shY + 0.03, shY + 0.10, p0.y)) * smoothstep(-0.42, -0.30, p0.y);     /* arm weight (not the shoes) */
  float wh = (1.0 - smoothstep(hipY - 0.12, hipY + 0.07, p0.y)) * (1.0 - aw), wk = (1.0 - smoothstep(kneeY - 0.07, kneeY + 0.07, p0.y));
  float wl = smoothstep(-0.045, 0.045, p0.x);
  vec3 pL = p0, nL = n0, pR = p0, nR = n0;
  rotX(pL, nL, vec3(hipX, kneeY, 0.0), -uKnee.x, wk * wh); rotX(pL, nL, vec3(hipX, hipY, 0.0), uHip.x, wh);
  rotX(pR, nR, vec3(-hipX, kneeY, 0.0), -uKnee.y, wk * wh); rotX(pR, nR, vec3(-hipX, hipY, 0.0), uHip.y, wh);
  vec3 p = mix(pR, pL, wl), n = mix(nR, nL, wl);
  /* arms */
  float sd = p0.x > 0.0 ? 1.0 : -1.0; vec3 pA = p0, nA = n0; float we = (1.0 - smoothstep(elY - 0.07, elY + 0.07, p0.y));
  vec2 sh = vec2(uSh.x, uSh.y), el = vec2(uEl.x, uEl.y);
  rotX(pA, nA, vec3(sd * shX - sd * 0.02, elY, 0.0), sd > 0.0 ? el.x : el.y, aw * we);
  rotX(pA, nA, vec3(sd * shX, shY, 0.0), sd > 0.0 ? sh.x : sh.y, aw);
  p = mix(p, pA, aw); n = mix(n, nA, aw);
  /* waist lean, head turn */
  rotX(p, n, vec3(0.0, waistY, 0.0), uLean, smoothstep(waistY - 0.12, waistY + 0.12, p0.y));
  rotY(p, n, vec3(0.0, neckY, 0.0), uYaw, smoothstep(neckY - 0.03, neckY + 0.05, p0.y) * (1.0 - aw));
  pOut = p; nOut = normalize(n);
}`;

function rigMaterial(T, src, U) {
  const m = src.clone();
  m.customProgramCacheKey = () => "docRig2";
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + FDECL)
      .replace("#include <map_fragment>", "#include <map_fragment>\n#ifdef USE_MAP\nif (uOutfit > 0.5) diffuseColor.rgb = outfit(diffuseColor.rgb);\n#endif");
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vRy;\n" + DECL)
      .replace("#include <beginnormal_vertex>", "vec3 rigP, rigN; pose(position, normal, rigP, rigN); vec3 objectNormal = rigN;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif")
      .replace("#include <begin_vertex>", "vec3 transformed = rigP; vRy = position.y;");
  };
  return m;
}

export function createRigDoctor(T, gltf, o) {
  const key = AVATARS[o.key] ? o.key : "dr1", A = AVATARS[key], V = T.Vector3;
  const [specName, accent] = specInfo(o.spec);
  const g = new T.Group(), body = new T.Group(); g.add(body);
  const U = { uHip: { value: new T.Vector2() }, uKnee: { value: new T.Vector2() }, uSh: { value: new T.Vector2() }, uEl: { value: new T.Vector2() }, uLean: { value: 0 }, uYaw: { value: 0 },
    uOutfit: { value: o.outfit ? 1 : 0 }, uCoat: { value: new T.Color(o.outfit ? o.outfit.coat : 0xffffff) }, uScrub: { value: new T.Color(o.outfit ? o.outfit.scrub : 0xffffff) } };
  const model = gltf.scene.clone(true); body.add(model);
  model.traverse((x) => { if (x.isMesh) { x.material = rigMaterial(T, x.material, U); x.frustumCulled = false; } });
  const k = A.h / R.H; body.scale.setScalar(k); const by0 = 0.95 * k; body.position.y = by0;
  const tag = o.noTag ? null : nameTag(T, o.name || "Doctor", specName, accent); if (tag) { tag.position.y = A.h + 0.22; g.add(tag); }
  const hipH = (R.hipY + 0.95) * k, SEAT_HIP = 0.6;                 /* the hip joint rests this high above the floor on the chair (seat top 0.5 m + the thigh) */
  let phase = 0, mv = 0, want = 0, seat = 0, seatWant = 0, look = 0, t = Math.random() * 10;
  const ease = (a, b, f) => a + (b - a) * f;
  return {
    group: g, tag, accent, key, sex: A.sex,
    setMoving(v) { want = v; }, setLook(r) { look = r; }, setSeated(v) { seatWant = v ? 1 : 0; },
    setLabel(name, specLabel) { if (!tag) return; const n = nameTag(T, name, specLabel, accent); tag.material.map.dispose(); tag.material.map = n.material.map; tag.material.needsUpdate = true; },
    update(dt) {
      t += dt; const f = Math.min(1, dt * 5);
      seat += (seatWant - seat) * f; mv += (want * (1 - seat) - mv) * Math.min(1, dt * 8);
      phase += dt * (3.2 + 4.2 * mv) * (mv > 0.05 ? 1 : 0.2);
      const s = Math.sin(phase), a = mv * 0.62, sa = seat, br = Math.sin(t * 1.5) * 0.004;
      const hl = -s * a + 1.42 * sa, hr = s * a + 1.42 * sa;                          /* thigh swing, or level when seated */
      const kl = Math.max(0, Math.sin(phase + 1.6)) * a * 1.5 + 1.42 * sa, kr = Math.max(0, Math.sin(phase + 1.6 + Math.PI)) * a * 1.5 + 1.42 * sa;
      U.uHip.value.set(hl, hr); U.uKnee.value.set(kl, kr);
      U.uSh.value.set(s * a * 0.4 + 0.38 * sa, -s * a * 0.4 + 0.38 * sa);              /* arms swing, or rest forward when seated */
      U.uEl.value.set(0.08 + mv * 0.12 + 0.8 * sa, 0.08 + mv * 0.12 + 0.8 * sa);
      U.uLean.value = 0.03 * mv + 0.07 * sa + br * 3; U.uYaw.value = look + Math.sin(t * 0.37) * 0.05 * (1 - mv);
      body.position.y = ease(by0, by0 - (hipH - SEAT_HIP), sa) + Math.abs(s) * 0.012 * mv;
      body.position.z = -0.06 * sa;
    },
  };
}
