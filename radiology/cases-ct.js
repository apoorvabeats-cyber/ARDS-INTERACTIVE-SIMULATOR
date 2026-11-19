/* Radiology Lab, CT cases. Same schema as cases-cxr.js. First draft, needs clinical review. */
(function () {
  var R = window.RAD = window.RAD || { cases: [] };
  R.add = R.add || function (a) { a.forEach(function (c) { R.cases.push(c); }); };
  var NORM = { src: "scans/normal.jpg", cap: "Reference: non-contrast axial CT head with no acute abnormality" };
  R.add([
    {
      id: "ct-ich", mod: "ct", grp: "Brain", t: "Hypertensive basal ganglia haemorrhage", img: "scans/ich-bg.png", view: "Axial, non-contrast", cmp: NORM,
      alt: "Axial CT head with a large right basal ganglia haemorrhage",
      hx: "62-year-old with poorly controlled hypertension. Sudden headache, vomiting and left-sided weakness. GCS 11. Blood pressure 210/110.",
      task: "Mark the haemorrhage.",
      reg: [[.36, .44, .17, .15, "Right basal ganglia haematoma"]],
      find: ["Large hyperdense haematoma in the right basal ganglia", "Surrounding hypodense oedema and mass effect on the right lateral ventricle", "Look for intraventricular extension and midline shift"],
      rep: "Acute right basal ganglia intracerebral haemorrhage with mass effect.",
      ddx: ["Hypertensive haemorrhage", "Haemorrhage into a tumour", "Vascular malformation", "Amyloid angiopathy (lobar, not deep)", "Haemorrhagic transformation of infarct"],
      sig: "Deep haematomas in a hypertensive patient are most often hypertensive. Volume, intraventricular extension and GCS decide prognosis and surgery.",
      icu: ["Secure the airway if GCS 8 or below or the airway is unsafe", "Lower systolic pressure to about 140 and avoid large swings, as guidelines advise", "Reverse anticoagulants at once", "Neurosurgery for hydrocephalus or cerebellar haematoma", "Head up 30 degrees, normothermia, treat seizures"],
      q: [{ q: "A patient on warfarin has an intracerebral haemorrhage. What is the priority?", o: ["Wait for the INR", "Reverse anticoagulation immediately with prothrombin complex and vitamin K", "Give aspirin", "Start low-dose heparin"], a: 1, w: "Haematoma expansion happens early, so reversal is urgent." }]
    },
    {
      id: "ct-sdh", mod: "ct", grp: "Brain", t: "Subdural haematoma with mass effect", img: "scans/ich-shift.png", view: "Axial, non-contrast", cmp: NORM,
      alt: "Axial CT head with a crescentic right subdural collection and midline shift",
      hx: "78-year-old on aspirin who fell a week ago. Increasing drowsiness. GCS 10, left arm weak.",
      task: "Mark the extra-axial collection.",
      reg: [[.15, .45, .12, .28, "Crescentic right convexity subdural collection"]],
      find: ["A crescent-shaped collection along the right convexity, crossing sutures", "Mixed density inside it suggests blood of different ages", "Midline shift to the left and compression of the right ventricle"],
      rep: "Right subdural haematoma, acute on chronic, with significant mass effect.",
      ddx: ["Subdural haematoma", "Subdural empyema", "Hygroma", "Epidural haematoma (lentiform, not a crescent)"],
      sig: "A subdural bleed in the elderly follows minor trauma. Shift out of proportion to a GCS drop is the warning sign.",
      icu: ["Urgent neurosurgical referral for evacuation", "Reverse antithrombotics and correct platelets and coagulation", "Head up, avoid hypotension and hypoxia", "Treat seizures. Plan repeat CT if the GCS falls"],
      q: [{ q: "What shape is a subdural collection on CT?", o: ["Biconvex", "Crescentic, crossing sutures", "Round", "Linear in the cisterns"], a: 1, w: "A subdural bleed spreads over the brain surface and crosses sutures, but not the falx." }]
    },
    {
      id: "ct-edh", mod: "ct", grp: "Brain", t: "Epidural haematoma", img: "scans/edh.jpg", view: "Axial, non-contrast", cmp: NORM,
      alt: "Axial CT head with a lentiform hyperdense collection",
      hx: "24-year-old, struck on the head in a road accident, briefly unconscious, then lucid, then drowsy with a dilated pupil.",
      task: "Mark the lentiform haematoma.",
      reg: [[.79, .55, .07, .17, "Biconvex extra-axial haematoma"]],
      find: ["Biconvex hyperdense collection against the inner table", "It does not cross sutures", "Mass effect with midline shift"],
      rep: "Acute epidural haematoma with mass effect.",
      ddx: ["Subdural haematoma", "Contusion", "Meningioma"],
      sig: "An epidural haematoma is arterial and expands fast. It is a surgical emergency but can have an excellent outcome if drained early.",
      icu: ["Immediate neurosurgery", "Airway protection and neuro-observation", "Correct coagulopathy", "Do not wait for a deterioration if the haematoma is large"],
      q: [{ q: "What is the classic course of an epidural haematoma?", o: ["Slow deterioration over weeks", "Head injury, lucid interval, then deterioration", "Thunderclap headache", "Fever then seizure"], a: 1, w: "The middle meningeal artery bleeds, giving a lucid interval before herniation." }]
    },
    {
      id: "ct-sah", mod: "ct", grp: "Brain", t: "Subarachnoid haemorrhage", img: "cts/sah.jpg", view: "Axial, non-contrast", cmp: NORM,
      alt: "Axial CT head with hyperdense blood in the basal cisterns",
      hx: "45-year-old with a thunderclap headache, vomiting and neck stiffness. GCS 14.",
      task: "Mark the blood in the basal cisterns.",
      reg: [[.58, .40, .20, .12, "Subarachnoid blood in the suprasellar and sylvian cisterns"]],
      find: ["Hyperdense blood filling the suprasellar cistern and sylvian fissures", "Look for hydrocephalus and intraventricular blood", "Sensitivity falls with each hour after onset"],
      rep: "Acute subarachnoid haemorrhage. Perform CT angiography to look for an aneurysm.",
      ddx: ["Aneurysmal SAH", "Perimesencephalic haemorrhage", "Traumatic SAH", "Reversible cerebral vasoconstriction syndrome"],
      sig: "SAH outcome depends on the grade and on securing the aneurysm quickly. Delayed ischaemia and rebleeding drive outcome.",
      icu: ["Transfer to a neurovascular centre", "Systolic below 160 until secured, avoid hypotension", "Nimodipine 60 mg every 4 hours", "Treat hydrocephalus with an external ventricular drain", "Monitor sodium, and watch for delayed cerebral ischaemia from day 3 to 14"],
      q: [{ q: "Which drug reduces delayed ischaemic deficit after SAH?", o: ["Tranexamic acid for weeks", "Nimodipine", "Mannitol", "Aspirin"], a: 1, w: "Nimodipine improves outcome in aneurysmal SAH." }]
    },
    {
      id: "ct-hydro", mod: "ct", grp: "Brain", t: "Hydrocephalus", img: "cts/hydro.jpg", view: "Axial, non-contrast", cmp: NORM,
      alt: "Axial CT head with enlarged lateral ventricles",
      hx: "Patient with a previous bleed becomes drowsy with headache and vomiting. Pupils sluggish.",
      task: "Mark the enlarged ventricles.",
      reg: [[.50, .58, .17, .20, "Dilated lateral ventricles"]],
      find: ["Enlarged frontal and occipital horns of the lateral ventricles", "Rounded frontal horns", "Check for periventricular low density that suggests raised pressure"],
      rep: "Marked ventricular dilatation, in keeping with hydrocephalus.",
      ddx: ["Obstructive hydrocephalus", "Communicating hydrocephalus after SAH or meningitis", "Ex vacuo atrophy"],
      sig: "Acute hydrocephalus raises intracranial pressure and can kill. It is treatable.",
      icu: ["Urgent neurosurgical review for an external ventricular drain", "Head up, treat pain and agitation, avoid hypercapnia", "Look for the cause on the scan: haemorrhage, tumour, posterior fossa lesion"],
      q: [{ q: "What is the emergency treatment of acute obstructive hydrocephalus?", o: ["Lumbar puncture", "External ventricular drain", "Hypotonic fluids", "Observation"], a: 1, w: "Lumbar puncture risks herniation. CSF diversion by EVD is the treatment." }]
    },
    {
      id: "ct-cvt", mod: "ct", grp: "Brain", t: "Cerebral venous thrombosis: empty delta sign", img: "scans/empty-delta.jpg", view: "Axial, contrast-enhanced", cmp: NORM,
      alt: "Contrast CT head with a filling defect in the superior sagittal sinus",
      hx: "28-year-old woman on an oral contraceptive. Two weeks of headache, now a focal seizure.",
      task: "Mark the empty delta sign.",
      reg: [[.50, .82, .07, .06, "Filling defect in the posterior superior sagittal sinus"]],
      find: ["Posterior sinus shows an enhancing rim around a central low density", "Cortical veins may be dense on non-contrast", "Venous infarcts and haemorrhage may cross arterial territories"],
      rep: "Filling defect in the superior sagittal sinus, the empty delta sign, in keeping with sinus thrombosis. Confirm with CT or MR venography.",
      ddx: ["Cerebral venous thrombosis", "Arachnoid granulation", "Sinus hypoplasia"],
      sig: "CVT is treated with anticoagulation, even with haemorrhagic infarcts.",
      icu: ["Therapeutic heparin (low-molecular-weight or unfractionated), even with haemorrhage", "Treat seizures and raised pressure", "Look for a cause: oestrogen, pregnancy, thrombophilia, infection, cancer", "Endovascular therapy in selected deteriorating patients"],
      q: [{ q: "What treatment is given for cerebral venous thrombosis with a venous haemorrhage?", o: ["Withhold all anticoagulation", "Therapeutic anticoagulation", "Thrombolysis for everyone", "Aspirin alone"], a: 1, w: "Anticoagulation is standard even with haemorrhagic transformation." }]
    },
    {
      id: "ct-pe", mod: "ct", grp: "Chest", t: "Pulmonary embolism on CT angiography", img: "cts/pe1.jpg", view: "Axial, CT pulmonary angiogram",
      alt: "CT pulmonary angiogram with filling defects in the pulmonary arteries",
      hx: "Post-operative patient with sudden breathlessness, heart rate 120, saturation 88%, blood pressure 98/60.",
      task: "Mark the filling defects. There are three sites.",
      reg: [[.28, .55, .07, .07, "Right pulmonary artery filling defect"], [.44, .51, .10, .06, "Central pulmonary artery filling defect"], [.69, .58, .08, .07, "Left pulmonary artery filling defect"]],
      find: ["Low-density filling defects within the opacified pulmonary arteries", "Central, extensive thrombus", "Look at the right ventricle: dilation and septal bowing mean strain"],
      rep: "Extensive central pulmonary emboli. Assess right ventricular strain on the same scan.",
      ddx: ["Acute pulmonary embolism", "Chronic thromboembolic disease", "Flow artefact"],
      sig: "Right ventricular strain with hypotension defines high-risk PE. This needs reperfusion.",
      icu: ["Anticoagulate immediately, unless a contraindication", "High-risk PE (shock): systemic thrombolysis, or catheter or surgical therapy if contraindicated", "Echo for RV size and function", "Careful fluids and vasopressor, avoid intubation if possible"],
      q: [{ q: "A patient with PE has sustained hypotension. Which category is this?", o: ["Low risk", "Intermediate-low risk", "High risk (massive)", "Subsegmental PE"], a: 2, w: "Sustained systolic below 90 or the need for vasopressors is high-risk and needs reperfusion." }]
    },
    {
      id: "ct-covid", mod: "ct", grp: "Chest", t: "Peripheral ground-glass opacities", img: "cts/covid.jpg", view: "Axial, lung window",
      alt: "Axial chest CT with peripheral ground-glass opacities in both lungs",
      hx: "58-year-old with fever, dry cough and falling saturation over five days.",
      task: "Mark the abnormal lung. Both sides are involved.",
      reg: [[.15, .75, .13, .12, "Right posterior peripheral ground-glass"], [.80, .75, .13, .12, "Left posterior peripheral ground-glass"]],
      find: ["Bilateral, peripheral, subpleural ground-glass opacities", "Posterior and lower predominance", "No large effusion or lymphadenopathy"],
      rep: "Bilateral peripheral ground-glass opacities. In an epidemic setting this is the classic pattern of viral pneumonitis, including COVID-19.",
      ddx: ["Viral pneumonia", "Organising pneumonia", "Pulmonary oedema", "Pneumocystis (central, in the immunosuppressed)", "Drug toxicity"],
      sig: "Pattern recognition guides the test. Confirm the pathogen with PCR, and treat the physiology.",
      icu: ["Oxygen, high-flow nasal oxygen, awake prone positioning", "Test for the virus and exclude bacterial co-infection", "Steroids when oxygen is required, according to current guidance", "Ventilate with lung-protective settings when intubated"],
      q: [{ q: "Which distribution suggests organising pneumonia or viral pneumonitis?", o: ["Upper-lobe apical", "Peripheral subpleural", "Isolated hilar", "Centrilobular nodules in the upper lobes"], a: 1, w: "Peripheral subpleural ground-glass is a typical pattern of both." }]
    },
    {
      id: "ct-pneumonia", mod: "ct", grp: "Chest", t: "Lobar consolidation on CT", img: "cts/pneumonia.jpg", view: "Axial, mediastinal window",
      alt: "Axial chest CT with right lung consolidation",
      hx: "Elderly man with fever, productive cough and right-sided pleuritic pain. Saturation 90%.",
      task: "Mark the consolidated lung.",
      reg: [[.24, .55, .13, .28, "Right lung consolidation"]],
      find: ["Dense consolidation in the right lung with air bronchograms", "No gross pleural collection on this slice", "Look at the mediastinum for nodes"],
      rep: "Right lung consolidation, in keeping with pneumonia.",
      ddx: ["Bacterial pneumonia", "Obstructive pneumonia from a mass", "Pulmonary infarct", "Haemorrhage"],
      sig: "CT separates consolidation from effusion and finds complications: empyema, abscess, obstruction.",
      icu: ["Antibiotics according to the local antibiogram and guidelines", "Look for a complicating effusion and sample if infected", "Persisting consolidation in a smoker needs a follow-up scan"],
      q: [{ q: "What does an air bronchogram mean?", o: ["Air in the pleural space", "Air-filled bronchi seen through consolidated lung", "A bronchial tumour", "Emphysema"], a: 1, w: "Airless alveoli make the open bronchi visible." }]
    },
    {
      id: "ct-ptx", mod: "ct", grp: "Chest", t: "Pneumothorax with lung collapse", img: "cts/ptx.jpg", view: "Axial, lung window",
      alt: "Axial chest CT with a large left pneumothorax and collapsed lung",
      hx: "Ventilated patient, sudden desaturation. The film is equivocal and the patient is stable enough for CT.",
      task: "Mark the pneumothorax.",
      reg: [[.80, .33, .12, .15, "Anterior left pneumothorax"]],
      find: ["Air in the pleural space, anterior in a supine patient", "The underlying lung is collapsed and consolidated", "CT finds air that a supine film misses"],
      rep: "Large left pneumothorax with collapse of the underlying lung.",
      ddx: ["Bulla", "Skin fold", "Pneumatocoele"],
      sig: "Supine patients collect pleural air anteriorly, so films can miss it. CT and ultrasound are more sensitive.",
      icu: ["Drain, especially before ventilating", "Check drain position and re-expansion", "Treat the cause, such as barotrauma or a ruptured bulla"],
      q: [{ q: "Where does pleural air collect in a supine patient?", o: ["At the apex", "Anteriorly and at the base", "Posteriorly", "At the hilum"], a: 1, w: "The anterior costophrenic recess is the highest point when lying flat." }]
    },
    {
      id: "ct-empyema", mod: "ct", grp: "Chest", t: "Empyema with gas", img: "cts/empyema.jpg", view: "Axial, mediastinal window",
      alt: "Axial chest CT with a left pleural collection containing gas bubbles",
      hx: "Patient with pneumonia and persistent fever for ten days despite antibiotics. Left-sided pain.",
      task: "Mark the pleural collection.",
      reg: [[.72, .74, .14, .12, "Left posterior pleural collection with gas"]],
      find: ["Loculated collection in the left posterior pleural space", "Gas bubbles within it", "Enhancing thickened pleura, the split pleura sign"],
      rep: "Left pleural collection with gas and pleural enhancement, in keeping with empyema.",
      ddx: ["Parapneumonic effusion", "Lung abscess", "Haemothorax", "Bronchopleural fistula"],
      sig: "An infected pleural collection will not clear with antibiotics alone. It needs drainage.",
      icu: ["Ultrasound-guided drainage with a small-bore drain", "Intrapleural fibrinolytic therapy for loculation, or surgical decortication", "Review antibiotics against pleural fluid culture"],
      q: [{ q: "A pleural fluid pH is below 7.2 with infection. What does this indicate?", o: ["Simple effusion, observe", "Complicated effusion or empyema needing drainage", "Chylothorax", "Heart failure"], a: 1, w: "Low pH signals infection needing drainage." }]
    },
    {
      id: "ct-freeair", mod: "ct", grp: "Abdomen", t: "Pneumoperitoneum", img: "cts/freeair.jpg", view: "Axial, soft tissue window",
      alt: "Axial abdominal CT with free air under the anterior abdominal wall",
      hx: "Elderly man with sudden severe abdominal pain, rigid abdomen, heart rate 118 and blood pressure 90/50.",
      task: "Mark the free intraperitoneal air.",
      reg: [[.35, .16, .20, .06, "Free air beneath the anterior abdominal wall"]],
      find: ["Black air collection against the anterior wall, the highest point when supine", "Free fluid or thickened bowel nearby", "Look for the site of perforation"],
      rep: "Pneumoperitoneum, in keeping with a perforated hollow viscus.",
      ddx: ["Perforated peptic ulcer", "Perforated diverticulitis", "Perforated bowel", "Recent surgery or laparoscopy"],
      sig: "Free air with peritonitis is a surgical emergency.",
      icu: ["Resuscitate, broad antibiotics covering gut organisms and anaerobes, analgesia", "Urgent surgical review for source control", "Look for the site on the scan and tell the surgeon", "Anticipate septic shock and vasopressors"],
      q: [{ q: "Where does free air collect in a supine patient?", o: ["Under the diaphragm only", "Anteriorly beneath the abdominal wall", "In the pelvis", "Around the kidney"], a: 1, w: "Gas rises to the anterior non-dependent peritoneum in the supine position." }]
    },
    {
      id: "ct-sbo", mod: "ct", grp: "Abdomen", t: "Small bowel obstruction", img: "cts/sbo.jpg", view: "Coronal, contrast-enhanced",
      alt: "Coronal abdominal CT with dilated small bowel loops",
      hx: "Previous abdominal surgery. Colicky pain, vomiting and a distended abdomen for two days.",
      task: "Mark the dilated bowel.",
      reg: [[.27, .55, .15, .22, "Dilated small bowel loops"]],
      find: ["Dilated small bowel loops proximal to a transition point", "Collapsed bowel beyond it", "Look for a closed loop, bowel wall thickening or reduced enhancement"],
      rep: "Dilated small bowel, in keeping with small bowel obstruction. Locate the transition point.",
      ddx: ["Adhesional obstruction", "Hernia", "Malignancy", "Volvulus", "Ileus"],
      sig: "Strangulation turns a conservative case into an emergency. Look for wall changes and free fluid.",
      icu: ["Nil by mouth, nasogastric decompression, fluid resuscitation and electrolytes", "Surgery for peritonitis, ischaemia or a closed loop", "Water-soluble contrast study for adhesional cases"],
      q: [{ q: "Which CT sign suggests bowel ischaemia in obstruction?", o: ["Dilated loops only", "Reduced wall enhancement and mesenteric fluid", "Normal feces sign", "Gas in the rectum"], a: 1, w: "Poor wall enhancement and mesenteric oedema indicate compromised bowel." }]
    },
    {
      id: "ct-liver-abscess", mod: "ct", grp: "Abdomen", t: "Liver abscess", img: "cts/abscess.jpg", view: "Axial, contrast-enhanced",
      alt: "Axial abdominal CT with a low-density lesion in the right lobe of the liver",
      hx: "Fever and right upper quadrant pain for a week. Diabetic. Raised CRP and white cell count.",
      task: "Mark the abscess.",
      reg: [[.26, .60, .10, .12, "Low-density lesion in the right lobe"]],
      find: ["Low-density, rim-enhancing lesion in the right lobe", "Look for gas within it or a biliary or portal source", "Check for rupture or extension"],
      rep: "Right lobe hepatic abscess.",
      ddx: ["Pyogenic abscess", "Amoebic abscess", "Necrotic tumour", "Hydatid cyst"],
      sig: "A liver abscess needs drainage and a source. In India and other endemic areas test for amoebiasis.",
      icu: ["Image-guided drainage for large abscesses", "Blood cultures and antibiotics covering enteric organisms and anaerobes", "Amoebic serology and metronidazole when suspected", "Look for biliary or colonic source"],
      q: [{ q: "Which infection should be considered in a liver abscess in an endemic area?", o: ["Entamoeba histolytica", "Only Staphylococcus", "Cryptococcus", "Influenza"], a: 0, w: "Amoebic liver abscess is common in the tropics and treated with metronidazole." }]
    },
    {
      id: "ct-aaa", mod: "ct", grp: "Abdomen", t: "Abdominal aortic aneurysm", img: "cts/aaa.jpg", view: "Axial and coronal, contrast-enhanced",
      alt: "Axial and coronal CT showing an abdominal aortic aneurysm",
      hx: "Elderly smoker with abdominal and back pain, hypotension and a pulsatile mass.",
      task: "Mark the aneurysm on the coronal image on the right.",
      reg: [[.77, .47, .07, .09, "Abdominal aortic aneurysm"]],
      find: ["Dilated infrarenal aorta with a wall calcification", "Look for a draining haematoma, peri-aortic stranding or a hyperattenuating crescent", "Check the renal artery origin"],
      rep: "Abdominal aortic aneurysm. Look for signs of rupture.",
      ddx: ["Aortic aneurysm", "Contained rupture", "Aortic dissection", "Retroperitoneal haematoma"],
      sig: "Symptomatic aneurysm with hypotension is a ruptured aneurysm until proved otherwise.",
      icu: ["Call vascular surgery and arrange the operating room", "Permissive hypotension (about 70 to 90 mmHg systolic) with large-bore access", "Activate massive transfusion", "Endovascular repair if the anatomy suits"],
      q: [{ q: "Which blood-pressure strategy is used for a ruptured aortic aneurysm before control?", o: ["Normotension with large volumes of crystalloid", "Permissive hypotension with early blood products", "Hypertension", "No treatment"], a: 1, w: "Higher pressure restarts bleeding. Early blood and rapid control are the aims." }]
    },
    {
      id: "ct-pvt", mod: "ct", grp: "Abdomen", t: "Portal vein thrombosis", img: "cts/pvt.jpg", view: "Axial, portal venous phase",
      alt: "Axial abdominal CT with a filling defect in the portal vein",
      hx: "Patient with cirrhosis and new abdominal pain and ascites.",
      task: "Mark the portal vein thrombus.",
      reg: [[.38, .49, .07, .06, "Filling defect in the portal vein"]],
      find: ["Low-density thrombus within the portal vein", "Look for cavernous transformation and bowel ischaemia", "Splenomegaly and ascites suggest portal hypertension"],
      rep: "Portal vein thrombosis.",
      ddx: ["Bland thrombus", "Tumour thrombus from hepatocellular carcinoma", "Flow artefact"],
      sig: "Portal vein thrombosis in cirrhosis can worsen portal hypertension and extend to the mesenteric veins.",
      icu: ["Anticoagulation for acute thrombosis, after assessing varices", "Look for a cause: cirrhosis, cancer, infection, thrombophilia", "Check for mesenteric extension and ischaemia"],
      q: [{ q: "Before anticoagulating portal vein thrombosis in cirrhosis, what should be assessed?", o: ["Varices and bleeding risk", "Only the albumin", "Nothing", "Only the heart rate"], a: 0, w: "Variceal bleeding risk is managed before or alongside anticoagulation." }]
    },
    {
      id: "ct-hydronephrosis", mod: "ct", grp: "Abdomen", t: "Hydronephrosis", img: "cts/kidney.jpg", view: "Axial, non-contrast",
      alt: "Axial abdominal CT with a grossly dilated right collecting system",
      hx: "Patient with flank pain, fever and a creatinine rising from 100 to 260 µmol/L.",
      task: "Mark the dilated collecting system.",
      reg: [[.27, .52, .14, .14, "Grossly dilated right collecting system"]],
      find: ["Large fluid-filled collecting system with thinned parenchyma", "Look for a stone at the pelviureteric or vesicoureteric junction", "Perinephric stranding suggests infection"],
      rep: "Severe right hydronephrosis. Look for the obstructing cause.",
      ddx: ["Obstructing stone", "Pelviureteric junction obstruction", "Tumour", "Pyonephrosis"],
      sig: "An infected obstructed kidney is a urological emergency. Antibiotics alone will not clear it.",
      icu: ["Urgent decompression: percutaneous nephrostomy or ureteric stent", "Blood and urine cultures and broad antibiotics", "Monitor for sepsis and renal failure"],
      q: [{ q: "What is the treatment of an infected obstructed kidney?", o: ["Antibiotics alone", "Decompression plus antibiotics", "Diuretics", "Observation"], a: 1, w: "Source control by drainage is essential." }]
    },
    {
      "id": "ct-cine-lung",
      "mod": "ct",
      "grp": "Scroll the chest (real CT)",
      "t": "Chest CT, lung window: scroll from the upper abdomen to the lung apex",
      "img": "radiology/media/ct-chest-lung.webm",
      "kind": "cine",
      "fps": 12,
      "unit": "Slice",
      "view": "Axial, lung window, non-contrast",
      "alt": "Cine loop scrolling through an axial chest CT in a lung window",
      "hx": "Anonymised research CT of an adult from a published lung cancer imaging trial. No clinical details come with the scan, so this case teaches how to scroll a chest CT. It does not teach a diagnosis.",
      "task": "Press Play, or step one slice at a time with the frame buttons. Scroll up through the chest, then answer the question.",
      "choice": {
        "q": "In the upper chest (slices 85 to 105) a round, black, air-filled structure lies in the midline in front of the spine. What is it?",
        "o": [
          "Oesophagus",
          "Trachea",
          "Aortic arch",
          "Superior vena cava"
        ],
        "a": 1,
        "w": "The trachea is air-filled, so it is black on every window. The oesophagus lies behind and to the left of it and is a collapsed soft-tissue tube."
      },
      "find": [
        "Scrolling upward you pass the liver dome, the heart, the carina and then the lung apices",
        "Around slice 46 a rounded opacity with a hazy rim lies in the left lower lobe near the back of the chest. Image right is the patient's left",
        "Smaller round opacities are visible in the right lung, for example around slices 52 and 75",
        "These are descriptive observations. This lab has not read the scan for diagnosis"
      ],
      "rep": "Research chest CT in a lung window. Several rounded pulmonary opacities are visible. The scan comes from a lung cancer trial and has not been read for this lab, so no diagnosis is made.",
      "sig": "Scrolling the whole series is how nodules, small effusions and airway changes are found, because one slice hides them. Nodules are judged by size, density and change over time, so always compare with earlier scans.",
      "icuTitle": "A systematic search",
      "icu": [
        "Airways first, then lungs, pleura, mediastinum, heart and great vessels, upper abdomen and bones",
        "Read the lungs in a lung window and nodes, vessels and pleura in a mediastinal window",
        "Compare with previous imaging before calling a finding new"
      ],
      "q": [
        {
          "q": "Which window shows airways, ground-glass change and lung vessels best?",
          "o": [
            "Brain (centre 40, width 80)",
            "Lung (centre -600, width 1500)",
            "Bone (centre 400, width 1800)",
            "Subdural (centre 75, width 215)"
          ],
          "a": 1,
          "w": "Lung tissue is about -800 HU. A wide window centred near -600 puts it mid-grey so small density changes are visible."
        },
        {
          "q": "On an axial CT, which side of the screen is the patient's right?",
          "o": [
            "The left side of the screen",
            "The right side of the screen",
            "It depends on the window",
            "The top"
          ],
          "a": 0,
          "w": "Axial CT is displayed as if you stand at the foot of the bed. The patient's right is on the left of the screen. The liver confirms it here."
        }
      ],
      "sourceTag": {
        "tag": "REAL CT · CC BY 3.0",
        "chip": "Real CT scan, CC BY 3.0",
        "real": true,
        "text": "Real anonymised CT from The Cancer Imaging Archive (ACRIN-NSCLC-FDG-PET, CC BY 3.0), shown as a slice-by-slice cine. Display is 8 bit, so the W/L tool changes contrast only. This is not a DICOM viewer."
      },
      "cr": [
        "acrin"
      ],
      "reg": []
    },
    {
      "id": "ct-cine-med",
      "mod": "ct",
      "grp": "Scroll the chest (real CT)",
      "t": "The same chest in a mediastinal window",
      "img": "radiology/media/ct-chest-mediastinum.webm",
      "kind": "cine",
      "fps": 12,
      "unit": "Slice",
      "view": "Axial, mediastinal window, non-contrast",
      "alt": "Cine loop scrolling through an axial chest CT in a soft-tissue window",
      "hx": "The same anonymised series as the lung-window case, shown in a soft-tissue window. No clinical details come with the scan.",
      "task": "Scroll the series and compare it with the lung window. Then answer the question.",
      "choice": {
        "q": "Why do the lungs look completely black in this window?",
        "o": [
          "The lungs are removed from this series",
          "Lung density is below the bottom of the window, so it displays as black",
          "Contrast agent fills the lungs",
          "Both lungs are collapsed"
        ],
        "a": 1,
        "w": "With centre 40 and width 400 the window starts near -160 HU. Aerated lung is about -800 HU, so it is shown as black and its detail is lost."
      },
      "find": [
        "The heart, aorta, pulmonary arteries, trachea and main bronchi stand out against fat and muscle",
        "Bone cortex is bright and subcutaneous fat is dark grey",
        "The rounded lung opacities seen in the lung window are hard to see here, because a soft-tissue window hides lung detail",
        "Hilar and mediastinal soft tissue is judged in this window"
      ],
      "rep": "Research chest CT in a mediastinal window, normal windowing for soft tissue. Not read for diagnosis.",
      "sig": "Every chest CT needs both windows. A lung nodule can vanish in a soft-tissue window, and a node or pleural thickening can vanish in a lung window.",
      "icuTitle": "Using the windows",
      "icu": [
        "Lung window for parenchyma, airways and pneumothorax",
        "Mediastinal window for vessels, nodes, pleura and chest wall",
        "Bone window for ribs and spine when injury is suspected"
      ],
      "q": [
        {
          "q": "Which window would you use to look for a small pneumothorax?",
          "o": [
            "Mediastinal",
            "Lung",
            "Brain",
            "Abdomen"
          ],
          "a": 1,
          "w": "Air in the pleural space is easiest to separate from lung in the lung window."
        }
      ],
      "sourceTag": {
        "tag": "REAL CT · CC BY 3.0",
        "chip": "Real CT scan, CC BY 3.0",
        "real": true,
        "text": "Real anonymised CT from The Cancer Imaging Archive (ACRIN-NSCLC-FDG-PET, CC BY 3.0), shown as a slice-by-slice cine. Display is 8 bit, so the W/L tool changes contrast only. This is not a DICOM viewer."
      },
      "cr": [
        "acrin"
      ],
      "reg": []
    }
  ]);
})();
