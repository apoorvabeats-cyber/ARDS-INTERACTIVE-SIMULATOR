/* The clinical language of the ward, understood.
   Every term, abbreviation and round expression in clinical-lexicon.js is known here: what it means, and what it says about THIS patient.
   voice-brain.js calls pre() before its own readers (definitions, round expressions, the verbs of management, handover requests)
   and post() after them (a plain term that nothing else took). Both return answer cards, or null.
   The cards use only what a doctor in the room could see: the numbers, the results that came back, what was given. They never name
   the hidden diagnosis and never use the teaching hints. */
import { LEXICON, GROUPS } from "./clinical-lexicon.js?v=20261124g";

let IDX = null;
function nk0(s) {
  return " " + String(s || "").toLowerCase().replace(/₂/g, "2").replace(/[-_/]/g, " ").replace(/\bhaem/g, "hem").replace(/([a-z])aem/g, "$1em").replace(/oedema/g, "edema").replace(/oea\b/g, "ea").replace(/oeic\b/g, "eic")
    .replace(/\btype (?:one|i)\b/g, "type 1").replace(/\btype (?:two|ii)\b/g, "type 2").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim() + " ";
}
const nk = (s) => nk0(s).trim();
function build(H) {
  if (IDX) return IDX;
  const keys = new Map(), byTerm = new Map();
  LEXICON.forEach((row) => {
    const [g, term, meaning, aliases] = row, e = { g, term, meaning, aliases, id: g + ":" + term.toLowerCase() };
    if (!byTerm.has(term.toLowerCase())) byTerm.set(term.toLowerCase(), e);
    new Set([term, ...aliases]).forEach((a) => { const k = nk(H.repair(a)); if (k && !keys.has(k)) keys.set(k, e); });
  });
  IDX = { keys: [...keys.entries()].sort((a, b) => b[0].length - a[0].length), byTerm, all: LEXICON.map((r) => byTerm.get(r[1].toLowerCase())) };
  return IDX;
}
export function find(H, c) {
  const ix = build(H), t = nk0(c), used = new Uint8Array(t.length), hits = [];
  for (const [key, e] of ix.keys) {
    const kk = " " + key + " "; let i = t.indexOf(kk);
    while (i >= 0) {
      const a = i + 1, b = i + kk.length - 1; let free = true; for (let j = a; j < b; j += 1) if (used[j]) { free = false; break; }
      if (free) { for (let j = a; j < b; j += 1) used[j] = 1; if (!hits.some((h) => h.e === e)) hits.push({ e, at: a, key }); break; }
      i = t.indexOf(kk, i + 1);
    }
  }
  return hits.sort((x, y) => x.at - y.at);
}
const wordsIn = (s) => nk(s).split(" ").filter(Boolean);

/* ---------------------------------------------------------------- the patient, as the ward sees it */
function facts(P, H) {
  const lac = H.latestItem(P, "lactate"), ph = H.latestItem(P, "ph"), co2 = H.latestItem(P, "pco2"), o2 = H.latestItem(P, "po2"), cr = H.latestItem(P, "cr"), urea = H.latestItem(P, "urea");
  const shock = P.sbp < 90 || P.map < 65, rows = ["bp", "hr", "rr", "spo2", "temp", "gcs", "uo"].map((k) => ({ k, L: H.lvl[k](P) })), worst = Math.max(...rows.map((r) => r.L));
  const bad = rows.filter((r) => r.L > 0).map((r) => H.VT[r.k].name);
  const organ = { Respiratory: P.spo2 < 94 || P.rr > 28 || !!P.tube, Circulation: shock || !!P.norepi, Kidney: (cr && cr.it.v > 1.5) || P.uo < 35, Brain: P.gcs < 15, Lactate: lac && lac.it.v > 2 };
  const nOrgan = Object.values(organ).filter(Boolean).length;
  const arrest = P.alive === false || (P.hr === 0 && P.sbp === 0) || (P.rhythm && P.rhythm !== "sinus");
  const intake = (P.fluidMl != null ? P.fluidMl : ((P.given && P.given["drug:fluids"]) || 0) * 500) + ((P.given && P.given["drug:albumin"]) || 0) * 100;
  return { lac, ph, co2, o2, cr, urea, shock, worst, bad, organ, nOrgan, arrest, intake, unstable: shock || arrest || P.hr > 130 || P.hr < 40 || !!P.norepi };
}
function trendOf(P, hist, H) {
  const h = (hist || []).filter((x) => x && typeof x.map === "number").slice(-8);
  if (h.length < 3) return { score: 0, known: false, a: null, b: null };
  const a = h[0], b = h[h.length - 1], dm = b.map - a.map, ds = b.spo2 - a.spo2, dh = b.hr - a.hr;
  const score = (dm > 4 ? 1 : dm < -4 ? -1 : 0) + (ds > 1.5 ? 1 : ds < -1.5 ? -1 : 0) + (dh < -6 ? 1 : dh > 6 ? -1 : 0);
  return { score, known: true, a, b, dm, ds, dh };
}
const examOf = (P, H) => { const r = (P.results || []).filter((x) => x.cat === "exam" || x.id === "examine").pop(); return r ? r.text : ""; };
const num = (x, d) => Math.round(x * (d || 1)) / (d || 1);

/* ---------------------------------------------------------------- the answers by term */
/* each returns { title?, lines, tone, actions?, section?, spoken?, verdict? } or null. They are keyed by the term in lower case. */
const A = (label, order) => ({ label, order });
function makeEval(H) {
  const { card } = H, ev = {};
  const given = (P, id) => H.given(P, id);
  const gen = (h) => (P, ctx) => h(P, ctx, facts(P, H));
  const story = (title) => gen((P, ctx) => ({ lines: [ctx.story ? ctx.story.text : "Open the History page."], tone: "info", section: "history", spoken: ctx.story ? ctx.story.text : "Open the history page." }));
  ["presentation", "chief complaint", "history of present illness (hopi)", "comorbidities", "baseline status"].forEach((k) => { ev[k] = story(k); });
  ev["clinical examination"] = (P) => { const t = examOf(P, H); return t ? { lines: [t], tone: "info", section: "history", spoken: t } : { lines: ["The patient has not been examined yet."], tone: "info", actions: [A("Examine now", "examine")], spoken: "Not examined yet." }; };
  ev["general condition"] = gen((P, c, f) => ({ title: f.worst === 2 ? "Critically ill" : f.worst === 1 ? "Unwell" : "General condition acceptable", lines: [f.bad.length ? "Abnormal: " + f.bad.join(", ") : "Vitals within range.", f.nOrgan ? `${f.nOrgan} organ system${f.nOrgan > 1 ? "s" : ""} affected` : "No organ system flagged"], tone: ["ok", "warn", "crit"][f.worst], section: "vitals", spoken: f.worst === 2 ? "Critically ill." : f.worst === 1 ? "Unwell." : "Acceptable." }));
  ev["sick-looking"] = gen((P, c, f) => ({ title: f.worst ? "Yes, sick-looking" : "Not by the numbers", lines: [f.bad.length ? "Abnormal: " + f.bad.join(", ") : "Vitals within range.", examOf(P, H) || "Examine the patient for the general appearance."], tone: ["ok", "warn", "crit"][f.worst], section: "vitals", actions: examOf(P, H) ? [] : [A("Examine now", "examine")], spoken: f.worst ? "Yes, he looks sick." : "Not by the numbers." }));
  ev["toxic appearance"] = ev["sick-looking"];
  ev["hemodynamically stable"] = gen((P, c, f) => ({ title: f.unstable ? "No, hemodynamically unstable" : "Yes, hemodynamically stable", lines: [`BP ${P.sbp}/${P.dbp}, MAP ${P.map}, HR ${P.hr}`, P.norepi ? "Needs a vasopressor to hold the pressure." : f.shock ? "MAP or systolic is below target." : "No vasopressor needed.", f.arrest ? "Rhythm is not sinus." : ""], tone: f.unstable ? (P.map < 55 || f.arrest ? "crit" : "warn") : "ok", section: "vitals", spoken: f.unstable ? "Not stable. Hemodynamically unstable." : "Yes, hemodynamically stable." }));
  ev["hemodynamically unstable"] = gen((P, c, f) => Object.assign(ev["hemodynamically stable"](P, c), { title: f.unstable ? "Yes, hemodynamically unstable" : "No, not unstable" }));
  ev["clinically stable"] = gen((P, c, f) => { const t = trendOf(P, c.hist, H); return { title: f.worst === 0 && t.score >= 0 ? "Yes, clinically stable" : "Not stable", lines: [f.bad.length ? "Abnormal: " + f.bad.join(", ") : "All vitals within range.", t.known ? (t.score > 0 ? "Trend: improving." : t.score < 0 ? "Trend: getting worse." : "Trend: steady.") : "Too few readings for a trend."], tone: f.worst === 0 && t.score >= 0 ? "ok" : f.worst === 2 ? "crit" : "warn", section: "vitals", spoken: f.worst === 0 ? "Yes, stable." : "Not stable." }; });
  ev["moribund"] = gen((P, c, f) => { const m = P.alive !== false && (f.arrest || P.map < 45 || P.gcs <= 5 || P.spo2 < 80); return { title: P.alive === false ? "The patient has died" : m ? "Yes, near death" : "No, not moribund", lines: [`MAP ${P.map}, SpO₂ ${P.spo2}%, GCS ${P.gcs}`], tone: m || P.alive === false ? "crit" : "ok", section: "vitals", spoken: m ? "Yes, near death." : "No." }; });
  ev["critical condition"] = gen((P, c, f) => ({ title: f.worst === 2 || f.unstable ? "Yes, critical" : "Not critical by the numbers", lines: [f.bad.length ? "Abnormal: " + f.bad.join(", ") : "Vitals within range.", `${f.nOrgan} organ system${f.nOrgan === 1 ? "" : "s"} affected`], tone: f.worst === 2 ? "crit" : f.worst ? "warn" : "ok", section: "vitals", spoken: f.worst === 2 ? "Yes, critical." : "Not critical by the numbers." }));
  ev["prognosis"] = gen((P, c, f) => { const t = trendOf(P, c.hist, H), lines = [f.lac ? `Lactate ${f.lac.it.text}` : "", P.norepi ? "On a vasopressor" : "", `${f.nOrgan} organ system${f.nOrgan === 1 ? "" : "s"} affected`, t.known ? (t.score > 0 ? "Trend improving" : t.score < 0 ? "Trend worsening" : "Trend steady") : ""].filter(Boolean); return { title: f.nOrgan >= 3 || P.alive === false ? "Guarded" : f.nOrgan === 0 ? "Favourable so far" : "Uncertain", lines: lines.concat("The outcome depends on the cause, and on how fast it is treated."), tone: f.nOrgan >= 3 ? "warn" : "info", spoken: f.nOrgan >= 3 ? "Guarded." : "Uncertain, and it depends on the treatment." }; });
  ev["clinical course"] = gen((P, c) => { const t = trendOf(P, c.hist, H), log = (P.log || []).slice(-4).map((l) => `${l.t}: ${l.text}`); return { title: t.known ? (t.score > 0 ? "Improving" : t.score < 0 ? "Getting worse" : "Holding steady") : "Course so far", lines: log.length ? log : ["Nothing has happened yet."], tone: t.score < 0 ? "warn" : "info", section: "treat", spoken: t.known ? (t.score > 0 ? "Improving." : t.score < 0 ? "Getting worse." : "Holding steady.") : "Nothing much has happened yet." }; });
  const hidden = () => ({ title: "Not named yet", lines: ["This is a blind case. Build the working diagnosis from the history, the examination and the tests, then give your plan."], tone: "info", section: "diagnosis", spoken: "The diagnosis is hidden. Build it from the findings." });
  ev["working diagnosis"] = hidden; ev["differential diagnosis"] = hidden;

  /* vital signs and their words */
  ev["vitals"] = (P) => H.summaryCard(P);
  ev["hypertension"] = (P) => ({ title: P.sbp > 140 ? "Yes, hypertensive" : "No, not hypertensive", lines: [`BP ${P.sbp}/${P.dbp}`], tone: P.sbp > 180 ? "crit" : P.sbp > 140 ? "warn" : "ok", section: "vitals", spoken: `${P.sbp > 140 ? "Yes" : "No"}. Blood pressure ${P.sbp} over ${P.dbp}.` });
  ev["hypothermia"] = (P) => ({ title: P.temp < 36 ? "Yes, hypothermic" : "No, not hypothermic", lines: [`Temperature ${Number(P.temp).toFixed(1)} °C`, P.temp < 35 ? "Below 35 °C: warm the patient and look for the cause." : ""].filter(Boolean), tone: P.temp < 35 ? "crit" : P.temp < 36 ? "warn" : "ok", section: "vitals", spoken: `Temperature ${Number(P.temp).toFixed(1)}.` });
  ev["afebrile"] = (P) => ({ title: P.temp < 38 && P.temp >= 36 ? "Yes, afebrile" : P.temp >= 38 ? "No, febrile" : "Cold, not febrile", lines: [`Temperature ${Number(P.temp).toFixed(1)} °C`], tone: P.temp >= 38 || P.temp < 36 ? "warn" : "ok", section: "vitals", spoken: `Temperature ${Number(P.temp).toFixed(1)}.` });
  ev["bradypnea"] = (P) => ({ title: P.rr < 10 ? "Yes, breathing too slowly" : "No, not bradypnoeic", lines: [`Respiratory rate ${P.rr} /min`], tone: P.rr < 8 ? "crit" : P.rr < 10 ? "warn" : "ok", section: "vitals", spoken: `Respiratory rate ${P.rr}.` });
  ev["hyperoxia"] = gen((P, c, f) => { const hi = (f.o2 && f.o2.it.v > 120) || (P.spo2 >= 100 && (P.oxygen || P.tube)); return { title: hi ? "Possibly hyperoxic" : "No, not hyperoxic", lines: [f.o2 ? `PaO₂ ${f.o2.it.text} mmHg` : `SpO₂ ${P.spo2}%`, hi ? "Turn the oxygen down toward a saturation of 94 to 98%." : ""], tone: hi ? "warn" : "ok", section: "vitals", spoken: hi ? "Possibly hyperoxic." : "No." }; });
  ev["apnea"] = (P) => ({ title: P.rr === 0 || P.alive === false ? "Yes, not breathing" : "No, breathing", lines: [`Respiratory rate ${P.rr} /min`], tone: P.rr === 0 ? "crit" : "ok", section: "vitals", spoken: P.rr === 0 ? "Yes, not breathing." : "No, he is breathing." });
  ev["anuria"] = (P) => ({ title: P.uo < 10 ? "Yes, anuric" : "No, passing urine", lines: [`Urine output ${P.uo} mL/h`], tone: P.uo < 10 ? "crit" : "ok", section: "vitals", spoken: `Urine output ${P.uo} millilitres an hour.` });
  ev["polyuria"] = (P) => ({ title: P.uo > 150 ? "Yes, polyuric" : "No, not polyuric", lines: [`Urine output ${P.uo} mL/h`], tone: P.uo > 150 ? "warn" : "ok", section: "vitals", spoken: `Urine output ${P.uo} millilitres an hour.` });
  ev["pulse pressure"] = (P) => { const pp = P.sbp - P.dbp; return { title: "Pulse pressure", big: String(pp), unit: "mmHg", lines: [pp < 25 ? "Narrow: low stroke volume." : pp > 60 ? "Wide: low systemic resistance, or a stiff aorta." : "Within the usual range.", `BP ${P.sbp}/${P.dbp}`], tone: pp < 25 || pp > 60 ? "warn" : "ok", section: "vitals", spoken: `Pulse pressure ${pp}.` }; };
  ev["altered sensorium"] = (P) => ({ title: P.gcs < 15 ? "Yes, the conscious level is reduced" : "No, awake", lines: [`GCS ${P.gcs}/15`, H.words("gcs", P)], tone: P.gcs <= 8 ? "crit" : P.gcs < 15 ? "warn" : "ok", section: "vitals", spoken: `G C S ${P.gcs}.` });
  ev["altered mental status"] = ev["altered sensorium"];

  /* the circulation */
  ev["perfusion"] = gen((P, c, f) => { const ex = examOf(P, H), signs = [f.shock ? `MAP ${P.map}` : "", f.lac && f.lac.it.v > 2 ? `Lactate ${f.lac.it.text}` : "", P.uo < 35 ? `Urine ${P.uo} mL/h` : "", P.gcs < 15 ? `GCS ${P.gcs}` : ""].filter(Boolean); return { title: signs.length >= 2 ? "Perfusion is poor" : signs.length ? "Perfusion is at risk" : "Perfusion looks adequate", lines: [signs.length ? signs.join(" · ") : `MAP ${P.map}, urine ${P.uo} mL/h, GCS ${P.gcs}`, f.lac ? "" : "Lactate has not been measured.", /cold|mottl|clammy|capillary/i.test(ex) ? ex : ""], tone: signs.length >= 2 ? "crit" : signs.length ? "warn" : "ok", section: "vitals", actions: f.lac ? [] : [A("Send lactate", "lab:lactate")], spoken: signs.length ? "Perfusion is poor." : "Perfusion looks adequate." }; });
  ev["hypoperfusion"] = (P, c) => Object.assign({}, ev["perfusion"](P, c));
  ev["peripheral perfusion"] = gen((P, c, f) => { const ex = examOf(P, H); return { title: "Peripheral perfusion", lines: [ex ? ex : "Look at the skin, the temperature of the limbs and the capillary refill on examination.", f.shock ? "The pressure is low, so expect poor perfusion." : "The pressure is adequate."], tone: ex ? "info" : "info", section: "history", actions: ex ? [] : [A("Examine now", "examine")], spoken: ex || "Examine the patient to see peripheral perfusion." }; });
  ev["capillary refill time"] = ev["peripheral perfusion"];
  ev["shock"] = gen((P, c, f) => { const n = [f.shock ? "low pressure" : "", f.lac && f.lac.it.v > 2 ? "raised lactate" : "", P.uo < 35 ? "low urine output" : "", P.gcs < 15 ? "reduced consciousness" : ""].filter(Boolean); return { title: f.shock ? "Yes, in shock" : "Not in shock by pressure", lines: [`BP ${P.sbp}/${P.dbp}, MAP ${P.map}`, n.length ? "Signs: " + n.join(", ") : "No sign of hypoperfusion.", f.shock ? "The type is a clinical decision: history, echo, source and the lactate." : ""], tone: f.shock ? (P.map < 55 ? "crit" : "warn") : "ok", section: "vitals", spoken: f.shock ? "Yes, he is in shock." : "No shock by pressure." }; });
  const shockType = (what, check) => gen((P, c, f) => ({ title: what, lines: [f.shock ? `The patient is hypotensive (MAP ${P.map}). Decide which type from the evidence.` : "The pressure is acceptable now.", ...check(P, f)], tone: "info", section: "vitals", spoken: what + ". The type is decided from the evidence." }));
  const seen = (P, id, label) => { const r = H.latestResult(P, id); return r ? `${label}: ${(r.text || "").slice(0, 120)}` : `${label}: not done yet`; };
  ev["cardiogenic shock"] = shockType("Cardiogenic shock is decided by the heart", (P) => [seen(P, "img:echo", "Echo"), seen(P, "img:ecg", "ECG")]);
  ev["septic shock"] = shockType("Septic shock needs an infection and a vasopressor", (P, f) => [P.temp >= 38 || P.temp < 36 ? `Temperature ${Number(P.temp).toFixed(1)} °C` : "No temperature change", f.lac ? `Lactate ${f.lac.it.text}` : "Lactate not measured", P.norepi ? "Already on a vasopressor." : "No vasopressor yet."]);
  ev["hypovolemic shock"] = shockType("Hypovolaemic shock is decided by the volume lost", (P) => [`Fluid given so far: ${facts(P, H).intake} mL`, seen(P, "lab:cbc", "CBC")]);
  ev["distributive shock"] = shockType("Distributive shock is a low resistance state", (P, f) => [`Pulse pressure ${P.sbp - P.dbp} mmHg`, f.lac ? `Lactate ${f.lac.it.text}` : "Lactate not measured"]);
  ev["obstructive shock"] = shockType("Obstructive shock is a block to flow", (P) => [seen(P, "img:echo", "Echo"), seen(P, "img:cxr", "Chest X-ray")]);
  ev["vasopressor support"] = (P) => ({ title: P.norepi ? "Yes, on norepinephrine" : "No vasopressor yet", lines: [`BP ${P.sbp}/${P.dbp}, MAP ${P.map}`, P.norepi ? (P.map < 65 ? "Still below target: increase the dose, or add vasopressin." : "MAP at target.") : P.map < 65 ? "The MAP is low and fluids alone may not be enough." : "Not needed now."], tone: !P.norepi && P.map < 65 ? "warn" : "info", section: "treat", actions: P.norepi ? [A("Add vasopressin", "drug:vaso")] : [A("Start norepinephrine", "drug:norepi")], spoken: P.norepi ? "Yes, on norepinephrine." : "No vasopressor yet." });
  ev["inotropic support"] = (P) => ({ title: given(P, "drug:dobut") ? "Yes, on dobutamine" : "No inotrope yet", lines: [seen(P, "img:echo", "Echo"), `BP ${P.sbp}/${P.dbp}`], tone: "info", section: "treat", actions: given(P, "drug:dobut") ? [] : [A("Dobutamine", "drug:dobut")], spoken: given(P, "drug:dobut") ? "Yes." : "No inotrope yet." });
  ev["fluid responsiveness"] = gen((P, c, f) => ({ title: "Not measured directly", lines: [`Fluid given so far: ${f.intake} mL`, "Passive leg raise with a stroke volume or an echo is the test. A rising MAP after a bolus is the bedside answer.", P.sbp < 90 ? "The pressure is low, so a bolus is reasonable if the lungs allow." : ""], tone: "info", actions: [A("500 mL bolus", "drug:fluids"), A("Bedside ultrasound", "img:usg")], section: "treat", spoken: "Not measured directly. A bolus and the response is the bedside test." }));
  ev["volume status"] = gen((P, c, f) => ({ title: "Volume status", lines: [`Fluid given so far: ${f.intake} mL`, `Urine output ${P.uo} mL/h`, `MAP ${P.map}, HR ${P.hr}`, seen(P, "img:usg", "Bedside ultrasound")], tone: "info", section: "treat", actions: given(P, "img:usg") ? [] : [A("Bedside ultrasound", "img:usg")], spoken: `${f.intake} millilitres given so far. Urine ${P.uo} an hour.` }));
  const echoLine = (name, what) => (P) => ({ title: name, lines: [what, seen(P, "img:echo", "Echo")], tone: "info", section: "invest", actions: given(P, "img:echo") ? [] : [A("Echocardiogram", "img:echo")], spoken: `${name}. ${what}` });
  ev["preload"] = echoLine("Preload", "Not a number on this monitor. Judge it from the echo, the IVC and the response to fluid.");
  ev["afterload"] = echoLine("Afterload", "Not a number on this monitor. The MAP and the systemic resistance stand for it.");
  ev["contractility"] = echoLine("Contractility", "Judged from the echo: the ejection fraction and the wall motion.");
  ev["cardiac output"] = echoLine("Cardiac output", "Not measured here. The echo (VTI) or an arterial line trace gives an estimate.");
  ev["cardiac index"] = echoLine("Cardiac index", "Cardiac output divided by body surface area. Not measured here.");
  ev["lactate clearance"] = (P) => { const ls = (P.results || []).flatMap((r) => (r.items || []).filter((i) => i.k === "lactate").map((i) => ({ v: i.v, at: r.readyAtMs }))).sort((a, b) => a.at - b.at); if (ls.length < 2) return { title: "Needs two lactates", lines: [ls.length ? `One lactate so far: ${ls[0].v}` : "No lactate yet.", "Repeat it 2 hours after the first."], tone: "info", actions: [A("Repeat lactate", "lab:lactate")], section: "invest", spoken: "I need two lactate values." }; const a = ls[0].v, b = ls[ls.length - 1].v, cl = Math.round(((a - b) / a) * 100); return { title: `Clearance ${cl}%`, big: `${cl}%`, lines: [`Lactate ${a} → ${b}`, cl >= 10 ? "Falling: perfusion is improving." : "Not clearing: keep resuscitating and look for the cause."], tone: cl >= 10 ? "ok" : "warn", section: "invest", spoken: `Lactate clearance ${cl} percent.` }; };
  ev["congestion"] = (P) => ({ title: "Congestion", lines: [seen(P, "img:cxr", "Chest X-ray"), examOf(P, H) || "Look for raised JVP, crackles and oedema on examination."], tone: "info", section: "invest", spoken: "Look at the chest film and examine for congestion." });

  /* breathing and the ventilator */
  ev["respiratory distress"] = gen((P, c, f) => { const d = P.rr > 28 || P.spo2 < 90; return { title: d ? "Yes, in respiratory distress" : P.rr > 20 || P.spo2 < 94 ? "Mild distress" : "No distress", lines: [`Respiratory rate ${P.rr}, SpO₂ ${P.spo2}%`, P.tube ? "On the ventilator." : P.oxygen ? "On oxygen." : "On room air."], tone: d ? "crit" : P.rr > 20 || P.spo2 < 94 ? "warn" : "ok", section: "vitals", spoken: d ? "Yes, in respiratory distress." : "No distress." }; });
  ev["respiratory failure"] = gen((P, c, f) => { const t1 = (f.o2 && f.o2.it.v < 60) || (P.spo2 < 90 && (P.oxygen || P.tube)), t2 = f.co2 && f.co2.it.v > 45 && f.ph && f.ph.it.v < 7.35, any = t1 || t2; return { title: any ? (t2 ? "Yes, type 2 respiratory failure" : "Yes, type 1 respiratory failure") : f.o2 || f.co2 ? "Not by the gas" : "Needs a blood gas", lines: [f.o2 ? `PaO₂ ${f.o2.it.text} mmHg` : "", f.co2 ? `PaCO₂ ${f.co2.it.text} mmHg, pH ${f.ph ? f.ph.it.text : "?"}` : "", !f.o2 && !f.co2 ? `SpO₂ ${P.spo2}%. A blood gas decides the type.` : ""].filter(Boolean), tone: any ? "crit" : "info", section: "invest", actions: f.o2 || f.co2 ? [] : [A("Send ABG", "lab:abg")], spoken: any ? "Yes, respiratory failure." : "Not by the gas." }; });
  ev["type 1 respiratory failure"] = gen((P, c, f) => { const t1 = f.o2 ? f.o2.it.v < 60 : P.spo2 < 90; return { title: f.o2 ? (t1 ? "Yes, hypoxaemic" : "No, PaO₂ is adequate") : "Needs a blood gas", lines: [f.o2 ? `PaO₂ ${f.o2.it.text} mmHg` : `SpO₂ ${P.spo2}%`, f.co2 ? `PaCO₂ ${f.co2.it.text} mmHg` : ""].filter(Boolean), tone: t1 ? "crit" : "info", section: "invest", actions: f.o2 ? [] : [A("Send ABG", "lab:abg")], spoken: t1 ? "Yes, hypoxaemic." : "Needs a blood gas." }; });
  ev["type 2 respiratory failure"] = gen((P, c, f) => { const t2 = f.co2 && f.co2.it.v > 45; return { title: f.co2 ? (t2 ? "Yes, hypercapnic" : "No, PaCO₂ is not raised") : "Needs a blood gas", lines: [f.co2 ? `PaCO₂ ${f.co2.it.text} mmHg, pH ${f.ph ? f.ph.it.text : "?"}` : "A PaCO₂ above 45 mmHg with a low pH is type 2."], tone: t2 ? "crit" : "info", section: "invest", actions: f.co2 ? [] : [A("Send ABG", "lab:abg")], spoken: t2 ? "Yes, hypercapnic." : "Needs a blood gas." }; });
  ev["work of breathing (wob)"] = (P) => { const ex = examOf(P, H), acc = /accessory|retraction|recession|paradox/i.test(ex), hi = P.rr > 28 || acc; return { title: hi ? "Yes, increased work of breathing" : "Work of breathing is not raised", lines: [`Respiratory rate ${P.rr}`, acc ? "Accessory muscles are in use." : ex ? "No accessory muscle use noted." : "Examine to look for accessory muscle use and indrawing."], tone: hi ? "warn" : "ok", section: "vitals", actions: ex ? [] : [A("Examine now", "examine")], spoken: hi ? "Yes, increased." : "Not raised." }; };
  ev["accessory muscle use"] = (P) => { const ex = examOf(P, H), acc = /accessory/i.test(ex); return { title: acc ? "Yes, accessory muscles in use" : ex ? "No accessory muscle use noted" : "Not examined yet", lines: [ex || "Examine the patient.", `Respiratory rate ${P.rr}`], tone: acc ? "warn" : "info", section: "history", actions: ex ? [] : [A("Examine now", "examine")], spoken: acc ? "Yes." : "Not noted." }; };
  ev["increased oxygen requirement"] = (P, c) => { const t = trendOf(P, c.hist, H), more = (P.oxygen || P.tube) && P.spo2 < 94; return { title: more ? "Yes, the oxygen is not enough" : P.oxygen || P.tube ? "The oxygen is holding him" : "On room air", lines: [`SpO₂ ${P.spo2}%`, P.tube ? "On the ventilator." : P.oxygen ? "On oxygen." : "No oxygen yet.", t.known && t.ds < -1.5 ? "Saturation is falling." : ""].filter(Boolean), tone: more ? "warn" : "ok", section: "treat", actions: more && !P.tube ? [A("Escalate", P.oxygen ? "proc:hfnc" : "proc:oxygen")] : [], spoken: more ? "Yes, he needs more." : "Holding." }; };
  ev["oxygen escalation"] = (P) => { const l = ladder(P); return { title: l ? "Next step: " + l[0] : "Already ventilated", lines: [`SpO₂ ${P.spo2}%, respiratory rate ${P.rr}`, l ? "Room air, mask, high-flow, NIV, then intubation: step up when the saturation or the work of breathing says so." : "Adjust the ventilator, consider proning."], tone: "info", section: "treat", actions: l ? [A(l[0], l[1])] : [A("Prone", "proc:prone")], spoken: l ? "Next step is " + l[0] + "." : "Already ventilated." }; };
  const weanOxy = (P, c) => { const ok = P.spo2 >= 96 && P.rr < 24 && P.gcs >= 14 && P.map >= 65; return { title: P.tube ? (ok && !P.norepi ? "Reasonable to try a breathing trial" : "Not ready to wean the ventilator") : P.oxygen ? (ok ? "Reasonable to wean the oxygen" : "Not ready to wean") : "No oxygen to wean", lines: [`SpO₂ ${P.spo2}%, RR ${P.rr}, GCS ${P.gcs}, MAP ${P.map}`, P.norepi ? "Still on a vasopressor." : "", ok ? "" : "Wait until the saturation is 96% or more, the rate under 24 and the pressure is steady."].filter(Boolean), tone: ok ? "ok" : "warn", section: "treat", spoken: ok ? "Reasonable to wean." : "Not ready to wean." }; };
  ev["oxygen weaning"] = weanOxy; ev["wean"] = weanOxy; ev["spontaneous breathing trial"] = weanOxy; ev["trial off"] = weanOxy;
  ev["extubation"] = (P, c) => { const w = weanOxy(P, c); return Object.assign(w, { title: P.tube ? (w.tone === "ok" && !P.norepi ? "Reasonable to extubate if the cough and the airway are safe" : "Not ready to extubate") : "He is not intubated", note: "The simulator does not model extubation. Your decision is recorded." }); };
  ev["reintubation"] = (P) => ({ title: P.tube ? "Already intubated" : "Reintubation is available", lines: [`SpO₂ ${P.spo2}%, GCS ${P.gcs}`], tone: "info", section: "treat", actions: P.tube ? [] : [A("Intubate", "proc:intubate")], spoken: P.tube ? "Already intubated." : "Say intubate." });
  const vstate = (name, what, tip) => (P) => ({ title: name, lines: [P.tube ? "On the ventilator. This simulator does not show or change the settings." : "He is not ventilated, so there is no setting.", what, tip].filter(Boolean), tone: "info", section: "treat", spoken: `${name}. ${what}` });
  ev["peep"] = vstate("PEEP", "The pressure left in the lungs at the end of expiry.", "A usual start is 5 to 10 cmH₂O; more in ARDS.");
  ev["fio₂"] = (P) => ({ title: "FiO₂", lines: [P.tube ? "On the ventilator. This simulator does not show the setting." : P.oxygen ? "On oxygen." : "Room air is 21%.", `SpO₂ ${P.spo2}%`, "Aim for a saturation of 92 to 96% with the lowest FiO₂."], tone: "info", section: "treat", spoken: "Aim for the lowest FiO two that keeps the saturation at 92 to 96 percent." });
  ev["tidal volume"] = vstate("Tidal volume", "Volume per breath.", "Lung-protective: 6 mL/kg of predicted body weight.");
  ev["plateau pressure"] = vstate("Plateau pressure", "The pressure on an inspiratory hold.", "Keep it under 30 cmH₂O.");
  ev["driving pressure"] = vstate("Driving pressure", "Plateau pressure minus PEEP.", "Keep it under 15 cmH₂O.");
  ev["compliance"] = vstate("Compliance", "How easily the lung stretches.", "It falls in ARDS, oedema and pneumonia.");
  ev["resistance"] = vstate("Resistance", "How hard it is to move air through the airway.", "It rises with bronchospasm, secretions and a kinked tube.");
  ev["recruitment"] = vstate("Recruitment", "Opening collapsed alveoli.", "Higher PEEP and proning recruit; a cuff leak or a pneumothorax makes it risky.");
  ev["ventilator synchrony"] = vstate("Ventilator synchrony", "The breath matches the patient's effort.", "Check the flow, the trigger and the sedation.");
  ev["patient-ventilator asynchrony"] = vstate("Patient-ventilator asynchrony", "The breath does not match the patient's effort.", "Look at the waveform; check the trigger, the flow, the tube and the sedation.");
  ev["proning"] = (P) => ({ title: given(P, "proc:prone") ? "Yes, proned" : "Not proned", lines: [`SpO₂ ${P.spo2}%`, "Helps when the oxygenation is poor despite a protective ventilator: a PaO₂/FiO₂ below 150."], tone: "info", section: "treat", actions: given(P, "proc:prone") ? [] : [A("Prone", "proc:prone")], spoken: given(P, "proc:prone") ? "Yes." : "Not proned." });
  const therapyStatus = (name, id, why) => (P) => ({ title: given(P, id) ? `Yes, ${name} is on` : `No ${name} yet`, lines: [`SpO₂ ${P.spo2}%, respiratory rate ${P.rr}`, why], tone: "info", section: "treat", actions: given(P, id) ? [] : [A("Start " + name, id)], spoken: given(P, id) ? "Yes." : "Not yet." });
  ev["hfnc"] = therapyStatus("high-flow oxygen", "proc:hfnc", "Warm humidified oxygen up to 60 L/min.");
  ev["niv"] = therapyStatus("NIV", "proc:niv", "Works best for type 2 failure and oedema; do not delay intubation if it fails.");
  ev["intubation"] = (P) => ({ title: P.tube ? "Yes, intubated" : "Not intubated", lines: [`GCS ${P.gcs}, SpO₂ ${P.spo2}%, RR ${P.rr}`], tone: "info", section: "treat", actions: P.tube ? [] : [A("Intubate", "proc:intubate")], spoken: P.tube ? "Yes." : "Not intubated." });
  ev["mechanical ventilation"] = (P) => ({ title: P.tube ? "Yes, on mechanical ventilation" : "Not ventilated", lines: [`SpO₂ ${P.spo2}%`], tone: "info", section: "treat", actions: P.tube ? [] : [A("Intubate", "proc:intubate")], spoken: P.tube ? "Yes." : "Not ventilated." });

  /* the brain */
  const band = (P) => (P.gcs >= 15 ? "alert" : P.gcs >= 13 ? "drowsy" : P.gcs >= 11 ? "lethargic" : P.gcs >= 9 ? "obtunded" : P.gcs >= 6 ? "stuporous" : "comatose");
  ["conscious", "consciousness", "alert", "drowsy", "lethargic", "obtunded", "stuporous", "comatose"].forEach((k) => { ev[k] = (P) => ({ title: `GCS ${P.gcs}: ${band(P)}`, lines: [H.words("gcs", P), "Alert 15 · drowsy 13–14 · lethargic 11–12 · obtunded 9–10 · stuporous 6–8 · comatose 3–5 (approximate bands)."], tone: P.gcs <= 8 ? "crit" : P.gcs < 15 ? "warn" : "ok", section: "vitals", spoken: `G C S ${P.gcs}. ${band(P)}.` }); });
  const exam = (name, look) => (P) => { const ex = examOf(P, H); return { title: name, lines: [ex ? ex : look, ex ? "" : "Examine the patient to look for it."].filter(Boolean), tone: "info", section: "history", actions: ex ? [] : [A("Examine now", "examine")], spoken: `${name}. ${ex ? ex : look}` }; };
  ev["focal neurological deficit"] = exam("Focal neurological deficit", "Look at the power, the speech, the face and the pupils.");
  ["hemiparesis", "hemiplegia", "aphasia", "dysarthria"].forEach((k) => { ev[k] = exam(k[0].toUpperCase() + k.slice(1), "Check the power, the face and the speech on examination."); });
  ev["seizure"] = exam("Seizure", "Ask for a witness account; look for a tongue bite or a post-ictal state."); ev["postictal state"] = exam("Post-ictal state", "Drowsiness and confusion after a seizure.");
  ["pupillary asymmetry", "anisocoria"].forEach((k) => { ev[k] = exam("Pupils", "Look at the size and the light reflex of both pupils. A new unequal pupil is a compression sign."); });
  ev["brainstem reflexes"] = exam("Brainstem reflexes", "Pupils, corneal, gag, cough and the oculocephalic response.");
  ev["raised icp"] = (P) => { const cushing = P.sbp > 160 && P.hr < 60, ct = H.latestResult(P, "img:cthead"); return { title: cushing || (P.gcs <= 8 && ct && ct.abnormal) ? "Possible raised ICP" : "No sign of raised ICP so far", lines: [`GCS ${P.gcs}`, cushing ? "Hypertension with bradycardia: a late sign." : "", ct ? `CT head: ${(ct.text || "").slice(0, 100)}` : "No CT head yet."].filter(Boolean), tone: cushing ? "crit" : "info", section: "invest", actions: ct ? [] : [A("CT head", "img:cthead")], spoken: cushing ? "Possible raised pressure." : "No sign so far." }; };
  ev["neurological deterioration"] = (P) => ({ title: P.gcs < 15 ? `GCS is ${P.gcs}` : "GCS is 15", lines: ["Compare with the earlier GCS and the pupils.", H.words("gcs", P)], tone: P.gcs <= 8 ? "crit" : P.gcs < 15 ? "warn" : "ok", section: "vitals", spoken: `G C S ${P.gcs}.` });

  /* fluid and the kidney */
  const balance = (name) => gen((P, c, f) => ({ title: name, lines: [`In: ${f.intake} mL of fluid given by the team`, `Urine out: ${P.uo} mL/h`, "A full balance needs every input and loss charted. This simulator totals only the boluses and the urine."], tone: "info", section: "treat", spoken: `${f.intake} millilitres given. Urine ${P.uo} an hour.` }));
  ["fluid balance", "positive fluid balance", "negative fluid balance"].forEach((k) => { ev[k] = balance(k[0].toUpperCase() + k.slice(1)); });
  const vol = (name, yes) => gen((P, c, f) => { const ov = /fever|pulmonary|oedema/i.test("") || H.latestResult(P, "img:cxr") && /oedema|edema|congest|effusion/i.test(H.latestResult(P, "img:cxr").text || ""); return { title: name, lines: [`Fluid given: ${f.intake} mL · urine ${P.uo} mL/h · MAP ${P.map}`, ov ? "The chest film shows congestion or fluid." : "", yes(P, f, ov)].filter(Boolean), tone: "info", section: "treat", spoken: name + "." }; });
  ev["euvolemia"] = vol("Euvolaemia", (P) => (P.map >= 65 && P.uo >= 35 ? "Pressure and urine are adequate: this looks euvolaemic." : "Pressure or urine are low, so he may not be euvolaemic."));
  ev["hypovolemia"] = vol("Hypovolaemia", (P) => (P.map < 65 || P.uo < 35 ? "Low pressure or low urine: possible hypovolaemia. Test with a bolus and the response." : "No sign of hypovolaemia by pressure or urine."));
  ev["hypervolemia"] = vol("Hypervolaemia", (P, f, ov) => (ov ? "There is a sign of congestion." : "No clear sign of overload yet; examine and look at the chest film."));
  ev["fluid overload"] = ev["hypervolemia"];
  ev["restrict fluids"] = (P, c) => { const f = facts(P, H); return { title: "Fluid restriction noted", lines: [`Fluid given so far: ${f.intake} mL; urine ${P.uo} mL/h`, P.sbp < 90 ? "The pressure is low: restricting fluid may hurt perfusion." : "Reasonable if the lungs are wet or the kidneys are not clearing."], tone: P.sbp < 90 ? "warn" : "info", section: "treat", spoken: "Fluid restriction noted." }; };
  ev["ckd"] = gen((P, c, f) => ({ title: "Chronic kidney disease", lines: [f.cr ? `Creatinine ${f.cr.it.text} mg/dL (today's value)` : "Creatinine not measured yet.", "The history and the old creatinine say if it is chronic."], tone: "info", section: "history", actions: f.cr ? [] : [A("Send KFT", "lab:kft")], spoken: "Check the history and the old creatinine." }));
  ev["azotemia"] = gen((P, c, f) => ({ title: f.urea && f.urea.it.abn ? "Yes, urea is raised" : f.urea ? "Urea is not raised" : "Not measured yet", lines: [f.urea ? `Urea ${f.urea.it.text} ${f.urea.it.unit}` : "Send a KFT.", f.cr ? `Creatinine ${f.cr.it.text} mg/dL` : ""].filter(Boolean), tone: f.urea && f.urea.it.abn ? "warn" : "info", section: "invest", actions: f.urea ? [] : [A("Send KFT", "lab:kft")], spoken: f.urea ? `Urea ${f.urea.it.text}.` : "Not measured yet." }));
  ev["uremia"] = gen((P, c, f) => ({ title: "Uraemia", lines: [f.urea ? `Urea ${f.urea.it.text} ${f.urea.it.unit}` : "Urea not measured.", `GCS ${P.gcs}`, "Look for confusion, a rub, bleeding and a high urea."], tone: "info", section: "invest", spoken: "Uraemia is the clinical picture of kidney failure." }));
  ev["electrolyte imbalance"] = (P) => { const r = H.latestResult(P, "lab:lyte") || H.latestResult(P, "lab:kft"), bad = r ? (r.items || []).filter((i) => i.abn) : []; return { title: !r ? "Electrolytes not measured yet" : bad.length ? "Yes, electrolytes are abnormal" : "Electrolytes are normal", lines: r ? (bad.length ? bad.map((i) => `${i.label}: ${i.text} ${i.unit} ${i.dir === "high" ? "▲" : "▼"}`) : ["All reported values are normal."]) : ["Send the electrolytes."], tone: bad.length ? "warn" : "info", section: "invest", actions: r ? [] : [A("Send electrolytes", "lab:lyte")], spoken: bad.length ? "Yes, abnormal." : "No." }; };
  ev["renal replacement therapy"] = (P) => ({ title: P.dialysis ? "Yes, dialysis is running" : P.hdLine ? "Dialysis catheter in, not running" : "No dialysis yet", lines: [`Urine output ${P.uo} mL/h`, "Indications: refractory hyperkalaemia, acidosis, overload, uraemic signs or toxins."], tone: "info", section: "treat", actions: P.dialysis ? [] : [A("Dialysis", "proc:dialysis")], spoken: P.dialysis ? "Yes." : "No dialysis yet." });
  ev["ultrafiltration"] = (P) => ({ title: "Ultrafiltration", lines: [P.dialysis ? "Dialysis is running, so fluid can be removed." : "Needs dialysis or CRRT first.", `Urine output ${P.uo} mL/h`], tone: "info", section: "treat", actions: P.dialysis ? [] : [A("Dialysis", "proc:dialysis")], spoken: "Ultrafiltration needs dialysis." });
  ev["diuretic response"] = (P) => ({ title: given(P, "drug:furosemide") ? "Furosemide was given" : "No diuretic given yet", lines: [`Urine output now ${P.uo} mL/h`, given(P, "drug:furosemide") ? (P.uo >= 100 ? "A good response." : "A poor response: think of the kidney, the volume and the dose.") : "Give it, then watch the next hour."], tone: "info", section: "treat", actions: given(P, "drug:furosemide") ? [] : [A("Furosemide", "drug:furosemide")], spoken: `Urine ${P.uo} an hour.` });

  /* infection */
  const cult = (P) => H.latestResult(P, "lab:cultures");
  ev["suspected infection"] = gen((P, c, f) => ({ title: "Suspected infection", lines: [P.temp >= 38 || P.temp < 36 ? `Temperature ${Number(P.temp).toFixed(1)} °C` : "No temperature change", H.latestItem(P, "wbc") ? `WBC ${H.latestItem(P, "wbc").it.text}` : "WBC not measured", f.lac ? `Lactate ${f.lac.it.text}` : "", given(P, "lab:cultures") ? "Cultures sent." : "Cultures not sent."].filter(Boolean), tone: "info", section: "invest", actions: given(P, "lab:cultures") ? [] : [A("Blood cultures", "lab:cultures"), A("Antibiotics", "abx:any")], spoken: "Look for the source and send cultures before antibiotics." }));
  ["source of infection", "source identification"].forEach((k) => { ev[k] = (P) => ({ title: "Finding the source", lines: [seen(P, "img:cxr", "Chest X-ray"), seen(P, "lab:ua", "Urine"), seen(P, "img:ctabd", "CT abdomen")], tone: "info", section: "invest", spoken: "Look at the chest, the urine, the abdomen and the lines." }); });
  ev["source control"] = (P) => ({ title: given(P, "proc:source") ? "Source control done" : "No source control yet", lines: ["Drain, remove or operate on the focus as soon as it is safe."], tone: "info", section: "treat", actions: given(P, "proc:source") ? [] : [A("Theatre", "proc:source")], spoken: "Source control means draining or removing the focus." });
  ["bacteremia", "viremia", "fungemia"].forEach((k) => { ev[k] = (P) => { const r = cult(P); return { title: r ? (r.abnormal ? "Cultures are positive" : "Cultures are negative") : given(P, "lab:cultures") ? "Cultures are pending" : "No cultures sent", lines: [r ? (r.text || "").slice(0, 140) : "Send blood cultures before antibiotics."], tone: r && r.abnormal ? "warn" : "info", section: "invest", actions: r || given(P, "lab:cultures") ? [] : [A("Blood cultures", "lab:cultures")], spoken: r ? (r.abnormal ? "Positive." : "Negative.") : "Not back." }; }; });
  ev["culture positivity"] = ev["bacteremia"]; ev["culture negative"] = ev["bacteremia"];
  const abxList = (P) => Object.keys(P.given || {}).filter((k) => k.startsWith("abx:")).map((k) => BYL(H, k));
  ev["empirical antibiotics"] = (P) => { const l = abxList(P); return { title: l.length ? "Empirical antibiotics are running" : "No antibiotics yet", lines: l.length ? l : ["Start broad cover within the hour in sepsis, after cultures."], tone: l.length ? "ok" : "warn", section: "treat", actions: l.length ? [] : [A("Antibiotics", "abx:any")], spoken: l.length ? "Yes." : "No antibiotics yet." }; };
  ev["targeted antibiotics"] = (P) => { const r = cult(P), l = abxList(P); return { title: r ? "Match the antibiotic to the culture" : "No culture result to target", lines: [r ? (r.text || "").slice(0, 140) : given(P, "lab:cultures") ? "Cultures are pending." : "No cultures sent.", l.length ? "Now on: " + l.join(", ") : "No antibiotic yet."], tone: "info", section: "invest", spoken: r ? "Match the antibiotic to the culture." : "No culture result yet." }; };
  ev["de-escalation"] = (P) => { const r = cult(P); return { title: r ? "A culture is back: narrow the cover" : "Not yet: wait for the culture", lines: [r ? (r.text || "").slice(0, 140) : "De-escalate once the organism and the sensitivities are known and the patient is better."], tone: "info", section: "treat", spoken: r ? "Narrow the cover." : "Wait for the culture." }; };
  ev["escalation"] = (P) => ({ title: "Escalation", lines: [`MAP ${P.map}, SpO₂ ${P.spo2}%, GCS ${P.gcs}`, "Escalate the antibiotic when there is no response and the organism is resistant; escalate organ support when a vital sign keeps falling."], tone: "info", section: "treat", spoken: "Escalate when there is no response." });
  ev["antibiotic stewardship"] = (P) => ({ title: "Antibiotic stewardship", lines: ["The right drug, dose, route and duration. Cultures first, a time-out at 48 to 72 hours, and de-escalation.", abxList(P).length ? "Now on: " + abxList(P).join(", ") : ""].filter(Boolean), tone: "info", spoken: "Right drug, right dose, shortest effective course." });
  const lineInf = (name, what, check) => (P) => ({ title: name, lines: [what, ...check(P)], tone: "info", section: "treat", spoken: `${name}. ${what}` });
  ev["vap"] = lineInf("VAP", "Ventilator-associated pneumonia, after 48 hours of ventilation.", (P) => [P.tube ? "He is ventilated: keep the head up, mouth care, daily sedation holiday." : "He is not ventilated."]);
  ev["clabsi"] = lineInf("CLABSI", "Bloodstream infection from a central line.", (P) => [P.hdLine || given(P, "proc:cvc") ? "A central line is in: check the site and the need for it daily." : "No central line."]);
  ev["cauti"] = lineInf("CAUTI", "Urinary infection from a catheter.", (P) => [given(P, "proc:foley") ? "A urinary catheter is in: remove it when it is not needed." : "No urinary catheter."]);
  ev["nosocomial infection"] = lineInf("Nosocomial infection", "Infection acquired in hospital.", (P) => [P.tube ? "Ventilated" : "", given(P, "proc:cvc") ? "Central line" : "", given(P, "proc:foley") ? "Urinary catheter" : ""].filter(Boolean).map((x) => "Device in place: " + x));

  /* investigations */
  const todo = (P) => [["examine", "Examine the patient"], ["lab:abg", "Blood gas"], ["lab:lactate", "Lactate"], ["lab:cbc", "CBC"], ["lab:kft", "Kidney function"], ["lab:lft", "Liver function"], ["lab:lyte", "Electrolytes"], ["img:ecg", "ECG"], ["img:cxr", "Chest X-ray"], ["lab:cultures", "Blood cultures"]].filter(([id]) => !given(P, id));
  const workup = (P) => { const n = todo(P); return { title: n.length ? "Baseline investigations not yet sent" : "The baseline is complete", lines: n.length ? n.map(([, l]) => l) : ["Now act on what the results show."], tone: "info", section: "invest", actions: n.slice(0, 4).map(([id, l]) => A(l, id)), spoken: n.length ? "Not yet: " + n.slice(0, 4).map(([, l]) => l).join(", ") + "." : "The baseline is complete." }; };
  ev["workup"] = workup; ev["baseline investigations"] = workup;
  const trendTerm = (P, c) => { const t = trendOf(P, c.hist, H); return { title: t.known ? (t.score > 0 ? "Improving" : t.score < 0 ? "Getting worse" : "Holding steady") : "Too early for a trend", lines: t.known ? [`MAP ${t.dm > 0 ? "up" : "down"} ${Math.abs(num(t.dm))}, SpO₂ ${t.ds > 0 ? "up" : "down"} ${Math.abs(num(t.ds, 10))}, HR ${t.dh > 0 ? "up" : "down"} ${Math.abs(num(t.dh))}`] : ["Give it a few more readings."], tone: t.score < 0 ? "warn" : "ok", section: "vitals", spoken: t.known ? (t.score > 0 ? "Improving." : t.score < 0 ? "Getting worse." : "Steady.") : "Too early." }; };
  ["serial monitoring", "trend", "rising trend", "falling trend"].forEach((k) => { ev[k] = trendTerm; });
  const critical = (P) => { const rows = []; (P.results || []).forEach((r) => (r.items || []).forEach((i) => { const crit = (i.k === "k" && (i.v > 6.5 || i.v < 3)) || (i.k === "lactate" && i.v >= 4) || (i.k === "ph" && i.v < 7.2) || (i.k === "hb" && i.v < 7) || (i.k === "trop" && i.v > 200) || (i.k === "glu" && (i.v < 50 || i.v > 400)); if (crit) rows.push(`${i.label}: ${i.text} ${i.unit}`); })); return { title: rows.length ? "Critical values" : "No critical value", lines: rows.length ? rows : ["No result is in the critical range."], tone: rows.length ? "crit" : "ok", section: "invest", spoken: rows.length ? "Critical values: " + rows.join(". ") : "No critical value." }; };
  ev["critical value"] = critical;
  ev["significant derangement"] = (P) => { const rows = []; (P.results || []).forEach((r) => (r.items || []).forEach((i) => { if (i.abn) rows.push(`${i.label}: ${i.text} ${i.unit} ${i.dir === "high" ? "▲" : "▼"}`); })); return { title: rows.length ? `${rows.length} abnormal result${rows.length > 1 ? "s" : ""}` : "Nothing deranged so far", lines: rows.slice(0, 8).length ? rows.slice(0, 8) : ["All reported values are within range."], tone: rows.length ? "warn" : "ok", section: "invest", spoken: rows.length ? `${rows.length} abnormal results.` : "Nothing deranged." }; };
  const normal = (P) => { const n = (P.results || []).filter((r) => !r.abnormal).map((r) => r.label); return { title: n.length ? "Normal results" : "No normal result yet", lines: n.length ? n : ["Nothing has come back yet."], tone: "ok", section: "invest", spoken: n.length ? n.join(", ") + " are normal." : "Nothing has come back yet." }; };
  ev["within normal limits (wnl)"] = normal; ev["unremarkable"] = normal;
  ev["correlate clinically"] = (P) => ({ title: "Correlate clinically", lines: [`Put the result beside the patient: BP ${P.sbp}/${P.dbp}, SpO₂ ${P.spo2}%, GCS ${P.gcs}.`, "Treat the patient, not the number."], tone: "info", section: "vitals", spoken: "Put the result beside the patient." });
  ev["repeat sampling"] = (P) => { const ids = Object.keys(P.given || {}).filter((k) => /^(lab|img):/.test(k)).slice(-4); return { title: "Repeat which test?", lines: ids.length ? ["Pick one to send again."] : ["Nothing has been sent yet."], tone: "info", actions: ids.map((id) => A("Repeat " + BYL(H, id), id)), spoken: "Which test should I repeat?" }; };
  ev["point-of-care testing"] = () => ({ title: "Point-of-care tests", lines: ["At the bedside: glucose, blood gas with lactate, ultrasound, ECG."], tone: "info", actions: [A("Blood glucose", "lab:glucose"), A("Blood gas", "lab:abg"), A("Ultrasound", "img:usg"), A("ECG", "img:ecg")], spoken: "Glucose, gas, ultrasound or ECG at the bedside." });

  /* abbreviations with a patient behind them */
  ev["dvt"] = (P) => ({ title: "Deep vein thrombosis", lines: [given(P, "drug:heparin") ? "Anticoagulation is running." : "No prophylaxis or treatment recorded.", H.latestItem(P, "ddimer") ? `D-dimer ${H.latestItem(P, "ddimer").it.text}` : ""].filter(Boolean), tone: "info", section: "treat", actions: given(P, "drug:heparin") ? [] : [A("Heparin", "drug:heparin")], spoken: "Deep vein thrombosis." });
  ev["pe"] = (P) => ({ title: "Pulmonary embolism", lines: [seen(P, "img:ctpa", "CT pulmonary angiogram"), seen(P, "img:echo", "Echo"), H.latestItem(P, "ddimer") ? `D-dimer ${H.latestItem(P, "ddimer").it.text}` : "D-dimer not sent"], tone: "info", section: "invest", spoken: "Pulmonary embolism." });
  ev["dic"] = (P) => { const g = ["plt", "inr", "fib", "ddimer"].map((k) => H.latestItem(P, k)).filter(Boolean); return { title: "Disseminated intravascular coagulation", lines: g.length ? g.map((x) => `${x.it.label}: ${x.it.text} ${x.it.unit}`) : ["Send a coagulation profile and a CBC."], tone: g.some((x) => x.it.abn) ? "warn" : "info", section: "invest", actions: given(P, "lab:coag") ? [] : [A("Coagulation", "lab:coag")], spoken: "Disseminated intravascular coagulation needs the coagulation profile." }; };
  ev["mods"] = gen((P, c, f) => { const on = Object.entries(f.organ).filter(([, v]) => v).map(([k]) => k); return { title: on.length >= 2 ? `Yes, ${on.length} organ systems are affected` : on.length ? "One organ system is affected" : "No organ dysfunction flagged", lines: on.length ? on : ["The numbers are within range."], tone: on.length >= 3 ? "crit" : on.length >= 2 ? "warn" : "info", section: "vitals", spoken: on.length ? `${on.length} organs affected: ${on.join(", ")}.` : "No organ dysfunction." }; });
  ev["cpr"] = (P) => ({ title: "CPR", lines: [P.hr === 0 && P.alive !== false ? "Start compressions now." : `He has a pulse: HR ${P.hr}.`], tone: P.hr === 0 ? "crit" : "info", section: "vitals", spoken: P.hr === 0 ? "Start compressions." : "He has a pulse." });
  ev["rosc"] = (P) => ({ title: P.hr > 0 && P.alive !== false ? "Spontaneous circulation present" : "No circulation", lines: [`HR ${P.hr}, BP ${P.sbp}/${P.dbp}`], tone: P.hr > 0 ? "ok" : "crit", section: "vitals", spoken: P.hr > 0 ? "He has a circulation." : "No circulation." });
  ev["dnr"] = () => ({ title: "DNR noted", lines: ["A DNR limits resuscitation only. All other treatment continues unless the goals of care say otherwise.", "Record who decided it, when, and what the family understands."], tone: "info", spoken: "Do not resuscitate noted. Other treatment continues." });
  return ev;
}
const BYL = (H, id) => (H.BY_ID[id] ? H.BY_ID[id].label : id);

/* ---------------------------------------------------------------- ward-round expressions */
function roundExpr(H, e, P, ctx) {
  const { card } = H, f = facts(P, H), t = trendOf(P, ctx.hist, H), T = e.term.toLowerCase(), A_ = (l, o) => ({ label: l, order: o });
  const mk = (title, lines, tone, o) => card("lex:" + e.id, title, lines, Object.assign({ tone: tone || "info", spoken: title + ". " + (lines[0] || "") }, o || {}));
  const nums = `BP ${P.sbp}/${P.dbp}, HR ${P.hr}, SpO₂ ${P.spo2}%, RR ${P.rr}`;
  const events = () => { const lg = (P.log || []).slice(-6).map((l) => `${l.t}: ${l.text}`), bad = (P.results || []).filter((r) => r.abnormal).map((r) => `${r.label} abnormal`); return { lg, bad }; };
  switch (T) {
    case "patient is holding well": case "patient is maintaining vitals": return mk(f.worst === 0 && !f.unstable ? "Agree: holding well" : "Not quite: the numbers say otherwise", [nums, f.bad.length ? "Abnormal: " + f.bad.join(", ") : "All vitals within range.", t.known ? (t.score < 0 ? "The trend is worsening." : "The trend is steady or better.") : ""].filter(Boolean), f.worst === 0 ? "ok" : f.worst === 2 ? "crit" : "warn", { section: "vitals" });
    case "patient is sick": return mk(f.worst ? "Agree: sick" : "Not by the numbers", [nums, f.bad.length ? "Abnormal: " + f.bad.join(", ") : "Vitals within range.", `${f.nOrgan} organ system${f.nOrgan === 1 ? "" : "s"} affected`], f.worst === 2 ? "crit" : f.worst ? "warn" : "ok", { section: "vitals" });
    case "patient is deteriorating": { const d = t.known ? t.score < 0 : f.worst === 2; return mk(d ? "Agree: deteriorating" : t.known ? "Not by the trend" : "Too early to call", [t.known ? `MAP ${t.dm >= 0 ? "+" : ""}${num(t.dm)}, SpO₂ ${t.ds >= 0 ? "+" : ""}${num(t.ds, 10)}, HR ${t.dh >= 0 ? "+" : ""}${num(t.dh)}` : nums, d ? "Reassess the airway, the pressure and the cause now." : "Keep watching."], d ? "crit" : "ok", { section: "vitals", actions: d ? [A_("Examine now", "examine")] : [] }); }
    case "patient is improving": { const d = t.known ? t.score > 0 : false; return mk(d ? "Agree: improving" : t.known ? (t.score < 0 ? "No, he is getting worse" : "Holding steady, not yet improving") : "Too early to call", [t.known ? `MAP ${t.dm >= 0 ? "+" : ""}${num(t.dm)}, SpO₂ ${t.ds >= 0 ? "+" : ""}${num(t.ds, 10)}, HR ${t.dh >= 0 ? "+" : ""}${num(t.dh)}` : nums], d ? "ok" : t.score < 0 ? "warn" : "info", { section: "vitals" }); }
    case "no significant interval events": case "uneventful night": case "overnight events": { const { lg, bad } = events(); const quiet = !bad.length && f.worst === 0; return mk(T === "overnight events" ? "Events since the shift began" : quiet ? "Agree: quiet" : "There have been events", lg.length || bad.length ? [...bad, ...lg] : ["Nothing has happened yet."], quiet ? "ok" : "warn", { section: "treat" }); }
    case "continue the same management": { const rx = Object.keys(P.given || {}).filter((k) => /^(drug|abx|proc):/.test(k)).map((k) => BYL(H, k)); return mk("Continue the current management", rx.length ? ["Running or done: " + rx.join(", "), nums] : ["Nothing has been started yet.", nums], "info", { section: "treat" }); }
    case "keep under observation": case "keep a close watch": return mk("Watching closely", [nums, "Call for help if: MAP under 65 · SpO₂ under 90 · GCS falls by 2 · urine under 0.5 mL/kg/h", gv(P, "proc:artline") ? "" : "An arterial line gives beat-to-beat pressure."].filter(Boolean), f.worst ? "warn" : "info", { section: "vitals", actions: gv(P, "proc:artline") ? [] : [A_("Arterial line", "proc:artline")] });
    case "low threshold for intubation": { const trig = [P.gcs <= 8 ? `GCS ${P.gcs}` : "", P.spo2 < 90 && (P.oxygen || P.tube) ? `SpO₂ ${P.spo2}% on oxygen` : "", P.rr > 35 ? `RR ${P.rr}` : "", P.rr < 8 ? `RR ${P.rr}` : "", f.shock ? "shock" : ""].filter(Boolean); return mk(P.tube ? "Already intubated" : trig.length ? "He meets a trigger now: " + trig.join(", ") : "Not yet, but watch these", P.tube ? ["On the ventilator."] : ["Triggers: GCS 8 or less · SpO₂ under 90% on oxygen · RR over 35 or exhaustion · shock · a failing NIV trial", nums], trig.length && !P.tube ? "crit" : "info", { section: "treat", actions: P.tube ? [] : [A_("Intubate", "proc:intubate")] }); }
    case "not tolerating weaning": case "failing niv": { const l = ladder(P); return mk("Escalate support", [nums, l ? "Next step: " + l[0] : "Back to full ventilatory support; look for the cause."], "warn", { section: "treat", actions: l ? [A_(l[0], l[1])] : [] }); }
    case "for escalation of care": return mk("Escalation options", [nums, "Higher level of support: HFNC or NIV, intubation, a vasopressor, dialysis, theatre, or a specialist review."], "info", { section: "treat", actions: [A_("Oxygen support", ladder(P) ? ladder(P)[1] : "proc:prone"), A_("Vasopressor", "drug:norepi")] });
    case "step down care": case "fit for transfer": case "fit for discharge": {
      const rows = [["Vitals within range", f.worst === 0], ["No vasopressor", !P.norepi], ["No ventilator", !P.tube], ["SpO₂ 94% or more", P.spo2 >= 94], ["GCS 14 or more", P.gcs >= 14], ["Urine adequate", P.uo >= 35], ["Lactate not raised", !f.lac || f.lac.it.v <= 2]]; const ok = rows.every((r) => r[1]), need = T === "fit for discharge" ? 0 : 1;
      return mk(ok ? "Yes, by these criteria" : "Not yet", rows.map((r) => `${r[1] ? "✓" : "✗"} ${r[0]}`), ok ? "ok" : "warn", { section: "vitals", spoken: ok ? "Yes, by these criteria." : "Not yet. " + rows.filter((r) => !r[1]).map((r) => r[0]).join(", ") }); }
    case "guarded prognosis": case "poor prognosis": { const g = f.nOrgan >= 3 || P.alive === false; return mk(g ? "Consistent: " + (f.nOrgan >= 3 ? "several organs are failing" : "he has died") : "Not necessarily poor", [`${f.nOrgan} organ system${f.nOrgan === 1 ? "" : "s"} affected`, P.norepi ? "On a vasopressor" : "", f.lac ? `Lactate ${f.lac.it.text}` : "", t.known ? (t.score > 0 ? "Improving" : t.score < 0 ? "Worsening" : "Steady") : ""].filter(Boolean), g ? "warn" : "info", { section: "vitals" }); }
    case "family counselled": case "explained the gravity of illness": case "treatment limitations discussed": return mk("Noted", ["Record it: the time, who was present, what was said, what the family understood, and the plan.", T === "treatment limitations discussed" ? "State clearly what is limited (for example no CPR, no intubation) and what continues." : ""].filter(Boolean), "info", { section: "treat", spoken: "Noted. Record the time and who was present." });
    default: return null;
  }
}
const gv = (P, id) => (P.given && P.given[id]) || 0;
const ladder = (P) => (P.tube ? null : gv(P, "proc:niv") ? ["Intubate and ventilate", "proc:intubate"] : gv(P, "proc:hfnc") ? ["NIV", "proc:niv"] : P.oxygen ? ["High-flow nasal oxygen", "proc:hfnc"] : ["Oxygen", "proc:oxygen"]);

/* ---------------------------------------------------------------- handover and notes */
function communication(H, e, P, ctx) {
  const f = facts(P, H), t = trendOf(P, ctx.hist, H), T = e.term, now = `BP ${P.sbp}/${P.dbp} (MAP ${P.map}), HR ${P.hr}, RR ${P.rr}, SpO₂ ${P.spo2}%${P.tube ? " on the ventilator" : P.oxygen ? " on oxygen" : " on room air"}, T ${Number(P.temp).toFixed(1)} °C, GCS ${P.gcs}, urine ${P.uo} mL/h`;
  const did = Object.keys(P.given || {}).filter((k) => BYL(H, k) && k !== "examine").map((k) => BYL(H, k));
  const res = (P.results || []).slice(-5).map((r) => `${r.label} ${r.abnormal ? "abnormal" : "normal"}`);
  const story = ctx.story ? ctx.story.text : "";
  const bad = f.bad.length ? f.bad.join(", ") : "none";
  const tr = t.known ? (t.score > 0 ? "improving" : t.score < 0 ? "worsening" : "steady") : "too early to say";
  const mk = (title, lines, tone) => H.card("lex:" + e.id, title, lines, { tone: tone || "info", section: "treat", spoken: title + ". " + lines.slice(0, 2).join(" ") });
  switch (T) {
    case "SBAR": case "Bedside handover": case "Emergency escalation call": case "Consultant-to-consultant communication": {
      const esc = T === "Emergency escalation call", head = esc ? "Escalation call" : T === "Consultant-to-consultant communication" ? "Consultant to consultant" : "SBAR handover";
      return mk(head, [`S: ${f.worst ? "The patient is unwell. Abnormal: " + bad + "." : "The patient is currently stable."}`, `B: ${story || "See the history."}`, `A: ${now}. ${f.nOrgan} organ system${f.nOrgan === 1 ? "" : "s"} affected. Trend ${tr}.${res.length ? " Results: " + res.join(", ") + "." : ""}`, `R: ${f.shock ? "Review now for the circulation. " : ""}${P.spo2 < 94 ? "Review the airway and oxygenation. " : ""}${did.length ? "Done so far: " + did.slice(0, 6).join(", ") + "." : "Nothing has been done yet."} ${esc ? "I need you at the bedside within 10 minutes." : "Please review and advise."}`], f.worst === 2 ? "crit" : "info");
    }
    case "Progress note": return mk("Progress note", [`S: ${f.worst ? "Unwell." : "Comfortable."} ${story ? "" : ""}`.trim(), `O: ${now}. ${res.length ? "Results: " + res.join(", ") + "." : "No results yet."}`, `A: ${f.nOrgan} organ system${f.nOrgan === 1 ? "" : "s"} affected (${bad}). Trend ${tr}.`, `P: ${did.length ? "Continue " + did.slice(0, 5).join(", ") + ". " : ""}Reassess in one hour. Update the family.`]);
    case "Documentation of deterioration": return mk("Deterioration note", [`Time: ${Math.floor((P.elapsedMs || 0) / 60000)} min into the shift.`, `What changed: ${bad === "none" ? "no abnormal vital" : bad}. ${now}.`, `Action: ${did.length ? did.slice(-4).join(", ") : "none yet"}.`, "Who was told: the senior and the family. Response and next review time to be written."], f.worst === 2 ? "crit" : "info");
    case "Documentation of treatment decisions": return mk("Treatment decision note", ["The decision: what and why.", `The evidence: ${now}.`, `Options and risks weighed: ${did.length ? did.slice(-3).join(", ") : "to be written"}.`, "Who agreed, and the plan to review it."]);
    case "Discharge summary": return mk("Discharge summary", [`Presentation: ${story || "see the history"}`, `Course: trend ${tr}; ${did.length ? did.slice(0, 6).join(", ") : "no treatment"}.`, `Condition now: ${now}.`, "Results pending, medicines, follow-up and the advice to the family."]);
    case "Goals of care": return mk("Goals of care", ["Ask what the patient and the family understand and want.", "Agree the limits: CPR, intubation, dialysis, ICU care. Record it, and review it as the patient changes.", `Where he stands now: ${now}.`]);
    case "Indications and contraindications": case "Risks versus benefits": case "Treatment failure": case "Therapeutic response": case "Clinical endpoints":
      return mk(T, [e.meaning, T === "Therapeutic response" || T === "Clinical endpoints" ? `Now: ${now}. Trend ${tr}.` : T === "Treatment failure" ? (t.known && t.score < 0 ? "He is worsening on the current treatment: escalate or change it." : "No sign of failure by the trend.") : "Name the treatment, and I can set out what applies."]);
    default: return null;
  }
}

/* ---------------------------------------------------------------- management verbs */
const VERB = /^(?:please |kindly |let us |lets |let's |we (?:should|need to|must|will|can) |now |and |ok |okay )*(continue|withhold|discontinue|titrate|titrating|optimi[sz]e|escalate|de ?-?escalate|reassess|re ?-?assess|reevaluate|monitor|stabili[sz]e|resuscitate|wean|weaning|extubate|extubating|extubation|reassessment|trial off|restrict(?: the)? fluids?|maintenance fluids?|rescue therapy|adjunctive therapy|definitive treatment|supportive management|conservative management|watchful waiting)\b\s*(.*)$/;
function verbs(H, c, P, ctx) {
  const m = VERB.exec(c); if (!m) return null;
  const verb = m[1].replace(/\s+/g, " ").replace("-", ""), rest = (m[2] || "").trim(), f = facts(P, H), card = H.card;
  const obj = rest ? (H.parseOrders(rest).orders[0] || null) : null, objLabel = obj ? obj.label : rest;
  const mk = (id, title, lines, tone, o) => card("verb:" + id, title, lines, Object.assign({ tone: tone || "info", spoken: title + ". " + (lines[0] || "") }, o || {}));
  const nums = `BP ${P.sbp}/${P.dbp}, MAP ${P.map}, HR ${P.hr}, SpO₂ ${P.spo2}%`;
  const v = verb.replace(/ing$/, "").replace("^re assess", "reassess");
  if (/^(?:continue)/.test(v)) { const rx = Object.keys(P.given || {}).filter((k) => /^(drug|abx|proc):/.test(k)).map((k) => BYL(H, k)); return [mk("continue", rest ? `Continue ${objLabel}` : "Continue the current management", [rx.length ? "Running or done: " + rx.join(", ") : "Nothing has been started yet.", nums], "info", { section: "treat" })]; }
  if (/^(?:withhold|discontinue)/.test(v)) return [mk("stop", `Noted: ${rest ? objLabel + " " : ""}${v === "withhold" ? "withheld" : "stopped"}`, ["Your decision is recorded in this discussion.", "This simulator cannot take back a drug that is already in. It keeps the order list as a log.", nums], "info", { section: "treat" })];
  if (/^(?:titrate|optimi[sz]e)/.test(v)) {
    if (obj && /norepi|vaso|dobut|adren/.test(obj.id) || /pressor|noradrenaline|norepinephrine|vasopressor/.test(rest)) { const hi = P.map < 65, lo = P.map > 80; return [mk("titrate", hi ? "Increase the vasopressor" : lo ? "Reduce the vasopressor" : "Hold the dose", [`MAP ${P.map} (target 65 or more)`, P.norepi ? "" : "No vasopressor is running yet.", hi && P.norepi ? "Still low: raise the dose, or add vasopressin." : ""].filter(Boolean), hi ? "warn" : "ok", { section: "treat", actions: P.norepi ? (hi ? [{ label: "Add vasopressin", order: "drug:vaso" }] : []) : [{ label: "Start norepinephrine", order: "drug:norepi" }] })]; }
    const issues = []; if (P.map < 65) issues.push(["Circulation: MAP " + P.map, "drug:norepi", "Norepinephrine"]); if (P.spo2 < 94) issues.push(["Oxygenation: SpO₂ " + P.spo2 + "%", ladder(P) ? ladder(P)[1] : "proc:prone", ladder(P) ? ladder(P)[0] : "Prone"]); if (P.uo < 35) issues.push(["Kidney: urine " + P.uo + " mL/h", "lab:kft", "Kidney function"]); if (P.gcs < 15) issues.push(["Brain: GCS " + P.gcs, "img:cthead", "CT head"]);
    return [mk("titrate", issues.length ? "Optimise these first" : "Nothing to adjust now", issues.length ? issues.map((x) => x[0]) : [nums], issues.length ? "warn" : "ok", { section: "treat", actions: issues.map((x) => ({ label: x[2], order: x[1] })) })];
  }
  if (/^escalate/.test(v)) {
    if (/antibiotic|abx|cover/.test(rest) || (obj && /^abx/.test(obj.id))) return [mk("escalate", "Broaden the antibiotic cover", [abxLine(P, H), "Choose by the likely source and the local resistance. Cultures are sent first."], "info", { section: "treat", actions: [{ label: "Meropenem", order: "abx:meropenem" }, { label: "Piperacillin-tazobactam", order: "abx:piptaz" }] })];
    if (/pressor|vasopressor|norepi|noradrenaline/.test(rest)) return [mk("escalate", "Add a second pressor", [`MAP ${P.map}`], "info", { section: "treat", actions: [{ label: "Vasopressin", order: "drug:vaso" }, { label: "Hydrocortisone", order: "drug:steroid" }] })];
    const l = ladder(P); return [mk("escalate", l ? "Next step: " + l[0] : "Already on full support", [nums, `Respiratory rate ${P.rr}`], "info", { section: "treat", actions: l ? [{ label: l[0], order: l[1] }] : [{ label: "Prone", order: "proc:prone" }] })];
  }
  if (/^de ?escalate/.test(v)) { const r = H.latestResult(P, "lab:cultures"); return [mk("deescalate", r ? "A culture is back: narrow the cover" : "Not yet", [r ? (r.text || "").slice(0, 140) : "Reduce support or narrow the antibiotic once the patient improves or the culture is back.", nums], "info", { section: "treat" })]; }
  if (/^(?:reassess|re assess|reevaluate)/.test(v)) return [H.summaryCard(P), H.trendCard(P, ctx.hist)];
  if (/^monitor/.test(v)) return [mk("monitor", "Monitoring", [nums, `GCS ${P.gcs}, urine ${P.uo} mL/h`, "Call for help if: MAP under 65 · SpO₂ under 90 · GCS falls by 2 · urine under 0.5 mL/kg/h"], f.worst ? "warn" : "info", { section: "vitals", actions: [!P.artLine && { label: "Arterial line", order: "proc:artline" }, !gv(P, "proc:foley") && { label: "Urinary catheter", order: "proc:foley" }].filter(Boolean) })];
  if (/^(?:stabili[sz]e|resuscitate)/.test(v)) {
    const rows = [], acts = [];
    rows.push(P.gcs <= 8 ? `A: airway at risk, GCS ${P.gcs}` : "A: airway protected"); if (P.gcs <= 8 && !P.tube) acts.push({ label: "Intubate", order: "proc:intubate" });
    rows.push(P.spo2 < 94 ? `B: SpO₂ ${P.spo2}%, RR ${P.rr}` : "B: breathing adequate"); if (P.spo2 < 94 && !P.tube) { const l = ladder(P); if (l) acts.push({ label: l[0], order: l[1] }); }
    rows.push(P.map < 65 ? `C: MAP ${P.map}, needs the circulation supported` : "C: circulation adequate"); if (P.map < 65) { acts.push({ label: "500 mL bolus", order: "drug:fluids", ml: 500 }); if (!P.norepi) acts.push({ label: "Norepinephrine", order: "drug:norepi" }); }
    rows.push(`D: GCS ${P.gcs}; check the glucose`); if (!gv(P, "lab:glucose")) acts.push({ label: "Blood glucose", order: "lab:glucose" });
    rows.push(`E: temperature ${Number(P.temp).toFixed(1)} °C`);
    return [mk("stabilise", f.worst ? "Resuscitate in order" : "Already stable", rows, f.worst === 2 ? "crit" : f.worst ? "warn" : "ok", { section: "treat", actions: acts.slice(0, 5) })];
  }
  if (/^(?:wean|trial off|extubat)/.test(v)) { const w = makeEvalCache(H); const fn = /extubat/.test(v) ? w["extubation"] : w["oxygen weaning"]; const r = fn(P, ctx); return [mk("wean", r.title, r.lines, r.tone, { section: "treat", note: r.note })]; }
  if (/^restrict/.test(v)) { const w = makeEvalCache(H); const r = w["restrict fluids"](P, ctx); return [mk("restrict", r.title, r.lines, r.tone, { section: "treat" })]; }
  if (/^maintenance/.test(v)) return [mk("maint", "Maintenance fluids", ["Routine fluid for the day: about 25 to 30 mL/kg. Say the volume you want, for example: give 1 litre of Ringer's lactate.", `Urine ${P.uo} mL/h, MAP ${P.map}`], "info", { section: "treat", actions: [{ label: "500 mL bolus", order: "drug:fluids", ml: 500 }] })];
  if (/^rescue/.test(v)) { const rows = [], acts = []; if (P.spo2 < 90) { rows.push("Oxygenation: proning, then ECMO if it keeps failing"); acts.push({ label: "Prone", order: "proc:prone" }, { label: "ECMO", order: "proc:ecmo" }); } if (P.map < 65) { rows.push("Circulation: a second pressor and a steroid"); acts.push({ label: "Vasopressin", order: "drug:vaso" }, { label: "Hydrocortisone", order: "drug:steroid" }); } if (P.uo < 10) { rows.push("Kidney: dialysis"); acts.push({ label: "Dialysis", order: "proc:dialysis" }); } return [mk("rescue", rows.length ? "Rescue options" : "No rescue therapy is needed now", rows.length ? rows : [nums], rows.length ? "warn" : "ok", { section: "treat", actions: acts.slice(0, 5) })]; }
  const def = { "adjunctive therapy": "Extra treatment beside the main one: a steroid, nutrition, thromboprophylaxis, glucose control.", "definitive treatment": "Treatment of the underlying cause. The cause is not named in a blind case; build it from the findings.", "supportive management": "Support the failing organs while the cause is treated: oxygen, fluid, a vasopressor, dialysis.", "conservative management": "No procedure: observe, support and treat with drugs.", "watchful waiting": "Close observation with no immediate action. Set the review time and the triggers to act." }[v];
  if (def) { const rx = Object.keys(P.given || {}).filter((k) => /^(drug|abx|proc):/.test(k)).map((k) => BYL(H, k)); return [mk("mgmt", v[0].toUpperCase() + v.slice(1), [def, rx.length ? "So far: " + rx.join(", ") : "", nums].filter(Boolean), "info", { section: "treat" })]; }
  return null;
}
const abxLine = (P, H) => { const l = Object.keys(P.given || {}).filter((k) => k.startsWith("abx:")).map((k) => BYL(H, k)); return l.length ? "Now on: " + l.join(", ") : "No antibiotic yet."; };
let EVC = null; const makeEvalCache = (H) => EVC || (EVC = makeEval(H));

/* ---------------------------------------------------------------- "say it like a doctor" */
function professional(H, P, ctx) {
  const f = facts(P, H), lac = f.lac, out = [];
  if (f.shock) { out.push(["Basic", "The patient has low BP."], ["Professional", `The patient is hypotensive (${P.sbp}/${P.dbp}, MAP ${P.map})${P.uo < 35 ? " with oliguria" : ""}${P.norepi ? ", on vasopressor support" : ", and may need vasopressor support"}.`], ["Advanced ICU", `${f.intake ? `Despite ${f.intake} mL of crystalloid, the` : "The"} patient remains hypotensive${lac && lac.it.v > 2 ? ` with persistent hyperlactataemia (${lac.it.text})` : ""}, suggesting ongoing circulatory shock.`]); }
  else if (P.spo2 < 94) { out.push(["Basic", "His oxygen is low."], ["Professional", `The patient is hypoxaemic (SpO₂ ${P.spo2}%) with a respiratory rate of ${P.rr}.`], ["Advanced ICU", `Despite ${P.tube ? "ventilatory support" : P.oxygen ? "supplemental oxygen" : "no oxygen yet"}, he remains hypoxaemic with tachypnoea and an increased work of breathing, in keeping with type 1 respiratory failure.`]); }
  else if (P.uo < 35) { out.push(["Basic", "He is not passing much urine."], ["Professional", `The patient is oliguric (${P.uo} mL/h).`], ["Advanced ICU", "Despite adequate resuscitation, he remains oliguric, raising concern for acute kidney injury."]); }
  else out.push(["Basic", "He looks okay."], ["Professional", `The patient is haemodynamically stable, ${P.tube ? "ventilated" : P.oxygen ? "on oxygen" : "on room air"}, with vitals within range.`], ["Advanced ICU", "He is maintaining his vitals without vasopressor support, with no new organ dysfunction since the last review."]);
  return H.card("lex:pro", "Say it like a doctor", out.map(([k, v]) => `${k}: “${v}”`), { tone: "info", section: "vitals", spoken: out[1] ? out[1][1] : "" });
}

/* ---------------------------------------------------------------- the entry points */
const DEF_PHRASE = /\b(?:mean|means|meant|meaning|define|definition|stands? for|full form|expand|expansion|abbreviation|short for|explain|what is meant|what do you mean)\b/;
const defCard = (H, e) => H.card("lex:" + e.id, e.term, [e.meaning], { tone: "info", note: GROUPS[e.g] || "", spoken: `${e.term}. ${e.meaning}.` });
const SIGN_GROUPS = new Set();

/* terms the older readers would otherwise swallow: "pressure" is read as the blood pressure, "shock" as hypotension */
const EARLY = new Set(["hemodynamically stable", "hemodynamically unstable", "clinically stable", "septic shock", "cardiogenic shock", "hypovolemic shock", "distributive shock", "obstructive shock", "hypothermia", "conscious", "consciousness", "alert", "drowsy", "lethargic", "obtunded", "stuporous", "comatose", "altered mental status", "altered sensorium", "peep", "plateau pressure", "driving pressure", "pulse pressure", "raised icp", "critical value", "tachycardia", "bradycardia"].filter((x) => !/^(?:tachycardia|bradycardia)$/.test(x)));
/* orders that stand apart from the clinical terms in the line: "start norepinephrine for shock" has one; "is he in septic shock" has none.
   (the order parser reads the bare word "shock" as a defibrillation order; only "shock him / shock now" counts) */
export const DEFIB = /\bshock (?:him|her|now|the patient|again|once|at)\b|^\s*shock\s*$|\bgive (?:a |the )?shock\b|\bdefib\w*|\bcardiovert\w*|\bshock (?:\d+|one|two) ?j/;
export function knownWords(H, text) { const out = new Set(); find(H, text).forEach((h) => h.key.split(" ").forEach((w) => out.add(w))); return out; }
function freeOrders(H, c, hits) {
  let rem = " " + c + " "; hits.forEach((h) => { rem = rem.replace(" " + h.key + " ", " ").replace(h.key, " "); });
  return H.parseOrders(rem).orders.filter((o) => !(o.id === "shock" && !DEFIB.test(rem)));
}
export function pre(H, c, P, ctx) {
  const hits = find(H, c), card = H.card;
  // a request for a written communication, or to be told how to say it
  if (/\b(?:say it (?:like|as) a doctor|speak like a doctor|how (?:do|should|would) i (?:say|put|present|phrase)|professionally|professional language|present the patient|clinical language|how to present)\b/.test(c)) return [professional(H, P, ctx)];
  if (!hits.length) {
    const vb = verbs(H, c, P, ctx); return vb;
  }
  const first = hits[0].e;
  if (DEF_PHRASE.test(c) && !/\b(?:meaning of life)\b/.test(c)) return hits.slice(0, 3).map((h) => {
    const k = h.e.term.toLowerCase(), c2 = defCard(H, h.e); return c2;
  });
  if (/^(?:initiate)\b/.test(c) && c.split(" ").length === 1) return [defCard(H, build(H).byTerm.get("initiate"))];
  const v = verbs(H, c, P, ctx); if (v) return v;
  const g12 = hits.filter((h) => h.e.g === 12);
  if (g12.length && (!(hits.length === 1 && H.parseOrders(c).orders.length)) ) return g12.slice(0, 2).map((h) => communication(H, h.e, P, ctx)).filter(Boolean);
  const isQ = /^(?:is|are|does|do|has|have|how|what|any|can|could)\b/.test(c) || /\bis (?:he|she|the patient|patient|it)\b/.test(c);
  const g10 = hits.filter((h) => h.e.g === 10 && !(isQ && /^patient is /i.test(h.e.term)));
  if (g10.length) return g10.slice(0, 2).map((h) => roundExpr(H, h.e, P, ctx)).filter(Boolean);
  const early = hits.filter((h) => EARLY.has(h.e.term.toLowerCase()));
  if (early.length && !DEFIB.test(c) && !freeOrders(H, c, hits).length) return early.slice(0, 3).map((h) => answer(H, h.e, P, ctx));
  return null;
}

function answer(H, e, P, ctx) {
  const ev = makeEvalCache(H), fn = ev[e.term.toLowerCase()];
  let r = null;
  if (fn) { try { r = fn(P, ctx); } catch (x) { r = null; } }
  if (!r) {
    // terms the engine reads through its existing readers: conditions and lab words
    for (const cd of H.CONDITIONS) if (cd.re.test(" " + nk(H.repair(e.term)) + " ") || e.aliases.some((a) => cd.re.test(nk(H.repair(a))))) { r = cd.ask(P); break; }
    if (!r) for (const [re, f2] of H.LAB_CONDITIONS) if (re.test(nk(H.repair(e.term))) || e.aliases.some((a) => re.test(nk(H.repair(a))))) { r = f2(P); break; }
  }
  if (!r) return defCard(H, e);
  if (r.id && r.lines) { r.note = r.note || e.meaning; return r; }
  const o = Object.assign({ tone: "info", note: r.note || e.meaning, spoken: r.spoken || e.meaning }, r); delete o.lines; delete o.title; delete o.id;
  return H.card("lex:" + e.id, r.title || e.term, r.lines || [], o);
}

const ORDER_TERMS = new Set(["hfnc", "niv", "intubation", "mechanical ventilation", "proning", "reintubation", "renal replacement therapy"]);
export function post(H, c, P, ctx) {
  const hits = find(H, c); if (!hits.length) return null;
  const ev = makeEvalCache(H);
  if (DEFIB.test(c)) return null;
  if (hits.some((h) => ORDER_TERMS.has(h.e.term.toLowerCase())) && H.parseOrders(c).orders.length) return null;
  if (hits.some((h) => !ev[h.e.term.toLowerCase()]) && H.parseOrders(c).orders.length) return null;
  if (freeOrders(H, c, hits).length) return null;
  const words = nk(c).split(" ").filter(Boolean), consumed = hits.reduce((n, h) => n + h.key.split(" ").length, 0), bare = words.length - consumed <= 2;
  const q = /\b(?:is|are|does|did|has|have|any|what|how|can|could|tell|show|check|status|assess)\b/.test(c) || bare;
  if (!q && hits.length === 1 && words.length > 6) return null;
  return hits.slice(0, 3).map((h) => answer(H, h.e, P, ctx));
}
export const terms = () => LEXICON.map((r) => ({ group: r[0], term: r[1], meaning: r[2], aliases: r[3] }));
