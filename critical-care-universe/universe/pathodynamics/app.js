/* PATHODYNAMICS · Interactive Clinical Pathophysiology
   Every lab follows the same five steps (select, explore, intervene, observe, correlate) and the same three views of a disease
   (anatomical, pathophysiological, interventional), all tied to one whole-body patient model. */
import { createStage } from "./stage.js?v=20261126gk";
import { ecgDraw } from "./charts.js?v=20261126gk";

const V = "20261126gk", EMBED = /[?&]embed=1/.test(location.search), $ = (s, r) => (r || document).querySelector(s), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LABS = [
  { id: "stroke", name: "Stroke Lab", tag: "Acute ischaemic stroke", icon: "🧠", col: "#9b7bff", blurb: "Choose the blocked artery, turn the brain, drag the clot out and watch the penumbra, the deficits and the whole body respond.", mods: "ICA · M1 · M2 · M3 · ACA · PCA · Basilar · Vertebral" },
  { id: "mi", name: "Heart Attack Lab", tag: "Acute myocardial infarction (STEMI and NSTEMI)", icon: "🫀", col: "#ff6b7c", blurb: "Block a coronary artery, read the ECG territory, then open it with a balloon and stent or with lysis.", mods: "STEMI · NSTEMI · RCA · LAD · LCx · Left main · PDA" },
  { id: "pe", name: "Pulmonary Embolism Lab", tag: "Clot in the pulmonary arteries", icon: "🫁", col: "#36d6ff", blurb: "Place the clot, watch the right ventricle strain and the oxygen fall, then reperfuse by catheter or lysis.", mods: "Saddle · Main PA · Lobar · Segmental · Subsegmental" },
  { id: "neuro", name: "Brain Bleed & ICP Lab", tag: "Haemorrhage, aneurysm, herniation, hydrocephalus", icon: "🧠", col: "#ff7a90", blurb: "Bleed, rupture, herniation: watch pressure rise, then coil, clip, drain and decompress.", mods: "ICH · SAH · Aneurysm · Herniation · Hydrocephalus · EVD" },
  { id: "aorta", name: "Aorta & Pericardium Lab", tag: "Aortic dissection and tamponade", icon: "🫀", col: "#ff9a5c", blurb: "Tear the aortic wall or fill the pericardium, then control, stent or drain.", mods: "Type A · Type B · Tamponade · TEVAR · Pericardiocentesis" },
  { id: "resp", name: "Lung & Pleura Lab", tag: "ARDS, pneumonia, pneumothorax, effusion, mucus plug", icon: "🫁", col: "#6fd3ff", blurb: "Recruit the lung, drain the pleura, clear the airway: see pressure, fluid and air change the chest.", mods: "ARDS · Pneumonia · Pneumothorax · Effusion · Mucus plug" },
  { id: "shock", name: "Shock & Metabolic Crisis Lab", tag: "Septic shock, DIC, anaphylaxis, acidosis, DKA, HHS", icon: "🩸", col: "#ff6b8a", blurb: "Watch the microcirculation: vasoplegia, clots, mast cells, acid and glucose, then correct them.", mods: "Septic shock · DIC · Anaphylaxis · Acidosis · DKA · HHS" },
  { id: "pancreas", name: "Pancreatitis Lab", tag: "Acute pancreatitis and necrosis", icon: "🩻", col: "#ffb347", blurb: "From oedema to infected necrosis: see the collections form, then step up drainage and necrosectomy.", mods: "Interstitial · Necrotising · APFC · ANC · WON · Infected" },
  { id: "hepbil", name: "Liver & Biliary Lab", tag: "Cholangitis and liver abscess", icon: "🟢", col: "#7fc46a", blurb: "Block the bile duct and watch the pressure and bacteria rise, then drain it. Seed an abscess in the liver and drain it.", mods: "Cholangitis · Pyogenic abscess · Amoebic abscess · ERCP · PTBD · Drain" },
  { id: "alf", name: "Acute Liver Failure Lab", tag: "Acute liver failure", icon: "🟠", col: "#ff9a3c", blurb: "Watch liver cells die from the central vein outwards, ammonia reach the brain, then give NAC, CRRT, hypertonic saline or a transplant.", mods: "Paracetamol · Viral hepatitis · Ischaemic hepatitis · Drug-induced · NAC · CRRT · Transplant" },
  { id: "bowel", name: "Bowel Ischaemia Lab", tag: "Acute mesenteric ischaemia", icon: "🟣", col: "#c77dff", blurb: "Block the mesenteric artery or vein, watch the bowel wall die layer by layer, then reopen the vessel and resect what is dead.", mods: "SMA embolus · SMA thrombosis · NOMI · Venous thrombosis · Stent · Resection · Second look" },
  { id: "aki", name: "Kidney Injury Lab", tag: "Acute kidney injury", icon: "🫘", col: "#27e0b0", blurb: "Follow one nephron from injury to recovery: hypoperfusion, tubular injury, obstruction and renal artery disease.", mods: "Prerenal · ATN · AIN · GN · Obstruction · Renal infarction · Renal artery stenosis" },
];
const SYSTEMS = [
  { id: "neuro", name: "Neurology", icon: "🧠", col: "#9b7bff", labs: ["stroke", "neuro"], what: "Ischaemic stroke · intracerebral and subarachnoid haemorrhage · aneurysm · herniation · hydrocephalus" },
  { id: "cardio", name: "Cardiology", icon: "🫀", col: "#ff6b7c", labs: ["mi", "aorta", "pe"], what: "STEMI · NSTEMI · coronary occlusion · aortic dissection · tamponade · pulmonary embolism" },
  { id: "resp", name: "Respiratory", icon: "🫁", col: "#36d6ff", labs: ["resp", "pe"], what: "ARDS · pneumonia · pulmonary embolism · pneumothorax · pleural effusion · mucus plug" },
  { id: "nephro", name: "Nephrology", icon: "🫘", col: "#27e0b0", labs: ["aki"], what: "Tubular injury · interstitial nephritis · glomerulonephritis · obstruction · renal infarction · renal artery stenosis" },
  { id: "gi", name: "Gastroenterology", icon: "🩻", col: "#ffb347", labs: ["pancreas", "hepbil", "alf", "bowel"], what: "Acute pancreatitis · pancreatic necrosis · acute cholangitis · liver abscess · acute liver failure · bowel ischaemia" },
  { id: "gcc", name: "General Critical Care", icon: "🩸", col: "#ff6b8a", labs: ["shock"], what: "Septic shock · DIC · anaphylaxis · metabolic acidosis · DKA · HHS" },
];
const STEPS = [["1", "SELECT"], ["2", "EXPLORE"], ["3", "INTERVENE"], ["4", "OBSERVE"], ["5", "CORRELATE"]];

let S = null, lab = null, def = null, step = 1, v3 = "anat", tm = 0, raf = 0, lastObs = "", viewId = "";
const app = $("#app"), toastEl = $("#toast");
function toast(t) { toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("on"), 2400); }
const closeBtn = () => (EMBED ? `<button class="ib" data-a="close" aria-label="Close">✕</button>` : "");

/* ---------------- home ---------------- */
function sysBlocks(sysId) {
  const labBtn = (l) => `<button class="lab" style="--lc:${l.col}" data-a="open" data-id="${l.id}"><em>${l.icon}</em><b>${l.name}</b><i>${esc(l.blurb)}</i><i>${esc(l.mods)}</i><small>OPEN LAB ▸</small></button>`;
  const chips = `<div class="syschips">${SYSTEMS.map((x) => `<button class="${x.id === sysId ? "on" : ""}" style="--lc:${x.col}" data-a="sys" data-id="${x.id}">${x.icon} ${x.name}</button>`).join("")}${sysId ? `<button data-a="home">All systems</button>` : ""}</div>`;
  return `<h2 class="sec">${sysId ? "SYSTEM" : "CHOOSE A SYSTEM, THEN A LAB"}</h2>${chips}` + SYSTEMS.filter((x) => !sysId || x.id === sysId).map((x) => `<h3 class="sysh" style="--lc:${x.col}"><em>${x.icon}</em> ${x.name}<small>${esc(x.what)}</small></h3><div class="labs">${x.labs.map((id) => labBtn(LABS.find((l) => l.id === id))).join("")}</div>`).join("");
}
function home(sysId) {
  teardown();
  app.innerHTML = `<div class="top"><div class="brand">CRITICAL CARE HUB</div>${closeBtn()}</div>
<div class="hero"><h1>PATHODYNAMICS</h1><div class="sub">INTERACTIVE CLINICAL PATHOPHYSIOLOGY</div>
<p>Explore disease mechanisms, anatomical abnormalities and physiological responses through interactive 3D models. Don't just read what a disease is: open the model, see what is going wrong, correct it, and watch the patient respond.</p></div>
<div class="steps5">${STEPS.map((s) => `<div><b>${s[0]}</b>${s[1]}</div>`).join("")}</div>
<div class="three"><div><b>Anatomical view</b>What is happening inside the organ?</div><div><b>Pathophysiological view</b>Why is it happening, and what changes?</div><div><b>Interventional view</b>What happens when the doctor treats it?</div></div>
${sysBlocks(sysId)}
<div class="note"><b>Educational simulation.</b> These are simplified teaching models with illustrative numbers, not patient data, and not a substitute for current guidelines or local protocols. Management content is aligned to: <b>AHA/ASA 2026</b> (acute ischaemic stroke), <b>ACC/AHA 2025</b> (acute coronary syndromes), <b>AHA/ACC 2026</b> (acute pulmonary embolism), <b>ACG 2024 / AGA 2020 / Revised Atlanta</b> (pancreatitis), <b>Tokyo Guidelines 2018</b> (acute cholangitis), <b>ACG 2023</b> (acute liver failure), <b>WSES 2022</b> (acute mesenteric ischaemia) and <b>KDIGO 2012</b> (AKI; the 2026 update is still in draft), <b>AHA/ASA 2022</b> (intracerebral haemorrhage) with <b>AHA/ACC 2025</b> (blood pressure), <b>AHA/ASA 2023</b> (aneurysmal SAH), <b>ACC/AHA 2022</b> (aortic disease), <b>ATS 2024</b> (ARDS) and <b>ATS 2025</b> (pneumonia), <b>BTS 2023</b> (pleural disease), <b>Surviving Sepsis Campaign 2026</b>, <b>ISTH 2025</b> (DIC) and <b>ADA/EASD/JBDS 2024</b> (DKA and HHS). Checked November 2026 against the published summaries. Always follow your local protocol.</div>`;
}

/* ---------------- lab shell ---------------- */
async function openLab(id) {
  teardown(); def = LABS.find((l) => l.id === id); if (!def) return home(); step = 1; v3 = "anat"; viewId = "";
  app.innerHTML = `<div class="top"><button class="ib" data-a="home" aria-label="Back">←</button><div class="brand">PATHODYNAMICS · ${esc(def.name.toUpperCase())}</div>${closeBtn()}</div>
<div class="stagebox"><div class="stage" id="stage"><div class="vbar" id="vbar"></div><div class="rbar" id="rbar"></div><div class="legend" id="legend"></div><div class="hint" id="hint"></div><div class="credit" style="position:absolute;right:10px;bottom:5px;max-width:40%;text-align:right;font-size:9px;line-height:1.25;color:#7d8aa6;pointer-events:none" id="credit"></div></div>
<div class="stepper" id="stepper">${STEPS.map((s) => `<button data-a="step" data-n="${s[0]}"><b>${s[0]}</b>${s[1]}</button>`).join("")}</div></div>
<div id="panel"><div class="boot"><div class="ring"></div></div></div>`;
  try {
    S = createStage($("#stage"));
    const mod = await import(`./labs/${id}.js?v=${V}`);
    lab = mod.default(S, { hint, refresh }); window.__patho = { S, lab }; { const cr = $("#credit"); if (cr) cr.textContent = lab.credit || ""; }
    buildBars(); renderPanel(); tm = setInterval(tick, 350); raf = requestAnimationFrame(loop);
  } catch (e) { console.error(e); $("#panel").innerHTML = `<div class="panel"><h3>COULD NOT START THE 3D VIEW</h3><p>This device could not start the 3D scene (${esc(e.message || e)}). Try reloading, or open the lab in another browser.</p></div>`; }
}
function teardown() { clearInterval(tm); cancelAnimationFrame(raf); if (S) { try { S.dispose(); } catch (e) { /* ignore */ } } S = null; lab = null; lastObs = ""; }
function hint(t, go) { const h = $("#hint"); if (!h) return; h.textContent = t || ""; h.classList.toggle("on", !!t); h.classList.toggle("go", !!go); }
function buildBars() {
  $("#vbar").innerHTML = (lab.views || []).map((v) => `<button data-a="view" data-id="${v.id}">${v.label}</button>`).join("");
  $("#rbar").innerHTML = `<button class="sbtn" data-a="auto" title="Auto-rotate">AUTO</button><button class="sbtn" data-a="ghost" title="See-through tissue">X-RAY</button><button class="sbtn" data-a="cut" title="Cut the organ open">CUT</button><button class="sbtn" data-a="zin">＋</button><button class="sbtn" data-a="zout">－</button>`;
  S.cut(0);
  $("#legend").innerHTML = (lab.legend || []).map((l) => `<span><i style="background:${l[0]}"></i>${l[1]}</span>`).join("");
}
function refresh(msg) { if (msg) toast(msg); if (msg && step < 4 && /retrieved|opened|deployed|restored|drained|relieved|reperfus/i.test(msg)) { setStep(4); return; } renderPanel(); }
function setStep(n) { step = n; document.querySelectorAll("#stepper button").forEach((b) => b.classList.toggle("on", +b.dataset.n === n)); renderPanel(); window.scrollTo({ top: 0, behavior: "smooth" }); }

/* ---------------- panels ---------------- */
function sliderHTML() {
  const s = lab.slider && lab.slider(); if (!s) return "";
  return `<div class="slide" id="sl"><label><span>${esc(s.label)}</span><b id="slv">${s.fmt ? s.fmt(s.v) : s.v + (s.unit || "")}</b></label><input type="range" id="slr" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.v}" ${s.locked ? "disabled" : ""}></div>`;
}
function renderPanel() {
  if (!lab) return; const P = $("#panel"); document.querySelectorAll("#stepper button").forEach((b) => b.classList.toggle("on", +b.dataset.n === step));
  let h = "";
  if (step === 1) {
    h = `<div class="panel"><h3>1 · SELECT THE PATHOLOGY</h3><div class="chips">${lab.tabs.map((t) => `<button class="chip${t.id === lab.tab ? " on" : ""}" data-a="tab" data-id="${t.id}"><b>${esc(t.label)}</b><i>${esc(t.sub || "")}</i></button>`).join("")}</div>
${(lab.opts() || []).map((o) => `<div class="seg"><label>${esc(o.label).toUpperCase()}</label>${o.choices.map((c) => `<button class="${c[0] === o.cur ? "on" : ""}" data-a="opt" data-id="${o.id}" data-v="${c[0]}">${esc(c[1])}</button>`).join("")}</div>`).join("")}
<p style="color:var(--mut);font-size:13px">${esc(lab.selectHint || "You can also tap the highlighted structure in the 3D model to select it.")}</p><button class="sbtn" style="width:100%;padding:12px;font-weight:800;letter-spacing:.1em" data-a="step" data-n="2">EXPLORE IT IN 3D ▸</button></div>`;
  } else if (step === 2) {
    const inf = lab.info(), K = [["anat", "ANATOMICAL", "What is happening inside the organ?"], ["patho", "PATHOPHYSIOLOGICAL", "Why, and what changes?"], ["interv", "INTERVENTIONAL", "What does treatment do?"]];
    h = `<div class="panel"><h3>2 · EXPLORE · ${esc(lab.tabLabel ? lab.tabLabel() : "")}</h3><div class="tabs3">${K.map((k) => `<button class="${v3 === k[0] ? "on" : ""}" data-a="v3" data-id="${k[0]}">${k[1]}<br><small style="font-weight:500;letter-spacing:0">${k[2]}</small></button>`).join("")}</div><p>${esc(inf[v3] || "")}</p>
<p style="color:var(--mut);font-size:13px">Drag to rotate · pinch or use ＋ － to zoom · ◐ makes tissue see-through · use the view buttons on the model.</p><button class="sbtn" style="width:100%;padding:12px;font-weight:800;letter-spacing:.1em" data-a="step" data-n="3">INTERVENE ▸</button></div>`;
  } else if (step === 3) {
    h = `<div class="panel"><h3>3 · INTERVENE</h3><div class="dragnote">${esc(lab.dragHint || "")}</div>${sliderHTML()}<div class="act">${(lab.actions() || []).map((a) => `<button data-a="act" data-id="${a.id}" ${a.off ? "disabled" : ""}>${esc(a.label)}<small>${esc(a.hint || "")}</small></button>`).join("")}</div><div id="dyn" style="margin-top:12px"></div></div>`;
  } else if (step === 4) {
    h = `<div class="panel"><h3>4 · OBSERVE THE RESPONSE</h3>${sliderHTML()}<div id="dyn"></div></div>`;
  } else {
    h = `<div class="panel"><h3>5 · CLINICAL CORRELATION</h3><div id="dyn"></div></div>`;
  }
  P.innerHTML = h; lastObs = ""; dyn(true);
  document.querySelectorAll(".vbar button").forEach((b) => b.classList.toggle("on", b.dataset.id === viewId));
}
function dyn(force) {
  const box = $("#dyn"); if (!box || !lab) return;
  if (step === 3) { const o = lab.obs(), s = JSON.stringify([o.params, o.note]); if (!force && s === lastObs) return; lastObs = s; box.innerHTML = `<div class="params">${o.params.slice(0, 4).map(prm).join("")}</div><div class="note2">${esc(o.note)}</div>`; }
  else if (step === 4) {
    const o = lab.obs(), s = JSON.stringify([o.params, o.note, o.body, o.marks, o.ecgKey]); if (!force && s === lastObs) return; lastObs = s;
    box.innerHTML = `<div class="params">${o.params.map(prm).join("")}</div>${o.ecg ? `<canvas class="ecg" id="ecg" width="640" height="${o.ecg.h || 220}"></canvas>` : ""}<div class="note2">${esc(o.note)}</div>`;
  } else if (step === 5) {
    if (!force) return; const c = lab.clin(); box.innerHTML = `<dl class="corr">${c.lines.map((l) => `<dt>${esc(l[0]).toUpperCase()}</dt><dd>${esc(l[1])}</dd>`).join("")}</dl><div class="note" style="margin-top:12px">Teaching logic only. Follow your current guideline and local protocol.</div>`;
  }
}
const prm = (p) => `<div class="prm ${p.tone || ""}"><span>${esc(p.k)}</span><b>${esc(p.v)}</b></div>`;
function tick() { if (!lab) return; if (step >= 3 && step <= 5) { dyn(false); const sl = lab.slider && lab.slider(); const r = $("#slr"); if (r && sl) { r.disabled = !!sl.locked; if (document.activeElement !== r) r.value = sl.v; const l = $("#slv"); if (l) l.textContent = sl.fmt ? sl.fmt(sl.v) : sl.v + (sl.unit || ""); } } }
function loop(t) { raf = requestAnimationFrame(loop); if (!lab || step !== 4) return; const cv = $("#ecg"); if (!cv) return; if (t - (loop.l || 0) < 66) return; loop.l = t; const o = lab.obs(); if (o.ecg) ecgDraw(cv, o.ecg.leads, S.time(), o.ecg); }

/* ---------------- events ---------------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
  if (a === "open") { location.hash = "/lab/" + b.dataset.id; }
  else if (a === "home") { location.hash = "/"; }
  else if (a === "sys") { location.hash = "/sys/" + b.dataset.id; }
  else if (a === "close") { try { parent.postMessage({ type: "ccpatho-close" }, "*"); } catch (er) { /* ignore */ } }
  else if (a === "step") setStep(+b.dataset.n);
  else if (!lab) return;
  else if (a === "tab") { lab.setTab(b.dataset.id); renderPanel(); }
  else if (a === "opt") { lab.setOpt(b.dataset.id, b.dataset.v); renderPanel(); }
  else if (a === "v3") { v3 = b.dataset.id; renderPanel(); }
  else if (a === "act") { lab.act(b.dataset.id); renderPanel(); }
  else if (a === "view") { const v = lab.views.find((x) => x.id === b.dataset.id); if (v) { viewId = v.id; S.auto(false); S.view(v.f()); document.querySelectorAll(".vbar button").forEach((x) => x.classList.toggle("on", x.dataset.id === viewId)); } }
  else if (a === "auto") { const on = S.auto(); b.classList.toggle("on", on); }
  else if (a === "ghost") { const on = !b.classList.contains("on"); b.classList.toggle("on", on); lab.setOpt("ghost", on ? "1" : "0"); }
  else if (a === "cut") { const lv = S.cut(), nx = lv < 0.1 ? 0.25 : lv < 0.4 ? 0.5 : lv < 0.65 ? 0.75 : 0; S.cut(nx); b.classList.toggle("on", nx > 0); b.textContent = nx ? "CUT " + (nx < 0.4 ? 1 : nx < 0.65 ? 2 : 3) : "CUT"; }
  else if (a === "zin") S.zoom(0.82); else if (a === "zout") S.zoom(1.2);
});
document.addEventListener("input", (e) => { if (e.target.id === "slr" && lab) { lab.setT(+e.target.value); tick(); dyn(false); } });
function route() { const h = location.hash || "", m = h.match(/^#\/lab\/(\w+)/), q = h.match(/^#\/sys\/(\w+)/); if (m) openLab(m[1]); else if (q && SYSTEMS.some((x) => x.id === q[1])) home(q[1]); else home(); }
window.addEventListener("hashchange", route); route();
