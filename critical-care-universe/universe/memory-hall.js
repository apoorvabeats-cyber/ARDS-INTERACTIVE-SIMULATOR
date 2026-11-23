/* CRITICAL CARE HUB – MEMORY LAB: the first-floor hall opposite the Video Auditorium (above the Critical Care Hub, west of the lobby).
   A round, high-tech hall: a holographic Memory Core, a curved LED wall with the learner's live numbers, seven floating card-type pods,
   four quick-start panels and two teaching panels. Everything is tappable and opens the Memory Lab (./memory-lab/) in a full-screen overlay.
   The numbers on the wall come from localStorage "ccmem.summary", which the Memory Lab writes after each review.

   buildMemoryHall(T, ctx, top, LV, YCUT) -> { gate, MC, MR, inHall(p), cands(x,z), solid(px,pz), update(t,dt,cam), tap(kind,hit), refresh() }
   mountMemoryUI(up, getPos) -> the DOM button and the full-screen overlay (up.openMemory(route)). */

export const MEM_VER = "20261123l";
const KINDS = [["recall", "Clinical recall", "Question → answer", "#36d6ff"], ["image", "Image recognition", "ECG & findings", "#7aa8ff"], ["wave", "Waveform recognition", "Vent · ECG · art line · capno", "#27e0b0"], ["decision", "Clinical decision", "Scenario → next step", "#ffb347"], ["drug", "Drug recall", "Dose · mechanism · renal", "#ff7ab6"], ["anat", "Anatomy & physiology", "Structures & mechanisms", "#a78bff"], ["guide", "Guideline recall", "KDIGO · SSC · AHA · IDSA", "#8be34f"]];
const PANELS = [["start", "DAILY REVISION", "Your due cards + new cards", "#36d6ff"], ["rapid", "RAPID RECALL", "60-second challenge", "#ffb347"], ["weak", "WEAK MEMORY ZONE", "Cards you keep missing", "#ff7ab6"], ["stats", "MEMORY ANALYTICS", "Retention · streak · forecast", "#27e0b0"]];

export function buildMemoryHall(T, c, top, LV) {
  const { mesh, bx, cyl, pl, ctex, dcv, makeDoor, wallMat, slats, cyan, cyanDim, white, M, E, LOW, AU, ZC, RHN } = c;
  const PI = Math.PI, V = T.Vector3;
  const MR = RHN - 0.05, MC = { x: AU.x0 - 0.7 - RHN + 0.06, z: ZC }, YC = LV + 9.4;
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const hall = new T.Group(); hall.name = "memoryHall"; hall.visible = false; top.add(hall);
  const txt = (g, s, x, y, px, col, al, wt, glow) => { g.font = (wt || 700) + " " + px + "px system-ui,sans-serif"; g.fillStyle = col || "#e4f6ff"; g.textAlign = al || "left"; g.textBaseline = "middle"; g.shadowColor = glow || "transparent"; g.shadowBlur = glow ? px * 0.35 : 0; g.fillText(s, x, y); g.shadowBlur = 0; };
  const basic = (map, o) => new T.MeshBasicMaterial(Object.assign({ map, toneMapped: false }, o || {}));
  const panelBg = (g, w, h, a, b) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a || "#06182a"); gr.addColorStop(1, b || "#0a2a46"); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const frame = (g, w, h, col, lw) => { g.strokeStyle = col || "#36d6ff"; g.lineWidth = lw || 4; g.strokeRect(lw / 2 || 2, lw / 2 || 2, w - (lw || 4), h - (lw || 4)); };
  let seed = 20261123; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const ga = Math.asin(1.5 / MR);
  const VIO = 0x9b7bff;

  /* ---------- the gate in the lobby's west wall ---------- */
  const gate = makeDoor("mhall", AU.x0 + 0.02, ZC, 3.0, 4.4, VIO, top);
  gate.g.rotation.y = PI / 2; gate.g.position.y = LV; gate.axis = "x"; gate.center = new V(AU.x0, LV, ZC);
  const gateSign = ctex(768, 200, (g, w, h) => {
    g.fillStyle = "#07101c"; g.fillRect(0, 0, w, h); g.strokeStyle = "#9b7bff"; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.shadowColor = "#9b7bff"; g.shadowBlur = 14; g.strokeStyle = "#9b7bff"; g.fillStyle = "#9b7bff"; g.lineWidth = 4;
    const nodes = [[80, 70], [130, 52], [150, 100], [100, 130], [58, 112], [112, 92]]; g.beginPath(); [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4]].forEach(([a, b]) => { g.moveTo(nodes[a][0], nodes[a][1]); g.lineTo(nodes[b][0], nodes[b][1]); }); g.stroke();
    nodes.forEach((n, i) => { g.beginPath(); g.arc(n[0], n[1], i === 5 ? 9 : 6, 0, 7); g.fill(); }); g.shadowBlur = 0;
    txt(g, "MEMORY LAB", 196, 78, 56, "#eef4ff", "left", 800, "#9b7bff"); txt(g, "Critical Care Hub · First floor", 198, 138, 28, "#b9a8ff", "left", 500);
  });
  { const m = new T.Mesh(new T.PlaneGeometry(2.4, 2.4 * 200 / 768), basic(gateSign)); m.position.set(AU.x0 + 0.05, LV + 4.98, ZC); m.rotation.y = PI / 2; m.userData.door = "mhall"; top.add(m); }

  /* ---------- shell ---------- */
  const slatT = slats.clone(); slatT.needsUpdate = true; slatT.repeat.set(36, 3); slatT.wrapS = slatT.wrapT = T.RepeatWrapping;
  const hallWall = M(0x8fa0c8, { map: slatT, roughness: 0.8, metalness: 0.2, side: T.BackSide });
  { const wallH = YC - LV, g = new T.CylinderGeometry(MR, MR, wallH, 120, 1, true, PI / 2 + ga, 2 * PI - 2 * ga); const m = new T.Mesh(g, hallWall); m.position.set(MC.x, LV + wallH / 2, MC.z); hall.add(m);
    const hh = YC - (LV + 4.4), g2 = new T.CylinderGeometry(MR, MR, hh, 12, 1, true, PI / 2 - ga, 2 * ga); const m2 = new T.Mesh(g2, hallWall); m2.position.set(MC.x, LV + 4.4 + hh / 2, MC.z); hall.add(m2); }
  /* floor: a neural network etched in light */
  const floorTx = ctex(1024, 1024, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, w / 2); gr.addColorStop(0, "#14123a"); gr.addColorStop(0.45, "#0a1226"); gr.addColorStop(1, "#050914"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(120,140,255,.10)"; g.lineWidth = 2; for (let i = 1; i < 12; i++) { g.beginPath(); g.arc(w / 2, h / 2, i * w / 24, 0, 7); g.stroke(); }
    const pts = []; for (let i = 0; i < 150; i++) { const a = rnd() * 2 * PI, r = Math.sqrt(rnd()) * w * 0.47; pts.push([w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r]); }
    g.lineWidth = 2; pts.forEach((p, i) => { pts.forEach((q, j) => { if (j <= i) return; const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < 105) { g.strokeStyle = "rgba(110,150,255," + (0.28 * (1 - d / 105)).toFixed(3) + ")"; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } }); });
    pts.forEach((p) => { g.fillStyle = "rgba(160,190,255,.55)"; g.beginPath(); g.arc(p[0], p[1], 3, 0, 7); g.fill(); });
  });
  { const f = mesh(new T.CircleGeometry(MR, 96), M(0xffffff, { map: floorTx, roughness: 0.2, metalness: 0.5, envMapIntensity: 1.1 }), MC.x, LV + 0.003, MC.z, hall); f.rotation.x = -PI / 2; }
  [[1.9, 2.0, 0x9b7bff, 2.2], [3.0, 3.05, 0x36d6ff, 1.8], [4.4, 4.45, 0xeaf6ff, 1.2], [6.9, 6.95, 0x2a7fb8, 1.6], [9.6, 9.68, 0x9b7bff, 1.4]].forEach((r) => { const m = mesh(new T.RingGeometry(r[0], r[1], 128), E(r[2], r[3]), MC.x, LV + 0.012, MC.z, hall); m.rotation.x = -PI / 2; });
  { const m = mesh(new T.CircleGeometry(1.9, 64), new T.MeshBasicMaterial({ color: 0x1a1450, transparent: true, opacity: 0.6, toneMapped: false }), MC.x, LV + 0.008, MC.z, hall); m.rotation.x = -PI / 2; }
  /* the entrance passage */
  { const px0 = MC.x + Math.sqrt(MR * MR - 1.5 * 1.5) - 0.12, px1 = AU.x0 + 0.02, len = px1 - px0, cx = (px0 + px1) / 2;
    mesh(new T.PlaneGeometry(len, 3.0), M(0x0b1118, { roughness: 0.3, metalness: 0.5 }), cx, LV + 0.004, ZC, hall).rotation.x = -PI / 2;
    [-1, 1].forEach((s) => pl(len, 4.4, M(0x0a0f14, { side: T.DoubleSide }), cx, LV + 2.2, ZC + s * 1.5, 0, 0, hall)); pl(len, 3.0, M(0x0a0f14, { side: T.DoubleSide }), cx, LV + 4.4, ZC, 0, PI / 2, hall); }
  /* ceiling: light rings, radial fins */
  mesh(new T.CircleGeometry(MR, 72), M(0x080b14, { roughness: 0.9, side: T.DoubleSide }), MC.x, YC, MC.z, hall).rotation.x = PI / 2;
  [2.6, 4.4, 6.4, 8.6].forEach((r, i) => { const t = mesh(new T.TorusGeometry(r, i ? 0.05 : 0.09, 8, 110), E(i === 0 ? 0x9b7bff : i === 1 ? 0xeaf6ff : 0x36d6ff, 2), MC.x, YC - 0.06, MC.z, hall); t.rotation.x = PI / 2; });
  for (let i = 0; i < 16; i++) { const a = i * PI / 8, m = bx(0.08, 0.03, 4.6, white, MC.x + Math.cos(a) * 5.2, YC - 0.03, MC.z + Math.sin(a) * 5.2, hall); m.rotation.y = -a + PI / 2; }
  /* wall light fins (not behind the screen or in the entrance) */
  for (let i = 0; i < 40; i++) { const a = i * PI / 20 + 0.04, x = MC.x + (MR - 0.06) * Math.sin(a), z = MC.z + (MR - 0.06) * Math.cos(a), d = Math.abs(Math.atan2(Math.sin(a + PI / 2), Math.cos(a + PI / 2)));
    if (d < 62 * PI / 180 + 0.06) continue; if (Math.abs(Math.atan2(Math.sin(a - PI / 2), Math.cos(a - PI / 2))) < ga + 0.12) continue; const m = bx(0.05, 9.2, 0.06, i % 2 ? cyanDim : E(VIO, 1.5), x, LV + 5.0, z, hall); m.rotation.y = a; }

  /* ---------- the Memory Core ---------- */
  const core = new T.Group(); core.position.set(MC.x, LV, MC.z); hall.add(core);
  cyl(1.25, 1.45, 0.5, M(0x121626, { metalness: 0.7, roughness: 0.3, envMapIntensity: 1.2 }), 0, 0.25, 0, core, 48);
  { const r = new T.Mesh(new T.RingGeometry(0.95, 1.2, 64), E(VIO, 2.2)); r.rotation.x = -PI / 2; r.position.y = 0.52; core.add(r); }
  cyl(1.5, 1.5, 0.05, E(0x36d6ff, 2), 0, 0.03, 0, core, 48);
  const gy = [[1.0, 0x36d6ff, 0], [1.3, VIO, 1], [1.62, 0xeaf6ff, 2]].map((o, i) => { const t = new T.Mesh(new T.TorusGeometry(o[0], 0.022, 8, 90), E(o[1], 2.2)); t.position.y = 2.3; core.add(t); t.userData.k = i; return t; });
  const lat = new T.Mesh(new T.IcosahedronGeometry(0.62, 2), new T.MeshBasicMaterial({ color: 0x8fb4ff, wireframe: true, transparent: true, opacity: 0.8, toneMapped: false })); lat.position.y = 2.3; core.add(lat);
  const nucleus = new T.Mesh(new T.SphereGeometry(0.24, 24, 16), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); nucleus.position.y = 2.3; core.add(nucleus);
  const beam = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, YC - LV - 0.5, 8, 1, true), new T.MeshBasicMaterial({ color: 0x9b7bff, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); beam.position.y = 0.5 + (YC - LV - 0.5) / 2; core.add(beam);
  /* orbiting memory nodes joined by faint synapses */
  const nodes = new T.Group(); nodes.position.y = 2.3; core.add(nodes);
  { const N = LOW ? 110 : 220, P = new Float32Array(N * 3), L = [];
    for (let i = 0; i < N; i++) { const u = rnd() * 2 - 1, a = rnd() * 2 * PI, r = 1.0 + rnd() * 1.1, s = Math.sqrt(1 - u * u); P[i * 3] = r * s * Math.cos(a); P[i * 3 + 1] = r * u * 0.8; P[i * 3 + 2] = r * s * Math.sin(a); }
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const d = Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]); if (d < (LOW ? 0.55 : 0.42)) L.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], P[j * 3], P[j * 3 + 1], P[j * 3 + 2]); }
    const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(P, 3)); nodes.add(new T.Points(pg, new T.PointsMaterial({ color: 0xbfd0ff, size: 0.07, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false })));
    const lg = new T.BufferGeometry(); lg.setAttribute("position", new T.BufferAttribute(new Float32Array(L), 3)); nodes.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x7b8cff, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false }))); }
  /* the tagline ring */
  const tagTx = ctex(2048, 96, (g, w, h) => { g.clearRect(0, 0, w, h); const s = "LEARN TODAY  ·  RECALL TOMORROW  ·  REMEMBER FOR LIFE  ·  "; g.font = "800 54px system-ui,sans-serif"; g.textBaseline = "middle"; g.fillStyle = "#cfd8ff"; g.shadowColor = "#9b7bff"; g.shadowBlur = 16; const sw = g.measureText(s).width, n = Math.round(w / sw), sc = w / (sw * n); g.scale(sc, 1); for (let i = 0; i < n; i++) g.fillText(s, i * sw, h / 2); });
  tagTx.wrapS = T.RepeatWrapping;
  const ring = new T.Mesh(new T.CylinderGeometry(1.95, 1.95, 0.34, 96, 1, true), new T.MeshBasicMaterial({ map: tagTx, transparent: true, side: T.FrontSide, depthWrite: false, toneMapped: false })); ring.position.y = 1.05; core.add(ring);
  const coreHit = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 3.8, 16), new T.MeshBasicMaterial({ visible: false })); coreHit.position.y = 1.9; coreHit.userData.vhall = "m:home"; core.add(coreHit);

  /* ---------- seven card-type pods ---------- */
  const pods = [];
  KINDS.forEach((k, i) => {
    const a = (i + 1) * PI / 4, R = 7.0, x = MC.x + Math.cos(a) * R, z = MC.z + Math.sin(a) * R;
    const g = new T.Group(); g.position.set(x, LV, z); hall.add(g);
    cyl(0.5, 0.62, 0.8, M(0x131a2c, { metalness: 0.7, roughness: 0.3, envMapIntensity: 1.2 }), 0, 0.4, 0, g, 24).userData.vhall = "m:kind:" + k[0];
    cyl(0.56, 0.56, 0.04, E(parseInt(k[3].slice(1), 16), 2.2), 0, 0.82, 0, g, 24); cyl(0.7, 0.7, 0.03, cyanDim, 0, 0.02, 0, g, 24);
    const tex = ctex(512, 340, (q, w, h) => { panelBg(q, w, h, "#071428", "#0d2142"); frame(q, w, h, k[3], 6);
      q.shadowColor = k[3]; q.shadowBlur = 18; q.fillStyle = k[3]; q.beginPath(); q.arc(70, 78, 38, 0, 7); q.fill(); q.shadowBlur = 0; txt(q, String(i + 1), 70, 80, 44, "#04101a", "center", 800);
      txt(q, "CARD TYPE", 130, 60, 22, "#7fa6c8", "left", 600); txt(q, k[1], 30, 168, k[1].length > 18 ? 38 : 46, "#eef4ff", "left", 800); txt(q, k[2], 30, 228, 28, "#a9c4dd", "left", 500); txt(q, "TAP TO STUDY  ▸", 30, 295, 24, k[3], "left", 700); });
    const card = new T.Mesh(new T.PlaneGeometry(1.5, 1.5 * 340 / 512), basic(tex, { transparent: true, side: T.DoubleSide })); card.position.y = 1.9; card.userData.vhall = "m:kind:" + k[0]; g.add(card);
    g.rotation.y = Math.atan2(MC.x - x, MC.z - z); pods.push({ g, card, ph: i * 0.9, x, z });
  });
  /* four quick-start panels around the core */
  const qp = [];
  PANELS.forEach((p, i) => {
    const a = [55, 125, 235, 305][i] * PI / 180, R = 3.7, x = MC.x + Math.cos(a) * R, z = MC.z + Math.sin(a) * R;
    const g = new T.Group(); g.position.set(x, LV, z); hall.add(g);
    cyl(0.07, 0.1, 1.2, M(0x131a2c, { metalness: 0.7, roughness: 0.3 }), 0, 0.6, 0, g, 12); cyl(0.32, 0.36, 0.05, E(parseInt(p[3].slice(1), 16), 2), 0, 0.03, 0, g, 24);
    const tex = ctex(512, 240, (q, w, h) => { panelBg(q, w, h, "rgba(4,16,34,.92)", "rgba(10,36,70,.92)"); frame(q, w, h, p[3], 5); txt(q, p[1], w / 2, 86, p[1].length > 15 ? 40 : 48, "#eef4ff", "center", 800, p[3]); txt(q, p[2], w / 2, 150, 26, "#a9c4dd", "center", 500); txt(q, "TAP  ▸", w / 2, 202, 24, p[3], "center", 700); });
    const m = new T.Mesh(new T.PlaneGeometry(1.35, 1.35 * 240 / 512), basic(tex, { transparent: true, side: T.DoubleSide })); m.position.y = 1.55; m.userData.vhall = "m:" + p[0]; g.add(m);
    g.rotation.y = Math.atan2(x - MC.x, z - MC.z); qp.push({ g, m, ph: i * 1.3 });
  });

  /* ---------- the LED wall (west) and two teaching panels ---------- */
  const rs = MR - 0.4, SA = 62 * PI / 180, SW = LOW ? 1280 : 1792, SH = Math.round(SW / 3.2), SHT = 7.0, SY = LV + 0.6 + SHT / 2;
  const scr = dcv(SW, SH); scr.t.wrapS = T.RepeatWrapping; scr.t.repeat.set(-1, 1); scr.t.offset.set(1, 0);
  const screen = new T.Mesh(new T.CylinderGeometry(rs, rs, SHT, 96, 1, true, -PI / 2 - SA, 2 * SA), new T.MeshBasicMaterial({ map: scr.t, toneMapped: false, side: T.BackSide }));
  screen.position.set(MC.x, SY, MC.z); screen.userData.vhall = "m:screen"; hall.add(screen);
  [SY - SHT / 2 - 0.1, SY + SHT / 2 + 0.1].forEach((y) => { const b = new T.Mesh(new T.CylinderGeometry(rs + 0.04, rs + 0.04, 0.2, 96, 1, true, -PI / 2 - SA - 0.02, 2 * SA + 0.04), M(0x0b1118, { metalness: 0.6, roughness: 0.4, side: T.DoubleSide })); b.position.set(MC.x, y, MC.z); hall.add(b);
    const l = new T.Mesh(new T.CylinderGeometry(rs - 0.02, rs - 0.02, 0.05, 96, 1, true, -PI / 2 - SA, 2 * SA), new T.MeshBasicMaterial({ color: new T.Color(VIO).multiplyScalar(2.2), toneMapped: false, side: T.DoubleSide })); l.position.set(MC.x, y + (y < SY ? 0.12 : -0.12), MC.z); hall.add(l); });
  const curve = (g, x, y, w, h, col, lab) => {
    g.save(); g.strokeStyle = "rgba(160,180,255,.25)"; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(x, y + h * i / 4); g.lineTo(x + w, y + h * i / 4); g.stroke(); }
    const R = (t, S) => Math.pow(1 + 19 / 81 * t / S, -0.5); const rev = [0, 1, 3, 7, 16, 35], Ss = [0.8, 2.2, 6, 14, 34, 80]; g.lineWidth = 5; g.lineJoin = "round"; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.beginPath(); let first = true;
    for (let k = 0; k < rev.length; k++) { const t0 = rev[k], t1 = k + 1 < rev.length ? rev[k + 1] : 70; for (let s = 0; s <= 24; s++) { const t = t0 + (t1 - t0) * s / 24, r = R(t - t0, Ss[k]), px = x + w * Math.sqrt(t / 70), py = y + h * (1 - r); if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py); } }
    g.stroke(); g.shadowBlur = 0; g.strokeStyle = "rgba(255,120,120,.8)"; g.setLineDash([10, 8]); g.lineWidth = 3; g.beginPath(); for (let s = 0; s <= 40; s++) { const t = 70 * s / 40, r = R(t, 0.8), px = x + w * Math.sqrt(t / 70), py = y + h * (1 - r); s ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.setLineDash([]);
    rev.forEach((t) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(x + w * Math.sqrt(t / 70), y + h * (1 - 1), 6, 0, 7); g.fill(); });
    txt(g, "100%", x - 12, y, 22, "#9fb0d8", "right", 600); txt(g, "0%", x - 12, y + h, 22, "#9fb0d8", "right", 600); if (lab) { txt(g, "days since learning →", x + w, y + h + 30, 22, "#9fb0d8", "right", 500); } g.restore();
  };
  const sideTx = (kind) => { const t = ctex(384, 1024, (g, w, h) => {
    panelBg(g, w, h, "#06122a", "#0f1a48"); frame(g, w, h, "#9b7bff", 8);
    if (kind === "L") { txt(g, "THE SCIENCE", w / 2, 70, 38, "#eef4ff", "center", 800, "#9b7bff"); txt(g, "Forgetting curve", w / 2, 125, 26, "#b9a8ff", "center", 600); curve(g, 70, 190, 270, 330, "#36d6ff", true); txt(g, "Without review (red)", w / 2, 640, 24, "#ff8a8a", "center", 600); txt(g, "Each review (white dot)", w / 2, 690, 24, "#cfe8ff", "center", 600); txt(g, "flattens the curve", w / 2, 730, 24, "#cfe8ff", "center", 600); txt(g, "FSRS schedules the next", w / 2, 840, 24, "#9fe8ff", "center", 500); txt(g, "review for 90% recall", w / 2, 876, 24, "#9fe8ff", "center", 500); }
    else { txt(g, "HOW IT WORKS", w / 2, 70, 38, "#eef4ff", "center", 800, "#9b7bff"); [["1", "Commit", "Choose your answer first"], ["2", "Reveal", "Check it, then rate it"], ["3", "Rate", "Again · Hard · Good · Easy"], ["4", "Return", "Cards come back just before you forget"]].forEach((s, i) => { const y = 190 + i * 195; g.fillStyle = "rgba(155,123,255,.25)"; g.beginPath(); g.arc(70, y, 36, 0, 7); g.fill(); g.strokeStyle = "#9b7bff"; g.lineWidth = 4; g.stroke(); txt(g, s[0], 70, y + 2, 40, "#fff", "center", 800); txt(g, s[1], 124, y - 22, 38, "#eef4ff", "left", 800); const ws = s[2].split(" "); let ln = "", yy = y + 22; ws.forEach((wd) => { const tt = ln ? ln + " " + wd : wd; g.font = "500 24px system-ui,sans-serif"; if (g.measureText(tt).width > 230) { txt(g, ln, 124, yy, 24, "#a9c4dd", "left", 500); yy += 30; ln = wd; } else ln = tt; }); txt(g, ln, 124, yy, 24, "#a9c4dd", "left", 500); }); }
  }); t.wrapS = T.RepeatWrapping; t.repeat.set(-1, 1); t.offset.set(1, 0); return t; };
  [["L", -PI / 2 - 76 * PI / 180], ["R", -PI / 2 + 76 * PI / 180]].forEach((o) => {
    const wv = 2.6 / rs, m = new T.Mesh(new T.CylinderGeometry(rs - 0.02, rs - 0.02, 6.4, 24, 1, true, o[1] - wv / 2, wv), new T.MeshBasicMaterial({ map: sideTx(o[0]), toneMapped: false, side: T.BackSide })); m.position.set(MC.x, LV + 0.9 + 3.2, MC.z); m.userData.vhall = "m:home"; hall.add(m); });

  /* dashboard painted from the Memory Lab's own summary */
  let deckNames = [], sum = null, sumT = -9, dirty = true, hover = 0;
  fetch(new URL("./memory-lab/decks/index.json", import.meta.url)).then((r) => r.json()).then((j) => { deckNames = j; dirty = true; }).catch(() => {});
  const readSum = () => { try { const s = JSON.parse(localStorage.getItem("ccmem.summary") || "null"); if (s && typeof s === "object" && (!sum || s.t !== sum.t)) { sum = s; dirty = true; } } catch (e) { /* ignore */ } };
  const bgFill = (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#050a1c"); gr.addColorStop(0.5, "#0a1236"); gr.addColorStop(1, "#060c20"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(130,150,255,.07)"; g.lineWidth = 1; for (let x = 0; x < w; x += h / 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } };
  function paint(tn) {
    const g = scr.g, w = SW, h = SH, k = h / 560; bgFill(g, w, h);
    txt(g, "CRITICAL CARE HUB – MEMORY LAB", 0.04 * w, 0.085 * h, 50 * k, "#eef4ff", "left", 800, "#9b7bff");
    txt(g, "Learn Today.  Recall Tomorrow.  Remember for Life.", 0.04 * w, 0.17 * h, 28 * k, "#9fe8ff", "left", 600);
    const has = !!sum, S = sum || {};
    const tiles = [["CARDS MASTERED", has ? S.mastered : "—", "#27e0b0"], ["DUE TODAY", has ? S.due : "—", "#ffb347"], ["NEW CARDS", has ? S.fresh : "—", "#36d6ff"], ["STUDY STREAK", has ? S.streak + (S.streak === 1 ? " day" : " days") : "—", "#ff7ab6"]];
    const tx0 = 0.04 * w, ty0 = 0.24 * h, tw = 0.115 * w, th = 0.2 * h, gp = 0.01 * w;
    tiles.forEach((t, i) => { const x = tx0 + (i % 2) * (tw + gp), y = ty0 + Math.floor(i / 2) * (th + gp); g.fillStyle = "rgba(8,24,60,.85)"; g.fillRect(x, y, tw, th); g.strokeStyle = t[2]; g.lineWidth = 2.5 * k; g.strokeRect(x, y, tw, th); txt(g, String(t[1]), x + tw / 2, y + th * 0.43, 54 * k, "#fff", "center", 800, t[2]); txt(g, t[0], x + tw / 2, y + th * 0.82, 16 * k, "#9fb4dc", "center", 700); });
    /* progress ring */
    const rx = 0.2 * w, ry = 0.345 * h, rr = 0.1 * h; g.lineWidth = 12 * k; g.strokeStyle = "rgba(155,123,255,.25)"; g.beginPath(); g.arc(rx + 0.12 * w, ry + 0.055 * h, rr, 0, 7); g.stroke();
    const pct = has ? clampN((S.pct || 0) / 100, 0, 1) : 0; g.strokeStyle = "#9b7bff"; g.shadowColor = "#9b7bff"; g.shadowBlur = 16 * k; g.beginPath(); g.arc(rx + 0.12 * w, ry + 0.055 * h, rr, -PI / 2, -PI / 2 + 2 * PI * pct); g.stroke(); g.shadowBlur = 0;
    txt(g, has ? (S.pct || 0) + "%" : "—", rx + 0.12 * w, ry + 0.055 * h, 40 * k, "#fff", "center", 800); txt(g, "TODAY'S PROGRESS", rx + 0.12 * w, ry + 0.055 * h + rr + 28 * k, 16 * k, "#9fb4dc", "center", 700);
    /* decks */
    txt(g, "YOUR DECKS", 0.04 * w, 0.545 * h, 22 * k, "#b9a8ff", "left", 700);
    if (has && S.n) txt(g, S.n + " cards  ·  " + (S.rv || 0) + " clinically reviewed  ·  " + (S.n - (S.rv || 0)) + " draft", 0.96 * w, 0.545 * h, 18 * k, "#ffd166", "right", 700);
    const list = (has && S.decks && S.decks.length ? S.decks : deckNames.map((d) => ({ id: d.id, n: d.name, due: null, f: null }))).slice(0, 18);
    const cols = 6, dx0 = 0.04 * w, dy0 = 0.575 * h, dW = 0.92 * w, dH = 0.3 * h, dg = 0.007 * w, dtw = (dW - (cols - 1) * dg) / cols, dth = (dH - 2 * dg) / 3;
    list.forEach((d, i) => { const x = dx0 + (i % cols) * (dtw + dg), y = dy0 + Math.floor(i / cols) * (dth + dg), due = d.due || 0; g.fillStyle = due ? "rgba(70,40,10,.7)" : "rgba(8,24,60,.85)"; g.fillRect(x, y, dtw, dth); g.strokeStyle = due ? "#ffb347" : "rgba(130,150,255,.55)"; g.lineWidth = 2 * k; g.strokeRect(x, y, dtw, dth);
      g.font = "700 " + 19 * k + "px system-ui,sans-serif"; g.fillStyle = "#eef4ff"; g.textAlign = "left"; g.textBaseline = "middle"; let nm = d.n; while (g.measureText(nm).width > dtw - 20 * k && nm.length > 4) nm = nm.slice(0, -2); if (nm !== d.n) nm += "…"; g.fillText(nm, x + 10 * k, y + dth * 0.36);
      txt(g, d.due == null ? "tap to open" : d.due + " due · " + d.f + " new", x + 10 * k, y + dth * 0.72, 15 * k, due ? "#ffc67a" : "#8fa6d6", "left", 600); });
    /* forgetting curve */
    const cx = 0.545 * w, cy = 0.235 * h, cw = 0.4 * w, ch = 0.26 * h; txt(g, "FORGETTING CURVE · EVERY REVIEW FLATTENS IT", cx, cy - 22 * k, 17 * k, "#b9a8ff", "left", 700); curve(g, cx + 40 * k, cy, cw - 40 * k, ch, "#36d6ff", false);
    /* call to action */
    const pulse = 0.55 + 0.45 * Math.sin(tn * 3); g.fillStyle = "rgba(155,123,255," + (0.18 + 0.16 * pulse).toFixed(3) + ")"; g.fillRect(0.545 * w, 0.915 * h - 20 * k, 0.4 * w, 40 * k); g.strokeStyle = "#9b7bff"; g.lineWidth = 2.5 * k; g.strokeRect(0.545 * w, 0.915 * h - 20 * k, 0.4 * w, 40 * k);
    txt(g, has ? "TAP THE WALL TO OPEN YOUR MEMORY LAB" : "TAP THE WALL TO BEGIN YOUR FIRST SESSION", 0.745 * w, 0.915 * h, 20 * k, "#eef4ff", "center", 800);
    const sx = ((tn * 260) % (w + 400)) - 400; g.fillStyle = "rgba(155,123,255,.55)"; g.fillRect(sx, h - 5 * k, 400, 3 * k);
    scr.t.needsUpdate = true; dirty = false;
  }

  /* ---------- walking ---------- */
  const pods2 = pods.map((p) => ({ x: p.x, z: p.z, r: 0.75 })).concat(qp.map((p) => ({ x: p.g.position.x, z: p.g.position.z, r: 0.5 })), [{ x: MC.x, z: MC.z, r: 1.6 }]);
  const inHall = (p) => !!p && p.x < AU.x0 - 0.6;
  function cands(x, z, out) {
    if (gate.open > 0.85) { const r = { x0: MC.x + 10.3, x1: AU.x0 + 0.5, z0: ZC - 1.1, z1: ZC + 1.1 }, cx = clampN(x, r.x0, r.x1), cz = clampN(z, r.z0, r.z1); out.push([cx, cz, (cx - x) ** 2 + (cz - z) ** 2]); }
    const dx = x - MC.x, dz = z - MC.z, l = Math.hypot(dx, dz), k = l > 10.2 ? 10.2 / l : 1, qx = MC.x + dx * k, qz = MC.z + dz * k; out.push([qx, qz, (qx - x) ** 2 + (qz - z) ** 2]);
  }
  function solid(px, pz) { pods2.forEach((o) => { const dx = px - o.x, dz = pz - o.z, l = Math.hypot(dx, dz); if (l < o.r) { const k = o.r / (l || 1e-6); px = o.x + (l ? dx * k : o.r); pz = o.z + (l ? dz * k : 0); } }); return [px, pz]; }

  /* ---------- per frame ---------- */
  let ptT = 0, tt = 0;
  function update(t, dt, cam, lvl1) {
    const sdt = Math.min(dt, 0.1);
    if (cam && lvl1 && cam.x < AU.x0 + 8) { const dd = Math.hypot(cam.x - AU.x0, cam.z - ZC); if (dd < 2.8) gate.target = 1; else if (dd > 5.8) gate.target = 0; }
    const vis = !!cam && lvl1 && (gate.open > 0.02 || cam.x < AU.x0 - 0.3); if (hall.visible !== vis) { hall.visible = vis; if (vis) dirty = true; }
    if (!vis) return; tt += sdt;
    gy.forEach((r, i) => { r.rotation.x += sdt * (0.5 + i * 0.25); r.rotation.y += sdt * (0.35 - i * 0.2); r.rotation.z += sdt * (0.2 + i * 0.1); });
    lat.rotation.y += sdt * 0.5; lat.rotation.x += sdt * 0.17; const s = 1 + 0.07 * Math.sin(tt * 2.4); nucleus.scale.setScalar(s); nodes.rotation.y += sdt * 0.12; nodes.rotation.z += sdt * 0.04;
    tagTx.offset.x = (tagTx.offset.x + sdt * 0.02) % 1;
    pods.forEach((p) => { p.card.position.y = 1.9 + 0.06 * Math.sin(tt * 1.5 + p.ph); p.card.rotation.y = 0.05 * Math.sin(tt * 0.8 + p.ph); });
    qp.forEach((p) => { p.m.position.y = 1.55 + 0.04 * Math.sin(tt * 1.7 + p.ph); });
    if (cam) { ptT += sdt; if (ptT > (inHall(cam) ? 0.12 : 0.5)) { ptT = 0; if (tt - sumT > 1.5) { sumT = tt; readSum(); } paint(tt); } }
  }
  function tap(kind) {
    if (!kind || kind.slice(0, 2) !== "m:") return null; const r = kind.slice(2);
    if (r === "home" || r === "screen") return { route: "home", say: "m_home" };
    if (r.startsWith("kind:")) return { route: "kind:" + r.slice(5), say: "k_" + r.slice(5) };
    return { route: r, say: "m_" + r };
  }
  return { gate, MC, MR, inHall, cands, solid, update, tap, refresh: () => { sumT = -9; dirty = true; }, group: hall };
}

/* ============================== DOM: the open button and the full-screen Memory Lab overlay ============================== */
export function mountMemoryUI(up, getPos) {
  const css = document.createElement("style");
  css.textContent = `#ml-btn,#ml-ov{font-family:system-ui,sans-serif;color:#eef4ff}
#ml-btn{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:7;display:none;padding:12px 22px;border-radius:999px;border:1.5px solid #9b7bff;background:rgba(10,8,34,.9);font-weight:800;font-size:15px;letter-spacing:.05em;cursor:pointer;box-shadow:0 0 24px rgba(155,123,255,.45);min-height:44px}
#ml-ov{position:fixed;inset:0;z-index:13;display:none;background:#030612}
#ml-ov iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#030612}
#ml-ov .ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9fb4dc;font-size:14px;letter-spacing:.12em;pointer-events:none}`;
  document.head.appendChild(css);
  const btn = document.createElement("button"); btn.id = "ml-btn"; btn.type = "button"; btn.textContent = "🧠  OPEN MEMORY LAB";
  const ov = document.createElement("div"); ov.id = "ml-ov"; ov.innerHTML = '<div class="ld">LOADING MEMORY LAB…</div>';
  document.body.appendChild(btn); document.body.appendChild(ov);
  let fr = null, open = false;
  const base = new URL("./memory-lab/index.html", import.meta.url).href;
  function openMemory(route) {
    if (open) return; open = true; fr = document.createElement("iframe"); fr.setAttribute("allow", "fullscreen; autoplay"); fr.title = "Critical Care Hub – Memory Lab";
    fr.src = base + "?embed=1&v=" + MEM_VER + "#/" + (route || "home"); ov.appendChild(fr); ov.style.display = "block"; btn.style.display = "none";
  }
  function closeMemory() { if (!open) return; open = false; ov.style.display = "none"; if (fr) { fr.src = "about:blank"; fr.remove(); fr = null; } if (up.memory) up.memory.refresh(); }
  window.addEventListener("message", (e) => { if (e.data && e.data.type === "ccmem-close" && e.origin === location.origin) closeMemory(); });
  window.addEventListener("keydown", (e) => { if (open && e.key === "Escape") closeMemory(); });
  btn.onclick = () => openMemory("home");
  up.openMemory = openMemory; up.closeMemory = closeMemory;
  setInterval(() => { const p = getPos(), here = up.inMemory ? up.inMemory(p) : false; btn.style.display = here && !open ? "block" : "none"; if (!here && open) closeMemory(); }, 250);
}
