// Educational prompts only. They do not represent measured outcomes or clinical orders.
export const FOLLOW_UPS = {
  'ARDS': [
    ['How should oxygenation be assessed?', 'Check an arterial blood gas and reassess oxygenation; do not infer PaO2 from the monitor alone.'],
    ['What ventilation strategy should be checked?', 'Check tidal volume against predicted body weight and measure plateau pressure for lung-protective ventilation.'],
    ['If severe hypoxemia persists, what supportive intervention should be considered?', 'Assess suitability for prolonged prone positioning with an experienced team.'],
    ['How should the team continue care?', 'Reassess gas exchange, mechanics and hemodynamics, investigate the cause and escalate persistent deterioration.']
  ],
  'Septic shock': [
    ['What needs urgent attention beyond circulatory support?', 'Arrange urgent urologic source control for the obstructed infected urinary tract.'],
    ['How should antimicrobials be managed?', 'Confirm prompt appropriate antibiotics and review cultures, allergies and local guidance.'],
    ['How should further fluid be considered?', 'Reassess perfusion, fluid responsiveness and signs of overload before further fluid.'],
    ['What should guide ongoing shock management?', 'Trend perfusion and lactate, reassess blood pressure and titrate vasopressors with senior support.']
  ],
  'DKA': [
    ['What is the immediate concern before starting insulin?', 'Replace potassium and recheck it; defer insulin while potassium is below 3.5 mmol/L.'],
    ['How should circulation be supported?', 'Give isotonic fluid guided by clinical status and reassess for overload.'],
    ['Once potassium is safe, what is the next metabolic treatment?', 'Start protocol-guided insulin with frequent glucose and electrolyte monitoring.'],
    ['How should the team assess resolution?', 'Follow ketones, acid-base status, glucose and potassium; do not rely on glucose alone.']
  ],
  'Severe TBI': [
    ['What immediate physiological threats need attention?', 'Avoid hypoxemia and hypotension while urgently assessing airway and circulation.'],
    ['What positioning should be checked?', 'Keep the head elevated when feasible and avoid obstruction to venous drainage.'],
    ['What rescue treatment should the team consider?', 'Consider hyperosmolar therapy with specialist guidance while arranging urgent imaging and neurosurgical review.'],
    ['How should ventilation and neurological status be followed?', 'Monitor neurologic status and ventilation; avoid prolonged profound hypocapnia and escalate deterioration.']
  ],
  'Cardiogenic shock': [
    ['What potential causes of worsening shock need urgent review?', 'Assess for ongoing ischemia and mechanical complications with the shock team.'],
    ['How should a fluid challenge be considered?', 'Reassess volume status and congestion; avoid an unselected large fluid bolus.'],
    ['What circulatory support is appropriate to discuss?', 'Individualize vasoactive or inotropic support with senior or shock-team guidance.'],
    ['What should be reassessed during NIV and shock treatment?', 'Follow perfusion, blood pressure, respiratory effort and oxygenation; escalate if support is failing.']
  ],
  'AKI, hyperkalemia': [
    ['What should be monitored immediately?', 'Obtain continuous cardiac monitoring and reassess the ECG for hyperkalemic changes.'],
    ['What follows cardiac membrane stabilization?', 'Use a protocol-guided potassium-shifting treatment and monitor blood glucose.'],
    ['How should potassium be removed in this anuric patient?', 'Arrange urgent nephrology review and dialysis for definitive potassium removal.'],
    ['What requires repeat assessment?', 'Repeat potassium, ECG and glucose after treatment and watch for recurrent hyperkalemia.']
  ],
  'Severe asthma': [
    ['What should ventilator assessment focus on?', 'Check expiratory flow, plateau pressure and hemodynamics for dynamic hyperinflation.'],
    ['How should the ventilation plan address air trapping?', 'Allow more expiratory time and reassess minute ventilation rather than reflexively increasing the rate.'],
    ['What ongoing disease treatment should be checked?', 'Continue bronchodilator treatment and assess systemic corticosteroid therapy using local protocols.'],
    ['What should prompt urgent escalation?', 'Worsening pressures, oxygenation or hypotension require immediate reassessment for obstruction, air trapping or pneumothorax.']
  ],
  'Massive pulmonary embolism': [
    ['What should the team do while assessing shock?', 'Call for urgent senior and PE-team support and assess airway, circulation and right ventricular function.'],
    ['How should reperfusion be considered?', 'Assess eligibility and bleeding risks for urgent reperfusion, including systemic thrombolysis when appropriate.'],
    ['How should fluids be approached?', 'Avoid an unselected large fluid bolus and reassess right ventricular function and perfusion.'],
    ['What should guide subsequent care?', 'Reassess perfusion and oxygenation, and coordinate anticoagulation timing with the chosen reperfusion protocol.']
  ],
  'Hypertensive pulmonary edema': [
    ['What respiratory support should be reassessed?', 'Reassess work of breathing and oxygenation during NIV and escalate if ventilation is failing.'],
    ['What blood pressure treatment is relevant?', 'Consider titrated IV nitroglycerin with close blood pressure monitoring and contraindication review.'],
    ['When should a loop diuretic be considered?', 'Assess volume status and give a loop diuretic if clinically overloaded.'],
    ['What should the team monitor next?', 'Reassess blood pressure, breathing, oxygenation and response while investigating the precipitating cause.']
  ],
  'Variceal bleed': [
    ['What immediate resuscitation priorities apply?', 'Assess airway and circulation, establish access and arrange blood products with careful reassessment.'],
    ['What disease-specific medication should be considered early?', 'Start protocol-guided vasoactive therapy and antibiotic prophylaxis for suspected variceal bleeding.'],
    ['What definitive intervention must be arranged?', 'Arrange urgent endoscopic assessment after initial stabilization with specialist involvement.'],
    ['How should transfusion be approached?', 'Use a cautious restrictive strategy individualized to ongoing bleeding and clinical status; monitor for rebleeding.']
  ],
  'Dengue shock': [
    ['What findings should guide fluid therapy?', 'Reassess perfusion, pulse pressure, hematocrit and signs of fluid overload frequently.'],
    ['What is the appropriate immediate circulatory approach?', 'Give cautious isotonic crystalloid and reassess promptly rather than repeating fixed volumes blindly.'],
    ['How should falling platelets be interpreted?', 'Assess for clinically significant bleeding; platelet count alone does not treat the shock.'],
    ['What change requires escalation?', 'Persistent shock, bleeding or fluid overload warrants urgent senior review and a revised plan.']
  ],
  'Organophosphate poisoning': [
    ['What protects the care team and limits exposure?', 'Use appropriate protective measures and decontaminate while supporting airway and ventilation.'],
    ['What response guides atropine titration?', 'Titrate atropine to control bronchial secretions and improve ventilation under toxicology guidance.'],
    ['What additional therapy should be considered?', 'Consult toxicology about pralidoxime when indicated; it does not replace atropine.'],
    ['What should be monitored after initial treatment?', 'Reassess secretions, ventilation, heart rate and recurrence of toxicity with specialist support.']
  ],
  'Status epilepticus': [
    ['What should be checked immediately alongside seizure treatment?', 'Support airway and oxygenation, check glucose and call for urgent assistance.'],
    ['If seizure activity persists after a benzodiazepine, what follows?', 'Give a protocol-guided second-line antiseizure medication promptly.'],
    ['How should ongoing seizure activity be assessed?', 'Reassess clinically and arrange EEG when ongoing or nonconvulsive seizures are suspected.'],
    ['What if seizures continue despite initial therapies?', 'Escalate urgently to ICU and neurology for refractory status management and airway support.']
  ],
  'COPD, hypercapnic failure': [
    ['What is the immediate respiratory safety concern?', 'Assess alertness, airway protection, respiratory effort and signs of NIV failure with senior help.'],
    ['How should oxygen be approached?', 'Use controlled oxygen and reassess saturation and blood gases; a common target is 88–92% when at risk of hypercapnia.'],
    ['How should NIV be assessed?', 'Check mask fit, tolerance and pressures, and reassess gas exchange without delaying escalation.'],
    ['What if the patient deteriorates or NIV fails?', 'Prepare for intubation with an experienced airway team rather than continuing ineffective NIV.']
  ]
};

export const DISTRACTORS = {
  'ARDS': [
    'Calculate PaO2 directly from the pulse oximeter reading.',
    'Increase tidal volume to 10 mL/kg without checking plateau pressure.',
    'Extubate immediately despite persistent severe hypoxemia.',
    'Stop checking mechanics once the ventilator settings have been entered.'
  ],
  'Septic shock': [
    'Wait for antibiotics alone to clear the obstructed urinary system.',
    'Stop all antibiotics immediately without reviewing cultures or the patient.',
    'Repeat large fixed fluid boluses without checking for overload.',
    'Stop reassessing perfusion once norepinephrine has been started.'
  ],
  'DKA': [
    'Start insulin immediately despite potassium of 2.9 mmol/L.',
    'Avoid all fluid assessment and give repeated fixed boluses.',
    'Withhold insulin indefinitely even after potassium is safe.',
    'Declare DKA resolved as soon as glucose falls, without checking ketones or acid-base status.'
  ],
  'Severe TBI': [
    'Accept prolonged hypoxemia while waiting for the scan.',
    'Lay the patient flat and flex the neck.',
    'Delay neurosurgical consultation until the next routine round.',
    'Maintain profound hypocapnia for a prolonged period without reassessment.'
  ],
  'Cardiogenic shock': [
    'Assume the recent stent excludes all mechanical complications.',
    'Give a large fluid bolus without assessing congestion.',
    'Start an IV beta-blocker to correct the low blood pressure.',
    'Ignore worsening blood pressure as long as NIV remains in place.'
  ],
  'AKI, hyperkalemia': [
    'Wait six hours before obtaining cardiac monitoring.',
    'Use calcium alone as a definitive potassium removal strategy.',
    'Rely on oral therapy alone and defer dialysis in an anuric patient.',
    'Do not recheck glucose after insulin and dextrose.'
  ],
  'Severe asthma': [
    'Ignore expiratory flow and assess only the set respiratory rate.',
    'Increase the respiratory rate to shorten expiration.',
    'Stop bronchodilators because the patient is intubated.',
    'Attribute hypotension to sedation without checking for air trapping or pneumothorax.'
  ],
  'Massive pulmonary embolism': [
    'Observe without senior help despite shock.',
    'Give thrombolysis without considering major bleeding risk or eligibility.',
    'Give 2 L fluid routinely without assessing right ventricular function.',
    'Ignore the reperfusion plan when deciding anticoagulation timing.'
  ],
  'Hypertensive pulmonary edema': [
    'Continue ineffective NIV indefinitely despite respiratory deterioration.',
    'Give nitroglycerin without monitoring blood pressure or contraindications.',
    'Give a loop diuretic without assessing volume status.',
    'Stop monitoring blood pressure after starting vasodilator therapy.'
  ],
  'Variceal bleed': [
    'Ignore airway and circulation until endoscopy is available.',
    'Start propranolol as the treatment for acute hemorrhagic shock.',
    'Treat with medicines alone and do not arrange endoscopic assessment.',
    'Transfuse to a fixed high target regardless of bleeding and clinical status.'
  ],
  'Dengue shock': [
    'Use platelet count alone to guide all fluid decisions.',
    'Give repeated large fixed fluid boluses without reassessment.',
    'Use prophylactic platelets alone to treat the shock.',
    'Continue the same fluid strategy despite worsening shock and overload.'
  ],
  'Organophosphate poisoning': [
    'Delay protective equipment and decontamination while staff remain exposed.',
    'Withhold atropine despite persistent bronchial secretions.',
    'Use pralidoxime alone instead of atropine for active muscarinic symptoms.',
    'Stop monitoring after the first atropine dose regardless of secretions.'
  ],
  'Status epilepticus': [
    'Wait for the seizure to stop before checking glucose or calling for help.',
    'Wait another ten minutes despite continuing convulsions.',
    'Assume all seizure activity has stopped solely because visible movements stop.',
    'Continue observation without escalation despite ongoing refractory seizures.'
  ],
  'COPD, hypercapnic failure': [
    'Ignore drowsiness while the NIV mask remains attached.',
    'Use uncontrolled 100% oxygen without reassessing gas exchange.',
    'Continue unchanged NIV without checking fit, pressures or response.',
    'Continue failing NIV indefinitely instead of preparing for airway escalation.'
  ]
};
