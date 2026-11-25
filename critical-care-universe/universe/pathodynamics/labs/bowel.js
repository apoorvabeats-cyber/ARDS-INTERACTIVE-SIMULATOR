/* BOWEL ISCHAEMIA LAB on the PATHODYNAMICS engine: acute mesenteric ischaemia.
   One 3D scene: aorta, superior mesenteric artery (SMA) with its branches, superior mesenteric vein, the small bowel in three territories and the colon, plus a 3D model of the
   bowel wall (mucosa, submucosa, muscle, serosa) that dies from the inside out and can perforate. Causes: SMA embolus, SMA thrombosis, non-occlusive ischaemia (NOMI),
   mesenteric venous thrombosis. Interactions: anticoagulation, revascularisation (clot retrieval, stent, vasodilator, restoring flow), tissue injury progression with time,
   and source control (resection, damage-control second look).
   Content aligned to the 2022 WSES guideline on acute mesenteric ischaemia (immediate CT angiography and heparin, endovascular first where available, NOMI managed by
   restoring flow and minimising vasopressors, MVT treated with heparin, resection of non-viable bowel with damage control and a second look at 24 to 48 hours).
   Checked Nov 2026 against published summaries. All numbers are illustrative, not patient data. Every view is 3D. */
import { THREE, C, smooth } from "../stage.js?v=20261126r";
import { clotKit, toolKit, clamp } from "./common.js?v=20261126r";
import { subset } from "../anatomy.js?v=20261126r";
import { seg, ball, loadBowel, rate, V3, rng, pebble, CREDIT_BP3D } from "./gi-kit.js?v=20261126r";

const T = {
  SMAE: { label: "SMA embolus", sub: "Embolus from the heart", min: 0, max: 48, v0: 8, tr: 20, base: [1.0, 0.12, 0.08],
    anat: "The superior mesenteric artery arises from the aorta and feeds the small bowel from the duodenum to the mid-colon. An embolus from the heart (atrial fibrillation, a recent infarct, a valve) usually lodges just beyond the origin of the middle colic artery, where the artery narrows, so the first jejunal branches still fill and the proximal jejunum is spared.",
    patho: "Sudden occlusion starves the distal jejunum, the ileum and the right colon. The mucosa is the most sensitive layer and starts to die within hours; the injury then spreads outwards to the muscle and serosa (transmural infarction) and finally the wall perforates. The classic story is severe abdominal pain out of proportion to the examination, then peritonitis, lactic acidosis and shock. Every hour of delay costs bowel.",
    interv: "Heparin straight away and immediate CT angiography. Restore flow: endovascular aspiration embolectomy or open embolectomy; both work, and open surgery also allows the bowel to be inspected. Then source control: resect the clearly dead bowel, keep all viable bowel, and use damage-control surgery with a second look at 24 to 48 hours when viability is uncertain." },
  SMAT: { label: "SMA thrombosis", sub: "On atherosclerotic stenosis", min: 0, max: 48, v0: 8, tr: 18, base: [0.2, 0.15, 0.1],
    anat: "A long-standing atherosclerotic plaque at the origin of the SMA narrows the artery. Collaterals have grown over months, so the bowel was coping until a thrombus formed on the plaque and closed the artery at its origin.",
    patho: "Because the occlusion is at the origin, the whole SMA territory is cut off, including the proximal jejunum. There is often a history of postprandial pain, food fear and weight loss. The collateral supply buys a little time, but when the bowel infarcts it does so over a long length.",
    interv: "Heparin and immediate CT angiography, then endovascular revascularisation: angioplasty with a stent at the origin of the SMA, usually through the arm or groin, or open bypass if that is not possible. Resect dead bowel and plan a second look if viability is in doubt." },
  NOMI: { label: "NOMI", sub: "Non-occlusive, low flow", min: 0, max: 48, v0: 12, tr: 30, base: [0.45, 0.4, 0.35], patchy: true,
    anat: "The mesenteric arteries are open but their branches are in spasm. The bowel is injured in patches, with healthy loops between dead ones (skip lesions), and the right colon is often involved.",
    patho: "It happens in the critically ill with low cardiac output, hypovolaemia, or high-dose vasopressors, when the gut vessels clamp down to protect the heart and brain. The gut is the first organ to be sacrificed and the last to be restored. Pain may be masked by sedation, so the signs are distension, rising lactate, rising vasopressor needs and gastrointestinal bleeding.",
    interv: "Treat the cause and restore mesenteric flow: fluids, optimised cardiac output, and the lowest vasopressor dose that keeps perfusion. Intra-arterial or intravenous vasodilators (papaverine or prostaglandin E1) through an SMA catheter are adjuncts, as is heparin. Operate for peritonitis, perforation or clinical deterioration, and resect dead bowel promptly." },
  MVT: { label: "Venous thrombosis", sub: "Mesenteric vein clot", min: 0, max: 48, v0: 24, tr: 36, base: [0.5, 0.32, 0.25], venous: true,
    anat: "The clot is in the superior mesenteric vein (and often its branches, or the portal vein). The arteries are open, but the blood cannot leave, so the bowel wall swells, turns dark red and thick, and bloody fluid collects in the abdomen.",
    patho: "Hypercoagulable states, cirrhosis and portal hypertension, abdominal sepsis, pancreatitis and surgery are common causes. Venous pressure rises until arterial inflow stops and the wall infarcts. The course is slower than an arterial block, so a patient may have days of vague pain before collapse.",
    interv: "Heparin (continuous unfractionated heparin) is the first-line treatment and may be enough when there is no peritonitis. Surgery is only for peritonitis, resecting clearly necrotic bowel only; a second look at 24 to 48 hours is mandatory when a long length is involved. Catheter-directed lysis of the SMA has no proven role and adds bleeding." },
};
const ORDER = ["SMAE", "SMAT", "NOMI", "MVT"], TERR = ["Proximal jejunum", "Mid small bowel", "Distal ileum and right colon"], TW = [0.25, 0.4, 0.35];
const A = [[0, 0.82, -0.2], [0.06, 0.56, 0.2], [0.1, 0.28, 0.5], [0.15, -0.2, 0.52], [0.2, -0.7, 0.5]];

export default function create(S, ui) {
  const st = { tab: "SMAE", t: 8, cta: false, hep: null, rv: null, flow: null, pap: null, res: [false, false, false], hRes: null, second: false, rec: 0, stent: false, removed: false, ghost: false };
  const cur = () => T[st.tab];
  let M = {}, terr = [], colon = null, F = {}, clot = null, stentTool = null, leak = [], wall = [], cache = {}, accT = 0, BG = null;
  loadBowel({ c: [0.15, -0.2, 0], r: [0.95, 1.2, 0.38] }).then((g) => { BG = g; if (M.grp) build(); }).catch(() => {});   /* real small bowel (BodyParts3D) */

  const uOf = (x, y) => clamp(0.5 + (-0.5 * (x - 0.15) - 0.85 * (y + 0.2)) / 2.1, 0, 1);
  const tOf = (x, y) => { const u = uOf(x, y); return u < 0.3 ? 0 : u < 0.62 ? 1 : 2; };
  const noise = (P, f) => 0.5 + 0.5 * (0.6 * Math.sin(f * P.x * 2.3 + 1.1) * Math.sin(f * P.y * 2.9 + 0.2) + 0.4 * Math.sin(f * P.z * 5 + P.x * f * 1.7 + 2));

  function build() {
    S.clear(); M = {}; terr = []; F = {}; leak = []; wall = []; cache = {};
    const grp = S.add(new THREE.Group()); M.grp = grp;
    /* the bowel, in three territories that can each be resected */
    const full = BG ? BG.clone() : (() => { const g = new THREE.TorusKnotGeometry(0.55, 0.12, 160, 12); g.scale(1, 1.2, 0.5); g.translate(0.15, -0.2, 0); return g; })();
    const mk = (k) => { const g = full.index ? subset(full, (x, y) => tOf(x, y) === k) : full; return S.tissue(g, 0xe0a090, (P) => ({ tag: k, rank: noise(P, 4.5), h: 0.5, sh: 0.9 + 0.1 * Math.sin(30 * P.x) * Math.sin(26 * P.y) }), { shininess: 35, specular: 0x333333 }); };
    [0, 1, 2].forEach((k) => { const tw = mk(k); tw.mesh.userData.hemi = 1; terr.push(tw); grp.add(tw.mesh); });
    /* the colon: the right side and the transverse belong to the SMA, the left side does not */
    const cp = [[-1.45, -1.35, 0.05], [-1.58, -0.5, 0.05], [-1.48, 0.45, 0.05], [-0.6, 0.78, 0.05], [0.5, 0.76, 0.05], [1.4, 0.5, 0.05], [1.58, -0.5, 0.05], [1.45, -1.3, 0.05]];
    const cg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp.map((p) => V3(p)), false, "centripetal", 0.5), 90, 0.13, 14, false);
    colon = S.tissue(cg, 0xc68a78, (P) => ({ tag: P.x < 0.7 ? 2 : -1, rank: noise(P, 3.5), h: 0.5, sh: 0.92 + 0.08 * Math.sin(36 * P.x) }), { shininess: 25 }); colon.mesh.userData.hemi = 1; grp.add(colon.mesh);
    /* arteries */
    const art = (pts, r, hex, op) => { const m = S.tube(pts, r, hex, { op: op || 0, seg: 24, emis: 0x2a0408 }); m.renderOrder = 1; grp.add(m); return m; };
    art([[0, 1.55, -0.25], [0, -1.5, -0.25]], 0.1, 0xc9514e, 0.85);
    M.sma = art(A, 0.05, 0xd9524a); M.smaTube = M.sma;
    const br = [[A[2], [-0.2, 0.55, 0.5], [-0.7, 0.8, 0.2]], [A[1], [0.4, 0.45, 0.5], [0.8, 0.5, 0.45]], [A[3], [0.45, -0.1, 0.5], [0.8, -0.25, 0.45]], [A[4], [-0.1, -0.8, 0.5], [-0.7, -1.0, 0.4], [-1.3, -1.2, 0.2]]];
    M.br = br.map((pts) => art(pts, 0.018, 0xd9524a));
    /* vein */
    M.smv = art([[-0.08, -0.7, 0.3], [-0.1, 0.0, 0.3], [-0.12, 0.55, 0.1]], 0.05, 0x5b78e6, 0.9);
    M.vclot = pebble(0.09, 0x4a1020); M.vclot.scale.set(1, 2.2, 1); M.vclot.position.set(-0.1, 0.0, 0.3); grp.add(M.vclot);
    M.cath = art([[0, 1.55, -0.2], [0.0, 0.95, -0.2], A[0], A[1]], 0.012, 0x66d9ff); M.cath.visible = false;
    /* tools: clot in the artery (embolus), stent at the origin (thrombosis) */
    const cu = M.sma.userData.curve;
    clot = clotKit(S, grp, ui, { size: 0.085, ring: 0.16, thr: 0.45, color: st.tab === "SMAT" ? 0x8a2a2a : 0x7a0f1e, onRemoved: () => { st.removed = true; revasc("Clot aspirated from the SMA. Blood floods back into the mid and distal bowel; the pink returns where the injury was still reversible."); } });
    clot.place(cu, st.tab === "SMAT" ? 0.06 : 0.5);
    stentTool = toolKit(S, grp, ui, { start: new THREE.Vector3(0.9, 1.1, 0.4), target: V3(A[0]).lerp(V3(A[1]), 0.5), thr: 0.3, len: 0.7, r: 0.016, ring: 0.14, color: 0x66d9ff, msg: "Drag the stent to the glowing ring at the origin of the SMA…", go: "Release to open the stent", onPlaced: () => { st.stent = true; revasc("Stent opened at the origin of the SMA: the whole territory is supplied again."); } });
    M.occ = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff4a5a })); grp.add(M.occ);
    /* the bowel wall, as a cut-open tube (x axis) */
    const wl = new THREE.Group(); wl.position.set(2.95, -0.25, 0); wl.rotation.z = Math.PI / 2; wl.rotation.y = 0.0; grp.add(wl); M.wl = wl;
    const L = 1.0, layers = [[0.46, 0x9ac6e0, 0xe8c4bb], [0.41, 0x7a7a7a, 0xb8505a], [0.31, 0x7a7a7a, 0xe8d8b4], [0.23, 0x7a7a7a, 0xd85a6a]];
    layers.forEach(([r, , hex], i) => { const g = new THREE.CylinderGeometry(r, r, L, 40, 1, true, Math.PI * 0.25, Math.PI * 1.5), p = g.attributes.position, v = new THREE.Vector3(); if (i === 3) for (let j = 0; j < p.count; j++) { v.fromBufferAttribute(p, j); const a = Math.atan2(v.z, v.x), k = 1 + 0.12 * Math.sin(a * 14) * Math.sin(v.y * 22); p.setXYZ(j, v.x * k, v.y, v.z * k); } g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: hex, side: THREE.DoubleSide, shininess: 30, transparent: true, opacity: i === 0 ? 0.82 : 1 })); m.userData.hex = hex; m.userData.layer = i; wl.add(m); wall.push(m); });
    /* the cut ends show the four layers as rings, so the wall can be read end-on */
    const rin = [0.41, 0.31, 0.23, 0.14];
    layers.forEach(([r, , hex], i) => [L / 2, -L / 2].forEach((y) => { const ring = new THREE.Mesh(new THREE.RingGeometry(rin[i], r, 40, 1, -Math.PI * 1.25, Math.PI * 1.5), new THREE.MeshPhongMaterial({ color: hex, side: THREE.DoubleSide })); ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.userData.hex = hex; wl.add(ring); wall.push(ring); wall[wall.length - 1].userData.layer = i; }));
    const hth = Math.PI * 0.25 + 0.4; M.hole = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })); M.hole.position.set(0.47 * Math.sin(hth), 0.0, 0.47 * Math.cos(hth)); M.hole.rotation.y = hth; M.hth = hth; wl.add(M.hole); M.hole.visible = false;
    for (let i = 0; i < 6; i++) { const b = ball(0.05, 0x9aa850, { transparent: true, opacity: 0.85 }); b.userData.i = i; grp.add(b); leak.push(b); b.visible = false; }
    grp.add(S.label("bowel wall", [2.95, 0.45, 0], "#e8c4bb")); grp.add(S.label("SMA", [0.55, 0.12, 0.7], "#ff8a8a")); grp.add(S.label("SMV", [-0.5, -0.25, 0.4], "#7a96ff"));
    /* flows */
    const mf = (pts, n, hex, o) => S.flow(new THREE.CatmullRomCurve3(pts.map((p) => V3(p))), n, hex, o);
    F.ao = mf([[0, 1.55, -0.25], [0, -1.5, -0.25]], 10, 0xff6a6a, { speed: 0.25 }); F.up = mf([A[0], A[1], A[2]], 6, 0xff6a6a, { speed: 0.22 }); F.dn = mf([A[2], A[3], A[4]], 6, 0xff6a6a, { speed: 0.22 });
    F.b = br.map((pts) => mf(pts, 5, 0xff8a7a, { speed: 0.22 })); F.v = mf([[-0.08, -0.7, 0.3], [-0.1, 0.0, 0.3], [-0.12, 0.55, 0.1]], 10, 0x7a96ff, { speed: 0.2 });
    Object.assign(st, { t: cur().v0, cta: false, hep: null, rv: null, flow: null, pap: null, res: [false, false, false], hRes: null, second: false, rec: 0, stent: false, removed: false });
    S.view({ ry: 0.05, rx: 0.1, d: 5.6, tx: 0.95, ty: -0.05, tz: 0 });
  }
  function revasc(msg) { if (st.rv == null) st.rv = st.t; ui.refresh(msg); }

  /* ---------- the disease model: perfusion of each territory over time, and the injury it causes ---------- */
  const ramp = (at, r) => (at == null ? 0 : clamp((st.t - at) / r, 0, 1));
  function perf(j, t) {
    const c = cur(), tt = t == null ? st.t : t, rp = (at, r) => (at == null || tt < at ? 0 : clamp((tt - at) / r, 0, 1)); let p = c.base[j];
    if (st.tab === "SMAE") p += 0.85 * rp(st.rv, 0.5) * (j === 0 ? 0 : 1);
    else if (st.tab === "SMAT") p += 0.72 * rp(st.rv, 0.5);
    else if (st.tab === "NOMI") p += 0.2 * rp(st.flow, 3) + 0.25 * rp(st.pap, 2);
    else p += 0.42 * rp(st.hep, 18);
    if (st.tab !== "MVT" && st.hep == null && tt > 8 && j > 0) p *= 0.85;     /* without heparin the clot propagates into the arcades */
    if (c.patchy && j === 1) p *= 0.85;
    return clamp(p, 0, 0.95);
  }
  function sv(j) {
    const key = [st.tab, st.t, st.hep, st.rv, st.flow, st.pap, j].join("|"); if (cache[key] != null) return cache[key];
    const c = cur(); let s = 0; for (let h = 0; h < st.t; h += 0.5) { const p = perf(j, h), I = clamp((0.6 - p) / 0.6, 0, 1); s += I * 0.5 / c.tr * (c.venous ? 0.9 : 1); }
    return (cache[key] = clamp(s, 0, 1));
  }
  const reversible = () => (st.rv != null || st.hep != null && st.tab === "MVT" || st.flow != null || st.pap != null);
  const svd = (j) => { const s = sv(j); return s < 0.5 && reversible() ? s * (1 - 0.8 * st.rec) : s; };
  const alive = (j) => !st.res[j];
  function est() {
    let worst = 0, necTot = 0, tot = 0, perfn = 0; for (let j = 0; j < 3; j++) { tot += TW[j]; if (alive(j)) { const s = svd(j); worst = Math.max(worst, s); if (s >= 0.7) necTot += TW[j]; perfn += perf(j) * TW[j]; } }
    const lac = +(1 + 9 * Math.pow(worst, 1.5)).toFixed(1), sepsis = clamp(Math.max(0, worst - 0.55) * 2.2, 0, 1), perfo = worst >= 0.97, viable = Math.round((1 - necTot / tot) * 100), remaining = Math.round(TW.reduce((a, w, j) => a + (alive(j) ? w : 0), 0) * 100); perfn = perfn / Math.max(0.05, remaining / 100);
    return { worst, lac, sepsis, perfo, viable, necTot, perfn, remaining, map: Math.round(86 - 36 * sepsis), wbc: Math.round(9 + 14 * Math.max(worst, sepsis)) };
  }
  const ink = (s, ven) => { const k = C(0xe0a090); if (ven) return k.lerp(C(0x8a2230), clamp(s / 0.35, 0, 1)).lerp(C(0x3a0c18), clamp((s - 0.4) / 0.5, 0, 1)); return k.lerp(C(0xb9909c), clamp(s / 0.2, 0, 1)).lerp(C(0x8a4a78), clamp((s - 0.15) / 0.3, 0, 1)).lerp(C(0x2e1626), clamp((s - 0.45) / 0.4, 0, 1)); };
  function paint() {
    const c = cur(), ven = !!c.venous;
    terr.forEach((tw, j) => { const s = svd(j); tw.paint((tag, rank, h, out) => { const loc = c.patchy ? clamp(s * (1.5 - rank * 1.2), 0, 1) : s; out.copy(ink(loc, ven)); }); });
    const sc = svd(2); colon.paint((tag, rank, h, out) => { out.setHex(0xc68a78); if (tag === 2) out.copy(ink(c.patchy ? clamp(sc * (1.5 - rank * 1.2), 0, 1) : sc, ven).lerp(C(0xc68a78), 0.15)); });
  }
  function frame(dt) {
    const t = S.time(), e = est(), c = cur(), tb = st.tab;
    if (st.rv != null || st.flow != null || st.pap != null || (st.hep != null && tb === "MVT")) st.rec = Math.min(1, st.rec + dt * 0.12);
    terr.forEach((tw, j) => { tw.mesh.visible = alive(j); }); const sw = Math.max(...[0, 1, 2].map((j) => (alive(j) ? svd(j) : 0)));
    /* clot and stent, ring, catheter */
    const sma = tb === "SMAE" || tb === "SMAT", cuT = tb === "SMAE" ? 0.5 : 0.06;
    clot.mesh.visible = sma && !st.removed && !st.stent; if (sma && !st.stent) clot.frame(dt, 1); else { clot.ring.visible = false; } if (st.stent) clot.mesh.visible = false;
    stentTool.show(tb === "SMAT" && !st.stent); stentTool.frame(dt); if (tb !== "SMAT") stentTool.ring.visible = false;
    M.occ.visible = (sma && !st.removed && !st.stent) && st.cta; M.occ.position.copy(M.sma.userData.curve.getPointAt(cuT)); M.occ.scale.setScalar(1 + 0.15 * Math.sin(t * 5));
    M.cath.visible = tb === "NOMI" && st.pap != null; M.vclot.visible = tb === "MVT"; M.vclot.scale.set(1 - 0.5 * ramp(st.hep, 18), 2.2 * (1 - 0.7 * ramp(st.hep, 18)), 1 - 0.5 * ramp(st.hep, 18));
    /* arteries: spasm in NOMI */
    const spasm = tb === "NOMI" ? 1 - 0.55 * (1 - Math.max(ramp(st.flow, 3) * 0.4, ramp(st.pap, 2))) * 1 : 1; M.br.forEach((m) => { m.scale.x = m.scale.z = tb === "NOMI" ? 0.5 + 0.5 * Math.max(ramp(st.pap, 2), ramp(st.flow, 3) * 0.5) : 1; }); void spasm;
    /* flows */
    const pr = [perf(0), perf(1), perf(2)]; rate(F.ao, 0.9); rate(F.up, tb === "SMAT" ? pr[0] : tb === "NOMI" ? 0.5 + 0.3 * ramp(st.pap, 2) : 0.9); rate(F.dn, tb === "SMAE" ? pr[1] : tb === "SMAT" ? pr[1] : tb === "NOMI" ? pr[1] : 0.7);
    rate(F.b[1], pr[0]); rate(F.b[2], pr[1]); rate(F.b[3], pr[2]); rate(F.b[0], tb === "SMAT" ? pr[2] : pr[2] > 0.3 ? 0.8 : pr[2]); rate(F.v, tb === "MVT" ? 0.15 + 0.7 * ramp(st.hep, 18) : 0.6 * (e.perfn + 0.2));
    /* wall model: layers die from the inside out; the wall stands for the worst bowel left */
    const lv = [sw > 0.88, sw > 0.7, sw > 0.5, sw > 0.25]; wall.forEach((m) => { const prog = [clamp((sw - 0.86) / 0.1, 0, 1), clamp((sw - 0.66) / 0.1, 0, 1), clamp((sw - 0.46) / 0.1, 0, 1), clamp((sw - 0.2) / 0.1, 0, 1)][m.userData.layer]; m.material.color.setHex(m.userData.hex).lerp(C(tb === "MVT" ? 0x4a1020 : 0x2e1626), prog * 0.92); void lv; });
    M.hole.visible = e.perfo && alive(0) + alive(1) + alive(2) > 0; leak.forEach((b, i) => { b.visible = M.hole.visible; const k = (t * 0.4 + i / 6) % 1; b.position.set(2.95 + (i % 3 - 1) * 0.07, -0.25 + (0.47 + 0.7 * k) * Math.sin(M.hth), (0.47 + 0.7 * k) * Math.cos(M.hth)); b.material.opacity = 0.85 * (1 - k); });
    accT += dt; if (accT > 0.12) { accT = 0; paint(); }
  }
  S.hooks.push(frame);
  S.onGrab = (o) => { clot.grabbed(o); stentTool.grabbed(o); }; S.onDrag = (o, w) => { clot.drag(w) || stentTool.drag(w); }; S.onDrop = () => { clot.drop() || stentTool.drop(); }; S.onTap = () => {};

  const setTab = (k) => { st.tab = k; build(); };
  const setOpt = (id, v) => { if (id === "ghost") { st.ghost = v === "1"; terr.forEach((tw) => { tw.mesh.material.transparent = st.ghost; tw.mesh.material.opacity = st.ghost ? 0.3 : 1; }); } };
  const setT = (v) => { st.t = v; };
  function act(id) {
    const e = est();
    if (id === "cta") { st.cta = true; ui.refresh(st.tab === "MVT" ? "CT angiography with a venous phase: a filling defect in the mesenteric vein and a thickened bowel wall. Do not delay the scan: delay is linked to higher mortality." : st.tab === "NOMI" ? "CT angiography: patent mesenteric arteries with narrowed, beaded branches and a poorly enhancing bowel wall." : "CT angiography: the filling defect is marked in the SMA. Do not delay the scan: delay is linked to higher mortality."); }
    else if (id === "hep") { if (st.hep == null) { st.hep = st.t; ui.refresh(st.tab === "MVT" ? "Continuous unfractionated heparin started: the first-line treatment for venous thrombosis. The clot slowly shrinks and the bowel drains." : "Heparin started. It stops the clot growing into the arcades, but it does not open the artery."); } }
    else if (id === "flow") { if (st.flow == null) { st.flow = st.t; ui.refresh("Perfusion restored: fluids, cardiac output optimised and the vasopressor dose lowered. The gut vessels start to relax."); } }
    else if (id === "pap") { if (st.pap == null) { st.pap = st.t; ui.refresh("Papaverine infused through a catheter at the SMA origin: the branches dilate. An adjunct, with limited evidence."); } }
    else if (id === "res") { st.res = st.res.map((r, j) => r || (svd(j) >= 0.7)); st.hRes = st.t; const n = st.res.filter(Boolean).length; ui.refresh(n ? "Laparotomy: clearly dead bowel resected, all viable bowel kept. The ends are left in discontinuity and the abdomen is closed temporarily (damage control)." : "Laparotomy: no clearly dead bowel. Borderline bowel is left, with a second look planned."); }
    else if (id === "second") { st.second = true; let n = 0; st.res = st.res.map((r, j) => { if (r) return true; if (svd(j) >= 0.55) { n++; return true; } return false; }); ui.refresh(n ? "Second look at 24 to 48 hours: the bowel that did not recover is resected; the viable bowel is joined up." : "Second look: all remaining bowel is pink, peristalsing and viable. The bowel is joined up and the abdomen closed."); }
    else if (id === "reset") build();
    void e;
  }
  function obs() {
    const e = est(), c = cur(), tone = (v, a, b) => (v > b ? "bad" : v > a ? "warn" : "ok"), lead = [], tb = st.tab;
    const params = [{ k: "Hours since onset", v: st.t + " h", tone: st.t > 12 ? "bad" : st.t > 6 ? "warn" : "ok" }, ...[0, 1, 2].map((j) => { const s = alive(j) ? svd(j) : -1; return { k: TERR[j], v: s < 0 ? "resected" : s < 0.2 ? "healthy" : s < 0.5 ? "mucosal injury, salvageable" : s < 0.7 ? "borderline" : s < 0.97 ? "transmural necrosis" : "PERFORATED", tone: s < 0 ? "info" : s >= 0.7 ? "bad" : s >= 0.35 ? "warn" : "ok" }; }),
      { k: "Flow into the bowel", v: Math.round(e.perfn * 100) + "%", tone: e.perfn < 0.35 ? "bad" : e.perfn < 0.7 ? "warn" : "ok" }, { k: "Lactate", v: e.lac + " mmol/L", tone: tone(e.lac, 2, 4) }, { k: "Peritonitis · sepsis", v: e.sepsis > 0.5 ? "shock, MAP " + e.map : e.sepsis > 0.1 ? "peritonism, WBC " + e.wbc + "k" : "no", tone: tone(e.sepsis, 0.1, 0.5) }, { k: "Bowel left", v: e.remaining + "% of the small bowel", tone: e.remaining < 50 ? "bad" : "ok" }];
    if (e.perfo) lead.push("A segment has perforated: faecal peritonitis and septic shock. Emergency laparotomy and resection.");
    if (!st.cta && !st.res.some(Boolean)) lead.push("Order CT angiography immediately; delay costs bowel.");
    if (st.hep == null) lead.push("Start heparin straight away" + (tb === "MVT" ? ": it is the main treatment." : "."));
    if (tb === "SMAE" && !st.removed && st.rv == null) lead.push("Retrieve the clot: drag it out of the SMA.");
    if (tb === "SMAT" && !st.stent && st.rv == null) lead.push("Open the SMA origin: drag the stent to the ring.");
    if (tb === "NOMI" && st.flow == null) lead.push("Restore flow: fluids, cardiac output, lowest vasopressor dose.");
    if (e.necTot > 0 && !st.res.some(Boolean)) lead.push("Dead bowel is a source of sepsis that revascularisation cannot fix: resect it (source control).");
    if (st.res.some(Boolean) && !st.second) lead.push("Damage control: leave the abdomen open and look again at 24 to 48 hours.");
    if (st.second) lead.push("Second look done. Bowel continuity restored.");
    if (e.remaining < 50) lead.push("Less than half of the small bowel is left: expect short-bowel problems and intestinal failure, which is why only clearly dead bowel is resected.");
    if (st.rec > 0.6 && e.worst < 0.5) lead.push("The salvageable bowel has recovered colour and peristalsis.");
    if (!lead.length) lead.push("Move the slider to follow the injury.");
    return { params, body: bodyMap(e), marks: {}, note: lead.join(" ") };
  }
  function bodyMap(e) { const m = { bowel: e.worst > 0.7 ? 3 : e.worst > 0.3 ? 2 : e.worst > 0.1 ? 1 : 0, abdomen: e.worst > 0.5 ? 2 : e.worst > 0.15 ? 1 : 0 }; if (e.sepsis > 0.5) { m["lung-R"] = 2; m["lung-L"] = 2; m["kidney-R"] = 2; m["kidney-L"] = 2; m.heart = 1; } if (st.rec > 0.7 && e.worst < 0.4) m.bowel = "rec"; return m; }
  const info = () => { const c = cur(); return { anat: c.anat, patho: c.patho, interv: c.interv }; };
  function clin() {
    const e = est(), L = [];
    L.push(["Recognise it", "Think of it when abdominal pain is out of proportion to the examination, especially with atrial fibrillation, vascular disease, low cardiac output, a hypercoagulable state or a rising lactate. Lactate and white cell count are late and unreliable: a normal lactate does not exclude it."]);
    L.push(["Imaging", "Biphasic CT angiography (arterial and venous phases) without delay, even in kidney injury, with no oral contrast. A delay of several hours is associated with higher mortality."]);
    L.push(["Heparin", "Full-dose heparin before surgery in all patients; unfractionated heparin when the kidney is failing. For mesenteric venous thrombosis, continuous unfractionated heparin is the first-line treatment. Heparin does not replace revascularisation."]);
    L.push(["Revascularise", "Arterial occlusion: endovascular treatment first where the expertise exists (aspiration embolectomy, angioplasty and stent), open surgery otherwise or when the bowel must be inspected. NOMI: restore perfusion, minimise vasopressors, vasodilators as adjuncts. Venous thrombosis: anticoagulation; surgery only for peritonitis."]);
    L.push(["Source control", "Peritonitis needs a laparotomy or laparoscopy: resect non-viable bowel, keep viable bowel. Use damage control (stapled ends left in discontinuity, temporary abdominal closure) and a planned second look at 24 to 48 hours after resuscitation. Limit fluids to avoid abdominal compartment syndrome, and correct acidosis, coagulopathy and hypothermia."]);
    L.push(["Outlook", "Bowel viability at the time of treatment is the main determinant of survival. Illustrative here: " + e.viable + "% of the remaining bowel viable and " + e.remaining + "% of the small bowel left."]);
    L.push(["Reference", "WSES 2022 updated guidelines on acute mesenteric ischaemia. Follow your local pathway."]);
    return { lines: L };
  }
  const lab = {
    id: "bowel", name: "Bowel Ischaemia Lab", tag: "Acute mesenteric ischaemia", icon: "🟣",
    tabs: ORDER.map((k) => ({ id: k, label: T[k].label, sub: T[k].sub })), get tab() { return st.tab; },
    selectHint: "Pick the cause, move the hour slider to watch the bowel wall die from the inside out, then restore flow and resect what is dead.",
    opts: () => [{ id: "ghost", label: "Bowel", cur: st.ghost ? "1" : "0", choices: [["0", "Solid"], ["1", "See-through"]] }],
    slider: () => ({ id: "t", label: "Hours since the onset of ischaemia", min: 0, max: 48, step: 1, v: st.t, unit: " h" }),
    actions: () => { const tb = st.tab, e = est(), a = [{ id: "cta", label: "CT ANGIOGRAM", hint: "Shows the occlusion. Do it at once.", off: st.cta }, { id: "hep", label: "HEPARIN", hint: tb === "MVT" ? "The main treatment for venous thrombosis." : "Stops the clot growing.", off: st.hep != null }];
      if (tb === "NOMI") a.push({ id: "flow", label: "RESTORE FLOW", hint: "Fluids, output, less vasopressor.", off: st.flow != null }, { id: "pap", label: "PAPAVERINE (SMA)", hint: "Intra-arterial vasodilator.", off: st.pap != null });
      a.push({ id: "res", label: "LAPAROTOMY · RESECT DEAD BOWEL", hint: "Source control. Keep viable bowel.", off: st.res.every(Boolean) || st.hRes != null && !e.necTot && !e.perfo }, { id: "second", label: "SECOND LOOK", hint: "24 to 48 h later; viability check.", off: st.hRes == null || st.second }, { id: "reset", label: "RESET", hint: "Start this cause again.", off: false }); return a; },
    dragHint: "SMA embolus: drag the clot out of the artery. SMA thrombosis: drag the stent to the glowing ring at the origin of the SMA. Others: use the buttons.",
    views: [{ id: "all", label: "Whole gut", f: () => ({ ry: 0.05, rx: 0.1, d: 5.6, tx: 0.95, ty: -0.05 }) }, { id: "sma", label: "SMA", f: () => ({ ry: 0.2, rx: 0.1, d: 3.6, tx: 0.1, ty: 0.3 }) }, { id: "wall", label: "Bowel wall", f: () => ({ ry: 0.1, rx: 0.2, d: 3.4, tx: 2.95, ty: -0.2 }) }, { id: "wallend", label: "Wall end-on", f: () => ({ ry: -1.45, rx: 0.1, d: 2.8, tx: 2.95, ty: -0.25 }) }, { id: "bowel", label: "Small bowel", f: () => ({ ry: 0.1, rx: 0.1, d: 5.2, tx: 0.2, ty: -0.2 }) }],
    credit: CREDIT_BP3D, legend: [["#e0a090", "Healthy bowel"], ["#8a4a78", "Ischaemic"], ["#2e1626", "Necrosis"], ["#8a2230", "Venous congestion"], ["#d9524a", "Artery"], ["#5b78e6", "Vein"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => setOpt("ghost", on ? "1" : "0"), tabLabel: () => cur().label, debug: () => ({ clot, stentTool, st, est }),
  };
  build();
  return lab;
}
