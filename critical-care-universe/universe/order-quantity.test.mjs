/* An order carries what the doctor said: the volume, the dose and the drug. Nothing is filled in from a stored default. */
import test from "node:test";
import assert from "node:assert/strict";
import { parseOrders, toKind } from "./voice-orders.js";
import { understand } from "./voice-brain.js";
import { Dp, Np, orderPayload } from "./case-engine.js";

const one = (t) => { const o = understand(t, null).orders; assert.equal(o.length, 1, t + " -> " + o.map((x) => x.id)); return o[0]; };
const kind = (t) => toKind(one(t));

test("2 litres of IV fluid is 2000 mL, not a 500 mL bolus", () => {
  for (const [t, ml] of [["give 2 liters of IV fluid", 2000], ["give 2 litres normal saline", 2000], ["1 litre ringer lactate", 1000], ["give 500 ml bolus", 500], ["give 250 ml fluid", 250], ["give two and a half litres of saline", 2500], ["half a litre of saline", 500], ["give a litre of fluid", 1000], ["five hundred ml fluid", 500], ["two fifty ml bolus", 250], ["give 1500 ml of ringer", 1500]]) {
    const k = kind(t); assert.equal(k.kind, "drug:fluids", t); assert.equal(k.ml, ml, t);
  }
});
test("a volume with no fluid named is still a fluid order", () => { assert.equal(kind("give two litres").ml, 2000); });
test("per kilogram volumes are worked out and said", () => { const o = one("give 30 ml per kg of fluid"); assert.equal(o.qty.ml, 2100); assert.match(o.qtyText, /30 mL\/kg/); });
test("fluids with no volume carry none: the room asks, nothing is assumed", () => { const k = kind("give fluids"); assert.equal(k.ml, undefined); });
test("a rate is not a bolus", () => { const k = kind("fluid 100 ml per hour"); assert.equal(k.ml, undefined); assert.match(k.rate, /100 mL per hour/); });

test("every antibiotic is read as the drug that was named", () => {
  for (const [t, id] of [["give piptaz", "abx:piptaz"], ["give piptaz antibiotic", "abx:piptaz"], ["pip taz", "abx:piptaz"], ["piperacillin tazobactam 4.5 g", "abx:piptaz"], ["tazocin", "abx:piptaz"], ["start meropenem", "abx:meropenem"],
    ["give imipenem", "abx:imipenem"], ["give ertapenem", "abx:ertapenem"], ["gentamicin", "abx:gentamicin"], ["amikacin", "abx:amikacin"], ["teicoplanin", "abx:teicoplanin"], ["vancomycin", "abx:vancomycin"],
    ["ciprofloxacin", "abx:ciprofloxacin"], ["levofloxacin", "abx:levofloxacin"], ["moxifloxacin", "abx:moxifloxacin"], ["polymyxin b", "abx:polymyxinb"], ["colistin", "abx:colistin"], ["cefoperazone sulbactam", "abx:cefoperazone"],
    ["cefazolin", "abx:cefazolin"], ["cloxacillin", "abx:cloxacillin"], ["flucloxacillin", "abx:flucloxacillin"], ["amoxicillin", "abx:amoxicillin"], ["co amoxiclav", "abx:amoxiclav"], ["penicillin", "abx:penicillin"],
    ["amphotericin", "abx:amphotericin"], ["micafungin", "abx:micafungin"], ["voriconazole", "abx:voriconazole"], ["ceftazidime avibactam", "abx:ceftazavi"], ["ceftazidime", "abx:ceftazidime"]]) assert.equal(one(t).id, id, t);
});
test("a dose goes with its own drug", () => {
  const o = understand("start meropenem 1 g and vancomycin 1.5 g and piptaz 4.5 g", null).orders;
  assert.deepEqual(o.map((x) => [x.id, x.qty && x.qty.dose]), [["abx:meropenem", "1 g"], ["abx:vancomycin", "1.5 g"], ["abx:piptaz", "4.5 g"]]);
  assert.equal(kind("colistin 9 million units").dose, "9 million units");
});
test("a class or the bare word antibiotics asks which drug; it never picks one", () => {
  for (const t of ["start antibiotics", "give a carbapenem", "start antifungal", "give an aminoglycoside"]) { const o = one(t); assert.equal(o.id, "abx:any", t); assert.ok(o.choose.length >= 2, t); }
  assert.ok(one("give a carbapenem").choose.some((c) => c.id === "abx:imipenem"));
});
test("the order the room receives names the drug and the volume", () => {
  assert.deepEqual(kind("give piptaz 4.5 g"), { kind: "abx:piptaz", dose: "4.5 g", say: "piptaz" });
  assert.equal(orderPayload({ ml: "2000", dose: "<b>4.5 g</b>", junk: 1 }).ml, 2000); assert.equal(orderPayload({ ml: -5 }).ml, undefined);
});

/* the engine reads them */
const sc = Dp(7, ["intensivist", "pulmonologist", "nephrologist"], { caseId: "aki", noRemember: true, recent: [] });
const act = (kind, payload, atMs) => ({ atMs, userId: "u", name: "A", specialty: "intensivist", kind, payload: payload || {} });
test("the engine gives the volume that was ordered", () => {
  const P = Np(sc, [act("drug:fluids", { ml: 2000 }, 1000)], 20000);
  assert.equal(P.fluidMl, 2000); assert.ok(P.log.some((l) => /2 L of IV fluid/.test(l.text)), JSON.stringify(P.log.map((l) => l.text)));
  const Q = Np(sc, [act("drug:fluids", { ml: 500, say: "ringer lactate" }, 1000), act("drug:fluids", { ml: 1000 }, 40000)], 80000);
  assert.equal(Q.fluidMl, 1500); assert.ok(Q.log.some((l) => /Ringer's lactate/.test(l.text)));
  const R = Np(sc, [act("drug:fluids", {}, 1000)], 20000); assert.equal(R.fluidMl, 0); assert.ok(R.log.some((l) => /volume was not stated/.test(l.text)));
});
test("the engine starts the antibiotic that was named, with its dose, and no other", () => {
  const P = Np(sc, [act("abx:piptaz", { dose: "4.5 g", say: "piptaz" }, 1000)], 20000);
  const t = P.log.map((l) => l.text).join(" | "); assert.match(t, /piperacillin-tazobactam 4\.5 g/i); assert.doesNotMatch(t, /meropenem/i); assert.ok(P.given["abx:piptaz"] === 1 && !P.given["abx:meropenem"]);
  const G = Np(sc, [act("abx:gentamicin", {}, 1000)], 20000); assert.match(G.log.map((l) => l.text).join(" "), /Gentamicin/); assert.ok(!G.given["abx:amikacin"]);
  const A = Np(sc, [act("abx:any", {}, 1000)], 20000); assert.doesNotMatch(A.log.map((l) => l.text).join(" "), /piperacillin/i);
});
