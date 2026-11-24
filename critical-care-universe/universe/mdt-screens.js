/* What the MDT chamber's screens show. Pure canvas painters: they take a plain data object and draw, nothing else.
   d = { P, SC, blind, disp, feed, unseen, chat, hist, eq, live }.  blind = the diagnosis is not shown until the case ends.
   Hero displays on the far wall:  paintAvail (information that has come back), paintPresent (the patient presentation), paintDiscuss (the team talking).
   Doctor stations:  paintConsole (a doctor's own sloped screen, with the tab they have open) and paintPlacard (the name plate).  */
const TAU = Math.PI * 2;
const C = { cy: "#5fe3ff", cy2: "#9ff0ff", ink: "#eaf8ff", mut: "#8fb6c9", ok: "#3dff9a", warn: "#ffc24a", bad: "#ff5468", pn: "rgba(5,22,38,.82)" };
const F = (px, wt) => (wt || 600) + " " + px + "px system-ui,-apple-system,Segoe UI,sans-serif", MONO = (px) => "700 " + px + "px ui-monospace,Menlo,Consolas,monospace";
export const TAB_LABEL = { history: "History", diagnosis: "Reasoning", vitals: "Vitals", organ: "Organs", cultures: "Cultures", invest: "Investigations", issues: "Issues", treat: "Treatment", orders: "Orders", team: "Team" };
export const TAB_ORDER = ["history", "diagnosis", "vitals", "organ", "cultures", "invest", "issues", "treat", "orders", "team"];
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function wrap(g, text, x, y, mw, lh, maxLines) { const words = String(text || "").split(/\s+/); let line = "", n = 0; for (const wd of words) { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > mw && line) { g.fillText(line, x, y); y += lh; line = wd; if (++n >= maxLines) return y; } else line = t; } if (line) { g.fillText(line, x, y); y += lh; } return y; }
export const patientNo = (SC) => { let h = 0; for (const c of String((SC && SC.name) || "x")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return String(100 + (h % 899)).padStart(3, "0"); };
const complaints = (SC) => String((SC && SC.story) || "").split(/(?<=[.!?])\s+/).map((s) => s.replace(/[.!?]+$/, "").trim()).filter(Boolean);
const flag = (bad, warn) => (bad ? C.bad : warn ? C.warn : C.ok);

function panel(g, w, h, title, col, tag, tagCol) {
  g.clearRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(8,34,58,.9)"); gr.addColorStop(1, "rgba(3,14,26,.92)"); g.fillStyle = gr; rr(g, 6, 6, w - 12, h - 12, 26); g.fill();
  g.fillStyle = "rgba(120,225,255,.05)"; for (let y = 14; y < h - 10; y += 6) g.fillRect(14, y, w - 28, 1);
  g.save(); g.shadowColor = col || C.cy; g.shadowBlur = 18; g.strokeStyle = col || C.cy; g.lineWidth = 3.5; rr(g, 6, 6, w - 12, h - 12, 26); g.stroke(); g.restore();
  g.fillStyle = C.ink; g.font = F(Math.round(h * 0.058), 800); g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(title, 40, Math.round(h * 0.115));
  if (tag) { g.font = F(Math.round(h * 0.04), 800); const tw = g.measureText(tag).width + 40; g.save(); g.font = F(Math.round(h * 0.058), 800); const tx = 40 + g.measureText(title).width + 28; g.restore(); g.font = F(Math.round(h * 0.04), 800); g.fillStyle = tagCol || C.warn; rr(g, tx, h * 0.062, tw, h * 0.07, h * 0.035); g.fill(); g.fillStyle = "#1a1200"; g.textBaseline = "middle"; g.fillText(tag, tx + 20, h * 0.097); g.textBaseline = "alphabetic"; }
  g.fillStyle = "rgba(115,228,255,.45)"; g.fillRect(40, h * 0.145, w - 80, 2);
}

/* small line icons */
function icon(g, kind, x, y, s, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col || C.cy; g.fillStyle = col || C.cy; g.lineWidth = Math.max(2.5, s * 0.07); g.lineCap = "round"; g.lineJoin = "round";
  if (kind === "lab") { g.beginPath(); g.moveTo(-s * 0.18, -s * 0.4); g.lineTo(-s * 0.18, -s * 0.05); g.lineTo(-s * 0.4, s * 0.38); g.lineTo(s * 0.4, s * 0.38); g.lineTo(s * 0.18, -s * 0.05); g.lineTo(s * 0.18, -s * 0.4); g.moveTo(-s * 0.26, -s * 0.4); g.lineTo(s * 0.26, -s * 0.4); g.stroke(); g.globalAlpha = 0.45; g.beginPath(); g.moveTo(-s * 0.3, s * 0.18); g.lineTo(s * 0.3, s * 0.18); g.lineTo(s * 0.4, s * 0.38); g.lineTo(-s * 0.4, s * 0.38); g.fill(); }
  else if (kind === "img") { rr(g, -s * 0.42, -s * 0.34, s * 0.84, s * 0.68, s * 0.1); g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.2, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.05, 0, TAU); g.fill(); }
  else if (kind === "vit") { g.beginPath(); g.moveTo(-s * 0.45, 0); g.lineTo(-s * 0.2, 0); g.lineTo(-s * 0.1, -s * 0.34); g.lineTo(s * 0.08, s * 0.34); g.lineTo(s * 0.2, 0); g.lineTo(s * 0.45, 0); g.stroke(); }
  else if (kind === "uri") { g.beginPath(); g.moveTo(0, -s * 0.42); g.bezierCurveTo(s * 0.34, -s * 0.02, s * 0.34, s * 0.4, 0, s * 0.4); g.bezierCurveTo(-s * 0.34, s * 0.4, -s * 0.34, -s * 0.02, 0, -s * 0.42); g.stroke(); }
  else { [-0.28, 0, 0.28].forEach((k) => { g.beginPath(); g.arc(k * s, 0, s * 0.06, 0, TAU); g.fill(); }); }
  g.restore();
}
function glyph(g, spec, x, y, s, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * 0.08; g.lineCap = "round";
  if (spec === "intensivist") { rr(g, -s * 0.42, -s * 0.3, s * 0.84, s * 0.55, s * 0.08); g.stroke(); g.beginPath(); g.moveTo(-s * 0.3, 0); g.lineTo(-s * 0.1, 0); g.lineTo(0, -s * 0.16); g.lineTo(s * 0.1, s * 0.14); g.lineTo(s * 0.2, 0); g.lineTo(s * 0.3, 0); g.stroke(); }
  else if (spec === "pulmonologist") { [-1, 1].forEach((k) => { g.beginPath(); g.ellipse(k * s * 0.22, s * 0.05, s * 0.17, s * 0.32, k * -0.18, 0, TAU); g.stroke(); }); g.beginPath(); g.moveTo(0, -s * 0.38); g.lineTo(0, s * 0.02); g.stroke(); }
  else if (spec === "nephrologist") { [-1, 1].forEach((k) => { g.beginPath(); g.ellipse(k * s * 0.2, 0, s * 0.14, s * 0.3, k * 0.25, 0, TAU); g.stroke(); }); }
  else if (spec === "cardiologist") { g.beginPath(); g.moveTo(0, s * 0.36); g.bezierCurveTo(-s * 0.6, -s * 0.05, -s * 0.3, -s * 0.5, 0, -s * 0.2); g.bezierCurveTo(s * 0.3, -s * 0.5, s * 0.6, -s * 0.05, 0, s * 0.36); g.stroke(); }
  else if (spec === "neurologist") { g.beginPath(); g.arc(0, -s * 0.02, s * 0.36, Math.PI * 0.9, Math.PI * 2.1); g.stroke(); g.beginPath(); g.moveTo(-s * 0.3, s * 0.05); g.bezierCurveTo(-s * 0.2, s * 0.35, s * 0.2, s * 0.35, s * 0.3, s * 0.05); g.stroke(); g.beginPath(); g.moveTo(0, -s * 0.36); g.lineTo(0, s * 0.2); g.stroke(); }
  else if (spec === "infectious") { g.beginPath(); g.arc(0, 0, s * 0.2, 0, TAU); g.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2); g.lineTo(Math.cos(a) * s * 0.36, Math.sin(a) * s * 0.36); g.stroke(); } }
  else if (spec === "gastroenterologist") { g.beginPath(); g.moveTo(-s * 0.3, -s * 0.2); g.bezierCurveTo(s * 0.4, -s * 0.4, s * 0.4, 0, -s * 0.1, s * 0.05); g.bezierCurveTo(-s * 0.4, s * 0.1, -s * 0.2, s * 0.4, s * 0.25, s * 0.3); g.stroke(); }
  else { g.beginPath(); g.moveTo(-s * 0.3, s * 0.3); g.lineTo(s * 0.3, -s * 0.3); g.stroke(); g.beginPath(); g.moveTo(-s * 0.1, -s * 0.3); g.lineTo(s * 0.3, s * 0.1); g.stroke(); }
  g.restore();
}
/* the patient's outline for the presentation display: a standing hologram figure with the chest lit */
function figure(g, cx, top, hh, col, lungCol) {
  g.save(); g.strokeStyle = col; g.fillStyle = "rgba(95,227,255,.07)"; g.lineWidth = 3; const s = hh / 100;
  const head = () => { g.beginPath(); g.ellipse(cx, top + 7 * s, 5.6 * s, 7 * s, 0, 0, TAU); g.fill(); g.stroke(); };
  head(); g.beginPath(); g.moveTo(cx - 2.6 * s, top + 14 * s); g.lineTo(cx - 3 * s, top + 17.5 * s); g.bezierCurveTo(cx - 12 * s, top + 19 * s, cx - 20 * s, top + 22 * s, cx - 22 * s, top + 30 * s); g.lineTo(cx - 25 * s, top + 52 * s); g.lineTo(cx - 20 * s, top + 54 * s); g.lineTo(cx - 16 * s, top + 36 * s); g.lineTo(cx - 14 * s, top + 54 * s); g.lineTo(cx - 12 * s, top + 100 * s); g.lineTo(cx - 3.5 * s, top + 100 * s); g.lineTo(cx - 1.5 * s, top + 62 * s); g.lineTo(cx + 1.5 * s, top + 62 * s); g.lineTo(cx + 3.5 * s, top + 100 * s); g.lineTo(cx + 12 * s, top + 100 * s); g.lineTo(cx + 14 * s, top + 54 * s); g.lineTo(cx + 16 * s, top + 36 * s); g.lineTo(cx + 20 * s, top + 54 * s); g.lineTo(cx + 25 * s, top + 52 * s); g.lineTo(cx + 22 * s, top + 30 * s); g.bezierCurveTo(cx + 20 * s, top + 22 * s, cx + 12 * s, top + 19 * s, cx + 3 * s, top + 17.5 * s); g.lineTo(cx + 2.6 * s, top + 14 * s); g.closePath(); g.fill(); g.stroke();
  [-1, 1].forEach((k) => { g.fillStyle = lungCol; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(cx + k * 7.4 * s, top + 30 * s, 5.6 * s, 9 * s, k * -0.12, 0, TAU); g.fill(); g.globalAlpha = 1; });
  g.restore();
}

/* ============================================================ the far-wall displays */
export function paintAvail(g, w, h, d, t) {
  panel(g, w, h, "AVAILABLE INFORMATION", C.cy);
  const feed = d.feed || [], labs = feed.filter((i) => i.kind === "lab"), imgs = feed.filter((i) => i.kind === "img"), un = d.unseen || {};
  const rows = [["lab", "Lab Results", labs.length ? labs.length + " returned" : "none yet", un.invest > 0 && labs.length], ["img", "Imaging", imgs.length ? imgs.length + " reported" : "none yet", un.invest > 0 && imgs.length], ["vit", "Vitals Trends", (d.hist || []).length > 1 ? (d.hist || []).length + " readings" : "live", false], ["uri", "Urine Output", d.P && d.P.urine != null ? Math.round(d.P.urine) + " mL/h" : "not charted", false], ["more", "More Tests…", "ask the team", false]];
  const y0 = h * 0.19, rh = h * 0.115;
  rows.forEach(([k, name, sub, nw], i) => {
    const y = y0 + i * (rh + h * 0.012); g.fillStyle = "rgba(60,170,230,.14)"; rr(g, 40, y, w - 80, rh, 18); g.fill(); g.strokeStyle = "rgba(120,225,255,.35)"; g.lineWidth = 2; rr(g, 40, y, w - 80, rh, 18); g.stroke();
    icon(g, k, 40 + rh * 0.62, y + rh / 2, rh * 0.62, C.cy2);
    g.fillStyle = C.ink; g.font = F(Math.round(rh * 0.38), 700); g.textAlign = "left"; g.fillText(name, 40 + rh * 1.2, y + rh * 0.45);
    g.fillStyle = C.mut; g.font = F(Math.round(rh * 0.27), 500); g.fillText(sub, 40 + rh * 1.2, y + rh * 0.8);
    if (nw) { g.fillStyle = C.warn; rr(g, w - 40 - rh * 1.9, y + rh * 0.26, rh * 1.0, rh * 0.48, rh * 0.24); g.fill(); g.fillStyle = "#1a1200"; g.font = F(Math.round(rh * 0.27), 800); g.textAlign = "center"; g.fillText("NEW", w - 40 - rh * 1.4, y + rh * 0.6); g.textAlign = "left"; }
    g.strokeStyle = C.cy2; g.lineWidth = 4; g.beginPath(); g.moveTo(w - 70, y + rh * 0.34); g.lineTo(w - 54, y + rh / 2); g.lineTo(w - 70, y + rh * 0.66); g.stroke();
  });
  const ly = y0 + 5 * (rh + h * 0.012) + 6, last = feed[feed.length - 1];
  g.fillStyle = C.cy; g.font = F(Math.round(h * 0.034), 800); g.fillText("LATEST RESULT", 40, ly + h * 0.04);
  g.fillStyle = last ? "#d6ecf6" : C.mut; g.font = F(Math.round(h * 0.036), 500);
  if (last) { g.fillStyle = C.warn; g.font = F(Math.round(h * 0.04), 700); g.fillText(last.label, 40, ly + h * 0.092); g.fillStyle = "#d6ecf6"; g.font = F(Math.round(h * 0.034), 500); wrap(g, last.text, 40, ly + h * 0.134, w - 80, h * 0.044, 3); }
  else wrap(g, d.SC ? "Nothing has come back yet. Request investigations from your screen." : "Results appear here once the team has ordered them.", 40, ly + h * 0.092, w - 80, h * 0.044, 3);
}

export function paintPresent(g, w, h, d, t) {
  const SC = d.SC, rev = !d.blind;
  panel(g, w, h, "PATIENT PRESENTATION", rev ? C.ok : C.cy, SC ? (rev ? "Diagnosed" : "Undiagnosed") : "Waiting", rev ? C.ok : C.warn);
  if (!SC) { g.fillStyle = C.mut; g.font = F(h * 0.05, 600); g.textAlign = "left"; wrap(g, "The patient is brought in when the shift begins. Nobody, including the system's players, is told the diagnosis in advance.", 40, h * 0.3, w - 80, h * 0.07, 4); return; }
  figure(g, w * 0.13, h * 0.2, h * 0.7, C.cy, d.P && d.P.spo2 < 92 ? "#6a74c8" : "#ff8aa0");
  const x0 = w * 0.27, f1 = Math.round(h * 0.05);
  g.textAlign = "left"; g.fillStyle = C.ink; g.font = F(Math.round(h * 0.066), 800); g.fillText("Patient " + patientNo(SC), x0, h * 0.25);
  g.font = F(f1, 600); g.fillStyle = C.cy2; g.fillText(SC.age + " years  ·  " + (SC.sex === "woman" ? "Female" : "Male") + "  ·  " + (d.P ? "Hour " + d.P.hour : ""), x0, h * 0.32);
  g.fillStyle = C.warn; g.font = F(f1, 800); g.fillText("Chief complaints", x0, h * 0.42);
  g.fillStyle = "#e6f6ff"; g.font = F(Math.round(h * 0.044), 500); let y = h * 0.485;
  complaints(SC).slice(0, 4).forEach((c) => { g.fillStyle = C.warn; g.beginPath(); g.arc(x0 + 10, y - h * 0.013, 6, 0, TAU); g.fill(); g.fillStyle = "#e6f6ff"; y = wrap(g, c, x0 + 32, y, w * 0.4 - 40, h * 0.052, 2) + h * 0.012; });
  if (rev) { g.fillStyle = C.ok; g.font = F(Math.round(h * 0.046), 800); g.fillText("Diagnosis: " + SC.dx, x0, h * 0.9); }
  else { g.fillStyle = C.mut; g.font = F(Math.round(h * 0.034), 500); wrap(g, "Diagnosis and further results are concealed until the team requests them.", x0, h * 0.9, w * 0.5, h * 0.044, 2); }
  /* live vitals */
  const vx = w * 0.7, vw = w * 0.27; g.fillStyle = "rgba(60,170,230,.12)"; rr(g, vx, h * 0.2, vw, h * 0.72, 20); g.fill(); g.strokeStyle = "rgba(120,225,255,.4)"; g.lineWidth = 2; rr(g, vx, h * 0.2, vw, h * 0.72, 20); g.stroke();
  g.fillStyle = C.ink; g.font = F(Math.round(h * 0.048), 800); g.fillText("Vital Signs", vx + 26, h * 0.275);
  const p = d.disp || {}, rows = [["HR", Math.round(p.hr || 0) + " /min", flag(p.hr > 130 || p.hr < 45, p.hr > 110)], ["BP", Math.round(p.sbp || 0) + "/" + Math.round(p.dbp || 0) + " mmHg", flag(p.map < 60, p.map < 70)], ["RR", Math.round(p.rr || 0) + " /min", flag(p.rr > 30, p.rr > 24)], ["SpO₂", Math.round(p.spo2 || 0) + " %", flag(p.spo2 < 88, p.spo2 < 93)], ["Temp", (p.temp || 0).toFixed(1) + " °C", flag(p.temp > 39, p.temp > 38.3)], ["GCS", Math.round(p.gcs || 0), flag(p.gcs <= 8, p.gcs < 13)]];
  rows.forEach(([l, v, c], i) => { const yy = h * 0.35 + i * h * 0.095; g.fillStyle = C.mut; g.font = F(Math.round(h * 0.04), 600); g.fillText(l, vx + 26, yy); g.fillStyle = c; g.font = MONO(Math.round(h * 0.049)); g.textAlign = "right"; g.fillText(String(v), vx + vw - 24, yy); g.textAlign = "left"; });
  g.strokeStyle = C.ok; g.lineWidth = 3; g.beginPath(); const per = 60 / Math.max(30, p.hr || 60), ex = vx + 26, ew = vw - 52, ey = h * 0.9; const ecg = (f) => { const q = (m, s, a) => a * Math.exp(-(((f - m) / s) ** 2)); return q(0.2, 0.03, 0.13) + q(0.4, 0.018, 1) - q(0.375, 0.01, 0.15) - q(0.43, 0.012, 0.2) + q(0.65, 0.05, 0.25); };
  for (let x = 0; x < ew; x += 3) { const f = ((((t - (ew - x) / 150) / per) % 1) + 1) % 1, y2 = ey - (d.P && d.P.alive === false ? 0 : ecg(f)) * h * 0.06; x ? g.lineTo(ex + x, y2) : g.moveTo(ex + x, y2); } g.stroke();
}

export function paintDiscuss(g, w, h, d) {
  panel(g, w, h, "MDT DISCUSSION", C.cy);
  const chat = (d.chat || []).slice(-5), col = { ask: C.cy, propose: C.warn, challenge: C.bad, agree: C.ok, final: "#ffd36a" }, nm = { ask: "ASKS", propose: "PROPOSES", challenge: "CHALLENGES", agree: "AGREES", final: "FINAL PLAN" };
  g.textAlign = "left";
  if (!chat.length) {
    g.strokeStyle = C.cy2; g.lineWidth = 4; rr(g, 56, h * 0.24, h * 0.17, h * 0.13, 14); g.stroke(); [0.3, 0.5, 0.7].forEach((k) => { g.fillStyle = C.cy2; g.beginPath(); g.arc(56 + h * 0.17 * k, h * 0.305, 6, 0, TAU); g.fill(); });
    g.fillStyle = "#e6f6ff"; g.font = F(Math.round(h * 0.058), 700); let y = h * 0.29; ["Ask for investigations,", "Share your assessment,", "Propose management…"].forEach((s) => { g.fillText(s, 56 + h * 0.22, y); y += h * 0.075; });
  } else {
    let y = h * 0.2; chat.forEach((m) => { const c = col[m.k] || C.cy; g.fillStyle = c; g.font = F(Math.round(h * 0.034), 800); g.fillText((m.name || "Doctor") + (m.spec ? " · " + m.spec : "") + "   " + (nm[m.k] || ""), 40, y + h * 0.03); g.fillStyle = "#e6f6ff"; g.font = F(Math.round(h * 0.042), 500); y = wrap(g, m.text, 40, y + h * 0.085, w - 80, h * 0.05, 2) + h * 0.03; });
  }
  const lg = ((d.P && d.P.log) || []).slice(-3); if (lg.length) { const y0 = h * 0.74; g.fillStyle = "rgba(115,228,255,.35)"; g.fillRect(40, y0 - h * 0.035, w - 80, 2); g.fillStyle = C.cy; g.font = F(Math.round(h * 0.03), 800); g.fillText("LATEST EVENTS", 40, y0); g.fillStyle = C.mut; g.font = F(Math.round(h * 0.034), 500); let y = y0 + h * 0.052; lg.forEach((l) => { g.fillText(String(l.text || "").slice(0, 58), 40, y); y += h * 0.05; }); }
}

/* ============================================================ the stations */
export function paintConsole(g, w, h, d, st, t) {
  const it = st.item || {}, accent = it.accent || C.cy, tab = st.tab || "history", open = it.state === "open";
  g.clearRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#06223a"); gr.addColorStop(1, "#030f1c"); g.fillStyle = gr; rr(g, 4, 4, w - 8, h - 8, 22); g.fill();
  g.save(); g.shadowColor = accent; g.shadowBlur = 16; g.strokeStyle = accent; g.lineWidth = 4; rr(g, 4, 4, w - 8, h - 8, 22); g.stroke(); g.restore();
  g.fillStyle = accent; g.globalAlpha = 0.22; rr(g, 10, 10, w - 20, h * 0.15, 16); g.fill(); g.globalAlpha = 1;
  glyph(g, it.spec, 62, h * 0.085, 56, accent); g.textAlign = "left"; g.fillStyle = C.ink; g.font = F(40, 800); g.fillText(it.label || "Doctor", 110, h * 0.08);
  g.fillStyle = C.mut; g.font = F(24, 500); g.fillText(open ? "open seat" : (it.name || "") + (st.me ? "  ·  you" : ""), 110, h * 0.125);
  /* the tabs */
  let x = 20; const ty = h * 0.19; g.font = F(22, 700);
  TAB_ORDER.forEach((id) => { const lab = TAB_LABEL[id], tw = g.measureText(lab).width + 26; if (x + tw > w - 16) return; const on = id === tab; g.fillStyle = on ? accent : "rgba(95,227,255,.12)"; rr(g, x, ty, tw, 40, 20); g.fill(); g.fillStyle = on ? "#041018" : C.cy2; g.fillText(lab, x + 13, ty + 28); x += tw + 8; });
  /* the page */
  const P = d.P, SC = d.SC, p = d.disp || {}, y0 = h * 0.37; g.fillStyle = C.cy; g.font = F(26, 800); g.fillText((TAB_LABEL[tab] || "").toUpperCase(), 28, y0);
  g.fillStyle = "rgba(115,228,255,.4)"; g.fillRect(28, y0 + 10, w - 56, 2); g.font = F(28, 500); g.fillStyle = "#e6f6ff"; let y = y0 + 56;
  if (open) { g.fillStyle = C.mut; wrap(g, "This seat is open. A doctor with this role will take it.", 28, y, w - 56, 38, 3); return; }
  if (!SC || !P) { g.fillStyle = C.mut; wrap(g, "Waiting for the shift to begin.", 28, y, w - 56, 38, 2); return; }
  const kv = (a) => a.forEach(([l, v, c], i) => { const cx = 28 + (i % 3) * ((w - 56) / 3), cy = y + Math.floor(i / 3) * 112; g.fillStyle = C.mut; g.font = F(22, 600); g.fillText(l, cx, cy); g.fillStyle = c || C.ok; g.font = MONO(40); g.fillText(String(v), cx, cy + 46); });
  if (tab === "vitals") kv([["HR", Math.round(p.hr), flag(p.hr > 130 || p.hr < 45, p.hr > 110)], ["BP", Math.round(p.sbp) + "/" + Math.round(p.dbp), flag(p.map < 60, p.map < 70)], ["SpO₂", Math.round(p.spo2) + "%", flag(p.spo2 < 88, p.spo2 < 93)], ["RR", Math.round(p.rr), flag(p.rr > 30, p.rr > 24)], ["Temp", (p.temp || 0).toFixed(1), flag(p.temp > 39, p.temp > 38.3)], ["GCS", Math.round(p.gcs), flag(p.gcs <= 8, p.gcs < 13)]]);
  else if (tab === "invest" || tab === "cultures") { const f = (d.feed || []).slice(-2); if (!f.length) { g.fillStyle = C.mut; wrap(g, "No result has come back yet.", 28, y, w - 56, 38, 2); } else f.forEach((i) => { g.fillStyle = C.warn; g.font = F(26, 700); g.fillText(i.label, 28, y); g.fillStyle = "#e6f6ff"; g.font = F(24, 500); y = wrap(g, i.text, 28, y + 34, w - 56, 32, 3) + 14; }); }
  else if (tab === "treat" || tab === "orders") { const e = d.eq || {}, L = [["Endotracheal tube", P.tube], ["Oxygen", P.oxygen && !P.tube], ["Noradrenaline", P.norepi], ["Fluid", e.fluid > 0], ["Antibiotic", e.abx], ["Dialysis", P.dialysis]]; L.forEach(([n, on], i) => { g.fillStyle = on ? C.ok : "#56707f"; g.beginPath(); g.arc(40 + (i % 2) * ((w - 56) / 2), y + Math.floor(i / 2) * 50 - 8, 8, 0, TAU); g.fill(); g.fillStyle = on ? "#e6f6ff" : C.mut; g.font = F(26, 600); g.fillText(n + (on ? "" : " · not yet"), 62 + (i % 2) * ((w - 56) / 2), y + Math.floor(i / 2) * 50); }); }
  else if (tab === "team") { const m = (d.chat || []).slice(-2); if (!m.length) { g.fillStyle = C.mut; wrap(g, "Ask, propose, challenge or agree with the team.", 28, y, w - 56, 38, 2); } else m.forEach((q) => { g.fillStyle = C.cy2; g.font = F(24, 700); g.fillText((q.name || "Doctor") + " " + ({ ask: "asks", propose: "proposes", challenge: "challenges", agree: "agrees", final: "finalises" }[q.k] || ""), 28, y); g.fillStyle = "#e6f6ff"; g.font = F(26, 500); y = wrap(g, q.text, 28, y + 34, w - 56, 34, 2) + 14; }); }
  else if (tab === "diagnosis") { g.fillStyle = C.warn; g.font = F(30, 700); g.fillText(d.blind ? "Undiagnosed" : SC.dx, 28, y); g.fillStyle = C.mut; g.font = F(26, 500); wrap(g, d.blind ? "Reason from the findings and the response to treatment, then propose it." : (P.outcome === "held" ? "The patient survived. Well done." : "The case has ended."), 28, y + 46, w - 56, 36, 3); }
  else if (tab === "issues") { const n = ((P.problems) || []).filter((q) => q.open && !q.resolved).length; g.fillStyle = n ? C.warn : C.ok; g.font = F(34, 700); g.fillText(n ? n + " unresolved problem" + (n > 1 ? "s" : "") : "No open problem", 28, y); }
  else { g.fillStyle = C.warn; g.font = F(34, 700); g.fillText("Patient " + patientNo(SC), 28, y); g.fillStyle = "#e6f6ff"; g.font = F(26, 500); wrap(g, complaints(SC).slice(0, 3).join(". ") + ".", 28, y + 46, w - 56, 36, 5); }
  /* a quiet shimmer along the foot so a screen with someone at it reads as alive */
  g.fillStyle = accent; g.globalAlpha = 0.55; const sx = ((t * 120) % (w + 200)) - 100; g.fillRect(Math.max(20, sx), h - 22, Math.min(180, w - 20 - sx), 4); g.globalAlpha = 1;
}

export function paintPlacard(g, w, h, it, on) {
  g.clearRect(0, 0, w, h); const accent = (it && it.accent) || C.cy, open = !it || it.state === "open";
  g.fillStyle = "rgba(4,16,28,.94)"; rr(g, 4, 4, w - 8, h - 8, 20); g.fill(); g.save(); g.shadowColor = accent; g.shadowBlur = 14; g.strokeStyle = accent; g.lineWidth = 4; rr(g, 4, 4, w - 8, h - 8, 20); g.stroke(); g.restore();
  g.fillStyle = accent; g.globalAlpha = open ? 0.12 : 0.28; g.beginPath(); g.arc(70, h / 2, 50, 0, TAU); g.fill(); g.globalAlpha = 1;
  glyph(g, it && it.spec, 70, h / 2, 76, open ? "#56707f" : "#eaf8ff");
  g.textAlign = "left"; g.fillStyle = open ? C.mut : C.ink; g.font = F(open ? 40 : 46, 800); const lab = (it && it.label) || "Open seat"; g.fillText(lab.length > 15 ? lab.slice(0, 14) + "…" : lab, 136, h * 0.5);
  g.fillStyle = open ? "#56707f" : C.cy2; g.font = F(28, 500); g.fillText(open ? "waiting for a doctor" : ((it.name || "") + (it.you ? " · you" : "")).slice(0, 22), 136, h * 0.8);
  if (!open) { g.fillStyle = on ? C.ok : "#667"; g.beginPath(); g.arc(w - 36, 36, 10, 0, TAU); g.fill(); }
}
