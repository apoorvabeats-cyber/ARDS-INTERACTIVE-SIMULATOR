(function(){
  const frame = document.getElementById("icu-frame");
  if(!frame) return;
  const monitor = document.getElementById("icu-monitor");
  const vent = document.getElementById("icu-vent");
  const enter = document.getElementById("icu-enter");
  const breath = frame.querySelector(".icu-breath");
  const tube = frame.querySelector(".icu-tube");
  const sim = {
    hr: 78,
    sbp: 118,
    dbp: 76,
    spo2: 98,
    rr: 16,
    vt: 450,
    peep: 8,
    fio2: 0.40,
    mode: "VC-AC"
  };
  const tiFrac = 0.33;
  let live = false;
  let raf = 0;
  let audioCtx = null;
  let master = null;
  let noise = null;
  let ventGain = null;
  let roomGain = null;
  let nextBeat = 0;
  const flags = { pulse: true, vent: true, room: true };

  function pip(){
    const flow = (sim.vt / 1000) / ((60 / sim.rr) * tiFrac);
    return Math.round(sim.peep + flow * 12 + (sim.vt / 50));
  }
  function pplat(){ return Math.round(sim.peep + sim.vt / 50); }
  function phase(now){
    const period = 60 / sim.rr;
    const t = (now / 1000) % period;
    return { period: period, t: t, insp: t < period * tiFrac, frac: t / period };
  }
  function fit(canvas){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if(canvas.width !== w || canvas.height !== h){
      canvas.width = w;
      canvas.height = h;
    }
    return canvas.getContext("2d");
  }
  function ecg(u){
    const x = u % 1;
    if(x < 0.08) return 0.05;
    if(x < 0.12) return -0.15;
    if(x < 0.16) return 1;
    if(x < 0.2) return -0.28;
    if(x < 0.36) return 0.02;
    if(x < 0.48) return 0.22 * Math.sin((x - 0.36) / 0.12 * Math.PI);
    return 0;
  }
  function art(u){
    const x = u % 1;
    if(x < 0.12) return Math.pow(Math.sin(x / 0.12 * Math.PI), 0.55);
    return Math.exp(-(x - 0.12) * 3.1);
  }
  function pleth(u){
    const x = (u + 0.12) % 1;
    const rise = x < 0.18 ? x / 0.18 : Math.exp(-(x - 0.18) * 2.4);
    return rise + 0.08 * Math.sin(x * Math.PI * 2);
  }
  function drawMonitor(now){
    const ctx = fit(monitor);
    const w = monitor.width, h = monitor.height;
    ctx.fillStyle = "#061018";
    ctx.fillRect(0, 0, w, h);
    const beat = sim.hr / 60;
    const lanes = [
      { color: "#3ee07a", label: "II", value: String(sim.hr), wave: function(u){ return ecg(u * beat); } },
      { color: "#ff4d4d", label: "ART", value: sim.sbp + "/" + sim.dbp, wave: function(u){ return art((u * beat) - 0.12); } },
      { color: "#5ec8ff", label: "PLETH", value: String(sim.spo2), wave: function(u){ return pleth(u * beat); } }
    ];
    const laneH = h / lanes.length;
    lanes.forEach(function(lane, i){
      const top = i * laneH;
      ctx.strokeStyle = lane.color;
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = Math.max(1.4, h * 0.012);
      ctx.beginPath();
      const steps = Math.ceil(w);
      for(let x = 0; x < steps; x++){
        const sec = (now / 1000) - ((w - x) / w) * 4.2;
        const y = top + laneH * (0.72 - lane.wave(sec) * 0.46);
        if(x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = lane.color;
      ctx.font = (laneH * 0.16) + "px ui-sans-serif,sans-serif";
      ctx.fillText(lane.label, 8, top + laneH * 0.22);
      ctx.font = (laneH * 0.28) + "px ui-sans-serif,sans-serif";
      ctx.fillText(lane.value, 8, top + laneH * 0.48);
    });
    ctx.fillStyle = "#8aa0aa";
    ctx.font = (h * 0.045) + "px ui-sans-serif,sans-serif";
    ctx.fillText("RR " + sim.rr + "  SIM", 8, h - 6);
  }
  function ventSample(frac){
    const insp = frac < tiFrac;
    const f = insp ? 1 : Math.max(0, 1 - (frac - tiFrac) / (0.45 * (1 - tiFrac)));
    const flow = insp ? 1 : -0.85 * Math.exp(-(frac - tiFrac) / 0.12);
    const vol = insp ? frac / tiFrac : Math.max(0, 1 - (frac - tiFrac) / (1 - tiFrac));
    const pres = sim.peep + (insp ? (pip() - sim.peep) * (0.55 + 0.45 * (frac / tiFrac)) : (pplat() - sim.peep) * Math.exp(-(frac - tiFrac) / 0.1));
    return { flow: flow, vol: vol, pres: pres, insp: insp, f: f };
  }
  function drawVent(now){
    const ctx = fit(vent);
    const w = vent.width, h = vent.height;
    ctx.fillStyle = "#071422";
    ctx.fillRect(0, 0, w, h);
    const names = ["Flow", "Paw", "Vol"];
    const colors = ["#7fd4e6", "#e2b48a", "#9ad7ff"];
    const laneH = h * 0.72 / 3;
    const period = 60 / sim.rr;
    for(let lane = 0; lane < 3; lane++){
      const top = lane * laneH + 4;
      ctx.strokeStyle = "rgba(127,212,230,.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, top + laneH * 0.62);
      ctx.lineTo(w, top + laneH * 0.62);
      ctx.stroke();
      ctx.strokeStyle = colors[lane];
      ctx.lineWidth = Math.max(1.3, h * 0.01);
      ctx.beginPath();
      for(let x = 0; x < w; x++){
        const ago = ((w - x) / w) * period * 2;
        const frac = ((now / 1000 - ago) % period + period) % period / period;
        const s = ventSample(frac);
        const v = lane === 0 ? s.flow : lane === 1 ? (s.pres - sim.peep) / (pip() - sim.peep + 0.01) : s.vol;
        const y = top + laneH * (0.78 - (v * 0.5 + (lane === 0 ? 0.28 : 0)));
        if(x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = colors[lane];
      ctx.font = (laneH * 0.28) + "px ui-sans-serif,sans-serif";
      ctx.fillText(names[lane], 6, top + laneH * 0.28);
    }
    ctx.fillStyle = "#d5e7ee";
    ctx.font = (h * 0.055) + "px ui-sans-serif,sans-serif";
    const line = sim.mode + "  VT " + sim.vt + "  RR " + sim.rr + "  PEEP " + sim.peep + "  FiO2 " + sim.fio2.toFixed(2);
    ctx.fillText(line, 6, h * 0.78);
    ctx.fillStyle = "#8aa0aa";
    ctx.font = (h * 0.048) + "px ui-sans-serif,sans-serif";
    ctx.fillText("PIP " + pip() + "   Pplat " + pplat() + "   simulated", 6, h * 0.9);
  }
  function frameTick(now){
    if(!live) return;
    drawMonitor(now);
    drawVent(now);
    const p = phase(now);
    if(breath) breath.style.transform = "scaleY(" + (p.insp ? 1 + 0.045 * (p.t / (p.period * tiFrac)) : 1 + 0.045 * Math.exp(-(p.t - p.period * tiFrac) / 0.55)) + ")";
    if(tube) tube.style.transform = "translate(" + (p.insp ? 1.1 : 0) + "%," + (p.insp ? -0.4 : 0) + "%)";
    if(audioCtx) mix(p);
    raf = requestAnimationFrame(frameTick);
  }
  function mix(p){
    if(!master) return;
    const allow = !document.getElementById("sound") || document.getElementById("sound").getAttribute("aria-pressed") !== "false";
    master.gain.setTargetAtTime(allow ? 0.9 : 0, audioCtx.currentTime, 0.05);
    if(ventGain) ventGain.gain.setTargetAtTime(allow && flags.vent ? (p.insp ? 0.22 : 0.05) : 0, audioCtx.currentTime, 0.08);
    if(roomGain) roomGain.gain.setTargetAtTime(allow && flags.room ? 0.03 : 0, audioCtx.currentTime, 0.1);
    if(allow && flags.pulse && audioCtx.currentTime >= nextBeat){
      beep();
      nextBeat = audioCtx.currentTime + 60 / sim.hr;
    }
  }
  function beep(){
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  }
  function startAudio(){
    if(audioCtx){
      if(audioCtx.state === "suspended") audioCtx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    audioCtx = new Ctx();
    master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(audioCtx.destination);
    const seconds = 1;
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * seconds, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.7;
    ventGain = audioCtx.createGain();
    ventGain.gain.value = 0;
    noise.connect(filter);
    filter.connect(ventGain);
    ventGain.connect(master);
    const roomFilter = audioCtx.createBiquadFilter();
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 280;
    roomGain = audioCtx.createGain();
    roomGain.gain.value = 0;
    noise.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(master);
    noise.start();
    nextBeat = audioCtx.currentTime + 0.05;
  }
  function boot(){
    if(live) return;
    live = true;
    document.body.classList.add("icu-live");
    enter.hidden = true;
    document.getElementById("icu-audio").hidden = false;
    const period = 60 / sim.rr;
    if(breath) breath.style.animation = "none";
    startAudio();
    raf = requestAnimationFrame(frameTick);
    period;
  }
  function openModule(url, title){
    const room = document.getElementById("room");
    document.body.classList.add("in", "enter");
    room.innerHTML =
      '<button type="button" class="back" id="back">Back to ICU</button>'+
      '<h2>'+title+'</h2>'+
      '<iframe class="abg-frame" title="'+title+'" src="'+url+'"></iframe>';
    document.getElementById("back").onclick = function(){
      document.body.classList.remove("in", "enter", "inside", "lab", "arena", "osce", "reference");
      room.innerHTML = "";
    };
  }
  function openShock(){
    const room = document.getElementById("room");
    document.body.classList.add("in", "enter");
    room.innerHTML =
      '<button type="button" class="back" id="back">Back to ICU</button>'+
      '<h2>Monitor</h2>'+
      '<p class="lede">The wall monitor is a simulation. Choose the shock module that already exists.</p>'+
      '<a class="card" data-mod="Shock_Bay.html?v=20261024a"><b>Shock bay</b><span>Phenotypes of shock, and a ventilator you control.</span></a>'+
      '<a class="card" data-mod="Shock_Identification_Management_Simulator.html?v=20261024a"><b>Shock identification</b><span>MAP, cardiac index and the phenotype.</span></a>'+
      '<a class="card" data-mod="Shock_POCUS_RUSH_Simulator.html?v=20261024a"><b>Shock and POCUS</b><span>RUSH exam, ScvO2 and lactate.</span></a>'+
      '<a class="card" data-mod="Shock_Telemetry_POCUS_Simulator.html?v=20261024a"><b>Shock telemetry</b><span>Arterial line, IVC, PPV and the vasopressor.</span></a>';
    document.getElementById("back").onclick = function(){
      document.body.classList.remove("in", "enter");
      room.innerHTML = "";
    };
    room.querySelectorAll("[data-mod]").forEach(function(card){
      card.onclick = function(event){
        event.preventDefault();
        openModule(card.getAttribute("data-mod"), card.querySelector("b").textContent);
      };
    });
  }
  function leaveForBody(){
    document.body.classList.remove("icu-open");
    if(master) master.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    if(typeof playIntro === "function") playIntro();
    if(typeof startWave === "function") startWave();
  }
  frame.addEventListener("click", function(event){
    const hit = event.target.closest("[data-go]");
    if(!hit || !live) return;
    frame.querySelectorAll(".bay-hit").forEach(function(btn){ btn.classList.remove("on"); });
    hit.classList.add("on");
    const go = hit.getAttribute("data-go");
    if(go === "cart") openModule("ACLS_Interactive_Simulator_2025_AHA_v2.html?v=20261024a", "ACLS");
    else if(go === "vent") openModule("Ventilator_Waveform_Troubleshooting.html?v=20261024a", "Ventilator");
    else if(go === "monitor") openShock();
    else if(go === "patient") leaveForBody();
  });
  enter.addEventListener("click", boot);
  document.getElementById("icu-audio").addEventListener("click", function(event){
    const btn = event.target.closest("[data-audio]");
    if(!btn) return;
    const key = btn.getAttribute("data-audio");
    flags[key] = !flags[key];
    btn.setAttribute("aria-pressed", flags[key] ? "true" : "false");
  });
  window.addEventListener("resize", function(){
    if(live){
      drawMonitor(performance.now());
      drawVent(performance.now());
    }
  });
  document.getElementById("icu-return").onclick = function(){
    document.body.classList.add("icu-open");
    document.body.classList.remove("in", "enter", "inside", "lab", "arena", "osce", "reference", "picking");
    const bubbles = document.getElementById("organ-bubbles");
    const tabs = document.getElementById("rail-tabs");
    if(bubbles) bubbles.hidden = true;
    if(tabs) tabs.hidden = false;
    if(typeof stopWave === "function") stopWave();
    if(master && audioCtx) master.gain.setTargetAtTime(0.9, audioCtx.currentTime, 0.05);
  };
  setTimeout(function(){ document.body.classList.add("tabs-in"); }, 1900);
})();
