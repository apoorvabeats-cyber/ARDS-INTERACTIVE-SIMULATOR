/* Soft synthesised sound for the Critical Care Universe: sliding gates, ICU monitor beeps, gentle alarms and the outdoor ambience
   (birds by day, crickets and an owl by night). Everything is generated with Web Audio, so there are no files to load.
   createSfx() -> { unlock(), setOn(b), setListener(x,z,yaw), door(opening,pos?), chime(kind), beep(opt), alert(level,pos?), step(vol), startOutdoor(phase), stopOutdoor(), tick() } */

export function createSfx() {
  let ac = null, master = null, nb = null, on = true, bus = null, timers = [], outG = null, outNodes = [];
  const L = { x: 0, z: 0, yaw: 0 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const S = {};

  function ctx() {
    if (ac) return ac;
    const A = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!A) return null;
    try { ac = new A(); } catch (e) { return null; }
    master = ac.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ac.destination);
    return ac;
  }
  S.unlock = () => { const c = ctx(); if (c && c.state === "suspended") c.resume().catch(() => {}); return !!c; };
  S.setOn = (b) => { on = !!b; if (master) master.gain.value = on ? 0.9 : 0; if (!on) S.stopOutdoor(); };
  S.isOn = () => on;
  S.ready = () => !!(ac && master && ac.state === "running");
  S.setListener = (x, z, yaw) => { L.x = x; L.z = z; L.yaw = yaw; };
  const ready = () => ac && master && on && ac.state === "running";
  /* phones only allow sound after a tap has finished, so keep trying on every kind of gesture until the context is really running */
  if (typeof document !== "undefined") { const evs = ["pointerdown", "pointerup", "touchend", "click", "keydown"], kick = () => { S.unlock(); if (ac && ac.state === "running") evs.forEach((e) => document.removeEventListener(e, kick, true)); }; evs.forEach((e) => document.addEventListener(e, kick, true)); }

  const noiseBuf = () => {
    if (nb) return nb;
    const n = ac.sampleRate * 2; nb = ac.createBuffer(1, n, ac.sampleRate);
    const d = nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return nb;
  };
  /* a gain stage with an optional stereo pan, ending at the master bus */
  const outTo = (pan, gain, dest) => {
    const g = ac.createGain(); g.gain.value = gain; let last = g;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); last = p; }
    last.connect(dest || master); return g;
  };
  /* where a sound at world (x, z) sits relative to the listener: stereo pan and a distance gain */
  const place = (pos) => {
    if (!pos) return { pan: 0, gain: 1 };
    const dx = pos.x - L.x, dz = pos.z - L.z, d = Math.hypot(dx, dz), a = Math.atan2(dx, -dz) - L.yaw;
    return { pan: Math.sin(a) * Math.min(1, d / 2.5) * 0.9, gain: 1 / (1 + d * 0.16) };
  };
  const env = (g, t0, a, peak, d, end) => {
    g.gain.cancelScheduleAndHoldAtTime ? g.gain.cancelScheduleAndHoldAtTime(t0) : g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    return t0 + a + d + (end || 0);
  };

  /* ---------- a new result has arrived: a short, clear chime (lab: two notes, imaging: three, finding: one soft bell) ---------- */
  S.chime = (kind) => {
    if (!ready()) return;
    const seq = { lab: [659, 880], img: [523, 659, 784], find: [740], alert: [988, 740] }[kind] || [784], t = ac.currentTime, out = outTo(0, 1);
    seq.forEach((f, i) => [[f, 0.2], [f * 2.0, 0.05]].forEach(([fr, pk]) => {
      const os = ac.createOscillator(); os.type = "sine"; os.frequency.value = fr; const g = ac.createGain(); os.connect(g); g.connect(out);
      env(g, t + i * 0.14, 0.012, pk, 0.7); os.start(t + i * 0.14); os.stop(t + i * 0.14 + 0.9);
    }));
  };

  /* ---------- sliding gate: motor whine, rail whoosh, latch click and a soft closing thunk ---------- */
  S.door = (opening, pos, size) => {
    if (!ready()) return;
    const t = ac.currentTime, p = place(pos), k = (size || 1) * p.gain, dur = 1.25;
    const o = outTo(p.pan, 4.4 * k);
    const click = ac.createBufferSource(); click.buffer = noiseBuf();
    const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2200;
    const cg = ac.createGain(); click.connect(hp); hp.connect(cg); cg.connect(o); env(cg, t, 0.004, 0.09, 0.05);
    click.start(t, Math.random(), 0.1);
    const m = ac.createOscillator(); m.type = "sawtooth";
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
    const mg = ac.createGain(); m.connect(lp); lp.connect(mg); mg.connect(o);
    m.frequency.setValueAtTime(opening ? 78 : 118, t + 0.05); m.frequency.linearRampToValueAtTime(opening ? 150 : 84, t + dur * 0.55); m.frequency.linearRampToValueAtTime(opening ? 112 : 70, t + dur);
    env(mg, t + 0.05, 0.22, 0.045, dur - 0.2); m.start(t + 0.05); m.stop(t + dur + 0.2);
    const w = ac.createBufferSource(); w.buffer = noiseBuf(); w.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(opening ? 420 : 1700, t + 0.08); bp.frequency.exponentialRampToValueAtTime(opening ? 1700 : 420, t + dur);
    const wg = ac.createGain(); w.connect(bp); bp.connect(wg); wg.connect(o); env(wg, t + 0.08, 0.3, 0.07, dur - 0.25); w.start(t + 0.08); w.stop(t + dur + 0.2);
    const th = ac.createOscillator(); th.type = "sine"; th.frequency.setValueAtTime(opening ? 120 : 95, t + dur); th.frequency.exponentialRampToValueAtTime(52, t + dur + 0.16);
    const tg = ac.createGain(); th.connect(tg); tg.connect(o); env(tg, t + dur - 0.02, 0.01, opening ? 0.07 : 0.12, 0.16); th.start(t + dur - 0.02); th.stop(t + dur + 0.25);
    const ding = ac.createOscillator(); ding.type = "sine"; ding.frequency.value = opening ? 1318 : 988;
    const dg = ac.createGain(); ding.connect(dg); dg.connect(o); env(dg, t + dur - 0.05, 0.01, 0.025, 0.5); ding.start(t + dur - 0.05); ding.stop(t + dur + 0.6);
  };

  /* ---------- ICU monitor ---------- */
  S.beep = (o) => {
    if (!ready()) return;
    o = o || {}; const t = ac.currentTime, p = place(o.pos), v = (o.vol == null ? 1 : o.vol) * p.gain;
    if (v < 0.03) return;
    const out = outTo(p.pan, 0.15 * v);
    [[o.f || 880, 1], [(o.f || 880) * 2, 0.18]].forEach(([f, a]) => {
      const os = ac.createOscillator(); os.type = "sine"; os.frequency.value = f; const g = ac.createGain(); os.connect(g); g.connect(out); g.gain.value = 0;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + (o.len || 0.11)); os.start(t); os.stop(t + (o.len || 0.11) + 0.03);
    });
  };
  /* soft alarm phrases: level 1 = a calm two-note advisory, level 2 = a gentle three-note urgent call (never harsh) */
  S.alert = (level, pos) => {
    if (!ready()) return;
    const t = ac.currentTime, p = place(pos), out = outTo(p.pan, 0.26 * p.gain * (level > 1 ? 1.25 : 1));
    const notes = level > 1 ? [[784, 0], [659, 0.2], [784, 0.4], [988, 0.7]] : [[659, 0], [523, 0.22]];
    notes.forEach(([f, dt]) => {
      const os = ac.createOscillator(); os.type = "triangle"; os.frequency.value = f; const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
      const g = ac.createGain(); os.connect(lp); lp.connect(g); g.connect(out); env(g, t + dt, 0.012, 1, 0.2); os.start(t + dt); os.stop(t + dt + 0.3);
    });
  };

  /* ---------- footsteps: formal leather shoes on a hard floor, kept soft ---------- */
  let foot = 0;
  S.step = (vol) => {
    if (!ready()) return;
    /* phone speakers cannot play deep bass, so the step lives in the middle: a firm heel click near 1.6 kHz, a leather slap near 600 Hz and a short knock near 200 Hz */
    const t0 = ac.currentTime + 0.005, v = (vol == null ? 1 : vol) * 0.9, side = (foot++ % 2) ? 1 : -1, j = 0.93 + Math.random() * 0.14, out = outTo(side * 0.12, 1.4);
    const src = ac.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1700 * j; bp.Q.value = 0.9;
    const g1 = ac.createGain(); env(g1, t0, 0.002, v * 0.7, 0.03); src.connect(bp); bp.connect(g1); g1.connect(out);
    const bp2 = ac.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = 620 * j; bp2.Q.value = 0.7;
    const g2 = ac.createGain(); env(g2, t0 + 0.03, 0.006, v * 0.85, 0.09); src.connect(bp2); bp2.connect(g2); g2.connect(out);
    const o = ac.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(240 * j, t0); o.frequency.exponentialRampToValueAtTime(110, t0 + 0.09);
    const g3 = ac.createGain(); env(g3, t0, 0.004, v * 0.6, 0.1); o.connect(g3); g3.connect(out);
    src.start(t0, Math.random()); src.stop(t0 + 0.16); o.start(t0); o.stop(t0 + 0.14);
  };

  /* ---------- outdoor ambience ---------- */
  const later = (fn, ms) => { const id = setTimeout(() => { timers = timers.filter((x) => x !== id); fn(); }, ms); timers.push(id); };
  function chirp(day) {
    if (!ready() || !outG) return;
    const t = ac.currentTime + 0.02, pan = Math.random() * 1.6 - 0.8, out = outTo(pan, (0.7 + Math.random() * 0.9) * (day || 1), outG);
    const kind = Math.floor(Math.random() * 4), f0 = 2300 + Math.random() * 2400;
    const tone = (f1, f2, at, len, a) => {
      const os = ac.createOscillator(); os.type = "sine"; os.frequency.setValueAtTime(f1, t + at); os.frequency.exponentialRampToValueAtTime(Math.max(300, f2), t + at + len);
      const g = ac.createGain(); os.connect(g); g.connect(out); env(g, t + at, 0.008, a || 0.1, len); os.start(t + at); os.stop(t + at + len + 0.05);
    };
    if (kind === 0) { for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) tone(f0, f0 * 1.35, i * 0.13, 0.09); }          /* tweet tweet */
    else if (kind === 1) { tone(f0 * 0.7, f0 * 1.5, 0, 0.35, 0.12); tone(f0 * 1.5, f0 * 0.9, 0.36, 0.22, 0.08); }              /* rising whistle */
    else if (kind === 2) { for (let i = 0; i < 9; i++) tone(f0 + (i % 2) * 520, f0 + (i % 2) * 520 + 220, i * 0.055, 0.05, 0.07); }  /* trill */
    else { tone(f0, f0 * 0.8, 0, 0.12, 0.1); tone(f0 * 1.2, f0 * 1.6, 0.16, 0.1, 0.1); tone(f0 * 0.9, f0 * 1.1, 0.32, 0.18, 0.09); }
  }
  function owl() {
    if (!ready() || !outG) return;
    const t = ac.currentTime + 0.05, out = outTo(Math.random() * 1.2 - 0.6, 0.7, outG);
    [[0, 0.32], [0.5, 0.9]].forEach(([dt, len]) => {
      const os = ac.createOscillator(); os.type = "sine"; os.frequency.setValueAtTime(400, t + dt); os.frequency.linearRampToValueAtTime(350, t + dt + len);
      const g = ac.createGain(); os.connect(g); g.connect(out); env(g, t + dt, 0.12, 0.12, len); os.start(t + dt); os.stop(t + dt + len + 0.3);
    });
  }
  S.startOutdoor = (phase) => {
    if (!ready() || outG) return;
    outG = ac.createGain(); outG.gain.value = 0; outG.connect(master); outG.gain.linearRampToValueAtTime(1, ac.currentTime + 2.5);
    /* wind in the leaves */
    const w = ac.createBufferSource(); w.buffer = noiseBuf(); w.loop = true; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 0.35;
    const wg = ac.createGain(); wg.gain.value = 0.03; const lfo = ac.createOscillator(); lfo.frequency.value = 0.11; const lg = ac.createGain(); lg.gain.value = 0.012; lfo.connect(lg); lg.connect(wg.gain);
    w.connect(bp); bp.connect(wg); wg.connect(outG); w.start(); lfo.start(); outNodes.push(w, lfo);
    const night = phase === "night", dusk = phase === "dusk";
    if (night || dusk) {
      [[4300, 2.6, 0.55], [4780, 3.1, 0.4]].forEach(([f, rate, g0]) => {
        const c = ac.createOscillator(); c.frequency.value = f; const a1 = ac.createGain(); a1.gain.value = 0.5;
        const l1 = ac.createOscillator(); l1.type = "sine"; l1.frequency.value = 31; const l1g = ac.createGain(); l1g.gain.value = 0.5; l1.connect(l1g); l1g.connect(a1.gain);
        const a2 = ac.createGain(); a2.gain.value = 0.5; const l2 = ac.createOscillator(); l2.type = "square"; l2.frequency.value = rate; const l2g = ac.createGain(); l2g.gain.value = 0.5; l2.connect(l2g); l2g.connect(a2.gain);
        const og = ac.createGain(); og.gain.value = 0.012 * g0 * (night ? 1 : 0.6); c.connect(a1); a1.connect(a2); a2.connect(og); og.connect(outG); [c, l1, l2].forEach((n) => { n.start(); outNodes.push(n); });
      });
      const hoot = () => { if (!outG) return; owl(); later(hoot, 14000 + Math.random() * 16000); }; later(hoot, 4000 + Math.random() * 5000);
    }
    if (!night) { const sing = () => { if (!outG) return; chirp(dusk ? 0.6 : 1); later(sing, (dusk ? 2200 : 700) + Math.random() * (dusk ? 4200 : 2600)); }; later(sing, 400); }
  };
  S.stopOutdoor = () => {
    timers.forEach(clearTimeout); timers = [];
    if (outG && ac) { const g = outG, n = outNodes; try { g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(g.gain.value, ac.currentTime); g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8); } catch (e) {} setTimeout(() => { n.forEach((x) => { try { x.stop(); } catch (e) {} }); try { g.disconnect(); } catch (e) {} }, 1000); }
    outG = null; outNodes = [];
  };
  S.outdoorOn = () => !!outG;
  S.outdoorGain = (v) => { if (outG && ac) outG.gain.setTargetAtTime(clamp(v, 0, 1), ac.currentTime, 0.3); };
  return S;
}
