/* The home screen that follows the logo. One entrance (the ICU), a short list of rooms, quiet quick tools, and the doctor small at the end of a dim corridor.
   Portrait only, type upright. Settings and Profile are bottom sheets. A short dim, with no word on it, leads into the next room. */
import * as THREE from "../universe/three.module.js";
import { GLTFLoader } from "../universe/vendor/GLTFLoader.js";
import { AVATARS, AVATAR_KEYS, avatarThumb, loadAvatar, createRigDoctor } from "../universe/doctor-rig.js?v=20261126m";
import { createHero } from "./hero-doctor.js?v=3";
import { createHero as createWaveHero } from "./hero-wave.js?v=3";
import { liveUpdates } from "../universe/live-updates.js?v=20261128a";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const Q = new URLSearchParams(location.search);
const NONAV = Q.has("nonav");
const HEROES = { wave: { glb: "./hero-wave.glb", thumb: "./hero-wave.jpg", label: "Doctor", replaces: "dr4" }, rt: { glb: "./hero-rt.glb?v=20261126e", thumb: "./hero-rt.jpg", label: "Doctor", replaces: "dr3", rest: "side" } };

/* ---------------------------------------------------------------- saved on this device */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
const DEF = { music: 0.35, fx: 0.6, mute: false, heroAnim: true, quality: "high", reduced: false };
const S = Object.assign({}, DEF, store.get("ccu.home.settings", {}));
const saveS = () => store.set("ccu.home.settings", S);
let prof = store.get("ccu.profile", { name: "", id: "" });
let avKey = ""; try { avKey = localStorage.getItem("ccu.doctorAvatar") || ""; } catch (e) { /* ignore */ }
if (!AVATARS[avKey] && !HEROES[avKey]) avKey = "";
const reduced = () => S.reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------- sound: music, and one soft tick */
let ac = null, gestured = false;
const music = $("#music");
function tick() {
  if (S.mute || S.fx <= 0.01) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime, g = ac.createGain(), o = ac.createOscillator(); g.connect(ac.destination); o.connect(g); o.type = "sine";
    o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * S.fx, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13); o.start(t); o.stop(t + 0.15);
  } catch (e) { /* ignore */ }
}
function applyMusic() {
  music.volume = S.mute ? 0 : Math.min(1, S.music);
  if (gestured && !NONAV && music.volume > 0 && music.paused) music.play().catch(() => {});
  if (music.volume === 0 && !music.paused) music.pause();
}
addEventListener("pointerdown", () => { if (gestured) return; gestured = true; applyMusic(); }, { once: true });
document.addEventListener("visibilitychange", () => { if (document.hidden) music.pause(); else applyMusic(); });
addEventListener("pageshow", (e) => { if (e.persisted) { $("#veil").classList.remove("on"); applyMusic(); } });

/* ---------------------------------------------------------------- what the screen offers */
const U = "../universe/", R = "../../", V = "20261126gk";
const CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const QUICK = [
  { name: "Formulas and criteria", sub: "Scores, calculators", href: R + "formulas.html" },
  { name: "Drugs and doses", sub: "ICU drug reference", href: R + "antibiotics.html" },
  { name: "ABG simulator", sub: "Read the gas", href: R + "ABG_Photo_Interpreter_Simulator.html" },
  { name: "MCQs", sub: "Question bank", href: R + "index.html" },
];
const ROOMS = [
  { name: "Command centre", sub: "Six beds, live alarms", href: U + `living-command.html?v=${V}&at=command` },
  { name: "Microbiology", sub: "Cultures, stains, antibiograms", href: R + "microbiology-lab.html" },
  { name: "Pathophysiology", sub: "Disease in motion", href: R + "pathology-live.html" },
  { name: "Radiology", sub: "X-ray, CT, MRI and ultrasound", href: R + "radiology.html" },
  { name: "Team room", sub: "Review a patient with the team", href: "../index.html?to=team" },
];
const LEARN = [
  { name: "Pathodynamics", sub: "Organs that move and respond", href: U + "pathodynamics/index.html" },
  { name: "Memory lab", sub: "Spaced-repetition recall", href: U + "memory-lab/index.html" },
  { name: "Video library", sub: "Procedures and bedside skills", href: U + `living-command.html?v=${V}&at=video` },
];
const ENTER = U + `living-command.html?v=${V}&at=icu`, GATE = U + `living-command.html?v=${V}&at=gate`;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
$("#quick").innerHTML = QUICK.map((q) => `<a class="card" href="${q.href}" data-go><b>${q.name}</b><small>${q.sub}</small></a>`).join("");
const row = (r) => `<li><a href="${r.href}" data-go><span class="t"><b>${r.name}</b><small>${r.sub}</small></span>${CHEV}</a></li>`;
$("#rooms").innerHTML = ROOMS.map(row).join(""); $("#learn").innerHTML = LEARN.map(row).join("");

/* a short dim into the next room */
const veil = $("#veil");
function go(href, slow) {
  if (veil.classList.contains("on")) return;
  tick(); veil.classList.toggle("slow", !!slow); veil.classList.add("on");
  setTimeout(() => { if (NONAV) { veil.classList.remove("on"); return; } location.href = href; }, slow ? 650 : 300);
}
document.addEventListener("click", (e) => { const a = e.target.closest("a[data-go]"); if (!a) return; e.preventDefault(); go(a.getAttribute("href")); });
$("#bEnter").onclick = () => go(ENTER, true);
$("#bGate").onclick = () => go(GATE);

/* one quiet line of what is new in the guidelines */
let LIVE = null; try { LIVE = liveUpdates(); } catch (e) { /* ignore */ }
let liveKey = "";
function paintLive() {
  const its = LIVE ? LIVE.items() : []; if (!its.length) return;
  const it = its.find((x) => x.fresh) || its[0]; const k = it.lane + it.title; if (k === liveKey) return; liveKey = k;
  const a = $("#live"); a.hidden = false; a.href = it.href || "#"; $("#liveLane").textContent = it.lane; $("#liveTitle").textContent = it.title; a.title = it.title;
}
paintLive(); setInterval(paintLive, 5000);

/* ---------------------------------------------------------------- the doctor, small, in the same dim light */
const dpr = () => (S.quality === "low" ? 1 : S.quality === "med" ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2));
const heroCv = $("#heroCv");
const H = { r: null, sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(26, 104 / 190, 0.1, 60), holder: new THREE.Group(), actor: null, gen: 0, t: 0 };
H.cam.position.set(0, 0.98, 4.9); H.cam.lookAt(0, 0.9, 0); H.sc.add(H.holder);
H.sc.add(new THREE.HemisphereLight(0x8fa8a4, 0x0a1214, 0.6));
{ const k = new THREE.DirectionalLight(0xd9d5c8, 0.95); k.position.set(1.5, 3.5, 4); H.sc.add(k);
  const rim = new THREE.DirectionalLight(0x6fe3cf, 1.7); rim.position.set(-3, 2.5, -3.5); H.sc.add(rim); }
const loader = new GLTFLoader(), loads = {};
const loadGlb = (url) => loads[url] || (loads[url] = new Promise((res, rej) => loader.load(new URL(url, import.meta.url).href, res, undefined, rej)));
const heroThumb = (k) => new URL(HEROES[k].thumb, import.meta.url).href;
const soft = (t) => t * t * (3 - 2 * t);
function rigActor(gltf, key) {
  const d = createRigDoctor(THREE, gltf, { key, name: "", noTag: true });
  let t = Math.random() * 3;
  return { group: d.group, update(dt, anim) { t += dt; const c = t % 24; let look = Math.sin(t * 0.9) * 0.5, y = 0; if (c >= 12 && c < 20) { y = soft((c - 12) / 8) * Math.PI * 2; look = 0; } d.setMoving(0); d.setLook(look); d.update(anim ? dt : dt * 0.3); d.group.rotation.y = y; } };
}
function skinned(gl, make, rest) {
  const use = gl.scene; use.updateMatrixWorld(true);
  const bx = new THREE.Box3().setFromObject(use), sz = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
  use.position.set(-c.x, -bx.min.y, -c.z); const hero = make(THREE, use, rest ? { rest } : undefined); const g = new THREE.Group(); g.add(hero.root); g.scale.setScalar(1.82 / sz.y);
  return { group: g, update(dt, anim) { hero.update(anim ? dt : 0); } };
}
const cache = {};
async function setHero(kind) {
  const gen = ++H.gen; let act = cache[kind];
  if (!act) {
    if (HEROES[kind]) act = skinned(await loadGlb(HEROES[kind].glb), createWaveHero, HEROES[kind].rest);
    else if (kind === "default") act = skinned(await loadGlb("./hero.glb"), createHero);
    else act = rigActor(await loadAvatar(kind), kind);
    cache[kind] = act;
  }
  if (gen !== H.gen) return;
  H.holder.clear(); H.holder.add(act.group); H.actor = act; heroCv.classList.add("on");
}
const setHeroSafe = (k) => setHero(k).catch((e) => console.warn("hero", e));
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(0.06, Math.max(0, (now - last) / 1000)); last = now;
  if (document.hidden || !H.actor) return;
  if (!H.r) { H.r = new THREE.WebGLRenderer({ canvas: heroCv, antialias: true, alpha: true }); H.r.setClearColor(0x000000, 0); }
  const w = heroCv.clientWidth, h = heroCv.clientHeight, pr = dpr(); if (!w || !h) return;
  if (heroCv._w !== w || heroCv._h !== h || heroCv._pr !== pr) { heroCv._w = w; heroCv._h = h; heroCv._pr = pr; H.r.setPixelRatio(pr); H.r.setSize(w, h, false); H.cam.aspect = w / h; H.cam.updateProjectionMatrix(); }
  H.actor.update(dt * 0.7, S.heroAnim && !reduced()); H.r.render(H.sc, H.cam);
}

/* ---------------------------------------------------------------- one bottom sheet for Profile and Settings */
const sheet = $("#sheet"), shade = $("#shade"); let open = null, opener = null;
const pct = (v) => Math.round(v * 100) + "%";
const slider = (id, label, v) => `<label class="fld"><span>${label}<output id="${id}o">${pct(v)}</output></span><input id="${id}" type="range" min="0" max="1" step="0.05" value="${v}"></label>`;
const toggle = (id, label, on) => `<div class="row"><span>${label}</span><button type="button" class="sw${on ? " on" : ""}" id="${id}" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`;
const head = (t) => `<div class="grab"></div><div class="bar"><h3 id="shTitle">${t}</h3><button type="button" class="done" id="shDone">Done</button></div>`;
function paintHome() {
  $("#welcome").textContent = prof.name ? "Welcome, " + prof.name : "Welcome, Doctor";
  $$(".avb", sheet).forEach((b) => b.classList.toggle("on", b.dataset.k === avKey));
}
function profileHTML() {
  return `${head("Profile")}<p class="sub">Your name and your doctor. Kept on this device.</p>
  <label class="fld"><span>Name</span><input id="pfName" type="text" maxlength="40" autocomplete="name" placeholder="Dr. Your name" value="${esc(prof.name)}"></label>
  <label class="fld"><span>Login ID</span><input id="pfId" type="email" maxlength="60" autocomplete="username" placeholder="you@hospital.org" value="${esc(prof.id)}"></label>
  <h4>Your doctor</h4><div class="avs">${AVATAR_KEYS.map((k) => { const hk = Object.keys(HEROES).find((x) => HEROES[x].replaces === k); return hk ? `<button class="avb" type="button" data-k="${hk}" aria-label="Doctor"><img src="${heroThumb(hk)}" alt=""></button>` : `<button class="avb" type="button" data-k="${k}" aria-label="${AVATARS[k].label}"><img src="${avatarThumb(k)}" alt=""></button>`; }).join("")}</div>
  <div class="btns"><button class="btn p" id="pfSave" type="button">Save</button><button class="btn" id="pfDef" type="button">Default doctor</button><button class="btn" id="pfOut" type="button">Sign out</button></div>`;
}
function settingsHTML() {
  return `${head("Settings")}
  <h4>Sound</h4>${slider("sMusic", "Music", S.music)}${slider("sFx", "Effects", S.fx)}${toggle("sMute", "Mute everything", S.mute)}
  <h4>Picture</h4><div class="row"><span>Graphics quality</span><div class="seg" id="sQ">${["low", "med", "high"].map((q) => `<button type="button" data-q="${q}" class="${S.quality === q ? "on" : ""}">${q[0].toUpperCase() + q.slice(1)}</button>`).join("")}</div></div>
  ${toggle("sAnim", "Animated doctor", S.heroAnim)}${toggle("sRed", "Reduce motion", S.reduced)}
  <div class="btns"><button class="btn" id="sReset" type="button">Reset to defaults</button></div>`;
}
function bindProfile() {
  $$(".avb", sheet).forEach((b) => b.addEventListener("click", () => { avKey = b.dataset.k; try { localStorage.setItem("ccu.doctorAvatar", avKey); } catch (e) { /* ignore */ } tick(); paintHome(); setHeroSafe(avKey); }));
  $("#pfSave").onclick = () => { prof = { name: $("#pfName").value.trim(), id: $("#pfId").value.trim() }; store.set("ccu.profile", prof); tick(); paintHome(); closeSheet(); };
  $("#pfDef").onclick = () => { avKey = ""; try { localStorage.removeItem("ccu.doctorAvatar"); } catch (e) { /* ignore */ } paintHome(); setHeroSafe("default"); };
  $("#pfOut").onclick = () => { prof = { name: "", id: "" }; store.set("ccu.profile", prof); $("#pfName").value = $("#pfId").value = ""; paintHome(); };
}
function bindSettings() {
  const bind = (id, key) => { const i = $("#" + id, sheet); i.oninput = () => { S[key] = +i.value; $("#" + id + "o", sheet).textContent = pct(S[key]); saveS(); applyMusic(); }; };
  bind("sMusic", "music"); bind("sFx", "fx");
  const sw = (id, key) => { const b = $("#" + id, sheet); b.onclick = () => { S[key] = !S[key]; b.classList.toggle("on", S[key]); b.setAttribute("aria-checked", S[key]); saveS(); applyMusic(); }; };
  sw("sMute", "mute"); sw("sAnim", "heroAnim"); sw("sRed", "reduced");
  $$("#sQ button", sheet).forEach((b) => (b.onclick = () => { S.quality = b.dataset.q; $$("#sQ button", sheet).forEach((x) => x.classList.toggle("on", x === b)); saveS(); }));
  $("#sReset", sheet).onclick = () => { Object.assign(S, DEF); saveS(); applyMusic(); sheet.innerHTML = settingsHTML(); bindSettings(); $("#shDone").onclick = closeSheet; };
}
function openSheet(which, from) {
  if (open) return; open = which; opener = from; tick();
  sheet.innerHTML = which === "profile" ? profileHTML() : settingsHTML(); which === "profile" ? (bindProfile(), paintHome()) : bindSettings();
  $("#shDone").onclick = closeSheet; shade.hidden = false; sheet.hidden = false; void sheet.offsetWidth; shade.classList.add("on"); sheet.classList.add("on"); $("#shDone").focus({ preventScroll: true });
}
function closeSheet() {
  if (!open) return; open = null; shade.classList.remove("on"); sheet.classList.remove("on");
  setTimeout(() => { if (!open) { shade.hidden = true; sheet.hidden = true; } }, 300); if (opener) opener.focus({ preventScroll: true });
}
$("#bProfile").onclick = (e) => openSheet("profile", e.currentTarget);
$("#bSet").onclick = (e) => openSheet("settings", e.currentTarget);
shade.addEventListener("click", closeSheet);
addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

/* ---------------------------------------------------------------- start */
paintHome(); applyMusic();
window.__ccu = { ready: setHeroSafe(avKey || "default"), view: () => (open || "home"), open: (w) => openSheet(w, null), close: closeSheet, enter: () => $("#bEnter").click() };
requestAnimationFrame(frame);
