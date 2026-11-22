/* The rooms behind the five doors of the lobby. Every room is bright, clean and lit like a real lab or scanner suite: white glossy
   walls, glowing ceiling panels, a floor guide line in the door's colour, and the real equipment standing in it.
   Each room is built in its door's own frame: local +z leads away from the hall, local +x is the viewer's left, z = 0 is the wall plane.
   buildRooms(THREE, env) returns { micro, path, icu, rad, update(t), hits } and nothing is added to the scene by it. */

export function buildRooms(T, env) {
  const { cnv, tex, hex, ACC, glow } = env;
  const anims = [];
  const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0 }, o || {}));
  const white = M(0xf6f9fd, { roughness: 0.42, emissive: 0xdfe8f4, emissiveIntensity: 0.38 }), wall = M(0xf2f6fb, { roughness: 0.6, emissive: 0xe8eff8, emissiveIntensity: 0.5 }), steel = M(0x9aa6b5, { roughness: 0.28, metalness: 0.85 });
  const dark = M(0x1c2533, { roughness: 0.4, metalness: 0.45 }), graphite = M(0x2c3646, { roughness: 0.45, metalness: 0.3 }), rubber = M(0x111722, { roughness: 0.9 });
  const glassM = new T.MeshStandardMaterial({ color: 0xcdeaff, transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.1, side: T.DoubleSide, depthWrite: false });
  const lamp = M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1.35 });
  const add = (g, ...c) => { c.forEach((x) => g.add(x)); return g; };
  const mesh = (geo, mat, x, y, z, p) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (p) p.add(m); return m; };
  const B = (w, h, d, mat, x, y, z, p) => mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, p);
  const C = (rt, rb, h, mat, x, y, z, p, seg) => mesh(new T.CylinderGeometry(rt, rb, h, seg || 28), mat, x, y, z, p);
  const S = (r, mat, x, y, z, p, seg) => mesh(new T.SphereGeometry(r, seg || 20, seg ? Math.round(seg * 0.7) : 14), mat, x, y, z, p);
  const P = (w, h, mat, x, y, z, ry, p) => { const m = mesh(new T.PlaneGeometry(w, h), mat, x, y, z, p); m.rotation.y = ry || 0; return m; };
  const emit = (c, k) => M(c, { emissive: c, emissiveIntensity: k == null ? 1.4 : k, roughness: 0.4 });
  const additive = (c, o) => new T.MeshBasicMaterial(Object.assign({ color: c, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }, o || {}));
  const solid = (c, o) => new T.MeshBasicMaterial(Object.assign({ color: c, transparent: true, opacity: 0.85 }, o || {}));
  const hits = {};

  /* ------------------------------------------------------------------ small texture helpers */
  const canvasMat = (w, h, draw, k) => {
    const [c, g] = cnv(w, h); draw(g, w, h);
    const t = tex(c);
    return { mat: new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: k == null ? 0.9 : k, roughness: 0.5 }), tex: t, ctx: g, canvas: c };
  };
  const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const floorMat = (col, rings) => {
    const [c, g] = cnv(512, 512), a = hex(col);
    g.fillStyle = "#e9eff6"; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "#cdd6e2"; g.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    g.fillStyle = a; g.globalAlpha = 0.5; g.fillRect(250, 0, 12, 512); g.globalAlpha = 1;
    const t = tex(c); t.wrapS = t.wrapT = T.RepeatWrapping; return { t, m: new T.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.22, metalness: 0.1 }) };
  };

  /* ------------------------------------------------------------------ the shell every room shares */
  function shell(W, D, H, col, o) {
    o = o || {};
    const g = new T.Group(), fl = floorMat(col);
    fl.t.repeat.set(W / 4, D / 4);
    mesh(new T.PlaneGeometry(W, D), fl.m, 0, 0.002, D / 2, g).rotation.x = -Math.PI / 2;
    [1, -1].forEach((s) => {                                                       /* side walls, with a gap wherever a doorway is cut */
      let z0 = 0;
      (o.gaps || []).filter((q) => q.side === s).sort((a, b) => a.z - b.z).concat([{ z: D + 99, w: 0 }]).forEach((q) => { const z1 = Math.min(D, q.z - q.w / 2); if (z1 > z0 + 0.01) B(0.12, H, z1 - z0, wall, s * W / 2, H / 2, (z0 + z1) / 2, g); z0 = q.z + q.w / 2; });
    });
    if (!o.noBack) { if (o.backGap) [-1, 1].forEach((sd) => B((W - o.backGap) / 2, H, 0.12, wall, sd * (o.backGap / 2 + (W - o.backGap) / 4), H / 2, D, g)); else B(W, H, 0.12, wall, 0, H / 2, D, g); }
    B(W, 0.1, D, M(0xeef3fa, { roughness: 0.8, emissive: 0xe4ecf7, emissiveIntensity: 0.85 }), 0, H + 0.05, D / 2, g);
    [-1, 1].forEach((s) => { B(0.05, 0.05, D - 0.4, emit(col, 1.1), s * (W / 2 - 0.1), 0.14, D / 2, g); B(0.05, 0.05, D - 0.4, emit(col, 0.8), s * (W / 2 - 0.1), H - 0.16, D / 2, g); });
    if (!o.noBack) B(W - 0.4, 0.05, 0.05, emit(col, 1.1), 0, 0.14, D - 0.1, g);
    const rows = Math.max(2, Math.round(D / 3.2));
    for (let i = 0; i < rows; i += 1) { const z = (i + 0.5) * (D / rows); [-1, 1].forEach((s) => B(Math.min(1.1, W / 5), 0.04, 1.9, lamp, s * W * 0.22, H - 0.02, z, g)); }
    return g;
  }

  /* ------------------------------------------------------------------ equipment pieces */
  function microscope(sc) {
    const g = new T.Group(), body = M(0xf2f4f7, { roughness: 0.3, metalness: 0.2 }), black = M(0x151a22, { roughness: 0.35, metalness: 0.5 }), gold = M(0xd9b45a, { roughness: 0.25, metalness: 0.9 });
    const base = mesh(new T.CylinderGeometry(0.2, 0.22, 0.05, 32), body, 0, 0.025, 0, g); base.scale.z = 1.25;
    B(0.34, 0.016, 0.34, emit(0x9bf06a, 0.5), 0, 0.058, 0.02, g);
    const arm = mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.05, -0.11), new T.Vector3(0, 0.22, -0.16), new T.Vector3(0, 0.4, -0.13), new T.Vector3(0, 0.5, -0.02)]), 24, 0.04, 14), body, 0, 0, 0, g);
    B(0.2, 0.025, 0.2, black, 0, 0.2, 0.02, g);                                       /* stage */
    B(0.1, 0.004, 0.034, M(0xcfe9ff, { transparent: true, opacity: 0.55, roughness: 0.05 }), 0, 0.2175, 0.02, g);   /* the slide */
    mesh(new T.CircleGeometry(0.012, 14), emit(0xff4fa0, 1.0), 0, 0.2205, 0.02, g).rotation.x = -Math.PI / 2;
    C(0.075, 0.075, 0.03, black, 0, 0.36, 0.0, g);                                       /* nosepiece */
    [-0.045, 0, 0.045].forEach((x, i) => { const o = C(0.016, 0.012, 0.09 - i * 0.012, black, x, 0.3, 0.0, g, 14); o.rotation.z = -x * 2.2; C(0.0175, 0.0175, 0.012, i === 1 ? gold : steel, x * 0.9, 0.33, 0.0, g, 14); });
    const head = B(0.12, 0.1, 0.17, body, 0, 0.5, -0.02, g); head.rotation.x = -0.3;
    [-0.035, 0.035].forEach((x) => { const e = C(0.016, 0.02, 0.15, black, x, 0.6, 0.06, g, 14); e.rotation.x = -0.65; C(0.02, 0.02, 0.012, rubber, x, 0.66, 0.1, g, 14).rotation.x = -0.65; });
    [-1, 1].forEach((s) => { const k = C(0.04, 0.04, 0.05, black, s * 0.075, 0.15, -0.14, g, 16); k.rotation.z = Math.PI / 2; const k2 = C(0.022, 0.022, 0.05, steel, s * 0.075, 0.09, -0.14, g, 16); k2.rotation.z = Math.PI / 2; });
    const beam = mesh(new T.ConeGeometry(0.1, 0.16, 20, 1, true), additive(0xffffe0, { opacity: 0.18 }), 0, 0.12, 0.02, g); beam.rotation.x = Math.PI;
    g.scale.setScalar(sc || 1);
    return g;
  }
  function pedestal(col) { const g = new T.Group(); C(0.55, 0.62, 0.12, white, 0, 0.06, 0, g, 40); C(0.5, 0.5, 0.02, emit(col, 1.6), 0, 0.13, 0, g, 40); C(0.3, 0.4, 0.5, white, 0, 0.4, 0, g, 32); C(0.42, 0.34, 0.06, dark, 0, 0.68, 0, g, 40); C(0.36, 0.36, 0.015, emit(col, 1.8), 0, 0.71, 0, g, 40); return g; }
  function petri(col, n) { const g = new T.Group(); for (let i = 0; i < n; i += 1) { C(0.06, 0.06, 0.016, M(0xe6f1f7, { transparent: true, opacity: 0.8 }), 0, i * 0.019, 0, g, 20); C(0.052, 0.052, 0.008, M(col, { roughness: 0.4 }), 0, i * 0.019, 0, g, 20); } return g; }
  function incubator(col, label) {
    const g = new T.Group();
    B(1.0, 1.9, 0.75, white, 0, 0.95, 0, g); B(0.96, 1.5, 0.04, M(0x8fdcff, { emissive: 0x6cc8ff, emissiveIntensity: 0.55, transparent: true, opacity: 0.35, depthWrite: false }), 0, 1.0, -0.38, g);
    [0.45, 0.8, 1.15, 1.5].forEach((y, i) => { B(0.9, 0.025, 0.66, steel, 0, y, -0.02, g); [-0.25, 0.1, 0.4].forEach((x, j) => { const p = petri([0xf4d77a, 0xe58aa6, 0xa9e26a, 0xd9a35a][(i + j) % 4], 3 + ((i + j) % 3)); p.position.set(x, y + 0.015, -0.02); g.add(p); }); });
    B(0.9, 0.04, 0.02, emit(0xbff4ff, 1.3), 0, 1.78, -0.395, g);
    const t = canvasMat(256, 64, (c) => { c.fillStyle = "#0a1a22"; c.fillRect(0, 0, 256, 64); c.fillStyle = hex(col); c.font = "700 34px Figtree, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, 128, 34); }, 1.2);
    P(0.5, 0.12, t.mat, 0, 1.64, -0.4, Math.PI, g);
    return g;
  }
  function biosafety(col) {
    const g = new T.Group();
    B(1.5, 0.85, 0.8, white, 0, 0.45, 0, g);
    B(1.5, 1.5, 0.12, white, 0, 1.6, 0.34, g); B(0.1, 1.5, 0.8, white, -0.7, 1.6, 0, g); B(0.1, 1.5, 0.8, white, 0.7, 1.6, 0, g); B(1.5, 0.3, 0.8, white, 0, 2.45, 0, g);
    const sash = B(1.32, 0.9, 0.03, M(0xb9f0d0, { transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }), 0, 1.75, -0.36, g); sash.rotation.x = -0.12;
    B(1.3, 0.04, 0.6, emit(col, 0.9), 0, 1.2, -0.02, g); P(1.28, 0.9, additive(0xb6ffd1, { opacity: 0.16 }), 0, 1.75, 0.28, Math.PI, g);
    [-0.35, 0.35].forEach((x) => C(0.05, 0.05, 0.3, M(0x4fa3ff, { transparent: true, opacity: 0.7 }), x, 1.33, -0.1, g, 12));
    return g;
  }
  function centrifuge() {
    const g = new T.Group();
    C(0.28, 0.3, 0.3, white, 0, 0.15, 0, g, 36); C(0.25, 0.25, 0.02, dark, 0, 0.31, 0, g, 36);
    const lid = C(0.26, 0.26, 0.06, M(0xcfe9ff, { transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }), 0, 0.34, 0, g, 36);
    const rot = new T.Group(); rot.position.y = 0.33; g.add(rot);
    for (let i = 0; i < 6; i += 1) { const a = i * Math.PI / 3; const tb = C(0.014, 0.014, 0.1, M(i % 2 ? 0xff7a8a : 0x6bd0ff), Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17, rot, 8); tb.rotation.z = Math.cos(a) * 0.5; tb.rotation.x = Math.sin(a) * 0.5; }
    C(0.05, 0.05, 0.02, steel, 0, 0, 0, rot, 12);
    anims.push((t) => { rot.rotation.y = t * 9; });
    return g;
  }
  function tubeRack(n) { const g = new T.Group(); B(0.5, 0.04, 0.12, M(0x2f6fb8), 0, 0.02, 0, g); for (let i = 0; i < n; i += 1) { const x = -0.22 + i * (0.44 / (n - 1)); C(0.016, 0.016, 0.12, M(0xe6f1f7, { transparent: true, opacity: 0.7 }), x, 0.1, 0, g, 10); C(0.018, 0.018, 0.025, M([0xff6a7a, 0xffd23f, 0x6fe36a, 0x59b7ff][i % 4]), x, 0.165, 0, g, 10); } return g; }
  function screenMat(w, h, draw, k) { return canvasMat(w, h, draw, k); }

  /* a hospital bed with a patient, used by the ICU and the pathophysiology room */
  function bed(col) {
    const g = new T.Group();
    B(0.95, 0.1, 2.1, graphite, 0, 0.35, 0, g); B(0.7, 0.25, 1.5, dark, 0, 0.2, 0.1, g); [[-0.35, -0.8], [0.35, -0.8], [-0.35, 0.9], [0.35, 0.9]].forEach(([x, z]) => { C(0.05, 0.05, 0.1, rubber, x, 0.05, z, g, 12); });
    B(0.88, 0.12, 2.0, M(0xeaf2fb, { roughness: 0.7 }), 0, 0.46, 0, g);
    const head = B(0.95, 0.16, 0.5, white, 0, 0.6, -1.0, g); head.rotation.x = 0.45; B(0.98, 0.5, 0.06, white, 0, 0.75, -1.13, g);
    [-1, 1].forEach((s) => { B(0.04, 0.18, 1.1, steel, s * 0.49, 0.66, -0.2, g); B(0.04, 0.04, 1.1, steel, s * 0.49, 0.76, -0.2, g); });
    /* the patient: a blanket, a head and shoulders */
    const sheet = B(0.84, 0.1, 1.2, M(col, { roughness: 0.8 }), 0, 0.57, 0.28, g); sheet.rotation.x = 0;
    mesh(new T.CapsuleGeometry(0.21, 0.4, 6, 14), M(0xe8cdb8, { roughness: 0.7 }), 0, 0.72, -0.55, g).rotation.x = Math.PI / 2;
    S(0.14, M(0xe9cfba, { roughness: 0.7 }), 0, 0.74, -0.98, g, 18);
    [-0.34, 0.34].forEach((x) => mesh(new T.CapsuleGeometry(0.06, 0.55, 4, 10), M(0xe8cdb8, { roughness: 0.7 }), x, 0.6, -0.4, g).rotation.x = Math.PI / 2);
    C(0.012, 0.012, 0.35, M(0x9ad7ff, { transparent: true, opacity: 0.8 }), 0.09, 0.78, -1.15, g, 8).rotation.x = Math.PI / 2;      /* breathing tube */
    return g;
  }
  function pole(col) {
    const g = new T.Group();
    C(0.02, 0.02, 2.1, steel, 0, 1.05, 0, g, 10); [0, 1, 2, 3, 4].forEach((i) => { const a = i * 1.2566; B(0.4, 0.03, 0.03, steel, 0, 0.04, 0, g).rotation.y = a; });
    [1.55, 1.1, 0.65].forEach((y, i) => { B(0.2, 0.12, 0.12, white, 0.1, y, 0, g); B(0.12, 0.05, 0.005, emit(i === 1 ? 0xffb347 : col, 1.5), 0.1, y + 0.01, -0.063, g); });
    mesh(new T.CapsuleGeometry(0.06, 0.14, 4, 10), M(0xdff5ff, { transparent: true, opacity: 0.7 }), 0, 2.05, 0, g);
    return g;
  }
  function ventilator(col) {
    const g = new T.Group();
    C(0.03, 0.03, 0.9, steel, 0, 0.5, 0, g, 12); B(0.5, 0.05, 0.5, dark, 0, 0.03, 0, g);
    B(0.45, 0.4, 0.36, white, 0, 1.15, 0, g);
    const sm = screenMat(256, 160, (c, w, h) => { c.fillStyle = "#06121b"; c.fillRect(0, 0, w, h); c.strokeStyle = "#5ce6ff"; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < w; x += 4) { const y = 70 + (x % 128 < 70 ? -Math.sin((x % 128) / 70 * Math.PI) * 40 : 20); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.strokeStyle = "#ffd36a"; c.beginPath(); for (let x = 0; x < w; x += 4) { const y = 135 - Math.sin(x / 26) * 10; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.fillStyle = hex(col); c.font = "600 18px sans-serif"; c.fillText("PEEP 8   VT 420   FiO2 40%", 10, 22); }, 1.1);
    P(0.38, 0.24, sm.mat, 0, 1.18, -0.185, Math.PI, g);
    return g;
  }
  /* an overhead monitor on an arm that shows live traces */
  function monitor(col, w, h, rate) {
    const g = new T.Group();
    B(0.04, 0.5, 0.04, steel, 0, 0.25, 0, g);
    B(w + 0.06, h + 0.06, 0.05, dark, 0, 0, 0, g);
    const sc = screenMat(512, Math.round(512 * h / w), () => {}, 1.15), ctx = sc.ctx, cw = sc.canvas.width, ch = sc.canvas.height;
    P(w, h, sc.mat, 0, 0, -0.03, Math.PI, g);
    let x0 = 0, last = -1;
    anims.push((t) => {
      const f = Math.floor(t * (rate || 14)); if (f === last) return; last = f;
      if (f % 1) return;
      ctx.fillStyle = "#04101a"; ctx.fillRect(0, 0, cw, ch);
      const lanes = [["#43ff8a", 0.17, "II"], ["#ff5470", 0.4, "ART"], ["#5ce6ff", 0.62, "SpO₂"], ["#ffd36a", 0.84, "CO₂"]];
      lanes.forEach(([c, y, lab], li) => {
        ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath();
        for (let x = 0; x < cw - 90; x += 3) {
          const ph = ((x + t * 150) % 190) / 190; let v = 0;
          if (li === 0) v = ph < 0.08 ? -ph * 6 : ph < 0.12 ? (ph - 0.1) * 40 : ph < 0.2 ? Math.sin((ph - 0.12) / 0.08 * Math.PI) * 0.7 * 0.4 : 0;
          else if (li === 1) v = ph < 0.35 ? Math.sin(ph / 0.35 * Math.PI * 0.5) : Math.max(0, 1 - (ph - 0.35) * 1.5) * 0.9 - 0.05;
          else if (li === 2) v = Math.max(0, Math.sin(ph * Math.PI)) * 0.9;
          else v = ph < 0.55 ? Math.min(1, ph * 4) * 0.9 : Math.max(0, 0.9 - (ph - 0.55) * 8);
          const y0 = ch * y, amp = ch * 0.1, yy = y0 - v * amp;
          x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        ctx.stroke(); ctx.fillStyle = c; ctx.font = "600 16px Figtree, system-ui, sans-serif"; ctx.fillText(lab, 8, ch * y - ch * 0.075);
      });
      ctx.font = "700 44px Figtree, system-ui, sans-serif"; ctx.fillStyle = "#43ff8a"; ctx.fillText(String(78 + Math.round(Math.sin(t) * 2)), cw - 82, ch * 0.2);
      ctx.fillStyle = "#ff5470"; ctx.font = "700 26px Figtree, system-ui, sans-serif"; ctx.fillText("118/74", cw - 100, ch * 0.42);
      ctx.fillStyle = "#5ce6ff"; ctx.font = "700 36px Figtree, system-ui, sans-serif"; ctx.fillText("97", cw - 70, ch * 0.64); ctx.fillStyle = "#ffd36a"; ctx.fillText("38", cw - 70, ch * 0.86);
      sc.tex.needsUpdate = true;
    });
    return g;
  }
  /* a large wall display with a title and a picture drawn by `art` */
  function wallScreen(w, h, title, sub, col, art) {
    const sc = screenMat(1024, Math.round(1024 * h / w), (g, cw, ch) => {
      const bg = g.createLinearGradient(0, 0, cw, ch); bg.addColorStop(0, "#07121f"); bg.addColorStop(1, "#0d2036"); g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1; for (let x = 0; x < cw; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke(); } for (let y = 0; y < ch; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); }
      g.fillStyle = hex(col); g.fillRect(0, 0, cw, 10); g.fillRect(0, ch - 10, cw, 10);
      g.fillStyle = "#fff"; g.font = "800 60px Figtree, system-ui, sans-serif"; g.textBaseline = "top"; g.fillText(title, 44, 36);
      g.fillStyle = "#9fb7d3"; g.font = "500 28px Figtree, system-ui, sans-serif"; g.fillText(sub, 46, 108);
      art(g, cw, ch);
    }, 1.0);
    const g = new T.Group(); B(w + 0.1, h + 0.1, 0.06, dark, 0, 0, 0, g); B(w + 0.12, 0.03, 0.07, emit(col, 1.4), 0, h / 2 + 0.07, 0, g); P(w, h, sc.mat, 0, 0, -0.035, Math.PI, g);
    return g;
  }
  function sign(text, col, w) {
    const sc = screenMat(512, 128, (g) => { const b = g.createLinearGradient(0, 0, 512, 0); b.addColorStop(0, "#0d1626"); b.addColorStop(1, "#142238"); g.fillStyle = b; g.fillRect(0, 0, 512, 128); g.fillStyle = hex(col); g.fillRect(0, 0, 512, 8); g.fillRect(0, 120, 512, 8); g.fillStyle = "#fff"; g.font = "800 62px Figtree, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 68); }, 1.0);
    const g = new T.Group(); B(w || 1.7, 0.43, 0.06, dark, 0, 0, 0, g); P((w || 1.7) - 0.04, 0.39, sc.mat, 0, 0, -0.033, Math.PI, g); return g;
  }

  /* =================================================================== MICROBIOLOGY LAB */
  function buildMicro() {
    const col = ACC.micro, W = 9, D = 10, H = 3.5, g = shell(W, D, H, col);
    /* back wall: a large live-looking display, Gram stain and a resistance panel */
    const art = (c, cw, ch) => {
      const cx = 250, cy = 330, r = 190; c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 6.3); c.clip();
      const bgc = c.createRadialGradient(cx, cy, 20, cx, cy, r); bgc.addColorStop(0, "#f6dfe8"); bgc.addColorStop(1, "#e3b8cb"); c.fillStyle = bgc; c.fillRect(cx - r, cy - r, r * 2, r * 2);
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let k = 0; k < 11; k += 1) { const bx = cx - 120 + rnd() * 240, by = cy - 110 + rnd() * 220; for (let i = 0; i < 9; i += 1) { c.fillStyle = "#4a2a86"; c.beginPath(); c.arc(bx + (rnd() - 0.5) * 36, by + (rnd() - 0.5) * 36, 9 + rnd() * 3, 0, 6.3); c.fill(); } }
      for (let k = 0; k < 26; k += 1) { c.save(); c.translate(cx - 160 + rnd() * 320, cy - 150 + rnd() * 300); c.rotate(rnd() * 3.14); c.fillStyle = "#d8386a"; roundRect(c, -15, -5, 30, 10, 5); c.fill(); c.restore(); }
      c.restore(); c.strokeStyle = "#7be34f"; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, r, 0, 6.3); c.stroke();
      c.fillStyle = "#fff"; c.font = "600 26px Figtree, system-ui, sans-serif"; c.fillText("Gram stain, ×1000", 120, 548);
      const rows = [["Staphylococcus aureus", 0.92, "#4a7cff"], ["Escherichia coli", 0.74, "#ff6a8a"], ["Klebsiella pneumoniae", 0.58, "#ffd23f"], ["Pseudomonas aeruginosa", 0.36, "#7be34f"]];
      rows.forEach(([n, v, cc], i) => { const y = 200 + i * 78; c.fillStyle = "#cfe2f7"; c.font = "500 26px Figtree, system-ui, sans-serif"; c.fillText(n, 520, y); c.fillStyle = "rgba(255,255,255,.12)"; roundRect(c, 520, y + 34, 420, 18, 9); c.fill(); c.fillStyle = cc; roundRect(c, 520, y + 34, 420 * v, 18, 9); c.fill(); });
      c.fillStyle = "#9fb7d3"; c.font = "500 24px Figtree, system-ui, sans-serif"; c.fillText("Culture and sensitivity · resistance patterns", 520, 530);
    };
    const wd = wallScreen(6.2, 3.1, "MICROBIOLOGY LAB", "Culture · stain · sensitivity", col, art); wd.position.set(0, 1.95, D - 0.1); g.add(wd);
    /* the island bench with the microscope */
    const bx = 0, bz = 6.3;
    B(2.7, 0.07, 1.15, M(0xffffff, { roughness: 0.18, metalness: 0.1 }), bx, 0.9, bz, g); B(2.6, 0.82, 1.05, white, bx, 0.45, bz, g); B(2.7, 0.04, 0.02, emit(col, 1.8), bx, 0.12, bz - 0.55, g);
    const ms = microscope(1.7); ms.position.set(bx - 0.45, 0.935, bz); ms.rotation.y = Math.PI; g.add(ms);                       /* eyepieces face the viewer */
    const ms2 = microscope(1.2); ms2.position.set(bx + 0.95, 0.935, bz - 0.05); ms2.rotation.y = Math.PI * 0.9; g.add(ms2);
    const r1 = tubeRack(6); r1.position.set(bx + 0.1, 0.935, bz + 0.3); g.add(r1); const dish = petri(0xf4d77a, 4); dish.position.set(bx + 0.3, 0.935, bz - 0.3); g.add(dish);
    /* the hologram: bacteria turning in a ring of light above the microscope */
    const holo = new T.Group(); holo.position.set(bx - 0.45, 2.3, bz); g.add(holo);
    const ring = mesh(new T.TorusGeometry(0.75, 0.012, 8, 80), additive(col, { opacity: 0.9 }), 0, 0, 0, holo); ring.rotation.x = Math.PI / 2;
    const ring2 = mesh(new T.TorusGeometry(0.55, 0.008, 8, 60), additive(0x9fe8ff, { opacity: 0.8 }), 0, 0, 0, holo); ring2.rotation.x = Math.PI / 2.6;
    const chain = (n, r, mat) => { const c = new T.Group(); for (let i = 0; i < n; i += 1) { const a = (i / n) * Math.PI * 1.4; S(r, mat, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0, c, 12); } return c; };
    const cocci = new T.Group(), rods = new T.Group();
    for (let k = 0; k < 7; k += 1) { const c = chain(7, 0.05, solid(0x6a3fd0, { opacity: 0.9 })); const a = k / 7 * 6.28; c.position.set(Math.cos(a) * 0.48, Math.sin(k * 1.7) * 0.18, Math.sin(a) * 0.48); c.rotation.set(k, k * 0.7, 0); cocci.add(c); }
    for (let k = 0; k < 9; k += 1) { const r = mesh(new T.CapsuleGeometry(0.03, 0.12, 4, 8), solid(0xe0306a, { opacity: 0.9 }), 0, 0, 0); const a = k / 9 * 6.28 + 0.3; r.position.set(Math.cos(a) * 0.3, Math.cos(k * 2.1) * 0.22, Math.sin(a) * 0.3); r.rotation.set(k, k * 1.3, k * 0.4); rods.add(r); }
    holo.add(cocci, rods);
    mesh(new T.ConeGeometry(0.72, 1.2, 36, 1, true), additive(col, { opacity: 0.07 }), 0, -0.6, 0, holo);
    anims.push((t) => { cocci.rotation.y = t * 0.5; rods.rotation.y = -t * 0.7; ring.rotation.z = t * 0.6; ring2.rotation.z = -t * 0.9; holo.position.y = 2.3 + Math.sin(t * 1.3) * 0.04; });
    /* floor ring under the bench */
    mesh(new T.RingGeometry(1.95, 2.05, 64), emit(col, 1.4), bx, 0.006, bz, g).rotation.x = -Math.PI / 2;
    /* left wall: incubators and the safety cabinet */
    [[1.2, "37.0 °C"], [2.3, "35.5 °C"], [3.4, "37.0 °C"]].forEach(([z, l]) => { const i = incubator(col, l); i.position.set(W / 2 - 0.6, 0, z + 0.2); i.rotation.y = -Math.PI / 2; g.add(i); });
    const bsc = biosafety(col); bsc.position.set(W / 2 - 0.6, 0, 5.0); bsc.rotation.y = -Math.PI / 2; g.add(bsc);
    const au = M(0xdfe7f0, { roughness: 0.35, metalness: 0.5 });
    B(0.95, 0.5, 1.1, white, W / 2 - 0.6, 0.25, 7.7, g);
    C(0.45, 0.45, 0.9, au, W / 2 - 0.6, 0.97, 7.7, g, 36).rotation.z = Math.PI / 2;
    const ad = C(0.4, 0.4, 0.06, steel, W / 2 - 1.08, 0.97, 7.7, g, 36); ad.rotation.z = Math.PI / 2;
    C(0.07, 0.07, 0.06, emit(col, 1.2), W / 2 - 1.13, 0.97, 7.7, g, 14).rotation.z = Math.PI / 2;
    /* right wall: the bench with the centrifuge, PCR machine and racks */
    B(0.8, 0.07, 6.2, M(0xffffff, { roughness: 0.2 }), -W / 2 + 0.5, 0.92, 3.9, g); B(0.7, 0.85, 6.1, white, -W / 2 + 0.48, 0.45, 3.9, g); B(0.02, 0.04, 6.1, emit(col, 1.5), -W / 2 + 0.84, 0.12, 3.9, g);
    const cf = centrifuge(); cf.position.set(-W / 2 + 0.55, 0.955, 1.4); g.add(cf);
    [[2.6, 0x59b7ff], [3.3, 0xffd23f]].forEach(([z, c]) => { const m = B(0.45, 0.28, 0.55, white, -W / 2 + 0.55, 1.09, z, g); B(0.02, 0.1, 0.4, emit(c, 1.4), -W / 2 + 0.78, 1.12, z, g); });
    const pr = screenMat(256, 128, (c, w, h) => { c.fillStyle = "#06121b"; c.fillRect(0, 0, w, h); c.strokeStyle = "#7be34f"; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < w; x += 3) { const y = h - 18 - 80 / (1 + Math.exp(-(x - 110) / 12)); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.fillStyle = "#cfe2f7"; c.font = "600 18px sans-serif"; c.fillText("qPCR · Ct 22.4", 10, 22); }, 1.1);
    P(0.42, 0.21, pr.mat, -W / 2 + 0.76, 1.46, 4.2, Math.PI / 2, g); B(0.1, 0.4, 0.5, dark, -W / 2 + 0.62, 1.3, 4.2, g);
    [4.8, 5.4, 6.0].forEach((z, i) => { const t = tubeRack(5 + i); t.position.set(-W / 2 + 0.5, 0.955, z); t.rotation.y = Math.PI / 2; g.add(t); });
    for (let i = 0; i < 4; i += 1) { const d = petri([0xf4d77a, 0xe58aa6, 0xa9e26a, 0x9fd3ff][i], 5); d.position.set(-W / 2 + 0.5, 0.955, 6.7 + i * 0.28); g.add(d); }
    /* wall shelves with bottles and a sink */
    [1.7, 2.15].forEach((y) => { B(0.3, 0.03, 4.2, steel, -W / 2 + 0.2, y, 3.2, g); for (let i = 0; i < 9; i += 1) C(0.05, 0.05, 0.2, M([0x59b7ff, 0xffd23f, 0x7be34f, 0xff7a8a, 0xe8eef5][i % 5], { transparent: true, opacity: 0.8 }), -W / 2 + 0.2, y + 0.12, 1.2 + i * 0.45, g, 12); });
    /* pendant light bars over the island */
    [-1, 1].forEach((s) => { B(0.04, 0.8, 0.04, steel, s * 1.0, H - 0.4, bz, g); B(0.12, 0.05, 2.2, lamp, s * 1.0, H - 0.82, bz, g); });
    /* a label on the left wall and the safety sign */
    const sn = sign("MICROBIOLOGY", col, 2.4); sn.position.set(0, 3.05, 0.2); sn.rotation.y = 0; g.add(sn);
    g.userData.stand = { z: bz - 2.6, x: 0 };
    return g;
  }

  /* =================================================================== PATHOPHYSIOLOGY */
  function buildPath() {
    const col = ACC.path, W = 9, D = 10, H = 3.5, g = shell(W, D, H, col);
    const art = (c, cw, ch) => {
      c.strokeStyle = "#a073ff"; c.lineWidth = 4;
      [["#43ff8a", 260], ["#ff5470", 360], ["#5ce6ff", 460]].forEach(([cc, y], k) => { c.strokeStyle = cc; c.beginPath(); for (let x = 60; x < 960; x += 3) { const ph = ((x - 60) % 170) / 170, v = k === 0 ? (ph < 0.1 ? -0.2 : ph < 0.16 ? 1.3 : ph < 0.3 ? 0.3 * Math.sin((ph - 0.16) / 0.14 * Math.PI) : 0) : Math.sin(ph * Math.PI) * (k === 1 ? 1 : 0.8); const yy = y - v * 38; x === 60 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); });
      c.fillStyle = "#fff"; c.font = "700 30px Figtree, system-ui, sans-serif"; c.fillText("HR 78", 70, 190); c.fillText("MAP 82", 330, 190); c.fillText("SpO₂ 97%", 600, 190);
    };
    const wd = wallScreen(6.4, 3.0, "PATHOPHYSIOLOGY LIVE", "The patient changes as you act", col, art); wd.position.set(0, 2.0, D - 0.1); g.add(wd);
    const bz = 5.4;
    const bd = bed(0x7a5cc9); bd.position.set(0, 0, bz); bd.rotation.y = Math.PI; g.add(bd);                                                   /* head toward the back wall */
    mesh(new T.RingGeometry(2.2, 2.3, 72), emit(col, 1.4), 0, 0.006, bz, g).rotation.x = -Math.PI / 2;
    const mon = monitor(col, 1.7, 0.95, 24); mon.position.set(-1.7, 1.75, bz + 1.3); g.add(mon); B(0.04, 1.8, 0.04, steel, -1.7, 2.65, bz + 1.3, g);
    const vent = ventilator(col); vent.position.set(-1.2, 0, bz + 0.5); g.add(vent);
    const pl = pole(col); pl.position.set(1.1, 0, bz + 0.2); g.add(pl);
    /* the cell hologram on its own plinth, with organelles orbiting a nucleus */
    const ped = pedestal(col); ped.position.set(2.9, 0, 3.0); g.add(ped);
    const cell = new T.Group(); cell.position.set(2.9, 1.75, 3.0); g.add(cell);
    mesh(new T.SphereGeometry(0.62, 28, 20), additive(0xb99cff, { opacity: 0.1 }), 0, 0, 0, cell);
    const nuc = mesh(new T.IcosahedronGeometry(0.22, 1), additive(0xffd36a, { opacity: 0.7, wireframe: true }), 0, 0, 0, cell); S(0.1, solid(0xe0485c, { opacity: 0.95 }), 0, 0, 0, cell, 12);
    const orgs = new T.Group(); cell.add(orgs);
    for (let i = 0; i < 9; i += 1) { const a = i / 9 * 6.28, r = 0.38 + (i % 3) * 0.06; const o = mesh(new T.CapsuleGeometry(0.035, 0.08, 4, 8), solid(i % 2 ? 0x39b54a : 0x2f7de0, { opacity: 0.92 }), Math.cos(a) * r, Math.sin(i * 1.9) * 0.28, Math.sin(a) * r, orgs); o.rotation.set(i, i * 0.8, 0); }
    mesh(new T.TorusGeometry(0.72, 0.01, 8, 70), additive(col, { opacity: 0.95 }), 0, 0, 0, cell).rotation.x = Math.PI / 2;
    anims.push((t) => { orgs.rotation.y = t * 0.8; nuc.rotation.y = t * 0.4; cell.position.y = 1.75 + Math.sin(t * 1.2) * 0.04; });
    /* organ cases along the left wall */
    const organ = (kind, z) => {
      const c = new T.Group(); B(0.9, 0.12, 0.9, dark, 0, 0.06, 0, c); B(0.84, 1.3, 0.84, M(0xcfe0ff, { transparent: true, opacity: 0.12, depthWrite: false, side: T.DoubleSide }), 0, 0.8, 0, c); B(0.84, 0.06, 0.84, emit(col, 1.2), 0, 1.47, 0, c);
      const mat = M(kind === "lung" ? 0xff9fb0 : kind === "heart" ? 0xd8334a : 0xb86a45, { roughness: 0.4, emissive: 0x330010, emissiveIntensity: 0.4 });
      if (kind === "lung") [-0.18, 0.18].forEach((x) => { const l = S(0.2, mat, x, 0.85, 0, c, 20); l.scale.set(0.8, 1.45, 0.7); });
      else if (kind === "heart") { const h = S(0.24, mat, 0, 0.85, 0, c, 22); h.scale.set(0.9, 1.1, 0.85); C(0.045, 0.045, 0.28, M(0xe7566b), 0.08, 1.12, 0, c, 10); }
      else { const k = S(0.17, mat, 0, 0.85, 0, c, 20); k.scale.set(0.75, 1.3, 0.6); }
      c.userData.spin = true; anims.push((t) => { c.children[3].rotation.y = t * 0.6; }); c.position.set(W / 2 - 0.8, 0, z); c.rotation.y = -Math.PI / 2; return c;
    };
    ["lung", "heart", "kidney"].forEach((k, i) => g.add(organ(k, 2.0 + i * 1.5)));
    /* wall panels, a trends board on the right */
    const art2 = (c, cw, ch) => { const bars = [["Lactate", 0.62, "#ff7a8a"], ["Creatinine", 0.4, "#ffd23f"], ["Potassium", 0.5, "#59b7ff"], ["pH", 0.8, "#7be34f"]]; bars.forEach(([n, v, cc], i) => { const y = 200 + i * 78; c.fillStyle = "#cfe2f7"; c.font = "500 28px Figtree, system-ui, sans-serif"; c.fillText(n, 60, y); c.fillStyle = "rgba(255,255,255,.12)"; roundRect(c, 60, y + 36, 800, 20, 10); c.fill(); c.fillStyle = cc; roundRect(c, 60, y + 36, 800 * v, 20, 10); c.fill(); }); };
    const w2 = wallScreen(3.4, 2.0, "TRENDS", "Labs and gases", col, art2); w2.position.set(-W / 2 + 0.12, 2.0, 4.0); w2.rotation.y = Math.PI / 2; g.add(w2);
    const sn = sign("PATHOPHYSIOLOGY", col, 2.7); sn.position.set(0, 3.05, 0.2); g.add(sn);
    [-1, 1].forEach((s) => { B(0.04, 0.8, 0.04, steel, s * 1.4, H - 0.4, bz, g); B(0.12, 0.05, 2.4, lamp, s * 1.4, H - 0.82, bz, g); });
    g.userData.stand = { z: bz - 2.6, x: 0 };
    return g;
  }

  /* =================================================================== THE ICU */
  function buildIcu() {
    const col = ACC.icu, W = 9, D = 10, H = 3.5, g = shell(W, D, H, col);
    const art = (c, cw, ch) => { c.strokeStyle = "#12e3c8"; c.lineWidth = 5; c.beginPath(); for (let x = 60; x < 960; x += 3) { const ph = ((x - 60) % 200) / 200, v = ph < 0.08 ? -0.2 : ph < 0.14 ? 1.2 : ph < 0.3 ? 0.35 * Math.sin((ph - 0.14) / 0.16 * Math.PI) : 0; const yy = 330 - v * 70; x === 60 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); c.fillStyle = "#fff"; c.font = "800 90px Figtree, system-ui, sans-serif"; c.fillText("78", 780, 190); };
    const wd = wallScreen(6.4, 3.0, "INTENSIVE CARE", "Every bed, every monitor, one team", col, art); wd.position.set(0, 2.0, D - 0.1); g.add(wd);
    [-2.3, 2.3].forEach((x, i) => {
      const bd = bed(i ? 0x2aa7a0 : 0x4a8fd8); bd.position.set(x, 0, 5.6); bd.rotation.y = Math.PI; g.add(bd);
      const mon = monitor(col, 1.25, 0.72, 20 + i * 4); mon.position.set(x + (i ? -1.0 : 1.0), 1.7, 6.4); g.add(mon); B(0.04, 1.9, 0.04, steel, x + (i ? -1.0 : 1.0), 2.6, 6.4, g);
      const v = ventilator(col); v.position.set(x + (i ? -1.15 : 1.15), 0, 5.0); g.add(v);
      const p = pole(col); p.position.set(x + (i ? 1.05 : -1.05), 0, 5.2); g.add(p);
      mesh(new T.RingGeometry(1.5, 1.58, 64), emit(col, 1.3), x, 0.006, 5.6, g).rotation.x = -Math.PI / 2;
    });
    B(0.04, 2.3, 3.0, M(0xcfeee9, { transparent: true, opacity: 0.4, roughness: 0.9 }), 0, 1.2, 5.6, g);
    const sn = sign("INTENSIVE CARE", col, 2.7); sn.position.set(0, 3.05, 0.2); g.add(sn);
    [-2.3, 2.3].forEach((x) => { B(0.04, 0.8, 0.04, steel, x, H - 0.4, 5.6, g); B(0.12, 0.05, 2.4, lamp, x, H - 0.82, 5.6, g); });
    g.userData.stand = { z: 5.6 - 3.0, x: 0 };
    return g;
  }

  /* =================================================================== RADIOLOGY: THE PASSAGE AND ITS FOUR ROOMS */
  const PASS = { W: 3.6, D: 18.8, doors: { rx: { z: 3.7, side: -1 }, rct: { z: 9.3, side: -1 }, rmri: { z: 14.9, side: -1 }, rus: { z: 18.8, side: 0 } } };
  const ROOMW = 5.4, ROOMD = 6.4;
  /* ---- the radiology suites: dark graphite and glass, LED coves, a glossy lit floor, holographic viewers and fully detailed scanners ---- */
  const techWall = M(0x16213a, { roughness: 0.35, metalness: 0.55, emissive: 0x0b1a36, emissiveIntensity: 1.0 });
  const techPanel = M(0x1f2f50, { roughness: 0.3, metalness: 0.6, emissive: 0x0e2348, emissiveIntensity: 1.1 });
  const pearl = M(0xf5f8fc, { roughness: 0.22, metalness: 0.25, emissive: 0xd3deec, emissiveIntensity: 0.5 });
  const cap = (r, len, mat, x, y, z, p) => { const m = mesh(new T.CapsuleGeometry(r, len, 5, 14), mat, x, y, z, p); m.rotation.x = Math.PI / 2; return m; };
  /* a floating holographic panel: `draw(g, w, h, t)` repaints it a few times a second */
  function holo(w, h, draw, fps, o) {
    o = o || {}; const px = o.px || 512, py = Math.max(64, Math.round(px * h / w)), [c, g] = cnv(px, py), t = tex(c);
    const m = mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, blending: o.add ? T.AdditiveBlending : T.NormalBlending }), 0, 0, 0);
    let last = -1; const upd = (tt) => { const f = Math.floor(tt * (fps || 6)); if (f === last) return; last = f; g.clearRect(0, 0, px, py); draw(g, px, py, tt); t.needsUpdate = true; }; upd(0); anims.push(upd); return m;
  }
  function viewer(g, w, h, col, title, tag) {            /* the frame every viewer shares */
    g.fillStyle = "rgba(4,12,24,.92)"; roundRect(g, 2, 2, w - 4, h - 4, 14); g.fill(); g.strokeStyle = hex(col); g.lineWidth = 3; roundRect(g, 2, 2, w - 4, h - 4, 14); g.stroke();
    g.fillStyle = hex(col); g.fillRect(2, 2, w - 4, 34); g.fillStyle = "#04101c"; g.font = "800 20px Figtree, system-ui, sans-serif"; g.textBaseline = "middle"; g.fillText(title, 16, 20); g.textAlign = "right"; g.fillText(tag || "", w - 16, 20); g.textAlign = "left";
  }
  function ctSlice(g, cx, cy, rx, ry, k) {
    const gr = g.createRadialGradient(cx, cy, 5, cx, cy, rx); gr.addColorStop(0, "#cfd5de"); gr.addColorStop(0.8, "#808a98"); gr.addColorStop(1, "#262d38"); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.3); g.fill();
    g.fillStyle = "#05080c"; [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(cx + s * rx * 0.42, cy - ry * 0.06, rx * 0.3, ry * (0.5 + 0.04 * Math.sin(k * 2)), s * 0.12, 0, 6.3); g.fill(); });
    g.fillStyle = "#dfe3ea"; g.beginPath(); g.ellipse(cx - rx * 0.04, cy - ry * 0.02, rx * 0.17, ry * 0.26, 0.2, 0, 6.3); g.fill(); g.fillStyle = "#f4f6fa"; g.beginPath(); g.arc(cx, cy + ry * 0.66, rx * 0.085, 0, 6.3); g.fill();
    g.strokeStyle = "rgba(235,238,244,.8)"; g.lineWidth = 3; for (let i = 0; i < 5; i += 1) { const a = 0.5 + i * 0.34; [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(cx, cy, rx * 0.96, ry * 0.94, 0, s > 0 ? -a - 0.9 : Math.PI + a - 0.1, s > 0 ? -a - 0.75 : Math.PI + a + 0.05); g.stroke(); }); }
  }
  function brainSlice(g, cx, cy, r, k) {
    const sk = g.createRadialGradient(cx, cy, r * 0.5, cx, cy, r); sk.addColorStop(0, "#9099a6"); sk.addColorStop(0.86, "#6e7886"); sk.addColorStop(0.9, "#e9edf3"); sk.addColorStop(1, "#1b212b"); g.fillStyle = sk; g.beginPath(); g.ellipse(cx, cy, r * 0.82, r, 0, 0, 6.3); g.fill();
    g.strokeStyle = "rgba(20,26,34,.55)"; g.lineWidth = 2; for (let i = 0; i < 26; i += 1) { const a = i * 0.74, rr = r * (0.35 + ((i * 53) % 40) / 80); g.beginPath(); g.arc(cx + Math.cos(a) * rr * 0.55, cy + Math.sin(a) * rr * 0.7, 8 + (i % 5) * 3, a, a + 2.2); g.stroke(); }
    g.fillStyle = "#e6ecf6"; [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(cx + s * r * 0.13, cy - r * 0.08, r * 0.09, r * (0.26 + 0.015 * Math.sin(k * 2)), s * 0.25, 0, 6.3); g.fill(); });
  }
  function chestXray(g, w, h, k) {
    g.fillStyle = "#04070b"; g.fillRect(0, 0, w, h); const cx = w / 2, top = h * 0.14;
    const lg = g.createLinearGradient(0, top, 0, h); lg.addColorStop(0, "#6c7480"); lg.addColorStop(1, "#aab1bb"); g.fillStyle = lg; g.beginPath(); g.ellipse(cx, h * 0.52, w * 0.37, h * 0.42, 0, 0, 6.3); g.fill();
    g.fillStyle = "#171c24"; [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(cx + s * w * 0.19, h * 0.5, w * 0.14, h * 0.3, s * 0.08, 0, 6.3); g.fill(); });
    g.fillStyle = "#cfd5de"; g.beginPath(); g.ellipse(cx - w * 0.03, h * 0.58, w * 0.1, h * 0.17, 0.35, 0, 6.3); g.fill(); g.fillStyle = "#e9edf3"; g.fillRect(cx - 5, h * 0.12, 10, h * 0.78);
    g.strokeStyle = "rgba(220,226,234,.7)"; g.lineWidth = 3; for (let i = 0; i < 7; i += 1) { [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(cx + s * 12, h * (0.2 + i * 0.075)); g.quadraticCurveTo(cx + s * w * 0.3, h * (0.17 + i * 0.075), cx + s * w * 0.35, h * (0.34 + i * 0.07)); g.stroke(); }); }
    g.strokeStyle = "rgba(235,240,247,.9)"; g.lineWidth = 5; [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(cx + s * 18, h * 0.17); g.quadraticCurveTo(cx + s * w * 0.2, h * 0.13, cx + s * w * 0.36, h * 0.19); g.stroke(); });
  }
  function echoFrame(g, w, h, t) {
    g.fillStyle = "#02060a"; g.fillRect(0, 0, w, h); g.save(); g.beginPath(); g.moveTo(w / 2, 6); g.arc(w / 2, 6, h * 1.05, Math.PI * 0.2, Math.PI * 0.8); g.closePath(); g.clip();
    for (let i = 0; i < 900; i += 1) { const x = Math.random() * w, y = Math.random() * h, v = 40 + Math.random() * 130; g.fillStyle = "rgba(" + v + "," + v + "," + v + ",.5)"; g.fillRect(x, y, 3, 2); }
    const s = 1 + Math.sin(t * 6) * 0.08; g.fillStyle = "rgba(6,6,8,.92)"; [[-0.13, 0.52, 0.1, 0.2], [0.13, 0.52, 0.1, 0.2], [-0.1, 0.8, 0.12, 0.13 * s], [0.1, 0.8, 0.1, 0.12 * s]].forEach(([x, y, rx, ry]) => { g.beginPath(); g.ellipse(w / 2 + x * w, h * y, rx * w, ry * h, 0, 0, 6.3); g.fill(); });
    g.strokeStyle = "rgba(220,225,235,.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h * 0.3); g.lineTo(w / 2, h * 0.95); g.stroke(); g.restore();
  }
  /* a translucent glass patient lying along z, head at -z */
  function patient(col, organs) {
    const g = new T.Group(), sk = new T.MeshStandardMaterial({ color: 0xa9dcff, emissive: col, emissiveIntensity: 0.45, transparent: true, opacity: 0.5, roughness: 0.25, depthWrite: false });
    S(0.115, sk, 0, 0.12, -0.86, g, 18); cap(0.055, 0.1, sk, 0, 0.09, -0.7, g); cap(0.19, 0.46, sk, 0, 0.1, -0.28, g); cap(0.17, 0.2, sk, 0, 0.08, 0.2, g);
    [-1, 1].forEach((s) => { cap(0.07, 0.62, sk, s * 0.13, 0.07, 0.72, g); const a = cap(0.05, 0.55, sk, s * 0.3, 0.07, -0.18, g); a.rotation.z = 0; });
    if (organs) { const lm = new T.MeshBasicMaterial({ color: 0x6fd0ff, transparent: true, opacity: 0.35, depthWrite: false }); [-1, 1].forEach((s) => { const l = S(0.11, lm, s * 0.1, 0.18, -0.34, g, 14); l.scale.set(0.8, 0.9, 1.7); }); const ht = S(0.075, new T.MeshBasicMaterial({ color: 0xff5470, transparent: true, opacity: 0.85 }), -0.04, 0.2, -0.27, g, 14); anims.push((t) => { const b = 1 + Math.max(0, Math.sin(t * 7)) * 0.16; ht.scale.set(b, b, b); }); }
    return g;
  }
  /* the shell of a suite: lit glossy floor, fins and coves on dark panels, a ring in the ceiling */
  function techShell(col) {
    const W = ROOMW, D = ROOMD, H = 3.3, g = new T.Group(), a = hex(col);
    const [fc, fg] = cnv(512, 512); fg.fillStyle = "#0a1324"; fg.fillRect(0, 0, 512, 512); fg.strokeStyle = "rgba(90,150,255,.16)"; fg.lineWidth = 1.5; for (let i = 0; i <= 512; i += 64) { fg.beginPath(); fg.moveTo(i, 0); fg.lineTo(i, 512); fg.stroke(); fg.beginPath(); fg.moveTo(0, i); fg.lineTo(512, i); fg.stroke(); }
    fg.shadowColor = a; fg.shadowBlur = 16; fg.strokeStyle = a; fg.lineWidth = 6; fg.beginPath(); fg.arc(256, 290, 150, 0, 6.3); fg.stroke(); fg.lineWidth = 3; fg.beginPath(); fg.arc(256, 290, 205, 0.3, 2.84); fg.stroke(); fg.beginPath(); fg.arc(256, 290, 205, 3.44, 5.98); fg.stroke(); fg.lineWidth = 6; fg.beginPath(); fg.moveTo(256, 0); fg.lineTo(256, 140); fg.stroke();
    const ft = tex(fc); mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ map: ft, emissiveMap: ft, emissive: 0xffffff, emissiveIntensity: 0.95, roughness: 0.12, metalness: 0.6 }), 0, 0.002, D / 2, g).rotation.x = -Math.PI / 2;
    [-1, 1].forEach((s) => { B(0.12, H, D, techWall, s * W / 2, H / 2, D / 2, g); for (let i = 0; i < 6; i += 1) { B(0.05, H - 0.5, 0.07, emit(col, 1.5), s * (W / 2 - 0.08), H / 2, 0.8 + i * 1.0, g); B(0.04, H - 0.9, 0.82, techPanel, s * (W / 2 - 0.08), H / 2, 1.3 + i * 1.0, g); } B(0.05, 0.05, D, emit(col, 1.7), s * (W / 2 - 0.1), 0.12, D / 2, g); B(0.06, 0.06, D, emit(col, 1.9), s * (W / 2 - 0.1), H - 0.14, D / 2, g); });
    B(W, H, 0.12, techWall, 0, H / 2, D, g); [-1.7, 0, 1.7].forEach((x) => B(1.3, H - 0.9, 0.04, techPanel, x, H / 2, D - 0.08, g)); B(W - 0.2, 0.05, 0.05, emit(col, 1.7), 0, 0.12, D - 0.1, g); B(W - 0.2, 0.06, 0.06, emit(col, 1.9), 0, H - 0.14, D - 0.1, g);
    B(W, 0.1, D, techPanel, 0, H + 0.05, D / 2, g); const rg = mesh(new T.TorusGeometry(1.5, 0.04, 8, 72), emit(0xffffff, 1.6), 0, H - 0.04, D * 0.55, g); rg.rotation.x = Math.PI / 2; const rg2 = mesh(new T.TorusGeometry(1.05, 0.025, 8, 72), emit(col, 1.8), 0, H - 0.04, D * 0.55, g); rg2.rotation.x = Math.PI / 2;
    [-1.2, 1.2].forEach((x) => B(0.16, 0.03, D - 1.0, lamp, x, H - 0.02, D / 2, g));
    const wash = canvasMat(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, a); gr.addColorStop(1, "rgba(0,0,0,0)"); c.globalAlpha = 0.55; c.fillStyle = gr; c.fillRect(0, 0, w, h); }, 1).mat; wash.transparent = true; wash.blending = T.AdditiveBlending; wash.depthWrite = false; wash.side = T.DoubleSide;
    [-1, 1].forEach((s) => { const m = mesh(new T.PlaneGeometry(D, 1.5), wash, s * (W / 2 - 0.06), 0.78, D / 2, g); m.rotation.y = -s * Math.PI / 2; }); const mb = mesh(new T.PlaneGeometry(W, 1.5), wash, 0, 0.78, D - 0.06, g);
    return g;
  }
  /* the glass-fronted control booth in the right back corner, with two monitors */
  function booth(g0, col, drawA, drawB, label) {
    const bx0 = ROOMW / 2 - 1.5, bz = ROOMD - 1.8;
    B(0.12, 2.6, 2.4, techPanel, bx0, 1.3, bz, g0); B(0.1, 1.05, 1.6, M(0x7fe0ff, { transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }), bx0 - 0.01, 1.6, bz, g0); B(0.14, 0.05, 1.7, emit(col, 1.6), bx0, 2.15, bz, g0); B(0.14, 0.05, 1.7, emit(col, 1.6), bx0, 1.07, bz, g0);
    B(0.5, 0.05, 1.9, pearl, ROOMW / 2 - 0.8, 0.98, bz, g0); B(0.45, 0.94, 1.9, graphite, ROOMW / 2 - 0.82, 0.47, bz, g0);
    [[drawA, -0.45], [drawB, 0.45]].forEach(([dr, dz]) => { const s = holo(0.62, 0.4, dr, 4); s.position.set(ROOMW / 2 - 0.62, 1.38, bz + dz); s.rotation.y = -Math.PI / 2 - 0.15; g0.add(s); B(0.04, 0.4, 0.04, steel, ROOMW / 2 - 0.62, 1.15, bz + dz, g0); });
    const lampW = B(0.5, 0.12, 0.05, emit(0xff3a4a, 1.6), 0, 2.95, 0.2, g0); anims.push((t) => { lampW.visible = Math.sin(t * 2.2) > -0.2; });
  }
  const sideScreen = (g0, w, h, draw, left, z, y) => { const s = holo(w, h, draw, 4); s.position.set(left ? -ROOMW / 2 + 0.1 : ROOMW / 2 - 0.1, y || 1.8, z); s.rotation.y = left ? Math.PI / 2 : -Math.PI / 2; g0.add(s); return s; };
  const backScreen = (g0, w, h, draw, y, x, o) => { const s = holo(w, h, draw, 5, o); s.position.set(x || 0, y || 1.75, ROOMD - 0.12); s.rotation.y = Math.PI; g0.add(s); return s; };

  function xrayRoom(col) {
    const g0 = new T.Group(); g0.add(techShell(col)); const g = new T.Group(); g.position.z = ROOMD * 0.5; g0.add(g);
    /* motorised table with a floating detector tray */
    B(0.9, 0.12, 2.1, pearl, 0, 0.8, 0, g); B(0.5, 0.7, 0.9, graphite, 0, 0.42, 0, g); B(0.84, 0.03, 2.0, M(0x2a3a58, { roughness: 0.25, metalness: 0.4 }), 0, 0.875, 0, g); B(0.5, 0.03, 0.4, emit(col, 1.2), 0, 0.89, 0.25, g); [-1, 1].forEach((s) => B(0.03, 0.04, 2.1, emit(col, 1.6), s * 0.44, 0.8, 0, g));
    const pt = patient(col, true); pt.position.set(0, 0.9, 0.05); g.add(pt);
    /* ceiling suspension: rail, telescopic column, tube head with a sweeping light field */
    B(0.12, 0.1, 5.2, steel, 0, 3.1, 0, g); const car = new T.Group(); car.position.set(0, 3.05, 0); g.add(car);
    B(0.46, 0.2, 0.6, pearl, 0, 0, 0, car); [0.55, 0.38, 0.22].forEach((r, i) => C(0.08 + i * -0.015, 0.08 + i * -0.015, 0.7, i % 2 ? steel : pearl, 0, -0.45 - i * 0.55, 0, car, 16));
    const tube = new T.Group(); tube.position.set(0, -1.75, 0); car.add(tube); C(0.15, 0.15, 0.55, pearl, 0, 0, 0, tube, 24).rotation.z = Math.PI / 2; B(0.44, 0.3, 0.44, graphite, 0, -0.27, 0, tube); B(0.36, 0.03, 0.36, emit(0xfff0b0, 1.4), 0, -0.43, 0, tube); B(0.46, 0.02, 0.46, emit(col, 1.6), 0, -0.14, 0, tube);
    const beam = mesh(new T.ConeGeometry(0.4, 1.0, 4, 1, true), additive(0xfff0b0, { opacity: 0.12 }), 0, -0.95, 0, tube); beam.rotation.y = Math.PI / 4;
    anims.push((t) => { car.position.z = Math.sin(t * 0.35) * 0.4; });
    /* wall detector stand and the viewer */
    const stand = new T.Group(); stand.position.set(-ROOMW / 2 + 0.55, 0, 0.4); g.add(stand); B(0.14, 2.6, 0.14, steel, 0.05, 1.3, 1.6, stand); B(0.1, 1.5, 0.95, pearl, 0.12, 1.35, 1.6, stand); B(0.03, 1.32, 0.78, M(0x1b2a44, { roughness: 0.2, metalness: 0.5, emissive: 0x0f2a52, emissiveIntensity: 0.9 }), 0.19, 1.35, 1.6, stand); B(0.04, 0.04, 0.86, emit(col, 1.6), 0.2, 2.03, 1.6, stand);
    backScreen(g0, 2.4, 1.6, (c, w, h) => { viewer(c, w, h, col, "DIGITAL RADIOGRAPHY", "CHEST PA"); c.save(); c.translate(w * 0.05, 48); chestXray(c, w * 0.5, h - 70, 0); c.restore(); c.fillStyle = "#9fd6ff"; c.font = "600 22px Figtree, system-ui, sans-serif"; [["kVp", "120"], ["mAs", "3.2"], ["EI", "412"], ["DAP", "0.18 Gy·cm²"], ["SID", "180 cm"]].forEach(([k, v], i) => { c.fillStyle = "#6fa2d8"; c.fillText(k, w * 0.62, 90 + i * 52); c.fillStyle = "#eaf6ff"; c.font = "700 26px Figtree, system-ui, sans-serif"; c.fillText(v, w * 0.76, 90 + i * 52); c.font = "600 22px Figtree, system-ui, sans-serif"; }); c.fillStyle = "#3dff9a"; c.font = "800 26px Figtree, system-ui, sans-serif"; c.fillText("● READY", w * 0.62, h - 36); }, 1.75);
    booth(g0, col, (c, w, h) => { c.fillStyle = "#04101c"; c.fillRect(0, 0, w, h); c.save(); c.translate(w * 0.2, 6); chestXray(c, w * 0.6, h - 12, 0); c.restore(); }, (c, w, h, t) => { viewer(c, w, h, col, "EXPOSURE", "AUTO"); c.fillStyle = "#eaf6ff"; c.font = "700 40px Figtree, system-ui, sans-serif"; c.fillText((118 + Math.round(Math.sin(t) * 2)) + " kV", 26, h * 0.55); c.fillStyle = "#6fa2d8"; c.font = "600 22px Figtree, system-ui, sans-serif"; c.fillText("Thorax  ·  Adult", 26, h * 0.82); });
    return g0;
  }
  function ctRoom(col) {
    const g0 = new T.Group(); g0.add(techShell(col)); const g = new T.Group(); g.position.z = ROOMD * 0.66; g.scale.setScalar(0.85); g0.add(g);
    const sh = new T.Shape(); sh.moveTo(-1.1, 0); sh.lineTo(1.1, 0); sh.lineTo(1.1, 2.25); sh.lineTo(-1.1, 2.25); sh.closePath();
    const hole = new T.Path(); hole.absarc(0, 1.2, 0.54, 0, Math.PI * 2, true); sh.holes.push(hole);
    mesh(new T.ExtrudeGeometry(sh, { depth: 0.95, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 48 }), pearl, 0, 0, 0, g);
    const front = emit(col, 1.9); [-0.07, 1.02].forEach((z) => mesh(new T.TorusGeometry(0.57, 0.022, 10, 90), front, 0, 1.2, z, g));
    mesh(new T.TorusGeometry(0.66, 0.012, 8, 90), emit(0xffffff, 1.4), 0, 1.2, -0.08, g);
    [-1, 1].forEach((s) => { B(0.34, 0.5, 0.05, M(0x08111f, { emissive: 0x143a78, emissiveIntensity: 1.1, roughness: 0.2 }), s * 0.84, 1.45, -0.1, g); B(0.28, 0.02, 0.01, emit(0x7fe8ff, 1.8), s * 0.84, 1.62, -0.13, g); B(0.28, 0.02, 0.01, emit(0x7fe8ff, 1.2), s * 0.84, 1.52, -0.13, g); });
    B(0.9, 0.13, 0.05, M(0x0b1626), 0, 2.02, -0.09, g); B(0.6, 0.014, 0.01, emit(0x7fe8ff, 1.8), 0, 2.02, -0.12, g);
    mesh(new T.BoxGeometry(0.01, 0.01, 2.4), emit(0xff3a4a, 2.2), 0, 1.2, -1.2, g);                               /* the positioning laser */
    const ring = new T.Group(); ring.position.set(0, 1.2, 0.5); g.add(ring); mesh(new T.TorusGeometry(0.5, 0.03, 8, 60), M(0x2b3547, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0, ring);
    B(0.2, 0.1, 0.38, M(0xffb347, { emissive: 0xff8a1f, emissiveIntensity: 0.8 }), 0, 0.5, 0, ring); B(0.5, 0.06, 0.34, M(0x7fe8ff, { emissive: 0x2fb6d8, emissiveIntensity: 0.9 }), 0, -0.5, 0, ring); const fan = mesh(new T.CylinderGeometry(0.01, 0.46, 1.0, 3, 1, true), additive(0xfff0a0, { opacity: 0.22 }), 0, 0, 0, ring); fan.scale.z = 0.4;
    const tab = new T.Group(); g.add(tab); B(0.52, 0.1, 2.8, graphite, 0, 0.9, 0, tab); B(0.46, 0.03, 2.7, M(0x4b5a73, { roughness: 0.25, metalness: 0.4 }), 0, 0.96, 0, tab); [-1, 1].forEach((s) => B(0.02, 0.04, 2.7, emit(col, 1.6), s * 0.24, 0.95, 0, tab)); const pt = patient(col, true); pt.position.set(0, 1.0, -0.15); tab.add(pt);
    B(0.62, 0.82, 0.62, graphite, 0, 0.41, -1.35, g); B(0.72, 0.05, 0.72, emit(col, 1.2), 0, 0.02, -1.35, g);
    anims.push((t) => { ring.rotation.z = t * 3.4; tab.position.z = -0.8 + (Math.sin(t * 0.45) * 0.5 + 0.5) * 1.3; });
    /* the contrast injector on a ceiling arm */
    B(0.08, 1.2, 0.08, steel, 1.3, 2.6, -1.0, g); B(0.5, 0.07, 0.07, steel, 1.05, 2.0, -1.0, g); B(0.22, 0.3, 0.16, pearl, 0.8, 1.9, -1.0, g); C(0.04, 0.04, 0.26, M(0xbfeaff, { transparent: true, opacity: 0.7 }), 0.74, 1.62, -1.0, g, 12); C(0.04, 0.04, 0.26, M(0xffe3a0, { transparent: true, opacity: 0.7 }), 0.86, 1.62, -1.0, g, 12);
    backScreen(g0, 4.7, 0.9, (c, w, h, t) => { viewer(c, w, h, col, "CT · THORAX · SPIRAL", "SLICE " + (1 + Math.floor(t * 3) % 64) + " / 64"); const sz = h - 52; [0, 1, 2].forEach((i) => { const x0 = 18 + i * (sz + 10); c.save(); c.beginPath(); c.rect(x0, 44, sz, sz); c.clip(); c.fillStyle = "#000"; c.fillRect(x0, 44, sz, sz); ctSlice(c, x0 + sz / 2, 44 + sz / 2, sz * 0.4, sz * (i ? 0.44 : 0.36), t + i); c.restore(); c.fillStyle = "#6fa2d8"; c.font = "600 15px Figtree, system-ui, sans-serif"; c.fillText(["AXIAL", "CORONAL", "SAGITTAL"][i], x0 + 6, 62); }); c.font = "600 24px Figtree, system-ui, sans-serif"; [["kV", "120"], ["mA", String(180 + Math.round(Math.sin(t * 2) * 6))], ["CTDIvol", "7.4 mGy"], ["DLP", "212 mGy·cm"], ["W / L", "1500 / -600"]].forEach(([k, v], i) => { const x = 3 * (sz + 10) + 50 + (i % 3) * 200, y = 90 + Math.floor(i / 3) * 62; c.fillStyle = "#6fa2d8"; c.fillText(k, x, y); c.fillStyle = "#eaf6ff"; c.font = "700 28px Figtree, system-ui, sans-serif"; c.fillText(v, x, y + 30); c.font = "600 24px Figtree, system-ui, sans-serif"; }); }, 2.72, 0, { px: 1024 });
    booth(g0, col, (c, w, h, t) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); ctSlice(c, w / 2, h / 2, h * 0.5, h * 0.42, t); }, (c, w, h, t) => { viewer(c, w, h, col, "SCAN", "SPIRAL"); c.fillStyle = "#eaf6ff"; c.font = "700 36px Figtree, system-ui, sans-serif"; c.fillText("120 kV · " + (180 + Math.round(Math.sin(t * 2) * 6)) + " mA", 22, h * 0.52); c.fillStyle = "#6fa2d8"; c.font = "600 22px Figtree, system-ui, sans-serif"; c.fillText("0.5 s rotation · pitch 1.0", 22, h * 0.8); });
    return g0;
  }
  function mriRoom(col) {
    const g0 = new T.Group(); g0.add(techShell(col)); const g = new T.Group(); g.position.z = ROOMD * 0.64; g.scale.setScalar(0.85); g0.add(g);
    const pts = [[0.42, 0], [0.92, 0], [1.05, 0.12], [1.05, 1.55], [0.92, 1.7], [0.42, 1.7], [0.4, 1.5], [0.4, 0.2]].map(([x, y]) => new T.Vector2(x, y));
    const shell2 = mesh(new T.LatheGeometry(pts, 72), M(0xf4f7fb, { roughness: 0.25, metalness: 0.15, emissive: 0xd3deec, emissiveIntensity: 0.42, side: T.DoubleSide }), 0, 1.2, 0.0, g); shell2.rotation.x = Math.PI / 2;
    B(1.8, 0.3, 1.5, pearl, 0, 0.12, 0.85, g); const cr1 = emit(col, 2.0), cr2 = emit(col, 2.0); mesh(new T.TorusGeometry(0.44, 0.03, 10, 90), cr1, 0, 1.2, -0.02, g); mesh(new T.TorusGeometry(0.44, 0.03, 10, 90), cr2, 0, 1.2, 1.72, g); mesh(new T.TorusGeometry(1.06, 0.02, 8, 90), cr1, 0, 1.2, 0.85, g).scale.z = 1;
    B(0.34, 0.22, 0.04, M(0x08111f, { emissive: 0x143a78, emissiveIntensity: 1.1 }), 0.86, 1.6, 0.0, g);
    const inner = new T.Group(); inner.position.set(0, 1.2, 0.85); g.add(inner);
    const coil = mesh(new T.TorusGeometry(0.41, 0.018, 6, 40, Math.PI * 1.5), additive(col, { opacity: 0.95 }), 0, 0, 0, inner), coil2 = mesh(new T.TorusGeometry(0.41, 0.013, 6, 40, Math.PI * 1.2), additive(0x9fe8ff, { opacity: 0.8 }), 0, 0, 0.3, inner), pulse = mesh(new T.TorusGeometry(0.415, 0.03, 8, 60), additive(0xffffff, { opacity: 0.5 }), 0, 0, -0.7, inner);
    mesh(new T.CylinderGeometry(0.415, 0.415, 1.6, 40, 1, true), additive(col, { opacity: 0.09 }), 0, 0, 0, inner).rotation.x = Math.PI / 2;
    const tab = new T.Group(); g.add(tab); B(0.54, 0.1, 2.9, graphite, 0, 0.78, 0, tab); B(0.48, 0.03, 2.8, M(0x4b5a73, { roughness: 0.25, metalness: 0.4 }), 0, 0.84, 0, tab); [-1, 1].forEach((s) => B(0.02, 0.04, 2.8, emit(col, 1.6), s * 0.25, 0.83, 0, tab));
    const pt = patient(col, false); pt.position.set(0, 0.92, -0.1); tab.add(pt); const hc = mesh(new T.SphereGeometry(0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), additive(0x9fe8ff, { opacity: 0.45 }), 0, 1.0, -0.96, tab);       /* head coil */
    B(0.64, 0.7, 0.64, graphite, 0, 0.35, -1.65, g); B(0.74, 0.05, 0.74, emit(col, 1.2), 0, 0.02, -1.65, g);
    mesh(new T.RingGeometry(2.4, 2.46, 72), emit(0xff5a6a, 1.2), 0, 0.01, 0.85, g).rotation.x = -Math.PI / 2;                    /* the five-gauss line */
    const cove = emit(col, 1.8); B(ROOMW - 0.3, 0.06, 0.06, cove, 0, 3.05, ROOMD - 0.14, g0);
    anims.push((t) => { coil.rotation.z = t * 2.4; coil2.rotation.z = -t * 1.6; const p = (t * 0.5) % 1; pulse.position.z = -0.75 + p * 1.5; pulse.material.opacity = 0.6 * Math.sin(p * Math.PI); tab.position.z = -1.0 + (Math.sin(t * 0.4) * 0.5 + 0.5) * 1.6; const c = new T.Color().setHSL(0.55 + 0.1 * Math.sin(t * 0.5), 0.9, 0.55); cr1.emissive.copy(c); cr2.emissive.copy(c); cove.emissive.copy(c); });
    backScreen(g0, 4.7, 0.9, (c, w, h, t) => { viewer(c, w, h, col, "MRI · BRAIN · 3.0 T", "T2 FLAIR · " + (1 + Math.floor(t * 2) % 40) + " / 40"); const sz = h - 52; [0, 1, 2].forEach((i) => { const x0 = 18 + i * (sz + 10); c.save(); c.beginPath(); c.rect(x0, 44, sz, sz); c.clip(); c.fillStyle = "#000"; c.fillRect(x0, 44, sz, sz); brainSlice(c, x0 + sz / 2, 44 + sz / 2, sz * (0.42 + 0.03 * i), t + i); c.restore(); c.fillStyle = "#6fa2d8"; c.font = "600 15px Figtree, system-ui, sans-serif"; c.fillText(["AXIAL", "SAGITTAL", "CORONAL"][i], x0 + 6, 62); }); c.font = "600 24px Figtree, system-ui, sans-serif"; [["TR", "9000 ms"], ["TE", "120 ms"], ["FOV", "220 mm"], ["Slices", "40 × 4 mm"], ["SAR", "0.8 W/kg"]].forEach(([k, v], i) => { const x = 3 * (sz + 10) + 50 + (i % 3) * 200, y = 90 + Math.floor(i / 3) * 62; c.fillStyle = "#6fa2d8"; c.fillText(k, x, y); c.fillStyle = "#eaf6ff"; c.font = "700 28px Figtree, system-ui, sans-serif"; c.fillText(v, x, y + 30); c.font = "600 24px Figtree, system-ui, sans-serif"; }); }, 2.72, 0, { px: 1024 });
    booth(g0, col, (c, w, h, t) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); brainSlice(c, w / 2, h / 2, h * 0.46, t); }, (c, w, h, t) => { viewer(c, w, h, col, "SEQUENCE", "3.0 T"); c.fillStyle = "#eaf6ff"; c.font = "700 34px Figtree, system-ui, sans-serif"; c.fillText("TR 9000 · TE 120", 22, h * 0.52); c.fillStyle = "#3dff9a"; c.font = "700 24px Figtree, system-ui, sans-serif"; c.fillText("▮▮▮▮▮▮▯▯  " + Math.min(99, Math.round(((t * 7) % 100))) + " %", 22, h * 0.8); });
    return g0;
  }
  function usRoom(col) {
    const g0 = new T.Group(); g0.add(techShell(col)); const g = new T.Group(); g.position.z = ROOMD * 0.55; g0.add(g);
    B(0.95, 0.22, 2.1, graphite, 0, 0.7, 0.3, g); B(0.88, 0.1, 2.0, M(0xe8f0f8, { roughness: 0.55, emissive: 0x9fb4cc, emissiveIntensity: 0.35 }), 0, 0.86, 0.3, g); const hd = B(0.88, 0.1, 0.6, M(0xe8f0f8, { roughness: 0.55, emissive: 0x9fb4cc, emissiveIntensity: 0.35 }), 0, 0.95, -0.55, g); hd.rotation.x = 0.25; B(0.4, 0.6, 0.6, dark, 0, 0.3, 0.3, g); [-1, 1].forEach((s) => B(0.02, 0.04, 2.1, emit(col, 1.6), s * 0.47, 0.7, 0.3, g));
    const pt = patient(col, true); pt.position.set(0, 0.98, 0.35); g.add(pt);
    /* the machine: a cart with a big swivel monitor, a touch panel, keyboard, probes in holders and a gel warmer */
    const cart = new T.Group(); cart.position.set(1.2, 0, 0.5); cart.rotation.y = -0.5; g.add(cart);
    B(0.66, 0.9, 0.74, pearl, 0, 0.55, 0, cart); B(0.64, 0.04, 0.6, dark, 0, 1.03, -0.12, cart); [-1, 1].forEach((s) => [-1, 1].forEach((z) => C(0.05, 0.05, 0.06, rubber, s * 0.27, 0.04, z * 0.3, cart, 12))); B(0.66, 0.03, 0.74, emit(col, 1.4), 0, 0.1, 0, cart);
    B(0.08, 0.5, 0.08, steel, 0, 1.28, 0.22, cart); B(0.9, 0.56, 0.05, dark, 0, 1.68, 0.2, cart); const us = holo(0.84, 0.5, (c, w, h, t) => { c.fillStyle = "#02060a"; c.fillRect(0, 0, w, h); echoFrame(c, w * 0.78, h, t); c.fillStyle = "#7fe8ff"; c.font = "600 18px Figtree, system-ui, sans-serif"; c.fillText("2D · 3.5 MHz · Depth 14 cm", 10, h - 12); c.fillStyle = "#43ff8a"; c.fillText("HR " + (72 + Math.round(Math.sin(t) * 2)), w * 0.8, 40); }, 9); us.position.set(0, 1.68, 0.16); us.rotation.y = Math.PI; cart.add(us);
    B(0.5, 0.025, 0.22, M(0x1a2230), 0, 1.06, 0.26, cart); [-0.38, 0.38].forEach((x, i) => { const pr = C(0.03, 0.045, 0.2, i ? pearl : graphite, x, 0.95, 0.0, cart, 16); pr.rotation.z = x < 0 ? 0.2 : -0.2; C(0.025, 0.025, 0.05, emit(col, 1.3), x * 1.07, 1.05, 0.0, cart, 12); });
    mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-0.38, 0.85, 0), new T.Vector3(-0.5, 0.5, 0.1), new T.Vector3(-0.3, 0.3, 0.3), new T.Vector3(0, 0.2, 0.3)]), 20, 0.012, 6), rubber, 0, 0, 0, cart);
    const stool = new T.Group(); stool.position.set(-1.0, 0, 0.9); g.add(stool); C(0.2, 0.2, 0.06, dark, 0, 0.5, 0, stool, 20); C(0.03, 0.03, 0.45, steel, 0, 0.25, 0, stool, 8); C(0.22, 0.22, 0.03, steel, 0, 0.03, 0, stool, 6); B(0.4, 0.03, 0.4, emit(col, 1.2), 0, 0.48, 0, stool);
    /* a ceiling monitor arm */
    B(0.1, 1.0, 0.1, steel, -1.2, 2.8, -0.6, g); B(0.07, 0.07, 1.1, steel, -1.2, 2.3, -0.1, g); B(0.9, 0.56, 0.05, dark, -1.2, 1.9, 0.5, g);
    const m2 = holo(0.84, 0.5, (c, w, h, t) => { viewer(c, w, h, col, "ECHO · A4C", "LV EF 58 %"); c.save(); c.translate(w * 0.16, 36); echoFrame(c, w * 0.68, h - 40, t); c.restore(); }, 6); m2.position.set(-1.2, 1.9, 0.47); m2.rotation.y = Math.PI; g.add(m2);
    backScreen(g0, 3.0, 1.6, (c, w, h, t) => { viewer(c, w, h, col, "ULTRASOUND", "REAL-TIME · NO RADIATION"); c.save(); c.translate(w * 0.04, 48); echoFrame(c, w * 0.56, h - 64, t); c.restore(); c.fillStyle = "#6fa2d8"; c.font = "600 22px Figtree, system-ui, sans-serif"; [["LVEF", "58 %"], ["TAPSE", "22 mm"], ["IVC", "1.6 cm"], ["E/e'", "8.4"]].forEach(([k, v], i) => { c.fillStyle = "#6fa2d8"; c.fillText(k, w * 0.66, 100 + i * 56); c.fillStyle = "#eaf6ff"; c.font = "700 28px Figtree, system-ui, sans-serif"; c.fillText(v, w * 0.8, 100 + i * 56); c.font = "600 22px Figtree, system-ui, sans-serif"; }); }, 1.75);
    return g0;
  }

  function buildRad() {
    const col = ACC.rad, W = PASS.W, D = PASS.D, H = 3.4;
    const g = shell(W, D, H, col, { backGap: 1.9, gaps: Object.keys(PASS.doors).filter((k) => PASS.doors[k].side).map((k) => ({ side: PASS.doors[k].side, z: PASS.doors[k].z, w: 1.9 })) });
    /* the department's name, on the wall beside the entrance, above a CT slice */
    const art = (c, cw, ch) => { const cx = 512, cy = 360, r = 170; const gr = c.createRadialGradient(cx, cy, 10, cx, cy, r); gr.addColorStop(0, "#f2f5f9"); gr.addColorStop(0.65, "#8b95a3"); gr.addColorStop(1, "#1a2230"); c.fillStyle = gr; c.beginPath(); c.ellipse(cx, cy, r * 1.05, r * 0.9, 0, 0, 6.3); c.fill(); c.fillStyle = "#0b1119"; c.beginPath(); c.ellipse(cx - 60, cy, 44, 70, 0, 0, 6.3); c.ellipse(cx + 60, cy, 44, 70, 0, 0, 6.3); c.fill(); c.strokeStyle = "#3f8cff"; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, r + 40, 0, 6.3); c.stroke(); };
    const end = wallScreen(2.9, 2.2, "RADIOLOGY", "X-ray \u00b7 CT \u00b7 MRI \u00b7 Ultrasound", col, art); end.position.set(W / 2 - 0.1, 1.85, 5.0); end.rotation.y = -Math.PI / 2; g.add(end);
    const names = { rx: ["X-RAY", xrayRoom], rct: ["CT SCAN", ctRoom], rmri: ["MRI", mriRoom], rus: ["ULTRASOUND", usRoom] };
    const rooms = {};
    Object.keys(PASS.doors).forEach((k) => {
      const d = PASS.doors[k], side = d.side, z = d.z;
      const rg = new T.Group(), ang = side > 0 ? Math.PI / 2 : side < 0 ? -Math.PI / 2 : 0;
      rg.position.set(side * (W / 2), 0, z); rg.rotation.y = ang; g.add(rg);
      /* the room, in its own frame: x across the doorway, z into the room */
      rg.add(names[k][1](col));
      rooms[k] = rg;
      /* the doorway: a glowing frame, a header, the name above it, a click target filling it, and an arrow on the floor */
      const fr = new T.Group(); fr.position.copy(rg.position); fr.rotation.y = ang; g.add(fr);       /* the frame shares the room's frame: x across, z into the room */
      B(1.9, 0.7, 0.16, wall, 0, 3.05, 0, fr); B(1.9, 0.05, 0.18, emit(col, 1.6), 0, 2.7, 0.0, fr);
      [-1, 1].forEach((sd) => { B(0.07, 2.7, 0.18, graphite, sd * 0.93, 1.35, 0, fr); B(0.03, 2.65, 0.05, emit(col, 1.6), sd * 0.9, 1.35, -0.06, fr); });
      if (!side) { [-1, 1].forEach((sd) => B(0.9, 3.4, 0.12, wall, sd * 2.25, 1.7, 0, fr)); }       /* the end room is wider than the passage: close the wall beside it */
      const sg = sign(names[k][0], col, 1.7); sg.position.set(0, 3.1, -0.1); fr.add(sg);
      const hit = new T.Mesh(new T.BoxGeometry(1.8, 2.6, 0.6), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.set(0, 1.3, -0.1); hit.userData.kind = k; fr.add(hit); hits[k] = hit;
      const ar = mesh(new T.ConeGeometry(0.2, 0.4, 3), emit(col, 1.5), 0, 0.01, -0.9, fr); ar.rotation.x = -Math.PI / 2; ar.rotation.z = Math.PI;
      anims.push((t) => { ar.position.z = -0.9 + (Math.sin(t * 3) * 0.5 + 0.5) * 0.3; });
    });
    g.userData.rooms = rooms; g.userData.stand = { z: 1.8, x: 0 };
    return g;
  }

  const out = { micro: buildMicro(), path: buildPath(), icu: buildIcu(), rad: buildRad(), hits, PASS, ROOMW, ROOMD };
  out.update = (t) => { for (let i = 0; i < anims.length; i += 1) anims[i](t); };
  return out;
}
