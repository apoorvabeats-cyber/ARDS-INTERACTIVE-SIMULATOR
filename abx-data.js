window.ABX = {
  notice: "Teaching figures only. Not a prescription, a local protocol, or a substitute for the monograph. Confirm the formulation, the indication, and current guidance before a drug is given.",
  classes: [
    {
      id: "beta-lactam",
      name: "Beta-lactam antibiotics",
      groups: [
        {
          id: "penicillins",
          name: "Class 1. Penicillins",
          subclasses: [
            {
              id: "natural",
              name: "A. Natural penicillins",
              moa: "Bind penicillin-binding proteins and inhibit peptidoglycan cross-linking in the bacterial cell wall.",
              pharm: "Predominantly time-dependent bactericidal activity. Renal elimination is important for most formulations.",
              use: "Susceptible streptococcal infections, syphilis, and selected infections caused by susceptible organisms.",
              contra: [
                "Serious immediate hypersensitivity to penicillins.",
                "Formulation-specific contraindications.",
                "Consider cross-reactivity with other beta-lactams according to the allergy history and side-chain structure."
              ],
              adverse: [
                "Hypersensitivity and anaphylaxis",
                "Diarrhea",
                "Interstitial nephritis",
                "Hematological abnormalities",
                "Neurotoxicity and seizures with excessive exposure to high-dose penicillin G"
              ],
              renal: "selected",
              renalText: "Adjust selected formulations in significant renal impairment. Verify the exact formulation and indication.",
              hepaticText: "No hepatic dose change is stated for this subclass in the teaching bank.",
              rrtText: "Renal elimination matters for most formulations. An exact CRRT or SLED dose is not in this teaching bank. Verify the monograph for the formulation in use.",
              monitor: "Allergy history, renal function, CBC for prolonged therapy, and neurological status during high-dose treatment.",
              drugs: [
                {id:"pen-g", name:"Penicillin G", dose:"Indication-specific IV dosing. High-dose regimens may be required for severe infections.", notes:["Excessive high-dose exposure can cause neurotoxicity and seizures."]},
                {id:"pen-v", name:"Penicillin V", dose:"Commonly 250–500 mg orally every 6 hours for selected infections."},
                {id:"pen-benz", name:"Benzathine penicillin G", dose:"Indication-specific deep IM administration. Never administer intravenously.", notes:["Never give this formulation intravenously."]},
                {id:"pen-proc", name:"Procaine penicillin G", dose:"No separate adult dose example is in this teaching bank. Verify the formulation and the indication.", notes:["Listed with the natural penicillins. The bank does not add a dose that was not supplied."]}
              ]
            },
            {
              id: "amino",
              name: "B. Aminopenicillins",
              moa: "Inhibition of bacterial cell-wall synthesis through binding to penicillin-binding proteins.",
              spectrum: "Susceptible streptococci, selected enterococci, Listeria monocytogenes, and selected susceptible Gram-negative organisms.",
              contra: ["Serious immediate beta-lactam hypersensitivity."],
              adverse: [
                "Rash",
                "Diarrhea",
                "Hypersensitivity",
                "Interstitial nephritis",
                "Rare seizures with excessive exposure"
              ],
              renal: "often",
              renalText: "Renal adjustment is often required.",
              hepaticText: "No hepatic dose change is stated for this subclass in the teaching bank.",
              rrtText: "These drugs are renally cleared. An exact CRRT or SLED dose is not in this teaching bank. Verify the monograph.",
              monitor: "Renal function, CBC for prolonged treatment, allergy, clinical response, and microbiological susceptibility.",
              pearl: "Ampicillin is an important targeted option for susceptible enterococci and Listeria. Amoxicillin is not an empirical substitute for IV therapy in septic shock.",
              drugs: [
                {id:"ampi", name:"Ampicillin", dose:"1–2 g IV every 4–6 hours, depending on indication.", notes:["Targeted option for susceptible enterococci and Listeria monocytogenes."]},
                {id:"amox", name:"Amoxicillin", dose:"Commonly 500 mg orally every 8 hours, or 875 mg every 12 hours, for selected infections.", notes:["Not an empirical substitute for IV therapy in septic shock."]}
              ]
            },
            {
              id: "bli",
              name: "C. Penicillin–beta-lactamase inhibitor combinations",
              moa: "The penicillin inhibits cell-wall synthesis. The beta-lactamase inhibitor protects it against selected beta-lactamases.",
              contra: [
                "Serious relevant beta-lactam hypersensitivity.",
                "Renal impairment requires a dosing check, not an automatic stop.",
                "Sodium load with selected formulations.",
                "Increased risk of adverse effects during prolonged treatment."
              ],
              adverse: [
                "Diarrhea",
                "Hypersensitivity",
                "Liver injury, particularly with amoxicillin–clavulanate",
                "Cytopenias with prolonged exposure",
                "Acute kidney injury, particularly in patients receiving multiple nephrotoxic agents"
              ],
              renal: "required",
              renalText: "Renal adjustment is required for many regimens. Piperacillin–tazobactam dosing should account for renal clearance, infection severity, infusion strategy, and renal replacement therapy.",
              hepaticText: "Liver injury is a particular concern with amoxicillin–clavulanate. No numeric hepatic dose reduction is stated in this teaching bank. Check liver tests when that risk applies.",
              rrtText: "For piperacillin–tazobactam, renal replacement therapy is one of the factors that should change the regimen. The exact CRRT or SLED milligram dose is not in this teaching bank. Verify the monograph, the effluent rate or the SLED schedule, and the severity.",
              monitor: "Renal function, electrolytes, CBC, liver function when appropriate, clinical response, and cultures.",
              pearl: "Piperacillin–tazobactam should not automatically be considered definitive therapy for every serious ESBL-producing Enterobacterales infection. The organism, infection site, susceptibility, severity, and current guidance must determine the choice.",
              drugs: [
                {id:"amox-clav", name:"Amoxicillin–clavulanate", dose:"Commonly 875/125 mg orally every 12 hours, depending on formulation and indication.", notes:["Liver injury is more often associated with this combination than with the other penicillins in this bank."]},
                {id:"ampi-sul", name:"Ampicillin–sulbactam", dose:"Commonly 1.5–3 g IV every 6 hours."},
                {id:"pip-tazo", name:"Piperacillin–tazobactam", dose:"Commonly 4.5 g IV every 6–8 hours. Extended-infusion regimens are used in selected severe infections.", notes:["Account for renal clearance, infection severity, infusion strategy, and renal replacement therapy.","Not automatic definitive therapy for every serious ESBL-producing Enterobacterales infection.","Selected formulations carry a sodium load."]}
              ]
            }
          ]
        }
      ]
    }
  ]
};
