/* HEART ATTACK LAB (acute myocardial infarction) on the PATHODYNAMICS engine.
   Pick the blocked coronary, read the ECG territory, drag the thrombus out, balloon and stent, or give fibrinolysis.
   Teaching model: myocardium is lost with TIME and COLLATERALS; reopening the artery does not bring back necrosed muscle.
   Content aligned to the 2025 ACC/AHA/ACEP/NAEMSP/SCAI ACS guideline (checked Nov 2026 against the published summaries). All numbers are illustrative, not patient data. */
import { THREE, C } from "../stage.js?v=20261126gk";
import { clotKit, vessels, halo, clamp } from "./common.js?v=20261126gk";
import { organ } from "../anatomy.js?v=20261126gk";

const ROT = 0.4, LVC = [0.22, -0.1, -0.05], LVR = [0.52, 0.86, 0.5], RVC = [-0.42, -0.2, 0.2], RVR = [0.42, 0.66, 0.45];
const lvPt = (ph, th, k) => { k = k || 1.03; let x = LVR[0] * Math.cos(th) * Math.cos(ph) * k, y = LVR[1] * Math.sin(th) * k, z = LVR[2] * Math.cos(th) * Math.sin(ph) * k; const c = Math.cos(ROT), s = Math.sin(ROT); return [x * c - y * s + LVC[0], x * s + y * c + LVC[1], z + LVC[2]]; };
const rvPt = (ph, th, k) => { k = k || 1.03; return [RVC[0] + RVR[0] * Math.cos(th) * Math.cos(ph) * k, RVC[1] + RVR[1] * Math.sin(th) * k, RVC[2] + RVR[2] * Math.cos(th) * Math.sin(ph) * k]; };

const SITES = {
  RCA: { label: "RCA", sub: "Right coronary", vessel: "RCA", u: 0.5, down: ["PDA"], tags: { rca: 1, pda: 1, rv: 0.85 }, frac: 0.3, lead: "inf", hr: 52,
    anat: "The right coronary artery (RCA) runs in the right atrioventricular groove, supplies the right ventricle and the sinus and AV nodes in most people, and ends as the posterior descending artery (PDA) in right-dominant hearts.",
    patho: "A proximal RCA occlusion causes inferior wall infarction and often right ventricular infarction. The RV stops pumping, preload to the left heart falls, and the patient can be hypotensive with clear lungs and raised neck veins. Nodal ischaemia causes bradycardia and AV block.",
    interv: "Primary PCI is the preferred reperfusion strategy. With RV infarction avoid preload-reducing drugs (nitrates, diuretics); fluids, and pacing for symptomatic block, are the usual supports." },
  LAD: { label: "LAD", sub: "Left anterior descending", vessel: "LAD", u: 0.28, down: [], tags: { lad: 1 }, frac: 0.4, lead: "ant", hr: 84,
    anat: "The left anterior descending (LAD) artery runs down the anterior interventricular groove to the apex. Its branches supply the anterior wall, the apex and the anterior two-thirds of the septum.",
    patho: "Anterior infarction removes the largest share of the left ventricle. Ejection fraction falls early, the lungs congest and ventricular arrhythmias are common. A proximal LAD occlusion (before the first septal and diagonal branches) is the most dangerous.",
    interv: "Primary PCI as early as possible: the anterior territory is the largest, so each minute of delay costs more muscle. Heart failure and VF are the complications to watch." },
  LCX: { label: "LCx", sub: "Circumflex", vessel: "LCX", u: 0.45, down: ["OM"], tags: { lcx: 1 }, frac: 0.25, lead: "lat", hr: 80,
    anat: "The left circumflex (LCx) artery runs in the left atrioventricular groove to the back of the heart. Its obtuse marginal branches supply the lateral wall and part of the posterior wall.",
    patho: "The lateral and posterior wall can be 'electrically silent': the 12-lead ECG is often non-diagnostic, with only subtle ST changes in the lateral leads, or ST depression with tall R waves in V1–V2 (posterior infarction).",
    interv: "Treat as STEMI equivalent when the story and ECG fit (posterior leads V7–V9 help). Primary PCI is the usual approach." },
  LM: { label: "Left main", sub: "LM trunk", vessel: "LM", u: 0.5, down: ["LAD", "DIAG", "LCX", "OM"], tags: { lad: 1, lcx: 1 }, frac: 0.65, lead: "lm", hr: 105,
    anat: "The left main (LM) coronary artery is a short trunk from the aorta that divides into the LAD and the circumflex, so it feeds most of the left ventricle.",
    patho: "Left main occlusion drops perfusion to most of the left ventricle at once: severe pump failure, cardiogenic shock and malignant arrhythmias. The ECG may show widespread ST depression with ST elevation in aVR rather than a classic STEMI.",
    interv: "A time-critical emergency: immediate angiography and revascularisation, with haemodynamic support (inotropes, mechanical circulatory support) in shock." },
  PDA: { label: "PDA", sub: "Posterior descending", vessel: "PDA", u: 0.55, down: [], tags: { pda: 1 }, frac: 0.1, lead: "inf2", hr: 70,
    anat: "The posterior descending artery (PDA) runs in the inferior interventricular groove and supplies the inferior septum and the inferior wall of the left ventricle.",
    patho: "A small territory: a limited inferior infarct with modest ST elevation in the inferior leads, usually well tolerated unless there is already poor ventricular function.",
    interv: "PCI if the vessel is large and symptoms or ST changes persist; small distal vessels are sometimes managed medically." },
};
const TABS = ["RCA", "LAD", "LCX", "LM", "PDA"];
const COLL = { poor: { tau: 2.2, cbf: 8 }, mod: { tau: 4.5, cbf: 18 }, good: { tau: 9, cbf: 32 } };
/* ST shift per lead (QRS height = 1) for each occlusion pattern */
const ST = {
  inf: { II: 0.3, III: 0.42, aVF: 0.36, V1: 0.14, I: -0.15, aVL: -0.28 },
  inf2: { II: 0.2, III: 0.26, aVF: 0.22, I: -0.08, aVL: -0.14 },
  ant: { V1: 0.35, V2: 0.6, V3: 0.62, V4: 0.45, V5: 0.2, V6: 0.1, I: 0.12, aVL: 0.16, III: -0.12, aVF: -0.1, aVR: -0.1 },
  lat: { I: 0.15, aVL: 0.2, V5: 0.25, V6: 0.3, II: 0.05, V1: -0.2, V2: -0.25, III: -0.1 },
  lm: { aVR: 0.3, V1: 0.1, II: -0.25, III: -0.1, aVF: -0.2, I: -0.25, V2: -0.1, V3: -0.28, V4: -0.3, V5: -0.35, V6: -0.3 },
};
const LEADS = ["I", "aVR", "II", "aVL", "III", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

export default function create(S, ui) {
  const st = { acs: "stemi", tab: "LAD", coll: "mod", t: 1, removed: false, lysed: false, balloon: false, stent: false, reper: 0, rAt: null, rec: 0, vf: false, ghost: false, pulse: 0 };
  const site = () => SITES[st.tab];
  let M = {}, V = {}, F = {}, tis = [], kit = null, rings = {}, dirty = true, accT = 0, stentM = null, balM = null, plaque = null, lvm = null, HG = null, HM = null;
  /* real heart (BodyParts3D) fitted to the box of the two ventricles the lab was built on; coronaries are laid on its surface */
  organ("heart", { rot: [0, 0, 0], fit: { c: [-0.1, -0.12, 0], r: [0.85, 0.9, 0.6] } }).then((g) => { HG = g; HM = new THREE.Mesh(g); HM.updateMatrixWorld(true); if (M.grp) build(); }).catch(() => {});
  const RC = new THREE.Raycaster(), hc = new THREE.Vector3(-0.1, -0.12, 0);
  function snap(pt, lift) { const p = new THREE.Vector3(...pt), d = p.clone().sub(hc); if (d.lengthSq() < 1e-6) return pt; d.normalize(); RC.set(hc.clone().addScaledVector(d, 3), d.clone().negate()); const h = RC.intersectObject(HM, false)[0]; if (!h) return pt; const n = h.face ? h.face.normal.clone() : d; return h.point.clone().addScaledVector(d, lift).toArray(); }
  const heartClass = (P) => { const a = Math.hypot((P.x - RVC[0]) / RVR[0], (P.y - RVC[1]) / RVR[1], (P.z - RVC[2]) / RVR[2]), b = Math.hypot((P.x - LVC[0]) / (LVR[0] * 1.15), (P.y - LVC[1]) / LVR[1], (P.z - LVC[2]) / LVR[2]); return a < b * 0.92 && P.x < -0.15 ? { tag: "rv", rank: 0.35, h: 0.4, sh: 0.95 } : classifyLV(P); };

  function lvGeom() { const g = new THREE.SphereGeometry(1, 72, 54); g.scale(...LVR); g.rotateZ(ROT); g.translate(...LVC); return g; }
  const unLV = new THREE.Vector3();
  function classifyLV(P) {
    unLV.set(P.x - LVC[0], P.y - LVC[1], P.z - LVC[2]).applyAxisAngle(new THREE.Vector3(0, 0, 1), -ROT);
    const u = unLV.x / LVR[0], v = unLV.y / LVR[1], w = unLV.z / LVR[2]; let tag = "lcx", cen = [0.9, 0.2, 0.2];
    if (v < -0.62 && w > -0.5) { tag = "lad"; cen = [-0.2, -1, 0.2]; }
    else if (w < -0.3 && u < 0.35) { if (u < -0.2) { tag = "pda"; cen = [-0.5, -0.2, -0.7]; } else { tag = "rca"; cen = [0.1, -0.3, -0.85]; } }
    else if (u > 0.45 && w < 0.6) { tag = "lcx"; cen = [0.95, 0.1, 0.0]; }
    else if (w >= -0.3 && u <= 0.45) { tag = "lad"; cen = [-0.4, -0.2, 0.8]; }
    const d = Math.hypot(u - cen[0], v - cen[1], w - cen[2]), n = 0.5 + 0.5 * Math.sin(9 * u + 2) * Math.sin(8 * v + 1) * Math.sin(7 * w + 3);
    return { tag, rank: clamp(d / 1.6 + 0.35 * n, 0, 1), h: 0.5 + 0.5 * Math.sin(5 * u + 2 * v) * Math.sin(6 * w + 1), sh: 0.88 + 0.12 * n };
  }

  function build() {
    S.clear(); M = {}; V = {}; F = {}; tis = []; rings = {}; kit = null; stentM = null; balM = null;
    const grp = S.add(new THREE.Group()); M.grp = grp;
    if (HG) { const hm = S.tissue(HG.clone(), 0x9a3f4b, heartClass, { transparent: true, opacity: 0.9, shininess: 50 }); hm.mesh.userData.hemi = 1; lvm = hm.mesh; grp.add(hm.mesh); tis.push(hm); }
    else {
    const lv = S.tissue(lvGeom(), 0x9a3f4b, classifyLV, { transparent: true, opacity: 0.9, shininess: 50 }); lv.mesh.userData.hemi = 1; lvm = lv.mesh; grp.add(lv.mesh); tis.push(lv);
    const rg = new THREE.SphereGeometry(1, 48, 36); rg.scale(...RVR); rg.translate(...RVC); const rv = S.tissue(rg, 0xa94d57, () => ({ tag: "rv", rank: 0.35, h: 0.4 }), { transparent: true, opacity: 0.88 }); rv.mesh.userData.hemi = 1; grp.add(rv.mesh); tis.push(rv);
    }
    const plain = (geo, hex, pos) => { const m = new THREE.Mesh(geo, S.mat(hex)); if (pos) m.position.set(...pos); grp.add(m); return m; };
    plain(new THREE.SphereGeometry(0.2, 24, 18), 0x8a4a58, [0.38, 0.56, -0.12]); plain(new THREE.SphereGeometry(0.26, 24, 18), 0x9a5662, [-0.78, 0.42, 0.05]);
    const ao = S.tube([[-0.03, 0.5, 0.0], [-0.02, 0.95, 0.04], [0.1, 1.32, 0.0], [0.42, 1.36, -0.1], [0.58, 1.0, -0.2]], 0.17, 0xd9b9b0, { emis: 0x201010, seg: 40 }); grp.add(ao);
    const pt = S.tube([[-0.4, 0.5, 0.5], [-0.36, 0.95, 0.5], [-0.15, 1.2, 0.35]], 0.12, 0x7f93d8, { emis: 0x101840 }); grp.add(pt);
    /* coronary arteries */
    const R = lvPt, defs = [
      ["LM", [[-0.02, 0.6, 0.12], [0.0, 0.64, 0.24], R(2.0, 1.0)], 0.036],
      ["LAD", [R(2.0, 1.0), R(1.98, 0.6), R(1.95, 0.15), R(1.9, -0.3), R(1.85, -0.75), R(1.75, -1.15), R(1.6, -1.32)], 0.03],
      ["DIAG", [R(1.95, 0.4), R(1.5, 0.15), R(1.05, -0.2), R(0.8, -0.65)], 0.02],
      ["LCX", [R(2.0, 1.0), R(1.4, 1.0), R(0.7, 0.85), R(0.0, 0.62), R(-0.7, 0.42), R(-1.2, 0.3)], 0.03],
      ["OM", [R(0.55, 0.78), R(0.4, 0.3), R(0.3, -0.25), R(0.3, -0.75)], 0.02],
      ["RCA", [[-0.12, 0.52, 0.1], rvPt(2.3, 1.0), rvPt(2.75, 0.55), rvPt(3.1, 0.05), rvPt(3.5, -0.4), rvPt(4.0, -0.75), rvPt(4.3, -0.85)], 0.034],
      ["PDA", [rvPt(4.3, -0.85), R(4.6, -0.45), R(4.65, -0.85), R(4.7, -1.2)], 0.026],
    ];
    if (HG) defs.forEach((d) => { d[1] = d[1].map((q, i) => (i === 0 && (d[0] === "LM" || d[0] === "RCA") ? q : snap(q, d[2] * 0.4))); });
    const vv = vessels(S, grp, defs, 0xff5a46, { dens: 18 }); V = vv.T; F = vv.F;
    Object.keys(V).forEach((n) => { const h = halo(S, grp, V[n], n); rings[n] = h; });
    kit = clotKit(S, grp, ui, { size: 0.05, ring: 0.1, thr: 0.34, color: 0x6b0f1c, onRemoved: () => { st.removed = true; if (st.rAt == null) st.rAt = st.t; ui.refresh("Thrombus retrieved. Flow partly restored; a residual plaque stenosis remains."); } });
    const lab = S.label(site().label, [0, 0, 0], "#ff9aa6"); M.lab = lab; grp.add(lab);
    place(); dirty = true;
  }
  function place() {
    const k = site(), cur = V[k.vessel].userData.curve; kit.place(cur, k.u); const p = kit.home;
    M.lab.position.set(p.x, p.y + 0.2, p.z + 0.12); M.lab.material.map && 0;
    if (plaque) plaque.parent && plaque.parent.remove(plaque);
    const tg = cur.getTangentAt(k.u).normalize(), r = V[k.vessel].userData.r;
    plaque = new THREE.Mesh(new THREE.TorusGeometry(r * 1.05, r * 0.55, 8, 18), new THREE.MeshPhongMaterial({ color: 0xe8d07a, emissive: 0x403000 })); plaque.position.copy(p); plaque.lookAt(p.clone().add(tg)); M.grp.add(plaque);
    if (stentM) { stentM.parent && stentM.parent.remove(stentM); stentM = null; } if (balM) { balM.parent && balM.parent.remove(balM); balM = null; }
    Object.assign(st, { removed: false, lysed: false, balloon: false, stent: false, reper: 0, rAt: null, rec: 0, vf: false });
    const kk = site().vessel; S.view({ ry: kk === "RCA" || kk === "PDA" ? 0.5 : kk === "LCX" || kk === "OM" ? -0.9 : -0.2, rx: kk === "PDA" ? -0.9 : 0.15, d: 4.1, tx: 0.05, ty: -0.12, tz: 0 });
  }

  /* ---------- time and tissue ---------- */
  const tNow = () => (st.rAt != null ? st.rAt : st.t);
  const cfOf = () => { const tau = COLL[st.coll].tau, t = tNow(); return (st.acs === "nstemi" ? 0.45 : 1) * (t <= 0.3 ? 0 : 1 - Math.exp(-(t - 0.3) / tau)); };
  const frac = () => site().frac * (st.tab === "RCA" ? 1 : 1);
  function paintAll() {
    const tg = site().tags, cf = cfOf(), core = C(0x3a1f2c), pen = C(0xffb347), rec = C(0x8fe8b0), reperf = st.rAt != null;
    tis.forEach((T) => T.paint((tag, rank, h, out) => {
      const w = tg[tag]; if (!w || h > w) return; if (rank < cf) { out.lerp(core, 0.9); return; }
      if (!reperf) out.lerp(pen, 0.7 - 0.2 * st.reper); else { out.lerp(pen, 0.7 * (1 - st.rec)); out.lerp(rec, 0.3 * st.rec); }
    }));
  }
  function flowTarget() { if (st.stent) return 1; if (st.balloon) return 0.8; if (st.removed) return 0.55; if (st.lysed) return 0.7; return 0; }
  function frame(dt) {
    const k = site(), target = flowTarget(); st.reper += (target - st.reper) * Math.min(1, dt * 1.6); if (Math.abs(target - st.reper) < 0.003) st.reper = target;
    if (st.reper > 0.3 && st.rAt == null) st.rAt = st.t; if (st.rAt != null && st.rec < 1) st.rec = Math.min(1, st.rec + dt * 0.45);
    const down = new Set(k.down), collat = COLL[st.coll].cbf / 100;
    Object.keys(V).forEach((n) => { const f = F[n], m = V[n]; let rate = 1, to = 1;
      if (n === k.vessel) { if (st.reper < 0.98) { to = 0.5; rate = 0.15 + 0.85 * st.reper; } } else if (down.has(n)) rate = collat * 0.5 + (1 - collat * 0.5) * st.reper;
      f.rate += (rate - f.rate) * Math.min(1, dt * 4); f.to = to; const dim = n === k.vessel ? 0.85 : down.has(n) ? 0.5 + 0.5 * st.reper : 1; m.material.color.setRGB(1 * dim, 0.35 * dim, 0.27 * dim); });
    kit.frame(dt, st.lysed && !st.removed ? 1 - 0.7 * clamp(st.reper / 0.7, 0, 1) : 1); if (st.lysed && !st.removed && st.reper > 0.65) kit.mesh.visible = kit.mesh.scale.x > 0.34;
    if (plaque) plaque.scale.setScalar(st.stent ? 0.01 : st.balloon ? 0.55 : st.reper > 0.5 && st.removed ? 0.9 : 1);
    if (balM) { balM.scale.setScalar(1 + 0.25 * Math.sin(S.time() * 10)); balM.visible = !st.stent; }
    accT += dt; if ((dirty || (st.rAt != null && st.rec < 1)) && accT > 0.06) { accT = 0; paintAll(); dirty = false; }
    const cf = cfOf(), contr = st.vf ? 0.15 : clamp(1 - 0.75 * cf * frac() * 1.6, 0.2, 1), hr = st.vf ? 4 : 1.3 + (st.tab === "RCA" ? -0.3 : 0); st.pulse += dt * hr * 2 * Math.PI;
    const sc = 1 + 0.035 * contr * Math.max(0, Math.sin(st.pulse)) ** 2; M.grp.scale.setScalar(sc);
    M.grp.children.forEach((c) => { if (c.userData.hemi) c.material.opacity += ((st.ghost ? 0.2 : 0.9) - c.material.opacity) * Math.min(1, dt * 5); });
  }
  S.hooks.push(frame);

  /* ---------- tap / drag ---------- */
  S.onGrab = (o) => { kit.grabbed(o); }; S.onDrag = (o, w) => { kit.drag(w); }; S.onDrop = () => { kit.drop(); };
  S.onTap = (o) => { if (!o || !o.userData.site) return; const n = o.userData.site, m = { LM: "LM", LAD: "LAD", DIAG: "LAD", LCX: "LCX", OM: "LCX", RCA: "RCA", PDA: "PDA" }[n]; if (m && m !== st.tab) { setTab(m); ui.refresh(); } };

  function setTab(k) { st.tab = k; build(); }
  function setOpt(id, v) { if (id === "coll" || id === "acs") { st[id] = v; dirty = true; } else if (id === "ghost") st.ghost = v === "1"; }
  function setT(v) { if (st.rAt != null) return; st.t = v; dirty = true; }
  function act(id) {
    const ok = st.removed || st.lysed;
    if (id === "lysis") { if (!st.removed && !st.lysed) { st.lysed = true; if (st.rAt == null) st.rAt = st.t; ui.refresh("Fibrinolysis given. Flow partly restored; angiography is still needed."); } }
    else if (id === "balloon") { if (ok && !st.balloon && !st.stent) { st.balloon = true; const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 14), new THREE.MeshPhongMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.55 })); m.position.copy(kit.home); const cur = V[site().vessel].userData.curve; m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cur.getTangentAt(site().u).normalize()); M.grp.add(m); balM = m; ui.refresh("Balloon inflated. Channel opened through the plaque."); } }
    else if (id === "stent") { if (ok && !st.stent) { st.stent = true; const cur = V[site().vessel].userData.curve, u = site().u, pts = []; for (let i = 0; i <= 8; i++) pts.push(cur.getPointAt(clamp(u - 0.09 + i * 0.0225, 0.01, 0.99))); const c2 = new THREE.CatmullRomCurve3(pts); stentM = new THREE.Mesh(new THREE.TubeGeometry(c2, 24, V[site().vessel].userData.r * 1.35, 8, false), new THREE.MeshBasicMaterial({ color: 0xcfe9ff, wireframe: true })); M.grp.add(stentM); ui.refresh("Stent deployed. Vessel restored (TIMI 3 flow)."); } }
    else if (id === "vf") { st.vf = true; ui.refresh(); } else if (id === "shock") { st.vf = false; ui.refresh("Shock delivered. Sinus rhythm restored."); }
    else if (id === "reset") build();
  }

  /* ---------- readout ---------- */
  function est() {
    const k = site(), cf = cfOf(), reperf = st.rAt != null, inf = cf * frac(), rv = st.tab === "RCA" ? 1 : 0;
    const ef = Math.round(clamp(62 - 75 * inf - (st.vf ? 40 : 0), 15, 62)), kil = inf > 0.3 || st.tab === "LM" && cf > 0.2 ? (inf > 0.35 ? 4 : 3) : inf > 0.12 ? 2 : 1;
    const hr = st.vf ? 0 : k.hr + (reperf && st.tab === "RCA" ? 15 * st.rec : 0), sbp = st.vf ? 0 : Math.round(clamp(128 - 90 * inf * (kil >= 4 ? 1.2 : 1) - (rv ? 25 * cf : 0), 55, 140));
    const trop = 1 + Math.round(900 * inf * (1 - Math.exp(-tNow() / 3)) * 10) / 10;
    return { cf, reperf, inf, ef, kil, hr, sbp, trop, rv };
  }
  function ecgLeads() {
    const k = site(), vec = ST[k.lead], e = est(), t = st.t, onset = 1 - Math.exp(-t / 0.2), resolve = st.rAt != null ? 1 - st.rec * 0.85 : 1;
    return LEADS.map((n) => { const v = vec[n] || 0, hot = v > 0.15, st0 = v * onset * resolve, q = v > 0.12 ? 0.5 * e.cf : 0;
      const tw = v > 0.1 ? (st.rAt != null ? 0.35 - 0.75 * st.rec * Math.min(1, e.cf * 2 + 0.3) : t < 0.5 ? 0.8 : 0.35 - 0.25 * Math.min(1, (t - 0.5) / 6)) : 0.35;
      if (st.acs === "nstemi") { const dep = Math.abs(v) > 0.12 && n !== "aVR"; return { n, hot: dep, r: 1, st: dep ? -0.16 * onset * resolve : n === "aVR" && Math.abs(v) > 0.12 ? 0.08 * onset : 0, q: 0, t: dep ? 0.35 - 0.6 * onset * resolve : n === "aVR" ? -0.2 : 0.35 }; }
      return { n, hot, r: n === "aVR" ? -0.6 : 1 - (v > 0.12 ? 0.4 * e.cf : 0), st: st0, q, t: n === "aVR" ? -0.2 : tw }; });
  }
  function bodyMap() {
    const e = est(), map = {}, marks = {}, healed = e.reperf && st.rec > 0.5; map.heart = e.reperf ? "rec" : 3;
    if (!healed && !st.vf) { marks.pain = true; map["arm-L"] = 1; map["face-L"] = 0; } if (e.kil >= 2) { map["lung-R"] = e.kil >= 3 ? 3 : 2; map["lung-L"] = e.kil >= 3 ? 3 : 2; }
    if (e.rv) map.neck = 2; if (e.kil >= 4 || st.vf) { map.brain = 2; map["kidney-R"] = 2; map["kidney-L"] = 2; map["leg-R"] = 1; map["leg-L"] = 1; } return { map, marks };
  }
  function obs() {
    const k = site(), e = est(), bm = bodyMap(), reperf = e.reperf;
    const flow = st.stent ? "TIMI 3 · stented" : st.balloon ? "TIMI 2–3 · ballooned" : st.removed ? "TIMI 2 · residual stenosis" : st.lysed ? "Partial after lysis" : st.acs === "nstemi" ? "TIMI 1–2 (subtotal)" : "TIMI 0 (occluded)";
    const rhythm = st.vf ? "VENTRICULAR FIBRILLATION" : k.vessel === "RCA" && !reperf ? "Sinus bradycardia, AV block risk" : st.tab === "LM" || st.tab === "LAD" ? (e.cf > 0.4 && !reperf ? "Sinus tachycardia, VT/VF risk" : "Sinus") : "Sinus";
    const params = [
      { k: "Artery flow", v: flow, tone: st.reper > 0.9 ? "ok" : st.reper > 0.4 ? "warn" : "bad" },
      { k: "Myocardium lost", v: Math.round(e.inf * 100) + "% of LV", tone: e.inf > 0.2 ? "bad" : e.inf > 0.08 ? "warn" : "ok" },
      { k: "LV ejection fraction", v: e.ef + "%", tone: e.ef < 35 ? "bad" : e.ef < 50 ? "warn" : "ok" },
      { k: "BP · HR", v: st.vf ? "no output" : e.sbp + " mmHg · " + Math.round(e.hr) + "/min", tone: e.sbp < 90 ? "bad" : e.sbp < 105 ? "warn" : "ok" },
      { k: "Rhythm", v: rhythm, tone: st.vf ? "bad" : "info" },
      { k: "Killip class", v: ["", "I", "II", "III", "IV (shock)"][e.kil], tone: e.kil >= 3 ? "bad" : e.kil === 2 ? "warn" : "ok" },
      { k: "hs-Troponin (illustrative)", v: "×" + Math.round(e.trop) + " ULN", tone: "info" },
      { k: reperf ? "Reperfused at" : "Time from onset", v: tNow().toFixed(1) + " h", tone: "info" },
    ];
    let note;
    if (st.vf) note = "Ventricular fibrillation: no cardiac output. Immediate CPR and defibrillation are the priority; the coronary artery is dealt with after the rhythm is restored.";
    else if (!reperf && st.acs === "nstemi") note = "Subtotal occlusion: partial flow, so less muscle is at risk. ST depression, not elevation. Risk-stratify, then choose an immediate, early or selective invasive strategy; unstable features mean angiography now. Collaterals: " + { poor: "poor", mod: "moderate", good: "good" }[st.coll] + ".";
    else if (!reperf) note = "The artery is blocked: muscle in its territory is ischaemic (amber) and starts to die with time (dark). Move the time slider, then drag the thrombus out or give lysis. Collaterals: " + { poor: "poor", mod: "moderate", good: "good" }[st.coll] + ".";
    else if (e.cf > 0.5) note = "Artery open, but most of the territory had already died: reperfusion does not bring back necrosed muscle, so the ejection fraction stays low. Time is muscle.";
    else if (e.cf > 0.15) note = "Artery open and a useful amount of muscle was saved. Part of the wall is still infarcted, so some ejection fraction is lost.";
    else note = "Early reperfusion: most of the at-risk muscle was saved and ST elevation resolves. Stunned muscle can take days to recover its function.";
    return { params, body: bm.map, marks: bm.marks, note, ecg: { leads: ecgLeads(), h: 330, vf: st.vf, beat: st.vf ? 0.5 : k.vessel === "RCA" && !reperf ? 1.15 : 0.8 } };
  }
  const info = () => { const s = site(); return { anat: s.anat, patho: s.patho, interv: s.interv }; };

  function clin() {
    const k = site(), e = est(), hrs = tNow(), L = [];
    const pat = { inf: "ST elevation in II, III and aVF (III higher than II suggests RCA), reciprocal ST depression in I and aVL. Add right-sided leads (V4R) to look for RV involvement.", inf2: "Modest ST elevation in II, III, aVF with reciprocal change in aVL.", ant: "ST elevation in V1–V4 (to V5–V6 with a long LAD), with reciprocal depression in the inferior leads. Q waves develop over hours.", lat: "Subtle or absent ST elevation in I, aVL, V5–V6; look for ST depression with tall R waves in V1–V2 (posterior infarction) and record V7–V9.", lm: "Widespread ST depression (inferolateral and V2–V6) with ST elevation in aVR. Can be called 'STEMI equivalent' in the right clinical context." }[k.lead];
    L.push(["Presentation", "Central pressure-type chest pain spreading to the left arm or jaw, sweating, breathlessness. Women, older people and diabetics may present atypically."]);
    if (st.acs === "nstemi") L.push(["NSTEMI pathway (ACC/AHA 2025; ESC 2023)", "No persistent ST elevation: ST depression or T-wave inversion (or a normal ECG) with a rise and fall of high-sensitivity troponin. Risk-stratify (for example GRACE). Immediate invasive strategy (within about 2 hours) for very-high-risk features: refractory pain, haemodynamic instability or cardiogenic shock, life-threatening arrhythmia, acute heart failure, mechanical complication. Early invasive strategy (within about 24 hours) for high-risk features: a diagnostic rise and fall in troponin, dynamic ST-T change, or a high risk score. Otherwise a selective invasive strategy. Antiplatelet and anticoagulant therapy per protocol. Some NSTEMI are occlusion MI (for example a left circumflex occlusion with a quiet ECG): persistent pain or ST change on posterior leads warrants urgent angiography."]);
    L.push(["ECG (first 10 minutes)", (st.acs === "nstemi" ? "NSTEMI: ST depression and T-wave inversion in the leads facing the territory, usually without Q waves. " : "") + pat + " Hyperacute T waves come first; Q waves and T-wave inversion develop over hours to days. Estimated EF here: " + e.ef + "%."]);
    L.push(["Biomarker and echo", "High-sensitivity troponin rises within hours and stays raised for days; do not wait for it when the ECG shows STEMI. Echo shows a regional wall-motion abnormality in the " + k.label + " territory."]);
    L.push(["Reperfusion strategy", "Primary PCI is the preferred strategy: first-medical-contact-to-device time of 90 minutes or less at a PCI-capable hospital, and 120 minutes or less when transferring. If that cannot be met because of unavoidable delay, give fibrinolysis (ACC/AHA: within 30 minutes of arrival; ESC: within 10 minutes of diagnosis) and transfer; do rescue PCI if ST resolution is under 50% at 60–90 minutes, otherwise angiography within 2–24 hours. At " + hrs.toFixed(1) + " h from onset the " + (hrs <= 12 ? "patient is inside the usual 12 h reperfusion window." : "patient is beyond 12 h: reperfuse if ischaemia or instability persists.")]);
    L.push(["Drugs in the first hour", "Aspirin and an oral P2Y12 inhibitor, with parenteral anticoagulation as per local protocol; oxygen only if SpO₂ is low; analgesia and nitrates with caution (avoid nitrates in suspected RV infarction or low BP)."]);
    L.push(["At the cath lab", "Radial access is preferred over femoral to cut bleeding and vascular complications. Intravascular imaging is recommended to guide PCI. Complete revascularisation is advised for STEMI with multivessel disease, chosen by lesion complexity. In cardiogenic shock, revascularise promptly; a microaxial flow pump is recommended for selected patients."]);
    L.push(["After discharge", "Dual antiplatelet therapy for at least 12 months unless the bleeding risk is high (then shorter or alternative strategies), high-intensity statin for everyone, and a non-statin added if LDL-C stays at or above 70 mg/dL on maximum statin."]);
    L.push(["Complications to anticipate", k.vessel === "RCA" ? "RV failure with low BP and clear lungs; bradycardia and AV block (pacing); inferior MI with ST rise in V1." : st.tab === "LM" || st.tab === "LAD" ? "Cardiogenic shock, acute pulmonary oedema, VT/VF, later mechanical complications (septal rupture, papillary muscle rupture, free-wall rupture)." : "Arrhythmia, heart failure; mitral regurgitation from papillary muscle ischaemia."]);
    L.push(["Reference", "Reference: 2025 ACC/AHA/ACEP/NAEMSP/SCAI ACS guideline (2023 ESC ACS for the ESC time targets). Follow your local STEMI protocol."]);
    return { lines: L };
  }

  const lab = {
    id: "mi", name: "Heart Attack Lab", tag: "Acute myocardial infarction", icon: "🫀",
    tabs: TABS.map((k) => ({ id: k, label: SITES[k].label, sub: SITES[k].sub })), get tab() { return st.tab; },
    credit: "Heart: BodyParts3D © DBCLS, CC BY-SA 2.1 JP. Adapted for teaching.",
    selectHint: "Tap a coronary artery in the 3D heart to select it. Start with the LAD.",
    opts: () => [{ id: "acs", label: "Presentation", cur: st.acs, choices: [["stemi", "STEMI (occluded artery)"], ["nstemi", "NSTEMI (subtotal occlusion)"]] }, { id: "coll", label: "Collateral circulation", cur: st.coll, choices: [["poor", "Poor"], ["mod", "Moderate"], ["good", "Good"]] }],
    slider: () => ({ id: "t", label: st.rAt != null ? "Reperfused at (hours from onset)" : "Time from onset of pain (hours)", min: 0.25, max: 12, step: 0.25, v: st.rAt != null ? st.rAt : st.t, locked: st.rAt != null, unit: " h" }),
    actions: () => st.vf ? [{ id: "shock", label: "DEFIBRILLATE", hint: "Shock the fibrillating heart.", off: false }] : [
      { id: "balloon", label: "BALLOON", hint: "Open the channel (after thrombus removal or lysis).", off: !(st.removed || st.lysed) || st.balloon || st.stent },
      { id: "stent", label: "DEPLOY STENT", hint: "Scaffold the artery open.", off: !(st.removed || st.lysed) || st.stent },
      { id: "lysis", label: "FIBRINOLYSIS", hint: "Clot-busting drug when PCI is not available in time.", off: st.removed || st.lysed },
      { id: "vf", label: "COMPLICATION: VF", hint: "See ventricular fibrillation and defibrillate.", off: false },
      { id: "reset", label: "RESET", hint: "Restore the clot and start again.", off: false }],
    dragHint: "Touch the red thrombus and drag it out of the artery (thrombus aspiration), then balloon and stent. Or give fibrinolysis.",
    views: [{ id: "front", label: "Front", f: () => ({ ry: -0.1, rx: 0.12, d: 3.5, tx: 0.05, ty: 0.1 }) }, { id: "lat", label: "Left side", f: () => ({ ry: -1.4, rx: 0.1, d: 3.4, tx: 0.2, ty: 0 }) }, { id: "inf", label: "Inferior", f: () => ({ ry: 0.2, rx: -1.25, d: 3.6, tx: 0, ty: -0.2 }) }, { id: "back", label: "Back", f: () => ({ ry: 3.1, rx: 0.1, d: 3.6, tx: 0, ty: 0.1 }) }],
    legend: [["#9a3f4b", "Healthy muscle"], ["#ffb347", "At risk (ischaemic)"], ["#3a1f2c", "Infarcted"], ["#8fe8b0", "Salvaged"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ kit, V, st }), tabLabel: () => site().label,
  };
  build();
  return lab;
}
