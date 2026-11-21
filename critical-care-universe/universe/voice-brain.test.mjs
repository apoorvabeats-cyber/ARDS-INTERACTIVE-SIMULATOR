import { test } from "node:test";
import assert from "node:assert/strict";
import { understand, repair } from "./voice-brain.js";
import { Dp, Np } from "./case-engine.js";

const mk = (caseId, acts, ms, team) => { const sc = Dp(7, team || ["intensivist", "nephrologist", "pulmonologist", "cardiologist", "infectious", "gastroenterologist", "surgeon"], { caseId, noRemember: true, recent: [] });
  const A = (acts || []).map(([kind, atMs]) => ({ atMs, userId: "u", name: "Asha", specialty: "intensivist", kind, payload: {} }));
  const P = Np(sc, A, ms); return { sc, P, ctx: { P, hist: [], story: { title: "Patient", text: sc.story } } }; };
const ids = (u) => u.orders.map((o) => o.id), aids = (u) => u.answers.map((a) => a.id);

test("questions about the vitals are answered, not ordered", () => {
  const { ctx, P } = mk("cardiogenic", [], 60000);
  let u = understand("what is the BP", ctx); assert.deepEqual(aids(u), ["v:bp"]); assert.equal(u.answers[0].big, `${P.sbp}/${P.dbp}`); assert.equal(u.orders.length, 0);
  u = understand("what's the respiratory rate?", ctx); assert.deepEqual(aids(u), ["v:rr"]); assert.equal(u.answers[0].big, String(P.rr));
  u = understand("tell me the heart rate", ctx); assert.deepEqual(aids(u), ["v:hr"]);
  u = understand("what is his oxygen saturation", ctx); assert.deepEqual(aids(u), ["v:spo2"]);
  u = understand("temperature?", ctx); assert.deepEqual(aids(u), ["v:temp"]);
  u = understand("what is the GCS", ctx); assert.deepEqual(aids(u), ["v:gcs"]);
  u = understand("BP and RR", ctx); assert.deepEqual(aids(u).sort(), ["v:bp", "v:rr"]);
  u = understand("how is the patient", ctx); assert.deepEqual(aids(u), ["summary"]);
});
test("the urine output is answered", () => {
  const { ctx, P } = mk("aki", [], 90000);
  for (const q of ["what is the urine output", "how much urine", "what's the UO", "urine output?"]) { const u = understand(q, ctx); assert.deepEqual(aids(u), ["v:uo"], q); assert.equal(u.answers[0].big, String(P.uo)); }
  assert.ok(P.uo < 35, "the kidney case is oliguric: " + P.uo);
  const u = understand("is he oliguric", ctx); assert.deepEqual(aids(u), ["c:uo"]);
});
test("is the patient hypotensive / hypoxic / febrile", () => {
  const { ctx, P } = mk("cardiogenic", [], 200000);
  let u = understand("is the patient having hypotension", ctx); assert.deepEqual(aids(u), ["c:hypotension"]);
  assert.equal(u.answers[0].title.startsWith(P.sbp < 90 || P.map < 65 ? "Yes" : "No"), true);
  u = understand("is he hypoxic", ctx); assert.deepEqual(aids(u), ["c:hypoxia"]);
  u = understand("does he have a fever", ctx); assert.deepEqual(aids(u), ["c:fever"]);
  u = understand("is he in shock", ctx); assert.deepEqual(aids(u), ["c:hypotension"]);
  u = understand("hypotension?", ctx); assert.deepEqual(aids(u), ["c:hypotension"]);
  u = understand("is he septic", ctx); assert.deepEqual(aids(u), ["c:sepsis"]);
});
test("a reason for an order is not a question", () => {
  const { ctx } = mk("cardiogenic", [], 60000);
  let u = understand("give fluids for hypotension", ctx); assert.deepEqual(ids(u), ["drug:fluids"]); assert.equal(u.answers.length, 0);
  u = understand("start norepinephrine for low BP", ctx); assert.deepEqual(ids(u), ["drug:norepi"]); assert.equal(u.answers.length, 0);
  u = understand("send urine culture", ctx); assert.deepEqual(ids(u), ["lab:urineculture"]); assert.equal(u.answers.length, 0);
  u = understand("shock him", ctx); assert.ok(ids(u).includes("shock")); assert.equal(u.answers.length, 0);
});
test("speech slips are mended: initiate the patient is intubate the patient", () => {
  const { ctx } = mk("ards", [], 60000);
  for (const s of ["initiate the patient", "initiate him now", "intubate the patient", "in two bait the patient", "initiation", "entubate"]) assert.ok(ids(understand(s, ctx)).includes("proc:intubate"), s);
  assert.deepEqual(ids(understand("initiate meropenem", ctx)), ["abx:meropenem"]);
  assert.equal(repair("initiate the patient"), "intubate the patient");
});
test("orders still work, alone and mixed with questions", () => {
  const { ctx } = mk("aki", [], 60000);
  assert.deepEqual(ids(understand("get the echo done", ctx)), ["img:echo"]);
  assert.deepEqual(ids(understand("do CBC, KFT, LFT", ctx)), ["lab:cbc", "lab:kft", "lab:lft"]);
  const u = understand("what is the BP and start norepinephrine and get an echo", ctx);
  assert.deepEqual(aids(u), ["v:bp"]); assert.deepEqual(ids(u).sort(), ["drug:norepi", "img:echo"]);
  assert.deepEqual(ids(understand("repeat the lactate", ctx)), ["lab:lactate"]);
});
test("results can be asked for and shown again", () => {
  const before = mk("cap", [], 120000);
  let u = understand("show me the ultrasound again", before.ctx); assert.deepEqual(aids(u), ["r:img:usg"]); assert.ok(u.answers[0].actions.some((a) => a.order === "img:usg"));
  u = understand("what is the lactate", before.ctx); assert.deepEqual(aids(u), ["l:lactate"]); assert.ok(u.answers[0].actions.length);
  const after = mk("cap", [["img:usg", 1000], ["lab:abg", 2000], ["lab:kft", 3000], ["img:cxr", 4000]], 200000);
  assert.ok(after.P.results.length >= 3, "results are back");
  u = understand("show me the ultrasound again", after.ctx); assert.deepEqual(aids(u), ["r:img:usg"]); assert.ok(!u.answers[0].actions);
  u = understand("what did the chest x-ray show", after.ctx); assert.deepEqual(aids(u), ["r:img:cxr"]);
  u = understand("what is the lactate", after.ctx); assert.deepEqual(aids(u), ["l:lactate"]); assert.ok(u.answers[0].big);
  u = understand("what is the creatinine", after.ctx); assert.deepEqual(aids(u), ["l:cr"]);
  u = understand("is the potassium high", after.ctx); assert.deepEqual(aids(u), ["l:k"]); assert.equal(u.orders.length, 0);
  u = understand("what is the ABG", after.ctx); assert.deepEqual(aids(u), ["r:lab:abg"]);
  u = understand("what is pending", after.ctx); assert.deepEqual(aids(u), ["pending"]);
});
test("what was done, and is he on it", () => {
  const { ctx } = mk("cap", [["drug:norepi", 1000], ["abx:meropenem", 2000], ["proc:intubate", 3000]], 120000);
  let u = understand("did we give meropenem", ctx); assert.deepEqual(aids(u), ["given"]); assert.ok(u.answers[0].title.startsWith("Yes"));
  u = understand("is he intubated", ctx); assert.deepEqual(aids(u), ["tube"]);
  u = understand("is he on pressors", ctx); assert.deepEqual(aids(u), ["pressor"]);
  u = understand("what have we done so far", ctx); assert.deepEqual(aids(u), ["done"]);
  u = understand("what is the diagnosis", ctx); assert.deepEqual(aids(u), ["dx"]);
});
test("a line that fits nothing still gets a useful reply", () => {
  const { ctx } = mk("cap", [], 60000);
  const u = understand("blood sugar kind of low pressure thing", ctx); assert.ok(u.answers.length || u.orders.length || u.suggest.length);
  const v = understand("tell me about the blorp", ctx); assert.ok(Array.isArray(v.suggest));
});
test("speed: a long line is understood in a few milliseconds", () => {
  const { ctx } = mk("cap", [["lab:abg", 1000]], 200000); const t0 = performance.now();
  for (let i = 0; i < 50; i += 1) understand("what is the BP and the respiratory rate, is he hypotensive, do CBC KFT LFT, get an echo, start meropenem and norepinephrine, show me the ultrasound again", ctx);
  assert.ok((performance.now() - t0) / 50 < 30, "ms per line: " + (performance.now() - t0) / 50);
});
test("redo words, multi-topic lines and statements", () => {
  const { ctx } = mk("aki", [["img:echo", 1000]], 120000);
  let u = understand("echo again", ctx); assert.deepEqual(ids(u), ["img:echo"]); assert.equal(u.answers.length, 0);
  u = understand("can you tell me his urine output and potassium", ctx); assert.ok(aids(u).includes("v:uo"));
  u = understand("he is hypotensive, give fluids and start noradrenaline", ctx); assert.equal(u.answers.length, 0); assert.ok(ids(u).includes("drug:norepi"));
  u = understand("bp is dropping start norad", ctx); assert.ok(ids(u).includes("drug:norepi"));
  u = understand("patient is sat 85", ctx); assert.ok(u.answers.length || u.orders.length || u.suggest.length);
  u = understand("don't intubate yet, get an ABG", ctx); assert.ok(ids(u).includes("lab:abg") && !ids(u).includes("proc:intubate"));
});
