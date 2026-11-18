/* MICRO scenarios — choreography as pure functions of time.
   Experiment 1: meropenem vs NDM-producing Pseudomonas aeruginosa (NDM on / off).
   Experiment 2: cefiderocol, ceftazidime-avibactam, colistin, amikacin.
   To add KPC / OXA-48 / AmpC: copy `meropenem()`, swap the enzyme builder and the `react` step
   (serine acyl-enzyme: acylation -> deacylation) and register it in M.scenarios. */
(function () {
  'use strict';
  const T = THREE, M = window.MICRO, { clamp, lerp, sstep, seg, V, wob, keyPath } = M.u, { std, glow } = M.fx;
  const qDock = new T.Quaternion().setFromEuler(new T.Euler(0, 0, -.349)), qInv = qDock.clone().invert();
  const E3 = a => new T.Euler(a.x, a.y, a.z);
  const P0 = V(-12.5, -4, 0), D_NDM = V(-12.5, -3.1, 0), D_PBP = V(32, -26.3, 0);

  function sprite(txt, col) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = '700 54px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.shadowColor = '#000'; g.shadowBlur = 6; g.fillText(txt, 32, 36);
    const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.setScalar(3.2); s.renderOrder = 20; s.visible = false; return s;
  }
  function props(W) {
    if (W.props) return W.props; const mol = W.mol.root, P = (W.props = {});
    const mk = (def, sc, piv, carbon) => { const m = M.Molecule(def, { scale: sc, pivot: piv, carbon: carbon || 0x9fe08c }); mol.add(m.group); return m; };
    P.hero = mk(M.defs.meropenem, .5, 'C7'); P.hero.bond('lac').mat.color.set(0xffb347);
    P.amb = []; for (let i = 0; i < 6; i++) { const m = mk(M.defs.meropenem, .5, 'C7'); m.atoms.Ow.mesh.visible = false; m.atoms.Hw.mesh.visible = false; m.layout(); P.amb.push(m); }
    P.cfdc = mk(M.defs.cefiderocol, .5, 'C7'); P.caz = mk(M.defs.cephalosporin, .5, 'C7'); P.avi = mk(M.defs.avibactam, .5, 'A1', 0x8fd6ff); P.col = mk(M.defs.colistin, 1, 'P0', 0xff9ad0); P.ami = mk(M.defs.amikacin, .75, 'R01', 0xffc27a);
    P.colAmb = []; for (let i = 0; i < 4; i++) P.colAmb.push(mk(M.defs.colistin, .9, 'P0', 0xff9ad0));
    P.h1 = new T.Mesh(new T.SphereGeometry(.12, 8, 6), std(0xffffff)); mol.add(P.h1);
    P.coord = []; for (let i = 0; i < 4; i++) { const s = M.stick(V(), V(0, 1, 0), .06, 0x7fe8ff, .8); s.visible = false; mol.add(s); P.coord.push(s); }
    P.ogBond = M.stick(V(), V(0, 1, 0), .07, 0xff7777, .9); P.ogBond.visible = false; mol.add(P.ogBond);
    P.pop = new T.Mesh(new T.RingGeometry(.94, 1, 64), new T.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })); mol.add(P.pop);
    P.lacGlow = glow(0xffb347, 3.4, 0); P.hero.group.add(P.lacGlow);
    P.xs = [sprite('✗', '#ff5a4e'), sprite('✗', '#ff5a4e'), sprite('✗', '#ff5a4e')]; P.ok = sprite('✓', '#4dffa0'); mol.add(...P.xs, P.ok);
    /* magnesium/calcium ions bridging LPS (displaced by polycations) */
    P.mg = []; for (let i = 0; i < 5; i++) { const m = new T.Mesh(new T.SphereGeometry(.7, 10, 8), std(0x6dff8a, { emissive: 0x145a22, emissiveIntensity: .8 })); mol.add(m); P.mg.push(m); }
    /* ribosome (for the aminoglycoside experiment) */
    const rb = P.ribo = new T.Group();
    rb.add(M.blob({ c: [-10, -80, 0], rad: [10, 7, 7], n: 230, sr: 2.1, col1: 0xff9db4, col2: 0xd05a8a, seed: 61, cavity: { c: [-10, -75.6, 0], r: 3.6, u: [0, 1, 0], open: [0, .15, 1], n: 50 } }));
    rb.add(M.blob({ c: [-10, -93, 0], rad: [13.5, 10, 10], n: 300, sr: 2.5, col1: 0xf4c2d4, col2: 0xc8809e, seed: 62 }));
    const mr = []; for (let i = 0; i < 40; i++) mr.push(V(-40 + i * 1.9, -86.2 + Math.sin(i * .6) * .7, Math.cos(i * .5) * 1.2)); rb.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(mr), 80, .38, 6), std(0xffe27a, { emissive: 0x4a3a00, emissiveIntensity: .5 })));
    P.chain = []; for (let i = 0; i < 14; i++) { const b = new T.Mesh(new T.SphereGeometry(.85, 10, 8), std(0xc7d4e4, { emissive: 0x000000 })); b.position.set(-10 + i * 1.5, -98 - i * 1.8, 8 + i * .9); b.visible = false; rb.add(b); P.chain.push(b); }
    mol.add(rb);
    /* ambient meropenem above the outer membrane */
    P.ambBase = [[-52, 46, -4], [-40, 56, 8], [-20, 50, -6], [-60, 38, 6], [-4, 58, 2], [-34, 44, -10]];
    P.hideAll = function () {
      [P.hero, P.cfdc, P.caz, P.avi, P.col, P.ami, ...P.colAmb].forEach(m => { m.group.visible = false; m.opacity(1); m.restore(); });
      [P.hero, P.cfdc, P.caz].forEach(m => m.bond('lac').mat.color.set(0xffb347));
      P.hero.atoms.Ow.mesh.visible = false; P.hero.atoms.Hw.mesh.visible = false; P.h1.visible = false; P.coord.forEach(s => s.visible = false); P.ogBond.visible = false; P.pop.material.opacity = 0; P.lacGlow.material.opacity = 0;
      P.xs.forEach(s => { s.visible = false; s.scale.setScalar(3.2); }); P.ok.visible = false; P.mg.forEach(m => m.visible = false); P.ribo.visible = false; P.amb.forEach(m => m.group.visible = false);
      W.ndm.visible = false; W.waters.forEach(w => w.visible = false);
      W.pump.group.visible = false; W.fillPump.visible = true; W.fillA.visible = false; W.oprD.group.visible = true; W.pbpBump.visible = false; if (P.resHide) P.resHide(); W.serEnz.group.visible = false; W.serEnz.glow.material.opacity = 0; W.serEnz.og.material.color.setHex(0xff5555);
      W.pbpRefGlow.material.opacity = 0; W.serRefO.material.color.setHex(0xff5555); W.pump.pocketGlow.material.opacity = 0; W.pump.h.material.opacity = 0; W.pump.ring.material.emissiveIntensity = .8; W.pump.lobes.forEach(l => { l.g.position.set(0, 0, 0); l.g.scale.set(1, 1, 1); l.body.material.color.setHex(0xffffff); }); W.znGlow.forEach(g => g.material.opacity = .6); W.pbpGlow.material.opacity = 0; W.pbpOk.material.opacity = 0; W.serO.material.color.setHex(0xff5555);
      W.tbdt.plug.position.set(0, 1, 0); W.pg.newBars.forEach(b => b.grow = 0); W.pg.apply(0, 0); if (W.om.dirty) { W.om.items.forEach((_, i) => W.om.setHead(i, 0, 0, 0)); W.om.flush(); W.om.dirty = false; }
    };
    return P;
  }
  const camFrom = keys => { const pk = keyPath(keys.map(k => [k[0], ...k[1]])), lk = keyPath(keys.map(k => [k[0], ...k[2]])); return t => [pk(t), lk(t)]; };
  const cellCamKeys = [[0, [0, 1.6, 19], [0, 0, 0]], [3.9, [0, 1, 15], [0, 0, 0]], [4.9, [.3, .3, 3.3], [.3, .2, 1.4]]];
  const flashAt = (t, ts) => { let f = 0; ts.forEach(c => { f = Math.max(f, 1 - clamp(Math.abs(t - c) / .55)); }); return f; };

  /* hero reaction (hydrolysis by NDM Zn2+ / acylation by PBP serine). `ts` is "standard" time: dock at 22.4 */
  function react(P, W, hero, ts, mode, Dp, glowOn, X) {
    X = X || {}; const OG = X.og || W.serO, PG = X.glow || W.pbpGlow;
    const toLocal = p => p.clone().sub(Dp).applyQuaternion(qInv), h = sstep(28.8, 30.4, ts), A = Dp.clone().add(V(0, -1.15, .3)), B = W.pos.bridge, Sw = V(-17.5, .8, 4);
    hero.morph(h);
    const bl = hero.bond('lac'); bl.fade = 1 - sstep(29.2, 30.1, ts);
    P.lacGlow.position.copy(hero.atoms.C7.mesh.position).lerp(hero.atoms.N4.mesh.position, .5); P.lacGlow.material.opacity = glowOn ? (ts > 22.6 && ts < 30.4 ? .55 + .3 * Math.sin(ts * 6) : 0) : 0;
    const Ow = hero.atoms.Ow.mesh, Hw = hero.atoms.Hw.mesh, ow0 = Ow.position, wv = mode === 'water' && ts >= 24;
    Ow.visible = Hw.visible = wv; hero.bond('bOwC7').fade = mode === 'water' ? sstep(27.8, 28.8, ts) : 0; hero.bond('bOwHw').fade = wv ? 1 - sstep(29.8, 30.3, ts) : 0; hero.bond('bHwN4').fade = mode === 'water' ? sstep(30.2, 30.8, ts) : 0;
    P.coord.forEach(s => s.visible = false);
    if (mode === 'water') {
      let ow; const w1 = sstep(24, 25.2, ts);
      if (ts < 26.4) ow = Sw.clone().lerp(B, w1).add(V(wob(ts, 1) * (1 - w1) * .6, wob(ts, 2) * (1 - w1) * .6, 0));
      else ow = B.clone().lerp(A, sstep(26.4, 28, ts));
      const Al = toLocal(A), owl = ts < 28 ? toLocal(ow) : Al.clone().lerp(hero.atoms.Ow.open, h);
      Ow.position.copy(owl);
      const hOff = toLocal(A.clone().add(V(.5, .25, 0))).sub(Al), hw0 = owl.clone().add(hOff), n4 = hero.atoms.N4.mesh.position.clone().add(V(.18, -.3, .22));
      Hw.position.copy(hw0).lerp(n4, sstep(29.8, 30.8, ts));
      /* the released proton */
      const ow_w = hero.group.localToWorld(owl.clone()); P.h1.visible = ts >= 24 && ts < 27.4; const rel = sstep(25.2, 26.8, ts);
      P.h1.position.copy(ow_w).add(V(-.5, .3, 0)).lerp(V(-19, 3, 6), rel); P.h1.material.opacity = 1;
      /* coordination bonds */
      const zw1 = W.pos.zn1, zw2 = W.pos.zn2;
      if (ts > 25.0 && ts < 28.4) { P.coord[0].visible = P.coord[1].visible = true; P.coord[0].userData.set(zw1, ow_w); P.coord[1].userData.set(zw2, ow_w); }
      if (ts > 22.8 && ts < 30.6) { P.coord[2].visible = true; P.coord[2].userData.set(zw1, hero.group.localToWorld(hero.atoms.O7.mesh.position.clone())); }
      if (ts > 28.8 && ts < 30.8) { P.coord[3].visible = true; P.coord[3].userData.set(zw2, hero.group.localToWorld(hero.atoms.N4.mesh.position.clone())); }
      W.znGlow.forEach((g, i) => { g.material.opacity = .55 + .25 * Math.sin(ts * 4 + i) + (ts > 24.6 && ts < 26.6 ? .35 : 0); });
    } else {
      /* serine acylation of PBP: Ser-OG attacks the lactam carbonyl, drug stays covalently attached */
      P.ogBond.visible = ts > 27.8 && ts < 99; const og = OG.position, c7 = hero.group.localToWorld(hero.atoms.C7.mesh.position.clone());
      if (P.ogBond.visible) { P.ogBond.userData.set(og, c7); P.ogBond.material.opacity = sstep(27.8, 28.8, ts); }
      PG.material.opacity = (X.glowK || .9) * sstep(30, 32.5, ts); OG.material.color.setHex(ts > 28 ? 0xff9a3a : 0xff5555);
    }
    hero.layout();
  }

  const jit = (v, t, a, s) => v.add(V(wob(t, s + 1) * a, wob(t, s + 2) * a, wob(t, s + 3) * a));
  const euler = (keys) => { const k = keyPath(keys); return t => { const v = k(t); return new T.Euler(v.x, v.y, v.z); }; };
  const bbox = (t, ...ks) => ks;

  /* -------------------------------------------------- Experiment 1 -------------------------------------------------- */
  function meropenem(ndmOn) {
    let W, P;
    const posK = keyPath(ndmOn ? [
      [6, -44, 42, 5], [7.5, -42, 38, 3], [9, -36, 32, 1], [9.9, -30.5, 26.5, 0], [10.4, -30, 19, 0], [11, -30, 14, 0], [11.6, -30, 8.5, 0], [12.4, -29.6, 3, 0], [13, -28, .4, .5],
      [15, -25, -1.5, 2], [17, -22, -2.6, 2.5], [19, -18, -3.6, 1.8], [21, -14.8, -3.3, .8], [22.4, -12.5, -3.1, 0], [30.4, -12.5, -3.1, 0],
      [31.5, -11, .5, 1.8], [33, -4, 3.5, 4], [36, 8, -3, 4], [39, 19, -13, 3], [41, 28, -21.5, 1.2], [41.8, 30, -23, 1], [42.5, 28, -19.5, 2], [44, 35, -14, 4], [46, 40, -8, 6]
    ] : [
      [6, -44, 42, 5], [7.5, -42, 38, 3], [9, -36, 32, 1], [9.9, -30.5, 26.5, 0], [10.4, -30, 19, 0], [11, -30, 14, 0], [11.6, -30, 8.5, 0], [12.4, -29.6, 3, 0], [13, -28, .4, .5],
      [15, -20, -5, 1.5], [17, -6, -12, 2], [19, 10, -19, 1.5], [21, 24, -24, .8], [22.5, 32, -26.3, 0], [46, 32, -26.3, 0]
    ]);
    const eul = euler(ndmOn ? [[6, .8, 0, .4], [9, .5, .8, 1.2], [9.9, 0, 0, 1.57], [11.6, 0, 0, 1.57], [13, .3, .4, 1.2], [15, .6, .2, .6], [19, .2, .3, -.2], [21, 0, .1, -.35], [22.4, 0, 0, -.349], [30.4, 0, 0, -.349], [32, .3, .5, -.5], [36, .8, 1.2, .2], [42, 1.2, .5, .8], [46, .2, .6, 1]]
      : [[6, .8, 0, .4], [9, .5, .8, 1.2], [9.9, 0, 0, 1.57], [11.6, 0, 0, 1.57], [13, .3, .4, 1.2], [15, .6, .2, .6], [19, .2, .3, -.2], [21, 0, .1, -.35], [22.5, 0, 0, -.349], [46, 0, 0, -.349]]);
    const camK = ndmOn ? [
      [4.9, [-22, 8, 66], [-22, -6, 0]], [6, [-32, 30, 54], [-32, 32, 0]],
      [8, [-26, 44, 34], [-37, 34, 1]], [9.6, [-24, 34, 26], [-31, 27, 0]], [10.4, [-23, 24, 20], [-30, 19, 0]], [11.4, [-23, 15, 19], [-30, 11, 0]], [12.4, [-22, 8, 22], [-29.5, 3, 0]], [13.4, [-22, 6, 46], [-27, -2, 0]],
      [14.6, [-6, 1, 46], [-9, -8, 0]], [16.2, [-18, 5, 26], [-12, -4, 0]], [18, [-15, 4, 18], [-12.4, -4, 0]], [20, [-14, 3.5, 15.5], [-12.5, -4, 0]], [22.4, [-11, 3, 13], [-12.5, -4.2, 0]],
      [25, [-16, 2.5, 11.5], [-12.5, -4.8, 0]], [27.2, [-9, 2, 11], [-12.3, -4.4, 0]], [28.4, [-10.8, 1.4, 7.4], [-11.8, -4, 0]], [30.4, [-12, 1.6, 7.6], [-11.8, -3.9, 0]], [31.4, [-12.5, 2.5, 11.2], [-12.3, -3.6, 0]], [32.4, [-8, 2, 17], [-10, -2, 0]], [34.5, [2, -4, 30], [6, -10, 0]],
      [37.5, [18, -16, 36], [22, -20, 0]], [40.5, [28, -20, 34], [31, -24, 0]], [45.5, [30, -18, 34], [32, -23, 0]]
    ] : [
      [4.9, [-22, 8, 66], [-22, -6, 0]], [6, [-32, 30, 54], [-32, 32, 0]],
      [8, [-26, 44, 34], [-37, 34, 1]], [9.6, [-24, 34, 26], [-31, 27, 0]], [10.4, [-23, 24, 20], [-30, 19, 0]], [11.4, [-23, 15, 19], [-30, 11, 0]], [12.4, [-22, 8, 22], [-29.5, 3, 0]], [13.4, [-22, 6, 46], [-27, -2, 0]],
      [16, [-4, -4, 42], [-10, -9, 0]], [19, [14, -14, 34], [12, -18, 0]], [21.5, [26, -20, 20], [30, -25, 0]], [22.5, [29, -27.5, 13], [32, -26.5, 0]],
      [25, [27, -27.8, 11], [32, -26.6, 0]], [28, [37, -27.8, 10], [32.5, -26.5, 0]], [31, [32, -27.8, 9.5], [32, -26.4, 0]], [33.5, [30, -27, 26], [32, -24, 0]], [40, [38, -26, 30], [32, -23, 0]], [45.5, [30, -22, 32], [32, -22, 0]]
    ];
    const cam = camFrom(camK), cellCam = camFrom(cellCamKeys.concat([[45.8, [.3, .3, 3.3], [.3, .2, 1.4]], [47.6, [0, 1.2, 8.5], [0, 0, 0]], [52, [0, 2.4, 18], [0, 0, 0]], [60, [0, 3, 20], [0, 0, 0]]]));
    const scenes = ndmOn ? [
      { t0: 0, t1: 6, n: 1, title: 'Bacterial introduction', cap: 'Pseudomonas aeruginosa is a Gram-negative rod: outer membrane (LPS), a periplasm containing thin peptidoglycan, then the inner membrane.', voice: 'This is Pseudomonas aeruginosa, a Gram-negative rod. Its envelope has an outer membrane, a periplasmic space with a thin peptidoglycan wall, and an inner membrane.' },
      { t0: 6, t1: 13, n: 2, title: 'Antibiotic entry', cap: 'Meropenem is polar and cannot cross the lipid bilayer. It slips through the OprD porin channel into the periplasm.', voice: 'Meropenem approaches the outer membrane. It is too polar to cross the lipid, so it passes through the O p r D porin channel into the periplasm.' },
      { t0: 13, t1: 22, n: 3, title: 'NDM enzyme recognition', tag: 'Resistance mechanism activated', cap: 'NDM, a zinc-dependent metallo-β-lactamase, sits in the periplasm. Two Zn²⁺ ions line its active site and meropenem enters the catalytic pocket.', voice: 'In the periplasm sits N D M, a zinc dependent metallo beta lactamase. Two zinc ions wait at its active site, and meropenem enters the catalytic pocket.' },
      { t0: 22, t1: 33, n: 4, title: 'Antibiotic destruction', tag: 'Antibiotic inactivation', cap: 'Zn²⁺ activates a water molecule into hydroxide, which attacks the β-lactam carbonyl. The ring opens: the product cannot effectively inhibit PBPs.', voice: 'Zinc activates a water molecule into hydroxide. The hydroxide attacks the carbonyl of the beta lactam ring. The ring opens, and the drug is hydrolysed.' },
      { t0: 33, t1: 45, n: 5, title: 'Bacterial survival', tag: 'Bacterial survival', cap: 'The inactive product cannot acylate PBPs. Transpeptidation continues, peptidoglycan cross-links form and the wall stays intact.', voice: 'The opened product can no longer inhibit the penicillin binding proteins. Peptidoglycan cross linking continues, the wall stays intact, and the bacterium survives.' },
      { t0: 45, t1: 60, n: 6, title: 'Final outcome', cap: 'The surviving bacterium divides into two daughter cells. NDM-mediated hydrolysis explains why meropenem fails in this model.', voice: 'The surviving cell divides into two daughter cells. N D M hydrolyses carbapenems, so meropenem fails here. Actual susceptibility must still be confirmed by laboratory testing.' }
    ] : [
      { t0: 0, t1: 6, n: 1, title: 'Bacterial introduction', cap: 'Control run, NDM switched off. Same bacterium: outer membrane, periplasm with peptidoglycan, inner membrane.', voice: 'Control run with N D M switched off. The same bacterium, with its outer membrane, periplasm and inner membrane.' },
      { t0: 6, t1: 13, n: 2, title: 'Antibiotic entry', cap: 'Meropenem passes through the OprD porin into the periplasm. Porin loss and efflux are also switched off in this experiment.', voice: 'Meropenem passes through the porin into the periplasm. Efflux and porin loss are also switched off in this experiment.' },
      { t0: 13, t1: 22, n: 3, title: 'No enzyme in the periplasm', cap: 'With no metallo-β-lactamase to meet, meropenem crosses the periplasm towards its targets, the PBPs on the inner membrane.', voice: 'With no beta lactamase to meet, meropenem crosses the periplasm towards the penicillin binding proteins.' },
      { t0: 22, t1: 33, n: 4, title: 'Target engagement', tag: 'PBP inhibited', cap: 'The active-site serine of PBP attacks the β-lactam carbonyl. The ring opens and the drug stays covalently attached: an inactive acyl-enzyme.', voice: 'The active site serine of the penicillin binding protein attacks the beta lactam. The ring opens, and the drug stays covalently attached to the enzyme.' },
      { t0: 33, t1: 45, n: 5, title: 'Wall synthesis fails', tag: 'Cross-linking blocked', cap: 'With PBPs blocked, new cross-links cannot form. Autolysins keep cutting and the peptidoglycan weakens.', voice: 'With the penicillin binding proteins blocked, new cross links cannot form, and the peptidoglycan weakens.' },
      { t0: 45, t1: 60, n: 6, title: 'Final outcome', cap: 'The weakened wall cannot resist turgor pressure: the cell swells and lyses. This is the susceptible control.', voice: 'The weakened wall cannot hold. The cell swells and lyses. This is the susceptible control, for comparison.' }
    ];
    const R = ndmOn ? {
      rows: [['Antibiotic', 'Meropenem'], ['Resistance mechanism', 'NDM production'], ['Enzyme location', 'Periplasm'], ['Molecular action', 'Beta-lactam hydrolysis'], ['Final outcome', 'Antibiotic inactivated']],
      learn: 'NDM production can confer resistance to carbapenems, including meropenem. Actual susceptibility must be determined from the isolate’s antimicrobial susceptibility testing.',
      path: ['Meropenem enters via OprD', 'Periplasm', 'NDM + 2 Zn²⁺ activate water', 'β-lactam ring hydrolysed', 'PBPs not inhibited', 'Cross-linking continues', 'Cell survives and divides'], good: false
    } : {
      rows: [['Antibiotic', 'Meropenem'], ['Resistance mechanism', 'None in this control (NDM off)'], ['Enzyme location', 'Not applicable'], ['Molecular action', 'PBP serine acylation'], ['Final outcome', 'PBPs inhibited, cell lysis']],
      learn: 'This is a simplified susceptible control: with no carbapenem-hydrolysing enzyme and efflux/porin loss switched off, meropenem reaches its PBP targets. Real isolates often carry several mechanisms, so susceptibility must come from AST.',
      path: ['Meropenem enters via OprD', 'Periplasm (no NDM)', 'PBP serine acylated', 'Cross-linking blocked', 'Wall weakens', 'Lysis'], good: true
    };
    const labels = [];
    const L = (text, a, t0, t1, world, o) => labels.push(Object.assign({ text, a, t0, t1, world: world || 'mol' }, o || {}));
    const heroP = () => P.hero.group.position;
    L('Outer membrane (LPS)', () => V(-56, 22, 16), 4.9, 8.5, 'mol', { dx: 6 }); L('Periplasm', () => V(-56, -4, 0), 4.9, 8.5); L('Peptidoglycan (cell wall)', () => V(-56, -21, 10), 4.9, 8.5); L('Inner membrane', () => V(-56, -45, 16), 4.9, 8.5);
    L('Outer membrane', () => W.cell.body.localToWorld(V(1.2, 1.1, 0)), .3, 4.2, 'cell'); L('Inner membrane', () => W.cell.body.localToWorld(V(-.9, -1.1, 0)), 2.2, 4.2, 'cell');
    L('Polar flagellum', () => W.cell.body.localToWorld(V(5.5, .45, 0)), .3, 3.4, 'cell'); L('blaNDM plasmid', () => W.cell.body.localToWorld(V(-.4, -.15, .35)), 1.2, 3.4, 'cell', ndmOn ? {} : { t1: 0 });
    L('Extracellular space', () => V(-52, 52, 0), 6, 9); L('OprD porin (carbapenem channel)', () => V(-30, 24, 0), 8.6, 13.4); L('Meropenem', () => heroP().clone().add(V(2, 2.5, 0)), 6.4, 13);
    if (ndmOn) {
      L('NDM-1 (zinc metallo-β-lactamase)', () => V(-8, 2.8, 0), 14.6, 17.6, 'mol'); L('Zn²⁺ ×2', () => V(-12.5, -6.3, 0), 16, 22.4, 'mol', { dy: 4 }); L('β-lactam ring', () => P.hero.group.localToWorld(P.hero.atoms.C7.mesh.position.clone()), 18, 24.6, 'mol', { dx: -80, dy: -30 });
      L('Zn²⁺-activated hydroxide', () => P.hero.group.localToWorld(P.hero.atoms.Ow.mesh.position.clone()), 25.4, 28.6, 'mol', { dx: -150, dy: 30 }); L('Ring opened (hydrolysed)', () => P.hero.group.position.clone().add(V(0, 1.4, 0)), 30.6, 33, 'mol');
      L('Inactive product', () => heroP().clone().add(V(0, 2.2, 0)), 33.5, 42, 'mol'); L('PBP3 (transpeptidase)', () => V(32, -34, 4), 34, 45.5, 'mol'); L('New cross-links form', () => V(32, -20, 4), 35.4, 45.5, 'mol', { dx: -20 });
    } else {
      L('PBP3 (transpeptidase)', () => V(32, -34, 4), 15, 22.4); L('Active-site serine', () => W.serO.position.clone(), 22.8, 33, 'mol', { dx: -140, dy: 30 }); L('Meropenem', () => heroP().clone().add(V(2, 2.5, 0)), 14, 22); L('Ring opened: covalent acyl-enzyme', () => heroP().clone().add(V(1, 3.4, 0)), 30, 36);
      L('New cross-links blocked', () => V(32, -19, 4), 36, 45.5, 'mol'); L('Wall breaks down', () => V(40, -26, 6), 40, 45.5, 'mol');
    }
    L('Daughter cells', () => V(0, 2.4, 0), 59, 60.1, 'cell');
    function cellState(t) {
      const o = { p: { H: 3.2, pinch: 0, gap: 0, swell: 0 }, om: .42, fo: .95, im: .34, cy: .5, burst: 0 };
      if (t < 4.9) { o.om = .42 - .22 * sstep(1.8, 3.6, t); o.fo = .95 - .55 * sstep(1.8, 3.6, t); W.cell.body.rotation.y = Math.PI * 2 * sstep(0, 4, t); }
      else if (t >= 45.8) { W.cell.body.rotation.y = .1 + .035 * (t - 45.8); }
      if (t >= 45.8) {
        if (ndmOn) { o.p.H = 3.2 + 1.3 * sstep(46, 52, t); o.p.pinch = sstep(50, 57, t); o.p.gap = 3.2 * sstep(57, 60, t); }
        else { o.p.swell = .4 * sstep(46, 53, t); o.burst = sstep(53, 59, t); const f = 1 - sstep(53.2, 56.5, t); o.om = .42 * f; o.im = .34 * f; o.cy = .5 * f; o.fo = .95 * f; }
      }
      return o;
    }
    function at(t, ctx) {
      P.hideAll();
      W.cell.set(cellState(t), t);
      /* ambient drug molecules */
      P.amb.forEach((m, i) => {
        const b = P.ambBase[i], ap = sstep(6, 9.5 + i * .5, t); m.group.visible = true;
        m.group.position.set(b[0] + wob(t, i) * 2.4 + 6 * ap * (i % 2 ? 1 : -.3), lerp(b[1], 30.5 + i * 1.3, ap) + wob(t, i + 9) * 1.2, b[2] + wob(t, i + 4) * 1.5); m.group.rotation.set(t * .6 + i, t * .4 + i * 2, t * .5);
      });
      /* hero */
      const hero = P.hero, hp = posK(t), a = t < 9.6 ? .9 : t < 11.8 ? .22 : t < 22.4 ? lerp(.55, 0, sstep(19, 22.4, t)) : t < 30.4 ? 0 : .35;
      hero.group.visible = true; hero.group.position.copy(jit(hp, t, ndmOn ? a : (t < 22.5 ? Math.min(a, .55) : 0), 5)); hero.group.rotation.copy(eul(t));
      if (ndmOn) {
        /* NDM appears at 13 s */
        const s = sstep(13, 14.4, t), ob = 1 + .12 * Math.sin(clamp((t - 13) / 1.6) * Math.PI) * 2; W.ndm.visible = t >= 13; const sc = Math.max(.001, s * ob); W.ndm.scale.setScalar(sc); W.ndm.position.copy(W.pos.ndm).multiplyScalar(1 - sc);
        const pu = clamp((t - 13) / 1.8); P.pop.position.copy(W.pos.ndm); P.pop.scale.setScalar(2 + 34 * pu); P.pop.material.opacity = t >= 13 && t < 14.8 ? .7 * (1 - pu) : 0; P.pop.quaternion.copy(ctx.camera.quaternion);
        W.waters.forEach(w => { w.visible = t > 15; w.position.copy(w.userData.p).add(V(wob(t, w.userData.s) * .7, wob(t, w.userData.s + 3) * .6, wob(t, w.userData.s + 5) * .5)); });
        react(P, W, hero, 22.4 + (t - 22.4), 'water', D_NDM, true);
        W.znGlow.forEach((g, i) => { if (t > 14.4 && t < 22.4) g.material.opacity = .55 + .3 * Math.sin(t * 5 + i * 2); });
        /* PBP crosslinking continues */
        const st = [34.6, 37, 39.2, 41.4, 43.4]; let ok = 0; W.pg.newBars.forEach((b, i) => { b.grow = seg(st[i], st[i] + 1.5, t); if (t > st[i] && t < st[i] + 1.6) ok = Math.max(ok, Math.sin(seg(st[i], st[i] + 1.6, t) * Math.PI)); });
        W.pbpOk.material.opacity = .85 * ok; W.pg.apply(0, .5 * sstep(33.5, 36, t) + .0);
        if (t > 31) hero.mix(0xcf9a9a, .6 * sstep(31, 33, t));
        if (t > 41.2 && t < 44.2) { const x = P.xs[0]; x.visible = true; x.position.set(29, -18, 3); x.material.opacity = sstep(41.2, 41.8, t) * (1 - sstep(43.4, 44.2, t)); }
      } else {
        react(P, W, hero, 22.4 + (t - 22.5), 'ser', D_PBP, false);
        if (t < 22.5) { hero.morph(0); hero.layout(); }
        if (t > 31) hero.mix(0xff6a5e, .25 * sstep(31, 33, t));
        W.pg.apply(sstep(33.5, 44.5, t), 0);
        [[36, 30, -19, 3], [39, 34, -19, 1], [42, 26, -19, -3]].forEach((c, i) => { const x = P.xs[i]; if (t > c[0]) { x.visible = true; x.position.set(c[1], c[2], c[3] + 4); x.material.opacity = sstep(c[0], c[0] + .8, t); } });
      }
      /* camera */
      const world = t < 4.9 ? 'cell' : t < 45.8 ? 'mol' : 'cell';
      let c; if (world === 'cell') c = cellCam(t); else c = cam(Math.max(t, 4.9));
      const focus = t < 13 ? hero.group.position.clone() : ndmOn ? (t < 33 ? V(-12.5, -4, 0) : V(30, -24, 0)) : V(32, -26, 0);
      return { world, pos: c[0], look: c[1], focus, focusDist: 18, flash: flashAt(t, [4.9, 45.8]) };
    }
    return { id: ndmOn ? 'ndm_on' : 'ndm_off', duration: 60, scenes, labels, result: R, attach(w) { W = w; P = props(w); }, at };
  }

  /* -------------------------------------------------- Experiment 2 -------------------------------------------------- */
  function drug(kind) {
    let W, P;
    const defs = {
      cfdc: {
        dur: 30, name: 'Cefiderocol', scenes: [
          { t0: 0, t1: 7, title: 'Siderophore-cephalosporin approaches', cap: 'Cefiderocol carries a catechol group that chelates Fe³⁺ (orange). Iron-hungry Pseudomonas recognises it at a TonB-dependent iron transporter.', voice: 'Cefiderocol carries a catechol group that chelates iron. Pseudomonas recognises it at an iron transporter in the outer membrane.' },
          { t0: 7, t1: 14, title: 'Trojan-horse entry', cap: 'The plug of the iron transporter opens and the drug is pulled into the periplasm, a route that does not depend on the OprD porin.', voice: 'The transporter plug opens and the drug is pulled into the periplasm. This route does not depend on the porin.' },
          { t0: 14, t1: 21, title: 'Meeting NDM', tag: 'NDM is present and active', cap: 'NDM binds the drug poorly: cefiderocol is relatively stable to metallo-β-lactamases, so it is not efficiently hydrolysed here.', voice: 'N D M meets cefiderocol, but binds it poorly. Cefiderocol is relatively stable to metallo beta lactamases, so it is not efficiently hydrolysed here.' },
          { t0: 21, t1: 30, title: 'PBP3 binding', tag: 'PBP inhibited', cap: 'Cefiderocol reaches PBP3, the serine acylates, cross-linking fails. Real activity still depends on the isolate: transporter mutations and other enzymes can reduce it.', voice: 'Cefiderocol reaches penicillin binding protein 3 and blocks cross linking. In real isolates, activity still depends on the susceptibility profile.' }
        ],
        result: { rows: [['Antibiotic', 'Cefiderocol'], ['Uptake', 'TonB-dependent iron transporter'], ['NDM effect', 'Poor substrate (relatively stable)'], ['Molecular action', 'PBP3 inhibition'], ['Model outcome', 'Active: wall synthesis blocked']], learn: 'NDM does not automatically defeat cefiderocol. Activity can still be reduced by other mechanisms (for example iron-transport mutations or additional β-lactamases), and some NDM producers show higher MICs, so susceptibility must come from the isolate’s AST.', path: ['Fe³⁺ chelation', 'TonB-dependent transporter', 'Periplasm', 'NDM: poor hydrolysis', 'PBP3 acylated', 'Cross-linking blocked'], good: true }
      },
      cazavi: {
        dur: 24, name: 'Ceftazidime-avibactam', scenes: [
          { t0: 0, t1: 6, title: 'Two agents approach', cap: 'Ceftazidime is a cephalosporin; avibactam is a non-β-lactam β-lactamase inhibitor. They approach the outer membrane together.', voice: 'Ceftazidime is a cephalosporin. Avibactam is a beta lactamase inhibitor. They approach the outer membrane together.' },
          { t0: 6, t1: 12, title: 'Entry through a porin', cap: 'Both pass a porin channel into the periplasm, where NDM is waiting.', voice: 'Both agents pass through a porin into the periplasm, where N D M is waiting.' },
          { t0: 12, t1: 19, title: 'Avibactam cannot stop NDM', tag: 'Avibactam does not inhibit NDM', cap: 'Avibactam inhibits many serine β-lactamases, but not metallo-β-lactamases. It drifts past while NDM hydrolyses ceftazidime.', voice: 'Avibactam does not inhibit metallo beta lactamases. It drifts past, while N D M hydrolyses ceftazidime.' },
          { t0: 19, t1: 24, title: 'Outcome', tag: 'Cross-linking continues', cap: 'The inactive ceftazidime cannot block PBPs, so the wall is built and the bacterium survives.', voice: 'Inactive ceftazidime cannot block the penicillin binding proteins, so the wall continues to be built.' }
        ],
        result: { rows: [['Antibiotic', 'Ceftazidime-avibactam'], ['NDM effect', 'Hydrolyses ceftazidime'], ['Avibactam', 'Does not inhibit NDM'], ['Molecular action', 'β-lactam hydrolysis'], ['Model outcome', 'Antibiotic inactivated']], learn: 'Avibactam does not inhibit NDM, so ceftazidime-avibactam alone should not be portrayed as overcoming NDM. Treatment options for NDM producers are chosen from susceptibility testing and ID / antimicrobial stewardship advice.', path: ['Ceftazidime + avibactam enter', 'NDM present', 'Avibactam ineffective vs NDM', 'Ceftazidime hydrolysed', 'PBPs not inhibited', 'Cell survives'], good: false }
      },
      colistin: {
        dur: 24, name: 'Colistin', scenes: [
          { t0: 0, t1: 6, title: 'Cationic peptide approaches', cap: 'Colistin is a polycationic cyclic peptide with a fatty-acyl tail. It is not a β-lactam, so NDM is irrelevant to it.', voice: 'Colistin is a polycationic cyclic peptide with a fatty acyl tail. It is not a beta lactam.' },
          { t0: 6, t1: 12, title: 'Binding lipid A', tag: 'Target: LPS', cap: 'Its positive charges bind the negative phosphates of lipid A and displace the Mg²⁺ / Ca²⁺ ions that stabilise the LPS layer.', voice: 'Its positive charges bind the negative phosphates of lipid A, and displace the magnesium and calcium ions that stabilise the lipopolysaccharide layer.' },
          { t0: 12, t1: 18, title: 'Outer-membrane disruption', cap: 'The tail inserts, the LPS layer is disordered and the outer membrane becomes permeable. No periplasmic enzyme is involved.', voice: 'The tail inserts, the lipopolysaccharide layer is disordered, and the outer membrane becomes permeable. No periplasmic enzyme is involved.' },
          { t0: 18, t1: 24, title: 'Outcome', tag: 'NDM not involved', cap: 'Activity depends on the isolate’s own lipid A modifications and susceptibility profile, not on NDM.', voice: 'Whether colistin works depends on lipid A modification and the isolate’s susceptibility profile, not on N D M.' }
        ],
        result: { rows: [['Antibiotic', 'Colistin'], ['Target', 'LPS lipid A, outer membrane'], ['NDM effect', 'None (not a β-lactam)'], ['Molecular action', 'Membrane disruption'], ['Model outcome', 'Outer membrane disrupted']], learn: 'NDM does not inactivate colistin. Whether it works depends on the isolate: lipid A modification (for example through pmrAB changes or mcr genes) can cause resistance, so susceptibility must be tested.', path: ['Cationic peptide', 'Binds lipid A', 'Displaces Mg²⁺ / Ca²⁺', 'Outer membrane disrupted'], good: true }
      },
      amikacin: {
        dur: 26, name: 'Amikacin', scenes: [
          { t0: 0, t1: 6, title: 'Aminoglycoside approaches', cap: 'Amikacin is a polycationic aminoglycoside. It crosses the outer membrane by displacing Mg²⁺ bridges between LPS molecules.', voice: 'Amikacin is a polycationic aminoglycoside. It crosses the outer membrane by displacing the magnesium bridges between lipopolysaccharide molecules.' },
          { t0: 6, t1: 13, title: 'Through the periplasm', tag: 'NDM is not involved', cap: 'NDM does not recognise aminoglycosides, so amikacin passes the enzyme without being hydrolysed.', voice: 'N D M does not recognise aminoglycosides, so amikacin passes the enzyme unchanged.' },
          { t0: 13, t1: 20, title: 'Inner-membrane transport', cap: 'Energy-dependent uptake across the inner membrane, driven by the proton motive force, carries it into the cytoplasm.', voice: 'Energy dependent uptake across the inner membrane carries it into the cytoplasm.' },
          { t0: 20, t1: 26, title: 'Ribosome binding', tag: 'Mistranslation', cap: 'Amikacin binds the 30S subunit decoding site: codons are misread and faulty proteins accumulate.', voice: 'Amikacin binds the decoding site of the thirty S subunit. Codons are misread, and faulty proteins accumulate.' }
        ],
        result: { rows: [['Antibiotic', 'Amikacin'], ['Target', '30S ribosomal subunit (16S rRNA)'], ['NDM effect', 'None on amikacin itself'], ['Molecular action', 'Mistranslation'], ['Model outcome', 'Active in this model']], learn: 'NDM does not degrade aminoglycosides, but NDM-producing isolates are frequently reported to co-carry aminoglycoside-modifying enzymes or 16S rRNA methyltransferases (for example RmtB, ArmA) that cause high-level resistance. Activity depends on the isolate’s profile.', path: ['Crosses outer membrane', 'Periplasm (NDM ignores it)', 'Inner-membrane uptake', '30S A-site binding', 'Mistranslation'], good: true }
      }
    };
    const d = defs[kind], labels = []; const L = (text, a, t0, t1, world, o) => labels.push(Object.assign({ text, a, t0, t1, world: world || 'mol' }, o || {}));
    function mk() {
      if (kind === 'cfdc') {
        const pos = keyPath([[0, -8, 50, 5], [3, 4, 36, 3], [5.5, 12, 26, .5], [7, 12, 22, 0], [8.4, 12, 14, 0], [10, 12, 5, 0], [11, 12, 0, .5], [13.2, 3, 1, 3], [15, -6, 1.5, 3.6], [16.8, -11, 0, 3.9], [18.2, -4, -5, 3], [19.6, 14, -17, 2], [20.6, 26, -23.5, 1], [21.4, D_PBP.x, D_PBP.y, 0], [30, D_PBP.x, D_PBP.y, 0]]);
        const eu = euler([[0, .8, 0, .4], [5, .4, .6, 1.2], [7, 0, 0, 1.57], [10, 0, 0, 1.57], [12, .3, .5, 1], [16, 1, .6, .5], [19, .5, .2, 0], [21.4, 0, 0, -.349], [30, 0, 0, -.349]]);
        const cam = camFrom([[0, [-4, 40, 44], [4, 36, 0]], [4.5, [8, 34, 30], [12, 28, 0]], [7.5, [16, 22, 26], [12, 18, 0]], [10, [18, 8, 22], [12, 4, 0]], [13.5, [4, 4, 36], [-2, -4, 0]], [16.5, [-2, 2, 20], [-9, -4, 0]], [18.5, [6, -6, 30], [4, -10, 0]], [20.6, [28, -20, 20], [30, -25, 0]], [22.5, [27, -27.8, 11], [32, -26.6, 0]], [27, [36, -27.8, 10], [32.5, -26.5, 0]], [30, [32, -24, 24], [32, -24, 0]]]);
        return { pos, eu, cam };
      }
      if (kind === 'cazavi') {
        const pos = keyPath([[0, -44, 42, 5], [2, -42, 38, 3], [4, -36, 32, 1], [5.5, -30.5, 26.5, 0], [6.5, -30, 19, 0], [7.5, -30, 12, 0], [8.4, -30, 6, 0], [9.5, -27, 1, 1], [11, -20, -1.5, 2], [12.6, -12.5, -3.1, 0], [17.6, -12.5, -3.1, 0], [18.6, -8, 2, 2], [19.6, 4, -2, 3], [21, 18, -12, 3], [24, 30, -20, 3]]);
        const eu = euler([[0, .8, 0, .4], [5.5, 0, 0, 1.57], [8.4, 0, 0, 1.57], [10, .3, .5, 1], [12.6, 0, 0, -.349], [17.6, 0, 0, -.349], [20, .8, 1, .5], [24, 1, .5, 1]]);
        const apos = keyPath([[0, -36, 50, 10], [2, -33, 46, 9], [4, -29, 38, 7], [5.5, -26, 28.5, 3.5], [6.5, -28.6, 19, 1], [7.5, -29, 12, 0], [8.4, -29, 6, 0], [9.8, -24, 3, 3], [11.4, -16, 4, 5], [13, -10, 2.5, 6], [14, -6, 5, 7], [16, 4, 8, 7], [19, 14, 6, 8], [24, 26, 2, 8]]);
        const cam = camFrom([[0, [-34, 44, 38], [-40, 42, 4]], [4.5, [-26, 36, 28], [-34, 32, 1]], [6.5, [-23, 24, 20], [-30, 19, 0]], [8.4, [-22, 8, 24], [-29, 4, 0]], [10.2, [-22, 2, 30], [-18, -3, 0]], [12.6, [-18, -1, 14], [-12.5, -4, 0]], [15, [-11, -2, 11], [-12.5, -4.4, 0]], [18.5, [-8, 3, 17], [-8, -3, 0]], [20.5, [20, -12, 30], [28, -22, 0]], [24, [30, -12, 28], [32, -22, 0]]]);
        return { pos, eu, apos, cam };
      }
      if (kind === 'colistin') {
        const pos = keyPath([[0, -14, 50, 5], [3, -12, 38, 4], [5.5, -9.5, 29, 3.5], [8, -9, 26.5, 3.5], [10, -9, 25.5, 3.5], [24, -9, 25.5, 3.5]]);
        const eu = euler([[0, .6, 0, .3], [4, .3, .5, 1.2], [6, 0, 0, -.7], [9, 0, 0, -1.45], [24, 0, 0, -1.45]]);
        const cam = camFrom([[0, [-8, 42, 42], [-10, 34, 0]], [5.5, [-9, 37, 34], [-9.5, 25.5, 0]], [8, [-9, 35, 30], [-9, 24, 0]], [12, [-9, 31, 32], [-9, 21, 0]], [17, [-9, 27, 38], [-9, 17, 0]], [24, [-9, 14, 60], [-9, 6, 0]]]);
        return { pos, eu, cam };
      }
      const pos = keyPath([[0, -14, 50, 4], [3, -18, 36, 3], [6, -20, 26, 2], [7.4, -20, 19, 2], [8.8, -20, 12, 2], [10.2, -19, 4, 2.5], [11.8, -16, -4, 5.5], [13.5, -12, -18, 6], [14.8, -10, -32, 5], [16.4, -10, -48, 4], [18, -10, -62, 3], [19.6, -10, -72, 2], [20.8, -10, -74.2, 0], [26, -10, -74.2, 0]]);
      const eu = euler([[0, .8, 0, .4], [6, .3, .5, 1], [10, .6, .9, .8], [16, .3, .4, .3], [19.6, 0, 0, -.5], [26, 0, 0, -.5]]);
      const cam = camFrom([[0, [-8, 40, 40], [-14, 36, 0]], [5.5, [-14, 34, 28], [-19, 24, 0]], [8.8, [-14, 18, 26], [-20, 14, 0]], [11, [0, 2, 36], [-16, -2, 0]], [14, [4, -26, 42], [-10, -32, 0]], [17, [4, -50, 38], [-10, -50, 0]], [20.4, [0, -66, 32], [-10, -75, 0]], [26, [-4, -74, 30], [-10, -77, 0]]]);
      return { pos, eu, cam };
    }
    const K = mk();
    const cellCam = camFrom([[0, [0, 1.6, 17], [0, 0, 0]]]);
    function at(t, ctx) {
      P.hideAll(); W.cell.set({ p: { H: 3.2, pinch: 0, gap: 0, swell: 0 } }, t);
      W.ndm.visible = true; W.waters.forEach(w => { w.visible = true; w.position.copy(w.userData.p).add(V(wob(t, w.userData.s) * .7, wob(t, w.userData.s + 3) * .6, wob(t, w.userData.s + 5) * .5)); });
      const setH = (m, p, e, a) => { m.group.visible = true; m.group.position.copy(jit(p, t, a, 5)); m.group.rotation.copy(e); };
      let focus = V(-12.5, -4, 0), fd = 20;
      if (kind === 'cfdc') {
        const h = P.cfdc; setH(h, K.pos(t), K.eu(t), t < 11 ? .3 : t < 21 ? .35 : 0); h.layout();
        react(P, W, h, 22.4 + (t - 21.4), 'ser', D_PBP, false);
        if (t < 21.4) { h.morph(0); h.layout(); P.ogBond.visible = false; W.pbpGlow.material.opacity = 0; }
        W.tbdt.plug.position.set(3.6 * sstep(7, 8.5, t) * (1 - sstep(10.5, 12, t)), 1 + 2.5 * sstep(7, 8.5, t) * (1 - sstep(10.5, 12, t)), -2.5 * sstep(7, 8.5, t) * (1 - sstep(10.5, 12, t)));
        W.pg.apply(sstep(26, 30, t), 0); if (t > 27) { const x = P.xs[0]; x.visible = true; x.position.set(32.5, -17, 3); x.material.opacity = sstep(27, 28, t); }
        focus = t < 13 ? V(12, 12, 0) : t < 20 ? V(-12.5, -4, 0) : V(32, -26, 0);
      } else if (kind === 'cazavi') {
        const c = P.caz, a = P.avi; setH(c, K.pos(t), K.eu(t), t < 11 ? .8 : t < 12.6 ? .4 : 0);
        const hold = 12.6, ts = 22.4 + (t - hold) * 1.45; react(P, W, c, ts, 'water', D_NDM, true); if (t < hold - .0) { c.morph(0); c.layout(); }
        if (t > 14.6) c.mix(0xcf9a9a, .6 * sstep(14.6, 18, t));
        W.znGlow.forEach((g, i) => { if (t < 12.6) g.material.opacity = .55 + .25 * Math.sin(t * 5 + i * 2); });
        a.group.visible = true; a.group.position.copy(jit(K.apos(t), t, .8 * (1 - sstep(16, 20, t)) + .15, 9)); a.group.rotation.set(t * .7, t * .5, t * .6);
        const ax = P.xs[1]; if (t > 13.4 && t < 17.4) { ax.visible = true; ax.scale.setScalar(1.3); ax.position.copy(P.avi.group.position).add(V(0, 1.9, 1)); ax.material.opacity = sstep(13.4, 14, t) * (1 - sstep(16.6, 17.4, t)); }
        const st = [19.4, 20.4, 21.4, 22.4, 23.2]; let ok = 0; W.pg.newBars.forEach((b, i) => { b.grow = seg(st[i], st[i] + 1, t); if (t > st[i] && t < st[i] + 1.1) ok = Math.max(ok, Math.sin(seg(st[i], st[i] + 1.1, t) * Math.PI)); });
        W.pbpOk.material.opacity = .85 * ok; W.pg.apply(0, .4 * sstep(18.5, 20, t));
        focus = t < 7 ? V(-30, 18, 0) : t < 19 ? V(-12.5, -4, 0) : V(30, -24, 0);
      } else if (kind === 'colistin') {
        const c = P.col; setH(c, K.pos(t), K.eu(t), t < 8 ? .3 : .08); c.layout();
        const cx = -9, dis = sstep(9, 17, t);
        W.om.items.forEach((p, i) => { const dx = p[0] - cx; if (Math.abs(dx) > 11) return; const f = (1 - Math.abs(dx) / 11) * dis; W.om.setHead(i, wob(t * .6, i) * 2.2 * f, (wob(t * .5, i + 3) * 2.6 + 1.8) * f, wob(t * .7, i + 8) * 1.8 * f, 1 + .25 * f); });
        W.om.flush(); W.om.dirty = true;
        P.colAmb.forEach((m, i) => { const ang = i * 1.9 + .6, tx = cx + Math.cos(ang) * 6.5, tz = Math.sin(ang) * 7 + 3, ap = sstep(3 + i * .7, 8 + i * .7, t); m.group.visible = true; m.group.position.set(lerp(tx + 10, tx, ap), lerp(46, 26.4 - dis * 3.8, ap), lerp(tz + 6, tz, ap)); m.group.rotation.set(0, 0, lerp(.4, -1.45, ap)); m.layout(); });
        P.mg.forEach((m, i) => { m.visible = t > 5.5 && t < 17; const s = sstep(6.5 + i * .35, 10.5 + i * .35, t); m.position.set(cx - 7 + i * 3.4 + s * (i % 2 ? 8 : -6), 20.5 + s * 14, 5 + (i % 3) * 2 + s * 4); m.material.opacity = 1; });
        focus = V(-9, 21, 0); fd = 26;
      } else {
        const a = P.ami; setH(a, K.pos(t), K.eu(t), t < 21 ? .45 : .1); a.opacity(1 - .55 * Math.max(sstep(7.6, 8.4, t) * (1 - sstep(9.6, 10.4, t)), sstep(14.4, 15.2, t) * (1 - sstep(16.8, 17.6, t)))); a.layout();
        W.cell.root.visible = false; const rb = P.ribo; rb.visible = true;
        const bind = sstep(20.6, 21.6, t); W.pbpOk.material.opacity = 0;
        P.chain.forEach((b, i) => { b.visible = t > 21 + i * .28; b.material.color.setHex(t > 22 ? 0xff6a5e : 0xc7d4e4); b.material.emissive.setHex(t > 22 ? 0x501010 : 0); });
        P.pop.position.set(-10, -75, 0); P.pop.quaternion.copy(ctx.camera.quaternion); P.pop.scale.setScalar(3 + 9 * ((t * .5) % 1)); P.pop.material.color.setHex(0xff6a5e); P.pop.material.opacity = t > 21 ? .5 * (1 - ((t * .5) % 1)) : 0;
        P.mg.forEach((m, i) => { m.visible = t > 5.5 && t < 11; const s = sstep(6.5 + i * .3, 10 + i * .3, t); m.position.set(-20 - 6 + i * 3.2 + s * (i % 2 ? 7 : -5), 20.5 + s * 12, 5 + (i % 3) * 2); });
        focus = t < 13 ? V(-18, 10, 0) : t < 20 ? V(-10, -40, 0) : V(-10, -76, 0);
      }
      const c = K.cam(t), world = 'mol';
      return { world, pos: c[0], look: c[1], focus, focusDist: fd, flash: 0 };
    }
    /* labels need P/W at call-time, so they are registered after attach */
    const sc = { id: kind, duration: d.dur, scenes: d.scenes.map((s, i) => Object.assign({ n: i + 1 }, s)), labels, result: d.result, attach(w) { W = w; P = props(w); }, at };
    /* declare labels up-front using lazy anchors (P is set by attach) */
    const lbl = (text, a, t0, t1, o) => labels.push(Object.assign({ text, a, t0, t1, world: 'mol' }, o || {}));
    if (kind === 'cfdc') { lbl('Fe³⁺-chelating catechol', () => P.cfdc.group.localToWorld(P.cfdc.atoms.Fe.mesh.position.clone()), 1, 7.4, { dx: -150 }); lbl('TonB-dependent iron transporter', () => V(12, 24, 0), 4.5, 12); lbl('Plug moves aside', () => V(16, 8, 0), 7.6, 10.4); lbl('NDM: poor substrate', () => V(-8, 3, 0), 14.6, 20); lbl('PBP3 serine acylated', () => W.serO.position.clone(), 24, 30, { dx: -140, dy: 30 }); lbl('Cross-linking fails', () => V(32, -19, 4), 25, 30); lbl('Cefiderocol', () => P.cfdc.group.position.clone().add(V(0, 2.6, 0)), 1, 22, { dy: -30 }); }
    if (kind === 'cazavi') { lbl('Ceftazidime', () => P.caz.group.position.clone().add(V(0, 2.4, 0)), 1, 12.4); lbl('Avibactam', () => P.avi.group.position.clone().add(V(0, 2.4, 0)), 1, 19); lbl('Avibactam does not bind NDM', () => V(-8.5, 5, 5), 13.8, 18); lbl('Ceftazidime hydrolysed', () => P.caz.group.position.clone().add(V(0, 2, 0)), 16, 19.4); lbl('New cross-links form', () => V(32, -20, 4), 20, 24); }
    if (kind === 'colistin') { lbl('Colistin', () => P.col.group.position.clone().add(V(0, 3.6, 0)), 1, 8); lbl('Mg²⁺ / Ca²⁺ displaced', () => P.mg[2].position.clone(), 7, 12, { dx: 12 }); lbl('LPS layer disordered', () => V(-9, 23.5, 12), 12.6, 20); lbl('NDM unaffected (no β-lactam)', () => W.pos.ndm.clone().add(V(0, 9, 0)), 18, 24); }
    if (kind === 'amikacin') { lbl('Amikacin', () => P.ami.group.position.clone().add(V(0, 3, 0)), 1, 20); lbl('NDM: no recognition', () => V(-8, 2.8, 0), 8.4, 13); lbl('Inner-membrane uptake (PMF)', () => V(-30, -45, 14), 14, 18.5); lbl('30S decoding site', () => V(-10, -68, 4), 20.5, 26, { dx: 14 }); lbl('Faulty protein', () => P.chain[10].position.clone(), 22.5, 26); }
    return sc;
  }

  M.util = { props, react, camFrom, flashAt, jit, euler, sprite, D_NDM, D_PBP, cellCamKeys, qDock };
  M.scenarios = {
    ndm_on: () => meropenem(true), ndm_off: () => meropenem(false),
    cfdc: () => drug('cfdc'), cazavi: () => drug('cazavi'), colistin: () => drug('colistin'), amikacin: () => drug('amikacin')
  };
})();
