/* THE MDT CHAMBER: the circular command hall of the Medical Nexus.
   A big dark, glass-and-light round room. In the middle a revolving table: an inner disc that turns with the patient lying on it, and a fixed outer
   ring that carries one sloped digital screen and one name placard for every doctor in the team. The doctors sit round the south side facing the
   far wall, where three large curved displays hold the patient presentation, the information that has come back, and the team discussion.
   Everything here is only geometry and light; what the screens say is painted by mdt-screens.js and driven by nexus.js.

   buildChamber(T, o) -> { turn, tableY, hero:{L,C,R}, layout(list), stations, update(dt,t), pulse(c) }          */
export const CH = { RH: 11, WH: 7.4, TABLE_Y: 0.82, R_DISC: 1.62, R_TROUGH: 1.95, R_OUT: 3.05, R_SEAT: 3.95, R_SCR: 2.5, R_HERO: 9.3, HERO_H: 3.5, HERO_Y: 3.05 };
export const SCREEN = { PHI: 1.15 };       /* the sloped console screens tilt back; their size depends on the shape of the viewer's screen (see layout) */
const DIMS = { land: { W: 1.3, H: 0.82, PXW: 960, PXH: 606 }, port: { W: 0.84, H: 1.05, PXW: 640, PXH: 800 } };

export function buildChamber(T, o) {
  const { S, hall, env, H, DOORGAP, TAU } = o, { M, E, ctex, mesh, cyl, tor } = H, V = T.Vector3, { RH, WH, TABLE_Y, R_DISC, R_TROUGH, R_OUT, R_SEAT, R_SCR, R_HERO, HERO_H, HERO_Y } = CH;
  const rnd = (() => { let s = 11; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  const out = { stations: [], tableY: TABLE_Y };
  const CY = 0x36d6ff, CW = 0xbff4ff;

  /* ---- light: dark room, cool top light over the table, soft fill so the doctors read */
  S.add(new T.HemisphereLight(0xa9cdee, 0x0a1624, 0.95));
  const key = new T.PointLight(0xd8efff, 30, 17, 1.4); key.position.set(0, WH - 1.2, 0); S.add(key);
  const glow = new T.PointLight(CY, 7, 7, 1.5); glow.position.set(0, 1.6, 0); S.add(glow);
  [0.5, 1.5, 2.5].forEach((q) => { const l = new T.PointLight(0x5fb8ff, 3.4, 9, 1.6); l.position.set(Math.sin(q * 2.1) * 6.2, 3.8, Math.cos(q * 2.1) * 6.2); S.add(l); });

  /* ---- floor: deep navy glass with luminous rings and spokes */
  const floorTex = ctex(2048, 2048, (g, w) => {
    const c = w / 2, k = c / RH; const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, "#0c2236"); gr.addColorStop(0.45, "#07131f"); gr.addColorStop(1, "#040a12"); g.fillStyle = gr; g.fillRect(0, 0, w, w);
    [[3.3, 0.9, 5], [4.55, 0.35, 2], [5.6, 0.5, 3], [7.2, 0.3, 2], [8.6, 0.5, 3], [10.0, 0.4, 2], [10.8, 0.95, 6]].forEach(([r, a, lw]) => { g.strokeStyle = `rgba(54,214,255,${a})`; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r * k, 0, TAU); g.stroke(); });
    g.strokeStyle = "rgba(54,214,255,.18)"; g.lineWidth = 2; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * 3.4 * k, c + Math.sin(a) * 3.4 * k); g.lineTo(c + Math.cos(a) * 10.7 * k, c + Math.sin(a) * 10.7 * k); g.stroke(); }
    g.strokeStyle = "rgba(127,233,255,.6)"; g.lineWidth = 3; for (let i = 0; i < 240; i++) { const a = i / 240 * TAU, r0 = 5.6 * k, r1 = r0 + (i % 5 ? 7 : 18); g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); }
    for (let i = 0; i < 60; i++) { const a = rnd() * TAU, r = (3.8 + rnd() * 6.4) * k; g.fillStyle = "rgba(127,233,255,.35)"; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 2 + rnd() * 3, 0, TAU); g.fill(); }
  });
  { const f = mesh(new T.CircleGeometry(RH, 128), new T.MeshStandardMaterial({ map: floorTex, emissiveMap: floorTex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.14, metalness: 0.55, envMap: env, envMapIntensity: 0.7 }), 0, 0, 0, hall); f.rotation.x = -Math.PI / 2; }

  /* ---- wall: dark glass panels with vertical light slits, a bright cornice and a low light band */
  const wallTex = ctex(2048, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0e2133"); gr.addColorStop(1, "#08121d"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 64; i++) { const x = i * w / 64; g.fillStyle = i % 2 ? "rgba(70,140,190,.10)" : "rgba(10,30,50,.25)"; g.fillRect(x, 0, w / 64, h); g.fillStyle = "rgba(54,214,255,.55)"; g.fillRect(x, 0, 3, h); }
    g.fillStyle = "#050c14"; g.fillRect(0, h - 22, w, 22);
  });
  mesh(new T.CylinderGeometry(RH, RH, WH, 128, 1, true, DOORGAP, TAU - 2 * DOORGAP), new T.MeshStandardMaterial({ map: wallTex, emissiveMap: wallTex, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.35, metalness: 0.5, side: T.BackSide, envMap: env, envMapIntensity: 0.5 }), 0, WH / 2, 0, hall);
  [0.5, 1.15, WH - 0.55].forEach((y, i) => mesh(new T.CylinderGeometry(RH - 0.03, RH - 0.03, i === 1 ? 0.03 : 0.07, 128, 1, true, DOORGAP, TAU - 2 * DOORGAP), new T.MeshBasicMaterial({ color: new T.Color(0.3, 1.6, 2.4), side: T.BackSide, toneMapped: false }), 0, y, 0, hall));
  tor(RH - 0.15, 0.05, E(CY, 2.4), 0.04, hall);

  /* ---- ceiling: dark truss, many concentric glowing rings, a bright oculus over the table, a faint cone of light down onto it */
  mesh(new T.CircleGeometry(RH + 0.5, 64), M(0x0a141e, { metalness: 0.7, roughness: 0.4 }), 0, WH, 0, hall).rotation.x = Math.PI / 2;
  [2.9, 4.3, 5.8, 7.3, 8.8, 10.2].forEach((r, i) => tor(r, i === 0 ? 0.07 : 0.04, E(CY, i % 2 ? 1.8 : 2.4), WH - 0.18, hall));
  tor(2.0, 0.08, E(CW, 2.4), WH - 0.1, hall); mesh(new T.CircleGeometry(1.9, 48), E(0xffffff, 1.6), 0, WH - 0.06, 0, hall).rotation.x = Math.PI / 2;
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, b = mesh(new T.BoxGeometry(0.06, 0.1, 7.2), E(CY, 1.5), Math.sin(a) * 5.9, WH - 0.12, Math.cos(a) * 5.9, hall); b.rotation.y = a; }
  mesh(new T.CylinderGeometry(0.9, 2.6, WH - TABLE_Y, 48, 1, true), new T.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), 0, (WH + TABLE_Y) / 2, 0, hall);

  /* ---- the revolving table ---- */
  const tbl = new T.Group(); hall.add(tbl);
  const steel = M(0x0c1a28, { metalness: 0.75, roughness: 0.28, envMapIntensity: 1.1 });
  cyl(1.25, 1.5, TABLE_Y - 0.06, steel, 0, (TABLE_Y - 0.06) / 2, 0, tbl, 64);                       /* the pedestal */
  tor(1.5, 0.03, E(CY, 2.6), 0.03, tbl, 96); tor(1.28, 0.02, E(CW, 2), TABLE_Y - 0.1, tbl, 96);
  /* outer ring: a thick slab with bevelled edges (a lathe), glossy dark top, bright edge */
  { const pts = [[R_TROUGH, 0], [R_OUT + 0.06, 0], [R_OUT + 0.1, 0.05], [R_OUT + 0.1, 0.14], [R_OUT, 0.17], [R_TROUGH + 0.02, 0.17], [R_TROUGH, 0.12]].map(([r, y]) => new T.Vector2(r, y));
    const slab = mesh(new T.LatheGeometry(pts, 128), M(0x0a1622, { metalness: 0.7, roughness: 0.18, envMapIntensity: 1.2, side: T.DoubleSide }), 0, TABLE_Y - 0.1, 0, tbl); slab.name = "slab"; }
  tor(R_OUT + 0.08, 0.025, E(CY, 3), TABLE_Y + 0.06, tbl, 160); tor(R_TROUGH + 0.02, 0.02, E(CW, 2.6), TABLE_Y + 0.07, tbl, 128);
  /* a slowly revolving light band in the outer ring */
  const bandTex = ctex(1024, 1024, (g, w) => { const c = w / 2; for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, L = i % 6 ? 10 : 26; g.strokeStyle = i % 6 ? "rgba(90,220,255,.5)" : "rgba(190,245,255,.9)"; g.lineWidth = i % 6 ? 2 : 4; g.beginPath(); g.moveTo(c + Math.cos(a) * (c - 6), c + Math.sin(a) * (c - 6)); g.lineTo(c + Math.cos(a) * (c - 6 - L), c + Math.sin(a) * (c - 6 - L)); g.stroke(); } g.strokeStyle = "rgba(95,227,255,.7)"; g.lineWidth = 4; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(c, c, c - 50, k * TAU / 6 + 0.1, k * TAU / 6 + 0.75); g.stroke(); } });
  const spinG = new T.Group(); spinG.position.y = TABLE_Y + 0.075; tbl.add(spinG);
  { const rg = mesh(new T.RingGeometry(R_TROUGH + 0.08, R_OUT - 0.06, 128, 1), new T.MeshBasicMaterial({ map: bandTex, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, side: T.DoubleSide }), 0, 0, 0, spinG); rg.rotation.x = -Math.PI / 2;
    const uv = rg.geometry.attributes.uv, pos = rg.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { uv.setXY(i, 0.5 + pos.getX(i) / (R_OUT - 0.06) / 2, 0.5 + pos.getY(i) / (R_OUT - 0.06) / 2); } }
  /* the trough between the ring and the disc, glowing */
  { const tr = mesh(new T.RingGeometry(R_DISC, R_TROUGH, 96, 1), E(0x0a3a55, 1.2), 0, TABLE_Y + 0.02, 0, tbl); tr.rotation.x = -Math.PI / 2; }
  tor(R_DISC + 0.02, 0.025, E(CW, 3), TABLE_Y + 0.045, tbl, 128);

  /* the inner disc: it turns, and the patient lies on it */
  const turn = new T.Group(); turn.position.y = TABLE_Y + 0.05; hall.add(turn); out.turn = turn;
  const dialTex = ctex(1024, 1024, (g, w) => {
    const c = w / 2; const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, "#0d3a58"); gr.addColorStop(1, "#06202f"); g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
    for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(80,225,255,${0.5 - i * 0.04})`; g.lineWidth = i % 3 ? 2 : 4; g.beginPath(); g.arc(c, c, (0.16 + i * 0.095) * c, 0, TAU); g.stroke(); }
    for (let i = 0; i < 144; i++) { const a = i / 144 * TAU, r1 = c - 8, r0 = r1 - (i % 6 ? 10 : 30); g.strokeStyle = "#bff4ff"; g.lineWidth = i % 6 ? 2 : 4; g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke(); }
    g.fillStyle = "#e8fbff"; g.font = "700 38px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = c - 88; g.fillText(String(i * 45), c + Math.sin(a) * r, c - Math.cos(a) * r); }
  });
  { const d = mesh(new T.CircleGeometry(R_DISC, 96), new T.MeshBasicMaterial({ map: dialTex, toneMapped: false }), 0, 0.004, 0, turn); d.rotation.x = -Math.PI / 2; }
  tor(R_DISC - 0.02, 0.03, E(CW, 2.6), 0.012, turn, 96);
  /* a hologram glass cylinder round the patient with a scan ring that climbs it */
  const CYL_H = 2.1;
  mesh(new T.CylinderGeometry(R_DISC - 0.05, R_DISC - 0.05, CYL_H, 64, 1, true), new T.MeshBasicMaterial({ color: 0x8fe6ff, transparent: true, opacity: 0.045, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), 0, TABLE_Y + 0.05 + CYL_H / 2, 0, hall);
  const scanM = new T.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
  const scan = tor(R_DISC - 0.06, 0.012, scanM, TABLE_Y + 0.1, hall);
  tor(R_DISC - 0.06, 0.02, E(CW, 1.8), TABLE_Y + 0.05 + CYL_H, hall);

  /* ---- the three big curved displays on the far (north) wall ---- */
  const mkHero = (az, wid, pw, ph) => {
    const tex = ctex(pw, ph); tex.wrapS = T.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; tex.anisotropy = 8;
    const m = mesh(new T.CylinderGeometry(R_HERO, R_HERO, HERO_H, 56, 1, true, az - wid / 2, wid), new T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: T.BackSide }), 0, HERO_Y, 0, hall);
    m.renderOrder = 2; return { mesh: m, tex, g: tex.userData.g, w: pw, h: ph, az, wid, key: "", t: 0 };
  };
  const N = Math.PI, GAP = 0.05, WC = 0.78, WS = 0.64;
  out.hero = { L: mkHero(N + (WC / 2 + GAP + WS / 2), WS, 1280, 640), C: mkHero(N, WC, 1536, 640), R: mkHero(N - (WC / 2 + GAP + WS / 2), WS, 1280, 640) };
  /* (north is -z; to a viewer standing in the south, +x is to the right, so azimuth N+x lies on the left) */
  [-1, 1].forEach((sd) => [WC / 2 + GAP / 2, WC / 2 + GAP + WS + GAP / 2].forEach((d) => { const a = N + sd * d, b = mesh(new T.BoxGeometry(0.07, HERO_H + 0.4, 0.07), E(CY, 2.2), Math.sin(a) * (R_HERO - 0.05), HERO_Y, Math.cos(a) * (R_HERO - 0.05), hall); b.rotation.y = a; }));
  [HERO_Y - HERO_H / 2 - 0.08, HERO_Y + HERO_H / 2 + 0.08].forEach((y) => mesh(new T.CylinderGeometry(R_HERO - 0.03, R_HERO - 0.03, 0.05, 64, 1, true, N - 1.2, 2.4), E(CY, 2.2), 0, y, 0, hall).material.side = T.BackSide);

  /* ---- a doctor's station: chair, sloped screen, name placard ---- */
  const leather = M(0x0d1b2b, { roughness: 0.4, metalness: 0.3, envMapIntensity: 1.0 }), trim = E(0x3a9bff, 2);
  function chair() {
    const c = new T.Group();
    cyl(0.05, 0.07, 0.42, steel, 0, 0.23, 0, c, 16); cyl(0.34, 0.34, 0.035, steel, 0, 0.02, 0, c, 28); tor(0.34, 0.012, trim, 0.045, c, 40);
    mesh(new T.BoxGeometry(0.58, 0.09, 0.56), leather, 0, 0.46, 0.02, c);
    const back = mesh(new T.CylinderGeometry(0.42, 0.42, 0.66, 28, 1, true, Math.PI - 0.95, 1.9), M(0x102338, { roughness: 0.45, metalness: 0.25, side: T.DoubleSide }), 0, 0.84, 0.18, c); back.name = "back";
    const rim = mesh(new T.CylinderGeometry(0.425, 0.425, 0.03, 28, 1, true, Math.PI - 0.95, 1.9), trim, 0, 1.18, 0.18, c); rim.material = trim.clone(); rim.material.side = T.DoubleSide;
    [-1, 1].forEach((s) => mesh(new T.BoxGeometry(0.05, 0.05, 0.4), steel, s * 0.33, 0.66, 0.02, c));
    return c;
  }
  function screenMesh() {
    const D = out.dims, grp = new T.Group(), tex = ctex(D.PXW, D.PXH); tex.anisotropy = 8;
    const tilt = new T.Group(); tilt.rotation.x = -SCREEN.PHI; grp.add(tilt);
    mesh(new T.BoxGeometry(D.W + 0.06, D.H + 0.06, 0.035), M(0x070e16, { metalness: 0.8, roughness: 0.3 }), 0, 0, -0.022, tilt);
    const pl = mesh(new T.PlaneGeometry(D.W, D.H), new T.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 0, 0.0, tilt); pl.name = "screen";
    mesh(new T.BoxGeometry(0.5, 0.05, 0.26), steel, 0, -D.H * 0.5 * Math.sin(SCREEN.PHI) + 0.0, -0.06 - 0.02, grp);
    return { grp, tilt, plane: pl, tex, g: tex.userData.g };
  }
  function placardMesh() {
    const tex = ctex(512, 148); tex.anisotropy = 8;
    const grp = new T.Group(), pl = mesh(new T.PlaneGeometry(0.76, 0.22), new T.MeshBasicMaterial({ map: tex, toneMapped: false, side: T.DoubleSide }), 0, 0, 0, grp); pl.rotation.x = -1.0;
    mesh(new T.BoxGeometry(0.78, 0.015, 0.1), steel, 0, -0.11 * Math.cos(1.0) - 0.01, -0.0, grp);
    return { grp, plane: pl, tex, g: tex.userData.g };
  }
  const stGroup = new T.Group(); hall.add(stGroup);
  out.dims = DIMS.land;
  out.layout = (list, portrait) => {
    out.dims = portrait ? DIMS.port : DIMS.land;
    stGroup.children.slice().forEach((c) => { stGroup.remove(c); c.traverse((o2) => { if (o2.material && o2.material.map && o2.material.map.userData && o2.material.map.userData.c) o2.material.map.dispose(); }); });
    out.stations.length = 0; const n = list.length, gap = n <= 3 ? 0.66 : n === 4 ? 0.56 : 0.5;
    list.forEach((it, i) => {
      const a = (i - (n - 1) / 2) * gap, sa = Math.sin(a), ca = Math.cos(a);
      const g = new T.Group(); g.position.set(sa * R_SEAT, 0, ca * R_SEAT); g.rotation.y = a + Math.PI; g.add(chair()); stGroup.add(g);
      const sc = screenMesh(); sc.grp.position.set(sa * R_SCR, TABLE_Y + 0.24, ca * R_SCR); sc.grp.rotation.y = a; stGroup.add(sc.grp);
      const pc = placardMesh(); pc.grp.position.set(sa * (R_OUT - 0.1), TABLE_Y + 0.13, ca * (R_OUT - 0.1)); pc.grp.rotation.y = a; stGroup.add(pc.grp);
      sc.plane.userData.station = i; pc.plane.userData.station = i;
      out.stations.push({ i, a, x: sa * R_SEAT, z: ca * R_SEAT, yaw: a + Math.PI, item: it, screen: sc, placard: pc });
    });
    stGroup.updateMatrixWorld(true); return out.stations;
  };
  /* where a camera must stand to look squarely at a station's screen, filling the view */
  out.screenView = (st, dist) => {
    st.screen.plane.updateMatrixWorld(true); const p = new V(), n = new V(0, 0, 1); st.screen.plane.getWorldPosition(p); n.transformDirection(st.screen.plane.matrixWorld);
    return { pos: p.clone().addScaledVector(n, dist), at: p, n };
  };
  out.heroView = (h, dist) => { const x = Math.sin(h.az) * (R_HERO - dist), z = Math.cos(h.az) * (R_HERO - dist); return { x, z, at: new V(Math.sin(h.az) * R_HERO, HERO_Y, Math.cos(h.az) * R_HERO) }; };

  out.update = (dt, t) => {
    spinG.rotation.y += dt * 0.12;
    scan.position.y = TABLE_Y + 0.1 + (0.5 + 0.5 * Math.sin(t * 0.55)) * (CYL_H - 0.1); scanM.opacity = 0.35 + 0.3 * Math.sin(t * 1.3);
  };
  return out;
}
