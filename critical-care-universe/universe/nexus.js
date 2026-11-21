/* THE MDT HALL: the Blind MDT Clinical Challenge chamber.
   One big circular scientific hall. In the middle a revolving table: an inner disc on which the patient lies (drag the patient sideways to revolve him),
   and an outer ring where each doctor of the team has a sloped digital screen and a placard that names the role seated there. Three curved displays
   on the far wall show the open seats, the presentation (age, sex, complaints, vitals, examination: no diagnosis) and the team's discussion.
   The patient's state is owned by the Team room (one authoritative source); this page draws it, shows only what a blind case may show, and sends orders back.
   Movement is the ICU's finger drag: swipe up to walk, drag sideways to look. Tap your own screen to work at it. */
import * as T from "./three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { createDevices } from "./icu-devices.js?v=20261122c";
import { loadDoctorBody, createDoctor, specInfo, nameTag, SPEC } from "./doctor-avatar.js?v=20261122c";
import { loadLook, sanitize as cleanLook } from "./doctor-look.js?v=20261122c";
import { createHallNet, localSignal, ntfySignal } from "./hall-net.js?v=20261122c";
import { createSfx } from "./sfx.js?v=20261122c";
import { CSS3DRenderer, CSS3DObject } from "./vendor/CSS3DRenderer.js?v=20261122c";
import { buildChamber, CH } from "./mdt-chamber.js?v=20261122c";
import { paintAvail, paintPresent, paintDiscuss, paintConsole, paintPlacard, TAB_LABEL, TAB_ORDER, patientNo } from "./mdt-screens.js?v=20261122c";
import { paintMachine } from "./nexus-machines.js?v=20261122c";
import { createOrders, createHud } from "./nexus-orders.js?v=20261122c";
import { SECTIONS, buildSection, paintImage, paintEcg, hotspotAt, labsOf, sofaOf } from "./nexus-sections.js?v=20261122c";

const $ = (s) => document.querySelector(s);
const Q = new URLSearchParams(location.search), DEMO = Q.has("demo");
const myId = Q.get("id") || ("u" + Math.random().toString(36).slice(2, 8));
let myName = (Q.get("name") || "Doctor").slice(0, 40), mySpec = Q.get("spec") || "intensivist";
const myLook = loadLook();                       // the avatar this doctor made in the creator (null = not made yet)
const V = T.Vector3, TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hashN = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let demoHook = null;
const post = (type, o) => { if (parent !== window) parent.postMessage(Object.assign({ type }, o || {}), "*"); else if (DEMO) { (window.__posts = window.__posts || []).push(Object.assign({ type }, o || {})); if (demoHook) demoHook(type, o || {}); } };

/* ================================================================ renderer, camera */
const cv = $("#gl");
let R;
try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" }); }
catch (e) { $("#vmsg").textContent = "This device could not start 3D graphics."; throw e; }
const coarse = typeof matchMedia === "function" && matchMedia("(pointer:coarse)").matches;
R.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.75 : 2)); R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.02;
const S = new T.Scene(); S.background = new T.Color(0x040a12);
const cam = new T.PerspectiveCamera(64, 1, 0.05, 60);
/* the docked section panels are real LCD screens standing in the hall beside the patient: the page elements are pinned into the 3D scene */
const lcdScene = new T.Scene(), css3 = new CSS3DRenderer(), lcdEl = css3.domElement; lcdEl.id = "lcd"; document.body.appendChild(lcdEl);
let fitW = 0, fitH = 0, fitQ = 0;
const fit = () => { const w = innerWidth, h = innerHeight; if (w === fitW && h === fitH) return; fitW = w; fitH = h; R.setSize(w, h, false); css3.setSize(w, h); cam.aspect = w / Math.max(1, h); cam.fov = cam.aspect < 0.8 ? 72 : 62; cam.updateProjectionMatrix(); };
addEventListener("resize", () => { cancelAnimationFrame(fitQ); fitQ = requestAnimationFrame(fit); }); fit();

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

/* ================================================================ the hall: the MDT chamber (mdt-chamber.js holds the geometry) */
const DOORGAP = 0.16, ZC = -17, AUD_X = -8.6 + 0.7 + 11 - 0.06;   /* the doorway in the south wall, and where the auditorium lies behind it (auditorium z of the hall's centre, auditorium x of the hall's centre) */
const RH = CH.RH, WH = CH.WH, MINR = 3.3, MAXR = RH - 0.8, BODY_S = 1.2;
const hall = new T.Group(); S.add(hall);
const chamber = buildChamber(T, { S, hall, env, H: { M, E, ctex, mesh, cyl, tor }, DOORGAP, TAU });
const turn = chamber.turn;

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
function updateWalls(t) { for (let j = 0; j < 2; j++) { const w = walls[(wallN + j * 5) % 10]; if (!w.mesh.visible) continue; paintWall(w.kind, w.g, 768, 450, t + w.kind); w.tex.needsUpdate = true; } wallN = (wallN + 1) % 10; }
[3, 4, 5, 6].forEach((k) => { walls[k].mesh.visible = false; });     /* behind the three big displays */
/* the entrance door in the south wall (you arrive through it) */
{ const d = new T.Group(); d.position.set(0, 0, RH - 0.06); d.rotation.y = Math.PI; hall.add(d);
  mesh(new T.BoxGeometry(2.7, 0.08, 0.1), E(0x36d6ff, 2.2), 0, 2.72, 0, d); [-1.3, 1.3].forEach((x) => mesh(new T.BoxGeometry(0.08, 2.72, 0.1), E(0x36d6ff, 2.2), x, 1.36, 0, d));
  const sg = ctex(512, 96, (g, w, h) => { g.fillStyle = "rgba(5,26,42,.8)"; rr(g, 3, 3, w - 6, h - 6, 16); g.fill(); g.strokeStyle = "#5fe3ff"; g.lineWidth = 4; rr(g, 3, 3, w - 6, h - 6, 16); g.stroke(); g.fillStyle = "#cff6ff"; g.font = "700 40px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("AUDITORIUM", w / 2, h / 2); });
  mesh(new T.PlaneGeometry(1.7, 0.32), new T.MeshBasicMaterial({ map: sg, transparent: true, toneMapped: false }), 0, 3.05, 0.06, d); }

/* beyond the doorway: the real auditorium (a light replica of it), so the door is see-through from both sides */
{ const A = typeof window.ccuAudBeyond === "function" ? window.ccuAudBeyond(T, "E") : null;
  if (A) { A.rotation.y = Math.PI / 2; A.position.set(-ZC, 0, AUD_X); hall.add(A); }
  mesh(new T.PlaneGeometry(3.2, 1.0), new T.MeshBasicMaterial({ color: 0x0a1522 }), 0, 0.004, RH + 0.1, hall).rotation.x = -Math.PI / 2; }

/* ================================================================ the table: the disc that revolves, with the patient lying on it */
const TOP = chamber.tableY + 0.05;
const haloM = new T.MeshBasicMaterial({ color: 0x36d6ff, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
const halo = tor(CH.R_DISC + 0.1, 0.05, haloM, TOP + 0.01, hall);

/* ================================================================ the patient: the Critical Care Hub's own 3D human */
const patient = new T.Group(); turn.add(patient);
patient.rotation.x = -Math.PI / 2; patient.position.set(0, 0.17, 0.875 * BODY_S);       /* he lies on his back on the disc, head to the far wall */
mesh(new T.BoxGeometry(1.02, 0.05, 2.4), new T.MeshStandardMaterial({ color: 0x1b6f8f, emissive: 0x0a4a66, transparent: true, opacity: 0.6, roughness: 0.15, metalness: 0.2, envMap: env }), 0, 0.03, 0, turn);
const hitCyl = mesh(new T.BoxGeometry(1.0, 0.7, 2.4), new T.MeshBasicMaterial({ visible: false }), 0, 0.35, 0, turn);
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
{ const put = (g, x, z) => { g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); S.add(g); }; put(dev.vent, -3.7, -3.0); put(dev.pole, 3.7, -2.8); dev.vent.scale.setScalar(1.15); dev.pole.scale.setScalar(1.15); }     /* standing either side of his head */
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
/* ================================================================ the patient's state, and what the screens show of it */
const statusOf = (p) => !p ? 0 : p.alive === false ? 2 : (p.map < 60 || p.spo2 < 88 || p.gcs <= 8) ? 2 : (p.map < 70 || p.spo2 < 93 || p.hr > 120 || p.lactate > 4) ? 1 : 0;
let mdt = { room: null, orders: null, busy: false, err: "", line: false }, P = null, SC = null;
const disp = { hr: 80, sbp: 120, dbp: 75, map: 90, spo2: 98, rr: 16, gcs: 15, temp: 37, k: 4, lactate: 1.5, cr: 1 };
/* a blind case: the diagnosis, and the names of the problems (which give it away), stay hidden until the case ends */
const blindNow = () => !(P && P.outcome);
const maskSC = (s) => (s && blindNow() ? Object.assign({}, s, { dx: "Undiagnosed" }) : s);
const maskP = (p) => (p && blindNow() ? Object.assign({}, p, { problems: (p.problems || []).map((q, i) => Object.assign({}, q, { title: "Unresolved problem " + (i + 1) })) }) : p);
const chat = [], feed = [], hist = [], labSeries = [], seenKeys = new Set(), unseen = { invest: 0, history: 0 };
const dview = () => ({ P, SC: maskSC(SC), blind: blindNow(), disp, feed, unseen, chat, hist, eq });
const SPECS = Object.keys(SPEC), hexs = (n) => "#" + n.toString(16).padStart(6, "0");
const DEFTAB = { intensivist: "vitals", pulmonologist: "organ", cardiologist: "vitals", nephrologist: "organ", infectious: "cultures", gastroenterologist: "organ", surgeon: "issues", neurologist: "organ" };

/* the three big curved displays on the far wall */
const hero = chamber.hero, heroFn = { L: paintAvail, C: paintPresent, R: paintDiscuss }, heroEvery = { L: 0.7, C: 0.25, R: 0.7 };
function paintHeroes(dt, t, force) { const d = dview(); Object.keys(hero).forEach((k) => { const h = hero[k]; h.t += dt; if (!force && h.t < heroEvery[k]) return; h.t = 0; heroFn[k](h.g, h.w, h.h, d, t); h.tex.needsUpdate = true; }); }
let noteT = 0;
function notify(it) { sfx.chime(it.kind); const lab = it.kind === "lab" ? "New laboratory result" : it.kind === "img" ? "New imaging" : "New finding"; $("#note").textContent = lab + ": " + it.label; $("#note").hidden = false; clearTimeout(noteT); noteT = setTimeout(() => { $("#note").hidden = true; }, 5000); }

/* the doctors' stations: one chair, one sloped screen and one name placard for every seat in the team (the roles chosen decide them) */
const remoteOfUid = (uid) => { let f = null; remotes.forEach((r) => { if (uid && r.info && r.info.id === uid) f = r; }); return f; };
function rosterList() {
  const room = mdt.room, here = new Set([myId]); remotes.forEach((r) => r.info && here.add(r.info.id));
  const mem = (room && room.members) || [], list = [];
  SPECS.forEach((s) => {
    const mine = mem.filter((m) => m.specialty === s), n = Math.max((room && room.slots && room.slots[s]) || 0, mine.length);
    for (let i = 0; i < n; i++) { const m = mine[i]; list.push({ spec: s, label: SPEC[s][0], accent: hexs(SPEC[s][1]), uid: m ? m.userId : "", name: m ? m.name : "", you: !!m && m.userId === myId, state: !m ? "open" : here.has(m.userId) && !m.away ? "on" : "away" }); }
  });
  if (!list.length) { const sp = specInfo(mySpec); list.push({ spec: mySpec, label: sp[0], accent: hexs(sp[1]), uid: myId, name: myName, you: true, state: "on" }); for (let i = 0; i < 2; i++) list.push({ spec: "", label: "Open seat", accent: "#5fe3ff", uid: "", name: "", you: false, state: "open" }); }
  const cut = list.slice(0, 5), ix = cut.findIndex((x) => x.spec === "intensivist");     /* the intensivist sits in the middle, the others on either side */
  if (ix < 0 || cut.length < 3) return cut;
  const mid = Math.floor(cut.length / 2), first = cut.splice(ix, 1)[0]; cut.splice(mid, 0, first); return cut;
}
let stKey = "", myIdx = 0;
const myStation = () => chamber.stations[myIdx] || chamber.stations[0];
function paintPlace(j) { const st = chamber.stations[j]; paintPlacard(st.placard.g, 512, 148, st.item, st.item.state === "on"); st.placard.tex.needsUpdate = true; }
function rebuildStations(force) {
  const list = rosterList(), portrait = cam.aspect < 0.8, key = JSON.stringify(list.map((x) => [x.spec, x.uid, x.name, x.state])) + portrait;
  if (!force && key === stKey) return; stKey = key; chamber.layout(list, portrait);
  let i = list.findIndex((x) => x.uid === myId); if (i < 0) i = list.findIndex((x) => x.spec === mySpec && !x.uid); if (i < 0) i = 0; myIdx = i;
  list.forEach((_, j) => paintPlace(j));
  const st = chamber.stations[myIdx]; if (st) { if (arrive.t < 2.4) { arrive.to = { x: st.x, z: st.z }; arrive.from = { x: st.x * 1.62, z: st.z * 1.62 }; } else if (me.seated && !scr.on) goal = { x: st.x, z: st.z }; }
  screenSize(); scr.key = ""; consT = 9;
}
let consT = 0;
function paintConsoles(dt, t) {
  consT += dt; if (consT < 0.5) return; consT = 0; const d = dview(), D = chamber.dims;
  chamber.stations.forEach((st, j) => { const r = remoteOfUid(st.item.uid), tab = j === myIdx ? scr.id : (r && r.tab) || DEFTAB[st.item.spec] || "history"; paintConsole(st.screen.g, D.PXW, D.PXH, d, { item: st.item, tab, me: j === myIdx }, t); st.screen.tex.needsUpdate = true; });
}

/* ================================================================ controls: the ICU's finger drag, plus turning the patient */
const me = { x: 0, z: CH.R_SEAT, yaw: 0, h: 1.48, pit: 0, seated: true };
{ me.x = 0; me.z = CH.R_SEAT; }
if (window.ccuWelcome) window.ccuWelcome("mdt");
const arrive = { t: 0, t0: performance.now(), from: { x: me.x * 1.62, z: me.z * 1.62 }, to: { x: me.x, z: me.z } };
/* coming in from the auditorium on foot: begin exactly where the walk left off, under your own control, no scripted walk */
try { const j = JSON.parse(sessionStorage.getItem("ccu-pose") || "null"); 
  if (j && j.to === "team" && Date.now() - j.t < 90000) { me.x = j.x; me.z = j.z; me.yaw = j.yaw; me.seated = false; arrive.t = 2.4; arrive.fromPose = true; } } catch (e) {}
me.x = arrive.from.x; me.z = arrive.from.z;
/* the camera looks slightly down at the desk, at a fixed angle */
const vp = 0.34; let vpCur = 0;
const faceCenter = (x, z) => Math.atan2(-x, z);
me.yaw = faceCenter(me.x, me.z);
function clampPos(x, z) { if (!focus && Math.abs(x) < 1.2 && z > MAXR - 1.5) return [clamp(x, -1.2, 1.2), Math.min(z, RH + 3.2)]; const r = Math.hypot(x, z) || 1e-6; if (!focus && r < MINR) { x *= MINR / r; z *= MINR / r; } else if (r > MAXR) { x *= MAXR / r; z *= MAXR / r; } return [x, z]; }
function walkBy(d) {
  me.seated = false; goal = null; let nx = me.x + Math.sin(me.yaw) * d, nz = me.z - Math.cos(me.yaw) * d;
  if (!focus && d > 0 && nz > 3) { /* walking towards the doorway draws you in line with it and turns you to it, so a finger-drag always finds the way out */
    const vx = -nx, vz = RH + 2 - nz, vl = Math.hypot(vx, vz) || 1, dot = (Math.sin(me.yaw) * vx - Math.cos(me.yaw) * vz) / vl;
    if (dot > 0.5) { const k = Math.min(0.7, d * 2.5); nx -= nx * k; let dy = Math.atan2(vx, -vz) - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * Math.min(0.5, d * 1.5); }
  }
  const c = clampPos(nx, nz); me.x = c[0]; me.z = c[1]; }
let dn = 0, mvd = 0, lx = 0, ly = 0, sx = 0, sy = 0, holdDir = 0, lastV = 0, mode = "", onPatient = false, spinV = 0, autoSpin = false, focus = null, retreat = false, lastMT = 0;
const ray = new T.Raycaster(), ndc = new T.Vector2();
const sfx = createSfx();
const hud = createHud({ sfx, esc, open: (id) => { try { enterScreen(id, 0); } catch (e) {} } });
const voice = createOrders({ post, sfx, esc, ctx: () => ({ P, hist, story: SC ? { title: SC.age + "-year-old " + (SC.sex === "woman" ? "woman" : "man"), text: SC.story || "" } : null }), open: (id) => { try { enterScreen(id, 0); } catch (e) {} } });
const setRay = (cx, cy) => { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); };
function pointHitsPatient(cx, cy) { setRay(cx, cy); const h = ray.intersectObject(hitCyl, false)[0]; return h ? h.distance : null; }
cv.addEventListener("pointerdown", (e) => {
  dn = 1; mvd = 0; lx = sx = e.clientX; ly = sy = e.clientY; holdDir = 0; mode = ""; spinV = 0; lastMT = performance.now(); sfx.unlock(); viewPose = null;
  if (scr.on) return;
  onPatient = pointHitsPatient(e.clientX, e.clientY) != null;
  if (focus) { focus = null; retreat = true; }
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
});
cv.addEventListener("pointermove", (e) => {
  if (!dn || scr.on) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; mvd += Math.abs(dx) + Math.abs(dy);
  if (!mode && mvd > 8) { const horiz = Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy) * 1.1; mode = onPatient && horiz ? "spin" : "walk"; }
  if (mode === "spin") { turn.rotation.y += dx * 0.011; spinV = dx * 0.011 * 40; autoSpin && setAuto(false); return; }
  me.yaw -= dx * 0.006;
  if (Math.abs(dy) >= Math.abs(dx) * 0.5) { walkBy(-dy * 0.014); if (Math.abs(dy) >= 1) { holdDir = dy < 0 ? 1 : -1; lastV = performance.now(); } }
});
const stopHold = () => { dn = 0; holdDir = 0; };
cv.addEventListener("pointercancel", stopHold); cv.addEventListener("lostpointercapture", () => { holdDir = 0; }); addEventListener("blur", stopHold);
cv.addEventListener("pointerup", (e) => { const was = mvd; stopHold(); if (was > 8 || scr.on) return; tapAt(e.clientX, e.clientY); });
function setAuto(on) { autoSpin = on; $("#spin").dataset.on = on ? "1" : "0"; }
$("#spin").onclick = () => setAuto(!autoSpin);
$("#xray").onclick = () => { insideWant = !insideWant; $("#xray").dataset.on = insideWant ? "1" : "0"; };

/* ================================================================ the other doctors */
const remotes = new Map(); let peerList = [], net = null, netKey = "";
function remoteFor(p) {
  let r = remotes.get(p.sid); if (r) return r;
  r = { sid: p.sid, doc: null, x: 0, z: 9.6, yaw: Math.PI, tx: 0, tz: 9.6, ty: Math.PI, last: performance.now(), info: p, near: false, seen: false, tab: "" }; remotes.set(p.sid, r);
  const look = p.look ? cleanLook(p.look, p.sex) : null, sex = look ? look.sex : p.sex === "f" ? "f" : "m";
  loadDoctorBody(sex).then((gltf) => { if (!remotes.has(p.sid)) return; r.doc = createDoctor(T, gltf, { name: r.info.name, spec: r.info.spec, sex, look }); r.doc.group.visible = r.seen; r.doc.group.userData.sid = p.sid; S.add(r.doc.group); }).catch((e) => console.warn("doctor body not loaded", e));
  return r;
}
function startNet() {
  const code = mdt.room && mdt.room.code; if (!code) return; const key = code + "|" + mySpec; if (key === netKey) return;
  if (net) net.close(); netKey = key; peerList = []; remotes.forEach((r) => { if (r.doc) S.remove(r.doc.group); }); remotes.clear();
  net = createHallNet({
    code, id: myId, name: myName, spec: mySpec, sex: myLook ? myLook.sex : Q.get("sex") || "m", look: myLook, signal: Q.get("net") === "local" ? localSignal : ntfySignal, iceServers: Q.get("ice") === "none" ? [] : undefined,
    onChat: (p, m) => { chat.push({ k: m.k, text: m.text, n: m.n, time: m.time, name: p.name || "Doctor", spec: specInfo(p.spec)[0], uid: p.id }); if (chat.length > 60) chat.shift(); sfx.chime && sfx.chime("find"); paintHeroes(0, 0, true); scr.key = ""; renderScreen(true); },
    onPeers: (list) => { peerList = list; list.forEach((p) => { const r = remoteFor(p); r.info = p; }); chips(); },
    onPeerState: (p, st) => { const r = remoteFor(p); r.tx = st.x; r.tz = st.z; r.ty = st.y; r.near = st.bed >= 0; r.tab = typeof st.tb === "string" ? st.tb.slice(0, 16) : ""; r.last = performance.now(); if (!r.seen) { r.seen = true; r.x = st.x; r.z = st.z; r.yaw = st.y; if (r.doc) r.doc.group.visible = true; } },
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
  const sp = ray.intersectObjects(chamber.stations.map((s) => s.screen.plane), false)[0];
  if (sp) { const j = sp.object.userData.station, it = chamber.stations[j].item; if (j === myIdx) enterScreen(); else { const r = remoteOfUid(it.uid); card(`<b>${esc(it.label)}</b><span>${it.state === "open" ? "An open seat." : esc(it.name) + (r && r.tab ? " is on the " + esc(TAB_LABEL[r.tab] || "case") + " tab." : " is at this station.")}</span>`); } return; }
  const hh = ray.intersectObjects(Object.values(hero).map((h) => h.mesh), false)[0];
  if (hh) { zoomHero(Object.values(hero).find((h) => h.mesh === hh.object)); return; }
  const docs = []; remotes.forEach((r) => { if (r.doc && r.doc.group.visible) docs.push(r.doc.group); });
  const hd = ray.intersectObjects(docs, true)[0];
  if (hd) { let o = hd.object; while (o && !o.userData.sid) o = o.parent; const r = o && remotes.get(o.userData.sid); if (r) { card(`<b>Dr ${esc(r.info.name)}</b><span>${esc(specInfo(r.info.spec)[0])}${r.near ? " · at the table" : " · in the hall"}</span>`); return; } }
  const hv = ray.intersectObjects([dev.vent, dev.pole], true)[0];
  if (hv) { const isV = (() => { let o = hv.object; while (o) { if (o === dev.vent) return true; o = o.parent; } return false; })(); if (isV) card(`<b>Ventilator</b><span>${eq.tube ? "Connected through the endotracheal tube." : eq.oxygen ? "Standby. The patient is on oxygen." : "Standby. Intubate to connect it."}</span><div class="row"><button id="go1">Lung orders</button></div>`); else card(`<b>IV pole and pumps</b><span>${eq.norepi || eq.fluid || eq.abx || eq.blood ? "Running: " + [eq.norepi && "noradrenaline", eq.fluid && "fluid", eq.abx && "antibiotic", eq.blood && "blood"].filter(Boolean).join(", ") + "." : "Nothing is running yet."}</span><div class="row"><button id="go1">General orders</button></div>`); const b = $("#go1"); if (b) b.onclick = () => openOrders(isV ? "Lung" : "Orders"); return; }
  const ho = ray.intersectObjects(organMeshes, false)[0];
  if (ho) { focusOrgan(ho.object.userData.organ); return; }
  if (ray.intersectObject(hitCyl, false)[0]) card(`<b>${SC ? "Patient " + patientNo(SC) + ", " + SC.age : "The patient"}</b><span>${SC ? (blindNow() ? "Undiagnosed. Ask, examine and investigate." : esc(SC.dx)) : "Waiting for the case."}</span><span>Tap an organ to go in close. Drag sideways on the patient to revolve the disc.</span>`);
}
function focusOrgan(name) {
  const o = organs[name], info = ORG[name]; if (!o || !info) return; sel = name;
  const c = new T.Box3().setFromObject(o.mesh).getCenter(new V()), d = FOCUS_D[name] || 1.3; let dx = cam.position.x - c.x, dz = cam.position.z - c.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  focus = { x: c.x + dx * d * 1.25, z: c.z + dz * d * 1.25, h: Math.max(c.y + 0.1, 1.95), name, c }; retreat = false; if (scr.on) { exitScreen(); goal = null; me.seated = false; }
  const line = P ? info[2](P) : ""; card(`<b>${info[0]}</b>${line ? `<span>${esc(line)}</span>` : ""}<div class="row"><button id="go1">${info[1]} orders</button><button id="go2">Back to the hall</button></div>`, 20000);
  $("#go1").onclick = () => openOrders(info[1]); $("#go2").onclick = () => { focus = null; retreat = true; $("#card").hidden = true; sel = ""; };
}
$("#bed").onclick = () => { if (scr.on) exitScreen(); focus = null; retreat = false; viewPose = null; const st = myStation(); if (st) { goal = { x: st.x, z: st.z }; me.seated = true; } };
let goal = null;

/* ================================================================ the shift desk: open, join, choose a seat, begin */
let desk = { name: "", slots: { intensivist: 1 }, code: "" }, deskKey = "";
function renderDesk() {
  const el = $("#desk"), room = mdt.room, err = mdt.err ? `<p class="err">${esc(mdt.err)}</p>` : "";
  let key = JSON.stringify([!!room, room && room.status, room && room.members, room && room.slots, room && P && P.outcome, desk.slots, mdt.busy, mdt.err, room && room.you]);
  if (key === deskKey) return; deskKey = key;
  if (!room) {
    el.hidden = false; const tot = Object.values(desk.slots).reduce((a, b) => a + b, 0);
    el.innerHTML = `<h2>Multidisciplinary team</h2><h1>Open a shift</h1><p>Up to five doctors share one patient. Set the seats, then open the shift. Others join with the code.</p><input id="dn" maxlength="48" value="${esc(desk.name || myName)}" placeholder="Your name"><div class="seats">${SPECS.map((s) => `<div class="g seat" style="border-radius:10px"><span>${esc(SPEC[s][0])}</span><span class="step"><button data-s="${s}" data-a="-1" type="button">−</button><b>${desk.slots[s] || 0}</b><button data-s="${s}" data-a="1" type="button">+</button></span></div>`).join("")}</div><button class="go" id="mk" type="button" ${mdt.busy || tot < 1 ? "disabled" : ""}>Create the shift</button><input id="jc" maxlength="6" placeholder="Or join with a code" value="${esc(desk.code)}"><button class="go" id="jn" type="button" ${mdt.busy ? "disabled" : ""}>Join</button><a class="go" id="av" href="avatar-creator.html" style="display:block;text-align:center;text-decoration:none;margin-top:8px">${myLook ? "Edit my doctor" : "Create my doctor"}</a>${err}`;
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
let feedInit = false, lastLab = "";
const FIND_RE = [[/looked at the heart/i, "img", "Echocardiogram"], [/blood cultures/i, "lab", "Blood cultures"], [/bronchoscopy/i, "find", "Bronchoscopy"], [/examined/i, "find", "Examination"]];
const SECOF = { lab: "invest", img: "invest", find: "history" };
function scanFeed() {
  if (!P) return; const fresh = [];
  (P.results || []).forEach((r) => { const k = "r|" + r.id + "|" + r.readyAtMs; if (!seenKeys.has(k)) { seenKeys.add(k); fresh.push({ kind: r.cat === "lab" ? "lab" : r.cat === "exam" ? "find" : "img", label: r.label, text: r.text, key: k }); } });
  fresh.forEach((i) => { i.hour = P.hour; feed.push(i); if (feedInit) { const sc = SECOF[i.kind]; if (!(scr.on && scr.id === sc)) unseen[sc]++; } });
  hud.onPatient(P);
  feedInit = true;
  const l = labsOf({ P }); if (l.sent && l.text !== lastLab) { lastLab = l.text; labSeries.push({ hour: P.hour, lactate: l.lactate, cr: l.cr, k: l.k, hb: l.hb }); }
  const h = { hour: P.hour, hr: P.hr, map: P.map, spo2: P.spo2, temp: P.temp }; if (hist.length && hist[hist.length - 1].hour === P.hour) hist[hist.length - 1] = h; else hist.push(h); if (hist.length > 60) hist.shift();
}

/* ================================================================ my screen: the working screen on my own station */
/* tap it (or "My screen") and the camera comes down to it; it is a real page in the hall, pinned onto the sloped screen. Its tabs hold everything:
   the eight scientific sections, the Orders for my role, and the Team (ask, propose, challenge, agree, finalise). */
const sciSC = () => (SC && blindNow() ? Object.assign({}, maskSC(SC), { name: "Patient " + patientNo(SC) }) : SC);
const sciCtx = () => ({ P: maskP(P), SC: sciSC(), blind: blindNow(), eq, orders: mdt.orders, busy: mdt.busy, room: mdt.room, labSeries, hist, feed });
const scr = { el: $("#sci"), obj: null, id: "history", sub: 0, key: "", on: false, elW: 760 };
const LCD_K = 100, ccam = new T.PerspectiveCamera();
let viewPose = null;
function screenSize() { const D = chamber.dims, w = cam.aspect < 0.8 ? 420 : 760; scr.elW = w; scr.el.style.setProperty("--sw", w + "px"); scr.el.style.setProperty("--sh", Math.round(w * D.H / D.W) + "px"); if (scr.obj) scr.obj.scale.setScalar(D.W * LCD_K / w); }
/* each frame the page is laid exactly on my own sloped screen */
const _p = new V(), _q = new T.Quaternion();
function placeLcd() {
  lcdEl.style.display = scr.on ? "" : "none"; if (!scr.on || !scr.obj) return; const st = myStation(); if (!st) return;
  st.screen.plane.updateMatrixWorld(true); st.screen.plane.getWorldPosition(_p); st.screen.plane.getWorldQuaternion(_q);
  scr.obj.position.copy(_p).multiplyScalar(LCD_K); scr.obj.quaternion.copy(_q); scr.obj.scale.setScalar(chamber.dims.W * LCD_K / scr.elW); scr.obj.updateMatrixWorld();
  ccam.position.copy(cam.position).multiplyScalar(LCD_K); ccam.quaternion.copy(cam.quaternion); ccam.projectionMatrix.copy(cam.projectionMatrix); ccam.projectionMatrixInverse.copy(cam.projectionMatrixInverse); ccam.updateMatrixWorld(true);
  css3.render(lcdScene, ccam);
}
function screenPose() {
  const st = myStation(); if (!st) return null; const D = chamber.dims, tv = Math.tan(cam.fov * Math.PI / 360), th = tv * cam.aspect, d = Math.max((D.W / 2) / (0.95 * th), (D.H / 2) / (0.72 * tv)), sv = chamber.screenView(st, d);
  const dx = sv.at.x - sv.pos.x, dy = sv.at.y - sv.pos.y, dz = sv.at.z - sv.pos.z; return { x: sv.pos.x, z: sv.pos.z, h: sv.pos.y, yaw: Math.atan2(dx, -dz), pit: Math.atan2(dy, Math.hypot(dx, dz)) };
}
function zoomHero(h) { { const n = performance.now(); if (n - lastZoom < 350) return; lastZoom = n; } const v = chamber.heroView(h, 3.6), hh = 2.2; focus = null; me.seated = false; $("#card").hidden = true; viewPose = { x: v.x, z: v.z, h: hh, yaw: Math.atan2(v.at.x - v.x, -(v.at.z - v.z)), pit: Math.atan2(v.at.y - hh, Math.hypot(v.at.x - v.x, v.at.z - v.z)) }; }
const mySpecLabel = () => specInfo(mySpec)[0];
function ordersTabs() {
  const o = mdt.orders, tabs = []; if (!o) return tabs; const arrest = (o.acls || []).length > 0;
  if (arrest) tabs.push({ id: "!Resus", label: "Resuscitation", items: o.acls, red: true });
  (o.groups || []).forEach((g) => { if (g.items.some((i) => i.ok)) tabs.push({ id: g.g, label: g.g, items: g.items }); });
  if ((o.call || []).length) tabs.push({ id: "!Call", label: "Call in", items: o.call.map((c) => ({ kind: "call", specialty: c.id, label: "Call " + c.label, ok: c.ok })) });
  if ((o.wrong || []).length) tabs.push({ id: "!Risky", label: "Risky steps", items: o.wrong });
  if (o.enter) tabs.unshift({ id: "!Enter", label: "Enter", items: [{ kind: "enter", label: "Enter the bedspace", ok: true }] });
  return tabs;
}
function ordersHtml() {
  const tabs = ordersTabs(); if (!mdt.room || mdt.room.status !== "live") return `<div class="sbody"><p class="nt">Orders open when the shift is live.</p></div>`;
  if (!tabs.length) return `<div class="sbody"><p class="nt">No order is available to you at this moment.</p></div>`;
  const i = clamp(scr.sub, 0, tabs.length - 1), cur = tabs[i];
  return `<nav class="subs">${tabs.map((t, n) => `<button type="button" data-i="${n}" data-on="${n === i ? 1 : 0}" class="${t.red ? "red" : ""}">${esc(t.label)}</button>`).join("")}</nav><div class="sbody"><h3>${esc(cur.label)} · ${esc(mySpecLabel())}</h3><div class="acts">${cur.items.map((b) => `<button type="button" class="bt" data-act="order" data-kind="${esc(b.kind)}" data-spec="${esc(b.specialty || "")}" ${b.ok && !mdt.busy ? "" : "disabled"}>${esc(b.label)}${b.ok ? "" : "<small>not your call</small>"}</button>`).join("")}</div><p class="nt">${esc(mdt.err || (mdt.busy ? "Sending…" : ""))}</p></div>`;
}
const KIND = { ask: "asks", propose: "proposes", challenge: "challenges", agree: "agrees", final: "finalises" };
function teamHtml() {
  const lastP = [...chat].reverse().find((m) => m.k === "propose"), sup = supporters(), need = needed();
  const acts = [["ask", "Request investigations"], ["propose", "Propose plan"], ["challenge", "Challenge plan"], ["agree", "Agree"], ["final", "Finalise MDT plan"]];
  return `<div class="sbody"><h3>Team actions</h3><div class="acts">${acts.map(([k, l]) => `<button type="button" class="bt ${k === "final" ? "fin" : ""}" data-act="say" data-k="${k}">${l}</button>`).join("")}</div>${lastP ? `<p class="nt">Plan on the table: ${sup.size} of ${need} needed to finalise.</p>` : ""}<h4>Discussion</h4>${chat.length ? `<ul class="ls">${chat.slice(-12).reverse().map((m) => `<li class="${m.k === "challenge" ? "x" : m.k === "agree" || m.k === "final" ? "ok" : m.k === "propose" ? "w" : ""}"><b>${esc(m.name)}</b> ${KIND[m.k] || ""}${m.text ? ": " + esc(m.text) : ""}</li>`).join("")}</ul>` : `<p class="nt">Nothing has been said yet. Ask for investigations, share your assessment, or propose management.</p>`}</div>`;
}
function screenHtml() {
  const st = myStation(), it = (st && st.item) || {}, acc = it.accent || "#5fe3ff", tabs = TAB_ORDER.map((id) => { const n = unseen[id] || 0; return `<button type="button" data-id="${id}" data-on="${id === scr.id ? 1 : 0}">${esc(TAB_LABEL[id])}${n > 0 ? `<i>${n}</i>` : ""}</button>`; }).join("");
  const head = `<header style="--a:${acc}"><span class="rl">${esc(it.label || mySpecLabel())}</span><b>${esc(myName)}</b><span class="lv">● LIVE</span><button class="scix" type="button">Back to table ✕</button></header><nav class="stabs">${tabs}</nav>`;
  const sec = SECTIONS.find((x) => x.id === scr.id);
  if (sec) { const g = sec.groups || {}, sub = clamp(scr.sub, 0, sec.subs.length - 1); return head + `<nav class="subs">${sec.subs.map((t, i) => (g[i] ? `<i class="gl">${esc(g[i])}</i>` : "") + `<button type="button" data-i="${i}" data-on="${i === sub ? 1 : 0}">${esc(t)}</button>`).join("")}</nav><div class="sbody"><h3>${esc(sec.subs[sub])}</h3>${P && SC ? buildSection(scr.id, sub, sciCtx()) : `<p class="nt">The case appears here when the shift begins.</p>`}</div>`; }
  return head + (scr.id === "orders" ? ordersHtml() : teamHtml());
}
/* the scans are drawn once and copied afterwards: a screen that refreshes every second must not redraw a CT slice by hand each time */
const imgCache = new Map();
function paintImageCached(c, k, r) {
  const key = k + "|" + r + "|" + c.width + "x" + c.height; let o = imgCache.get(key);
  if (!o) { o = document.createElement("canvas"); o.width = c.width; o.height = c.height; paintImage(o, k, r); if (imgCache.size > 24) imgCache.delete(imgCache.keys().next().value); imgCache.set(key, o); }
  c.getContext("2d").drawImage(o, 0, 0);
}
function sciPaint() { const el = scr.el; el.querySelectorAll("canvas.ximg").forEach((c) => paintImageCached(c, c.dataset.k, c.dataset.r)); el.querySelectorAll("canvas.ecg").forEach((c) => paintEcg(c, +c.dataset.hr, c.dataset.r, c.dataset.a === "1")); paintMachines(0); }
/* the machines on the Treatment page move: repaint them a few times a second while the screen shows one */
let machT = 0;
function paintMachines(now) {
  if (!scr.on) return; const cs = []; scr.el.querySelectorAll("canvas.mach").forEach((c) => cs.push(c));
  cs.forEach((c) => { let st = {}; try { st = JSON.parse(c.dataset.st || "{}"); } catch (e) { /* ignore */ } paintMachine(c, c.dataset.k, st, now / 1000); });
}
let lastRender = 0;
function renderScreen(force) {
  if (!scr.on) return;
  const nowR = performance.now(); if (!force && nowR - lastRender < 900) return; const key = JSON.stringify([scr.id, scr.sub, P && [Math.round(P.hr), Math.round(P.map), Math.round(P.spo2), P.hour, (P.results || []).length, (P.log || []).length, P.tube, P.norepi, P.oxygen, P.artLine, P.hdLine, P.dialysis, P.outcome], mdt.busy, mdt.err, mdt.orders && JSON.stringify(mdt.orders.groups.map((g) => g.items.map((i) => (i.ok ? 1 : 0)))), mdt.room && mdt.room.members && mdt.room.members.length, chat.length, unseen]);
  if (!force && key === scr.key) return; scr.key = key; lastRender = nowR; const el = scr.el, sb = el.querySelector(".sbody"), top = sb ? sb.scrollTop : 0, ns = el.querySelector(".subs"), nl = ns ? ns.scrollLeft : 0, nt = el.querySelector(".stabs"), ntl = nt ? nt.scrollLeft : 0;
  el.innerHTML = screenHtml(); const nb = el.querySelector(".sbody"); if (nb && !force) nb.scrollTop = top; const n2 = el.querySelector(".subs"); if (n2 && !force) n2.scrollLeft = nl; const n3 = el.querySelector(".stabs"); if (n3) n3.scrollLeft = ntl; sciPaint();
  if (force) { const on = el.querySelector(".stabs [data-on='1']"), sn = el.querySelector(".stabs"); if (on && sn) sn.scrollLeft = on.offsetLeft - (sn.clientWidth - on.offsetWidth) / 2; }
}
let lastEnter = 0, lastZoom = 0;
function enterScreen(id, sub) {
  { const n = performance.now(); if (scr.on && (n - lastEnter < 300 || (id === scr.id && (sub || 0) === scr.sub))) { lastEnter = n; return; } lastEnter = n; }
  if (id) { scr.id = id; scr.sub = sub || 0; } else if (!scr.on && !SECTIONS.some((x) => x.id === scr.id) && scr.id !== "orders" && scr.id !== "team") scr.id = DEFTAB[mySpec] || "history";
  unseen[scr.id] = 0; if (!scr.obj) { screenSize(); scr.obj = new CSS3DObject(scr.el); scr.el.classList.add("lcd"); lcdScene.add(scr.obj); screenSize(); }
  scr.on = true; scr.el.hidden = false; document.body.classList.add("using"); $("#card").hidden = true; focus = null; viewPose = null; me.seated = false; renderScreen(true); sfx.unlock(); sfx.beep && sfx.beep({ f: 880, vol: 0.25 });
}
function exitScreen() { if (!scr.on) return; scr.on = false; try { paintHeroes(0, 0, true); } catch (e) {} scr.el.hidden = true; lcdEl.style.display = "none"; document.body.classList.remove("using"); retreat = false; const st = myStation(); if (st) { goal = { x: st.x, z: st.z }; me.seated = true; } }
scr.el.addEventListener("click", (e) => {
  const t = e.target.closest("button,canvas"); if (!t) return;
  if (t.classList.contains("scix")) return exitScreen();
  if (t.dataset.id && t.closest(".stabs")) { scr.id = t.dataset.id; scr.sub = 0; unseen[scr.id] = 0; renderScreen(true); return; }
  if (t.dataset.i != null && t.closest(".subs")) { scr.sub = +t.dataset.i; renderScreen(true); return; }
  if (t.dataset.act === "order") { post("hall-order", { kind: t.dataset.kind, specialty: t.dataset.spec || "" }); t.classList.add("sent"); sfx.unlock(); return; }
  if (t.dataset.act === "say") { openSay(t.dataset.k); return; }
  if (t.dataset.act === "goto") { scr.sub = +t.dataset.sub || 0; scr.id = t.dataset.sec; unseen[scr.id] = 0; renderScreen(true); return; }
  if (t.tagName === "CANVAS" && t.classList.contains("ximg")) { const r = t.getBoundingClientRect(), x = (e.clientX - r.left) * t.width / r.width, y = (e.clientY - r.top) * t.height / r.height, hs = hotspotAt(t.dataset.k, x, y, t.width, t.height, t.dataset.r), box = scr.el.querySelector(".hot"); if (box) { box.textContent = hs ? hs.n + ". " + hs.text : "Tap on one of the numbered spots."; box.dataset.hit = hs && hs.hit ? "1" : "0"; } }
});

/* ================================================================ the team's talk: ask, propose, challenge, agree, finalise */
const SAYS = { ask: ["Request investigations", "What do we need to know?", ["Can we send a blood gas, lactate and chest imaging?", "What does the examination show?", "Which result are we still waiting for?"]], propose: ["Propose a plan", "What should the team do now?", ["Start oxygen and fluids, then reassess in the next hour.", "Send cultures, then give the first antibiotic.", "Get more data before we commit to one diagnosis."]], challenge: ["Challenge the plan", "What worries you about it?", ["What else could explain this picture?", "I would not treat before the results are back.", "The vitals say act now. Waiting is risky."]] };
const lastPropose = () => [...chat].reverse().find((m) => m.k === "propose");
function supporters() { const lp = lastPropose(), s = new Set(); if (!lp) return s; s.add(lp.uid); const i = chat.lastIndexOf(lp); chat.slice(i + 1).forEach((m) => { if (m.k === "agree") s.add(m.uid); }); return s; }
const needed = () => Math.max(1, Math.ceil((1 + peerList.filter((p) => p.connected).length) / 2));
function sendChat(k, text) {
  const m = { k, text: String(text || "").slice(0, 240), n: 0, time: Date.now() }; chat.push(Object.assign({ name: myName, spec: mySpecLabel(), uid: myId }, m)); if (chat.length > 60) chat.shift(); if (net) net.chat(m);
  sfx.chime && sfx.chime("find"); scr.key = ""; paintHeroes(0, 0, true); renderScreen(true);
}
function finalise() {
  const lp = lastPropose(); if (!lp) { toast("Propose a plan first, then agree it."); return; }
  if (supporters().size < needed()) { toast("Not enough of the team agree yet: " + supporters().size + " of " + needed() + "."); return; }
  sendChat("final", lp.text); post("hall-finalize", { plan: lp.text }); toast("The MDT plan is finalised.");
}
function toast(s) { $("#note").textContent = s; $("#note").hidden = false; clearTimeout(noteT); noteT = setTimeout(() => { $("#note").hidden = true; }, 4200); }
let sayK = "";
function openSay(k) {
  if (!mdt.room || mdt.room.status !== "live") { toast("The shift is not live yet."); return; }
  if (k === "agree") { const lp = lastPropose(); if (!lp) { toast("There is no plan to agree yet."); return; } sendChat("agree", "Agrees with " + lp.name + "'s plan."); return; }
  if (k === "final") { finalise(); return; }
  sayK = k; const d = SAYS[k]; $("#sayt").textContent = d[0]; $("#sayq").textContent = d[1]; $("#sayi").value = ""; $("#sayc").innerHTML = d[2].map((s) => `<button type="button" class="chipq">${esc(s)}</button>`).join(""); $("#say").hidden = false;
  $("#sayc").querySelectorAll("button").forEach((b) => { b.onclick = () => { $("#sayi").value = b.textContent; }; });
}
$("#sayx").onclick = () => { $("#say").hidden = true; };
$("#sayg").onclick = () => { const v = $("#sayi").value.trim(); if (!v) return; $("#say").hidden = true; sendChat(sayK, v); };
$("#acts").onclick = (e) => { const b = e.target.closest("button[data-k]"); if (b) openSay(b.dataset.k); };
$("#rx").onclick = () => enterScreen();
addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#say").hidden) $("#say").hidden = true; else if (scr.on) exitScreen(); } });
function openOrders(group) { const i = ordersTabs().findIndex((t) => t.id === group); enterScreen("orders", Math.max(0, i)); }

/* ================================================================ the state from the Team room */
const equipFrom = (p) => { const g = p.given || {}, any = (re) => Object.keys(g).some((k) => re.test(k) && g[k] > 0); return { tube: !!p.tube, oxygen: !!p.oxygen, spo2: Math.round(p.spo2), rr: p.rr, norepi: !!p.norepi, fluid: g["drug:fluids"] || 0, abx: any(/^abx:/), blood: (g["drug:blood"] || 0) > 0 || (g["drug:mtp"] || 0) > 0, dialysis: !!p.dialysis, saline: (g["drug:saline3"] || 0) > 0, mannitol: (g["drug:mannitol"] || 0) > 0 }; };
function apply(d) {
  mdt = { room: d.room || null, orders: d.orders || null, busy: !!d.busy, err: d.err || "", line: !!d.line };
  if (d.me) { if (d.me.name) myName = d.me.name; }
  const room = mdt.room; P = room && room.patient || null; SC = room && room.scenario || null;
  const spec = room && room.you && room.you.specialty; if (spec && spec !== mySpec) mySpec = spec;
  if (room && room.code) startNet();
  if (P) { eq = equipFrom(P); refreshTubes(true); scanFeed(); renderScreen(false); } else if (scr.on) exitScreen();
  const live = !!(room && room.status === "live");
  $("#line").dataset.on = mdt.line ? "1" : "0"; voice.show(live && !!P); voice.setBusy(mdt.busy); $("#livep").hidden = !live; $("#rx").hidden = !live || scr.on; $("#acts").hidden = !live;
  chips(); renderDesk(); rebuildStations(false); paintHeroes(0, 0, true);
  if (SC && nameLabel.key !== "Patient " + patientNo(SC)) setNameLabel();
}
function setNameLabel() {
  if (nameLabel.sp) { turn.remove(nameLabel.sp); nameLabel.sp.material.map.dispose(); }
  nameLabel.key = "Patient " + patientNo(SC); const sp = nameTag(T, nameLabel.key, SC.age + " years · " + (SC.sex === "woman" ? "female" : "male"), 0x5fe3ff); sp.position.set(0, 1.05, 0); sp.scale.set(1.2, 0.3, 1); turn.add(sp); nameLabel.sp = sp;
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
  if (parent !== window) post("hall-aud"); else location.href = "living-command.html?start=aud&from=team&v=20261122c";
}
function leave(type) { if (net) { net.close(); net = null; } post(type); }

/* ================================================================ the sound: the monitor beeps with the heart */
let nextBeep = 0;
function sounds(now) {
  if (!sfx.isOn || !sfx.isOn() || !P || !mdt.room || mdt.room.status !== "live") return; sfx.setListener(me.x, me.z, me.yaw); if (now < nextBeep) return;
  const st = statusOf(P); sfx.beep({ f: [880, 1046, 1175][st], vol: 0.7, pos: { x: 1.4, z: -0.4 } }); nextBeep = now + 60000 / Math.max(40, disp.hr || 70);
}

/* ================================================================ the loop */
let vsh = 0, last = 0, sendT = 0, mvSpeed = 0, px = me.x, pz = me.z, bobT = 0, t0 = performance.now(), shown = false, stT = 0, scrT = 0;
const camTarget = new V(), organPos = new V();
function loop(now) {
  requestAnimationFrame(loop);
  if (now - last < 1000 / 45) return; const dt = Math.min((now - last) / 1000, 0.1); last = now; const t = (now - t0) / 1000;
  /* arrival: walk in through the door while the opening screen fades */
  if (arrive.t < 2.4 && shown) { arrive.t = (performance.now() - arrive.t0) / 1000; const k = clamp(arrive.t / 2.4, 0, 1), e = k * k * (3 - 2 * k); me.x = arrive.from.x + (arrive.to.x - arrive.from.x) * e; me.z = arrive.from.z + (arrive.to.z - arrive.from.z) * e; me.yaw = faceCenter(me.x, me.z); }
  if (dn && holdDir && mvd > 10 && performance.now() - lastV > 120 && mode !== "spin" && !scr.on) walkBy(holdDir * dt * 1.7);
  if (me.z > RH + 0.9 && shown && arrive.t >= 2.4 && !leavingTo) goAuditorium();
  /* glide to an organ, to my screen, to a wall display, or to my seat; otherwise the view the arc sets */
  let eyeH = 1.5, pit = 0;
  if (focus) { const k = 1 - Math.exp(-dt * 3.2); me.x += (focus.x - me.x) * k; me.z += (focus.z - me.z) * k; const ty = Math.atan2(focus.c.x - me.x, -(focus.c.z - me.z)); let dy = ty - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * k; me.h += (focus.h - me.h) * k; me.pit += (0 - me.pit) * k; }
  else if (scr.on || viewPose) { const tp = scr.on ? screenPose() : viewPose; if (tp) { const k = 1 - Math.exp(-dt * 3.4); me.x += (tp.x - me.x) * k; me.z += (tp.z - me.z) * k; me.h += (tp.h - me.h) * k; let dy = tp.yaw - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * k; me.pit += (tp.pit - me.pit) * k; } }
  else { vpCur += (vp - vpCur) * Math.min(1, dt * 4); const rr0 = Math.hypot(me.x, me.z) || 1, fade = arrive.t < 2.4 ? 0 : clamp((10.0 - rr0) / 2.2, 0, 1), eyeG = Math.max(1.45, Math.min(5.4, 1 + rr0 * Math.tan(vpCur))), eyeT = 1.5 + (eyeG - 1.5) * fade, pitT = fade > 0.02 ? -Math.atan((eyeG - 1) / rr0) * fade : 0; me.h += (eyeT - me.h) * Math.min(1, dt * 3); me.pit += (pitT - me.pit) * Math.min(1, dt * 3); if (goal) { const k = 1 - Math.exp(-dt * 2.6); me.x += (goal.x - me.x) * k; me.z += (goal.z - me.z) * k; let dy = faceCenter(me.x, me.z) - me.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); me.yaw += dy * k; if (Math.hypot(goal.x - me.x, goal.z - me.z) < 0.03) goal = null; } if (retreat) { const r = Math.hypot(me.x, me.z); if (r < MINR - 0.01) { const k = Math.min(1, dt * 2.4), nr = r + (MINR - r) * k; me.x *= nr / (r || 1); me.z *= nr / (r || 1); } else retreat = false; } }
  eyeH = me.h; pit = me.pit;
  const sp = Math.hypot(me.x - px, me.z - pz) / Math.max(dt, 0.001); mvSpeed += (sp - mvSpeed) * Math.min(1, dt * 8); px = me.x; pz = me.z;
  bobT += mvSpeed * dt * 2.2; const bob = focus || scr.on || viewPose ? 0 : Math.sin(bobT * 3.0) * 0.016 * Math.min(1, mvSpeed);
  if (cam.view) cam.clearViewOffset();
  cam.position.set(me.x, eyeH + bob, me.z); cam.rotation.order = "YXZ"; cam.rotation.set(focus ? Math.atan2(focus.c.y - eyeH, Math.hypot(focus.c.x - me.x, focus.c.z - me.z)) * 0.8 : pit, -me.yaw, 0);
  /* the patient: the disc turns, breathing, heartbeat, status colour */
  if (!dn || mode !== "spin") { if (autoSpin) turn.rotation.y += dt * 0.5; else { turn.rotation.y += spinV * dt; spinV *= Math.exp(-dt * 3.2); } }
  const tgt = P || { hr: 80, sbp: 120, dbp: 75, map: 90, spo2: 98, rr: 16, gcs: 15, temp: 37, k: 4, lactate: 1.5, cr: 1 }, kk = Math.min(1, dt * 1.6);
  ["hr", "sbp", "dbp", "map", "spo2", "rr", "gcs", "temp", "k", "lactate", "cr"].forEach((f) => { if (typeof tgt[f] === "number") disp[f] += (tgt[f] - disp[f]) * kk; });
  const st = statusOf(P), alive = !P || P.alive !== false, cc = new T.Color(["#4fd8ff", "#ffc24a", "#ff4d5e"][st]);
  rimU.c.value.lerp(alive ? cc : new T.Color(0x8d9aa5), Math.min(1, dt * 3)); rimU.k.value = 0.85 + 0.15 * Math.sin(t * (st === 2 ? 6 : 1.6));
  haloM.color.lerp(alive ? cc : new T.Color(0x667788), Math.min(1, dt * 3)); haloM.opacity = 0.45 + 0.2 * Math.sin(t * (st === 2 ? 6 : 1.6));
  const hb = 1 + 0.06 * Math.max(0, Math.sin(t * Math.PI * 2 * (disp.hr / 60))) * (alive ? 1 : 0), br = alive ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (disp.rr / 60)) : 0;
  if (organs.heart && organs.heart.pv) organs.heart.pv.scale.setScalar(hb); if (organs.lungs && organs.lungs.pv) organs.lungs.pv.scale.set(1 + 0.05 * br, 1 + 0.02 * br, 1 + 0.05 * br);
  if (organs.lungs && P) { const blue = clamp((93 - disp.spo2) / 14, 0, 1); organs.lungs.mesh.material.color.copy(organs.lungs.base).lerp(new T.Color(0x6a74c8), blue); organs.lungs.mesh.material.emissive.copy(organs.lungs.mesh.material.color); }
  /* an organ glows for the team's open problems only once the case is over: a glow on the lungs or kidneys would give the diagnosis away */
  const hot = new Set(); if (!blindNow()) ((P && P.problems) || []).forEach((q) => { if (q.open && !q.resolved) ({ pulmonologist: ["lungs"], cardiologist: ["heart", "arteries"], nephrologist: ["kidneys", "bladder"], infectious: ["spleen"], gastroenterologist: ["stomach", "liver"], surgeon: ["bowel", "pancreas"], neurologist: ["brain", "spinal"] }[q.specialty] || []).forEach((n) => hot.add(n)); });
  Object.keys(organs).forEach((n) => { const o = organs[n], on = hot.has(n) || n === sel, base = 0.2; o.mesh.material.emissiveIntensity = base + (on ? 0.5 + 0.35 * Math.sin(t * 4) : 0); });
  if (shown || arrive.t > 0.2) dev.update(eq, t);
  if (nameLabel.sp) nameLabel.sp.material.opacity = clamp((Math.hypot(cam.position.x, cam.position.z) - 2.0) / 1.6, 0, 1);
  refreshTubes(false);
  /* the chamber: the rings revolve, the wall displays and the doctors' screens are redrawn */
  chamber.update(dt, t);
  wallLive.hr = disp.hr; wallLive.map = disp.map; wallLive.spo2 = disp.spo2; wallLive.rr = disp.rr; wallLive.temp = disp.temp; wallLive.lactate = disp.lactate; wallLive.k = disp.k; wallLive.cr = disp.cr; if (!document.hidden && !scr.on) updateWalls(t);
  if ((machT += dt) > 0.07) { machT = 0; paintMachines(now); }
  { const want = insideWant || !!focus ? 0.17 : 1; bodyMat.opacity += (want - bodyMat.opacity) * Math.min(1, dt * 5); bodyMat.depthWrite = bodyMat.opacity > 0.6; }
  if (!document.hidden && !scr.on) { paintHeroes(dt, t, false); paintConsoles(dt, t); }
  if ((stT += dt) > 0.6) { stT = 0; rebuildStations(false); }
  if ((scrT += dt) > 0.25) { scrT = 0; renderScreen(false); }
  /* send my place and my open tab to the others */
  if ((sendT += dt) > 0.1) { sendT = 0; if (net) net.send({ x: +me.x.toFixed(2), z: +me.z.toFixed(2), y: +me.yaw.toFixed(3), a: mvSpeed > 0.15 ? 1 : 0, bed: Math.hypot(me.x, me.z) < 4.2 ? 1 : -1, tb: scr.on ? scr.id : "" }); }
  remotes.forEach((r) => {
    if (!r.doc) return; const k = Math.min(1, dt * 9), ox = r.x, oz = r.z; r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k; let dy = r.ty - r.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.yaw += dy * k;
    const v = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 0.001), seat = chamber.stations.find((s) => Math.hypot(s.x - r.x, s.z - r.z) < 0.55), sit = !!seat && v < 0.35;      /* a doctor who stands at a station sits in its chair */
    r.doc.setSeated(sit); r.doc.setMoving(sit ? 0 : Math.min(1, v / 1.6)); r.doc.group.position.set(sit ? seat.x : r.x, 0, sit ? seat.z : r.z); r.doc.group.rotation.y = Math.PI - r.yaw; r.doc.update(dt);
    if (performance.now() - r.last > 15000 && r.info && !r.info.connected) r.doc.group.visible = false;
  });
  sounds(now); R.render(S, cam); placeLcd();
  if (!shown && bodyReady) { shown = true; arrive.t0 = performance.now(); requestAnimationFrame(() => $("#veil").classList.add("off")); }
}
requestAnimationFrame(loop);
bodyLoad.then((ok) => { if (!ok) $("#vmsg").textContent = "The 3D body did not load. Check the connection."; });
setTimeout(() => { $("#veil").classList.add("off"); }, 9000);
setTimeout(() => { $("#hint").style.opacity = 0; }, 22000);

/* ================================================================ start */
chips(); renderDesk(); rebuildStations(true); paintHeroes(0, 0, true);
post("hall-ready");
window.__voice = voice; window.__hud = hud;
window.__nexus = { R, me, cam, S, turn, chamber, hero, remotes, organs, dev, feed, hist, chat, labSeries, openSection: enterScreen, closeSection: exitScreen, openOrders, scr, bodyMat, tapAt, zoomHero, get mdt() { return mdt; }, eqSet: (x) => { Object.assign(eq, x); refreshTubes(true); }, apply, peers: () => peerList, net: () => net, focusOrgan, sendChat, get P() { return P; } };
if (DEMO) {
  const orders = { groups: [{ g: "Orders", items: [{ kind: "examine", label: "Examine", ok: true }, { kind: "labs", label: "Send labs", ok: true }, { kind: "antibiotics", label: "Antibiotics", ok: true }, { kind: "fluid", label: "Fluid 500 mL", ok: true }, { kind: "norepi", label: "Noradrenaline", ok: true }, { kind: "art-line", label: "Insert arterial line", ok: true }] }, { g: "Lung", items: [{ kind: "oxygen", label: "Oxygen", ok: true }, { kind: "intubate", label: "Intubate", ok: true }, { kind: "cxr", label: "Chest film", ok: true }, { kind: "ct-chest", label: "CT chest", ok: false }] }, { g: "Heart", items: [{ kind: "echo", label: "Echocardiogram", ok: true }] }], call: [{ id: "pulmonologist", label: "Pulmonologist", ok: true }, { id: "nephrologist", label: "Nephrologist", ok: true }], wrong: [{ kind: "flood", label: "Give 2 litres without looking", ok: true }], acls: [], enter: false };
  const room = { id: "demo", code: "DEMO42", status: "live", host: true, slots: { intensivist: 1, pulmonologist: 1, nephrologist: 1 }, you: { specialty: mySpec, inside: true }, members: [{ userId: myId, name: myName, specialty: mySpec, inside: true }, { userId: "x1", name: "Ravi", specialty: "pulmonologist" }, { userId: "x2", name: "Meera", specialty: "nephrologist" }], scenario: { name: "Meera Nair", age: 58, sex: "woman", dx: "Fever and hypoxaemic pneumonia", story: "Three days of fever and a productive cough. She is speaking. The saturation is 91% on air. The pressure, for now, is acceptable." }, patient: { hour: 3, hr: 112, sbp: 104, dbp: 64, map: 77, spo2: 91, rr: 28, gcs: 15, temp: 38.6, lactate: 2.6, cr: 1.4, k: 4.3, rhythm: "sinus", alive: true, tube: false, oxygen: true, norepi: false, problems: [{ id: "a", title: "Pneumonia with falling saturation", specialty: "pulmonologist", open: true, called: false }, { id: "b", title: "Rising lactate", specialty: "intensivist", open: true, called: true }], results: [{ label: "Labs", text: "Lactate 2.6 mmol/L. Creatinine 1.4 mg/dL. Potassium 4.3 mmol/L. Haemoglobin 11.4 g/dL." }], log: [{ t: 1, text: "Asha examined the patient." }, { t: 2, text: "Asha put oxygen on." }] } };
  apply({ room, orders, me: { name: myName } });
  if (Q.has("engine")) {                                   /* ?demo&engine: the real case engine behind the hall, for trying orders */
    const E = await import("./case-engine.js?v=20261122c"), team = (Q.get("team") || "intensivist,pulmonologist,nephrologist").split(","), sc = E.Dp(7, team, { caseId: Q.get("case") || undefined, noRemember: true, recent: [] });
    const acts = [], t0 = Date.now() - (+Q.get("t") || 0) * 1000, me0 = room.members[0];
    room.slots = {}; team.forEach((sp) => { room.slots[sp] = 1; });
    room.members = team.map((sp, i) => ({ userId: i === 0 ? myId : "x" + i, name: i === 0 ? myName : "Dr " + sp.slice(0, 5), specialty: sp, inside: true })); room.you = { specialty: team[0], inside: true }; mySpec = team[0];
    room.scenario = { name: sc.name, age: sc.age, sex: sc.sex, dx: sc.dx, story: sc.story, shockable: sc.shockable };
    const publish = () => { room.patient = E.Np(sc, acts, Date.now() - t0); apply({ room, orders, me: { name: myName } }); };
    demoHook = (type, o) => { const add = (k, spec) => acts.push({ atMs: Date.now() - t0 + acts.length, userId: myId, name: myName, specialty: mySpec, kind: k, payload: k === "call" ? { specialty: spec || "" } : {} }); if (type === "hall-order") add(o.kind, o.specialty); else if (type === "hall-orders") (o.orders || []).forEach((x) => add(x.kind, x.specialty)); publish(); };
    window.__demo = { sc, acts, publish, shift(sec) { acts.forEach((a) => { a.atMs += 0; }); return sec; }, E };
    feed.length = 0; hist.length = 0; labSeries.length = 0; seenKeys.clear(); feedInit = false; unseen.invest = 0; unseen.history = 0;
    setInterval(publish, 1000); publish();
  }
}

