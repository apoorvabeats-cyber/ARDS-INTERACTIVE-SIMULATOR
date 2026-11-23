/* Helpers shared by the labs: a draggable clot with its pulsing ring, spring-back and retrieval flight, and a tube/flow builder. */
import { THREE, smooth } from "../stage.js?v=20261123j";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function clotKit(S, grp, ui, cfg) {
  cfg = cfg || {}; const k = { removed: false, grab: false, home: new THREE.Vector3(), tray: null, thr: cfg.thr || 0.45, onRemoved: cfg.onRemoved };
  const cg = new THREE.IcosahedronGeometry(cfg.size || 0.075, 2), cp = cg.attributes.position, q = new THREE.Vector3();
  for (let i = 0; i < cp.count; i++) { q.fromBufferAttribute(cp, i); const f = 1 + 0.25 * Math.sin(q.x * 90) * Math.cos(q.y * 70 + q.z * 40); cp.setXYZ(i, q.x * f * 1.5, q.y * f * 0.9, q.z * f * 0.9); } cg.computeVertexNormals();
  k.mesh = new THREE.Mesh(cg, new THREE.MeshPhongMaterial({ color: cfg.color || 0x7a0f1e, emissive: 0x3a0610, shininess: 80, transparent: true }));
  k.mesh.userData.drag = true; k.mesh.userData.clot = true; k.mesh.renderOrder = 4; grp.add(k.mesh); S.pick.push(k.mesh);
  k.ring = new THREE.Mesh(new THREE.TorusGeometry(cfg.ring || 0.13, 0.008, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 })); k.ring.renderOrder = 6; grp.add(k.ring);
  k.place = (curve, u) => { const p = curve.getPointAt(u), tg = curve.getTangentAt(u).normalize(); k.home.copy(p); k.mesh.position.copy(p); k.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tg); k.ring.position.copy(p); k.ring.lookAt(p.clone().add(tg)); k.mesh.visible = true; k.ring.visible = true; k.mesh.scale.setScalar(1); k.mesh.material.opacity = 1; k.removed = false; k.grab = false; k.tray = null; };
  k.placeAt = (p) => { k.home.copy(p); k.mesh.position.copy(p); k.ring.position.copy(p); k.mesh.visible = true; k.ring.visible = true; k.mesh.scale.setScalar(1); k.mesh.material.opacity = 1; k.removed = false; k.grab = false; k.tray = null; };
  k.grabbed = (o) => { if (o === k.mesh && !k.removed) { k.grab = true; k.mesh.scale.setScalar(1.15); return true; } return false; };
  k.drag = (w) => { if (!k.grab) return false; const p = grp.worldToLocal(w.clone()); k.mesh.position.copy(p); const d = p.distanceTo(k.home); ui.hint(d > k.thr ? "Release to retrieve the clot" : "Pull the clot away from the vessel…", d > k.thr); return true; };
  k.drop = () => { if (!k.grab) return false; k.grab = false; k.mesh.scale.setScalar(1); const d = k.mesh.position.distanceTo(k.home);
    if (d > k.thr) { k.removed = true; const away = k.mesh.position.clone().sub(k.home).normalize().multiplyScalar(0.55).add(k.mesh.position); k.tray = { t: 0, from: k.mesh.position.clone(), to: away }; ui.hint("", false); if (k.onRemoved) k.onRemoved(); } else ui.hint("Drag the clot further out of the vessel to retrieve it.", false); return true; };
  k.frame = (dt, shrink) => {
    k.ring.visible = !k.removed && k.mesh.visible; k.ring.scale.setScalar(1 + 0.12 * Math.sin(S.time() * 5)); k.ring.material.opacity = 0.55 + 0.4 * Math.sin(S.time() * 5);
    if (k.removed && k.tray) { k.tray.t += dt; k.mesh.position.lerpVectors(k.tray.from, k.tray.to, smooth(clamp(k.tray.t / 1.1, 0, 1))); if (k.tray.t > 2.2) k.mesh.material.opacity = Math.max(0, 1 - (k.tray.t - 2.2)); }
    else if (!k.grab) { k.mesh.position.lerp(k.home, Math.min(1, dt * 10)); if (shrink != null) k.mesh.scale.setScalar(shrink); }
  };
  return k;
}

/* tubes with flow particles; defs: [name, points, radius] */
export function vessels(S, grp, defs, hex, o) {
  o = o || {}; const T = {}, F = {};
  defs.forEach(([n, pts, r]) => { const m = S.tube(pts, r, hex, { emis: 0x330008, seg: 40 }); m.userData.name = n; m.renderOrder = 1; T[n] = m; grp.add(m); const len = m.userData.curve.getLength(); F[n] = S.flow(m.userData.curve, Math.round(len * (o.dens || 16)) + 4, o.flow || 0xff6a76, { speed: 0.22 / Math.max(0.35, len), off: o.off || 0 }); });
  return { T, F };
}
export function halo(S, grp, mesh, key, extra) { const h = new THREE.Mesh(new THREE.TubeGeometry(mesh.userData.curve, 24, Math.max(0.07, mesh.userData.r * 2.6), 6, false), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); h.userData.site = key; Object.assign(h.userData, extra || {}); grp.add(h); S.pick.push(h); return h; }
export function ellipsoid(rx, ry, rz, pos) { const g = new THREE.SphereGeometry(1, 40, 30); g.scale(rx, ry, rz); if (pos) g.translate(...pos); return g; }
export { clamp };
