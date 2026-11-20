/* Realistic ICU bed for the Living ICU ward.
   Builds the electric bed (chassis with columns and twin-wheel casters, white deck, blue vinyl mattress in three sections,
   split side rails with hand-grip slots and control pads, head and foot boards, pillow, draped sheet) and returns each
   assembly as its own group, tagged userData.part so the viewer can select it.
   Bed frame used by ward3d: head toward -x, feet toward +x, up = +y, hinge of the back section at (-0.05, 0.78). */

export function buildBed(T, X) {
  const { M, rb, bx, cyl, mesh, ctex, rnd, V, onBack, TH, LB, mMetal, mDark, env } = X;
  const cth = Math.cos(TH), sth = Math.sin(TH);
  const HING = [-0.05, 0.78], SEAT_TOP = 0.84, SB = 0.06, MT = 0.145, W = 0.86;
  const part = (name) => { const g = new T.Group(); g.name = name; g.userData.part = name; return g; };
  const frame = part("Bed frame"), mattress = part("Mattress"), rails = part("Side rails"), pillow = part("Pillow"), sheetG = part("Bedding");

  /* ---- materials ---- */
  const plastic = M(0xf1f4f6, { roughness: 0.34, envMapIntensity: 0.95 });
  const plasticG = M(0xb9c3ca, { roughness: 0.42 });
  const steel = M(0xc3ced6, { metalness: 0.95, roughness: 0.28, envMapIntensity: 1.5 });
  const black = M(0x0f1317, { roughness: 0.55 });
  const quilt = ctex(256, 256, (g, w, h) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 64 + 32, y = j * 64 + 32, q = g.createRadialGradient(x, y, 4, x, y, 40);
      q.addColorStop(0, "#c8c8c8"); q.addColorStop(1, "#6a6a6a"); g.fillStyle = q; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
    }
    g.strokeStyle = "#383838"; g.lineWidth = 3; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke(); }
  });
  quilt.colorSpace = T.NoColorSpace; quilt.wrapS = quilt.wrapT = T.RepeatWrapping;
  const vinyl = M(0x3f72b9, { roughness: 0.46, bumpMap: quilt, bumpScale: 1.4, envMapIntensity: 1.0 });
  const cotton = M(0xf6f8fa, { roughness: 0.88, bumpMap: X.fabric, bumpScale: 0.9, envMapIntensity: 0.45 });

  /* ---- chassis: base, telescopic columns, caster wheels ---- */
  rb(1.5, 0.07, 0.62, 0.03, plasticG, 0.06, 0.21, 0, frame);
  rb(1.3, 0.05, 0.5, 0.02, M(0x6c7882, { metalness: 0.8, roughness: 0.38 }), 0.06, 0.16, 0, frame);
  [[-0.5, 0.3, 0.1], [0.58, 0.3, 0.11]].forEach(([x, h, r]) => {
    const c = cyl(r, r * 1.08, h, plastic, x, 0.38, 0, frame, 24);
    for (let k = 0; k < 6; k++) { const t = new T.Mesh(new T.TorusGeometry(r * 1.02, 0.007, 6, 28), black); t.rotation.x = Math.PI / 2; t.position.set(x, 0.27 + k * 0.045, 0); frame.add(t); }
    void c;
  });
  [[-0.72, 0.3], [-0.72, -0.3], [0.84, 0.3], [0.84, -0.3]].forEach(([x, z]) => {
    rb(0.09, 0.09, 0.06, 0.02, plasticG, x, 0.13, z * 0.9, frame);
    cyl(0.022, 0.022, 0.07, steel, x, 0.17, z * 0.9, frame, 10);
    [-0.026, 0.026].forEach((dz) => { const w = cyl(0.07, 0.07, 0.03, M(0x20262c, { roughness: 0.6 }), x, 0.07, z * 0.9 + dz, frame, 22); w.rotation.x = Math.PI / 2; cyl(0.035, 0.035, 0.034, steel, x, 0.07, z * 0.9 + dz, frame, 10).rotation.x = Math.PI / 2; });
  });
  rb(0.05, 0.03, 0.4, 0.012, M(0xd6403a, { roughness: 0.5 }), 0.66, 0.1, 0, frame);   /* brake bar */

  /* ---- deck panels under the mattress (seat is fixed, back section hinged) ---- */
  rb(1.12, 0.05, 0.82, 0.02, plastic, 0.5, 0.67, 0, frame);
  { const d = rb(LB, 0.045, 0.82, 0.02, plastic, 0, 0, 0, frame); d.position.copy(onBack(LB / 2, -SB - MT - 0.02 + 0.06)); d.rotation.z = -TH; }
  { const s = cyl(0.026, 0.026, 0.46, steel, -0.28, 0.52, 0, frame, 10); s.rotation.z = 0.55; }   /* back-section actuator */
  rb(0.5, 0.06, 0.5, 0.02, plasticG, 0.5, 0.58, 0, frame);

  /* ---- mattress: back, seat and calf sections, quilted blue vinyl ---- */
  { const m = rb(LB, MT, W, 0.045, vinyl, 0, 0, 0, mattress); m.position.copy(onBack(LB / 2, SB - MT / 2)); m.rotation.z = -TH; }
  rb(1.13, MT, W, 0.045, vinyl, 0.5, SEAT_TOP - MT / 2, 0, mattress);
  quilt.repeat.set(3, 3);

  /* ---- head board and foot board ---- */
  { const hb = rb(0.045, 0.42, 0.9, 0.03, plastic, 0, 0, 0, frame); hb.position.copy(onBack(LB + 0.045, 0.06 + 0.02)); hb.rotation.z = -TH; }
  { const fb = rb(0.05, 0.5, 0.9, 0.03, plastic, 1.1, 0.96, 0, frame); void fb; }
  { const g = new T.Mesh(new T.PlaneGeometry(0.5, 0.28), new T.MeshStandardMaterial({ color: 0xcfd9e0, roughness: 0.5 })); g.position.set(1.073, 0.98, 0); g.rotation.y = -Math.PI / 2; frame.add(g); }

  /* ---- split side rails: white plastic panels with a hand-grip slot and a control pad ---- */
  function railGeo(w, h, d) {
    const r = 0.05, s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const sw = w * 0.7, sh = h * 0.3, sy = h * 0.14, hole = new T.Path(), hx = -sw / 2, hy = sy - sh / 2, hr = sh / 2;
    hole.moveTo(hx + hr, hy); hole.lineTo(hx + sw - hr, hy); hole.absarc(hx + sw - hr, hy + hr, hr, -Math.PI / 2, Math.PI / 2, false); hole.lineTo(hx + hr, hy + sh); hole.absarc(hx + hr, hy + hr, hr, Math.PI / 2, Math.PI * 1.5, false);
    s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -d / 2); return g;
  }
  const padTex = (title, big) => ctex(256, 128, (g, w, h) => {
    g.fillStyle = "#1a2530"; g.fillRect(0, 0, w, h); g.fillStyle = "#f2a53a"; g.fillRect(0, 0, w, 30);
    g.fillStyle = "#1a2530"; g.font = "700 20px system-ui,sans-serif"; g.fillText(title, 10, 22);
    g.fillStyle = "#dff4ff"; g.font = "700 44px system-ui,sans-serif"; g.fillText(big, 12, 82);
    [[168, 60], [208, 60], [168, 100], [208, 100]].forEach(([x, y], i) => { g.fillStyle = i % 2 ? "#3a4a5a" : "#51657a"; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); g.fillStyle = "#e8f6ff"; g.beginPath(); const u = i < 2 ? -1 : 1; g.moveTo(x - 7, y + 4 * u); g.lineTo(x + 7, y + 4 * u); g.lineTo(x, y - 6 * u); g.fill(); });
  });
  const deg = Math.round(TH * 180 / Math.PI);
  const pads = [];
  [1, -1].forEach((s) => {
    const z = s * 0.475;
    /* back-section rail, rides with the backrest */
    const hr = new T.Mesh(railGeo(0.56, 0.3, 0.03), plastic); hr.position.copy(onBack(0.46, SB + 0.17, z)); hr.rotation.z = -TH; rails.add(hr);
    /* seat / foot rail, fixed */
    const fr = new T.Mesh(railGeo(0.82, 0.3, 0.03), plastic); fr.position.set(0.62, SEAT_TOP + 0.17, z); rails.add(fr);
    [0.3, 0.9].forEach((x) => cyl(0.012, 0.012, 0.3, steel, x, 0.69 + 0.0, z, rails, 8));
    { const p = onBack(0.3, 0), q = onBack(0.62, 0); cyl(0.012, 0.012, 0.3, steel, p.x, 0.69, z, rails, 8); cyl(0.012, 0.012, 0.3, steel, q.x, 0.69 + (q.y - 0.78) * 0.5, z, rails, 8); }
    const mk = (tex, w, h, x, y) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(x, y, z + s * 0.0215); if (s < 0) m.rotation.y = Math.PI; return m; };
    const a = mk(padTex("BED", "FOOT"), 0.17, 0.085, 0.62, SEAT_TOP + 0.255), b = mk(padTex("HEAD", deg + "°"), 0.17, 0.085, 0, 0);
    b.position.copy(onBack(0.46, SB + 0.255, z + s * 0.0215)); b.rotation.z = -TH; rails.add(a, b); pads.push(a, b);
  });

  /* ---- pillow ---- */
  { const m = rb(0.44, 0.11, 0.6, 0.05, cotton, 0, 0, 0, pillow); m.position.copy(onBack(LB - 0.2, SB + 0.06)); m.rotation.z = -TH; }

  /* ---- draped top sheet over the legs: height field over the leg capsules ---- */
  function makeSheet(legs, x0, x1) {
    /* legs: [{z, pts:[[x, centreY, radius], ...]}] along the real legs; the sheet is a height field over them */
    const X0 = x0, X1 = x1, nx = 80, nz = 48, g = new T.PlaneGeometry(X1 - X0, 0.92, nx, nz); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, top = SEAT_TOP;
    const prof = (pts, x) => { if (x <= pts[0][0]) return pts[0]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); return [x, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, pts[i - 1][2] + (pts[i][2] - pts[i - 1][2]) * t]; } return pts[pts.length - 1]; };
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k) + (X0 + X1) / 2, z = p.getZ(k), u = (x - X0) / (X1 - X0);
      let y = top + 0.012;
      legs.forEach((lg) => { const q = prof(lg.pts, x), dz = (z - lg.z) / (q[2] * 1.3); if (Math.abs(dz) < 1) y = Math.max(y, q[1] + Math.sqrt(1 - dz * dz) * q[2] + 0.012); else { const e = Math.max(0, 1 - (Math.abs(dz) - 1) / 0.9); y = Math.max(y, top + 0.012 + (q[1] + q[2] - top) * 0.25 * e * e); } });
      y = top + (y - top) * Math.min(1, Math.max(0, (u - 0.0) / 0.12));                 /* settles at the waist edge */
      y += 0.004 * Math.sin(x * 19 + z * 9) + 0.0035 * Math.sin(x * 43 - z * 13);
      const az = Math.abs(z); if (az > 0.33) y -= Math.pow((az - 0.33) / 0.13, 1.6) * 0.1;   /* drops over the mattress edge */
      p.setX(k, x); p.setY(k, y); p.setZ(k, z);
    }
    g.computeVertexNormals();
    return new T.Mesh(g, new T.MeshStandardMaterial({ color: 0xe4ecf4, roughness: 0.9, bumpMap: X.fabric, bumpScale: 1.0, side: T.DoubleSide, envMap: env, envMapIntensity: 0.4 }));
  }
  const legs0 = [{ z: 0.12, pts: [[-0.1, 0.96, 0.09], [0.4, 0.93, 0.08], [0.9, 0.9, 0.05]] }, { z: -0.12, pts: [[-0.1, 0.96, 0.09], [0.4, 0.93, 0.08], [0.9, 0.9, 0.05]] }];
  const sheet = makeSheet(legs0, -0.2, 0.95); sheetG.add(sheet);
  const hem = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.8, 10), M(0xeef3f7, { roughness: 0.9 })); hem.rotation.x = Math.PI / 2; hem.position.set(-0.2, SEAT_TOP + 0.03, 0); sheetG.add(hem);
  const setLegs = (legs, x0, x1) => { const n = makeSheet(legs, x0, x1); sheet.geometry.dispose(); sheet.geometry = n.geometry; hem.position.x = x0 + 0.01; };

  return { frame, mattress, rails, pillow, sheetG, setLegs, pads, SEAT_TOP, SB, MT };
}
