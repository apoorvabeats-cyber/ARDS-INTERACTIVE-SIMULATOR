/* Spoken welcomes: a female voice with a big-hall echo, one short clip for each place.
   window.ccuWelcome("aud" | "hub" | "mdt" | "cmd"). If the phone will not start sound without a touch,
   the clip waits for the first touch. The same place never repeats within half a minute. */
(function () {
  "use strict";
  const base = (function () { try { return document.currentScript.src.replace(/[^/]*$/, ""); } catch (e) { return ""; } })();
  let playing = null;
  window.ccuWelcome = function (key) {
    if (!/^(aud|hub|mdt|cmd)$/.test(key)) return;
    try {
      const k = "ccu-welcome-" + key, last = +sessionStorage.getItem(k) || 0;
      if (Date.now() - last < 30000) return;
      sessionStorage.setItem(k, String(Date.now()));
    } catch (e) { /* storage may be blocked: say it anyway */ }
    try { if (playing) playing.pause(); } catch (e) { /* ignore */ }
    const a = new Audio(base + "voice/welcome-" + key + ".mp3?v=20261122e");
    a.volume = 0.95; a.preload = "auto"; playing = a;
    const arm = function () {
      const evs = ["pointerdown", "touchend", "click", "keydown"], t0 = Date.now();
      const go = function () { evs.forEach(function (e) { document.removeEventListener(e, go, true); }); if (Date.now() - t0 < 25000) a.play().catch(function () { /* ignore */ }); };
      evs.forEach(function (e) { document.addEventListener(e, go, true); });
    };
    try { const p = a.play(); if (p && p.catch) p.catch(arm); } catch (e) { arm(); }
  };
})();
