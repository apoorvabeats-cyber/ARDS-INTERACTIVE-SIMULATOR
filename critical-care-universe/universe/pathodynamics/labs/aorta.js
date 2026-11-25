/* AORTA & PERICARDIUM LAB on the PATHODYNAMICS engine: acute aortic dissection (type A and type B) and cardiac tamponade.
   Interactions: impulse control (blood pressure and heart rate), emergency repair, TEVAR, pericardiocentesis.
   Content aligned to the ACC/AHA 2022 aortic disease guideline (acute aortic syndromes: reduce SBP to below 120 mmHg with a negative inotrope-led, heart-rate-lowering strategy;
   type A: emergency surgery; type B: medical therapy first, TEVAR for complicated disease) and to current ESC pericardial-disease practice (urgent drainage of tamponade).
   Checked Nov 2026 against published summaries. All numbers are illustrative, not patient data. */
import { THREE } from "../stage.js?v=20261126gk";
import { toolKit, vessels, mirrorFlows, clamp } from "./common.js?v=20261126gk";
import { organ } from "../anatomy.js?v=20261126gk";

const TABS = {
  DA: { label: "Type A dissection", sub: "Ascending aorta involved",
    anat: "The aortic wall has three layers. In dissection the inner layer tears, blood enters the wall and splits it into a true lumen and a false lumen separated by an intimal flap. In type A (Stanford) the ascending aorta is involved, close to the heart, the coronary arteries and the arch vessels to the brain.",
    patho: "Pulsatile pressure keeps driving blood along the wall. The false lumen can rupture into the pericardium (tamponade), tear the aortic valve support (aortic regurgitation), block a coronary artery (inferior infarction), or block a carotid (stroke). Early mortality is very high without surgery and rises with each hour.",
    interv: "Treat as a surgical emergency. While the patient goes to theatre: pain relief, heart-rate control first (an intravenous beta-blocker such as esmolol), then a vasodilator if needed, aiming for a systolic pressure below 120 mmHg and a heart rate of about 60–80. Do not give anticoagulants or thrombolytics. Definitive: open replacement of the ascending aorta (with valve or arch work as needed)." },
  DB: { label: "Type B dissection", sub: "Descending aorta only",
    anat: "In type B the tear starts beyond the left subclavian artery. The false lumen runs down the descending thoracic and abdominal aorta and can pinch off the true lumen and its branches: the renal, mesenteric and iliac arteries.",
    patho: "Malperfusion is the main danger: gut, kidney, spinal cord or leg ischaemia. The other danger is rupture. An uncomplicated type B has a much better outlook than type A; it becomes complicated when there is malperfusion, rupture or leak, or pain and hypertension that will not settle.",
    interv: "Uncomplicated: admit to a high-dependency unit, control pain, heart rate and blood pressure (systolic below 120 mmHg), and follow with imaging. Complicated: thoracic endovascular aortic repair (TEVAR), which covers the entry tear with a stent graft so the false lumen thromboses and the true lumen re-expands. Selected high-risk uncomplicated patients may be considered for early TEVAR by the aortic team." },
  TAMP: { label: "Cardiac tamponade", sub: "Fluid squeezing the heart",
    anat: "The heart sits inside the pericardium, a tough sac with very little stretch. Fluid or blood in this space presses on the thin right-sided chambers first.",
    patho: "Pressure in the sac rises above the filling pressure of the right atrium and ventricle, so the heart cannot fill. Cardiac output and blood pressure fall while heart rate and venous pressure rise. The speed matters more than the volume: a small, sudden bleed can be fatal, while a large slow effusion may be tolerated for a long time.",
    interv: "Haemodynamic compromise needs urgent drainage: echo-guided pericardiocentesis (or surgical drainage for blood, clots, trauma or a ruptured aorta). Fluid bolus is only a short bridge. Avoid intubation and positive-pressure ventilation before drainage if possible, and avoid diuretics and vasodilators." },
};
const ORDER = ["DA", "DB", "TAMP"];
const P = [[0.1, -0.45, 0.05], [0.1, 0.2, 0.05], [0.0, 0.58, 0.0], [-0.38, 0.55, -0.1], [-0.6, 0.3, -0.12], [-0.6, -0.4, -0.1], [-0.6, -1.0, -0.05], [-0.55, -1.45, 0.0]];
const CURVE = new THREE.CatmullRomCurve3(P.map((p) => new THREE.Vector3(...p)));
const HEART = new THREE.Vector3(0.0, -0.78, 0.1), U_A = 0.06, U_B = 0.57;
const at = (u) => CURVE.getPointAt(clamp(u, 0, 1));
const arr = (v) => [v.x, v.y, v.z];
const add = (a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];

export default function create(S, ui) {
  const st = { tab: "DA", comp: "none", acute: "acute", t: 2, vol: 250, ctrl: false, pain: false, surg: false, tevar: false, fluid: false, drained: false, ghost: false, cur: 250, fz: -1, key: "" };
  const T = () => TABS[st.tab];
  let M = {}, V = {}, F = {}, kits = [], act_kit = null, sheet = null;

  let HG = null;
  organ("heart", { flipX: true, fit: { c: [0, 0, 0], r: [0.32, 0.38, 0.3] } }).then((g) => { HG = g; if (M.grp) build(); }).catch(() => {});   /* real heart (BodyParts3D) */
  const ell = (rx, ry, rz, col, op, p, o) => { const g = new THREE.SphereGeometry(1, 28, 20); g.scale(rx, ry, rz); const m = new THREE.Mesh(g, S.mat(col, Object.assign({ transparent: true, opacity: op, depthWrite: false }, o || {}))); if (p) m.position.set(...p); return m; };
  function tubeSub(u0, u1, off, r, col, op, ribs) {
    const n = 18, pts = []; for (let i = 0; i <= n; i++) pts.push(at(u0 + ((u1 - u0) * i) / n).add(new THREE.Vector3(...off)));
    const c = new THREE.CatmullRomCurve3(pts), m = new THREE.Mesh(new THREE.TubeGeometry(c, 36, r, 10, false), ribs ? new THREE.MeshPhongMaterial({ color: col, shininess: 80, wireframe: false, transparent: true, opacity: op }) : S.mat(col, { transparent: true, opacity: op, depthWrite: false })); return m;
  }
  function build() {
    S.clear(); M = {}; V = {}; F = {}; kits = []; act_kit = null;
    const grp = S.add(new THREE.Group()); grp.scale.x = -1; /* patient's right on the viewer's left in the front view */ M.grp = grp;
    M.heart = ell(0.32, 0.38, 0.3, 0xb5323c, 0.6, arr(HEART), { emissive: 0x3a0810 }); if (HG) { M.heart.geometry.dispose(); M.heart.geometry = HG.clone(); } M.heart.userData.hemi = 1; grp.add(M.heart);
    M.ra = ell(0.1, 0.12, 0.1, 0x6fa8ff, 0.9, [0.13, -0.7, 0.3]); M.rv = ell(0.12, 0.17, 0.1, 0x6fa8ff, 0.9, [-0.02, -0.9, 0.36]); grp.add(M.ra, M.rv);
    M.peri = ell(1, 1, 1, 0xffe8b0, 0.2, arr(HEART)); M.peri.renderOrder = 2; grp.add(M.peri); M.eff = ell(1, 1, 1, 0xc23a3a, 0.28, arr(HEART)); M.eff.renderOrder = 2; grp.add(M.eff);
    const br = (n, pts, r) => [n, pts, r], a = (u) => arr(at(u));
    const defs = [br("AO", P, 0.1), br("BCT", [a(0.3), add(a(0.3), [0.12, 0.12, 0.04]), [0.2, 0.95, 0.04]], 0.04), br("LCCA", [a(0.37), add(a(0.37), [0.0, 0.2, 0.02]), [-0.02, 1.0, -0.02]], 0.035), br("LSA", [a(0.46), add(a(0.46), [-0.12, 0.2, 0]), [-0.55, 0.95, -0.1]], 0.035), br("CORO", [a(0.03), [0.36, -0.55, 0.28], [0.3, -0.85, 0.4]], 0.022), br("RENAL_R", [a(0.74), add(a(0.74), [0.25, -0.05, 0.03]), add(a(0.74), [0.42, -0.1, 0.05])], 0.028), br("RENAL_L", [a(0.74), add(a(0.74), [-0.25, -0.05, -0.02]), add(a(0.74), [-0.42, -0.1, -0.03])], 0.028), br("SMA", [a(0.72), add(a(0.72), [0.1, -0.1, 0.18]), add(a(0.72), [0.12, -0.45, 0.32])], 0.03), br("ILIAC_R", [a(1), [-0.4, -1.65, 0.02], [-0.25, -2.0, 0.05]], 0.04), br("ILIAC_L", [a(1), [-0.7, -1.65, 0.0], [-0.85, -2.0, 0.05]], 0.04)];
    const fn0 = S.flows.length; const vv = vessels(S, grp, defs, 0xc9514e, { dens: 12 }); mirrorFlows(S, fn0); V = vv.T; F = vv.F; V.AO.material.transparent = true; V.AO.material.opacity = 0.35; V.AO.material.depthWrite = false;
    grp.add(ell(0.075, 0.1, 0.06, 0x8b5a5a, 0.55, add(a(0.74), [0.46, -0.1, 0.05]))); grp.add(ell(0.075, 0.1, 0.06, 0x8b5a5a, 0.55, add(a(0.74), [-0.46, -0.1, -0.03])));
    M.tear = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 30), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 })); M.tear.renderOrder = 5; grp.add(M.tear);
    M.dyn = new THREE.Group(); grp.add(M.dyn);
    const mkKit = (start, target, onPlaced, msg, go, far, len, r) => { const k = toolKit(S, grp, ui, { start, target, thr: 0.3, len, r, ring: 0.13, onPlaced, msg, go, far }); kits.push(k); return k; };
    M.kitT = mkKit(new THREE.Vector3(-0.35, -1.95, 0.35), at(U_B).add(new THREE.Vector3(0, 0.04, 0)), () => { st.tevar = true; st.key = ""; ui.refresh("Stent graft deployed over the entry tear. The false lumen is sealed and the branches are reperfused as the true lumen re-expands."); }, "Drag the stent-graft delivery tip up the aorta to the entry tear (glowing ring)…", "Release to deploy the stent graft", "The graft must cover the entry tear: bring the tip to the ring.", 0.8, 0.03);
    M.kitP = mkKit(new THREE.Vector3(0.1, -1.55, 0.95), new THREE.Vector3(0.0, -1.0, 0.42), () => { st.drained = true; ui.refresh("Pericardial fluid drained. The heart fills again: output and pressure recover."); }, "Drag the needle tip below the xiphoid into the pericardial space (glowing ring)…", "Release to drain the pericardium", "The tip must reach the fluid around the heart: bring it to the ring.", 0.7, 0.012);
    reset();
  }
  function reset() {
    Object.assign(st, { ctrl: false, pain: false, surg: false, tevar: false, fluid: false, drained: false, fz: -1, key: "" });
    st.t = st.tab === "TAMP" ? 0 : 2; st.vol = st.tab === "TAMP" ? (st.acute === "acute" ? 250 : 700) : 250; st.cur = st.comp === "tamponade" && st.tab === "DA" ? 250 : st.vol;
    if (st.tab === "DA" && st.comp !== "none" && !["tamponade", "coronary", "cerebral", "ar"].includes(st.comp)) st.comp = "none";
    if (st.tab === "DB" && st.comp !== "none" && !["malp", "limb", "rupt"].includes(st.comp)) st.comp = "none";
    kits.forEach((k) => { k.placed = false; k.grab = false; k.hit.userData.drag = true; k.mesh.position.copy(k.start); k.ring.visible = true; k.show(false); });
    M.kitT.show(st.tab === "DB"); M.kitP.show(st.tab === "TAMP");
    const cam = { DA: { ry: 0.3, rx: 0.1, d: 4.6, tx: -0.1, ty: -0.1 }, DB: { ry: 0.5, rx: 0.1, d: 5.6, tx: -0.4, ty: -0.7 }, TAMP: { ry: 0.2, rx: 0.1, d: 3.0, tx: 0.15, ty: -0.78 } }[st.tab]; S.view(Object.assign({ tz: 0 }, cam)); st.key = "";
  }

  /* ---------- physiology ---------- */
  function dis() {
    const idx = (st.ctrl ? 0.55 : 1) * (st.pain ? 0.9 : 1), e0 = st.tab === "DA" ? 0.5 : 0.45, treated = st.surg || st.tevar;
    const raw = e0 + (1 - e0) * (1 - Math.exp(-(st.t * idx) / 10)); if (treated && st.fz < 0) st.fz = raw; const ext = treated ? Math.min(st.fz, raw) : raw;
    let sbp = 178, hr = 98; if (st.pain) { sbp -= 8; hr -= 6; } if (st.ctrl) { sbp = 112; hr = 62; } const c = st.comp;
    if (c === "tamponade") { sbp -= 35; hr += 20; } if (c === "rupt") { sbp -= 40; hr += 15; } if (c === "ar") { sbp -= 8; }
    const fixed = st.surg || (st.tab === "DB" && st.tevar), mal = { coro: c === "coronary" && !fixed, brain: c === "cerebral" && !fixed, gut: c === "malp" && !fixed, limb: c === "limb" && !fixed };
    const tamp = c === "tamponade" && !st.surg, rupt = c === "rupt" && !st.tevar;
    const risk = st.surg ? "operative risk" : st.tevar ? "reduced" : st.tab === "DA" ? (st.t > 24 ? "extreme" : "very high") : c === "none" ? (st.ctrl ? "low" : "moderate") : "high";
    return { ext, sbp: Math.round(sbp), hr: Math.round(hr), mal, tamp, rupt, risk, ar: c === "ar" && !st.surg, treated, fixed };
  }
  function tamp() {
    const target = st.drained ? 50 : st.tab === "TAMP" ? st.vol : st.comp === "tamponade" ? 250 : 0, acute = st.tab === "TAMP" ? st.acute === "acute" : true;
    const k = acute ? 260 : 900, v = st.cur, pp = 2 + 22 * Math.pow(v / k, 2.4), sv = clamp((pp - 6) / 16, 0, 1), sev = sv * (st.fluid && !st.drained ? 0.8 : 1);
    return { target, v, pp: Math.round(pp), sev, co: +(5.4 * (1 - 0.75 * sev)).toFixed(1), sbp: Math.round(122 - 62 * sev), hr: Math.round(74 + 50 * sev), pulsus: Math.round(4 + 20 * sev), ra: Math.round(6 + pp * 0.6) };
  }

  /* ---------- scene ---------- */
  function frame(dt) {
    const d = st.tab === "TAMP" ? null : dis(), p = tamp(), dtk = Math.min(1, dt * 1.5);
    st.cur += (p.target - st.cur) * Math.min(1, dt * (st.drained ? 0.9 : 3));
    const e = 0.02 + 0.13 * Math.cbrt(Math.max(0, st.cur) / 300), sh = (st.tab === "TAMP" || st.comp === "tamponade");
    M.peri.visible = M.eff.visible = sh && st.cur > 15; M.peri.scale.set(0.34 + e, 0.4 + e, 0.32 + e); M.eff.scale.set(0.33 + e * 0.92, 0.39 + e * 0.92, 0.31 + e * 0.92); M.eff.position.copy(HEART); M.peri.position.copy(HEART);
    const sq = 1 - 0.55 * (sh ? p.sev : 0); M.ra.scale.setScalar(sq); M.rv.scale.set(sq, sq, sq); M.heart.scale.setScalar(1 - 0.05 * (sh ? p.sev : 0));
    const dsec = st.tab !== "TAMP"; M.tear.visible = dsec && !st.surg && !st.tevar; M.tear.position.copy(at(st.tab === "DA" ? U_A : U_B)); const tg = CURVE.getTangentAt(st.tab === "DA" ? U_A : U_B); M.tear.lookAt(M.tear.position.clone().add(tg)); M.tear.scale.setScalar(1 + 0.15 * Math.sin(S.time() * 5));
    if (dsec) {
      const key = [st.tab, Math.round(d.ext * 40), st.surg, st.tevar].join("|"); if (key !== st.key) { st.key = key; rebuildDyn(d); }
    } else if (st.key !== "T") { st.key = "T"; M.dyn.clear?.call(M.dyn); while (M.dyn.children.length) M.dyn.remove(M.dyn.children[0]); }
    Object.keys(V).forEach((n) => { let q = 1; if (d) { if (n === "CORO" && d.mal.coro) q = 0.2; if (/^(BCT|LCCA)/.test(n) && d.mal.brain) q = 0.25; if (/RENAL|SMA/.test(n) && d.mal.gut) q = 0.25; if (n === "ILIAC_L" && d.mal.limb) q = 0.2; if (n === "AO") q = 1; } const f = F[n]; f.rate += (q - f.rate) * dtk; const dd = 0.55 + 0.45 * q; if (n !== "AO") V[n].material.color.setRGB(0.79 * dd, 0.32 * dd, 0.31 * dd); });
    kits.forEach((k) => k.frame(dt)); act_kit = act_kit && act_kit.grab ? act_kit : null;
    M.heart.material.opacity += ((st.ghost ? 0.3 : HG ? 0.88 : 0.6) - M.heart.material.opacity) * Math.min(1, dt * 4);
    M.heart.scale.multiplyScalar(1 + 0.012 * Math.sin(S.time() * ((d ? d.hr : p.hr) / 60) * 6.28));
  }
  function rebuildDyn(d) {
    while (M.dyn.children.length) M.dyn.remove(M.dyn.children[0]); const u0 = st.tab === "DA" ? U_A : U_B, u1 = Math.min(1, u0 + (1 - u0) * d.ext * (st.tab === "DA" ? 1.2 : 1.05) + 0.02), done = st.surg || st.tevar;
    const falseOff = [0.045, 0.0, 0.03], trueOff = [-0.03, 0.0, -0.02];
    M.dyn.add(tubeSub(u0, u1, falseOff, 0.07, done ? 0x5a3a60 : 0x7a1020, done ? 0.55 : 0.85)); M.dyn.add(tubeSub(u0, u1, trueOff, done ? 0.07 : 0.042, 0x5aa9ff, 0.9));
    if (st.surg) M.dyn.add(tubeSub(0.0, 0.22, [0, 0, 0], 0.112, 0x2ed8c3, 0.9, true));
    if (st.tevar) M.dyn.add(tubeSub(U_B - 0.08, U_B + 0.2, [0, 0, 0], 0.109, 0x2ed8c3, 0.9, true));
  }
  S.hooks.push(frame);
  S.onGrab = (o) => { for (const k of kits) if (k.mesh.visible && k.grabbed(o)) { act_kit = k; return true; } return false; };
  S.onDrag = (o, w) => { if (act_kit) act_kit.drag(w); }; S.onDrop = () => { if (act_kit) { act_kit.drop(); act_kit = null; } };
  S.onTap = () => {};
  const setTab = (k) => { st.tab = k; st.comp = "none"; build(); };
  function setOpt(id, v) { if (id === "ghost") st.ghost = v === "1"; else { st[id] = v; if (id === "acute") { st.vol = v === "acute" ? 250 : 700; st.cur = st.vol; st.drained = false; } if (id === "comp") { reset(); } } }
  const setT = (v) => { if (st.tab === "TAMP") { st.vol = v; if (!st.drained) st.cur = v; } else st.t = v; };
  function act(id) {
    const m = (s) => ui.refresh(s);
    if (id === "reset") { build(); return; }
    if (id === "pain") { st.pain = true; m("Analgesia given: pain-driven surges in pressure and heart rate settle."); }
    else if (id === "ctrl") { st.ctrl = true; m("Heart rate and blood pressure controlled (beta-blocker first, then a vasodilator if needed). Wall stress and false-lumen spread slow."); }
    else if (id === "surg") { if (!st.surg) { st.surg = true; st.tevar = false; m("Ascending aorta replaced with a graft and the entry tear resected. Complications are relieved."); } }
    else if (id === "tevar") { if (!st.tevar) M.kitT.place(); }
    else if (id === "fluid") { st.fluid = true; m("Fluid bolus: a short-lived rise in filling pressure. It is only a bridge to drainage."); }
    else if (id === "tap") { if (!st.drained) M.kitP.place(); }
  }

  /* ---------- readout ---------- */
  function obs() {
    const tn = st.tab, rows = [];
    let body = {}, note = "", ecg = null;
    if (tn === "TAMP") {
      const p = tamp(); rows.push({ k: "Pericardial fluid", v: Math.round(st.cur) + " mL (" + (st.acute === "acute" ? "sudden" : "slow") + ")", tone: p.sev > 0.5 ? "bad" : p.sev > 0.2 ? "warn" : "info" }, { k: "Pericardial pressure", v: p.pp + " mmHg", tone: p.pp > 15 ? "bad" : p.pp > 8 ? "warn" : "ok" }, { k: "Cardiac output", v: p.co + " L/min", tone: p.co < 3.5 ? "bad" : p.co < 4.5 ? "warn" : "ok" }, { k: "BP · HR", v: p.sbp + " systolic · " + p.hr + "/min", tone: p.sbp < 90 ? "bad" : p.sbp < 105 ? "warn" : "ok" }, { k: "Pulsus paradoxus", v: p.pulsus + " mmHg", tone: p.pulsus > 10 ? "bad" : "ok" }, { k: "Right atrial pressure", v: p.ra + " mmHg", tone: p.ra > 14 ? "bad" : "info" });
      body = { heart: p.sev > 0.5 ? 3 : p.sev > 0.15 ? 2 : p.st ? 1 : 0, chest: p.sev > 0.25 ? 1 : 0, "veins-R": p.sev > 0.3 ? 2 : 0, "veins-L": p.sev > 0.3 ? 2 : 0, "kidney-R": p.sev > 0.6 ? 1 : 0, "kidney-L": p.sev > 0.6 ? 1 : 0 };
      note = p.sev > 0.5 ? "Tamponade: the heart cannot fill. Drain the pericardium now; a fluid bolus only buys minutes." : p.sev > 0.15 ? "Early tamponade. Echo shows right-sided collapse; the next step depends on the haemodynamics." : "Fluid is present but the heart is still filling. Watch for a change in pressure or output.";
      ecg = { leads: [L("II", { r: 1 - 0.5 * p.sev }), L("V2", { r: 1 - 0.5 * p.sev }), L("V4", { r: 1 - 0.5 * p.sev }), L("V5", { r: 1 - 0.5 * p.sev })], h: 200, beat: +(60 / p.hr).toFixed(2) };
    } else {
      const d = dis(), p = tamp(); rows.push({ k: "False lumen extent", v: Math.round(d.ext * 100) + "% of the aorta", tone: d.ext > 0.8 ? "bad" : d.ext > 0.5 ? "warn" : "ok" }, { k: "BP · HR", v: d.sbp + " systolic · " + d.hr + "/min", tone: d.sbp > 120 && !d.rupt ? "warn" : d.sbp < 90 ? "bad" : "ok" }, { k: "Systolic target", v: "below 120 mmHg, HR about 60–80", tone: d.sbp <= 120 ? "ok" : "warn" }, { k: "Risk without repair", v: d.risk, tone: d.risk === "extreme" || d.risk === "very high" || d.risk === "high" ? "bad" : d.risk === "reduced" || d.risk === "low" ? "ok" : "warn" });
      if (tn === "DA") rows.push({ k: "Pericardial fluid", v: d.tamp ? "haemopericardium · tamponade" : "none", tone: d.tamp ? "bad" : "ok" }, { k: "Coronary / carotid flow", v: d.mal.coro ? "RCA obstructed" : d.mal.brain ? "carotid obstructed" : "preserved", tone: d.mal.coro || d.mal.brain ? "bad" : "ok" }, { k: "Aortic valve", v: d.ar ? "regurgitation" : "competent", tone: d.ar ? "bad" : "ok" });
      if (tn === "DB") rows.push({ k: "Branch vessels", v: d.mal.gut ? "renal + mesenteric malperfusion" : d.mal.limb ? "left leg ischaemia" : d.rupt ? "leak into left chest" : "perfused", tone: d.mal.gut || d.mal.limb || d.rupt ? "bad" : "ok" });
      body = { heart: d.tamp || d.mal.coro ? 3 : tn === "DA" ? 1 : 0, chest: tn === "DA" ? 2 : d.rupt ? 3 : 1, brain: d.mal.brain ? 3 : 0, neck: d.mal.brain ? 2 : 0, abdomen: d.mal.gut ? 3 : tn === "DB" ? 1 : 0, "kidney-R": d.mal.gut ? 3 : 0, "kidney-L": d.mal.gut ? 3 : 0, "leg-L": d.mal.limb ? 3 : 0, "leg-R": d.mal.limb ? 1 : 0 };
      if (d.treated) body = { chest: "rec" };
      note = d.treated ? "The entry tear is excluded and the false lumen is no longer fed. Continue blood-pressure control and arrange follow-up imaging." : d.rupt ? "Rupture or leak: this is complicated type B. Repair is needed now." : d.tamp ? "Blood in the pericardium: tamponade from the aortic root. Go to theatre." : tn === "DA" ? "A type A dissection needs emergency surgery. Pain relief and impulse control are the bridge only." : "Medical therapy first for uncomplicated type B. If malperfusion, rupture, or refractory pain or hypertension appears, TEVAR.";
      if (d.mal.coro) ecg = { leads: [L("II", { st: 0.4 }), L("V2", {}), L("V4", {}), L("V5", {})], h: 200, beat: +(60 / d.hr).toFixed(2) };
      void p;
    }
    return { params: rows, body, marks: {}, note, ecg: ecg || undefined };
  }
  function L(n, o) { return Object.assign({ n, r: 1, st: 0, t: 0.35, q: 0 }, o); }
  const info = () => ({ anat: T().anat, patho: T().patho, interv: T().interv });
  function clin() {
    const tn = st.tab, lines = [];
    lines.push(["Presentation", tn === "TAMP" ? "Breathlessness, tachycardia, low blood pressure, raised jugular venous pressure and muffled heart sounds (Beck's triad); pulsus paradoxus." : "Sudden tearing chest or back pain, often with a pulse or blood pressure difference between the arms; neurological signs, syncope or a new aortic murmur point to complications. Consider the diagnosis early when the pain and the risk fit."]);
    lines.push(["Diagnosis", tn === "TAMP" ? "Bedside echo: a pericardial effusion with right atrial and right ventricular diastolic collapse and a plethoric inferior vena cava. Low-voltage ECG or electrical alternans may be present." : "CT angiography of the whole aorta is the usual first test; transoesophageal echo is useful in the unstable patient. Do not delay for D-dimer in a high-risk patient."]);
    if (tn === "DA") lines.push(["Type A management (ACC/AHA 2022 aortic disease)", "Emergency open surgery. Before surgery: intravenous analgesia; heart-rate control with an intravenous beta-blocker first; add a vasodilator for a systolic pressure above 120 mmHg; avoid vasodilators alone, which raise the heart rate and wall stress. Avoid anticoagulation. If tamponade is present, definitive surgery; drainage only to the extent a surgical team advises, because releasing the pressure can increase bleeding."]);
    if (tn === "DB") lines.push(["Type B management (ACC/AHA 2022 aortic disease)", "Uncomplicated: medical therapy with systolic pressure below 120 mmHg and a heart rate of about 60–80, plus surveillance imaging. Complicated (malperfusion, rupture, refractory pain or hypertension, rapid growth): TEVAR is the usual treatment, with open or fenestration procedures for selected patients. Early TEVAR may be considered in selected uncomplicated patients with high-risk features."]);
    if (tn === "TAMP") lines.push(["Tamponade management", "Urgent echo-guided pericardiocentesis for tamponade with haemodynamic compromise; surgical drainage for clotted blood, trauma, post-cardiac-surgery or aortic rupture. Fluid is a short bridge only. Avoid positive-pressure ventilation and sedation before drainage if possible. Send fluid for analysis when the cause is unknown. Look for the cause: malignancy, infection, uraemia, post-procedure, aortic rupture."]);
    lines.push(["Reference", "2022 ACC/AHA guideline for the diagnosis and management of aortic disease; ESC pericardial disease guidance; local aortic-team and cardiac-surgery protocols. Teaching model: numbers are illustrative."]);
    return { lines };
  }

  const lab = {
    id: "aorta", name: "Aorta & Pericardium Lab", tag: "Aortic dissection and tamponade", icon: "🫀", tabs: ORDER.map((k) => ({ id: k, label: TABS[k].label, sub: TABS[k].sub })), get tab() { return st.tab; },
    selectHint: "Choose a complication, then treat. For TEVAR or pericardiocentesis, drag the tool tip to the glowing ring (or use the button).",
    opts: () => {
      const o = [];
      if (st.tab === "DA") o.push({ id: "comp", label: "Complication", cur: st.comp, choices: [["none", "None"], ["tamponade", "Tamponade"], ["coronary", "Coronary (RCA) obstruction"], ["cerebral", "Carotid obstruction"], ["ar", "Aortic regurgitation"]] });
      if (st.tab === "DB") o.push({ id: "comp", label: "Complication", cur: st.comp, choices: [["none", "None (uncomplicated)"], ["malp", "Renal and mesenteric malperfusion"], ["limb", "Leg ischaemia"], ["rupt", "Impending rupture"]] });
      if (st.tab === "TAMP") o.push({ id: "acute", label: "Onset", cur: st.acute, choices: [["acute", "Sudden (blood)"], ["slow", "Slow (effusion)"]] });
      return o;
    },
    slider: () => (st.tab === "TAMP" ? { id: "v", label: "Pericardial fluid (mL)", min: 0, max: st.acute === "acute" ? 400 : 1000, step: 10, v: st.vol, unit: " mL" } : { id: "t", label: "Hours since onset", min: 0, max: 72, step: 1, v: st.t, unit: " h" }),
    actions: () => {
      const a = [];
      if (st.tab === "DA") a.push({ id: "pain", label: "ANALGESIA", hint: "Treat pain.", off: st.pain }, { id: "ctrl", label: "CONTROL HR + BP", hint: "Beta-blocker first, then vasodilator.", off: st.ctrl }, { id: "surg", label: "SURGICAL REPAIR", hint: "Replace the ascending aorta.", off: st.surg });
      if (st.tab === "DB") a.push({ id: "pain", label: "ANALGESIA", hint: "Treat pain.", off: st.pain }, { id: "ctrl", label: "CONTROL HR + BP", hint: "Systolic below 120 mmHg.", off: st.ctrl }, { id: "tevar", label: "TEVAR", hint: "Cover the entry tear.", off: st.tevar });
      if (st.tab === "TAMP") a.push({ id: "fluid", label: "FLUID BOLUS", hint: "Short bridge only.", off: st.fluid || st.drained }, { id: "tap", label: "PERICARDIOCENTESIS", hint: "Drain the pericardium.", off: st.drained });
      a.push({ id: "reset", label: "RESET", hint: "Start again.", off: false }); return a;
    },
    dragHint: "Drag the stent-graft tip to the entry tear, or the pericardiocentesis needle to the pericardial space (glowing ring).",
    views: [{ id: "front", label: "Front", f: () => ({ ry: 0.2, rx: 0.1, d: st.tab === "TAMP" ? 3.0 : st.tab === "DB" ? 5.6 : 4.6, tx: st.tab === "TAMP" ? 0.15 : -0.3, ty: st.tab === "TAMP" ? -0.78 : st.tab === "DB" ? -0.7 : -0.1 }) }, { id: "side", label: "Side", f: () => ({ ry: 1.57, rx: 0.1, d: st.tab === "DB" ? 5.6 : 4.4, tx: -0.2, ty: st.tab === "DB" ? -0.7 : -0.2 }) }, { id: "top", label: "Top (arch)", f: () => ({ ry: 0.3, rx: 1.2, d: 3.6, tx: -0.2, ty: 0.3 }) }],
    credit: "Heart: BodyParts3D © DBCLS, CC BY-SA 2.1 JP. Adapted for teaching.",
    legend: [["#5aa9ff", "True lumen"], ["#7a1020", "False lumen"], ["#2ed8c3", "Graft / stent"], ["#c23a3a", "Pericardial fluid"], ["#ffd166", "Entry tear"]],
    setTab, setOpt, setT, act, info, obs, clin, st, ghost: (on) => { st.ghost = on; }, debug: () => ({ st, kit: st.tab === "TAMP" ? M.kitP : M.kitT }), tabLabel: () => T().label,
  };
  build();
  return lab;
}
