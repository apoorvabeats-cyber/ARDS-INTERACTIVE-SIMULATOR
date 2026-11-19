/* Live ICU backdrop behind the 3D body ("Train your brain" → human body).
   A 2D canvas sits behind the transparent WebGL canvas. Only the room is drawn here.
   Motion is tied to one heartbeat (72 per minute). Pauses when the body screen is hidden.
   Reduced motion draws a single still frame. Decorative and simulated. */
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
  const st = document.createElement("canvas"), sx = st.getContext("2d");
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const BPM = 72, FONT = "Figtree,'Segoe UI',system-ui,sans-serif";
  let W = 0, H = 0, DPR = 1, G = null, last = 0, T = 0, beatN = -1;
  const pulses = [], motes = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 70; i++) motes.push({ x: rnd(), y: rnd(), v: 0.012 + rnd() * 0.04, s: 0.7 + rnd() * 1.6, p: rnd() * 6.28, a: 0.18 + rnd() * 0.45 });

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

  function geo() {
    const floor = H * 0.62;
    const platRx = Math.min(W * 0.42, H * 0.28);
    return {
      cx: W / 2,
      floor,
      platY: H * 0.9,
      platRx,
      platRy: platRx * 0.2,
      ringY: H * 0.07,
      ringRx: Math.min(W * 0.46, H * 0.22)
    };
  }

  /* Room shell. Kept off the centre so the anatomy stays the subject. */
  function drawStatic() {
    const c = sx, g = G;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    let gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#01040c");
    gr.addColorStop(0.18, "#031428");
    gr.addColorStop(0.48, "#06284a");
    gr.addColorStop(0.66, "#04182e");
    gr.addColorStop(1, "#01060f");
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);

    /* far wall: a recessed holographic bay */
    const bayTop = H * 0.1, bayBot = g.floor;
    gr = c.createLinearGradient(0, bayTop, 0, bayBot);
    gr.addColorStop(0, "rgba(8,40,78,0)");
    gr.addColorStop(0.4, "rgba(18,70,120,.22)");
    gr.addColorStop(1, "rgba(4,20,40,0)");
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(W * 0.18, bayTop);
    c.lineTo(W * 0.82, bayTop);
    c.lineTo(W * 0.96, bayBot);
    c.lineTo(W * 0.04, bayBot);
    c.closePath();
    c.fill();

    c.strokeStyle = "rgba(120,210,255,.16)";
    c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const x0 = W * (0.18 + u * 0.64);
      const x1 = W * (0.04 + u * 0.92);
      c.beginPath();
      c.moveTo(x0, bayTop);
      c.lineTo(x1, bayBot);
      c.stroke();
    }
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      const y = bayTop + (bayBot - bayTop) * t;
      const inset = 0.18 - t * 0.14;
      c.beginPath();
      c.moveTo(W * inset, y);
      c.lineTo(W * (1 - inset), y);
      c.stroke();
    }

    /* flanking light columns — the dark gaps beside the torso */
    function column(x) {
      const w = Math.max(28, W * 0.045);
      const q = c.createLinearGradient(x - w, 0, x + w, 0);
      q.addColorStop(0, "rgba(80,190,255,0)");
      q.addColorStop(0.5, "rgba(90,200,255,.16)");
      q.addColorStop(1, "rgba(80,190,255,0)");
      c.fillStyle = q;
      c.fillRect(x - w, H * 0.08, w * 2, g.floor - H * 0.06);
      c.fillStyle = "rgba(180,235,255,.55)";
      c.fillRect(x - 1, H * 0.1, 2, g.floor - H * 0.12);
    }
    column(W * 0.16);
    column(W * 0.84);
    column(W * 0.3);
    column(W * 0.7);

    /* horizon seam */
    gr = c.createLinearGradient(0, g.floor - 18, 0, g.floor + 10);
    gr.addColorStop(0, "rgba(140,220,255,0)");
    gr.addColorStop(0.55, "rgba(170,235,255,.55)");
    gr.addColorStop(1, "rgba(80,160,220,0)");
    c.fillStyle = gr;
    c.fillRect(0, g.floor - 18, W, 28);

    /* glossy floor and perspective grid */
    gr = c.createLinearGradient(0, g.floor, 0, H);
    gr.addColorStop(0, "rgba(30,110,190,.28)");
    gr.addColorStop(0.35, "rgba(8,40,80,.35)");
    gr.addColorStop(1, "rgba(1,6,14,.2)");
    c.fillStyle = gr;
    c.fillRect(0, g.floor, W, H - g.floor);
    c.save();
    c.beginPath();
    c.rect(0, g.floor, W, H - g.floor);
    c.clip();
    c.strokeStyle = "rgba(110,200,255,.2)";
    c.lineWidth = 1;
    for (let i = -16; i <= 16; i++) {
      c.beginPath();
      c.moveTo(g.cx + i * W * 0.018, g.floor);
      c.lineTo(g.cx + i * W * 0.28, H + 8);
      c.stroke();
    }
    for (let k = 1; k <= 14; k++) {
      const y = g.floor + (H - g.floor) * Math.pow(k / 14, 1.55);
      const a = 0.08 + 0.18 * (1 - k / 14);
      c.strokeStyle = rgba(140, 215, 255, a);
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    c.restore();

    /* low side consoles, kept at the edges */
    function pod(x, y, w, h) {
      const q = c.createLinearGradient(x, y, x, y + h);
      q.addColorStop(0, "rgba(150,215,255,.35)");
      q.addColorStop(1, "rgba(10,40,80,.15)");
      c.fillStyle = q;
      rr(c, x, y, w, h, 6);
      c.fill();
      c.strokeStyle = "rgba(160,225,255,.4)";
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = "rgba(4,16,32,.75)";
      rr(c, x + 6, y + 8, w - 12, h * 0.42, 3);
      c.fill();
    }
    const pw = Math.min(120, W * 0.22);
    pod(W * 0.02, g.floor - H * 0.11, pw, H * 0.09);
    pod(W - pw - W * 0.02, g.floor - H * 0.13, pw, H * 0.1);

    /* vignette so the bay reads as a room */
    gr = c.createRadialGradient(g.cx, H * 0.42, H * 0.2, g.cx, H * 0.46, H * 0.78);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,4,12,.55)");
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);
  }

  const gauss = (x, m, w, a) => a * Math.exp(-Math.pow((x - m) / w, 2));
  function ecg(f) {
    f = f - Math.floor(f);
    return gauss(f, 0.13, 0.035, 0.13) + gauss(f, 0.27, 0.011, -0.1) + gauss(f, 0.3, 0.009, 1) + gauss(f, 0.335, 0.012, -0.22) + gauss(f, 0.54, 0.06, 0.3);
  }
  function pleth(f) {
    f = f - Math.floor(f);
    return gauss(f, 0.25, 0.1, 1) + gauss(f, 0.55, 0.08, 0.28);
  }
  function trace(x, y, w, h, t, win, fn, color, lw, amp) {
    const n = Math.max(20, Math.round(w / 2.4));
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const tt = t - (1 - i / n) * win;
      const v = fn(tt * BPM / 60);
      const px = x + (i / n) * w, py = y + h * 0.78 - v * h * amp;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.25);
    ctx.lineWidth = lw * 3;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = rgba(color[0], color[1], color[2], 0.95);
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  function ceiling(beat) {
    const g = G, c = ctx;
    const q = c.createRadialGradient(g.cx, g.ringY, 4, g.cx, g.ringY, g.ringRx * 1.3);
    q.addColorStop(0, rgba(180, 240, 255, 0.35 + 0.25 * beat));
    q.addColorStop(0.4, "rgba(80,180,255,.12)");
    q.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = q;
    c.fillRect(0, 0, W, H * 0.28);
    for (let k = 0; k < 4; k++) {
      const rx = g.ringRx * (1 - k * 0.18), ry = rx * 0.22;
      c.beginPath();
      c.ellipse(g.cx, g.ringY, rx, ry, 0, 0, 6.2832);
      c.strokeStyle = rgba(120, 210, 255, 0.18 + 0.12 * beat);
      c.lineWidth = k === 0 ? 10 : 4;
      c.stroke();
      c.strokeStyle = rgba(210, 245, 255, k === 0 ? 0.85 : 0.4);
      c.lineWidth = k === 0 ? 1.8 : 1;
      c.stroke();
    }
    c.save();
    c.setLineDash([18, 14]);
    c.lineDashOffset = -T * 40;
    c.beginPath();
    c.ellipse(g.cx, g.ringY, g.ringRx * 0.72, g.ringRx * 0.16, 0, 0, 6.2832);
    c.strokeStyle = "rgba(160,230,255,.75)";
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();

    /* two volumetric shafts that wash the bay in blue */
    for (let k = 0; k < 2; k++) {
      const sway = Math.sin(T * 0.28 + k * 2.4) * W * 0.06;
      const x0 = g.cx + (k === 0 ? -1 : 1) * g.ringRx * 0.35 + sway;
      const beam = c.createLinearGradient(x0, g.ringY, g.cx, H * 0.7);
      beam.addColorStop(0, rgba(160, 225, 255, 0.2 + 0.08 * beat));
      beam.addColorStop(1, "rgba(80,170,255,0)");
      c.fillStyle = beam;
      c.beginPath();
      c.moveTo(x0 - 8, g.ringY);
      c.lineTo(x0 + 8, g.ringY);
      c.lineTo(g.cx + (k === 0 ? -W * 0.22 : W * 0.22), H * 0.72);
      c.lineTo(g.cx + (k === 0 ? -W * 0.05 : W * 0.05), H * 0.72);
      c.closePath();
      c.fill();
    }
  }

  function platform(beat) {
    const g = G, c = ctx, cx = g.cx, y = g.platY;
    c.save();
    c.translate(cx, y);
    c.scale(1, g.platRy / g.platRx);
    c.translate(-cx, -y);
    const q = c.createRadialGradient(cx, y, 4, cx, y, g.platRx);
    q.addColorStop(0, rgba(170, 235, 255, 0.55 + 0.3 * beat));
    q.addColorStop(0.45, "rgba(40,140,230,.28)");
    q.addColorStop(1, "rgba(10,40,90,0)");
    c.fillStyle = q;
    c.beginPath();
    c.arc(cx, y, g.platRx, 0, 6.2832);
    c.fill();
    [[1, 2.2, 0.9], [0.78, 1.4, 0.55], [0.55, 1.1, 0.4]].forEach((r) => {
      c.beginPath();
      c.arc(cx, y, g.platRx * r[0], 0, 6.2832);
      c.strokeStyle = rgba(170, 230, 255, r[2] * (0.7 + 0.3 * beat));
      c.lineWidth = r[1];
      c.stroke();
    });
    c.setLineDash([22, 16]);
    c.lineDashOffset = T * 48;
    c.beginPath();
    c.arc(cx, y, g.platRx * 0.86, 0, 6.2832);
    c.strokeStyle = "rgba(210,245,255,.85)";
    c.lineWidth = 1.6;
    c.stroke();
    c.setLineDash([]);
    pulses.forEach((p) => {
      const u = (T - p) / 1.4;
      if (u < 0 || u > 1) return;
      c.beginPath();
      c.arc(cx, y, g.platRx * (0.25 + 0.8 * u), 0, 6.2832);
      c.strokeStyle = rgba(200, 245, 255, 0.8 * (1 - u));
      c.lineWidth = 3 * (1 - u) + 0.6;
      c.stroke();
    });
    c.restore();
  }

  function glowBehind(beat) {
    const g = G;
    const q = ctx.createRadialGradient(g.cx, H * 0.42, 8, g.cx, H * 0.44, H * 0.48);
    q.addColorStop(0, rgba(70, 170, 255, 0.2 + 0.12 * beat));
    q.addColorStop(0.55, "rgba(20,80,160,.08)");
    q.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = q;
    ctx.fillRect(0, 0, W, H);
  }

  function motesDraw(dt) {
    motes.forEach((m) => {
      if (!reduce) {
        m.y -= m.v * dt;
        if (m.y < -0.02) { m.y = 1.02; m.x = rnd(); }
      }
      const x = (m.x + Math.sin(T * 0.35 + m.p) * 0.01) * W;
      const y = m.y * H;
      const a = m.a * (0.45 + 0.55 * Math.sin(T * 1.4 + m.p));
      ctx.fillStyle = rgba(180, 230, 255, a);
      ctx.fillRect(x, y, m.s, m.s);
    });
  }

  function holoPanel(x, y, w, h, hot) {
    ctx.save();
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = "rgba(4,22,44,.38)";
    ctx.fill();
    const q = ctx.createLinearGradient(x, y, x, y + h);
    q.addColorStop(0, "rgba(120,210,255,.16)");
    q.addColorStop(1, "rgba(20,60,110,.05)");
    ctx.fillStyle = q;
    ctx.fill();
    ctx.strokeStyle = rgba(140, 220, 255, 0.45 + 0.35 * hot);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(220,248,255,.9)";
    ctx.lineWidth = 1.6;
    [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].forEach((k) => {
      const px = x + k[0] * w, py = y + k[1] * h;
      ctx.beginPath();
      ctx.moveTo(px + k[2] * 12, py);
      ctx.lineTo(px, py);
      ctx.lineTo(px, py + k[3] * 12);
      ctx.stroke();
    });
    const sy = y + ((T * 0.15) % 1) * h;
    const s = ctx.createLinearGradient(0, sy - 10, 0, sy + 10);
    s.addColorStop(0, "rgba(180,240,255,0)");
    s.addColorStop(0.5, "rgba(180,240,255,.16)");
    s.addColorStop(1, "rgba(180,240,255,0)");
    ctx.fillStyle = s;
    ctx.fillRect(x + 2, Math.max(y, sy - 10), w - 4, 20);
    ctx.restore();
  }

  function sideHolos(beat) {
    const w = Math.min(148, W * 0.3);
    const h = w * 0.72;
    const y = H * 0.7;
    const left = Math.max(8, W * 0.02);
    const right = W - w - left;
    holoPanel(left, y, w, h, beat);
    trace(left + 10, y + 10, w - 20, h * 0.55, T, 2.4, ecg, [130, 255, 220], 1.4, 0.8);
    ctx.fillStyle = "rgba(170,230,255,.7)";
    ctx.font = "600 " + Math.max(10, Math.round(w * 0.09)) + "px " + FONT;
    ctx.textBaseline = "alphabetic";
    const hr = BPM + Math.round(Math.sin(T * 0.37));
    ctx.fillText("HR " + hr, left + 10, y + h - 8);

    holoPanel(right, y - H * 0.02, w, h, 0.25);
    trace(right + 10, y + 8, w - 20, h * 0.42, T + 0.35, 2.2, pleth, [140, 210, 255], 1.3, 0.7);
    ctx.fillStyle = "rgba(170,230,255,.65)";
    ctx.font = "600 " + Math.max(10, Math.round(w * 0.08)) + "px " + FONT;
    ctx.fillText("SpO2 98", right + 10, y + h - H * 0.02 - 10);
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === W && h === H && cv.width === Math.round(w * DPR)) return;
    W = w;
    H = h;
    cv.width = st.width = Math.round(W * DPR);
    cv.height = st.height = Math.round(H * DPR);
    G = geo();
    drawStatic();
  }

  const body = document.body;
  function active() {
    return !document.hidden && body.classList.contains("body-only") && !body.classList.contains("in") && !body.classList.contains("icu-open") && !body.classList.contains("icu-gate");
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!active()) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.033;
    if (reduce ? (now - last < 1000 && last) : (now - last < 28 && last)) return;
    last = now;
    T += dt;
    resize();
    if (!G) return;
    const ph = T * BPM / 60, bn = Math.floor(ph);
    if (bn !== beatN) { beatN = bn; pulses.push(T); if (pulses.length > 4) pulses.shift(); }
    const beat = Math.exp(-(ph - bn) * 6.5);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(st, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    glowBehind(beat);
    ceiling(beat);
    platform(beat);
    motesDraw(dt);
    sideHolos(beat);
  }
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (active()) resize(); }).observe(stage);
  requestAnimationFrame(frame);
  window.__bodyStage = { frame: () => T };
})();
