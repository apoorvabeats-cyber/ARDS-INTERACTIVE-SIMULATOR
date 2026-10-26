const OSCE_STATIONS = {
  kit: [
    { id: "airway", name: "Airway and intubation", items: [
      { id: "scope", name: "Laryngoscope / video laryngoscope",
        use: "It is used to see the vocal cords so the tube is passed under vision. A video laryngoscope shows that view to the whole team.",
        check: "Seeing the cords is not the final check. A sustained waveform of exhaled carbon dioxide confirms the tube is in the trachea." },
      { id: "tube", name: "Endotracheal tubes, stylet and bougie",
        use: "The tube is the airway. A stylet shapes it. A bougie is the thin introducer for a poor view, and the tube is then railroaded over it.",
        check: "Do not force a tube that will not pass over the bougie. Cuff pressure sits around 20 to 30 centimetres of water, and carbon dioxide still confirms the trachea." },
      { id: "bvm", name: "Bag-valve-mask",
        use: "The bag and mask oxygenate and ventilate a patient who is not breathing well, and they preoxygenate the patient before intubation.",
        check: "Use two people, a jaw thrust, and an oral airway if the tongue is in the way. Squeeze only enough to see the chest rise." },
      { id: "suction", name: "Suction apparatus",
        use: "Bedside suction clears blood, vomit, and secretions so you can see the cords and the patient does not aspirate.",
        check: "It is switched on and tested before any drug is given. A suction unit that has not been tested is a failed airway plan." },
      { id: "co2", name: "Waveform capnography",
        use: "Waveform capnography is the continuous trace of exhaled carbon dioxide. A sustained wave means the tube is in the airway, and then it monitors ventilation.",
        check: "No wave after a few breaths means the tube is not in the trachea until proved otherwise. Do not wait for a chest film to remove an esophageal tube." }
    ]},
    { id: "vent", name: "Ventilation and oxygen", items: [
      { id: "ventilator", name: "Mechanical ventilator",
        use: "The ventilator supports or takes over breathing once the airway is secure. It sets the oxygen, the pressure or the volume, and the rate.",
        check: "In injured lungs use about 6 millilitres per kilogram of predicted body weight and watch the plateau pressure. Disconnect and high-pressure alarms stay on." },
      { id: "niv", name: "NIV machine / high-flow nasal oxygen",
        use: "Mask ventilation is for a patient who is still protecting the airway, often a flare of COPD or cardiogenic edema. High-flow nasal oxygen is for hypoxemia when they are not yet failing.",
        check: "Do not use a mask to delay intubation in someone who is vomiting, moribund, or not protecting the airway. Set a time limit and a plan to intubate." },
      { id: "o2", name: "Oxygen supply with backup cylinder",
        use: "Wall oxygen runs the ventilator and the bag. The cylinder is the backup when the wall fails, and it is the supply you take on a transfer.",
        check: "Before the patient moves, confirm the cylinder has enough gas and that the regulator fits the outlet you are going to." },
      { id: "neb", name: "Nebulizer",
        use: "A nebulizer turns a liquid drug into a mist for the airway, most often a bronchodilator in asthma or COPD.",
        check: "On a ventilator circuit, watch the tidal volume the nebulizer adds. A nebulizer does not by itself treat swelling of the airway." }
    ]},
    { id: "monitor", name: "Monitoring and resuscitation", items: [
      { id: "mpm", name: "Multiparameter monitor",
        use: "The bedside monitor shows the ECG, the oxygen saturation, and the cuff blood pressure, and it carries the alarms.",
        check: "Do not trust a saturation number that has no waveform. Set the alarm limits for this patient, not for a generic adult." },
      { id: "defib", name: "Defibrillator with synchronized cardioversion",
        use: "An unsynchronized shock is for ventricular fibrillation and pulseless ventricular tachycardia. A synchronized shock is for an unstable tachycardia that still has a pulse.",
        check: "Sync is on when there is a pulse. Sync is off for ventricular fibrillation. Nobody is touching the patient when you shock." },
      { id: "ecg12", name: "12-lead ECG machine",
        use: "A 12-lead ECG shows infarction, rhythm, and electrolyte patterns that a three-lead monitor will miss.",
        check: "Record it early in chest pain and in shock. Do not delay a shock in cardiac arrest in order to print a 12-lead." },
      { id: "cart", name: "Emergency crash cart",
        use: "The cart holds the arrest drugs, the airway kit, and the pads, in one place that has already been checked.",
        check: "Know where the epinephrine and the bag are before you need them. After the cart is opened, it is restocked." },
      { id: "temp", name: "Temperature monitoring",
        use: "Core temperature is measured in shock, after drowning, when malignant hyperthermia is possible, and when fever may be driving intracranial pressure.",
        check: "A skin probe is not a core temperature. Treat fever in acute brain injury. Do not miss hypothermia as a cause of arrest." }
    ]},
    { id: "access", name: "Vascular access and infusion", items: [
      { id: "iv", name: "IV cannulas and central venous catheter kits",
        use: "A peripheral cannula is enough for most drugs and fluid. A central catheter is for longer vasopressors, irritant infusions, or when no peripheral vein exists. Norepinephrine may start in a watched peripheral vein if a central line would delay it.",
        check: "Use ultrasound for the central vein. Never lose the wire. After a neck or subclavian attempt, look for a pneumothorax." },
      { id: "art", name: "Arterial line kit",
        use: "An arterial catheter gives beat-to-beat blood pressure and a source for arterial blood gases. The radial artery is the usual first site.",
        check: "Zero it at the phlebostatic axis and read the waveform, not only the number. A pale cold hand means the catheter comes out." },
      { id: "pump", name: "Infusion pumps and syringe pumps",
        use: "Pumps deliver vasopressors, sedation, and insulin at a controlled rate, because for these drugs the rate is the dose.",
        check: "The concentration entered on the pump must match the syringe. Label the line. A vasopressor line that runs free is dangerous." },
      { id: "trans", name: "Pressure transducer setup",
        use: "The transducer turns an arterial or venous catheter into a pressure wave. For the heart it is zeroed at the phlebostatic axis. For the brain it is zeroed at the external auditory meatus.",
        check: "A damped arterial trace under-reads the systolic pressure. Clear clot and air before you treat the number. A closed stopcock is not hypotension." }
    ]},
    { id: "diag", name: "Bedside diagnostics", items: [
      { id: "abgbox", name: "ABG analyser access",
        use: "It returns pH, carbon dioxide, oxygen, and lactate within minutes. Those numbers guide the ventilator and the diagnosis of shock.",
        check: "Record the inspired oxygen with the result. Do not delay oxygen, or a breathing tube, while you wait for the printout." },
      { id: "glucose", name: "Glucometer",
        use: "It gives an immediate glucose. A low glucose mimics stroke, seizure, and coma, and it is treated at once.",
        check: "Treat a low reading immediately. Confirm an extreme value in the laboratory when the later decision is large, but do not wait to give glucose." },
      { id: "pocus", name: "Portable ultrasound / POCUS",
        use: "Bedside ultrasound answers one question at a time: is the heart empty or full, is there tamponade, is there a pneumothorax, is there free fluid, and where is the vein.",
        check: "It does not replace a formal study when the question is a different one. Absent lung sliding is not enough on its own. Look for a lung point and match it to the patient." },
      { id: "psuction", name: "Portable suction",
        use: "This is the suction that travels with the patient, for the airway on transfer and wherever there is no wall outlet.",
        check: "Test it before the patient moves. The canister is not already full, and the battery is charged." }
    ]},
    { id: "proc", name: "Procedures and renal support", items: [
      { id: "drain", name: "Chest drain kit and drainage system",
        use: "The kit and the underwater seal drain a pneumothorax or a large pleural collection. Air and fluid can leave, and outside air cannot be sucked back in.",
        check: "Use the triangle of safety, and ultrasound when you are draining fluid. Never clamp a drain that is bubbling. Keep the bottle below the patient." },
      { id: "foley", name: "Urinary catheter and urine-measuring system",
        use: "It measures urine output hour by hour in shock, and it relieves retention. It is not a routine comfort device.",
        check: "Put it in cleanly, measure what comes out, and remove it when the reason has gone. A sudden stop may be a blocked catheter, not a new kidney injury." },
      { id: "lp", name: "Lumbar puncture kit",
        use: "A lumbar puncture takes cerebrospinal fluid when you must have it, for suspected meningitis or for subarachnoid blood the CT did not show, and only when it is safe.",
        check: "Do not do it in the presence of a mass, a low conscious level with a focal sign, or a coagulopathy you have not corrected. Measure the opening pressure." },
      { id: "crrt", name: "Dialysis / CRRT access",
        use: "A dialysis catheter is for renal replacement when the kidneys cannot cope: refractory acidosis, refractory potassium, fluid the lungs cannot hold, or some poisonings. Continuous therapy is for the unstable patient.",
        check: "The indication is the patient, not a single creatinine. This catheter is not a routine line for vasopressors. Anticoagulation of the circuit is a separate decision from anticoagulation of the patient." }
    ]}
  ],
  films: [
    { id: "tension", mod: "xray", modLabel: "Chest X-ray", blurb: "Shock, minutes after a neck line",
      title: "Right pneumothorax with mediastinal shift", src: "sim/rad/tension.jpg",
      stem: "He becomes shocked minutes after an internal jugular line. Breath sounds are absent on the right.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The right chest is black and the mediastinum is pushed to the left. Treat this as tension. Do not wait for another test.",
        options: ["Right pneumothorax with the mediastinum pushed to the left", "Large left pleural effusion with a meniscus", "Bilateral edema and a large heart", "Free air under both diaphragms"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Decompress the chest now, by finger thoracostomy or a needle, and then place a drain. A CT scan is not the treatment of tension.",
        options: ["Decompress the chest now, then place a drain", "CT pulmonary angiogram before any procedure", "A diuretic and non-invasive ventilation only", "Antibiotics, and repeat the film tomorrow"] } },
    { id: "edema", mod: "xray", modLabel: "Chest X-ray", blurb: "Sudden breathlessness, known heart failure",
      title: "Acute pulmonary edema", src: "sim/rad/edema.jpg",
      stem: "She woke drowning. She is sitting up, sweating, and the sputum is pink. Blood pressure is 188/104. She is protecting her airway.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Perihilar bat-wing opacities with a large heart are cardiogenic edema until you prove another cause. This is not a pneumothorax.",
        options: ["Bilateral perihilar edema, heart enlarged", "Right tension pneumothorax", "A single lobar pneumonia", "The endotracheal tube is in a main bronchus"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Sit her up. Give oxygen, a nitrate if the pressure allows, and a diuretic. Non-invasive ventilation if she is tiring but still protecting the airway. Look for the cause, including ischemia.",
        options: ["Nitrate, diuretic, and non-invasive ventilation if she tires", "Immediate thrombolysis for a presumed embolus", "A chest drain on both sides", "High-dose steroid as the only drug"] } },
    { id: "tube", mod: "xray", modLabel: "Chest X-ray", blurb: "Just intubated, one side is silent",
      title: "Endobronchial tube, opposite lung collapsed", src: "sim/rad/tube.jpg",
      stem: "The tube felt easy. One side of the chest is silent and she is hypoxic on the ventilator. Capnography still has a wave.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The tube has gone down a main bronchus. The lung on the other side is collapsed. The wave of carbon dioxide means it is still in the airway, just too far.",
        options: ["Tube too far, in a main bronchus, with collapse of the other lung", "Esophageal intubation, so remove it at once", "Bilateral pneumonia only", "A large pneumothorax on the white side"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Pull the tube back until both sides inflate. Keep the carbon dioxide wave. Do not pull it all the way out. Then repeat the film.",
        options: ["Withdraw the tube until both lungs inflate, and keep the carbon dioxide wave", "Remove the tube completely and start again", "Needle decompression of the white side", "Leave it and increase the oxygen"] } },
    { id: "effusion", mod: "xray", modLabel: "Chest X-ray", blurb: "Hypoxic, dull base",
      title: "Large right pleural effusion", src: "sim/rad/effusion.jpg",
      stem: "He is hypoxic. The right base is dull and breath sounds are absent there. The left chest is clear.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The right base is a homogeneous opacity with the look of a large effusion. Ultrasound should confirm fluid before a drain.",
        options: ["Large right pleural effusion", "Right tension pneumothorax", "Free air under the diaphragm", "Left lower lobe collapse only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Confirm fluid with ultrasound, then drain it if he is hypoxic from it. Send the fluid. A diuretic alone is not the treatment of a large hypoxic effusion.",
        options: ["Ultrasound, then drain if the fluid explains the hypoxia", "Immediate thrombolysis", "Needle decompression for tension", "No procedure, repeat the film in a week"] } },
    { id: "sah", mod: "ct", modLabel: "CT", blurb: "Sudden worst headache",
      title: "Subarachnoid hemorrhage", src: "sim/rad/sah.jpg",
      stem: "Thunderclap headache and vomiting. The non-contrast CT was done within the hour. He is drowsy but protecting his airway.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Bright blood fills the basal cisterns in a star. That is subarachnoid hemorrhage. A lumbar puncture is not needed once the CT has shown it.",
        options: ["Subarachnoid blood in the basal cisterns", "A lens-shaped epidural hematoma", "A large middle-cerebral infarct and no blood", "Posterior reversible edema only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Control the blood pressure, give nimodipine, and get an urgent angiogram for coiling or clipping. Do not give a thrombolytic. Secure the airway if he stops protecting it.",
        options: ["Blood pressure, nimodipine, and urgent securing of the aneurysm", "Alteplase, because the headache was sudden", "Lumbar puncture now, despite the blood on CT", "Discharge if the headache eases"] } },
    { id: "ich", mod: "ct", modLabel: "CT", blurb: "Sudden hemiparesis, on a blood thinner",
      title: "Basal ganglia hemorrhage", src: "sim/rad/ich.jpg",
      stem: "Sudden left weakness. He takes warfarin. The non-contrast CT is on the screen. Glucose is normal.",
      finding: { prompt: "What is the finding?", answer: 0, say: "There is a bright acute hemorrhage deep in the basal ganglia, with a little blood in the ventricle. This is not an infarct you can thrombolyse.",
        options: ["Acute deep intracerebral hemorrhage", "Ischemic stroke with no blood, so give alteplase", "Subarachnoid blood only, in the cisterns", "A chronic dark subdural collection"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Reverse the warfarin now. Lower a very high blood pressure. Watch the airway. Do not give a thrombolytic. Call neurosurgery if he deteriorates.",
        options: ["Reverse the anticoagulant, control the pressure, no thrombolytic", "Alteplase by weight", "Heparin infusion", "Observe at home and repeat the scan next week"] } },
    { id: "edh", mod: "ct", modLabel: "CT", blurb: "Head injury, then a lucid interval",
      title: "Epidural hematoma", src: "sim/rad/edh.jpg",
      stem: "He was knocked out, woke, and is now vomiting and slowing. This is the non-contrast CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "A biconvex, lens-shaped bright collection against the skull is an epidural hematoma. It does not creep across sutures the way a subdural does.",
        options: ["Lens-shaped epidural hematoma", "Crescent subdural blood", "Subarachnoid blood in the cisterns only", "A hemispheric infarct"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "This size needs urgent neurosurgical evacuation. Do not send him for an MRI first. Do not sit on a collection this large.",
        options: ["Urgent neurosurgical evacuation", "MRI before any decision", "A thrombolytic, in case it is ischemia", "Discharge once the vomiting stops"] } },
    { id: "pe", mod: "ct", modLabel: "CT", blurb: "Sudden hypoxia and hypotension",
      title: "Saddle pulmonary embolus", src: "sim/rad/pe.jpg",
      stem: "Day six after a hip replacement. Sudden hypoxia. Blood pressure is 78/50. This is the CT pulmonary angiogram.",
      finding: { prompt: "What is the finding?", answer: 0, say: "A dark filling defect straddles the pulmonary artery bifurcation. That is a saddle embolus. He is already hypotensive, so this is a massive embolus in the clinical sense.",
        options: ["Saddle embolus in the pulmonary artery", "Type A aortic dissection", "Ordinary pulmonary edema", "A normal pulmonary angiogram"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "He is hypotensive, so systemic thrombolysis is the treatment if there is no contraindication. A filter is not the first move. Anticoagulation alone is for the stable patient.",
        options: ["Systemic thrombolysis, because he is in shock", "A diuretic only", "Immediate chest drain", "Discharge on an anti-inflammatory"] } },
    { id: "dissection", mod: "ct", modLabel: "CT", blurb: "Tearing pain to the back",
      title: "Type A aortic dissection", src: "sim/rad/dissection.jpg",
      stem: "Tearing chest pain going through to the back. Blood pressure is 196/90 and the pulses feel unequal. This is the CT angiogram.",
      finding: { prompt: "What is the finding?", answer: 0, say: "There is an intimal flap in the ascending aorta. Any flap that involves the ascending aorta is type A. Do not call this a pulmonary embolus and do not thrombolyse it.",
        options: ["Intimal flap in the ascending aorta: type A dissection", "Saddle pulmonary embolus and a normal aorta", "Isolated disease of the descending aorta only", "A normal contrast CT"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Type A dissection goes to emergency surgery. Control the heart rate and the pressure with a beta blocker first, so the shear force falls. Thrombolysis is harmful.",
        options: ["Emergency surgery, and a beta blocker to cut the shear force", "Systemic thrombolysis for the chest pain", "Heparin and a coronary angiogram as the only plan", "Discharge if the pain eases with morphine"] } },
    { id: "pancreas", mod: "ct", modLabel: "CT", blurb: "Epigastric pain to the back, day two",
      title: "Acute pancreatitis, no gas in the necrosis", src: "sim/rad/pancreas.jpg",
      stem: "Epigastric pain to the back. Lipase was five times the upper limit yesterday. He is febrile but the pressure is holding. This contrast CT is from day two.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The pancreas is swollen, with fluid around it. There is no gas in the inflammatory mass. Necrosis without gas is not, by itself, infected necrosis.",
        options: ["Swollen pancreas and fluid, no gas", "Free air and a perforated viscus as the only finding", "A normal pancreas", "Gas throughout the pancreatic bed"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Support him. Moderate fluid, not a day-long flood. No prophylactic antibiotic for necrosis alone, and no immediate open operation. Feed the gut if he cannot eat.",
        options: ["Supportive care. No antibiotic and no operation for necrosis without gas", "Immediate open necrosectomy", "A week of prophylactic carbapenem", "Urgent ERCP in every gallstone, even without cholangitis"] } },
    { id: "mca", mod: "mri", modLabel: "MRI", blurb: "Aphasia, two hours in",
      title: "Large middle-cerebral territory infarct", src: "sim/rad/mca-mri.jpg",
      stem: "Two hours of aphasia and right hemiparesis. The non-contrast CT did not show blood. This MRI was done because the CT was hard to call. Glucose is 118 milligrams per decilitre. Blood pressure is 168/90.",
      finding: { prompt: "What is the finding?", answer: 0, say: "One hemisphere is brightly abnormal in a middle-cerebral territory. With this story, that is an acute large-vessel infarct, not a tumor and not posterior reversible edema.",
        options: ["Acute infarct in a middle-cerebral territory", "Herpes encephalitis in one temporal lobe", "Posterior reversible encephalopathy", "A lens-shaped epidural hematoma"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "She is inside the window and the CT showed no blood. This is a reperfusion decision: thrombolysis if she is eligible, and vessel imaging for thrombectomy. Heparin is not the treatment. Do not delay for a perfect scan.",
        options: ["Reperfusion: thrombolysis if eligible, and look at the vessel", "Heparin infusion as the primary treatment", "Acyclovir and no stroke treatment", "Aspirin only, and a clinic next week"] } },
    { id: "hsv", mod: "mri", modLabel: "MRI", blurb: "Fever, seizure, confusion",
      title: "Temporal lobe signal, herpes until proved otherwise", src: "sim/rad/hsv.jpg",
      stem: "Three days of fever, then a seizure and confusion. This is the FLAIR MRI. The lumbar puncture is being set up. He has no mass on CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "One temporal lobe is swollen and bright. With fever and a seizure, that is herpes encephalitis until the PCR says otherwise.",
        options: ["Temporal lobe hyperintensity, herpes until proved otherwise", "A middle-cerebral infarct and nothing else", "Bilateral posterior reversible edema", "Subarachnoid blood"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Start intravenous acyclovir now. Do not wait for the PCR. Continue the puncture if it is safe. Antibiotics may cover bacterial meningitis, but they do not replace acyclovir.",
        options: ["Intravenous acyclovir now. Do not wait for the PCR", "Wait for the PCR before any drug", "A thrombolytic for a presumed infarct", "Steroid alone, and review in a week"] } },
    { id: "cord", mod: "mri", modLabel: "MRI", blurb: "Cancer, weak legs, a sensory level",
      title: "Cervical cord compression", src: "sim/rad/cord.jpg",
      stem: "Known cancer. A day of weak legs and a sensory level. This is the sagittal T2 of the cervical spine.",
      finding: { prompt: "What is the finding?", answer: 0, say: "A mass in the canal is compressing the cervical cord. This is cord compression. It is not a routine disc to send to physiotherapy.",
        options: ["A compressive mass on the cervical cord", "A normal cervical cord", "Only lumbar degeneration, far below this picture", "A brain abscess"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Keep the spine still. Give dexamethasone when cancer is the likely cause. Call spine surgery now. Do not send her out for physiotherapy this week.",
        options: ["Steroid, immobilize, and urgent surgical review", "Physiotherapy and a clinic in a fortnight", "Thrombolysis", "A lumbar puncture as the only next step"] } },
    { id: "pres", mod: "mri", modLabel: "MRI", blurb: "Postpartum seizure, very high pressure",
      title: "Posterior reversible encephalopathy", src: "sim/rad/pres.jpg",
      stem: "She is two days postpartum. A seizure. Blood pressure is 196/118. This is the FLAIR MRI. The CT showed no blood.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Both posterior lobes are bright, and the ventricles are dark, which fits vasogenic edema. With this pressure after delivery, that is posterior reversible encephalopathy, often from eclampsia.",
        options: ["Bilateral posterior edema: posterior reversible encephalopathy", "A single middle-cerebral infarct", "Subarachnoid hemorrhage", "Herpes in one temporal lobe"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Control the blood pressure. Treat eclampsia with magnesium and obstetric care. Do not give a thrombolytic for this pattern.",
        options: ["Control the pressure, magnesium, and obstetric care", "Alteplase for a presumed stroke", "Acyclovir as the only drug", "Heparin infusion"] } }
  ]
};

OSCE_STATIONS.near = {
  "scope": {
    "use": [
      "It confirms the tube is already in the trachea by displaying exhaled carbon dioxide.",
      "It delivers a set tidal volume once the airway is secure, in place of a ventilator.",
      "It numbs the cords so the tube can be passed without anyone needing to see them."
    ],
    "check": [
      "A chest film is the first confirmation. Do not look for carbon dioxide until that film is back.",
      "If the cords were seen, no further check is required before ventilation starts.",
      "A cuff pressure between 20 and 30 is itself the proof that the tube is tracheal."
    ]
  },
  "tube": {
    "use": [
      "The bougie is the airway that stays in. The tube is only a guide and is then removed.",
      "A stylet is how cuff pressure is measured after the tube is already in the trachea.",
      "The tube is reserved for a patient who is already on a ventilator. A mask is the first secure airway."
    ],
    "check": [
      "Force the tube over the bougie until it seats. Resistance means you should push harder.",
      "A cuff pressure around 60 centimetres of water is the target, and it replaces carbon dioxide.",
      "If the bougie passed, the tube is confirmed. Waveform capnography is optional."
    ]
  },
  "bvm": {
    "use": [
      "The bag replaces the ventilator for days in injured lungs, at 6 millilitres per kilogram.",
      "It is only a source of oxygen before a drug. It cannot ventilate someone who has stopped breathing.",
      "It is the device that draws the continuous wave of exhaled carbon dioxide."
    ],
    "check": [
      "One person, a hard squeeze, and a large breath until the abdomen rises.",
      "Skip the jaw thrust once the mask is on. An oral airway blocks the bag and should stay out.",
      "The check that matters is a printed 12-lead before the first breath."
    ]
  },
  "suction": {
    "use": [
      "Suction is the oxygen supply you take when the wall outlet fails on a transfer.",
      "It turns a liquid bronchodilator into a mist for asthma.",
      "It is how you measure cuff pressure on the endotracheal tube."
    ],
    "check": [
      "Leave it off until after the induction drug, so the noise does not disturb the room.",
      "A unit that was tested yesterday does not need a test for this patient.",
      "The check is a carbon dioxide wave, not whether the suction actually turns on."
    ]
  },
  "co2": {
    "use": [
      "Waveform capnography is how you see the vocal cords. It replaces the laryngoscope.",
      "It is a single colour change at the moment of intubation, and then it is disconnected.",
      "It measures oxygen saturation in the same way the finger probe does."
    ],
    "check": [
      "No wave is common. Wait for the chest film before you move the tube.",
      "A one-time colour change is enough. A continuous wave is not required.",
      "If both sides of the chest move, capnography can stay off."
    ]
  },
  "ventilator": {
    "use": [
      "The ventilator is a mask for a patient who is still protecting the airway, so intubation can wait.",
      "It only sets the oxygen. Rate and volume are left to the patient in every mode.",
      "It is the device that delivers the shock for ventricular fibrillation."
    ],
    "check": [
      "In injured lungs use 10 to 12 millilitres per kilogram of actual body weight, and silence the high-pressure alarm.",
      "Plateau pressure is optional. Turn disconnect alarms off so the patient can be moved.",
      "The only check is cuff pressure. Tidal volume does not matter once the tube is in."
    ]
  },
  "niv": {
    "use": [
      "A mask is the airway of choice when the patient is vomiting and not protecting the airway.",
      "High-flow nasal oxygen replaces a breathing tube in a moribund patient.",
      "Mask ventilation is how a nebulized bronchodilator is given, and nothing else."
    ],
    "check": [
      "Leave the mask on with no time limit if the saturation is rising, even if the patient is tiring.",
      "A mask is safer than a tube when the patient is vomiting, because the mask collects it.",
      "Do not plan intubation. Non-invasive ventilation is the destination for every hypoxic patient."
    ]
  },
  "o2": {
    "use": [
      "The cylinder is the oxygen for a patient who is staying in the bed. Wall oxygen is only the backup.",
      "Wall oxygen is the monitor of exhaled carbon dioxide.",
      "The regulator is optional. A cylinder threads onto any ventilator outlet."
    ],
    "check": [
      "Move the patient first, and read the cylinder gauge after you arrive.",
      "A cylinder that was full yesterday does not need the gauge checked today.",
      "The check is that the wall alarm has been silenced before the transfer."
    ]
  },
  "neb": {
    "use": [
      "A nebulizer, by itself, is the treatment of airway swelling from anaphylaxis.",
      "It delivers a vasopressor mist into a central venous line.",
      "It replaces bedside suction when the secretions are thick."
    ],
    "check": [
      "On a ventilator, ignore the volume the nebulizer adds. The set tidal volume cannot change.",
      "A finished nebulizer is the check that the tube is in the trachea.",
      "Silence the ventilator alarms while it runs, because the extra flow is expected."
    ]
  },
  "mpm": {
    "use": [
      "The bedside monitor prints a diagnostic 12-lead and replaces the ECG machine.",
      "It delivers the unsynchronized shock for ventricular fibrillation.",
      "It reads core temperature from the blood-pressure cuff."
    ],
    "check": [
      "A saturation number with no waveform is still reliable if the number is above 92.",
      "Leave the alarm limits on the factory adult settings for every patient.",
      "Silence every alarm overnight. The numbers are still being recorded."
    ]
  },
  "defib": {
    "use": [
      "A synchronized shock is the treatment of ventricular fibrillation.",
      "An unsynchronized shock is the first treatment of stable atrial fibrillation with a normal blood pressure.",
      "The defibrillator is the 12-lead machine. Printing the ECG is the treatment of the arrest."
    ],
    "check": [
      "Leave sync on for ventricular fibrillation so the shock waits for an R wave.",
      "Sync off is correct for every tachycardia, including one that still has a pulse.",
      "Compressions may continue through the shock if the person doing them is wearing gloves."
    ]
  },
  "ecg12": {
    "use": [
      "A 12-lead must be printed before the first shock in witnessed ventricular fibrillation.",
      "It replaces waveform capnography after the tube is placed.",
      "It is the continuous bedside trace. The monitor is only for the cuff pressure."
    ],
    "check": [
      "In chest pain, wait for the troponin before you record the ECG.",
      "In cardiac arrest, pause compressions until a full 12-lead has printed.",
      "One lead on the monitor is the same information. A 12-lead adds nothing in shock."
    ]
  },
  "cart": {
    "use": [
      "The cart is where the tidal volume is set. It is the ventilator.",
      "It is the dialysis machine used for a refractory potassium.",
      "It holds the paperwork of the arrest. The drugs are fetched from pharmacy once the arrest starts."
    ],
    "check": [
      "Epinephrine can be looked for once the arrest has started. You do not need to know the drawer before.",
      "After the cart is opened it can stay open until the next arrest. Restocking is optional.",
      "The bag lives on the ventilator, not on the cart, so do not look for it there."
    ]
  },
  "temp": {
    "use": [
      "A skin probe is the core temperature you act on in shock and after drowning.",
      "Temperature is only for comfort. It does not change the cause of an arrest.",
      "It is how the cuff blood pressure is measured."
    ],
    "check": [
      "Treat the skin reading as the core. A bladder or esophageal probe is unnecessary.",
      "Hypothermia can be ignored as a cause of arrest. Warming is not part of that question.",
      "Fever in acute brain injury is left alone so the immune response can work."
    ]
  },
  "iv": {
    "use": [
      "Every vasopressor must wait for a central line. A watched peripheral vein is never acceptable, even for a minute.",
      "A central catheter is required before any fluid is given in sepsis.",
      "The line is confirmed once the wire has disappeared. Ultrasound is not part of that."
    ],
    "check": [
      "A neck line you have done before does not need ultrasound.",
      "If the wire will not come back, stitch the line over it. Losing the wire is rare.",
      "Pneumothorax is a concern only after a femoral attempt."
    ]
  },
  "art": {
    "use": [
      "An arterial catheter is the route for vasopressors and for a blood transfusion.",
      "It replaces the cuff so completely that a flat trace can be ignored if the number looks normal.",
      "The femoral vein is the usual first site for an arterial catheter."
    ],
    "check": [
      "Zero it wherever the transducer happens to sit. The height does not change the number.",
      "A pale cold hand is expected. Leave the catheter in and watch it.",
      "Read the displayed number and ignore a damped or flat waveform."
    ]
  },
  "pump": {
    "use": [
      "Pumps are for maintenance fluid. A vasopressor is safer on a free-flowing drip.",
      "The rate on the pump does not depend on the concentration in the syringe.",
      "A pump is a pressure bag for blood, and the line does not need a drug label."
    ],
    "check": [
      "If the syringe says norepinephrine, the pump can keep the last patient's concentration.",
      "An unlabelled line is acceptable when the person who made it is still in the room.",
      "A vasopressor that runs in free is only a problem if the blood pressure then falls."
    ]
  },
  "trans": {
    "use": [
      "The transducer oxygenates the blood sample on the way to the analyser.",
      "The brain and the heart are zeroed in the same place, at the mattress.",
      "It is the infusion pump. It is where the norepinephrine rate is set."
    ],
    "check": [
      "A damped trace means the pressure is truly low. Give fluid before you flush the line.",
      "Air in the tubing does not change an arterial reading. Only clot does.",
      "A closed stopcock that reads zero is real hypotension. Open the stopcock later."
    ]
  },
  "abgbox": {
    "use": [
      "The analyser decides whether to intubate, so hold oxygen until the printout returns.",
      "It replaces the saturation probe. A waveform is not required.",
      "The same sample prints the 12-lead ECG."
    ],
    "check": [
      "Inspired oxygen does not belong on the result. The machine already knows it.",
      "Wait for the printout before you give oxygen to a hypoxic patient.",
      "A venous sample from a tourniqueted arm is the same gas you use to set the ventilator."
    ]
  },
  "glucose": {
    "use": [
      "A low reading means this is a stroke, so go straight to thrombolysis.",
      "The meter measures lactate. A high value is the diagnosis of septic shock.",
      "It is only for patients already on insulin. A coma does not need a glucose."
    ],
    "check": [
      "Wait for the laboratory glucose before you treat a low bedside reading.",
      "An extreme bedside value is always an error, so do not treat it.",
      "Recheck in an hour. Immediate glucose is only for children."
    ]
  },
  "pocus": {
    "use": [
      "One bedside look replaces the formal echocardiogram and the CT.",
      "Absent lung sliding, on its own, is enough to place a chest drain.",
      "The probe is the analyser for an arterial blood gas."
    ],
    "check": [
      "If lung sliding is absent, drain that side. A lung point and the clinical story are optional.",
      "Once a pocket ultrasound has been used, a formal study is never required.",
      "A cardiac view replaces waveform capnography after intubation."
    ]
  },
  "psuction": {
    "use": [
      "Portable suction is the oxygen cylinder you take on a transfer.",
      "It is the nebulizer that travels with the patient.",
      "It measures the urine output while the patient is moving."
    ],
    "check": [
      "Test it after you arrive. A full canister can be emptied at the destination.",
      "The battery does not matter if the unit worked last week.",
      "Wall suction at the destination means you do not test the portable unit before you leave."
    ]
  },
  "drain": {
    "use": [
      "A chest drain on each side is the treatment of pulmonary edema.",
      "The underwater seal is there so outside air can be sucked back into the chest.",
      "This kit is the lumbar drain for cerebrospinal fluid."
    ],
    "check": [
      "Clamp a bubbling drain so the bottle can be lifted over the patient.",
      "The bottle may sit on the bed. Height does not change the drainage.",
      "Drain fluid in the mid-clavicular line without ultrasound. That is the triangle of safety."
    ]
  },
  "foley": {
    "use": [
      "A urinary catheter is placed in every intensive care patient for nursing convenience.",
      "Hourly urine is the treatment of renal failure. The catheter is the clearance.",
      "It is the dialysis catheter for continuous renal replacement."
    ],
    "check": [
      "Leave it until discharge. Taking it out early is what causes retention.",
      "A sudden stop in urine is a new kidney injury. Do not check the tubing.",
      "A clean insertion is optional if the patient is already on an antibiotic."
    ]
  },
  "lp": {
    "use": [
      "A lumbar puncture is the first test when the conscious level is low and one pupil has blown.",
      "It replaces a CT when subarachnoid blood is the question. Imaging is not required.",
      "It is how an external ventricular drain is placed."
    ],
    "check": [
      "A coagulopathy can be ignored if the needle is a small one.",
      "Opening pressure is optional. The cell count is the only result that matters.",
      "A focal sign and a falling conscious level are not reasons to delay the puncture."
    ]
  },
  "crrt": {
    "use": [
      "A dialysis catheter is the routine line for norepinephrine when no peripheral vein is free.",
      "Start renal replacement because the creatinine has doubled, even if the potassium, the acid, and the lungs are fine.",
      "Continuous therapy is for the stable patient. An unstable patient is dialysed intermittently first."
    ],
    "check": [
      "One high creatinine is the indication. The rest of the patient does not change it.",
      "Use this catheter for vasopressors as well. It is an ordinary central line.",
      "Anticoagulation of the circuit and of the patient are one decision. A single order covers both."
    ]
  }
};
