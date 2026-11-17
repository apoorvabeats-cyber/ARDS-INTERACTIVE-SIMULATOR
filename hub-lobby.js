import * as THREE from "three";

const gate = document.getElementById("icu-gate");
const canvas = document.getElementById("lobby");
if (!gate || !canvas || !document.body.classList.contains("icu-gate")) {
  /* opened straight into the hub */
} else {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0xe7e1d6);
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe4ddd2, 14, 28);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.08, 40);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xc8beb0, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.6);
  sun.position.set(3, 8, 2);
  scene.add(sun);
  const cool = new THREE.DirectionalLight(0xd5ebe8, 0.45);
  cool.position.set(-4, 3, -2);
  scene.add(cool);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe7e0d4, roughness: 0.86 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.72 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.9 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc9bfb0, roughness: 0.6, metalness: 0.08 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xd5e6e4, transparent: true, opacity: 0.34, roughness: 0.08, metalness: 0.04, side: THREE.DoubleSide
  });
  const cloth = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.72 });
  const scrubs = new THREE.MeshStandardMaterial({ color: 0x1e4a52, roughness: 0.62 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc4a484, roughness: 0.58 });

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  box(10, 0.12, 10, floorMat, 0, 0, 0);
  box(10, 0.1, 10, ceilMat, 0, 3.15, 0);
  box(0.16, 3.1, 3.3, wallMat, 5, 1.55, -3.2);
  box(0.16, 3.1, 3.3, wallMat, 5, 1.55, 3.2);
  box(3.3, 3.1, 0.16, wallMat, -3.2, 1.55, -5);
  box(3.3, 3.1, 0.16, wallMat, 3.2, 1.55, -5);
  box(3.9, 3.1, 0.16, wallMat, -3.05, 1.55, 5);
  box(3.9, 3.1, 0.16, wallMat, 3.05, 1.55, 5);
  box(2.2, 0.62, 0.16, wallMat, 0, 2.79, 5);
  box(0.16, 3.1, 3.9, wallMat, -5, 1.55, 3.05);
  box(0.16, 3.1, 3.9, wallMat, -5, 1.55, -3.05);
  box(0.16, 0.62, 2.2, wallMat, -5, 2.79, 0);
  [[-2.2, 2], [2.2, 2], [-2.2, -2], [2.2, -2]].forEach(([x, z]) => {
    const lamp = box(1.1, 0.06, 0.42, new THREE.MeshStandardMaterial({ color: 0xfff8ee, emissive: 0xfff1dc, emissiveIntensity: 0.7 }), x, 3.05, z);
    lamp.material.roughness = 0.4;
  });

  function sign(text) {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#14181c";
    g.fillRect(0, 0, 640, 128);
    g.fillStyle = "#f3efe6";
    g.font = "600 46px Figtree, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 320, 66);
    const t = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  }

  function door(kind, text) {
    const g = new THREE.Group();
    const frame = new THREE.Group();
    const jamb = new THREE.MeshStandardMaterial({ color: 0xc9bfb0, roughness: 0.55, metalness: 0.06 });
    [[-1.02, 1.2, 0.12, 2.4, 0.08], [1.02, 1.2, 0.12, 2.4, 0.08], [0, 2.42, 2.16, 0.14, 0.08]].forEach(([x, y, w, h, d]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), jamb);
      p.position.set(x, y, 0);
      frame.add(p);
    });
    g.add(frame);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.28, 0.04), glassMat);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.28, 0.04), glassMat);
    left.position.set(-0.48, 1.26, 0.06);
    right.position.set(0.48, 1.26, 0.06);
    g.add(left, right);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.38, 0.04), sign(text));
    plate.position.set(0, 2.62, 0.08);
    g.add(plate);
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.7, 0.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.y = 1.3;
    hit.userData.kind = kind;
    g.add(hit);
    g.userData.kind = kind;
    g.userData.left = left;
    g.userData.right = right;
    g.userData.open = 0;
    scene.add(g);
    return g;
  }

  const front = door("icu", "ENTER THE ICU");
  front.position.set(0, 0, 4.82);
  const leftDoor = door("path", "PATHOPHYSIOLOGY");
  leftDoor.position.set(-4.82, 0, 0);
  leftDoor.rotation.y = Math.PI / 2;

  const backSign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 0.04), sign("CRITICAL CARE HUB"));
  backSign.position.set(0, 2.15, -4.88);
  scene.add(backSign);

  const person = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.48, 4, 12), cloth);
  torso.position.y = 1.18;
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 10), scrubs);
  legs.position.y = 0.48;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), skin);
  head.position.y = 1.68;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), scrubs);
  cap.position.y = 1.7;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.38, 3, 8), cloth);
  const armR = armL.clone();
  armL.position.set(-0.34, 1.12, 0);
  armR.position.set(0.34, 1.12, 0);
  person.add(torso, legs, head, cap, armL, armR);
  person.position.set(0, 0, 0);
  scene.add(person);

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let yaw = 0.42;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let mode = "look";
  let job = null;
  let raf = 0;
  const fade = document.getElementById("lobby-fade");

  function fit() {
    const w = gate.clientWidth || window.innerWidth;
    const h = gate.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(fit).observe(gate);
  fit();

  function placeCamera() {
    const dist = 2.85;
    camera.position.set(Math.sin(yaw) * dist, 1.62, -Math.cos(yaw) * dist);
    camera.lookAt(Math.sin(yaw) * 0.15, 1.22, Math.cos(yaw) * 0.4);
  }

  function finish(kind) {
    if (mode === "done") return;
    mode = "done";
    cancelAnimationFrame(raf);
    if (kind === "icu") {
      const btn = document.getElementById("icu-enter");
      if (btn) btn.click();
    } else {
      location.href = "pathology-live.html?v=20261117a";
    }
    try { renderer.dispose(); } catch (err) { /* the next room is already open */ }
  }

  function choose(kind) {
    if (mode !== "look") return;
    mode = "go";
    setTimeout(() => finish(kind), calm ? 40 : 2200);
    canvas.dataset.choice = kind;
    const door = kind === "icu" ? front : leftDoor;
    const face = kind === "icu" ? 0 : Math.PI / 2;
    const dest = kind === "icu" ? new THREE.Vector3(0, 0, 6.1) : new THREE.Vector3(-6.1, 0, 0);
    job = { kind, door, face, dest, t: 0 };
    if (calm) finish(kind);
  }

  canvas.addEventListener("pointerdown", (ev) => {
    dragging = true;
    moved = 0;
    lastX = ev.clientX;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!dragging || mode !== "look") return;
    const dx = ev.clientX - lastX;
    moved += Math.abs(dx);
    lastX = ev.clientX;
    yaw -= dx * 0.008;
  });
  canvas.addEventListener("pointerup", (ev) => {
    dragging = false;
    if (moved > 12 || mode !== "look") return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects(scene.children, true);
    const hit = hits.find((h) => {
      let o = h.object;
      while (o) {
        if (o.userData && o.userData.kind) return true;
        o = o.parent;
      }
      return false;
    });
    if (hit) {
      let o = hit.object;
      while (o && !(o.userData && o.userData.kind)) o = o.parent;
      choose(o.userData.kind);
    }
  });

  const clock = new THREE.Clock();
  function frame() {
    if (mode === "done") return;
    step();
    raf = requestAnimationFrame(frame);
  }
  function step() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!calm && mode === "look") {
      const b = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.012;
      torso.scale.y = b;
    }
    if (job) {
      job.t += dt;
      const turn = Math.min(1, job.t / 0.45);
      person.rotation.y += (job.face - person.rotation.y) * (calm ? 1 : 0.12);
      if (turn > 0.7) job.door.userData.open = Math.min(1, job.door.userData.open + dt * 1.4);
      const o = job.door.userData.open;
      job.door.userData.left.position.x = -0.48 - o * 0.85;
      job.door.userData.right.position.x = 0.48 + o * 0.85;
      if (o > 0.55) {
        person.position.lerp(job.dest, calm ? 1 : 0.1);
      }
      const along = job.kind === "icu" ? person.position.z : -person.position.x;
      if (fade) fade.style.opacity = String(Math.max(0, (along - 3.2) / 2.2));
      if (along > 4.4 || job.t > 2.6) {
        finish(job.kind);
        return;
      }
      const behind = person.position.clone();
      if (job.kind === "icu") behind.z -= 2.4;
      else behind.x += 2.4;
      camera.position.lerp(new THREE.Vector3(behind.x, 1.6, behind.z), 0.08);
      camera.lookAt(person.position.x, 1.25, person.position.z);
    } else {
      placeCamera();
    }
    renderer.render(scene, camera);
  }
  placeCamera();
  frame();
}
