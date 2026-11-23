/* STROKE LAB: the master template for PATHODYNAMICS.
   Pick an occlusion, turn the brain, drag the clot out, and watch perfusion, tissue fate and the whole body respond.
   Teaching model: tissue fate depends on TIME and COLLATERALS; reopening the vessel does not undo tissue that has already infarcted.
   Content aligned to the 2026 AHA/ASA acute ischaemic stroke guideline (checked Nov 2026 against the published summaries); simplified teaching model. Numbers are illustrative ranges, not patient data. */
import { THREE, C, smooth } from "../stage.js?v=20261123n";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BRAIN = { cx: 0.58, rx: 0.56, ry: 0.78, rz: 1.0 };

/* ---------- what each occlusion does ---------- */
const SITES = {
  ICA: { label: "ICA", sub: "Carotid terminus", seg: "ICA", u: 0.62, down: ["A1", "M1", "M2sup", "M2inf", "M3sup", "M3inf", "A2"], tags: { mca_sup: 1, mca_inf: 1, mca_dist: 1, aca: 0.6, deep: 1 }, vol: 320, base: 18, nihss: "15–25", lysis: 0.15, aspects: 1, evt: "lvo",
    anat: "The internal carotid artery (ICA) feeds the anterior circulation. At its terminus it divides into the anterior cerebral artery (A1) and the middle cerebral artery (M1).",
    patho: "A terminal ICA ('carotid T') occlusion cuts off most of the MCA territory and part of the ACA territory at once. How quickly the core grows depends on collateral flow through the anterior and posterior communicating arteries and the leptomeningeal vessels.",
    interv: "Large clot burden: IV thrombolysis alone often fails to reopen the vessel, so mechanical thrombectomy (stent retriever or aspiration) is the main reperfusion treatment when criteria are met." },
  M1: { label: "MCA M1", sub: "Horizontal segment", seg: "M1", u: 0.55, down: ["M2sup", "M2inf", "M3sup", "M3inf"], tags: { mca_sup: 1, mca_inf: 1, mca_dist: 1, deep: 1 }, vol: 240, base: 15, nihss: "10–20", lysis: 0.3, aspects: 1, evt: "lvo",
    anat: "M1 runs sideways from the ICA terminus towards the Sylvian fissure. It gives off the lenticulostriate arteries, which supply the basal ganglia and internal capsule, before it divides into M2 branches.",
    patho: "The lenticulostriate territory is an end-artery zone, so the deep (striatocapsular) core forms early, while the cortex can be held in a penumbra by leptomeningeal collaterals. Face, arm and leg are all affected, with gaze deviation towards the lesion and either aphasia (dominant hemisphere) or neglect (non-dominant).",
    interv: "M1 is the classic thrombectomy target. Thrombolysis can be given first when eligible, but recanalisation rates for proximal clots are modest." },
  M2: { label: "MCA M2", sub: "Division branches", seg: "M2", u: 0.5, tags: { mca_sup: 1 }, vol: 110, base: 8, nihss: "5–12", lysis: 0.4, aspects: 0.45, evt: "m2",
    anat: "At the MCA bifurcation the vessel splits into a superior division (frontal, Rolandic and anterior parietal cortex) and an inferior division (temporal and angular cortex).",
    patho: "The territory is partial. Superior division: face and arm weakness with expressive (dominant) or neglect-type (non-dominant) features. Inferior division: comprehension aphasia, visual-field deficit and little weakness. The deep structures are usually spared, because the lenticulostriates arise from M1.",
    interv: "Proximal M2 occlusions: thrombectomy is considered case by case and the evidence is less firm than for M1; IV thrombolysis remains an option." },
  M3: { label: "MCA M3", sub: "Cortical branches", seg: "M3inf", u: 0.45, tags: { mca_dist: 1 }, vol: 35, base: 4, nihss: "1–6", lysis: 0.5, aspects: 0.2, evt: "distal",
    anat: "M3 branches run over the cortical surface from the Sylvian fissure to the convexity (the figure shows an angular-region branch).",
    patho: "A small cortical territory causes focal deficits: quadrant visual-field loss, cortical sensory loss, mild language or neglect signs. Penumbra is usually generous because neighbouring branches supply collateral flow.",
    interv: "Medium and distal vessel occlusions: randomised thrombectomy trials (ESCAPE-MeVO, DISTAL) did not show a clear benefit, so IV thrombolysis and medical care remain central." },
  ACA: { label: "ACA", sub: "A2 pericallosal", seg: "A2", u: 0.4, down: [], tags: { aca: 1 }, vol: 90, base: 7, nihss: "4–10", lysis: 0.45, aspects: 0, evt: "distal",
    anat: "The anterior cerebral artery (A1 then A2/pericallosal) supplies the medial frontal and parietal cortex, including the leg areas of the motor and sensory strips.",
    patho: "Leg weakness greater than arm weakness, leg sensory loss, reduced drive (abulia) and urinary incontinence. The face is usually spared.",
    interv: "IV thrombolysis if eligible; thrombectomy for ACA occlusion is individualised and uncommon." },
  PCA: { label: "PCA", sub: "P2 segment", seg: "P2", u: 0.45, tags: { pca: 1, thal: 0.7 }, vol: 95, base: 6, nihss: "3–8", lysis: 0.45, aspects: 0, evt: "distal",
    anat: "The posterior cerebral artery arises from the basilar tip (P1) and supplies the occipital lobe, the medial temporal lobe and, through perforators, the thalamus.",
    patho: "Contralateral homonymous hemianopia (often sparing the macula), thalamic sensory loss, memory impairment and, on the left, alexia without agraphia. Weakness is usually absent.",
    interv: "IV thrombolysis if eligible; thrombectomy is considered for selected proximal PCA occlusions." },
  BA: { label: "Basilar", sub: "Brainstem circulation", seg: "BA", u: 0.5, down: ["P1_R", "P1_L", "P2_R", "P2_L", "SCA_R", "SCA_L"], tags: { bs: 1, cb: 1, pca: 1, thal: 1 }, vol: 150, base: 24, nihss: "15–35 (can be low early)", lysis: 0.25, aspects: 0, evt: "ba", noSide: true,
    anat: "The two vertebral arteries unite to form the basilar artery, which supplies the pons, midbrain and cerebellum, and through the PCAs the occipital lobes and thalami.",
    patho: "Brainstem ischaemia gives quadriparesis, cranial-nerve and gaze palsies, drowsiness to coma, or a locked-in state. Early signs can be subtle (vertigo, headache, dysarthria) and progress abruptly; untreated mortality is very high.",
    interv: "Randomised trials (ATTENTION, BAOCHE) showed that thrombectomy benefits selected patients with basilar occlusion within roughly 12–24 hours of onset." },
  VA: { label: "Vertebral", sub: "V4 / PICA origin", seg: "VA", u: 0.5, down: ["PICA"], tags: { medlat: 1, cb: 0.45 }, vol: 25, base: 6, nihss: "2–10", lysis: 0.3, aspects: 0, evt: "distal",
    anat: "The vertebral artery gives off the posterior inferior cerebellar artery (PICA), which supplies the lateral medulla and the lower cerebellum, before joining its partner to form the basilar artery.",
    patho: "Lateral medullary (Wallenberg) syndrome: vertigo, ipsilateral face and contralateral body pain/temperature loss, dysphagia, hoarseness, Horner syndrome and ataxia. Limb strength is usually preserved.",
    interv: "Medical management and IV thrombolysis if eligible; endovascular treatment is individualised. Dysphagia screening before any oral intake." },
};
const TABS = ["ICA", "M1", "M2", "M3", "ACA", "PCA", "BA", "VA"];
const COLL = { poor: { tau: 2, cbf: 12 }, mod: { tau: 7, cbf: 22 }, good: { tau: 20, cbf: 34 } };

export default function create(S, ui) {
  const st = { tab: "M1", side: "R", div: "sup", coll: "mod", t: 2, clot: true, removed: false, reper: 0, rtarget: 0, rAt: null, lysed: false, rec: 0, grab: false, ghost: false };
  const sx = () => (st.side === "R" ? 1 : -1);
  const site = () => SITES[st.tab];
  let meshes = {}, vessels = {}, tis = [], clot = null, ring = null, tray = null, flowsBy = {}, dirty = true, labelSpr = null, clotHome = new THREE.Vector3();

  /* ---------- geometry ---------- */
  const surf = (s, ph, th, k) => { k = k || 1.012; return [s * (BRAIN.cx + BRAIN.rx * Math.cos(th) * Math.cos(ph) * k), BRAIN.ry * Math.sin(th) * k, BRAIN.rz * Math.cos(th) * Math.sin(ph) * k]; };
  const arc = (s, a) => a.map(([ph, th]) => surf(s, ph, th));
  function hemi(s) {
    const g = new THREE.SphereGeometry(1, 84, 64), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const ux = v.x, uy = v.y, uz = v.z;
      const gy = 1 + 0.05 * Math.sin(11 * ux + 4 * uy + 2) * Math.sin(9 * uy + 3 * uz) * Math.sin(10 * uz + ux * 2) + 0.03 * Math.sin(23 * ux * uz + 5 * uy);
      let x = BRAIN.cx * s + s * ux * BRAIN.rx * gy * (1 - 0.1 * Math.max(0, uz)), y = uy * BRAIN.ry * gy, z = uz * BRAIN.rz * gy;
      if (s * x < 0.035) x = s * 0.035;                         /* flat medial wall */
      if (y < -0.36) y = -0.36 + (y + 0.36) * 0.12;             /* flattened base: the vessels run underneath */
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals(); return g;
  }
  const noise = (a, b, c) => 0.5 + 0.5 * Math.sin(6 * a + 1) * Math.sin(5 * b + 2) * Math.sin(4 * c + 3);
  function classify(s) {
    return (P) => {
      const u = (s * P.x - BRAIN.cx) / BRAIN.rx, v = P.y / BRAIN.ry, w = P.z / BRAIN.rz; let tag;
      const medial = u < -0.5;
      if (w < -0.8 && u > -0.8) tag = "pca"; else if (v < -0.42 && w < -0.25 && u < 0.4) tag = "pca";
      else if (medial) tag = (w > -0.45 && v > -0.3) ? "aca" : "pca";
      else if (v > 0.55 && u < 0.2) tag = "aca"; else if (v < -0.4 && w > 0.45 && u < 0.2) tag = "aca";
      else if (w < -0.3 && v > -0.35) tag = "mca_dist"; else if (v > 0.15) tag = "mca_sup"; else tag = "mca_inf";
      const cen = tag === "aca" ? [-0.8, 0.4, 0.3] : tag === "pca" ? [-0.5, -0.2, -0.8] : tag === "mca_dist" ? [0.7, 0.2, -0.6] : tag === "mca_sup" ? [0.6, 0.45, 0.2] : [0.6, -0.2, 0.1];
      const d = Math.hypot(u - cen[0], v - cen[1], w - cen[2]);
      const sh = 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(15 * u + 5 * v) * Math.sin(13 * v + 4 * w) * Math.sin(14 * w + 3 * u));
      return { tag, rank: clamp(d / 1.25 + 0.1 * noise(u * 3, v * 3, w * 3), 0, 1), h: noise(u, v, w), sh };
    };
  }
  const ell = (rx, ry, rz, pos, tag, hex, rankv) => { const g = new THREE.SphereGeometry(1, 28, 20); g.scale(rx, ry, rz); g.translate(...pos); return S.tissue(g, hex, () => ({ tag, rank: rankv == null ? 0.2 : rankv, h: 0 })); };

  function build() {
    S.clear(); meshes = {}; vessels = {}; tis = []; flowsBy = {};
    const grp = S.add(new THREE.Group()); meshes.grp = grp;
    [-1, 1].forEach((s) => {
      const h = S.tissue(hemi(s), 0xd8a9ae, classify(s), { transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide }); h.side = s; h.mesh.renderOrder = 2; h.mesh.userData.hemi = s; grp.add(h.mesh); tis.push(h);
      const cb = ell(0.42, 0.24, 0.4, [s * 0.38, -0.74, -0.9], "cb", 0xc9a08c, 0.3); cb.side = s; cb.mesh.material.transparent = true; cb.mesh.material.opacity = 0.9; grp.add(cb.mesh); tis.push(cb);
      const bg = ell(0.2, 0.17, 0.24, [s * 0.4, -0.04, 0.16], "deep", 0xc08f95, 0.1); bg.side = s; grp.add(bg.mesh); tis.push(bg);
      const th = ell(0.12, 0.1, 0.17, [s * 0.17, -0.02, -0.12], "thal", 0xb98388, 0.15); th.side = s; grp.add(th.mesh); tis.push(th);
      const ml = ell(0.09, 0.12, 0.09, [s * 0.11, -0.9, -0.44], "medlat", 0xd9bfa4, 0.1); ml.side = s; grp.add(ml.mesh); tis.push(ml);
    });
    const bsg = new THREE.CylinderGeometry(0.17, 0.12, 0.8, 24, 6); bsg.rotateX(0.35); bsg.translate(0, -0.72, -0.43); const bs = S.tissue(bsg, 0xd3bfa8, () => ({ tag: "bs", rank: 0.15, h: 0 })); bs.side = 0; grp.add(bs.mesh); tis.push(bs);
    const pons = ell(0.22, 0.14, 0.2, [0, -0.55, -0.32], "bs", 0xd3bfa8, 0.15); pons.side = 0; grp.add(pons.mesh); tis.push(pons);

    /* vessels */
    const A = 0xe0475a, add = (name, pts, r, o) => { const m = S.tube(pts, r, A, { emis: 0x330008, seg: 40 }); m.userData.name = name; m.renderOrder = 1; vessels[name] = m; grp.add(m); return m; };
    [-1, 1].forEach((s) => { const n = s === 1 ? "R" : "L";
      add("ICA_" + n, [[s * 0.30, -1.15, 0.02], [s * 0.34, -0.85, 0.06], [s * 0.31, -0.58, 0.12], [s * 0.28, -0.43, 0.16]], 0.034);
      add("A1_" + n, [[s * 0.28, -0.43, 0.16], [s * 0.18, -0.43, 0.33], [s * 0.06, -0.43, 0.5]], 0.026);
      add("A2_" + n, [[s * 0.06, -0.43, 0.52], [s * 0.06, -0.15, 0.7], [s * 0.07, 0.22, 0.6], [s * 0.08, 0.5, 0.2], [s * 0.09, 0.62, -0.3]], 0.024);
      add("M1_" + n, [[s * 0.28, -0.43, 0.16], [s * 0.52, -0.41, 0.22], [s * 0.78, -0.35, 0.28], [s * 0.92, -0.27, 0.30]], 0.03);
      add("M2sup_" + n, [[s * 0.92, -0.27, 0.30], [s * 0.97, -0.02, 0.28], [s * 1.05, 0.26, 0.18], [s * 1.08, 0.36, 0.1]], 0.022);
      add("M2inf_" + n, [[s * 0.92, -0.27, 0.30], [s * 1.0, -0.22, 0.02], [s * 1.07, -0.14, -0.24], [s * 1.09, -0.06, -0.4]], 0.022);
      [["a", [[0.15, 0.28], [0.5, 0.42], [0.85, 0.55], [1.1, 0.62]]], ["b", [[0.1, 0.3], [0.15, 0.5], [0.12, 0.7], [0.1, 0.9]]], ["c", [[0.05, 0.3], [-0.3, 0.5], [-0.6, 0.62], [-0.8, 0.75]]]].forEach(([k, a]) => add("M3sup" + k + "_" + n, arc(s, a), 0.012));
      [["a", [[-0.1, 0.0], [-0.5, 0.1], [-0.8, 0.3], [-1.05, 0.4]]], ["b", [[-0.1, -0.1], [-0.45, -0.2], [-0.75, -0.3], [-1.0, -0.35]]], ["c", [[0.1, -0.12], [0.45, -0.3], [0.8, -0.4]]]].forEach(([k, a]) => add("M3inf" + k + "_" + n, arc(s, a), 0.012));
      add("P1_" + n, [[0, -0.46, -0.26], [s * 0.2, -0.44, -0.18], [s * 0.34, -0.43, -0.06]], 0.024);
      add("PCom_" + n, [[s * 0.30, -0.43, 0.12], [s * 0.33, -0.43, 0.03], [s * 0.34, -0.43, -0.06]], 0.012);
      add("P2_" + n, [[s * 0.34, -0.43, -0.06], [s * 0.55, -0.46, -0.3], [s * 0.62, -0.38, -0.6], [s * 0.55, -0.12, -0.95]], 0.024);
      add("SCA_" + n, [[s * 0.05, -0.47, -0.28], [s * 0.35, -0.62, -0.5], [s * 0.55, -0.7, -0.75]], 0.014);
      add("VA_" + n, [[s * 0.42, -1.2, -0.62], [s * 0.28, -1.08, -0.58], [s * 0.1, -0.98, -0.5]], 0.028);
      add("PICA_" + n, [[s * 0.28, -1.08, -0.58], [s * 0.45, -0.98, -0.72], [s * 0.55, -0.95, -0.86]], 0.014);
    });
    add("ACom", [[0.06, -0.43, 0.5], [-0.06, -0.43, 0.5]], 0.014);
    add("BA", [[0, -0.98, -0.5], [0, -0.8, -0.42], [0, -0.62, -0.34], [0, -0.46, -0.26]], 0.034);
    /* the tap targets are slightly fatter than the vessels */
    Object.keys(vessels).forEach((k) => { const m = vessels[k]; if (/^(ICA|M1|M2|A2|P2|BA|VA)/.test(k)) { const base = k.replace(/_[RL]$/, "").replace(/^M2.*/, "M2"); const key = base === "A2" ? "ACA" : base === "P2" ? "PCA" : base === "VA" ? "VA" : base; const halo = new THREE.Mesh(new THREE.TubeGeometry(m.userData.curve, 24, Math.max(0.07, m.userData.r * 2.6), 6, false), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); halo.userData.site = key; halo.userData.side = k.endsWith("_L") ? "L" : k.endsWith("_R") ? "R" : null; grp.add(halo); S.pick.push(halo); } });
    /* flow particles on every vessel */
    Object.keys(vessels).forEach((k) => { const m = vessels[k], n = Math.round(m.userData.curve.getLength() * 16) + 4; flowsBy[k] = S.flow(m.userData.curve, n, 0xff6a76, { speed: 0.28 / Math.max(0.35, m.userData.curve.getLength()) * 0.8 }); });
    /* clot, ring, tray label */
    const cg = new THREE.IcosahedronGeometry(0.075, 2), cp = cg.attributes.position, q = new THREE.Vector3(); for (let i = 0; i < cp.count; i++) { q.fromBufferAttribute(cp, i); const k = 1 + 0.25 * Math.sin(q.x * 90) * Math.cos(q.y * 70 + q.z * 40); cp.setXYZ(i, q.x * k * 1.55, q.y * k * 0.9, q.z * k * 0.9); } cg.computeVertexNormals();
    clot = new THREE.Mesh(cg, new THREE.MeshPhongMaterial({ color: 0x7a0f1e, emissive: 0x3a0610, shininess: 80 })); clot.userData.drag = true; clot.userData.clot = true; clot.renderOrder = 4; grp.add(clot); S.pick.push(clot);
    ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 })); ring.renderOrder = 6; grp.add(ring);
    labelSpr = null; dirty = true; place();
  }

  /* ---------- the chosen occlusion ---------- */
  const sfx = () => "_" + st.side;
  function names() { const s = site(), k = st.tab, n = k === "BA" ? "" : sfx(); const res = { occ: null, down: [] };
    if (k === "ICA") { res.occ = "ICA" + n; res.down = ["A1", "M1", "M2sup", "M2inf", "M3supa", "M3supb", "M3supc", "M3infa", "M3infb", "M3infc", "A2"].map((x) => x + n); }
    else if (k === "M1") { res.occ = "M1" + n; res.down = ["M2sup", "M2inf", "M3supa", "M3supb", "M3supc", "M3infa", "M3infb", "M3infc"].map((x) => x + n); }
    else if (k === "M2") { const d = st.div; res.occ = "M2" + d + n; res.down = ["a", "b", "c"].map((x) => "M3" + d + x + n); }
    else if (k === "M3") { res.occ = "M3infa" + n; res.down = []; }
    else if (k === "ACA") { res.occ = "A2" + n; res.down = []; }
    else if (k === "PCA") { res.occ = "P2" + n; res.down = []; }
    else if (k === "BA") { res.occ = "BA"; res.down = ["P1_R", "P1_L", "P2_R", "P2_L", "SCA_R", "SCA_L"]; }
    else if (k === "VA") { res.occ = "VA" + n; res.down = ["PICA" + n]; }
    void s; return res;
  }
  function tags() {
    const k = st.tab, t = Object.assign({}, site().tags);
    if (k === "M2") { return st.div === "sup" ? { mca_sup: 1 } : { mca_inf: 1, mca_dist: 0.6 }; }
    return t;
  }
  function place() {
    const nm = names(), m = vessels[nm.occ]; if (!m) return; const u = site().u, p = m.userData.curve.getPointAt(u); clotHome.copy(p); clot.position.copy(p);
    const tg = m.userData.curve.getTangentAt(u); clot.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tg.clone().normalize()); ring.position.copy(p); ring.lookAt(p.clone().add(tg)); clot.visible = true; ring.visible = true; clot.scale.setScalar(1);
    st.clot = true; st.removed = false; st.reper = 0; st.rtarget = 0; st.rAt = null; st.lysed = false; st.rec = 0; dirty = true;
    const sd = st.tab === "BA" ? 0 : sx(); S.view({ ry: -0.55 * sd - (sd ? 0 : 0.3), rx: 0.2, d: 3.9, tx: sd * (st.tab === "VA" || st.tab === "PCA" ? 0.3 : 0.5), ty: st.tab === "BA" || st.tab === "VA" ? -0.55 : -0.1, tz: 0 });
    if (labelSpr) { grp().remove(labelSpr); } labelSpr = S.label(site().label + (st.tab === "BA" ? "" : " · " + (st.side === "R" ? "right" : "left")), [p.x, p.y + 0.22, p.z + 0.1], "#ffd166"); grp().add(labelSpr);
  }
  const grp = () => meshes.grp;

  /* ---------- the time and tissue model ---------- */
  const coreFrac = (deep) => { const tau = COLL[st.coll].tau * (deep ? 0.4 : 1), t = st.rAt != null ? st.rAt : st.t; return 1 - Math.exp(-t / tau); };
  const avgCore = () => { const a = coreFrac(false), d = coreFrac(true), tg = tags(); const deepW = (tg.deep || 0) + (tg.thal || 0) + (tg.bs || 0) + (tg.medlat || 0); return deepW ? 0.5 * a + 0.5 * d : a; };
  const flowNow = () => st.reper;   /* 0 = blocked, 1 = open */
  function paintAll() {
    const tg = tags(), sd = st.tab === "BA" ? 0 : sx(), c0 = C(0x5b1230), pen = C(0xffb347), rec = C(0x8fe8b0), reperf = st.rAt != null;
    tis.forEach((T) => {
      const deepTag = ["deep", "thal", "bs", "medlat"];
      T.paint((tag, rank, h, out) => {
        const w = tg[tag]; if (!w || h > w) return; if (sd && T.side && T.side !== sd) return;
        const cf = coreFrac(deepTag.includes(tag)), isCore = rank < cf;
        if (isCore) { out.lerp(c0, 0.92); return; }
        if (!reperf) { out.lerp(pen, 0.78 - 0.25 * st.reper); } else { out.lerp(pen, 0.78 * (1 - st.rec)); out.lerp(rec, 0.35 * st.rec); }
      });
      void deepTag;
    });
  }
  /* the vessel colour and the particles follow the flow */
  function flowUpdate(dt) {
    const nm = names(), k = site(), collat = COLL[st.coll].cbf / 100;
    const target = st.removed ? 1 : st.lysed ? k.lysis : 0; st.rtarget = target; st.reper += (target - st.reper) * Math.min(1, dt * 1.6);
    if (Math.abs(target - st.reper) < 0.003) st.reper = target;
    if (st.removed && st.rAt == null) st.rAt = st.t;      /* fix the tissue as it was at the moment of reperfusion */
    if (st.lysed && st.rAt == null && st.reper > 0.3) st.rAt = st.t;
    if (st.rAt != null && st.rec < 1) st.rec = Math.min(1, st.rec + dt * 0.45);
    const down = new Set(nm.down);
    Object.keys(vessels).forEach((n) => {
      const f = flowsBy[n], m = vessels[n]; let rate = 1, to = 1;
      if (n === nm.occ) { if (st.reper < 0.98) { to = 0.5 + 0.5 * st.reper; rate = 0.9; } }
      else if (down.has(n)) rate = collat * 0.35 + (1 - collat * 0.35) * st.reper;
      if (n === nm.occ && st.reper < 0.98 && st.tab === "ICA") { /* the whole ICA is blocked at the terminus: keep upstream filling */ }
      f.rate += (rate - f.rate) * Math.min(1, dt * 4); f.to = to;
      const dim = n === nm.occ ? (st.reper < 0.98 ? 0.8 : 1) : down.has(n) ? 0.45 + 0.55 * st.reper : 1; m.material.color.setRGB(0.88 * dim, 0.28 * dim, 0.35 * dim);
    });
    const ca = nm.occ && vessels[nm.occ]; void ca;
    if (clot && clot.visible && !st.grab) { clot.scale.setScalar(st.lysed && !st.removed ? 1 - 0.8 * (st.reper / Math.max(0.01, k.lysis)) : 1); }
    ring.visible = !st.removed && (!st.lysed || st.reper < 0.98); ring.scale.setScalar(1 + 0.12 * Math.sin(S.time() * 5)); ring.material.opacity = 0.55 + 0.4 * Math.sin(S.time() * 5);
    if (st.removed && tray) { tray.t += dt; const kk = smooth(clamp(tray.t / 1.1, 0, 1)); clot.position.lerpVectors(tray.from, tray.to, kk); if (tray.t > 2.2) clot.material.opacity = Math.max(0, 1 - (tray.t - 2.2)); }
    if (!st.removed && !st.grab && clot) { /* spring home */ clot.position.lerp(clotHome, Math.min(1, dt * 10)); }
  }
  let accT = 0;
  function frame(dt) {
    flowUpdate(dt); accT += dt;
    const need = dirty || (st.rAt != null && st.rec < 1) || (st.rtarget !== 0 && st.rec < 1); if (need && accT > 0.06) { accT = 0; paintAll(); dirty = false; }
    meshes.grp.children.forEach((c) => { if (c.userData.hemi) { c.material.opacity += ((st.ghost ? 0.14 : 0.62) - c.material.opacity) * Math.min(1, dt * 5); } });
  }
  S.hooks.push(frame);

  /* ---------- picking and dragging ---------- */
  S.onGrab = (o) => { if (o.userData.clot && !st.removed) { st.grab = true; clot.scale.setScalar(1.15); } };
  S.onDrag = (o, w) => { if (!st.grab) return; const p = meshes.grp.worldToLocal(w.clone()); clot.position.copy(p); const d = p.distanceTo(clotHome); ui.hint(d > 0.45 ? "Release to retrieve the clot" : "Pull the clot away from the vessel…", d > 0.45); };
  S.onDrop = (o) => { if (!st.grab) return; st.grab = false; clot.scale.setScalar(1); const d = clot.position.distanceTo(clotHome); if (d > 0.45) { st.removed = true; if (st.rAt == null) st.rAt = st.t; const away = clot.position.clone().sub(clotHome).normalize().multiplyScalar(0.55).add(clot.position); tray = { t: 0, from: clot.position.clone(), to: away }; clot.material.transparent = true; clot.material.opacity = 1; ui.refresh("Clot retrieved · vessel reopened"); ui.hint("", false); } else { ui.hint("Drag the clot further out of the vessel to retrieve it.", false); } };
  S.onTap = (o) => { if (!o) return; if (o.userData.site) { const k = o.userData.site; if (k !== st.tab || (o.userData.side && o.userData.side !== st.side)) { if (o.userData.side && !SITES[k].noSide) st.side = o.userData.side; setTab(k); ui.refresh(); } } };

  /* ---------- state changes ---------- */
  function setTab(k) { st.tab = k; if (SITES[k].noSide) st.side = "R"; build(); }
  function setOpt(id, v) { if (id === "side") { st.side = v; build(); } else if (id === "div") { st.div = v; build(); } else if (id === "coll") { st.coll = v; dirty = true; } else if (id === "ghost") { st.ghost = v === "1"; } }
  function setT(v) { if (st.rAt != null) return; st.t = v; dirty = true; }
  function act(id) {
    if (id === "lysis") { if (!st.removed) { st.lysed = true; } }
    else if (id === "reset") { build(); }
    else if (id === "ghost") { st.ghost = !st.ghost; }
  }

  /* ---------- the readout ---------- */
  function est() {
    const s = site(), cf = avgCore(), reperf = st.rAt != null, partial = st.lysed && !st.removed ? st.reper / Math.max(0.01, s.lysis) : 0;
    const resid = reperf ? clamp(0.12 + 0.88 * cf, 0, 1) * (st.removed ? 1 : 1 - 0.55 * s.lysis * partial) : 1;
    const base = s.base, nihss = Math.round(base * resid), rcbf = reperf ? Math.round(COLL[st.coll].cbf + (95 - COLL[st.coll].cbf) * st.reper) : COLL[st.coll].cbf;
    return { cf, reperf, resid, nihss, rcbf };
  }
  function bodyMap() {
    const s = site(), e = est(), k = st.tab, side = st.side, contra = side === "R" ? "L" : "R", map = {}, marks = {}; const lv = (n) => (e.reperf ? Math.round(n * e.resid) : n);
    const set = (id, n) => { const v = lv(n); map[id] = v > 0 ? v : (e.reperf && n > 0 ? "rec" : 0); };
    const hemi = ["ICA", "M1", "M2", "M3", "ACA"].includes(k);
    if (k === "ICA" || k === "M1") { set("face-" + contra, 2); set("arm-" + contra, 3); set("leg-" + contra, 2); }
    else if (k === "M2") { if (st.div === "sup") { set("face-" + contra, 2); set("arm-" + contra, 2); set("leg-" + contra, 1); } else { set("arm-" + contra, 1); } }
    else if (k === "M3") { set("arm-" + contra, 1); }
    else if (k === "ACA") { set("leg-" + contra, 3); set("arm-" + contra, 1); }
    else if (k === "PCA") { set("face-" + contra, 1); set("arm-" + contra, 1); set("leg-" + contra, 1); }
    else if (k === "BA") { ["face-R", "face-L", "arm-R", "arm-L", "leg-R", "leg-L", "neck"].forEach((r) => set(r, 3)); }
    else if (k === "VA") { set("face-" + side, 1); set("arm-" + contra, 1); set("leg-" + contra, 1); set("neck", 2); }
    map.brain = e.reperf ? "rec" : 3;
    const on = (n) => (e.reperf ? Math.round(n * e.resid) > 0 : true);
    if (k === "ICA" || k === "M1" || (k === "M2" && st.div === "sup")) { if (on(1)) marks.gaze = side; }
    if (hemi && (k !== "ACA" && k !== "M3") && on(1)) { if (side === "L") marks.speech = k === "M2" && st.div === "inf" ? "COMPREHENSION" : "APHASIA"; else marks.neglect = "NEGLECT"; }
    if (k === "M2" && st.div === "inf" && on(1)) { marks.field = "FIELD CUT"; if (side === "L") marks.speech = "COMPREHENSION"; }
    if ((k === "M1" || k === "ICA" || k === "PCA" || k === "M3") && on(1)) marks.field = "FIELD CUT";
    if (k === "BA" && on(1)) { marks.gaze = side; marks.speech = "DYSARTHRIA"; }
    if (k === "VA" && on(1)) marks.speech = "DYSPHAGIA";
    void s; return { map, marks };
  }
  function obs() {
    const s = site(), e = est(), tg = tags(), cfPct = Math.round(e.cf * 100), pen = 100 - cfPct, vol = Math.round(s.vol * e.cf * (e.reperf ? 1 : 1));
    const tone = (c) => c;
    const flow = e.reperf ? (st.removed ? "mTICI 3 (complete)" : "Partial · mTICI 2a") : "TICI 0 (occluded)";
    const params = [
      { k: "Vessel flow", v: st.removed || st.reper > 0.9 ? "restored" : flow, tone: st.reper > 0.9 ? "ok" : "bad" },
      { k: "Territory CBF", v: e.rcbf + "% of normal", tone: e.rcbf > 50 ? "ok" : e.rcbf > 25 ? "warn" : "bad" },
      { k: "Infarct core", v: cfPct + "% of territory · ~" + vol + " mL", tone: cfPct > 40 ? "bad" : cfPct > 15 ? "warn" : "ok" },
      { k: e.reperf ? "Salvaged tissue" : "Penumbra at risk", v: pen + "% of territory", tone: e.reperf ? "ok" : "warn" },
      { k: "NIHSS (illustrative)", v: String(e.nihss) + (e.reperf ? "  (was " + s.base + ")" : ""), tone: e.nihss > 14 ? "bad" : e.nihss > 6 ? "warn" : "ok" },
      { k: e.reperf ? "Reperfused at" : "Time from onset", v: (e.reperf ? st.rAt : st.t).toFixed(1) + " h", tone: "info" },
    ];
    void tone; void tg;
    const bm = bodyMap();
    let note = "";
    if (!e.reperf) note = "Blocked artery: flow beyond the clot depends on collaterals (" + { poor: "poor", mod: "moderate", good: "good" }[st.coll] + "). Move the time slider to see the core grow and the penumbra shrink.";
    else if (st.removed) note = e.cf > 0.55 ? "Vessel open, but much tissue had already infarcted: recanalisation does not reverse established infarction, so recovery is limited." : e.cf > 0.2 ? "Vessel open and a useful amount of penumbra was saved. Some deficit remains where infarction had already occurred." : "Early reperfusion: most of the penumbra was saved and the deficit improves substantially. Recovery is potential, not guaranteed.";
    else note = "Thrombolysis opened the vessel only partly. Large proximal clots often resist lysis, so thrombectomy is considered.";
    return { params, body: bm.map, marks: bm.marks, note };
  }
  function info() { const s = site(); return { anat: s.anat, patho: s.patho, interv: s.interv }; }

  /* ---------- clinical correlation ---------- */
  function clin() {
    const s = site(), e = est(), t = st.reperf != null ? st.t : st.t, hrs = st.rAt != null ? st.rAt : t, lines = [];
    const asp = s.aspects ? clamp(10 - Math.round(e.cf * 10 * s.aspects), 0, 10) : null;
    const lvo = ["ICA", "M1", "BA"].includes(st.tab) || (st.tab === "M2" && st.div === "sup" && false);
    lines.push(["NIHSS", "Typical range for this occlusion: " + s.nihss + ". Current estimate " + e.nihss + " (illustrative)."]);
    lines.push(["CT brain", "Non-contrast CT first, to exclude haemorrhage. Early ischaemia may be subtle: loss of grey–white differentiation, insular ribbon sign" + (st.tab === "M1" && !st.removed ? ", hyperdense MCA sign" : "") + (asp != null ? ". ASPECTS ≈ " + asp + " (10 = no early change)." : ".")]);
    lines.push(["CTA", "Shows the filling defect at the occlusion site (" + s.label + ") and collateral filling."]);
    lines.push(["CT perfusion", "Core (very low CBF) ≈ " + Math.round(e.cf * 100) + "% of the at-risk territory; the surrounding delayed-flow zone (high Tmax) is the penumbra. A large mismatch favours reperfusion."]);
    const lys = hrs <= 4.5 ? "the patient is inside the standard thrombolysis window (≤ 4.5 h): IV tenecteplase or alteplase is recommended for a disabling deficit regardless of NIHSS, without advanced imaging, if there are no contraindications. For a non-disabling deficit, dual antiplatelet therapy is preferred over thrombolysis" : hrs <= 9 ? "the patient is 4.5–9 h from onset (or onset unknown): extended-window thrombolysis may be considered only in selected patients with favourable advanced imaging (DWI-FLAIR mismatch or perfusion mismatch)" : "the patient is beyond 9 h: outside the usual thrombolysis windows";
    let evt;
    if (st.tab === "ICA" || st.tab === "M1") evt = hrs <= 6 ? "Large-vessel occlusion within 6 h: thrombectomy is the standard treatment in eligible patients. Do not delay thrombectomy to see whether thrombolysis works: eligible patients get both, rapidly and in sequence." : hrs <= 24 ? "6–24 h: thrombectomy for selected patients with favourable perfusion/clinical–core mismatch (DAWN, DEFUSE-3 type selection)." : "Beyond 24 h: individualised.";
    else if (st.tab === "BA") evt = "Basilar occlusion: thrombectomy is strongly recommended within 24 h of onset when NIHSS is 10 or more (ATTENTION, BAOCHE).";
    else if (st.tab === "M2") evt = "Proximal M2: individualised; less certain benefit than M1.";
    else evt = "Medium or distal vessel occlusion: thrombectomy benefit not shown in recent randomised trials; individualise.";
    if (asp != null && asp <= 5 && (st.tab === "ICA" || st.tab === "M1")) evt += " With a large established core (ASPECTS 3–5), recent trials (SELECT2, ANGEL-ASPECT, RESCUE-Japan LIMIT) support thrombectomy in selected patients, and the 2026 guideline widens eligibility for larger cores, with lower expected benefit.";
    lines.push(["Treatment pathways to consider", "At " + hrs.toFixed(1) + " h from onset, " + lys + ". " + evt]);
    lines.push(["Before any treatment", "Glucose, blood pressure (≤ 185/110 mmHg before thrombolysis), anticoagulant history, platelet count and INR where indicated, and airway/swallow safety. After treatment, intensive blood-pressure lowering to below 140 mmHg is not recommended (even with complete reperfusion), nor is intensive glucose control to 80–130 mg/dL. Argatroban or eptifibatide added to thrombolysis is not recommended. Reference: 2026 AHA/ASA guideline for early management of acute ischaemic stroke; follow your local stroke protocol."]);
    return { lines, draw: (el) => drawImaging(el, e, asp) };
  }
  function drawImaging(el, e, asp) {
    const mk = (title, f) => { const d = document.createElement("div"); d.className = "img"; const c = document.createElement("canvas"); c.width = 300; c.height = 300; const t = document.createElement("small"); t.textContent = title; d.append(c, t); el.append(d); f(c.getContext("2d")); };
    const side = st.side === "R" ? 1 : -1, hem = ["ICA", "M1", "M2", "M3", "ACA"].includes(st.tab), cf = e.cf, aff = st.tab === "M2" || st.tab === "M3" ? 0.5 : 1;
    const skull = (g, bg) => { g.fillStyle = "#000"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "#d8d8d8"; g.lineWidth = 9; g.beginPath(); g.ellipse(150, 150, 118, 136, 0, 0, 7); g.stroke(); g.fillStyle = bg; g.beginPath(); g.ellipse(150, 150, 110, 128, 0, 0, 7); g.fill(); };
    mk("Non-contrast CT (schematic)", (g) => { skull(g, "#8d8d8d"); g.fillStyle = "#3b3b3b"; g.beginPath(); g.ellipse(124, 150, 12, 30, 0.1, 0, 7); g.ellipse(176, 150, 12, 30, -0.1, 0, 7); g.fill();
      if (hem) { const x = 150 + side * -62, w = 20 + 36 * cf * aff, hgt = 30 + 54 * cf * aff; g.fillStyle = `rgba(55,55,55,${0.25 + 0.55 * cf})`; g.beginPath(); g.ellipse(150 - side * 62, 150, w, hgt, 0, 0, 7); g.fill(); void x; if (st.tab === "M1" && !st.removed) { g.fillStyle = "#f2f2f2"; g.beginPath(); g.arc(150 - side * 36, 160, 4, 0, 7); g.fill(); } }
      g.fillStyle = "#e8e8e8"; g.font = "600 13px system-ui"; g.fillText("R", 10, 20); g.fillText("L", 280, 20); });
    mk("CT angiography (schematic)", (g) => { g.fillStyle = "#050a10"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "#e8e8e8"; g.lineWidth = 6; g.lineCap = "round";
      const line = (a, b, off) => { g.strokeStyle = off ? "rgba(255,90,90,.9)" : "#e8e8e8"; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
      const R = st.tab !== "BA" && st.side === "R", Lc = st.tab !== "BA" && st.side === "L"; line([150, 280], [150, 215], false); line([150, 215], [110, 175], false); line([150, 215], [190, 175], false);
      const occ = (cond) => (cond && !st.removed ? "x" : false);
      line([110, 175], [60, 150], occ(R) === "x" && ["ICA", "M1"].includes(st.tab)); line([190, 175], [240, 150], occ(Lc) === "x" && ["ICA", "M1"].includes(st.tab));
      line([60, 150], [30, 100], false); line([60, 150], [32, 190], false); line([240, 150], [270, 100], false); line([240, 150], [268, 190], false);
      line([110, 175], [130, 120], false); line([190, 175], [170, 120], false); line([110, 175], [190, 175], false);
      g.fillStyle = "#ffd166"; g.font = "600 13px system-ui"; g.fillText(st.removed ? "recanalised" : "filling defect: " + site().label, 10, 290); g.fillStyle = "#e8e8e8"; g.fillText("R", 10, 20); g.fillText("L", 280, 20); });
    mk("CT perfusion (schematic)", (g) => { skull(g, "#10222f"); g.save(); g.beginPath(); g.ellipse(150, 150, 110, 128, 0, 0, 7); g.clip(); if (hem || st.tab === "PCA") { const cx = 150 - side * 62, rr = 44 * aff + 20; const gr = g.createRadialGradient(cx, 150, 5, cx, 150, rr + 24); gr.addColorStop(0, "rgba(40,90,255,.95)"); gr.addColorStop(Math.max(0.05, Math.min(0.9, 0.2 + 0.6 * cf)), "rgba(40,90,255,.7)"); gr.addColorStop(Math.max(0.1, Math.min(0.95, 0.35 + 0.6 * cf)), "rgba(60,220,120,.6)"); gr.addColorStop(1, "rgba(60,220,120,0)"); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, 150, (rr + 24) * 0.9, (rr + 30), 0, 0, 7); g.fill(); }
      g.restore(); g.fillStyle = "#e8e8e8"; g.font = "600 12px system-ui"; g.fillText("blue = core · green = penumbra (Tmax)", 8, 290); g.fillText("R", 10, 20); g.fillText("L", 280, 20); });
    void asp;
  }

  const lab = {
    id: "stroke", name: "Stroke Lab", tag: "Acute ischaemic stroke", icon: "🧠",
    tabs: TABS.map((k) => ({ id: k, label: SITES[k].label, sub: SITES[k].sub })),
    get tab() { return st.tab; },
    opts: () => [
      !SITES[st.tab].noSide && { id: "side", label: "Side of occlusion", cur: st.side, choices: [["R", "Right"], ["L", "Left"]] },
      st.tab === "M2" && { id: "div", label: "Division", cur: st.div, choices: [["sup", "Superior"], ["inf", "Inferior"]] },
      { id: "coll", label: "Collateral circulation", cur: st.coll, choices: [["poor", "Poor"], ["mod", "Moderate"], ["good", "Good"]] },
    ].filter(Boolean),
    slider: () => ({ id: "t", label: st.rAt != null ? "Reperfused at (hours from onset)" : "Time from onset to reperfusion (hours)", min: 0.5, max: 24, step: 0.5, v: st.rAt != null ? st.rAt : st.t, locked: st.rAt != null, unit: " h" }),
    actions: () => [{ id: "lysis", label: "IV THROMBOLYSIS", hint: "Dissolves clot chemically. Often only partial for big clots.", off: st.removed || st.lysed }, { id: "reset", label: "RESET CLOT", hint: "Put the clot back and try another approach.", off: false }],
    dragHint: "Touch the clot and drag it out of the vessel (thrombectomy).",
    views: [{ id: "lat", label: "Lateral", f: () => ({ ry: -1.5708 * (st.tab === "BA" ? 1 : sx()), rx: 0.05, d: 4.2, tx: 0, ty: -0.1 }) }, { id: "base", label: "Base", f: () => ({ ry: 0, rx: -1.45, d: 4.3, tx: 0, ty: -0.45 }) }, { id: "front", label: "Front", f: () => ({ ry: 0, rx: 0.05, d: 4.6, tx: 0, ty: -0.1 }) }, { id: "top", label: "Top", f: () => ({ ry: 3.1416, rx: 1.45, d: 4.4, tx: 0, ty: 0 }) }],
    legend: [["#d8a9ae", "Healthy"], ["#ffb347", "At risk (penumbra)"], ["#5b1230", "Infarcted core"], ["#8fe8b0", "Salvaged"]],
    setTab, setOpt, setT, act, build, info, obs, clin, st,
    ghost: (on) => { st.ghost = on; },
    debug: () => ({ clot, vessels, tis, st }),
    tabLabel: () => site().label,
  };
  build();
  return lab;
}
