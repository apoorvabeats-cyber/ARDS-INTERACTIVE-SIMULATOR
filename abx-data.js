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
        },
        {
          id: "cephalosporins",
          name: "Class 2. Cephalosporins",
          subclasses: [
            {
              id: "ceph-1",
              name: "First generation",
              moa: "Inhibit cell-wall synthesis.",
              spectrum: "Primarily susceptible Gram-positive organisms and selected Gram-negative organisms.",
              use: "Surgical prophylaxis, susceptible MSSA infections, skin and soft-tissue infections, and selected urinary infections.",
              contra: ["Serious relevant beta-lactam hypersensitivity is the precaution used for the cephalosporins that state it. Cross-reactivity depends on the allergy history and the side-chain."],
              adverse: ["Allergy", "Diarrhea", "Cytopenias", "Occasional neurotoxicity with excessive exposure"],
              renal: "often",
              renalText: "Renal adjustment is often necessary.",
              hepaticText: "No hepatic dose change is stated for this generation in the teaching bank.",
              rrtText: "An exact CRRT or SLED dose is not in this teaching bank. Verify the monograph.",
              monitor: "Renal function, allergy, CBC during prolonged treatment, and treatment response.",
              drugs: [
                {id:"cefazolin", name:"Cefazolin", dose:"1–2 g IV every 8 hours for many indications."},
                {id:"cephalexin", name:"Cephalexin", dose:"Commonly 500 mg orally every 6–12 hours, depending on indication."},
                {id:"cefadroxil", name:"Cefadroxil", dose:"No separate adult dose example is in this teaching bank. Verify the formulation and the indication.", notes:["Listed with the first-generation cephalosporins. The bank does not add a dose that was not supplied."]}
              ]
            },
            {
              id: "ceph-2",
              name: "Second generation",
              moa: "Inhibit cell-wall synthesis.",
              spectrum: "Varies by agent. Cephamycins such as cefoxitin and cefotetan have additional anaerobic activity.",
              contra: ["Serious relevant beta-lactam hypersensitivity."],
              adverse: ["Gastrointestinal symptoms", "Allergy", "Cytopenias", "Neurotoxicity with accumulation"],
              renal: "often",
              renalText: "Renal adjustment for many agents.",
              hepaticText: "No hepatic dose change is stated for this generation in the teaching bank.",
              rrtText: "An exact CRRT or SLED dose is not in this teaching bank. Verify the monograph.",
              monitor: "Renal function, CBC for prolonged therapy, and clinical response.",
              drugs: [
                {id:"cefuroxime", name:"Cefuroxime", dose:"Commonly 750 mg–1.5 g IV every 8 hours, depending on indication."},
                {id:"cefoxitin", name:"Cefoxitin", dose:"Commonly 1–2 g IV every 6–8 hours for selected indications.", notes:["A cephamycin, with additional anaerobic activity."]},
                {id:"cefotetan", name:"Cefotetan", dose:"No separate adult dose example is in this teaching bank. Verify the formulation and the indication.", notes:["A cephamycin, with additional anaerobic activity. The bank does not add a dose that was not supplied."]},
                {id:"cefaclor", name:"Cefaclor", dose:"No separate adult dose example is in this teaching bank. Verify the formulation and the indication.", notes:["Listed with the second-generation cephalosporins. The bank does not add a dose that was not supplied."]}
              ]
            },
            {
              id: "ceph-3",
              name: "Third generation",
              moa: "Inhibit bacterial cell-wall synthesis.",
              contra: [
                "Serious relevant beta-lactam hypersensitivity.",
                "Ceftriaxone: important neonatal contraindications and precautions involving IV calcium-containing solutions.",
                "Ceftazidime: neurotoxicity risk when dosing is excessive for renal function."
              ],
              adverse: ["Allergy", "Diarrhea", "Biliary complications with ceftriaxone", "Cytopenias", "Neurotoxicity"],
              renal: "required",
              renalText: "Cefotaxime and ceftazidime generally require renal adjustment. Ceftriaxone often does not require adjustment for isolated renal impairment at usual doses.",
              hepaticText: "Combined severe renal and hepatic dysfunction requires caution with ceftriaxone. No numeric hepatic dose is in this teaching bank.",
              rrtText: "An exact CRRT or SLED dose is not in this teaching bank. Verify the monograph. Ceftriaxone often does not require adjustment for isolated renal impairment at usual doses.",
              monitor: "Renal function, CBC during prolonged treatment, liver function when indicated, and neurological status in high-risk patients.",
              drugs: [
                {id:"ceftriaxone", name:"Ceftriaxone", dose:"1–2 g IV every 24 hours for many infections. Higher doses may be required for meningitis.", notes:["Spectrum in this bank: susceptible streptococci and many community-acquired Gram-negative organisms.","Often does not require adjustment for isolated renal impairment at usual doses. Combined severe renal and hepatic dysfunction requires caution.","Important neonatal contraindications and precautions involving IV calcium-containing solutions.","Biliary complications are a stated adverse effect."]},
                {id:"cefotaxime", name:"Cefotaxime", dose:"Commonly 1–2 g IV every 6–8 hours, depending on indication.", notes:["Broadly similar clinical role to ceftriaxone.","Generally requires renal adjustment."]},
                {id:"ceftazidime", name:"Ceftazidime", dose:"Commonly 2 g IV every 8 hours for severe susceptible infections, with indication-specific adjustments.", notes:["Antipseudomonal activity, but weaker Gram-positive activity than ceftriaxone.","Neurotoxicity risk when dosing is excessive for renal function.","Generally requires renal adjustment."]}
              ]
            },
            {
              id: "ceph-4",
              name: "Fourth generation",
              moa: "Inhibits cell-wall synthesis.",
              spectrum: "Broad Gram-negative coverage, including susceptible Pseudomonas aeruginosa, with useful Gram-positive activity.",
              contra: [
                "Serious relevant beta-lactam hypersensitivity.",
                "Renal impairment.",
                "Pre-existing neurological disease or encephalopathy increases concern for neurotoxicity."
              ],
              adverse: ["Cefepime-associated encephalopathy", "Myoclonus", "Seizures", "Hypersensitivity", "Cytopenias"],
              renal: "required",
              renalText: "Renal adjustment is essential. Reassess dosing when kidney function changes rapidly.",
              hepaticText: "No hepatic dose change is stated for cefepime in the teaching bank.",
              rrtText: "Renal adjustment is essential, including when clearance is replaced. An exact CRRT or SLED milligram dose is not in this teaching bank. Verify the monograph and reassess when kidney function changes.",
              monitor: "Renal function, mental status, seizure activity, CBC during prolonged therapy, and beta-lactam therapeutic drug monitoring where available.",
              pearl: "New encephalopathy or myoclonus during cefepime therapy should trigger an urgent review of renal clearance, dose, and alternative causes.",
              drugs: [
                {id:"cefepime", name:"Cefepime", dose:"Commonly 2 g IV every 8–12 hours, depending on infection and severity. Severe infections may require optimized infusion strategies.", notes:["New encephalopathy or myoclonus during therapy should trigger an urgent review of renal clearance, dose, and alternative causes."]}
              ]
            },
            {
              id: "ceph-5",
              name: "Fifth generation and advanced cephalosporins",
              moa: "Ceftaroline and ceftobiprole inhibit cell-wall synthesis and have activity against selected resistant Gram-positive organisms. Ceftazidime–avibactam pairs cell-wall inhibition with avibactam against selected serine beta-lactamases. Ceftolozane–tazobactam is an enhanced antipseudomonal beta-lactam plus a beta-lactamase inhibitor. Cefepime–enmetazobactam pairs cell-wall inhibition with enmetazobactam against selected beta-lactamases.",
              contra: ["Relevant beta-lactam hypersensitivity and formulation-specific contraindications."],
              adverse: ["Hypersensitivity", "Gastrointestinal symptoms", "Cytopenias", "Liver-test abnormalities", "Neurotoxicity when renal accumulation occurs"],
              renal: "required",
              renalText: "Renal adjustment is essential for most of these agents.",
              hepaticText: "Liver-test abnormalities are a stated adverse effect. No numeric hepatic dose reduction is in this teaching bank.",
              rrtText: "Renal adjustment is essential for most of these agents. An exact CRRT or SLED milligram dose is not in this teaching bank. Verify the monograph.",
              monitor: "Renal function, CBC, liver function as appropriate, clinical response, microbiology, and resistance emergence.",
              pearl: "These agents are not interchangeable. Availability and regulatory approval vary by country. Ceftaroline does not provide dependable antipseudomonal coverage. Ceftazidime–avibactam does not reliably treat NDM-producing organisms when used alone. Ceftolozane–tazobactam is not a universal treatment for CRE or CRAB.",
              drugs: [
                {id:"ceftaroline", name:"Ceftaroline", dose:"Commonly 600 mg IV every 12 hours for approved indications.", notes:["Does not provide dependable antipseudomonal coverage.","Activity against selected resistant Gram-positive organisms."]},
                {id:"ceftobiprole", name:"Ceftobiprole", dose:"No separate adult dose example is in this teaching bank. Verify the formulation, the indication, and whether it is approved where you practise.", notes:["Activity against selected resistant Gram-positive organisms. The bank does not add a dose that was not supplied."]},
                {id:"ceftaz-avi", name:"Ceftazidime–avibactam", dose:"2.5 g IV every 8 hours, infused over 2–3 hours according to the applicable regimen.", notes:["Does not reliably treat NDM-producing organisms when used alone.","Not interchangeable with the other agents in this group."]},
                {id:"ceftol-tazo", name:"Ceftolozane–tazobactam", dose:"1.5 g IV every 8 hours for complicated urinary infections. 3 g IV every 8 hours for selected severe indications.", notes:["Enhanced antipseudomonal beta-lactam plus beta-lactamase inhibitor.","Not a universal treatment for CRE or CRAB."]},
                {id:"cefepime-enmeta", name:"Cefepime–enmetazobactam", dose:"2.5 g IV every 8 hours, infused over 2 hours for its approved indication.", notes:["Enmetazobactam inhibits selected beta-lactamases. Approval varies by country."]}
              ]
            }
          ]
        }
      ]
    }
  ]
};
