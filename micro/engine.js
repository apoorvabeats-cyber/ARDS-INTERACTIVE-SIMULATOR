/* MICRO engine v1 — reusable 3D molecular microbiology engine (three.js r128).
   Builds two worlds: the whole bacterium ("cell") and an envelope cross-section ("mol":
   outer membrane + porin, periplasm, peptidoglycan, inner membrane, PBP).
   Scenarios (micro/scenarios.js) drive everything as a pure function of time t,
   so the timeline can be scrubbed, paused and replayed at any speed. */
(function () {
  'use strict';
  const T = THREE, M = (window.MICRO = {});
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const seg = (a, b, x) => clamp((x - a) / (b - a));
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const wob = (t, s, f = 1) => Math.sin(t * 1.7 * f + s * 12.9898) * .5 + Math.sin(t * 2.9 * f + s * 78.233) * .3 + Math.sin(t * 4.3 * f + s * 37.719) * .2;
  function keyPath(keys) {
    const n = keys.length;
    return (t, out) => {
      out = out || new T.Vector3();
      if (t <= keys[0][0]) return out.set(keys[0][1], keys[0][2], keys[0][3]);
      if (t >= keys[n - 1][0]) return out.set(keys[n - 1][1], keys[n - 1][2], keys[n - 1][3]);
      let i = 0; while (t > keys[i + 1][0]) i++;
      const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
      const dt = k2[0] - k1[0], u = (t - k1[0]) / dt, u2 = u * u, u3 = u2 * u;
      const a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u, c = -2 * u3 + 3 * u2, d = u3 - u2;
      const r = [0, 0, 0];
      for (let j = 1; j <= 3; j++) {
        const m1 = (k2[0] === k0[0] ? 0 : (k2[j] - k0[j]) / (k2[0] - k0[0])) * dt;
        const m2 = (k3[0] === k1[0] ? 0 : (k3[j] - k1[j]) / (k3[0] - k1[0])) * dt;
        r[j - 1] = a * k1[j] + b * m1 + c * k2[j] + d * m2;
      }
      return out.set(r[0], r[1], r[2]);
    };
  }
  M.u = { clamp, lerp, sstep, seg, V, rng, wob, keyPath };

  /* ---------- textures / materials ---------- */
  function radial(stops, size = 64) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return new T.CanvasTexture(c);
  }
  const glowTex = radial([[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]);
  const dotTex = radial([[0, 'rgba(255,255,255,1)'], [.7, 'rgba(255,255,255,1)'], [.78, 'rgba(255,255,255,0)']], 32);
  function glow(col, size, op = .9) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending }));
    s.scale.setScalar(size); return s;
  }
  function std(col, o) { return new T.MeshStandardMaterial(Object.assign({ color: col, roughness: .5, metalness: .05 }, o || {})); }
  function fresnel(col, pw, op) {
    return new T.ShaderMaterial({
      uniforms: { c: { value: new T.Color(col) }, p: { value: pw }, o: { value: op } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 c;uniform float p;uniform float o;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),p);gl_FragColor=vec4(c*f*o,f*o);}'
    });
  }
  function points(n, fn, size, col, op) {
    const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const p = fn(i); pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const p = new T.Points(g, new T.PointsMaterial({ size, color: col, map: dotTex, alphaTest: .35, transparent: true, opacity: op == null ? 1 : op, depthWrite: false, sizeAttenuation: true }));
    p.userData.base = pos.slice(); return p;
  }
  M.fx = { glow, glowTex, dotTex, std, fresnel, points };

  /* ---------- ball-and-stick molecule ---------- */
  const EL = { C: [0x9fb0c2, .55], N: [0x4d7dff, .55], O: [0xff4d4d, .5], S: [0xffd23a, .75], H: [0xf4f6fa, .3], Zn: [0xd2dcea, 1], Fe: [0xe07a2a, .9], P: [0xff9a3c, .7] };
  const sphG = new T.SphereGeometry(1, 16, 12);
  const cylG = new T.CylinderGeometry(1, 1, 1, 8, 1, true);
  const Y = V(0, 1, 0);
  function Molecule(def, o) {
    o = o || {}; const sc = o.scale || 1, g = new T.Group(), atoms = {}, bonds = [], tint = o.tint;
    const piv = def.atoms.find(a => a.id === o.pivot); const pv = piv ? piv.p : [0, 0, 0];
    const mats = {}, baseCol = el => tint || (el === 'C' && o.carbon) || EL[el][0], stickCol = tint || o.carbon || 0xc9d4e2;
    const am = el => mats[el] || (mats[el] = std(baseCol(el), { roughness: .38, metalness: .08, transparent: true }));
    def.atoms.forEach(a => {
      const m = new T.Mesh(sphG, a.hl ? std(a.hl, { emissive: a.hl, emissiveIntensity: .55, roughness: .35, transparent: true }) : am(a.el)); const r = EL[a.el][1] * sc * (a.r || 1); m.scale.setScalar(r); m.userData.r = r;
      const c = V((a.p[0] - pv[0]) * sc, (a.p[1] - pv[1]) * sc, (a.p[2] - pv[2]) * sc);
      const op = a.open ? V((a.open[0] - pv[0]) * sc, (a.open[1] - pv[1]) * sc, (a.open[2] - pv[2]) * sc) : null;
      m.position.copy(c); g.add(m); atoms[a.id] = { id: a.id, el: a.el, mesh: m, closed: c, open: op, vis: a.hidden ? 0 : 1 };
      m.visible = !a.hidden;
    });
    const stickMat = std(stickCol, { roughness: .5, transparent: true });
    (def.bonds || []).forEach(b => {
      const ord = b[2] || 1, id = b[3];
      const mat = id ? stickMat.clone() : stickMat; const ms = [];
      for (let k = 0; k < (ord === 2 ? 2 : 1); k++) { const m = new T.Mesh(cylG, mat); m.scale.set(.16 * sc, 1, .16 * sc); g.add(m); ms.push(m); }
      const bd = { a: atoms[b[0]], b: atoms[b[1]], ord, id, meshes: ms, fade: id ? (b[4] == null ? 1 : b[4]) : 1, mat };
      bonds.push(bd);
    });
    const dir = V(), mid = V(), perp = V(), Z = V(0, 0, 1), q = new T.Quaternion();
    function layout() {
      bonds.forEach(bd => {
        const pa = bd.a.mesh.position, pb = bd.b.mesh.position; dir.copy(pb).sub(pa); const len = dir.length();
        const on = bd.fade > .02 && bd.a.mesh.visible && bd.b.mesh.visible; bd.meshes.forEach(m => m.visible = on);
        if (!on) return; if (bd.id) bd.mat.opacity = bd.fade;
        dir.multiplyScalar(1 / (len || 1)); q.setFromUnitVectors(Y, dir); mid.copy(pa).add(pb).multiplyScalar(.5);
        perp.crossVectors(dir, Z); if (perp.lengthSq() < 1e-4) perp.set(1, 0, 0); perp.normalize();
        bd.meshes.forEach((m, k) => { m.position.copy(mid); if (bd.ord === 2) m.position.addScaledVector(perp, (k ? 1 : -1) * .19 * sc); m.quaternion.copy(q); m.scale.y = len; });
      });
    }
    function morph(h) { for (const k in atoms) { const a = atoms[k]; if (a.open) a.mesh.position.lerpVectors(a.closed, a.open, h); } }
    function bond(id) { return bonds.find(b => b.id === id); }
    function opacity(op) { for (const k in mats) mats[k].opacity = op; stickMat.opacity = op; bonds.forEach(b => { if (b.id) b.mat.userData.base = op; }); }
    function color(hex) { for (const k in mats) mats[k].color.set(hex); stickMat.color.set(hex); bonds.forEach(b => b.mat.color.set(hex)); }
    function mix(hex, k) { const t = new T.Color(hex); for (const e in mats) mats[e].color.set(baseCol(e)).lerp(t, k); stickMat.color.set(stickCol).lerp(t, k); bonds.forEach(x => { if (x.mat !== stickMat) x.mat.color.set(stickCol).lerp(t, k); }); }
    function restore() { for (const k in mats) mats[k].color.set(baseCol(k)); stickMat.color.set(stickCol); bonds.forEach(b => b.mat.color.set(stickCol)); }
    layout();
    return { group: g, atoms, bonds, layout, morph, bond, opacity, color, mix, restore, scale: sc };
  }
  M.Molecule = Molecule;

  /* ---------- molecule definitions (schematic 3D coordinates in angstrom-like units) ---------- */
  function ringAtoms(pfx, cx, cy, r, n, a0, els, z) {
    const out = []; for (let i = 0; i < n; i++) { const a = a0 + i * Math.PI * 2 / n; out.push({ id: pfx + i, el: els[i] || 'C', p: [cx + r * Math.cos(a), cy + r * Math.sin(a), (z || 0) + (i % 2 ? .12 : -.08)] }); }
    return out;
  }
  const ringBonds = (pfx, n, dbl) => { const b = []; for (let i = 0; i < n; i++) b.push([pfx + i, pfx + (i + 1) % n, dbl && dbl.includes(i) ? 2 : 1]); return b; };
  const defs = M.defs = {};
  defs.meropenem = {
    name: 'Meropenem', atoms: [
      { id: 'N4', el: 'N', p: [0, 0, 0] }, { id: 'C5', el: 'C', p: [0, 1.5, .2] }, { id: 'C6', el: 'C', p: [-1.5, 1.5, 0] },
      { id: 'C7', el: 'C', p: [-1.5, 0, 0], open: [-2.8, .9, .25], hl: 0xffb347, r: 1.15 }, { id: 'O7', el: 'O', p: [-2.6, -.8, .1], open: [-3.35, -.15, .35] },
      { id: 'C8', el: 'C', p: [-2.3, 2.7, .5] }, { id: 'O8', el: 'O', p: [-3.6, 2.5, .7] }, { id: 'C9', el: 'C', p: [-1.9, 4, .2] },
      { id: 'C3', el: 'C', p: [1.4, -.5, 0] }, { id: 'C2', el: 'C', p: [2.3, .7, .1] }, { id: 'C1', el: 'C', p: [1.5, 1.9, .3] }, { id: 'C1m', el: 'C', p: [1.9, 3.3, .9] },
      { id: 'Cc', el: 'C', p: [1.9, -1.9, -.2] }, { id: 'Oc1', el: 'O', p: [1.2, -3, -.3] }, { id: 'Oc2', el: 'O', p: [3.1, -2.1, -.1] },
      { id: 'S', el: 'S', p: [3.8, .9, 0] },
      { id: 'Pa', el: 'C', p: [5.17, .98, .2] }, { id: 'Pb', el: 'C', p: [5.81, 2.3, .3] }, { id: 'Pn', el: 'N', p: [7.27, 2.1, .4] }, { id: 'Pc', el: 'C', p: [7.53, .67, .3] }, { id: 'Pd', el: 'C', p: [6.23, -.04, .2] },
      { id: 'Cx', el: 'C', p: [8.8, -.2, .3] }, { id: 'Ox', el: 'O', p: [9.9, .4, .3] }, { id: 'Nx', el: 'N', p: [8.7, -1.6, .2] }, { id: 'Me1', el: 'C', p: [7.4, -2.2, .1] }, { id: 'Me2', el: 'C', p: [9.9, -2.4, .3] },
      /* reaction partners: water-derived oxygen and the proton that ends on the ring nitrogen */
      { id: 'Ow', el: 'O', p: [-1.9, -1.9, .6], open: [-3.5, 1.9, .55], hidden: true, r: 1.6 }, { id: 'Hw', el: 'H', p: [-1.2, -2.4, .6], hidden: true, r: 1.4 }
    ],
    bonds: [['N4', 'C5'], ['N4', 'C7', 1, 'lac'], ['N4', 'C3'], ['C5', 'C6'], ['C6', 'C7'], ['C7', 'O7', 2], ['C6', 'C8'], ['C8', 'O8'], ['C8', 'C9'], ['C3', 'C2', 2], ['C2', 'C1'], ['C1', 'C5'], ['C1', 'C1m'],
      ['C3', 'Cc'], ['Cc', 'Oc1', 2], ['Cc', 'Oc2'], ['C2', 'S'], ['S', 'Pa'], ['Pa', 'Pb'], ['Pb', 'Pn'], ['Pn', 'Pc'], ['Pc', 'Pd'], ['Pd', 'Pa'], ['Pc', 'Cx'], ['Cx', 'Ox', 2], ['Cx', 'Nx'], ['Nx', 'Me1'], ['Nx', 'Me2'],
      ['Ow', 'C7', 1, 'bOwC7', 0], ['Ow', 'Hw', 1, 'bOwHw', 0], ['Hw', 'N4', 1, 'bHwN4', 0]]
  };
  /* generic cephalosporin: beta-lactam fused to six-membered dihydrothiazine, aminothiazole-oxime side chain (schematic) */
  defs.cephalosporin = (function () {
    const atoms = [{ id: 'N4', el: 'N', p: [0, 0, 0] }, { id: 'C5', el: 'C', p: [0, 1.5, .2] }, { id: 'C6', el: 'C', p: [-1.5, 1.5, 0] }, { id: 'C7', el: 'C', p: [-1.5, 0, 0], open: [-2.8, .9, .25], hl: 0xffb347, r: 1.15 },
      { id: 'O7', el: 'O', p: [-2.6, -.8, .1], open: [-3.35, -.15, .35] }, { id: 'Nam', el: 'N', p: [-2.3, 2.7, .5] }, { id: 'Cam', el: 'C', p: [-3.6, 2.7, .6] }, { id: 'Oam', el: 'O', p: [-4.1, 3.7, .5] },
      { id: 'S1', el: 'S', p: [1.5, 2.5, .1] }, { id: 'C2', el: 'C', p: [2.8, 1.5, .1] }, { id: 'C3', el: 'C', p: [2.5, .1, 0] },
      { id: 'Cc', el: 'C', p: [3.6, -.9, -.2] }, { id: 'Oc1', el: 'O', p: [3.3, -2.1, -.3] }, { id: 'Oc2', el: 'O', p: [4.8, -.5, -.1] },
      { id: 'Ow', el: 'O', p: [-1.9, -1.9, .6], open: [-3.5, 1.9, .55], hidden: true, r: 1.6 }, { id: 'Hw', el: 'H', p: [-1.2, -2.4, .6], hidden: true, r: 1.4 }];
    atoms.push(...ringAtoms('T', -4.2, 1.2, 1.2, 5, 1.5, ['S', 'C', 'N', 'C', 'C'], .5).map(a => (a.id = 'T' + a.id.slice(1), a)));
    atoms.push({ id: 'Ox', el: 'O', p: [-5.4, 4.4, .6] }, { id: 'Cox', el: 'C', p: [-6.3, 5.4, .6] });
    const bonds = [['N4', 'C5'], ['N4', 'C7', 1, 'lac'], ['N4', 'C3'], ['C5', 'C6'], ['C6', 'C7'], ['C7', 'O7', 2], ['C6', 'Nam'], ['Nam', 'Cam'], ['Cam', 'Oam', 2], ['C5', 'S1'], ['S1', 'C2'], ['C2', 'C3', 2], ['C3', 'Cc'], ['Cc', 'Oc1', 2], ['Cc', 'Oc2'],
      ['Cam', 'T0'], ['Oam', 'Ox'], ['Ox', 'Cox'], ['Ow', 'C7', 1, 'bOwC7', 0], ['Ow', 'Hw', 1, 'bOwHw', 0], ['Hw', 'N4', 1, 'bHwN4', 0]].concat(ringBonds('T', 5, [1, 3]));
    return { name: 'Ceftazidime', atoms, bonds };
  })();
  /* avibactam: diazabicyclooctane core (non-beta-lactam) with sulfate */
  defs.avibactam = (function () {
    const atoms = [{ id: 'A1', el: 'N', p: [0, 0, 0] }, { id: 'A2', el: 'C', p: [1.4, .4, .2] }, { id: 'A3', el: 'C', p: [1.9, 1.8, 0] }, { id: 'A4', el: 'C', p: [.8, 2.8, .2] }, { id: 'A5', el: 'C', p: [-.4, 1.9, .1] }, { id: 'A6', el: 'N', p: [-1.4, 2.8, .3] },
      { id: 'A7', el: 'C', p: [-1.8, 1.4, .0] }, { id: 'A8', el: 'O', p: [-2.9, 1.0, -.1] }, { id: 'Ns', el: 'N', p: [-.9, -1.0, .1] }, { id: 'Ss', el: 'S', p: [-2, -2.2, .2] }, { id: 'Os1', el: 'O', p: [-3.2, -1.8, .3] }, { id: 'Os2', el: 'O', p: [-1.6, -3.4, .3] }, { id: 'Os3', el: 'O', p: [-2.4, -2.2, 1.4] },
      { id: 'Am', el: 'C', p: [3.3, 2.1, .3] }, { id: 'Ao', el: 'O', p: [4.1, 3.1, .2] }, { id: 'An', el: 'N', p: [3.8, .9, .3] }];
    return { name: 'Avibactam', atoms, bonds: [['A1', 'A2'], ['A2', 'A3'], ['A3', 'A4'], ['A4', 'A5'], ['A5', 'A1'], ['A5', 'A6'], ['A6', 'A7'], ['A7', 'A1'], ['A7', 'A8', 2], ['A1', 'Ns'], ['Ns', 'Ss'], ['Ss', 'Os1', 2], ['Ss', 'Os2', 2], ['Ss', 'Os3'], ['A3', 'Am'], ['Am', 'Ao', 2], ['Am', 'An']] };
  })();
  /* cefiderocol (schematic): cephalosporin core + catechol siderophore chelating Fe3+ */
  defs.cefiderocol = (function () {
    const d = JSON.parse(JSON.stringify(defs.cephalosporin)); d.name = 'Cefiderocol';
    d.atoms.push(...ringAtoms('K', 6.3, -2.6, 1.3, 6, .4, ['C', 'C', 'C', 'C', 'C', 'C'], 0), { id: 'Ka', el: 'O', p: [5.9, -4.2, .1] }, { id: 'Kb', el: 'O', p: [8, -3.7, .1] }, { id: 'Fe', el: 'Fe', p: [7.4, -5.1, .2] }, { id: 'Kl', el: 'C', p: [5.1, -1.1, 0] });
    d.bonds.push(...ringBonds('K', 6, [0, 2, 4]), ['Cc', 'Kl'], ['Kl', 'K3'], ['K2', 'Ka'], ['K1', 'Kb'], ['Ka', 'Fe'], ['Kb', 'Fe']);
    return d;
  })();
  /* amikacin (schematic): three linked sugar rings with amino groups */
  defs.amikacin = (function () {
    const atoms = [], bonds = [];
    [[0, 0], [3.1, 1.3], [6.4, .2]].forEach((c, i) => {
      const e = ['O', 'C', 'C', 'C', 'C', 'C']; atoms.push(...ringAtoms('R' + i, c[0], c[1], 1.25, 6, .3 + i * .5, e, i * .3)); bonds.push(...ringBonds('R' + i, 6));
      atoms.push({ id: 'N' + i, el: 'N', p: [c[0] + 1.9 * Math.cos(2 + i), c[1] + 1.9 * Math.sin(2 + i), .3] }, { id: 'M' + i, el: 'N', p: [c[0] + 1.9 * Math.cos(4.2 + i), c[1] + 1.9 * Math.sin(4.2 + i), -.2] });
      bonds.push(['R' + i + '1', 'N' + i], ['R' + i + '3', 'M' + i]);
    });
    bonds.push(['R04', 'R12'], ['R14', 'R22']);
    return { name: 'Amikacin', atoms, bonds };
  })();
  /* colistin (schematic): cationic cyclic heptapeptide ring + fatty-acyl tail */
  defs.colistin = (function () {
    const atoms = ringAtoms('P', 0, 0, 2, 7, 0, ['C', 'N', 'C', 'N', 'C', 'N', 'C'], 0), bonds = ringBonds('P', 7);
    for (let i = 0; i < 7; i += 2) { const a = i * Math.PI * 2 / 7; atoms.push({ id: 'D' + i, el: 'N', p: [2.9 * Math.cos(a), 2.9 * Math.sin(a), .3], r: 1.1 }); bonds.push(['P' + i, 'D' + i]); }
    let px = 2.1, py = -1.6; atoms.push({ id: 'F0', el: 'C', p: [px, py, 0] }); bonds.push(['P3', 'F0']);
    for (let i = 1; i < 7; i++) { px += 1.1; py += (i % 2 ? -.45 : .45) - .25; atoms.push({ id: 'F' + i, el: 'C', p: [px, py, 0] }); bonds.push(['F' + (i - 1), 'F' + i]); }
    return { name: 'Colistin', atoms, bonds };
  })();

  /* ---------- NDM-1 style enzyme / PBP: space-filling blobs with a carved pocket ---------- */
  function blob(o) {
    const r = rng(o.seed || 7), pts = [], c = o.c, rad = o.rad, cav = o.cavity;
    const cc = cav ? V(cav.c[0], cav.c[1], cav.c[2]) : null, cu = cav ? V(...cav.u).normalize() : null, op = cav && cav.open ? V(...cav.open).normalize() : null;
    for (let i = 0; i < o.n; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), k = 1 + (r() - .5) * (o.rough || .22);
      const p = V(c[0] + rad[0] * s * Math.cos(th) * k, c[1] + rad[1] * u * k, c[2] + rad[2] * s * Math.sin(th) * k);
      if (cc && p.distanceTo(cc) < cav.r * 1.08) continue;
      if (cc && op) { const d = p.clone().sub(cc), al = d.dot(op); if (al > 0 && d.addScaledVector(op, -al).length() < cav.r * (cav.openR || 1.45)) continue; }
      pts.push({ p, f: 0 });
    }
    if (cav) for (let i = 0; i < (cav.n || 70); i++) {
      let d; do { d = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); } while (d.lengthSq() > 1 || d.lengthSq() < .1); d.normalize(); if (d.dot(cu) > .42) continue; if (op && d.dot(op) > .3) continue;
      pts.push({ p: cc.clone().addScaledVector(d, cav.r * 1.02 + r() * .4), f: 1 });
    }
    const im = new T.InstancedMesh(new T.SphereGeometry(1, 10, 7), std(0xffffff, { roughness: .55, metalness: .02 }), pts.length), m4 = new T.Matrix4(), col = new T.Color();
    const c1 = new T.Color(o.col1), c2 = new T.Color(o.col2), dark = new T.Color(o.floor || 0x10264d);
    pts.forEach((q, i) => { const p = q.p, s = o.sr * (.85 + r() * .3) * (q.f ? 1.05 : 1); m4.makeScale(s, s, s); m4.setPosition(p); im.setMatrixAt(i, m4); col.copy(c1).lerp(c2, clamp(.5 + .5 * Math.sin(p.x * .33 + p.y * .21 + p.z * .17) + (r() - .5) * .35)); if (q.f) col.lerp(dark, .55); im.setColorAt(i, col); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; return im;
  }
  M.blob = blob;

  /* ---------- the whole bacterium (deformable capsule shells) ---------- */
  function shellGeo() {
    const NC = 14, NM = 26, MS = 40, rings = [];
    for (let i = 0; i < NC; i++) rings.push(['L', (i / NC) * Math.PI / 2]);
    for (let i = 0; i < NM; i++) rings.push(['M', -1 + 2 * (i + .5) / NM]);
    for (let i = 0; i < NC; i++) rings.push(['R', Math.PI / 2 - (i / (NC - 1)) * Math.PI / 2]);
    const nr = rings.length, pos = new Float32Array(nr * (MS + 1) * 3), idx = [];
    for (let i = 0; i < nr - 1; i++) for (let j = 0; j < MS; j++) { const a = i * (MS + 1) + j, b = a + 1, c = a + MS + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(idx);
    g.userData = { rings, MS, nr };
    return g;
  }
  function updateShell(g, p, k, t) {
    const { rings, MS } = g.userData, pos = g.attributes.position.array, H = p.H, R = p.R * k, sig = p.R * .55;
    let n = 0;
    for (let i = 0; i < rings.length; i++) {
      const [kind, a] = rings[i]; let x, r;
      if (kind === 'L') { x = -H - R * Math.cos(a); r = R * Math.sin(a); } else if (kind === 'R') { x = H + R * Math.cos(a); r = R * Math.sin(a); } else { x = a * H; r = R; }
      const gx = Math.exp(-(x / sig) * (x / sig)); r *= Math.sqrt(Math.max(0, 1 - p.pinch * gx)); if (Math.abs(x) < sig * .6) r *= 1 - sstep(.9, 1, p.pinch);
      const side = x < 0 ? -1 : 1, xx = x + side * p.gap * .5;
      for (let j = 0; j <= MS; j++) {
        const th = j / MS * Math.PI * 2; let rr = r;
        if (p.swell) rr *= 1 + p.swell * (.45 + .55 * Math.sin(x * 1.9 + th * 3 + t * 5)) * Math.min(1, r / R * 2);
        pos[n++] = xx; pos[n++] = rr * Math.cos(th); pos[n++] = rr * Math.sin(th);
      }
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  }
  function buildCell() {
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const P = { H: 3.2, R: 1.5, pinch: 0, gap: 0, swell: 0 };
    const gOM = shellGeo(), gIM = shellGeo(), gCy = shellGeo();
    const mOM = new T.Mesh(gOM, std(0x2cc2ad, { transparent: true, opacity: .42, roughness: .35, depthWrite: false, side: T.DoubleSide }));
    const fOM = new T.Mesh(gOM, fresnel(0x7ff5df, 2.2, .95));
    const mIM = new T.Mesh(gIM, std(0xe9a24a, { transparent: true, opacity: .34, roughness: .4, depthWrite: false, side: T.DoubleSide }));
    const mCy = new T.Mesh(gCy, std(0x12323f, { transparent: true, opacity: .5, roughness: .8, depthWrite: false, side: T.DoubleSide }));
    mCy.renderOrder = 1; mIM.renderOrder = 2; mOM.renderOrder = 3; fOM.renderOrder = 4; body.add(mCy, mIM, mOM, fOM);
    const halves = [new T.Group(), new T.Group()]; halves.forEach(h => body.add(h));
    const r = rng(11);
    /* ribosomes (cytoplasm) */
    const N = 1500, base = [], dirs = [];
    const rp = points(N, () => { let x, y, z, cx; do { x = (r() * 2 - 1) * 4.6; y = (r() * 2 - 1) * 1.1; z = (r() * 2 - 1) * 1.1; cx = clamp(x, -3.2, 3.2); } while ((x - cx) * (x - cx) + y * y + z * z > 1.05); return [x, y, z]; }, .07, 0xff9fb8, .85);
    /* split points between daughter halves by sign of x */
    function splitPoints(src) {
      const out = [[], []]; const a = src.userData.base; for (let i = 0; i < a.length; i += 3) out[a[i] < 0 ? 0 : 1].push([a[i], a[i + 1], a[i + 2]]);
      return out.map((arr, h) => { const p = points(arr.length, i => arr[i], .07, 0xff9fb8, .85); p.userData.dirs = arr.map(() => { const d = V(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(.6 + r() * 1.4); return d; }); halves[h].add(p); return p; });
    }
    const ribos = splitPoints(rp);
    /* nucleoid (one per daughter) */
    function nucleoid(side) {
      const pts = []; for (let i = 0; i < 46; i++) { const a = i * .55; pts.push(V(side * (1.6 + .9 * Math.sin(a * 1.3) + Math.sin(i * .21) * .5), Math.sin(a * 2.1 + side) * .6, Math.cos(a * 1.7) * .6)); }
      const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, .06, 5, false), std(0x9a7bff, { emissive: 0x3b2a8f, emissiveIntensity: .6, roughness: .5 })); halves[side < 0 ? 0 : 1].add(m); return m;
    }
    nucleoid(-1); nucleoid(1);
    /* blaNDM plasmid */
    const plas = new T.Mesh(new T.TorusKnotGeometry(.36, .06, 80, 6, 2, 3), std(0xffc857, { emissive: 0x8a5a00, emissiveIntensity: .7 })); plas.position.set(-.4, -.15, .35); halves[0].add(plas);
    /* polar flagellum (single, as in P. aeruginosa) */
    const fl = []; for (let i = 0; i <= 90; i++) { const u = i / 90; fl.push(V(u * 7.5, Math.sin(u * 26) * .26 * Math.min(1, u * 4), Math.cos(u * 26) * .26 * Math.min(1, u * 4))); }
    const flag = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(fl), 180, .05, 6, false), std(0xcfe9ff, { roughness: .4 })); flag.position.x = 3.2 + 1.5 - .05; halves[1].add(flag);
    /* ambient antibiotic haze around the cell */
    const haze = points(70, () => { const a = r() * 6.28, d = 2.6 + r() * 3.4; return [(r() * 2 - 1) * 6, Math.cos(a) * d, Math.sin(a) * d]; }, .16, 0x7fe9ff, .0);
    root.add(haze);
    const api = {
      root, body, params: P, haze, flag, ribos, halves, plas, mOM, mIM, mCy, fOM,
      set(o, t) {
        Object.assign(P, o.p || {}); const L = P.H;
        updateShell(gOM, P, 1, t); updateShell(gIM, P, .86, t); updateShell(gCy, P, .78, t);
        mOM.material.opacity = o.om == null ? .42 : o.om; fOM.material.uniforms.o.value = o.fo == null ? .95 : o.fo;
        mIM.material.opacity = o.im == null ? .34 : o.im; mCy.material.opacity = o.cy == null ? .5 : o.cy;
        const gx = P.gap * .5; halves[0].position.x = -gx - (L - 3.2) * .0; halves[1].position.x = gx;
        const sx = L / 3.2; halves[0].scale.x = halves[1].scale.x = 1; halves[0].position.x = -gx - (L - 3.2) * .5; halves[1].position.x = gx + (L - 3.2) * .5;
        flag.rotation.x = t * 9;
        const b = o.burst || 0; ribos.forEach((p, h) => { const a = p.geometry.attributes.position.array, bs = p.userData.base, ds = p.userData.dirs; for (let i = 0; i < ds.length; i++) { a[i * 3] = bs[i * 3] + ds[i].x * b * 4; a[i * 3 + 1] = bs[i * 3 + 1] + ds[i].y * b * 4; a[i * 3 + 2] = bs[i * 3 + 2] + ds[i].z * b * 4; } p.geometry.attributes.position.needsUpdate = true; p.material.opacity = .85 * (1 - sstep(.5, 1, b)); });
      }
    };
    return api;
  }
  M.buildCell = buildCell;
})();
