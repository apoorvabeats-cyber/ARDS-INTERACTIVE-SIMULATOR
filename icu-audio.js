/* Monitor audio for the hub. Must start inside a tap or a phone will stay silent. */
(function () {
  "use strict";
  const file = () => decodeURIComponent((location.pathname.split("/").pop() || "").split("?")[0]);
  let ctx = null, enabled = false, noise = null, timer = 0;
  let pulseAt = 0, breathAt = 0, alarmAt = 0, saidAt = 0;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Sound off";
  btn.setAttribute("aria-pressed", "false");
  btn.style.cssText = "position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:99999;border:0;border-radius:999px;padding:14px 22px;min-width:148px;font:800 16px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#b72b39;color:#fff;box-shadow:0 8px 24px #0006";

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function ensure() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!ctx) ctx = new C();
    if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} }
    if (!noise && ctx) {
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }
  function tone(freq, dur, gain, type) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.linearRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function puff(freq, dur, gain) {
    const c = ensure();
    if (!c || !noise) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = noise;
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 0.8;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur);
  }
  function playPulse(kind) {
    if (kind === "absent") return;
    if (kind === "weak") tone(480, 0.06, 0.18, "sine");
    else if (kind === "bounding") { tone(990, 0.08, 0.35, "sine"); tone(1480, 0.05, 0.12, "triangle"); }
    else { tone(880, 0.07, 0.28, "sine"); tone(1320, 0.04, 0.08, "sine"); }
  }
  function playVf() {
    const c = ensure();
    if (!c || !noise) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = noise;
    f.type = "bandpass";
    f.frequency.setValueAtTime(70 + Math.random() * 90, t);
    f.Q.value = 0.5;
    g.gain.setValueAtTime(0.22, t);
    g.gain.linearRampToValueAtTime(0.001, t + 0.32);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + 0.34);
    tone(90 + Math.random() * 70, 0.05, 0.12, "sawtooth");
  }
  function playAsystole() {
    tone(420, 0.55, 0.18, "square");
  }
  function playBreath(kind) {
    if (kind === "vent") {
      tone(1600, 0.03, 0.16, "square");
      puff(520, 0.38, 0.14);
      setTimeout(() => { if (enabled) puff(280, 0.45, 0.06); }, 420);
    } else {
      puff(700, 0.65, 0.1);
    }
  }
  function playAlarm() {
    tone(880, 0.16, 0.22, "square");
    setTimeout(() => { if (enabled) tone(620, 0.18, 0.22, "square"); }, 180);
  }
  function say(text) {
    if (!window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-IN";
      u.rate = 0.95;
      u.volume = 1;
      const voices = speechSynthesis.getVoices();
      const v = voices.find((x) => /en-IN/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.resume();
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function sayCorrect() {
    if (!enabled) return;
    const now = performance.now();
    if (now - saidAt < 1200) return;
    saidAt = now;
    try { speechSynthesis.cancel(); } catch (e) {}
    say("Correct");
  }
  function sayWrong() {
    if (!enabled) return;
    const now = performance.now();
    if (now - saidAt < 1200) return;
    saidAt = now;
    try { speechSynthesis.cancel(); } catch (e) {}
    say("Wrong");
  }
  function rhythmState(rhythm, pulse, hr) {
    const r = String(rhythm || "").toLowerCase();
    const none = /none|^no\b/.test(String(pulse || "").toLowerCase());
    const bpm = parseFloat(hr) || 0;
    if (/asystole/.test(r)) return { pulse: null, breath: null, alarm: true, rhythmSound: "asystole" };
    if (/(^|[^a-z])vf([^a-z]|$)|ventricular fibrillation|polymorphic|torsade|^poly$/.test(r)) return { pulse: null, breath: null, alarm: true, rhythmSound: "vf" };
    if (none || /\bpea\b|pulseless|^pvt$/.test(r)) return { pulse: null, breath: null, alarm: true, rhythmSound: "arrest" };
    let kind = "normal";
    const rate = bpm || (/svt/.test(r) ? 180 : /vt|tachy/.test(r) ? 150 : /brady|block/.test(r) ? 40 : 78);
    if (/afib|atrial fibrillation|^af$|sinus_arr|irregular/.test(r)) kind = "irregular";
    else if (rate >= 120 || /\bvt\b|svt|tachy/.test(r)) kind = "bounding";
    else if (rate < 50 || /brady|block/.test(r)) kind = "weak";
    return { pulse: { bpm: rate, kind: kind }, breath: null, alarm: rate < 40 || rate > 160 };
  }
  function byId(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const raw = el.value != null && String(el.value) !== "" ? el.value : el.textContent;
    const n = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function grab(re) {
    const m = re.exec(document.body ? document.body.innerText : "");
    return m ? parseFloat(m[1]) : null;
  }
  function labels() {
    const out = {};
    document.querySelectorAll(".lbl").forEach((el) => {
      const box = el.parentElement;
      if (!box) return;
      const val = box.querySelector(".val");
      const unit = box.querySelector(".unit");
      if (!val) return;
      out[el.textContent.replace(/\s+/g, " ").trim().toUpperCase()] = {
        num: parseFloat(String(val.textContent).replace(/[^\d.-]/g, "")),
        unit: unit ? unit.textContent : "",
        danger: val.classList.contains("danger") || val.classList.contains("hi"),
      };
    });
    return out;
  }
  function read() {
    const name = file();
    if (document.body && document.body.dataset && document.body.dataset.rhythm) {
      const d = document.body.dataset;
      const st = rhythmState(d.rhythm, d.pulse, d.hr);
      if (st.rhythmSound) st.breath = { bpm: 10, kind: "vent" };
      return st;
    }
    if (/ACLS_Interactive_Simulator/.test(name) || name === "acls.html") {
      const pills = [...document.querySelectorAll(".pill")].map((p) => p.textContent);
      const pulseLine = pills.find((t) => /pulse/i.test(t)) || "";
      const rhythm = (document.getElementById("rlabel") || {}).textContent || "";
      if (!pulseLine && !rhythm) return { pulse: null, breath: null, alarm: false };
      const none = /none/i.test(pulseLine);
      const st = rhythmState(rhythm, none ? "none" : "yes", null);
      if (st.pulse) {
        if (/SVT/i.test(rhythm)) st.pulse.bpm = 180;
        else if (/\bVT\b/i.test(rhythm)) st.pulse.bpm = 170;
        else if (/brady/i.test(rhythm)) st.pulse.bpm = 38;
        else st.pulse.bpm = 80;
      }
      if (st.rhythmSound || none) st.breath = { bpm: 10, kind: "vent" };
      return st;
    }
    if (/Ventilator_Waveform|vent-waves\.html/.test(name)) {
      if (!document.getElementById("scalars")) return { pulse: null, breath: null, alarm: false };
      return { pulse: null, breath: { bpm: byId("s-rr") || 14, kind: "vent" }, alarm: !!document.querySelector("#nums b.hi") };
    }
    const L = labels();
    let hr = (L.HR && L.HR.num) || byId("hr") || grab(/\bHR\s+(\d{2,3})\b/) || grab(/Heart rate\s+(\d{2,3})/i);
    let rr = (L.RR && L.RR.num) || byId("rr") || byId("rrLive") || byId("s-rr") || grab(/\bRR\s+(\d{1,2})\b/) || grab(/Respiratory rate\s+(\d{1,2})/i);
    let spo2 = (L.SPO2 && L.SPO2.num) || byId("spo2") || grab(/SpO2\s+(\d{2,3})/i) || grab(/SpO₂\s+(\d{2,3})/i);
    let map = byId("map");
    let pp = null;
    if (L.ART && L.ART.unit) {
      const m = /MAP\s+(\d+)/.exec(L.ART.unit); if (m) map = +m[1];
      const p = /PP\s+(\d+)/.exec(L.ART.unit); if (p) pp = +p[1];
    }
    const ventBox = document.getElementById("ventbox");
    const ventMgr = document.getElementById("ventilatorManagement");
    const ventOpen = (ventBox && !ventBox.classList.contains("hidden")) ||
      (ventMgr && !ventMgr.classList.contains("hidden")) ||
      !!document.getElementById("scalars") ||
      !!document.getElementById("pulseCanvas");
    let kind = "normal";
    if (hr && hr < 50) kind = "weak";
    else if (map && map < 65) kind = "weak";
    else if ((pp && pp >= 60) || (hr && hr >= 120)) kind = "bounding";
    const alarm = !!(L.HR && L.HR.danger) || !!(L.SPO2 && L.SPO2.danger) || !!(L.ART && L.ART.danger) ||
      !!document.querySelector(".deranged, #nums b.hi, #labs b.hi") ||
      (spo2 != null && spo2 > 0 && spo2 < 90) ||
      (hr != null && (hr < 45 || hr > 145)) ||
      (map != null && map > 0 && map < 65);
    return {
      pulse: hr ? { bpm: hr, kind: kind } : null,
      breath: rr ? { bpm: rr, kind: ventOpen ? "vent" : "spont" } : null,
      alarm: !!alarm,
    };
  }
  function tick() {
    if (!enabled) return;
    ensure();
    const s = read();
    const now = performance.now();
    if (s && s.rhythmSound === "vf") {
      if (now >= pulseAt) { playVf(); pulseAt = now + 680; }
    } else if (s && s.pulse && s.pulse.kind !== "absent" && s.pulse.bpm > 20) {
      let wait = 60000 / clamp(s.pulse.bpm, 30, 200);
      if (s.pulse.kind === "irregular") wait *= 0.45 + Math.random() * 1.15;
      if (now >= pulseAt) { playPulse(s.pulse.kind); pulseAt = now + wait; }
    }
    if (s && s.breath && s.breath.bpm > 4) {
      const wait = 60000 / clamp(s.breath.bpm, 6, 48);
      if (now >= breathAt) { playBreath(s.breath.kind); breathAt = now + wait; }
    }
    if (s && s.alarm && now >= alarmAt) {
      if (s.rhythmSound === "asystole") playAsystole();
      else playAlarm();
      alarmAt = now + (s.rhythmSound === "asystole" ? 1500 : 2400);
    }
  }
  function enable() {
    if (enabled) { ensure(); return; }
    enabled = true;
    btn.textContent = "Sound on";
    btn.style.background = "#087f5b";
    btn.setAttribute("aria-pressed", "true");
    try { sessionStorage.setItem("icu-sound", "1"); } catch (e) {}
    ensure();
    tone(880, 0.12, 0.35, "sine");
    setTimeout(() => tone(1320, 0.1, 0.2, "sine"), 140);
    say("Sound on");
    pulseAt = breathAt = alarmAt = performance.now() + 400;
    clearInterval(timer);
    timer = setInterval(tick, 80);
    const old = document.getElementById("audioBtn");
    if (old) old.style.display = "none";
  }
  function disable() {
    enabled = false;
    btn.textContent = "Sound off";
    btn.style.background = "#b72b39";
    btn.setAttribute("aria-pressed", "false");
    try { sessionStorage.removeItem("icu-sound"); } catch (e) {}
    clearInterval(timer);
    try { speechSynthesis.cancel(); } catch (e) {}
  }
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (enabled) disable(); else enable();
  });
  document.addEventListener("pointerdown", (e) => {
    if (e.target === btn || btn.contains(e.target)) return;
    if (!enabled) enable();
  }, true);
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b === btn) return;
    setTimeout(() => {
      if (!enabled || /Cardiac_Rhythm_Decision/.test(file())) return;
      if (b.isConnected && /\bbad\b/.test(b.className)) { sayWrong(); return; }
      if (b.isConnected && /\b(good|on)\b/.test(b.className) && !/\bbad\b/.test(b.className)) { sayCorrect(); return; }
      const box = document.getElementById("why") || document.getElementById("fb") || document.getElementById("log");
      const t = box ? box.textContent.trim() : "";
      if (/^(Right[.\s]|Correct\b|That diagnosis fits)/.test(t)) sayCorrect();
      else if (/^(Not\b|Wrong\b|Incorrect\b|No[.,\s])/i.test(t)) sayWrong();
    }, 80);
  }, false);
  function mount() {
    if (!document.body) return;
    document.body.appendChild(btn);
    try { if (window.speechSynthesis) speechSynthesis.getVoices(); } catch (e) {}
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
  window.ICUAudio = { enable: enable, disable: disable, sayCorrect: sayCorrect, sayWrong: sayWrong, read: read };
})();
