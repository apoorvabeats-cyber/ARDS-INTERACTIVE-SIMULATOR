import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MODEL, ORGANS} from './anatomy/explorer-data.js?v=hra1';

window.__anatomyBoot = true;
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = $('anatomy-workspace'), stage = $('anatomy-stage'), canvas = $('view');
const definitions = new Map(ORGANS.map(organ => [organ.id, organ]));
const state = {mode:'internal', selected:null, auto:!reduced, organLayer:true, loaded:false,
  visible:new Set(ORGANS.map(organ => organ.id))};
const groups = new Map(), rows = new Map(), pickMeshes = [];
let renderer, scene, camera, controls, model, skin, targetRing, retryController;
let dirty = true, cameraTween = null, modelTween = false, lost = false, loadGeneration = 0;
let fullDistance = 4, lastFrame = 0, lastTime = 0;
let entryTimer = null, entryFinish = null, entering = false;
let highlight = null, allMaterials = [], bodyMaterials = [], eyeMeshes = [];
const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
const up = new THREE.Vector3(0,1,0), fullTarget = new THREE.Vector3(0,0.92,0);

function panel(open) {
  root.classList.toggle('panel-open', open);
  $('panel-toggle').setAttribute('aria-expanded', String(open));
  if(open && innerWidth <= 900) $('panel-close').focus({preventScroll:true});
  if(!open && innerWidth <= 900) $('panel-toggle').focus({preventScroll:true});
}
$('panel-toggle').onclick = () => panel(!root.classList.contains('panel-open'));
$('panel-close').onclick = () => panel(false);
root.addEventListener('keydown', event => { if(event.key === 'Escape') panel(false); });

// The catalogue and clinical links remain usable when the GPU or model cannot load.
for(const organ of ORGANS) {
  const row = document.createElement('div'); row.className = 'structure-row'; row.style.setProperty('--organ-color', organ.color);
  const select = document.createElement('button'); select.type = 'button'; select.textContent = organ.name;
  select.setAttribute('aria-pressed','false'); select.onclick = () => visitOrgan(organ.id);
  const visibility = document.createElement('input'); visibility.type = 'checkbox'; visibility.checked = true;
  visibility.setAttribute('aria-label',`Show ${organ.name}`); visibility.onchange = () => setOrganVisible(organ.id, visibility.checked);
  row.append(select,visibility); $('structure-list').append(row); rows.set(organ.id,{row,select,visibility});
}
$('organ-search').addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase(); let matches = 0;
  for(const organ of ORGANS) { const show = `${organ.name} ${organ.system}`.toLowerCase().includes(query); rows.get(organ.id).row.hidden = !show; matches += Number(show); }
  $('empty-filter').hidden = matches > 0;
});
$('show-all-organs').onclick = () => {
  state.organLayer = true; state.visible = new Set(ORGANS.map(organ => organ.id)); syncLayers(); applyMode();
};
function syncLayers() {
  for(const organ of ORGANS) rows.get(organ.id).visibility.checked = state.visible.has(organ.id);
  $('show-organs').checked = state.organLayer;
  document.querySelectorAll('[data-setting]').forEach(input => { input.checked = state.organLayer; });
}
function layerChange(checked) {
  state.organLayer = checked;
  syncLayers(); applyMode(); dirty = true;
}
$('show-organs').onchange = event => layerChange(event.target.checked);
document.querySelectorAll('[data-setting]').forEach(input => input.onchange = () => layerChange(input.checked));
function setOrganVisible(id,visible) {
  if(!definitions.has(id)) return;
  if(visible) state.visible.add(id); else state.visible.delete(id);
  syncLayers(); applyMode(); dirty = true;
}
function updateInformation() {
  const organ = definitions.get(state.selected);
  $('organ-name').textContent = organ?.name || 'Inside the human body';
  $('organ-system').textContent = organ ? organ.system.toUpperCase() : 'ANATOMICAL REFERENCE';
  $('organ-description').textContent = organ?.description || 'Select an organ on the model or in the list. Isolate it for a closer examination from every direction.';
  $('organ-location').textContent = organ?.location || 'Full-body reference';
  $('organ-source').textContent = organ?.source || 'Human Reference Atlas · CC BY 4.0';
  $('isolate-selected').disabled = !organ || !state.loaded;
  document.querySelector('[data-mode="isolated"]').disabled = !organ || !state.loaded;
  $('selected-lab').disabled = $('selected-arena').disabled = !organ;
  for(const [id,row] of rows) row.select.setAttribute('aria-pressed',String(id === state.selected));
}
function selectOrgan(id) {
  if(!definitions.has(id)) return;
  state.selected = id; setAuto(false); state.visible.add(id); state.organLayer = true;
  if(state.mode === 'external') state.mode = 'internal';
  syncLayers(); updateInformation(); applyMode();
  if(state.mode === 'isolated' && groups.has(id)) focusGroup(id);
  dirty = true;
}
function visitOrgan(id) {
  if(entering || document.body.classList.contains('in') || !definitions.has(id)) return;
  selectOrgan(id); panel(false);
  window.enterOrgan?.(definitions.get(id).clinical);
}
// Reuse the original full-screen portal room after zooming the actual GLB.
window.zoomIntoAnatomy = (clinicalId, complete) => {
  const organ = ORGANS.find(item => item.clinical === clinicalId);
  if(!organ || !state.loaded) { complete(); return; }
  selectOrgan(organ.id); panel(false); setMode('isolated');
  entering = true; controls.enabled = false;
  root.classList.add('entering-organ'); root.setAttribute('aria-busy','true');
  const finish = () => {
    clearTimeout(entryTimer);
    entryTimer = null; entryFinish = null; entering = false;
    root.classList.remove('entering-organ'); root.removeAttribute('aria-busy');
    complete();
  };
  clearTimeout(entryTimer); entryTimer = null; entryFinish = finish;
  if(reduced) finish();
};
$('isolate-selected').onclick = () => setMode('isolated');
$('selected-lab').onclick = () => openClinical('lab');
$('selected-arena').onclick = () => openClinical('arena');
function openClinical(which) {
  if(!state.selected) return;
  setAuto(false); panel(false);
  window.openAnatomyPortal?.(definitions.get(state.selected).clinical,which);
}

function setAuto(on) {
  state.auto = Boolean(on) && state.loaded;
  if(controls) controls.autoRotate = state.auto;
  document.querySelectorAll('[data-view="auto"]').forEach(button => {
    button.setAttribute('aria-pressed',String(state.auto));
    if(button.closest('.mobile-camera')) button.textContent = state.auto ? 'Ⅱ' : '▷';
    else button.textContent = state.auto ? 'Pause rotation' : 'Auto-rotate';
  });
  dirty = true;
}
function setMode(mode) {
  if(!['external','internal','isolated'].includes(mode) || (mode === 'isolated' && !state.selected)) return;
  const previous = state.mode; state.mode = mode;
  if(mode === 'isolated') {
    state.visible.add(state.selected); state.organLayer = true; syncLayers(); setAuto(false); focusGroup(state.selected);
  } else if(previous === 'isolated') resetCamera();
  applyMode();
}
function applyMode() {
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode === state.mode)));
  $('mode-readout').textContent = {external:'External',internal:'Internal',isolated:'Isolated'}[state.mode];
  if(!state.loaded) return;
  const bodyOpacity = {external:1,internal:0.28,isolated:0}[state.mode];
  for(const material of bodyMaterials) material.userData.targetOpacity = bodyOpacity;
  for(const [id,group] of groups) {
    const visible = state.organLayer && state.visible.has(id) && state.mode !== 'external' && (state.mode !== 'isolated' || state.selected === id);
    for(const mesh of group.meshes) mesh.material.userData.targetOpacity = visible ? 1 : 0;
  }
  for(const mesh of eyeMeshes) mesh.material.userData.targetOpacity = state.mode === 'external' ? 1 : state.mode === 'internal' ? 0.35 : 0;
  const started = performance.now();
  for(const material of allMaterials) {
    material.userData.startOpacity = material.opacity;
    material.userData.opacityStarted = started;
  }
  modelTween = true; dirty = true;
}

function moveCamera(position,target) {
  if(!controls) return;
  // Clear accumulated orbit damping before a programmatic camera move.
  const damping = controls.enableDamping, auto = controls.autoRotate;
  controls.enableDamping = false; controls.autoRotate = false; controls.update(0);
  controls.enableDamping = damping; controls.autoRotate = auto;
  if(reduced) { camera.position.copy(position); controls.target.copy(target); controls.update(); }
  else cameraTween = {at:performance.now(),from:camera.position.clone(),to:position.clone(),oldTarget:controls.target.clone(),target:target.clone()};
  dirty = true;
}
function resetCamera(back=false) {
  if(!state.loaded) return;
  if(state.mode === 'isolated' && state.selected) { focusGroup(state.selected,back); return; }
  controls.minDistance = 1.3; controls.maxDistance = Math.max(7,fullDistance*1.7);
  moveCamera(new THREE.Vector3(0,1.04,(back?-1:1)*fullDistance),fullTarget);
}
function focusGroup(id,back=false) {
  const group = groups.get(id); if(!group) return;
  const size = group.box.getSize(new THREE.Vector3());
  const half = Math.max(size.length()/2,0.025), distance = half/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.23/Math.min(1,camera.aspect);
  const direction = camera.position.clone().sub(controls.target).normalize();
  if(back) direction.set(0,0,-1);
  controls.minDistance = Math.max(0.06,half*1.25); controls.maxDistance = Math.max(3,distance*4);
  moveCamera(group.center.clone().addScaledVector(direction,distance),group.center);
}
document.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  if(button.dataset.view === 'auto') setAuto(!state.auto);
  else { setAuto(false); cameraTween = null; resetCamera(button.dataset.view === 'back'); }
});

function showError(title,message) {
  state.loaded = false; window.body3d = false; setAuto(false);
  if(model) model.visible = false;
  dirty = true;
  $('model-state').hidden = false; $('model-state').classList.add('error');
  $('load-title').textContent = title; $('load').textContent = message;
  $('model-progress').hidden = true; $('retry-model').hidden = false;
  $('asset-status').textContent = 'MODEL UNAVAILABLE'; $('model-credit').textContent = 'No anatomical model loaded.';
  document.querySelectorAll('[data-view],[data-mode]').forEach(button => button.disabled = true);
  updateInformation(); $('isolate-selected').disabled = true; document.querySelector('[data-mode="isolated"]').disabled = true;
  if(entering) entryFinish?.();
}
$('retry-model').onclick = () => { if(!renderer || lost) location.reload(); else loadModel(); };

async function modelBytes(url,signal) {
  const response = await fetch(url,{signal});
  if(!response.ok) throw Error(`HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  if(total > MODEL.maxBytes) throw Error('Model exceeds the configured download budget');
  $('model-progress').hidden = false;
  if(!response.body?.getReader) {
    const bytes = await response.arrayBuffer();
    if(bytes.byteLength > MODEL.maxBytes) throw Error('Model exceeds the configured download budget');
    return bytes;
  }
  const reader = response.body.getReader(), chunks = []; let loaded = 0;
  try {
    while(true) {
      const {done,value} = await reader.read(); if(done) break;
      loaded += value.byteLength;
      if(loaded > MODEL.maxBytes) { await reader.cancel(); throw Error('Model exceeds the configured download budget'); }
      chunks.push(value);
      if(total) { $('model-progress').value = loaded/total*100; $('load').textContent = `Loading reference geometry · ${Math.round(loaded/total*100)}%`; }
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(loaded); let offset = 0;
  for(const chunk of chunks) { result.set(chunk,offset); offset += chunk.length; }
  return result.buffer;
}
function disposeModel(object) {
  if(!object) return;
  const geometries = new Set(), materials = new Set();
  object.traverse(mesh => { if(mesh.isMesh) { geometries.add(mesh.geometry); for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]) materials.add(mat); } });
  geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
}
async function loadModel() {
  const generation = ++loadGeneration;
  retryController?.abort();
  const controller = new AbortController(); retryController = controller;
  const timeout = setTimeout(() => controller.abort(),45000);
  $('model-state').hidden = false; $('model-state').classList.remove('error');
  $('load-title').textContent = 'Loading anatomical model'; $('load').textContent = 'Loading locally bundled GLB geometry…';
  $('retry-model').hidden = true; $('model-progress').removeAttribute('value');
  let incoming;
  try {
    const url = new URL(MODEL.url,document.baseURI), bytes = await modelBytes(url,controller.signal);
    if(generation !== loadGeneration) return;
    $('load').textContent = 'Preparing anatomical surfaces…';
    const gltf = await new GLTFLoader().parseAsync(bytes,new URL('.',url).href);
    incoming = gltf.scene;
    const incomingGroups = new Map(), incomingBody = [], incomingEyes = [], incomingMaterials = [], incomingPick = [];
    let foundSkin = null, triangles = 0;
    const sourceMaterials = new Set();
    try { incoming.traverse(mesh => {
      if(!mesh.isMesh) return;
      const id = mesh.userData.anatomyId;
      mesh.frustumCulled = true;
      if(Array.isArray(mesh.material)) throw Error('Configure separate meshes for multi-material anatomy');
      sourceMaterials.add(mesh.material);
      mesh.material = mesh.material.clone(); mesh.material.transparent = true; mesh.material.opacity = 0;
      mesh.material.userData.targetOpacity = 0; incomingMaterials.push(mesh.material);
      triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count)/3;
      if(mesh.name === 'body' && id === 'body') { foundSkin = mesh; incomingBody.push(mesh.material); mesh.renderOrder = 3; }
      else if(['eyes','irises','pupils'].includes(id)) { incomingEyes.push(mesh); mesh.renderOrder = 4; }
      else if(definitions.has(id)) {
        if(!incomingGroups.has(id)) incomingGroups.set(id,{meshes:[],box:new THREE.Box3(),center:new THREE.Vector3()});
        incomingGroups.get(id).meshes.push(mesh); mesh.renderOrder = 1; incomingPick.push(mesh);
      } else throw Error(`Unmapped anatomical mesh: ${mesh.name}`);
    });
    } finally { sourceMaterials.forEach(material => material.dispose()); }
    if(!foundSkin || ORGANS.some(organ => !incomingGroups.has(organ.id))) throw Error('The GLB is missing its body or required anatomical organ groups');
    incoming.updateMatrixWorld(true);
    const bodyBounds = new THREE.Box3().setFromObject(foundSkin);
    if(bodyBounds.getSize(new THREE.Vector3()).y < 1 || bodyBounds.getSize(new THREE.Vector3()).y > 2.5) throw Error('The model must use documented metre-scale coordinates');
    for(const [id,group] of incomingGroups) {
      for(const mesh of group.meshes) group.box.union(new THREE.Box3().setFromObject(mesh));
      group.box.getCenter(group.center);
    }
    if(generation !== loadGeneration) { disposeModel(incoming); return; }
    if(model) { scene.remove(model); disposeModel(model); }
    model = incoming; scene.add(model); skin = foundSkin;
    allMaterials = incomingMaterials; bodyMaterials = incomingBody; eyeMeshes = incomingEyes;
    groups.clear(); for(const [id,group] of incomingGroups) groups.set(id,group);
    pickMeshes.splice(0,pickMeshes.length,...incomingPick);
    model.userData.triangles = triangles; state.loaded = true; window.body3d = true;
    document.body.classList.remove('flat'); document.body.classList.add('live3d');
    $('model-state').hidden = true; $('asset-status').textContent = 'ANATOMICAL GLB LOADED';
    $('structure-count').textContent = `${ORGANS.length} groups`;
    $('model-credit').textContent = 'HRA United Male v1.5 + BodyParts3D stomach · CC BY 4.0';
    document.querySelectorAll('[data-view],[data-mode]').forEach(button => button.disabled = false);
    updateInformation(); resize(); resetCamera(); applyMode(); setAuto(!reduced); dirty = true;
  } catch(error) {
    if(incoming && incoming !== model) disposeModel(incoming);
    if(generation === loadGeneration) showError('Anatomical model could not load',`Expected ${MODEL.url}. ${error.name === 'AbortError' ? 'The request timed out.' : error.message}. Keep the model and vendor folders beside index.html and serve over HTTP(S). No substitute body is shown.`);
  } finally { clearTimeout(timeout); }
}

function environment() {
  // Scanner graphics are geometry; the human and every organ come only from the GLB.
  const floor = new THREE.Group(); scene.add(floor);
  const material = new THREE.LineBasicMaterial({color:0x5ccfac,transparent:true,opacity:0.17});
  for(const radius of [0.57,0.65,0.69]) {
    const points = Array.from({length:97},(_,i) => new THREE.Vector3(Math.cos(i/96*Math.PI*2)*radius,0.002,Math.sin(i/96*Math.PI*2)*radius));
    floor.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),material));
  }
  for(let i=-5;i<=5;i++) {
    const points = [new THREE.Vector3(i*.17,-.006,-.9),new THREE.Vector3(i*.17,-.006,.9),new THREE.Vector3(-.9,-.006,i*.17),new THREE.Vector3(.9,-.006,i*.17)];
    floor.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x59bc99,transparent:true,opacity:.055})));
  }
  targetRing = new THREE.Mesh(new THREE.TorusGeometry(1,.005,6,96),new THREE.MeshBasicMaterial({color:0x8fffd2,transparent:true,opacity:.55,depthTest:false,depthWrite:false}));
  targetRing.visible = false; targetRing.renderOrder = 5; scene.add(targetRing);
}
function resize() {
  if(!renderer) return;
  const rect = canvas.getBoundingClientRect(); if(!rect.width || !rect.height) return;
  renderer.setSize(rect.width,rect.height,false); camera.aspect = rect.width/rect.height; camera.updateProjectionMatrix();
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  fullDistance = Math.max(1.04/tangent,.58/(tangent*camera.aspect));
  if(state.loaded) { cameraTween = null; resetCamera(); } dirty = true;
}
function pickAt(x,y) {
  if(!state.loaded || state.mode === 'external' || !state.organLayer) return null;
  const rect = canvas.getBoundingClientRect();
  pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
  camera.updateMatrixWorld(); ray.setFromCamera(pointer,camera);
  const visible = pickMeshes.filter(mesh => state.visible.has(mesh.userData.anatomyId) && (state.mode !== 'isolated' || mesh.userData.anatomyId === state.selected));
  return ray.intersectObjects(visible,false)[0]?.object.userData.anatomyId || null;
}
function animate(now) {
  requestAnimationFrame(animate);
  if(lost || document.hidden || document.body.classList.contains('in') || now-lastFrame < 1000/30) return;
  const dt = Math.min((now-lastTime)/1000 || .033,.08); lastTime = now; lastFrame = now;
  if(cameraTween) {
    const t = Math.min(1,(now-cameraTween.at)/650), eased = t*t*(3-2*t);
    camera.position.lerpVectors(cameraTween.from,cameraTween.to,eased);
    controls.target.lerpVectors(cameraTween.oldTarget,cameraTween.target,eased);
    if(t === 1) cameraTween = null;
    dirty = true;
  }
  controls.update(dt);
  if(modelTween) {
    modelTween = false;
    for(const material of allMaterials) {
      const target = material.userData.targetOpacity;
      const t = reduced ? 1 : THREE.MathUtils.clamp((now-material.userData.opacityStarted)/650,0,1);
      const eased = t*t*(3-2*t);
      material.opacity = THREE.MathUtils.lerp(material.userData.startOpacity,target,eased);
      material.depthWrite = material.opacity>.98;
      if(material.opacity !== target) modelTween = true;
    }
    model?.traverse(mesh => { if(mesh.isMesh) mesh.visible = mesh.material.opacity>.002; }); dirty = true;
  }
  const active = state.selected || highlight;
  for(const [id,group] of groups) for(const mesh of group.meshes) {
    const intensity = id === active ? .15 : 0;
    if(mesh.material.emissiveIntensity !== intensity) { mesh.material.emissive.set(0x36deb0); mesh.material.emissiveIntensity = intensity; dirty = true; }
  }
  if(targetRing) {
    const group = groups.get(state.selected);
    targetRing.visible = Boolean(group && state.loaded && state.mode !== 'external' && state.organLayer && state.visible.has(state.selected));
    if(targetRing.visible) { targetRing.position.copy(group.center); targetRing.quaternion.copy(camera.quaternion); targetRing.scale.setScalar(Math.max(.04,group.box.getSize(new THREE.Vector3()).length()*.57)); }
  }
  if(dirty) {
    renderer.render(scene,camera);
    // Hold the organ close-up only after its completed zoom is rendered.
    if(entering && !cameraTween && !modelTween && entryTimer === null) entryTimer = setTimeout(entryFinish,650);
    const offset = camera.position.clone().sub(controls.target), angle = (THREE.MathUtils.radToDeg(Math.atan2(offset.x,offset.z))+360)%360;
    $('rotation-angle').textContent = `${String(Math.round(angle)%360).padStart(3,'0')}°`; dirty = false;
  }
}

function initialize() {
  renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(32,1,.01,25); camera.position.set(0,1.04,4);
  controls = new OrbitControls(camera,canvas); controls.target.copy(fullTarget); controls.enablePan = false; controls.enableDamping = true;
  controls.dampingFactor = .1; controls.autoRotateSpeed = .55; controls.minPolarAngle = Math.PI*.15; controls.maxPolarAngle = Math.PI*.85;
  controls.addEventListener('change',() => { dirty = true; }); controls.addEventListener('start',() => { cameraTween = null; setAuto(false); });
  scene.add(new THREE.HemisphereLight(0xe4f7ee,0x192c21,1.7));
  for(const [color,intensity,position] of [[0xffe5d0,3.2,[-2,3,3]],[0x91dcca,1.8,[2,1,1]],[0x64dacb,2.4,[0,2,-3]]]) {
    const light = new THREE.DirectionalLight(color,intensity); light.position.set(...position); scene.add(light);
  }
  environment(); new ResizeObserver(resize).observe(stage); resize();
  const pointers = new Map(); let moved = false;
  canvas.addEventListener('pointerdown',event => { pointers.set(event.pointerId,{x:event.clientX,y:event.clientY}); if(pointers.size===1) moved=false; else moved=true; });
  canvas.addEventListener('pointermove',event => {
    if(pointers.size) { const first = pointers.get(event.pointerId); if(first && Math.hypot(event.clientX-first.x,event.clientY-first.y)>8) moved=true; }
    else {
      const id = pickAt(event.clientX,event.clientY); if(highlight!==id) { highlight=id; dirty=true; }
      canvas.style.cursor = id ? 'pointer' : 'grab';
      $('pickname').textContent = id ? `${definitions.get(id).name} · select to examine` : 'Drag to rotate · pinch or scroll to zoom · select an organ';
    }
  });
  canvas.addEventListener('pointerup',event => {
    const first = pointers.get(event.pointerId), tap = pointers.size===1 && !moved && first && Math.hypot(event.clientX-first.x,event.clientY-first.y)<=8;
    pointers.delete(event.pointerId); if(tap && !entering) { const id=pickAt(event.clientX,event.clientY); if(id) visitOrgan(id); }
  });
  canvas.addEventListener('pointercancel',event => { pointers.delete(event.pointerId); moved=true; });
  canvas.addEventListener('lostpointercapture',event => { pointers.delete(event.pointerId); });
  canvas.addEventListener('pointerleave',() => { if(!pointers.size) { highlight=null; dirty=true; } });
  canvas.addEventListener('keydown',event => {
    if(entering) return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home',' '].includes(event.key)) return;
    event.preventDefault(); cameraTween=null;
    if(event.key===' ') { setAuto(!state.auto); return; }
    setAuto(false); if(event.key==='Home') { resetCamera(); return; }
    const offset=camera.position.clone().sub(controls.target);
    if(event.key==='ArrowLeft'||event.key==='ArrowRight') offset.applyAxisAngle(up,event.key==='ArrowLeft'?-.15:.15);
    else if(event.key==='ArrowUp'||event.key==='ArrowDown') { const spherical=new THREE.Spherical().setFromVector3(offset);spherical.phi=THREE.MathUtils.clamp(spherical.phi+(event.key==='ArrowUp'?-.1:.1),controls.minPolarAngle,controls.maxPolarAngle);offset.setFromSpherical(spherical); }
    else offset.setLength(THREE.MathUtils.clamp(offset.length()*(event.key==='-'?1.12:.88),controls.minDistance,controls.maxDistance));
    camera.position.copy(controls.target).add(offset); controls.update(); dirty=true;
  });
  canvas.addEventListener('webglcontextlost',event => { event.preventDefault(); lost=true; showError('The 3D view was interrupted','Reload to restore the graphical context. The organ information and clinical links remain available.'); });
  canvas.addEventListener('webglcontextrestored',() => { lost=false; loadModel(); });
  window.resetAtlas = () => {
    clearTimeout(entryTimer); entryTimer = null; entryFinish = null; entering = false;
    root.classList.remove('entering-organ'); root.removeAttribute('aria-busy');
    controls.enabled = true; $('figure').style.opacity='1'; cameraTween=null;
    state.mode = 'internal'; applyMode(); resetCamera(); dirty=true;
  };
  requestAnimationFrame(animate); loadModel();
}
window.anatomyViewer = {
  setMode,selectOrgan,setOrganVisible,resetCamera,setAutoRotate:setAuto,
  getState:() => ({mode:state.mode,selected:state.selected,loaded:state.loaded,auto:state.auto,organLayer:state.organLayer,visible:[...state.visible],groups:[...groups.keys()],triangles:model?.userData.triangles || 0,modelUrl:MODEL.url})
};
try { initialize(); } catch(error) { showError('3D graphics are unavailable',`WebGL could not initialize: ${error.message}. Use a browser with WebGL enabled. No substitute image or primitive body is displayed.`); }
updateInformation(); syncLayers();
