// Critical Care Hub - module catalogue.
// Rooms, titles and links are copied from the "Critical Care Human Atlas" index.html in
// ARDS-INTERACTIVE-SIMULATOR. Edit this file to add or move simulators; no other code changes needed.
// Links are relative to the page that hosts the viewer (repo root on GitHub Pages).

export const CONFIG = {
  // Optional licensed GLB skin shell. If the file is missing the built-in procedural body is used.
  MODEL_URL: 'models/anatomy-body.glb',
  // Prefix for every simulator link. Leave '' when the viewer sits next to the simulators.
  LINK_BASE: ''
};

// row = [title, description, href]
export const ROOMS = {
  brain: {
    name: 'Brain', room: 'Neurology',
    line: 'Consciousness, cerebral vessels and seizure.',
    learn: [
      ['Acute ischemic stroke', 'Assessment, NIHSS, imaging, thrombolysis and EVT.', 'Acute_Ischemic_Stroke_Simulator_V6_FINAL.html?v=20260925s'],
      ['Intracerebral hemorrhage', 'Blood pressure, reversal and the ICP pathway.', 'Intracerebral_Hemorrhage_Interactive_Simulator_v1.html?v=20260925s'],
      ['Subarachnoid hemorrhage', 'Grading, the aneurysm and the day-one bundle.', 'Subarachnoid_Hemorrhage_Interactive_Simulator_v1.html?v=20260925s'],
      ['Status epilepticus', 'Benzodiazepine, second-line drug, then refractory care.', 'Status_Epilepticus_Interactive_Simulator_v2_EDITABLE.html?v=20260925s'],
      ['Traumatic brain injury', 'GCS, CT, reversal, ICP tiers and surgery.', 'TBI_Interactive_Simulator_v5_ICP_Anisocoria.html?v=20260925s'],
      ['CNS infection', 'Meningitis, encephalitis, abscess and the ICU complications.', 'CNS_Infection_Interactive_Algorithm_v7.html?v=20260925s']
    ],
    practice: [
      ['Neurology Practice Simulator', 'A patient, a study, and the next decision. Stroke and subarachnoid hemorrhage.', 'Practice_Simulator.html?focus=neuro&v=20261029a']
    ],
    soon: ''
  },
  thyroid: {
    name: 'Thyroid', room: 'Endocrine',
    line: 'Neck and endocrine crises. Glucose, potassium and the insulin that must not stop too early.',
    learn: [
      ['DKA', 'Fluids, potassium, insulin and dextrose across four bedside cases.', 'DKA_Interactive_Simulator.html?v=20260925s'],
      ['DKA and HHS', 'Holds insulin when potassium is under 3.3, and does not stop it when the glucose falls.', 'DKA_HHS_Resuscitation_Engine.html?v=20260925n']
    ],
    practice: [],
    soon: 'The Endocrine Emergency Simulator is the next bay. The learning lab is open.'
  },
  lungs: {
    name: 'Lungs', room: 'Respiratory',
    line: 'Gas exchange, the ventilator and the film. Failure has a pattern before it has a machine.',
    learn: [
      ['Hypoxic patient', 'Oxygen, HFNC, NIV and the reason for the failure.', 'Hypoxic_Patient_Respiratory_Critical_Care_Simulator_v22.html?v=20260925s'],
      ['ARDS ventilator', 'PEEP, prone position, driving pressure and rescue.', 'ARDS_Active_Simulator.html?v=20260925s'],
      ['COPD and asthma', 'Bronchodilator, the ventilator and the ICU pathway.', 'COPD_Asthma_V11_CASE_DRIVEN_CHECKED.html?v=20260925s'],
      ['COPD versus ARDS', 'An atlas of the two patterns.', 'COPD_vs_ARDS_Interactive_Atlas_NATIVE.html?v=20260925s'],
      ['ABG photo', 'Photograph a report. The six-step reading is done for you.', 'ABG_Photo_Interpreter_Simulator.html?v=20260925s']
    ],
    practice: [
      ['Mechanical ventilation', 'Pressure, flow and volume. Name the pattern.', 'Ventilator_Waveform_Troubleshooting.html?v=20260925s'],
      ['Respiratory Practice Simulator', 'ARDS. Click the opacity, name the severity, then set the tidal volume.', 'Practice_Simulator.html?focus=lungs&v=20261029a']
    ],
    soon: ''
  },
  heart: {
    name: 'Heart', room: 'Cardiac',
    line: 'Rhythm, pressure and the failing pump.',
    learn: [
      ['Cardiac Anatomy Lab', 'A real heart model. Chambers, valves, coronaries, flow and the conduction drawing.', 'cardiac-lab.html?v=20261030a'],
      ['Echo bay', 'Finger on the chest. The probe, the coronary territory, the wall motion and the trace move together.', 'echo-lab.html?v=20261030a'],
      ['ACLS, 2025 AHA', 'Arrest, tachycardia and bradycardia, with the current doses.', 'ACLS_Interactive_Simulator_2025_AHA_v2.html?v=20260925s'],
      ['Shock identification', 'MAP, cardiac index and the phenotype.', 'Shock_Identification_Management_Simulator.html?v=20260925s'],
      ['Shock and POCUS', 'RUSH exam, ScvO2 and lactate.', 'Shock_POCUS_RUSH_Simulator.html?v=20260925l'],
      ['Shock telemetry', 'Arterial line, IVC, PPV and the vasopressor.', 'Shock_Telemetry_POCUS_Simulator.html?v=20261001a']
    ],
    practice: [
      ['Cardiac rhythm', 'A moving ECG, the arrest and the reversible causes.', 'Cardiac_Rhythm_Decision_Simulator_V29_FINAL_AUDITED.html?v=20260925t'],
      ['Shock Practice Simulator', 'Septic shock. The small ventricle, the full IVC, then norepinephrine.', 'Practice_Simulator.html?focus=circulation&v=20261029a'],
      ['Cardiac Practice Simulator', 'Infarction, heart block, cardiogenic shock, ventricular fibrillation, and tamponade.', 'Practice_Simulator.html?focus=heart&v=20261029a']
    ],
    soon: ''
  },
  liver: {
    name: 'Liver', room: 'Hepatic',
    line: 'Failure, cirrhosis, infected ascites, and a blocked duct.',
    learn: [],
    practice: [
      ['Liver Practice Simulator', 'Acute liver failure, decompensated cirrhosis, infected ascites, hepatorenal syndrome, and cholangitis.', 'Practice_Simulator.html?focus=liver&v=20261029a']
    ],
    soon: ''
  },
  stomach: {
    name: 'Stomach', room: 'Gastrointestinal',
    line: 'Upper gastrointestinal bleeding. Variceal and non-variceal.',
    learn: [],
    practice: [
      ['Upper gastrointestinal bleeding', 'Variceal and non-variceal. The endoscope, then the bundle that matches the lesion.', 'Practice_Simulator.html?focus=bleed&v=20261029a']
    ],
    soon: ''
  },
  bowel: {
    name: 'Gastrointestinal', room: 'Gastrointestinal',
    line: 'Pancreatitis, bleeding, and a blocked bile duct.',
    learn: [
      ['Acute pancreatitis', 'Diagnosis, fluids, cause, and the step-up approach.', 'Acute_Pancreatitis_Simulator.html?v=20260926s']
    ],
    practice: [
      ['GI Practice Simulator', 'Pancreatitis, variceal bleeding, a duodenal ulcer, and cholangitis.', 'Practice_Simulator.html?focus=gi&v=20261029a']
    ],
    soon: ''
  },
  multi: {
    name: 'Whole patient', room: 'Multiorgan',
    line: 'Sepsis, shock and more than one failing organ.',
    learn: [
      ['Shock bay', 'Phenotypes of shock, and a ventilator you control.', 'Shock_Bay.html?v=20260925s'],
      ['Antibiotics', 'The culture, the resistance, and the toxicity that changes the choice.', 'Antibiotic_Simulator.html?v=20260928e'],
      ['IDSA selection', 'KPC, OXA-48, NDM, and the dose that follows the 2026 guidance.', 'IDSA_Antibiotic_Selection_Simulator.html?v=20261029a'],
      ['Antifungal resistance', 'C. auris, Mucorales, and the site the drug does not reach.', 'Antifungal_Resistance_Simulator.html?v=20260925s']
    ],
    practice: [
      ['Integrated ICU cases', 'Every practice case, from the brain to the blood film.', 'Practice_Simulator.html?v=20261029a'],
      ['Infection Practice Simulator', 'Septic shock, severe malaria, and dengue shock.', 'Practice_Simulator.html?focus=id&v=20261029a'],
      ['Hematology Practice Simulator', 'Thrombotic thrombocytopenic purpura. The film, then plasma exchange.', 'Practice_Simulator.html?focus=heme&v=20261029a'],
      ['Trauma Practice Simulator', 'Rib fractures, and an open pelvic ring.', 'Practice_Simulator.html?focus=trauma&v=20261029a'],
      ['Toxicology Practice Simulator', 'Organophosphate poisoning. Atropine until the chest is dry.', 'Practice_Simulator.html?focus=tox&v=20261029a']
    ],
    soon: ''
  },
  kidneys: {
    name: 'Kidneys', room: 'Nephrology',
    line: 'Sodium, potassium, calcium, magnesium and phosphate.',
    learn: [
      ['Electrolytes', 'The number chooses the algorithm. Calcium starts from serum calcium and albumin.', 'Electrolyte_Disorders_Interactive_Simulator.html?v=20261014d'],
      ['Dialysis Learning Lab', 'Ten modalities. The circuit, the dose, and why SLED sits inside prolonged intermittent therapy.', 'Dialysis_Learning_Lab.html?v=20261029a']
    ],
    practice: [
      ['Renal Practice Simulator', 'Hyperkalemia, obstructed acute kidney injury, and missed dialysis.', 'Practice_Simulator.html?focus=kidney&v=20261029a'],
      ['Dialysis practice', 'Indication, modality, prescription, and a whole session.', 'Dialysis_Practice_Simulator.html?v=20261029a']
    ],
    soon: ''
  }
};

// Everything the user can select: 7 body regions and 9 organs.
// rooms = which ROOMS entries open for it. organs = organs listed inside a region.
export const SELECTION = {
  head:   { kind: 'region', label: 'Head', organs: ['brain'], rooms: ['brain'],
            text: 'Skull, brain and cranial vessels. Neurological assessment, ICP and seizure control start here.' },
  brain:  { kind: 'organ', label: 'Brain', rooms: ['brain'],
            text: 'Cerebral perfusion, intracranial pressure and consciousness. Stroke, hemorrhage, seizures, TBI and CNS infection.' },
  neck:   { kind: 'region', label: 'Neck', organs: ['thyroid'], rooms: ['thyroid'],
            text: 'Airway, thyroid and the great vessels of the neck. In this hub the endocrine room sits here.' },
  thyroid:{ kind: 'organ', label: 'Thyroid', rooms: ['thyroid'],
            text: 'Endocrine control of metabolism. The DKA and HHS simulators open from this room.' },
  chest:  { kind: 'region', label: 'Chest', organs: ['heart', 'lungs'], rooms: ['heart', 'lungs'],
            text: 'Heart, lungs and great vessels. Oxygenation, ventilation, rhythm and shock all converge here.' },
  heart:  { kind: 'organ', label: 'Heart', rooms: ['heart'],
            text: 'The pump. Rhythm, preload, afterload and contractility drive shock and arrest.' },
  lungs:  { kind: 'organ', label: 'Lungs', rooms: ['lungs'],
            text: 'Gas exchange and mechanics. Failure shows as hypoxemia or hypercapnia before it needs a ventilator.' },
  abdomen:{ kind: 'region', label: 'Abdomen', organs: ['liver', 'stomach', 'spleen', 'intestines'], rooms: ['liver', 'stomach', 'bowel'],
            text: 'Liver, stomach, spleen and bowel. Pancreatitis, bleeding and abdominal sepsis are managed here.' },
  liver:  { kind: 'organ', label: 'Liver', rooms: ['liver'],
            text: 'Synthetic and metabolic function: clotting factors, ammonia and drug clearance.' },
  stomach:{ kind: 'organ', label: 'Stomach', rooms: ['stomach'],
            text: 'Upper gastrointestinal tract. A source of bleeding, vomiting and nasogastric losses.' },
  spleen: { kind: 'organ', label: 'Spleen', rooms: ['multi'],
            text: 'An immune filter. In this hub it opens the whole-patient infection and shock cases.' },
  intestines: { kind: 'organ', label: 'Intestines', rooms: ['bowel'],
            text: 'Absorption and the gut barrier. Ileus, ischemia and high-output losses.' },
  kidneys:{ kind: 'organ', label: 'Kidneys', rooms: ['kidneys'],
            text: 'Regulate sodium, potassium, calcium, magnesium and phosphate, and acid-base balance.' },
  pelvis: { kind: 'region', label: 'Pelvis', organs: [], rooms: [],
            text: 'Pelvic organs and the aortic bifurcation. No dedicated simulator is linked yet.' },
  arms:   { kind: 'region', label: 'Arms', organs: [], rooms: [],
            text: 'Peripheral perfusion and vascular access. No dedicated simulator is linked yet.' },
  legs:   { kind: 'region', label: 'Legs', organs: [], rooms: [],
            text: 'Femoral access, perfusion and venous thromboembolism risk. No dedicated simulator is linked yet.' }
};

// Order of the selector chips in the Anatomy panel.
export const CHIPS = ['head', 'brain', 'neck', 'thyroid', 'chest', 'heart', 'lungs', 'abdomen', 'liver', 'stomach',
  'spleen', 'intestines', 'kidneys', 'pelvis', 'arms', 'legs'];
