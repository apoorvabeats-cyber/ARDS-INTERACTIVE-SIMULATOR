/* Small canvas drawings: ECG leads, sparkline trends and schematic CT slices. Everything is drawn from the lab's own numbers. */
export function ecgDraw(cv, leads, t, opt) {
  const g = cv.getContext("2d"), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H); opt = opt || {};
  const cols = leads.length > 4 ? 2 : 1, rows = Math.ceil(leads.length / cols), cw = W / cols, ch = H / rows;
  g.fillStyle = "#04101a"; g.fillRect(0, 0, W, H); g.strokeStyle = "rgba(54,214,255,.08)"; g.lineWidth = 1; for (let x = 0; x < W; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  leads.forEach((L, i) => {
    const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch, mid = y0 + ch * 0.58, amp = ch * 0.34; g.save(); g.beginPath(); g.rect(x0 + 2, y0 + 2, cw - 4, ch - 4); g.clip();
    g.strokeStyle = L.hot ? "#ff8a8a" : "#7fe9a9"; g.lineWidth = 1.8; g.beginPath(); const beat = opt.beat || 0.9, n = Math.floor(cw - 36);
    for (let px = 0; px < n; px++) { const ph = (((px / n) * 2.4 + (t || 0) * 0.35) % beat) / beat; const v = beatShape(ph, L, opt); const X = x0 + 30 + px, Y = mid - v * amp; px ? g.lineTo(X, Y) : g.moveTo(X, Y); }
    g.stroke(); g.restore(); g.fillStyle = "#cfeeff"; g.font = "700 11px system-ui,sans-serif"; g.fillText(L.n, x0 + 6, y0 + 14);
    g.strokeStyle = "rgba(255,255,255,.15)"; g.beginPath(); g.moveTo(x0 + 28, mid); g.lineTo(x0 + cw - 4, mid); g.stroke();
  });
}
const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
/* one cardiac cycle (0..1): P, QRS, ST segment with a chosen ST shift, T wave. L = { r (QRS polarity/size), st (ST shift), t (T size), q (Q wave depth) } */
function beatShape(ph, L, opt) {
  if (opt.vf) return 0.45 * Math.sin(ph * 38 + 1) * Math.sin(ph * 9) + 0.2 * Math.sin(ph * 71);
  const r = L.r == null ? 1 : L.r, st = L.st || 0, tt = L.t == null ? 0.35 : L.t, q = L.q || 0;
  let v = 0.12 * gauss(ph, 0.16, 0.022); v -= q * 0.4 * gauss(ph, 0.285, 0.006); v += r * 0.95 * gauss(ph, 0.31, 0.0075); v -= Math.abs(r) * 0.18 * gauss(ph, 0.335, 0.007);
  const stw = ph > 0.34 && ph < 0.62 ? Math.min(1, (ph - 0.34) / 0.05) * Math.min(1, (0.62 - ph) / 0.05) : 0; v += st * stw; v += tt * gauss(ph, 0.55, 0.06); return v;
}
export function spark(cv, series, col, lo, hi) {
  const g = cv.getContext("2d"), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H); g.strokeStyle = col || "#36d6ff"; g.lineWidth = 2; g.beginPath();
  series.forEach((v, i) => { const x = (i / Math.max(1, series.length - 1)) * (W - 4) + 2, y = H - 3 - ((v - lo) / (hi - lo || 1)) * (H - 6); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
}
