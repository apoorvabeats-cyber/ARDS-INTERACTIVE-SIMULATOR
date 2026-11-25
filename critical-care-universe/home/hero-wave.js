/* The hero doctor on the home screen: a skinned model of a doctor (Meshy AI export, rigged and reduced for the web) that never stands still.
   It breathes, shifts its weight, looks around, nods as if explaining and turns a full circle on the spot. The left hand rests in the coat pocket;
   the right hand is in its pocket too, comes out to wave hello, and goes back in.
   Poses are small rotations per joint, written in world axes (x left/right, y up, z towards the viewer) on top of the rest pose, so
   the same code works for any skeleton with these joint names.
   createHero(THREE, gltfScene) -> { root, update(dt), yawOffset }                                                              */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sm = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const env = (t, a, b, f) => sm((t - a) / f) * (1 - sm((t - b + f) / f));        /* rises over f seconds from a, falls over f seconds to b */

export function createHero(THREE, scene, opts) {
  const SIDE = !!(opts && opts.rest === "side");                                                    /* the female doctor: arms at her sides / forearms forward instead of the pocket poses */
  const root = new THREE.Group(); root.add(scene);
  scene.updateMatrixWorld(true);
  const bones = {}, rest = {}; scene.traverse((o) => { if (o.isBone) { bones[o.name] = o; } });
  Object.values(bones).forEach((b) => { rest[b.name] = { q: b.quaternion.clone(), p: b.position.clone(), wq: b.getWorldQuaternion(new THREE.Quaternion()), pwq: (b.parent ? b.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()) }; });
  scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });

  /* the right hand's resting place: in the coat pocket. The model itself was made mid-wave, so the pocket pose is worked out here from joint positions:
     each bone is swung (shortest way) so that it points from the shoulder to the elbow target, from the elbow to the wrist target, and so on.
     Targets are in model axes (x left/right, y up, z towards the viewer), relative to the shoulder. */
  const POCKET = {};
  (function () {
    const V = THREE.Vector3, Qt = THREE.Quaternion;
    if (!(bones.UpperArm_R && bones.LowerArm_R && bones.Hand_R)) return;
    const wp = (n) => bones[n].getWorldPosition(new V()), wq = (n) => bones[n].getWorldQuaternion(new Qt());
    const S = wp("UpperArm_R"), El = wp("LowerArm_R"), Wr = wp("Hand_R");
    const sh = new V(-0.205, 0.56, -0.085), el = SIDE ? new V(-0.30, 0.32, -0.10) : new V(-0.31, 0.31, -0.17), wr = SIDE ? new V(-0.27, 0.29, 0.15) : new V(-0.21, 0.11, -0.06);
    const dU0 = El.clone().sub(S).normalize(), dU1 = el.clone().sub(sh).normalize();
    const dF0 = Wr.clone().sub(El).normalize(), dF1 = wr.clone().sub(el).normalize();
    const sU = new Qt().setFromUnitVectors(dU0, dU1);
    const wU = sU.clone().multiply(wq("UpperArm_R"));
    POCKET.UpperArm_R = bones.UpperArm_R.parent.getWorldQuaternion(new Qt()).invert().multiply(wU);
    const dF0n = dF0.clone().applyQuaternion(sU), sF = new Qt().setFromUnitVectors(dF0n, dF1);          /* forearm: after the upper arm has swung */
    const wF = sF.clone().multiply(sU).multiply(wq("LowerArm_R"));
    POCKET.LowerArm_R = wU.clone().invert().multiply(wF);
    const hand = new Qt().setFromAxisAngle(dF1, SIDE ? 0.2 : 0.0);                                         /* wrist bend: fingers pointing down into the pocket */
    const wH = hand.multiply(sF).multiply(sU).multiply(wq("Hand_R"));
    POCKET.Hand_R = wF.clone().invert().multiply(wH);
  })();
  /* the left hand (models whose left arm is modelled forearm-out): the forearm swings down and in to the coat pocket */
  (function () {
    const V = THREE.Vector3, Qt = THREE.Quaternion;
    if (!(bones.LowerArm_L && bones.Hand_L)) return;
    const wp = (n) => bones[n].getWorldPosition(new V()), wq = (n) => bones[n].getWorldQuaternion(new Qt());
    const El = wp("LowerArm_L"), Wr = wp("Hand_L");
    const dF0 = Wr.clone().sub(El).normalize(), dF1 = (SIDE ? new V(-0.12, -0.42, 1) : new V(-0.22, -1, 0.12)).normalize();
    const sF = new Qt().setFromUnitVectors(dF0, dF1);
    const wF = sF.clone().multiply(wq("LowerArm_L"));
    POCKET.LowerArm_L = bones.LowerArm_L.parent.getWorldQuaternion(new Qt()).invert().multiply(wF);
    const wH = sF.clone().multiply(wq("Hand_L"));
    POCKET.Hand_L = wF.clone().invert().multiply(wH);
  })();
  let hold = 1, holdL = 1;                                                                             /* 1: hand in its pocket, 0: out (the right one raised, the left one open) */
  const baseQ = (n, r) => { const h = n.endsWith("_L") ? holdL : hold; return POCKET[n] && h > 0.001 ? (h > 0.999 ? POCKET[n] : r.q.clone().slerp(POCKET[n], h)) : r.q; };

  const D = {}, E = new THREE.Euler(), Q = new THREE.Quaternion(), Pq = new THREE.Quaternion(), Pi = new THREE.Quaternion();
  const add = (name, x, y, z) => { const d = D[name] || (D[name] = [0, 0, 0]); d[0] += x || 0; d[1] += y || 0; d[2] += z || 0; };
  const rad = Math.PI / 180;
  function apply() {
    Object.keys(bones).forEach((n) => {
      const b = bones[n], r = rest[n], d = D[n];
      const bq = baseQ(n, r);
      if (!d) { b.quaternion.copy(bq); return; }
      E.set(d[0], d[1], d[2], "ZYX"); Q.setFromEuler(E);                          /* world-axis delta */
      Pq.copy(r.pwq); Pi.copy(Pq).invert();
      b.quaternion.copy(Pi).multiply(Q).multiply(Pq).multiply(bq);               /* inv(Wp) * D * Wp * restLocal */
    });
    Object.keys(D).forEach((k) => delete D[k]);
  }
  const hipsY0 = rest.Hips ? rest.Hips.p.y : 0;

  /* what the doctor does, in order, forever */
  const SCRIPT = [["idle", 2.2], ["wave", 5.2], ["idle", 1.4], ["explain", 5.0], ["look", 4.4], ["idle", 1.0], ["turn", 8.0], ["idle", 1.8], ["wave", 5.2], ["idle", 1.6], ["look", 3.6]];   /* the right hand comes out to wave twice; otherwise both hands stay in the pockets */
  const total = SCRIPT.reduce((a, s) => a + s[1], 0);
  let T = 0, yawTurn = 0, yawBlend = 0; const out = { root, yawOffset: 0, act: "idle" };

  function update(dt) {
    T += dt; let t = T % total, act = "idle", a0 = 0, dur = 1;
    for (const [n, d] of SCRIPT) { if (t < d) { act = n; dur = d; a0 = t; break; } t -= d; }
    out.act = act; const e = env(a0, 0, dur, Math.min(0.9, dur * 0.25)), tt = T;
    /* always on: breathing, a slow weight shift, a loose arm swing, the head drifting */
    const br = Math.sin(tt * 1.9), sw = Math.sin(tt * 0.55), dr = Math.sin(tt * 0.37 + 1);
    add("Spine", 0.012 * br, 0, 0.010 * sw); add("Chest", 0.018 * br, 0.03 * dr, 0); add("Hips", 0, 0.03 * sw, -0.012 * sw);
    add("Head", 0.02 * Math.sin(tt * 0.8) , 0.10 * dr, 0.02 * sw);
    add("UpLeg_L", 0, 0, -0.025 * sw); add("UpLeg_R", 0, 0, 0.025 * sw);
    if (rest.Hips) bones.Hips.position.y = hipsY0 + 0.004 * br;
    let yaw = 0;

    /* the right hand: in the pocket, out to wave (the arm is already in the waving pose of the model), and back in */
    hold = 1; holdL = 1;
    if (act === "wave") {
      const up = 1 - env(a0, 0, dur, 1.3);                                                  /* hold: 1 in the pocket, 0 raised */
      hold = up;
      const wv = sm((a0 - 1.1) / 0.5) * (1 - sm((a0 - (dur - 1.9)) / 0.5)), w = Math.sin(tt * 7.6) * wv;
      add("Hand_R", 0, 0, 0.55 * w); add("LowerArm_R", 0, 0, 0.14 * w);                     /* the hand sways left and right, palm to the viewer */
      add("Head", 0.02 * e, 0.16 * e, 0); add("Chest", 0, 0.08 * e, 0);                      /* a friendly turn of the head towards the viewer */
    }
    if (act === "explain" && POCKET.LowerArm_L) {                                     /* the left hand comes out and opens as she explains, then goes back */
      holdL = 1 - env(a0, 0, dur, 1.0); const g = Math.sin(tt * 2.1) * (1 - holdL);
      add("Hand_L", 0.10 * g, 0, 0.12 * g); add("LowerArm_L", 0.06 * g, 0.05 * g, 0);
    }
    if (act === "explain") {                                                          /* a conversational nod and a little lean, hands stay in the pockets */
      const c = Math.sin(tt * 1.3);
      add("Head", (0.10 * Math.sin(tt * 2.6) - 0.04) * e, 0.26 * c * e, 0.04 * Math.sin(tt * 1.7) * e); add("Chest", 0.02 * e, 0.10 * c * e, 0);
    }
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
