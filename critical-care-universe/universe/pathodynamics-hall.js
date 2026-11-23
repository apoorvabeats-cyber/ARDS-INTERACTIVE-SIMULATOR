/* PATHODYNAMICS – Interactive Clinical Pathophysiology: the first-floor hall north of the lobby, on the same level as (and running parallel to) the Command Centre below.
   A holographic patient turns on a dais; its organs are the doors into the labs. Six system pedestals curve round the far wall under an LED wall.
   Everything is tappable and opens the PATHODYNAMICS app (./pathodynamics/) in a full-screen overlay.

   buildPathoHall(T, ctx, top, LV) -> { gate, GX, inHall(p), cands(x,z,out), solid(px,pz), update(t,dt,cam,lvl1), tap(kind), group }
   mountPathoUI(up, getPos) -> the DOM button and the full-screen overlay (up.openPatho(route)). */

export const PATHO_VER = "20261123p";
export const PATHO_CLIPS = ["p_home", "p_neuro", "p_cardio", "p_resp", "p_nephro", "p_gi", "p_gcc", "p_steps", "p_views"];
const LABS = [
  ["neuro", "NEUROLOGY", "Brain and cerebral vessels", "Stroke · ICH · SAH · Aneurysm · Herniation · Hydrocephalus", "#9b7bff", "stroke"],
  ["cardio", "CARDIOLOGY", "Heart, aorta and pericardium", "STEMI · NSTEMI · Dissection · Tamponade · PE", "#ff6b7c", "mi"],
  ["resp", "RESPIRATORY", "Lungs, airways and pleura", "ARDS · Pneumonia · PTX · Effusion · Mucus plug · PE", "#36d6ff", "pe"],
  ["nephro", "NEPHROLOGY", "Kidneys and urinary tract", "ATN · AIN · GN · Obstruction · Infarct · Stenosis", "#27e0b0", "aki"],
  ["gi", "GASTROENTEROLOGY", "Pancreas and gut", "Pancreatitis · Necrosis · Drainage", "#ffb347", "pancreas"],
  ["gcc", "GENERAL CRITICAL CARE", "Shock and metabolic crises", "Septic shock · DIC · Anaphylaxis · DKA · HHS", "#ff6b8a", "gcc"],
];
const TEAL = 0x27e0b0, SYS = { stroke: "neuro", mi: "cardio", pe: "resp", pancreas: "gi", aki: "nephro" };

export function buildPathoHall(T, c, top, LV) {
  const { mesh, bx, cyl, pl, ctex, dcv, makeDoor, wallMat, slats, cyan, cyanDim, white, M, E, LOW, AU, ZC } = c;
  const PI = Math.PI, V = T.Vector3, clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const X0 = AU.x0, X1 = AU.x1, Z0 = AU.z1, Z1 = 10.0, HH = 7.4, YC = LV + HH, CX = (X0 + X1) / 2, CZ = 3.2, GX = -11.4, W = X1 - X0, D = Z1 - Z0;
  const hall = new T.Group(); hall.name = "pathoHall"; hall.visible = false; top.add(hall);
  const txt = (g, s, x, y, px, col, al, wt, glow) => { g.font = (wt || 700) + " " + px + "px system-ui,sans-serif"; g.fillStyle = col || "#e4f6ff"; g.textAlign = al || "left"; g.textBaseline = "middle"; g.shadowColor = glow || "transparent"; g.shadowBlur = glow ? px * 0.35 : 0; g.fillText(s, x, y); g.shadowBlur = 0; };
  const basic = (map, o) => new T.MeshBasicMaterial(Object.assign({ map, toneMapped: false }, o || {}));
  const panelBg = (g, w, h, a, b) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a || "#06182a"); gr.addColorStop(1, b || "#0a2a46"); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const frame = (g, w, h, col, lw) => { g.strokeStyle = col || "#36d6ff"; g.lineWidth = lw || 4; g.strokeRect((lw || 4) / 2, (lw || 4) / 2, w - (lw || 4), h - (lw || 4)); };
  const hx = (s) => parseInt(s.slice(1), 16);
  const lw = (w, h, x, y, z, ry) => pl(w, h, wallMat(w, h, slats), x, y, z, ry, 0, hall);

  /* ---------- the gate in the lobby's front wall ---------- */
  const gate = makeDoor("phall", GX, Z0 - 0.02, 3.0, 4.4, TEAL, top); gate.g.position.y = LV; gate.center = new V(GX, LV, Z0);
  const gateSign = ctex(768, 200, (g, w, h) => {
    g.fillStyle = "#04121a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#27e0b0"; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.shadowColor = "#27e0b0"; g.shadowBlur = 14; g.strokeStyle = "#27e0b0"; g.lineWidth = 5; g.lineJoin = "round"; g.beginPath(); g.moveTo(40, 100); g.lineTo(78, 100); g.lineTo(92, 64); g.lineTo(112, 140); g.lineTo(128, 100); g.lineTo(168, 100); g.stroke(); g.shadowBlur = 0;
    txt(g, "PATHODYNAMICS", 190, 78, 50, "#eafff8", "left", 800, "#27e0b0"); txt(g, "Interactive Clinical Pathophysiology", 192, 138, 25, "#9fe8d0", "left", 500);
  });
  { const m = new T.Mesh(new T.PlaneGeometry(2.6, 2.6 * 200 / 768), basic(gateSign)); m.position.set(GX, LV + 4.98, Z0 - 0.07); m.rotation.y = PI; m.userData.door = "phall"; top.add(m); }
  /* a teal frame on the lobby side of the gate */
  [-1, 1].forEach((s) => bx(0.05, 4.5, 0.05, E(TEAL, 2.2), GX + s * 1.62, LV + 2.25, Z0 - 0.09, top));

  /* ---------- shell ---------- */
  lw(D, HH, X0 + 0.01, LV + HH / 2, (Z0 + Z1) / 2, PI / 2); lw(D, HH, X1 - 0.01, LV + HH / 2, (Z0 + Z1) / 2, -PI / 2); lw(W, HH, CX, LV + HH / 2, Z1 - 0.01, PI);
  /* south wall: above the lobby wall, the hole for the gate, and the passage beyond it */
  lw(W, HH - 5.6, CX, LV + 5.6 + (HH - 5.6) / 2, Z0 + 0.01, 0);
  { const a = GX - 1.5 - X0, b = X1 - (GX + 1.5); lw(a, 5.6, X0 + a / 2, LV + 2.8, Z0 + 0.01, 0); lw(b, 5.6, GX + 1.5 + b / 2, LV + 2.8, Z0 + 0.01, 0); lw(3.0, 5.6 - 4.4, GX, LV + 4.4 + (5.6 - 4.4) / 2, Z0 + 0.01, 0); }
  const floorTx = ctex(1024, 1024, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.4, 30, w / 2, h * 0.4, w * 0.75); gr.addColorStop(0, "#0c2a30"); gr.addColorStop(0.5, "#08161e"); gr.addColorStop(1, "#04080e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(39,224,176,.10)"; g.lineWidth = 2; for (let i = 0; i <= 20; i++) { g.beginPath(); g.moveTo(i * w / 20, 0); g.lineTo(i * w / 20, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 20); g.lineTo(w, i * h / 20); g.stroke(); }
    g.strokeStyle = "rgba(54,214,255,.5)"; g.lineWidth = 4; g.shadowColor = "#36d6ff"; g.shadowBlur = 10; g.beginPath(); g.moveTo(0, h * 0.93); for (let x = 0; x < w; x += 4) { const p = (x % 256) / 256; const y = h * 0.93 - (p > 0.40 && p < 0.44 ? 70 * Math.sin((p - 0.40) / 0.04 * PI) : 0) + (p > 0.34 && p < 0.37 ? 10 : 0) - (p > 0.58 && p < 0.68 ? 18 * Math.sin((p - 0.58) / 0.10 * PI) : 0); g.lineTo(x, y); } g.stroke(); g.shadowBlur = 0;
  });
  mesh(new T.PlaneGeometry(W, D), M(0xffffff, { map: floorTx, roughness: 0.2, metalness: 0.5, envMapIntensity: 1.1 }), CX, LV + 0.003, (Z0 + Z1) / 2, hall).rotation.x = -PI / 2;
  [[1.9, 2.0, TEAL, 2.2], [3.0, 3.05, 0x36d6ff, 1.8], [4.6, 4.64, 0xeafff8, 1.1]].forEach((r) => { const m = mesh(new T.RingGeometry(r[0], r[1], 128), E(r[2], r[3]), CX, LV + 0.012, CZ, hall); m.rotation.x = -PI / 2; });
  { const m = mesh(new T.CircleGeometry(1.9, 64), new T.MeshBasicMaterial({ color: 0x0a2a30, transparent: true, opacity: 0.7, toneMapped: false }), CX, LV + 0.008, CZ, hall); m.rotation.x = -PI / 2; }
  { const lead = bx(0.08, 0.04, D - 1.2, E(TEAL, 1.6), GX, LV + 0.014, (Z0 + Z1) / 2 - 0.6, hall); void lead; }
  mesh(new T.PlaneGeometry(W, D), M(0x05080c, { roughness: 1, side: T.DoubleSide }), CX, YC, (Z0 + Z1) / 2, hall).rotation.x = PI / 2;
  for (let i = -2; i <= 2; i++) bx(0.12, 0.04, D - 1, white, CX + i * 2.6, YC - 0.04, (Z0 + Z1) / 2, hall);
  [2.6, 4.0].forEach((r, i) => { const t = mesh(new T.TorusGeometry(r, i ? 0.05 : 0.09, 8, 100), E(i ? 0x36d6ff : TEAL, 2), CX, YC - 0.08, CZ, hall); t.rotation.x = PI / 2; });
  bx(W, 0.06, 0.06, cyan, CX, YC - 0.3, Z1 - 0.05, hall); bx(0.06, 0.06, D, cyan, X0 + 0.05, YC - 0.3, (Z0 + Z1) / 2, hall); bx(0.06, 0.06, D, cyan, X1 - 0.05, YC - 0.3, (Z0 + Z1) / 2, hall);
  bx(W, 0.05, 0.05, cyanDim, CX, LV + 0.07, Z1 - 0.04, hall); bx(0.05, 0.05, D, cyanDim, X0 + 0.04, LV + 0.07, (Z0 + Z1) / 2, hall); bx(0.05, 0.05, D, cyanDim, X1 - 0.04, LV + 0.07, (Z0 + Z1) / 2, hall);

  /* ---------- the LED wall (north) ---------- */
  const LWW = 11.6, LWH = 4.2, SW = LOW ? 1400 : 2048, SH = Math.round(SW * LWH / LWW), scr = dcv(SW, SH);
  const led = new T.Mesh(new T.PlaneGeometry(LWW, LWH), basic(scr.t)); led.position.set(CX, LV + 4.5, Z1 - 0.07); led.rotation.y = PI; led.userData.vhall = "p:home"; hall.add(led);
  [-1, 1].forEach((s) => bx(LWW + 0.2, 0.06, 0.05, E(TEAL, 2.2), CX, LV + 4.5 + s * (LWH / 2 + 0.05), Z1 - 0.06, hall));
  let paintT = 0, tt = 0;
  function paintLed(t) {
    const g = scr.g, w = SW, h = SH, k = h / 700; const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#03121a"); gr.addColorStop(0.5, "#06223a"); gr.addColorStop(1, "#04101e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(39,224,176,.08)"; g.lineWidth = 1; for (let x = 0; x < w; x += 46 * k) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    frame(g, w, h, "#27e0b0", 8 * k);
    txt(g, "CRITICAL CARE HUB", 0.045 * w, 0.1 * h, 34 * k, "#8fe8d0", "left", 700);
    txt(g, "PATHODYNAMICS", 0.045 * w, 0.27 * h, 128 * k, "#eafff8", "left", 800, "#27e0b0");
    txt(g, "INTERACTIVE CLINICAL PATHOPHYSIOLOGY", 0.047 * w, 0.43 * h, 38 * k, "#36d6ff", "left", 700);
    const lines = ["Explore disease mechanisms, anatomical abnormalities", "and physiological responses through interactive 3D models."]; lines.forEach((s, i) => txt(g, s, 0.047 * w, (0.55 + i * 0.075) * h, 30 * k, "#cfe6ee", "left", 500));
    const st5 = ["SELECT", "EXPLORE", "INTERVENE", "OBSERVE", "CORRELATE"]; st5.forEach((s, i) => { const x = 0.047 * w + i * 0.108 * w, y = 0.78 * h; g.fillStyle = "rgba(39,224,176,.16)"; g.fillRect(x, y, 0.1 * w, 0.1 * h); g.strokeStyle = "#27e0b0"; g.lineWidth = 2.5 * k; g.strokeRect(x, y, 0.1 * w, 0.1 * h); txt(g, String(i + 1), x + 0.014 * w, y + 0.05 * h, 30 * k, "#27e0b0", "center", 800); txt(g, s, x + 0.055 * w, y + 0.05 * h, 19 * k, "#eafff8", "center", 700); });
    /* a live trace on the right: ECG with a moving cursor */
    const px = 0.63 * w, py = 0.2 * h, pw = 0.33 * w, ph = 0.42 * h; g.fillStyle = "rgba(2,14,24,.8)"; g.fillRect(px, py, pw, ph); g.strokeStyle = "#27e0b0"; g.lineWidth = 2.5 * k; g.strokeRect(px, py, pw, ph);
    g.strokeStyle = "rgba(39,224,176,.18)"; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(px + i * pw / 8, py); g.lineTo(px + i * pw / 8, py + ph); g.stroke(); } for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(px, py + i * ph / 4); g.lineTo(px + pw, py + i * ph / 4); g.stroke(); }
    g.strokeStyle = "#7fffc8"; g.lineWidth = 3.5 * k; g.shadowColor = "#27e0b0"; g.shadowBlur = 12 * k; g.beginPath(); const cur = (t * 0.35) % 1;
    for (let i = 0; i <= 300; i++) { const u = i / 300, ph2 = ((u * 3 + 0.0) % 1), y = (ph2 > 0.40 && ph2 < 0.44 ? Math.sin((ph2 - 0.40) / 0.04 * PI) * 0.9 : 0) - (ph2 > 0.44 && ph2 < 0.47 ? 0.2 : 0) + (ph2 > 0.15 && ph2 < 0.25 ? 0.12 * Math.sin((ph2 - 0.15) / 0.10 * PI) : 0) + (ph2 > 0.6 && ph2 < 0.74 ? 0.25 * Math.sin((ph2 - 0.6) / 0.14 * PI) : 0); const X = px + 6 + u * (pw - 12), Y = py + ph * 0.62 - y * ph * 0.5; if (Math.abs(u - cur) < 0.04) continue; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
    g.stroke(); g.shadowBlur = 0; g.fillStyle = "#eafff8"; g.fillRect(px + 6 + cur * (pw - 12), py + 4, 3 * k, ph - 8);
    LABS.forEach((l, i) => { const x = 0.63 * w + (i % 3) * 0.112 * w, y = 0.68 * h + Math.floor(i / 3) * 0.1 * h; g.fillStyle = "rgba(6,22,40,.9)"; g.fillRect(x, y, 0.105 * w, 0.085 * h); g.strokeStyle = l[4]; g.lineWidth = 2 * k; g.strokeRect(x, y, 0.105 * w, 0.085 * h); txt(g, l[1].replace(" LAB", "").replace("GENERAL CRITICAL CARE", "CRITICAL CARE").replace("GASTROENTEROLOGY", "GASTRO"), x + 0.0525 * w, y + 0.0425 * h, 14 * k, "#eef4ff", "center", 700); });
    const pulse = 0.55 + 0.45 * Math.sin(t * 3); g.fillStyle = "rgba(39,224,176," + (0.15 + 0.15 * pulse).toFixed(3) + ")"; g.fillRect(0.63 * w + 2 * 0.112 * w, 0.78 * h, 0.105 * w, 0.1 * h); g.strokeStyle = "#27e0b0"; g.lineWidth = 2.5 * k; g.strokeRect(0.63 * w + 2 * 0.112 * w, 0.78 * h, 0.105 * w, 0.1 * h); txt(g, "TAP TO ENTER", 0.63 * w + 2 * 0.112 * w + 0.0525 * w, 0.83 * h, 15 * k, "#eafff8", "center", 800);
    const sx = ((t * 260) % (w + 400)) - 400; g.fillStyle = "rgba(39,224,176,.5)"; g.fillRect(sx, h - 6 * k, 400, 3 * k); scr.t.needsUpdate = true;
  }

  /* ---------- side panels: the five steps (west) and the three views (east) ---------- */
  const sidePanel = (kind) => ctex(1280, 720, (g, w, h) => {
    panelBg(g, w, h, "#04121c", "#081f38"); frame(g, w, h, "#27e0b0", 8);
    if (kind === "S") { txt(g, "EVERY DISEASE, FIVE STEPS", w / 2, 70, 56, "#eafff8", "center", 800, "#27e0b0");
      [["1", "SELECT", "Choose the pathology"], ["2", "EXPLORE", "Rotate the 3D model"], ["3", "INTERVENE", "Treat it with your hands"], ["4", "OBSERVE", "Watch the body respond"], ["5", "CORRELATE", "Link to the clinic and the scans"]].forEach((s, i) => { const y = 150 + i * 106; g.fillStyle = "rgba(39,224,176,.14)"; g.fillRect(70, y, w - 140, 88); g.strokeStyle = "#27e0b0"; g.lineWidth = 3; g.strokeRect(70, y, w - 140, 88); txt(g, s[0], 120, y + 44, 56, "#27e0b0", "center", 800); txt(g, s[1], 190, y + 44, 40, "#eafff8", "left", 800); txt(g, s[2], 520, y + 44, 32, "#a9d6e4", "left", 500); }); }
    else { txt(g, "ONE PATIENT, THREE VIEWS", w / 2, 70, 56, "#eafff8", "center", 800, "#36d6ff");
      [["ANATOMICAL", "What is happening inside the organ?", "#36d6ff"], ["PATHOPHYSIOLOGICAL", "Why is it happening, and what changes?", "#9b7bff"], ["INTERVENTIONAL", "What happens when the doctor treats it?", "#ffb347"]].forEach((s, i) => { const y = 160 + i * 170; g.fillStyle = "rgba(10,30,60,.8)"; g.fillRect(70, y, w - 140, 140); g.strokeStyle = s[2]; g.lineWidth = 4; g.strokeRect(70, y, w - 140, 140); txt(g, s[0], 110, y + 52, 46, "#fff", "left", 800, s[2]); txt(g, s[1], 110, y + 105, 32, "#a9d6e4", "left", 500); });
      txt(g, "All tied to one whole-body patient model", w / 2, 685, 28, "#27e0b0", "center", 600); }
  });
  [[-1, "S", "p:steps"], [1, "V", "p:views"]].forEach(([sd, kd, tag]) => { const m = new T.Mesh(new T.PlaneGeometry(6.4, 6.4 * 720 / 1280), basic(sidePanel(kd))); m.position.set(sd < 0 ? X0 + 0.06 : X1 - 0.06, LV + 2.9, CZ + 0.6); m.rotation.y = sd < 0 ? PI / 2 : -PI / 2; m.userData.vhall = tag; hall.add(m);
    const bar = E(TEAL, 2); [-1, 1].forEach((s) => bx(0.04, 0.05, 6.5, bar, sd < 0 ? X0 + 0.05 : X1 - 0.05, LV + 2.9 + s * 1.85, CZ + 0.6, hall)); });

  /* ---------- the holographic patient ---------- */
  const dais = new T.Group(); dais.position.set(CX, LV, CZ); hall.add(dais);
  cyl(1.45, 1.6, 0.4, M(0x0e1a22, { metalness: 0.7, roughness: 0.3, envMapIntensity: 1.2 }), 0, 0.2, 0, dais, 48);
  { const r = new T.Mesh(new T.RingGeometry(1.0, 1.3, 64), E(TEAL, 2.2)); r.rotation.x = -PI / 2; r.position.y = 0.41; dais.add(r); }
  const body = new T.Group(); body.position.y = 0.55; dais.add(body);
  const solid = new T.MeshBasicMaterial({ color: 0x0a4a66, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }), wire = new T.MeshBasicMaterial({ color: 0x36d6ff, wireframe: true, transparent: true, opacity: 0.3, toneMapped: false });
  const part = (geo, x, y, z, rz) => { [solid, wire].forEach((m) => { const p = new T.Mesh(geo, m); p.position.set(x, y, z); p.rotation.z = rz || 0; body.add(p); }); };
  part(new T.CapsuleGeometry(0.3, 0.7, 6, 18), 0, 1.55, 0); part(new T.SphereGeometry(0.2, 18, 14), 0, 2.5, 0); part(new T.CylinderGeometry(0.08, 0.09, 0.15, 10), 0, 2.28, 0);
  [-1, 1].forEach((s) => { part(new T.CapsuleGeometry(0.075, 0.72, 4, 10), s * 0.46, 1.5, 0, s * 0.08); part(new T.CapsuleGeometry(0.11, 0.78, 6, 12), s * 0.15, 0.5, 0); });
  const organs = [];
  const organ = (lab, hex, geo, x, y, z, sx, sy, sz) => { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: new T.Color(hex).multiplyScalar(1.5), transparent: true, opacity: 0.85, toneMapped: false })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.userData.vhall = "p:" + (SYS[lab] || lab); body.add(m); organs.push({ m, lab, s: [sx, sy, sz], ph: organs.length * 1.1 }); return m; };
  const sph = new T.SphereGeometry(1, 16, 12);
  organ("stroke", 0x9b7bff, sph, 0, 2.51, 0, 0.17, 0.13, 0.15); organ("mi", 0xff6b7c, sph, 0.07, 1.9, 0.05, 0.09, 0.11, 0.08);
  [-1, 1].forEach((s) => { organ("pe", 0x36d6ff, sph, s * 0.17, 1.92, 0, 0.1, 0.21, 0.1); organ("aki", 0x27e0b0, sph, s * 0.14, 1.35, -0.08, 0.05, 0.09, 0.04); }); organ("pancreas", 0xffb347, sph, 0, 1.5, 0.02, 0.2, 0.04, 0.05);
  [["stroke", 0, 2.52, 0], ["mi", 0.07, 1.9, 0.05], ["pe", -0.17, 1.92, 0], ["pe", 0.17, 1.92, 0], ["pancreas", 0, 1.5, 0.02], ["aki", -0.14, 1.35, -0.08], ["aki", 0.14, 1.35, -0.08]].forEach(([lab, x, y, z]) => { const h = new T.Mesh(new T.SphereGeometry(0.2, 8, 6), new T.MeshBasicMaterial({ visible: false })); h.position.set(x, y, z); h.userData.vhall = "p:" + (SYS[lab] || lab); body.add(h); });
  const scan = new T.Mesh(new T.TorusGeometry(0.62, 0.012, 8, 72), E(TEAL, 2.6)); scan.rotation.x = PI / 2; body.add(scan);
  const scan2 = new T.Mesh(new T.TorusGeometry(0.5, 0.008, 8, 72), E(0x36d6ff, 2)); scan2.rotation.x = PI / 2; body.add(scan2);
  const beam = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, YC - LV - 0.5, 8, 1, true), new T.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); beam.position.set(0, (YC - LV - 0.5) / 2 + 0.5, 0); dais.add(beam);
  const hit = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 3.2, 12), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 1.8; hit.userData.vhall = "p:home"; dais.add(hit);
  /* a ring of floating text round the patient */
  const tagTx = ctex(2048, 96, (g, w, h) => { g.clearRect(0, 0, w, h); const s = "PATHODYNAMICS  ·  EXPLORE  ·  INTERVENE  ·  OBSERVE  ·  "; g.font = "800 54px system-ui,sans-serif"; g.textBaseline = "middle"; g.fillStyle = "#cffff0"; g.shadowColor = "#27e0b0"; g.shadowBlur = 16; const sw = g.measureText(s).width, n = Math.ceil(w / sw) + 1; for (let i = 0; i < n; i++) g.fillText(s, i * sw, h / 2); });
  tagTx.wrapS = T.RepeatWrapping; const ring = new T.Mesh(new T.CylinderGeometry(1.75, 1.75, 0.3, 96, 1, true), new T.MeshBasicMaterial({ map: tagTx, transparent: true, depthWrite: false, toneMapped: false })); ring.position.y = 0.9; dais.add(ring);

  /* ---------- six system pedestals ---------- */
  const minis = [], peds = [];
  const R = 4.7;
  const miniFor = (id, hex) => {
    const g = new T.Group(), col = new T.Color(hex).multiplyScalar(1.4), mat = (o) => new T.MeshBasicMaterial(Object.assign({ color: col, transparent: true, opacity: 0.7, toneMapped: false }, o || {})), wm = new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.25, toneMapped: false });
    const add = (geo, x, y, z, sc) => { const a = new T.Mesh(geo, mat()), b = new T.Mesh(geo, wm); [a, b].forEach((m) => { m.position.set(x || 0, y || 0, z || 0); if (sc) m.scale.set(...sc); g.add(m); }); };
    if (id === "stroke") { const ig = new T.IcosahedronGeometry(0.26, 3), p = ig.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + 0.08 * Math.sin(v.x * 40) * Math.sin(v.y * 36 + 1) * Math.sin(v.z * 34); p.setXYZ(i, v.x * k, v.y * k, v.z * k); } ig.computeVertexNormals(); add(ig, 0, 0, 0, [1.25, 0.95, 1.05]); }
    else if (id === "mi") { add(new T.SphereGeometry(0.2, 18, 14), 0, 0.05, 0, [1, 1.1, 0.9]); add(new T.ConeGeometry(0.19, 0.34, 18), 0, -0.2, 0, [1, 1, 0.9]); }
    else if (id === "pe") { [-1, 1].forEach((s) => add(new T.SphereGeometry(0.14, 16, 12), s * 0.17, 0, 0, [0.9, 1.9, 0.9])); }
    else if (id === "pancreas") { const cv = new T.CatmullRomCurve3([new V(-0.32, 0.04, 0), new V(-0.1, -0.02, 0), new V(0.12, 0.04, 0), new V(0.32, 0.12, 0)]); add(new T.TubeGeometry(cv, 24, 0.055, 10, false)); add(new T.SphereGeometry(0.1, 14, 10), -0.34, 0.0, 0); }
    else if (id === "gcc") { add(new T.SphereGeometry(0.16, 18, 14), 0, -0.06, 0); add(new T.ConeGeometry(0.13, 0.3, 18), 0, 0.17, 0); }
    else { add(new T.SphereGeometry(0.15, 18, 14), 0, 0, 0, [0.9, 1.5, 0.7]); }
    return g;
  };
  LABS.forEach((l, i) => {
    const a = [1.2, 0.72, 0.24, -0.24, -0.72, -1.2][i], x = CX + R * Math.sin(a), z = CZ + R * Math.cos(a), col = hx(l[4]);
    const g = new T.Group(); g.position.set(x, LV, z); hall.add(g);
    cyl(0.42, 0.55, 0.9, M(0x0e1a22, { metalness: 0.7, roughness: 0.3, envMapIntensity: 1.2 }), 0, 0.45, 0, g, 24).userData.vhall = "p:" + l[0];
    cyl(0.5, 0.5, 0.04, E(col, 2.2), 0, 0.92, 0, g, 24); cyl(0.68, 0.68, 0.03, cyanDim, 0, 0.02, 0, g, 24);
    const mini = miniFor(l[5], col); mini.position.y = 1.5; mini.userData.vhall = "p:" + l[0]; g.add(mini); const mh = new T.Mesh(new T.SphereGeometry(0.4, 10, 8), new T.MeshBasicMaterial({ visible: false })); mh.position.y = 1.5; mh.userData.vhall = "p:" + l[0]; g.add(mh); minis.push({ mini, ph: i * 0.8 });
    const tex = ctex(512, 320, (q, w, h) => { panelBg(q, w, h, "#06141f", "#0a2338"); frame(q, w, h, l[4], 6); q.shadowColor = l[4]; q.shadowBlur = 16; q.fillStyle = l[4]; q.beginPath(); q.arc(52, 56, 22, 0, 7); q.fill(); q.shadowBlur = 0; txt(q, String(i + 1), 52, 58, 28, "#04101a", "center", 800);
      txt(q, l[1], 90, 56, l[1].length > 18 ? 27 : 33, "#eef4ff", "left", 800); txt(q, l[2], 30, 128, 25, "#a9d0e0", "left", 500); txt(q, l[3], 30, 176, 19, "#7fa6b8", "left", 500); txt(q, "TAP TO ENTER  ▸", 30, 268, 26, l[4], "left", 800); });
    const card = new T.Mesh(new T.PlaneGeometry(1.5, 1.5 * 320 / 512), basic(tex, { transparent: true, side: T.DoubleSide })); card.position.y = 2.3 + (i % 2) * 0.6; card.userData.vhall = "p:" + l[0]; g.add(card);
    g.rotation.y = Math.atan2(CX - x, CZ - z); peds.push({ x, z, card, ph: i * 0.9, base: 2.3 + (i % 2) * 0.6 });
  });

  /* ---------- walking ---------- */
  const solids = peds.map((p) => ({ x: p.x, z: p.z, r: 0.75 })).concat([{ x: CX, z: CZ, r: 1.65 }]);
  const inHall = (p) => !!p && p.z > Z0 + 0.6;
  function cands(x, z, out) {
    const r = { x0: X0 + 0.7, x1: X1 - 0.7, z0: Z0 + 0.7, z1: Z1 - 0.7 }, cx = clampN(x, r.x0, r.x1), cz = clampN(z, r.z0, r.z1); out.push([cx, cz, (cx - x) ** 2 + (cz - z) ** 2]);
    if (gate.open > 0.85) { const p = { x0: GX - 1.1, x1: GX + 1.1, z0: Z0 - 0.9, z1: Z0 + 0.8 }, qx = clampN(x, p.x0, p.x1), qz = clampN(z, p.z0, p.z1); out.push([qx, qz, (qx - x) ** 2 + (qz - z) ** 2]); }
  }
  function solidFn(px, pz) { solids.forEach((o) => { const dx = px - o.x, dz = pz - o.z, l = Math.hypot(dx, dz); if (l < o.r) { const k = o.r / (l || 1e-6); px = o.x + (l ? dx * k : o.r); pz = o.z + (l ? dz * k : 0); } }); return [px, pz]; }

  /* ---------- per frame ---------- */
  function update(t, dt, cam, lvl1) {
    const sdt = Math.min(dt, 0.1);
    if (cam && lvl1 && cam.z > Z0 - 9) { const dd = Math.hypot(cam.x - GX, cam.z - Z0); if (dd < 2.8) gate.target = 1; else if (dd > 5.8) gate.target = 0; }
    const vis = !!cam && lvl1 && (gate.open > 0.02 || cam.z > Z0 - 0.3); if (hall.visible !== vis) { hall.visible = vis; if (vis) paintT = 9; }
    if (!vis) return; tt += sdt;
    body.rotation.y += sdt * 0.35; const sy = (tt * 0.45) % 1; scan.position.y = 0.05 + sy * 2.9; scan2.position.y = 0.05 + (1 - sy) * 2.9; scan.scale.setScalar(0.6 + 0.4 * Math.sin(sy * PI)); scan2.scale.setScalar(0.6 + 0.4 * Math.sin(sy * PI));
    organs.forEach((o) => { const s = 1 + 0.12 * Math.sin(tt * 2.2 + o.ph), q = o.m.userData.lab === "mi" ? 1 : 1; o.m.scale.set(o.s[0] * s * q, o.s[1] * s, o.s[2] * s); });
    ring.material.map.offset.x = (ring.material.map.offset.x + sdt * 0.02) % 1;
    minis.forEach((m) => { m.mini.rotation.y += sdt * 0.8; m.mini.position.y = 1.5 + 0.06 * Math.sin(tt * 1.6 + m.ph); });
    peds.forEach((p) => { p.card.position.y = p.base + 0.05 * Math.sin(tt * 1.5 + p.ph); });
    if (cam) { paintT += sdt; if (paintT > (inHall(cam) ? 0.14 : 0.8)) { paintT = 0; paintLed(tt); } }
  }
  function tap(kind) {
    if (!kind || kind.slice(0, 2) !== "p:" || !hall.visible) return null; const r = kind.slice(2);
    if (r === "home") return { route: "", say: "p_home" };
    if (r === "steps") return { route: "", say: "p_steps" };
    if (r === "views") return { route: "", say: "p_views" };
    return { route: "sys/" + r, say: "p_" + r };
  }
  return { gate, GX, inHall, cands, solid: solidFn, update, tap, group: hall };
}

/* ============================== DOM: the open button and the full-screen PATHODYNAMICS overlay ============================== */
export function mountPathoUI(up, getPos) {
  const css = document.createElement("style");
  css.textContent = `#pd-btn,#pd-ov{font-family:system-ui,sans-serif;color:#eafff8}
#pd-btn{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:7;display:none;padding:12px 22px;border-radius:999px;border:1.5px solid #27e0b0;background:rgba(4,22,26,.9);font-weight:800;font-size:15px;letter-spacing:.05em;cursor:pointer;box-shadow:0 0 24px rgba(39,224,176,.45);min-height:44px}
#pd-ov{position:fixed;inset:0;z-index:13;display:none;background:#030612}
#pd-ov iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#030612}
#pd-ov .ld{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9fe8d0;font-size:14px;letter-spacing:.12em;pointer-events:none}`;
  document.head.appendChild(css);
  const btn = document.createElement("button"); btn.id = "pd-btn"; btn.type = "button"; btn.textContent = "🫀  OPEN PATHODYNAMICS";
  const ov = document.createElement("div"); ov.id = "pd-ov"; ov.innerHTML = '<div class="ld">LOADING PATHODYNAMICS…</div>';
  document.body.appendChild(btn); document.body.appendChild(ov);
  let fr = null, open = false;
  const base = new URL("./pathodynamics/index.html", import.meta.url).href;
  function openPatho(route) {
    if (open) return; open = true; fr = document.createElement("iframe"); fr.setAttribute("allow", "fullscreen; autoplay"); fr.title = "PATHODYNAMICS – Interactive Clinical Pathophysiology";
    fr.src = base + "?embed=1&v=" + PATHO_VER + "#/" + (route || ""); ov.appendChild(fr); ov.style.display = "block"; btn.style.display = "none";
  }
  function closePatho() { if (!open) return; open = false; ov.style.display = "none"; if (fr) { fr.src = "about:blank"; fr.remove(); fr = null; } }
  window.addEventListener("message", (e) => { if (e.data && e.data.type === "ccpatho-close" && e.origin === location.origin) closePatho(); });
  window.addEventListener("keydown", (e) => { if (open && e.key === "Escape") closePatho(); });
  btn.onclick = () => openPatho("");
  up.openPatho = openPatho; up.closePatho = closePatho;
  setInterval(() => { const p = getPos(), here = up.inPatho ? up.inPatho(p) : false; btn.style.display = here && !open ? "block" : "none"; if (!here && open) closePatho(); }, 250);
}
