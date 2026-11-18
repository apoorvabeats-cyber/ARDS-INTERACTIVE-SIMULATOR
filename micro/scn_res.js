/* MICRO Resistance Lab scenario composer.
   M.scenarios.res({ org, abx, mech: [ids] }) builds a timeline for exactly the mechanisms that were ticked.
   Every mechanism gets its own molecular scene; a parallel-pathway scene then shows DIFFERENT drug molecules taking different fates
   (never one molecule with incompatible fates). Fates come from MICRO.res.evaluate(), not from a canned outcome. */
(function () {
  'use strict';
  const T = THREE, M = window.MICRO, R = M.res, { clamp, lerp, sstep, seg, V, wob, keyPath } = M.u, { glow } = M.fx;
  const U = M.util, { props, react, camFrom, flashAt, jit, euler, sprite, D_NDM, D_PBP } = U;
  const D_REF = V(12, -26.3, 0), D_SER = V(-44.5, -3.1, 0), E = (a, b, c) => new T.Euler(a, b, c);
  const XA = -30, XR = -52, PX = 52;                    /* OprD site, second porin copy, pump axis */
  const TINT = { L: 0x9fd0ff, T: 0xffe0a0, O: 0xf59ab0 };

  const lc = x => x.charAt(0).toLowerCase() + x.slice(1);
  function resProps(W, cls) {
    const P = props(W); if (!P.res) {
      const r = P.res = { tok: {}, hi: [], x: [], ok: [] };
      for (let i = 0; i < 4; i++) { const h = glow(0x4de3d0, 16, 0); h.visible = false; W.root.add(h); r.hi.push(h); }
      for (let i = 0; i < 5; i++) { const s = sprite('✗', '#ff5a4e'); W.root.add(s); r.x.push(s); }
      for (let i = 0; i < 2; i++) { const s = sprite('✓', '#4dffa0'); W.root.add(s); r.ok.push(s); }
      P.resHide = function () {
        Object.values(r.tok).forEach(a => a.forEach(m => { m.group.visible = false; m.opacity(1); m.restore(); m.morph(0); m.bond('lac').fade = 1; m.layout(); }));
        r.hi.forEach(h => { h.visible = false; h.material.opacity = 0; }); r.x.concat(r.ok).forEach(s => { s.visible = false; s.scale.setScalar(3.2); s.material.opacity = 1; });
        Object.values(r.tok).forEach(a => a.forEach(m => m.group.scale.setScalar(1)));
      };
    }
    if (cls && !P.res.tok[cls]) {
      const def = cls === 'carb' ? M.defs.meropenem : M.defs.cephalosporin, a = [];
      for (let i = 0; i < 6; i++) { const m = M.Molecule(def, { scale: .5, pivot: 'C7', carbon: cls === 'carb' ? 0x9fe08c : 0x8fd0ff }); m.atoms.Ow.mesh.visible = false; m.atoms.Hw.mesh.visible = false; m.group.visible = false; m.layout(); W.root.add(m.group); a.push(m); }
      P.res.tok[cls] = a;
    }
    return P;
  }

  const entryKeys = (xp, s, k) => [[s, xp - 12, 52, 3], [s + .9 * k, xp - 6, 40, 1.5], [s + 1.6 * k, xp, 28, 0], [s + 2.0 * k, xp, 19, 0], [s + 2.4 * k, xp, 12, 0], [s + 2.8 * k, xp, 5, 0], [s + 3.4 * k, xp + 2, -2, 1]];
  const tumble = (t, i) => [t * .6 + i, t * .4 + i * 2, t * .5];
  /* orientation: tumbling, vertical inside a channel (x near xc, y inside [y0, y1]) */
  function orient(p, xc, y0, y1, t, i) { const w = Math.abs(p.x - xc) < 4.5 ? sstep(y0 - 2, y0 + 3, p.y) * (1 - sstep(y1 - 4, y1 + 2, p.y)) : 0, a = tumble(t, i); return E(lerp(a[0], 0, w), lerp(a[1], 0, w), lerp(a[2], 1.57, w)); }

  function make(cfg) {
    const org = R.ORGS[cfg.org], abx = R.ABX[cfg.abx], on = new Set(cfg.mech || []);
    const plan = R.evaluate(cfg.org, cfg.abx, on), fr = plan.fr, cls = abx.cls;
    const info = id => R.mechInfo(cfg.org, id);
    const enzOn = org.mechs.filter(m => R.MECH[m].kind === 'enzyme' && on.has(m));
    const mEnz = enzOn.filter(m => R.MECH[m].cls === 'metallo'), sEnz = enzOn.filter(m => R.MECH[m].cls === 'serine');
    const hasM = mEnz.length > 0, hasS = sEnz.length > 0, eff = on.has('efflux'), por = on.has('porin'), tgt = on.has('target');
    const sCapacity = 1 - sEnz.reduce((a, e) => a * (1 - ((R.HYD[e] && R.HYD[e][cfg.abx]) || 0)), 1);
    const serPoor = hasS && sCapacity < R.POOR;
    const nameList = ids => ids.map(i => R.MECH[i].short).join(' / ');
    const pumpN = org.pump, porN = org.porin.name, A = abx.name;
    const mechNames = org.mechs.filter(m => on.has(m)).map(m => info(m).name);
    let W, P, hero, tk;

    /* ---------------- timeline ---------------- */
    const S = []; let cur = 0;
    const add = (o) => { o.t0 = cur; o.t1 = cur + o.len; cur = o.t1; o.n = S.length + 1; S.push(o); return o; };
    const cellDef = () => ({ p: { H: 3.2, pinch: 0, gap: 0, swell: 0 }, om: .42, fo: .95, im: .34, cy: .5, burst: 0 });
    const hl = (i, ap, t) => { const h = P.res.hi[i]; h.visible = true; h.material.opacity = ap * (.55 + .25 * Math.sin(t * 6)); };

    /* ---- floaters: unused drug molecules hovering above the outer membrane ---- */
    const baseA = [[-52, 46, -4], [-40, 56, 8], [-20, 50, -6], [-60, 38, 6], [-4, 58, 2], [-34, 44, -10]];
    function floaters(lt, from, ap) {
      for (let i = from; i < tk.length; i++) { const m = tk[i], b = baseA[i]; m.group.visible = true; m.group.position.set(b[0] + wob(lt, i) * 2.4 + 6 * ap * (i % 2 ? 1 : -.3), lerp(b[1], 33 + i * 1.3, ap) + wob(lt, i + 9) * 1.2, b[2] + wob(lt, i + 4) * 1.5); m.group.rotation.set(lt * .6 + i, lt * .4 + i * 2, lt * .5); m.layout(); }
    }
    const heroSet = (p, e, a, lt) => { hero.group.visible = true; hero.group.position.copy(jit(p, lt, a, 5)); hero.group.rotation.copy(e); };

    /* ===== 1. introduction ===== */
    const sIntro = add({
      id: 'intro', len: 9, title: 'The bacterium and the ticked mechanisms',
      cap: (mechNames.length ? mechNames.join(' · ') + ' ticked.' : 'No resistance mechanism ticked: this is the susceptible reference.') + ' Each acts at a different step: entry, extrusion, enzymatic destruction, target binding.',
      voice: org.name + '. ' + (mechNames.length ? 'The mechanisms you ticked are ' + mechNames.join(', ') + '. Each one acts at a different step.' : 'No resistance mechanism is ticked, so this is the susceptible reference.') + ' Drug molecules will take different fates.',
      tag: mechNames.length ? mechNames.length + ' of ' + org.mechs.length + ' mechanisms activated' : 'Susceptible reference'
    });
    /* ===== 2. entry ===== */
    const sEntry = add({
      id: 'entry', len: 13, title: por ? 'Porin loss: the entry barrier' : 'Entry through the porin',
      cap: por ? porN + ' is lost in the left-hand patch of outer membrane: the surface is sealed with lipid and the drug cannot pass. A remaining channel (left) still admits some molecules, so fewer reach the periplasm. ' + (cfg.abx === 'imi' && org.id === 'pa' ? 'OprD loss is especially important for imipenem.' : org.id === 'pa' && (cfg.abx === 'mem') ? 'OprD loss affects meropenem less than imipenem; other mechanisms also contribute.' : porN + ' is not the main route for this drug, so the effect is small.') : A + ' is polar and cannot cross the lipid bilayer. It passes through the open ' + porN + ' channel into the periplasm.',
      voice: por ? 'With the porin lost, part of the outer membrane has no open channel. Entry is restricted, and fewer drug molecules reach the periplasm.' : A + ' is too polar to cross the lipid, so it enters through the open porin channel.',
      tag: por ? 'Reduced permeability: reduced antibiotic exposure' : null
    });
    const sEff = eff ? add({
      id: 'eff', len: 17, title: 'Active efflux: the molecular exit gate', tag: 'Active efflux: reduced antibiotic accumulation',
      cap: pumpN.name + ' is a three-part pump. ' + pumpN.inner + ' (inner membrane) recognises the drug, ' + pumpN.adaptor + ' (periplasmic adaptor) links the parts, ' + pumpN.outer + ' (outer-membrane channel) is the exit. Proton motive force drives it. ' + (R.hint(cfg.org, cfg.abx, 'efflux').indexOf('poor') >= 0 ? A + ' is a poor substrate, so the pump changes little here.' : ''),
      voice: 'The efflux pump spans the whole envelope. The inner membrane transporter binds the drug, energy from the proton gradient drives it through the adaptor, and the outer membrane channel releases it outside. The periplasmic concentration falls.'
    }) : null;
    const sM = hasM ? add({
      id: 'enzM', len: 19, title: info(mEnz[0]).full.split(' (')[0] + ': enzymatic destruction', tag: 'Enzymatic hydrolysis: antibiotic inactivation',
      cap: 'A zinc-dependent metallo-β-lactamase sits in the periplasm. Two Zn²⁺ ions line the active site; Zn²⁺ activates a water molecule into hydroxide, which attacks the β-lactam carbonyl. The ring opens and the product cannot inhibit PBPs effectively.',
      voice: 'N D M is a zinc dependent metallo beta lactamase in the periplasm. Zinc activates a water molecule into hydroxide. The hydroxide attacks the beta lactam ring, the ring opens, and the antibiotic is inactivated.'
    }) : null;
    const sS = hasS ? add({
      id: 'enzS', len: serPoor ? 12 : 23, title: nameList(sEnz) + ': serine β-lactamase', tag: serPoor ? 'Poor substrate: ' + A + ' is not hydrolysed' : 'Acyl-enzyme, then hydrolysis',
      cap: serPoor ? nameList(sEnz) + ' is present, but ' + A + ' is a poor substrate for it. The drug binds loosely, is not opened, and moves on unchanged. This is why an ESBL alone does not defeat carbapenems.'
        : 'A serine β-lactamase (' + nameList(sEnz) + ') attacks the β-lactam with its active-site serine, forming an acyl-enzyme and opening the ring. A water molecule then hydrolyses that bond and the inactive product is released.',
      voice: serPoor ? 'This enzyme is present, but the antibiotic is a poor substrate. It is not opened, and it moves on unchanged.' : 'A serine beta lactamase attacks the beta lactam ring with its active site serine. The ring opens and forms a covalent acyl enzyme. A water molecule then releases the opened, inactive product.'
    }) : null;
    const sT = add({
      id: 'tgt', len: tgt ? 21 : 15, title: tgt ? 'Target alteration: the lock no longer fits' : 'Target engagement',
      tag: tgt ? 'Reduced antibiotic binding (hypothetical mechanism)' : 'PBP inhibited',
      cap: tgt ? 'Left: a normal PBP, whose active-site serine attacks the β-lactam. Right: an altered PBP with bulky substituted residues around the pocket (orange), so binding is reduced and cell-wall synthesis can continue. This is a separate hypothetical mechanism, not assumed for every isolate.'
        : 'The active-site serine of the PBP attacks the β-lactam carbonyl. The ring opens and the drug stays covalently attached: an inactive acyl-enzyme that blocks cross-linking.',
      voice: tgt ? 'Left, a normal penicillin binding protein binds the antibiotic. Right, the altered protein has a modified binding site and binding is reduced, so cell wall synthesis can continue. This is a hypothetical mechanism.' : 'The active site serine of the penicillin binding protein attacks the beta lactam. The ring opens and the drug stays covalently attached, blocking cross linking.'
    });
    const sPar = add({
      id: 'par', len: 22, title: 'Parallel molecular pathways',
      cap: 'Different drug molecules take different fates at the same time. Of ' + 6 + ' molecules shown: ' + R.FATE_ORDER.map(f => [f, R.tokens(fr, 6)[f]]).filter(x => x[1]).map(x => x[1] + ' ' + lc(R.FATE_TXT[x[0]])).join(', ') + '.',
      voice: 'Now all the ticked mechanisms act at once, on different molecules. Some never enter, some are pumped out, some are hydrolysed, and the rest reach the target.',
      tag: 'Illustrative model: not a clinical prediction'
    });
    const oc = plan.outcome;
    const sOut = add({
      id: 'out', len: 14, title: oc === 'blocked' ? 'Outcome: cell wall synthesis blocked' : oc === 'partial' ? 'Outcome: activity partly reduced' : 'Outcome: the bacterium survives',
      tag: plan.n === 0 ? 'NO RESISTANCE MECHANISM · ANTIBIOTIC REACHES ITS TARGET' : oc === 'survive' ? (plan.n > 1 ? 'MULTIPLE RESISTANCE MECHANISMS · REDUCED ANTIBIOTIC ACTIVITY · BACTERIAL SURVIVAL' : 'RESISTANCE MECHANISM ACTIVE · REDUCED ANTIBIOTIC ACTIVITY · BACTERIAL SURVIVAL') : oc === 'partial' ? 'PARTLY REDUCED ANTIBIOTIC ACTIVITY' : 'ANTIBIOTIC STILL REACHES ITS TARGET',
      cap: (oc === 'survive' ? 'Few active molecules engage the PBPs (' + Math.round(plan.engagement * 100) + '% of the mechanism-free reference), cell-wall synthesis continues and the cell divides.' : oc === 'partial' ? Math.round(plan.engagement * 100) + '% of the reference engages the PBPs: the wall is damaged but some cells may survive and divide slowly.' : Math.round(plan.engagement * 100) + '% of the reference engages the PBPs: cross-linking fails, the wall weakens and the cell lyses.') + ' Conceptual teaching model: it does not mean every clinical isolate has these mechanisms or this susceptibility.',
      voice: oc === 'survive' ? 'Few active molecules reach and bind the target, so the wall is still built and the cell divides. This is a conceptual model, not a clinical result.' : oc === 'partial' ? 'Some drug still reaches the target, so the wall is damaged but survivors may divide slowly. This is a conceptual model.' : 'Enough drug reaches the target to block cross linking. The wall weakens and the cell lyses. This is a conceptual model.'
    });
    const DUR = cur;

    /* ---------------- token plan for the parallel scene ---------------- */
    const cnt = R.tokens(fr, 6); let nM = 0, nS = 0;
    if (cnt.hydro) { const cm = plan.cls.metallo, cs = plan.cls.serine; nM = Math.round(cnt.hydro * cm / Math.max(1e-9, cm + cs)); nS = cnt.hydro - nM; }
    const groups = [Array(cnt.efflux).fill('efflux'), Array(nM).fill('hydroM'), Array(nS).fill('hydroS'), Array(cnt.weak).fill('weak'), Array(cnt.noEntry).fill('noEntry'), Array(cnt.bound).fill('bound')];
    const order = []; for (let k = 0; order.length < 6 && k < 8; k++) groups.forEach(g => { if (g[k]) order.push(g[k]); });
    const plan6 = [], used = { M: 0, S: 0, B: 0, E: 0 }, pockets = tgt ? [D_PBP] : [D_PBP, D_REF];
    order.forEach((kind, i) => {
      const tkn = { kind, i, s: .4 + i * .62, xp: por ? XR : (i % 2 ? XR : XA), dock: true, near: 0 };
      if (kind === 'hydroM' || kind === 'hydroS') { const q = kind === 'hydroM' ? 'M' : 'S'; tkn.D = kind === 'hydroM' ? D_NDM : D_SER; tkn.q = used[q]; if (used[q] >= 2) { tkn.dock = false; tkn.near = used[q] - 1; } else tkn.s += used[q] * 2.9; used[q]++; }
      if (kind === 'bound') { if (used.B < pockets.length) { tkn.D = pockets[used.B]; tkn.q = used.B; } else { tkn.dock = false; tkn.near = used.B - pockets.length; tkn.D = D_PBP; } used.B++; }
      if (kind === 'weak') tkn.D = D_PBP;
      if (kind === 'noEntry') tkn.xp = por ? XA : -41;
      if (kind === 'efflux') { if (used.E >= 1) tkn.s += 3.2 * used.E; used.E++; }
      plan6.push(tkn);
    });
    const keysFor = tkn => {
      const s = tkn.s, xp = tkn.xp, E1 = entryKeys(xp, s, 1), D = tkn.D;
      if (tkn.kind === 'noEntry') return [[s, xp - 10, 52, 3], [s + 1.2, xp - 4, 40, 2], [s + 2.2, xp, 29, .5], [s + 2.7, xp, 27.2, 0], [s + 3.5, xp + 1, 32, 1.5], [s + 5, xp + 7, 44, 3], [s + 8, xp + 12, 58, 5], [s + 12, xp + 14, 66, 6]];
      if (tkn.kind === 'efflux') return E1.concat([[s + 5.4, xp + 30, -8, 4], [s + 7.4, 40, -18, 5], [s + 8.6, 49, -25, 5], [s + 9.5, PX, -27.6, 4.7], [s + 10.8, PX, -27.6, 4.7], [s + 11.8, PX, -20, 0], [s + 12.6, PX, -8, 0], [s + 13.4, PX, 8, 0], [s + 14.2, PX, 22, 0], [s + 15, PX + 2, 34, 1], [s + 16.5, PX + 6, 48, 4]]);
      if (tkn.kind === 'hydroM' || tkn.kind === 'hydroS') {
        const o = tkn.near ? V(tkn.near * 6 + 3, 5 + tkn.near, 3 - tkn.near) : V(0, 0, 0), t0 = s + 7.2;
        const dx = tkn.D.x + o.x, dy = tkn.D.y + o.y, dz = tkn.D.z + o.z;
        return E1.concat([[s + 5.0, lerp(xp, dx, .5), 3, 3], [s + 6.2, dx + 3, dy + 5, 2], [t0, dx, dy, dz], [s + 9.0, dx, dy, dz], [s + 10.0, dx + 8, dy + 4, dz + 3], [s + 12.0, dx + 14, dy + 10, dz + 5], [s + 14.0, dx + 18, dy + 14, dz + 7]]);
      }
      if (tkn.kind === 'bound' || tkn.kind === 'weak') {
        if (tkn.kind === 'weak') return E1.concat([[s + 5.5, lerp(xp, 32, .45), -8, 4], [s + 7.0, 30, -17, 4], [s + 8.0, 31.5, -22, 2], [s + 8.6, 34.5, -22.6, 3.5], [s + 9.4, 32, -21.4, 1.5], [s + 10.2, 36, -19.5, 4], [s + 11.5, 41, -14, 6], [s + 14, 47, -8, 6]]);
        if (tkn.dock) return E1.concat([[s + 5.5, lerp(xp, D.x, .55), -8, 3], [s + 7.0, D.x - 2, D.y + 11, 3], [s + 7.8, D.x + 1, D.y + 3.5, 1], [s + 8.6, D.x, D.y, 0], [s + 30, D.x, D.y, 0]]);
        const o = V(-6 + tkn.near * 7, 7 + (tkn.near % 2) * 3, 3 + tkn.near), cx = D.x + o.x, cy = D.y + o.y;
        return E1.concat([[s + 5.5, lerp(xp, cx, .55), -8, 3], [s + 7.0, cx - 2, cy + 5, 3], [s + 8.2, cx, cy, o.z], [s + 30, cx, cy, o.z]]);
      }
      return E1;
    };
    plan6.forEach(t => { t.path = keyPath(keysFor(t)); });

    /* ---------------- cell outcome ---------------- */
    function cellOut(lt) {
      const o = cellDef(); W.cell.body.rotation.y = .1 + .035 * lt;
      if (oc === 'survive') { o.p.H = 3.2 + 1.3 * sstep(.2, 6.2, lt); o.p.pinch = sstep(4.2, 11.2, lt); o.p.gap = 3.2 * sstep(11.2, 14, lt); }
      else if (oc === 'partial') { o.p.swell = .22 * sstep(.2, 7, lt); o.p.H = 3.2 + .5 * sstep(.2, 6, lt); o.p.pinch = .55 * sstep(5, 13, lt); }
      else { o.p.swell = .4 * sstep(.2, 7.2, lt); o.burst = sstep(7.2, 13.2, lt); const f = 1 - sstep(7.4, 10.7, lt); o.om = .42 * f; o.im = .34 * f; o.cy = .5 * f; o.fo = .95 * f; }
      return o;
    }

    /* ---------------- pump animation ---------------- */
    function pump(t, front) {
      if (!eff) return; const tints = [TINT.L, TINT.T, TINT.O];
      W.pump.lobes.forEach((l, i) => {
        let st = Math.floor(((t / 5 + i / 3) % 1) * 3); if (i === 0 && front != null) st = front;
        l.body.material.color.setHex(tints[st]); const sq = st === 2 ? .93 : st === 1 ? .98 : 1; l.g.scale.set(1, sq, 1); l.g.position.y = st === 2 ? 1 : 0;
      });
      const k = (t * .5) % 1; W.pump.h.material.opacity = .9 * Math.sin(k * Math.PI); W.pump.h.position.set(PX + 6.2, -22 - 22 * k, 3.5);
    }

    /* ---------------- scene runners ---------------- */
    const run = {};
    run.intro = function (lt, ctx) {
      floaters(lt, 0, sstep(5, 9, lt));
      const world = lt < 5.2 ? 'cell' : 'mol';
      if (lt < 5.2) { const o = cellDef(); o.om = .42 - .22 * sstep(1.8, 3.6, lt); o.fo = .95 - .55 * sstep(1.8, 3.6, lt); W.cell.body.rotation.y = Math.PI * 2 * sstep(0, 5, lt); W.cell.set(o, lt); }
      /* mechanisms illuminate one after another */
      const sites = []; if (por) sites.push([V(XA, 18, 0), 'por']); if (eff) sites.push([V(PX, -2, 0), 'eff']); if (hasM) sites.push([V(-8, -6, 0), 'm']); if (hasS) sites.push([V(-40, -6, 0), 's']); if (tgt) sites.push([V(32, -25, 0), 't']);
      sites.slice(0, 4).forEach((s, i) => { const t0 = 5.5 + i * .8, ap = sstep(t0, t0 + .5, lt) * (1 - sstep(t0 + 1.4, t0 + 2.2, lt)); if (lt > 5.2) { hl(i, ap, lt); P.res.hi[i].position.copy(s[0]); } });
      const cam = lt < 5.2 ? camFrom([[0, [0, 1.6, 19], [0, 0, 0]], [3.9, [0, 1, 15], [0, 0, 0]], [5.2, [.3, .3, 3.3], [.3, .2, 1.4]]])(lt) : camFrom([[5.2, [0, 14, 128], [0, 12, 0]], [9, [4, 10, 122], [4, 10, 0]]])(lt);
      return { world, pos: cam[0], look: cam[1], focus: V(0, -6, 0), focusDist: 60, flash: flashAt(lt, [5.2]) };
    };
    run.entry = function (lt) {
      const xp = por ? XR : XA, k = 1.6, kk = entryKeys(xp, 2.2, k).concat([[11, xp + 8, -6, 2], [13, xp + 16, -9, 3]]), pp = keyPath(kk);
      const p = pp(lt); hero.group.visible = true; hero.group.position.copy(jit(p.clone(), lt, lt < 6 ? .5 : lt < 9 ? .12 : .3, 5)); hero.group.rotation.copy(orient(p, xp, 4, 27, lt, 0)); hero.morph(0); hero.layout();
      const b = tk[1], bx = por ? XA : XR, bk = por ? [[0, bx - 14, 58, 4], [4, bx - 8, 46, 3], [7.4, bx - 2, 34, 1.5], [9.4, bx, 27.2, 0], [10.2, bx, 27.8, 0], [11.2, bx + 2, 31, 1], [12.4, bx + 7, 42, 3], [13, bx + 9, 48, 4]] : entryKeys(bx, 5.4, k).concat([[13, bx + 10, -7, 2]]);
      const bp = keyPath(bk)(lt); b.group.visible = true; b.group.position.copy(jit(bp.clone(), lt, .35, 8)); b.group.rotation.copy(orient(bp, bx, 4, 27, lt, 1)); b.layout();
      if (por) { const x = P.res.x[0]; if (lt > 9.4 && lt < 13) { x.visible = true; x.position.set(XA, 24, 3); x.material.opacity = sstep(9.4, 10, lt) * (1 - sstep(12.4, 13, lt)); } hl(0, .35 * (1 - sstep(10, 13, lt)), lt); P.res.hi[0].position.set(XA, 17, 0); }
      floaters(lt, 2, 1);
      const cam = por ? camFrom([[0, [-41, 24, 64], [-41, 18, 0]], [3.4, [-50, 38, 40], [-54, 34, 0]], [5.4, [-52, 20, 24], [-52, 14, 0]], [7.4, [-50, 6, 26], [-52, 4, 0]], [9, [-41, 24, 60], [-41, 14, 0]], [13, [-41, 22, 64], [-41, 14, 0]]])(lt)
        : camFrom([[0, [-30, 44, 54], [-30, 34, 0]], [3, [-26, 36, 34], [-30, 30, 0]], [4.6, [-24, 24, 20], [-30, 19, 0]], [6.2, [-23, 12, 19], [-30, 10, 0]], [8, [-22, 6, 24], [-30, 2, 0]], [10.5, [-30, 10, 60], [-30, 2, 0]], [13, [-34, 8, 78], [-34, 4, 0]]])(lt);
      return { world: 'mol', pos: cam[0], look: cam[1], focus: V(xp, 14, 0), focusDist: 24, flash: 0 };
    };
    run.eff = function (lt) {
      const hp = keyPath([[0, 38, -6, 6], [1.2, 42, -12, 5.5], [2.4, 48, -20, 5], [3.2, 51, -25.5, 5], [4, PX, -27.6, 4.7], [6.5, PX, -27.6, 4.7], [7.5, PX, -21, 0], [8.6, PX, -8, 0], [9.7, PX, 8, 0], [10.7, PX, 22, 0], [11.5, PX + 2, 34, 1], [13, PX + 5, 46, 4], [17, PX + 8, 58, 6]]);
      const p = hp(lt), inPump = lt > 6.8 && lt < 11.5; hero.group.visible = true; hero.group.position.copy(jit(p.clone(), lt, lt < 4 ? .5 : lt < 6.5 ? .08 : .15, 5)); hero.group.rotation.copy(inPump ? orient(p, PX, -24, 24, lt, 0) : E(...tumble(lt * (lt > 4 && lt < 6.6 ? .1 : 1), 0))); hero.morph(0); hero.layout();
      /* a second molecule follows, so the periplasmic pool visibly falls */
      const b = tk[1], bp = keyPath([[0, 36, -12, 7], [3, 40, -14, 6], [6, 44, -17, 5.5], [7.6, 49, -24, 5], [8.8, PX, -27.6, 4.7], [10.2, PX, -27.6, 4.7], [11.2, PX, -20, 0], [12.2, PX, -8, 0], [13.2, PX, 8, 0], [14.2, PX, 22, 0], [15.2, PX + 3, 36, 2], [17, PX + 8, 52, 5]])(lt);
      b.group.visible = true; b.group.position.copy(jit(bp.clone(), lt, .3, 8)); b.group.rotation.copy(lt > 10.8 && lt < 15 ? orient(bp, PX, -24, 24, lt, 1) : E(...tumble(lt * (lt > 8.8 && lt < 10.2 ? .1 : 1), 1))); b.layout();
      pump(lt, lt < 4 ? 0 : lt < 6.5 ? 1 : lt < 11 ? 2 : 0);
      W.pump.pocketGlow.material.opacity = .8 * sstep(3.6, 4.4, lt) * (1 - sstep(6.4, 7.2, lt));
      W.pump.ring.material.emissiveIntensity = .8 + 1.6 * sstep(10.4, 11.4, lt) * (1 - sstep(12.4, 13.4, lt));
      floaters(lt, 2, 1);
      const cam = camFrom([[0, [44, -2, 62], [50, -8, 0]], [3, [52, -14, 46], [52, -24, 0]], [4.4, [52, -22, 32], [52, -26, 2]], [6.8, [54, -18, 34], [52, -22, 0]], [8.8, [56, -2, 40], [52, -4, 0]], [10.8, [58, 16, 40], [52, 18, 0]], [12.5, [58, 30, 50], [54, 32, 0]], [15, [46, 4, 100], [50, -4, 0]], [17, [44, 4, 106], [48, -4, 0]]])(lt);
      return { world: 'mol', pos: cam[0], look: cam[1], focus: V(PX, -10, 0), focusDist: 30, flash: 0 };
    };
    run.enzM = function (lt, ctx) {
      const ts = 22.4 + (lt - 7), hp = keyPath([[0, -34, 5, 3], [2, -30, 3, 4], [4, -22, 1, 3], [5.6, -16, .5, 1.5], [7, -12.5, -3.1, 0], [15.4, -12.5, -3.1, 0], [16.5, -10, 1, 1.8], [18, -4, 4, 4], [19, 4, 8, 5]]);
      const er = euler([[0, .6, .2, .3], [4, .3, .3, .4], [5.6, .1, .1, -.2], [7, 0, 0, -.349], [15.4, 0, 0, -.349], [17, .3, .5, -.5], [19, .8, 1.2, .2]]);
      const a = lt < 6 ? .5 : lt < 7 ? .15 : lt < 15.4 ? 0 : .35;
      heroSet(hp(lt), er(lt), a, lt);
      const s = sstep(.3, 1.7, lt), ob = 1 + .12 * Math.sin(clamp((lt - .3) / 1.6) * Math.PI) * 2, sc = Math.max(.001, s * ob); W.ndm.visible = lt >= .3; W.ndm.scale.setScalar(sc); W.ndm.position.copy(W.pos.ndm).multiplyScalar(1 - sc);
      const pu = clamp((lt - .3) / 1.8); P.pop.position.copy(W.pos.ndm); P.pop.scale.setScalar(2 + 34 * pu); P.pop.material.opacity = lt >= .3 && lt < 2.1 ? .7 * (1 - pu) : 0; P.pop.quaternion.copy(ctx.camera.quaternion);
      W.waters.forEach(w => { w.visible = lt > 1.5; w.position.copy(w.userData.p).add(V(wob(lt, w.userData.s) * .7, wob(lt, w.userData.s + 3) * .6, wob(lt, w.userData.s + 5) * .5)); });
      react(P, W, hero, ts, 'water', D_NDM, true);
      if (lt > 15.6) hero.mix(0xcf9a9a, .6 * sstep(15.6, 17.6, lt));
      W.znGlow.forEach((g, i) => { if (lt < 7) g.material.opacity = .55 + .3 * Math.sin(lt * 5 + i * 2); });
      if (lt > 16.5) { const x = P.res.x[0]; x.visible = true; x.position.set(-9, 6, 4); x.material.opacity = sstep(16.5, 17.3, lt); }
      floaters(lt, 3, 1);
      const cam = camFrom([[0, [-6, 1, 46], [-9, -8, 0]], [.8, [-18, 5, 26], [-12, -4, 0]], [2.6, [-15, 4, 18], [-12.4, -4, 0]], [4.6, [-14, 3.5, 15.5], [-12.5, -4, 0]], [7, [-11, 3, 13], [-12.5, -4.2, 0]], [9.6, [-16, 2.5, 11.5], [-12.5, -4.8, 0]], [11.8, [-9, 2, 11], [-12.3, -4.4, 0]], [13, [-10.8, 1.4, 7.4], [-11.8, -4, 0]], [15, [-12, 1.6, 7.6], [-11.8, -3.9, 0]], [16, [-12.5, 2.5, 11.2], [-12.3, -3.6, 0]], [17, [-8, 2, 17], [-10, -2, 0]], [19, [-4, 2, 30], [-8, -4, 0]]])(lt);
      return { world: 'mol', pos: cam[0], look: cam[1], focus: V(-12.5, -4, 0), focusDist: 18, flash: 0 };
    };
    run.enzS = function (lt, ctx) {
      const poor = serPoor, s = sstep(.3, 1.7, lt), ob = 1 + .12 * Math.sin(clamp((lt - .3) / 1.6) * Math.PI) * 2, sc = Math.max(.001, s * ob);
      const G = W.serEnz.group; G.visible = true; G.scale.setScalar(sc); G.position.copy(W.pos.enzS).multiplyScalar(1 - sc);
      const pu = clamp((lt - .3) / 1.8); P.pop.position.copy(W.pos.enzS); P.pop.scale.setScalar(2 + 34 * pu); P.pop.material.opacity = lt >= .3 && lt < 2.1 ? .7 * (1 - pu) : 0; P.pop.material.color.setHex(0x7fe8ff); P.pop.quaternion.copy(ctx.camera.quaternion);
      if (poor) {
        const hp = keyPath([[0, -52, 8, 3], [3, -48, 3, 3], [5, -46, -1, 1.5], [6.4, -44.5, -1.5, .8], [7.6, -44.5, .6, 1.2], [8.6, -47, 4, 4], [11, -52, 9, 6], [12, -56, 12, 6]])(lt);
        hero.group.visible = true; hero.group.position.copy(jit(hp.clone(), lt, .45, 5)); hero.group.rotation.set(...tumble(lt * .8, 0)); hero.morph(0); hero.layout();
        if (lt > 8.4) { const o = P.res.ok[0]; o.visible = true; o.position.copy(hero.group.position).add(V(0, 2.4, 1)); o.material.opacity = sstep(8.4, 9, lt); }
        floaters(lt, 2, 1);
        const cam = camFrom([[0, [-46, 10, 60], [-42, -4, 0]], [2, [-52, 6, 34], [-46, -3, 0]], [4.4, [-52, 4, 20], [-45, -3, 0]], [6.4, [-47, 2, 15], [-44.5, -2.8, 0]], [9, [-52, 2.5, 18], [-46, -2, 0]], [12, [-48, 6, 34], [-46, -2, 0]]])(lt);
        return { world: 'mol', pos: cam[0], look: cam[1], focus: V(-44.5, -4, 0), focusDist: 20, flash: 0 };
      }
      const ts = 22.4 + (lt - 6), hp = keyPath([[0, -52, 8, 3], [2, -50, 5, 4], [4, -48, 2, 3], [5, -46, -.5, 1.5], [6, D_SER.x, D_SER.y, 0], [17.4, D_SER.x, D_SER.y, 0], [18.4, D_SER.x + 3, D_SER.y + 3, 1.5], [20.5, D_SER.x + 9, D_SER.y + 8, 4], [23, D_SER.x + 14, D_SER.y + 13, 6]]);
      const er = euler([[0, .6, .2, .3], [4, .3, .3, .4], [5, .1, .1, -.2], [6, 0, 0, -.349], [17.4, 0, 0, -.349], [19, .3, .5, -.5], [23, .8, 1.2, .2]]);
      heroSet(hp(lt), er(lt), lt < 5 ? .5 : lt < 6 ? .15 : lt < 17.4 ? 0 : .35, lt);
      react(P, W, hero, ts, 'ser', D_SER, false, { og: W.serEnz.og, glow: W.serEnz.glow, glowK: .75 });
      /* deacylation: a water attacks the acyl-enzyme ester and releases the opened product */
      if (ts > 34) P.ogBond.visible = false;
      const w = W.waters[0]; w.visible = lt > 15 && lt < 17.9; const c7 = hero.group.localToWorld(hero.atoms.C7.mesh.position.clone()); w.position.copy(V(-52, 4, 6)).lerp(c7.add(V(-.9, 1.1, .5)), sstep(15.2, 17.2, lt));
      if (lt > 17.6) hero.mix(0xcf9a9a, .6 * sstep(17.6, 19.6, lt));
      if (lt > 18.6) { const x = P.res.x[0]; x.visible = true; x.position.set(D_SER.x, 5, 4); x.material.opacity = sstep(18.6, 19.4, lt); }
      floaters(lt, 2, 1);
      const cam = camFrom([[0, [-46, 10, 60], [-42, -4, 0]], [2, [-52, 6, 34], [-46, -3, 0]], [4.4, [-52, 4, 20], [-45, -3, 0]], [6, [-47, 2, 13], [-44.5, -3.6, 0]], [9, [-52, 2.5, 11.5], [-44.5, -4, 0]], [12, [-40, 2, 11], [-44.5, -4, 0]], [13.6, [-42.5, 1.6, 7.8], [-44, -3.6, 0]], [16, [-46, 2, 9], [-44.5, -3.6, 0]], [18.4, [-47, 3, 13], [-44.5, -3, 0]], [20.5, [-40, 2, 26], [-42, -2, 0]], [23, [-36, 3, 40], [-40, -4, 0]]])(lt);
      return { world: 'mol', pos: cam[0], look: cam[1], focus: V(-44.5, -4, 0), focusDist: 18, flash: 0 };
    };
    run.tgt = function (lt) {
      if (!tgt) {
        const ts = 22.4 + (lt - 5), hp = keyPath([[0, 10, -12, 6], [2, 20, -18, 4], [3.6, 27, -23, 2], [5, 32, -26.3, 0], [15, 32, -26.3, 0]]), er = euler([[0, .3, .5, 1], [3, .2, .3, -.2], [5, 0, 0, -.349], [15, 0, 0, -.349]]);
        heroSet(hp(lt), er(lt), lt < 5 ? .6 : 0, lt); react(P, W, hero, ts, 'ser', D_PBP, false);
        if (lt > 12) hero.mix(0xff6a5e, .25 * sstep(12, 14, lt));
        W.pg.apply(.5 * sstep(11, 15, lt), 0); if (lt > 12.5) { const x = P.res.x[0]; x.visible = true; x.position.set(32.5, -17, 3); x.material.opacity = sstep(12.5, 13.3, lt); }
        floaters(lt, 2, 1);
        const cam = camFrom([[0, [14, -14, 34], [12, -18, 0]], [3, [26, -20, 20], [30, -25, 0]], [5, [29, -27.5, 13], [32, -26.5, 0]], [7.5, [27, -27.8, 11], [32, -26.6, 0]], [10.5, [37, -27.8, 10], [32.5, -26.5, 0]], [13, [32, -27.8, 9.5], [32, -26.4, 0]], [15, [30, -27, 26], [32, -24, 0]]])(lt);
        return { world: 'mol', pos: cam[0], look: cam[1], focus: V(32, -26, 0), focusDist: 18, flash: 0 };
      }
      /* side by side: normal PBP (x = 12) and altered PBP (x = 32) */
      const ts = 22.4 + (lt - 5), hp = keyPath([[0, 2, -10, 6], [2, 6, -16, 4], [3.6, 10, -23, 2], [5, 12, -26.3, 0], [21, 12, -26.3, 0]]), er = euler([[0, .3, .5, 1], [3, .2, .3, -.2], [5, 0, 0, -.349], [21, 0, 0, -.349]]);
      heroSet(hp(lt), er(lt), lt < 5 ? .6 : 0, lt); react(P, W, hero, ts, 'ser', D_REF, false, { og: W.serRefO, glow: W.pbpRefGlow });
      if (lt > 12) hero.mix(0xff6a5e, .25 * sstep(12, 14, lt));
      const b = tk[0], bp = keyPath([[0, 42, -10, 6], [4, 37, -16, 5], [7, 33.5, -22, 3], [8, 32.6, -23.8, 2.2], [9, 35, -22, 4], [10, 33, -23.6, 2], [11, 34.6, -21.6, 3.5], [12, 32.4, -23.9, 1.8], [13.2, 36, -20, 4.5], [15, 40, -15, 6], [21, 46, -10, 7]])(lt);
      b.group.visible = true; b.group.position.copy(jit(bp.clone(), lt, .3, 8)); b.group.rotation.set(0, 0, lt > 6 && lt < 14 ? -.6 : lt * .5); b.morph(0); b.layout();
      if (lt > 8.8) { const x = P.res.x[0]; x.visible = true; x.position.set(32, -20.6, 3.5); x.material.opacity = sstep(8.8, 9.6, lt) * (1 - sstep(18, 20, lt)); }
      if (lt > 12.4) { const o = P.res.ok[0]; o.visible = true; o.position.set(12, -20, 3); o.material.opacity = sstep(12.4, 13.2, lt); }
      floaters(lt, 2, 1);
      const cam = camFrom([[0, [22, -24, 62], [22, -26, 0]], [4, [16, -26, 40], [12, -26, 0]], [5, [8, -27.5, 13], [12, -26.5, 0]], [9, [16, -27.8, 11], [12.5, -26.5, 0]], [13.4, [8, -27.8, 9.5], [12, -26.4, 0]], [15, [27, -26, 30], [32, -25, 0]], [17, [38, -25, 18], [32, -25, 0]], [19, [34, -26, 30], [28, -26, 0]], [21, [22, -24, 58], [22, -26, 0]]])(lt);
      return { world: 'mol', pos: cam[0], look: cam[1], focus: lt < 14 ? V(12, -26, 0) : V(32, -26, 0), focusDist: 18, flash: 0 };
    };
    run.par = function (lt) {
      if (eff) pump(lt);
      plan6.forEach((tn, i) => {
        const m = tk[i], p = tn.path(lt), s = tn.s; m.group.visible = true; m.group.scale.setScalar(2.1);
        const jj = tn.kind === 'bound' || tn.kind === 'hydroM' || tn.kind === 'hydroS' ? (lt > s + 7.4 && lt < s + 9.5 && tn.dock ? .04 : .3) : .35; m.group.position.copy(jit(p.clone(), lt, jj, i * 3 + 1));
        let rot;
        if (tn.kind === 'efflux') { const inP = Math.abs(p.x - PX) < 3 && p.y > -24; rot = inP ? orient(p, PX, -24, 24, lt, i) : orient(p, tn.xp, 4, 27, lt, i); }
        else if (tn.kind === 'noEntry') rot = orient(p, tn.xp, 4, 27, lt, i);
        else if (tn.kind === 'weak') rot = lt > s + 7 && lt < s + 11 ? E(0, 0, -.5) : orient(p, tn.xp, 4, 27, lt, i);
        else { const dock = (tn.kind === 'bound' ? s + 8.6 : s + 7.4), w = tn.dock ? sstep(dock - 1.2, dock, lt) : 0, o = orient(p, tn.xp, 4, 27, lt, i); rot = tn.kind === 'bound' || !tn.dock || lt < dock + 2.4 ? E(lerp(o.x, 0, w), lerp(o.y, 0, w), lerp(o.z, -.349, w)) : o; }
        m.group.rotation.copy(rot); m.morph(0); m.bond('lac').fade = 1;
        if (tn.kind === 'hydroM' || tn.kind === 'hydroS') { const h = sstep(s + 8.0, s + 8.9, lt); m.morph(h); m.bond('lac').fade = 1 - sstep(s + 8.0, s + 8.6, lt); if (lt > s + 8.9) m.mix(0xcf9a9a, .6 * sstep(s + 8.9, s + 10.5, lt)); }
        if (tn.kind === 'bound') { const h = sstep(s + 9.4, s + 10.2, lt); m.morph(h); m.bond('lac').fade = 1 - sstep(s + 9.4, s + 10, lt); if (lt > s + 10) m.mix(0xff6a5e, .25 * sstep(s + 10, s + 12, lt)); }
        m.layout();
      });
      /* markers on one representative molecule per fate */
      const lead = {}; plan6.forEach((tn, i) => { const k = tn.kind === 'hydroS' ? 'hydroM' : tn.kind; if (!lead[k]) lead[k] = [tn, i]; });
      let xi = 0, oi = 0;
      const mark = (tn, i, t0, t1, bad) => { if (lt < t0 || lt > t1) return; const sp = bad ? P.res.x[xi++] : P.res.ok[oi++]; if (!sp) return; sp.visible = true; sp.scale.setScalar(5.5); sp.position.copy(tk[i].group.position).add(V(0, 5, 1.5)); sp.material.opacity = sstep(t0, t0 + .5, lt) * (1 - sstep(t1 - .6, t1, lt)); };
      if (lead.noEntry) mark(...lead.noEntry, lead.noEntry[0].s + 2.8, lead.noEntry[0].s + 7, true);
      if (lead.efflux) mark(...lead.efflux, lead.efflux[0].s + 13.2, lead.efflux[0].s + 17.5, true);
      if (lead.hydroM) mark(...lead.hydroM, lead.hydroM[0].s + 9.6, lead.hydroM[0].s + 14, true);
      if (lead.weak) mark(...lead.weak, lead.weak[0].s + 8.8, lead.weak[0].s + 12.5, true);
      if (lead.bound) mark(...lead.bound, lead.bound[0].s + 10.6, lead.bound[0].s + 20, false);
      const cam = camFrom([[0, [6, 4, 134], [6, 4, 0]], [11, [6, 0, 126], [6, 0, 0]], [22, [6, 2, 132], [6, 2, 0]]])(lt);
      return { world: 'mol', pos: cam[0], look: cam[1], focus: V(0, 6, 0), focusDist: 60, flash: 0 };
    };
    run.out = function (lt) {
      const cam = camFrom([[0, [.3, .3, 3.3], [.3, .2, 1.4]], [1.8, [0, 1.2, 8.5], [0, 0, 0]], [6.2, [0, 2.4, 18], [0, 0, 0]], [14, [0, 3, 20], [0, 0, 0]]])(lt);
      return { world: 'cell', pos: cam[0], look: cam[1], focus: V(0, 0, 0), focusDist: 12, flash: flashAt(lt, [0]) };
    };

    /* ---------------- labels ---------------- */
    const labels = [], L = (sc, text, a, t0, t1, world, o) => labels.push(Object.assign({ text, a, t0: sc.t0 + t0, t1: sc.t0 + t1, world: world || 'mol' }, o || {}));
    const hp = () => hero.group.position, tp = i => () => tk[i].group.position.clone().add(V(0, 4.2, 0));
    /* intro */
    L(sIntro, 'Outer membrane', () => W.cell.body.localToWorld(V(1.2, 1.1, 0)), .3, 4.2, 'cell'); L(sIntro, 'Inner membrane', () => W.cell.body.localToWorld(V(-.9, -1.1, 0)), 2.2, 4.2, 'cell'); L(sIntro, org.name, () => W.cell.body.localToWorld(V(3.6, .6, 0)), .3, 3.4, 'cell');
    [['Outer membrane (LPS)', 22, 16], ['Periplasm', -4, 0], ['Peptidoglycan', -21, 10], ['Inner membrane', -45, 16]].forEach(a => L(sIntro, a[0], () => V(-56, a[1], a[2]), 5.4, 8.8));
    let hi = 0; if (por) { const k = hi++; L(sIntro, porN + ' lost: reduced entry', () => V(XA, 24, 0), 5.5 + k * .8, 8.9, 'mol', { dx: -20 }); } if (eff) { const k = hi++; L(sIntro, pumpN.name + ': efflux', () => V(PX, 24, 0), 5.5 + k * .8, 8.9, 'mol', { dx: -50 }); }
    if (hasM) { const k = hi++; L(sIntro, nameList(mEnz) + ': hydrolysis', () => V(-8, 4, 0), 5.5 + k * .8, 8.9); } if (hasS) { const k = hi++; L(sIntro, nameList(sEnz) + ': hydrolysis', () => V(-40, 4, 0), 5.5 + k * .8, 8.9); } if (tgt) { L(sIntro, 'Altered PBP (hypothetical)', () => V(32, -18, 4), 5.5 + hi * .8, 8.9); }
    /* entry */
    L(sEntry, porN + (por ? ' (remaining copy)' : ' porin'), () => V(por ? XR : XA, 24, 0), 1, 12, 'mol', { dx: 12 }); L(sEntry, A, () => hp().clone().add(V(2, 2.5, 0)), 2.2, 9); if (por) { L(sEntry, porN + ' absent: entry restricted', () => V(XA, 24.5, 4), 9.4, 13, 'mol', { dx: -10 }); } else { L(sEntry, 'Second ' + porN + ' copy', () => V(XR, 24, 0), 6, 12, 'mol'); }
    /* efflux */
    if (sEff) { const q = sEff; L(q, pumpN.outer + ' (outer-membrane channel)', () => V(PX, 24, 0), .8, 16.8, 'mol', { dx: 14 }); L(q, pumpN.adaptor + ' (periplasmic adaptor)', () => V(PX + 6.4, -9, 0), .8, 16.8, 'mol', { dx: 14 }); L(q, pumpN.inner + ' (inner-membrane transporter)', () => V(PX + 6, -44, 0), .8, 16.8, 'mol', { dx: 14 });
      L(q, A + ' binds the pocket', () => V(PX, -23, 5), 4, 6.8, 'mol', { dx: -150, dy: -10 }); L(q, 'Proton motive force (H⁺)', () => W.pump.h.position.clone(), 6.6, 11, 'mol', { dx: 16 }); L(q, 'Drug expelled', () => V(PX + 2, 38, 2), 11.6, 16.8, 'mol', { dx: 14 }); }
    /* NDM */
    if (sM) { const q = sM; L(q, 'NDM-1 (zinc metallo-β-lactamase)', () => V(-8, 2.8, 0), -.2, 2.6, 'mol'); L(q, 'Zn²⁺ ×2', () => V(-12.5, -6.3, 0), 1.2, 7.4, 'mol', { dy: 4 }); L(q, 'β-lactam ring', () => hero.group.localToWorld(hero.atoms.C7.mesh.position.clone()), 3.2, 9.2, 'mol', { dx: -80, dy: -30 }); L(q, 'Zn²⁺-activated hydroxide', () => hero.group.localToWorld(hero.atoms.Ow.mesh.position.clone()), 10, 13.2, 'mol', { dx: -150, dy: 30 }); L(q, 'Ring opened (hydrolysed)', () => hp().clone().add(V(0, 1.4, 0)), 15.2, 17.6, 'mol'); L(q, 'Inactive product', () => hp().clone().add(V(0, 2.2, 0)), 17.8, 19, 'mol'); }
    if (sS) { const q = sS; L(q, nameList(sEnz) + ' (serine β-lactamase)', () => V(-40, 3, 0), -.2, 3, 'mol'); if (serPoor) { L(q, 'Poor substrate: not opened', () => hp().clone().add(V(0, 2.6, 0)), 6, 11, 'mol'); } else { L(q, 'Catalytic serine', () => W.serEnz.og.position.clone(), 6, 12, 'mol', { dx: -140, dy: 30 }); L(q, 'Acyl-enzyme (ring opened)', () => hp().clone().add(V(0, 3.2, 0)), 13.4, 16, 'mol'); L(q, 'Water hydrolyses the acyl-enzyme', () => W.waters[0].position.clone(), 15.4, 18, 'mol', { dx: -60, dy: -30 }); L(q, 'Inactive product released', () => hp().clone().add(V(0, 2.4, 0)), 18.4, 22.8, 'mol'); } }
    /* target */
    if (!tgt) { L(sT, 'PBP3 (transpeptidase)', () => V(32, -34, 4), 1, 15); L(sT, 'Active-site serine', () => W.serO.position.clone(), 5.4, 13, 'mol', { dx: -140, dy: 30 }); L(sT, A, () => hp().clone().add(V(2, 2.5, 0)), 0, 5.4); L(sT, 'Ring opened: covalent acyl-enzyme', () => hp().clone().add(V(1, 3.4, 0)), 12.6, 15); }
    else { L(sT, 'Normal PBP', () => V(12, -34, 4), 1, 15, 'mol', { dx: -30 }); L(sT, 'Active-site serine', () => W.serRefO.position.clone(), 5.4, 13.6, 'mol', { dx: -140, dy: 30 }); L(sT, 'Normal binding: ring opened, acyl-enzyme', () => hp().clone().add(V(1, 3.4, 0)), 12.6, 15, 'mol'); L(sT, 'Altered PBP (modified binding site)', () => V(32, -19, 4), 1, 21, 'mol', { dx: 10 }); L(sT, 'Reduced binding: drug is not retained', () => tk[0].group.position.clone().add(V(2, 3, 0)), 8.4, 14.4, 'mol', { dx: 10 }); L(sT, 'Cell-wall synthesis can continue', () => V(32, -19, 4), 15.6, 20.6, 'mol', { dx: 10, dy: 24 }); }
    /* parallel */
    { const q = sPar, one = k => plan6.findIndex(t => t.kind === k || (k === 'hydroM' && t.kind === 'hydroS'));
      const w = (k, text, a0, a1, o) => { const i = one(k); if (i >= 0) L(q, text, tp(i), plan6[i].s + a0, plan6[i].s + a1, 'mol', o); };
      w('noEntry', 'Never entered: reduced permeability', 2.4, 7.5); w('efflux', 'Pumped out by ' + pumpN.name, 9.6, 16.8, { dx: -210 }); w('hydroM', (hasM && plan6.some(t => t.kind === 'hydroM') ? nameList(mEnz) : nameList(sEnz)) + ': hydrolysed', 8.2, 13.5); w('weak', 'Reached altered PBP: weak binding', 8.2, 12.5); w('bound', 'Reached PBP: binds target', 9.4, 20.5);
      if (eff) L(q, pumpN.name, () => V(PX, 24, 0), 0, 21.5, 'mol', { dx: -30 }); if (hasM) L(q, nameList(mEnz), () => V(-8, 4, 0), 0, 21.5, 'mol'); if (hasS) L(q, nameList(sEnz) + (serPoor ? ' (poor substrate)' : ''), () => V(-40, 4, 0), 0, 21.5, 'mol'); if (tgt) L(q, 'Altered PBP', () => V(32, -19, 4), 0, 21.5, 'mol'); if (por) L(q, porN + ' lost', () => V(XA, 24, 0), 0, 21.5, 'mol', { dx: -20 }); L(q, 'Other copies of enzymes / PBPs are not drawn', () => V(0, -58, 0), 14, 21.5, 'mol', { dx: -80 }); }
    /* outcome */
    L(sOut, org.name + (oc === 'survive' ? ' (daughter cells)' : oc === 'partial' ? ' (damaged, dividing slowly)' : ' (lysing)'), () => V(0, 2.4, 0), oc === 'survive' ? 12 : 4, 14, 'cell');
    { const ms = org.mechs.filter(m => on.has(m)), n = ms.length; ms.forEach((m, i) => { const x = n > 1 ? -2.7 + 5.4 * i / (n - 1) : 0, y = i % 2 ? -1.5 : 1.5; L(sOut, info(m).name, () => W.cell.body.localToWorld(V(x, y, .2)), 2 + i * .6, 14, 'cell', { cls: 'mechl', dx: -40, dy: i % 2 ? 6 : -22 }); }); }

    /* ---------------- result card ---------------- */
    const pct = x => Math.round(x * 100) + '%';
    const OUT = R.OUT[oc];
    const rows = [['Organism', org.name], ['Antibiotic', A + ' (' + abx.note + ')'], ['Mechanisms ticked', mechNames.length ? mechNames.join(', ') : 'None (susceptible reference)'],
      ['Molecular fates (model)', R.FATE_ORDER.filter(f => fr[f] > .004).map(f => pct(fr[f]) + ' ' + lc(R.FATE_TXT[f])).join(' · ')], ['Target engagement', pct(plan.engagement) + ' of the mechanism-free reference'], ['Model outcome', OUT.label]];
    const notes = []; org.mechs.filter(m => on.has(m)).forEach(m => notes.push(info(m).name + ': ' + R.hint(cfg.org, cfg.abx, m).replace(/^On its own: /, 'alone, ') + '.'));
    const learn = 'Illustrative teaching model, not a clinical susceptibility prediction. ' + (notes.length ? notes.join(' ') + ' ' : '') + org.caveat + ' Actual susceptibility depends on expression levels, other mechanisms and the isolate’s own antimicrobial susceptibility testing (MIC / CLSI or EUCAST interpretation).';
    const path = [A + ' approaches'].concat(R.FATE_ORDER.filter(f => fr[f] >= .04).map(f => pct(fr[f]) + ' ' + lc(R.FATE_TXT[f]))).concat([OUT.label]);
    const result = { rows, learn, path, good: oc === 'blocked', fate: fr, engagement: plan.engagement, outcome: oc };

    /* ---------------- assemble ---------------- */
    const scenes = S.map(s => ({ t0: s.t0, t1: s.t1, n: s.n, title: s.title, cap: typeof s.cap === 'function' ? s.cap() : s.cap, voice: s.voice, tag: s.tag, id: s.id }));
    function attach(w) { W = w; P = resProps(w, cls); tk = P.res.tok[cls]; hero = cls === 'carb' ? P.hero : P.caz; }
    function at(t, ctx) {
      P.hideAll();
      W.pump.group.visible = eff; W.fillPump.visible = !eff; W.oprD.group.visible = !por; W.fillA.visible = por; W.pbpBump.visible = tgt; W.ndm.visible = hasM; W.ndm.scale.setScalar(1); W.ndm.position.set(0, 0, 0); W.serEnz.group.visible = hasS; W.serEnz.group.scale.setScalar(1); W.serEnz.group.position.set(0, 0, 0);
      P.pop.material.color.setHex(0x7fe8ff);
      let sc = S[S.length - 1]; for (let i = 0; i < S.length; i++) if (t < S[i].t1) { sc = S[i]; break; }
      const lt = clamp(t - sc.t0, 0, sc.len);
      const cs = cellDef(); if (sc.id === 'out') { const o = cellOut(lt); W.cell.set(o, t); } else if (sc.id !== 'intro') W.cell.set(cs, t);
      if (eff && sc.id !== 'eff' && sc.id !== 'par') pump(t);
      const out = run[sc.id](lt, ctx || {});
      return out;
    }
    return { id: 'res', duration: DUR, scenes, labels, result, plan, attach, at, title: org.name + ' · ' + A + ' · ' + (mechNames.length ? mechNames.length + ' of ' + org.mechs.length + ' mechanisms' : 'susceptible reference') };
  }

  M.scenarios.res = cfg => make(cfg);
  M.scnRes = { make };
})();
