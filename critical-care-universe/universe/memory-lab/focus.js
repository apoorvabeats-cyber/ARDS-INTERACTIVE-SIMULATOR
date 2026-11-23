/* Calm focus music for study sessions. One slow, beat-free ambient piece (soft pads, a deep bass note, a few quiet bell tones),
   made offline for this app. It plays while a card session or Rapid Recall is open and fades out when it ends.
   Two overlapping tracks give a seamless loop. Volume goes through WebAudio, because phones ignore element.volume. */
const SRC = new URL("./audio/focus.mp3", import.meta.url).href, LEVEL = 0.3, XF = 4;
let ctx = null, mg = null, cur = null, want = false, tm = null, blocked = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { ctx = new AC(); mg = ctx.createGain(); mg.gain.value = LEVEL; mg.connect(ctx.destination); } catch (e) { ctx = null; }
  return ctx;
}
function track() {
  const el = new Audio(SRC); el.preload = "auto"; el.loop = false;
  const g = ctx.createGain(); g.gain.value = 0; ctx.createMediaElementSource(el).connect(g); g.connect(mg);
  return { el, g, nx: null };
}
const ramp = (g, to, secs) => { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to, t + secs); };
function kill(t) { if (!t) return; setTimeout(() => { try { t.el.pause(); t.el.removeAttribute("src"); t.g.disconnect(); } catch (e) { /* ignore */ } }, 300); }

function tick() {
  if (!want || !cur || !cur.el.duration) return;
  if (!cur.nx && cur.el.duration - cur.el.currentTime < XF + 0.3) {
    const nx = track(); cur.nx = nx; nx.el.play().catch(() => {}); ramp(nx.g, 1, XF); ramp(cur.g, 0, XF);
    const old = cur; setTimeout(() => { kill(old); }, (XF + 0.4) * 1000); cur = nx;
  }
}
function begin() {
  const c = ensure(); if (!c || cur) return;
  try { c.resume(); } catch (e) { /* ignore */ }
  mg.gain.cancelScheduledValues(c.currentTime); mg.gain.setValueAtTime(LEVEL, c.currentTime);
  const t = track(); cur = t; blocked = false;
  const p = t.el.play(); if (p && p.catch) p.catch(() => { blocked = true; });
  ramp(t.g, 1, 3.5); tm = setInterval(tick, 400);
}
function end() {
  clearInterval(tm); tm = null; const t = cur; cur = null; if (!t || !ctx) return;
  if (t.nx) kill(t.nx);
  ramp(t.g, 0, 1.4); kill(t); setTimeout(() => { kill(t); }, 1500);
}
/* a browser may refuse to start sound until the learner touches the page: try again on the next touch */
function retry() { if (want && blocked && cur) { blocked = false; try { ctx.resume(); } catch (e) { /* ignore */ } const p = cur.el.play(); if (p && p.catch) p.catch(() => { blocked = true; }); } }
["pointerdown", "keydown", "touchend"].forEach((e) => document.addEventListener(e, retry, { passive: true }));
document.addEventListener("visibilitychange", () => { if (!ctx || !want) return; if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); });

export const Focus = {
  set(on) { on = !!on; if (on === want) return; want = on; if (on) begin(); else end(); },
  get playing() { return want; },
};
