/* Pre-recorded female announcements (made offline, so every device sounds the same), played through one shared WebAudio context.
   Browsers keep audio locked until the first tap or key press, so the first touch anywhere unlocks it for later clips.
   play(name) -> Promise<boolean>  resolves true when the clip has finished, false when it could not be played. */
const BASE = new URL("./memory-voice/", import.meta.url);
let ctx = null, cur = null, seq = 0;
const bufs = new Map(), pend = new Map();

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; }
  return ctx;
}
function unlock() {
  const c = ensure(); if (!c) return;
  if (c.state !== "running") { try { c.resume(); } catch (e) { /* ignore */ } }
  try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (e) { /* ignore */ }
}
["pointerdown", "touchend", "click", "keydown"].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

function load(name) {
  if (bufs.has(name)) return Promise.resolve(bufs.get(name));
  if (pend.has(name)) return pend.get(name);
  const c = ensure(); if (!c) return Promise.resolve(null);
  const p = fetch(new URL(name + ".mp3", BASE)).then((r) => { if (!r.ok) throw new Error("clip " + r.status); return r.arrayBuffer(); })
    .then((ab) => new Promise((ok, no) => { const r = c.decodeAudioData(ab, ok, no); if (r && r.then) r.then(ok, no); }))
    .then((b) => { bufs.set(name, b); pend.delete(name); return b; })
    .catch(() => { pend.delete(name); return null; });
  pend.set(name, p); return p;
}
export function preload(names) { names.forEach((n) => { load(n); }); }
export function stop() { seq++; if (cur) { try { cur.s.stop(); } catch (e) { /* ignore */ } try { cur.done(false); } catch (e) { /* ignore */ } cur = null; } }
export function play(name, vol) {
  stop(); const mine = ++seq;     /* a newer tap replaces an older clip that is still loading */
  return load(name).then((b) => new Promise((done) => {
    const c = ctx; if (!b || !c || mine !== seq) return done(false);
    try {
      if (c.state !== "running") c.resume();
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol == null ? 0.9 : vol; s.connect(g); g.connect(c.destination);
      const me = { s, done: (v) => { me.done = () => {}; done(v); } }; cur = me;
      s.onended = () => { if (cur === me) cur = null; me.done(true); }; s.start();
    } catch (e) { done(false); }
  }));
}
