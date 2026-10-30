(function(){
  const frame = document.getElementById("icu-frame");
  if(!frame) return;
  const monitor = document.getElementById("icu-monitor");
  const vent = document.getElementById("icu-vent");
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
  let humGain = null;
  let nextBeat = 0;
  let goTimer = 0;
  let synced = false;
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
  function breathLevel(p){
    if(p.insp){
      const u = p.t / (p.period * tiFrac);
      return Math.sin(u * Math.PI);
    }
    return Math.exp(-(p.t - p.period * tiFrac) / 0.42);
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
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(2,8,6,.94)";
    ctx.fillRect(0, 0, w, h);
    const beat = sim.hr / 60;
    const lanes = [
      { color: "#3ee07a", label: "II", value: String(sim.hr), wave: function(u){ return ecg(u * beat); } },
      { color: "#ff5a5a", label: "ART", value: sim.sbp + "/" + sim.dbp, wave: function(u){ return art((u * beat) - 0.12); } },
      { color: "#5ec8ff", label: "PLETH", value: String(sim.spo2), wave: function(u){ return pleth(u * beat); } }
    ];
    const laneH = h / lanes.length;
    lanes.forEach(function(lane, i){
      const top = i * laneH;
      ctx.strokeStyle = lane.color;
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = Math.max(1.2, h * 0.012);
      ctx.beginPath();
      const steps = Math.ceil(w);
      for(let x = 0; x < steps; x++){
        const sec = (now / 1000) - ((w - x) / w) * 3.4;
        const y = top + laneH * (0.72 - lane.wave(sec) * 0.46);
        if(x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = lane.color;
      ctx.font = (laneH * 0.18) + "px ui-sans-serif,sans-serif";
      ctx.fillText(lane.value, 4, top + laneH * 0.34);
    });
  }
  function ventSample(frac){
    const insp = frac < tiFrac;
    const flow = insp ? 1 : -0.85 * Math.exp(-(frac - tiFrac) / 0.12);
    const vol = insp ? frac / tiFrac : Math.max(0, 1 - (frac - tiFrac) / (1 - tiFrac));
    const pres = sim.peep + (insp ? (pip() - sim.peep) * (0.55 + 0.45 * (frac / tiFrac)) : (pplat() - sim.peep) * Math.exp(-(frac - tiFrac) / 0.1));
    return { flow: flow, vol: vol, pres: pres };
  }
  function drawVent(now){
    const ctx = fit(vent);
    const w = vent.width, h = vent.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(4,10,16,.9)";
    ctx.fillRect(0, 0, w, h);
    const colors = ["#7fd4e6", "#e2b48a", "#9ad7ff"];
    const laneH = h / 3;
    const period = 60 / sim.rr;
    for(let lane = 0; lane < 3; lane++){
      const top = lane * laneH;
      ctx.strokeStyle = colors[lane];
      ctx.lineWidth = Math.max(1.2, h * 0.012);
      ctx.beginPath();
      for(let x = 0; x < w; x++){
        const ago = ((w - x) / w) * period * 1.6;
        const frac = ((now / 1000 - ago) % period + period) % period / period;
        const s = ventSample(frac);
        const v = lane === 0 ? s.flow : lane === 1 ? (s.pres - sim.peep) / (pip() - sim.peep + 0.01) : s.vol;
        const y = top + laneH * (0.78 - (v * 0.45 + (lane === 0 ? 0.22 : 0.08)));
        if(x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  function frameTick(now){
    if(!live) return;
    drawMonitor(now);
    drawVent(now);
    const p = phase(now);
    if(audioCtx && document.body.classList.contains("icu-open")) mix(breathLevel(p));
    raf = requestAnimationFrame(frameTick);
  }
  function mix(level){
    if(!master) return;
    const inIcu = document.body.classList.contains("icu-open");
    const allow = inIcu && (!document.getElementById("sound") || document.getElementById("sound").getAttribute("aria-pressed") !== "false");
    master.gain.setTargetAtTime(allow ? 0.5 : 0, audioCtx.currentTime, 0.08);
    if(ventGain){
      const whoosh = allow && flags.vent ? level * level * 0.014 : 0;
      ventGain.gain.setTargetAtTime(whoosh, audioCtx.currentTime, 0.22);
    }
    if(humGain) humGain.gain.setTargetAtTime(allow && flags.vent ? 0.007 : 0, audioCtx.currentTime, 0.25);
    if(allow && flags.room) syncBed();
    if(allow && flags.pulse && audioCtx.currentTime >= nextBeat){
      beep();
      nextBeat = audioCtx.currentTime + 60 / sim.hr;
    }
  }
  function syncBed(){
    const bed = document.getElementById("bed");
    if(!bed || !document.body.classList.contains("icu-open")) return;
    if(!flags.room){
      if(!bed.paused) bed.pause();
      return;
    }
    if(!bed.getAttribute("src")) bed.src = "scan-bed.mp3";
    bed.muted = false;
    bed.volume = 0.24;
    if(!bed.paused) return;
    if(audioCtx && audioCtx.currentTime < bedTry) return;
    if(audioCtx) bedTry = audioCtx.currentTime + 0.45;
    const pending = bed.play();
    if(pending && pending.then) pending.then(function(){ synced = true; }).catch(function(){});
  }
  let bedTry = 0;
  function beep(){
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.028, audioCtx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  }
  function softAir(ctx){
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for(let i = 0; i < data.length; i++){
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.015 * white) / 1.015;
      data[i] = brown;
    }
    let peak = 0.0001;
    for(let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    for(let i = 0; i < data.length; i++) data[i] = data[i] / peak * 0.35;
    return buffer;
  }
  function startAudio(){
    if(audioCtx){
      if(audioCtx.state === "suspended") audioCtx.resume();
      syncBed();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    audioCtx = new Ctx();
    master = audioCtx.createGain();
    master.gain.value = 0.5;
    master.connect(audioCtx.destination);
    noise = audioCtx.createBufferSource();
    noise.buffer = softAir(audioCtx);
    noise.loop = true;
    const high = audioCtx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 140;
    const low = audioCtx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 420;
    low.Q.value = 0.5;
    ventGain = audioCtx.createGain();
    ventGain.gain.value = 0;
    noise.connect(high);
    high.connect(low);
    low.connect(ventGain);
    ventGain.connect(master);
    const hum = audioCtx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 92;
    humGain = audioCtx.createGain();
    humGain.gain.value = 0;
    hum.connect(humGain);
    humGain.connect(master);
    hum.start();
    noise.start();
    nextBeat = audioCtx.currentTime + 0.05;
    syncBed();
  }
  function bedOn(){
    syncBed();
  }
  function boot(){
    if(live) return;
    live = true;
    document.body.classList.add("icu-live");
    raf = requestAnimationFrame(frameTick);
    startAudio();
  }
  function unlock(){
    startAudio();
    bedOn();
  }
  function quietLine(){
    if(typeof window.stopSpoken === "function") window.stopSpoken();
  }
  function bindModules(room, back){
    room.querySelectorAll("[data-mod]").forEach(function(card){
      card.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        openModule(card.getAttribute("data-mod"), card.querySelector("b").textContent, back);
      };
    });
  }
  function holdRoom(room){
    room.style.pointerEvents = "none";
    setTimeout(function(){ room.style.pointerEvents = ""; }, 500);
  }
  function openDialysis(){
    quietLine();
    const room = document.getElementById("room");
    document.body.classList.add("in", "enter");
    room.innerHTML =
      '<button type="button" class="back" id="back">Back to ICU</button>'+
      '<h2>Dialysis</h2>'+
      '<p class="lede">The machine is on. The learning lab is the circuit and the ten modalities. Practice is one skill, or a whole session.</p>'+
      '<button type="button" class="card" data-mod="Dialysis_Learning_Lab.html?v=20261029a"><b>Dialysis Learning Lab</b><span>IHD, SLED, PIKRT, the continuous modes, ultrafiltration and the peritoneum. SLED sits inside prolonged intermittent therapy.</span></button>'+
      '<button type="button" class="card" data-mod="Dialysis_Practice_Simulator.html?v=20261029a"><b>Practice by module</b><span>Indication, modality, prescription, the machine, alarms, fluids and anticoagulation.</span></button>'+
      '<button type="button" class="card" data-mod="Dialysis_Practice_Simulator.html?mode=full&v=20261029a"><b>Full clinical cases</b><span>Shock, missed dialysis with wet lungs, and an injured brain. The whole session.</span></button>';
    document.getElementById("back").onclick = function(){
      document.body.classList.remove("in", "enter");
      room.innerHTML = "";
    };
    bindModules(room, {label:"Dialysis index", fn: openDialysis});
    holdRoom(room);
  }
  function openModule(url, title, back){
    quietLine();
    const room = document.getElementById("room");
    document.body.classList.add("in", "enter");
    const dialysis = /Dialysis_/.test(url || "");
    const label = back && back.label ? back.label : "Back to ICU";
    room.innerHTML =
      '<button type="button" class="back" id="back">'+label+'</button>'+
      (dialysis ? "" : '<h2>'+title+'</h2>')+
      '<iframe class="abg-frame" title="'+title+'" src="'+url+'"></iframe>';
    document.getElementById("back").onclick = function(){
      if(back && back.fn){ back.fn(); return; }
      document.body.classList.remove("in", "enter", "inside", "lab", "arena", "osce", "reference");
      room.innerHTML = "";
    };
  }
  function openShock(){
    quietLine();
    const room = document.getElementById("room");
    document.body.classList.add("in", "enter");
    room.innerHTML =
      '<button type="button" class="back" id="back">Back to ICU</button>'+
      '<h2>Monitor</h2>'+
      '<p class="lede">The wall monitor is a simulation. Choose the shock module that already exists.</p>'+
      '<button type="button" class="card" data-mod="Shock_Bay.html?v=20261024e"><b>Shock bay</b><span>Phenotypes of shock, and a ventilator you control.</span></button>'+
      '<button type="button" class="card" data-mod="Shock_Identification_Management_Simulator.html?v=20261024e"><b>Shock identification</b><span>MAP, cardiac index and the phenotype.</span></button>'+
      '<button type="button" class="card" data-mod="Shock_POCUS_RUSH_Simulator.html?v=20261024e"><b>Shock and POCUS</b><span>RUSH exam, ScvO2 and lactate.</span></button>'+
      '<button type="button" class="card" data-mod="Shock_Telemetry_POCUS_Simulator.html?v=20261024e"><b>Shock telemetry</b><span>Arterial line, IVC, PPV and the vasopressor.</span></button>';
    document.getElementById("back").onclick = function(){
      document.body.classList.remove("in", "enter");
      room.innerHTML = "";
    };
    bindModules(room);
    holdRoom(room);
  }
  function loadBody(){}
  function leaveForBody(){
    document.body.classList.remove("icu-gate", "icu-open", "in", "enter", "inside", "lab", "arena", "osce", "reference", "picking");
    const room = document.getElementById("room");
    if(room) room.innerHTML = "";
    document.body.classList.add("body-only", "live3d");
    document.body.classList.remove("flat");
    quietLine();
    if(typeof window.keepScore === "function") window.keepScore();
    const tabs = document.getElementById("rail-tabs");
    if(tabs) tabs.hidden = true;
    if(typeof window.showOrganTabs === "function") window.showOrganTabs();
    if(typeof finishIntro === "function") finishIntro();
    if(typeof window.resetAtlas === "function") window.resetAtlas();
    const view = document.getElementById("view");
    if(view) view.style.display = "block";
    const figure = document.getElementById("figure");
    if(figure) figure.style.opacity = "1";
    loadBody();
  }
  window.openBody = leaveForBody;
  frame.addEventListener("click", function(event){
    const hit = event.target.closest("[data-go]");
    if(!hit || !live) return;
    unlock();
    const go = hit.getAttribute("data-go");
    if(go === "cart") openModule("ACLS_Interactive_Simulator_2025_AHA_v2.html?v=20261025c", "Crash cart");
    else if(go === "defib") openModule("ACLS_Interactive_Simulator_2025_AHA_v2.html?v=20261025c", "Defibrillator");
    else if(go === "vent") openModule("Ventilator_Waveform_Troubleshooting.html?v=20261025a", "Ventilator");
    else if(go === "monitor") openShock();
    else if(go === "dialysis") openDialysis();
    else if(go === "patient") leaveForBody();
  });
  document.getElementById("icu-audio").addEventListener("click", function(event){
    const btn = event.target.closest("[data-audio]");
    if(!btn) return;
    unlock();
    const key = btn.getAttribute("data-audio");
    flags[key] = !flags[key];
    btn.setAttribute("aria-pressed", flags[key] ? "true" : "false");
    if(key === "room"){
      const bed = document.getElementById("bed");
      if(bed){
        bed.volume = flags.room ? 0.32 : 0;
        if(flags.room) bedOn();
      }
    }
  });
  window.addEventListener("resize", function(){
    if(live){
      drawMonitor(performance.now());
      drawVent(performance.now());
    }
  });
  document.getElementById("icu-return").onclick = function(){
    quietLine();
    document.body.classList.add("icu-open");
    document.body.classList.remove("in", "enter", "inside", "lab", "arena", "osce", "reference", "picking", "body-only");
    const bubbles = document.getElementById("organ-bubbles");
    const tabs = document.getElementById("rail-tabs");
    if(bubbles) bubbles.hidden = true;
    if(tabs) tabs.hidden = false;
    const room = document.getElementById("room");
    if(room) room.innerHTML = "";
    bedOn();
    if(master && audioCtx) master.gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.08);
  };
  document.addEventListener("pointerdown", unlock, true);
  boot();
  bedOn();
  setTimeout(function(){ document.body.classList.add("tabs-in"); }, 1900);
})();
