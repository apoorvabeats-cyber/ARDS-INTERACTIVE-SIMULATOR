import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("view");
const loadEl = document.getElementById("load");
if(!canvas) throw new Error("missing canvas");

const TO_ORGAN = {
  brain: "brain", spinal: "spinal", lungs: "lungs", heart: "heart",
  liver: "liver", pancreas: "pancreas", spleen: "spleen", kidneys: "kidneys",
  bowel: "bowel", bladder: "bladder", stomach: "stomach",
  arteries: "vessels", veins: "vessels"
};
const SKIN = { body: 1, eyes: 1, irises: 1, pupils: 1 };

let renderer;
try{
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
}catch(err){
  if(loadEl) loadEl.textContent = "3D is unavailable in this browser.";
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.02, 40);
scene.add(new THREE.HemisphereLight(0xfff4ea, 0x0c1824, 0.85));
const key = new THREE.DirectionalLight(0xfff7f0, 1.55);
key.position.set(0.8, 2.4, 2.2);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9ec4ea, 0.45);
fill.position.set(-1.6, 1.2, 1.4);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x7fd4e6, 0.7);
rim.position.set(0.2, 1.6, -2.2);
scene.add(rim);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.42, 0.004, 12, 96),
  new THREE.MeshBasicMaterial({ color: 0x7fd4e6, transparent: true, opacity: 0.85 })
);
ring.rotation.x = Math.PI / 2;
scene.add(ring);
const hoop = new THREE.Mesh(
  new THREE.TorusGeometry(0.62, 0.0025, 8, 80),
  new THREE.MeshBasicMaterial({ color: 0x7fd4e6, transparent: true, opacity: 0.28 })
);
hoop.rotation.x = Math.PI / 2.4;
scene.add(hoop);

const byOrgan = {};
const organMeshes = [];
let yaw = 0.35;
let yawTo = 0.35;
let dist = 3.4;
let distTo = 3.4;
let homeDist = 3.4;
const target = new THREE.Vector3(0, 0.9, 0);
const targetTo = new THREE.Vector3(0, 0.9, 0);
const homeTarget = new THREE.Vector3(0, 0.9, 0);
let auto = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let dragging = false;
let moved = 0;
let down = null;
const pointers = new Map();
let lastSpan = 0;
let ready = false;
let hot = "";
const ray = new THREE.Raycaster();

function sayLoad(text){
  if(loadEl) loadEl.textContent = text;
}
function resize(){
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 500;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
function placeCamera(){
  yaw += (yawTo - yaw) * 0.12;
  dist += (distTo - dist) * 0.12;
  target.lerp(targetTo, 0.12);
  camera.position.set(Math.sin(yaw) * dist, target.y + dist * 0.04, Math.cos(yaw) * dist);
  camera.lookAt(target);
}
function mark(id){
  hot = id || "";
  organMeshes.forEach(function(mesh){
    const on = TO_ORGAN[mesh.userData.part] === hot;
    if(mesh.userData.baseEmissive == null) return;
    mesh.material.emissiveIntensity = on ? 0.55 : mesh.userData.baseEmissive;
  });
}
function focus(id){
  const list = byOrgan[id];
  mark(id);
  if(!list || !list.length){
    targetTo.copy(homeTarget);
    distTo = homeDist * 0.72;
    auto = false;
    return;
  }
  const box = new THREE.Box3();
  list.forEach(function(mesh){ box.expandByObject(mesh); });
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  targetTo.copy(center);
  distTo = Math.min(homeDist, Math.max(size * 1.8, 0.38));
  auto = false;
}
function resetView(){
  mark("");
  targetTo.copy(homeTarget);
  distTo = homeDist;
  auto = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
window.hoverOrgan = mark;
window.resetAtlas = resetView;
window.zoomIntoAnatomy = function(id, done){
  let finished = false;
  function finish(){
    if(finished) return;
    finished = true;
    if(typeof done === "function") done();
  }
  if(!ready){ finish(); return; }
  focus(id);
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
  else setTimeout(finish, 1050);
};

function frame(){
  requestAnimationFrame(frame);
  if(auto && !dragging && ready) yawTo += 0.004;
  ring.rotation.z += 0.006;
  hoop.rotation.z -= 0.003;
  hoop.rotation.y += 0.004;
  placeCamera();
  resize();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
new ResizeObserver(resize).observe(canvas);

function idAt(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  if(!rect.width || !rect.height) return "";
  ray.setFromCamera(new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  ), camera);
  const hit = ray.intersectObjects(organMeshes, false)[0];
  if(!hit) return "";
  return TO_ORGAN[hit.object.userData.part] || "";
}

canvas.addEventListener("pointerdown", function(event){
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  dragging = true;
  auto = false;
  moved = 0;
  down = { x: event.clientX, y: event.clientY };
  lastSpan = span();
  try{ canvas.setPointerCapture(event.pointerId); }catch(e){}
});
canvas.addEventListener("pointermove", function(event){
  if(!pointers.has(event.pointerId)){
    if(ready) mark(idAt(event.clientX, event.clientY));
    return;
  }
  const prev = pointers.get(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if(pointers.size === 1){
    yawTo -= (event.clientX - prev.x) * 0.01;
    moved += Math.abs(event.clientX - prev.x) + Math.abs(event.clientY - prev.y);
  }else if(pointers.size >= 2){
    const next = span();
    if(lastSpan) distTo = Math.min(homeDist * 1.4, Math.max(0.35, distTo * (lastSpan / next)));
    lastSpan = next;
    moved += 20;
  }
});
function endPointer(event){
  pointers.delete(event.pointerId);
  if(pointers.size) return;
  dragging = false;
  if(down && moved < 12 && ready){
    const id = idAt(down.x, down.y);
    if(id && window.enterOrgan) window.enterOrgan(id);
  }
  down = null;
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("wheel", function(event){
  event.preventDefault();
  auto = false;
  distTo = Math.min(homeDist * 1.45, Math.max(0.35, distTo + Math.sign(event.deltaY) * 0.16));
}, { passive: false });
function span(){
  const pts = Array.from(pointers.values());
  if(pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

sayLoad("Loading the anatomical model…");
const loader = new GLTFLoader();
loader.load("models/anatomy/human-reference.glb", function(gltf){
  const model = gltf.scene;
  model.traverse(function(obj){
    if(!obj.isMesh) return;
    const part = obj.name || "";
    obj.userData.part = part;
    const mat = obj.material;
    if(mat){
      mat.side = THREE.FrontSide;
      if(part === "body"){
        mat.transparent = true;
        mat.opacity = 0.72;
        mat.depthWrite = false;
        mat.roughness = 0.62;
      }else if(!SKIN[part]){
        mat.emissive = mat.color.clone();
        mat.emissiveIntensity = 0.16;
        obj.userData.baseEmissive = 0.16;
        organMeshes.push(obj);
        const organ = TO_ORGAN[part];
        if(organ){
          if(!byOrgan[organ]) byOrgan[organ] = [];
          byOrgan[organ].push(obj);
        }
      }
    }
  });
  scene.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  homeTarget.copy(center);
  target.copy(center);
  targetTo.copy(center);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  homeDist = (size.y * 0.62) / Math.tan(vFov / 2);
  dist = homeDist;
  distTo = homeDist;
  window.__hraBox = { y: +size.y.toFixed(3), dist: +homeDist.toFixed(3), minY: +box.min.y.toFixed(3), maxY: +box.max.y.toFixed(3) };
  ring.position.y = box.min.y + 0.02;
  ring.scale.setScalar(Math.max(size.x, size.z) * 0.72);
  hoop.position.copy(center);
  ready = true;
  window.__hraReady = true;
  sayLoad("");
}, function(event){
  if(!event.total) return;
  sayLoad("Loading the anatomical model… " + Math.round(event.loaded / event.total * 100) + "%");
}, function(){
  sayLoad("The 3D model could not load. Reload this page. The file is models/anatomy/human-reference.glb (Human Reference Atlas, adult male, simplified for the web).");
});
