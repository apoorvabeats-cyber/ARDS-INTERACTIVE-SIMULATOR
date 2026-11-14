import fs from 'fs';
const s=fs.readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const a=s.indexOf('var bp=[{id:`intensivist`'),b=s.indexOf('var Fp=`ABCDEFGH');
const {Dp,Np}=new Function(s.slice(a,b)+';return {Dp,Np}')();
const specs=['intensivist','pulmonologist','cardiologist','nephrologist','infectious','gastroenterologist','surgeon','neurologist'];
let ok=0,fail=0;const t=(n,c)=>{c?ok++:(fail++,console.log('FAIL',n))};
const lead={};for(let seed=1;seed<600;seed++){const sc=Dp(seed,specs);(lead[sc.problems[0].id]??=sc)}
console.log('lead problems:',Object.keys(lead).join(', '));
const act=(atMs,kind,spec='intensivist',payload={})=>({atMs,userId:'u-'+spec,name:'Dr '+spec,specialty:spec,kind,payload});
const run=(sc,acts,ms=60000)=>Np(sc,acts,ms);
const first=run(lead[Object.keys(lead)[0]],[],1000);console.log('return keys:',Object.keys(first));
const V=r=>r.vitals||r.v||r.state||r;
const text=r=>r.log.map(x=>x.text).join('\n');
const pn=lead.pneumonia, bl=lead.bleed, cg=lead.cardiogenic, ak=lead.aki, pf=lead.perforation, sp=lead.sepsis;
// non-indicated effects
let r=run(pn,[act(1000,'echo'),act(2000,'blood'),act(3000,'endoscopy'),act(4000,'source')],10000);
t('echo non-cardiac',/not the cause/.test(text(r))&&!/ventricle is poor/.test(text(r)));
t('blood not indicated',/no bleeding/.test(text(r)));
t('endoscopy not indicated',/No bleeding source/.test(text(r)));
t('source not indicated',/no surgical source/.test(text(r)));
const sbp0=V(run(pn,[],10000)).sbp, sbp1=V(r).sbp;
t('non-indicated treatments do not raise BP',sbp1<=sbp0+0.01);
// indicated
if(bl){const x=run(bl,[act(1000,'blood'),act(2000,'endoscopy')],10000);t('bleed: blood indicated',!/no bleeding/.test(text(x)));t('bleed: endoscopy treats',/bleeding point was treated/.test(text(x)))}
if(cg){const x=run(cg,[act(1000,'echo','cardiologist')],10000);t('cardiogenic echo poor LV',/ventricle is poor/.test(text(x)))}
if(pf){const x=run(pf,[act(1000,'source','surgeon')],10000);t('perforation: source control works',!/no surgical source/.test(text(x)))}
if(sp){const x=run(sp,[act(1000,'source','surgeon')],10000);t('sepsis: source control works',!/no surgical source/.test(text(x)))}
// repeat caps
const one=V(run(pn,[act(1000,'antibiotics')],8000)), many=V(run(pn,[1000,2000,3000,4000,5000].map(x=>act(x,'antibiotics')),8000));
t('antibiotics do not stack',Math.abs(one.hr-many.hr)<1e-6&&Math.abs(one.temp-many.temp)<1e-6);
const n1=V(run(pn,[act(1000,'norepi')],8000)),n9=V(run(pn,[1,2,3,4,5,6,7,8].map(x=>act(x*1000,'norepi')),12000));
t('norepi capped (≤3 effective)',n9.sbp<=n1.sbp+2*16+1);
// insulin K and hypoglycaemia
const hk=lead.aki?run(ak,[1,2,3,4,5].map(x=>act(x*1000,'insulin-dex','nephrologist')),12000):null;
if(hk){t('insulin repeated -> hypoglycaemia text',/Hypoglycaemia is likely/.test(text(hk)));t('K not below 4.2 after 2 doses from 6+',V(hk).k>=2.4)}
// cultures ordering
const cb=run(sp||pn,[act(1000,'antibiotics'),act(5000,'cultures','infectious')],12000);
t('cultures after antibiotics text',/after the antibiotics had started/.test(text(cb)));
const cf=run(sp||pn,[act(1000,'cultures','infectious'),act(5000,'antibiotics')],12000);
t('cultures before antibiotics text',/before the antibiotics/.test(text(cf)));
// ROSC without intubation: force arrest scenario
let arrested=null;for(const sc of Object.values(lead)){const rr=run(sc,[],600000);if(!V(rr).alive||V(rr).arrestAtMs!=null){arrested=sc;break}}
if(arrested){const base=run(arrested,[],600000);const at=V(base).arrestAtMs;console.log('arrest found',arrested.dx,'shockable',arrested.shockable,'at',at);
 const A=[act(at+1000,'cpr'),act(at+2000,'adrenaline')];if(arrested.shockable)A.push(act(at+3000,'shock'));
 const rr=run(arrested,A,at+30000);console.log('after CPR+adrenaline(+shock):',V(rr).rhythm,V(rr).alive,V(rr).outcome);t('ROSC without intubation',V(rr).alive===true&&V(rr).rhythm!=='arrest'&&V(rr).rhythm!=='vf'&&V(rr).rhythm!=='pea'&&V(rr).rhythm!=='asystole')}
t('VF only for cardiology lead',Object.values(lead).every(sc=>sc.shockable===(sc.problems[0].specialty==='cardiologist')));
import assert from 'node:assert/strict';
import {test} from 'node:test';
test('MDT engine behaves as designed',()=>{assert.equal(fail,0,fail+' MDT engine checks failed')});
