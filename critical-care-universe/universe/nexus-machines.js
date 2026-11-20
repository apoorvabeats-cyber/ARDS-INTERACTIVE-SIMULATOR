/* Pictures of the machines on the Treatment page: a ventilator (invasive), a non-invasive ventilator with a mask, a CRRT machine and an
   intermittent haemodialysis machine. They are drawn on a canvas and move: the ventilator's waveforms scroll with the set rate, the pump
   rollers turn only while the machine is running, and the blood and dialysate lines show their flow.
   paintMachine(canvas, kind, st, t)   kind: "vent" | "niv" | "crrt" | "ihd"
   st: { running, rr, vt, peep, fio2, ipap, epap, bf, df, rf, uf }    t: seconds */
const TAU = Math.PI * 2;
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const lg = (g, x0, y0, x1, y1, stops) => { const k = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => k.addColorStop(s[0], s[1])); return k; };
const mono = (px, w) => (w || 700) + " " + px + "px ui-monospace,Menlo,Consolas,monospace";
const sans = (px, w) => (w || 600) + " " + px + "px system-ui,-apple-system,'Segoe UI',sans-serif";

function body(g, x, y, w, h, tone) {
  g.save(); g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 18; g.shadowOffsetY = 8;
  g.fillStyle = lg(g, x, y, x + w, y + h, tone || [[0, "#3a4b5a"], [0.5, "#26343f"], [1, "#18222b"]]); rr(g, x, y, w, h, 18); g.fill(); g.restore();
  g.strokeStyle = "rgba(160,215,240,.35)"; g.lineWidth = 2; rr(g, x + 1, y + 1, w - 2, h - 2, 18); g.stroke();
}
function screen(g, x, y, w, h) {
  g.fillStyle = "#02080d"; rr(g, x - 5, y - 5, w + 10, h + 10, 12); g.fill();
  g.fillStyle = "#041621"; rr(g, x, y, w, h, 8); g.fill();
  g.strokeStyle = "rgba(95,227,255,.10)"; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(x, y + h * i / 8); g.lineTo(x + w, y + h * i / 8); g.stroke(); }
}
function wheels(g, x0, x1, y) { [x0, x1].forEach((x) => { g.fillStyle = "#0b1218"; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); g.strokeStyle = "#5c6d7a"; g.lineWidth = 3; g.stroke(); g.fillStyle = "#2a3743"; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }); }
function knob(g, x, y, r, a) { g.fillStyle = lg(g, x - r, y - r, x + r, y + r, [[0, "#8ea2b0"], [1, "#2b3945"]]); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = "#0c1319"; g.lineWidth = 2; g.stroke(); g.strokeStyle = "#e9fbff"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); g.stroke(); }
function hose(g, pts, col, w, flow, t, run) {
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = w + 4; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  if (!flow) return;
  g.save(); g.setLineDash([2, 16]); g.lineDashOffset = run ? -t * 40 * flow : 0; g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = Math.max(2, w * 0.35); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.restore();
}
function trace(g, x, y, w, h, col, fn, t, speed) {
  g.strokeStyle = col; g.lineWidth = 2.2; g.shadowColor = col; g.shadowBlur = 6; g.beginPath();
  for (let i = 0; i <= w; i += 2) { const v = fn((i / w) * 4 + t * speed); i ? g.lineTo(x + i, y + h * (1 - v)) : g.moveTo(x + i, y + h * (1 - v)); }
  g.stroke(); g.shadowBlur = 0;
}
const cyc = (f) => ((f % 1) + 1) % 1;

function vent(g, W, H, st, t) {
  const run = st.running, per = 60 / Math.max(8, st.rr || 14);
  g.clearRect(0, 0, W, H);
  const bx = W * 0.32, bw = W * 0.64;
  g.fillStyle = "#26323d"; rr(g, bx + bw * 0.46, H * 0.74, bw * 0.08, H * 0.17, 4); g.fill(); g.fillStyle = "#1b252e"; rr(g, bx + bw * 0.12, H * 0.9, bw * 0.76, 10, 5); g.fill(); wheels(g, bx + bw * 0.18, bx + bw * 0.82, H * 0.965);
  body(g, bx, H * 0.04, bw, H * 0.7);
  const sx = bx + bw * 0.04, sy = H * 0.08, sw = bw * 0.92, sh = H * 0.42; screen(g, sx, sy, sw, sh);
  g.fillStyle = "#7fe9ff"; g.font = sans(12, 700); g.fillText(run ? "VC-AC · invasive" : "STANDBY", sx + 10, sy + 18); g.fillStyle = run ? "#3dff9a" : "#ffc24a"; g.beginPath(); g.arc(sx + sw - 14, sy + 14, 6, 0, TAU); g.fill();
  const wx = sx + 8, ww = sw * 0.64, wh = sh * 0.24, insp = 0.33;
  const pf = (f) => (f < insp ? Math.min(1, f / 0.1) * 0.78 + 0.1 : f < insp + 0.04 ? 0.78 - (f - insp) * 12 : 0.28 * Math.exp(-(f - insp) * 5) + 0.12);
  const vf = (f) => (f < insp ? 0.12 + 0.78 * (f / insp) : 0.12 + 0.78 * Math.exp(-(f - insp) * 6));
  const fl = (f) => (f < insp ? 0.8 : f < insp + 0.03 ? 0.5 : 0.5 - 0.4 * Math.exp(-(f - insp) * 9));
  [["Paw", "#ffd84a", pf], ["Flow", "#48d9ff", fl], ["Vol", "#3dff9a", vf]].forEach((l, k) => { const y = sy + 26 + k * (wh + 7); g.fillStyle = "rgba(95,227,255,.06)"; g.fillRect(wx, y, ww, wh); g.fillStyle = l[1]; g.font = sans(10, 700); g.fillText(l[0], wx + 4, y + 11); g.save(); g.beginPath(); g.rect(wx, y, ww, wh); g.clip();
    trace(g, wx, y + 2, ww, wh - 4, l[1], (u) => (run ? l[2](cyc(u)) : 0.1), t, 1 / per); g.restore(); });
  const nx = wx + ww + 12;
  [["Ppeak", run ? String(Math.round((st.peep || 8) + 16 + Math.sin(t) * 0.6)) : "--", "#ffd84a"], ["PEEP", String(st.peep || 8), "#ffd84a"], ["Vte", run ? String(Math.round((st.vt || 420) + Math.sin(t * 1.3) * 6)) : "--", "#3dff9a"], ["RR", String(st.rr || 14), "#48d9ff"], ["FiO₂", Math.round((st.fio2 || 0.4) * 100) + "%", "#e9fbff"]].forEach((r, i) => {
    g.fillStyle = "#7d95a1"; g.font = sans(9, 600); g.fillText(r[0], nx, sy + 40 + i * 25); g.fillStyle = r[2]; g.font = mono(15, 700); g.fillText(r[1], nx + 38, sy + 40 + i * 25); });
  knob(g, bx + bw * 0.86, H * 0.64, 20, (run ? t * 0.4 : 0) + 0.7);
  ["Mode", "Alarms", "Hold", "Insp", "Menu"].forEach((n, i) => { g.fillStyle = i === 0 ? "#2b8fb5" : "#2c3b47"; rr(g, bx + bw * 0.05 + i * 44, H * 0.565, 40, 18, 5); g.fill(); g.fillStyle = "#cfe9f3"; g.font = sans(9, 600); g.fillText(n, bx + bw * 0.05 + i * 44 + 5, H * 0.565 + 12); });
  g.fillStyle = "#7d95a1"; g.font = sans(10, 600); g.fillText("Medical Nexus V-1", bx + bw * 0.06, H * 0.69);
  const p1 = [bx + bw * 0.14, H * 0.8], p2 = [bx + bw * 0.3, H * 0.8];
  g.fillStyle = "#3c8fd0"; g.beginPath(); g.arc(p1[0], p1[1], 10, 0, TAU); g.fill(); g.fillStyle = "#cfd8de"; g.beginPath(); g.arc(p2[0], p2[1], 10, 0, TAU); g.fill();
  g.fillStyle = "#7d95a1"; g.font = sans(9, 600); g.fillText("insp", p1[0] - 9, p1[1] + 24); g.fillText("exp", p2[0] - 8, p2[1] + 24);
  const bre = run ? 0.5 + 0.5 * Math.sin(t / per * TAU) : 0.2, yx = W * 0.12, yy = H * 0.55;
  hose(g, [[p1[0], p1[1] + 4], [p1[0], H * 0.91], [yx + 10, H * 0.91], [yx + 10, yy]], "#7fb6e4", 8, 1, t, run);
  hose(g, [[p2[0], p2[1] + 4], [p2[0], H * 0.975], [yx - 12, H * 0.975], [yx - 12, yy + 4], [yx, yy]], "#cfd8de", 8, 1, t, run);
  hose(g, [[yx, yy], [yx, H * 0.32]], "#e9eef2", 9, 0, t, run);
  g.fillStyle = "rgba(95,227,255," + (0.18 + bre * 0.4) + ")"; g.beginPath(); g.ellipse(yx, H * 0.2, 24 + bre * 8, 30 + bre * 8, 0, 0, TAU); g.fill(); g.strokeStyle = "rgba(95,227,255,.85)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#cfe9f3"; g.font = sans(11, 600); g.fillText("lungs", yx - 16, H * 0.2 + 4); g.fillText("tube", yx + 14, H * 0.44);
}

function niv(g, W, H, st, t) {
  const run = st.running, per = 60 / Math.max(10, st.rr || 18);
  g.clearRect(0, 0, W, H);
  body(g, W * 0.46, H * 0.18, W * 0.5, H * 0.58, [[0, "#d7e0e6"], [0.5, "#b5c2cb"], [1, "#8d9ca7"]]);
  const sx = W * 0.5, sy = H * 0.23, sw = W * 0.42, sh = H * 0.3; screen(g, sx, sy, sw, sh);
  g.fillStyle = "#7fe9ff"; g.font = sans(12, 700); g.fillText(run ? "S/T · BiPAP" : "STANDBY", sx + 8, sy + 18);
  const insp = 0.4, pw = (f) => (f < 0.05 ? 0.3 + f * 6 : f < insp ? 0.78 : f < insp + 0.05 ? 0.78 - (f - insp) * 10 : 0.3);
  g.save(); g.beginPath(); g.rect(sx + 6, sy + 28, sw - 12, sh * 0.5); g.clip(); trace(g, sx + 6, sy + 30, sw - 12, sh * 0.48, "#ffd84a", (u) => (run ? pw(cyc(u)) : 0.3), t, 1 / per); g.restore();
  g.font = mono(15, 700); g.fillStyle = "#ffd84a"; g.fillText("IPAP " + (st.ipap || 14), sx + 8, sy + sh - 28); g.fillStyle = "#48d9ff"; g.fillText("EPAP " + (st.epap || 5), sx + 8, sy + sh - 8); g.fillStyle = "#3dff9a"; g.fillText("RR " + (st.rr || 18), sx + sw * 0.5, sy + sh - 8); g.fillStyle = "#e9fbff"; g.fillText("O₂ " + Math.round((st.fio2 || 0.4) * 100) + "%", sx + sw * 0.5, sy + sh - 28);
  knob(g, W * 0.7, H * 0.65, 18, t * 0.3 + 1); knob(g, W * 0.84, H * 0.65, 14, 2.2);
  g.fillStyle = "#6c7c88"; rr(g, W * 0.46, H * 0.76, W * 0.5, 12, 4); g.fill();
  /* the patient's face with the mask */
  g.fillStyle = "#e7c2ae"; g.beginPath(); g.ellipse(W * 0.2, H * 0.4, W * 0.115, H * 0.25, 0, 0, TAU); g.fill();
  g.fillStyle = "#c79e8a"; g.beginPath(); g.ellipse(W * 0.2, H * 0.4, W * 0.115, H * 0.25, 0, Math.PI * 0.2, Math.PI * 0.8); g.fill();
  g.fillStyle = "#5a3c2f"; g.beginPath(); g.arc(W * 0.17, H * 0.31, 4, 0, TAU); g.arc(W * 0.23, H * 0.31, 4, 0, TAU); g.fill();
  const lift = run ? 0.5 + 0.5 * Math.sin(t / per * TAU) : 0;
  g.fillStyle = "rgba(160,225,255,.55)"; g.strokeStyle = "#cfefff"; g.lineWidth = 3; g.beginPath(); g.moveTo(W * 0.2, H * 0.34); g.quadraticCurveTo(W * 0.31, H * 0.42, W * 0.27, H * 0.58 + lift * 2); g.quadraticCurveTo(W * 0.2, H * 0.64, W * 0.13, H * 0.58 + lift * 2); g.quadraticCurveTo(W * 0.09, H * 0.42, W * 0.2, H * 0.34); g.fill(); g.stroke();
  g.strokeStyle = "#2a8fc0"; g.lineWidth = 6; g.beginPath(); g.moveTo(W * 0.09, H * 0.4); g.quadraticCurveTo(W * 0.2, H * 0.2, W * 0.31, H * 0.4); g.stroke();
  g.fillStyle = "#2a8fc0"; g.beginPath(); g.arc(W * 0.2, H * 0.64, 9, 0, TAU); g.fill();
  hose(g, [[W * 0.2, H * 0.66], [W * 0.26, H * 0.86], [W * 0.5, H * 0.9], [W * 0.62, H * 0.78]], "#9fb3c0", 9, 1, t, run);
  g.fillStyle = "#cfe9f3"; g.font = sans(11, 600); g.fillText("full-face mask · leak port", W * 0.04, H * 0.97);
}

function crrt(g, W, H, st, t) {
  const run = st.running; g.clearRect(0, 0, W, H);
  const bag = (x, y, c, n, f) => { g.fillStyle = "#3a4650"; g.fillRect(x + 29, y - 14, 3, 16); g.fillStyle = "rgba(255,255,255,.14)"; rr(g, x, y, 62, 96, 9); g.fill(); g.strokeStyle = "rgba(220,235,245,.6)"; g.lineWidth = 2; g.stroke(); g.fillStyle = c; rr(g, x + 4, y + 92 - 88 * f, 54, 88 * f, 6); g.fill(); g.fillStyle = "#cfe9f3"; g.font = sans(9, 600); g.fillText(n, x, y + 110); };
  bag(W * 0.02, H * 0.1, "#e8c75a", "Dialysate", 0.8 - (run ? (t * 0.004) % 0.3 : 0)); bag(W * 0.17, H * 0.1, "#e8c75a", "Replacement", 0.66 - (run ? (t * 0.004) % 0.3 : 0)); bag(W * 0.02, H * 0.56, "#e7a24a", "Effluent", 0.22 + (run ? (t * 0.005) % 0.55 : 0));
  body(g, W * 0.32, H * 0.04, W * 0.38, H * 0.9, [[0, "#e3eaef"], [0.5, "#bcc8d1"], [1, "#8f9ea9"]]);
  const sx = W * 0.34, sy = H * 0.07, sw = W * 0.34, sh = H * 0.37; screen(g, sx, sy, sw, sh);
  g.fillStyle = "#7fe9ff"; g.font = sans(12, 700); g.fillText("CVVHDF", sx + 8, sy + 17); g.fillStyle = run ? "#3dff9a" : "#ffc24a"; g.fillText(run ? "RUNNING" : "STOPPED", sx + sw - 66, sy + 17);
  [["Blood flow", (st.bf || 200) + " mL/min", "#ff7b86"], ["Dialysate", (st.df || 1000) + " mL/h", "#ffd84a"], ["Replacement", (st.rf || 1000) + " mL/h", "#ffd84a"], ["Net UF", (st.uf || 100) + " mL/h", "#48d9ff"], ["Access P", run ? String(-80 - Math.round(Math.sin(t * 1.1) * 6)) : "--", "#e9fbff"], ["Return P", run ? String(110 + Math.round(Math.sin(t * 0.9) * 8)) : "--", "#e9fbff"], ["Filter ΔP", run ? String(30 + Math.round(Math.sin(t * 0.5) * 4)) : "--", "#3dff9a"]].forEach((r, i) => { const y = sy + 36 + i * 17; g.fillStyle = "#7d95a1"; g.font = sans(10, 600); g.fillText(r[0], sx + 8, y); g.fillStyle = r[2]; g.font = mono(11, 700); g.fillText(r[1], sx + sw * 0.5, y); });
  const PY = H * 0.57; [[0.4, "Replace", "#e8c75a"], [0.51, "Dialysate", "#e8c75a"], [0.62, "Blood", "#ff5468"]].forEach(([fx, n, c]) => { const px = W * fx, py = PY; g.fillStyle = "#2a3641"; g.beginPath(); g.arc(px, py, 22, 0, TAU); g.fill(); g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.arc(px, py, 22, 0, TAU); g.stroke();
    for (let k = 0; k < 3; k++) { const a = (run ? t * 3.2 : 0) + k * TAU / 3; g.fillStyle = "#cfe0ea"; g.beginPath(); g.arc(px + Math.cos(a) * 11, py + Math.sin(a) * 11, 5, 0, TAU); g.fill(); } g.fillStyle = "#16202a"; g.font = sans(9, 700); g.fillText(n, px - 17, py + 38); });
  const fx = W * 0.51, fy = H * 0.72; g.fillStyle = "#f2f6f9"; rr(g, fx - 15, fy, 30, 90, 13); g.fill(); g.strokeStyle = "#7a8a96"; g.lineWidth = 2; g.stroke(); g.fillStyle = "rgba(255,84,104,.55)"; rr(g, fx - 9, fy + 8, 18, 74, 8); g.fill();
  hose(g, [[W * 0.97, H * 0.15], [W * 0.8, H * 0.15], [W * 0.8, PY], [W * 0.62 + 22, PY]], "#d9364a", 6, 1, t, run);
  hose(g, [[W * 0.62, PY + 22], [W * 0.62, H * 0.66], [fx + 6, fy + 2]], "#d9364a", 6, 1, t, run);
  hose(g, [[fx, fy + 90], [fx, H * 0.97], [W * 0.9, H * 0.97], [W * 0.9, H * 0.3], [W * 0.97, H * 0.26]], "#3a7fd0", 6, 1, t, run);
  hose(g, [[W * 0.08, H * 0.38], [W * 0.08, H * 0.47], [W * 0.51, H * 0.47], [W * 0.51, PY - 22]], "#e8c75a", 4, 1, t, run);
  hose(g, [[W * 0.23, H * 0.38], [W * 0.23, PY], [W * 0.4 - 22, PY]], "#e8c75a", 4, 1, t, run);
  hose(g, [[fx - 8, fy + 60], [W * 0.1, fy + 60], [W * 0.1, H * 0.56 + 96]], "#e7a24a", 4, 1, t, run);
  g.fillStyle = "#cfe9f3"; g.font = sans(10, 600); g.fillText("patient", W * 0.9, H * 0.1); g.fillText("access ▸", W * 0.84, H * 0.135); g.fillText("◂ return", W * 0.83, H * 0.215);
  wheels(g, W * 0.38, W * 0.64, H * 0.975);
}

function ihd(g, W, H, st, t) {
  const run = st.running; g.clearRect(0, 0, W, H);
  body(g, W * 0.06, H * 0.08, W * 0.52, H * 0.82, [[0, "#e3eaef"], [0.5, "#bcc8d1"], [1, "#8f9ea9"]]);
  const sx = W * 0.09, sy = H * 0.12, sw = W * 0.46, sh = H * 0.34; screen(g, sx, sy, sw, sh);
  g.fillStyle = "#7fe9ff"; g.font = sans(12, 700); g.fillText("HAEMODIALYSIS · 4 h", sx + 8, sy + 17);
  [["Blood flow", (st.bf || 300) + " mL/min"], ["Dialysate flow", "500 mL/min"], ["UF rate", (st.uf || 400) + " mL/h"], ["Venous P", run ? String(120 + Math.round(Math.sin(t) * 6)) : "--"], ["Conductivity", "14.0 mS/cm"]].forEach((r, i) => { g.fillStyle = "#7d95a1"; g.font = sans(10, 600); g.fillText(r[0], sx + 8, sy + 40 + i * 19); g.fillStyle = "#3dff9a"; g.font = mono(11, 700); g.fillText(r[1], sx + sw * 0.5, sy + 40 + i * 19); });
  knob(g, W * 0.2, H * 0.66, 20, (run ? t * 0.3 : 0) + 1); ["Start", "Stop", "Bolus"].forEach((n, i) => { g.fillStyle = i === 0 ? "#2b8f6a" : i === 1 ? "#a8434f" : "#2c3b47"; rr(g, W * 0.3 + i * 52, H * 0.63, 46, 22, 6); g.fill(); g.fillStyle = "#fff"; g.font = sans(10, 700); g.fillText(n, W * 0.3 + i * 52 + 7, H * 0.63 + 15); });
  g.fillStyle = "#6c7c88"; rr(g, W * 0.1, H * 0.76, W * 0.44, 10, 4); g.fill(); g.fillStyle = "#7d95a1"; g.font = sans(10, 600); g.fillText("dialysate in / out", W * 0.1, H * 0.84);
  const dx = W * 0.8, dy = H * 0.2, dh = H * 0.42, py = H * 0.78;
  g.fillStyle = "#5c6d7a"; rr(g, dx - 4, dy - 8, 8, dh + 30, 3); g.fill(); g.fillStyle = "#f2f6f9"; rr(g, dx - 20, dy, 40, dh, 16); g.fill(); g.strokeStyle = "#7a8a96"; g.lineWidth = 2; g.stroke(); g.fillStyle = "rgba(255,84,104,.5)"; rr(g, dx - 13, dy + 12, 26, dh - 24, 11); g.fill();
  g.fillStyle = "#2a3641"; g.beginPath(); g.arc(dx, py, 24, 0, TAU); g.fill(); g.strokeStyle = "#ff5468"; g.lineWidth = 4; g.stroke();
  for (let k = 0; k < 2; k++) { const a = (run ? t * 3 : 0) + k * Math.PI; g.fillStyle = "#cfe0ea"; g.beginPath(); g.arc(dx + Math.cos(a) * 13, py + Math.sin(a) * 13, 6, 0, TAU); g.fill(); }
  g.fillStyle = "#cfe9f3"; g.font = sans(9, 700); g.fillText("Blood pump", dx - 30, py + 42); g.fillText("dialyser", dx - 20, dy - 14);
  hose(g, [[W * 0.97, H * 0.93], [dx, H * 0.93], [dx, py + 24]], "#d9364a", 6, 1, t, run);
  hose(g, [[dx, py - 24], [dx, dy + dh]], "#d9364a", 6, 1, t, run);
  hose(g, [[dx, dy], [dx, H * 0.09], [W * 0.97, H * 0.09]], "#3a7fd0", 6, 1, t, run);
  hose(g, [[W * 0.58, H * 0.5], [dx - 20, H * 0.5]], "#e8c75a", 4, 1, t, run);
  hose(g, [[dx + 20, dy + 28], [W * 0.93, dy + 28], [W * 0.93, H * 0.6], [W * 0.58, H * 0.6]], "#e7a24a", 4, 1, t, run);
  g.fillStyle = "#cfe9f3"; g.font = sans(10, 600); g.fillText("return to patient ▸", W * 0.7, H * 0.06); g.fillText("◂ from patient (catheter)", W * 0.6, H * 0.985);
  wheels(g, W * 0.14, W * 0.5, H * 0.945);
}

export function paintMachine(cv, kind, st, t) {
  const g = cv.getContext("2d"), W = cv.width, H = cv.height;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#06141f"; g.fillRect(0, 0, W, H);
  const bg = g.createRadialGradient(W / 2, H * 0.5, 10, W / 2, H * 0.5, W * 0.7); bg.addColorStop(0, "rgba(40,120,170,.28)"); bg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.restore(); g.save();
  ({ vent, niv, crrt, ihd }[kind] || vent)(g, W, H, st || {}, t || 0);
  g.restore();
}
