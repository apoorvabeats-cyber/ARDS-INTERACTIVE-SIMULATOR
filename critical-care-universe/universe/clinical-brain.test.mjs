import { test } from "node:test";
import assert from "node:assert/strict";
import { understand } from "./voice-brain.js";
import { terms } from "./clinical-brain.js";
import { Dp, Np } from "./case-engine.js";

const mk = (caseId, acts, ms) => { const sc = Dp(7, ["intensivist", "nephrologist", "pulmonologist"], { caseId, noRemember: true, recent: [] });
  const A = (acts || []).map(([kind, atMs]) => ({ atMs, userId: "u", name: "A", specialty: "intensivist", kind, payload: {} }));
  const P = Np(sc, A, ms); return { P, ctx: { P, hist: [{ hour: 1, map: 70, spo2: 95, hr: 90, temp: 37 }, { hour: 2, map: 66, spo2: 94, hr: 95, temp: 37 }, { hour: 3, map: 60, spo2: 92, hr: 105, temp: 37.5 }], story: { title: "Patient", text: sc.story } } }; };
const ids = (u) => u.orders.map((o) => o.id), aids = (u) => u.answers.map((a) => a.id);
const ACTS = [["examine", 500], ["lab:abg", 1000], ["lab:cbc", 1000], ["lab:kft", 1000], ["img:cxr", 1000], ["lab:cultures", 1000], ["drug:norepi", 2000], ["proc:oxygen", 2000]];

test("the glossary is all there: every term of the Critical Care Hub list", () => {
  const t = terms(); assert.equal(t.filter((x) => x.group <= 11).length, 243); assert.equal(t.filter((x) => x.group === 12).length, 14);
  for (let g = 1; g <= 11; g += 1) assert.ok(t.some((x) => x.group === g), "group " + g);
});
test("word by word: every term and every spoken form gets an answer or an order, in five different cases", () => {
  const bad = [];
  for (const cs of ["cap", "aki", "ards", "cardiogenic", "dka"]) {
    const { ctx } = mk(cs, ACTS, 150000);
    for (const t of terms()) for (const f of new Set([t.term, ...t.aliases])) { const u = understand(f, ctx); if (!(u.orders.length || u.answers.length)) bad.push(cs + ": " + f); }
  }
  assert.deepEqual(bad, []);
});
test("word by word: what does each term mean", () => {
  const { ctx } = mk("cap", ACTS, 150000), t = terms(), bad = [];
  for (const x of t) { const name = x.term.replace(/\(.*\)/, "").split("/")[0].trim(), u = understand("what does " + name + " mean", ctx), same = t.filter((y) => y.term === x.term).map((y) => y.meaning.slice(0, 25));
    if (!u.answers.some((a) => same.some((m) => (a.lines || []).join(" ").includes(m)))) bad.push(name); }
  assert.deepEqual(bad, []);
});
test("the terms say something about this patient", () => {
  const { ctx, P } = mk("cap", ACTS, 150000);
  let u = understand("is the patient hemodynamically stable", ctx); assert.ok(/stable|unstable/i.test(u.answers[0].title));
  u = understand("pulse pressure", ctx); assert.equal(u.answers[0].big, String(P.sbp - P.dbp));
  u = understand("what is the plateau pressure", ctx); assert.deepEqual(aids(u), ["lex:4:plateau pressure"]);
  u = understand("is he in cardiogenic shock", ctx); assert.deepEqual(aids(u), ["lex:3:cardiogenic shock"]); assert.equal(u.orders.length, 0);
  u = understand("respiratory failure", ctx); assert.ok(/respiratory failure|Not by the gas/.test(u.answers[0].title));
  u = understand("oliguria", ctx); assert.equal(u.answers.length, 1);
  u = understand("lactate clearance", ctx); assert.ok(u.answers[0].title);
  u = understand("what is the prognosis", ctx); assert.ok(/Guarded|Uncertain|Favourable/.test(u.answers[0].title));
});
test("ward-round expressions are checked against the numbers", () => {
  const { ctx } = mk("cap", ACTS, 150000);
  let u = understand("the patient is deteriorating", ctx); assert.ok(u.answers[0].title.startsWith("Agree"));
  u = understand("patient is improving", ctx); assert.ok(/No|Holding|Too early/.test(u.answers[0].title));
  u = understand("overnight events", ctx); assert.ok(u.answers[0].lines.length);
  u = understand("fit for discharge", ctx); assert.equal(u.answers[0].title, "Not yet");
  u = understand("low threshold for intubation", ctx); assert.ok(u.answers[0].actions.some((a) => a.order === "proc:intubate") || /Already/.test(u.answers[0].title));
  u = understand("family counselled", ctx); assert.ok(u.answers[0].title === "Noted");
});
test("the verbs of management do not become orders by accident", () => {
  const { ctx } = mk("cap", ACTS, 150000);
  for (const s of ["continue meropenem", "withhold the antibiotic", "titrate noradrenaline", "extubate the patient", "wean the oxygen", "restrict fluids", "reassess the patient", "monitor closely"]) { const u = understand(s, ctx); assert.equal(u.orders.length, 0, s); assert.ok(u.answers.length, s); }
  let u = understand("stabilise the patient", ctx); assert.ok(u.answers[0].lines.length >= 4);
  u = understand("escalate the oxygen", ctx); assert.ok(u.answers[0].actions.length);
  u = understand("do CBC and monitor", ctx); assert.deepEqual(ids(u), ["lab:cbc"]); assert.ok(aids(u).includes("verb:monitor"));
});
test("handover and notes are written from the patient", () => {
  const { ctx } = mk("cap", ACTS, 150000);
  let u = understand("give me an SBAR", ctx); assert.ok(u.answers[0].lines.join(" ").includes("S: ") && u.answers[0].lines.join(" ").includes("R: "));
  u = understand("write a progress note", ctx); assert.ok(u.answers[0].lines.length === 4);
  u = understand("say it like a doctor", ctx); assert.ok(u.answers[0].lines.some((l) => l.startsWith("Professional")));
  u = understand("document the deterioration", ctx); assert.ok(u.answers[0].title.includes("note"));
});
test("a shock order is a shock only when it says so", () => {
  const { ctx } = mk("cap", [], 60000);
  assert.deepEqual(ids(understand("give fluids for septic shock", ctx)), ["drug:fluids"]);
  assert.deepEqual(ids(understand("shock him now", ctx)), ["shock"]);
  assert.deepEqual(ids(understand("start noradrenaline for shock", ctx)), ["drug:norepi"]);
});
test("abbreviations: tests are ordered, frequencies and codes are explained", () => {
  const { ctx } = mk("cap", [], 60000);
  assert.deepEqual(ids(understand("RFT", ctx)), ["lab:kft"]); assert.deepEqual(ids(understand("RBS", ctx)), ["lab:glucose"]); assert.deepEqual(ids(understand("VBG", ctx)), ["lab:abg"]);
  assert.ok(understand("what is TDS", ctx).answers[0].lines.join("").includes("Three times daily")); assert.ok(understand("what does LAMA mean", ctx).answers[0].lines.join("").includes("Leave against medical advice"));
});
