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
   action('steroid','Systemic corticosteroid','treatment',fixed(appropriate,'Give a systemic corticosteroid early in severe asthma; the benefit builds over hours, so continue bronchodilators and ventilator strategy meanwhile.')),
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
   action('salbutamol','Salbutamol as adjunct','treatment',c=>c.calcium>0?appropriate('Salbutamol is a reasonable adjunct after membrane stabilization; it does not replace insulin with glucose or definitive removal.'):conditional('Give calcium first. Salbutamol is only an adjunct to potassium shifting and does not replace calcium or definitive removal.')),
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
   action('antibiotics','Review antibiotics (already started)','treatment',fixed(conditional,'Antibiotics were already started. Review source, timing, cultures, allergies and local guidance before changing therapy.')),
   action('source','Arrange urgent urinary source control','treatment',fixed(appropriate,'Arrange urgent urologic source control for the obstructed infected urinary tract.')),
   action('fluid','Repeat a large fluid bolus without reassessment','treatment',fixed(inappropriate,'Unassessed repeated fluid may worsen overload; reassess responsiveness and perfusion.'))
  ]
 },
 'ARDS': {
  target:{hr:90,sbp:120,spo2:93,rr:24},
  advanced:'Severe pneumonia, day 3, intubated. SpO₂ 84% on FiO₂ 80% and PEEP 10 with Vt 6 mL/kg predicted body weight. Check an ABG, plateau pressure and driving pressure.',
  expert:'Interpret oxygenation with PaO₂/FiO₂, plateau pressure (aim 30 cmH₂O or less), driving pressure and hemodynamics. This simulator does not calculate a P/F ratio.',
  actions:[
   action('abg','Arterial blood gas and ventilator mechanics (plateau and driving pressure)','investigation',fixed(appropriate,'Check the ABG and measure plateau and driving pressure before changing settings; the simulator shows estimated values under Support.')),
   action('protect','Confirm lung-protective settings (Vt 4 to 8 mL/kg PBW, plateau 30 or less)','treatment',c=>c.perKg>8||c.pplat>30?conditional('Current settings exceed the lung-protective limits (Vt above 8 mL/kg or plateau above 30). Lower the tidal volume under Support, then reassess.'):appropriate('Settings are within lung-protective limits. Keep Vt at 4 to 8 mL/kg predicted body weight and plateau at 30 cmH₂O or less.')),
   action('prone','Prone positioning, at least 12 hours a day (ideally 16)','treatment',fixed(appropriate,'Prolonged prone positioning, at least 12 hours a day and ideally 16, is recommended in severe ARDS. Secure the tube and lines and reassess oxygenation.'),'prone'),
   action('peep','Titrate PEEP and FiO₂ together','treatment',c=>c.pplat>30?conditional('Plateau is above 30 cmH₂O. Do not raise PEEP further without lowering tidal volume and reassessing mechanics.'):appropriate('Titrate PEEP and FiO₂ together to the oxygenation target while checking plateau pressure and hemodynamics.')),
   action('paralysis','Continuous neuromuscular blockade','treatment',fixed(conditional,'Reserve for selected patients with severe dyssynchrony or refractory hypoxemia after sedation is optimized and proning is under way; it is not routine.')),
   action('ecmo','Refer for ECMO assessment','treatment',fixed(conditional,'Consider early discussion at an experienced ECMO centre if severe hypoxemia persists despite optimized ventilation and proning; transfer needs senior support.')),
   action('vt10','Raise tidal volume to 10 mL/kg and lower PEEP','treatment',fixed(inappropriate,'Harmful. Use 4 to 8 mL/kg predicted body weight and keep plateau pressure at 30 cmH₂O or less.'))
  ]
 },
 'COPD, hypercapnic failure': {
  target:{hr:95,sbp:135,spo2:90,rr:22},
  advanced:'pH 7.22 with PaCO₂ 86 mmHg and SpO₂ 84% despite NIV. He is drowsy but arousable.',
  expert:'Target SpO₂ 88 to 92%. Escalate when pH stays below 7.25 or alertness worsens despite optimized NIV. High-flow 100% oxygen can worsen hypercapnia.',
  actions:[
   action('abg','Repeat ABG after NIV adjustment','investigation',fixed(appropriate,'Repeat the ABG about 1 to 2 hours after NIV changes. The case gas shows pH 7.22 and PaCO₂ 86 mmHg.')),
   action('niv','Optimize NIV mask fit and settings, then reassess','treatment',c=>c.ph<7.25?conditional('pH is below 7.25 and he is still hypoxemic and drowsy. Optimization alone is not enough: call senior/ICU airway review and prepare to intubate if there is no improvement.'):appropriate('Check mask leak, synchrony and pressures, then reassess gas exchange and alertness within 1 to 2 hours.')),
   action('icu','Urgent senior/ICU airway review and prepare to intubate','treatment',fixed(appropriate,'Persistent hypoxemia with drowsiness needs immediate escalation. Prepare to intubate if NIV is failing.')),
   action('bronchodilator','Nebulized bronchodilators','treatment',fixed(appropriate,'Give salbutamol and ipratropium, preferably air-driven during NIV, alongside controlled oxygen.')),
   action('steroid','Systemic corticosteroid','treatment',fixed(appropriate,'A short systemic corticosteroid course is standard for a COPD exacerbation.')),
   action('oxygen','Give high-flow 100% oxygen','treatment',fixed(inappropriate,'Uncontrolled oxygen can worsen hypercapnia. Titrate to SpO₂ 88 to 92%.')),
   action('sedate','Sedate to improve NIV tolerance','treatment',fixed(inappropriate,'Sedation can reduce ventilatory drive and airway protection in a drowsy hypercapnic patient.'))
  ]
 },
 'Cardiogenic shock': {
  target:{hr:95,sbp:100,spo2:95,rr:20},
  advanced:'Anterior STEMI 14 hours ago with a stent to the LAD. SBP 78, lactate 4 mmol/L and ScvO₂ 48%, congested on NIV.',
  expert:'Look for ongoing ischemia and mechanical complications (septal rupture, papillary muscle rupture, free-wall rupture) and RV involvement. Mechanical circulatory support needs shock-team input. Cardiac output is not measured here.',
  actions:[
   action('echo','Urgent echocardiogram for ventricular function and mechanical complications','investigation',fixed(appropriate,'Echo can show LV and RV function, valve regurgitation and mechanical complications. It does not delay vasoactive support.')),
   action('shockteam','Activate the shock team and cath-lab review','treatment',fixed(appropriate,'Early shock-team review guides revascularization and the choice of vasoactive or mechanical support.')),
   action('norepinephrine','Norepinephrine','treatment',c=>c.map>=65?conditional('MAP is at or above the initial target. Review perfusion and existing vasopressor support before titrating.'):c.norepinephrine>=30?conditional('The simulated infusion is at its control limit. Reassess and escalate rather than automatically increasing it.'):appropriate('Norepinephrine is the usual first vasopressor in cardiogenic shock. Titrate to MAP and reassess perfusion.')),
   action('dobutamine','Dobutamine','treatment',c=>c.norepinephrine>0||c.map>=65?appropriate('Add an inotrope once MAP is supported, with rhythm and perfusion monitoring.'):conditional('Support MAP with a vasopressor first. Dobutamine alone can lower blood pressure.')),
   action('furosemide','Furosemide for congestion','treatment',c=>c.map<65?conditional('Diuresis while hypotensive can worsen hypoperfusion. Stabilize perfusion first.'):appropriate('A loop diuretic is reasonable for congestion once perfusion is supported. Monitor renal function and response.')),
   action('nitrate','Intravenous nitroglycerin','treatment',fixed(inappropriate,'Vasodilators can drop blood pressure further in cardiogenic shock. Avoid them while hypotensive.')),
   action('fluid','Unassessed large fluid bolus','treatment',fixed(inappropriate,'She is congested. Unselected fluid can worsen pulmonary edema.')),
   action('beta','IV beta-blocker','treatment',fixed(inappropriate,'Negative inotropy can worsen cardiogenic shock.'))
  ]
 },
 'Severe TBI': {
  target:{hr:80,sbp:130,spo2:98,rr:16},
  advanced:'GCS 6 with a blown right pupil and ICP 32 mmHg. Intubated, head-up, ICP monitor in place. CPP is roughly MAP minus ICP.',
  expert:'Treat suspected herniation with hyperosmolar therapy, then urgent CT and neurosurgical review. Avoid hypoxemia and hypotension, keep PaCO₂ near normal, and watch sodium and osmolality during osmotherapy. Hyperventilation is only a brief rescue bridge.',
  actions:[
   action('ct','Urgent CT head and neurosurgical review','investigation',fixed(appropriate,'Imaging and neurosurgical review are needed for suspected herniation. Do not delay hyperosmolar therapy for the scan.')),
   action('sodium','Repeat sodium and osmolality','investigation',fixed(appropriate,'Check sodium and osmolality during hyperosmolar therapy and before repeat doses.')),
   action('saline','3% saline bolus','treatment',c=>c.k>=155?conditional('Sodium is already high. Recheck sodium and osmolality before further hyperosmolar therapy.'):appropriate('Hypertonic saline is a hyperosmolar option for suspected herniation. Recheck sodium after dosing.')),
   action('mannitol','Mannitol','treatment',c=>c.map<65||c.sbp<100?conditional('Mannitol can lower blood pressure by osmotic diuresis. Make sure volume status and CPP are adequate first.'):appropriate('Mannitol is an alternative hyperosmolar agent. Monitor volume status, BP and osmolality.')),
   action('headup','Maintain head-up 30° with a neutral neck','treatment',fixed(appropriate,'Head-up positioning with a neutral neck supports venous drainage and lowers ICP.')),
   action('sedation','Optimize analgesia and sedation, treat shivering and pain','treatment',fixed(appropriate,'Pain, agitation and shivering raise ICP. Keep sedation adequate while avoiding hypotension.')),
   action('hyperventilate','Prolonged hyperventilation to PaCO₂ 20','treatment',fixed(inappropriate,'Prolonged marked hypocapnia can reduce cerebral blood flow. Use hyperventilation only as a brief rescue bridge.')),
   action('flat','Lay the head flat for perfusion','treatment',fixed(inappropriate,'This can worsen intracranial pressure. Keep the head up when feasible.'))
  ]
 },
 'Massive pulmonary embolism': {
  target:{hr:100,sbp:105,spo2:94,rr:22},
  advanced:'Collapse after a long flight. BP 82/50, SpO₂ 86% and an RV/LV ratio of 1.4 on echo.',
  expert:'High-risk PE with shock needs urgent reperfusion. Avoid large fluid loads and induction without hemodynamic preparation. Check contraindications and bleeding risk before thrombolysis; catheter-directed therapy or surgical embolectomy are alternatives.',
  actions:[
   action('echo','Bedside echocardiogram (RV size and function)','investigation',fixed(appropriate,'The case echo shows a dilated right ventricle with an RV/LV ratio of 1.4.')),
   action('ctpa','CT pulmonary angiography before treatment','investigation',fixed(conditional,'Do not transport an unstable patient for CT. Bedside echo with the clinical picture can justify reperfusion therapy.')),
   action('anticoag','Start unfractionated heparin','treatment',fixed(appropriate,'Unfractionated heparin is preferred when reperfusion may follow. Follow the local protocol.')),
   action('norepinephrine','Norepinephrine','treatment',c=>c.map>=65?conditional('MAP is at or above the initial target. Review perfusion and existing vasopressor support before titrating.'):appropriate('A vasopressor supports right-ventricular perfusion while reperfusion is arranged. Titrate and reassess.')),
   action('thrombolysis','Systemic thrombolysis if there are no contraindications','treatment',c=>c.sbp<90?appropriate('Shock with high-risk PE is an indication for reperfusion. Check contraindications and follow the local protocol.'):conditional('Reperfusion is indicated for persistent shock. Reassess blood pressure and bleeding risk before committing.')),
   action('fluid','Give 2 L of fluid to fill the right heart','treatment',fixed(inappropriate,'Large empiric fluid loads can overdistend a failing right ventricle.')),
   action('oral','Start an oral anticoagulant and observe','treatment',fixed(inappropriate,'Too slow for a patient in shock.'))
  ]
 },
 'Variceal bleed': {
  target:{hr:100,sbp:110,spo2:97,rr:20},
  advanced:'Hb 6.4 g/dL, BP 84/50 and ongoing hematemesis in cirrhosis. Platelets 70 and INR 1.8.',
  expert:'Use a restrictive transfusion target (Hb about 7 to 8 g/dL) and avoid large crystalloid loads. Start a vasoactive drug and antibiotics before endoscopy. Protect the airway if hematemesis continues or consciousness falls. FFP does not reliably correct cirrhotic coagulopathy.',
  actions:[
   action('airway','Reassess consciousness and airway protection before endoscopy','investigation',fixed(appropriate,'Consider intubation before endoscopy if hematemesis is ongoing or consciousness is reduced.')),
   action('transfuse','Transfuse packed red cells (restrictive target)','treatment',c=>c.k>=8?conditional('Hb has reached the restrictive target. Further transfusion can raise portal pressure and rebleeding.'):appropriate('Transfuse cautiously toward a restrictive Hb target and reassess after each unit.')),
   action('terlipressin','Start terlipressin','treatment',fixed(appropriate,'Start vasoactive therapy early for suspected variceal bleeding, following the local protocol.')),
   action('ceftriaxone','Start ceftriaxone','treatment',fixed(appropriate,'Antibiotic prophylaxis lowers infection and mortality in cirrhotic variceal bleeding.')),
   action('endoscopy','Urgent endoscopy after initial resuscitation','treatment',fixed(appropriate,'Endoscopy within 12 hours once resuscitated allows banding of the bleeding varix.')),
   action('ffp','Correct the INR with plasma','treatment',fixed(conditional,'Plasma does not reliably correct cirrhotic coagulopathy and adds volume. Follow local transfusion guidance.')),
   action('crystalloid','Large crystalloid volume to MAP 90','treatment',fixed(inappropriate,'Excessive fluid raises portal pressure and the risk of rebleeding.')),
   action('propranolol','Start propranolol to slow the heart rate','treatment',fixed(inappropriate,'Nonselective beta-blockers are not started to treat acute hemorrhagic shock.'))
  ]
 },
 'Dengue shock': {
  target:{hr:100,sbp:105,spo2:97,rr:20},
  advanced:'Day 5 of fever, platelets 18, hematocrit 48% and a pulse pressure of 15 mmHg with cold extremities.',
  expert:'Titrate isotonic crystalloid against hematocrit, pulse pressure, urine output and lung findings, and reduce fluid as perfusion improves. If hematocrit falls with persistent shock, look for occult bleeding.',
  actions:[
   action('hct','Repeat hematocrit, pulse pressure and urine output','investigation',fixed(appropriate,'Frequent reassessment guides fluid. The case hematocrit is 48% with a narrow pulse pressure.')),
   action('fluid','Isotonic crystalloid bolus with reassessment','treatment',c=>c.fluid>=3?conditional('Several boluses have been given. Reassess hematocrit, pulse pressure and signs of overload, and consider colloid or occult bleeding.'):appropriate('Give a cautious isotonic bolus and reassess perfusion, hematocrit and signs of overload.')),
   action('colloid','Colloid if shock persists after crystalloid','treatment',c=>c.fluid>=2?appropriate('Persistent shock after crystalloid boluses can justify colloid, with close reassessment for overload.'):conditional('Give and reassess crystalloid first. Colloid is for shock that persists.')),
   action('platelets','Prophylactic platelet transfusion','treatment',fixed(inappropriate,'It does not treat shock and can add to overload.')),
   action('steroids','IV steroids to raise platelets','treatment',fixed(inappropriate,'Steroids do not treat dengue shock.')),
   action('fixedvol','Fixed repeated large boluses without reassessment','treatment',fixed(inappropriate,'A fixed repeated-volume strategy risks overload as plasma leak settles. Titrate to perfusion.'))
  ]
 },
 'Organophosphate poisoning': {
  target:{hr:90,sbp:110,spo2:95,rr:18},
  advanced:'Pinpoint pupils, bronchorrhea, HR 48 and SBP 88 after a pesticide ingestion 3 hours ago. He is intubated.',
  expert:'Titrate atropine to clear chest secretions, with heart rate above about 80 and systolic BP above 80. Pupil size is not the end point. Pralidoxime is an adjunct per local protocol. Watch for intermediate syndrome.',
  actions:[
   action('reassess','Suction and reassess secretions, heart rate and pupils','investigation',fixed(appropriate,'The case shows a secretion score of 3 out of 3. Titrate atropine to drying of the chest, not to pupil size.')),
   action('atropine','IV atropine, titrated to a dry chest','treatment',fixed(appropriate,'Titrate atropine to control bronchial secretions and improve heart rate and blood pressure. Avoid excess, which causes delirium and hyperthermia.')),
   action('decon','Decontaminate: remove clothing, wash skin, staff PPE','treatment',fixed(appropriate,'Remove contaminated clothing and wash the skin. Staff need protective equipment.')),
   action('pralidoxime','Pralidoxime per toxicology protocol','treatment',c=>c.atr>0?appropriate('Pralidoxime is an adjunct after atropine has started. Follow the local toxicology protocol.'):conditional('Start atropine first. Pralidoxime is an adjunct, not a replacement.')),
   action('neostigmine','Neostigmine to reverse the weakness','treatment',fixed(inappropriate,'It adds to the cholinergic crisis.')),
   action('praliOnly','Pralidoxime alone, without atropine','treatment',fixed(inappropriate,'Atropine is needed to control the muscarinic secretions.'))
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
