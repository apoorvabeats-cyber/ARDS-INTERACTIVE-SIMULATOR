import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {ORDER_CASES,assessOrder} from './clinical-orders.js';

const ctx={sbp:110,map:75,k:4,ph:7.1,norepinephrine:0,benzo:false,atropine:false};
const level=(dx,id,changes={})=>assessOrder(dx,id,{...ctx,...changes}).level;

test('all supported cases have distinct choices and illustrative targets',()=>{
 assert.equal(Object.keys(ORDER_CASES).length,16);
 for(const profile of Object.values(ORDER_CASES)){
  assert.equal(new Set(profile.actions.map(a=>a.id)).size,profile.actions.length);
  for(const vital of ['hr','sbp','spo2','rr'])assert.ok(Number.isFinite(profile.target[vital]));
  for(const a of profile.actions)assert.ok(['appropriate','conditional','inappropriate'].includes(a.assess(ctx).level));
 }
 assert.throws(()=>assessOrder('unknown','x',ctx));
 assert.throws(()=>assessOrder('DKA','unknown',ctx));
});

test('DKA insulin depends on current potassium and bicarbonate on pH',()=>{
 assert.equal(level('DKA','insulin',{k:2.9}),'inappropriate');
 assert.equal(level('DKA','insulin',{k:3.5}),'appropriate');
 assert.equal(level('DKA','insulin',{k:3.5,insulin:1}),'conditional');
 assert.equal(level('DKA','potassium',{k:2.9}),'appropriate');
 assert.equal(level('DKA','potassium',{k:3.5}),'conditional');
 assert.equal(level('DKA','bicarbonate',{ph:7.05}),'inappropriate');
 assert.equal(level('DKA','bicarbonate',{ph:6.95}),'conditional');
});

test('rhythm and blood pressure change the assessment',()=>{
 assert.equal(level('Regular SVT','adenosine'),'appropriate');
 assert.equal(level('Regular SVT','adenosine',{sbp:78,map:55}),'conditional');
 assert.equal(level('Regular SVT','metoprolol',{sbp:78,map:55}),'inappropriate');
 assert.equal(level('Regular SVT','cardioversion',{sbp:78,map:55}),'appropriate');
 assert.equal(level('Symptomatic bradycardia','adrenaline',{sbp:78,map:55}),'conditional');
 assert.equal(level('Symptomatic bradycardia','adrenaline',{sbp:78,map:55,atropine:true}),'appropriate');
 assert.equal(level('Hypertensive pulmonary edema','nitrate',{sbp:80,map:55}),'inappropriate');
 assert.equal(level('Hypertensive pulmonary edema','nitrate',{sbp:105}),'conditional');
 assert.equal(level('Septic shock','norepinephrine',{map:55,norepinephrine:30}),'conditional');
});

test('status treatment depends on prior benzodiazepine and investigations do not treat',()=>{
 assert.equal(level('Status epilepticus','levetiracetam'),'conditional');
 assert.equal(level('Status epilepticus','levetiracetam',{benzo:true}),'appropriate');
 assert.equal(level('Status epilepticus','midazolam',{benzo:true}),'conditional');
 assert.equal(assessOrder('AKI, hyperkalemia','ecg',ctx).choice.kind,'investigation');
 assert.equal(level('AKI, hyperkalemia','resin'),'inappropriate');
});

test('cardiogenic shock avoids vasodilators and gates inotrope and diuretic on perfusion',()=>{
 assert.equal(level('Cardiogenic shock','nitrate',{sbp:78,map:55}),'inappropriate');
 assert.equal(level('Cardiogenic shock','dobutamine',{map:55}),'conditional');
 assert.equal(level('Cardiogenic shock','dobutamine',{map:55,norepinephrine:6}),'appropriate');
 assert.equal(level('Cardiogenic shock','furosemide',{map:55}),'conditional');
 assert.equal(level('Cardiogenic shock','furosemide',{map:70}),'appropriate');
});

test('ARDS lung-protective check uses tidal volume per kg and plateau',()=>{
 assert.equal(level('ARDS','protect',{perKg:6,pplat:24}),'appropriate');
 assert.equal(level('ARDS','protect',{perKg:10,pplat:24}),'conditional');
 assert.equal(level('ARDS','protect',{perKg:6,pplat:34}),'conditional');
 assert.equal(level('ARDS','peep',{pplat:34}),'conditional');
 assert.equal(level('ARDS','vt10'),'inappropriate');
 assert.equal(assessOrder('ARDS','prone',ctx).choice.effect,'prone');
});

test('TBI, PE, variceal bleed, dengue and organophosphate orders follow the case state',()=>{
 assert.equal(level('Severe TBI','saline',{k:156}),'conditional');
 assert.equal(level('Severe TBI','saline',{k:138}),'appropriate');
 assert.equal(level('Severe TBI','mannitol',{sbp:90,map:60}),'conditional');
 assert.equal(level('Severe TBI','hyperventilate'),'inappropriate');
 assert.equal(level('Massive pulmonary embolism','thrombolysis',{sbp:82,map:55}),'appropriate');
 assert.equal(level('Massive pulmonary embolism','thrombolysis',{sbp:110}),'conditional');
 assert.equal(level('Massive pulmonary embolism','fluid'),'inappropriate');
 assert.equal(level('Variceal bleed','transfuse',{k:6.4}),'appropriate');
 assert.equal(level('Variceal bleed','transfuse',{k:8.2}),'conditional');
 assert.equal(level('Dengue shock','fluid',{fluid:0}),'appropriate');
 assert.equal(level('Dengue shock','fluid',{fluid:3}),'conditional');
 assert.equal(level('Dengue shock','colloid',{fluid:0}),'conditional');
 assert.equal(level('Organophosphate poisoning','pralidoxime',{atr:0}),'conditional');
 assert.equal(level('Organophosphate poisoning','pralidoxime',{atr:1}),'appropriate');
 assert.equal(level('Organophosphate poisoning','neostigmine'),'inappropriate');
});

test('COPD escalates when pH stays low and avoids uncontrolled oxygen',()=>{
 assert.equal(level('COPD, hypercapnic failure','niv',{ph:7.22}),'conditional');
 assert.equal(level('COPD, hypercapnic failure','niv',{ph:7.32}),'appropriate');
 assert.equal(level('COPD, hypercapnic failure','oxygen'),'inappropriate');
 assert.equal(level('COPD, hypercapnic failure','sedate'),'inappropriate');
});

test('hyperkalemia salbutamol is an adjunct after calcium',()=>{
 assert.equal(level('AKI, hyperkalemia','salbutamol',{calcium:0}),'conditional');
 assert.equal(level('AKI, hyperkalemia','salbutamol',{calcium:1}),'appropriate');
});
