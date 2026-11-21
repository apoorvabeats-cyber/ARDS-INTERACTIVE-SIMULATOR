/* The seven scientific sections of the Medical Nexus desk. Each section has five sub-sections; each sub-section is built as a small piece of HTML
   from the one patient state that the Team room owns. Nothing here is invented about the patient: a value that was never measured is shown as
   "not measured", and every score says which of its parts are missing. Scores and the "illustrative" images are teaching aids, not results.
   buildSection(id, i, ctx) -> html     paintImage(canvas, kind, reportText)     hotspotAt(kind, x, y, w, h, report) -> {n, text}     paintEcg(canvas, hr, rhythm, alive) */

export const SECTIONS = [
  { id: "history", n: "01", title: "History", tile: "HISTORY", subs: ["Presentation", "Events so far"] },
  { id: "diagnosis", n: "02", title: "Diagnosis", tile: "DIAGNOSIS", subs: ["Working diagnosis and differential", "Sepsis assessment", "SOFA and APACHE II"] },
  { id: "vitals", n: "03", title: "Vitals", tile: "VITALS", subs: ["ECG and heart rate", "BP, MAP and SpO₂", "Respiratory rate and temperature", "Invasive haemodynamic parameters", "Live trends and alarms"] },
  { id: "organ", n: "04", title: "Organ systems", tile: "ORGAN SYSTEMS", subs: ["Brain and neurological status", "Heart and circulation", "Lungs and gas exchange", "Kidneys and urine output", "Liver and gastrointestinal system"] },
  { id: "cultures", n: "05", title: "Cultures", tile: "CULTURES", subs: ["Blood cultures and markers", "Before the first antibiotic"] },
  { id: "invest", n: "06", title: "Investigations", tile: "INVESTIGATIONS", subs: ["Blood gas and electrolytes", "CBC, renal and liver", "Coagulation and cardiac", "Serial trends", "X-ray", "CT and MRI", "Echocardiography"] },
  { id: "issues", n: "07", title: "Current issues", tile: "CURRENT ISSUES", subs: ["Problems and team", "Clinical alerts", "Lines and devices", "Fluid balance"] },
  { id: "treat", n: "08", title: "Treatment", tile: "TREATMENT", subs: ["IV fluids", "Vasopressors", "Antibiotics", "Antifungals", "Oxygen support", "Ventilator: non-invasive", "Ventilator: invasive", "Dialysis support"], groups: { 0: "Treatment", 4: "Management" } },
];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const r1 = (x) => Math.round(x * 10) / 10;
/* kv: [label, value, flag("ok"|"w"|"x"|""), small text] */
const kv = (rows) => `<div class="kv">${rows.map(([l, v, f, sm]) => `<div class="${f || ""}"><span>${esc(l)}</span><b>${esc(v)}</b>${sm ? `<small>${esc(sm)}</small>` : ""}</div>`).join("")}</div>`;
const nt = (t) => `<p class="nt">${esc(t)}</p>`;
const h4 = (t) => `<h4>${esc(t)}</h4>`;
const ul = (items) => `<ul class="ls">${items.map((i) => `<li class="${i[1] || ""}">${esc(i[0])}</li>`).join("")}</ul>`;
const NM = "not measured";
const flag = (bad, warn) => (bad ? "x" : warn ? "w" : "ok");

/* ------------------------------------------------------------ what the team has sent and been told */
export function labsOf(c) {
  const out = { sent: false }, rs = (c.P && c.P.results) || [], map = { lactate: "lactate", cr: "cr", k: "k", hb: "hb", ph: "ph", pco2: "pco2", po2: "po2", hco3: "hco3", na: "na", wbc: "wbc", plt: "plt", urea: "urea", glu: "glu" };
  rs.filter((r) => r.cat === "lab" && r.items && r.items.length).forEach((r) => { out.sent = true; r.items.forEach((i) => { if (map[i.k]) out[map[i.k]] = i.v; }); out.text = r.text; });
  return out;
}
const latest = (c, id) => { const L = ((c.P && c.P.results) || []).filter((r) => r.id === id); return L.length ? L[L.length - 1] : null; };
const sev = (i) => (!i.abn ? "ok" : i.dir === "high" ? ((i.v - i.hi) / Math.max(1e-9, i.hi) > 0.5 ? "x" : "w") : ((i.lo - i.v) / Math.max(1e-9, i.lo) > 0.25 ? "x" : "w"));
const itemRows = (r) => r.items.map((i) => [i.label, i.text + (i.unit ? " " + i.unit : ""), sev(i), i.abn ? "normal " + i.lo + " to " + i.hi : ""]);
const pendingOf = (c, ids) => ((c.P && c.P.pending) || []).filter((p) => ids.includes(p.id));
const sayIt = (what) => nt("Not asked for yet. Hold the microphone and say " + what + ".");
function panels(c, ids, none) {
  const got = ids.map((id) => latest(c, id)).filter(Boolean), pend = pendingOf(c, ids);
  const out = got.map((r) => h4(r.label + (r.abnormal ? " · abnormal" : " · normal")) + kv(itemRows(r))).join("");
  return (out || "") + (pend.length ? nt("Waiting for: " + pend.map((p) => p.label).join(", ") + ".") : "") + (!got.length && !pend.length ? sayIt(none) : "");
}
function micro(c) {
  const ids = ["lab:cultures", "lab:sputum", "lab:urineculture", "lab:viral", "lab:malaria", "lab:dengue", "lab:ua", "lab:tox", "proc:lp", "lab:pct", "lab:crp"];
  const got = ids.map((id) => latest(c, id)).filter(Boolean), pend = pendingOf(c, ids);
  const rows = got.map((r) => `<p class="story ${r.abnormal ? "ab" : ""}"><b>${esc(r.label)}:</b> ${esc(r.text)}</p>`).join("");
  return (rows || "") + (pend.length ? nt("Waiting for: " + pend.map((p) => p.label).join(", ") + ".") : "") + (!got.length && !pend.length ? sayIt("“send blood cultures”") : "") + nt("Cultures are best sent before the first antibiotic dose, but never delay an antibiotic in shock to do it.");
}
const resOf = (c, re) => ((c.P && c.P.results) || []).filter((r) => re.test(r.label));
const logHas = (c, re) => ((c.P && c.P.log) || []).some((l) => re.test(l.text || ""));
const logLast = (c, re) => { const L = ((c.P && c.P.log) || []).filter((l) => re.test(l.text || "")); return L.length ? L[L.length - 1] : null; };
const fio2Of = (P, eq) => (P.tube ? (P.spo2 < 92 ? 0.8 : 0.5) : eq.oxygen ? 0.4 : 0.21);

/* ------------------------------------------------------------ scores */
export function sofaOf(c) {
  const P = c.P, eq = c.eq, labs = labsOf(c), rows = []; let tot = 0, known = 0;
  const fio2 = fio2Of(P, eq), sf = P.spo2 / fio2, pf = Math.max(0, (sf - 64) / 0.84);
  let rs = pf >= 400 ? 0 : pf >= 300 ? 1 : pf >= 200 ? 2 : P.tube ? (pf >= 100 ? 3 : 4) : 2;
  rows.push(["Respiratory", rs, `S/F ${Math.round(sf)} gives an estimated P/F near ${Math.round(pf)}${P.tube ? "" : ". Scores 3 and 4 need ventilatory support"}`, true]); tot += rs; known++;
  const cv = P.norepi ? 3 : P.map >= 70 ? 0 : 1; rows.push(["Cardiovascular", cv, P.norepi ? "On noradrenaline (dose not charted, scored at least 3)" : `MAP ${Math.round(P.map)}`, true]); tot += cv; known++;
  const g = Math.round(P.gcs), cn = g >= 15 ? 0 : g >= 13 ? 1 : g >= 10 ? 2 : g >= 6 ? 3 : 4; rows.push(["Central nervous", cn, `GCS ${g}`, true]); tot += cn; known++;
  if (labs.cr != null) { const cr = labs.cr, rn = cr < 1.2 ? 0 : cr < 2 ? 1 : cr < 3.5 ? 2 : cr < 5 ? 3 : 4; rows.push(["Renal", rn, `Creatinine ${cr} mg/dL`, true]); tot += rn; known++; } else rows.push(["Renal", "?", "Send labs for the creatinine", false]);
  rows.push(["Liver", "?", "Bilirubin " + NM, false]); rows.push(["Coagulation", "?", "Platelets " + NM, false]);
  return { rows, tot, known };
}
export function apacheOf(c) {
  const P = c.P, SC = c.SC, labs = labsOf(c), rows = []; let tot = 0, known = 0;
  const band = (v, tb) => { for (const [lim, pts] of tb) if (v >= lim) return pts; return 0; };
  const add = (name, val, pts, ok = true) => { rows.push([name, val, ok ? pts : "?"]); if (ok) { tot += pts; known++; } };
  const t = P.temp; add("Temperature", r1(t) + " °C", t >= 41 ? 4 : t >= 39 ? 3 : t >= 38.5 ? 1 : t >= 36 ? 0 : t >= 34 ? 1 : t >= 32 ? 2 : t >= 30 ? 3 : 4);
  const m = P.map; add("Mean arterial pressure", Math.round(m), m >= 160 ? 4 : m >= 130 ? 3 : m >= 110 ? 2 : m >= 70 ? 0 : m >= 50 ? 2 : 4);
  const h = P.hr; add("Heart rate", Math.round(h), h >= 180 ? 4 : h >= 140 ? 3 : h >= 110 ? 2 : h >= 70 ? 0 : h >= 55 ? 2 : h >= 40 ? 3 : 4);
  const rr = P.rr; add("Respiratory rate", Math.round(rr), rr >= 50 ? 4 : rr >= 35 ? 3 : rr >= 25 ? 1 : rr >= 12 ? 0 : rr >= 10 ? 1 : rr >= 6 ? 2 : 4);
  add("Glasgow Coma Scale", Math.round(P.gcs), 15 - Math.round(P.gcs));
  if (labs.k != null) { const k = labs.k; add("Potassium", k, k >= 7 ? 4 : k >= 6 ? 3 : k >= 5.5 ? 1 : k >= 3.5 ? 0 : k >= 3 ? 1 : k >= 2.5 ? 2 : 4); } else add("Potassium", NM, 0, false);
  if (labs.cr != null) { const cr = labs.cr; add("Creatinine", cr, cr >= 3.5 ? 4 : cr >= 2 ? 3 : cr >= 1.5 ? 2 : cr >= 0.6 ? 0 : 2); } else add("Creatinine", NM, 0, false);
  ["Oxygenation (needs a blood gas)", "Sodium", "Bicarbonate or pH", "Haematocrit", "White cell count"].forEach((n) => add(n, NM, 0, false));
  const age = SC ? +SC.age : 0; const ap = age >= 75 ? 6 : age >= 65 ? 5 : age >= 55 ? 3 : age >= 45 ? 2 : 0; rows.push(["Age", age, ap]); tot += ap; rows.push(["Chronic health", "not charted", "?"]);
  return { rows, tot, known };
}
export function qsofaOf(P) { const f = []; if (P.rr >= 22) f.push("RR 22 or more"); if (P.sbp <= 100) f.push("Systolic 100 or less"); if (P.gcs < 15) f.push("Altered mentation"); return f; }

/* ------------------------------------------------------------ order buttons taken from the real order list */
function orderBtns(c, kinds, none) {
  const o = c.orders; if (!o) return nt("Treatment opens when the shift is live.");
  const all = [].concat((o.groups || []).flatMap((g) => g.items || []), o.wrong || [], o.acls || []), seen = new Set(), out = [];
  all.forEach((i) => { if (kinds.includes(i.kind) && !seen.has(i.kind)) { seen.add(i.kind); out.push(i); } });
  if (!out.length) return nt(none || "No order here is available to your seat.");
  return `<div class="acts">${out.map((i) => `<button type="button" class="bt${i.ok && !c.busy ? "" : " off"}" data-act="order" data-kind="${esc(i.kind)}" data-spec="${esc(i.specialty || "")}" ${i.ok && !c.busy ? "" : "disabled"}>${esc(i.label)}${i.ok ? "" : "<small>not your call</small>"}</button>`).join("")}</div>`;
}
const imgBlock = (k, report, cap) => `<canvas class="ximg" data-k="${k}" data-r="${esc(report || "")}" width="480" height="400"></canvas><p class="cap">${esc(cap)}</p><div class="hot" data-hot="${k}">Tap a numbered spot on the image to read what it teaches.</div>`;

/* ------------------------------------------------------------ the builders */
const B = {};
B.overview = [
  (c) => { const { P, SC } = c, ex = ((P.results || []).filter((r) => r.cat === "exam").pop()); return (ex ? h4("Examination") + `<p class="story">${esc(ex.text)}</p>` : "") + h4(SC.name + ", " + SC.age) + kv([["Sex", SC.sex === "woman" ? "Woman" : "Man", ""], ["Hour of the shift", P.hour, ""], ["Working diagnosis", SC.dx, "w"]]) + `<p class="story">${esc(SC.story)}</p>`; },
  (c) => { const P = c.P; return kv([["Heart rate", Math.round(P.hr) + " /min", flag(P.hr > 130 || P.hr < 45, P.hr > 110), P.rhythm || "sinus"], ["Blood pressure", Math.round(P.sbp) + "/" + Math.round(P.dbp), flag(P.map < 60, P.map < 70), "MAP " + Math.round(P.map)], ["SpO₂", Math.round(P.spo2) + " %", flag(P.spo2 < 88, P.spo2 < 93)], ["Respiratory rate", Math.round(P.rr) + " /min", flag(P.rr > 30, P.rr > 24)], ["GCS", Math.round(P.gcs), flag(P.gcs <= 8, P.gcs < 13)], ["Temperature", r1(P.temp) + " °C", flag(P.temp > 39, P.temp > 38.3)]]); },
  (c) => { const P = c.P, pr = (P.problems || []).filter((q) => q.open), mem = (c.room && c.room.members) || []; return h4("Open problems") + (pr.length ? ul(pr.map((q) => [q.title + " · " + (q.resolved ? "treated" : q.called ? "specialist called" : "not called yet"), q.resolved ? "ok" : q.called ? "w" : "x"])) : nt("No open problem.")) + h4("The team") + (mem.length ? ul(mem.map((m) => [m.name + " · " + (m.specialty || "no seat"), ""])) : nt("No one has joined yet.")); },
  (c) => { const P = c.P, eq = c.eq; const L = (n, on, t) => [n + " · " + (on ? t || "in place" : "not in place"), on ? "ok" : ""]; return ul([L("Endotracheal tube and ventilator", P.tube), L("Oxygen", P.oxygen && !P.tube, "on"), L("Arterial line", P.artLine), L("Noradrenaline pump", P.norepi, "running"), L("Crystalloid", eq.fluid > 0, eq.fluid + " bolus(es) given"), L("Antibiotic", eq.abx, "given"), L("Blood", eq.blood, "given"), L("Dialysis line", P.hdLine), L("Dialysis", P.dialysis, "running")]); },
  (c) => { const L = ((c.P && c.P.log) || []).slice(-10).reverse(); return L.length ? ul(L.map((l) => [l.text, ""])) : nt("Nothing has happened yet."); },
];
B.vitals = [
  (c) => `<canvas class="ecg" data-hr="${Math.round(c.P.hr)}" data-r="${esc(c.P.rhythm || "sinus")}" data-a="${c.P.alive === false ? 0 : 1}" width="480" height="150"></canvas>` + kv([["Rhythm", c.P.alive === false ? "no circulation" : (c.P.rhythm || "sinus"), c.P.alive === false ? "x" : ""], ["Heart rate", Math.round(c.P.hr) + " /min", flag(c.P.hr > 130 || c.P.hr < 45, c.P.hr > 110)]]) + nt("A 12-lead tracing is not part of this shift. The strip shows the monitor lead."),
  (c) => { const P = c.P, pp = Math.round(P.sbp - P.dbp), si = P.hr / Math.max(1, P.sbp); return kv([["Blood pressure", Math.round(P.sbp) + "/" + Math.round(P.dbp), flag(P.map < 60, P.map < 70)], ["MAP", Math.round(P.map), flag(P.map < 60, P.map < 65), "target 65 or more"], ["Pulse pressure", pp, pp < 25 ? "w" : ""], ["Shock index", String(r1(si)), flag(si > 1, si > 0.9), "HR ÷ systolic"], ["SpO₂", Math.round(P.spo2) + " %", flag(P.spo2 < 88, P.spo2 < 93)]]); },
  (c) => { const P = c.P, fio2 = fio2Of(P, c.eq), sf = P.spo2 / fio2; return kv([["Respiratory rate", Math.round(P.rr) + " /min", flag(P.rr > 30, P.rr > 24)], ["Temperature", r1(P.temp) + " °C", flag(P.temp > 39, P.temp > 38.3)], ["Oxygen support", P.tube ? "ventilator" : c.eq.oxygen ? "oxygen" : "room air", ""], ["S/F ratio (estimate)", Math.round(sf), flag(sf < 150, sf < 235), "stand-in for P/F"]]); },
  (c) => { const P = c.P, l = labsOf(c), echo = !!latest(c, "img:echo"), poor = /akinesis|hypokinetic|ejection fraction (20|25|30)|poor|severely reduced/i.test((latest(c, "img:echo") || {}).text || ""), si = P.hr / Math.max(1, P.sbp), fb = c.eq.fluid;
    const f = [["MAP under 65", P.map < 65], ["Shock index above 0.9", si > 0.9], ["Lactate above 2", l.lactate != null && l.lactate > 2], ["Lungs still dry (SpO₂ 94 or more)", P.spo2 >= 94], ["Less than 30 mL/kg given so far", fb < 4]], a = [["Oxygenation worsened after fluid", fb > 0 && P.spo2 < 92], ["Poor left ventricle", poor], ["Already 4 or more boluses", fb >= 4]];
    const score = f.filter((x) => x[1]).length - a.filter((x) => x[1]).length * 1.5, verdict = score >= 3 ? "Likely fluid responsive" : score >= 1 ? "Uncertain: test it" : "Unlikely to respond. Think vasopressor or look at the heart.";
    return kv([["Arterial line", P.artLine ? "in place" : "not placed", P.artLine ? "ok" : "w"], ["Central venous pressure", NM, ""], ["Cardiac output", NM, ""], ["Noradrenaline", P.norepi ? "running" : "off", P.norepi ? "ok" : ""]]) + (P.artLine ? "" : orderBtns(c, ["art-line"])) + h4("Fluid responsiveness") + ul(f.map((x) => [x[0], x[1] ? "ok" : ""])) + ul(a.map((x) => [x[0], x[1] ? "x" : ""])) + `<p class="story"><b>${esc(verdict)}</b></p>` + nt("Teaching heuristic. The real test is a passive leg raise with a cardiac output response, or pulse-pressure variation on a ventilated patient. " + (echo ? "An echo has been done." : "No echo has been done.")) + orderBtns(c, ["fluid", "echo", "norepi"]); },
  (c) => { const H = c.hist || [], A = alertsOf(c), pt = (k) => H.map((x) => ({ h: x.hour, v: Math.round(x[k] * 10) / 10 })); return (H.length ? spark(pt("hr"), "Heart rate", "/min", 60, 100) + spark(pt("map"), "MAP", "mmHg", 65, 100) + spark(pt("spo2"), "SpO₂", "%", 94, 100) + spark(pt("temp"), "Temperature", "°C", 36.5, 37.5) : nt("Trends build up hour by hour.")) + h4("Alarms now") + (A.length ? ul(A) : nt("No alarm is active.")); },
];
B.organ = [
  (c) => { const P = c.P, g = Math.round(P.gcs), ct = resOf(c, /CT head/)[0]; return kv([["GCS", g, flag(g <= 8, g < 13)], ["Pupils", NM, ""], ["Sedation", NM, ""]]) + (g <= 8 ? ul([["GCS 8 or less: protect the airway", "x"]]) : "") + (ct ? h4("CT head") + `<p class="story">${esc(ct.text)}</p>` : nt("No head CT yet.")) + orderBtns(c, ["ct-head", "mannitol", "saline3", "intubate"]); },
  (c) => { const P = c.P, l = labsOf(c); return kv([["Rhythm", P.rhythm || "sinus", ""], ["Heart rate", Math.round(P.hr) + " /min", flag(P.hr > 130 || P.hr < 45, P.hr > 110)], ["MAP", Math.round(P.map), flag(P.map < 60, P.map < 65)], ["Lactate", l.lactate != null ? l.lactate + " mmol/L" : NM, l.lactate != null ? flag(l.lactate > 4, l.lactate > 2) : ""], ["Noradrenaline", P.norepi ? "running" : "off", P.norepi ? "ok" : ""], ["Crystalloid given", (c.eq.fluidMl || 0) + " mL", ""]]) + orderBtns(c, ["echo", "norepi", "fluid", "calcium", "adrenaline"]); },
  (c) => { const P = c.P, fio2 = fio2Of(P, c.eq), sf = P.spo2 / fio2, pf = Math.max(0, (sf - 64) / 0.84), ok = [["SpO₂ 92 % or more", P.spo2 >= 92], ["Respiratory rate under 30", P.rr < 30], ["Off vasopressor", !P.norepi], ["GCS 13 or more", P.gcs >= 13], ["MAP 65 or more", P.map >= 65]], n = ok.filter((x) => x[1]).length, R = resOf(c, /Chest film|CT chest/);
    return kv([["SpO₂", Math.round(P.spo2) + " %", flag(P.spo2 < 88, P.spo2 < 93)], ["Respiratory rate", Math.round(P.rr) + " /min", flag(P.rr > 30, P.rr > 24)], ["FiO₂ (estimated)", Math.round(fio2 * 100) + " %", "", P.tube ? "on the ventilator" : c.eq.oxygen ? "oxygen" : "room air"], ["S/F ratio", Math.round(sf), flag(sf < 150, sf < 235), "estimated P/F near " + Math.round(pf)]]) + h4(P.tube ? "Ventilator" : "Airway") + (P.tube ? kv([["Mode", "Volume control (IMV)", ""], ["Tidal volume", "420 mL", ""], ["PEEP", "8 cmH₂O", ""], ["FiO₂", (P.spo2 < 92 ? 80 : 50) + " %", ""]]) : nt("Not ventilated.")) + orderBtns(c, ["oxygen", "intubate", "bronchoscopy"]) + (P.tube ? h4("Breathing trial check") + ul(ok.map((x) => [x[0], x[1] ? "ok" : "x"])) + nt(n === 5 ? "All five criteria are met. A spontaneous breathing trial can be considered." : "Not ready: " + (5 - n) + " criteria are not met.") : "") + (R.length ? h4("Chest imaging") + R.map((r) => `<p class="story"><b>${esc(r.label)}:</b> ${esc(r.text)}</p>`).join("") : "") + `<div class="acts"><button type="button" class="bt" data-act="goto" data-sec="invest" data-sub="4">Open radiology</button></div>`; },
  (c) => { const P = c.P, l = labsOf(c); return kv([["Creatinine", l.cr != null ? l.cr + " mg/dL" : NM, l.cr != null ? flag(l.cr >= 3.5, l.cr >= 1.5) : "", l.cr != null ? "" : "send labs"], ["Potassium", l.k != null ? l.k + " mmol/L" : NM, l.k != null ? flag(l.k > 5.5 || l.k < 3, l.k > 5.1 || l.k < 3.5) : ""], ["Urine output", P.uo != null ? P.uo + " mL/h" : NM, P.uo != null ? flag(P.uo < 10, P.uo < 35) : "", P.uo != null ? "about " + Math.round(P.uo / 70 * 100) / 100 + " mL/kg/h" : ""], ["Dialysis line", P.hdLine ? "in place" : "not placed", P.hdLine ? "ok" : ""], ["Dialysis", P.dialysis ? "running" : "off", P.dialysis ? "ok" : ""]]) + (l.sent ? "" : orderBtns(c, ["labs"])) + orderBtns(c, ["calcium", "insulin-dex", "hd-line", "dialysis"]); },
  (c) => { const l = labsOf(c), gut = c.blind ? [] : ((c.P.problems || []).filter((q) => q.open && /gastro|surgeon/.test(q.specialty || ""))); return kv([["Bilirubin, ALT, AST", NM, ""], ["Haemoglobin", l.hb != null ? l.hb + " g/dL" : NM, l.hb != null ? flag(l.hb < 7, l.hb < 10) : ""], ["Bowel sounds, abdomen", NM, ""]]) + (gut.length ? h4("Open problems here") + ul(gut.map((q) => [q.title + " · " + (q.resolved ? "treated" : q.called ? "specialist called" : "not called yet"), q.resolved ? "ok" : q.called ? "w" : "x"])) : nt("No open gut problem.")) + orderBtns(c, ["ppi", "endoscopy", "blood"]); },
];
B.lab = [
  (c) => panels(c, ["lab:abg", "lab:lactate", "lab:lyte", "lab:glucose", "lab:ketones"], "“ABG”, “lactate” or “electrolytes”"),
  (c) => panels(c, ["lab:cbc", "lab:kft", "lab:lft", "lab:ck", "lab:amylase", "lab:nh3"], "“CBC, KFT, LFT”"),
  (c) => panels(c, ["lab:coag", "lab:trop", "lab:bnp", "lab:ddimer"], "“coagulation profile” or “troponin”"),
  (c) => micro(c),
  (c) => {
    const s = c.labSeries || []; if (!s.length) return nt("No serial results yet. Each blood sent adds a point to these trends.") + orderBtns(c, ["labs"]);
    const pt = (k) => s.filter((x) => x[k] != null).map((x) => ({ h: x.hour, v: x[k] }));
    return spark(pt("lactate"), "Lactate", "mmol/L", 0, 4) + spark(pt("cr"), "Creatinine", "mg/dL", 0.6, 1.4) + spark(pt("k"), "Potassium", "mmol/L", 3.5, 5.1) + spark(pt("hb"), "Haemoglobin", "g/dL", 12, 16) + orderBtns(c, ["labs"]);
  },
];
B.orders = [
  (c) => orderBtns(c, ["calcium", "insulin-dex", "ppi", "adrenaline", "mannitol", "saline3", "norepi"]) + nt("Each order goes to the Team room and takes effect for the whole team."),
  (c) => { const P = c.P, e = c.eq, rows = []; if (P.norepi) rows.push(["Noradrenaline", "Running"]); if (e.fluid > 0) rows.push(["Crystalloid", e.fluidMl ? (e.fluidMl >= 1000 && e.fluidMl % 100 === 0 ? e.fluidMl / 1000 + " L" : e.fluidMl + " mL") : "volume not stated"]); if (e.abx) rows.push(["Antibiotic", "Given"]); if (e.blood) rows.push(["Blood", "Given"]); if (P.dialysis) rows.push(["Dialysis", "Running"]); return (rows.length ? `<div class="pump">${rows.map((r) => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("")}</div>` : nt("Nothing is running.")) + orderBtns(c, ["norepi", "dialysis"]); },
  (c) => orderBtns(c, ["fluid", "blood", "saline3", "flood"]) + kv([["Crystalloid so far", (c.eq.fluidMl || 0) + " mL", ""], ["Blood", c.eq.blood ? "given" : "none", ""]]),
  (c) => kv([["Antibiotics", c.eq.abx ? "started" : "not started", c.eq.abx ? "ok" : "w"]]) + orderBtns(c, ["antibiotics", "cultures", "source"]),
  (c) => orderBtns(c, ["art-line", "intubate", "bronchoscopy", "hd-line", "dialysis", "endoscopy", "oxygen", "enter"]),
];
B.rad = [
  (c) => { const r = latest(c, "img:cxr") || latest(c, "img:xabd"); return r ? h4(r.label + (r.abnormal ? " · abnormal" : " · normal")) + imgBlock("cxr", r.text, "Illustrative film, drawn from the report. It is not the patient's real image.") + `<p class="story"><b>Report:</b> ${esc(r.text)}</p>` : (pendingOf(c, ["img:cxr", "img:xabd"]).length ? nt("The film is being reported.") : sayIt("“chest x-ray”")); },
  (c) => { const out = []; for (const [id, k] of [["img:ctchest", "ctchest"], ["img:ctpa", "ctchest"], ["img:cthead", "cthead"], ["img:ctabd", ""], ["img:ctangio", ""], ["img:mri", ""]]) { const r = latest(c, id); if (r) out.push(h4(r.label + (r.abnormal ? " · abnormal" : " · normal")) + (k ? imgBlock(k, r.text, "Illustrative slice, drawn from the report") : "") + `<p class="story"><b>Report:</b> ${esc(r.text)}</p>`); } const pend = pendingOf(c, ["img:ctchest", "img:ctpa", "img:cthead", "img:ctabd", "img:ctangio", "img:mri"]); return out.join("") + (pend.length ? nt("Being reported: " + pend.map((p) => p.label).join(", ") + ".") : "") + (!out.length && !pend.length ? sayIt("“CT head”, “CT chest” or “CT abdomen”") : ""); },
  (c) => { const r = latest(c, "img:usg"); return r ? h4(r.label + (r.abnormal ? " · abnormal" : " · normal")) + `<p class="story">${esc(r.text)}</p>` : (pendingOf(c, ["img:usg"]).length ? nt("The scan is being done.") : sayIt("“bedside ultrasound”")); },
  (c) => { const e = latest(c, "img:echo"); return e ? h4("Echocardiogram" + (e.abnormal ? " · abnormal" : " · normal")) + imgBlock("echo", e.text, "Illustrative four-chamber view") + `<p class="story"><b>Echo:</b> ${esc(e.text)}</p>` : (pendingOf(c, ["img:echo"]).length ? nt("The echo is being done.") : sayIt("“echo”")); },
  (c) => { const r = latest(c, "img:cxr"); return nt("Tap the numbered spots to learn the zones of a chest film. The spot that matches the report is marked.") + imgBlock("cxr", r ? r.text : "", r ? "Illustrative chest film" : "Illustrative normal chest film for practice"); },
];
B.intel = [
  (c) => { const s = sofaOf(c), a = apacheOf(c); return h4("SOFA, partly scored") + `<table class="tb">${s.rows.map((r) => `<tr class="${r[3] ? "" : "mis"}"><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td></tr>`).join("")}</table><p class="story"><b>${s.tot}</b> from ${s.known} of 6 organ systems. The total is a minimum, not the final score.</p>` + h4("APACHE II, partly scored") + `<table class="tb">${a.rows.map((r) => `<tr class="${r[2] === "?" ? "mis" : ""}"><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td><b>${esc(r[2])}</b></td></tr>`).join("")}</table><p class="story"><b>${a.tot}</b> from the parts that could be scored. The total is a minimum.</p>` + nt("Scores built only from what has been measured in this shift. They teach the method. They do not predict this patient's outcome."); },
  (c) => { const P = c.P, q = qsofaOf(P), l = labsOf(c), sirs = [P.temp > 38 || P.temp < 36, P.hr > 90, P.rr > 20].filter(Boolean).length, shock = P.norepi && l.lactate != null && l.lactate > 2; const bundle = [["Lactate measured", l.sent], ["Cultures before antibiotics", logHas(c, /cultures before the antibiotics/)], ["Antibiotics given", c.eq.abx], ["Fluid given (30 mL/kg is the usual aim)", c.eq.fluid >= 1], ["Vasopressor if MAP stays under 65", P.map >= 65 || P.norepi]]; return kv([["qSOFA", q.length + " of 3", q.length >= 2 ? "x" : q.length ? "w" : "ok", q.join(", ")], ["SIRS (without white cells)", sirs + " of 3", sirs >= 2 ? "w" : "ok"], ["Septic shock criteria", shock ? "met" : l.sent ? "not met" : "lactate unknown", shock ? "x" : ""]]) + h4("First-hour bundle") + ul(bundle.map((b) => [b[0], b[1] ? "ok" : "x"])); },
  (c) => { const e = c.eq, inn = e.fluidMl || 0; return kv([["Crystalloid in", inn + " mL", ""], ["Blood in", e.blood ? "given" : "none", ""], ["Urine out", c.P && c.P.uo != null ? c.P.uo + " mL/h" : NM, c.P && c.P.uo != null ? flag(c.P.uo < 10, c.P.uo < 35) : ""], ["Balance", "cannot be totalled", ""]]) + nt(inn >= 2000 ? "Two litres or more has gone in. Look at the lungs and the SpO₂ before giving more." : "Input is modest so far.") + nt("A real balance chart needs hourly urine and other losses. They are not part of this simulation."); },
  (c) => { const A = alertsOf(c); return A.length ? ul(A.map((a) => [a[0], a[1]])) : nt("No alert is active."); },
  (c) => {
    const dx = ((c.SC && c.SC.dx) || "").toLowerCase(), t = [["pneumon|chest|lung|hypox", ["Pneumonia", "Pulmonary oedema", "Pulmonary embolism", "Aspiration", "ARDS from another cause"]], ["sepsis|septic", ["Sepsis from a chest, urinary or abdominal source", "Adrenal insufficiency", "Cardiogenic shock", "Anaphylaxis", "Toxic shock"]], ["kalaem|kidney|renal|dialys", ["Hyperkalaemia from kidney injury", "Rhabdomyolysis", "Metabolic acidosis", "Drug effect", "Obstruction of the urinary tract"]], ["bleed|gi |varic|ulcer", ["Upper gastrointestinal bleed", "Variceal bleed", "Peptic ulcer", "Coagulopathy", "Mallory-Weiss tear"]], ["head|brain|neuro|intracran|trauma", ["Traumatic brain injury", "Intracranial haematoma", "Diffuse axonal injury", "Seizure", "Metabolic encephalopathy"]], ["cardiogenic|infarct|heart", ["Cardiogenic shock", "Acute myocardial infarction", "Acute pulmonary oedema", "Pulmonary embolism", "Myocarditis"]]], hit = t.find((r) => new RegExp(r[0]).test(dx)), list = c.blind ? ["Airway, breathing and oxygenation", "Circulation and perfusion", "Brain and consciousness", "Kidney, fluid and electrolytes", "Infection and its source", "Abdomen, bleeding and metabolism"] : hit ? hit[1] : ["Sepsis", "Hypovolaemia", "Cardiogenic cause", "Respiratory failure", "Metabolic cause"];
    const H = c.hist || [], f = H[0], l = H[H.length - 1], arrow = (a, b, up, nm, u) => { if (a == null || b == null) return null; const d = r1(b - a), good = up ? d > 0 : d < 0; return [nm + " " + r1(a) + " → " + r1(b) + u, Math.abs(d) < 0.5 ? "" : good ? "ok" : "x"]; };
    const resp = f && l && H.length > 1 ? [arrow(f.map, l.map, true, "MAP", ""), arrow(f.spo2, l.spo2, true, "SpO₂", " %"), arrow(f.hr, l.hr, false, "Heart rate", ""), arrow(f.temp, l.temp, false, "Temperature", " °C")].filter(Boolean) : [];
    return (c.blind ? h4("Systems to consider") : h4("Differential for: " + (c.SC ? c.SC.dx : ""))) + ul(list.map((d, i) => [d, !c.blind && i === 0 ? "w" : ""])) + nt(c.blind ? "The diagnosis stays hidden until the team finalises. Reason from the history, the examination and the results. Each system is a prompt, not a clue." : "Teaching prompts to reason from. This is not a diagnosis.") + h4("Response since the shift began") + (resp.length ? ul(resp) : nt("Not enough hours have passed to see a trend."));
  },
];
/* ------------------------------------------------------------ the eight sections are built from the pages above, plus the treatment pages */
const tip = (title, items) => h4(title) + ul(items.map((i) => [i, ""]));
const machine = (k, c, extra) => { const P = c.P, e = c.eq || {}, fio2 = fio2Of(P, e); const st = { rr: Math.round(P.rr), vt: 420, peep: 8, fio2, ipap: 14, epap: 5, bf: 200, df: 1000, rf: 1000, uf: 100, running: k === "vent" ? !!P.tube : k === "niv" ? false : !!P.dialysis }; return `<canvas class="mach" data-k="${k}" data-st="${esc(JSON.stringify(st))}" width="520" height="380"></canvas><p class="cap">${esc(extra)}</p>`; };
const NOTE = "Teaching summary. Follow your unit's protocol and the patient's own results.";
B.history = [B.overview[0], B.overview[4]];
B.diagnosis = [B.intel[4], B.intel[1], B.intel[0]];
B.cultures = [B.lab[3], (c) => { const cu = logLast(c, /blood cultures/), ab = c.eq && c.eq.abx; return kv([["Blood cultures", cu ? "sent" : "not sent", cu ? "ok" : "w"], ["Antibiotic", ab ? "started" : "not started", ab ? "ok" : ""]]) + (ab && !cu ? ul([["The antibiotic is already in. Cultures taken now may be less likely to grow.", "w"]]) : nt("Take cultures first, but never delay an antibiotic in shock to do it. Two sets from two sites, with the bottles filled properly, give the best yield.")) + orderBtns(c, ["cultures", "source"]); }];
B.invest = [B.lab[0], B.lab[1], B.lab[2], B.lab[4], B.rad[0], B.rad[1], B.rad[3]];
B.issues = [B.overview[2], B.intel[3], B.overview[3], B.intel[2]];
B.treat = [
  (c) => kv([["Crystalloid so far", (c.eq.fluidMl || 0) + " mL", ""], ["Blood", c.eq.blood ? "given" : "none", ""], ["MAP", Math.round(c.P.map), flag(c.P.map < 60, c.P.map < 65), "target 65 or more"], ["SpO₂", Math.round(c.P.spo2) + " %", flag(c.P.spo2 < 88, c.P.spo2 < 93)]]) + orderBtns(c, ["fluid", "blood", "saline3", "flood"]) + tip("Fluids, in short", ["A balanced crystalloid is the usual first choice.", "Give a bolus of 250 to 500 mL over 15 to 30 minutes, then look again: MAP, lactate, capillary refill, lungs and IVC.", "Stop when the patient no longer responds or the oxygen falls."]) + nt(NOTE),
  (c) => kv([["Noradrenaline", c.P.norepi ? "running" : "off", c.P.norepi ? "ok" : ""], ["MAP", Math.round(c.P.map), flag(c.P.map < 60, c.P.map < 65), "target 65 or more"], ["Shock index", r1(c.P.hr / Math.max(1, c.P.sbp)), ""]]) + orderBtns(c, ["norepi", "adrenaline"]) + tip("Vasopressors, in short", ["Noradrenaline is the first choice in septic shock. A central line is best, a good peripheral line is acceptable at first.", "Add vasopressin when the noradrenaline dose is rising.", "Add dobutamine or adrenaline when the heart is the problem.", "Consider hydrocortisone when the dose keeps climbing."]) + nt(NOTE),
  (c) => kv([["Antibiotic", c.eq.abx ? "started" : "not started", c.eq.abx ? "ok" : "w"]]) + orderBtns(c, ["antibiotics", "cultures", "source"]) + tip("Antibiotics, in short", ["In shock, give the first dose within one hour.", "Send cultures first when that does not delay the dose.", "Choose by the likely source and the local resistance pattern, then narrow the drug at 48 to 72 hours.", "Control the source: drain, remove or wash out what is infected."]) + nt(NOTE),
  (c) => kv([["Antifungal", "not one of this shift's orders", ""]]) + tip("Think of an antifungal when", ["The stay is long and broad antibiotics have been used.", "There is a central line, parenteral nutrition or recent bowel surgery or leak.", "Candida grows from blood, or from several sites, and the patient is getting worse.", "The patient is immunosuppressed, or a mould is suspected."]) + tip("The usual choices", ["Echinocandin (micafungin, caspofungin, anidulafungin) for invasive candidiasis in the sick patient.", "Fluconazole when the patient is stable and the organism is sensitive.", "Liposomal amphotericin B when the others cannot be used.", "Voriconazole or isavuconazole when Aspergillus is the worry."]) + nt("Send blood cultures and beta-D-glucan, and change the lines. " + NOTE),
  (c) => { const P = c.P, e = c.eq, fio2 = fio2Of(P, e), sf = P.spo2 / fio2; return kv([["SpO₂", Math.round(P.spo2) + " %", flag(P.spo2 < 88, P.spo2 < 93)], ["Support now", P.tube ? "ventilator" : e.oxygen ? "oxygen" : "room air", ""], ["FiO₂ (estimated)", Math.round(fio2 * 100) + " %", ""], ["S/F ratio", Math.round(sf), flag(sf < 150, sf < 235)]]) + orderBtns(c, ["oxygen", "intubate"]) + tip("The oxygen ladder", ["Nasal cannula 1 to 6 L/min: FiO₂ about 24 to 44 %.", "Face mask 5 to 10 L/min: about 35 to 50 %.", "Reservoir mask 10 to 15 L/min: about 60 to 80 %.", "High-flow nasal oxygen, up to 60 L/min, FiO₂ up to 100 %, warmed and humidified.", "Then non-invasive ventilation, then intubation."]) + nt("Aim for SpO₂ 92 to 96 %. In a patient who retains carbon dioxide, aim for 88 to 92 %. " + NOTE); },
  (c) => { const P = c.P; return machine("niv", c, "Non-invasive ventilation: a tight mask, two pressures, and a patient who is awake.") + kv([["On the ventilator now", P.tube ? "invasive" : "no", P.tube ? "w" : ""], ["IPAP / EPAP (typical start)", "10 / 4 cm H₂O", ""]]) + tip("Use it when", ["Acute-on-chronic hypercapnic failure (COPD): the best evidence.", "Cardiogenic pulmonary oedema.", "A patient who is awake, can protect the airway and cooperates."]) + tip("Do not use it when", ["The airway is not protected, GCS is low, or there is vomiting or a bowel obstruction.", "There is shock, severe facial injury or untreated pneumothorax.", "There is no better after one to two hours: intubate, do not wait."]) + nt("Raise IPAP in steps of 2 for the breathing effort and the CO₂, raise EPAP for the oxygen. " + NOTE); },
  (c) => { const P = c.P; return machine("vent", c, P.tube ? "Invasive ventilation: the patient is on this ventilator now." : "Invasive ventilation: shown with typical settings. This patient is not intubated.") + kv([["Tube", P.tube ? "in place" : "not in place", P.tube ? "ok" : "w"], ["Tidal volume (start)", "6 mL/kg ideal weight", ""], ["PEEP (start)", "5 to 8 cm H₂O", ""], ["Plateau pressure", "30 cm H₂O or less", ""]]) + (P.tube ? "" : orderBtns(c, ["intubate"])) + tip("Lung-protective settings", ["Tidal volume 4 to 8 mL/kg of ideal body weight, plateau pressure under 30, driving pressure as low as you can.", "Titrate PEEP and FiO₂ to the SpO₂ target of 92 to 96 %.", "In severe ARDS: prone for 12 to 16 hours a day, and think of neuromuscular block or ECMO."]) + nt(NOTE); },
  (c) => { const P = c.P; return machine("crrt", c, P.dialysis ? "A CRRT machine: running now." : "A CRRT machine: stopped, shown with typical settings.") + machine("ihd", c, "An intermittent haemodialysis machine.") + kv([["Dialysis", P.dialysis ? "running" : "not running", P.dialysis ? "ok" : ""], ["Dialysis line", P.hdLine ? "in place" : "not in place", P.hdLine ? "ok" : "w"]]) + orderBtns(c, ["hd-line", "dialysis"]) + tip("Which one", ["CRRT (CVVH, CVVHD, CVVHDF) for the unstable patient: slow and gentle on the blood pressure.", "Intermittent haemodialysis for the stable patient.", "SLED (a long, slow session) between the two."]) + tip("Starting points", ["Effluent dose 20 to 25 mL/kg/h.", "Blood flow 150 to 250 mL/min.", "Citrate is the first choice for anticoagulation where it can be used; no anticoagulant when the patient is bleeding."]) + tip("Reasons to start", ["Potassium that is high and not coming down, severe acidosis, fluid overload that the lungs cannot take, uraemic complications, some poisonings."]) + nt(NOTE); },
];
export function alertsOf(c) {
  const P = c.P, l = labsOf(c), A = [];
  if (P.alive === false) A.push(["No circulation", "x"]);
  if (P.map < 65 && P.alive !== false) A.push(["MAP " + Math.round(P.map) + " is under 65", P.map < 55 ? "x" : "w"]);
  if (P.spo2 < 90) A.push(["SpO₂ " + Math.round(P.spo2) + " % is low", P.spo2 < 85 ? "x" : "w"]);
  if (P.gcs <= 8) A.push(["GCS " + Math.round(P.gcs) + ": protect the airway", "x"]);
  if (P.hr > 130) A.push(["Heart rate " + Math.round(P.hr), "w"]);
  if (P.rr > 30) A.push(["Respiratory rate " + Math.round(P.rr), "w"]);
  if (l.k != null && l.k > 5.5) A.push(["Potassium " + l.k + " is high", "x"]);
  if (l.lactate != null && l.lactate > 4) A.push(["Lactate " + l.lactate + " is high", "x"]);
  if (l.hb != null && l.hb < 7) A.push(["Haemoglobin " + l.hb + " is low", "x"]);
  (P.problems || []).filter((q) => q.open && !q.resolved && !q.called).forEach((q) => A.push(["Not yet called: " + q.title, "w"]));
  return A;
}

function spark(pts, label, unit, lo, hi) {
  if (!pts.length) return `<div class="sp"><span>${esc(label)}</span><small>no draws</small></div>`;
  const w = 250, hh = 64, vs = pts.map((p) => p.v), mn = Math.min(lo, ...vs), mx = Math.max(hi, ...vs), sp = mx - mn || 1, y = (v) => 6 + (hh - 12) * (1 - (v - mn) / sp), x = (i) => (pts.length === 1 ? w / 2 : 10 + i * (w - 20) / (pts.length - 1));
  const line = pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.v).toFixed(1)).join(" "), last = pts[pts.length - 1];
  return `<div class="sp"><span>${esc(label)} <i>${last.v} ${esc(unit)}</i></span><svg viewBox="0 0 ${w} ${hh}" role="img" aria-label="${esc(label)} trend"><rect x="0" y="${y(hi).toFixed(1)}" width="${w}" height="${Math.max(1, y(lo) - y(hi)).toFixed(1)}" fill="rgba(61,255,154,.1)"/><path d="${line}" fill="none" stroke="#5fe3ff" stroke-width="2.2"/>${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.4" fill="#9ff0ff"/>`).join("")}</svg></div>`;
}

export function buildSection(id, i, c) {
  const sec = SECTIONS.find((s) => s.id === id), fn = sec && B[id] && B[id][i];
  if (!c.P || !c.SC) return nt("The case appears here when the shift begins.");
  try { return fn(c); } catch (e) { return nt("This page could not be built: " + e.message); }
}

/* ------------------------------------------------------------ illustrative images, drawn from the written report */
const seeded = (s0) => { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export function paintImage(cv, kind, report) {
  const g = cv.getContext("2d"), w = cv.width, h = cv.height, rep = String(report || "").toLowerCase(), R = seeded(11);
  g.fillStyle = "#04070a"; g.fillRect(0, 0, w, h);
  const blob = (x, y, rx, ry, a, col) => { const gr = g.createRadialGradient(x, y, 2, x, y, Math.max(rx, ry)); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); g.translate(-x, -y); g.beginPath(); g.arc(x, y, Math.max(rx, ry), 0, 6.3); g.fill(); g.restore(); };
  if (kind === "cxr") {
    blob(w / 2, h * 0.52, w * 0.46, h * 0.5, 0.7, "70,78,88");
    [[0.31, 0.45], [0.69, 0.45]].forEach(([fx, fy]) => { const gr = g.createRadialGradient(w * fx, h * fy, 8, w * fx, h * fy, h * 0.36); gr.addColorStop(0, "rgba(10,13,17,.95)"); gr.addColorStop(1, "rgba(30,36,44,.5)"); g.fillStyle = gr; g.beginPath(); g.ellipse(w * fx, h * fy, w * 0.19, h * 0.31, 0, 0, 6.3); g.fill(); });
    g.strokeStyle = "rgba(205,215,225,.2)"; g.lineWidth = 3; for (let i = 0; i < 8; i++) { const y = h * (0.2 + i * 0.07); g.beginPath(); g.ellipse(w * 0.31, y + 14, w * 0.2, 16, -0.26, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.beginPath(); g.ellipse(w * 0.69, y + 14, w * 0.2, 16, 0.26, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    blob(w * 0.5, h * 0.5, 14, h * 0.4, 0.5, "190,198,206"); blob(w * 0.56, h * 0.6, w * 0.13, h * 0.14, 0.75, "190,198,206");
    g.strokeStyle = "rgba(220,228,236,.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.2, h * 0.17); g.lineTo(w * 0.47, h * 0.22); g.moveTo(w * 0.8, h * 0.17); g.lineTo(w * 0.53, h * 0.22); g.stroke();
    if (/infiltrate|consolidat|pneumon|opacit/.test(rep)) blob(w * 0.28, h * 0.66, w * 0.13, h * 0.13, 0.62, "215,222,230");
    if (/effusion/.test(rep)) blob(w * 0.2, h * 0.8, w * 0.1, h * 0.1, 0.6, "200,208,216");
    if (/oedema|edema|bat/.test(rep)) { blob(w * 0.32, h * 0.5, w * 0.12, h * 0.15, 0.4, "200,208,216"); blob(w * 0.68, h * 0.5, w * 0.12, h * 0.15, 0.4, "200,208,216"); }
    g.fillStyle = "#cfe", g.font = "700 20px system-ui"; g.fillText("R", w * 0.06, h * 0.12); g.fillText("L", w * 0.9, h * 0.12);
  } else if (kind === "ctchest") {
    g.fillStyle = "#3b4048"; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.43, h * 0.36, 0, 0, 6.3); g.fill();
    [[0.36], [0.64]].forEach(([fx]) => { g.fillStyle = "#06090c"; g.beginPath(); g.ellipse(w * fx, h * 0.47, w * 0.15, h * 0.26, 0, 0, 6.3); g.fill(); for (let i = 0; i < 26; i++) { g.fillStyle = "rgba(190,198,206,.55)"; g.beginPath(); g.arc(w * fx + (R() - 0.5) * w * 0.26, h * 0.47 + (R() - 0.5) * h * 0.44, 1.5 + R() * 2.2, 0, 6.3); g.fill(); } });
    blob(w * 0.5, h * 0.5, w * 0.1, h * 0.1, 0.95, "175,182,190"); g.fillStyle = "#c9d0d6"; g.beginPath(); g.arc(w * 0.5, h * 0.78, 17, 0, 6.3); g.fill();
    if (/consolidat|infiltrate|pneumon/.test(rep)) { blob(w * 0.31, h * 0.6, w * 0.1, h * 0.12, 0.9, "225,230,236"); g.strokeStyle = "rgba(10,13,17,.7)"; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w * 0.27, h * (0.56 + i * 0.03)); g.lineTo(w * 0.36, h * (0.6 + i * 0.02)); g.stroke(); } }
  } else if (kind === "cthead") {
    g.strokeStyle = "#e6ebef"; g.lineWidth = 14; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.3, h * 0.4, 0, 0, 6.3); g.stroke(); blob(w / 2, h / 2, w * 0.28, h * 0.38, 0.8, "120,126,134");
    g.fillStyle = "#05080b"; [[-1], [1]].forEach(([s]) => { g.beginPath(); g.ellipse(w / 2 + s * 20, h * 0.46, 11, 36, s * 0.2, 0, 6.3); g.fill(); });
    if (/swell|contusion|blood|haemorrh|hemorrh/.test(rep)) blob(w * 0.62, h * 0.36, 36, 30, 0.85, "235,240,245");
  } else if (kind === "echo") {
    g.fillStyle = "#0a0e12"; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w * 0.05, h * 0.95); g.lineTo(w * 0.95, h * 0.95); g.closePath(); g.fill();
    for (let i = 0; i < 1400; i++) { const x = w / 2 + (R() - 0.5) * w * 0.9, y = 30 + R() * (h - 50); if (Math.abs(x - w / 2) < (y - 20) * 0.62) { g.fillStyle = `rgba(160,170,180,${R() * 0.28})`; g.fillRect(x, y, 2, 2); } }
    g.strokeStyle = "rgba(230,236,242,.8)"; g.lineWidth = 4; const poor = /poor/.test(rep); g.beginPath(); g.ellipse(w * 0.42, h * 0.62, w * 0.12, h * (poor ? 0.2 : 0.17), 0.1, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(w * 0.62, h * 0.62, w * 0.1, h * 0.14, -0.1, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(w * 0.42, h * 0.38, w * 0.1, h * 0.09, 0, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(w * 0.6, h * 0.38, w * 0.09, h * 0.09, 0, 0, 6.3); g.stroke();
    g.fillStyle = "#cfe"; g.font = "600 17px system-ui"; g.fillText("LV", w * 0.39, h * 0.64); g.fillText("RV", w * 0.6, h * 0.64); g.fillText("LA", w * 0.4, h * 0.4); g.fillText("RA", w * 0.58, h * 0.4);
  }
  /* hotspots and the illustrative stamp */
  (HOT[kind] || []).forEach((p, i) => { const x = p[0] * w, y = p[1] * h, hit = p[3] && p[3].test(rep); g.fillStyle = hit ? "rgba(255,194,74,.95)" : "rgba(95,227,255,.9)"; g.beginPath(); g.arc(x, y, 14, 0, 6.3); g.fill(); g.fillStyle = "#04121a"; g.font = "700 16px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i + 1), x, y + 1); g.textAlign = "left"; g.textBaseline = "alphabetic"; });
  g.fillStyle = "rgba(255,194,74,.9)"; g.font = "700 13px system-ui"; g.fillText("ILLUSTRATIVE · NOT THE PATIENT'S REAL IMAGE", 10, h - 10);
}
const HOT = {
  cxr: [[0.3, 0.3, "Right upper zone. Look for a cavity, a mass or a raised fissure.", /upper/], [0.28, 0.66, "Right lower zone. Pneumonia is most often seen here in a bed-bound patient. A white, patchy area with air bronchograms means consolidation.", /infiltrate|consolidat|pneumon/], [0.7, 0.32, "Left upper zone. Compare it with the right side.", /xx/], [0.7, 0.66, "Left lower zone, partly hidden behind the heart.", /xx/], [0.56, 0.6, "The heart. Wider than half the chest suggests a large heart or fluid around it.", /xx/], [0.2, 0.82, "The costophrenic angle. Blunting means fluid in the pleura.", /effusion/]],
  ctchest: [[0.31, 0.6, "Dependent right lung. Consolidation shows as a white area. Dark branching lines inside it are air-filled bronchi.", /consolidat|infiltrate|pneumon/], [0.5, 0.5, "The heart and great vessels sit in the middle. A filling defect in a pulmonary artery would mean a clot.", /clot/], [0.5, 0.78, "The spine, at the back of the slice.", /xx/]],
  cthead: [[0.62, 0.36, "A bright patch is fresh blood or a contusion. Compare the two sides.", /swell|contusion|blood/], [0.5, 0.46, "The ventricles. Squeezed ventricles and lost sulci mean raised pressure.", /swell/]],
  echo: [[0.42, 0.62, "Left ventricle. Watch how much the walls thicken and move. A weak ventricle moves poorly.", /poor/], [0.6, 0.62, "Right ventricle. A large right ventricle points to a clot or lung disease.", /xx/], [0.42, 0.4, "Left atrium.", /xx/]],
};
export function hotspotAt(kind, x, y, w, h, report) {
  const hs = HOT[kind] || []; let best = -1, bd = 1e9; hs.forEach((p, i) => { const d = Math.hypot(p[0] * w - x, p[1] * h - y); if (d < bd) { bd = d; best = i; } });
  if (best < 0 || bd > Math.max(34, w * 0.09)) return null; const p = hs[best], hit = p[3] && p[3].test(String(report || "").toLowerCase());
  return { n: best + 1, text: p[2] + (hit ? " This is what the report describes." : ""), hit: !!hit };
}
export function paintEcg(cv, hr, rhythm, alive) {
  const g = cv.getContext("2d"), w = cv.width, h = cv.height; g.fillStyle = "#04121a"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(95,227,255,.12)"; g.lineWidth = 1; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const gs = (f, m, s, a) => a * Math.exp(-(((f - m) / s) ** 2)), ecg = (f) => gs(f, 0.2, 0.03, 0.13) + gs(f, 0.4, 0.018, 1) - gs(f, 0.375, 0.01, 0.15) - gs(f, 0.43, 0.012, 0.2) + gs(f, 0.65, 0.05, 0.25);
  g.strokeStyle = alive ? "#3dff9a" : "#ff5468"; g.lineWidth = 2.6; g.beginPath(); const per = 60 / Math.max(30, hr || 60), irr = /fibril/i.test(rhythm), R = seeded(3);
  for (let x = 0; x < w; x++) { let f = ((x / 150) / per) % 1; if (irr) f = (((x / 150) + Math.sin(x * 0.05) * 0.15) / per) % 1; const y = h * 0.7 - (alive ? ecg(f < 0 ? f + 1 : f) : 0) * h * 0.55 + (irr ? (R() - 0.5) * 3 : 0); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
}
