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
import { createSfx } from "./sfx.js?v=20261121d";
import { createDesk, DESK } from "./nexus-desk.js?v=20261121d";
import { paintMachine } from "./nexus-machines.js?v=20261121d";
import { SECTIONS, buildSection, paintImage, paintEcg, hotspotAt, labsOf, sofaOf } from "./nexus-sections.js?v=20261121d";

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
const DOORGAP = 0.16, ZC = -17, AUD_X = -8.6 + 0.7 + 11 - 0.06;   /* the doorway in the south wall, and where the auditorium lies behind it (auditorium z of the hall's centre, auditorium x of the hall's centre) */
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
mesh(new T.CylinderGeometry(RH, RH, WH, 128, 1, true, DOORGAP, TAU - 2 * DOORGAP), new T.MeshStandardMaterial({ map: wallTex, roughness: 0.4, metalness: 0.1, side: T.BackSide, envMap: env, envMapIntensity: 0.5 }), 0, WH / 2, 0, hall);
[2.15, 4.7].forEach((y) => mesh(new T.CylinderGeometry(RH - 0.03, RH - 0.03, 0.07, 128, 1, true, DOORGAP, TAU - 2 * DOORGAP), new T.MeshBasicMaterial({ color: new T.Color(0.3, 1.6, 2.4), side: T.BackSide, toneMapped: false }), 0, y, 0, hall));
tor(RH - 0.15, 0.045, E(0x36d6ff, 2.2), 0.05, hall);

/* ceiling: dark truss, glowing rings, a bright oculus over the patient, and a faint projection cone */
mesh(new T.CircleGeometry(RH + 0.5, 64), M(0x16222e, { metalness: 0.6, roughness: 0.45 }), 0, WH, 0, hall).rotation.x = Math.PI / 2;
for (let i = 0; i < 16; i++) { const b = mesh(new T.BoxGeometry(0.14, 0.22, RH - 2.4), M(0x0f1822, { metalness: 0.7, roughness: 0.4 }), 0, WH - 0.12, 0, hall); const a = i / 16 * TAU, rr0 = (RH + 2.4) / 2 - 0.5; b.position.set(Math.sin(a) * rr0, WH - 0.12, Math.cos(a) * rr0); b.rotation.y = a; }
[3.3, 6.1, 8.9].forEach((r) => tor(r, 0.05, E(0x36d6ff, 2), WH - 0.2, hall));
tor(2.2, 0.07, E(0xbff4ff, 2.2), WH - 0.1, hall); mesh(new T.CircleGeometry(2.1, 48), E(0xffffff, 1.5), 0, WH - 0.06, 0, hall).rotation.x = Math.PI / 2;
for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.15, r = i % 2 ? 7.4 : 5.0; const d = mesh(new T.CircleGeometry(0.35, 20), E(0xe8f7ff, 1.4), Math.sin(a) * r, WH - 0.05, Math.cos(a) * r, hall); d.rotation.x = Math.PI / 2; }
mesh(new T.CylinderGeometry(0.7, 2.35, WH - DAIS_H, 48, 1, true), new T.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.055, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), 0, (WH + DAIS_H) / 2, 0, hall);

/* wall holo-screens: live scans, a turning DNA helix, running traces, changing laboratory values, gauges and a radar. They keep moving. */
const wallLive = { hr: 78, map: 85, spo2: 97, rr: 16, temp: 37, lactate: 1.8, k: 4.2, cr: 1.0 };
const WK = [["IMAGING LIBRARY", "CT · MRI · ULTRASOUND"], ["GENOMICS", "SEQUENCING RUN"], ["PHYSIOLOGY", "BEDSIDE TRACES"], ["LABORATORY", "POINT OF CARE"], ["HAEMODYNAMICS", "PRESSURE AND FLOW"], ["ICU NETWORK", "BEDS AND TEAMS"]];
function paintWall(kind, g, w, h, t) {
  const L = wallLive, C = "#7fe9ff", mono = (px) => "600 " + px + "px ui-monospace,Menlo,Consolas,monospace", sans = (px, wt) => (wt || 700) + " " + px + "px system-ui,sans-serif";
  g.clearRect(0, 0, w, h); g.fillStyle = "rgba(4,22,36,.72)"; rr(g, 4, 4, w - 8, h - 8, 22); g.fill();
  const gl = g.createLinearGradient(0, 0, 0, h); gl.addColorStop(0, "rgba(95,227,255,.12)"); gl.addColorStop(0.5, "rgba(95,227,255,0)"); gl.addColorStop(1, "rgba(95,227,255,.08)"); g.fillStyle = gl; rr(g, 4, 4, w - 8, h - 8, 22); g.fill();
  g.strokeStyle = "rgba(110,225,255,.85)"; g.lineWidth = 4; rr(g, 4, 4, w - 8, h - 8, 22); g.stroke();
  g.fillStyle = C; g.font = sans(26); g.textAlign = "left"; g.fillText(WK[kind][0], 26, 46); g.fillStyle = "#8bb6c6"; g.font = sans(14, 600); g.fillText(WK[kind][1], 28, 68);
  const on = Math.sin(t * 3) > -0.2; g.fillStyle = on ? "#ff5468" : "#5a2a32"; g.beginPath(); g.arc(w - 120, 38, 7, 0, 6.3); g.fill(); g.fillStyle = "#dff6ff"; g.font = mono(15); g.fillText("LIVE", w - 105, 44);
  g.fillStyle = "rgba(95,227,255,.14)"; g.fillRect(24, 78, w - 48, 2);
  const X0 = 26, Y0 = 92, W0 = w - 52, H0 = h - 116;
  g.save(); g.beginPath(); g.rect(X0, Y0, W0, H0); g.clip();
  if (kind === 0) {
    const cols = 4, rows = 2, cw = W0 / cols, ch = H0 / rows, act = Math.floor(t * 0.7) % 8, tags = ["CT HEAD", "CT CHEST", "MRI BRAIN", "US HEART", "CT ABD", "MRI SPINE", "US LUNG", "CT PELVIS"];
    for (let i = 0; i < 8; i++) { const cx = X0 + (i % cols) * cw + 6, cy = Y0 + Math.floor(i / cols) * ch + 6, iw = cw - 12, ih = ch - 12;
      g.fillStyle = "#03101a"; g.fillRect(cx, cy, iw, ih); const gr = g.createRadialGradient(cx + iw / 2, cy + ih / 2, 4, cx + iw / 2, cy + ih / 2, ih * 0.62); gr.addColorStop(0, i > 3 ? "#ffd27a" : "#ff9a5a"); gr.addColorStop(0.6, i > 3 ? "#d9602a" : "#2fb4a8"); gr.addColorStop(1, "rgba(5,26,42,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(cx + iw / 2, cy + ih / 2, iw * 0.34 + Math.sin(t * 1.3 + i) * 3, ih * 0.38, 0, 0, 6.3); g.fill();
      const sy = cy + ((t * 60 + i * 23) % ih); g.fillStyle = "rgba(160,255,240,.5)"; g.fillRect(cx, sy, iw, 2);
      g.fillStyle = "#cfefff"; g.font = mono(11); g.fillText(tags[i], cx + 5, cy + 14); g.strokeStyle = i === act ? "#ffcf6e" : "rgba(110,225,255,.45)"; g.lineWidth = i === act ? 3 : 1.2; g.strokeRect(cx, cy, iw, ih);
      if (i === act) { g.fillStyle = "#ffcf6e"; g.fillText("SLICE " + (100 + Math.floor(t * 9) % 150) + " / 256", cx + 5, cy + ih - 8); } }
  } else if (kind === 1) {
    const cx = X0 + W0 * 0.36, ph = t * 1.4;
    for (let i = 0; i < 52; i++) { const y = Y0 + 6 + i * (H0 - 12) / 51, a = i * 0.3 + ph, x1 = cx + Math.sin(a) * 150, x2 = cx - Math.sin(a) * 150, z1 = Math.cos(a), z2 = -z1;
      g.strokeStyle = "rgba(110,225,255," + (0.18 + 0.3 * Math.abs(Math.sin(a))) + ")"; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke();
      g.fillStyle = "rgba(255,207,110," + (0.5 + 0.5 * z1) + ")"; g.beginPath(); g.arc(x1, y, 5 + 2.5 * z1, 0, 6.3); g.fill(); g.fillStyle = "rgba(127,233,255," + (0.5 + 0.5 * z2) + ")"; g.beginPath(); g.arc(x2, y, 5 + 2.5 * z2, 0, 6.3); g.fill(); }
    const bases = "ATGCCGATTAGCGGATCATGC"; g.font = mono(20); for (let r = 0; r < 12; r++) { const y = Y0 + 24 + r * 26; for (let c = 0; c < 10; c++) { const ch = bases[(c + r * 3 + Math.floor(t * 4)) % bases.length]; g.fillStyle = { A: "#3dff9a", T: "#ff6b78", G: "#ffcf6e", C: "#48d9ff" }[ch]; g.fillText(ch, X0 + W0 * 0.64 + c * 24, y); } }
    g.fillStyle = "rgba(95,227,255,.2)"; g.fillRect(X0 + W0 * 0.64, Y0 + H0 - 26, W0 * 0.34, 10); g.fillStyle = C; g.fillRect(X0 + W0 * 0.64, Y0 + H0 - 26, W0 * 0.34 * ((t * 0.07) % 1), 10);
  } else if (kind === 2) {
    const per = 60 / Math.max(35, L.hr), tr = [["II", "#3dff9a", (f) => { const q = (m, sd, a) => a * Math.exp(-(((f - m) / sd) ** 2)); return 0.5 + 0.1 * q(0.2, 0.03, 1) + 0.9 * q(0.4, 0.014, 1) - 0.12 * q(0.37, 0.01, 1) + 0.18 * q(0.65, 0.05, 1); }, 0.7], ["ART", "#ff6b78", (f) => 0.2 + 0.6 * Math.exp(-(((f - 0.15) / 0.12) ** 2)) + 0.15 * Math.exp(-(((f - 0.45) / 0.07) ** 2)), 1], ["SpO₂", "#48d9ff", (f) => 0.2 + 0.6 * Math.exp(-(((f - 0.22) / 0.16) ** 2)), 1], ["RESP", "#f4d45a", (f) => 0.5 + 0.35 * Math.sin(f * 6.283), 1]];
    const rh = H0 / 4; tr.forEach((r, k) => { const y = Y0 + k * rh, px = 110, cyc = k === 3 ? 60 / Math.max(6, L.rr) : per; g.fillStyle = r[1]; g.font = mono(16); g.fillText(r[0], X0 + 4, y + 22); g.fillStyle = "#e9fbff"; g.font = mono(26); g.fillText(["" + Math.round(L.hr), Math.round(L.map * 1.45) + "/" + Math.round(L.map * 0.78), Math.round(L.spo2) + "%", "" + Math.round(L.rr)][k], X0 + 4, y + 52);
      g.strokeStyle = r[1]; g.lineWidth = 2.4; g.beginPath(); const sw = (t % 5) / 5; for (let x = 0; x <= W0 - px - 30; x += 3) { const u = x / (W0 - px - 30), f = (((t - (sw - u + (u > sw ? 1 : 0)) * 5) / cyc) % 1 + 1) % 1; const yy = y + rh - 8 - r[2](f) * (rh - 18); if (Math.abs(u - sw) < 0.03) { g.moveTo(X0 + px + x, yy); continue; } x ? g.lineTo(X0 + px + x, yy) : g.moveTo(X0 + px + x, yy); } g.stroke();
      g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(X0 + px + sw * (W0 - px - 30), y + 4, 3, rh - 8); });
  } else if (kind === 3) {
    const rows = [["Lactate", L.lactate, "mmol/L", 2, 4], ["pH", 7.38 - Math.max(0, L.lactate - 1.5) * 0.02, "", 7.35, 7.3], ["K⁺", L.k, "mmol/L", 5.1, 5.6], ["Creatinine", L.cr, "mg/dL", 1.3, 2.5], ["Na⁺", 138 + Math.sin(t * 0.3) * 1.5, "mmol/L", 146, 150], ["WCC", 14.2 + Math.sin(t * 0.21) * 1.2, "×10⁹/L", 11, 18], ["CRP", 188 + Math.sin(t * 0.17) * 9, "mg/L", 10, 100], ["PCT", 6.4 + Math.sin(t * 0.13) * 0.6, "ng/mL", 0.5, 2], ["Hb", 11.2 + Math.sin(t * 0.11) * 0.3, "g/dL", 0, 0]];
    const rh = H0 / rows.length; rows.forEach((r, i) => { const y = Y0 + i * rh + rh * 0.72, bad = r[4] && (r[1] >= r[4]), warn = r[3] && r[1] >= r[3] && !bad, col = bad ? "#ff5468" : warn ? "#ffcf6e" : "#a9dff0";
      if (i === 1) { const ph = r[1]; g.fillStyle = ph < 7.3 ? "#ff5468" : ph < 7.35 ? "#ffcf6e" : "#a9dff0"; } else g.fillStyle = col; g.font = mono(21); g.fillText(r[0], X0 + 6, y); g.fillText((r[1] < 10 ? r[1].toFixed(r[0] === "pH" ? 2 : 1) : Math.round(r[1])) + " " + r[2], X0 + 190, y);
      g.fillStyle = "rgba(95,227,255,.16)"; g.fillRect(X0 + 440, y - 15, W0 - 450, 12); g.fillStyle = col; g.fillRect(X0 + 440, y - 15, (W0 - 450) * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.7))), 12); });
  } else if (kind === 4) {
    const gs = [["MAP", L.map, 40, 120, "mmHg", "#3dff9a"], ["CO", 4 + Math.sin(t * 0.5) * 0.5 + (L.map - 80) * 0.02, 2, 8, "L/min", "#48d9ff"], ["SVR", 1100 + Math.sin(t * 0.4) * 80, 400, 1800, "dyn", "#ffcf6e"]];
    gs.forEach((q, i) => { const cx = X0 + W0 * (0.17 + i * 0.33), cy = Y0 + H0 * 0.62, R = Math.min(W0 * 0.14, H0 * 0.42), a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, v = Math.max(0, Math.min(1, (q[1] - q[2]) / (q[3] - q[2])));
      g.lineWidth = 12; g.lineCap = "round"; g.strokeStyle = "rgba(95,227,255,.18)"; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke(); g.strokeStyle = q[5]; g.beginPath(); g.arc(cx, cy, R, a0, a0 + (a1 - a0) * v); g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0 + (a1 - a0) * v) * R * 0.82, cy + Math.sin(a0 + (a1 - a0) * v) * R * 0.82); g.stroke();
      g.fillStyle = "#e9fbff"; g.textAlign = "center"; g.font = mono(26); g.fillText(q[0] === "SVR" ? String(Math.round(q[1])) : q[1].toFixed(q[0] === "MAP" ? 0 : 1), cx, cy + R * 0.5); g.fillStyle = "#8bb6c6"; g.font = mono(13); g.fillText(q[0] + " · " + q[4], cx, cy + R * 0.5 + 20); g.textAlign = "left"; });
    for (let i = 0; i < 24; i++) { const bx = X0 + 12 + i * ((W0 - 24) / 24), bh = (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + i * 0.5))) * H0 * 0.2; g.fillStyle = "rgba(95,227,255,.55)"; g.fillRect(bx, Y0 + H0 - bh, (W0 - 24) / 24 - 4, bh); }
  } else {
    const cx = X0 + W0 * 0.3, cy = Y0 + H0 * 0.5, R = Math.min(W0 * 0.26, H0 * 0.46), sw = t * 1.1;
    for (let k = 1; k <= 3; k++) { g.strokeStyle = "rgba(95,227,255," + (0.15 + k * 0.05) + ")"; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R * k / 3, 0, 6.3); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    const sg = g.createConicGradient ? g.createConicGradient(sw, cx, cy) : null; if (sg) { sg.addColorStop(0, "rgba(61,255,154,.55)"); sg.addColorStop(0.18, "rgba(61,255,154,0)"); sg.addColorStop(1, "rgba(61,255,154,0)"); g.fillStyle = sg; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, 0, 6.3); g.fill(); }
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, d = R * (0.35 + 0.55 * ((i * 37) % 10) / 10), bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d, age = (((sw - a) % 6.283) + 6.283) % 6.283; g.fillStyle = "rgba(255,207,110," + Math.max(0.15, 1 - age / 4) + ")"; g.beginPath(); g.arc(bx, by, 6, 0, 6.3); g.fill(); }
    [["BEDS", "6 / 6"], ["TEAMS", "3 ONLINE"], ["ALERTS", String(1 + Math.floor(t * 0.2) % 3)], ["LATENCY", (18 + Math.floor(Math.sin(t) * 5)) + " ms"]].forEach((r, i) => { const y = Y0 + 20 + i * (H0 / 4); g.fillStyle = "#8bb6c6"; g.font = mono(15); g.fillText(r[0], X0 + W0 * 0.66, y); g.fillStyle = "#e9fbff"; g.font = mono(26); g.fillText(r[1], X0 + W0 * 0.66, y + 30); });
  }
  g.restore();
}
const walls = [];
const WALLK = [2, 0, 3, 1, 4, 5, 2, 3, 0, 4];
for (let k = 0; k < 10; k++) {
  const cvw = document.createElement("canvas"); cvw.width = 768; cvw.height = 450; const gw = cvw.getContext("2d"), tw = new T.CanvasTexture(cvw); tw.colorSpace = T.SRGBColorSpace; tw.anisotropy = 4;
  const a = (k + 0.5) / 10 * TAU, p = mesh(new T.PlaneGeometry(3.7, 2.17), new T.MeshBasicMaterial({ map: tw, transparent: true, toneMapped: false, depthWrite: false, side: T.DoubleSide }), Math.sin(a) * (RH - 0.3), 3.0, Math.cos(a) * (RH - 0.3), hall);
  p.rotation.y = a + Math.PI; p.renderOrder = 2; walls.push({ g: gw, tex: tw, cv: cvw, kind: WALLK[k], mesh: p }); paintWall(WALLK[k], gw, 768, 450, k * 1.7); tw.needsUpdate = true;
}
let wallN = 0;
function updateWalls(t) { for (let j = 0; j < 2; j++) { const w = walls[(wallN + j * 5) % 10]; paintWall(w.kind, w.g, 768, 450, t + w.kind); w.tex.needsUpdate = true; } wallN = (wallN + 1) % 10; }
/* the entrance door in the south wall (you arrive through it) */
{ const d = new T.Group(); d.position.set(0, 0, RH - 0.06); d.rotation.y = Math.PI; hall.add(d);
  mesh(new T.BoxGeometry(2.7, 0.08, 0.1), E(0x36d6ff, 2.2), 0, 2.72, 0, d); [-1.3, 1.3].forEach((x) => mesh(new T.BoxGeometry(0.08, 2.72, 0.1), E(0x36d6ff, 2.2), x, 1.36, 0, d));
  const sg = ctex(512, 96, (g, w, h) => { g.fillStyle = "rgba(5,26,42,.8)"; rr(g, 3, 3, w - 6, h - 6, 16); g.fill(); g.strokeStyle = "#5fe3ff"; g.lineWidth = 4; rr(g, 3, 3, w - 6, h - 6, 16); g.stroke(); g.fillStyle = "#cff6ff"; g.font = "700 40px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("AUDITORIUM", w / 2, h / 2); });
  mesh(new T.PlaneGeometry(1.7, 0.32), new T.MeshBasicMaterial({ map: sg, transparent: true, toneMapped: false }), 0, 3.05, 0.06, d); }

/* beyond the doorway: the real auditorium (a light replica of it), so the door is see-through from both sides */
{ const A = typeof window.ccuAudBeyond === "function" ? window.ccuAudBeyond(T, "E") : null;
  if (A) { A.rotation.y = Math.PI / 2; A.position.set(-ZC, 0, AUD_X); hall.add(A); }
  mesh(new T.PlaneGeometry(3.2, 1.0), new T.MeshBasicMaterial({ color: 0x0a1522 }), 0, 0.004, RH + 0.1, hall).rotation.x = -Math.PI / 2; }

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
if (window.ccuWelcome) window.ccuWelcome("mdt");
const arrive = { t: 0, t0: performance.now(), from: { x: me.x * 1.62, z: me.z * 1.62 }, to: { x: me.x, z: me.z } };
/* coming in from the auditorium on foot: begin exactly where the walk left off, under your own control, no scripted walk */
try { const j = JSON.parse(sessionStorage.getItem("ccu-pose") || "null"); 
  if (j && j.to === "team" && Date.now() - j.t < 90000) { me.x = j.x; me.z = j.z; me.yaw = j.yaw; arrive.t = 2.4; arrive.fromPose = true; } } catch (e) {}
me.x = arrive.from.x; me.z = arrive.from.z;
/* the camera angle: level (0) up to 60 degrees looking down at the desk. The semicircular arrow sets it. */
const VP_MAX = Math.PI / 3; let vp = 0.78, vpCur = 0;
const faceCenter = (x, z) => Math.atan2(-x, z);
me.yaw = faceCenter(me.x, me.z);
function clampPos(x, z) { if (!focus && Math.abs(x) < 1.2 && z > MAXR - 1.5) return [clamp(x, -1.2, 1.2), Math.min(z, RH + 3.2)]; const r = Math.hypot(x, z) || 1e-6; if (!focus && r < MINR) { x *= MINR / r; z *= MINR / r; } else if (r > MAXR) { x *= MAXR / r; z *= MAXR / r; } return [x, z]; }
function walkBy(d) {
  let nx = me.x + Math.sin(me.yaw) * d, nz = me.z - Math.cos(me.yaw) * d;
  if (!focus && d > 0 && nz > 3) { /* walking towards the doorway draws you in line with it and turns you to it, so a finger-drag always finds the way out */
    const vx = -nx, vz = RH + 2 - nz, vl = Math.hypot(vx, vz) || 1, dot = (Math.sin(me.yaw) * vx - Math.cos(me.yaw) * vz) / vl;
    if (dot > 0.5) { const k = Math.min(0.7, d * 2.5); nx -= nx * k; let dy = Math.atan2(vx, -vz) - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * Math.min(0.5, d * 1.5); }
  }
  const c = clampPos(nx, nz); me.x = c[0]; me.z = c[1]; }
let dn = 0, mvd = 0, lx = 0, ly = 0, sx = 0, sy = 0, holdDir = 0, lastV = 0, mode = "", onPatient = false, onDesk = false, tileDown = null, spinV = 0, autoSpin = false, focus = null, retreat = false, lpT = 0, grab = null, gx = 0, held = false, lastMT = 0;
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
  onPatient = dp != null && (dd == null || dp < dd); onDesk = dd != null && (dp == null || dd < dp); tileDown = odesk.pick(ray);
  clearTimeout(lpT);
  if (pa && (dp == null || pa.d < dp) && (dd == null || pa.d < dd)) { onPatient = false; onDesk = false; lpT = setTimeout(() => { if (dn && mvd < 10) { grab = pa.p; grab.grab = 1; gx = 0; held = true; navigator.vibrate && navigator.vibrate(20); sfx.beep && sfx.beep({ f: 660, vol: 0.5 }); $("#hint").style.opacity = 1; $("#hint").textContent = "Swipe left or right to remove this panel"; } }, 480); }
  if (focus) { focus = null; retreat = true; }
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
});
cv.addEventListener("pointermove", (e) => {
  if (!dn) return; const dx = e.clientX - lx, dy = e.clientY - ly, now = performance.now(), dts = Math.max(0.008, (now - lastMT) / 1000); lx = e.clientX; ly = e.clientY; lastMT = now; mvd += Math.abs(dx) + Math.abs(dy);
  if (grab) { gx += dx; grab.dragX = gx * 0.006; if (Math.abs(gx) > 90) { removePanel(grab, Math.sign(gx)); grab.grab = 0; grab.dragX = 0; grab = null; $("#pnl").hidden = !panels.some((q) => !q.pop && (q.hidden || q.rm)); } return; }
  if (mvd > 10 && lpT) { clearTimeout(lpT); lpT = 0; }
  if (!mode && mvd > 8) { const horiz = Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy) * 1.1; mode = tileDown && horiz ? "dock" : onPatient && horiz ? "spin" : onDesk && horiz ? "orbit" : "walk"; }
  if (mode === "docked") return;
  if (mode === "dock") { const tdx = e.clientX - sx; if (Math.abs(tdx) > 52 && tileDown) { openSection(tileDown, 0, tdx < 0 ? "L" : "R"); tileDown = null; mode = "docked"; navigator.vibrate && navigator.vibrate(10); } return; }
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
/* the semicircular arrow: drag the knob round the arc to tilt the camera between level and 60 degrees looking down; the button flips between the two */
const tsvg = $("#tiltsvg"), tknob = $("#tiltknob"), tfill = $("#tiltfill"), tbtn = $("#tiltbtn"), tdeg = $("#tiltdeg");
function paintTilt() {
  const t = vp / VP_MAX, ph = (-90 + t * 180) * Math.PI / 180, x = 10 + 58 * Math.cos(ph), y = 68 - 58 * Math.sin(ph);
  tknob.setAttribute("cx", x.toFixed(1)); tknob.setAttribute("cy", y.toFixed(1)); tfill.setAttribute("d", t < 0.005 ? "M10 126 A58 58 0 0 1 10 126" : "M10 126 A58 58 0 0 1 " + x.toFixed(1) + " " + y.toFixed(1));
  const deg = Math.round(vp * 180 / Math.PI); tdeg.textContent = deg + "°"; tsvg.setAttribute("aria-valuenow", String(deg)); tbtn.dataset.on = vp > 0.17 ? "1" : "0"; tbtn.textContent = vp > 0.17 ? "Level view" : "Top view";
}
function setTilt(v) { vp = clamp(v, 0, VP_MAX); paintTilt(); }
function tiltFrom(e) { const r = tsvg.getBoundingClientRect(), k = r.width / 62, cx = r.left + 10 * k, cy = r.top + 68 * k, a = Math.atan2(-(e.clientY - cy), Math.max(0.0001, e.clientX - cx)); setTilt((a + Math.PI / 2) / Math.PI * VP_MAX); }
let tdrag = false;
tsvg.addEventListener("pointerdown", (e) => { tdrag = true; try { tsvg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } tiltFrom(e); sfx.unlock(); e.preventDefault(); });
tsvg.addEventListener("pointermove", (e) => { if (tdrag) tiltFrom(e); });
const tend = () => { tdrag = false; }; tsvg.addEventListener("pointerup", tend); tsvg.addEventListener("pointercancel", tend);
tbtn.onclick = () => setTilt(vp > 0.17 ? 0 : 0.8);
paintTilt();

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
  const tid = odesk.pick(ray); if (tid) { if (paneOf(tid)) closeSection(paneOf(tid).side); else openSection(tid); return; }
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
const feed = [], hist = [], labSeries = [], seenKeys = new Set(), unseen = { invest: 0, history: 0 };
let feedInit = false, lastLab = "";
const FIND_RE = [[/looked at the heart/i, "img", "Echocardiogram"], [/blood cultures/i, "lab", "Blood cultures"], [/bronchoscopy/i, "find", "Bronchoscopy"], [/examined/i, "find", "Examination"]];
const SECOF = { lab: "invest", img: "invest", find: "history" };
function scanFeed() {
  if (!P) return; const fresh = [];
  (P.results || []).forEach((r) => { const k = "r|" + r.label + "|" + r.text; if (!seenKeys.has(k)) { seenKeys.add(k); fresh.push({ kind: /Labs/i.test(r.label) ? "lab" : "img", label: r.label, text: r.text, key: k }); } });
  (P.log || []).forEach((l) => { const k = "l|" + l.t + "|" + l.text; if (seenKeys.has(k)) return; seenKeys.add(k); const f = FIND_RE.find((x) => x[0].test(l.text || "")); if (f) fresh.push({ kind: f[1], label: f[2], text: l.text, key: k }); });
  fresh.forEach((i) => { i.hour = P.hour; feed.push(i); if (feedInit) { pushPopup(i); const sc = SECOF[i.kind]; if (!paneOf(sc)) unseen[sc]++; } });
  feedInit = true;
  const l = labsOf({ P }); if (l.sent && l.text !== lastLab) { lastLab = l.text; labSeries.push({ hour: P.hour, lactate: l.lactate, cr: l.cr, k: l.k, hb: l.hb }); }
  const h = { hour: P.hour, hr: P.hr, map: P.map, spo2: P.spo2, temp: P.temp }; if (hist.length && hist[hist.length - 1].hour === P.hour) hist[hist.length - 1] = h; else hist.push(h); if (hist.length > 60) hist.shift();
}
function badgeAll() { Object.keys(unseen).forEach((k) => odesk.setBadge(k, unseen[k])); }

/* ================================================================ the eight scientific sections, in two side panels */
/* a touched label opens its panel; swiped left it docks on the left of the screen, swiped right on the right. Both can be open together. */
const sciCtx = () => ({ P, SC, eq, orders: mdt.orders, busy: mdt.busy, room: mdt.room, labSeries, hist, feed });
const viewAz = () => Math.atan2(cam.position.x, cam.position.z);
const panes = { L: { side: "L", el: $("#sciL"), id: "", sub: 0, key: "" }, R: { side: "R", el: $("#sci"), id: "", sub: 0, key: "" } };
const paneList = [panes.L, panes.R];
const openIds = () => paneList.map((q) => q.id).filter(Boolean);
const anyOpen = () => openIds().length > 0;
const paneOf = (id) => paneList.find((q) => q.id === id);
const syncOpen = () => { document.body.classList.toggle("both", !!(panes.L.id && panes.R.id)); odesk.setActive(openIds()); };
function sciHtml(q) {
  const sec = SECTIONS.find((x) => x.id === q.id); if (!sec) return "";
  const g = sec.groups || {};
  return `<header><span class="no">${sec.n}</span><h2>${esc(sec.title)}</h2><button class="scix" type="button" aria-label="Close">✕</button></header><nav class="subs">${sec.subs.map((t, i) => (g[i] ? `<i class="gl">${esc(g[i])}</i>` : "") + `<button type="button" data-i="${i}" data-on="${i === q.sub ? 1 : 0}">${esc(t)}</button>`).join("")}</nav><div class="sbody"><h3>${esc(sec.subs[q.sub])}</h3>${buildSection(q.id, q.sub, sciCtx())}</div>`;
}
function sciPaint(q) {
  const el = q.el; el.querySelectorAll("canvas.ximg").forEach((c) => paintImage(c, c.dataset.k, c.dataset.r)); el.querySelectorAll("canvas.ecg").forEach((c) => paintEcg(c, +c.dataset.hr, c.dataset.r, c.dataset.a === "1")); paintMachines(0);
}
/* the machines on the Treatment page move: repaint them a few times a second while a panel shows one */
let machT = 0;
function paintMachines(now) {
  const cs = []; paneList.forEach((q) => { if (q.id && !q.el.hidden) q.el.querySelectorAll("canvas.mach").forEach((c) => cs.push(c)); });
  cs.forEach((c) => { let st = {}; try { st = JSON.parse(c.dataset.st || "{}"); } catch (e) { /* ignore */ } paintMachine(c, c.dataset.k, st, now / 1000); });
}
function renderSection(q, force) {
  if (!q.id) return; const key = JSON.stringify([q.id, q.sub, P && [Math.round(P.hr), Math.round(P.map), Math.round(P.spo2), P.hour, (P.results || []).length, (P.log || []).length, P.tube, P.norepi, P.oxygen, P.artLine, P.hdLine, P.dialysis], mdt.busy, mdt.orders && JSON.stringify(mdt.orders.groups.map((g) => g.items.map((i) => i.ok ? 1 : 0))), mdt.room && mdt.room.members && mdt.room.members.length]);
  if (!force && key === q.key) return; q.key = key; const el = q.el, sb = el.querySelector(".sbody"), top = sb ? sb.scrollTop : 0, ns = el.querySelector(".subs"), nl = ns ? ns.scrollLeft : 0;
  el.innerHTML = sciHtml(q); const nb = el.querySelector(".sbody"); if (nb && !force) nb.scrollTop = top; const n2 = el.querySelector(".subs"); if (n2 && !force) n2.scrollLeft = nl; sciPaint(q);
  const on = el.querySelector(".subs [data-on='1']"), sn = el.querySelector(".subs"); if (on && sn && force) sn.scrollLeft = on.offsetLeft - (sn.clientWidth - on.offsetWidth) / 2;
}
const renderAll = (force) => paneList.forEach((q) => renderSection(q, force));
function openSection(id, sub, side) {
  if (!SECTIONS.some((x) => x.id === id)) return;
  side = side || (panes.R.id ? (panes.L.id ? "R" : "L") : "R");
  const other = paneOf(id); if (other && other.side !== side) { other.id = ""; other.key = ""; other.el.hidden = true; other.el.classList.remove("in"); }
  const q = panes[side], was = q.id; closeDock(); $("#card").hidden = true; q.id = id; q.sub = sub || 0; unseen[id] = 0; badgeAll(); syncOpen(); odesk.faceTile(id, viewAz()); $("#hint").style.opacity = 0;
  renderSection(q, true); const el = q.el, sc = odesk.screenOf(id, cam); el.style.transformOrigin = sc ? Math.round(clamp(sc.x, 0, 1) * 100) + "% " + Math.round(clamp(sc.y, 0, 1) * 100) + "%" : "50% 100%"; el.hidden = false;
  if (was !== id) { el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); } sfx.unlock(); sfx.beep && sfx.beep({ f: 880, vol: 0.25 });
}
function closeSection(side) {
  paneList.forEach((q) => { if (side && q.side !== side) return; q.id = ""; q.key = ""; q.el.hidden = true; q.el.classList.remove("in"); }); syncOpen();
}
paneList.forEach((q) => q.el.addEventListener("click", (e) => {
  const t = e.target.closest("button,canvas"); if (!t) return;
  if (t.classList.contains("scix")) return closeSection(q.side);
  if (t.dataset.i != null && t.closest(".subs")) { q.sub = +t.dataset.i; renderSection(q, true); return; }
  if (t.dataset.act === "order") { post("hall-order", { kind: t.dataset.kind, specialty: t.dataset.spec || "" }); t.classList.add("sent"); sfx.unlock(); return; }
  if (t.dataset.act === "goto") { q.sub = +t.dataset.sub || 0; q.id = t.dataset.sec; unseen[q.id] = 0; badgeAll(); syncOpen(); odesk.faceTile(q.id, viewAz()); renderSection(q, true); return; }
  if (t.tagName === "CANVAS" && t.classList.contains("ximg")) { const r = t.getBoundingClientRect(), x = (e.clientX - r.left) * t.width / r.width, y = (e.clientY - r.top) * t.height / r.height, hs = hotspotAt(t.dataset.k, x, y, t.width, t.height, t.dataset.r), box = q.el.querySelector(".hot"); if (box) { box.textContent = hs ? hs.n + ". " + hs.text : "Tap on one of the numbered spots."; box.dataset.hit = hs && hs.hit ? "1" : "0"; } }
}));
function tileInfo() {
  if (!P) { SECTIONS.forEach((x) => odesk.setInfo(x.id, "waiting for the case")); return; }
  const l = labsOf({ P }), so = sofaOf({ P, SC, eq, labSeries }), rs = (P.results || []).filter((r) => /Chest|CT/.test(r.label)).length + (P.log || []).filter((x) => /looked at the heart/.test(x.text || "")).length, run = [P.norepi, eq.fluid > 0, eq.abx, eq.blood, P.dialysis].filter(Boolean).length;
  const dxs = SC ? SC.dx : "", ab = eq.abx ? "antibiotic on" : "no antibiotic", cu = (P.log || []).some((x) => /blood cultures/.test(x.text || "")), pr = (P.problems || []).filter((q) => q.open && !q.resolved).length;
  odesk.setInfo("history", (SC ? SC.name.split(" ")[0] + ", " + SC.age : "") + " · hour " + P.hour); odesk.setInfo("diagnosis", dxs ? dxs.slice(0, 30) : "no diagnosis yet"); odesk.setInfo("vitals", "HR " + Math.round(P.hr) + " · MAP " + Math.round(P.map) + " · SpO₂ " + Math.round(P.spo2));
  odesk.setInfo("organ", "GCS " + Math.round(P.gcs) + " · RR " + Math.round(P.rr)); odesk.setInfo("cultures", cu ? "blood cultures sent" : "not sent"); odesk.setInfo("invest", (l.sent ? "Lactate " + l.lactate + " · " : "") + (rs ? rs + " image" + (rs > 1 ? "s" : "") : "no images yet"));
  odesk.setInfo("issues", pr ? pr + " open problem" + (pr > 1 ? "s" : "") : "none open"); odesk.setInfo("treat", run + " running · " + ab + (so.tot ? "" : ""));
}

/* ================================================================ the state from the Team room */
const equipFrom = (p) => { const L = (p.log || []).map((x) => x.text || ""), cnt = (re) => L.filter((t) => re.test(t)).length; return { tube: !!p.tube, oxygen: !!p.oxygen, spo2: Math.round(p.spo2), rr: p.rr, norepi: !!p.norepi, fluid: cnt(/fluid bolus/), abx: cnt(/started antibiotics/) > 0, blood: cnt(/transfused blood/) > 0, dialysis: !!p.dialysis, saline: cnt(/3% saline/) > 0, mannitol: cnt(/mannitol/) > 0 }; };
function apply(d) {
  mdt = { room: d.room || null, orders: d.orders || null, busy: !!d.busy, err: d.err || "", line: !!d.line };
  if (d.me) { if (d.me.name) myName = d.me.name; }
  const room = mdt.room; P = room && room.patient || null; SC = room && room.scenario || null;
  const spec = room && room.you && room.you.specialty; if (spec && spec !== mySpec) mySpec = spec;
  if (room && room.code) startNet();
  if (P) { eq = equipFrom(P); refreshTubes(true); scanFeed(); tileInfo(); badgeAll(); renderAll(false); } else if (anyOpen()) closeSection();
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
let leavingTo = false;
/* walking out through the doorway: keep this frame and the exact place we stand, and the auditorium picks up from there, no fade */
function goAuditorium() {
  leavingTo = true;
  try {
    R.render(S, cam);
    const c = R.domElement, w = Math.min(960, c.width), h = Math.round(w * c.height / c.width), t = document.createElement("canvas"); t.width = w; t.height = h; t.getContext("2d").drawImage(c, 0, 0, w, h);
    sessionStorage.setItem("ccu-snap", t.toDataURL("image/jpeg", 0.62)); sessionStorage.setItem("ccu-snap-t", String(Date.now()));
    sessionStorage.setItem("ccu-pose", JSON.stringify({ to: "aud", x: AUD_X - me.z, z: ZC + me.x, yaw: me.yaw + Math.PI / 2, t: Date.now() }));
  } catch (e) {}
  if (net) { net.close(); net = null; }
  if (parent !== window) post("hall-aud"); else location.href = "living-command.html?start=aud&from=team&v=20261121d";
}
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
let stride = 0, lastStep = 0, px0 = me.x, pz0 = me.z;
let vsh = 0, last = 0, sendT = 0, mvSpeed = 0, px = me.x, pz = me.z, bobT = 0, t0 = performance.now(), shown = false, panelT = 0;
const camTarget = new V(), organPos = new V();
function loop(now) {
  requestAnimationFrame(loop);
  if (now - last < 1000 / 45) return; const dt = Math.min((now - last) / 1000, 0.1); last = now; const t = (now - t0) / 1000;
  /* arrival: walk in through the door while the opening screen fades */
  if (arrive.t < 2.4 && shown) { arrive.t = (performance.now() - arrive.t0) / 1000; const k = clamp(arrive.t / 2.4, 0, 1), e = k * k * (3 - 2 * k); me.x = arrive.from.x + (arrive.to.x - arrive.from.x) * e; me.z = arrive.from.z + (arrive.to.z - arrive.from.z) * e; me.yaw = faceCenter(me.x, me.z); }
  if (dn && holdDir && mvd > 10 && performance.now() - lastV > 120 && mode !== "spin") walkBy(holdDir * dt * 1.7);
  if (me.z > RH + 0.9 && shown && arrive.t >= 2.4 && !leavingTo) goAuditorium();
  /* glide to the bedside, or to an organ, or back out when released */
  let eyeH = 1.6, pit = 0;
  if (focus) { const k = 1 - Math.exp(-dt * 3.2); me.x += (focus.x - me.x) * k; me.z += (focus.z - me.z) * k; const ty = Math.atan2(focus.c.x - me.x, -(focus.c.z - me.z)); let dy = ty - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * k; me.h += (focus.h - me.h) * k; me.pit += (0 - me.pit) * k; }
  else { vpCur += (vp - vpCur) * Math.min(1, dt * 4); const rr0 = Math.hypot(me.x, me.z) || 1, fade = arrive.t < 2.4 ? 0 : clamp((10.0 - rr0) / 2.2, 0, 1), eyeG = Math.max(1.6, Math.min(5.4, 1 + rr0 * Math.tan(vpCur))), eyeT = 1.6 + (eyeG - 1.6) * fade, pitT = vpCur * fade > 0.02 ? -Math.atan((eyeG - 1) / rr0) * fade : 0; me.h += (eyeT - me.h) * Math.min(1, dt * 3); me.pit += (pitT - me.pit) * Math.min(1, dt * 3); if (goal) { const k = 1 - Math.exp(-dt * 2.6); me.x += (goal.x - me.x) * k; me.z += (goal.z - me.z) * k; let dy = faceCenter(me.x, me.z) - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * k; if (Math.hypot(goal.x - me.x, goal.z - me.z) < 0.03) goal = null; } if (retreat) { const r = Math.hypot(me.x, me.z); if (r < MINR - 0.01) { const k = Math.min(1, dt * 2.4), nr = r + (MINR - r) * k; me.x *= nr / (r || 1); me.z *= nr / (r || 1); } else retreat = false; } }
  eyeH = me.h; pit = me.pit;
  const sp = Math.hypot(me.x - px, me.z - pz) / Math.max(dt, 0.001); mvSpeed += (sp - mvSpeed) * Math.min(1, dt * 8); px = me.x; pz = me.z;
  if (mvSpeed > 0.2 && mode !== "spin" && mode !== "orbit" && mode !== "dock" && !focus && arrive.t >= 2.4) { stride += Math.hypot(me.x - px0, me.z - pz0); if (stride > 0.4 && now - lastStep > 230) { stride = 0; lastStep = now; sfx.step(Math.min(1, 0.7 + mvSpeed * 0.2)); } } else stride = Math.min(stride, 0.2);
  px0 = me.x; pz0 = me.z;
  bobT += mvSpeed * dt * 2.2; const bob = focus ? 0 : Math.sin(bobT * 3.0) * 0.016 * Math.min(1, mvSpeed);
  { const w = innerWidth, h = innerHeight, pt = cam.aspect < 0.8; const sd = (panes.R.id ? 1 : 0) - (panes.L.id ? 1 : 0); vsh += ((anyOpen() ? 1 : 0) - vsh) * Math.min(1, dt * 5); if (vsh > 0.004) cam.setViewOffset(w, h, pt ? 0 : w * 0.2 * vsh * sd, pt ? h * 0.2 * vsh : 0, w, h); else if (cam.view) cam.clearViewOffset(); }
  cam.position.set(me.x, eyeH + bob, me.z); cam.rotation.order = "YXZ"; cam.rotation.set(focus ? Math.atan2(focus.c.y - eyeH, Math.hypot(focus.c.x - me.x, focus.c.z - me.z)) * 0.8 : pit, -me.yaw, 0);
  if (!focus && eyeH > 1.7) cam.position.y = eyeH + bob * 0.3;
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
  wallLive.hr = disp.hr; wallLive.map = disp.map; wallLive.spo2 = disp.spo2; wallLive.rr = disp.rr; wallLive.temp = disp.temp; wallLive.lactate = disp.lactate; wallLive.k = disp.k; wallLive.cr = disp.cr; if (!document.hidden) updateWalls(t);
  if ((machT += dt) > 0.07) { machT = 0; paintMachines(now); }
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
