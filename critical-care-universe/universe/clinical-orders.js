// Case-specific teaching rules, not a clinical decision support system.
const appropriate = text => ({level:'appropriate', text});
const conditional = text => ({level:'conditional', text});
const inappropriate = text => ({level:'inappropriate', text});
const action = (id, label, kind, assess, effect) => ({id, label, kind, assess, effect});
const fixed = (result, text) => () => result(text);

export const ORDER_CASES = {
 'Regular SVT': {
  target:{hr:95,sbp:120,spo2:98,rr:18},
  advanced:'The recorded rhythm is regular and narrow-complex. Reassess perfusion, blood pressure and the ECG before choosing treatment.',
  expert:'This case represents regular narrow-complex SVT, not an undifferentiated tachycardia. If instability develops, prioritize synchronized cardioversion and urgent help.',
  actions:[
   action('ecg','Obtain and review a 12-lead ECG','investigation',fixed(appropriate,'The recorded case ECG shows regular narrow-complex tachycardia. Monitor perfusion; the displayed waveform is illustrative.')),
   action('vagal','Attempt vagal manoeuvres','treatment',c=>c.sbp>=90&&c.map>=65?appropriate('A vagal manoeuvre is reasonable for stable, regular narrow-complex SVT.'):conditional('The patient may be unstable; prepare synchronized cardioversion and urgent help.')),
   action('adenosine','Adenosine for regular narrow-complex SVT','treatment',c=>c.sbp>=90&&c.map>=65?appropriate('Adenosine is an option for stable regular narrow-complex SVT with monitoring and appropriate precautions.'):conditional('With instability, prepare synchronized cardioversion; adenosine may be considered for a regular narrow-complex rhythm while preparing.')),
   action('metoprolol','Metoprolol','treatment',c=>c.sbp>=90&&c.map>=65?conditional('A beta-blocker can be considered for selected stable SVT after rhythm and contraindication review; it is not the immediate priority here.'):inappropriate('A beta-blocker can worsen hypotension; urgently address the unstable rhythm.')),
   action('esmolol','Esmolol','treatment',c=>c.sbp>=90&&c.map>=65?conditional('Esmolol may be considered in selected stable rhythms after contraindication and blood pressure review.'):inappropriate('A beta-blocker can worsen hypotension; urgently address the unstable rhythm.')),
   action('amiodarone','Amiodarone','treatment',fixed(conditional,'Its role depends on the rhythm and clinical context; it is not the routine first choice for this stable regular narrow-complex SVT.')),
   action('cardioversion','Synchronized cardioversion','treatment',c=>c.sbp<90||c.map<65?appropriate('With signs of instability, arrange immediate synchronized cardioversion and urgent help.'):conditional('Reserve urgent cardioversion for instability or an appropriate escalation plan; reassess the patient.')),
   action('unmonitored','Give an unmonitored IV beta-blocker without assessment','treatment',fixed(inappropriate,'Assess rhythm, perfusion, contraindications and blood pressure with monitoring before considering rate-control medication.'))
  ]
 },
 'Symptomatic bradycardia': {
  target:{hr:80,sbp:115,spo2:97,rr:18},
  advanced:'The patient is symptomatic with bradycardia and poor perfusion. Review the ECG and reversible causes.',
  expert:'This teaching case describes a sinus rhythm without known high-grade block. Reassess perfusion and response; arrange pacing or vasoactive support if atropine is ineffective.',
  actions:[
   action('ecg','ECG, monitoring and reversible-cause assessment','investigation',fixed(appropriate,'The recorded case ECG shows sinus bradycardia. Review oxygenation, medications and reversible causes without delaying treatment.')),
   action('atropine','Atropine','treatment',c=>c.sbp<90||c.map<65?appropriate('Atropine is an initial option for symptomatic bradycardia; monitor response and prepare escalation.'):conditional('Reassess whether bradycardia is causing symptoms and poor perfusion before treatment.')),
   action('pacing','Prepare transcutaneous pacing','treatment',c=>c.sbp<90||c.map<65?appropriate('Prepare pacing for symptomatic unstable bradycardia, especially if atropine is ineffective.'):conditional('Pacing depends on symptoms, rhythm and response; continue monitoring.')),
   action('adrenaline','Adrenaline infusion','treatment',c=>(c.sbp<90||c.map<65)&&c.atropine?appropriate('Consider an adrenaline infusion for persistent symptomatic bradycardia after atropine, alongside pacing and senior support.'):conditional('Reassess response to initial treatment and prepare pacing; vasoactive support may be indicated for persistent instability.')),
   action('dopamine','Dopamine infusion','treatment',c=>(c.sbp<90||c.map<65)&&c.atropine?appropriate('Dopamine is an alternative for persistent symptomatic bradycardia after atropine, alongside pacing and senior support.'):conditional('Reassess response to initial treatment and prepare pacing; vasoactive support may be indicated for persistent instability.')),
   action('beta','Give an IV beta-blocker for the slow pulse','treatment',fixed(inappropriate,'A beta-blocker may worsen bradycardia and hypotension.'))
  ]
 },
 'Severe asthma': {
  target:{hr:100,sbp:115,spo2:95,rr:16},
  advanced:'Expiratory flow does not return to zero; peak and plateau pressures are elevated. The patient is already intubated.',
  expert:'Consider dynamic hyperinflation, hypotension and pneumothorax. Check expiratory flow and plateau pressure rather than treating CO₂ alone.',
  actions:[
   action('flow','Inspect expiratory flow and airway pressures','investigation',fixed(appropriate,'Assess air trapping, obstruction and hemodynamics immediately.')),
   action('vent','Lengthen expiratory time and reassess ventilation','treatment',fixed(appropriate,'Reduce minute ventilation as appropriate and reassess for dynamic hyperinflation.'),'vent'),
   action('salbutamol','Salbutamol bronchodilator','treatment',fixed(appropriate,'Continue inhaled beta-agonist therapy while monitoring response and adverse effects.')),
   action('ipratropium','Ipratropium bronchodilator','treatment',fixed(appropriate,'Ipratropium is an adjunct in severe exacerbation, alongside other treatment.')),
   action('magnesium','IV magnesium','treatment',fixed(conditional,'Consider IV magnesium for severe asthma with inadequate response, with senior review and monitoring.')),
   action('rate','Increase ventilator rate without reassessing expiration','treatment',fixed(inappropriate,'Shortening expiration can worsen air trapping and hemodynamics.'))
  ]
 },
 'DKA': {
  target:{hr:90,sbp:120,spo2:98,rr:20},
  advanced:'Initial glucose 520 mg/dL and ketones 6.1 mmol/L. Follow potassium, acid-base status and fluid balance.',
  expert:'Insulin may further lower potassium. Potassium, pH and renal function must be reassessed; bicarbonate is not routine.',
  actions:[
   action('labs','Repeat potassium, glucose and acid-base assessment','investigation',fixed(appropriate,'Recheck electrolytes, glucose and acid-base status frequently.')),
   action('fluid','Isotonic fluid with reassessment','treatment',fixed(appropriate,'Use isotonic fluid guided by perfusion and signs of overload.')),
   action('potassium','Potassium replacement with monitoring','treatment',c=>c.k<3.5?appropriate('Replace potassium and recheck it before starting insulin.'):conditional('Further replacement depends on repeat potassium, renal function and the local protocol.'),'kcl'),
   action('insulin','Regular insulin infusion','treatment',c=>c.k<3.5?inappropriate('Potassium is below 3.5 mmol/L: defer insulin, replace potassium and recheck.'):c.insulin>0?conditional('Insulin is already running in the simulation. Review glucose, potassium and the protocol before changing it.'):appropriate('Potassium is at least 3.5 mmol/L; protocol-guided insulin can be considered with continued potassium and glucose monitoring.')),
   action('bicarbonate','Bicarbonate','treatment',c=>c.ph<7?conditional('Severe acidemia may warrant bicarbonate consideration with senior input and potassium monitoring.'):inappropriate('Bicarbonate is not routine at this pH and may worsen hypokalemia.'))
  ]
 },
 'Hypertensive pulmonary edema': {
  target:{hr:90,sbp:145,spo2:95,rr:20},
  advanced:'The case describes pulmonary congestion and severe hypertension while on NIV. Reassess oxygenation, blood pressure and volume status.',
  expert:'Differentiate hypertensive congestion from low-output shock before vasodilators or inotropes; review contraindications and response.',
  actions:[
   action('assessment','Reassess breathing, BP and volume status','investigation',fixed(appropriate,'Check respiratory effort, oxygenation, blood pressure and response to NIV.')),
   action('niv','Optimize NIV and oxygenation','treatment',fixed(appropriate,'Reassess NIV fit, respiratory effort and oxygenation; escalate if failing.')),
   action('nitrate','Titrated IV nitrate','treatment',c=>c.sbp<90?inappropriate('Hypotension makes vasodilators potentially harmful; reassess perfusion and escalate.'):c.sbp<110?conditional('Blood pressure is borderline; reassess perfusion and contraindications with senior support before vasodilators.'):c.nitrate>=20?conditional('The simulated nitrate infusion is at its control limit; reassess and escalate rather than automatically increasing it.'):appropriate('A nitrate can be considered in hypertensive pulmonary edema with blood pressure and contraindication review.')),
   action('furosemide','Furosemide for congestion','treatment',fixed(appropriate,'A loop diuretic is reasonable for this congested patient; monitor renal function and response.')),
   action('inotrope','Inotrope','treatment',fixed(conditional,'Inotropes are reserved for selected low-output states with hypoperfusion, not routine hypertensive pulmonary edema.')),
   action('fluid','Unassessed large fluid bolus','treatment',fixed(inappropriate,'Unselected fluid may worsen pulmonary congestion.'))
  ]
 },
 'Status epilepticus': {
  target:{hr:100,sbp:130,spo2:97,rr:20},
  advanced:'The case describes ongoing generalized convulsions for 15 minutes. Glucose was 110 mg/dL.',
  expert:'Support airway and oxygenation, treat promptly, and escalate if seizures persist. Apparent cessation of movement does not exclude nonconvulsive seizures.',
  actions:[
   action('glucose','Check glucose and support airway','investigation',fixed(appropriate,'Support airway and oxygenation, check glucose and call for urgent help.')),
   action('lorazepam','IV lorazepam','treatment',c=>c.benzo?conditional('A benzodiazepine has already been selected; reassess response and follow the status protocol rather than repeating blindly.'):appropriate('A protocol-guided benzodiazepine is an initial treatment for ongoing convulsive status.'),'benzo'),
   action('midazolam','Midazolam','treatment',c=>c.benzo?conditional('A benzodiazepine has already been selected; reassess response and follow the status protocol.'):appropriate('Midazolam is a benzodiazepine option; choose route and dose according to access and protocol.'),'benzo'),
   action('levetiracetam','Levetiracetam','treatment',c=>c.benzo?appropriate('For persistent seizures after a benzodiazepine, give a protocol-guided second-line antiseizure medicine.'):conditional('Second-line antiseizure therapy is needed if seizures persist after prompt benzodiazepine treatment.')),
   action('eeg','Arrange EEG if ongoing or nonconvulsive seizures suspected','investigation',fixed(appropriate,'Arrange EEG when persistent or nonconvulsive seizure activity is suspected; do not delay initial treatment.')),
   action('delay','Wait without treating the ongoing seizure','treatment',fixed(inappropriate,'Delay can allow ongoing seizure-related injury.'))
  ]
 },
 'AKI, hyperkalemia': {
  target:{hr:75,sbp:130,spo2:97,rr:18},
  advanced:'The case describes anuria, potassium 7.2 mmol/L and ECG changes. Recheck potassium and glucose after treatment.',
  expert:'Calcium protects the myocardium but does not remove potassium. Potassium shifting is temporary; anuria requires urgent definitive removal planning.',
  actions:[
   action('ecg','Continuous ECG and repeat potassium','investigation',fixed(appropriate,'The initial case ECG shows peaked T waves and a widened QRS. Monitor and repeat potassium without delaying treatment.')),
   action('calcium','IV calcium gluconate','treatment',fixed(appropriate,'Give protocol-guided IV calcium for ECG changes and reassess the ECG.')),
   action('insulin-glucose','Insulin with glucose','treatment',fixed(appropriate,'Use protocol-guided insulin with glucose to shift potassium and monitor for hypoglycemia.')),
   action('salbutamol','Salbutamol as adjunct','treatment',fixed(conditional,'Salbutamol may be an adjunct to potassium shifting; it does not replace calcium or definitive removal.')),
   action('dialysis','Urgent nephrology and dialysis','treatment',fixed(appropriate,'Arrange urgent definitive potassium removal in this anuric patient.')),
   action('resin','Oral resin only and recheck in six hours','treatment',fixed(inappropriate,'This is too slow for severe hyperkalemia with ECG changes.'))
  ]
 },
 'Septic shock': {
  target:{hr:95,sbp:115,spo2:97,rr:20},
  advanced:'Initial lactate was 5.2 mmol/L. Initial fluids were given and the urinary tract is obstructed and infected.',
  expert:'Interpret MAP with perfusion, fluid responsiveness and signs of overload. Cardiac output, SVR and fluid responsiveness are not measured by this simulator.',
  actions:[
   action('perfusion','Reassess perfusion and fluid responsiveness','investigation',fixed(appropriate,'Reassess perfusion and signs of overload before further fluids; the simulator does not measure fluid responsiveness.')),
   action('norepinephrine','Norepinephrine','treatment',c=>c.map>=65?conditional('MAP is at or above the initial target; review perfusion and existing vasopressor support before titrating.'):c.norepinephrine>=30?conditional('The simulated infusion is at its control limit. Reassess perfusion and escalate rather than automatically increasing it.'):appropriate('Norepinephrine is first-line for persistent hypotension after initial fluid assessment; titrate and reassess.')),
   action('vasopressin','Vasopressin','treatment',c=>c.norepinephrine>0&&c.map<65?conditional('Consider adding vasopressin for persistent hypotension despite norepinephrine with senior review.'):conditional('Review the norepinephrine dose, MAP and overall perfusion before considering vasopressin.')),
   action('antibiotics','Review or adjust antibiotics','treatment',fixed(conditional,'Antibiotics were already started. Review source, timing, cultures, allergies and local guidance before changing therapy.')),
   action('source','Arrange urgent urinary source control','treatment',fixed(appropriate,'Arrange urgent urologic source control for the obstructed infected urinary tract.')),
   action('fluid','Repeat a large fluid bolus without reassessment','treatment',fixed(inappropriate,'Unassessed repeated fluid may worsen overload; reassess responsiveness and perfusion.'))
  ]
 }
};

export function assessOrder(dx, id, context) {
 const profile=ORDER_CASES[dx];
 if(!profile)throw new Error('No simulated orders for '+dx);
 const choice=profile.actions.find(a=>a.id===id);
 if(!choice)throw new Error('Unknown simulated order '+id+' for '+dx);
 return {choice,...choice.assess(context)};
}
