/* The hero doctor on the home screen: a skinned model of a doctor (Meshy AI export, rigged and reduced for the web) that never stands still.
   He breathes, shifts his weight, talks with his hands (forearms and hands move; the coat above the elbow stays with the body, so nothing stretches),
   nods, shakes his head, looks about and turns a full circle on the spot.
   Poses are small rotations per joint, written in world axes (x left/right, y up, z towards the viewer) on top of the rest pose, so
   the same code works for any skeleton with these joint names.
   createHero(THREE, gltfScene) -> { root, update(dt), yawOffset }                                                              */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const env = (t, a, b, f) => sm((t - a) / f) * (1 - sm((t - b + f) / f));        /* rises over f seconds from a, falls over f seconds to b */

export function createHero(THREE, scene) {
  const root = new THREE.Group(); root.add(scene);
  scene.updateMatrixWorld(true);
  const bones = {}, rest = {}; scene.traverse((o) => { if (o.isBone) { bones[o.name] = o; } });
  Object.values(bones).forEach((b) => { rest[b.name] = { q: b.quaternion.clone(), p: b.position.clone(), wq: b.getWorldQuaternion(new THREE.Quaternion()), pwq: (b.parent ? b.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()) }; });
  scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });

  const D = {}, E = new THREE.Euler(), Q = new THREE.Quaternion(), Pq = new THREE.Quaternion(), Pi = new THREE.Quaternion();
  const add = (name, x, y, z) => { const d = D[name] || (D[name] = [0, 0, 0]); d[0] += x || 0; d[1] += y || 0; d[2] += z || 0; };
  const rad = Math.PI / 180;
  function apply() {
    Object.keys(bones).forEach((n) => {
      const b = bones[n], r = rest[n], d = D[n];
      if (!d) { b.quaternion.copy(r.q); return; }
      E.set(d[0], d[1], d[2], "ZYX"); Q.setFromEuler(E);                          /* world-axis delta */
      Pq.copy(r.pwq); Pi.copy(Pq).invert();
      b.quaternion.copy(Pi).multiply(Q).multiply(Pq).multiply(r.q);               /* inv(Wp) * D * Wp * restLocal */
    });
    Object.keys(D).forEach((k) => delete D[k]);
  }
  const hipsY0 = rest.Hips ? rest.Hips.p.y : 0;

  /* what the doctor does, in order, forever */
  const SCRIPT = [["talk", 5.0], ["look", 4.4], ["open", 4.6], ["nod", 2.6], ["palms", 4.8], ["idle", 1.0], ["point", 4.2], ["shake", 2.6], ["turn", 8.0], ["talk", 4.0], ["idle", 1.0]];
  const total = SCRIPT.reduce((a, s) => a + s[1], 0);
  let T = 0; const out = { root, yawOffset: 0, act: "idle" };

  function update(dt) {
    T += dt; let t = T % total, act = "idle", a0 = 0, dur = 1;
    for (const [n, d] of SCRIPT) { if (t < d) { act = n; dur = d; a0 = t; break; } t -= d; }
    out.act = act; const e = env(a0, 0, dur, Math.min(0.9, dur * 0.25)), tt = T;
    /* always on: breathing, a slow weight shift, the head drifting, the hands never quite still */
    const br = Math.sin(tt * 1.9), sw = Math.sin(tt * 0.55), dr = Math.sin(tt * 0.37 + 1);
    add("Spine", 0.012 * br, 0, 0.010 * sw); add("Chest", 0.018 * br, 0.03 * dr, 0); add("Hips", 0, 0.03 * sw, -0.012 * sw);
    add("Head", 0.02 * Math.sin(tt * 0.8), 0.10 * dr, 0.02 * sw);
    { add("Hand_L", 0.05 * Math.sin(tt * 1.3), 0, 0.06 * Math.sin(tt * 1.1)); add("Hand_R", 0.05 * Math.sin(tt * 1.3 + 1), 0, -0.06 * Math.sin(tt * 1.1 + 1.4));
      add("LowerArm_L", 0.03 * Math.sin(tt * 0.9), 0.02 * Math.sin(tt * 0.7), 0); add("LowerArm_R", 0.03 * Math.sin(tt * 0.9 + 1), -0.02 * Math.sin(tt * 0.7 + 1), 0); }
    if (rest.Hips) bones.Hips.position.y = hipsY0 + 0.004 * br;
    let yaw = 0;

    /* only the forearms and hands move (the sleeves above the elbow are part of the coat), and only a little each time, so the coat never stretches.
       Positive x rotation lowers a forearm, negative lifts it; positive y swings the left forearm outwards and the right one inwards. */
    if (act === "talk") {                                                             /* a calm conversation: the hands answer each other */
      const a = Math.sin(tt * 1.7), b2 = Math.sin(tt * 1.7 + 2.3), c = Math.sin(tt * 0.8);
      add("LowerArm_L", -0.22 * a * e, 0.16 * b2 * e, 0); add("LowerArm_R", -0.22 * b2 * e, -0.16 * a * e, 0);
      add("Hand_L", -0.18 * a * e, 0, 0.28 * b2 * e); add("Hand_R", -0.18 * b2 * e, 0, -0.28 * a * e);
      add("Head", (0.07 * Math.sin(tt * 2.4) - 0.02) * e, 0.22 * c * e, 0.04 * Math.sin(tt * 1.5) * e); add("Chest", 0, 0.08 * c * e, 0);
    }
    if (act === "open") {                                                             /* "so, here is the thing": both hands open outwards and lift */
      const k = 0.5 + 0.5 * Math.sin(tt * 1.4);
      add("LowerArm_L", (-0.26 - 0.12 * k) * e, (0.42 + 0.10 * k) * e, 0); add("LowerArm_R", (-0.26 - 0.12 * k) * e, (-0.42 - 0.10 * k) * e, 0);
      add("Hand_L", -0.20 * e, 0, 0.35 * k * e); add("Hand_R", -0.20 * e, 0, -0.35 * k * e);
      add("Head", (-0.05 + 0.05 * Math.sin(tt * 1.8)) * e, 0.10 * Math.sin(tt * 0.9) * e, 0.05 * e); add("Chest", -0.03 * e, 0, 0);
    }
    if (act === "palms") {                                                            /* the hands come together and part again, like counting things off */
      const k = 0.5 + 0.5 * Math.sin(tt * 1.5);
      add("LowerArm_L", -0.12 * e, (-0.42 + 0.50 * k) * e, 0); add("LowerArm_R", -0.12 * e, (0.42 - 0.50 * k) * e, 0);
      add("Hand_L", -0.22 * e, 0, 0.25 * (1 - k) * e); add("Hand_R", -0.22 * e, 0, -0.25 * (1 - k) * e);
      add("Head", 0.06 * e, 0.16 * Math.sin(tt * 0.9) * e, 0);
    }
    if (act === "point") {                                                            /* the right hand beats time on a point; the left stays quiet */
      const beat = Math.max(0, Math.sin(tt * 3.4));
      add("LowerArm_R", (-0.50 - 0.16 * beat) * e, -0.14 * e, 0); add("Hand_R", (-0.30 - 0.22 * beat) * e, 0, -0.18 * e);
      add("LowerArm_L", 0.06 * e, 0.05 * e, 0);
      add("Head", (0.04 + 0.06 * beat) * e, -0.14 * e, 0.04 * e); add("Chest", 0.02 * e, -0.06 * e, 0);
    }
    if (act === "nod") { add("Head", (0.05 + 0.24 * Math.sin(tt * 3.6)) * e, 0, 0); add("Neck", 0.06 * Math.sin(tt * 3.6 - 0.4) * e, 0, 0); add("LowerArm_L", -0.06 * e, 0, 0); add("LowerArm_R", -0.06 * e, 0, 0); }
    if (act === "shake") { add("Head", 0.02 * e, 0.46 * Math.sin(tt * 3.8) * e, 0.05 * Math.sin(tt * 3.8) * e); add("Neck", 0, 0.12 * Math.sin(tt * 3.8 - 0.5) * e, 0); add("Hand_L", 0, 0, 0.25 * e); add("Hand_R", 0, 0, -0.25 * e); }
    if (act === "look") {                                                             /* looks left, up, right, down */
      const p = a0 / dur; add("Head", (-0.22 * Math.sin(p * 6.28 * 1.5 + 0.8)) * e, 0.9 * Math.sin(p * 6.28) * e, 0.08 * Math.sin(p * 6.28 + 1) * e);
      add("Neck", 0.05 * Math.sin(p * 9) * e, 0.35 * Math.sin(p * 6.28) * e, 0); add("Chest", 0, 0.18 * Math.sin(p * 6.28) * e, 0);
    }
    if (act === "turn") {                                                            /* feet planted, a slow turn on the spot with a little sway in the shoulders */
      const sw2 = Math.sin(tt * 1.6); add("Chest", 0, 0.05 * sw2 * e, 0); add("Hips", 0, -0.03 * sw2 * e, 0);
    }
    if (act === "turn") { yaw = sm(a0 / (dur - 0.6)) * Math.PI * 2; }
    out.turnYaw = yaw;
    apply();
    root.rotation.y = yaw + out.yawOffset;
  }
  out.setPose = (map) => { Object.keys(map).forEach((k) => add(k, ...map[k])); apply(); };   /* for tests: a fixed pose */
  out.update = update; out.bones = bones; out.setTime = (v) => { T = v; }; out.time = () => T; return out;
}
