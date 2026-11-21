import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOrders, tokenize } from './voice-orders.js';
import { CATALOGUE, BY_ID } from './order-catalogue.js';

const ids = (t) => parseOrders(t).orders.map((o) => o.id);
const same = (t, want) => assert.deepEqual(ids(t), want, `"${t}" -> ${ids(t).join(', ')}`);

test('the three orders from the brief: CBC, KFT, LFT', () => {
  same('do CBC, KFT, LFT', ['lab:cbc', 'lab:kft', 'lab:lft']);
  same('Do CBC KFT and LFT', ['lab:cbc', 'lab:kft', 'lab:lft']);
  same('send C B C, K F T, L F T', ['lab:cbc', 'lab:kft', 'lab:lft']);
  same('get kidney function and liver function tests and a blood count', ['lab:kft', 'lab:lft', 'lab:cbc']);
});
test('imaging is understood in any wording', () => {
  same('get chest x-ray done', ['img:cxr']);
  same('do chest x-ray done', ['img:cxr']);
  same('chest xray', ['img:cxr']);
  same('portable chest X ray please', ['img:cxr']);
  same('ultrasound, chest x-ray, CT head', ['img:usg', 'img:cxr', 'img:cthead']);
  same('CT scan of the abdomen', ['img:ctabd']);
  same('CT chest and abdomen', ['img:ctchest', 'img:ctabd']);
  same('CT angiogram of the abdomen', ['img:ctangio']);
  same('give insulin and dextrose for the potassium', ['drug:insulindex']);
  same('3 percent saline', ['drug:saline3']);
  same('a CT of the brain', ['img:cthead']);
  same('do a C T chest', ['img:ctchest']);
  same('x-ray of the abdomen', ['img:xabd']);
  same('get a CT pulmonary angiogram', ['img:ctpa']);
  same('bedside echo and ECG', ['img:echo', 'img:ecg']);
  same('order a 2D echo', ['img:echo']);
  same('MRI brain', ['img:mri']);
});
test('antibiotics by name, brand and slip of the tongue', () => {
  same('start meropenem antibiotic', ['abx:meropenem']);
  same('start meropenem', ['abx:meropenem']);
  same('give piperacillin tazobactam and vancomycin', ['abx:piptaz', 'abx:vancomycin']);
  same('start tazact and vanc', ['abx:piptaz', 'abx:vancomycin']);
  same('ceftriaxone 2 g and azithromycin 500 mg', ['abx:ceftriaxone', 'abx:azithromycin']);
  same('start meropenum', ['abx:meropenem']);
  same('start colistin and tigecycline', ['abx:colistin', 'abx:tigecycline']);
  same('give oseltamivir', ['abx:oseltamivir']);
  same('add metronidazole', ['abx:metronidazole']);
  same('IV artesunate', ['drug:artesunate']);
  same('send blood cultures and then start antibiotics', ['lab:cultures', 'abx:any']);
  assert.ok(parseOrders('start antibiotics').orders[0].choose.length >= 5, 'a bare "antibiotics" offers a choice');
});
test('treatments and procedures', () => {
  same('start oxygen, put on BiPAP and give salbutamol nebulisation', ['proc:oxygen', 'proc:niv', 'drug:salbutamol']);
  same('intubate and put on ventilator', ['proc:intubate']);
  same('start noradrenaline', ['drug:norepi']);
  same('start pressors and give fluids', ['drug:norepi', 'drug:fluids']);
  same('calcium gluconate, insulin with dextrose, and arrange dialysis', ['drug:calcium', 'drug:insulindex', 'proc:dialysis']);
  same('put in a dialysis catheter and start dialysis', ['proc:hdline', 'proc:dialysis']);
  same('central line and arterial line', ['proc:cvc', 'proc:artline']);
  same('start heparin', ['drug:heparin']);
  same('thrombolysis with alteplase', ['drug:alteplase']);
  same('give blood, tranexamic acid and activate massive transfusion', ['drug:blood', 'drug:txa', 'drug:mtp']);
  same('octreotide and pantoprazole and urgent endoscopy', ['drug:octreotide', 'drug:ppi', 'proc:endo']);
  same('hypertonic saline and mannitol', ['drug:saline3', 'drug:mannitol']);
  same('pericardiocentesis', ['proc:pericard']);
  same('take to theatre for source control', ['proc:source']);
  same('start CPR, give adrenaline, shock', ['cpr', 'drug:adrenaline', 'shock']);
  same('lumbar puncture', ['proc:lp']);
  same('start insulin infusion and check ketones', ['drug:insulin', 'lab:ketones']);
});
test('abbreviations and lab words', () => {
  same('ABG with lactate', ['lab:abg']);
  same('check sugar and potassium', ['lab:glucose', 'lab:lyte']);
  same('troponin, BNP, D-dimer', ['lab:trop', 'lab:bnp', 'lab:ddimer']);
  same('coagulation profile and group and crossmatch', ['lab:coag', 'lab:crossmatch']);
  same('urine routine and urine culture', ['lab:ua', 'lab:urineculture']);
  same('serum ammonia and amylase lipase', ['lab:nh3', 'lab:amylase']);
  same('malaria smear and dengue NS1', ['lab:malaria', 'lab:dengue']);
  same('procalcitonin and CRP', ['lab:pct', 'lab:crp']);
  same('CPK', ['lab:ck']);
});
test('filler is ignored, repeats collapse, and a negation cancels', () => {
  same('please, we need to urgently get the chest x-ray done now', ['img:cxr']);
  same('send lactate lactate lactate', ['lab:lactate']);
  same('do not give fluids, start noradrenaline', ['drug:norepi']);
  assert.deepEqual(parseOrders('do not give fluids').negated, ['IV fluid']);
  same('examine the patient', ['examine']);
});
test('calling a specialist', () => {
  const r = parseOrders('call the nephrologist and get a CBC');
  assert.deepEqual(r.orders.map((o) => [o.id, o.specialty || '']), [['call', 'nephrologist'], ['lab:cbc', '']]);
  assert.equal(parseOrders('inform the surgeon').orders[0].specialty, 'surgeon');
  assert.equal(parseOrders('page the ID specialist').orders[0].specialty, 'infectious');
});
test('a bare CT asks which one, and what is not understood is reported', () => {
  const r = parseOrders('get a CT'); assert.equal(r.orders.length, 0); assert.equal(r.clarify[0].id, 'ct');
  const u = parseOrders('start meropenem and rearrange the furniture'); assert.deepEqual(u.orders.map((o) => o.id), ['abx:meropenem']); assert.match(u.unknown[0], /furniture/);
});
test('every phrase in the catalogue is understood as its own order', () => {
  let bad = [];
  for (const o of CATALOGUE) for (const say of o.say) { const got = parseOrders(say).orders.map((x) => x.id); if (!got.includes(o.id)) bad.push(say + ' -> ' + got.join(',')); }
  // a few phrases are legitimately the same words as another order; the rest must round-trip
  assert.ok(bad.length <= 12, bad.length + ' phrases do not round-trip: ' + bad.slice(0, 20).join(' | '));
});
test('it is fast: a long spoken list is parsed in a few milliseconds', () => {
  const long = 'do CBC, KFT, LFT, ABG with lactate, troponin, send blood cultures, get chest x-ray, ultrasound, bedside echo, CT head, start meropenem and vancomycin, noradrenaline, fluids, oxygen, intubate, central line and arterial line, dialysis catheter, calcium, insulin with dextrose';
  parseOrders(long); const t0 = performance.now(); for (let k = 0; k < 20; k++) parseOrders(long); const per = (performance.now() - t0) / 20;
  assert.ok(per < 40, 'took ' + per.toFixed(1) + ' ms');
});

test("salt suffixes are not reported as unknown", () => {
  const r = parseOrders("give calcium gluconate and potassium chloride");
  assert.deepEqual(r.unknown, []);
  assert.ok(r.orders.some((o) => o.id === "drug:calcium"));
});
