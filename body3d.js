import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildAtlasOrgans } from './anatomy/atlas-organs.js';
import { buildScanStructure, buildScanPlatform } from './anatomy/scan-structure.js?v=20261016f';
import { buildBody, createUniforms } from './anatomy/body-model.js';

const canvas = document.getElementById('view');
const load = document.getElementById('load');
const nameplate = document.getElementById('pickname');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const autoButton = document.querySelector('[data-view="auto"]');
const names = { brain: 'Brain', thyroid: 'Thyroid', lungs: 'Lungs', heart: 'Heart', liver: 'Liver',
  stomach: 'Stomach', spleen: 'Spleen', bowel: 'Intestines', kidneys: 'Kidneys', multi: 'Whole patient' };

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.09;
  controls.enablePan = false; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.6;
  controls.minDistance = 1.1; controls.maxDistance = 6;
  controls.minPolarAngle = Math.PI * 0.3; controls.maxPolarAngle = Math.PI * 0.7;
  scene.add(new THREE.HemisphereLight(0xc5e6f1, 0x242431, 1.35));
  for (const [color, intensity, position] of [[0xffe6d8, 2.3, [-1, 3, 3]], [0x8ecde6, 1.0, [2, 1, 1]], [0xa5e9ff, 3.2, [0, 2, -2]]]) {
    const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
  }
  const atlas = buildAtlasOrgans(THREE); scene.add(atlas.group);
  const structure = buildScanStructure(THREE); scene.add(structure.group);
  scene.add(buildScanPlatform(THREE));
  let needsRender = true;
  controls.addEventListener('change', () => { needsRender = true; });
  // Warm shaded skin preserves the human face and limbs around a transparent torso.
  const skinMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, side: THREE.FrontSide,
    uniforms: { opacity: { value: 1 }, surface: { value: null }, surfaceReady: { value: 0 } },
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 n; varying vec3 viewDir; varying vec3 worldPoint; varying vec3 worldNormal;
      void main(){
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 mv=modelViewMatrix*vec4(transformed,1.0);
        n=normalize(normalMatrix*objectNormal); viewDir=-mv.xyz; worldPoint=(modelMatrix*vec4(transformed,1.0)).xyz; worldNormal=normalize(mat3(modelMatrix)*objectNormal); gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `varying vec3 n; varying vec3 viewDir; varying vec3 worldPoint; varying vec3 worldNormal; uniform float opacity; uniform sampler2D surface; uniform float surfaceReady;
      void main(){
        vec3 normal=normalize(n), view=normalize(viewDir);
        float rim=pow(1.0-abs(dot(normal,view)),3.0);
        float key=max(0.0,dot(normal,normalize(vec3(-0.65,0.8,1.0))));
        float fill=max(0.0,dot(normal,normalize(vec3(0.8,0.2,0.5))));
        float light=0.28+key*0.72+fill*0.15;
        float torso=(1.0-smoothstep(0.135,0.17,abs(worldPoint.x)))
          *smoothstep(0.88,0.94,worldPoint.y)*(1.0-smoothstep(1.36,1.43,worldPoint.y));
        float grain=fract(sin(dot(worldPoint,vec3(1271.1,3117.7,748.2)))*43758.5453);
        vec3 skin=vec3(0.55,0.31,0.22)*light*(0.98+grain*0.04);
        skin+=vec3(0.36,0.60,0.68)*rim*0.24;
        vec2 uv=vec2(0.5046+worldPoint.x*1.274,0.007+worldPoint.y*0.583);
        vec3 detail=texture2D(surface,clamp(uv,0.0,1.0)).rgb;
        float front=pow(max(0.0,worldNormal.z),0.5)*surfaceReady;
        float hasDetail=smoothstep(0.025,0.10,dot(detail,vec3(0.333)));
        // Preserve the human face; the reference's skull overlay belongs inside the scan.
        float belowFace=1.0-smoothstep(1.46,1.50,worldPoint.y);
        skin=mix(skin,detail*1.25,front*0.38*hasDetail*belowFace);
        // Color the existing facial geometry rather than drawing a skull over it.
        vec2 eye=vec2(abs(worldPoint.x)-0.025,worldPoint.y-1.566);
        float eyeFront=smoothstep(0.131,0.140,worldPoint.z);
        float sclera=(1.0-smoothstep(0.78,1.0,length(eye/vec2(0.010,0.004))))*eyeFront;
        float iris=(1.0-smoothstep(0.0026,0.0035,length(eye)))*sclera;
        float pupil=(1.0-smoothstep(0.0011,0.0017,length(eye)))*sclera;
        skin=mix(skin,vec3(0.66,0.62,0.55)*light,sclera);
        skin=mix(skin,vec3(0.055,0.034,0.022),iris);
        skin=mix(skin,vec3(0.006),pupil);
        vec2 brow=vec2((abs(worldPoint.x)-0.025)/0.016,(worldPoint.y-1.582)/0.0028);
        float eyebrow=(1.0-smoothstep(0.7,1.0,length(brow)))*smoothstep(0.13,0.145,worldPoint.z);
        skin=mix(skin,vec3(0.13,0.075,0.045)*light,eyebrow*0.65);
        float cranialWindow=smoothstep(1.585,1.62,worldPoint.y);
        float alpha=mix(1.0,0.09,torso);
        alpha=mix(alpha,0.20,cranialWindow);
        gl_FragColor=vec4(skin,alpha*opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  new THREE.TextureLoader().load('assets/anatomy-surface.webp', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    skinMaterial.uniforms.surface.value = texture;
    atlas.setSurface(texture);
    skinMaterial.uniforms.surfaceReady.value = 1; needsRender = true;
  });
  // A complete procedural shell remains available if the bundled GLB fails to load.
  const fallback = buildBody(THREE, createUniforms(THREE, true), { reduce: true });
  const shell = fallback.skinGroup; shell.scale.setScalar(1.68 / 1.915);
  shell.traverse((o) => { if (o.isMesh) { o.material = skinMaterial; o.renderOrder = 2; } });
  scene.add(shell);
  // Dispose of the unused procedural organs/layers; only its skin is needed here.
  const unusedMaterials = new Set(), unusedGeometries = new Set();
  for (const layer of [fallback.organsG, fallback.boneG, fallback.vesselG]) {
    layer.traverse((o) => { if (o.geometry) unusedGeometries.add(o.geometry); if (o.material) unusedMaterials.add(o.material); });
  }
  unusedGeometries.forEach((g) => g.dispose());
  unusedMaterials.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
  fallback.skinMat.dispose();
  new GLTFLoader().load('models/body.glb', ({ scene: model }) => {
    // The bundled body's bind geometry already shares the organ landmarks and metre scale.
    model.updateMatrixWorld(true);
    // Relax the arms into the neutral standing pose in the reference.
    for (const [suffix, side] of [['l', 1], ['r', -1]]) {
      const upper = model.getObjectByName('upperarm_' + suffix);
      const lower = model.getObjectByName('lowerarm_' + suffix);
      const hand = model.getObjectByName('hand_' + suffix);
      if (!upper || !lower || !hand) continue;
      const rotateWorld = (bone, delta) => {
        const world = bone.getWorldQuaternion(new THREE.Quaternion());
        const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        bone.quaternion.copy(parent.invert().multiply(delta.multiply(world)));
        model.updateMatrixWorld(true);
      };
      rotateWorld(upper, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -side * 0.55));
      const direction = hand.getWorldPosition(new THREE.Vector3()).sub(lower.getWorldPosition(new THREE.Vector3())).normalize();
      rotateWorld(lower, new THREE.Quaternion().setFromUnitVectors(direction, new THREE.Vector3(side * 0.025, -0.25, 0.015).normalize()));
    }
    // Bring the feet into the narrower anatomical stance in the reference.
    for (const [suffix, side] of [['l', 1], ['r', -1]]) {
      const thigh = model.getObjectByName('thigh_' + suffix);
      if (!thigh) continue;
      const world = thigh.getWorldQuaternion(new THREE.Quaternion());
      const parent = thigh.parent.getWorldQuaternion(new THREE.Quaternion());
      const delta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -side * 0.075);
      thigh.quaternion.copy(parent.invert().multiply(delta.multiply(world)));
      model.updateMatrixWorld(true);
    }
    const armPoints = {};
    for (const [suffix, side] of [['l', 1], ['r', -1]]) {
      const joints = ['upperarm_', 'lowerarm_', 'hand_'].map((prefix) => model.getObjectByName(prefix + suffix));
      if (joints.every(Boolean)) armPoints[side] = joints.map((joint) => joint.getWorldPosition(new THREE.Vector3()).toArray());
    }
    structure.setArms(armPoints);
    const legPoints = {};
    for (const [suffix, side] of [['l', 1], ['r', -1]]) {
      const joints = ['thigh_', 'calf_', 'foot_', 'ball_'].map((prefix) => model.getObjectByName(prefix + suffix));
      if (joints.every(Boolean)) legPoints[side] = joints.map((joint) => joint.getWorldPosition(new THREE.Vector3()).toArray());
    }
    structure.setLegs(legPoints);
    model.traverse((o) => {
      if (!o.isMesh) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      materials.forEach((m) => m.dispose()); o.material = skinMaterial; o.renderOrder = 2;
    });
    scene.remove(shell);
    const geometries = new Set(); shell.traverse((o) => { if (o.geometry) geometries.add(o.geometry); });
    geometries.forEach((g) => g.dispose());
    scene.add(model); needsRender = true;
  }, undefined, () => { structure.setArms(); structure.setLegs(); load.textContent = 'Simplified body view · select any organ to continue'; });

  let fullDistance = 3.5, selected = null, hovered = null, down = null, travel = null, entering = false;
  let contextLost = false, lastRender = 0;
  let lastTime = performance.now(), activePointers = new Set(), gestureMoved = false;
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function auto(on) {
    controls.autoRotate = !!on;
    autoButton.setAttribute('aria-pressed', String(controls.autoRotate));
    autoButton.textContent = controls.autoRotate ? 'Pause rotation' : 'Auto-rotate';
    document.getElementById('rotation-status').textContent = controls.autoRotate ? '360° rotation in progress' : '360° interactive anatomy';
  }
  function reset(back = false) {
    travel = null; selected = null; hovered = null; needsRender = true;
    controls.target.set(0, 0.84, 0);
    camera.position.set(0, 1.07, (back ? -1 : 1) * fullDistance);
    controls.update();
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Fit both the standing body and its outstretched hands on narrow screens.
    fullDistance = Math.max(0.94 / Math.tan(THREE.MathUtils.degToRad(16)), 0.55 / (Math.tan(THREE.MathUtils.degToRad(16)) * camera.aspect));
    controls.maxDistance = Math.max(6, fullDistance * 1.6);
    if (!entering) reset();
  }
  function mark(id) {
    if (hovered !== (id || null)) needsRender = true;
    hovered = id || null;
    nameplate.textContent = id ? `${names[id]} · select to explore` : 'Drag to rotate · scroll or pinch to zoom';
    canvas.style.cursor = id ? 'pointer' : 'grab';
    document.querySelectorAll('[data-organ]').forEach((button) => {
      button.classList.toggle('on', button.dataset.organ === id);
    });
  }
  function idAt(x, y) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(pointer, camera);
    // Only intersect actual organ meshes. The transparent skin cannot steal a tap.
    return ray.intersectObjects(atlas.pickMeshes, false)[0]?.object.userData.organ;
  }
  function choose(id) {
    if (entering || !window.enterOrgan) return;
    if (!atlas.organs[id]) { window.enterOrgan(id); return; }
    entering = true; selected = id; mark(id); auto(false);
    const p = atlas.organs[id].focus;
    const from = controls.target.clone(), offset = camera.position.clone().sub(from).normalize();
    const start = camera.position.clone(), end = p.clone().addScaledVector(offset, 0.7);
    travel = { from, start, end, target: p.clone(), at: performance.now() };
    setTimeout(() => {
      travel = null;
      window.enterOrgan(id);
    }, reduce ? 0 : 520);
  }
  window.hoverOrgan = mark;
  window.selectAtlasOrgan = choose;
  window.resetAtlas = () => { entering = false; reset(); mark(null); auto(!reduce); };
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.view;
    if (action === 'auto') auto(!controls.autoRotate);
    else if (action === 'front' || action === 'back') { auto(false); reset(action === 'back'); }
    else if (action === 'reset') { reset(); auto(!reduce); }
  }));
  controls.addEventListener('start', () => { auto(false); });
  canvas.addEventListener('pointerdown', (e) => {
    activePointers.add(e.pointerId);
    if (activePointers.size === 1) { down = { x: e.clientX, y: e.clientY }; gestureMoved = false; }
    else gestureMoved = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (activePointers.size) {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) gestureMoved = true;
    } else mark(idAt(e.clientX, e.clientY));
  });
  canvas.addEventListener('pointerup', (e) => {
    const tap = activePointers.size === 1 && !gestureMoved && down && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 8;
    activePointers.delete(e.pointerId);
    if (!activePointers.size) down = null;
    if (tap) { const id = idAt(e.clientX, e.clientY); if (id) choose(id); }
  });
  canvas.addEventListener('pointercancel', (e) => { activePointers.delete(e.pointerId); down = null; gestureMoved = true; });
  canvas.addEventListener('pointerleave', () => { if (!activePointers.size) mark(null); });
  canvas.addEventListener('keydown', (e) => {
    const keys = ['ArrowLeft', 'ArrowRight', '+', '=', '-', 'Home'];
    if (!keys.includes(e.key)) return;
    e.preventDefault(); auto(false);
    if (e.key === 'Home') { reset(); return; }
    const offset = camera.position.clone().sub(controls.target);
    if (e.key.startsWith('Arrow')) offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), e.key === 'ArrowLeft' ? -Math.PI / 8 : Math.PI / 8);
    else offset.setLength(THREE.MathUtils.clamp(offset.length() * (e.key === '-' ? 1.15 : 0.85), controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset); controls.update();
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); contextLost = true; load.textContent = '3D view interrupted. Reload, or use the organ buttons below.';
  });
  new ResizeObserver(resize).observe(canvas); resize(); auto(!reduce); mark(null);
  window.body3d = true; document.body.classList.remove('flat'); document.body.classList.add('live3d');
  document.querySelectorAll('[data-view]').forEach((b) => { b.disabled = false; });
  load.textContent = '';
  // Clear a transform applied by the picture intro while the module was loading.
  document.getElementById('figure').style.transform = 'none';
  function frame(now) {
    requestAnimationFrame(frame);
    if (contextLost || document.hidden || document.body.classList.contains('in') || now - lastRender < 1000 / 24) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05); lastTime = now;
    lastRender = now;
    controls.enabled = !entering;
    if (travel && !reduce) {
      const t = Math.min(1, (now - travel.at) / 500), ease = t * t * (3 - 2 * t);
      controls.target.lerpVectors(travel.from, travel.target, ease);
      camera.position.lerpVectors(travel.start, travel.end, ease); needsRender = true;
    }
    controls.update(dt);
    Object.entries(atlas.organs).forEach(([id, o]) => {
      o.material.emissiveIntensity = id === (selected || hovered) ? 0.38 : 0.06;
    });
    if (needsRender) { renderer.render(scene, camera); needsRender = false; }
  }
  requestAnimationFrame(frame);
}
try { init(); } catch (error) {
  document.body.classList.add('flat');
  load.textContent = '3D is unavailable. Choose an organ below to open its modules.';
  document.querySelectorAll('[data-view]').forEach((b) => { b.disabled = true; });
  console.warn('Anatomy viewer unavailable:', error.message);
}
