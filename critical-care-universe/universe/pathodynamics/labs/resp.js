/* LUNG & PLEURA LAB on the PATHODYNAMICS engine: ARDS, pneumonia, pneumothorax, pleural effusion, mucus plugging.
   Interactions: lung-protective ventilation and PEEP (alveolar recruitment), prone positioning, chest tube and needle decompression, thoracentesis, bronchoscopy.
   Pulmonary embolism has its own lab (./pe.js). Content aligned to the 2024 ATS ARDS guideline and 2024 global ARDS definition, the 2025 ATS community-acquired pneumonia guideline
   (corticosteroids for severe CAP other than influenza) and the 2023 BTS pleural disease guideline (conservative or ambulatory management of minimally symptomatic primary spontaneous
   pneumothorax; needle aspiration or tube drainage otherwise). Checked Nov 2026 against the published summaries. All numbers are illustrative, not patient data. */
import { THREE } from "../stage.js?v=20261126gj";
import { toolKit, vessels, mirrorFlows, clamp } from "./common.js?v=20261126gj";
import { organ, splitLR, fitGeom } from "../anatomy.js?v=20261126gj";

const TABS = {
  ARDS: { label: "ARDS", sub: "Diffuse alveolar injury",
    anat: "The lungs are made of millions of alveoli, thin air sacs wrapped in capillaries. In ARDS, injury makes the barrier leak: fluid and protein flood the alveoli, surfactant fails and the dependent (lowest) parts of the lung collapse, so only a small 'baby lung' is left to ventilate.",
    patho: "Within a week of a trigger (pneumonia, sepsis, aspiration, pancreatitis, trauma), bilateral opacities appear, oxygenation falls and the lungs become stiff. The main danger after the injury is the ventilator: large breaths overstretch the open alveoli and repeated opening and closing damages the rest (ventilator-induced lung injury).",
    interv: "Protect the lung: small tidal volumes (about 4–8 mL per kg of predicted body weight) with a plateau pressure kept below 30 cmH2O and a low driving pressure. Use PEEP to keep the alveoli open (a higher-PEEP strategy is suggested for moderate to severe ARDS). Prone for more than 12 hours a day in moderate to severe disease. Corticosteroids are suggested. For refractory hypoxaemia in expert centres, ECMO." },
  PNEU: { label: "Pneumonia", sub: "Infected, consolidated lung",
    anat: "Infection of the airspaces of one lobe or segment. The alveoli fill with pus and inflammatory fluid (consolidation), while the airways stay open: this is why the chest X-ray shows an air bronchogram.",
    patho: "Blood passing through the consolidated lung picks up no oxygen (a shunt), so the oxygen saturation falls even on oxygen. Severe pneumonia spreads to other lobes, causes sepsis, a parapneumonic effusion or empyema, or progresses to ARDS.",
    interv: "Give appropriate antibiotics promptly, oxygen or high-flow nasal oxygen, and look for complications. Recent ATS guidance (2025) recommends systemic corticosteroids for adults hospitalised with severe community-acquired pneumonia, excluding influenza. Antibiotic duration is tailored: a minimum of 3 days if not severe and stable, and 5 or more days for severe disease." },
  PTX: { label: "Pneumothorax", sub: "Air in the pleural space",
    anat: "The lung is held against the chest wall by a thin film of fluid in the pleural space. Air in this space lets the lung collapse towards its hilum.",
    patho: "A simple pneumothorax reduces lung volume and oxygen. In a tension pneumothorax a one-way valve lets air in with every breath and out never: pressure builds, the mediastinum shifts, the great veins kink and venous return falls. This causes obstructive shock.",
    interv: "Tension pneumothorax is a clinical diagnosis: decompress immediately with a needle or finger thoracostomy, then place a chest drain. For a primary spontaneous pneumothorax with little breathlessness and no physiological compromise, conservative or ambulatory management can be considered (BTS 2023); otherwise needle aspiration or a small chest drain." },
  EFF: { label: "Pleural effusion", sub: "Fluid around the lung",
    anat: "The pleural space can fill with fluid: a transudate (heart failure, cirrhosis), an exudate (infection, cancer, inflammation), pus (empyema) or blood. Fluid collects at the lowest point, blunting the costophrenic angle and compressing the lower lobe.",
    patho: "A large effusion presses on the lung and diaphragm and causes breathlessness. In pleural infection the fluid becomes thick and divides into compartments (loculations), which are hard to drain.",
    interv: "Use ultrasound to mark the site and guide drainage. Drain a large symptomatic effusion in controlled volumes and stop if the patient coughs or has chest discomfort. For infected fluid, give antibiotics and drain; a pleural team may add intrapleural fibrinolytic and DNase therapy or surgery if the collection does not drain (BTS 2023). Treat the cause." },
  PLUG: { label: "Mucus plug", sub: "Blocked airway, collapsed lobe",
    anat: "Sticky secretions can fill a lobar or segmental bronchus, in intubated patients, severe asthma or cystic fibrosis, and in weak patients who cannot cough.",
    patho: "Air trapped beyond the plug is absorbed, so the lobe shrinks (atelectasis). The mediastinum shifts towards the collapsed side, perfusion to that lobe continues (shunt) and oxygen falls, and the ventilator pressures rise. A retained infected plug leads to pneumonia.",
    interv: "Start with humidification, chest physiotherapy, suction and cough assist, nebulised saline or a mucolytic per local practice, and treat the cause. Flexible bronchoscopy removes a plug that persists or causes significant collapse and hypoxaemia." },
};
const ORDER = ["ARDS", "PNEU", "PTX", "EFF", "PLUG"];
const LOBES = { RUL: { p: [0.5, 0.4, 0.05], r: [0.28, 0.26, 0.26], b: [0.5, 0.35, 0.05] }, RML: { p: [0.65, 0.0, 0.25], r: [0.22, 0.17, 0.2], b: [0.58, 0.0, 0.15] }, RLL: { p: [0.5, -0.38, -0.15], r: [0.3, 0.3, 0.28], b: [0.44, -0.2, -0.05] }, LUL: { p: [-0.5, 0.3, 0.05], r: [0.28, 0.3, 0.26], b: [-0.47, 0.3, 0.02] }, LLL: { p: [-0.5, -0.38, -0.15], r: [0.28, 0.3, 0.28], b: [-0.44, -0.2, -0.05] } };

export default function create(S, ui) {
  const st = { tab: "ARDS", sev: "mod", peep: 8, vt: "high", prone: false, rec: false, ster: false, ecmo: false, abx: false, o2: false, t: 6, t0: -1, lobe: "RLL", comp: "none", ptx: "simple", air: 60, needle: false, tube: false, vol: 1200, etype: "exud", tapped: false, fibr: false, plugLobe: "RLL", physio: false, mucol: false, bronch: false, ghost: false, cur: { air: 0, fluid: 0, cons: 0, plug: 0, ten: 0 } };
  const T = () => TABS[st.tab];
  let M = {}, V = {}, kits = [], act_kit = null, alv = [], LUNG = null;
  organ("lung", { bigX: 1 }).then((g) => { const [l, r] = splitLR(g); LUNG = { R: fitGeom(r, { c: [0, 0, 0], r: [0.42, 0.75, 0.4] }), L: fitGeom(l, { c: [0, 0, 0], r: [0.36, 0.72, 0.38] }) }; if (M.grp) build(); }).catch(() => {});   /* real lungs (BodyParts3D); the simple shapes stay if they cannot load */
  const lungMesh = (g, p) => { const m = new THREE.Mesh(g.clone(), S.mat(0xf0a0a8, { transparent: true, opacity: 0.42, depthWrite: false })); m.position.set(...p); return m; };

  const ell = (rx, ry, rz, col, op, p, o) => { const g = new THREE.SphereGeometry(1, 26, 18); g.scale(rx, ry, rz); const m = new THREE.Mesh(g, S.mat(col, Object.assign({ transparent: true, opacity: op, depthWrite: false }, o || {}))); if (p) m.position.set(...p); return m; };
  function build() {
    S.clear(); M = {}; V = {}; kits = []; act_kit = null; alv = [];
    const grp = S.add(new THREE.Group()); grp.scale.x = -1; /* patient's right on the viewer's left in the front view */ M.grp = grp;
    M.lungR = LUNG ? lungMesh(LUNG.R, [0.5, 0, 0]) : ell(0.42, 0.75, 0.4, 0xf0a0a8, 0.42, [0.5, 0, 0]); M.lungL = LUNG ? lungMesh(LUNG.L, [-0.5, 0, 0]) : ell(0.36, 0.72, 0.38, 0xf0a0a8, 0.42, [-0.5, 0, 0]); M.lungR.userData.hemi = 1; M.lungL.userData.hemi = 1; M.lungR.renderOrder = M.lungL.renderOrder = 1; grp.add(M.lungR, M.lungL);
    M.shellR = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16).scale(0.46, 0.8, 0.44), new THREE.MeshBasicMaterial({ color: 0xc8d8f0, wireframe: true, transparent: true, opacity: 0.1, depthWrite: false })); M.shellR.position.set(0.5, 0, 0); M.shellL = M.shellR.clone(); M.shellL.scale.set(0.9, 1, 1); M.shellL.position.set(-0.5, 0, 0); if (!LUNG) grp.add(M.shellR, M.shellL);
    M.med = new THREE.Group(); grp.add(M.med); M.heart = ell(0.17, 0.22, 0.17, 0xb5323c, 0.8, [-0.08, -0.12, 0.12], { emissive: 0x3a0810 }); M.med.add(M.heart);
    const a = (n) => LOBES[n].b, defs = [["TR", [[0, 1.0, 0], [0, 0.7, 0], [0, 0.35, 0]], 0.07], ["RMB", [[0, 0.35, 0], [0.15, 0.25, 0], [0.34, 0.1, 0]], 0.05], ["LMB", [[0, 0.35, 0], [-0.15, 0.25, 0], [-0.34, 0.1, 0]], 0.045], ["B_RUL", [[0.34, 0.1, 0], [0.42, 0.25, 0.03], a("RUL")], 0.03], ["B_RML", [[0.34, 0.1, 0], [0.46, 0.04, 0.1], a("RML")], 0.028], ["B_RLL", [[0.34, 0.1, 0], [0.4, -0.05, 0], a("RLL")], 0.03], ["B_LUL", [[-0.34, 0.1, 0], [-0.42, 0.22, 0.02], a("LUL")], 0.03], ["B_LLL", [[-0.34, 0.1, 0], [-0.4, -0.05, 0], a("LLL")], 0.03]];
    const fn0 = S.flows.length; const vv = vessels(S, grp, defs, 0xa8d8ff, { dens: 7 }); mirrorFlows(S, fn0); V = vv.T; M.F = vv.F; Object.keys(V).forEach((n) => { if (n !== "TR") M.med.add; });
    M.cons = ell(1, 1, 1, 0xd9c7a2, 0.0, [0, 0, 0]); M.cons.renderOrder = 3; grp.add(M.cons); M.cons2 = ell(0.4, 0.75, 0.16, 0xd9c7a2, 0, [-0.5, 0, 0]); M.cons2.renderOrder = 3; grp.add(M.cons2); M.cons3 = ell(0.44, 0.78, 0.16, 0xd9c7a2, 0, [0.5, 0, 0]); M.cons3.renderOrder = 3; grp.add(M.cons3);
    M.fluid = ell(1, 1, 1, 0xf2d27a, 0.55, [0.5, -0.5, 0]); M.fluid.renderOrder = 3; grp.add(M.fluid); M.air = ell(1, 1, 1, 0xdff2ff, 0, [0.9, 0.2, 0.2]); grp.add(M.air);
    M.plug = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), S.mat(0xe6cf4a, { emissive: 0x3a3000 })); M.plug.renderOrder = 4; grp.add(M.plug);
    const R = (() => { let s = 7; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })(); for (let i = 0; i < 44; i++) { const p = new THREE.Vector3(0.28 + R() * 0.5, (R() - 0.5) * 1.1, (R() - 0.5) * 0.7); if (((p.x - 0.5) / 0.4) ** 2 + (p.y / 0.7) ** 2 + (p.z / 0.38) ** 2 > 0.85) { i--; continue; } const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), S.mat(0xf6b0ba, { transparent: true, opacity: 0.9 })); m.position.copy(p); m.userData.rnd = R(); alv.push(m); grp.add(m); }
    const mk = (start, target, onPlaced, msg, go, far, len, r) => { const k = toolKit(S, grp, ui, { start, target, thr: 0.3, len, r, ring: 0.12, onPlaced, msg, go, far }); kits.push(k); return k; };
    M.kN = mk(new THREE.Vector3(0.7, 0.95, 1.0), new THREE.Vector3(0.5, 0.45, 0.3), () => { st.needle = true; ui.refresh("Needle decompression: air escapes, the tension is relieved and the mediastinum returns. A chest drain is still needed."); }, "Drag the needle tip into the pleural space, second space (glowing ring)…", "Release to decompress", "The tip must reach the pleural air: bring it to the ring.", 0.7, 0.012);
    M.kT = mk(new THREE.Vector3(1.5, -0.1, 0.6), new THREE.Vector3(0.85, -0.2, 0.1), () => { st.tube = true; ui.refresh("Chest drain placed and draining. The lung re-expands and the pleural space clears."); }, "Drag the chest tube tip into the pleural space, safe triangle (glowing ring)…", "Release to place the chest drain", "The tip must enter the pleural space: bring it to the ring.", 0.9, 0.03);
    M.kC = mk(new THREE.Vector3(1.3, -0.4, -0.6), new THREE.Vector3(0.7, -0.5, -0.05), () => { st.tapped = true; ui.refresh("Thoracentesis done: fluid drained in a controlled volume; the lung expands and breathing eases."); }, "Drag the needle tip into the effusion, ultrasound-marked site (glowing ring)…", "Release to drain the fluid", "The tip must reach the fluid: bring it to the ring.", 0.7, 0.012);
    M.kB = mk(new THREE.Vector3(0, 1.2, 0.5), new THREE.Vector3(...LOBES.RLL.b), () => { st.bronch = true; ui.refresh("Bronchoscopy: the plug is suctioned out and the lobe re-expands."); }, "Guide the bronchoscope tip down the airway to the plug (glowing ring)…", "Release to suction the plug", "The scope must reach the plug: bring the tip to the ring.", 0.9, 0.02);
    M.kB.thr = 0.25; reset();
  }
  function reset() {
    Object.assign(st, { prone: false, rec: false, ster: false, ecmo: false, abx: false, o2: false, t0: -1, needle: false, tube: false, tapped: false, fibr: false, physio: false, mucol: false, bronch: false });
    if (st.tab === "ARDS") { st.peep = 8; st.vt = "high"; } st.t = st.tab === "PNEU" ? 6 : 12; st.air = 60; st.vol = 1200; if (st.tab === "PLUG") st.t = 12;
    M.kT.target.set(0.85, -0.2, 0.1); M.kB.target.set(...LOBES[st.plugLobe].b);
    kits.forEach((k) => { k.placed = false; k.grab = false; k.hit.userData.drag = true; k.mesh.position.copy(k.start); k.ring.visible = true; k.show(false); });
    const t = st.tab; M.kN.show(t === "PTX"); M.kT.show(t === "PTX" || t === "EFF"); M.kC.show(t === "EFF"); M.kB.show(t === "PLUG");
    S.view({ ry: 0.25, rx: 0.1, d: 4.6, tx: 0.1, ty: 0, tz: 0 }); const c = tgt(); st.cur = Object.assign({}, c);
  }

  /* ---------- physiology ---------- */
  const sevf = () => ({ mild: 0.3, mod: 0.6, sev: 0.9 }[st.sev]);
  function ards() {
    const sf = sevf(), base = { mild: 230, mod: 140, sev: 75 }[st.sev];
    const rec = clamp((st.peep - 5) / 14, 0, 1) * 0.75 * (st.prone ? 1.1 : 1) + (st.rec && st.peep >= 10 ? 0.1 : 0), pr = clamp(rec, 0, 1);
    const crs = 52 - 30 * sf * (1 - 0.6 * pr) - (st.peep > 20 ? (st.peep - 20) * 2 : 0), vtml = (st.vt === "low" ? 6 : 10) * 70, plat = Math.round(st.peep + vtml / crs), dp = plat - st.peep;
    let pf = base + 130 * pr + (st.prone ? 60 : 0) - (plat > 30 ? 25 : 0); pf = Math.round(clamp(pf, 45, 420)); const spo2 = st.ecmo ? 95 : Math.round(clamp(100 - 22 * Math.pow(1 - clamp(pf / 300, 0, 1), 1.3), 70, 100));
    return { pf, spo2, plat, dp, crs: Math.round(crs), cons: sf * (1 - pr * 0.85) * (st.prone ? 0.9 : 1), vili: plat > 30 || dp > 15 ? "high" : dp > 12 ? "raised" : "lower", rec: pr };
  }
  function pneu() {
    const raw = clamp(0.2 + 0.8 * (1 - Math.exp(-st.t / 18)), 0, 1); let c = raw; if (st.abx) { if (st.t0 < 0) st.t0 = st.t; const c0 = clamp(0.2 + 0.8 * (1 - Math.exp(-st.t0 / 18)), 0, 1); c = c0 * Math.exp(-Math.max(0, st.t - st.t0) / 70); }
    const spo2 = Math.round(clamp(99 - 24 * Math.pow(c, 1.1) + (st.o2 ? 6 : 0), 70, 100)), severe = c > 0.65;
    return { cons: c, spo2, severe, temp: st.abx && st.t - st.t0 > 24 ? 37.4 : 39.0 - 0.4 * (1 - c), hr: Math.round(88 + 35 * c), rr: Math.round(18 + 18 * c) };
  }
  function ptx() {
    const f0 = st.air / 100 * 0.95, ten = st.ptx === "tension" && !st.needle && !st.tube ? clamp(0.35 + 0.65 * st.air / 100, 0, 1) : 0, f = st.tube ? 0.03 : st.needle ? Math.min(f0, 0.45) : f0;
    const spo2 = Math.round(clamp(99 - 22 * Math.pow(f, 1.2) - 12 * ten, 60, 100)); return { f, ten, spo2, sbp: Math.round(122 - 72 * ten), hr: Math.round(78 + 58 * ten), jvp: ten > 0.3 };
  }
  function eff() {
    const left = st.tube ? (st.etype === "emp" && !st.fibr ? st.vol * 0.5 : st.vol * 0.06) : st.tapped ? Math.max(st.vol * 0.2, st.vol - 1500) : st.vol, fr = clamp(left / 2500, 0, 1), spo2 = Math.round(clamp(99 - 16 * Math.pow(fr, 1.1), 70, 100));
    return { left: Math.round(left), fr, spo2, loc: st.etype === "emp" && !(st.tube && st.fibr) && st.vol > 400 };
  }
  function plug() {
    const c = st.bronch ? 0 : clamp(0.1 + 0.9 * (1 - Math.exp(-st.t / 12)), 0, 1) * (st.physio ? 0.8 : 1) * (st.mucol ? 0.85 : 1), spo2 = Math.round(clamp(99 - 22 * c, 70, 100)); return { c, spo2, paw: Math.round(18 + 16 * c) };
  }
  function tgt() {
    const t = st.tab, o = { air: 0, fluid: 0, cons: 0, plug: 0, ten: 0 };
    if (t === "ARDS") o.cons = ards().cons; else if (t === "PNEU") { o.cons = pneu().cons; if (st.comp === "eff") o.fluid = 0.25; if (st.comp === "ards") o.cons = Math.max(o.cons, 0.8); } else if (t === "PTX") { const p = ptx(); o.air = p.f; o.ten = p.ten; } else if (t === "EFF") o.fluid = eff().fr; else o.plug = plug().c;
    return o;
  }

  /* ---------- scene ---------- */
  function frame(dt) {
    const g = tgt(), k = Math.min(1, dt * 1.6), c = st.cur, L = (a, b, f) => a + (b - a) * f; Object.keys(g).forEach((n) => { c[n] = L(c[n], g[n], n === "air" || n === "fluid" ? Math.min(1, dt * 0.9) : k); });
    const t = st.tab, hemiR = LOBES[st.lobe].p; const dep = st.prone ? 1 : -1;
    /* lung collapse (pneumothorax / effusion / plug) */
    const pxS = t === "PTX" ? c.air : 0, shrinkR = 1 - 0.7 * pxS - (t === "EFF" ? 0.35 * c.fluid : 0) - (t === "PLUG" && /^R/.test(st.plugLobe) ? 0.25 * c.plug : 0);
    M.lungR.scale.setScalar(Math.max(0.2, shrinkR)); M.lungR.position.x = 0.5 - (1 - shrinkR) * 0.28; M.lungR.position.y = -(t === "EFF" ? 0.12 * c.fluid : 0);
    const shL = 1 - (t === "PLUG" && /^L/.test(st.plugLobe) ? 0.25 * c.plug : 0); M.lungL.scale.setScalar(shL); M.lungL.position.x = -0.5 + (1 - shL) * 0.28;
    const spl = t === "PTX" ? c.ten : 0, shift = -0.3 * spl + (t === "PLUG" ? (/^R/.test(st.plugLobe) ? 0.12 : -0.12) * c.plug : 0) + (t === "EFF" ? -0.1 * c.fluid : 0); M.med.position.x += (shift - M.med.position.x) * k;
    /* overlays */
    M.cons.visible = t === "PNEU" || t === "PLUG"; const lob = LOBES[t === "PLUG" ? st.plugLobe : st.lobe]; M.cons.position.set(...lob.p); const scl = t === "PLUG" ? 1 : 0.55 + 0.45 * c.cons; M.cons.scale.set(lob.r[0] * scl, lob.r[1] * scl, lob.r[2] * scl); M.cons.material.opacity = t === "PNEU" ? 0.1 + 0.8 * c.cons : 0.1 + 0.75 * c.plug; M.cons.material.color.setHex(t === "PLUG" ? 0x4a5a7a : 0xd9c7a2);
    const ar = t === "ARDS" || (t === "PNEU" && st.comp === "ards"); [M.cons2, M.cons3].forEach((m) => { m.visible = ar; m.position.z = dep * 0.22; m.material.opacity = ar ? 0.55 * c.cons : 0; });
    M.fluid.visible = (t === "EFF" || (t === "PNEU" && st.comp === "eff")) && c.fluid > 0.01; const fy = -0.78 + 1.2 * c.fluid; M.fluid.scale.set(0.44, Math.max(0.01, (fy + 0.78) / 2), 0.42); M.fluid.position.set(0.5 + 0.0, -0.78 + (fy + 0.78) / 2, 0); M.fluid.material.color.setHex(st.etype === "emp" && t === "EFF" ? 0xc9b25a : st.etype === "trans" ? 0xf2e6a0 : 0xe0b050);
    M.air.visible = t === "PTX" && c.air > 0.02; M.air.position.set(0.66, 0.05, 0.1); M.air.scale.set(0.08 + 0.2 * c.air, 0.3 + 0.45 * c.air, 0.3 + 0.1 * c.air); M.air.material.opacity = 0.18 + 0.2 * c.air;
    M.shellR.scale.set(1, 1, 1);
    M.plug.visible = t === "PLUG" && c.plug > 0.05 && !st.bronch; M.plug.position.set(...LOBES[st.plugLobe].b); M.plug.scale.setScalar(0.7 + 0.8 * c.plug);
    /* alveoli */
    const a = ards(), show = t === "ARDS"; alv.forEach((m) => { m.visible = show; if (!show) return; const dpn = clamp((-dep * (m.position.z) + 0.4) / 0.8, 0, 1), thr = clamp(a.cons * (0.35 + 0.9 * dpn), 0, 1), col = m.userData.rnd < thr * 0.55 ? "col" : m.userData.rnd < thr ? "fl" : "ae"; if (col === "col") { m.material.color.setHex(0x6a3f55); m.scale.setScalar(0.45); } else if (col === "fl") { m.material.color.setHex(0xe9e4d4); m.scale.setScalar(0.85); } else { m.material.color.setHex(a.plat > 30 ? 0xfff4f4 : 0xf6b0ba); m.scale.setScalar(a.plat > 30 ? 1.35 : 1); } });
    M.lungR.material.opacity += ((st.ghost ? 0.16 : show ? (LUNG ? 0.5 : 0.28) : (LUNG ? 0.8 : 0.42)) - M.lungR.material.opacity) * Math.min(1, dt * 5); M.lungL.material.opacity = M.lungR.material.opacity;
    const rate = t === "ARDS" ? clamp(0.5 + 0.5 * a.rec, 0.3, 1) : t === "PLUG" ? 1 - 0.8 * c.plug : 1; Object.keys(V).forEach((n) => { const f = M.F[n]; f.rate += ((n === "TR" ? 1 : /^B_/.test(n) ? (t === "PLUG" && n === "B_" + st.plugLobe ? 1 - 0.95 * c.plug : 1) : 1) * (t === "ARDS" ? 1 : 1) - f.rate) * k; }); void rate; void hemiR;
    kits.forEach((kk) => kk.frame(dt)); M.heart.scale.setScalar(1 + 0.03 * Math.sin(S.time() * 7));
  }
  S.hooks.push(frame);
  S.onGrab = (o) => { for (const k of kits) if (k.mesh.visible && k.grabbed(o)) { act_kit = k; return true; } return false; };
  S.onDrag = (o, w) => { if (act_kit) act_kit.drag(w); }; S.onDrop = () => { if (act_kit) { act_kit.drop(); act_kit = null; } }; S.onTap = () => {};
  const setTab = (k) => { st.tab = k; st.comp = "none"; build(); };
  function setOpt(id, v) { if (id === "ghost") { st.ghost = v === "1"; return; } st[id] = id === "vt" || /sev|lobe|comp|ptx|etype|plugLobe/.test(id) ? v : v; if (id === "plugLobe") { M.kB.target.set(...LOBES[v].b); M.kB.placed = false; st.bronch = false; M.kB.hit.userData.drag = true; M.kB.ring.visible = true; M.kB.mesh.position.copy(M.kB.start); } }
  function setT(v) { if (st.tab === "ARDS") st.peep = v; else if (st.tab === "PTX") st.air = v; else if (st.tab === "EFF") { st.vol = v; st.tapped = false; } else st.t = v; }
  function act(id) {
    const m = (s) => ui.refresh(s);
    if (id === "reset") { build(); return; }
    if (id === "vt") { st.vt = "low"; m("Lung-protective ventilation: tidal volume 6 mL/kg. Plateau and driving pressure fall."); }
    else if (id === "prone") { st.prone = true; m("Prone: the dorsal lung opens and perfusion matches ventilation better. Oxygenation improves."); }
    else if (id === "rec") { st.rec = true; m("Recruitment with adequate PEEP: collapsed alveoli re-open and stay open."); }
    else if (id === "ster") { st.ster = true; m("Corticosteroids started: they are suggested for ARDS and for severe CAP (not influenza)."); }
    else if (id === "ecmo") { st.ecmo = true; m("ECMO started for refractory hypoxaemia: oxygenation is now supported outside the lung."); }
    else if (id === "abx") { st.abx = true; m("Antibiotics given. Consolidation stops spreading and begins to clear."); }
    else if (id === "o2") { st.o2 = true; m("High-flow oxygen started: saturation improves."); }
    else if (id === "needle") { if (!st.needle) M.kN.place(); }
    else if (id === "tube") { if (!st.tube) M.kT.place(); }
    else if (id === "tap") { if (!st.tapped) M.kC.place(); }
    else if (id === "fibr") { st.fibr = true; m("Intrapleural fibrinolytic and DNase given through the drain: the loculations break down and the pus drains."); }
    else if (id === "physio") { st.physio = true; m("Chest physiotherapy, humidification and cough assist started."); }
    else if (id === "mucol") { st.mucol = true; m("Nebulised saline or mucolytic given: secretions loosen a little."); }
    else if (id === "bronch") { if (!st.bronch) M.kB.place(); }
  }

  /* ---------- readout ---------- */
  function obs() {
    const t = st.tab, rows = []; let body = {}, note = "", marks = {};
    if (t === "ARDS") { const a = ards(); rows.push({ k: "PaO₂/FiO₂", v: st.ecmo ? "on ECMO" : a.pf + " mmHg", tone: a.pf < 100 ? "bad" : a.pf < 200 ? "warn" : "ok" }, { k: "SpO₂", v: a.spo2 + "%", tone: a.spo2 < 90 ? "bad" : "ok" }, { k: "Tidal volume", v: (st.vt === "low" ? "6" : "10") + " mL/kg PBW", tone: st.vt === "low" ? "ok" : "warn" }, { k: "PEEP", v: st.peep + " cmH₂O", tone: st.peep < 8 ? "warn" : "ok" }, { k: "Plateau pressure", v: a.plat + " cmH₂O", tone: a.plat > 30 ? "bad" : a.plat > 27 ? "warn" : "ok" }, { k: "Driving pressure", v: a.dp + " cmH₂O", tone: a.dp > 15 ? "bad" : a.dp > 12 ? "warn" : "ok" }, { k: "Ventilator-injury risk", v: a.vili, tone: a.vili === "high" ? "bad" : a.vili === "raised" ? "warn" : "ok" }); body = { "lung-R": a.cons > 0.5 ? 3 : 2, "lung-L": a.cons > 0.5 ? 3 : 2, chest: 1, heart: a.pf < 100 ? 1 : 0 }; note = a.plat > 30 ? "Plateau pressure above 30: the open alveoli are being overstretched. Lower the tidal volume first." : a.pf < 100 ? "Severe hypoxaemia: use proning and adequate PEEP; consider ECMO in an expert centre." : "Keep the ventilator lung-protective: small breaths, adequate PEEP, low driving pressure."; if (st.prone) marks = {}; }
    if (t === "PNEU") { const p = pneu(); rows.push({ k: "Consolidation", v: Math.round(p.cons * 100) + "% of the lobe", tone: p.cons > 0.6 ? "bad" : p.cons > 0.3 ? "warn" : "ok" }, { k: "SpO₂", v: p.spo2 + "%" + (st.o2 ? " on high-flow O₂" : ""), tone: p.spo2 < 90 ? "bad" : "ok" }, { k: "Temperature", v: p.temp.toFixed(1) + " °C", tone: p.temp > 38 ? "warn" : "ok" }, { k: "HR · RR", v: p.hr + " · " + p.rr + "/min", tone: p.rr > 28 ? "bad" : "info" }, { k: "Severity", v: p.severe ? "severe CAP criteria likely" : "non-severe", tone: p.severe ? "bad" : "ok" }); body = { [/^R/.test(st.lobe) ? "lung-R" : "lung-L"]: p.cons > 0.6 ? 3 : 2, chest: 1 }; note = st.abx ? "Antibiotics started: the infection is controlled. Reassess the response and the duration." : p.severe ? "Severe pneumonia: antibiotics now, oxygen, and consider corticosteroids (not for influenza) and ICU review." : "Start appropriate antibiotics and watch the saturation, the respiratory rate and the effusion."; }
    if (t === "PTX") { const p = ptx(); rows.push({ k: "Air in the pleura", v: Math.round(p.f * 100) + "% of the hemithorax", tone: p.f > 0.5 ? "bad" : p.f > 0.2 ? "warn" : "ok" }, { k: "SpO₂", v: p.spo2 + "%", tone: p.spo2 < 90 ? "bad" : "ok" }, { k: "BP · HR", v: p.sbp + " systolic · " + p.hr + "/min", tone: p.ten > 0.5 ? "bad" : "info" }, { k: "Tension", v: p.ten > 0.3 ? "yes: mediastinal shift, raised JVP" : st.needle || st.tube ? "relieved" : "no", tone: p.ten > 0.3 ? "bad" : "ok" }, { k: "Trachea", v: p.ten > 0.3 ? "deviated to the opposite side" : "central", tone: p.ten > 0.3 ? "bad" : "ok" }); body = { "lung-R": p.f > 0.5 ? 3 : 2, chest: p.ten > 0.3 ? 3 : 1, heart: p.ten > 0.3 ? 2 : 0, neck: p.ten > 0.3 ? 2 : 0 }; note = p.ten > 0.3 ? "Tension pneumothorax: decompress now, do not wait for an X-ray." : st.tube ? "Chest drain in place and the lung re-expanded. Check the swing and the bubbling, and review the chest X-ray." : st.ptx === "simple" && p.f < 0.25 ? "Small primary spontaneous pneumothorax: if minimally symptomatic, conservative or ambulatory management can be considered (BTS 2023)." : "Symptomatic pneumothorax: needle aspiration or a small chest drain."; }
    if (t === "EFF") { const e = eff(); rows.push({ k: "Pleural fluid", v: e.left + " mL" + (e.loc ? " (loculated)" : ""), tone: e.left > 1500 ? "bad" : e.left > 500 ? "warn" : "ok" }, { k: "SpO₂", v: e.spo2 + "%", tone: e.spo2 < 92 ? "bad" : "ok" }, { k: "Type", v: { trans: "transudate (clear)", exud: "exudate (cloudy)", emp: "pus (empyema)" }[st.etype], tone: st.etype === "emp" ? "bad" : "info" }, { k: "Light's criteria", v: st.etype === "trans" ? "transudate" : "exudate", tone: "info" }); body = { "lung-R": e.fr > 0.5 ? 3 : e.fr > 0.15 ? 2 : 0, chest: e.fr > 0.3 ? 2 : 0 }; note = st.etype === "emp" && !st.fibr && st.tube ? "Infected, divided collection: the drain alone may not clear it. A pleural team may add intrapleural enzyme therapy or surgery." : e.fr > 0.4 ? "Large effusion: drain in controlled volumes under ultrasound. Stop if cough or chest tightness starts." : "Small effusion: find the cause. Drain only if it is symptomatic or infection is suspected."; }
    if (t === "PLUG") { const p = plug(); rows.push({ k: "Lobar collapse", v: Math.round(p.c * 100) + "% of " + st.plugLobe, tone: p.c > 0.6 ? "bad" : p.c > 0.3 ? "warn" : "ok" }, { k: "SpO₂", v: p.spo2 + "%", tone: p.spo2 < 90 ? "bad" : "ok" }, { k: "Peak airway pressure", v: p.paw + " cmH₂O", tone: p.paw > 30 ? "bad" : "info" }, { k: "Mediastinum", v: p.c > 0.4 ? "shifted towards the collapsed side" : "central", tone: p.c > 0.4 ? "warn" : "ok" }); body = { [/^R/.test(st.plugLobe) ? "lung-R" : "lung-L"]: p.c > 0.5 ? 3 : 2, chest: 1 }; note = st.bronch ? "Plug removed and the lobe re-expanded. Continue humidification and physiotherapy." : p.c > 0.5 ? "A persistent plug with a collapsed lobe and falling saturation: bronchoscopy." : "Early plug: start physiotherapy and humidification, and watch the lobe."; }
    return { params: rows, body, marks, note };
  }
  const info = () => ({ anat: T().anat, patho: T().patho, interv: T().interv });
  function clin() {
    const t = st.tab, lines = [];
    const L = { ARDS: ["Berlin and the 2024 global definition: acute onset within a week of a trigger, bilateral opacities not fully explained by effusion, collapse or nodules, and respiratory failure not fully explained by cardiac failure or overload. The global definition also allows high-flow nasal oxygen of 30 L/min or more, lung ultrasound and SpO₂/FiO₂ in resource-limited settings.", "ATS 2024: corticosteroids are suggested; a higher-PEEP strategy is suggested for moderate to severe ARDS; prone positioning for more than 12 hours a day is recommended for moderate to severe ARDS; high-frequency oscillation is not recommended; ECMO can be considered in selected patients in experienced centres. Standard care: tidal volume 4–8 mL/kg predicted body weight, plateau pressure below 30 cmH₂O, and a restrictive fluid strategy once shock is resolved."],
      PNEU: ["Chest X-ray or lung ultrasound; lung ultrasound is a reasonable alternative in the 2025 ATS update. Check for sepsis, an effusion, and the criteria for severe pneumonia.", "ATS 2025 community-acquired pneumonia: systemic corticosteroids suggested in hospitalised adults with severe CAP, except in influenza; not suggested in non-severe CAP. Duration of antibiotics is tailored to response. Look for local resistance and obtain cultures per protocol."],
      PTX: ["Clinical signs (hyperresonance, absent breath sounds, tracheal deviation in tension), bedside ultrasound (absent lung sliding) and chest X-ray in stable patients.", "BTS 2023: for primary spontaneous pneumothorax, minimally symptomatic patients can be managed conservatively or on an ambulatory pathway; otherwise needle aspiration or chest-tube drainage. In a tension pneumothorax decompress immediately, then drain. Give discharge and activity advice, and consider surgery for recurrence."],
      EFF: ["Chest X-ray (blunted costophrenic angle, meniscus), ultrasound to size and characterise the fluid and to guide the needle.", "BTS 2023 pleural disease: investigate an undiagnosed unilateral effusion; pleural infection needs antibiotics and drainage, with intrapleural fibrinolytic and DNase or surgery for collections that do not drain. Drain large effusions in controlled volumes, and send fluid for protein, LDH, pH, glucose, cytology and culture as appropriate."],
      PLUG: ["Chest X-ray: lobar collapse with a shift of the fissure and mediastinum towards the lesion, and crowded ribs. Sudden hypoxaemia and high airway pressure in a ventilated patient are a common clue.", "Start with humidification, physiotherapy, suction, cough assist and nebulised saline or a mucolytic per local protocol. Bronchoscopy for persistent plugging with significant collapse or hypoxaemia. Treat the cause, such as asthma, infection or poor cough."] }[t];
    lines.push(["Diagnosis", L[0]], ["Management", L[1]], ["Reference", "2024 ATS ARDS guideline and 2024 global ARDS definition; 2025 ATS community-acquired pneumonia guideline; 2023 BTS pleural disease guideline; local protocols. Pulmonary embolism is in its own lab. Numbers are illustrative."]);
    return { lines, draw: (el) => draw(el) };
  }
  function draw(el) {
    const mk = (title, f) => { const d = document.createElement("div"); d.className = "img"; const c = document.createElement("canvas"); c.width = 300; c.height = 300; const tt = document.createElement("small"); tt.textContent = title; d.append(c, tt); el.append(d); f(c.getContext("2d")); };
    const t = st.tab, c = st.cur;
    mk("Chest X-ray (schematic)", (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 300, 300); g.fillStyle = "#1a1a1a"; g.beginPath(); g.ellipse(95, 150, 62, 100, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(205, 150, 62, 100, 0, 0, 7); g.fill(); g.fillStyle = "#cfcfcf"; g.beginPath(); g.ellipse(160 - (t === "PTX" ? 22 * c.ten : 0) + (t === "PLUG" ? (/^R/.test(st.plugLobe) ? -14 : 14) * c.plug : 0), 190, 30, 52, 0, 0, 7); g.fill();
      if (t === "ARDS") { g.fillStyle = "rgba(220,220,220," + (0.2 + 0.55 * c.cons) + ")"; g.fillRect(40, 140, 100, 110); g.fillRect(160, 140, 100, 110); g.fillStyle = "rgba(220,220,220," + 0.12 * c.cons + ")"; g.fillRect(40, 60, 100, 80); g.fillRect(160, 60, 100, 80); }
      if (t === "PNEU") { g.fillStyle = "rgba(235,235,235," + (0.2 + 0.7 * c.cons) + ")"; const l = LOBES[st.lobe], x = /^R/.test(st.lobe) ? 95 : 205, y = 150 - l.p[1] * 100; g.beginPath(); g.ellipse(x, y, 40, 32, 0, 0, 7); g.fill(); if (st.comp === "eff") { g.fillStyle = "rgba(235,235,235,.8)"; g.fillRect(36, 240, 70, 20); } }
      if (t === "PTX") { g.strokeStyle = "#e8e8e8"; g.lineWidth = 2; g.beginPath(); g.moveTo(70 + 30 * c.air, 70); g.quadraticCurveTo(50 + 40 * c.air, 150, 70 + 30 * c.air, 230); g.stroke(); g.fillStyle = "#000"; g.beginPath(); g.ellipse(60, 150, 18 + 30 * c.air, 90, 0, 0, 7); g.fill(); }
      if (t === "EFF") { g.fillStyle = "rgba(235,235,235,.85)"; g.beginPath(); g.moveTo(35, 250); g.lineTo(35, 250 - 180 * c.fluid); g.quadraticCurveTo(80, 262 - 180 * c.fluid, 140, 250 - 130 * c.fluid); g.lineTo(140, 250); g.fill(); }
      if (t === "PLUG") { g.fillStyle = "rgba(220,220,220," + (0.15 + 0.7 * c.plug) + ")"; const x = /^R/.test(st.plugLobe) ? 95 : 205, y = /^.U/.test(st.plugLobe) ? 100 : /^.M/.test(st.plugLobe) ? 150 : 200; g.beginPath(); g.ellipse(x, y, 36, 30, 0, 0, 7); g.fill(); }
      g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(t === "ARDS" ? "bilateral dependent opacities" : t === "PNEU" ? "lobar consolidation · air bronchogram" : t === "PTX" ? "visceral pleural line · no lung markings beyond" : t === "EFF" ? "meniscus · blunted costophrenic angle" : "lobar collapse · shift towards the lesion", 8, 292); g.fillStyle = "#e8e8e8"; g.fillText("R", 8, 18); g.fillText("L", 284, 18); });
    if (t === "ARDS") { const a = ards(); mk("Lung volume vs pressure (schematic)", (g) => { g.fillStyle = "#0a0f16"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.moveTo(34, 20); g.lineTo(34, 270); g.lineTo(290, 270); g.stroke(); g.strokeStyle = "#7ec8ff"; g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= 250; x++) { const p = (x / 250) * 40, v = 1 / (1 + Math.exp(-(p - 18 + 10 * a.rec) / 4)); const y = 270 - v * 230; x ? g.lineTo(34 + x, y) : g.moveTo(34 + x, y); } g.stroke(); const px = 34 + (a.plat / 40) * 250, pe = 34 + (st.peep / 40) * 250; g.strokeStyle = "#ffd166"; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(pe, 270); g.lineTo(pe, 40); g.stroke(); g.strokeStyle = a.plat > 30 ? "#ff6b6b" : "#9fe870"; g.beginPath(); g.moveTo(px, 270); g.lineTo(px, 40); g.stroke(); g.setLineDash([]); g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText("PEEP " + st.peep + " · plateau " + a.plat + (a.plat > 30 ? " (overstretch)" : ""), 8, 292); g.fillStyle = "#e8e8e8"; g.fillText("volume", 6, 16); g.fillText("pressure →", 220, 286); }); }
    if (t === "PLUG") mk("Bronchoscopic view (schematic)", (g) => { g.fillStyle = "#050a10"; g.fillRect(0, 0, 300, 300); g.fillStyle = "#c97b7b"; g.beginPath(); g.arc(150, 150, 110, 0, 7); g.fill(); g.fillStyle = "#050a10"; g.beginPath(); g.arc(150, 150, 70, 0, 7); g.fill(); if (!st.bronch) { g.fillStyle = "#e6cf4a"; g.beginPath(); g.ellipse(150, 152, 22 + 46 * c.plug, 16 + 42 * c.plug, 0, 0, 7); g.fill(); } g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(st.bronch ? "airway cleared" : "yellow-white plug in the " + st.plugLobe + " bronchus", 8, 292); });
    if (t === "PTX" || t === "EFF") mk("Lung ultrasound (schematic)", (g) => { g.fillStyle = "#101820"; g.fillRect(0, 0, 300, 300); g.fillStyle = "#e0e0e0"; g.fillRect(0, 60, 300, 6); if (t === "PTX" && c.air > 0.1) { g.fillStyle = "#555"; for (let y = 80; y < 280; y += 14) g.fillRect(0, y, 300, 3); g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText("stratosphere sign · no lung sliding", 8, 292); } else if (t === "EFF" && c.fluid > 0.05) { g.fillStyle = "#050a10"; g.fillRect(0, 70, 300, 120); g.fillStyle = "#9a9a9a"; g.beginPath(); g.ellipse(150, 230, 90 * (1 - 0.4 * c.fluid), 40, 0, 0, 7); g.fill(); g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(st.etype === "emp" ? "septations in the fluid" : "anechoic fluid above the collapsing lung", 8, 292); } else { g.fillStyle = "#ccc"; for (let x = 0; x < 300; x += 16) g.fillRect(x, 66, 8, 140); g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText("normal sliding lung (seashore)", 8, 292); } });
  }

  const lab = {
    id: "resp", name: "Lung & Pleura Lab", tag: "ARDS, pneumonia, pneumothorax, effusion, mucus plug", icon: "🫁", tabs: ORDER.map((k) => ({ id: k, label: TABS[k].label, sub: TABS[k].sub })), get tab() { return st.tab; },
    credit: "Lungs: BodyParts3D © DBCLS, CC BY-SA 2.1 JP. Adapted for teaching.",
    selectHint: "Pick a condition, then treat it. For drains, needles and the bronchoscope, drag the tool tip to the glowing ring (or use the button). PE has its own lab.",
    opts: () => {
      const o = [];
      if (st.tab === "ARDS") o.push({ id: "sev", label: "Severity", cur: st.sev, choices: [["mild", "Mild (P/F 200–300)"], ["mod", "Moderate (P/F 100–200)"], ["sev", "Severe (P/F under 100)"]] });
      if (st.tab === "PNEU") { o.push({ id: "lobe", label: "Lobe", cur: st.lobe, choices: Object.keys(LOBES).map((k) => [k, k]) }); o.push({ id: "comp", label: "Complication", cur: st.comp, choices: [["none", "None"], ["eff", "Parapneumonic effusion"], ["ards", "ARDS"]] }); }
      if (st.tab === "PTX") o.push({ id: "ptx", label: "Type", cur: st.ptx, choices: [["simple", "Simple (spontaneous)"], ["tension", "Tension"]] });
      if (st.tab === "EFF") o.push({ id: "etype", label: "Fluid", cur: st.etype, choices: [["trans", "Transudate"], ["exud", "Exudate"], ["emp", "Empyema (infected)"]] });
      if (st.tab === "PLUG") o.push({ id: "plugLobe", label: "Plugged lobe", cur: st.plugLobe, choices: ["RUL", "RLL", "LUL", "LLL"].map((k) => [k, k]) });
      return o;
    },
    slider: () => st.tab === "ARDS" ? { id: "peep", label: "PEEP (cmH₂O)", min: 0, max: 24, step: 1, v: st.peep, unit: "" } : st.tab === "PTX" ? { id: "air", label: "Air in the pleura (%)", min: 10, max: 100, step: 5, v: st.air, unit: "%" } : st.tab === "EFF" ? { id: "vol", label: "Pleural fluid (mL)", min: 100, max: 2500, step: 100, v: st.vol, unit: " mL" } : { id: "t", label: st.tab === "PNEU" ? "Hours since onset" : "Hours blocked", min: 0, max: st.tab === "PNEU" ? 72 : 48, step: 1, v: st.t, unit: " h" },
    actions: () => {
      const a = [];
      if (st.tab === "ARDS") a.push({ id: "vt", label: "LOW TIDAL VOLUME", hint: "6 mL/kg predicted weight.", off: st.vt === "low" }, { id: "rec", label: "RECRUIT", hint: "Open the collapsed lung.", off: st.rec }, { id: "prone", label: "PRONE", hint: "More than 12 h a day.", off: st.prone }, { id: "ster", label: "STEROID", hint: "Suggested in ARDS.", off: st.ster }, { id: "ecmo", label: "ECMO", hint: "Refractory hypoxaemia.", off: st.ecmo });
      if (st.tab === "PNEU") a.push({ id: "abx", label: "ANTIBIOTICS", hint: "Prompt, appropriate.", off: st.abx }, { id: "o2", label: "HIGH-FLOW O₂", hint: "Oxygen.", off: st.o2 }, { id: "ster", label: "STEROID", hint: "Severe CAP, not influenza.", off: st.ster });
      if (st.tab === "PTX") a.push({ id: "needle", label: "NEEDLE DECOMPRESS", hint: "Relieve the tension.", off: st.needle || st.tube }, { id: "tube", label: "CHEST DRAIN", hint: "Re-expand the lung.", off: st.tube });
      if (st.tab === "EFF") a.push({ id: "tap", label: "THORACENTESIS", hint: "Drain in controlled volumes.", off: st.tapped || st.tube }, { id: "tube", label: "CHEST DRAIN", hint: "For infection or recurrence.", off: st.tube }, { id: "fibr", label: "FIBRINOLYTIC + DNase", hint: "For a loculated empyema.", off: st.fibr || !st.tube || st.etype !== "emp" });
      if (st.tab === "PLUG") a.push({ id: "physio", label: "PHYSIOTHERAPY", hint: "Cough assist, suction.", off: st.physio }, { id: "mucol", label: "NEBULISED SALINE", hint: "Loosen secretions.", off: st.mucol }, { id: "bronch", label: "BRONCHOSCOPY", hint: "Remove the plug.", off: st.bronch });
      a.push({ id: "reset", label: "RESET", hint: "Start again.", off: false }); return a;
    },
    dragHint: "Drag the needle, the chest-tube tip or the bronchoscope to the glowing ring.",
    views: [{ id: "front", label: "Front", f: () => ({ ry: 0.2, rx: 0.1, d: 4.6, tx: 0.1, ty: 0 }) }, { id: "back", label: "Back", f: () => ({ ry: 3.14, rx: 0.1, d: 4.6, tx: 0.1, ty: 0 }) }, { id: "side", label: "Right side", f: () => ({ ry: -1.57, rx: 0.1, d: 4.2, tx: 0.4, ty: 0 }) }, { id: "top", label: "Top", f: () => ({ ry: 0.2, rx: 1.2, d: 4.0, tx: 0.1, ty: 0 }) }],
    legend: [["#f0a0a8", "Lung"], ["#a8d8ff", "Airways"], ["#d9c7a2", "Consolidation"], ["#f2d27a", "Pleural fluid"], ["#dff2ff", "Pleural air"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ st, kit: st.tab === "PLUG" ? M.kB : st.tab === "PTX" ? M.kT : M.kT }), tabLabel: () => T().label,
  };
  build();
  return lab;
}
