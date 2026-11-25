/* The home screen that follows the logo: a blurred ICU, a glass rail, a doctor who never stands still and elevated 3D tiles that rise out of the floor.
   Everything that moves is driven by one clock (tween engine below), so the whole screen can also be stepped frame by frame for a recording. */
import * as THREE from "../universe/three.module.js";
import { GLTFLoader } from "../universe/vendor/GLTFLoader.js";
import { AVATARS, AVATAR_KEYS, avatarThumb, loadAvatar, createRigDoctor } from "../universe/doctor-rig.js?v=20261126m";
import { createHero } from "./hero-doctor.js?v=3";
import { createHero as createWaveHero } from "./hero-wave.js?v=3";
import { liveUpdates } from "../universe/live-updates.js?v=20261128a";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const Q = new URLSearchParams(location.search);
const HEROES = { wave: { glb: "./hero-wave.glb", thumb: "./hero-wave.jpg", label: "Doctor", replaces: "dr4" }, rt: { glb: "./hero-rt.glb?v=20261126e", thumb: "./hero-rt.jpg", label: "Doctor", replaces: "dr3", rest: "side" } };   /* skinned doctors that wave, put their hands in the pockets and move their heads; each takes the place of its look-alike in the picker */
const NONAV = Q.has("nonav");

/* ======================================================================== clock and tweens */
let clock = performance.now(), manual = !!window.__MANUAL;
const tweens = [];
const E = {
  lin: (t) => t, out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c = 1.45; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  soft: (t) => t * t * (3 - 2 * t),
};
let reduced = false;
function tw(ms, fn, o = {}) {
  ms = reduced ? ms * 0.5 : ms;
  return new Promise((res) => { const tn = { t0: clock, ms, delay: o.delay || 0, fn, ease: o.ease || E.io, res, hit: false }; tweens.push(tn); if (!tn.delay) { fn(tn.ease(0), 0); tn.hit = true; } });
}
const wait = (ms) => tw(ms, () => {}, { ease: E.lin });
function runTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tn = tweens[i], el = now - tn.t0 - tn.delay;
    if (el < 0) continue;
    const p = Math.min(1, el / tn.ms); tn.hit = true; tn.fn(tn.ease(p), p);
    if (p >= 1) { tweens.splice(i, 1); tn.res(); }
  }
}

/* ======================================================================== settings, profile */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
const S = Object.assign({ music: 0.5, fx: 0.7, mute: false, heroAnim: true, quality: "high", reduced: false, blur: 11 }, store.get("ccu.home.settings", {}));
const saveS = () => store.set("ccu.home.settings", S);
let prof = store.get("ccu.profile", { name: "", id: "" });
let avKey = ""; try { avKey = localStorage.getItem("ccu.doctorAvatar") || ""; } catch (e) { /* ignore */ }
if (!AVATARS[avKey] && !HEROES[avKey]) avKey = "";                                     // until a doctor chooses, the default doctor stays
reduced = S.reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ======================================================================== sound: a soft whoosh and tick, made on the spot */
let ac = null;
function sfx(kind) {
  if (S.mute || S.fx <= 0.01) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
    if (kind === "whoosh") {
      const n = ac.createBuffer(1, ac.sampleRate * 0.7, ac.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = ac.createBufferSource(); s.buffer = n; const f = ac.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.8; f.frequency.setValueAtTime(240, t); f.frequency.exponentialRampToValueAtTime(1900, t + 0.55);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * S.fx, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65); s.connect(f); f.connect(g); s.start(t);
    } else {
      const o = ac.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(kind === "back" ? 520 : 900, t); o.frequency.exponentialRampToValueAtTime(kind === "back" ? 300 : 1400, t + 0.09);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * S.fx, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); o.connect(g); o.start(t); o.stop(t + 0.16);
    }
  } catch (e) { /* ignore */ }
}
/* the opening: the rail and the live strip come first, then one section lands on every beat of the music (see seqStart) */
const SEQ = { t0: 0, run: false, audio: false, tiles: [7.74, 8.44, 9.16, 9.85], b0: 7.05, bp: 0.705, last: -1 };
const seqTime = () => (clock - SEQ.t0) / 1000;
function syncAudio() { try { const d = music.duration || 144, t = seqTime() % d; if (Math.abs(music.currentTime - t) > 0.35) music.currentTime = t; } catch (e) { /* ignore */ } }
const music = $("#music");
let gestured = false;
function applyMusic() {
  music.volume = S.mute ? 0 : Math.min(1, S.music);
  if (gestured && SEQ.run && !NONAV && music.volume > 0 && music.paused) music.play().then(() => { SEQ.audio = true; syncAudio(); }).catch(() => {});
}
addEventListener("pointerdown", () => { gestured = true; if (SEQ.audio) return; applyMusic(); if (!NONAV && S.music > 0 && !S.mute && SEQ.run) music.play().then(() => { SEQ.audio = true; syncAudio(); }).catch(() => {}); });

/* ======================================================================== data */
const IC = {
  hub: '<circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="6" r="1.8"/><circle cx="19" cy="6" r="1.8"/><circle cx="5" cy="18" r="1.8"/><circle cx="19" cy="18" r="1.8"/><path d="M6.4 7.2l3.6 3.4M17.6 7.2L14 10.6M6.4 16.8l3.6-3.4M17.6 16.8L14 13.4"/>',
  cmd: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4M6 10.5h3l1.5-3 2 6 1.5-3H18"/>',
  team: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6M15.5 14.3c3 .2 5.5 2 5.5 5.2"/>',
  edu: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>',
  icu: '<path d="M3 18V7M3 14h18v4M3 14v-3h8a3 3 0 0 1 3 3"/><circle cx="7" cy="9.5" r="1.6"/>',
  micro: '<circle cx="12" cy="13" r="3.8"/><path d="M12 9.2V4M9 5h6M12 16.8V20M8 20h8M8.2 13H4M20 13h-4.2"/>',
  patho: '<path d="M12 3v8M12 11c-2 0-5 1-6 6-.6 3 1 4 3 4 2 0 3-1 3-4M12 11c2 0 5 1 6 6 .6 3-1 4-3 4-2 0-3-1-3-4"/>',
  radio: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 7v10M8 9h8M8 12h8M8 15h8"/>',
  vid: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z"/>',
  mem: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  abg: '<path d="M12 3c3.5 4.4 6 7.4 6 10.6A6 6 0 0 1 6 13.6C6 10.4 8.5 7.4 12 3z"/><path d="M9.3 14a2.7 2.7 0 0 0 2.7 2.7"/>',
  mcq: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.8 6l1.2 1.2L7 5M3.8 12l1.2 1.2L7 11M3.8 18l1.2 1.2L7 17"/>',
  drug: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.2 7.2l5.6 9.6"/>',
  sig: '<path d="M18 5H6l6 7-6 7h12"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const U = "../universe/", R = "../../";
const PARENTS = [
  { id: "hub", name: "Hub", sub: "Cases, labs and imaging", c: "#36d6ff", ic: "hub", tag: "ATLAS", slot: "a",
    desc: "Four rooms under one roof: walk the ICU floor, work in the microbiology lab, watch pathophysiology move, or read the scans.",
    kids: [
      { id: "icu", name: "ICU", sub: "The intensive care floor", ic: "icu", c: "#2fe3c4", href: U + "living-command.html?v=20261126gi&at=icu" },
      { id: "micro", name: "Microbiology", sub: "Cultures, stains, antibiograms", ic: "micro", c: "#7bd96a", href: R + "microbiology-lab.html" },
      { id: "path", name: "Pathophysiology", sub: "Disease in motion", ic: "patho", c: "#ff8f5a", href: R + "pathology-live.html" },
      { id: "rad", name: "Radiology", sub: "X-ray, CT, MRI and ultrasound", ic: "radio", c: "#7aa7ff", href: R + "radiology.html" }] },
  { id: "cmd", name: "Command Center", sub: "Six beds, live alarms", c: "#ffc24a", ic: "cmd", tag: "LIVE", slot: "b",
    desc: "Everything the unit is doing right now. Open the live ICU and take the call.",
    kids: [{ id: "live", name: "ICU (live)", sub: "Six patients, one team", ic: "cmd", c: "#ffc24a", href: U + "living-command.html?v=20261126gi&at=command" }] },
  { id: "team", name: "Teams", sub: "The multidisciplinary team", c: "#b48cff", ic: "team", tag: "MDT", slot: "c",
    desc: "Your colleagues, standing by. Open the team room to review a patient together.", kids: [] },
  { id: "edu", name: "Education", sub: "Watch, explore, remember", c: "#ff7ad9", ic: "edu", tag: "LEARN", slot: "d",
    desc: "Learn the procedure, see the physiology, then lock it in with spaced recall.",
    kids: [
      { id: "vid", name: "Video library", sub: "Procedures and bedside skills", ic: "vid", c: "#5b9bff", href: U + "living-command.html?v=20261126gi&at=video" },
      { id: "patho3", name: "Pathodynamics", sub: "Organs that move and respond", ic: "patho", c: "#3dff9a", href: U + "pathodynamics/index.html" },
      { id: "mem", name: "Memory lab", sub: "Spaced-repetition recall", ic: "mem", c: "#ff7ad9", href: U + "memory-lab/index.html" }] },
];
const QUICK = [
  { name: "Formulas and criteria", sub: "Scores and calculators", ic: "sig", href: R + "formulas.html" },
  { name: "Drugs and doses", sub: "ICU drug reference", ic: "drug", href: R + "antibiotics.html" },
  { name: "ABG photo simulator", sub: "Read the gas, then the patient", ic: "abg", href: R + "ABG_Photo_Interpreter_Simulator.html" },
  { name: "MCQs", sub: "Question bank by system", ic: "mcq", href: R + "index.html" },
];
const SLOT = { a: [22.8, 0.5], b: [44, 0.5], c: [22.8, 19.6], d: [44, 19.6], p: [0, 0.5], e: [33.4, 19.6] };
const TEAM = [
  { name: "ICU lead", spec: "intensivist", key: "dr1" }, { name: "Chest", spec: "pulmonologist", key: "dr2" }, { name: "Renal", spec: "nephrologist", key: "dr3" },
  { name: "Infection", spec: "infectious", key: "dr4" }, { name: "Cardiac", spec: "cardiologist", key: "dr5" },
];

/* ======================================================================== tiles: elevated slabs that stand up out of the floor */
const field = $("#field"), stage = $("#stage"), main = $("#main");
const esc2 = (x) => String(x).replace(/[&<>"]/g, "");
function mkTile(d, slot, big) {
  const el = document.createElement("div"); el.className = "tile"; el.style.setProperty("--c", d.c); el.tabIndex = 0; el.setAttribute("role", "button"); el.setAttribute("aria-label", d.name);
  el.innerHTML = `<div class="ground"></div><div class="bob"><i class="shadow"></i><div class="slab">
    <i class="face f-back"></i><i class="face f-l"></i><i class="face f-r"></i><i class="face f-t"></i><i class="face f-b"></i>
    <div class="face f-front"><div class="t-ic">${svg(d.ic)}</div>${d.tag ? `<span class="t-go">${d.tag}</span>` : `<span class="t-go">OPEN</span>`}<div class="t-meta"><i></i>${esc2((d.id || d.name.replace(/\W/g, "")).slice(0, 4).toUpperCase())} // ONLINE<u></u></div><div class="t-tt"><b>${d.name}</b><small>${d.sub}</small></div></div>
    </div></div>`;
  place(el, slot); el.style.display = "none"; field.appendChild(el);
  const T = { el, slab: $(".slab", el), bob: $(".bob", el), rx: 0, ry: 0, tx: 0, ty: 0, ph: Math.random() * 6, lift: 0, hov: false, d };
  el._t = T;
  el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); if (PORT()) { const sg = FLIP() ? -1 : 1; T.tx = sg * (e.clientY - (r.top + r.height / 2)) / r.height; T.ty = -sg * (e.clientX - (r.left + r.width / 2)) / r.width; } else { T.tx = (e.clientX - r.left) / r.width - 0.5; T.ty = (e.clientY - r.top) / r.height - 0.5; } T.hov = true; });
  el.addEventListener("pointerleave", () => { T.hov = false; T.tx = T.ty = 0; });
  return el;
}
function place(el, slot) { const s = SLOT[slot]; el.style.left = s[0] + "em"; el.style.top = s[1] + "em"; el._slot = slot; }
/* a tile at p = 0 lies flat on the floor, far behind and out of sight; at p = 1 it stands */
function setRise(el, p) {
  const k = 1 - p, g = Math.sin(Math.max(0, Math.min(1, p)) * Math.PI);
  el.style.opacity = Math.max(0, Math.min(1, p * 3.2)); el.style.transform = p >= 0.999 && p <= 1.001 ? "" : `translate3d(0,${k * 8}em,${-k * 20}em) rotateX(${k * 82}deg)`;
  const gr = el.firstElementChild; if (gr) gr.style.opacity = Math.max(0, g * 0.95);
}
function rise(el, delay = 0, ms = 1000) { el.style.display = ""; setRise(el, 0); return tw(ms, (p) => setRise(el, p), { delay, ease: E.back }); }
function sink(el, delay = 0, ms = 520) { return tw(ms, (p) => setRise(el, 1 - p), { delay, ease: E.in }).then(() => { el.style.display = "none"; }); }
function boxIn(el, delay = 0, ms = 900) {
  el.style.display = ""; el.style.pointerEvents = "none";
  return tw(ms, (p) => { const k = 1 - p; el.style.opacity = Math.max(0, Math.min(1, p * 2.6)); el.style.transform = `translate3d(0,${k * 4}em,${-k * 14}em) rotateX(${k * 55}deg)`; }, { delay, ease: E.back }).then(() => { el.style.transform = ""; el.style.pointerEvents = "auto"; });
}
function boxOut(el, ms = 420) { el.style.pointerEvents = "none"; return tw(ms, (p) => { el.style.opacity = 1 - p; el.style.transform = `translate3d(0,${p * 3}em,${-p * 10}em) rotateX(${p * 45}deg)`; }, { ease: E.in }).then(() => { el.style.opacity = 0; el.style.transform = ""; }); }

const parentEl = {}; let kidEls = [];
PARENTS.forEach((P) => { const el = mkTile(P, P.slot); el.dataset.id = P.id; parentEl[P.id] = el; el.addEventListener("click", () => openParent(P.id)); el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openParent(P.id); } }); });

/* ======================================================================== the hero doctor and the team */
const dpr = () => (S.quality === "low" ? 1 : S.quality === "med" ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2));
function mkGL(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: Q.has("rec") }); r.setClearColor(0x000000, 0);
  return r;
}
function fit(r, cv, cam) { const w = cv.clientWidth, h = cv.clientHeight, pr = dpr(); if (!w || !h) return false; if (cv._w !== w || cv._h !== h || cv._pr !== pr) { cv._w = w; cv._h = h; cv._pr = pr; r.setPixelRatio(pr); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } return true; }
function lights(sc) {
  sc.add(new THREE.HemisphereLight(0xdcefff, 0x1d3a66, 1.25));
  const k = new THREE.DirectionalLight(0xffffff, 2.3); k.position.set(2.5, 4, 4.5); sc.add(k);
  const rim = new THREE.DirectionalLight(0x5cc8ff, 2.0); rim.position.set(-4, 3, -3.5); sc.add(rim);
  const f = new THREE.DirectionalLight(0xbfd8ff, 0.7); f.position.set(-3, 1.5, 3); sc.add(f);
}
function plinth(sc, r) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.05, 96), new THREE.MeshBasicMaterial({ color: 0x5fe0ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; sc.add(ring);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 64), new THREE.MeshBasicMaterial({ color: 0x2b9bff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.002; sc.add(glow);
  return { ring, glow };
}
const heroCv = $("#heroCv");
const H = { r: null, sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(26, 0.5, 0.1, 60), holder: new THREE.Group(), actor: null, on: false, kind: "default", gen: 0, pl: null, popT: 1 };
H.cam.position.set(0, 1.0, 4.8); H.cam.lookAt(0, 0.86, 0); lights(H.sc); H.sc.add(H.holder); H.pl = plinth(H.sc, 0.56);
let defaultGltf = null;
const loader = new GLTFLoader();
const loadDefault = () => defaultGltf || (defaultGltf = new Promise((res, rej) => loader.load(new URL("./hero.glb", import.meta.url).href, res, undefined, rej)));
const heroLoads = {};
const loadHeroGltf = (k) => heroLoads[k] || (heroLoads[k] = new Promise((res, rej) => loader.load(new URL(HEROES[k].glb, import.meta.url).href, res, undefined, rej)));
const heroThumb = (k) => new URL(HEROES[k].thumb, import.meta.url).href;

/* the five avatars are one static mesh each, posed by the shader: they walk on the spot, look about and turn through a full circle */
function rigActor(gltf, key, o) {
  const d = createRigDoctor(THREE, gltf, Object.assign({ key, name: "", noTag: true }, o || {}));
  let t = Math.random() * 3, yaw = 0, ph = o && o.phase || 0;
  return { group: d.group, rig: d, update(dt, anim) {
    t += dt; const c = (t + ph) % 24; let look = Math.sin(t * 0.9) * 0.5, y = 0;           /* they stand: the head looks about and the body turns through a full circle, but they never walk */
    if (c >= 6 && c < 12) { look = Math.sin(t * 1.3) * 0.7; }
    else if (c >= 12 && c < 20) { const a = (c - 12) / 8; y = E.soft(a) * Math.PI * 2; look = 0; }
    d.setMoving(0); d.setLook(look); d.update(anim ? dt : dt * 0.3); d.group.rotation.y = y + Math.sin(t * 0.4) * 0.05;
  } };
}
async function setHero(kind) {
  const gen = ++H.gen; H.kind = kind;
  let act;
  if (HEROES[kind]) {
    const gl = await loadHeroGltf(kind); if (gen !== H.gen) return;
    if (!H.skAct) H.skAct = {};
    if (!H.skAct[kind]) {
      const use = gl.scene; use.updateMatrixWorld(true);
      const bx = new THREE.Box3().setFromObject(use), sz = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
      use.position.set(-c.x, -bx.min.y, -c.z); const hero = createWaveHero(THREE, use, { rest: HEROES[kind].rest }); const g = new THREE.Group(); g.add(hero.root); g.scale.setScalar(1.82 / sz.y);
      H.skAct[kind] = { group: g, hero, update(dt, anim) { hero.update(anim ? dt : 0); } };
    }
    act = H.skAct[kind];
  } else if (kind === "default") {
    const gl = await loadDefault(); if (gen !== H.gen) return;
    if (!H.defAct) {
      const use = gl.scene; use.updateMatrixWorld(true);
      const bx = new THREE.Box3().setFromObject(use), sz = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3());
      use.position.set(-c.x, -bx.min.y, -c.z); const hero = createHero(THREE, use); const g = new THREE.Group(); g.add(hero.root); g.scale.setScalar(1.82 / sz.y);
      H.defAct = { group: g, hero, update(dt, anim) { hero.update(anim ? dt : 0); } };
    }
    act = H.defAct;
  } else {
    const gl = await loadAvatar(kind); if (gen !== H.gen) return;
    act = rigActor(gl, kind);
  }
  H.holder.clear(); H.holder.add(act.group); H.actor = act; H.popT = 0;
  act.group.visible = true;
}
const setHeroSafe = (k) => setHero(k).catch((e) => console.warn("hero", e));
H.on = true;

/* the Teams view: five doctors in a V, rising out of the floor */
const TV = { r: null, sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, 0.1, 60), docs: [], on: false, lift: 0, built: false, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) };
async function buildTeam() {
  if (TV.built) return; TV.built = true;
  TV.r = mkGL($("#teamCv")); TV.r.localClippingEnabled = true; TV.r.clippingPlanes = [TV.plane];
  lights(TV.sc); TV.cam.position.set(0, 1.55, 6.9); TV.cam.lookAt(0, 0.85, -0.2);
  plinth(TV.sc, 2.15);
  const POS = [[-1.25, 0.55], [-0.62, -0.55], [0, 0.85], [0.62, -0.55], [1.25, 0.55]];
  const order = [0, 4, 2, 1, 3];
  for (let i = 0; i < TEAM.length; i++) {
    const m = TEAM[i]; const gl = await loadAvatar(m.key);
    const a = rigActor(gl, m.key, { name: m.name, spec: m.spec, noTag: false, phase: i * 5.2 }); if (a.rig.tag) { a.rig.tag.scale.multiplyScalar(0.4); a.rig.tag.position.y += 0.08; }
    a.group.position.set(POS[i][0], 0, POS[i][1]); a.group.rotation.y = 0; a.base = POS[i]; a.i = i; a.rank = order.indexOf(i); a.rig.group.userData.i = i; TV.sc.add(a.group); TV.docs.push(a);
  }
}

/* ======================================================================== the live board shown with the Command Center */
const live = $("#live");
live.innerHTML = `<h4><i></i>ICU  -  SIX BEDS</h4><canvas width="520" height="130"></canvas><div class="beds">${[1, 2, 3, 4, 5, 6].map((n) => `<div class="bd" data-b="${n}"><b>Bed ${n}</b><span>--</span></div>`).join("")}</div>`;
const lcv = $("canvas", live), lctx = lcv.getContext("2d"); const bedHR = [92, 118, 76, 104, 88, 131];
function drawLive(t) {
  const w = lcv.width, h = lcv.height; lctx.clearRect(0, 0, w, h); lctx.lineWidth = 3; lctx.lineJoin = "round"; lctx.strokeStyle = "#38ffb2"; lctx.shadowColor = "#38ffb2"; lctx.shadowBlur = 8; lctx.beginPath();
  for (let x = 0; x < w; x += 3) { const ph = ((x / w * 3 + t * 0.9) % 1); const v = ph < 0.06 ? -0.12 : ph < 0.1 ? 1 : ph < 0.14 ? -0.35 : ph < 0.32 ? 0.18 * Math.sin((ph - 0.14) / 0.18 * Math.PI) : 0; const y = h * 0.72 - v * h * 0.55; x ? lctx.lineTo(x, y) : lctx.moveTo(x, y); }
  lctx.stroke(); lctx.shadowBlur = 0;
  $$(".bd", live).forEach((b, i) => { const hr = Math.round(bedHR[i] + Math.sin(t * 1.3 + i * 2) * 3); b.lastElementChild.textContent = hr + " bpm"; b.classList.toggle("al", i === 5 && Math.sin(t * 4) > 0); });
}

/* ======================================================================== navigation state */
let view = "home", busy = false, qOpen = false, fly = null;
const toast = (m) => { const t = $("#toast"); t.textContent = m; tw(300, (p) => (t.style.opacity = p), { ease: E.lin }).then(() => wait(1700)).then(() => tw(400, (p) => (t.style.opacity = 1 - p), { ease: E.lin })); };
const info = $("#info");
const stageC = () => { const r = stage.getBoundingClientRect(); return { x: r.left + r.width * 0.52, y: r.top + r.height * 0.42, em: parseFloat(getComputedStyle(stage).fontSize) }; };
const centre = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
/* held upright, the stage is turned a quarter turn (see home.css): a screen-space offset is turned back into the stage's own axes */
const PORT = () => matchMedia("(orientation: portrait) and (max-width: 1100px)").matches;
const FLIP = () => document.documentElement.classList.contains("ccw");
const loc = (dx, dy) => (PORT() ? (FLIP() ? { x: -dy, y: dx } : { x: dy, y: -dx }) : { x: dx, y: dy });
/* open in landscape: ask the phone to lock to it (works where the browser allows it, e.g. full screen or an installed app); where it does not, the stage is turned by hand below */
{ const lock = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape"); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
  lock();
  addEventListener("pointerdown", function fs() { removeEventListener("pointerdown", fs); if (!PORT()) return; const el = document.documentElement; try { const r = el.requestFullscreen && el.requestFullscreen({ navigationUI: "hide" }); if (r && r.then) r.then(lock, () => {}); } catch (e) {} }, { once: true }); }
/* A phone whose screen is locked upright keeps a portrait page even when it is turned on its side. The stage is turned a quarter turn so it fills the
   screen; which way follows how the phone is physically held (left-side-up or right-side-up), read from the tilt sensor. */
{ const root = document.documentElement; let lastG = null;
  const onTilt = (e) => { const g = e.gamma; if (typeof g !== "number" || !PORT()) return; if (g < -32) root.classList.remove("ccw"); else if (g > 32) root.classList.add("ccw"); lastG = g; };
  const start = () => addEventListener("deviceorientation", onTilt);
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    addEventListener("pointerdown", function ask() { removeEventListener("pointerdown", ask); DeviceOrientationEvent.requestPermission().then((r) => { if (r === "granted") start(); }).catch(() => {}); }, { once: true });
  } else start(); }
const hideHero = () => tw(520, (p) => { const f = $("#heroFrame"); f.style.opacity = 1 - p; f.style.transform = `translate3d(-${p * 3}em,0,0) scale(${1 - p * 0.05})`; }, { ease: E.in }).then(() => { H.shown = false; $("#heroFrame").style.visibility = "hidden"; });
const showHero = () => { const f = $("#heroFrame"); f.style.visibility = "visible"; H.shown = true; return tw(800, (p) => { f.style.opacity = p; f.style.transform = `translate3d(${(1 - p) * -3}em,0,0) scale(${0.95 + p * 0.05})`; }, { ease: E.out }).then(() => (f.style.transform = "")); };

async function openParent(id) {
  if (busy || view !== "home") return; busy = true;
  await Promise.all([closeFly(), closeQuick()]);
  const P = PARENTS.find((x) => x.id === id), el = parentEl[id]; sfx("whoosh");
  Object.values(parentEl).filter((t) => t !== el).forEach((t, i) => sink(t, i * 80, 500));
  hideHero();
  /* 1. the tile zooms up softly towards the viewer */
  const C = stageC(), I = centre(el); el.style.zIndex = 6; el.style.pointerEvents = "none"; el._t.hov = false;
  const { x: dx, y: dy } = loc(C.x - I.x, C.y - I.y);
  await tw(750, (p) => { el.style.transform = `translate3d(${dx * p}px,${dy * p}px,${p * 9 * C.em}px) scale(${1 + p * 0.55})`; }, { ease: E.out });
  await wait(260);
  /* 2. it glides to the left and sticks there */
  const from = centre(el); el.style.transform = ""; place(el, "p"); el.classList.add("stuck"); const to = centre(el); const { x: ddx, y: ddy } = loc(from.x - to.x, from.y - to.y);
  tw(800, (p) => { const k = 1 - p; el.style.transform = k > 0.001 ? `translate3d(${ddx * k}px,${ddy * k}px,${k * 9 * C.em}px) scale(${1 + k * 0.55})` : ""; }, { ease: E.io });
  await wait(650);
  info.innerHTML = `<h3>${P.name}</h3><p>${P.desc}</p><button type="button" class="back" id="infoBack">← Back to home</button>`;
  $("#infoBack").onclick = goHome; boxIn(info, 0, 800);
  view = id; $("#bHome").classList.remove("on");
  /* 3. what lies inside rises in the same elevated style */
  if (id === "team") await showTeam();
  else if (id === "cmd") await showCmd(P);
  else await showKids(P);
  busy = false;
}
function showKids(P, slots) {
  const sl = slots || (P.kids.length === 3 ? ["a", "b", "e"] : ["a", "b", "c", "d"]); kidEls = [];
  P.kids.forEach((k, i) => { const el = mkTile(k, sl[i]); el.addEventListener("click", () => openLeaf(k, el)); el.addEventListener("keydown", (e) => { if (e.key === "Enter") openLeaf(k, el); }); kidEls.push(el); if (!i) sfx("whoosh"); });
  const ps = kidEls.map((el, i) => rise(el, i * 170, 1000)); return Promise.all(ps);
}
async function showCmd(P) {
  sfx("whoosh"); const ps = [showKids(P, ["a"])]; ps.push(boxIn(live, 180, 950)); ps.push(boxIn($("#cmdImg"), 360, 1000)); await Promise.all(ps);
}
async function showTeam() {
  sfx("whoosh"); await buildTeam(); TV.on = true; TV.lift = 0; const f = $("#teamFrame"); f.style.display = ""; TV.t0 = clock;
  await Promise.all([tw(700, (p) => { f.style.opacity = Math.min(1, p * 2); f.style.transform = `translate3d(0,${(1 - p) * 3}em,${-(1 - p) * 12}em) rotateX(${(1 - p) * 40}deg)`; }, { ease: E.back }).then(() => { f.style.transform = ""; f.style.pointerEvents = "auto"; }),
    tw(2600, (p) => { TV.lift = p; }, { ease: E.lin, delay: 250 })]);
}
async function goHome() {
  if (busy || view === "home") return; busy = true; sfx("back");
  const cur = view; const P = PARENTS.find((x) => x.id === cur), el = parentEl[cur];
  kidEls.forEach((k, i) => sink(k, i * 60, 450).then(() => k.remove())); kidEls = [];
  boxOut(info); if (cur === "cmd") { boxOut(live); boxOut($("#cmdImg")); }
  if (cur === "team") { const f = $("#teamFrame"); f.style.pointerEvents = "none"; await tw(450, (p) => { f.style.opacity = 1 - p; f.style.transform = `translate3d(0,${p * 3}em,${-p * 10}em) rotateX(${p * 40}deg)`; }, { ease: E.in }); f.style.display = "none"; f.style.transform = ""; TV.on = false; }
  else await wait(420);
  const from = centre(el); place(el, P.slot); el.classList.remove("stuck"); const to = centre(el), C = stageC(), gd = loc(from.x - to.x, from.y - to.y);
  tw(780, (p) => { const k = 1 - p; el.style.transform = k > 0.001 ? `translate3d(${gd.x * k}px,${gd.y * k}px,0)` : ""; }, { ease: E.io });
  await wait(600); el.style.zIndex = "";
  Object.values(parentEl).filter((t) => t !== el).forEach((t, i) => rise(t, i * 130, 950)); sfx("whoosh");
  await showHero(); Object.values(parentEl).forEach((t) => { t.style.pointerEvents = "auto"; setRise(t, 1); });
  view = "home"; $("#bHome").classList.add("on"); busy = false;
}
async function openLeaf(k, el) {
  if (busy) return; busy = true; sfx("tick"); el._t.hov = false; const C = stageC(), I = centre(el), od = loc(C.x - I.x, C.y - I.y); el.style.zIndex = 8;
  kidEls.filter((x) => x !== el).forEach((x) => sink(x, 0, 380));
  await tw(700, (p) => { el.style.transform = `translate3d(${od.x * p}px,${od.y * p}px,${p * 12 * C.em}px) scale(${1 + p * 0.9})`; el.style.opacity = 1 - p * p * 0.3; }, { ease: E.in });
  await launch(k.name, k.href); busy = false;
  if (NONAV) { el.style.transform = ""; el.style.opacity = 1; el.style.zIndex = ""; kidEls.forEach((x) => { x.style.display = ""; setRise(x, 1); }); }
}
async function launch(name, href, img) {
  const L = $("#launch"); $("span", L).textContent = name; L.style.backgroundImage = img ? `linear-gradient(rgba(4,16,40,.25),rgba(4,16,40,.55)),url(${img})` : ""; L.style.backgroundSize = "cover"; L.style.backgroundPosition = "center"; L.classList.toggle("pic", !!img);
  await tw(550, (p) => { L.style.opacity = p; L.style.transform = `scale(${1.08 - p * 0.08})`; }, { ease: E.out });
  if (img) await tw(1400, (p) => { L.style.backgroundSize = `${100 + p * 12}% auto`; L.style.backgroundSize = `${100 + p * 12}% ${100 + p * 12}%`; }, { ease: E.lin }); else await wait(450);
  if (!NONAV) { location.href = href; return; }
  toast("Opens: " + href.replace(/^(\.\.\/)+/, "")); await wait(600);
  await tw(450, (p) => { L.style.opacity = 1 - p; }, { ease: E.in }); L.style.transform = "";
}

/* ======================================================================== quick actions: blood flowing in, the last tile first */
const qt = $("#qtiles"), qs = $("#qstream");
const qEl = QUICK.map((q, i) => { const b = document.createElement("a"); b.className = "qt"; b.href = q.href; b.style.left = i * 15.63 + "em"; b.innerHTML = `${svg(q.ic)}<span><b>${q.name}</b><small>${q.sub}</small></span>`; qt.appendChild(b); return b; });
const NB = 24;
const qFx = QUICK.map(() => { const mk = () => { const i = document.createElement("i"); qs.appendChild(i); return i; }; return { head: mk(), beads: Array.from({ length: NB }, mk), drops: [mk(), mk(), mk()] }; });
function qFlow(i, p, rest) {                                 // p 0..1 time; rest = the slot's left in em
  const b = qEl[i], f = qFx[i], SRC = 66, W = 14.1; const e = E.out(Math.min(1, p / 0.8)); const x0 = SRC - rest + 4; const off = (1 - e) * x0;
  const wob = Math.sin(p * 9) * (1 - p) * 0.4, sx = 1 + (1 - e) * 1.9 + Math.max(0, Math.sin(Math.min(1, p / 0.8) * Math.PI) * 0.08);
  const settle = p > 0.8 ? Math.sin((p - 0.8) / 0.2 * Math.PI * 2) * (1 - p) * 0.9 : 0;
  b.style.opacity = Math.min(1, p * 7); b.style.transform = `translate3d(${off}em,${wob}em,0) scale(${sx + settle * 0.05},${1 - (1 - e) * 0.3 - settle * 0.04})`; b.style.transformOrigin = "100% 50%";
  const cy = 5.1, tx = rest + off + W * 0.5, L = Math.max(0, SRC + 10 - tx);
  const g = p < 0.5 ? Math.min(1, p / 0.12) : Math.max(0, 1 - (p - 0.5) / 0.5), g2 = g * g * (3 - 2 * g), flow = p * 22;
  f.beads.forEach((d, k) => {                                // a rope of beads: the goo filter melts them into one stream of blood
    const u = k / (NB - 1), x = tx + L * (1 - g2) + u * L * g2, thick = (1.05 + 0.55 * Math.sin(u * 9 - flow) + 0.35 * Math.sin(u * 23 + flow * 1.7)) * (0.5 + 0.5 * g2) * (0.7 + 0.3 * (1 - u * 0.4)) * 1.6;
    const yy = cy + 3.5 + Math.sin(u * 6 - flow * 0.8) * 0.5 * g2; d.style.opacity = g2 > 0.02 ? 1 : 0; d.style.left = x - thick + "em"; d.style.top = yy - thick + "em"; d.style.width = d.style.height = thick * 2 + "em";
  });
  const hs = Math.max(0, 1 - Math.max(0, (p - 0.72) / 0.28)); f.head.style.opacity = hs > 0.02 && p > 0.01 ? 1 : 0; f.head.style.left = tx - W * 0.5 * sx * 0.9 + "em"; f.head.style.top = cy - 2.7 * hs + "em"; f.head.style.width = 7 * hs * sx + "em"; f.head.style.height = 5.4 * hs + "em";
  f.drops.forEach((d, k) => { const q = Math.max(0, Math.min(1, (p - 0.08 - k * 0.07) / 0.5)); d.style.opacity = q > 0 && q < 1 ? 1 : 0; d.style.left = tx + 3 + k * 5 - q * 8 + "em"; d.style.top = cy - 3.6 + q * 5 + Math.sin(k * 3) * 1.1 + "em"; const r = 1.1 - k * 0.2; d.style.width = d.style.height = r * (1 - q * 0.5) + "em"; });
}
async function openQuick() {
  if (qOpen || busy) return; busy = true; qOpen = true; $("#bQuick").classList.add("on"); $("#bQuick").setAttribute("aria-expanded", "true"); await closeFly(); sfx("whoosh");
  $("#qrow").style.visibility = "visible"; qEl.forEach((b) => (b.style.opacity = 0)); qEl.forEach((b) => (b.style.pointerEvents = "none"));
  tw(700, (p) => { main.style.transform = `scale(${1 - p * 0.2})`; }, { ease: E.io });
  const D = 1300, GAP = 430;                                      // the last tile runs first, the rest follow one after another
  const ps = [3, 2, 1, 0].map((i, n) => tw(D, (p) => qFlow(i, p, i * 15.63), { delay: 350 + n * GAP, ease: E.lin }));
  await Promise.all(ps); qEl.forEach((b) => { b.style.transform = ""; b.style.pointerEvents = "auto"; b.style.opacity = 1; }); qFx.forEach((f) => { f.head.style.opacity = 0; f.beads.concat(f.drops).forEach((d) => (d.style.opacity = 0)); }); busy = false;
}
async function closeQuick() {
  if (!qOpen) return; qOpen = false; $("#bQuick").classList.remove("on"); $("#bQuick").setAttribute("aria-expanded", "false");
  qEl.forEach((b) => (b.style.pointerEvents = "none"));
  await Promise.all([tw(500, (p) => { qEl.forEach((b, i) => { b.style.opacity = 1 - p; b.style.transform = `translate3d(${p * 6}em,${p * 1.2}em,0)`; }); }, { ease: E.in }), tw(650, (p) => { main.style.transform = `scale(${0.8 + p * 0.2})`; }, { ease: E.io, delay: 150 })]);
  $("#qrow").style.visibility = "hidden"; main.style.transform = "";
}

/* ======================================================================== profile and settings flyouts */
const pP = $("#pProfile"), pS = $("#pSettings");
function paintProfile() {
  $("#railName").textContent = prof.name || "Doctor"; $("#railId").textContent = prof.id || "Tap to sign in";
  $("#railAv").src = HEROES[avKey] ? heroThumb(avKey) : avKey ? avatarThumb(avKey) : new URL("./hero.jpg", import.meta.url).href;
  $("#heroName").textContent = prof.name ? "Welcome, " + prof.name : "Welcome, Doctor"; $("#heroRole").textContent = HEROES[avKey] ? HEROES[avKey].label : avKey ? AVATARS[avKey].label : "Your doctor";
  $$(".avb", pP).forEach((b) => b.classList.toggle("on", b.dataset.k === avKey));
}
pP.innerHTML = `<button class="x" type="button" aria-label="Close">✕</button><h2>Profile</h2><p class="sub">Your sign-in and your doctor. Both are kept on this device.</p>
<label for="pfName">Name</label><input id="pfName" type="text" maxlength="40" autocomplete="name" placeholder="Dr. Your name">
<label for="pfId">Login ID</label><input id="pfId" type="email" maxlength="60" autocomplete="username" placeholder="you@hospital.org">
<label>Choose your doctor</label><div class="avs">${AVATAR_KEYS.map((k) => { const hk = Object.keys(HEROES).find((x) => HEROES[x].replaces === k); return hk ? `<button class="avb" type="button" data-k="${hk}" aria-label="Doctor"><img src="${heroThumb(hk)}" alt=""></button>` : `<button class="avb" type="button" data-k="${k}" aria-label="${AVATARS[k].label}"><img src="${avatarThumb(k)}" alt=""></button>`; }).join("")}</div>
<div class="row"><button class="btn" id="pfSave" type="button">Save</button><button class="btn q" id="pfDef" type="button">Use default doctor</button><button class="btn q" id="pfOut" type="button">Sign out</button></div>`;
$$(".avb", pP).forEach((b) => b.addEventListener("click", () => { avKey = b.dataset.k; try { localStorage.setItem("ccu.doctorAvatar", avKey); } catch (e) { /* ignore */ } sfx("tick"); paintProfile(); setHeroSafe(avKey); }));
$("#pfSave").onclick = () => { prof = { name: $("#pfName").value.trim(), id: $("#pfId").value.trim() }; store.set("ccu.profile", prof); sfx("tick"); paintProfile(); closeFly(); };
$("#pfDef").onclick = () => { avKey = ""; try { localStorage.removeItem("ccu.doctorAvatar"); } catch (e) { /* ignore */ } paintProfile(); setHeroSafe("default"); };
$("#pfOut").onclick = () => { prof = { name: "", id: "" }; store.set("ccu.profile", prof); $("#pfName").value = $("#pfId").value = ""; paintProfile(); };
$(".x", pP).onclick = () => closeFly();

const sl = (id, label, v, min, max, step, unit) => `<div class="set"><span>${label}</span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}"><output id="${id}o">${unit(v)}</output></div>`;
const tg = (id, label, on) => `<div class="tg"><span>${label}</span><button type="button" class="sw${on ? " on" : ""}" id="${id}" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`;
const pct = (v) => Math.round(v * 100) + "%";
function paintSettings() {
  pS.innerHTML = `<button class="x" type="button" aria-label="Close">✕</button><h2>Settings</h2><p class="sub">Sound, motion and picture. Saved on this device.</p>
  ${sl("sMusic", "Music volume", S.music, 0, 1, 0.05, pct)}${sl("sFx", "Effects volume", S.fx, 0, 1, 0.05, pct)}${tg("sMute", "Mute everything", S.mute)}
  <div class="tg"><span>Graphics quality</span><div class="seg" id="sQ">${["low", "med", "high"].map((q) => `<button type="button" data-q="${q}" class="${S.quality === q ? "on" : ""}">${q}</button>`).join("")}</div></div>
  ${tg("sAnim", "Animated doctor", S.heroAnim)}${tg("sRed", "Reduce motion", S.reduced)}${sl("sBlur", "Background blur", S.blur, 0, 24, 1, (v) => v + "px")}
  <div class="row"><button class="btn q" id="sReset" type="button">Reset</button></div>`;
  const bind = (id, key, out) => { const i = $("#" + id, pS); i.oninput = () => { S[key] = +i.value; $("#" + id + "o", pS).textContent = out(S[key]); saveS(); applyS(); }; };
  bind("sMusic", "music", pct); bind("sFx", "fx", pct); bind("sBlur", "blur", (v) => v + "px");
  const sw = (id, key) => { const b = $("#" + id, pS); b.onclick = () => { S[key] = !S[key]; b.classList.toggle("on", S[key]); b.setAttribute("aria-checked", S[key]); saveS(); applyS(); }; };
  sw("sMute", "mute"); sw("sAnim", "heroAnim"); sw("sRed", "reduced");
  $$("#sQ button", pS).forEach((b) => (b.onclick = () => { S.quality = b.dataset.q; $$("#sQ button", pS).forEach((x) => x.classList.toggle("on", x === b)); saveS(); applyS(); }));
  $("#sReset", pS).onclick = () => { Object.assign(S, { music: 0.5, fx: 0.7, mute: false, heroAnim: true, quality: "high", reduced: false, blur: 11 }); saveS(); applyS(); paintSettings(); };
  $(".x", pS).onclick = () => closeFly();
}
function applyS() { reduced = S.reduced || matchMedia("(prefers-reduced-motion: reduce)").matches; applyMusic(); $(".bgimg").style.filter = `blur(${S.blur}px) saturate(1.15) brightness(.95)`; }
async function openFly(which) {
  if (fly === which) return closeFly(); await closeQuick(); if (fly) await closeFly();
  const el = which === "profile" ? pP : pS; if (which === "profile") { $("#pfName").value = prof.name; $("#pfId").value = prof.id; paintProfile(); } else paintSettings();
  fly = which; el.hidden = false; $("#bProfile").classList.toggle("on", which === "profile"); $("#bSet").classList.toggle("on", which === "settings"); sfx("tick");
  await tw(650, (p) => { el.style.opacity = Math.min(1, p * 2); el.style.transform = `translate3d(${-(1 - p) * 2}em,${(1 - p) * 1.4}em,0) scale(${0.94 + 0.06 * p})`; }, { ease: E.back });
}
async function closeFly() {
  if (!fly) return; const el = fly === "profile" ? pP : pS; fly = null; $("#bProfile").classList.remove("on"); $("#bSet").classList.remove("on");
  await tw(320, (p) => { el.style.opacity = 1 - p; el.style.transform = `translate3d(${-p * 1.5}em,0,0) scale(${1 - p * 0.05})`; }, { ease: E.in }); el.hidden = true;
}

/* ======================================================================== rail */
$("#bProfile").onclick = () => { if (!busy) openFly("profile"); };
$("#bSet").onclick = () => { if (!busy) openFly("settings"); };
$("#bQuick").onclick = () => (qOpen ? closeQuick() : openQuick());
$("#bHome").onclick = async () => { sfx("tick"); await Promise.all([closeFly(), closeQuick()]); goHome(); };
$("#bGate").onclick = async () => { if (busy) return; busy = true; sfx("tick"); await Promise.all([closeFly(), closeQuick()]); await launch("", "../universe/living-command.html?v=20261126gi&at=gate"); busy = false; };
$("#teamGo").onclick = () => { if (!busy) { busy = true; launch("Team room", "../index.html?to=team").then(() => (busy = false)); } };
addEventListener("keydown", (e) => { if (e.key === "Escape") { closeFly(); closeQuick(); if (view !== "home") goHome(); } });

/* ======================================================================== live updates footer: runs on its own, pauses under the pointer */
const LANEC = { SCCM: "#ff7a8a", ESICM: "#7ab8ff", KDIGO: "#ffc24a", IDSA: "#7dffb8", ATS: "#6fe6ff", ICMR: "#ffa56b", ARDS: "#c9a6ff" };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FT = { x: 0, half: 0, em: 16, hover: false, n: -1 }, footTrack = $("#footTrack");
const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], p2 = (n) => String(n).padStart(2, "0");
const stampTxt = (ms) => { const d = new Date(ms || Date.now()); return d.getDate() + " " + MONS[d.getMonth()] + ", " + p2(d.getHours()) + ":" + p2(d.getMinutes()); };
const fvCard = (it) => `<a class="fv" href="${esc(it.href || "#")}" target="_blank" rel="noopener noreferrer" title="${esc(it.title)}" style="--lc:${LANEC[it.lane] || "#7ab8ff"}"><span class="r1"><span class="lane">${esc(it.lane)}</span>${it.breaking ? '<span class="nw br">NEW</span>' : it.fresh ? '<span class="nw">LATEST</span>' : ""}<em>${esc(it.ms ? it.when : (it.when || "") + " · " + stampTxt(LIVE && LIVE.updated()))}</em></span><b>${esc(it.title)}</b></a>`;
let LIVE = null; try { LIVE = liveUpdates(); } catch (e) {}
function renderFoot() {
  const its = LIVE ? LIVE.items() : []; const vk = its.length + ":" + (LIVE ? LIVE.version() : 0); if (!its.length || vk === FT.n) return; FT.n = vk;
  const one = its.map(fvCard).join(""); footTrack.innerHTML = one + one;                           /* shown twice, so the loop has no seam */
  FT.half = footTrack.scrollWidth / 2;
}
function footStamp() { const m = $("#footMeta"), u = LIVE ? LIVE.updated() : Date.now(); const d = new Date(u); m.textContent = "Updated " + d.getDate() + " " + MONS[d.getMonth()] + ", " + p2(d.getHours()) + ":" + p2(d.getMinutes()); }
renderFoot(); footStamp(); setInterval(() => { renderFoot(); footStamp(); }, 4000);
$("#footWin").addEventListener("pointerenter", () => { FT.hover = true; }); $("#footWin").addEventListener("pointerleave", () => { FT.hover = false; });
const fEm = () => { FT.em = parseFloat(getComputedStyle(stage).fontSize) || 16; }; fEm(); addEventListener("resize", fEm);
function stepFoot(dt) {
  if (!FT.half) { FT.half = footTrack.scrollWidth / 2; if (!FT.half) return; }
  if (!FT.hover && !reduced) { FT.x += dt * 3.4 * FT.em; if (FT.x >= FT.half) FT.x -= FT.half; }
  footTrack.style.transform = `translate3d(${-FT.x}px,0,0)`;
}

/* ======================================================================== frame */
let last = clock, tAcc = 0;
function frame(now) {
  const dt = Math.min(0.06, Math.max(0, (now - last) / 1000)); last = now; clock = now; tAcc += dt; runTweens(now);
  /* tiles: they float a little and lean towards the pointer */
  $$(".tile", field).forEach((el) => {
    const T = el._t; if (el.style.display === "none") return; const k = Math.min(1, dt * 9);
    const wantX = 0 + (T.hov ? -T.ty * 16 : 0) + (reduced ? 0 : Math.sin(tAcc * 0.9 + T.ph) * 0.4), wantY = 0 + (T.hov ? T.tx * 24 : 0) + (reduced ? 0 : Math.cos(tAcc * 0.7 + T.ph) * 0.35);
    T.rx += (wantX - T.rx) * k; T.ry += (wantY - T.ry) * k; T.lift += ((T.hov ? 1.1 : 0) - T.lift) * k;
    T.slab.style.transform = `translateZ(${T.lift}em) rotateX(${T.rx}deg) rotateY(${T.ry}deg)`; T.bob.style.transform = reduced ? "" : `translateY(${Math.sin(tAcc * 1.1 + T.ph) * 0.35}em)`;
  });
  stepFoot(dt); seqFrame();
  if (view === "cmd") drawLive(tAcc);
  /* the hero */
  if (H.shown !== false && H.actor) {
    if (!H.r) { H.r = mkGL(heroCv); applyS(); }
    if (fit(H.r, heroCv, H.cam)) {
      H.actor.update(dt * (H.rate || 1), S.heroAnim);
      H.popT = Math.min(1, H.popT + dt / 0.8); const pp = E.back(H.popT); H.holder.scale.setScalar(0.88 + 0.12 * pp); H.holder.position.y = (1 - pp) * -0.25;
      H.pl.ring.material.opacity = 0.65 + 0.3 * Math.sin(tAcc * 2); H.pl.ring.rotation.z = tAcc * 0.4; H.r.render(H.sc, H.cam);
    }
  }
  if (TV.on && TV.r && TV.docs.length && fit(TV.r, $("#teamCv"), TV.cam)) {
    TV.docs.forEach((a) => { const q = Math.max(0, Math.min(1, TV.lift * 1.7 - a.rank * 0.22)), e = E.out(q); a.group.position.y = (1 - e) * -2.1; a.group.visible = q > 0.001; a.update(dt, S.heroAnim && q >= 0.99); });
    TV.r.render(TV.sc, TV.cam);
  }
}
function loop() { if (manual) return; requestAnimationFrame(loop); frame(performance.now()); }
window.__ccu = { step(ms) { clock += ms; frame(clock); }, manual() { manual = true; clock = performance.now(); last = clock; }, heroRate: (r) => { H.rate = r; }, ready: null, heroTime: (t) => H.actor && H.actor.hero && H.actor.hero.setTime(t), heroKind: () => H.kind, view: () => view, setHero: setHeroSafe, S, openQuick, openParent };

/* ======================================================================== start */
applyS(); paintProfile(); H.shown = true; $("#teamFrame").style.display = "none";
window.__ccu.ready = setHeroSafe(avKey || "default").then(() => Promise.all(AVATAR_KEYS.map((k) => loadAvatar(k).catch(() => {}))));
Object.values(parentEl).forEach((el) => { el.style.display = "none"; });
function seqStart() {
  const pre = document.getElementById("pre"); if (pre) pre.remove();
  SEQ.t0 = clock; SEQ.run = true; SEQ.audio = false; SEQ.last = -1;
  const rail = [...$$("#rail > *")], foot = $("#foot");
  rail.forEach((el) => { el.style.opacity = 0; }); foot.style.opacity = 0;
  sfx("whoosh");
  rail.forEach((el, i) => tw(650, (p) => { el.style.opacity = p; el.style.transform = p >= 1 ? "" : `translateX(${-(1 - p) * 3}em)`; }, { delay: 250 + i * 330, ease: E.out }));
  tw(800, (p) => { foot.style.opacity = p; foot.style.transform = p >= 1 ? "" : `translateY(${(1 - p) * 2.5}em)`; }, { delay: 250 + rail.length * 330 + 300, ease: E.out });
  const brand = $("#brand"), hf = $("#heroFrame"); brand.style.opacity = 0; hf.style.opacity = 0;
  tw(450, (p) => { brand.style.opacity = p; hf.style.opacity = p; hf.style.transform = p >= 1 ? "" : `translate3d(${(1 - p) * -3}em,0,0) scale(${0.95 + p * 0.05})`; }, { delay: Math.max(0, SEQ.b0 * 1000 - 60), ease: E.out });
  PARENTS.forEach((P, i) => rise(parentEl[P.id], Math.max(0, SEQ.tiles[i] * 1000 - 130), 520));
  applyMusic(); music.loop = true; music.preload = "auto"; try { music.currentTime = 0; } catch (e) { /* ignore */ }
  if (!NONAV && S.music > 0 && !S.mute) music.play().then(() => { SEQ.audio = true; syncAudio(); }).catch(() => {});
}
const glowEl = document.createElement("div"); glowEl.id = "beatGlow"; $("#stage").insertBefore(glowEl, $("#stage").firstChild);
function seqFrame() {
  if (!SEQ.run) return; const d = music.duration || 144, t = seqTime() % d;
  const g = t >= SEQ.b0 - 0.02 ? Math.exp(-(((t - SEQ.b0) % SEQ.bp) / SEQ.bp) * 5.5) : 0;
  glowEl.style.opacity = (g * 0.85).toFixed(3);
  const s = Math.floor(seqTime()); if (s !== SEQ.last) { SEQ.last = s; if (SEQ.audio) syncAudio(); }
}
addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });
document.addEventListener("visibilitychange", () => { if (!SEQ.run || NONAV) return; if (document.hidden) music.pause(); else if (gestured || SEQ.audio) music.play().then(() => { SEQ.audio = true; syncAudio(); }).catch(() => {}); });
seqStart();
if (!manual) requestAnimationFrame(loop);
