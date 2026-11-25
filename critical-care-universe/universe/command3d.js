/* ICU command suite: a walk-in command centre attached to the ICU hall, a sliding door to a modern auditorium,
   and three portals (Critical Care Hub, Exit to the garden, Multidisciplinary Team). Three operators (one woman, two men) sit at the console; a few visitors
   walk and sit in the auditorium and plaza.

   World layout (x runs along the ICU hall; the hall's left end gate is at x = -8.4):
     command centre   x -20.4..-8.4, z -5..5,   height 4.6   (6 live monitors on the far wall, console desk, racks)
     sliding door     x -15.3, z -5               -> auditorium
     auditorium       x -22..-8.6,  z -21..-5,   height 7.0
       Critical Care Hub door on the west wall (z = ZC), Multidisciplinary Team door on the east wall (z = ZC), Exit on the far wall.
       Behind the two side doors stand walkable replicas of the pentagon hub and the circular Nexus hall, so you walk in by dragging;
       the real pages take over, from the same pose, a few steps inside.
   buildSuite(T, scene, P, H, env, {gateSet}) -> { doors, update(t,dt), clamp(x,z), hits, rooms }          */

import { buildOutdoor } from "./outdoor3d.js?v=20261126k";
import { loadVisitorCopy, createVisitor } from "./visitor-avatar.js?v=20261124g";
import { liveUpdates } from "./live-updates.js?v=20261128a";
import { buildUpper } from "./upper-level.js?v=20261124g";
import { loadAvatar, createRigDoctor } from "./doctor-rig.js?v=20261126m";

export function buildSuite(T, S, P, H, env, opt = {}) {
  const V = T.Vector3, G = new T.Group(); G.name = "suite"; S.add(G);
  const LOW = typeof matchMedia === "function" && matchMedia("(pointer:coarse)").matches;
  const rnd = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0, envMap: env, envMapIntensity: 0.8 }, o || {}));
  const E = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k || 1), toneMapped: false });
  function ctex(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); fn(g, w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; }
  const mesh = (geo, mat, x, y, z, par) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); (par || G).add(m); return m; };
  const bx = (w, h, d, mat, x, y, z, par) => mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, par);
  const cyl = (r1, r2, h, mat, x, y, z, par, seg) => mesh(new T.CylinderGeometry(r1, r2, h, seg || 16), mat, x, y, z, par);
  const pl = (w, h, mat, x, y, z, ry, rx, par) => { const m = mesh(new T.PlaneGeometry(w, h), mat, x, y, z, par); m.rotation.y = ry || 0; m.rotation.x = rx || 0; return m; };

  /* ---------- textures ---------- */
  const acoustic = ctex(512, 512, (g, w, h) => {
    g.fillStyle = "#34404d"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { const v = 44 + rnd() * 26; g.fillStyle = "rgba(" + v + "," + (v + 6) + "," + (v + 12) + ",.55)"; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    for (let x = 0; x < w; x += 128) { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(x, 0, 4, h); g.fillStyle = "rgba(160,190,220,.05)"; g.fillRect(x + 4, 0, 2, h); }
    g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, 0, w, 4); g.fillRect(0, h / 2, w, 3);
  });
  acoustic.wrapS = acoustic.wrapT = T.RepeatWrapping;
  const carpet = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#171c23"; g.fillRect(0, 0, w, h);
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) { const v = 20 + Math.floor(rnd() * 9); g.fillStyle = "rgb(" + v + "," + (v + 4) + "," + (v + 9) + ")"; g.fillRect(tx * 64, ty * 64, 64, 64); }
    for (let i = 0; i < 2600; i++) { const v = 30 + rnd() * 25; g.fillStyle = "rgba(" + v + "," + (v + 4) + "," + (v + 10) + ",.5)"; g.fillRect(rnd() * w, rnd() * h, 2, 1); }
    g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  });
  carpet.wrapS = carpet.wrapT = T.RepeatWrapping;
  const slats = ctex(512, 512, (g, w, h) => {
    g.fillStyle = "#101820"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { const v = 30 + rnd() * 10; g.fillStyle = "rgb(" + v + "," + (v + 8) + "," + (v + 16) + ")"; g.fillRect(x + 2, 0, 28, h); g.fillStyle = "rgba(54,214,255,.10)"; g.fillRect(x + 2, 0, 2, h); }
  });
  slats.wrapS = slats.wrapT = T.RepeatWrapping;
  const wallMat = (w, h, base, tint) => { const t = (base || acoustic).clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, w / 1.6), Math.max(1, h / 1.6)); return M(tint || 0xffffff, { map: t, roughness: 0.92, side: T.DoubleSide }); };
  const carpetMat = (w, d) => { const t = carpet.clone(); t.needsUpdate = true; t.repeat.set(w / 1.0, d / 1.0); return M(0xffffff, { map: t, roughness: 0.95 }); };

  const cyan = E(0x36d6ff, 2.2), cyanDim = E(0x2aa7d6, 1.5), white = E(0xeaf6ff, 1.5);
  const dark = M(0x10161d, { metalness: 0.5, roughness: 0.36 });
  const metal = M(0x7f93a6, { metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 });

  /* walls with rectangular openings: u runs along the wall (x for z-walls, z for x-walls) */
  function holeWall(axis, pos, u0, u1, h, holes, ry, base) {
    const hs = holes.slice().sort((a, b) => a.c - b.c), place = (ua, ub, y0, y1) => {
      const w = ub - ua, hh = y1 - y0; if (w < 0.01 || hh < 0.01) return;
      const uc = (ua + ub) / 2, yc = (y0 + y1) / 2, m = pl(w, hh, wallMat(w, hh, base), axis === "z" ? uc : pos, yc, axis === "z" ? pos : uc, ry);
      return m;
    };
    let cur = u0;
    hs.forEach((o) => { place(cur, o.c - o.w / 2, 0, h); place(o.c - o.w / 2, o.c + o.w / 2, o.h, h); cur = o.c + o.w / 2; });
    place(cur, u1, 0, h);
  }

  /* sliding door in a z-wall: local +z is the front. Leaves slide apart along x. */
  const doors = {};
  function makeDoor(id, x, z, w, hh, accent, par) {
    const g = new T.Group(); g.position.set(x, 0, z); (par || G).add(g);
    const edge = E(accent, 2.3), leafM = M(0x1a232d, { metalness: 0.7, roughness: 0.3, envMapIntensity: 1.2 });
    bx(0.14, hh + 0.14, 0.18, dark, -(w / 2 + 0.07), (hh + 0.14) / 2, 0, g); bx(0.14, hh + 0.14, 0.18, dark, w / 2 + 0.07, (hh + 0.14) / 2, 0, g);
    bx(w + 0.28, 0.14, 0.18, dark, 0, hh + 0.07, 0, g);
    bx(0.03, hh, 0.03, edge, -w / 2 - 0.0, hh / 2, 0.1, g); bx(0.03, hh, 0.03, edge, w / 2, hh / 2, 0.1, g); bx(w, 0.03, 0.03, edge, 0, hh - 0.01, 0.1, g);
    const leaves = [];
    [-1, 1].forEach((k) => {
      const lf = new T.Group(); lf.position.set(k * w / 4, 0, 0.055); g.add(lf); lf.userData = { x0: k * w / 4, k }; leaves.push(lf);
      bx(w / 2 - 0.01, hh - 0.02, 0.06, leafM, 0, hh / 2, 0, lf);
      bx(0.025, hh * 0.86, 0.02, edge, -k * (w / 4 - 0.035), hh / 2, 0.035, lf);
      bx(w / 2 - 0.2, 0.02, 0.02, edge, 0, hh * 0.5, 0.035, lf);
    });
    const hit = bx(w + 0.5, hh + 0.4, 0.9, new T.MeshBasicMaterial({ visible: false }), 0, (hh + 0.4) / 2, 0.3, g);
    const d = { id, center: new V(x, 0, z), axis: "z", w, open: 0, target: 0, g,
      set(a) { d.open = a; leaves.forEach((lf) => { lf.position.x = lf.userData.x0 + lf.userData.k * (w / 2 - 0.02) * a; }); } };
    g.traverse((o) => { o.userData.door = id; });
    doors[id] = d; return d;
  }

  const R = { x0: -20.4, x1: -8.4, z: 5, h: 4.6 }, cxR = (R.x0 + R.x1) / 2;
  const AU = { x0: -22, x1: -8.6, z0: -21, z1: -5, h: 7.0 }, cxA = (AU.x0 + AU.x1) / 2, ZC = -17;
  const APO = 5.8, RHN = 11;                                              /* hub apothem, Nexus hall radius */
  const HUBC = { x: AU.x0 - 0.7 - APO, z: ZC }, MDTC = { x: AU.x1 + 0.7 + RHN - 0.06, z: ZC };
  const out = buildOutdoor(T, S, { cx: cxA, cz: AU.z0 - 1.2 });

  /* =============================== COMMAND CENTRE =============================== */
  const room = new T.Group(); G.add(room);
  mesh(new T.PlaneGeometry(12, 10), carpetMat(12, 10), cxR, 0.002, 0, room).rotation.x = -Math.PI / 2;
  mesh(new T.PlaneGeometry(12, 10), M(0x0d131a, { roughness: 0.9 }), cxR, R.h, 0, room).rotation.x = Math.PI / 2;
  /* far wall (monitor wall), entrance wall with the hall's gate opening, side walls (door wall with a sliding door) */
  holeWall("x", R.x0, -R.z, R.z, R.h, [], Math.PI / 2);
  holeWall("x", R.x1 - 0.02, -R.z, R.z, R.h, [{ c: 0, w: 1.9, h: 2.5 }], -Math.PI / 2);
  holeWall("z", R.z, R.x0, R.x1, R.h, [], Math.PI);
  holeWall("z", -R.z, R.x0, R.x1, R.h, [{ c: cxA, w: 2.4, h: 3.0 }], 0);
  /* LED cove lines and floor skirting glow, like the reference: cool white at the ceiling, blue at the wall base */
  [[R.x0 + 0.05, 0, 0.05, 10, 4.52], [R.x1 - 0.05, 0, 0.05, 10, 4.52]].forEach((a) => bx(a[2], 0.04, a[3], white, a[0], a[4], a[1], room));
  bx(12, 0.04, 0.05, white, cxR, 4.52, R.z - 0.05, room); bx(12, 0.04, 0.05, white, cxR, 4.52, -R.z + 0.05, room);
  bx(0.04, 0.05, 10, cyan, R.x0 + 0.03, 0.06, 0, room); bx(12, 0.05, 0.04, cyanDim, cxR, 0.06, R.z - 0.03, room); bx(12, 0.05, 0.04, cyanDim, cxR, 0.06, -R.z + 0.03, room);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const m = pl(1.7, 0.5, white, R.x0 + 2.2 + i * 2.7, R.h - 0.005, -2.8 + j * 2.8, 0, Math.PI / 2, room); }
  /* wall plinth under the screens */
  bx(0.2, 0.28, 9.0, dark, R.x0 + 0.1, 0.14, 0, room);
  bx(0.06, 0.03, 9.0, cyan, R.x0 + 0.21, 0.28, 0, room);

  /* ---- video wall: 6 large live monitors, 3 across x 2 rows, wall mounted, thin bezels with a lit edge and a soft backlight ---- */
  const MW = 768, MH = 520, SW = 2.66, SH = 1.8;
  bx(0.06, 3.95, 9.0, dark, R.x0 + 0.05, 2.25, 0, room);      /* mounting frame */
  bx(0.02, 0.03, 9.0, cyan, R.x0 + 0.095, 0.29, 0, room); bx(0.02, 0.03, 9.0, cyan, R.x0 + 0.095, 4.2, 0, room);
  const glowTex = ctex(256, 256, (g, w, h) => { const q = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2); q.addColorStop(0, "rgba(255,255,255,.55)"); q.addColorStop(0.55, "rgba(255,255,255,.16)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, w, h); });
  const bezelM = M(0x05070a, { metalness: 0.7, roughness: 0.25 });
  const mons = [];
  for (let i = 0; i < 6; i++) {
    const row = i < 3 ? 0 : 1, col = i % 3, zc = (col - 1) * 2.95, yc = row === 0 ? 3.2 : 1.3;
    const g = new T.Group(); g.position.set(R.x0 + 0.1, yc, zc); g.rotation.y = Math.PI / 2; room.add(g);
    bx(SW + 0.1, SH + 0.1, 0.06, bezelM, 0, 0, 0, g);
    const cv = document.createElement("canvas"); cv.width = MW; cv.height = MH; const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4;
    const sc = mesh(new T.PlaneGeometry(SW, SH), new T.MeshBasicMaterial({ map: tx, toneMapped: false }), 0, 0, 0.032, g);
    sc.userData.cmdBed = i; g.children[0].userData.cmdBed = i;
    /* lit edge in the patient's status colour, a status bar under the screen and a backlight on the wall */
    const edge = new T.MeshBasicMaterial({ color: 0x36d6ff, toneMapped: false });
    [[0, SH / 2 + 0.05, SW + 0.12, 0.016], [0, -SH / 2 - 0.05, SW + 0.12, 0.016], [-SW / 2 - 0.05, 0, 0.016, SH + 0.12], [SW / 2 + 0.05, 0, 0.016, SH + 0.12]].forEach((e) => bx(e[2], e[3], 0.02, edge, e[0], e[1], 0.034, g));
    const bar = bx(1.1, 0.02, 0.02, edge, 0, -SH / 2 - 0.1, 0.034, g);
    const glow = new T.Mesh(new T.PlaneGeometry(SW + 1.1, SH + 0.9), new T.MeshBasicMaterial({ map: glowTex, color: 0x36d6ff, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.position.z = -0.03; g.add(glow);
    mons.push({ ctx: cv.getContext("2d"), tex: tx, i, edge, glow, st: -1 });
  }
  /* header sign */
  const sign = ctex(1536, 150, (g, w, h) => {
    const q = g.createLinearGradient(0, 0, w, 0); q.addColorStop(0, "#04101b"); q.addColorStop(0.5, "#0a2236"); q.addColorStop(1, "#04101b"); g.fillStyle = q; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#36d6ff"; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = "#36d6ff"; [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]].forEach((c) => { g.fillRect(c[0] - (c[2] < 0 ? 46 : 0), c[1] - (c[3] < 0 ? 8 : 0), 46, 8); g.fillRect(c[0] - (c[2] < 0 ? 8 : 0), c[1] - (c[3] < 0 ? 46 : 0), 8, 46); });
    g.fillStyle = "#e4f8ff"; g.font = "700 70px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#36d6ff"; g.shadowBlur = 26; g.fillText("ICU COMMAND CENTRE", w / 2, h / 2 + 4);
    g.shadowBlur = 0; g.fillStyle = "#3dff9a"; g.beginPath(); g.arc(150, h / 2, 12, 0, 7); g.fill(); g.fillStyle = "#7fd8ff"; g.font = "600 30px ui-monospace,Menlo,monospace"; g.textAlign = "left"; g.fillText("LIVE", 176, h / 2 + 2);
    g.textAlign = "right"; g.fillText("6 BEDS · TELEMETRY", w - 150, h / 2 + 2);
  });
  const sg = mesh(new T.PlaneGeometry(3.5, 0.342), new T.MeshBasicMaterial({ map: sign, toneMapped: false }), R.x0 + 0.075, 4.39, 0, room); sg.rotation.y = Math.PI / 2;

  /* ---- operator console, curved like the reference: centre desk and two angled wings, with three operators on swivel chairs ---- */
  const desk = new T.Group(); desk.position.set(-17.0, 0, 0); room.add(desk);
  const top = M(0x161b22, { metalness: 0.55, roughness: 0.22, envMapIntensity: 1.3 });
  const body = M(0x0c1015, { metalness: 0.5, roughness: 0.5 });
  const seg = (len, z, x, ry) => {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; desk.add(g);
    bx(1.0, 0.07, len, top, 0, 0.78, 0, g); bx(0.86, 0.74, len - 0.12, body, -0.03, 0.37, 0, g); bx(0.03, 0.03, len, cyan, 0.5, 0.74, 0, g); bx(0.03, 0.03, len, cyanDim, 0.5, 0.05, 0, g);
    return g;
  };
  const cen = seg(2.5, 0, 0, 0), wl = seg(1.9, 2.05, -0.5, 0.52), wr = seg(1.9, -2.05, -0.5, -0.52);
  /* desk displays */
  const dcv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return { c, g: c.getContext("2d"), t }; };
  const deskScr = [];
  function deskMonitor(par, x, y, z, ry, w, h, key) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; par.add(g);
    bx(w + 0.05, h + 0.05, 0.04, M(0x07090c, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0, g);
    const d = dcv(512, Math.round(512 * h / w)); mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: d.t, toneMapped: false }), 0, 0, 0.022, g);
    cyl(0.025, 0.04, 0.3, metal, 0, -h / 2 - 0.15, -0.03, g, 10); bx(0.3, 0.02, 0.2, metal, 0, -h / 2 - 0.3, -0.02, g);
    deskScr.push({ d, key }); return g;
  }
  deskMonitor(cen, -0.28, 1.22, -0.65, Math.PI / 2 - 0.2, 0.74, 0.46, "alerts");
  deskMonitor(cen, -0.28, 1.22, 0.65, Math.PI / 2 + 0.2, 0.74, 0.46, "census");
  deskMonitor(cen, -0.34, 1.2, 0, Math.PI / 2, 0.84, 0.52, "worst");
  deskMonitor(wl, -0.28, 1.1, -0.1, Math.PI / 2 - 0.27, 0.6, 0.38, "vent");
  deskMonitor(wr, -0.28, 1.1, 0.1, Math.PI / 2 + 0.27, 0.6, 0.38, "vent");
  /* three operators at the console: office chairs on the room side of the desk, people posed by the doctor rig (seated) in everyday clothes */
  const chairM = { seat: M(0x151a21, { roughness: 0.7 }), frame: M(0x2a323c, { metalness: 0.7, roughness: 0.35 }) };
  function chair(x, z, yaw) {
    const c = new T.Group(); c.position.set(x, 0, z); c.rotation.y = yaw; room.add(c);
    cyl(0.035, 0.035, 0.3, chairM.frame, 0, 0.3, 0, c, 10); cyl(0.07, 0.05, 0.08, chairM.frame, 0, 0.42, 0, c, 12);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5, l = bx(0.3, 0.035, 0.05, chairM.frame, Math.sin(a) * 0.15, 0.1, Math.cos(a) * 0.15, c); l.rotation.y = a - Math.PI / 2; cyl(0.03, 0.03, 0.04, chairM.seat, Math.sin(a) * 0.29, 0.04, Math.cos(a) * 0.29, c, 8); }
    bx(0.5, 0.08, 0.5, chairM.seat, 0, 0.46, 0, c); bx(0.5, 0.012, 0.012, cyan, 0, 0.425, 0.25, c);
    const bk = bx(0.46, 0.5, 0.07, chairM.seat, 0, 0.79, -0.27, c); bk.rotation.x = -0.1; const hd = bx(0.26, 0.14, 0.06, chairM.seat, 0, 1.12, -0.31, c); hd.rotation.x = -0.1;
    [-1, 1].forEach((sd) => { bx(0.04, 0.2, 0.04, chairM.frame, sd * 0.27, 0.58, -0.04, c); bx(0.07, 0.035, 0.3, chairM.seat, sd * 0.27, 0.69, 0.04, c); });
    return c;
  }
  const sitters = [];
  [
    { key: "dr1", x: -16.55, z: 1.5, face: -1.05, look: 0.0, outfit: { coat: 0x1b2a45, scrub: 0xb9b2a2 } },        /* navy blazer over a stone shirt */
    { key: "dr2", x: -15.9, z: 0.0, face: -Math.PI / 2, look: 1.7, outfit: { coat: 0xb98a5a, scrub: 0x5e1f3a } },                     /* camel cardigan over a plum top */
    { key: "dr4", x: -16.55, z: -1.5, face: -2.09, look: 3.4, outfit: { coat: 0x4a5a38, scrub: 0x23272d } },                    /* olive jacket over charcoal */
  ].forEach((d) => {
    chair(d.x, d.z, d.face);
    loadAvatar(d.key).then((gl) => {
      const r = createRigDoctor(T, gl, { key: d.key, noTag: true, outfit: d.outfit });
      r.group.position.set(d.x, 0, d.z); r.group.rotation.y = d.face; room.add(r.group); r.setSeated(true); r.update(5); sitters.push({ r, ph: d.look });
    }).catch(() => {});
  });
  /* keyboard, mouse, trackball, mixer panel, headset, mug */
  const kb = ctex(256, 96, (g, w, h) => { g.fillStyle = "#0b0e12"; g.fillRect(0, 0, w, h); for (let r = 0; r < 5; r++) for (let c = 0; c < 17; c++) { g.fillStyle = "#222a33"; g.fillRect(6 + c * 14.4, 6 + r * 16.4, 12, 13); } });
  const kbm = new T.MeshBasicMaterial({ map: kb }); bx(0.46, 0.02, 0.17, kbm, 0.22, 0.83, 0, cen); bx(0.06, 0.02, 0.1, M(0x0b0e12), 0.24, 0.83, 0.42, cen);
  bx(0.34, 0.04, 0.2, M(0x0b0e12, { metalness: 0.6 }), 0.1, 0.84, -0.6, cen); [-0.1, -0.02, 0.06, 0.14].forEach((x) => cyl(0.012, 0.012, 0.02, E(0xff5a4a, 1.2), 0.1 + x * 0.5, 0.87, -0.6, cen, 8));
  cyl(0.05, 0.05, 0.008, M(0x0b0e12), 0.36, 0.83, 0.42, cen, 14); mesh(new T.SphereGeometry(0.027, 12, 8), M(0xa02828, { roughness: 0.3 }), 0.36, 0.84, 0.42, cen);
  const hs = new T.Group(); hs.position.set(0.18, 0.82, 1.0); cen.add(hs);
  cyl(0.03, 0.045, 0.01, M(0x0b0e12), 0, 0, 0, hs, 14); cyl(0.008, 0.008, 0.3, metal, 0, 0.15, 0, hs, 8); mesh(new T.TorusGeometry(0.1, 0.015, 8, 20, Math.PI), M(0x15191f, { roughness: 0.5 }), 0, 0.33, 0, hs).rotation.z = 0; [-0.1, 0.1].forEach((x) => bx(0.03, 0.09, 0.07, M(0x1b2027), x, 0.28, 0, hs));
  cyl(0.04, 0.035, 0.09, M(0xe9eef2, { roughness: 0.3 }), 0.12, 0.865, -1.0, cen, 16);

  /* ---- server racks with blinking LEDs, and an ICU status wall on the right ---- */
  const ledT = ctex(128, 512, () => {}), ledM = new T.MeshBasicMaterial({ map: ledT, toneMapped: false });
  const drawLeds = () => { const g = ledT.userData.g; g.fillStyle = "#06090d"; g.fillRect(0, 0, 128, 512); for (let r = 0; r < 32; r++) { g.fillStyle = "#101820"; g.fillRect(6, r * 16 + 2, 116, 12); for (let c = 0; c < 8; c++) { const on = rnd() > 0.45; g.fillStyle = on ? (rnd() > 0.85 ? "#ffb347" : rnd() > 0.5 ? "#35e6a0" : "#37c8ff") : "#16222c"; g.fillRect(12 + c * 12, r * 16 + 5, 6, 6); } } ledT.needsUpdate = true; };
  drawLeds();
  [-12.4, -13.5].forEach((x) => { const g = new T.Group(); g.position.set(x, 0, R.z - 0.5); room.add(g); bx(0.85, 2.3, 0.9, M(0x0a0e13, { metalness: 0.6, roughness: 0.4 }), 0, 1.15, 0, g); const f = pl(0.7, 2.1, ledM, 0, 1.15, -0.455, Math.PI, 0, g); });
  const status = dcv(1024, 480), stM = new T.MeshBasicMaterial({ map: status.t, toneMapped: false });
  const stg = new T.Group(); stg.position.set(-16.2, 2.15, R.z - 0.06); stg.rotation.y = Math.PI; room.add(stg);
  bx(3.5, 1.7, 0.06, M(0x07090c, { metalness: 0.6 }), 0, 0, 0, stg); pl(3.4, 1.6, stM, 0, 0, 0.034, 0, 0, stg); bx(3.5, 0.025, 0.02, cyan, 0, -0.86, 0.03, stg);
  /* two AUTO UPDATES boards, one on each side wall facing the other: a running log of what the ICU is doing, redrawn as it changes */
  const feedBoards = [];
  [[R.z - 0.06, Math.PI], [-R.z + 0.06, 0]].forEach(([fz, ry]) => {
    const d = dcv(1024, 480), m = new T.MeshBasicMaterial({ map: d.t, toneMapped: false }), g = new T.Group(); g.position.set(-10.1, 2.15, fz); g.rotation.y = ry; room.add(g);
    bx(2.7, 1.3, 0.06, M(0x07090c, { metalness: 0.6 }), 0, 0, 0, g); pl(2.6, 1.22, m, 0, 0, 0.034, 0, 0, g); bx(2.7, 0.025, 0.02, cyan, 0, -0.66, 0.03, g); feedBoards.push(d);
  });
  /* corner plant-free decor: floor lamp strips on the entry wall */
  bx(0.05, 2.2, 0.05, cyan, R.x1 - 0.05, 1.3, 4.6, room); bx(0.05, 2.2, 0.05, cyan, R.x1 - 0.05, 1.3, -4.6, room);

  /* =============================== AUDITORIUM =============================== */
  const aud = new T.Group(); G.add(aud);
  const AW = AU.x1 - AU.x0, AD = AU.z1 - AU.z0;
  const accent = { hub: 0x27e0b0, exit: 0xffb347, team: 0xc07bff, cmd: 0x4aa8ff, aud: 0x36d6ff }, accHex = { hub: "#27e0b0", exit: "#ffb347", team: "#c07bff", cmd: "#4aa8ff", aud: "#36d6ff" };
  const px = (x) => (x - AU.x0) / AW * 1024, py = (z) => (z - AU.z0) / AD * 1223;
  const PORT = { hub: { x: AU.x0, z: ZC, ry: Math.PI / 2 }, exit: { x: cxA, z: AU.z0, ry: 0 }, team: { x: AU.x1, z: ZC, ry: -Math.PI / 2 } };
  const floorT = ctex(1024, 1223, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a1522"); gr.addColorStop(1, "#060b12"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(80,160,220,.07)"; g.lineWidth = 2; for (let i = 0; i <= 13; i++) { g.beginPath(); g.moveTo(i * w / 13.4, 0); g.lineTo(i * w / 13.4, h); g.stroke(); } for (let j = 0; j <= 16; j++) { g.beginPath(); g.moveTo(0, j * h / 16); g.lineTo(w, j * h / 16); g.stroke(); }
    g.lineCap = "round"; g.lineJoin = "round";
    const trunk = (col, x1, z1, x2, z2) => { g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 18; g.lineWidth = 7; g.beginPath(); g.moveTo(px(x1), py(z1)); g.lineTo(px(x2), py(z2)); g.stroke(); };
    /* one lit trunk from the command-centre door, a junction in the middle, and a lane to each of the three portals */
    const lane = (col, pts) => { g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 18; g.lineWidth = 7; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(px(q[0]), py(q[1])) : g.moveTo(px(q[0]), py(q[1])))); g.stroke(); };
    lane("#36d6ff", [[cxA, -5.6], [cxA, -14.2]]);
    lane(accHex.exit, [[cxA, -14.2], [cxA, -19.2]]);
    lane(accHex.hub, [[cxA, -14.2], [cxA, ZC], [AU.x0 + 1.9, ZC]]);
    lane(accHex.team, [[cxA, ZC], [AU.x1 - 1.9, ZC]]);
    [["hub", AU.x0 + 1.4, ZC], ["exit", cxA, -19.6], ["team", AU.x1 - 1.4, ZC]].forEach(([k, x, z]) => {
      g.shadowBlur = 0; g.fillStyle = accHex[k] + "33"; g.beginPath(); g.arc(px(x), py(z), 1.15 / AW * 1024, 0, 7); g.fill(); g.strokeStyle = accHex[k]; g.lineWidth = 4; g.beginPath(); g.arc(px(x), py(z), 1.15 / AW * 1024, 0, 7); g.stroke(); });
    g.shadowBlur = 0;
  });
  mesh(new T.PlaneGeometry(AW, AD), M(0xffffff, { map: floorT, roughness: 0.2, metalness: 0.5, envMapIntensity: 1.1 }), cxA, 0.003, (AU.z0 + AU.z1) / 2, aud).rotation.x = -Math.PI / 2;
  mesh(new T.PlaneGeometry(AW, AD), M(0x0b1118, { roughness: 0.9 }), cxA, AU.h, (AU.z0 + AU.z1) / 2, aud).rotation.x = Math.PI / 2;
  /* walls: south wall (with the sliding door), side walls in vertical slats with light fins, far wall with three portals */
  holeWall("z", AU.z1 - 0.02, AU.x0, AU.x1, AU.h, [{ c: cxA, w: 2.4, h: 3.0 }], Math.PI, slats);
  holeWall("x", AU.x0, AU.z0, AU.z1, AU.h, [{ c: ZC, w: 3.0, h: 4.4 }], Math.PI / 2, slats);
  holeWall("x", AU.x1, AU.z0, AU.z1, AU.h, [{ c: ZC, w: 3.0, h: 4.4 }], -Math.PI / 2, slats);
  holeWall("z", AU.z0, AU.x0, AU.x1, AU.h, [{ c: cxA, w: 3.0, h: 4.4 }], 0, acoustic);
  /* ambient LED banners on the side walls */
  const banner = ctex(1024, 300, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#06182a"); gr.addColorStop(1, "#0a2a46"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(54,214,255,.35)"; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 190 + i * 7); g.bezierCurveTo(w * 0.3, 120 + i * 9, w * 0.6, 260 - i * 7, w, 170 + i * 6); g.stroke(); } g.fillStyle = "#d8f4ff"; g.font = "700 76px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.shadowColor = "#36d6ff"; g.shadowBlur = 20; g.fillText("CRITICAL CARE UNIVERSE", 50, 92); g.shadowBlur = 0; g.fillStyle = "#7fd4e6"; g.font = "500 38px system-ui,sans-serif"; g.fillText("Learn  ·  Simulate  ·  Decide  ·  Together", 54, 160); });
  [[AU.x0 + 0.06, Math.PI / 2], [AU.x1 - 0.06, -Math.PI / 2]].forEach((o) => { const m = pl(6.4, 6.4 * 300 / 1024, new T.MeshBasicMaterial({ map: banner, toneMapped: false }), o[0], 3.5, -9.2, o[1], 0, aud); bx(6.5, 0.04, 0.03, cyan, o[0], 3.5 - 0.98, -9.2, aud); });
  /* light fins and cove lines */
  for (let k = 0; k < 8; k++) { const z = AU.z0 + 1.2 + k * 2.1; if (Math.abs(z - ZC) < 1.9) continue; bx(0.05, 5.6, 0.06, cyanDim, AU.x0 + 0.04, 3.4, z, aud); bx(0.05, 5.6, 0.06, cyanDim, AU.x1 - 0.04, 3.4, z, aud); }
  bx(AW, 0.06, 0.06, cyan, cxA, 6.4, AU.z0 + 0.05, aud); bx(0.06, 0.06, AD, cyan, AU.x0 + 0.05, 6.4, (AU.z0 + AU.z1) / 2, aud); bx(0.06, 0.06, AD, cyan, AU.x1 - 0.05, 6.4, (AU.z0 + AU.z1) / 2, aud);
  bx(AW, 0.05, 0.05, cyanDim, cxA, 0.07, AU.z0 + 0.04, aud); bx(0.05, 0.05, AD, cyanDim, AU.x0 + 0.04, 0.07, (AU.z0 + AU.z1) / 2, aud); bx(0.05, 0.05, AD, cyanDim, AU.x1 - 0.04, 0.07, (AU.z0 + AU.z1) / 2, aud);
  /* ceiling: light rings and bars */
  [[3.4, 0.07, 0x36d6ff], [2.2, 0.05, 0xeaf6ff], [4.6, 0.05, 0x2a7fb8]].forEach((r) => { const t = mesh(new T.TorusGeometry(r[0], r[1], 8, 72), E(r[2], 2), cxA, 6.88, -13, aud); t.rotation.x = Math.PI / 2; });
  for (let i = -2; i <= 2; i++) bx(0.12, 0.04, 14, white, cxA + i * 2.6, 6.94, -13, aud);
  /* floor discs in front of each portal, and the portals themselves */
  const sig = (k, title, sub) => ctex(768, 200, (g, w, h) => {
    g.fillStyle = "#06101a"; g.fillRect(0, 0, w, h); g.strokeStyle = accHex[k]; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.shadowColor = accHex[k]; g.shadowBlur = 14; g.strokeStyle = accHex[k]; g.fillStyle = accHex[k]; g.lineWidth = 6;
    const ix = 110, iy = h / 2;
    if (k === "hub") { g.beginPath(); g.arc(ix, iy, 44, 0, 7); g.stroke(); g.fillRect(ix - 8, iy - 28, 16, 56); g.fillRect(ix - 28, iy - 8, 56, 16); }
    else if (k === "cmd") { g.strokeRect(ix - 46, iy - 34, 92, 56); g.fillRect(ix - 20, iy + 26, 40, 8); g.beginPath(); g.moveTo(ix - 34, iy + 4); g.lineTo(ix - 14, iy - 8); g.lineTo(ix + 6, iy + 8); g.lineTo(ix + 34, iy - 16); g.stroke(); }
    else if (k === "aud") { g.beginPath(); g.arc(ix, iy + 22, 16, Math.PI, 0); g.stroke(); [30, 44].forEach((r) => { g.beginPath(); g.arc(ix, iy + 22, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }); }
    else if (k === "exit") { g.strokeRect(ix - 30, iy - 40, 46, 80); g.beginPath(); g.moveTo(ix - 4, iy); g.lineTo(ix + 48, iy); g.moveTo(ix + 32, iy - 16); g.lineTo(ix + 48, iy); g.lineTo(ix + 32, iy + 16); g.stroke(); }
    else { [[-30, 8], [0, -10], [30, 8]].forEach((o) => { g.beginPath(); g.arc(ix + o[0], iy + o[1] - 8, 14, 0, 7); g.fill(); g.beginPath(); g.arc(ix + o[0], iy + o[1] + 26, 22, Math.PI, 0); g.fill(); }); }
    g.shadowBlur = 0; g.fillStyle = "#e4f6ff"; g.textAlign = "left"; g.textBaseline = "middle"; let fs = 46; g.font = "700 " + fs + "px system-ui,sans-serif"; while (g.measureText(title).width > w - 210 && fs > 24) { fs -= 2; g.font = "700 " + fs + "px system-ui,sans-serif"; } g.fillText(title, 190, h / 2 - 22); g.fillStyle = accHex[k]; g.font = "500 28px system-ui,sans-serif"; g.fillText(sub, 190, h / 2 + 34);
  });
  let hubBack = null, teamBack = null;
  const portalDefs = { hub: ["CRITICAL CARE HUB", "Simulators, labs and atlases"], exit: ["EXIT", "Step outside to the garden"], cmd: ["COMMAND CENTRE", "Live ICU monitors"], aud: ["AUDITORIUM", "Hub · Exit · Team"], team: ["MULTIDISCIPLINARY TEAM", "Case conference room"] };
  ["hub", "exit", "team"].forEach((k) => {
    const Q = PORT[k], inset = k === "exit" ? 0.02 : 0.02;
    const ox = k === "hub" ? Q.x + inset : k === "team" ? Q.x - inset : Q.x, oz = k === "exit" ? Q.z + inset : Q.z;
    const d = makeDoor(k, ox, oz, 3.0, 4.4, accent[k], aud);
    d.g.rotation.y = Q.ry; if (k !== "exit") { d.axis = "x"; d.center = new V(Q.x, 0, Q.z); }
    /* a local frame at the opening: +z into the room, so the same dimensions serve all three walls */
    const lf = new T.Group(); lf.position.set(Q.x, 0, Q.z); lf.rotation.y = Q.ry; aud.add(lf);
    if (k === "exit") { const disc0 = mesh(new T.RingGeometry(1.0, 1.15, 48), E(accent[k], 2), 0, 0.012, 1.4, lf); disc0.rotation.x = -Math.PI / 2; const t0 = sig(k, portalDefs[k][0], portalDefs[k][1]); pl(3.9, 3.9 * 200 / 768, new T.MeshBasicMaterial({ map: t0, toneMapped: false }), 0, 5.45, 0.04, 0, 0, lf).userData.door = k; return; }
    const glow = ctex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0d1a29"); gr.addColorStop(1, "#04070b"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const back = pl(3.0, 4.4, new T.MeshBasicMaterial({ map: glow, toneMapped: false }), 0, 2.2, -0.7, 0, 0, lf); if (k === "hub") hubBack = back; else teamBack = back;
    pl(0.7, 4.4, M(0x0a0f14, { side: T.DoubleSide }), -1.5, 2.2, -0.35, Math.PI / 2, 0, lf); pl(0.7, 4.4, M(0x0a0f14, { side: T.DoubleSide }), 1.5, 2.2, -0.35, Math.PI / 2, 0, lf);
    pl(3.0, 0.7, M(0x0a0f14, { side: T.DoubleSide }), 0, 4.4, -0.35, 0, Math.PI / 2, lf);
    const t = sig(k, portalDefs[k][0], portalDefs[k][1]);
    pl(3.9, 3.9 * 200 / 768, new T.MeshBasicMaterial({ map: t, toneMapped: false }), 0, 5.45, 0.04, 0, 0, lf).userData.door = k;
    const disc = mesh(new T.RingGeometry(1.0, 1.15, 48), E(accent[k], 2), 0, 0.012, 1.4, lf); disc.rotation.x = -Math.PI / 2;
  });
  /* ---- through the Hub gate: a replica of the five-door hub hall (same pentagon, doors, signs and floor), shown while the gate is open ---- */
  const hubHall = (() => {
    const DR = APO - 0.18, SIDE = 2 * APO * Math.tan(Math.PI / 5), RC = (APO - 0.02) / Math.cos(Math.PI / 5), RT = 7.3, HH = 4.6;
    const hg = new T.Group(); hg.visible = false; G.add(hg);
    hg.position.set(HUBC.x, 0, HUBC.z); hg.rotation.y = 1.3 * Math.PI;                     /* lobby frame -> auditorium frame: its Auditorium door lands on the west gate */
    const KIN = [["icu", 0, 0x12e3c8, "ENTER THE ICU"], ["micro", 1, 0x7be34f, "MICROBIOLOGY LAB"], ["rad", 2, 0x3f8cff, "RADIOLOGY"], ["path", 4, 0xa073ff, "PATHOPHYSIOLOGY LIVE"]];
    const hx = (n) => "#" + n.toString(16).padStart(6, "0"), BM = (o) => new T.MeshBasicMaterial(Object.assign({ toneMapped: false }, o));
    const fan = (y, up, mat) => {
      const pos = [0, 0, 0], uv = [0.5, 0.5], idx = [];
      for (let i = 0; i < 5; i++) { const a = Math.PI / 5 + i * 2 * Math.PI / 5; pos.push(Math.sin(a) * RC, 0, Math.cos(a) * RC); uv.push(0.5 + Math.sin(a) * RC / (2 * RT), 0.5 - Math.cos(a) * RC / (2 * RT)); }
      for (let i = 0; i < 5; i++) { const a = 1 + i, b = 1 + (i + 1) % 5; if (up) idx.push(0, a, b); else idx.push(0, b, a); }
      const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const m = new T.Mesh(geo, mat); m.position.y = y; hg.add(m); return m;
    };
    const floorTex = ctex(512, 512, (g, w, h) => {
      const bgr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.72); bgr.addColorStop(0, "#17496a"); bgr.addColorStop(0.55, "#0d2740"); bgr.addColorStop(1, "#071526"); g.fillStyle = bgr; g.fillRect(0, 0, w, h);
      const ppm = w / (2 * RT); g.lineCap = "round";
      KIN.concat([["aud", 3, 0xffb347]]).forEach(([k, i, c]) => { const th = i * 2 * Math.PI / 5; g.strokeStyle = hx(c); g.globalAlpha = 0.4; g.lineWidth = 16; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.sin(th) * ppm * 5.0, h / 2 + Math.cos(th) * ppm * 5.0); g.stroke(); });
      g.globalAlpha = 0.7; g.strokeStyle = "#8fd4ff"; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, ppm * 1.6, 0, 6.3); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, ppm * 1.2, 0, 6.3); g.stroke(); g.globalAlpha = 1;
    });
    fan(0.002, true, BM({ map: floorTex }));
    fan(HH, false, BM({ color: 0xcdd8e6 }));
    [[2.6, 0.06], [1.4, 0.04]].forEach(([r, t]) => { const m = new T.Mesh(new T.TorusGeometry(r, t, 8, 56), BM({ color: 0xffffff })); m.position.y = HH - 0.06; m.rotation.x = Math.PI / 2; hg.add(m); });
    const pil = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, HH, 20), BM({ color: 0xd4e6c8 })); pil.position.y = HH / 2; hg.add(pil);
    const wallM = BM({ color: 0xe4eaf2 }), steel = BM({ color: 0x1b2433 });
    const panel = (col, flip) => ctex(256, 192, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, hx(col)); gr.addColorStop(1, "#0b1a2c"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 3; g.lineJoin = "round"; g.beginPath(); g.moveTo(0, 115);
      [[45, 115], [60, 115], [69, 85], [79, 146], [89, 107], [100, 115], [165, 115], [176, 115], [186, 75], [198, 150], [209, 109], [220, 115], [256, 115]].forEach(([x, y]) => g.lineTo(flip ? w - x : x, y)); g.stroke();
    });
    const plate = (txt, col) => ctex(768, 160, (g, w, h) => {
      g.fillStyle = "#0d1626"; g.fillRect(0, 0, w, h); g.fillStyle = hx(col); g.fillRect(0, 0, w, 9); g.fillRect(0, h - 9, w, 9);
      g.fillStyle = "#fff"; g.font = (txt.length > 18 ? "700 40px " : "700 54px ") + "Figtree, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2 + 30, 84);
    });
    [["aud", 3]].concat(KIN.map((k) => [k[0], k[1]])).forEach(([k, i]) => {
      const th = i * 2 * Math.PI / 5, wp = new T.Group(); wp.position.set(Math.sin(th) * APO, 0, Math.cos(th) * APO); wp.rotation.y = th + Math.PI; hg.add(wp);    /* wall: local +z faces the room */
      if (k === "aud") return;                                                                                                                                      /* that wall is the gate we are looking through */
      const def = KIN.find((q) => q[0] === k), col = def[2];
      const w = new T.Mesh(new T.PlaneGeometry(SIDE, HH), wallM); w.position.y = HH / 2; wp.add(w);
      [-1, 1].forEach((sd) => { const p = new T.Mesh(new T.PlaneGeometry(2.7, 2.5), BM({ map: panel(col, sd > 0) })); p.position.set(sd * 2.7, 1.4, 0.02); wp.add(p); const l = new T.Mesh(new T.PlaneGeometry(2.7, 0.05), BM({ color: col })); l.position.set(sd * 2.7, 0.2, 0.03); wp.add(l); });
      const dg = new T.Group(); dg.scale.setScalar(1.25); dg.position.set(0, 0, 0.03); wp.add(dg);
      const back = new T.Mesh(new T.PlaneGeometry(2.0, 2.4), BM({ color: 0x0c1520 })); back.position.set(0, 1.2, 0); dg.add(back);
      const glass = new T.Mesh(new T.PlaneGeometry(1.9, 2.3), BM({ color: col, transparent: true, opacity: 0.22 })); glass.position.set(0, 1.2, 0.02); dg.add(glass);
      [-1.04, 1.04].forEach((x) => { const j = new T.Mesh(new T.BoxGeometry(0.14, 2.4, 0.12), steel); j.position.set(x, 1.2, 0.02); dg.add(j); const e = new T.Mesh(new T.BoxGeometry(0.03, 2.34, 0.03), BM({ color: col })); e.position.set(x * 0.92, 1.2, 0.09); dg.add(e); });
      const lin = new T.Mesh(new T.BoxGeometry(2.22, 0.14, 0.12), steel); lin.position.set(0, 2.42, 0.02); dg.add(lin);
      const pt = new T.Mesh(new T.BoxGeometry(2.3, 0.46, 0.05), BM({ map: plate(def[3], col) })); pt.position.set(0, 2.76, 0.06); dg.add(pt);
    });
    return hg;
  })();
  /* ---- through the Team gate: a replica of the circular Nexus hall (same pale floor with cyan rings, frosted wall with two light bands,
         ceiling rings, wall screens, dais, turntable and a glass patient), shown while the gate is open. Its entrance faces this gate. ---- */
  const mdtHall = (() => {
    const RH = RHN, WH = 6.4, DR = 3.25, DH = 0.22, PED = 0.5, GAP = 0.16;
    const mg = new T.Group(); mg.visible = false; G.add(mg);
    mg.position.set(MDTC.x, 0, MDTC.z); mg.rotation.y = -Math.PI / 2;               /* the Nexus door (its +z side) lands on the east gate */
    const BM = (o) => new T.MeshBasicMaterial(Object.assign({ toneMapped: false }, o));
    const tor = (r, t, mat, y, par) => { const m = mesh(new T.TorusGeometry(r, t, 8, 72), mat, 0, y, 0, par || mg); m.rotation.x = Math.PI / 2; return m; };
    const floorTex = ctex(512, 512, (g, w) => {
      const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, "#f6fbfe"); gr.addColorStop(0.4, "#e2eef5"); gr.addColorStop(1, "#b9cfdd"); g.fillStyle = gr; g.fillRect(0, 0, w, w);
      [[0.27, 0.9, 3], [0.4, 0.5, 1.5], [0.6, 0.38, 2], [0.8, 0.5, 1.5], [0.975, 0.9, 4]].forEach(([r, a, lw]) => { g.strokeStyle = "rgba(30,185,235," + a + ")"; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r * c, 0, 7); g.stroke(); });
      g.strokeStyle = "rgba(40,150,200,.16)"; g.lineWidth = 1; for (let i = 0; i < 32; i++) { const a = i / 32 * 6.2832; g.beginPath(); g.moveTo(c + Math.cos(a) * 0.28 * c, c + Math.sin(a) * 0.28 * c); g.lineTo(c + Math.cos(a) * 0.97 * c, c + Math.sin(a) * 0.97 * c); g.stroke(); }
    });
    mesh(new T.CircleGeometry(RH, 72), BM({ map: floorTex }), 0, 0.003, 0, mg).rotation.x = -Math.PI / 2;
    const wallTex = ctex(1024, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#d4e3ee"); gr.addColorStop(1, "#bcd0de"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 48; i++) { g.fillStyle = i % 2 ? "rgba(255,255,255,.18)" : "rgba(60,120,160,.07)"; g.fillRect(i * w / 48, 0, w / 48, h); g.fillStyle = "rgba(60,110,150,.35)"; g.fillRect(i * w / 48, 0, 2, h); }
      g.fillStyle = "#26384a"; g.fillRect(0, h - 13, w, 13);
    });
    const arc = (r, h, mat, y) => mesh(new T.CylinderGeometry(r, r, h, 96, 1, true, GAP, Math.PI * 2 - 2 * GAP), mat, 0, y, 0, mg);
    arc(RH, WH, BM({ map: wallTex, side: T.BackSide }), WH / 2);
    [2.15, 4.7].forEach((y) => arc(RH - 0.03, 0.07, BM({ color: 0x7fe9ff, side: T.BackSide }), y));
    tor(RH - 0.15, 0.045, BM({ color: 0x36d6ff }), 0.05);
    mesh(new T.CircleGeometry(RH + 0.5, 64), BM({ color: 0x16222e }), 0, WH, 0, mg).rotation.x = Math.PI / 2;
    [3.3, 6.1, 8.9].forEach((r) => tor(r, 0.05, BM({ color: 0x36d6ff }), WH - 0.2));
    tor(2.2, 0.07, BM({ color: 0xbff4ff }), WH - 0.1); mesh(new T.CircleGeometry(2.1, 40), BM({ color: 0xffffff }), 0, WH - 0.06, 0, mg).rotation.x = Math.PI / 2;
    mesh(new T.CylinderGeometry(0.7, 2.35, WH - DH, 40, 1, true), BM({ color: 0x7fe3ff, transparent: true, opacity: 0.055, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), 0, (WH + DH) / 2, 0, mg);
    /* wall holo-screens */
    const scr = [0, 1, 2, 3].map((kind) => ctex(512, 300, (g, w, h) => {
      g.fillStyle = "rgba(5,26,42,.78)"; g.fillRect(2, 2, w - 4, h - 4); g.strokeStyle = "rgba(110,225,255,.85)"; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = "#7fe9ff"; g.font = "700 22px system-ui,sans-serif"; g.fillText(["IMAGING LIBRARY", "GENOMICS", "PHYSIOLOGY", "LABORATORY"][kind], 20, 38);
      g.strokeStyle = ["#ff9a5a", "#6fe3ff", "#3dff9a", "#a9dff0"][kind]; g.lineWidth = 3; for (let r = 0; r < 4; r++) { g.beginPath(); for (let x = 20; x < w - 20; x += 4) { const y = 90 + r * 50 + Math.sin(x * (0.03 + r * 0.01) + kind) * 14; x === 20 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    }));
    for (let k = 0; k < 10; k++) { const a = (k + 0.5) / 10 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) ) < 0.35) continue;
      const m = mesh(new T.PlaneGeometry(3.7, 2.17), BM({ map: scr[k % 4], transparent: true, side: T.DoubleSide, depthWrite: false }), Math.sin(a) * (RH - 0.3), 3.0, Math.cos(a) * (RH - 0.3), mg); m.rotation.y = a + Math.PI; }
    /* entrance door frame in the south wall, labelled for the way back */
    const dg = new T.Group(); dg.position.set(0, 0, RH - 0.06); dg.rotation.y = Math.PI; mg.add(dg);
    bx(2.7, 0.08, 0.1, BM({ color: 0x36d6ff }), 0, 2.72, 0, dg); [-1.3, 1.3].forEach((x) => bx(0.08, 2.72, 0.1, BM({ color: 0x36d6ff }), x, 1.36, 0, dg));
    const sg = ctex(512, 96, (g, w, h) => { g.fillStyle = "rgba(5,26,42,.9)"; g.fillRect(3, 3, w - 6, h - 6); g.strokeStyle = "#5fe3ff"; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#cff6ff"; g.font = "700 40px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("AUDITORIUM", w / 2, h / 2); });
    mesh(new T.PlaneGeometry(1.7, 0.32), BM({ map: sg, transparent: true }), 0, 3.05, 0.06, dg);
    /* dais, plate, turntable */
    cyl(DR, DR + 0.1, DH, BM({ color: 0xf3f8fb }), 0, DH / 2, 0, mg, 64); tor(DR - 0.04, 0.04, BM({ color: 0x36d6ff }), DH + 0.005);
    const plateTex = ctex(512, 512, (g, w) => { const c = w / 2; g.fillStyle = "#05263a"; g.fillRect(0, 0, w, w); for (let i = 0; i < 9; i++) { g.strokeStyle = "rgba(80,225,255," + (0.55 - i * 0.04) + ")"; g.lineWidth = i % 3 ? 1.5 : 3; g.beginPath(); g.arc(c, c, (0.18 + i * 0.095) * c, 0, 7); g.stroke(); } });
    mesh(new T.CircleGeometry(DR - 0.12, 64), BM({ map: plateTex }), 0, DH + 0.003, 0, mg).rotation.x = -Math.PI / 2;
    const TOP = DH + 0.045; cyl(1.52, 1.58, PED, BM({ color: 0x0b2f45 }), 0, TOP + PED / 2, 0, mg, 48); tor(1.5, 0.03, BM({ color: 0x7fe9ff }), TOP + PED + 0.005);
    /* the patient: a glass figure in the same place and size as the real one */
    const glass = BM({ color: 0x9fd6ee, transparent: true, opacity: 0.6 }), y0 = TOP + PED, body = new T.Group(); body.position.y = y0; mg.add(body);
    mesh(new T.SphereGeometry(0.19, 20, 14), glass, 0, 2.3, 0, body); cyl(0.07, 0.08, 0.16, glass, 0, 2.06, 0, body, 12);
    cyl(0.3, 0.24, 0.95, glass, 0, 1.52, 0, body, 20); cyl(0.24, 0.2, 0.3, glass, 0, 0.98, 0, body, 20);
    [-1, 1].forEach((s) => { cyl(0.1, 0.075, 1.0, glass, s * 0.12, 0.5, 0, body, 12); const arm = cyl(0.065, 0.05, 1.0, glass, s * 0.5, 1.5, 0, body, 10); arm.rotation.z = s * 0.28; });
    mesh(new T.SphereGeometry(0.11, 14, 10), BM({ color: 0xff6a78 }), 0.07, 1.78, 0.14, body);
    [-1, 1].forEach((s) => { const l = mesh(new T.SphereGeometry(0.15, 14, 10), BM({ color: 0x8fb8ff, transparent: true, opacity: 0.8 }), s * 0.14, 1.8, 0.02, body); l.scale.set(0.8, 1.5, 0.7); });
    mesh(new T.SphereGeometry(0.14, 12, 8), BM({ color: 0xffa860 }), -0.12, 1.5, 0.12, body).scale.set(1.4, 0.8, 0.8);
    return mg;
  })();
  /* the sliding door from the command centre */
  const dAud = makeDoor("aud", cxA, -R.z + 0.02, 2.4, 3.0, 0x36d6ff, G);
  /* "COMMAND CENTRE" above the door from the auditorium, "AUDITORIUM" above it on the command-centre side */
  pl(3.9, 3.9 * 200 / 768, new T.MeshBasicMaterial({ map: sig("cmd", portalDefs.cmd[0], portalDefs.cmd[1]), toneMapped: false }), cxA, 3.9, -5.08, Math.PI, 0, G).userData.door = "aud";
  pl(3.9, 3.9 * 200 / 768, new T.MeshBasicMaterial({ map: sig("aud", portalDefs.aud[0], portalDefs.aud[1]), toneMapped: false }), cxA, 3.9, -4.92, 0, 0, G).userData.door = "aud";
  const dGate = { id: "gate", center: new V(-8.4, 0, 0), axis: "x", w: 1.9, open: 0, target: 0, set(a) { dGate.open = a; if (opt.gateSet) opt.gateSet(a); } };
  doors.gate = dGate;
  /* door hits that were built as children of the auditorium group need the portals' z-front orientation: normal +z (toward the entry) */

  /* seating: modern pods in two blocks either side of the central aisle */
  const rows = 4, cols = 5, n = rows * cols * 2;
  const seatBase = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.09, 0.48), M(0x15202b, { roughness: 0.55, metalness: 0.2 }), n);
  const seatBack = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.56, 0.08), M(0x1d6f8f, { roughness: 0.6, metalness: 0.1 }), n);
  const seatLeg = new T.InstancedMesh(new T.CylinderGeometry(0.05, 0.08, 0.42, 10), metal, n);
  const mat4 = new T.Matrix4(); let q = 0;
  for (const side of [-1, 1]) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = cxA + side * (3.15 + c * 0.6), z = -7.4 - r * 1.35, y = 0.45;
    mat4.makeTranslation(x, y, z); seatBase.setMatrixAt(q, mat4); mat4.makeTranslation(x, y + 0.3, z + 0.24); seatBack.setMatrixAt(q, mat4); mat4.makeTranslation(x, 0.21, z); seatLeg.setMatrixAt(q, mat4); q++;
  }
  [seatBase, seatBack, seatLeg].forEach((m) => { m.instanceMatrix.needsUpdate = true; aud.add(m); });

  /* ---- the auditorium LIVE UPDATES screen has been removed (the feed lives on the new home screen); liveBoards stays empty ---- */
  const live = liveUpdates(), liveBoards = [];
  [].forEach((k, idx) => {
    const d = dcv(680, 920), m = new T.MeshBasicMaterial({ map: d.t, toneMapped: false }), g = new T.Group(); g.position.set(cxA + k * 4.0, 3.15, AU.z0 + 0.07); aud.add(g);
    bx(3.7, 4.9, 0.1, M(0x07090c, { metalness: 0.6, roughness: 0.35 }), 0, 0, -0.01, g); pl(3.5, 4.72, m, 0, 0, 0.045, 0, 0, g);
    [-1, 1].forEach((j) => bx(0.04, 4.9, 0.03, cyan, j * 1.84, 0, 0.06, g)); bx(3.7, 0.04, 0.03, cyan, 0, 2.46, 0.06, g); bx(3.7, 0.04, 0.03, cyan, 0, -2.46, 0.06, g);
    liveBoards.push({ d, phase: idx * 0.5 });
  });
  /* ---- two visitors: one walks the aisle in a slow loop, one sits in the audience ---- */
  const visitors = [];
  const walkPts = [[cxA - 1.9, -8.2], [cxA - 1.9, -18.6], [cxA + 1.9, -18.6], [cxA + 1.9, -8.2]];
  loadVisitorCopy().then((gl) => {
    const v = createVisitor(T, gl, { mode: "walk", height: 1.68 }); aud.add(v.group); v.group.position.set(walkPts[0][0], 0, walkPts[0][1]);
    visitors.push({ v, kind: "walk", i: 1, x: walkPts[0][0], z: walkPts[0][1], yaw: Math.PI });
  }).catch(() => {});
  loadVisitorCopy().then((gl) => {
    const v = createVisitor(T, gl, { mode: "sit", height: 1.68 }), sx = cxA + 3.15 + 0.6, sz = -7.4 - 1.35; aud.add(v.group);
    v.group.position.set(sx, 0.64 - v.hipsHeight, sz + 0.06); v.group.rotation.y = Math.PI;       /* faces the exit end of the hall, like every seat */
    visitors.push({ v, kind: "sit" });
  }).catch(() => {});
  /* a third visitor strolls the plaza outside the exit */
  const plazaPts = [[cxA - 5.5, -34.0], [cxA + 5.5, -34.8], [cxA + 5.0, -36.4], [cxA - 5.0, -35.6]];
  loadVisitorCopy().then((gl) => {
    const v = createVisitor(T, gl, { mode: "walk", height: 1.7 }); aud.add(v.group); v.group.position.set(plazaPts[0][0], out.groundY(plazaPts[0][0], plazaPts[0][1]), plazaPts[0][1]);
    visitors.push({ v, kind: "walk", pts: plazaPts, spd: 0.8, gy: true, i: 1, x: plazaPts[0][0], z: plazaPts[0][1], yaw: 0 });
  }).catch(() => {});
  let audAcc = 0, audFirst = true;
  function updateAud(t, dt, cam) {
    if (!cam || cam.z > -4.5 || cam.z < -48 || cam.y > 4.5) return;
    const sdt = Math.min(dt, 0.1);
    visitors.forEach((o) => {
      if (o.kind === "walk") {
        const pts = o.pts || walkPts, tg = pts[o.i], dx = tg[0] - o.x, dz = tg[1] - o.z, dl = Math.hypot(dx, dz), step = Math.min(dl, (o.spd || 0.95) * sdt);
        if (dl < 0.15) o.i = (o.i + 1) % pts.length; else { o.x += dx / dl * step; o.z += dz / dl * step; }
        let dy = Math.atan2(dx, dz) - o.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); o.yaw += dy * Math.min(1, sdt * 3.2);
        o.v.group.position.x = o.x; o.v.group.position.z = o.z; if (o.gy) o.v.group.position.y = out.groundY(o.x, o.z); o.v.group.rotation.y = o.yaw; o.v.update(sdt, 1);
      } else o.v.update(sdt, 0);
    });
    audAcc += dt; if (cam.z > -22.5 && (audFirst || audAcc > 0.1)) { audFirst = false; audAcc = 0; liveBoards.forEach(paintLive); }
  }

  /* ---- the lift (where the second LIVE UPDATES board was), the lobby above and the video auditorium above the Nexus hall ---- */
  const upper = buildUpper(T, { G, M, E, mesh, bx, cyl, pl, ctex, dcv, makeDoor, wallMat, slats, acoustic, cyan, cyanDim, white, dark, metal, LOW, AU, cxA, ZC, MDTC, RHN });
  /* lights */
  const pt = (c, k, d, x, y, z) => { const l = new T.PointLight(c, k, d, 1.6); l.position.set(x, y, z); G.add(l); return l; };
  pt(0xdfefff, 12, 18, -15.5, 3.8, 0); pt(0x9fd8ff, 6, 12, -19.2, 3.0, 0);
  if (!LOW) { pt(0xbfe4ff, 5, 12, -11, 3.6, 2.8); pt(0xdfefff, 12, 24, cxA, 6.0, -12); }
  else pt(0xdfefff, 9, 22, cxA, 6.0, -12);

  /* =============================== painters =============================== */
  const col = (st) => ["#3dff9a", "#ffc24a", "#ff4d5e"][st || 0];
  const SCAN = (() => { const c = document.createElement("canvas"); c.width = 4; c.height = 4; const g = c.getContext("2d"); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(0, 0, 4, 1); return c; })();
  const GRID = (() => { const c = document.createElement("canvas"); c.width = 36; c.height = 36; const g = c.getContext("2d"); g.strokeStyle = "rgba(80,190,255,.07)"; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 36, 36); return c; })();
  const SUP = { imv: "VENTILATOR", niv: "NIV MASK", mask: "O₂ MASK", hf: "HIGH-FLOW", room: "ROOM AIR" };
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  function paintMon(m) {
    const p = P[m.i], g = m.ctx, st = p.st || 0, c = col(st), tn = performance.now() / 1000;
    if (m.st !== st) { m.st = st; const k = [0x2dffa0, 0xffc24a, 0xff4d5e][st]; m.edge.color.setHex(k); m.glow.material.color.setHex(k); m.glow.material.opacity = st === 2 ? 0.62 : 0.42; }
    const q = g.createLinearGradient(0, 0, 0, MH); q.addColorStop(0, "#071b2c"); q.addColorStop(1, "#030a12"); g.fillStyle = q; g.fillRect(0, 0, MW, MH);
    g.fillStyle = g.createPattern(GRID, "repeat"); g.fillRect(0, 0, MW, MH);
    /* waveforms: the bedside monitor painter, clipped under our own header */
    g.save(); g.beginPath(); g.rect(14, 74, MW - 28, 392); g.clip();
    if (H && H.mon) H.mon(g, p, MW - 28, 392 + 71, 14, 74 - 71);
    g.restore();
    /* header */
    g.fillStyle = "rgba(8,30,48,.92)"; g.fillRect(0, 0, MW, 66); g.fillStyle = "rgba(54,214,255,.35)"; g.fillRect(0, 65, MW, 2);
    g.fillStyle = c; rrect(g, 14, 10, 112, 46, 9); g.fill(); g.fillStyle = "#031018"; g.font = "800 32px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BED " + (m.i + 1), 70, 34);
    g.textAlign = "left"; g.fillStyle = "#eaf8ff"; g.font = "700 31px system-ui,sans-serif"; g.fillText((p.n || "").slice(0, 20), 142, 26);
    g.fillStyle = "#7fc8e8"; g.font = "600 19px system-ui,sans-serif"; g.fillText((p.dx || "").slice(0, 34), 142, 51);
    const sup = SUP[p.air] || "ROOM AIR", sw = 24 + sup.length * 12.5; g.strokeStyle = "#36d6ff"; g.lineWidth = 2; rrect(g, MW - sw - 66, 17, sw, 32, 8); g.stroke(); g.fillStyle = "#9fe6ff"; g.font = "700 17px ui-monospace,Menlo,monospace"; g.textAlign = "center"; g.fillText(sup, MW - sw / 2 - 66, 34);
    g.textAlign = "left"; g.fillStyle = st && Math.sin(tn * 7) < 0 ? "rgba(0,0,0,0)" : c; g.beginPath(); g.arc(MW - 36, 33, 12, 0, 7); g.fill();
    /* data strip */
    g.fillStyle = "rgba(8,30,48,.92)"; g.fillRect(0, MH - 52, MW, 52); g.fillStyle = "rgba(54,214,255,.35)"; g.fillRect(0, MH - 54, MW, 2);
    const v = p.v, map = Math.round((v.sbp + 2 * v.dbp) / 3), chips = [["MAP", map, "#ff9ab0"], ["HR", Math.round(v.hr), "#53ef98"], ["SpO₂", Math.min(100, Math.round(v.spo2)) + "%", "#48d9ff"], ["RR", Math.round(v.rr), "#f4d45a"], ["STATUS", ["STABLE", "WATCH", "CRITICAL"][st], c]];
    chips.forEach((k, n) => { const x = 20 + n * 148; g.fillStyle = "#6f9bb8"; g.font = "600 16px ui-monospace,Menlo,monospace"; g.textAlign = "left"; g.fillText(k[0], x, MH - 36); g.fillStyle = k[2]; g.font = "800 " + (n === 4 ? 22 : 28) + "px ui-monospace,Menlo,monospace"; g.fillText(String(k[1]), x, MH - 14); });
    /* screen finish: scanlines, a slow sweep, status-coloured corner brackets */
    g.fillStyle = g.createPattern(SCAN, "repeat"); g.fillRect(0, 0, MW, MH);
    const sx = ((tn * 150 + m.i * 120) % (MW + 260)) - 130, sw2 = g.createLinearGradient(sx - 130, 0, sx + 130, 0); sw2.addColorStop(0, "rgba(120,220,255,0)"); sw2.addColorStop(0.5, "rgba(120,220,255,.07)"); sw2.addColorStop(1, "rgba(120,220,255,0)"); g.fillStyle = sw2; g.fillRect(sx - 130, 67, 260, MH - 121);
    g.strokeStyle = c; g.lineWidth = 6; g.shadowColor = c; g.shadowBlur = 14; const L = 46, e = 5;
    [[e, e, 1, 1], [MW - e, e, -1, 1], [e, MH - e, 1, -1], [MW - e, MH - e, -1, -1]].forEach((k) => { g.beginPath(); g.moveTo(k[0] + k[2] * L, k[1]); g.lineTo(k[0], k[1]); g.lineTo(k[0], k[1] + k[3] * L); g.stroke(); });
    g.shadowBlur = 0; g.strokeStyle = c; g.globalAlpha = 0.35; g.lineWidth = 2; g.strokeRect(e, e, MW - 2 * e, MH - 2 * e); g.globalAlpha = 1;
    m.tex.needsUpdate = true;
  }
  const bg = (g, w, h, title) => { g.fillStyle = "#06121f"; g.fillRect(0, 0, w, h); g.fillStyle = "#0c2236"; g.fillRect(0, 0, w, 52); g.fillStyle = "#36d6ff"; g.font = "700 30px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(title, 20, 27); };
  const painters = {
    alerts(d) { const g = d.g, w = d.c.width, h = d.c.height; bg(g, w, h, "ALERTS"); const rows = P.map((p, i) => [p, i]).sort((a, b) => b[0].st - a[0].st); rows.forEach(([p, i], k) => { const y = 62 + k * ((h - 70) / 6); g.fillStyle = col(p.st); g.fillRect(14, y + 4, 8, (h - 70) / 6 - 10); g.fillStyle = "#d8ecff"; g.font = "600 21px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText((i + 1) + "  " + p.n, 34, y + 14); g.fillStyle = "#7fa6c8"; g.font = "500 17px system-ui,sans-serif"; g.fillText(p.dx, 34, y + 36); g.fillStyle = col(p.st); g.textAlign = "right"; g.font = "700 22px system-ui,sans-serif"; g.fillText(Math.round(p.v.hr) + "  " + Math.round(p.v.spo2) + "%", w - 16, y + 24); }); d.t.needsUpdate = true; },
    census(d) { const g = d.g, w = d.c.width, h = d.c.height; bg(g, w, h, "ICU CENSUS"); P.forEach((p, i) => { const cx = 64 + (i % 3) * 142, cy = 128 + Math.floor(i / 3) * 142; g.strokeStyle = col(p.st); g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, 50, 0, 7); g.stroke(); g.fillStyle = "#d8ecff"; g.font = "700 38px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(i + 1, cx, cy + 2); }); const al = P.filter((p) => !p.done && p.st > 0).length; g.fillStyle = "#7fa6c8"; g.font = "500 20px system-ui,sans-serif"; g.textAlign = "left"; g.fillText("Alerts " + al + "   Ventilated " + P.filter((p) => p.iv).length + "   Done " + P.filter((p) => p.done).length, 20, h - 18); d.t.needsUpdate = true; },
    worst(d) { const g = d.g, w = d.c.width, h = d.c.height; let b = 0; P.forEach((p, i) => { if (p.st > P[b].st) b = i; }); const p = P[b]; if (H && H.mon) H.mon(g, p, w, h, 0, 0); g.fillStyle = "rgba(6,18,31,.86)"; g.fillRect(0, 0, w, 34); g.fillStyle = col(p.st); g.font = "700 22px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("PRIORITY  ·  BED " + (b + 1) + "  " + p.n, 14, 18); d.t.needsUpdate = true; },
    vent(d) { const g = d.g, w = d.c.width, h = d.c.height; bg(g, w, h, "VENTILATORS"); const vs = P.map((p, i) => [p, i]).filter((a) => a[0].iv); vs.slice(0, 5).forEach(([p, i], k) => { const y = 64 + k * ((h - 70) / 5); g.fillStyle = "#d8ecff"; g.font = "600 20px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("Bed " + (i + 1) + "  " + (p.air === "imv" ? "IMV" : "NIV"), 18, y + 14); g.fillStyle = "#7fa6c8"; g.font = "500 18px system-ui,sans-serif"; g.fillText("FiO₂ " + Math.round(p.fio2) + "%   PEEP " + p.peep, 18, y + 38); g.fillStyle = col(p.st); g.textAlign = "right"; g.fillText("RR " + Math.round(p.v.rr), w - 16, y + 26); }); if (!vs.length) { g.fillStyle = "#7fa6c8"; g.fillText("No ventilated patients", 20, 90); } d.t.needsUpdate = true; },
  };
  /* the log: new lines appear when something changes (a vital crosses a limit, a status flips) and now and then a routine system line */
  const feedLog = [], feedPrev = {}; let feedN = 0, feedT = 0;
  const clock = () => { const n = new Date(); return String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0") + ":" + String(n.getSeconds()).padStart(2, "0"); };
  const addFeed = (txt, st) => { feedLog.unshift({ t: clock(), txt, st: st || 0 }); if (feedLog.length > 40) feedLog.pop(); };
  const SYS = ["Telemetry synchronised, 6 beds", "Ventilator self-check passed", "Infusion pumps reporting", "Laboratory feed refreshed", "Bed census confirmed", "Alarm limits verified", "Network latency nominal"];
  function feedTick() {
    P.forEach((p, i) => { const k = "b" + i, pv = feedPrev[k]; const cur = { st: p.st || 0, hr: Math.round(p.v.hr), sp: Math.round(p.v.spo2), air: p.air };
      if (pv) { if (cur.st !== pv.st) addFeed("Bed " + (i + 1) + " " + p.n + ": now " + ["stable", "on watch", "critical"][cur.st], cur.st);
        else if (Math.abs(cur.sp - pv.sp) >= 2) addFeed("Bed " + (i + 1) + " SpO₂ " + cur.sp + "% " + (cur.sp < pv.sp ? "falling" : "recovering"), cur.sp < 90 ? 2 : cur.sp < 94 ? 1 : 0);
        else if (Math.abs(cur.hr - pv.hr) >= 8) addFeed("Bed " + (i + 1) + " heart rate " + cur.hr + " /min", cur.hr > 120 || cur.hr < 50 ? 1 : 0);
        else if (cur.air !== pv.air) addFeed("Bed " + (i + 1) + " support: " + ({ imv: "ventilator", niv: "NIV", hf: "high-flow", o2: "oxygen" }[cur.air] || cur.air || "room air"), 0); }
      feedPrev[k] = cur; });
    if (!feedLog.length) { addFeed("Command centre online", 0); P.forEach((p, i) => addFeed("Bed " + (i + 1) + " " + p.n + " · " + p.dx, p.st || 0)); }
    if (++feedN % 2 === 0) addFeed(SYS[Math.floor(rnd() * SYS.length)], 0);
  }
  function paintFeed(d) {
    const g = d.g, w = 1024, h = 480, tn = performance.now() / 1000; bg(g, w, h, "AUTO UPDATES");
    g.fillStyle = Math.sin(tn * 3) > -0.1 ? "#ff4d5e" : "#4a2a30"; g.beginPath(); g.arc(w - 236, 27, 8, 0, 7); g.fill(); g.fillStyle = "#d8ecff"; g.font = "700 22px ui-monospace,Menlo,monospace"; g.textAlign = "right"; g.fillText("LIVE  " + clock(), w - 16, 28);
    const rowH = 52, rows = Math.floor((h - 70) / rowH);
    for (let k = 0; k < rows; k++) { const e = feedLog[k]; if (!e) break; const y = 64 + k * rowH, a = 1 - k * 0.09; g.globalAlpha = Math.max(0.35, a);
      g.fillStyle = k === 0 ? "rgba(54,214,255,.12)" : "rgba(54,214,255,.04)"; g.fillRect(14, y, w - 28, rowH - 6); g.fillStyle = col(e.st); g.fillRect(14, y, 7, rowH - 6);
      g.fillStyle = "#7fa6c8"; g.font = "600 22px ui-monospace,Menlo,monospace"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(e.t, 34, y + (rowH - 6) / 2);
      g.fillStyle = "#e5f4ff"; g.font = "600 25px system-ui,sans-serif"; g.fillText(e.txt.length > 52 ? e.txt.slice(0, 51) + "…" : e.txt, 168, y + (rowH - 6) / 2); g.globalAlpha = 1; }
    g.fillStyle = "rgba(54,214,255,.55)"; const sx = ((tn * 160) % (w + 200)) - 200; g.fillRect(sx, h - 6, 200, 3);
    d.t.needsUpdate = true;
  }
  /* a LIVE UPDATES screen: the society feed from the app's home screen as cards that drift upward; two screens share the list half a cycle apart */
  const LCOL = { SCCM: "#36d6ff", ESICM: "#27e0b0", KDIGO: "#ffb347", IDSA: "#c07bff", ATS: "#4aa8ff", ICMR: "#ff7a90", ARDS: "#ffd24a" };
  const wrapTxt = (g, s, mw, maxL) => { const ws = String(s).split(" "), out = []; let l = ""; for (const w of ws) { const t = l ? l + " " + w : w; if (g.measureText(t).width > mw && l) { out.push(l); l = w; if (out.length === maxL) break; } else l = t; } if (out.length < maxL && l) out.push(l); else if (l && out.length === maxL) out[maxL - 1] = out[maxL - 1].replace(/\s*\S*$/, "") + "…"; return out; };
  function paintLive(b) {
    const g = b.d.g, w = 680, h = 920, tn = performance.now() / 1000, items = live.items(), CH = 176, total = Math.max(1, items.length) * CH;
    g.fillStyle = "#040b14"; g.fillRect(0, 0, w, h);
    const bgG = g.createLinearGradient(0, 0, 0, h); bgG.addColorStop(0, "rgba(20,70,110,.35)"); bgG.addColorStop(1, "rgba(4,11,20,0)"); g.fillStyle = bgG; g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.rect(0, 92, w, h - 92 - 34); g.clip();
    const sc = (tn * 22 + b.phase * total) % total;
    for (let rep = -1; rep < 2; rep++) items.forEach((it, i) => {
      const y = 100 + i * CH - sc + rep * total; if (y > h || y < 92 - CH) return;
      const ac = LCOL[it.lane] || "#36d6ff", fy = y + CH - 14, edge = Math.min(1, Math.max(0.25, (y - 70) / 60));
      g.globalAlpha = Math.min(1, edge, Math.max(0.25, (h - 40 - y) / 90));
      g.fillStyle = "rgba(54,214,255,.07)"; g.fillRect(16, y, w - 32, CH - 14); g.fillStyle = ac; g.fillRect(16, y, 6, CH - 14);
      g.fillStyle = ac; g.globalAlpha *= 0.18; g.fillRect(34, y + 14, 92, 40); g.globalAlpha = Math.min(1, edge);
      g.fillStyle = ac; g.font = "800 22px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(it.lane, 80, y + 35);
      g.textAlign = "left"; g.fillStyle = "#8fb6cf"; g.font = "600 17px system-ui,sans-serif"; g.fillText((it.topic || "").toUpperCase(), 140, y + 35);
      if (it.fresh) { g.fillStyle = "#ff4d5e"; g.fillRect(w - 98, y + 17, 62, 26); g.fillStyle = "#fff"; g.font = "800 16px system-ui,sans-serif"; g.textAlign = "center"; g.fillText("NEW", w - 67, y + 31); }
      g.textAlign = "left"; g.fillStyle = "#e9f6ff"; g.font = "700 24px system-ui,sans-serif";
      wrapTxt(g, it.title, w - 90, 2).forEach((ln, k) => g.fillText(ln, 36, y + 76 + k * 30));
      g.fillStyle = "#7fa6c8"; g.font = "500 17px system-ui,sans-serif"; const dt = (it.detail || "") + (it.when ? "  ·  " + it.when : ""); g.fillText(dt.length > 54 ? dt.slice(0, 53) + "…" : dt, 36, fy - 6);
      g.globalAlpha = 1;
    });
    g.restore();
    const hd = g.createLinearGradient(0, 0, w, 0); hd.addColorStop(0, "#0b2a40"); hd.addColorStop(1, "#124a6a"); g.fillStyle = hd; g.fillRect(0, 0, w, 84);
    g.fillStyle = "#36d6ff"; g.fillRect(0, 84, w, 3);
    g.fillStyle = "#36d6ff"; g.font = "800 40px system-ui,sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("LIVE UPDATES", 24, 34);
    g.fillStyle = "#8fb6cf"; g.font = "600 18px system-ui,sans-serif"; g.fillText("Guidelines and papers from the societies", 24, 64);
    g.fillStyle = Math.sin(tn * 3) > -0.1 ? "#ff4d5e" : "#4a2a30"; g.beginPath(); g.arc(w - 150, 34, 9, 0, 7); g.fill();
    g.fillStyle = "#e5f4ff"; g.font = "700 26px ui-monospace,Menlo,monospace"; g.textAlign = "right"; g.fillText(clock(), w - 22, 35);
    g.fillStyle = "#06121f"; g.fillRect(0, h - 34, w, 34); g.fillStyle = "#7fa6c8"; g.font = "500 16px system-ui,sans-serif"; g.textAlign = "left"; g.fillText(items.length + " items  ·  SCCM  ESICM  KDIGO  IDSA  ATS  ICMR", 24, h - 17);
    g.fillStyle = "rgba(54,214,255,.5)"; const sx = ((tn * 180) % (w + 220)) - 220; g.fillRect(sx, h - 4, 220, 3);
    b.d.t.needsUpdate = true;
  }
  function paintStatus() {
    const g = status.g, w = 1024, h = 480; bg(g, w, h, "ICU STATUS BOARD");
    P.forEach((p, i) => { const cx = 70 + (i % 6) * 164, cy = 150; g.strokeStyle = col(p.st); g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, 52, 0, 7); g.stroke(); g.fillStyle = "#d8ecff"; g.font = "700 40px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(i + 1, cx, cy + 2); g.font = "500 18px system-ui,sans-serif"; g.fillStyle = "#7fa6c8"; g.fillText(p.dx.length > 20 ? p.dx.slice(0, 19) + "…" : p.dx, cx, cy + 82); g.fillStyle = col(p.st); g.fillText(["Stable", "Watch", "Critical"][p.st || 0], cx, cy + 108); });
    const al = P.filter((p) => !p.done && p.st > 0).length; g.fillStyle = "#36d6ff"; g.font = "700 34px system-ui,sans-serif"; g.textAlign = "left"; g.fillText("Active alerts: " + al, 30, 400); g.fillStyle = "#7fa6c8"; g.font = "500 26px system-ui,sans-serif"; g.fillText("Ventilated: " + P.filter((p) => p.iv).length + "     Cases closed: " + P.filter((p) => p.done).length + " / " + P.length, 30, 444);
    status.t.needsUpdate = true;
  }

  /* =============================== walking limits =============================== */
  const rects = () => {
    const r = [{ x0: -7.3, x1: 7.3, z0: -2.7, z1: 2.7 }, { x0: -19.9, x1: -9.0, z0: -4.4, z1: 4.4 }, { x0: -21.3, x1: -9.3, z0: -20.1, z1: -5.7 }];
    if (dGate.open > 0.85) r.push({ x0: -9.2, x1: -7.2, z0: -0.75, z1: 0.75 });
    if (dAud.open > 0.85) r.push({ x0: cxA - 0.85, x1: cxA + 0.85, z0: -5.8, z1: -4.2 });
    if (doors.exit.open > 0.85) r.push({ x0: cxA - 0.85, x1: cxA + 0.85, z0: -22.5, z1: -19.9 });
    if (upper.doorRectAt(0)) { const q = upper.cabRect(); r.push({ x0: q.x0, x1: q.x1, z0: q.z0, z1: upper.geom.ZF + 0.9 }); }
    /* the side gates: once open you can simply walk through them, into the hub hall or the Nexus hall */
    if (doors.hub.open > 0.85) r.push({ x0: AU.x0 - 2.7, x1: AU.x0 + 1.4, z0: ZC - 0.95, z1: ZC + 0.95 });     /* overlaps the auditorium floor and the hub's round floor by half a metre each, so a small step never snaps back */
    if (doors.team.open > 0.85) r.push({ x0: AU.x1 - 1.4, x1: AU.x1 + 2.7, z0: ZC - 0.95, z1: ZC + 0.95 });
    return r;
  };
  const rounds = () => {
    const c = [];
    if (doors.hub.open > 0.85) c.push({ x: HUBC.x, z: HUBC.z, r: 5.2 });
    if (doors.team.open > 0.85) c.push({ x: MDTC.x, z: MDTC.z, r: RHN - 1.0 });
    return c;
  };
  const blocks = [upper.towerBlock, { x0: -18.5, x1: -15.3, z0: -3.3, z1: 3.3 }, { x0: -14.0, x1: -11.9, z0: 3.8, z1: 5.2 },
    { x0: cxA - 6.3, x1: cxA - 2.8, z0: -12.9, z1: -6.8 }, { x0: cxA + 2.8, x1: cxA + 6.3, z0: -12.9, z1: -6.8 }];
  const pillars = [{ x: HUBC.x, z: HUBC.z, r: 0.95 }, { x: MDTC.x, z: MDTC.z, r: 3.3 }];       /* the hub's column, the Nexus dais */
  function clamp(x, z) {
    if (upper.isUp()) return upper.clamp(x, z);
    let best = null, bd = 1e9;
    rects().forEach((r) => { const cx = Math.max(r.x0, Math.min(r.x1, x)), cz = Math.max(r.z0, Math.min(r.z1, z)), d = (cx - x) ** 2 + (cz - z) ** 2; if (d < bd) { bd = d; best = [cx, cz]; } });
    rounds().forEach((c) => { const dx = x - c.x, dz = z - c.z, l = Math.hypot(dx, dz) || 1e-6, k = l <= c.r ? 1 : c.r / l, cx = c.x + dx * k, cz = c.z + dz * k, d = (cx - x) ** 2 + (cz - z) ** 2; if (d < bd) { bd = d; best = [cx, cz]; } });
    let [px, pz] = best;
    blocks.forEach((b) => {
      if (px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1 && !(b.except && upper.doorRectAt(0) && upper.inR(b.except, px, pz))) {
        const dl = px - b.x0, dr = b.x1 - px, dt = b.noBack ? 1e9 : pz - b.z0, db = b.z1 - pz, m = Math.min(dl, dr, dt, db);
        if (m === dl) px = b.x0; else if (m === dr) px = b.x1; else if (m === dt) pz = b.z0; else pz = b.z1;
      }
    });
    pillars.forEach((c) => { const dx = px - c.x, dz = pz - c.z, l = Math.hypot(dx, dz); if (l < c.r) { const k = c.r / (l || 1e-6); px = c.x + (l ? dx * k : c.r); pz = c.z + (l ? dz * k : 0); } });
    /* outside the building with the door still shut: you stay on the plaza in front of it, you are never drawn through the glass */
    if (doors.exit.open <= 0.85 && z < -22.4) return out.clamp(x, Math.min(z, -23.2));
    if (doors.exit.open > 0.85 && z < -20.5) { const o = out.clamp(x, z); if ((o[0] - x) ** 2 + (o[1] - z) ** 2 < (px - x) ** 2 + (pz - z) ** 2) return o; }
    return [px, pz];
  }
  const where = { hub: HUBC, mdt: MDTC, ZC, AU, APO, RH: RHN };

  /* =============================== per-frame =============================== */
  let mi = 0, acc = 0, accSlow = 0, first = true;
  function update(t, dt, cam) {
    sitters.forEach((o) => { o.r.setLook(Math.sin(t * 0.37 + o.ph) * 0.3 * (Math.sin(t * 0.11 + o.ph) > 0 ? 1 : 0.35)); o.r.update(dt); });
    Object.values(doors).forEach((d) => { if (d._tp !== d.target) { if (d._tp !== undefined && opt.onDoor) opt.onDoor(d, d.target > 0); d._tp = d.target; } });
    const hubSee = doors.hub.open > 0.02 && !(doors.exit.open > 0.02), mdtSee = doors.team.open > 0.02 && !(doors.exit.open > 0.02);
    hubHall.visible = hubSee; if (hubBack) hubBack.visible = !hubSee;
    mdtHall.visible = mdtSee; if (teamBack) teamBack.visible = !mdtSee;
    if (cam) out.update(t, dt, cam, doors.exit.open > 0.02 || (cam.z < -21.3 && cam.x > -22.2 && cam.x < -8.7 && !hubSee && !mdtSee));
    Object.values(doors).forEach((d) => { if (Math.abs(d.open - d.target) > 0.001) { d.set(d.open + (d.target - d.open) * (1 - Math.exp(-dt * 3.2))); } else if (d.open !== d.target) d.set(d.target); });
    acc += dt; accSlow += dt;
    upper.update(t, dt, cam);
    updateAud(t, dt, cam);
    if (cam && (cam.z < -12 || cam.y > 4.5)) return;          /* far away in the auditorium or outdoors: nothing to repaint */
    if (first) { mons.forEach(paintMon); deskScr.forEach((s) => painters[s.key](s.d)); paintStatus(); feedTick(); feedBoards.forEach(paintFeed); first = false; }
    /* every wall monitor is redrawn on every frame (phones: half of them per frame), so the traces glide instead of stepping */
    const per = LOW ? 3 : 6; for (let k = 0; k < per; k++) { paintMon(mons[mi]); mi = (mi + 1) % mons.length; }
    if (accSlow > 0.6) { accSlow = 0; deskScr.forEach((s) => painters[s.key](s.d)); paintStatus(); if ((feedT += 1) % 3 === 0) feedTick(); feedBoards.forEach(paintFeed); if (rnd() > 0.5) drawLeds(); }
  }
  return { doors, update, clamp, rooms: { R, AU }, where, room, feeds: feedBoards, outdoor: out, groundY: (x, z) => (upper.lift.moving && upper.lift.carry ? upper.lift.y : upper.level() === 1 ? upper.groundY(x, z) : out.groundY(x, z)), upper };
}
