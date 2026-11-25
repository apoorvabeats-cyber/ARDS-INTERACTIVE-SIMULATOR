/* ACUTE LIVER FAILURE LAB on the PATHODYNAMICS engine.
   Three linked 3D models: the whole liver (necrosis spreading across the organ), one hepatic lobule (zones 1 to 3 dying from the central vein outwards) and the brain
   (ammonia reaches it, the brain swells). Causes: paracetamol, viral hepatitis, ischaemic hepatitis and drug-induced injury.
   Interactions: tissue injury progression with time, N-acetylcysteine, removing the cause, early CRRT for ammonia, hypertonic saline, transplant.
   Content aligned to the ACG 2023 acute liver failure guideline (intravenous NAC in paracetamol ALF and suggested in non-paracetamol ALF, early CRRT for hyperammonaemia
   with grade 2 or higher encephalopathy, routine ICP monitoring no longer recommended, early transplant-centre contact and King's College or MELD prognostication) and standard practice for the rest.
   Checked Nov 2026 against published summaries. All numbers are illustrative, not patient data. Every view is 3D. */
import { THREE, C, smooth } from "../stage.js?v=20261126r";
import { clamp } from "./common.js?v=20261126r";
import { seg, ball, loadLiver, ellip, rate, V3, rng, CREDIT_BP3D } from "./gi-kit.js?v=20261126r";
import { organ } from "../anatomy.js?v=20261126r";

const T = {
  PARA: { label: "Paracetamol", sub: "Zone 3 necrosis, NAPQI", unit: " h", min: 0, max: 96, v0: 14, fmax: 0.95, tau: 30, peak: 9000, eStop: 0.25, freq: 4.2, days: false, cause: "STOP EXPOSURE", causeHint: "No more drug; charcoal only if very early.",
    anat: "Blood enters the lobule at the portal triads in the six corners (portal vein, hepatic artery, bile duct), runs through the sinusoids between plates of hepatocytes and leaves by the central vein. Zone 1 hepatocytes sit next to the corners and zone 3 hepatocytes around the central vein, where oxygen is lowest and the drug-metabolising enzyme CYP2E1 is highest.",
    patho: "Paracetamol is normally conjugated safely. In overdose those pathways saturate, more is oxidised to the toxic metabolite NAPQI, glutathione runs out and NAPQI binds mitochondrial proteins. Zone 3 hepatocytes die first (centrilobular necrosis), then the damage spreads outwards. ALT and AST climb into the thousands, then the INR, lactate and ammonia rise as the liver loses function. Ammonia that is not cleared reaches the brain, where astrocytes swell.",
    interv: "N-acetylcysteine (intravenous) replenishes glutathione; it works best given early (within about 8 hours) but is also recommended once acute liver failure is established. Treat the complications: early CRRT for hyperammonaemia with grade 2 or higher encephalopathy, hypertonic saline for raised intracranial pressure, glucose and infection watch, and contact a transplant centre early. Emergency transplant for patients meeting King's College criteria." },
  VIRAL: { label: "Viral hepatitis", sub: "HEV · HAV · HBV · HSV", unit: " d", min: 0, max: 21, v0: 8, fmax: 0.92, tau: 6, peak: 3000, eStop: 0.15, freq: 1.7, days: true, cause: "SPECIFIC ANTIVIRAL", causeHint: "Tenofovir or entecavir (HBV), aciclovir (HSV).",
    anat: "The lobule is the same hexagonal unit, but here the portal triads and the zones are infiltrated by lymphocytes. Large patches of hepatocytes disappear together, so the whole organ shows confluent, bridging necrosis rather than a fine speckle.",
    patho: "The virus (hepatitis E and A are common in India, hepatitis B as a new infection or a reactivation, and HSV in pregnancy or immunosuppression) triggers a cytotoxic immune attack on infected hepatocytes. Loss of liver cells is rapid and confluent. ALT is high but often lower than in paracetamol injury, and jaundice comes first and encephalopathy follows days later. Hepatitis E carries a particularly high risk in pregnancy.",
    interv: "Supportive care in the ICU, a specific antiviral where one exists (nucleos(t)ide analogue for hepatitis B, aciclovir for HSV), intravenous NAC is suggested in early non-paracetamol failure, early CRRT and brain-protective measures, and early transplant referral because spontaneous recovery is less likely than with paracetamol." },
  ISCH: { label: "Ischaemic hepatitis", sub: "Shock liver", unit: " h", min: 0, max: 72, v0: 18, fmax: 0.7, tau: 10, peak: 8000, eStop: 0.9, freq: 5, days: false, cause: "RESTORE PERFUSION", causeHint: "Cardiac output, blood pressure, oxygen.",
    anat: "Liver cells around the central vein live at the end of the oxygen gradient, so they are the first to starve when blood flow or oxygen falls. The sinusoids are pale and sluggish; the portal triads still look normal.",
    patho: "Heart failure, septic or hypovolaemic shock or severe hypoxaemia lowers hepatic blood flow. Zone 3 hepatocytes die within hours: ALT, AST and LDH shoot up to the thousands, the INR rises, and then everything falls quickly once circulation is restored. It is a sign of how sick the circulation is, and the liver usually recovers if the patient does.",
    interv: "Treat the cause: restore cardiac output and perfusion pressure, correct hypoxaemia and stop shocked-liver toxins. There is no liver-specific drug; transplant is almost never the answer. Watch for hypoglycaemia and for the underlying illness that caused it." },
  DILI: { label: "Drug-induced", sub: "Anti-TB drugs and others", unit: " d", min: 0, max: 28, v0: 12, fmax: 0.9, tau: 9, peak: 1800, eStop: 0.5, freq: 2.6, days: true, cause: "STOP THE DRUG(S)", causeHint: "Stop every suspect drug at once.",
    anat: "A mixed pattern of hepatocyte death and inflammation across the lobule, often with a cholestatic component. The picture depends on the drug.",
    patho: "Idiosyncratic injury (a few patients react to a normal dose) from agents such as isoniazid, rifampicin and pyrazinamide, other antimicrobials, anti-epileptics, herbal and traditional remedies. Injury evolves over weeks and may continue after the drug is stopped. Once encephalopathy appears, transplant-free survival is poor.",
    interv: "Stop all suspected drugs at once; look for the culprit and do not rechallenge. NAC is suggested in early non-paracetamol failure. Support the failing organs, treat ammonia and brain swelling, and refer early to a transplant centre." },
};
const ORDER = ["PARA", "VIRAL", "ISCH", "DILI"];
const BR_POS = [2.35, 0.35, 0];

export default function create(S, ui) {
  const st = { tab: "PARA", t: 36, dose: 0.95, nacAt: null, stopAt: null, rec: 0, hs: 0, man: 0, crrt: 0, crrtOn: false, hsOn: false, manOn: false, intub: false, tx: false, ghost: false };
  const cur = () => T[st.tab];
  let M = {}, liver = null, zones = [], LG = null, BG = null, F = {}, cells = [], toxin = [], accT = 0;
  loadLiver({ c: [-1.95, 0.15, 0], r: [1.2, 0.72, 0.5] }).then((g) => { LG = g; if (M.grp) build(); }).catch(() => {});
  organ("brain", { frontZ: 1, fit: { c: [0, 0, 0], r: [0.62, 0.5, 0.7] } }).then((g) => { BG = g; if (M.grp) build(); }).catch(() => {});   /* real brain (BodyParts3D) */

  const hex = (R) => { const p = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; p.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R)); } return p; };
  function hexRing(Ro, Ri, h) { const sh = new THREE.Shape(hex(Ro)); sh.holes.push(new THREE.Path(hex(Ri).reverse())); const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0); g.computeVertexNormals(); return g; }
  const noise = (P, f) => 0.5 + 0.5 * (0.6 * Math.sin(f * P.x * 2.1 + 1.3) * Math.sin(f * P.y * 2.7 + 0.4) + 0.4 * Math.sin(f * P.z * 3.3 + P.x * f * 1.5 + 2.2));

  function build() {
    S.clear(); M = {}; zones = []; F = {}; cells = []; toxin = [];
    const grp = S.add(new THREE.Group()); M.grp = grp; const fq = cur().freq;
    /* the whole liver */
    liver = S.tissue(LG ? LG.clone() : ellip(1.2, 0.72, 0.5), 0xb4594b, (P) => ({ tag: "L", rank: noise(P, fq), h: 0.5, sh: 0.93 + 0.07 * Math.sin(18 * P.x) * Math.sin(14 * P.y) }), { shininess: 30, transparent: true, opacity: 0.9 });
    if (!LG) liver.mesh.position.set(-1.95, 0.15, 0); liver.mesh.userData.hemi = 1; grp.add(liver.mesh);
    /* one lobule: three hexagonal zones, central vein, six portal triads, sinusoids */
    const lob = new THREE.Group(); lob.position.set(0.1, -0.05, 0); lob.rotation.x = 0.5; lob.scale.setScalar(1.12); grp.add(lob); M.lob = lob;
    [[0.95, 0.68, 0xd9928a], [0.68, 0.4, 0xc7766f], [0.4, 0.1, 0xb4605a]].forEach(([Ro, Ri, hexc], i) => { const m = new THREE.Mesh(hexRing(Ro, Ri, 0.5), new THREE.MeshPhongMaterial({ color: hexc, shininess: 25, transparent: true, opacity: 0.95 })); m.userData.hemi = 1; lob.add(m); zones.push(m); });
    const cv = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.66, 16), new THREE.MeshPhongMaterial({ color: 0x4a62c8, emissive: 0x101a40, transparent: true, opacity: 0.9 })); lob.add(cv); M.cv = cv;
    const R = rng(3), corners = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, x = Math.cos(a) * 0.93, z = -Math.sin(a) * 0.93; corners.push([x, z]);
      [[0.05, 0x5b78e6], [-0.03, 0xd9524a], [0.0, 0x6fd06f]].forEach(([o, hx], j) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03 + 0.005 * j, 0.03 + 0.005 * j, 0.62, 10), new THREE.MeshPhongMaterial({ color: hx, emissive: 0x101010 })); m.position.set(x * 0.97 + (j - 1) * 0.045 * Math.cos(a + 1.57), 0, z * 0.97 - (j - 1) * 0.045 * Math.sin(a + 1.57)); lob.add(m); }); }
    corners.forEach(([x, z], i) => { const y = 0.26; [-0.08, 0.08].forEach((dz, j) => { const pts = [[x * 0.95, y, z * 0.95 + dz * 0.4], [x * 0.5, y + 0.005, z * 0.5 + dz], [0, y, 0]].map((p) => V3(p)); const cu = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(new THREE.TubeGeometry(cu, 12, 0.012, 6, false), new THREE.MeshBasicMaterial({ color: 0x7a2f2f, transparent: true, opacity: 0.7 })); lob.add(m); if (j === 0) { const f = S.flow(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(new THREE.Vector3(0.1, -0.05, 0)))), 5, 0xff7a6a, { speed: 0.3 }); (F.sin = F.sin || []).push(f); } }); });
    /* the toxin or inflammatory cells in the lobule */
    for (let i = 0; i < 18; i++) { const a = R() * 6.283, rr = 0.15 + R() * 0.7, b = ball(0.03, 0xffffff, { transparent: true, opacity: 0.9 }); b.userData.p = new THREE.Vector3(Math.cos(a) * rr, 0.28 + R() * 0.05, Math.sin(a) * rr); lob.add(b); cells.push(b); }
    /* brain */
    const br = new THREE.Mesh(BG ? BG.clone() : ellip(0.62, 0.5, 0.7), new THREE.MeshPhongMaterial({ color: 0xe6a7a4, shininess: 30, emissive: 0x1a0808 })); br.position.set(...BR_POS); br.userData.hemi = 1; grp.add(br); M.br = br;
    M.her = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 14), new THREE.MeshBasicMaterial({ color: 0xff4a5a, transparent: true, opacity: 0.85 })); M.her.rotation.x = Math.PI; M.her.position.set(BR_POS[0], BR_POS[1] - 0.62, 0); grp.add(M.her);
    M.ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.012, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff4a5a, transparent: true, opacity: 0.8 })); M.ring.position.set(...BR_POS); grp.add(M.ring);
    grp.add(S.label("brain", [BR_POS[0], BR_POS[1] + 0.85, 0], "#e6a7a4")); grp.add(S.label("liver", [-1.95, 1.0, 0], "#d9928a")); grp.add(S.label("one lobule", [0.1, 1.05, 0], "#d9928a"));
    /* ammonia on its way to the brain */
    const nhP = [[-1.4, 0.55, 0], [-0.8, 1.35, 0], [0.6, 1.55, 0], [1.6, 1.15, 0], [BR_POS[0] - 0.4, 0.75, 0]];
    const nh = S.tube(nhP, 0.035, 0x9a6ad8, { op: 0.6, seg: 30 }); grp.add(nh); F.nh = S.flow(new THREE.CatmullRomCurve3(nhP.map((p) => V3(p))), 16, 0xd7a8ff, { speed: 0.2 });
    /* CRRT circuit */
    const fil = new THREE.Group(); fil.position.set(0.3, -1.65, 0); grp.add(fil); M.fil = fil;
    const fc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.75, 20), new THREE.MeshPhongMaterial({ color: 0xcfe9ff, emissive: 0x143040, transparent: true, opacity: 0.8 })); fc.rotation.z = Math.PI / 2; fil.add(fc);
    [-0.4, 0.4].forEach((x) => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), S.mat(0x2a3550)); cap.rotation.z = Math.PI / 2; cap.position.x = x; fil.add(cap); });
    const sp = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 28), new THREE.MeshBasicMaterial({ color: 0x3dff9a })); sp.rotation.y = Math.PI / 2; fil.add(sp); M.sp = sp; fil.add(S.label("CRRT filter", [0, 0.38, 0], "#3dff9a"));
    F.crrt = S.flow(new THREE.CatmullRomCurve3([V3([-0.9, -1.1, 0]), V3([-0.5, -1.65, 0]), V3([-0.3, -1.65, 0]), V3([0.9, -1.65, 0]), V3([1.3, -1.1, 0])]), 10, 0x3dff9a, { speed: 0.3 });
    Object.assign(st, { t: cur().v0, nacAt: null, stopAt: null, rec: 0, hs: 0, man: 0, crrt: 0, crrtOn: false, hsOn: false, manOn: false, intub: false, tx: false, dose: cur().fmax });
    S.view({ ry: 0.05, rx: 0.12, d: 6.3, tx: 0.2, ty: 0.1, tz: 0 });
  }

  /* ---------- the disease model ---------- */
  const F0 = (t) => cur().fmax * (1 - Math.exp(-t / cur().tau));
  function fRaw() {
    const c = cur(), ev = []; if (st.nacAt != null) ev.push({ at: st.nacAt, e: nacE() }); if (st.stopAt != null) ev.push({ at: st.stopAt, e: c.eStop }); ev.sort((a, b) => a.at - b.at);
    let g = 1, prev = 0, f = 0; ev.forEach((x) => { if (x.at < st.t) { f += g * (F0(x.at) - F0(prev)); g *= 1 - x.e; prev = x.at; } }); return f + g * (F0(st.t) - F0(prev));
  }
  const nacE = () => (st.tab === "PARA" ? clamp(1.15 - st.nacAt / 20, 0.15, 0.95) : st.tab === "ISCH" ? 0.05 : (st.nacAt < (cur().days ? 3 : 72) ? 0.22 : 0.1));
  const fNow = () => (st.tx ? 0.03 : clamp(fRaw() * (1 - 0.75 * st.rec), 0, 1));
  function est() {
    const f = fNow(), c = cur(), nh3 = Math.round((35 + 420 * Math.pow(f, 1.6)) * (1 - 0.55 * st.crrt)), grade = nh3 > 350 ? 4 : nh3 > 250 ? 3 : nh3 > 150 ? 2 : nh3 > 90 ? 1 : 0;
    const edema = clamp((nh3 - 120) / 330, 0, 1) * (1 - 0.4 * st.hs) * (1 - 0.2 * st.man), icp = Math.round(10 + 42 * edema), inr = +(1 + 7 * Math.pow(f, 1.5)).toFixed(1), pH = +(7.42 - 0.3 * Math.pow(f, 3)).toFixed(2), cr = +(0.8 + 3.2 * Math.pow(f, 2.2)).toFixed(1), bili = Math.round(0.8 + 22 * Math.pow(f, 1.3) * (c.days ? 1 : 0.6)), lac = +(1 + 7 * Math.pow(f, 2.2)).toFixed(1);
    const alt = Math.round(40 + c.peak * Math.min(1, f * 2.2) * (f > 0.9 ? 0.5 : 1) * (1 - 0.7 * st.rec)), glu = Math.round(100 - 55 * f * f);
    let kcc = false; if (st.tab === "PARA") kcc = pH < 7.3 || (inr > 6.5 && cr > 3.4 && grade >= 3); else { let n = 0; if (st.tab === "VIRAL" || st.tab === "DILI") n++; if (c.days && st.t > 7) n++; if (inr > 3.5) n++; if (bili > 17.5) n++; kcc = inr > 6.5 || n >= 3; }
    return { f, nh3, grade, edema, icp, inr, pH, cr, bili, lac, alt, glu, kcc };
  }
  function paint() {
    const f = fNow(), necro = C(0x3a2622), pale = C(0xd9b25a), tint = (st.tab === "PARA" || st.tab === "ISCH") ? 0 : 0.0;
    liver.paint((tag, rank, h, out) => { const th = f * 1.15 - 0.075; out.lerp(necro, clamp((th - rank) * 9, 0, 1) * 0.9); if (f > 0.3) out.lerp(pale, 0.25 * clamp(f, 0, 1)); void tint; });
    const a = st.tab === "VIRAL" || st.tab === "DILI" ? [clamp(f / 0.7, 0, 1), clamp((f - 0.08) / 0.7, 0, 1), clamp((f - 0.16) / 0.7, 0, 1)] : [clamp((f - 0.6) / 0.4, 0, 1), clamp((f - 0.3) / 0.4, 0, 1), clamp(f / 0.4, 0, 1)];
    const hc = [0xd9928a, 0xc7766f, 0xb4605a]; zones.forEach((m, i) => { m.material.color.setHex(hc[i]).lerp(necro, 0.92 * a[i]); });
  }
  function frame(dt) {
    const t = S.time(), e = est(), c = cur();
    if (st.nacAt != null || st.stopAt != null || st.tx) { const f0 = fRaw(); if (f0 < 0.85 && !(e.kcc && !st.tx)) st.rec = Math.min(1, st.rec + dt * (st.tab === "ISCH" ? 0.08 : 0.03)); }
    st.hs += ((st.hsOn ? 1 : 0) - st.hs) * Math.min(1, dt * 0.6); st.man += ((st.manOn ? 1 : 0) - st.man) * Math.min(1, dt * 0.8); st.crrt += ((st.crrtOn ? 1 : 0) - st.crrt) * Math.min(1, dt * 0.35);
    M.br.scale.setScalar(1 + 0.16 * e.edema + 0.012 * Math.sin(t * 2) * e.edema); M.br.material.color.setHex(0xe6a7a4).lerp(C(0xd4504a), clamp((e.icp - 22) / 25, 0, 1) * 0.6);
    M.her.visible = e.icp > 38; M.her.position.y = BR_POS[1] - 0.62 - 0.05 * Math.sin(t * 6); M.ring.visible = e.icp > 25; M.ring.scale.setScalar(1 + 0.1 * e.edema + 0.04 * Math.sin(t * 5));
    M.fil.visible = st.crrtOn; M.sp.rotation.z += dt * 3; rate(F.crrt, st.crrtOn ? 0.9 : 0);
    rate(F.nh, clamp((e.nh3 - 40) / 300, 0.05, 1)); F.sin.forEach((f) => rate(f, st.tab === "ISCH" ? clamp(0.3 + (st.stopAt != null && st.t > st.stopAt ? 0.7 * Math.min(1, st.rec * 4) : 0), 0.1, 1) : 0.9 * (1 - 0.5 * e.f)));
    M.lob.rotation.y += dt * 0.0; const infl = st.tab === "VIRAL" || st.tab === "DILI";
    cells.forEach((b, i) => { b.visible = i < Math.round(18 * clamp(e.f * 1.3 + (st.tab === "PARA" ? 0.25 : 0), 0, 1)) && !st.tx; b.material.color.setHex(infl ? 0xf2f2f2 : st.tab === "PARA" ? 0xff9a3c : 0x888888); b.position.copy(b.userData.p); if (st.tab === "PARA") { b.position.multiplyScalar(1 - 0.5 * (0.5 + 0.5 * Math.sin(t * 1.5 + i))); b.position.y = 0.3; } else b.position.y += 0.02 * Math.sin(t * 3 + i); });
    accT += dt; if (accT > 0.1) { accT = 0; paint(); }
  }
  S.hooks.push(frame); S.onTap = () => {};

  const setTab = (k) => { st.tab = k; build(); };
  const setOpt = (id, v) => { if (id === "ghost") { st.ghost = v === "1"; liver.mesh.material.opacity = st.ghost ? 0.3 : 0.9; } };
  const setT = (v) => { st.t = v; };
  function act(id) {
    const e = est();
    if (id === "nac") { if (st.nacAt == null) { st.nacAt = st.t; ui.refresh("N-acetylcysteine started." + (st.tab === "PARA" ? (st.t < 8 ? " Early: it replaces glutathione before most of the damage is done." : " Late, but still recommended in established paracetamol failure.") : " Suggested in early non-paracetamol failure; the benefit is smaller.")); } }
    else if (id === "cause") { if (st.stopAt == null) { st.stopAt = st.t; ui.refresh(st.tab === "ISCH" ? "Circulation restored. The liver cells stop dying and the enzymes start to fall." : st.tab === "PARA" ? "Exposure stopped. Injury already in progress continues." : st.tab === "VIRAL" ? "Specific therapy given where one exists. The immune attack is slow to stop." : "All suspect drugs stopped. Injury can continue for days after the drug is gone."); } }
    else if (id === "crrt") { if (!st.crrtOn) { st.crrtOn = true; ui.refresh("CRRT started for hyperammonaemia: ammonia falls, which slows brain swelling (recommended early with grade 2 or higher encephalopathy)."); } }
    else if (id === "hs") { if (!st.hsOn) { st.hsOn = true; ui.refresh("Hypertonic saline: serum sodium kept around 145 to 155 mmol/L to draw water out of the swollen brain."); } }
    else if (id === "man") { if (!st.manOn) { st.manOn = true; ui.refresh("Mannitol bolus for a surge in intracranial pressure: a short-term rescue measure."); } }
    else if (id === "intub") { if (!st.intub) { st.intub = true; ui.refresh("Intubated for grade 3 to 4 encephalopathy: the airway is protected and ventilation can be controlled."); } }
    else if (id === "tx") { if (!st.tx) { st.tx = true; ui.refresh(e.kcc ? "Emergency liver transplant: a healthy graft is placed and reperfused. Ammonia and the INR fall quickly." : "Transplant done although criteria were not met: many patients in this state recover on their own, so the graft may be unnecessary."); } }
    else if (id === "reset") build();
  }
  function obs() {
    const e = est(), c = cur(), tone = (v, a, b) => (v > b ? "bad" : v > a ? "warn" : "ok");
    const u = c.days ? "day" : "hour", params = [
      { k: "Liver cells lost", v: Math.round(e.f * 100) + "%", tone: tone(e.f, 0.3, 0.6) }, { k: "ALT", v: e.alt + " U/L", tone: e.alt > 1000 ? "warn" : "ok" }, { k: "INR", v: String(e.inr), tone: tone(e.inr, 1.4, 3) }, { k: "Ammonia", v: e.nh3 + " µmol/L", tone: tone(e.nh3, 100, 200) },
      { k: "Encephalopathy", v: e.grade ? "grade " + e.grade : "none", tone: e.grade >= 3 ? "bad" : e.grade ? "warn" : "ok" }, { k: "Brain pressure (ICP)", v: e.icp + " mmHg", tone: tone(e.icp, 20, 25) }, { k: "pH · lactate", v: e.pH.toFixed(2) + " · " + e.lac, tone: e.pH < 7.3 ? "bad" : e.lac > 2 ? "warn" : "ok" },
      { k: "Creatinine · glucose", v: e.cr + " mg/dL · " + e.glu, tone: e.cr > 2 ? "bad" : e.glu < 70 ? "warn" : "ok" }, { k: "King's College criteria", v: st.tx ? "transplanted" : e.kcc ? "MET: list for transplant" : "not met", tone: st.tx ? "ok" : e.kcc ? "bad" : "ok" }];
    const lead = [];
    if (st.tx) lead.push("A healthy graft is working: the necrosis is gone, ammonia is normal and the brain has drained. Immunosuppression and graft monitoring follow.");
    else {
      if (e.f < 0.15) lead.push("Early: the liver is still working. This is the time when the cause can still be stopped (move the " + u + " slider forward to follow the injury).");
      if (e.f >= 0.15 && st.nacAt == null && e.f < 0.8) lead.push("Start N-acetylcysteine now. " + (st.tab === "PARA" ? "The earlier, the more liver is saved." : "Suggested in early non-paracetamol failure."));
      if (e.grade >= 2 && !st.crrtOn) lead.push("Grade 2 or higher encephalopathy with a rising ammonia: start early CRRT.");
      if (e.grade >= 3 && !st.intub) lead.push("Grade 3 to 4 encephalopathy: protect the airway (intubate) and expect the brain to swell.");
      if (e.icp > 25 && !st.hsOn) lead.push("Intracranial pressure is rising: hypertonic saline.");
      if (e.icp > 38) lead.push("Herniation risk: the swollen brain is being pushed through the foramen magnum.");
      if (e.kcc) lead.push("King's College criteria met: emergency transplant listing, if not already done.");
      if (st.rec > 0.5 && e.f < 0.4) lead.push("The liver is regenerating. Continue supportive care and watch the INR and the ammonia come down.");
      if (!lead.length) lead.push("Move the slider to follow the injury, and give the treatments in turn.");
    }
    return { params, body: bodyMap(e), marks: {}, note: lead.join(" "), noteOnly: 0 };
  }
  function bodyMap(e) { const m = { liver: st.tx ? "rec" : e.f > 0.6 ? 3 : e.f > 0.25 ? 2 : e.f > 0.05 ? 1 : 0 }; if (e.grade >= 2) m.brain = e.icp > 25 ? 3 : 2; if (e.cr > 1.6) { m["kidney-R"] = 2; m["kidney-L"] = 2; } if (e.f > 0.6 && !st.tx) { m.heart = 1; m["lung-R"] = 1; m["lung-L"] = 1; } if (st.rec > 0.6 || st.tx) m.liver = "rec"; return m; }
  const info = () => { const c = cur(); return { anat: c.anat, patho: c.patho, interv: c.interv }; };
  function clin() {
    const e = est(), L = [];
    L.push(["Definition", "Acute liver failure: jaundice or coagulopathy (INR 1.5 or more) with any degree of hepatic encephalopathy, in a patient with no pre-existing cirrhosis and an illness of less than 26 weeks. Hyperacute (under 7 days), acute (7 to 28 days), subacute (over 28 days). The tempo changes the outlook: hyperacute failure (paracetamol, hepatitis A, ischaemia) has more brain swelling but a better chance of recovery."]);
    L.push(["Encephalopathy (West Haven)", "Grade 1 mild confusion or sleep reversal; 2 drowsy, disorientated, asterixis; 3 stuporous but rousable; 4 coma. Grade 3 to 4 is a reason to intubate. Illustrative here: " + (e.grade ? "grade " + e.grade : "none") + "."]);
    L.push(["ICU care", "Admit to a unit that can transfer to a transplant centre. Check glucose frequently, give dextrose, avoid sedation that clouds the neurological examination, treat infection early, and give plasma or platelets only for bleeding or before an invasive procedure, because the INR is the main prognostic marker. Keep sodium 145 to 155 mmol/L when there is brain swelling; routine intracranial pressure monitoring is no longer recommended."]);
    L.push(["Ammonia and CRRT", "Arterial ammonia that stays high predicts brain swelling. Early CRRT is recommended in acute liver failure with grade 2 or higher encephalopathy, even without the usual renal indications."]);
    L.push(["N-acetylcysteine", "Intravenous NAC for paracetamol-induced failure at any stage, and suggested in early non-paracetamol failure."]);
    L.push(["Transplant", "Contact a transplant centre early (within hours of presentation) and transfer if the patient is at risk of a poor outcome. Prognosis by King's College criteria (paracetamol: arterial pH below 7.30 after fluids, or INR above 6.5 with creatinine above 3.4 mg/dL and grade 3 to 4 encephalopathy; non-paracetamol: INR above 6.5, or three of the five other criteria) or MELD. Living-donor and ABO-incompatible grafts are options in selected cases. Currently here: " + (e.kcc ? "criteria met." : "criteria not met.")]);
    L.push(["Reference", "ACG clinical guideline on acute liver failure (2023). Follow your local liver-unit pathway."]);
    return { lines: L };
  }
  const lab = {
    id: "alf", name: "Acute Liver Failure Lab", tag: "Acute liver failure", icon: "🟠",
    tabs: ORDER.map((k) => ({ id: k, label: T[k].label, sub: T[k].sub })), get tab() { return st.tab; },
    selectHint: "Pick a cause, move the slider to watch the liver cells die from the central vein outwards, then treat the liver, the ammonia and the brain.",
    opts: () => [{ id: "ghost", label: "Liver", cur: st.ghost ? "1" : "0", choices: [["0", "Solid"], ["1", "See-through"]] }],
    slider: () => ({ id: "t", label: st.tab === "PARA" || st.tab === "ISCH" ? "Hours since the injury began" : "Days since the illness began", min: cur().min, max: cur().max, step: 1, v: clamp(st.t, cur().min, cur().max), unit: cur().unit }),
    actions: () => { const e = est(); return [
      { id: "nac", label: "N-ACETYLCYSTEINE", hint: st.tab === "PARA" ? "Best early; still given late." : "Suggested early in non-paracetamol failure.", off: st.nacAt != null }, { id: "cause", label: cur().cause, hint: cur().causeHint, off: st.stopAt != null },
      { id: "crrt", label: "EARLY CRRT", hint: "For ammonia, grade 2+ encephalopathy.", off: st.crrtOn }, { id: "intub", label: "INTUBATE", hint: "Grade 3 to 4 encephalopathy.", off: st.intub }, { id: "hs", label: "HYPERTONIC SALINE", hint: "Brain swelling: sodium 145 to 155.", off: st.hsOn }, { id: "man", label: "MANNITOL", hint: "Short-term rescue for a pressure surge.", off: st.manOn },
      { id: "tx", label: "EMERGENCY TRANSPLANT", hint: e.kcc ? "Criteria met." : "Only when criteria are met.", off: st.tx }, { id: "reset", label: "RESET", hint: "Start this cause again.", off: false }]; },
    dragHint: "Move the slider to let the injury progress, then give treatments one at a time. Rotate the model and use CUT to look inside the lobule and the brain.",
    views: [{ id: "all", label: "All three", f: () => ({ ry: 0.05, rx: 0.12, d: 6.3, tx: 0.2, ty: 0.1 }) }, { id: "lobule", label: "Lobule from above", f: () => ({ ry: 0.2, rx: 1.15, d: 2.7, tx: 0.1, ty: -0.05 }) }, { id: "liver", label: "Liver", f: () => ({ ry: 0.1, rx: 0.1, d: 4.2, tx: -1.9, ty: 0.15 }) }, { id: "brain", label: "Brain", f: () => ({ ry: -0.2, rx: 0.12, d: 3.4, tx: 2.3, ty: 0.3 }) }],
    credit: CREDIT_BP3D + " Brain: BodyParts3D © DBCLS, CC BY-SA 2.1 JP.",
    legend: [["#b4594b", "Liver"], ["#3a2622", "Dead liver"], ["#ff9a3c", "NAPQI"], ["#f2f2f2", "Immune cells"], ["#d7a8ff", "Ammonia"], ["#3dff9a", "CRRT"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; liver.mesh.material.opacity = on ? 0.3 : 0.9; }, tabLabel: () => cur().label,
  };
  build();
  return lab;
}
