/* Train your brain → human body.
   The picture is the screen. Only the vital numbers change, and the rings at the
   ceiling and the floor turn. No scan line. The 3D canvas stays hidden on this screen. */
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
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const TAU = Math.PI * 2;
  const img = new Image();
  let ready = false;
  img.onload = function () { ready = true; };
  img.src = "assets/body-plate.jpg";

  let W = 0, H = 0, DPR = 1, last = 0, T = 0;
  const VIT = { hr: 72, sbp: 120, dbp: 80, rr: 16, spo2: 98 };
  /* number boxes in the source picture, pixels */
  const NUMS = [
    { x: 158, y: 1368, w: 360, h: 96, color: "#e9fff4", size: 58, key: "hr" },
    { x: 158, y: 1552, w: 450, h: 92, color: "#e7fbff", size: 46, key: "bp" },
    { x: 158, y: 1728, w: 240, h: 84, color: "#e7fbff", size: 46, key: "rr" },
    { x: 158, y: 1905, w: 300, h: 88, color: "#e7fbff", size: 46, key: "o2" }
  ];
  /* rings in the source picture: centre, radii. They only spin. */
  const RINGS = [
    { x: 750, y: 175, rx: 520, ry: 52, speed: 36 },
    { x: 750, y: 248, rx: 430, ry: 46, speed: -28 },
    { x: 750, y: 330, rx: 300, ry: 36, speed: 22 },
    { x: 750, y: 2145, rx: 470, ry: 52, speed: -34 },
    { x: 750, y: 2245, rx: 390, ry: 44, speed: 26 },
    { x: 750, y: 2348, rx: 250, ry: 32, speed: -20 }
  ];

  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    if (w === W && h === H && cv.width === Math.round(w * DPR)) return;
    W = w; H = h;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
  }
  function cover() {
    const ir = img.width / img.height, vr = W / H;
    if (vr > ir) {
      const dw = W, dh = W / ir;
      return { dw: dw, dh: dh, ox: 0, oy: (H - dh) / 2 };
    }
    const dh = H, dw = H * ir;
    return { dw: dw, dh: dh, ox: (W - dw) / 2, oy: 0 };
  }
  function wander(t) {
    return {
      hr: 72 + 4 * Math.sin(t * 0.17) + 2 * Math.sin(t * 0.47),
      sbp: 120 + 4 * Math.sin(t * 0.13 + 0.4) + 2 * Math.sin(t * 0.37),
      dbp: 80 + 3 * Math.sin(t * 0.16 + 1.2),
      rr: 16 + 1.4 * Math.sin(t * 0.11) + 0.6 * Math.sin(t * 0.29),
      spo2: 97.6 + 0.8 * Math.sin(t * 0.09) + 0.4 * Math.sin(t * 0.31 + 2)
    };
  }
  function vitalsUpdate() {
    const v = wander(Math.floor(T));
    VIT.hr = Math.round(Math.min(86, Math.max(64, v.hr)));
    VIT.sbp = Math.round(Math.min(132, Math.max(108, v.sbp)));
    VIT.dbp = Math.round(Math.min(88, Math.max(70, v.dbp)));
    VIT.rr = Math.round(Math.min(20, Math.max(12, v.rr)));
    VIT.spo2 = Math.round(Math.min(99, Math.max(95, v.spo2)));
  }
  function label(key) {
    if (key === "hr") return String(VIT.hr);
    if (key === "bp") return VIT.sbp + "/" + VIT.dbp;
    if (key === "rr") return String(VIT.rr);
    return VIT.spo2 + "%";
  }
  function rings(c, map) {
    c.save();
    c.lineCap = "round";
    RINGS.forEach(function (ring) {
      const p = map(ring.x, ring.y);
      const s = map(ring.x + ring.rx, ring.y);
      const rx = Math.abs(s[0] - p[0]);
      const ry = rx * (ring.ry / ring.rx);
      c.beginPath();
      c.ellipse(p[0], p[1], rx, ry, 0, 0, TAU);
      c.strokeStyle = "rgba(120,210,255,.22)";
      c.lineWidth = Math.max(2, rx * 0.012);
      c.stroke();
      c.save();
      c.setLineDash([Math.max(10, rx * 0.08), Math.max(8, rx * 0.06)]);
      c.lineDashOffset = reduce ? 0 : (ring.speed > 0 ? -T * ring.speed : T * -ring.speed);
      c.beginPath();
      c.ellipse(p[0], p[1], rx * 0.92, ry * 0.92, 0, 0, TAU);
      c.strokeStyle = "rgba(210,245,255,.8)";
      c.lineWidth = Math.max(1.2, rx * 0.006);
      c.stroke();
      c.restore();
    });
    c.restore();
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
    if (!reduce) T += dt;
    else T += dt;
    resize();
    if (!ready || !W) return;
    vitalsUpdate();
    const fit = cover();
    const map = function (ix, iy) {
      return [fit.ox + (ix / img.width) * fit.dw, fit.oy + (iy / img.height) * fit.dh];
    };
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, fit.ox, fit.oy, fit.dw, fit.dh);
    rings(ctx, map);
    const scale = fit.dw / img.width;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "700 " + Math.round(52 * scale) + "px Figtree, Segoe UI, sans-serif";
    NUMS.forEach(function (n) {
      const p = map(n.x, n.y);
      const rw = n.w * scale, rh = n.h * scale;
      ctx.fillStyle = "rgba(5,24,48,.94)";
      ctx.fillRect(p[0], p[1], rw, rh);
      ctx.fillStyle = n.color;
      ctx.font = "700 " + Math.round(n.size * scale) + "px Figtree, Segoe UI, sans-serif";
      ctx.fillText(label(n.key), p[0] + 4 * scale, p[1] + rh * 0.62);
    });
  }
  if ("ResizeObserver" in window) new ResizeObserver(function () { if (active()) resize(); }).observe(stage);
  requestAnimationFrame(frame);
  window.__bodyStage = { frame: function () { return T; }, vitals: function () { return Object.assign({}, VIT); } };
})();
