/* PULMONARY EMBOLISM LAB on the PATHODYNAMICS engine.
   Place the clot, watch the right ventricle strain and the oxygen fall, then reperfuse by catheter, lysis or anticoagulation.
   Teaching model: what matters is how much of the pulmonary arterial bed is blocked, how much RV reserve the patient has, and how long it lasts.
   Content aligned to the 2026 AHA/ACC acute PE guideline and its Clinical Categories (checked Nov 2026 against the published summaries). All numbers are illustrative, not patient data. */
import { THREE, C } from "../stage.js?v=20261126gj";
import { clotKit, vessels, halo, clamp } from "./common.js?v=20261126gj";
import { organ } from "../anatomy.js?v=20261126gj";

const SITES = {
  SADDLE: { label: "Saddle", sub: "At the PA bifurcation", vessel: "PA", u: 0.97, big: true, tags: { rul: 1, rml: 1, rll: 1, lul: 1, lll: 1 }, burden: 0.62, lysis: 0.7,
    anat: "A saddle embolus straddles the bifurcation of the main pulmonary artery into the right and left pulmonary arteries, so it can obstruct flow to both lungs at once.",
    patho: "The right ventricle suddenly faces a very high afterload. It dilates, the septum bows into the left ventricle, left-heart filling and cardiac output fall, and the coronary perfusion of the thin RV wall drops. Hypotension, hypoxaemia and collapse can follow within minutes to hours.",
    interv: "Patients with this picture are managed in a resuscitation setting with a multidisciplinary PE response team. Options in the first hours include systemic thrombolysis, catheter-directed therapy, surgical embolectomy and mechanical circulatory support, chosen by haemodynamics, bleeding risk and local expertise." },
  MAIN: { label: "Main PA", sub: "Right pulmonary artery", vessel: "RPA", u: 0.55, tags: { rul: 1, rml: 1, rll: 1 }, burden: 0.4, lysis: 0.7,
    anat: "The right and left main pulmonary arteries carry the whole output of the right ventricle to each lung. Here the right main pulmonary artery is blocked.",
    patho: "The whole right lung loses perfusion. The blocked lung is still ventilated, so it becomes dead space and ventilation–perfusion mismatch causes hypoxaemia. The RV afterload rises, and the strain depends on the reserve of the heart and lungs.",
    interv: "Anticoagulation for everyone without contraindication. Reperfusion therapy (thrombolysis or catheter-directed therapy) is reserved for patients with haemodynamic compromise or a high risk of deterioration." },
  LOBAR: { label: "Lobar", sub: "Right lower lobe", vessel: "RLL", u: 0.55, tags: { rll: 1 }, burden: 0.2, lysis: 0.6,
    anat: "A lobar pulmonary artery supplies one lobe. The figure shows the right lower lobe artery.",
    patho: "One lobe loses perfusion: pleuritic chest pain, breathlessness, mild hypoxaemia. The RV usually copes in a patient with healthy lungs and heart. Pulmonary infarction (a peripheral wedge) can develop in some patients.",
    interv: "Anticoagulation; hospital or home treatment depends on severity scores, comorbidity and biomarkers." },
  SEG: { label: "Segmental", sub: "Posterior basal segment", vessel: "RLLa", u: 0.6, tags: { rll: 0.35 }, burden: 0.08, lysis: 0.5,
    anat: "Segmental arteries supply the bronchopulmonary segments, each a pyramid of lung with its apex towards the hilum.",
    patho: "A small peripheral perfusion defect, often with pleuritic pain or haemoptysis from a small infarct. Oxygen levels and the RV are usually normal.",
    interv: "Anticoagulation. Isolated segmental clots in a low-risk patient are still treated, with the decision individualised." },
  SUB: { label: "Subsegmental", sub: "Distal twig", vessel: "RLLc", u: 0.6, tags: { rll: 0.1 }, burden: 0.03, lysis: 0.4,
    anat: "Subsegmental arteries are the small distal branches, often only seen on high-resolution CT pulmonary angiography.",
    patho: "A tiny perfusion defect with little or no physiological effect. Some are incidental findings and the clinical significance is debated.",
    interv: "Management is individualised: anticoagulation is considered for patients with risk factors, symptoms, or proximal deep-vein thrombosis; surveillance can be an option in low-risk patients." },
};
const TABS = ["SADDLE", "MAIN", "LOBAR", "SEG", "SUB"];
const LOBES = { rul: [[-1.02, 0.6, 0.0], [0.5, 0.46, 0.5]], rml: [[-1.18, 0.02, 0.22], [0.46, 0.3, 0.42]], rll: [[-0.98, -0.6, -0.12], [0.55, 0.62, 0.55]], lul: [[1.02, 0.55, 0.0], [0.5, 0.52, 0.5]], lll: [[0.98, -0.52, -0.1], [0.52, 0.62, 0.55]] };

export default function create(S, ui) {
  const st = { tab: "MAIN", reserve: "normal", t: 4, hep: false, lysed: false, cdt: false, removed: false, reper: 0, rAt: null, rec: 0, ghost: false, pulse: 0, shock: false };
  const site = () => SITES[st.tab];
  let M = {}, V = {}, F = {}, tis = [], kit = null, rv = null, dirty = true, accT = 0, LG = null, HT = null;
  organ("heart", { fit: { c: [0, 0, 0], r: [0.3, 0.37, 0.26] } }).then((g) => { HT = g; if (M.grp) build(); }).catch(() => {});
  organ("lung", { bigX: -1, fit: { c: [-0.04, -0.05, 0], r: [1.5, 1.17, 0.58] } }).then((g) => { LG = g; if (M.grp) build(); }).catch(() => {});   /* real lungs (BodyParts3D); each vertex takes the lobe it is nearest to */
  const LOBE = (P, id) => { const [c, r] = LOBES[id]; return Math.hypot((P.x - c[0]) / r[0], (P.y - c[1]) / r[1], (P.z - c[2]) / r[2]); };

  function build() {
    S.clear(); M = {}; V = {}; F = {}; tis = []; kit = null;
    const grp = S.add(new THREE.Group()); M.grp = grp;
    const lobeStyle = (id, c, r) => (P) => { const hx = (P.x - c[0]) / r[0], d = Math.hypot(hx, (P.y - c[1]) / r[1], (P.z - c[2]) / r[2]); return { tag: id, rank: clamp(0.35 + 0.65 * Math.abs(hx) * Math.min(d, 1.4) / 1.4 * 1.4, 0, 1), h: 0.5 + 0.5 * Math.sin(6 * P.x + 3 * P.y) * Math.sin(5 * P.z + 2 * P.y + 1), sh: 0.88 + 0.12 * Math.sin(17 * P.x) * Math.sin(15 * P.y) * Math.sin(13 * P.z) }; };
    if (LG) {
      const ids = Object.keys(LOBES), st0 = {}; ids.forEach((id) => (st0[id] = lobeStyle(id, LOBES[id][0], LOBES[id][1])));
      const t = S.tissue(LG.clone(), 0xe8a3ab, (P) => { let best = ids[0], bd = 1e9; ids.forEach((id) => { const d = LOBE(P, id); if (d < bd) { bd = d; best = id; } }); return st0[best](P); }, { transparent: true, opacity: 0.55, depthWrite: false });
      t.mesh.userData.hemi = 1; t.mesh.renderOrder = 2; grp.add(t.mesh); tis.push(t);
    } else Object.entries(LOBES).forEach(([id, [c, r]]) => {
      const g = new THREE.SphereGeometry(1, 40, 30); g.scale(...r); g.translate(...c);
      const t = S.tissue(g, 0xe8a3ab, lobeStyle(id, c, r), { transparent: true, opacity: 0.42, depthWrite: false });
      t.mesh.userData.hemi = 1; t.mesh.renderOrder = 2; grp.add(t.mesh); tis.push(t);
    });
    const hg = new THREE.SphereGeometry(1, 36, 28); hg.scale(0.28, 0.34, 0.24); hg.translate(0.05, -0.38, 0.28); rv = new THREE.Mesh(HT ? HT.clone() : hg, S.mat(0xa94d57)); if (HT) rv.position.set(0.05, -0.38, 0.28); rv.userData.base = new THREE.Color(0xa94d57); grp.add(rv);
    const trachea = S.tube([[0, 1.25, 0.0], [0, 0.75, 0.0], [0, 0.5, -0.05]], 0.09, 0xcfd8e8, { op: 0.8 }); grp.add(trachea); [[-1, 0.5], [1, 0.5]].forEach(([s]) => grp.add(S.tube([[0, 0.5, -0.05], [s * 0.35, 0.35, -0.05], [s * 0.7, 0.1, -0.05]], 0.05, 0xcfd8e8, { op: 0.8 })));
    const defs = [
      ["PA", [[0.05, -0.05, 0.4], [0.03, 0.2, 0.38], [0.0, 0.48, 0.32]], 0.1],
      ["RPA", [[0, 0.5, 0.3], [-0.4, 0.58, 0.25], [-0.75, 0.5, 0.2]], 0.07], ["LPA", [[0, 0.5, 0.3], [0.4, 0.62, 0.2], [0.75, 0.5, 0.12]], 0.07],
      ["RUL", [[-0.75, 0.5, 0.2], [-0.9, 0.8, 0.15], [-1.02, 1.0, 0.0]], 0.045], ["RML", [[-0.75, 0.5, 0.2], [-1.0, 0.2, 0.34], [-1.2, 0.0, 0.4]], 0.045],
      ["RLL", [[-0.75, 0.5, 0.2], [-0.85, 0.0, 0.1], [-0.95, -0.5, -0.05], [-1.0, -0.95, -0.1]], 0.05],
      ["RLLa", [[-0.88, -0.2, 0.05], [-0.7, -0.6, -0.3], [-0.55, -0.98, -0.45]], 0.03], ["RLLb", [[-0.95, -0.5, -0.05], [-1.2, -0.7, -0.1], [-1.42, -0.92, -0.2]], 0.03], ["RLLc", [[-0.7, -0.6, -0.3], [-0.9, -0.85, -0.42], [-1.0, -1.05, -0.4]], 0.018],
      ["LUL", [[0.75, 0.5, 0.12], [0.9, 0.8, 0.1], [1.02, 1.0, 0.0]], 0.045], ["LLL", [[0.75, 0.5, 0.12], [0.85, 0.0, 0.05], [0.95, -0.5, -0.05], [1.0, -0.95, -0.1]], 0.05],
      ["LLLa", [[0.95, -0.5, -0.05], [0.75, -0.75, -0.3], [0.6, -1.0, -0.45]], 0.03], ["LLLb", [[0.95, -0.5, -0.05], [1.2, -0.7, -0.1], [1.4, -0.9, -0.2]], 0.03],
    ];
    const vv = vessels(S, grp, defs, 0x5b78e6, { dens: 18, flow: 0x9fb4ff }); V = vv.T; F = vv.F; Object.keys(V).forEach((n) => halo(S, grp, V[n], n));
    kit = clotKit(S, grp, ui, { size: site().big ? 0.1 : 0.06, ring: site().big ? 0.17 : 0.1, thr: 0.4, color: 0x7a1530, onRemoved: () => { st.removed = true; if (st.rAt == null) st.rAt = st.t; ui.refresh("Clot retrieved. Pulmonary flow restored; the right ventricle starts to unload."); } });
    M.lab = S.label(site().label, [0, 0, 0], "#7fb0ff"); grp.add(M.lab); place(); dirty = true;
  }
  function place() {
    const k = site(), cur = V[k.vessel].userData.curve; kit.place(cur, k.u); const p = kit.home; M.lab.position.set(p.x, p.y + 0.24, p.z + 0.12);
    Object.assign(st, { hep: false, lysed: false, cdt: false, removed: false, reper: 0, rAt: null, rec: 0 });
    S.view({ ry: st.tab === "LOBAR" || st.tab === "SEG" || st.tab === "SUB" ? 0.9 : 0, rx: 0.12, d: 6.4, tx: 0, ty: 0.05, tz: 0 });
  }

  /* ---------- physiology ---------- */
  const tNow = () => (st.rAt != null ? st.rAt : st.t);
  const resMul = () => (st.reserve === "limited" ? 1.7 : 1);
  function strain() {
    const b = site().burden, tf = 0.6 + 0.4 * (1 - Math.exp(-tNow() / 8)), open = st.rAt != null ? st.reper : 0;
    const eff = b * (1 - 0.88 * open) * (st.hep && st.rAt == null ? 0.9 : 1);
    return { eff, s: clamp(eff * resMul() * tf * 1.45, 0, 1.2) };
  }
  function paintAll() {
    const tg = site().tags, un = C(0x7b8db8), dead = C(0x5a1630), rec = C(0x8fe8b0), t = tNow(), reperf = st.rAt != null;
    const inf = site().burden >= 0.2 && !site().big ? 0 : 0; void inf;
    const infFrac = clamp((t - 6) / 36, 0, 1) * (st.tab === "SEG" || st.tab === "LOBAR" || st.tab === "SUB" ? 0.6 : 0.25);
    tis.forEach((T) => T.paint((tag, rank, h, out) => {
      const w = tg[tag]; if (!w || h > w) return;
      if (rank > 1 - infFrac && !reperf) { out.lerp(dead, 0.85); return; }
      if (!reperf) out.lerp(un, 0.62 - 0.2 * st.reper); else { out.lerp(un, 0.62 * (1 - st.rec)); out.lerp(rec, 0.3 * st.rec); }
    }));
  }
  const flowTarget = () => (st.removed ? 0.95 : st.cdt ? 0.8 : st.lysed ? site().lysis : 0);
  function frame(dt) {
    const k = site(), target = flowTarget(); st.reper += (target - st.reper) * Math.min(1, dt * 1.4); if (Math.abs(target - st.reper) < 0.003) st.reper = target;
    if (st.reper > 0.3 && st.rAt == null) st.rAt = st.t; if (st.rAt != null && st.rec < 1) st.rec = Math.min(1, st.rec + dt * 0.45);
    const tg = k.tags, sub = { SADDLE: ["PA", "RPA", "LPA", "RUL", "RML", "RLL", "RLLa", "RLLb", "RLLc", "LUL", "LLL", "LLLa", "LLLb"], MAIN: ["RPA", "RUL", "RML", "RLL", "RLLa", "RLLb", "RLLc"], LOBAR: ["RLL", "RLLa", "RLLb", "RLLc"], SEG: ["RLLa"], SUB: ["RLLc"] }[st.tab];
    const dn = new Set(sub.filter((n) => n !== k.vessel)); void tg;
    Object.keys(V).forEach((n) => { const f = F[n], m = V[n]; let rate = 1, to = 1; if (n === k.vessel) { if (st.reper < 0.98) { to = 0.5; rate = 0.12 + 0.88 * st.reper; } } else if (dn.has(n)) rate = 0.06 + 0.94 * st.reper;
      f.rate += (rate - f.rate) * Math.min(1, dt * 4); f.to = to; const dim = n === k.vessel ? 0.8 : dn.has(n) ? 0.45 + 0.55 * st.reper : 1; m.material.color.setRGB(0.36 * dim, 0.47 * dim, 0.9 * dim); });
    kit.frame(dt, st.lysed && !st.removed ? 1 - 0.7 * clamp(st.reper / k.lysis, 0, 1) : 1);
    accT += dt; if ((dirty || (st.rAt != null && st.rec < 1)) && accT > 0.06) { accT = 0; paintAll(); dirty = false; }
    const sv = strain().s; st.pulse += dt * (1.2 + 1.2 * sv) * 2 * Math.PI; const sc = 1 + 0.4 * sv + 0.03 * Math.max(0, Math.sin(st.pulse)) ** 2; rv.scale.set(sc, sc, sc); rv.material.color.copy(rv.userData.base).lerp(C(0xffb347), clamp((sv - 0.15) * 1.2, 0, 0.75));
    M.grp.children.forEach((c) => { if (c.userData.hemi) c.material.opacity += ((st.ghost ? 0.16 : LG ? 0.55 : 0.42) - c.material.opacity) * Math.min(1, dt * 5); });
  }
  S.hooks.push(frame);

  S.onGrab = (o) => { kit.grabbed(o); }; S.onDrag = (o, w) => { kit.drag(w); }; S.onDrop = () => { kit.drop(); };
  S.onTap = (o) => { if (!o || !o.userData.site) return; const n = o.userData.site, m = n === "PA" ? "SADDLE" : n === "RPA" ? "MAIN" : /^(RUL|RML|RLL|LUL|LLL)$/.test(n) ? "LOBAR" : /a$|b$/.test(n) ? "SEG" : /c$/.test(n) ? "SUB" : null; if (m && m !== st.tab) { setTab(m); ui.refresh(); } };
  function setTab(k) { st.tab = k; build(); }
  function setOpt(id, v) { if (id === "reserve") { st.reserve = v; } else if (id === "ghost") st.ghost = v === "1"; dirty = true; }
  function setT(v) { if (st.rAt != null) return; st.t = v; dirty = true; }
  function act(id) {
    if (id === "hep") { st.hep = true; ui.refresh("Anticoagulation started. The clot stops growing; it dissolves slowly over days to weeks."); }
    else if (id === "lysis") { if (!st.removed && !st.lysed) { st.lysed = true; ui.refresh("Systemic thrombolysis given. Flow partly restored; weigh the bleeding risk."); } }
    else if (id === "cdt") { if (!st.removed && !st.cdt) { st.cdt = true; ui.refresh("Catheter-directed therapy: flow partly restored with a lower lysis dose."); } }
    else if (id === "reset") build();
  }

  /* ---------- readout ---------- */
  function est() {
    const sv = strain(), s = sv.s, obstruct = sv.eff, reperf = st.rAt != null;
    const rvlv = +(0.8 + 1.15 * s).toFixed(2), mpap = Math.round(clamp(16 + 52 * s, 14, 52)), spo2 = Math.round(clamp(98 - 40 * obstruct * (st.reserve === "limited" ? 1.4 : 1) - 5 * s, 62, 99)), hr = Math.round(75 + 50 * s), sbp = Math.round(clamp(125 - 95 * Math.max(0, s - 0.28), 50, 130)), lac = +(1 + 7 * Math.max(0, s - 0.45)).toFixed(1);
    const nab = (rvlv > 1.0 ? 1 : 0) + (s > 0.25 ? 1 : 0) + (s > 0.35 ? 1 : 0);
    const cat = sbp < 65 ? "E2 · refractory shock" : sbp < 90 ? "E1 · persistent hypotension" : s > 0.5 ? (lac > 2 ? "D2 · normotensive shock physiology" : "D1 · transient hypotension") : nab > 0 ? "C" + nab + " · symptomatic, RV / biomarker abnormality" : obstruct > 0.04 ? "B · symptomatic, low severity" : "A · asymptomatic";
    return { s, obstruct, reperf, rvlv, mpap, spo2, hr, sbp, lac, cat, deficit: Math.round(obstruct * 100) };
  }
  function bodyMap() {
    const e = est(), k = site(), map = {}; const lvl = (x) => (x > 0.45 ? 3 : x > 0.2 ? 2 : x > 0.04 ? 1 : 0);
    const both = st.tab === "SADDLE", rightOnly = st.tab !== "SADDLE", w = e.obstruct;
    map["lung-R"] = e.reperf && st.rec > 0.6 ? "rec" : lvl(both ? w : w * (st.tab === "MAIN" ? 1.2 : 2.2)); map["lung-L"] = both ? map["lung-R"] : 0; void rightOnly;
    map.heart = e.reperf && st.rec > 0.6 ? "rec" : lvl(e.s * 1.1); if (e.s > 0.3) map.neck = 2; map["veins-R"] = e.reperf ? 0 : "l2"; if (!e.reperf) map["leg-R"] = 1; if (e.sbp < 90) { map.brain = 2; map["kidney-R"] = 2; map["kidney-L"] = 2; } void k;
    return { map, marks: {} };
  }
  function ecgLeads() {
    const e = est(), s = e.s, L = (n, o) => Object.assign({ n, r: 1, st: 0, t: 0.35, q: 0 }, o); const inv = s > 0.25 ? -0.4 * Math.min(1, s * 1.5) : 0.35;
    return [L("I", { r: 1 - 0.2 * s }), L("aVR", { r: -0.6, t: -0.2 }), L("II"), L("aVL"), L("III", { q: s > 0.3 ? 0.4 : 0, t: s > 0.3 ? -0.3 : 0.35 }), L("aVF"), L("V1", { r: 0.5 + 0.4 * s, t: inv }), L("V2", { t: inv }), L("V3", { t: s > 0.35 ? inv : 0.35 }), L("V4", { t: s > 0.5 ? inv : 0.35 }), L("V5"), L("V6")];
  }
  function obs() {
    const e = est(), k = site(), bm = bodyMap();
    const flow = st.removed ? "restored (retrieved)" : st.cdt ? "partly restored (catheter)" : st.lysed ? "partly restored (lysis)" : "blocked";
    const params = [
      { k: "Pulmonary flow", v: flow, tone: st.reper > 0.7 ? "ok" : st.reper > 0.2 ? "warn" : "bad" },
      { k: "Obstructed arterial bed", v: e.deficit + "%", tone: e.deficit > 30 ? "bad" : e.deficit > 10 ? "warn" : "ok" },
      { k: "RV / LV size ratio", v: e.rvlv.toFixed(2), tone: e.rvlv > 1.0 ? "bad" : e.rvlv > 0.9 ? "warn" : "ok" },
      { k: "Mean PA pressure", v: e.mpap + " mmHg", tone: e.mpap > 35 ? "bad" : e.mpap > 25 ? "warn" : "ok" },
      { k: "SpO₂ (room air)", v: e.spo2 + "%", tone: e.spo2 < 90 ? "bad" : e.spo2 < 94 ? "warn" : "ok" },
      { k: "BP · HR", v: e.sbp + " mmHg · " + e.hr + "/min", tone: e.sbp < 90 ? "bad" : e.sbp < 105 ? "warn" : "ok" },
      { k: "Lactate", v: e.lac + " mmol/L", tone: e.lac > 2 ? "bad" : "ok" },
      { k: "Severity (illustrative)", v: e.cat, tone: e.cat[0] >= "D" ? "bad" : e.cat[0] === "C" ? "warn" : "info" },
    ];
    let note;
    if (!e.reperf) note = "Blocked artery: the lung beyond the clot is ventilated but not perfused (dead space), the right ventricle faces a higher afterload and the oxygen level falls. " + (st.hep ? "Heparin stops the clot growing but does not dissolve it quickly. " : "") + (st.reserve === "limited" ? "Limited cardiopulmonary reserve makes the same clot more dangerous." : "Move the time slider to see strain change.");
    else note = "Reperfusion unloads the right ventricle: pressures fall, the RV shrinks back and oxygenation improves. Some perfusion defect can persist, and anticoagulation continues for months to prevent a recurrence.";
    return { params, body: bm.map, marks: bm.marks, note, ecg: { leads: ecgLeads(), h: 330, beat: +(60 / e.hr).toFixed(2) } };
  }
  const info = () => { const s = site(); return { anat: s.anat, patho: s.patho, interv: s.interv }; };

  function clin() {
    const k = site(), e = est(), L = [];
    L.push(["Presentation", "Sudden breathlessness, pleuritic chest pain, haemoptysis, syncope. Look for a source: a swollen painful calf (DVT), recent surgery, immobility, cancer, pregnancy or oestrogen use."]);
    L.push(["Pre-test probability", "Use a validated score (Wells or revised Geneva). A low or intermediate probability with a negative age-adjusted D-dimer excludes PE; a high probability goes straight to imaging."]);
    L.push(["CT pulmonary angiography", "The first-line test. A filling defect in the " + k.label.toLowerCase() + " artery; RV/LV ratio above 1.0, septal bowing and contrast reflux into the IVC suggest RV strain. Estimated RV/LV ratio here: " + e.rvlv.toFixed(2) + "."]);
    L.push(["Echocardiography and biomarkers", "RV dilatation, a D-shaped LV in systole, McConnell sign, reduced TAPSE, high PA pressure. Raised troponin and natriuretic peptide mark myocardial injury and RV strain."]);
    L.push(["ECG", "Sinus tachycardia is the commonest change; with strain: T-wave inversion in V1–V4, S1Q3T3 pattern, new right bundle branch block."]);
    L.push(["Severity (AHA/ACC 2026 Acute PE Clinical Categories)", "Category here (illustrative): " + e.cat + ". A: asymptomatic (often incidental). B: symptomatic, low severity score (sPESI 0, PESI ≤85). C: symptomatic with an elevated score; C1–C3 by the number of RV-imaging and biomarker abnormalities. D: incipient cardiopulmonary failure (D1 transient hypotension, e.g. syncope; D2 normotensive with shock physiology such as raised lactate or AKI). E: persistent hypotension or cardiopulmonary failure (E1 cardiogenic shock; E2 refractory shock or arrest). A respiratory modifier can be added to C–E; if the respiratory and haemodynamic categories differ, use the higher one."]);
    L.push(["Treatment pathways to consider", "Category A: discharge from the emergency department. Category B: often outpatient oral anticoagulation alone (a DOAC is preferred over a vitamin K antagonist). Categories C–E: hospital admission and a multidisciplinary PE response team (PERT). For parenteral anticoagulation in C–E1, low-molecular-weight heparin is recommended over unfractionated heparin, including before catheter therapy or lysis. Category E: urgent reperfusion, with systemic thrombolysis, catheter-directed therapy or mechanical thrombectomy regarded as equivalent options; surgical embolectomy and VA-ECMO for refractory shock or arrest. Categories C3 and D: advanced therapy may be considered, but the benefit over anticoagulation alone is unclear."]);
    L.push(["Cautions", "Check bleeding risk before lysis (recent surgery, stroke, active bleeding). Avoid large fluid boluses in RV failure; use vasopressors early, and avoid intubation where possible because positive pressure can precipitate collapse. Reference: 2026 AHA/ACC/ACCP/ACEP/CHEST/SCAI/SHM/SIR/SVM/SVN acute PE guideline (ESC 2019 for comparison). Follow your local protocol."]);
    return { lines: L, draw: (el) => drawImaging(el, e) };
  }
  function drawImaging(el, e) {
    const mk = (title, f) => { const d = document.createElement("div"); d.className = "img"; const c = document.createElement("canvas"); c.width = 300; c.height = 300; const t = document.createElement("small"); t.textContent = title; d.append(c, t); el.append(d); f(c.getContext("2d")); };
    const tg = site().tags, k = site();
    mk("CT pulmonary angiogram (schematic)", (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 300, 300); g.fillStyle = "#2a2a2a"; g.beginPath(); g.ellipse(150, 150, 130, 105, 0, 0, 7); g.fill(); g.fillStyle = "#101010"; g.beginPath(); g.ellipse(82, 150, 50, 72, 0, 0, 7); g.ellipse(218, 150, 50, 72, 0, 0, 7); g.fill();
      g.fillStyle = "#e8e8e8"; g.beginPath(); g.arc(160, 140, 18, 0, 7); g.fill(); g.beginPath(); g.arc(130, 120, 22, 0, 7); g.fill(); g.strokeStyle = "#e8e8e8"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(130, 120); g.lineTo(80, 110); g.stroke(); g.beginPath(); g.moveTo(130, 120); g.lineTo(215, 105); g.stroke();
      if (!st.removed && st.reper < 0.7) { g.fillStyle = "#3a3a3a"; if (st.tab === "SADDLE") { g.beginPath(); g.ellipse(130, 118, 17, 9, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(95, 112, 10, 5, 0, 0, 7); g.ellipse(190, 108, 10, 5, 0, 0, 7); g.fill(); } else if (st.tab === "MAIN") { g.beginPath(); g.ellipse(95, 112, 20, 6, 0, 0, 7); g.fill(); } else { g.beginPath(); g.ellipse(64, 175, 6, 4, 0, 0, 7); g.fill(); } }
      g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(st.removed ? "no filling defect" : "dark = filling defect: " + k.label, 8, 292); g.fillStyle = "#e8e8e8"; g.fillText("R", 8, 18); g.fillText("L", 284, 18); });
    mk("Echo four-chamber view (schematic)", (g) => { g.fillStyle = "#0a0f16"; g.fillRect(0, 0, 300, 300); const lvw = 56, rvw = lvw * e.rvlv; g.fillStyle = "rgba(120,170,255,.55)"; g.beginPath(); g.ellipse(190, 170, lvw, 90, 0.15, 0, 7); g.fill(); g.fillStyle = e.rvlv > 1 ? "rgba(255,179,71,.65)" : "rgba(160,200,255,.45)"; g.beginPath(); g.ellipse(110, 170, rvw, 92, -0.15, 0, 7); g.fill(); g.strokeStyle = "#e8e8e8"; g.lineWidth = 3; g.beginPath(); g.moveTo(150 + Math.max(0, e.rvlv - 1) * 18, 70); g.quadraticCurveTo(150 + (e.rvlv - 0.8) * 25, 170, 150, 260); g.stroke();
      g.fillStyle = "#e8e8e8"; g.font = "600 12px system-ui"; g.fillText("RV", 100, 30); g.fillText("LV", 186, 30); g.fillStyle = "#ffd166"; g.fillText("RV/LV " + e.rvlv.toFixed(2) + (e.rvlv > 1 ? " · septum bows into LV" : ""), 8, 292); });
    mk("Lung perfusion scan (schematic)", (g) => { g.fillStyle = "#0a0f16"; g.fillRect(0, 0, 300, 300); const lung = (cx, side) => { g.fillStyle = "#58c8ff"; g.beginPath(); g.ellipse(cx, 150, 62, 112, 0, 0, 7); g.fill(); };
      lung(88); lung(212); g.fillStyle = "#0a0f16"; const R = ["rul", "rml", "rll"], Lb = ["lul", "lll"]; R.forEach((l, i) => { if (tg[l]) { const h = tg[l]; g.beginPath(); g.ellipse(88, 70 + i * 55 + (l === "rll" ? 20 : 0), 62 * Math.min(1, h + 0.2), (l === "rll" ? 60 : 30) * Math.min(1, h + 0.3), 0, 0, 7); g.globalAlpha = 1 - 0.85 * (st.reper > 0.6 ? 0.5 : 1) * 1; g.fill(); g.globalAlpha = 1; } }); Lb.forEach((l, i) => { if (tg[l]) { g.beginPath(); g.ellipse(212, 80 + i * 70, 62, 52, 0, 0, 7); g.fill(); } });
      g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText("dark = no perfusion (dead space)", 8, 292); g.fillStyle = "#e8e8e8"; g.fillText("R", 8, 18); g.fillText("L", 284, 18); });
  }

  const lab = {
    id: "pe", name: "Pulmonary Embolism Lab", tag: "Clot in the pulmonary arteries", icon: "🫁",
    tabs: TABS.map((k) => ({ id: k, label: SITES[k].label, sub: SITES[k].sub })), get tab() { return st.tab; },
    credit: "Lungs: BodyParts3D © DBCLS, CC BY-SA 2.1 JP. Adapted for teaching.",
    selectHint: "Tap a pulmonary artery in the 3D lungs to move the clot there.",
    opts: () => [{ id: "reserve", label: "Cardiopulmonary reserve", cur: st.reserve, choices: [["normal", "Healthy heart and lungs"], ["limited", "Limited reserve"]] }],
    slider: () => ({ id: "t", label: st.rAt != null ? "Reperfused at (hours from onset)" : "Time since symptom onset (hours)", min: 0.5, max: 48, step: 0.5, v: st.rAt != null ? st.rAt : st.t, locked: st.rAt != null, unit: " h" }),
    actions: () => [
      { id: "hep", label: "ANTICOAGULATE", hint: "Heparin: stops growth, does not dissolve quickly.", off: st.hep },
      { id: "lysis", label: "SYSTEMIC LYSIS", hint: "Clot-busting drug. Bleeding risk.", off: st.removed || st.lysed },
      { id: "cdt", label: "CATHETER LYSIS", hint: "Local low-dose lysis through a catheter.", off: st.removed || st.cdt },
      { id: "reset", label: "RESET", hint: "Put the clot back.", off: false }],
    dragHint: "Touch the clot and drag it out of the artery (catheter-based mechanical thrombectomy).",
    views: [{ id: "front", label: "Front", f: () => ({ ry: 0, rx: 0.1, d: 6.4, tx: 0, ty: 0.05 }) }, { id: "back", label: "Back", f: () => ({ ry: 3.14, rx: 0.1, d: 6.4, tx: 0, ty: 0 }) }, { id: "right", label: "Right", f: () => ({ ry: 1.5, rx: 0.05, d: 5.4, tx: -0.6, ty: 0 }) }, { id: "left", label: "Left", f: () => ({ ry: -1.5, rx: 0.05, d: 5.4, tx: 0.6, ty: 0 }) }],
    legend: [["#e8a3ab", "Perfused lung"], ["#7b8db8", "No blood flow (dead space)"], ["#5a1630", "Infarcted"], ["#8fe8b0", "Reperfused"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ kit, V, st }), tabLabel: () => site().label,
  };
  build();
  return lab;
}
