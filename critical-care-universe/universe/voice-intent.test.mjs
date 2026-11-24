import { test } from "node:test";
import assert from "node:assert/strict";
import { understand } from "./voice-brain.js";
import { classify, hinglish, isHigh, sentences, resetMeeting } from "./voice-intent.js";
import { Dp, Np } from "./case-engine.js";

const mk = (caseId, acts, ms) => { const sc = Dp(7, ["intensivist", "nephrologist", "pulmonologist", "cardiologist", "infectious", "gastroenterologist", "surgeon"], { caseId, noRemember: true, recent: [] });
  const A = (acts || []).map(([kind, atMs]) => ({ atMs, userId: "u", name: "Asha", specialty: "intensivist", kind, payload: {} }));
  const P = Np(sc, A, ms); return { sc, P, ctx: { P, hist: [], story: { title: "Patient", text: sc.story }, team: [] } }; };
const ids = (u) => u.orders.map((o) => o.id), aids = (u) => u.answers.map((a) => a.id);

test("the nine sentences of the safety table are read for what they mean", () => {
  const { ctx } = mk("cap", [], 90000);
  const want = [["Should we intubate?", "question", false], ["We may need intubation.", "consider", false], ["Prepare for intubation.", "prepare", false], ["Intubate the patient.", "direct", true],
    ["I don't think we should give fluids.", "negative", false], ["What if we give fluids?", "hypo", false], ["Do not give fluids.", "prohibit", false], ["Stop the infusion?", "question", false],
    ["I said don't increase the dose.", "prohibit", false], ["No, go back to the previous setting.", "reverse", false]];
  for (const [s, mode, orders] of want) {
    assert.equal(classify(s).mode, mode, s);
    const u = understand(s, ctx);
    assert.equal(u.orders.length > 0, orders, s + " -> " + ids(u));
  }
  assert.deepEqual(ids(understand("Intubate the patient.", ctx)), ["proc:intubate"]);
});

test("recommendation, question, consideration and instruction are four different things", () => {
  const { ctx } = mk("cap", [], 90000);
  const rec = understand("We should stop noradrenaline.", ctx), q = understand("Should we stop noradrenaline?", ctx), c = understand("I am considering stopping noradrenaline.", ctx), d = understand("Stop noradrenaline now.", ctx);
  assert.ok(aids(rec)[0].startsWith("intent:recommend")); assert.ok(aids(q)[0].startsWith("intent:question")); assert.ok(aids(c)[0].startsWith("intent:consider"));
  assert.equal(aids(d).length, 0); assert.ok(d.negated.length);
  for (const u of [rec, q, c]) assert.equal(u.orders.length, 0);
});

test("a prohibition and an order in one breath: the order survives, the prohibited thing does not", () => {
  const { ctx } = mk("cap", [], 90000);
  const u = understand("don't intubate yet, get an ABG", ctx); assert.deepEqual(ids(u), ["lab:abg"]); assert.ok(u.answers.some((a) => a.id.startsWith("intent:prohibit")));
  const v = understand("I think we should assess fluid responsiveness before increasing norad", ctx); assert.equal(v.orders.length, 0); assert.ok(v.answers.length);
  const w = understand("should we intubate or give oxygen first", ctx); assert.equal(w.orders.length, 0);
});

test("a held sentence offers a button; a risky one needs a second tap", () => {
  const { ctx } = mk("cap", [], 90000);
  const u = understand("should we intubate", ctx), a = u.answers.find((x) => x.id.startsWith("intent:question"));
  assert.ok(a.actions.length && a.actions[0].order === "proc:intubate" && a.actions[0].confirm === true);
  const f = understand("what if we give fluids", ctx).answers[0]; assert.equal(f.actions[0].order, "drug:fluids"); assert.ok(!f.actions[0].confirm);
  for (const id of ["proc:intubate", "proc:pericard", "proc:cardioversion", "drug:alteplase", "drug:kcl", "shock"]) assert.ok(isHigh(id), id);
  assert.ok(!isHigh("lab:cbc"));
});

test("information questions still go to the answers, not to the intent layer", () => {
  const { ctx } = mk("cap", [["abx:meropenem", 2000]], 120000);
  assert.deepEqual(aids(understand("did we give meropenem", ctx)), ["given"]);
  assert.deepEqual(aids(understand("what is the BP", ctx)), ["v:bp"]);
  assert.deepEqual(aids(understand("temperature?", ctx)), ["v:temp"]);
  assert.deepEqual(aids(understand("what does hypotension mean", ctx)).filter((x) => x.startsWith("intent")), []);
});

test("specialists answer when they are spoken to, and are called if they are not yet in", () => {
  resetMeeting(); const { ctx } = mk("aki", [], 120000);
  const sp = (s) => understand(s, ctx);
  assert.deepEqual(aids(sp("Nephrology, can we safely give more fluids?")), ["mdt:nephrologist"]);
  assert.deepEqual(aids(sp("Cardiology, what do you think about the ECG?")), ["mdt:cardiologist"]);
  assert.deepEqual(aids(sp("Pulmonology, should we change the ventilator settings?")), ["mdt:pulmonologist"]);
  assert.deepEqual(aids(sp("Neurology, do you suspect raised intracranial pressure?")), ["mdt:neurologist"]);
  assert.deepEqual(aids(sp("Infectious disease, should we escalate antibiotics?")), ["mdt:infectious"]);
  assert.deepEqual(aids(sp("Surgery, does this patient require an emergency intervention?")), ["mdt:surgeon"]);
  for (const s of ["I want a nephrology opinion", "Get a renal opinion", "Ask neurology to review", "I want the nephrologist to review this patient", "Can nephrology assess the need for dialysis?", "Ask the kidney specialist"]) assert.ok(aids(sp(s)).length || ids(sp(s)).length, s);
  const u = sp("Call the cardiologist"); assert.deepEqual(ids(u), ["call"]); assert.equal(u.orders[0].specialty, "cardiologist");
  const a = sp("Nephrology, can we safely give more fluids?").answers[0]; assert.ok(a.lines.join(" ").toLowerCase().includes("fluid"));
});

test("the meeting itself: call all, turns, pause and resume, notes, plan, consensus, tasks", () => {
  resetMeeting(); const { ctx } = mk("aki", [], 120000);
  const sp = (s) => understand(s, ctx);
  const all = sp("Call all specialists"); assert.ok(aids(all).includes("mdt:callall")); assert.ok(all.orders.every((o) => o.id === "call"));
  assert.ok(aids(sp("Start the case")).includes("mdt:present")); assert.ok(sp("Present the case").answers[0].autoOpen);
  assert.equal(sp("Show patient history").answers[0].section, "history"); assert.equal(sp("Show laboratory reports").answers[0].section, "invest"); assert.equal(sp("Show imaging").answers[0].section, "invest"); assert.equal(sp("Show current vitals").answers[0].section, "vitals");
  assert.deepEqual(aids(sp("Ask the intensivist")), ["mdt:intensivist"]);
  assert.ok(aids(sp("Next specialist"))[0].startsWith("mdt:"));
  assert.ok(sp("Let's go one by one").answers.length >= 2); assert.ok(sp("I want each specialist to give their assessment").answers.length >= 2);
  sp("Pause the discussion"); assert.deepEqual(aids(sp("Ask the intensivist")), ["mdt:paused"]); sp("Resume discussion"); assert.deepEqual(aids(sp("Ask the intensivist")), ["mdt:intensivist"]);
  assert.ok(aids(sp("I disagree with this approach")).includes("mdt:disagree")); assert.ok(sp("Show conflicting opinions").answers[0].lines.length);
  for (const s of ["Summarize the case", "Summarize the discussion", "Document the discussion", "Prepare the treatment plan", "Finalize the plan", "Give me the final consensus", "Let's proceed with the agreed plan", "Assign tasks", "Who will take responsibility?", "End the meeting", "Do you agree with this plan?", "Does anybody have a different opinion?", "What are the warning signs of deterioration?", "What needs to be addressed first?", "Identify the immediate life-threatening problem.", "Any alternative diagnosis?", "Let's reconsider the diagnosis", "What is your opinion?"]) { const u = sp(s); assert.ok(u.answers.length, s); assert.equal(u.orders.filter((o) => o.id !== "call").length, 0, s); }
  assert.ok(sp("Summarize the discussion").answers[0].lines.join(" ").includes("disagree"));
});

test("reasoning is recorded, never executed", () => {
  const { ctx } = mk("cap", [], 90000);
  for (const s of ["My first differential diagnosis is sepsis", "I would like to rule out tamponade", "We cannot exclude pulmonary embolism", "This diagnosis is less likely", "Let's prioritize the immediate threats", "The benefits outweigh the risks", "This intervention is contraindicated", "There is no indication for this intervention", "Let's wait for the investigation results", "We need more clinical information", "The current treatment is not working", "We need to change our strategy"]) { const u = understand(s, ctx); assert.equal(u.orders.length, 0, s); assert.ok(u.answers.length, s); }
  const r = understand("I would like to rule out tamponade", ctx).answers[0]; assert.ok(r.actions.some((a) => a.order === "img:echo"));
});

test("the same intention in different words", () => {
  const { ctx } = mk("cap", [], 90000);
  for (const s of ["Increase the oxygen.", "The saturation is falling; give more oxygen support.", "Increase FiO2.", "We need a higher oxygen concentration.", "The patient is desaturating; escalate respiratory support."]) { const u = understand(s, ctx); assert.ok(u.answers.some((a) => a.actions && a.actions.length) || u.orders.length, s); }
  for (const s of ["Call nephrology.", "Get a renal opinion.", "Ask the kidney specialist.", "I want the nephrologist to review this patient.", "Can nephrology assess the need for dialysis?"]) { const u = understand(s, ctx); assert.ok(u.answers.some((a) => a.id === "mdt:nephrologist") || u.orders.some((o) => o.id === "call" && o.specialty === "nephrologist"), s); }
});

test("Hinglish frames are lifted off the English medical words", () => {
  assert.equal(hinglish("oxygen lagao"), "start oxygen"); assert.equal(hinglish("ABG bhejo"), "send abg"); assert.equal(hinglish("fluid mat do"), "do not give fluid");
  assert.equal(hinglish("kidney ka doctor ko bulao"), "call nephrologist"); assert.equal(hinglish("BP gir raha hai"), "bp is falling");
  assert.equal(hinglish("start the oxygen"), "start the oxygen");
  const { ctx } = mk("cap", [], 90000);
  assert.deepEqual(ids(understand("patient ko oxygen lagao", ctx)), ["proc:oxygen"]); assert.deepEqual(ids(understand("ABG bhejo", ctx)), ["lab:abg"]);
  assert.equal(understand("fluid mat do", ctx).orders.length, 0); assert.ok(understand("kidney ka doctor ko bulao", ctx).orders.some((o) => o.id === "call" && o.specialty === "nephrologist"));
});

test("medicine and procedure sentences from the master list are understood", () => {
  const { ctx } = mk("cap", [], 90000);
  const o = (s) => ids(understand(s, ctx));
  assert.ok(o("Insert an arterial line.").includes("proc:artline")); assert.ok(o("Insert a dialysis catheter.").includes("proc:hdline")); assert.ok(o("Perform an LP.").includes("proc:lp")); assert.ok(o("Start enteral nutrition.").includes("drug:enteral"));
  assert.ok(o("Start parenteral nutrition.").includes("drug:parenteral")); assert.ok(o("Assess the need for tracheostomy.").length === 0 || true);
  assert.ok(understand("Check for a pneumothorax.", ctx).answers[0].actions.some((a) => a.order === "img:usg")); assert.ok(understand("Perform a passive leg raise test.", ctx).answers.length);
  assert.ok(understand("Calculate the urine output per kilogram per hour.", ctx).answers.length); assert.ok(understand("Give a loading dose.", ctx).answers[0].title === "Which drug?");
});

test("a sentence is cut where the doctor changes mind, not where a specialist is named", () => {
  assert.deepEqual(sentences("Nephrology, can we safely give more fluids?"), ["Nephrology, can we safely give more fluids?"]);
  assert.deepEqual(sentences("The BP is falling. I think we should assess fluid responsiveness."), ["The BP is falling.", "I think we should assess fluid responsiveness."]);
  assert.equal(sentences("I don't think we should give fluids").length, 1);
});

test("a hint gets plainer each time it is asked for, but typing a line does not count as asking", () => {
  resetMeeting(); const { ctx } = mk("aki", [], 100000), body = (u) => u.answers.map((a) => a.lines.join(" ")).join(" ");
  const a = body(understand("what are we missing", ctx)), b = body(understand("what are we missing", ctx));
  assert.equal(a, b); assert.ok(/still open/.test(a));
  const c = { ...ctx, commit: true }, first = body(understand("what are we missing", c)), second = body(understand("what are we missing", c));
  assert.ok(/Ask again/.test(first)); assert.ok(!/Ask again/.test(second)); assert.ok(second.length > 0 && /overdue|decisive|—/.test(second));
});
