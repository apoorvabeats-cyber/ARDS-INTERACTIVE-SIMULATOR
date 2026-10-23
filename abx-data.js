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
                {id:"pen-proc", name:"Procaine penicillin G", dose:"Intramuscular only. The supplied text did not give a number.", guideline:"US label example: 600,000 to 1,000,000 units deep IM daily for selected moderately severe pneumococcal, group A streptococcal, or staphylococcal infections. Primary, secondary, or latent syphilis with a negative spinal fluid: 600,000 units IM daily for 8 days. Never give this formulation intravenously or into an artery.", notes:["The bank did not invent this figure. It is the label example, kept separate from the supplied text.","Intramuscular only."]}
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
                {id:"cefadroxil", name:"Cefadroxil", dose:"The supplied text listed the drug and did not give a number.", guideline:"US monograph example: 1 g orally once daily, or in two divided doses, for pharyngitis, tonsillitis, and skin infection. Uncomplicated lower urinary infection: 1–2 g orally daily. Other urinary infections: 2 g daily in two doses. Creatinine clearance 25–50 mL/min: 1 g, then 500 mg every 12 hours. Clearance 10–25: 500 mg every 24 hours. Clearance under 10: 500 mg every 36 hours.", notes:["Guideline figure, not part of the supplied text."]}
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
                {id:"cefotetan", name:"Cefotetan", dose:"The supplied text listed the drug and did not give a number.", guideline:"US label example: 1–2 g IV or IM every 12 hours for many moderate infections. Life-threatening infection: 3 g IV every 12 hours. Maximum 6 g/day. Surgical prophylaxis: 1 or 2 g IV once, 30–60 minutes before surgery. It has no useful activity against Chlamydia.", notes:["A cephamycin, with additional anaerobic activity.","Guideline figure, not part of the supplied text."]},
                {id:"cefaclor", name:"Cefaclor", dose:"The supplied text listed the drug and did not give a number.", guideline:"US label example, immediate release: 250–500 mg orally every 8 hours. Extended-release 500 mg every 12 hours is clinically matched to immediate-release 250 mg every 8 hours, not to 500 mg every 8 hours.", notes:["Guideline figure, not part of the supplied text."]}
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
                {id:"ceftobiprole", name:"Ceftobiprole", dose:"The supplied text listed the drug and did not give a number.", guideline:"FDA Zevtera label, adults: 667 mg ceftobiprole medocaril sodium, equivalent to 500 mg ceftobiprole, IV over 2 hours. Staphylococcus aureus bacteraemia: every 6 hours on days 1–8, then every 8 hours. Skin infection or community-acquired pneumonia: every 8 hours. Creatinine clearance above 150 mL/min: every 6 hours. Clearance 30 to under 50, skin or pneumonia: every 12 hours. Clearance under 15, including haemodialysis: 333 mg every 24 hours, after dialysis on dialysis days.", notes:["Activity against selected resistant Gram-positive organisms.","Guideline figure, not part of the supplied text. Approval varies by country."]},
                {id:"ceftaz-avi", name:"Ceftazidime–avibactam", dose:"2.5 g IV every 8 hours, infused over 2–3 hours according to the applicable regimen.", notes:["Important for susceptible organisms producing selected serine beta-lactamases, including KPC and many OXA-48-like enzymes.","Does not reliably cover NDM when used alone.","Not interchangeable with the other agents in this group."]},
                {id:"ceftol-tazo", name:"Ceftolozane–tazobactam", dose:"1.5 g IV every 8 hours for complicated urinary infections. 3 g IV every 8 hours for selected severe indications.", notes:["Enhanced antipseudomonal beta-lactam plus beta-lactamase inhibitor.","Not a universal treatment for CRE or CRAB."]},
                {id:"cefepime-enmeta", name:"Cefepime–enmetazobactam", dose:"2.5 g IV every 8 hours, infused over 2 hours for its approved indication.", notes:["Enmetazobactam inhibits selected beta-lactamases. Approval varies by country."]}
              ]
            }
          ]
        },
        {
          id: "carbapenems",
          name: "Class 3. Carbapenems",
          subclasses: [
            {
              id: "carbapenems",
              name: "Carbapenems",
              moa: "Bind penicillin-binding proteins and inhibit bacterial cell-wall synthesis.",
              pharm: "Broad-spectrum, time-dependent bactericidal agents.",
              spectrum: "Meropenem and imipenem: broad Gram-positive, Gram-negative, and anaerobic coverage. Ertapenem lacks reliable activity against Pseudomonas aeruginosa, Acinetobacter species, and enterococci. Doripenem has antipseudomonal activity, but availability and recommended uses vary.",
              contra: [
                "Serious relevant beta-lactam hypersensitivity.",
                "Seizure disorders and renal impairment require careful selection and dosing.",
                "Carbapenems can markedly reduce valproate concentrations."
              ],
              adverse: [
                "Gastrointestinal symptoms",
                "Hypersensitivity",
                "Cytopenias",
                "Seizures, especially with imipenem accumulation",
                "Liver-test abnormalities"
              ],
              renal: "required",
              renalText: "Renal adjustment is required.",
              hepaticText: "Liver-test abnormalities are listed. No numeric hepatic dose reduction is in this teaching bank.",
              rrtText: "Renal adjustment is required, including when clearance is replaced. An exact CRRT or SLED milligram dose is not in this teaching bank. Verify the monograph.",
              monitor: "Renal function, mental status, seizure risk, CBC and liver function when indicated, cultures, and clinical response.",
              pearl: "Do not use a carbapenem merely because an organism is resistant to a narrower agent. Confirm the likely resistance mechanism and use the narrowest effective therapy.",
              drugs: [
                {id:"meropenem", name:"Meropenem", dose:"1 g IV every 8 hours for many severe infections. Indication-specific higher doses may be used.", notes:["Broad Gram-positive, Gram-negative, and anaerobic coverage.","The exact higher dose is not in this teaching bank.","Can markedly reduce valproate concentrations."]},
                {id:"imipenem", name:"Imipenem–cilastatin", dose:"Commonly 500 mg IV every 6 hours, depending on indication and formulation.", notes:["Broad Gram-positive, Gram-negative, and anaerobic coverage.","Seizures are a particular concern when imipenem accumulates.","Can markedly reduce valproate concentrations."]},
                {id:"ertapenem", name:"Ertapenem", dose:"1 g IV every 24 hours.", notes:["Lacks reliable activity against Pseudomonas aeruginosa, Acinetobacter species, and enterococci.","Can markedly reduce valproate concentrations."]},
                {id:"doripenem", name:"Doripenem", dose:"Historical regimens commonly use 500 mg IV every 8 hours. Current availability and approved indications must be verified.", notes:["Antipseudomonal activity, but availability and recommended uses vary.","Can markedly reduce valproate concentrations."]}
              ]
            }
          ]
        },
        {
          id: "monobactams",
          name: "Class 4. Monobactams",
          subclasses: [
            {
              id: "aztreonam",
              name: "Aztreonam",
              moa: "Binds primarily to PBP3 and inhibits Gram-negative bacterial cell-wall synthesis.",
              spectrum: "Aerobic Gram-negative organisms, including susceptible Pseudomonas. No reliable Gram-positive or anaerobic coverage.",
              contra: [
                "Serious hypersensitivity to aztreonam.",
                "Assess ceftazidime allergy carefully because the drugs share a side chain."
              ],
              adverse: ["Rash", "Liver-test abnormalities", "Gastrointestinal symptoms", "Occasional cytopenias"],
              renal: "required",
              renalText: "Renal adjustment is required.",
              hepaticText: "Liver-test abnormalities are listed. No numeric hepatic dose reduction is in this teaching bank.",
              rrtText: "Renal adjustment is required, including when clearance is replaced. An exact CRRT or SLED milligram dose is not in this teaching bank. Verify the monograph.",
              monitor: "Renal function, liver function when appropriate, cultures, and clinical response.",
              drugs: [
                {id:"aztreonam", name:"Aztreonam", dose:"Commonly 1–2 g IV every 8 hours for severe susceptible infections. The exact regimen depends on indication.", notes:["No reliable Gram-positive or anaerobic coverage.","Serious hypersensitivity to aztreonam is a contraindication. Ceftazidime allergy must be assessed because the drugs share a side chain."]}
              ]
            }
          ]
        },
        {
          id: "bli-class",
          name: "Class 5. Beta-lactamase inhibitors and combinations",
          subclasses: [
            {
              id: "inhibitors",
              name: "Beta-lactamase inhibitors",
              moa: "Inhibit selected beta-lactamases, protecting the accompanying beta-lactam from enzymatic degradation.",
              spectrum: "Inhibitors have different activity profiles. An inhibitor active against selected serine beta-lactamases may not inhibit metallo-beta-lactamases such as NDM.",
              contra: ["Use the contraindication of the accompanying beta-lactam. These inhibitors are not given alone in this teaching bank."],
              adverse: ["See the accompanying beta-lactam. No separate inhibitor adverse-effect list was supplied."],
              renal: "unstated",
              renalText: "These inhibitors are not dosed alone in this teaching bank. No separate renal milligram was supplied.",
              hepaticText: "No hepatic dose change for an inhibitor alone is stated in this teaching bank.",
              rrtText: "No CRRT or SLED dose for an inhibitor alone is in this teaching bank.",
              monitor: "Follow the accompanying combination: renal function, hypersensitivity, liver function when appropriate, CBC during prolonged treatment, infusion compatibility, culture results, and emerging resistance.",
              pearl: "An inhibitor active against selected serine beta-lactamases may not inhibit metallo-beta-lactamases such as NDM.",
              drugs: [
                {id:"clavulanate", name:"Clavulanate", dose:"Not administered alone in this teaching bank. See amoxicillin–clavulanate.", renalForce:false},
                {id:"sulbactam", name:"Sulbactam", dose:"Not administered alone in this teaching bank. See ampicillin–sulbactam and sulbactam–durlobactam.", renalForce:false},
                {id:"tazobactam", name:"Tazobactam", dose:"Not administered alone in this teaching bank. See piperacillin–tazobactam and ceftolozane–tazobactam.", renalForce:false},
                {id:"avibactam", name:"Avibactam", dose:"Not administered alone in this teaching bank. See ceftazidime–avibactam. Aztreonam–avibactam has no separate milligram in this bank.", renalForce:false},
                {id:"vaborbactam", name:"Vaborbactam", dose:"Not administered alone in this teaching bank. See meropenem–vaborbactam.", renalForce:false},
                {id:"relebactam", name:"Relebactam", dose:"Not administered alone in this teaching bank. See imipenem–cilastatin–relebactam.", renalForce:false},
                {id:"durlobactam", name:"Durlobactam", dose:"Not administered alone in this teaching bank. See sulbactam–durlobactam.", renalForce:false},
                {id:"enmetazobactam", name:"Enmetazobactam", dose:"Not administered alone in this teaching bank. See cefepime–enmetazobactam.", renalForce:false}
              ]
            },
            {
              id: "inhibitor-combinations",
              name: "Important combinations",
              moa: "The inhibitor protects the accompanying beta-lactam from selected beta-lactamases. Activity depends on which inhibitor is used.",
              spectrum: "Ceftazidime–avibactam covers selected serine beta-lactamases, including KPC and many OXA-48-like enzymes, and does not reliably cover NDM alone. Meropenem–vaborbactam includes KPC when susceptible and is not dependable for NDM or OXA-48-like carbapenemases. Imipenem–cilastatin–relebactam covers selected serine beta-lactamases and is not a universal metallo-beta-lactamase treatment. Sulbactam–durlobactam is for susceptible Acinetobacter baumannii complex. Aztreonam–avibactam is designed for selected resistant Gram-negative organisms, including some metallo-beta-lactamase producers.",
              contra: [
                "Use the contraindication of the beta-lactam in the combination.",
                "Aztreonam–avibactam: do not assume availability or approval in every jurisdiction."
              ],
              adverse: ["See the accompanying beta-lactam. Hypersensitivity remains a class concern."],
              renal: "selected",
              renalText: "Renal adjustment is stated for sulbactam–durlobactam. The other new combinations do not have a reduced milligram in this teaching bank.",
              hepaticText: "No numeric hepatic dose reduction is stated for these combinations in the teaching bank.",
              rrtText: "An exact CRRT or SLED milligram dose is not in this teaching bank. Verify the monograph and, for aztreonam–avibactam, the local product information.",
              monitor: "Renal function, hypersensitivity, liver function when appropriate, CBC during prolonged treatment, infusion compatibility, culture results, and emerging resistance.",
              pearl: "Ceftazidime–avibactam is filed with the cephalosporins. Its teaching regimen is 2.5 g IV every 8 hours over 2–3 hours. It is important for susceptible KPC and many OXA-48-like enzymes, and it does not reliably cover NDM when used alone. These combinations are not interchangeable.",
              drugs: [
                {id:"mero-vabor", name:"Meropenem–vaborbactam", dose:"4 g IV every 8 hours, infused over 3 hours, for the appropriate indication.", renalForce:false, notes:["Activity includes KPC-producing organisms when susceptible.","Not a dependable treatment for NDM or OXA-48-like carbapenemases.","The meropenem component can markedly reduce valproate concentrations. No reduced renal milligram is in this bank."]},
                {id:"imi-rele", name:"Imipenem–cilastatin–relebactam", dose:"1.25 g IV every 6 hours for the appropriate indication.", renalForce:false, notes:["Activity against selected serine beta-lactamase-producing organisms.","Not a universal solution for metallo-beta-lactamase-producing organisms.","The imipenem component carries the seizure concern when imipenem accumulates. It can also reduce valproate concentrations. No reduced renal milligram is in this bank."]},
                {id:"sul-dur", name:"Sulbactam–durlobactam", dose:"1 g sulbactam plus 1 g durlobactam IV every 6 hours, infused over 3 hours, with renal adjustment.", notes:["Specifically important for susceptible Acinetobacter baumannii complex infections.","Must be used with the recommended accompanying therapy. That accompanying drug is not named in this bank.","No reduced milligram for renal impairment is in this bank."]},
                {id:"azt-avi", name:"Aztreonam–avibactam", dose:"The supplied text said to follow local product information and did not give a number.", renalForce:false, guideline:"FDA Emblaveo label for complicated intra-abdominal infection, with metronidazole, creatinine clearance above 50 mL/min: load 2.67 g (aztreonam 2 g plus avibactam 0.67 g), then 2 g (aztreonam 1.5 g plus avibactam 0.5 g) every 6 hours, each infused over 3 hours, for 5–14 days. Clearance above 30 to 50: same load, then 1 g every 6 hours. Clearance above 15 to 30: load 1.8 g, then 0.9 g every 8 hours. Clearance 15 or below, including haemodialysis: load 1.33 g, then 0.9 g every 12 hours, after dialysis on dialysis days. Do not copy the plain aztreonam dose onto this product.", notes:["Designed for selected resistant Gram-negative organisms, including some metallo-beta-lactamase producers.","Do not assume availability or approval in every jurisdiction.","Guideline figure for one approved indication. It is not a dose for every NDM infection."]}
              ]
            }
          ]
        }
      ]
    },
    {
      id: "aminoglycoside",
      name: "Aminoglycosides",
      groups: [
        {
          id: "aminoglycosides",
          name: "Class 6. Aminoglycosides",
          subclasses: [
            {
              id: "aminoglycosides",
              name: "Aminoglycosides",
              moa: "Bind the 30S ribosomal subunit, causing misreading of mRNA and inhibition of protein synthesis.",
              pharm: "Concentration-dependent bactericidal activity, with a post-antibiotic effect. Predominantly renal elimination. Limited activity against anaerobes. Poor CSF penetration.",
              contra: [
                "Serious hypersensitivity.",
                "Myasthenia gravis and other conditions in which neuromuscular blockade is hazardous.",
                "Significant renal impairment requires individualized dosing.",
                "Pregnancy requires careful risk–benefit assessment."
              ],
              adverse: [
                "Acute kidney injury",
                "Cochlear and vestibular toxicity",
                "Neuromuscular blockade",
                "Electrolyte disturbances",
                "Rare hypersensitivity"
              ],
              renal: "required",
              renalText: "Use renal function, weight, dosing strategy, and measured drug concentrations. Do not simply apply a fixed daily dose in renal failure.",
              hepaticText: "No hepatic dose change is stated for the aminoglycosides in this teaching bank.",
              rrtText: "Do not simply apply a fixed daily dose when clearance is replaced. An exact CRRT or SLED milligram dose is not in this teaching bank. Use the selected protocol and measured concentrations.",
              monitor: "Baseline and serial creatinine, urine output, serum drug concentrations according to the selected protocol, hearing and vestibular symptoms during prolonged therapy, and electrolytes during extended courses.",
              pearl: "Avoid prolonged aminoglycoside exposure when a less toxic, equally effective alternative is available. These doses are not interchangeable across indications or dosing protocols.",
              drugs: [
                {id:"amikacin", name:"Amikacin", dose:"Commonly 15–20 mg/kg IV per dose for selected infections. The interval is determined by renal function and drug-level monitoring.", notes:["Not interchangeable with the gentamicin or tobramycin example.","Poor CSF penetration. Limited activity against anaerobes."]},
                {id:"gentamicin", name:"Gentamicin", dose:"Extended-interval regimens commonly use 5–7 mg/kg IV for selected indications.", notes:["Not interchangeable with another indication or another aminoglycoside protocol.","Poor CSF penetration. Limited activity against anaerobes."]},
                {id:"tobramycin", name:"Tobramycin", dose:"Commonly 5–7 mg/kg IV for selected indications.", notes:["Not interchangeable with the amikacin example or with a different protocol.","Poor CSF penetration. Limited activity against anaerobes."]},
                {id:"streptomycin", name:"Streptomycin", dose:"The supplied text listed the drug and did not give a number.", guideline:"WHO drug-resistant tuberculosis handbook example: 15 mg/kg IM once daily, maximum generally 1 g. Age over 59 years: 10 mg/kg, maximum 750 mg. In renal failure, 12–15 mg/kg two or three times a week, not every day. Follow concentrations when possible.", notes:["Guideline figure for tuberculosis, not part of the supplied text.","Do not copy the gentamicin or amikacin example onto streptomycin."]},
                {id:"plazomicin", name:"Plazomicin", dose:"The supplied text said weight-based dosing with renal adjustment and did not give a number.", guideline:"FDA Zemdri label, complicated urinary infection including pyelonephritis, when alternatives are limited: 15 mg/kg IV over 30 minutes every 24 hours if creatinine clearance is at least 60 mL/min, for 4–7 days. Clearance 30 to under 60: 10 mg/kg every 24 hours. Clearance 15 to under 30: 10 mg/kg every 48 hours. If clearance is under 90, keep the trough under 3 mcg/mL. The label has insufficient information for clearance under 15 mL/min, haemodialysis, or CRRT.", notes:["Do not copy the amikacin, gentamicin, or tobramycin milligram onto plazomicin.","Guideline figure, not part of the supplied text."]}
              ]
            }
          ]
        }
      ]
    },
    {
      id: "glycopeptide",
      name: "Glycopeptides and lipoglycopeptides",
      groups: [
        {
          id: "glycopeptides",
          name: "Class 7. Glycopeptides",
          subclasses: [
            {
              id: "glycopeptides",
              name: "Glycopeptides",
              moa: "Bind D-Ala-D-Ala termini of cell-wall precursors and inhibit peptidoglycan synthesis.",
              spectrum: "Gram-positive organisms, including susceptible MRSA. No meaningful Gram-negative activity.",
              contra: [
                "Serious hypersensitivity.",
                "Renal impairment.",
                "Previous vancomycin-associated kidney injury.",
                "Infusion reactions with rapid vancomycin administration."
              ],
              adverse: [
                "Nephrotoxicity",
                "Infusion-related flushing and hypotension",
                "Neutropenia during prolonged therapy",
                "Rare ototoxicity",
                "Thrombocytopenia, particularly with teicoplanin"
              ],
              renal: "required",
              renalText: "Renal function and measured concentrations are essential for individualized maintenance dosing.",
              hepaticText: "No hepatic dose change is stated for the glycopeptides in the supplied text.",
              rrtText: "Maintenance dosing follows clearance and measured concentrations. The ASHP/IDSA 2020 vancomycin example for conventional CRRT, effluent 20–25 mL/kg/h, is a 20–25 mg/kg load then 7.5–10 mg/kg every 12 hours. No SLED milligram is in that excerpt. Teicoplanin has no CRRT milligram in this bank.",
              monitor: "Vancomycin AUC-guided monitoring when indicated and available. Creatinine and urine output. CBC during prolonged treatment. Clinical response and microbiological clearance.",
              pearl: "Vancomycin exposure should be optimized to balance efficacy and kidney toxicity. A trough concentration alone may not adequately characterize exposure in every patient.",
              drugs: [
                {id:"vancomycin", name:"Vancomycin", dose:"IV loading and maintenance doses should be individualized by actual body weight, renal function, infection severity, and exposure monitoring.", guideline:"ASHP/IDSA/PIDS/SIDP 2020, serious MRSA, assuming a broth-microdilution MIC of 1 mg/L: 15–20 mg/kg actual body weight IV every 8–12 hours for most adults with normal renal function. Critically ill loading dose 20–35 mg/kg. Target AUC24/MIC 400–600, preferably checked in the first 24–48 hours. A trough alone may not describe exposure. Conventional CRRT at an effluent rate of 20–25 mL/kg/h: load 20–25 mg/kg, then 7.5–10 mg/kg every 12 hours. Guideline example, not a prescription.", notes:["No meaningful Gram-negative activity.","Infuse slowly enough to avoid flushing and hypotension."]},
                {id:"teicoplanin", name:"Teicoplanin", dose:"Loading doses followed by maintenance therapy according to indication and renal function.", guideline:"BNF adult example. Serious Gram-positive infection: 6 mg/kg every 12 hours for 3 doses, then 6 mg/kg once daily. Streptococcal or enterococcal endocarditis, and bone or joint infection: 12 mg/kg every 12 hours for 3–5 doses, then 12 mg/kg once daily. Renal impairment changes the maintenance interval. Guideline example, not a prescription.", notes:["Thrombocytopenia is a particular concern with teicoplanin.","No meaningful Gram-negative activity.","No CRRT milligram is added."]}
              ]
            }
          ]
        }
      ]
    }
  ]
};
