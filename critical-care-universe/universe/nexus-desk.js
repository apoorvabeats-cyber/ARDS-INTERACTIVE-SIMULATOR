/* The orbit desk of the Medical Nexus: a drum with a sloped top that circles the patient's glass cylinder, as in the reference picture.
   A ring on the sloped top turns with the finger. Eight lit labels sit on that ring. A label that is touched stands up out of the desk and
   opens as a scientific panel (the panel itself is HTML, built by nexus-sections.js).
   createDesk(T, o) -> { group, orbit, tileMeshes, frustum, update(dt, t, viewAz), drag(dAngle), release(), pick(ray), hit(ray), setActive(id), setInfo(id, text), setBadge(id, n), faceTile(id, viewAz), screenOf(id, cam) } */
export const DESK = { DI: 1.62, DO: 3.0, HI: 1.02, HO: 0.74 };

export function createDesk(T, o) {
  const { env, TOP, SECTIONS } = o, V = T.Vector3, TAU = Math.PI * 2, { DI, DO, HI, HO } = DESK, slope = Math.atan2(HI - HO, DO - DI);
  const group = new T.Group(); group.position.y = TOP; o.hall.add(group);
  const M = (c, x) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.5, envMap: env, envMapIntensity: 1.0 }, x || {}));
  const glow = (c, k) => new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k || 1), toneMapped: false });
  const ring = (r, t, mat, y, par) => { const m = new T.Mesh(new T.TorusGeometry(r, t, 8, 160), mat); m.rotation.x = Math.PI / 2; m.position.y = y; (par || group).add(m); return m; };

  /* the drum, its sloped top, the inner wall */
  const wall = new T.Mesh(new T.CylinderGeometry(DO, DO + 0.05, HO, 128, 1, true), M(0x0c1a26, { metalness: 0.7, roughness: 0.32, side: T.DoubleSide })); wall.position.y = HO / 2; group.add(wall);
  [0.18, HO * 0.62].forEach((y) => ring(DO + 0.02 + (0.05 * (1 - y / HO)), 0.014, glow(0x36d6ff, 2.2), y));
  const frustum = new T.Mesh(new T.CylinderGeometry(DI, DO, HI - HO, 128, 1, true), M(0x07141f, { metalness: 0.55, roughness: 0.3, side: T.DoubleSide })); frustum.position.y = (HI + HO) / 2; group.add(frustum);
  const inner = new T.Mesh(new T.CylinderGeometry(DI - 0.01, DI - 0.01, HI + 0.05, 96, 1, true), M(0x061018, { metalness: 0.6, roughness: 0.35, side: T.BackSide })); inner.position.y = (HI + 0.05) / 2 - 0.02; group.add(inner);
  ring(DO + 0.02, 0.03, glow(0x7fe9ff, 2.6), HO); ring(DI, 0.034, glow(0xbff4ff, 2.8), HI);

  /* the glass cylinder round the patient */
  const CYL_H = 3.3;
  const tube = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, CYL_H, 64, 1, true), new T.MeshBasicMaterial({ color: 0x8fe6ff, transparent: true, opacity: 0.05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); tube.position.y = CYL_H / 2; group.add(tube);
  ring(1.5, 0.02, glow(0x7fe9ff, 2.4), CYL_H); ring(1.5, 0.02, glow(0x7fe9ff, 1.8), 0.02);
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.78, m = new T.Mesh(new T.BoxGeometry(0.014, CYL_H, 0.014), glow(0x7fe9ff, 1.4)); m.position.set(Math.sin(a) * 1.5, CYL_H / 2, Math.cos(a) * 1.5); group.add(m); }

  /* the orbit ring: turns on the sloped top, carries the eight labels */
  const orbit = new T.Group(); group.add(orbit);
  const texC = document.createElement("canvas"); texC.width = 2048; texC.height = 160; { const g = texC.getContext("2d"), w = 2048, h = 160, n = SECTIONS.length;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0d3550"); gr.addColorStop(0.5, "#0a2538"); gr.addColorStop(1, "#0d3550"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#7fe9ff"; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7); g.fillStyle = "rgba(127,233,255,.45)"; g.fillRect(0, 22, w, 2); g.fillRect(0, h - 24, w, 2);
    for (let i = 0; i < 210; i++) { const x = i * w / 210, L = i % 5 ? 14 : 30; g.fillStyle = "rgba(190,245,255,.8)"; g.fillRect(x, 12, 3, L); g.fillRect(x, h - 12 - L, 3, L); }
    for (let k = 0; k < n; k++) { const x = (k + 0.5) / n * w; g.fillStyle = "rgba(95,227,255,.5)"; g.fillRect(x - 3, 40, 6, h - 80); }
  }
  const ringTex = new T.CanvasTexture(texC); ringTex.colorSpace = T.SRGBColorSpace; ringTex.wrapS = T.RepeatWrapping; ringTex.anisotropy = 4;
  const rin = DI + 0.07, rout = DO - 0.08, hh = (HI - HO) * (rout - rin) / (DO - DI), rmid = (rin + rout) / 2, ymid = HO + (DO - rmid) / (DO - DI) * (HI - HO);
  const band = new T.Mesh(new T.CylinderGeometry(rin, rout, hh, 160, 1, true), new T.MeshStandardMaterial({ map: ringTex, emissiveMap: ringTex, emissive: 0xffffff, emissiveIntensity: 0.75, roughness: 0.35, metalness: 0.3, envMap: env, side: T.DoubleSide }));
  band.position.y = ymid + 0.012; orbit.add(band);

  /* the eight labels */
  const TW = 1.5, TH = 0.82, RM = 2.32, tiles = [];
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  function paintTile(t) {
    const g = t.cv.getContext("2d"), w = t.cv.width, h = t.cv.height, on = t.active;
    g.clearRect(0, 0, w, h); g.fillStyle = on ? "rgba(14,70,96,.95)" : "rgba(6,28,44,.9)"; rrect(g, 4, 4, w - 8, h - 8, 26); g.fill();
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, on ? "rgba(95,227,255,.4)" : "rgba(95,227,255,.2)"); gr.addColorStop(1, "rgba(95,227,255,0)"); g.fillStyle = gr; rrect(g, 4, 4, w - 8, h - 8, 26); g.fill();
    g.strokeStyle = on ? "#c8f6ff" : "rgba(127,233,255,.9)"; g.lineWidth = on ? 7 : 4; rrect(g, 4, 4, w - 8, h - 8, 26); g.stroke();
    g.fillStyle = "#7fe9ff"; g.font = "800 112px system-ui,sans-serif"; g.textBaseline = "alphabetic"; g.fillText(t.sec.n, 28, 132);
    g.fillStyle = "#fff"; g.font = "700 40px system-ui,sans-serif"; const words = t.sec.tile.split(" "), lines = []; let ln = ""; words.forEach((wd) => { const x = ln ? ln + " " + wd : wd; if (g.measureText(x).width > w - 56 && ln) { lines.push(ln); ln = wd; } else ln = x; }); lines.push(ln);
    lines.slice(0, 2).forEach((l, i) => g.fillText(l, 28, 196 + i * 46));
    g.fillStyle = "#9fe9ff"; g.font = "500 28px system-ui,sans-serif"; g.fillText((t.info || t.sec.subs.length + " pages").slice(0, 34), 28, h - 28);
    if (t.badge) { g.fillStyle = "#ffc24a"; g.beginPath(); g.arc(w - 52, 56, 30, 0, TAU); g.fill(); g.fillStyle = "#1b1200"; g.font = "800 34px system-ui,sans-serif"; g.textAlign = "center"; g.fillText(String(t.badge), w - 52, 68); g.textAlign = "left"; }
    t.tex.needsUpdate = true;
  }
  SECTIONS.forEach((sec, k) => {
    const cv = document.createElement("canvas"); cv.width = 768; cv.height = 420; const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const holder = new T.Group(), mesh = new T.Mesh(new T.PlaneGeometry(TW, TH), new T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: T.DoubleSide }));
    holder.add(mesh); const ang = k * TAU / SECTIONS.length; holder.rotation.order = "YXZ"; orbit.add(holder);
    const t = { id: sec.id, sec, cv, tex, mesh, holder, ang, active: false, info: "", badge: 0, rise: 0 }; mesh.userData.tile = t; tiles.push(t); paintTile(t);
  });
  const yAt = (r) => HO + (DO - r) / (DO - DI) * (HI - HO);
  let rot = 0, vel = 0, dragging = false, snapTo = null, dirty = 0;
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function pose(t, k) {
    const r = RM + 0.1 * t.rise, y = yAt(RM) + 0.02 + 0.3 * t.rise, rx = slope - Math.PI / 2 + t.rise * 0.62;
    t.holder.position.set(Math.sin(t.ang) * r, y, Math.cos(t.ang) * r); t.holder.rotation.set(rx, t.ang, 0); t.holder.scale.setScalar(1 + 0.1 * t.rise);
  }
  tiles.forEach(pose);

  return {
    group, orbit, frustum, tileMeshes: tiles.map((t) => t.mesh),
    update(dt, time, viewAz) {
      if (!dragging) {
        if (Math.abs(vel) > 0.05) { rot += vel * dt; vel *= Math.exp(-dt * 3.4); snapTo = null; }
        else {
          if (snapTo == null) { let best = 0, bd = 9; tiles.forEach((t) => { const d = wrapA(viewAz - (t.ang + rot)); if (Math.abs(d) < Math.abs(bd)) { bd = d; best = t; } }); snapTo = rot + bd; }
          rot += (snapTo - rot) * (1 - Math.exp(-dt * 6)); vel = 0;
        }
      }
      orbit.rotation.y = rot;
      tiles.forEach((t) => { const goal = t.active ? 1 : 0; if (Math.abs(t.rise - goal) > 0.002) { t.rise += (goal - t.rise) * (1 - Math.exp(-dt * 7)); pose(t); } else if (t.rise !== goal) { t.rise = goal; pose(t); } });
    },
    drag(da, dt) { dragging = true; snapTo = null; rot += da; vel = da / Math.max(dt || 0.016, 0.008); vel = Math.max(-5, Math.min(5, vel)); },
    release() { dragging = false; },
    pick(ray) { const h = ray.intersectObjects(tiles.map((t) => t.mesh), false)[0]; return h ? h.object.userData.tile.id : null; },
    hit(ray) { const h = ray.intersectObject(frustum, false)[0]; return h ? h.distance : null; },
    setActive(ids) { const L = [].concat(ids || []); tiles.forEach((t) => { const on = L.includes(t.id); if (t.active !== on) { t.active = on; paintTile(t); } }); },
    setInfo(id, s) { const t = tiles.find((x) => x.id === id); if (t && t.info !== s) { t.info = s; paintTile(t); } },
    setBadge(id, n) { const t = tiles.find((x) => x.id === id); if (t && t.badge !== n) { t.badge = n; paintTile(t); } },
    /* turn the ring so the label is straight in front of the viewer */
    faceTile(id, viewAz) { const t = tiles.find((x) => x.id === id); if (t) { vel = 0; snapTo = rot + wrapA(viewAz - (t.ang + rot)); } },
    screenOf(id, cam) { const t = tiles.find((x) => x.id === id); if (!t) return null; const v = new V(); t.mesh.getWorldPosition(v); v.project(cam); return { x: (v.x * 0.5 + 0.5), y: (-v.y * 0.5 + 0.5) }; },
  };
}
