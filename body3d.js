import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("view");
const load = document.getElementById("load");
const nameplate = document.getElementById("pickname");
if(!canvas) throw new Error("missing canvas");

let renderer;
try{
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
}catch(err){
  if(load) load.textContent = "3D is unavailable. The picture view stays on.";
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
const target = new THREE.Vector3(0, 0.92, 0);
scene.add(new THREE.HemisphereLight(0xfff1e6, 0x2a2420, 0.72));
const key = new THREE.DirectionalLight(0xfff6ee, 2.1);
key.position.set(0.8, 2.6, 2.4);
scene.add(key);
const fill = new THREE.DirectionalLight(0xf0d2c4, 0.55);
fill.position.set(-1.8, 1.2, 1.4);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffe7d6, 0.35);
rim.position.set(0.2, 1.8, -2.4);
scene.add(rim);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.38, 0.004, 8, 64),
  new THREE.MeshBasicMaterial({ color: 0x8aa0a6, transparent: true, opacity: 0.35 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.02;
scene.add(ring);

const specks = new THREE.BufferGeometry();
const dots = new Float32Array(180);
for(let i = 0; i < dots.length; i++) dots[i] = (Math.random() - 0.5) * 3;
specks.setAttribute("position", new THREE.BufferAttribute(dots, 3));
scene.add(new THREE.Points(specks, new THREE.PointsMaterial({ color: 0xc8d0d2, size: 0.008, transparent: true, opacity: 0.18 })));

const root = new THREE.Group();
scene.add(root);
const organMeshes = [];
const names = {
  brain: "Brain", thyroid: "Thyroid", lungs: "Lungs", heart: "Heart",
  liver: "Liver", stomach: "Stomach", bowel: "Gastrointestinal", kidneys: "Kidneys", multi: "Whole patient"
};

function organ(id, x, y, z, sx, sy, sz, color){
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  );
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.userData.id = id;
  root.add(mesh);
  organMeshes.push(mesh);
  return mesh;
}
organ("brain", 0, 1.58, 0.03, 0.09, 0.075, 0.1, 0xc9bdd6);
organ("thyroid", 0, 1.405, 0.07, 0.055, 0.02, 0.028, 0xc4896a);
organ("lungs", -0.09, 1.28, 0.02, 0.09, 0.12, 0.07, 0x6fbfb8);
organ("lungs", 0.09, 1.27, 0.015, 0.08, 0.115, 0.065, 0x6fbfb8);
organ("heart", 0.035, 1.24, 0.07, 0.055, 0.065, 0.05, 0xc45454);
organ("liver", -0.07, 1.12, 0.05, 0.1, 0.06, 0.07, 0x8a4638);
organ("stomach", 0.055, 1.1, 0.065, 0.06, 0.07, 0.05, 0xc4a15a);
organ("bowel", 0, 1.0, 0.04, 0.1, 0.06, 0.07, 0xd08a78);
organ("kidneys", -0.07, 1.02, -0.04, 0.04, 0.055, 0.03, 0x9a3d45);
organ("kidneys", 0.07, 1.015, -0.04, 0.04, 0.055, 0.03, 0x9a3d45);

let yaw = 0;
let yawTo = 0;
let dist = 3.05;
let distTo = 3.05;
let auto = true;
let dragging = false;
let moved = 0;
let down = null;
const pointers = new Map();
let lastSpan = 0;
const ray = new THREE.Raycaster();
const skin = [];

function wrap(a){
  while(a > Math.PI) a -= Math.PI * 2;
  while(a < -Math.PI) a += Math.PI * 2;
  return a;
}
function resize(){
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 500;
  if(canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())){
    renderer.setSize(w, h, false);
  }
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
function placeCamera(){
  yaw += wrap(yawTo - yaw) * 0.12;
  dist += (distTo - dist) * 0.12;
  camera.position.set(Math.sin(yaw) * dist, target.y + 0.08, Math.cos(yaw) * dist);
  camera.lookAt(target);
}
function region(point){
  const y = point.y;
  const x = point.x;
  if(y > 1.5) return "brain";
  if(y > 1.37) return "thyroid";
  if(y > 1.18) return Math.abs(x) < 0.05 ? "heart" : "lungs";
  if(y > 1.05) return x < -0.01 ? "liver" : "stomach";
  if(y > 0.94) return zFront(point) ? "bowel" : "kidneys";
  return "multi";
}
function zFront(point){ return point.z > 0; }
function choose(id){
  if(!id || !window.enterOrgan) return;
  if(nameplate) nameplate.textContent = names[id] || id;
  window.enterOrgan(id);
}
function pick(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  ray.setFromCamera(ndc, camera);
  const hitOrgan = ray.intersectObjects(organMeshes, false)[0];
  if(hitOrgan){ choose(hitOrgan.object.userData.id); return; }
  const hitSkin = ray.intersectObjects(skin, false)[0];
  if(hitSkin) choose(region(hitSkin.point));
}
function frame(){
  requestAnimationFrame(frame);
  if(auto && !dragging) yawTo += 0.0045;
  ring.rotation.z += 0.004;
  placeCamera();
  resize();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

new ResizeObserver(resize).observe(canvas);

const loader = new GLTFLoader();
loader.load("models/body.glb", function(gltf){
  const model = gltf.scene;
  model.traverse(function(obj){
    if(!obj.isMesh) return;
    obj.material = new THREE.MeshPhysicalMaterial({
      color: 0xc4927c,
      roughness: 0.58,
      metalness: 0,
      sheen: 0.6,
      sheenColor: new THREE.Color(0xffc2ad),
      sheenRoughness: 0.48,
      clearcoat: 0.06,
      clearcoatRoughness: 0.62,
      specularIntensity: 0.28,
      specularColor: new THREE.Color(0xffd0c0),
      side: THREE.FrontSide
    });
    obj.material.onBeforeCompile = function(shader){
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat pores = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);\ndiffuseColor.rgb *= 0.93 + pores * 0.07;"
      );
    };
    obj.renderOrder = 2;
    skin.push(obj);
  });
  root.add(model);
  window.body3d = true;
  document.body.classList.add("live3d");
  if(load) load.textContent = "";
}, function(event){
  if(!load || !event.total) return;
  load.textContent = "Preparing the body… " + Math.round(event.loaded / event.total * 100) + "%";
}, function(){
  if(load) load.textContent = "The 3D body could not load. The picture view stays on.";
  document.body.classList.add("flat");
});

document.getElementById("dock").addEventListener("click", function(event){
  const button = event.target.closest("button");
  if(!button) return;
  if(button.dataset.yaw != null){
    auto = false;
    yawTo = yaw + wrap(parseFloat(button.dataset.yaw) - wrap(yaw));
    markAuto();
  }
  if(button.id === "resetview"){
    auto = true;
    yawTo = yaw + wrap(0 - wrap(yaw));
    distTo = 3.05;
    markAuto();
  }
  if(button.id === "autorot"){
    auto = !auto;
    markAuto();
  }
  if(button.id === "zin") distTo = Math.max(1.35, distTo - 0.28);
  if(button.id === "zout") distTo = Math.min(5.2, distTo + 0.28);
});
function markAuto(){
  const button = document.getElementById("autorot");
  button.classList.toggle("on", auto);
  button.textContent = auto ? "Auto-rotate" : "Auto-rotate off";
}
canvas.addEventListener("wheel", function(event){
  event.preventDefault();
  distTo = Math.min(5.2, Math.max(1.35, distTo + Math.sign(event.deltaY) * 0.18));
}, { passive: false });
canvas.addEventListener("pointerdown", function(event){
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  dragging = true;
  auto = false;
  markAuto();
  moved = 0;
  down = { x: event.clientX, y: event.clientY };
  lastSpan = span();
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", function(event){
  if(!pointers.has(event.pointerId)) return;
  const prev = pointers.get(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if(pointers.size === 1){
    yawTo -= (event.clientX - prev.x) * 0.01;
    moved += Math.abs(event.clientX - prev.x) + Math.abs(event.clientY - prev.y);
  } else if(pointers.size >= 2){
    const next = span();
    if(lastSpan) distTo = Math.min(5.2, Math.max(1.35, distTo * (lastSpan / next)));
    lastSpan = next;
    moved += 30;
  }
});
function endPointer(event){
  pointers.delete(event.pointerId);
  if(pointers.size === 0){
    dragging = false;
    if(down && moved < 14) pick(down.x, down.y);
    down = null;
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
function span(){
  const pts = Array.from(pointers.values());
  if(pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}
