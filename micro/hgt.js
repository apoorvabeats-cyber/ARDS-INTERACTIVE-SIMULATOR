/* MICRO hgt: horizontal gene transfer scenes (conjugation, transformation, transduction), pure functions of time.
   Schematic teaching animation of an NDM-carrying plasmid or gene moving into a susceptible recipient. */
(function () {
  'use strict';
  const T = THREE, M = (window.MICRO = window.MICRO || {}), G = M.gx, V = (x, y, z) => new T.Vector3(x, y, z);
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const std = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .45 }, o || {}));
  const OR = 0xff9a2e;
  const KINDS = {
    conj: { name: 'Conjugation', D: 20, steps: [[0, 'A donor cell carries a conjugative plasmid with the blaNDM gene. The recipient is susceptible.'], [3, 'The donor builds a conjugative pilus (F-type pilus) and reaches for the recipient.'], [6, 'The pilus attaches and retracts, pulling the two cells together to form a mating pore.'], [8, 'A relaxase nicks the plasmid at its origin of transfer (oriT).'], [10, 'A single strand of plasmid DNA is pumped through the type IV secretion channel into the recipient.'], [14, 'Both cells synthesise the complementary strand and re-circularise the plasmid.'], [17, 'The recipient is now a transconjugant: it carries blaNDM and can pass the plasmid on.']] },
    trans: { name: 'Transformation', D: 20, steps: [[0, 'A resistant donor cell carries blaNDM on its chromosome or plasmid; a competent recipient is nearby.'], [3, 'The donor cell dies and lyses, releasing fragments of DNA into the environment.'], [6, 'Free DNA fragments drift toward the recipient.'], [10, 'The recipient is competent: it binds a fragment at its surface and pulls one strand through a pore.'], [13, 'The incoming DNA aligns with matching sequence on the recipient chromosome (homologous recombination).'], [17, 'The recipient now carries the resistance gene in its chromosome.']] },
    tduc: { name: 'Transduction', D: 22, steps: [[0, 'A bacteriophage attaches to a resistant donor cell and injects its DNA.'], [3, 'Inside the donor, phage DNA replicates and the host chromosome is cut into pieces.'], [7, 'New phages are assembled. By mistake one phage head packages a piece of donor DNA carrying blaNDM.'], [10, 'The donor lyses and releases the phages.'], [12, 'The transducing phage attaches to a recipient and injects the donor DNA instead of phage DNA.'], [16, 'The donor DNA recombines into the recipient chromosome; no phage replication follows.'], [19, 'The recipient is resistant. Phage-mediated transfer is usually between closely related strains.']] }
  };
  function cell(col, len, seed) {
    const g = new T.Group(), mats = [], R = .85;
    const om = new T.Mesh(G.capsuleGeo(len, R, 30), new T.MeshStandardMaterial({ color: col, roughness: .25, transparent: true, opacity: .3, depthWrite: false, side: T.DoubleSide })); om.rotation.z = Math.PI / 2; g.add(om); mats.push(om.material);
    const im = new T.Mesh(G.capsuleGeo(len * .92, R * .78, 24), new T.MeshStandardMaterial({ color: 0xffe6a8, roughness: .3, transparent: true, opacity: .16, depthWrite: false, side: T.DoubleSide })); im.rotation.z = Math.PI / 2; g.add(im); mats.push(im.material);
    const chrom = G.nucleoid(len * .9, 1.1, 0xe8f0ff, seed, 14); chrom.rotation.z = Math.PI / 2; chrom.position.z = -.1; g.add(chrom); mats.push(chrom.material);
    const rr = G.rngf(seed + 3), rb = G.dots(70, () => V((rr() - .5) * (len + .6), (rr() - .5) * 1.1, (rr() - .5) * .8), .06, 0xff8fb8, .9); g.add(rb); mats.push(rb.material);
    return { g, mats, chrom, om, set(o) { mats.forEach(m => { m.userData.o = m.userData.o || m.opacity; m.opacity = m.userData.o * o; }); g.visible = o > .01; } };
  }
  const ring = (c, r) => new T.Mesh(new T.TorusGeometry(r || .26, .06, 10, 28), std(c || OR, { emissive: 0x4a2a00, emissiveIntensity: .45 }));
  function badge(col) { const s = new T.Mesh(new T.TorusGeometry(1.2, .05, 8, 40), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })); return s; }
  function build(scene, kind) {
    const K = KINDS[kind], root = new T.Group(); scene.add(root);
    const don = cell(0x5ad8b0, 1.7, 3), rec = cell(0x5a9aff, 1.7, 8); root.add(don.g, rec.g);
    const rbadge = badge(OR); rbadge.rotation.x = 0; root.add(rbadge); rbadge.scale.set(1.8, .85, 1);
    const tmp = V(0, 0, 0);
    /* shared objects */
    const pl = ring(); root.add(pl); const pl2 = ring(); root.add(pl2); const nick = new T.Mesh(new T.SphereGeometry(.09, 8, 6), new T.MeshBasicMaterial({ color: 0xff4a4a })); root.add(nick);
    const pilus = new T.Mesh(new T.CylinderGeometry(.045, .045, 1, 8), std(0xcfe9ff)); pilus.rotation.z = Math.PI / 2; root.add(pilus);
    const beads = Array.from({ length: 12 }, () => { const b = new T.Mesh(new T.SphereGeometry(.07, 8, 6), std(OR, { emissive: 0x4a2a00, emissiveIntensity: .5 })); root.add(b); return b; });
    const frags = Array.from({ length: 7 }, (_, i) => { const f = G.tubeAlong([V(-.3, 0, 0), V(-.1, .12, 0), V(.1, -.1, 0), V(.3, .05, 0)], .04, i === 0 ? OR : 0xcfd8e8, 14); root.add(f); return f; });
    const seg = G.tubeAlong([V(-.3, 0, 0), V(0, .12, 0), V(.3, 0, 0)], .06, OR, 12); root.add(seg);
    /* phage */
    const phages = Array.from({ length: 5 }, (_, i) => { const g = new T.Group(), head = new T.Mesh(new T.IcosahedronGeometry(.3, 0), std(i === 0 ? 0xffe2b0 : 0xd8e6ff, { roughness: .35 })), tail = new T.Mesh(new T.CylinderGeometry(.06, .06, .6, 8), std(0xbfd0e8)); tail.position.y = -.5; head.position.y = .25; const inner = new T.Mesh(new T.IcosahedronGeometry(.18, 0), new T.MeshBasicMaterial({ color: i === 0 ? OR : 0xffffff })); inner.position.y = .25; g.add(head, tail, inner); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28, f = G.tubeAlong([V(0, -.75, 0), V(Math.cos(a) * .25, -.95, Math.sin(a) * .25), V(Math.cos(a) * .35, -1.1, Math.sin(a) * .35)], .015, 0xbfd0e8, 6); g.add(f); } g.userData = { inner }; root.add(g); return g; });
    const dnaLine = new T.Mesh(new T.CylinderGeometry(.025, .025, 1, 6), new T.MeshBasicMaterial({ color: 0xffffff })); root.add(dnaLine);
    function hideAll() { [pl, pl2, nick, pilus, seg, dnaLine].forEach(o => { o.visible = false; }); beads.forEach(b => { b.visible = false; }); frags.forEach(f => { f.visible = false; }); phages.forEach(p => { p.visible = false; }); rbadge.material.opacity = 0; rec.chrom.material.color.setHex(0xe8f0ff); don.set(1); rec.set(1); }
    function update(t) {
      hideAll(); don.g.position.set(-4.3, 0, 0); rec.g.position.set(4.3, 0, 0);
      if (kind === 'conj') {
        const pil = ss(3, 6, t), pull = ss(6, 8.5, t), dx = pull * 1.7; don.g.position.x = -4.3 + dx; rec.g.position.x = 4.3 - dx;
        const tipD = don.g.position.x + 1.7, tipR = rec.g.position.x - 1.7;
        const L = lerp(.05, Math.max(.05, tipR - tipD + (1 - pull) * 0), pil * (1 - pull * .0)); pilus.visible = pil > .02 && pull < .98; pilus.scale.set(1, Math.max(.05, tipR - tipD), 1); pilus.position.set(tipD + (tipR - tipD) * pil / 2 * 1, 0, 0); pilus.scale.y = Math.max(.05, (tipR - tipD) * pil);
        pilus.position.x = tipD + (tipR - tipD) * pil / 2;
        const gap = pull * 1;
        /* plasmid in donor */
        const pBase = V(don.g.position.x + .1, -.25, .2);
        pl.visible = true; pl.position.copy(pBase); pl.rotation.y = t * .6; pl.scale.setScalar(1);
        if (t >= 8 && t < 14.2) { nick.visible = true; nick.position.set(pBase.x + .26, pBase.y, pBase.z); const w = ss(8, 10, t); pl.scale.setScalar(1 - .1 * w); }
        if (t >= 10) { for (let i = 0; i < 12; i++) { const q = ((t - 10 - i * .3) / 3.4); if (q < 0 || q > 1.2) continue; const x0 = pBase.x + .3, x1 = rec.g.position.x - .4, x = lerp(x0, x1, Math.min(1, q)); beads[i].visible = true; beads[i].position.set(x, lerp(pBase.y, -.2, Math.min(1, q)), .2); beads[i].scale.setScalar(q > 1 ? Math.max(.01, 1.2 - q) * 5 : 1); } }
        if (t >= 13) { const r = ss(13.5, 16.5, t); pl2.visible = true; pl2.position.set(rec.g.position.x - .1, -.25, .2); pl2.scale.setScalar(.05 + .95 * r); pl2.rotation.y = t * .6; }
        rbadge.position.copy(rec.g.position); rbadge.material.opacity = ss(17, 18.5, t) * .9; rbadge.material.color.setHex(OR);
        if (t >= 14 && t < 15) { pl.visible = true; }
      } else if (kind === 'trans') {
        const ly = ss(3, 6, t); don.set(1 - ly); don.g.scale.setScalar(1 + .25 * ly);
        const drift = ss(6, 10.5, t);
        frags.forEach((f, i) => { const a = i / 7 * 6.28; f.visible = t > 3.4; const sx = -4.3 + Math.cos(a) * .6, sy = Math.sin(a) * .5; let x = lerp(sx, sx * .4 + Math.cos(i) * 1.2 + 0, ss(3.4, 6, t)) , y = lerp(sy, Math.sin(i * 1.7) * 1.3, ss(3.4, 6, t)); x = lerp(x, 1.6 + (i % 3) * .4 - (i === 0 ? .6 : 0), drift); y = lerp(y, (i - 3) * .35 + Math.sin(t + i) * .1, drift); let z = 0.2;
          if (i === 0 && t > 10) { const e = ss(10, 13, t); x = lerp(x, rec.g.position.x - 1.6 + (e < .5 ? e * .8 : .8) + e * 1.5, 1); y = lerp(y, -.05, e); if (t > 13) { f.visible = false; } }
          if (i !== 0 && t > 11) { x += Math.sin(t * 2 + i) * .05 + (t - 11) * -.05; }
          f.position.set(x, y, z); f.rotation.z = t * .4 + i; });
        rec.g.position.x = 4.3; if (t > 13) { seg.visible = true; const r = ss(13, 16, t); seg.position.set(rec.g.position.x - .5 + 0, .0, -.1); seg.scale.setScalar(.2 + .9 * r); rec.chrom.material.color.lerp(new T.Color(0xffd0a0), r * .5); }
        rbadge.position.copy(rec.g.position); rbadge.material.opacity = ss(17, 18.5, t) * .9;
        if (t > 9 && t < 14) { pilus.visible = false; }
      } else {
        don.g.position.x = -4.3; const ph0 = phages[0], lysis = ss(10, 12, t);
        don.set(1 - lysis * .9); don.g.scale.setScalar(1 + .15 * lysis);
        /* injection */
        if (t < 7) { const p = phages[1]; p.visible = true; p.position.set(-4.3 + 1.4 * 0, 1.55, 0); p.rotation.z = Math.PI; p.position.set(-4.3, 1.5, 0.2); dnaLine.visible = t > 1 && t < 3.6; if (dnaLine.visible) { const k = ss(1, 3, t); dnaLine.scale.set(1, .9 * k + .05, 1); dnaLine.position.set(-4.3, .95 - .45 * k + .2, .2); } }
        /* chromosome cut */
        if (t > 3) { don.chrom.material.color.lerp(new T.Color(0xff9a9a), ss(3, 6, t) * .6); }
        /* new phages */
        if (t >= 7) { for (let i = 0; i < 5; i++) { const p = phages[i]; p.visible = true; const born = ss(7 + i * .5, 8.5 + i * .5, t), out = ss(10.5, 13.5, t), x0 = -4.3 + (i - 2) * .55, y0 = (i % 2 ? .35 : -.3); p.scale.setScalar(.6 * born + .001); p.rotation.z = Math.PI / 2; const k = i === 0 ? 1 : 0; let x = lerp(x0, i === 0 ? 1.4 : -1.5 + i * .5, out), y = lerp(y0, i === 0 ? 0 : (i - 2.5) * 1.1 + (i % 2 ? 1 : -1) * 1, out); let rot = Math.PI / 2;
          if (i === 0 && t > 12) { const ad = ss(12, 14, t); x = lerp(1.4, rec.g.position.x - 1.9, ad); y = lerp(0, .3, ad); rot = lerp(Math.PI / 2, Math.PI / 2, ad); if (t > 14) { /* injecting: inner dot moves */ } }
          p.position.set(x, y, 0.3); p.rotation.z = rot; p.userData.inner.visible = !(i === 0 && t > 14.2); }
          if (t > 14 && t < 16) { const k = ss(14, 16, t); beads[0].visible = true; beads[0].position.set(rec.g.position.x - 1.5 + k * 1.2, .3 - .3 * k, .3); beads[0].scale.setScalar(1.6); }
          if (t > 16) { seg.visible = true; const r = ss(16, 18.5, t); seg.position.set(rec.g.position.x - .5, 0, -.1); seg.scale.setScalar(.2 + .9 * r); rec.chrom.material.color.lerp(new T.Color(0xffd0a0), r * .5); } }
        rbadge.position.copy(rec.g.position); rbadge.material.opacity = ss(19, 20.5, t) * .9;
      }
      let cap = K.steps[0][1]; K.steps.forEach(s => { if (t >= s[0]) cap = s[1]; });
      return { caption: cap, labels: [] };
    }
    return { update, D: K.D, steps: K.steps, name: K.name, dispose() { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } };
  }
  M.hgt = { KINDS, build };
})();
