/* MICRO anatomy: cutaway whole-cell models and molecular envelope close-ups, with clickable structures.
   Schematic teaching models (not to scale). Depends on three.js r128 and micro/organisms.js (MICRO.gx). */
(function () {
  'use strict';
  const T = THREE, M = (window.MICRO = window.MICRO || {}), G = M.gx, V = (x, y, z) => new T.Vector3(x, y, z);
  const COL = { cap: 0xffd3e6, om: 0x6fe0cf, im: 0xffe6a8, pg: 0xb9f0ff, ribo: 0xff8fb8, dna: 0xe8f0ff, pla: 0xff9a2e, porin: 0x39c6ff, pump: 0xff7a3d, fl: 0xe8f0ff, pili: 0xcfe9ff };

  /* ------------------------------------------------------------ specs */
  const SPEC = {
    sa: { shape: 'coc', r: 1.7, wall: 'gp' }, mrsa: { shape: 'coc', r: 1.7, wall: 'gp', pbp2a: 1 }, ef: { shape: 'coc', r: 1.6, wall: 'gp', ovoid: 1.3 }, vre: { shape: 'coc', r: 1.6, wall: 'gp', ovoid: 1.3, van: 1 }, sp: { shape: 'coc', r: 1.5, wall: 'gp', cap: 1, ovoid: 1.2 },
    ec: { shape: 'rod', len: 3.4, r: 1.15, wall: 'gn', flag: 'peri', pili: 1 }, kp: { shape: 'rod', len: 2.6, r: 1.25, wall: 'gn', cap: 1, pili: 1 }, pa: { shape: 'rod', len: 3.6, r: 1.05, wall: 'gn', flag: 'polar', pili: 1 }, ab: { shape: 'rod', len: 1.6, r: 1.25, wall: 'gn', pili: 1 }, en: { shape: 'rod', len: 3.4, r: 1.1, wall: 'gn', flag: 'peri', pili: 1 }, sm: { shape: 'rod', len: 3.4, r: 1.1, wall: 'gn', flag: 'peri', pili: 1 },
    cd: { shape: 'rod', len: 4.0, r: 1.0, wall: 'gp', flag: 'peri', spore: 1 }, bf: { shape: 'rod', len: 3.2, r: 1.1, wall: 'gn', cap: 1 },
    mp: { shape: 'wl', r: 1.8, wall: 'none' }, lp: { shape: 'rod', len: 3.4, r: 1.0, wall: 'gn', flag: 'polar', pili: 1 }, cp: { shape: 'chl', r: 1.3, wall: 'chl' },
    ca: { shape: 'yeast', r: 1.6, wall: 'fungus' }, af: { shape: 'hypha', len: 4.6, r: 1.0, wall: 'fungus' }, tb: { shape: 'rod', len: 4.0, r: 0.95, wall: 'myco' }
  };

  /* ------------------------------------------------------------ part texts */
  const WALL = {
    gn: ['Outer membrane and peptidoglycan', 'The outer membrane (lipopolysaccharide outside, phospholipid inside) is a permeability barrier. A thin peptidoglycan layer sits in the periplasm and resists osmotic pressure.', 'β-lactams block peptidoglycan cross-linking by PBPs. Polymyxins bind LPS. The outer membrane keeps out large drugs such as vancomycin.'],
    gp: ['Thick peptidoglycan wall', 'A many-layered peptidoglycan mesh with teichoic and lipoteichoic acids. There is no outer membrane.', 'β-lactams reach PBPs directly. Vancomycin binds D-Ala-D-Ala on wall precursors. Daptomycin acts on the cell membrane.'],
    myco: ['Mycolic-acid wall', 'Peptidoglycan, arabinogalactan and an outer layer of long-chain mycolic acids: waxy, acid-fast and a slow route for drugs.', 'Isoniazid blocks mycolic-acid synthesis and ethambutol blocks arabinogalactan synthesis. Most β-lactams are weak here.'],
    fungus: ['Cell wall (glucan, chitin, mannoproteins)', 'A rigid wall of β-(1,3)-glucan and chitin with mannoproteins outside. It protects the cell from osmotic stress and carries antigens recognised by the host.', 'Echinocandins inhibit β-(1,3)-D-glucan synthase, so the wall weakens. Human cells have no wall.'],
    none: ['No cell wall', 'Mycoplasma have no peptidoglycan wall, only the cell membrane, so they are not stained by Gram stain and are pleomorphic.', 'β-lactams and glycopeptides have no target. Macrolides, tetracyclines and fluoroquinolones are used.'],
    chl: ['Outer and inner membranes', 'Chlamydiae have an outer and an inner membrane with cysteine-rich cross-linked proteins in the elementary body. There is no conventional peptidoglycan wall.', 'β-lactams are unreliable. Active drugs (tetracyclines, macrolides, quinolones) must also enter the host cell and its inclusion.']
  };
  const PI = {
    capsule: ['Capsule', 'A polysaccharide layer outside the wall. It hides surface antigens, blocks complement and phagocytosis, and supports adhesion and biofilm.', 'Not an antibiotic target. Capsule types are the basis of pneumococcal vaccines.'],
    membrane: ['Cell (inner) membrane', 'A phospholipid bilayer: selective barrier, transport, respiration and ATP generation. PBPs, efflux pumps and many transporters sit in or on it.', 'Daptomycin and polymyxins damage membranes. In fungi the membrane contains ergosterol (azole and polyene target).'],
    ribosome: ['Ribosome', 'Makes proteins. Bacterial 70S ribosomes have a 30S and a 50S subunit; fungal and human ribosomes are 80S.', 'Aminoglycosides, tetracyclines and tigecycline act on 30S. Macrolides, clindamycin, linezolid and chloramphenicol act on 50S.'],
    dna: ['DNA (nucleoid)', 'One circular chromosome, supercoiled by DNA gyrase and topoisomerase IV, copied by DNA polymerase and transcribed by RNA polymerase. There is no nuclear envelope in bacteria.', 'Fluoroquinolones trap gyrase and topoisomerase IV on DNA. Rifampicin blocks RNA polymerase. Metronidazole damages DNA in anaerobes.'],
    plasmid: ['Plasmid', 'Small circular DNA that replicates on its own. It can carry resistance genes such as blaNDM, blaKPC, blaCTX-M, mcr-1 and qnr, and moves between cells by conjugation.', 'The main route by which resistance spreads between bacteria and between species.'],
    porin: ['Porin', 'Water-filled β-barrel channels in the outer membrane (OprD, OmpF / OmpC, OmpK35 / OmpK36). Small hydrophilic molecules, including many β-lactams, enter through them.', 'Loss or narrowing of a porin lowers entry. OprD loss matters especially for imipenem in Pseudomonas.'],
    pump: ['Efflux pump', 'Tripartite RND pumps (MexAB-OprM, AcrAB-TolC) span both membranes and the periplasm. They are driven by the proton gradient and expel many drug classes.', 'Over-expression lowers drug accumulation. Substrates vary: MexAB-OprM handles meropenem but not imipenem.'],
    flagella: ['Flagellum', 'A helical filament turned by a rotary motor in the membrane. It gives motility and chemotaxis, and flagellin is recognised by host TLR5.', 'Not a drug target. Motility helps colonisation and biofilm spread.'],
    pili: ['Pili / fimbriae', 'Protein filaments for adhesion to host cells and surfaces (type 1, P and type IV pili). Conjugative pili connect cells for DNA transfer. Type IV pili allow twitching.', 'Adhesion is the first step of infection; conjugative pili spread plasmids carrying resistance.']
  };
  const ABS = {
    gp: { porin: 'Gram-positive cells have no outer membrane, so there are no porins. Drugs reach the wall and membrane directly.', capsule: 'This organism has no polysaccharide capsule in this model.', flagella: 'This organism is non-motile in this model.', pili: 'Pili are not shown for this organism.' },
    gn: { capsule: 'No capsule is drawn for this organism.', flagella: 'This organism is non-flagellated.', pili: 'Pili are not drawn for this organism.' },
    myco: { capsule: 'No true capsule. M. tuberculosis has a loose outer layer of polysaccharide and protein.', porin: 'Few, small channels cross the mycolic-acid layer, which is one reason entry is slow.', flagella: 'Mycobacteria are non-motile.', pili: 'Pili are not shown here.', plasmid: 'Resistance in M. tuberculosis comes from chromosomal mutations (rpoB, katG, inhA), not plasmids.' },
    wl: { wall: 'There is no cell wall in Mycoplasma. Only the cell membrane surrounds the cytoplasm.', capsule: 'No capsule.', porin: 'There is no outer membrane, so no porins.', flagella: 'Gliding motility uses the attachment organelle, not flagella.', pili: 'Attachment uses the tip organelle and P1 adhesin.', plasmid: 'Plasmids are rare in Mycoplasma.' },
    chl: { capsule: 'No capsule.', flagella: 'Chlamydiae are non-motile.', pili: 'A type III secretion needle (not pili) injects effectors into the host cell.', porin: 'Major outer membrane protein (MOMP) acts as a porin-like channel.' },
    fungus: { capsule: 'C. albicans has no polysaccharide capsule (Cryptococcus does). The mannoprotein layer is drawn as part of the wall.', porin: 'Fungi have no porins; small molecules cross the wall and membrane.', flagella: 'Fungi in this model are non-motile.', pili: 'Fungal adhesins (for example Als proteins) sit in the wall; no pili.', plasmid: 'Fungi lack bacterial resistance plasmids; resistance is chromosomal (ERG11 / cyp51A mutations) or by efflux up-regulation.', ribosome: null }
  };
  const TYPEKEY = { gp: 'gp', gn: 'gn', myco: 'myco', none: 'wl', chl: 'chl', fungus: 'fungus' };
  function partInfo(org, id) {
    const sp = SPEC[org], k = TYPEKEY[sp.wall];
    if (id === 'wall') { const w = WALL[sp.wall]; return { name: w[0], func: w[1], drug: w[2] }; }
    const p = PI[id]; let o = { name: p[0], func: p[1], drug: p[2] };
    if (id === 'ribosome' && sp.wall === 'fungus') o = { name: 'Ribosome (80S)', func: 'Fungal ribosomes are 80S, like human ones, so antibacterial ribosome drugs do not act on them.', drug: 'Not the target of antifungals used clinically; antibacterial 30S / 50S drugs are inactive.' };
    if (id === 'dna' && sp.wall === 'fungus') o = { name: 'Nucleus and DNA', func: 'Linear chromosomes inside a nuclear envelope; transcription and translation are separate.', drug: 'Flucytosine is converted to a fluorinated pyrimidine that disrupts DNA and RNA synthesis.' };
    if (id === 'membrane' && sp.wall === 'fungus') o = { name: 'Cell membrane (ergosterol)', func: 'A phospholipid bilayer rich in ergosterol, with glucan synthase and Erg11 enzymes.', drug: 'Azoles inhibit Erg11 (lanosterol demethylase). Polyenes bind ergosterol and form pores.' };
    if (id === 'membrane' && sp.wall === 'none') o = { name: 'Cell membrane (only barrier)', func: 'With no wall, the sterol-containing membrane is the only barrier; the attachment organelle at the tip binds respiratory epithelium.', drug: 'Cell-wall drugs (β-lactams, vancomycin) cannot act. Macrolides, tetracyclines and quinolones are used.' };
    const abs = (ABS[k] || {})[id]; if (abs) o.reason = abs; return o;
  }
  const WHOLE_IDS = ['capsule', 'wall', 'membrane', 'ribosome', 'dna', 'plasmid', 'porin', 'pump', 'flagella', 'pili'];
  function wholeList(org) {
    const out = WHOLE_IDS.map(id => Object.assign({ id }, partInfo(org, id)));
    out.forEach(p => { if (p.id === 'pump' && SPEC[org].wall === 'none') { /* present */ } });
    const sp = SPEC[org], ex = [];
    if (sp.spore) ex.push({ id: 'spore', name: 'Endospore', func: 'A dormant, heat- and alcohol-resistant cell with a thick coat. Spores survive on surfaces and germinate in the gut.', drug: 'Spores are not killed by alcohol gels or by antibiotics; soap-and-water hand washing and surface sporicides matter.' });
    if (sp.wall === 'fungus') ex.push({ id: 'organelle', name: 'Mitochondria and vacuole', func: 'Mitochondria make ATP; the vacuole stores ions and degrades waste. Both are absent from bacteria.', drug: 'Not a major antifungal target.' });
    if (sp.wall === 'none') ex.push({ id: 'organelle', name: 'Attachment organelle', func: 'A tip structure with the P1 adhesin that binds sialylated receptors on respiratory epithelium and drives gliding.', drug: 'Not a drug target; antibodies to P1 form during infection.' });
    if (sp.wall === 'chl') ex.push({ id: 'organelle', name: 'Inclusion', func: 'Chlamydiae live in a membrane-bound vacuole inside the host cell, cycling between dense elementary bodies and dividing reticulate bodies.', drug: 'Drugs must cross the host cell and inclusion membranes to reach the bacteria.' });
    return out.concat(ex);
  }

  /* ------------------------------------------------------------ whole-cell builder */
  function whole(org) {
    const sp = SPEC[org], grp = new T.Group(), parts = {}, clipMats = [], spins = [], plane = new T.Plane(V(0, 0, -1), 0), rr = G.rngf(11);
    const info = wholeList(org); const reg = (id, obj, pri) => { const p = parts[id] || (parts[id] = { id, objs: [], pri: pri || 1 }); p.objs.push(obj); obj.traverse(o => { o.userData.part = id; if (o.isPoints) o.userData.sz0 = o.material.size; }); };
    const clipM = m => { m.clippingPlanes = [plane]; clipMats.push(m); return m; };
    const shape = (k, rm, mat) => {
      let g; const r = sp.r * rm;
      if (sp.shape === 'rod') g = G.capsuleGeo(sp.len, r, 40);
      else if (sp.shape === 'hypha') g = G.capsuleGeo(sp.len, r, 40);
      else g = new T.SphereGeometry(r, 40, 28);
      if (sp.shape === 'wl') G.wrinkle(g, .09, 4);
      const m = new T.Mesh(g, mat); if (sp.ovoid && sp.shape === 'coc') m.scale.y = sp.ovoid; if (sp.shape === 'yeast') m.scale.y = 1.25; return m;
    };
    const glass = (c, o, e) => clipM(G.glass(c, o, e));
    const isRod = sp.shape === 'rod' || sp.shape === 'hypha', half = isRod ? sp.len / 2 + sp.r : sp.r * (sp.ovoid || (sp.shape === 'yeast' ? 1.25 : 1));
    const surf = () => { /* random point on the cell surface (back half) with normal */
      for (let i = 0; i < 40; i++) {
        let p, n;
        if (isRod) { const c = G.capPoint(sp.len, sp.r, rr); p = c.p; n = c.n; } else { n = V(rr() - .5, rr() - .5, rr() - .5).normalize(); p = n.clone().multiplyScalar(sp.r); if (sp.ovoid) p.y *= sp.ovoid; if (sp.shape === 'yeast') p.y *= 1.25; }
        if (p.z <= 0.15 && n.z <= .3) return { p, n };
      } return { p: V(0, sp.r, -.1), n: V(0, 1, -.1).normalize() };
    };
    const wall = sp.wall;
    /* capsule */
    if (sp.cap) { const m = shape('cap', 1.42, glass(COL.cap, .2)); grp.add(m); reg('capsule', m, 5); }
    /* envelope */
    if (wall === 'gn' || wall === 'chl') {
      const om = shape('om', 1, glass(COL.om, .26)); grp.add(om); reg('wall', om, 5);
      const pgm = shape('pg', .93, clipM(new T.MeshBasicMaterial({ color: COL.pg, wireframe: true, transparent: true, opacity: .35 }))); grp.add(pgm); reg('wall', pgm, 5);
      const lps = G.hairs(Array.from({ length: 150 }, surf), .22, .012, COL.om, .8); lps.traverse(o => { if (o.material) clipM(o.material); }); grp.add(lps); reg('wall', lps, 5);
      const im = shape('im', .84, glass(COL.im, .3)); grp.add(im); reg('membrane', im, 5);
    } else if (wall === 'gp') {
      const w1 = shape('w', 1.04, glass(0xffd27a, .34)); grp.add(w1); reg('wall', w1, 5);
      const w2 = shape('w2', .94, clipM(new T.MeshBasicMaterial({ color: 0xffe6a8, wireframe: true, transparent: true, opacity: .3 }))); grp.add(w2); reg('wall', w2, 5);
      const ta = G.hairs(Array.from({ length: 70 }, surf), .3, .012, 0xffe6a8, .8); ta.traverse(o => { if (o.material) clipM(o.material); }); grp.add(ta); reg('wall', ta, 5);
      const im = shape('im', .84, glass(COL.im, .3)); grp.add(im); reg('membrane', im, 5);
    } else if (wall === 'myco') {
      const my = shape('my', 1.12, glass(0xffd27a, .36)); grp.add(my); reg('wall', my, 5);
      const ag = shape('ag', 1.0, clipM(new T.MeshBasicMaterial({ color: 0xfff0c0, wireframe: true, transparent: true, opacity: .32 }))); grp.add(ag); reg('wall', ag, 5);
      const im = shape('im', .84, glass(COL.im, .3)); grp.add(im); reg('membrane', im, 5);
    } else if (wall === 'fungus') {
      const w1 = shape('w', 1.06, glass(0xc8e6b8, .38)); grp.add(w1); reg('wall', w1, 5);
      const w2 = shape('w2', .96, clipM(new T.MeshBasicMaterial({ color: 0xeaffd8, wireframe: true, transparent: true, opacity: .28 }))); grp.add(w2); reg('wall', w2, 5);
      const im = shape('im', .88, glass(0xf2d49a, .3)); grp.add(im); reg('membrane', im, 5);
    } else { /* wall-less */
      const mm = shape('m', 1, glass(0x7fd8d0, .4)); grp.add(mm); reg('membrane', mm, 5);
    }
    /* interior */
    const inR = sp.r * .62, inLen = isRod ? sp.len * .9 : 0;
    if (wall === 'fungus') {
      const nuc = new T.Mesh(new T.SphereGeometry(sp.r * .38, 24, 18), G.glass(0xc9b3ff, .45)); nuc.position.set(0, isRod ? sp.len * .15 : 0, -.15); grp.add(nuc);
      const nl = new T.Mesh(new T.SphereGeometry(sp.r * .14, 14, 10), G.std(0x7a5fd0)); nl.position.copy(nuc.position).add(V(.1, .05, 0)); grp.add(nl);
      const dn = G.nucleoid(sp.r * .6, sp.r * .6, COL.dna, 6, 10); dn.position.copy(nuc.position); dn.scale.setScalar(.8); grp.add(dn); reg('dna', nuc, 1); reg('dna', nl, 1); reg('dna', dn, 1);
      [[.5, .5, -.3], [-.5, -.55, -.35], [.55, -.4, -.2]].forEach((q, i) => { const mi = new T.Mesh(G.capsuleGeo(sp.r * .45, sp.r * .16, 14), G.std(0xff9a4a, { roughness: .5 })); mi.position.set(q[0] * sp.r, q[1] * sp.r * (isRod ? 1.6 : 1), q[2] * sp.r); mi.rotation.z = i; grp.add(mi); reg('organelle', mi, 2); });
      const va = new T.Mesh(new T.SphereGeometry(sp.r * .28, 18, 14), G.glass(0xffffff, .35)); va.position.set(-.45 * sp.r, .1 * sp.r, -.3); grp.add(va); reg('organelle', va, 2);
      if (sp.shape === 'hypha') { const se = new T.Mesh(new T.TorusGeometry(sp.r * .9, .06, 8, 28), G.std(0xffffff)); se.position.y = -sp.len * .2; se.rotation.x = Math.PI / 2; grp.add(se); reg('wall', se, 5); }
      if (sp.shape === 'yeast') { const bud = new T.Mesh(new T.SphereGeometry(sp.r * .45, 22, 16), G.glass(0xc8e6b8, .4)); bud.position.set(sp.r * .95, sp.r * 1.45, 0); grp.add(bud); reg('wall', bud, 5); }
    } else {
      const dn = G.nucleoid(isRod ? inLen * .9 : sp.r * 1.5, inR * (isRod ? 1.5 : 1.4), COL.dna, 3, 22); dn.position.z = -.2; grp.add(dn); reg('dna', dn, 1);
    }
    const nrb = 190, rb = G.dots(nrb, () => { const a = rr() * 6.283, rad = Math.sqrt(rr()) * sp.r * .72, y = isRod ? (rr() - .5) * (sp.len + sp.r) * .95 : (rr() - .5) * sp.r * 1.4 * (sp.ovoid || 1), z = Math.min(.15, Math.sin(a) * rad); return V(Math.cos(a) * rad, y, z); }, wall === 'fungus' ? .11 : .075, wall === 'fungus' ? 0xffb3c8 : COL.ribo, .95); grp.add(rb); reg('ribosome', rb, 1);
    if (sp.wall !== 'fungus' && sp.wall !== 'myco' && sp.wall !== 'none' || sp.wall === 'myco' && false) { /* plasmids */
      [[.55, -.2, -.35], [-.5, .3, -.45]].forEach((q, i) => { const t = new T.Mesh(new T.TorusGeometry(sp.r * .2, .05, 10, 28), G.std(COL.pla, { emissive: 0x4a2a00, emissiveIntensity: .4 })); t.position.set(q[0] * sp.r, q[1] * (isRod ? sp.len * .7 : sp.r), q[2] * sp.r); t.rotation.set(i * 1.1, i * .7, 0); grp.add(t); reg('plasmid', t, 1); });
    }
    if (wall === 'chl') { const inc = new T.Mesh(new T.SphereGeometry(sp.r * 2.2, 32, 24), glass(0xb7a4ff, .12)); grp.add(inc); reg('organelle', inc, 6); }
    if (wall === 'none') { const tip = new T.Group(), org = new T.Mesh(new T.CylinderGeometry(.28, .45, .9, 14), G.std(0xb7f0ea)), tp = new T.Mesh(new T.SphereGeometry(.28, 12, 10), G.std(0xffe28a, { emissive: 0x6b5a22, emissiveIntensity: .4 })); org.position.y = sp.r * 1.1; tp.position.y = sp.r * 1.1 + .55; tip.add(org, tp); tip.add(G.hairs(Array.from({ length: 16 }, () => { const n = V(rr() - .5, rr() * .6 + .4, rr() - .5).normalize(); return { p: V(0, sp.r * 1.1 + .6, 0).addScaledVector(n, .2), n }; }), .45, .03, 0xffe28a, .9)); grp.add(tip); reg('organelle', tip, 2); }
    /* spore */
    if (sp.spore) { const s = new T.Group(), core = new T.Mesh(new T.SphereGeometry(sp.r * .62, 20, 14), G.std(0xfff3c9, { emissive: 0x6b5a22, emissiveIntensity: .35 })), coat = new T.Mesh(new T.SphereGeometry(sp.r * .8, 20, 14), G.glass(0xffe9a8, .45)); core.scale.y = coat.scale.y = 1.3; s.add(core, coat); s.position.set(0, sp.len / 2 - sp.r * .1, -.1); grp.add(s); reg('spore', s, 2); }
    /* porins and pumps on the envelope (bacteria only) */
    if (wall === 'gn' || wall === 'chl' || wall === 'myco' || wall === 'gp' || wall === 'none') {
      if (wall === 'gn' || wall === 'chl' || wall === 'myco') {
        for (let i = 0; i < 14; i++) { const s = surf(), t = new T.Mesh(new T.TorusGeometry(.13, .045, 8, 16), G.std(COL.porin, { emissive: 0x06304a, emissiveIntensity: .5 })); t.position.copy(s.p).addScaledVector(s.n, .02); t.quaternion.setFromUnitVectors(V(0, 0, 1), s.n); grp.add(t); reg('porin', t, 1); }
      }
      for (let i = 0; i < 6; i++) { const s = surf(), c = new T.Mesh(new T.CylinderGeometry(.09, .09, .7, 10), G.std(COL.pump, { emissive: 0x4a1800, emissiveIntensity: .5 })); c.position.copy(s.p).addScaledVector(s.n, -.05); c.quaternion.setFromUnitVectors(V(0, 1, 0), s.n); grp.add(c); reg('pump', c, 1); }
    }
    if (wall === 'fungus') { for (let i = 0; i < 6; i++) { const s = surf(), c = new T.Mesh(new T.CylinderGeometry(.1, .1, .5, 10), G.std(COL.pump, { emissive: 0x4a1800, emissiveIntensity: .5 })); c.position.copy(s.p).multiplyScalar(.95); c.quaternion.setFromUnitVectors(V(0, 1, 0), s.n); grp.add(c); reg('pump', c, 1); } }
    /* flagella and pili */
    if (sp.flag === 'polar') { const f = G.flagellum(3.4, .22, 3.2, .06, COL.fl); f.g.position.set(0, -(sp.len / 2 + sp.r), 0); f.g.quaternion.setFromUnitVectors(V(0, 0, 1), V(0, -1, 0)); grp.add(f.g); reg('flagella', f.g, 1); spins.push(f.spin); }
    if (sp.flag === 'peri') { for (let i = 0; i < 6; i++) { const s = surf(), f = G.flagellum(2.8 * (.8 + rr() * .4), .2, 2.6, .055, COL.fl); f.g.position.copy(s.p); f.g.quaternion.setFromUnitVectors(V(0, 0, 1), s.n.clone().add(V(0, (rr() - .5) * .6, -.15)).normalize()); grp.add(f.g); reg('flagella', f.g, 1); spins.push(f.spin); } }
    if (sp.pili) { const pl = G.hairs(Array.from({ length: 55 }, surf), 1.1, .025, COL.pili, .85); pl.traverse(o => { if (o.material) clipM(o.material); }); grp.add(pl); reg('pili', pl, 1); }
    /* orient rods horizontally */
    const root = new T.Group(); root.add(grp); if (isRod) grp.rotation.z = Math.PI / 2;
    /* anchors in world space (rotation z of the rod maps local (x,y)->(-y,x)) */
    const A = isRod ? (x, y, z) => V(-y, x, z) : (x, y, z) => V(x, y, z), R = sp.r, L = sp.len || 0;
    const anchors = isRod
      ? { capsule: [0, R * 1.4, 0], wall: [L * .2, R, 0], membrane: [L * .1, R * .84, -.1], ribosome: [-L * .2, R * .1, 0], dna: [0, 0, -.2], plasmid: [R * .55, -L * .2, -.35], porin: [L * .25, R, -.1], pump: [-L * .3, R, -.1], flagella: [L / 2 + R + 1.6, 0, 0], pili: [L * .1, -R - .5, -.1], spore: [-L / 2, 0, -.1] }
      : { capsule: [0, R * 1.35, 0], wall: [R * .75, R * .75, 0], membrane: [R * .6, R * .55, -.1], ribosome: [-R * .2, -R * .3, 0], dna: [0, 0, -.2], plasmid: [R * .5, -R * .3, -.4], porin: [R * .7, R * .6, -.1], pump: [-R * .7, R * .6, -.1], flagella: [0, -R * 2, 0], pili: [0, R * 1.2, 0], organelle: [0, R * 1.1, 0] };
    if (isRod) { anchors.organelle = [0, 0, -.2]; anchors.organelle = [R * .5, 0, -.2]; } if (sp.shape === 'wl') anchors.organelle = [0, R * 1.5, 0]; if (sp.shape === 'chl') anchors.organelle = [0, R * 2.2, 0]; if (sp.shape === 'yeast') anchors.organelle = [R * .5, R * .5, -.3];
    const list = info.map(p => { const pt = parts[p.id]; const present = !!pt; const a = anchors[p.id] || [0, 0, 0]; return Object.assign({}, p, { present, absent: present ? null : (p.reason || 'Not present in this organism model.'), anchor: V(...a), dist: p.id === 'dna' || p.id === 'ribosome' || p.id === 'plasmid' ? 7.2 : p.id === 'flagella' ? 8 : 8.5 }); });
    list.forEach(p => { if (p.present) { if (isRod && p.id !== 'flagella') { /* anchors for rods are given directly in world axes as (x along rod) */ } parts[p.id].info = p; } });
    return { root, parts, list, clipMats, plane, spins, size: Math.max(isRod ? sp.len + 2 * sp.r : 2 * sp.r, 4) };
  }

  /* ------------------------------------------------------------ envelope close-up */
  const ENV_PARTS = {
    gn: [['lps', 'LPS (lipopolysaccharide)', [-3.4, 2.6, 0], 5], ['porin', 'Porin', [-1.9, 2, 0], 4.2], ['om', 'Outer membrane', [0.6, 2, 0], 5], ['pump', 'Efflux pump (RND)', [2.5, 1.2, 0], 5.5], ['pg', 'Peptidoglycan', [-0.2, 1.1, 0], 4.8], ['enz', 'β-lactamase (periplasm)', [0.6, 1.2, 0], 4], ['pbp', 'PBP (penicillin-binding protein)', [-1.0, .5, 0], 4], ['im', 'Inner membrane', [-3, 0, 0], 5], ['ribosome', 'Ribosome', [-0.8, -1.8, 0], 4.5]],
    gp: [['tei', 'Teichoic acids', [-3, 3, 0], 5], ['pg', 'Thick peptidoglycan', [0, 1.7, 0], 5], ['pbp', 'PBP', [-1.8, .6, 0], 4], ['van', 'Wall precursor stem (vancomycin target)', [1.6, 1.4, 0], 4], ['im', 'Cell membrane', [-3, 0, 0], 5], ['ribosome', 'Ribosome', [-0.8, -1.8, 0], 4.5]],
    myco: [['myc', 'Mycolic acid layer', [-1, 2.3, 0], 5], ['ag', 'Arabinogalactan', [0, 1.6, 0], 5], ['pg', 'Peptidoglycan', [0, 1.0, 0], 4.5], ['im', 'Cell membrane', [-3, 0, 0], 5], ['ribosome', 'Ribosome', [-0.8, -1.8, 0], 4.5]],
    wl: [['ster', 'Sterol-containing membrane', [-1, 0, 0], 5], ['adh', 'P1 adhesin', [1.5, 1.2, 0], 4.5], ['ribosome', 'Ribosome', [-0.8, -1.8, 0], 4.5]],
    fungus: [['mann', 'Mannoproteins', [-2, 3.4, 0], 5], ['glu', 'β-glucan and chitin wall', [0, 2, 0], 5], ['gs', 'Glucan synthase', [1.6, .5, 0], 4.5], ['erg', 'Ergosterol', [-2.2, .2, 0], 4.5], ['e11', 'Erg11 (lanosterol demethylase)', [-0.6, -.9, 0], 4.5], ['cdr', 'Efflux pump (CDR1 / MDR1)', [3, .2, 0], 5]]
  };
  const ENV_INFO = {
    lps: ['LPS', 'Lipid A anchors the molecule in the outer leaflet; a sugar core and O-antigen chains project outwards. Lipid A is the endotoxin that triggers TLR4 and septic shock.', 'Polymyxins (colistin) bind the negative charges of lipid A. Modifying lipid A with phosphoethanolamine or aminoarabinose (mcr, pmrAB) causes colistin resistance.'],
    porin: ['Porin trimer', 'Three β-barrels each form a water-filled channel in the outer membrane. They pass small hydrophilic solutes, including many β-lactams.', 'Porin loss or narrowing lowers antibiotic entry (OprD for carbapenems in Pseudomonas, OmpK36 in Klebsiella).'],
    om: ['Outer membrane', 'An asymmetric bilayer: LPS in the outer leaflet and phospholipids in the inner leaflet. It is a strong barrier to hydrophobic and large molecules.', 'Excludes vancomycin and many large agents; mutations in LPS or porins change permeability.'],
    pump: ['MexAB-OprM / AcrAB-TolC pump', 'Three parts: an inner-membrane transporter (MexB / AcrB, proton-driven), a periplasmic adaptor (MexA / AcrA) and an outer-membrane channel (OprM / TolC). Drugs are captured from the periplasm or inner membrane and pushed out.', 'Over-expression lowers accumulation of many classes. Which drugs are substrates depends on the pump.'],
    pg: ['Peptidoglycan', 'Glycan strands (NAG-NAM) cross-linked by short peptide bridges. It resists osmotic pressure; in Gram-negatives it is thin and in the periplasm.', 'β-lactams mimic the D-Ala-D-Ala end of the peptide and block the cross-linking transpeptidases (PBPs).'],
    enz: ['β-lactamase', 'A periplasmic enzyme that hydrolyses the β-lactam ring. Serine enzymes (KPC, OXA-48, AmpC, ESBLs) use a serine; metallo-enzymes (NDM, VIM, IMP) use zinc to activate water.', 'Avibactam inhibits many serine enzymes but not metallo-β-lactamases such as NDM.'],
    pbp: ['Penicillin-binding protein', 'Membrane-anchored transpeptidases that cross-link peptidoglycan. The active serine is acylated by β-lactams.', 'Altered PBPs with lower drug affinity are the main β-lactam resistance route in some Gram-positives (PBP2a in MRSA) and a minor route in Gram-negatives.'],
    im: ['Inner membrane', 'A phospholipid bilayer with transporters, the respiratory chain and PBPs.', 'Aminoglycoside uptake across it needs the proton motive force, which is why they fail in anaerobes.'],
    ribosome: ['70S ribosome', 'A small 30S subunit (decoding) and a large 50S subunit (peptide bond formation) make proteins.', 'Aminoglycosides, tetracyclines and tigecycline bind 30S; macrolides, linezolid and clindamycin bind 50S. rRNA methylation (RmtB, ArmA) blocks aminoglycosides.'],
    tei: ['Teichoic and lipoteichoic acids', 'Anionic polymers threaded through the wall (wall teichoic acids bound to peptidoglycan; lipoteichoic acids anchored in the membrane). They help adhesion, ion balance and immune recognition.', 'Not a direct drug target; D-alanylation changes surface charge and daptomycin susceptibility.'],
    van: ['Peptidoglycan precursor stem', 'Precursors end in D-Ala-D-Ala, the substrate of the transpeptidase. In VRE (van operons) it is replaced by D-Ala-D-Lactate.', 'Vancomycin binds D-Ala-D-Ala with strong hydrogen bonds and D-Ala-D-Lac poorly, so it fails against VRE.'],
    myc: ['Mycolic acids', 'Very long (C60–C90) branched fatty acids form an outer waxy leaflet, with trehalose dimycolate (cord factor) at the surface. They make the cell acid-fast and slow drug entry.', 'Isoniazid (after KatG activation) blocks InhA, an enzyme of mycolic acid synthesis.'],
    ag: ['Arabinogalactan', 'A branched polysaccharide that links peptidoglycan to the mycolic acids.', 'Ethambutol inhibits arabinosyl transferases (EmbCAB).'],
    ster: ['Membrane with sterols', 'Mycoplasma incorporate cholesterol from the host into a single membrane; there is no wall.', 'Wall-active drugs have nothing to act on; protein synthesis inhibitors and quinolones are used.'],
    adh: ['P1 adhesin', 'A tip protein that binds sialylated receptors on respiratory epithelium.', 'Antibodies against P1 form during infection; not a drug target.'],
    mann: ['Mannoproteins', 'Heavily glycosylated proteins at the wall surface that act as adhesins and antigens.', 'Recognised by host lectin receptors (dectin-2, mannose receptor).'],
    glu: ['β-glucan and chitin', 'Cross-linked β-(1,3) and β-(1,6) glucan fibrils with chitin give the wall its strength.', 'Echinocandins block glucan synthesis; the wall becomes fragile and cells lyse.'],
    gs: ['β-(1,3)-D-glucan synthase (Fks)', 'A membrane enzyme complex that extrudes glucan chains into the wall.', 'Target of echinocandins; FKS mutations cause resistance.'],
    erg: ['Ergosterol', 'The main fungal membrane sterol, equivalent to cholesterol in human cells.', 'Polyenes (amphotericin B) bind ergosterol and form pores.'],
    e11: ['Erg11 (lanosterol 14α-demethylase)', 'A cytochrome P450 enzyme in ergosterol synthesis.', 'Azoles inhibit Erg11 (cyp51A in Aspergillus). Mutations and over-expression cause azole resistance.'],
    cdr: ['CDR1 / MDR1 efflux pumps', 'ABC (CDR1) and major facilitator (MDR1) pumps move azoles out of the cell.', 'Up-regulation is a common azole resistance mechanism in Candida.']
  };
  function envType(org) { const w = SPEC[org].wall; return w === 'none' ? 'wl' : w === 'chl' ? 'gn' : w; }

  function env(org) {
    const ty = envType(org), sp = SPEC[org], grp = new T.Group(), parts = {}, rr = G.rngf(21);
    const mat = (c, o) => G.std(c, o), reg = (id, obj, pri) => { const p = parts[id] || (parts[id] = { id, objs: [], pri: pri || 1 }); p.objs.push(obj); obj.traverse(o => { o.userData.part = id; }); };
    const cyl = (r, h, c, o) => new T.Mesh(new T.CylinderGeometry(r, r, h, 16, 1, o && o.open), mat(c, o));
    const tube = (pts, r, c, id) => { const m = G.tubeAlong(pts, r, c, 40); if (id) reg(id, m); return m; };
    /* lipid bilayer centred at yc, spans x in [-5,5]; skips x ranges */
    function bilayer(yc, id, headCol, skip, sterols) {
      const nx = 46, nz = 3, heads = [], tails = [];
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const x = -5 + i * (10 / (nx - 1)), z = -.45 + k * .45; if ((skip || []).some(s => Math.abs(x - s[0]) < s[1])) continue; heads.push([x, yc + .3, z], [x, yc - .3, z]); tails.push([x, yc + .15, z], [x, yc - .15, z]); }
      const hm = new T.InstancedMesh(new T.SphereGeometry(.1, 8, 6), mat(headCol, { roughness: .5 }), heads.length), tm = new T.InstancedMesh(new T.CylinderGeometry(.03, .03, .3, 5), mat(0xffe9b0, { transparent: true, opacity: .7 }), tails.length), mx = new T.Matrix4();
      heads.forEach((p, i) => { mx.makeTranslation(p[0], p[1], p[2]); hm.setMatrixAt(i, mx); }); tails.forEach((p, i) => { mx.makeTranslation(p[0], p[1], p[2]); tm.setMatrixAt(i, mx); });
      const g = new T.Group(); g.add(hm, tm); grp.add(g); reg(id, g, 6); return g;
    }
    function lattice(y0, layers, id, col, dens) {
      const g = new T.Group();
      for (let l = 0; l < layers; l++) { const y = y0 + l * .34; for (let k = 0; k < 3; k++) { const z = -.5 + k * .5; g.add(G.tubeAlong([V(-5, y, z), V(5, y + (l % 2 ? .04 : -.04), z)], .045, col, 8)); } for (let i = 0; i < (dens || 22); i++) { const x = -5 + i * (10 / (dens || 22)) + (l % 2) * .2; g.add(G.tubeAlong([V(x, y, -.5), V(x + .06, y + .17, 0), V(x, y + .34, .5)], .028, 0xffffff, 6)); } }
      grp.add(g); reg(id, g, 4); return g;
    }
    function porin(x, y) { const g = new T.Group(); [[0, .0], [.5, .3], [-.5, .3]].forEach((q, i) => { const c = cyl(.24, .8, COL.porin, { open: true, emissive: 0x06304a, emissiveIntensity: .5, transparent: true, opacity: .9 }); c.material.side = T.DoubleSide; c.position.set(q[0], 0, q[1] - .15); g.add(c); }); g.position.set(x, y, 0); grp.add(g); reg('porin', g, 1); return g; }
    function pump(x) {
      const g = new T.Group(), opr = cyl(.42, 1.7, 0xffb347, { open: true, emissive: 0x4a2a00, emissiveIntensity: .4 }), mexA = cyl(.3, 1.0, 0xff8a4a, { emissive: 0x4a1800, emissiveIntensity: .4 }), mexB = cyl(.62, 1.2, 0xe04a3a, { emissive: 0x3a0a00, emissiveIntensity: .4 }); opr.material.side = T.DoubleSide;
      opr.position.y = 1.65; mexA.position.y = .75; mexB.position.y = -.05; g.add(opr, mexA, mexB); g.position.set(x, 0, 0); grp.add(g);
      opr.userData.t = 'OprM'; reg('pump', g, 1); return g;
    }
    function ribosome(x, y) { const g = new T.Group(), a = new T.Mesh(new T.SphereGeometry(.5, 18, 14), mat(0xff8fb8)), b = new T.Mesh(new T.SphereGeometry(.34, 16, 12), mat(0xffc2d9)); a.scale.set(1, .85, 1); b.position.set(.1, .6, 0); g.add(a, b); g.position.set(x, y, 0); grp.add(g); reg('ribosome', g, 1); return g; }
    function pbp(x, ytop, extra) { const g = new T.Group(), st = cyl(.12, .55, 0x4a8dff), hd = new T.Mesh(new T.SphereGeometry(.34, 16, 12), mat(extra || 0x4a8dff, { emissive: extra ? 0x400000 : 0x001a40, emissiveIntensity: .5 })), cl = new T.Mesh(new T.SphereGeometry(.1, 8, 6), mat(0x0a1a30)); st.position.y = -.2; hd.position.y = .22; cl.position.set(.2, .32, .1); g.add(st, hd, cl); g.position.set(x, ytop, 0); grp.add(g); reg(extra ? 'pbp' : 'pbp', g, 1); return g; }
    const skipOM = [[-1.9, .75], [2.5, .7]];
    if (ty === 'gn') {
      bilayer(2.0, 'om', 0x6fe0cf, skipOM); bilayer(0, 'im', 0xffe6a8, [[2.5, .8]]);
      /* LPS chains */
      for (let i = 0; i < 7; i++) { const x = -4.4 + i * .6 + (i > 3 ? 2.1 : 0); if (Math.abs(x + 1.9) < .9 || Math.abs(x - 2.5) < .9) continue; const pts = []; for (let k = 0; k < 8; k++) pts.push(V(x + Math.sin(k * 1.4 + i) * .25, 2.35 + k * .2, Math.cos(k + i) * .1)); grp.add(tube(pts, .035, 0xff9ec8, 'lps')); const core = new T.Mesh(new T.SphereGeometry(.14, 10, 8), mat(0xffd27a)); core.position.set(x, 2.45, 0); grp.add(core); reg('lps', core); }
      porin(-1.9, 2.0); pump(2.5); lattice(.95, 2, 'pg', 0xb9f0ff, 24); pbp(-1.1, .35); ribosome(-.8, -1.7);
      const en = new T.Group(), body = new T.Mesh(new T.IcosahedronGeometry(.4, 1), mat(0xff9a2e, { emissive: 0x4a2a00, emissiveIntensity: .35 })); en.add(body); [[.12, .1], [-.12, .1]].forEach(q => { const z = new T.Mesh(new T.SphereGeometry(.07, 8, 6), mat(0xe8f0ff)); z.position.set(q[0], q[1], .36); en.add(z); }); en.position.set(.6, 1.3, .2); grp.add(en); reg('enz', en, 1);
      const l = new T.Mesh(new T.PlaneGeometry(.001, .001)); void l;
    } else if (ty === 'gp') {
      bilayer(0, 'im', 0xffe6a8, []); lattice(.7, 5, 'pg', 0xffe6a8, 24); pbp(-1.8, .35, sp.pbp2a ? 0xff4a3a : 0); ribosome(-.8, -1.7);
      if (sp.pbp2a) pbp(2.6, .35, 0xff4a3a);
      for (let i = 0; i < 6; i++) { const x = -4.5 + i * 1.6, pts = []; for (let k = 0; k < 9; k++) pts.push(V(x + Math.sin(k * 1.2 + i) * .25, 2.3 + k * .12, Math.cos(k + i) * .1)); grp.add(tube(pts, .04, i % 2 ? 0xffb347 : 0xff9ec8, 'tei')); const lt = []; for (let k = 0; k < 8; k++) lt.push(V(x + .8 + Math.sin(k) * .12, .3 + k * .3, .3)); grp.add(tube(lt, .03, 0xffc2d9, 'tei')); }
      for (let i = 0; i < 6; i++) { const x = .6 + i * .28, a = new T.Mesh(new T.SphereGeometry(.07, 8, 6), mat(0x4a8dff)), b = new T.Mesh(new T.SphereGeometry(.07, 8, 6), mat(sp.van ? 0xff9a2e : 0x4a8dff, { emissive: sp.van ? 0x603000 : 0, emissiveIntensity: .6 })); a.position.set(x, 1.1 + (i % 2) * .5, .6); b.position.set(x + .1, a.position.y + .16, .6); grp.add(a, b); reg('van', a); reg('van', b); }
      if (sp.cap) { for (let i = 0; i < 60; i++) { const x = -4.8 + i * .16, h = .8 + (i * 37 % 10) / 14, t = tube([V(x, 2.5, (i % 3 - 1) * .4), V(x + .12, 2.5 + h * .5, (i % 3 - 1) * .4), V(x - .05, 2.5 + h, (i % 3 - 1) * .4)], .03, 0xffd3e6, 'cap'); grp.add(t); } }
    } else if (ty === 'myco') {
      bilayer(0, 'im', 0xffe6a8, []); lattice(.55, 2, 'pg', 0xffe6a8, 22);
      for (let i = 0; i < 18; i++) { const x = -4.8 + i * .56, y = 1.35 + (i % 3) * .05, ag = tube([V(x, y, -.3), V(x + .25, y + .3, 0), V(x + .55, y + .5, .3)], .035, 0xb9f0ff, 'ag'); grp.add(ag); }
      const my = new T.Group(); for (let i = 0; i < 46; i++) for (let k = 0; k < 3; k++) { const x = -5 + i * .22, c = cyl(.045, 1.0 + ((i * 13 + k) % 5) * .06, i % 5 === 0 ? 0xff6f9a : 0xffd27a, { transparent: true, opacity: .85 }); c.position.set(x, 2.25, -.45 + k * .45); my.add(c); } grp.add(my); reg('myc', my, 4); ribosome(-.8, -1.7); pbp(-1.8, .3);
    } else if (ty === 'wl') {
      bilayer(0, 'ster', 0x7fd8d0, []); const st = new T.InstancedMesh(new T.SphereGeometry(.09, 8, 6), mat(0xffe28a, { emissive: 0x6b5a22, emissiveIntensity: .4 }), 40), mx = new T.Matrix4(); for (let i = 0; i < 40; i++) { mx.makeTranslation(-4.8 + rr() * 9.6, (rr() > .5 ? .3 : -.3), (rr() - .5) * 1.2); st.setMatrixAt(i, mx); } grp.add(st); reg('ster', st, 3);
      for (let i = 0; i < 5; i++) { const x = -3.5 + i * 1.7, c = cyl(.08, 1.1, 0xffe28a, { emissive: 0x6b5a22, emissiveIntensity: .4 }), h = new T.Mesh(new T.SphereGeometry(.2, 10, 8), mat(0xffe28a)); c.position.set(x, .9, 0); h.position.set(x, 1.55, 0); grp.add(c, h); reg('adh', c); reg('adh', h); } ribosome(-.8, -1.7);
    } else { /* fungus */
      bilayer(0, 'erg', 0xf2d49a, [[1.6, .9], [3.0, .5]]);
      const er = new T.InstancedMesh(new T.SphereGeometry(.1, 8, 6), mat(0xffd84a, { emissive: 0x5a4a00, emissiveIntensity: .5 }), 70), mx = new T.Matrix4(); for (let i = 0; i < 70; i++) { mx.makeTranslation(-4.9 + rr() * 9.8, .3, (rr() - .5) * 1.2); er.setMatrixAt(i, mx); } grp.add(er); reg('erg', er, 3);
      const gl = new T.Group(); for (let l = 0; l < 6; l++) { const y = .9 + l * .3; for (let k = 0; k < 4; k++) { const z = -.6 + k * .4, a = (l % 2) ? -.2 : .2; gl.add(G.tubeAlong([V(-5, y, z), V(0, y + a, z + .1), V(5, y, z)], .06, l < 2 ? 0xfff0a8 : 0xc8e6b8, 30)); } } grp.add(gl); reg('glu', gl, 4);
      const mp = new T.Group(); for (let i = 0; i < 28; i++) { const x = -4.9 + i * .36, pts = [V(x, 2.7, (i % 3 - 1) * .4), V(x + .1 * Math.sin(i), 3.1, (i % 3 - 1) * .4), V(x - .1, 3.5 + (i % 4) * .08, (i % 3 - 1) * .4)]; mp.add(G.tubeAlong(pts, .03, 0xffb3c8, 12)); const bl = new T.Mesh(new T.SphereGeometry(.07, 8, 6), mat(0xff7aa8)); bl.position.copy(pts[2]); mp.add(bl); } grp.add(mp); reg('mann', mp, 4);
      const gs = new T.Mesh(new T.CylinderGeometry(.55, .55, 1.2, 18), mat(0x9b7be0, { emissive: 0x20104a, emissiveIntensity: .5 })); gs.position.set(1.6, .15, 0); grp.add(gs); reg('gs', gs, 1);
      const e11 = new T.Mesh(new T.SphereGeometry(.5, 18, 14), mat(0x39c6ff, { emissive: 0x06304a, emissiveIntensity: .5 })); e11.position.set(-.6, -.95, 0); grp.add(e11); reg('e11', e11, 1);
      const cd = new T.Group(), c1 = cyl(.3, 1.3, 0xff7a3d, { emissive: 0x4a1800, emissiveIntensity: .4 }), c2 = cyl(.3, 1.3, 0xff7a3d, { emissive: 0x4a1800, emissiveIntensity: .4 }); c1.position.set(-.3, .15, 0); c2.position.set(.3, .15, 0); cd.add(c1, c2); cd.position.set(3, 0, 0); grp.add(cd); reg('cdr', cd, 1);
    }
    /* parts list (only the ones present) */
    const defs = ENV_PARTS[ty].filter(d => parts[d[0]]);
    const list = defs.map(d => Object.assign({ id: d[0], label: d[1], anchor: V(d[2][0], d[2][1], d[2][2]), dist: d[3] }, { name: ENV_INFO[d[0]][0], func: ENV_INFO[d[0]][1], drug: ENV_INFO[d[0]][2] }));
    list.forEach(p => { parts[p.id].info = p; });
    if (ty === 'gn' && org === 'cp') list.forEach(p => { p.note = 'Chlamydiae do not have a typical peptidoglycan wall; this is the generic Gram-negative envelope for orientation.'; });
    return { root: grp, parts, list, clipMats: [], plane: null, spins: [], size: 10, type: ty };
  }

  /* highlight a part (k 0..1) */
  function highlight(part, k) {
    if (!part) return;
    part.objs.forEach(o => o.traverse(c => {
      if (c.isPoints) c.material.size = (c.userData.sz0 || .075) * (1 + 1.4 * k);
      else if (c.material && c.material.emissive) { if (!c.userData.e0) c.userData.e0 = { c: c.material.emissive.getHex(), i: c.material.emissiveIntensity }; if (k > .01) { c.material.emissive.setHex(0x1fb0a8); c.material.emissiveIntensity = .08 + .3 * k; } else { c.material.emissive.setHex(c.userData.e0.c); c.material.emissiveIntensity = c.userData.e0.i; } }
    }));
  }
  M.anat = { SPEC, whole, env, highlight, wholeList, envType, ENV_INFO };
})();
