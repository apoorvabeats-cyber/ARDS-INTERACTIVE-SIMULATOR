/* Level 1 of the command suite: a lift tower in the auditorium, a lobby above the auditorium and, above the Nexus hall,
   the video auditorium: a round, tiered theatre with a curved LED wall, a glowing stage ring and a podium.
   The videos are listed in ./videos/videos.json (edit titles there); a tile menu is drawn on the LED wall, and a DOM
   console (mountVideoUI) offers the same choice with play, pause, next, seek and volume.

   buildUpper(T, ctx) -> { lift, doors, player, level(), isUp(), clamp(x,z), groundY(x,z), update(t,dt,cam), tap(kind,hit), inHall(p), ... } */

export function buildUpper(T, c) {
  const { G, M, E, mesh, bx, cyl, pl, ctex, dcv, makeDoor, wallMat, slats, acoustic, cyan, cyanDim, white, dark, metal, LOW, AU, cxA, ZC, MDTC, RHN } = c;
  const V = T.Vector3, PI = Math.PI;
  const LV = 7.5, LH = 5.6, TOP = LV + LH, Y0 = LV - 1.9, CEIL = 7.0;          /* lobby floor, lobby height, video-hall stage floor, auditorium ceiling */
  const XT = cxA + 4.0, ZF = AU.z0 + 2.3;                                       /* lift tower: centre x, front plane */
  const CAB = { x0: XT - 1.2, x1: XT + 1.2, z0: AU.z0 + 0.08, z1: ZF - 0.14 };
  const HC = { x: MDTC.x, z: ZC }, HR = RHN - 0.05, S = { x: HC.x + 2.0, z: ZC }, YC = Y0 + 11.0;
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v)), smooth = (k) => k * k * (3 - 2 * k);
  const top = new T.Group(); top.name = "level1"; top.visible = false; G.add(top);
  const tower = new T.Group(); G.add(tower);
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  const txt = (g, s, x, y, px, col, al, wt, glow) => { g.font = (wt || 700) + " " + px + "px system-ui,sans-serif"; g.fillStyle = col || "#e4f6ff"; g.textAlign = al || "left"; g.textBaseline = "middle"; g.shadowColor = glow || "transparent"; g.shadowBlur = glow ? px * 0.35 : 0; g.fillText(s, x, y); g.shadowBlur = 0; };
  const basic = (map, o) => new T.MeshBasicMaterial(Object.assign({ map, toneMapped: false }, o || {}));
  const panelBg = (g, w, h, a, b) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a || "#06182a"); gr.addColorStop(1, b || "#0a2a46"); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  const frame = (g, w, h, col, lw) => { g.strokeStyle = col || "#36d6ff"; g.lineWidth = lw || 4; g.strokeRect(lw / 2 || 2, lw / 2 || 2, w - (lw || 4), h - (lw || 4)); };

  /* ============================== LIFT TOWER ============================== */
  const bm = M(0x1a2430, { metalness: 0.85, roughness: 0.34, envMapIntensity: 1.2 });
  /* a box that may run through the auditorium ceiling: the part above it belongs to level 1 and is hidden from the ground */
  function col(w, d, x, z, ya, yb, mat) {
    if (ya < CEIL) { const yb2 = Math.min(yb, CEIL); bx(w, yb2 - ya, d, mat || bm, x, (ya + yb2) / 2, z, tower); }
    if (yb > CEIL) { const ya2 = Math.max(ya, CEIL); bx(w, yb - ya2, d, mat || bm, x, (ya2 + yb) / 2, z, top); }
  }
  const FD = 0.24, zMid = (ZF + AU.z0) / 2;
  col(0.2, ZF - AU.z0, XT - 1.9, zMid, 0, TOP); col(0.2, ZF - AU.z0, XT + 1.9, zMid, 0, TOP); col(4.0, 0.2, XT, AU.z0 + 0.1, 0, TOP);
  col(1.0, FD, XT - 1.5, ZF, 0, TOP); col(1.0, FD, XT + 1.5, ZF, 0, TOP);
  col(2.0, FD, XT, ZF, 2.6, LV); col(2.0, FD, XT, ZF, LV + 2.6, TOP);
  const trim = (w, h, d, x, y, z, m) => { const yb = y + h / 2, ya = y - h / 2; if (ya < CEIL) bx(w, Math.min(yb, CEIL) - ya, d, m, x, (ya + Math.min(yb, CEIL)) / 2, z, tower); if (yb > CEIL) bx(w, yb - Math.max(ya, CEIL), d, m, x, (Math.max(ya, CEIL) + yb) / 2, z, top); };
  [-1, 1].forEach((k) => { trim(0.03, TOP, 0.03, XT + k * 1.0, TOP / 2, ZF + 0.14, cyan); trim(0.03, TOP, 0.03, XT + k * 1.98, TOP / 2, ZF + 0.14, cyanDim); });
  [2.62, LV - 0.02, LV + 2.62, TOP - 0.03].forEach((y) => trim(2.0, 0.03, 0.03, XT, y, ZF + 0.14, cyan));
  /* floor indicator plates and the large lift sign */
  const ind = [0, 1].map((lv) => { const d = dcv(256, 90), m = new T.Mesh(new T.PlaneGeometry(0.9, 0.9 * 90 / 256), basic(d.t)); m.position.set(XT, lv * LV + 2.88, ZF + 0.135); (lv ? top : tower).add(m); return d; });
  const liftSign = (lv) => ctex(512, 256, (g, w, h) => {
    panelBg(g, w, h, "#06141f", "#0b2a42"); frame(g, w, h, "#36d6ff", 6);
    g.shadowColor = "#36d6ff"; g.shadowBlur = 12; g.strokeStyle = "#36d6ff"; g.lineWidth = 6; g.lineJoin = "round";
    g.strokeRect(34, 70, 76, 116); g.beginPath(); g.moveTo(72, 70); g.lineTo(72, 186); g.stroke(); g.shadowBlur = 0;
    txt(g, lv ? "GROUND FLOOR" : "FIRST FLOOR", 134, 100, 42, "#eaf6ff", "left", 800, "#36d6ff");
    txt(g, lv ? "Auditorium" : "Video Auditorium", 134, 158, 30, "#9fe8ff", "left", 600);
  });
  { const m0 = new T.Mesh(new T.PlaneGeometry(1.4, 0.7), basic(liftSign(0))); m0.position.set(XT, 3.5, ZF + 0.135); tower.add(m0);
    const m1 = new T.Mesh(new T.PlaneGeometry(1.4, 0.7), basic(liftSign(1))); m1.position.set(XT, LV + 3.5, ZF + 0.135); top.add(m1); }
  /* call buttons on the right pillar */
  [0, 1].forEach((lv) => { [1.45, 1.2].forEach((y, i) => { const m = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.04, 20), E(i ? 0x36d6ff : 0xffb347, 2)); m.rotation.x = PI / 2; m.position.set(XT + 1.5, lv * LV + y, ZF + 0.14); (lv ? top : tower).add(m); }); });
  const d0 = makeDoor("lift0", XT, ZF, 2.0, 2.6, 0x36d6ff, tower), d1 = makeDoor("lift1", XT, ZF, 2.0, 2.6, 0x36d6ff, top);
  d0.lift = 0; d1.lift = 1; d1.g.position.y = LV; d1.center.y = LV; d0.noThrough = d1.noThrough = true;
  /* ---- the cabin ---- */
  const cab = new T.Group(); tower.add(cab);
  const cmid = (CAB.z0 + CAB.z1) / 2, cdep = CAB.z1 - CAB.z0;
  const cabM = M(0x3a4a5a, { metalness: 0.6, roughness: 0.35, envMapIntensity: 1.6, emissive: 0x0b2236, emissiveIntensity: 1.0 });
  bx(2.4, 0.08, cdep, M(0x0b1118, { metalness: 0.6, roughness: 0.25 }), XT, 0.04, cmid, cab);
  bx(2.4, 2.9, 0.06, cabM, XT, 1.45, CAB.z0, cab); bx(0.06, 2.9, cdep, cabM, CAB.x0, 1.45, cmid, cab); bx(0.06, 2.9, cdep, cabM, CAB.x1, 1.45, cmid, cab);
  bx(2.4, 0.06, cdep, M(0x10161d), XT, 2.88, cmid, cab); bx(2.0, 0.03, cdep - 0.3, E(0xdfefff, 2.4), XT, 2.84, cmid, cab);
  [CAB.x0 + 0.05, CAB.x1 - 0.05].forEach((x) => { bx(0.04, 0.05, cdep - 0.2, cyan, x, 1.0, cmid, cab); bx(0.05, 0.04, cdep, cyanDim, x, 0.1, cmid, cab); });
  bx(2.3, 0.04, 0.04, cyan, XT, 0.1, CAB.z0 + 0.04, cab);
  const board = dcv(512, 256); const bm2 = new T.Mesh(new T.PlaneGeometry(1.7, 0.85), basic(board.t)); bm2.position.set(XT, 1.75, CAB.z0 + 0.04); cab.add(bm2);
  const cabInd = dcv(256, 90); const ci = new T.Mesh(new T.PlaneGeometry(0.9, 0.32), basic(cabInd.t)); ci.position.set(XT, 2.6, CAB.z0 + 0.05); cab.add(ci);
  const cabFront = new T.Mesh(new T.PlaneGeometry(2.4, 0.3), new T.MeshBasicMaterial({ color: 0x06101a })); cabFront.position.set(XT, 2.75, CAB.z1); cab.add(cabFront);
  /* soft instrumental music and a spoken floor announcement while the lift travels (all made in the browser, no files) */
  const LA = { ctx: null, on: false, timer: null, master: null, step: 0, t0: 0 };
  const CH = [[48, [64, 67, 71], [60, 64, 67, 71, 67, 64]], [45, [60, 64, 67], [57, 60, 64, 67, 64, 60]], [41, [57, 60, 64], [53, 57, 60, 64, 60, 57]], [43, [59, 62, 64], [55, 59, 62, 64, 62, 59]]];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function note(c, dest, f, t, dur, type, vol, atk) { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (atk || 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); }
  function liftSched() {
    const c = LA.ctx; if (!c || !LA.on) return; const beat = 60 / 68;
    while (LA.t0 < c.currentTime + 1.3) {
      const bar = Math.floor(LA.step / 8) % CH.length, k = LA.step % 8, t = LA.t0, ch = CH[bar];
      if (k === 0) { note(c, LA.master, hz(ch[0]), t, beat * 4.2, "sine", 0.32, 0.08); ch[1].forEach((m) => { note(c, LA.master, hz(m - 12), t, beat * 4.2, "triangle", 0.07, 0.9); note(c, LA.master, hz(m - 12) * 1.004, t, beat * 4.2, "triangle", 0.06, 1.1); }); }
      if (k < 6) note(c, LA.master, hz(ch[2][k]), t, beat * 1.6, "sine", 0.11, 0.015);
      if (k === 0 || k === 4) note(c, LA.master, hz(ch[2][0] + 12), t + beat * 0.5, beat * 1.2, "sine", 0.04, 0.01);
      LA.t0 += beat / 2; LA.step++;
    }
  }
  function liftMusic(on) {
    if (on === LA.on) return;
    try {
      if (on) {
        LA.ctx = LA.ctx || new (window.AudioContext || window.webkitAudioContext)(); const c = LA.ctx; c.resume();
        LA.master = c.createGain(); LA.master.gain.value = 0; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; LA.master.connect(lp); lp.connect(c.destination);
        LA.master.gain.linearRampToValueAtTime(0.5, c.currentTime + 1.6); LA.on = true; LA.step = 0; LA.t0 = c.currentTime + 0.1; liftSched(); LA.timer = setInterval(liftSched, 300);
      } else {
        LA.on = false; clearInterval(LA.timer); const c = LA.ctx, m = LA.master; if (c && m) { m.gain.cancelScheduledValues(c.currentTime); m.gain.setValueAtTime(m.gain.value, c.currentTime); m.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.4); setTimeout(() => { try { m.disconnect(); } catch (e) {} }, 1800); }
      }
    } catch (e) { LA.on = on; }
  }
  function ding() { try { const c = LA.ctx; if (!c) return; const g = c.createGain(); g.gain.value = 0.5; g.connect(c.destination); const t = c.currentTime; note(c, g, 880, t, 1.2, "sine", 0.18, 0.01); note(c, g, 1318.5, t + 0.28, 1.4, "sine", 0.14, 0.01); } catch (e) {} }
  function say(txt2) { try { if (!window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(txt2); u.volume = 0.6; u.rate = 0.92; u.pitch = 1.05; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) {} }
  /* the lift: state, and the ride (close doors, travel, open doors) */
  const lift = { y: 0, level: 0, moving: false, carry: false, busy: false }, up = { level: 0 };
  const doorAt = (lv) => (lv ? d1 : d0);
  let job = null, indT = 0, wasLvl = -1;
  function ride(to, cb, carry) { job = { to, cb, carry: !!carry, from: lift.level, ph: 0, t: 0, y0: lift.y }; if (carry) { lift.carry = true; liftMusic(true); say(to ? "Going up to the first floor." : "Going down to the ground floor."); } }
  function call(lv, cb) { if (lift.level === lv && !job) { job = { to: lv, cb, carry: false, from: lv, ph: 2, t: 0, y0: lift.y }; } else ride(lv, cb, false); }
  function stepLift(dt) {
    if (!job) return; job.t += dt;
    if (job.ph === 0) {
      const dd = doorAt(job.from); dd.target = 0;
      if (job.from === job.to) { job.ph = 2; job.t = 0; return; }
      if (dd.open < 0.03 && job.t > 0.5) { job.ph = 1; job.t = 0; lift.moving = true; job.y1 = job.to ? LV : 0; job.dur = Math.max(1.5, Math.abs(job.y1 - job.y0) / LV * 5.6); }
    } else if (job.ph === 1) {
      const k = clampN(job.t / job.dur, 0, 1); lift.y = job.y0 + (job.y1 - job.y0) * smooth(k);
      if (k >= 1) { lift.y = job.y1; lift.level = job.to; lift.moving = false; if (job.carry) { up.level = job.to; liftMusic(false); ding(); say(job.to ? "First floor." : "Ground floor."); } job.ph = 2; job.t = 0; }
    } else {
      const dd = doorAt(job.to); dd.target = 1; if (dd.open > 0.92 || job.t > 4) { const cb = job.cb; lift.carry = false; job = null; if (cb) cb(); }
    }
  }
  const indPaint = (d, lv) => { const g = d.g, w = 256, h = 90; g.fillStyle = "#04101a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#36d6ff"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
    const y = lift.y / LV, lab = y < 0.5 ? "G" : "1", mv = lift.moving ? (job && job.to > job.from ? "▲" : "▼") : "•";
    txt(g, lab, 70, h / 2 + 2, 56, "#36d6ff", "center", 800, "#36d6ff"); txt(g, lift.moving ? mv : (lift.level === lv ? "OPEN" : "CALL"), 170, h / 2 + 2, lift.moving ? 52 : 34, lift.moving ? "#ffb347" : "#9fe8ff", "center", 800); d.t.needsUpdate = true; };
  const cabPaint = () => { const g = board.g, w = 512, h = 256; panelBg(g, w, h, "#04101a", "#0a2038"); frame(g, w, h, "#36d6ff", 6);
    const y = lift.y / LV, up2 = job && job.ph === 1 && job.to > job.from, dn = job && job.ph === 1 && job.to < job.from;
    if (lift.moving) { txt(g, "GOING TO THE", w / 2, 62, 32, "#9fe8ff", "center", 600); txt(g, up2 ? "FIRST FLOOR" : "GROUND FLOOR", w / 2, 128, 62, "#eaf6ff", "center", 800, "#36d6ff"); txt(g, up2 ? "▲" : "▼", w / 2, 192, 44, "#ffb347", "center", 800); }
    else { txt(g, y < 0.5 ? "GROUND FLOOR" : "FIRST FLOOR", w / 2, 100, 62, "#eaf6ff", "center", 800, "#36d6ff"); txt(g, y < 0.5 ? "Auditorium" : "Video Auditorium", w / 2, 172, 38, "#9fe8ff", "center", 600); }
    g.fillStyle = "rgba(54,214,255,.25)"; g.fillRect(40, 226, w - 80, 8); g.fillStyle = "#36d6ff"; g.fillRect(40, 226, (w - 80) * clampN(y, 0, 1), 8); board.t.needsUpdate = true; void dn; };

  /* ============================== LOBBY (above the auditorium) ============================== */
  const lw = (w, h, x, y, z, ry) => pl(w, h, wallMat(w, h, slats), x, y, z, ry, 0, top);
  const AWd = AU.x1 - AU.x0, ADp = AU.z1 - AU.z0;
  const lobFloor = ctex(1024, 1223, (g, w, h) => {
    const px = (x) => (x - AU.x0) / AWd * w, py = (z) => (z - AU.z0) / ADp * h;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0b1624"); gr.addColorStop(1, "#060b12"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(80,160,220,.07)"; g.lineWidth = 2; for (let i = 0; i <= 13; i++) { g.beginPath(); g.moveTo(i * w / 13.4, 0); g.lineTo(i * w / 13.4, h); g.stroke(); } for (let j = 0; j <= 16; j++) { g.beginPath(); g.moveTo(0, j * h / 16); g.lineTo(w, j * h / 16); g.stroke(); }
    g.lineCap = "round"; g.lineJoin = "round"; g.shadowColor = "#36d6ff"; g.shadowBlur = 16; g.strokeStyle = "#36d6ff"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(px(XT), py(ZF + 0.6)); g.lineTo(px(XT), py(ZC)); g.lineTo(px(AU.x1 - 1.0), py(ZC)); g.stroke();
    g.strokeStyle = "rgba(54,214,255,.55)"; g.lineWidth = 4; [2.1, 3.4].forEach((r) => { g.beginPath(); g.arc(px(cxA), py(-12.6), r / AWd * w, 0, 7); g.stroke(); });
    g.fillStyle = "rgba(54,214,255,.18)"; g.beginPath(); g.arc(px(cxA), py(-12.6), 1.4 / AWd * w, 0, 7); g.fill(); g.shadowBlur = 0;
  });
  mesh(new T.PlaneGeometry(AWd, ADp), M(0xffffff, { map: lobFloor, roughness: 0.2, metalness: 0.5, envMapIntensity: 1.1 }), cxA, LV + 0.004, (AU.z0 + AU.z1) / 2, top).rotation.x = -PI / 2;
  mesh(new T.PlaneGeometry(AWd, ADp), M(0x0b1118, { roughness: 0.9, side: T.DoubleSide }), cxA, TOP, (AU.z0 + AU.z1) / 2, top).rotation.x = PI / 2;
  mesh(new T.PlaneGeometry(AWd, ADp), M(0x05080c, { roughness: 1 }), cxA, CEIL + 0.02, (AU.z0 + AU.z1) / 2, top).rotation.x = -PI / 2;
  lw(ADp, LH, AU.x0 + 0.01, LV + LH / 2, (AU.z0 + AU.z1) / 2, PI / 2);
  lw(AWd, LH, cxA, LV + LH / 2, AU.z1 - 0.01, PI); lw(AWd, LH, cxA, LV + LH / 2, AU.z0 + 0.01, 0);
  lw(ZC - 1.5 - AU.z0, LH, AU.x1 - 0.01, LV + LH / 2, (AU.z0 + ZC - 1.5) / 2, -PI / 2); lw(AU.z1 - (ZC + 1.5), LH, AU.x1 - 0.01, LV + LH / 2, (AU.z1 + ZC + 1.5) / 2, -PI / 2); lw(3.0, LH - 4.4, AU.x1 - 0.01, LV + 4.4 + (LH - 4.4) / 2, ZC, -PI / 2);
  /* cove lines and ceiling rings */
  bx(AWd, 0.06, 0.06, cyan, cxA, TOP - 0.25, AU.z0 + 0.05, top); bx(AWd, 0.06, 0.06, cyan, cxA, TOP - 0.25, AU.z1 - 0.05, top); bx(0.06, 0.06, ADp, cyan, AU.x0 + 0.05, TOP - 0.25, (AU.z0 + AU.z1) / 2, top);
  bx(0.06, 0.06, ADp, cyan, AU.x1 - 0.05, TOP - 0.25, (AU.z0 + AU.z1) / 2, top); bx(AWd, 0.05, 0.05, cyanDim, cxA, LV + 0.07, AU.z1 - 0.04, top); bx(0.05, 0.05, ADp, cyanDim, AU.x0 + 0.04, LV + 0.07, (AU.z0 + AU.z1) / 2, top);
  [[1.5, 0.07, 0x36d6ff], [2.8, 0.05, 0xeaf6ff], [4.2, 0.05, 0x2a7fb8]].forEach((r) => { const t = mesh(new T.TorusGeometry(r[0], r[1], 8, 72), E(r[2], 2), cxA, TOP - 0.1, -12.6, top); t.rotation.x = PI / 2; });
  for (let i = -2; i <= 2; i++) bx(0.12, 0.04, 14, white, cxA + i * 2.6, TOP - 0.04, -13, top);
  /* wall displays: the Critical Care Education wall (west) and the library wall (north) */
  const eduWall = ctex(2048, 640, (g, w, h) => {
    panelBg(g, w, h, "#041428", "#08304f"); g.strokeStyle = "rgba(54,214,255,.18)"; g.lineWidth = 2; for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(i * 52, 0); g.lineTo(i * 52, h); g.stroke(); }
    frame(g, w, h, "#36d6ff", 8);
    txt(g, "CRITICAL CARE EDUCATION", 90, 200, 128, "#eaf6ff", "left", 800, "#36d6ff");
    txt(g, "Learn  ·  Practice  ·  Excel", 94, 330, 70, "#36d6ff", "left", 600, "#36d6ff");
    txt(g, "Procedure videos in the Video Auditorium", 94, 470, 44, "#7fa6c8", "left", 500);
    g.strokeStyle = "#36d6ff"; g.lineWidth = 7; g.shadowColor = "#36d6ff"; g.shadowBlur = 20; const cx = w - 300, cy = h / 2; g.beginPath(); g.arc(cx, cy, 150, 0, 7); g.stroke(); g.fillStyle = "#36d6ff"; g.beginPath(); g.moveTo(cx - 40, cy - 70); g.lineTo(cx - 40, cy + 70); g.lineTo(cx + 80, cy); g.closePath(); g.fill(); g.shadowBlur = 0;
  });
  { const m = new T.Mesh(new T.PlaneGeometry(8.2, 8.2 * 640 / 2048), basic(eduWall)); m.position.set(AU.x0 + 0.05, LV + 2.9, -12.6); m.rotation.y = PI / 2; top.add(m); bx(8.3, 0.05, 0.04, cyan, AU.x0 + 0.04, LV + 2.9 - 1.33, -12.6, top); bx(8.3, 0.05, 0.04, cyan, AU.x0 + 0.04, LV + 2.9 + 1.33, -12.6, top); }
  const dirTex = dcv(1536, 520);
  { const m = new T.Mesh(new T.PlaneGeometry(7.4, 7.4 * 520 / 1536), basic(dirTex.t)); m.position.set(cxA - 1.2, LV + 2.8, AU.z1 - 0.06); m.rotation.y = PI; top.add(m); }
  /* sign above the gate to the video auditorium */
  const gateSign = ctex(768, 200, (g, w, h) => {
    g.fillStyle = "#06101a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#7aa8ff"; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.shadowColor = "#7aa8ff"; g.shadowBlur = 14; g.strokeStyle = "#7aa8ff"; g.fillStyle = "#7aa8ff"; g.lineWidth = 6; g.strokeRect(70, 60, 90, 62); g.beginPath(); g.moveTo(104, 76); g.lineTo(104, 106); g.lineTo(134, 91); g.closePath(); g.fill(); g.fillRect(96, 132, 38, 8); g.shadowBlur = 0;
    txt(g, "VIDEO AUDITORIUM", 200, 80, 48, "#e4f6ff", "left", 800); txt(g, "First floor · Procedure videos", 200, 140, 30, "#8fb6cf", "left", 500);
  });
  { const m = new T.Mesh(new T.PlaneGeometry(2.4, 2.4 * 200 / 768), basic(gateSign)); m.position.set(AU.x1 - 0.05, LV + 4.98, ZC); m.rotation.y = -PI / 2; m.userData.door = "vhall"; top.add(m); }
  /* the kiosk: a ring base and a slowly turning holographic sphere */
  const kiosk = new T.Group(); kiosk.position.set(cxA, LV, -12.6); top.add(kiosk);
  cyl(1.0, 1.15, 0.9, M(0x121a22, { metalness: 0.7, roughness: 0.3 }), 0, 0.45, 0, kiosk, 32); { const r = new T.Mesh(new T.RingGeometry(0.78, 0.98, 48), E(0x36d6ff, 2)); r.rotation.x = -PI / 2; r.position.y = 0.92; kiosk.add(r); } cyl(1.18, 1.18, 0.05, cyan, 0, 0.03, 0, kiosk, 32);
  const holo = new T.Mesh(new T.IcosahedronGeometry(0.5, 1), new T.MeshBasicMaterial({ color: 0x36d6ff, wireframe: true, transparent: true, opacity: 0.8, toneMapped: false })); holo.position.set(0, 1.9, 0); kiosk.add(holo);
  const holo2 = new T.Mesh(new T.TorusGeometry(0.72, 0.012, 6, 64), E(0x9fe8ff, 2)); holo2.position.set(0, 1.9, 0); holo2.rotation.x = 1.2; kiosk.add(holo2);
  cyl(0.02, 0.02, 0.8, E(0x36d6ff, 1.2), 0, 1.35, 0, kiosk, 6);
  [-1, 1].forEach((s) => [-14.5, -10.5].forEach((z) => { bx(0.5, 0.42, 2.4, M(0x16202a, { metalness: 0.5, roughness: 0.4 }), AU.x0 + 0.5 + 0.1, LV + 0.21, z, top); bx(0.05, 0.04, 2.3, cyan, AU.x0 + 0.78, LV + 0.44, z, top); }));

  /* ============================== VIDEO AUDITORIUM (above the Nexus hall) ============================== */
  const hall = new T.Group(); top.add(hall);
  const polar = (cx, cz, r, a) => [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  /* an annular sector, extruded upwards: points are given in world x,z; shape y = -z */
  function ext(pts, h, y, mat, par) {
    const sh = new T.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])));
    const g = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-PI / 2); const m = new T.Mesh(g, mat); m.position.y = y; (par || hall).add(m); return m;
  }
  const arcPts = (cx, cz, r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) o.push(polar(cx, cz, r, a0 + (a1 - a0) * i / n)); return o; };
  /* walls: slatted, open-ended, seen from inside; the gap in the west is the entrance passage */
  const ga = Math.asin(1.5 / HR), wallH = YC - Y0;
  const slatT = slats.clone(); slatT.needsUpdate = true; slatT.repeat.set(36, 3); slatT.wrapS = slatT.wrapT = T.RepeatWrapping;
  const hallWall = M(0x9fb4c8, { map: slatT, roughness: 0.8, metalness: 0.2, side: T.BackSide });
  { const g = new T.CylinderGeometry(HR, HR, wallH, 120, 1, true, -PI / 2 + ga, 2 * PI - 2 * ga); const m = new T.Mesh(g, hallWall); m.position.set(HC.x, Y0 + wallH / 2, HC.z); hall.add(m);
    const hh = YC - (LV + 4.4), g2 = new T.CylinderGeometry(HR, HR, hh, 12, 1, true, -PI / 2 - ga, 2 * ga); const m2 = new T.Mesh(g2, hallWall); m2.position.set(HC.x, LV + 4.4 + hh / 2, HC.z); hall.add(m2); }
  /* floor and glowing stage rings */
  const floorTx = ctex(1024, 1024, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2); gr.addColorStop(0, "#0e2238"); gr.addColorStop(0.5, "#08121f"); gr.addColorStop(1, "#050a12"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(80,170,230,.12)"; g.lineWidth = 2; for (let i = 1; i < 12; i++) { g.beginPath(); g.arc(w / 2, h / 2, i * w / 24, 0, 7); g.stroke(); } for (let i = 0; i < 24; i++) { const a = i * PI / 12; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w / 2, h / 2 + Math.sin(a) * w / 2); g.stroke(); }
  });
  { const f = mesh(new T.CircleGeometry(HR, 96), M(0xffffff, { map: floorTx, roughness: 0.2, metalness: 0.5, envMapIntensity: 1.1 }), HC.x, Y0 + 0.003, HC.z, hall); f.rotation.x = -PI / 2; }
  [[4.05, 4.15, 0x36d6ff, 2.2], [3.5, 3.56, 0xeaf6ff, 1.8], [2.4, 2.46, 0x2a7fb8, 1.8], [1.5, 1.54, 0x36d6ff, 1.6]].forEach((r) => { const m = mesh(new T.RingGeometry(r[0], r[1], 96), E(r[2], r[3]), S.x, Y0 + 0.012, S.z, hall); m.rotation.x = -PI / 2; });
  { const m = mesh(new T.CircleGeometry(4.0, 64), new T.MeshBasicMaterial({ color: 0x0b2a46, transparent: true, opacity: 0.55, toneMapped: false }), S.x, Y0 + 0.008, S.z, hall); m.rotation.x = -PI / 2; }
  /* tiers */
  const TR0 = 4.5, TP = 0.78, TN = 6, PHI1 = PI * 100 / 180, AISLE = 1.4;
  const tierMat = M(0x16283a, { metalness: 0.4, roughness: 0.5, envMapIntensity: 1.0 }), tierEdge = E(0x36d6ff, 1.8);
  const rampH = (r) => 1.9 * clampN((r - 4.2) / 5, 0, 1);
  const seatPos = [];
  for (let k = 0; k < TN; k++) {
    const r0 = TR0 + k * TP, r1 = r0 + TP, rc = (r0 + r1) / 2, hk = rampH(rc);
    [-1, 1].forEach((s) => {
      const phi = (r) => Math.asin(AISLE / r), pts = [], P = (r, p) => { const o = [S.x - r * Math.cos(p), S.z + s * r * Math.sin(p)]; return o; };
      const n = 14; for (let i = 0; i <= n; i++) pts.push(P(r1, phi(r1) + (PHI1 - phi(r1)) * i / n)); for (let i = n; i >= 0; i--) pts.push(P(r0, phi(r0) + (PHI1 - phi(r0)) * i / n));
      ext(pts, hk, Y0, tierMat);
      const edge = []; for (let i = 0; i <= n; i++) edge.push(P(r0 + 0.03, phi(r0) + (PHI1 - phi(r0)) * i / n)); for (let i = n; i >= 0; i--) edge.push(P(r0 + 0.07, phi(r0) + (PHI1 - phi(r0)) * i / n));
      ext(edge, 0.025, Y0 + hk, tierEdge);
      const pa = phi(rc) + 0.16, pb = PHI1 - 0.1, cnt = Math.max(2, Math.floor((pb - pa) * rc / 0.66));
      for (let i = 0; i < cnt; i++) { const p = pa + (pb - pa) * (cnt === 1 ? 0.5 : i / (cnt - 1)), q = P(rc + 0.1, p); seatPos.push([q[0], Y0 + hk, q[1]]); }
    });
  }
  const seatBase = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.1, 0.5), M(0x1d6f8f, { roughness: 0.6, metalness: 0.1 }), seatPos.length);
  const seatBack = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.56, 0.08), M(0x1d6f8f, { roughness: 0.6, metalness: 0.1 }), seatPos.length);
  const seatLeg = new T.InstancedMesh(new T.CylinderGeometry(0.05, 0.08, 0.3, 8), metal, seatPos.length);
  { const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(1, 1, 1), ps = new T.Vector3();
    seatPos.forEach((p, i) => { const fx = S.x - p[0], fz = S.z - p[2], th = Math.atan2(-fx, -fz); e.set(0, th, 0); q.setFromEuler(e);
      const sx = Math.sin(th), cz = Math.cos(th);
      ps.set(p[0], p[1] + 0.3, p[2]); m4.compose(ps, q, sc); seatBase.setMatrixAt(i, m4);
      ps.set(p[0] + sx * 0.22, p[1] + 0.58, p[2] + cz * 0.22); m4.compose(ps, q, sc); seatBack.setMatrixAt(i, m4);
      ps.set(p[0], p[1] + 0.15, p[2]); m4.compose(ps, q, sc); seatLeg.setMatrixAt(i, m4); });
    [seatBase, seatBack, seatLeg].forEach((m) => { m.instanceMatrix.needsUpdate = true; hall.add(m); }); }
  /* the aisle: a lit ramp from the concourse down to the stage */
  { const L = Math.hypot(5.0, 1.9), ang = Math.atan2(1.9, 5.0), gp = new T.PlaneGeometry(L, 2 * AISLE); gp.rotateX(-PI / 2);
    const ramp = new T.Mesh(gp, M(0x0b1722, { roughness: 0.3, metalness: 0.5, envMapIntensity: 1.1 })); ramp.rotation.z = -ang; ramp.position.set(S.x - 6.7, Y0 + 0.95 + 0.004, S.z); hall.add(ramp);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.BoxGeometry(L, 0.03, 0.05), cyan); e.rotation.z = -ang; e.position.set(S.x - 6.7, Y0 + 0.95 + 0.03, S.z + s * (AISLE - 0.05)); hall.add(e); });
    for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8, x = S.x - 4.2 - 5.0 * t, y = Y0 + 1.9 * t + 0.02; bx(0.05, 0.02, 1.5, cyanDim, x, y, S.z, hall); } }
  /* concourse behind the seats */
  { const pts = [], inner = 9.2, n = 36, a0 = PI - PHI1, a1 = PI + PHI1;
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(polar(S.x, S.z, inner, a)); }
    for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n, dx = Math.cos(a), dz = Math.sin(a), b = 2 * ((S.x - HC.x) * dx + (S.z - HC.z) * dz), cc = (S.x - HC.x) ** 2 + (S.z - HC.z) ** 2 - (HR - 0.03) ** 2, rho = (-b + Math.sqrt(b * b - 4 * cc)) / 2; pts.push(polar(S.x, S.z, rho, a)); }
    ext(pts, 1.9 - 0.003, Y0, M(0x0f1c2a, { metalness: 0.5, roughness: 0.3, envMapIntensity: 1.0 })); }
  { const a0 = PI - PHI1, arc = 2 * PHI1, t = new T.Mesh(new T.TorusGeometry(9.2, 0.035, 6, 90, arc), E(0x36d6ff, 2)); t.rotation.x = -PI / 2; const w = new T.Group(); w.rotation.y = -(PI + PHI1); w.position.set(S.x, LV + 0.04, S.z); w.add(t); hall.add(w); }
  /* the entrance passage between the lobby gate and the hall */
  { const px0 = AU.x1 - 0.02, px1 = HC.x - Math.sqrt(HR * HR - 1.5 * 1.5) + 0.12, len = px1 - px0, cx = (px0 + px1) / 2;
    mesh(new T.PlaneGeometry(len, 3.0), M(0x0b1118, { roughness: 0.3, metalness: 0.5 }), cx, LV + 0.004, ZC, hall).rotation.x = -PI / 2;
    [-1, 1].forEach((s) => pl(len, 4.4, M(0x0a0f14, { side: T.DoubleSide }), cx, LV + 2.2, ZC + s * 1.5, 0, 0, hall)); pl(len, 3.0, M(0x0a0f14, { side: T.DoubleSide }), cx, LV + 4.4, ZC, 0, PI / 2, hall); }
  /* the LED wall, curved around the east, and the organ panels either side */
  const rs = HR - 0.4, SA = 62 * PI / 180, SW = LOW ? 1280 : 1792, SH = Math.round(SW / 3.2), SHT = 7.0, SY = Y0 + 0.55 + SHT / 2;
  const scr = dcv(SW, SH); scr.t.wrapS = T.RepeatWrapping; scr.t.repeat.set(-1, 1); scr.t.offset.set(1, 0);
  const screen = new T.Mesh(new T.CylinderGeometry(rs, rs, SHT, 96, 1, true, PI / 2 - SA, 2 * SA), new T.MeshBasicMaterial({ map: scr.t, toneMapped: false, side: T.BackSide }));
  screen.position.set(HC.x, SY, HC.z); screen.userData.vhall = "screen"; hall.add(screen);
  [SY - SHT / 2 - 0.1, SY + SHT / 2 + 0.1].forEach((y) => { const b = new T.Mesh(new T.CylinderGeometry(rs + 0.04, rs + 0.04, 0.2, 96, 1, false, PI / 2 - SA - 0.02, 2 * SA + 0.04), M(0x0b1118, { metalness: 0.6, roughness: 0.4 })); b.position.set(HC.x, y, HC.z); hall.add(b);
    const l = new T.Mesh(new T.CylinderGeometry(rs - 0.02, rs - 0.02, 0.05, 96, 1, true, PI / 2 - SA, 2 * SA), new T.MeshBasicMaterial({ color: new T.Color(0x36d6ff).multiplyScalar(2.2), toneMapped: false, side: T.DoubleSide })); l.position.set(HC.x, y + (y < SY ? 0.12 : -0.12), HC.z); hall.add(l); });
  const organ = (kind) => ctex(384, 1024, (g, w, h) => {
    panelBg(g, w, h, "#041428", "#08304f"); frame(g, w, h, "#36d6ff", 8);
    g.strokeStyle = "#36d6ff"; g.fillStyle = "rgba(54,214,255,.12)"; g.lineWidth = 8; g.lineJoin = "round"; g.lineCap = "round"; g.shadowColor = "#36d6ff"; g.shadowBlur = 24;
    const icon = (k, cx, cy, s) => { g.save(); g.translate(cx, cy); g.scale(s, s); g.beginPath();
      if (k === "brain") { g.ellipse(-26, 0, 62, 70, 0, 0, 7); g.ellipse(26, 0, 62, 70, 0, 0, 7); g.moveTo(0, -66); g.lineTo(0, 66); for (let i = -2; i <= 2; i++) { g.moveTo(-86, i * 22); g.quadraticCurveTo(-60, i * 22 - 18, -34, i * 22); g.moveTo(34, i * 22); g.quadraticCurveTo(60, i * 22 - 18, 86, i * 22); } g.moveTo(-14, 82); g.lineTo(-14, 118); g.lineTo(14, 118); g.lineTo(14, 82); }
      else if (k === "lungs") { g.moveTo(-14, -80); g.lineTo(-14, -30); g.moveTo(14, -80); g.lineTo(14, -30); g.moveTo(-14, -30); g.bezierCurveTo(-90, -50, -110, 60, -70, 90); g.bezierCurveTo(-40, 100, -20, 60, -14, 20); g.closePath(); g.moveTo(14, -30); g.bezierCurveTo(90, -50, 110, 60, 70, 90); g.bezierCurveTo(40, 100, 20, 60, 14, 20); g.closePath(); }
      else if (k === "heart") { g.moveTo(0, 90); g.bezierCurveTo(-130, -10, -70, -90, 0, -34); g.bezierCurveTo(70, -90, 130, -10, 0, 90); g.moveTo(-40, -34); g.lineTo(-40, -92); g.moveTo(24, -42); g.lineTo(24, -96); }
      else { g.moveTo(-30, -80); g.bezierCurveTo(-100, -70, -100, 70, -30, 80); g.bezierCurveTo(-10, 80, -10, 40, -40, 20); g.bezierCurveTo(-60, 0, -40, -30, -20, -30); g.bezierCurveTo(0, -30, 0, -80, -30, -80); g.moveTo(-14, 0); g.lineTo(30, 0); g.lineTo(60, 60); g.moveTo(30, 0); g.lineTo(60, -50); }
      g.fill(); g.stroke(); g.restore(); };
    const ks = kind === "L" ? [["brain", "NEURO"], ["lungs", "RESPIRATORY"]] : [["heart", "CARDIAC"], ["kidney", "RENAL"]];
    ks.forEach((o, i) => { icon(o[0], w / 2, 270 + i * 480, 1.15); g.shadowBlur = 0; txt(g, o[1], w / 2, 440 + i * 480, 40, "#9fe8ff", "center", 700); g.shadowBlur = 24; }); g.shadowBlur = 0;
  });
  [["L", PI / 2 + 74 * PI / 180], ["R", PI / 2 - 74 * PI / 180]].forEach((o) => {
    const wv = 2.6 / rs, m = new T.Mesh(new T.CylinderGeometry(rs - 0.02, rs - 0.02, 6.4, 24, 1, true, o[1] - wv / 2, wv), new T.MeshBasicMaterial({ map: organ(o[0]), toneMapped: false, side: T.BackSide }));
    m.position.set(HC.x, Y0 + 0.9 + 3.2, HC.z); hall.add(m); const t = organ(o[0]); t.wrapS = T.RepeatWrapping; t.repeat.set(-1, 1); t.offset.set(1, 0); m.material.map = t; });
  /* podium with the Critical Care Hub sign and its holographic prompt */
  const pod = new T.Group(); pod.position.set(S.x, Y0, S.z); hall.add(pod);
  const podBody = cyl(0.55, 0.75, 1.15, M(0x131c26, { metalness: 0.7, roughness: 0.3, envMapIntensity: 1.2 }), 0, 0.575, 0, pod, 6); podBody.userData.vhall = "podium";
  cyl(0.62, 0.62, 0.05, E(0x36d6ff, 2.2), 0, 1.17, 0, pod, 6); cyl(0.8, 0.8, 0.04, cyan, 0, 0.03, 0, pod, 6);
  const podSign = ctex(512, 160, (g, w, h) => { panelBg(g, w, h, "#041428", "#08304f"); frame(g, w, h, "#36d6ff", 5); txt(g, "CRITICAL CARE HUB", w / 2, h / 2 + 3, 50, "#eaf6ff", "center", 800, "#36d6ff"); });
  { const m = new T.Mesh(new T.PlaneGeometry(0.72, 0.72 * 160 / 512), basic(podSign)); m.position.set(-0.62, 0.62, 0); m.rotation.y = -PI / 2; m.userData.vhall = "podium"; pod.add(m); }
  const podHolo = ctex(640, 300, (g, w, h) => { panelBg(g, w, h, "rgba(4,20,40,.85)", "rgba(8,48,79,.85)"); frame(g, w, h, "#36d6ff", 5); txt(g, "VIDEO LIBRARY", w / 2, 100, 62, "#eaf6ff", "center", 800, "#36d6ff"); txt(g, "Tap to choose a video", w / 2, 180, 36, "#9fe8ff", "center", 500); txt(g, "15 procedures", w / 2, 235, 28, "#7fa6c8", "center", 500); });
  const holoPs = [];
  [-1, 1].forEach((k) => { const holoP = new T.Mesh(new T.PlaneGeometry(1.5, 1.5 * 300 / 640), basic(podHolo, { transparent: true, opacity: 0.95 })); holoP.position.set(-0.3 * k, 1.95, 0); holoP.rotation.y = k < 0 ? PI / 2 : -PI / 2; holoP.userData.vhall = "podium"; pod.add(holoP); holoPs.push(holoP); });
  /* ceiling: concentric light rings and the caduceus */
  mesh(new T.CircleGeometry(HR, 72), M(0x0a1017, { roughness: 0.9, side: T.DoubleSide }), HC.x, YC, HC.z, hall).rotation.x = PI / 2;
  [2.9, 4.6, 6.6, 8.6].forEach((r, i) => { const t = mesh(new T.TorusGeometry(r, i ? 0.05 : 0.09, 8, 96), E(i === 0 ? 0x36d6ff : i === 1 ? 0xeaf6ff : 0x2a7fb8, 2), S.x, YC - 0.06, S.z, hall); t.rotation.x = PI / 2; });
  for (let i = 0; i < 16; i++) { const a = i * PI / 8, m = bx(0.08, 0.03, 4.6, white, S.x + Math.cos(a) * 5.0, YC - 0.03, S.z + Math.sin(a) * 5.0, hall); m.rotation.y = -a + PI / 2; }
  const cadT = ctex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = "rgba(4,20,40,.9)"; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, 7); g.fill(); g.strokeStyle = "#36d6ff"; g.lineWidth = 8; g.shadowColor = "#36d6ff"; g.shadowBlur = 22; g.stroke();
    g.lineWidth = 11; g.lineCap = "round"; g.beginPath(); g.moveTo(w / 2, 90); g.lineTo(w / 2, 430); g.stroke(); g.beginPath(); g.arc(w / 2, 86, 14, 0, 7); g.fillStyle = "#36d6ff"; g.fill();
    g.lineWidth = 8; [1, -1].forEach((s) => { g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, y = 150 + t * 250, x = w / 2 + s * Math.sin(t * 6 * PI) * 62 * (0.6 + 0.4 * t); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
    g.lineWidth = 9; [1, -1].forEach((s) => { g.beginPath(); g.moveTo(w / 2 + s * 14, 130); g.quadraticCurveTo(w / 2 + s * 120, 70, w / 2 + s * 190, 110); g.quadraticCurveTo(w / 2 + s * 130, 130, w / 2 + s * 90, 150); g.stroke(); });
  });
  { const m = new T.Mesh(new T.CircleGeometry(1.5, 48), basic(cadT, { transparent: true })); m.position.set(S.x, YC - 0.08, S.z); m.rotation.x = PI / 2; hall.add(m); }
  /* the wall light fins */
  for (let i = 0; i < 36; i++) { const a = i * PI / 18 + 0.03; if (Math.abs(Math.cos(a - PI / 2)) > 0.62 && Math.sin(a) > 0) { /* skip under the screen */ } const x = HC.x + (HR - 0.06) * Math.sin(a), z = HC.z + (HR - 0.06) * Math.cos(a);
    if (Math.sin(a) > 0.44 && Math.abs(Math.cos(a)) < 0.9) continue; const m = bx(0.05, 9, 0.06, cyanDim, x, Y0 + 5.2, z, hall); m.rotation.y = a; }

  /* ============================== THE PLAYER ============================== */
  const vid = document.createElement("video"); vid.playsInline = true; vid.setAttribute("playsinline", ""); vid.preload = "auto"; vid.style.cssText = "max-width:100%;max-height:100%";
  const amb = document.createElement("canvas"); amb.width = 32; amb.height = 18; const ag = amb.getContext("2d");
  const base = new URL("./videos/", import.meta.url);
  const pl8 = { list: [], posters: [], i: -1, mode: "menu", vol: 0.9, dirty: true, hover: -1, auto: true };
  const hits = []; let lastPaint = 0, theatre = false;
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  fetch(new URL("videos.json", base)).then((r) => r.json()).then((j) => { pl8.list = j; j.forEach((v, i) => { const im = new Image(); im.onload = () => { pl8.dirty = true; paintDir(); }; im.src = new URL(v.poster, base).href + "?v=169c"; pl8.posters[i] = im; }); pl8.dirty = true; paintDir(); (pl8.onList || (() => {}))(); }).catch(() => {});
  function play(i) {
    if (!pl8.list.length) return; i = (i + pl8.list.length) % pl8.list.length; pl8.i = i; pl8.mode = "play"; vid.src = new URL(pl8.list[i].file, base).href + "?v=169c"; vid.volume = pl8.vol;
    const p = vid.play(); if (p && p.catch) p.catch(() => {}); pl8.dirty = true; if (pl8.onChange) pl8.onChange();
  }
  function toggle() { if (pl8.i < 0) return; if (vid.paused) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); } else vid.pause(); pl8.dirty = true; if (pl8.onChange) pl8.onChange(); }
  function menu() { pl8.mode = "menu"; vid.pause(); pl8.dirty = true; if (pl8.onChange) pl8.onChange(); }
  vid.addEventListener("ended", () => { if (pl8.auto && pl8.i >= 0 && pl8.i < pl8.list.length - 1) play(pl8.i + 1); else { pl8.dirty = true; if (pl8.i >= pl8.list.length - 1) menu(); } });
  vid.addEventListener("play", () => { pl8.dirty = true; if (pl8.onChange) pl8.onChange(); }); vid.addEventListener("pause", () => { pl8.dirty = true; if (pl8.onChange) pl8.onChange(); });
  Object.assign(pl8, { play, toggle, menu, el: vid, next: () => play(pl8.i + 1), prev: () => play(pl8.i - 1), seek: (f) => { if (vid.duration) vid.currentTime = f * vid.duration; }, setVol: (v) => { pl8.vol = v; vid.volume = v; }, fmt,
    state: () => ({ i: pl8.i, mode: pl8.mode, playing: !vid.paused && pl8.mode === "play", t: vid.currentTime || 0, dur: vid.duration || (pl8.list[pl8.i] && pl8.list[pl8.i].dur) || 0 }) });
  const cover = (g, im, x, y, w, h, fy) => { if (!im || !im.width) { g.fillStyle = "#0a2038"; g.fillRect(x, y, w, h); return; } const ir = im.width / im.height, r = w / h; let sw, sh, sx, sy; if (ir > r) { sh = im.height; sw = sh * r; sx = (im.width - sw) / 2; sy = 0; } else { sw = im.width; sh = sw / r; sx = 0; sy = (im.height - sh) * (fy == null ? 0.38 : fy); } g.drawImage(im, sx, sy, sw, sh, x, y, w, h); };
  const wrapT = (g, s, x, y, mw, lh, maxL) => { const ws = s.split(" "); let line = "", n = 0; for (let i = 0; i < ws.length; i++) { const t = line ? line + " " + ws[i] : ws[i]; if (g.measureText(t).width > mw && line) { g.fillText(line, x, y + n * lh); n++; line = ws[i]; if (n >= maxL) return; } else line = t; } g.fillText(line, x, y + n * lh); };
  const bgFill = (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#031020"); gr.addColorStop(0.5, "#06223d"); gr.addColorStop(1, "#041020"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(54,214,255,.07)"; g.lineWidth = 1; for (let x = 0; x < w; x += h / 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } };
  function paintMenu(tn) {
    const g = scr.g, w = SW, h = SH, k = h / 560; bgFill(g, w, h);
    txt(g, "CRITICAL CARE EDUCATION", 0.04 * w, 0.09 * h, 56 * k, "#eaf6ff", "left", 800, "#36d6ff"); txt(g, "Learn  ·  Practice  ·  Excel", 0.04 * w, 0.185 * h, 30 * k, "#36d6ff", "left", 600);
    txt(g, "VIDEO LIBRARY", 0.96 * w, 0.085 * h, 36 * k, "#9fe8ff", "right", 700); txt(g, (pl8.list.length || 15) + " procedures  ·  tap a tile to play", 0.96 * w, 0.17 * h, 24 * k, "#7fa6c8", "right", 500);
    const cols = 5, rows = 3, x0 = 0.04 * w, y0 = 0.235 * h, W = 0.92 * w, H = 0.735 * h, gap = 0.011 * w, tw = (W - (cols - 1) * gap) / cols, th = (H - (rows - 1) * gap) / rows;
    pl8.list.forEach((v, i) => { const x = x0 + (i % cols) * (tw + gap), y = y0 + Math.floor(i / cols) * (th + gap), hv = pl8.hover === i;
      g.save(); g.beginPath(); g.rect(x, y, tw, th); g.clip(); cover(g, pl8.posters[i], x, y, tw, th); const gr = g.createLinearGradient(0, y + th * 0.45, 0, y + th); gr.addColorStop(0, "rgba(2,10,20,0)"); gr.addColorStop(1, "rgba(2,10,20,.92)"); g.fillStyle = gr; g.fillRect(x, y, tw, th); g.restore();
      g.strokeStyle = hv ? "#ffffff" : "rgba(54,214,255,.75)"; g.lineWidth = hv ? 5 * k : 2.5 * k; g.strokeRect(x, y, tw, th);
      g.fillStyle = "rgba(4,16,30,.85)"; g.fillRect(x, y, 46 * k, 36 * k); txt(g, String(i + 1), x + 23 * k, y + 19 * k, 24 * k, "#36d6ff", "center", 800);
      g.font = "700 " + 24 * k + "px system-ui,sans-serif"; g.fillStyle = "#eaf6ff"; g.textAlign = "left"; g.textBaseline = "alphabetic"; wrapT(g, v.title, x + 12 * k, y + th - 38 * k, tw - 24 * k, 26 * k, 2);
      txt(g, fmt(v.dur), x + tw - 10 * k, y + 20 * k, 20 * k, "#9fe8ff", "right", 600);
      hits.push({ x, y, w: tw, h: th, fn: () => play(i), hv: () => { if (pl8.hover !== i) { pl8.hover = i; pl8.dirty = true; } } }); });
    const sx = ((tn * 260) % (w + 400)) - 400; g.fillStyle = "rgba(54,214,255,.5)"; g.fillRect(sx, h - 5 * k, 400, 3 * k);
  }
  function paintPlay(tn) {
    const g = scr.g, w = SW, h = SH, k = h / 560, v = pl8.list[pl8.i], ok = vid.readyState >= 2; bgFill(g, w, h);
    if (ok) { ag.drawImage(vid, 0, 0, 32, 18); g.imageSmoothingEnabled = true; g.globalAlpha = 0.55; g.drawImage(amb, 0, 0, w, h); g.globalAlpha = 1; g.fillStyle = "rgba(2,8,16,.62)"; g.fillRect(0, 0, w, h); }
    const aw = 0.46 * w, ah = 0.9 * h, ax = (w - aw) / 2, ay = 0.03 * h, vw = vid.videoWidth || 9, vh = vid.videoHeight || 16, s = Math.min(aw / vw, (ah - 20 * k) / vh), dw = vw * s, dh = vh * s, dx = (w - dw) / 2, dy = ay + (ah - 20 * k - dh) / 2;
    if (ok) { g.shadowColor = "#36d6ff"; g.shadowBlur = 30 * k; g.fillStyle = "#000"; g.fillRect(dx, dy, dw, dh); g.shadowBlur = 0; g.drawImage(vid, dx, dy, dw, dh); } else { g.fillStyle = "#020812"; g.fillRect(dx, dy, dw, dh); txt(g, "Loading…", w / 2, dy + dh / 2, 36 * k, "#7fa6c8", "center"); }
    g.strokeStyle = "rgba(54,214,255,.9)"; g.lineWidth = 3 * k; g.strokeRect(dx, dy, dw, dh); hits.push({ x: dx, y: dy, w: dw, h: dh, fn: toggle });
    const dur = vid.duration || (v && v.dur) || 1, f = clampN((vid.currentTime || 0) / dur, 0, 1), by = ay + ah - 8 * k, bx0 = ax + 40 * k, bw = aw - 80 * k;
    g.fillStyle = "rgba(54,214,255,.25)"; g.fillRect(bx0, by - 4 * k, bw, 8 * k); g.fillStyle = "#36d6ff"; g.fillRect(bx0, by - 4 * k, bw * f, 8 * k); g.beginPath(); g.arc(bx0 + bw * f, by, 9 * k, 0, 7); g.fillStyle = "#fff"; g.fill();
    hits.push({ x: bx0 - 10 * k, y: by - 20 * k, w: bw + 20 * k, h: 40 * k, fn: (px) => pl8.seek(clampN((px - bx0) / bw, 0, 1)), pos: true });
    txt(g, fmt(vid.currentTime), ax + 4 * k, by + 24 * k - 24 * k, 20 * k, "#9fe8ff", "left", 600); txt(g, fmt(dur), ax + aw - 4 * k, by - 24 * k + 24 * k, 20 * k, "#9fe8ff", "right", 600);
    /* left: title block and transport */
    const lx = 0.04 * w, lw2 = 0.215 * w;
    txt(g, "NOW PLAYING  ·  " + (pl8.i + 1) + " / " + pl8.list.length, lx, 0.1 * h, 24 * k, "#36d6ff", "left", 700);
    g.font = "800 " + 46 * k + "px system-ui,sans-serif"; g.fillStyle = "#eaf6ff"; g.textAlign = "left"; g.textBaseline = "alphabetic"; wrapT(g, v ? v.title : "", lx, 0.2 * h, lw2, 52 * k, 4);
    g.font = "500 " + 26 * k + "px system-ui,sans-serif"; g.fillStyle = "#9fb8cc"; wrapT(g, v ? v.sub : "", lx, 0.62 * h, lw2, 32 * k, 4);
    const btn = (lab, bx1, by1, bw1, fn) => { g.fillStyle = "rgba(6,28,48,.9)"; g.fillRect(bx1, by1, bw1, 54 * k); g.strokeStyle = "#36d6ff"; g.lineWidth = 2.5 * k; g.strokeRect(bx1, by1, bw1, 54 * k); txt(g, lab, bx1 + bw1 / 2, by1 + 28 * k, 26 * k, "#eaf6ff", "center", 700); hits.push({ x: bx1, y: by1, w: bw1, h: 54 * k, fn }); };
    const bw2 = (lw2 - 20 * k) / 3, byy = 0.83 * h; btn("◀", lx, byy, bw2, () => play(pl8.i - 1)); btn(vid.paused ? "▶" : "❚❚", lx + bw2 + 10 * k, byy, bw2, toggle); btn("▶▶", lx + 2 * (bw2 + 10 * k), byy, bw2, () => play(pl8.i + 1));
    btn("LIBRARY", lx, byy - 66 * k, lw2, menu);
    /* right: playlist */
    const rx = 0.735 * w, rw = 0.225 * w, rows = 9, rh = (0.86 * h) / rows, first = clampN(pl8.i - 3, 0, Math.max(0, pl8.list.length - rows));
    txt(g, "UP NEXT", rx, 0.07 * h, 24 * k, "#36d6ff", "left", 700);
    for (let n = 0; n < rows; n++) { const i = first + n; if (i >= pl8.list.length) break; const y = 0.12 * h + n * rh, cur = i === pl8.i;
      g.fillStyle = cur ? "rgba(54,214,255,.28)" : "rgba(6,28,48,.7)"; g.fillRect(rx, y, rw, rh - 6 * k); g.strokeStyle = cur ? "#fff" : "rgba(54,214,255,.5)"; g.lineWidth = 2 * k; g.strokeRect(rx, y, rw, rh - 6 * k);
      g.save(); g.beginPath(); g.rect(rx + 4 * k, y + 4 * k, 52 * k, rh - 14 * k); g.clip(); cover(g, pl8.posters[i], rx + 4 * k, y + 4 * k, 52 * k, rh - 14 * k); g.restore();
      g.font = "600 " + 21 * k + "px system-ui,sans-serif"; g.fillStyle = cur ? "#fff" : "#cfe6f7"; g.textAlign = "left"; g.textBaseline = "alphabetic"; wrapT(g, (i + 1) + ". " + pl8.list[i].title, rx + 66 * k, y + 28 * k, rw - 76 * k, 24 * k, 2);
      hits.push({ x: rx, y, w: rw, h: rh - 6 * k, fn: () => play(i) }); }
    if (vid.paused && ok) { g.fillStyle = "rgba(2,8,16,.45)"; g.fillRect(dx, dy, dw, dh); g.fillStyle = "#fff"; g.beginPath(); const cx = dx + dw / 2, cy = dy + dh / 2, r = 40 * k; g.moveTo(cx - r * 0.6, cy - r); g.lineTo(cx - r * 0.6, cy + r); g.lineTo(cx + r, cy); g.closePath(); g.fill(); }
  }
  function paint(tn) { hits.length = 0; if (pl8.mode === "play" && pl8.i >= 0) paintPlay(tn); else paintMenu(tn); scr.t.needsUpdate = true; pl8.dirty = false; }
  function paintDir() {
    const g = dirTex.g, w = 1536, h = 520; panelBg(g, w, h, "#041428", "#08304f"); frame(g, w, h, "#36d6ff", 6);
    txt(g, "VIDEO LIBRARY", 40, 56, 54, "#eaf6ff", "left", 800, "#36d6ff"); txt(g, "Level 1  ·  through the gate", 40, 110, 28, "#36d6ff", "left", 500);
    const n = pl8.list.length || 15, cols = 8, tw = (w - 80 - (cols - 1) * 10) / cols, th = tw * 1.15;
    for (let i = 0; i < n; i++) { const x = 40 + (i % cols) * (tw + 10), y = 150 + Math.floor(i / cols) * (th + 8) - (i >= cols ? 0 : 0); if (y + th > h - 8) break; g.save(); g.beginPath(); g.rect(x, y, tw, th); g.clip(); cover(g, pl8.posters[i], x, y, tw, th); g.restore(); g.strokeStyle = "rgba(54,214,255,.7)"; g.lineWidth = 2; g.strokeRect(x, y, tw, th); }
    dirTex.t.needsUpdate = true;
  }
  paintDir();
  function tapScreen(uv) {
    const px = (1 - uv.x) * SW, py = (1 - uv.y) * SH; for (let i = hits.length - 1; i >= 0; i--) { const q = hits[i]; if (px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h) { q.fn(px, py); return true; } } return false;
  }
  const inHall = (p) => up.level === 1 && p && p.x > -8.2;
  const gateD = makeDoor("vhall", AU.x1 - 0.02, ZC, 3.0, 4.4, 0x7aa8ff, top); gateD.g.rotation.y = -PI / 2; gateD.g.position.y = LV; gateD.axis = "x"; gateD.center = new V(AU.x1, LV, ZC);

  /* ============================== walking ============================== */
  const LOBBY = { x0: -21.3, x1: -9.3, z0: -20.1, z1: -5.7 };
  const towerBlock = { noBack: true, x0: XT - 2.0, x1: XT + 2.0, z0: AU.z0 - 0.5, z1: ZF + 0.12, except: { x0: CAB.x0 + 0.05, x1: CAB.x1 - 0.05, z0: CAB.z0, z1: ZF + 0.2 } };
  const cabRect = () => ({ x0: CAB.x0 + 0.15, x1: CAB.x1 - 0.15, z0: CAB.z0 + 0.35, z1: CAB.z1 - 0.15 });
  const doorRectAt = (lv) => { const dd = doorAt(lv); return lift.level === lv && !lift.moving && dd.open > 0.85; };
  const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  const nearRect = (r, x, z) => { const cx = clampN(x, r.x0, r.x1), cz = clampN(z, r.z0, r.z1); return [cx, cz, (cx - x) ** 2 + (cz - z) ** 2]; };
  function clampUp(x, z) {
    if (lift.moving && lift.carry || lift.busy && (job && job.carry)) { const r = cabRect(); const q = nearRect(r, x, z); return [q[0], q[1]]; }
    const cands = [];
    cands.push(nearRect(LOBBY, x, z));
    if (gateD.open > 0.85) cands.push(nearRect({ x0: AU.x1 - 0.5, x1: HC.x - 10.3, z0: ZC - 1.1, z1: ZC + 1.1 }, x, z));
    if (doorRectAt(1)) cands.push(nearRect({ x0: CAB.x0 + 0.15, x1: CAB.x1 - 0.15, z0: CAB.z0 + 0.35, z1: ZF + 0.9 }, x, z));
    { const conc = { x0: -7.8, x1: -3.9, z0: ZC - 5.0, z1: ZC + 5.0 }; const q = nearRect(conc, x, z); const dx = q[0] - HC.x, dz = q[1] - HC.z, l = Math.hypot(dx, dz); if (l > 10.2) { q[0] = HC.x + dx / l * 10.2; q[1] = HC.z + dz / l * 10.2; q[2] = (q[0] - x) ** 2 + (q[1] - z) ** 2; } cands.push(q); }
    cands.push(nearRect({ x0: S.x - 9.25, x1: S.x - 4.0, z0: S.z - 1.25, z1: S.z + 1.25 }, x, z));
    { const dx = x - S.x, dz = z - S.z, l = Math.hypot(dx, dz), k = l > 4.0 ? 4.0 / l : 1, qx = S.x + dx * k, qz = S.z + dz * k; cands.push([qx, qz, (qx - x) ** 2 + (qz - z) ** 2]); }
    { const q = nearRect({ x0: S.x - 1.0, x1: HC.x + 9.4, z0: ZC - 7.0, z1: ZC + 7.0 }, x, z); const dx = q[0] - HC.x, dz = q[1] - HC.z, l = Math.hypot(dx, dz); if (l > 9.4) { q[0] = HC.x + dx / l * 9.4; q[1] = HC.z + dz / l * 9.4; q[2] = (q[0] - x) ** 2 + (q[1] - z) ** 2; } cands.push(q); }
    let b = cands[0]; cands.forEach((q) => { if (q[2] < b[2]) b = q; });
    let px = b[0], pz = b[1];
    /* the tiers: keep out of the seating blocks */
    { const dx = px - S.x, dz = pz - S.z, r = Math.hypot(dx, dz), ph = Math.atan2(Math.abs(dz), -dx);
      if (r > TR0 - 0.05 && r < TR0 + TN * TP + 0.05 && Math.abs(dz) > AISLE - 0.15 && ph < PHI1) {
        const opts = [], s = dz < 0 ? -1 : 1;
        opts.push([S.x + dx / r * (TR0 - 0.08), S.z + dz / r * (TR0 - 0.08)]); opts.push([S.x + dx / r * (TR0 + TN * TP + 0.08), S.z + dz / r * (TR0 + TN * TP + 0.08)]);
        opts.push([px, S.z + s * (AISLE - 0.18)]); opts.push([S.x - r * Math.cos(PHI1 + 0.03), S.z + s * r * Math.sin(PHI1 + 0.03)]);
        let bo = null, bd = 1e9; opts.forEach((o) => { const d = (o[0] - px) ** 2 + (o[1] - pz) ** 2; if (d < bd) { bd = d; bo = o; } }); px = bo[0]; pz = bo[1]; } }
    { const b2 = towerBlock; if (px > b2.x0 && px < b2.x1 && pz > b2.z0 && pz < b2.z1 && !(doorRectAt(1) && inR(b2.except, px, pz))) { const dl = px - b2.x0, dr = b2.x1 - px, dt = pz - b2.z0, db = b2.z1 - pz, m = Math.min(dl, dr, db); if (m === dl) px = b2.x0; else if (m === dr) px = b2.x1; else pz = b2.z1; } }
    [{ x: cxA, z: -12.6, r: 1.45 }, { x: S.x, z: S.z, r: 0.95 }].forEach((o) => { const dx = px - o.x, dz = pz - o.z, l = Math.hypot(dx, dz); if (l < o.r) { const k = o.r / (l || 1e-6); px = o.x + (l ? dx * k : o.r); pz = o.z + (l ? dz * k : 0); } });
    return [px, pz];
  }
  const groundUp = (x, z) => { if (x > S.x) return Y0; const r = Math.hypot(x - S.x, z - S.z); return Y0 + 1.9 * clampN((r - 4.2) / 5, 0, 1); };

  /* ============================== per frame ============================== */
  let sgnT = 0, kT = 0, firstShow = true;
  function update(t, dt, cam) {
    const sdt = Math.min(dt, 0.1);
    stepLift(sdt); cab.position.y = lift.y;
    if (lift.level !== wasLvl || lift.moving) { indT += sdt; }
    const camY = cam ? cam.y : 0, show = !!cam && (camY > 5.2 || (lift.moving && lift.carry && camY > 3.0));
    if (top.visible !== show) { top.visible = show; if (show && firstShow) { firstShow = false; pl8.dirty = true; } }
    cab.visible = lift.y < 6.0 || top.visible;
    sgnT += sdt; if (sgnT > 0.16 && (top.visible || (cam && camY < 4 && cam.z < -8))) { sgnT = 0; indPaint(ind[0], 0); indPaint(ind[1], 1); cabPaint(); cabInd.g.fillStyle = "#04101a"; cabInd.g.fillRect(0, 0, 256, 90); const y = lift.y / LV; txt(cabInd.g, y < 0.5 ? "G" : "1", 80, 48, 56, "#36d6ff", "center", 800, "#36d6ff"); txt(cabInd.g, lift.moving ? (job && job.to > job.from ? "▲" : "▼") : "•", 180, 48, 52, "#ffb347", "center", 800); cabInd.t.needsUpdate = true; }
    if (cam && top.visible) {
      /* the gate to the video auditorium opens as you come near and shuts again once you are well away */
      if (up.level === 1) { const dd = Math.hypot(cam.x - AU.x1, cam.z - ZC); if (dd < 2.8) gateD.target = 1; else if (dd > 5.8) gateD.target = 0; }
      holoPs.forEach((h) => { h.visible = pl8.mode !== "play"; });
      holo.rotation.y += sdt * 0.7; holo.rotation.x += sdt * 0.2; holo2.rotation.z += sdt * 0.9;
      if (inHall(cam)) {
        kT += sdt; const playing = pl8.mode === "play" && !vid.paused;
        if (playing ? kT > 0.033 : (pl8.dirty ? kT > 0.05 : kT > 0.25)) { kT = 0; if (!theatre) paint(t); }
        vid.volume = clampN(pl8.vol, 0, 1);
      } else if (!vid.paused && !theatre) { menu(); }
    } else if (!vid.paused && !theatre) { menu(); }
    wasLvl = lift.level;
  }
  function tap(kind, hit) {
    if (kind === "screen") { if (hit && hit.uv) { if (!tapScreen(hit.uv) && pl8.mode === "play") toggle(); } return "screen"; }
    if (kind === "podium") { return "library"; }
    return null;
  }
  return {
    group: top, tower, lift, doors: { lift0: d0, lift1: d1, vhall: gateD }, player: pl8, geom: { XT, ZF, LV, CAB, S, HC, HR, Y0 },
    level: () => up.level, isUp: () => up.level === 1 || (lift.moving && lift.carry), inHall,
    ride, call, update, tap, theatre: (on) => { theatre = on; if (!on) pl8.dirty = true; },
    clamp: clampUp, groundY: groundUp, towerBlock, cabRect, doorRectAt, inR, setLevel: (n) => { up.level = n; },
    front: () => new V(XT, 0, ZF + 1.7), inside: () => new V(XT, 0, cmid + 0.1), doorOpen: (lv) => doorAt(lv).open,
  };
}

/* ============================== the console (DOM): library, transport, theatre ============================== */
export function mountVideoUI(up, getPos) {
  const P = up.player, css = document.createElement("style");
  css.textContent = `#vh-btn,#vh-bar,#vh-panel,#vh-theatre{font-family:system-ui,sans-serif;color:#eaf6ff}
#vh-btn{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:7;display:none;padding:12px 22px;border-radius:999px;border:1.5px solid #36d6ff;background:rgba(4,20,40,.88);font-weight:700;font-size:15px;letter-spacing:.04em;cursor:pointer;box-shadow:0 0 22px rgba(54,214,255,.35);min-height:44px}
#vh-bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:7;display:none;align-items:center;gap:8px;padding:8px 12px;border-radius:16px;border:1.5px solid #36d6ff;background:rgba(4,20,40,.9);width:min(680px,94vw);box-sizing:border-box;box-shadow:0 0 22px rgba(54,214,255,.3)}
#vh-bar button{width:44px;height:44px;border-radius:12px;border:1.5px solid #36d6ff;background:#06223d;color:#eaf6ff;font-size:16px;cursor:pointer;flex:none}
#vh-bar input[type=range]{accent-color:#36d6ff;min-width:0}#vh-seek{flex:1}#vh-vol{width:70px;flex:none}
#vh-ttl{position:absolute;left:12px;top:-26px;font-size:13px;font-weight:600;background:rgba(4,20,40,.85);padding:3px 10px;border-radius:8px;border:1px solid rgba(54,214,255,.5);max-width:80vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vh-tm{font-size:12px;width:78px;text-align:center;flex:none;color:#9fe8ff}
#vh-panel{position:fixed;inset:0;z-index:9;display:none;background:rgba(2,8,16,.82);backdrop-filter:blur(4px);overflow:auto;padding:16px;box-sizing:border-box}
#vh-panel h2{margin:0 0 4px;font-size:22px;letter-spacing:.05em}#vh-panel p{margin:0 0 14px;color:#7fa6c8;font-size:13px}
#vh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;max-width:1100px;margin:0 auto}
#vh-grid button{display:flex;flex-direction:column;text-align:left;padding:0;border-radius:12px;border:1.5px solid rgba(54,214,255,.6);background:#061a2e;color:#eaf6ff;cursor:pointer;overflow:hidden}
#vh-grid button.cur{border-color:#fff;box-shadow:0 0 18px rgba(54,214,255,.7)}
#vh-grid img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#0a2038}
#vh-grid b{font-size:13px;padding:8px 10px 2px}#vh-grid i{font-style:normal;font-size:11px;color:#8fb6cf;padding:0 10px 9px}
#vh-x{position:fixed;right:14px;top:12px;z-index:10;width:44px;height:44px;border-radius:12px;border:1.5px solid #36d6ff;background:#06223d;color:#fff;font-size:20px;cursor:pointer;display:none}
#vh-theatre{position:fixed;inset:0;z-index:11;display:none;background:#000;align-items:center;justify-content:center}
#vh-theatre video{width:100%;height:100%;object-fit:contain}#vh-theatre button{position:absolute;right:14px;top:12px;width:44px;height:44px;border-radius:12px;border:1.5px solid #36d6ff;background:rgba(6,34,61,.9);color:#fff;font-size:20px;z-index:2}`;
  document.head.appendChild(css);
  const el = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.firstElementChild; };
  const btn = el('<button id="vh-btn" type="button">▶  VIDEO LIBRARY</button>'), bar = el('<div id="vh-bar"><div id="vh-ttl"></div><button id="vh-prev" type="button" aria-label="Previous">◀◀</button><button id="vh-pp" type="button" aria-label="Play or pause">❚❚</button><button id="vh-next" type="button" aria-label="Next">▶▶</button><input id="vh-seek" type="range" min="0" max="1000" value="0" aria-label="Seek"><span id="vh-tm">0:00</span><input id="vh-vol" type="range" min="0" max="100" value="90" aria-label="Volume"><button id="vh-lib" type="button" aria-label="Library">☰</button><button id="vh-th" type="button" aria-label="Theatre">⛶</button></div>');
  const panel = el('<div id="vh-panel"><h2>VIDEO LIBRARY</h2><p>Critical Care Education · tap a video to play it on the big screen</p><div id="vh-grid"></div></div>'), x = el('<button id="vh-x" type="button" aria-label="Close">✕</button>'), th = el('<div id="vh-theatre"><button type="button" aria-label="Close theatre">✕</button></div>');
  [btn, bar, panel, x, th].forEach((e) => document.body.appendChild(e));
  const $ = (id) => document.getElementById(id); let seeking = false, builtN = -1;
  function build() { const g = $("vh-grid"); if (builtN === P.list.length) return; builtN = P.list.length; g.innerHTML = ""; P.list.forEach((v, i) => { const b = document.createElement("button"); b.type = "button"; b.dataset.i = i; b.innerHTML = '<img alt="" src="' + new URL("videos/" + v.poster, import.meta.url).href + '?v=169c"><b>' + (i + 1) + ". " + v.title + "</b><i>" + v.sub + " · " + P.fmt(v.dur) + "</i>"; b.onclick = () => { P.play(i); closeLib(); }; g.appendChild(b); }); }
  const openLib = () => { build(); [...$("vh-grid").children].forEach((b) => b.classList.toggle("cur", +b.dataset.i === P.i)); panel.style.display = "block"; x.style.display = "block"; };
  const closeLib = () => { panel.style.display = "none"; x.style.display = "none"; };
  btn.onclick = openLib; x.onclick = closeLib; $("vh-lib").onclick = openLib;
  $("vh-pp").onclick = () => P.toggle(); $("vh-prev").onclick = () => P.prev(); $("vh-next").onclick = () => P.next();
  $("vh-vol").oninput = (e) => P.setVol(+e.target.value / 100);
  $("vh-seek").oninput = () => { seeking = true; P.seek(+$("vh-seek").value / 1000); }; $("vh-seek").onchange = () => { seeking = false; };
  const tvid = P.el;
  $("vh-th").onclick = () => { th.insertBefore(tvid, th.firstChild); tvid.style.cssText = ""; th.style.display = "flex"; up.theatre(true); if (tvid.paused && P.i >= 0) P.toggle(); };
  th.querySelector("button").onclick = () => { th.style.display = "none"; tvid.style.cssText = "max-width:100%;max-height:100%"; tvid.remove(); up.theatre(false); };
  th.onclick = (e) => { if (e.target === tvid) P.toggle(); };
  P.onList = build; P.onChange = () => { const s = P.state(); $("vh-pp").textContent = s.playing ? "❚❚" : "▶"; if (P.list[P.i]) $("vh-ttl").textContent = (P.i + 1) + ". " + P.list[P.i].title; };
  /* the in-world podium asks for the library */
  up.openLibrary = openLib;
  setInterval(() => {
    const p = getPos(), here = up.inHall(p), lib = panel.style.display === "block";
    btn.style.display = here && !lib && th.style.display !== "flex" ? "block" : "none"; bar.style.display = here && P.i >= 0 && !lib && th.style.display !== "flex" ? "flex" : "none";
    if (!here && lib) closeLib();
    const s = P.state(); if (!seeking && s.dur) $("vh-seek").value = String(Math.round(s.t / s.dur * 1000)); $("vh-tm").textContent = P.fmt(s.t) + " / " + P.fmt(s.dur);
  }, 250);
}
