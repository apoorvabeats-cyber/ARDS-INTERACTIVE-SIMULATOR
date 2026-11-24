/* Every order the MDT room understands: the id the engine uses, the label, how long a result takes,
   and the words a doctor might say for it. The case engine and the voice parser both read this one list. */

/* [id, label, category, result delay in seconds, [spoken forms]] */
const ROWS = [
  /* ---------------------------------------------------------------- examination */
  ["examine", "Examine the patient", "exam", 8, ["examine", "examination", "examine the patient", "clinical examination", "bedside examination", "assess the patient", "assessment", "check the patient", "review the patient", "look at the patient", "take a history", "history", "cvs examination", "chest examination", "check pupils", "pupils", "general examination", "systemic examination"]],

  /* ---------------------------------------------------------------- laboratory */
  ["lab:cbc", "CBC", "lab", 35, ["cbc", "complete blood count", "blood count", "hemogram", "haemogram", "full blood count", "fbc", "hb tlc platelets", "hemoglobin", "haemoglobin", "tlc", "platelet count", "total count"]],
  ["lab:kft", "KFT (renal profile)", "lab", 40, ["kft", "kidney function", "kidney function test", "kidney function tests", "renal function", "renal function test", "rft", "renal profile", "urea creatinine", "urea and creatinine", "creatinine", "serum creatinine", "urea", "blood urea", "kidney profile"]],
  ["lab:lyte", "Electrolytes", "lab", 25, ["electrolytes", "serum electrolytes", "sodium potassium", "na k", "potassium level", "serum potassium", "sodium level", "serum sodium", "calcium level", "serum calcium", "magnesium level", "s electrolytes", "lytes", "potassium"]],
  ["lab:lft", "LFT (liver profile)", "lab", 45, ["lft", "liver function", "liver function test", "liver function tests", "liver profile", "bilirubin", "sgot sgpt", "transaminases", "lfts", "alt ast", "liver enzymes", "liver panel"]],
  ["lab:abg", "ABG with lactate", "lab", 15, ["abg", "arterial blood gas", "blood gas", "blood gases", "gas", "arterial gas", "vbg", "venous blood gas", "gases", "abg with lactate"]],
  ["lab:lactate", "Lactate", "lab", 15, ["lactate", "serum lactate", "lactic acid", "blood lactate", "lactate level"]],
  ["lab:coag", "Coagulation profile", "lab", 45, ["coag", "coagulation", "pt inr", "inr", "aptt", "clotting", "clotting profile", "pt aptt", "coagulation profile", "coagulation screen", "clotting screen", "prothrombin time", "fibrinogen", "pt"]],
  ["lab:trop", "Troponin", "lab", 30, ["troponin", "trop", "trop i", "trop t", "troponin i", "troponin t", "cardiac enzymes", "cardiac markers", "hs troponin", "high sensitivity troponin"]],
  ["lab:bnp", "BNP", "lab", 30, ["bnp", "nt probnp", "pro bnp", "natriuretic peptide", "nt pro bnp"]],
  ["lab:ck", "CPK", "lab", 35, ["cpk", "ck", "creatine kinase", "creatine phosphokinase", "cpk total", "muscle enzymes"]],
  ["lab:glucose", "Blood glucose", "lab", 8, ["glucose", "blood sugar", "sugar", "rbs", "grbs", "hgt", "dextrostix", "blood glucose", "random blood sugar", "capillary glucose", "sugar level", "glucometer"]],
  ["lab:crp", "CRP", "lab", 30, ["crp", "c reactive protein", "c-reactive protein", "creactive protein", "inflammatory markers", "inflammatory marker", "crp and procalcitonin"]],
  ["lab:pct", "Procalcitonin", "lab", 40, ["procalcitonin", "pct", "pro calcitonin"]],
  ["lab:ua", "Urine routine", "lab", 30, ["urine routine", "urine r m", "urine rm", "urinalysis", "urine examination", "urine analysis", "urine microscopy", "urine test", "urine ketones", "urine dipstick", "dipstick", "urine r and m", "urine routine and microscopy"]],
  ["lab:amylase", "Amylase and lipase", "lab", 40, ["amylase", "lipase", "amylase lipase", "amylase and lipase", "pancreatic enzymes", "serum lipase", "serum amylase"]],
  ["lab:nh3", "Ammonia", "lab", 40, ["ammonia", "serum ammonia", "nh3", "blood ammonia"]],
  ["lab:ddimer", "D-dimer", "lab", 35, ["d dimer", "ddimer", "d-dimer", "dimer"]],
  ["lab:ketones", "Blood ketones", "lab", 15, ["ketones", "blood ketones", "beta hydroxybutyrate", "bhb", "ketone", "serum ketones"]],
  ["lab:crossmatch", "Group and crossmatch", "lab", 40, ["crossmatch", "cross match", "group and match", "blood grouping", "blood group", "group and crossmatch", "cross matching", "type and screen"]],
  ["lab:cultures", "Blood cultures", "lab", 150, ["blood culture", "blood cultures", "cultures", "send cultures", "culture", "blood culture and sensitivity", "culture sensitivity", "c and s", "culture and sensitivity", "two sets of cultures", "bc"]],
  ["lab:sputum", "Tracheal aspirate culture", "lab", 120, ["sputum culture", "sputum", "tracheal aspirate", "endotracheal aspirate", "ta culture", "sputum gram stain", "respiratory culture", "sputum c and s", "tracheal aspirate culture"]],
  ["lab:urineculture", "Urine culture", "lab", 120, ["urine culture", "urine c and s", "urine culture and sensitivity"]],
  ["lab:viral", "Respiratory viral PCR", "lab", 60, ["viral panel", "respiratory viral panel", "flu pcr", "influenza pcr", "h1n1", "covid test", "covid pcr", "swine flu", "rt pcr", "viral pcr", "influenza test", "nasopharyngeal swab", "throat swab", "respiratory pcr", "swab"]],
  ["lab:malaria", "Malaria smear and RDT", "lab", 20, ["malaria", "malaria smear", "malaria parasite", "mp", "mp card", "malaria rdt", "peripheral smear", "smear", "malarial parasite", "malaria antigen", "malaria test"]],
  ["lab:dengue", "Dengue NS1 / serology", "lab", 30, ["dengue", "ns1", "dengue serology", "dengue ns1", "dengue test"]],

  /* ---------------------------------------------------------------- imaging and cardiac tests */
  ["img:ecg", "ECG", "img", 12, ["ecg", "ekg", "electrocardiogram", "12 lead", "twelve lead", "12 lead ecg", "e c g", "cardiogram"]],
  ["img:cxr", "Chest X-ray", "img", 30, ["chest x ray", "chest x-ray", "cxr", "chest xray", "x ray chest", "chest film", "xray chest", "x-ray chest", "chest radiograph", "portable chest", "x ray", "xray", "x-ray", "portable x ray", "chest picture", "chest radiography"]],
  ["img:xabd", "Abdominal X-ray", "img", 25, ["abdominal x ray", "abdomen x ray", "x ray abdomen", "kub", "erect abdomen", "xray abdomen", "plain abdomen", "abdominal xray", "x ray kub", "erect abdomen x ray", "abdomen xray"]],
  ["img:usg", "Bedside ultrasound (POCUS)", "img", 20, ["ultrasound", "usg", "bedside ultrasound", "pocus", "point of care ultrasound", "ultrasonography", "usg abdomen", "ultrasound abdomen", "fast scan", "fast", "usg chest", "lung ultrasound", "ultrasound chest", "sonography", "bedside usg", "ultrasound scan", "abdominal ultrasound", "usg whole abdomen", "usg kub", "ivc", "ivc ultrasound", "rush protocol", "rush", "lung ultrasound", "chest ultrasound", "lung pocus", "ultrasound for pneumothorax", "ultrasound lungs"]],
  ["img:echo", "Echocardiogram", "img", 35, ["echo", "echocardiogram", "2d echo", "2d echocardiography", "echocardiography", "cardiac echo", "tte", "bedside echo", "heart echo", "two d echo", "2 d echo", "eco"]],
  ["img:cthead", "CT head", "img", 60, ["ct head", "ct brain", "head ct", "brain ct", "ncct head", "non contrast ct head", "ct scan head", "ct scan brain", "cranial ct", "ncct brain", "c t head", "ct of the head", "ct of head", "ct of brain", "ct of the brain"]],
  ["img:ctchest", "CT chest", "img", 60, ["ct chest", "hrct", "hrct chest", "chest ct", "ct thorax", "ct scan chest", "c t chest", "ct of the chest", "ct of chest", "ct lungs", "cect chest"]],
  ["img:ctabd", "CT abdomen", "img", 60, ["ct abdomen", "ct abdomen and pelvis", "ct abdomen pelvis", "abdominal ct", "cect abdomen", "ct scan abdomen", "cect", "ct whole abdomen", "ct a p", "c t abdomen", "ct of the abdomen", "ct of abdomen", "ct pelvis", "ct abdomen with contrast", "contrast ct abdomen"]],
  ["img:ctpa", "CT pulmonary angiogram", "img", 70, ["ctpa", "ct pulmonary angiogram", "ct pulmonary angiography", "pulmonary angiogram", "ct angio chest", "ct pa", "ct pulmonary artery", "pulmonary ct angiogram", "ct pe protocol"]],
  ["img:ctangio", "CT angiogram (abdomen)", "img", 70, ["ct angiogram", "ct angio", "mesenteric angiogram", "cta", "ct mesenteric angiogram", "ct angiography", "ct angiogram abdomen", "mesenteric ct angiogram"]],
  ["img:mri", "MRI brain", "img", 120, ["mri", "mri brain", "mri head", "m r i", "magnetic resonance"]],

  /* ---------------------------------------------------------------- airway, breathing, access */
  ["proc:oxygen", "Oxygen (mask / nasal)", "proc", 0, ["oxygen", "start oxygen", "put on oxygen", "o2", "oxygen mask", "non rebreathing mask", "nrbm", "nasal prongs", "nasal cannula", "face mask oxygen", "supplemental oxygen", "oxygen by mask", "oxygen therapy", "mask oxygen", "put him on oxygen", "put her on oxygen", "high flow oxygen mask", "o 2"]],
  ["proc:hfnc", "High-flow nasal oxygen", "proc", 0, ["hfnc", "high flow", "high flow nasal", "high flow nasal oxygen", "high flow nasal cannula", "hi flow", "high flow nasal therapy", "heated humidified high flow", "optiflow"]],
  ["proc:niv", "NIV (BiPAP / CPAP)", "proc", 0, ["niv", "bipap", "bi pap", "cpap", "non invasive ventilation", "noninvasive ventilation", "non-invasive ventilation", "bilevel", "bi level", "bipap ventilation", "put on bipap", "mask ventilation", "c pap"]],
  ["proc:intubate", "Intubate and ventilate", "proc", 0, ["intubate", "intubation", "intubate and ventilate", "put on ventilator", "ventilator", "mechanical ventilation", "invasive ventilation", "secure the airway", "secure airway", "rsi", "rapid sequence", "endotracheal", "ett", "tube", "ventilate", "put on the ventilator", "invasive mechanical ventilation", "endotracheal intubation", "airway", "protect the airway"]],
  ["proc:prone", "Prone positioning", "proc", 0, ["prone", "proning", "prone position", "prone positioning", "turn prone", "put prone"]],
  ["proc:ecmo", "ECMO", "proc", 0, ["ecmo", "vv ecmo", "va ecmo", "extracorporeal", "e c m o", "extracorporeal membrane oxygenation"]],
  ["proc:artline", "Arterial line", "proc", 0, ["arterial line", "art line", "a line", "arterial cannulation", "invasive blood pressure", "ibp", "radial line", "arterial catheter", "arterial access"]],
  ["proc:cvc", "Central line", "proc", 0, ["central line", "cvc", "central venous catheter", "central venous access", "internal jugular", "ij line", "subclavian line", "femoral line", "central venous line", "cvp line", "triple lumen"]],
  ["proc:hdline", "Dialysis catheter", "proc", 0, ["dialysis catheter", "dialysis line", "hd line", "hd catheter", "vascath", "vas cath", "quinton", "temporary dialysis catheter", "permcath", "hemodialysis catheter", "haemodialysis catheter", "dialysis access", "double lumen catheter", "dialysis cath"]],
  ["proc:chestdrain", "Chest drain", "proc", 0, ["chest drain", "icd", "intercostal drain", "chest tube", "needle decompression", "pleural drain", "thoracostomy", "intercostal tube", "intercostal drainage", "pleural tap", "pigtail", "pigtail catheter"]],
  ["proc:bronch", "Bronchoscopy", "proc", 0, ["bronchoscopy", "bronch", "bal", "bronchoalveolar lavage", "fibre optic", "fiberoptic", "fob", "bronchoscope", "flexible bronchoscopy"]],
  ["proc:foley", "Urinary catheter", "proc", 0, ["foley", "catheterise", "urinary catheter", "catheterize", "catheterisation", "urine output monitoring", "monitor urine output", "foleys", "foley catheter", "urine bag", "hourly urine output"]],
  ["proc:ngt", "Nasogastric tube", "proc", 0, ["ryles tube", "nasogastric tube", "ng tube", "ngt", "ryle's tube", "rt tube", "gastric lavage", "gastric tube"]],

  /* ---------------------------------------------------------------- organ support and procedures */
  ["proc:removeline", "Remove the central line", "proc", 0, ["remove the central line", "remove the line", "pull the line", "line removal", "remove line", "take out the line", "remove the cvc", "remove central line", "line out", "remove the catheter", "remove infected line", "remove the infected line", "change the line", "replace the line", "remove the picc", "remove picc"]],
  ["lab:tox", "Paracetamol level / toxicology", "lab", 45, ["paracetamol level", "drug levels", "toxicology", "tox screen", "acetaminophen level", "poison screen", "serum paracetamol", "drug screen", "toxicology screen", "salicylate level"]],
  ["drug:pcc", "Prothrombin complex concentrate", "drug", 0, ["pcc", "prothrombin complex", "prothrombin complex concentrate", "kcentra", "beriplex", "octaplex", "factor concentrate", "warfarin reversal", "reverse warfarin", "reverse the anticoagulation"]],

  ["proc:dialysis", "Dialysis / CRRT", "proc", 0, ["dialysis", "hemodialysis", "haemodialysis", "crrt", "cvvhdf", "sled", "sustained low efficiency", "renal replacement", "rrt", "start dialysis", "hd", "urgent dialysis", "emergency dialysis", "cvvh", "renal replacement therapy", "start crrt", "put on dialysis"]],
  ["proc:pericard", "Pericardiocentesis", "proc", 0, ["pericardiocentesis", "pericardial drain", "pericardial tap", "drain the pericardium", "pericardial drainage", "drain the effusion", "pericardial window", "needle pericardium"]],
  ["proc:evd", "EVD / decompression", "proc", 0, ["evd", "external ventricular drain", "decompressive craniectomy", "craniectomy", "icp monitor", "icp bolt", "ventricular drain", "decompression", "icp monitoring", "burr hole"]],
  ["proc:endo", "Upper GI endoscopy", "proc", 0, ["endoscopy", "gastroscopy", "ugi endoscopy", "upper gi endoscopy", "egd", "oesophagogastroduodenoscopy", "band ligation", "variceal banding", "evl", "ogd", "upper endoscopy", "variceal ligation", "scope", "emergency endoscopy", "upper gi scopy", "ugie"]],
  ["proc:balloon", "Balloon tamponade", "proc", 0, ["sengstaken", "balloon tamponade", "blakemore", "sb tube", "sengstaken blakemore", "oesophageal balloon", "esophageal balloon", "minnesota tube"]],
  ["proc:tips", "TIPS / radiological rescue", "proc", 0, ["tips", "tips procedure", "transjugular", "interventional radiology", "ir", "embolisation", "embolization", "angio embolisation", "angio embolization", "angioembolisation", "ir embolisation"]],
  ["proc:source", "Theatre: source control / laparotomy", "proc", 0, ["source control", "laparotomy", "exploratory laparotomy", "surgery", "take to theatre", "take to ot", "operation", "debridement", "surgical debridement", "damage control", "theatre", "explore", "emergency surgery", "surgical exploration", "take to operating theatre", "operate", "operating theatre", "surgical source control", "emergency laparotomy", "damage control laparotomy", "ot", "fasciotomy", "resection", "hartmanns", "drainage of abscess"]],
  ["proc:cath", "Coronary angiography / PCI", "proc", 0, ["coronary angiography", "angiography", "cath lab", "angio", "pci", "primary pci", "cardiac cath", "catheter laboratory", "coronary angiogram", "angioplasty", "cath", "coronary intervention", "take to cath lab", "stenting", "revascularisation", "revascularization"]],
  ["proc:pacing", "Temporary pacing", "proc", 0, ["pacing", "temporary pacing", "pacemaker", "transcutaneous pacing", "tvp", "temporary pacemaker", "transvenous pacing", "external pacing", "pace", "pace the patient"]],
  ["proc:cardioversion", "Synchronised cardioversion", "proc", 0, ["cardioversion", "synchronised cardioversion", "dc cardioversion", "synchronized cardioversion", "dccv", "cardiovert", "electrical cardioversion", "sync shock", "synchronised shock", "synchronized shock"]],
  ["proc:lp", "Lumbar puncture (CSF)", "proc", 60, ["lumbar puncture", "lp", "csf", "csf analysis", "csf examination", "spinal tap", "csf study", "tap the csf", "do an lp", "csf cytology"]],
  ["proc:eeg", "EEG", "proc", 40, ["eeg", "electroencephalogram", "e e g", "brain wave", "continuous eeg", "cEEG"]],
  ["proc:cooling", "Cooling / temperature control", "proc", 0, ["cooling", "temperature control", "active cooling", "ice packs", "cold saline", "targeted temperature management", "ttm", "cooling blanket", "cool the patient", "antipyretic", "antipyretics"]],

  /* ---------------------------------------------------------------- fluids, blood, vasoactive drugs */
  ["drug:fluids", "IV fluid", "drug", 0, ["fluids", "fluid bolus", "iv fluids", "give fluids", "crystalloid", "normal saline", "saline bolus", "ringer", "ringers lactate", "rl", "ns bolus", "balanced crystalloid", "fluid challenge", "bolus", "plasmalyte", "intravenous fluids", "iv fluid", "fluid resuscitation", "saline", "ns", "ringer lactate", "ringers"]],
  ["drug:albumin", "Albumin 20%", "drug", 0, ["albumin", "20 percent albumin", "human albumin", "albumin infusion", "albumin 20", "20% albumin"]],
  ["drug:blood", "Blood (packed red cells)", "drug", 0, ["blood", "prbc", "packed red cells", "transfuse", "transfusion", "packed cells", "blood transfusion", "units of blood", "packed red blood cells", "transfuse blood", "give blood", "red cells", "pRBC", "emergency blood", "o negative blood", "o negative"]],
  ["drug:ffp", "Fresh frozen plasma", "drug", 0, ["ffp", "fresh frozen plasma", "plasma", "frozen plasma"]],
  ["drug:platelets", "Platelet transfusion", "drug", 0, ["platelets", "platelet transfusion", "platelet", "random donor platelets", "sdp", "platelet concentrate", "give platelets"]],
  ["drug:cryo", "Cryoprecipitate", "drug", 0, ["cryoprecipitate", "cryo", "cryoprecipitate transfusion"]],
  ["drug:mtp", "Massive transfusion protocol", "drug", 0, ["massive transfusion", "mtp", "massive transfusion protocol", "activate mtp", "activate massive transfusion", "major haemorrhage protocol", "major hemorrhage protocol", "mhp"]],
  ["drug:norepi", "Noradrenaline infusion", "drug", 0, ["noradrenaline", "norepinephrine", "norad", "nor adrenaline", "nor epinephrine", "levophed", "vasopressor", "pressor", "start pressors", "pressors", "vasopressors", "norepi", "nor-adrenaline", "inotrope support", "start noradrenaline", "vasopressor support", "nad"]],
  ["drug:vaso", "Vasopressin", "drug", 0, ["vasopressin", "pitressin", "add vasopressin", "second pressor", "second vasopressor"]],
  ["drug:dobut", "Dobutamine", "drug", 0, ["dobutamine", "inotrope", "dobutrex", "inotropes", "start dobutamine", "milrinone", "levosimendan"]],
  ["drug:adrenaline", "Adrenaline", "drug", 0, ["adrenaline", "epinephrine", "adrenaline 1 mg", "adrenaline one milligram", "push adrenaline", "give adrenaline", "epi", "adrenalin", "adrenaline infusion", "epinephrine infusion", "adrenaline im", "im adrenaline", "intramuscular adrenaline", "epinephrine im", "adrenaline injection"]],
  ["drug:steroid", "Hydrocortisone", "drug", 0, ["hydrocortisone", "steroids", "stress dose steroids", "steroid", "hydrocort", "hydrocortisone 100", "stress dose hydrocortisone", "iv steroids", "stress steroids"]],
  ["drug:dexa", "Dexamethasone", "drug", 0, ["dexamethasone", "dex", "dexa", "dexona", "dexamethasone iv", "give dexamethasone", "dexamethasone before antibiotics"]],
  ["drug:methylpred", "Methylprednisolone", "drug", 0, ["methylprednisolone", "methylpred", "pulse steroids", "pulse methylprednisolone", "solumedrol", "methyl prednisolone", "high dose steroids", "iv methylprednisolone"]],

  /* ---------------------------------------------------------------- targeted drugs */
  ["drug:ppi", "PPI infusion (pantoprazole)", "drug", 0, ["ppi", "pantoprazole", "proton pump inhibitor", "pantop", "esomeprazole", "omeprazole", "pan", "pantoprazole infusion", "pantoprazole 80", "ppi infusion", "iv ppi", "iv pantoprazole"]],
  ["drug:octreotide", "Octreotide", "drug", 0, ["octreotide", "somatostatin", "sandostatin", "start octreotide", "octreotide infusion"]],
  ["drug:terlipressin", "Terlipressin", "drug", 0, ["terlipressin", "glypressin", "start terlipressin", "terlipressin bolus"]],
  ["drug:insulin", "Insulin infusion", "drug", 0, ["insulin", "insulin infusion", "insulin drip", "actrapid", "regular insulin", "start insulin", "iv insulin", "fixed rate insulin", "insulin pump", "short acting insulin", "insulin bolus"]],
  ["drug:insulindex", "Insulin with dextrose (for potassium)", "drug", 0, ["insulin dextrose", "insulin and dextrose", "insulin with dextrose", "insulin dex", "glucose insulin", "glucose and insulin", "dextrose insulin", "glucose insulin infusion", "insulin dextrose infusion", "gik", "ten units insulin", "10 units insulin", "insulin 10 units"]],
  ["drug:dextrose", "Dextrose", "drug", 0, ["dextrose", "d50", "50 percent dextrose", "glucose bolus", "25 percent dextrose", "d25", "dextrose bolus", "50% dextrose", "dextrose 25", "dextrose 50", "give glucose", "10 percent dextrose", "d10"]],
  ["drug:calcium", "Calcium gluconate", "drug", 0, ["calcium", "calcium gluconate", "calcium chloride", "calcium for the heart", "cacl", "give calcium", "iv calcium", "calcium infusion", "protect the heart with calcium"]],
  ["drug:bicarb", "Sodium bicarbonate", "drug", 0, ["bicarb", "bicarbonate", "sodium bicarbonate", "soda bicarb", "nahco3", "iv bicarbonate", "bicarbonate infusion", "give bicarb", "bicarbonate bolus", "sodium bicarb", "bicarbonate 8.4", "isotonic bicarbonate"]],
  ["drug:kcl", "Potassium chloride", "drug", 0, ["potassium chloride", "kcl", "give potassium", "replace potassium", "potassium replacement", "potassium infusion", "potassium supplementation", "iv potassium"]],
  ["drug:mgso4", "Magnesium sulphate", "drug", 0, ["magnesium", "magnesium sulphate", "magnesium sulfate", "mgso4", "mag sulph", "iv magnesium", "magnesium infusion", "give magnesium", "mg so4"]],
  ["drug:salbutamol", "Salbutamol / ipratropium nebulisation", "drug", 0, ["salbutamol", "albuterol", "nebulise", "nebulization", "nebulisation", "neb", "bronchodilator", "bronchodilators", "levolin", "levosalbutamol", "duolin", "combivent", "inhaled bronchodilator", "salbutamol nebulisation", "ipratropium", "atrovent", "back to back nebulisation", "continuous nebulisation", "nebulizer", "nebuliser", "nebs"]],
  ["drug:furosemide", "Furosemide", "drug", 0, ["furosemide", "lasix", "frusemide", "diuretic", "loop diuretic", "iv lasix", "iv furosemide", "diuretics", "furosemide infusion", "give lasix", "diurese", "diuresis"]],
  ["drug:nitrate", "Nitroglycerin infusion", "drug", 0, ["nitroglycerin", "gtn", "glyceryl trinitrate", "nitrates", "isosorbide", "nitrate infusion", "sorbitrate", "nitroglycerine", "nitro", "tng", "isosorbide dinitrate", "gtn infusion", "nitro infusion"]],
  ["drug:heparin", "Heparin (anticoagulation)", "drug", 0, ["heparin", "unfractionated heparin", "ufh", "anticoagulation", "anticoagulate", "enoxaparin", "lmwh", "clexane", "start heparin", "heparin infusion", "anticoagulant", "heparin bolus", "low molecular weight heparin", "fondaparinux", "start anticoagulation"]],
  ["drug:alteplase", "Thrombolysis", "drug", 0, ["thrombolysis", "alteplase", "tpa", "tenecteplase", "streptokinase", "thrombolyse", "lyse the clot", "systemic thrombolysis", "give alteplase", "give tenecteplase", "lyse", "t p a"]],
  ["drug:antiplatelet", "Antiplatelet loading", "drug", 0, ["aspirin", "dual antiplatelet", "clopidogrel", "ticagrelor", "loading dose antiplatelet", "antiplatelets", "dapt", "give aspirin", "antiplatelet"]],
  ["drug:atropine", "Atropine", "drug", 0, ["atropine", "give atropine", "atropine 1 mg", "atropine bolus"]],
  ["drug:amiodarone", "Amiodarone", "drug", 0, ["amiodarone", "cordarone", "amiodarone bolus", "amiodarone infusion", "give amiodarone", "antiarrhythmic", "lignocaine", "lidocaine"]],
  ["drug:betablocker", "Beta-blocker", "drug", 0, ["beta blocker", "metoprolol", "esmolol", "propranolol", "betablocker", "beta blockers", "give metoprolol", "labetalol beta"]],
  ["drug:mannitol", "Mannitol", "drug", 0, ["mannitol", "osmotherapy", "iv mannitol", "give mannitol", "mannitol 20", "mannitol 100 ml", "osmotic agent", "hyperosmolar therapy", "osmotherapy", "osmotic therapy"]],
  ["drug:saline3", "3% hypertonic saline", "drug", 0, ["3% saline", "hypertonic saline", "hypertonic", "3 percent saline", "saline 3", "three percent saline", "3 percent", "hypertonic saline bolus", "23.4 percent saline", "3% nacl", "hyperosmolar therapy", "osmotherapy"]],
  ["drug:levetiracetam", "Levetiracetam", "drug", 0, ["levetiracetam", "keppra", "levipil", "give levetiracetam", "levetiracetam loading", "loading dose levetiracetam", "keppra loading"]],
  ["drug:benzo", "Lorazepam / midazolam", "drug", 0, ["lorazepam", "midazolam", "benzodiazepine", "diazepam", "ativan", "clonazepam", "benzo", "valium", "loraz", "benzodiazepines", "iv lorazepam", "give lorazepam", "give midazolam", "iv midazolam", "clonazepam iv"]],
  ["drug:antiepileptic", "Second-line antiepileptic", "drug", 0, ["phenytoin", "fosphenytoin", "eptoin", "valproate", "valproic acid", "antiepileptic", "anti epileptic", "antiepileptics", "aed", "lacosamide", "load phenytoin", "loading phenytoin", "second line antiepileptic", "sodium valproate", "anticonvulsant", "anticonvulsants"]],
  ["drug:anaesthetic", "Anaesthetic infusion (propofol / thiopentone)", "drug", 0, ["propofol", "anaesthetic infusion", "anesthetic infusion", "thiopentone", "midazolam infusion", "burst suppression", "thiopental", "propofol infusion", "general anaesthesia", "general anesthesia", "ketamine infusion"]],
  ["drug:sedation", "Sedation and analgesia", "drug", 0, ["sedation", "sedate", "analgesia", "analgesics", "painkiller", "fentanyl", "morphine", "paracetamol", "pain relief", "opioid", "ketamine", "analgesic", "give analgesia", "sedate the patient", "fentanyl infusion", "pain control", "paracetamol iv"]],
  ["drug:antihypertensive", "Blood pressure control", "drug", 0, ["labetalol", "nicardipine", "antihypertensive", "control the blood pressure", "lower blood pressure", "blood pressure control", "clevidipine", "nitroprusside", "bp control", "nimodipine", "antihypertensives", "reduce blood pressure", "reduce bp", "lower bp", "labetalol infusion", "hydralazine"]],
  ["drug:nac", "N-acetylcysteine", "drug", 0, ["nac", "n acetylcysteine", "acetylcysteine", "n-acetyl cysteine", "nac infusion", "n acetyl cysteine", "start nac", "acetylcystine"]],
  ["drug:lactulose", "Lactulose / rifaximin", "drug", 0, ["lactulose", "rifaximin", "laxatives", "enema", "l ornithine", "lola", "lactulose enema", "ornithine aspartate", "bowel cleansing"]],
  ["drug:vitk", "Vitamin K", "drug", 0, ["vitamin k", "vit k", "phytomenadione", "inj vitamin k", "vitamin k iv", "inj vit k"]],
  ["drug:txa", "Tranexamic acid", "drug", 0, ["tranexamic acid", "txa", "tranexamic", "tranexamic acid 1 g", "give txa", "tranexamic acid bolus", "cyclokapron"]],
  ["drug:artesunate", "IV artesunate", "drug", 0, ["artesunate", "iv artesunate", "antimalarial", "anti malarial", "artemether", "quinine", "anti-malarial", "malaria treatment", "antimalarials", "start artesunate", "artesunate injection", "treat malaria"]],
  ["drug:thiamine", "Thiamine", "drug", 0, ["thiamine", "vitamin b1", "vitamin b", "thiamin", "iv thiamine", "vitamin b complex"]],

  /* ---------------------------------------------------------------- resuscitation */
  ["cpr", "Chest compressions", "acls", 0, ["cpr", "start cpr", "compressions", "chest compressions", "start compressions", "cardiopulmonary resuscitation", "compress", "begin cpr", "do cpr"]],
  ["shock", "Defibrillate", "acls", 0, ["shock", "defibrillate", "defibrillation", "deliver shock", "shock the patient", "defib", "charge and shock", "give a shock", "shock now", "defibrillator", "deliver a shock", "200 joules", "joules"]],

  /* ---------------------------------------------------------------- antibiotics and anti-infectives */
  ["abx:ceftriaxone", "Ceftriaxone", "abx", 0, ["ceftriaxone", "ceftri", "rocephin", "monocef", "cef triaxone", "ceftriaxone 2 g", "ceftriaxone 1 g", "intacef", "ceftriaxone sulbactam", "xone", "cef tri axone"]],
  ["abx:cefoperazone", "Cefoperazone-sulbactam", "abx", 0, ["cefoperazone", "cefoperazone sulbactam", "sulperazon", "magnex", "cefoperazone and sulbactam", "cefoperazone sulbactam combination", "sulbactam cefoperazone", "cefoperazone sulbac", "cefaperazone", "cefoperazone sulbactam"]],
  ["abx:piptaz", "Piperacillin-tazobactam", "abx", 0, ["piperacillin tazobactam", "pip taz", "piptaz", "tazact", "zosyn", "piperacillin", "pip-taz", "tazobactam", "piperacillin and tazobactam", "pipertaz", "tazocin", "piper tazo", "pip tazo", "piperacillin tazo"]],
  ["abx:cefepime", "Cefepime", "abx", 0, ["cefepime", "cepime", "maxipime", "cefipime", "cefepime 2 g", "cefapime"]],
  ["abx:ceftazidime", "Ceftazidime", "abx", 0, ["ceftazidime", "fortum", "ceftaz", "ceftazadime"]],
  ["abx:meropenem", "Meropenem", "abx", 0, ["meropenem", "merrem", "meronem", "meropenum", "merope nem", "mero", "meropenem 1 g", "meropenam", "meropenem 2 g", "meronam", "mero penem", "meropenem infusion", "meropenem iv", "merropenem", "mero penum"]],
  ["abx:vancomycin", "Vancomycin", "abx", 0, ["vancomycin", "vancocin", "vanc", "vanco", "vancomycin loading", "vancomycin 1 g", "vancomycin infusion", "vancomycin loading dose", "vancomysin"]],
  ["abx:linezolid", "Linezolid", "abx", 0, ["linezolid", "zyvox", "linezolid 600", "linzolid", "linezolide", "linez"]],
  ["abx:colistin", "Colistin", "abx", 0, ["colistin", "colistin loading", "colistimethate", "colistin infusion", "colistine", "colistin 9 million", "colistimethate sodium"]],
  ["abx:tigecycline", "Tigecycline", "abx", 0, ["tigecycline", "tygacil", "tigecyclin", "tigecycline loading"]],
  ["abx:azithromycin", "Azithromycin", "abx", 0, ["azithromycin", "azithral", "azee", "azithromycin 500", "azithromycine", "zithromax", "azythromycin", "azithro"]],
  ["abx:doxycycline", "Doxycycline", "abx", 0, ["doxycycline", "doxy", "doxycycline iv", "doxycyclin", "doxycycline 100"]],
  ["abx:levofloxacin", "Levofloxacin", "abx", 0, ["levofloxacin", "levaquin", "levoflox", "levofloxacin 750", "levo"]],
  ["abx:metronidazole", "Metronidazole", "abx", 0, ["metronidazole", "metrogyl", "flagyl", "metronidazol", "iv metronidazole", "metronidazole 500", "metro"]],
  ["abx:clindamycin", "Clindamycin", "abx", 0, ["clindamycin", "clinda", "dalacin", "clindamycin iv", "clindamycine", "clindamicin"]],
  ["abx:amikacin", "Amikacin", "abx", 0, ["amikacin", "amikacin iv", "amikacin 750", "amikacin 1 g", "amakin", "amikasin"]],
  ["abx:amoxiclav", "Co-amoxiclav", "abx", 0, ["augmentin", "clavam", "amoxiclav", "co amoxiclav", "amoxicillin clavulanate", "amoxycillin clavulanate", "amox clav", "coamoxiclav", "amoxyclav"]],
  ["abx:ampicillin", "Ampicillin", "abx", 0, ["ampicillin", "ampicilin", "amp"]],
  ["abx:cotrimoxazole", "Co-trimoxazole", "abx", 0, ["cotrimoxazole", "co trimoxazole", "bactrim", "septran", "trimethoprim sulfamethoxazole", "tmp smx", "cotrimoxazol", "co-trimoxazole", "septra"]],
  ["abx:oseltamivir", "Oseltamivir", "abx", 0, ["oseltamivir", "tamiflu", "oseltamavir", "oseltamivir 75", "start oseltamivir", "oseltamivir 150", "oseltamivar"]],
  ["abx:acyclovir", "Acyclovir", "abx", 0, ["acyclovir", "aciclovir", "zovirax", "acyclovir iv", "acyclovir 10 mg", "acyclovir infusion", "acyclovar"]],
  ["abx:fluconazole", "Fluconazole", "abx", 0, ["fluconazole", "forcan", "fluconazol", "fluconazole iv", "diflucan"]],
  ["abx:imipenem", "Imipenem-cilastatin", "abx", 0, ["imipenem", "imipenem cilastatin", "primaxin", "tienam", "imipenam", "imipenum", "imi penem"]],
  ["abx:ertapenem", "Ertapenem", "abx", 0, ["ertapenem", "invanz", "ertapenum", "ertapenam", "erta penem"]],
  ["abx:ceftazavi", "Ceftazidime-avibactam", "abx", 0, ["ceftazidime avibactam", "avibactam", "zavicefta", "ceftazidime and avibactam", "caz avi"]],
  ["abx:cefazolin", "Cefazolin", "abx", 0, ["cefazolin", "cefazoline", "ancef", "kefzol", "cefazolin 2 g", "cefozolin"]],
  ["abx:cefuroxime", "Cefuroxime", "abx", 0, ["cefuroxime", "zinacef", "cefuroxim", "cefurixime"]],
  ["abx:cefotaxime", "Cefotaxime", "abx", 0, ["cefotaxime", "claforan", "cefotaxim", "taxim"]],
  ["abx:aztreonam", "Aztreonam", "abx", 0, ["aztreonam", "azactam", "aztreonem"]],
  ["abx:gentamicin", "Gentamicin", "abx", 0, ["gentamicin", "gentamycin", "genta", "garamycin", "gentamicine", "gentamisin"]],
  ["abx:tobramycin", "Tobramycin", "abx", 0, ["tobramycin", "tobramycine", "tobra"]],
  ["abx:teicoplanin", "Teicoplanin", "abx", 0, ["teicoplanin", "targocid", "teicoplanin loading", "ticoplanin", "teicoplannin", "tico planin"]],
  ["abx:daptomycin", "Daptomycin", "abx", 0, ["daptomycin", "cubicin", "dapto", "daptomycine"]],
  ["abx:ciprofloxacin", "Ciprofloxacin", "abx", 0, ["ciprofloxacin", "cipro", "ciplox", "ciprofloxacine", "cipro floxacin"]],
  ["abx:moxifloxacin", "Moxifloxacin", "abx", 0, ["moxifloxacin", "avelox", "moxi", "moxifloxacin iv", "moxy floxacin"]],
  ["abx:clarithromycin", "Clarithromycin", "abx", 0, ["clarithromycin", "klacid", "claritromycin", "clarithro"]],
  ["abx:erythromycin", "Erythromycin", "abx", 0, ["erythromycin", "erythro", "erythromicin", "erithromycin"]],
  ["abx:minocycline", "Minocycline", "abx", 0, ["minocycline", "minocin", "minocyclin"]],
  ["abx:cloxacillin", "Cloxacillin", "abx", 0, ["cloxacillin", "cloxa", "cloxacilin", "cloxapen"]],
  ["abx:flucloxacillin", "Flucloxacillin", "abx", 0, ["flucloxacillin", "floxapen", "flucloxacilin", "fluclox", "flu cloxacillin"]],
  ["abx:penicillin", "Benzylpenicillin (penicillin G)", "abx", 0, ["penicillin", "benzylpenicillin", "penicillin g", "crystalline penicillin", "benzyl penicillin", "pen g", "penicilin"]],
  ["abx:amoxicillin", "Amoxicillin", "abx", 0, ["amoxicillin", "amoxycillin", "amoxil", "amoxicilin", "amox"]],
  ["abx:ampsulbactam", "Ampicillin-sulbactam", "abx", 0, ["ampicillin sulbactam", "unasyn", "sulbactam ampicillin", "amp sulbactam", "ampicillin and sulbactam"]],
  ["abx:polymyxinb", "Polymyxin B", "abx", 0, ["polymyxin b", "polymyxin", "polymixin", "polymyxin b infusion"]],
  ["abx:fosfomycin", "Fosfomycin", "abx", 0, ["fosfomycin", "fosfomycine", "fosfomicin"]],
  ["abx:amphotericin", "Amphotericin B", "abx", 0, ["amphotericin", "amphotericin b", "liposomal amphotericin", "ambisome", "amphotericin infusion", "ampho b", "amphoterecin"]],
  ["abx:micafungin", "Micafungin", "abx", 0, ["micafungin", "mycamine", "micafungine", "mica fungin"]],
  ["abx:caspofungin", "Caspofungin", "abx", 0, ["caspofungin", "cancidas", "caspofungine", "caspo fungin"]],
  ["abx:voriconazole", "Voriconazole", "abx", 0, ["voriconazole", "vfend", "voriconazol", "vori", "voriconazole iv"]],
  ["abx:echinocandin", "Echinocandin", "abx", 0, ["echinocandin", "anidulafungin"]],
  /* ---------------------------------------------------------------- added for the MDT voice master list */
  ["proc:trach", "Tracheostomy", "proc", 0, ["tracheostomy", "trache", "trach", "percutaneous tracheostomy", "surgical tracheostomy", "tracheostomy tube", "open a tracheostomy"]],
  ["proc:paracentesis", "Diagnostic paracentesis (ascitic tap)", "proc", 30, ["paracentesis", "diagnostic paracentesis", "ascitic tap", "ascitic fluid tap", "ascitic fluid", "tap the ascites", "abdominal tap", "peritoneal tap"]],
  ["proc:tap", "Pleural fluid aspiration (thoracentesis)", "proc", 30, ["thoracentesis", "pleural tap", "pleural fluid aspiration", "pleural aspiration", "pleural fluid tap", "tap the effusion", "aspirate the pleural fluid"]],
  ["drug:enteral", "Enteral feeds", "drug", 0, ["enteral nutrition", "enteral feeds", "enteral feeding", "start feeds", "start feeding", "ng feeds", "tube feeds", "tube feeding", "start nutrition", "nutrition", "feeds"]],
  ["drug:parenteral", "Parenteral nutrition", "drug", 0, ["parenteral nutrition", "tpn", "total parenteral nutrition", "start tpn", "start parenteral nutrition", "iv nutrition"]],
  ["abx:any", "Antibiotics (empirical, broad-spectrum)", "abx", 0, ["antibiotics", "antibiotic", "start antibiotics", "empirical antibiotics", "broad spectrum antibiotics", "broad spectrum", "start antibiotic", "give antibiotics", "iv antibiotics", "empiric antibiotics", "antibiotic therapy", "first dose antibiotic", "first dose of antibiotics", "antibiotic cover", "begin antibiotics"]],
];

export const CATALOGUE = ROWS.map(([id, label, cat, delay, say]) => ({ id, label, cat, delaySec: delay, say }));
export const BY_ID = Object.fromEntries(CATALOGUE.map((o) => [o.id, o]));

/* what the old buttons and old rooms called things */
export const LEGACY = {
  labs: "bundle", cxr: "img:cxr", "ct-head": "img:cthead", "ct-chest": "img:ctchest", antibiotics: "abx:any", oxygen: "proc:oxygen", intubate: "proc:intubate",
  airway: "proc:intubate", bronchoscopy: "proc:bronch", dialysis: "proc:dialysis", calcium: "drug:calcium", "insulin-dex": "drug:insulindex", blood: "drug:blood",
  ppi: "drug:ppi", endoscopy: "proc:endo", osmotherapy: "drug:saline3", echo: "img:echo", cultures: "lab:cultures", source: "proc:source", norepi: "drug:norepi",
  fluid: "drug:fluids", saline3: "drug:saline3", mannitol: "drug:mannitol", "art-line": "proc:artline", "hd-line": "proc:hdline", flood: "flood", betablocker: "drug:betablocker",
  "lay-flat": "lay-flat", cpr: "cpr", adrenaline: "drug:adrenaline", shock: "shock", "ct-abd": "img:ctabd", ecg: "img:ecg",
};
/* the old "send labs" button sends the bundle a doctor asks for first */
export const BUNDLE = ["lab:abg", "lab:cbc", "lab:kft"];

export function canon(kind) { const k = String(kind || ""); return LEGACY[k] || k; }
export const labelOf = (id) => (BY_ID[canon(id)] || {}).label || String(id);
export const KNOWN = (id) => !!BY_ID[canon(id)] || ["call", "advice", "enter", "flood", "lay-flat", "bundle"].includes(id);

/* ---------------------------------------------------------------------------------------
   Reference ranges. [low, high, unit, decimals, label]
   --------------------------------------------------------------------------------------- */
export const LABS = {
  hb: [12, 16.5, "g/dL", 1, "Haemoglobin"], wbc: [4, 11, "×10³/µL", 1, "White cell count"], plt: [150, 400, "×10³/µL", 0, "Platelets"],
  urea: [15, 45, "mg/dL", 0, "Urea"], cr: [0.6, 1.2, "mg/dL", 1, "Creatinine"], na: [135, 145, "mmol/L", 0, "Sodium"], k: [3.5, 5.1, "mmol/L", 1, "Potassium"],
  cl: [98, 107, "mmol/L", 0, "Chloride"], ca: [8.5, 10.5, "mg/dL", 1, "Calcium"], mg: [1.7, 2.4, "mg/dL", 1, "Magnesium"],
  bili: [0.2, 1.2, "mg/dL", 1, "Bilirubin"], alt: [7, 40, "U/L", 0, "ALT"], ast: [10, 40, "U/L", 0, "AST"], alb: [3.5, 5, "g/dL", 1, "Albumin"],
  ph: [7.35, 7.45, "", 2, "pH"], pco2: [35, 45, "mmHg", 0, "pCO₂"], po2: [80, 105, "mmHg", 0, "pO₂"], hco3: [22, 26, "mmol/L", 0, "Bicarbonate"], lactate: [0.5, 2, "mmol/L", 1, "Lactate"],
  inr: [0.9, 1.2, "", 1, "INR"], aptt: [25, 35, "s", 0, "aPTT"], fib: [200, 400, "mg/dL", 0, "Fibrinogen"],
  trop: [0, 20, "ng/L", 0, "hs-Troponin"], bnp: [0, 100, "pg/mL", 0, "BNP"], ck: [30, 200, "U/L", 0, "CPK"], glu: [70, 140, "mg/dL", 0, "Glucose"],
  crp: [0, 5, "mg/L", 0, "CRP"], pct: [0, 0.5, "ng/mL", 1, "Procalcitonin"], amy: [25, 125, "U/L", 0, "Amylase"], lip: [10, 60, "U/L", 0, "Lipase"], nh3: [15, 50, "µmol/L", 0, "Ammonia"],
  ddimer: [0, 500, "ng/mL", 0, "D-dimer"], bhb: [0, 0.6, "mmol/L", 1, "Beta-hydroxybutyrate"], osm: [275, 295, "mOsm/kg", 0, "Osmolality"],
};
export const NORMAL = { hb: 13.5, wbc: 7.5, plt: 250, urea: 28, cr: 0.9, na: 140, k: 4.2, cl: 102, ca: 9.2, mg: 2, bili: 0.7, alt: 24, ast: 26, alb: 4, ph: 7.4, pco2: 40, po2: 95, hco3: 24, lactate: 1.1, inr: 1, aptt: 30, fib: 300, trop: 6, bnp: 40, ck: 90, glu: 105, crp: 2, pct: 0.1, amy: 70, lip: 30, nh3: 30, ddimer: 250, bhb: 0.2, osm: 285 };

/* the panels, and which values each one returns */
export const PANELS = {
  "lab:cbc": ["hb", "wbc", "plt"], "lab:kft": ["urea", "cr", "na", "k"], "lab:lyte": ["na", "k", "cl", "ca", "mg"], "lab:lft": ["bili", "alt", "ast", "alb"],
  "lab:abg": ["ph", "pco2", "po2", "hco3", "lactate"], "lab:lactate": ["lactate"], "lab:coag": ["inr", "aptt", "fib", "plt"], "lab:trop": ["trop"], "lab:bnp": ["bnp"], "lab:ck": ["ck"],
  "lab:glucose": ["glu"], "lab:crp": ["crp"], "lab:pct": ["pct"], "lab:amylase": ["amy", "lip"], "lab:nh3": ["nh3"], "lab:ddimer": ["ddimer"], "lab:ketones": ["bhb"],
};
