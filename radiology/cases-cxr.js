/* Radiology Lab, chest X-ray cases.
   reg = ground-truth regions [cx, cy, rx, ry, label] as fractions of the image width and height.
   All text is a first draft and needs clinical review. Images are existing repo teaching images. */
(function () {
  var R = window.RAD = window.RAD || { cases: [] };
  R.add = R.add || function (a) { a.forEach(function (c) { R.cases.push(c); }); };
  R.add([
    {
      id: "cxr-ards", mod: "cxr", grp: "Lung", t: "ARDS on a portable ICU film", img: "xrays/ards.jpg", view: "AP portable, supine",
      alt: "Portable chest radiograph with bilateral airspace opacities",
      hx: "Ventilated for three days after pneumonia. PaO₂/FiO₂ 90 on PEEP 12 with new bilateral infiltrates. Echo shows a normal left ventricle.",
      task: "Mark every area of abnormal lung.",
      reg: [[.30, .60, .22, .15, "Right mid and lower zone opacity"], [.72, .58, .16, .18, "Left mid and lower zone opacity"]],
      find: ["Bilateral patchy to confluent airspace opacity, worst in the lower zones", "No clear cardiomegaly or upper-lobe diversion on this film", "Lines and tubes are a separate check"],
      rep: "Bilateral airspace opacification in a ventilated patient. With this history it fits ARDS. Cardiogenic oedema and fluid overload cannot be excluded from the film alone.",
      ddx: ["Cardiogenic pulmonary oedema", "Bilateral pneumonia", "Diffuse alveolar haemorrhage", "Fluid overload"],
      sig: "New bilateral opacities within a week of a known insult, with hypoxaemia not explained by cardiac failure or overload, define ARDS. The film starts the diagnosis. Oxygenation, echo and the cause finish it.",
      icu: ["Lung-protective ventilation: 6 mL/kg predicted body weight, plateau pressure below 30 cmH₂O, driving pressure as low as possible (aim below 15)", "If PaO₂/FiO₂ stays below 150 on optimised settings, prone for at least 12 to 16 hours a day", "Conservative fluid strategy once off vasopressors", "Find and treat the cause: source control, cultures, antimicrobials", "Refractory hypoxaemia: discuss ECMO early with a centre"],
      q: [{ q: "Which feature favours cardiogenic oedema over ARDS on a chest film?", o: ["Normal heart size", "Cardiomegaly, upper-lobe diversion and septal lines", "Bilateral opacities", "Air bronchograms"], a: 1, w: "A big heart, upper-lobe diversion and septal lines point to raised hydrostatic pressure. ARDS usually has a normal-sized heart and no diversion. Echo settles it." }]
    },
    {
      id: "cxr-pneumonia", mod: "cxr", grp: "Lung", t: "Right lower zone pneumonia", img: "xrays/pneumonia.jpg", view: "PA erect",
      alt: "Frontal chest radiograph with a right-sided opacity",
      hx: "44-year-old woman. Three days of fever and cough. Right-sided crackles. Saturation 93% on air. Blood pressure 124/72, respiratory rate 22.",
      task: "Mark the abnormal lung.",
      reg: [[.34, .60, .16, .15, "Right mid and lower zone opacity"]],
      find: ["Patchy opacity in the right mid and lower zone", "Left lung comparatively clear", "No large effusion and no pneumothorax"],
      rep: "Right-sided airspace opacity, in keeping with consolidation. Fluid and consolidation cannot be fully separated on this film.",
      ddx: ["Bacterial community-acquired pneumonia", "Aspiration", "Pulmonary infarct", "Atelectasis with a small effusion"],
      sig: "Consolidation with fever and hypoxaemia is pneumonia until proved otherwise. Check severity before deciding the level of care.",
      icu: ["Oxygen to a target of 92 to 96%, cultures before antibiotics where this does not delay treatment", "Score severity (CURB-65, SMART-COP) and look for organ dysfunction", "Choose empirical antibiotics from the local antibiogram and the 2026 guidance your unit follows", "Reassess in hours. A deteriorating patient needs a repeat film or lung ultrasound for effusion or empyema"],
      q: [{ q: "What can a single frontal film not reliably do here?", o: ["Show an opacity", "Separate consolidation from a pleural effusion", "Show a large pneumothorax", "Show the heart size"], a: 1, w: "Both are white. Ultrasound or a lateral film separates them." }]
    },
    {
      id: "cxr-ptx", mod: "cxr", grp: "Pleura", t: "Left pneumothorax", img: "xrays/ptx.jpg", view: "PA erect",
      alt: "Frontal chest radiograph with a left pneumothorax",
      hx: "Tall 22-year-old, sudden left chest pain and breathlessness. Heart rate 104, saturation 95% on air. Not ventilated.",
      task: "Mark the pneumothorax. The gastric bubble sits under the lucent hemithorax.",
      reg: [[.82, .36, .12, .18, "Pleural air, left lateral and apical"], [.70, .34, .08, .16, "Collapsed lung edge"]],
      find: ["Lucent hemithorax with no lung markings beyond a pleural line", "The gastric bubble identifies the left side", "Look at the mediastinum for shift before reading the size"],
      rep: "Left pneumothorax. Assess the size, any mediastinal shift and any underlying lung disease.",
      ddx: ["Bulla or giant emphysematous cyst", "Skin fold", "Large pneumothorax with tension physiology"],
      sig: "Size matters less than the patient. A breathless or haemodynamically unstable patient needs action now, whatever the film shows.",
      icu: ["Stable and small: observe, oxygen, repeat film", "Symptomatic or large: aspiration or a small-bore drain", "Any pneumothorax in a patient about to receive positive pressure ventilation: drain first"],
      q: [{ q: "A patient on a ventilator has a pneumothorax. What is the safest step?", o: ["Observe and repeat the film in 6 hours", "Insert a chest drain", "Increase PEEP", "Give a diuretic"], a: 1, w: "Positive pressure converts a simple pneumothorax to tension. It needs a drain." }]
    },
    {
      id: "cxr-tension", mod: "cxr", grp: "Pleura", t: "Large pneumothorax, tension physiology", img: "xrays/tension.jpg", view: "AP portable",
      alt: "Portable chest radiograph with a hyperlucent left hemithorax",
      hx: "Ventilated trauma patient. Sudden rise in airway pressure, blood pressure falling, saturation 86%.",
      task: "Mark the hyperlucent hemithorax.",
      reg: [[.72, .50, .20, .36, "Hyperlucent left hemithorax with no lung markings"]],
      find: ["Large lucent area with absent vascular markings", "Look for a flattened hemidiaphragm and mediastinal shift away", "A tension pneumothorax is a clinical diagnosis. This film should not have been waited for"],
      rep: "Large left pneumothorax. If there is shock or rising airway pressure, treat as tension.",
      ddx: ["Simple large pneumothorax", "Bulla", "Pneumatocoele"],
      sig: "Tension pneumothorax kills by obstructing venous return. The film confirms what the bedside already told you.",
      icu: ["Decompress immediately: finger thoracostomy or needle decompression, then a chest drain", "Do not delay for imaging when there is shock with a hyperresonant chest", "After the drain: repeat film for position and re-expansion, and review ventilator settings"],
      q: [{ q: "A ventilated patient becomes hypotensive with a hyperresonant hemithorax. What comes first?", o: ["A chest film", "Decompression", "A CT scan", "A fluid bolus alone"], a: 1, w: "Tension pneumothorax is diagnosed at the bedside and treated at once." }]
    },
    {
      id: "cxr-edema", mod: "cxr", grp: "Lung", t: "Cardiogenic pulmonary oedema", img: "xrays/edema.jpg", view: "AP",
      alt: "Chest radiograph with bilateral perihilar opacities",
      hx: "68-year-old with ischaemic heart disease, orthopnoea and frothy sputum. Bilateral crackles. Blood pressure 186/104.",
      task: "Mark the abnormal lung. Both sides are involved.",
      reg: [[.32, .50, .16, .18, "Right perihilar haze"], [.70, .50, .16, .18, "Left perihilar haze"]],
      find: ["Bilateral perihilar haze, a bat's wing distribution", "Enlarged cardiac silhouette", "Look for septal lines and small effusions"],
      rep: "Bilateral perihilar airspace opacity with cardiomegaly. This fits cardiogenic pulmonary oedema.",
      ddx: ["ARDS", "Bilateral pneumonia", "Renal failure with overload"],
      sig: "Acute cardiogenic pulmonary oedema responds quickly to the right treatment. Find the trigger: ischaemia, arrhythmia, uncontrolled hypertension, valve failure.",
      icu: ["Sit up, oxygen, non-invasive ventilation or high-flow oxygen if hypoxaemic", "Vasodilator if hypertensive, diuretic for overload", "ECG, troponin and bedside echo for the trigger", "Intubate if NIV fails or consciousness falls"],
      q: [{ q: "Which sign supports cardiogenic over non-cardiogenic oedema?", o: ["Normal heart size", "Septal lines and a large heart", "Air bronchograms alone", "Unilateral opacity"], a: 1, w: "Pressure-driven oedema brings a big heart, upper-lobe diversion and septal lines." }]
    },
    {
      id: "cxr-effusion", mod: "cxr", grp: "Pleura", t: "Hemithorax opacification (massive effusion)", img: "xrays/effusion.jpg", view: "AP",
      alt: "Chest radiograph with most of one hemithorax opaque",
      hx: "Progressive breathlessness over two weeks. Stony dull percussion and absent breath sounds on one side.",
      task: "Mark the opaque hemithorax.",
      reg: [[.65, .55, .32, .40, "Opacified hemithorax"]],
      find: ["Most of one hemithorax is opaque and only a thin strip of aerated lung remains", "Look at the trachea and heart. Shift away from the opacity suggests a large effusion. Shift towards it suggests collapse", "The patient's side depends on the marker, which is on the image"],
      rep: "Near-complete hemithorax opacification. A large pleural effusion is the commonest cause. Confirm with ultrasound before draining.",
      ddx: ["Large pleural effusion", "Complete lung collapse", "Pneumonectomy", "Massive consolidation", "Haemothorax"],
      sig: "A large effusion reduces lung volume and drives hypoxaemia. The fluid type decides management.",
      icu: ["Ultrasound-guided thoracentesis. Send protein, LDH, glucose, pH, cell count, culture and cytology", "Drain if empyema, pH below 7.2 or frank pus", "Remove in controlled volumes and watch for re-expansion oedema"],
      q: [{ q: "A large opaque hemithorax with the trachea pushed away from it most likely means:", o: ["Lobar collapse", "Large effusion", "Pneumonectomy", "Pulmonary fibrosis"], a: 1, w: "Collapse pulls the mediastinum towards the opacity. A large effusion pushes it away." }]
    },
    {
      id: "cxr-collapse", mod: "cxr", grp: "Lung", t: "Left lower lobe collapse", img: "xrays/collapse.jpg", view: "PA",
      alt: "Chest radiograph with a retrocardiac density on the left",
      hx: "Post-operative patient with a weak cough and mucus plugging. New fall in saturation and reduced air entry at the left base.",
      task: "Mark the abnormal area behind the heart.",
      reg: [[.65, .72, .12, .13, "Retrocardiac triangular density, left lower lobe"]],
      find: ["A triangular retrocardiac density, the sail sign", "Loss of the left hemidiaphragm outline", "The heart may shift to the same side"],
      rep: "Left lower lobe collapse. Look for a plug, a mass or a malpositioned tube.",
      ddx: ["Left lower lobe consolidation", "Effusion", "Central obstructing mass"],
      sig: "Collapse is common in the ventilated and the post-operative patient. It is usually reversible when the cause is found early.",
      icu: ["Physiotherapy, sitting up, humidification and suction", "Bronchoscopy for a persistent plug", "Check the ETT is not in the right main bronchus", "Persisting collapse in a smoker: look for a mass"],
      q: [{ q: "Which sign is typical of lobar collapse?", o: ["Mediastinal shift away", "Volume loss with shift towards the opacity", "Hyperlucency", "Kerley B lines"], a: 1, w: "Collapse reduces volume, pulling the heart, trachea and fissures towards the lesion." }]
    },
    {
      id: "cxr-copd", mod: "cxr", grp: "Lung", t: "Hyperinflation in severe COPD", img: "xrays/copd.jpg", view: "PA erect",
      alt: "Chest radiograph with hyperinflated lungs and flat diaphragms",
      hx: "70-year-old ex-smoker with an exacerbation. Barrel chest, prolonged expiration, drowsy with pCO₂ 68 mmHg.",
      task: "Mark the diaphragm.",
      reg: [[.50, .88, .36, .07, "Flattened diaphragms"], [.30, .50, .16, .28, "Hyperlucent lung with reduced vascular markings"]],
      find: ["Flattened hemidiaphragms", "Long narrow heart", "Increased retrosternal air and hyperlucent lungs"],
      rep: "Hyperinflated lungs with flattened diaphragms, in keeping with COPD or emphysema. No pneumothorax or large consolidation.",
      ddx: ["Emphysema", "Asthma", "Bullous disease"],
      sig: "Gas trapping limits ventilation. On a ventilator it causes auto-PEEP and haemodynamic collapse.",
      icu: ["Controlled oxygen to 88 to 92%", "Bronchodilators, systemic steroid, antibiotics if purulent", "Non-invasive ventilation for acidosis (pH below 7.35 with high pCO₂)", "If intubated: low rate, long expiratory time, watch auto-PEEP"],
      q: [{ q: "A ventilated COPD patient arrests suddenly after a period of rapid breaths. What should you do first?", o: ["Increase the rate", "Disconnect from the ventilator and allow full exhalation", "Give a fluid bolus only", "Increase PEEP"], a: 1, w: "Dynamic hyperinflation traps gas and stops venous return. Disconnecting relieves it." }]
    },
    {
      id: "cxr-aspiration", mod: "cxr", grp: "Lung", t: "Aspiration pneumonitis", img: "xrays/aspiration.png", view: "AP",
      alt: "Chest radiograph with bilateral basal opacities",
      hx: "Found unconscious after an overdose. Vomit around the mouth. Saturation 88%, crackles at both bases.",
      task: "Mark the abnormal lung. Both bases are involved.",
      reg: [[.30, .62, .18, .20, "Right basal and perihilar opacity"], [.72, .62, .16, .20, "Left basal and perihilar opacity"]],
      find: ["Bilateral basal and perihilar patchy opacity", "Dependent segments are favoured: the lower lobes, or the right upper lobe in a supine patient", "Early films can be normal"],
      rep: "Bilateral basal airspace opacification in a patient at risk of aspiration. Pneumonitis or early aspiration pneumonia.",
      ddx: ["Cardiogenic oedema", "ARDS from another cause", "Pneumonia"],
      sig: "Pneumonitis is chemical injury and is not an infection at the start. Antibiotics are not automatic. Watch for ARDS.",
      icu: ["Airway protection and suction", "Oxygen or ventilation as needed", "Antibiotics only if persistent fever, new infiltrate after 48 hours or risk factors for infection", "Treat the cause of the reduced consciousness"],
      q: [{ q: "Which segments are most often involved after aspiration in a supine patient?", o: ["Apical segments of the upper lobes", "Posterior upper lobe and superior lower lobe segments", "Lingula only", "Right middle lobe only"], a: 1, w: "Gravity carries gastric contents to the posterior and superior dependent segments." }]
    },
    {
      id: "cxr-contusion", mod: "cxr", grp: "Trauma", t: "Pulmonary contusion with rib fractures", img: "xrays/contusion.jpg", view: "AP",
      alt: "Chest radiograph with right lung opacity after trauma",
      hx: "Fall from height. Right chest wall pain and bruising. Saturation 90% on a non-rebreather mask.",
      task: "Mark the contused lung.",
      reg: [[.28, .42, .20, .28, "Right lung contusion"]],
      find: ["Patchy non-segmental opacity that does not respect fissures", "Rib fractures on the same side", "It can evolve over 24 to 48 hours"],
      rep: "Right pulmonary contusion with chest wall injury. Look for pneumothorax, haemothorax and a flail segment.",
      ddx: ["Aspiration", "Pneumonia", "Haemothorax", "Pulmonary laceration"],
      sig: "Contusion causes hypoxaemia that peaks at 24 to 72 hours. Pain control is lung treatment.",
      icu: ["Multimodal analgesia: regional block such as erector spinae or epidural", "Early high-flow oxygen or non-invasive ventilation", "Restrict crystalloid and avoid overload", "Look for pneumothorax and drain before positive pressure"],
      q: [{ q: "When is the worst oxygenation expected after pulmonary contusion?", o: ["Immediately only", "24 to 72 hours", "After one week", "It never worsens"], a: 1, w: "Haemorrhage and oedema evolve over the first days." }]
    },
    {
      id: "cxr-subq", mod: "cxr", grp: "Pleura", t: "Subcutaneous emphysema", img: "xrays/subq.jpg", view: "AP",
      alt: "Chest radiograph with streaky gas in the chest wall",
      hx: "Patient on a ventilator after chest drain removal. New swelling and crepitus of the chest and neck.",
      task: "Mark the air in the chest wall.",
      reg: [[.90, .42, .10, .30, "Gas tracking through the left chest wall"]],
      find: ["Streaky lucency tracking along the muscle planes of the chest wall", "Look for the cause: pneumothorax, blocked or displaced drain, airway or oesophageal injury", "Look for pneumomediastinum"],
      rep: "Extensive surgical emphysema of the chest wall. Find the source of the air leak.",
      ddx: ["Pneumothorax with leak", "Pneumomediastinum", "Oesophageal perforation", "Gas-forming infection"],
      sig: "Subcutaneous gas is usually harmless alone but marks an air leak. It can hide a pneumothorax and compress the airway if it reaches the neck.",
      icu: ["Check the drain is patent, correctly placed and not clamped", "Reduce pressures and tidal volume if possible", "Watch the airway if it reaches the neck", "Fever with pain and crepitus: think of necrotising infection"],
      q: [{ q: "What should you check first if surgical emphysema appears in a patient with a chest drain?", o: ["Stop the drain suction at once and remove it", "Whether the drain is patent and in the right place", "Order an MRI", "Increase PEEP"], a: 1, w: "A blocked or displaced drain lets the leak escape into tissue." }]
    },
    {
      id: "cxr-heart", mod: "cxr", grp: "Cardiac", t: "Cardiomegaly with a cardiac device", img: "xrays/heart.jpg", view: "PA / AP",
      alt: "Chest radiograph with an enlarged heart and a left-sided pacemaker generator",
      hx: "Patient with a cardiac device and progressive breathlessness. Pitting oedema.",
      task: "Mark the cardiac silhouette and the device generator.",
      reg: [[.58, .65, .30, .15, "Enlarged cardiac silhouette"], [.76, .34, .08, .09, "Device generator, left chest"]],
      find: ["Cardiothoracic ratio is above 0.5 on a PA film", "A generator in the left pectoral region, with leads into the heart", "Check lead position and look for pneumothorax after any recent implant"],
      rep: "Cardiomegaly with a left-sided cardiac device.",
      ddx: ["Dilated cardiomyopathy", "Pericardial effusion", "Valve disease", "AP projection exaggerating size"],
      sig: "A big heart on a portable film may be projection. Confirm with echo.",
      icu: ["Bedside echo: ventricular function, pericardial effusion, valves", "Check device status and interrogation for arrhythmia", "Assess volume status and the cause of any oedema"],
      q: [{ q: "A portable AP film makes the heart look:", o: ["Smaller than it is", "Larger than it is", "The same size", "Rotated only"], a: 1, w: "The heart is farther from the film and magnified on AP views. Do not diagnose cardiomegaly on a portable AP." }]
    },
    {
      id: "dev-ett", mod: "cxr", grp: "Lines and tubes", t: "Find the tip of the thin line", img: "xrays/ett.jpg", view: "AP portable",
      alt: "Portable chest radiograph with several tubes and lines",
      hx: "Ventilated patient with several lines and tubes in place. You are asked to check them.",
      task: "Mark the tip of the thin curved catheter that runs down the mediastinum.",
      reg: [[.49, .46, .06, .06, "Visible catheter tip"]],
      find: ["Identify each device first: tube, central line, nasogastric tube, drain", "The tip projects over the mid-mediastinum on this film", "Compare the tip with the carina and the vertebral bodies before calling it right"],
      rep: "A thin catheter runs through the neck and upper mediastinum. Confirm its type and its tip level against the carina before using it.",
      ddx: ["Central venous catheter", "PICC", "Nasogastric or feeding tube", "Guidewire left in place"],
      sig: "The most useful ICU radiograph question is: where is the tip, and is the line where it should be? This ground-truth region marks only the visible tip and is for practice.",
      icu: ["Endotracheal tube: tip about 5 cm (range 3 to 7) above the carina with the neck neutral", "Central line: lower third of the SVC or the cavo-atrial junction, not in the right atrium", "Nasogastric tube: below the diaphragm with side holes in the stomach. Confirm before feeding", "Chest drain: all side holes inside the pleural space", "Check for pneumothorax after every central line"],
      q: [{ q: "Where should the tip of an endotracheal tube lie?", o: ["At the carina", "About 5 cm above the carina", "In the right main bronchus", "At the thoracic inlet only"], a: 1, w: "Too deep intubates the right main bronchus. Too high risks extubation, especially when the neck flexes or extends." }]
    },
    {
      id: "dev-cvc", mod: "cxr", grp: "Lines and tubes", t: "Where does the central line end?", img: "xrays/cvc.jpg", view: "AP",
      alt: "Chest radiograph of a young patient with a central line entering from the neck",
      hx: "A central line has been inserted through the neck. You are asked whether it can be used.",
      task: "Mark the tip of the catheter.",
      reg: [[.52, .27, .06, .06, "Visible catheter tip"]],
      find: ["Follow the line from the neck down to its tip", "Compare the tip with the carina and the right heart border", "Look for a pneumothorax at the apex"],
      rep: "A catheter enters from the neck and its tip projects over the upper mediastinum. Confirm its level against the carina. The film is a young patient and the line may be in the superior vena cava.",
      ddx: ["Tip in the SVC", "Tip in the right atrium", "Tip in the azygos vein", "Tip in the internal jugular vein"],
      sig: "A line too high is unreliable for vasopressors. A line in the right atrium can cause arrhythmia and perforation.",
      icu: ["Tip in the lower SVC or at the cavo-atrial junction", "A curl up the neck or into the opposite subclavian means repositioning", "Check for pneumothorax and haemothorax", "Use a blood-return and flush test, and a bubble or ultrasound check, as well as the film"],
      q: [{ q: "A central line tip lies in the right atrium. What is the main risk?", o: ["Pneumothorax", "Arrhythmia and cardiac perforation", "Air embolism only on removal", "None"], a: 1, w: "A rigid tip in the atrium can irritate or perforate it. Pull it back to the lower SVC." }]
    }
  ]);
  var CXN = "radiology/media/cxr-normal-pa.jpg";
  var CXT = { tag: "REAL CXR · CC BY 3.0", chip: "Real chest radiograph, CC BY 3.0", real: true, text: "Real adult PA chest radiograph from Hannover Medical School (COVID-19 image repository, CC BY 3.0). Labelled no finding in the source. Not read by this lab. Projection and patient differ from the case." };
  R.cases.forEach(function (c) {
    if (c.mod !== "cxr" || c.cmp) return;
    var ap = /AP|portable|supine/i.test(c.view);
    c.cmp = { src: CXN, cap: "Reference: adult PA chest radiograph reported as no finding" + (ap ? ". This is an erect PA film, so the heart is smaller and the lung vessels differ from a portable AP film" : ""), sourceTag: CXT, cr: ["cxrNormal"] };
  });
})();
