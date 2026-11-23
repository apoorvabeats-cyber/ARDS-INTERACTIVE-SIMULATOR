/* PANCREATITIS LAB on the PATHODYNAMICS engine.
   From a normal gland to oedematous and necrotising pancreatitis, then the collections (APFC, ANC, WON, infected necrosis)
   and the step-up approach: support and antibiotics, drainage (endoscopic stent or percutaneous drain), then necrosectomy.
   Terms follow the Revised Atlanta Classification. Management content aligned to ACG 2024, the AGA 2020 necrosis update and the Revised Atlanta Classification (checked Nov 2026). Numbers are illustrative.  */
import { THREE, C, smooth } from "../stage.js?v=20261123l";
import { clamp } from "./common.js?v=20261123l";

const T = {
  NORMAL: { label: "Normal", sub: "Healthy pancreas", d0: 0, d1: 14, dv: 0,
    anat: "The pancreas lies behind the stomach in the retroperitoneum. The head sits in the C-loop of the duodenum beside the bile duct, the neck lies in front of the portal confluence of the splenic and superior mesenteric veins, and the body and tail run left towards the splenic hilum.",
    patho: "In the healthy gland, digestive enzymes are made as inactive pro-enzymes (zymogens) and are activated only in the duodenum. Blood supply comes from branches of the coeliac and superior mesenteric arteries; the splenic vein runs along the back of the gland.",
    interv: "Nothing to treat here. Use the INDUCE INJURY button in step 3 to start an attack and watch what happens when acinar cells activate enzymes inside the gland." },
  INT: { label: "Interstitial", sub: "Oedematous pancreatitis", d0: 0, d1: 14, dv: 1, oed: 0.7, nf0: 0, nfT: 1,
    anat: "In interstitial oedematous pancreatitis the gland is swollen and its outline is blurred, with a little peripancreatic fat stranding, but it still enhances normally on contrast CT.",
    patho: "Premature enzyme activation injures acinar cells and triggers inflammation, oedema and a systemic inflammatory response. Most attacks (about 80%) are mild and settle within a week with supportive care, without necrosis or organ failure.",
    interv: "Supportive: analgesia, moderate goal-directed fluid resuscitation, early oral or enteral feeding as tolerated, and treatment of the cause (for gallstones, cholecystectomy in the same admission for mild disease). Antibiotics are not given prophylactically." },
  NEC: { label: "Necrotising", sub: "Gland and fat necrosis", d0: 0, d1: 14, dv: 1, oed: 0.5, nfMax: 0.45,
    anat: "In necrotising pancreatitis part of the gland, the peripancreatic fat, or both do not enhance on contrast CT. The neck and body are most often affected, because their blood supply is a watershed.",
    patho: "Microvascular injury and ischaemia on top of enzymatic injury kill tissue. Necrosis declares itself over the first days, so early CT can underestimate it. Persistent organ failure (lungs, kidney, circulation) and later infection determine the outcome.",
    interv: "Intensive support, enteral nutrition, organ support as needed. Delay invasive intervention if possible: the aim is to let necrosis become walled-off (about 4 weeks). Imaging is best at 72–96 hours or when the picture changes." },
  APFC: { label: "APFC", sub: "Acute peripancreatic fluid collection", d0: 0, d1: 42, dv: 7, oed: 0.4, nfMax: 0, col: 1, size: [0.25, 0.7], solid: 0, wallDay: 28,
    anat: "An acute peripancreatic fluid collection (APFC) is a homogeneous collection of fluid next to the pancreas in the first 4 weeks of interstitial oedematous pancreatitis. It has no wall of its own.",
    patho: "Inflammation leaks fluid into the retroperitoneum and the lesser sac. Most APFCs are sterile and reabsorb on their own. A collection that persists beyond 4 weeks and acquires a wall is called a pseudocyst.",
    interv: "Usually no drainage: observe. Drainage is reserved for symptomatic collections (pain, gastric outlet obstruction, biliary obstruction) or infection, and generally after about 4 weeks when a wall has formed." },
  ANC: { label: "ANC", sub: "Acute necrotic collection", d0: 3, d1: 35, dv: 10, oed: 0.4, nfMax: 0.55, col: 1, size: [0.35, 0.75], solid: 1, wallDay: 28,
    anat: "An acute necrotic collection (ANC) contains both fluid and necrotic debris, and lies in or beside the pancreas in the first 4 weeks. It has no mature wall, so it is heterogeneous and poorly defined.",
    patho: "Dead pancreatic and fat tissue gradually liquefies while the inflamed tissue around it tries to contain it. This is the stage when a collection is most likely to be unstable and also most likely to become infected from the gut.",
    interv: "Conservative management whenever possible. If infection is suspected, antibiotics first (with good tissue penetration); drainage can often be postponed until the collection is walled-off." },
  WON: { label: "WON", sub: "Walled-off necrosis", d0: 28, d1: 70, dv: 42, oed: 0.2, nfMax: 0.55, col: 1, size: [0.6, 0.75], solid: 1, wallDay: 0, wallMin: 0.85,
    anat: "Walled-off necrosis (WON) is a mature, encapsulated collection of pancreatic and peripancreatic necrosis with a thick inflammatory wall, usually after about 4 weeks.",
    patho: "The wall separates the collection from the surrounding tissue and makes endoscopic or percutaneous access safe. It can stay sterile and stay silent, or become infected, compress the stomach or bile duct, or erode into a vessel.",
    interv: "Intervene for infection, gastric outlet or biliary obstruction, or persistent symptoms. Endoscopic transmural drainage with a lumen-apposing metal stent (LAMS) is usually preferred when the collection abuts the stomach; a percutaneous drain is an alternative or an addition. Solid debris often needs necrosectomy." },
  INF: { label: "Infected", sub: "Infected necrosis", d0: 14, d1: 70, dv: 28, oed: 0.2, nfMax: 0.55, col: 1, size: [0.55, 0.8], solid: 1, wallDay: 28, inf: true,
    anat: "Infected necrosis shows gas bubbles within the collection on CT, or is proven by culture. The collection contains pus and infected debris.",
    patho: "Gut bacteria colonise the necrosis, usually after the second week. Sepsis, fever and a rising CRP follow, and organ failure can develop or worsen. Infected necrosis carries a considerably higher mortality than sterile necrosis.",
    interv: "Antibiotics, and drainage when infected necrosis is established. The step-up approach (drainage first, then necrosectomy only if needed) is the standard. Randomised trials (PANTER, TENSION, MISER, POINTER) support minimally invasive, endoscopic-first and postponed approaches; some patients improve on antibiotics alone." },
};
const TABS = ["NORMAL", "INT", "NEC", "APFC", "ANC", "WON", "INF"];

export default function create(S, ui) {
  const st = { tab: "WON", day: 35, inf: false, abx: false, support: false, stent: false, perc: false, sess: 0, dr: 0, grab: false, ghost: false, cause: "gallstone", wallLeak: false };
  const cur = () => T[st.tab];
  let M = {}, tis = [], coll = null, lams = null, drain = null, debris = [], gas = [], panGrp = null, dirty = true, accT = 0;
  const SP = new THREE.Vector3(0.48, 0.3, 0.37), CP = new THREE.Vector3(0.5, 0.27, 0.2);

  function lobulate(g, amp, f) { g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), nn = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i); const k = amp * (0.6 * Math.sin(f * v.x + 1) * Math.sin(f * 1.3 * v.y + 2) + 0.4 * Math.sin(f * 1.7 * v.z + v.x * 3)); p.setXYZ(i, v.x + nn.x * k, v.y + nn.y * k, v.z + nn.z * k); } g.computeVertexNormals(); return g; }
  function build() {
    S.clear(); M = {}; tis = []; debris = []; gas = []; coll = lams = drain = null;
    const grp = S.add(new THREE.Group()); M.grp = grp;
    const plain = (geo, hex, pos, o) => { const m = new THREE.Mesh(geo, S.mat(hex, o)); if (pos) m.position.set(...pos); grp.add(m); return m; };
    /* gland: head + body/tail tube, all lobulated, tagged along its length */
    panGrp = new THREE.Group(); panGrp.position.set(0.3, 0, 0.05); grp.add(panGrp); M.pan = panGrp;
    const path = new THREE.CatmullRomCurve3([[-0.75, -0.2, 0.02], [-0.4, -0.02, 0.1], [0.0, 0.07, 0.12], [0.5, 0.14, 0.05], [1.0, 0.27, -0.03], [1.4, 0.52, -0.1]].map((p) => new THREE.Vector3(p[0] - 0.3, p[1], p[2] - 0.05)));
    const tg = new THREE.TubeGeometry(path, 90, 0.13, 20, false); lobulate(tg, 0.022, 26);
    const cls = (P) => { const x = P.x + 0.3; const tag = x < -0.5 ? "head" : x < 0 ? "neck" : x < 0.9 ? "body" : "tail"; const n = 0.5 + 0.5 * Math.sin(8 * P.x + 3 * P.y) * Math.sin(9 * P.z + 2); return { tag, rank: clamp(Math.abs(x - 0.25) * 0.55 + 0.3 * n, 0, 1), h: n, sh: 0.9 + 0.1 * Math.sin(40 * P.x + 20 * P.y) }; };
    const body = S.tissue(tg, 0xe3b58d, cls, { shininess: 25 }); panGrp.add(body.mesh); tis.push(body);
    const hg = new THREE.SphereGeometry(1, 40, 30); hg.scale(0.27, 0.3, 0.2); hg.translate(-0.78 - 0.3, -0.27, 0.02 - 0.05); lobulate(hg, 0.02, 22); const head = S.tissue(hg, 0xe3b58d, cls, { shininess: 25 }); panGrp.add(head.mesh); tis.push(head);
    body.mesh.userData.hemi = 1;
    const duo = S.tube([[-0.45, 0.38, 0.05], [-0.98, 0.25, 0.0], [-1.1, -0.35, 0.0], [-0.85, -0.78, 0.05], [-0.2, -0.88, 0.05], [0.45, -0.82, 0.0]], 0.1, 0xc99a6a, { seg: 40 }); grp.add(duo);
    const cbd = S.tube([[-0.62, 0.85, 0.02], [-0.7, 0.4, 0.0], [-0.74, -0.15, 0.0]], 0.04, 0x6ab06a); grp.add(cbd);
    if (st.tab !== "NORMAL" && st.cause === "gallstone") { const gs = plain(new THREE.SphereGeometry(0.06, 14, 10), 0xf0d060, [-0.74, -0.38, 0.02]); gs.material.emissive = new THREE.Color(0x403000); }
    const stom = plain((() => { const g = new THREE.SphereGeometry(1, 44, 32); g.scale(0.98, 0.56, 0.42); return g; })(), 0xd88a8a, [0.45, 0.58, 0.74], { transparent: true, opacity: 0.32, depthWrite: false }); stom.userData.hemi = 1; stom.renderOrder = 3; M.stom = stom;
    plain((() => { const g = new THREE.SphereGeometry(1, 28, 20); g.scale(0.2, 0.4, 0.2); return g; })(), 0x7a5a9a, [1.72, 0.6, -0.25]);
    [[1.4, 0.15], [-1.1, 0.15]].forEach(([x, y]) => plain((() => { const g = new THREE.SphereGeometry(1, 24, 18); g.scale(0.2, 0.32, 0.17); return g; })(), 0xb06a5a, [x, y, -0.55]));
    grp.add(S.tube([[0.1, 1.1, -0.38], [0.1, -1.1, -0.38]], 0.09, 0xd9524a, { emis: 0x200000 }));
    grp.add(S.tube([[1.5, 0.5, -0.2], [0.9, 0.2, -0.12], [0.15, 0.0, -0.09], [-0.15, -0.12, -0.06]], 0.05, 0x5b78e6)); grp.add(S.tube([[-0.15, -0.12, -0.06], [-0.12, -0.6, -0.06], [-0.1, -1.1, -0.06]], 0.05, 0x5b78e6));
    /* collection: fluid + wall + debris + gas */
    coll = new THREE.Group(); coll.position.copy(CP); grp.add(coll);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), new THREE.MeshPhongMaterial({ color: 0xf2d58a, transparent: true, opacity: 0.5, depthWrite: false, shininess: 90 })); fl.renderOrder = 4; coll.add(fl);
    const wl = new THREE.Mesh(new THREE.SphereGeometry(1.07, 36, 26), new THREE.MeshPhongMaterial({ color: 0xb78f68, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false })); wl.renderOrder = 4; coll.add(wl);
    M.fl = fl; M.wl = wl;
    for (let i = 0; i < 16; i++) { const g = new THREE.IcosahedronGeometry(0.06 + 0.04 * ((i * 7) % 5) / 4, 1); const m = new THREE.Mesh(g, S.mat(0x8a5f45, { shininess: 10 })); const a = i * 2.399, r = 0.25 + 0.5 * (((i * 37) % 10) / 10); m.userData.p = new THREE.Vector3(Math.cos(a) * r, Math.sin(i * 1.7) * 0.4 * r, Math.sin(a) * r * 0.8); coll.add(m); debris.push(m); }
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })); m.userData.p = new THREE.Vector3(-0.4 + (i % 3) * 0.35, 0.35 + 0.1 * (i % 2), -0.3 + Math.floor(i / 3) * 0.3); coll.add(m); gas.push(m); }
    /* endoscopic stent (LAMS): drag it from the stomach wall into the collection */
    const lg = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16); lg.rotateX(Math.PI / 2); lams = new THREE.Mesh(lg, S.mat(0xcfe9ff, { emissive: 0x143040 })); lams.userData.drag = true; lams.position.copy(SP); lams.rotation.x = 0.0; lams.renderOrder = 6; grp.add(lams); S.pick.push(lams);
    const fl1 = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffd166 })); lams.add(fl1); fl1.position.z = 0.09; M.ring = fl1;
    M.lab = S.label("stomach wall", [SP.x, SP.y + 0.22, SP.z + 0.1], "#ffd166"); grp.add(M.lab);
    Object.assign(st, { day: cur().dv, stent: false, perc: false, sess: 0, dr: 0, abx: false, support: false, wallLeak: false });
    S.view({ ry: 0.25, rx: 0.18, d: 6.2, tx: 0.3, ty: 0.1, tz: 0 }); dirty = true;
  }

  /* ---------- the disease model ---------- */
  const day = () => st.day;
  const isInf = () => cur().inf || (st.inf && (st.tab === "ANC" || st.tab === "WON"));
  function nf() { const c = cur(); if (c.nfMax == null) return 0; return c.nfMax * (1 - Math.exp(-Math.max(0.2, day()) / 1.8)); }
  function wallF() { const c = cur(); if (!c.col) return 0; const f = c.wallMin || 0; return clamp(Math.max(f, smooth(clamp((day() - 14) / 21, 0, 1))), 0, 1); }
  function sizeNow() { const c = cur(); if (st.tab === "NEC") return day() > 5 ? 0.18 * clamp((day() - 5) / 7, 0, 1) : 0; if (!c.col) return 0; const [a, b] = c.size; let s = a + (b - a) * smooth(clamp(day() / 28, 0, 1)); if (st.tab === "APFC" && day() > 28 && !st.stent) s *= 1; return s; }
  const resid = () => { let f = 1; if (st.stent) f *= 1 - 0.8 * st.dr; if (st.perc) f *= 1 - 0.55 * st.dr; return f; };
  const debrisN = () => (cur().solid ? Math.round(16 * (1 - st.sess / 3) * (st.stent ? 1 - 0.1 * st.dr : 1)) : st.tab === "NEC" && day() > 5 ? 3 : 0);
  function sepsis() { if (!isInf()) return clamp(nf() * 0.7 * (day() < 10 ? 1 : 0.6), 0, 0.6) * (st.support ? 0.9 : 1); const dr = (st.stent || st.perc) ? st.dr : 0; return clamp(0.85 - 0.45 * dr - 0.3 * (st.abx ? 1 : 0) - 0.2 * (st.sess / 3), 0.08, 0.9); }
  function paintAll() {
    const n = nf(), oed = (cur().oed || 0) * (st.tab === "INT" ? Math.exp(-Math.max(0, day() - 4) / 4) : 1), core = C(0x5a4034), pale = C(0xf0d9a0);
    tis.forEach((t) => t.paint((tag, rank, h, out) => { if (oed > 0) out.lerp(pale, 0.5 * oed); if (rank < n && h < 0.95) out.lerp(core, 0.88); }));
  }
  function frame(dt) {
    const c = cur(), t = S.time(); st.dr = (st.stent || st.perc) ? Math.min(1, st.dr + dt * 0.35) : 0;
    const oed = (c.oed || 0) * (st.tab === "INT" ? Math.exp(-Math.max(0, day() - 4) / 4) : 1); M.pan.scale.setScalar(1 + 0.22 * oed);
    const size = sizeNow(), vis = size > 0.02, inf = isInf(), r = resid(), sc = (0.12 + 0.4 * size) * (0.2 + 0.8 * r);
    coll.visible = vis; coll.scale.set(sc * 1.5, sc * 1.0, sc * 0.75); M.fl.material.color.setHex(inf ? 0xb5c256 : 0xf2d58a); M.fl.material.opacity = (st.tab === "ANC" ? 0.42 : 0.5) * (st.ghost ? 0.7 : 1);
    M.wl.material.opacity = 0.08 + 0.75 * wallF(); const dn = debrisN(); debris.forEach((m, i) => { m.visible = i < dn; m.position.copy(m.userData.p).multiplyScalar(0.95); m.rotation.y = t * 0.1 + i; });
    gas.forEach((m, i) => { m.visible = inf && !(st.stent && st.dr > 0.6); m.position.copy(m.userData.p).multiplyScalar(0.9); m.position.y += 0.03 * Math.sin(t * 2 + i); });
    if (lams) { lams.visible = vis; M.ring.visible = !st.stent; lams.scale.setScalar(st.grab ? 1.15 : 1); if (!st.grab && !st.stent) lams.position.lerp(SP, Math.min(1, dt * 8)); if (st.stent) lams.position.lerp(SP.clone().lerp(CP, 0.45), Math.min(1, dt * 6)); }
    M.lab.visible = vis && !st.stent; accT += dt; if (accT > 0.08) { accT = 0; paintAll(); dirty = false; }
    M.stom.material.opacity += ((st.ghost ? 0.1 : 0.32) - M.stom.material.opacity) * Math.min(1, dt * 5);
  }
  S.hooks.push(frame);

  /* ---------- drag the stent into the collection ---------- */
  S.onGrab = (o) => { if (o === lams && !st.stent) { st.grab = true; } };
  S.onDrag = (o, w) => { if (!st.grab) return; const p = M.grp.worldToLocal(w.clone()); lams.position.copy(p); const d = p.distanceTo(CP); ui.hint(d < 0.3 ? "Release to deploy the stent" : "Drag the stent through the stomach wall into the collection…", d < 0.3); };
  S.onDrop = () => { if (!st.grab) return; st.grab = false; const d = lams.position.distanceTo(CP); if (d < 0.3) { st.stent = true; const wf = wallF(); st.wallLeak = wf < 0.5; ui.hint("", false); ui.refresh(st.wallLeak ? "Stent deployed into an immature collection. Risk of leak and bleeding. Wait for a wall to form whenever possible." : "Stent deployed. The collection drains into the stomach."); } else ui.hint("Drag the stent further, into the middle of the collection.", false); };
  S.onTap = () => {};
  function setTab(k) { st.tab = k; build(); }
  function setOpt(id, v) { if (id === "inf") { st.inf = v === "1"; } else if (id === "cause") { st.cause = v; build(); } else if (id === "ghost") st.ghost = v === "1"; dirty = true; }
  function setT(v) { st.day = v; dirty = true; }
  function act(id) {
    if (id === "inject") { setTab("INT"); ui.refresh("Acinar cells activate enzymes inside the gland. The pancreas swells: interstitial oedematous pancreatitis."); }
    else if (id === "support") { st.support = true; ui.refresh("Support started: moderate fluids, analgesia, early enteral feeding."); }
    else if (id === "abx") { st.abx = true; ui.refresh("Antibiotics started (targeted to proven or strongly suspected infection)."); }
    else if (id === "perc") { if (!st.perc && cur().col) { st.perc = true; const tube = S.tube([[2.0, 0.05, -0.55], [1.5, 0.12, -0.3], [CP.x + 0.2, CP.y, CP.z - 0.05]], 0.03, 0x66d9ff, { op: 0.85 }); M.grp.add(tube); drain = tube; ui.refresh("Percutaneous drain placed through the left flank. Fluid drains; solid debris stays."); } }
    else if (id === "necro") { if (st.stent && st.sess < 3) { st.sess++; ui.refresh("Endoscopic necrosectomy session " + st.sess + ": debris removed through the stent."); } }
    else if (id === "reset") build();
  }

  /* ---------- readout ---------- */
  function est() {
    const n = nf(), sep = sepsis(), size = sizeNow(), r = resid(), cm = Math.round((2 + 14 * size) * (0.15 + 0.85 * r) * 10) / 10, dn = debrisN();
    const lip = st.tab === "NORMAL" ? 1 : Math.max(1, Math.round(12 * Math.exp(-day() / 3))), crp = Math.round(8 + 230 * clamp(n * 1.3 + sep * 0.8 + (st.tab === "INT" ? 0.15 : 0), 0, 1) * (st.tab === "INT" && day() > 6 ? 0.4 : 1)), tmp = +(36.8 + 2.6 * sep).toFixed(1);
    const of = sep > 0.55 || (n > 0.3 && day() > 2 && sep > 0.35) ? "persistent" : n > 0.1 || cur().col ? "transient / none" : "none";
    const sev = st.tab === "NORMAL" ? "—" : of === "persistent" ? "Severe" : (n > 0 || cur().col) ? "Moderately severe" : "Mild";
    return { n, sep, size, cm, dn, lip, crp, tmp, of, sev };
  }
  function bodyMap() {
    const e = est(), map = {}, c = cur(); map.pancreas = st.tab === "NORMAL" ? "info" : e.n > 0.2 ? 3 : 2; if (st.tab !== "NORMAL") map.abdomen = e.sev === "Mild" ? 1 : 2;
    if (e.sep > 0.5) { map["lung-R"] = 2; map["lung-L"] = 2; map["kidney-R"] = 2; map["kidney-L"] = 2; map.heart = 1; } else if (e.sev === "Moderately severe" && e.n > 0.2) { map["lung-L"] = 1; }
    if (st.stent && st.dr > 0.8 && e.sep < 0.3) { map.pancreas = "rec"; } void c; return { map, marks: {} };
  }
  function obs() {
    const e = est(), c = cur(), bm = bodyMap(), drainTxt = st.stent ? "Endoscopic stent" + (st.perc ? " + percutaneous drain" : "") : st.perc ? "Percutaneous drain" : "None";
    const params = [
      { k: "Necrosis of gland", v: Math.round(e.n * 100) + "%", tone: e.n > 0.3 ? "bad" : e.n > 0 ? "warn" : "ok" },
      { k: "Collection size", v: c.col || st.tab === "NEC" ? (e.size > 0.02 ? e.cm + " cm" : "none") : "none", tone: e.cm > 8 ? "bad" : e.size > 0.02 ? "warn" : "ok" },
      { k: "Wall (encapsulation)", v: c.col ? Math.round(wallF() * 100) + "%" : "—", tone: wallF() > 0.6 ? "ok" : c.col ? "warn" : "info" },
      { k: "Infection", v: isInf() ? (e.sep > 0.5 ? "infected · septic" : "infected · treated") : "sterile", tone: isInf() ? (e.sep > 0.5 ? "bad" : "warn") : "ok" },
      { k: "Organ failure", v: e.of, tone: e.of === "persistent" ? "bad" : "ok" },
      { k: "Revised Atlanta severity", v: e.sev, tone: e.sev === "Severe" ? "bad" : e.sev === "Moderately severe" ? "warn" : "ok" },
      { k: "Lipase · CRP", v: "×" + e.lip + " ULN · " + e.crp + " mg/L", tone: "info" },
      { k: "Drainage", v: drainTxt, tone: st.stent || st.perc ? "ok" : "info" },
    ];
    const lead = [];
    if (st.tab === "NORMAL") lead.push("Healthy gland. Use INDUCE INJURY in step 3 to start an attack.");
    if (st.wallLeak) lead.push("Drained before a wall had formed: risk of leak, bleeding and a more complicated course.");
    if (isInf() && !(st.stent || st.perc)) lead.push("Infected necrosis causes fever, a rising CRP and organ failure. Antibiotics help, and drainage is the key step once infection is established.");
    if ((st.stent || st.perc) && e.dn > 3) lead.push("The fluid has drained but solid debris remains. If the patient is not improving, the next step is necrosectomy." + (st.stent ? " Use ENDOSCOPIC NECROSECTOMY." : ""));
    if (st.stent && e.dn <= 3 && st.dr > 0.8) lead.push("Cavity cleared and collapsing. Fever and CRP settle; the stent is removed later to avoid bleeding and buried-stent complications.");
    if (!lead.length) lead.push("Move the day slider to follow the natural history. " + (c.col ? "Watch the wall form around the collection." : ""));
    return { params, body: bm.map, marks: bm.marks, note: lead.join(" ") };
  }
  const info = () => { const c = cur(); return { anat: c.anat, patho: c.patho, interv: c.interv }; };

  function clin() {
    const e = est(), L = [], c = cur();
    L.push(["Diagnosis", "Two of three: typical upper-abdominal pain radiating to the back, serum lipase or amylase above 3 times the upper limit of normal, and characteristic imaging. Causes to look for: gallstones, alcohol, hypertriglyceridaemia, drugs, hypercalcaemia, post-ERCP."]);
    L.push(["Severity (Revised Atlanta)", "Mild: no organ failure and no local or systemic complication. Moderately severe: transient organ failure (under 48 h) or local complications. Severe: persistent organ failure (over 48 h). Illustrative here: " + e.sev + "."]);
    L.push(["First 72 hours", "Moderate goal-directed fluid resuscitation with a balanced crystalloid (aggressive fluid boluses increase complications), analgesia, early enteral feeding within about 24–72 hours (nasogastric or nasojejunal if oral is not tolerated), no prophylactic antibiotics. Urgent ERCP only for cholangitis or persistent biliary obstruction."]);
    L.push(["Imaging", "Contrast CT or MRI at 72–96 hours when the diagnosis is in doubt or the patient is not improving: non-enhancing parenchyma means necrosis, gas within a collection suggests infection, and a mature wall means WON or pseudocyst. Estimated collection size here: " + (e.size > 0.02 ? e.cm + " cm" : "none") + "."]);
    L.push(["Intervention: the step-up approach", "1) Support and, if infected, antibiotics. 2) Postpone invasive treatment, ideally to about 4 weeks, until the collection is walled-off, if the patient is stable. 3) Drain: endoscopic transmural (LAMS) or percutaneous. 4) Necrosectomy only if drainage fails to resolve it: endoscopic first, or video-assisted retroperitoneal debridement. Surgery is the last resort. Randomised trials support this order."]);
    L.push(["Cholecystectomy", "In mild biliary pancreatitis, cholecystectomy in the same admission; in necrotising disease, delay until collections resolve or after about 6 weeks."]);
    L.push(["Reference", "Reference: ACG 2024 acute pancreatitis guideline, AGA 2020 clinical practice update on pancreatic necrosis, IAP/APA, Revised Atlanta 2012. Follow your local pancreatitis pathway."]);
    void c; return { lines: L, draw: (el) => drawImaging(el, e) };
  }
  function drawImaging(el, e) {
    const mk = (title, f) => { const d = document.createElement("div"); d.className = "img"; const cv = document.createElement("canvas"); cv.width = 300; cv.height = 300; const t = document.createElement("small"); t.textContent = title; d.append(cv, t); el.append(d); f(cv.getContext("2d")); };
    const c = cur();
    mk("Contrast CT (schematic)", (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 300, 300); g.fillStyle = "#555"; g.beginPath(); g.ellipse(150, 150, 135, 105, 0, 0, 7); g.fill(); g.fillStyle = "#e8e8e8"; g.beginPath(); g.arc(150, 210, 20, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(142, 175, 9, 0, 7); g.fill();
      g.fillStyle = "#8a8a8a"; g.beginPath(); g.ellipse(150, 78, 80, 34, 0, 0, 7); g.fill();
      g.fillStyle = "#9c9c9c"; g.beginPath(); g.ellipse(150, 150, 92, 20, -0.05, 0, 7); g.fill(); if (e.n > 0) { g.fillStyle = "#3a3a3a"; g.beginPath(); g.ellipse(150, 150, 14 + 70 * e.n, 11, 0, 0, 7); g.fill(); }
      if (e.size > 0.02) { const r = (30 + 55 * e.size) * (0.2 + 0.8 * resid()); g.fillStyle = "#242424"; g.beginPath(); g.ellipse(165, 128, r * 1.2, r * 0.75, 0, 0, 7); g.fill(); if (wallF() > 0.2) { g.strokeStyle = `rgba(230,230,230,${0.25 + 0.7 * wallF()})`; g.lineWidth = 4; g.stroke(); } if (c.solid) { g.fillStyle = "#6a6a6a"; for (let i = 0; i < Math.min(8, e.dn / 2); i++) { g.beginPath(); g.arc(150 + i * 9 - 28, 126 + (i % 3) * 8 - 8, 5, 0, 7); g.fill(); } } if (isInf() && !(st.stent && st.dr > 0.6)) { g.fillStyle = "#000"; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(158 + i * 8, 112 + (i % 2) * 6, 3, 0, 7); g.fill(); } } }
      g.fillStyle = "#ffd166"; g.font = "600 12px system-ui"; g.fillText("pancreas · collection with wall · gas", 8, 292); g.fillStyle = "#e8e8e8"; g.fillText("R", 8, 18); g.fillText("L", 284, 18); });
    mk("Step-up approach", (g) => { g.fillStyle = "#0a0f16"; g.fillRect(0, 0, 300, 300); const steps = [["1 Support ± antibiotics", st.support || st.abx], ["2 Wait for a wall (~4 wk)", wallF() > 0.6], ["3 Drain (endoscopic / perc)", st.stent || st.perc], ["4 Necrosectomy if needed", st.sess > 0]];
      steps.forEach(([t, done], i) => { const y = 20 + i * 66; g.fillStyle = done ? "rgba(61,255,154,.25)" : "rgba(120,150,255,.15)"; g.strokeStyle = done ? "#3dff9a" : "rgba(150,170,255,.5)"; g.lineWidth = 2; g.beginPath(); g.roundRect(14, y, 272, 48, 10); g.fill(); g.stroke(); g.fillStyle = "#eaf6ff"; g.font = "600 14px system-ui"; g.fillText(t, 28, y + 29); if (i < 3) { g.fillStyle = "#98acd0"; g.fillText("▼", 144, y + 62); } }); });
  }

  const lab = {
    id: "pancreas", name: "Pancreatitis Lab", tag: "Acute pancreatitis and necrosis", icon: "🩻",
    tabs: TABS.map((k) => ({ id: k, label: T[k].label, sub: T[k].sub })), get tab() { return st.tab; },
    selectHint: "Start with Normal, press INDUCE INJURY in step 3 and follow the disease, or jump to WON to practise drainage.",
    opts: () => [(st.tab === "ANC" || st.tab === "WON") && { id: "inf", label: "Superinfection", cur: st.inf ? "1" : "0", choices: [["0", "Sterile"], ["1", "Infected"]] }, st.tab !== "NORMAL" && { id: "cause", label: "Cause", cur: st.cause, choices: [["gallstone", "Gallstone"], ["other", "Alcohol / other"]] }].filter(Boolean),
    slider: () => ({ id: "t", label: "Days from onset of pain", min: cur().d0, max: cur().d1, step: 1, v: clamp(st.day, cur().d0, cur().d1), locked: st.tab === "NORMAL", unit: " d" }),
    actions: () => [
      st.tab === "NORMAL" && { id: "inject", label: "INDUCE INJURY", hint: "Start an attack of acute pancreatitis.", off: false },
      { id: "support", label: "SUPPORTIVE CARE", hint: "Fluids, analgesia, early feeding.", off: st.support },
      { id: "abx", label: "ANTIBIOTICS", hint: "For proven or strongly suspected infection.", off: st.abx },
      { id: "perc", label: "PERCUTANEOUS DRAIN", hint: "Drain through the left flank.", off: st.perc || !cur().col },
      { id: "necro", label: "NECROSECTOMY", hint: "Remove debris through the stent (needs the stent).", off: !st.stent || st.sess >= 3 },
      { id: "reset", label: "RESET", hint: "Start this stage again.", off: false }].filter(Boolean),
    dragHint: "Touch the stent at the stomach wall and drag it into the collection (endoscopic transmural drainage). Best done once the wall has formed.",
    views: [{ id: "front", label: "Front", f: () => ({ ry: 0.2, rx: 0.15, d: 6.2, tx: 0.3, ty: 0.1 }) }, { id: "side", label: "Left side", f: () => ({ ry: -1.2, rx: 0.1, d: 5.6, tx: 0.3, ty: 0.1 }) }, { id: "top", label: "From above", f: () => ({ ry: 0.2, rx: 1.1, d: 5.6, tx: 0.3, ty: 0 }) }, { id: "back", label: "Back", f: () => ({ ry: 3.14, rx: 0.1, d: 6.2, tx: 0.3, ty: 0.1 }) }],
    legend: [["#e3b58d", "Gland"], ["#5a4034", "Necrosis"], ["#f2d58a", "Fluid"], ["#b5c256", "Pus"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ lams, st }), tabLabel: () => cur().label,
  };
  build();
  return lab;
}
