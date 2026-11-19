/* Live ICU backdrop behind the 3D body ("Train your brain" screen).
   A 2D canvas sits behind the transparent WebGL canvas. Everything moves and is tied to one heartbeat (72 per minute):
   the ECG trace, the pulse rings on the floor platform, the glow behind the body, the heart icon and the bedside monitors.
   Left: vitals panel. Right: scanning skeleton panel. Sides: ICU bed and equipment trolley. Ceiling: rotating light rings.
   Decorative and simulated. It pauses when the body screen is not showing and draws one still frame for reduced motion. */
(function () {
  "use strict";
  const stage = document.querySelector(".stage-col");
  if (!stage) return;
  const cv = document.createElement("canvas");
  cv.id = "body-bg"; cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block";
  stage.insertBefore(cv, stage.firstChild);
  const ctx = cv.getContext("2d");
  const st = document.createElement("canvas"), sx = st.getContext("2d");
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const BPM = 72, FONT = "Figtree,'Segoe UI',system-ui,sans-serif";
  let W = 0, H = 0, DPR = 1, G = null, last = 0, T = 0, beatN = -1;
  const pulses = [], motes = [];
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 80; i++) motes.push({ x: rnd(), y: rnd(), v: 0.02 + rnd() * 0.05, s: 0.8 + rnd() * 1.8, p: rnd() * 6.28, a: 0.25 + rnd() * 0.5 });

  const rgba = (r, g, b, a) => "rgba(" + r + "," + g + "," + b + "," + a + ")";
  const CY = [90, 210, 255];

  function geo() {
    const sxh = Math.min(W / 2, H * 0.62);                 /* half span of the room that flanks the body */
    const platRx = Math.min(W * 0.47, H * 0.37);
    let pw = Math.max(112, Math.min(sxh * 0.52, 230)), ph = pw * 1.5;
    if (ph > H * 0.3) { ph = H * 0.3; pw = Math.max(104, ph / 1.5); ph = Math.max(ph, pw * 1.35); }
    return { cx: W / 2, sxh, floor: H * 0.64, platY: H * 0.885, platRx, platRy: platRx * 0.17, ringY: H * 0.115, ringRx: Math.min(W * 0.4, H * 0.27), pw, ph };
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ---------- static layer: room, floor grid, equipment silhouettes ---------- */
  function drawStatic() {
    const c = sx, g = G;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    let gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#020a16"); gr.addColorStop(0.35, "#061b36"); gr.addColorStop(0.66, "#0a2c55"); gr.addColorStop(1, "#050f1f");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    gr = c.createRadialGradient(g.cx, H * 0.46, 10, g.cx, H * 0.46, H * 0.6);
    gr.addColorStop(0, "rgba(40,130,225,.38)"); gr.addColorStop(0.55, "rgba(20,80,160,.14)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    /* back wall: tall glass panels with light strips */
    for (let i = -4; i <= 4; i++) {
      const x = g.cx + i * g.sxh * 0.36, w = g.sxh * 0.3;
      const p = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      p.addColorStop(0, "rgba(10,50,100,0)"); p.addColorStop(0.5, "rgba(30,110,190,.10)"); p.addColorStop(1, "rgba(10,50,100,0)");
      c.fillStyle = p; c.fillRect(x - w / 2, H * 0.16, w, g.floor - H * 0.16);
      c.fillStyle = "rgba(130,215,255,.18)"; c.fillRect(x - w / 2, H * 0.16, 1, g.floor - H * 0.16);
    }
    c.fillStyle = "rgba(100,200,255,.14)"; c.fillRect(0, g.floor - 1, W, 1.5);
    /* floor: glossy gradient and a perspective grid */
    gr = c.createLinearGradient(0, g.floor, 0, H);
    gr.addColorStop(0, "rgba(40,120,210,.22)"); gr.addColorStop(0.5, "rgba(10,50,110,.18)"); gr.addColorStop(1, "rgba(3,10,24,.55)");
    c.fillStyle = gr; c.fillRect(0, g.floor, W, H - g.floor);
    c.strokeStyle = "rgba(90,180,255,.13)"; c.lineWidth = 1;
    for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(g.cx + i * W * 0.012, g.floor); c.lineTo(g.cx + i * W * 0.22, H); c.stroke(); }
    for (let k = 1; k < 12; k++) { const y = g.floor + (H - g.floor) * Math.pow(k / 12, 1.7); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    /* ICU bed, left */
    const bx = g.cx - g.sxh * 1.04, bw = g.sxh * 0.66, by = g.floor - H * 0.115;
    function metal(x, y, w, h, a) { const q = c.createLinearGradient(x, y, x, y + h); q.addColorStop(0, rgba(150, 205, 255, a)); q.addColorStop(1, rgba(25, 70, 130, a)); c.fillStyle = q; rr(c, x, y, w, h, Math.min(5, h / 2)); c.fill(); }
    metal(bx, by, bw, H * 0.04, 0.75);                         /* mattress */
    metal(bx - bw * 0.04, by - H * 0.075, bw * 0.16, H * 0.115, 0.6); /* head board */
    c.strokeStyle = "rgba(160,215,255,.5)"; c.lineWidth = 2;
    [0.18, 0.4, 0.62, 0.84].forEach((u) => { c.beginPath(); c.moveTo(bx + bw * u, by); c.lineTo(bx + bw * u, by - H * 0.04); c.stroke(); });
    c.beginPath(); c.moveTo(bx + bw * 0.1, by - H * 0.04); c.lineTo(bx + bw * 0.95, by - H * 0.04); c.stroke();
    metal(bx + bw * 0.08, by + H * 0.04, bw * 0.86, H * 0.016, 0.55);
    [0.14, 0.86].forEach((u) => { c.fillStyle = "rgba(20,60,110,.9)"; c.fillRect(bx + bw * u - 2, by + H * 0.055, 4, H * 0.045); c.beginPath(); c.arc(bx + bw * u, by + H * 0.105, 7, 0, 7); c.fillStyle = "rgba(10,30,60,.95)"; c.fill(); c.strokeStyle = "rgba(150,210,255,.45)"; c.stroke(); });
    /* bedside monitor on a pole */
    c.strokeStyle = "rgba(150,210,255,.4)"; c.lineWidth = 3; c.beginPath(); c.moveTo(bx + bw * 0.02, by - H * 0.02); c.lineTo(bx + bw * 0.02, by - H * 0.06); c.stroke();
    /* trolley, right */
    const tx = g.cx + g.sxh * 0.66, tw = g.sxh * 0.34, ty = g.floor - H * 0.11;
    metal(tx, ty, tw, H * 0.11, 0.7);
    c.strokeStyle = "rgba(10,30,60,.9)"; c.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(tx + 6, ty + i * H * 0.0275); c.lineTo(tx + tw - 6, ty + i * H * 0.0275); c.stroke(); c.fillStyle = "rgba(190,230,255,.7)"; c.fillRect(tx + tw / 2 - 12, ty + i * H * 0.0275 - H * 0.013, 24, 2); }
    [0.1, 0.9].forEach((u) => { c.beginPath(); c.arc(tx + tw * u, ty + H * 0.118, 6, 0, 7); c.fillStyle = "rgba(10,30,60,.95)"; c.fill(); c.strokeStyle = "rgba(150,210,255,.45)"; c.stroke(); });
    metal(tx + tw * 0.08, ty - H * 0.05, tw * 0.84, H * 0.05, 0.65);   /* monitor body */
  }

  /* ---------- waveforms ---------- */
  const gauss = (x, m, w, a) => a * Math.exp(-Math.pow((x - m) / w, 2));
  function ecg(f) { f = f - Math.floor(f); return gauss(f, 0.13, 0.035, 0.13) + gauss(f, 0.27, 0.011, -0.1) + gauss(f, 0.3, 0.009, 1) + gauss(f, 0.335, 0.012, -0.22) + gauss(f, 0.54, 0.06, 0.3); }
  function pleth(f) { f = f - Math.floor(f); return gauss(f, 0.25, 0.1, 1) + gauss(f, 0.55, 0.08, 0.28); }
  function trace(x, y, w, h, t, win, fn, color, lw, amp) {
    const n = Math.max(24, Math.round(w / 2.2));
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const tt = t - (1 - i / n) * win; const v = fn(tt * BPM / 60); const px = x + (i / n) * w, py = y + h * 0.78 - v * h * amp; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.22); ctx.lineWidth = lw * 3.2; ctx.lineJoin = "round"; ctx.stroke();
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.95); ctx.lineWidth = lw; ctx.stroke();
    const v = fn(t * BPM / 60); ctx.beginPath(); ctx.arc(x + w, y + h * 0.78 - v * h * amp, lw * 1.9, 0, 7); ctx.fillStyle = "#eaffff"; ctx.fill();
  }

  /* ---------- dynamic pieces ---------- */
  function ceiling(beat) {
    const g = G, c = ctx;
    for (let k = 0; k < 3; k++) {
      const rx = g.ringRx * (1 - k * 0.2), ry = rx * 0.2;
      c.beginPath(); c.ellipse(g.cx, g.ringY, rx, ry, 0, 0, 6.2832);
      c.strokeStyle = rgba(CY[0], CY[1], CY[2], (0.1 + 0.06 * beat) * (k === 0 ? 2.2 : 1.2)); c.lineWidth = k === 0 ? 14 : 8; c.stroke();
      c.strokeStyle = rgba(190, 240, 255, k === 0 ? 0.8 + 0.2 * beat : 0.4); c.lineWidth = k === 0 ? 3.2 : 1.6; c.stroke();
    }
    c.save(); c.setLineDash([26, 20]); c.lineDashOffset = -T * 46; c.beginPath(); c.ellipse(g.cx, g.ringY, g.ringRx * 0.78, g.ringRx * 0.156, 0, 0, 6.2832); c.strokeStyle = "rgba(120,220,255,.7)"; c.lineWidth = 2; c.stroke(); c.restore();
    /* two soft beams that sweep slowly */
    for (let k = 0; k < 2; k++) {
      const a = Math.sin(T * 0.35 + k * 3.1) * 0.5, x0 = g.cx + Math.sin(T * 0.5 + k * 2) * g.ringRx * 0.5;
      const q = c.createLinearGradient(x0, g.ringY, x0 + a * H * 0.5, H * 0.62);
      q.addColorStop(0, "rgba(140,220,255,.16)"); q.addColorStop(1, "rgba(140,220,255,0)");
      c.fillStyle = q;
      for (let m = 0; m < 5; m++) { const u = 1 - m * 0.2; c.globalAlpha = 0.35; c.beginPath(); c.moveTo(x0 - 10 * u, g.ringY); c.lineTo(x0 + 10 * u, g.ringY); c.lineTo(x0 + a * H * 0.5 + H * 0.12 * u, H * 0.62); c.lineTo(x0 + a * H * 0.5 - H * 0.12 * u, H * 0.62); c.closePath(); c.fill(); }
      c.globalAlpha = 1;
    }
  }
  function platform(beat) {
    const g = G, c = ctx, cx = g.cx, y = g.platY;
    let q = c.createRadialGradient(cx, y, 4, cx, y, g.platRx);
    q.addColorStop(0, rgba(150, 225, 255, 0.5 + 0.25 * beat)); q.addColorStop(0.35, "rgba(40,140,235,.3)"); q.addColorStop(1, "rgba(10,60,140,0)");
    c.save(); c.translate(cx, y); c.scale(1, g.platRy / g.platRx); c.translate(-cx, -y);
    c.fillStyle = q; c.beginPath(); c.arc(cx, y, g.platRx, 0, 6.2832); c.fill();
    [[0.97, 7, 0.22], [0.97, 2.4, 0.95], [0.78, 2, 0.6], [0.58, 1.6, 0.5]].forEach((r) => { c.beginPath(); c.arc(cx, y, g.platRx * r[0], 0, 6.2832); c.strokeStyle = rgba(120, 215, 255, r[2] * (0.8 + 0.2 * beat)); c.lineWidth = r[1] * (g.platRx / g.platRy) * 0.17 + 0.0; c.stroke(); });
    c.setLineDash([40, 28]); c.lineDashOffset = T * 60; c.beginPath(); c.arc(cx, y, g.platRx * 0.88, 0, 6.2832); c.strokeStyle = "rgba(190,240,255,.8)"; c.lineWidth = 3; c.stroke();
    c.lineDashOffset = -T * 90; c.beginPath(); c.arc(cx, y, g.platRx * 0.68, 0, 6.2832); c.strokeStyle = "rgba(90,190,255,.7)"; c.lineWidth = 2.4; c.stroke();
    c.setLineDash([]);
    pulses.forEach((p) => { const u = (T - p) / 1.5; if (u < 0 || u > 1) return; c.beginPath(); c.arc(cx, y, g.platRx * (0.2 + 0.85 * u), 0, 6.2832); c.strokeStyle = rgba(190, 245, 255, 0.85 * (1 - u)); c.lineWidth = 5 * (1 - u) + 1; c.stroke(); });
    c.restore();
    /* light column rising from the platform */
    q = c.createLinearGradient(0, y, 0, H * 0.3);
    q.addColorStop(0, rgba(130, 215, 255, 0.2 + 0.08 * beat)); q.addColorStop(1, "rgba(130,215,255,0)");
    c.fillStyle = q;
    for (let k = 0; k < 6; k++) { const u = 1 - k * 0.15; c.globalAlpha = 0.28; c.beginPath(); c.moveTo(cx - g.platRx * 0.6 * u, y); c.lineTo(cx + g.platRx * 0.6 * u, y); c.lineTo(cx + g.platRx * 0.38 * u, H * 0.3); c.lineTo(cx - g.platRx * 0.38 * u, H * 0.3); c.closePath(); c.fill(); }
    c.globalAlpha = 1;
  }
  function glowBehind(beat) {
    const g = G, c = ctx, q = c.createRadialGradient(g.cx, H * 0.46, 10, g.cx, H * 0.46, H * 0.5);
    q.addColorStop(0, rgba(80, 170, 255, 0.16 + 0.1 * beat)); q.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = q; c.fillRect(0, 0, W, H);
  }
  function motesDraw(dt) {
    const c = ctx;
    motes.forEach((m) => {
      if (!reduce) { m.y -= m.v * dt; if (m.y < -0.02) { m.y = 1.02; m.x = rnd(); } }
      const x = (m.x + Math.sin(T * 0.4 + m.p) * 0.012) * W, y = m.y * H, a = m.a * (0.55 + 0.45 * Math.sin(T * 1.6 + m.p));
      c.fillStyle = rgba(170, 230, 255, a); c.fillRect(x, y, m.s, m.s);
    });
  }
  function panel(x, y, w, h, title, hot) {
    const c = ctx;
    c.save();
    rr(c, x, y, w, h, 8); c.fillStyle = "rgba(8,36,74,.42)"; c.fill();
    const q = c.createLinearGradient(x, y, x, y + h); q.addColorStop(0, "rgba(90,200,255,.14)"); q.addColorStop(1, "rgba(30,100,190,.04)"); c.fillStyle = q; c.fill();
    c.strokeStyle = rgba(110, 215, 255, 0.55 + 0.3 * hot); c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = "rgba(200,245,255,.95)"; c.lineWidth = 2;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach((k) => { c.beginPath(); c.moveTo(k[0] + k[2] * 14, k[1]); c.lineTo(k[0], k[1]); c.lineTo(k[0], k[1] + k[3] * 14); c.stroke(); });
    /* slow glass scan band */
    const sy = y + ((T * 0.18) % 1) * h; const s = c.createLinearGradient(0, sy - 12, 0, sy + 12); s.addColorStop(0, "rgba(160,235,255,0)"); s.addColorStop(0.5, "rgba(160,235,255,.12)"); s.addColorStop(1, "rgba(160,235,255,0)");
    c.fillStyle = s; c.fillRect(x + 1, Math.max(y, sy - 12), w - 2, Math.min(24, y + h - sy + 12));
    if (title) { c.fillStyle = "rgba(160,225,255,.75)"; c.font = "600 " + Math.round(w * 0.075) + "px " + FONT; c.textBaseline = "top"; c.fillText(title, x + 9, y + 7); }
    c.restore();
  }
  function heart(x, y, s, col) { const c = ctx; c.beginPath(); c.moveTo(x, y + s * 0.35); c.bezierCurveTo(x - s * 0.9, y - s * 0.3, x - s * 0.35, y - s * 0.85, x, y - s * 0.3); c.bezierCurveTo(x + s * 0.35, y - s * 0.85, x + s * 0.9, y - s * 0.3, x, y + s * 0.35); c.fillStyle = col; c.fill(); }
  function vitals(beat) {
    const g = G, c = ctx, w = g.pw, h = g.ph;
    const land = W / H > 1.15, x = land ? g.cx - g.sxh * 0.98 : Math.max(6, W * 0.03), y = H * (land ? 0.09 : 0.14) + Math.sin(T * 0.9) * 3;
    panel(x, y, w, h, "", beat);
    const px = x + 8, pw = w - 16;
    trace(px, y + 8, pw, h * 0.2, T, 2.6, ecg, [120, 255, 215], 1.6, 0.85);
    const hr = BPM + Math.round(1.4 * Math.sin(T * 0.37)), rowH = (h - h * 0.27) / 4, fs = Math.max(14, w * 0.2);
    const rows = [["hr", String(hr), [255, 80, 90]], ["bp", "120/80", [120, 255, 160]], ["rr", "16", [120, 200, 255]], ["sp", "98%", [130, 225, 255]]];
    rows.forEach((r, i) => {
      const ry = y + h * 0.27 + i * rowH + rowH * 0.5, ix = px + 12, col = rgba(r[2][0], r[2][1], r[2][2], 1);
      c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2;
      if (i === 0) heart(ix, ry, 11 * (1 + 0.28 * beat), col);
      else if (i === 1) { c.beginPath(); c.arc(ix, ry, 8, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(ix, ry, 3, 0, 6.2832); c.fill(); }
      else if (i === 2) { const b = Math.sin(T * 1.05) * 0.5 + 0.5; c.beginPath(); c.ellipse(ix - 4, ry, 3.5 + b * 1.2, 7 + b * 1.5, 0.1, 0, 6.2832); c.ellipse(ix + 4, ry, 3.5 + b * 1.2, 7 + b * 1.5, -0.1, 0, 6.2832); c.stroke(); }
      else { c.beginPath(); c.moveTo(ix, ry - 9); c.bezierCurveTo(ix + 9, ry + 1, ix + 6, ry + 9, ix, ry + 9); c.bezierCurveTo(ix - 6, ry + 9, ix - 9, ry + 1, ix, ry - 9); c.stroke(); }
      c.font = "700 " + Math.round(fs * (i === 1 ? 0.86 : 1) * (i === 0 ? 1 + 0.07 * beat : 1)) + "px " + FONT; c.textBaseline = "middle"; c.fillText(r[1], ix + 18, ry + 1);
    });
    c.fillStyle = "rgba(160,225,255,.55)"; c.font = "500 " + Math.max(8, Math.round(w * 0.06)) + "px " + FONT; c.textBaseline = "alphabetic"; c.fillText("Simulated vitals", x + 2, y + h + Math.max(11, w * 0.07));
  }
  function skeleton() {
    const g = G, c = ctx, w = g.pw, h = g.ph * 1.12, land = W / H > 1.15;
    const x = land ? g.cx + g.sxh * 0.98 - w : W - w - Math.max(6, W * 0.03), y = H * (land ? 0.13 : 0.15) + Math.sin(T * 0.8 + 1) * 3;
    panel(x, y, w, h, "", 0.3);
    const mx = x + w / 2, top = y + h * 0.1, S = h * 0.8;
    const sy = top + ((T * 0.16) % 1) * S;
    function bones(col, a) {
      c.strokeStyle = rgba(col[0], col[1], col[2], a); c.fillStyle = rgba(col[0], col[1], col[2], a); c.lineWidth = 1.5; c.lineCap = "round";
      const P = (u, v) => [mx + u * S * 0.5, top + v * S];
      c.beginPath(); c.ellipse(mx, top + S * 0.05, S * 0.045, S * 0.05, 0, 0, 6.2832); c.stroke();
      const line = (a1, a2) => { const p = P(a1[0], a1[1]), q = P(a2[0], a2[1]); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); };
      line([0, 0.1], [0, 0.5]);
      line([-0.18, 0.15], [0.18, 0.15]); line([-0.18, 0.15], [-0.3, 0.3]); line([0.18, 0.15], [0.3, 0.3]);
      line([-0.3, 0.3], [-0.36, 0.5]); line([0.3, 0.3], [0.36, 0.5]);
      for (let i = 0; i < 6; i++) { const v = 0.19 + i * 0.04, e = 0.15 - i * 0.012; c.beginPath(); const p = P(0, v), l = P(-e, v + 0.03), r = P(e, v + 0.03); c.moveTo(p[0], p[1]); c.quadraticCurveTo(l[0], p[1] - 3, l[0], l[1]); c.moveTo(p[0], p[1]); c.quadraticCurveTo(r[0], p[1] - 3, r[0], r[1]); c.stroke(); }
      line([-0.12, 0.5], [0.12, 0.5]); line([-0.12, 0.5], [-0.14, 0.6]); line([0.12, 0.5], [0.14, 0.6]); line([-0.14, 0.6], [0.14, 0.6]);
      line([-0.1, 0.6], [-0.12, 0.78]); line([0.1, 0.6], [0.12, 0.78]); line([-0.12, 0.78], [-0.1, 0.98]); line([0.12, 0.78], [0.1, 0.98]);
      [[-0.18, 0.15], [0.18, 0.15], [-0.3, 0.3], [0.3, 0.3], [-0.36, 0.5], [0.36, 0.5], [-0.12, 0.78], [0.12, 0.78], [0, 0.35]].forEach((j) => { const p = P(j[0], j[1]); c.beginPath(); c.arc(p[0], p[1], 2.4, 0, 6.2832); c.fill(); });
    }
    bones([70, 150, 215], 0.42);
    c.save(); c.beginPath(); c.rect(x + 2, sy - 22, w - 4, 44); c.clip(); bones([210, 250, 255], 1); c.restore();
    const q = c.createLinearGradient(0, sy - 3, 0, sy + 3); q.addColorStop(0, "rgba(200,250,255,0)"); q.addColorStop(0.5, "rgba(220,252,255,1)"); q.addColorStop(1, "rgba(200,250,255,0)");
    c.fillStyle = q; c.fillRect(x + 3, sy - 3, w - 6, 6);
    /* data lines that flicker */
    for (let i = 0; i < 5; i++) { const lw = (0.2 + 0.16 * ((i * 7) % 5) / 4) * w, on = 0.45 + 0.35 * Math.sin(T * 2.2 + i * 1.7); c.fillStyle = rgba(120, 215, 255, 0.5 * on); c.fillRect(x + 8, y + h - 8 - i * 7, lw, 2.4); }
  }
  function equipment(beat) {
    const g = G, c = ctx;
    const bx = g.cx - g.sxh * 1.04, bw = g.sxh * 0.66, by = g.floor - H * 0.115;
    const mw = bw * 0.34, mh = H * 0.05, mx = bx - bw * 0.02 + 6, my = by - H * 0.112;
    rr(c, mx, my, mw, mh, 4); c.fillStyle = "rgba(4,22,44,.95)"; c.fill(); c.strokeStyle = "rgba(140,210,255,.6)"; c.lineWidth = 1.2; c.stroke();
    trace(mx + 4, my + 2, mw - 8, mh - 4, T, 2.2, ecg, [120, 255, 215], 1.1, 0.7);
    const tx = g.cx + g.sxh * 0.66, tw = g.sxh * 0.34, ty = g.floor - H * 0.11;
    const wx = tx + tw * 0.14, wy = ty - H * 0.045, ww = tw * 0.72, wh = H * 0.038;
    rr(c, wx, wy, ww, wh, 3); c.fillStyle = "rgba(4,22,44,.95)"; c.fill();
    trace(wx + 3, wy + 1, ww - 6, wh - 2, T + 0.4, 2.2, pleth, [130, 225, 255], 1.1, 0.6);
    c.fillStyle = (beat > 0.4) ? "rgba(255,90,90,.95)" : "rgba(120,30,30,.8)"; c.beginPath(); c.arc(tx + tw * 0.86, ty + 7, 2.6, 0, 7); c.fill();
    c.fillStyle = "rgba(90,255,170,.9)"; c.beginPath(); c.arc(tx + tw * 0.78, ty + 7, 2.2, 0, 7); c.fill();
  }

  /* ---------- loop ---------- */
  function resize() {
    const r = stage.getBoundingClientRect(); const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === W && h === H && cv.width === Math.round(w * DPR)) return;
    W = w; H = h; cv.width = st.width = Math.round(W * DPR); cv.height = st.height = Math.round(H * DPR);
    G = geo(); drawStatic();
  }
  const body = document.body;
  function active() { return !document.hidden && body.classList.contains("body-only") && !body.classList.contains("in") && !body.classList.contains("icu-open") && !body.classList.contains("icu-gate"); }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!active()) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.033;
    if (reduce ? (now - last < 1000 && last) : (now - last < 28 && last)) return;
    last = now; T += dt; resize(); if (!G) return;
    const ph = T * BPM / 60, bn = Math.floor(ph);
    if (bn !== beatN) { beatN = bn; pulses.push(T); if (pulses.length > 4) pulses.shift(); }
    const f = ph - bn, beat = Math.exp(-f * 6.5);                   /* 1 at the beat, fades over the cycle */
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(st, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    glowBehind(beat); ceiling(beat); platform(beat); motesDraw(dt); equipment(beat); vitals(beat); skeleton();
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (active()) resize(); }).observe(stage);
  requestAnimationFrame(frame);
  window.__bodyStage = { frame: () => T };
})();
