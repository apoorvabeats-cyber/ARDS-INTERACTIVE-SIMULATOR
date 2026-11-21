/* The MDT room's case engine.
   Dp(seed, specialties)  chooses a hidden case from the pool that fits the specialties at the table.
   Np(scenario, actions, ms)  replays every order the team has given and returns the patient as of `ms`.
   Pp(kind, ...)  says whether an order is one the room understands.
   Everything is deterministic: the same orders at the same times always give the same patient. */
import { BY_ID, canon, labelOf, LABS, NORMAL, PANELS, BUNDLE } from "./order-catalogue.js";
import { CASES, CASE_BY_ID } from "./case-pool.js";

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mdtHour = (ms) => `Hour ${Math.floor(ms / 15000)}`;
const SPECS = { intensivist: "Intensivist", pulmonologist: "Pulmonologist", cardiologist: "Cardiologist", nephrologist: "Nephrologist", infectious: "Infectious disease", gastroenterologist: "Gastroenterologist", surgeon: "Surgeon", neurologist: "Neurologist / Neurosurgeon" };
const specName = (s) => SPECS[s] || s;

/* ---------------------------------------------------------------- what each antibiotic covers */
const C = (s) => s.split(" ");
export const COVER = {
  "abx:ceftriaxone": C("strep mssa gneg"), "abx:cefoperazone": C("strep mssa gneg pseudo anaerobe"), "abx:piptaz": C("strep mssa gneg pseudo anaerobe enterococcus"),
  "abx:cefepime": C("strep mssa gneg pseudo"), "abx:ceftazidime": C("gneg pseudo"), "abx:meropenem": C("strep mssa gneg pseudo esbl anaerobe"),
  "abx:vancomycin": C("strep mssa mrsa enterococcus"), "abx:linezolid": C("strep mssa mrsa enterococcus toxin"), "abx:colistin": C("gneg pseudo esbl"),
  "abx:tigecycline": C("strep mssa mrsa gneg esbl anaerobe"), "abx:azithromycin": C("atypical"), "abx:doxycycline": C("atypical"), "abx:levofloxacin": C("atypical strep gneg"),
  "abx:metronidazole": C("anaerobe"), "abx:clindamycin": C("strep mssa anaerobe toxin"), "abx:amikacin": C("gneg pseudo"), "abx:amoxiclav": C("strep mssa gneg anaerobe"),
  "abx:ampicillin": C("strep enterococcus"), "abx:cotrimoxazole": C("mssa gneg"), "abx:oseltamivir": C("flu"), "abx:acyclovir": C("hsv"), "abx:fluconazole": C("candida"),
  "abx:imipenem": C("strep mssa gneg pseudo esbl anaerobe"), "abx:ertapenem": C("strep mssa gneg esbl anaerobe"), "abx:ceftazavi": C("gneg pseudo esbl"), "abx:cefazolin": C("strep mssa"), "abx:cefuroxime": C("strep mssa gneg"),
  "abx:cefotaxime": C("strep mssa gneg"), "abx:aztreonam": C("gneg pseudo"), "abx:gentamicin": C("gneg pseudo"), "abx:tobramycin": C("gneg pseudo"), "abx:teicoplanin": C("strep mssa mrsa enterococcus"),
  "abx:daptomycin": C("strep mssa mrsa enterococcus"), "abx:ciprofloxacin": C("gneg pseudo atypical"), "abx:moxifloxacin": C("atypical strep gneg"), "abx:clarithromycin": C("atypical strep"),
  "abx:erythromycin": C("atypical strep"), "abx:minocycline": C("atypical mssa mrsa"), "abx:cloxacillin": C("strep mssa"), "abx:flucloxacillin": C("strep mssa"), "abx:penicillin": C("strep"),
  "abx:amoxicillin": C("strep enterococcus"), "abx:ampsulbactam": C("strep mssa gneg anaerobe enterococcus"), "abx:polymyxinb": C("gneg pseudo esbl"), "abx:fosfomycin": C("gneg"),
  "abx:amphotericin": C("candida"), "abx:micafungin": C("candida"), "abx:caspofungin": C("candida"), "abx:voriconazole": C("candida"),
  "abx:echinocandin": C("candida"), "abx:any": C("strep mssa gneg pseudo anaerobe enterococcus"),
};
const NICE = { strep: "pneumococcus and streptococci", mssa: "staphylococci", mrsa: "MRSA", gneg: "Gram-negative rods", pseudo: "Pseudomonas", esbl: "ESBL producers", anaerobe: "anaerobes", atypical: "atypical organisms", toxin: "toxin production", flu: "influenza" };

/* orders that carry a risk when they have no indication, and orders that change nothing on their own */
const INVASIVE = new Set(["proc:source", "proc:cath", "proc:evd", "proc:endo", "proc:pericard", "proc:chestdrain", "proc:dialysis", "proc:hdline", "proc:bronch", "proc:ecmo", "proc:lp", "proc:tips", "proc:pacing", "proc:cardioversion", "proc:balloon"]);
const GLOBAL_HARM = {
  "drug:betablocker": [0.12, "A beta-blocker into a compromised circulation. The pressure falls.", null, (st) => st.sbp < 115],
  flood: [0.1, "Two litres without looking. The lungs are wetter.", null, () => true],
  "drug:nitrate": [0.1, "A vasodilator in a patient who is hypotensive. The pressure drops.", null, (st) => st.sbp < 105],
  "drug:kcl": [0.15, "Potassium given without a low level. The heart will not like it.", null, () => true],
  "drug:alteplase": [0.3, "Thrombolysis with no indication. The risk is bleeding.", null, () => true],
  "drug:insulindex": [0.06, "Insulin with dextrose in a patient with no high potassium. Hypoglycaemia is likely.", null, () => true],
  "lay-flat": [0.0, "", null, () => false],
};
const DUP_MS = { lab: 60000, img: 60000, proc: 60000, drug: 60000, abx: 120000, exam: 30000 };
const FLUID_MS = 15000;
const TD = { 1: 600000, 2: 520000, 3: 450000 };

const DEFAULT_IMG = {
  cxr: "Normal heart size and clear lung fields. No effusion.", ecg: "Sinus rhythm, {hr}/min. No acute ST-T change.", usg: "No free fluid. IVC normal. Lung sliding present on both sides.",
  echo: "Normal biventricular function, ejection fraction 60%. No effusion. IVC normal.", cthead: "No acute intracranial abnormality.", ctchest: "No consolidation, effusion or embolus.",
  ctabd: "No acute intra-abdominal pathology.", ctpa: "No filling defect in the pulmonary arteries.", ctangio: "Mesenteric vessels are patent.", xabd: "Normal bowel gas pattern. No free air.", mri: "No acute abnormality.",
};
const DEFAULT_MICRO = {
  cultures: "No growth yet (preliminary).", sputum: "No dominant organism. Routine culture sent.", urineculture: "No growth yet.", viral: "Influenza, RSV and SARS-CoV-2 not detected.", malaria: "No malarial parasites seen.",
  dengue: "NS1 negative.", ua: "Urine routine: no protein, no sugar, no ketones, no cells.", tox: "No relevant toxins detected.", csf: "Clear, colourless CSF. 2 cells per µL, protein 0.3 g/L, glucose 62 mg/dL.", eeg: "Normal background rhythm. No epileptiform activity.", crossmatch: "Group O positive. Four units cross-matched.",
};
const NORMAL_TXT = /^(clear|normal|no acute|not needed|no free|no pneumothorax|no mass|mesenteric vessels are patent|sinus rhythm|no filling|no consolidation|no growth|not detected|influenza, rsv|no malarial|ns1 negative|urine routine: no|no relevant|no dominant|clear, colourless|normal background|group o|no abnormality)/i;

/* ---------------------------------------------------------------- choosing a case */
function mulberry(seed) { let a = (Number(seed) || 1) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function recentCases() { try { return JSON.parse(localStorage.getItem("ccu-recent-cases") || "[]"); } catch { return []; } }
function rememberCase(id) { try { const r = recentCases().filter((x) => x !== id); r.push(id); localStorage.setItem("ccu-recent-cases", JSON.stringify(r.slice(-10))); } catch { /* storage may be blocked */ } }

export function eligibleCases(specs) {
  const team = new Set((specs || []).filter((s) => s && s !== "intensivist"));
  if (!team.size) return CASES.filter((c) => c.icu);
  return CASES.filter((c) => !c.icu && c.must.every((m) => team.has(m)) && [...c.must, ...c.fit].some((m) => team.has(m)));
}
export function caseWeights(specs, recent) {
  const team = new Set((specs || []).filter((s) => s && s !== "intensivist")), rec = recent || [];
  return eligibleCases(specs).map((c) => {
    const overlap = [...new Set([...c.must, ...c.fit])].filter((m) => team.has(m)).length;
    let w = 1 + 2 * overlap;
    const i = rec.lastIndexOf(c.id); if (i >= 0) w *= i >= rec.length - 3 ? 0.04 : 0.3;
    return { c, w };
  });
}
export function pickCase(seed, specs, recent) {
  const ws = caseWeights(specs, recent), tot = ws.reduce((a, x) => a + x.w, 0), rnd = mulberry(seed)();
  let r = rnd * tot; for (const x of ws) { r -= x.w; if (r <= 0) return x.c; }
  return ws[ws.length - 1].c;
}

/* every seated doctor gets a share of the work; steps that belong to an absent specialist fall to the doctors who are here */
function assignNeeds(c, specs) {
  const here = [...new Set((specs || ["intensivist"]).filter(Boolean))], owners = {}; here.forEach((s) => (owners[s] = []));
  if (!owners.intensivist) owners.intensivist = [];
  const rest = here.filter((s) => s !== "intensivist");
  c.needs.forEach((nd, i) => { const o = owners[nd.owner] ? nd.owner : rest.length ? rest[i % rest.length] : "intensivist"; owners[o].push(nd.id); });
  /* a doctor whose specialty owns no step shares one with the intensivist: the team always has something for everyone to work on */
  rest.filter((s) => !owners[s].length).forEach((s, i) => { const pool = owners.intensivist.length ? owners.intensivist : c.needs.map((x) => x.id); owners[s].push(pool[i % pool.length]); });
  return owners;
}

export function Dp(seed, specs, opts) {
  const list = (specs || ["intensivist"]).filter(Boolean), recent = (opts && opts.recent) || recentCases();
  const c = (opts && opts.caseId && CASE_BY_ID[opts.caseId]) || pickCase(seed, list, recent);
  if (!(opts && opts.noRemember)) rememberCase(c.id);
  const owners = assignNeeds(c, list), problems = Object.keys(owners).map((sp) => ({
    id: `${c.id}:${sp}`, specialty: sp, title: sp === "intensivist" ? "Overall resuscitation" : `${specName(sp)}: part of the case`, detail: `The steps that belong to ${specName(sp)}.`,
    opensAtMs: 0, graceMs: 36000, needs: owners[sp].slice(),
  }));
  const v = c.v, lab = c.lab || {};
  return {
    seed, caseId: c.id, diff: c.diff, name: c.name, age: c.age, sex: c.sex, dx: c.dx, story: c.story, team: list.slice(),
    hr: v.hr[0], sbp: v.sbp[0], dbp: v.dbp[0], spo2: v.spo2[0], rr: v.rr[0], gcs: v.gcs[0], temp: v.temp[0],
    lactate: tri(lab.lactate, "lactate")[0], cr: tri(lab.cr, "cr")[0], k: tri(lab.k, "k")[0], problems, shockable: !!c.shockable,
  };
}

function tri(spec, key) { const nm = NORMAL[key]; if (spec == null) return [nm, nm, nm]; if (typeof spec === "number") return [spec, spec, spec]; if (spec.length === 2) return [spec[0], spec[1], nm]; return spec; }
const lerp3 = (t, s, h) => t[0] + (t[1] - t[0]) * s + (t[2] - t[0]) * h;

/* ---------------------------------------------------------------- the patient, replayed */
export function Np(sc, actions, ms) {
  const c = CASE_BY_ID[sc.caseId] || CASES.find((x) => x.dx === sc.dx) || CASES[0], r = Math.max(0, ms | 0), Td = TD[c.diff] || 420000;
  const acts = [...(actions || [])].sort((a, b) => a.atMs - b.atMs);
  const st = { s: 0, h: 0, o2: 0, norepi: false, vaso: false, dobut: false, artLine: false, hdLine: false, dialysis: false, dialysisWaiting: false, bronch: false, tube: false, oxygen: false, sbp: sc.sbp };
  const ord = [];                  // every order that counted: {id, at, by}
  const first = {};                // first time each order id was given
  const last = {};                 // last time, for the repeat rule
  const kicks = [];                // short-lived improvements or worsenings: {at, dv, tau}
  const results = [], log = [{ t: "Hour 0", text: c.story }];
  const done = {}, announced = {}; let alive = true, arrestAt = null, rosc = 0, diedAt = null, heldAt = null, harmTotal = 0, ai = 0;
  const harmLog = [], needHit = {};
  const who = (a) => `${specName(a.specialty)} · ${a.name}`;
  const T = (ms2) => mdtHour(ms2);

  const vit = (t, extra) => {
    const s = st.s, h = st.h, out = {};
    for (const k of ["hr", "sbp", "dbp", "spo2", "rr", "gcs", "temp"]) out[k] = lerp3(c.v[k], s, h);
    out.uo = lerp3(c.v.uo || [55, 12, 65], s, h);          // urine output, mL per hour
    // support: what the team has put on the patient lifts the numbers, without curing the cause
    const base = out.spo2, q = [0, 0.45, 0.6, 0.7, 0.82][st.o2] * (c.ox == null ? 1 : c.ox);
    if (q && base < 98) out.spo2 = base + (98.5 - base) * q;
    if (st.o2 === 4) out.rr = Math.min(out.rr, 18 + (1 - h) * 6); else if (st.o2 === 3) out.rr -= (out.rr - 20) * 0.25;
    if (st.norepi) { out.sbp += 16; out.dbp += 8; out.hr -= 4; }
    if (st.vaso) { out.sbp += 6; out.dbp += 4; }
    if (st.dobut) { out.sbp += 5; out.hr += 4; }
    for (const kk of kicks) { const f = Math.exp(-(t - kk.at) / kk.tau); if (t >= kk.at) for (const p in kk.dv) out[p] += kk.dv[p] * f; }
    const wob = Math.sin(t / 6100) + 0.6 * Math.sin(t / 2300);
    out.hr += wob * 1.3; out.spo2 += wob * 0.35; out.sbp += wob * 1.5; out.dbp += wob * 0.8; out.rr += wob * 0.4;
    out.hr = clamp(out.hr, 28, 190); out.sbp = clamp(out.sbp, 40, 250); out.dbp = clamp(out.dbp, 20, 140); out.spo2 = clamp(out.spo2, 50, 100); out.rr = clamp(out.rr, 4, 60); out.uo = clamp(out.uo, 0, 400); out.gcs = clamp(out.gcs, 3, 15); out.temp = clamp(out.temp, 33, 42);
    if (extra) out.map = out.dbp + (out.sbp - out.dbp) / 3;
    return out;
  };
  const labv = (key, t) => {
    const spec = tri((c.lab || {})[key], key); let v = lerp3(spec, st.s, st.h);
    if (st.o2 >= 3 && key === "pco2" && v > 45) v -= (v - 45) * 0.35 * (st.h + 0.3);
    return v;
  };
  const fmt = (k, v) => { const L = LABS[k]; return L[3] ? v.toFixed(L[3]) : String(Math.round(v)); };
  const itemOf = (k, t) => { const L = LABS[k], v = labv(k, t), lo = L[0], hi = L[1], abn = v < lo - 1e-9 || v > hi + 1e-9; return { k, label: L[4], v: Math.round(v * 1000) / 1000, text: fmt(k, v), unit: L[2], lo, hi, abn, dir: v > hi ? "high" : v < lo ? "low" : "" }; };

  const ordered = (id, before) => ord.some((o) => o.id === id && (before == null || o.at < before));
  const cover = () => { const s = new Set(); ord.forEach((o) => (COVER[o.id] || []).forEach((x) => s.add(x))); return s; };
  const needsDone = () => c.needs.filter((nd) => done[nd.id] != null).length;
  function needTime(nd) {
    if (nd.cover) { const have = new Set(); let t = null; for (const o of ord) { (COVER[o.id] || []).forEach((x) => have.add(x)); if (t == null && nd.cover.every((x) => have.has(x))) t = o.at; } return t; }
    if (nd.all) { let t = -1; for (const id of nd.all) { const o = ord.find((x) => x.id === id && x.at >= t); if (!o) return null; t = o.at; } return t; }
    const hits = ord.filter((o) => nd.any.includes(o.id)); const need = nd.count || 1;
    return hits.length >= need ? hits[need - 1].at : null;
  }
  function refreshNeeds(t, a) {
    const fresh = [];
    for (const nd of c.needs) if (done[nd.id] == null) { const at = needTime(nd); if (at != null) { done[nd.id] = at; fresh.push(nd); } }
    if (fresh.length) { kicks.push({ at: t, dv: { sbp: 5 + fresh.length * 2, spo2: 2, hr: -3 }, tau: 70000 }); }
    return fresh;
  }

  /* one order, at one time */
  const lab0 = (id, pl) => (id === "drug:fluids" ? (pl.ml ? volText(pl.ml) + " of IV fluid" : "an IV fluid bolus") : labelOf(id));
  const fluidTotal = () => ord.filter((o) => o.id === "drug:fluids").reduce((n, o) => n + (o.ml || 0), 0);
  const fluidName = (say) => (/saline|\bns\b|sodium chloride/i.test(say || "") ? "normal saline" : /ringer|lactate|\brl\b|hartmann/i.test(say || "") ? "Ringer's lactate" : /plasma ?lyte/i.test(say || "") ? "Plasma-Lyte" : "IV fluid");
  function apply(a) {
    const t = a.atMs, raw = a.kind, who_ = who(a);
    if (raw === "enter") { log.push({ t: T(t), text: `${who_} entered the bedspace.` }); return; }
    if (raw === "advice") { const x = String((a.payload && a.payload.text) || "").slice(0, 240); if (x) log.push({ t: T(t), text: `${who_}: ${x}` }); return; }
    if (raw === "call") {
      const sp = (a.payload && a.payload.specialty) || "", relevant = [...c.must, ...c.fit].includes(sp) || (sc.team || []).includes(sp);
      if (relevant) log.push({ t: T(t), text: `${who_} called ${specName(sp)}.` }); else { st.s = clamp(st.s + 0.03, 0, 1); log.push({ t: T(t), text: `${who_} called ${specName(sp)}. That is not the problem in front of them. A little time was lost.` }); }
      return;
    }
    if (raw === "bundle" || raw === "labs") { BUNDLE.forEach((id, i) => apply({ ...a, kind: id, atMs: t + i })); return; }
    let id = canon(raw);
    if (!BY_ID[id] && id !== "flood" && id !== "lay-flat") { log.push({ t: T(t), text: `${who_} gave an order the room did not recognise (${String(raw).slice(0, 30)}).` }); return; }
    // ACLS
    if (id === "cpr" || id === "shock") { ord.push({ id, at: t, by: a.userId }); log.push({ t: T(t), text: id === "cpr" ? `${who_} started chest compressions.` : (sc.shockable ? `${who_} defibrillated.` : `${who_} delivered a shock. The rhythm was not shockable.`) }); return; }
    if (id === "drug:adrenaline" && arrestAt != null) { ord.push({ id: "adrenaline", at: t, by: a.userId }); log.push({ t: T(t), text: `${who_} gave adrenaline 1 mg.` }); return; }
    // the repeat rule
    const cat = (BY_ID[id] || {}).cat || "drug", win = id === "drug:fluids" ? FLUID_MS : (DUP_MS[cat] || 60000);
    const pl = orderPayload(a.payload), lk = id === "drug:fluids" ? id + ":" + (pl.ml || 0) : id;
    if (last[lk] != null && t - last[lk] < win && id !== "flood") { log.push({ t: T(t), text: `${who_} repeated ${lab0(id, pl)}. It was already ordered.` }); return; }
    last[lk] = t; if (first[id] == null) first[id] = t;
    const lab = labelOf(id), vNow = vit(t, true);

    // the harm that comes with the wrong order
    const ch = (c.harm || {})[id] || (GLOBAL_HARM[id] && GLOBAL_HARM[id][3](vNow) ? GLOBAL_HARM[id] : null);
    const indicated = c.needs.some((nd) => (nd.any || []).includes(id) || (nd.all || []).includes(id));
    let harmed = false;
    if (ch && ch[0] > 0 && !(!(c.harm || {})[id] && indicated)) {
      const unless = ch[2];
      if (!(unless && unless.some((u) => ordered(u, t)))) { st.s = clamp(st.s + ch[0], 0, 1); harmTotal += ch[0]; harmLog.push({ id, at: t }); log.push({ t: T(t), text: `${who_} gave ${lab}. ${ch[1]}` }); harmed = true; }
    }
    if (INVASIVE.has(id) && !indicated && !(c.ok || []).includes(id)) { st.s = clamp(st.s + 0.05, 0, 1); harmTotal += 0.05; harmLog.push({ id, at: t }); log.push({ t: T(t), text: `${who_} arranged ${lab}. There was no indication, and the trip cost time.` }); ord.push({ id, at: t, by: a.userId, harm: true }); return; }
    if (id === "flood") { for (let i = 0; i < 4; i += 1) ord.push({ id: "drug:fluids", at: t, by: a.userId, ml: 500 }); if (!harmed) log.push({ t: T(t), text: `${who_} gave two litres of crystalloid without checking the response.` }); refreshNeeds(t, a); return; }
    if (id === "lay-flat") { if (!harmed) log.push({ t: T(t), text: `${who_} laid the patient flat.` }); return; }

    ord.push({ id, at: t, by: a.userId, ...(pl.ml ? { ml: pl.ml } : {}), ...(pl.dose ? { dose: pl.dose } : {}), ...(pl.say ? { say: pl.say } : {}) });
    const fresh = refreshNeeds(t, a);

    // what the order is, and what it does at the bedside
    if (id === "examine") { log.push({ t: T(t), text: `${who_} examined the patient.` }); results.push({ id, label: "Examination", cat: "exam", text: c.exam || "No new findings.", abnormal: true, by: who_, orderedAtMs: t, readyAtMs: t + 8000, items: [] }); return; }
    const row = BY_ID[id];
    if (row.cat === "lab" || row.cat === "img" || id === "proc:lp" || id === "proc:eeg") {
      const key = id.split(":")[1]; let text, items = [], abnormal;
      if (PANELS[id]) {
        items = PANELS[id].map((k) => itemOf(k, t)); text = items.map((i) => `${i.label} ${i.text}${i.unit ? " " + i.unit : ""}${i.abn ? (i.dir === "high" ? " (H)" : " (L)") : ""}`).join(". ") + ".";
        abnormal = items.some((i) => i.abn);
        if (id === "lab:coag" && false) text += "";
      } else if (row.cat === "img") {
        const raw0 = (c.img || {})[key] != null ? c.img[key] : DEFAULT_IMG[key] || "No abnormality.";
        text = raw0.replace("{hr}", String(Math.round(vNow.hr))); abnormal = !NORMAL_TXT.test(text);
      } else {
        const mk = id === "proc:lp" ? "csf" : id === "proc:eeg" ? "eeg" : key;
        text = (c.micro || {})[mk] != null ? c.micro[mk] : DEFAULT_MICRO[mk] || "Sent."; abnormal = !NORMAL_TXT.test(text);
        if (id === "lab:crossmatch") abnormal = false;
      }
      const delay = (row.delaySec || 30) * 1000;
      results.push({ id, label: row.label, cat: row.cat === "img" ? "img" : "lab", text, items, abnormal, by: who_, orderedAtMs: t, readyAtMs: t + delay });
      log.push({ t: T(t), text: `${who_} ${row.cat === "img" ? "asked for" : id === "proc:lp" ? "did" : "sent"} ${lab}.` });
      if (id === "lab:cultures" && ord.some((o) => o.id.startsWith("abx:") && o.at < t)) log.push({ t: T(t), text: `${who_} sent blood cultures after the antibiotics had started. The yield is lower.` });
      else if (id === "lab:cultures") log.push({ t: T(t), text: `${who_} sent blood cultures before the antibiotics.` });
      return;
    }
    // procedures and drugs
    switch (id) {
      case "proc:oxygen": st.oxygen = true; st.o2 = Math.max(st.o2, 1); log.push({ t: T(t), text: `${who_} put oxygen on.` }); break;
      case "proc:hfnc": st.oxygen = true; st.o2 = Math.max(st.o2, 2); log.push({ t: T(t), text: `${who_} started high-flow nasal oxygen.` }); break;
      case "proc:niv": st.oxygen = true; st.o2 = Math.max(st.o2, 3); log.push({ t: T(t), text: `${who_} put the patient on non-invasive ventilation.` }); break;
      case "proc:intubate": st.tube = true; st.oxygen = true; st.o2 = 4; log.push({ t: T(t), text: `${who_} intubated. The airway is secure.` }); break;
      case "proc:prone": log.push({ t: T(t), text: `${who_} turned the patient prone.` }); break;
      case "proc:ecmo": log.push({ t: T(t), text: `${who_} started ECMO.` }); break;
      case "proc:artline": st.artLine = true; log.push({ t: T(t), text: `${who_} inserted an arterial line. It is transducing.` }); break;
      case "proc:cvc": log.push({ t: T(t), text: `${who_} inserted a central line.` }); break;
      case "proc:hdline": st.hdLine = true; log.push({ t: T(t), text: `${who_} inserted a dialysis catheter.` }); break;
      case "proc:dialysis": st.dialysisWaiting = true; if (st.hdLine) { st.dialysis = true; log.push({ t: T(t), text: `${who_} connected dialysis. The machine is running.` }); } else log.push({ t: T(t), text: `${who_} brought the dialysis machine. There is no dialysis catheter, so it is not connected.` }); break;
      case "proc:bronch": st.bronch = true; log.push({ t: T(t), text: `${who_} did a bronchoscopy. Secretions were cleared.` }); break;
      case "proc:chestdrain": log.push({ t: T(t), text: `${who_} placed a chest drain.` }); break;
      case "proc:pericard": log.push({ t: T(t), text: `${who_} drained the pericardium. ${indicated ? "A large volume came off and the pressure rose." : "Nothing useful came off."}` }); break;
      case "proc:source": log.push({ t: T(t), text: `${who_} took the patient for source control.` }); break;
      case "proc:cath": log.push({ t: T(t), text: `${who_} took the patient to the cath lab.` }); break;
      case "proc:endo": log.push({ t: T(t), text: `${who_} took the patient for endoscopy.${indicated ? " The bleeding point was treated." : ""}` }); break;
      case "proc:evd": log.push({ t: T(t), text: `${who_} arranged neurosurgical decompression.` }); break;
      case "proc:cooling": log.push({ t: T(t), text: `${who_} started active cooling.` }); break;
      case "proc:foley": log.push({ t: T(t), text: `${who_} placed a urinary catheter.` }); break;
      case "proc:removeline": log.push({ t: T(t), text: `${who_} removed the central line and sent the tip.` }); break;
      case "proc:pacing": case "proc:cardioversion": case "proc:balloon": case "proc:tips": case "proc:ngt": log.push({ t: T(t), text: `${who_} did ${lab}.` }); break;
      case "drug:norepi": st.norepi = true; log.push({ t: T(t), text: `${who_} started noradrenaline.` }); break;
      case "drug:vaso": st.vaso = true; log.push({ t: T(t), text: `${who_} added vasopressin.` }); break;
      case "drug:dobut": st.dobut = true; log.push({ t: T(t), text: `${who_} started dobutamine.` }); break;
      case "drug:adrenaline": st.norepi = true; log.push({ t: T(t), text: `${who_} started an adrenaline infusion.` }); break;
      case "drug:fluids": { const tot = fluidTotal(), what = fluidName(pl.say), amt = pl.ml ? volText(pl.ml) + " of " : "", more = pl.ml && tot > pl.ml ? ` ${volText(tot)} in total so far.` : "";
        if (vNow.spo2 < 90 && /wet|oedema|ARDS|pneumonia/i.test(c.dx + c.title) && !indicated) log.push({ t: T(t), text: `${who_} gave ${amt}${what} into wet lungs. The saturation fell.${more}` });
        else log.push({ t: T(t), text: `${who_} gave ${amt || "a measured "}${pl.ml ? what : pl.rate ? "IV fluid" : "fluid bolus (the volume was not stated)"}${pl.over ? ", over " + pl.over : ""}${pl.rate ? ", at " + pl.rate : ""}.${more}` }); break; }
      case "drug:blood": log.push({ t: T(t), text: `${who_} transfused blood.${/bleed|haemorrhage|trauma/i.test(c.dx) ? "" : " There is no bleeding, and the haemoglobin was not low."}` }); break;
      case "drug:insulindex": log.push({ t: T(t), text: `${who_} gave insulin with dextrose. Potassium will move inside the cell.` }); break;
      case "drug:calcium": log.push({ t: T(t), text: `${who_} gave calcium. The myocardium is stabilised, not cured.` }); break;
      default:
        if (row.cat === "abx") {
          const got = cover(); let line = `${who_} started ${id === "abx:any" ? "an antibiotic (the drug was not named)" : lab}${pl.dose ? " " + pl.dose : ""}${pl.over ? " over " + pl.over : ""}.`;
          const nd = c.needs.find((x) => x.cover);
          if (nd && !nd.cover.every((x) => got.has(x))) line += " The antibiotics so far leave gaps in the likely organisms.";
          log.push({ t: T(t), text: line });
        } else if (!harmed) log.push({ t: T(t), text: `${who_} gave ${lab}${pl.dose ? " " + pl.dose : ""}${pl.ml && !/^drug:fluids/.test(id) ? " " + volText(pl.ml) : ""}.${indicated || fresh.length ? "" : " It does not change the picture."}` });
    }
  }

  /* the per-second clock */
  let prevT = 0;
  for (let t = 0; t <= r && alive && heldAt == null; t += 1000) {
    while (ai < acts.length && acts[ai].atMs <= t) { apply(acts[ai]); ai += 1; }
    // pressure: weight of the steps that are overdue and undone, against the weight that has been done
    let W = 0, U = 0, D = 0, big = 0;
    for (const nd of c.needs) { W += nd.w; if (done[nd.id] != null) D += nd.w; else if (t >= nd.due * 1000) { U += nd.w; big = Math.max(big, nd.w); } }
    const u = U / W, d = D / W, crit = Math.min(1, big / 4), net = u + 0.35 * crit - 0.45 * d * (1 - crit);
    if (arrestAt == null) st.s = clamp(st.s + (net > 0 ? net * 1000 / Td : net * 1000 / 150000), 0, 1);
    st.h += ((d - st.h) * 1000) / 90000; st.h = clamp(st.h, 0, 1);
    // arrest, resuscitation, death
    if (arrestAt == null && st.s >= 0.98) {
      arrestAt = t; log.push({ t: T(t), text: sc.shockable ? "The rhythm is ventricular fibrillation. This is cardiac arrest. Start ACLS." : "There is no pulse. The rhythm is not shockable. Start ACLS." });
    }
    if (arrestAt != null) {
      const after = ord.filter((o) => o.at >= arrestAt), hasCpr = after.some((o) => o.id === "cpr"), hasAdr = after.some((o) => o.id === "adrenaline"), okShock = !sc.shockable || after.some((o) => o.id === "shock");
      if (hasCpr && hasAdr && okShock) { rosc += 1; arrestAt = null; st.s = 0.6; kicks.push({ at: t, dv: { sbp: 10, spo2: 4 }, tau: 60000 }); log.push({ t: T(t), text: "Return of circulation. The cause is still in the room." }); }
      else if (t > arrestAt + 60000) { alive = false; diedAt = t; log.push({ t: T(t), text: "The patient has died. The team did not get the circulation back." }); }
    }
    const wDone = c.needs.reduce((a, nd) => a + (done[nd.id] != null ? nd.w : 0), 0), wAll = c.needs.reduce((a, nd) => a + nd.w, 0), bigMiss = c.needs.some((nd) => done[nd.id] == null && nd.w >= 2);
    if (alive && arrestAt == null && wDone >= 0.85 * wAll && !bigMiss && st.s <= 0.12 && st.h >= 0.8 && t >= 150000) { heldAt = t; log.push({ t: T(t), text: "The patient is holding. Every step that mattered was taken." }); }
    prevT = t;
  }
  while (ai < acts.length && alive && heldAt == null && acts[ai].atMs <= r) { apply(acts[ai]); ai += 1; }

  // announcements when a specialty's part is complete
  const problems = (sc.problems || []).map((p) => {
    const all = p.needs.length ? p.needs.every((id) => done[id] != null) : needsDone() === c.needs.length;
    const called = acts.some((a) => a.kind === "call" && a.payload && a.payload.specialty === p.specialty && a.atMs <= r);
    return { ...p, open: p.opensAtMs <= r, resolved: all, called };
  });

  const tEnd = heldAt != null ? heldAt : alive ? r : diedAt;
  const v = vit(tEnd, true), arrested = alive && arrestAt != null;
  const lactate = labv("lactate", tEnd), cr = labv("cr", tEnd), kk = labv("k", tEnd);
  const missed = c.needs.filter((nd) => done[nd.id] == null).map((nd) => `${nd.label}`);
  const shown = results.filter((x) => x.readyAtMs <= r).sort((a, b) => a.readyAtMs - b.readyAtMs);
  const pending = results.filter((x) => x.readyAtMs > r).map((x) => ({ id: x.id, label: x.label, readyAtMs: x.readyAtMs }));
  let outcome = "", outcomeLine = "";
  if (!alive) { outcome = "died"; outcomeLine = "The patient died. What was not done is listed below."; } else if (heldAt != null) { outcome = "held"; outcomeLine = "The patient is holding. Every step that mattered was taken."; }

  // scoring, out of 100: assessment 15, differential 20, investigations 15, treatment 25, collaboration 15, timeliness 10
  const dxNeeds = c.needs.filter((nd) => /^(ecg|echo|dx|fast|ct|img|gas|labs|cbc|kft|enz|coag|lac|cx|sugar|usg|mp|cta|viral)$/.test(nd.id)), dxDone = dxNeeds.filter((nd) => done[nd.id] != null).length;
  const rxNeeds = c.needs.filter((nd) => !dxNeeds.includes(nd)), rxW = rxNeeds.reduce((a, x) => a + x.w, 0), rxDone = rxNeeds.reduce((a, x) => a + (done[x.id] != null ? x.w : 0), 0);
  const firstExam = first.examine != null ? first.examine : null, labsGot = Object.keys(first).filter((i) => /^(lab|img):/.test(i)).length;
  const irrelevant = Object.keys(first).filter((i) => /^(lab|img):/.test(i) && !c.needs.some((nd) => (nd.any || []).includes(i))).length;
  const docs = new Set(acts.filter((a) => a.atMs <= r).map((a) => a.userId)), teamN = Math.max(1, (sc.team || []).length);
  const inTime = c.needs.filter((nd) => done[nd.id] != null && done[nd.id] <= nd.due * 1000 * 1.25).length;
  const score = {
    assessment: Math.round(15 * ((firstExam != null && firstExam < 120000 ? 0.6 : firstExam != null ? 0.3 : 0) + (first["lab:abg"] != null || first["lab:lactate"] != null || first["img:ecg"] != null ? 0.4 : 0))),
    differential: Math.round(20 * (dxNeeds.length ? dxDone / dxNeeds.length : 1)),
    investigations: Math.max(0, Math.round(15 * (dxNeeds.length ? dxDone / dxNeeds.length : 1) - Math.max(0, irrelevant - 8))),
    treatment: Math.max(0, Math.round(25 * (rxW ? rxDone / rxW : 1) - harmTotal * 40)),
    collaboration: Math.round(15 * Math.min(1, docs.size / teamN)),
    timeliness: Math.round(10 * (c.needs.length ? inTime / c.needs.length : 1)),
  };
  score.total = score.assessment + score.differential + score.investigations + score.treatment + score.collaboration + score.timeliness;

  const given = {}; ord.forEach((o) => { given[o.id] = (given[o.id] || 0) + 1; });
  return {
    hour: Math.floor(r / 15000), elapsedMs: r,
    hr: alive ? (arrested ? 0 : Math.round(v.hr)) : 0, sbp: alive && !arrested ? Math.round(v.sbp) : 0, dbp: alive && !arrested ? Math.round(v.dbp) : 0, map: alive && !arrested ? Math.round(v.map) : 0,
    spo2: alive && !arrested ? Math.round(v.spo2) : 0, rr: alive ? (arrested ? 0 : Math.round(v.rr)) : 0, gcs: Math.round(v.gcs), temp: Math.round(v.temp * 10) / 10, uo: alive && !arrested ? Math.round(v.uo) : 0,
    lactate: Math.round(lactate * 10) / 10, cr: Math.round(cr * 10) / 10, k: Math.round(kk * 10) / 10,
    rhythm: !alive ? "pea" : arrested ? (sc.shockable ? "vf" : "pea") : "sinus", alive, outcome, outcomeLine,
    tube: st.tube, oxygen: st.oxygen, norepi: st.norepi, artLine: st.artLine, hdLine: st.hdLine, dialysis: st.dialysis, dialysisWaiting: st.dialysisWaiting, bronch: st.bronch,
    arrestAtMs: arrestAt, problems, results: shown, pending, log, missed, score, given, fluidMl: fluidTotal(),
    needs: c.needs.map((nd) => ({ id: nd.id, label: nd.label, owner: nd.owner, dueMs: nd.due * 1000, w: nd.w, doneAtMs: done[nd.id] == null ? null : done[nd.id] })),
    deterioration: Math.round(st.s * 100) / 100, recovery: Math.round(st.h * 100) / 100,
  };
}

/* may this order be given? every doctor who is seated can order anything the room knows */
export function Pp(kind) {
  const k = String(kind || "");
  return k === "advice" || k === "call" || k === "enter" || k === "bundle" || k === "labs" || k === "flood" || k === "lay-flat" || !!BY_ID[canon(k)];
}
/* what an order carries beside its id: the volume, the dose, the drug name as the doctor said it. Nothing is assumed
   when it is missing. Used by the room and by the engine, so both read an order the same way. */
export function orderPayload(o) {
  const p = {}, x = o || {}, ml = Math.round(+x.ml);
  if (ml > 0 && ml <= 20000) p.ml = ml;
  const t = (v, n) => String(v == null ? "" : v).replace(/[^\w .,%/\-]/g, "").slice(0, n);
  if (x.dose) p.dose = t(x.dose, 28); if (x.say) p.say = t(x.say, 40); if (x.over) p.over = t(x.over, 24); if (x.rate) p.rate = t(x.rate, 28);
  return p;
}
const volText = (ml) => (ml >= 1000 && ml % 100 === 0 ? ml / 1000 + " L" : Math.round(ml) + " mL");
export { mdtHour, specName, labelOf, canon };
export const Op = new Proxy({}, { get: (_, k) => labelOf(String(k)) });
