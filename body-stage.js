/* Live sci-fi medical laboratory behind the 3D body ("Train your brain" → human body).
   A 2D canvas sits behind the transparent WebGL canvas. Only the room is drawn here: the body, organs and
   every control are untouched. The room is a one-point-perspective lab: glass walls with metal mullions,
   a lit ceiling, a glossy blue floor that mirrors the walls, distant scanner and instrument racks.
   Live layer: heartbeat-synced aura, scanning rings, volumetric beams, particles and floating HUD panels.
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
  const BPM = 72, FONT = "Figtree,'Segoe UI',system-ui,sans-serif", TAU = Math.PI * 2;
  let W = 0, H = 0, DPR = 1, G = null, last = 0, T = 0, beatN = -1;
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
  function drawRoom(c) {
    const g = G, N = 7, ds = []; for (let k = 0; k <= N; k++) ds.push(1 + (g.D - 1) * k / N);
    seed = 11;

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

    /* back wall: a glass bay with a lit lab beyond */
    const bh = g.y1 - g.y0;
    c.fillStyle = lin(c, 0, g.y0, 0, g.y1, [[0, "#04162c"], [0.5, "#0a3b6a"], [1, "#0d4a80"]]); c.fillRect(g.x0, g.y0, g.bw, bh);
    let hz = c.createRadialGradient(g.cx, g.y0 + bh * 0.62, 2, g.cx, g.y0 + bh * 0.62, g.bw * 0.62);
    hz.addColorStop(0, "rgba(140,225,255,.55)"); hz.addColorStop(0.5, "rgba(50,150,230,.2)"); hz.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = hz; c.fillRect(g.x0, g.y0, g.bw, bh);
    /* far corridor of lit doorways */
    for (let k = 0; k < 6; k++) { const w = g.bw * 0.045, x = g.x0 + g.bw * (0.08 + k * 0.168); c.fillStyle = "rgba(190,240,255,.16)"; c.fillRect(x, g.y0 + bh * 0.3, w, bh * 0.62); c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x + w * 0.45, g.y0 + bh * 0.3, 1.4, bh * 0.62); }
    /* CT / MRI gantry (left) */
    if (g.land) { const gx = g.x0 + g.bw * 0.06, gw = g.bw * 0.19, gy = g.y1 - bh * 0.62, gh = bh * 0.58, r = Math.min(gw, gh) * 0.3;
      rr(c, gx, gy, gw, gh, gw * 0.18); c.fillStyle = lin(c, gx, gy, gx + gw, gy + gh, [[0, "#6f8fae"], [0.5, "#2c4a68"], [1, "#12263c"]]); c.fill();
      c.strokeStyle = "rgba(150,225,255,.7)"; c.lineWidth = 1; c.stroke();
      const bx = gx + gw / 2, by = gy + gh * 0.46;
      c.beginPath(); c.arc(bx, by, r * 1.12, 0, TAU); c.fillStyle = "#07192e"; c.fill();
      c.beginPath(); c.arc(bx, by, r * 1.12, 0, TAU); c.strokeStyle = "rgba(90,215,255,.95)"; c.lineWidth = 2.4; c.stroke();
      c.beginPath(); c.arc(bx, by, r * 0.78, 0, TAU); c.strokeStyle = "rgba(90,215,255,.35)"; c.lineWidth = 1; c.stroke();
      rr(c, bx - gw * 0.2, by + r * 0.55, gw * 1.0, gh * 0.06, 3); c.fillStyle = "#7f9cb8"; c.fill();
      c.fillStyle = "#2c4a68"; c.fillRect(bx + gw * 0.5, by + r * 0.6 + gh * 0.06, gw * 0.14, gh * 0.18);
      g.ct = { x: bx, y: by, r };
    }
    /* instrument racks (right) */
    for (let k = 0; g.land && k < 3; k++) {
      const rw = g.bw * 0.085, rx0 = g.x1 - g.bw * (0.34 - k * 0.1), ry = g.y1 - bh * 0.7 + k * bh * 0.04, rh = g.y1 - ry - bh * 0.03;
      c.fillStyle = lin(c, rx0, ry, rx0 + rw, ry, [[0, "#0a1f38"], [0.5, "#16395f"], [1, "#0a1f38"]]); c.fillRect(rx0, ry, rw, rh);
      c.strokeStyle = "rgba(150,225,255,.55)"; c.lineWidth = 1; c.strokeRect(rx0, ry, rw, rh);
      for (let j = 0; j < 14; j++) { const ly = ry + rh * (0.06 + j * 0.065); c.fillStyle = "rgba(120,210,255,.1)"; c.fillRect(rx0 + 3, ly, rw - 6, rh * 0.035);
        const col = [[90, 255, 190], [90, 210, 255], [255, 200, 90]][(j + k) % 3]; g.leds.push({ x: rx0 + rw * (0.2 + rnd() * 0.6), y: ly + rh * 0.017, c: col, p: rnd() * 6.28, r: Math.max(1.2, rw * 0.03) }); }
    }
    /* back wall frame + floor seam */
    c.strokeStyle = "rgba(170,230,255,.5)"; c.lineWidth = 1.5; c.strokeRect(g.x0, g.y0, g.bw, bh);
    neon(c, [[g.x0, g.y1], [g.x1, g.y1]], [90, 200, 255], 1.6, 0.9);

    /* side walls: glass panes, solid dado, header beam, metal mullions */
    [-1, 1].forEach((side) => {
      for (let k = 0; k < N; k++) {
        const dA = ds[k], dB = ds[k + 1];
        const pane = [wp(side, dA, 0.15), wp(side, dB, 0.15), wp(side, dB, 0.9), wp(side, dA, 0.9)];
        poly(c, pane);
        const xa = pane[0][0], xb = pane[1][0];
        c.fillStyle = lin(c, xa, 0, xb, 0, [[0, "rgba(6,24,46,.92)"], [1, "rgba(14,70,124,.78)"]]); c.fill();
        c.save(); poly(c, pane); c.clip();
        /* lit room beyond the glass */
        if (k % 2 === 1) {
          const sc = pq(side, dA, dB, 0.2, 0.55), sc2 = pq(side, dA, dB, 0.8, 0.8);
          c.fillStyle = "rgba(90,200,255,.2)"; poly(c, [pq(side, dA, dB, 0.18, 0.5), pq(side, dA, dB, 0.82, 0.5), pq(side, dA, dB, 0.82, 0.78), pq(side, dA, dB, 0.18, 0.78)]); c.fill();
          c.strokeStyle = "rgba(190,240,255,.5)"; c.lineWidth = 1; c.stroke();
          for (let l = 0; l < 4; l++) { const a = pq(side, dA, dB, 0.26, 0.58 + l * 0.05), b = pq(side, dA, dB, 0.26 + 0.4 * (0.4 + rnd() * 0.5), 0.58 + l * 0.05); neon(c, [a, b], [120, 230, 255], 0.9, 0.55); }
          void sc; void sc2;
        } else {
          c.fillStyle = "rgba(60,150,230,.13)"; poly(c, [pq(side, dA, dB, 0.1, 0.18), pq(side, dA, dB, 0.9, 0.18), pq(side, dA, dB, 0.9, 0.42), pq(side, dA, dB, 0.1, 0.42)]); c.fill();
        }
        /* frosted privacy band */
        c.fillStyle = "rgba(210,240,255,.07)"; poly(c, [wp(side, dA, 0.44), wp(side, dB, 0.44), wp(side, dB, 0.5), wp(side, dA, 0.5)]); c.fill();
        /* diagonal sheen */
        const m0 = pq(side, dA, dB, 0.15, 0.9), m1 = pq(side, dA, dB, 0.55, 0.2);
        const sh = c.createLinearGradient(m0[0], m0[1], m1[0], m1[1]);
        sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.45, "rgba(200,240,255,.17)"); sh.addColorStop(0.62, "rgba(255,255,255,0)");
        c.fillStyle = sh; c.fillRect(0, 0, W, H);
        c.restore();
      }
      /* dado */
      poly(c, [wp(side, 1, 0), wp(side, g.D, 0), wp(side, g.D, 0.15), wp(side, 1, 0.15)]);
      c.fillStyle = lin(c, 0, g.y0, 0, H, [[0, "#162b44"], [1, "#050c18"]]); c.fill();
      neon(c, [wp(side, 1, 0.15), wp(side, g.D, 0.15)], [80, 200, 255], 1.6, 0.85);
      /* header beam */
      poly(c, [wp(side, 1, 0.9), wp(side, g.D, 0.9), wp(side, g.D, 1), wp(side, 1, 1)]);
      c.fillStyle = lin(c, 0, 0, 0, g.y0 * 1.1, [[0, "#09172a"], [1, "#27425f"]]); c.fill();
      neon(c, [wp(side, 1, 0.9), wp(side, g.D, 0.9)], [80, 200, 255], 1.4, 0.8);
      /* mullions */
      ds.forEach((d) => {
        const a = wp(side, d, 0.15), b = wp(side, d, 0.9), w = Math.max(2.5, 11 / d);
        c.fillStyle = lin(c, a[0] - w / 2, 0, a[0] + w / 2, 0, [[0, "#1e3550"], [0.35, "#9db8d1"], [0.55, "#e6f2fb"], [1, "#2a4562"]]);
        c.fillRect(a[0] - w / 2, b[1], w, a[1] - b[1]);
        c.fillStyle = "rgba(120,225,255,.95)"; c.fillRect(a[0] + (side < 0 ? w / 2 : -w / 2 - 1.2), b[1], 1.2, a[1] - b[1]);
      });
    });
    /* left-wall emergency exit sign and right-wall status strip, kept small */
    const ex = pq(-1, ds[3], ds[4], 0.5, 0.96); c.fillStyle = "rgba(90,255,190,.9)"; c.fillRect(ex[0] - 12, ex[1] - 4, 24, 8);
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
  function trace(x, y, w, h, t, win, fn, color, lw, amp) {
    const n = Math.max(20, Math.round(w / 2.4));
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const v = fn((t - (1 - i / n) * win) * BPM / 60), px = x + (i / n) * w, py = y + h * 0.78 - v * h * amp; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.lineJoin = "round";
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.25); ctx.lineWidth = lw * 3; ctx.stroke();
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.95); ctx.lineWidth = lw; ctx.stroke();
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
  function hud(beat) {
    const g = G, c = ctx;
    if (g.land) {
      const w = W * 0.17, h = w * 0.78, lx = W * 0.025, rx0 = W - w - lx;
      let fs = holoPanel(lx, H * 0.17, w, h, "ECG · II", beat);
      trace(lx + 10, H * 0.17 + fs + 14, w - 20, h * 0.5, T, 2.4, ecg, [130, 255, 220], 1.4, 0.8);
      c.fillStyle = "rgba(170,235,255,.85)"; c.font = "700 " + Math.round(w * 0.1) + "px " + FONT; c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillText("HR " + (BPM + Math.round(Math.sin(T * 0.37))), lx + 10, H * 0.17 + h - 9);
      fs = holoPanel(lx, H * 0.17 + h + H * 0.04, w, h * 0.95, "ORGAN SYSTEMS", 0.2);
      ["Lung", "Heart", "Liver", "Kidney"].forEach((n, i) => {
        const y = H * 0.17 + h + H * 0.04 + fs + 32 + i * (h * 0.95 - fs - 44) / 4, v = 0.55 + 0.35 * Math.sin(T * (0.5 + i * 0.17) + i * 2);
        c.fillStyle = "rgba(170,235,255,.8)"; c.font = "600 " + Math.round(w * 0.07) + "px " + FONT; c.fillText(n, lx + 10, y);
        c.fillStyle = "rgba(100,190,255,.2)"; c.fillRect(lx + w * 0.36, y - 7, w * 0.54, 6);
        c.fillStyle = rgba(110, 225, 255, 0.9); c.fillRect(lx + w * 0.36, y - 7, w * 0.54 * v, 6);
      });
      fs = holoPanel(rx0, H * 0.15, w, h, "SpO₂ · PLETH", 0.25);
      trace(rx0 + 10, H * 0.15 + fs + 12, w - 20, h * 0.42, T + 0.35, 2.2, pleth, [140, 210, 255], 1.3, 0.7);
      c.fillStyle = "rgba(170,235,255,.85)"; c.font = "700 " + Math.round(w * 0.1) + "px " + FONT; c.textAlign = "left"; c.fillText("SpO₂ 98", rx0 + 10, H * 0.15 + h - 9);
      fs = holoPanel(rx0, H * 0.15 + h + H * 0.04, w, h * 0.95, "PERFUSION", 0.2);
      const gy = H * 0.15 + h + H * 0.04 + (h * 0.95 + fs) / 2 + 6, r = w * 0.15;
      ringGauge(rx0 + w * 0.27, gy, r, 0.72 + 0.08 * Math.sin(T * 0.6), [110, 230, 255], "72");
      ringGauge(rx0 + w * 0.73, gy, r, 0.5 + 0.1 * Math.sin(T * 0.4 + 1), [130, 255, 210], "MAP");
    } else {
      const w = Math.min(150, W * 0.34), h = w * 0.7, y = H * 0.66, lx = Math.max(8, W * 0.02), rx0 = W - w - lx;
      const fs = holoPanel(lx, y, w, h, "ECG · II", beat);
      trace(lx + 10, y + fs + 12, w - 20, h * 0.5, T, 2.4, ecg, [130, 255, 220], 1.4, 0.8);
      c.fillStyle = "rgba(170,235,255,.85)"; c.font = "700 " + Math.round(w * 0.09) + "px " + FONT; c.textAlign = "left"; c.fillText("HR " + (BPM + Math.round(Math.sin(T * 0.37))), lx + 10, y + h - 8);
      const fs2 = holoPanel(rx0, y - H * 0.02, w, h, "SpO₂", 0.25);
      trace(rx0 + 10, y - H * 0.02 + fs2 + 10, w - 20, h * 0.42, T + 0.35, 2.2, pleth, [140, 210, 255], 1.3, 0.7);
      c.fillStyle = "rgba(170,235,255,.85)"; c.font = "700 " + Math.round(w * 0.09) + "px " + FONT; c.fillText("SpO₂ 98", rx0 + 10, y - H * 0.02 + h - 8);
    }
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
    const ph = T * BPM / 60, bn = Math.floor(ph);
    if (bn !== beatN) { beatN = bn; pulses.push(T); if (pulses.length > 4) pulses.shift(); }
    const beat = Math.exp(-(ph - bn) * 6.5);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(st, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    distant(beat); beams(beat); aura(beat); overheadRing(beat); scanRings(beat); platform(beat); motesDraw(dt); hud(beat);
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (active()) resize(); }).observe(stage);
  requestAnimationFrame(frame);
  window.__bodyStage = { frame: () => T };
})();
