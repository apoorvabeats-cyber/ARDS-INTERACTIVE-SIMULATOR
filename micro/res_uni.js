/* MICRO resistance engine, part 2: organisms beyond the four hospital Gram-negatives.
   Loaded after resistance.js. It adds
     - Enterobacter and Serratia (Gram-negative: they reuse the original envelope world and fate model unchanged),
     - Gram-positives (S. aureus / MRSA, Enterococcus / VRE, S. pneumoniae), Mycobacterium tuberculosis, Candida and Aspergillus,
       which use a generic fate model ("family u") and the layered-envelope world in scn_uni.js.

   GENERIC FATE MODEL (illustrative teaching model, NOT a clinical susceptibility predictor)
   For 100 units of drug that meet the organism:
     enter      = product of the "barrier" retentions of the ticked mechanisms (e.g. thickened VISA wall traps vancomycin)
     effluxed   = enter x (1 - product (1 - pump_i))
     inactive   = remaining x (1 - product (1 - h_i))      (enzyme destroys it, or a prodrug is never activated)
     bound      = remaining active drug x product of target-binding retentions (altered target)
     weak       = remaining active drug that reaches an altered target but does not bind
   Each mechanism lists its effect per drug in `fx` (entry / pump / hyd / bind). A mechanism with no entry for a drug does nothing to it.
   All weights are teaching values chosen to reflect well-described tendencies; real susceptibility is isolate-specific (AST). */
(function () {
  'use strict';
  const M = window.MICRO, R = M.res;
  if (!R) return;

  /* ---------- drugs ---------- */
  const D = (id, name, note, tgt, how, out, extra) => Object.assign({ id, name, cls: 'u', note, tgt, how, out }, extra || {});
  Object.assign(R.ABX, {
    pen: D('pen', 'Benzylpenicillin', 'β-lactam (penicillin)', 'pbp', 'binds the active-site serine of penicillin-binding proteins (PBPs) and blocks cross-linking of the cell wall', 'Cell wall synthesis largely blocked'),
    oxa: D('oxa', 'Oxacillin', 'Penicillinase-stable penicillin (cefoxitin is the lab screen)', 'pbp', 'binds PBPs and blocks wall cross-linking; it is not hydrolysed by the staphylococcal penicillinase', 'Cell wall synthesis largely blocked'),
    cpt: D('cpt', 'Ceftaroline', 'Anti-MRSA cephalosporin', 'pbp', 'binds PBPs, including PBP2a: binding at a second (allosteric) site opens PBP2a so the drug can reach its active site', 'Cell wall synthesis largely blocked'),
    amp: D('amp', 'Ampicillin', 'Aminopenicillin', 'pbp', 'binds PBPs and blocks wall cross-linking', 'Cell wall synthesis largely blocked'),
    van: D('van', 'Vancomycin', 'Glycopeptide', 'dala', 'hugs the D-Ala-D-Ala end of the new wall precursor (lipid II) so the wall cannot be built; it does not enter the cell', 'Cell wall synthesis largely blocked'),
    dap: D('dap', 'Daptomycin', 'Cyclic lipopeptide', 'mem', 'with calcium it inserts into the cell membrane, clusters and depolarises it', 'Membrane depolarised, cell killed'),
    lzd: D('lzd', 'Linezolid', 'Oxazolidinone', 'ribo', 'binds the 23S rRNA peptidyl-transferase centre of the 50S ribosome and stops initiation of protein synthesis', 'Protein synthesis largely blocked'),
    ery: D('ery', 'Erythromycin', 'Macrolide', 'ribo', 'binds the 50S ribosome exit tunnel and blocks the growing protein', 'Protein synthesis largely blocked'),
    lev: D('lev', 'Levofloxacin', 'Fluoroquinolone', 'gyr', 'traps DNA gyrase / topoisomerase IV on cut DNA, so replication breaks the chromosome', 'DNA replication broken, cell killed'),
    rif: D('rif', 'Rifampicin', 'Rifamycin', 'rnap', 'sits in the RNA-polymerase β subunit (RpoB) and blocks the RNA chain as it starts to grow', 'RNA synthesis largely blocked'),
    inh: D('inh', 'Isoniazid', 'Pro-drug (needs KatG)', 'inha', 'is a pro-drug: KatG activates it, the activated form blocks InhA and mycolic-acid synthesis', 'Mycolic-acid synthesis largely blocked', { prodrug: true }),
    flu: D('flu', 'Fluconazole', 'Triazole', 'erg11', 'binds the heme iron of lanosterol 14α-demethylase (Erg11 / Cyp51), so ergosterol is not made', 'Ergosterol synthesis largely blocked'),
    vor: D('vor', 'Voriconazole', 'Triazole (mould-active)', 'erg11', 'binds the heme iron of lanosterol 14α-demethylase (Cyp51A in Aspergillus), so ergosterol is not made', 'Ergosterol synthesis largely blocked'),
    mic: D('mic', 'Micafungin', 'Echinocandin', 'fks', 'blocks β-1,3-D-glucan synthase (Fks1), so the fungal wall weakens', 'Wall glucan synthesis largely blocked'),
    amb: D('amb', 'Amphotericin B', 'Polyene', 'ergos', 'binds ergosterol in the membrane and forms leaky pores', 'Membrane pores formed, cell killed')
  });
  const TARGET_NAME = { pbp: 'PBP transpeptidase', dala: 'D-Ala-D-Ala terminus', mem: 'cell membrane', ribo: '50S ribosome', gyr: 'DNA gyrase', rnap: 'RNA polymerase (RpoB)', inha: 'InhA enzyme', erg11: 'Erg11 / Cyp51 enzyme', fks: 'Fks1 glucan synthase', ergos: 'ergosterol' };

  /* ---------- mechanisms ---------- */
  const X = (id, kind, short, name, sub, text, fx, view, extra) => Object.assign({ id, kind, fam: 'u', short, name, sub, text, fx, view: view || {} }, extra || {});
  Object.assign(R.MECH, {
    blaZ: X('blaZ', 'enzyme', 'BlaZ', 'Penicillinase (BlaZ)', 'Destroys penicillin and ampicillin', 'A staphylococcal β-lactamase that opens the β-lactam ring of penicillin and ampicillin. Oxacillin and the cephalosporins are not good substrates.', { hyd: { pen: .9, amp: .9 } }, { x: -42, y: 17, col: 0xff8a6e, name: 'BlaZ β-lactamase' }),
    mecA: X('mecA', 'target', 'mecA', 'PBP2a (mecA)', 'Low-affinity wall enzyme', 'MRSA carries mecA on the SCCmec element. PBP2a has a closed, low-affinity active site, so it keeps cross-linking the wall when the normal PBPs are blocked. Ceftaroline can still open it.', { bind: { pen: .05, oxa: .05, amp: .05, cpt: .55 } }, { alt: 'pbp2a' }),
    visa: X('visa', 'barrier', 'VISA wall', 'Thickened wall (VISA)', 'Drug trapped before the target', 'Vancomycin-intermediate S. aureus lays down a thicker wall with extra free D-Ala-D-Ala that traps vancomycin before it reaches the membrane-side precursors. Daptomycin is also held back.', { entry: { van: .45, dap: .7 } }, { thick: true }),
    vanA: X('vanA', 'target', 'vanA', 'VanA operon (D-Ala-D-Lac)', 'Precursor end changed', 'The van operon makes wall precursors that end in D-Ala-D-Lactate instead of D-Ala-D-Ala. Vancomycin loses one hydrogen bond and binds about 1000 times less well.', { bind: { van: .02 } }, { alt: 'dalac' }),
    rrna: X('rrna', 'target', '23S rRNA', '23S rRNA change (mutation / cfr)', 'Ribosome site altered', 'A 23S rRNA mutation (for example G2576T) or the cfr methyltransferase changes the oxazolidinone binding pocket on the 50S ribosome, so linezolid binds poorly.', { bind: { lzd: .08 } }, { alt: 'ribo' }),
    nora: X('nora', 'efflux', 'NorA', 'NorA efflux pump', 'Pumps out quinolones', 'A one-piece major-facilitator pump in the membrane. It extrudes hydrophilic fluoroquinolones; for levofloxacin the effect is modest.', { pump: { lev: .2 } }, { pumpName: 'NorA (MFS)' }),
    qrdr: X('qrdr', 'target', 'QRDR', 'Gyrase / topoisomerase IV QRDR mutation', 'Quinolone site altered', 'Point mutations in the quinolone-resistance-determining region of gyrase (gyrA) or topoisomerase IV (grlA / parC) weaken fluoroquinolone binding to the enzyme-DNA complex.', { bind: { lev: .2 } }, { alt: 'gyr' }),
    pbp5: X('pbp5', 'target', 'PBP5', 'PBP5 change (E. faecium)', 'Low-affinity PBP5', 'Enterococcus faecium makes a low-affinity PBP5 (overproduced, often with point changes) that keeps building the wall when ampicillin is present.', { bind: { amp: .1 } }, { alt: 'pbp5' }),
    mprf: X('mprf', 'target', 'MprF / cls', 'Membrane change (MprF, cls, LiaFSR)', 'Membrane charge and lipids changed', 'Changes in membrane phospholipids and surface charge repel calcium-daptomycin and divert it from the membrane, so it inserts poorly.', { bind: { dap: .35 } }, { alt: 'mem' }),
    mosaic: X('mosaic', 'target', 'Mosaic PBPs', 'Mosaic PBPs (pbp2x, pbp2b, pbp1a)', 'Low-affinity PBPs', 'Pneumococci take up DNA from relatives and build mosaic PBP genes. The resulting PBPs bind penicillin and ceftriaxone less well; several changes add up.', { bind: { pen: .25, cro: .45 } }, { alt: 'pbp2a' }),
    erm: X('erm', 'target', 'erm(B)', 'Erm methylase (erm B)', 'Ribosome methylated', 'Erm adds methyl groups to adenine 2058 of the 23S rRNA, so macrolides, lincosamides and streptogramin B can no longer bind.', { bind: { ery: .05 } }, { alt: 'ribo' }),
    mef: X('mef', 'efflux', 'mef(A)', 'Mef(A) efflux pump', 'Pumps out macrolides', 'A membrane pump that extrudes 14- and 15-membered macrolides. Resistance is moderate and clindamycin stays active.', { pump: { ery: .5 } }, { pumpName: 'Mef(A)' }),
    rpoB: X('rpoB', 'target', 'rpoB', 'rpoB mutation (RRDR)', 'Polymerase site altered', 'Mutations in the rifampicin-resistance-determining region of rpoB (S450L is the commonest) change the drug pocket in RNA polymerase; this is the marker for rifampicin-resistant TB.', { bind: { rif: .03 } }, { alt: 'rnap' }),
    katG: X('katG', 'activ', 'katG', 'katG mutation', 'Pro-drug never activated', 'Isoniazid is a pro-drug. Mutations in katG (S315T is the commonest) remove KatG activity, so isoniazid stays in its inactive form and never blocks InhA.', { hyd: { inh: .9 } }, { x: -34, y: -24, col: 0xb7c4d0, name: 'KatG' }),
    inhA: X('inhA', 'target', 'inhA', 'inhA promoter / gene change', 'More or altered InhA', 'Mutations in the inhA promoter (more enzyme) or in the gene (weaker binding) give low-level isoniazid resistance; they also reduce ethionamide activity.', { bind: { inh: .4 } }, { alt: 'inha' }),
    tbgyr: X('tbgyr', 'target', 'gyrA', 'gyrA mutation', 'Quinolone site altered', 'Mutations in the quinolone-resistance-determining region of gyrA (codons 90 and 94) weaken fluoroquinolone binding to gyrase.', { bind: { lev: .15 } }, { alt: 'gyr' }),
    rv1258: X('rv1258', 'efflux', 'Efflux', 'Efflux pumps (Rv1258c, others)', 'Pumps out several drugs', 'Mycobacteria carry many efflux pumps. They add low-level resistance across drugs and let other mutations take hold.', { pump: { rif: .2, inh: .1, lev: .25 } }, { pumpName: 'Rv1258c (MFS)' }),
    erg11: X('erg11', 'target', 'ERG11', 'ERG11 mutation / overexpression', 'Azole target altered', 'Point mutations in ERG11 (for example Y132F, K143R) or extra copies of the gene mean azoles no longer silence all the enzyme.', { bind: { flu: .1, vor: .15 } }, { alt: 'erg11' }),
    cdr1: X('cdr1', 'efflux', 'CDR1 / MDR1', 'Efflux (Cdr1, Cdr2, Mdr1)', 'Pumps out azoles', 'ABC (Cdr1, Cdr2) and major-facilitator (Mdr1) pumps are up-regulated by gain-of-function transcription-factor mutations and expel azoles.', { pump: { flu: .6, vor: .4 } }, { pumpName: 'Cdr1 (ABC)' }),
    fks1: X('fks1', 'target', 'FKS1', 'FKS1 hot-spot mutation', 'Glucan synthase altered', 'Mutations in the hot-spot regions of Fks1 lower echinocandin binding to the glucan synthase.', { bind: { mic: .1 } }, { alt: 'fks' }),
    erg3: X('erg3', 'target', 'ERG3', 'ERG3 / sterol change', 'Ergosterol replaced', 'Loss of Erg3 (and related sterol changes) replaces ergosterol with other sterols that amphotericin B binds poorly; it also lets cells tolerate azoles.', { bind: { amb: .3, flu: .7 } }, { alt: 'ergos' }),
    cyp51: X('cyp51', 'target', 'cyp51A', 'cyp51A (TR34 / L98H)', 'Azole target altered', 'A promoter tandem repeat with the L98H change (TR34/L98H, linked to azole use in agriculture) raises Cyp51A and alters the pocket, so voriconazole fails.', { bind: { vor: .08 } }, { alt: 'erg11' }),
    atrf: X('atrf', 'efflux', 'AtrF', 'Efflux (AtrF, Cdr1B)', 'Pumps out azoles', 'ABC transporters such as AtrF and Cdr1B add to azole resistance in Aspergillus.', { pump: { vor: .3 } }, { pumpName: 'AtrF (ABC)' })
  });

  /* ---------- organisms ---------- */
  const GN_KEEP = R.PORIN_KEEP.ent;
  void GN_KEEP;
  const staph = (id, name, gram, presets, caveat) => ({ id, name, gram, fam: 'u', env: 'gp', mechs: ['blaZ', 'mecA', 'visa', 'vanA', 'rrna', 'nora', 'qrdr'], abx: ['pen', 'oxa', 'cpt', 'van', 'lzd', 'lev'], presets, caveat });
  const entero = (id, name, gram, presets, caveat) => ({ id, name, gram, fam: 'u', env: 'gp', mechs: ['pbp5', 'vanA', 'rrna', 'mprf'], abx: ['amp', 'van', 'lzd', 'dap'], presets, caveat });
  Object.assign(R.ORGS, {
    mrsa: staph('mrsa', 'Staphylococcus aureus (MRSA)', 'Gram-positive · cocci in clusters · mecA / SCCmec', [['Susceptible reference', []], ['MRSA (mecA)', ['mecA']], ['MRSA + penicillinase', ['mecA', 'blaZ']], ['VISA (thick wall)', ['mecA', 'blaZ', 'visa']], ['VRSA (vanA)', ['mecA', 'blaZ', 'vanA']], ['Linezolid-resistant', ['mecA', 'blaZ', 'rrna']]],
      'Oxacillin resistance in MRSA is mainly PBP2a; vancomycin resistance by the van operon (VRSA) is rare, while thickened-wall VISA and heterogeneous hVISA are commoner. Resistance to daptomycin and linezolid is uncommon.'),
    sa: staph('sa', 'Staphylococcus aureus (MSSA)', 'Gram-positive · cocci in clusters · methicillin-susceptible', [['Susceptible reference', []], ['Penicillinase only (BlaZ)', ['blaZ']], ['MRSA (add mecA)', ['blaZ', 'mecA']], ['Quinolone resistant', ['qrdr', 'nora']], ['Linezolid-resistant', ['rrna']]],
      'Most S. aureus make a penicillinase and are penicillin resistant, yet stay susceptible to oxacillin; ticking mecA turns this isolate into MRSA.'),
    vre: entero('vre', 'Enterococcus faecium (VRE)', 'Gram-positive · cocci in pairs and chains · van operon', [['Susceptible reference', []], ['vanA only', ['vanA']], ['vanA + PBP5 (ampicillin-resistant)', ['vanA', 'pbp5']], ['vanA + PBP5 + 23S rRNA', ['vanA', 'pbp5', 'rrna']], ['Daptomycin non-susceptible', ['vanA', 'pbp5', 'mprf']]],
      'E. faecium is usually ampicillin resistant through PBP5 and is the main host of vanA. Linezolid and daptomycin are the usual options; resistance to them is uncommon but reported.'),
    ef: entero('ef', 'Enterococcus faecalis', 'Gram-positive · cocci in pairs and chains · gut commensal', [['Susceptible reference', []], ['vanA only', ['vanA']], ['Linezolid-resistant (optrA / 23S)', ['rrna']], ['Daptomycin non-susceptible', ['mprf']]],
      'E. faecalis is usually ampicillin susceptible (PBP5 changes are mainly an E. faecium story) and is intrinsically resistant to cephalosporins, which are not shown here.'),
    sp: { id: 'sp', name: 'Streptococcus pneumoniae', gram: 'Gram-positive · lancet diplococci · capsule', fam: 'u', env: 'gp', mechs: ['mosaic', 'erm', 'mef', 'qrdr'], abx: ['pen', 'cro', 'ery', 'lev', 'van'],
      presets: [['Susceptible reference', []], ['Mosaic PBPs only', ['mosaic']], ['Macrolide: erm(B)', ['erm']], ['Macrolide: mef(A) pump', ['mef']], ['Multidrug resistant', ['mosaic', 'erm', 'qrdr']]],
      caveat: 'Pneumococcal penicillin non-susceptibility is graded by site: meningitis and non-meningeal breakpoints differ. Vancomycin resistance has not been confirmed in pneumococci.' },
    tb: { id: 'tb', name: 'Mycobacterium tuberculosis', gram: 'Acid-fast · mycolic-acid wall · slow growing', fam: 'u', env: 'my', mechs: ['rpoB', 'katG', 'inhA', 'tbgyr', 'rv1258'], abx: ['rif', 'inh', 'lev'],
      presets: [['Susceptible reference', []], ['Rifampicin-resistant (rpoB)', ['rpoB']], ['Isoniazid-resistant (katG)', ['katG']], ['MDR-TB (rpoB + katG)', ['rpoB', 'katG']], ['Pre-XDR (MDR + gyrA)', ['rpoB', 'katG', 'tbgyr']]],
      caveat: 'MDR-TB means resistance to at least rifampicin and isoniazid; pre-XDR adds a fluoroquinolone. Resistance is mutational (no plasmids). Drug choice needs rapid molecular tests and phenotypic susceptibility testing.' },
    ca: { id: 'ca', name: 'Candida albicans', gram: 'Fungus · yeast and hyphae · ergosterol membrane', fam: 'u', env: 'fu', mechs: ['erg11', 'cdr1', 'fks1', 'erg3'], abx: ['flu', 'mic', 'amb'],
      presets: [['Susceptible reference', []], ['Azole target change (ERG11)', ['erg11']], ['Azole efflux (CDR1)', ['cdr1']], ['ERG11 + CDR1', ['erg11', 'cdr1']], ['Echinocandin (FKS1)', ['fks1']]],
      caveat: 'C. albicans is usually azole susceptible; high-level azole and echinocandin resistance is more of a problem in C. glabrata and C. auris, which share these mechanisms.' },
    af: { id: 'af', name: 'Aspergillus fumigatus', gram: 'Fungus · mould · septate hyphae', fam: 'u', env: 'fu', mechs: ['cyp51', 'atrf', 'fks1'], abx: ['vor', 'mic', 'amb'],
      presets: [['Susceptible reference', []], ['cyp51A TR34/L98H', ['cyp51']], ['cyp51A + efflux', ['cyp51', 'atrf']]],
      caveat: 'Echinocandins are only fungistatic against Aspergillus and are used as salvage; the main concern is cyp51A-mediated azole resistance, often acquired from the environment.' },
    /* Gram-negatives: original envelope world and fate model */
    en: {
      id: 'en', name: 'Enterobacter cloacae complex', gram: 'Gram-negative · Enterobacterales · inducible chromosomal AmpC',
      mechs: ['ampc', 'esbl', 'kpc', 'ndm', 'porin', 'efflux'], abx: ['mem', 'etp', 'fep', 'caz', 'cro'],
      porin: { name: 'OmpF / OmpC', group: 'ent' }, pump: { name: 'AcrAB-TolC', inner: 'AcrB', adaptor: 'AcrA', outer: 'TolC', group: 'ent' },
      presets: [['Susceptible reference', []], ['AmpC derepressed', ['ampc']], ['AmpC + porin loss', ['ampc', 'porin']], ['ESBL', ['esbl']], ['KPC', ['kpc']], ['NDM', ['ndm']]],
      caveat: 'Enterobacter carries an inducible chromosomal AmpC: ceftriaxone and ceftazidime can select derepressed mutants during treatment, while cefepime and carbapenems stay stable. AmpC plus porin loss is a route to ertapenem resistance.'
    },
    sm: {
      id: 'sm', name: 'Serratia marcescens', gram: 'Gram-negative · Enterobacterales · chromosomal AmpC · ICU outbreaks',
      mechs: ['ampc', 'esbl', 'kpc', 'porin', 'efflux'], abx: ['mem', 'imi', 'etp', 'fep', 'caz', 'cro'],
      porin: { name: 'OmpF / OmpC', group: 'ent' }, pump: { name: 'AcrAB-TolC', inner: 'AcrB', adaptor: 'AcrA', outer: 'TolC', group: 'ent' },
      presets: [['Susceptible reference', []], ['AmpC derepressed', ['ampc']], ['ESBL', ['esbl']], ['KPC', ['kpc']], ['AmpC + porin loss + efflux', ['ampc', 'porin', 'efflux']]],
      caveat: 'Serratia has a chromosomal AmpC and is intrinsically resistant to colistin (not shown). Class A carbapenemases (SME, KPC) are the usual route to carbapenem resistance.'
    }
  });

  /* ---------- family-u evaluation ---------- */
  const evalGN = R.evaluate, hintGN = R.hint, infoGN = R.mechInfo;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const isU = id => R.ORGS[id] && R.ORGS[id].fam === 'u';
  const setOf = on => on instanceof Set ? on : new Set(Array.isArray(on) ? on : Object.keys(on || {}).filter(k => on[k]));
  const fxv = (m, key, abx) => { const f = R.MECH[m].fx; return f && f[key] && f[key][abx] != null ? f[key][abx] : null; };

  function evalU(orgId, abxId, on) {
    const o = R.ORGS[orgId], set = setOf(on), a = R.ABX[abxId], ms = o.mechs.filter(m => set.has(m));
    let enter = 1, kp = 1, kh = 1, bk = 1; const hs = {}, by = { noEntry: [], efflux: [], hydro: [], weak: [] };
    ms.forEach(m => {
      const e = fxv(m, 'entry', abxId), p = fxv(m, 'pump', abxId), h = fxv(m, 'hyd', abxId), b = fxv(m, 'bind', abxId);
      if (e != null) { enter *= e; if (e < .98) by.noEntry.push(m); }
      if (p) { kp *= 1 - p; if (p > .02) by.efflux.push(m); }
      if (h != null) { kh *= 1 - h; hs[m] = h; if (h > R.POOR) by.hydro.push(m); }
      if (b != null) { bk *= b; if (b < .98) by.weak.push(m); }
    });
    const effluxed = enter * (1 - kp), rem = enter - effluxed, inactive = rem * (1 - kh), active = rem - inactive, bound = active * bk, weak = active - bound;
    const fr = { noEntry: 1 - enter, efflux: effluxed, hydro: inactive, weak, bound };
    const engagement = clamp01(bound), outcome = engagement >= .7 ? 'blocked' : engagement >= .35 ? 'partial' : 'survive';
    return { org: orgId, abx: abxId, set, fr, enter, engagement, outcome, hTot: 1 - kh, hs, share: {}, cls: { metallo: 0, serine: 0 }, poor: [], enzymes: ms.filter(m => R.MECH[m].kind === 'enzyme' || R.MECH[m].kind === 'activ'), by, n: set.size, abxCls: a.cls, fam: 'u' };
  }
  R.evaluate = (orgId, abxId, on) => isU(orgId) ? evalU(orgId, abxId, on) : evalGN(orgId, abxId, on);

  const permGN = R.permutations;
  R.permutations = (orgId, abxId) => {
    if (!isU(orgId)) return permGN(orgId, abxId);
    const ms = R.ORGS[orgId].mechs, out = [];
    for (let m = 0; m < (1 << ms.length); m++) { const s = ms.filter((_, i) => m & (1 << i)); out.push(Object.assign(evalU(orgId, abxId, s), { mask: m })); }
    return out;
  };
  R.alone = (orgId, abxId, mechId) => R.evaluate(orgId, abxId, [mechId]);
  R.mechInfo = (orgId, mechId) => isU(orgId) ? R.MECH[mechId] : infoGN(orgId, mechId);
  R.hint = (orgId, abxId, mechId) => {
    if (!isU(orgId)) return hintGN(orgId, abxId, mechId);
    const r = evalU(orgId, abxId, [mechId]), d = Math.round((1 - r.engagement) * 100), a = R.ABX[abxId], m = R.MECH[mechId];
    if (d < 4) return 'No real effect on ' + a.name;
    return (m.kind === 'activ' ? 'On its own: ' : 'On its own: ') + d + '% less drug engages the target';
  };

  /* wording that depends on the organism and drug */
  const FATE_U = {
    gp: { noEntry: 'Trapped in the thick wall', efflux: 'Pumped out', hydro: 'Destroyed by an enzyme', weak: 'Reached target, weak binding', bound: 'Bound its target' },
    my: { noEntry: 'Held back by the waxy wall', efflux: 'Pumped out', hydro: 'Never activated', weak: 'Reached target, weak binding', bound: 'Bound its target' },
    fu: { noEntry: 'Held back by the wall', efflux: 'Pumped out', hydro: 'Destroyed', weak: 'Reached target, weak binding', bound: 'Bound its target' }
  };
  R.fateText = (orgId, abxId) => {
    const o = R.ORGS[orgId]; if (!o || o.fam !== 'u') return R.FATE_TXT;
    const t = Object.assign({}, FATE_U[o.env]); if (abxId && R.ABX[abxId].prodrug) t.hydro = 'Never activated (pro-drug)'; return t;
  };
  R.outLabel = (orgId, abxId, outcome) => {
    const o = R.ORGS[orgId]; if (!o || o.fam !== 'u') return R.OUT[outcome].label;
    const a = R.ABX[abxId];
    if (outcome === 'blocked') return a.out;
    return outcome === 'partial' ? 'Activity partly reduced' : 'Survival favoured';
  };
  R.targetName = abxId => TARGET_NAME[R.ABX[abxId].tgt] || 'PBP target';
  R.isU = isU;
  R.U_ORDER = { gp: ['mrsa', 'sa', 'vre', 'ef', 'sp'], gn: ['pa', 'kp', 'ec', 'ab', 'en', 'sm'], my: ['tb'], fu: ['ca', 'af'] };
})();
