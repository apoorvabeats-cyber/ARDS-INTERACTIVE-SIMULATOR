/* PATHODYNAMICS stage: one small three.js scene that every lab shares.
   Gives each lab: a rotatable/zoomable model root, tube helpers, blood-flow particles, tissue that can be painted vertex by vertex
   (normal / ischaemic penumbra / infarcted core / recovered) and a tap-or-drag picker, so each disease only has to say WHAT to draw. */
import * as THREE from "../three.module.js";
export { THREE };

export const C = (h) => new THREE.Color(h);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (k) => k * k * (3 - 2 * k);

export function createStage(host) {
  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.setClearColor(0x000000, 0);
  const cv = R.domElement; cv.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none"; host.appendChild(cv);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.05, 80), root = new THREE.Group(); scene.add(root);
  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x1a1030, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(2.5, 3.5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7aa8ff, 1.1); rim.position.set(-3, 1, -3.5); scene.add(rim);
  const fill = new THREE.PointLight(0x36d6ff, 1.2, 12); fill.position.set(-2.4, -1.5, 3); scene.add(fill);

  /* ---------- view: yaw, pitch, distance, target; smoothed ---------- */
  const V = { ry: 0, rx: 0.15, d: 4.6, tx: 0, ty: 0, tz: 0 }, T = { ry: 0, rx: 0.15, d: 4.6, tx: 0, ty: 0, tz: 0 }; let auto = false, w = 10, h = 10;
  function resize() { w = Math.max(40, host.clientWidth); h = Math.max(40, host.clientHeight); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(host); resize();
  const S = { THREE, scene, cam, root, R, cv, pick: [], flows: [], hooks: [], onTap: null, onDrag: null, onDrop: null, onGrab: null, busy: false };
  S.view = (o) => { Object.assign(T, o); };
  S.snap = (o) => { Object.assign(T, o); Object.assign(V, T); };
  S.auto = (on) => { auto = on == null ? !auto : on; return auto; };
  S.zoom = (f) => { T.d = clamp(T.d * f, 1.6, 9); };
  S.size = () => [w, h];

  /* ---------- pointer: tap a thing, drag a draggable thing, otherwise turn the model ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), pts = new Map(); let drag = null, mv = 0, pd = 0, last = null;
  const setPtr = (e) => { const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); };
  const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const hitAt = (e) => { setPtr(e); const hs = ray.intersectObjects(S.pick.filter((m) => m.parent && shown(m)), false); return hs.find((x) => x.object.userData.drag) || hs[0] || null; };
  S.hitAt = hitAt;
  cv.addEventListener("pointerdown", (e) => {
    cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); mv = 0; auto0 = auto;
    if (pts.size === 1) { const hit = hitAt(e); if (hit && hit.object.userData.drag && S.onGrab) { drag = { obj: hit.object, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(cam.getWorldDirection(new THREE.Vector3()), hit.point), off: hit.object.getWorldPosition(new THREE.Vector3()).sub(hit.point) }; S.onGrab(hit.object); } }
    if (pts.size === 2) { const a = [...pts.values()]; pd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); drag = null; }
  });
  let auto0 = false;
  cv.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; mv += Math.abs(dx) + Math.abs(dy); p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) { const a = [...pts.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pd) T.d = clamp(T.d * pd / d, 1.6, 9); pd = d; return; }
    if (drag) { setPtr(e); const q = new THREE.Vector3(); if (ray.ray.intersectPlane(drag.plane, q)) { q.add(drag.off); if (S.onDrag) S.onDrag(drag.obj, q); } return; }
    T.ry += dx * 0.009; T.rx = clamp(T.rx + dy * 0.008, -1.5, 1.5); V.ry = T.ry; V.rx = T.rx;
  });
  const up = (e) => {
    const had = pts.delete(e.pointerId); if (!had) return;
    if (drag) { const o = drag.obj; drag = null; if (S.onDrop) S.onDrop(o); return; }
    if (mv < 8 && S.onTap) { const hit = hitAt(e); S.onTap(hit ? hit.object : null, hit); }
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", (e) => { e.preventDefault(); S.zoom(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });

  /* ---------- helpers ---------- */
  S.mat = (hex, o) => new THREE.MeshPhongMaterial(Object.assign({ color: hex, shininess: 60, specular: 0x334455 }, o || {}));
  S.tube = (points, r, hex, o) => {
    o = o || {}; const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, "centripetal", 0.5);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, o.seg || Math.max(12, points.length * 8), r, o.rad || 10, false), S.mat(hex, { transparent: !!o.op, opacity: o.op || 1, emissive: o.emis || 0x000000 }));
    m.userData.curve = curve; m.userData.r = r; return m;
  };
  S.add = (o, pickable) => { root.add(o); if (pickable) S.pick.push(o); return o; };
  S.clear = () => { while (root.children.length) { const c = root.children[0]; root.remove(c); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } }); } S.pick.length = 0; S.flows.length = 0; flowPts = null; };

  /* blood-flow particles: every flow rides a curve; rate 0..1 sets speed and how many are shown */
  let flowPts = null;
  S.flow = (curve, n, hex, o) => { o = o || {}; const f = { pts: curve.getSpacedPoints(48), n, u: new Float32Array(n).map(() => Math.random()), rate: 1, hex: C(hex), off: o.off || 0, speed: o.speed || 0.22, rev: !!o.rev, from: o.from || 0, to: o.to == null ? 1 : o.to }; S.flows.push(f); flowPts = null; return f; };
  function buildFlowPts() {
    const total = S.flows.reduce((a, f) => a + f.n, 0); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3)); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true })); p.frustumCulled = false; p.renderOrder = 5; root.add(p); flowPts = p;
    let k = 0; S.flows.forEach((f) => { for (let i = 0; i < f.n; i++) { g.attributes.color.setXYZ(k + i, f.hex.r, f.hex.g, f.hex.b); } f.k = k; k += f.n; });
  }
  function stepFlows(dt) {
    if (!S.flows.length) return; if (!flowPts) buildFlowPts(); const pa = flowPts.geometry.attributes.position, L = 48;
    S.flows.forEach((f) => { const r = f.rate; for (let i = 0; i < f.n; i++) {
      let u = f.u[i]; u += dt * f.speed * Math.max(r, 0.0) * (f.rev ? -1 : 1); if (u > 1) u -= 1; if (u < 0) u += 1; f.u[i] = u;
      const show = (i / f.n) < r, uu = f.from + (f.to - f.from) * u, fi = uu * L, i0 = Math.min(L - 1, Math.floor(fi)), t = fi - i0, a = f.pts[i0], b = f.pts[i0 + 1];
      if (!show) pa.setXYZ(f.k + i, 0, -50, 0); else pa.setXYZ(f.k + i, a.x + (b.x - a.x) * t + f.off, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); } });
    pa.needsUpdate = true;
  }

  /* tissue: a mesh whose vertices carry a tag (which territory) and a rank (how early it is lost). paint() recolours it from a function. */
  S.tissue = (geom, baseHex, classify, matOpts) => {
    const pos = geom.attributes.position, n = pos.count, tags = new Array(n), rank = new Float32Array(n), h = new Float32Array(n), shade = new Float32Array(n), col = new Float32Array(n * 3), P = new THREE.Vector3();
    for (let i = 0; i < n; i++) { P.fromBufferAttribute(pos, i); const c = classify(P, i); tags[i] = c.tag; rank[i] = c.rank == null ? 0.5 : c.rank; h[i] = c.h == null ? 0.5 : c.h; shade[i] = c.sh == null ? 1 : c.sh; }
    geom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geom, new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, shininess: 35, specular: 0x222a33 }, matOpts || {})));
    const base = C(baseHex), tmp = C(0xffffff);
    const tis = { mesh: m, tags, rank, h, base, geom, dirty: true,
      paint(fn) { for (let i = 0; i < n; i++) { tmp.copy(base); fn(tags[i], rank[i], h[i], tmp, i); tmp.multiplyScalar(shade[i]); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b; } geom.attributes.color.needsUpdate = true; } };
    tis.paint(() => {}); return tis;
  };

  /* labels that stay with the model (sprites) */
  S.label = (text, pos, hex) => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d"); g.font = "700 28px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(4,16,32,.78)"; g.fillRect(0, 8, 256, 48); g.strokeStyle = hex || "#36d6ff"; g.lineWidth = 3; g.strokeRect(2, 8, 252, 48); g.fillStyle = "#eaf6ff"; g.fillText(text, 128, 33);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(0.62, 0.155, 1); s.position.set(pos[0], pos[1], pos[2]); s.renderOrder = 9; return s;
  };

  /* ---------- frame loop ---------- */
  let t0 = performance.now(), raf = 0, run = true, time = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame); if (!run) return; const dt = Math.min(0.1, (now - t0) / 1000); t0 = now; time += dt;
    if (auto && !drag && pts.size === 0) { T.ry += dt * 0.5; V.ry = T.ry; }
    const k = Math.min(1, dt * 6); for (const a of ["ry", "rx", "d", "tx", "ty", "tz"]) V[a] += (T[a] - V[a]) * k;
    root.rotation.set(V.rx, V.ry, 0);
    const wt = new THREE.Vector3(V.tx, V.ty, V.tz).applyEuler(root.rotation); root.position.set(-wt.x, -wt.y, -wt.z);   /* keep the chosen target at the centre of the view */ cam.position.set(0, 0, V.d); cam.lookAt(0, 0, 0);
    S.hooks.forEach((fn) => fn(dt, time)); stepFlows(dt); R.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  S.pause = (p) => { run = !p; }; S.time = () => time;
  S.dispose = () => { cancelAnimationFrame(raf); R.dispose(); cv.remove(); };
  return S;
}
