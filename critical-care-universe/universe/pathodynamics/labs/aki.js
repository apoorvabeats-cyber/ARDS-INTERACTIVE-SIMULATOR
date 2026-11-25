/* KIDNEY INJURY LAB (acute kidney injury) on the PATHODYNAMICS engine.
   Two linked models: the kidney (artery, pyramids, pelvis, ureter, bladder) and one nephron (glomerulus, proximal tubule, loop, distal tubule, collecting duct).
   Pick the cause, set the time, then correct it and watch filtration, creatinine, potassium and urine output respond.
   Teaching model: reversible functional loss turns into structural loss the longer the cause persists.
   Content aligned to KDIGO 2012 (the current final AKI guideline; the 2026 update was still in public review as of Nov 2026). All numbers are illustrative, not patient data. */
import { THREE, C } from "../stage.js?v=20261124b";
import { clotKit, vessels, halo, clamp } from "./common.js?v=20261124b";
import { kidney as loadKidney } from "../anatomy.js?v=20261124b";

const T = {
  PRE: { label: "Prerenal", sub: "Hypoperfusion", sev: 0.55, irr0: 0, irrMax: 0.8, tau: 2.5, inj: { glom: 0.15, pct: 0.12 },
    anat: "The kidney itself is structurally normal. The renal artery, afferent arteriole and glomerulus are intact, but the pressure and flow reaching the glomerulus are too low.",
    patho: "Low renal perfusion (hypovolaemia, low cardiac output, vasodilatory shock, hepatorenal physiology) lowers glomerular filtration. The tubules respond by reabsorbing sodium and water avidly: concentrated urine with low urinary sodium. Prolonged hypoperfusion turns this reversible state into ischaemic tubular injury.",
    interv: "Treat the cause of the low perfusion: volume for hypovolaemia, cardiac support for low output, vasopressors for vasodilatory shock, and stop drugs that lower glomerular pressure (NSAIDs, ACE inhibitors, ARBs) or damage the tubule. Giving fluid to a failing heart makes things worse." },
  ATN: { label: "ATN", sub: "Acute tubular necrosis", sev: 0.85, irr0: 0.3, irrMax: 0.5, tau: 3, inj: { pct: 1, loop: 0.8, dct: 0.3, glom: 0.1, cd: 0.1 },
    anat: "In acute tubular necrosis the proximal tubule cells and the thick ascending limb, which work hardest and sit in the least oxygenated zone, are injured. Dead cells shed into the lumen and form granular (muddy brown) casts.",
    patho: "Ischaemia (shock, sepsis) or toxins (aminoglycosides, contrast, rhabdomyolysis) injure tubular cells. Casts obstruct the lumen, filtrate leaks back through the damaged wall, and tubuloglomerular feedback shuts down the nephron's filtration. Recovery takes days to weeks: an oliguric phase, sometimes a polyuric phase, then recovery.",
    interv: "No drug reverses established ATN. Remove the insult, restore perfusion, avoid further nephrotoxins, manage volume, potassium and acid–base, adjust drug doses and start renal replacement therapy when it is indicated." },
  AIN: { label: "AIN", sub: "Interstitial nephritis", sev: 0.6, irr0: 0.1, irrMax: 0.7, tau: 6, inj: { pct: 0.6, loop: 0.6, dct: 0.6, cd: 0.4 }, cells: true,
    anat: "In acute interstitial nephritis the space around the tubules fills with inflammatory cells (lymphocytes, plasma cells, eosinophils) and oedema, while the glomeruli look normal.",
    patho: "A hypersensitivity reaction, most often to drugs (penicillins, cephalosporins, proton-pump inhibitors, NSAIDs, checkpoint inhibitors), inflames the interstitium and tubules. The classic triad of fever, rash and eosinophilia is present in a minority of patients. Untreated, inflammation turns into interstitial fibrosis.",
    interv: "Stop the culprit drug as early as possible. Corticosteroids are commonly used when there is no recovery within several days of stopping the drug, especially when the biopsy shows an intense infiltrate; evidence comes from observational data." },
  GN: { label: "GN", sub: "Glomerulonephritis", sev: 0.7, irr0: 0.15, irrMax: 0.7, tau: 6, inj: { glom: 1, pct: 0.15, loop: 0.1 }, crescent: true,
    anat: "In rapidly progressive glomerulonephritis the glomerular capillaries are inflamed and ruptured, and cells fill Bowman's space in a crescent shape. Blood and protein leak into the filtrate.",
    patho: "Immune injury of the glomerulus (ANCA vasculitis, anti-GBM disease, immune-complex disease, post-infectious GN) causes haematuria with dysmorphic red cells, red-cell casts, proteinuria, hypertension and salt retention. Filtration falls quickly as crescents form.",
    interv: "A nephrology emergency: early biopsy and serology (ANCA, anti-GBM, ANA, complement), then immunosuppression (high-dose corticosteroids with cyclophosphamide or rituximab); plasma exchange in selected cases such as anti-GBM disease or severe ANCA vasculitis. Early treatment before irreversible crescents form gives the best recovery." },
  OBS: { label: "Obstruction", sub: "Postrenal: stone, hydronephrosis", sev: 0.75, irr0: 0, irrMax: 0.8, tau: 7, inj: { pct: 0.4, loop: 0.4, dct: 0.4, cd: 0.5, glom: 0.2 }, dilate: true,
    anat: "A stone (or tumour, clot, enlarged prostate) blocks the ureter or bladder outlet. Urine backs up: the ureter and renal pelvis dilate (hydronephrosis) and the pyramids and cortex are compressed.",
    patho: "Back-pressure is transmitted up the tubules to Bowman's space, which opposes filtration. Early on the effect is functional; with time the cortex thins and nephrons are lost. AKI occurs when both kidneys, or a solitary kidney, are obstructed. After relief there can be a large post-obstructive diuresis.",
    interv: "Relieve the obstruction: ureteric stent or percutaneous nephrostomy to decompress the system urgently, particularly with infection (obstructed infected kidney is an emergency), then definitive stone removal (ureteroscopy, lithotripsy). Watch the diuresis and electrolytes afterwards." },
  RINF: { label: "Renal infarction", sub: "Embolus or thrombosis", sev: 0.9, irr0: 0.05, irrMax: 0.9, tau: 1.0, inj: { glom: 0.5, pct: 0.45, loop: 0.3, dct: 0.1 }, art: true,
    anat: "The renal artery arises from the aorta and divides into segmental arteries. An embolus (from the heart in atrial fibrillation or endocarditis, or from the aorta), an in-situ thrombosis or a dissection can block it, and a wedge of kidney supplied by the blocked branch dies.",
    patho: "A sudden block cuts off blood flow to the kidney. The kidney tolerates ischaemia only for hours. Patients have sudden flank pain, raised LDH and haematuria. If both kidneys or a solitary kidney are involved, AKI follows. The kidney releases renin, and hypertension can result.",
    interv: "Anticoagulation for embolus or thrombosis, a search for the source (echo, rhythm monitoring), and revascularisation (catheter thrombectomy or thrombolysis, angioplasty and stenting) in selected patients; benefit is greatest the earlier it is done and is uncertain after many hours. Treat dissection or the underlying cause." },
  RAS: { label: "Renal artery stenosis", sub: "Atherosclerotic or fibromuscular", sev: 0.55, irr0: 0.35, irrMax: 0.9, tau: 3.0, inj: { glom: 0.3, pct: 0.3, loop: 0.2, dct: 0.1 }, art: true,
    anat: "A narrowing of the main renal artery, most often from atherosclerosis near the origin in older patients, or from fibromuscular dysplasia (a 'string of beads' pattern) in younger patients.",
    patho: "The kidney beyond the narrowing senses low pressure and releases renin: renovascular hypertension, and in bilateral disease, flash pulmonary oedema and AKI after an ACE inhibitor or ARB. Over time the kidney shrinks.",
    interv: "Treat the hypertension and the vascular risk (statin, antiplatelet, blood-pressure control); use ACE inhibitors or ARBs with caution, with close creatinine monitoring. Trials have not shown a clear benefit of stenting over medical therapy for most atherosclerotic stenosis. Revascularisation is reserved for selected patients, for example flash pulmonary oedema, resistant hypertension with progressive kidney loss, or fibromuscular dysplasia (angioplasty)." },
};
const isRen0 = (t) => t === "RINF" || t === "RAS";
const TABS = ["PRE", "ATN", "AIN", "GN", "OBS", "RINF", "RAS"], SEG = ["glom", "pct", "loop", "dct", "cd"];
const SC = { glom: 0xe0475a, pct: 0x27c9b0, loop: 0x4a8fe0, dct: 0x6fd06f, cd: 0xe8b04a };
const CAUSE = { hypo: "Hypovolaemia", lowco: "Low cardiac output", vaso: "Vasodilatory shock" };

export default function create(S, ui) {
  const isRen = () => isRen0(st.tab);
  const st = { tab: "ATN", t: 3, cause: "hypo", fixed: false, fAt: null, rec: 0, drug: false, steroid: false, immuno: false, pex: false, rrt: false, relief: 0, hint: "", ghost: false, wrong: "" };
  const cur = () => T[st.tab];
  let M = {}, kit = null, segM = {}, segV = {}, flows = {}, cells = [], casts = [], rbc = [], accT = 0, kmesh = null, pelvis = null, ureter = null, KD = null;
  loadKidney(1.96, Math.PI / 2).then((k) => { KD = k; if (M.kg) build(); }).catch(() => {});   /* real kidney (Human Reference Atlas); the simple shape stays if it cannot load */

  const bean = (r, k) => { const g = new THREE.SphereGeometry(1, 56, 42), p = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let x = v.x * r[0], y = v.y * r[1], z = v.z * r[2]; if (v.x > 0.45) { const n = (v.x - 0.45) / 0.55, w = Math.max(0, 1 - (v.y / 0.42) ** 2); x -= n * w * 0.5 * r[0]; } p.setXYZ(i, x, y, z); } g.computeVertexNormals(); return g; };
  function build() {
    S.clear(); M = {}; segM = {}; segV = {}; flows = {}; cells = []; casts = []; rbc = [];
    const grp = S.add(new THREE.Group()); M.grp = grp;
    /* ----- kidney (left of scene) ----- */
    const kg = new THREE.Group(); kg.position.set(-2.5, 0, 0); grp.add(kg); M.kg = kg;
    const cort = S.tissue(KD ? KD.cortex.clone() : bean([0.66, 0.98, 0.42]), KD ? 0xcc7064 : 0xb8605a, (P) => ({ tag: "cx", rank: 0.5, h: 0, sh: 0.9 + 0.1 * Math.sin(14 * P.x) * Math.sin(12 * P.y) * Math.sin(10 * P.z) }), { transparent: true, opacity: KD ? 0.72 : 0.55, depthWrite: false }); cort.mesh.userData.hemi = 1; cort.mesh.renderOrder = 3; kg.add(cort.mesh); M.cort = cort;
    if (KD) { const py = new THREE.Mesh(KD.pyramids.clone(), S.mat(0x8f3f48)); kg.add(py); M.py = py; }
    else for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, cg = new THREE.ConeGeometry(0.15, 0.36, 14); cg.translate(0, 0.18, 0); const m = new THREE.Mesh(cg, S.mat(0x8f3f48)); const rx = 0.28 * Math.cos(a), ry = 0.5 * Math.sin(a); m.position.set(rx, ry, 0); m.rotation.z = Math.atan2(ry, rx) - Math.PI / 2 - Math.PI; m.scale.set(1, 1, 1); kg.add(m); }
    if (KD) { const pg = KD.pelvis.clone(); pg.translate(-KD.pelvisCentre.x, -KD.pelvisCentre.y, -KD.pelvisCentre.z); pelvis = new THREE.Mesh(pg, S.mat(0xf0c46a, { transparent: true, opacity: 0.85 })); pelvis.position.copy(KD.pelvisCentre); }
    else { pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 16), S.mat(0xf0c46a, { transparent: true, opacity: 0.85 })); pelvis.position.set(0.22, 0, 0); }
    kg.add(pelvis);
    ureter = S.tube(KD ? [[0.3, -0.3, 0.04], [0.42, -0.7, 0.05], [0.5, -1.1, 0.06], [0.46, -1.55, 0.08]] : [[0.3, -0.05, 0], [0.5, -0.5, 0.02], [0.58, -1.05, 0.05], [0.5, -1.55, 0.08]], 0.04, 0xf0c46a, { seg: 30 }); kg.add(ureter); M.ur = ureter;
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), S.mat(0xe8d09a, { transparent: true, opacity: 0.5 })); bl.position.set(0.45, -1.8, 0.08); kg.add(bl);
    const av = vessels(S, kg, [["RA", KD ? [[1.5, 0.35, 0.0], [1.1, 0.3, 0.02], [0.7, 0.2, 0.03], [0.3, 0.14, 0.04]] : [[1.5, 0.35, 0.0], [1.0, 0.3, 0.02], [0.6, 0.2, 0.02], [0.3, 0.12, 0.0]], 0.055]], 0xff5a46, { dens: 14 }); segV.RA = av.T.RA; flows.RA = av.F.RA; halo(S, kg, av.T.RA, "RA");
    kg.add(S.tube(KD ? [[1.5, -0.1, -0.05], [1.1, -0.12, -0.05], [0.7, -0.08, -0.02], [0.3, -0.04, 0]] : [[1.5, -0.1, -0.05], [1.0, -0.12, -0.05], [0.5, -0.1, -0.02], [0.3, -0.05, 0]], 0.06, 0x5b78e6));
    flows.UR = S.flow(ureter.userData.curve, 10, 0xffe08a, { speed: 0.12, off: -2.5 }); flows.UR.rate = 0;
    kit = clotKit(S, kg, ui, { size: 0.085, ring: 0.15, thr: 0.4, color: st.tab === "OBS" ? 0xe8d9a0 : 0x7a1530, onRemoved: () => { st.relief = 1; setFixed("clot"); ui.refresh(st.tab === "OBS" ? "Stone removed. Obstruction relieved; urine flows." : "Clot retrieved. Renal artery open; blood flow restored."); } });
    kit.mesh.visible = false; kit.ring.visible = false; kit.dead = true;
    /* ----- nephron (right of scene) ----- */
    const ng = new THREE.Group(); ng.position.set(1.5, 0, 0); grp.add(ng); M.ng = ng;
    const band = (y0, y1, hex, op) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, y1 - y0), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false })); m.position.set(0, (y0 + y1) / 2, -0.3); ng.add(m); };
    band(0.0, 1.15, 0xb8605a, 0.13); band(-1.15, 0.0, 0x8f3f48, 0.16);
    const paths = {
      pct: [[-0.15, 0.45, 0], [0.0, 0.55, 0.1], [0.1, 0.35, -0.1], [0.25, 0.5, 0.1], [0.35, 0.3, 0]],
      loop: [[0.35, 0.3, 0], [0.4, -0.2, 0], [0.45, -0.8, 0], [0.6, -0.85, 0], [0.65, -0.2, 0], [0.65, 0.3, 0]],
      dct: [[0.65, 0.3, 0], [0.5, 0.6, 0.1], [0.2, 0.75, 0]],
      cd: [[0.2, 0.75, 0], [0.1, 0.3, 0], [0.1, -0.5, 0], [0.1, -1.05, 0]],
    }, rad = { pct: 0.05, loop: 0.036, dct: 0.04, cd: 0.065 };
    SEG.slice(1).forEach((s) => { const m = S.tube(paths[s], rad[s], SC[s], { seg: 60, emis: 0x0a1a1a }); m.userData.seg = s; ng.add(m); segM[s] = m; });
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 18), S.mat(SC.glom, { emissive: 0x401010 })); gl.position.set(-0.42, 0.62, 0); ng.add(gl); segM.glom = gl;
    const bw = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 18), new THREE.MeshPhongMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.18, depthWrite: false })); bw.position.copy(gl.position); ng.add(bw); M.bw = bw;
    const cres = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 28, Math.PI * 1.3), S.mat(0xf2e0a0)); cres.position.copy(gl.position); cres.rotation.z = 0.8; cres.visible = false; ng.add(cres); M.cres = cres;
    const aff = vessels(S, ng, [["aff", [[-1.1, 0.95, 0], [-0.75, 0.82, 0.04], [-0.5, 0.7, 0.0]], 0.032], ["eff", [[-0.4, 0.46, 0], [-0.7, 0.45, 0.0], [-1.1, 0.4, 0.05]], 0.024]], 0xff5a46, { dens: 14, off: 1.5 });
    segV.aff = aff.T.aff; segV.eff = aff.T.eff; flows.aff = aff.F.aff; flows.eff = aff.F.eff;
    const all = [].concat(...["pct", "loop", "dct", "cd"].map((s) => new THREE.CatmullRomCurve3(paths[s].map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.5).getSpacedPoints(30)));
    flows.fil = S.flow(new THREE.CatmullRomCurve3(all, false, "centripetal", 0.5), 40, 0x9fe8ff, { speed: 0.06, off: 1.5 });
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), S.mat(0x8a5f45)); const s = ["pct", "loop"][i % 2], c = new THREE.CatmullRomCurve3(paths[s].map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.5); m.position.copy(c.getPointAt(0.1 + 0.8 * ((i * 0.37) % 1))); ng.add(m); casts.push(m); }
    for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a })); const s = SEG[1 + (i % 4)], c = new THREE.CatmullRomCurve3((paths[s] || paths.pct).map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.5), q = c.getPointAt(((i * 0.173) % 1)); m.position.set(q.x + 0.09 * Math.sin(i * 3), q.y + 0.09 * Math.cos(i * 5), q.z + 0.04); ng.add(m); cells.push(m); }
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a3a })); const c = new THREE.CatmullRomCurve3(paths.pct.map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.5), q = c.getPointAt((i * 0.083) % 1); m.position.copy(q); ng.add(m); rbc.push(m); }
    M.lab = S.label("NEPHRON", [1.5, 1.35, 0], "#27e0b0"); grp.add(M.lab); M.lab2 = S.label("KIDNEY", [-2.5, 1.45, 0], "#ff9aa6"); grp.add(M.lab2);
    M.inj = {}; SEG.forEach((s) => (M.inj[s] = 0));
    reset(); 
  }
  function reset() {
    Object.assign(st, { t: 3, fixed: false, fAt: null, rec: 0, drug: false, steroid: false, immuno: false, pex: false, rrt: false, relief: 0, wrong: "" });
    const c = cur(); kit.mesh.visible = false; kit.ring.visible = false; kit.dead = true;
    if (c.art || c.dilate) { const cur2 = c.art ? segV.RA.userData.curve : ureter.userData.curve; kit.place(cur2, c.art ? 0.55 : 0.4); kit.dead = false; if (c.dilate) { kit.mesh.material.color.setHex(0xe8d9a0); } else kit.mesh.material.color.setHex(0x7a1530); }
    S.view({ ry: 0, rx: 0.1, d: 7.2, tx: -0.5, ty: 0.1, tz: 0 });
  }

  /* ---------- dynamics ---------- */
  const irr = () => { const c = cur(), f = st.fAt != null ? st.fAt : st.t; let v = clamp(c.irr0 + c.irrMax * (1 - Math.exp(-f / c.tau)), 0, 0.95); if (st.steroid && (st.tab === "AIN")) v *= 0.55; if (st.immuno && st.tab === "GN") v *= st.pex ? 0.4 : 0.55; if (st.tab === "OBS" && st.relief) v *= 0.9; return v; };
  const gfrFall = (t) => { const c = cur(); return 100 * (1 - 0.9 * c.sev * (1 - Math.exp(-t / 1.2))); };
  function gfr() {
    const g0 = gfrFall(st.fAt != null ? st.fAt : st.t); if (st.fAt == null) return g0;
    const target = 100 * (1 - 0.9 * cur().sev * irr()); return g0 + (target - g0) * st.rec;
  }
  function setFixed(kind) { if (st.fixed) return; st.fixed = true; st.fAt = st.t; st.rec = 0; st.fixKind = kind; }
  function injury(s) { const c = cur(), p = c.inj[s] || 0, tt = st.fAt != null ? st.fAt : st.t, grow = 1 - Math.exp(-tt / (c.tau * 0.5)); let v = p * grow; if (st.fAt != null) { v = v + (p * irr() / Math.max(0.2, 1 - (1 - 0.9) ) * 0.0 - v) * 0; const tgt = p * clamp(irr() * 1.1, 0, 1); v = v + (tgt - v) * st.rec; } return clamp(v, 0, 1); }
  function frame(dt) {
    const c = cur(); st.rec = st.fAt != null ? Math.min(1, st.rec + dt * 0.3) : 0; const g = gfr(), gf = clamp(g / 100, 0.03, 1);
    SEG.forEach((s) => { const target = injury(s); M.inj[s] += (target - M.inj[s]) * Math.min(1, dt * 3); const m = segM[s], inj = M.inj[s]; const base = C(SC[s]); const col = inj < 0.55 ? base.lerp(C(0xffb347), clamp(inj * 1.5, 0, 0.85)) : base.lerp(C(0xffb347), 0.85).lerp(C(0x5b1230), clamp((inj - 0.55) * 2.2, 0, 1)); if (st.fAt != null && st.rec > 0.5 && inj < 0.6 && c.inj[s]) col.lerp(C(0x8fe8b0), 0.35 * (st.rec - 0.5) * 2); m.material.color.copy(col);
      if (c.dilate && s !== "glom") { const dl = 1 + 0.7 * (1 - st.relief * st.rec) * (1 - Math.exp(-(st.fAt != null ? st.fAt : st.t) / 2)); m.scale.set(dl, 1, dl); } else if (s !== "glom") m.scale.set(1, 1, 1); });
    M.cres.visible = !!c.crescent && injury("glom") > 0.3; M.bw.scale.setScalar(c.dilate ? 1 + 0.3 * (1 - st.relief * st.rec) : 1);
    const perf = c.art ? (st.fixed ? 0.25 + 0.75 * st.rec : 0.15) : c.sev && st.tab === "PRE" ? (st.fixed ? 0.35 + 0.65 * st.rec : 0.35 * (1 - 0.5 * (1 - Math.exp(-st.t / 2)))) : 1 - 0.35 * (1 - gf);
    flows.aff.rate += (perf - flows.aff.rate) * Math.min(1, dt * 3); flows.eff.rate = flows.aff.rate * 0.8; flows.RA.rate = c.art ? (kit.dead ? 1 : st.fixed ? 0.3 + 0.7 * st.rec : 0.1) : 1; flows.RA.to = c.art && !st.fixed ? 0.55 : 1;
    flows.fil.rate += (clamp(gf, 0.05, 1) - flows.fil.rate) * Math.min(1, dt * 3); flows.UR.rate = c.dilate && !st.relief ? 0.04 : clamp(gf * 0.9, 0.05, 1);
    casts.forEach((m, i) => { m.visible = st.tab === "ATN" && M.inj.pct > 0.35 && i < Math.round(14 * M.inj.pct * (1 - (st.fixed ? 0.7 * st.rec : 0))); });
    cells.forEach((m, i) => { m.visible = !!c.cells && i < Math.round(26 * (st.fAt != null ? 1 - 0.7 * st.rec * (st.steroid ? 1 : 0.4) : clamp(st.t / 3, 0.2, 1))); });
    rbc.forEach((m, i) => { m.visible = st.tab === "GN" && i < Math.round(12 * clamp(M.inj.glom, 0, 1)); });
    const hyd = c.dilate ? (1 + 1.6 * (1 - st.relief * st.rec) * (1 - Math.exp(-(st.fAt != null ? st.fAt : st.t) / 2))) : 1; pelvis.scale.setScalar(hyd); { const us = c.dilate ? 1 + 0.9 * (hyd - 1) / 1.6 : 1; ureter.scale.set(us, 1, us); ureter.position.set(0.3 * (1 - us), 0, 0.03 * (1 - us)); }
    M.cort.paint((tag, rank, h, out) => { if (c.art || isRen()) out.lerp(C(0x6a3a5a), 0.45 * (st.fixed ? 1 - st.rec : 1)); else if (c.dilate) out.lerp(C(0xd8b090), 0.25 * (hyd - 1) / 1.6); });
    if (kit && !kit.dead) kit.frame(dt, 1); M.cort.mesh.material.opacity += ((st.ghost ? 0.15 : KD ? 0.72 : 0.55) - M.cort.mesh.material.opacity) * Math.min(1, dt * 5);
    const bad = c.art ? kit.dead ? 0 : 1 : 0; const vc = segV.RA.material.color; vc.setRGB(1 * (bad && !st.fixed ? 0.8 : 1), 0.35, 0.27);
    accT += dt;
  }
  S.hooks.push(frame);
  S.onGrab = (o) => { if (kit && !kit.dead) kit.grabbed(o); }; S.onDrag = (o, w) => { if (kit && !kit.dead) kit.drag(w); }; S.onDrop = () => { if (kit && !kit.dead) kit.drop(); };
  S.onTap = (o) => { if (!o || !o.userData.site) return; if (o.userData.site === "RA" && !isRen()) { setTab("RINF"); ui.refresh(); } };

  function setTab(k) { st.tab = k; build(); }
  function setOpt(id, v) { if (id === "cause") { st.cause = v; } else if (id === "ghost") st.ghost = v === "1"; }
  function setT(v) { if (st.fAt != null) return; st.t = v; }
  function act(id) {
    const c = cur(), msg = (m) => ui.refresh(m);
    if (id === "reset") { build(); return; }
    if (id === "rrt") { st.rrt = true; msg("Renal replacement therapy started. It supports potassium, acid–base and volume; it does not repair the kidney."); return; }
    if (st.tab === "PRE") {
      const ok = (id === "fluid" && st.cause === "hypo") || (id === "pressor" && st.cause === "vaso") || (id === "cardiac" && st.cause === "lowco");
      if (id === "stop") { st.drug = true; msg("Nephrotoxic / glomerular-pressure-lowering drugs held."); return; }
      if (ok) { setFixed(id); msg("Perfusion restored. Filtration recovering: the perfusion problem is corrected."); } else if (id === "fluid" || id === "pressor" || id === "cardiac") { st.wrong = id === "fluid" ? (st.cause === "lowco" ? "Fluid given to a failing heart: the lungs fill and the kidney does not improve." : "Fluid alone does not fix vasodilatory shock without enough vascular tone.") : id === "pressor" ? "Vasopressor does not correct a volume deficit." : "Inotrope does not correct a volume deficit."; msg(st.wrong); }
    } else if (st.tab === "ATN") { if (id === "stop" || id === "fluid") { setFixed("stop"); msg("Insult removed and perfusion restored. Tubular recovery takes days to weeks."); } }
    else if (st.tab === "AIN") { if (id === "stop") { setFixed("stop"); msg("Culprit drug stopped. Inflammation settles; recovery depends on how early."); } else if (id === "steroid") { st.steroid = true; msg("Corticosteroid started; recovery of function is usually faster."); } }
    else if (st.tab === "GN") { if (id === "immuno") { st.immuno = true; setFixed("immuno"); msg("Immunosuppression started. Inflammation controlled: recovery depends on how many glomeruli had crescents."); } else if (id === "pex") { st.pex = true; msg("Plasma exchange added for circulating antibody."); } }
    else if (st.tab === "OBS") { if (id === "djs" || id === "pcn") { st.relief = 1; setFixed(id); msg(id === "djs" ? "Ureteric stent placed. Obstruction relieved; urine drains." : "Nephrostomy placed. Obstruction relieved; urine drains."); } }
    else if (isRen()) { if (id === "angio") { st.relief = 1; kit.dead = true; kit.mesh.visible = false; kit.ring.visible = false; setFixed("angio"); msg("Angioplasty and stent: renal artery restored. Blood flow reaches the kidney again."); } else if (id === "hep") { st.drug = true; msg("Anticoagulation started to stop clot propagation."); } }
    void c;
  }

  function est() {
    const c = cur(), g = gfr(), cr = clamp(1 / Math.max(0.08, g / 100), 1, 12), crp = +(cr).toFixed(1), kdigo = cr >= 3 || st.rrt ? 3 : cr >= 2 ? 2 : cr >= 1.5 ? 1 : 0;
    const poly = st.tab === "ATN" && st.fixed && st.rec > 0.3 && st.rec < 0.95, osm = poly ? 1.8 : st.tab === "OBS" && st.relief && st.rec < 1 ? 2.2 : null;
    let uo = clamp(0.1 + 1.3 * g / 100, 0.05, 1.4); if (st.tab === "OBS" && !st.relief) uo = 0.1 * (1 - 0.8 * (1 - Math.exp(-st.t / 2))) ; if (st.tab === "GN") uo *= 0.8; if (osm) uo = osm; if (isRen() && !st.fixed) uo = st.tab === "RAS" ? 0.35 : 0.05;
    const k = clamp(4.2 + 2.6 * Math.pow(1 - g / 100, 1.6) * (st.rrt ? 0.2 : 1), 4, 7.8), hco = clamp(24 - 12 * (1 - g / 100) * (st.rrt ? 0.3 : 1), 9, 24);
    const sed = { PRE: "bland / hyaline casts", ATN: "muddy-brown granular casts", AIN: "WBC casts, eosinophils", GN: "RBC casts, dysmorphic RBC", OBS: "bland; hydronephrosis on US", RINF: "bland or haematuria; no flow on Doppler", RAS: "bland; reduced flow on Doppler" }[st.tab];
    const fena = st.tab === "PRE" ? (st.fixed && st.rec > 0.8 ? "<1%" : "<1%") : st.tab === "ATN" ? ">2%" : st.tab === "AIN" ? "variable (1–3%)" : st.tab === "OBS" ? "variable" : st.tab === "GN" ? "<1% early" : "<1% early";
    return { g, cr: crp, kdigo, uo, k, hco, sed, fena, poly, ov: g < 35 && uo < 0.5 ? "risk of overload" : "controlled" };
  }
  function bodyMap() {
    const e = est(), c = cur(), map = {}, lv = (v) => (v > 0.7 ? 3 : v > 0.45 ? 2 : v > 0.2 ? 1 : 0), loss = 1 - e.g / 100; const both = e.g < 100;
    map["kidney-R"] = st.fixed && st.rec > 0.7 && e.g > 55 ? "rec" : lv(loss); map["kidney-L"] = c.art ? (kit.dead ? 0 : lv(loss)) : map["kidney-R"]; if (c.art && !kit.dead && isRen()) { map["kidney-R"] = lv(loss); }
    if (c.dilate) { map.bladder = st.relief ? 0 : 1; map["kidney-L"] = map["kidney-R"]; } if (e.k > 6) map.heart = e.k > 7 ? 3 : 2; if (loss > 0.55 && !st.rrt) { map["lung-R"] = 1; map["lung-L"] = 1; } if (e.k > 6.5) map.brain = 0; void both;
    return { map, marks: {} };
  }
  function ecgLeads(e) { const pk = clamp((e.k - 5.5) / 2.3, 0, 1); const L = (n, o) => Object.assign({ n, r: 1, st: 0, t: 0.35, q: 0 }, o); return [L("II", { t: 0.35 + 1.0 * pk }), L("V2", { t: 0.4 + 1.3 * pk, r: 1 - 0.3 * pk }), L("V4", { t: 0.35 + 1.1 * pk }), L("V5", { t: 0.35 + 0.9 * pk })]; }
  function obs() {
    const e = est(), c = cur(), bm = bodyMap(), flow = c.art ? (st.fixed ? "reopened" : kit.dead ? "—" : "blocked") : "—";
    const params = [
      { k: "GFR (illustrative)", v: Math.round(e.g) + " mL/min", tone: e.g < 30 ? "bad" : e.g < 60 ? "warn" : "ok" },
      { k: "Creatinine · KDIGO", v: e.cr.toFixed(1) + " × baseline · stage " + e.kdigo + (st.rrt ? " (on RRT)" : ""), tone: e.kdigo >= 2 ? "bad" : e.kdigo === 1 ? "warn" : "ok" },
      { k: "Urine output", v: e.poly ? "polyuric phase" : e.uo.toFixed(1) + " mL/kg/h", tone: e.uo < 0.5 ? "bad" : "ok" },
      { k: "Potassium", v: e.k.toFixed(1) + " mmol/L", tone: e.k > 6 ? "bad" : e.k > 5.2 ? "warn" : "ok" },
      { k: "Bicarbonate", v: Math.round(e.hco) + " mmol/L", tone: e.hco < 15 ? "bad" : e.hco < 20 ? "warn" : "ok" },
      { k: "Urine sediment", v: e.sed, tone: "info" },
      { k: "FeNa", v: e.fena, tone: "info" },
      { k: isRen() ? "Renal artery flow" : st.tab === "OBS" ? "Obstruction" : "Cause", v: isRen() ? flow : st.tab === "OBS" ? (st.relief ? "relieved" : "present") : st.tab === "PRE" ? CAUSE[st.cause] : st.fixed ? "removed" : "active", tone: st.fixed || st.relief ? "ok" : "warn" },
    ];
    let note;
    if (!st.fixed) note = "The cause is still active: filtration is falling" + (st.tab === "PRE" ? " (still reversible if perfusion is restored early; with time it becomes tubular injury)." : st.tab === "ATN" ? ", and the injured tubule cells are dying and plugging the lumen." : ".") + " Move the time slider, then correct the cause in step 3.";
    else if (e.g < 40) note = "The cause is corrected, but a lot of nephron function had already been lost, so filtration stays low. Recovery of structure takes longer than recovery of the cause.";
    else if (e.g < 75) note = "Partial recovery. Some tubules and glomeruli are scarred; keep avoiding nephrotoxins and follow the creatinine after discharge, because AKI raises the risk of CKD.";
    else note = "Early correction: filtration returns close to normal as the tubules recover." + (e.poly ? " The kidney is in its recovery (polyuric) phase: watch fluid and electrolytes." : "");
    if (st.wrong) note = st.wrong + " " + note;
    const o = { params, body: bm.map, marks: bm.marks, note }; if (e.k > 5.5) o.ecg = { leads: ecgLeads(e), h: 200, beat: 0.85 }; return o;
  }
  const info = () => { const c = cur(); return { anat: c.anat, patho: c.patho, interv: c.interv }; };
  function clin() {
    const e = est(), c = cur(), L = [];
    L.push(["Definition and stage (KDIGO)", "AKI: creatinine rise of 0.3 mg/dL or more within 48 h, or 1.5 times baseline within 7 days, or urine output below 0.5 mL/kg/h for 6 h. Stage 1: 1.5–1.9 × baseline or a rise of 0.3 mg/dL or more (urine output below 0.5 mL/kg/h for 6–12 h); stage 2: 2.0–2.9 × (below 0.5 mL/kg/h for 12 h or more); stage 3: 3 × or more, creatinine of 4.0 mg/dL or more, or renal replacement therapy (below 0.3 mL/kg/h for 24 h or more, or anuria for 12 h). Here: stage " + e.kdigo + " (creatinine " + e.cr.toFixed(1) + " × baseline)."]);
    L.push(["First questions", "Is it prerenal (volume, pressure), intrinsic (tubule, interstitium, glomerulus, vessel) or postrenal (obstruction)? Look at the history, drugs and contrast exposure, volume status, urine output, urinalysis, bladder scan and renal ultrasound."]);
    L.push(["Urine findings", "Sediment: " + e.sed + ". FeNa: " + e.fena + " (unreliable on diuretics: use FeUrea). Urine osmolality above about 500 mOsm/kg suggests a concentrating (prerenal) kidney; around 300 suggests tubular injury."]);
    L.push(["Imaging and tests", st.tab === "OBS" ? "Ultrasound shows a dilated pelvicalyceal system; non-contrast CT finds the stone." : isRen() ? "Doppler ultrasound or CT angiography shows the occlusion or stenosis and an infarcted kidney." : st.tab === "GN" ? "Serology (ANCA, anti-GBM, ANA, complement), urine protein-to-creatinine ratio; renal biopsy confirms the pattern." : "Ultrasound for size and obstruction; biopsy only when the cause is unclear and the result would change treatment."]);
    L.push(["General management", "Treat the cause; keep MAP at about 65 mmHg or higher in shock; give balanced crystalloids rather than excess saline when fluid is indicated; avoid nephrotoxins (NSAIDs, aminoglycosides, contrast when possible); review drug doses; do not use diuretics to treat AKI, only to manage overload; monitor potassium and acid–base."]);
    L.push(["Renal replacement therapy", "Start for refractory hyperkalaemia, severe acidosis, fluid overload not responding to diuretics, uraemic complications (pericarditis, encephalopathy) or dialysable toxins. Trials of earlier (accelerated) initiation in patients without urgent indications have not shown benefit."]);
    L.push(["After the episode", "Follow creatinine and blood pressure at 3 months: AKI raises the risk of CKD, cardiovascular events and recurrent AKI. Reference: KDIGO 2012 AKI guideline. The KDIGO 2026 AKI/AKD update (draft in public review, not yet final) proposes adding serum cystatin C and structural biomarkers to the definition. Follow your local protocol."]);
    void c; return { lines: L, draw: (el) => drawImaging(el, e) };
  }
  function drawImaging(el, e) {
    const mk = (title, f) => { const d = document.createElement("div"); d.className = "img"; const cv = document.createElement("canvas"); cv.width = 300; cv.height = 300; const t = document.createElement("small"); t.textContent = title; d.append(cv, t); el.append(d); f(cv.getContext("2d")); };
    mk("Renal ultrasound (schematic)", (g) => { g.fillStyle = "#101010"; g.fillRect(0, 0, 300, 300); const hyd = st.tab === "OBS" && !st.relief; g.fillStyle = st.tab === "ATN" || st.tab === "AIN" || st.tab === "GN" ? "#8a8a8a" : "#6c6c6c"; g.beginPath(); g.ellipse(150, 150, 70, 120, 0, 0, 7); g.fill(); g.fillStyle = "#3b3b3b"; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; g.beginPath(); g.ellipse(150 + 28 * Math.cos(a), 150 + 52 * Math.sin(a), 11, 16, a, 0, 7); g.fill(); }
      g.fillStyle = hyd ? "#050505" : "#c8c8c8"; g.beginPath(); g.ellipse(150, 150, hyd ? 40 : 14, hyd ? 70 : 22, 0, 0, 7); g.fill(); g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText(hyd ? "dilated pelvis (hydronephrosis)" : isRen() && !st.fixed ? (st.tab === "RAS" ? "reduced flow beyond the narrowing" : "no flow on Doppler") : "no hydronephrosis", 8, 292); });
    mk("Urine microscopy (schematic)", (g) => { g.fillStyle = "#e9eef0"; g.fillRect(0, 0, 300, 300); const rnd = (i) => (Math.sin(i * 91.7) * 0.5 + 0.5); const tag = st.tab;
      if (tag === "ATN") { g.fillStyle = "#8a6a45"; for (let i = 0; i < 5; i++) { g.beginPath(); g.roundRect(30 + rnd(i) * 160, 40 + i * 48, 90, 22, 10); g.fill(); } }
      else if (tag === "GN") { g.fillStyle = "#c04050"; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(rnd(i) * 280 + 10, rnd(i + 50) * 260 + 10, 5, 0, 7); g.fill(); } g.fillStyle = "#e07a86"; g.beginPath(); g.roundRect(80, 120, 130, 26, 8); g.fill(); }
      else if (tag === "AIN") { g.fillStyle = "#6a7ac0"; for (let i = 0; i < 20; i++) { g.beginPath(); g.arc(rnd(i) * 280 + 10, rnd(i + 20) * 260 + 10, 6, 0, 7); g.fill(); } g.fillStyle = "#ff8a60"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(rnd(i + 70) * 280 + 10, rnd(i + 90) * 260 + 10, 7, 0, 7); g.fill(); } }
      else { g.fillStyle = "#c8d0d6"; for (let i = 0; i < 3; i++) { g.beginPath(); g.roundRect(50 + i * 20, 60 + i * 70, 110, 20, 10); g.fill(); } }
      g.fillStyle = "#223"; g.font = "600 12px system-ui"; g.fillText(e.sed, 8, 292); });
    mk("Creatinine over time (illustrative)", (g) => { g.fillStyle = "#0a0f16"; g.fillRect(0, 0, 300, 300); g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.moveTo(26, 20); g.lineTo(26, 270); g.lineTo(290, 270); g.stroke(); g.strokeStyle = "#ff8a8a"; g.lineWidth = 2.5; g.beginPath();
      const c = cur(), f = st.fAt, target = 100 * (1 - 0.9 * c.sev * irr()); for (let x = 0; x <= 260; x++) { const d = (x / 260) * 21; let G; if (f == null || d <= f) G = gfrFall(d); else { const g0 = gfrFall(f); G = g0 + (target - g0) * (1 - Math.exp(-(d - f) / 4)); } const cr = clamp(100 / Math.max(8, G), 1, 12), y = 270 - (cr - 1) / 11 * 240; x ? g.lineTo(26 + x, y) : g.moveTo(26 + x, y); } g.stroke();
      if (f != null) { g.strokeStyle = "#3dff9a"; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(26 + f / 21 * 260, 20); g.lineTo(26 + f / 21 * 260, 270); g.stroke(); g.setLineDash([]); g.fillStyle = "#3dff9a"; g.font = "600 11px system-ui"; g.fillText("cause corrected", 30 + f / 21 * 260 - 20 > 200 ? 160 : 32 + f / 21 * 260, 34); }
      g.fillStyle = "#e8e8e8"; g.font = "600 11px system-ui"; g.fillText("0", 26, 284); g.fillText("21 days", 244, 284); g.fillText("creatinine × baseline", 34, 16); });
  }

  const lab = {
    id: "aki", name: "Kidney Injury Lab", tag: "Acute kidney injury", icon: "🫘",
    tabs: TABS.map((k) => ({ id: k, label: T[k].label, sub: T[k].sub })), get tab() { return st.tab; },
    credit: "Kidney: HuBMAP Human Reference Atlas (Browne & Schlehlein), CC BY 4.0. Adapted for teaching.",
    selectHint: "Pick the cause. Use the KIDNEY and NEPHRON views to see the organ and one nephron.",
    opts: () => [st.tab === "PRE" && { id: "cause", label: "Cause of low perfusion", cur: st.cause, choices: [["hypo", "Hypovolaemia"], ["lowco", "Low cardiac output"], ["vaso", "Vasodilatory shock"]] }].filter(Boolean),
    slider: () => ({ id: "t", label: st.fAt != null ? "Corrected at (days from onset)" : "Days from onset to correction", min: 0, max: 14, step: 0.5, v: st.fAt != null ? st.fAt : st.t, locked: st.fAt != null, unit: " d" }),
    actions: () => {
      const A = { PRE: [{ id: "fluid", label: "IV FLUID", hint: "Balanced crystalloid." }, { id: "pressor", label: "VASOPRESSOR", hint: "Restore perfusion pressure." }, { id: "cardiac", label: "CARDIAC SUPPORT", hint: "Inotrope / unload the heart." }, { id: "stop", label: "HOLD NEPHROTOXINS", hint: "NSAID, ACEi/ARB, diuretics." }],
        ATN: [{ id: "stop", label: "REMOVE INSULT", hint: "Restore perfusion, stop toxins." }],
        AIN: [{ id: "stop", label: "STOP THE DRUG", hint: "Withdraw the culprit." }, { id: "steroid", label: "STEROID", hint: "If no early recovery." }],
        GN: [{ id: "immuno", label: "IMMUNOSUPPRESSION", hint: "Steroid + cyclophosphamide / rituximab." }, { id: "pex", label: "PLASMA EXCHANGE", hint: "Selected cases." }],
        OBS: [{ id: "djs", label: "URETERIC STENT", hint: "Decompress from below." }, { id: "pcn", label: "NEPHROSTOMY", hint: "Decompress from the flank." }],
        RINF: [{ id: "hep", label: "ANTICOAGULATE", hint: "Stop clot growth." }, { id: "angio", label: "THROMBECTOMY / STENT", hint: "Reopen the artery." }], RAS: [{ id: "hep", label: "BP + RISK CONTROL", hint: "Medical therapy first." }, { id: "angio", label: "ANGIOPLASTY + STENT", hint: "Selected patients." }] }[st.tab];
      return A.map((a) => Object.assign({ off: (a.id === "steroid" && st.steroid) || (a.id === "pex" && (st.pex || !st.immuno)) || (st.fixed && ["stop", "fluid", "pressor", "cardiac", "immuno", "djs", "pcn", "angio"].includes(a.id)) }, a)).concat([{ id: "rrt", label: "DIALYSIS (RRT)", hint: "Support: K⁺, acid, volume.", off: st.rrt }, { id: "reset", label: "RESET", hint: "Start again.", off: false }]);
    },
    dragHint: "In Obstruction: drag the stone out of the ureter. In Renal artery: drag the clot out of the artery. Otherwise use the treatment buttons.",
    views: [{ id: "both", label: "Both", f: () => ({ ry: 0, rx: 0.1, d: 7.2, tx: -0.5, ty: 0.1 }) }, { id: "kid", label: "Kidney", f: () => ({ ry: 0, rx: 0.1, d: 5.0, tx: -2.5, ty: -0.5 }) }, { id: "neph", label: "Nephron", f: () => ({ ry: 0, rx: 0.05, d: 4.2, tx: 1.5, ty: 0.05 }) }, { id: "side", label: "Side", f: () => ({ ry: 0.9, rx: 0.1, d: 6.2, tx: -0.3, ty: 0.1 }) }],
    legend: [["#27c9b0", "Healthy tubule"], ["#ffb347", "Injured"], ["#5b1230", "Necrotic / lost"], ["#8fe8b0", "Recovering"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ kit, st }), tabLabel: () => cur().label,
  };
  build();
  return lab;
}
