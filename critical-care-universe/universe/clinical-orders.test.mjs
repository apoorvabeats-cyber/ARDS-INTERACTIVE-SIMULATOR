import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {ORDER_CASES,assessOrder} from './clinical-orders.js';

const ctx={sbp:110,map:75,k:4,ph:7.1,norepinephrine:0,benzo:false,atropine:false};
const level=(dx,id,changes={})=>assessOrder(dx,id,{...ctx,...changes}).level;

test('all supported cases have distinct choices and illustrative targets',()=>{
 assert.equal(Object.keys(ORDER_CASES).length,8);
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
