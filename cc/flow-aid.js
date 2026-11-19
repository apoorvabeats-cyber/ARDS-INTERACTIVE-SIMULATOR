/* Flow-model aids: an on-stage key for the coloured particles, and a male voice-over that explains the flow.
   Used by cc/lab.html, the three DKA labs and the septic shock lab.

   FlowAid.mount({
     stage:  element that holds the 3D canvas (position:relative)
     key:    [[css colour, "Red dots", "blood cells flowing along the vessel"], ...]   one row per particle type or part
     intro:  one or two sentences saying what the scene is
     state:  () => sentence(s) about the current readings            (optional)
     stages: () => [{t:"spoken text", fn:()=>camera or view change}] (optional)
     outro:  closing sentence                                          (optional)
   }) -> { show(bool), setKey(rows) }
   FlowAid.vo(text, queue)  speaks a line: here when the page stands alone, or by message when it sits in Pathology Live
   (the parent page owns the single voice toggle). window.__mute silences it.                                           */
(function (g) {
  "use strict";
  const emb = (function () { try { return parent !== window; } catch (e) { return false; } })();
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  const F = { on: true, tok: 0, running: false };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  /* ---------- voice ---------- */
  let voice = null;
  function pick() {
    if (!synth) return;
    const vs = synth.getVoices() || [];
    const female = /female|woman|zira|samantha|karen|victoria|susan|tessa|moira|fiona|veena|heera|priya/i;
    const male = /male|david|mark|daniel|alex|rishi|ravi|aaron|fred|george|james|guy|hemant|prabhat|oliver|arthur/i;
    const en = vs.filter((v) => /^en/i.test(v.lang || "") && !female.test((v.name || "") + " " + (v.voiceURI || "")));
    voice = en.find((v) => male.test((v.name || "") + " " + (v.voiceURI || ""))) || en[0] || null;
  }
  if (synth) { pick(); synth.addEventListener && synth.addEventListener("voiceschanged", pick); }
  const parts = (t) => String(t).match(/[^.!?]+[.!?]*/g) || [String(t)];
  const est = (t) => Math.max(1200, String(t).length * 75 + 500); /* ms, for pages that cannot hear the voice end */
  const stripTags = (h) => String(h).replace(/<br\s*\/?>/gi, ". ").replace(/<[^>]+>/g, "");

  function speakLocal(t, queue) {
    if (!synth || !F.on || !t) return;
    try {
      if (!queue) synth.cancel();
      parts(t).forEach((p) => {
        if (!p.trim()) return;
        const u = new SpeechSynthesisUtterance(p.trim());
        u.rate = .88; u.pitch = .8; u.volume = .8;
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        synth.speak(u);
      });
    } catch (e) { /* speech is a bonus */ }
  }
  F.vo = function (t, queue) {
    if (!t || g.__mute) return;
    t = stripTags(t);
    if (emb) { parent.postMessage({ vo: t, q: !!queue }, "*"); return; }
    speakLocal(t, queue);
  };
  /* speak one step of the explanation and resolve when it ends (or, in a parent-owned voice, after an estimate) */
  function say(t, first) {
    return new Promise((res) => {
      if (g.__mute) { setTimeout(res, 800); return; }
      if (emb) { parent.postMessage({ vo: t, q: !first }, "*"); setTimeout(res, est(t)); return; }
      if (!synth || !F.on) { setTimeout(res, Math.min(est(t), 4500)); return; }
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      try {
        if (first) synth.cancel();
        const ps = parts(t).filter((p) => p.trim());
        ps.forEach((p, i) => {
          const u = new SpeechSynthesisUtterance(p.trim());
          u.rate = .88; u.pitch = .8; u.volume = .8;
          if (voice) { u.voice = voice; u.lang = voice.lang; }
          if (i === ps.length - 1) { u.onend = fin; u.onerror = fin; }
          synth.speak(u);
        });
      } catch (e) { fin(); }
      setTimeout(fin, est(t) * 2 + 3000);
    });
  }
  F.stop = function () {
    F.tok++; F.running = false;
    if (emb) parent.postMessage({ stopvo: 1 }, "*"); else if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
  };

  /* ---------- on-stage key and explain button ---------- */
  const CSS = `
.fa-bar{position:absolute;left:8px;top:8px;z-index:4;display:flex;gap:6px;flex-wrap:wrap;max-width:calc(100% - 40px)}
.fa-bar button{font:600 12px/1 system-ui,sans-serif;color:#e6f1fb;background:rgba(6,17,31,.78);border:1px solid #3fe0f0;border-radius:999px;padding:7px 11px;cursor:pointer}
.fa-bar button[aria-pressed="true"]{background:#0a7f8f;border-color:#3fe0f0;color:#fff}
.fa-key{position:absolute;left:8px;top:44px;z-index:3;max-width:min(60%,290px);max-height:38%;overflow:auto;touch-action:pan-y;background:rgba(6,17,31,.8);color:#e6f1fb;border:1px solid rgba(63,224,240,.45);border-radius:10px;padding:6px 8px;font:11px/1.3 system-ui,sans-serif}
.fa-key b{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8fd8e6;margin-bottom:3px}
.fa-key div{display:flex;gap:7px;align-items:flex-start;padding:2px 3px;border-radius:5px}
.fa-key div.on{background:rgba(63,224,240,.22)}
.fa-key i{flex:none;width:10px;height:10px;border-radius:50%;margin-top:3px;box-shadow:0 0 0 1px rgba(255,255,255,.55)}
.fa-key i.sq{border-radius:2px}
.fa-key i.dc{border-radius:50% / 30%}
.fa-key span{color:#cfe4f0}.fa-key strong{color:#fff;font-weight:700}
.fa-cap{position:absolute;left:10px;right:34px;bottom:8px;z-index:5;display:none;background:rgba(6,17,31,.86);color:#fff;border-radius:10px;padding:8px 10px;font:13px/1.4 system-ui,sans-serif;pointer-events:none}
.fa-cap.on{display:block}
.fa-hide .fa-bar,.fa-hide .fa-key,.fa-hide .fa-cap{display:none!important}`;

  F.mount = function (o) {
    const st = o.stage; if (!st) return null;
    if (!document.getElementById("fa-css")) { const s = document.createElement("style"); s.id = "fa-css"; s.textContent = CSS; document.head.appendChild(s); }
    let rows = o.key || [], shown = true, keyOn = true;
    const bar = document.createElement("div"); bar.className = "fa-bar";
    const bKey = document.createElement("button"); bKey.type = "button"; bKey.textContent = "Key"; bKey.setAttribute("aria-pressed", "true");
    const bEx = document.createElement("button"); bEx.type = "button"; bEx.textContent = "Explain flow";
    const bV = document.createElement("button"); bV.type = "button"; bV.textContent = "Voice on"; bV.setAttribute("aria-pressed", "true");
    bar.appendChild(bKey); bar.appendChild(bEx); if (!emb && synth) bar.appendChild(bV);
    const key = document.createElement("div"); key.className = "fa-key"; key.setAttribute("aria-label", "What the coloured particles mean");
    const cap = document.createElement("div"); cap.className = "fa-cap"; cap.setAttribute("aria-live", "polite");
    st.appendChild(bar); st.appendChild(key); st.appendChild(cap);

    function draw(hi) {
      key.innerHTML = "<b>What you are seeing</b>" + rows.map((r, i) =>
        '<div class="' + (i === hi ? "on" : "") + '"><i class="' + (r[3] || "") + '" style="background:' + esc(r[0]) + '"></i><span><strong>' + esc(r[1]) + "</strong> " + esc(r[2]) + "</span></div>").join("");
      key.style.display = keyOn && shown && rows.length ? "" : "none";
    }
    draw(-1);
    bKey.onclick = () => { keyOn = !keyOn; bKey.setAttribute("aria-pressed", keyOn); draw(-1); };
    bV.onclick = () => { F.on = !F.on; bV.setAttribute("aria-pressed", F.on); bV.textContent = F.on ? "Voice on" : "Voice off"; if (!F.on && synth) synth.cancel(); };

    function endRun() { F.running = false; bEx.textContent = "Explain flow"; bEx.setAttribute("aria-pressed", "false"); cap.classList.remove("on"); draw(-1); }
    async function run() {
      if (F.running) { F.stop(); endRun(); return; }
      F.running = true; const my = ++F.tok; let first = true;
      bEx.textContent = "Stop"; bEx.setAttribute("aria-pressed", "true");
      keyOn = true; bKey.setAttribute("aria-pressed", "true");
      const steps = [];
      if (o.intro) steps.push({ t: o.intro });
      if (rows.length) {
        steps.push({ t: "The coloured dots and shapes mean the following." });
        rows.forEach((r, i) => steps.push({ t: r[1] + " " + (/^(show|mean|are|is)\b/i.test(r[2]) ? "" : "show ") + r[2] + ".", hi: i }));
      }
      if (o.state) { const s = o.state(); if (s) steps.push({ t: s }); }
      if (o.stages) o.stages().forEach((s) => steps.push({ t: s.t, fn: s.fn }));
      if (o.outro) steps.push({ t: o.outro });
      for (const s of steps) {
        if (F.tok !== my) return;
        if (s.fn) { try { s.fn(); } catch (e) { /* ignore */ } }
        draw(s.hi == null ? -1 : s.hi);
        cap.textContent = s.t; cap.classList.add("on");
        await say(s.t, first); first = false;
      }
      if (F.tok === my) endRun();
    }
    bEx.onclick = run;
    return {
      show(b) { shown = !!b; st.classList.toggle("fa-hide", !shown); if (!shown && F.running) { F.stop(); endRun(); } draw(-1); },
      setKey(r) { rows = r || []; draw(-1); },
      stop() { if (F.running) { F.stop(); endRun(); } },
      explain: run
    };
  };

  /* hex int or "#rrggbb" to css */
  F.css = (c) => typeof c === "number" ? "#" + c.toString(16).padStart(6, "0") : c;
  g.FlowAid = F;
})(window);
