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
    { id: "ptx", mod: "xray", modLabel: "Chest X-ray", blurb: "Sudden chest pain, still stable",
      title: "Left pneumothorax", src: "xrays/ptx.jpg",
      credit: "Published radiograph. Hellerhoff. CC BY-SA 3.0.",
      stem: "Sudden pleuritic pain. He is breathless but the blood pressure is holding, and the trachea is still central.",
      finding: { prompt: "What is the finding?", answer: 0, say: "A visceral pleural line on the left, with no lung markings beyond it, and a small air-fluid level in the left lateral recess. The mediastinum has not been pushed away. The published film is a spontaneous pneumothorax.",
        options: ["Left pneumothorax, without mediastinal shift", "Tension, with the mediastinum pushed away", "A large left pleural effusion", "Free air under the right hemidiaphragm"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "He is stable and the mediastinum is central, so this is not a finger thoracostomy for tension. Give oxygen. Aspirate or drain a pneumothorax that is large or still breathless, and repeat the film.",
        options: ["Oxygen, and aspirate or drain if it is large or he stays breathless", "Immediate finger thoracostomy before any other look", "A diuretic and non-invasive ventilation only", "Antibiotics, and no repeat film"] } },
    { id: "tension", mod: "xray", modLabel: "Chest X-ray", blurb: "Shock, the trachea is pushed away",
      title: "Left pneumothorax with mediastinal shift", src: "xrays/tension.jpg",
      credit: "Published radiograph. Clinical Cases. CC BY-SA 2.5.",
      stem: "He is shocked and hypoxic. The trachea and the apex beat are pushed away from the silent side.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The left chest is black, there are no markings in that hemithorax, and the trachea and the heart are pushed to the right. The published film is a left pneumothorax with that shift. Treat it as tension. There is also a little fluid on the same side.",
        options: ["Left pneumothorax pushing the mediastinum to the right", "A simple apical pneumothorax with no shift", "Massive left pleural effusion", "Bilateral edema and a large heart"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Decompress the chest now, by finger thoracostomy or a needle, and then place a drain. A CT scan is not the treatment of tension.",
        options: ["Decompress the chest now, then place a drain", "CT pulmonary angiogram before any procedure", "A diuretic and non-invasive ventilation only", "Antibiotics, and repeat the film tomorrow"] } },
    { id: "ards", mod: "xray", modLabel: "Chest X-ray", blurb: "Intubated, both lungs white",
      title: "Acute respiratory distress syndrome", src: "xrays/ards.jpg",
      credit: "Published radiograph. Samir. CC BY-SA 3.0. Also released to the public domain.",
      stem: "She is intubated for a week of sepsis. Oxygen is high and the saturation is still poor. The heart is not huge.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Both lungs are filled with patchy airspace opacity, and the heart is not the dominant finding. The published film is the chest radiograph of ARDS. It is not a single lobar pneumonia and it is not a pneumothorax.",
        options: ["Diffuse bilateral airspace opacity, heart not enlarged", "A single right-middle-lobe consolidation", "Left tension pneumothorax", "Only a large cardiac silhouette and clear lungs"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Ventilate a low tidal volume, about 6 millilitres per kilogram of predicted body weight, and treat the cause. A diuretic may help fluid overload, but it is not the whole treatment. Do not drain both sides.",
        options: ["Low tidal volume ventilation, and treat the cause", "Chest drains on both sides", "A diuretic as the only drug", "Immediate thrombolysis"] } },
    { id: "edema", mod: "xray", modLabel: "Chest X-ray", blurb: "Sudden breathlessness, known heart disease",
      title: "Cardiogenic pulmonary edema", src: "xrays/edema.jpg",
      credit: "Published radiograph. Hellerhoff. CC BY-SA 4.0.",
      stem: "She woke drowning. She is sitting up, sweating, and the sputum is pink. Blood pressure is 188/104. She is protecting her airway.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Both lungs show perihilar alveolar opacity, the pattern of pulmonary edema. The published film is edema after a non-ST elevation myocardial infarction. This is not a pneumothorax.",
        options: ["Bilateral alveolar edema after a myocardial infarction", "Left tension pneumothorax", "A single lobar pneumonia", "The endotracheal tube is in a main bronchus"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Sit her up. Give oxygen, a nitrate if the pressure allows, and a diuretic. Non-invasive ventilation if she is tiring but still protecting the airway. Look for ischemia. Do not drain the chest.",
        options: ["Nitrate, diuretic, and non-invasive ventilation if she tires", "Immediate thrombolysis for a presumed embolus", "A chest drain on both sides", "High-dose steroid as the only drug"] } },
    { id: "pneumonia", mod: "xray", modLabel: "Chest X-ray", blurb: "Fever and a dull side",
      title: "Right middle lobe consolidation", src: "xrays/pneumonia.jpg",
      credit: "Published radiograph. Mikael Häggström. CC0.",
      stem: "Three days of fever and cough. He is hypoxic. The right chest is dull. He is 67.",
      finding: { prompt: "What is the finding?", answer: 0, say: "There is a dense consolidation in the right middle lobe, against the right heart border. The published film is lobar pneumonia. A swab from the nose is not the proof of which organism is in the lung.",
        options: ["Right middle lobe consolidation", "A left pneumothorax", "Bilateral bat-wing edema", "Free air under the diaphragm"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen, a culture before antibiotics if that does not delay them, and antibiotics for community pneumonia. A drain is for an empyema, which this film does not show. Do not call this edema and give only a diuretic.",
        options: ["Oxygen and antibiotics for pneumonia", "A diuretic as the only drug", "Needle decompression", "Immediate thrombolysis"] } },
    { id: "aspiration", mod: "xray", modLabel: "Chest X-ray", blurb: "Salt water, then breathless",
      title: "Aspiration pneumonitis", src: "xrays/aspiration.png",
      credit: "Published radiograph. Terence McManus. CC BY-SA 4.0.",
      stem: "He was pulled from salt water. He is coughing, hypoxic, and protecting his airway. There is no fever yet.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Both lungs have patchy edema. The published film is acute pulmonary edema from salt-water aspiration, a chemical pneumonitis, not a single lobar pneumonia and not gastric acid.",
        options: ["Bilateral edema from salt-water aspiration", "Right middle lobe consolidation only", "A left pneumothorax with shift", "A tube in the right main bronchus"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen and support. Watch the airway. Do not start an antibiotic just because the film is white, and do not drain both lungs. Infection is a later question, not the first hour.",
        options: ["Oxygen and support. An antibiotic is not automatic", "Antibiotics as the only treatment, and discharge", "Chest drains on both sides", "A diuretic and nitrates as for left heart failure only"] } },
    { id: "effusion", mod: "xray", modLabel: "Chest X-ray", blurb: "Hypoxic, one side stony dull",
      title: "Massive left pleural effusion", src: "xrays/effusion.jpg",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "He is hypoxic. One side of the chest is stony dull, and the trachea is pushed toward the side that still has breath sounds.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The left hemithorax is white and the mediastinum is pushed to the right. That is a massive effusion, not collapse, because collapse pulls the mediastinum toward the white side. The published film is a massive left effusion in a person with lung cancer.",
        options: ["Massive left pleural effusion, mediastinum pushed away", "Left lung collapse, mediastinum pulled toward the white side", "Left tension pneumothorax", "Free air under the diaphragm"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Confirm fluid with ultrasound, then drain it if it explains the hypoxia. Send the fluid. A diuretic alone is not the treatment of a large hypoxic effusion, and a needle for tension is the wrong procedure.",
        options: ["Ultrasound, then drain if the fluid explains the hypoxia", "Immediate thrombolysis", "Needle decompression for tension", "No procedure, repeat the film in a week"] } },
    { id: "collapse", mod: "xray", modLabel: "Chest X-ray", blurb: "The trachea is pulled to the dull side",
      title: "Left upper lobe collapse", src: "xrays/collapse.jpg",
      credit: "Published radiograph. Hellerhoff. CC BY-SA 3.0.",
      stem: "Breathless. The left chest is dull, and the trachea is pulled toward that side.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The left hemithorax is opaque and the mediastinum is pulled to the left. That is volume loss. The published film is collapse of the left upper lobe. The lobar edge is not seen on this projection. An effusion would push the mediastinum the other way.",
        options: ["Left upper lobe collapse, mediastinum pulled left", "Massive left effusion, mediastinum pushed away", "Left tension pneumothorax", "Right middle lobe pneumonia only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Look for the plug or the mass that closed the lobe. Physiotherapy, and bronchoscopy if a plug is likely. Do not put a large drain into collapse as if it were fluid.",
        options: ["Find the cause. Bronchoscopy if a plug is likely", "A large chest drain as the first procedure", "Needle decompression", "A diuretic as the only drug"] } },
    { id: "ett", mod: "xray", modLabel: "Chest X-ray", blurb: "Just intubated, carbon dioxide is present",
      title: "Tube tip in the right main bronchus", src: "xrays/ett.jpg",
      credit: "Published radiograph. Hellerhoff. CC BY-SA 4.0.",
      stem: "The tube felt easy. Capnography has a sustained wave, but one side of the chest is quieter and she is hypoxic.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The tip has gone past the carina into the right main bronchus. The wave of carbon dioxide means it is still in the airway, just too far. The published film is that malposition. Do not call it an esophageal intubation.",
        options: ["Endotracheal tube tip in the right main bronchus", "Esophageal intubation, so remove it at once", "A central line in an artery", "Bilateral pneumonia only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Pull the tube back until both sides inflate. Keep the carbon dioxide wave. Do not pull it all the way out. Then repeat the film.",
        options: ["Withdraw the tube until both lungs inflate, and keep the carbon dioxide wave", "Remove the tube completely and start again", "Needle decompression of the quieter side", "Leave it and increase the oxygen"] } },
    { id: "cvc", mod: "xray", modLabel: "Chest X-ray", blurb: "A new neck line takes a strange course",
      title: "Central line malposition", src: "xrays/cvc.jpg",
      credit: "Published radiograph. Hellerhoff. CC BY-SA 4.0.",
      stem: "A central line was just placed from the neck. You are checking the film before any infusion.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The line does not descend in the superior vena cava. It crosses the midline high and turns toward the left. The published reading is an arterial malposition. An azygos vein is the differential, but the turn to the left is very high for that.",
        options: ["Central line crossing high toward the left, not down the vena cava", "Endotracheal tube in the right main bronchus", "A normal line tip in the lower superior vena cava", "A chest drain curled in the soft tissues"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Do not use this line. Confirm the vessel with ultrasound or a pressure or a blood gas, then remove it and press. Look again for a pneumothorax. Do not start a vasopressor through it.",
        options: ["Do not use it. Confirm the vessel, then remove it", "Start norepinephrine through it at once", "Thrombolyse, because the course is abnormal", "Leave it and repeat the film next week"] } },
    { id: "congestion", mod: "xray", modLabel: "Chest X-ray", blurb: "Breathless, previous heart surgery",
      title: "Pulmonary vascular congestion", src: "xrays/congestion.jpg",
      credit: "Published radiograph. Mikael Häggström. CC0.",
      stem: "An older man is laboring to breathe. He has had coronary bypass surgery. The sputum is not pink, and he is not shocked.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Fine horizontal lines at the periphery are Kerley B lines. The heart is large and the pulmonary vessels are full, with a little fluid in a fissure. The published film has no obvious alveolar edema. This is congestion, not the flooded edema film.",
        options: ["Kerley B lines and vascular congestion, without alveolar flooding", "Bat-wing alveolar edema as the only finding", "A left pneumothorax", "Right middle lobe consolidation only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen, a diuretic, and look for why the left atrial pressure is high. He does not need a chest drain, and he does not need thrombolysis for this film.",
        options: ["Oxygen, a diuretic, and treat the cardiac cause", "Bilateral chest drains", "Immediate thrombolysis", "Antibiotics as the only drug"] } },
    { id: "heart", mod: "xray", modLabel: "Chest X-ray", blurb: "The heart fills the chest",
      title: "Cardiomegaly", src: "xrays/heart.png",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "The film was done for breathlessness. A device sits in the left chest wall. He is not in shock.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The cardiac silhouette is very large, and there is a pacemaker. The lungs are not flooded with alveolar edema. The published film is cardiomegaly. Do not call this a pneumothorax.",
        options: ["A very large heart, with a pacemaker", "Kerley B lines as the only finding", "Left tension pneumothorax", "Free air under the diaphragm"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "This film is not a procedure. Look for why the heart is large, and for failure if the story fits. Do not drain the chest because the silhouette is wide, and do not thrombolyse a large heart.",
        options: ["Look for the cause of the large heart. No drain for the silhouette", "Bilateral chest drains", "Immediate thrombolysis", "Needle decompression"] } },
    { id: "contusion", mod: "xray", modLabel: "Chest X-ray", blurb: "Blunt chest injury, one side is patchy",
      title: "Pulmonary contusion", src: "xrays/contusion.jpg",
      credit: "Published radiograph. Karim. CC BY-SA 3.0.",
      stem: "He was struck in the chest. This is an anteroposterior supine film. One side is duller. He is hypoxic and the blood pressure is holding.",
      finding: { prompt: "What is the finding?", answer: 0, say: "One hemithorax has patchy airspace opacity. The published film is a pulmonary contusion. Do not invent a pleural line that is not there, and do not call it a pneumothorax.",
        options: ["Patchy pulmonary contusion", "A visceral pleural line and a pneumothorax", "Free air under the diaphragm", "A tube in a main bronchus"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen, and analgesia so he can breathe. Contusion gets worse over the first day, so watch him. Do not drain a lung that has no pneumothorax and no large effusion.",
        options: ["Oxygen, analgesia, and watch him. No drain for contusion alone", "Needle decompression now", "A diuretic as the only drug", "Immediate surgery to remove the patchy lobe"] } },
    { id: "ribs", mod: "xray", modLabel: "Chest X-ray", blurb: "An oval is already drawn on the film",
      title: "Old rib fractures", src: "xrays/ribs.jpg",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "Chest wall pain. Someone has already drawn an oval on the film. He is not hypoxic and the trachea is central.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The oval marks several old fractures of the left ribs. They are healed, not a fresh break with a pneumothorax. The published film is those old fractures. There is no pleural line.",
        options: ["Old left rib fractures, marked by the oval", "An acute pneumothorax inside the oval", "A massive pleural effusion", "Free air under the diaphragm"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Old fractures are not drained and they are not plated on the basis of this film. Analgesia if the pain is from the wall. A new film and a search for a pneumothorax belong to a new injury, which this film does not show.",
        options: ["No drain. These are old fractures", "A chest drain under the oval", "Needle decompression", "Immediate rib plating tonight"] } },
    { id: "subq", mod: "xray", modLabel: "Chest X-ray", blurb: "The chest wall crackles",
      title: "Subcutaneous emphysema", src: "xrays/subq.png",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "The neck and the chest wall are swollen and they crackle under the fingers. He is talking and the blood pressure is holding.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Black streaks of air dissect the soft tissues of the neck and the chest wall. The published film is extensive subcutaneous emphysema. The air in the skin is a sign, not the whole diagnosis.",
        options: ["Air throughout the subcutaneous tissues", "A single lobar pneumonia", "Only a very large heart", "Free air under the diaphragm as the only finding"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Find the source: an airway injury, a pneumothorax, or a procedure. Give oxygen. Do not send him home because the blood pressure is normal, and do not cut the skin to let the air out as the first move.",
        options: ["Look for the airway or pleural source, and give oxygen", "Incise the skin as the only treatment", "A diuretic only", "Discharge, because the air is outside the lung"] } },
    { id: "mediastinum", mod: "xray", modLabel: "Chest X-ray", blurb: "Air in the neck after a chest injury",
      title: "Pneumomediastinum", src: "xrays/mediastair.jpg",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "A mountain-bike crash. The neck crackles. An arrow is already on the film. He is hypoxic.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Air outlines the mediastinum and tracks into the neck. The same published film also shows a right pneumothorax and a first-rib fracture. Do not report the mediastinal air and ignore the pneumothorax.",
        options: ["Pneumomediastinum, and a right pneumothorax on the same film", "Subcutaneous air only, with a normal mediastinum and no pneumothorax", "A massive left effusion", "Bat-wing edema"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Look for an injury of the airway. The pneumothorax on this film is drained if it is large or he is hypoxic from it. A first-rib fracture is a high-energy injury. Do not discharge him on analgesia alone.",
        options: ["Search for an airway injury, and drain the pneumothorax if it is causing the hypoxia", "Analgesia and discharge", "A diuretic only", "Antibiotics as the only treatment"] } },
    { id: "pneumoperitoneum", mod: "xray", modLabel: "Chest X-ray", blurb: "Upright, severe abdominal pain",
      title: "Pneumoperitoneum", src: "xrays/pneumo.jpg",
      credit: "Published radiograph. Hellerhoff. CC BY-SA 3.0.",
      stem: "Sudden severe abdominal pain, then a rigid abdomen. This is the upright chest film. Coloured arrows are already on it.",
      finding: { prompt: "What is the finding?", answer: 0, say: "A crescent of free air sits between the diaphragm and the top of the liver, on the patient's right. Green arrows mark the diaphragm, red arrows the liver, and the blue arrows mark normal gas in the colon. That colonic gas is not the free air.",
        options: ["Free air between the liver and the right hemidiaphragm", "Only normal gas in the colon, under the left hemidiaphragm", "A left pneumothorax", "A massive left pleural effusion"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "This is a perforated viscus until proved otherwise. Keep him nil by mouth, give fluid, an antibiotic for peritonitis, and urgent surgical review. A chest drain does not treat air under the diaphragm.",
        options: ["Nil by mouth, fluid, antibiotics, and urgent surgical review", "A chest drain for the crescent under the diaphragm", "A diuretic only", "Discharge if the pain eases with morphine"] } },
    { id: "hyperinflation", mod: "xray", modLabel: "Chest X-ray", blurb: "A long smoking history",
      title: "Hyperinflation", src: "xrays/copd.jpg",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "Decades of smoking. She is breathless at rest, wheezy, and not febrile. The sputum is not pink.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The lungs are huge, the diaphragms are flat and low, and the heart looks small between them. The published film is severe chronic obstructive pulmonary disease. This is not edema and it is not a pneumothorax.",
        options: ["Hyperinflated lungs, flat diaphragms, and a narrow heart", "Bat-wing alveolar edema", "A left pneumothorax with shift", "A massive pleural effusion"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Controlled oxygen, nebulised bronchodilators, and non-invasive ventilation if she is tiring and acidotic. Do not drain the black lungs. If she is intubated, do not use a large tidal volume.",
        options: ["Controlled oxygen, bronchodilators, and non-invasive ventilation if she tires", "Chest drains, because the lungs are black", "A diuretic as the only drug", "Immediate thrombolysis"] } },
    { id: "widening", mod: "xray", modLabel: "Chest X-ray", blurb: "A wide shadow, and an arrow is on the film",
      title: "Widened mediastinum", src: "xrays/aneurysm.png",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "The mediastinum looks wide. An arrow is already on the film, pointing at a bulge beside the spine. He is not shocked on this occasion.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The aortic contour is widened where the arrow points. The published film is a thoracic aortic aneurysm. Sternal wires are from earlier surgery. This single film does not prove an acute dissection.",
        options: ["A widened aortic contour, a thoracic aortic aneurysm", "A left pneumothorax", "Free air under the diaphragm", "A tube in the right main bronchus"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Control the blood pressure and define the aorta with a CT angiogram. Rupture or a dissection that involves the ascending aorta needs emergency surgery, which this film alone does not show. Do not thrombolyse, and do not drain the chest.",
        options: ["Blood pressure control, and a CT angiogram of the aorta", "Systemic thrombolysis", "A chest drain beside the arrow", "Discharge with no further imaging"] } },
    { id: "bilateral", mod: "xray", modLabel: "Chest X-ray", blurb: "Breathless after a high ascent",
      title: "Diffuse bilateral airspace opacity", src: "xrays/hape.png",
      credit: "Published radiograph. Maryrosegrant. CC BY-SA 4.0.",
      stem: "He has just come down from altitude. He is breathless and coughing. There is no history of heart failure, and he is not febrile.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Patchy opacity is scattered through both lungs, more on the right. The heart is not the picture of cardiomegaly. The published film is high-altitude pulmonary edema. It is not the ARDS film and it is not the post-infarction edema film.",
        options: ["Bilateral patchy airspace opacity, worse on the right", "A single lobar pneumonia with a clear other lung", "Left tension pneumothorax", "Only a very large heart and clear lungs"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen and descent are the treatment of high-altitude edema. Support him. Do not drain both lungs, and do not treat this as left ventricular failure with nitrates alone unless the heart is actually the cause.",
        options: ["Oxygen and descent. Support him", "Chest drains on both sides", "Nitrates and a diuretic as the only plan, with no oxygen", "Immediate thrombolysis"] } },
    { id: "sbo", mod: "xray", modLabel: "Abdominal X-ray", blurb: "Vomiting, and a distended abdomen",
      title: "Air-fluid levels", src: "xrays/sbo.jpg",
      credit: "Published radiograph. James Heilman. CC BY-SA 3.0.",
      stem: "A day of colicky pain, vomiting, and a distended abdomen. This is the upright film. The bowel sounds are high-pitched.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Multiple horizontal air-fluid levels sit in dilated loops of small bowel. The published film is a small-bowel obstruction. This is not free air under the diaphragm.",
        options: ["Multiple air-fluid levels in dilated small bowel", "Free air under the right hemidiaphragm only", "A normal bowel-gas pattern", "A massive pleural effusion"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Nil by mouth, fluid, a nasogastric tube if he is vomiting, and surgical review. A laxative is not the treatment of a mechanical obstruction. Do not send him home.",
        options: ["Nil by mouth, fluid, decompression, and surgical review", "A laxative and discharge", "A chest drain", "Antibiotics as the only treatment"] } },
    { id: "ctstroke", mod: "ct", modLabel: "CT", blurb: "Sudden weakness. A plain CT and an angiogram",
      title: "Dense artery sign, carotid-T occlusion", src: "cts/stroke.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 4.0.",
      stem: "One hour of weakness. The figure has two panels: a plain CT and a CT angiogram. Glucose is normal.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The plain panel shows a dense artery and no large swollen hypodensity yet. The other panel is the CT angiogram. The published reading is a right carotid-T occlusion. This is not the film of an established infarct with a big shift.",
        options: ["Dense artery on the plain CT, and an occlusion on the angiogram", "A lens of blood against the skull", "Blood filling the basal cisterns only", "A completed infarct with the midline already pushed across"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "This is a large-vessel occlusion until the angiogram says otherwise, and here the angiogram is already on the figure. Reperfusion if she is eligible. Heparin is not the treatment. Do not wait for an MRI.",
        options: ["Reperfusion if she is eligible. Do not wait for an MRI", "Heparin as the only treatment", "A thrombolytic even if the plain CT had shown a large bleed", "Aspirin and a clinic next week"] } },
    { id: "ich", mod: "ct", modLabel: "CT", blurb: "Sudden headache, one week after delivery",
      title: "Intracerebral and intraventricular hemorrhage", src: "cts/ich.jpg",
      credit: "Published CT. Glitzy queen00. Public domain.",
      stem: "A week after delivery she collapses with a sudden headache. There was no trauma. This is the plain CT. Glucose is normal.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Bright blood is in the brain substance and casts the ventricle. The published film is an intracerebral and intraventricular hemorrhage. It is not a lens against the skull, and it is not blood limited to the cisterns. The cursor is on the photograph of the scan.",
        options: ["Bright blood in the brain and in the ventricle", "A biconvex epidural hematoma", "Blood only in the basal cisterns", "A large dark infarct and no blood"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "This is a bleed. Protect the airway, control a very high pressure, and call neurosurgery if she deteriorates. Do not give a thrombolytic. Do not reverse an anticoagulant she is not taking.",
        options: ["Airway, blood pressure, neurosurgery if she deteriorates. No thrombolytic", "Alteplase by weight", "Reverse warfarin as the only action, though she takes none", "Discharge if the headache eases"] } },
    { id: "sah", mod: "ct", modLabel: "CT", blurb: "Worst headache, a slice at the skull base",
      title: "Subarachnoid hemorrhage", src: "cts/sah.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "Thunderclap headache and vomiting. This plain CT is a low slice, through the skull base. He is drowsy and still protecting his airway.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Blood is bright in the basal cisterns. The published film is subarachnoid hemorrhage. The black streaks at the bone are artifact, not the blood. A lumbar puncture is not needed once the CT has shown the blood.",
        options: ["Blood in the basal cisterns", "A lens-shaped epidural hematoma", "A large middle-cerebral infarct and no blood", "Only artifact, so the cisterns are normal"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Control the blood pressure, give nimodipine, and get an urgent angiogram to secure the aneurysm. The published context is an aneurysm. Do not give a thrombolytic. Secure the airway if he stops protecting it.",
        options: ["Blood pressure, nimodipine, and urgent securing of the aneurysm", "Alteplase, because the headache was sudden", "Lumbar puncture now, despite the blood on CT", "Discharge if the headache eases"] } },
    { id: "edh", mod: "ct", modLabel: "CT", blurb: "A fall, then he slows",
      title: "Epidural hematoma", src: "cts/edh.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 4.0.",
      stem: "An older woman fell. She is now vomiting and slowing. The figure has four panels, including a bone window.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The collection is biconvex, a lens, and it shifts the midline. On the axial panel it lies on the viewer's left, the patient's right in standard orientation. The published film is a large epidural hematoma, with early herniation and a small inner-table fracture. A subdural is the crescent that spreads along the surface.",
        options: ["A lens-shaped epidural hematoma with midline shift", "A crescent subdural and no shift", "Blood only in the basal cisterns", "A hemispheric infarct and no blood"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "This size, with shift, needs urgent neurosurgical evacuation. Do not send her for an MRI first. Do not give a thrombolytic.",
        options: ["Urgent neurosurgical evacuation", "MRI before any decision", "A thrombolytic, in case it is ischemia", "Discharge once the vomiting stops"] } },
    { id: "brainedema", mod: "ct", modLabel: "CT", blurb: "A swollen hemisphere. An arrow is on the film",
      title: "Infarct edema with midline shift", src: "cts/shift.png",
      credit: "Published CT. James Heilman. CC BY-SA 4.0.",
      stem: "Day two after a stroke she is harder to wake. The red arrow is already on the film.",
      finding: { prompt: "What is the finding?", answer: 0, say: "One hemisphere is dark and swollen and the ventricles are pushed the other way. The published film is a left-sided stroke with shift from edema. The arrow is the publisher's. This is not an acute dense-artery film, and it is not a fresh bright bleed.",
        options: ["A swollen hypodense hemisphere pushing the midline", "A bright acute hemorrhage and no shift", "A lens of blood against the skull", "Normal ventricles and no swelling"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Protect the airway. Nurse her head up. Call neurosurgery if the shift is making her deteriorate. Do not give a thrombolytic for a completed infarct with mass effect. Do not invent a millimetre cutoff from this film.",
        options: ["Airway, head up, and neurosurgery if she deteriorates", "Alteplase now", "A lumbar puncture to relax the pressure", "Discharge on aspirin alone"] } },
    { id: "braincontusion", mod: "ct", modLabel: "CT", blurb: "Head injury, small bright spots at the front",
      title: "Frontal contusion", src: "cts/contusion.png",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "He was hit on the back of the head. He is confused but speaking. This is the plain CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Small bright spots sit in the frontal lobe, on the viewer's left of the slice. The published reading is a right frontal contrecoup hemorrhage, with suture material in the opposite scalp. This is not the large spontaneous bleed, and it is not a lens of epidural blood.",
        options: ["Small frontal hemorrhagic contusions", "A huge intraventricular cast of blood", "A lens-shaped epidural hematoma", "Blood only in the basal cisterns"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Observe him, and repeat the CT if he worsens. Do not give a thrombolytic. Do not send a confused patient home without a period of watch.",
        options: ["Observe, and repeat the scan if he worsens", "Alteplase", "Immediate craniotomy for these small spots, with no surgeon", "Discharge from the door"] } },
    { id: "hydro", mod: "ct", modLabel: "CT", blurb: "Drowsy, and the fluid spaces look wrong",
      title: "Hydrocephalus", src: "cts/hydro.jpg",
      credit: "Published CT. Lucien Monfils. CC BY-SA 3.0.",
      stem: "He is drowsy and vomiting. This single axial CT is on the screen. There is no history of trauma.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Both lateral ventricles are far too large. That is hydrocephalus. This slice does not show an acute hemorrhage.",
        options: ["Grossly enlarged lateral ventricles", "A bright basal-ganglia hemorrhage", "A lens of blood against the skull", "A normal ventricular size"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "A deteriorating patient with ventricles this large needs a drainage plan made with neurosurgery. Do not give a thrombolytic. Do not call this a bleed. This one slice does not prove that a lumbar puncture is safe.",
        options: ["Neurosurgical plan for drainage if he is deteriorating", "Alteplase", "A lumbar puncture with no imaging of the posterior fossa", "Discharge on a painkiller"] } },
    { id: "pe", mod: "ct", modLabel: "CT", blurb: "Sudden hypoxia, arrows already on the angiogram",
      title: "Central pulmonary embolism", src: "cts/pe1.jpg",
      credit: "Published CT. Carlcl. CC BY-SA 2.5.",
      stem: "Day six after a hip replacement. Sudden hypoxia. Blood pressure is 82/48. The red arrows are already on the CT pulmonary angiogram.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The arrows mark dark filling defects in the central pulmonary arteries. The published film is a saddle embolus. He is hypotensive, so this is massive in the clinical sense.",
        options: ["Filling defects in the central pulmonary arteries", "A flap in the ascending aorta", "A left pneumothorax only", "Consolidation of one lobe and a normal pulmonary artery"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "He is in shock, so systemic thrombolysis is the treatment if nothing contraindicates it. Anticoagulation alone is for the stable patient. A chest drain is not the treatment.",
        options: ["Systemic thrombolysis, because he is in shock", "A diuretic only", "Immediate chest drain", "Discharge on an anti-inflammatory"] } },
    { id: "ctptx", mod: "ct", modLabel: "CT", blurb: "A chest tube is already in. An arrow is on the film",
      title: "Pneumothorax, tube already in", src: "cts/ptx.jpg",
      credit: "Published CT. Clinical Cases. CC BY-SA 2.5.",
      stem: "After a drain was placed, this chest CT was done. The black arrow is already on the film. He is not shocked.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The patient's left side, on the viewer's right, is a pneumothorax. The arrow marks the pleural line. A chest tube is already in. The mediastinum is not the picture of untreated tension. The collapsed lung is also opaque.",
        options: ["Left pneumothorax, with a chest tube already in place", "Untreated tension, with the heart pushed to the other side and no tube", "A simple right pleural effusion and no air", "Free air under the diaphragm only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Do not needle this as if no tube had been placed. Check the tube, the underwater seal, and whether the lung has come up. This film is not untreated tension.",
        options: ["Check the tube that is already in. Do not treat it as untouched tension", "A second needle into the same side immediately, with no look at the drain", "Thrombolysis", "Pull the tube out and discharge"] } },
    { id: "covidct", mod: "ct", modLabel: "CT", blurb: "Breathless, both lungs hazy toward the edges",
      title: "Bilateral ground-glass opacities", src: "cts/covid.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "A week of fever and breathlessness. He is hypoxic on oxygen. The heart is not enlarged. This is one axial chest CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Both lungs have patchy ground glass, more toward the edges and the back. The published film is COVID-19 pneumonia. It is not labeled ARDS, it is not one lobar consolidation, and it is not the coronal edema film.",
        options: ["Bilateral peripheral ground-glass opacities", "One dense lobar consolidation and a clear other lung", "A large left pneumothorax", "A pleural collection full of gas bubbles"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen and support. Do not drain both lungs. Do not treat this as left ventricular failure with nitrates alone. This film is not a label of ARDS.",
        options: ["Oxygen and support. Not bilateral drains", "Chest drains on both sides", "Nitrates and a diuretic as the only plan", "Immediate thrombolysis"] } },
    { id: "ctpneumonia", mod: "ct", modLabel: "CT", blurb: "Fever, and an oval is drawn on one lung",
      title: "Lobar pneumonia", src: "cts/pneumonia.jpg",
      credit: "Published CT. James Heilman. CC BY-SA 3.0.",
      stem: "Fever, cough, and hypoxia. The oval is already on the CT. The other lung is aerated.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The oval marks dense consolidation in the patient's right lung, on the viewer's left, above the liver. The published film is right-sided pneumonia. It is not the bilateral ground-glass film, and it is not aspiration labeled as such.",
        options: ["Consolidation of the right lung", "Bilateral peripheral ground glass and a clear story of no focal lobe", "A left pneumothorax", "Free air in front of the liver"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen, cultures, and antibiotics for a lung infection. Do not drain a consolidated lobe as if it were an empyema. Do not name an organism this film does not prove.",
        options: ["Oxygen, cultures, and antibiotics", "A chest drain into the consolidation", "Thrombolysis", "Nitrates and a diuretic only"] } },
    { id: "lungedema", mod: "ct", modLabel: "CT", blurb: "Woke drowning. This one is coronal",
      title: "Pulmonary edema", src: "cts/edema.png",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "She woke drowning. She is sitting up. Blood pressure is 186/100. She is protecting her airway. This is a coronal chest CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Both lungs are hazy, with thick septa, worse around the hila and the bases. The published film is pulmonary edema. It is not one lobar pneumonia and it is not a pneumothorax.",
        options: ["Bilateral pulmonary edema on the coronal CT", "A single lobar consolidation", "A left pneumothorax with a chest tube", "Free air under the diaphragm"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Sit her up. Oxygen, a nitrate if the pressure allows, and a diuretic. Non-invasive ventilation if she tires and still protects her airway. Look for the cause, including ischemia.",
        options: ["Nitrate, diuretic, and non-invasive ventilation if she tires", "Chest drains on both sides", "Immediate thrombolysis as the only plan", "Antibiotics and nothing else"] } },
    { id: "empyema", mod: "ct", modLabel: "CT", blurb: "One side of the chest is full, and there is gas in it",
      title: "Pleural empyema", src: "cts/empyema.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 4.0.",
      stem: "A week of fever and a dull side. He is hypoxic. This contrast CT is at the lung bases.",
      finding: { prompt: "What is the finding?", answer: 0, say: "A large pleural collection on the patient's left, the viewer's right, contains bubbles of gas, and the lung next to it is consolidated. Gas in a pleural collection is an empyema until proved otherwise. It is not a simple effusion to watch, and it is not a pneumothorax.",
        options: ["A gas-containing pleural empyema", "A simple effusion with no gas, to repeat next month", "A left pneumothorax and an empty pleural space", "Middle-lobe collapse only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Drain the collection and treat the infection. A diuretic does not empty an empyema. Do not wait a week because there is gas in it.",
        options: ["Drain it and give antibiotics", "A diuretic only", "Needle it for tension pneumothorax", "Antibiotics and a repeat CT in a fortnight"] } },
    { id: "ctcollapse", mod: "ct", modLabel: "CT", blurb: "Arrowheads on a sagittal chest CT",
      title: "Middle-lobe collapse", src: "cts/collapse.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "Breathless, and the sagittal reconstruction is on the screen. The red arrowheads are already on the film.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The arrowheads mark a collapsed middle lobe between the fissures. The rest of that lung is aerated. The published film is middle-lobe atelectasis. It is not a gas-filled empyema.",
        options: ["Middle-lobe collapse", "A pleural empyema full of gas", "A left pneumothorax", "Bilateral pulmonary edema"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Find why the lobe collapsed. Physiotherapy, and bronchoscopy if a plug or a mass is blocking it. Do not put a large drain into a collapsed lobe.",
        options: ["Find the blockage. Physiotherapy, and bronchoscopy if it is obstructed", "A large chest drain into the lobe", "Thrombolysis", "Nitrates and a diuretic only"] } },
    { id: "aaa", mod: "ct", modLabel: "CT", blurb: "Sudden back and abdominal pain, pressure falling",
      title: "Rupturing abdominal aortic aneurysm", src: "cts/aaa.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 4.0.",
      stem: "Sudden pain in the back and the abdomen. Blood pressure is 88/60. The figure has axial slices and a coronal view.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The coronal view shows a dilated infrarenal abdominal aorta. The published film is a rupturing aneurysm. This is not a flap in the ascending aorta, and it is not a pulmonary embolus.",
        options: ["A dilated abdominal aorta, published as rupturing", "A Stanford A flap in the ascending aorta", "A saddle pulmonary embolus", "Free air in front of the liver and a normal aorta"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Emergency vascular repair, blood, and careful pressure control. Do not give a thrombolytic. Do not send him for an outpatient ultrasound.",
        options: ["Emergency vascular repair and blood", "Systemic thrombolysis for the back pain", "A chest drain", "Discharge if morphine helps"] } },
    { id: "lungcontusion", mod: "ct", modLabel: "CT", blurb: "Blunt chest injury, patchy both lungs",
      title: "Pulmonary contusion", src: "cts/lungcont.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 4.0.",
      stem: "A young man was struck in the chest. He is hypoxic and the pressure is holding. Four CT panels are on the screen.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Patchy bleeding is in both lungs, the right more than the left. The published film also shows a small amount of pleural air on both sides. It is contusion. It is not a large tension pneumothorax and it is not lobar pneumonia.",
        options: ["Pulmonary contusion, right worse than left, with a little pleural air", "A large untreated tension pneumothorax and clear lungs", "One lobar pneumonia and a normal other lung", "Pulmonary edema from heart failure only"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Oxygen and a close watch. The small pleural air is not tension and does not need both sides needled. Do not treat contusion with a diuretic as the only drug.",
        options: ["Oxygen and observe. Do not needle both sides", "Immediate bilateral chest drains", "Nitrates and a diuretic only", "Thrombolysis"] } },
    { id: "ischemia", mod: "ct", modLabel: "CT", blurb: "Pain out of keeping with the belly exam",
      title: "Ischemic bowel", src: "cts/ischemia.png",
      credit: "Published CT. James Heilman. CC BY-SA 3.0.",
      stem: "Severe abdominal pain, and the belly is softer than the pain suggests. Lactate is raised. The arrow is already on the contrast CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The bowel loops are dilated and the wall is thick. The published cause is thrombosis of the superior mesenteric vein. The arrow is the publisher's. This is bowel ischemia, not a simple meal-related blockage.",
        options: ["Thick-walled dilated bowel from mesenteric venous thrombosis", "A chia-seed bolus and collapsed bowel beyond it, with a normal wall", "Free air in front of the liver and no abnormal bowel", "A rupturing aortic aneurysm as the only finding"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Resuscitate him and call a surgeon. Dead bowel is an operation. Anticoagulation is for the vein, and it does not replace the surgeon. Do not send him home.",
        options: ["Resuscitation and a surgeon. Anticoagulation does not replace the operation", "A laxative and discharge", "A chest drain", "Thrombolysis for a presumed lung clot, and no abdominal plan"] } },
    { id: "ctfreeair", mod: "ct", modLabel: "CT", blurb: "An arrow in front of the liver",
      title: "Pneumoperitoneum", src: "cts/freeair.png",
      credit: "Published CT. James Heilman. CC BY-SA 3.0.",
      stem: "Sudden generalized abdominal pain and a rigid belly. The arrow is already on the CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The arrow marks free air in front of the liver, inside the peritoneum. That is perforation until proved otherwise. Gas inside the bowel is not the finding.",
        options: ["Free air in front of the liver", "Only gas inside the bowel", "A liver laceration and no free air", "Portal vein thrombus as the only finding"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Nil by mouth, fluid, antibiotics for peritonitis, and a surgeon now. Do not drain the chest for air that is in the abdomen. Do not send him home.",
        options: ["Surgeon now. Nil by mouth. Not a chest drain", "A chest drain for the black crescent", "A laxative", "Discharge on an antacid"] } },
    { id: "ctsbo", mod: "ct", modLabel: "CT", blurb: "Vomiting after a very large meal",
      title: "Small-bowel obstruction", src: "cts/sbo.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "Colicky pain and vomiting after an enormous meal. Two coronal CT slices are on the screen.",
      finding: { prompt: "What is the finding?", answer: 0, say: "Proximal small-bowel loops are dilated, a bolus sits lower down, and the bowel beyond it is empty. The published cause is a mass of chia seeds. This is mechanical small-bowel obstruction, not free air and not ischemic thick-walled bowel as the main film.",
        options: ["Dilated small bowel, a bolus, and empty bowel beyond it", "Free air in front of the liver only", "Thick-walled ischemic bowel from a mesenteric vein clot", "A normal bowel calibre"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Nil by mouth, fluid, a tube if he keeps vomiting, and a surgeon. A laxative is not the treatment of a mechanical block. Do not send him home.",
        options: ["Nil by mouth, fluid, decompression, and a surgeon", "A laxative and discharge", "A chest drain", "Antibiotics as the only treatment"] } },
    { id: "pancreas", mod: "ct", modLabel: "CT", blurb: "Epigastric pain to the back",
      title: "Acute pancreatitis", src: "cts/pancreas.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "Epigastric pain to the back. Lipase was five times the upper limit. Pressure is holding. This contrast CT shows fluid around the pancreas and no gas in it.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The pancreas is swollen and fluid surrounds it. There is no gas in that fluid. The published film is acute exudative pancreatitis. Fluid without gas is not, by itself, infected necrosis.",
        options: ["Swollen pancreas and fluid around it, no gas", "Free air in front of the liver as the only finding", "A liver abscess and a normal pancreas", "Gas throughout the pancreatic bed"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Support him. Moderate fluid, not a day-long flood. No prophylactic antibiotic for fluid alone, and no immediate open operation. Feed the gut if he cannot eat.",
        options: ["Supportive care. No antibiotic and no operation for fluid without gas", "Immediate open necrosectomy", "A week of prophylactic carbapenem", "A chest drain"] } },
    { id: "liverlac", mod: "ct", modLabel: "CT", blurb: "Blunt trauma, and the pressure is holding",
      title: "Liver laceration", src: "cts/liver.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 4.0.",
      stem: "Blunt trauma to the right chest and abdomen. Blood pressure is 128/76. The figure has a coronal view and axial slices.",
      finding: { prompt: "What is the finding?", answer: 0, say: "An irregular low-density tear sits in the right lobe of the liver. The published film is an intraparenchymal liver injury, and a right rib fracture is also described. Do not invent a grade number. The spleen is not the torn organ on this film.",
        options: ["A laceration in the right lobe of the liver", "A splenic rupture and a normal liver", "Free air in front of the liver and no tear", "A rupturing aortic aneurysm"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "He is stable, so observe him, examine him again, and keep a surgeon involved. Not every liver tear needs an immediate laparotomy. Do not discharge him.",
        options: ["Observe, serial examination, and a surgeon who knows", "Immediate laparotomy for every liver tear, stable or not", "Thrombolysis", "Discharge from the emergency department"] } },
    { id: "abscess", mod: "ct", modLabel: "CT", blurb: "Fever and a round low-density area in the liver",
      title: "Liver abscess", src: "cts/abscess.jpg",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "Fever and pain in the right upper abdomen. Pressure is holding. This is a contrast CT.",
      finding: { prompt: "What is the finding?", answer: 0, say: "A round low-density collection with a wall sits in the right lobe. The published film is a liver abscess. It is not the irregular traumatic tear, and it is not fluid around the pancreas.",
        options: ["A walled collection in the liver", "An irregular traumatic laceration and no collection", "Fluid around the pancreas only", "A dilated kidney and a normal liver"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Antibiotics and drainage of a collection this size. Do not call it a chest problem and drain the pleura. Do not name an organism the film does not show.",
        options: ["Antibiotics and drainage", "A chest drain and no abdominal plan", "Immediate open necrosectomy of the pancreas", "Discharge on an antacid"] } },
    { id: "hydronephrosis", mod: "ct", modLabel: "CT", blurb: "Loin pain. The R marker is on the film",
      title: "Hydronephrosis", src: "cts/kidney.png",
      credit: "Published CT. James Heilman. CC BY-SA 3.0.",
      stem: "Loin pain and fever. The R marker and the arrows are already on the contrast CT. A scale bar reads 120 mm.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The R marker is on the viewer's left, and the giant fluid-filled kidney is on that side. That is the patient's right. The other kidney is not dilated. The 120 mm text is a scale bar, not the size of the kidney. Follow the marker. The file caption says left, and the marker does not.",
        options: ["Hydronephrosis of the kidney on the side marked R", "A liver abscess and two normal kidneys", "A rupturing aortic aneurysm", "Free air in front of the liver"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Relieve the obstruction and treat infection if he is septic. Find the level of the block. Do not call the scale bar a measurement. Do not drain the chest.",
        options: ["Relieve the obstruction. Treat sepsis if it is there", "A chest drain", "Thrombolysis", "Discharge with no urine culture and no plan"] } },
    { id: "pvt", mod: "ct", modLabel: "CT", blurb: "Abdominal pain. A red arrow is on the film",
      title: "Portal vein thrombosis", src: "cts/pvt.png",
      credit: "Published CT. Hellerhoff. CC BY-SA 3.0.",
      stem: "Abdominal pain. The liver is on this contrast CT. The red arrow is already on the film.",
      finding: { prompt: "What is the finding?", answer: 0, say: "The arrow marks a filling defect in the portal vein. Contrast does not fill that segment. The published film is portal vein thrombosis. It is not gas in the portal vein, and it is not a mesenteric-vein bowel film.",
        options: ["A filling defect in the portal vein", "Gas branching through the liver", "A liver abscess as the only finding", "Free air in front of the liver"] },
      treat: { prompt: "What is the treatment?", answer: 0, say: "Anticoagulate if nothing is bleeding, and look for the cause. Thrombolysis is not the default. Do not treat this as bowel perforation.",
        options: ["Anticoagulation if it is safe, and look for the cause", "A laparotomy for free air that is not there", "A chest drain", "Discharge with no treatment and no search for a cause"] } },
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
