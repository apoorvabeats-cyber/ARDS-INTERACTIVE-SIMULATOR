/* THE MEDICAL NEXUS: the Multidisciplinary Team's shared hall.
   One circular scientific hall. One patient, standing on a turntable in the middle (the Critical Care Hub's own human model),
   the doctors walk round it as 3D avatars. Transparent holographic panels beside the patient show the history, live vitals,
   findings and the team; the ICU devices (ventilator, IV pole, infusion pumps) stand beside the patient; treatment is given from the
   Orders dock. The patient's state is owned by the Team room (one authoritative source); this page draws it and sends orders back.
   Movement is the ICU's finger drag: swipe up to walk, drag sideways to look. Drag ON the patient to turn him through 360 degrees. */
import * as T from "./three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { createDevices } from "./icu-devices.js?v=20261120o";
import { loadDoctorBody, createDoctor, specInfo, nameTag, SPEC } from "./doctor-avatar.js?v=20261120o";
import { createHallNet, localSignal, ntfySignal } from "./hall-net.js?v=20261120o";
import { createSfx } from "./sfx.js?v=20261120o";
import { createDesk, DESK } from "./nexus-desk.js?v=20261120o";
import { SECTIONS, buildSection, paintImage, paintEcg, hotspotAt, labsOf, sofaOf } from "./nexus-sections.js?v=20261120o";

const $ = (s) => document.querySelector(s);
const Q = new URLSearchParams(location.search), DEMO = Q.has("demo");
const myId = Q.get("id") || ("u" + Math.random().toString(36).slice(2, 8));
let myName = (Q.get("name") || "Doctor").slice(0, 40), mySpec = Q.get("spec") || "intensivist";
const V = T.Vector3, TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hashN = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const post = (type, o) => { if (parent !== window) parent.postMessage(Object.assign({ type }, o || {}), "*"); else if (DEMO) { (window.__posts = window.__posts || []).push(Object.assign({ type }, o || {})); } };

/* ================================================================ renderer, camera */
const cv = $("#gl");
let R;
try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" }); }
catch (e) { $("#vmsg").textContent = "This device could not start 3D graphics."; throw e; }
const coarse = typeof matchMedia === "function" && matchMedia("(pointer:coarse)").matches;
R.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2)); R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.02;
const S = new T.Scene(); S.background = new T.Color(0x0b1824);
const cam = new T.PerspectiveCamera(64, 1, 0.05, 60);
const fit = () => { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.fov = cam.aspect < 0.8 ? 72 : 62; cam.updateProjectionMatrix(); };
addEventListener("resize", fit); fit();

/* ================================================================ materials and helpers */
const env = (() => {
  const es = new T.Scene();
  es.add(new T.Mesh(new T.BoxGeometry(40, 14, 40), new T.MeshBasicMaterial({ color: 0x24425a, side: T.BackSide })));
  for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { const m = new T.Mesh(new T.PlaneGeometry(4, 0.7), new T.MeshBasicMaterial({ color: new T.Color(7, 7.5, 8) })); m.rotation.x = Math.PI / 2; m.position.set(i * 6, 6.4, j * 9); es.add(m); }
  [-1, 1].forEach((s) => { const m = new T.Mesh(new T.PlaneGeometry(30, 0.3), new T.MeshBasicMaterial({ color: new T.Color(0.4, 2.2, 4) })); m.position.set(0, 3, s * 19); m.rotation.y = s > 0 ? Math.PI : 0; es.add(m); });
  const pm = new T.PMREMGenerator(R), rt = pm.fromScene(es, 0.02); pm.dispose(); return rt.texture;
})();
S.environment = env;
const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0, envMap: env, envMapIntensity: 0.8 }, o || {}));
const E = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k || 1), toneMapped: false });
function ctex(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); if (fn) fn(g, w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; }
const mesh = (geo, mat, x, y, z, par) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (par) par.add(m); return m; };
const cyl = (r1, r2, h, mat, x, y, z, par, seg) => mesh(new T.CylinderGeometry(r1, r2, h, seg || 48), mat, x, y, z, par);
const tor = (r, t, mat, y, par, seg) => { const m = mesh(new T.TorusGeometry(r, t, 8, seg || 128), mat, 0, y, 0, par); m.rotation.x = Math.PI / 2; return m; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const rnd = (() => { let s = 5; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

/* ================================================================ the hall */
const RH = 11, WH = 6.4, DAIS_R = 3.25, DAIS_H = 0.22, MINR = 3.3, MAXR = RH - 0.8, BODY_S = 1.45;
const hall = new T.Group(); S.add(hall);
S.add(new T.HemisphereLight(0xeaf6ff, 0x5d7b92, 1.05));
const keyL = new T.PointLight(0xd5edff, 26, 15, 1.5); keyL.position.set(0, WH - 1.1, 0); S.add(keyL);
const glowL = new T.PointLight(0x36d6ff, 5, 6, 1.6); glowL.position.set(0, 1.4, 0); S.add(glowL);

/* floor: pale polished disc with cyan rings and spokes */
const floorTex = ctex(1024, 1024, (g, w) => {
  const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, "#f6fbfe"); gr.addColorStop(0.4, "#e2eef5"); gr.addColorStop(1, "#b9cfdd"); g.fillStyle = gr; g.fillRect(0, 0, w, w);
  [[0.27, 0.9, 5], [0.4, 0.5, 2], [0.6, 0.38, 3], [0.8, 0.5, 2], [0.975, 0.9, 6]].forEach(([r, a, lw]) => { g.strokeStyle = `rgba(30,185,235,${a})`; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r * c, 0, TAU); g.stroke(); });
  g.strokeStyle = "rgba(40,150,200,.16)"; g.lineWidth = 2; for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 0.28 * c, c + Math.sin(a) * 0.28 * c); g.lineTo(c + Math.cos(a) * 0.97 * c, c + Math.sin(a) * 0.97 * c); g.stroke(); }
  g.strokeStyle = "rgba(30,185,235,.55)"; g.lineWidth = 2; for (let i = 0; i < 180; i++) { const a = i / 180 * TAU, r0 = 0.6 * c, r1 = r0 + (i % 5 ? 7 : 16); g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); }
});
{ const f = mesh(new T.CircleGeometry(RH, 96), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.16, metalness: 0.12, envMap: env, envMapIntensity: 0.95 }), 0, 0, 0, hall); f.rotation.x = -Math.PI / 2; }

/* walls: frosted glass panels with a dark skirting, two light bands */
const wallTex = ctex(2048, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#d4e3ee"); gr.addColorStop(1, "#bcd0de"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 48; i++) { g.fillStyle = i % 2 ? "rgba(255,255,255,.18)" : "rgba(60,120,160,.07)"; g.fillRect(i * w / 48, 0, w / 48, h); g.fillStyle = "rgba(60,110,150,.35)"; g.fillRect(i * w / 48, 0, 3, h); }
  g.fillStyle = "#26384a"; g.fillRect(0, h - 26, w, 26);
});
mesh(new T.CylinderGeometry(RH, RH, WH, 128, 1, true), new T.MeshStandardMaterial({ map: wallTex, roughness: 0.4, metalness: 0.1, side: T.BackSide, envMap: env, envMapIntensity: 0.5 }), 0, WH / 2, 0, hall);
[2.15, 4.7].forEach((y) => mesh(new T.CylinderGeometry(RH - 0.03, RH - 0.03, 0.07, 128, 1, true), new T.MeshBasicMaterial({ color: new T.Color(0.3, 1.6, 2.4), side: T.BackSide, toneMapped: false }), 0, y, 0, hall));
tor(RH - 0.15, 0.045, E(0x36d6ff, 2.2), 0.05, hall);

/* ceiling: dark truss, glowing rings, a bright oculus over the patient, and a faint projection cone */
mesh(new T.CircleGeometry(RH + 0.5, 64), M(0x16222e, { metalness: 0.6, roughness: 0.45 }), 0, WH, 0, hall).rotation.x = Math.PI / 2;
for (let i = 0; i < 16; i++) { const b = mesh(new T.BoxGeometry(0.14, 0.22, RH - 2.4), M(0x0f1822, { metalness: 0.7, roughness: 0.4 }), 0, WH - 0.12, 0, hall); const a = i / 16 * TAU, rr0 = (RH + 2.4) / 2 - 0.5; b.position.set(Math.sin(a) * rr0, WH - 0.12, Math.cos(a) * rr0); b.rotation.y = a; }
[3.3, 6.1, 8.9].forEach((r) => tor(r, 0.05, E(0x36d6ff, 2), WH - 0.2, hall));
tor(2.2, 0.07, E(0xbff4ff, 2.2), WH - 0.1, hall); mesh(new T.CircleGeometry(2.1, 48), E(0xffffff, 1.5), 0, WH - 0.06, 0, hall).rotation.x = Math.PI / 2;
for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.15, r = i % 2 ? 7.4 : 5.0; const d = mesh(new T.CircleGeometry(0.35, 20), E(0xe8f7ff, 1.4), Math.sin(a) * r, WH - 0.05, Math.cos(a) * r, hall); d.rotation.x = Math.PI / 2; }
mesh(new T.CylinderGeometry(0.7, 2.35, WH - DAIS_H, 48, 1, true), new T.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.055, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), 0, (WH + DAIS_H) / 2, 0, hall);

/* wall holo-screens: organ scans, a DNA helix, graphs and reports, as in the reference */
function wallScreen(kind) {
  return ctex(1024, 600, (g, w, h) => {
    g.fillStyle = "rgba(5,26,42,.62)"; rr(g, 4, 4, w - 8, h - 8, 26); g.fill(); g.strokeStyle = "rgba(110,225,255,.8)"; g.lineWidth = 5; rr(g, 4, 4, w - 8, h - 8, 26); g.stroke();
    g.fillStyle = "#7fe9ff"; g.font = "700 34px system-ui,sans-serif"; g.fillText(["IMAGING LIBRARY", "GENOMICS", "PHYSIOLOGY", "LABORATORY"][kind], 34, 62);
    if (kind === 0) { for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = 40 + c * 235, y = 100 + r * 245, gr = g.createRadialGradient(x + 100, y + 100, 6, x + 100, y + 100, 100); gr.addColorStop(0, r ? "#ffd27a" : "#ff9a5a"); gr.addColorStop(0.6, r ? "#d9602a" : "#2fb4a8"); gr.addColorStop(1, "rgba(5,26,42,0)"); g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x, y, 200, 200); g.fillStyle = gr; g.beginPath(); g.ellipse(x + 100, y + 100, 80 - c * 6, 62 + r * 10, c * 0.4, 0, TAU); g.fill(); g.strokeStyle = "rgba(110,225,255,.6)"; g.lineWidth = 2; g.strokeRect(x, y, 200, 200); } }
    if (kind === 1) { for (let i = 0; i < 60; i++) { const y = 90 + i * 8.2, a = i * 0.28, x1 = w / 2 + Math.sin(a) * 200, x2 = w / 2 - Math.sin(a) * 200; g.strokeStyle = "rgba(110,225,255,.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke(); g.fillStyle = "#ffcf6e"; g.beginPath(); g.arc(x1, y, 7, 0, TAU); g.fill(); g.fillStyle = "#7fe9ff"; g.beginPath(); g.arc(x2, y, 7, 0, TAU); g.fill(); } }
    if (kind === 2) { ["#3dff9a", "#ff6b78", "#48d9ff", "#f4d45a"].forEach((col, k) => { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); for (let x = 40; x < w - 40; x += 4) { const y = 150 + k * 112 + Math.sin(x * (0.02 + k * 0.006)) * (24 + k * 6) * (k === 0 ? Math.exp(-Math.pow((x % 200) - 100, 2) / 900) * 2 : 1); x === 40 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }); }
    if (kind === 3) { g.font = "500 26px ui-monospace,monospace"; for (let i = 0; i < 12; i++) { g.fillStyle = i % 4 === 0 ? "#ffcf6e" : "#a9dff0"; g.fillText(["Lactate 4.2 mmol/L", "pH 7.31", "pCO₂ 38 mmHg", "Creatinine 1.9 mg/dL", "K⁺ 4.6 mmol/L", "WCC 18.4", "CRP 212", "Hb 11.4 g/dL", "Na⁺ 138", "Troponin <0.01", "PCT 8.6", "INR 1.3"][i], 44, 120 + i * 38); g.fillRect(560, 106 + i * 38, 60 + ((i * 53) % 330), 14); } }
  });
}
for (let k = 0; k < 10; k++) {
  const a = (k + 0.5) / 10 * TAU, p = mesh(new T.PlaneGeometry(3.7, 2.17), new T.MeshBasicMaterial({ map: wallScreen(k % 4), transparent: true, toneMapped: false, depthWrite: false, side: T.DoubleSide }), Math.sin(a) * (RH - 0.3), 3.0, Math.cos(a) * (RH - 0.3), hall);
  p.rotation.y = a + Math.PI; p.renderOrder = 2;
}
/* the entrance door in the south wall (you arrive through it) */
{ const d = new T.Group(); d.position.set(0, 0, RH - 0.06); d.rotation.y = Math.PI; hall.add(d);
  mesh(new T.BoxGeometry(2.7, 0.08, 0.1), E(0x36d6ff, 2.2), 0, 2.72, 0, d); [-1.3, 1.3].forEach((x) => mesh(new T.BoxGeometry(0.08, 2.72, 0.1), E(0x36d6ff, 2.2), x, 1.36, 0, d));
  mesh(new T.PlaneGeometry(2.5, 2.66), new T.MeshStandardMaterial({ color: 0x9fd8f5, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.4, envMap: env, side: T.DoubleSide, depthWrite: false }), 0, 1.33, 0, d);
  const sg = ctex(512, 96, (g, w, h) => { g.fillStyle = "rgba(5,26,42,.8)"; rr(g, 3, 3, w - 6, h - 6, 16); g.fill(); g.strokeStyle = "#5fe3ff"; g.lineWidth = 4; rr(g, 3, 3, w - 6, h - 6, 16); g.stroke(); g.fillStyle = "#cff6ff"; g.font = "700 40px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ENTRANCE · UNIVERSE", w / 2, h / 2); });
  mesh(new T.PlaneGeometry(1.7, 0.32), new T.MeshBasicMaterial({ map: sg, transparent: true, toneMapped: false }), 0, 3.05, 0.06, d); }

/* ================================================================ the dais and the turntable */
const dais = new T.Group(); hall.add(dais);
cyl(DAIS_R, DAIS_R + 0.1, DAIS_H, M(0xf3f8fb, { roughness: 0.25, metalness: 0.1, envMapIntensity: 1.1 }), 0, DAIS_H / 2, 0, dais, 96);
tor(DAIS_R - 0.04, 0.04, E(0x36d6ff, 2.6), DAIS_H + 0.005, dais);
const plateTex = ctex(1024, 1024, (g, w) => {
  const c = w / 2; g.fillStyle = "#05263a"; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(80,225,255,${0.55 - i * 0.04})`; g.lineWidth = i % 3 ? 2 : 5; g.beginPath(); g.arc(c, c, (0.18 + i * 0.095) * c, 0, TAU); g.stroke(); }
  for (let i = 0; i < 96; i++) { const a = i / 96 * TAU, r0 = 0.8 * c, r1 = r0 + (i % 4 ? 6 : 16); g.strokeStyle = "rgba(130,240,255,.7)"; g.lineWidth = 2; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); }
  for (let i = 0; i < 40; i++) { const a = rnd() * TAU, r = (0.25 + rnd() * 0.55) * c; g.strokeStyle = "rgba(90,230,255,.35)"; g.lineWidth = 2; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 8 + rnd() * 26, 0, TAU); g.stroke(); }
});
const plate = mesh(new T.CircleGeometry(DAIS_R - 0.12, 96), new T.MeshStandardMaterial({ color: 0x0a2a3e, emissive: 0xffffff, emissiveMap: plateTex, emissiveIntensity: 0.95, map: plateTex, roughness: 0.3, metalness: 0.2, envMap: env }), 0, DAIS_H + 0.003, 0, dais); plate.rotation.x = -Math.PI / 2;
const haloM = new T.MeshBasicMaterial({ color: 0x36d6ff, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
const halo = tor(DAIS_R - 0.1, 0.05, haloM, DAIS_H + 0.03, dais);
const TOP = DAIS_H + 0.045;
const PED = 0.5;
const turn = new T.Group(); turn.position.y = TOP + PED; hall.add(turn);
cyl(1.52, 1.58, PED, M(0x0b2f45, { metalness: 0.5, roughness: 0.3 }), 0, TOP + PED / 2, 0, hall, 64); tor(1.5, 0.03, E(0x7fe9ff, 2.6), TOP + PED + 0.005, hall, 96);
const dialTex = ctex(512, 512, (g, w) => {
  const c = w / 2; g.fillStyle = "#0b2f45"; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill(); g.strokeStyle = "#7fe9ff"; g.lineWidth = 6; g.beginPath(); g.arc(c, c, c - 6, 0, TAU); g.stroke();
  for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, r0 = c - 14 - (i % 6 ? 8 : 24); g.strokeStyle = "#bff4ff"; g.lineWidth = i % 6 ? 2 : 4; g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * (c - 14), c - Math.cos(a) * (c - 14)); g.stroke(); }
  g.fillStyle = "#e8fbff"; g.font = "700 30px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = c - 64; g.fillText(String(i * 45), c + Math.sin(a) * r, c - Math.cos(a) * r); }
});
const disc = mesh(new T.CircleGeometry(1.45, 64), new T.MeshBasicMaterial({ map: dialTex, toneMapped: false }), 0, 0.012, 0, turn); disc.rotation.x = -Math.PI / 2;
tor(1.45, 0.03, E(0x7fe9ff, 2.4), 0.02, turn, 64);

/* ================================================================ the patient: the Critical Care Hub's own 3D human */
const patient = new T.Group(); turn.add(patient);
const hitCyl = mesh(new T.CylinderGeometry(0.95, 0.95, 2.2, 14), new T.MeshBasicMaterial({ visible: false }), 0, 1.0, 0, patient);
const organs = {}, organMeshes = [], rimU = { c: { value: new T.Color(0x58d6ff) }, k: { value: 1 } };
const ORGAN_COLOR = { brain: 0xd98480, spinal: 0xe4d09a, lungs: 0xf0a8b4, heart: 0xc43145, liver: 0x8a3a2a, pancreas: 0xe2c15e, spleen: 0x7a3554, kidneys: 0xb24d40, bowel: 0xe6aa7e, bladder: 0xe3d39a, stomach: 0xd48472, arteries: 0xd22734, veins: 0x3a6cb5 };
/* the body is solid: pale clinical skin, lit like the rest of the hall, with a coloured rim that follows the patient's status.
   "See inside" (or tapping an organ) turns the skin glassy so the organs show. */
const bodyMat = new T.MeshStandardMaterial({ color: 0xbfcfdb, roughness: 0.5, metalness: 0.04, envMap: env, envMapIntensity: 0.95, emissive: 0x0b1a26, emissiveIntensity: 1, transparent: true, opacity: 1 });
bodyMat.onBeforeCompile = (sh) => { sh.uniforms.rimC = rimU.c; sh.uniforms.rimK = rimU.k; sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 rimC;uniform float rimK;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += rimC * pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6) * rimK * 0.8;"); };
bodyMat.customProgramCacheKey = () => "nexusBody1";
let insideWant = false;
let bodyReady = false, handTip = new V(0.5, 0.9, 0.02);
const bodyLoad = new Promise((res) => {
  const url = new URL("../../models/anatomy/human-reference.glb", import.meta.url).href;
  new GLTFLoader().load(url, (gltf) => {
    const model = gltf.scene; model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (!o.isMesh) return; const nm = o.name || "";
      if (nm === "body") { o.material = bodyMat; o.renderOrder = 3; let best = -9; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 2) { const x = p.getX(i); if (x > best) { best = x; handTip.set(x, p.getY(i), p.getZ(i)); } } return; }
      if (nm === "eyes" || nm === "irises" || nm === "pupils") return;
      const mat = o.material; if (mat) { const tint = ORGAN_COLOR[nm]; if (tint != null) mat.color.setHex(tint); mat.roughness = 0.45; mat.metalness = 0.04; mat.emissive = mat.color.clone(); mat.emissiveIntensity = 0.2; mat.side = T.FrontSide; o.userData.organ = nm; organMeshes.push(o); organs[nm] = { mesh: o, base: mat.color.clone(), pulse: 0 }; }
    });
    patient.add(model);
    /* heart and lungs move: give them a pivot at their own centre */
    ["heart", "lungs"].forEach((n) => { const o = organs[n]; if (!o) return; const c = new T.Box3().setFromObject(o.mesh).getCenter(new V()), pv = new T.Group(); pv.position.copy(c); o.mesh.parent.add(pv); pv.add(o.mesh); o.mesh.position.sub(c); o.pv = pv; o.c0 = c; });
    bodyReady = true; res(true);
  }, undefined, () => res(false));
});
patient.scale.setScalar(BODY_S);
const nameLabel = { sp: null, key: "" };

/* ================================================================ ICU devices (ventilator, IV pole, pumps) */
const dev = createDevices(T, env);
{ const a = 0.95, r = 4.15, put = (g, sx) => { const x = sx * Math.sin(a) * r, z = Math.cos(a) * r; g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); S.add(g); }; put(dev.vent, -1); put(dev.pole, 1); dev.vent.scale.setScalar(1.15); dev.pole.scale.setScalar(1.15); }
const tubeMat = M(0xe4edf1, { roughness: 0.35, transparent: true, opacity: 0.9, envMapIntensity: 1.2 });
const tubes = { circ: null, iv: null, ck: "" };
function setTube(k, a, b, lift, on) {
  if (tubes[k]) { S.remove(tubes[k]); tubes[k].geometry.dispose(); tubes[k] = null; } if (!on) return;
  const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + lift; const out = new V(mid.x, 0, mid.z); if (out.lengthSq() > 0.0001) mid.addScaledVector(out.normalize(), 0.35);
  const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(a.y + lift * 0.4), mid, mid.clone().lerp(b, 0.55).setY(b.y + lift * 0.3), b]), 24, k === "circ" ? 0.014 : 0.007, 6), tubeMat); S.add(m); tubes[k] = m;
}
let eq = { tube: false, oxygen: false, norepi: false, fluid: 0, abx: false, blood: false, dialysis: false, spo2: 98, rr: 16, saline: false, mannitol: false };
function refreshTubes(force) {
  const key = [turn.rotation.y.toFixed(2), eq.tube, eq.norepi, eq.fluid, eq.abx, eq.blood].join();
  if (!force && key === tubes.ck) return; tubes.ck = key; patient.updateMatrixWorld(true); dev.vent.updateMatrixWorld(true); dev.pole.updateMatrixWorld(true);
  const mouth = patient.localToWorld(new V(0, 1.625, 0.09)), hand = patient.localToWorld(handTip.clone().multiplyScalar(0.92).add(new V(0, 0.02, 0.0)));
  setTube("circ", dev.ventPort(new V()), mouth, 0.5, eq.tube);
  setTube("iv", dev.polePort(new V()), hand, 0.3, eq.norepi || eq.fluid > 0 || eq.abx || eq.blood);
}

/* ================================================================ the holographic panels */
const PX = 640;
function pframe(g, w, h, title, col) {
  g.clearRect(0, 0, w, h); g.fillStyle = "rgba(6,26,42,.62)"; rr(g, 3, 3, w - 6, h - 6, 22); g.fill();
  g.fillStyle = "rgba(120,225,255,.07)"; for (let y = 8; y < h; y += 6) g.fillRect(8, y, w - 16, 1);
  g.strokeStyle = col || "rgba(115,228,255,.85)"; g.lineWidth = 3; rr(g, 3, 3, w - 6, h - 6, 22); g.stroke();
  g.fillStyle = col || "#7fe9ff"; g.font = "700 26px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(title, 24, 44);
  g.fillStyle = "rgba(115,228,255,.5)"; g.fillRect(24, 56, w - 48, 2);
}
function wrap(g, text, x, y, mw, lh, maxLines) { const words = String(text || "").split(/\s+/); let line = "", n = 0; for (const wd of words) { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > mw && line) { g.fillText(line, x, y); y += lh; line = wd; if (++n >= maxLines) return y; } else line = t; } if (line) { g.fillText(line, x, y); y += lh; } return y; }
const panels = [];
function holo(w, h, pxh, off, rad, y, paint, every) {
  const tex = ctex(PX, pxh), m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
  m.renderOrder = 6; S.add(m); const p = { m, tex, paint, off, rad, y, w, h, every: every || 0, key: "", t: 0, pxh }; panels.push(p); return p;
}
const statusOf = (p) => !p ? 0 : p.alive === false ? 2 : (p.map < 60 || p.spo2 < 88 || p.gcs <= 8) ? 2 : (p.map < 70 || p.spo2 < 93 || p.hr > 120 || p.lactate > 4) ? 1 : 0;
const COL = ["#3dff9a", "#ffc24a", "#ff5468"];
let mdt = { room: null, orders: null, busy: false, err: "", line: false }, P = null, SC = null;
const disp = { hr: 80, sbp: 120, dbp: 75, map: 90, spo2: 98, rr: 16, gcs: 15, temp: 37, k: 4, lactate: 1.5, cr: 1 };
const ecgF = (f) => { const g = (m, s, a) => a * Math.exp(-(((f - m) / s) ** 2)); return g(0.2, 0.03, 0.13) + g(0.4, 0.018, 1) - g(0.375, 0.01, 0.15) - g(0.43, 0.012, 0.2) + g(0.65, 0.05, 0.25); };

const pHist = holo(1.05, 0.92, 560, -1.0, 1.35, 1.78, (g, w, h) => {
  pframe(g, w, h, "PATIENT HISTORY");
  if (!SC) { g.fillStyle = "#cfe7f3"; g.font = "28px system-ui,sans-serif"; g.fillText("The shift has not begun.", 24, 110); g.fillText("The case appears here when it does.", 24, 148); return; }
  g.fillStyle = "#fff"; g.font = "700 38px system-ui,sans-serif"; g.fillText(`${SC.name}, ${SC.age}`, 24, 108);
  g.fillStyle = "#9fe9ff"; g.font = "600 25px system-ui,sans-serif"; g.fillText(`${SC.sex === "woman" ? "Woman" : "Man"}  ·  Hour ${P ? P.hour : 0}`, 24, 142);
  g.fillStyle = "#ffcf6e"; g.font = "600 28px system-ui,sans-serif"; wrap(g, SC.dx, 24, 190, w - 48, 34, 2);
  g.fillStyle = "#d6ecf6"; g.font = "25px system-ui,sans-serif"; wrap(g, SC.story, 24, 268, w - 48, 33, 9);
});
const pVit = holo(1.1, 0.86, 500, 1.0, 1.35, 1.74, (g, w, h, t) => {
  pframe(g, w, h, "LIVE VITALS", COL[statusOf(P)]);
  const dead = P && P.alive === false, c = COL[statusOf(P)];
  g.strokeStyle = "#3dff9a"; g.lineWidth = 3; g.beginPath(); const per = 60 / Math.max(30, disp.hr || 60);
  for (let x = 0; x < w - 56; x += 3) { const f = ((((t - (w - 56 - x) / 190) / per) % 1) + 1) % 1, y = 150 - (dead ? 0 : ecgF(f)) * 62; x ? g.lineTo(28 + x, y) : g.moveTo(28 + x, y); } g.stroke();
  const cells = [["HR", Math.round(disp.hr), "", disp.hr > 120 || disp.hr < 50], ["BP", Math.round(disp.sbp) + "/" + Math.round(disp.dbp), "", disp.map < 65], ["MAP", Math.round(disp.map), "", disp.map < 65], ["SpO₂", Math.round(disp.spo2), "%", disp.spo2 < 92], ["RR", Math.round(disp.rr), "", disp.rr > 26], ["GCS", Math.round(disp.gcs), "", disp.gcs < 9], ["K⁺", disp.k.toFixed(1), "", disp.k > 5.5 || disp.k < 3.3], ["Lactate", disp.lactate.toFixed(1), "", disp.lactate > 4], ["Temp", disp.temp.toFixed(1), "°", disp.temp > 38.3]];
  cells.forEach(([l, v, u, bad], i) => { const x = 28 + (i % 3) * 200, y = 212 + Math.floor(i / 3) * 96; g.fillStyle = "#8fb6c9"; g.font = "600 21px system-ui,sans-serif"; g.fillText(l, x, y); g.fillStyle = bad ? "#ff5468" : c; g.font = "700 40px ui-monospace,Menlo,monospace"; g.fillText(String(v) + u, x, y + 42); });
  g.fillStyle = "#9fe9ff"; g.font = "600 21px system-ui,sans-serif"; g.textAlign = "right"; g.fillText(P ? (P.alive === false ? "NO CIRCULATION" : String(P.rhythm || "sinus").toUpperCase()) : "", w - 24, 44); g.textAlign = "left";
}, 0.12);
const pFind = holo(0.98, 0.86, 560, -0.8, 1.4, 0.36, (g, w, h) => {
  pframe(g, w, h, "FINDINGS AND PROBLEMS"); let y = 100;
  if (!P) { g.fillStyle = "#cfe7f3"; g.font = "26px system-ui,sans-serif"; g.fillText("Waiting for the patient.", 24, y); return; }
  const open = (P.problems || []).filter((q) => q.open).slice(0, 4);
  open.forEach((q) => { const col = q.resolved ? "#3dff9a" : q.called ? "#ffc24a" : "#ff5468"; g.fillStyle = col; g.beginPath(); g.arc(34, y - 9, 8, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.font = "600 26px system-ui,sans-serif"; g.fillText((q.title || "").slice(0, 34), 54, y); g.fillStyle = "#8fb6c9"; g.font = "21px system-ui,sans-serif"; g.fillText(q.resolved ? "Treated" : q.called ? specInfo(q.specialty)[0] + " called" : "Not called yet", 54, y + 26); y += 62; });
  (P.results || []).slice(0, 3).forEach((r) => { g.fillStyle = "#ffcf6e"; g.font = "700 22px system-ui,sans-serif"; g.fillText(r.label, 24, y + 4); g.fillStyle = "#d6ecf6"; g.font = "21px system-ui,sans-serif"; y = wrap(g, r.text, 24, y + 30, w - 48, 26, 3) + 6; });
  const lg = (P.log || []).slice(-2); if (lg.length && y < h - 70) { g.fillStyle = "#7fe9ff"; g.font = "600 20px system-ui,sans-serif"; g.fillText("LATEST", 24, y + 6); g.fillStyle = "#cfe7f3"; g.font = "21px system-ui,sans-serif"; lg.forEach((l) => { y = wrap(g, l.text, 24, y + 30, w - 48, 25, 2); }); }
});
const pTeam = holo(0.92, 0.6, 400, 0.8, 1.4, 0.32, (g, w, h) => {
  pframe(g, w, h, "THE TEAM"); const mem = (mdt.room && mdt.room.members) || [], here = new Set([myId]); remotes.forEach((r) => r.info && here.add(r.info.id));
  mem.slice(0, 6).forEach((m, i) => { const y = 100 + i * 46, on = here.has(m.userId) && !m.away; g.fillStyle = on ? "#3dff9a" : "#667"; g.beginPath(); g.arc(34, y - 9, 8, 0, TAU); g.fill(); g.fillStyle = on ? "#fff" : "#8fb6c9"; g.font = "600 25px system-ui,sans-serif"; g.fillText(((m.name || "Doctor") + (m.userId === myId ? " (you)" : "")).slice(0, 18), 54, y); g.fillStyle = "#9fe9ff"; g.font = "21px system-ui,sans-serif"; g.textAlign = "right"; g.fillText(m.specialty ? specInfo(m.specialty)[0] : "No seat", w - 24, y); g.textAlign = "left"; });
  if (!mem.length) { g.fillStyle = "#cfe7f3"; g.font = "26px system-ui,sans-serif"; g.fillText("Open a shift to bring the team in.", 24, 110); }
}); pTeam.team = true;
let azS = 0;
pHist.id = "hist"; pVit.id = "vit"; pFind.id = "find"; pTeam.id = "team"; pFind.portHide = pTeam.portHide = true; /* on a tall phone screen only the history and the vitals float; findings and team are in the desk */
/* where each panel floats: [azimuth offset from where you look, radius from the patient, height] for a wide screen and for a tall (phone) screen */
const LAY = { hist: [[-0.82, 2.9, 2.0], [0.55, -2.6, 2.5]], vit: [[0.82, 2.9, 2.0], [-0.55, -2.6, 2.5]], find: [[-0.82, 2.9, 3.0], [0.55, -2.6, 4.0]], team: [[0.82, 2.9, 2.95], [-0.55, -2.6, 4.0]] };
const POPL = [[[0, 2.6, 3.7], [0.55, -2.6, 4.0]], [[-0.36, 2.6, 3.7], [-0.55, -2.6, 4.0]], [[0.36, 2.6, 3.7], [0, -2.6, 5.0]]];
const POP_COL = { lab: "#ffc24a", img: "#a99bff", find: "#3dff9a" }, POP_HEAD = { lab: "NEW LABORATORY RESULT", img: "NEW IMAGING", find: "NEW FINDING" };
const THUMB = { "Chest film": "cxr", "CT chest": "ctchest", "CT head": "cthead", Echocardiogram: "echo" };
const pops = [0, 1, 2].map((n) => { const p = holo(0.86, 0.57, 420, 0, 2.2, 3.4, (g, w, h) => {
  const it = p.item; g.clearRect(0, 0, w, h); if (!it) return; const col = POP_COL[it.kind] || "#7fe9ff";
  g.fillStyle = "rgba(5,24,40,.9)"; rr(g, 3, 3, w - 6, h - 6, 22); g.fill(); g.strokeStyle = col; g.lineWidth = 5; rr(g, 3, 3, w - 6, h - 6, 22); g.stroke();
  g.fillStyle = col; g.font = "800 22px system-ui,sans-serif"; g.textAlign = "left"; g.fillText(POP_HEAD[it.kind] || "NEW", 24, 40); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(24, 54, w - 48, 2);
  g.fillStyle = "#fff"; g.font = "700 34px system-ui,sans-serif"; g.fillText(it.label, 24, 104);
  const tk = THUMB[it.label], tw = tk ? 190 : 0; if (tk) { if (!it.thumb) { it.thumb = document.createElement("canvas"); it.thumb.width = 220; it.thumb.height = 220; paintImage(it.thumb, tk, it.text); } g.drawImage(it.thumb, w - 214, 78, 190, 190); }
  g.fillStyle = "#d6ecf6"; g.font = "24px system-ui,sans-serif"; wrap(g, it.text, 24, 146, w - 48 - tw, 31, tk ? 7 : 8);
  g.fillStyle = "rgba(143,182,201,.9)"; g.font = "600 18px system-ui,sans-serif"; g.fillText("Hour " + it.hour + " · hold and swipe to dismiss", 24, h - 18);
}); p.pop = true; p.slot = n; p.item = null; p.age = 0; p.id = "pop" + n; return p; });
function pushPopup(it) {
  let p = pops.find((q) => !q.item && !q.rm); if (!p) p = pops.slice().sort((a, b) => b.age - a.age)[0];
  p.item = it; p.age = 0; p.key = ""; p.t = 9; p.hidden = false; p.rm = null; p.dragX = 0; p.slide = 0; p.shown = 1; sfx.chime(it.kind); $("#note").textContent = (POP_HEAD[it.kind] || "NEW").toLowerCase().replace(/^./, (c) => c.toUpperCase()) + ": " + it.label; $("#note").hidden = false; clearTimeout(noteT); noteT = setTimeout(() => { $("#note").hidden = true; }, 5000);
}
let noteT = 0;
function removePanel(p, dir) { if (p.rm) return; p.rm = { dir: dir || 1, t: 0 }; p.grab = 0; navigator.vibrate && navigator.vibrate(12); }
function restorePanels() { panels.forEach((p) => { if (!p.pop) { p.hidden = false; p.rm = null; p.slide = 0; } }); $("#pnl").hidden = true; }
const rgt = new V();
function updatePanels(dt, t) {
  const dist = Math.hypot(cam.position.x, cam.position.z), az = Math.atan2(cam.position.x, cam.position.z);
  azS += Math.atan2(Math.sin(az - azS), Math.cos(az - azS)) * Math.min(1, dt * 2.6);
  const port = cam.aspect < 0.8, vis = clamp((11 - dist) / 3, 0, 1), s = clamp(dist / 4.2, 1, port ? 1.45 : 1.9); rgt.set(1, 0, 0).applyQuaternion(cam.quaternion); rgt.y = 0; rgt.normalize();
  panels.forEach((p) => {
    if (p.rm) { p.rm.t += dt; p.slide = p.rm.dir * Math.pow(Math.min(1, p.rm.t / 0.42), 2) * 2.6; if (p.rm.t >= 0.42) { p.rm = null; p.hidden = true; p.slide = 0; if (p.pop) p.item = null; $("#pnl").hidden = !panels.some((q) => !q.pop && q.hidden && !(port && q.portHide)); } }
    if (p.pop && p.item) { p.age += dt; if (p.age > 75 && !p.rm) removePanel(p, 1); }
    p.m.visible = vis > 0.02 && !!mdt.room && !p.hidden && !(port && p.portHide) && (p.pop ? !!p.item : (p.team || !!SC)) && !window.__nopanels; if (!p.m.visible) return;
    p.m.material.opacity = vis * (p.rm ? 1 - Math.min(1, p.rm.t / 0.42) : 1);
    const L = p.pop ? POPL[p.slot][port ? 1 : 0] : LAY[p.id][port ? 1 : 0], a = azS + L[0], r = L[1] * (1 + (s - 1) * 0.5), sl = (p.slide || 0) + (p.dragX || 0), x = Math.sin(a) * r + rgt.x * sl, z = Math.cos(a) * r + rgt.z * sl;
    p.m.position.set(x, TOP + L[2] + (s - 1) * 0.35, z); p.m.rotation.set(0, Math.atan2(cam.position.x - x, cam.position.z - z), 0);
    const pulse = p.pop ? Math.min(1, p.age / 0.35) : 1, k = (p.pop ? (port ? 1.3 : 0.82) : port ? 0.9 : 0.8) * s * (port ? 0.9 : 1) * (p.grab ? 1.07 : 1) * (0.55 + 0.45 * (1 - Math.pow(1 - pulse, 3)));
    p.m.scale.setScalar(k);
    if ((p.t += dt) > (p.every || 0.25)) { p.t = 0; const kk = p.every ? "" : p.pop ? (p.item ? p.item.key || "x" : "") + (p.grab ? 1 : 0) : JSON.stringify([P && [P.hr, P.sbp, P.spo2, P.hour, P.log && P.log.length, P.results && P.results.length], SC && SC.name, mdt.room && mdt.room.members && mdt.room.members.length, remotes.size, mdt.room && mdt.room.status, (P && P.problems || []).map((q) => (q.resolved ? 1 : 0) + (q.called ? 2 : 0)).join("")]); if (p.every || kk !== p.key) { p.key = kk; p.paint(p.tex.userData.g, PX, p.pxh, t); p.tex.needsUpdate = true; } }
  });
}

/* ================================================================ controls: the ICU's finger drag, plus turning the patient */
const me = { x: 0, z: 9.6, yaw: Math.PI, h: 1.6, pit: 0 };
{ const a = ((hashN(myId) % 7) - 3) * 0.09; me.x = Math.sin(a) * 4.2; me.z = Math.cos(a) * 4.2; }
const arrive = { t: 0, t0: performance.now(), from: { x: me.x * 1.62, z: me.z * 1.62 }, to: { x: me.x, z: me.z } };
me.x = arrive.from.x; me.z = arrive.from.z;
const faceCenter = (x, z) => Math.atan2(-x, z);
me.yaw = faceCenter(me.x, me.z);
function clampPos(x, z) { const r = Math.hypot(x, z) || 1e-6; if (!focus && r < MINR) { x *= MINR / r; z *= MINR / r; } else if (r > MAXR) { x *= MAXR / r; z *= MAXR / r; } return [x, z]; }
function walkBy(d) { const c = clampPos(me.x + Math.sin(me.yaw) * d, me.z - Math.cos(me.yaw) * d); me.x = c[0]; me.z = c[1]; }
let dn = 0, mvd = 0, lx = 0, ly = 0, sx = 0, sy = 0, holdDir = 0, lastV = 0, mode = "", onPatient = false, onDesk = false, spinV = 0, autoSpin = false, focus = null, retreat = false, lpT = 0, grab = null, gx = 0, held = false, lastMT = 0;
const ray = new T.Raycaster(), ndc = new T.Vector2();
const sfx = createSfx();
const setRay = (cx, cy) => { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); };
function pointHitsPatient(cx, cy) { setRay(cx, cy); const h = ray.intersectObject(hitCyl, false)[0]; return h ? h.distance : null; }
/* the desk: the sloped top with the turning ring and the seven labels, standing round the patient */
const odesk = createDesk(T, { env, TOP, hall, SECTIONS });
function panelAt(cx, cy) { setRay(cx, cy); const ms = panels.filter((p) => p.m.visible && !p.rm).map((p) => p.m), h = ray.intersectObjects(ms, false)[0]; return h ? { p: panels.find((p) => p.m === h.object), d: h.distance } : null; }
cv.addEventListener("pointerdown", (e) => {
  dn = 1; mvd = 0; lx = sx = e.clientX; ly = sy = e.clientY; holdDir = 0; mode = ""; spinV = 0; held = false; grab = null; gx = 0; lastMT = performance.now(); sfx.unlock();
  const dp = pointHitsPatient(e.clientX, e.clientY); setRay(e.clientX, e.clientY); const dd = odesk.hit(ray), pa = panelAt(e.clientX, e.clientY);
  onPatient = dp != null && (dd == null || dp < dd); onDesk = dd != null && (dp == null || dd < dp);
  clearTimeout(lpT);
  if (pa && (dp == null || pa.d < dp) && (dd == null || pa.d < dd)) { onPatient = false; onDesk = false; lpT = setTimeout(() => { if (dn && mvd < 10) { grab = pa.p; grab.grab = 1; gx = 0; held = true; navigator.vibrate && navigator.vibrate(20); sfx.beep && sfx.beep({ f: 660, vol: 0.5 }); $("#hint").style.opacity = 1; $("#hint").textContent = "Swipe left or right to remove this panel"; } }, 480); }
  if (focus) { focus = null; retreat = true; }
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
});
cv.addEventListener("pointermove", (e) => {
  if (!dn) return; const dx = e.clientX - lx, dy = e.clientY - ly, now = performance.now(), dts = Math.max(0.008, (now - lastMT) / 1000); lx = e.clientX; ly = e.clientY; lastMT = now; mvd += Math.abs(dx) + Math.abs(dy);
  if (grab) { gx += dx; grab.dragX = gx * 0.006; if (Math.abs(gx) > 90) { removePanel(grab, Math.sign(gx)); grab.grab = 0; grab.dragX = 0; grab = null; $("#pnl").hidden = !panels.some((q) => !q.pop && (q.hidden || q.rm)); } return; }
  if (mvd > 10 && lpT) { clearTimeout(lpT); lpT = 0; }
  if (!mode && mvd > 8) { const horiz = Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy) * 1.1; mode = onPatient && horiz ? "spin" : onDesk && horiz ? "orbit" : "walk"; }
  if (mode === "spin") { turn.rotation.y += dx * 0.011; spinV = dx * 0.011 * 40; autoSpin && setAuto(false); return; }
  if (mode === "orbit") { odesk.drag(dx * 0.0042, dts); return; }
  me.yaw -= dx * 0.006;
  if (Math.abs(dy) >= Math.abs(dx) * 0.5) { walkBy(-dy * 0.014); if (Math.abs(dy) >= 1) { holdDir = dy < 0 ? 1 : -1; lastV = performance.now(); } }
});
const stopHold = () => { dn = 0; holdDir = 0; clearTimeout(lpT); lpT = 0; if (grab) { grab.grab = 0; grab.dragX = 0; grab = null; } odesk.release(); };
cv.addEventListener("pointercancel", stopHold); cv.addEventListener("lostpointercapture", () => { holdDir = 0; }); addEventListener("blur", stopHold);
cv.addEventListener("pointerup", (e) => { const was = mvd, h = held; stopHold(); if (was > 8 || h) return; tapAt(e.clientX, e.clientY); });
function setAuto(on) { autoSpin = on; $("#spin").dataset.on = on ? "1" : "0"; }
$("#spin").onclick = () => setAuto(!autoSpin);
$("#pnl").onclick = restorePanels;
$("#xray").onclick = () => { insideWant = !insideWant; $("#xray").dataset.on = insideWant ? "1" : "0"; };

/* ================================================================ the other doctors */
const remotes = new Map(); let peerList = [], net = null, netKey = "";
function remoteFor(p) {
  let r = remotes.get(p.sid); if (r) return r;
  r = { sid: p.sid, doc: null, x: 0, z: 9.6, yaw: Math.PI, tx: 0, tz: 9.6, ty: Math.PI, last: performance.now(), info: p, near: false, seen: false }; remotes.set(p.sid, r);
  const sex = p.sex === "f" ? "f" : "m";
  loadDoctorBody(sex).then((gltf) => { if (!remotes.has(p.sid)) return; r.doc = createDoctor(T, gltf, { name: r.info.name, spec: r.info.spec, sex }); r.doc.group.visible = r.seen; r.doc.group.userData.sid = p.sid; S.add(r.doc.group); }).catch((e) => console.warn("doctor body not loaded", e));
  return r;
}
function startNet() {
  const code = mdt.room && mdt.room.code; if (!code) return; const key = code + "|" + mySpec; if (key === netKey) return;
  if (net) net.close(); netKey = key; peerList = []; remotes.forEach((r) => { if (r.doc) S.remove(r.doc.group); }); remotes.clear();
  net = createHallNet({
    code, id: myId, name: myName, spec: mySpec, sex: Q.get("sex") || "m", signal: Q.get("net") === "local" ? localSignal : ntfySignal, iceServers: Q.get("ice") === "none" ? [] : undefined,
    onPeers: (list) => { peerList = list; list.forEach((p) => { const r = remoteFor(p); r.info = p; }); chips(); },
    onPeerState: (p, st) => { const r = remoteFor(p); r.tx = st.x; r.tz = st.z; r.ty = st.y; r.near = st.bed >= 0; r.last = performance.now(); if (!r.seen) { r.seen = true; r.x = st.x; r.z = st.z; r.yaw = st.y; if (r.doc) r.doc.group.visible = true; } },
    onPeerLeave: (p) => { const r = remotes.get(p.sid); if (r) { if (r.doc) S.remove(r.doc.group); remotes.delete(p.sid); } chips(); },
  });
}
function chips() {
  const el = $("#team"); if (!el) return; const mem = (mdt.room && mdt.room.members) || [];
  const you = `<span class="chip me g"><i></i>${esc(myName)} · ${esc(specInfo(mySpec)[0])}</span>`;
  const others = peerList.map((p) => `<span class="chip g ${p.connected ? "on" : ""}"><i></i>${esc(p.name || "Doctor")} · ${esc(specInfo(p.spec)[0])}</span>`).join("");
  const seen = new Set(peerList.map((p) => p.id)); seen.add(myId);
  el.innerHTML = you + others + mem.filter((m) => !seen.has(m.userId)).map((m) => `<span class="chip g off"><i></i>${esc(m.name)} · ${esc(specInfo(m.specialty)[0])}</span>`).join("");
}

/* ================================================================ tapping: doctor, device, organ */
const ORG = {
  lungs: ["Lungs", "Lung", (p) => `SpO₂ ${Math.round(p.spo2)}% · RR ${Math.round(p.rr)}${p.tube ? " · ventilated" : p.oxygen ? " · on oxygen" : ""}`], heart: ["Heart", "Heart", (p) => `HR ${Math.round(p.hr)} · ${p.rhythm || "sinus"} · MAP ${Math.round(p.map)}`],
  kidneys: ["Kidneys", "Kidney", (p) => `Creatinine ${p.cr} mg/dL · K⁺ ${p.k}`], bladder: ["Bladder", "Kidney", () => "Urine output is watched here."], brain: ["Brain", "Brain", (p) => `GCS ${Math.round(p.gcs)}`], spinal: ["Spinal cord", "Brain", () => ""],
  liver: ["Liver", "Gut", () => ""], stomach: ["Stomach", "Gut", () => ""], bowel: ["Bowel", "Abdomen", () => ""], pancreas: ["Pancreas", "Abdomen", () => ""], spleen: ["Spleen", "Abdomen", () => ""], arteries: ["Arteries", "Orders", (p) => (p.artLine ? "Arterial line in place" : "No arterial line yet")], veins: ["Veins", "Orders", () => ""],
};
const FOCUS_D = { lungs: 1.35, heart: 1.1, brain: 0.95, kidneys: 1.2, liver: 1.25, stomach: 1.2, bowel: 1.3, pancreas: 1.2, spleen: 1.2, bladder: 1.2, spinal: 1.3, arteries: 1.3, veins: 1.3 };
let cardT = 0, sel = "";
function card(html, ms) { const c = $("#card"); c.innerHTML = html; c.hidden = false; clearTimeout(cardT); cardT = setTimeout(() => { c.hidden = true; }, ms || 8000); }
function tapAt(cx, cy) {
  setRay(cx, cy);
  const tid = odesk.pick(ray); if (tid) { if (tid === secId) closeSection(); else openSection(tid); return; }
  const docs = []; remotes.forEach((r) => { if (r.doc && r.doc.group.visible) docs.push(r.doc.group); });
  const hd = ray.intersectObjects(docs, true)[0];
  if (hd) { let o = hd.object; while (o && !o.userData.sid) o = o.parent; const r = o && remotes.get(o.userData.sid); if (r) { card(`<b>Dr ${esc(r.info.name)}</b><span>${esc(specInfo(r.info.spec)[0])}${r.near ? " · at the patient" : " · in the hall"}</span>`); return; } }
  const hv = ray.intersectObjects([dev.vent, dev.pole], true)[0];
  if (hv) { const isV = (() => { let o = hv.object; while (o) { if (o === dev.vent) return true; o = o.parent; } return false; })(); if (isV) card(`<b>Ventilator</b><span>${eq.tube ? "Connected through the endotracheal tube." : eq.oxygen ? "Standby. The patient is on oxygen." : "Standby. Intubate to connect it."}</span><div class="row"><button id="go1">Lung orders</button></div>`); else card(`<b>IV pole and pumps</b><span>${eq.norepi || eq.fluid || eq.abx || eq.blood ? "Running: " + [eq.norepi && "noradrenaline", eq.fluid && "fluid", eq.abx && "antibiotic", eq.blood && "blood"].filter(Boolean).join(", ") + "." : "Nothing is running yet."}</span><div class="row"><button id="go1">General orders</button></div>`); const b = $("#go1"); if (b) b.onclick = () => openDock(isV ? "Lung" : "Orders"); return; }
  const ho = ray.intersectObjects(organMeshes, false)[0];
  if (ho) { focusOrgan(ho.object.userData.organ); return; }
  if (ray.intersectObject(hitCyl, false)[0]) card(`<b>${SC ? esc(SC.name) + ", " + SC.age : "The patient"}</b><span>${SC ? esc(SC.dx) : "Waiting for the case."}</span><span>Tap an organ to go in close. Drag sideways on the patient to turn him round.</span>`);
}
function focusOrgan(name) {
  const o = organs[name], info = ORG[name]; if (!o || !info) return; sel = name;
  const c = new T.Box3().setFromObject(o.mesh).getCenter(new V()), d = FOCUS_D[name] || 1.3; let dx = cam.position.x - c.x, dz = cam.position.z - c.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  focus = { x: c.x + dx * d * 1.25, z: c.z + dz * d * 1.25, h: Math.max(c.y + 0.1, 1.95), name, c }; retreat = false; closeSection();
  const line = P ? info[2](P) : ""; card(`<b>${info[0]}</b>${line ? `<span>${esc(line)}</span>` : ""}<div class="row"><button id="go1">${info[1]} orders</button><button id="go2">Back to the hall</button></div>`, 20000);
  $("#go1").onclick = () => openDock(info[1]); $("#go2").onclick = () => { focus = null; retreat = true; $("#card").hidden = true; sel = ""; };
}
$("#bed").onclick = () => { focus = null; retreat = false; const r = Math.hypot(me.x, me.z) || 1, k = 3.75 / r; goal = { x: me.x * k, z: me.z * k }; };
let goal = null;

/* ================================================================ the Orders dock */
let dockOpen = false, dockGroup = "";
const GROUPS_ORDER = ["Orders", "Lung", "Heart", "Infection", "Kidney", "Gut", "Abdomen", "Brain"];
function openDock(g) { closeSection(); dockOpen = true; if (g) dockGroup = g; renderDock(true); $("#dock").hidden = false; $("#rx").hidden = true; }
function closeDock() { dockOpen = false; $("#dock").hidden = true; $("#rx").hidden = !(mdt.room && mdt.room.status === "live"); }
$("#dx").onclick = closeDock; $("#rx").onclick = () => openDock(dockGroup || "");
let dockKey = "";
function renderDock(force) {
  const o = mdt.orders, room = mdt.room; if (!o || !room || room.status !== "live") { $("#dock").hidden = true; return; }
  const arrest = (o.acls || []).length > 0, tabs = [];
  if (arrest) tabs.push({ id: "!Resus", label: "Resuscitation", items: o.acls, red: true });
  (o.groups || []).forEach((g) => { if (g.items.some((i) => i.ok)) tabs.push({ id: g.g, label: g.g, items: g.items }); });
  if ((o.call || []).length) tabs.push({ id: "!Call", label: "Call in", items: o.call.map((c) => ({ kind: "call", specialty: c.id, label: "Call " + c.label, ok: c.ok })) });
  if ((o.wrong || []).length) tabs.push({ id: "!Risky", label: "Risky steps", items: o.wrong });
  if (o.enter) tabs.unshift({ id: "!Enter", label: "Enter", items: [{ kind: "enter", label: "Enter the bedspace", ok: true }] });
  if (!tabs.some((t) => t.id === dockGroup)) dockGroup = (arrest ? "!Resus" : (tabs.find((t) => !t.id.startsWith("!")) || tabs[0] || {}).id) || "";
  const key = JSON.stringify([tabs.map((t) => [t.id, t.items.map((i) => (i.ok ? 1 : 0) + i.kind)]), dockGroup, mdt.busy]); if (!force && key === dockKey) return; dockKey = key;
  $("#dtitle").textContent = "Treatment · " + specInfo(mySpec)[0];
  $("#tabs").innerHTML = tabs.map((t) => `<button type="button" class="${t.red ? "red" : ""}" data-t="${esc(t.id)}" data-on="${t.id === dockGroup ? 1 : 0}">${esc(t.label)}</button>`).join("");
  const cur = tabs.find((t) => t.id === dockGroup);
  $("#btns").innerHTML = cur ? cur.items.map((i, n) => `<button type="button" class="bt" data-n="${n}" ${i.ok && !mdt.busy ? "" : "disabled"}>${esc(i.label)}${i.ok ? "" : "<small>not your call</small>"}</button>`).join("") : "";
  $("#dnote").textContent = mdt.err || (mdt.busy ? "Sending…" : "");
  $("#tabs").querySelectorAll("button").forEach((b) => { b.onclick = () => { dockGroup = b.dataset.t; renderDock(true); }; });
  $("#btns").querySelectorAll("button").forEach((b) => { b.onclick = () => { const i = cur.items[+b.dataset.n]; b.classList.add("sent"); post("hall-order", { kind: i.kind, specialty: i.specialty || "" }); sfx.unlock(); }; });
  if (dockOpen) { $("#dock").hidden = false; $("#rx").hidden = true; } else $("#rx").hidden = false;
}

/* ================================================================ the shift desk: open, join, choose a seat, begin */
const SPECS = Object.keys(SPEC);
let desk = { name: "", slots: { intensivist: 1 }, code: "" }, deskKey = "";
function renderDesk() {
  const el = $("#desk"), room = mdt.room, err = mdt.err ? `<p class="err">${esc(mdt.err)}</p>` : "";
  let key = JSON.stringify([!!room, room && room.status, room && room.members, room && room.slots, room && P && P.outcome, desk.slots, mdt.busy, mdt.err, room && room.you]);
  if (key === deskKey) return; deskKey = key;
  if (!room) {
    el.hidden = false; const tot = Object.values(desk.slots).reduce((a, b) => a + b, 0);
    el.innerHTML = `<h2>Multidisciplinary team</h2><h1>Open a shift</h1><p>Up to five doctors share one patient. Set the seats, then open the shift. Others join with the code.</p><input id="dn" maxlength="48" value="${esc(desk.name || myName)}" placeholder="Your name"><div class="seats">${SPECS.map((s) => `<div class="g seat" style="border-radius:10px"><span>${esc(SPEC[s][0])}</span><span class="step"><button data-s="${s}" data-a="-1" type="button">−</button><b>${desk.slots[s] || 0}</b><button data-s="${s}" data-a="1" type="button">+</button></span></div>`).join("")}</div><button class="go" id="mk" type="button" ${mdt.busy || tot < 1 ? "disabled" : ""}>Create the shift</button><input id="jc" maxlength="6" placeholder="Or join with a code" value="${esc(desk.code)}"><button class="go" id="jn" type="button" ${mdt.busy ? "disabled" : ""}>Join</button>${err}`;
    $("#dn").oninput = (e) => { desk.name = e.target.value; }; $("#jc").oninput = (e) => { desk.code = e.target.value.toUpperCase(); e.target.value = desk.code; };
    el.querySelectorAll("button[data-s]").forEach((b) => { b.onclick = () => { const s = b.dataset.s, n = clamp((desk.slots[s] || 0) + +b.dataset.a, 0, 5); if (Object.values(desk.slots).reduce((a, c) => a + c, 0) - (desk.slots[s] || 0) + n > 5) return; desk.slots[s] = n; deskKey = ""; renderDesk(); }; });
    $("#mk").onclick = () => { myName = (desk.name || myName).slice(0, 40); post("hall-create", { name: myName, slots: desk.slots }); };
    $("#jn").onclick = () => { if (desk.code.trim().length >= 4) post("hall-join", { code: desk.code.trim() }); };
    return;
  }
  if (room.status === "lobby") {
    el.hidden = false; const taken = (id) => room.members.filter((m) => m.specialty === id).length;
    el.innerHTML = `<h2>Waiting room</h2><div class="code">${esc(room.code)}</div><p>Share this code. The case is built from the seats that are taken.</p><div class="seats">${SPECS.filter((s) => (room.slots[s] || 0) > 0).map((s) => { const open = room.slots[s] - taken(s), mine = room.you && room.you.specialty === s; return `<button class="seat" data-seat="${s}" data-on="${mine ? 1 : 0}" ${!mine && open <= 0 || mdt.busy ? "disabled" : ""} type="button"><span>${esc(SPEC[s][0])}</span><small>${mine ? "Your seat" : open > 0 ? open + " open" : "Full"}</small></button>`; }).join("")}</div><ul>${room.members.map((m) => `<li><b>${esc(m.name)}</b><span>${m.specialty ? esc(SPEC[m.specialty] ? SPEC[m.specialty][0] : m.specialty) : "No seat yet"}</span></li>`).join("")}</ul>${room.host ? `<button class="go" id="bg" type="button" ${mdt.busy ? "disabled" : ""}>Begin the shift</button>` : "<p>Wait for the doctor who opened the shift.</p>"}${err}`;
    el.querySelectorAll("button[data-seat]").forEach((b) => { b.onclick = () => post("hall-seat", { specialty: b.dataset.seat }); });
    const bg = $("#bg"); if (bg) bg.onclick = () => post("hall-begin");
    return;
  }
  if (P && P.outcome) {
    el.hidden = false; el.innerHTML = `<h2>${P.outcome === "died" ? "The patient has died" : "The patient is holding"}</h2><p>${esc(P.outcomeLine || "")}</p>${(P.missed || []).length ? "<ul>" + P.missed.map((m) => `<li>${esc(m)}</li>`).join("") + "</ul>" : ""}<button class="go" id="ok" type="button">Look at the patient</button>`; $("#ok").onclick = () => { deskOk = key; el.hidden = true; }; if (deskOk === key) el.hidden = true; return;
  }
  el.hidden = true;
}
let deskOk = "";

/* ================================================================ what comes in: results, findings, the trends, and the popups */
const feed = [], hist = [], labSeries = [], seenKeys = new Set(), unseen = { lab: 0, rad: 0, overview: 0 };
let feedInit = false, lastLab = "";
const FIND_RE = [[/looked at the heart/i, "img", "Echocardiogram"], [/blood cultures/i, "lab", "Blood cultures"], [/bronchoscopy/i, "find", "Bronchoscopy"], [/examined/i, "find", "Examination"]];
const SECOF = { lab: "lab", img: "rad", find: "overview" };
function scanFeed() {
  if (!P) return; const fresh = [];
  (P.results || []).forEach((r) => { const k = "r|" + r.label + "|" + r.text; if (!seenKeys.has(k)) { seenKeys.add(k); fresh.push({ kind: /Labs/i.test(r.label) ? "lab" : "img", label: r.label, text: r.text, key: k }); } });
  (P.log || []).forEach((l) => { const k = "l|" + l.t + "|" + l.text; if (seenKeys.has(k)) return; seenKeys.add(k); const f = FIND_RE.find((x) => x[0].test(l.text || "")); if (f) fresh.push({ kind: f[1], label: f[2], text: l.text, key: k }); });
  fresh.forEach((i) => { i.hour = P.hour; feed.push(i); if (feedInit) { pushPopup(i); const sc = SECOF[i.kind]; if (secId !== sc) unseen[sc]++; } });
  feedInit = true;
  const l = labsOf({ P }); if (l.sent && l.text !== lastLab) { lastLab = l.text; labSeries.push({ hour: P.hour, lactate: l.lactate, cr: l.cr, k: l.k, hb: l.hb }); }
  const h = { hour: P.hour, hr: P.hr, map: P.map, spo2: P.spo2, temp: P.temp }; if (hist.length && hist[hist.length - 1].hour === P.hour) hist[hist.length - 1] = h; else hist.push(h); if (hist.length > 60) hist.shift();
}
function badgeAll() { Object.keys(unseen).forEach((k) => odesk.setBadge(k, unseen[k])); }

/* ================================================================ the seven scientific sections */
let secId = "", secSub = 0, secKey = "";
const sciCtx = () => ({ P, SC, eq, orders: mdt.orders, busy: mdt.busy, room: mdt.room, labSeries, hist, feed });
const viewAz = () => Math.atan2(cam.position.x, cam.position.z);
function sciHtml() {
  const sec = SECTIONS.find((x) => x.id === secId); if (!sec) return "";
  return `<header><span class="no">${sec.n}</span><h2>${esc(sec.title)}</h2><button id="scix" type="button" aria-label="Close">✕</button></header><nav class="subs">${sec.subs.map((t, i) => `<button type="button" data-i="${i}" data-on="${i === secSub ? 1 : 0}">${esc(t)}</button>`).join("")}</nav><div class="sbody"><h3>${esc(sec.subs[secSub])}</h3>${buildSection(secId, secSub, sciCtx())}</div>`;
}
function sciPaint() {
  const el = $("#sci"); el.querySelectorAll("canvas.ximg").forEach((c) => paintImage(c, c.dataset.k, c.dataset.r)); el.querySelectorAll("canvas.ecg").forEach((c) => paintEcg(c, +c.dataset.hr, c.dataset.r, c.dataset.a === "1"));
}
function renderSection(force) {
  if (!secId) return; const key = JSON.stringify([secId, secSub, P && [Math.round(P.hr), Math.round(P.map), Math.round(P.spo2), P.hour, (P.results || []).length, (P.log || []).length, P.tube, P.norepi, P.oxygen, P.artLine, P.hdLine, P.dialysis], mdt.busy, mdt.orders && JSON.stringify(mdt.orders.groups.map((g) => g.items.map((i) => i.ok ? 1 : 0))), mdt.room && mdt.room.members && mdt.room.members.length]);
  if (!force && key === secKey) return; secKey = key; const el = $("#sci"), sb = el.querySelector(".sbody"), top = sb ? sb.scrollTop : 0, ns = el.querySelector(".subs"), nl = ns ? ns.scrollLeft : 0;
  el.innerHTML = sciHtml(); const nb = el.querySelector(".sbody"); if (nb && !force) nb.scrollTop = top; const n2 = el.querySelector(".subs"); if (n2 && !force) n2.scrollLeft = nl; sciPaint();
  const on = el.querySelector(".subs [data-on='1']"), sn = el.querySelector(".subs"); if (on && sn && force) sn.scrollLeft = on.offsetLeft - (sn.clientWidth - on.offsetWidth) / 2;
}
function openSection(id, sub) {
  if (!SECTIONS.some((x) => x.id === id)) return; const was = secId; closeDock(); $("#card").hidden = true; secId = id; secSub = sub || 0; unseen[id] = 0; badgeAll(); odesk.setActive(id); odesk.faceTile(id, viewAz()); $("#hint").style.opacity = 0;
  renderSection(true); const el = $("#sci"), sc = odesk.screenOf(id, cam); el.style.transformOrigin = sc ? Math.round(clamp(sc.x, 0, 1) * 100) + "% " + Math.round(clamp(sc.y, 0, 1) * 100) + "%" : "50% 100%"; el.hidden = false;
  if (!was) { el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); } sfx.unlock();
}
function closeSection() { secId = ""; secKey = ""; odesk.setActive(null); const el = $("#sci"); el.hidden = true; el.classList.remove("in"); }
$("#sci").addEventListener("click", (e) => {
  const t = e.target.closest("button,canvas"); if (!t) return;
  if (t.id === "scix") return closeSection();
  if (t.dataset.i != null && t.closest(".subs")) { secSub = +t.dataset.i; renderSection(true); return; }
  if (t.dataset.act === "order") { post("hall-order", { kind: t.dataset.kind, specialty: t.dataset.spec || "" }); t.classList.add("sent"); sfx.unlock(); return; }
  if (t.dataset.act === "goto") { secSub = +t.dataset.sub || 0; secId = t.dataset.sec; unseen[secId] = 0; badgeAll(); odesk.setActive(secId); odesk.faceTile(secId, viewAz()); renderSection(true); return; }
  if (t.tagName === "CANVAS" && t.classList.contains("ximg")) { const r = t.getBoundingClientRect(), x = (e.clientX - r.left) * t.width / r.width, y = (e.clientY - r.top) * t.height / r.height, hs = hotspotAt(t.dataset.k, x, y, t.width, t.height, t.dataset.r), box = $("#sci").querySelector(".hot"); if (box) { box.textContent = hs ? hs.n + ". " + hs.text : "Tap on one of the numbered spots."; box.dataset.hit = hs && hs.hit ? "1" : "0"; } }
});
function tileInfo() {
  if (!P) { SECTIONS.forEach((x) => odesk.setInfo(x.id, "waiting for the case")); return; }
  const l = labsOf({ P }), so = sofaOf({ P, SC, eq, labSeries }), rs = (P.results || []).filter((r) => /Chest|CT/.test(r.label)).length + (P.log || []).filter((x) => /looked at the heart/.test(x.text || "")).length, run = [P.norepi, eq.fluid > 0, eq.abx, eq.blood, P.dialysis].filter(Boolean).length;
  odesk.setInfo("overview", (SC ? SC.name.split(" ")[0] + " · " : "") + "hour " + P.hour); odesk.setInfo("vitals", "HR " + Math.round(P.hr) + " · MAP " + Math.round(P.map) + " · SpO₂ " + Math.round(P.spo2));
  odesk.setInfo("lab", l.sent ? "Lactate " + l.lactate + " · K " + l.k : "no blood sent yet"); odesk.setInfo("orders", run + " running"); odesk.setInfo("rad", rs ? rs + " stud" + (rs > 1 ? "ies" : "y") : "no images yet"); odesk.setInfo("organ", "GCS " + Math.round(P.gcs) + " · RR " + Math.round(P.rr)); odesk.setInfo("intel", "SOFA at least " + so.tot);
}

/* ================================================================ the state from the Team room */
const equipFrom = (p) => { const L = (p.log || []).map((x) => x.text || ""), cnt = (re) => L.filter((t) => re.test(t)).length; return { tube: !!p.tube, oxygen: !!p.oxygen, spo2: Math.round(p.spo2), rr: p.rr, norepi: !!p.norepi, fluid: cnt(/fluid bolus/), abx: cnt(/started antibiotics/) > 0, blood: cnt(/transfused blood/) > 0, dialysis: !!p.dialysis, saline: cnt(/3% saline/) > 0, mannitol: cnt(/mannitol/) > 0 }; };
function apply(d) {
  mdt = { room: d.room || null, orders: d.orders || null, busy: !!d.busy, err: d.err || "", line: !!d.line };
  if (d.me) { if (d.me.name) myName = d.me.name; }
  const room = mdt.room; P = room && room.patient || null; SC = room && room.scenario || null;
  const spec = room && room.you && room.you.specialty; if (spec && spec !== mySpec) mySpec = spec;
  if (room && room.code) startNet();
  if (P) { eq = equipFrom(P); refreshTubes(true); scanFeed(); tileInfo(); badgeAll(); renderSection(false); } else if (secId) closeSection();
  $("#line").dataset.on = mdt.line ? "1" : "0";
  $("#title").textContent = room ? (room.code ? "Medical Nexus · " + room.code : "Medical Nexus") + (SC ? " · " + SC.dx : "") : "Medical Nexus";
  $("#vit").hidden = !(P && room.status === "live"); chips(); renderDesk(); renderDock(); $("#rx").hidden = dockOpen || !(room && room.status === "live");
  if (nameLabel.key !== (SC ? SC.name : "") && SC) setNameLabel();
}
function setNameLabel() {
  if (nameLabel.sp) { patient.remove(nameLabel.sp); nameLabel.sp.material.map.dispose(); }
  nameLabel.key = SC.name; const sp = nameTag(T, `${SC.name}, ${SC.age}`, SC.dx.length > 30 ? SC.dx.slice(0, 29) + "…" : SC.dx, 0x5fe3ff); sp.position.set(0, 2.05, 0); sp.scale.set(1.35, 0.34, 1); patient.add(sp); nameLabel.sp = sp;
}
addEventListener("message", (e) => { const d = e.data; if (d && d.type === "mdt-state") apply(d); });
$("#exit").onclick = () => leave("hall-exit"); $("#classic").onclick = () => leave("hall-classic"); $("#line").onclick = () => post("hall-line");
function leave(type) { if (net) { net.close(); net = null; } post(type); }

/* the vitals strip across the top of the screen */
function paintStrip() {
  const el = $("#vit"); if (el.hidden || !P) return; const c = (bad, warn) => bad ? "x" : warn ? "w" : "";
  const it = [["HR", Math.round(disp.hr), c(disp.hr > 130 || disp.hr < 45, disp.hr > 110)], ["BP", Math.round(disp.sbp) + "/" + Math.round(disp.dbp), c(disp.map < 60, disp.map < 70)], ["SpO₂", Math.round(disp.spo2), c(disp.spo2 < 88, disp.spo2 < 93)], ["RR", Math.round(disp.rr), c(disp.rr > 30, disp.rr > 24)], ["GCS", Math.round(disp.gcs), c(disp.gcs <= 8, disp.gcs < 13)]];
  const html = it.map(([l, v, k]) => `<span class="${k}">${l}<b>${v}</b></span>`).join(""); if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
}

/* ================================================================ the sound: the monitor beeps with the heart */
let nextBeep = 0;
function sounds(now) {
  if (!sfx.isOn || !sfx.isOn() || !P || !mdt.room || mdt.room.status !== "live") return; sfx.setListener(me.x, me.z, me.yaw); if (now < nextBeep) return;
  const st = statusOf(P); sfx.beep({ f: [880, 1046, 1175][st], vol: 0.7, pos: { x: 1.4, z: -0.4 } }); nextBeep = now + 60000 / Math.max(40, disp.hr || 70);
}

/* ================================================================ the loop */
let vsh = 0, last = 0, sendT = 0, mvSpeed = 0, px = me.x, pz = me.z, bobT = 0, t0 = performance.now(), shown = false, panelT = 0;
const camTarget = new V(), organPos = new V();
function loop(now) {
  requestAnimationFrame(loop);
  if (now - last < 1000 / 45) return; const dt = Math.min((now - last) / 1000, 0.1); last = now; const t = (now - t0) / 1000;
  /* arrival: walk in through the door while the opening screen fades */
  if (arrive.t < 2.4 && shown) { arrive.t = (performance.now() - arrive.t0) / 1000; const k = clamp(arrive.t / 2.4, 0, 1), e = k * k * (3 - 2 * k); me.x = arrive.from.x + (arrive.to.x - arrive.from.x) * e; me.z = arrive.from.z + (arrive.to.z - arrive.from.z) * e; me.yaw = faceCenter(me.x, me.z); }
  if (dn && holdDir && mvd > 10 && performance.now() - lastV > 120 && mode !== "spin") walkBy(holdDir * dt * 1.7);
  /* glide to the bedside, or to an organ, or back out when released */
  let eyeH = 1.6, pit = 0;
  if (focus) { const k = 1 - Math.exp(-dt * 3.2); me.x += (focus.x - me.x) * k; me.z += (focus.z - me.z) * k; const ty = Math.atan2(focus.c.x - me.x, -(focus.c.z - me.z)); let dy = ty - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * k; me.h += (focus.h - me.h) * k; me.pit += (0 - me.pit) * k; }
  else { me.h += (1.6 - me.h) * Math.min(1, dt * 3); me.pit += (0 - me.pit) * Math.min(1, dt * 3); if (goal) { const k = 1 - Math.exp(-dt * 2.6); me.x += (goal.x - me.x) * k; me.z += (goal.z - me.z) * k; let dy = faceCenter(me.x, me.z) - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * k; if (Math.hypot(goal.x - me.x, goal.z - me.z) < 0.03) goal = null; } if (retreat) { const r = Math.hypot(me.x, me.z); if (r < MINR - 0.01) { const k = Math.min(1, dt * 2.4), nr = r + (MINR - r) * k; me.x *= nr / (r || 1); me.z *= nr / (r || 1); } else retreat = false; } }
  eyeH = me.h; pit = me.pit;
  const sp = Math.hypot(me.x - px, me.z - pz) / Math.max(dt, 0.001); mvSpeed += (sp - mvSpeed) * Math.min(1, dt * 8); px = me.x; pz = me.z;
  bobT += mvSpeed * dt * 2.2; const bob = focus ? 0 : Math.sin(bobT * 3.0) * 0.016 * Math.min(1, mvSpeed);
  { const w = innerWidth, h = innerHeight, pt = cam.aspect < 0.8; vsh += ((secId ? 1 : 0) - vsh) * Math.min(1, dt * 5); if (vsh > 0.004) cam.setViewOffset(w, h, pt ? 0 : w * 0.2 * vsh, pt ? h * 0.2 * vsh : 0, w, h); else if (cam.view) cam.clearViewOffset(); }
  cam.position.set(me.x, eyeH + bob, me.z); cam.rotation.order = "YXZ"; cam.rotation.set(focus ? Math.atan2(focus.c.y - eyeH, Math.hypot(focus.c.x - me.x, focus.c.z - me.z)) * 0.8 : pit, -me.yaw, 0);
  /* the patient: turntable, breathing, heartbeat, status colour */
  if (!dn || mode !== "spin") { if (autoSpin) turn.rotation.y += dt * 0.5; else { turn.rotation.y += spinV * dt; spinV *= Math.exp(-dt * 3.2); } }
  const tgt = P || { hr: 80, sbp: 120, dbp: 75, map: 90, spo2: 98, rr: 16, gcs: 15, temp: 37, k: 4, lactate: 1.5, cr: 1 }, kk = Math.min(1, dt * 1.6);
  ["hr", "sbp", "dbp", "map", "spo2", "rr", "gcs", "temp", "k", "lactate", "cr"].forEach((f) => { if (typeof tgt[f] === "number") disp[f] += (tgt[f] - disp[f]) * kk; });
  const st = statusOf(P), alive = !P || P.alive !== false, cc = new T.Color(["#4fd8ff", "#ffc24a", "#ff4d5e"][st]);
  rimU.c.value.lerp(alive ? cc : new T.Color(0x8d9aa5), Math.min(1, dt * 3)); rimU.k.value = 0.85 + 0.15 * Math.sin(t * (st === 2 ? 6 : 1.6));
  haloM.color.lerp(alive ? cc : new T.Color(0x667788), Math.min(1, dt * 3)); haloM.opacity = 0.45 + 0.2 * Math.sin(t * (st === 2 ? 6 : 1.6));
  const hb = 1 + 0.06 * Math.max(0, Math.sin(t * Math.PI * 2 * (disp.hr / 60))) * (alive ? 1 : 0), br = alive ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (disp.rr / 60)) : 0;
  if (organs.heart && organs.heart.pv) organs.heart.pv.scale.setScalar(hb); if (organs.lungs && organs.lungs.pv) organs.lungs.pv.scale.set(1 + 0.05 * br, 1 + 0.02 * br, 1 + 0.05 * br);
  if (organs.lungs && P) { const blue = clamp((93 - disp.spo2) / 14, 0, 1); organs.lungs.mesh.material.color.copy(organs.lungs.base).lerp(new T.Color(0x6a74c8), blue); organs.lungs.mesh.material.emissive.copy(organs.lungs.mesh.material.color); }
  const hot = new Set(); ((P && P.problems) || []).forEach((q) => { if (q.open && !q.resolved) ({ pulmonologist: ["lungs"], cardiologist: ["heart", "arteries"], nephrologist: ["kidneys", "bladder"], infectious: ["spleen"], gastroenterologist: ["stomach", "liver"], surgeon: ["bowel", "pancreas"], neurologist: ["brain", "spinal"] }[q.specialty] || []).forEach((n) => hot.add(n)); });
  Object.keys(organs).forEach((n) => { const o = organs[n], on = hot.has(n) || n === sel, base = 0.2; o.mesh.material.emissiveIntensity = base + (on ? 0.5 + 0.35 * Math.sin(t * 4) : 0); });
  if (shown || arrive.t > 0.2) dev.update(eq, t);
  if (nameLabel.sp) nameLabel.sp.material.opacity = clamp((Math.hypot(cam.position.x, cam.position.z) - 2.0) / 1.6, 0, 1);
  refreshTubes(false);
  /* panels, strip */
  odesk.update(dt, t, viewAz()); { const want = insideWant || !!focus ? 0.17 : 1; bodyMat.opacity += (want - bodyMat.opacity) * Math.min(1, dt * 5); bodyMat.depthWrite = bodyMat.opacity > 0.6; }
  updatePanels(dt, t); if ((panelT += dt) > 0.25) { panelT = 0; paintStrip(); renderDock(false); }
  /* send my place to the others */
  if ((sendT += dt) > 0.1) { sendT = 0; if (net) net.send({ x: +me.x.toFixed(2), z: +me.z.toFixed(2), y: +me.yaw.toFixed(3), a: mvSpeed > 0.15 ? 1 : 0, bed: Math.hypot(me.x, me.z) < 4.2 ? 1 : -1 }); }
  remotes.forEach((r) => {
    if (!r.doc) return; const k = Math.min(1, dt * 9), ox = r.x, oz = r.z; r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k; let dy = r.ty - r.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.yaw += dy * k;
    const v = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 0.001); r.doc.setMoving(Math.min(1, v / 1.6)); r.doc.group.position.set(r.x, 0, r.z); r.doc.group.rotation.y = Math.PI - r.yaw; r.doc.update(dt);
    if (performance.now() - r.last > 15000 && r.info && !r.info.connected) r.doc.group.visible = false;
  });
  sounds(now); R.render(S, cam);
  if (!shown && bodyReady) { shown = true; arrive.t0 = performance.now(); requestAnimationFrame(() => $("#veil").classList.add("off")); }
}
requestAnimationFrame(loop);
bodyLoad.then((ok) => { if (!ok) $("#vmsg").textContent = "The 3D body did not load. Check the connection."; });
setTimeout(() => { $("#veil").classList.add("off"); }, 9000);
setTimeout(() => { $("#hint").style.opacity = 0; }, 22000);

/* ================================================================ start */
$("#title").textContent = "Medical Nexus"; chips(); renderDesk();
post("hall-ready");
window.__nexus = { me, cam, S, turn, remotes, organs, dev, desk: odesk, panels, pops, feed, hist, labSeries, openSection, closeSection, bodyMat, tapAt, get mdt() { return mdt; }, eqSet: (x) => { Object.assign(eq, x); refreshTubes(true); }, apply, peers: () => peerList, net: () => net, focusOrgan, get P() { return P; } };
if (DEMO) {
  const orders = { groups: [{ g: "Orders", items: [{ kind: "examine", label: "Examine", ok: true }, { kind: "labs", label: "Send labs", ok: true }, { kind: "antibiotics", label: "Antibiotics", ok: true }, { kind: "fluid", label: "Fluid 500 mL", ok: true }, { kind: "norepi", label: "Noradrenaline", ok: true }, { kind: "art-line", label: "Insert arterial line", ok: true }] }, { g: "Lung", items: [{ kind: "oxygen", label: "Oxygen", ok: true }, { kind: "intubate", label: "Intubate", ok: true }, { kind: "cxr", label: "Chest film", ok: true }, { kind: "ct-chest", label: "CT chest", ok: false }] }, { g: "Heart", items: [{ kind: "echo", label: "Echocardiogram", ok: true }] }], call: [{ id: "pulmonologist", label: "Pulmonologist", ok: true }, { id: "nephrologist", label: "Nephrologist", ok: true }], wrong: [{ kind: "flood", label: "Give 2 litres without looking", ok: true }], acls: [], enter: false };
  const room = { id: "demo", code: "DEMO42", status: "live", host: true, slots: { intensivist: 1, pulmonologist: 1, nephrologist: 1 }, you: { specialty: mySpec, inside: true }, members: [{ userId: myId, name: myName, specialty: mySpec, inside: true }, { userId: "x1", name: "Ravi", specialty: "pulmonologist" }, { userId: "x2", name: "Meera", specialty: "nephrologist" }], scenario: { name: "Meera Nair", age: 58, sex: "woman", dx: "Fever and hypoxaemic pneumonia", story: "Three days of fever and a productive cough. She is speaking. The saturation is 91% on air. The pressure, for now, is acceptable." }, patient: { hour: 3, hr: 112, sbp: 104, dbp: 64, map: 77, spo2: 91, rr: 28, gcs: 15, temp: 38.6, lactate: 2.6, cr: 1.4, k: 4.3, rhythm: "sinus", alive: true, tube: false, oxygen: true, norepi: false, problems: [{ id: "a", title: "Pneumonia with falling saturation", specialty: "pulmonologist", open: true, called: false }, { id: "b", title: "Rising lactate", specialty: "intensivist", open: true, called: true }], results: [{ label: "Labs", text: "Lactate 2.6 mmol/L. Creatinine 1.4 mg/dL. Potassium 4.3 mmol/L. Haemoglobin 11.4 g/dL." }], log: [{ t: 1, text: "Asha examined the patient." }, { t: 2, text: "Asha put oxygen on." }] } };
  apply({ room, orders, me: { name: myName } });
}
