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
scene.add(new THREE.HemisphereLight(0xd9ffe8, 0x042018, 0.85));
const key = new THREE.DirectionalLight(0xf4fff8, 1.35);
key.position.set(0.6, 2.4, 2.2);
scene.add(key);
const fill = new THREE.DirectionalLight(0x39f3a0, 0.45);
fill.position.set(-1.6, 1.4, 1.2);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x39f3a0, 1.5);
rim.position.set(0.2, 1.6, -2.2);
scene.add(rim);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.55, 0.006, 10, 80),
  new THREE.MeshBasicMaterial({ color: 0x39f3a0, transparent: true, opacity: 0.7 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.02;
scene.add(ring);
const hoop = new THREE.Mesh(
  new THREE.TorusGeometry(0.78, 0.004, 8, 90),
  new THREE.MeshBasicMaterial({ color: 0x7dffc0, transparent: true, opacity: 0.45 })
);
hoop.position.y = 0.98;
scene.add(hoop);

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
  liver: "Liver", stomach: "Stomach", bowel: "Intestines", kidneys: "Kidneys", multi: "Whole patient"
};

function tissue(color){
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.62,
    metalness: 0.02,
    emissive: color,
    emissiveIntensity: 0.08
  });
}
function place(id, geometry, x, y, z, rx, ry, rz){
  const mesh = new THREE.Mesh(geometry, tissue(place.color));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx || 0, ry || 0, rz || 0);
  mesh.userData.id = id;
  mesh.renderOrder = 1;
  root.add(mesh);
  organMeshes.push(mesh);
  return mesh;
}
function heartGeo(){
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.32);
  shape.bezierCurveTo(0, 0.58, -0.48, 0.58, -0.48, 0.18);
  shape.bezierCurveTo(-0.48, -0.08, -0.16, -0.16, 0, -0.5);
  shape.bezierCurveTo(0.16, -0.16, 0.48, -0.08, 0.48, 0.18);
  shape.bezierCurveTo(0.48, 0.58, 0, 0.58, 0, 0.32);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 3, curveSegments: 20 });
  geo.center();
  geo.scale(0.13, 0.15, 0.11);
  return geo;
}
function lungGeo(){
  const pts = [
    [0.012, 0.12], [0.04, 0.08], [0.068, 0.03], [0.074, -0.03], [0.06, -0.08], [0.028, -0.11]
  ].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.scale(1, 1, 0.62);
  return geo;
}
function liverGeo(){
  const shape = new THREE.Shape();
  shape.moveTo(-0.62, 0.12);
  shape.bezierCurveTo(-0.58, 0.48, -0.05, 0.52, 0.32, 0.28);
  shape.bezierCurveTo(0.5, 0.12, 0.42, -0.16, 0.12, -0.28);
  shape.bezierCurveTo(-0.12, -0.4, -0.55, -0.12, -0.62, 0.12);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 16 });
  geo.center();
  geo.scale(0.26, 0.18, 0.16);
  return geo;
}
function kidneyGeo(){
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.36);
  shape.bezierCurveTo(0.28, 0.34, 0.3, 0.08, 0.16, 0);
  shape.bezierCurveTo(0.3, -0.08, 0.28, -0.34, 0, -0.36);
  shape.bezierCurveTo(-0.22, -0.34, -0.2, -0.05, -0.08, 0);
  shape.bezierCurveTo(-0.2, 0.05, -0.22, 0.34, 0, 0.36);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 14 });
  geo.center();
  geo.scale(0.09, 0.11, 0.08);
  return geo;
}
function stomachGeo(){
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.01, 0.07, 0.01),
    new THREE.Vector3(0.035, 0.05, 0.02),
    new THREE.Vector3(0.05, 0.0, 0.025),
    new THREE.Vector3(0.03, -0.05, 0.015),
    new THREE.Vector3(0.0, -0.07, 0.0),
    new THREE.Vector3(-0.03, -0.045, -0.005)
  ]);
  return new THREE.TubeGeometry(curve, 32, 0.022, 12, false);
}
function bowelGeo(){
  const pts = [];
  for(let i = 0; i < 48; i++){
    const t = i / 47;
    const a = t * Math.PI * 6.2;
    pts.push(new THREE.Vector3(Math.cos(a) * (0.045 + (i % 7) * 0.004), (t - 0.5) * 0.07, Math.sin(a) * 0.035));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.011, 8, false);
}
function brainGeo(){
  const geo = new THREE.SphereGeometry(0.082, 42, 28);
  const pos = geo.attributes.position;
  for(let i = 0; i < pos.count; i++){
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const fold = Math.sin(x * 95) * Math.sin(y * 80) * Math.sin(z * 90);
    const groove = Math.exp(-Math.pow(x / 0.01, 2)) * 0.014;
    const s = 1 + fold * 0.07;
    pos.setXYZ(i, x * s * 1.08, (y * s - groove) * 0.82, z * s * 1.18);
  }
  geo.computeVertexNormals();
  return geo;
}
place.color = 0xd7c8d4;
place("brain", brainGeo(), 0, 1.575, 0.02, 0, 0, 0);
place.color = 0xc9a0b0;
place("brain", new THREE.SphereGeometry(0.038, 20, 14), 0, 1.52, -0.03, 0.4, 0, 0);
place.color = 0xb56a58;
place("thyroid", new THREE.SphereGeometry(1, 16, 12), -0.018, 1.4, 0.078, 0, 0, 0);
organMeshes[organMeshes.length - 1].scale.set(0.016, 0.026, 0.012);
place("thyroid", new THREE.SphereGeometry(1, 16, 12), 0.018, 1.4, 0.078, 0, 0, 0);
organMeshes[organMeshes.length - 1].scale.set(0.016, 0.026, 0.012);
place.color = 0xc9b2b4;
place("thyroid", new THREE.SphereGeometry(1, 10, 8), 0, 1.392, 0.082, 0, 0, 0);
organMeshes[organMeshes.length - 1].scale.set(0.02, 0.006, 0.008);
place.color = 0xd7a8aa;
place("lungs", lungGeo(), -0.09, 1.25, 0.02, 0, 0.15, 0);
place("lungs", lungGeo(), 0.095, 1.255, 0.015, 0, -0.2, 0);
organMeshes[organMeshes.length - 1].scale.set(0.86, 0.92, 0.86);
place.color = 0x8c3030;
place("heart", heartGeo(), 0.028, 1.23, 0.055, 0.15, 0.2, -0.45);
place.color = 0x6b342c;
place("liver", liverGeo(), -0.06, 1.1, 0.04, -Math.PI / 2.4, 0.2, 0);
place.color = 0xc4a06a;
place("stomach", stomachGeo(), 0.04, 1.09, 0.05, 0, -0.4, 0);
place.color = 0xc48472;
place("bowel", bowelGeo(), 0.0, 0.99, 0.035, 0, 0.3, 0);
place.color = 0x7a3036;
place("kidneys", kidneyGeo(), -0.07, 1.03, -0.04, 0, 0.6, 0.1);
place("kidneys", kidneyGeo(), 0.07, 1.025, -0.04, 0, -0.6, -0.1);
organMeshes.forEach(function(mesh){ mesh.userData.base = mesh.scale.clone(); });
let hotId = null;

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
  mark(id);
  window.enterOrgan(id);
}
function mark(id){
  hotId = id || null;
  if(nameplate) nameplate.textContent = hotId ? (names[hotId] || hotId) : "SELECT AN ORGAN";
  document.querySelectorAll("[data-organ]").forEach(function(button){
    button.classList.toggle("on", button.getAttribute("data-organ") === hotId);
  });
}
function idAt(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  ray.setFromCamera(ndc, camera);
  const hitOrgan = ray.intersectObjects(organMeshes, false)[0];
  if(hitOrgan) return hitOrgan.object.userData.id;
  const hitSkin = ray.intersectObjects(skin, false)[0];
  if(hitSkin) return region(hitSkin.point);
  return null;
}
function pick(clientX, clientY){
  const id = idAt(clientX, clientY);
  if(id) choose(id);
}
window.hoverOrgan = mark;
function frame(){
  requestAnimationFrame(frame);
  if(auto && !dragging) yawTo += 0.0045;
  ring.rotation.z += 0.004;
  hoop.rotation.y += 0.003;
  hoop.rotation.z += 0.002;
  const beat = 1 + Math.sin(performance.now() / 160) * 0.07;
  organMeshes.forEach(function(mesh){
    const base = mesh.userData.base;
    if(!base) return;
    if(mesh.userData.id === hotId){
      mesh.scale.set(base.x * beat, base.y * beat, base.z * beat);
      mesh.material.emissiveIntensity = 0.45 + (beat - 1) * 4;
    }else{
      mesh.scale.copy(base);
      mesh.material.emissiveIntensity = 0.08;
    }
  });
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
      color: 0xc8ffe2,
      emissive: 0x0d5a38,
      emissiveIntensity: 0.7,
      roughness: 0.32,
      metalness: 0.04,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
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

canvas.addEventListener("wheel", function(event){
  event.preventDefault();
  distTo = Math.min(5.2, Math.max(1.35, distTo + Math.sign(event.deltaY) * 0.18));
}, { passive: false });
canvas.addEventListener("pointerdown", function(event){
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  dragging = true;
  auto = false;
  moved = 0;
  down = { x: event.clientX, y: event.clientY };
  lastSpan = span();
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", function(event){
  if(!pointers.has(event.pointerId)){
    mark(idAt(event.clientX, event.clientY));
    return;
  }
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
