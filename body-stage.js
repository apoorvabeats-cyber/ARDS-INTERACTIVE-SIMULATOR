/* Live ICU bay behind the 3D body ("Train your brain" → human body).
   A 2D canvas sits behind the transparent WebGL canvas. Only the room is drawn here: the body, organs and
   every control are untouched. The room is a one-point-perspective ICU bay: curtained and glass walls,
   a lit ceiling, a glossy blue floor, a bed on the left and a monitor cart on the right.
   Live layer: a holographic vitals panel on the left (running ECG, HR, BP, RR, SpO2 that drift like a real
   monitor) and a holographic skeleton on the right, heartbeat-synced aura, scan rings, beams and particles.
   Pauses when the body screen is hidden. Reduced motion draws one still frame. Decorative and simulated. */
(function () {
  "use strict";
  const stage = document.querySelector(".stage-col");
  if (!stage) return;
  const cv = document.createElement("canvas");
  cv.id = "body-bg";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block";
  stage.insertBefore(cv, stage.firstChild);
  const ctx = cv.getContext("2d");
  const mk = () => { const c = document.createElement("canvas"); return [c, c.getContext("2d")]; };
  const [st, sx] = mk(), [room, rx] = mk(), [refl, fx] = mk();
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const FONT = "Figtree,'Segoe UI',system-ui,sans-serif", TAU = Math.PI * 2;
  let W = 0, H = 0, DPR = 1, G = null, last = 0, T = 0, beatN = -1, phase = 0, hr = 72;
  const pulses = [], motes = [], bokeh = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 90; i++) motes.push({ x: rnd(), y: rnd(), v: 0.01 + rnd() * 0.04, s: 0.7 + rnd() * 1.7, p: rnd() * 6.28, a: 0.2 + rnd() * 0.5 });
  for (let i = 0; i < 12; i++) bokeh.push({ x: rnd(), y: 0.15 + rnd() * 0.6, r: 5 + rnd() * 16, p: rnd() * 6.28, a: 0.05 + rnd() * 0.08 });

  const rgba = (r, g, b, a) => "rgba(" + r + "," + g + "," + b + "," + a + ")";
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); }
  function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  /* a glowing line: soft halo under a bright core */
  function neon(c, pts, col, w, a) {
    c.lineCap = "round"; c.lineJoin = "round";
    [[w * 5, 0.07], [w * 2.4, 0.16], [w, 0.95]].forEach((k, i) => {
      c.beginPath(); pts.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.strokeStyle = i === 2 ? rgba(215, 247, 255, a) : rgba(col[0], col[1], col[2], k[1] * a);
      c.lineWidth = k[0]; c.stroke();
    });
  }

  /* ---------- geometry: one-point perspective room, vanishing point behind the torso ---------- */
  function geo() {
    const land = W / H > 1.1, D = land ? 2.6 : 2.2, cx = W / 2, vy = H * 0.4;
    const bw = W / D;
    const g = { land, D, cx, vy, bw, x0: cx - bw / 2, x1: cx + bw / 2, y0: vy * (1 - 1 / D), y1: vy + (H - vy) / D };
    g.platY = H * 0.9; g.platRx = Math.min(W * 0.42, H * 0.28); g.platRy = g.platRx * 0.2;
    g.ringY = H * 0.065; g.ringRx = Math.min(W * 0.46, H * 0.22);
    g.leds = [];
    return g;
  }
  const wp = (side, d, h) => { const yt = G.vy - G.vy / d, yb = G.vy + (H - G.vy) / d; return [G.cx + side * G.cx / d, yb + (yt - yb) * h]; };
  /* point on a wall pane: u 0..1 along depth dA→dB, v 0..1 height */
  const pq = (side, dA, dB, u, v) => wp(side, dA + (dB - dA) * u, v);
  const yfloor = (x) => (x < G.x0 ? H + (G.y1 - H) * (x / G.x0) : x > G.x1 ? H + (G.y1 - H) * ((W - x) / (W - G.x1)) : G.y1);

  /* ---------- static room (drawn once per size) ---------- */
  function bed(c, x, y, w, g) {
    const u = (k) => k * w;
    c.save();
    c.lineJoin = "round"; c.lineCap = "round";
    /* floor shadow */
    const sh = c.createRadialGradient(x + u(0.5), y, 2, x + u(0.5), y, u(0.6)); sh.addColorStop(0, "rgba(0,8,20,.7)"); sh.addColorStop(1, "rgba(0,8,20,0)");
    c.save(); c.translate(0, y); c.scale(1, 0.12); c.translate(0, -y); c.fillStyle = sh; c.beginPath(); c.arc(x + u(0.5), y, u(0.6), 0, TAU); c.fill(); c.restore();
    /* wheels + base frame */
    [0.14, 0.86].forEach((k) => { c.fillStyle = "#0a1626"; c.beginPath(); c.arc(x + u(k), y - u(0.03), u(0.03), 0, TAU); c.fill(); c.strokeStyle = "rgba(140,215,255,.7)"; c.lineWidth = 1; c.stroke(); });
    c.fillStyle = lin(c, 0, y - u(0.13), 0, y - u(0.06), [[0, "#35546f"], [1, "#122339"]]); c.fillRect(x + u(0.1), y - u(0.13), u(0.8), u(0.045));
    c.fillRect(x + u(0.14), y - u(0.09), u(0.025), u(0.05)); c.fillRect(x + u(0.84), y - u(0.09), u(0.025), u(0.05));
    /* headboard / footboard */
    rr(c, x + u(0.02), y - u(0.44), u(0.035), u(0.33), 3); c.fillStyle = lin(c, x, 0, x + u(0.06), 0, [[0, "#1d3550"], [1, "#4a6c8c"]]); c.fill(); c.strokeStyle = "rgba(150,225,255,.7)"; c.lineWidth = 1; c.stroke();
    rr(c, x + u(0.935), y - u(0.31), u(0.03), u(0.2), 3); c.fillStyle = "#274562"; c.fill(); c.stroke();
    /* mattress with raised back section */
    poly(c, [[x + u(0.06), y - u(0.13)], [x + u(0.94), y - u(0.13)], [x + u(0.94), y - u(0.2)], [x + u(0.46), y - u(0.2)], [x + u(0.14), y - u(0.31)], [x + u(0.06), y - u(0.27)]]);
    c.fillStyle = lin(c, 0, y - u(0.31), 0, y - u(0.13), [[0, "#b9d4ea"], [0.5, "#6f95b6"], [1, "#2b4a68"]]); c.fill();
    c.strokeStyle = "rgba(190,240,255,.85)"; c.lineWidth = 1.2; c.stroke();
    /* blanket */
    poly(c, [[x + u(0.42), y - u(0.2)], [x + u(0.94), y - u(0.2)], [x + u(0.94), y - u(0.135)], [x + u(0.4), y - u(0.135)]]);
    c.fillStyle = lin(c, x + u(0.4), 0, x + u(0.94), 0, [[0, "rgba(60,150,220,.85)"], [1, "rgba(30,90,160,.85)"]]); c.fill();
    c.strokeStyle = "rgba(200,240,255,.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + u(0.42), y - u(0.2)); c.lineTo(x + u(0.4), y - u(0.135)); c.stroke();
    /* side rail */
    c.strokeStyle = "rgba(190,240,255,.9)"; c.lineWidth = Math.max(1.4, w * 0.012);
    c.beginPath(); c.moveTo(x + u(0.3), y - u(0.34)); c.lineTo(x + u(0.86), y - u(0.34)); c.stroke();
    c.lineWidth = Math.max(1, w * 0.007);
    for (let k = 0; k < 6; k++) { const px = x + u(0.34 + k * 0.1); c.beginPath(); c.moveTo(px, y - u(0.34)); c.lineTo(px, y - u(0.2)); c.stroke(); }
    /* IV pole with two bags and a pump */
    const px = x + u(1.02);
    c.strokeStyle = "rgba(190,230,250,.85)"; c.lineWidth = Math.max(1.4, w * 0.011);
    c.beginPath(); c.moveTo(px, y - u(0.04)); c.lineTo(px, y - u(0.98)); c.moveTo(px - u(0.07), y - u(0.98)); c.lineTo(px + u(0.07), y - u(0.98)); c.stroke();
    [-0.06, 0.06].forEach((o) => { rr(c, px + u(o) - u(0.025), y - u(0.96), u(0.05), u(0.11), 4); c.fillStyle = "rgba(150,225,255,.45)"; c.fill(); c.strokeStyle = "rgba(210,246,255,.8)"; c.lineWidth = 1; c.stroke(); });
    rr(c, px - u(0.05), y - u(0.66), u(0.1), u(0.08), 3); c.fillStyle = "#14304c"; c.fill(); c.strokeStyle = "rgba(150,225,255,.8)"; c.stroke();
    g.leds.push({ x: px, y: y - u(0.62), c: [90, 255, 190], p: 0.8, r: Math.max(1.4, w * 0.012) });
    c.restore();
  }
  function cart(c, x, y, w, g) {
    const u = (k) => k * w;
    c.save(); c.lineJoin = "round"; c.lineCap = "round";
    const sh = c.createRadialGradient(x + u(0.5), y, 2, x + u(0.5), y, u(0.55)); sh.addColorStop(0, "rgba(0,8,20,.7)"); sh.addColorStop(1, "rgba(0,8,20,0)");
    c.save(); c.translate(0, y); c.scale(1, 0.12); c.translate(0, -y); c.fillStyle = sh; c.beginPath(); c.arc(x + u(0.5), y, u(0.55), 0, TAU); c.fill(); c.restore();
    /* base + wheels + pole */
    c.fillStyle = "#16304b"; c.fillRect(x + u(0.12), y - u(0.08), u(0.76), u(0.045)); c.strokeStyle = "rgba(150,225,255,.7)"; c.lineWidth = 1; c.strokeRect(x + u(0.12), y - u(0.08), u(0.76), u(0.045));
    [0.16, 0.84].forEach((k) => { c.fillStyle = "#0a1626"; c.beginPath(); c.arc(x + u(k), y - u(0.02), u(0.03), 0, TAU); c.fill(); c.stroke(); });
    c.fillStyle = lin(c, x + u(0.46), 0, x + u(0.54), 0, [[0, "#223d58"], [0.5, "#8fb0cc"], [1, "#223d58"]]); c.fillRect(x + u(0.46), y - u(0.86), u(0.08), u(0.78));
    /* drawer unit + infusion pumps */
    rr(c, x + u(0.16), y - u(0.52), u(0.68), u(0.3), 5); c.fillStyle = lin(c, 0, y - u(0.52), 0, y - u(0.22), [[0, "#2f5273"], [1, "#122740"]]); c.fill(); c.strokeStyle = "rgba(160,230,255,.75)"; c.stroke();
    c.fillStyle = "rgba(200,240,255,.7)"; c.fillRect(x + u(0.34), y - u(0.4), u(0.32), 2); c.fillRect(x + u(0.34), y - u(0.3), u(0.32), 2);
    for (let k = 0; k < 3; k++) {
      const py = y - u(0.84) + k * u(0.105);
      rr(c, x + u(0.2), py + u(0.0), u(0.6), u(0.085), 3); c.fillStyle = "#0e2339"; c.fill(); c.strokeStyle = "rgba(150,225,255,.75)"; c.stroke();
      c.fillStyle = "rgba(120,215,255,.35)"; c.fillRect(x + u(0.25), py + u(0.02), u(0.22), u(0.045));
      g.leds.push({ x: x + u(0.7), y: py + u(0.042), c: [[90, 255, 190], [90, 210, 255], [255, 200, 90]][k], p: k * 1.9, r: Math.max(1.4, w * 0.012) });
    }
    /* bedside monitor on top */
    const mw = u(0.84), mh = u(0.5), mx = x + u(0.08), my = y - u(1.44);
    rr(c, mx, my, mw, mh, 6); c.fillStyle = "#0b1a2d"; c.fill(); c.strokeStyle = "rgba(160,232,255,.9)"; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = "#031019"; c.fillRect(mx + mw * 0.05, my + mh * 0.08, mw * 0.9, mh * 0.84);
    c.strokeStyle = "rgba(130,255,220,.9)"; c.lineWidth = 1.3; c.beginPath();
    for (let i = 0; i <= 40; i++) { const f = i / 40 * 2.2; const px = mx + mw * 0.08 + i / 40 * mw * 0.84, py = my + mh * 0.36 - ecg(f) * mh * 0.22; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    c.strokeStyle = "rgba(140,210,255,.85)"; c.beginPath();
    for (let i = 0; i <= 40; i++) { const f = i / 40 * 2.2; const px = mx + mw * 0.08 + i / 40 * mw * 0.84, py = my + mh * 0.72 - pleth(f) * mh * 0.15; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    c.fillStyle = "rgba(130,255,220,.9)"; c.font = "700 " + Math.max(7, Math.round(mh * 0.16)) + "px " + FONT; c.fillText("72", mx + mw * 0.78, my + mh * 0.28);
    c.restore();
  }
  function drawRoom(c) {
    const g = G, N = 7, ds = []; for (let k = 0; k <= N; k++) ds.push(1 + (g.D - 1) * k / N);
    seed = 11;
    g.leds = [];

    /* ceiling */
    poly(c, [[0, 0], [W, 0], [g.x1, g.y0], [g.x0, g.y0]]);
    c.fillStyle = lin(c, 0, 0, 0, g.y0, [[0, "#02060f"], [1, "#0b2442"]]); c.fill();
    ds.forEach((d) => { const a = wp(-1, d, 1), b = wp(1, d, 1); neon(c, [a, b], [60, 170, 255], Math.max(1, 2.2 / d), 0.55 / Math.sqrt(d)); });
    [-0.3, 0.3].forEach((o) => {
      const pts = [], pts2 = [];
      for (let k = 0; k <= 24; k++) { const d = 1 + (g.D - 1) * k / 24, y = g.vy - g.vy / d; pts.push([g.cx + (o - 0.07) * g.cx / d, y]); pts2.push([g.cx + (o + 0.07) * g.cx / d, y]); }
      poly(c, pts.concat(pts2.reverse()));
      c.fillStyle = lin(c, 0, 0, 0, g.y0, [[0, "rgba(255,255,255,.95)"], [1, "rgba(150,225,255,.55)"]]); c.fill();
      const bl = c.createRadialGradient(g.cx + o * g.cx * 0.6, g.y0 * 0.4, 4, g.cx + o * g.cx * 0.6, g.y0 * 0.4, g.bw * 0.7);
      bl.addColorStop(0, "rgba(120,210,255,.22)"); bl.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = bl; c.fillRect(0, 0, W, g.y0 * 1.3);
    });

    /* back wall: ICU headwall with a night window either side */
    const bh = g.y1 - g.y0;
    c.fillStyle = lin(c, 0, g.y0, 0, g.y1, [[0, "#04162c"], [0.5, "#0a3b6a"], [1, "#0d4a80"]]); c.fillRect(g.x0, g.y0, g.bw, bh);
    const hz = c.createRadialGradient(g.cx, g.y0 + bh * 0.62, 2, g.cx, g.y0 + bh * 0.62, g.bw * 0.62);
    hz.addColorStop(0, "rgba(140,225,255,.5)"); hz.addColorStop(0.5, "rgba(50,150,230,.2)"); hz.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = hz; c.fillRect(g.x0, g.y0, g.bw, bh);
    [0.1, 0.7].forEach((o) => {
      const wx = g.x0 + g.bw * o, wy = g.y0 + bh * 0.1, ww = g.bw * 0.2, wh = bh * 0.4;
      c.fillStyle = lin(c, 0, wy, 0, wy + wh, [[0, "#06223f"], [1, "#0f5a96"]]); c.fillRect(wx, wy, ww, wh);
      for (let k = 0; k < 14; k++) { c.fillStyle = "rgba(" + (k % 3 ? "255,225,150" : "150,225,255") + "," + (0.25 + rnd() * 0.4) + ")"; c.fillRect(wx + rnd() * (ww - 3), wy + wh * (0.45 + rnd() * 0.5), 1.6 + rnd() * 2, 1.6 + rnd() * 2); }
      c.strokeStyle = "rgba(180,235,255,.65)"; c.lineWidth = 1.2; c.strokeRect(wx, wy, ww, wh);
      c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.stroke();
    });
    /* headwall rail + outlets */
    const ry = g.y0 + bh * 0.66;
    c.fillStyle = "rgba(10,36,66,.75)"; c.fillRect(g.x0, ry, g.bw, g.y1 - ry);
    neon(c, [[g.x0, ry], [g.x1, ry]], [110, 215, 255], 1.4, 0.8);
    for (let k = 0; k < 5; k++) { const ox = g.x0 + g.bw * (0.2 + k * 0.15), os = Math.max(2, g.bw * 0.008);
      rr(c, ox - os, ry + (g.y1 - ry) * 0.2, os * 2, os * 2.4, 2); c.fillStyle = ["#e8f4ff", "#2fd08a", "#ffd24a", "#8aa6c0", "#e8f4ff"][k]; c.globalAlpha = 0.8; c.fill(); c.globalAlpha = 1; }
    c.strokeStyle = "rgba(170,230,255,.5)"; c.lineWidth = 1.5; c.strokeRect(g.x0, g.y0, g.bw, bh);
    neon(c, [[g.x0, g.y1], [g.x1, g.y1]], [90, 200, 255], 1.6, 0.9);

    /* side walls: left = privacy curtain, right = equipment rail wall, glass elsewhere */
    [-1, 1].forEach((side) => {
      for (let k = 0; k < N; k++) {
        const dA = ds[k], dB = ds[k + 1];
        const pane = [wp(side, dA, 0.15), wp(side, dB, 0.15), wp(side, dB, 0.9), wp(side, dA, 0.9)];
        poly(c, pane);
        const xa = pane[0][0], xb = pane[1][0];
        c.fillStyle = lin(c, xa, 0, xb, 0, [[0, "rgba(6,24,46,.92)"], [1, "rgba(14,70,124,.78)"]]); c.fill();
        c.save(); poly(c, pane); c.clip();
        if (side < 0 && k >= 1 && k <= 5) {
          /* privacy curtain: pleated fabric with a ceiling track */
          c.fillStyle = lin(c, xa, 0, xb, 0, [[0, "rgba(70,140,205,.5)"], [1, "rgba(110,185,245,.42)"]]); c.fill();
          for (let j = 0; j <= 10; j++) { const a = pq(side, dA, dB, j / 10, 0.9), b = pq(side, dA, dB, j / 10, 0.2);
            c.strokeStyle = "rgba(" + (j % 2 ? "20,60,110" : "200,238,255") + "," + (j % 2 ? 0.35 : 0.22) + ")"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
        } else if (side > 0 && k >= 1 && k <= 4) {
          /* equipment rail wall: rail, panels, outlets */
          const r0 = pq(side, dA, dB, 0.06, 0.52), r1 = pq(side, dA, dB, 0.94, 0.52);
          neon(c, [r0, r1], [160, 225, 255], 1.1, 0.7);
          c.fillStyle = "rgba(90,200,255,.16)"; poly(c, [pq(side, dA, dB, 0.15, 0.58), pq(side, dA, dB, 0.85, 0.58), pq(side, dA, dB, 0.85, 0.82), pq(side, dA, dB, 0.15, 0.82)]); c.fill();
          c.strokeStyle = "rgba(190,240,255,.45)"; c.lineWidth = 1; c.stroke();
          const o = pq(side, dA, dB, 0.5, 0.36); c.fillStyle = ["#e8f4ff", "#2fd08a", "#ffd24a"][k % 3]; c.globalAlpha = 0.75; c.fillRect(o[0] - 4, o[1] - 4, 8, 8); c.globalAlpha = 1;
        } else if (k % 2 === 1) {
          c.fillStyle = "rgba(90,200,255,.2)"; poly(c, [pq(side, dA, dB, 0.18, 0.5), pq(side, dA, dB, 0.82, 0.5), pq(side, dA, dB, 0.82, 0.78), pq(side, dA, dB, 0.18, 0.78)]); c.fill();
          c.strokeStyle = "rgba(190,240,255,.5)"; c.lineWidth = 1; c.stroke();
        } else {
          c.fillStyle = "rgba(60,150,230,.13)"; poly(c, [pq(side, dA, dB, 0.1, 0.18), pq(side, dA, dB, 0.9, 0.18), pq(side, dA, dB, 0.9, 0.42), pq(side, dA, dB, 0.1, 0.42)]); c.fill();
        }
        c.fillStyle = "rgba(210,240,255,.07)"; poly(c, [wp(side, dA, 0.44), wp(side, dB, 0.44), wp(side, dB, 0.5), wp(side, dA, 0.5)]); c.fill();
        const m0 = pq(side, dA, dB, 0.15, 0.9), m1 = pq(side, dA, dB, 0.55, 0.2);
        const sh = c.createLinearGradient(m0[0], m0[1], m1[0], m1[1]);
        sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.45, "rgba(200,240,255,.17)"); sh.addColorStop(0.62, "rgba(255,255,255,0)");
        c.fillStyle = sh; c.fillRect(0, 0, W, H);
        c.restore();
      }
      poly(c, [wp(side, 1, 0), wp(side, g.D, 0), wp(side, g.D, 0.15), wp(side, 1, 0.15)]);
      c.fillStyle = lin(c, 0, g.y0, 0, H, [[0, "#162b44"], [1, "#050c18"]]); c.fill();
      neon(c, [wp(side, 1, 0.15), wp(side, g.D, 0.15)], [80, 200, 255], 1.6, 0.85);
      poly(c, [wp(side, 1, 0.9), wp(side, g.D, 0.9), wp(side, g.D, 1), wp(side, 1, 1)]);
      c.fillStyle = lin(c, 0, 0, 0, g.y0 * 1.1, [[0, "#09172a"], [1, "#27425f"]]); c.fill();
      neon(c, [wp(side, 1, 0.9), wp(side, g.D, 0.9)], [80, 200, 255], 1.4, 0.8);
      ds.forEach((d) => {
        const a = wp(side, d, 0.15), b = wp(side, d, 0.9), w = Math.max(2.5, 11 / d);
        c.fillStyle = lin(c, a[0] - w / 2, 0, a[0] + w / 2, 0, [[0, "#1e3550"], [0.35, "#9db8d1"], [0.55, "#e6f2fb"], [1, "#2a4562"]]);
        c.fillRect(a[0] - w / 2, b[1], w, a[1] - b[1]);
        c.fillStyle = "rgba(120,225,255,.95)"; c.fillRect(a[0] + (side < 0 ? w / 2 : -w / 2 - 1.2), b[1], 1.2, a[1] - b[1]);
      });
    });
    const ex = pq(-1, ds[3], ds[4], 0.5, 0.96); c.fillStyle = "rgba(90,255,190,.9)"; c.fillRect(ex[0] - 12, ex[1] - 4, 24, 8);

    /* the bed (left) and the monitor cart (right), standing on the floor */
    const bw0 = g.land ? W * 0.22 : W * 0.4, bx = g.land ? W * 0.07 : -W * 0.06;
    bed(c, bx, Math.max(H * (g.land ? 0.86 : 0.78), yfloor(bx + bw0 * 0.5) + H * 0.035), bw0, g);
    const cw0 = g.land ? W * 0.12 : W * 0.2, cx0 = g.land ? W * 0.8 : W * 0.78;
    cart(c, cx0, Math.max(H * 0.78, yfloor(cx0 + cw0 * 0.5) + H * 0.035), cw0, g);
  }


  /* ---------- composed static layer: floor, reflections, room ---------- */
  function drawStatic() {
    const g = G;
    seed = 11;
    rx.setTransform(DPR, 0, 0, DPR, 0, 0); rx.clearRect(0, 0, W, H); drawRoom(rx);

    const c = sx; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.fillStyle = "#010409"; c.fillRect(0, 0, W, H);
    /* floor body: glossy blue, brightest toward the far wall */
    poly(c, [[0, H], [g.x0, g.y1], [g.x1, g.y1], [W, H]]);
    c.fillStyle = lin(c, 0, g.y1, 0, H, [[0, "#1c6fb8"], [0.18, "#0f4a86"], [0.6, "#062a52"], [1, "#020d1c"]]); c.fill();
    /* reflections of the walls: mirror each column about the floor line */
    fx.setTransform(DPR, 0, 0, DPR, 0, 0); fx.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x += 2) {
      const fy = yfloor(x + 1), hh = Math.min(H - fy, fy);
      if (hh < 2) continue;
      fx.save(); fx.translate(x, fy); fx.scale(1, -1);
      fx.drawImage(room, x * DPR, (fy - hh) * DPR, 2 * DPR, hh * DPR, 0, -hh, 2, hh);
      fx.restore();
    }
    fx.setTransform(1, 0, 0, 1, 0, 0); fx.globalCompositeOperation = "destination-in";
    fx.fillStyle = lin(fx, 0, g.y1 * DPR, 0, H * DPR, [[0, "rgba(0,0,0,.9)"], [0.45, "rgba(0,0,0,.35)"], [1, "rgba(0,0,0,0)"]]); fx.fillRect(0, 0, refl.width, refl.height);
    fx.globalCompositeOperation = "source-over";
    c.drawImage(refl, 0, 0, W, H);
    /* perspective tile grid */
    c.save(); poly(c, [[0, H], [g.x0, g.y1], [g.x1, g.y1], [W, H]]); c.clip();
    c.lineWidth = 1;
    for (let i = -14; i <= 14; i++) {
      c.strokeStyle = "rgba(120,205,255," + (0.22 - Math.abs(i) * 0.008) + ")";
      c.beginPath(); c.moveTo(g.cx + i * g.bw / 11, g.y1); c.lineTo(g.cx + i * W / 5.2, H + 4); c.stroke();
    }
    for (let k = 0; k <= 16; k++) {
      const d = 1 + (g.D - 1) * Math.pow(k / 16, 1.35), y = g.vy + (H - g.vy) / d;
      c.strokeStyle = "rgba(140,215,255," + (0.07 + 0.2 * (1 - k / 16)) + ")";
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    /* soft sheen across the far floor */
    let q = c.createRadialGradient(g.cx, g.y1 + 6, 4, g.cx, g.y1 + 6, g.bw * 0.9);
    q.addColorStop(0, "rgba(120,215,255,.4)"); q.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = q; c.fillRect(0, g.y1, W, H - g.y1);
    c.restore();
    /* floor edge light strips */
    [-1, 1].forEach((s) => neon(c, [wp(s, 1, 0), wp(s, g.D, 0)], [70, 190, 255], 1.8, 0.8));
    c.drawImage(room, 0, 0, W, H);
    /* depth vignette */
    q = c.createRadialGradient(g.cx, H * 0.44, H * 0.28, g.cx, H * 0.46, H * 0.95);
    q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,3,10,.6)");
    c.fillStyle = q; c.fillRect(0, 0, W, H);
  }

  /* ---------- live layer ---------- */
  const gauss = (x, m, w, a) => a * Math.exp(-Math.pow((x - m) / w, 2));
  function ecg(f) { f = f - Math.floor(f); return gauss(f, 0.13, 0.035, 0.13) + gauss(f, 0.27, 0.011, -0.1) + gauss(f, 0.3, 0.009, 1) + gauss(f, 0.335, 0.012, -0.22) + gauss(f, 0.54, 0.06, 0.3); }
  function pleth(f) { f = f - Math.floor(f); return gauss(f, 0.25, 0.1, 1) + gauss(f, 0.55, 0.08, 0.28); }
  /* rolling trace driven by the live cardiac phase, so the rhythm follows the displayed heart rate */
  function trace(x, y, w, h, off, win, fn, color, lw, amp, dot) {
    const n = Math.max(20, Math.round(w / 2.4)); let lx = x, ly = y;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const v = fn(phase + off - (1 - i / n) * win * hr / 60), px = x + (i / n) * w, py = y + h * 0.78 - v * h * amp; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); lx = px; ly = py; }
    ctx.lineJoin = "round";
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.25); ctx.lineWidth = lw * 3; ctx.stroke();
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.95); ctx.lineWidth = lw; ctx.stroke();
    if (dot) { const q = ctx.createRadialGradient(lx, ly, 0, lx, ly, lw * 5); q.addColorStop(0, "rgba(255,255,255,.95)"); q.addColorStop(1, rgba(color[0], color[1], color[2], 0)); ctx.fillStyle = q; ctx.beginPath(); ctx.arc(lx, ly, lw * 5, 0, TAU); ctx.fill(); }
  }

  /* subtle electric-blue aura that follows the body outline (drawn behind the model) */
  function aura(beat) {
    const g = G, c = ctx, u = H, a = 0.1 + 0.07 * beat;
    c.save(); c.globalCompositeOperation = "lighter";
    const blob = (x, y, rx, ry, al) => {
      c.save(); c.translate(x, y); c.scale(1, ry / rx);
      const q = c.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
      q.addColorStop(0, rgba(70, 175, 255, al)); q.addColorStop(0.6, rgba(40, 120, 235, al * 0.4)); q.addColorStop(1, "rgba(20,70,200,0)");
      c.fillStyle = q; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
    };
    blob(g.cx, u * 0.5, u * 0.32, u * 0.55, a * 0.7);              /* wide field */
    blob(g.cx, u * 0.125, u * 0.1, u * 0.1, a * 1.4);               /* head */
    blob(g.cx, u * 0.34, u * 0.13, u * 0.2, a * 1.5);               /* torso */
    blob(g.cx - u * 0.05, u * 0.7, u * 0.07, u * 0.24, a * 1.2);    /* legs */
    blob(g.cx + u * 0.05, u * 0.7, u * 0.07, u * 0.24, a * 1.2);
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 6; i++) { const t = i / 5; blob(g.cx + s * u * (0.09 + 0.12 * t), u * (0.22 + 0.24 * t), u * 0.06, u * 0.06, a * 1.1); }
    c.restore();
    /* hologram column: a faint vertical light field with edge lines */
    const cw = u * 0.2;
    const q = lin(c, g.cx - cw, 0, g.cx + cw, 0, [[0, "rgba(90,190,255,0)"], [0.5, rgba(110, 205, 255, 0.07 + 0.04 * beat)], [1, "rgba(90,190,255,0)"]]);
    c.fillStyle = q; c.fillRect(g.cx - cw, u * 0.05, cw * 2, g.platY - u * 0.05);
  }

  function beams(beat) {
    const g = G, c = ctx;
    c.save(); c.globalCompositeOperation = "lighter";
    [[-1, 0.3, 0], [1, 0.3, 2.1], [0, 0.0, 4.2]].forEach((b) => {
      const sway = Math.sin(T * 0.3 + b[2]) * W * 0.03, tx = g.cx + b[0] * g.cx * 0.3 + sway, bx = g.cx + b[0] * W * 0.24 + sway * 1.6, bw0 = b[0] === 0 ? W * 0.05 : W * 0.035;
      [[2.4, 0.32], [1.5, 0.45], [0.7, 0.7]].forEach((L) => {
        const q = lin(c, tx, 0, bx, g.platY, [[0, rgba(160, 225, 255, (0.11 + 0.05 * beat) * L[1])], [0.55, rgba(80, 170, 255, 0.04 * L[1])], [1, "rgba(60,150,255,0)"]]);
        c.fillStyle = q; c.beginPath(); c.moveTo(tx - bw0 * 0.3 * L[0], 0); c.lineTo(tx + bw0 * 0.3 * L[0], 0); c.lineTo(bx + bw0 * 1.5 * L[0], g.platY); c.lineTo(bx - bw0 * 1.5 * L[0], g.platY); c.closePath(); c.fill();
      });
    });
    c.restore();
  }

  function overheadRing(beat) {
    const g = G, c = ctx;
    const q = c.createRadialGradient(g.cx, g.ringY, 4, g.cx, g.ringY, g.ringRx * 1.3);
    q.addColorStop(0, rgba(180, 240, 255, 0.32 + 0.22 * beat)); q.addColorStop(0.4, "rgba(80,180,255,.11)"); q.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = q; c.fillRect(0, 0, W, H * 0.28);
    for (let k = 0; k < 4; k++) {
      const rx0 = g.ringRx * (1 - k * 0.18), ry = rx0 * 0.22;
      c.beginPath(); c.ellipse(g.cx, g.ringY, rx0, ry, 0, 0, TAU);
      c.strokeStyle = rgba(120, 210, 255, 0.16 + 0.1 * beat); c.lineWidth = k === 0 ? 9 : 4; c.stroke();
      c.strokeStyle = rgba(210, 245, 255, k === 0 ? 0.85 : 0.4); c.lineWidth = k === 0 ? 1.8 : 1; c.stroke();
    }
    c.save(); c.setLineDash([18, 14]); c.lineDashOffset = -T * 40;
    c.beginPath(); c.ellipse(g.cx, g.ringY, g.ringRx * 0.72, g.ringRx * 0.16, 0, 0, TAU);
    c.strokeStyle = "rgba(160,230,255,.75)"; c.lineWidth = 1.5; c.stroke(); c.restore();
  }

  /* two scan rings glide up and down the body field */
  function scanRings(beat) {
    const g = G, c = ctx, top = H * 0.1, bot = g.platY - H * 0.02;
    for (let k = 0; k < 2; k++) {
      const ph = ((T * 0.16 + k * 0.5) % 1), tri = ph < 0.5 ? ph * 2 : 2 - ph * 2, y = bot - (bot - top) * (0.5 - 0.5 * Math.cos(Math.PI * tri));
      const al = Math.sin(Math.PI * tri) * 0.9, rx0 = H * (0.2 + 0.015 * k), ry = rx0 * 0.17;
      c.save(); c.globalCompositeOperation = "lighter";
      const f = c.createRadialGradient(g.cx, y, 2, g.cx, y, rx0);
      f.addColorStop(0, rgba(90, 190, 255, 0.0)); f.addColorStop(0.8, rgba(90, 190, 255, 0.07 * al)); f.addColorStop(1, "rgba(90,190,255,0)");
      c.save(); c.translate(0, y); c.scale(1, ry / rx0); c.translate(0, -y); c.fillStyle = f; c.beginPath(); c.arc(g.cx, y, rx0, 0, TAU); c.fill(); c.restore();
      c.beginPath(); c.ellipse(g.cx, y, rx0, ry, 0, 0, TAU);
      c.strokeStyle = rgba(110, 205, 255, 0.22 * al + 0.04); c.lineWidth = 7; c.stroke();
      c.strokeStyle = rgba(215, 247, 255, 0.85 * al); c.lineWidth = 1.5; c.stroke();
      c.restore();
    }
  }

  function platform(beat) {
    const g = G, c = ctx, cx = g.cx, y = g.platY;
    c.save(); c.translate(cx, y); c.scale(1, g.platRy / g.platRx); c.translate(-cx, -y);
    const q = c.createRadialGradient(cx, y, 4, cx, y, g.platRx);
    q.addColorStop(0, rgba(170, 235, 255, 0.55 + 0.3 * beat)); q.addColorStop(0.45, "rgba(40,140,230,.28)"); q.addColorStop(1, "rgba(10,40,90,0)");
    c.fillStyle = q; c.beginPath(); c.arc(cx, y, g.platRx, 0, TAU); c.fill();
    [[1, 2.2, 0.9], [0.78, 1.4, 0.55], [0.55, 1.1, 0.4]].forEach((r) => { c.beginPath(); c.arc(cx, y, g.platRx * r[0], 0, TAU); c.strokeStyle = rgba(170, 230, 255, r[2] * (0.7 + 0.3 * beat)); c.lineWidth = r[1]; c.stroke(); });
    c.setLineDash([22, 16]); c.lineDashOffset = T * 48;
    c.beginPath(); c.arc(cx, y, g.platRx * 0.86, 0, TAU); c.strokeStyle = "rgba(210,245,255,.85)"; c.lineWidth = 1.6; c.stroke(); c.setLineDash([]);
    pulses.forEach((p) => { const u = (T - p) / 1.4; if (u < 0 || u > 1) return; c.beginPath(); c.arc(cx, y, g.platRx * (0.25 + 0.8 * u), 0, TAU); c.strokeStyle = rgba(200, 245, 255, 0.8 * (1 - u)); c.lineWidth = 3 * (1 - u) + 0.6; c.stroke(); });
    c.restore();
  }

  /* gantry bore, instrument LEDs and the portal ring behind the torso */
  function distant(beat) {
    const g = G, c = ctx;
    if (g.ct) {
      c.save(); c.setLineDash([9, 7]); c.lineDashOffset = -T * 30;
      c.beginPath(); c.arc(g.ct.x, g.ct.y, g.ct.r * 0.95, 0, TAU); c.strokeStyle = "rgba(150,235,255,.9)"; c.lineWidth = 1.6; c.stroke(); c.restore();
      const sw = c.createRadialGradient(g.ct.x, g.ct.y, 0, g.ct.x, g.ct.y, g.ct.r * 0.9);
      sw.addColorStop(0, rgba(120, 220, 255, 0.2 + 0.15 * Math.sin(T * 2.2))); sw.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = sw; c.beginPath(); c.arc(g.ct.x, g.ct.y, g.ct.r * 0.9, 0, TAU); c.fill();
    }
    g.leds.forEach((l) => { const a = 0.35 + 0.65 * Math.max(0, Math.sin(T * 1.7 + l.p)); c.fillStyle = rgba(l.c[0], l.c[1], l.c[2], a); c.beginPath(); c.arc(l.x, l.y, l.r, 0, TAU); c.fill(); });
    /* portal ring on the back wall */
    const py = g.y0 + (g.y1 - g.y0) * 0.5, pr = (g.y1 - g.y0) * 0.36;
    c.save(); c.setLineDash([26, 12]); c.lineDashOffset = T * 20;
    c.beginPath(); c.arc(g.cx, py, pr, 0, TAU); c.strokeStyle = rgba(150, 230, 255, 0.35 + 0.2 * beat); c.lineWidth = 1.6; c.stroke();
    c.setLineDash([4, 10]); c.lineDashOffset = -T * 30; c.beginPath(); c.arc(g.cx, py, pr * 0.8, 0, TAU); c.strokeStyle = "rgba(150,230,255,.3)"; c.stroke(); c.restore();
  }

  function motesDraw(dt) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    bokeh.forEach((b) => {
      const x = (b.x + Math.sin(T * 0.12 + b.p) * 0.03) * W, y = (b.y + Math.cos(T * 0.1 + b.p) * 0.02) * H, a = b.a * (0.6 + 0.4 * Math.sin(T * 0.8 + b.p));
      const q = ctx.createRadialGradient(x, y, 0, x, y, b.r); q.addColorStop(0, rgba(140, 220, 255, a)); q.addColorStop(1, "rgba(140,220,255,0)");
      ctx.fillStyle = q; ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
    });
    motes.forEach((m) => {
      if (!reduce) { m.y -= m.v * dt; if (m.y < -0.02) { m.y = 1.02; m.x = rnd(); } }
      const x = (m.x + Math.sin(T * 0.35 + m.p) * 0.01) * W, y = m.y * H, a = m.a * (0.45 + 0.55 * Math.sin(T * 1.4 + m.p));
      ctx.fillStyle = rgba(190, 235, 255, a); ctx.fillRect(x, y, m.s, m.s);
    });
    ctx.restore();
  }

  /* ---------- floating transparent HUD panels ---------- */
  function holoPanel(x, y, w, h, title, hot) {
    const c = ctx; c.save();
    rr(c, x, y, w, h, 8); c.fillStyle = "rgba(4,24,48,.42)"; c.fill();
    c.fillStyle = lin(c, x, y, x, y + h, [[0, "rgba(120,210,255,.2)"], [1, "rgba(20,60,110,.04)"]]); c.fill();
    c.strokeStyle = rgba(140, 220, 255, 0.4 + 0.3 * hot); c.lineWidth = 1.1; c.stroke();
    c.strokeStyle = "rgba(225,249,255,.9)"; c.lineWidth = 1.5;
    [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].forEach((k) => { const px = x + k[0] * w, py = y + k[1] * h; c.beginPath(); c.moveTo(px + k[2] * 11, py); c.lineTo(px, py); c.lineTo(px, py + k[3] * 11); c.stroke(); });
    const fs = Math.max(9, Math.round(w * 0.07));
    c.fillStyle = "rgba(150,230,255,.85)"; c.font = "700 " + fs + "px " + FONT; c.textBaseline = "alphabetic"; c.fillText(title, x + 10, y + fs + 6);
    c.fillStyle = "rgba(150,230,255,.25)"; c.fillRect(x + 8, y + fs + 11, w - 16, 1);
    const sy = y + ((T * 0.15) % 1) * h, s = c.createLinearGradient(0, sy - 10, 0, sy + 10);
    s.addColorStop(0, "rgba(180,240,255,0)"); s.addColorStop(0.5, "rgba(180,240,255,.15)"); s.addColorStop(1, "rgba(180,240,255,0)");
    c.fillStyle = s; c.fillRect(x + 2, Math.max(y, sy - 10), w - 4, 20);
    c.restore();
    return fs;
  }
  function ringGauge(cx, cy, r, v, col, label) {
    const c = ctx; c.save(); c.lineWidth = Math.max(2, r * 0.16); c.lineCap = "round";
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.strokeStyle = "rgba(120,200,255,.18)"; c.stroke();
    c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * v); c.strokeStyle = rgba(col[0], col[1], col[2], 0.95); c.stroke();
    c.setLineDash([2, 5]); c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r * 1.3, T * 0.8, T * 0.8 + TAU * 0.8); c.strokeStyle = "rgba(180,240,255,.5)"; c.stroke(); c.setLineDash([]);
    c.fillStyle = "rgba(225,249,255,.95)"; c.font = "700 " + Math.round(r * 0.62) + "px " + FONT; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, cx, cy + 1); c.restore();
  }
  /* vitals drift like a real monitor: smooth slow wander, shown once a second */
  const VIT = { hr: 72, sbp: 120, dbp: 76, map: 91, rr: 16, spo2: 98 };
  const wander = (t) => ({
    hr: 73 + 5 * Math.sin(t * 0.19) + 2.5 * Math.sin(t * 0.53 + 1.3) + 1.2 * Math.sin(t * 1.7),
    sbp: 121 + 6 * Math.sin(t * 0.13 + 0.5) + 3 * Math.sin(t * 0.41),
    dbp: 76 + 4 * Math.sin(t * 0.17 + 2) + 2 * Math.sin(t * 0.37),
    rr: 16 + 1.6 * Math.sin(t * 0.11) + 0.8 * Math.sin(t * 0.29 + 1),
    spo2: 97.4 + 0.9 * Math.sin(t * 0.09) + 0.5 * Math.sin(t * 0.31 + 2)
  });
  function vitalsUpdate() {
    hr = wander(T).hr;                       /* the ECG rate follows this continuously */
    const v = wander(Math.floor(T));         /* the numbers refresh once a second */
    VIT.hr = Math.round(v.hr); VIT.sbp = Math.round(v.sbp); VIT.dbp = Math.round(v.dbp);
    VIT.map = Math.round((v.sbp + 2 * v.dbp) / 3); VIT.rr = Math.round(v.rr); VIT.spo2 = Math.min(99, Math.max(95, Math.round(v.spo2)));
  }
  function heartIcon(cx, cy, s, col, a) {
    const c = ctx; c.beginPath(); c.moveTo(cx, cy + s * 0.9);
    c.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
    c.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9);
    c.fillStyle = rgba(col[0], col[1], col[2], a); c.fill();
  }
  function rowIcon(kind, cx, cy, s, col, beat) {
    const c = ctx; c.save(); c.strokeStyle = rgba(col[0], col[1], col[2], 0.95); c.fillStyle = rgba(col[0], col[1], col[2], 0.95); c.lineWidth = Math.max(1.2, s * 0.16); c.lineCap = "round";
    if (kind === "hr") heartIcon(cx, cy, s * (0.8 + 0.28 * beat), col, 0.55 + 0.45 * beat);
    else if (kind === "bp") { c.beginPath(); c.arc(cx, cy + s * 0.15, s * 0.85, Math.PI * 0.85, Math.PI * 2.15); c.stroke(); c.beginPath(); c.moveTo(cx, cy + s * 0.15); c.lineTo(cx + s * 0.5 * Math.cos(-0.9 + 0.4 * Math.sin(T * 0.8)), cy + s * 0.15 + s * 0.5 * Math.sin(-0.9 + 0.4 * Math.sin(T * 0.8))); c.stroke(); }
    else if (kind === "rr") { c.beginPath(); for (let i = 0; i <= 12; i++) { const px = cx - s + i / 12 * s * 2, py = cy + Math.sin(i / 12 * TAU * 1.5 - T * 2) * s * 0.45; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
    else { c.beginPath(); c.moveTo(cx, cy - s * 0.95); c.bezierCurveTo(cx + s * 0.9, cy + s * 0.1, cx + s * 0.7, cy + s * 0.95, cx, cy + s * 0.95); c.bezierCurveTo(cx - s * 0.7, cy + s * 0.95, cx - s * 0.9, cy + s * 0.1, cx, cy - s * 0.95); c.fill(); }
    c.restore();
  }
  function vitalsPanel(x, y, w, h, beat) {
    const c = ctx, fs = holoPanel(x, y, w, h, "VITALS", beat), pad = Math.max(8, w * 0.07);
    /* live dot */
    c.fillStyle = rgba(255, 90, 90, 0.5 + 0.5 * Math.max(0, Math.sin(T * 4))); c.beginPath(); c.arc(x + w - pad - 2, y + fs * 0.9 + 3, 2.6, 0, TAU); c.fill();
    c.fillStyle = "rgba(255,170,170,.8)"; c.font = "700 " + Math.max(7, Math.round(fs * 0.8)) + "px " + FONT; c.textAlign = "right"; c.textBaseline = "alphabetic"; c.fillText("LIVE", x + w - pad - 8, y + fs + 4);
    /* ECG strip */
    const ey = y + fs + 16, eh = h * 0.19;
    c.fillStyle = "rgba(2,16,30,.55)"; c.fillRect(x + pad - 2, ey, w - pad * 2 + 4, eh);
    c.strokeStyle = "rgba(120,220,255,.12)"; c.lineWidth = 1;
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + pad - 2, ey + eh * k / 4); c.lineTo(x + w - pad + 2, ey + eh * k / 4); c.stroke(); }
    for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(x + pad - 2 + (w - pad * 2 + 4) * k / 8, ey); c.lineTo(x + pad - 2 + (w - pad * 2 + 4) * k / 8, ey + eh); c.stroke(); }
    c.save(); c.beginPath(); c.rect(x + pad - 2, ey, w - pad * 2 + 4, eh); c.clip();
    trace(x + pad, ey + eh * 0.12, w - pad * 2, eh * 0.9, 0, 2.6, ecg, [130, 255, 220], 1.5, 0.85, true);
    c.restore();
    /* numeric rows */
    const top = ey + eh + 6, rh = (y + h - 6 - top) / 4, lf = Math.max(8, Math.round(rh * 0.2)), vf = Math.round(rh * 0.5);
    const rows = [
      ["hr", "HR", "bpm", String(VIT.hr), [120, 255, 170]],
      ["bp", "BP", "MAP " + VIT.map, VIT.sbp + "/" + VIT.dbp, [130, 215, 255]],
      ["rr", "RESP", "/min", String(VIT.rr), [150, 230, 255]],
      ["o2", "SpO₂", "%", String(VIT.spo2), [210, 240, 255]]
    ];
    rows.forEach((r, i) => {
      const ry = top + i * rh, col = r[4];
      c.fillStyle = "rgba(150,230,255,.18)"; c.fillRect(x + pad, ry, w - pad * 2, 1);
      rowIcon(r[0], x + pad + lf * 0.6, ry + rh * 0.3, lf * 0.55, col, i === 0 ? beat : 0);
      c.textAlign = "left"; c.fillStyle = "rgba(160,232,255,.8)"; c.font = "700 " + lf + "px " + FONT; c.fillText(r[1], x + pad + lf * 1.7, ry + rh * 0.3 + lf * 0.35);
      /* unit sits right after the label on narrow (portrait) panels so the 3D body never hides it */
      const lw = c.measureText(r[1]).width; c.fillStyle = "rgba(160,232,255,.55)"; c.font = "600 " + Math.max(7, lf - 1) + "px " + FONT;
      if (w < 200) c.fillText(r[2], x + pad + lf * 1.7 + lw + 5, ry + rh * 0.3 + lf * 0.35);
      else { c.textAlign = "right"; c.fillText(r[2], x + w - pad, ry + rh * 0.3 + lf * 0.35); c.textAlign = "left"; }
      c.textAlign = "left"; c.fillStyle = rgba(col[0], col[1], col[2], 1); c.shadowColor = rgba(col[0], col[1], col[2], 0.7); c.shadowBlur = 8;
      c.font = "700 " + vf + "px " + FONT; c.fillText(r[3], x + pad, ry + rh * 0.93); c.shadowBlur = 0;
    });
  }
  /* AP chest/whole-body skeleton drawn as an X-ray film with a moving scan line */
  function skeletonPanel(x, y, w, h, beat) {
    const c = ctx, fs = holoPanel(x, y, w, h, "SKELETON", 0.3), pad = Math.max(8, w * 0.07);
    const fy = y + fs + 14, fh = y + h - 8 - fy, fx0 = x + pad - 2, fw = w - pad * 2 + 4;
    c.fillStyle = lin(c, 0, fy, 0, fy + fh, [[0, "rgba(6,28,56,.85)"], [1, "rgba(3,14,30,.85)"]]); c.fillRect(fx0, fy, fw, fh);
    c.strokeStyle = "rgba(140,220,255,.25)"; c.lineWidth = 1; c.strokeRect(fx0, fy, fw, fh);
    const S = Math.min(fh * 0.94, fw * 2.6), ox = fx0 + fw / 2, oy = fy + fh * 0.03;
    const P = (nx, ny) => [ox + nx * S, oy + ny * S];
    const line = (pts, a, wd) => { c.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.strokeStyle = rgba(150, 215, 255, 0.22 * a); c.lineWidth = wd * 3.2; c.stroke(); c.strokeStyle = rgba(222, 247, 255, 0.92 * a); c.lineWidth = wd; c.stroke(); };
    const wd = Math.max(1.1, S * 0.006);
    c.save(); c.beginPath(); c.rect(fx0, fy, fw, fh); c.clip(); c.lineCap = "round"; c.lineJoin = "round";
    /* skull + jaw */
    let q = P(0, 0.062); c.beginPath(); c.ellipse(q[0], q[1], S * 0.047, S * 0.052, 0, 0, TAU); c.strokeStyle = "rgba(150,215,255,.25)"; c.lineWidth = wd * 3.2; c.stroke(); c.strokeStyle = "rgba(222,247,255,.92)"; c.lineWidth = wd; c.stroke();
    [-1, 1].forEach((s) => { const e = P(s * 0.017, 0.062); c.beginPath(); c.ellipse(e[0], e[1], S * 0.011, S * 0.009, 0, 0, TAU); c.stroke(); });
    line([[-0.034, 0.093], [-0.018, 0.118], [0.018, 0.118], [0.034, 0.093]], 1, wd);
    /* spine */
    for (let i = 0; i < 24; i++) { const ny = 0.125 + i * 0.0155, wv = 0.011 + (i > 17 ? 0.004 : 0) + (i < 7 ? -0.002 : 0); const a = P(-wv, ny), b = P(wv, ny); c.strokeStyle = "rgba(222,247,255,.85)"; c.lineWidth = Math.max(1.2, S * 0.008); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    /* clavicles, scapula hints, sternum */
    [-1, 1].forEach((s) => {
      line([[0.008 * s, 0.168], [0.05 * s, 0.17], [0.11 * s, 0.19]], 1, wd);
      line([[0.12 * s, 0.2], [0.14 * s, 0.24], [0.115 * s, 0.285], [0.092 * s, 0.25]], 0.55, wd * 0.8);
    });
    line([[0, 0.178], [0, 0.31]], 1, wd * 1.5); line([[-0.012, 0.18], [0.012, 0.18]], 1, wd);
    /* ribs */
    for (let i = 0; i < 9; i++) {
      [-1, 1].forEach((s) => {
        const y0 = 0.19 + i * 0.0225, e = 0.105 - Math.abs(i - 3) * 0.005 - (i > 6 ? 0.012 * (i - 6) : 0);
        c.beginPath(); const a = P(0.012 * s, y0 + 0.004); c.moveTo(a[0], a[1]);
        let b = P(0.06 * s, y0 - 0.02), cc = P(e * s, y0 - 0.004), d = P((e - 0.008) * s, y0 + 0.032); c.bezierCurveTo(b[0], b[1], cc[0], cc[1], d[0], d[1]);
        if (i < 7) { b = P((e - 0.025) * s, y0 + 0.07); cc = P(0.025 * s, y0 + 0.06 + i * 0.0012); c.quadraticCurveTo(b[0], b[1], cc[0], cc[1]); }
        c.strokeStyle = "rgba(150,215,255,.22)"; c.lineWidth = wd * 3; c.stroke(); c.strokeStyle = "rgba(222,247,255," + (0.9 - i * 0.04) + ")"; c.lineWidth = wd * 0.9; c.stroke();
      });
    }
    /* pelvis + sacrum */
    [-1, 1].forEach((s) => {
      c.beginPath(); let a = P(0.015 * s, 0.47); c.moveTo(a[0], a[1]);
      let b = P(0.125 * s, 0.445), d = P(0.125 * s, 0.525); c.quadraticCurveTo(b[0], b[1], d[0], d[1]);
      b = P(0.105 * s, 0.575); d = P(0.045 * s, 0.565); c.quadraticCurveTo(b[0], b[1], d[0], d[1]);
      d = P(0.022 * s, 0.525); c.lineTo(d[0], d[1]); d = P(0.015 * s, 0.47); c.lineTo(d[0], d[1]);
      c.strokeStyle = "rgba(150,215,255,.22)"; c.lineWidth = wd * 3; c.stroke(); c.strokeStyle = "rgba(222,247,255,.92)"; c.lineWidth = wd; c.stroke();
      const o = P(0.047 * s, 0.585); c.beginPath(); c.ellipse(o[0], o[1], S * 0.014, S * 0.02, 0, 0, TAU); c.stroke();
    });
    line([[-0.02, 0.49], [0, 0.565], [0.02, 0.49]], 0.9, wd);
    /* limbs: humerus, forearm, femur, tibia, with joint heads */
    [-1, 1].forEach((s) => {
      line([[0.128 * s, 0.2], [0.165 * s, 0.375]], 1, wd * 1.6);
      line([[0.168 * s, 0.385], [0.2 * s, 0.53]], 1, wd * 1.2); line([[0.158 * s, 0.385], [0.178 * s, 0.53]], 0.7, wd);
      line([[0.2 * s, 0.54], [0.215 * s, 0.575], [0.2 * s, 0.6]], 0.7, wd * 0.8); line([[0.19 * s, 0.54], [0.185 * s, 0.585]], 0.7, wd * 0.8);
      line([[0.065 * s, 0.57], [0.085 * s, 0.775]], 1, wd * 1.8);
      line([[0.085 * s, 0.79], [0.075 * s, 0.945]], 1, wd * 1.3); line([[0.098 * s, 0.79], [0.092 * s, 0.94]], 0.7, wd);
      line([[0.07 * s, 0.95], [0.1 * s, 0.975], [0.11 * s, 0.99]], 0.8, wd);
      [[0.128, 0.195, 0.014], [0.065, 0.565, 0.02], [0.085, 0.782, 0.016], [0.168, 0.38, 0.011]].forEach((j) => { const e = P(j[0] * s, j[1]); c.beginPath(); c.arc(e[0], e[1], S * j[2], 0, TAU); c.strokeStyle = "rgba(222,247,255,.85)"; c.lineWidth = wd; c.stroke(); });
    });
    /* beating-heart shadow in the chest: a faint pulse behind the ribs */
    const hp = P(-0.02, 0.27), hg = c.createRadialGradient(hp[0], hp[1], 1, hp[0], hp[1], S * 0.07);
    hg.addColorStop(0, rgba(255, 120, 140, 0.16 + 0.22 * beat)); hg.addColorStop(1, "rgba(255,120,140,0)"); c.fillStyle = hg; c.beginPath(); c.arc(hp[0], hp[1], S * 0.08, 0, TAU); c.fill();
    c.restore();
    c.fillStyle = "rgba(160,232,255,.7)"; c.font = "700 " + Math.max(8, Math.round(fs * 0.9)) + "px " + FONT; c.textAlign = "left"; c.textBaseline = "alphabetic";
    c.fillText("R", fx0 + 4, fy + fh - 5); c.textAlign = "right"; c.fillText("L", fx0 + fw - 4, fy + fh - 5);
  }
  function hud(beat) {
    const g = G, c = ctx;
    let w, h, y, lx, rx0;
    if (g.land) { w = Math.min(W * 0.205, 270); h = Math.min(H * 0.57, w * 1.5); y = H * 0.14; lx = W * 0.03; rx0 = W - w - lx; }
    else { w = Math.min(W * 0.335, 160); h = Math.min(H * 0.44, w * 2.55); y = H * 0.14; lx = Math.max(6, W * 0.02); rx0 = W - w - lx; }
    vitalsPanel(lx, y, w, h, beat);
    skeletonPanel(rx0, y, w, h, beat);
    c.textAlign = "left"; c.textBaseline = "alphabetic";
  }

  /* ---------- loop ---------- */
  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === W && h === H && cv.width === Math.round(w * DPR)) return;
    W = w; H = h;
    [cv, st, room, refl].forEach((k) => { k.width = Math.round(W * DPR); k.height = Math.round(H * DPR); });
    G = geo(); drawStatic();
  }
  const body = document.body;
  function active() { return !document.hidden && body.classList.contains("body-only") && !body.classList.contains("in") && !body.classList.contains("icu-open") && !body.classList.contains("icu-gate"); }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!active()) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.033;
    if (reduce ? (now - last < 1000 && last) : (now - last < 28 && last)) return;
    last = now; T += dt;
    resize();
    if (!G) return;
    vitalsUpdate();
    phase += dt * hr / 60;
    const bn = Math.floor(phase + 0.7);
    if (bn !== beatN) { beatN = bn; pulses.push(T); if (pulses.length > 4) pulses.shift(); }
    const beat = Math.exp(-(phase + 0.7 - bn) * 6.5);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(st, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    distant(beat); beams(beat); aura(beat); overheadRing(beat); platform(beat); motesDraw(dt); hud(beat);
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (active()) resize(); }).observe(stage);
  requestAnimationFrame(frame);
  window.__bodyStage = { frame: () => T, vitals: () => Object.assign({ hrF: hr }, VIT) };
})();
