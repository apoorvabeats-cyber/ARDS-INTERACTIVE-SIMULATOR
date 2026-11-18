/* MICRO resistance engine: organisms, antibiotics, mechanisms and a transparent "fate model".
   Pure data + arithmetic (no three.js), so every number the 3D scene shows can be inspected and tested.

   FATE MODEL (illustrative teaching model, NOT a clinical susceptibility predictor)
   For 100 units of drug that meet the cell:
     entry      = 1 x (porin-loss retention for this drug, if the porin is lost)
     effluxed   = entry x (pump efficiency for this drug, if the pump is present)
     hydrolysed = remaining x (1 - product of (1 - h_i)) over the enzymes present
     bound      = remaining active drug x (binding retained, if the target is altered)
     weak       = remaining active drug that reaches an altered target but does not bind effectively
     engagement = bound / bound of the mechanism-free reference
   Different molecules take different fates; one molecule never undergoes incompatible fates.
   Numbers are teaching weights chosen to reflect well-described tendencies (for example OprD loss matters most for
   imipenem, MexAB-OprM extrudes meropenem but not imipenem, ESBLs spare carbapenems). Real isolates differ with expression
   level, genetic background and co-resistance: susceptibility must come from the isolate's own AST. */
(function () {
  'use strict';
  const M = (window.MICRO = window.MICRO || {});

  const ABX = {
    mem: { id: 'mem', name: 'Meropenem', cls: 'carb', note: 'Carbapenem' },
    imi: { id: 'imi', name: 'Imipenem', cls: 'carb', note: 'Carbapenem' },
    etp: { id: 'etp', name: 'Ertapenem', cls: 'carb', note: 'Carbapenem' },
    fep: { id: 'fep', name: 'Cefepime', cls: 'ceph', note: '4th-gen cephalosporin' },
    caz: { id: 'caz', name: 'Ceftazidime', cls: 'ceph', note: '3rd-gen cephalosporin' },
    cro: { id: 'cro', name: 'Ceftriaxone', cls: 'ceph', note: '3rd-gen cephalosporin' }
  };

  /* mechanism catalogue. kind: enzyme | efflux | porin | target. cls (enzymes): metallo | serine */
  const MECH = {
    ndm: { id: 'ndm', kind: 'enzyme', cls: 'metallo', short: 'NDM', name: 'NDM enzyme', sub: 'Carbapenem hydrolysis', full: 'NDM-1 metallo-β-lactamase (two Zn²⁺)', where: 'periplasm',
      text: 'A zinc-dependent metallo-β-lactamase in the periplasm. Zn²⁺ activates a water molecule that opens the β-lactam ring.' },
    kpc: { id: 'kpc', kind: 'enzyme', cls: 'serine', short: 'KPC', name: 'KPC carbapenemase', sub: 'Serine β-lactamase', full: 'KPC serine carbapenemase (class A)', where: 'periplasm',
      text: 'A serine enzyme: its active-site serine attacks the β-lactam (acyl-enzyme), then a water releases the opened, inactive product.' },
    oxa48: { id: 'oxa48', kind: 'enzyme', cls: 'serine', short: 'OXA-48', name: 'OXA-48-like', sub: 'Class D carbapenemase', full: 'OXA-48-like class D carbapenemase', where: 'periplasm',
      text: 'A class D serine enzyme with weak-to-moderate carbapenem hydrolysis and little activity on extended-spectrum cephalosporins.' },
    oxa23: { id: 'oxa23', kind: 'enzyme', cls: 'serine', short: 'OXA-23', name: 'OXA-23-like', sub: 'Class D carbapenemase', full: 'OXA-23-like class D carbapenemase', where: 'periplasm',
      text: 'The most common carbapenemase family in Acinetobacter baumannii: a class D serine enzyme with moderate carbapenem hydrolysis.' },
    esbl: { id: 'esbl', kind: 'enzyme', cls: 'serine', short: 'ESBL', name: 'ESBL (CTX-M type)', sub: 'Cephalosporin hydrolysis', full: 'Extended-spectrum β-lactamase (class A serine)', where: 'periplasm',
      text: 'Hydrolyses penicillins and extended-spectrum cephalosporins. Carbapenems are poor substrates, which is why they are not defeated by an ESBL alone.' },
    ampc: { id: 'ampc', kind: 'enzyme', cls: 'serine', short: 'AmpC', name: 'AmpC cephalosporinase', sub: 'Class C serine β-lactamase', full: 'AmpC class C cephalosporinase', where: 'periplasm',
      text: 'Hydrolyses most cephalosporins; cefepime and carbapenems are relatively stable to it unless expression is very high or other changes coexist.' },
    efflux: { id: 'efflux', kind: 'efflux', short: 'Efflux', name: 'Efflux pump', sub: 'Active antibiotic extrusion', text: 'A three-part RND pump spans the envelope and uses the proton motive force to push drug out.' },
    porin: { id: 'porin', kind: 'porin', short: 'Porin loss', name: 'Porin loss', sub: 'Reduced drug entry', text: 'Fewer or no open outer-membrane channels, so less drug reaches the periplasm.' },
    target: { id: 'target', kind: 'target', short: 'PBP alteration', name: 'Target alteration (PBP)', sub: 'Reduced target binding (hypothetical)', text: 'A modified penicillin-binding protein with a changed binding site. Presented as a separate hypothetical mechanism, not a universal one.' }
  };

  /* per-organism data */
  const ORGS = {
    pa: {
      id: 'pa', name: 'Pseudomonas aeruginosa', gram: 'Gram-negative · non-fermenter · opportunistic pathogen',
      mechs: ['ndm', 'efflux', 'porin', 'target'], abx: ['mem', 'imi', 'fep', 'caz'],
      porin: { name: 'OprD', group: 'pa' }, pump: { name: 'MexAB-OprM', inner: 'MexB', adaptor: 'MexA', outer: 'OprM', group: 'pa' },
      presets: [['Susceptible reference', []], ['NDM only', ['ndm']], ['Efflux only', ['efflux']], ['Porin loss only', ['porin']], ['Efflux + porin loss', ['efflux', 'porin']], ['All four', ['ndm', 'efflux', 'porin', 'target']]],
      caveat: 'Target alteration is shown as a separate hypothetical mechanism: reduced PBP affinity is not the principal universal route to carbapenem resistance in P. aeruginosa.'
    },
    kp: {
      id: 'kp', name: 'Klebsiella pneumoniae', gram: 'Gram-negative · Enterobacterales · encapsulated',
      mechs: ['kpc', 'oxa48', 'ndm', 'esbl', 'porin', 'efflux'], abx: ['mem', 'imi', 'etp', 'fep', 'caz', 'cro'],
      porin: { name: 'OmpK35 / OmpK36', group: 'ent' }, pump: { name: 'AcrAB-TolC', inner: 'AcrB', adaptor: 'AcrA', outer: 'TolC', group: 'ent' },
      presets: [['Susceptible reference', []], ['KPC only', ['kpc']], ['OXA-48-like only', ['oxa48']], ['NDM only', ['ndm']], ['ESBL + porin loss', ['esbl', 'porin']], ['KPC + porin loss + efflux', ['kpc', 'porin', 'efflux']]],
      caveat: 'ESBL plus porin loss is a classic route to reduced ertapenem activity even without a carbapenemase; the model approximates it.'
    },
    ec: {
      id: 'ec', name: 'Escherichia coli', gram: 'Gram-negative · Enterobacterales · most common UTI pathogen',
      mechs: ['esbl', 'ampc', 'ndm', 'porin', 'efflux'], abx: ['mem', 'imi', 'etp', 'fep', 'caz', 'cro'],
      porin: { name: 'OmpF / OmpC', group: 'ent' }, pump: { name: 'AcrAB-TolC', inner: 'AcrB', adaptor: 'AcrA', outer: 'TolC', group: 'ent' },
      presets: [['Susceptible reference', []], ['ESBL only', ['esbl']], ['AmpC only', ['ampc']], ['ESBL + porin loss', ['esbl', 'porin']], ['NDM only', ['ndm']]],
      caveat: 'Carbapenem resistance in E. coli is uncommon and usually needs a carbapenemase such as NDM, or an ESBL / AmpC combined with porin loss.'
    },
    ab: {
      id: 'ab', name: 'Acinetobacter baumannii', gram: 'Gram-negative · non-fermenter · coccobacillus',
      mechs: ['oxa23', 'ndm', 'ampc', 'porin', 'efflux', 'target'], abx: ['mem', 'imi', 'fep', 'caz'],
      porin: { name: 'CarO / OprD-like', group: 'ab' }, pump: { name: 'AdeABC', inner: 'AdeB', adaptor: 'AdeA', outer: 'AdeC', group: 'ab' },
      presets: [['Susceptible reference', []], ['OXA-23 only', ['oxa23']], ['NDM only', ['ndm']], ['OXA-23 + efflux', ['oxa23', 'efflux']], ['OXA-23 + porin loss + efflux', ['oxa23', 'porin', 'efflux']]],
      caveat: 'Intrinsic AmpC (ADC) overexpression and altered PBPs are reported in Acinetobacter; they are drawn here as separate, optional mechanisms.'
    }
  };

  /* retention of drug entry when the relevant porin is lost (1 = unaffected) */
  const PORIN_KEEP = {
    pa: { mem: .55, imi: .15, fep: .95, caz: .95 },
    ent: { mem: .75, imi: .75, etp: .35, fep: .7, caz: .6, cro: .5 },
    ab: { mem: .7, imi: .6, fep: .9, caz: .9 }
  };
  /* fraction of entered drug extruded when the pump is present */
  const PUMP_EFF = {
    pa: { mem: .45, imi: .05, fep: .35, caz: .4 },
    ent: { mem: .1, imi: .05, etp: .2, fep: .15, caz: .2, cro: .3 },
    ab: { mem: .3, imi: .2, fep: .4, caz: .4 }
  };
  /* fraction of the drug that reaches the enzyme that it hydrolyses */
  const HYD = {
    ndm: { mem: .8, imi: .8, etp: .85, fep: .8, caz: .85, cro: .85 },
    kpc: { mem: .75, imi: .75, etp: .8, fep: .7, caz: .75, cro: .85 },
    oxa48: { mem: .3, imi: .5, etp: .5, fep: .05, caz: .05, cro: .1 },
    oxa23: { mem: .4, imi: .5, fep: .05, caz: .05 },
    esbl: { mem: 0, imi: 0, etp: .15, fep: .3, caz: .55, cro: .8 },
    ampc: { mem: 0, imi: 0, etp: .2, fep: .15, caz: .7, cro: .75 }
  };
  const BIND_KEEP = .35;   /* binding retained by an altered (hypothetical) PBP */
  const POOR = .08;        /* below this an enzyme is "present but a poor substrate match" for the drug */

  const clamp01 = x => Math.max(0, Math.min(1, x));

  function evaluate(orgId, abxId, on) {
    const o = ORGS[orgId], a = ABX[abxId], set = on instanceof Set ? on : new Set(Array.isArray(on) ? on : Object.keys(on || {}).filter(k => on[k]));
    const grp = o.porin.group, pump = o.pump.group;
    const porinOn = set.has('porin'), effOn = set.has('efflux'), tgtOn = set.has('target');
    const enzymes = o.mechs.filter(m => MECH[m].kind === 'enzyme' && set.has(m));
    const enter = porinOn ? (PORIN_KEEP[grp][abxId] == null ? 1 : PORIN_KEEP[grp][abxId]) : 1;
    const eff = effOn ? (PUMP_EFF[pump][abxId] || 0) : 0;
    const effluxed = enter * eff, rem = enter - effluxed;
    let keep = 1; const hs = {}; enzymes.forEach(e => { const h = (HYD[e] && HYD[e][abxId]) || 0; hs[e] = h; keep *= 1 - h; });
    const hTot = 1 - keep, hydrolysed = rem * hTot, active = rem - hydrolysed;
    const bound = active * (tgtOn ? BIND_KEEP : 1), weak = active - bound;
    const fr = { noEntry: 1 - enter, efflux: effluxed, hydro: hydrolysed, weak, bound };
    const engagement = clamp01(bound);
    const outcome = engagement >= .7 ? 'blocked' : engagement >= .35 ? 'partial' : 'survive';
    /* which enzyme classes do the hydrolysis (share of hydrolysed drug) */
    const share = {}; let sum = 0; enzymes.forEach(e => { sum += hs[e]; }); enzymes.forEach(e => { share[e] = sum ? hs[e] / sum : 0; });
    const cls = { metallo: 0, serine: 0 }; enzymes.forEach(e => { cls[MECH[e].cls] += share[e]; });
    const poor = enzymes.filter(e => hs[e] < POOR);
    return { org: orgId, abx: abxId, set, fr, enter, engagement, outcome, hTot, hs, share, cls, poor, enzymes, porinOn, effOn, tgtOn, n: set.size, abxCls: a.cls };
  }

  /* all 2^N combinations for an organism and antibiotic */
  function permutations(orgId, abxId) {
    const ms = ORGS[orgId].mechs, out = [];
    for (let m = 0; m < (1 << ms.length); m++) { const s = ms.filter((_, i) => m & (1 << i)); out.push(Object.assign(evaluate(orgId, abxId, s), { mask: m })); }
    return out;
  }

  /* apportion k tokens across the fates (largest remainder; any fate >= 6% shows at least one token) */
  const FATE_ORDER = ['efflux', 'hydro', 'weak', 'noEntry', 'bound'];
  function tokens(fr, k) {
    k = k || 6; const raw = FATE_ORDER.map(f => fr[f] * k), cnt = raw.map(Math.floor); let left = k - cnt.reduce((a, b) => a + b, 0);
    raw.map((r, i) => [r - cnt[i], i]).sort((a, b) => b[0] - a[0]).forEach(([_, i]) => { if (left > 0) { cnt[i]++; left--; } });
    FATE_ORDER.forEach((f, i) => { if (fr[f] >= .06 && cnt[i] === 0) { let j = cnt.indexOf(Math.max(...cnt)); if (cnt[j] > 1) { cnt[j]--; cnt[i]++; } } });
    const o = {}; FATE_ORDER.forEach((f, i) => { o[f] = cnt[i]; }); return o;
  }

  function mechInfo(orgId, mechId) {
    const o = ORGS[orgId], m = MECH[mechId];
    if (m.kind === 'efflux') return Object.assign({}, m, { name: 'Efflux pump (' + o.pump.name + ')', full: o.pump.name + ' RND efflux system: ' + o.pump.inner + ' (inner-membrane transporter), ' + o.pump.adaptor + ' (periplasmic adaptor), ' + o.pump.outer + ' (outer-membrane channel)' });
    if (m.kind === 'porin') return Object.assign({}, m, { name: 'Porin loss (' + o.porin.name + ')', full: o.porin.name + ' channel absent or reduced' });
    if (m.kind === 'target') return Object.assign({}, m, { full: 'Altered penicillin-binding protein (modified binding site)' });
    return m;
  }

  /* what one mechanism does on its own for this drug (used for hints and teaching notes) */
  function alone(orgId, abxId, mechId) { return evaluate(orgId, abxId, [mechId]); }
  function hint(orgId, abxId, mechId) {
    const r = alone(orgId, abxId, mechId), d = Math.round((1 - r.engagement) * 100), m = MECH[mechId], a = ABX[abxId], o = ORGS[orgId];
    if (m.kind === 'enzyme') return r.hs[mechId] < POOR ? 'Poor substrate match: ' + a.name + ' is barely hydrolysed by this enzyme' : 'On its own: ' + d + '% less drug engages the target';
    if (m.kind === 'porin') return d < 8 ? o.porin.name + ' is not the main route for ' + a.name + ': little effect' : 'On its own: ' + d + '% less drug engages the target';
    if (m.kind === 'efflux') return d < 8 ? a.name + ' is a poor ' + o.pump.name + ' substrate: little effect' : 'On its own: ' + d + '% less drug engages the target';
    return 'Hypothetical: ' + d + '% less drug engages the target';
  }

  const OUT = {
    blocked: { label: 'Cell wall synthesis largely blocked', short: 'Susceptible-like', tone: 'ok' },
    partial: { label: 'Activity partly reduced', short: 'Partly reduced', tone: 'warn' },
    survive: { label: 'Survival favoured', short: 'Resistant-like', tone: 'bad' }
  };
  const FATE_TXT = { noEntry: 'Never entered', efflux: 'Pumped out', hydro: 'Hydrolysed', weak: 'Reached target, weak binding', bound: 'Bound PBP target' };

  M.res = { ABX, MECH, ORGS, PORIN_KEEP, PUMP_EFF, HYD, BIND_KEEP, POOR, evaluate, permutations, tokens, mechInfo, hint, alone, OUT, FATE_TXT, FATE_ORDER };
})();
