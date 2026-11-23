/* BRAIN BLEED & ICP LAB on the PATHODYNAMICS engine (the ischaemic stroke lab is separate: ./stroke.js).
   Intracerebral haemorrhage, subarachnoid haemorrhage, cerebral aneurysm, brain herniation and hydrocephalus, with aneurysm coiling and clipping,
   EVD placement and a stepwise ICP ladder. Teaching model: one intracranial volume budget (Monro-Kellie) drives pressure, perfusion and herniation.
   Content aligned to the 2022 AHA/ASA spontaneous ICH guideline, the 2025 AHA/ACC hypertension guideline (acute ICH blood pressure) and the 2023 AHA/ASA aneurysmal SAH guideline
   (checked Nov 2026 against the published summaries). ICP thresholds follow common neurocritical-care practice. All numbers are illustrative, not patient data. */
import { THREE, C } from "../stage.js?v=20261123n";
import { toolKit, vessels, mirrorFlows, halo, clamp } from "./common.js?v=20261123n";

const SITES = { ACOM: { label: "Anterior communicating", p: [0, -0.3, 0.63] }, MCA: { label: "MCA bifurcation", p: [0.75, -0.28, 0.4] }, PCOM: { label: "Posterior communicating", p: [0.34, -0.4, 0.05] }, BASI: { label: "Basilar tip", p: [0, -0.42, -0.22] } };
const LOCS = { deep: { label: "Deep (basal ganglia)", p: [0.45, 0.02, 0.1] }, lobar: { label: "Lobar (temporo-parietal)", p: [0.72, 0.3, -0.2] }, cereb: { label: "Cerebellar", p: [0.25, -0.5, -0.68] } };
const TABS = {
  ICH: { label: "Intracerebral haemorrhage", sub: "Hypertensive / anticoagulant bleed",
    anat: "Blood has burst into the brain tissue itself. A deep bleed (basal ganglia, thalamus) is usually hypertensive; a lobar bleed is often amyloid angiopathy; a cerebellar bleed can compress the brainstem and the fourth ventricle. The clot is surrounded by a rim of oedema that grows over days.",
    patho: "Most of the growth happens early: in about one in three patients the haematoma enlarges in the first hours, more with anticoagulants or a very high blood pressure. The mass raises pressure, compresses neighbouring brain and can bleed into the ventricles (IVH), blocking CSF drainage and causing hydrocephalus.",
    interv: "Stop the growth first: lower systolic pressure promptly (for a presenting SBP of 150–220 mmHg, aim for 130 to under 140 mmHg), and reverse anticoagulation at once. Surgery is for selected patients: evacuation of a cerebellar bleed over about 15 mL with brainstem compression or hydrocephalus, and decompressive craniectomy for a large bleed with deterioration. An EVD treats hydrocephalus from IVH." },
  SAH: { label: "Subarachnoid haemorrhage", sub: "Ruptured aneurysm",
    anat: "A saccular aneurysm at an arterial branch point ruptures and blood fills the basal cisterns around the circle of Willis: the 'worst headache of life', sometimes with a short loss of consciousness.",
    patho: "Rebleeding is the early killer, most likely in the first 24 hours until the aneurysm is secured. Blood in the cisterns blocks CSF absorption (acute hydrocephalus), the pressure spike can stun the heart and lungs, and from about day 3 to day 14 the arteries narrow (vasospasm) and can cause delayed cerebral ischaemia.",
    interv: "Secure the aneurysm as early as possible in a high-volume centre, by coiling or clipping (coiling when both are feasible, with the choice made by a neurovascular team). Avoid hypotension and marked hypertension before it is secured. Give oral nimodipine for 21 days, keep the patient euvolaemic, and place an EVD for symptomatic hydrocephalus. Watch for delayed ischaemia from day 3." },
  ANEU: { label: "Cerebral aneurysm", sub: "Unruptured, found incidentally",
    anat: "An aneurysm is a weak, ballooned segment of an artery wall, most often at the anterior communicating, MCA, posterior communicating or basilar tip. A narrow neck (the opening to the artery) makes coiling easier; a wide neck may need a stent or a clip.",
    patho: "Most unruptured aneurysms never bleed. The risk rises with size, a posterior or communicating-artery site, growth on follow-up, a previous SAH, smoking, hypertension and a family history. A rupture causes SAH, with high mortality and disability.",
    interv: "Treatment is a balance: the yearly rupture risk against the risk of the procedure. Small incidental aneurysms are often followed with imaging and risk-factor control; larger, growing or high-risk ones are treated by coiling (with stent or balloon assistance), a flow diverter or surgical clipping, decided by a neurovascular team." },
  HERN: { label: "Brain herniation", sub: "Raised ICP, shifted brain",
    anat: "When pressure in one compartment of the skull rises, brain is pushed under the falx (subfalcine), through the tentorial notch (uncal or central) or down through the foramen magnum (tonsillar).",
    patho: "The skull is a closed box: brain, blood and CSF share a fixed volume. Once the compensatory reserve is used up, a small extra volume gives a large pressure rise. Cerebral perfusion pressure (MAP minus ICP) falls, the brainstem is compressed, and the Cushing response (hypertension, slow heart rate, irregular breathing) and a blown pupil follow.",
    interv: "Treat as an emergency, step by step: head of bed up about 30°, midline head, avoid hypoxia, hypotension and hypercapnia, analgesia and sedation, osmotherapy (hypertonic saline or mannitol), CSF drainage by EVD, brief hyperventilation only as a bridge, and definitive removal of the mass or a decompressive craniectomy." },
  HCP: { label: "Hydrocephalus", sub: "Dilated ventricles",
    anat: "The ventricles hold CSF made in the choroid plexus. It flows from the lateral ventricles through the third ventricle and aqueduct to the fourth ventricle and out to the subarachnoid space.",
    patho: "Obstructive hydrocephalus: a block inside the system (clot, tumour, aqueduct stenosis). Communicating hydrocephalus: CSF cannot be absorbed (after SAH or meningitis). Either way the ventricles balloon, pressure rises, and the periventricular tissue is stretched.",
    interv: "Acute: an external ventricular drain (EVD) placed into the frontal horn relieves the pressure at once and also measures ICP. Longer term: treat the cause, then a ventriculoperitoneal shunt, or an endoscopic third ventriculostomy for obstructive cases." },
};
const ORDER = ["ICH", "SAH", "ANEU", "HERN", "HCP"];

export default function create(S, ui) {
  const st = { tab: "ICH", loc: "deep", anti: "none", site: "ACOM", size: "med", grade: "good", herType: "uncal", hcp: "obs", t: 2, mass: 40, bp: false, rev: false, evac: false, evd: false, coil: false, clip: false, nim: false, head: false, osm: false, hv: false, sed: false, crani: false, shunt: false, ghost: false, pulse: 0 };
  const T = () => TABS[st.tab];
  let M = {}, V = {}, F = {}, evd = null, dirty = true;

  const ell = (rx, ry, rz, col, op, p, o) => { const g = new THREE.SphereGeometry(1, 32, 24); g.scale(rx, ry, rz); const m = new THREE.Mesh(g, S.mat(col, Object.assign({ transparent: true, opacity: op, depthWrite: false }, o || {}))); if (p) m.position.set(...p); return m; };
  function build() {
    S.clear(); M = {}; V = {}; F = {}; evd = null;
    const grp = S.add(new THREE.Group()); grp.scale.x = -1; /* patient's right on the viewer's left in the front view */ M.grp = grp;
    M.brain = ell(1.0, 0.82, 1.18, 0xe8a3ab, 0.3); M.brain.userData.hemi = 1; M.brain.renderOrder = 1; grp.add(M.brain);
    const wire = new THREE.Mesh(M.brain.geometry, new THREE.MeshBasicMaterial({ color: 0xffd0d8, wireframe: true, transparent: true, opacity: 0.08, depthWrite: false })); wire.renderOrder = 1; grp.add(wire);
    M.skull = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20).scale(1.1, 0.92, 1.28), new THREE.MeshBasicMaterial({ color: 0xdfe8f5, wireframe: true, transparent: true, opacity: 0.05, depthWrite: false })); grp.add(M.skull);
    M.falx = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.3, 1.9), new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.2, depthWrite: false })); M.falx.position.set(0, 0.08, 0); grp.add(M.falx);
    M.tent = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.012, 0.9), new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.16, depthWrite: false })); M.tent.position.set(0, -0.28, -0.55); grp.add(M.tent);
    /* ventricles */
    const vent = new THREE.Group(); M.vent = vent; grp.add(vent); M.lv = [-1, 1].map((s) => { const e = ell(0.13, 0.12, 0.42, 0x6fb7ff, 0.85, [s * 0.2, 0.18, -0.02], { emissive: 0x0a2040 }); e.rotation.y = s * 0.12; vent.add(e); return e; });
    vent.add(ell(0.04, 0.12, 0.1, 0x6fb7ff, 0.85, [0, 0.0, -0.05], { emissive: 0x0a2040 })); vent.add(ell(0.1, 0.07, 0.1, 0x6fb7ff, 0.85, [0, -0.36, -0.55], { emissive: 0x0a2040 }));
    /* circle of Willis */
    const mir = (n, pts, r) => [[n + "_R", pts, r], [n + "_L", pts.map((p) => [-p[0], p[1], p[2]]), r]];
    const defs = [].concat(mir("ICA", [[0.42, -0.72, 0.12], [0.38, -0.5, 0.15], [0.34, -0.38, 0.28]], 0.045), mir("A1", [[0.34, -0.38, 0.28], [0.2, -0.33, 0.52], [0.02, -0.3, 0.63]], 0.032), mir("MCA", [[0.34, -0.38, 0.28], [0.55, -0.33, 0.34], [0.78, -0.28, 0.42]], 0.04), mir("PCOM", [[0.34, -0.38, 0.28], [0.35, -0.4, 0.06], [0.28, -0.42, -0.2]], 0.022), mir("PCA", [[0.0, -0.42, -0.22], [0.2, -0.42, -0.25], [0.44, -0.4, -0.32]], 0.032), [["BA", [[0, -0.66, -0.64], [0, -0.52, -0.42], [0, -0.42, -0.22]], 0.04], ["ACA", [[0.02, -0.3, 0.63], [0.0, -0.1, 0.8], [0, 0.25, 0.85]], 0.03]]);
    const fn0 = S.flows.length; const vv = vessels(S, grp, defs, 0xc9514e, { dens: 12 }); mirrorFlows(S, fn0); V = vv.T; F = vv.F; Object.keys(V).forEach((n) => halo(S, grp, V[n], n));
    /* aneurysm sac + treatment */
    M.sac = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), S.mat(0xd94a55, { emissive: 0x4a0a14 })); M.sac.userData.site = "sac"; M.sac.renderOrder = 3; grp.add(M.sac); S.pick.push(M.sac);
    M.coil = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.18, 80, 8, 3, 5), new THREE.MeshPhongMaterial({ color: 0xffe08a, emissive: 0x4a3a10, shininess: 100 })); M.coil.visible = false; M.coil.renderOrder = 4; grp.add(M.coil);
    M.clip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.045), new THREE.MeshPhongMaterial({ color: 0xcfd8e8, shininess: 120 })); M.clip.visible = false; M.clip.renderOrder = 4; grp.add(M.clip);
    /* haematoma, oedema, IVH, SAH, herniation */
    M.hem = ell(1, 1, 1, 0x8a0f1e, 0.95, null, { emissive: 0x3a0610 }); M.hem.renderOrder = 3; grp.add(M.hem); M.oed = ell(1, 1, 1, 0xffd27a, 0.2); M.oed.renderOrder = 2; grp.add(M.oed);
    const loop = new THREE.CatmullRomCurve3([[0.0, -0.3, 0.63], [0.34, -0.38, 0.28], [0.36, -0.4, 0.0], [0.0, -0.44, -0.24], [-0.36, -0.4, 0.0], [-0.34, -0.38, 0.28]].map((p) => new THREE.Vector3(...p)), true);
    M.sah = new THREE.Mesh(new THREE.TubeGeometry(loop, 48, 0.17, 10, true), new THREE.MeshBasicMaterial({ color: 0xb01a2a, transparent: true, opacity: 0, depthWrite: false })); M.sah.renderOrder = 2; grp.add(M.sah);
    M.uncus = ell(0.1, 0.1, 0.14, 0xffb36b, 0.9, [0.52, -0.44, 0.02]); grp.add(M.uncus); M.tonsil = ell(0.1, 0.12, 0.1, 0xffb36b, 0.9, [0, -0.78, -0.52]); grp.add(M.tonsil);
    M.bs = S.tube([[0, -0.32, -0.14], [0, -0.6, -0.26], [0, -0.92, -0.4]], 0.07, 0xdcd2c4, { op: 0.85 }); grp.add(M.bs);
    /* EVD tool */
    evd = toolKit(S, grp, ui, { start: new THREE.Vector3(0.55, 0.78, 0.95), target: new THREE.Vector3(0.2, 0.2, 0.42), thr: 0.3, len: 0.8, r: 0.014, ring: 0.12, onPlaced: () => { st.evd = true; ui.refresh("EVD placed in the frontal horn. CSF drains and the pressure falls."); }, msg: "Drag the catheter tip into the right frontal horn (glowing ring)…", go: "Release to place the EVD", far: "The tip must reach the ventricle: bring it to the ring." });
    M.lab = S.label("", [0, 0.9, 0.6], "#ffd166"); grp.add(M.lab);
    reset(); dirty = true;
  }
  function reset() {
    Object.assign(st, { bp: false, rev: false, evac: false, evd: false, coil: false, clip: false, nim: false, head: false, osm: false, hv: false, sed: false, crani: false, shunt: false });
    if (st.tab === "ICH") st.t = 2; else if (st.tab === "SAH") st.t = 6; else if (st.tab === "HERN") st.t = 0; else st.t = st.tab === "ANEU" ? 0 : 6;
    st.mass = st.tab === "HERN" ? 60 : 40; if (evd) { evd.placed = false; evd.hit.userData.drag = true; evd.mesh.position.copy(evd.start); evd.ring.visible = true; evd.show(["ICH", "SAH", "HERN", "HCP"].includes(st.tab)); }
    const cam = { ICH: { ry: 0.5, rx: 0.25, d: 4.3 }, SAH: { ry: 0.2, rx: -0.45, d: 4.2 }, ANEU: { ry: 0.3, rx: -0.55, d: 3.2, tx: 0.2, ty: -0.3 }, HERN: { ry: 0.6, rx: 0.1, d: 4.6 }, HCP: { ry: 0.5, rx: 0.5, d: 4.2 } }[st.tab]; S.view(Object.assign({ tx: 0, ty: 0, tz: 0 }, cam)); dirty = true;
  }

  /* ---------- physiology ---------- */
  const ichV = () => { const v0 = 30, g = (st.anti !== "none" && !st.rev ? 1.5 : 1) * (st.bp ? 0.5 : 1); return st.evac ? 5 : v0 * (1 + 0.45 * g * (1 - Math.exp(-st.t / 4))); };
  const vasosp = () => (st.tab === "SAH" ? clamp(Math.exp(-((st.t / 24 - 8) ** 2) / (2 * 3.3 * 3.3)) * (st.grade === "poor" ? 1 : 0.7) * (st.nim ? 0.6 : 1) * (st.t >= 72 ? 1 : 0), 0, 1) : 0);
  const secured = () => st.coil || st.clip;
  function hydr() { if (st.tab === "HCP") return (st.hcp === "obs" ? 0.85 : 0.65) * (st.evd || st.shunt ? 0.3 : 1); if (st.tab === "SAH") return (st.grade === "poor" ? 0.55 : 0.2) * (st.evd ? 0.3 : 1); if (st.tab === "ICH") return (st.loc === "cereb" && !st.evac ? 0.5 : st.loc === "deep" && ichV() > 40 ? 0.25 : 0) * (st.evd ? 0.3 : 1); return 0; }
  function Vm() { /* excess intracranial volume, mL */
    let v = 0; if (st.tab === "ICH") { const h = ichV(); v = h + (st.evac ? 4 : h * 0.4 * (1 - Math.exp(-st.t / 24))) + hydr() * 40; }
    else if (st.tab === "SAH") v = (st.grade === "poor" ? 30 : 12) + hydr() * 40 + vasosp() * 18; else if (st.tab === "HERN") v = st.mass; else if (st.tab === "HCP") v = hydr() * 70; return Math.max(0, v);
  }
  function est() {
    const v = Vm(), eff = v - (st.head ? 6 : 0) - (st.osm ? 16 : 0) - (st.sed ? 6 : 0) - (st.hv ? 14 : 0) - (st.evd ? 14 : 0) - (st.shunt ? 20 : 0) - (st.crani ? 45 : 0) - (st.tab === "HERN" && st.evac ? 0.5 * st.mass : 0);
    const icp = Math.round(clamp(8 * Math.exp(clamp(eff, 0, 220) / 52), 5, 80)), cush = icp > 28 ? clamp((icp - 28) / 22, 0, 1) : 0;
    const map = Math.round(clamp(92 + 40 * cush - (st.bp && st.tab === "ICH" ? 14 : 0) - (icp > 50 ? 30 : 0), 55, 140)), sbp = Math.round(map * 1.35), cpp = map - icp, hr = Math.round(clamp(80 - 40 * cush, 35, 110));
    const her = clamp((icp - 22) / 28, 0, 1), gcs = Math.round(clamp(15 - 12 * clamp((icp - 15) / 40, 0, 1) - (st.tab === "SAH" && st.grade === "poor" ? 3 : 0), 3, 15)), pupil = her > 0.45 ? "R dilated, fixed" : her > 0.2 ? "R sluggish" : "equal, reactive";
    return { v, icp, map, sbp, cpp, hr, cush, her, gcs, pupil, hyd: hydr(), ich: ichV(), vs: vasosp() };
  }

  /* ---------- scene update ---------- */
  function frame(dt) {
    const e = est(), loc = LOCS[st.loc].p, lerp = (a, b, k) => a + (b - a) * Math.min(1, k);
    const h = st.tab === "ICH" ? e.ich : 0, rad = Math.cbrt((3 * h) / (4 * Math.PI * 363)) * 0.85;
    M.hem.visible = M.oed.visible = h > 0.5; M.hem.position.set(...loc); M.oed.position.set(...loc); M.hem.scale.setScalar(Math.max(0.01, rad)); M.oed.scale.setScalar(Math.max(0.01, rad * (st.evac ? 1.2 : 1.35 + 0.35 * (1 - Math.exp(-st.t / 24)))));
    const hy = 1 + 0.85 * e.hyd; M.vent.scale.x += (hy - M.vent.scale.x) * Math.min(1, dt * 3); M.vent.scale.z += ((1 + 0.5 * e.hyd) - M.vent.scale.z) * Math.min(1, dt * 3); M.vent.scale.y += ((1 + 0.6 * e.hyd) - M.vent.scale.y) * Math.min(1, dt * 3);
    M.lv.forEach((m) => m.material.color.setHex(st.tab === "ICH" && hydr() > 0 && ichV() > 35 && st.loc !== "cereb" ? 0xb02030 : 0x6fb7ff));
    const sah = st.tab === "SAH" ? (st.grade === "poor" ? 0.55 : 0.35) : 0; M.sah.material.opacity += ((sah * (st.nim ? 1 : 1)) - M.sah.material.opacity) * Math.min(1, dt * 2);
    const sp = SITES[st.site].p, small = { small: 0.05, med: 0.085, large: 0.14 }[st.size], showSac = st.tab === "SAH" || st.tab === "ANEU"; M.sac.visible = showSac; M.sac.position.set(sp[0] * 1.0, sp[1] + (st.site === "BASI" ? 0.02 : 0.05) + small * 0.8, sp[2] + (st.site === "ACOM" ? 0.05 : 0)); M.sac.scale.setScalar(small * (st.tab === "SAH" ? 1.1 : 1)); M.sac.material.color.setHex(st.coil || st.clip ? 0x8a5a60 : 0xd94a55);
    M.coil.visible = st.coil; M.coil.position.copy(M.sac.position); M.coil.scale.setScalar(small * 1.05); M.clip.visible = st.clip; M.clip.position.set(sp[0], sp[1] + 0.03, sp[2]); M.clip.scale.set(1 + small * 6, 1, 1);
    const sidx = e.her, mid = st.tab === "HERN" || st.tab === "ICH" ? 0.28 * clamp(e.v / 110, 0, 1) : 0;
    const side = st.tab === "ICH" ? 1 : 1; M.falx.position.x += (-mid * side - M.falx.position.x) * Math.min(1, dt * 3); M.vent.position.x += (-mid * 0.8 * side - M.vent.position.x) * Math.min(1, dt * 3);
    const ht = st.tab === "HERN" ? st.herType : "none"; const un = (ht === "uncal" || ht === "central") ? sidx : 0, tn = (ht === "tonsil") ? sidx : st.tab === "ICH" && st.loc === "cereb" ? sidx * 0.6 : 0;
    M.uncus.visible = st.tab === "HERN" || e.her > 0.3; M.uncus.position.x = lerp(M.uncus.position.x, 0.52 - 0.24 * un, dt * 3); M.uncus.position.y = lerp(M.uncus.position.y, -0.44 - 0.1 * un, dt * 3);
    M.tonsil.visible = st.tab === "HERN" || tn > 0.1; M.tonsil.position.y = lerp(M.tonsil.position.y, -0.78 - 0.2 * Math.max(tn, ht === "central" ? sidx * 0.6 : 0), dt * 3);
    M.bs.material.color.setRGB(0.86, 0.82 - 0.4 * e.her, 0.77 - 0.5 * e.her);
    /* vessels: spasm narrows (darker, slower) */
    Object.keys(V).forEach((n) => { const f = F[n], spm = e.vs * (/MCA|A1|ACA|ICA/.test(n) ? 1 : 0.5); f.rate += ((1 - 0.7 * spm) - f.rate) * Math.min(1, dt * 3); const d = 1 - 0.45 * spm; V[n].material.color.setRGB(0.79 * d, 0.32 * d, 0.31 * d); });
    evd.frame(dt); if (st.evd) { if (!M.drain) { M.drain = S.tube([[0.55, 0.78, 0.95], [0.38, 0.5, 0.7], [0.2, 0.2, 0.42]], 0.012, 0xcfe9ff, { op: 0.9 }); M.grp.add(M.drain); } } else if (M.drain) { M.grp.remove(M.drain); M.drain = null; }
    st.pulse += dt * 4; const sc = 1 + 0.008 * Math.sin(st.pulse) * (1 + e.icp / 25); M.brain.scale.setScalar(sc);
    M.grp.children.forEach((c) => { if (c.userData.hemi) c.material.opacity += ((st.ghost ? 0.14 : 0.3) - c.material.opacity) * Math.min(1, dt * 5); });
    M.lab.visible = false;
  }
  S.hooks.push(frame);
  S.onGrab = (o) => { evd.grabbed(o); }; S.onDrag = (o, w) => { evd.drag(w); }; S.onDrop = () => { evd.drop(); };
  S.onTap = (o) => { if (!o) return; if (o.userData.site && /^(A1|MCA|PCOM|BA|ACA|ICA)/.test(o.userData.site) && (st.tab === "SAH" || st.tab === "ANEU")) { const n = o.userData.site, s = /^A1|ACA/.test(n) ? "ACOM" : /^MCA/.test(n) ? "MCA" : /^PCOM/.test(n) ? "PCOM" : /^BA/.test(n) ? "BASI" : null; if (s && !secured()) { st.site = s; dirty = true; ui.refresh(); } } };
  function setTab(k) { st.tab = k; build(); }
  function setOpt(id, v) { if (id === "ghost") st.ghost = v === "1"; else { st[id] = v; if (id === "loc" || id === "herType") reset(); } dirty = true; }
  function setT(v) { if (st.tab === "HERN") st.mass = v; else st.t = v; dirty = true; }
  function act(id) {
    const m = (s) => ui.refresh(s);
    if (id === "reset") { build(); return; }
    if (id === "bp") { st.bp = true; m("Blood pressure lowered to the target range. Haematoma growth slows."); }
    else if (id === "rev") { st.rev = true; m("Anticoagulation reversed. Haematoma growth is limited."); }
    else if (id === "evac") { if (st.tab === "HERN") { st.evac = true; m("Mass lesion evacuated. The pressure falls and the brain relaxes."); } else { st.evac = true; m("Haematoma evacuated. The mass effect is relieved."); } }
    else if (id === "evd") { if (!st.evd) { evd.place(); } }
    else if (id === "coil") { if (!secured()) { st.coil = true; m("Aneurysm coiled: the sac is packed and excluded from the circulation. Rebleeding risk falls."); } }
    else if (id === "clip") { if (!secured()) { st.clip = true; m("Aneurysm clipped across the neck. The sac is excluded; rebleeding risk falls."); } }
    else if (id === "nim") { st.nim = true; m("Nimodipine started (oral, 21 days) to reduce delayed ischaemia."); }
    else if (id === "head") { st.head = true; m("Head of bed up 30°, head midline: venous drainage improves."); }
    else if (id === "osm") { st.osm = true; m("Osmotherapy given (hypertonic saline or mannitol): brain water falls, ICP drops for hours."); }
    else if (id === "hv") { st.hv = true; m("Hyperventilation: a quick but short-lived fall in ICP. Use only as a bridge."); }
    else if (id === "sed") { st.sed = true; m("Analgesia and sedation: lower metabolic demand and venous pressure."); }
    else if (id === "crani") { st.crani = true; m("Decompressive craniectomy: the skull is opened, giving the brain room. Pressure falls."); }
    else if (id === "shunt") { st.shunt = true; m("Shunt placed: CSF drains to the abdomen and the ventricles shrink."); }
  }

  /* ---------- readout ---------- */
  function bodyMap() {
    const e = est(), map = {}, lvl = (x) => (x > 0.6 ? 3 : x > 0.3 ? 2 : x > 0.08 ? 1 : 0);
    map.brain = lvl(Math.max(e.her, (e.icp - 15) / 40, e.vs * 0.8, st.tab === "ICH" ? 0.4 : 0)); if (e.her > 0.5) map.neck = 3; else if (e.her > 0.25) map.neck = 2;
    if (st.tab === "SAH" && st.grade === "poor") { map.heart = 2; map["lung-R"] = 1; map["lung-L"] = 1; } if (e.cush > 0.4) { map.heart = 2; } if (e.cpp < 50) { map["kidney-R"] = 1; map["kidney-L"] = 1; }
    return { map, marks: {} };
  }
  function obs() {
    const e = est(), bm = bodyMap(), tn = st.tab;
    const rows = [{ k: "ICP", v: e.icp + " mmHg", tone: e.icp > 22 ? "bad" : e.icp > 15 ? "warn" : "ok" }, { k: "CPP (MAP − ICP)", v: e.cpp + " mmHg", tone: e.cpp < 50 ? "bad" : e.cpp < 60 ? "warn" : "ok" }, { k: "BP · HR", v: e.sbp + " systolic · " + e.hr + "/min", tone: e.cush > 0.3 ? "bad" : "info" }, { k: "GCS (illustrative)", v: String(e.gcs), tone: e.gcs <= 8 ? "bad" : e.gcs < 13 ? "warn" : "ok" }, { k: "Pupils", v: e.pupil, tone: e.her > 0.45 ? "bad" : e.her > 0.2 ? "warn" : "ok" }];
    if (tn === "ICH") rows.splice(1, 0, { k: "Haematoma volume", v: Math.round(e.ich) + " mL" + (st.evac ? " (evacuated)" : ""), tone: e.ich > 60 ? "bad" : e.ich > 30 ? "warn" : "ok" });
    if (tn === "SAH") rows.splice(1, 0, { k: "Aneurysm", v: st.coil ? "coiled" : st.clip ? "clipped" : "unsecured · rebleed risk high", tone: secured() ? "ok" : "bad" }, { k: "Vasospasm (day " + Math.round(st.t / 24) + ")", v: e.vs > 0.6 ? "severe" : e.vs > 0.2 ? "moderate" : e.vs > 0.02 ? "mild" : "none", tone: e.vs > 0.5 ? "bad" : e.vs > 0.2 ? "warn" : "ok" });
    if (tn === "ANEU") rows.splice(0, 5, { k: "Aneurysm", v: SITES[st.site].label + " · " + { small: "3 mm", med: "7 mm", large: "12 mm" }[st.size], tone: "info" }, { k: "Rupture risk (illustrative)", v: st.size === "large" || st.site === "BASI" || st.site === "PCOM" ? "higher" : st.size === "med" ? "intermediate" : "low", tone: st.size === "large" ? "bad" : "warn" }, { k: "Treatment", v: st.coil ? "coiled" : st.clip ? "clipped" : "none yet", tone: secured() ? "ok" : "info" });
    if (tn === "HCP" || e.hyd > 0.2) rows.push({ k: "Ventricles", v: e.hyd > 0.6 ? "very dilated" : e.hyd > 0.25 ? "dilated" : "normal", tone: e.hyd > 0.6 ? "bad" : e.hyd > 0.25 ? "warn" : "ok" });
    let note = e.her > 0.45 ? "Brain is being pushed across compartments: the brainstem is squeezed, the pupil dilates, and the Cushing response appears. This is a neurosurgical emergency." : e.icp > 22 ? "Pressure is above the usual treatment threshold (about 22 mmHg). Work up the ICP ladder: head up, sedation, osmotherapy, CSF drainage, then surgery." : "Pressure is controlled. Keep watching: haematoma growth, rebleeding and delayed ischaemia all happen in the first days.";
    if (tn === "ANEU" && !secured()) note = "An unruptured aneurysm: no mass effect yet. The decision is between follow-up and treatment, and a rupture (SAH) is the event to prevent.";
    const o = { params: rows, body: bm.map, marks: bm.marks, note };
    if (tn === "SAH" || e.cush > 0.3) o.ecg = { leads: ecgLeads(e), h: 200, beat: +(60 / e.hr).toFixed(2) };
    return o;
  }
  function ecgLeads(e) { const L = (n, o) => Object.assign({ n, r: 1, st: 0, t: 0.35, q: 0 }, o), sp = st.tab === "SAH" ? -0.55 : 0.35; return [L("II", { t: sp }), L("V2", { t: sp - 0.1, st: st.tab === "SAH" ? 0.05 : 0 }), L("V4", { t: sp }), L("V5", { t: sp })]; }
  const info = () => ({ anat: T().anat, patho: T().patho, interv: T().interv });
  function clin() {
    const e = est(), L = [], tn = st.tab;
    L.push(["Presentation", tn === "ICH" ? "Sudden focal deficit with headache, vomiting and a falling level of consciousness; blood pressure is usually very high." : tn === "SAH" ? "Thunderclap headache, vomiting, neck stiffness, sometimes a brief collapse or seizure. Use a validated rule (such as the Ottawa SAH rule) to decide who needs imaging." : tn === "ANEU" ? "Usually none: found on imaging. Occasionally a cranial nerve palsy (such as a third nerve palsy from a posterior communicating aneurysm)." : tn === "HERN" ? "Falling consciousness, a dilated pupil, hemiparesis, then the Cushing triad (hypertension, bradycardia, irregular breathing) and posturing." : "Headache, vomiting, drowsiness, gait and urinary change, upgaze palsy; in acute cases, a rapidly falling GCS."]);
    L.push(["Imaging", tn === "SAH" ? "Non-contrast CT within 6 hours is highly sensitive; then CT or catheter angiography to find the aneurysm. Grade by Hunt–Hess and the modified Fisher scale." : tn === "ANEU" ? "CT or MR angiography; digital subtraction angiography gives the best detail of the neck and branches." : "Non-contrast CT head first. Check volume (ABC/2), location, IVH, hydrocephalus, midline shift, and a spot sign or an underlying vascular lesion on CT angiography."]);
    L.push(["Pressure and perfusion", "ICP " + e.icp + " mmHg, CPP " + e.cpp + " mmHg (illustrative). Common targets: treat ICP above about 22 mmHg and keep CPP around 60–70 mmHg."]);
    if (tn === "ICH") L.push(["ICH treatment (AHA/ASA 2022; AHA/ACC 2025 for BP)", "Reverse anticoagulation (vitamin K antagonist: PCC plus vitamin K; dabigatran: idarucizumab; factor Xa inhibitors: andexanet or PCC). Acute SBP lowering to 130 to under 140 mmHg when the presenting SBP is 150–220 mmHg; avoid large fluctuations. Cerebellar haematoma over about 15 mL with brainstem compression or hydrocephalus: urgent surgical evacuation. EVD for hydrocephalus. Hyperosmolar therapy for a clinical herniation syndrome. Minimally invasive evacuation has newer trial evidence in selected patients."]);
    if (tn === "SAH") L.push(["SAH treatment (AHA/ASA 2023)", "Early aneurysm securing, in a high-volume neurovascular centre; endovascular coiling is favoured when anatomy allows. Nimodipine 21 days. Avoid hypovolaemia; keep euvolaemia and a stable blood pressure. EVD for acute symptomatic hydrocephalus. Monitor for delayed cerebral ischaemia from day 3; treat spasm-related ischaemia with a neurovascular team (blood pressure augmentation, endovascular therapy). Prophylactic antifibrinolytics for long periods are not recommended."]);
    if (tn === "ANEU") L.push(["Unruptured aneurysm", "Decide by size, site, shape, growth, symptoms, age, comorbidity and PHASES-type risk against procedural risk. Smoking cessation and blood-pressure control for all. Follow ESO and AHA/ASA unruptured-aneurysm guidance and your neurovascular team's protocol."]);
    if (tn === "HERN" || tn === "HCP") L.push(["ICP ladder", "Tier 1: head up 30°, midline head, normocapnia, normothermia, treat pain and agitation. Tier 2: osmotherapy, CSF drainage by EVD, deeper sedation. Tier 3: brief hyperventilation as a bridge, barbiturate or hypothermia in selected patients, and decompressive craniectomy or removal of the mass."]);
    L.push(["Reference", "2022 AHA/ASA spontaneous ICH guideline; 2025 AHA/ACC hypertension guideline; 2023 AHA/ASA aneurysmal SAH guideline; Brain Trauma Foundation and neurocritical-care ICP guidance. Follow your local neurosurgical protocol."]);
    return { lines: L, draw: (el) => drawImaging(el, e) };
  }
  function drawImaging(el, e) {
    const mk = (title, f) => { const d = document.createElement("div"); d.className = "img"; const c = document.createElement("canvas"); c.width = 300; c.height = 300; const t = document.createElement("small"); t.textContent = title; d.append(c, t); el.append(d); f(c.getContext("2d")); };
    mk("CT head, axial (schematic)", (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 300, 300); g.fillStyle = "#e8e8e8"; g.beginPath(); g.ellipse(150, 150, 118, 132, 0, 0, 7); g.fill(); g.fillStyle = "#6a6a6a"; g.beginPath(); g.ellipse(150, 150, 108, 122, 0, 0, 7); g.fill();
      const sh = e.v > 20 ? Math.min(26, e.v / 5) : 0, hy = 1 + 0.9 * e.hyd; g.fillStyle = "#111"; [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(150 + s * 22 * hy - sh * 0.6, 135, 11 * hy, 28 * (0.8 + 0.4 * hy), s * 0.15, 0, 7); g.fill(); });
      if (st.tab === "ICH" && e.ich > 0.5) { const p = { deep: [180, 140], lobar: [220, 120], cereb: [160, 240] }[st.loc], r = Math.cbrt(e.ich) * 7; g.fillStyle = "rgba(60,60,60,.9)"; g.beginPath(); g.ellipse(p[0], p[1], r * 1.4, r * 1.4, 0, 0, 7); g.fill(); g.fillStyle = "#f4f4f4"; g.beginPath(); g.ellipse(p[0], p[1], r, r, 0.3, 0, 7); g.fill(); }
      if (st.tab === "SAH") { g.strokeStyle = "#f4f4f4"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(150, 205); g.lineTo(150, 170); g.moveTo(150, 205); g.lineTo(108, 190); g.moveTo(150, 205); g.lineTo(192, 190); g.moveTo(150, 170); g.lineTo(125, 160); g.moveTo(150, 170); g.lineTo(175, 160); g.stroke(); }
      if (sh) { g.strokeStyle = "#ffd166"; g.lineWidth = 2; g.beginPath(); g.moveTo(150, 40); g.lineTo(150 - sh * 0.9, 260); g.stroke(); g.setLineDash([4, 4]); g.beginPath(); g.moveTo(150, 40); g.lineTo(150, 260); g.stroke(); g.setLineDash([]); }
      g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(sh ? "midline shift ≈ " + Math.round(sh / 3) + " mm" : st.tab === "SAH" ? "bright blood in the cisterns" : "no shift", 8, 292); g.fillStyle = "#e8e8e8"; g.fillText("R", 8, 18); g.fillText("L", 284, 18); });
    mk("Pressure–volume curve (Monro–Kellie)", (g) => { g.fillStyle = "#0a0f16"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.moveTo(34, 20); g.lineTo(34, 270); g.lineTo(290, 270); g.stroke(); g.strokeStyle = "#ff8a8a"; g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= 250; x++) { const v = (x / 250) * 140, p = 8 * Math.exp(v / 52), y = 270 - Math.min(240, p * 3.1); x ? g.lineTo(34 + x, y) : g.moveTo(34 + x, y); } g.stroke();
      g.strokeStyle = "rgba(255,209,102,.6)"; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(34, 270 - 22 * 3.1); g.lineTo(290, 270 - 22 * 3.1); g.stroke(); g.setLineDash([]); const px = 34 + clamp(e.v / 140, 0, 1) * 250, py = 270 - Math.min(240, e.icp * 3.1); g.fillStyle = "#fff"; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill();
      g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText("22 mmHg treatment line · ICP " + e.icp, 40, 292); g.fillStyle = "#e8e8e8"; g.fillText("ICP", 6, 16); g.fillText("added volume →", 200, 286); });
    mk("Angiogram (schematic)", (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "#e8e8e8"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(150, 260); g.lineTo(150, 200); g.moveTo(150, 200); g.lineTo(100, 150); g.lineTo(80, 100); g.moveTo(150, 200); g.lineTo(200, 150); g.lineTo(220, 100); g.moveTo(100, 150); g.lineTo(150, 90); g.lineTo(200, 150); g.stroke();
      const P = { ACOM: [150, 90], MCA: [220, 100], PCOM: [200, 150], BASI: [150, 200] }[st.site], r = { small: 8, med: 14, large: 22 }[st.size]; if (st.tab === "SAH" || st.tab === "ANEU") { g.fillStyle = secured() ? "#555" : "#f4f4f4"; g.beginPath(); g.arc(P[0], P[1] - r - 6, r, 0, 7); g.fill(); if (st.coil) { g.strokeStyle = "#ffe08a"; g.lineWidth = 2; g.beginPath(); g.arc(P[0], P[1] - r - 6, r - 3, 0, 7); g.stroke(); } if (st.clip) { g.fillStyle = "#cfd8e8"; g.fillRect(P[0] - r, P[1] - 8, r * 2, 5); } }
      g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(st.tab === "SAH" || st.tab === "ANEU" ? SITES[st.site].label + (secured() ? " · secured" : " · aneurysm filling") : "vessels shifted by mass effect", 8, 292); });
  }

  const lab = {
    id: "neuro", name: "Brain Bleed & ICP Lab", tag: "Haemorrhage, aneurysm, herniation, hydrocephalus", icon: "🧠",
    tabs: ORDER.map((k) => ({ id: k, label: TABS[k].label, sub: TABS[k].sub })), get tab() { return st.tab; },
    selectHint: "For SAH and aneurysm, tap an artery on the circle of Willis to move the aneurysm there. Ischaemic stroke has its own lab.",
    opts: () => {
      const o = []; if (st.tab === "ICH") { o.push({ id: "loc", label: "Location", cur: st.loc, choices: Object.entries(LOCS).map(([k, v]) => [k, v.label]) }); o.push({ id: "anti", label: "Anticoagulant", cur: st.anti, choices: [["none", "None"], ["doac", "On an anticoagulant"]] }); }
      if (st.tab === "SAH" || st.tab === "ANEU") { o.push({ id: "site", label: "Aneurysm site", cur: st.site, choices: Object.entries(SITES).map(([k, v]) => [k, v.label]) }); o.push({ id: "size", label: "Size", cur: st.size, choices: [["small", "Small (3 mm)"], ["med", "Medium (7 mm)"], ["large", "Large (12 mm)"]] }); }
      if (st.tab === "SAH") o.push({ id: "grade", label: "Clinical grade", cur: st.grade, choices: [["good", "Good (Hunt–Hess I–II)"], ["poor", "Poor (Hunt–Hess IV–V)"]] });
      if (st.tab === "HERN") o.push({ id: "herType", label: "Herniation", cur: st.herType, choices: [["sub", "Subfalcine"], ["uncal", "Uncal"], ["central", "Central"], ["tonsil", "Tonsillar"]] });
      if (st.tab === "HCP") o.push({ id: "hcp", label: "Type", cur: st.hcp, choices: [["obs", "Obstructive"], ["comm", "Communicating"]] });
      return o;
    },
    slider: () => (st.tab === "HERN" ? { id: "m", label: "Mass effect (added volume, mL)", min: 0, max: 120, step: 5, v: st.mass, unit: " mL" } : st.tab === "ANEU" ? null : { id: "t", label: st.tab === "SAH" ? "Hours since the bleed (spasm window: day 3–14)" : "Hours since onset", min: 0, max: st.tab === "SAH" ? 336 : 48, step: st.tab === "SAH" ? 6 : 1, v: st.t, unit: " h" }),
    actions: () => {
      const a = [], on = (f) => ({ off: f });
      if (st.tab === "ICH") a.push({ id: "bp", label: "LOWER BP", hint: "Systolic target 130 to under 140 mmHg.", off: st.bp }, { id: "rev", label: "REVERSE ANTICOAG", hint: "Reverse the anticoagulant.", off: st.rev || st.anti === "none" }, { id: "evac", label: "EVACUATE CLOT", hint: "Surgical or minimally invasive evacuation.", off: st.evac }, { id: "evd", label: "PLACE EVD", hint: "Drain CSF for IVH hydrocephalus.", off: st.evd });
      if (st.tab === "SAH") a.push({ id: "coil", label: "COIL", hint: "Endovascular coiling.", off: secured() }, { id: "clip", label: "CLIP", hint: "Surgical clipping.", off: secured() }, { id: "nim", label: "NIMODIPINE", hint: "21 days, oral.", off: st.nim }, { id: "evd", label: "PLACE EVD", hint: "Acute hydrocephalus.", off: st.evd });
      if (st.tab === "ANEU") a.push({ id: "coil", label: "COIL", hint: "Endovascular coiling.", off: secured() }, { id: "clip", label: "CLIP", hint: "Surgical clipping.", off: secured() });
      if (st.tab === "HERN") a.push({ id: "head", label: "HEAD UP 30°", hint: "Tier 1.", off: st.head }, { id: "sed", label: "SEDATE", hint: "Tier 1–2.", off: st.sed }, { id: "osm", label: "HYPERTONIC SALINE", hint: "Osmotherapy.", off: st.osm }, { id: "evd", label: "PLACE EVD", hint: "CSF drainage.", off: st.evd }, { id: "hv", label: "HYPERVENTILATE", hint: "Brief bridge only.", off: st.hv }, { id: "evac", label: "REMOVE MASS", hint: "Evacuate the lesion.", off: st.evac }, { id: "crani", label: "CRANIECTOMY", hint: "Decompressive.", off: st.crani });
      if (st.tab === "HCP") a.push({ id: "evd", label: "PLACE EVD", hint: "Frontal horn catheter.", off: st.evd }, { id: "shunt", label: "VP SHUNT", hint: "Definitive drainage.", off: st.shunt });
      a.push({ id: "reset", label: "RESET", hint: "Start again.", off: false }); void on; return a;
    },
    dragHint: "To place the EVD, drag the catheter tip from the scalp into the right frontal horn (glowing ring). Coiling, clipping and the other treatments use the buttons.",
    views: [{ id: "front", label: "Front", f: () => ({ ry: 0, rx: 0.1, d: 4.4, tx: 0, ty: 0 }) }, { id: "side", label: "Side", f: () => ({ ry: 1.57, rx: 0.1, d: 4.4, tx: 0, ty: 0 }) }, { id: "base", label: "Base (vessels)", f: () => ({ ry: 0.3, rx: -1.2, d: 3.6, tx: 0, ty: -0.2 }) }, { id: "top", label: "Top", f: () => ({ ry: 0, rx: 1.3, d: 4.4, tx: 0, ty: 0 }) }],
    legend: [["#e8a3ab", "Brain"], ["#8a0f1e", "Blood / haematoma"], ["#6fb7ff", "Ventricles (CSF)"], ["#ffd27a", "Oedema"], ["#ffe08a", "Coils"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ st, evd, kit: evd }), tabLabel: () => T().label,
  };
  build();
  return lab;
}
