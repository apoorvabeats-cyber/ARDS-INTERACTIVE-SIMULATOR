/* Radiology Lab, MRI cases. First draft, needs clinical review. */
(function () {
  var R = window.RAD = window.RAD || { cases: [] };
  R.add = R.add || function (a) { a.forEach(function (c) { R.cases.push(c); }); };
  R.add([
    {
      id: "mri-dwi", mod: "mri", grp: "Brain", t: "Acute infarct: DWI and ADC", img: "scans/dwi.png", view: "Axial DWI (left) and ADC map (right)",
      alt: "Axial DWI with a bright right MCA territory lesion and the matching dark ADC",
      hx: "70-year-old with sudden left-sided weakness and facial droop two hours ago. NIHSS 12.",
      task: "Mark the lesion on the DWI image on the left.",
      reg: [[.13, .50, .08, .16, "DWI-bright lesion, right MCA territory"], [.63, .50, .045, .14, "Matching dark area on ADC"]],
      find: ["High signal on DWI with low signal on ADC means restricted diffusion", "Restricted diffusion is cytotoxic oedema, seen minutes after ischaemic onset", "Rule out T2 shine-through: a bright DWI lesion that is also bright on ADC is not acute infarct"],
      rep: "Acute right MCA territory infarct with restricted diffusion.",
      ddx: ["Acute ischaemic infarct", "Abscess", "Hypoglycaemia", "Seizure-related change", "Lymphoma"],
      sig: "DWI is the most sensitive sequence for acute infarct. It also helps when onset time is unknown.",
      icu: ["Thrombolysis or thrombectomy decisions follow the vessel imaging and time window", "Keep blood pressure within the thresholds for the chosen therapy", "Avoid hypoglycaemia, hyperthermia, hypoxia", "Early swallow screen and secondary prevention"],
      q: [{ q: "Acute infarct appears as:", o: ["Low DWI and high ADC", "High DWI and low ADC", "High DWI and high ADC", "Normal on all sequences"], a: 1, w: "Water movement is restricted, so DWI is bright and the ADC map is dark." }]
    },
    {
      id: "mri-aca", mod: "mri", grp: "Brain", t: "DWI lesion with an MRA vessel abnormality", img: "mris/stroke.jpg", view: "DWI, ADC and MRA",
      alt: "DWI near the midline, ADC map and MR angiogram with an arrow on a vessel",
      hx: "65-year-old with sudden leg weakness and abulia.",
      task: "Mark the diffusion-restricting lesion on the left image, near the midline.",
      reg: [[.18, .40, .03, .16, "DWI-bright medial frontal lesion"]],
      find: ["A bright DWI lesion beside the midline, a medial frontal location", "The ADC map shows the matching dark area", "The MRA arrow marks the vessel that supplies the area"],
      rep: "Acute infarct beside the midline with a corresponding vessel abnormality on MRA.",
      ddx: ["Anterior cerebral artery infarct", "Watershed infarct", "Tumour"],
      sig: "Leg-predominant weakness and abulia point to the anterior cerebral artery territory.",
      icu: ["Treat as ischaemic stroke: assess for thrombectomy based on vessel occlusion", "Look for a cardiac or large-vessel source", "Prevent aspiration and treat complications"],
      q: [{ q: "Leg-predominant weakness with abulia suggests which territory?", o: ["Middle cerebral", "Anterior cerebral", "Posterior cerebral", "Basilar"], a: 1, w: "The leg area of the motor cortex lies in the anterior cerebral territory." }]
    },
    {
      id: "mri-abscess", mod: "mri", grp: "Brain", t: "Brain abscess", img: "mris/abscess.jpg", view: "Axial, T1 with contrast",
      alt: "Axial T1 post-contrast MRI with a ring-enhancing lesion",
      hx: "Child with fever, headache, vomiting and a recent ear infection. Left-sided seizure.",
      task: "Mark the ring-enhancing lesion.",
      reg: [[.78, .74, .13, .12, "Ring-enhancing cavity"]],
      find: ["A well-defined lesion with a thin smooth enhancing rim", "Dark centre on T1, with surrounding oedema", "DWI would show restricted diffusion centrally"],
      rep: "A ring-enhancing intracranial lesion, in keeping with abscess.",
      ddx: ["Pyogenic abscess", "Necrotic tumour", "Toxoplasmosis", "Tuberculoma", "Demyelination"],
      sig: "Restricted diffusion in the centre favours abscess over tumour.",
      icu: ["Neurosurgical drainage or aspiration for culture", "Prolonged intravenous antibiotics, with cover chosen for the source", "Treat seizures and raised pressure", "Look for a source: ear, sinus, teeth, heart, lung"],
      q: [{ q: "Which MRI sequence best separates an abscess from a necrotic tumour?", o: ["T1", "DWI", "FLAIR", "T2*"], a: 1, w: "Pus restricts diffusion and shows high DWI with low ADC in the cavity." }]
    },
    {
      id: "mri-hsv", mod: "mri", grp: "Brain", t: "Herpes simplex encephalitis", img: "mris/hsv.jpg", view: "Coronal, T2",
      alt: "Coronal T2 MRI with high signal in the temporal lobes",
      hx: "Fever, confusion, behavioural change and a focal seizure. CSF shows lymphocytes and red cells.",
      task: "Mark the abnormal temporal lobes.",
      reg: [[.26, .56, .14, .17, "Right medial temporal high signal"], [.80, .55, .12, .15, "Left temporal high signal"]],
      find: ["High T2 signal and swelling in the temporal lobes", "Asymmetric, often bilateral, involving the limbic region", "Haemorrhage may appear later"],
      rep: "Temporal lobe swelling and high T2 signal, in keeping with herpes simplex encephalitis.",
      ddx: ["HSV encephalitis", "Autoimmune limbic encephalitis", "Status epilepticus change", "Glioma"],
      sig: "HSV encephalitis is treatable but kills or disables if aciclovir is delayed.",
      icu: ["Start intravenous aciclovir at once, before the CSF PCR result", "CSF with HSV PCR, EEG, MRI", "Treat seizures and raised intracranial pressure", "Continue until PCR is negative and the diagnosis is excluded"],
      q: [{ q: "When should aciclovir be started in suspected encephalitis?", o: ["After MRI", "Immediately, without waiting for results", "After the CSF PCR", "After seven days of fever"], a: 1, w: "Delay increases mortality and disability." }]
    },
    {
      id: "mri-ods", mod: "mri", grp: "Brain", t: "Osmotic demyelination", img: "mris/ods.jpg", view: "Axial, T2",
      alt: "Axial T2 MRI of the pons with central high signal",
      hx: "Alcoholic patient with severe hyponatraemia, corrected from 108 to 128 mmol/L in 24 hours. Four days later: quadriparesis and dysarthria.",
      task: "Mark the abnormal pons.",
      reg: [[.50, .55, .11, .07, "Central pontine high signal"]],
      find: ["High T2 signal in the central pons", "Often sparing the periphery", "Changes may take days to show"],
      rep: "Central pontine high T2 signal, in keeping with osmotic demyelination.",
      ddx: ["Osmotic demyelination", "Pontine infarct", "Wernicke encephalopathy", "Demyelinating disease"],
      sig: "Too rapid correction of chronic hyponatraemia causes osmotic demyelination. It can be avoided.",
      icu: ["Limit correction to 8 mmol/L in 24 hours in high-risk patients (and 10 to 12 at most)", "Check sodium every 2 to 4 hours during active correction", "If overcorrection occurs, re-lower with hypotonic fluid and desmopressin"],
      q: [{ q: "What is a safe maximum rate of sodium correction in a patient with chronic hyponatraemia and high risk of osmotic demyelination?", o: ["Up to 8 mmol/L in 24 hours", "20 mmol/L in 24 hours", "30 mmol/L in 24 hours", "Unlimited"], a: 0, w: "High-risk patients, such as alcoholics and the malnourished, should not exceed 8 mmol/L per day." }]
    },
    {
      id: "mri-pres", mod: "mri", grp: "Brain", t: "Posterior reversible encephalopathy syndrome", img: "mris/pres.jpg", view: "Axial, T2",
      alt: "Axial T2 MRI with high signal in the posterior cerebral cortex and white matter",
      hx: "Woman with severe hypertension, headache, visual loss and a seizure.",
      task: "Mark the posterior high signal.",
      reg: [[.30, .83, .13, .09, "Right occipital T2 high signal"], [.68, .83, .13, .09, "Left occipital T2 high signal"]],
      find: ["Bilateral high signal in the posterior cortex and subcortical white matter", "Often parieto-occipital", "Mostly vasogenic oedema and reversible"],
      rep: "Bilateral posterior oedema, in keeping with PRES.",
      ddx: ["PRES", "Posterior circulation infarct", "Venous thrombosis", "Encephalitis"],
      sig: "PRES is recognised by the clinical picture and the pattern. It is usually reversible when the trigger is controlled.",
      icu: ["Control blood pressure carefully, not too fast", "Treat seizures, and in pre-eclampsia give magnesium and deliver", "Stop triggering drugs: calcineurin inhibitors, chemotherapy", "Repeat imaging to confirm resolution"],
      q: [{ q: "Which of these can trigger PRES?", o: ["Severe hypertension and tacrolimus", "Low sodium only", "Hypoglycaemia only", "Vitamin D"], a: 0, w: "Hypertension, pre-eclampsia, immunosuppressants and chemotherapy are classic triggers." }]
    },
    {
      id: "mri-seq", mod: "mri", grp: "Sequences", t: "Which sequence is this?", img: "mris/dai.jpg", view: "T1, FLAIR, DWI and T2* panels of one patient",
      alt: "Four panels of an axial brain: T1, FLAIR, DWI and T2*",
      panels: [
        { id: "t1", label: "T1", rect: [0, 0, 0.5, 0.48] },
        { id: "flair", label: "FLAIR", rect: [0.5, 0, 0.5, 0.48] },
        { id: "dwi", label: "DWI", rect: [0, 0.5, 0.5, 0.5] },
        { id: "t2s", label: "T2*", rect: [0.5, 0.5, 0.5, 0.5] }
      ],
      hx: "Young patient after a high-speed collision, coma disproportionate to the CT scan.",
      task: "Switch between the panels, compare two side by side, then answer the question.",
      reg: [],
      choice: { q: "In which panel is CSF dark and the grey matter darker than the white matter?", o: ["T1", "FLAIR", "DWI", "T2*"], a: 0, w: "On T1 water is dark and white matter is brighter than grey. On FLAIR, CSF is also dark, but the grey matter is brighter than the white matter." },
      find: ["T1: water dark, fat bright, anatomy", "FLAIR: T2 contrast with the CSF signal suppressed, best for cortical and periventricular lesions", "DWI: restricted diffusion, acute infarct, abscess", "T2* (GRE) or SWI: blood and calcium bloom as dark foci"],
      rep: "A set of four sequences. Each answers a different question.",
      ddx: ["Diffuse axonal injury (small dark foci on T2* or SWI)", "Microbleeds", "Cavernomas"],
      sig: "Choosing the right sequence matters. DWI for stroke, FLAIR for oedema, T2* or SWI for blood.",
      icu: ["Coma with a normal CT: ask for MRI with DWI, FLAIR and SWI", "Check MRI safety first: devices, ventilator, infusion pumps and monitors", "Transport needs a trained team"],
      q: [{ q: "Which sequence is most sensitive for small haemorrhages?", o: ["T1", "T2* or SWI", "DWI", "FLAIR"], a: 1, w: "Haemosiderin causes signal loss that susceptibility sequences exaggerate." }]
    }
  ]);
})();
