/* Sepsis itself: pathogen-host interaction, cytokine storm and immune dysregulation, as three photoreal 3D scenes.
   Registers the organ type "septic" with the shared PathStage (sepsis/path-stage.js).
     view "organ"  Pathogen-host   bacteria on a barrier, macrophage receptors, neutrophils, NETs, venule
     view "storm"  Cytokine storm  a cut-open venule, cytokine clouds, activated endothelium, glycocalyx loss, leak, micro clots
     view "cells"  Immune dysregulation  hyperinflammation against immune paralysis, with a balance beam
   Normal / Diseased / Play drive everything through severity. Teaching text is original and needs clinical review. */
(function () {
  "use strict";
  if (!window.PathStage || !PathStage.register) return;
  const K = PathStage.kit, T = K.THREE, V = K.V, wet = K.wet, tag = K.tag, organic = K.organic, clamp = K.clamp;
  const Y = V(0, 1, 0);
  const CARE = "Take cultures, give effective antibiotics within the first hour of shock, and control the source.";

  /* three r128 treats hex as linear while the stage outputs sRGB, so convert and the colours read as written */
  function W(color, o) {
    const c = new T.Color(color).convertSRGBToLinear();
    return wet(c.getHex(), Object.assign({ clearcoat: 0.35, clearcoatRoughness: 0.3 }, o || {}));
  }
  function glow(m, col, k) { m.emissive = new T.Color(col).convertSRGBToLinear(); m.emissiveIntensity = k; return m; }
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const lerp = (a, b, u) => a + (b - a) * u;
  const dummy = new T.Object3D();

  let BUMP = null;
  function bump() {
    if (BUMP) return BUMP;
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), r = rng(5);
    g.fillStyle = "#808080"; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1100; i++) { const v = 80 + Math.floor(r() * 110); g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.beginPath(); g.arc(r() * 128, r() * 128, 1 + r() * 3, 0, 7); g.fill(); }
    BUMP = new T.CanvasTexture(c); BUMP.wrapS = BUMP.wrapT = T.RepeatWrapping; BUMP.repeat.set(3, 3);
    return BUMP;
  }
  function cellMat(col, o) { return W(col, Object.assign({ roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.35, bumpMap: bump(), bumpScale: 0.22 }, o || {})); }
  function sphere(r, mat, seg) { return new T.Mesh(new T.SphereGeometry(r, seg || 14, Math.max(6, (seg || 14) - 4)), mat); }
  function blob(r, mat, seed, amp) { const m = new T.Mesh(organic(26, amp == null ? 0.12 : amp, seed), mat.clone()); m.scale.setScalar(r); return m; }
  function tint(mesh, a, b, u) { mesh.material.color.set(a).lerp(new T.Color(b), clamp(u)).convertSRGBToLinear(); }

  const ROD = (function () {
    const p = [], h = 0.12, r = 0.06;
    for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; p.push(new T.Vector2(Math.sin(a) * r, -h - Math.cos(a) * r)); }
    for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; p.push(new T.Vector2(Math.cos(a) * r, h + Math.sin(a) * r)); }
    return new T.LatheGeometry(p, 12);
  })();
  const SPH = new T.SphereGeometry(1, 10, 7);

  function ypin(mat) {
    const g = new T.Group();
    const s = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.1, 6), mat); s.position.y = 0.05; g.add(s);
    [-1, 1].forEach((sg) => {
      const a = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, 0.07, 6), mat); a.position.set(sg * 0.03, 0.125, 0); a.rotation.z = -sg * 0.5; g.add(a);
      const b = sphere(0.017, mat, 6); b.position.set(sg * 0.052, 0.153, 0); g.add(b);
    });
    return g;
  }
  function onSurface(g, n, rx, ry, rz, mat, rand) {
    /* fibonacci points over an ellipsoid, each with a Y-shaped receptor standing on the surface */
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = 1 - 2 * (i + 0.5) / n, a = i * 2.39996, q = Math.sqrt(1 - u * u);
      const d = V(q * Math.cos(a), u, q * Math.sin(a));
      const y = ypin(mat.clone()); y.position.set(d.x * rx, d.y * ry, d.z * rz);
      y.quaternion.setFromUnitVectors(Y, V(d.x / rx, d.y / ry, d.z / rz).normalize());
      y.userData.dir = d; g.add(y); out.push(y);
    }
    return out;
  }
  function swarm(n, col, size, title, body, care, k) {
    const m = new T.InstancedMesh(SPH, glow(W(col, { roughness: 0.22, clearcoat: 0.9 }), col, k == null ? 0.45 : k), n);
    m.frustumCulled = false; m.userData.size = size; m.userData.n = n; m.count = 0;
    tag(m, title, body, care);
    return m;
  }
  function place(m, i, x, y, z, s) { dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }
  function done(m) { m.instanceMatrix.needsUpdate = true; }
  function neutrophil(r, rand) {
    const g = new T.Group();
    const body = blob(r, cellMat(0xeed8c8, { transparent: true, opacity: 0.8, depthWrite: false }), 4 + Math.floor(rand() * 9), 0.1);
    g.add(body);
    const nm = cellMat(0x6b4a96, { roughness: 0.5 });
    [[-0.45, 0.1, 0.1], [0.05, -0.3, 0.2], [0.45, 0.15, -0.05]].forEach((p) => { const n = sphere(r * 0.34, nm, 12); n.position.set(p[0] * r, p[1] * r, p[2] * r); g.add(n); });
    const link = new T.Mesh(new T.CylinderGeometry(r * 0.07, r * 0.07, r * 0.9, 6), nm); link.rotation.z = 1.2; link.position.set(-0.2 * r, -0.1 * r, 0.1 * r); g.add(link);
    const gm = cellMat(0xd68ab0, { roughness: 0.4 });
    for (let i = 0; i < 9; i++) { const s = sphere(r * 0.07, gm, 6); const a = rand() * 6.28, b = rand() * 3.14; s.position.set(Math.cos(a) * Math.sin(b) * r * 0.8, Math.cos(b) * r * 0.8, Math.sin(a) * Math.sin(b) * r * 0.8); g.add(s); }
    body.userData.pick = null;
    tag(body, "Neutrophil", "The first white cell to arrive. IL-8 and C5a call it from the blood. It rolls, sticks, squeezes out of the venule and kills microbes by engulfing them, by releasing granules and by throwing out DNA nets. Over-activated, it also injures healthy tissue.", "Neutrophil activation is the price of defence. Control the source, because killing the microbe is what switches the signal off.");
    return g;
  }

  /* ====================================================================== SCENE A: pathogen-host (gross) */
  function septicGross(k, mat) {
    const g = new T.Group(), rand = rng(31);
    const A = new T.Group(); g.add(A);

    /* tissue plinth: the real tissue texture fades from healthy to septic with severity */
    const slab = new T.Mesh(organic(40, 0.025, 3), mat); slab.scale.set(2.1, 0.2, 1.1); slab.position.y = -0.95;
    tag(slab, "Subepithelial tissue", "The connective tissue under the barrier. It carries the capillaries and the venules that bring defenders to the site.", "Early, effective antimicrobials reach this tissue through the blood.");
    A.add(slab);

    /* epithelial barrier: a cobblestone sheet whose junctions open as inflammation grows */
    const epi = [], eMat = cellMat(0xeab7ab, { clearcoat: 0.6 });
    for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) {
      const c = blob(1, eMat, 2 + ((i * 7 + j * 3) % 9), 0.07);
      const x = -1.56 + i * 0.39 + (j % 2) * 0.19, z = -0.5 + j * 0.42;
      c.position.set(x, -0.74, z); c.scale.set(0.19, 0.085, 0.2); c.userData.x = x; c.userData.z = z;
      tag(c, "Epithelial barrier", "Cells joined by tight junctions keep microbes out. Cytokines open the junctions and kill cells, so bacteria and toxins pass into the tissue and then into the blood.", "Source control closes the breach. Remove or drain the focus.");
      A.add(c); epi.push(c);
    }

    /* bacterial colony: Gram-negative rods and Gram-positive cocci */
    const bac = [], rodM = cellMat(0xb9c24d, { roughness: 0.5 }), cocM = cellMat(0xe0a93a, { roughness: 0.5 });
    const cx = -1.0, cy = -0.55, cz = 0.1;
    for (let i = 0; i < 52; i++) {
      const rod = i % 3 !== 0;
      const m = rod ? new T.Mesh(ROD, rodM) : new T.Mesh(SPH, cocM);
      if (!rod) m.scale.setScalar(0.065);
      const a = rand() * 6.28, rr = Math.sqrt(rand());
      m.position.set(cx + Math.cos(a) * rr * 0.55, cy + rand() * 0.17, cz + Math.sin(a) * rr * 0.4);
      m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      m.userData.p = m.position.clone(); m.userData.r = m.rotation.clone(); m.userData.k = rand(); m.userData.rod = rod;
      if (rod) tag(m, "Gram-negative rod", "Gram-negative bacteria such as E. coli and Klebsiella carry lipopolysaccharide (LPS) in their outer membrane. LPS is the classic danger signal. It is also released when antibiotics break the cell.", CARE);
      else tag(m, "Gram-positive coccus", "Cocci such as Staphylococcus and Streptococcus shed peptidoglycan, lipoteichoic acid and toxins. Some toxins act as superantigens and switch on huge numbers of T cells at once.", CARE);
      A.add(m); bac.push(m);
    }
    /* complement and antibody coat on the microbes */
    const c3 = [], c3M = glow(W(0x6fe0d0, { roughness: 0.3 }), 0x6fe0d0, 0.5);
    for (let i = 0; i < 46; i++) {
      const s = new T.Mesh(SPH, c3M); s.scale.setScalar(0.016);
      const a = rand() * 6.28, rr = 0.35 + rand() * 0.35;
      s.position.set(cx + Math.cos(a) * rr * 0.75, cy + 0.02 + rand() * 0.22, cz + Math.sin(a) * rr * 0.55);
      tag(s, "Complement C3b", "Complement proteins coat the microbe, which is called opsonisation. Phagocytes have receptors for the coat, so they grab coated microbes. C5a, a split product, calls neutrophils and over-activates them.", "Nothing blocks complement safely in sepsis. Treat the infection.");
      A.add(s); c3.push(s);
    }
    /* neutrophil extracellular traps */
    const nets = [], netM = W(0xf4f2ea, { roughness: 0.6, transparent: true, opacity: 0.75, clearcoat: 0.05 });
    for (let i = 0; i < 34; i++) {
      const len = 0.3 + rand() * 0.45, s = new T.Mesh(new T.CylinderGeometry(0.0045, 0.0045, len, 4), netM);
      s.position.set(cx + (rand() - 0.5) * 0.9, cy + 0.08 + rand() * 0.25, cz + (rand() - 0.5) * 0.6);
      s.rotation.set(rand() * 3, rand() * 3, rand() * 3); s.userData.s0 = 1;
      tag(s, "Neutrophil extracellular trap", "Strands of DNA and histones thrown out by dying neutrophils. They trap bacteria, but histones also injure the endothelium and the strands are a scaffold for micro clots.", "DNase and histone blockers are experimental. Source control matters most.");
      A.add(s); nets.push(s);
    }

    /* resident macrophage with Toll-like receptors */
    const mac = new T.Group(); mac.position.set(0.1, -0.3, 0.15); A.add(mac);
    const mBody = blob(0.4, cellMat(0xe6c9b6, { transparent: true, opacity: 0.78, depthWrite: false }), 5, 0.1); mBody.scale.set(0.42, 0.34, 0.38);
    tag(mBody, "Resident macrophage", "Tissue macrophages sense microbes first. Receptors on the surface read the danger signals, the cell engulfs the microbe and releases the first wave of cytokines and chemokines.", "Its first alarm is useful. The harm comes when the alarm does not switch off.");
    mac.add(mBody);
    const nuc = blob(0.17, cellMat(0x6c4a8f, { roughness: 0.5 }), 9, 0.1); nuc.scale.set(0.22, 0.14, 0.14); nuc.position.set(0.05, 0.04, 0);
    mac.add(nuc);
    const pseudo = blob(0.2, cellMat(0xe6c9b6, { transparent: true, opacity: 0.78, depthWrite: false }), 12, 0.15); pseudo.scale.set(0.3, 0.1, 0.1); pseudo.position.set(-0.45, -0.05, 0);
    tag(pseudo, "Resident macrophage", "A pseudopod reaches towards the microbes to engulf them.", "");
    mac.add(pseudo);
    const recM = glow(W(0x35c2c8, { roughness: 0.3 }), 0x35c2c8, 0.2), recs = onSurface(mac, 20, 0.4, 0.34, 0.38, recM, rand);
    recs.forEach((r) => tag(r.children[0], "Toll-like receptor 4", "TLR4, with MD-2 and CD14, binds LPS. It signals through MyD88 and TRIF and switches on NF-kappa B. That turns on the genes for TNF-alpha, IL-1 beta and IL-6.", "Receptor blockers did not improve survival in trials. The treatment is the antibiotic, the source control and organ support."));
    const phag = [], vac = new T.Mesh(SPH, W(0xfaf0e8, { transparent: true, opacity: 0.3, depthWrite: false })); vac.scale.setScalar(0.1); vac.position.set(-0.2, -0.03, 0.06);
    tag(vac, "Phagosome", "The engulfed microbe sits in a vacuole that fuses with lysosomes. Reactive oxygen species and enzymes kill it.", ""); mac.add(vac);
    for (let i = 0; i < 2; i++) { const r = new T.Mesh(ROD, rodM); r.scale.setScalar(0.5); r.position.set(-0.2 + i * 0.03, -0.03 + i * 0.03, 0.06); r.rotation.z = 1 + i; mac.add(r); phag.push(r); }
    mac.userData.pop = vac;

    /* venule that brings neutrophils and carries bacteria away */
    const ven = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 3.6, 28, 1, true), W(0xd6807f, { transparent: true, opacity: 0.26, side: T.DoubleSide, depthWrite: false, roughness: 0.3 }));
    ven.rotation.z = Math.PI / 2; ven.position.set(0, 0.62, -0.72);
    tag(ven, "Post-capillary venule", "Defenders leave the blood here. In sepsis bacteria can also enter, which is bacteraemia, and spread to other organs.", "Draw two sets of blood cultures before antibiotics if that causes no delay.");
    A.add(ven);
    const rbc = [], rb = K.rbcGeo(), rbM = W(0x9a1d2c, { roughness: 0.28 });
    for (let i = 0; i < 12; i++) { const r = new T.Mesh(rb, rbM); r.scale.setScalar(0.2); r.userData = { u: i / 12, y: (rand() - 0.5) * 0.28, z: (rand() - 0.5) * 0.28 }; tag(r, "Red cell", "Red cells flow past in the venule.", ""); A.add(r); rbc.push(r); }
    const bl = []; for (let i = 0; i < 6; i++) { const r = new T.Mesh(ROD, rodM); r.scale.setScalar(0.55); r.userData = { u: i / 6, y: (rand() - 0.5) * 0.3, z: (rand() - 0.5) * 0.3 }; tag(r, "Bacteria in the blood", "Bacteraemia. Organisms seed distant organs and release toxins in the circulation.", CARE); A.add(r); bl.push(r); }
    const neu = []; for (let i = 0; i < 3; i++) { const n = neutrophil(0.2, rand); A.add(n); neu.push(n); }
    const path = new T.CatmullRomCurve3([V(1.6, 0.62, -0.72), V(1.0, 0.6, -0.66), V(0.75, 0.15, -0.2), V(0.2, -0.2, 0.3), V(-0.55, -0.45, 0.25)]);

    /* mediator swarms: PAMPs flowing to the macrophage and the first cytokines flowing out of it */
    const pamp = swarm(18, 0xb6e83a, 0.022, "LPS and peptidoglycan", "Pathogen-associated molecular patterns. Fragments of the microbe that host receptors recognise within minutes.", CARE, 0.6);
    const tnf = swarm(26, 0xff5a3c, 0.028, "TNF-alpha", "The first cytokine to peak. It causes fever, dilates vessels, activates the endothelium and makes it leak.", "Anti-TNF drugs did not improve survival in unselected patients.");
    const il1 = swarm(22, 0xffc233, 0.026, "IL-1 beta", "Raises the temperature and turns on the endothelium. It is made through the inflammasome and amplifies the whole cascade.", "IL-1 receptor antagonist has no routine role in sepsis.");
    const il6 = swarm(22, 0xe04bb4, 0.03, "IL-6", "The messenger that tells the liver to make acute-phase proteins. Its level tracks severity and outcome.", "Treat the infection. IL-6 blockade is not a sepsis treatment.");
    [pamp, tnf, il1, il6].forEach((s) => A.add(s));

    g.userData = { A, epi, bac, c3, nets, mac, mBody, nuc, recs, phag, vac, ven, rbc, bl, neu, path, pamp, tnf, il1, il6, cx, cy, cz, rand: rng(8) };
    g.userData.sw = { pamp, tnf, il1, il6 };
    return g;
  }

  function septicApply(k, e, sev, nec, t) {
    const gr = e.organ.userData, view = e.view || "organ";
    const isA = view === "organ", isB = view === "storm";
    gr.A.visible = isA;
    if (gr.B) gr.B.visible = isB;
    if (isA) applyA(gr, sev, t);
    if (isB) applyB(gr, sev, t);
    applyC(e.cells.userData, sev, t);
  }

  function applyA(gr, sev, t) {
    const burden = clamp(sev * 1.2), open = clamp(sev * 1.3 - 0.15);
    gr.epi.forEach((c) => {
      const near = clamp(1 - Math.abs(c.userData.x - gr.cx) / 1.3);
      const o = open * (0.35 + 0.65 * near);
      c.scale.set(0.19 * (1 - 0.3 * o), 0.085 * (1 - 0.25 * o), 0.2 * (1 - 0.3 * o));
      tint(c, 0xeab7ab, 0xb86a62, o * 0.8);
    });
    const nb = Math.round(gr.bac.length * burden);
    gr.bac.forEach((b, i) => {
      b.visible = i < nb;
      b.scale.setScalar((b.userData.rod ? 0.8 : 0.065) * (0.8 + 0.4 * burden));
      b.position.set(b.userData.p.x + Math.sin(t * 0.6 + i) * 0.012, b.userData.p.y + Math.cos(t * 0.5 + i * 1.3) * 0.01, b.userData.p.z);
      b.rotation.z = b.userData.r.z + Math.sin(t * 0.7 + i) * 0.08;
    });
    gr.c3.forEach((s, i) => { s.visible = i < Math.round(46 * clamp(sev * 1.1 - 0.05)) && sev > 0.05; });
    const net = clamp((sev - 0.35) * 1.6);
    gr.nets.forEach((s, i) => { s.visible = i < Math.round(34 * net); });
    /* macrophage: round and quiet when well, flushed and ruffled when alarmed */
    const m = gr.mac; const act = clamp(sev * 1.5);
    tint(gr.mBody, 0xe6c9b6, 0xe58a72, act);
    m.scale.setScalar(1 + 0.08 * Math.sin(t * 2) * act + 0.1 * act);
    gr.recs.forEach((r) => { const left = clamp(-r.userData.dir.x + 0.2); r.children.forEach((c) => { if (c.material) c.material.emissiveIntensity = 0.2 + 1.1 * act * left; }); });
    gr.vac.visible = sev > 0.2; gr.phag.forEach((p) => { p.visible = sev > 0.25; });
    /* neutrophils arrive from the venule */
    const nn = Math.ceil(clamp(sev * 1.3) * gr.neu.length - 0.001);
    gr.neu.forEach((n, i) => {
      n.visible = i < nn && sev > 0.08;
      const u = (t * 0.045 + i / gr.neu.length) % 1, p = gr.path.getPoint(u);
      n.position.copy(p); n.rotation.y = t * 0.3 + i;
      const sq = 1 - 0.18 * Math.sin(clamp((u - 0.3) / 0.25) * Math.PI);
      n.scale.set(1 + (1 - sq), sq, 1 + (1 - sq));
    });
    /* blood in the venule */
    gr.rbc.forEach((r) => { const u = (t * 0.06 * (1 - 0.5 * sev) + r.userData.u) % 1; r.position.set(1.7 - u * 3.4, 0.62 + r.userData.y, -0.72 + r.userData.z); r.rotation.set(Math.PI / 2 + Math.sin(t + u * 9) * 0.3, 0, t * 0.8); });
    const nbl = Math.round(gr.bl.length * clamp((sev - 0.55) * 2.4));
    gr.bl.forEach((r, i) => { r.visible = i < nbl; const u = (t * 0.05 + r.userData.u) % 1; r.position.set(1.7 - u * 3.4, 0.62 + r.userData.y, -0.72 + r.userData.z); r.rotation.z = Math.PI / 2 + Math.sin(t + i) * 0.4; });
    /* swarms */
    const tgt = V(0.02, -0.3, 0.2), src = V(gr.cx + 0.1, gr.cy + 0.15, gr.cz);
    const np = Math.round(18 * clamp(sev * 1.6)); gr.pamp.count = np;
    for (let i = 0; i < np; i++) { const u = (t * 0.22 + i / 18) % 1; place(gr.pamp, i, lerp(src.x, tgt.x - 0.3, u), lerp(src.y, tgt.y, u) + Math.sin(u * 3.14) * 0.22 + Math.sin(t * 3 + i) * 0.015, lerp(src.z, tgt.z, u), gr.pamp.userData.size * (0.8 + 0.5 * Math.sin(u * 3.14))); }
    done(gr.pamp);
    [[gr.tnf, 26, 0, 1], [gr.il1, 22, 2, 0.8], [gr.il6, 22, 4, 0.6]].forEach(([s, n, ph, lv]) => {
      const c = Math.round(n * clamp((sev - 0.08) * 1.7) * lv); s.count = c;
      for (let i = 0; i < c; i++) {
        const u = (t * 0.16 + i / n + ph * 0.13) % 1, a = i * 2.4 + ph + t * 0.25, r = 0.1 + u * 0.55;
        place(s, i, 0.1 + Math.cos(a) * r * 1.1, -0.15 + u * 1.15, 0.15 + Math.sin(a) * r * 0.7, s.userData.size * (1.4 - 0.8 * u));
      }
      done(s);
    });
  }

  /* ====================================================================== SCENE B: cytokine storm */
  function buildStorm(g, mat) {
    const rand = rng(77), B = new T.Group(); g.add(B); B.visible = false;
    const R0 = 0.52;
    const wall = new T.Mesh(new T.CylinderGeometry(R0, R0, 3.7, 36, 1, true), W(0xd77a78, { transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false, roughness: 0.3 }));
    wall.rotation.z = Math.PI / 2;
    tag(wall, "Venule wall", "A small vein cut open to show the lumen. The wall is a single layer of endothelium on a thin sheath. It sets how much plasma and how many cells leave the blood.", "Noradrenaline for the pressure, and fluid only while the circulation still responds.");
    B.add(wall);
    const endo = [], eM = cellMat(0xe9a9a0, { clearcoat: 0.55 });
    for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) {
      const c = blob(1, eM, 3 + ((i + j * 5) % 9), 0.06);
      c.userData.a = (i + (j % 2) * 0.5) / 6 * Math.PI * 2; c.userData.x = -1.65 + j * 0.55;
      tag(c, "Activated endothelium", "A single layer that normally keeps blood fluid and the wall sealed. Cytokines make it display adhesion molecules, tissue factor and nitric oxide synthase. It leaks, it catches white cells and it promotes clotting.", "The endothelium recovers when the trigger is controlled. There is no drug that repairs it directly.");
      B.add(c); endo.push(c);
    }
    const hairs = [], hM = W(0xf6e3b8, { roughness: 0.6, transparent: true, opacity: 0.85, clearcoat: 0.05 });
    for (let i = 0; i < 90; i++) {
      const h = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, 0.1, 4), hM);
      h.userData.a = rand() * 6.283; h.userData.x = -1.7 + rand() * 3.4;
      tag(h, "Glycocalyx", "A gel-like coat of proteoglycans on the inside of the endothelium. It keeps the wall slippery and sealed. TNF-alpha and enzymes shed it, so plasma leaks out and cells stick.", "No treatment restores it today. Avoid large fluid loads that add to the shedding.");
      B.add(h); hairs.push(h);
    }
    const spikes = [], sM = glow(W(0xff9a55, { roughness: 0.4 }), 0xff7a30, 0.25);
    for (let i = 0; i < 34; i++) {
      const s = new T.Mesh(new T.ConeGeometry(0.018, 0.07, 6), sM);
      s.userData.a = rand() * 6.283; s.userData.x = -1.7 + rand() * 3.4;
      tag(s, "Adhesion molecules", "ICAM-1, VCAM-1 and E-selectin. They catch passing white cells so that they roll, stick and cross the wall.", "");
      B.add(s); spikes.push(s);
    }
    const gaps = [], gM = W(0x4a1016, { roughness: 0.6, clearcoat: 0.1 });
    [[-1.1, 0.6], [-0.35, 0.2], [0.35, 0.9], [0.95, 0.35], [1.4, 0.75]].forEach((P, i) => {
      const gp = sphere(0.1, gM, 10); gp.scale.set(1.2, 0.35, 1); gp.userData.a = P[1]; gp.userData.x = P[0];
      tag(gp, "Gap in the wall", "Cell junctions pull apart. Plasma, albumin and fluid escape into the tissue, so the tissue swells while the vessel runs underfilled.", "Give fluid in measured boluses and stop when the patient stops responding.");
      B.add(gp); gaps.push(gp);
    });
    const leak = [], lM = W(0xcfe8f5, { transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false });
    for (let i = 0; i < 24; i++) { const d = new T.Mesh(SPH, lM); d.userData.k = i; tag(d, "Leaked plasma", "Plasma and protein cross the wall into the tissue. This is oedema.", ""); B.add(d); leak.push(d); }
    const rbc = [], rb = K.rbcGeo(), rbM = W(0x9a1d2c, { roughness: 0.28 });
    for (let i = 0; i < 18; i++) { const r = new T.Mesh(rb, rbM); r.scale.setScalar(0.19); r.userData = { u: i / 18, y: (rand() - 0.5) * 0.7, z: (rand() - 0.5) * 0.7, k: rand() }; tag(r, "Red cell", "Flow slows and becomes patchy. Some capillaries stop and others run too fast, so oxygen does not reach the cells.", ""); B.add(r); rbc.push(r); }
    const plt = [], pM = W(0xcdbfe8, { roughness: 0.4 });
    for (let i = 0; i < 12; i++) { const p = sphere(0.04, pM, 8); p.scale.set(1.3, 0.5, 1); p.userData = { u: rand(), a: rand() * 6.28, k: rand() }; tag(p, "Platelet", "Platelets are used up as clots form in small vessels, so the count falls.", ""); B.add(p); plt.push(p); }
    const clot = new T.Group(); clot.position.set(0.55, 0, 0);
    const fM = W(0xf0e2c4, { roughness: 0.6, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 16; i++) { const f = new T.Mesh(new T.CylinderGeometry(0.007, 0.007, 0.34, 5), fM); f.position.set((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.35, (rand() - 0.5) * 0.35); f.rotation.set(rand() * 3, rand() * 3, rand() * 3); clot.add(f); tag(f, "Microthrombus", "Tissue factor and neutrophil traps trigger clotting in small vessels. Fibrin traps platelets and red cells and blocks flow. In excess this becomes DIC.", "Source control. Platelets and plasma only for bleeding or a procedure."); }
    for (let i = 0; i < 6; i++) { const r = new T.Mesh(rb, rbM); r.scale.setScalar(0.15); r.position.set((rand() - 0.5) * 0.25, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3); r.rotation.set(rand() * 3, rand() * 3, rand() * 3); clot.add(r); }
    B.add(clot);
    const macs = [], mP = [V(-1.05, 1.0, 0.15), V(0.3, -1.05, 0.25), V(1.2, 0.95, -0.05)];
    mP.forEach((p, i) => {
      const m = blob(0.28, cellMat(0xe6c9b6, { transparent: true, opacity: 0.8, depthWrite: false }), 7 + i * 4, 0.1); m.position.copy(p); m.scale.set(0.3, 0.24, 0.26); m.userData.p = p.clone();
      tag(m, "Perivascular macrophage", "Macrophages around the vessel are the main source of the cytokines. Fed by LPS signals, they pour out TNF-alpha, IL-1 beta and IL-6 together.", "Nothing here is a drug target yet. Treat the cause.");
      const n = blob(0.12, cellMat(0x6c4a8f, { roughness: 0.5 }), 3, 0.1); n.scale.set(0.45 * 1.5, 0.45, 0.45); n.position.set(0.02, 0, 0); m.add(n);
      B.add(m); macs.push(m);
    });
    const neu = [];
    for (let i = 0; i < 3; i++) { const n = neutrophil(0.17, rand); n.userData.k = i; B.add(n); neu.push(n); }
    const sw = {
      tnf: swarm(70, 0xff5a3c, 0.03, "TNF-alpha", "Fast and early. It causes fever, vasodilation, endothelial activation and leak.", "Anti-TNF drugs did not improve survival in unselected patients."),
      il1: swarm(60, 0xffc233, 0.028, "IL-1 beta", "Amplifies the cascade and keeps the fever going. Made through the inflammasome.", "IL-1 receptor antagonist is not a routine sepsis treatment."),
      il6: swarm(60, 0xe04bb4, 0.034, "IL-6", "Drives the liver acute-phase response and tracks severity.", "Use trends in lactate, MAP and organ function rather than a cytokine level."),
      il8: swarm(46, 0x4fd1ff, 0.026, "IL-8 and chemokines", "Chemokines call neutrophils out of the blood. Their gradient points to the site of injury.", ""),
      il10: swarm(50, 0x5b7bff, 0.03, "IL-10", "The anti-inflammatory signal. It rises with the pro-inflammatory ones and stays high later, which is one reason the response ends in immune paralysis.", "High IL-10 marks a patient at risk of secondary infection.")
    };
    Object.keys(sw).forEach((q) => B.add(sw[q]));
    g.userData.B = B;
    g.userData.st = { wall, endo, hairs, spikes, gaps, leak, rbc, plt, clot, macs, neu, sw, R0, mP };
  }

  function applyB(gr, sev, t) {
    const s = gr.st; if (!s) return;
    const R = s.R0 * (1 + 0.28 * sev), act = clamp(sev * 1.4);
    s.wall.scale.set(1 + 0.28 * sev, 1, 1 + 0.28 * sev);
    s.endo.forEach((c) => {
      const a = c.userData.a; c.position.set(c.userData.x, Math.sin(a) * R, Math.cos(a) * R);
      c.quaternion.setFromUnitVectors(Y, V(0, Math.sin(a), Math.cos(a)));
      c.scale.set(0.27, 0.035, 0.17); tint(c, 0xe9a9a0, 0xe0503c, act * 0.85);
    });
    s.hairs.forEach((h) => { const a = h.userData.a, r = R - 0.045 * (0.2 + 1 - 0.8 * clamp(sev * 1.3)); h.position.set(h.userData.x, Math.sin(a) * r, Math.cos(a) * r); h.quaternion.setFromUnitVectors(Y, V(0, -Math.sin(a), -Math.cos(a))); h.scale.set(1, clamp(1.25 - sev * 1.1, 0.12, 1.3), 1); h.visible = clamp(1.25 - sev * 1.1) > 0.15; });
    s.spikes.forEach((p, i) => { const a = p.userData.a, r = R - 0.02; p.position.set(p.userData.x, Math.sin(a) * r, Math.cos(a) * r); p.quaternion.setFromUnitVectors(Y, V(0, -Math.sin(a), -Math.cos(a))); p.visible = i < 34 * clamp(sev * 1.3); });
    s.gaps.forEach((gp, i) => { const a = gp.userData.a; gp.visible = sev > 0.12 + i * 0.12; gp.position.set(gp.userData.x, Math.sin(a) * R, Math.cos(a) * R); gp.quaternion.setFromUnitVectors(Y, V(0, Math.sin(a), Math.cos(a))); { const q = 0.6 + 1.1 * clamp(sev); gp.scale.set(1.2 * q, 0.3 * q, q); } });
    const nl = Math.round(s.leak.length * clamp((sev - 0.1) * 1.5));
    s.leak.forEach((d, i) => {
      d.visible = i < nl; const gp = s.gaps[i % s.gaps.length], a = gp.userData.a, u = (t * 0.2 + i / s.leak.length) % 1, rr = R + u * 0.7;
      d.position.set(gp.userData.x + Math.sin(i) * 0.06, Math.sin(a) * rr, Math.cos(a) * rr); d.scale.setScalar(0.03 * (1.2 - u));
    });
    s.rbc.forEach((r) => {
      const sp = 0.07 * (1 - 0.8 * sev * (0.4 + r.userData.k)); r.userData.u = (r.userData.u + sp * 0.016) % 1;
      const u = r.userData.u; r.position.set(1.7 - u * 3.4, r.userData.y * R / s.R0 * 0.8, r.userData.z * R / s.R0 * 0.8);
      r.rotation.set(Math.PI / 2 + Math.sin(t + u * 8) * 0.4, 0, t * 0.7 * (1 - 0.6 * sev));
    });
    s.plt.forEach((p, i) => { const sticky = clamp(sev * 1.3); const u = (p.userData.u + t * 0.03 * (1 - sticky)) % 1; const a = p.userData.a, rr = lerp(0.3, 0.9, sticky) * R * 0.95; p.position.set(1.7 - u * 3.4, Math.sin(a) * rr, Math.cos(a) * rr); p.visible = i < 12 * clamp(1.1 - sev * 0.7); });
    const cl = clamp((sev - 0.5) * 2.2); s.clot.visible = cl > 0.02; s.clot.scale.setScalar(0.3 + cl * 0.9);
    s.macs.forEach((m, i) => { tint(m, 0xe6c9b6, 0xe58a72, act); m.scale.set(0.3 * (1 + 0.15 * act), 0.24 * (1 + 0.15 * act), 0.26 * (1 + 0.15 * act)); m.position.set(m.userData.p.x, m.userData.p.y + Math.sin(t * 1.3 + i) * 0.015, m.userData.p.z); });
    const nn = Math.ceil(clamp(sev * 1.3) * 3 - 0.001);
    s.neu.forEach((n, i) => {
      n.visible = i < nn && sev > 0.08;
      const u = (t * 0.04 + i / 3) % 1, x = 1.4 - u * 2.8;
      if (i === 0) n.position.set(x, Math.sin(2.4) * R * 0.9, Math.cos(2.4) * R * 0.9);
      else if (i === 1) n.position.set(x * 0.8 + 0.2, Math.sin(0.6) * (R + 0.14 * clamp(sev * 1.4)), Math.cos(0.6) * (R + 0.14 * clamp(sev * 1.4)));
      else n.position.set(x * 0.7 - 0.3, Math.sin(0.1) * (R + 0.34 * clamp(sev * 1.4)), Math.cos(0.1) * (R + 0.34 * clamp(sev * 1.4)));
      n.rotation.y = t * 0.3 + i;
    });
    /* the storm: each cytokine spirals out of the macrophages and washes round the vessel */
    const Wst = [[s.sw.tnf, 70, clamp((sev - 0.04) * 1.6), 0], [s.sw.il1, 60, clamp((sev - 0.06) * 1.5), 1.3], [s.sw.il6, 60, clamp((sev - 0.1) * 1.4), 2.6], [s.sw.il8, 46, clamp((sev - 0.15) * 1.3), 3.9], [s.sw.il10, 50, clamp((sev - 0.4) * 1.6), 5.2]];
    Wst.forEach(([sw, n, lvl, ph]) => {
      const c = Math.round(n * lvl); sw.count = c;
      for (let i = 0; i < c; i++) {
        const m = s.mP[i % 3], u = (t * (0.09 + 0.05 * (i % 5) / 5) + i / n + ph * 0.07) % 1, a = i * 2.17 + ph + t * 0.4, sw2 = Math.sin(u * 3.14);
        const tx = m.x + (i % 7 - 3) * 0.28, ty = (m.y > 0 ? 1 : -1) * R * 1.05;
        place(sw, i, lerp(m.x, tx, u) + Math.cos(a) * sw2 * 0.22, lerp(m.y, ty, u) + Math.sin(a) * sw2 * 0.18, m.z + Math.sin(a * 1.3) * sw2 * 0.35 + u * 0.15, sw.userData.size * (0.6 + 0.9 * sw2));
      }
      done(sw);
    });
  }

  /* ====================================================================== SCENE C: immune dysregulation (cells) */
  function septicCells() {
    const g = new T.Group(), rand = rng(53);
    /* left: hyperinflammation */
    const hot = new T.Group(); hot.position.set(-0.7, 0.35, 0); g.add(hot);
    const hm = blob(0.3, cellMat(0xe6a090, { transparent: true, opacity: 0.84, depthWrite: false }), 14, 0.14);
    tag(hm, "Hyperactive macrophage", "Early in sepsis the innate cells shout. Macrophages and neutrophils make TNF-alpha, IL-1 beta and IL-6, and NF-kappa B stays on. Fever, vasodilation, leak and organ injury follow. In a few patients ferritin rises to extreme levels, which looks like macrophage activation syndrome.", "Source control and antimicrobials. Hydrocortisone in vasopressor-dependent shock. Blocking one cytokine has not helped unselected patients.");
    hot.add(hm);
    const hn = blob(0.13, cellMat(0x6c4a8f, { roughness: 0.5 }), 6, 0.1); hn.scale.set(0.13 * 1.4, 0.13 * 0.9, 0.13 * 0.9); hot.add(hn);
    const spk = []; const spM = glow(W(0xff5a3c, { roughness: 0.35 }), 0xff5a3c, 0.3);
    for (let i = 0; i < 14; i++) { const u = 1 - 2 * (i + 0.5) / 14, a = i * 2.4, q = Math.sqrt(1 - u * u), d = V(q * Math.cos(a), u, q * Math.sin(a)); const c = new T.Mesh(new T.ConeGeometry(0.03, 0.12, 6), spM); c.position.copy(d.clone().multiplyScalar(0.3)); c.quaternion.setFromUnitVectors(Y, d); c.userData.d = d; hot.add(c); spk.push(c); }
    const hn2 = neutrophil(0.2, rand); hn2.position.set(-0.55, -0.12, 0.1); g.add(hn2);
    const nets = [], nM = W(0xf4f2ea, { transparent: true, opacity: 0.75, roughness: 0.6, clearcoat: 0.05 });
    for (let i = 0; i < 16; i++) { const s = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, 0.25 + rand() * 0.25, 4), nM); s.position.set(-0.55 + (rand() - 0.5) * 0.5, -0.12 + (rand() - 0.5) * 0.4, 0.1 + (rand() - 0.5) * 0.3); s.rotation.set(rand() * 3, rand() * 3, rand() * 3); tag(s, "Neutrophil extracellular trap", "DNA strands thrown out by neutrophils. They trap microbes but also injure the endothelium and feed micro clots.", ""); g.add(s); nets.push(s); }
    const pro = { tnf: swarm(30, 0xff5a3c, 0.028, "TNF-alpha", "Pro-inflammatory cytokine from activated macrophages.", ""), il6: swarm(26, 0xe04bb4, 0.03, "IL-6", "Pro-inflammatory messenger that tracks severity.", "") };
    g.add(pro.tnf); g.add(pro.il6);
    /* right: immune paralysis */
    const tc = new T.Group(); tc.position.set(0.62, 0.5, 0); g.add(tc);
    const tb = blob(0.2, cellMat(0xc5cfe0, { transparent: true, opacity: 0.85, depthWrite: false }), 18, 0.08);
    tag(tb, "Exhausted T cell", "Late in sepsis T cells make less interferon-gamma and divide poorly. PD-1 on the surface meets PD-L1 on other cells and tells them to stand down. Lymphopenia and exhausted T cells go with a higher risk of secondary infection.", "Checkpoint blockers and interferon-gamma are research tools in selected patients, not routine care.");
    tc.add(tb); const tn = blob(0.14, cellMat(0x4a3f7a, { roughness: 0.5 }), 3, 0.06); tc.add(tn);
    const pdM = glow(W(0xffc233, { roughness: 0.35 }), 0xffc233, 0.35), pd = [];
    for (let i = 0; i < 9; i++) { const u = 1 - 2 * (i + 0.5) / 9, a = i * 2.4 + 1, q = Math.sqrt(1 - u * u), d = V(q * Math.cos(a), u, q * Math.sin(a)); const m = sphere(0.032, pdM, 8); m.position.copy(d.clone().multiplyScalar(0.21)); tag(m, "PD-1", "The checkpoint receptor on exhausted T cells. It slows the cell when it meets PD-L1.", ""); tc.add(m); pd.push(m); }
    const mono = new T.Group(); mono.position.set(0.62, -0.02, 0.1); g.add(mono);
    const mb = blob(0.24, cellMat(0xd9c8b6, { transparent: true, opacity: 0.84, depthWrite: false }), 21, 0.1);
    tag(mb, "Monocyte with low HLA-DR", "HLA-DR is the surface molecule that shows antigens to T cells. Falling HLA-DR on monocytes marks immune paralysis. The monocyte makes less TNF-alpha and presents antigen poorly.", "HLA-DR is used in some centres as a research marker. It does not yet guide routine treatment.");
    mono.add(mb); const mn = blob(0.11, cellMat(0x6c4a8f, { roughness: 0.5 }), 11, 0.1); mn.scale.set(0.11 * 1.3, 0.11 * 0.9, 0.11 * 0.9); mono.add(mn);
    const hla = []; const hM = glow(W(0x35c2c8, { roughness: 0.3 }), 0x35c2c8, 0.2);
    for (let i = 0; i < 14; i++) { const u = 1 - 2 * (i + 0.5) / 14, a = i * 2.4, q = Math.sqrt(1 - u * u), d = V(q * Math.cos(a), u, q * Math.sin(a)); const y = ypin(hM); y.scale.setScalar(0.9); y.position.copy(d.clone().multiplyScalar(0.24)); y.quaternion.setFromUnitVectors(Y, d); y.children.forEach((c) => tag(c, "HLA-DR", "The antigen-presenting molecule. Fewer copies on the cell surface means weaker alerts to T cells.", "")); mono.add(y); hla.push(y); }
    const apo = [], aM = cellMat(0xb9a8a0, { roughness: 0.7 }), bM = cellMat(0xb9a8a0, { roughness: 0.7 }), dM = cellMat(0x2e2442, { roughness: 0.6 });
    [[0.2, 0.28, -0.12], [0.98, 0.3, -0.1], [0.98, -0.28, 0.0]].forEach((P, i) => {
      const a = new T.Group(); a.position.set(P[0], P[1], P[2]);
      const body = blob(0.15, aM, 30 + i, 0.2); tag(body, "Apoptotic lymphocyte", "Lymphocytes die in large numbers in sepsis, which is why the lymphocyte count falls. The cell shrinks, the nucleus condenses and the membrane breaks into blebs that macrophages remove.", "A persistent low lymphocyte count after day 4 goes with worse outcomes. It is a marker, not a treatment target.");
      a.add(body);
      const n = sphere(0.07, dM, 10); n.position.set(0.01, 0, 0.02); a.add(n);
      for (let j = 0; j < 6; j++) { const b = sphere(0.04 + 0.015 * (j % 3), bM, 8); const th = j * 1.05, ph = 0.5 + j * 0.4; b.position.set(Math.cos(th) * Math.sin(ph) * 0.16, Math.cos(ph) * 0.16, Math.sin(th) * Math.sin(ph) * 0.16); a.add(b); }
      g.add(a); apo.push(a);
    });
    const il10 = swarm(34, 0x5b7bff, 0.03, "IL-10", "The anti-inflammatory signal. It is released together with the pro-inflammatory ones and stays high later.", "");
    g.add(il10);
    /* balance beam */
    const base = new T.Mesh(new T.ConeGeometry(0.16, 0.32, 20), W(0x8a97a8, { roughness: 0.4, clearcoat: 0.5 })); base.position.set(0, -0.72, 0);
    tag(base, "Balance of the immune response", "Pro-inflammatory and anti-inflammatory responses start together. Early, the pro-inflammatory side outweighs the other. Later, the anti-inflammatory side catches up. Most patients carry both burdens at once and not a clean first phase and second phase.", "Do not rely on a single immune marker. Treat the infection, support the organs and look for new infection in a patient who is not recovering.");
    g.add(base);
    const beam = new T.Group(); beam.position.set(0, -0.5, 0); g.add(beam);
    const bar = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1.9, 10), W(0xb7c2d0, { roughness: 0.3, clearcoat: 0.6 })); bar.rotation.z = Math.PI / 2; beam.add(bar);
    const pans = [-1, 1].map((sg) => {
      const p = new T.Group(); const d = new T.Mesh(new T.CylinderGeometry(0.3, 0.26, 0.04, 28), W(sg < 0 ? 0xb0584a : 0x4a62b0, { roughness: 0.4, clearcoat: 0.6 }));
      tag(d, sg < 0 ? "Pro-inflammatory load" : "Anti-inflammatory load", sg < 0 ? "The pro-inflammatory load: TNF-alpha, IL-1 beta, IL-6, complement and neutrophil traps." : "The anti-inflammatory load: IL-10, regulatory T cells, apoptotic lymphocytes and low HLA-DR.", "");
      p.add(d); beam.add(p); p.userData.sg = sg; return p;
    });
    const piles = pans.map((p, si) => { const arr = [], col = si === 0 ? 0xff5a3c : 0x5b7bff, m = glow(W(col, { roughness: 0.25, clearcoat: 0.9 }), col, 0.35); for (let i = 0; i < 16; i++) { const s = sphere(0.045, m, 8); s.position.set((rand() - 0.5) * 0.36, 0.05 + Math.floor(i / 6) * 0.07, (rand() - 0.5) * 0.2); tag(s, si === 0 ? "Pro-inflammatory load" : "Anti-inflammatory load", "", ""); p.add(s); arr.push(s); } return arr; });
    g.userData = { hot, hm, spk, hn2, nets, pro, tc, tb, pd, mono, mb, hla, apo, il10, beam, pans, piles, base };
    return g;
  }

  function applyC(cs, sev, t) {
    if (!cs) return;
    const pro = clamp(sev * 2.2), antiW = clamp(0.1 + 1.0 * sev * sev), act = clamp(sev * 1.6);
    tint(cs.hm, 0xe6c9b6, 0xe58a72, act); cs.hm.scale.setScalar(0.3 * (1 + 0.1 * Math.sin(t * 2.4) * act + 0.12 * act));
    cs.spk.forEach((c) => { c.visible = sev > 0.08; c.scale.setScalar(clamp(act * 1.4, 0.2, 1.3)); });
    cs.nets.forEach((s, i) => { s.visible = i < 16 * clamp((sev - 0.25) * 1.5); });
    cs.hn2.visible = sev > 0.05;
    [[cs.pro.tnf, 30, 0], [cs.pro.il6, 26, 2]].forEach(([s, n, ph]) => {
      const c = Math.round(n * clamp(pro)); s.count = c;
      for (let i = 0; i < c; i++) { const u = (t * 0.13 + i / n + ph * 0.1) % 1, a = i * 2.4 + t * 0.3 + ph; place(s, i, -0.7 + Math.cos(a) * (0.25 + u * 0.4), 0.35 + u * 0.75 - 0.1, Math.sin(a) * (0.2 + u * 0.3), s.userData.size * (1.3 - u * 0.7)); }
      done(s);
    });
    /* paralysis: fewer HLA-DR, more PD-1, shrinking and dying lymphocytes, rising IL-10 */
    const para = clamp((sev - 0.05) * 1.2);
    cs.hla.forEach((y, i) => { y.visible = i < Math.round(14 * (1 - 0.85 * para)) + (para > 0.95 ? 0 : 0); });
    cs.pd.forEach((p, i) => { p.visible = i < Math.round(1 + 8 * para); });
    cs.tb.scale.setScalar(0.2 * (1 - 0.22 * para)); tint(cs.tb, 0xc5cfe0, 0x8d98ab, para);
    cs.mb.scale.setScalar(0.24 * (1 - 0.08 * para)); tint(cs.mb, 0xd9c8b6, 0xa29587, para * 0.7);
    cs.apo.forEach((a, i) => { const u = clamp((sev - 0.2 - i * 0.18) * 3.2); a.visible = u > 0.02; a.scale.setScalar(0.5 + 0.5 * u); a.rotation.y = t * 0.2 + i; });
    const n10 = Math.round(34 * clamp((sev - 0.15) * 1.4)); cs.il10.count = n10;
    for (let i = 0; i < n10; i++) { const u = (t * 0.1 + i / 34) % 1, a = i * 2.4 + t * 0.25; place(cs.il10, i, 0.62 + Math.cos(a) * (0.3 + u * 0.4), 0.2 + u * 0.8 - 0.2, Math.sin(a) * (0.2 + u * 0.3), cs.il10.userData.size * (1.3 - u * 0.7)); }
    done(cs.il10);
    /* the beam: pro side outweighs early, anti side catches up late, both are heavy at the end */
    const tilt = (pro * 0.9 - antiW) * 0.22, to = cs.beam.rotation.z;
    cs.beam.rotation.z = to + (tilt - to) * 0.08;
    const r = 0.95;
    cs.pans.forEach((p) => { const sg = p.userData.sg; p.position.set(sg * r * Math.cos(cs.beam.rotation.z), sg * r * Math.sin(cs.beam.rotation.z), 0); p.rotation.z = -cs.beam.rotation.z; });
    cs.piles[0].forEach((s, i) => { s.visible = i < Math.round(2 + 14 * clamp(pro)); });
    cs.piles[1].forEach((s, i) => { s.visible = i < Math.round(2 + 14 * antiW); });
  }

  /* the cells group is built once with the gross group: the storm scene hangs off the gross group */
  function gross(k, mat, spec) { const g = septicGross(k, mat, spec); buildStorm(g, mat); return g; }
  PathStage.register("septic", { gross: gross, cells: septicCells, apply: septicApply });
})();
