// Critical Care Hub - interactive 3D anatomy viewer (Three.js r170, ES modules, GitHub Pages ready).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBody, createUniforms, adaptSkinGlb, BAND, regionAt } from './body-model.js';
import { CONFIG, ROOMS, SELECTION, CHIPS } from './modules-data.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const stage = $('stage'), canvas = $('view'), sheet = $('sheet'), tagEl = $('tag'), tagTxt = $('tagtxt');
const loadEl = $('load'), loadTxt = $('loadtxt'), loadBar = $('loadbar');

const state = { sel: null, tab: 'anat', auto: !reduce, layers: { ghost: false, organs: true, skeleton: false, vessels: false } };
let has3d = false, scene, camera, renderer, controls, body, env, U;
let baseDist = 4.3, W = 1, H = 1, hoverId = null, tween = null, interacting = false, resumeAt = 0, raf = 0, T = 0, lastT = 0;
const tmp = new THREE.Vector3();

/* ------------------------------------------------------------------ UI (works without WebGL) */
const link = (href) => (CONFIG.LINK_BASE || '') + href;
const card = (row) => '<a class="card" href="' + esc(link(row[2])) + '"><b>' + esc(row[0]) + '</b><span>' + esc(row[1]) + '</span></a>';

function roomHtml(key) {
  const r = ROOMS[key]; if (!r) return '';
  let h = '<section class="room"><h3>' + esc(r.name) + ' <small>' + esc(r.room) + '</small></h3><p class="lede">' + esc(r.line) + '</p>';
  if (r.learn.length) h += '<h4>Learning lab</h4>' + r.learn.map(card).join('');
  if (r.practice.length) h += '<h4>Practice arena</h4>' + r.practice.map(card).join('');
  if (r.soon) h += '<p class="empty">' + esc(r.soon) + '</p>';
  return h + '</section>';
}

function renderModules() {
  const sel = state.sel ? SELECTION[state.sel] : null;
  let h = '';
  if (sel) {
    h += '<p class="modhead">Modules for <b>' + esc(sel.label) + '</b></p>';
    h += sel.rooms.length ? sel.rooms.map(roomHtml).join('') : '<p class="empty">No dedicated simulator is linked to this region yet. Pick an organ, or browse all modules below.</p>';
  }
  const all = Object.keys(ROOMS).map(roomHtml).join('');
  h += '<details class="all"' + (sel && sel.rooms.length ? '' : ' open') + '><summary>All clinical modules</summary>' + all + '</details>';
  $('modList').innerHTML = h;
}

function renderAnatomy() {
  const sel = state.sel ? SELECTION[state.sel] : null;
  $('aname').textContent = sel ? sel.label : 'Select a region';
  $('atext').textContent = sel ? sel.text : 'Tap the body, or choose a region or organ below. The selected part glows and its clinical modules open.';
  const orgs = sel && sel.organs ? sel.organs : [];
  $('organSec').hidden = !orgs.length;
  $('organChips').innerHTML = orgs.map((id) => '<button type="button" class="chip" data-id="' + id + '">' + esc(SELECTION[id].label) + '</button>').join('');
  document.querySelectorAll('#chips .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === state.sel ? 'true' : 'false'));
  $('sheetTitle').textContent = sel ? sel.label : 'Anatomy and clinical modules';
  $('sheetSub').textContent = sel ? (sel.rooms.length ? 'Modules ready. Expand to open.' : 'No linked simulator yet.') : 'Tap the body to select a region';
}

function setTab(tab) {
  state.tab = tab;
  ['anat', 'mod'].forEach((t) => {
    const on = t === tab;
    $('tab-' + t).setAttribute('aria-selected', on ? 'true' : 'false');
    $('tab-' + t).tabIndex = on ? 0 : -1;
    $('pane-' + t).hidden = !on;
  });
  document.querySelectorAll('#dock [data-act="anat"],#dock [data-act="mods"]').forEach((b) => {
    b.classList.toggle('on', (b.dataset.act === 'anat') === (tab === 'anat') && sheet.dataset.open === 'true');
  });
}
function setSheet(open) {
  sheet.dataset.open = open ? 'true' : 'false';
  $('sheetToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
  setTab(state.tab);
}

function buildChips() {
  $('chips').innerHTML = CHIPS.map((id) => '<button type="button" class="chip" data-id="' + id + '" aria-pressed="false"><i class="k ' + SELECTION[id].kind + '"></i>' + esc(SELECTION[id].label) + '</button>').join('');
}

function skinTarget() {
  if (state.layers.ghost) return 0.25;
  const s = state.sel && SELECTION[state.sel];
  return s && s.kind === 'organ' ? 0.45 : 1;
}

function select(id) {
  if (id && !SELECTION[id]) return;
  state.sel = id || null;
  if (has3d) {
    body.setRegion(id && BAND[id] ? id : null);
    if (id) {
      const f = focusFor(id);
      if (f) flyTo({ target: f.p, dist: baseDist * f.frac, phi: 1.45 }, 0.95);
      tagTxt.textContent = SELECTION[id].label;
    }
  }
  renderAnatomy(); renderModules(); updateTag();
  if (id) { setTab(SELECTION[id].rooms.length ? 'mod' : 'anat'); setSheet(true); }
}

function applyLayers() {
  const L = state.layers;
  if (has3d) { body.organsG.visible = L.organs; body.boneG.visible = L.skeleton; body.vesselG.visible = L.vessels; }
  document.querySelectorAll('#layers button').forEach((b) => b.setAttribute('aria-pressed', L[b.dataset.layer] ? 'true' : 'false'));
}

/* ------------------------------------------------------------------ 3D */
function radialTex(r, g, b) {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'), gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)'); gr.addColorStop(0.35, 'rgba(' + r + ',' + g + ',' + b + ',.35)'); gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
  x.fillStyle = gr; x.fillRect(0, 0, s, s); return new THREE.CanvasTexture(c);
}
function ringTexture() {
  const s = 1024, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); x.translate(s / 2, s / 2); x.strokeStyle = '#7fd4e6';
  [[0.98, 3, 1], [0.92, 1.5, 0.7], [0.62, 1.5, 0.6], [0.34, 1, 0.5]].forEach((p) => { x.globalAlpha = p[2]; x.lineWidth = p[1]; x.beginPath(); x.arc(0, 0, p[0] * s / 2, 0, Math.PI * 2); x.stroke(); });
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * Math.PI * 2, lg = i % 10 === 0, r1 = 0.92 * s / 2, r2 = (lg ? 0.8 : 0.86) * s / 2;
    x.globalAlpha = lg ? 0.9 : 0.5; x.lineWidth = lg ? 3 : 1.5; x.beginPath(); x.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); x.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); x.stroke();
  }
  x.lineWidth = 10; x.globalAlpha = 0.8;
  [[0.2, 0.9], [2.6, 3.4], [4.4, 5.1]].forEach((p) => { x.beginPath(); x.arc(0, 0, 0.72 * s / 2, p[0], p[1]); x.stroke(); });
  x.strokeStyle = '#e2b48a'; x.globalAlpha = 0.6; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 0.5 * s / 2, 1.2, 2.2); x.stroke();
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

function buildEnvironment() {
  const ADD = THREE.AdditiveBlending, g = new THREE.Group(); scene.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.96, 0.06, 96), new THREE.MeshBasicMaterial({ color: 0x061528 })); base.position.y = -0.03; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.008, 8, 128), new THREE.MeshBasicMaterial({ color: 0x7fd4e6, blending: ADD, transparent: true, depthWrite: false }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.002; g.add(rim);
  const spin = new THREE.Group(); g.add(spin);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 96), new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, opacity: 0.95, blending: ADD, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.004; spin.add(disc);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.9, 64), new THREE.MeshBasicMaterial({ map: radialTex(127, 212, 230), transparent: true, opacity: 0.5, blending: ADD, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -0.065; g.add(halo);

  // holographic floor grid, fading outward
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec2 vP; uniform float uTime; void main(){ float r=length(vP); vec2 q=abs(fract(vP*6.0)-0.5); float line=smoothstep(0.47,0.5,max(q.x,q.y)); float mask=1.0-smoothstep(0.9,2.6,r); float inner=smoothstep(0.85,1.0,r); gl_FragColor=vec4(0.5,0.83,0.9,line*mask*inner*0.22); }',
    transparent: true, depthWrite: false, blending: ADD
  }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = -0.062; g.add(grid);

  // expanding scan pulse on the floor
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 128), new THREE.MeshBasicMaterial({ color: 0x7fd4e6, transparent: true, opacity: 0, blending: ADD, depthWrite: false, side: THREE.DoubleSide }));
  pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.006; g.add(pulse);

  // soft projection volume
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 2.3, 72, 1, true), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ float h=vUv.y; float st=0.5+0.5*sin(vUv.x*6.2831*48.0+uTime*0.6); float fade=pow(1.0-h,1.6); float f=1.0-abs(dot(normalize(vN),normalize(vV))); float a=(0.02+0.06*st)*fade+0.12*pow(f,2.0)*fade; gl_FragColor=vec4(0.4,0.83,0.9,a); }',
    transparent: true, depthWrite: false, blending: ADD, side: THREE.DoubleSide
  }));
  cone.position.y = 1.15; g.add(cone);

  // scientific particles
  const PN = 200, ppos = new Float32Array(PN * 3), pr = new Float32Array(PN), pa = new Float32Array(PN), pv = new Float32Array(PN);
  for (let i = 0; i < PN; i++) { pr[i] = Math.sqrt(Math.random()) * 0.58; pa[i] = Math.random() * 6.283; pv[i] = 0.03 + Math.random() * 0.08; ppos[i * 3 + 1] = Math.random() * 2.1; }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const points = new THREE.Points(pgeo, new THREE.PointsMaterial({ map: radialTex(255, 255, 255), color: 0x9fe6f2, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, blending: ADD }));
  points.frustumCulled = false; g.add(points);

  // scanning ring + light curtain
  const scanner = new THREE.Group(); scene.add(scanner);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.006, 8, 128), new THREE.MeshBasicMaterial({ color: 0xd8fbff, transparent: true, opacity: 0.95, blending: ADD, depthWrite: false })); ring.rotation.x = Math.PI / 2; scanner.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 8, 128), new THREE.MeshBasicMaterial({ color: 0x7fd4e6, transparent: true, opacity: 0.18, blending: ADD, depthWrite: false })); ring2.rotation.x = Math.PI / 2; scanner.add(ring2);
  const curtainMat = new THREE.ShaderMaterial({
    uniforms: { uDir: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uDir; varying vec2 vUv; void main(){ float l=uDir>0.0?vUv.y:1.0-vUv.y; gl_FragColor=vec4(0.45,0.9,0.95,pow(l,3.0)*0.3); }',
    transparent: true, depthWrite: false, blending: ADD, side: THREE.DoubleSide
  });
  const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.32, 72, 1, true), curtainMat); scanner.add(curtain);

  return {
    update(dt, t, scanY, up) {
      spin.rotation.y = -t * 0.25;
      scanner.position.y = scanY; curtainMat.uniforms.uDir.value = up ? 1 : -1; curtain.position.y = up ? -0.16 : 0.16;
      if (!reduce) { const pt = (t % 3.2) / 3.2; pulse.scale.setScalar(0.55 + pt * 1.6); pulse.material.opacity = (1 - pt) * 0.45; }
      const pp = pgeo.attributes.position.array, sp = reduce ? 0.25 : 1;
      for (let i = 0; i < PN; i++) {
        let y = pp[i * 3 + 1] + pv[i] * dt * sp; if (y > 2.15) { y = 0; pr[i] = Math.sqrt(Math.random()) * 0.58; }
        pa[i] += dt * 0.05 * sp; pp[i * 3] = pr[i] * Math.cos(pa[i]); pp[i * 3 + 1] = y; pp[i * 3 + 2] = pr[i] * Math.sin(pa[i]);
      }
      pgeo.attributes.position.needsUpdate = true;
    },
    dispose() { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); scanner.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
  };
}

function curDist() { return camera.position.distanceTo(controls.target); }
function fit() {
  const fov = camera.fov * Math.PI / 180;
  baseDist = Math.max((2.45 / 2) / Math.tan(fov / 2), (1.9 / 2) / (Math.tan(fov / 2) * camera.aspect));
}
function resize() {
  if (!has3d) return;
  W = Math.max(stage.clientWidth, 1); H = Math.max(stage.clientHeight, 1);
  const prev = baseDist, wasHome = Math.abs(curDist() - prev) < 0.02 && !tween;
  renderer.setSize(W, H, false); camera.aspect = W / H; fit(); camera.updateProjectionMatrix();
  controls.maxDistance = baseDist * 1.6;
  if (wasHome) { tmp.copy(camera.position).sub(controls.target).normalize(); camera.position.copy(controls.target).addScaledVector(tmp, baseDist); }
}

function flyTo(o, dur) {
  const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  const to = { theta: o.theta !== undefined ? o.theta : s.theta, phi: o.phi !== undefined ? o.phi : s.phi, r: o.dist !== undefined ? o.dist : s.radius, t: o.target ? o.target.clone() : controls.target.clone() };
  let d = to.theta - s.theta; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; to.theta = s.theta + d;
  to.r = THREE.MathUtils.clamp(to.r, controls.minDistance, controls.maxDistance);
  to.phi = THREE.MathUtils.clamp(to.phi, controls.minPolarAngle, controls.maxPolarAngle);
  tween = { t: 0, dur: reduce ? 0.01 : (dur || 0.9), from: { theta: s.theta, phi: s.phi, r: s.radius, t: controls.target.clone() }, to };
}
function stepTween(dt) {
  if (!tween) return;
  tween.t = Math.min(1, tween.t + dt / tween.dur);
  const k = 1 - Math.pow(1 - tween.t, 3), f = tween.from, t = tween.to;
  controls.target.lerpVectors(f.t, t.t, k);
  camera.position.setFromSphericalCoords(f.r + (t.r - f.r) * k, f.phi + (t.phi - f.phi) * k, f.theta + (t.theta - f.theta) * k).add(controls.target);
  if (tween.t >= 1) tween = null;
}
const thetaNow = () => new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)).theta;
function resetView() { flyTo({ theta: 0, phi: 1.45, dist: baseDist, target: new THREE.Vector3(0, 0.96, 0) }, 1.0); }

function focusFor(id) {
  if (BAND[id]) { const f = BAND[id].focus; return { p: new THREE.Vector3(f[0], f[1] + 0.015, f[2]), frac: BAND[id].frac }; }
  const o = body.organs[id];
  if (o) { const p = new THREE.Vector3(); o.group.getWorldPosition(p); return { p, frac: o.frac }; }
  return null;
}

function organAt(cx, cy) {
  if (!state.layers.organs) return null;
  const r = canvas.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
  const ppu = r.height / (2 * curDist() * Math.tan(camera.fov * Math.PI / 360));
  let best = null, bs = 1;
  body.organList.forEach((o) => o.anchors.forEach((a) => {
    tmp.copy(a); o.group.localToWorld(tmp); tmp.project(camera);
    const sx = (tmp.x * 0.5 + 0.5) * r.width, sy = (-tmp.y * 0.5 + 0.5) * r.height;
    const s = Math.hypot(sx - px, sy - py) / Math.max(22, o.rad * ppu * 1.15);
    if (s < bs) { bs = s; best = o.id; }
  }));
  return best;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(cx, cy) {
  const o = organAt(cx, cy); if (o) return o;
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(body.pickMeshes, false);
  if (!hits.length) return null;
  return regionAt(hits[0].point.x, hits[0].point.y - body.rig.position.y);
}

function updateTag() {
  if (!has3d || !state.sel) { tagEl.classList.remove('on'); return; }
  const f = focusFor(state.sel); if (!f) { tagEl.classList.remove('on'); return; }
  const o = body.organs[state.sel]; if (o) o.group.getWorldPosition(tmp); else tmp.copy(f.p);
  tmp.project(camera);
  const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
  tagEl.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  tagEl.classList.toggle('left', x > W - 150);
  tagEl.classList.add('on');
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const t = now / 1000, dt = Math.min(t - (lastT || t), 0.05); lastT = t; T += dt; U.uTime.value = T;
  stepTween(dt);
  controls.autoRotate = state.auto && !interacting && !tween && !state.sel && performance.now() > resumeAt;
  controls.update(dt);
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -0.5, 0.5);
  controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.1, 1.95);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -0.5, 0.5);
  const P = reduce ? 14 : 9, u = (T % P) / P, tri = u < 0.5 ? u * 2 : 2 - u * 2, e = tri * tri * (3 - 2 * tri), scanY = e * 1.95;
  U.uScan.value = scanY; env.update(dt, T, scanY, u < 0.5);
  U.uSkin.value += (skinTarget() - U.uSkin.value) * Math.min(1, dt * 6);
  body.update(dt, T, { scanY, scanning: !reduce, sel: state.sel, hover: hoverId });
  updateTag();
  renderer.render(scene, camera);
}

function init3d() {
  let r;
  try { r = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2.5, powerPreference: 'high-performance' }); } catch (e) { return false; }
  if (!r.getContext()) return false;
  renderer = r;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x071018, 1);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x071018);
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  U = createUniforms(THREE, reduce);
  body = buildBody(THREE, U, { reduce });
  scene.add(body.rig);
  env = buildEnvironment();

  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.96, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.rotateSpeed = 0.85; controls.zoomSpeed = 0.9;
  controls.enablePan = true; controls.screenSpacePanning = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.minDistance = 0.7; controls.minPolarAngle = 0.9; controls.maxPolarAngle = 1.75;
  controls.autoRotateSpeed = 1.6;
  controls.addEventListener('start', () => { interacting = true; tween = null; });
  controls.addEventListener('end', () => { interacting = false; resumeAt = performance.now() + 3500; });

  has3d = true;
  const w = Math.max(stage.clientWidth, 1), h = Math.max(stage.clientHeight, 1);
  renderer.setSize(w, h, false); camera.aspect = w / h; W = w; H = h; fit(); camera.updateProjectionMatrix();
  controls.maxDistance = baseDist * 1.6;
  camera.position.setFromSphericalCoords(baseDist * (reduce ? 1 : 1.3), 1.45, 0).add(controls.target);
  new ResizeObserver(resize).observe(stage);

  // tap / click picking; ignores drags and multi-touch gestures
  const ptrs = new Set(); let tap = null, multi = false;
  canvas.addEventListener('pointerdown', (e) => {
    ptrs.add(e.pointerId);
    if (ptrs.size > 1) multi = true; else { multi = false; tap = { x: e.clientX, y: e.clientY, t: performance.now() }; }
  });
  canvas.addEventListener('pointerup', (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size) return;
    if (tap && !multi && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8 && performance.now() - tap.t < 500) {
      const id = pickAt(e.clientX, e.clientY);
      select(id && id === state.sel ? null : id);
    }
    tap = null; multi = false;
  });
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) { tap = null; multi = false; } });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    hoverId = organAt(e.clientX, e.clientY); canvas.style.cursor = hoverId ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { hoverId = null; canvas.style.cursor = ''; });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { flyTo({ theta: thetaNow() - Math.PI / 12 }, 0.25); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { flyTo({ theta: thetaNow() + Math.PI / 12 }, 0.25); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') flyTo({ dist: curDist() * 0.85 }, 0.3);
    else if (e.key === '-') flyTo({ dist: curDist() * 1.2 }, 0.3);
    else if (e.key === 'Escape') select(null);
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); loadEl.hidden = false; loadTxt.textContent = 'Graphics context lost. Reload the page to continue.'; loadBar.parentElement.hidden = true; });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); try { body.dispose(); env.dispose(); renderer.dispose(); } catch (e) { /* page is closing */ } });
  return true;
}

/* Optional licensed GLB skin shell. Silent fallback to the procedural body when missing or invalid. */
async function tryGlb() {
  const url = CONFIG.MODEL_URL; if (!url) return;
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return;
    loadEl.hidden = false; loadTxt.textContent = 'Loading anatomical model…'; loadBar.style.width = '4%';
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js')]);
    const loader = new GLTFLoader(), draco = new DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/'); loader.setDRACOLoader(draco);
    const gltf = await new Promise((res, rej) => loader.load(url, res, (ev) => { if (ev.total) loadBar.style.width = Math.round(ev.loaded / ev.total * 100) + '%'; }, rej));
    adaptSkinGlb(THREE, gltf.scene, body);
    draco.dispose();
  } catch (err) {
    console.warn('Anatomical GLB not used, showing the built-in body instead:', err && err.message ? err.message : err);
  } finally { loadEl.hidden = true; }
}

/* ------------------------------------------------------------------ wiring */
function wireUi() {
  $('chips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) select(b.dataset.id === state.sel ? null : b.dataset.id); });
  $('organChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) select(b.dataset.id); });
  $('layers').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-layer]'); if (!b) return;
    const k = b.dataset.layer, L = state.layers; L[k] = !L[k];
    if ((k === 'skeleton' || k === 'vessels') && L[k]) L.ghost = true;
    applyLayers();
  });
  $('sheetToggle').addEventListener('click', () => setSheet(sheet.dataset.open !== 'true'));
  ['anat', 'mod'].forEach((t) => $('tab-' + t).addEventListener('click', () => setTab(t)));
  $('tabs').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const t = state.tab === 'anat' ? 'mod' : 'anat'; setTab(t); $('tab-' + t).focus(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.sel && document.activeElement !== canvas) select(null); });
  $('dock').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'anat' || a === 'mods') { setTab(a === 'anat' ? 'anat' : 'mod'); setSheet(true); return; }
    if (!has3d) return;
    if (a === 'front') flyTo({ theta: 0 }, 0.9);
    else if (a === 'back') flyTo({ theta: Math.PI }, 0.9);
    else if (a === 'left') flyTo({ theta: Math.PI / 2 }, 0.9);
    else if (a === 'right') flyTo({ theta: -Math.PI / 2 }, 0.9);
    else if (a === 'rotl') flyTo({ theta: thetaNow() - Math.PI / 4 }, 0.6);
    else if (a === 'rotr') flyTo({ theta: thetaNow() + Math.PI / 4 }, 0.6);
    else if (a === 'zin') flyTo({ dist: curDist() * 0.78 }, 0.4);
    else if (a === 'zout') flyTo({ dist: curDist() * 1.28 }, 0.4);
    else if (a === 'reset') { select(null); resetView(); }
    else if (a === 'auto') { state.auto = !state.auto; b.setAttribute('aria-pressed', state.auto ? 'true' : 'false'); b.classList.toggle('on', state.auto); resumeAt = 0; }
  });
}

function boot() {
  buildChips(); wireUi();
  setSheet(false); setTab('anat'); renderAnatomy(); renderModules(); applyLayers();
  const ok = init3d();
  const autoBtn = document.querySelector('#dock [data-act="auto"]');
  autoBtn.setAttribute('aria-pressed', state.auto ? 'true' : 'false'); autoBtn.classList.toggle('on', state.auto);
  if (!ok) {
    // functional fallback: no WebGL. Region chips and the module list still work.
    $('nogl').hidden = false; canvas.hidden = true; loadEl.hidden = true;
    document.querySelectorAll('#dock button[data-act]').forEach((b) => { if (b.dataset.act !== 'anat' && b.dataset.act !== 'mods') { b.disabled = true; } });
    document.body.classList.add('no3d'); setSheet(true);
    window.__hubReady = true; return;
  }
  document.body.classList.add('has3d');
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => { loadEl.hidden = true; if (!reduce) resetView(); });
  window.__hubReady = true;
  tryGlb();
}
boot();
