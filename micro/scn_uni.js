/* MICRO Resistance Lab composer for organisms that use the layered-envelope world (Gram-positives, mycobacteria, fungi).
   M.scenarios.uni({ org, abx, mech: [ids] }) builds a timeline for exactly the mechanisms that were ticked: introduction, entry through the wall,
   pro-drug activation (isoniazid), efflux, enzyme inactivation, target binding (normal, then altered), six parallel drug molecules with different fates,
   and the outcome. Fates come from MICRO.res.evaluate(), never from a canned result. */
(function () {
  'use strict';
  const T = THREE, M = window.MICRO, R = M.res, { clamp, lerp, sstep, seg, V, wob, keyPath } = M.u, { glow } = M.fx;
  const DCOL = { pbp: 0x9fe08c, dala: 0x8fd0ff, mem: 0xff9ad0, ribo: 0xc7a6ff, gyr: 0xffe08a, rnap: 0xff8f6b, inha: 0xcfd6dd, erg11: 0x9fe0d0, fks: 0xd0a0ff, ergos: 0xffc34d };
  const DSIZE = { dala: 1.3, mem: 1.15 }, DBASE = 1;
  const EXTRA = { pbp: 1, dala: 1, mem: 1, fks: 1, ergos: 1 };           /* targets on the outer face of the membrane */
  const WALLDRUG = { pbp: 1, dala: 1, fks: 1 };                           /* outcome shows the wall losing cross-links */
  const pct = x => Math.round(x * 100) + '%', lc = s => s.charAt(0).toLowerCase() + s.slice(1), uc = s => s.charAt(0).toUpperCase() + s.slice(1);
  const eul = (a, b, c) => new T.Euler(a, b, c), DOCK = eul(0, 0, Math.PI / 2);
  const ENVTXT = {
    gp: 'The wall is a thick, porous mesh, so the drug molecules diffuse through it.',
    my: 'The waxy mycolic-acid layer is a strong barrier, so drug molecules cross it slowly, through channels or by dissolving in the lipid.',
    fu: 'The glucan and chitin wall is a porous mesh that small drug molecules cross.'
  };

  function make(cfg) {
    const org = R.ORGS[cfg.org], abx = R.ABX[cfg.abx], on = new Set(cfg.mech || []), plan = R.evaluate(cfg.org, cfg.abx, on), fr = plan.fr, A = abx.name, tk = abx.tgt, envKind = org.env;
    const ms = org.mechs.filter(m => on.has(m)).map(m => R.MECH[m]);
    const fx = (m, k) => (m.fx[k] && m.fx[k][cfg.abx] != null ? m.fx[k][cfg.abx] : null);
    const pumpMs = ms.filter(m => m.kind === 'efflux'), barMs = ms.filter(m => m.kind === 'barrier'), tgtMs = ms.filter(m => m.kind === 'target');
    const prodrug = !!abx.prodrug, enzMs = prodrug ? [] : ms.filter(m => m.kind === 'enzyme');
    const katG = on.has('katG');
    const altM = tgtMs.find(m => { const b = fx(m, 'bind'); return b != null && b < .98; });
    const variant = altM ? altM.view.alt : 'n', alt = !!altM;
    const bind = tgtMs.reduce((a, m) => { const b = fx(m, 'bind'); return b != null ? a * b : a; }, 1);
    const pumpFrac = 1 - pumpMs.reduce((a, m) => a * (1 - (fx(m, 'pump') || 0)), 1), nPump = pumpFrac > .02 ? Math.max(1, Math.round(3 * pumpFrac)) : 0;
    const hFrac = enzMs.reduce((a, m) => a * (1 - (fx(m, 'hyd') || 0)), 1), enzH = 1 - hFrac, nHyd = enzH > R.POOR ? Math.max(1, Math.round(3 * enzH)) : 0;
    const trapFrac = fr.noEntry, nTrap = trapFrac > .06 ? Math.max(1, Math.round(3 * trapFrac)) : 0;
    const names = ms.map(m => m.name), oc = plan.outcome, OUTL = R.outLabel(cfg.org, cfg.abx, oc), FT = R.fateText(cfg.org, cfg.abx);
    const TN = R.targetName(cfg.abx), cyto = !EXTRA[tk];
    let W, E, Ytop, tg0, tg1, pkW, dest, pumpOn, ky, katGrp, enzGrp = [], D = [], OV, yTrap;
    const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

    /* ---------------- timeline ---------------- */
    const S = []; let cur = 0;
    const add = o => { o.t0 = cur; o.t1 = cur + o.len; cur = o.t1; o.n = S.length + 1; S.push(o); return o; };
    const sIntro = add({ id: 'intro', len: 7, title: 'The organism and the drug', cap: A + ' ' + abx.how + '.', voice: org.name + ' meets ' + A + '. ' + uc(A) + ' ' + abx.how + '. ' + (ms.length ? 'You ticked ' + plural(ms.length, 'resistance mechanism') + ': ' + names.join(', ') + '.' : 'No resistance mechanism is ticked: this is the susceptible reference.') });
    const trapTxt = barMs.length ? (nTrap ? ' In this isolate the thickened wall traps part of the drug before it reaches the membrane.' : ' This wall change has little effect on ' + A + '.') : '';
    const sEntry = add({ id: 'entry', len: 9, title: 'Crossing the wall', cap: ENVTXT[envKind] + (cyto ? ' The drug then crosses the membrane to reach ' + TN + ' inside the cell.' : ' The target sits on the outer face of the membrane.') + trapTxt, voice: ENVTXT[envKind] + (cyto ? ' Then it enters the cell to reach the ' + TN + '.' : ' It reaches the membrane, where its target sits.') + trapTxt });
    const sAct = prodrug ? add({ id: 'act', len: 9, title: 'Pro-drug activation by KatG', cap: A + ' is a pro-drug: KatG must convert it before it can block InhA. ' + (katG ? 'With a katG mutation the enzyme does not work, so the drug is never activated.' : 'KatG is normal here, so the drug is activated.'), voice: A + ' is a pro-drug. The enzyme KatG has to convert it into its active form. ' + (katG ? 'A katG mutation removes that activity, so the drug stays inactive.' : 'Here KatG is normal, so the drug is activated.') }) : null;
    const sEff = pumpMs.length ? add({ id: 'eff', len: 9, title: 'Efflux: ' + pumpMs[0].short, cap: pumpMs.map(m => m.text).join(' ') + (nPump ? ' ' + A + ' is a substrate, so some molecules are removed.' : ' ' + A + ' is a poor substrate, so little is removed.'), voice: pumpMs[0].text + (nPump ? ' ' + A + ' is a substrate, so some molecules are removed before they reach the target.' : ' ' + A + ' is a poor substrate of this pump, so little drug is removed.'), tag: nPump ? 'Pumped out' : 'Poor substrate' }) : null;
    const sEnz = enzMs.length ? add({ id: 'enz', len: 9, title: 'Enzyme: ' + enzMs[0].short, cap: enzMs[0].text + (nHyd ? ' It destroys ' + A + '.' : ' ' + A + ' is not a good substrate, so it is spared.'), voice: enzMs[0].text + (nHyd ? ' It destroys ' + A + '.' : ' ' + A + ' is a poor substrate, so it is spared.'), tag: nHyd ? 'Destroyed' : 'Poor substrate' }) : null;
    const sTgt = add({ id: 'tgt', len: 11, title: alt ? 'Target: normal, then altered' : 'Target: ' + TN, cap: alt ? A + ' ' + abx.how + '. Then the altered target: ' + altM.text + ' Binding falls to about ' + pct(bind) + ' of normal.' : A + ' ' + abx.how + '.', voice: A + ' ' + abx.how + '.' + (alt ? ' ' + altM.text + ' Binding falls to about ' + pct(bind) + ' of normal.' : (prodrug && katG ? ' Here the drug is never activated, so it does not get this far.' : '')) });
    const sPar = add({ id: 'par', len: 12, title: 'Six molecules, different fates', cap: 'Different drug molecules take different routes at the same time. Counts come from the model: ' + (R.FATE_ORDER.filter(f => fr[f] > .004).map(f => pct(fr[f]) + ' ' + lc(FT[f])).join(', ') || 'all bound') + '.', voice: 'Different drug molecules take different routes at the same time. ' + (R.FATE_ORDER.filter(f => fr[f] > .04).map(f => pct(fr[f]) + ' ' + lc(FT[f])).join(', ') || 'Nearly all are bound.') + '.' });
    const sOut = add({ id: 'out', len: 7, title: 'Outcome', cap: OUTL + '. Target engagement ' + pct(plan.engagement) + ' of the mechanism-free reference.', voice: OUTL + '. About ' + pct(plan.engagement) + ' of the drug engages its target. This is a conceptual model, not a clinical result.', tag: oc === 'blocked' ? 'Susceptible-like' : oc === 'partial' ? 'Partly reduced' : 'SURVIVAL favoured' });
    const DUR = cur;
    const scenes = S.map(s => ({ t0: s.t0, t1: s.t1, n: s.n, title: s.title, cap: s.cap, voice: s.voice, tag: s.tag, id: s.id }));

    /* ---------------- geometry helpers (set at attach) ---------------- */
    const above = (p, y) => V(p.x, p.y + y, p.z);
    const dockC = (pk, size) => V(pk.x, pk.y + 5.3 * (size || DBASE), pk.z);
    function frameY(top, bot, x) { const mid = (top + bot) / 2 - (top - bot) * .1, d = (top - bot) / .73 * 1.1 + 18; return { pos: V(x * .6 + 6, mid + 3, d), look: V(x * .6, mid, 0) }; }
    const camMix = (a, b, u) => ({ pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u) });
    const ease = u => u * u * (3 - 2 * u);
    function route(i, d, o) {
      o = o || {}; const x0 = d.x + (i % 3 - 1) * 10 + (o.dx || 0), z0 = i % 2 ? 5 : -5, s = o.s || 1, k = [[0, x0, Ytop + 34, z0], [1.5 * s, lerp(x0, d.x, .2), Ytop + 8, z0 * .8], [3.2 * s, lerp(x0, d.x, .55), Ytop - 8, z0 * .5]];
      if (d.y >= 4) { k.push([4.6 * s, d.x + (i % 2 ? 1.5 : -1.5), d.y + 10, z0 * .2], [6 * s, d.x, d.y, d.z]); }
      else { k.push([4.6 * s, d.x, 12, z0 * .3], [5.5 * s, d.x, 2, z0 * .2], [6.4 * s, d.x, d.y + 7, d.z], [7.4 * s, d.x, d.y, d.z]); }
      return { f: keyPath(k), end: k[k.length - 1][0] };
    }
    const pose = (d, p, t, i, w, e) => { d.g.visible = true; d.g.position.copy(p); const a = [t * .6 + i, t * .4 + i * 2, t * .5]; d.g.rotation.set(lerp(a[0], 0, w), lerp(a[1], 0, w), lerp(a[2], e == null ? Math.PI / 2 : e, w)); };
    const spr = (s, p, a, dy) => { s.visible = a > 0; s.position.set(p.x, p.y + (dy == null ? 6 : dy), p.z + 2); s.material.opacity = clamp(a); };
    const gl = (i, p, col, a, size) => { const h = W.glows[i]; h.visible = a > .01; h.position.copy(p); h.material.color.setHex(col); h.material.opacity = clamp(a); h.scale.setScalar(size || 16); };
    const wobv = (t, i, a) => V(wob(t, i) * a, wob(t, i + 4) * a, wob(t, i + 9) * a);

    /* ---------------- scene runners: each returns { pos, look, focus, focusDist } ---------------- */
    const run = {};
    run.intro = lt => {
      const u = lt / 7;
      for (let i = 0; i < 3; i++) { const d = D[i], p = V(-30 + i * 24 + wob(lt, i) * 3, Ytop + 26 + wob(lt * .8, i + 3) * 4, (i - 1) * 6); pose(d, p, lt, i, 0); }
      return Object.assign(camMix(OV, { pos: V(10, OV.pos.y, OV.pos.z * .94), look: OV.look }, u), { focus: pkW.clone(), focusDist: 26 });
    };
    run.entry = lt => {
      const trapX = i => dest.x + (i - 1) * 12;
      for (let i = 0; i < 3; i++) {
        const d = D[i], t = Math.max(0, lt - i * .55);
        if (i < nTrap) {
          const k = [[0, trapX(i), Ytop + 34, 0], [1.8, trapX(i), Ytop + 10, 0], [4.2, trapX(i), yTrap, (i - 1) * 4]], p = keyPath(k)(t).add(wobv(lt, i, t > 4 ? .5 : 0)); pose(d, p, lt, i, 0);
          if (t > 4.4) { d.bm.color.setHex(0xffc857); gl(i, p, 0xffc857, .5 * sstep(4.4, 5.6, t) * (.8 + .2 * Math.sin(lt * 6)), 14); spr(W.no[i], p, sstep(5.2, 6, t), 5); }
        } else {
          const r = route(i, dest, { dx: (i - 1) * 4 }), p = r.f(t).add(wobv(lt, i, t < r.end ? .6 : .3)), w = sstep(r.end - 1.4, r.end, t); pose(d, p, lt, i, w);
        }
      }
      const top = Ytop + 34, bot = dest.y - 8, fr0 = frameY(top, bot, dest.x);
      return Object.assign(camMix(OV, fr0, ease(clamp(lt / 3))), { focus: pkW.clone(), focusDist: 26 });
    };
    run.act = lt => {
      const g = katGrp, pk = g.position.clone().add(g.userData.pk);
      for (let i = 0; i < 3; i++) {
        const d = D[i], t = lt - (.8 + i * 2.2), a = V(pk.x + (i - 1) * 14, pk.y + 26, (i - 1) * 4), c = dockC(pk, DBASE);
        if (t < 0) { pose(d, a.clone().add(wobv(lt, i, 1)), lt, i, 0); continue; }
        const p = V(lerp(a.x, c.x, ease(clamp(t / 2.4))), lerp(a.y, c.y, ease(clamp(t / 2.4))), lerp(a.z, c.z, ease(clamp(t / 2.4)))); pose(d, p, lt, i, sstep(1.4, 2.4, t));
        if (t > 2.6) {
          if (katG) { d.bm.color.setHex(0x8a929c); spr(W.no[i], p, sstep(3, 3.6, t), 5); }
          else { d.bm.color.setHex(0x4de3d0); gl(i, p, 0x4de3d0, .6 * Math.sin(clamp((t - 2.6) / 2) * Math.PI), 16); spr(W.ok[i], p, sstep(3, 3.6, t), 5); }
        }
        if (t > 4 && !katG) d.g.position.add(V(0, ease(clamp((t - 4) / 2)) * 16, 0));
      }
      return Object.assign(frameY(pk.y + 20, pk.y - 14, pk.x), { focus: pk, focusDist: 26 });
    };
    run.eff = lt => {
      const p0 = E.pumpIn, top = E.pumpTop;
      for (let i = 0; i < 3; i++) {
        const d = D[i], t = lt - (1 + i * 2), s = V(p0.x - 18 + (i - 1) * 6, -12 - i * 2, (i - 1) * 5);
        if (t < 0) { pose(d, s.clone().add(wobv(lt, i, 1.2)), lt, i, 0); continue; }
        const pumped = i < nPump, ap = ease(clamp(t / 1.6));
        if (pumped) {
          let p; if (t < 1.6) p = V(lerp(s.x, p0.x, ap), lerp(s.y, p0.y, ap), lerp(s.z, 0, ap)); else if (t < 4.2) p = V(p0.x, lerp(p0.y, top.y, ease(clamp((t - 1.6) / 2.6))), 0); else p = V(p0.x + (t - 4.2) * 3, top.y + (t - 4.2) * 5, 0);
          pose(d, p, lt, i, 0); d.fade(1 - sstep(5, 6.2, t)); if (t > 1.6 && t < 4.4) d.g.rotation.set(0, 0, -Math.PI / 2);
          if (t > 5) spr(W.ok[i], p, sstep(5, 5.6, t) * (1 - sstep(6.4, 7, t)), 3);
        } else {
          const p = t < 1.6 ? V(lerp(s.x, p0.x - 4, ap), lerp(s.y, p0.y - 6, ap), lerp(s.z, 3, ap)) : V(p0.x - 4 - (t - 1.6) * 5, p0.y - 6 - (t - 1.6) * 1.2, 3); pose(d, p, lt, i, 0);
        }
      }
      return Object.assign(frameY(top.y + 24, -26, p0.x - 6), { focus: V(p0.x, 10, 0), focusDist: 36 });
    };
    run.enz = lt => {
      const g = enzGrp[0], pk = g.position.clone().add(g.userData.pk);
      for (let i = 0; i < 3; i++) {
        const d = D[i], t = lt - (.8 + i * 2.3), a = V(pk.x + (i - 1) * 12, pk.y + 24, (i - 1) * 4), c = dockC(pk, DBASE), hit = i < nHyd;
        if (t < 0) { pose(d, a.clone().add(wobv(lt, i, 1)), lt, i, 0); continue; }
        const u = ease(clamp(t / 2.4)); let p = V(lerp(a.x, c.x, u), lerp(a.y, c.y, u), lerp(a.z, c.z, u));
        if (!hit && t > 2.4) p = c.clone().add(V((t - 2.4) * 6, 8 + (t - 2.4) * 5, 0));
        pose(d, p, lt, i, hit ? sstep(1.2, 2.4, t) : sstep(1.2, 2.2, t) * (1 - sstep(2.4, 3, t)));
        if (hit && t > 3.2) { const k = ease(clamp((t - 3.2) / 1.4)); d.warhead.position.set(-5.3 - k * 3.6, k * 3.2, 0); d.wm.color.setHex(0xff3b30); d.bm.color.setHex(0x6a7280); d.g.scale.setScalar(DBASE * (1 - .25 * k)); d.fade(1 - .55 * k); gl(i, c, 0xff6a5e, .6 * Math.sin(clamp((t - 3.2) / 2) * Math.PI), 16); spr(W.no[i], p, sstep(3.8, 4.4, t), 6); }
        if (!hit && t > 2.8) spr(W.ok[i], p, sstep(2.8, 3.4, t), 6);
      }
      return Object.assign(frameY(pk.y + 20, pk.y - 14, pk.x), { focus: pk, focusDist: 26 });
    };
    run.tgt = lt => {
      const pk = pkW, sizeT = DSIZE[tk] || DBASE, c = dockC(pk, sizeT), tp = alt ? 5.2 : 99, second = alt && lt >= tp;
      tg0.visible = !second; if (tg1) tg1.visible = second;
      const a = i => V(pk.x + (i - 1) * 12, pk.y + 24, (i - 1) * 4);
      const approach = (i, t0, dur) => { const u = ease(clamp((lt - t0) / dur)); return V(lerp(a(i).x, c.x, u), lerp(a(i).y, c.y, u), lerp(a(i).z, c.z, u)); };
      const activated = !(prodrug && katG);
      const col = prodrug && activated ? 0x4de3d0 : null;
      if (!alt) {
        [[0, 1], [1, 5.2]].forEach(([i, t0]) => {
          const d = D[i]; if (lt < t0 - .6) { pose(d, a(i).clone().add(wobv(lt, i, 1)), lt, i, 0); if (col) d.bm.color.setHex(col); return; }
          const p = approach(i, t0, 2.4); pose(d, p, lt, i, sstep(t0 + .6, t0 + 2.2, lt)); if (col) d.bm.color.setHex(col);
          const td = lt - (t0 + 2.4); if (td > 0) { gl(i, pk, 0x4dffa0, .55 * sstep(0, .8, td), 15); spr(W.ok[i], p, sstep(.3, .9, td), 6); }
        });
      } else if (!second) {
        const d = D[0]; pose(d, approach(0, 1, 2.4), lt, 0, sstep(1.6, 3.2, lt)); if (col) d.bm.color.setHex(col);
        const td = lt - 3.4; if (td > 0) { gl(0, pk, 0x4dffa0, .55 * sstep(0, .8, td), 15); spr(W.ok[0], approach(0, 1, 2.4), sstep(.3, .9, td), 6); }
      } else {
        const ts = lt - tp; gl(3, pk, 0xffffff, .6 * (1 - sstep(0, .8, ts)), 26);
        [[1, .9], [2, 4]].forEach(([i, t0], k) => {
          const d = D[i], docks = k === 0 && bind >= .5; if (col) d.bm.color.setHex(col);
          if (ts < t0 - .6) { pose(d, a(i).clone().add(wobv(lt, i, 1)), lt, i, 0); return; }
          const tt = ts - t0, u = ease(clamp(tt / 2.4));
          let p = V(lerp(a(i).x, c.x, u), lerp(a(i).y, c.y, u), lerp(a(i).z, c.z, u));
          if (docks) { pose(d, p, lt, i, sstep(1, 2.2, tt)); if (tt > 2.4) { gl(i, pk, 0xffc857, .5 * sstep(2.4, 3.2, tt), 14); spr(W.ok[i], p, sstep(2.6, 3.2, tt), 6); } }
          else { if (tt > 2.4) p = c.clone().add(V((tt - 2.4) * 5, 6 + (tt - 2.4) * 6, 0)); pose(d, p, lt, i, sstep(1.2, 2, tt) * (1 - sstep(2.4, 3, tt))); d.bm.color.setHex(0xc9b4ff); if (tt > 2.2) spr(W.no[i], p, sstep(2.2, 2.8, tt), 6); }
        });
      }
      return Object.assign(frameY(pk.y + (cyto ? 22 : 17), pk.y - (cyto ? 22 : 14), pk.x), { focus: pk, focusDist: 24 });
    };
    /* six parallel molecules */
    let plan6 = [];
    function buildPlan6() {
      const tc = R.tokens(fr, 6); plan6 = []; ['noEntry', 'efflux', 'hydro', 'weak', 'bound'].forEach(f => { for (let k = 0; k < tc[f]; k++) plan6.push({ f }); });
      plan6.forEach((q, i) => { q.s = i * .55; });
    }
    run.par = lt => {
      plan6.forEach((q, i) => {
        const d = D[i], t = Math.max(0, lt - q.s), size = DSIZE[tk] || DBASE;
        const prodGrey = prodrug && q.f === 'hydro';
        if (q.f === 'noEntry') {
          const x = -46 + i * 9, k = [[0, x, Ytop + 34, 0], [1.8, x, Ytop + 10, 0], [4.2, x, yTrap, (i % 3 - 1) * 4]], p = keyPath(k)(t).add(wobv(lt, i, t > 4 ? .5 : 0)); pose(d, p, lt, i, 0);
          if (t > 4.4) { d.bm.color.setHex(0xffc857); gl(i % 3, p, 0xffc857, .45 * sstep(4.4, 5.4, t), 13); spr(W.no[i], p, sstep(5.2, 6, t), 5); }
        } else if (q.f === 'efflux') {
          const p0 = E.pumpIn, top = E.pumpTop, s = route(i, V(p0.x - 14, -14, 0), { dx: 6 }), tE = s.end;
          let p; if (t < tE) p = s.f(t); else if (t < tE + 1.4) { const u = ease((t - tE) / 1.4); const e = s.f(tE); p = V(lerp(e.x, p0.x, u), lerp(e.y, p0.y, u), lerp(e.z, 0, u)); } else if (t < tE + 3.8) p = V(p0.x, lerp(p0.y, top.y, ease((t - tE - 1.4) / 2.4)), 0); else p = V(p0.x + (t - tE - 3.8) * 3, top.y + (t - tE - 3.8) * 5, 0);
          pose(d, p, lt, i, 0); if (t > tE + 1.2 && t < tE + 4) d.g.rotation.set(0, 0, -Math.PI / 2); d.fade(1 - sstep(tE + 4.6, tE + 5.8, t));
          if (t > tE + 4.6) spr(W.ok[i], p, sstep(tE + 4.6, tE + 5.2, t) * (1 - sstep(tE + 5.8, tE + 6.4, t)), 3);
        } else if (q.f === 'hydro') {
          const g = prodrug ? katGrp : enzGrp[0], pk = g.position.clone().add(g.userData.pk), c = dockC(pk, size), r = route(i, c, {}), p = r.f(t).add(wobv(lt, i, t < r.end ? .5 : 0));
          pose(d, p, lt, i, sstep(r.end - 1.4, r.end, t));
          if (t > r.end + .3) {
            const k = ease(clamp((t - r.end - .3) / 1.4));
            if (prodGrey) { d.bm.color.setHex(0x8a929c); } else { d.warhead.position.set(-5.3 - k * 3.6, k * 3.2, 0); d.wm.color.setHex(0xff3b30); d.bm.color.setHex(0x6a7280); d.g.scale.setScalar(size * (1 - .25 * k)); d.fade(1 - .55 * k); }
            gl(i % 3, c, 0xff6a5e, .5 * Math.sin(clamp((t - r.end) / 2) * Math.PI), 15); spr(W.no[i], p, sstep(r.end + .8, r.end + 1.4, t), 6);
          }
        } else if (q.f === 'weak') {
          const c = dockC(pkW, size), ang = i * 2.1, off = V(Math.cos(ang) * 7, 0, Math.sin(ang) * 3), r = route(i, above(c, 4).add(off), {}), tE = r.end; let p = r.f(t);
          if (t > tE + .6) p = above(c, 4).add(off).add(V((t - tE - .6) * 5, (t - tE - .6) * 6, 0));
          p.add(wobv(lt, i, .5)); pose(d, p, lt, i, sstep(tE - 1.2, tE, t) * (1 - sstep(tE + .6, tE + 1.4, t))); d.bm.color.setHex(0xc9b4ff); if (t > tE) spr(W.no[i], p, sstep(tE, tE + .6, t), 6);
        } else {
          const c = dockC(pkW, size), r = route(i, c, {}), p = r.f(t).add(wobv(lt, i, t < r.end ? .5 : 0)); pose(d, p, lt, i, sstep(r.end - 1.4, r.end, t));
          if (prodrug) d.bm.color.setHex(0x4de3d0);
          if (t > r.end) { gl(i % 3, pkW, 0x4dffa0, .55 * sstep(r.end, r.end + .8, t), 15); spr(W.ok[i], p, sstep(r.end + .3, r.end + .9, t), 6); }
        }
      });
      return Object.assign(camMix(OV, { pos: V(4, OV.pos.y, OV.pos.z * .9), look: OV.look }, ease(lt / 12)), { focus: pkW.clone(), focusDist: 30 });
    };
    run.out = lt => {
      const dmg = WALLDRUG[tk] ? (oc === 'blocked' ? .7 : oc === 'partial' ? .35 : 0) * sstep(.8, 5, lt) * clamp(.4 + plan.engagement) : 0;
      if (E.wall && E.wall.userData.setDamage) E.wall.userData.setDamage(dmg);
      const col = oc === 'blocked' ? 0x4dffa0 : oc === 'partial' ? 0xffc857 : 0xff5a4e;
      gl(0, pkW, col, .5 * (.6 + .4 * Math.sin(lt * 3)) * sstep(.3, 1.2, lt), 24);
      spr(oc === 'survive' ? W.no[0] : W.ok[0], pkW, sstep(.6, 1.4, lt), 10); W.ok[0].scale.setScalar(5); W.no[0].scale.setScalar(5);
      const tgt = tg1 || tg0; tgt.visible = true;
      const u = ease(clamp(lt / 3));
      return Object.assign(camMix(OV, frameY(pkW.y + 40, pkW.y - 24, pkW.x), u), { focus: pkW.clone(), focusDist: 30 });
    };

    /* ---------------- attach and per-frame ---------------- */
    function attach(w) {
      W = w.getUni(); E = W.getEnv(envKind); Ytop = E.topY; yTrap = barMs.length && nTrap ? E.thickTop - 7 : Ytop - 4;
      tg0 = W.getTarget(tk, 'n'); tg1 = alt ? W.getTarget(tk, variant) : null; pkW = tg0.position.clone().add(tg0.userData.pk);
      dest = dockC(pkW, DSIZE[tk] || DBASE);
      katGrp = prodrug ? W.getEnzyme('katG', katG) : null; enzGrp = enzMs.map(m => W.getEnzyme(m.id));
      D = [0, 1, 2, 3, 4, 5].map(i => W.drug(i, DCOL[tk], DSIZE[tk] || DBASE));
      const hi = Ytop + 40, lo = -46, mid = (hi + lo) / 2, dd = (hi - lo) / .73 * 1.04; OV = { pos: V(-6, mid + 4, dd), look: V(0, mid, 0) };
      buildPlan6();
    }
    function at(t, ctx) {
      W.hideAll(); D.forEach(d => d.reset()); E.g.visible = true;
      let sc = S[S.length - 1]; for (let i = 0; i < S.length; i++) if (t < S[i].t1) { sc = S[i]; break; }
      const lt = clamp(t - sc.t0, 0, sc.len), id = sc.id;
      if (E.thick) E.thick.visible = barMs.length > 0;
      if (E.wall && E.wall.userData.setDamage && id !== 'out') E.wall.userData.setDamage(0);
      E.pump.visible = pumpMs.length > 0 && (id === 'intro' || id === 'eff' || id === 'par' || id === 'out');
      if (id === 'tgt') { /* run.tgt toggles the variants */ } else { const showAlt = (id === 'par' || id === 'out') && tg1; tg0.visible = !showAlt; if (tg1) tg1.visible = !!showAlt; }
      if (id === 'intro' || id === 'par' || id === 'out') { if (katGrp) katGrp.visible = true; enzGrp.forEach(g => { g.visible = true; }); }
      if (id === 'act' && katGrp) katGrp.visible = true;
      if (id === 'enz') enzGrp.forEach(g => { g.visible = true; });
      if (id === 'tgt' && katGrp && prodrug) katGrp.visible = false;
      const out = run[id](lt);
      return { world: 'uni', pos: out.pos, look: out.look, focus: out.focus, focusDist: out.focusDist, flash: 0 };
    }

    /* ---------------- labels ---------------- */
    const labels = [], L = (sc, text, a, t0, t1, o) => { if (sc) labels.push(Object.assign({ text, a, t0: sc.t0 + t0, t1: sc.t0 + t1, world: 'uni' }, o || {})); };
    const tokP = i => () => D[i].g.position.clone().add(V(0, 5, 0));
    EN_LABELS();
    function EN_LABELS() {
      const names0 = { gp: [['Thick peptidoglycan wall', 26], ['Cytoplasmic membrane', 0], ['Cytoplasm', -22]], my: [['Mycolic-acid outer layer', 45], ['Arabinogalactan', 28.5], ['Peptidoglycan', 16.5], ['Plasma membrane', 0], ['Cytoplasm', -22]], fu: [['Mannoprotein fibrils', 44], ['β-glucan and chitin wall', 26], ['Plasma membrane (ergosterol)', 0], ['Cytoplasm', -22]] }[envKind];
      names0.forEach((a, k) => L(sIntro, a[0], () => V(-58, a[1], 8), 1 + k * .5, 7, { dx: 4 }));
      L(sIntro, A, tokP(1), .6, 6);
      let k = 0;
      ms.forEach(m => { const where = m.view && m.view.x != null ? () => V(m.view.x, m.view.y + 9, 0) : m.kind === 'efflux' ? () => V(50, 22, 0) : m.kind === 'barrier' ? () => V(-30, E ? E.thickTop - 4 : 50, 0) : () => pkW.clone().add(V(0, 12, 0)); L(sIntro, m.short + (m.kind === 'efflux' ? ': efflux' : m.kind === 'barrier' ? ': wall' : ''), where, 3.6 + (k++) * .45, 7, { cls: 'mechl', dx: -20 }); });
      L(sEntry, A, tokP(1), .5, 5.5); L(sEntry, 'Target: ' + TN, () => pkW.clone().add(V(0, 9, 0)), 5.4, 9, { dx: 10 }); if (nTrap) L(sEntry, 'Trapped in the thick wall', () => V(dest.x, yTrap + 3, 4), 4.6, 9, { dx: -40 });
      if (sAct) { L(sAct, 'KatG (catalase-peroxidase)', () => katGrp.position.clone().add(V(0, 10, 0)), .4, 9, { dx: -30 }); L(sAct, katG ? 'Not activated' : 'Activated', () => katGrp.position.clone().add(V(0, 17, 0)), 4.6, 9); }
      if (sEff) { L(sEff, pumpMs[0].view.pumpName || 'Efflux pump', () => V(50, E.topY + 5, 0), .5, 9, { dx: 10 }); L(sEff, A + (nPump ? ' expelled' : ' passes by'), () => V(54, E.topY + 18, 0), 5.2, 9, { dx: 10 }); }
      if (sEnz) { L(sEnz, enzMs[0].view.name, () => enzGrp[0].position.clone().add(V(0, 10, 0)), .4, 9, { dx: -30 }); L(sEnz, nHyd ? 'Ring opened: inactive' : 'Not a substrate', () => enzGrp[0].position.clone().add(V(0, 17, 0)), 4.8, 9); }
      L(sTgt, TN, () => pkW.clone().add(V(0, -10, 6)), .4, 11, { dx: 10 });
      L(sTgt, alt ? 'Normal target' : A + ' binds', () => pkW.clone().add(V(0, 12, 0)), 1.6, alt ? 5 : 8, { dx: 10 });
      if (alt) L(sTgt, 'Altered target: poor fit', () => pkW.clone().add(V(0, 12, 0)), 6.4, 11, { dx: 10, cls: 'mechl' });
      L(sPar, TN + (alt ? ' (altered)' : ''), () => pkW.clone().add(V(0, -11, 6)), .4, 12);
      if (pumpMs.length) L(sPar, pumpMs[0].view.pumpName || 'Efflux pump', () => V(50, E.topY + 5, 0), .4, 12, { dx: -60 });
      enzMs.forEach(m => L(sPar, m.view.name, () => enzGrp[0].position.clone().add(V(0, 9, 0)), .4, 12, { dx: -20 }));
      if (prodrug) L(sPar, katG ? 'KatG (mutant)' : 'KatG', () => katGrp.position.clone().add(V(0, 9, 0)), .4, 12, { dx: -20 });
      L(sPar, 'Only six molecules are drawn; real cells have many more of each protein', () => V(0, -50, 0), 6, 12, { dx: -150 });
      L(sOut, OUTL, () => pkW.clone().add(V(0, 14, 0)), .6, 7, { dx: 10 });
    }

    /* ---------------- result ---------------- */
    const rows = [['Organism', org.name], ['Antibiotic', A + ' (' + abx.note + ')'], ['Target', TN], ['Mechanisms ticked', names.length ? names.join(', ') : 'None (susceptible reference)'],
      ['Molecular fates (model)', R.FATE_ORDER.filter(f => fr[f] > .004).map(f => pct(fr[f]) + ' ' + lc(FT[f])).join(' · ')], ['Target engagement', pct(plan.engagement) + ' of the mechanism-free reference'], ['Model outcome', OUTL]];
    const notes = ms.map(m => m.name + ': ' + R.hint(cfg.org, cfg.abx, m.id).replace(/^On its own: /, 'alone, ') + '.');
    const learn = 'Illustrative teaching model, not a clinical susceptibility prediction. ' + (notes.length ? notes.join(' ') + ' ' : '') + org.caveat + ' Actual susceptibility depends on expression levels, other mechanisms and the isolate’s own antimicrobial susceptibility testing (MIC, CLSI or EUCAST interpretation).';
    const path = [A + ' approaches'].concat(R.FATE_ORDER.filter(f => fr[f] >= .04).map(f => pct(fr[f]) + ' ' + lc(FT[f]))).concat([OUTL]);
    const result = { rows, learn, path, good: oc === 'blocked', fate: fr, engagement: plan.engagement, outcome: oc };
    return { id: 'uni', uni: true, duration: DUR, scenes, labels, result, plan, attach, at, title: org.name + ' · ' + A + ' · ' + (names.length ? plural(names.length, 'mechanism') + ' of ' + org.mechs.length : 'susceptible reference') };
  }

  M.scnUni = { make };
  const prev = M.scenarios.res;
  M.scenarios.res = cfg => (R.ORGS[cfg.org] && R.ORGS[cfg.org].fam === 'u' ? make(cfg) : prev(cfg));
})();
