/* MICRO world — the envelope cross-section ("mol" world): LPS outer membrane with OprD porin and a TonB-dependent
   transporter, periplasm with NDM-1, peptidoglycan with cross-links, inner membrane with PBP3.
   1 unit ~ 0.25 nm (schematic, not to scale). Orientation: +y = outside of the cell. */
(function () {
  'use strict';
  const T = THREE, M = window.MICRO, { clamp, lerp, sstep, V, rng } = M.u, { std, glow, points } = M.fx;
  const X0 = -62, X1 = 62, Z0 = -16, Z1 = 16;
  const Y = V(0, 1, 0), Zax = V(0, 0, 1);

  function stick(a, b, r, col, op) {
    const m = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 8, 1, true), std(col, { transparent: true, opacity: op == null ? 1 : op, roughness: .5 }));
    const d = V(), q = new T.Quaternion();
    m.userData.set = (p, qv, rr) => { d.copy(qv).sub(p); const L = d.length(); m.position.copy(p).add(qv).multiplyScalar(.5); m.scale.set(rr || r, L, rr || r); m.quaternion.copy(q.setFromUnitVectors(Y, d.multiplyScalar(1 / (L || 1)))); };
    m.userData.set(a, b); return m;
  }
  M.stick = stick;

  function leaflet(o) {
    const r = rng(o.seed), it = [];
    for (let iz = 0; ; iz++) {
      const z = Z0 + iz * o.sp; if (z > Z1) break;
      for (let ix = 0; ; ix++) { const x = X0 + ix * o.sp + (iz % 2 ? o.sp / 2 : 0); if (x > X1) break; const px = x + (r() - .5) * .9, pz = z + (r() - .5) * .9; if (o.carve && o.carve(px, pz)) continue; it.push([px, o.y + (r() - .5) * .7, pz]); }
    }
    const n = it.length, g = new T.Group();
    const heads = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), std(0xffffff, { roughness: .45 }), n);
    const nt = n * o.tails, tails = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 6, 1, true), std(0xffffff, { roughness: .6 }), nt);
    const ns = o.sugar ? n * o.sugar : 0, sugars = ns ? new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), std(0xffffff, { roughness: .4 }), ns) : null;
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color(), sc = V(), pos = V();
    const hc = new T.Color(o.hcol), tc = new T.Color(o.tcol), sg = new T.Color(o.scol || 0xffffff);
    const tilt = [], sjit = [];
    it.forEach((p, i) => {
      c.copy(hc).multiplyScalar(.85 + r() * .3); heads.setColorAt(i, c);
      for (let k = 0; k < o.tails; k++) {
        const j = i * o.tails + k, ox = (k - (o.tails - 1) / 2) * o.tw, oz = (r() - .5) * .9;
        e.set((r() - .5) * .22, 0, (r() - .5) * .22); q.setFromEuler(e); tilt.push([ox, oz, q.clone()]);
        pos.set(p[0] + ox, p[1] + o.dir * o.tl / 2, p[2] + oz); sc.set(o.tr, o.tl, o.tr); m.compose(pos, q, sc); tails.setMatrixAt(j, m); c.copy(tc).multiplyScalar(.8 + r() * .35); tails.setColorAt(j, c);
      }
      for (let k = 0; k < (o.sugar || 0); k++) { sjit.push([(r() - .5) * 1.3, (r() - .5) * 1.3]); c.copy(sg).multiplyScalar(.8 + r() * .35); sugars.setColorAt(i * o.sugar + k, c); }
    });
    function setHead(i, dx, dy, dz, hs) {
      const p = it[i]; sc.setScalar(o.hr * (hs || 1)); pos.set(p[0] + dx, p[1] + dy, p[2] + dz); m.compose(pos, q.identity(), sc); heads.setMatrixAt(i, m);
      for (let k = 0; k < (o.sugar || 0); k++) { const j = sjit[i * o.sugar + k]; sc.setScalar(o.sr * (1 - k * .05)); pos.set(p[0] + dx * (1 + k * .15) + j[0], p[1] + dy - o.dir * (o.hr + .5 + k * 1.55), p[2] + dz + j[1]); m.compose(pos, q.identity(), sc); sugars.setMatrixAt(i * o.sugar + k, m); }
    }
    for (let i = 0; i < n; i++) setHead(i, 0, 0, 0);
    [heads, tails, sugars].forEach(x => { if (x) { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; g.add(x); } });
    return { group: g, items: it, heads, sugars, tails, setHead, flush() { heads.instanceMatrix.needsUpdate = true; if (sugars) sugars.instanceMatrix.needsUpdate = true; } };
  }

  /* beta-barrel porin, cut open at the front so the channel is visible */
  function barrel(o) {
    const g = new T.Group(), n = o.n || 16, r = o.r, h = o.h, rr = rng(o.seed || 3);
    for (let i = 0; i < n; i++) {
      const th = i / n * Math.PI * 2; if (o.cut !== false && Math.sin(th) > .3) continue;
      const w = 2 * Math.PI * r / n * .86, st = new T.Mesh(new T.BoxGeometry(w, h * (.93 + rr() * .07), .7), std(new T.Color(o.col).multiplyScalar(.85 + rr() * .3), { roughness: .5 }));
      st.position.set(r * Math.cos(th), (rr() - .5) * .6, r * Math.sin(th)); st.rotation.y = Math.PI / 2 - th; st.rotation.x = (i % 2 ? .12 : -.12); g.add(st);
    }
    const ring = new T.Mesh(new T.TorusGeometry(o.eye || 3.3, .3, 8, 36), std(0xffd27a, { emissive: 0x9a6a10, emissiveIntensity: .8, roughness: .4 })); ring.rotation.x = Math.PI / 2; ring.position.y = o.eyeY == null ? -1 : o.eyeY; g.add(ring);
    return { group: g, ring };
  }

  function bundle(x, z, col, big) {
    const g = new T.Group(); for (let i = 0; i < 4; i++) { const m = new T.Mesh(new T.CylinderGeometry(.9, .9, 15.5, 8), std(col, { roughness: .6 })); m.position.set(x + Math.cos(i * 1.57) * 1.5, -45, z + Math.sin(i * 1.57) * 1.5); g.add(m); }
    if (big) { const b = new T.Mesh(new T.SphereGeometry(big, 12, 9), std(col, { roughness: .6 })); b.position.set(x, -35 + big * .2, z); b.scale.y = .7; g.add(b); } return g;
  }

  function build() {
    const root = new T.Group(), W = { root };
    const P = W.pos = {
      porin: V(-30, 15, 0), tbdt: V(12, 15, 0), ndm: V(-8, -9, 0), p0: V(-12.5, -4, 0), zn1: V(-14, -4.8, 0), zn2: V(-11, -4.8, 0), bridge: V(-12.5, -5.9, .3), dock: V(-12.5, -3.1, 0),
      pbp: V(32, -29.5, 0), pbpPocket: V(32, -26.4, 0), ser: V(32, -27.7, .2), pgY: -21
    };
    const carveOM = (x, z) => { const dp = Math.hypot(x - P.porin.x, z), dt = Math.hypot(x - P.tbdt.x, z); if (dp < 8.3 || dt < 8.8) return true; if ((Math.abs(x - P.porin.x) < 12 || Math.abs(x - P.tbdt.x) < 12.5) && z > 1.2) return true; return false; };
    const carveIM = (x, z) => Math.hypot(x - 32, z) < 3.6 || (x > -21 && x < -1 && z > 1.5);
    W.om = leaflet({ y: 22, dir: -1, sp: 3.4, hr: 1.9, hcol: 0x35b8a4, tcol: 0x1d6f66, tails: 4, tw: .8, tl: 6.6, tr: .36, sugar: 3, sr: .7, scol: 0x8fe3d2, seed: 1, carve: carveOM });
    W.omIn = leaflet({ y: 8, dir: 1, sp: 3.4, hr: 1.45, hcol: 0x79a8dd, tcol: 0x3f6597, tails: 2, tw: 1.0, tl: 6.6, tr: .4, seed: 2, carve: carveOM });
    W.imOut = leaflet({ y: -38, dir: -1, sp: 3.4, hr: 1.45, hcol: 0xe8a84a, tcol: 0x9a6325, tails: 2, tw: 1.0, tl: 6.6, tr: .4, seed: 3, carve: carveIM });
    W.imIn = leaflet({ y: -52, dir: 1, sp: 3.4, hr: 1.45, hcol: 0xe8a84a, tcol: 0x9a6325, tails: 2, tw: 1.0, tl: 6.6, tr: .4, seed: 4, carve: carveIM });
    root.add(W.om.group, W.omIn.group, W.imOut.group, W.imIn.group);

    /* porins */
    W.oprD = barrel({ r: 6, h: 16, col: 0x6e8fb8, seed: 5, eye: 3.1, eyeY: -1 }); W.oprD.group.position.copy(P.porin); root.add(W.oprD.group);
    W.tbdt = barrel({ r: 6.6, h: 16, col: 0x8a7cc4, seed: 8, eye: 3.4, eyeY: 2 }); W.tbdt.group.position.copy(P.tbdt); root.add(W.tbdt.group);
    W.tbdt.plug = new T.Mesh(new T.SphereGeometry(3.6, 16, 12), std(0xb7a7f0, { roughness: .5 })); W.tbdt.plug.position.set(0, 1, 0); W.tbdt.group.add(W.tbdt.plug);
    const rr = rng(9); W.loops = new T.Group(); for (let i = 0; i < 6; i++) { const a = Math.PI * (.7 + i * .32); const b = new T.Mesh(new T.SphereGeometry(1.15, 10, 8), std(0x9db6d8)); b.position.set(4.6 * Math.cos(a), -2.5 + rr() * 5, 4.6 * Math.sin(a) * (Math.sin(a) > .3 ? 0 : 1) - 1.5); W.loops.add(b); } W.oprD.group.add(W.loops);

    /* peptidoglycan */
    const pz = [-10.5, -3.5, 3.5, 10.5], bx = [], beadN = Math.floor((X1 - X0) / 2.5) + 1;
    const beads = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), std(0xffffff, { roughness: .45, emissive: 0x000000 }), beadN * 4), m4 = new T.Matrix4(), sc = V(), ps = V(), cc = new T.Color();
    const bead = []; for (let s = 0; s < 4; s++) for (let i = 0; i < beadN; i++) { const x = X0 + i * 2.5; bead.push({ x, y: P.pgY + .8 * Math.sin(x * .18 + s * 1.7), z: pz[s] + Math.cos(x * .25 + s) * .5, w: 0, s, i }); cc.set(i % 2 ? 0x8fdc9e : 0x4fb56e); beads.setColorAt(s * beadN + i, cc); }
    function placeBead(b, d) { const k = b.s * beadN + b.i, w = (b.x > 14 && b.x < 52) ? Math.sin((b.x - 14) / 38 * Math.PI) : 0, rr2 = rng(b.i * 7 + b.s * 31)(); sc.setScalar(1.12); ps.set(b.x + d * w * (rr2 - .5) * 3, b.y - d * w * (3 + rr2 * 5), b.z + d * w * (rr2 - .5) * 6); m4.compose(ps, new T.Quaternion(), sc); beads.setMatrixAt(k, m4); }
    bead.forEach(b => placeBead(b, 0)); beads.instanceMatrix.needsUpdate = true; beads.instanceColor.needsUpdate = true; root.add(beads);
    const barMat = std(0xb487ff, { emissive: 0x3a1c7a, emissiveIntensity: .55, roughness: .5 });
    function beadAt(s, x) { const i = Math.round((x - X0) / 2.5); return bead[s * beadN + clamp(i, 0, beadN - 1)]; }
    function barBetween(p, x, mat) { const a = beadAt(p, x), b = beadAt(p + 1, x), mm = stick(V(a.x, a.y, a.z), V(b.x, b.y, b.z), .3, 0xb487ff, 1); mm.material = mat || barMat.clone(); return { mesh: mm, a, b, p, x, grow: 1, dmg: 1 }; }
    const stat = []; for (let p = 0; p < 3; p++) for (let x = X0 + 4 + p * 2.5; x < X1 - 2; x += 5) { if (x > 14 && x < 52) continue; if (rr() < .38) continue; stat.push(barBetween(p, x, barMat)); }
    W.pgStatic = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 6, 1, true), barMat, stat.length); const qd = new T.Quaternion();
    stat.forEach((b, i) => { const A = V(b.a.x, b.a.y, b.a.z), B = V(b.b.x, b.b.y, b.b.z), d = B.clone().sub(A), L = d.length(); qd.setFromUnitVectors(Y, d.normalize()); m4.compose(A.clone().add(B).multiplyScalar(.5), qd, sc.set(.3, L, .3)); W.pgStatic.setMatrixAt(i, m4); }); root.add(W.pgStatic);
    W.pg = { bars: [], newBars: [], oldBars: [], damage: 0 };
    [[1, 25], [1, 30], [1, 35], [1, 40], [0, 27.5], [0, 37.5], [2, 32.5], [2, 42.5], [2, 22.5], [0, 47.5]].forEach(([p, x], i) => { const o = barBetween(p, x); o.old = true; o.dmgAt = i; W.pg.oldBars.push(o); root.add(o.mesh); });
    [[1, 32.5], [1, 27.5], [1, 37.5], [0, 31.5], [2, 36]].forEach(([p, x]) => { const o = barBetween(p, x); o.old = false; o.grow = 0; W.pg.newBars.push(o); root.add(o.mesh); });
    W.pg.apply = function (damage, wallGlow) {
      if (damage !== W.pg.damage) { W.pg.damage = damage; bead.forEach(b => placeBead(b, damage)); beads.instanceMatrix.needsUpdate = true; }
      beads.material.emissive.setRGB(.05 * wallGlow, .5 * wallGlow, .18 * wallGlow);
      W.pg.oldBars.forEach(o => { const v = 1 - clamp(damage * 1.6 - o.dmgAt * .09, 0, 1); o.mesh.visible = v > .04; o.mesh.userData.set(V(o.a.x, o.a.y, o.a.z), V(lerp(o.a.x, o.b.x, 1), lerp(o.a.y, o.b.y, 1), lerp(o.a.z, o.b.z, 1)), .3 * v + .01); o.mesh.material.color.setHex(damage > .2 ? 0xff6a5e : 0xb487ff); });
      W.pg.newBars.forEach(o => { o.mesh.visible = o.grow > .02; const e = V(lerp(o.a.x, o.b.x, o.grow), lerp(o.a.y, o.b.y, o.grow), lerp(o.a.z, o.b.z, o.grow)); o.mesh.userData.set(V(o.a.x, o.a.y, o.a.z), e, .3 + .18 * Math.sin(o.grow * Math.PI)); o.mesh.material.emissiveIntensity = .55 + (o.grow > 0 && o.grow < 1 ? 1.5 : 0); });
    };
    W.pg.apply(0, 0);

    /* inner-membrane proteins + PBP3 */
    [[-52, -9, 0x8b95a3, 5], [-40, 9, 0x8b95a3, 0], [-22, -8, 0x7d8a9a, 4.5], [-2, 8, 0x8b95a3, 0], [14, -10, 0x7d8a9a, 4], [50, 6, 0x8b95a3, 4.5], [56, -10, 0x7d8a9a, 0]].forEach(([x, z, c, b]) => root.add(bundle(x, z, c, b)));
    const tm = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 15, 10), std(0x8a5ad0)); tm.position.set(32, -45, 0); root.add(tm);
    const stalk = new T.Mesh(new T.CylinderGeometry(.9, .9, 7, 8), std(0x7a4cc0)); stalk.position.set(32, -33, 0); root.add(stalk);
    W.pbp = new T.Group(); W.pbp.add(M.blob({ c: [32, -30, 0], rad: [5.8, 4.4, 4.6], n: 700, sr: 1.1, col1: 0xa56ae0, col2: 0x5b3aa6, seed: 21, cavity: { c: [32, -26.4, 0], r: 3.1, u: [0, 1, 0], open: [0, .15, 1], n: 70 } })); root.add(W.pbp);
    const cb = new T.Mesh(new T.SphereGeometry(.42, 10, 8), std(0xb8c3d0)), og = new T.Mesh(new T.SphereGeometry(.5, 12, 9), std(0xff5555, { emissive: 0x330000 }));
    cb.position.set(31.6, -28.7, .3); og.position.copy(P.ser); W.pbp.add(cb, og, stick(V(31.6, -28.7, .3), P.ser, .15, 0xc9d4e2)); W.serO = og;
    W.pbpGlow = glow(0xff4a3a, 14, 0); W.pbpGlow.position.copy(P.pbpPocket); root.add(W.pbpGlow);
    W.pbpOk = glow(0x5dffa0, 12, 0); W.pbpOk.position.copy(P.pbpPocket); root.add(W.pbpOk);

    /* NDM-1 */
    W.ndm = new T.Group(); W.ndmBody = M.blob({ c: [-8, -9, 0], rad: [9.2, 7.4, 7.2], n: 1700, sr: 1.3, col1: 0x3d9ccf, col2: 0x1a4585, seed: 33, rough: .2, cavity: { c: [P.p0.x, P.p0.y, 0], r: 5, u: [-.25, 1, 0], open: [0, .15, 1], n: 110 } });
    W.ndm.add(W.ndmBody); root.add(W.ndm);
    const znMat = std(0xe3ecf7, { roughness: .25, metalness: .55, emissive: 0x2c6a88, emissiveIntensity: .8 });
    W.zn1 = new T.Mesh(new T.SphereGeometry(.85, 18, 14), znMat); W.zn2 = new T.Mesh(new T.SphereGeometry(.85, 18, 14), znMat);
    W.zn1.position.copy(P.zn1); W.zn2.position.copy(P.zn2); W.ndm.add(W.zn1, W.zn2);
    W.znGlow = [glow(0x7fe8ff, 4, .7), glow(0x7fe8ff, 4, .7)]; W.znGlow[0].position.copy(P.zn1); W.znGlow[1].position.copy(P.zn2); W.ndm.add(...W.znGlow);
    const mkRes = (kind, zn, d, tint) => {
      const dir = V(...d).normalize(), c = zn.clone().addScaledVector(dir, kind === 'cys' ? 2.5 : 3);
      const grp = new T.Group();
      if (kind === 'his') { const def = { atoms: [0, 1, 2, 3, 4].map(i => ({ id: 'r' + i, el: i === 1 ? 'N' : i === 3 ? 'N' : 'C', p: [1.15 * Math.cos(i * 1.2566 + .6), 1.15 * Math.sin(i * 1.2566 + .6), 0] })), bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]].map(b => ['r' + b[0], 'r' + b[1], (b[0] === 1 || b[0] === 3) ? 2 : 1]) }; const mol = M.Molecule(def, { scale: .9, tint }); grp.add(mol.group); }
      else if (kind === 'asp') { const def = { atoms: [{ id: 'c', el: 'C', p: [0, 0, 0] }, { id: 'o1', el: 'O', p: [-1.1, .7, 0] }, { id: 'o2', el: 'O', p: [1.1, .7, 0] }], bonds: [['c', 'o1', 2], ['c', 'o2']] }; grp.add(M.Molecule(def, { scale: 1.1 }).group); }
      else { const s = new T.Mesh(new T.SphereGeometry(.75, 12, 9), std(0xffd23a)); grp.add(s); }
      grp.position.copy(c); grp.quaternion.setFromUnitVectors(Zax, dir.clone().negate());
      const ts = stick(zn, c.clone().addScaledVector(dir, -1.1), .09, 0x7fe8ff, .75); W.ndm.add(grp, ts);
      const back = stick(c, c.clone().addScaledVector(dir, 2.6), .22, 0x6f7f95, .9); W.ndm.add(back);
    };
    mkRes('his', P.zn1, [-.7, -.5, .5], 0x7fb7ff); mkRes('his', P.zn1, [-.5, -.6, -.6], 0x7fb7ff); mkRes('his', P.zn1, [-1, .1, 0], 0x7fb7ff);
    mkRes('his', P.zn2, [.7, -.5, .5], 0x7fb7ff); mkRes('cys', P.zn2, [.5, -.6, -.6]); mkRes('asp', P.zn2, [1, .1, 0]);
    W.ndm.userData.center = P.ndm.clone();
    /* bridging water/hydroxide proton + ambient waters */
    W.proton = glow(0xffffff, 1.6, 0); root.add(W.proton);
    W.waters = []; const wr = rng(51);
    for (let i = 0; i < 5; i++) {
      const g = new T.Group(), o = new T.Mesh(new T.SphereGeometry(.34, 10, 8), std(0xff5a5a)), h1 = new T.Mesh(new T.SphereGeometry(.2, 8, 6), std(0xffffff)), h2 = h1.clone();
      h1.position.set(.42, .3, 0); h2.position.set(-.42, .3, 0); g.add(o, h1, h2); g.userData.p = V(P.p0.x + (wr() - .5) * 11, P.p0.y + 2.5 + wr() * 4.5, (wr() - .5) * 6); g.userData.s = wr() * 10; root.add(g); W.waters.push(g);
    }
    /* medium + solutes */
    const sr = rng(77);
    W.solv = points(520, () => [X0 + sr() * 124, -36 + sr() * 42, Z0 + sr() * 32], .5, 0x6ea4c8, .6); root.add(W.solv);
    W.extra = points(220, () => [X0 + sr() * 124, 26 + sr() * 36, Z0 + sr() * 32], .26, 0x9ad7ff, .3); root.add(W.extra);
    W.cyto = points(300, () => [X0 + sr() * 124, -54 - sr() * 50, Z0 + sr() * 32], .3, 0xff9fb8, .45); root.add(W.cyto);
    return W;
  }
  M.buildMol = build;
})();
