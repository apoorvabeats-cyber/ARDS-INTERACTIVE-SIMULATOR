/* MICRO infection: organism-specific 7-stage host-cell infection simulation, a pure function of time.
   Stages: adherence, colonisation, invasion, toxin production, immune evasion, cell injury, inflammatory response.
   Schematic teaching animation. Depends on three.js r128, micro/organisms.js. */
(function () {
  'use strict';
  const T = THREE, M = (window.MICRO = window.MICRO || {}), G = M.gx, V = (x, y, z) => new T.Vector3(x, y, z);
  const D = 4.6, NST = 7, DUR = D * NST;
  const STAGES = ['Adherence', 'Colonisation', 'Invasion', 'Toxin production', 'Immune evasion', 'Cell injury', 'Inflammatory response'];

  /* visual profile per organism */
  const PROF = {
    sa: { adh: 'adh', col: 'cluster', inv: 'enter', tox: 'pore', tc: 0xffd24a, ev: 'burst', inj: 'lyse', nm: { adh: 'MSCRAMM adhesins', inv: 'Host-cell entry', tox: 'α-toxin pores', inj: 'Cell lysis', ev: 'Leukocidin kills the phagocyte' } },
    mrsa: { adh: 'adh', col: 'cluster', inv: 'enter', tox: 'pore', tc: 0xffd24a, ev: 'burst', inj: 'lyse', nm: { adh: 'MSCRAMM adhesins', inv: 'Host-cell entry', tox: 'α-toxin pores', inj: 'Cell lysis', ev: 'Leukocidin kills the phagocyte' } },
    ef: { adh: 'adh', col: 'chain', inv: 'junction', tox: 'pore', tc: 0xffb36b, ev: 'engulf', inj: 'pore', nm: { adh: 'Aggregation substance, Ace', inv: 'Translocation', tox: 'Cytolysin', inj: 'Membrane damage', ev: 'Survives inside the phagocyte' } },
    vre: { adh: 'adh', col: 'chain', inv: 'junction', tox: 'pore', tc: 0xffb36b, ev: 'engulf', inj: 'pore', nm: { adh: 'Aggregation substance, Ace', inv: 'Translocation', tox: 'Cytolysin', inj: 'Membrane damage', ev: 'Survives inside the phagocyte' } },
    sp: { adh: 'adh', col: 'cluster', inv: 'junction', tox: 'pore', tc: 0x7fc8ff, ev: 'bounce', inj: 'lyse', nm: { adh: 'Choline-binding proteins', inv: 'Spread into alveoli', tox: 'Pneumolysin pores', inj: 'Cell lysis', ev: 'Capsule blocks phagocytosis' } },
    ec: { adh: 'fimb', col: 'micro', inv: 'enter', tox: 'pore', tc: 0xff9a8a, ev: 'blocked', inj: 'detach', nm: { adh: 'Type 1 fimbriae (FimH)', inv: 'Intracellular community', tox: 'α-hemolysin', inj: 'Cell exfoliation', ev: 'Hidden inside the host cell' } },
    kp: { adh: 'fimb', col: 'biofilm', inv: 'none', tox: 'endo', tc: 0xff7aa8, ev: 'bounce', inj: 'necro', nm: { adh: 'Type 1 / 3 fimbriae', inv: 'Mostly extracellular', tox: 'LPS (endotoxin)', inj: 'Tissue necrosis', ev: 'Capsule blocks phagocytosis' } },
    pa: { adh: 'pili', col: 'biofilm', inv: 'needle', tox: 'secrete', tc: 0x7dffb0, ev: 'stuck', inj: 'necro', nm: { adh: 'Type IV pili', inv: 'Type III secretion system', tox: 'Exotoxin A, pyocyanin', inj: 'Necrosis (ExoU)', ev: 'Biofilm matrix shields the cells' } },
    ab: { adh: 'pili', col: 'biofilm', inv: 'none', tox: 'vesicle', tc: 0xc8b4ff, ev: 'stuck', inj: 'apopt', nm: { adh: 'Type IV and Csu pili, OmpA', inv: 'Limited invasion', tox: 'Outer-membrane vesicles', inj: 'Apoptosis', ev: 'Biofilm and capsule' } },
    en: { adh: 'fimb', col: 'biofilm', inv: 'none', tox: 'endo', tc: 0xffb36b, ev: 'stuck', inj: 'necro', nm: { adh: 'Fimbriae', inv: 'Extracellular', tox: 'LPS (endotoxin)', inj: 'Endothelial injury', ev: 'Biofilm on devices' } },
    sm: { adh: 'fimb', col: 'biofilm', inv: 'enter', tox: 'pore', tc: 0xff6a5e, ev: 'stuck', inj: 'lyse', nm: { adh: 'Fimbriae', inv: 'Host-cell entry', tox: 'ShlA hemolysin', inj: 'Cell lysis', ev: 'Biofilm' } },
    cd: { adh: 'adh', col: 'micro', inv: 'none', tox: 'secrete', tc: 0xd8b4ff, ev: 'stuck', inj: 'round', nm: { adh: 'Surface-layer proteins', inv: 'Lumen only', tox: 'Toxin A and B', inj: 'Cell rounding', ev: 'Spores persist' } },
    bf: { adh: 'fimb', col: 'micro', inv: 'junction', tox: 'secrete', tc: 0xf0a0e0, ev: 'bounce', inj: 'detach', nm: { adh: 'Fimbriae, capsule', inv: 'Escape through breach', tox: 'B. fragilis toxin', inj: 'E-cadherin cleavage', ev: 'Polysaccharide capsule' } },
    mp: { adh: 'tip', col: 'micro', inv: 'none', tox: 'ox', tc: 0x9ad8ff, ev: 'bounce', inj: 'pore', nm: { adh: 'P1 adhesin (tip)', inv: 'Extracellular', tox: 'CARDS toxin, H₂O₂', inj: 'Cilia lost', ev: 'No wall, antigenic variation' } },
    lp: { adh: 'pili', col: 'none', inv: 'vacuole', tox: 'secrete', tc: 0x8fc8ff, ev: 'blocked', inj: 'lyse', nm: { adh: 'Pili and adhesins', inv: 'Phagocytosis by macrophage', tox: 'Dot/Icm effectors', inj: 'Cell lysis', ev: 'Phagosome-lysosome fusion blocked' } },
    cp: { adh: 'adh', col: 'none', inv: 'vacuole', tox: 'secrete', tc: 0xc8b4ff, ev: 'blocked', inj: 'lyse', nm: { adh: 'MOMP, adhesins', inv: 'Inclusion formation', tox: 'Type III effectors', inj: 'Cell lysis', ev: 'Hidden in the inclusion' } },
    ca: { adh: 'adh', col: 'biofilm', inv: 'enter', tox: 'pore', tc: 0xffc8a0, ev: 'stuck', inj: 'necro', nm: { adh: 'Als3, Hwp1', inv: 'Hyphal penetration', tox: 'Candidalysin', inj: 'Necrosis', ev: 'Biofilm and β-glucan masking' } },
    af: { adh: 'adh', col: 'micro', inv: 'enter', tox: 'secrete', tc: 0xa8e0b0, ev: 'bounce', inj: 'necro', up: 1, nm: { adh: 'Conidial adhesion', inv: 'Hyphal invasion', tox: 'Gliotoxin', inj: 'Infarction / necrosis', ev: 'Hyphae too large to engulf' } },
    tb: { adh: 'adh', col: 'none', inv: 'vacuole', tox: 'pore', tc: 0xffa0b8, ev: 'blocked', inj: 'necro', nm: { adh: 'Macrophage receptors', inv: 'Phagocytosis', tox: 'ESX-1 / ESAT-6', inj: 'Necrosis', ev: 'Phagosome-lysosome fusion blocked' } }
  };
  const TXT = {
    sa: ['Surface adhesins (MSCRAMMs such as fibronectin-binding proteins and clumping factor) bind fibronectin and fibrinogen on damaged tissue and devices.', 'Cocci divide into grape-like clusters. On tissue and devices they can form a biofilm held in an extracellular matrix.', 'Some isolates enter host cells through fibronectin-binding proteins and integrins and persist inside; others stay outside and spread with enzymes such as hyaluronidase.', 'α-toxin forms heptameric pores in host membranes. Panton-Valentine leukocidin, enterotoxins and TSST-1 act in some strains.', 'Protein A binds the Fc part of IgG so antibodies cannot opsonise the cell. Leukocidins kill phagocytes and the golden pigment resists oxidative killing.', 'Pores let ions and water in; the host cell swells and lyses, releasing its contents and danger signals.', 'IL-1, TNF-α and IL-8 recruit neutrophils. The typical result is pus and an abscess walled in by fibrin.'],
    mrsa: ['Surface adhesins (MSCRAMMs) bind fibronectin and fibrinogen; MRSA colonises nares, skin and devices.', 'Clusters and biofilm form as in other S. aureus. The difference is the drug target: PBP2a makes the wall resistant to most β-lactams.', 'Some cells enter host cells; others stay outside and spread with tissue-degrading enzymes.', 'α-toxin pores and, in community strains, Panton-Valentine leukocidin damage cells and kill neutrophils.', 'Protein A blocks antibody function; leukocidins and pigment defeat phagocytes.', 'Membrane pores cause swelling and lysis of host cells.', 'Neutrophil-rich inflammation produces abscesses; standard β-lactams will not treat it because of PBP2a.'],
    ef: ['Adhesins such as aggregation substance and Ace bind epithelium, collagen and urinary catheters.', 'Pairs and short chains colonise the gut, urinary tract and catheters; E. faecalis forms biofilm on devices.', 'Mostly extracellular. In very sick or immunosuppressed patients they translocate across the gut wall into blood and the biliary tract.', 'Cytolysin (E. faecalis) lyses host cells and red cells; gelatinase and other proteases damage tissue.', 'They survive for a time inside macrophages; the thick wall and biofilm add protection. Low virulence depends on host impairment.', 'Cytolysin and proteases injure local cells; on a damaged valve, endocarditis vegetations can form.', 'A mixed neutrophil response. In endocarditis a vegetation of platelets and fibrin shields the organisms from immune cells.'],
    vre: ['Adhesins such as aggregation substance and Ace bind epithelium and catheters; colonisation of the gut is common in hospital patients.', 'Chains and biofilm form on devices. VRE colonisation of the gut is the reservoir for infection.', 'Mostly extracellular; translocation from the gut occurs in very sick patients.', 'Cytolysin (some E. faecalis) and proteases injure cells.', 'The thick wall and biofilm resist phagocytic killing; resistance is the separate issue: D-Ala-D-Lac precursors defeat vancomycin.', 'Cytolysin and proteases injure local cells.', 'A mixed neutrophil response. Treatment is the problem: vancomycin cannot bind the altered precursors.'],
    sp: ['Choline-binding proteins and pneumococcal surface proteins bind nasopharyngeal epithelium; colonisation often follows a viral infection.', 'Diplococci colonise the nasopharynx, where the capsule helps them evade mucus clearance.', 'When defences fail they spread to the lungs, sinuses, ear or blood; crossing the blood-brain barrier causes meningitis.', 'Pneumolysin forms large pores in cholesterol-containing membranes and activates complement; hydrogen peroxide also damages cells.', 'The polysaccharide capsule blocks complement deposition and phagocytosis; IgA protease cleaves mucosal antibodies.', 'Pneumolysin and peroxide injure alveolar epithelium and endothelium, causing fluid leak into the alveoli.', 'Neutrophils fill the alveoli (consolidation). Cell-wall fragments are strong inflammatory signals through TLR2 and NOD2.'],
    ec: ['Type 1 fimbriae (FimH) bind mannose on bladder cells; P fimbriae bind receptors in the kidney. (Uropathogenic E. coli shown.)', 'Microcolonies form on the bladder surface and can ascend toward the kidneys; flagella help the ascent.', 'Bacteria invade bladder cells and form intracellular bacterial communities that avoid antibiotics and immune cells.', 'α-hemolysin forms pores and cytotoxic necrotising factor 1 activates Rho GTPases; LPS acts as endotoxin.', 'K1 capsule and O antigen resist complement; bacteria inside cells are out of reach of neutrophils.', 'Pore-forming toxins and invasion cause shedding (exfoliation) of the bladder cells.', 'LPS binds TLR4 and drives IL-6, IL-8 and TNF. Neutrophils fill the urine (pyuria); sepsis may follow.'],
    kp: ['Type 1 and type 3 fimbriae and other adhesins bind respiratory epithelium, bladder and catheters.', 'Mucoid microcolonies and biofilm form; the thick capsule gives the sticky colonies seen on plates.', 'Mostly extracellular. Hypervirulent strains spread through the blood to liver, eye and brain.', 'No single dominant toxin: LPS (endotoxin), siderophores (aerobactin, yersiniabactin) and, in some strains, colibactin.', 'The thick capsule blocks complement and phagocytosis; siderophores take iron from the host.', 'Neutrophil products, endotoxin and lack of oxygen cause tissue necrosis; lung or liver abscess can follow.', 'Dense neutrophil exudate. Endotoxin drives septic shock; thick bloody sputum is a classic feature.'],
    pa: ['Type IV pili and flagella bind airway epithelium, especially injured or cystic fibrosis epithelium, and ventilator tubing.', 'The colony becomes a biofilm: cells in an alginate, Psl and Pel matrix under quorum-sensing control.', 'A type III secretion system injects ExoS, ExoT, ExoU and ExoY directly into host cells; elastase opens tight junctions.', 'Exotoxin A blocks protein synthesis (EF-2 ADP-ribosylation); pyocyanin generates reactive oxygen; elastase and phospholipase C damage tissue.', 'The biofilm matrix and alginate shield the bacteria from phagocytes and antibiotics; ExoU kills phagocytes.', 'ExoU (a phospholipase) causes rapid necrosis; exotoxin A halts protein synthesis and cells die.', 'Intense neutrophil influx. Neutrophil elastase and DNA thicken mucus and worsen airway obstruction.'],
    ab: ['Type IV pili, Csu pili and OmpA attach to epithelium and to plastic such as endotracheal tubes.', 'Survives on dry surfaces and forms biofilm on devices; colonises tracheostomies and wounds.', 'OmpA helps entry into epithelial cells; invasion is limited, but bloodstream spread occurs in ICU patients.', 'OmpA induces apoptosis of host cells; outer-membrane vesicles carry toxins and LPS.', 'Biofilm and a capsule resist complement and drying; drug resistance helps it persist.', 'OmpA, vesicles and LPS drive epithelial apoptosis and loss of the barrier.', 'TLR4 signalling drives cytokines and neutrophils into the alveoli, as in ventilator-associated pneumonia.'],
    en: ['Fimbriae and adhesins bind mucosa and device surfaces.', 'Biofilm forms on catheters and endotracheal tubes; gut colonisation often comes first.', 'Mostly extracellular; the bloodstream is reached through devices or the gut.', 'LPS endotoxin is the main toxin; some strains make cytotoxins.', 'Biofilm helps persistence, and chromosomal AmpC can be switched on during β-lactam therapy.', 'Endotoxin and neutrophil products injure the endothelium.', 'LPS-TLR4 signalling releases TNF and IL-1; sepsis may follow bloodstream infection.'],
    sm: ['Fimbriae and adhesins bind moist surfaces and catheters; some strains make the red pigment prodigiosin.', 'Biofilm forms on catheters, ventilator equipment and in moist ICU reservoirs.', 'The ShlA hemolysin helps entry into cells.', 'ShlA (a pore-forming hemolysin), proteases and LPS damage tissue.', 'Biofilm and the pigment help persistence; the organism is intrinsically resistant to colistin.', 'Hemolysin damages cell membranes and can cause tissue necrosis.', 'Neutrophil recruitment and endotoxin-driven cytokines; outbreaks occur in ICUs and neonatal units.'],
    cd: ['Spores germinate in the colon when bile acids and a disturbed microbiome allow it; vegetative cells attach through surface-layer proteins and adhesins.', 'Without competition from normal flora, they multiply in the colonic lumen.', 'They do not invade. Damage is done by toxins from the lumen.', 'Toxin A (TcdA) and toxin B (TcdB) glucosylate Rho GTPases and collapse the actin cytoskeleton; some strains make binary toxin.', 'Spores resist alcohol and antibiotics and re-seed the gut after treatment, so relapse occurs.', 'Cells round up and detach as tight junctions open; fluid leaks into the lumen, causing diarrhoea.', 'Neutrophils flood the mucosa; fibrin, mucus and dead cells form pseudomembranes in severe colitis.'],
    bf: ['Fimbriae and a capsule help attach to the gut mucosa; the organism is normally a commensal.', 'In the normal colon it is harmless. After perforation or surgery it spreads into the peritoneum and causes polymicrobial infection.', 'It escapes into the peritoneal cavity and blood when the gut wall is breached.', 'The B. fragilis toxin (enterotoxigenic strains) cleaves E-cadherin. The capsular polysaccharide A drives abscess formation.', 'The polysaccharide capsule resists phagocytosis and complement.', 'Tight junctions open and epithelial cells detach.', 'Abscess formation: neutrophils wall off the bacteria with fibrin. Drainage of the abscess is essential.'],
    mp: ['A tip organelle with the P1 adhesin binds sialylated receptors on ciliated airway epithelium.', 'Attached cells stay on the airway surface and slow ciliary beating.', 'It remains extracellular and rarely enters cells.', 'CARDS toxin (ADP-ribosylating) and hydrogen peroxide damage the epithelium.', 'There is no cell wall to detect; antigenic variation of P1 and host-like antigens reduce recognition.', 'Cilia are lost and epithelium is injured, producing the typical dry cough.', 'A mostly lymphocytic and macrophage response around bronchioles; immune-mediated effects outside the lung occur.'],
    lp: ['Inhaled aerosol droplets from contaminated water reach the alveoli; pili and adhesins attach to alveolar macrophages.', 'It does not multiply on the surface: it is taken up by macrophages.', 'Macrophages engulf it by coiling phagocytosis. Inside the cell it assembles the Dot/Icm type IV secretion system.', 'Dot/Icm injects more than 300 effector proteins that reprogram the vacuole.', 'It blocks phagosome-lysosome fusion and builds an ER-like vacuole where it multiplies safely.', 'After replication, the infected macrophage lyses and releases bacteria to infect neighbours.', 'Neutrophils and macrophages fill the alveoli: severe pneumonia, often with hyponatraemia and multi-organ involvement.'],
    cp: ['Infectious elementary bodies attach to respiratory epithelium (MOMP and adhesins) and are taken up by endocytosis.', 'Inside a vacuole (the inclusion), elementary bodies convert to dividing reticulate bodies.', 'A type III secretion system injects effectors (for example TarP and Inc proteins) that remodel actin and the inclusion membrane.', 'No classical toxin. Chlamydial effectors and heat-shock protein 60 are pro-inflammatory.', 'The organism stays hidden within the inclusion, blocking lysosome fusion and apoptosis.', 'Reticulate bodies reconvert to elementary bodies; the host cell lyses or the inclusion is extruded.', 'Chronic, lymphocyte-predominant inflammation; atypical pneumonia and bronchitis.'],
    ca: ['Adhesins such as Als3 and Hwp1 bind epithelium and catheter plastic; yeast cells attach first.', 'Biofilm forms: yeast, pseudohyphae and hyphae embedded in a matrix, common on central lines.', 'Hyphae enter by induced endocytosis (Als3, Ssa1) and active penetration.', 'Candidalysin, a peptide toxin released from hyphae, damages epithelial membranes.', 'Switching between yeast and hyphae, masking of β-glucan and the biofilm matrix reduce immune recognition.', 'Candidalysin forms pores; cells die and hyphae reach deeper tissue.', 'Neutrophils and Th17 cells respond. In immunocompromised patients the infection reaches blood and organs.'],
    af: ['Inhaled conidia (2 to 3 μm) reach the alveoli and stick to epithelium and extracellular matrix.', 'In neutropenia or after steroids, conidia swell and germinate into hyphae in the lung.', 'Hyphae invade tissue and blood vessels (angio-invasion), causing thrombosis and infarction.', 'Gliotoxin and other secondary metabolites suppress immune cells; proteases degrade tissue.', 'Dormant conidia hide β-glucan with melanin; hyphae are too large for phagocytes to engulf.', 'Vessel invasion causes infarction and haemorrhage; the CT halo sign marks early disease.', 'Neutrophils are the key defence; when they are absent or impaired the response fails and disease spreads.'],
    tb: ['Inhaled droplet nuclei reach the alveoli, where bacilli bind macrophage receptors (mannose and complement receptors).', 'Bacilli are taken up by alveolar macrophages rather than growing on the surface.', 'Inside the phagosome the ESX-1 secretion system damages the membrane; bacilli replicate within the macrophage.', 'There is no classical toxin. Cord factor and ESX-1 effectors (ESAT-6) injure membranes and trigger host damage.', 'The organism blocks phagosome-lysosome fusion; its waxy wall resists killing and bacilli can persist for years.', 'Infected macrophages die by necrosis; the host response forms caseating necrosis.', 'A granuloma of macrophages, epithelioid and giant cells ringed by lymphocytes contains the infection; breakdown causes cavities.']
  };

  /* ------------------------------------------------------------ helpers */
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const surfY = (x, z) => -2.2 + 2.6 * Math.sqrt(Math.max(0, 1 - (x / 6.2) * (x / 6.2) - (z / 4) * (z / 4)));
  const SLOTS = [[-1.6, .5], [1.7, -.7], [-.1, 1.7], [2.9, 1.1], [-3.1, -1.1], [.5, -2], [3.6, -1.7], [-1.3, -1], [-3.7, 1.3]];
  const mk = (geo, col, o) => new T.Mesh(geo, new T.MeshStandardMaterial(Object.assign({ color: col, roughness: .5 }, o || {})));
  const glassM = (c, op) => new T.MeshStandardMaterial({ color: c, roughness: .2, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide });
  const Y = V(0, 1, 0);

  function Sim(orgId, scene) {
    const P = PROF[orgId] || PROF.pa, root = new T.Group(); scene.add(root); const rr = G.rngf(31);
    const N = { cluster: 4, chain: 5, biofilm: 8, micro: 6, none: 3 }[P.col] || 5, intra = P.inv === 'vacuole', nb = intra ? 3 : N;
    /* host cell */
    const host = new T.Group(); root.add(host);
    const hm = new T.Mesh(new T.SphereGeometry(1, 40, 28), new T.MeshStandardMaterial({ color: 0xf0c3b4, roughness: .55, transparent: true, opacity: .55, depthWrite: false })); hm.scale.set(6.2, 2.6, 4); hm.position.y = -2.2; host.add(hm);
    const nuc = mk(new T.SphereGeometry(1.15, 24, 18), 0x7a5fd0, { transparent: true, opacity: .85 }); nuc.position.set(0, -2.6, .2); host.add(nuc);
    const mt = [mk(new T.SphereGeometry(.4, 10, 8), 0xff9a4a), mk(new T.SphereGeometry(.3, 10, 8), 0xff9a4a)]; mt[0].position.set(-3, -2.4, 1); mt[1].position.set(3, -2.6, -1.2); mt.forEach(m => host.add(m));
    const mv = new T.InstancedMesh(new T.CylinderGeometry(.035, .035, .22, 6), new T.MeshStandardMaterial({ color: 0xe8b4a4, roughness: .6 }), 170), mx = new T.Matrix4(); let c = 0;
    while (c < 170) { const x = (rr() - .5) * 11, z = (rr() - .5) * 7; if ((x / 6.1) ** 2 + (z / 3.9) ** 2 > .97) continue; mx.makeTranslation(x, surfY(x, z) + .02, z); mv.setMatrixAt(c++, mx); } host.add(mv);
    [-1, 1].forEach(s => { const n = new T.Mesh(new T.SphereGeometry(1, 28, 20), new T.MeshStandardMaterial({ color: 0xd8a8a0, roughness: .6, transparent: true, opacity: .35, depthWrite: false })); n.scale.set(6.2, 2.6, 4); n.position.set(s * 12.8, -2.2, 0); root.add(n); });
    const vessel = new T.Mesh(new T.CylinderGeometry(.7, .7, 34, 20, 1, true), new T.MeshStandardMaterial({ color: 0xa83040, roughness: .5, transparent: true, opacity: .25, side: T.DoubleSide })); vessel.rotation.z = Math.PI / 2; vessel.position.set(0, -3.2, -8); root.add(vessel);
    /* bacteria */
    const B = [], tethers = []; for (let i = 0; i < nb; i++) {
      const g = new T.Group(), m = orgId === 'cp' ? new T.Group() : M.orgs.build(orgId);
      if (orgId === 'cp') { g.userData.sc = 1; m.add(mk(new T.SphereGeometry(.38, 14, 10), 0x4a3a9a)); } else g.userData.sc = P.col === 'cluster' ? .24 : (orgId === 'af' ? .26 : .3);
      m.scale.multiplyScalar(g.userData.sc); g.add(m); g.userData.m = m; if (!P.up && orgId !== 'cp') m.rotation.z = Math.PI / 2; m.rotation.y = rr() * 6; g.userData.r = orgId === 'cp' ? .4 : 2.9 * g.userData.sc * .62; root.add(g); B.push(g);
      const sl = SLOTS[i % SLOTS.length]; g.userData.sx = sl[0]; g.userData.sz = sl[1];
      const tg = []; for (let k = 0; k < (P.adh === 'fimb' ? 6 : P.adh === 'tip' ? 1 : P.adh === 'pili' ? 3 : 4); k++) { const t = mk(new T.CylinderGeometry(P.adh === 'adh' ? .05 : .02, P.adh === 'adh' ? .05 : .02, 1, 5), P.adh === 'adh' ? 0xffd27a : 0xdff2ff, { transparent: true, opacity: .9 }); t.userData = { dx: (rr() - .5) * .8, dz: (rr() - .5) * .8 }; root.add(t); tg.push(t); } tethers.push(tg);
    }
    const aIdx = (P.inv === 'junction' && nb > 3) ? 3 : (nb > 1 ? 1 : 0), tIdx = P.inv === 'junction' ? 1 : 0;
    /* extra actors */
    const biofilm = mk(new T.SphereGeometry(1, 28, 18), 0xbfe8c0, { transparent: true, opacity: .22, depthWrite: false }); biofilm.scale.set(.1, .1, .1); root.add(biofilm);
    const capShell = mk(new T.SphereGeometry(1, 28, 18), 0xffd3e6, { transparent: true, opacity: .25, depthWrite: false }); root.add(capShell);
    const vac = []; for (let i = 0; i < 3; i++) { const v = mk(new T.SphereGeometry(1, 24, 16), 0xb7e8ff, { transparent: true, opacity: .26, depthWrite: false }); v.visible = false; root.add(v); vac.push(v); }
    const needle = mk(new T.CylinderGeometry(.04, .07, 1, 8), 0xe6f4ff); root.add(needle);
    const neu = new T.Group(); neu.add(mk(new T.SphereGeometry(.62, 20, 14), 0xf4f1ff, { transparent: true, opacity: .6 })); [[.2, .1, 0], [-.18, .12, .1], [0, -.2, .1]].forEach(q => { const l = mk(new T.SphereGeometry(.22, 12, 10), 0x6a4aa8); l.position.set(...q); neu.add(l); }); root.add(neu);
    const lyso = mk(new T.SphereGeometry(.5, 16, 12), 0x9bd86a, { transparent: true, opacity: .75 }); root.add(lyso);
    const recruits = []; for (let i = 0; i < 6; i++) { const g = neu.clone(true); root.add(g); recruits.push(g); }
    const pores = []; for (let i = 0; i < 12; i++) { const t = mk(new T.TorusGeometry(.2, .06, 8, 18), P.tc, { emissive: P.tc, emissiveIntensity: .35 }); const x = (rr() - .5) * 7, z = (rr() - .5) * 4.4; t.position.set(x, surfY(x, z) + .05, z); t.rotation.x = Math.PI / 2; root.add(t); pores.push(t); }
    const blebs = []; for (let i = 0; i < 8; i++) { const b = mk(new T.SphereGeometry(.35, 12, 10), 0xf0c3b4, { transparent: true, opacity: .6 }); const a = i / 8 * 6.28; b.userData.p = V(Math.cos(a) * 5.6, -2.2 + Math.sin(a) * 1.5, Math.sin(a * 1.7) * 3); root.add(b); blebs.push(b); }
    const mkInst = (n, r, col, em) => { const m = new T.InstancedMesh(new T.SphereGeometry(r, 8, 6), new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: em || .45 }), n); m.frustumCulled = false; root.add(m); return m; };
    const tox = mkInst(28, .11, P.tc, .5), cyt = mkInst(46, .09, 0xff7a3d, .6), frag = mkInst(30, .09, 0xffc8d8, .3), eff = mkInst(10, .08, 0xffffff, .6);
    const tmark = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.strokeStyle = '#ff5a4e'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(12, 12); x.lineTo(52, 52); x.moveTo(52, 12); x.lineTo(12, 52); x.stroke(); const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.set(1.2, 1.2, 1); root.add(s); return s; })();
    const hide = new T.Matrix4().makeScale(0, 0, 0), tmpM = new T.Matrix4(), tmpV = V(0, 0, 0);
    const bpos = B.map(() => V(0, 0, 0)), inside = B.map(() => 0);
    function place(i, t) { /* position of bacterium i at time t; returns visibility scale */
      const b = B[i], sx = b.userData.sx, sz = b.userData.sz, rest = surfY(sx, sz) + b.userData.r * .8; let x = sx, y = rest, z = sz, s = 1;
      if (i < 2) { const k = ss(i * .3, i * .3 + 3.6, t); y += (1 - k) * 5.5; x += Math.sin(t * 2.2 + i) * .35 * (1 - k); z += Math.cos(t * 1.7 + i) * .3 * (1 - k); }
      else { const ap = D + .35 * (i - 2) + .2, k = ss(ap, ap + 1.1, t); s = k; const nb2 = SLOTS[(i - 1) % SLOTS.length]; x = lerp(B[i - 1].userData.sx, sx, k); z = lerp(B[i - 1].userData.sz, sz, k); y = surfY(x, z) + b.userData.r * .8; if (intra) { s = i === 2 ? ss(3 * D - .9, 3 * D - .2, t) : k; } }
      const p2 = ss(2 * D, 2 * D + D * .9, t); inside[i] = 0;
      if (P.inv === 'enter' && i === 0) { y -= p2 * 1.5; inside[i] = p2; }
      if (P.inv === 'junction' && i === tIdx) { const q = ss(2 * D, 2 * D + D * .5, t), q2 = ss(2 * D + D * .45, 2 * D + D * .95, t); x = lerp(x, 6.3, q); z = lerp(z, 0, q); y = surfY(x, z) + b.userData.r * .8 - q2 * 1.2; if (q2 > .3) inside[i] = 1; }
      if (intra && i < 2) { /* i=0 inside vacuole; i=1 hidden */ if (i === 0) { y -= p2 * 1.8; inside[i] = p2; x = lerp(x, 0, p2 * .4); } else s = i === 1 ? ss(3 * D - .9, 3 * D - .2, t) : s; if (i === 1) { s = ss(3 * D - .9, 3 * D - .2, t); y -= 1.8 * p2; x = -.2; z += .2; inside[i] = 1; } }
      if (i === 2 && intra) { y -= 1.8; x = .3; inside[i] = 1; }
      /* engulfment target is pulled to the neutrophil */
      return { x, y, z, s };
    }
    const nPos = V(0, 0, 0);
    function update(t) {
      const st = Math.min(NST - 1, Math.floor(t / D)), tau = t - st * D, ip = ss(5 * D, 5 * D + D * .9, t), in6 = ss(6 * D, 6 * D + D * .9, t);
      /* host injury */
      const hy = hm; hm.material.color.setHex(0xf0c3b4); hy.scale.set(6.2, 2.6, 4); host.position.set(0, 0, 0); nuc.scale.setScalar(1); nuc.material.color.setHex(0x7a5fd0); hm.material.opacity = .55;
      const grey = new T.Color(0xf0c3b4).lerp(new T.Color(0x9a8a86), ip);
      if (P.inj === 'lyse' || P.inj === 'necro') { const sw = P.inj === 'lyse' ? .22 : .14; hy.scale.set(6.2 * (1 + sw * ip), 2.6 * (1 + sw * ip), 4 * (1 + sw * ip)); hm.material.color.copy(grey); if (P.inj === 'lyse') hm.material.opacity = .55 - .3 * ss(.7, 1, ip); }
      if (P.inj === 'round') { hy.scale.set(6.2 * (1 - .18 * ip), 2.6 * (1 + .28 * ip), 4 * (1 - .15 * ip)); nuc.scale.setScalar(1 - .25 * ip); }
      if (P.inj === 'apopt') { nuc.scale.setScalar(1 - .45 * ip); nuc.material.color.setHex(0x3a2670); hm.material.color.copy(grey); }
      if (P.inj === 'detach') { host.position.y = .9 * ip; hm.material.opacity = .55 - .2 * ip; }
      if (P.inj === 'pore') { hm.material.color.copy(grey); }
      blebs.forEach(b => { const v = P.inj === 'apopt' ? ip : 0; b.visible = v > .05; b.scale.setScalar(.3 + .8 * v); b.position.copy(b.userData.p); });
      /* bacteria */
      B.forEach((b, i) => { const p = place(i, t); bpos[i].set(p.x, p.y, p.z); b.position.set(p.x, p.y + host.position.y * (inside[i] ? 1 : 0), p.z); b.scale.setScalar(Math.max(.0001, p.s)); b.visible = p.s > .02; b.userData.m.rotation.y += .002; });
      /* engulf: move target into the neutrophil position (below) */
      /* biofilm / matrix */
      const bio = (P.col === 'biofilm' || P.ev === 'stuck') ? ss(D, 2 * D, t) : 0; biofilm.visible = bio > .02; biofilm.scale.set(.2 + bio * 4.6, .2 + bio * .8, .2 + bio * 3); biofilm.position.set(0, surfY(0, 0) + .5, 0);
      if (P.ev === 'stuck' && P.col !== 'biofilm') { /* spores / matrix around target */ }
      /* adhesion tethers */
      B.forEach((b, i) => { const att = (i < 2 ? ss(3.2, 4.2, t - i * .3) : b.visible ? 1 : 0) * (1 - (inside[i] || 0)); tethers[i].forEach(th => { th.visible = att > .05; if (!th.visible) return; const sx = b.position.x + th.userData.dx, sz = b.position.z + th.userData.dz, a = V(b.position.x, b.position.y - b.userData.r * .6, b.position.z), e = V(sx, surfY(sx, sz) + .1, sz), d = e.clone().sub(a), L = Math.max(.05, d.length()); th.position.copy(a.clone().add(e).multiplyScalar(.5)); th.quaternion.setFromUnitVectors(Y, d.clone().normalize()); th.scale.set(1, L, 1); th.material.opacity = att * .9; }); });
      /* vacuoles */
      vac.forEach((v, i) => { v.visible = false; });
      if (P.inv === 'enter') { const v = vac[0]; v.visible = inside[0] > .1; v.position.copy(B[0].position); v.scale.setScalar(.9 * inside[0] + .01); }
      if (P.inv === 'vacuole') { const v = vac[0]; v.visible = inside[0] > .1; v.position.set(0, B[0].position.y, B[0].position.z); v.scale.setScalar(1.4 * inside[0] + .01); if (orgId === 'cp') v.material.opacity = .2; }
      /* needle */
      const nd = P.inv === 'needle' ? ss(2 * D, 2 * D + 1.2, t) * (1 - ss(5 * D, 5 * D + 1, t) * 0) : 0; needle.visible = nd > .02; if (needle.visible) { const a = B[0].position.clone().add(V(0, -.3, 0)), e = V(a.x, surfY(a.x, a.z) - .1, a.z), d = e.clone().sub(a), L = Math.max(.05, d.length()) * nd; needle.position.copy(a.clone().addScaledVector(d.clone().normalize(), L / 2)); needle.quaternion.setFromUnitVectors(Y, d.clone().normalize()); needle.scale.set(1, L, 1); }
      /* toxin particles */
      const src = Math.min(nb, 4), pa = pores; let pv = 0;
      for (let k = 0; k < 28; k++) {
        const e = 3 * D + (k % 14) * .3 + (k >= 14 ? 2 : 0) * 0, dur = 1.3, kk = (t - e) / dur;
        if (kk < 0 || (k >= 14 && t < 3 * D + 2.5)) { tox.setMatrixAt(k, hide); continue; }
        const s = bpos[k % src], px = s.x + Math.sin(k * 2.3) * .9, pz = s.z + Math.cos(k * 1.7) * .8, ty = P.tox === 'secrete' || intra ? surfY(px, pz) - 1.2 : surfY(px, pz) + .1; const w = Math.min(1, kk);
        let x = lerp(s.x, px, w), y = lerp(s.y, ty, ss(0, 1, w)), z = lerp(s.z, pz, w), sc = 1;
        if (kk > 1) { if (P.tox === 'pore') sc = 0; else if (P.tox === 'ox') { x += Math.sin(t * 6 + k) * .1; y += Math.cos(t * 5 + k) * .1 + .2; sc = Math.max(0, 1 - (kk - 1) * .4); } else if (P.tox === 'vesicle') sc = 0; else if (P.tox === 'secrete') { y -= (kk - 1) * .3; sc = Math.max(0, 1 - (kk - 1) * .35); } }
        if (P.tox === 'vesicle') sc *= 2.2; if (P.tox === 'pore' && kk <= 1) sc = 1.2;
        tmpM.compose(tmpV.set(x, y, z), new T.Quaternion(), V(sc, sc, sc)); tox.setMatrixAt(k, tmpM);
      }
      tox.instanceMatrix.needsUpdate = true;
      pores.forEach((p, i) => { const on = P.tox === 'pore' || P.inj === 'pore' ? ss(3 * D + 1 + i * .15, 3 * D + 1.6 + i * .15, t) : 0; p.visible = on > .05; p.scale.setScalar(on * (1 + .5 * ip)); });
      /* effector stream through needle */
      for (let k = 0; k < 10; k++) { const q = ((t - 2 * D - k * .22) % 1.3) / 1.3; if (P.inv !== 'needle' || t < 2 * D + .8 || t > 4 * D || q < 0) { eff.setMatrixAt(k, hide); continue; } const a = B[0].position, y = lerp(a.y - .3, surfY(a.x, a.z) - 1.1, q); tmpM.makeTranslation(a.x, y, a.z); eff.setMatrixAt(k, tmpM); }
      eff.instanceMatrix.needsUpdate = true;
      /* immune actor (stage 4) */
      const A = B[aIdx], tgt = P.ev === 'blocked' ? B[0] : A, tp = tgt.position, k4 = ss(4 * D, 4 * D + 1.8, t), r4 = (t - 4 * D - 1.8) / (D - 1.8);
      const blockedOrEnt = P.ev === 'blocked';
      neu.visible = false; lyso.visible = false; tmark.visible = false; capShell.visible = false; frag.count = 30;
      const stand = V(tp.x - 1.3, tp.y + .3, tp.z);
      if (blockedOrEnt) { /* lysosome tries to reach vacuole */
        lyso.visible = t >= 4 * D && t < 5 * D + .2; const kx = ss(4 * D, 4 * D + 2, t), osc = r4 > 0 ? Math.sin(r4 * 18) * .12 * (1 - Math.min(1, r4)) : 0; lyso.position.set(lerp(-7, tp.x - 1.7 + osc, kx), tp.y + .2, tp.z); lyso.scale.setScalar(1);
        if (r4 > .1 && r4 < .8) { tmark.visible = true; tmark.position.set(tp.x - 1.2, tp.y + .9, tp.z); }
      } else {
        neu.visible = t >= 4 * D && !(P.ev === 'burst' && r4 > .6) && t < 6 * D + 1; neu.scale.setScalar(1);
        let nx = lerp(-9, stand.x, k4), ny = lerp(tp.y + 1.6, stand.y, k4), nz = lerp(tp.z + 2, stand.z, k4);
        if (P.ev === 'bounce' && r4 > 0) { const o = Math.sin(r4 * 16); nx = stand.x - .1 + Math.max(0, o) * .35 - (1 - Math.min(1, r4 * 2.5)) * 0 - Math.max(0, -o) * .15; if (r4 > .2 && r4 < .95) { tmark.visible = true; tmark.position.set(tp.x - .6, tp.y + 1, tp.z); } capShell.visible = true; capShell.position.copy(tp); capShell.scale.setScalar(A.userData.r * 1.55); }
        if (P.ev === 'burst' && r4 > 0) { const sw = ss(0, .55, r4); neu.scale.setScalar(1 + .9 * sw); nx = stand.x + .2 * sw; if (r4 > .55) neu.visible = false; }
        if (P.ev === 'engulf' && r4 > 0) { const e = ss(.1, .6, r4); nx = lerp(stand.x, tp.x, e); ny = lerp(stand.y, tp.y, e); nz = lerp(stand.z, tp.z, e); neu.scale.setScalar(1 + .25 * e); const m = (.35 + .65 * (1 - e)) * 1; A.scale.setScalar(Math.max(.0001, A.scale.x * m)); vac[1].visible = e > .2; vac[1].position.copy(tp); vac[1].scale.setScalar(.95 * e); }
        if (P.ev === 'stuck' && r4 > 0) { nx = stand.x - .3 + Math.sin(r4 * 14) * .08; neu.children[0].material.opacity = .6 - .35 * ss(.3, 1, r4); biofilm.visible = true; }
        else neu.children[0].material.opacity = .6;
        neu.position.set(nx, ny, nz); nPos.copy(neu.position);
      }
      /* burst fragments */
      for (let k = 0; k < 30; k++) { const q = (t - (4 * D + 1.8 + (D - 1.8) * .55)) / 1.4; if (P.ev !== 'burst' || q < 0 || q > 1) { frag.setMatrixAt(k, hide); continue; } const a = k * 2.399; tmpM.makeTranslation(nPos.x + Math.cos(a) * q * 1.6, nPos.y + Math.sin(a * 1.3) * q * 1.3, nPos.z + Math.sin(a) * q * 1.1); frag.setMatrixAt(k, tmpM); }
      frag.instanceMatrix.needsUpdate = true;
      /* capsule shell visible earlier for encapsulated organisms in stage 4 only */
      /* inflammation */
      vessel.scale.set(1, 1 + .5 * in6, 1 + .5 * in6); vessel.material.color.setHex(0xa83040).lerp(new T.Color(0xff4a5a), in6);
      recruits.forEach((g, i) => { const e = 6 * D + .3 + i * .35, k = ss(e, e + 2.4, t); g.visible = k > .02; const sx = -3 + i * 1.3, sz = -1.5 + (i % 3) * 1.3; g.position.set(lerp(-6 + i * 2.4, sx, k), lerp(-3.2, surfY(sx, sz) + .8, ss(.2, 1, k)), lerp(-8, sz, k)); g.scale.setScalar(.8); });
      for (let k = 0; k < 46; k++) { const ph = ((t - 6 * D - k * .09) % 3.4 + 3.4) % 3.4 / 3.4; if (t < 6 * D || ph > 1) { cyt.setMatrixAt(k, hide); continue; } const a = k * 2.399, x = Math.cos(a) * 4 * Math.sqrt((k % 10) / 10 + .1), z = Math.sin(a) * 2.6 * Math.sqrt((k % 7) / 7 + .1); tmpM.makeTranslation(x + Math.sin(ph * 9 + k) * .2, surfY(x, z) + ph * 5.5, z); cyt.setMatrixAt(k, tmpM); }
      cyt.instanceMatrix.needsUpdate = true;
      const lbl = labelAt(st, tau, P, bpos, aIdx); return { stage: st, tau, label: lbl };
    }
    function labelAt(st, tau, P, bpos, aIdx) {
      const n = P.nm;
      const bp = bpos[Math.min(bpos.length - 1, st === 4 ? aIdx : 0)] || V(0, 0, 0);
      const tab = [[n.adh, V(bp.x, surfY(bp.x, bp.z) + .6, bp.z)], ['Colony and matrix', V(0, 1.9, 0)], [n.inv, V(bpos[0].x, bpos[0].y + .9, bpos[0].z)], [n.tox, V(bpos[0].x + 1, bpos[0].y + .7, bpos[0].z)], [n.ev, V(bp.x, bp.y + 1.2, bp.z)], [n.inj, V(0, 1.5, 0)], ['Cytokines and neutrophils', V(0, 4, 0)]];
      return { text: tab[st][0], pos: tab[st][1].clone() };
    }
    const FOCUS = [[V(0, 1.2, 0), 14], [V(0, 1, 0), 12], [V(0, -.3, 0), 10], [V(0, .8, 0), 11], [V(-1.2, 1, 0), 9], [V(0, -.8, 0), 14], [V(0, 1, -2), 19]];
    return { update, DUR, D, NST, root, focus: st => FOCUS[st], profile: P, dispose() { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } };
  }
  M.inf = { PROF, TXT, STAGES, Sim, DUR, D, NST };
})();
