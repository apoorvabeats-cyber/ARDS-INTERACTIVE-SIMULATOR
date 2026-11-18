/* Critical care complication engine: shared by map.html and lab.html.
   A complication is data (db.json). Its state variables follow severity s (0..1) linearly,
   interventions add fixed deltas, and each 3D archetype draws from the resulting variables. */
(function(g){
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const D={
 vessel:{flow:1,sat:1,leak:0,clot:0,bleed:0,isch:0},
 heart:{con:1,rvf:1,rvdil:0,lvdil:0,congest:0,sept:0,rate:.3},
 alveolus:{vent:.5,stretch:0,leak:0,fluid:0,fibro:0,inflam:0},
 nephron:{gfr:1,injury:0,urea:0,k:0,acid:0},
 brain:{swell:0,mass:0,shift:0,hern:0,isch:0,perf:1,amm:0},
 cell:{mem:0,outer:0,inner:.5,leak:0,mito:1,store:1,tox:0,swell:0}};
const VN={flow:'blood flow',sat:'oxygen saturation',leak:'leak',clot:'clotting',bleed:'bleeding',isch:'ischaemia',con:'contractility',rvf:'right ventricular function',rvdil:'right ventricular dilatation',lvdil:'left ventricular dilatation',congest:'venous congestion',sept:'septal shift',rate:'heart rate',vent:'ventilation',stretch:'alveolar overdistension',fluid:'alveolar fluid',fibro:'fibrosis',inflam:'inflammation',gfr:'filtration',injury:'tubular injury',urea:'urea',k:'potassium',acid:'acid',swell:'swelling',mass:'mass lesion',shift:'midline shift',hern:'herniation',perf:'brain perfusion',amm:'ammonia',mem:'membrane damage',outer:'outside concentration',inner:'inside concentration',mito:'mitochondrial function',store:'energy stores',tox:'toxins'};
function vars(c,s,on){const A=D[c.scene.a],o=Object.assign({},A);
 for(const k in c.state){const p=c.state[k];o[k]=p[0]+p[1]*s}
 (c.rx||[]).forEach(d=>{if(on&&on[d.id])for(const k in d.fx)o[k]=(o[k]!==undefined?o[k]:(A[k]||0))+d.fx[k]});
 for(const k in o)o[k]=clamp(o[k]);return o}
const vn=(c,k)=>(c.vn&&c.vn[k])||VN[k]||k;
function val(c,v,j){const o=c.outs[j];return o[2]+(o[3]-o[2])*v[o[1]]}
function fmt(c,v,j){const o=c.outs[j],x=val(c,v,j),dg=o[7]|0;return o[0]+' '+x.toFixed(dg)+(o[4]?' '+o[4]:'')}
function warn(c,v,j){const o=c.outs[j],x=val(c,v,j);return o[5]==='<'?x<o[6]:o[5]==='>'?x>o[6]:false}
function effect(c,d){const up=[],dn=[];for(const k in d.fx){if(d.fx[k]>=.05)up.push(vn(c,k));else if(d.fx[k]<=-.05)dn.push(vn(c,k))}
 return (up.length?'Raises '+up.join(' and ')+'. ':'')+(dn.length?'Lowers '+dn.join(' and ')+'. ':'')}
function presets(c){const h=c.rx.filter(d=>d.t==='helps').map(d=>d.id),b=c.rx.find(d=>d.t==='harms');
 const P=[['Early',.25,[],'Early disease: the first changes appear.'],['Established',.5,[],'Established disease with clear organ effects.'],['Severe',.8,[],'Severe disease: the cells are failing.'],['Critical',1,[],'Critical disease: the complication threatens life.']];
 if(h.length)P.push(['Best care',.8,h,'Severe disease with every helpful measure switched on.']);
 if(b)P.push([b.n+' error',.6,[b.id],'Moderate disease made worse by '+b.n.toLowerCase()+'. '+b.note+'.']);
 return P}
const phase=s=>s<.25?0:s<.5?1:s<.75?2:3;
const sevOf=(c,p,treat)=>clamp((p-c.on)/(1-c.on))**.8*(c.m||1)*(treat?.5:1);
g.CCE={clamp,D,VN,vars,vn,val,fmt,warn,effect,presets,phase,sevOf};
})(window);
