import test from "node:test";
import assert from "node:assert/strict";
import { Dp, Np } from "./case-engine.js";
import { questionIntent, isDeepQuestion, whoShouldSpeak, teamCards } from "./voice-brain.js";
import { safeContext, cleanDoses, normalise, cardsFromModel, askModel } from "./mdt-ask.js";

const state = (caseId, ms = 120000, acts = []) => { const sc = Dp(7, ["intensivist", "pulmonologist", "nephrologist"], { caseId }); return { P: Np(sc, acts, ms), sc }; };
const ctxOf = (P) => ({ P, story: { title: "x", text: "A man with breathlessness." }, team: [{ specialty: "intensivist" }] });

test("every kind of question is understood as something", () => {
  const cases = {
    why: "Why is the patient hypotensive?", next: "What is the next best step?", else: "What else could this be?", whatif: "What will happen if I give 1 litre of fluid?",
    evaluate: "Is this correct?", missing: "What are we missing?", compare: "Can I use vasopressin instead?", stop: "When should we stop the noradrenaline?",
    guidelines: "What do the guidelines recommend?", calculate: "Calculate the anion gap", challenge: "Challenge my decision.", explain: "Explain this to me like an intensivist.",
  };
  for (const [k, q] of Object.entries(cases)) assert.equal(questionIntent(q), k, q);
  assert.equal(questionIntent("What is the BP?"), "general");
  assert.equal(questionIntent("Should I intubate now?"), "next");
  assert.equal(questionIntent("start meropenem"), null);
  assert.ok(isDeepQuestion("why is he hypotensive") && !isDeepQuestion("what is the bp"));
});

test("the right specialists speak, and the intensivist is always first", () => {
  const { P } = state("ards");
  assert.deepEqual(whoShouldSpeak("what are the causes of this lactate", P)[0], "intensivist");
  assert.ok(whoShouldSpeak("should we start dialysis for the potassium", P).includes("nephrologist"));
  assert.ok(whoShouldSpeak("what ventilator settings now", P).includes("pulmonologist"));
  assert.ok(whoShouldSpeak("is the echo showing tamponade", P).includes("cardiologist"));
  assert.ok(whoShouldSpeak("anything", P).length >= 1 && whoShouldSpeak("anything", P).length <= 4);
});

test("the built-in team answers all twelve kinds, from the numbers, with no dead end", () => {
  for (const id of ["cap", "aki", "tbi", "dka"]) {
    const { P } = state(id);
    for (const q of ["Why is the patient hypotensive?", "What is the next best step?", "What else could this be?", "What if I give 1 litre of fluid?", "Is this correct?", "What are we missing?", "Compare noradrenaline and vasopressin", "When should we stop the noradrenaline?", "What do the guidelines recommend?", "Calculate the MAP", "Challenge my decision", "Explain the pathophysiology", "What is the dose of noradrenaline?"]) {
      const r = teamCards(q, ctxOf(P)); assert.ok(r.cards.length >= 1, id + ": " + q);
      for (const c of r.cards) { assert.ok(c.title && Array.isArray(c.lines) && c.lines.length, id + ": " + q + " -> " + c.title); }
    }
  }
});

test("a dose question gets the pharmacologist's refusal, never a number", () => {
  const { P } = state("cap"); const r = teamCards("what is the dose and infusion rate of noradrenaline", ctxOf(P));
  assert.ok(r.cards.some((c) => c.id === "mdt:pharm"));
});

test("calculations are right", () => {
  const { P } = state("cap"); const r = teamCards("calculate the MAP", ctxOf(P)), t = r.cards[0].lines.join(" ");
  assert.match(t, /MAP = DBP \+ \(SBP − DBP\) ÷ 3/);
  const want = Math.round((P.dbp + (P.sbp - P.dbp) / 3) * 10) / 10; assert.ok(t.includes("= " + want), t);
});

test("the model only sees what the room has seen", () => {
  const { P } = state("aki", 240000); P.problems = [{ title: "Hyperkalaemia" }]; P.needs = [{ label: "SECRET" }]; P.left = [{ label: "SECRET" }]; P.dx = "SECRETDX";
  const s = JSON.stringify(safeContext({ P, story: { text: "story" } }, [])); 
  for (const bad of ["SECRET", "Hyperkalaemia", "lactate", "needs", "problems", "left", "\"k\"", "\"cr\""]) assert.ok(!s.includes(bad), "leaked: " + bad);
  assert.ok(safeContext({ P, story: { text: "story" } }, []).vitals.sbp != null);
});

test("doses are removed from a model answer", () => {
  const c = cleanDoses("Start noradrenaline if MAP stays low. Give 4 mg in 50 mL at 5 mcg/min. Reassess in 30 minutes."); assert.equal(c.removed, 1); assert.ok(!/\d mg|mcg/.test(c.text)); assert.match(c.text, /Reassess/);
  assert.equal(cleanDoses("Tidal volume 6 mL/kg predicted weight and plateau under 30.").removed, 0);
  assert.equal(cleanDoses("MAP above 65 and lactate 4 mmol/L.").removed, 0);
});

test("a model answer is shaped, and only known orders become buttons", () => {
  const n = normalise({ specialists: [{ id: "cardiologist", text: "Get an echo. Give 40 mg." }, { id: "wizard", text: "hi" }, { id: "x", text: "" }], consensus: "Reassess the pressure.", actions: [{ label: "Echo", order: "img:echo" }, { label: "Hack", order: "rm -rf" }, { label: "Bad", order: "drug:nonexistent" }] });
  assert.equal(n.actions.length, 1); assert.equal(n.actions[0].order, "img:echo"); assert.equal(n.specialists.length, 2); assert.equal(n.specialists[1].id, "intensivist"); assert.ok(n.removed >= 1);
  const cards = cardsFromModel(n, "next step"); assert.equal(cards.at(-1).id, "mdt:m:consensus"); assert.ok(cards.at(-1).note.includes("Not clinical advice")); assert.ok(cards.at(-1).note.includes("removed"));
  assert.equal(normalise(null), null); assert.equal(normalise({}), null); assert.equal(normalise({ specialists: "x", consensus: "" }), null);
});

test("no endpoint means no call, and a failing endpoint means null (the room falls back)", async () => {
  const { P } = state("cap"); assert.equal(await askModel("why", "why", ["intensivist"], ctxOf(P), [], { url: "" }), null);
  const real = globalThis.fetch; globalThis.fetch = async () => { throw new Error("down"); };
  try { assert.equal(await askModel("why", "why", ["intensivist"], ctxOf(P), [], { url: "https://x.invalid", timeoutMs: 500 }), null); } finally { globalThis.fetch = real; }
  globalThis.fetch = async (u, o) => ({ ok: true, json: async () => ({ specialists: [{ id: "intensivist", text: "Reassess perfusion." }], consensus: "Reassess.", actions: [] }), _body: JSON.parse(o.body) });
  try { const r = await askModel("why", "why", ["intensivist"], ctxOf(P), [], { url: "https://x.invalid" }); assert.equal(r.consensus, "Reassess."); } finally { globalThis.fetch = real; }
});
