import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

let atlasPromise = null;

function loadAtlas(){
  if(atlasPromise) return atlasPromise;
  atlasPromise = new Promise(function(resolve, reject){
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    loader.setDRACOLoader(draco);
    loader.load("neuro/brain.glb", function(gltf){ resolve(gltf); }, undefined, reject);
  });
  return atlasPromise;
}

loadAtlas();

function clamp(k){ return Math.max(0, Math.min(1, k)); }
function mix(a, b, k){ return a + (b - a) * k; }
function phase(t, a, b){ return clamp((t - a) / (b - a)); }
function smooth(k){ return k * k * (3 - 2 * k); }
function matsOf(mesh){ return Array.isArray(mesh.material) ? mesh.material : [mesh.material]; }

export function mountFilm(canvas, hud, onGrab){
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  }catch(err){
    if(hud) hud.textContent = "This device could not start the 3D view.";
    return { frame: function(){}, recenter: function(){}, pick: function(){ return ""; }, dispose: function(){} };
  }
  renderer.setClearColor(0x070b10, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070b10, 2.5, 8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  if("environmentIntensity" in scene) scene.environmentIntensity = 0.62;

  scene.add(new THREE.HemisphereLight(0xf6f1e8, 0x121820, 0.55));
  const key = new THREE.DirectionalLight(0xfff6ee, 2.4);
  key.position.set(1.6, 2.4, 2.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc5d5df, 0.55);
  fill.position.set(-2.2, 0.4, -1.2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9fd4e4, 1.15);
  rim.position.set(-1.2, 1.6, -2.4);
  scene.add(rim);
  const spot = new THREE.SpotLight(0xfff4e8, 8, 4, 0.45, 0.6, 1.2);
  spot.position.set(0.4, 0.8, 0.6);
  scene.add(spot);
  scene.add(spot.target);

  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.01, 40);
  camera.position.set(0.4, 0.15, 1.2);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.65;
  controls.minDistance = 0.05;
  controls.maxDistance = 8;
  let userLooking = false;
  controls.addEventListener("start", function(){
    userLooking = true;
    if(onGrab) onGrab();
  });

  const fx = new THREE.Group();
  scene.add(fx);
  const props = new Map();
  const used = new Set();
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  let model = null;
  let meshes = [];
  let span = 1;
  let rightSign = 1;
  let L = {};
  let ready = false;
  let showId = "";
  let sets = null;

  function size(){
    const w = Math.max(320, canvas.clientWidth || 640);
    const h = Math.max(180, Math.round(w * 9 / 16));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function centerOf(label, side){
    const box = new THREE.Box3();
    let n = 0;
    meshes.forEach(function(mesh){
      if(mesh.userData.bx_label !== label) return;
      if(side && mesh.userData.bx_side !== side) return;
      box.expandByObject(mesh);
      n += 1;
    });
    if(!n || box.isEmpty()) return null;
    return box.getCenter(new THREE.Vector3());
  }

  function extreme(label, side, score){
    let best = null;
    let bestS = -Infinity;
    const v = new THREE.Vector3();
    meshes.forEach(function(mesh){
      if(mesh.userData.bx_label !== label) return;
      if(side && mesh.userData.bx_side !== side) return;
      const pos = mesh.geometry && mesh.geometry.attributes && mesh.geometry.attributes.position;
      if(!pos) return;
      mesh.updateWorldMatrix(true, false);
      const step = pos.count > 8000 ? 6 : 1;
      for(let i = 0; i < pos.count; i += step){
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const s = score(v);
        if(s > bestS){ bestS = s; best = v.clone(); }
      }
    });
    return best;
  }

  function restore(){
    if(!model) return;
    model.visible = true;
    model.scale.setScalar(1);
    meshes.forEach(function(mesh){
      mesh.position.copy(mesh.userData.basePos);
      mesh.scale.copy(mesh.userData.baseScale);
      mesh.visible = true;
      matsOf(mesh).forEach(function(mat){
        if(!mat || !mat.color || !mat.userData.base) return;
        mat.color.copy(mat.userData.base);
        mat.opacity = mat.userData.baseOpacity;
        mat.transparent = mat.userData.baseTransparent;
        mat.depthWrite = true;
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
        mat.clippingPlanes = null;
      });
    });
    if(sets){
      sets.airway.group.visible = false;
      sets.wrist.group.visible = false;
      sets.neck.group.visible = false;
      sets.spine.group.visible = false;
    }
  }

  function veil(opacity){
    meshes.forEach(function(mesh){
      const cat = mesh.userData.bx_cat;
      if(cat !== "cortex" && cat !== "white_matter") return;
      matsOf(mesh).forEach(function(mat){
        if(!mat) return;
        mat.transparent = true;
        mat.opacity = opacity;
        mat.depthWrite = false;
      });
    });
  }

  function eachLabel(labels, fn){
    const want = {};
    labels.forEach(function(name){ want[name] = true; });
    meshes.forEach(function(mesh){
      if(want[mesh.userData.bx_label]) fn(mesh);
    });
  }

  function tint(labels, color, intensity){
    eachLabel(labels, function(mesh){
      matsOf(mesh).forEach(function(mat){
        if(!mat || !mat.color) return;
        mat.color.set(color);
        if(mat.emissive){
          mat.emissive.set(color);
          mat.emissiveIntensity = intensity == null ? 0.22 : intensity;
        }
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
      });
    });
  }

  function tintTest(fn, color, intensity){
    meshes.forEach(function(mesh){
      if(!fn(mesh)) return;
      matsOf(mesh).forEach(function(mat){
        if(!mat || !mat.color) return;
        mat.color.set(color);
        if(mat.emissive){
          mat.emissive.set(color);
          mat.emissiveIntensity = intensity == null ? 0.18 : intensity;
        }
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
      });
    });
  }

  function enlarge(labels, factor){
    eachLabel(labels, function(mesh){
      mesh.scale.copy(mesh.userData.baseScale).multiplyScalar(factor);
    });
  }

  function nudge(label, side, offset){
    meshes.forEach(function(mesh){
      if(mesh.userData.bx_label !== label) return;
      if(side && mesh.userData.bx_side !== side) return;
      mesh.position.copy(mesh.userData.basePos).add(offset);
    });
  }

  function hideProps(){
    props.forEach(function(p, id){
      if(!used.has(id)) p.mesh.visible = false;
    });
    used.clear();
  }

  function physical(color, extra){
    return new THREE.MeshPhysicalMaterial(Object.assign({
      color: color, roughness: 0.35, clearcoat: 0.45, metalness: 0.02
    }, extra || {}));
  }

  function sphere(id, pos, radius, color, opacity){
    if(!pos || radius <= 0) return;
    used.add(id);
    let p = props.get(id);
    if(!p){
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), physical(color, { transparent: true, opacity: opacity }));
      fx.add(mesh);
      p = { mesh: mesh, kind: "sphere" };
      props.set(id, p);
    }
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(radius);
    p.mesh.material.color.set(color);
    p.mesh.material.opacity = opacity == null ? 1 : opacity;
    p.mesh.material.transparent = (opacity == null ? 1 : opacity) < 0.98;
    p.mesh.userData.spot = "";
  }

  function tube(id, points, radius, progress, color){
    if(!points || points.length < 2 || progress <= 0.01) return;
    used.add(id);
    const key = points.map(function(p){ return p.x.toFixed(3) + "," + p.y.toFixed(3) + "," + p.z.toFixed(3); }).join("|") + ":" + radius.toFixed(4);
    let p = props.get(id);
    if(!p || p.key !== key){
      if(p){
        fx.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, 50, radius, 12, false);
      const mesh = new THREE.Mesh(geo, physical(color, {
        transparent: true, opacity: 0.94, roughness: 0.18, clearcoat: 0.8, transmission: 0.12, thickness: 0.2
      }));
      mesh.userData.curve = curve;
      fx.add(mesh);
      p = { mesh: mesh, key: key };
      props.set(id, p);
    }
    p.mesh.visible = true;
    const curve = p.mesh.userData.curve;
    const u = clamp(progress);
    const pt = curve.getPoint(u);
    const tan = curve.getTangent(Math.max(0.001, Math.min(0.999, u))).clone();
    clip.setFromNormalAndCoplanarPoint(tan.negate(), pt);
    p.mesh.material.clippingPlanes = [clip];
    p.mesh.material.color.set(color);
    p.mesh.userData.spot = "";
  }

  function disc(id, pos, normal, radius, open){
    if(!pos) return;
    used.add(id);
    let p = props.get(id);
    if(!p){
      const group = new THREE.Group();
      const bone = physical(0xe4d5c4, { roughness: 0.55, clearcoat: 0.2 });
      const plate = new THREE.Mesh(new THREE.CircleGeometry(1, 28), bone);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 28), bone);
      group.add(plate);
      group.add(ring);
      fx.add(group);
      p = { mesh: group, plate: plate, ring: ring };
      props.set(id, p);
    }
    p.mesh.visible = true;
    p.mesh.position.copy(pos);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    p.mesh.quaternion.copy(q);
    const hole = clamp(open);
    p.plate.scale.setScalar(radius * (1 - hole));
    p.ring.scale.setScalar(radius);
    p.plate.visible = hole < 0.98;
  }

  function flow(id, points, t, radius, color, speed){
    if(!points || points.length < 2) return;
    used.add(id);
    let p = props.get(id);
    if(!p){
      const n = 70;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const mat = new THREE.PointsMaterial({ color: color, size: radius * 2.2, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true });
      const mesh = new THREE.Points(geo, mat);
      fx.add(mesh);
      p = { mesh: mesh, n: n };
      props.set(id, p);
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const arr = p.mesh.geometry.attributes.position.array;
    for(let i = 0; i < p.n; i++){
      const u = (i / p.n + t * (speed || 0.15)) % 1;
      const jitter = (i % 5) / 5;
      const c = curve.getPoint(u);
      const bin = new THREE.Vector3(rightSign, 0.2, 0).normalize().multiplyScalar(radius * jitter);
      c.add(bin);
      arr[i * 3] = c.x; arr[i * 3 + 1] = c.y; arr[i * 3 + 2] = c.z;
    }
    p.mesh.geometry.attributes.position.needsUpdate = true;
    p.mesh.material.color.set(color);
    p.mesh.material.size = Math.max(span * 0.004, radius * 2);
    p.mesh.visible = true;
  }

  function markSpot(id, spot){
    const p = props.get(id);
    if(p) p.mesh.userData.spot = spot;
  }

  function look(target, dist, yaw, pitch, fov){
    const a = target || new THREE.Vector3();
    const cp = Math.cos(pitch);
    const p = new THREE.Vector3(
      Math.sin(yaw) * cp * dist,
      Math.sin(pitch) * dist,
      Math.cos(yaw) * cp * dist
    ).add(a);
    if(!userLooking){
      camera.position.copy(p);
      controls.target.copy(a);
      camera.fov = fov || 32;
      camera.updateProjectionMatrix();
    }
    spot.position.copy(p);
    spot.target.position.copy(a);
  }

  function api(t){
    return {
      t: t,
      span: span,
      right: rightSign,
      L: L,
      look: look,
      veil: veil,
      tint: tint,
      tintTest: tintTest,
      enlarge: enlarge,
      nudge: nudge,
      sphere: sphere,
      tube: tube,
      disc: disc,
      flow: flow,
      mark: markSpot,
      swell: function(amount){ if(model) model.scale.setScalar(1 + amount); },
      hideBrain: function(){ if(model) model.visible = false; },
      show: function(name){ if(sets && sets[name]) sets[name].group.visible = true; }
    };
  }

  function buildSets(){
    const s = span;
    const mucosa = physical(0xb56a62, { roughness: 0.4, clearcoat: 0.4, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xf0c2b4) });
    const airway = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(s * 0.09, s * 0.22),
      new THREE.Vector2(s * 0.07, s * 0.12),
      new THREE.Vector2(s * 0.055, s * 0.04),
      new THREE.Vector2(s * 0.028, 0),
      new THREE.Vector2(s * 0.04, -s * 0.06),
      new THREE.Vector2(s * 0.048, -s * 0.2)
    ], 40), mucosa);
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.13, s * 0.1, s * 0.55, 36, 1, true), mucosa.clone());
    throat.material.side = THREE.BackSide;
    airway.add(throat);
    airway.add(wall);
    const foldMat = physical(0xf0d2c4, { roughness: 0.28, clearcoat: 0.7 });
    const folds = [0, 1].map(function(i){
      const m = new THREE.Mesh(new THREE.BoxGeometry(s * 0.055, s * 0.014, s * 0.045), foldMat);
      m.position.set((i ? 1 : -1) * s * 0.02, s * 0.01, 0);
      airway.add(m);
      return m;
    });
    const tubeMat = physical(0xd5e6ea, { transparent: true, opacity: 0.92, roughness: 0.15, transmission: 0.25, thickness: 0.15 });
    const ett = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.012, s * 0.012, s * 0.28, 20), tubeMat);
    const cuff = new THREE.Mesh(new THREE.SphereGeometry(s * 0.02, 16, 12), tubeMat);
    cuff.scale.set(1, 0.45, 1);
    airway.add(ett);
    airway.add(cuff);
    airway.visible = false;
    scene.add(airway);

    const skin = physical(0xc49a86, { roughness: 0.48, clearcoat: 0.15, sheen: 0.6, sheenColor: new THREE.Color(0xe7b8a4), transmission: 0.08, thickness: 0.4 });
    const wrist = new THREE.Group();
    wrist.add(new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.09, s * 0.28, 8, 20), skin));
    const artery = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.012, s * 0.26, 6, 16), physical(0x9a3030, { roughness: 0.32, clearcoat: 0.4 }));
    artery.rotation.z = Math.PI / 2;
    artery.position.y = s * 0.02;
    wrist.add(artery);
    const artCath = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.004, s * 0.004, s * 0.16, 12), tubeMat);
    artCath.rotation.z = Math.PI / 2.4;
    wrist.add(artCath);
    wrist.visible = false;
    scene.add(wrist);

    const neck = new THREE.Group();
    const neckSkin = new THREE.Mesh(new THREE.BoxGeometry(s * 0.36, s * 0.08, s * 0.28), skin);
    neck.add(neckSkin);
    const vein = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.028, s * 0.16, 6, 16), physical(0x3e5c78, { roughness: 0.3, clearcoat: 0.5 }));
    vein.rotation.x = Math.PI / 2;
    vein.position.set(-s * 0.05, -s * 0.01, 0);
    const carotid = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.02, s * 0.16, 6, 16), physical(0x8e2c2c, { roughness: 0.3 }));
    carotid.rotation.x = Math.PI / 2;
    carotid.position.set(s * 0.06, -s * 0.015, 0);
    neck.add(vein);
    neck.add(carotid);
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.003, s * 0.0015, s * 0.12, 10), physical(0xd7dde0, { metalness: 0.65, roughness: 0.2 }));
    neck.add(needle);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.0012, s * 0.0012, s * 0.2, 8), physical(0xe8e4dc, { metalness: 0.8, roughness: 0.25 }));
    wire.rotation.x = Math.PI / 2;
    neck.add(wire);
    neck.visible = false;
    scene.add(neck);

    const bone = physical(0xe6d7c8, { roughness: 0.62 });
    const spine = new THREE.Group();
    for(let i = 0; i < 4; i++){
      const v = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.05, s * 0.05, s * 0.028, 20), bone);
      body.rotation.x = Math.PI / 2;
      const spinous = new THREE.Mesh(new THREE.BoxGeometry(s * 0.012, s * 0.05, s * 0.016), bone);
      spinous.position.y = s * 0.04;
      v.add(body);
      v.add(spinous);
      v.position.z = (i - 1.5) * s * 0.07;
      spine.add(v);
    }
    const csf = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.012, s * 0.012, s * 0.22, 12), physical(0xc5e7f2, { transparent: true, opacity: 0.75, transmission: 0.4 }));
    csf.rotation.x = Math.PI / 2;
    csf.position.y = -s * 0.01;
    spine.add(csf);
    const lpNeedle = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.003, s * 0.001, s * 0.16, 10), physical(0xd5dde2, { metalness: 0.7, roughness: 0.18 }));
    spine.add(lpNeedle);
    spine.visible = false;
    scene.add(spine);

    sets = {
      airway: { group: airway, folds: folds, ett: ett, cuff: cuff },
      wrist: { group: wrist, artery: artery, cath: artCath },
      neck: { group: neck, vein: vein, carotid: carotid, needle: needle, wire: wire },
      spine: { group: spine, needle: lpNeedle }
    };
  }

  function fit(gltf){
    model = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const size = box.getSize(new THREE.Vector3());
    span = Math.max(size.x, size.y, size.z);
    scene.fog.near = span * 0.9;
    scene.fog.far = span * 4.2;
    camera.near = span / 800;
    camera.far = span * 20;
    let leftSum = 0, leftN = 0;
    model.traverse(function(obj){
      if(!obj.isMesh) return;
      const src = Array.isArray(obj.material) ? obj.material : [obj.material];
      const cloned = src.map(function(m){ return m ? m.clone() : m; });
      obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
      cloned.forEach(function(mat){
        if(!mat || !mat.color) return;
        mat.userData.base = mat.color.clone();
        mat.userData.baseOpacity = mat.opacity == null ? 1 : mat.opacity;
        mat.userData.baseTransparent = !!mat.transparent;
        if(mat.emissive) mat.emissive = new THREE.Color(0x000000);
        mat.envMapIntensity = 0.7;
      });
      obj.userData.basePos = obj.position.clone();
      obj.userData.baseScale = obj.scale.clone();
      meshes.push(obj);
    });
    scene.add(model);
    model.updateMatrixWorld(true);
    leftSum = 0;
    leftN = 0;
    meshes.forEach(function(obj){
      const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      obj.userData.mid = c;
      if(obj.userData.bx_side === "left"){ leftSum += c.x; leftN += 1; }
    });
    rightSign = leftN && (leftSum / leftN) < 0 ? 1 : -1;
    L.horn = extreme("Lateral ventricle", "right", function(v){ return v.z * 1.5 + v.y * 0.65 + v.x * rightSign * 0.15; })
      || centerOf("Lateral ventricle", "right")
      || new THREE.Vector3(rightSign * span * 0.08, span * 0.05, span * 0.08);
    L.third = centerOf("Third ventricle") || new THREE.Vector3(0, 0, 0);
    L.fourth = centerOf("Fourth ventricle") || new THREE.Vector3(0, -span * 0.08, -span * 0.05);
    L.mca = centerOf("Middle cerebral artery (M1-segment)", "left") || new THREE.Vector3(-rightSign * span * 0.12, 0, span * 0.02);
    L.mcaR = centerOf("Middle cerebral artery (M1-segment)", "right") || L.mca.clone().multiply(new THREE.Vector3(-1, 1, 1));
    L.acom = centerOf("Anterior communicating artery") || new THREE.Vector3(0, span * 0.02, span * 0.12);
    L.pcom = centerOf("Posterior communicating artery", "left") || L.mca.clone();
    L.ica = centerOf("Internal carotid artery", "left") || L.mca.clone().add(new THREE.Vector3(0, -span * 0.04, span * 0.04));
    L.basilar = centerOf("Basilar artery") || new THREE.Vector3(0, -span * 0.08, -span * 0.02);
    L.aca = centerOf("Anterior cerebral artery", "left") || L.acom.clone();
    L.sss = centerOf("Superior sagittal sinus") || new THREE.Vector3(0, span * 0.28, 0);
    L.straight = centerOf("Straight sinus") || new THREE.Vector3(0, span * 0.05, -span * 0.08);
    L.trans = centerOf("Transverse sinus", "left") || new THREE.Vector3(-rightSign * span * 0.2, span * 0.02, -span * 0.12);
    L.tent = centerOf("Tentorium cerebelli") || new THREE.Vector3(0, -span * 0.02, -span * 0.04);
    L.iii = centerOf("Oculomotor nerve (III)", "left") || L.tent.clone();
    L.temporal = centerOf("Temporal pole", "left") || new THREE.Vector3(-rightSign * span * 0.16, -span * 0.04, span * 0.1);
    L.hippo = centerOf("Hippocampus", "left") || L.temporal.clone();
    L.putamen = centerOf("Putamen", "right") || new THREE.Vector3(rightSign * span * 0.08, span * 0.02, span * 0.02);
    L.pre = centerOf("Precentral gyrus", "left") || new THREE.Vector3(-rightSign * span * 0.12, span * 0.12, span * 0.05);
    L.tonsil = centerOf("Tonsil of cerebellum") || new THREE.Vector3(0, -span * 0.16, -span * 0.08);
    L.mid = centerOf("Midbrain") || new THREE.Vector3(0, -span * 0.02, -span * 0.02);
    const up = new THREE.Vector3(0, 1, 0);
    const lateral = new THREE.Vector3(rightSign, 0, 0);
    const back = new THREE.Vector3(0, 0, -1);
    const outside = L.horn.clone()
      .addScaledVector(up, span * 0.42)
      .addScaledVector(lateral, span * 0.1)
      .addScaledVector(back, span * 0.05);
    const dir = L.horn.clone().sub(outside).normalize();
    const ray = new THREE.Raycaster(outside, dir, 0, span);
    const cortex = meshes.filter(function(m){ return m.userData.bx_cat === "cortex"; });
    const hits = ray.intersectObjects(cortex, false);
    if(hits.length){
      L.entry = hits[0].point.clone();
      const n = hits[0].face ? hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld) : dir.clone().negate();
      if(n.dot(dir) > 0) n.negate();
      L.entryN = n.normalize();
      L.entry.addScaledVector(L.entryN, span * 0.012);
    }else{
      L.entry = outside;
      L.entryN = dir.clone().negate().normalize();
    }
    buildSets();
    ready = true;
  }

  loadAtlas().then(fit).catch(function(){
    if(hud) hud.textContent = "The anatomical model did not load.";
  });

  function readout(text){ return text; }

  function direct(id, t, A){
    const s = span;
    const side = new THREE.Vector3(rightSign, 0.08, 0.15).normalize();
    if(id === "bolt"){
      const pass = phase(t, 2.2, 6);
      const tip = L.entry.clone().lerp(L.horn.clone().add(new THREE.Vector3(0, s * 0.04, 0)), 0.45);
      A.disc("burr", L.entry, L.entryN, s * 0.03, phase(t, 1, 2.5));
      A.tube("bolt", [L.entry, tip], s * 0.004, pass, 0xd5dde2);
      A.look(t < 5 ? L.entry : tip, s * (t < 4 ? 0.5 : 0.36), 0.9 * rightSign, 0.5, 30);
      return t < 6 ? "Parenchymal probe. It does not drain." : "Pressure in the tissue";
    }
    if(id === "crani"){
      const lift = phase(t, 2.5, 6.5);
      const swell = phase(t, 6, 9);
      A.swell(0.035 * swell);
      A.disc("flap", L.entry.clone().addScaledVector(L.entryN, s * 0.02 + lift * s * 0.12), L.entryN, s * 0.16, 0);
      if(lift > 0.2){
        const flap = props.get("flap");
        if(flap) flap.mesh.position.copy(L.entry).addScaledVector(L.entryN, s * 0.03 + lift * s * 0.18);
      }
      A.tintTest(function(m){
        return m.userData.bx_cat === "cortex" && m.userData.bx_side === "right";
      }, 0xd7a090, 0.08 * swell);
      A.look(L.entry, s * mix(1.1, 0.62, lift), 1.05 * rightSign, 0.35, 32);
      return lift < 0.5 ? "Bone flap" : "The hemisphere can swell outward";
    }
    if(id === "ct"){
      const k = phase(t, 0, 12);
      A.look(new THREE.Vector3(0, s * 0.02, 0), s * 1.25, mix(0.2, 1.3, k) * rightSign, 0.7, 32);
      const cres = L.entry.clone().addScaledVector(new THREE.Vector3(rightSign, 0, 0), s * 0.02);
      A.sphere("sdh", cres, s * 0.07, 0x6e2424, 0.9);
      A.mark("sdh", "sdh");
      const mid = new THREE.Vector3(rightSign * s * 0.03 * phase(t, 2, 6), s * 0.04, s * 0.06);
      A.sphere("shift", mid, s * 0.02, 0xe2b48a, 0.95);
      A.mark("shift", "shift");
      A.sphere("cistern", L.basilar, s * (0.05 - 0.02 * phase(t, 4, 8)), 0x1a242c, 0.85);
      A.mark("cistern", "cistern");
      A.tint(["Temporal pole"], 0x8a3030, 0.2);
      A.sphere("contusion", L.temporal, s * 0.03, 0xa33a32, 0.8);
      A.mark("contusion", "contusion");
      A.tint(["Lateral ventricle"], 0xd7e4ee, 0.15);
      A.sphere("ivh", L.horn, s * 0.025, 0xf2f6f8, 0.75);
      A.mark("ivh", "ivh");
      return "3D teaching view of the findings. Not a patient scan. Drag, or tap a finding.";
    }
    if(id === "coil"){
      const grow = phase(t, 0.4, 3.2);
      const pack = phase(t, 4, 8);
      A.veil(0.2);
      A.tint(["Anterior communicating artery", "Internal carotid artery", "Middle cerebral artery (M1-segment)"], 0xc45c4a, 0.2);
      A.sphere("bleb", L.acom, s * (0.012 + 0.02 * grow) * (1 - 0.35 * pack), 0x8a2428, 0.95);
      const loops = [];
      for(let i = 0; i < 6; i++){
        const a = i / 6 * Math.PI * 2;
        loops.push(L.acom.clone().add(new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.6, Math.sin(a)).multiplyScalar(s * 0.012)));
      }
      loops.push(L.acom.clone());
      A.tube("coil", loops, s * 0.0035, pack, 0xd9dde2);
      A.look(L.acom, s * 0.34, mix(0.4, 1.4, phase(t, 0, 8)), 0.35, 26);
      return pack < 0.2 ? "Branch point. Teaching bleb, not an atlas aneurysm mesh." : "Coils pack the sac";
    }
    if(id === "evt" || id === "mca" || id === "clock"){
      const clotIn = id === "clock" ? phase(t, 0.2, 2) : 1;
      const pull = id === "evt" ? phase(t, 3.2, 8) : id === "clock" ? phase(t, 6, 8.5) : 0;
      A.veil(0.22);
      A.tint(["Middle cerebral artery (M1-segment)"], 0xc45c4a, 0.28);
      const distal = L.mca.clone().add(new THREE.Vector3(-rightSign * s * 0.08, s * 0.02, 0));
      const clotPos = L.mca.clone().lerp(L.ica, pull);
      A.sphere("clot", clotPos, s * (0.018 * clotIn) * (1 - pull * 0.8), 0x4a1214, 1);
      if(pull > 0) A.tube("stent", [distal, L.ica], s * 0.006, pull, 0xd5dde4);
      const hurt = 1 - pull;
      A.tintTest(function(m){
        return m.userData.bx_cat === "cortex" && m.userData.bx_side === "left" && m.userData.mid && m.userData.mid.z > -s * 0.02 && m.userData.mid.y > 0 && m.userData.mid.x * -rightSign > 0;
      }, 0x8a6a62, 0.16 * hurt);
      A.tint(["Precentral gyrus"], 0xc47a6a, 0.2 * hurt);
      A.flow("flow", [L.ica, L.mca, distal], t, s * 0.01 * (pull > 0.8 ? 1 : 0.25), pull > 0.85 ? 0xe7f2f4 : 0x8a3030, pull > 0.85 ? 0.25 : 0.02);
      A.look(L.mca, s * 0.4, -0.4 * rightSign, 0.25, 28);
      if(id === "clock") return t < 3 ? "Last known well" : t < 6 ? "Thrombolysis window, if exclusions allow" : "A large-vessel occlusion can still be retrieved";
      return pull < 0.5 ? "Clot in the middle cerebral stem" : "Territory reperfused";
    }
    if(id === "spasm" || id === "dci" || id === "nimo"){
      const narrow = id === "nimo" ? 0 : phase(t, 1.2, 5);
      A.veil(0.18);
      A.tint(["Middle cerebral artery (M1-segment)", "Anterior cerebral artery", "Basilar artery", "Internal carotid artery"], id === "nimo" ? 0xd08a78 : 0x8a4038, id === "nimo" ? 0.15 : 0.05 + narrow * 0.15);
      const distal = L.mca.clone().add(new THREE.Vector3(-rightSign * s * 0.1, 0.02 * s, 0));
      A.flow("flow", [L.ica, L.mca, distal], t, s * (0.012 - narrow * 0.008), 0xf2c2b4, 0.28 - narrow * 0.22);
      A.sphere("pinch", L.mca, s * (0.01 + narrow * 0.012), 0xe2b48a, 0.35 + narrow * 0.4);
      if(id === "dci") A.tint(["Precentral gyrus"], 0xc47a6a, 0.22 * phase(t, 2, 6));
      A.look(L.mca, s * 0.38, mix(0.2, 1.1, phase(t, 0, 6)) * -rightSign, 0.3, 26);
      if(id === "nimo") return "Enteral nimodipine. The vessel is not ‘opened’ by the drug.";
      if(id === "dci") return "A clinical deficit. The picture of the artery is only part of it.";
      return narrow < 0.4 ? "Artery before the narrow window" : "Lumen narrows";
    }
    if(id === "sahRupture" || id === "sahBlood" || id === "sahIcp" || id === "ebi"){
      A.veil(id === "sahRupture" ? mix(0.35, 0.16, phase(t, 3, 6)) : 0.16);
      A.tint(["Anterior communicating artery", "Posterior communicating artery", "Basilar artery", "Internal carotid artery"], 0xc45c4a, 0.25);
      const burst = phase(t, 3.5, 5.5);
      if(id === "sahRupture") A.sphere("bleb", L.acom, s * (0.01 + 0.025 * phase(t, 0.3, 3.4)) * (1 - burst), 0x7a1c20, 1);
      if(id === "sahRupture" || id === "sahBlood"){
        A.sphere("pool", L.basilar.clone().add(new THREE.Vector3(0, -s * 0.02, s * 0.02)), s * 0.08 * (id === "sahBlood" ? 1 : burst), 0x6a1818, 0.55);
        A.tint(["Lateral ventricle"], 0xd7c8c4, 0.12 * (id === "sahBlood" ? 1 : burst));
      }
      if(id === "sahIcp"){
        A.tintTest(function(m){ return m.userData.bx_cat === "arteries"; }, 0x5a3030, 0.05);
        A.swell(0.04 * phase(t, 1, 3));
      }
      if(id === "ebi"){
        A.tintTest(function(m){ return m.userData.bx_cat === "cortex"; }, 0xc48a78, 0.08 + 0.08 * Math.sin(t * 3));
      }
      A.look(id === "ebi" ? new THREE.Vector3() : L.acom, s * (id === "ebi" ? 1.15 : 0.42), 0.6, id === "sahIcp" ? 0.2 : 0.4, 30);
      if(id === "sahIcp") return "Pressure spikes. Flow falters.";
      if(id === "ebi") return "The whole brain, not only the clot";
      if(id === "sahBlood") return "Blood in the basal cisterns";
      return burst < 0.2 ? "Teaching bleb at the communicating artery" : "Blood leaves the artery";
    }
    if(id === "hydro" || id === "shunt"){
      const big = id === "shunt" ? 1.35 : mix(1, 1.42, phase(t, 0.6, 5));
      A.veil(0.14);
      A.enlarge(["Lateral ventricle", "Third ventricle"], big);
      A.tint(["Lateral ventricle", "Third ventricle"], 0xcfe8f4, 0.4);
      if(id === "shunt"){
        const valve = L.entry.clone().addScaledVector(L.entryN, s * 0.04);
        const belly = L.entry.clone().add(new THREE.Vector3(0, -s * 0.55, s * 0.1));
        A.tube("shunt", [L.horn, L.entry, valve, belly], s * 0.005, phase(t, 3.5, 7.5), 0xe7dcc8);
        A.sphere("valve", valve, s * 0.02, 0xd5dde2, 1);
      }
      A.look(L.horn, s * 0.55, 0.4 * rightSign, 0.45, 30);
      return id === "shunt" ? "Ventricular catheter, valve, distal tube" : "Ventricles enlarge";
    }
    if(id === "hern"){
      const k = phase(t, 0.8, 5);
      A.nudge("Temporal pole", "left", new THREE.Vector3(rightSign * s * 0.06 * k, -s * 0.04 * k, -s * 0.02 * k));
      A.tint(["Oculomotor nerve (III)"], 0xe2b48a, 0.45);
      A.tint(["Temporal pole"], 0xd7a090, 0.12);
      A.look(L.iii, s * 0.4, -0.2 * rightSign, 0.15, 28);
      return k < 0.4 ? "Medial temporal lobe, tentorial edge" : "Third nerve compressed";
    }
    if(id === "tbiPrimary"){
      const coup = phase(t, 0.4, 3);
      const contra = phase(t, 3, 6);
      A.tintTest(function(m){
        return coup > 0 && m.userData.bx_cat === "cortex" && m.userData.mid && m.userData.mid.z > s * 0.12;
      }, 0xa84840, 0.25 * coup);
      A.tintTest(function(m){
        return contra > 0 && m.userData.bx_cat === "cortex" && m.userData.mid && m.userData.mid.z < -s * 0.08;
      }, 0xa84840, 0.22 * contra);
      A.look(new THREE.Vector3(), s * 1.2, mix(0.2, 2.4, phase(t, 0, 7)), 0.25, 34);
      return contra < 0.3 ? "Impact" : "Contrecoup";
    }
    if(id === "tbiSecond" || id === "edema" || id === "icp" || id === "cpp" || id === "osm"){
      let swell = phase(t, 0.5, 5);
      if(id === "osm") swell = 1 - phase(t, 1, 6);
      if(id === "cpp") swell = 0.4;
      A.swell(0.08 * swell);
      if(id === "cpp"){
        const dim = phase(t, 2, 6);
        A.tintTest(function(m){ return m.userData.bx_cat === "arteries"; }, 0x6a403c, dim * 0.2);
      }
      A.look(new THREE.Vector3(0, s * 0.02, 0), s * (1.15 - 0.08 * swell), 0.9, 0.28, 34);
      if(id === "cpp") return "CPP = MAP − ICP";
      if(id === "osm") return swell < 0.5 ? "Water shifts out of the tissue" : "A bridge, not a destination";
      if(id === "icp") return swell > 0.7 ? "Compliance spent" : "Volume still tolerated";
      return "Secondary injury";
    }
    if(id === "heparin"){
      const clear = phase(t, 3, 7);
      A.veil(0.3);
      A.tint(["Superior sagittal sinus", "Straight sinus", "Transverse sinus"], 0x6a3038, 0.15 + (1 - clear) * 0.25);
      A.sphere("thrombus", L.sss, s * 0.04 * (1 - 0.7 * clear), 0x4a1418, 0.95);
      A.sphere("stain", L.pre, s * 0.03, 0x7a3030, 0.45);
      A.look(L.sss, s * 0.7, 0.4, 0.9, 30);
      return clear < 0.3 ? "Sinus occluded" : "Anticoagulation. A modest venous stain can remain.";
    }
    if(id === "benzo"){
      const calm = phase(t, 2.5, 6);
      const storm = (1 - calm) * (0.5 + 0.5 * Math.sin(t * 18));
      A.tint(["Hippocampus", "Precentral gyrus"], 0xe2b48a, 0.15 + storm * 0.7);
      A.look(L.hippo, s * mix(0.9, 0.45, phase(t, 0, 3)), -0.8 * rightSign, 0.2, 30);
      return calm < 0.4 ? "Seizure" : "The storm breaks";
    }
    if(id === "reverse"){
      const stop = phase(t, 2, 6);
      A.veil(0.25);
      A.tint(["Putamen"], 0x8a2424, 0.35);
      A.sphere("bleed", L.putamen, s * (0.02 + 0.04 * (1 - stop)), 0x6e1818, 0.92);
      A.look(L.putamen, s * 0.4, 0.8 * rightSign, 0.3, 28);
      return stop < 0.4 ? "Bleeding" : "Reversed, pressure eased";
    }
    if(id === "ett"){
      A.hideBrain();
      A.show("airway");
      const adv = phase(t, 1.6, 6.2);
      const tubeY = mix(s * 0.2, -s * 0.02, adv);
      sets.airway.ett.position.set(0, tubeY, 0);
      sets.airway.cuff.position.set(0, tubeY - s * 0.1, 0);
      const gap = mix(s * 0.02, s * 0.038, adv);
      sets.airway.folds[0].position.x = -gap;
      sets.airway.folds[1].position.x = gap;
      A.look(new THREE.Vector3(0, 0.01 * s, 0), s * 0.16, 0.25, 1.15, 46);
      return t < 6.5 ? "Cords" : "Carbon dioxide confirms the trachea";
    }
    if(id === "art"){
      A.hideBrain();
      A.show("wrist");
      const adv = phase(t, 2.5, 6);
      sets.wrist.artery.scale.set(1 + 0.08 * Math.sin(t * 6), 1, 1 + 0.08 * Math.sin(t * 6));
      sets.wrist.cath.position.set(mix(s * 0.16, 0.02 * s, adv), s * 0.05, s * 0.04);
      A.look(new THREE.Vector3(0, s * 0.02, 0), s * 0.28, 0.6, 0.7, 34);
      return "Radial artery";
    }
    if(id === "cvc"){
      A.hideBrain();
      A.show("neck");
      const press = phase(t, 0.4, 2.2);
      const adv = phase(t, 2.4, 6.5);
      sets.neck.vein.scale.y = mix(1, 0.25, press * (1 - adv));
      sets.neck.needle.position.set(-s * 0.05, mix(s * 0.1, -s * 0.01, adv), 0);
      sets.neck.needle.rotation.x = 0.4;
      sets.neck.wire.visible = t > 6;
      sets.neck.wire.position.set(-s * 0.05, -s * 0.01, mix(0, -s * 0.05, phase(t, 6, 8)));
      sets.neck.carotid.scale.setScalar(1 + 0.06 * Math.sin(t * 7));
      A.look(new THREE.Vector3(-s * 0.02, 0, 0), s * 0.32, 0.5, 1.0, 34);
      return t < 2 ? "Vein compresses. Artery pulses." : t < 6 ? "Needle in the vein" : "Wire";
    }
    if(id === "lp"){
      A.hideBrain();
      A.show("spine");
      const adv = phase(t, 2.5, 6.5);
      sets.spine.needle.position.set(0, mix(s * 0.12, -s * 0.01, adv), 0);
      A.look(new THREE.Vector3(0, 0, 0), s * 0.32, 1.15, 0.25, 34);
      return t < 7 ? "Between the lumbar spines" : "Not if the brain is tight";
    }
    A.look(new THREE.Vector3(), s * 1.25, t * 0.15, 0.3, 34);
    return "";
  }

  function frame(t, spot){
    size();
    if(!ready){
      if(hud) hud.textContent = "Loading the anatomical model";
      renderer.render(scene, camera);
      return;
    }
    restore();
    used.clear();
    const line = direct(showId, t, api(t));
    if(spot){
      ["sdh", "shift", "cistern", "contusion", "ivh"].forEach(function(name){
        const p = props.get(name);
        if(!p) return;
        const on = p.mesh.userData.spot === spot;
        p.mesh.scale.multiplyScalar(on ? 1.25 : 1);
      });
    }
    hideProps();
    controls.update();
    renderer.render(scene, camera);
    if(hud) hud.textContent = line || "";
  }

  function pick(event){
    if(!ready) return "";
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    const hits = ray.intersectObjects(fx.children, true);
    for(let i = 0; i < hits.length; i++){
      let o = hits[i].object;
      while(o){
        if(o.userData && o.userData.spot) return o.userData.spot;
        o = o.parent;
      }
    }
    return "";
  }

  return {
    setShow: function(id){
      showId = id;
      userLooking = false;
      props.forEach(function(p){ p.mesh.visible = false; });
    },
    frame: frame,
    recenter: function(){ userLooking = false; },
    pick: pick,
    dispose: function(){
      controls.dispose();
      renderer.dispose();
      pmrem.dispose();
      renderer.forceContextLoss();
    }
  };
}
