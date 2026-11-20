/* Bedside devices for the Medical Nexus: ventilator trolley, IV pole with bags, infusion-pump stack.
   The shapes and screens are the ones from the ICU command centre (ward3d.js), rebuilt as a reusable piece and driven
   by the Team room's patient (tube, oxygen, noradrenaline, fluids, antibiotics, blood).
   createDevices(T, env) -> { vent, pole, ventPort(v), polePort(v), update(state, t) }                                     */
export function createDevices(T, env) {
  const V = T.Vector3;
  const M = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0, envMap: env, envMapIntensity: 0.8 }, o || {}));
  const E = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k || 1), toneMapped: false });
  const ctex = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t; };
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
  const mMetal = M(0x7f93a6, { metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 });
  const mDark = M(0x151e28, { metalness: 0.6, roughness: 0.38, envMapIntensity: 1.1 });
  const mWheel = M(0x0c0f12, { roughness: 0.6 });
  const clear = M(0xbfe8f5, { transparent: true, opacity: 0.38, roughness: 0.1, envMapIntensity: 1.5, side: T.DoubleSide, depthWrite: false });
  const chrome = M(0xdfe8ee, { metalness: 1, roughness: 0.2, envMapIntensity: 1.6 });
  const mWhite = M(0xeef3f6, { roughness: 0.42 });

  /* ------------------------------------------------ ventilator trolley (same build as the ICU command centre) */
  const vent = new T.Group(); vent.userData.part = "Ventilator";
  rb(0.52, 0.06, 0.5, 0.02, mDark, 0, 0.12, 0, vent); cyl(0.04, 0.04, 0.85, mMetal, 0, 0.55, 0, vent, 10);
  [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]].forEach((q) => cyl(0.04, 0.04, 0.03, mWheel, q[0], 0.04, q[1], vent, 10));
  rb(0.5, 0.36, 0.3, 0.04, M(0x252d35, { metalness: 0.55, roughness: 0.35 }), 0, 1.15, 0, vent);
  const vTex = ctex(300, 200);
  mesh(new T.PlaneGeometry(0.32, 0.213), new T.MeshBasicMaterial({ map: vTex, toneMapped: false }), -0.05, 1.19, 0.153, vent);
  cyl(0.025, 0.025, 0.02, E(0x36d6ff, 1.5), 0.17, 1.09, 0.155, vent, 12).rotation.x = Math.PI / 2; cyl(0.025, 0.025, 0.02, mMetal, 0.17, 1.2, 0.155, vent, 12).rotation.x = Math.PI / 2;
  cyl(0.07, 0.07, 0.2, clear, 0.22, 1.0, -0.05, vent, 16).position.y = 0.97;

  /* ------------------------------------------------ IV pole, bags, pump stack */
  const pole = new T.Group(); pole.userData.part = "IV pole, bags and infusion pumps";
  cyl(0.014, 0.014, 2.05, chrome, 0, 1.03, 0, pole, 8);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, l = bx(0.3, 0.02, 0.025, chrome, Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15, pole); l.rotation.y = -a; }
  bx(0.62, 0.016, 0.016, chrome, 0, 2.05, 0, pole);
  const bag = (color) => {
    const g = new T.Group();
    rb(0.11, 0.2, 0.04, 0.03, M(color, { transparent: true, opacity: 0.82, roughness: 0.15, envMapIntensity: 1.3 }), 0, -0.1, 0, g);
    cyl(0.006, 0.006, 0.05, mMetal, 0, 0.02, 0, g, 6); bx(0.07, 0.02, 0.045, mWhite, 0, -0.01, 0, g);
    return g;
  };
  const bags = { fluid: bag(0xe6edc8), saline: bag(0xd5ecf4), blood: bag(0x8b1a22), abx: bag(0xf0e2a0) };
  Object.values(bags).forEach((b, k) => { b.position.set(-0.22 + k * 0.15, 2.04, 0); b.visible = false; pole.add(b); });
  const pump = new T.Group(); pole.add(pump);
  rb(0.3, 0.8, 0.2, 0.03, M(0xdfe5e9, { roughness: 0.4 }), 0.12, 1.25, 0, pump);
  const pTex = ctex(256, 512);
  mesh(new T.PlaneGeometry(0.26, 0.74), new T.MeshBasicMaterial({ map: pTex, toneMapped: false }), 0.12, 1.25, 0.103, pump);
  /* a small glowing dot above each pump slot: running = green */
  let key = "", vkey = "";

  function paintPumps(rows) {
    const g = pTex.userData.g; g.fillStyle = "#0a1119"; g.fillRect(0, 0, 256, 512);
    for (let k = 0; k < 6; k++) {
      const y = k * 85 + 3, on = k < rows.length; g.fillStyle = on ? "#0c2a22" : "#10161d"; g.fillRect(6, y, 244, 78);
      if (on) { g.fillStyle = "#3dff9a"; g.font = "600 24px system-ui"; g.fillText(rows[k][0].slice(0, 16), 14, y + 30); g.fillStyle = "#e8fff2"; g.font = "700 30px monospace"; g.fillText(rows[k][1].slice(0, 14), 14, y + 64); }
    }
    pTex.needsUpdate = true;
  }
  paintPumps([]);

  /* ventilator screen: waveforms when the patient is intubated, otherwise the standby page */
  function paintVent(s, t) {
    const g = vTex.userData.g, w = 300, h = 200; g.fillStyle = "#0a1830"; g.fillRect(0, 0, w, h);
    if (!s.tube) {
      g.fillStyle = "#39e6ff"; g.font = "bold 30px monospace"; g.fillText(s.oxygen ? "O2 THERAPY" : "STANDBY", 18, 70);
      g.fillStyle = "#7fa6c8"; g.font = "22px monospace"; g.fillText(s.oxygen ? "Mask / nasal flow" : "Not connected", 18, 108); g.fillText("SpO2 " + s.spo2 + "%", 18, 150);
      vTex.needsUpdate = true; return;
    }
    const rr = Math.max(8, Math.min(30, s.rr || 16)), peep = 8, fio2 = s.spo2 < 92 ? 80 : 50;
    g.fillStyle = "#d8ecff"; g.font = "bold 19px monospace"; g.fillText("IMV  Vt 420  RR " + Math.round(rr) + "  PEEP " + peep + "  FiO2 " + fio2, 8, 24);
    const rh = (h - 40) / 3, W = 280, cs = ["#ffd24a", "#3dff9a", "#39e6ff"], period = 60 / rr;
    for (let r = 0; r < 3; r++) {
      g.strokeStyle = cs[r]; g.lineWidth = 2; g.beginPath(); const y0 = 40 + rh * (r + 1) - 4;
      for (let k = 0; k < W; k += 2) {
        const f = ((((t - (W - k) / 70) / period) % 1) + 1) % 1, ins = f < 0.33, ex = Math.exp(-(f - 0.33) / 0.14);
        const val = r === 0 ? (peep + (ins ? 4 + 14 * f / 0.33 : ex * 18)) / 35 : r === 1 ? (ins ? 0.5 : -0.7 * ex) : (ins ? f / 0.33 : ex);
        const yy = (r === 1 ? y0 - rh * 0.45 : y0) - val * rh * 0.85; k ? g.lineTo(10 + k, yy) : g.moveTo(10 + k, yy);
      }
      g.stroke();
    }
    vTex.needsUpdate = true;
  }

  return {
    vent, pole,
    ventPort: (v) => vent.localToWorld((v || new V()).set(0.14, 1.05, 0.0)),
    polePort: (v) => pole.localToWorld((v || new V()).set(0.0, 1.3, 0.1)),
    update(s, t) {
      /* bags and pump rows follow what the team has ordered */
      const rows = [];
      if (s.norepi) rows.push(["Noradrenaline", typeof s.norepi === "number" ? Math.round(s.norepi * 10) / 10 + " mcg/min" : "Running"]);
      if (s.fluid > 0) rows.push(["Crystalloid", s.fluid + " x 500 mL"]);
      if (s.abx) rows.push(["Antibiotic", "Running"]);
      if (s.blood) rows.push(["Blood", "Running"]);
      if (s.dialysis) rows.push(["Dialysis", "Running"]);
      const k = rows.map((r) => r.join()).join("|"); if (k !== key) { key = k; paintPumps(rows); pump.visible = rows.length > 0; bags.fluid.visible = s.fluid > 0; bags.saline.visible = !!(s.saline || s.mannitol); bags.abx.visible = !!s.abx; bags.blood.visible = !!s.blood; }
      const vk = [s.tube, s.oxygen, s.spo2, Math.round(s.rr), Math.round(t * 12)].join();
      if (vk !== vkey) { vkey = vk; paintVent(s, t); }
    },
  };
}
