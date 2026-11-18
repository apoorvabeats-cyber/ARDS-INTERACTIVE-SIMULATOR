/* MICRO pharm: antibiotic and resistance-mechanism database, a simple fate model, and a multi-panel 3D "mini cell" animator.
   All weights are illustrative teaching values, NOT MICs or clinical susceptibility predictions. Depends on three.js r128 and micro/organisms.js (MICRO.gx). */
(function () {
  'use strict';
  const T = THREE, M = (window.MICRO = window.MICRO || {}), G = M.gx, V = (x, y, z) => new T.Vector3(x, y, z);

  /* ------------------------------------------------------------ data */
  const DRUGS = [
    { id: 'tzp', name: 'Piperacillin-tazobactam', cls: 'β-lactam + inhibitor', tgt: 'pbp', entry: 'porin', col: 0x6ec8ff },
    { id: 'caz', name: 'Ceftazidime', cls: 'Cephalosporin (3rd gen)', tgt: 'pbp', entry: 'porin', col: 0x6ec8ff },
    { id: 'cro', name: 'Ceftriaxone', cls: 'Cephalosporin (3rd gen)', tgt: 'pbp', entry: 'porin', col: 0x6ec8ff },
    { id: 'fep', name: 'Cefepime', cls: 'Cephalosporin (4th gen)', tgt: 'pbp', entry: 'porin', col: 0x6ec8ff },
    { id: 'mem', name: 'Meropenem', cls: 'Carbapenem', tgt: 'pbp', entry: 'porin', col: 0x4de3d0 },
    { id: 'ipm', name: 'Imipenem', cls: 'Carbapenem', tgt: 'pbp', entry: 'porin', col: 0x4de3d0 },
    { id: 'etp', name: 'Ertapenem', cls: 'Carbapenem', tgt: 'pbp', entry: 'porin', col: 0x4de3d0 },
    { id: 'ctz', name: 'Ceftolozane-tazobactam', cls: 'Cephalosporin + inhibitor', tgt: 'pbp', entry: 'porin', col: 0x8ab8ff },
    { id: 'cza', name: 'Ceftazidime-avibactam', cls: 'Cephalosporin + inhibitor', tgt: 'pbp', entry: 'porin', col: 0x8ab8ff },
    { id: 'fdc', name: 'Cefiderocol', cls: 'Siderophore cephalosporin', tgt: 'pbp', entry: 'sider', col: 0xffd24a },
    { id: 'amk', name: 'Amikacin', cls: 'Aminoglycoside', tgt: 'ribo', entry: 'self', col: 0xffa14a },
    { id: 'tob', name: 'Tobramycin', cls: 'Aminoglycoside', tgt: 'ribo', entry: 'self', col: 0xffa14a },
    { id: 'gen', name: 'Gentamicin', cls: 'Aminoglycoside', tgt: 'ribo', entry: 'self', col: 0xffa14a },
    { id: 'cip', name: 'Ciprofloxacin', cls: 'Fluoroquinolone', tgt: 'gyr', entry: 'diffuse', col: 0xc08cff },
    { id: 'col', name: 'Colistin', cls: 'Polymyxin', tgt: 'lps', entry: 'lps', col: 0xff6fa8 },
    { id: 'pmb', name: 'Polymyxin B', cls: 'Polymyxin', tgt: 'lps', entry: 'lps', col: 0xff6fa8 },
    { id: 'tgc', name: 'Tigecycline', cls: 'Glycylcycline', tgt: 'ribo', entry: 'diffuse', col: 0xffe066 },
    { id: 'sxt', name: 'Trimethoprim-sulfamethoxazole', cls: 'Folate-pathway inhibitor', tgt: 'fol', entry: 'diffuse', col: 0x9aff9a }
  ];
  const DRUG = Object.fromEntries(DRUGS.map(d => [d.id, d]));
  const TGT = { pbp: 'penicillin-binding proteins (PBPs)', ribo: '30S ribosomal subunit', gyr: 'DNA gyrase / topoisomerase IV', lps: 'lipid A of LPS', fol: 'folate-synthesis enzymes (DHPS and DHFR)' };
  const KILL = {
    pbp: ['Drug crosses the outer membrane through a porin.', 'It binds the active serine of PBPs and blocks peptidoglycan cross-linking.', 'The wall weakens while the cell keeps growing, and the cell swells and lyses.'],
    ribo: ['Drug crosses the outer membrane (aminoglycosides disturb LPS to enter; tigecycline diffuses).', 'It binds the 30S subunit and blocks or corrupts protein synthesis.', 'Faulty proteins and stalled translation damage the cell; aminoglycosides are bactericidal, tigecycline is bacteriostatic.'],
    gyr: ['Drug diffuses through porins and the membranes.', 'It traps DNA gyrase and topoisomerase IV on DNA.', 'Double-strand breaks accumulate and the cell dies.'],
    lps: ['Cationic drug is attracted to negatively charged lipid A on the cell surface.', 'It displaces the stabilising cations and inserts into the outer membrane.', 'The membrane becomes leaky, contents escape and the cell dies.'],
    fol: ['Drugs diffuse into the cell.', 'Sulfamethoxazole blocks DHPS and trimethoprim blocks DHFR, two steps of folate synthesis.', 'Thymidine and DNA precursors fall and growth stops (the combination can be bactericidal).']
  };
  const CATS = [['enz', 'Enzymatic destruction'], ['tgt', 'Target modification'], ['perm', 'Reduced permeability'], ['eff', 'Active efflux'], ['byp', 'Metabolic bypass'], ['prot', 'Target protection']];
  const MECH = {
    esbl: { cat: 'enz', name: 'ESBL (CTX-M type)', txt: 'A serine β-lactamase that hydrolyses penicillins and cephalosporins but spares carbapenems.' },
    ampc: { cat: 'enz', name: 'AmpC (derepressed)', txt: 'A chromosomal or plasmid serine β-lactamase hydrolysing cephalosporins; cefepime and carbapenems are relatively stable.' },
    kpc: { cat: 'enz', name: 'KPC carbapenemase', txt: 'A serine carbapenemase that hydrolyses carbapenems and most β-lactams; avibactam inhibits it.' },
    oxa48: { cat: 'enz', name: 'OXA-48-like carbapenemase', txt: 'A class D carbapenemase with weak activity on cephalosporins; carbapenem MICs may stay near breakpoints.' },
    oxa23: { cat: 'enz', name: 'OXA-23 carbapenemase', txt: 'The commonest class D carbapenemase in Acinetobacter baumannii.' },
    ndm: { cat: 'enz', name: 'NDM metallo-β-lactamase', txt: 'A periplasmic zinc enzyme that hydrolyses almost all β-lactams. Avibactam does not inhibit it.' },
    ame: { cat: 'enz', name: 'Aminoglycoside-modifying enzyme', txt: 'Acetyl-, phospho- or adenylyl-transferases add a group to the drug so it no longer binds the ribosome.' },
    porin: { cat: 'perm', name: 'Porin loss or narrowing', txt: 'Fewer or narrower outer-membrane channels (OprD, OmpK35 / OmpK36) lower entry of small hydrophilic drugs.' },
    eff: { cat: 'eff', name: 'RND efflux up-regulation', txt: 'Tripartite pumps (MexAB-OprM, AcrAB-TolC, AdeABC) expel many drugs, so less reaches the target.' },
    pbp: { cat: 'tgt', name: 'Altered PBP', txt: 'Lower β-lactam affinity of a PBP. Hypothetical for most Gram-negatives; not the usual carbapenem route.' },
    rmt: { cat: 'tgt', name: '16S rRNA methyltransferase (RmtB, ArmA)', txt: 'Methylation of the 30S A-site blocks aminoglycoside binding and gives high-level resistance.' },
    gyr: { cat: 'tgt', name: 'gyrA / parC mutation', txt: 'Amino acid changes in the quinolone-binding region lower drug binding.' },
    lipa: { cat: 'tgt', name: 'Lipid A modification (mcr, pmrAB, mgrB)', txt: 'Adding phosphoethanolamine or aminoarabinose reduces the negative charge so polymyxins bind poorly.' },
    qnr: { cat: 'prot', name: 'Qnr target protection', txt: 'A pentapeptide-repeat protein shields gyrase from quinolones; gives low-level resistance and helps selection of mutants.' },
    dfr: { cat: 'byp', name: 'dfr / sul bypass enzymes', txt: 'Acquired drug-insensitive DHFR (dfr) or DHPS (sul) enzymes bypass the blocked step.' }
  };
  const MECH_ORDER = ['esbl', 'ampc', 'kpc', 'oxa48', 'oxa23', 'ndm', 'ame', 'pbp', 'rmt', 'gyr', 'lipa', 'porin', 'eff', 'byp', 'qnr', 'dfr'].filter(k => MECH[k]);
  /* w[mech][drug] = fraction of the drug neutralised by that mechanism (teaching value) */
  const W = {
    esbl: { tzp: .3, caz: .9, cro: .95, fep: .6, mem: .02, ipm: .02, etp: .05, ctz: .05, cza: .02, fdc: .02 },
    ampc: { tzp: .8, caz: .9, cro: .95, fep: .2, mem: .05, ipm: .05, etp: .15, ctz: .05, cza: .02, fdc: .02 },
    kpc: { tzp: .85, caz: .95, cro: .95, fep: .9, mem: .8, ipm: .85, etp: .85, ctz: .9, cza: .05, fdc: .1 },
    oxa48: { tzp: .6, caz: .1, cro: .1, fep: .1, mem: .45, ipm: .5, etp: .6, ctz: .5, cza: .05, fdc: .05 },
    oxa23: { tzp: .5, caz: .4, cro: .4, fep: .4, mem: .85, ipm: .85, etp: .85, ctz: .3, cza: .2, fdc: .1 },
    ndm: { tzp: .95, caz: .95, cro: .95, fep: .95, mem: .95, ipm: .95, etp: .95, ctz: .95, cza: .95, fdc: .3 },
    ame: { amk: .4, tob: .6, gen: .7 },
    porin: { mem: .5, ipm: .8, etp: .6, tzp: .2, caz: .15, cro: .2, fep: .2, ctz: .1, cza: .1, fdc: .05, cip: .25, amk: .05, tob: .05, gen: .05 },
    eff: { tzp: .3, caz: .3, cro: .2, fep: .3, mem: .35, etp: .2, ctz: .15, cza: .15, fdc: .05, amk: .25, tob: .25, gen: .25, cip: .6, tgc: .65, sxt: .3 },
    pbp: { tzp: .25, caz: .25, cro: .25, fep: .25, mem: .25, ipm: .25, etp: .25, ctz: .25, cza: .25, fdc: .25 },
    rmt: { amk: .95, tob: .95, gen: .95 }, gyr: { cip: .8 }, lipa: { col: .9, pmb: .9 }, qnr: { cip: .3 }, dfr: { sxt: .9 }
  };
  const CAV = {
    'ndm|cza': 'Avibactam does not inhibit metallo-β-lactamases, so ceftazidime-avibactam alone does not overcome NDM.',
    'ndm|fdc': 'Cefiderocol is relatively stable to NDM, but MICs can still rise and other mechanisms (siderophore-receptor changes) matter.',
    'kpc|cza': 'Avibactam inhibits KPC, which is why this combination restores activity against KPC producers.',
    'esbl|mem': 'Carbapenems are stable to ESBLs, so ESBL alone does not explain carbapenem failure.',
    'ampc|mem': 'Carbapenems are stable to AmpC; resistance needs extra changes such as porin loss.',
    'porin|ipm': 'OprD loss is especially relevant to imipenem in Pseudomonas; meropenem is less affected.',
    'eff|ipm': 'Imipenem is not a MexAB-OprM substrate, so efflux adds little for it.',
    'eff|mem': 'MexAB-OprM extrudes meropenem, so efflux can raise its MIC.',
    'ampc|fep': 'Cefepime is relatively stable to AmpC.',
    'pbp|mem': 'Altered PBPs are not the usual carbapenem-resistance route in Gram-negatives; this is shown as a hypothetical mechanism.',
    'lipa|col': 'mcr-1 and chromosomal changes in pmrAB / mgrB modify lipid A and reduce polymyxin binding.',
    'rmt|amk': 'rRNA methylation confers high-level resistance to all aminoglycosides, including amikacin.',
    'ame|amk': 'Amikacin escapes many aminoglycoside-modifying enzymes, so the effect is smaller than for gentamicin.',
    'dfr|sxt': 'Acquired dfr and sul genes provide a drug-insensitive route around the blocked folate step.',
    'qnr|cip': 'Qnr gives low-level resistance, but it facilitates selection of higher-level mutations.'
  };
  const ORGS = {
    pa: { name: 'Pseudomonas aeruginosa', drugs: ['tzp', 'caz', 'fep', 'mem', 'ipm', 'ctz', 'cza', 'fdc', 'amk', 'tob', 'cip', 'col', 'pmb'], enz: ['ampc', 'esbl', 'kpc', 'ndm'] },
    kp: { name: 'Klebsiella pneumoniae', drugs: ['cro', 'fep', 'tzp', 'mem', 'etp', 'cza', 'fdc', 'amk', 'gen', 'cip', 'sxt', 'col', 'tgc'], enz: ['esbl', 'ampc', 'kpc', 'oxa48', 'ndm'] },
    ec: { name: 'Escherichia coli', drugs: ['cro', 'fep', 'tzp', 'mem', 'etp', 'cza', 'fdc', 'amk', 'gen', 'cip', 'sxt', 'col', 'tgc'], enz: ['esbl', 'ampc', 'kpc', 'oxa48', 'ndm'] },
    ab: { name: 'Acinetobacter baumannii', drugs: ['mem', 'ipm', 'fdc', 'amk', 'tob', 'cip', 'col', 'pmb', 'tgc', 'sxt'], enz: ['oxa23', 'ampc', 'ndm'] },
    en: { name: 'Enterobacter cloacae complex', drugs: ['cro', 'fep', 'tzp', 'mem', 'etp', 'cza', 'fdc', 'amk', 'gen', 'cip', 'sxt', 'col', 'tgc'], enz: ['ampc', 'esbl', 'kpc', 'ndm'] },
    sm: { name: 'Serratia marcescens', drugs: ['cro', 'fep', 'tzp', 'mem', 'etp', 'cza', 'fdc', 'amk', 'gen', 'cip', 'sxt', 'col', 'tgc'], enz: ['ampc', 'esbl', 'kpc', 'ndm'], intr: { col: { tgt: .98, txt: 'Serratia is intrinsically resistant to polymyxins (lipid A modification, arn operon).' }, pmb: { tgt: .98, txt: 'Serratia is intrinsically resistant to polymyxins.' } } }
  };
  /* which mechanisms the user can toggle for an organism */
  function mechsFor(org) { const o = ORGS[org]; return MECH_ORDER.filter(k => MECH[k].cat !== 'enz' || o.enz.includes(k) || k === 'ame').filter(k => !(k === 'oxa23' && org !== 'ab')); }

  const comb = a => 1 - a.reduce((p, x) => p * (1 - x), 1);
  const FATE = ['noEntry', 'eff', 'hydro', 'notBound', 'bypass', 'kill'];
  const FATE_TXT = { noEntry: 'blocked at the outer membrane', eff: 'pumped out by efflux', hydro: 'hydrolysed by an enzyme', notBound: 'does not bind its target', bypass: 'binds but the pathway is bypassed', kill: 'reaches and inhibits its target' };
  function evaluate(org, drugId, set) {
    const o = ORGS[org], d = DRUG[drugId], S = [...set]; const notes = [];
    const pick = cat => S.filter(m => MECH[m].cat === cat && W[m] && W[m][drugId] > 0);
    const wOf = m => W[m][drugId];
    const perm = comb(pick('perm').map(wOf)), eff = comb(pick('eff').map(wOf)), enzL = pick('enz'), enz = comb(enzL.map(wOf));
    let tg = pick('tgt').map(wOf), pr = pick('prot').map(wOf); const byp = comb(pick('byp').map(wOf));
    const intr = o.intr && o.intr[drugId]; if (intr) { tg.push(intr.tgt); notes.push({ id: 'intrinsic', name: 'Intrinsic', w: intr.tgt, txt: intr.txt }); }
    const tgt = comb(tg), prot = comb(pr);
    S.forEach(m => { const w = W[m] && W[m][drugId]; const key = m + '|' + drugId; if (w > 0) notes.push({ id: m, name: MECH[m].name, w, txt: CAV[key] || MECH[m].txt }); else if (CAV[key] || true) notes.push({ id: m, name: MECH[m].name, w: 0, txt: CAV[key] || 'Not a mechanism for ' + d.name + ': no effect in this model.' }); });
    const inn = 1 - perm, afterEff = inn * (1 - eff), afterEnz = afterEff * (1 - enz), engaged = afterEnz * (1 - tgt) * (1 - prot);
    const fr = { noEntry: perm, eff: inn * eff, hydro: afterEff * enz, notBound: afterEnz - engaged, bypass: engaged * byp, kill: engaged * (1 - byp) };
    const kill = fr.kill, level = kill >= .6 ? 'effective' : kill >= .25 ? 'reduced' : 'fails';
    return { fr, kill, level, notes, drug: d };
  }
  function tokens(fr, n) { /* largest-remainder apportionment with a minimum of one for any fate >= 6% */
    const raw = FATE.map(k => fr[k] * n), c = raw.map(Math.floor); FATE.forEach((k, i) => { if (fr[k] >= .06 && c[i] < 1) c[i] = 1; });
    let tot = c.reduce((a, b) => a + b, 0); const rem = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
    for (let j = 0; tot < n && j < rem.length * 3; j++) { c[rem[j % rem.length][1]]++; tot++; }
    while (tot > n) { let mi = -1, mv = 1e9; c.forEach((v, i) => { if (v > 1 && raw[i] < mv) { mv = raw[i]; mi = i; } }); if (mi < 0) break; c[mi]--; tot--; }
    const out = []; FATE.forEach((k, i) => { for (let j = 0; j < c[i]; j++) out.push(k); }); return out;
  }
  const dominant = fr => FATE.filter(k => k !== 'kill').concat(['kill']).reduce((a, k) => fr[k] > fr[a] + 1e-9 ? k : a, 'kill');
  const OUT = { effective: 'Killing likely in this model', reduced: 'Reduced activity in this model', fails: 'Fails in this model' };

  /* ------------------------------------------------------------ panel (3D mini cell) */
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const D_ = 14;
  const R = 1.25, LH = 1.5;
  const SITE = { porin: V(-.8, R, 0), sider: V(-1.5, R, 0), diffuse: V(.25, R, 0), self: V(-1.15, R, 0), lps: V(-1.0, R + .2, 0) };
  const PUMP = V(1.15, R, 0), ENZ = V(-.1, 1.15, 0);
  const TARGET = { pbp: [V(-.8, 1.0, 0), V(-.6, 1.0, .1), V(-.4, 1.0, -.1)], ribo: [V(.3, .3, 0), V(.6, .5, .1), V(.5, .0, -.1)], gyr: [V(-.6, -.1, 0), V(-.4, .1, .1), V(-.8, .1, -.1)], fol: [V(.9, -.3, 0), V(1.0, -.5, .1), V(.8, -.5, -.1)], lps: [V(-1.0, 1.32, .0), V(-.8, 1.32, .15), V(-1.2, 1.32, -.1)] };
  const mk = (geo, col, o) => new T.Mesh(geo, new T.MeshStandardMaterial(Object.assign({ color: col, roughness: .45 }, o || {})));
  const glassM = (c, op) => new T.MeshStandardMaterial({ color: c, roughness: .25, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide });
  function sprite(txt, col) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.strokeStyle = col; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); if (txt === 'x') { x.moveTo(14, 14); x.lineTo(50, 50); x.moveTo(50, 14); x.lineTo(14, 50); } else { x.moveTo(12, 34); x.lineTo(27, 49); x.lineTo(53, 16); } x.stroke(); const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.set(.8, .8, 1); s.renderOrder = 9; return s; }

  function Panel(el) {
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, .1, 60); scene.add(new T.HemisphereLight(0xcfe8ff, 0x1a2433, .95)); const k = new T.DirectionalLight(0xffffff, 1.1); k.position.set(3, 5, 7); scene.add(k);
    const rr = G.rngf(5), cell = new T.Group(), twin = new T.Group(); scene.add(cell, twin);
    const shells = (grp) => { const om = mk(G.capsuleGeo(2 * LH, R, 36), 0x6fe0cf, { transparent: true, opacity: .22, depthWrite: false, side: T.DoubleSide }); const pg = new T.Mesh(G.capsuleGeo(2 * LH, R * .93, 24), new T.MeshBasicMaterial({ color: 0xb9f0ff, wireframe: true, transparent: true, opacity: .3 })); const im = mk(G.capsuleGeo(2 * LH, R * .84, 30), 0xffe6a8, { transparent: true, opacity: .2, depthWrite: false, side: T.DoubleSide }); [om, pg, im].forEach(m => { m.rotation.z = Math.PI / 2; grp.add(m); }); return { om, pg, im }; };
    const main = shells(cell); shells(twin); twin.visible = false;
    /* LPS fringe */
    const lps = G.hairs(Array.from({ length: 90 }, () => { const c = G.capPoint(2 * LH, R, rr); return { p: V(-c.p.y, c.p.x, c.p.z), n: V(-c.n.y, c.n.x, c.n.z) }; }), .16, .012, 0xff9ec8, .85); cell.add(lps);
    /* interior */
    const dnaGroup = new T.Group(); const dna = G.nucleoid(2.4, 1.3, 0xe8f0ff, 3, 18); dna.rotation.z = Math.PI / 2; dna.position.set(-.35, 0, -.1); dnaGroup.add(dna); cell.add(dnaGroup);
    const frags = new T.Group(); for (let i = 0; i < 7; i++) { const f = G.tubeAlong([V(0, 0, 0), V(.3, .1, 0), V(.5, -.1, .1)], .035, 0xe8f0ff, 10); f.userData.d = V((rr() - .5) * 2.4, (rr() - .5) * 1.4, (rr() - .5) * .6); f.userData.r = rr() * 6; frags.add(f); } frags.visible = false; cell.add(frags);
    const riboPos = Array.from({ length: 150 }, () => { const a = rr() * 6.28, rad = Math.sqrt(rr()) * .8; return V((rr() - .5) * 4.6, Math.cos(a) * rad, Math.min(.25, Math.sin(a) * rad)); });
    const ribo = G.dots(150, i => riboPos[i], .075, 0xff8fb8, .95); cell.add(ribo);
    const meth = G.dots(26, i => riboPos[i * 3 % 150].clone().add(V(.04, .04, .04)), .11, 0xffe14a, 1); meth.visible = false; cell.add(meth);
    const fol = []; [[.9, -.3, 0], [1.05, -.5, .1], [.8, -.5, -.1], [1.15, -.25, .1], [.7, -.25, .1]].forEach(q => { const m = mk(new T.SphereGeometry(.14, 12, 10), 0x6fd8e8, { emissive: 0x06303a, emissiveIntensity: .4 }); m.position.set(...q); cell.add(m); fol.push(m); });
    const byp = []; [[1.3, -.2, .15], [1.45, -.35, .1]].forEach(q => { const m = mk(new T.SphereGeometry(.13, 12, 10), 0x7dff9a, { emissive: 0x0a4a1a, emissiveIntensity: .5 }); m.position.set(...q); m.visible = false; cell.add(m); byp.push(m); });
    const qshield = mk(new T.TorusGeometry(.75, .05, 8, 28), 0x7dff9a, { emissive: 0x0a4a1a, emissiveIntensity: .5 }); qshield.position.set(-.5, 0, 0); qshield.rotation.y = Math.PI / 2; qshield.visible = false; cell.add(qshield);
    const gyrMut = mk(new T.SphereGeometry(.16, 12, 10), 0xff8a3a); gyrMut.position.set(-.6, .1, .1); gyrMut.visible = false; cell.add(gyrMut);
    /* envelope proteins */
    const porins = []; [-1.0, -.8, -.6].forEach(x => { const t = mk(new T.TorusGeometry(.12, .045, 8, 16), 0x39c6ff, { emissive: 0x06304a, emissiveIntensity: .6 }); t.position.set(x, R, 0); t.rotation.x = Math.PI / 2; cell.add(t); porins.push(t); });
    const patch = mk(new T.CylinderGeometry(.34, .34, .06, 18), 0x4a5a66); patch.position.set(-.8, R + .01, 0); patch.visible = false; cell.add(patch);
    const tbdr = mk(new T.TorusGeometry(.2, .06, 8, 18), 0xffd24a, { emissive: 0x6b5200, emissiveIntensity: .5 }); tbdr.position.set(-1.5, R, 0); tbdr.rotation.x = Math.PI / 2; cell.add(tbdr);
    const pumps = []; [1.15, .85, 1.45].forEach((x, i) => { const g = new T.Group(); const a = mk(new T.CylinderGeometry(.11, .11, .55, 10, 1, true), 0xffb347, { side: T.DoubleSide }), b = mk(new T.CylinderGeometry(.07, .07, .35, 10), 0xff8a4a), c = mk(new T.CylinderGeometry(.16, .16, .3, 10), 0xe04a3a); a.position.y = R; b.position.y = R - .38; c.position.y = R - .65; g.add(a, b, c); g.position.x = x; g.userData.i = i; cell.add(g); pumps.push(g); });
    const enzs = []; [-.1, .3, -.45].forEach((x, i) => { const g = new T.Group(), m = mk(new T.IcosahedronGeometry(.17, 1), 0xff7a3d, { emissive: 0x4a1800, emissiveIntensity: .4 }); g.add(m); const z1 = mk(new T.SphereGeometry(.045, 8, 6), 0xe8f0ff); z1.position.set(.06, .03, .14); const z2 = z1.clone(); z2.position.x = -.06; z1.name = z2.name = 'zn'; g.add(z1, z2); g.position.set(x, 1.15, 0); cell.add(g); enzs.push(g); });
    const pbps = []; [-.8, -.6, -.4].forEach(x => { const g = new T.Group(), st = mk(new T.CylinderGeometry(.05, .05, .2, 8), 0x4a8dff), hd = mk(new T.SphereGeometry(.11, 10, 8), 0x4a8dff, { emissive: 0x001a40, emissiveIntensity: .5 }); st.position.y = -.06; hd.position.y = .08; g.add(st, hd); g.position.set(x, 1.0, 0); g.userData.hd = hd; cell.add(g); pbps.push(g); });
    /* drug particles */
    const NP = 8, parts = []; for (let i = 0; i < NP; i++) { const g = new T.Group(), s = mk(new T.SphereGeometry(.14, 14, 10), 0xffffff, { emissive: 0x333333, emissiveIntensity: .5 }), ring = new T.Mesh(new T.TorusGeometry(.14, .035, 6, 14), new T.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = Math.PI / 2; ring.position.y = .02; const fe = mk(new T.SphereGeometry(.06, 8, 6), 0xffd24a, { emissive: 0x6b5200, emissiveIntensity: .8 }); fe.position.set(.16, .1, 0); g.add(s, ring, fe); g.userData = { s, ring, fe }; scene.add(g); parts.push(g); }
    const xs = Array.from({ length: NP }, () => { const s = sprite('x', '#ff5a4e'); scene.add(s); return s; }), okS = Array.from({ length: NP }, () => { const s = sprite('ok', '#4dffa0'); scene.add(s); return s; });
    const burst = G.dots(40, i => V(0, 0, 0), .09, 0xffc8d8, .9); burst.visible = false; scene.add(burst); const bp = burst.geometry.attributes.position;
    const leak = G.dots(18, i => V(0, 0, 0), .09, 0xffe8a0, .9); leak.visible = false; scene.add(leak); const lp = leak.geometry.attributes.position;
    const flash = new T.Mesh(new T.SphereGeometry(.2, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); scene.add(flash);
    const P = { el, scene, cam, st: null, drug: null, fates: [], cap: [], K: 0 };
    P.set = function (org, drugId, mset) {
      const d = DRUG[drugId], ev = evaluate(org, drugId, mset), S = new Set(mset), intr = ORGS[org].intr && ORGS[org].intr[drugId]; P.st = ev; P.drug = d; P.fates = tokens(ev.fr, NP); P.K = ev.kill; P.org = org;
      const has = m => S.has(m);
      porins.forEach(p => { p.visible = !has('porin'); }); patch.visible = has('porin'); patch.position.x = -.8;
      pumps.forEach((g, i) => { g.visible = has('eff') || i === 0; g.children.forEach(c => { c.material.opacity = has('eff') || i ? 1 : .6; c.material.transparent = !has('eff') && i === 0; c.material.emissive.setHex(has('eff') ? 0x6a2200 : 0x000000); }); });
      const enzSel = [...S].filter(m => MECH[m].cat === 'enz'); enzs.forEach(g => { g.visible = enzSel.length > 0; g.children.forEach(c => { if (c.name === 'zn') c.visible = has('ndm'); }); });
      pbps.forEach(g => { g.userData.hd.material.color.setHex(has('pbp') ? 0xa06aff : 0x4a8dff); g.userData.hd.scale.set(has('pbp') ? .8 : 1, has('pbp') ? 1.2 : 1, 1); });
      meth.visible = has('rmt'); gyrMut.visible = has('gyr'); qshield.visible = has('qnr'); byp.forEach(b => { b.visible = has('dfr'); });
      lps.traverse(o => { if (o.material) o.material.color.setHex(has('lipa') || intr ? 0xffa64a : 0xff9ec8); });
      tbdr.material.emissiveIntensity = d.entry === 'sider' ? 1 : .15; tbdr.scale.setScalar(d.entry === 'sider' ? 1.3 : .8);
      parts.forEach(g => { g.userData.s.material.color.setHex(d.col); g.userData.s.material.emissive.setHex(d.col); g.userData.s.material.emissiveIntensity = .45; g.userData.ring.material.color.setHex(d.col); g.userData.fe.visible = d.entry === 'sider'; });
      /* caption steps */
      const dom = dominant(ev.fr), ent = { porin: 'Enters through a porin channel', sider: 'Binds iron and enters through the siderophore receptor', diffuse: 'Diffuses across the membranes', self: 'Crosses the outer membrane (self-promoted uptake)', lps: 'Binds negatively charged lipid A on the surface' }[d.entry];
      const why = { noEntry: 'Most molecules cannot enter: reduced permeability', eff: 'Most molecules are pumped out by efflux', hydro: 'Most molecules are destroyed by an enzyme', notBound: 'Most molecules reach the target but cannot bind it', bypass: 'The target is bound but the pathway is bypassed', kill: 'Molecules reach and inhibit ' + TGT[d.tgt] }[dom];
      P.cap = [[0, d.name + ' approaches the cell'], [2, ent], [3.4, why], [6, OUT[ev.level] + ' (' + Math.round(ev.kill * 100) + '% of molecules effective)']];
      P.dom = dom;
    };
    P.update = function (t, aspect) {
      const d = P.drug; if (!d) return; const K = P.K, dies = K >= .5, tg = d.tgt, E = SITE[d.entry];
      const survive = !dies, fp = survive ? ss(8.5, 12.8, t) : 0;
      cell.position.set(-fp * 1.55, 0, 0); cell.scale.set(1 - .46 * fp, 1, 1); twin.visible = fp > .01; twin.position.set(fp * 1.55, 0, 0); twin.scale.set(1 - .46 * fp, 1, 1);
      const rp = ss(6, 11, t) * (dies ? 1 : K * .7);
      cell.rotation.z = 0; let body = 1;
      main.om.material.opacity = .22; main.im.material.opacity = .2; main.pg.material.opacity = .3; ribo.material.color.setHex(0xff8fb8); dnaGroup.visible = true; frags.visible = false; leak.visible = false; burst.visible = false; fol.forEach(m => m.material.color.setHex(0x6fd8e8)); gyrMut.visible = gyrMut.visible;
      if (tg === 'pbp') { const bulge = 1 + .22 * rp * (1 + .15 * Math.sin(t * 9)); cell.scale.y = bulge; cell.scale.z = bulge; if (dies && t > 10.4) { const b = ss(10.4, 11.4, t); main.om.material.opacity = .22 * (1 - b); main.im.material.opacity = .2 * (1 - b); main.pg.material.opacity = .3 * (1 - b); burst.visible = b > .02 && b < 1.01; for (let i = 0; i < 40; i++) { const a = i * 2.399, q = b * (1.5 + (i % 5) * .5); bp.setXYZ(i, Math.cos(a) * q * 1.6, Math.sin(a * 1.3) * q * 1.1, Math.sin(a) * q * .6); } bp.needsUpdate = true; burst.material.opacity = (1 - b * .6) * .9; } }
      else if (tg === 'ribo') { ribo.material.color.lerp(new T.Color(0x602030), rp); cell.scale.y = 1 - .06 * rp; cell.scale.z = cell.scale.y; main.om.material.color.setHex(0x6fe0cf); }
      else if (tg === 'gyr') { dnaGroup.visible = rp < .4; frags.visible = rp >= .3; frags.children.forEach(f => { f.position.copy(f.userData.d.clone().multiplyScalar(rp)); f.rotation.z = f.userData.r * rp; }); main.om.material.opacity = .22 - .1 * rp; }
      else if (tg === 'lps') { leak.visible = rp > .15; cell.scale.y = 1 - .1 * rp; cell.scale.z = cell.scale.y; main.om.material.opacity = .22 * (1 - .6 * rp); for (let i = 0; i < 18; i++) { const q = ((t * .6 + i * .17) % 1) * rp; lp.setXYZ(i, -1.0 + Math.sin(i * 2.1) * .5 + Math.sin(i) * q * .4, 1.3 + q * 1.8, Math.cos(i * 1.7) * .3); } lp.needsUpdate = true; }
      else if (tg === 'fol') { fol.forEach(m => m.material.color.lerp(new T.Color(0xff4a4a), rp)); }
      /* enzymes jiggle, pumps pulse */
      enzs.forEach((g, i) => { g.rotation.y = t * 1.2 + i; g.rotation.x = Math.sin(t * 2 + i) * .3; });
      pumps.forEach((g, i) => { g.children[2].scale.y = 1 + .15 * Math.sin(t * 5 + i); });
      /* drug particles */
      const fates = P.fates; let xi = 0, oi = 0;
      parts.forEach((g, i) => {
        const f = fates[i], lt = t - (.25 + i * .5); let p = V(E.x + (i % 3 - 1) * .3, 4, 0), sc = 1, vis = lt > -.2; const x = xs[i], ok = okS[i]; x.visible = false; ok.visible = false;
        const S0 = V(E.x + ((i % 3) - 1) * .3 + (i % 2) * .15, 4.0 + (i % 4) * .2, (i % 3 - 1) * .2), Eo = V(E.x, R + .45, 0), Ei = d.entry === 'lps' ? Eo.clone() : V(E.x, 1.15, 0), at = TARGET[tg][i % 3];
        const seg = (a, b, t0, t1) => a.clone().lerp(b, ss(t0, t1, lt));
        g.userData.s.material.color.setHex(d.col); g.userData.s.material.emissive.setHex(d.col); g.userData.s.material.emissiveIntensity = .45; g.userData.ring.visible = true;
        if (tg === 'lps') {
          const bnd = V(at.x, at.y + .12, at.z); p = seg(S0, bnd, 0, 2.4);
          if (f === 'kill' || f === 'bypass') { if (lt > 2.4) { p = bnd.clone(); sc = 1 + .15 * Math.sin(lt * 6); } if (lt > 2.6 && lt < 3.8 && f === 'kill') { ok.visible = true; ok.position.set(bnd.x, bnd.y + .5, 0); } }
          else { if (lt > 2.4) { p = bnd.clone().lerp(V(bnd.x + .8, 3.4, 0), ss(2.4, 3.8, lt)); sc = 1 - ss(4, 5.5, lt); } if (lt > 2.2 && lt < 3.6) { x.visible = true; x.position.set(bnd.x, bnd.y + .5, 0); } }
        } else if (f === 'noEntry') {
          p = lt < 2 ? seg(S0, Eo, 0, 2) : lt < 3.2 ? Eo.clone().lerp(V(E.x + (i % 2 ? .6 : -.6), 2.7, 0), ss(2, 3.2, lt)) : V(E.x + (i % 2 ? .6 : -.6), 2.7, 0).lerp(V(E.x + (i % 2 ? 1.6 : -1.6), 4.2, 0), ss(3.2, 5.2, lt)); sc = 1 - ss(4.2, 5.5, lt); if (lt > 1.9 && lt < 3.4) { x.visible = true; x.position.set(E.x, R + .25, 0); }
        } else {
          if (lt < 2) p = seg(S0, Eo, 0, 2); else if (lt < 3.2) p = Eo.clone().lerp(Ei, ss(2, 3.2, lt)); else p = Ei.clone();
          if (d.entry === 'diffuse' && lt >= 2) { p = lt < 3.2 ? Eo.clone().lerp(V(E.x, .9, 0), ss(2, 3.2, lt)) : V(E.x, .9, 0); }
          if (f === 'eff') { if (lt >= 3.2) { const u = lt < 4.6 ? Ei.clone().lerp(V(PUMP.x, 1.15, 0), ss(3.2, 4.6, lt)) : lt < 5.6 ? V(PUMP.x, 1.15, 0).lerp(V(PUMP.x, R + .5, 0), ss(4.6, 5.6, lt)) : V(PUMP.x, R + .5, 0).lerp(V(PUMP.x + .4, 4.2, 0), ss(5.6, 7.4, lt)); p = u; sc = 1 - ss(6.8, 7.8, lt); } }
          else if (f === 'hydro') { if (lt >= 3.2) { p = lt < 4.5 ? Ei.clone().lerp(ENZ.clone().add(V((i % 3 - 1) * .15, 0, .1)), ss(3.2, 4.5, lt)) : ENZ.clone().add(V((i % 3 - 1) * .15, -ss(5, 7.5, lt) * .5, .1)); const h = ss(4.5, 5, lt); g.userData.s.material.color.lerp(new T.Color(0x666666), h); g.userData.s.material.emissive.setHex(h > .5 ? 0x111111 : d.col); g.userData.ring.visible = h < .5; sc = (1 - .4 * h) * (1 - ss(6.5, 8, lt)); if (lt > 4.5 && lt < 5.2) { flash.position.copy(p); flash.material.opacity = (1 - (lt - 4.5) / .7) * .9; flash.scale.setScalar(1 + (lt - 4.5) * 3); } } }
          else { /* reaches the target region */
            const mid = V(E.x, .9, 0); if (lt >= 3.2) { if (tg === 'pbp') p = Ei.clone().lerp(at, ss(3.2, 4.6, lt)); else p = lt < 4.2 ? Ei.clone().lerp(mid, ss(3.2, 4.2, lt)) : mid.clone().lerp(at, ss(4.2, 5.8, lt)); }
            const arr = tg === 'pbp' ? 4.6 : 5.8;
            if (f === 'kill' || f === 'bypass') { if (lt > arr) { sc = 1 + .12 * Math.sin(lt * 7); if (f === 'kill' && lt < arr + 1.2) { ok.visible = true; ok.position.set(at.x, at.y + .45, 0); } } }
            else { if (lt > arr) { const q = ss(arr, arr + 1.4, lt); p = at.clone().add(V(.5 * q * (i % 2 ? 1 : -1), .5 * q, .2)); sc = 1 - ss(arr + 1.5, arr + 3, lt); if (lt > arr - .1 && lt < arr + 1.4) { x.visible = true; x.position.set(at.x, at.y + .45, 0); } } }
          }
        }
        if (survive && t > 8.5) sc *= 1 - ss(8.5, 10, t);
        g.position.copy(p); g.scale.setScalar(Math.max(.001, sc)); g.visible = vis && sc > .01;
        g.children[1].rotation.z = lt * 2;
      });
      if (!(t > 4.5 && t < 5.2)) flash.material.opacity = 0;
      /* camera */
      const sway = Math.sin(t * .35) * .25; cam.aspect = aspect; cam.updateProjectionMatrix(); cam.position.set(sway, .3, Math.max(9.2, 3.1 / (.325 * aspect))); cam.lookAt(0, .3, 0);
    };
    P.dispose = () => { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); };
    return P;
  }

  /* ------------------------------------------------------------ stage: one canvas, several scissor viewports */
  function Stage(canvas, host) {
    let R; try { R = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return null; }
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.setClearColor(0x07121d, 1);
    const S = { R, panels: [], t: 0, playing: false, speed: 1, dirty: 30, loop: false, onTick: null };
    function size() { const w = host.clientWidth, h = host.clientHeight; R.setSize(w, h, false); S.dirty = 30; }
    addEventListener('resize', size); size(); if (window.ResizeObserver) new ResizeObserver(size).observe(host);
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (S.playing) { S.t += dt * S.speed; if (S.t >= D_) { if (S.loop) S.t = 0; else { S.t = D_; S.playing = false; } } S.dirty = 3; if (S.onTick) S.onTick(S.t); }
      if (S.dirty > 0) { S.dirty--; draw(); }
      requestAnimationFrame(frame);
    }
    function draw() {
      const hr = host.getBoundingClientRect(); R.setScissorTest(false); R.setViewport(0, 0, host.clientWidth, host.clientHeight); R.clear(); R.setScissorTest(true);
      S.panels.forEach(p => { if (!p.drug) return; const r = p.el.getBoundingClientRect(), x = r.left - hr.left, y = hr.bottom - r.bottom, w = r.width, h = r.height; if (w < 4 || h < 4) return; R.setViewport(x, y, w, h); R.setScissor(x, y, w, h); p.update(S.t, w / h); R.render(p.scene, p.cam); });
    }
    requestAnimationFrame(frame);
    S.add = el => { const p = Panel(el); S.panels.push(p); return p; };
    S.clear = () => { S.panels.forEach(p => p.dispose()); S.panels = []; };
    S.seek = t => { S.t = Math.max(0, Math.min(D_, t)); S.dirty = 20; if (S.onTick) S.onTick(S.t); };
    S.play = () => { if (S.t >= D_ - .01) S.t = 0; S.playing = true; };
    S.pause = () => { S.playing = false; };
    return S;
  }
  /* wire standard transport controls */
  function transport(S, ids) {
    const $ = id => document.getElementById(id); const f = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    const upd = () => { $(ids.play).textContent = S.playing ? 'Pause' : 'Play'; $(ids.scrub).value = Math.round(S.t / D_ * 1000); $(ids.time).textContent = f(S.t) + ' / ' + f(D_); };
    S.onTick = upd; $(ids.play).onclick = () => { S.playing ? S.pause() : S.play(); upd(); };
    $(ids.replay).onclick = () => { S.t = 0; S.playing = true; upd(); }; $(ids.scrub).oninput = e => { S.playing = false; S.seek(+e.target.value / 1000 * D_); upd(); };
    $(ids.speed).onclick = e => { const b = e.target.closest('.pill'); if (!b) return; S.speed = +b.dataset.v; document.querySelectorAll('#' + ids.speed + ' .pill').forEach(x => x.setAttribute('aria-pressed', x === b)); };
    upd(); return upd;
  }
  /* current caption for a panel at time t */
  function caption(p, t) { let c = ''; (p.cap || []).forEach(a => { if (t >= a[0]) c = a[1]; }); return c; }
  M.pharm = { DRUGS, DRUG, ORGS, MECH, MECH_ORDER, CATS, W, TGT, KILL, FATE, FATE_TXT, OUT, evaluate, tokens, mechsFor, Stage, transport, caption, DUR: D_ };
})();
