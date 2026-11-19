/* Extra photoreal organ models for Pathology Live.
   Registers pancreas, muscle, skin, bowel and bleed with the shared PathStage (sepsis/path-stage.js).
   Each plugin gives: gross(kit, mat, spec)  - the whole specimen
                      cells(kit, spec)       - the microscopic scene (tap "Cells")
                      apply(kit, entry, sev, nec, t, extra) - animates inflammation, oedema, necrosis, thrombosis.
   mat is the shared triplanar tissue material, so the healthy-to-diseased texture blend is automatic.
   Teaching text is original and needs clinical review. */
(function () {
  "use strict";
  if (!window.PathStage || !PathStage.register) return;
  const K = PathStage.kit, T = K.THREE, V = K.V, wet = K.wet, tag = K.tag, tube = K.tube, organic = K.organic, clamp = K.clamp;

  /* three r128 treats hex colours as linear and the stage outputs sRGB, which washes them out. Convert so the hex values read as written. */
  function W(color, o) {
    const c = new T.Color(color).convertSRGBToLinear();
    return wet(c.getHex(), Object.assign({ clearcoat: 0.25, clearcoatRoughness: 0.35 }, o || {}));
  }
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const C = (h) => new T.Color(h);
  function tint(mesh, a, b, u) { mesh.material.color.copy(C(a)).lerp(C(b), clamp(u)).convertSRGBToLinear(); }
  function onEllipsoid(c, r, rand) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2, q = Math.sqrt(1 - u * u);
    const d = V(q * Math.cos(a), u, q * Math.sin(a));
    return { p: V(c.x + d.x * r.x, c.y + d.y * r.y, c.z + d.z * r.z), n: V(d.x / r.x, d.y / r.y, d.z / r.z).normalize() };
  }
  function disc(rad, thick, mat) {
    const m = new T.Mesh(new T.SphereGeometry(1, 12, 9), mat);
    m.scale.set(rad, rad * thick * 2.5, rad * (0.7 + Math.random() * 0.5));
    m.userData.t0 = m.scale.y;
    return m;
  }
  function sphere(r, mat, seg) { return new T.Mesh(new T.SphereGeometry(r, seg || 12, Math.max(6, (seg || 12) - 4)), mat); }
  const Y = V(0, 1, 0);

  /* ---------- PANCREAS ---------- */
  function pancreasGross(k, mat) {
    const g = new T.Group(), ov = [], rand = rng(11);
    const parts = [
      [V(-0.95, -0.05, 0), V(0.62, 0.55, 0.4), 3, "Head", "Sits in the curve of the duodenum. Swelling here can obstruct the bile duct."],
      [V(0.1, 0.1, 0), V(1.0, 0.3, 0.27), 6, "Body", "Lies over the splenic vein and the aorta. Enzymes leak from its lobules into the fat."],
      [V(1.25, 0.3, -0.02), V(0.62, 0.24, 0.22), 9, "Tail", "Reaches the splenic hilum. Tail inflammation can thrombose the splenic vein."]
    ];
    const shapes = [];
    parts.forEach((P) => {
      const m = new T.Mesh(organic(56, 0.09, P[2]), mat);
      m.scale.copy(P[1]); m.position.copy(P[0]);
      tag(m, "Pancreas " + P[3].toLowerCase(), P[4], "Fluids, analgesia and early enteral feeding. Antibiotics only for proven infected necrosis.");
      g.add(m); shapes.push({ c: P[0], r: P[1] });
    });
    const duo = new T.Mesh(new T.TorusGeometry(0.8, 0.2, 16, 40, Math.PI * 1.35), W(0xb9795f, { roughness: 0.5, clearcoat: 0.3 }));
    duo.position.set(-0.95, -0.05, 0); duo.rotation.z = Math.PI * 0.325;
    tag(duo, "Duodenum", "The C-loop that wraps the head. Gallstones usually enter here through the ampulla.", "Look for a stone or alcohol as the cause.");
    g.add(duo);
    const sv = tube([V(-0.3, -0.18, -0.3), V(0.5, 0.0, -0.32), V(1.5, 0.28, -0.25)], 0.055, W(0x4b2a52, { roughness: 0.35 }), 20);
    tag(sv, "Splenic vein", "Runs behind the gland. Inflammation can clot it and cause left-sided portal hypertension.", "Rarely needs anticoagulation unless thrombosis is extensive.");
    g.add(sv);
    const plaqueMat = W(0xf3ecd6, { roughness: 0.75, clearcoat: 0.08 });
    const plaques = [];
    for (let i = 0; i < 36; i++) {
      const s = shapes[i % 3], e = onEllipsoid(s.c, s.r.clone().multiplyScalar(1.02 + (i > 24 ? 0.18 : 0)), rand);
      const d = disc(0.03 + rand() * 0.04, 0.14, plaqueMat);
      d.position.copy(e.p); d.quaternion.setFromUnitVectors(Y, e.n);
      tag(d, "Fat necrosis", "Lipase digests fat into fatty acids that bind calcium. The chalky white spots are calcium soaps.", "Falling calcium follows the soap formation.");
      g.add(d); plaques.push(d); ov.push(d);
    }
    const bleeds = [];
    const bMat = W(0x4a0b12, { roughness: 0.2, clearcoat: 0.9 });
    for (let i = 0; i < 7; i++) {
      const s = shapes[i % 3], e = onEllipsoid(s.c, s.r.clone().multiplyScalar(1.03), rand);
      const d = disc(0.09 + rand() * 0.1, 0.22, bMat);
      d.position.copy(e.p); d.quaternion.setFromUnitVectors(Y, e.n);
      tag(d, "Haemorrhage", "Enzymes erode small vessels. Dark red, wet patches mean bleeding into the gland.", "Haemorrhagic necrosis carries a worse outlook. Watch the haemoglobin.");
      g.add(d); bleeds.push(d); ov.push(d);
    }
    const fluid = new T.Mesh(new T.SphereGeometry(1, 36, 24), W(0xe6cd7c, { transparent: true, opacity: 0, roughness: 0.1, clearcoat: 1, depthWrite: false }));
    fluid.scale.set(2.0, 0.85, 0.75); fluid.position.set(0.1, 0.05, 0.02);
    tag(fluid, "Peripancreatic fluid", "Inflammatory fluid collects around the gland and tracks along the retroperitoneum. It is sterile unless it becomes infected.", "Most acute collections settle. Drain only if infected or symptomatic.");
    g.add(fluid); ov.push(fluid);
    g.rotation.z = -0.12;
    g.userData = { plaques, bleeds, fluid, ov, shapes, parts: g.children.filter((c) => c.isMesh).slice(0, 3) };
    return g;
  }

  function pancreasCells() {
    const g = new T.Group(), cells = [], grans = [], neut = [], fat = [];
    const N = 9;
    const lumen = sphere(0.2, W(0x3a1f1a, { roughness: 0.6 }), 14);
    tag(lumen, "Acinar lumen", "Digestive enzymes leave through the duct. In pancreatitis they are released the wrong way, into the tissue.", "Nothing blocks the lumen itself. The problem is activation inside the cell.");
    g.add(lumen);
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, dir = V(Math.cos(a), Math.sin(a), 0);
      const c = new T.Mesh(new T.SphereGeometry(1, 22, 16), W(0xb8714f, { roughness: 0.5, clearcoat: 0.3 }));
      c.scale.set(0.46, 0.27, 0.3); c.rotation.z = a; c.position.copy(dir).multiplyScalar(0.8);
      c.userData.home = c.position.clone();
      tag(c, "Acinar cell", "Packed with enzyme granules. Injury makes enzymes activate inside the cell, so the cell digests itself.", "Treatment is supportive. There is no drug that stops the cascade once it starts.");
      g.add(c); cells.push(c);
      const nuc = sphere(0.09, W(0x6a4a7e, { roughness: 0.4 }), 10);
      nuc.position.copy(dir).multiplyScalar(1.02); g.add(nuc); c.userData.nuc = nuc;
      for (let j = 0; j < 3; j++) {
        const gr = sphere(0.05, W(0xe0902e, { roughness: 0.3, clearcoat: 0.8 }), 10);
        const off = (j - 1) * 0.1;
        gr.userData.dir = dir.clone(); gr.userData.perp = V(-dir.y, dir.x, 0).multiplyScalar(off); gr.userData.z = (j % 2 ? 0.06 : -0.06);
        tag(gr, "Zymogen granule", "Stores inactive enzymes. Early in pancreatitis granules fuse with lysosomes and trypsin switches on.", "Stopping alcohol or removing a stone removes the trigger, not the activated enzymes.");
        g.add(gr); grans.push(gr);
      }
    }
    const cap = new T.Mesh(new T.TorusGeometry(1.42, 0.06, 10, 60), W(0x9a1d2c, { transparent: true, opacity: 0.75, roughness: 0.3 }));
    tag(cap, "Capillary", "Leaky capillaries let fluid and neutrophils reach the acinus. The loss of fluid causes the shock of pancreatitis.", "Early goal-directed fluids, balanced crystalloid.");
    g.add(cap);
    for (let i = 0; i < 6; i++) {
      const n = sphere(0.12, W(0xdcd6e6, { roughness: 0.5 }), 12);
      for (let j = 0; j < 3; j++) { const lobe = sphere(0.055, W(0x6a4a8a, { roughness: 0.4 }), 8); lobe.position.set((j - 1) * 0.07, (j % 2) * 0.04, 0.09); n.add(lobe); }
      n.userData.a = i / 6 * Math.PI * 2 + 0.3;
      tag(n, "Neutrophil", "Neutrophils arrive within hours and amplify injury with oxidants and proteases.", "Systemic inflammation (SIRS) drives the early organ failure.");
      g.add(n); neut.push(n);
    }
    for (let i = 0; i < 7; i++) {
      const f = sphere(0.085, W(0xf6f0dc, { roughness: 0.3, clearcoat: 0.6 }), 10);
      const a = i / 7 * Math.PI * 2 + 0.5;
      f.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0.1);
      tag(f, "Fat necrosis droplet", "Free fatty acids bind calcium to form soaps, which is why serum calcium falls.", "Check calcium and magnesium. Replace if symptomatic or QT is long.");
      g.add(f); fat.push(f);
    }
    g.userData = { cells, grans, neut, fat, cap };
    return g;
  }

  function pancreasApply(k, e, sev, nec, t) {
    const gr = e.organ.userData, cut = e.view === "cut";
    gr.parts.forEach((m, i) => { m.scale.set(gr.shapes[i].r.x * (1 + 0.1 * sev), gr.shapes[i].r.y * (1 + 0.32 * sev), gr.shapes[i].r.z * (1 + 0.32 * sev)); });
    gr.plaques.forEach((p, i) => { p.visible = !cut && nec * 1.2 > i / gr.plaques.length; p.scale.y = p.userData.t0 * (0.7 + 0.5 * Math.min(1, nec * 1.4)); });
    gr.bleeds.forEach((p, i) => { p.visible = !cut && sev > 0.35 + i * 0.07; });
    gr.fluid.visible = !cut; gr.fluid.material.opacity = 0.34 * sev;
    const cs = e.cells.userData;
    cs.cells.forEach((c, i) => {
      const dead = nec > 0.45;
      c.scale.set(0.46 * (1 + 0.3 * sev) * (dead ? 1 - 0.25 * nec : 1), 0.27 * (1 + 0.45 * sev), 0.3 * (1 + 0.3 * sev));
      tint(c, 0xb8714f, 0x6f5a50, nec);
      c.userData.nuc.scale.setScalar(1 - 0.5 * nec);
    });
    cs.grans.forEach((gm, i) => {
      const u = clamp(sev * 1.15 - (i % 3) * 0.06);
      const rr = 0.56 + u * 1.15 + Math.sin(t * 1.2 + i) * 0.02 * u;
      gm.position.copy(gm.userData.dir).multiplyScalar(rr).add(gm.userData.perp);
      gm.position.z = gm.userData.z + u * (i % 2 ? 0.2 : -0.2);
      gm.scale.setScalar(1 + 0.5 * u);
      tint(gm, 0xe0902e, 0xff4a22, u);
    });
    cs.neut.forEach((n, i) => {
      n.visible = sev > i / 7;
      const a = n.userData.a + t * 0.12, rr = 2.05 - 0.75 * sev;
      n.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.15);
    });
    cs.fat.forEach((f, i) => { f.visible = nec > i / 8; });
    cs.cap.material.opacity = 0.75 - 0.25 * sev;
  }

  /* ---------- MUSCLE ---------- */
  function muscleGross(k, mat) {
    const g = new T.Group(), ov = [], rand = rng(5);
    const pts = [];
    for (let i = 0; i <= 28; i++) { const u = i / 28; pts.push(new T.Vector2(0.03 + 0.52 * Math.pow(Math.sin(Math.PI * u), 0.72), -1.5 + 3 * u)); }
    const geo = new T.LatheGeometry(pts, 64), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i), y = pa.getY(i), ang = Math.atan2(z, x);
      const r = Math.hypot(x, z), f = 1 + 0.035 * Math.sin(ang * 13 + y * 1.3) + 0.02 * (K.fbm(x * 3, y * 2, z * 3) - 0.5);
      pa.setXYZ(i, x / (r || 1) * r * f, y, z / (r || 1) * r * f);
    }
    geo.computeVertexNormals();
    const belly = new T.Mesh(geo, mat);
    tag(belly, "Muscle belly", "Fibres run in bundles inside a tight fascial sleeve. Swelling has nowhere to go.", "Fluids, treat the cause, check the compartment if tense.");
    g.add(belly);
    const tMat = W(0xeadfcb, { roughness: 0.45, clearcoat: 0.5 });
    [-1, 1].forEach((s) => {
      const tn = new T.Mesh(new T.CylinderGeometry(0.1, 0.16, 0.9, 16), tMat);
      tn.position.y = s * 1.8; tn.rotation.z = s > 0 ? Math.PI : 0;
      tag(tn, "Tendon", "Collagen that survives the injury. Muscle fibres regenerate from satellite cells.", "Muscle recovers over weeks if the kidney is protected.");
      g.add(tn);
    });
    const fascia = new T.Mesh(new T.LatheGeometry(pts.map((p) => new T.Vector2(p.x * 1.07 + 0.02, p.y)), 40), W(0xf2eadd, { transparent: true, opacity: 0.2, roughness: 0.3, side: T.DoubleSide, depthWrite: false }));
    tag(fascia, "Fascia", "A tight sleeve. Pressure inside it rises with oedema and compromises perfusion.", "Fasciotomy only when compartment pressures or the clinical picture demand it.");
    g.add(fascia); ov.push(fascia);
    const vein = tube([V(0.62, -1.7, 0.1), V(0.64, 0, 0.1), V(0.6, 1.7, 0.1)], 0.045, W(0x5a2a52, { roughness: 0.3 }), 20);
    const art = tube([V(0.6, -1.7, -0.08), V(0.62, 0, -0.08), V(0.58, 1.7, -0.08)], 0.04, W(0xb04448, { roughness: 0.3 }), 20);
    g.add(vein); g.add(art); ov.push(vein, art);
    const drops = [], dMat = W(0x4a2410, { roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 9; i++) { const d = sphere(0.06 + rand() * 0.04, dMat, 10); d.userData.s = rand(); d.userData.x = (rand() - 0.5) * 0.9; d.userData.z = (rand() - 0.5) * 0.6; g.add(d); drops.push(d); ov.push(d); }
    g.rotation.z = Math.PI / 2;
    g.userData = { belly, pts, fascia, drops, ov };
    return g;
  }

  function muscleCells() {
    const g = new T.Group(), bands = [], mitos = [], myo = [], ca = [], tears = [];
    const fibre = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 2.3, 32), W(0xc4545a, { roughness: 0.45, clearcoat: 0.3 }));
    fibre.rotation.z = Math.PI / 2;
    tag(fibre, "Muscle fibre", "A long multinucleate cell packed with sarcomeres. Sustained contraction uses up ATP and the cell cannot pump calcium out.", "Early fluids protect the kidney from the myoglobin that leaks.");
    g.add(fibre);
    for (let i = 0; i < 18; i++) {
      const b = new T.Mesh(new T.CylinderGeometry(0.405, 0.405, 0.07, 28), W(i % 2 ? 0x8f2e3c : 0xe6a4a6, { roughness: 0.4 }));
      b.rotation.z = Math.PI / 2; b.position.x = -1.1 + i * 0.13; b.userData.x0 = b.position.x;
      g.add(b); bands.push(b);
    }
    const sl = new T.Mesh(new T.CylinderGeometry(0.44, 0.44, 2.3, 32, 1, true), W(0xf2d7d2, { transparent: true, opacity: 0.22, roughness: 0.2, side: T.DoubleSide, depthWrite: false }));
    sl.rotation.z = Math.PI / 2;
    tag(sl, "Sarcolemma", "The cell membrane. Heat, ATP failure and calcium overload make it leak and tear.", "Once it is torn, CK and myoglobin reach the blood.");
    g.add(sl);
    for (let i = 0; i < 6; i++) {
      const n = sphere(0.07, W(0x6b4a7a, { roughness: 0.4 }), 10); n.scale.set(1.8, 0.7, 0.7);
      const a = 0.5 + i * 0.35; n.position.set(-0.9 + i * 0.36, Math.sin(a) * 0.41, Math.cos(a) * 0.41);
      tag(n, "Nucleus", "Muscle nuclei sit at the edge. Satellite cells next to them rebuild the fibre after injury.", "");
      g.add(n);
    }
    for (let i = 0; i < 8; i++) {
      const m = sphere(0.07, W(0xd06a40, { roughness: 0.35 }), 10); m.scale.set(1.6, 0.7, 0.7);
      m.position.set(-0.95 + i * 0.27, -0.2, 0.2);
      tag(m, "Mitochondrion", "Swells as calcium floods in and ATP production fails.", "Cooling and stopping the seizure stop the energy drain.");
      g.add(m); mitos.push(m);
    }
    const rand = rng(21);
    for (let i = 0; i < 24; i++) {
      const m = sphere(0.045, W(0x7a3b1c, { roughness: 0.2, clearcoat: 0.9 }), 8);
      m.userData.a = rand() * Math.PI * 2; m.userData.x = -1 + rand() * 2; m.userData.r = 0.05 + rand() * 0.2; m.userData.k = rand();
      tag(m, "Myoglobin", "The red-brown pigment of muscle. In the blood it blocks tubules and turns urine tea-coloured.", "Fluids to keep urine flowing. Check potassium and creatinine often.");
      g.add(m); myo.push(m);
    }
    for (let i = 0; i < 14; i++) {
      const c = sphere(0.035, W(0x4fd0ff, { emissive: 0x0e5a80, emissiveIntensity: 0.6, roughness: 0.2 }), 8);
      c.userData.a = rand() * Math.PI * 2; c.userData.x = -1 + rand() * 2;
      tag(c, "Calcium", "Cytosolic calcium rises when pumps fail. It activates proteases and locks the sarcomere in contraction.", "Hypocalcaemia early in rhabdomyolysis is usually not treated, because calcium returns.");
      g.add(c); ca.push(c);
    }
    for (let i = 0; i < 5; i++) {
      const tr = sphere(0.075, W(0x1d0808, { roughness: 0.5 }), 8); tr.scale.set(1.2, 0.5, 1.2);
      const a = 1.3 + i * 1.1; tr.userData.a = a; tr.userData.x = -0.9 + i * 0.45;
      tr.position.set(tr.userData.x, Math.sin(a) * 0.43, Math.cos(a) * 0.43);
      tag(tr, "Membrane tear", "A gap in the sarcolemma. Contents of the cell spill out.", "");
      g.add(tr); tears.push(tr);
    }
    g.userData = { fibre, bands, mitos, myo, ca, tears, sl };
    return g;
  }

  function muscleApply(k, e, sev, nec, t) {
    const gr = e.organ.userData, cut = e.view === "cut";
    gr.belly.scale.set(1 + 0.28 * sev, 1 - 0.02 * sev, 1 + 0.28 * sev);
    gr.fascia.visible = !cut; gr.fascia.material.opacity = 0.2 + 0.25 * sev;
    gr.ov.forEach((o) => { if (cut) o.visible = false; else if (!gr.drops.includes(o)) o.visible = true; });
    gr.drops.forEach((d) => {
      d.visible = !cut && nec > 0.15;
      const u = (t * 0.15 + d.userData.s) % 1;
      d.position.set(-(0.62 + u * 0.7), d.userData.x * 1.3, d.userData.z * 0.5);
      d.scale.setScalar(0.5 + nec * 0.9 * (1 - 0.5 * u));
    });
    const cs = e.cells.userData;
    cs.bands.forEach((b) => { b.scale.y = 1 - 0.4 * sev * (0.6 + 0.4 * Math.sin(t * 2 + b.userData.x * 4) * 0.2 + 0.4); });
    cs.mitos.forEach((m) => m.scale.set(1.6 + 1.6 * sev, 0.7 + 1.2 * sev, 0.7 + 1.2 * sev));
    cs.ca.forEach((c, i) => { c.scale.setScalar(0.4 + 1.2 * sev); c.visible = sev > 0.08; c.position.set(c.userData.x + Math.sin(t + i) * 0.04, Math.sin(c.userData.a + t * 0.3) * 0.26, Math.cos(c.userData.a + t * 0.3) * 0.26); });
    cs.tears.forEach((tr, i) => { tr.visible = nec > 0.12 + i * 0.12; });
    cs.myo.forEach((m) => {
      const out = nec > 0.1 ? clamp((nec - 0.1) * 1.4 * (0.4 + m.userData.k)) : 0;
      const r = m.userData.r + out * (0.35 + 0.9 * m.userData.k);
      m.position.set(m.userData.x + Math.sin(t * 0.7 + m.userData.a) * 0.03, Math.sin(m.userData.a) * r, Math.cos(m.userData.a) * r);
      m.visible = sev > 0.12;
    });
    cs.sl.material.opacity = 0.22 - 0.12 * nec;
    tint(cs.fibre, 0xc4545a, 0x8a4a3a, nec);
  }

  /* ---------- SKIN / LIMB ---------- */
  function skinGross(k, mat) {
    const g = new T.Group(), rand = rng(31);
    const prof = (u) => 0.34 + 0.3 * Math.pow(Math.sin(Math.PI * (0.18 + 0.7 * u)), 0.9) + 0.05 * Math.sin(u * 9);
    const pts = [];
    pts.push(new T.Vector2(0.001, -1.55));
    for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push(new T.Vector2(prof(u) * (0.35 + 0.65 * Math.min(1, (i + 2) / 5)) * (i > 26 ? 0.4 + 0.6 * (30 - i) / 4 : 1), -1.5 + 3 * u)); }
    pts.push(new T.Vector2(0.001, 1.55));
    const geo = new T.LatheGeometry(pts, 64), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), d = 1 + 0.03 * (K.fbm(x * 2, y * 2, z * 2) - 0.5); pa.setXYZ(i, x * d, y, z * d); }
    geo.computeVertexNormals();
    const limb = new T.Mesh(geo, mat);
    tag(limb, "Skin of the limb", "Epidermis, dermis and fat. Skin has a rich superficial plexus, so it shows microvascular failure early.", "Mark the margins and photograph daily to follow spread.");
    g.add(limb);
    const radiusAt = (y) => { const u = (y + 1.5) / 3; const i = Math.max(0, Math.min(30, Math.round(u * 30))); return pts[i + 1].x * 1.005; };
    const lesions = [], pet = [];
    const lMat = W(0x3a0f2c, { roughness: 0.25, clearcoat: 0.9 });
    for (let i = 0; i < 22; i++) {
      const y = -1.1 + rand() * 2.2, a = rand() * Math.PI * 2, r = radiusAt(y);
      const grp = new T.Group();
      const n = V(Math.cos(a), 0, Math.sin(a));
      for (let j = 0; j < 3; j++) { const lobe = sphere(1, lMat, 12); lobe.scale.set(0.05 + rand() * 0.06, 0.05, 0.04 + rand() * 0.06); lobe.position.set((rand() - 0.5) * 0.14, 0, (rand() - 0.5) * 0.14); grp.add(lobe); }
      grp.position.set(Math.cos(a) * r, y, Math.sin(a) * r); grp.quaternion.setFromUnitVectors(Y, n);
      grp.userData.i = i; grp.children.forEach((c) => tag(c, "Purpura", "Purple skin from bleeding or small-vessel occlusion. It does not blanch on pressure.", "Retiform (net-like) purpura means vessel occlusion: think DIC, purpura fulminans, vasculitis."));
      limb.add(grp); lesions.push(grp);
    }
    const pMat = W(0xa01820, { roughness: 0.3 });
    for (let i = 0; i < 60; i++) {
      const y = -1.2 + rand() * 2.4, a = rand() * Math.PI * 2, r = radiusAt(y);
      const p = sphere(0.016, pMat, 6); p.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      tag(p, "Petechia", "Pinpoint bleeding from capillaries. Low platelets or damaged endothelium.", "Check the platelet count and coagulation.");
      limb.add(p); pet.push(p);
    }
    const bullae = [];
    for (let i = 0; i < 4; i++) {
      const y = -0.6 + i * 0.45, a = 0.8 + i * 1.5, r = radiusAt(y);
      const b = sphere(0.1, W(0x5a0f1a, { transparent: true, opacity: 0.8, roughness: 0.08, clearcoat: 1 }), 14); b.scale.set(1, 0.6, 1);
      b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); b.quaternion.setFromUnitVectors(Y, V(Math.cos(a), 0, Math.sin(a)));
      tag(b, "Haemorrhagic bulla", "The epidermis lifts off necrotic dermis. The blister is filled with blood-stained fluid.", "Debride only once the line of demarcation is clear.");
      limb.add(b); bullae.push(b);
    }
    g.rotation.z = Math.PI / 2;
    g.userData = { limb, lesions, pet, bullae, lMat };
    return g;
  }

  function skinCells() {
    const g = new T.Group(), clots = [], rbcs = [], ep = [];
    const lay = [[0.06, 0.2, 0xe9cdb4, "Epidermis", "Keratinocytes lose their blood supply and die first. The surface darkens and may blister."],
                 [0.3, -0.06, 0xd9877e, "Dermis", "Small vessels of the superficial plexus. In purpura fulminans they fill with thrombi."],
                 [0.38, -0.46, 0xf0d9a0, "Subcutaneous fat", "Fat necrosis follows if thrombosis extends deeper."]];
    lay.forEach((L, i) => {
      const m = new T.Mesh(new T.BoxGeometry(2.6, L[0], 1.5), W(L[2], { roughness: 0.5, clearcoat: 0.25 }));
      m.position.y = L[1]; tag(m, L[3], L[4], "Early treatment of the cause saves skin. Established necrosis needs debridement.");
      g.add(m); if (i === 0) g.userData.epi = m; if (i === 1) g.userData.derm = m;
    });
    const wall = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 2.5, 24, 1, true), W(0xf0c0b8, { transparent: true, opacity: 0.45, side: T.DoubleSide, roughness: 0.3, depthWrite: false }));
    wall.rotation.z = Math.PI / 2; wall.position.set(0, -0.06, 0.1);
    tag(wall, "Dermal vessel", "A small vessel in the dermis. Endothelial tissue factor and low protein C let it clot.", "Protein C concentrate is used in selected purpura fulminans. Specialist decision.");
    g.add(wall);
    for (let i = 0; i < 7; i++) {
      const c = sphere(0.17, W(0x5a2a5e, { roughness: 0.35, clearcoat: 0.6 }), 14); c.scale.set(1.5, 1, 1);
      c.position.set(-0.9 + i * 0.3, -0.06, 0.1); c.userData.x = c.position.x;
      tag(c, "Microthrombus", "Fibrin and platelets plug the lumen. The skin downstream is starved of blood.", "Treat the trigger. Anticoagulation is for a specialist to weigh against bleeding.");
      g.add(c); clots.push(c);
    }
    const rand = rng(8), rb = K.rbcGeo();
    for (let i = 0; i < 24; i++) {
      const r = new T.Mesh(rb, W(0x9a1d2c, { roughness: 0.3 }));
      r.scale.setScalar(0.18); r.userData.x = -1.1 + rand() * 2.2; r.userData.y = -0.06 + (rand() - 0.5) * 0.3; r.userData.z = 0.1 + (rand() - 0.5) * 0.4; r.userData.k = rand();
      r.position.set(r.userData.x, r.userData.y, r.userData.z); r.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      tag(r, "Red cell", "Red cells leak into the dermis through damaged walls. That is the purple colour of purpura.", "");
      g.add(r); rbcs.push(r);
    }
    g.userData.clots = clots; g.userData.rbcs = rbcs; g.userData.wall = wall;
    return g;
  }

  function skinApply(k, e, sev, nec, t) {
    const gr = e.organ.userData, cut = e.view === "cut";
    gr.lesions.forEach((l, i) => { const u = clamp(sev * 1.4 - i * 0.02); l.visible = !cut && u > 0.02; l.scale.setScalar(0.4 + 0.9 * u); });
    gr.lMat.color.copy(C(0x3a0f2c)).lerp(C(0x120508), nec).convertSRGBToLinear();
    gr.pet.forEach((p, i) => { p.visible = !cut && sev > i / 70; });
    gr.bullae.forEach((b, i) => { b.visible = !cut && nec > 0.25 + i * 0.15; });
    const cs = e.cells.userData;
    cs.clots.forEach((c, i) => { c.visible = sev > i / 8; c.scale.set(1.5 * (0.6 + 0.6 * sev), 1 + 0.2 * sev, 1 + 0.2 * sev); });
    cs.rbcs.forEach((r, i) => {
      const out = clamp(sev * 1.2 * (0.4 + r.userData.k));
      r.position.set(r.userData.x, r.userData.y - out * (0.25 + 0.35 * r.userData.k), r.userData.z + out * 0.45 * (r.userData.k - 0.3));
      r.rotation.y += 0.004;
    });
    tint(cs.epi, 0xe9cdb4, 0x4a2a2e, nec); tint(cs.derm, 0xd9877e, 0x7a2a4a, sev * 0.8);
    cs.wall.material.opacity = 0.45 - 0.2 * sev;
  }

  /* ---------- BOWEL ---------- */
  function bowelGross(k, mat) {
    const g = new T.Group(), ov = [];
    const pts = [V(-1.7, 0.7, 0), V(-1.0, 0.95, 0.15), V(-0.2, 0.55, -0.1), V(0.5, 0.9, 0.1), V(1.3, 0.55, 0), V(1.6, 0.0, 0.1), V(0.9, -0.3, -0.1), V(0.1, 0.05, 0.12), V(-0.6, -0.35, 0), V(-1.4, -0.2, 0.1), V(-1.55, -0.8, -0.05), V(-0.7, -1.0, 0.1), V(0.2, -0.7, 0), V(1.0, -0.95, 0.05)];
    const curve = new T.CatmullRomCurve3(pts);
    const loop = new T.Mesh(new T.TubeGeometry(curve, 180, 0.17, 20, false), mat);
    tag(loop, "Small bowel", "Pink, glistening and peristaltic when healthy. The wall needs good flow and a normal intra-abdominal pressure.", "Perfusion pressure equals mean arterial pressure minus intra-abdominal pressure.");
    g.add(loop);
    const all = curve.getPoints(180);
    const seg = all.slice(60, 110);
    const isch = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(seg), 70, 0.185, 20, false), W(0x3a0f28, { roughness: 0.18, clearcoat: 0.95, transparent: true, opacity: 0 }));
    tag(isch, "Ischaemic segment", "Dusky, purple-black and dull. The mucosa dies first, then the full wall. Perforation follows.", "Surgical review. Early resection of non-viable bowel.");
    g.add(isch); ov.push(isch);
    const mes = new T.Mesh(new T.PlaneGeometry(3.6, 0.9, 24, 4), W(0xf1dfa8, { transparent: true, opacity: 0.55, roughness: 0.6, side: T.DoubleSide, depthWrite: false }));
    mes.position.set(0, 0.1, -0.35);
    tag(mes, "Mesentery", "The fatty fold that carries the vessels. Oedema thickens it.", "");
    g.add(mes); ov.push(mes);
    const sma = tube([V(-0.2, 1.35, -0.3), V(0.0, 0.5, -0.33), V(0.15, -0.4, -0.3)], 0.06, W(0xb04448, { roughness: 0.3 }), 18);
    tag(sma, "Mesenteric artery", "Flow falls when cardiac output is low, vasopressors constrict it or an embolus lodges. Non-occlusive ischaemia is common in critical illness.", "Avoid unnecessary high-dose vasoconstrictors. CT angiography if suspected.");
    g.add(sma); ov.push(sma);
    for (let i = 0; i < 6; i++) { const y = 0.8 - i * 0.28; const br = tube([V(0.05, 0.9 - i * 0.2, -0.32), V(0.4 * (i % 2 ? -1 : 1) * 1.2, y, -0.2), V(0.8 * (i % 2 ? -1 : 1) * 1.1, y + 0.3, -0.05)], 0.02, W(0xb04448, { roughness: 0.3 }), 10); g.add(br); ov.push(br); }
    const fib = [];
    const fMat = W(0xf3e6c8, { roughness: 0.7, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 10; i++) {
      const p = all[60 + Math.floor(i * 5)], d = disc(0.06, 0.2, fMat); d.position.copy(p).add(V(0, 0.17, 0.05)); d.visible = false;
      tag(d, "Fibrin exudate", "A yellow film on the serosa from inflammation of the wall.", "");
      g.add(d); fib.push(d); ov.push(d);
    }
    g.userData = { loop, isch, mes, fib, ov, base: 0.17 };
    return g;
  }

  function bowelCells() {
    const g = new T.Group(), epi = [], bac = [], neut = [], gas = [];
    function villus(x, h, w) {
      const grp = new T.Group();
      const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(new T.Vector2(w * (0.3 + 0.7 * Math.sin(Math.PI * (0.18 + 0.7 * (1 - u)))) * (u > 0.93 ? 0.5 : 1), -h / 2 + u * h)); }
      const body = new T.Mesh(new T.LatheGeometry(pts, 28), W(0xe9b79e, { roughness: 0.5, clearcoat: 0.3 }));
      tag(body, "Villus", "A finger of mucosa with a capillary and a lacteal. The tip is the farthest point from the blood supply, so it dies first.", "Restore perfusion early. Enteral feeding at low volume supports the mucosa once stable.");
      grp.add(body);
      const cap = tube([V(0, -h / 2, 0), V(0.02, 0, 0), V(0, h / 2 - 0.1, 0)], 0.045, W(0xb23a44, { roughness: 0.3 }), 14);
      tag(cap, "Villus capillary", "Counter-current flow makes the tip hypoxic even in health. Low flow makes it worse.", "");
      grp.add(cap);
      for (let i = 0; i < 28; i++) {
        const u = i / 28, y = -h / 2 + 0.1 + u * (h - 0.15), a = i * 2.4, rr = w * (0.3 + 0.7 * Math.sin(Math.PI * (0.18 + 0.7 * (1 - (y + h / 2) / h)))) + 0.03;
        const c = sphere(0.055, W(0xf2d3bb, { roughness: 0.45 }), 8); c.scale.set(0.8, 1.3, 0.8);
        c.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
        c.userData.u = u; c.userData.home = c.position.clone();
        tag(c, "Enterocyte", "The absorbing epithelial cell and part of the gut barrier. Tips are shed first when blood flow falls.", "Loss of barrier lets bacteria and toxins cross into the blood.");
        grp.add(c); epi.push(c);
      }
      grp.position.x = x;
      g.add(grp);
      return grp;
    }
    villus(0, 1.9, 0.38); villus(-1.0, 1.4, 0.28); villus(1.0, 1.5, 0.3);
    g.userData.main = g.children[0];
    const base = new T.Mesh(new T.BoxGeometry(3.2, 0.25, 1.0), W(0xd9877e, { roughness: 0.5 }));
    base.position.y = -1.1;
    tag(base, "Submucosa", "Where bacteria arrive once the barrier fails.", "");
    g.add(base);
    const rand = rng(41);
    for (let i = 0; i < 14; i++) {
      const b = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.09, 6), W(0x7bd66b, { roughness: 0.4 }));
      b.userData.x = -1.3 + rand() * 2.6; b.userData.y = 0.6 + rand() * 0.5; b.userData.k = rand(); b.rotation.z = rand() * 3;
      tag(b, "Gut bacterium", "Translocation of gut bacteria and toxins feeds sepsis and organ failure.", "Source control. Antibiotics guided by cultures.");
      g.add(b); bac.push(b);
    }
    for (let i = 0; i < 4; i++) {
      const n = sphere(0.1, W(0xdcd6e6, { roughness: 0.5 }), 10); n.userData.x = -1 + i * 0.7;
      tag(n, "Neutrophil", "Recruited to the damaged mucosa.", ""); g.add(n); neut.push(n);
    }
    for (let i = 0; i < 5; i++) {
      const b = sphere(0.07, W(0xdff3f8, { transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1 }), 12);
      b.position.set(-1.2 + i * 0.55, -0.85, 0.1);
      tag(b, "Gas in the wall", "Pneumatosis: gas from bacteria dissecting into dead bowel wall. An ominous sign on CT.", "Urgent surgical review.");
      g.add(b); gas.push(b);
    }
    g.userData.epi = epi; g.userData.bac = bac; g.userData.neut = neut; g.userData.gas = gas;
    return g;
  }

  function bowelApply(k, e, sev, nec, t) {
    const gr = e.organ.userData, cut = e.view === "cut";
    gr.isch.visible = !cut; gr.isch.material.opacity = clamp(nec * 1.3);
    gr.loop.scale.set(1, 1, 1);
    gr.fib.forEach((f, i) => { f.visible = !cut && nec > 0.3 + i * 0.05; });
    gr.mes.material.opacity = 0.55 + 0.25 * sev;
    const cs = e.cells.userData;
    cs.epi.forEach((c) => { const lost = clamp(nec * 1.5 - (1 - c.userData.u) * 0.4); c.visible = lost < c.userData.u * 0.9 + 0.1 || nec < 0.05; c.scale.setScalar(1 + 0.3 * sev); });
    cs.main.scale.y = 1 - 0.18 * nec;
    cs.bac.forEach((b, i) => { b.visible = nec > 0.2; const d = clamp((nec - 0.2) * 1.3 * (0.4 + b.userData.k)); b.position.set(b.userData.x + Math.sin(t + i) * 0.05, b.userData.y - d * 1.4, 0.1 + Math.cos(t * 0.5 + i) * 0.1); });
    cs.neut.forEach((n, i) => { n.visible = sev > 0.25 + i * 0.1; n.position.set(n.userData.x + Math.sin(t * 0.4 + i) * 0.1, -0.4 - 0.3 * Math.sin(t * 0.3 + i), 0.15); });
    cs.gas.forEach((g2, i) => { g2.visible = nec > 0.7 + i * 0.04; });
  }

  /* ---------- BLEED (soft tissue haemorrhage + endothelial gap) ---------- */
  function bleedGross(k, mat) {
    const g = new T.Group(), ov = [], rand = rng(77);
    const mass = new T.Mesh(organic(64, 0.05, 7), mat);
    mass.scale.set(1.45, 0.85, 0.85);
    tag(mass, "Soft tissue", "Muscle and fat with a normal blood supply. Without clotting factors and platelets, small injuries bleed freely.", "Replace what is missing only if bleeding or a procedure demands it.");
    g.add(mass);
    const hMat = W(0x4a0a12, { roughness: 0.14, clearcoat: 1 });
    const hem = [];
    [[V(0.35, 0.35, 0.55), 0.5], [V(-0.7, -0.1, 0.55), 0.38], [V(0.9, -0.2, 0.4), 0.3]].forEach((P, i) => {
      const h = sphere(P[1], hMat, 28); h.scale.set(1.2, 0.8, 0.5); h.position.copy(P[0]); h.userData.base = P[1];
      tag(h, "Haematoma", "Blood pooling in the tissue. In DIC it keeps spreading because there is nothing to seal the vessels.", "Treat the trigger. Platelets, cryoprecipitate and plasma when bleeding or going for a procedure.");
      g.add(h); hem.push(h); ov.push(h);
    });
    const pet = [], pMat = W(0xa01820, { roughness: 0.3 });
    for (let i = 0; i < 70; i++) {
      const e = onEllipsoid(V(0, 0, 0), V(1.47, 0.87, 0.87), rand);
      const p = sphere(0.02, pMat, 6); p.position.copy(e.p); tag(p, "Petechia", "Pinpoint bleeds when platelets are low.", ""); g.add(p); pet.push(p); ov.push(p);
    }
    const drops = [], dMat = W(0x7a0f18, { roughness: 0.1, clearcoat: 1 });
    for (let i = 0; i < 8; i++) { const d = sphere(0.045, dMat, 10); d.scale.y = 1.4; d.userData.s = i / 8; tag(d, "Oozing blood", "Slow ooze from line sites and wounds that will not stop.", "Pressure, topical haemostatics and correction of the coagulopathy."); g.add(d); drops.push(d); ov.push(d); }
    const site = sphere(0.06, W(0x2b0408, { roughness: 0.4 }), 10); site.position.set(0.1, 0.8, 0.28); g.add(site); ov.push(site);
    g.userData = { hem, pet, drops, ov, site };
    return g;
  }

  function bleedCells() {
    const g = new T.Group(), plts = [], reds = [], rand = rng(91);
    const wall = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 2.6, 28, 1, true), W(0xf0c9c4, { transparent: true, opacity: 0.4, roughness: 0.4, side: T.DoubleSide, depthWrite: false }));
    wall.rotation.z = Math.PI / 2;
    tag(wall, "Vessel wall", "Normally a platelet plug and fibrin seal a hole. In DIC both are used up.", "");
    g.add(wall);
    const gaps = [];
    for (let i = 0; i < 4; i++) {
      const gp = sphere(0.12, W(0x1d0808, { roughness: 0.5 }), 10); gp.scale.set(1, 0.3, 1);
      const a = 1 + i * 1.5; gp.position.set(-0.7 + i * 0.5, Math.sin(a) * 0.55, Math.cos(a) * 0.55); gp.userData.a = a; gp.userData.x = gp.position.x;
      gp.quaternion.setFromUnitVectors(Y, V(0, Math.sin(a), Math.cos(a)));
      tag(gp, "Gap in the wall", "A hole with no platelet plug. Red cells escape.", ""); g.add(gp); gaps.push(gp);
    }
    for (let i = 0; i < 14; i++) {
      const p = sphere(0.05, W(0xcdbfe0, { roughness: 0.4 }), 8); p.scale.set(1.3, 0.5, 1);
      p.userData.x = -1 + rand() * 2; p.userData.a = rand() * Math.PI * 2; p.userData.r = 0.15 + rand() * 0.25;
      tag(p, "Platelet", "Consumed in thrombin generation. A count below 50 with bleeding needs platelets.", "Transfuse for bleeding or before procedures, not to correct a number.");
      g.add(p); plts.push(p);
    }
    const rb = K.rbcGeo();
    for (let i = 0; i < 26; i++) {
      const r = new T.Mesh(rb, W(0x9a1d2c, { roughness: 0.28 })); r.scale.setScalar(0.2);
      r.userData = { x: -1.1 + rand() * 2.2, a: rand() * Math.PI * 2, r: 0.1 + rand() * 0.35, k: rand(), gap: i % 4 };
      r.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      tag(r, "Red cell", "Red cells leave through gaps and collect in the tissue.", ""); g.add(r); reds.push(r);
    }
    g.userData = { plts, reds, gaps };
    return g;
  }

  function bleedApply(k, e, sev, nec, t) {
    const gr = e.organ.userData, cut = e.view === "cut";
    gr.hem.forEach((h, i) => { const u = clamp(sev * 1.3 - i * 0.2); h.visible = !cut && u > 0.02; h.scale.set(1.2 * (0.3 + u * 1.4), 0.8 * (0.3 + u * 1.2), 0.5 * (0.5 + u)); });
    gr.pet.forEach((p, i) => { p.visible = !cut && sev > i / 80; });
    gr.drops.forEach((d) => { const u = (t * 0.2 + d.userData.s) % 1; d.visible = !cut && sev > 0.3; d.position.set(0.1 + 0.05 * Math.sin(u * 6), 0.8 - u * 1.6, 0.3 + 0.28 * u); d.scale.setScalar(0.5 + sev * 0.8); });
    gr.site.visible = !cut && sev > 0.15;
    const cs = e.cells.userData;
    cs.plts.forEach((p, i) => { p.visible = i < Math.round(14 * (1 - sev)); p.position.set(p.userData.x + Math.sin(t * 0.5 + i) * 0.05, Math.sin(p.userData.a) * 0.52 * p.userData.r / 0.4, Math.cos(p.userData.a) * 0.52 * p.userData.r / 0.4); });
    cs.gaps.forEach((gp, i) => { gp.visible = sev > 0.12 + i * 0.15; });
    cs.reds.forEach((r) => {
      const gp = cs.gaps[r.userData.gap], leak = gp.visible ? clamp((sev - 0.1) * 1.6 * (0.3 + r.userData.k)) : 0;
      if (leak > 0.02) {
        const a = gp.userData.a;
        r.position.set(gp.userData.x + Math.sin(t * 0.3 + r.userData.a) * 0.05 * leak, Math.sin(a) * (0.52 + 0.9 * leak), Math.cos(a) * (0.52 + 0.9 * leak));
      } else {
        const u = (t * (0.18 + 0.1 * r.userData.k) + r.userData.k) % 1;
        r.position.set(-1.2 + u * 2.4, Math.sin(r.userData.a) * 0.3, Math.cos(r.userData.a) * 0.3);
      }
      r.rotation.y += 0.01;
    });
  }

  PathStage.register("pancreas", { gross: pancreasGross, cells: pancreasCells, apply: pancreasApply });
  PathStage.register("muscle", { gross: muscleGross, cells: muscleCells, apply: muscleApply });
  PathStage.register("skin", { gross: skinGross, cells: skinCells, apply: skinApply });
  PathStage.register("bowel", { gross: bowelGross, cells: bowelCells, apply: bowelApply });
  PathStage.register("bleed", { gross: bleedGross, cells: bleedCells, apply: bleedApply });
})();
