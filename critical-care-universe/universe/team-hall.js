/* The shared ICU hall for the Multidisciplinary Team: one open hall, six glass-fronted bays (three each side of a polished
   corridor), the ICU Command board on the far wall. Every doctor in the shift walks it in first person with the same finger
   controls as the Living ICU (swipe up to walk, keep the finger down to keep walking, drag sideways to look) and sees the
   others as 3D avatars, moved over a peer-to-peer link (hall-net.js).
   Bed 1 is the team's patient, driven by the shift state sent by the Team room; the other bays are ambient patients.
   Visual simulation only. */
import * as T from "./three.module.js";
import { buildBed } from "./icu-bed.js?v=20261120l";
import { loadArchetype, build as buildPerson, patientFile } from "./patient3d.js?v=20261120l";
import { loadDoctorBody, createDoctor, specInfo } from "./doctor-avatar.js?v=20261120l";
import { createHallNet, localSignal, ntfySignal } from "./hall-net.js?v=20261120l";
import { createSfx } from "./sfx.js?v=20261120l";

const Q = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);
const code = (Q.get("code") || "SOLO").toUpperCase(), myId = Q.get("id") || ("u" + Math.random().toString(36).slice(2, 8));
const myName = (Q.get("name") || "Doctor").slice(0, 40), mySpec = Q.get("spec") || "intensivist";
const hashN = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const mySex = Q.get("sex") || (hashN(myId) % 2 ? "f" : "m");

/* ---------------------------------------------------------------- renderer, scene */
const cv = $("#gl"), V = T.Vector3;
const R = new T.WebGLRenderer({ canvas: cv, antialias: matchMedia("(pointer:fine)").matches });
R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
const S = new T.Scene(); S.background = new T.Color(0x0a1420); S.fog = new T.Fog(0x0a1420, 18, 40);
const cam = new T.PerspectiveCamera(64, 1, 0.05, 60);
const fit = () => { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.fov = cam.aspect < 0.8 ? 74 : 64; cam.updateProjectionMatrix(); };
addEventListener("resize", fit); fit();

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rnd = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
const env = (() => {
  const es = new T.Scene();
  es.add(new T.Mesh(new T.BoxGeometry(40, 12, 40), new T.MeshBasicMaterial({ color: 0x4a6a88, side: T.BackSide })));
  for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) { const m = new T.Mesh(new T.PlaneGeometry(4, 0.7), new T.MeshBasicMaterial({ color: new T.Color(7, 7.5, 8) })); m.rotation.x = Math.PI / 2; m.position.set(i * 6, 5.8, j * 9); es.add(m); }
  const pm = new T.PMREMGenerator(R), rt = pm.fromScene(es, 0.02); pm.dispose(); return rt.texture;
})();
const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0, envMap: env, envMapIntensity: 0.8 }, o || {}));
const E = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k || 1), toneMapped: false });
function ctex(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); fn(g, w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; }
const mesh = (geo, mat, x, y, z, par) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (par) par.add(m); return m; };
const bx = (w, h, d, mat, x, y, z, par) => mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, par);
const cyl = (r1, r2, h, mat, x, y, z, par, seg) => mesh(new T.CylinderGeometry(r1, r2, h, seg || 14), mat, x, y, z, par);
const gcache = {};
function rgeo(w, h, d, r) {
  const key = [w, h, d, r].join(","); if (gcache[key]) return gcache[key];
  const b = Math.min(r * 0.6, d / 3, w / 4, h / 4), ww = w - 2 * b, hh = h - 2 * b, rr = Math.max(0.001, r - b), s = new T.Shape(), x = -ww / 2, y = -hh / 2;
  s.moveTo(x + rr, y); s.lineTo(x + ww - rr, y); s.quadraticCurveTo(x + ww, y, x + ww, y + rr); s.lineTo(x + ww, y + hh - rr); s.quadraticCurveTo(x + ww, y + hh, x + ww - rr, y + hh);
  s.lineTo(x + rr, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.002, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 5 });
  g.translate(0, 0, -(d - 2 * b) / 2); return (gcache[key] = g);
}
const rb = (w, h, d, r, mat, x, y, z, par) => mesh(rgeo(w, h, d, r), mat, x, y, z, par);

/* ---------------------------------------------------------------- hall geometry */
const HL = 10, CORR = 3, CW = 5, DEPTH = 3.8, HW = CORR / 2 + DEPTH, HT = 3.4, XS = [-5, 0, 5];
const mMetal = M(0x7f93a6, { metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 }), mDark = M(0x151e28, { metalness: 0.6, roughness: 0.38 });
const mWhite = M(0xeef3f6, { roughness: 0.42 }), cyan = E(0x36d6ff, 2.2), white = E(0xffffff, 1.6);
const mGlass = new T.MeshStandardMaterial({ color: 0xb4dcf2, transparent: true, opacity: 0.12, roughness: 0.04, metalness: 0.15, envMap: env, envMapIntensity: 1.6, side: T.DoubleSide, depthWrite: false });
const fabric = ctex(128, 128, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 90 + rnd() * 90; g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(rnd() * w, rnd() * h, 2, 1); } });
fabric.wrapS = fabric.wrapT = T.RepeatWrapping; fabric.repeat.set(5, 5);

const hall = new T.Group(); S.add(hall);
S.add(new T.HemisphereLight(0xe6f1ff, 0x8aa0b8, 1.25));
const sun = new T.DirectionalLight(0xffffff, 0.6); sun.position.set(-4, 9, 3); S.add(sun);
[[-6, 0], [0, 0], [6, 0]].forEach(([x, z]) => { const l = new T.PointLight(0xdfefff, 9, 13, 1.6); l.position.set(x, 3.0, z); S.add(l); });

{ /* floor, ceiling, shell */
  const floorT = ctex(1024, 512, (g, w, h) => {
    g.fillStyle = "#c9d4dc"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,120,145,.28)"; g.lineWidth = 2; for (let i = 0; i <= 40; i++) { g.beginPath(); g.moveTo(i * w / 40, 0); g.lineTo(i * w / 40, h); g.stroke(); } for (let j = 0; j <= 23; j++) { g.beginPath(); g.moveTo(0, j * h / 23); g.lineTo(w, j * h / 23); g.stroke(); }
    const cz = h / 2, cw = h * CORR / (2 * HW);
    g.fillStyle = "#b9c8d3"; g.fillRect(0, cz - cw / 2, w, cw);
    g.strokeStyle = "#36d6ff"; g.shadowColor = "#36d6ff"; g.shadowBlur = 12; g.lineWidth = 5;
    [cz - cw / 2, cz + cw / 2].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
    g.shadowBlur = 0; g.strokeStyle = "rgba(54,214,255,.7)"; g.setLineDash([28, 22]); g.lineWidth = 4; g.beginPath(); g.moveTo(0, cz); g.lineTo(w, cz); g.stroke();
  });
  mesh(new T.PlaneGeometry(2 * HL, 2 * HW), M(0xffffff, { map: floorT, roughness: 0.22, metalness: 0.15, envMapIntensity: 1.2 }), 0, 0, 0, hall).rotation.x = -Math.PI / 2;
  const ceil = mesh(new T.PlaneGeometry(2 * HL, 2 * HW), M(0xe4ebf1, { roughness: 0.9 }), 0, HT, 0, hall); ceil.rotation.x = Math.PI / 2;
  for (let i = -4; i <= 4; i++) for (const z of [-3.6, 0, 3.6]) { const p = bx(1.8, 0.04, 0.5, white, i * 2.2, HT - 0.03, z, hall); void p; }
  const wallM = M(0xd6e0e7, { roughness: 0.7 });
  mesh(new T.PlaneGeometry(2 * HL, HT), wallM, 0, HT / 2, -HW, hall);
  const w2 = mesh(new T.PlaneGeometry(2 * HL, HT), wallM, 0, HT / 2, HW, hall); w2.rotation.y = Math.PI;
  const wE = mesh(new T.PlaneGeometry(2 * HW, HT), M(0x1a2733, { roughness: 0.7 }), HL, HT / 2, 0, hall); wE.rotation.y = -Math.PI / 2;
  const wW = mesh(new T.PlaneGeometry(2 * HW, HT), wallM, -HL, HT / 2, 0, hall); wW.rotation.y = Math.PI / 2;
  [-HW + 0.05, HW - 0.05].forEach((z) => { bx(2 * HL, 0.05, 0.06, cyan, 0, HT - 0.18, z, hall); bx(2 * HL, 0.05, 0.06, cyan, 0, 0.1, z, hall); });
  bx(0.06, 0.05, 2 * HW, cyan, HL - 0.05, HT - 0.18, 0, hall);
  /* entrance */
  const door = ctex(512, 160, (g, w, h) => { g.fillStyle = "#0d1626"; g.fillRect(0, 0, w, h); g.fillStyle = "#12e3c8"; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8); g.fillStyle = "#fff"; g.font = "800 62px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ICU", w / 2, 62); g.fillStyle = "#9fd8ff"; g.font = "600 30px system-ui,sans-serif"; g.fillText("Multidisciplinary hall", w / 2, 116); });
  const ds = mesh(new T.PlaneGeometry(2.4, 0.75), new T.MeshBasicMaterial({ map: door, toneMapped: false }), -HL + 0.04, 2.9, 0, hall); ds.rotation.y = Math.PI / 2;
  [-0.95, 0.95].forEach((z) => { const g = mesh(new T.PlaneGeometry(1.8, 2.4), mGlass, -HL + 0.03, 1.2, z, hall); g.rotation.y = Math.PI / 2; });
  bx(0.06, 2.5, 0.08, mMetal, -HL + 0.04, 1.25, 0, hall);
}

/* ---------------------------------------------------------------- bays */
const BAYS = [], PAT = [
  { n: "Septic shock", st: 2, sex: "m", age: 58 }, { n: "ARDS", st: 1, sex: "f", age: 44 }, { n: "DKA", st: 1, sex: "m", age: 29 },
  { n: "Status epilepticus", st: 0, sex: "f", age: 36 }, { n: "COPD exacerbation", st: 1, sex: "m", age: 67 }, { n: "Acute pancreatitis", st: 0, sex: "f", age: 51 },
];
const mdt = { patient: null, scenario: null, members: [], you: null };     // from the Team room
const TH = 0.5, cth = Math.cos(TH), sth = Math.sin(TH), LB = 0.95, hinge = [-0.05, 0.78];
const onBack = (u, off, z) => new V(hinge[0] - cth * u + sth * off, hinge[1] + sth * u + cth * off, z || 0);
const monList = [];
function monitorPainter(i) {
  const cvs = document.createElement("canvas"); cvs.width = 320; cvs.height = 200; const g = cvs.getContext("2d"), tex = new T.CanvasTexture(cvs); tex.colorSpace = T.SRGBColorSpace;
  return {
    tex, paint(t, p) {
      g.fillStyle = "#04110c"; g.fillRect(0, 0, 320, 200);
      const hr = p.hr, per = 60 / Math.max(30, hr);
      g.strokeStyle = "#3dff9a"; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x < 200; x++) { const tt = t - (200 - x) * 0.012, ph = ((tt % per) + per) % per / per; let y = 0; if (ph < 0.08) y = -Math.sin(ph / 0.08 * Math.PI) * 0.25; else if (ph > 0.12 && ph < 0.16) y = -Math.sin((ph - 0.12) / 0.04 * Math.PI) * 0.95; else if (ph > 0.16 && ph < 0.2) y = Math.sin((ph - 0.16) / 0.04 * Math.PI) * 0.3; else if (ph > 0.32 && ph < 0.44) y = -Math.sin((ph - 0.32) / 0.12 * Math.PI) * 0.3; if (!p.alive) y = 0; x ? g.lineTo(x, 55 + y * 38) : g.moveTo(x, 55 + y * 38); }
      g.stroke();
      g.strokeStyle = "#7fd4e6"; g.beginPath(); for (let x = 0; x < 200; x++) { const tt = t - (200 - x) * 0.012, ph = (((tt % per) + per) % per) / per; const y = p.alive ? Math.sin(ph * Math.PI * 2 - 1) * 0.5 + Math.exp(-ph * 4) * 0.4 : 0; x ? g.lineTo(x, 130 - y * 30) : g.moveTo(x, 130 - y * 30); } g.stroke();
      g.textAlign = "right"; g.font = "700 46px system-ui,sans-serif";
      g.fillStyle = "#3dff9a"; g.fillText(p.alive ? Math.round(p.hr) : "--", 312, 52);
      g.fillStyle = "#ff6b6b"; g.font = "700 30px system-ui,sans-serif"; g.fillText(Math.round(p.sbp) + "/" + Math.round(p.dbp), 312, 92);
      g.fillStyle = "#7fd4e6"; g.font = "700 40px system-ui,sans-serif"; g.fillText(p.alive ? Math.round(p.spo2) + "%" : "--", 312, 136);
      g.fillStyle = "#f0d98a"; g.font = "700 28px system-ui,sans-serif"; g.fillText("RR " + Math.round(p.rr), 312, 180);
      g.textAlign = "left"; g.fillStyle = "#8fa"; g.font = "600 18px system-ui,sans-serif"; g.fillText("MAP " + Math.round(p.map || (p.sbp + 2 * p.dbp) / 3), 8, 188);
      tex.needsUpdate = true;
    },
  };
}
const statusCol = (st) => ["#3dff9a", "#ffc24a", "#ff4d5e"][st || 0];
const labelTex = (i) => { const k = i, t = ctex(512, 140, () => {}); t.userData.draw = (title, sub, st) => { const g = t.userData.g; g.clearRect(0, 0, 512, 140); g.fillStyle = "rgba(8,18,32,.9)"; g.fillRect(0, 0, 512, 140); g.strokeStyle = "#36d6ff"; g.lineWidth = 4; g.strokeRect(2, 2, 508, 136); g.fillStyle = "#fff"; g.font = "700 46px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("Bed " + (k + 1), 22, 46); g.font = "600 30px system-ui,sans-serif"; g.fillStyle = "#9fd8ff"; g.fillText(sub.length > 24 ? sub.slice(0, 23) + "…" : sub, 22, 98); g.fillStyle = statusCol(st); g.beginPath(); g.arc(466, 70, 22, 0, 7); g.fill(); t.needsUpdate = true; }; t.userData.draw(title0(k), PAT[k].n, PAT[k].st); return t; };
const title0 = (k) => k;

function makeBay(i) {
  const row = i < 3 ? -1 : 1, c = XS[i % 3], g = new T.Group();
  g.position.set(c, 0, row * CORR / 2); g.rotation.y = row < 0 ? 0 : Math.PI; hall.add(g);
  const P = PAT[i], cub = { i, g, c, row, p: P, st: P.st, vit: { hr: 84 + i * 3, sbp: 118, dbp: 74, spo2: 96, rr: 16, alive: true, map: 89 } };
  /* glass: partitions each side, front panels leaving a doorway, header band with the bed sign */
  [-CW / 2, CW / 2].forEach((x) => { const p = mesh(new T.PlaneGeometry(DEPTH, 3.0), mGlass, x, 1.5, -DEPTH / 2, g); p.rotation.y = Math.PI / 2; bx(0.05, 3.05, 0.05, mMetal, x, 1.52, 0, g); bx(0.04, 0.04, DEPTH, mMetal, x, 3.0, -DEPTH / 2, g); });
  [[-1, 1.2], [1, 1.2]].forEach(([s]) => { const w = (CW - 2.2) / 2, p = mesh(new T.PlaneGeometry(w, 3.0), mGlass, s * (1.1 + w / 2), 1.5, 0.0, g); void p; bx(0.04, 3.0, 0.04, mMetal, s * 1.1, 1.5, 0, g); });
  bx(CW, 0.5, 0.06, mDark, 0, 3.15, 0, g);
  c_label(cub);
  /* head wall unit */
  bx(2.6, 0.9, 0.06, mDark, -0.2, 1.45, -DEPTH + 0.04, g); bx(2.6, 0.03, 0.02, cyan, -0.2, 1.92, -DEPTH + 0.08, g);
  /* bed */
  const bd = new T.Group(); bd.position.set(0.05, 0, -2.0); g.add(bd); cub.bed = bd;
  const bedX = buildBed(T, { M, rb, bx, cyl, mesh, ctex, rnd, V, onBack, TH, LB, mMetal, mDark, env, fabric });
  [bedX.frame, bedX.mattress, bedX.rails, bedX.pillow, bedX.sheetG].forEach((o) => bd.add(o)); cub.bedX = bedX;
  /* monitor on a wall arm, IV pole with pump and bag, ventilator cart */
  const mp = monitorPainter(i); cub.mp = mp; monList.push(cub);
  bx(0.7, 0.46, 0.05, mDark, -0.9, 1.7, -DEPTH + 0.35, g);
  const scr = mesh(new T.PlaneGeometry(0.64, 0.4), new T.MeshBasicMaterial({ map: mp.tex, toneMapped: false }), -0.9, 1.7, -DEPTH + 0.378, g); cub.scr = scr;
  bx(0.05, 0.05, 0.3, mMetal, -0.9, 1.7, -DEPTH + 0.2, g);
  cyl(0.012, 0.012, 2.0, mMetal, -1.45, 1.0, -1.15, g, 8); cyl(0.12, 0.12, 0.02, mDark, -1.45, 0.01, -1.15, g, 12);
  rb(0.28, 0.2, 0.18, 0.02, mWhite, -1.45, 1.2, -1.15, g); mesh(new T.PlaneGeometry(0.18, 0.08), E(0x3dff9a, 1.2), -1.45, 1.22, -1.05, g);
  rb(0.16, 0.26, 0.04, 0.02, M(0xdff3ff, { transparent: true, opacity: 0.8, roughness: 0.1 }), -1.45, 1.78, -1.15, g);
  rb(0.5, 0.9, 0.45, 0.03, mWhite, -1.9, 0.5, -3.1, g); mesh(new T.PlaneGeometry(0.36, 0.22), E(0x2a8fd0, 1.0), -1.9, 0.86, -2.87, g); cyl(0.2, 0.2, 0.05, mDark, -1.9, 0.03, -3.1, g, 12);
  BAYS.push(cub);
  return cub;
}
function c_label(cub) {
  const t = labelTex(cub.i); cub.lab = t;
  const m = mesh(new T.PlaneGeometry(1.9, 0.52), new T.MeshBasicMaterial({ map: t, toneMapped: false }), 0, 3.15, 0.04, cub.g);
  const m2 = m.clone(); m2.position.z = -0.04; m2.rotation.y = Math.PI; cub.g.add(m2);
}
for (let i = 0; i < 6; i++) makeBay(i);

/* patients, loaded after the first frame */
const skins = [0xb98262, 0xa9714f, 0xc28e68, 0xb07a58, 0xc69773, 0x9f6a49];
function seatPatient(cub, sex, age) {
  const f = patientFile({ hx: age + sex.toUpperCase(), sx: sex }), url = new URL("./patients/" + f.key + ".glb", import.meta.url).href;
  return loadArchetype(url).then((gltf) => {
    if (cub.human) { cub.bed.remove(cub.human.group); }
    const h = buildPerson(T, gltf, { sx: sex }, { skin: skins[cub.i % 6], hair: age > 60 ? 0x9a9a9a : 0x15110f, longHair: sex === "f", incline: TH, pose: cub.i });
    cub.bed.add(h.group); h.group.userData.part = "Patient";
    h.group.scale.setScalar(sex === "m" ? 1.1 : 1.04); cub.bed.updateMatrixWorld(true);
    const bedPos = (o) => cub.bed.worldToLocal(o.getWorldPosition(new V()));
    h.group.position.set(0, 0, 0); h.group.updateMatrixWorld(true);
    const hip = bedPos(h.B("spine05")), want = onBack(0.1, cub.bedX.SB + 0.115); h.group.position.copy(want).sub(hip); h.group.position.z = 0; h.group.updateMatrixWorld(true);
    try {
      const hp = bedPos(h.B("spine05")), thL = bedPos(h.B("upperleg02.L")), kn = bedPos(h.B("lowerleg01.L")), an = bedPos(h.B("lowerleg02.L")), lz = Math.abs(thL.z) || 0.11;
      const pts = [[hp.x, hp.y + 0.02, 0.13], [(hp.x + kn.x) / 2, (hp.y + kn.y) / 2 + 0.025, 0.115], [kn.x, kn.y + 0.02, 0.09], [an.x, an.y + 0.015, 0.066]];
      cub.bedX.setLegs([{ z: lz, pts }, { z: -lz, pts }], -0.02, an.x + 0.03);
    } catch (e) { /* the sheet stays flat */ }
    cub.human = h;
  }).catch((e) => console.warn("patient body not loaded", e));
}
let seatI = 0; const seatNext = () => { if (seatI >= 6) return; const i = seatI++, P = PAT[i]; seatPatient(BAYS[i], P.sex, P.age).then(seatNext); };

/* ---------------------------------------------------------------- ICU Command board */
const board = ctex(512, 640, () => {}); { const m = mesh(new T.PlaneGeometry(3.0, 3.75), new T.MeshBasicMaterial({ map: board, toneMapped: false }), HL - 0.06, 1.95, 0, hall); m.rotation.y = -Math.PI / 2; }
function paintBoard() {
  const g = board.userData.g; g.fillStyle = "#06111f"; g.fillRect(0, 0, 512, 640); g.strokeStyle = "#36d6ff"; g.lineWidth = 6; g.strokeRect(4, 4, 504, 632);
  g.fillStyle = "#36d6ff"; g.font = "800 46px system-ui,sans-serif"; g.textAlign = "left"; g.fillText("ICU COMMAND", 28, 70);
  const alerts = BAYS.filter((b) => b.st > 1).length, vent = 3, docs = [{ name: myName, spec: mySpec, me: true }].concat(net ? net.peers().map((p) => ({ name: p.name, spec: p.spec, on: p.connected })) : []);
  const row = (y, a, b, col) => { g.fillStyle = "#9fd8ff"; g.font = "600 30px system-ui,sans-serif"; g.fillText(a, 28, y); g.fillStyle = col || "#fff"; g.font = "800 44px system-ui,sans-serif"; g.textAlign = "right"; g.fillText(b, 484, y + 4); g.textAlign = "left"; };
  row(130, "Beds occupied", "6/6"); row(190, "Alerts", String(alerts), alerts ? "#ff6b6b" : "#3dff9a"); row(250, "Ventilators", vent + "/6"); row(310, "Doctors on duty", String(docs.length), "#3dff9a");
  g.font = "600 26px system-ui,sans-serif"; docs.slice(0, 6).forEach((d, k) => { g.fillStyle = d.on === false ? "#667" : "#3dff9a"; g.beginPath(); g.arc(40, 370 + k * 44 - 8, 8, 0, 7); g.fill(); g.fillStyle = "#e6f3ff"; const nm = (d.name || "Doctor") + (d.me ? " (you)" : ""); g.fillText((nm.length > 18 ? nm.slice(0, 17) + "…" : nm) + " · " + specInfo(d.spec)[0].split(" ")[0], 62, 370 + k * 44); });
  board.needsUpdate = true;
}

/* ---------------------------------------------------------------- movement */
const SPAWN = new V(-8.4, 0, ((hashN(myId) % 5) - 2) * 0.6);
const me = { x: SPAWN.x, z: SPAWN.z, yaw: Math.PI / 2 };
const bayOf = (x) => clamp(Math.round(x / CW), -1, 1);
function clampPos(x, z) {
  x = clamp(x, -HL + 0.6, HL - 0.7); z = clamp(z, -HW + 0.5, HW - 0.5);
  const d = Math.abs(z) - CORR / 2;
  if (d > 0) {
    const c = bayOf(x) * CW;
    if (d < 0.2 && Math.abs(x - c) > 1.05) z = Math.sign(z) * (CORR / 2 - 0.02);
    else { x = clamp(x, c - CW / 2 + 0.35, c + CW / 2 - 0.35); z = Math.sign(z) * (CORR / 2 + Math.min(d, 1.3)); }
  }
  return [x, z];
}
function walkBy(d) { const nx = me.x + Math.sin(me.yaw) * d, nz = me.z - Math.cos(me.yaw) * d, c = clampPos(nx, nz); me.x = c[0]; me.z = c[1]; }

let dn = 0, mvd = 0, lx = 0, ly = 0, holdDir = 0, lastV = 0;
cv.addEventListener("pointerdown", (e) => { dn = 1; mvd = 0; lx = e.clientX; ly = e.clientY; holdDir = 0; sfx.unlock(); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } });
cv.addEventListener("pointermove", (e) => {
  if (!dn) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; mvd += Math.abs(dx) + Math.abs(dy);
  me.yaw -= dx * 0.006;
  if (Math.abs(dy) >= Math.abs(dx) * 0.5) { walkBy(-dy * 0.014); if (Math.abs(dy) >= 1) { holdDir = dy < 0 ? 1 : -1; lastV = performance.now(); } }
});
const stopHold = () => { dn = 0; holdDir = 0; };
cv.addEventListener("pointercancel", stopHold); cv.addEventListener("lostpointercapture", () => { holdDir = 0; }); addEventListener("blur", stopHold);
cv.addEventListener("pointerup", (e) => { const was = mvd; stopHold(); if (was > 8) return; tapAt(e.clientX, e.clientY); });

/* ---------------------------------------------------------------- doctors */
const remotes = new Map();            // sid -> { doc, x, z, yaw, tx, tz, ty, last, info }
const ray = new T.Raycaster(), ndc = new T.Vector2(); let bodyReady = {};
function remoteFor(p) {
  let r = remotes.get(p.sid); if (r) return r;
  r = { sid: p.sid, doc: null, x: -8.8, z: 0, yaw: Math.PI / 2, tx: -8.8, tz: 0, ty: Math.PI / 2, last: performance.now(), info: p, bed: -1, seen: false };
  remotes.set(p.sid, r);
  const sex = p.sex === "f" ? "f" : "m";
  loadDoctorBody(sex).then((gltf) => { if (!remotes.has(p.sid)) return; r.doc = createDoctor(T, gltf, { name: r.info.name, spec: r.info.spec, sex }); r.doc.group.visible = r.seen; r.doc.group.userData.sid = p.sid; S.add(r.doc.group); }).catch((e) => console.warn("doctor body not loaded", e));
  return r;
}
let net = null, peerList = [];
function startNet() {
  const sigFactory = Q.get("net") === "local" ? localSignal : ntfySignal;
  if (code === "SOLO" && Q.get("net") !== "local") { return; }
  net = createHallNet({
    code, id: myId, name: myName, spec: mySpec, sex: mySex, signal: sigFactory, iceServers: Q.get("ice") === "none" ? [] : undefined,
    onPeers: (list) => { peerList = list; list.forEach((p) => { const r = remoteFor(p); r.info = p; }); chips(); },
    onPeerState: (p, st) => { const r = remoteFor(p); r.tx = st.x; r.tz = st.z; r.ty = st.y; r.bed = st.bed; r.last = performance.now(); if (!r.seen) { r.seen = true; r.x = st.x; r.z = st.z; r.yaw = st.y; if (r.doc) r.doc.group.visible = true; } },
    onPeerLeave: (p) => { const r = remotes.get(p.sid); if (r) { if (r.doc) S.remove(r.doc.group); remotes.delete(p.sid); } chips(); },
  });
}
function chips() {
  const el = $("#team"); if (!el) return;
  const mem = mdt.members || [];
  const you = `<span class="chip me"><i></i>${esc(myName)} · ${esc(specInfo(mySpec)[0])}</span>`;
  const others = peerList.map((p) => `<span class="chip ${p.connected ? "on" : ""}"><i></i>${esc(p.name || "Doctor")} · ${esc(specInfo(p.spec)[0])}</span>`).join("");
  const seen = new Set(peerList.map((p) => p.id)); seen.add(myId);
  const away = mem.filter((m) => !seen.has(m.userId)).map((m) => `<span class="chip off"><i></i>${esc(m.name)} · ${esc(specInfo(m.specialty)[0])}</span>`).join("");
  el.innerHTML = you + others + away;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------------------------------------------------------- tap: bed, monitor or doctor */
function tapAt(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
  const docs = []; remotes.forEach((r) => { if (r.doc && r.doc.group.visible) docs.push(r.doc.group); });
  const hd = ray.intersectObjects(docs, true)[0];
  if (hd) { let o = hd.object; while (o && !o.userData.sid) o = o.parent; const r = o && remotes.get(o.userData.sid); if (r) { card(`<b>Dr ${esc(r.info.name)}</b><span>${esc(specInfo(r.info.spec)[0])}${r.bed >= 0 ? " · at Bed " + (r.bed + 1) : " · in the hall"}</span>`); return; } }
  const bedMeshes = BAYS.map((b) => b.bed), hb = ray.intersectObjects(bedMeshes.concat(BAYS.map((b) => b.scr)), true)[0];
  if (hb) { let o = hb.object; while (o) { const b = BAYS.find((q) => q.bed === o || q.scr === o); if (b) { bedCard(b); return; } o = o.parent; } }
}
function bedCard(b) {
  const v = b.vit; let extra = "";
  if (b.i === 0 && mdt.scenario) extra = `<span>${esc(mdt.scenario.name)}, ${mdt.scenario.age} · ${esc(mdt.scenario.dx || "")}</span>`;
  card(`<b>Bed ${b.i + 1}${b.i === 0 && mdt.scenario ? " · the team's patient" : " · " + esc(PAT[b.i].n)}</b>${extra}<span>HR ${Math.round(v.hr)} · BP ${Math.round(v.sbp)}/${Math.round(v.dbp)} · SpO₂ ${Math.round(v.spo2)} · RR ${Math.round(v.rr)}</span>${b.i === 0 ? '<button id="orders">Open orders</button>' : ""}`);
  const o = $("#orders"); if (o) o.onclick = () => parent.postMessage({ type: "hall-close" }, "*");
}
let cardT = 0;
function card(html) { const c = $("#card"); c.innerHTML = html; c.hidden = false; clearTimeout(cardT); cardT = setTimeout(() => { c.hidden = true; }, 7000); }

/* ---------------------------------------------------------------- team state from the Team room */
addEventListener("message", (e) => {
  const d = e.data; if (!d || d.type !== "mdt-state") return;
  mdt.patient = d.patient || null; mdt.scenario = d.scenario || null; mdt.members = d.members || []; mdt.you = d.you || null; applyMdt(); chips();
});
let mdtSex = null;
function applyMdt() {
  const b = BAYS[0], p = mdt.patient, sc = mdt.scenario; if (!p || !sc) return;
  b.vit = { hr: p.hr, sbp: p.sbp, dbp: p.dbp, spo2: p.spo2, rr: p.rr, alive: p.alive !== false, map: p.map };
  b.st = !p.alive ? 2 : (p.map < 60 || p.spo2 < 88) ? 2 : (p.map < 70 || p.spo2 < 93 || p.hr > 120) ? 1 : 0;
  PAT[0].n = sc.dx || PAT[0].n; PAT[0].st = b.st;
  b.lab.userData.draw(0, PAT[0].n, b.st);
  const sx = sc.sex === "woman" ? "f" : "m";
  if (mdtSex !== sx) { mdtSex = sx; PAT[0].sex = sx; PAT[0].age = sc.age || 50; if (seatI > 0) seatPatient(b, sx, sc.age || 50); }
}
parent !== window && parent.postMessage({ type: "hall-ready" }, "*");

/* ---------------------------------------------------------------- sounds: the team's patient beeps as you walk past */
const sfx = createSfx();
let nextBeep = 0;
function sounds(now) {
  if (!sfx.isOn || !sfx.isOn()) return;
  sfx.setListener(me.x, me.z, me.yaw);
  if (now < nextBeep) return;
  const b = BAYS[0], pos = { x: b.c - 0.9, z: b.row * (CORR / 2 + 3) };
  sfx.beep({ f: [880, 1046, 1175][b.st || 0], vol: 0.8, pos }); nextBeep = now + 60000 / Math.max(40, b.vit.hr);
}

/* ---------------------------------------------------------------- loop */
let last = 0, bobT = 0, sendT = 0, mvSpeed = 0, px = me.x, pz = me.z, boardT = 0, monT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (t - last < 1000 / 40) return; const dt = Math.min((t - last) / 1000, 0.1); last = t;
  if (dn && holdDir && mvd > 10 && performance.now() - lastV > 120) walkBy(holdDir * dt * 1.7);
  const sp = Math.hypot(me.x - px, me.z - pz) / Math.max(dt, 0.001); mvSpeed += (sp - mvSpeed) * Math.min(1, dt * 8); px = me.x; pz = me.z;
  bobT += mvSpeed * dt * 2.2; const bob = Math.sin(bobT * 3.0) * 0.016 * Math.min(1, mvSpeed);
  cam.position.set(me.x, 1.6 + bob, me.z); cam.rotation.order = "YXZ"; cam.rotation.set(0, -me.yaw, 0);   // yaw 0 faces -z
  if (monT += dt, monT > 0.1) { monT = 0; monList.forEach((b) => { if (Math.abs(b.g.position.x - me.x) < 12) b.mp.paint(t / 1000 + b.i, b.vit); }); }
  /* nearest bed the doctor stands beside */
  let bedNear = -1; BAYS.forEach((b) => { const d = Math.hypot(b.c - me.x, b.row * (CORR / 2 + 2) - me.z); if (d < 2.7) bedNear = b.i; });
  if ((sendT += dt) > 0.1) { sendT = 0; if (net) net.send({ x: +me.x.toFixed(2), z: +me.z.toFixed(2), y: +me.yaw.toFixed(3), a: mvSpeed > 0.15 ? 1 : 0, bed: bedNear }); }
  remotes.forEach((r) => {
    if (!r.doc) return;
    const k = Math.min(1, dt * 9), ox = r.x, oz = r.z; r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k;
    let dy = r.ty - r.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); r.yaw += dy * k;
    const v = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 0.001); r.doc.setMoving(Math.min(1, v / 1.6));
    r.doc.group.position.set(r.x, 0, r.z); r.doc.group.rotation.y = Math.PI - r.yaw; r.doc.update(dt);
    if (performance.now() - r.last > 15000 && r.info && !r.info.connected) r.doc.group.visible = false;
  });
  if (boardT += dt, boardT > 1) { boardT = 0; paintBoard(); }
  sounds(t);
  R.render(S, cam);
}
requestAnimationFrame(loop);

/* ---------------------------------------------------------------- start */
$("#back").onclick = () => { if (net) net.close(); parent !== window ? parent.postMessage({ type: "hall-close" }, "*") : history.back(); };
$("#me").textContent = myName + " · " + specInfo(mySpec)[0];
chips(); paintBoard(); startNet();
setTimeout(seatNext, 400);
window.__hall = { me, cam, remotes, BAYS, net: () => net, peers: () => peerList, S };
