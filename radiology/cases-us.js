/* Radiology Lab, ultrasound cases. The images in pocus/ and echo/ are stylised teaching illustrations,
   not clinical scans, and are labelled that way in the viewer. Replace them with real cine loops when licensed. */
(function () {
  var R = window.RAD = window.RAD || { cases: [] };
  R.add = R.add || function (a) { a.forEach(function (c) { R.cases.push(c); }); };
  var NLUNG = { src: "pocus/alines.jpg", cap: "Reference: normal lung pattern with A-lines (illustration)" };
  R.add([
    {
      id: "us-effusion", mod: "us", grp: "Lung", t: "Pleural effusion", img: "pocus/effusion.jpg", view: "Right base, coronal", cmp: NLUNG,
      alt: "Ultrasound of a pleural effusion",
      hx: "Breathless with dullness at the right base. Saturation 90%.",
      task: "Mark the pleural fluid.",
      reg: [[.57, .44, .20, .10, "Anechoic fluid above the diaphragm"]],
      find: ["Anechoic space between the chest wall and the lung", "Compressed lung floating within it", "Spine sign: the vertebrae are visible above the diaphragm"],
      rep: "Right pleural effusion.",
      ddx: ["Transudate", "Exudate", "Empyema (echogenic, septated)", "Haemothorax"],
      sig: "Ultrasound is the safest guide for drainage. Septations and echogenic fluid suggest exudate or infection.",
      icu: ["Mark a safe site with ultrasound and drain if it is causing hypoxaemia", "Send fluid for pH, protein, LDH, glucose, cultures and cytology", "Treat the cause: heart failure, infection, malignancy"],
      q: [{ q: "What does the spine sign mean?", o: ["Pneumothorax", "Fluid above the diaphragm lets ultrasound see the vertebrae", "Consolidation", "Normal lung"], a: 1, w: "Normal lung blocks the beam. Fluid transmits it, so the spine appears above the diaphragm." }]
    },
    {
      id: "us-blines", mod: "us", grp: "Lung", t: "B-lines: interstitial syndrome", img: "pocus/blines.jpg", view: "Anterior chest", cmp: NLUNG,
      alt: "Lung ultrasound with several vertical B-lines",
      hx: "Breathless patient with orthopnoea. Heart rate 110, saturation 88%.",
      task: "Mark a B-line.",
      reg: [[.55, .55, .30, .24, "Vertical B-lines from the pleural line"]],
      find: ["Vertical laser-like lines starting at the pleural line", "They erase A-lines and move with sliding", "Three or more per space is abnormal"],
      rep: "Multiple B-lines in an anterior window, in keeping with interstitial syndrome.",
      ddx: ["Cardiogenic oedema", "ARDS", "Pneumonia", "Pulmonary fibrosis"],
      sig: "Bilateral diffuse B-lines suggest oedema. Focal B-lines suggest pneumonia. Combine with the clinical picture and echo.",
      icu: ["Bilateral B-lines with a dilated IVC and poor LV: treat as cardiogenic", "Patchy B-lines with a thickened pleura and consolidations: suggests ARDS or pneumonia", "Repeat after treatment to follow the response"],
      q: [{ q: "A-lines with lung sliding in a breathless patient mean:", o: ["Pulmonary oedema", "A normal aerated lung pattern", "Consolidation", "Pneumothorax is certain"], a: 1, w: "A-lines with sliding show normal aeration. Look for causes such as COPD, PE or a metabolic cause." }]
    },
    {
      id: "us-barcode", mod: "us", grp: "Lung", t: "M-mode barcode sign: no lung sliding", img: "pocus/barcode.jpg", view: "Left anterior chest, M-mode", cmp: { src: "pocus/seashore.jpg", cap: "Reference: M-mode seashore sign, lung sliding present (illustration)" },
      alt: "M-mode ultrasound with horizontal lines throughout",
      hx: "Ventilated patient with sudden desaturation and a rise in airway pressure.",
      task: "Mark the pattern that shows no lung sliding.",
      reg: [[.50, .64, .40, .22, "Horizontal lines below the pleural line, the stratosphere or barcode sign"]],
      find: ["Parallel horizontal lines above and below the pleural line", "No granular sand pattern under the pleura", "Look for a lung point to confirm"],
      rep: "Barcode sign, in keeping with absent lung sliding at this site.",
      ddx: ["Pneumothorax", "Mainstem intubation", "Pleurodesis", "Severe consolidation or bulla"],
      sig: "Absent sliding is sensitive but not specific. A lung point is specific for pneumothorax.",
      icu: ["Pair with the clinical picture: shock and desaturation need decompression", "Check the tube position", "Confirm with a lung point and a film if stable"],
      q: [{ q: "Which M-mode sign is specific for pneumothorax?", o: ["Seashore sign", "Lung point", "A-lines", "Spine sign"], a: 1, w: "The lung point is the transition between sliding and non-sliding lung and is highly specific." }]
    },
    {
      id: "us-consol", mod: "us", grp: "Lung", t: "Lung consolidation with air bronchograms", img: "pocus/consol.jpg", view: "Right base", cmp: NLUNG,
      alt: "Lung ultrasound with tissue-like lung and branching bright lines",
      hx: "Fever, productive cough, right basal crackles.",
      task: "Mark the consolidated lung.",
      reg: [[.52, .50, .24, .20, "Tissue-like lung with air bronchograms"]],
      find: ["Lung looks like liver, called hepatisation", "Bright branching lines are air bronchograms", "Irregular deep border, the shred sign"],
      rep: "Right basal consolidation with dynamic air bronchograms.",
      ddx: ["Pneumonia", "Atelectasis (static bronchograms)", "Infarct", "Tumour"],
      sig: "Dynamic air bronchograms favour pneumonia over compressive collapse.",
      icu: ["Antibiotics after cultures", "Check for a parapneumonic effusion", "Monitor response with repeat ultrasound"],
      q: [{ q: "Which finding separates pneumonia from atelectasis?", o: ["Dynamic air bronchograms", "Static air bronchograms", "No pleural line", "A-lines"], a: 0, w: "Air that moves with respiration in the bronchi indicates open airways in consolidated lung." }]
    },
    {
      id: "echo-plax", mod: "us", grp: "Cardiac", t: "Which echo view? Parasternal long axis", img: "echo/plax.jpg", view: "Echo", alt: "Illustration of a parasternal long axis view",
      hx: "Hypotensive patient. You are performing a focused echo.",
      task: "Identify the view.",
      reg: [],
      choice: { q: "Which view is this?", o: ["Parasternal long axis", "Apical four-chamber", "Subcostal four-chamber", "Parasternal short axis"], a: 0, w: "The aortic root and the left atrium sit on the right of the screen, the right ventricle is anterior." },
      find: ["Right ventricle at the top, left ventricle in the middle", "Aortic valve and left atrium at the right of the screen", "Good for pericardial effusion, LV size and function"],
      rep: "Parasternal long axis view.",
      ddx: [], sig: "A systematic focused echo in shock answers: is the heart squeezing, is it full, is the RV big, is there fluid around it?",
      icu: ["Estimate LV function and RV size", "Look for pericardial fluid and tamponade", "Combine with the IVC and lung views"],
      q: [{ q: "In shock, which view quickly shows a pericardial effusion?", o: ["Any view", "Parasternal long axis", "Only the apical view", "None"], a: 1, w: "The long axis shows fluid as a black rim around the heart, anterior and posterior to it." }]
    },
    {
      id: "echo-a4c", mod: "us", grp: "Cardiac", t: "Which echo view? Apical four-chamber", img: "echo/a4c.jpg", view: "Echo", alt: "Illustration of an apical four-chamber view",
      hx: "Breathless patient, suspected right heart strain.",
      task: "Identify the view.",
      reg: [],
      choice: { q: "Which view is this?", o: ["Parasternal long axis", "Apical four-chamber", "Subcostal inferior vena cava", "Parasternal short axis"], a: 1, w: "Four chambers meet at the crux of the heart, with the apex at the top of the sector." },
      find: ["Four chambers with both atrioventricular valves", "Apex at the top", "Compare the RV and LV size. RV larger than the LV suggests strain"],
      rep: "Apical four-chamber view.",
      ddx: [], sig: "The RV:LV ratio on the four-chamber view helps to identify right heart strain in PE.",
      icu: ["Compare RV and LV sizes and look for septal flattening", "Measure TAPSE for RV function", "Look for a small, underfilled LV in hypovolaemia"],
      q: [{ q: "In PE, which finding on the apical four-chamber view suggests right ventricular strain?", o: ["RV larger than LV", "Small RV", "Normal septum", "Thin pericardium"], a: 0, w: "A dilated RV and a flattened septum are classic signs." }]
    },
    {
      id: "echo-psax", mod: "us", grp: "Cardiac", t: "Which echo view? Parasternal short axis", img: "echo/psax.jpg", view: "Echo", alt: "Illustration of a parasternal short axis view",
      hx: "Shock with a suspected hypovolaemic state.",
      task: "Identify the view.",
      reg: [],
      choice: { q: "Which view is this?", o: ["Apical two-chamber", "Parasternal short axis", "Subcostal four-chamber", "IVC long axis"], a: 1, w: "The round LV with the papillary muscles at the bottom marks the short axis at the papillary level." },
      find: ["A round left ventricle with papillary muscles", "RV crescent in front", "Look for septal flattening or the D-shaped LV"],
      rep: "Parasternal short axis at the papillary muscle level.",
      ddx: [], sig: "In hypovolaemia the LV cavity is small and the papillary muscles touch, called kissing papillary muscles.",
      icu: ["Kissing papillary muscles with a small cavity suggest an underfilled LV", "D-shaped septum suggests RV pressure overload", "Combine with IVC and lung findings"],
      q: [{ q: "Kissing papillary muscles suggest:", o: ["Severe LV dilation", "Hypovolaemia or high contractility with a small cavity", "Pericardial effusion", "Aortic stenosis"], a: 1, w: "An empty hyperdynamic LV has a tiny cavity." }]
    },
    {
      id: "echo-sub4", mod: "us", grp: "Cardiac", t: "Which echo view? Subcostal four-chamber", img: "echo/sub4.jpg", view: "Echo", alt: "Illustration of a subcostal four-chamber view",
      hx: "Ventilated patient with chest hyperinflation and no parasternal window.",
      task: "Identify the view.",
      reg: [],
      choice: { q: "Which view is this?", o: ["Parasternal long axis", "Apical two-chamber", "Subcostal four-chamber", "Parasternal short axis"], a: 2, w: "The liver sits at the top of the image, with the four chambers below it." },
      find: ["Liver on top of the picture", "Four chambers lie sideways below", "Useful when the lungs block the chest windows"],
      rep: "Subcostal four-chamber view.",
      ddx: [], sig: "The subcostal window is the best view in COPD and in ventilated patients.",
      icu: ["Use subcostal views in hyperinflated or ventilated patients", "Look for pericardial fluid and RV size", "Follow with the IVC from the same window"],
      q: [{ q: "When is the subcostal window particularly useful?", o: ["In a thin patient lying on the left side", "In COPD, ventilation, or when the parasternal window is poor", "Never", "Only in children"], a: 1, w: "Lung hyperinflation blocks the chest windows, but the liver acts as an acoustic window." }]
    },
    {
      id: "us-ivc", mod: "us", grp: "Cardiac", t: "Inferior vena cava", img: "pocus/ivc.jpg", view: "Subcostal, long axis", alt: "Ultrasound of the inferior vena cava entering the right atrium",
      hx: "Hypotensive patient after sepsis resuscitation. Is more fluid likely to help?",
      task: "Mark the inferior vena cava.",
      reg: [[.60, .52, .20, .20, "Inferior vena cava running through the liver towards the right atrium"]],
      find: ["A tube entering the right atrium through the liver", "Measure the diameter about 2 cm from the atrium", "Look at the change with breathing"],
      rep: "Inferior vena cava, long axis.",
      ddx: [], sig: "A small collapsing IVC suggests a low central venous pressure. A dilated, fixed IVC suggests a high pressure. Neither predicts fluid responsiveness reliably alone.",
      icu: ["Combine the IVC with LV function, lung B-lines and clinical response", "In ventilated patients, use caval distensibility with caution", "Use a passive leg raise to test fluid responsiveness"],
      q: [{ q: "Can the IVC alone decide whether to give fluid?", o: ["Yes, always", "No, use it alongside other findings", "Only in children", "Only in shock"], a: 1, w: "IVC size and variation are imperfect predictors. Combine with other tests." }]
    },
    {
      id: "us-morrison", mod: "us", grp: "Abdomen", t: "FAST: free fluid in Morison's pouch", img: "pocus/morrison.jpg", view: "Right upper quadrant", alt: "Ultrasound with a black stripe between the liver and kidney",
      hx: "Road traffic collision. Blood pressure 82/50, heart rate 130, tender abdomen.",
      task: "Mark the free fluid.",
      reg: [[.55, .45, .17, .06, "Anechoic stripe between the liver and the kidney"]],
      find: ["Black stripe between the liver and the kidney", "Check also the splenorenal space, the pelvis and the pericardium", "Free fluid in a hypotensive trauma patient is blood until proved otherwise"],
      rep: "Positive FAST in the hepatorenal space.",
      ddx: ["Haemoperitoneum", "Ascites", "Urine or bile"],
      sig: "A positive FAST with shock sends the patient to the operating room, not the CT scanner.",
      icu: ["Activate massive transfusion with balanced products and tranexamic acid", "Surgical control now", "Avoid excess crystalloid, aim for permissive hypotension in the absence of head injury"],
      q: [{ q: "FAST positive and the patient is hypotensive. What next?", o: ["CT scan first", "Surgical control and resuscitation with blood", "Observe", "Discharge"], a: 1, w: "Unstable patients with free fluid need immediate haemorrhage control." }]
    },
    {
      id: "us-gb", mod: "us", grp: "Abdomen", t: "Gallstone with acoustic shadow", img: "pocus/gb.jpg", view: "Right upper quadrant", alt: "Ultrasound of a gallbladder with a stone and acoustic shadow",
      hx: "Fever, right upper quadrant pain and a positive sonographic Murphy sign.",
      task: "Mark the gallstone.",
      reg: [[.60, .57, .05, .06, "Echogenic stone with acoustic shadow"]],
      find: ["Bright focus in the gallbladder with a dark shadow behind it", "Wall thickening and pericholecystic fluid point to cholecystitis", "Measure the common bile duct"],
      rep: "Gallstone within a gallbladder. Look for cholecystitis or duct dilatation.",
      ddx: ["Calculous cholecystitis", "Biliary colic", "Cholangitis", "Gallbladder polyp"],
      sig: "Gallstones with fever and jaundice point to cholangitis. This needs urgent drainage.",
      icu: ["Antibiotics and fluids", "Cholangitis: urgent biliary decompression by ERCP", "Cholecystitis: surgical review for cholecystectomy or drainage in the unfit"],
      q: [{ q: "What is Charcot's triad of cholangitis?", o: ["Fever, jaundice, right upper quadrant pain", "Fever, rash, diarrhoea", "Pain, vomiting, constipation", "Jaundice, ascites, encephalopathy"], a: 0, w: "Fever, jaundice and right upper quadrant pain suggest ascending cholangitis." }]
    },
    {
      id: "us-hydro", mod: "us", grp: "Renal", t: "Hydronephrosis", img: "pocus/hydro.jpg", view: "Right kidney, longitudinal", alt: "Ultrasound of a dilated renal collecting system",
      hx: "Oliguria after a catheter blocked. Creatinine rising.",
      task: "Mark the dilated collecting system.",
      reg: [[.50, .48, .20, .18, "Dilated renal pelvis and calyces"], [.42, .26, .12, .08, "Dilated calyx"]],
      find: ["Anechoic dilated calyces and pelvis", "Parenchyma becomes thin", "Check the bladder: if it is empty the obstruction is higher"],
      rep: "Hydronephrosis. Find the level and cause.",
      ddx: ["Obstructive uropathy", "Extrarenal pelvis", "Renal cyst"],
      sig: "Post-renal failure is reversible when the obstruction is relieved early. Infected obstruction is an emergency.",
      icu: ["Check and flush or replace the urinary catheter", "Nephrostomy or stent if the upper tract is obstructed", "Monitor for post-obstructive diuresis and electrolyte shifts"],
      q: [{ q: "After releasing a long-standing obstruction, what should you watch for?", o: ["Anuria", "Post-obstructive diuresis and electrolyte loss", "Hypertension only", "Nothing"], a: 1, w: "Large urine volumes and electrolyte wasting can follow." }]
    },
    {
      id: "us-bladder", mod: "us", grp: "Renal", t: "Distended bladder", img: "pocus/bladder.jpg", view: "Suprapubic", alt: "Ultrasound of a distended bladder with a catheter balloon",
      hx: "Anuric patient with a catheter in place. Is it working?",
      task: "Mark the bladder.",
      reg: [[.50, .48, .24, .16, "Bladder with the catheter balloon"]],
      find: ["Large anechoic bladder", "A catheter balloon appears as a ring", "A collapsed bladder around the balloon means the catheter is draining"],
      rep: "Distended bladder with a catheter balloon inside.",
      ddx: ["Retention", "Blocked catheter", "Catheter out of position"],
      sig: "Check the bladder before calling it renal failure.",
      icu: ["Flush or change the catheter and re-scan", "Look at the kidneys for hydronephrosis", "Measure urine output hourly after relief"],
      q: [{ q: "A catheter drains nothing and the bladder is full on ultrasound. What is the likely problem?", o: ["Renal failure", "A blocked or misplaced catheter", "Dehydration", "Normal"], a: 1, w: "Fix the catheter first." }]
    },
    {
      id: "us-dvt", mod: "us", grp: "Vascular", t: "Femoral deep vein thrombosis", img: "pocus/dvt.jpg", view: "Left groin, compression", cmp: { src: "pocus/veinshut.jpg", cap: "Reference: a normal vein collapses under probe pressure (illustration)" }, alt: "Ultrasound of a groin with a thrombosed vein",
      hx: "Post-operative patient with a swollen left leg.",
      task: "Mark the vein with thrombus. Do not mark the empty artery.",
      reg: [[.63, .47, .10, .12, "Non-compressible vein filled with echogenic thrombus"]],
      find: ["One round vessel is empty and black, the other is filled with echogenic material", "The thrombosed vein does not collapse under the probe", "Thrombus makes the vein non-compressible"],
      rep: "Non-compressible, thrombus-filled femoral vein, in keeping with DVT.",
      ddx: ["Acute DVT", "Chronic thrombosis", "Extrinsic compression"],
      sig: "Proximal DVT with a PE-like picture means anticoagulation, unless contraindicated.",
      icu: ["Therapeutic anticoagulation", "Consider IVC filter only when anticoagulation is contraindicated", "Look for PE if breathless"],
      q: [{ q: "What is the main ultrasound sign of DVT?", o: ["A pulsatile vein", "A non-compressible vein", "A bright artery", "Fluid around the vein"], a: 1, w: "A normal vein collapses with gentle probe pressure." }]
    },
    {
      id: "us-popclot", mod: "us", grp: "Vascular", t: "Popliteal vein thrombus", img: "pocus/popclot.jpg", view: "Left popliteal fossa", alt: "Ultrasound of the popliteal fossa with a thrombosed vein",
      hx: "Calf pain and swelling after a long flight.",
      task: "Mark the thrombosed popliteal vein.",
      reg: [[.57, .55, .09, .10, "Non-compressible popliteal vein with thrombus"]],
      find: ["Echogenic material inside the vein", "No compression", "Scan the femoral and calf veins as well"],
      rep: "Popliteal vein thrombosis.",
      ddx: ["DVT", "Baker's cyst", "Muscle haematoma"],
      sig: "Popliteal DVT counts as proximal and is treated with full anticoagulation.",
      icu: ["Therapeutic anticoagulation for at least three months in provoked DVT", "Use a risk score and consider PE"],
      q: [{ q: "Is a popliteal vein DVT proximal?", o: ["No", "Yes", "Only if above the knee", "Only in the elderly"], a: 1, w: "The popliteal vein is classified as proximal." }]
    },
    {
      id: "us-onsd", mod: "us", grp: "Neuro", t: "Optic nerve sheath diameter", img: "pocus/onsd.jpg", view: "Ocular, transverse", alt: "Ultrasound of the eye with the optic nerve sheath behind the globe",
      hx: "Head-injured patient with a falling GCS. Suspected raised intracranial pressure.",
      task: "Mark the point behind the globe where the sheath is measured.",
      reg: [[.57, .49, .08, .10, "Optic nerve sheath, measured 3 mm behind the globe"]],
      find: ["The globe is the black circle", "The nerve sheath is a dark band behind it", "Measure 3 mm behind the retina, with a calibrated scale"],
      rep: "Optic nerve sheath region identified. This image has no scale, so no diameter can be given.",
      ddx: [],
      sig: "A sheath above about 5 mm in adults suggests raised intracranial pressure but does not replace CT or monitoring.",
      icu: ["Use as an adjunct, not a replacement for CT", "Head up, treat pain, correct hypoxia and hypercapnia", "Escalate if the GCS falls"],
      q: [{ q: "Where is optic nerve sheath diameter measured?", o: ["On the globe", "3 mm behind the globe", "At the orbital apex", "On the eyelid"], a: 1, w: "A standard measurement point makes results comparable." }]
    }
  ]);
})();
