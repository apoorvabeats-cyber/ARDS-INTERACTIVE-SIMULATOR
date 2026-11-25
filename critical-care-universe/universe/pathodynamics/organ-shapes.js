/* Procedural anatomy for organs that have no scanned mesh in the app: bladder, stomach, spleen, kidney (bean) and an irregular clot.
   Each returns a BufferGeometry with smooth normals, built to look like the real organ rather than a ball. */
import { THREE } from "./stage.js?v=20261126r";

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const sphere = (w = 48, h = 36) => new THREE.SphereGeometry(1, w, h);
const finish = (g) => { g.computeVertexNormals(); return g; };

/* urinary bladder: rounded dome above, narrowing to a funnel-shaped neck below (the trigone), slightly flattened front to back */
export function bladderGeom(r = 0.3) {
  const g = sphere(48, 40), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const y = v.y, k = 0.34 + 0.66 * sm(-1, 0.25, y);            /* girth: wide dome, narrow neck */
    let x = v.x * r * k, z = v.z * r * k * 0.82, yy = y * r * 0.95;
    if (y < -0.55) yy -= (-0.55 - y) * r * 0.55;                  /* draw the neck out into the urethra */
    if (y > 0.55) yy -= (y - 0.55) * r * 0.25 * (1 - v.z * v.z); /* gently flatten the dome */
    p.setXYZ(i, x, yy, z);
  }
  return finish(g);
}

/* stomach: a J-shaped sac. Swept along a curve with a radius profile: fundus, body, antrum, pylorus. Local +x is the patient's left. */
export function stomachGeom(s = 1) {
  const pts = [[1.12, 0.98, 0], [1.42, 0.7, 0], [1.3, 0.28, 0], [0.7, 0.04, 0], [0.05, 0.1, 0], [-0.4, 0.34, 0], [-0.7, 0.5, 0]].map(([x, y, z]) => new THREE.Vector3(x * s, y * s, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  const TS = 80, RS = 30, base = 0.2, tg = new THREE.TubeGeometry(curve, TS, base, RS, false), p = tg.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  const prof = (t) => { let r = 0.3 + 0.05 * sm(0, 0.3, t) - 0.14 * sm(0.45, 0.75, t) - 0.09 * sm(0.8, 1, t); if (t < 0.1) r *= Math.sqrt(Math.max(0.0, 1 - ((0.1 - t) / 0.1) ** 2)) * 0.98 + 0.02; return r * s; };  /* closed, rounded fundus */
  for (let i = 0; i <= TS; i++) {
    curve.getPointAt(i / TS, c); const rad = prof(i / TS) / base;
    for (let j = 0; j <= RS; j++) { const idx = i * (RS + 1) + j; v.fromBufferAttribute(p, idx).sub(c); v.x *= rad; v.y *= rad; v.z *= rad * 0.78; p.setXYZ(idx, c.x + v.x, c.y + v.y, c.z + v.z); }
  }
  return finish(tg);
}

/* spleen: a thick crescent (banana) with a hilum notch on the inner border */
export function spleenGeom(h = 0.42) {
  const g = sphere(40, 30), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const y = v.y; let x = v.x * 0.12, z = v.z * 0.24, yy = y * h;
    x += -0.13 * y * y;                                   /* curve the organ around the stomach */
    if (v.x < -0.2) { x += 0.05 * Math.exp(-((y - 0.1) ** 2) / 0.05) * (-v.x); }  /* hilum notch */
    p.setXYZ(i, x, yy, z * (1 - 0.35 * Math.abs(y)));
  }
  return finish(g);
}

/* kidney (bean): hilum faces +x when dir = 1, -x when dir = -1 */
export function beanGeom(r, dir = 1) {
  const g = sphere(56, 42), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const vx = v.x * dir;
    let x = v.x * r[0], y = v.y * r[1], z = v.z * r[2];
    if (vx > 0.45) { const n = (vx - 0.45) / 0.55, w = Math.max(0, 1 - (v.y / 0.42) ** 2); x -= dir * n * w * 0.5 * r[0]; }
    p.setXYZ(i, x, y, z);
  }
  return finish(g);
}

/* irregular clot / haematoma: a lobed, slightly spiky blob (unit radius) */
export function clotGeom(seed = 3) {
  const g = sphere(40, 30), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 0.16 * Math.sin(3.1 * v.x + seed) * Math.sin(2.7 * v.y + 1.3 * seed) + 0.1 * Math.sin(5.3 * v.z + 2 * seed) * Math.cos(4.1 * v.x) + 0.05 * Math.sin(9 * v.y + 7 * v.z + seed);
    p.setXYZ(i, v.x * (1 + n), v.y * (1 + n), v.z * (1 + n));
  }
  return finish(g);
}
