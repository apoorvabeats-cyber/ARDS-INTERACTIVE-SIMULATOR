/* What a doctor means, not only what a doctor orders.
   understand(text, ctx) reads a spoken or typed line and returns
     orders   : things to do        ("get an echo", "start meropenem", "intubate")
     answers  : things to tell      ("what is the BP", "is he hypotensive", "show me the ultrasound again",
                                     "what is the urine output", "what is the lactate", "what is pending")
     suggest  : the nearest sensible meanings, when the line fits neither, so there is never a dead end.
   It is a local reader: no network, no model. It knows the patient's numbers (ctx.P), the results that have come back, what has
   been given, and the trend (ctx.hist). It mends the usual speech-recognition slips ("initiate the patient" for "intubate the patient"). */
import { parseOrders } from "./voice-orders.js?v=20261122f";
import { BY_ID, CATALOGUE, LABS, PANELS } from "./order-catalogue.js?v=20261122f";
import * as CB from "./clinical-brain.js?v=20261122f";

/* ---------------------------------------------------------------- 1. mending the speech */
const REPAIRS = [
  [/\b(?:in|en|an|and|un|on)\s*(?:two|to|too|tu|tew|tube|true)\s*(?:bait|bate|bates|bation|bating|beat|beet)\b/g, "intubate"],
  [/\b(?:entubate|intubated|entubation|intibate|intubait|intubating|in tubating)\b/g, (m) => (m === "intubated" ? "intubated" : "intubate")],
  [/\b(?:e\.?\s?t\.?|endo)\s*tube\b/g, "ett"],
  [/\b(?:see\s*bee\s*see|s\s*b\s*c|cdc|cbs|sbc|c\.?b\.?c\.?)\b/g, "cbc"],
  [/\b(?:easy\s*g|e\s*k\s*g|ekg)\b/g, "ecg"],
  [/\bultra\s+sound\b/g, "ultrasound"],
  [/\b(?:ecko|echoes|echos|eco)\b/g, "echo"],
  [/\b(?:marapenem|meropenum|mero\s+penem|merrop\w*|meropenam)\b/g, "meropenem"],
  [/\b(?:nor\s*adrenaline|nor\s*epinephrine|noradrenalin|norad)\b/g, "norepinephrine"],
  [/\bx\s*-?\s*rays?\b/g, "xray"],
  [/\bc\s*t\s*scan\b/g, "ct"],
  [/\bs\s*p\s*o\s*(?:2|two|to)\b|\bsp\s*o\s*(?:2|two)\b|\bspo\s*(?:two|2)\b/g, "spo2"],
  [/\b(?:u\.?\s?o\.?|you\s*oh)\b/g, "uo"],
  [/\bg\s*c\s*s\b|\bglasgow\s*coma\s*(?:scale|score)\b|\bglasgow\b|\bcoma\s*(?:scale|score)\b/g, "gcs"],
  [/\bf\s*i\s*o\s*(?:2|two|to)\b/g, "fio2"],
  [/\bp\s*e\s*e\s*p\b|\bpee\s*p\b/g, "peep"],
  [/\bb\s*\.?\s*p\b/g, "bp"],
  [/\bh\s*\.?\s*r\b/g, "hr"],
  [/\br\s*\.?\s*r\b/g, "rr"],
];
const METRICS = [
  [/\bmean\s+arterial\s*(?:pressure)?\b|\bmean\s+(?:bp|pressure)\b/g, "map"],
  [/\boxygen\s*(?:saturation|level|sats?)\b|\bo2\s*(?:saturation|sats?|level)\b|\bsaturat\w*\b|\bsats?\b|\bpulse\s*ox\w*\b|\boximeter\b/g, "spo2"],
  [/\bblood\s*pressures?\b|\bpressures?\b(?!\s*support)/g, "bp"],
  [/\b(?:heart\s*rate|pulse\s*rate|pulse|beats?\s*per\s*minute|bpm)\b/g, "hr"],
  [/\b(?:respiratory|respiration|resp|breathing)\s*rate\b|\brespirations?\b|\bbreaths?\s*per\s*minute\b/g, "rr"],
  [/\btemperature\b|\btemp\b(?!\s*pac)/g, "temp"],
  [/\bconscious(?:ness)?\s*level\b|\blevel\s*of\s*consciousness\b|\bsensorium\b/g, "gcs"],
  [/\burine\s*output\b|\burinary\s*output\b|\burine\s*volume\b|\bpassing\s*urine\b|\bmaking\s*urine\b|\bdiuresis\b|\burine\b(?!\s+(?:culture|routine|analysis|examination|exam|test|sample|cs|microscopy|dipstick|electrolytes|sodium))/g, "uo"],
];
export function repair(text) {
  let t = " " + String(text || "").toLowerCase().replace(/[‘’`´]/g, "'").replace(/\b(what|how|that|it|he|she|there|where|who|when|let|here)'s\b/g, "$1 is").replace(/'s\b/g, "").replace(/[?!]/g, " | ").replace(/[,;:]/g, " | ") + " ";
  for (const [re, to] of REPAIRS) t = t.replace(re, to);
  // "initiate the patient" is "intubate the patient" misheard; "initiate meropenem" is just "start meropenem"
  t = t.replace(/\binitiat\w*\b((?:\s+\S+){0,3})/g, (m, rest, off, whole) => (/\b(?:what does|what is|what do you mean by|define|meaning of|explain|mean by)\s*$/.test(whole.slice(Math.max(0, off - 24), off)) || /^\s*(?:mean|means|meaning|definition)\b/.test(rest) || (!rest.trim() && /^initiate$/.test(m.trim())) ? " initiate" + rest : parseOrders(rest).orders.length ? " start" + rest : " intubate" + rest));
  for (const [re, to] of METRICS) t = t.replace(re, to);
  return t.replace(/\s+/g, " ").trim();
}

/* ---------------------------------------------------------------- 2. the patient, in words */
const VT = {
  bp: { name: "Blood pressure", unit: "mmHg" }, map: { name: "Mean arterial pressure", unit: "mmHg" }, hr: { name: "Heart rate", unit: "/min" }, rr: { name: "Respiratory rate", unit: "/min" },
  spo2: { name: "SpO₂", unit: "%" }, temp: { name: "Temperature", unit: "°C" }, gcs: { name: "GCS", unit: "/15" }, uo: { name: "Urine output", unit: "mL/h" },
};
const lvl = {
  bp: (P) => (P.sbp < 80 || P.map < 55 ? 2 : P.sbp < 90 || P.map < 65 ? 1 : P.sbp > 180 ? 1 : 0), map: (P) => (P.map < 55 ? 2 : P.map < 65 ? 1 : 0),
  hr: (P) => (P.hr > 140 || P.hr < 40 ? 2 : P.hr > 100 || P.hr < 60 ? 1 : 0), rr: (P) => (P.rr >= 30 || P.rr < 8 ? 2 : P.rr > 20 || P.rr < 10 ? 1 : 0),
  spo2: (P) => (P.spo2 < 90 ? 2 : P.spo2 < 94 ? 1 : 0), temp: (P) => (P.temp >= 39.5 || P.temp < 35 ? 2 : P.temp >= 38 || P.temp < 36 ? 1 : 0),
  gcs: (P) => (P.gcs <= 8 ? 2 : P.gcs < 15 ? 1 : 0), uo: (P) => (P.uo < 10 ? 2 : P.uo < 35 ? 1 : 0),
};
const TONE = ["ok", "warn", "crit"];
function valueOf(k, P) {
  switch (k) {
    case "bp": return `${P.sbp}/${P.dbp}`; case "map": return String(P.map); case "hr": return String(P.hr); case "rr": return String(P.rr);
    case "spo2": return String(P.spo2); case "temp": return Number(P.temp).toFixed(1); case "gcs": return String(P.gcs); case "uo": return String(P.uo); default: return "";
  }
}
function wordsOf(k, P) {
  switch (k) {
    case "bp": return P.sbp < 90 || P.map < 65 ? "Low. This is hypotension." : P.sbp > 180 ? "Very high." : P.sbp > 140 ? "Raised." : "Acceptable.";
    case "map": return P.map < 65 ? "Below 65, perfusion is at risk." : "At or above 65.";
    case "hr": return P.hr > 100 ? (P.hr > 140 ? "Severe tachycardia." : "Tachycardia.") : P.hr < 60 ? (P.hr < 40 ? "Severe bradycardia." : "Bradycardia.") : "Normal rate.";
    case "rr": return P.rr > 20 ? (P.rr >= 30 ? "Marked tachypnoea." : "Tachypnoea.") : P.rr < 10 ? "Slow breathing." : "Normal.";
    case "spo2": return P.spo2 < 90 ? "Severe hypoxaemia." : P.spo2 < 94 ? "Low. Falling oxygenation." : "Acceptable.";
    case "temp": return P.temp >= 38 ? "Fever." : P.temp < 36 ? "Low temperature." : "Normal.";
    case "gcs": return P.gcs <= 8 ? "Severely depressed. The airway is at risk." : P.gcs < 15 ? "Reduced conscious level." : "Fully awake.";
    case "uo": return P.uo < 10 ? "Anuric or nearly so." : P.uo < 35 ? "Oliguria, under 0.5 mL/kg/h." : "Adequate.";
    default: return "";
  }
}
const kgOf = () => 70;
const pFull = (P) => ["bp", "hr", "rr", "spo2", "temp", "gcs", "uo"];

/* ---------------------------------------------------------------- 3. what the room has done and learned */
const results = (P) => (P && P.results) || [];
function latestItem(P, key) { let best = null; for (const r of results(P)) for (const it of r.items || []) if (it.k === key && (!best || r.readyAtMs >= best.r.readyAtMs)) best = { it, r }; return best; }
function latestResult(P, id) { let best = null; for (const r of results(P)) if (r.id === id && (!best || r.readyAtMs >= best.readyAtMs)) best = r; return best; }
const hourOf = (ms) => "Hour " + Math.floor(ms / 15000);
const given = (P, id) => (P && P.given && P.given[id]) || 0;
function pendingOf(P) { return (P && P.pending) || []; }

/* lab words -> the value key they name, and panel words -> the order they name */
const LAB_WORDS = {
  hb: ["hb", "haemoglobin", "hemoglobin", "hgb"], wbc: ["wbc", "tlc", "white cell", "white cells", "white count", "leucocytes", "leukocytes"], plt: ["platelet", "platelets", "plt"],
  urea: ["urea", "bun"], cr: ["creatinine", "creat", "cr"], na: ["sodium", "na"], k: ["potassium", "k"], cl: ["chloride"], ca: ["calcium"], mg: ["magnesium"],
  bili: ["bilirubin", "bili"], alt: ["alt", "sgpt"], ast: ["ast", "sgot"], alb: ["albumin"], ph: ["ph"], pco2: ["pco2", "paco2", "co2", "carbon dioxide"], po2: ["po2", "pao2"],
  hco3: ["bicarbonate", "bicarb", "hco3"], lactate: ["lactate", "lactic acid"], inr: ["inr"], aptt: ["aptt", "ptt"], fib: ["fibrinogen"], trop: ["troponin", "trop"],
  bnp: ["bnp", "probnp"], ck: ["cpk", "ck", "creatine kinase"], glu: ["glucose", "sugar", "rbs", "blood sugar"], crp: ["crp"], pct: ["procalcitonin", "pct"],
  amy: ["amylase"], lip: ["lipase"], nh3: ["ammonia"], ddimer: ["ddimer", "d dimer"], bhb: ["ketones", "ketone", "bhb"], osm: ["osmolality", "osmolarity"],
};
const WORD_KEY = new Map(); Object.entries(LAB_WORDS).forEach(([k, ws]) => ws.forEach((w) => WORD_KEY.set(w, k)));
const PANEL_WORDS = { "lab:cbc": ["cbc", "blood count", "complete blood count"], "lab:kft": ["kft", "rft", "renal profile", "kidney function", "renal function"], "lab:lft": ["lft", "liver function", "liver profile"], "lab:abg": ["abg", "blood gas", "arterial blood gas", "gases"], "lab:lyte": ["electrolytes", "lytes"], "lab:coag": ["coagulation", "coag", "coag profile"] };
const IMG_IDS = ["img:cxr", "img:ecg", "img:echo", "img:usg", "img:cthead", "img:ctchest", "img:ctabd", "img:ctpa", "img:ctangio", "img:xabd", "img:mri"];

/* ---------------------------------------------------------------- 4. the answers */
const card = (id, title, lines, o) => ({ id, title, lines: lines.filter(Boolean), tone: "ok", ...(o || {}) });
function vitalCard(k, P) {
  const L = lvl[k](P), c = card("v:" + k, VT[k].name, [wordsOf(k, P)], { big: valueOf(k, P), unit: VT[k].unit, tone: TONE[L], section: "vitals" });
  if (k === "bp") { c.lines.unshift(`MAP ${P.map} mmHg`); c.spoken = `Blood pressure ${P.sbp} over ${P.dbp}, mean ${P.map}. ${wordsOf("bp", P)}`; }
  else if (k === "uo") { const m = Math.round((P.uo / kgOf()) * 100) / 100; c.lines.unshift(`${m} mL/kg/h for a 70 kg adult`); if (!given(P, "proc:foley")) c.lines.push("No urinary catheter yet. A Foley gives an hourly chart."); c.spoken = `Urine output ${P.uo} millilitres an hour. ${wordsOf("uo", P)}`; }
  else c.spoken = `${VT[k].name} ${valueOf(k, P)}${VT[k].unit === "%" ? " percent" : ""}. ${wordsOf(k, P)}`;
  if (k === "spo2" && (P.oxygen || P.tube)) c.lines.push(P.tube ? "On the ventilator." : "On oxygen.");
  return c;
}
function summaryCard(P) {
  const rows = pFull(P).map((k) => { const L = lvl[k](P); return { k, text: `${VT[k].name}: ${valueOf(k, P)} ${VT[k].unit}`, L }; });
  const worst = Math.max(...rows.map((r) => r.L)), bad = rows.filter((r) => r.L > 0).map((r) => VT[r.k].name);
  return card("summary", "The patient now", rows.map((r) => `${r.L === 2 ? "▲▲ " : r.L === 1 ? "▲ " : ""}${r.text}`), { tone: TONE[worst], section: "vitals",
    spoken: worst ? `Not stable. ${bad.join(", ")} ${bad.length > 1 ? "are" : "is"} abnormal.` : "Vitals are within range.", big: `${P.sbp}/${P.dbp}`, unit: `HR ${P.hr} · SpO₂ ${P.spo2}%` });
}

/* is the patient ...? */
const CONDITIONS = [
  { re: /\b(hypotens\w*|low bp|bp low|low pressure|shock\w*|crash\w*|bp drop\w*|pressure drop\w*|dropping pressure)\b/, id: "hypotension", ask: (P) => {
    const lac = latestItem(P, "lactate"), low = P.sbp < 90 || P.map < 65;
    return card("c:hypotension", low ? "Yes, hypotensive" : "No, not hypotensive", [`BP ${P.sbp}/${P.dbp}, MAP ${P.map}`, low ? (lac ? (lac.it.v > 2 ? `Lactate ${lac.it.text}: this is shock.` : `Lactate ${lac.it.text}.`) : "Lactate has not been measured yet.") : "MAP is 65 or above."], { tone: low ? (P.map < 55 ? "crit" : "warn") : "ok", section: "vitals", spoken: low ? `Yes. Blood pressure ${P.sbp} over ${P.dbp}, mean ${P.map}. Hypotensive.` : `No. Blood pressure ${P.sbp} over ${P.dbp}.` });
  } },
  { re: /\b(hypox\w*|desaturat\w*|low spo2|spo2 low|low sats?|breathless\w*|short of breath)\b/, id: "hypoxia", ask: (P) => {
    const low = P.spo2 < 94; return card("c:hypoxia", low ? "Yes, hypoxic" : "No, not hypoxic", [`SpO₂ ${P.spo2}%, respiratory rate ${P.rr}`, P.tube ? "On the ventilator." : P.oxygen ? "On oxygen." : "On room air."], { tone: low ? (P.spo2 < 90 ? "crit" : "warn") : "ok", section: "vitals", spoken: low ? `Yes. Saturation ${P.spo2} percent.` : `No. Saturation ${P.spo2} percent.` });
  } },
  { re: /\b(tachycard\w*|fast heart|racing)\b/, id: "tachy", ask: (P) => card("c:tachy", P.hr > 100 ? "Yes, tachycardic" : "No, not tachycardic", [`Heart rate ${P.hr} /min`], { tone: P.hr > 140 ? "crit" : P.hr > 100 ? "warn" : "ok", section: "vitals", spoken: `${P.hr > 100 ? "Yes" : "No"}. Heart rate ${P.hr}.` }) },
  { re: /\b(bradycard\w*|slow heart)\b/, id: "brady", ask: (P) => card("c:brady", P.hr < 60 ? "Yes, bradycardic" : "No, not bradycardic", [`Heart rate ${P.hr} /min`], { tone: P.hr < 40 ? "crit" : P.hr < 60 ? "warn" : "ok", section: "vitals", spoken: `${P.hr < 60 ? "Yes" : "No"}. Heart rate ${P.hr}.` }) },
  { re: /\b(tachypn\w*|breathing fast|fast breathing)\b/, id: "tachypnoea", ask: (P) => card("c:rr", P.rr > 20 ? "Yes, tachypnoeic" : "No, not tachypnoeic", [`Respiratory rate ${P.rr} /min`], { tone: P.rr >= 30 ? "crit" : P.rr > 20 ? "warn" : "ok", section: "vitals", spoken: `${P.rr > 20 ? "Yes" : "No"}. Respiratory rate ${P.rr}.` }) },
  { re: /\b(febrile|fever\w*|pyrexi\w*|hyperthermi\w*|hypothermi\w*|temperature high|high temp)\b/, id: "fever", ask: (P) => { const f = P.temp >= 38, h = P.temp < 36; return card("c:fever", f ? "Yes, febrile" : h ? "Hypothermic" : "No fever", [`Temperature ${Number(P.temp).toFixed(1)} °C`], { tone: P.temp >= 39.5 || P.temp < 35 ? "crit" : f || h ? "warn" : "ok", section: "vitals", spoken: `${f ? "Yes" : "No"}. Temperature ${Number(P.temp).toFixed(1)}.` }); } },
  { re: /\b(oligur\w*|anuri\w*|not passing urine|no urine)\b/, id: "oliguria", ask: (P) => card("c:uo", P.uo < 35 ? (P.uo < 10 ? "Yes, anuric" : "Yes, oliguric") : "No, passing urine", [`Urine output ${P.uo} mL/h`, `${Math.round((P.uo / kgOf()) * 100) / 100} mL/kg/h`], { tone: P.uo < 10 ? "crit" : P.uo < 35 ? "warn" : "ok", section: "vitals", spoken: `${P.uo < 35 ? "Yes" : "No"}. Urine output ${P.uo} millilitres an hour.` }) },
  { re: /\b(drowsy|unconscious|obtunded|comatose|coma|confus\w*|altered|awake|responsive)\b/, id: "conscious", ask: (P) => card("c:gcs", P.gcs < 15 ? "Conscious level is reduced" : "Awake", [`GCS ${P.gcs}/15`, wordsOf("gcs", P)], { tone: P.gcs <= 8 ? "crit" : P.gcs < 15 ? "warn" : "ok", section: "vitals", spoken: `G C S ${P.gcs}.` }) },
  { re: /\b(sepsis|septic)\b/, id: "sepsis", ask: (P) => {
    const q = (P.rr >= 22 ? 1 : 0) + (P.sbp <= 100 ? 1 : 0) + (P.gcs < 15 ? 1 : 0), lac = latestItem(P, "lactate"), wbc = latestItem(P, "wbc"), fever = P.temp >= 38 || P.temp < 36;
    const hits = [fever ? `Temperature ${Number(P.temp).toFixed(1)} °C` : "", P.hr > 90 ? `Heart rate ${P.hr}` : "", lac ? `Lactate ${lac.it.text}` : "", wbc ? `WBC ${wbc.it.text}` : ""].filter(Boolean);
    return card("c:sepsis", q >= 2 ? "qSOFA is positive" : "qSOFA is below 2", [`qSOFA ${q} of 3 (rate ≥22, systolic ≤100, GCS under 15)`, hits.join(" · "), "Sepsis is a diagnosis from the source and the cultures, not from numbers alone."], { tone: q >= 2 ? "crit" : q === 1 ? "warn" : "ok", section: "vitals", spoken: `Q SOFA ${q} of 3.` });
  } },
  { re: /\b(arrest\w*|alive|dead|dying|pulse(?:less)?|died)\b/, id: "alive", ask: (P) => card("c:alive", P.alive === false ? "The patient has died" : P.hr === 0 && P.sbp === 0 ? "Cardiac arrest" : "Alive, with a pulse", [P.hr === 0 && P.alive !== false ? "Start CPR and call for the arrest team." : `Rhythm: ${P.rhythm === "sinus" ? "sinus" : P.rhythm}`], { tone: P.alive === false || (P.hr === 0 && P.sbp === 0) ? "crit" : "ok", section: "vitals", spoken: P.alive === false ? "The patient has died." : P.hr === 0 ? "Cardiac arrest." : "Alive, with a pulse." }) },
];
function labCondition(P, key, label, test, yes, no) {
  const m = latestItem(P, key); if (!m) return card("c:" + key, `${label}: not measured yet`, ["That value has not come back. Send the test to find out."], { tone: "info", spoken: `${label} has not been measured yet.` });
  const ok = test(m.it.v); return card("c:" + key, ok ? yes : no, [`${LABS[key][4]} ${m.it.text} ${m.it.unit}`, `Reported ${hourOf(m.r.readyAtMs)}`], { tone: ok ? "warn" : "ok", section: "invest", spoken: `${ok ? yes : no}. ${LABS[key][4]} ${m.it.text}.` });
}
const LAB_CONDITIONS = [
  [/\b(hyperkal\w*)\b/, (P) => labCondition(P, "k", "Potassium", (v) => v > 5.1, "Yes, hyperkalaemia", "No hyperkalaemia")],
  [/\b(hypokal\w*)\b/, (P) => labCondition(P, "k", "Potassium", (v) => v < 3.5, "Yes, hypokalaemia", "No hypokalaemia")],
  [/\b(hyponat\w*)\b/, (P) => labCondition(P, "na", "Sodium", (v) => v < 135, "Yes, hyponatraemia", "No hyponatraemia")],
  [/\b(hypernat\w*)\b/, (P) => labCondition(P, "na", "Sodium", (v) => v > 145, "Yes, hypernatraemia", "No hypernatraemia")],
  [/\b(anaemi\w*|anemi\w*)\b/, (P) => labCondition(P, "hb", "Haemoglobin", (v) => v < 12, "Yes, anaemic", "No anaemia")],
  [/\b(hypoglyc\w*)\b/, (P) => labCondition(P, "glu", "Glucose", (v) => v < 70, "Yes, hypoglycaemia", "No hypoglycaemia")],
  [/\b(hyperglyc\w*)\b/, (P) => labCondition(P, "glu", "Glucose", (v) => v > 180, "Yes, hyperglycaemia", "No hyperglycaemia")],
  [/\b(acidosis|acidotic|acidemi\w*|acidaemi\w*)\b/, (P) => labCondition(P, "ph", "pH", (v) => v < 7.35, "Yes, acidaemia", "No acidaemia")],
  [/\b(aki|renal failure|kidney injury|renal injury)\b/, (P) => labCondition(P, "cr", "Creatinine", (v) => v > 1.5, "Creatinine is raised", "Creatinine is not raised")],
  [/\b(coagulopath\w*|bleeding disorder)\b/, (P) => labCondition(P, "inr", "INR", (v) => v > 1.5, "Yes, coagulopathy", "No coagulopathy")],
  [/\b(raised lactate|high lactate|hyperlactat\w*)\b/, (P) => labCondition(P, "lactate", "Lactate", (v) => v > 2, "Yes, lactate is raised", "Lactate is normal")],
];

/* improving or worsening, from the trend on the monitor */
function trendCard(P, hist) {
  const h = (hist || []).filter((x) => x && typeof x.map === "number").slice(-8);
  if (h.length < 3) return card("trend", "Too early to call a trend", ["Give it a few more readings."], { tone: "info", spoken: "Too early to call a trend." });
  const a = h[0], b = h[h.length - 1], d = { map: b.map - a.map, spo2: b.spo2 - a.spo2, hr: b.hr - a.hr, temp: b.temp - a.temp };
  const score = (d.map > 4 ? 1 : d.map < -4 ? -1 : 0) + (d.spo2 > 1.5 ? 1 : d.spo2 < -1.5 ? -1 : 0) + (d.hr < -6 ? 1 : d.hr > 6 ? -1 : 0);
  const up = (x, u) => (x > 0 ? "up " : "down ") + Math.abs(Math.round(x * 10) / 10) + u;
  const t = score > 0 ? "Improving" : score < 0 ? "Getting worse" : "Holding steady";
  return card("trend", t, [`MAP ${up(d.map, "")}, SpO₂ ${up(d.spo2, "%")}, HR ${up(d.hr, "")}`, `Over the last ${h.length} readings`], { tone: score < 0 ? "warn" : "ok", section: "vitals", spoken: t + "." });
}

/* the case, and the team's work */
function givenCard(P, ids) {
  const rows = ids.map((id) => ({ id, n: given(P, id) }));
  return card("given", rows.length === 1 ? (rows[0].n ? `Yes, ${BY_ID[rows[0].id].label} was given` : `No, ${BY_ID[rows[0].id].label} has not been given`) : "What was asked", rows.map((r) => `${BY_ID[r.id].label}: ${r.n ? (r.n > 1 ? `done ${r.n} times` : "done") : "not yet"}`), { tone: rows.every((r) => r.n) ? "ok" : "info", section: "treat", spoken: rows.map((r) => `${BY_ID[r.id].label} ${r.n ? "done" : "not yet"}`).join(". "), actions: rows.filter((r) => !r.n).map((r) => ({ label: "Do it now", order: r.id })) });
}
function doneCard(P) {
  const ids = Object.keys(P.given || {}).filter((k) => BY_ID[k] && k !== "examine"), lab = ids.filter((k) => k.startsWith("lab:") || k.startsWith("img:")), rx = ids.filter((k) => !lab.includes(k));
  const lines = []; if (lab.length) lines.push("Tests: " + lab.map((k) => BY_ID[k].label).join(", ")); if (rx.length) lines.push("Treatment: " + rx.map((k) => BY_ID[k].label).join(", ")); if (P.given && P.given.examine) lines.push("Examined");
  return card("done", ids.length || (P.given && P.given.examine) ? "Done so far" : "Nothing has been done yet", lines.length ? lines : ["Start with the examination and the first tests."], { tone: "info", section: "treat", spoken: lines.join(". ") || "Nothing has been done yet." });
}
function pendingCard(P) {
  const p = pendingOf(P), now = P.elapsedMs || 0;
  if (!p.length) return card("pending", "Nothing is pending", [results(P).length ? "Every result that was sent is back." : "No tests have been sent yet."], { tone: "info", section: "invest", spoken: "Nothing is pending." });
  return card("pending", `${p.length} result${p.length > 1 ? "s" : ""} coming`, p.map((x) => `${x.label}: about ${Math.max(1, Math.ceil((x.readyAtMs - now) / 1000))} s`), { tone: "info", section: "invest", spoken: `${p.length} results are pending.` });
}
function whatsNewCard(P) {
  const rs = results(P).slice(-4).reverse(); if (!rs.length) return card("new", "No results yet", ["Send some tests and they will appear here."], { tone: "info", spoken: "No results yet." });
  return card("new", "Latest results", rs.map((r) => `${r.label}: ${r.abnormal ? "abnormal" : "normal"}`), { tone: rs.some((r) => r.abnormal) ? "warn" : "ok", section: "invest", spoken: `Latest: ${rs.map((r) => r.label).join(", ")}.` });
}
function resultCard(r) {
  const items = (r.items || []).map((it) => `${it.label}: ${it.text}${it.unit ? " " + it.unit : ""}${it.abn ? (it.dir === "high" ? " ▲" : it.dir === "low" ? " ▼" : " !") : ""}`);
  const lines = items.length ? items : [r.text];
  return card("r:" + r.id, r.label, lines, { tone: r.abnormal ? "warn" : "ok", section: "invest", sub: r.text && items.length ? r.text : "", spoken: `${r.label}. ${r.text || items.slice(0, 3).join(". ")}` });
}
function valueCard(P, key) {
  const m = latestItem(P, key); const L = LABS[key];
  if (!m) { const sent = Object.entries(PANELS).some(([id, ks]) => ks.includes(key) && given(P, id)), panel = Object.entries(PANELS).find(([, ks]) => ks.includes(key)); return card("l:" + key, sent ? `${L[4]} is still pending` : `${L[4]} not measured yet`, [sent ? "The test was sent. The result is not back yet." : "It has not been sent."], { tone: "info", spoken: sent ? `${L[4]} is still pending.` : `${L[4]} has not been measured yet.`, actions: sent || !panel ? [] : [{ label: "Send " + BY_ID[panel[0]].label, order: panel[0] }] }); }
  const it = m.it, rows = [`Normal ${L[0]} to ${L[1]} ${L[2]}`.trim(), `Reported ${hourOf(m.r.readyAtMs)}`];
  return card("l:" + key, L[4], rows, { big: it.text, unit: it.unit, tone: it.abn ? "warn" : "ok", section: "invest", spoken: `${L[4]} ${it.text} ${it.unit || ""}. ${it.abn ? (it.dir === "high" ? "High." : "Low.") : "Normal."}` });
}

/* ---------------------------------------------------------------- 5. reading a line */
const QSTART = /^(?:what|how|is|are|was|were|does|did|do we|do you|has|have|had|any|which|when|where|who|why|can you|could you|tell|show|let me|give me|read|report|status|check|see|view|review|display|pull|open|look|repeat)\b/;
const ORDERISH = /\b(?:shock (?:him|her|now|the patient)|defib\w*|cardiovert\w*|cpr|compressions|start|give|put|send|get|do|order|run|insert|place|begin|set up|arrange|push|administer|infuse|bolus|intubate|ventilate|call|page|inform|transfuse|prepare|prepped|cancel|stop)\b/;
const REVIEW = /\b(?:showing|shows|showed|says|saying|show|see|view|review|display|pull up|open|look at|read|report|result|results|finding|findings|show me|what does|what did|came back|latest|last)\b/;
const REDO = /\b(?:repeat|redo|re do|do again|send again|get again|once more|another|recheck|re check|fresh|new)\b/;
const INDICATION = /\b(?:for|because of|due to|in view of|to treat|to correct|secondary to|with|as)\s+(?:the\s+|his\s+|her\s+)?$/;

function splitClauses(t) {
  const parts = t.split(/\s\|\s|\s\|$|^\|\s/).flatMap((x) => x.split(/\s(?:and then|and also|then|also|plus|and)\s(?=(?:what|how|is|are|does|did|has|have|any|tell|show|check|give|start|do|get|send|call|put|order|run|insert|intubate|ventilate|repeat|see|review|please|can|could|let|monitor|reassess|titrate|escalate|continue|wean|stabili[sz]e|resuscitate|withhold|discontinue|optimi[sz]e|restrict|keep)\b)/));
  return parts.map((x) => x.trim()).filter(Boolean);
}

/* find the answers in one clause; returns { cards, rest } where rest is what is left over for the order parser */
let HB = null;
const helpers = () => HB || (HB = { card, latestItem, latestResult, given, lvl, VT, words: wordsOf, summaryCard, trendCard, CONDITIONS, LAB_CONDITIONS, BY_ID, parseOrders, repair });
function readClause(c, ctx) {
  const P = ctx.P;
  { const pre = CB.pre(helpers(), c, P, ctx); if (pre && pre.length) return { cards: pre, rest: "", hit: true }; }
  const cards = [], q = QSTART.test(c) || /\b(?:what|how|is he|is she|is the|are the|does he|does she|any)\b/.test(c), short = c.split(" ").length <= 4, orderish = ORDERISH.test(c) && !/^(?:check|show|give me|tell|let me|read|see|view|review|display|pull|open|look)\b/.test(c);
  const has = (re) => re.test(c), stmt = /^(?:he|she|patient|the patient|his|her|bp|pressure|sats?|spo2|urine|uo)\s+(?:is|are|has|have|was|looks|seems|dropped|dropping|came|keeps|going)\b/.test(c) && !q;
  let t = c, hit = false, vitHit = false;
  if (stmt && !parseOrders(c).orders.length) return { cards, rest: "", hit: true, noted: true };
  const take = (card0) => { if (card0) { cards.push(card0); hit = true; } };

  // 1. what is the case / who is the patient / the history
  if (/\b(?:diagnosis|what is wrong|what is going on|what is the problem|what is he having|what does he have|what does she have)\b/.test(c)) take(card("dx", "The diagnosis is hidden", ["This is a blind case. Reason from the history, the examination and the tests, then give your plan."], { tone: "info", spoken: "The diagnosis is hidden. Reason from the tests." }));
  else if (/\b(?:how old|age|who is the patient|name|history|presentation|what happened|chief complaint|story|brought in|came in)\b/.test(c) && q && ctx.story) take(card("story", ctx.story.title || "The patient", [ctx.story.text], { tone: "info", section: "history", spoken: ctx.story.text }));
  // 2. what is pending / what is new / what has been done
  else if (/\b(?:pending|awaited|waiting for|not back|still coming|when will|how long (?:for|will)|are the results ready|results ready|anything back)\b/.test(c)) take(pendingCard(P));
  else if (/\b(?:what is new|any new|anything new|new results|latest results|what is back|results back|what came back|any results|any result)\b/.test(c)) take(whatsNewCard(P));
  else if (/\b(?:what (?:have we|has been|all have we|did we)|so far|what is done|what we have done|summary of (?:care|orders)|orders so far)\b/.test(c) && /\b(?:done|given|ordered|started|sent|so far|have we)\b/.test(c)) take(doneCard(P));
  else if (/\b(?:how long|what time|how much time|elapsed|time since|how many minutes|clock)\b/.test(c)) take(card("time", `${Math.floor((P.elapsedMs || 0) / 60000)} min ${Math.floor(((P.elapsedMs || 0) % 60000) / 1000)} s`, ["Since the shift began."], { tone: "info", spoken: `${Math.floor((P.elapsedMs || 0) / 60000)} minutes.` }));
  else if (/\b(?:what next|what now|what should we|what do we do|what else|any suggestion|suggest|advice|hint|stuck|next step|missing|left to do|forgot\w*|overlook\w*)\b/.test(c)) {
    const need = [["examine", "Examine the patient"], ["lab:abg", "Blood gas"], ["lab:lactate", "Lactate"], ["lab:cbc", "CBC"], ["lab:kft", "Kidney function"], ["img:ecg", "ECG"], ["img:cxr", "Chest X-ray"], ["lab:cultures", "Cultures"]].filter(([id]) => !given(P, id));
    take(card("next", need.length ? "Not yet looked at" : "The usual first steps are done", need.length ? need.slice(0, 5).map(([, l]) => l) : ["Now treat what the results show, and call the specialists the case needs."], { tone: "info", spoken: need.length ? "Not yet done: " + need.slice(0, 4).map(([, l]) => l).join(", ") + "." : "The usual first steps are done.", actions: need.slice(0, 3).map(([id, l]) => ({ label: l, order: id })), note: "This is a blind case, so the engine will not name the diagnosis." }));
  }
  else if (/\b(?:what can i say|help|commands|what can you do|how do i)\b/.test(c)) take(card("help", "You can say", ["Orders: do CBC, KFT, LFT · get an echo · start meropenem · intubate the patient · call the nephrologist", "Questions: what is the BP · is he hypotensive · urine output · what is the lactate · what is pending", "Reviews: show me the ultrasound again · what did the chest X-ray show"], { tone: "info", spoken: "Say an order, or ask a question about the patient." }));
  // 3. is he on / has he got / did we give
  else if (/\b(?:intubated|on (?:a |the )?ventilator|ventilated|on (?:a |the )?vent|is he tubed|tubed)\b/.test(c) && q) take(card("tube", P.tube ? "Yes, intubated and ventilated" : "Not intubated", [P.tube ? "On the ventilator." : P.oxygen ? "On oxygen." : "On room air.", `SpO₂ ${P.spo2}%`], { tone: P.tube ? "ok" : "info", section: "treat", spoken: P.tube ? "Yes, he is ventilated." : "Not intubated.", actions: P.tube ? [] : [{ label: "Intubate", order: "proc:intubate" }] }));
  else if (/\b(?:on oxygen|getting oxygen|on o2|on room air|on supplemental)\b/.test(c) && q) take(card("o2", P.tube ? "On the ventilator" : P.oxygen ? "Yes, on oxygen" : "No, on room air", [`SpO₂ ${P.spo2}%`], { tone: "info", section: "treat", spoken: P.oxygen || P.tube ? "Yes." : "No, room air.", actions: P.oxygen || P.tube ? [] : [{ label: "Start oxygen", order: "proc:oxygen" }] }));
  else if (/\b(?:on (?:a |the )?(?:pressors?|vasopressors?|norepinephrine|inotropes?|noradrenaline)|vasopressor support|on support)\b/.test(c) && q) take(card("pressor", P.norepi ? "Yes, on norepinephrine" : "No vasopressor yet", [`BP ${P.sbp}/${P.dbp}, MAP ${P.map}`], { tone: "info", section: "treat", spoken: P.norepi ? "Yes, on norepinephrine." : "No vasopressor yet.", actions: P.norepi ? [] : [{ label: "Start norepinephrine", order: "drug:norepi" }] }));
  else if (/\b(?:art(?:erial)? line|arterial line|a line|central line|cvc|dialysis|dialysing)\b/.test(c) && /\b(?:is|has|does|have)\b/.test(c) && q && !orderish) {
    const what = /dialy/.test(c) ? ["Dialysis", P.dialysis] : /central|cvc/.test(c) ? ["Central line", P.hdLine || given(P, "proc:cvc")] : ["Arterial line", P.artLine]; take(card("line", what[1] ? `Yes, ${what[0].toLowerCase()} is in place` : `No ${what[0].toLowerCase()} yet`, [], { tone: "info", section: "treat", spoken: what[1] ? "Yes." : "No." }));
  }
  // 4. is the patient ...?  (not when the word is the reason for an order: "give fluids for hypotension")
  if (!hit && (q || short) && !(orderish && !/\b(?:is|are|does|has|have|any|check)\b/.test(c))) {
    for (const cd of CONDITIONS) { const m = cd.re.exec(c); if (m && !INDICATION.test(c.slice(0, m.index))) { take(cd.ask(P)); break; } }
    if (!hit) for (const [re, fn] of LAB_CONDITIONS) { const m = re.exec(c); if (m && !INDICATION.test(c.slice(0, m.index))) { take(fn(P)); break; } }
    if (!hit && /\b(?:stable|unstable|critical|sick)\b/.test(c)) { take(summaryCard(P)); take(trendCard(P, ctx.hist)); }
    else if (!hit && /\b(?:improv\w*|better|worse|deteriorat\w*|settling|responding|trend|getting|going)\b/.test(c)) take(trendCard(P, ctx.hist));
  }
  // 5. the numbers on the monitor
  if (!hit && !(orderish && !/\b(?:check|show|tell|let me know|read|what|how)\b/.test(c))) {
    const ks = []; for (const k of ["bp", "map", "hr", "rr", "spo2", "temp", "gcs", "uo"]) { const m = new RegExp("\\b" + k + "\\b").exec(c); if (m && !INDICATION.test(c.slice(0, m.index))) ks.push(k); }
    if (/\b(?:vitals?|everything|monitor|numbers|observations?|obs|parameters)\b/.test(c) || /\bhow is (?:he|she|the patient|patient)\b|\bhow (?:is|are) (?:he|she) (?:doing|now)\b|\bpatient status\b|\bstatus\b|\bupdate\b|\bsit ?rep\b|\bcurrent condition\b/.test(c)) take(summaryCard(P));
    else if (ks.length && (q || short || ks.length > 1)) { ks.forEach((k) => take(vitalCard(k, P))); vitHit = true; }
    else if (/\b(?:breathing|respiratory status|respiratory)\b/.test(c) && q) { take(vitalCard("rr", P)); take(vitalCard("spo2", P)); }
    else if (/\b(?:rhythm|ecg rhythm)\b/.test(c) && q) take(card("rhythm", P.rhythm === "sinus" ? "Sinus rhythm" : P.rhythm === "vf" ? "Ventricular fibrillation" : "Pulseless electrical activity", [`Heart rate ${P.hr}`], { tone: P.rhythm === "sinus" ? "ok" : "crit", section: "vitals", spoken: P.rhythm === "sinus" ? "Sinus rhythm." : "Arrest rhythm." }));
  }
  // 6. a result that has come back: "what is the lactate", "show me the ultrasound again", "what did the chest x-ray show", "is the potassium high"
  if ((!hit || vitHit) && !REDO.test(c)) {
    const STRIP = /\b(?:the|a|an|his|her|of|is|was|what|are|were|level|value|values|result|results|report|tell|me|show|showing|shows|showed|us|now|current|latest|last|again|please|check|see|view|read|let|know|give|display|look|at|do|does|did|has|have|any|high|low|raised|normal|abnormal|ok|fine|came|back)\b/g;
    const words = c.replace(STRIP, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean), keys = [];
    for (let i = 0; i < words.length; i += 1) { const two = words[i] + " " + (words[i + 1] || ""); if (WORD_KEY.has(two)) { keys.push(WORD_KEY.get(two)); i += 1; } else if (WORD_KEY.has(words[i])) keys.push(WORD_KEY.get(words[i])); }
    const panel = Object.entries(PANEL_WORDS).find(([, ws]) => ws.some((w) => new RegExp("\\b" + w + "\\b").test(c)));
    const parsed = parseOrders(c.replace(/\b(?:show me|show|showing|shows|showed|see|view|review|display|pull up|open|look at|read|report|results?|findings?|what does|what did|what is|what was|again|latest|last|came back|tell me|the)\b/g, " | "));
    const ids = [...new Set(parsed.orders.map((o) => o.id).filter((id) => /^(?:lab|img):/.test(id) || id === "examine"))];
    const qq = q && !/^check\b/.test(c), asking = REVIEW.test(c) || /\bwhat (?:is|was|are|were)\b/.test(c) || /\b(?:level|value|values)\b/.test(c) || (qq && (keys.length || panel || ids.length));
    if (asking && !(orderish && !REVIEW.test(c)) && (!vitHit || keys.length)) {
      if (panel) { const r = latestResult(P, panel[0]); take(r ? resultCard(r) : card("r:" + panel[0], BY_ID[panel[0]].label + (given(P, panel[0]) ? " is still pending" : " not sent yet"), ["No result to show yet."], { tone: "info", spoken: `${BY_ID[panel[0]].label} ${given(P, panel[0]) ? "is still pending" : "has not been sent yet"}.`, actions: given(P, panel[0]) ? [] : [{ label: "Send it now", order: panel[0] }] })); }
      else if (keys.length) [...new Set(keys)].forEach((k) => take(valueCard(P, k)));
      else if (ids.length) ids.forEach((id) => { const r = latestResult(P, id); take(r ? resultCard(r) : card("r:" + id, BY_ID[id].label + (given(P, id) ? " is still pending" : " has not been done"), ["Nothing to show yet."], { tone: "info", spoken: `${BY_ID[id].label} ${given(P, id) ? "is still pending" : "has not been done yet"}.`, actions: given(P, id) ? [] : [{ label: "Do it now", order: id }] })); });
      else if (/\b(?:ultrasound|usg|echo|ecg|xray|ct|mri|scan|imaging|film|images?)\b/.test(c)) { const all = results(P).filter((r) => r.cat === "img"); take(all.length ? resultCard(all[all.length - 1]) : card("img", "No imaging back yet", ["Nothing has been reported."], { tone: "info", spoken: "No imaging is back yet." })); }
    }
    // "did we give meropenem", "has he had a CT"
    if (!vitHit && !hit && /\b(?:did we|have we|has he|has she|was|were|is he getting|is she getting|is he on|is she on|are we giving|are we on)\b/.test(c)) {
      const p2 = parseOrders(c); const gi = [...new Set(p2.orders.map((o) => o.id).filter((id) => BY_ID[id]))]; if (gi.length) take(givenCard(P, gi));
    }
  }
  if (!hit) { const post = CB.post(helpers(), c, P, ctx); if (post && post.length) post.forEach((x) => take(x)); }
  if (hit) t = "";
  return { cards, rest: t, hit };
}

/* ---------------------------------------------------------------- 6. the whole line */
export function understand(text, ctx) {
  ctx = ctx || {}; const P = ctx.P || null, raw = String(text || "").trim();
  const out = { text: raw, orders: [], answers: [], unknown: [], negated: [], clarify: [], suggest: [], heard: "" };
  if (!raw) return out;
  const fixed = repair(raw); out.heard = fixed;
  const clauses = splitClauses(fixed), rest = []; let noted = false;
  for (const c of clauses) {
    if (!P) { rest.push(c); continue; }
    const r = readClause(c, ctx); if (r.noted) noted = true; r.cards.forEach((x) => { if (!out.answers.some((a) => a.id === x.id)) out.answers.push(x); });
    if (!r.hit) rest.push(c);
  }
  const parsed = parseOrders(rest.join(" | ").replace(/\b(?:repeat|redo|re do|recheck|re check|again|once more|another|fresh|new)\b/g, " "));
  const known = CB.knownWords(helpers(), fixed);
  out.orders = parsed.orders.filter((o) => o.id !== "shock" || CB.DEFIB.test(rest.join(" ") || fixed)); out.unknown = parsed.unknown.filter((w) => !known.has(String(w).toLowerCase())); out.negated = parsed.negated; out.clarify = parsed.clarify;
  // "show me the ultrasound again": a redo word turns a review into an order
  if (!out.orders.length && !out.answers.length && noted) out.answers.push(card("noted", "Noted", [raw], { tone: "info", spoken: "" }));
  else if (!out.orders.length && !out.answers.length) out.suggest = suggestFor(fixed);
  return out;
}

/* never a dead end: the nearest orders and the nearest questions */
const ASK_SAMPLES = [
  ["What is the blood pressure?", "bp blood pressure systolic diastolic map pressure hypotension"], ["What is the heart rate?", "heart rate pulse tachycardia bradycardia hr"], ["What is the respiratory rate?", "respiratory rate breathing rr tachypnoea"],
  ["What is the oxygen saturation?", "oxygen saturation spo2 sats hypoxia desaturation"], ["What is the temperature?", "temperature fever febrile temp"], ["What is the urine output?", "urine output uo oliguria passing urine"],
  ["How is the patient now?", "status update vitals how is patient condition"], ["What is pending?", "pending awaited results waiting ready"], ["What is the lactate?", "lactate lactic"], ["Is he improving?", "improving worse better trend stable"],
];
function suggestFor(t) {
  const words = new Set(t.split(/[\s|]+/).filter((w) => w.length > 2)), sug = [];
  for (const [label, kw] of ASK_SAMPLES) { const k = kw.split(" "); const score = k.filter((w) => words.has(w) || [...words].some((x) => x.length > 3 && (w.startsWith(x.slice(0, 4)) || x.startsWith(w.slice(0, 4))))).length; if (score) sug.push({ kind: "ask", label, score }); }
  const scored = CATALOGUE.map((o) => { const toks = new Set([o.label, ...(o.say || [])].join(" ").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)); let s = 0; words.forEach((w) => { if (toks.has(w)) s += 2; else for (const x of toks) if (x.length > 3 && w.length > 3 && (x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4)))) { s += 1; break; } }); return { kind: "order", id: o.id, label: o.label, score: s }; }).filter((x) => x.score > 0);
  return sug.concat(scored).sort((a, b) => b.score - a.score).slice(0, 4);
}
