/* LIVER & BILIARY LAB on the PATHODYNAMICS engine: acute cholangitis, pyogenic liver abscess and amoebic liver abscess.
   One 3D liver with its bile ducts, gallbladder, portal vein, hepatic artery, hepatic vein, duodenum and a bowel focus.
   Interactions: biliary decompression (ERCP stone extraction or stent, percutaneous drain), abscess drainage (needle, catheter), source control, and how injury progresses with time.
   Content aligned to the Tokyo Guidelines 2018 (acute cholangitis: diagnosis, severity grade, timing of drainage) and current teaching for pyogenic and amoebic liver abscess.
   Checked Nov 2026 against published summaries. All numbers are illustrative, not patient data. Nothing here is a flat picture: every view is the 3D model. */
import { THREE, C, smooth } from "../stage.js?v=20261126gk";
import { clotKit, toolKit, clamp } from "./common.js?v=20261126gk";
import { seg, setWidth, branchTree, ball, loadLiver, ellip, rate, V3, rng, CREDIT_BP3D } from "./gi-kit.js?v=20261126gk";

const T = {
  NORMAL: { label: "Normal", sub: "Liver, bile ducts, gallbladder", min: 0, max: 1, unit: "",
    anat: "The right and left lobes drain bile through ducts that join at the hilum into the common hepatic duct. The cystic duct from the gallbladder joins it to form the common bile duct (CBD), which runs behind the duodenum and opens at the ampulla through the sphincter of Oddi. The portal vein and the hepatic artery enter at the hilum; the hepatic veins leave to the inferior vena cava.",
    patho: "Bile flows one way, from liver to duodenum, at low pressure (roughly 7 to 14 cmH₂O). Continuous flow and the sphincter keep the biliary tree nearly sterile above the ampulla. When flow is blocked and the pressure rises, gut bacteria ascend, and in experimental work pressures above about 20 to 25 cmH₂O push them across into the blood.",
    interv: "Nothing to treat here. Switch to Cholangitis, Pyogenic abscess or Amoebic abscess to see what goes wrong, and which step removes the cause." },
  CHOL: { label: "Cholangitis", sub: "Obstructed, infected bile", min: 0, max: 72, unit: " h", v0: 24,
    anat: "A stone (or a stricture, tumour or blocked stent) sits in the common bile duct above the ampulla. The ducts upstream widen, the bile turns turbid and then purulent, and the liver becomes jaundiced.",
    patho: "Obstruction plus bacteria (E. coli, Klebsiella, Enterococcus, anaerobes) gives infected bile under pressure. The classic picture is Charcot's triad (fever, jaundice, right upper quadrant pain); Reynolds' pentad adds shock and confusion. High duct pressure forces bacteria from the ducts into the hepatic veins (cholangiovenous reflux), so bacteraemia and septic shock follow. Left untreated, small cholangitic abscesses seed through the liver.",
    interv: "Antibiotics and resuscitation start at once, but they do not cure an obstructed duct: biliary drainage is the source control. Tokyo Guidelines 2018: Grade I (mild) usually settles on antibiotics, with drainage if there is no response in about 24 hours; Grade II (moderate) needs early drainage; Grade III (severe) needs urgent drainage as soon as organ support has stabilised the patient. ERCP is first line (sphincterotomy and stone extraction, or a stent when the patient is unstable); percutaneous transhepatic drainage (PTBD) when ERCP fails or is not possible." },
  ABSC: { label: "Pyogenic abscess", sub: "Pus in the liver", min: 0, max: 28, unit: " d", v0: 10,
    anat: "A pus-filled cavity sits in the liver, most often in the right lobe. Early on it is an ill-defined area of inflamed, softened liver; over days to weeks it liquefies and a wall forms around it. Gas bubbles point to gas-forming organisms such as Klebsiella, especially in diabetes.",
    patho: "Bacteria reach the liver along the bile ducts (cholangitis, about half of cases), along the portal vein from a bowel focus (appendicitis, diverticulitis), through the hepatic artery in bacteraemia, or from nearby infection; many are cryptogenic. Hypervirulent Klebsiella pneumoniae is a common cause in Asia, in diabetes, and can spread to the eye and the brain. Diabetes, biliary disease, cirrhosis and immunosuppression are risk factors.",
    interv: "Two things cure it: drainage and antibiotics, plus finding and controlling the source. Empirical antibiotics cover enteric Gram-negatives, enterococci and anaerobes, then are narrowed by culture; the course is usually two to six weeks, longer if drainage is poor. Small abscesses (under about 3 to 5 cm) may respond to antibiotics alone or needle aspiration; larger ones do better with a catheter. Surgery is for rupture, peritonitis, multiloculated disease or failed drainage." },
  AMEB: { label: "Amoebic abscess", sub: "Entamoeba histolytica", min: 0, max: 21, unit: " d", v0: 10,
    anat: "A solitary, usually right-lobe cavity filled with thick, reddish-brown liquefied liver (anchovy-paste pus) that is sterile of bacteria. The wall is thin and the cavity is round.",
    patho: "Entamoeba histolytica cysts are swallowed in contaminated food or water, invade the colon and reach the liver through the portal vein, where trophozoites dissolve liver tissue. Fever and right upper quadrant pain are typical, often with a recent history of diarrhoea. A left-lobe abscess is dangerous: it can rupture into the pericardium.",
    interv: "Metronidazole, followed by a luminal amoebicide (paromomycin or diloxanide furoate) to clear the gut, cures most patients and a response is usually seen within about 3 days. Aspiration or drainage is added for large cavities (about 5 cm or more), a left-lobe site, impending rupture, an uncertain diagnosis, or no response after about 5 to 7 days." },
};
const ORDER = ["NORMAL", "CHOL", "ABSC", "AMEB"];
const AP = { R: new THREE.Vector3(-1.1, 0.5, 0.05), L: new THREE.Vector3(0.7, 0.55, 0.08) };
const AMP = [-0.2, -0.62, 0.08], HIL = [-0.32, 0.42, 0.1];

export default function create(S, ui) {
  const st = { tab: "CHOL", h: 24, lobe: "R", src: "bil", abx: false, resus: false, stent: false, stoneOut: false, ptbd: false, hD: null, rel: 0, cath: false, dr: 0, asp: false, as: 0, srcCtl: false, metro: false, ab: 0, surg: false, ghost: false, dm: false };
  const cur = () => T[st.tab], isAb = () => st.tab === "ABSC" || st.tab === "AMEB", dec = () => st.stent || st.stoneOut || st.ptbd;
  let M = {}, ducts = [], liver = null, LG = null, abs = null, micro = [], gas = [], stone = null, ptbd = null, drain = null, F = {}, bileMat = null, stentM = null, accT = 0;
  loadLiver({ c: [-0.45, 0.5, 0], r: [1.7, 0.95, 0.65] }).then((g) => { LG = g; if (M.grp) build(); }).catch(() => {});   /* real liver (BodyParts3D) */

  function build() {
    S.clear(); M = {}; ducts = []; micro = []; gas = []; F = {};
    const grp = S.add(new THREE.Group()); M.grp = grp;
    const lg = LG ? LG.clone() : ellip(1.7, 0.95, 0.65);
    liver = S.tissue(lg, 0xb4594b, (P) => ({ tag: P.x < -0.55 ? "R" : "L", rank: 0.5, h: 0.5, sh: 0.92 + 0.08 * Math.sin(18 * P.x) * Math.sin(14 * P.y) }), { shininess: 30, transparent: true, opacity: 0.62, depthWrite: false });
    if (!LG) liver.mesh.position.set(-0.45, 0.5, 0); liver.mesh.userData.hemi = 1; liver.mesh.renderOrder = 2; grp.add(liver.mesh);
    /* vessels */
    const tube = (pts, r, hex, op) => { const m = S.tube(pts, r, hex, { op: op || 0, seg: 30 }); m.renderOrder = 1; grp.add(m); return m; };
    tube([[0.62, 1.6, -0.3], [0.58, 0.4, -0.3], [0.55, -1.2, -0.3]], 0.1, 0x3a4fa8, 0.8);                                    /* inferior vena cava */
    tube([[-0.9, 0.9, -0.15], [-0.3, 1.15, -0.25], [0.56, 1.25, -0.3]], 0.05, 0x4a62c8, 0.85);
    M.pv = tube([[-0.05, -1.0, -0.1], [-0.22, -0.2, -0.08], [-0.3, 0.38, -0.05]], 0.06, 0x5b78e6, 0.9); tube([[-0.3, 0.38, -0.05], [-0.7, 0.5, -0.05], [-1.2, 0.55, -0.05]], 0.04, 0x5b78e6, 0.9); tube([[-0.3, 0.38, -0.05], [0.1, 0.48, -0.05], [0.7, 0.5, -0.05]], 0.035, 0x5b78e6, 0.9);
    tube([[0.18, -0.9, 0.02], [0.05, -0.1, 0.05], [-0.22, 0.4, 0.04]], 0.022, 0xd9524a); tube([[-0.22, 0.4, 0.04], [-0.8, 0.62, 0.04], [-1.3, 0.7, 0.02]], 0.016, 0xd9524a); tube([[-0.22, 0.4, 0.04], [0.3, 0.6, 0.04], [0.8, 0.7, 0.02]], 0.014, 0xd9524a);
    /* duodenum and the bowel focus (portal route) */
    const duo = S.tube([[0.55, -0.12, 0.05], [0.1, -0.25, 0.05], [-0.2, -0.42, 0.04], [-0.22, -0.95, 0.04], [0.1, -1.18, 0.05], [0.7, -1.12, 0.05]], 0.1, 0xc99a6a, { seg: 40, op: 0.85 }); duo.renderOrder = 1; grp.add(duo);
    const col = S.tube([[0.8, -1.4, 0.05], [1.4, -1.25, 0.05], [1.62, -0.75, 0.05], [1.4, -0.3, 0.05]], 0.13, 0xc68a78, { seg: 36, op: 0.85 }); col.renderOrder = 1; grp.add(col);
    M.focus = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshPhongMaterial({ color: 0xd8c25a, emissive: 0x403800 })); M.focus.position.set(1.66, -0.72, 0.12); grp.add(M.focus);
    tube([[1.35, -0.95, 0.0], [0.6, -1.0, -0.05], [-0.05, -1.0, -0.1]], 0.04, 0x5b78e6, 0.9);                                  /* superior mesenteric vein joins the portal vein */
    /* biliary tree: bile-coloured ducts that can widen */
    bileMat = new THREE.MeshPhongMaterial({ color: 0x7fc46a, emissive: 0x1a2a10, shininess: 70, transparent: true, opacity: 0.95 });
    const R = branchTree(grp, bileMat, HIL, V3([-1, 0.3, 0.1]), 0.4, 0.034, 3, 11, 0.55), L = branchTree(grp, bileMat, HIL, V3([1, 0.38, 0.1]), 0.34, 0.03, 3, 23, 0.55);
    ducts = R.concat(L); M.rt = R;
    M.cbd = seg(grp, HIL, AMP, 0.04, bileMat); ducts.push(M.cbd);
    M.gb = new THREE.Mesh(ellip(0.17, 0.3, 0.15), new THREE.MeshPhongMaterial({ color: 0x4f9a52, emissive: 0x112a12, shininess: 60, transparent: true, opacity: 0.88 })); M.gb.position.set(-0.7, -0.08, 0.26); M.gb.rotation.z = -0.25; grp.add(M.gb);
    ducts.push(seg(grp, [-0.62, 0.17, 0.22], [-0.28, 0.08, 0.1], 0.02, bileMat));
    M.amp = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffd166 })); M.amp.position.set(AMP[0], AMP[1], AMP[2]); M.amp.rotation.x = Math.PI / 2; grp.add(M.amp);
    ["common bile duct", "gallbladder", "duodenum"].forEach((t, i) => { const l = S.label(t, [[-0.0, 0.1, 0.5], [-0.95, -0.55, 0.3], [0.5, -1.35, 0.2]][i], "#7fc46a"); grp.add(l); });
    /* the abscess */
    abs = new THREE.Group(); abs.position.copy(AP[st.lobe]); grp.add(abs);
    M.fl = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshPhongMaterial({ color: 0xcfd05a, transparent: true, opacity: 0.72, depthWrite: false, shininess: 80 })); M.fl.renderOrder = 4; abs.add(M.fl);
    M.wl = new THREE.Mesh(new THREE.SphereGeometry(1.08, 32, 24), new THREE.MeshPhongMaterial({ color: 0xa8683f, transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false })); M.wl.renderOrder = 4; abs.add(M.wl);
    const R2 = rng(5); for (let i = 0; i < 9; i++) { const b = ball(0.12, 0xf4fff0, { transparent: true, opacity: 0.9 }); b.userData.p = new THREE.Vector3((R2() - 0.5) * 1.1, 0.25 + R2() * 0.5, (R2() - 0.5) * 0.9); abs.add(b); gas.push(b); }
    /* the little abscesses that seed through the liver when an obstructed duct stays infected */
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshPhongMaterial({ color: 0xcfd05a, emissive: 0x403f00 })); m.position.set(-1.35 + R2() * 1.9, 0.25 + R2() * 0.7, (R2() - 0.5) * 0.5); m.visible = false; grp.add(m); micro.push(m); }
    M.leak = new THREE.Mesh(ellip(0.5, 0.25, 0.3), new THREE.MeshPhongMaterial({ color: 0xcfd05a, transparent: true, opacity: 0.6, depthWrite: false })); M.leak.position.set(-1.0, 1.25, 0.25); M.leak.visible = false; grp.add(M.leak);
    /* stone, stent, catheters */
    stone = clotKit(S, grp, ui, { size: 0.1, ring: 0.17, thr: 0.5, color: 0xe0b84a, onRemoved: () => { st.stoneOut = true; if (st.hD == null) st.hD = st.h; ui.refresh("Stone pulled out with a basket after sphincterotomy. The bile drains into the duodenum and the pressure falls."); } });
    stone.placeAt(new THREE.Vector3(AMP[0] + 0.0, AMP[1] + 0.2, AMP[2]));
    stentM = seg(grp, [HIL[0] + 0.0, HIL[1] - 0.12, HIL[2]], [AMP[0], AMP[1] - 0.12, AMP[2]], 0.02, new THREE.MeshPhongMaterial({ color: 0x66d9ff, emissive: 0x103040, shininess: 90 })); stentM.visible = false; grp.add(stentM);
    ptbd = toolKit(S, grp, ui, { start: new THREE.Vector3(-2.1, 0.3, 0.6), target: M.rt[0].userData.b.clone(), thr: 0.32, len: 0.9, r: 0.016, ring: 0.14, msg: "Drag the catheter tip through the skin and liver to the glowing bile duct…", go: "Release to place the biliary drain", onPlaced: () => { st.ptbd = true; if (st.hD == null) st.hD = st.h; ui.refresh("Percutaneous biliary drain placed. Infected bile drains outside; the duct pressure falls."); } });
    drain = toolKit(S, grp, ui, { start: new THREE.Vector3(-2.1, 0.85, 0.6), target: AP[st.lobe].clone(), thr: 0.35, len: 1.0, r: 0.022, ring: 0.2, color: 0xffd0a0, msg: "Drag the catheter tip through the skin into the middle of the abscess…", go: "Release to place the drain", onPlaced: () => { st.cath = true; ui.refresh("Pigtail catheter in the abscess cavity. Pus drains; the cavity collapses around it."); } });
    /* flows */
    const mf = (pts, n, hex, o) => S.flow(new THREE.CatmullRomCurve3(pts.map((p) => V3(p))), n, hex, o);
    F.pv = mf([[-0.05, -1.0, -0.1], [-0.22, -0.2, -0.08], [-0.3, 0.38, -0.05], [-0.7, 0.5, -0.05], [-1.2, 0.55, -0.05]], 12, 0x7a96ff, { speed: 0.18 });
    F.ha = mf([[0.18, -0.9, 0.02], [0.05, -0.1, 0.05], [-0.22, 0.4, 0.04], [-0.8, 0.62, 0.04]], 8, 0xff6a6a, { speed: 0.2 });
    F.bile = mf([HIL, [-0.26, 0.0, 0.09], AMP], 9, 0x8fe070, { speed: 0.16 });
    F.bact = mf([AMP, [-0.26, 0.0, 0.09], HIL, [-0.7, 0.5, 0.1], [-1.1, 0.6, 0.1]], 12, 0xe8e060, { speed: 0.2 });
    F.reflux = mf([[-0.9, 0.9, -0.15], [-0.3, 1.15, -0.25], [0.56, 1.25, -0.3], [0.58, 0.4, -0.3]], 10, 0xe8e060, { speed: 0.24 });
    F.sm = mf([[1.35, -0.95, 0.0], [0.6, -1.0, -0.05], [-0.05, -1.0, -0.1], [-0.22, -0.2, -0.08], [-0.3, 0.38, -0.05], [-0.8, 0.5, -0.05]], 10, 0xe8e060, { speed: 0.2 });
    const d0 = cur().v0 == null ? 0 : cur().v0;
    Object.assign(st, { h: d0, hD: null, rel: 0, stent: false, stoneOut: false, ptbd: false, cath: false, dr: 0, asp: false, as: 0, abx: false, resus: false, srcCtl: false, metro: false, ab: 0, surg: false });
    S.view({ ry: 0.12, rx: 0.1, d: 5.7, tx: -0.2, ty: 0.1, tz: 0 });
  }

  /* ---------- the disease model ---------- */
  const expo = () => (st.hD != null ? Math.min(st.h, st.hD) : st.h);
  function cm0() { return st.tab === "AMEB" ? 1 + 6 * (1 - Math.exp(-st.h / 10)) : st.tab === "ABSC" ? 1 + 7 * (1 - Math.exp(-st.h / 8)) : 0; }
  function sizeCm() {
    if (!isAb()) return 0; const c0 = cm0(), small = c0 < 3 ? 1 : 0, ab = st.ab * (st.tab === "AMEB" ? 0.7 : small ? 0.65 : 0.2);
    let s = c0 * (1 - ab) * (1 - 0.6 * st.as * (c0 < 5 ? 1 : 0.5)) * (1 - 0.88 * st.dr);
    if (st.tab === "ABSC" && !st.srcCtl && st.src !== "crypto" && (st.dr > 0.9 || st.as > 0.9)) s += 0.28 * c0 * Math.min(1, st.dr + st.as * 0.5);   /* the source keeps seeding: it re-forms */
    return Math.max(0, s);
  }
  const ruptured = () => isAb() && cm0() > 7 && st.h > 16 && st.dr < 0.2 && st.ab < 0.5 && !st.surg;
  function sep() {
    if (st.tab === "CHOL") { const base = clamp(expo() / 36, 0, 1); return clamp(base * (1 - 0.75 * st.rel) - 0.22 * (st.abx ? 1 : 0) * (0.4 + 0.6 * st.rel) - 0.08 * (st.resus ? 1 : 0), 0.03, 1); }
    if (isAb()) { const sz = sizeCm(); return clamp(0.1 + 0.075 * sz - 0.25 * st.ab * (st.tab === "ABSC" ? 1 : 0.8) - 0.1 * st.dr + (ruptured() ? 0.3 : 0), 0.03, 1); }
    return 0;
  }
  const pressure = () => (st.tab === "CHOL" ? 9 + 26 * (1 - st.rel) : 9);
  const ductK = () => (st.tab === "CHOL" ? 1 + 0.95 * clamp(st.h / 24, 0, 1) * (1 - 0.55 * st.rel) : 1);
  const grade = () => { const s = sep(); return s >= 0.62 ? "III" : s >= 0.3 ? "II" : "I"; };
  const microN = () => (st.tab === "CHOL" ? (expo() >= 48 ? Math.min(8, Math.floor((expo() - 44) / 3)) : 0) : 0);

  function paint() {
    const bili = (st.tab === "CHOL" ? clamp((1 - Math.exp(-expo() / 24)) * (1 - 0.6 * st.rel), 0, 1) : 0) * 0.85, jc = C(0xc9a44a);
    liver.paint((tag, rank, h, out) => { if (bili > 0) out.lerp(jc, 0.55 * bili); });
  }
  function frame(dt) {
    const t = S.time(), tb = st.tab, ab = isAb();
    if (dec()) st.rel = Math.min(1, st.rel + dt * 0.25);
    if (st.cath) st.dr = Math.min(1, st.dr + dt * 0.3); if (st.asp) st.as = Math.min(1, st.as + dt * 0.5); if (st.abx || st.metro) st.ab = Math.min(1, st.ab + dt * 0.12);
    const k = ductK(), s = sep(), inf = tb === "CHOL" ? clamp(expo() / 30, 0, 1) * (1 - 0.7 * st.rel) : 0;
    ducts.forEach((m) => setWidth(m, m === M.cbd ? k : 1 + (k - 1) * 0.6));
    bileMat.color.setHex(0x7fc46a).lerp(C(0xd4cf55), inf * 0.85).lerp(C(0xc2a74a), tb === "CHOL" ? 0.25 * (1 - Math.exp(-expo() / 24)) : 0);
    M.gb.scale.setScalar(1 + (tb === "CHOL" ? 0.12 * (k - 1) : 0)); M.amp.visible = tb === "CHOL"; M.amp.scale.setScalar(1 + 0.12 * Math.sin(t * 5));
    stone.mesh.visible = tb === "CHOL" && (!st.stoneOut || stone.mesh.material.opacity > 0.02); stone.frame(dt, 1); if (tb !== "CHOL") stone.ring.visible = false;
    stentM.visible = st.stent; ptbd.show(tb === "CHOL"); ptbd.frame(dt); drain.show(ab && !st.surg); drain.frame(dt);
    /* abscess */
    const sz = sizeCm(), r = 0.085 * sz, vis = ab && sz > 0.25; abs.visible = vis; abs.position.copy(AP[st.lobe]);
    abs.scale.setScalar(Math.max(0.01, r) * (st.ghost ? 1 : 1)); const amb = tb === "AMEB";
    M.fl.material.color.setHex(amb ? 0x8a5a40 : 0xcfd05a); M.wl.material.opacity = 0.12 + 0.5 * smooth(clamp(st.h / (amb ? 14 : 18), 0, 1)) * (1 - 0.7 * st.dr);
    gas.forEach((b, i) => { b.visible = vis && tb === "ABSC" && st.dm && !(st.dr > 0.7); b.position.copy(b.userData.p); b.position.y += 0.03 * Math.sin(t * 2 + i); });
    const mn = microN(); micro.forEach((m, i) => { m.visible = i < mn; m.scale.setScalar(1 + 0.15 * Math.sin(t * 3 + i)); });
    M.leak.visible = ruptured();
    if (drain.placed) drain.mesh.position.copy(AP[st.lobe]);
    M.focus.visible = tb === "ABSC" && st.src === "portal" || tb === "AMEB"; M.focus.scale.setScalar(st.srcCtl ? 0.45 : 1 + 0.12 * Math.sin(t * 4)); M.focus.material.color.setHex(tb === "AMEB" ? 0xb07a5a : 0xd8c25a);
    /* flows */
    rate(F.pv, 0.8); rate(F.ha, 0.8); rate(F.bile, tb === "CHOL" ? (dec() ? 0.2 + 0.7 * st.rel : 0.2) : tb === "NORMAL" ? 0.9 : 0.8);
    rate(F.bact, tb === "CHOL" ? inf : tb === "ABSC" && st.src === "bil" && !st.srcCtl && st.h < 12 ? 0.5 : 0);
    rate(F.reflux, tb === "CHOL" ? clamp((pressure() - 18) / 14, 0, 1) * clamp(s * 1.6, 0, 1) : 0);
    rate(F.sm, (tb === "ABSC" && st.src === "portal" || tb === "AMEB") && !st.srcCtl && st.h < 14 ? 0.7 : 0);
    accT += dt; if (accT > 0.1) { accT = 0; paint(); }
  }
  S.hooks.push(frame);
  S.onGrab = (o) => { stone.grabbed(o); ptbd.grabbed(o); drain.grabbed(o); }; S.onDrag = (o, w) => { stone.drag(w) || ptbd.drag(w) || drain.drag(w); }; S.onDrop = () => { stone.drop() || ptbd.drop() || drain.drop(); };
  S.onTap = () => {};

  function setTab(k) { st.tab = k; build(); }
  function setOpt(id, v) { if (id === "lobe") { st.lobe = v; build(); } else if (id === "src") { st.src = v; } else if (id === "dm") st.dm = v === "1"; else if (id === "ghost") { st.ghost = v === "1"; if (liver) liver.mesh.material.opacity = st.ghost ? 0.25 : 0.62; } }
  function setT(v) { st.h = v; }
  function act(id) {
    if (id === "abx") { st.abx = true; ui.refresh(st.tab === "CHOL" ? "Antibiotics and cultures started. They control the bacteraemia, but the obstructed duct still needs drainage." : "Empirical antibiotics started (Gram-negatives, enterococci and anaerobes), to be narrowed by culture."); }
    else if (id === "resus") { st.resus = true; ui.refresh("Fluids and organ support started (vasopressor if needed). This buys time for drainage; it does not replace it."); }
    else if (id === "stent") { if (!st.stent) { st.stent = true; if (st.hD == null) st.hD = st.h; ui.refresh("ERCP: a stent is placed across the blockage. Drainage is quick and simple, which suits an unstable patient; the stone can be removed later."); } }
    else if (id === "asp") { if (!st.asp) { st.asp = true; ui.refresh(sizeCm() >= 5 ? "Needle aspiration done. Large cavities often re-fill: a catheter drain is usually preferred above about 5 cm." : "Needle aspiration done under ultrasound; the small cavity collapses."); } }
    else if (id === "src") { st.srcCtl = true; ui.refresh(st.src === "bil" ? "Biliary source controlled (ERCP or biliary drain). No more bacteria reach the liver along the ducts." : "Bowel source treated (appendicectomy, colonic source dealt with). No more bacteria arrive in the portal blood."); }
    else if (id === "metro") { st.metro = true; ui.refresh("Metronidazole started, with a luminal amoebicide to follow. Fever and pain usually ease within about 3 days."); }
    else if (id === "surg") { if (!st.surg) { st.surg = true; ui.refresh("Surgical drainage: the cavity is opened and drained, the rupture is washed out. Reserved for rupture, peritonitis or failed drainage."); st.dr = 1; st.cath = true; } }
    else if (id === "tab-chol") setTab("CHOL"); else if (id === "tab-absc") setTab("ABSC");
    else if (id === "reset") build();
  }

  /* ---------- readout ---------- */
  function est() { const s = sep(), p = pressure(), sz = sizeCm(); return { s, p, sz, g: grade(), wbc: Math.round(8 + 14 * s), map: Math.round(88 - 38 * s), lac: +(1 + 4.5 * s * s).toFixed(1), bili: +(1 + (st.tab === "CHOL" ? 8 * (1 - Math.exp(-expo() / 24)) * (1 - 0.6 * st.rel) : 0)).toFixed(1), tmp: +(36.8 + 2.7 * s).toFixed(1), cbd: Math.round(5 * ductK()) }; }
  function bodyMap() {
    const e = est(), map = {}, tb = st.tab; if (tb === "NORMAL") { map.liver = "info"; return { map, marks: {} }; }
    map.liver = tb === "CHOL" ? (e.s > 0.4 ? 3 : 2) : e.sz > 5 ? 3 : e.sz > 0.3 ? 2 : 1; map.abdomen = e.s > 0.3 ? 2 : 1;
    if (e.s > 0.55) { map["lung-R"] = 2; map["lung-L"] = 2; map["kidney-R"] = 2; map["kidney-L"] = 2; map.heart = 1; }
    if (dec() && e.s < 0.25 || st.dr > 0.8 && e.s < 0.25) map.liver = "rec"; return { map, marks: {} };
  }
  function obs() {
    const e = est(), tb = st.tab, bm = bodyMap(); let params = [], lead = [];
    if (tb === "NORMAL") { params = [{ k: "Bile duct pressure", v: "9 cmH₂O", tone: "ok" }, { k: "Common bile duct", v: "about 5 mm", tone: "ok" }, { k: "Bile", v: "sterile, flowing", tone: "ok" }, { k: "Liver", v: "normal", tone: "ok" }]; lead.push("Healthy liver and biliary tree. Pick Cholangitis, Pyogenic abscess or Amoebic abscess."); }
    else if (tb === "CHOL") {
      params = [{ k: "Duct pressure", v: Math.round(e.p) + " cmH₂O", tone: e.p > 25 ? "bad" : e.p > 15 ? "warn" : "ok" }, { k: "Common bile duct", v: e.cbd + " mm", tone: e.cbd > 8 ? "warn" : "ok" }, { k: "TG18 severity", v: "Grade " + e.g, tone: e.g === "III" ? "bad" : e.g === "II" ? "warn" : "ok" }, { k: "Bilirubin", v: e.bili + " mg/dL", tone: e.bili > 5 ? "bad" : e.bili > 2 ? "warn" : "ok" },
        { k: "Temp · WBC", v: e.tmp + " °C · " + e.wbc + "k", tone: e.s > 0.3 ? "warn" : "ok" }, { k: "MAP · lactate", v: e.map + " mmHg · " + e.lac, tone: e.map < 65 ? "bad" : e.lac > 2 ? "warn" : "ok" }, { k: "Drainage", v: st.stent ? "ERCP stent" : st.stoneOut ? "stone removed (ERCP)" : st.ptbd ? "percutaneous (PTBD)" : "none", tone: dec() ? "ok" : "bad" }, { k: "Cholangitic abscesses", v: microN() ? microN() + " small foci" : "none", tone: microN() ? "bad" : "ok" }];
      if (!dec()) lead.push(e.g === "III" ? "Grade III: organ dysfunction. Support first, then urgent biliary drainage once stable. Antibiotics alone will not clear an obstructed duct." : e.g === "II" ? "Grade II: early biliary drainage is advised (within about 48 hours of admission)." : "Grade I: antibiotics and fluids may be enough; drain if there is no response in about 24 hours.");
      else lead.push(st.rel < 0.9 ? "Decompressing: the pressure is falling and the bacteraemia is clearing." : "Decompressed. Continue antibiotics for about 4 to 7 days after source control (about 2 weeks if Gram-positive bacteraemia), then arrange stone clearance and the gallbladder.");
      if (expo() >= 48 && !st.hD) lead.push("Infected bile under pressure for days has seeded small abscesses through the liver.");
    } else {
      const am = tb === "AMEB";
      params = [{ k: "Cavity size", v: e.sz > 0.25 ? e.sz.toFixed(1) + " cm" : "resolved", tone: e.sz > 7 ? "bad" : e.sz > 4 ? "warn" : "ok" }, { k: "Site", v: st.lobe === "R" ? "right lobe" : "left lobe", tone: st.lobe === "L" ? "warn" : "info" }, { k: "Contents", v: am ? "anchovy paste, sterile" : st.dm ? "pus + gas (Klebsiella)" : "pus", tone: "info" }, { k: "Wall", v: Math.round(smooth(clamp(st.h / (am ? 14 : 18), 0, 1)) * 100) + "%", tone: "info" },
        { k: "Temp · WBC", v: e.tmp + " °C · " + e.wbc + "k", tone: e.s > 0.3 ? "warn" : "ok" }, { k: "Source", v: am ? (st.srcCtl ? "colon treated" : "colon (amoebiasis)") : st.src === "bil" ? (st.srcCtl ? "biliary: controlled" : "biliary: not yet controlled") : st.src === "portal" ? (st.srcCtl ? "bowel: controlled" : "bowel: not yet controlled") : "cryptogenic", tone: st.srcCtl || st.src === "crypto" ? "ok" : "warn" },
        { k: "Drainage", v: st.surg ? "surgical" : st.cath ? "catheter" : st.asp ? "needle aspiration" : "none", tone: st.cath || st.asp || st.surg ? "ok" : "info" }, { k: "Rupture risk", v: ruptured() ? "RUPTURED" : cm0() > 6 ? "high" : am && st.lobe === "L" ? "pericardial (left lobe)" : "low", tone: ruptured() ? "bad" : cm0() > 6 || (am && st.lobe === "L") ? "warn" : "ok" }];
      if (ruptured()) lead.push("The undrained cavity has ruptured into the abdomen: peritonitis. This needs urgent surgery.");
      else if (sizeCm() > 5 && !st.cath && !st.surg) lead.push("A cavity above about 5 cm: add a catheter drain" + (am ? " (or aspirate), particularly for a left-lobe site or if there is no response by about 5 to 7 days." : ", with antibiotics."));
      else if (st.cath && st.dr > 0.8) lead.push("Cavity collapsed around the catheter. Keep antibiotics going, remove the catheter when the output is low and the cavity has closed, and make sure the source is dealt with.");
      else lead.push(am ? "Metronidazole and a luminal agent treat it; most do not need drainage." : "Antibiotics plus drainage when it is large, and look for the source.");
    }
    return { params, body: bm.map, marks: bm.marks, note: lead.join(" ") };
  }
  const info = () => { const c = cur(); return { anat: c.anat, patho: c.patho, interv: c.interv }; };
  function clin() {
    const L = [], tb = st.tab, e = est();
    if (tb === "CHOL") {
      L.push(["Diagnosis (TG18)", "Systemic inflammation (fever or chills, WBC under 4 or over 10 ×10⁹/L, CRP at least 1 mg/dL) plus cholestasis (jaundice, bilirubin at least 2 mg/dL, or abnormal liver enzymes above 1.5 times normal) plus imaging (duct dilatation and evidence of a cause such as a stone or stricture)."]);
      L.push(["Severity (TG18)", "Grade III (severe): dysfunction of any one organ: hypotension needing vasopressor, confusion, PaO₂/FiO₂ below 300, oliguria or creatinine above 2 mg/dL, INR above 1.5, or platelets below 100 ×10⁹/L. Grade II (moderate): any two of WBC above 12 or below 4, fever 39 °C or more, age 75 or more, bilirubin 5 mg/dL or more, low albumin. Grade I: neither. Illustrative here: Grade " + e.g + "."]);
      L.push(["Drainage by grade", "Grade I: antibiotics and fluids; drain if no response in about 24 hours. Grade II: early drainage. Grade III: urgent drainage once organ support has stabilised the patient. Drainage is the source control; it is not optional in obstruction."]);
      L.push(["How to drain", "ERCP is first line: sphincterotomy and stone extraction, or a plastic stent or nasobiliary drain when the patient is unstable or the stone is difficult. Percutaneous transhepatic drainage (PTBD) or EUS-guided drainage when ERCP fails or anatomy is altered."]);
      L.push(["Cultures and antibiotics", "Blood cultures always; bile culture at drainage. Cover Gram-negatives and anaerobes, add enterococcal cover in severe disease; follow the local antibiogram. After source control, about 4 to 7 days; about 2 weeks if Gram-positive bacteraemia."]);
      L.push(["Afterwards", "Clear the duct if only a stent was placed, and remove the gallbladder if gallstones are the cause (cholecystectomy, ideally in the same admission for mild disease)."]);
      L.push(["Reference", "Tokyo Guidelines 2018 (TG18): diagnostic criteria, severity grading and flowchart for acute cholangitis. Follow your local pathway."]);
    } else if (tb === "ABSC") {
      L.push(["Diagnosis", "Fever, right upper quadrant pain, raised WBC and alkaline phosphatase. Ultrasound or contrast CT shows the cavity (gas in the cavity is typical of Klebsiella). Blood cultures are positive in up to half; send aspirate for Gram stain and culture."]);
      L.push(["Look for the source", "Biliary disease (about half), bowel pathology such as appendicitis or diverticulitis, dental or endocarditis seeding, and diabetes. Hypervirulent Klebsiella: look for eye (endophthalmitis) and brain spread."]);
      L.push(["Antibiotics", "Cover enteric Gram-negatives, enterococci and anaerobes (for example a third-generation cephalosporin or piperacillin–tazobactam with metronidazole; a carbapenem where ESBL organisms are likely), then narrow by culture. Usually two to six weeks with adequate drainage, with an early oral switch once improving."]);
      L.push(["Drainage and source control", "Drainage is the main treatment: ultrasound- or CT-guided needle aspiration for small cavities, a pigtail catheter for larger ones (above about 5 cm) or when aspiration fails. Surgery for rupture, peritonitis, multiloculated cavities or failed percutaneous drainage. Control the source or the abscess re-forms."]);
      L.push(["Reference", "Current clinical practice summaries for pyogenic liver abscess (infectious diseases and hepatology references). Follow your local protocol."]);
    } else if (tb === "AMEB") {
      L.push(["Diagnosis", "Recent travel or diarrhoea, fever and right upper quadrant pain; a solitary right-lobe cavity on ultrasound; amoebic serology (usually positive); stool tests are often negative. A prompt response to metronidazole supports the diagnosis."]);
      L.push(["Treatment", "Metronidazole for 7 to 10 days, then a luminal amoebicide (paromomycin or diloxanide furoate) to eradicate gut cysts."]);
      L.push(["Aspiration or drainage", "Not routine. Add it for large cavities (about 5 cm or more), a left-lobe site with risk of pericardial rupture, impending rupture, an unclear diagnosis (to exclude a bacterial abscess) or no response after about 5 to 7 days of treatment."]);
      L.push(["Complications", "Rupture into the peritoneum, pleura or pericardium; secondary bacterial infection. A left-lobe abscess needs close watch."]);
      L.push(["Reference", "Current clinical practice summaries for amoebic liver abscess. Follow your local protocol."]);
    } else {
      L.push(["Normal anatomy", "The biliary tree is a one-way, low-pressure system. Learn where the stone, the cut, the stent and the drain act in 3D, then switch to a disease."]);
    }
    return { lines: L };
  }

  const lab = {
    id: "hepbil", name: "Liver & Biliary Lab", tag: "Cholangitis and liver abscess", icon: "🟢",
    tabs: ORDER.map((k) => ({ id: k, label: T[k].label, sub: T[k].sub })), get tab() { return st.tab; },
    selectHint: "Start with Cholangitis: drag the stone out, or place a stent, and watch the pressure and the bacteria. Then try the abscesses.",
    opts: () => [st.tab !== "NORMAL" && { id: "ghost", label: "See-through liver", cur: st.ghost ? "1" : "0", choices: [["0", "Solid"], ["1", "See-through"]] }, isAb() && { id: "lobe", label: "Site", cur: st.lobe, choices: [["R", "Right lobe"], ["L", "Left lobe"]] }, st.tab === "ABSC" && { id: "src", label: "Source", cur: st.src, choices: [["bil", "Biliary"], ["portal", "Bowel (portal)"], ["crypto", "Cryptogenic"]] }, st.tab === "ABSC" && { id: "dm", label: "Diabetes (gas-forming)", cur: st.dm ? "1" : "0", choices: [["0", "No"], ["1", "Yes"]] }].filter(Boolean),
    slider: () => ({ id: "t", label: st.tab === "CHOL" ? "Hours since the duct blocked" : "Days since onset", min: cur().min, max: cur().max, step: 1, v: clamp(st.h, cur().min, cur().max), locked: st.tab === "NORMAL", unit: cur().unit }),
    actions: () => (st.tab === "NORMAL" ? [{ id: "tab-chol", label: "BLOCK THE DUCT", hint: "Start cholangitis.", off: false }, { id: "tab-absc", label: "SEED AN ABSCESS", hint: "Start a pyogenic liver abscess.", off: false }] :
      st.tab === "CHOL" ? [{ id: "abx", label: "ANTIBIOTICS", hint: "Cultures first, then broad cover.", off: st.abx }, { id: "resus", label: "FLUIDS + ORGAN SUPPORT", hint: "Resuscitate; buys time.", off: st.resus }, { id: "stent", label: "ERCP · STENT", hint: "Quick decompression across the stone.", off: st.stent || st.stoneOut }, { id: "reset", label: "RESET", hint: "Start again.", off: false }] :
      st.tab === "ABSC" ? [{ id: "abx", label: "ANTIBIOTICS", hint: "Empirical, then by culture.", off: st.abx }, { id: "asp", label: "NEEDLE ASPIRATION", hint: "Ultrasound-guided; small cavities.", off: st.asp || st.cath }, { id: "src", label: "CONTROL THE SOURCE", hint: "Biliary drain or bowel focus.", off: st.srcCtl || st.src === "crypto" }, { id: "surg", label: "SURGICAL DRAINAGE", hint: "Rupture, peritonitis or failed drain.", off: st.surg }, { id: "reset", label: "RESET", hint: "Start again.", off: false }] :
      [{ id: "metro", label: "METRONIDAZOLE", hint: "Then a luminal amoebicide.", off: st.metro }, { id: "asp", label: "NEEDLE ASPIRATION", hint: "Large, left lobe or no response.", off: st.asp || st.cath }, { id: "src", label: "LUMINAL AMOEBICIDE", hint: "Clears the gut cysts.", off: st.srcCtl }, { id: "reset", label: "RESET", hint: "Start again.", off: false }]),
    dragHint: "Cholangitis: drag the stone out of the duct (ERCP basket), or drag the catheter tip into the glowing bile duct (percutaneous drain). Abscess: drag the catheter tip into the middle of the cavity.",
    views: [{ id: "front", label: "Front", f: () => ({ ry: 0.12, rx: 0.1, d: 5.7, tx: -0.2, ty: 0.1 }) }, { id: "hilum", label: "Hilum and duct", f: () => ({ ry: 0.1, rx: 0.1, d: 3.4, tx: -0.3, ty: -0.05 }) }, { id: "right", label: "Right side", f: () => ({ ry: 1.2, rx: 0.1, d: 6, tx: -0.4, ty: 0.3 }) }, { id: "top", label: "From above", f: () => ({ ry: 0.2, rx: 1.15, d: 6, tx: -0.3, ty: 0.3 }) }],
    credit: CREDIT_BP3D,
    legend: [["#b4594b", "Liver"], ["#7fc46a", "Bile"], ["#d4cf55", "Infected bile / pus"], ["#8a5a40", "Amoebic pus"], ["#5b78e6", "Portal / veins"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; if (liver) liver.mesh.material.opacity = on ? 0.25 : 0.62; }, tabLabel: () => cur().label, debug: () => ({ stone, ptbd, drain, st }),
  };
  build();
  return lab;
}
