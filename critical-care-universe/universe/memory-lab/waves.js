/* Procedural waveform cards: ECG rhythms, arterial lines, capnography and ventilator graphics are drawn in the browser (no image files),
   so every card is sharp at any size and always the same picture for the same card. */
const TAU = Math.PI * 2, gs = (x, m, s, a) => a * Math.exp(-((x - m) * (x - m)) / (2 * s * s));
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const rng = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
export const hashStr = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };

/* ------------------------------ ECG ------------------------------ */
const FS = 250, DUR = 6;
const reg = (rr, o) => { const q = [], p = []; for (let t = 0.45; t < DUR + 1; t += rr) { q.push(t); p.push(t - 0.16); } return Object.assign({ p, q, pA: 1, tA: 1, st: 0, wide: 1 }, o || {}); };
const RH = {
  nsr: () => reg(0.8),
  stach: () => reg(0.44, { tA: 0.8 }),
  sbrady: () => reg(1.5),
  af: (R) => { const q = []; for (let t = 0.4; t < DUR + 1; t += 0.32 + R() * 0.62) q.push(t); return { p: [], q, pA: 0, tA: 0.9, st: 0, wide: 1, base: (t) => 0.05 * Math.sin(TAU * 7.3 * t) + 0.04 * Math.sin(TAU * 9.1 * t + 1) + 0.035 * Math.sin(TAU * 5.7 * t + 2) }; },
  flutter: () => { const q = []; for (let t = 0.5; t < DUR + 1; t += 0.4) q.push(t); return { p: [], q, pA: 0, tA: 0.3, st: 0, wide: 1, base: (t) => -0.24 * (((t * 5) % 1) - 0.5) + 0.04 * Math.sin(TAU * 10 * t) }; },
  svt: () => reg(0.33, { pA: 0, tA: 0.5, st: -0.07, p: [] }),
  vt: () => ({ p: [], q: [], raw: (t) => 0.9 * Math.sin(TAU * 3.1 * t) + 0.28 * Math.sin(TAU * 6.2 * t + 0.6) + 0.1 * Math.sin(TAU * 9.3 * t) }),
  vf: (R) => { const f = [3.6 + R() * 1.2, 5.1 + R() * 1.6, 6.8 + R() * 1.4, 4.4 + R()], ph = f.map(() => R() * TAU); return { p: [], q: [], raw: (t) => (0.35 + 0.25 * Math.sin(TAU * 0.4 * t + 1)) * (Math.sin(TAU * f[0] * t + ph[0]) + 0.7 * Math.sin(TAU * f[1] * t + ph[1]) + 0.5 * Math.sin(TAU * f[2] * t + ph[2] + Math.sin(t * 2)) + 0.4 * Math.sin(TAU * f[3] * t + ph[3])) }; },
  torsades: () => ({ p: [], q: [], raw: (t) => (0.12 + 0.88 * Math.abs(Math.sin(TAU * t / 2.4))) * 0.95 * Math.sin(TAU * 4.1 * t + 0.9 * Math.sin(TAU * t / 2.4)) }),
  chb: () => { const p = [], q = []; for (let t = 0.2; t < DUR + 1; t += 0.74) p.push(t); for (let t = 0.9; t < DUR + 2; t += 1.72) q.push(t); return { p, q, pA: 1, tA: 0.8, st: 0, wide: 1.7 }; },
  mob1: () => { const p = [], q = []; let t = 0.3, k = 0; for (; t < DUR + 1; t += 0.9, k++) { p.push(t); const pr = [0.17, 0.27, 0.37, -1][k % 4]; if (pr > 0) q.push(t + pr); } return { p, q, pA: 1, tA: 1, st: 0, wide: 1 }; },
  mob2: () => { const p = [], q = []; let t = 0.3, k = 0; for (; t < DUR + 1; t += 0.85, k++) { p.push(t); if (k % 3 !== 2) q.push(t + 0.2); } return { p, q, pA: 1, tA: 1, st: 0, wide: 1.25 }; },
  av1: () => { const o = reg(0.85); o.p = o.q.map((t) => t - 0.36); return o; },
  stemi: () => reg(0.8, { st: 0.5, tA: 1.3 }),
  hyperk: () => reg(0.85, { pA: 0.15, tA: 2.5, tws: 0.55, wide: 1.6 }),
  asystole: () => ({ p: [], q: [], raw: (t) => 0.012 * Math.sin(TAU * 0.7 * t) }),
};
function ecgSignal(key, seed) {
  const R = rng(seed), spec = RH[key](R), n = FS * DUR, y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / FS; let v = 0;
    if (spec.raw) v = spec.raw(t);
    else {
      for (const tp of spec.p) if (Math.abs(t - tp) < 0.2) v += gs(t, tp, 0.022, 0.13 * spec.pA);
      for (const tq of spec.q) {
        if (t < tq - 0.2 || t > tq + 0.7) continue; const w = spec.wide;
        v += gs(t, tq - 0.035 * w, 0.01 * w, -0.1) + gs(t, tq, 0.011 * w, 1.0) + gs(t, tq + 0.032 * w, 0.011 * w, -0.22);
        if (spec.st) v += spec.st * (sm((t - (tq + 0.05 * w)) / 0.03) - sm((t - (tq + 0.4)) / 0.08));
        v += gs(t, tq + 0.27 + 0.05 * w, 0.05 * (spec.tws || 1), 0.3 * spec.tA);
      }
      if (spec.base) v += spec.base(t);
    }
    y[i] = v + (R() - 0.5) * 0.012;
  }
  return y;
}
/* ------------------------------ arterial line ------------------------------ */
const pulse = (f, o) => {
  const rise = o.rise || 0.1, e = Math.max(0, f - rise);
  let v = f < rise ? sm(f / rise) : o.fast ? 0.55 * Math.exp(-e * 5) + 0.45 * Math.exp(-e * 22) : 0.62 * Math.exp(-e * 3.3) + 0.38 * Math.exp(-e * 9);
  if (o.antac) v = sm(f / 0.26) * (f < 0.26 ? 0.85 : 0) + (f >= 0.26 ? (0.85 + 0.15 * sm((f - 0.26) / 0.06)) * Math.exp(-(f - 0.26) * 3.2) : 0);
  if (!o.noNotch) v += gs(f, 0.35, 0.015, -0.05) + gs(f, 0.41, 0.03, 0.06);
  if (o.ring && f > rise) v += 0.4 * Math.exp(-e * 12) * Math.sin(e * TAU * 8);
  if (o.bis) v += gs(f, 0.2, 0.03, 0.18) - gs(f, 0.15, 0.02, 0.1);
  return v;
};
const ART = {
  normal: { sys: 122, dia: 72 }, over: { sys: 96, dia: 80, rise: 0.22, noNotch: true }, under: { sys: 138, dia: 62, ring: true, rise: 0.07 },
  as: { sys: 100, dia: 78, rise: 0.26, antac: true, noNotch: true }, ar: { sys: 168, dia: 42, fast: true, bis: true, rise: 0.07 },
  alt: { sys: 122, dia: 72, alt: 18 }, para: { sys: 122, dia: 72, para: 30 },
};
function artSignal(key) {
  const o = ART[key], n = FS * DUR, y = new Float32Array(n), hr = 78, per = 60 / hr;
  for (let i = 0; i < n; i++) {
    const t = i / FS, b = Math.floor(t / per), f = (t / per) % 1; let sys = o.sys, dia = o.dia;
    if (o.alt && b % 2) sys -= o.alt; if (o.para) { const k = Math.sin(TAU * t / 4.0); sys -= o.para * (k > 0 ? k : 0) * 0.9; dia -= 6 * (k > 0 ? k : 0); }
    y[i] = dia + (sys - dia) * pulse(f, o);
  }
  return y;
}
/* ------------------------------ capnography ------------------------------ */
const CAP = { normal: { et: 38 }, shark: { et: 36, shark: 1 }, flat: { et: 0 }, rebreath: { et: 40, base: 9 }, curare: { et: 38, cleft: 1 }, hyper: { et: 62 } };
function capSignal(key, seed) {
  const o = CAP[key], R = rng(seed), n = FS * DUR, y = new Float32Array(n), per = 4.0;
  for (let i = 0; i < n; i++) {
    const t = i / FS, f = ((t + 0.6) / per) % 1; let v;
    if (o.et === 0) v = 0.4 + (R() - 0.5) * 0.5;
    else if (o.shark) v = o.et * (sm((f - 0.04) / 0.2) * 0.8 + 0.2 * sm((f - 0.2) / 0.3)) * (1 - sm((f - 0.62) / 0.12));
    else { v = (o.base || 0) + (o.et - (o.base || 0)) * (0.9 * sm((f - 0.05) / 0.045) + 0.1 * sm((f - 0.1) / 0.45)) * (1 - sm((f - 0.6) / 0.04)); if (o.cleft) v -= gs(f, 0.4, 0.03, 0.4 * o.et) * sm((f - 0.1) / 0.1) * (1 - sm((f - 0.55) / 0.04)); if (o.base) v = Math.max(o.base * (1 - sm((f - 0.62) / 0.04) * 0), v); }
    y[i] = v;
  }
  return y;
}
/* ------------------------------ ventilator graphics ------------------------------ */
function ventSim(key) {
  const dt = 0.02, N = 700, o = { cyc: 4, ti: 1, vt: 0.5, Rw: 8, C: 0.04, peep: 5 };
  if (key === "autopeep") Object.assign(o, { cyc: 2.5, Rw: 19 });
  const tau = o.Rw * o.C, P = [], F = [], V = []; let v = 0;
  for (let i = 0; i < N; i++) {
    const t = i * dt + 0.4, c = Math.floor(t / o.cyc), ph = t - c * o.cyc; let insp = ph < o.ti, ph2 = ph;
    if (key === "double") { if (ph >= o.ti + 0.22 && ph < o.ti + 0.22 + o.ti) { insp = true; ph2 = ph - o.ti - 0.22; } }
    if (key === "leak" && ph < dt) v = 0;
    let f, p;
    if (insp) { f = o.vt / o.ti; v += f * dt; p = o.peep + v / o.C + o.Rw * f; if (key === "starve") p -= 8.5 * Math.sin(Math.PI * Math.min(1, ph2 / o.ti)); }
    else { const fl = key === "leak" ? 0.14 * o.vt : 0; f = -(v - fl) / tau; v += f * dt; p = o.peep; }
    if (key === "ineff") { [[1.9, 0], [2.8, 0]].forEach((e) => { const ts = e[0] + c * o.cyc; p -= gs(t, ts, 0.16, 3.2); f += gs(t, ts, 0.14, 0.14); }); }
    P.push(p); F.push(f * 60); V.push(v * 1000);
  }
  return { P, F, V, dt };
}
/* ------------------------------ drawing ------------------------------ */
function frame(g, w, h, title) { g.fillStyle = "#04101c"; g.fillRect(0, 0, w, h); if (title) { g.fillStyle = "#6f93ad"; g.font = "600 " + Math.round(h * 0.055) + "px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "top"; g.fillText(title, 10, 8); } }
function gridLines(g, x0, y0, w, h, nx, ny, a, b) { g.lineWidth = 1; for (let i = 0; i <= nx; i++) { g.strokeStyle = i % 5 === 0 ? a : b; g.beginPath(); g.moveTo(x0 + i * w / nx, y0); g.lineTo(x0 + i * w / nx, y0 + h); g.stroke(); } for (let j = 0; j <= ny; j++) { g.strokeStyle = j % 5 === 0 ? a : b; g.beginPath(); g.moveTo(x0, y0 + j * h / ny); g.lineTo(x0 + w, y0 + j * h / ny); g.stroke(); } }
function trace(g, arr, x0, y0, w, h, lo, hi, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.shadowColor = col; g.shadowBlur = 6; g.beginPath(); for (let i = 0; i < arr.length; i++) { const x = x0 + i / (arr.length - 1) * w, y = y0 + h - (arr[i] - lo) / (hi - lo) * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); g.shadowBlur = 0; }
export function drawWave(cv, key) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth || 640, ch = cv.clientHeight || 260; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  const g = cv.getContext("2d"), w = cv.width, h = cv.height, fam = key.split(":")[0], k = key.split(":")[1], seed = hashStr(key), lw = Math.max(2, 2.2 * dpr);
  if (fam === "ecg") { frame(g, w, h, "Lead II · 25 mm/s · 10 mm/mV"); const y = ecgSignal(k, seed), x0 = 0, y0 = h * 0.14, hh = h * 0.8; gridLines(g, x0, y0, w, hh, 150, 27, "rgba(220,90,110,.3)", "rgba(220,90,110,.1)"); trace(g, Array.from(y), x0, y0, w, hh, -1.1, 1.6, "#7dffb2", lw); }
  else if (fam === "art") { frame(g, w, h, "Arterial line · mmHg"); const y = artSignal(k), x0 = 36 * dpr, y0 = h * 0.14, ww = w - x0 - 8, hh = h * 0.8; gridLines(g, x0, y0, ww, hh, 30, 8, "rgba(120,170,210,.28)", "rgba(120,170,210,.1)"); g.fillStyle = "#7fa6c8"; g.font = 11 * dpr + "px system-ui"; g.textAlign = "right"; g.textBaseline = "middle"; [0, 50, 100, 150, 200].forEach((v) => g.fillText(String(v), x0 - 5, y0 + hh - v / 200 * hh)); trace(g, Array.from(y), x0, y0, ww, hh, 0, 200, "#ff6f7d", lw); }
  else if (fam === "cap") { frame(g, w, h, "Capnography · EtCO₂ mmHg"); const y = capSignal(k, seed), x0 = 36 * dpr, y0 = h * 0.14, ww = w - x0 - 8, hh = h * 0.8; gridLines(g, x0, y0, ww, hh, 30, 6, "rgba(120,170,210,.28)", "rgba(120,170,210,.1)"); g.fillStyle = "#7fa6c8"; g.font = 11 * dpr + "px system-ui"; g.textAlign = "right"; g.textBaseline = "middle"; [0, 20, 40, 60].forEach((v) => g.fillText(String(v), x0 - 5, y0 + hh - v / 70 * hh)); trace(g, Array.from(y), x0, y0, ww, hh, 0, 70, "#ffd166", lw); }
  else if (fam === "vent") {
    frame(g, w, h, null); const s = ventSim(k), x0 = 44 * dpr, ww = w - x0 - 8, gap = 6 * dpr, ph = (h - 4 * gap) / 3;
    [["Pressure cmH₂O", s.P, 0, 45, "#5fe3ff", [0, 20, 40]], ["Flow L/min", s.F, -90, 90, "#ffd166", [-60, 0, 60]], ["Volume mL", s.V, -50, 900, "#7dffb2", [0, 400, 800]]].forEach((r, i) => {
      const y0 = gap + i * (ph + gap); g.fillStyle = "rgba(8,24,40,.9)"; g.fillRect(x0, y0, ww, ph); gridLines(g, x0, y0, ww, ph, 28, 4, "rgba(120,170,210,.2)", "rgba(120,170,210,.08)");
      g.fillStyle = "#7fa6c8"; g.font = 10 * dpr + "px system-ui"; g.textAlign = "right"; g.textBaseline = "middle"; r[5].forEach((v) => g.fillText(String(v), x0 - 4, y0 + ph - (v - r[2]) / (r[3] - r[2]) * ph));
      g.save(); g.translate(10 * dpr, y0 + ph / 2); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.font = "600 " + 10 * dpr + "px system-ui"; g.fillStyle = r[4]; g.fillText(r[0].split(" ")[0], 0, 0); g.restore();
      const zy = y0 + ph - (0 - r[2]) / (r[3] - r[2]) * ph; if (i === 1) { g.strokeStyle = "rgba(255,255,255,.3)"; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x0, zy); g.lineTo(x0 + ww, zy); g.stroke(); g.setLineDash([]); }
      g.save(); g.beginPath(); g.rect(x0, y0, ww, ph); g.clip(); trace(g, r[1], x0, y0, ww, ph, r[2], r[3], r[4], lw); g.restore(); });
  }
}
/* the card list: key, family, name, what it shows */
export const WAVES = [
  ["ecg:nsr", "ecg", "Normal sinus rhythm", "Regular rhythm, a P wave before every narrow QRS, rate 60–100."],
  ["ecg:stach", "ecg", "Sinus tachycardia", "Every QRS preceded by a P wave and the rate is above 100. Look for the cause (pain, fever, hypovolaemia, sepsis) before treating the rate."],
  ["ecg:sbrady", "ecg", "Sinus bradycardia", "Normal P-QRS-T sequence but the rate is below 60."],
  ["ecg:af", "ecg", "Atrial fibrillation", "Irregularly irregular RR intervals, no distinct P waves, fibrillatory baseline."],
  ["ecg:flutter", "ecg", "Atrial flutter (2:1 block)", "Saw-tooth flutter waves at about 300/min with a regular ventricular rate near 150."],
  ["ecg:svt", "ecg", "Supraventricular tachycardia", "Fast, regular, narrow-complex rhythm (about 150–220/min) with no visible P waves."],
  ["ecg:vt", "ecg", "Ventricular tachycardia", "Fast, regular, wide complexes. Pulseless VT is shocked like VF."],
  ["ecg:vf", "ecg", "Ventricular fibrillation", "Chaotic irregular waveform with no identifiable QRS. Shockable: defibrillate immediately."],
  ["ecg:torsades", "ecg", "Torsades de pointes", "Polymorphic VT with QRS amplitude twisting around the baseline, seen with long QT. Give IV magnesium and remove QT-prolonging drugs."],
  ["ecg:chb", "ecg", "Complete (third-degree) heart block", "P waves and QRS complexes march independently, with a slow wide escape rhythm."],
  ["ecg:mob1", "ecg", "Mobitz I (Wenckebach)", "PR interval lengthens beat by beat until a P wave fails to conduct, then the cycle repeats."],
  ["ecg:mob2", "ecg", "Mobitz II", "Constant PR interval with sudden non-conducted P waves. It can progress to complete block and often needs pacing."],
  ["ecg:av1", "ecg", "First-degree AV block", "Every P wave conducts but the PR interval is prolonged (more than 200 ms)."],
  ["ecg:stemi", "ecg", "ST-elevation (STEMI pattern)", "Marked convex ST elevation merging into a tall T wave. Time is muscle: urgent reperfusion."],
  ["ecg:hyperk", "ecg", "Hyperkalaemia", "Tall, narrow, peaked T waves with flattened P waves and a widening QRS. Give IV calcium first."],
  ["ecg:asystole", "ecg", "Asystole", "Flat line. Confirm leads and gain, then start CPR; it is a non-shockable rhythm."],
  ["art:normal", "art", "Normal arterial waveform", "Sharp upstroke, a clear dicrotic notch and smooth diastolic runoff."],
  ["art:over", "art", "Overdamped trace", "Slurred upstroke, no dicrotic notch and a falsely low systolic with a narrow pulse pressure. Check for air, clots, kinks or a flat transducer."],
  ["art:under", "art", "Underdamped trace", "Ringing and overshoot: systolic is falsely high and diastolic falsely low. Mean arterial pressure stays reliable."],
  ["art:as", "art", "Aortic stenosis (pulsus parvus et tardus)", "Slow, delayed upstroke with a low-amplitude, narrow pulse pressure."],
  ["art:ar", "art", "Aortic regurgitation", "Wide pulse pressure with a brisk, bounding upstroke, a low diastolic and sometimes a double-peaked systole."],
  ["art:alt", "art", "Pulsus alternans", "Beat-to-beat alternation of strong and weak pulses, a sign of severe left ventricular failure."],
  ["art:para", "art", "Marked respiratory swing (pulsus paradoxus)", "Systolic pressure varies a lot with breathing (more than 10 mmHg). Think tamponade, severe asthma, tension pneumothorax, hypovolaemia."],
  ["cap:normal", "cap", "Normal capnogram", "Rapid upstroke, flat alveolar plateau, sharp downstroke to a zero baseline."],
  ["cap:shark", "cap", "Bronchospasm (shark-fin)", "Slow rise and no true plateau because uneven gas emptying, as in asthma, COPD or a kinked tube."],
  ["cap:flat", "cap", "Absent waveform", "No CO₂ at all: oesophageal intubation, disconnection, complete obstruction or cardiac arrest. Confirm and re-check the tube."],
  ["cap:rebreath", "cap", "Rebreathing", "The baseline does not return to zero, for example from an exhausted absorber, a faulty valve or too little expiratory time."],
  ["cap:curare", "cap", "Curare cleft", "A notch in the plateau showing the patient is making spontaneous breaths as the neuromuscular block wears off."],
  ["cap:hyper", "cap", "Hypoventilation (high EtCO₂)", "Normal shape but the plateau is high: rising CO₂ from hypoventilation, fever or increased production."],
  ["vent:normal", "vent", "Normal volume-control breath", "Square inspiratory flow, a smoothly rising pressure, and expiratory flow that returns to zero before the next breath."],
  ["vent:starve", "vent", "Flow starvation (flow asynchrony)", "The airway-pressure curve is scooped or concave during inspiration because set flow is too low for the patient's demand. Increase the flow or change the mode."],
  ["vent:double", "vent", "Double triggering (breath stacking)", "Two inspirations with almost no exhalation between them, so the delivered volume stacks. Often from a short inspiratory time or high demand."],
  ["vent:autopeep", "vent", "Auto-PEEP (air trapping)", "Expiratory flow has not returned to zero when the next breath starts. Lengthen expiratory time and treat the obstruction."],
  ["vent:ineff", "vent", "Ineffective triggering", "Small negative pressure dips with matching flow deflections during expiration but no breath delivered. Often due to auto-PEEP or oversedation."],
  ["vent:leak", "vent", "Circuit or cuff leak", "The volume curve fails to return to baseline, so expired volume is less than the delivered volume."],
];
export const WAVE_Q = { ecg: "Identify this ECG rhythm.", art: "What does this arterial pressure waveform show?", cap: "Interpret this capnogram.", vent: "Which problem does this ventilator graphic show?" };
