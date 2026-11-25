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
const DEF = { music: 0.35, fx: 0.6, mute: false, heroAnim: true, showHero: true, quality: "high", reduced: false };
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
const IC = {
  sig: '<path d="M18 5H6l6 7-6 7h12"/>',
  drug: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.2 7.2l5.6 9.6"/>',
  abg: '<path d="M12 3c3.5 4.4 6 7.4 6 10.6A6 6 0 0 1 6 13.6C6 10.4 8.5 7.4 12 3z"/><path d="M9.3 14a2.7 2.7 0 0 0 2.7 2.7"/>',
  mcq: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.8 6l1.2 1.2L7 5M3.8 12l1.2 1.2L7 11M3.8 18l1.2 1.2L7 17"/>',
};
const QUICK = [
  { name: "Formulas", sub: "Scores and criteria", ic: "sig", href: R + "formulas.html" },
  { name: "Drugs and doses", sub: "ICU reference", ic: "drug", href: R + "antibiotics.html" },
  { name: "ABG simulator", sub: "Read the gas", ic: "abg", href: R + "ABG_Photo_Interpreter_Simulator.html" },
  { name: "MCQs", sub: "Question bank", ic: "mcq", href: R + "index.html" },
];
const ENTER = U + `living-command.html?v=${V}&at=icu`, GATE = U + `living-command.html?v=${V}&at=gate`;
/* the portals: each has one line-art centrepiece in the single accent; the rooms of Hub and Learning Studio open in a sheet */
const ART = {
  hub: '<svg class="art" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path opacity=".55" d="M80 8c-20 0-38 11-38 31 0 9 3 13 3 20 0 11 11 27 35 30 24-3 35-19 35-30 0-7 3-11 3-20C118 19 100 8 80 8z"/><path opacity=".3" d="M80 8v81M52 36c10 2 18 8 28 8s18-6 28-8M48 62c12-2 20 4 32 4s20-6 32-4"/><g opacity=".7"><path d="M62 30l18 14 22-10M80 44l-20 22M80 44l22 24M62 30l-14 6M102 34l12 2"/></g><g fill="currentColor" stroke="none"><circle class="n" cx="62" cy="30" r="3.2"/><circle class="n" cx="80" cy="44" r="3.8"/><circle class="n" cx="102" cy="34" r="3.2"/><circle class="n" cx="60" cy="66" r="3"/><circle class="n" cx="102" cy="68" r="3"/><circle class="n" cx="48" cy="36" r="2.4"/><circle class="n" cx="114" cy="36" r="2.4"/></g></svg>',
  cmd: '<svg class="art" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + [0, 1, 2, 3, 4, 5].map((i) => { const x = 10 + (i % 3) * 49, y = 8 + Math.floor(i / 3) * 44; return `<rect opacity=".5" x="${x}" y="${y}" width="44" height="38" rx="4"/><path class="ecg" style="animation-delay:${(i * 0.37).toFixed(2)}s" d="M${x + 5} ${y + 22}h8l3-9 4 18 4-13 3 4h${i === 5 ? 6 : 14}"/>`; }).join("") + '</svg>',
  team: '<svg class="art" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + [[30, 56, .45], [55, 44, .65], [80, 38, 1], [105, 44, .65], [130, 56, .45]].map(([x, y, o]) => `<g opacity="${o}"><circle cx="${x}" cy="${y}" r="9"/><path d="M${x - 16} ${y + 40}c0-14 7-21 16-21s16 7 16 21"/></g>`).join("") + '<ellipse opacity=".25" cx="80" cy="94" rx="64" ry="5"/></svg>',
  learn: '<svg class="art" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path opacity=".7" d="M80 24c-14-8-34-9-52-4v58c18-5 38-4 52 4 14-8 34-9 52-4V20c-18-5-38-4-52 4z"/><path opacity=".35" d="M80 24v58M38 36c9-2 25-2 34 3M38 50c9-2 25-2 34 3M38 64c9-2 25-2 34 3M122 36c-9-2-25-2-34 3M122 50c-9-2-25-2-34 3"/><circle class="glowp" cx="80" cy="12" r="3.2" fill="currentColor" stroke="none"/></svg>',
  dyn: '<svg class="art" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="beat" opacity=".85" d="M80 88C40 62 36 34 56 26c11-4 20 2 24 12 4-10 13-16 24-12 20 8 16 36-24 62z"/><path class="ecg" opacity=".6" d="M14 54h34l6-14 8 30 8-22 6 6h18"/><ellipse opacity=".25" cx="80" cy="50" rx="68" ry="44"/></svg>',
};
const PORTALS = [
  { id: "hub", name: "Hub", sub: "ICU, microbiology, pathophysiology and radiology", meta: "4 rooms", art: "hub",
    rooms: [
      { name: "ICU", sub: "The intensive care floor", href: ENTER },
      { name: "Microbiology", sub: "Cultures, stains, antibiograms", href: R + "microbiology-lab.html" },
      { name: "Pathophysiology", sub: "Disease in motion", href: R + "pathology-live.html" },
      { name: "Radiology", sub: "X-ray, CT, MRI and ultrasound", href: R + "radiology.html" }] },
  { id: "cmd", name: "Command Center", sub: "Six beds and their live alarms", meta: "Best in landscape", art: "cmd", href: U + `living-command.html?v=${V}&at=command` },
  { id: "team", name: "Teams", sub: "Review a patient with the multidisciplinary team", meta: "5 specialists", art: "team", href: "../index.html?to=team" },
  { id: "edu", name: "Learning Studio", sub: "Watch the procedure, then lock it in with recall", meta: "Videos and Memory lab", art: "learn",
    rooms: [
      { name: "Video library", sub: "Procedures and bedside skills", href: U + `living-command.html?v=${V}&at=video` },
      { name: "Memory lab", sub: "Spaced-repetition recall", href: U + "memory-lab/index.html" }] },
  { id: "dyn", name: "Critical Dynamics", sub: "Organs that move and respond to treatment", meta: "Live organ models", art: "dyn", href: U + "pathodynamics/index.html" },
];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
$("#quick").innerHTML = QUICK.map((q) => `<a class="card" href="${q.href}" data-go><svg viewBox="0 0 24 24" aria-hidden="true">${IC[q.ic]}</svg><b>${q.name}</b><small>${q.sub}</small></a>`).join("");
$("#portals").innerHTML = PORTALS.map((p) => `<a class="portal" role="listitem" tabindex="0" data-p="${p.id}" ${p.href ? `href="${p.href}" data-go` : 'href="#"'}>${ART[p.art]}<b>${p.name}</b><small>${p.sub}</small><span class="pf"><span class="meta">${p.meta}</span><span class="enter">Enter</span></span></a>`).join("");
document.addEventListener("click", (e) => { const a = e.target.closest("a.portal[data-p]"); if (!a || a.hasAttribute("data-go")) return; e.preventDefault(); const p = PORTALS.find((x) => x.id === a.dataset.p); if (p && p.rooms) openList(p); });
{ const rail = $("#portals"), cards = $$(".portal", rail); if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => { es.forEach((en) => en.target.classList.toggle("focus", en.isIntersecting && en.intersectionRatio > 0.7)); }, { root: rail, threshold: [0.7, 0.9] }); cards.forEach((c) => io.observe(c)); } else cards[0].classList.add("focus"); }

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

/* Universe Live: three at a time, readable, tap to open; View all opens the full list */
let LIVE = null; try { LIVE = liveUpdates(); } catch (e) { /* ignore */ }
let liveKey = "";
const meta = (it) => { const t = String(it.topic || ""), w = String(it.when || ""); return !w || t.toLowerCase().slice(0, 6) === w.toLowerCase().slice(0, 6) ? t : t + " · " + w; };
const liveRow = (it) => `<li><a href="${esc(it.href || "#")}" target="_blank" rel="noopener noreferrer"><span class="chip">${esc(it.lane)}</span><span class="lt">${esc(it.title)}</span><small>${esc(meta(it))}</small></a></li>`;
const liveItems = () => { const its = LIVE ? LIVE.items() : []; return its.filter((x) => x.fresh).concat(its.filter((x) => !x.fresh)); };
function paintLive() {
  const its = liveItems(); if (!its.length) return; const top = its.slice(0, 3), k = top.map((x) => x.lane + x.title).join("|"); if (k === liveKey) return; liveKey = k;
  $("#liveList").innerHTML = top.map(liveRow).join("");
}
paintLive(); setInterval(paintLive, 5000);

/* ---------------------------------------------------------------- the doctor, small, in the same dim light */
const dpr = () => (S.quality === "low" ? 1 : S.quality === "med" ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2));
const heroCv = $("#heroCv");
const H = { r: null, sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(26, 104 / 190, 0.1, 60), holder: new THREE.Group(), actor: null, gen: 0, t: 0 };
H.cam.position.set(0, 0.98, 4.9); H.cam.lookAt(0, 0.9, 0); H.sc.add(H.holder);
H.sc.add(new THREE.HemisphereLight(0x8fa8a4, 0x0a1214, 0.6));
{ const k = new THREE.DirectionalLight(0xd9d5c8, 0.95); k.position.set(1.5, 3.5, 4); H.sc.add(k);
  const rim = new THREE.DirectionalLight(0x55d6f2, 1.7); rim.position.set(-3, 2.5, -3.5); H.sc.add(rim); }
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
  requestAnimationFrame(frame); if (!S.showHero) return; const dt = Math.min(0.06, Math.max(0, (now - last) / 1000)); last = now;
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
  $("#welcome").textContent = prof.name ? "Welcome back, " + prof.name : "Welcome back, Doctor";
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
  ${toggle("sShow", "Show the doctor", S.showHero)}${toggle("sAnim", "Animated doctor", S.heroAnim)}${toggle("sRed", "Reduce motion", S.reduced)}
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
  const sw = (id, key) => { const b = $("#" + id, sheet); b.onclick = () => { S[key] = !S[key]; b.classList.toggle("on", S[key]); b.setAttribute("aria-checked", S[key]); saveS(); applyMusic(); applyScene(); }; };
  sw("sMute", "mute"); sw("sShow", "showHero"); sw("sAnim", "heroAnim"); sw("sRed", "reduced");
  $$("#sQ button", sheet).forEach((b) => (b.onclick = () => { S.quality = b.dataset.q; $$("#sQ button", sheet).forEach((x) => x.classList.toggle("on", x === b)); saveS(); }));
  $("#sReset", sheet).onclick = () => { Object.assign(S, DEF); saveS(); applyMusic(); sheet.innerHTML = settingsHTML(); bindSettings(); $("#shDone").onclick = closeSheet; };
}
function listHTML(p) { return `${head(p.name)}<p class="sub">${p.sub}</p><ul class="sl">${p.rooms.map((r) => `<li><a href="${r.href}" data-go><span class="t"><b>${r.name}</b><small>${r.sub}</small></span>${CHEV}</a></li>`).join("")}</ul>`; }
function liveHTML() { return `${head("Universe Live")}<p class="sub">Guidelines and papers from the societies. Tap one to open it.</p><ul class="sl lv">${liveItems().map(liveRow).join("")}</ul>`; }
function openList(p) { openSheet("list", null, listHTML(p)); }
$("#liveAll").onclick = (e) => openSheet("live", e.currentTarget, liveHTML());
function openSheet(which, from, html) {
  if (open) return; open = which; opener = from; tick();
  sheet.innerHTML = html || (which === "profile" ? profileHTML() : settingsHTML()); if (!html) which === "profile" ? (bindProfile(), paintHome()) : bindSettings();
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
function applyScene() { $("#scene").classList.toggle("off", !S.showHero); }
paintHome(); applyMusic(); applyScene();
window.__ccu = { ready: setHeroSafe(avKey || "default"), view: () => (open || "home"), open: (w) => openSheet(w, null), close: closeSheet, enter: () => $("#bEnter").click() };
requestAnimationFrame(frame);
