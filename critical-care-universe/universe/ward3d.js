/* Living ICU ward: six glass-fronted cubicles, three on each side of a polished corridor.
   The doctor stands in the corridor (first person). Each cubicle has a sliding glass door, an overhead status sign,
   a bed with a patient under a blue blanket, a wall monitor, a ventilator, an IV pole with pumps and bags.
   Everything clinical is live: the monitor and ventilator screens are the same canvases the rest of the simulator draws,
   the chest rises with the patient's breathing, and the bags, pumps and circuits follow the case.

   buildWard(THREE, scene, renderer, P, H) -> { BP, BA, hits, lamps, update(t,dt,yaw,facingAll), setDoor(i,open), door(i), approach(i) }
     H.mon(ctx,p,w,h,x,y)   monitor painter       H.rdr(ctx,p)  ventilator painter
     H.equip(p) -> {bags,pumps,doses}              Visual only. Clinical text is original and needs review.        */
import { loadArchetype, build as buildPerson, breathe, patientFile } from "./patient3d.js?v=20261120e";

import { buildBed } from "./icu-bed.js?v=20261120e";
export function buildWard(T, S, R, P, H) {
  const V = T.Vector3, G = new T.Group(); G.name = "ward"; S.add(G);
  const CW = 5, CD = 3.8, FZ = 3.6, HT = 3.3, GH = 3.0, XS = [-5, 0, 5];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rnd = (() => { let s = 11; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

  /* ---------- lighting environment for reflections ---------- */
  const env = (() => {
    const es = new T.Scene();
    es.add(new T.Mesh(new T.BoxGeometry(40, 12, 40), new T.MeshBasicMaterial({ color: 0x20384f, side: T.BackSide })));
    for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) {
      const m = new T.Mesh(new T.PlaneGeometry(4, 0.7), new T.MeshBasicMaterial({ color: new T.Color(7, 7.5, 8) }));
      m.rotation.x = Math.PI / 2; m.position.set(i * 6, 5.8, j * 9); es.add(m);
    }
    [-1, 1].forEach((s) => { const m = new T.Mesh(new T.PlaneGeometry(30, 0.3), new T.MeshBasicMaterial({ color: new T.Color(0.4, 2.2, 4) })); m.position.set(0, 3, s * 19); m.rotation.y = s > 0 ? Math.PI : 0; es.add(m); });
    const pm = new T.PMREMGenerator(R), rt = pm.fromScene(es, 0.02); pm.dispose();
    return rt.texture;
  })();
  const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0, envMap: env, envMapIntensity: 0.8 }, o || {}));
  const E = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k || 1), toneMapped: false });
  function ctex(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); fn(g, w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; }
  const mesh = (geo, mat, x, y, z, par) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (par) par.add(m); return m; };
  const bx = (w, h, d, mat, x, y, z, par) => mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, par);
  const cyl = (r1, r2, h, mat, x, y, z, par, seg) => mesh(new T.CylinderGeometry(r1, r2, h, seg || 14), mat, x, y, z, par);
  const gcache = {};
  function rgeo(w, h, d, r) {
    const key = [w, h, d, r].join(","); if (gcache[key]) return gcache[key];
    const b = Math.min(r * 0.6, d / 3, w / 4, h / 4), ww = w - 2 * b, hh = h - 2 * b, rr = Math.max(0.001, r - b), s = new T.Shape(), x = -ww / 2, y = -hh / 2;
    s.moveTo(x + rr, y); s.lineTo(x + ww - rr, y); s.quadraticCurveTo(x + ww, y, x + ww, y + rr); s.lineTo(x + ww, y + hh - rr); s.quadraticCurveTo(x + ww, y + hh, x + ww - rr, y + hh);
    s.lineTo(x + rr, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.002, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 5 });
    g.translate(0, 0, -(d - 2 * b) / 2); return (gcache[key] = g);
  }
  const rb = (w, h, d, r, mat, x, y, z, par) => mesh(rgeo(w, h, d, r), mat, x, y, z, par);

  /* ---------- shared materials ---------- */
  const mMetal = M(0x7f93a6, { metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 });
  const mDark = M(0x151e28, { metalness: 0.6, roughness: 0.38, envMapIntensity: 1.1 });
  const mWhite = M(0xeef3f6, { roughness: 0.42 });
  const mGrey = M(0xc9d3da, { roughness: 0.5 });
  const mGlass = new T.MeshStandardMaterial({ color: 0xb4dcf2, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0.15, envMap: env, envMapIntensity: 1.6, side: T.DoubleSide, depthWrite: false });
  const eCy = E(0x36d6ff, 2.2), eWh = E(0xffffff, 1.6);
  const floorTex = ctex(512, 512, (g, w, h) => { g.fillStyle = "#101c28"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(120,190,255,.10)"; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } for (let i = 0; i < 700; i++) { g.fillStyle = "rgba(255,255,255," + (rnd() * 0.04) + ")"; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(7, 3);
  const cubTex = ctex(512, 512, (g, w, h) => { g.fillStyle = "#cfd9e0"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = "rgba(60,90,110," + (rnd() * 0.06) + ")"; g.fillRect(rnd() * w, rnd() * h, 3, 3); } g.strokeStyle = "rgba(90,120,140,.18)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h); });
  cubTex.wrapS = cubTex.wrapT = T.RepeatWrapping; cubTex.repeat.set(3, 2.5);
  const fabric = ctex(128, 128, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 90 + rnd() * 90; g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(rnd() * w, rnd() * h, 2, 1); } });
  fabric.wrapS = fabric.wrapT = T.RepeatWrapping; fabric.repeat.set(5, 5);

  /* ---------- corridor shell: floor, ceiling, light, end walls (also mirrored under the glossy floor) ---------- */
  const shell = new T.Group(); G.add(shell);
  const floor = mesh(new T.PlaneGeometry(2 * 8.4, 2 * FZ), new T.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: 0.14, metalness: 0.55, envMap: env, envMapIntensity: 1.1, transparent: true, opacity: 0.6 }), 0, 0, 0, G);
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1;
    const ceil = mesh(new T.PlaneGeometry(2 * 8.4, 2 * 7.4), M(0xe6edf2, { roughness: 0.85 }), 0, HT, 0, shell); ceil.rotation.x = Math.PI / 2;
  /* recessed LED light panels and a blue neon frame over the corridor */
  for (let i = -5; i <= 5; i++) for (const z of [-2.3, 2.3]) { const m = mesh(new T.PlaneGeometry(1.5, 0.42), E(0xf4fbff, 1.5), i * 1.5, HT - 0.004, z, shell); m.rotation.x = Math.PI / 2; }
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) { const m = mesh(new T.PlaneGeometry(1.2, 0.5), E(0xf4fbff, 1.4), XS[i] + k * 1.5, HT - 0.004, s * (FZ + 1.3), shell); m.rotation.x = Math.PI / 2; }
  const neon = new T.Group(); shell.add(neon);
  [[0, -0.9, 10, 0.07], [0, 0.9, 10, 0.07]].forEach((a) => bx(a[2], 0.05, a[3], eCy, a[0], HT - 0.03, a[1], neon));
  [[-5, 0, 0.07, 1.8], [5, 0, 0.07, 1.8]].forEach((a) => bx(a[2], 0.05, a[3], eCy, a[0], HT - 0.03, a[1], neon));
  const glowTex = ctex(64, 64, (g) => { const q = g.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, "rgba(120,220,255,.85)"); q.addColorStop(1, "rgba(120,220,255,0)"); g.fillStyle = q; g.fillRect(0, 0, 64, 64); });
  const halo = mesh(new T.PlaneGeometry(11.5, 3.2), new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, HT - 0.02, 0, shell); halo.rotation.x = Math.PI / 2;
  /* continuous blue cove lights along the heads of both rows */
  [-1, 1].forEach((s) => { bx(16.8, 0.04, 0.05, eCy, 0, HT - 0.06, s * (FZ - 0.07), shell); });
  /* end walls */
  [-1, 1].forEach((s) => {
    const w = mesh(new T.PlaneGeometry(2 * FZ, HT), M(0xc3cfd8, { metalness: 0.5, roughness: 0.3, envMapIntensity: 1.2 }), s * 8.4, HT / 2, 0, shell); w.rotation.y = -s * Math.PI / 2;
    bx(0.04, HT, 0.05, eCy, s * 8.38, HT / 2, -2.4, shell); bx(0.04, HT, 0.05, eCy, s * 8.38, HT / 2, 2.4, shell);
  });
  /* left end: steel double door with a vertical light strip, like the reference */
  { const g = new T.Group(); g.position.set(-8.37, 0, 0); g.rotation.y = Math.PI / 2; shell.add(g);
    rb(2.0, 2.5, 0.08, 0.04, mDark, 0, 1.25, 0, g); rb(0.92, 2.3, 0.04, 0.02, mMetal, -0.47, 1.25, 0.05, g); rb(0.92, 2.3, 0.04, 0.02, mMetal, 0.47, 1.25, 0.05, g);
    bx(0.04, 1.8, 0.02, eCy, 0, 1.3, 0.08, g); bx(0.5, 0.5, 0.02, new T.MeshBasicMaterial({ color: 0x0a2236 }), 0.47, 1.75, 0.075, g);
    cyl(0.014, 0.014, 0.5, mMetal, 0.1, 1.1, 0.09, g); cyl(0.014, 0.014, 0.5, mMetal, -0.1, 1.1, 0.09, g); }
  /* right end: ICU command panel (live) */
  const cmdTex = ctex(512, 800, () => {});
  { const g = new T.Group(); g.position.set(8.36, 1.75, 0); g.rotation.y = -Math.PI / 2; shell.add(g);
    rb(1.9, 3.0, 0.08, 0.1, mDark, 0, 0, 0, g); mesh(new T.PlaneGeometry(1.7, 2.65), new T.MeshBasicMaterial({ map: cmdTex, toneMapped: false }), 0, 0, 0.045, g); }

  /* fixed partitions between cubicles (glass) and outer walls (solid) */
  const doorsFrame = new T.Group(); shell.add(doorsFrame);
  [-1, 1].forEach((s) => {
    [-7.5, -2.5, 2.5, 7.5].forEach((x) => {
      const z = s * (FZ + CD / 2), solid = Math.abs(x) > 7;
      const pn = mesh(new T.PlaneGeometry(CD, GH), solid ? M(0xe3eaef, { roughness: 0.5, side: T.DoubleSide }) : mGlass, x, GH / 2, z, shell); pn.rotation.y = Math.PI / 2;
      bx(0.1, HT, 0.1, mMetal, x, HT / 2, s * FZ, shell); bx(0.07, GH, 0.07, mMetal, x, GH / 2, s * (FZ + CD), shell);
      bx(0.06, 0.06, CD, mMetal, x, GH, z, shell); bx(0.05, 0.05, CD, mMetal, x, 0.05, z, shell);
      if (!solid) bx(0.012, GH - 0.1, 0.02, eCy, x, GH / 2, s * FZ - s * 0.055, shell);
    });
  });

  /* ---------- cubicles ---------- */
  const BED = { x: 0.05, z: -2.0 }, TH = 0.5, cth = Math.cos(TH), sth = Math.sin(TH), LB = 0.95;
  const cubicles = [], hits = [], lamps = [];
  const BA = [], BPs = [];
  const order = [[0, -1, 0], [1, -1, 1], [2, -1, 2], [3, 1, 0], [4, 1, 1], [5, 1, 2]]; /* bed index, row sign, column */
  const skin = { m: 0xb98262, f: 0xc8946f };

  function bag(color, tag) {
    const g = new T.Group();
    const b = rb(0.11, 0.2, 0.04, 0.03, M(color, { transparent: true, opacity: 0.82, roughness: 0.15, envMapIntensity: 1.3 }), 0, -0.1, 0, g);
    cyl(0.006, 0.006, 0.05, mMetal, 0, 0.02, 0, g, 6); bx(0.07, 0.02, 0.045, mWhite, 0, -0.01, 0, g);
    return g;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawSign(c, p, i) {
    const g = c.sign.tex.userData.g, w = 1024, h = 340, col = ["#3dff9a", "#ffc24a", "#ff4d5e"][p.st || 0];
    g.clearRect(0, 0, w, h);
    const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, "rgba(10,26,46,.96)"); q.addColorStop(1, "rgba(4,12,24,.96)");
    g.fillStyle = q; rr(g, 8, 8, w - 16, h - 16, 26); g.fill();
    g.strokeStyle = "rgba(80,210,255,.9)"; g.lineWidth = 5; g.stroke();
    g.fillStyle = "#53e3ff"; g.font = "700 108px Figtree,system-ui,sans-serif"; g.textBaseline = "alphabetic"; g.fillText("Bed " + (i + 1), 52, 150);
    g.fillStyle = "#e8f6ff"; g.font = "600 66px Figtree,system-ui,sans-serif"; g.fillText(p.done ? p.dx + " · done" : p.dx, 56, 250, 700);
    g.fillStyle = col; g.beginPath();
    if (p.done) { g.arc(w - 150, h / 2, 64, 0, 7); g.fill(); g.strokeStyle = "#04121f"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(w - 182, h / 2 + 2); g.lineTo(w - 156, h / 2 + 30); g.lineTo(w - 112, h / 2 - 26); g.stroke(); }
    else if (p.st === 0) { g.arc(w - 150, h / 2, 64, 0, 7); g.fill(); g.strokeStyle = "#04121f"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(w - 182, h / 2 + 2); g.lineTo(w - 156, h / 2 + 30); g.lineTo(w - 112, h / 2 - 26); g.stroke(); }
    else { g.moveTo(w - 150, h / 2 - 72); g.lineTo(w - 82, h / 2 + 56); g.lineTo(w - 218, h / 2 + 56); g.closePath(); g.fill(); g.fillStyle = "#04121f"; g.fillRect(w - 156, h / 2 - 28, 12, 50); g.fillRect(w - 156, h / 2 + 32, 12, 12); }
    c.sign.tex.needsUpdate = true; c.sign.key = [p.st, p.done, p.dx].join("|");
  }

  function makeCubicle([i, row, col]) {
    const p = P[i], cx = row < 0 ? XS[col] : XS[col], g = new T.Group();
    const wx = row < 0 ? XS[col] : -XS[col];                      /* back row mirrors so beds 3, 4, 5 read right to left from the front */
    g.position.set(wx, 0, row * FZ); if (row > 0) g.rotation.y = Math.PI; G.add(g);
    BPs[i] = [wx, row * (FZ + CD / 2)]; BA[i] = Math.atan2(BPs[i][0], -BPs[i][1]);
    const c = { i, g, open: 0, target: 0, p };

    /* floor, back wall, head wall */
    const fl = mesh(new T.PlaneGeometry(CW, CD), new T.MeshStandardMaterial({ map: cubTex, roughness: 0.3, metalness: 0.1, envMap: env, envMapIntensity: 0.7 }), 0, 0.004, -CD / 2, g); fl.rotation.x = -Math.PI / 2;
    mesh(new T.PlaneGeometry(CW, HT), M(0xe7eef2, { roughness: 0.55 }), 0, HT / 2, -CD, g);
    bx(4.7, 0.62, 0.1, mGrey, 0, 1.5, -CD + 0.05, g); bx(4.7, 0.02, 0.12, mMetal, 0, 1.2, -CD + 0.06, g);
    [[-1.4, 0x2a6df0], [-1.1, 0xffffff], [-0.8, 0x111111], [0.9, 0xffd23a], [1.2, 0xffffff], [1.5, 0x2a6df0]].forEach((o) => { cyl(0.04, 0.04, 0.03, M(o[1], { roughness: 0.4 }), o[0], 1.5, -CD + 0.115, g, 14).rotation.x = Math.PI / 2; });
    bx(4.7, 0.025, 0.02, eCy, 0, 0.55, -CD + 0.012, g);            /* low cyan light line */
    bx(CW, 0.025, 0.03, eCy, 0, 0.012, -0.07, g);                  /* floor glow behind the glass */
    /* ceiling light inside the room */
    for (let k = -1; k <= 1; k++) { const m = mesh(new T.PlaneGeometry(1.0, 0.4), E(0xf4fbff, 1.5), k * 1.45, HT - 0.005, -CD / 2 - 0.2, g); m.rotation.x = Math.PI / 2; }

    /* ---- glass front: fixed panes, door, header ---- */
    [-1, 1].forEach((s) => { mesh(new T.PlaneGeometry(1.7, GH), mGlass, s * 1.65, GH / 2, 0, g); });
    [-1, 1].forEach((s) => { bx(0.07, GH, 0.09, mMetal, s * 0.8, GH / 2, 0.02, g); bx(0.012, GH - 0.1, 0.02, eCy, s * 0.8, GH / 2, 0.075, g); });
    bx(CW, 0.05, 0.1, mMetal, 0, 0.025, 0, g);
    bx(CW, 0.34, 0.14, mDark, 0, GH + 0.17, 0.02, g); bx(CW, 0.018, 0.02, eCy, 0, GH + 0.01, 0.1, g);
    const leaf = new T.Group(); leaf.position.set(0, 0, 0.05); g.add(leaf);
    mesh(new T.PlaneGeometry(1.56, GH - 0.1), mGlass, 0, GH / 2, 0, leaf);
    [[-0.78, 0.06, GH - 0.06], [0.78, 0.06, GH - 0.06]].forEach((a) => bx(a[1], a[2], 0.07, mMetal, a[0], GH / 2, 0, leaf));
    bx(1.62, 0.09, 0.07, mMetal, 0, 0.07, 0, leaf); bx(1.62, 0.09, 0.07, mMetal, 0, GH - 0.08, 0, leaf);
    cyl(0.014, 0.014, 0.62, M(0xdfe8ee, { metalness: 1, roughness: 0.15, envMapIntensity: 1.6 }), 0.62, 1.1, 0.07, leaf);
    cyl(0.014, 0.014, 0.62, M(0xdfe8ee, { metalness: 1, roughness: 0.15, envMapIntensity: 1.6 }), 0.7, 1.1, 0.07, leaf);
    const dled = bx(0.5, 0.018, 0.02, E(0x36d6ff, 2.4), 0, GH - 0.03, 0.045, leaf);
    c.leaf = leaf; c.dled = dled;
    /* overhead sign */
    const sign = { tex: ctex(1024, 340, () => {}), key: "" }; c.sign = sign;
    const sm = mesh(new T.PlaneGeometry(2.1, 0.7), new T.MeshBasicMaterial({ map: sign.tex, transparent: true, toneMapped: false }), 0, 2.62, 0.2, g);
    [-0.9, 0.9].forEach((s) => cyl(0.006, 0.006, 0.45, mMetal, s, 3.05, 0.2, g, 5));
    const lamp = mesh(new T.SphereGeometry(0.07, 12, 8), new T.MeshBasicMaterial({ color: 0x3dff9a, toneMapped: false }), 1.18, 2.62, 0.22, g); lamps[i] = lamp;
    /* hit target: the whole glass front */
    const hit = mesh(new T.BoxGeometry(CW, GH, 0.1), new T.MeshBasicMaterial({ visible: false }), 0, GH / 2, 0.12, g); hit.userData.bed = i; hits.push(hit);

    /* ---- bed ---- */
    const bd = new T.Group(); bd.position.set(BED.x, 0, BED.z); g.add(bd); c.bed = bd;
    const mWheel = M(0x0c0f12, { roughness: 0.6 });
    const hinge = [-0.05, 0.78], onBack = (u, off, z) => new V(hinge[0] - cth * u + sth * off, hinge[1] + sth * u + cth * off, z || 0);
    const bedX = buildBed(T, { M, rb, bx, cyl, mesh, ctex, rnd, V, onBack, TH, LB, mMetal, mDark, env, fabric });
    c.bedX = bedX; c.onBack = onBack;
    [bedX.frame, bedX.mattress, bedX.rails].forEach((o) => bd.add(o));
    /* pillow, patient */
    bd.add(bedX.pillow);
    const i0 = bd.children.length;
    const sk = M(skin[p.sx] || skin.m, { roughness: 0.62, envMapIntensity: 0.4 }), gown = M(0x8fc4d6, { roughness: 0.85, bumpMap: fabric, bumpScale: 0.8 });
    const nrm = new V(sth, cth, 0), fwd = new V(cth, -sth, 0);
    const head = new T.Mesh(new T.SphereGeometry(0.112, 24, 18), sk); head.scale.set(1, 1.14, 0.95); head.position.copy(onBack(LB + 0.0, 0.2)); bd.add(head);
    const hair = new T.Mesh(new T.SphereGeometry(0.118, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), M(p.sx === "f" ? 0x1a100c : 0x141414, { roughness: 0.9 }));
    hair.scale.copy(head.scale); hair.position.copy(head.position); hair.rotation.z = -TH + Math.PI / 2 + 0.15; bd.add(hair);
    if (p.sx === "f") { const hb = new T.Mesh(new T.SphereGeometry(0.1, 14, 10), hair.material); hb.scale.set(1.2, 0.8, 1.5); hb.position.copy(onBack(LB + 0.12, 0.12)); bd.add(hb); }
    c.eyeAnchor = head.position.clone().addScaledVector(nrm, 0.108).addScaledVector(fwd, -0.026);
    const nose = new T.Mesh(new T.ConeGeometry(0.018, 0.045, 8), sk); nose.position.copy(head.position).addScaledVector(nrm, 0.128).addScaledVector(fwd, 0.015); nose.quaternion.setFromUnitVectors(new V(0, 1, 0), nrm); bd.add(nose);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.CapsuleGeometry(0.004, 0.022, 3, 6), M(0x2a1c18, { roughness: 0.9 })); e.position.copy(head.position).addScaledVector(nrm, 0.108).addScaledVector(fwd, -0.026); e.position.z += s * 0.04; e.quaternion.setFromUnitVectors(new V(0, 1, 0), new V(0, 0, 1)); bd.add(e); });
    cyl(0.045, 0.05, 0.1, sk, 0, 0, 0, bd, 12).position.copy(onBack(LB - 0.1, 0.17));
    const chest = new T.Mesh(new T.CapsuleGeometry(0.15, 0.3, 6, 16), gown); chest.position.copy(onBack(0.46, 0.15)); chest.rotation.z = Math.PI / 2 - TH; chest.scale.set(0.66, 1, 1.45); bd.add(chest); c.chest = chest; c.chest0 = chest.scale.clone();
    /* arms: gown sleeve, skin forearm, hand, cannula and tape */
    const limb = (a, b, r1, r2, mat) => { const d = b.clone().sub(a), m = new T.Mesh(new T.CylinderGeometry(r2, r1, d.length(), 12), mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V(0, 1, 0), d.clone().normalize()); bd.add(m); return m; };
    [1, -1].forEach((s) => {
      const sh = onBack(0.72, 0.13, s * 0.235), el = onBack(0.4, 0.12, s * 0.3), hand = new V(0.0, 0.86, s * 0.3);
      const sph = new T.Mesh(new T.SphereGeometry(0.068, 14, 10), gown); sph.position.copy(sh); bd.add(sph);
      limb(sh, el, 0.058, 0.05, gown); const ej = new T.Mesh(new T.SphereGeometry(0.05, 12, 8), gown); ej.position.copy(el); bd.add(ej);
      limb(el, hand, 0.042, 0.032, sk);
      const hd = new T.Mesh(new T.SphereGeometry(0.045, 12, 8), sk); hd.scale.set(1.35, 0.55, 0.95); hd.position.set(hand.x - 0.04, hand.y - 0.012, hand.z); bd.add(hd);
      if (s === 1) { bx(0.055, 0.012, 0.05, mWhite, hand.x - 0.01, hand.y + 0.026, hand.z, bd); cyl(0.006, 0.006, 0.04, M(0x2f8fe0), hand.x - 0.01, hand.y + 0.04, hand.z, bd, 6); }
    });
    /* legs under the blanket */
    [1, -1].forEach((s) => { const lg = new T.Mesh(new T.CapsuleGeometry(0.06, 0.55, 4, 12), gown); lg.rotation.z = Math.PI / 2; lg.position.set(0.72, 0.84, s * 0.14); bd.add(lg); const ft = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), sk); ft.scale.set(1.3, 0.8, 0.9); ft.position.set(1.04, 0.86, s * 0.14); bd.add(ft); });
    { const proc = new T.Group(); bd.add(proc); bd.children.slice(i0, bd.children.length - 1).forEach((x) => proc.add(x)); c.proc = proc; }
    bd.add(bedX.sheetG);   /* top sheet draped over the legs; reshaped to the real legs when the body loads */

    /* ---- breathing support ---- */
    const mouth = head.position.clone().addScaledVector(nrm, 0.095).addScaledVector(fwd, 0.055);
    c.supp = {};
    const clear = M(0xbfe8f5, { transparent: true, opacity: 0.38, roughness: 0.1, envMapIntensity: 1.5, side: T.DoubleSide, depthWrite: false });
    function strap(r, mat) { const t = new T.Mesh(new T.TorusGeometry(r, 0.005, 6, 28), mat); t.position.copy(head.position); t.quaternion.setFromUnitVectors(new V(0, 0, 1), fwd); return t; }
    { const imv = new T.Group(), niv = new T.Group(), msk = new T.Group();
      const tube = M(0xe9f1f5, { roughness: 0.4, transparent: true, opacity: 0.92 });
      const cn = cyl(0.011, 0.011, 0.1, tube, 0, 0, 0, imv, 8); cn.position.copy(mouth).addScaledVector(nrm, 0.04); cn.quaternion.setFromUnitVectors(new V(0, 1, 0), nrm);
      const cm = rb(0.04, 0.03, 0.05, 0.01, M(0x2f8fe0), 0, 0, 0, imv); cm.position.copy(mouth).addScaledVector(nrm, 0.092);
      const tp = bx(0.07, 0.012, 0.045, mWhite, 0, 0, 0, imv); tp.position.copy(mouth).addScaledVector(nrm, 0.02).addScaledVector(fwd, 0.03); tp.position.z = 0.05; tp.rotation.z = -TH;
      const tp2 = tp.clone(); tp2.position.z = -0.05; imv.add(tp2);
      imv.add(strap(0.125, M(0xe8eef2, { roughness: 0.8 })));
      const mk = new T.Mesh(new T.SphereGeometry(0.075, 18, 12), clear); mk.scale.set(0.8, 0.55, 1.0); mk.position.copy(mouth).addScaledVector(nrm, 0.01).addScaledVector(fwd, -0.01); mk.quaternion.setFromUnitVectors(new V(0, 1, 0), nrm); niv.add(mk);
      const rim = new T.Mesh(new T.TorusGeometry(0.06, 0.007, 8, 22), M(0x2f8fe0)); rim.position.copy(mouth).addScaledVector(nrm, -0.012).addScaledVector(fwd, -0.01); rim.quaternion.setFromUnitVectors(new V(0, 0, 1), nrm); rim.scale.set(1, 0.8, 1); niv.add(rim);
      const nport = cyl(0.014, 0.014, 0.05, M(0x2f8fe0), 0, 0, 0, niv, 8); nport.position.copy(mouth).addScaledVector(nrm, 0.06); nport.quaternion.setFromUnitVectors(new V(0, 1, 0), nrm);
      niv.add(strap(0.126, M(0x394650, { roughness: 0.8 })));
      const om = new T.Mesh(new T.SphereGeometry(0.085, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0xa9e2c4, { transparent: true, opacity: 0.62, roughness: 0.2, side: T.DoubleSide, depthWrite: false })); om.scale.set(0.9, 1.1, 1.05); om.position.copy(mouth).addScaledVector(nrm, -0.02); om.quaternion.setFromUnitVectors(new V(0, 1, 0), nrm); msk.add(om);
      msk.add(strap(0.125, M(0xdddddd, { roughness: 0.8 })));
      imv.userData.part = "Endotracheal tube"; niv.userData.part = "NIV mask"; msk.userData.part = "Oxygen mask"; bd.add(imv); bd.add(niv); bd.add(msk); c.supp = { imv, niv, mask: msk };
    }
    /* oxygen flow meter on the head wall (mask and room air) */
    const fm = new T.Group(); fm.position.set(1.9, 1.5, -CD + 0.14); g.add(fm); cyl(0.022, 0.022, 0.2, clear, 0, 0, 0, fm, 10); cyl(0.012, 0.012, 0.03, M(0xff9a2a), 0, 0.06, 0, fm, 8); c.fm = fm;

    /* ---- wall monitor on an arm, live screen ---- */
    const mg = new T.Group(); mg.userData.part = "Multiparameter monitor"; mg.position.set(0.1, 1.78, -CD + 0.75); mg.rotation.x = -0.06; g.add(mg);
    cyl(0.025, 0.025, 0.7, mMetal, 0, 0.0, -0.36, mg, 8).rotation.x = Math.PI / 2; bx(0.12, 0.12, 0.05, mDark, 0, 0, -0.01, mg);
    rb(0.8, 0.58, 0.07, 0.03, mDark, 0, 0, 0.03, mg);
    const monTex = ctex(512, 362, () => {}); c.mon = monTex;
    mesh(new T.PlaneGeometry(0.72, 0.508), new T.MeshBasicMaterial({ map: monTex, toneMapped: false }), 0, 0, 0.0672, mg);
    bx(0.7, 0.012, 0.01, eCy, 0, -0.29, 0.07, mg);
    /* ---- ventilator trolley (left of the bed head), live screen ---- */
    const vg = new T.Group(); vg.userData.part = "Ventilator"; vg.position.set(-1.75, 0, -CD + 0.65); vg.rotation.y = 0.22; g.add(vg); c.vent = vg;
    rb(0.52, 0.06, 0.5, 0.02, mDark, 0, 0.12, 0, vg); cyl(0.04, 0.04, 0.85, mMetal, 0, 0.55, 0, vg, 10);
    [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]].forEach((q) => cyl(0.04, 0.04, 0.03, mWheel, q[0], 0.04, q[1], vg, 10));
    rb(0.5, 0.36, 0.3, 0.04, M(0x252d35, { metalness: 0.55, roughness: 0.35 }), 0, 1.15, 0, vg);
    const vTex = ctex(300, 200, () => {}); c.vtex = vTex;
    mesh(new T.PlaneGeometry(0.32, 0.213), new T.MeshBasicMaterial({ map: vTex, toneMapped: false }), -0.05, 1.19, 0.153, vg);
    cyl(0.025, 0.025, 0.02, E(0x36d6ff, 1.5), 0.17, 1.09, 0.155, vg, 12).rotation.x = Math.PI / 2; cyl(0.025, 0.025, 0.02, mMetal, 0.17, 1.2, 0.155, vg, 12).rotation.x = Math.PI / 2;
    cyl(0.07, 0.07, 0.2, clear, 0.22, 1.0, -0.05, vg, 16).position.y = 0.97;
    /* breathing circuit from the tracheal tube to the ventilator */
    const cvec = (x, y, z) => new V(x, y, z);
    const cm0 = mouth.clone().addScaledVector(nrm, 0.095).add(new V(BED.x, 0, BED.z));
    const vOut = cvec(-1.75 + 0.1, 1.05, -CD + 0.7), vIn = cvec(-1.75 + 0.2, 1.05, -CD + 0.7);
    const mkTube = (a, b, dz) => { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([a, new V((a.x + b.x) / 2, Math.max(a.y, b.y) + 0.12, (a.z + b.z) / 2 + dz), b]), 28, 0.014, 8), M(0xe4edf1, { roughness: 0.35, transparent: true, opacity: 0.9, envMapIntensity: 1.2 })); return m; };
    const mkCirc = (d) => { const a = cm0.clone().add(d || new V()), k = new T.Group(); k.add(mkTube(a, vOut, 0.1)); k.add(mkTube(a.clone().add(cvec(0.01, 0.015, 0.02)), vIn, -0.05)); return k; };
    const circ = mkCirc(); circ.userData.part = "Ventilator circuit"; g.add(circ); c.circ = circ; c.mkCirc = mkCirc;

    /* ---- IV pole, bags, pump stack ---- */
    const pg = new T.Group(); pg.userData.part = "IV pole, bags and infusion pumps"; pg.position.set(1.55, 0, -CD + 0.9); g.add(pg); c.pole = pg;
    const chrome = M(0xdfe8ee, { metalness: 1, roughness: 0.2, envMapIntensity: 1.6 });
    cyl(0.014, 0.014, 2.05, chrome, 0, 1.03, 0, pg, 8); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, l = bx(0.3, 0.02, 0.025, chrome, Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15, pg); l.rotation.y = -a; }
    bx(0.62, 0.016, 0.016, chrome, 0, 2.05, 0, pg);
    c.bags = [bag(0xe6edc8), bag(0xd5ecf4), bag(0x8b1a22), bag(0xf0e2a0)].map((b, k) => { b.position.set(-0.22 + k * 0.15, 2.04, 0.0); b.visible = false; pg.add(b); return b; });
    const pump = new T.Group(); pg.add(pump); c.pump = pump; pump.visible = false;
    rb(0.3, 0.8, 0.2, 0.03, M(0xdfe5e9, { roughness: 0.4 }), 0.12, 1.25, 0, pump);
    const pTex = ctex(256, 512, () => {}); c.ptex = pTex; c.pkey = "";
    mesh(new T.PlaneGeometry(0.26, 0.74), new T.MeshBasicMaterial({ map: pTex, toneMapped: false }), 0.12, 1.25, 0.103, pump);
    c.pdrip = [];
    /* tubing from the pole to the cannula */
    const lineMat = M(0xe8f1f5, { transparent: true, opacity: 0.8, roughness: 0.3 });
    const mkLine = (end) => { const l = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([cvec(1.55 - 0.1, 1.3, -CD + 0.9 + 0.1), cvec(1.2, 1.0, -2.7), cvec(0.8, 0.95, -2.1), end]), 24, 0.006, 6), lineMat); return l; };
    let line = mkLine(cvec(BED.x + 0.26, 0.92, BED.z + 0.29)); line.userData.part = "IV line"; c.mkLine = mkLine;
    g.add(line); c.line = line; line.visible = false; c.lineEnd = null;
    /* sharps bin and hand rub */
    cyl(0.14, 0.12, 0.34, M(0xf3c71d, { roughness: 0.4 }), 2.1, 0.17, -1.0, g, 16); cyl(0.145, 0.145, 0.03, M(0x1a1a1a), 2.1, 0.355, -1.0, g, 16);
    rb(0.09, 0.2, 0.07, 0.02, mWhite, -2.2, 1.3, -CD + 0.09, g);
    c.facing = false;
    drawSign(c, p, i);
    cubicles[i] = c; return c;
  }
  order.forEach(makeCubicle);

  /* mirrored shell under the glossy floor (a cheap, convincing reflection) */
  const mir = shell.clone(true); mir.scale.y = -1; G.add(mir);
  /* extra light for the corridor and cubicles */
  [-5, 0, 5].forEach((x) => { const l = new T.PointLight(0xd8f0ff, 10, 14, 1.6); l.position.set(x, 3.0, 0); G.add(l); });
  const LOW = typeof matchMedia === "function" && matchMedia("(pointer:coarse)").matches;   /* phones: fewer dynamic lights, the environment map carries the rest */
  (LOW ? [] : [[-5, -1], [0, -1], [5, -1], [-5, 1], [0, 1], [5, 1]]).forEach((q) => { const l = new T.PointLight(0xe6f6ff, 6, 6.5, 1.6); l.position.set(q[0], 2.9, q[1] * (FZ + 2.0)); G.add(l); });

  /* ---------- live command panel ---------- */
  let cmdKey = "";
  function drawCmd() {
    const alerts = P.filter((p) => !p.done && p.st > 0).length, vents = P.filter((p) => p.iv).length, done = P.filter((p) => p.done).length;
    const key = [alerts, vents, done].join(); if (key === cmdKey) return; cmdKey = key;
    const g = cmdTex.userData.g, w = 512, h = 800;
    const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, "#0b2038"); q.addColorStop(1, "#05101e"); g.fillStyle = q; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#35c7ff"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = "#53e3ff"; g.font = "700 50px Figtree,system-ui,sans-serif"; g.fillText("ICU COMMAND", 34, 90);
    const row = (y, lab, val, col) => { g.fillStyle = "#9fc3e4"; g.font = "600 34px Figtree,system-ui,sans-serif"; g.fillText(lab, 34, y); g.fillStyle = col; g.font = "700 76px Figtree,system-ui,sans-serif"; g.fillText(val, 34, y + 78); };
    row(165, "Beds occupied", "6/6", "#e8f6ff"); row(315, "Alerts", String(alerts), alerts ? "#ff6b78" : "#3dff9a"); row(465, "Ventilated", vents + "/6", "#e8f6ff"); row(615, "Cases done", done + "/6", "#3dff9a");
    cmdTex.needsUpdate = true;
  }

  /* ---------- pump and bag state ---------- */
  function refreshEquip(c) {
    const gear = H.equip(c.p), bags = gear.bags.slice(0, 4), pumps = gear.pumps.slice(0, 6);
    const key = bags.map((b) => b.key).join() + "|" + pumps.map((x) => x.name + x.dose).join();
    if (key === c.pkey) return; c.pkey = key;
    const cols = { rl: 0xe6edc8, ns: 0xd5ecf4, blood: 0x8b1a22 };
    c.bags.forEach((b, k) => { b.visible = k < bags.length; if (k < bags.length) b.children[0].material.color.set(cols[bags[k].key] || 0xe6edc8); });
    c.pump.visible = pumps.length > 0; c.line.visible = pumps.length > 0 || bags.length > 0;
    const g = c.ptex.userData.g; g.fillStyle = "#0a1119"; g.fillRect(0, 0, 256, 512);
    for (let k = 0; k < 6; k++) { const y = k * 85 + 3; g.fillStyle = k < pumps.length ? "#0c2a22" : "#10161d"; g.fillRect(6, y, 244, 78);
      if (k < pumps.length) { g.fillStyle = "#3dff9a"; g.font = "600 24px system-ui"; g.fillText(pumps[k].name.slice(0, 16), 14, y + 30); g.fillStyle = "#e8fff2"; g.font = "700 30px monospace"; g.fillText(pumps[k].dose + " " + pumps[k].unit.slice(0, 10), 14, y + 64); } }
    c.ptex.needsUpdate = true;
  }

  /* ---------- update ---------- */
  let n = 0, eq = 0;
  const angd = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  function update(t, dt, yaw, all) {
    n++;
    neon.children.forEach((m) => { });
    halo.material.opacity = 0.3 + 0.08 * Math.sin(t * 1.2);
    cubicles.forEach((c) => {
      const d = c.target - c.open; c.open += Math.sign(d) * Math.min(Math.abs(d), dt * 0.85);
      const e = c.open * c.open * (3 - 2 * c.open); c.leaf.position.x = -1.64 * e;
      c.dled.material.color.set(e > 0.5 ? 0x3dff9a : 0x36d6ff).multiplyScalar(2.4);
      const p = c.p, face = all || angd(BA[c.i], yaw) < 1.35; c.facing = face;
      if (c.human) breathe(c.human, p.vo || 0, 0.035 + 0.02 * Math.min(1, Math.max(0, (p.v.rr - 16) / 20))); else c.chest.scale.set(c.chest0.x * (1 + 0.09 * (p.vo || 0)), c.chest0.y, c.chest0.z * (1 + 0.04 * (p.vo || 0)));
      const key = [p.st, p.done, p.dx].join("|"); if (key !== c.sign.key) drawSign(c, p, c.i);
      const air = p.air, iv = p.iv;
      c.supp.imv.visible = air === "imv"; c.supp.niv.visible = air === "niv"; c.supp.mask.visible = air === "mask";
      c.circ.visible = !!iv; c.vent.visible = !!iv; c.fm.visible = air === "mask" || air === "room";
      if (face && n % 2 === 0) {
        H.mon(c.mon.userData.g, p, 512, 362, 0, 0); c.mon.needsUpdate = true;
        if (iv) { H.rdr(c.vtex.userData.g, p); c.vtex.needsUpdate = true; }
      }
    });
    if (t - eq > 1) { eq = t; cubicles.forEach(refreshEquip); drawCmd(); }
  }
  drawCmd();
  cubicles.forEach(refreshEquip);

  /* ---------- real human bodies (GLB), loaded after the first frame; the procedural patient stays as the fallback ---------- */
  const skins = [0xb98262, 0xa9714f, 0xc28e68, 0xb07a58, 0xc69773, 0x9f6a49];
  function attachHuman(c) {
    const f = patientFile(c.p), url = new URL("./patients/" + f.key + ".glb", import.meta.url).href;
    loadArchetype(url).then((gltf) => {
      const h = buildPerson(T, gltf, c.p, { skin: skins[c.i % skins.length], hair: f.age > 60 ? 0x9a9a9a : 0x15110f, longHair: f.sex === "f", incline: TH, pose: c.i });
      h.group.userData.part = "Patient"; c.bed.add(h.group);
      h.group.scale.setScalar((gltf.scene.userData && gltf.scene.userData.patientScale) || (gltf.scene.children[1] && gltf.scene.children[1].userData.patientScale) || (f.sex === "m" ? 1.1 : 1.04));
      c.bed.updateMatrixWorld(true);
      const bedPos = (o) => c.bed.worldToLocal(o.getWorldPosition(new V()));
      /* seat the hips on the mattress: the pelvis joint sits just above the seat, the spine follows the raised back section */
      h.group.position.set(0, 0, 0); h.group.updateMatrixWorld(true);
      const hip = bedPos(h.B("spine05")), want = c.onBack(0.1, c.bedX.SB + 0.115);
      h.group.position.copy(want).sub(hip); h.group.position.z = 0; h.group.updateMatrixWorld(true);
      /* move the airway equipment to the real face (it was placed for the simple figure) */
      const a = h.B("eye.L"), b = h.B("eye.R");
      if (a && b) {
        const m = new V().addVectors(bedPos(a), bedPos(b)).multiplyScalar(0.5), d = m.clone().sub(c.eyeAnchor);
        ["imv", "niv", "mask"].forEach((k) => { if (c.supp[k]) c.supp[k].position.add(d); });
        const vis = c.circ.visible; g_remove(c.circ); c.circ = c.mkCirc(d); c.circ.userData.part = "Ventilator circuit"; c.circ.visible = vis; c.g.add(c.circ);
        /* sheet follows the real legs */
        const hp = bedPos(h.B("spine05")), thL = bedPos(h.B("upperleg02.L")), kn = bedPos(h.B("lowerleg01.L")), an = bedPos(h.B("lowerleg02.L")), lz = Math.abs(thL.z) || 0.11;
        const pts = [[hp.x, hp.y + 0.02, 0.13], [(hp.x + kn.x) / 2, (hp.y + kn.y) / 2 + 0.025, 0.115], [kn.x, kn.y + 0.02, 0.09], [an.x, an.y + 0.015, 0.066]];
        c.bedX.setLegs([{ z: lz, pts }, { z: -lz, pts }], -0.02, an.x + 0.03);
        /* IV cannula on the wrist nearest the glass */
        const wl = h.B("wrist.L"), wr = h.B("wrist.R"); let best = null, bz = -9;
        [wl, wr].forEach((w) => { if (!w) return; const q = bedPos(w); if (q.z > bz) { bz = q.z; best = q; } });
        if (best) { const ge = best.clone().add(new V(BED.x, 0.02, BED.z)); const vis2 = c.line.visible; g_remove(c.line); c.line = c.mkLine(ge); c.line.userData.part = "IV line"; c.line.visible = vis2; c.g.add(c.line); }
      }
      c.proc.visible = false; c.human = h;
    }).catch((e) => console.warn("Patient model not loaded; using the simple figure.", e));
  }
  const g_remove = (o) => { if (o.parent) o.parent.remove(o); };
  let humansLoaded = false;
  const loadHumans = () => { if (humansLoaded || H.humans === false) return; humansLoaded = true; cubicles.forEach(attachHuman); };

  /* ---------- selection: tap a part in the 3D bed view ---------- */
  const selBox = new T.Box3Helper(new T.Box3(), 0x36d6ff); selBox.visible = false; selBox.renderOrder = 9; selBox.material.depthTest = false; G.add(selBox);
  const shown = (o) => { for (; o; o = o.parent) if (o.visible === false) return false; return true; };
  const partOf = (o) => { for (; o; o = o.parent) if (o.userData && o.userData.part) return o; return null; };
  function select(i, ray) {
    if (!ray) { selBox.visible = false; return ""; }
    const hit = ray.intersectObjects(cubicles[i].g.children, true).find((h) => shown(h.object) && partOf(h.object));
    if (!hit) { selBox.visible = false; return ""; }
    const part = partOf(hit.object); selBox.box.makeEmpty(); selBox.box.setFromObject(part, true); selBox.visible = !selBox.box.isEmpty();
    return part.userData.part;
  }
  return {
    select, bedCenter: (i) => cubicles[i].bed.localToWorld(new V(0.35, 0.95, 0)),
    G, BP: (i) => BPs[i], BA, hits, lamps, update, cubicles, loadHumans,
    setDoor: (i, o) => { cubicles[i].target = o ? 1 : 0; },
    door: (i) => cubicles[i].open,
    closeAll: () => cubicles.forEach((c) => { c.target = 0; }),
    /* where the doctor stops in front of the glass, and where the bed foot is */
    approach: (i) => { const b = BPs[i], s = Math.sign(b[1]); return new V(b[0], 1.6, s * (FZ - 1.45)); },
    inside: (i) => { const b = BPs[i], s = Math.sign(b[1]); return new V(b[0] + 0.1, 1.7, s * (FZ + 0.45)); },
    look: (i) => { const b = BPs[i], s = Math.sign(b[1]); return new V(b[0] + (s < 0 ? 0.05 : -0.05), 0.95, s * (FZ + 2.0)); }
  };
}
