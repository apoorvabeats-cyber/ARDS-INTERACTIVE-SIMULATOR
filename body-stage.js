/* Train your brain → human body.
   Nothing but the 3D body: a dark blue stage with one ring above the head and one below the feet.
   No panels, no bed, no equipment, no scanning rings. The rings only glow, they do not sweep. */
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
  const TAU = Math.PI * 2;
  let W = 0, H = 0, DPR = 1, drawn = "";

  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    if (w === W && h === H && cv.width === Math.round(w * DPR)) return false;
    W = w; H = h;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    return true;
  }
  /* one glowing ring: an ellipse seen from slightly above, drawn as a soft halo plus a bright core */
  function ring(cx, cy, rx, ry, core, halo) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.strokeStyle = "rgba(60,170,255," + halo + ")"; ctx.lineWidth = Math.max(8, rx * 0.075); ctx.filter = "blur(" + Math.max(5, rx * 0.04) + "px)"; ctx.stroke();
    ctx.filter = "none";
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    ctx.strokeStyle = "rgba(190,238,255," + core + ")"; ctx.lineWidth = Math.max(2.5, rx * 0.016); ctx.stroke();
    ctx.restore();
  }
  function paint() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.05, W / 2, H * 0.5, H * 0.75);
    bg.addColorStop(0, "#143a62"); bg.addColorStop(0.55, "#0b2038"); bg.addColorStop(1, "#050d1a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const R = Math.min(W * 0.46, H * 0.3);
    /* the ring above the head */
    const ty = H * 0.09;
    ring(W / 2, ty, R * 0.98, R * 0.17, 0.95, 0.5);
    ring(W / 2, ty, R * 0.62, R * 0.105, 0.55, 0.25);
    /* the ring below the feet, on a dark disc */
    const by = H * 0.925;
    const disc = ctx.createRadialGradient(W / 2, by, 2, W / 2, by, R * 1.1);
    disc.addColorStop(0, "rgba(70,160,255,.38)"); disc.addColorStop(1, "rgba(20,60,120,0)");
    ctx.fillStyle = disc; ctx.beginPath(); ctx.ellipse(W / 2, by, R * 1.1, R * 0.22, 0, 0, TAU); ctx.fill();
    ring(W / 2, by, R * 0.98, R * 0.17, 0.95, 0.5);
    ring(W / 2, by, R * 0.62, R * 0.105, 0.55, 0.25);
  }
  const body = document.body;
  function active() {
    return !document.hidden && body.classList.contains("body-only") && !body.classList.contains("in") && !body.classList.contains("icu-open") && !body.classList.contains("icu-gate");
  }
  function tick() {
    if (active()) {
      const changed = resize();
      const key = W + "x" + H;
      if (changed || drawn !== key) { paint(); drawn = key; }
    }
  }
  if ("ResizeObserver" in window) new ResizeObserver(function () { if (active()) tick(); }).observe(stage);
  new MutationObserver(tick).observe(body, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", tick);
  tick();
  window.__bodyStage = { frame: function () { return 0; }, vitals: function () { return {}; } };
})();
