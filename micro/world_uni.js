/* MICRO "uni" world: a cross-section through the envelope of a Gram-positive bacterium, a mycobacterium or a fungus.
   +y is outside. The membrane sits at y = 0. The wall sits above it, the cytoplasm below.
   1 unit ~ 0.25 nm (schematic, not to scale). Targets, enzymes, pumps and drug tokens are built on demand. */
(function () {
  'use strict';
  const T = THREE, M = window.MICRO, { clamp, lerp, sstep, V, rng } = M.u, { std, glow, points } = M.fx;
  const X0 = -62, X1 = 62, Z0 = -14, Z1 = 14;
  const SPH = new T.SphereGeometry(1, 12, 9), CYL = new T.CylinderGeometry(1, 1, 1, 8, 1, false);
  const QX = new T.Quaternion().setFromEuler(new T.Euler(0, 0, Math.PI / 2)), Q0 = new T.Quaternion();
  const m4 = new T.Matrix4(), col = new T.Color(), pos = V(), sc = V();

  const ball = (x, y, z, r, c, em) => { const m = new T.Mesh(SPH, std(c, { emissive: em || 0, emissiveIntensity: em ? .8 : 0, roughness: .4 })); m.position.set(x, y, z); m.scale.setScalar(r); return m; };
  function rod(a, b, r, c, op) {
    const m = new T.Mesh(CYL, std(c, { roughness: .5, transparent: op != null, opacity: op == null ? 1 : op })), d = b.clone().sub(a), L = d.length();
    m.position.copy(a).add(b).multiplyScalar(.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.multiplyScalar(1 / (L || 1))); return m;
  }
  const lump = o => M.blob(Object.assign({ sr: .95, rough: .3, seed: 7 }, o));

  /* ---------- membrane bilayer ---------- */
  function bilayer(o) {
    const g = new T.Group(), r = rng(o.seed || 5), pts = [];
    for (let iz = 0; ; iz++) { const z = Z0 + iz * o.sp; if (z > Z1) break; for (let ix = 0; ; ix++) { const x = X0 + ix * o.sp + (iz % 2 ? o.sp / 2 : 0); if (x > X1) break; pts.push([x + (r() - .5) * .8, z + (r() - .5) * .8]); } }
    const n = pts.length * 2, hm = new T.InstancedMesh(SPH, std(0xffffff, { roughness: .45 }), n), tm = new T.InstancedMesh(CYL, std(0xffffff, { roughness: .6 }), n), hc = new T.Color(o.hcol), tc = new T.Color(o.tcol);
    let i = 0;
    [1, -1].forEach(s => pts.forEach(p => {
      const hy = o.y + s * (o.tl + .8);
      pos.set(p[0], hy, p[1]); sc.setScalar(o.hr || 1.25); m4.compose(pos, Q0, sc); hm.setMatrixAt(i, m4); col.copy(hc).multiplyScalar(.85 + r() * .3); hm.setColorAt(i, col);
      pos.set(p[0], o.y + s * (.35 + o.tl / 2), p[1]); sc.set(.45, o.tl, .45); m4.compose(pos, Q0, sc); tm.setMatrixAt(i, m4); col.copy(tc).multiplyScalar(.8 + r() * .35); tm.setColorAt(i, col); i++;
    }));
    g.add(hm, tm); g.userData.heads = hm; return g;
  }

  /* ---------- wall lattice: glycan strands along x with cross-links between layers ---------- */
  const ZS = [-12, -8, -4, 0, 4];
  function lattice(o) {
    const g = new T.Group(), L = o.levels, r = rng(o.seed || 9);
    const sm = new T.InstancedMesh(CYL, std(o.col, { roughness: .55, transparent: true, opacity: .5, depthWrite: false }), L.length * ZS.length); sm.renderOrder = 1;
    let i = 0; L.forEach(y => ZS.forEach((z, k) => { pos.set(0, y + (r() - .5) * .5, z + (r() - .5) * 1.2); sc.set((o.r || 1.2) * .85, X1 - X0, (o.r || 1.2) * .85); m4.compose(pos, QX, sc); sm.setMatrixAt(i++, m4); }));
    const items = [];
    for (let l = 0; l + 1 < L.length; l++) ZS.forEach((z, k) => { for (let x = X0 + 3 + ((l * 3 + k * 2) % 6); x < X1; x += 6.2) items.push([x, (L[l] + L[l + 1]) / 2, z, L[l + 1] - L[l], r()]); });
    const lm = new T.InstancedMesh(CYL, std(o.link, { roughness: .6, transparent: true, opacity: .6, depthWrite: false }), items.length); lm.renderOrder = 1;
    function write(dmg) { items.forEach((p, j) => { const k = p[4] < dmg ? .02 : 1; pos.set(p[0], p[1], p[2]); sc.set(.5 * k, p[3] * k, .5 * k); m4.compose(pos, Q0, sc); lm.setMatrixAt(j, m4); }); lm.instanceMatrix.needsUpdate = true; }
    write(0); sm.instanceMatrix.needsUpdate = true; g.add(sm, lm);
    let cur = 0; g.userData.setDamage = f => { f = Math.round(clamp(f) * 40) / 40; if (f !== cur) { cur = f; write(f); } };
    return g;
  }

  /* ---------- fibres standing on the surface ---------- */
  function fibres(o) {
    const g = new T.Group(), r = rng(o.seed || 21), n = o.n, cm = new T.InstancedMesh(CYL, std(o.col, { roughness: .6 }), n), bm = new T.InstancedMesh(SPH, std(o.bead || o.col, { roughness: .45 }), n), q = new T.Quaternion();
    for (let i = 0; i < n; i++) {
      const x = X0 + 4 + r() * (X1 - X0 - 8), z = Z0 + r() * (Z1 - Z0), h = o.h * (.6 + r() * .6), tx = (r() - .5) * .5, tz = (r() - .5) * .5, d = V(tx, 1, tz).normalize();
      q.setFromUnitVectors(V(0, 1, 0), d); pos.set(x + d.x * h / 2, o.y0 + d.y * h / 2, z + d.z * h / 2); sc.set(.3, h, .3); m4.compose(pos, q, sc); cm.setMatrixAt(i, m4);
      pos.set(x + d.x * h, o.y0 + d.y * h, z + d.z * h); sc.setScalar(.9); m4.compose(pos, Q0, sc); bm.setMatrixAt(i, m4);
    }
    g.add(cm, bm); return g;
  }

  /* ---------- the three envelope types ---------- */
  function buildEnv(kind) {
    const g = new T.Group(), E = { g };
    const fungal = kind === 'fu';
    g.add(bilayer({ y: 0, tl: 2.7, sp: 2.7, hcol: fungal ? 0xffb36a : 0x5fd0bf, tcol: fungal ? 0xe7c38f : 0xd9c07a, seed: 5 }));
    if (kind === 'gp') {
      E.wall = lattice({ levels: [14.5, 19, 23.5, 28, 32.5, 37], col: 0xc79a3d, link: 0xf0d98a, r: 1.15 }); g.add(E.wall);
      g.add(fibres({ n: 16, y0: 38, h: 11, col: 0x9bd0ff, bead: 0x9bd0ff }));
      E.thick = lattice({ levels: [42, 46.5, 51, 55.5], col: 0xd97a3a, link: 0xffb27a, r: 1.2, seed: 13 }); E.thick.visible = false; g.add(E.thick);
      E.topY = 39; E.thickTop = 57;
      E.names = [['Thick peptidoglycan wall', 26, 'wall'], ['Cytoplasmic membrane', 0, 'mem'], ['Cytoplasm', -22, 'cy']];
    } else if (kind === 'my') {
      E.pg = lattice({ levels: [14.5, 18.5], col: 0xc79a3d, link: 0xf0d98a, r: 1.1 }); g.add(E.pg);
      E.ag = lattice({ levels: [22.5, 26.5, 30.5, 34.5], col: 0x3fb59a, link: 0x9be8cf, r: 1.5, seed: 11 }); g.add(E.ag);
      g.add(bilayer({ y: 45, tl: 5.2, sp: 3.1, hcol: 0xf3e6a8, tcol: 0xcdb36a, seed: 8 }));
      g.add(fibres({ n: 22, y0: 51, h: 9, col: 0xe8c66a, bead: 0xffd98a }));
      E.wall = E.ag; E.topY = 52;
      E.names = [['Mycolic-acid outer layer', 45, 'wall'], ['Arabinogalactan', 28.5, 'wall'], ['Peptidoglycan', 16.5, 'wall'], ['Plasma membrane', 0, 'mem'], ['Cytoplasm', -22, 'cy']];
    } else {
      E.chitin = lattice({ levels: [14.5, 18.5], col: 0xdfe3ee, link: 0xffffff, r: 1.3, seed: 15 }); g.add(E.chitin);
      E.wall = lattice({ levels: [22.5, 26.5, 30.5, 34.5], col: 0x8f6bff, link: 0xcbb8ff, r: 1.7, seed: 17 }); g.add(E.wall);
      g.add(fibres({ n: 70, y0: 36, h: 14, col: 0xff8fb8, bead: 0xffb3d0, seed: 31 }));
      E.topY = 38;
      E.names = [['Mannoprotein fibrils', 44, 'wall'], ['β-glucan and chitin wall', 26, 'wall'], ['Plasma membrane (ergosterol)', 0, 'mem'], ['Cytoplasm', -22, 'cy']];
    }
    E.mem = g.children[0];
    /* a pump spanning membrane and wall (one per envelope) */
    const top = E.topY + 2, p = new T.Group();
    p.add(lump({ c: [0, -4, 0], rad: [5.4, 6.2, 5.4], n: 260, sr: .95, col1: 0xffa84a, col2: 0xffd08a, seed: 3 }));
    const tube = new T.Mesh(new T.CylinderGeometry(2.7, 2.7, top - 2, 18, 1, true), new T.MeshStandardMaterial({ color: 0xffc857, transparent: true, opacity: .3, side: T.DoubleSide, roughness: .4, emissive: 0x6a4a00, emissiveIntensity: .5 }));
    tube.position.y = (top + 2) / 2; p.add(tube);
    const lip = new T.Mesh(new T.TorusGeometry(3.1, .55, 8, 24), std(0xffd27a, { emissive: 0x9a6a10, emissiveIntensity: .8 })); lip.rotation.x = Math.PI / 2; lip.position.y = top; p.add(lip);
    p.position.set(50, 0, 0); p.visible = false; E.pump = p; E.pumpIn = V(50, -3, 0); E.pumpTop = V(50, top, 0); g.add(p);
    g.visible = false; return E;
  }

  /* ---------- targets (positions and builders) ---------- */
  const TPOS = { pbp: [28, 0, 0], dala: [-14, 0, 0], mem: [-8, 0, 0], ribo: [-8, -32, 0], gyr: [-8, -34, 0], rnap: [-8, -34, 0], inha: [14, -32, 0], erg11: [-8, -30, 0], fks: [-8, 0, 0], ergos: [-6, 0, 0] };
  const mark = (sprt, x, y, z) => { sprt.position.set(x, y, z); return sprt; };

  function buildTarget(kind, variant) {
    const g = new T.Group(), alt = variant && variant !== 'n';
    let pk = V(0, 6, 0);
    const dna = (y, z) => { [0, 1].forEach(s => { const pts = []; for (let i = 0; i <= 60; i++) { const x = -26 + i * .87, a = x * .55 + s * Math.PI; pts.push(V(x, y + Math.sin(a) * 2.6, z + Math.cos(a) * 2.6)); } g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 90, .55, 6, false), std(s ? 0x7fd9ff : 0x4d8fe0, { roughness: .45 }))); }); };
    if (kind === 'pbp') {
      g.add(rod(V(0, -5, 0), V(0, 3, 0), 1.6, 0x4f6fb0));
      g.add(lump({ c: [0, 7, 0], rad: [7, 5.5, 6], n: 460, col1: alt ? 0x8a6bd1 : 0x4f86e0, col2: alt ? 0xb79cf0 : 0x7fb4ff, cavity: { c: [0, 10.2, .5], r: 3.1, u: [0, 1, 0], open: [0, 1, 0], n: 70 } }));
      g.add(ball(0, 8.6, .6, 1.1, 0xffa63a, 0x7a4300));
      if (alt) g.add(lump({ c: [0, 13.2, .3], rad: [4.9, 2.1, 4.3], n: 130, sr: .9, col1: variant === 'pbp5' ? 0x2fbfa8 : 0xb25fe0, col2: variant === 'pbp5' ? 0x7fe8d4 : 0xd998ff, seed: 11 }));
      pk = V(0, 11.8, .5);
    } else if (kind === 'dala') {
      for (let k = 0; k < 5; k++) {
        const x = (k - 2) * 5.4, z = k % 2 ? 4 : -3, c2 = alt ? 0xff6a5e : 0xffd24a;
        let prev = V(x, 3.2, z); for (let j = 0; j < 3; j++) { const p = V(x + (j % 2 ? .5 : -.5), 4.6 + j * 1.5, z); g.add(ball(p.x, p.y, p.z, .85, 0x9bb5d6)); g.add(rod(prev, p, .3, 0x9bb5d6)); prev = p; }
        const a1 = V(x, 9.3, z), a2 = V(x, 11.3, z); g.add(ball(a1.x, a1.y, a1.z, 1.15, 0xffd24a)); g.add(rod(prev, a1, .3, 0x9bb5d6)); g.add(ball(a2.x, a2.y, a2.z, 1.15, c2)); g.add(rod(a1, a2, .3, 0xd8d8d8));
      }
      pk = V(0, 11.4, 0);
    } else if (kind === 'ribo') {
      g.add(lump({ c: [0, 0, 0], rad: [11, 9, 9], n: 520, col1: 0xb48cf0, col2: 0xe3c9ff, cavity: { c: [0, 6.6, 3.2], r: 3, u: [0, 1, .3], open: [0, 1, .3], n: 80 } }));
      g.add(lump({ c: [-3, -12.5, 0], rad: [8.5, 5.5, 7], n: 320, col1: 0x5aa9ee, col2: 0xa8dcff, seed: 9 }));
      if (alt) [[-1.6, 7.3, 3.9], [0, 7.6, 4.6], [1.6, 7.3, 3.9]].forEach(p => g.add(ball(p[0], p[1], p[2], .95, 0xff6a5e, 0x501010)));
      pk = V(0, 8, 3.4);
    } else if (kind === 'gyr') {
      dna(0, 0); g.add(lump({ c: [0, 0, -.5], rad: [10.5, 8, 6.5], n: 520, col1: 0x56b88c, col2: 0x9de8c2, cavity: { c: [0, 5.4, 0], r: 2.6, u: [0, 1, 0], open: [0, 1, 0], n: 70 } }));
      if (alt) [[-2, 7.6, 2], [0, 8, 2.6], [2, 7.6, 2]].forEach(p => g.add(ball(p[0], p[1], p[2], .9, 0xff6a5e, 0x501010)));
      pk = V(0, 7.6, 0);
    } else if (kind === 'rnap') {
      dna(-3, 0); g.add(lump({ c: [0, 0, 0], rad: [12, 9.5, 8], n: 560, col1: 0xe0875c, col2: 0xffc29a, cavity: { c: [0, 6.2, 2], r: 3, u: [0, 1, 0], open: [0, 1, 0], n: 80 } }));
      let prev = V(10, 4, 3); for (let i = 1; i < 6; i++) { const p = V(10 + i * 2.2, 4 + i * 1.6, 3); g.add(ball(p.x, p.y, p.z, .7, 0xffe08a)); g.add(rod(prev, p, .25, 0xffe08a)); prev = p; }
      if (alt) [[-2, 8.2, 3.2], [0, 8.6, 3.8], [2, 8.2, 3.2]].forEach(p => g.add(ball(p[0], p[1], p[2], .9, 0xff6a5e, 0x501010)));
      pk = V(0, 8.4, 2);
    } else if (kind === 'inha') {
      g.add(lump({ c: [0, 0, 0], rad: [7, 6, 6], n: 340, col1: alt ? 0xd95f7a : 0x4fc3d9, col2: alt ? 0xff9ab0 : 0x9fe8f5, cavity: { c: [0, 4, 0], r: 2.6, u: [0, 1, 0], open: [0, 1, 0], n: 60 } }));
      [[-1, 3.2, 0], [0, 3.6, 0], [1, 3.2, .4]].forEach(p => g.add(ball(p[0], p[1], p[2], .6, 0xffe08a)));
      if (alt) [[-1.8, 6.2, 1.5], [1.8, 6.2, 1.5]].forEach(p => g.add(ball(p[0], p[1], p[2], .9, 0xff6a5e, 0x501010)));
      pk = V(0, 6.2, 0);
    } else if (kind === 'mem') {
      const ring = new T.Mesh(new T.TorusGeometry(7, .35, 8, 40), std(0x7fe8ff, { emissive: 0x3aa8c8, emissiveIntensity: .9 })); ring.rotation.x = Math.PI / 2; ring.position.y = 4.7; g.add(ring);
      if (alt) for (let i = 0; i < 9; i++) { const a = i * 2.4, p = V(Math.cos(a) * (2 + i * .6), 6.2, Math.sin(a) * (2 + i * .5)); g.add(ball(p.x, p.y, p.z, .75, 0x6aa0ff, 0x1a3a90)); }
      pk = V(0, 5.2, 0);
    } else if (kind === 'erg11') {
      g.add(lump({ c: [0, 0, 0], rad: [8, 7, 6.5], n: 420, col1: alt ? 0xd96a3a : 0xff9a5c, col2: alt ? 0xffb27a : 0xffd0a0, cavity: { c: [0, 4.6, 0], r: 2.8, u: [0, 1, 0], open: [0, 1, 0], n: 70 } }));
      const heme = new T.Mesh(new T.CylinderGeometry(2.1, 2.1, .4, 18), std(0xc83a3a, { emissive: 0x501010, emissiveIntensity: .5 })); heme.position.set(0, 3.6, 0); g.add(heme); g.add(ball(0, 4.3, 0, .75, 0xffd24a, 0x7a5a00));
      if (alt) [[-1.8, 7.2, 1.2], [1.8, 7.2, 1.2]].forEach(p => g.add(ball(p[0], p[1], p[2], .9, 0xff6a5e, 0x501010)));
      pk = V(0, 7, 0);
    } else if (kind === 'fks') {
      g.add(lump({ c: [0, -1, 0], rad: [9, 8, 7], n: 480, col1: alt ? 0x8f5ad0 : 0x7a8aef, col2: alt ? 0xc29aff : 0xb3c0ff, cavity: { c: [0, 5.2, .3], r: 3.1, u: [0, 1, 0], open: [0, 1, 0], n: 70 } }));
      let prev = V(7, 5, 0); for (let i = 1; i < 6; i++) { const p = V(7 + i * 1.2, 5 + i * 1.5, 0); g.add(ball(p.x, p.y, p.z, .75, 0x8f6bff)); g.add(rod(prev, p, .3, 0x8f6bff)); prev = p; }
      if (alt) [[-1.8, 8.3, 1.2], [1.8, 8.3, 1.2]].forEach(p => g.add(ball(p[0], p[1], p[2], .9, 0xff6a5e, 0x501010)));
      pk = V(0, 8.6, .3);
    } else if (kind === 'ergos') {
      const r = rng(41), n = alt ? 12 : 26;
      for (let i = 0; i < n; i++) {
        const x = -26 + r() * 52, z = -10 + r() * 20, c = alt ? 0x9aa5b1 : 0xffd24a; if (Math.abs(x) < 3.5 && Math.abs(z) < 3.5) continue;
        [0, 1, 2].forEach(k => g.add(ball(x + (k - 1) * 1.2, 2.2 + (k % 2) * .5, z, .75, c)));
        g.add(rod(V(x + 1.2, 2.6, z), V(x + 3.4, 2.1, z), .25, c));
      }
      const c2 = alt ? 0x9aa5b1 : 0xffd24a; [0, 1, 2].forEach(k => g.add(ball((k - 1) * 1.2, 2.2 + (k % 2) * .5, 0, .8, c2))); g.add(rod(V(1.2, 2.6, 0), V(3.4, 2.1, 0), .28, c2));
      pk = V(0, 4.4, 0);
    }
    g.userData.pk = pk; g.visible = false; return g;
  }

  /* enzyme: kind 'enzyme' (BlaZ) or 'activ' (KatG) */
  function buildEnzyme(mechId, broken) {
    const m = M.res.MECH[mechId], v = m.view, g = new T.Group();
    g.add(lump({ c: [0, 0, 0], rad: [6.8, 5.6, 5.2], n: 340, col1: broken ? 0x6a7280 : v.col, col2: broken ? 0x9aa5b1 : new T.Color(v.col).lerp(new T.Color(0xffffff), .35).getHex(), cavity: { c: [0, 4, 0], r: 2.6, u: [0, 1, 0], open: [0, 1, 0], n: 60 }, seed: 19 }));
    if (m.kind === 'activ') { const h = new T.Mesh(new T.CylinderGeometry(1.8, 1.8, .4, 16), std(0xc83a3a, { emissive: 0x501010, emissiveIntensity: .5 })); h.position.set(0, 3.1, 0); g.add(h); g.add(ball(0, 3.8, 0, .7, 0xffd24a, 0x7a5a00)); }
    else g.add(ball(0, 3.4, 0, .95, 0xffa63a, 0x7a4300));
    g.position.set(v.x, v.y, 0); g.userData.pk = V(0, 5.6, 0); g.visible = false; return g;
  }

  /* ---------- drug token: ring, short chain and an orange "warhead" on the left ---------- */
  function buildDrug(hex, size) {
    const g = new T.Group(), bm = std(hex, { roughness: .4, transparent: true }), wm = std(0xffa63a, { emissive: 0x7a4300, emissiveIntensity: .7, roughness: .35, transparent: true }), bs = [], pts = [];
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; pts.push([Math.cos(a) * 1.9, Math.sin(a) * 1.9, (i % 2) * .25]); }
    [[4.2, .4, 0], [6.1, -.3, .3]].forEach(p => pts.push(p));
    pts.forEach(p => { const s = new T.Mesh(SPH, bm); s.position.set(p[0] - 3, p[1], p[2]); s.scale.setScalar(.95); g.add(s); bs.push(s); });
    const w = new T.Mesh(SPH, wm); w.position.set(-3 - 2.3, 0, 0); w.scale.setScalar(1.2); g.add(w);
    const sticks = []; [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[6,7]].forEach(([ia, ib]) => { const a = pts[ia], b = pts[ib], st = rod(V(a[0] - 3, a[1], a[2]), V(b[0] - 3, b[1], b[2]), .28, 0xdfe9f2, 1); st.material.transparent = true; g.add(st); sticks.push(st); });
    g.scale.setScalar(size || 1); g.traverse(o => { o.renderOrder = 5; });
    const mats = [bm, wm].concat(sticks.map(s => s.material));
    return { g, bm, wm, warhead: w, hex, fade(a) { mats.forEach(m => { m.opacity = a; }); }, color(h) { bm.color.setHex(h); }, reset() { bm.color.setHex(hex); wm.color.setHex(0xffa63a); wm.emissive.setHex(0x7a4300); w.position.set(-5.3, 0, 0); w.scale.setScalar(1.2); g.scale.setScalar(size || 1); g.visible = false; this.fade(1); } };
  }

  /* ---------- the world ---------- */
  function buildUni() {
    const root = new T.Group(), W = { root, env: {}, tg: {}, en: {}, drugs: {}, size: { x0: X0, x1: X1 } };
    const cy = new T.Group(), r = rng(77);
    cy.add(points(300, () => [X0 + r() * 124, -66 + r() * 56, -16 + r() * 32], 1.1, 0x7fd9ff, .35));
    const rb = new T.InstancedMesh(SPH, std(0x4a6a8a, { roughness: .6 }), 40);
    for (let i = 0; i < 40; i++) { const lowY = r() < .5; pos.set(X0 + r() * 124, lowY ? -66 + r() * 14 : -48 + r() * 30, -14 - r() * 16); sc.setScalar(1.8 + r() * 1.4); m4.compose(pos, Q0, sc); rb.setMatrixAt(i, m4); }
    cy.add(rb); root.add(cy);
    const sp = (t, c) => { const s = M.util.sprite(t, c); root.add(s); return s; };
    W.ok = [0, 1, 2, 3, 4, 5].map(() => sp('✓', '#4dffa0')); W.no = [0, 1, 2, 3, 4, 5].map(() => sp('✗', '#ff5a4e'));
    W.glows = [0, 1, 2, 3].map(() => { const h = glow(0x4de3d0, 16, 0); h.visible = false; root.add(h); return h; });
    W.getEnv = k => { if (!W.env[k]) { W.env[k] = buildEnv(k); root.add(W.env[k].g); } return W.env[k]; };
    W.getTarget = (kind, variant) => { const key = kind + ':' + (variant || 'n'); if (!W.tg[key]) { const g = buildTarget(kind, variant); const p = TPOS[kind]; g.position.set(p[0], p[1], p[2]); root.add(g); W.tg[key] = g; } return W.tg[key]; };
    W.getEnzyme = (id, broken) => { const key = id + (broken ? ':b' : ''); if (!W.en[key]) { const g = buildEnzyme(id, broken); root.add(g); W.en[key] = g; } return W.en[key]; };
    W.drug = (i, hex, size) => { const k = i + ':' + hex + ':' + size; if (!W.drugs[k]) { const d = buildDrug(hex, size); root.add(d.g); W.drugs[k] = d; } return W.drugs[k]; };
    W.hideAll = () => { Object.values(W.env).forEach(e => { e.g.visible = false; e.pump.visible = false; if (e.thick) e.thick.visible = false; }); Object.values(W.tg).forEach(g => { g.visible = false; }); Object.values(W.en).forEach(g => { g.visible = false; }); Object.values(W.drugs).forEach(d => { d.g.visible = false; }); W.ok.concat(W.no).forEach(s => { s.visible = false; s.material.opacity = 1; s.scale.setScalar(3.2); }); W.glows.forEach(h => { h.visible = false; h.material.opacity = 0; }); };
    W.TPOS = TPOS; return W;
  }
  M.buildUni = buildUni; M.uniMark = mark;
})();
