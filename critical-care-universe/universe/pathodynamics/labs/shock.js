/* SHOCK & METABOLIC CRISIS LAB on the PATHODYNAMICS engine: septic shock, DIC, anaphylaxis, severe metabolic acidosis, DKA and HHS.
   One circulation scene (heart, artery, capillary bed, vein, interstitium) shows vasodilation, flow, capillary leak, microthrombi, bleeding and acid or glucose load.
   Interactions: fluid responsiveness, vasopressors, microcirculation, intramuscular adrenaline, insulin response, potassium, bicarbonate and dialysis.
   Content aligned to the Surviving Sepsis Campaign adult guidance (2026 update), the 2025 ISTH update on DIC, the 2024 ADA/EASD/JBDS consensus on hyperglycaemic crises,
   and current anaphylaxis guidance (intramuscular adrenaline first). Checked Nov 2026 against published summaries; where a figure could not be confirmed, the wording is general.
   All numbers are illustrative, not patient data. */
import { THREE } from "../stage.js?v=20261123n";
import { clamp } from "./common.js?v=20261123n";

const TABS = {
  SEP: { label: "Septic shock", sub: "Infection, vasoplegia, leak",
    anat: "Blood leaves the heart, passes through arterioles that set the resistance, and reaches the capillary bed where oxygen is delivered. Veins return it. The capillary wall is a thin, selective barrier lined by the endothelium.",
    patho: "Infection triggers a dysregulated host response: arterioles dilate (low resistance), capillaries leak fluid into the tissue, some capillaries stop flowing while others shunt, and the cells lack oxygen. The result is a low blood pressure that does not respond to fluid alone, a raised lactate and organ failure.",
    interv: "Start antimicrobials as soon as possible and control the source. Give crystalloid guided by whether the patient is fluid-responsive, rather than a fixed volume for all. Add norepinephrine as the first-line vasopressor to keep MAP at about 65 mmHg, vasopressin as a second agent, and hydrocortisone if shock persists on vasopressors. Judge perfusion by capillary refill, lactate trend and urine output." },
  DIC: { label: "DIC", sub: "Clotting and bleeding together",
    anat: "Inside the capillary, platelets and clotting factors stay inactive until the endothelium is injured. Natural anticoagulants and fibrinolysis keep the balance.",
    patho: "A strong trigger (sepsis, trauma, obstetric catastrophe, malignancy) switches clotting on throughout the circulation. Tiny clots block capillaries and organs, while platelets and clotting factors are used up, so the patient bleeds. The ISTH score combines platelets, D-dimer, prothrombin time and fibrinogen; a score of 5 or more is overt DIC.",
    interv: "Treat the cause first. Replace blood products when the patient is bleeding or at high risk of bleeding, based on the clinical picture and not only on the numbers: platelets for a low count with bleeding, plasma or fibrinogen concentrate or cryoprecipitate for a prolonged PT or a low fibrinogen with bleeding. Prophylactic low-molecular-weight heparin is considered in patients who are not bleeding." },
  ANAPH: { label: "Anaphylaxis", sub: "Mast cells, airway and circulation",
    anat: "Mast cells sit beside small vessels in the skin, gut and airways, loaded with histamine and tryptase, ready to be released when an allergen binds IgE on their surface.",
    patho: "Within minutes of exposure (a drug, food or sting), mast cells degranulate. Vessels dilate and leak (low blood pressure, swelling, urticaria), the airway narrows (wheeze, stridor), and the heart can fail. Deaths follow airway or circulatory collapse, often when treatment is delayed or the patient is stood up.",
    interv: "Adrenaline (epinephrine) intramuscularly into the anterolateral thigh is the first-line treatment and should not be delayed; repeat after about 5 minutes if there is no response. Lay the patient flat with the legs raised, give oxygen, an IV fluid bolus for hypotension, and a nebulised bronchodilator for wheeze. Antihistamines and steroids are adjuncts only. For refractory cases, an adrenaline infusion in a monitored setting. Observe for a biphasic reaction." },
  ACID: { label: "Metabolic acidosis", sub: "Severe low pH",
    anat: "Blood pH is held near 7.40 by bicarbonate (kept by the kidneys) and carbon dioxide (blown off by the lungs). The two are linked by the Henderson–Hasselbalch equation.",
    patho: "When acid builds up (lactic, ketones, renal failure, toxins) or bicarbonate is lost, pH falls. The lungs compensate by breathing faster (Kussmaul breathing, expected PCO₂ about 1.5 × HCO₃ + 8). If the patient is intubated and the minute ventilation is not raised, the compensation is lost and the pH crashes. Severe acidaemia depresses the heart, dilates vessels and blunts the response to catecholamines.",
    interv: "Treat the cause (restore perfusion, give insulin in DKA, remove the toxin, relieve obstruction). In intubated patients match the minute ventilation to the pre-intubation compensation. Sodium bicarbonate is not routine: it is considered for severe acidaemia (pH about 7.2 or lower) particularly with acute kidney injury, and in extreme acidaemia. Dialysis removes acid, toxins and solute when the cause is renal or toxic or the acidosis is refractory." },
  DKA: { label: "DKA", sub: "Insulin lack, ketones, acid",
    anat: "Glucose enters most cells only with insulin. Without insulin the cells cannot use glucose; the liver turns fat into ketones (beta-hydroxybutyrate and acetoacetate), which are acids.",
    patho: "High glucose pulls water out through the urine (osmotic diuresis), causing severe dehydration and a total-body potassium deficit even though the serum potassium may look normal or high. Ketones cause an anion-gap metabolic acidosis. Insulin drives potassium into cells, so serum potassium can fall dangerously during treatment.",
    interv: "In order: fluids first (balanced crystalloid or saline), check the potassium, then a fixed-rate intravenous insulin infusion (about 0.1 units per kg per hour), with potassium replaced to keep it in the 4–5.5 range. Add dextrose when glucose falls to about 14 mmol/L (250 mg/dL) so insulin can continue until ketones clear. Look for the trigger (infection, missed insulin, new diabetes, SGLT2 inhibitor). Do not give insulin if potassium is below 3.3 until it has been replaced." },
  HHS: { label: "HHS", sub: "Extreme glucose, no ketosis",
    anat: "In HHS a small amount of insulin is still present, enough to stop ketone production but not enough to control glucose. Glucose climbs very high over days.",
    patho: "The very high glucose causes a profound osmotic diuresis, and the patient becomes severely dehydrated with a very high serum osmolality (often above 320 mOsm/kg), confusion or coma, and little or no ketosis. Mortality is higher than in DKA, and thrombosis is a risk.",
    interv: "Start with slow, careful fluid resuscitation. Begin a lower-dose insulin infusion after the initial fluids, once glucose stops falling with fluids alone. Avoid too rapid a fall in glucose, sodium or osmolality (rapid change risks cerebral complications). Replace potassium, give VTE prophylaxis, find the trigger, and monitor osmolality and mental state." },
};
const ORDER = ["SEP", "DIC", "ANAPH", "ACID", "DKA", "HHS"];

export default function create(S, ui) {
  const st = { tab: "SEP", f: 0, ne: false, vaso: false, hc: false, abx: false, trig: "sepsis", h: 6, cause: false, plt: false, ffp: false, lmwh: false, fz: -1, pmin: 8, adr: 0, flat: false, fl: false, neb: false, adj: false, inf: false, hco3: 10, acause: "lactic", vent: "spont", treat: false, bic: false, rrt: false, match: false, ins: false, kcl: false, dex: false, ghost: false, key: "" };
  const T = () => TABS[st.tab];
  let M = {}, V = {}, G = {}, bleed = [], thr = [], leak = [], mast = [], hx = [], F = {};

  const ell = (rx, ry, rz, col, op, p, o) => { const g = new THREE.SphereGeometry(1, 20, 14); g.scale(rx, ry, rz); const m = new THREE.Mesh(g, S.mat(col, Object.assign({ transparent: true, opacity: op, depthWrite: false }, o || {}))); if (p) m.position.set(...p); return m; };
  const tubeX = (x0, x1, r, col, op, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), S.mat(col, { transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2, y || 0, z || 0); m.scale.set(r, x1 - x0, r); m.userData.r = r; return m; };
  function build() {
    S.clear(); M = {}; V = {}; G = {}; bleed = []; thr = []; leak = []; mast = []; hx = []; F = {};
    const grp = S.add(new THREE.Group()); M.grp = grp; grp.scale.x = 1;
    M.heart = ell(0.3, 0.34, 0.26, 0xc0383f, 0.75, [-1.25, 0, 0], { emissive: 0x3a0810 }); grp.add(M.heart);
    V.art = tubeX(-1.0, -0.5, 0.075, 0xc9514e, 0.65); V.aol = tubeX(-0.5, -0.12, 0.05, 0xd9605a, 0.7); V.ven = tubeX(0.78, 1.2, 0.08, 0x6a74d8, 0.6); V.vnl = tubeX(0.45, 0.78, 0.05, 0x6a74d8, 0.65); Object.values(V).forEach((m) => grp.add(m));
    M.caps = []; for (let i = 0; i < 7; i++) { const y = -0.42 + i * 0.14, z = ((i % 3) - 1) * 0.07, m = tubeX(-0.12, 0.45, 0.028, 0xd96a64, 0.7, y, z); M.caps.push(m); grp.add(m); }
    const ret = new THREE.CatmullRomCurve3([new THREE.Vector3(1.2, 0, 0), new THREE.Vector3(1.4, -0.4, 0), new THREE.Vector3(0.3, -1.05, 0), new THREE.Vector3(-1.2, -0.9, 0), new THREE.Vector3(-1.25, -0.3, 0)]); M.ret = new THREE.Mesh(new THREE.TubeGeometry(ret, 40, 0.06, 10, false), S.mat(0x6a74d8, { transparent: true, opacity: 0.5, depthWrite: false })); grp.add(M.ret);
    M.box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.5), new THREE.MeshBasicMaterial({ color: 0xf2d27a, transparent: true, opacity: 0.05, depthWrite: false })); M.box.position.set(0.165, 0, 0); grp.add(M.box);
    /* flows */
    const mkF = (pts, n, hex, o) => { const f = S.flow(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), n, hex, o); return f; };
    F.main = mkF([[-1.0, 0, 0], [-0.5, 0, 0], [-0.12, 0, 0]], 14, 0xff6a6a, { speed: 0.25 }); F.venous = mkF([[0.45, 0, 0], [0.78, 0, 0], [1.2, 0, 0], [1.4, -0.4, 0], [0.3, -1.05, 0], [-1.2, -0.9, 0]], 14, 0x7a88ff, { speed: 0.2 });
    F.caps = M.caps.map((c) => mkF([[-0.12, c.position.y, c.position.z], [0.45, c.position.y, c.position.z]], 4, 0xff8a7a, { speed: 0.22 }));
    F.glu = mkF([[-0.5, 0.04, 0], [-0.12, 0.04, 0], [0.45, 0.04, 0.02], [0.78, 0.03, 0]], 10, 0xffd84d, { speed: 0.2 }); F.h = mkF([[-0.5, -0.04, 0], [-0.12, -0.04, 0], [0.45, -0.04, -0.02], [0.78, -0.03, 0]], 10, 0xc07cff, { speed: 0.2 });
    /* interstitial leak, bleeding, microthrombi, mast cells */
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), S.mat(0xf8e9b0, { transparent: true, opacity: 0.9 })); m.position.set(-0.05 + Math.random() * 0.45, (Math.random() - 0.5) * 0.95, (Math.random() - 0.5) * 0.4); m.userData.rnd = Math.random(); leak.push(m); grp.add(m); }
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), S.mat(0xb01020, { emissive: 0x400008 })); m.position.set(-0.05 + Math.random() * 0.5, -0.5 + Math.random() * 1.0, (Math.random() - 0.5) * 0.45); m.userData.rnd = Math.random(); bleed.push(m); grp.add(m); }
    M.caps.forEach((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), S.mat(0x2a1a2a, { emissive: 0x100810 })); m.position.set(0.05 + (i % 3) * 0.15, c.position.y, c.position.z); m.userData.rnd = (i + 1) / 8; thr.push(m); grp.add(m); });
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), S.mat(0xb06cff, { emissive: 0x301050 })); m.position.set(0.0 + i * 0.1, 0.55 - (i % 2) * 0.08, 0.2); m.userData.rnd = i; mast.push(m); grp.add(m); }
    M.air = tubeX(-0.5, 0.5, 0.09, 0xa8d8ff, 0.5, 1.35, 0); grp.add(M.air); M.air.userData.r = 0.09;
    /* gauges: MAP, pH, glucose */
    const gauge = (x, c0, c1) => { const g = new THREE.Group(); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), new THREE.MeshBasicMaterial({ vertexColors: true })); const col = []; const pos = bar.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + 0.65) / 1.3, a = new THREE.Color(c0), b = new THREE.Color(c1), k = a.lerp(b, t); col.push(k.r, k.g, k.b); } bar.geometry.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); const mk = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); g.add(bar, mk); g.position.set(x, 0, 0.35); g.userData.mk = mk; grp.add(g); return g; };
    G.map = gauge(-1.75, 0xff4040, 0x40d060); G.ph = gauge(-1.95, 0xb040ff, 0x40c0ff); G.glu = gauge(-2.15, 0x40d060, 0xffd84d);
    M.lab = [["MAP", -1.75], ["pH", -1.95], ["glucose", -2.15]].map(([t, x]) => { const s = S.label ? S.label(t, [x, 0.8, 0.35], "#ffd166") : null; if (s) grp.add(s); return s; });
    reset(); void hx;
  }
  function reset() {
    Object.assign(st, { f: 0, ne: false, vaso: false, hc: false, abx: false, cause: false, plt: false, ffp: false, lmwh: false, fz: -1, adr: 0, flat: false, fl: false, neb: false, adj: false, inf: false, treat: false, bic: false, rrt: false, match: false, ins: false, kcl: false, dex: false });
    st.h = st.tab === "ANAPH" ? 6 : st.tab === "DKA" || st.tab === "HHS" ? 0 : 8; st.pmin = 8; if (st.tab === "ACID") st.hco3 = 10; if (st.tab === "SEP") st.f = 0;
    S.view({ ry: 0.15, rx: 0.1, d: 5.6, tx: -0.3, ty: 0.1, tz: 0 }); st.key = "";
  }

  /* ---------- physiology ---------- */
  function sep() {
    const f = st.f, co = clamp(4.2 + 2.6 * (1 - Math.exp(-f / 14)) - 0.05 * Math.max(0, f - 35), 3, 9.5), svr = 500 + (st.ne ? 300 : 0) + (st.vaso ? 110 : 0) + (st.hc ? 50 : 0), map = Math.round(clamp((co * svr) / 80 + 6, 30, 100));
    const need = clamp((65 - map) / 35, 0, 1), lact = +(1.2 + 4.5 * need * (st.abx ? 0.75 : 1) + (st.abx ? 0 : 0.6)).toFixed(1), crt = +(1.8 + 4 * need).toFixed(1), uo = +clamp(0.1 + 0.9 * (1 - need), 0.05, 1).toFixed(2), leak = clamp(0.35 + 0.65 * (f / 60) * (st.abx ? 0.6 : 1) + (st.abx ? -0.1 : 0.15), 0.1, 1);
    return { co: +co.toFixed(1), svr, map, lact, crt, uo, leak, resp: f < 25, scvo2: Math.round(clamp(78 - 18 * need, 50, 78)), sbp: Math.round(map * 1.45), hr: Math.round(118 - 25 * (1 - need)) };
  }
  const R = () => ({ sepsis: 4.5, trauma: 6, obst: 7.5, malig: 2.5 }[st.trig]);
  function dic(h) {
    const r = R(); if (st.cause && st.fz < 0) st.fz = st.h; const hh = h == null ? st.h : h, he = st.cause && st.fz >= 0 ? Math.min(hh, st.fz) : hh, rec = st.cause ? Math.max(0, hh - st.fz) : 0;
    const plt = Math.round(clamp(220 - r * he * 1.1 + 3 * rec + (st.plt ? 30 : 0), 6, 260)), fib = +clamp(4.0 - 0.075 * r * he + 0.06 * rec + (st.ffp ? 1.2 : 0), 0.3, 5).toFixed(1), pt = +clamp(0.3 * r * he * 0.5 - 0.3 * rec - (st.ffp ? 2.5 : 0), 0, 18).toFixed(1), dd = r * he * 0.5 > 6 ? 3 : r * he * 0.5 > 2 ? 2 : 0;
    const score = (plt > 100 ? 0 : plt >= 50 ? 1 : 2) + dd + (pt < 3 ? 0 : pt <= 6 ? 1 : 2) + (fib > 1 ? 0 : 1);
    return { plt, fib, pt, dd, score, overt: score >= 5, bleed: score >= 5 && (plt < 50 || fib < 1.0), thrombo: clamp(score / 8, 0, 1) * (st.lmwh ? 0.8 : 1) };
  }
  function ana() {
    const base = 1 - Math.exp(-st.pmin / 6); let s = base; if (st.adr > 0) s *= Math.pow(0.3, Math.min(2, st.adr)); if (st.flat) s *= 0.9; if (st.fl) s *= 0.9; if (st.inf) s *= 0.7;
    const bron = clamp(s * 1.05, 0, 1) * (st.neb ? 0.7 : 1), sbp = Math.round(clamp(122 - 68 * s * (st.flat ? 0.9 : 1.05), 45, 125)), hr = Math.round(78 + 48 * s - (s > 0.85 ? 20 : 0));
    return { s, bron, sbp, hr, spo2: Math.round(clamp(99 - 14 * bron, 70, 100)), tryp: st.pmin > 10 ? "raised" : "rising", skin: s > 0.2 ? "urticaria, flushing" : "normal", airway: s > 0.55 ? "stridor, tongue swelling" : s > 0.25 ? "wheeze" : "clear" };
  }
  function acid() {
    const gap = { lactic: 1, keto: 1, tox: 1, renal: 1, gi: 0 }[st.acause], hco3 = clamp(st.hco3 + (st.treat ? 6 : 0) + (st.bic ? 4 : 0) + (st.rrt ? 8 : 0), 4, 26); let pco2 = 1.5 * hco3 + 8; if (st.vent === "int" && !st.match) pco2 = 40; if (st.vent === "int" && st.match) pco2 = 1.5 * hco3 + 8; if (st.bic && st.vent === "int" && !st.match) pco2 += 8;
    const ph = +(6.1 + Math.log10(hco3 / (0.03 * pco2))).toFixed(2), ag = Math.round(12 + gap * (24 - hco3) * 0.85), lact = st.acause === "lactic" ? +(1 + (24 - hco3) * (st.treat ? 0.2 : 0.35)).toFixed(1) : 1.5;
    const depr = clamp((7.3 - ph) / 0.35, 0, 1); return { hco3: Math.round(hco3), pco2: Math.round(pco2), ph, ag, lact, depr, map: Math.round(88 - 28 * depr), k: +(4.4 + (st.acause === "keto" || st.acause === "renal" ? 1.2 : 0.2) + (7.4 - ph) * 2.5).toFixed(1) };
  }
  function dka(h) {
    const hh = h == null ? st.h : h, g0 = 30, fl = st.fl ? 1 : 0; let g = g0 - (st.fl ? 5 * (1 - Math.exp(-hh / 4)) : 0) - (st.ins ? 3.2 * hh : 0); g = Math.max(g, 4.5); if (st.dex && st.ins && g < 14) g = Math.max(g, 11); const ket = st.ins ? Math.max(0.3, 5.5 - 0.55 * hh) : st.fl ? 5.5 - 0.1 * hh : 5.5 + 0.05 * hh;
    const ph = +(7.05 + (0.3 * (5.5 - ket)) / 5.2).toFixed(2), hco3 = Math.round(7 + (16 * (5.5 - ket)) / 5.2), k = +clamp(5.6 - (st.ins ? 0.45 * hh : 0) + (st.kcl ? 0.35 * hh : 0) + (fl ? -0.05 * hh : 0), 2.2, 6.6).toFixed(1), hypo = st.ins && g < 4 && !st.dex;
    return { g: +g.toFixed(1), ket: +ket.toFixed(1), ph, hco3, k, hypo, dehyd: clamp(1 - (st.fl ? 0.6 * (1 - Math.exp(-hh / 5)) : 0) + 0.0, 0.2, 1) };
  }
  function hhs(h) {
    const hh = h == null ? st.h : h; let g = 48 - (st.fl ? 12 * (1 - Math.exp(-hh / 6)) : 0) - (st.ins ? Math.min(hh, 12) * 1.6 : 0); g = Math.max(g, 8); const na = 148 - (st.fl ? 0.3 * hh : 0), osm = Math.round(2 * na + g * 1 + 8 + 0), osm0 = 2 * 148 + 48 + 8, drop = (osm0 - osm) / Math.max(hh, 1);
    return { g: +g.toFixed(1), osm, na: Math.round(na), ket: 0.5, ph: 7.34, k: +clamp(5.0 - (st.ins ? 0.2 * hh : 0) + (st.kcl ? 0.2 * hh : 0), 2.6, 6, 6).toFixed(1), fast: drop > 3.2 && hh >= 2, dehyd: clamp(1 - (st.fl ? 0.55 * (1 - Math.exp(-hh / 8)) : 0), 0.25, 1), drop };
  }

  /* ---------- scene ---------- */
  function frame(dt) {
    const t = st.tab, k = Math.min(1, dt * 2); let co = 1, dil = 0, rate = 1, leakv = 0, thv = 0, blv = 0, mastv = 0, hv = 0, gv = 0, map = 90, ph = 7.4, gl = 5, air = 0, hrz = 72;
    if (t === "SEP") { const p = sep(); co = p.co / 5.4; dil = clamp((650 - p.svr) / 400 + 0.35, 0, 1) * (st.ne ? 0.4 : 1); rate = clamp(p.co / 7, 0.2, 1); leakv = p.leak; map = p.map; hrz = p.hr; }
    else if (t === "DIC") { const d = dic(); thv = d.thrombo; blv = d.bleed ? 1 : 0; rate = 1 - 0.4 * d.thrombo; map = d.bleed ? 70 : 88; hrz = d.bleed ? 105 : 85; }
    else if (t === "ANAPH") { const a = ana(); dil = a.s; leakv = a.s; mastv = a.s; air = a.bron; rate = 1 - 0.5 * a.s; map = Math.round(a.sbp / 1.45); hrz = a.hr; }
    else if (t === "ACID") { const a = acid(); hv = clamp((7.4 - a.ph) / 0.5, 0, 1); dil = a.depr * 0.5; rate = 1 - 0.3 * a.depr; map = a.map; ph = a.ph; hrz = 100 + 20 * a.depr; }
    else if (t === "DKA") { const d = dka(); gv = clamp(d.g / 33, 0, 1); hv = clamp((7.4 - d.ph) / 0.4, 0, 1); rate = 0.5 + 0.5 * (1 - d.dehyd) + 0.2; map = Math.round(75 + 15 * (1 - d.dehyd)); ph = d.ph; gl = d.g; hrz = 110 - 20 * (1 - d.dehyd); }
    else if (t === "HHS") { const d = hhs(); gv = clamp(d.g / 50, 0, 1); rate = 0.45 + 0.55 * (1 - d.dehyd) + 0.1; map = Math.round(68 + 20 * (1 - d.dehyd)); ph = 7.34; gl = d.g; hrz = 108 - 20 * (1 - d.dehyd); }
    /* flows */
    const F2 = (f, r) => { f.rate += (clamp(r, 0, 1) - f.rate) * k; }; F2(F.main, rate); F2(F.venous, rate); F.caps.forEach((f, i) => F2(f, rate * (t === "SEP" && i % 3 === 0 ? 0.15 : 1) * (t === "DIC" && thr[i] && thr[i].userData.rnd < thv ? 0.05 : 1)));
    F2(F.glu, gv); F2(F.h, hv);
    /* vessel calibre: dilation widens arteriole and capillaries */
    const rr = (m, base, mult) => { const r = m.userData.r * (1 + mult); m.scale.x += (r - m.scale.x) * k; m.scale.z += (r - m.scale.z) * k; }; rr(V.aol, 0, 0.9 * dil); rr(V.art, 0, 0.2 * dil); M.caps.forEach((c) => rr(c, 0, 0.5 * dil)); rr(M.air, 0, -0.65 * air);
    const col = new THREE.Color().setRGB(0.85 - 0.3 * dil + 0.1 * hv, 0.32 + 0.2 * dil, 0.31 + 0.25 * dil); V.aol.material.color.copy(col);
    /* interstitium and particles */
    M.box.material.opacity = 0.05 + 0.12 * leakv + 0.1 * (t === "DKA" || t === "HHS" ? 0 : 0); leak.forEach((m) => { m.visible = m.userData.rnd < leakv; m.position.y += Math.sin(S.time() * 1.5 + m.userData.rnd * 30) * 0.0006; });
    bleed.forEach((m) => { m.visible = m.userData.rnd < blv * 0.9; }); thr.forEach((m) => { m.visible = m.userData.rnd < thv; });
    mast.forEach((m) => { m.visible = t === "ANAPH"; const s = 1 + (mastv > 0.1 ? 0.6 * Math.abs(Math.sin(S.time() * 5 + m.userData.rnd)) : 0); m.scale.setScalar(s); m.material.color.setHex(mastv > 0.15 ? 0xff6ad0 : 0xb06cff); });
    M.air.visible = t === "ANAPH"; V.ven.material.opacity = 0.6;
    /* gauges */
    const setG = (g, v, show) => { g.visible = show; g.userData.mk.position.y = -0.65 + 1.3 * clamp(v, 0, 1); }; setG(G.map, (map - 30) / 90, true); setG(G.ph, (ph - 6.8) / 0.8, t === "ACID" || t === "DKA" || t === "HHS"); setG(G.glu, gl / 50, t === "DKA" || t === "HHS");
    M.lab.forEach((l, i) => { if (l) l.visible = [true, t === "ACID" || t === "DKA" || t === "HHS", t === "DKA" || t === "HHS"][i]; });
    M.heart.scale.setScalar((1 + 0.06 * Math.sin(S.time() * (hrz / 60) * 6.28)) * (0.95 + 0.05 * co)); M.heart.material.opacity += ((st.ghost ? 0.3 : 0.75) - M.heart.material.opacity) * k;
  }
  S.hooks.push(frame); S.onGrab = () => false; S.onDrag = () => {}; S.onDrop = () => {}; S.onTap = () => {};
  const setTab = (k) => { st.tab = k; build(); };
  function setOpt(id, v) { if (id === "ghost") { st.ghost = v === "1"; return; } st[id] = v; if (id === "trig") { st.fz = -1; st.cause = false; } }
  function setT(v) { if (st.tab === "SEP") st.f = v; else if (st.tab === "ANAPH") st.pmin = v; else if (st.tab === "ACID") st.hco3 = v; else st.h = v; }
  function act(id) {
    const m = (s) => ui.refresh(s);
    if (id === "reset") { build(); return; }
    if (id === "fluid") { st.f = Math.min(60, st.f + 10); m("Fluid bolus given. Check whether the stroke volume rises (fluid responsiveness) before giving more."); }
    else if (id === "ne") { st.ne = true; m("Norepinephrine started: vessel tone is restored and the blood pressure rises."); }
    else if (id === "vaso") { st.vaso = true; m("Vasopressin added as a second agent: it spares the norepinephrine dose."); }
    else if (id === "hc") { st.hc = true; m("Hydrocortisone added for persistent vasopressor-dependent shock."); }
    else if (id === "abx") { st.abx = true; m("Antimicrobials given and the source controlled: the leak slows and the lactate falls."); }
    else if (id === "cause") { st.cause = true; st.fz = st.h; m("The cause is treated: consumption of clotting factors and platelets stops, and the counts begin to recover."); }
    else if (id === "plt") { st.plt = true; m("Platelets transfused (given because of bleeding with a low count)."); }
    else if (id === "ffp") { st.ffp = true; m("Plasma and fibrinogen given: clotting time shortens and the fibrinogen rises."); }
    else if (id === "lmwh") { st.lmwh = true; m("Prophylactic low-molecular-weight heparin started (for a patient who is not bleeding)."); }
    else if (id === "adr") { st.adr++; m("Adrenaline given intramuscularly into the thigh: vessels tighten, the airway opens and the blood pressure recovers."); }
    else if (id === "flat") { st.flat = true; m("Laid flat with legs raised: venous return improves. Do not sit or stand the patient up."); }
    else if (id === "afl") { st.fl = true; m("IV fluid bolus for hypotension: it helps the leak-driven fall in preload."); }
    else if (id === "neb") { st.neb = true; m("Nebulised bronchodilator given for wheeze."); }
    else if (id === "adj") { st.adj = true; m("Antihistamine and steroid given: adjuncts that do not treat the life-threatening features and must not delay adrenaline."); }
    else if (id === "inf") { st.inf = true; m("Adrenaline infusion started for refractory anaphylaxis, in a monitored setting."); }
    else if (id === "treat") { st.treat = true; m("The cause is treated (perfusion restored, toxin removed, or insulin started). The bicarbonate recovers."); }
    else if (id === "match") { st.match = true; st.vent = "int"; m("Minute ventilation set to match the compensation: PCO₂ falls and the pH is protected."); }
    else if (id === "bic") { st.bic = true; m("Sodium bicarbonate given: the pH rises, with extra CO₂ to be blown off by the ventilator."); }
    else if (id === "rrt") { st.rrt = true; m("Dialysis started: acid and solutes are cleared and the bicarbonate rises."); }
    else if (id === "fluidD") { st.fl = true; m("Fluids started: the circulation fills and the glucose begins to dilute and fall."); }
    else if (id === "ins") { st.ins = true; m("Insulin infusion started. Glucose falls; potassium moves into cells, so watch it."); }
    else if (id === "kcl") { st.kcl = true; m("Potassium replaced: the serum level is kept in the safe range during insulin treatment."); }
    else if (id === "dex") { st.dex = true; m("Dextrose added: insulin can continue to clear ketones without hypoglycaemia."); }
  }

  /* ---------- readout ---------- */
  const tone = (v, bad, warn, hi) => (hi ? (v >= bad ? "bad" : v >= warn ? "warn" : "ok") : v <= bad ? "bad" : v <= warn ? "warn" : "ok");
  function obs() {
    const t = st.tab, r = []; let body = {}, note = "", ecg = null;
    const kEcg = (k, hr) => { if (k >= 6.0 || k <= 3.2) return { leads: [E("II", k >= 6 ? { t: 1.0 } : { t: 0.1, st: -0.15 }), E("V2", k >= 6 ? { t: 1.1 } : { t: 0.1, st: -0.2 }), E("V4", k >= 6 ? { t: 1.0 } : { t: 0.1 }), E("V5", k >= 6 ? { t: 0.9 } : { t: 0.1 })], h: 200, beat: +(60 / hr).toFixed(2) }; return null; };
    if (t === "SEP") { const p = sep(); r.push({ k: "MAP", v: p.map + " mmHg", tone: tone(p.map, 55, 65, false) }, { k: "Cardiac output", v: p.co + " L/min", tone: p.co < 4 ? "bad" : "ok" }, { k: "Systemic resistance", v: p.svr + " dyn·s/cm⁵", tone: p.svr < 600 ? "warn" : "ok" }, { k: "Lactate", v: p.lact + " mmol/L", tone: tone(p.lact, 4, 2, true) }, { k: "Capillary refill", v: p.crt + " s", tone: p.crt > 3 ? "bad" : "ok" }, { k: "Urine output", v: p.uo + " mL/kg/h", tone: p.uo < 0.5 ? "bad" : "ok" }, { k: "Fluid given", v: st.f + " mL/kg", tone: "info" }, { k: "Fluid responsive?", v: p.resp ? "yes: stroke volume still rising" : "no: more fluid will only leak", tone: p.resp ? "ok" : "warn" }); body = { heart: p.map < 65 ? 2 : 1, "kidney-R": p.uo < 0.5 ? 3 : 1, "kidney-L": p.uo < 0.5 ? 3 : 1, abdomen: p.lact > 4 ? 2 : 0, brain: p.map < 55 ? 2 : 0 }; note = p.map < 65 && p.resp ? "Hypotensive and fluid-responsive: give a measured bolus and reassess." : p.map < 65 ? "Fluid is no longer helping and the leak is rising: add a vasopressor." : !st.abx ? "Perfusion is recovering, but the infection is still untreated: antimicrobials and source control." : "Targets are met. Reassess perfusion (capillary refill, lactate, urine output)."; }
    if (t === "DIC") { const d = dic(); r.push({ k: "ISTH DIC score", v: d.score + " / 8" + (d.overt ? " (overt DIC)" : ""), tone: d.overt ? "bad" : d.score >= 3 ? "warn" : "ok" }, { k: "Platelets", v: d.plt + " ×10⁹/L", tone: tone(d.plt, 50, 100, false) }, { k: "Fibrinogen", v: d.fib + " g/L", tone: tone(d.fib, 1, 2, false) }, { k: "PT prolongation", v: d.pt + " s", tone: d.pt > 6 ? "bad" : d.pt > 3 ? "warn" : "ok" }, { k: "D-dimer", v: d.dd >= 3 ? "strongly raised" : d.dd >= 2 ? "moderately raised" : "normal", tone: d.dd >= 3 ? "bad" : d.dd >= 2 ? "warn" : "ok" }, { k: "Bleeding", v: d.bleed ? "yes" : "no", tone: d.bleed ? "bad" : "ok" }, { k: "Microthrombi", v: d.thrombo > 0.5 ? "widespread" : d.thrombo > 0.2 ? "some" : "few", tone: d.thrombo > 0.5 ? "bad" : "info" }); body = { chest: d.thrombo > 0.5 ? 1 : 0, "kidney-R": d.thrombo > 0.5 ? 2 : 0, "kidney-L": d.thrombo > 0.5 ? 2 : 0, brain: d.bleed ? 2 : 0, abdomen: d.bleed ? 2 : 0, "leg-R": d.thrombo > 0.6 ? 2 : 0, "leg-L": d.thrombo > 0.6 ? 2 : 0 }; note = !st.cause ? "Treat the cause first. Replace blood products only for bleeding or a high bleeding risk." : d.bleed ? "Bleeding with low counts: platelets and plasma or fibrinogen, and keep treating the cause." : "The cause is treated and the counts are recovering. Watch for thrombosis and rebound."; }
    if (t === "ANAPH") { const a = ana(); r.push({ k: "Time since exposure", v: st.pmin + " min", tone: "info" }, { k: "Systolic BP · HR", v: a.sbp + " · " + a.hr + "/min", tone: a.sbp < 90 ? "bad" : "ok" }, { k: "SpO₂", v: a.spo2 + "%", tone: a.spo2 < 92 ? "bad" : "ok" }, { k: "Airway", v: a.airway, tone: a.s > 0.55 ? "bad" : a.s > 0.25 ? "warn" : "ok" }, { k: "Skin", v: a.skin, tone: a.s > 0.2 ? "warn" : "ok" }, { k: "Tryptase", v: a.tryp + " (if sampled)", tone: "info" }, { k: "Adrenaline doses", v: st.adr + " IM", tone: st.adr ? "ok" : "bad" }); body = { neck: a.s > 0.5 ? 3 : a.s > 0.2 ? 2 : 0, "lung-R": a.bron > 0.4 ? 3 : 1, "lung-L": a.bron > 0.4 ? 3 : 1, heart: a.sbp < 90 ? 2 : 0, "face-R": a.s > 0.3 ? 2 : 0, "face-L": a.s > 0.3 ? 2 : 0 }; note = st.adr === 0 && a.s > 0.2 ? "Give adrenaline intramuscularly now. Delay is the main risk factor for death." : a.sbp < 90 ? "Still hypotensive: repeat adrenaline in about 5 minutes, add fluid, and consider an infusion." : "Responding. Keep the patient under observation: a biphasic reaction can follow."; }
    if (t === "ACID") { const a = acid(); r.push({ k: "pH", v: a.ph.toFixed(2), tone: a.ph < 7.1 ? "bad" : a.ph < 7.2 ? "warn" : "ok" }, { k: "Bicarbonate", v: a.hco3 + " mmol/L", tone: tone(a.hco3, 8, 15, false) }, { k: "PCO₂", v: a.pco2 + " mmHg" + (st.vent === "int" && !st.match ? " (not compensating)" : ""), tone: a.pco2 > 40 ? "bad" : "ok" }, { k: "Anion gap", v: a.ag + " mmol/L", tone: a.ag > 16 ? "warn" : "ok" }, { k: "Lactate", v: a.lact + " mmol/L", tone: a.lact > 4 ? "bad" : "info" }, { k: "Mean BP", v: a.map + " mmHg", tone: a.map < 65 ? "bad" : "ok" }, { k: "Potassium (acidaemia shift)", v: a.k + " mmol/L", tone: a.k > 5.8 ? "bad" : "info" }); body = { heart: a.depr > 0.5 ? 3 : a.depr > 0.2 ? 2 : 0, "lung-R": 1, "lung-L": 1, "kidney-R": st.acause === "renal" ? 3 : 0, "kidney-L": st.acause === "renal" ? 3 : 0, brain: a.ph < 7.1 ? 2 : 0 }; note = a.ph < 7.1 && st.vent === "int" && !st.match ? "Intubated without matching minute ventilation: the compensation is lost and the pH has crashed. Raise the ventilation." : a.ph < 7.2 ? "Severe acidaemia: treat the cause; consider bicarbonate if the AKI is present; dialysis if refractory." : "Acidosis is mild to moderate and compensated. Treat the cause."; ecg = kEcg(a.k, 100 + 20 * a.depr); }
    if (t === "DKA") { const d = dka(); r.push({ k: "Hours of treatment", v: st.h + " h", tone: "info" }, { k: "Glucose", v: d.g + " mmol/L (" + Math.round(d.g * 18) + " mg/dL)", tone: d.g < 4 ? "bad" : d.g > 20 ? "warn" : "ok" }, { k: "Ketones (BOHB)", v: d.ket + " mmol/L", tone: d.ket > 3 ? "bad" : d.ket > 0.6 ? "warn" : "ok" }, { k: "pH · HCO₃", v: d.ph.toFixed(2) + " · " + d.hco3 + " mmol/L", tone: d.ph < 7.1 ? "bad" : d.ph < 7.3 ? "warn" : "ok" }, { k: "Potassium", v: d.k + " mmol/L", tone: d.k < 3.3 || d.k > 6 ? "bad" : d.k < 4 || d.k > 5.5 ? "warn" : "ok" }, { k: "Dehydration", v: d.dehyd > 0.7 ? "severe" : d.dehyd > 0.45 ? "moderate" : "corrected", tone: d.dehyd > 0.7 ? "bad" : "info" }); body = { heart: d.k < 3.5 || d.k > 6 ? 3 : 0, brain: d.ph < 7.1 ? 2 : 0, abdomen: d.ket > 3 ? 1 : 0, "kidney-R": d.dehyd > 0.7 ? 2 : 0, "kidney-L": d.dehyd > 0.7 ? 2 : 0 }; note = st.ins && d.k < 3.3 ? "Insulin has driven the potassium below 3.3: stop the insulin and replace potassium first." : d.hypo ? "Hypoglycaemia: add dextrose and keep the insulin running to clear ketones." : !st.fl ? "Fluids first, then check the potassium, then insulin." : !st.ins ? "Fluids are running. Check the potassium, then start fixed-rate insulin." : d.ket < 0.6 && d.ph > 7.3 ? "Ketones cleared: DKA has resolved. Transition to subcutaneous insulin with overlap." : "Treatment on track. Keep dextrose and potassium in step with the insulin."; ecg = kEcg(d.k, 100); }
    if (t === "HHS") { const d = hhs(); r.push({ k: "Hours of treatment", v: st.h + " h", tone: "info" }, { k: "Glucose", v: d.g + " mmol/L (" + Math.round(d.g * 18) + " mg/dL)", tone: d.g > 33 ? "bad" : d.g > 20 ? "warn" : "ok" }, { k: "Effective osmolality", v: d.osm + " mOsm/kg", tone: d.osm > 320 ? "bad" : d.osm > 300 ? "warn" : "ok" }, { k: "Sodium (corrected)", v: d.na + " mmol/L", tone: d.na > 150 ? "warn" : "ok" }, { k: "Ketones · pH", v: d.ket + " mmol/L · " + d.ph, tone: "ok" }, { k: "Potassium", v: d.k + " mmol/L", tone: d.k < 3.3 ? "bad" : d.k < 4 ? "warn" : "ok" }, { k: "Fall in osmolality", v: d.drop.toFixed(1) + " mOsm/kg/h" + (d.fast ? " (too fast)" : ""), tone: d.fast ? "bad" : "info" }); body = { brain: d.osm > 320 ? 3 : d.osm > 300 ? 2 : 0, "kidney-R": d.dehyd > 0.6 ? 2 : 0, "kidney-L": d.dehyd > 0.6 ? 2 : 0, heart: d.k < 3.3 ? 3 : 0 }; note = d.fast ? "Osmolality is falling too fast: slow the fluid or insulin to protect the brain." : !st.fl ? "Fluids first, slowly. Insulin comes after the initial resuscitation." : !st.ins ? "Fluids are working. Start lower-dose insulin when the glucose stops falling with fluids alone." : "Glucose and osmolality are falling steadily. Keep replacing potassium and give VTE prophylaxis."; ecg = kEcg(d.k, 100); }
    return { params: r, body, marks: {}, note, ecg: ecg || undefined };
  }
  function E(n, o) { return Object.assign({ n, r: 1, st: 0, t: 0.35, q: 0 }, o); }
  const info = () => ({ anat: T().anat, patho: T().patho, interv: T().interv });
  function clin() {
    const t = st.tab, L = {
      SEP: ["Sepsis with persisting hypotension needing a vasopressor to keep MAP at about 65 mmHg, and a lactate above 2 mmol/L despite resuscitation. Use capillary refill, lactate trend, urine output, and a dynamic test (passive leg raise or pulse-pressure variation) to judge fluid responsiveness.", "Surviving Sepsis Campaign (2026 update): early antimicrobials, source control, balanced crystalloid guided by fluid responsiveness, norepinephrine first line, vasopressin as a second agent, hydrocortisone for ongoing vasopressor need. Follow your local sepsis pathway."],
      DIC: ["Overt DIC by the ISTH score of 5 or more: platelet count, D-dimer, prothrombin time and fibrinogen, in a patient with a recognised trigger. Repeat the tests, because the trend matters.", "ISTH 2025 update: treat the underlying cause; transfuse platelets, plasma or fibrinogen for bleeding or a high bleeding risk and not for numbers alone; consider prophylactic low-molecular-weight heparin in non-bleeding patients. Antifibrinolytics are not routine."],
      ANAPH: ["Acute onset skin or mucosal signs with airway, breathing or circulation compromise after a likely trigger, or low blood pressure after a known allergen. Serum tryptase at 1–2 hours supports the diagnosis but must not delay treatment.", "Intramuscular adrenaline into the anterolateral thigh first, repeated after about 5 minutes if needed; airway, oxygen, legs raised, IV fluid, nebulised bronchodilator; antihistamine and steroid are second-line. Observe, and arrange allergy follow-up and an adrenaline auto-injector."],
      ACID: ["Arterial blood gas: pH, PCO₂ and bicarbonate; anion gap and lactate; use Winter's formula (expected PCO₂ about 1.5 × HCO₃ + 8) to check the compensation. Look for a mixed disorder.", "Treat the cause. For the intubated patient, match the minute ventilation. Bicarbonate: not routine; consider for severe acidaemia (about pH 7.2 or less), especially with AKI, per current trial evidence. Renal replacement therapy for toxins, refractory acidosis or overload."],
      DKA: ["Glucose above about 11 mmol/L (200 mg/dL) or known diabetes, ketones above 3 mmol/L (or ketonuria), and pH below 7.3 or bicarbonate below 18 mmol/L. Euglycaemic DKA occurs with SGLT2 inhibitors.", "ADA/EASD/JBDS 2024 consensus: IV fluids first; potassium check before insulin; fixed-rate IV insulin (about 0.1 units/kg/h); potassium replacement to keep 4–5.5 mmol/L; dextrose when glucose is about 14 mmol/L; continue until ketones and pH have normalised; then overlapping subcutaneous insulin."],
      HHS: ["Glucose above about 33 mmol/L (600 mg/dL), effective osmolality above about 320 mOsm/kg, no significant ketosis, and marked dehydration with altered consciousness.", "ADA/EASD/JBDS 2024 consensus: careful fluid resuscitation first; lower-dose insulin after initial fluids, once glucose stops falling; avoid a rapid fall in osmolality; replace potassium; VTE prophylaxis; treat the trigger."],
    }[t];
    return { lines: [["Diagnosis", L[0]], ["Management", L[1]], ["Reference", "Surviving Sepsis Campaign 2026; ISTH 2025 DIC update; 2024 ADA/EASD/JBDS hyperglycaemic crises consensus; current anaphylaxis guidance; local protocols. Numbers are illustrative."]], draw: (el) => draw(el) };
  }
  function draw(el) {
    const mk = (title, f) => { const d = document.createElement("div"); d.className = "img"; const c = document.createElement("canvas"); c.width = 300; c.height = 300; const tt = document.createElement("small"); tt.textContent = title; d.append(c, tt); el.append(d); f(c.getContext("2d")); };
    const t = st.tab, axes = (g) => { g.fillStyle = "#0a0f16"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.moveTo(34, 20); g.lineTo(34, 270); g.lineTo(290, 270); g.stroke(); }, cap = (g, s) => { g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(s, 8, 292); };
    if (t === "SEP") mk("Fluid response (Frank–Starling)", (g) => { axes(g); g.strokeStyle = "#7ec8ff"; g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= 250; x++) { const f = (x / 250) * 60, co = 4.2 + 2.6 * (1 - Math.exp(-f / 14)) - 0.05 * Math.max(0, f - 35), y = 270 - (co / 9) * 230; x ? g.lineTo(34 + x, y) : g.moveTo(34 + x, y); } g.stroke(); const p = sep(); g.fillStyle = "#fff"; g.beginPath(); g.arc(34 + (st.f / 60) * 250, 270 - (p.co / 9) * 230, 6, 0, 7); g.fill(); cap(g, "output rises, then plateaus; more fluid leaks (" + st.f + " mL/kg)"); });
    if (t === "DIC") mk("Coagulation panel", (g) => { axes(g); const d = dic(), bars = [["Plt", d.plt / 250, d.plt < 50], ["Fib", d.fib / 4.5, d.fib < 1], ["PT↑", d.pt / 12, d.pt > 6], ["Score", d.score / 8, d.score >= 5]]; bars.forEach((b, i) => { g.fillStyle = b[2] ? "#ff6b6b" : "#7ec8ff"; g.fillRect(50 + i * 62, 270 - clamp(b[1], 0, 1) * 230, 42, clamp(b[1], 0, 1) * 230); g.fillStyle = "#e8e8e8"; g.font = "600 11px system-ui"; g.fillText(b[0], 56 + i * 62, 286); }); cap(g, ""); });
    if (t === "ANAPH") mk("Blood pressure over time (untreated vs now)", (g) => { axes(g); g.strokeStyle = "#555"; g.beginPath(); for (let x = 0; x <= 250; x++) { const m = (x / 250) * 30, s = 1 - Math.exp(-m / 6), y = 270 - (clamp(122 - 68 * s * 1.05, 45, 125) / 140) * 230; x ? g.lineTo(34 + x, y) : g.moveTo(34 + x, y); } g.stroke(); const a = ana(); g.fillStyle = "#fff"; g.beginPath(); g.arc(34 + (st.pmin / 30) * 250, 270 - (a.sbp / 140) * 230, 6, 0, 7); g.fill(); cap(g, "grey: untreated; dot: now (SBP " + a.sbp + ")"); });
    if (t === "ACID") mk("pH vs bicarbonate (Davenport-style)", (g) => { axes(g); [[40, "#555"], [20, "#7a6a3a"]].forEach(([p, c]) => { g.strokeStyle = c; g.beginPath(); for (let x = 0; x <= 250; x++) { const hc = 4 + (x / 250) * 24, ph = 6.1 + Math.log10(hc / (0.03 * p)); const y = 270 - ((ph - 6.8) / 0.8) * 230; x ? g.lineTo(34 + x, y) : g.moveTo(34 + x, y); } g.stroke(); }); const a = acid(); g.fillStyle = "#fff"; g.beginPath(); g.arc(34 + ((a.hco3 - 4) / 24) * 250, 270 - ((a.ph - 6.8) / 0.8) * 230, 6, 0, 7); g.fill(); cap(g, "grey line PCO₂ 40, brown PCO₂ 20; pH " + a.ph.toFixed(2)); });
    if (t === "DKA" || t === "HHS") mk(t === "DKA" ? "Glucose and ketones over 24 h" : "Glucose and osmolality over 24 h", (g) => { axes(g); const ev = (h) => (t === "DKA" ? dka(h) : hhs(h)); [["g", "#ffd84d", t === "DKA" ? 34 : 52], [t === "DKA" ? "ket" : "osm", "#ff9a5c", t === "DKA" ? 6 : 360]].forEach(([k, c, mx]) => { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= 250; x++) { const v = ev((x / 250) * 24)[k], y = 270 - clamp(v / mx, 0, 1) * 230; x ? g.lineTo(34 + x, y) : g.moveTo(34 + x, y); } g.stroke(); }); g.fillStyle = "#fff"; g.fillRect(34 + (st.h / 24) * 250 - 1, 30, 2, 240); cap(g, "yellow glucose, orange " + (t === "DKA" ? "ketones" : "osmolality") + "; white line now"); });
  }

  const lab = {
    id: "shock", name: "Shock & Metabolic Crisis Lab", tag: "Septic shock, DIC, anaphylaxis, acidosis, DKA, HHS", icon: "🩸", tabs: ORDER.map((k) => ({ id: k, label: TABS[k].label, sub: TABS[k].sub })), get tab() { return st.tab; },
    selectHint: "Watch the capillary bed on the right: vessel width, flow, leak, clots and bleeding change with the physiology. Gauges on the left show MAP, pH and glucose.",
    opts: () => {
      const o = [];
      if (st.tab === "DIC") o.push({ id: "trig", label: "Trigger", cur: st.trig, choices: [["sepsis", "Sepsis"], ["trauma", "Trauma"], ["obst", "Obstetric"], ["malig", "Malignancy"]] });
      if (st.tab === "ACID") { o.push({ id: "acause", label: "Cause", cur: st.acause, choices: [["lactic", "Lactic (shock)"], ["keto", "Ketoacidosis"], ["renal", "Renal failure"], ["tox", "Toxic alcohol"], ["gi", "Diarrhoea (no gap)"]] }); o.push({ id: "vent", label: "Breathing", cur: st.vent, choices: [["spont", "Spontaneous (compensating)"], ["int", "Intubated"]] }); }
      return o;
    },
    slider: () => st.tab === "SEP" ? { id: "f", label: "Fluid given (mL/kg)", min: 0, max: 60, step: 5, v: st.f, unit: " mL/kg" } : st.tab === "ANAPH" ? { id: "p", label: "Minutes since exposure", min: 0, max: 30, step: 1, v: st.pmin, unit: " min" } : st.tab === "ACID" ? { id: "b", label: "Starting bicarbonate (mmol/L)", min: 4, max: 24, step: 1, v: st.hco3, unit: "" } : { id: "h", label: "Hours of treatment", min: 0, max: 24, step: 1, v: st.h, unit: " h" },
    actions: () => {
      const a = [];
      if (st.tab === "SEP") a.push({ id: "fluid", label: "FLUID BOLUS", hint: "10 mL/kg at a time, then reassess.", off: st.f >= 60 }, { id: "ne", label: "NOREPINEPHRINE", hint: "First-line vasopressor.", off: st.ne }, { id: "vaso", label: "VASOPRESSIN", hint: "Second agent.", off: st.vaso || !st.ne }, { id: "hc", label: "HYDROCORTISONE", hint: "Persistent shock on vasopressors.", off: st.hc || !st.ne }, { id: "abx", label: "ANTIBIOTICS + SOURCE", hint: "As early as possible.", off: st.abx });
      if (st.tab === "DIC") a.push({ id: "cause", label: "TREAT THE CAUSE", hint: "Always first.", off: st.cause }, { id: "plt", label: "PLATELETS", hint: "If bleeding with a low count.", off: st.plt }, { id: "ffp", label: "PLASMA + FIBRINOGEN", hint: "If bleeding.", off: st.ffp }, { id: "lmwh", label: "LMWH (PROPHYLAXIS)", hint: "Not if bleeding.", off: st.lmwh });
      if (st.tab === "ANAPH") a.push({ id: "adr", label: "ADRENALINE IM", hint: "Thigh. Repeat after about 5 min.", off: st.adr >= 2 }, { id: "flat", label: "LAY FLAT, LEGS UP", hint: "Never sit up.", off: st.flat }, { id: "afl", label: "IV FLUID", hint: "For hypotension.", off: st.fl }, { id: "neb", label: "NEBULISED SALBUTAMOL", hint: "For wheeze.", off: st.neb }, { id: "adj", label: "ANTIHISTAMINE + STEROID", hint: "Adjuncts only.", off: st.adj }, { id: "inf", label: "ADRENALINE INFUSION", hint: "Refractory only.", off: st.inf || st.adr < 1 });
      if (st.tab === "ACID") a.push({ id: "treat", label: "TREAT THE CAUSE", hint: "Always first.", off: st.treat }, { id: "match", label: "MATCH VENTILATION", hint: "In the intubated patient.", off: st.match || st.vent !== "int" }, { id: "bic", label: "SODIUM BICARBONATE", hint: "Severe, especially with AKI.", off: st.bic }, { id: "rrt", label: "DIALYSIS", hint: "Refractory, toxic or renal.", off: st.rrt });
      if (st.tab === "DKA") a.push({ id: "fluidD", label: "IV FLUIDS", hint: "First.", off: st.fl }, { id: "kcl", label: "POTASSIUM", hint: "Keep 4–5.5.", off: st.kcl }, { id: "ins", label: "INSULIN 0.1 U/kg/h", hint: "After K check.", off: st.ins }, { id: "dex", label: "ADD DEXTROSE", hint: "When glucose about 14.", off: st.dex });
      if (st.tab === "HHS") a.push({ id: "fluidD", label: "IV FLUIDS (SLOW)", hint: "First.", off: st.fl }, { id: "kcl", label: "POTASSIUM", hint: "Replace.", off: st.kcl }, { id: "ins", label: "LOW-DOSE INSULIN", hint: "After fluids.", off: st.ins });
      a.push({ id: "reset", label: "RESET", hint: "Start again.", off: false }); return a;
    },
    dragHint: "No dragging in this lab: choose the treatments with the buttons and watch the capillary bed.",
    views: [{ id: "front", label: "All", f: () => ({ ry: 0.15, rx: 0.1, d: 5.6, tx: -0.3, ty: 0.1 }) }, { id: "bed", label: "Capillary bed", f: () => ({ ry: 0.4, rx: 0.2, d: 2.6, tx: 0.2, ty: 0 }) }, { id: "heart", label: "Heart", f: () => ({ ry: 0.1, rx: 0.1, d: 3.0, tx: -1.1, ty: 0 }) }],
    legend: [["#d96a64", "Arterial blood"], ["#6a74d8", "Venous blood"], ["#f8e9b0", "Leaked fluid"], ["#b01020", "Bleeding"], ["#2a1a2a", "Microthrombi"], ["#ffd84d", "Glucose"], ["#c07cff", "Acid (H⁺)"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ st }), tabLabel: () => T().label,
  };
  build();
  return lab;
}
