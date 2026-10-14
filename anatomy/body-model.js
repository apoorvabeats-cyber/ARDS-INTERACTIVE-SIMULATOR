// Procedural anatomical body for the Critical Care Hub viewer.
// Pure three.js: THREE is passed in, so this file has no imports and can be unit-tested in Node.
// World units are metres. Feet at y=0, head top at y~1.91. The body faces +z; the patient's left is +x.

export const BAND = {
  // y/x ranges used by the skin shader to light one region. focus = camera target, frac = zoom (fraction of full-body distance)
  head:    { y: [1.70, 2.20],  x: [0, 10],    focus: [0, 1.80, 0],  frac: 0.36 },
  neck:    { y: [1.545, 1.70], x: [0, 0.10],  focus: [0, 1.62, 0],  frac: 0.34 },
  chest:   { y: [1.29, 1.545], x: [0, 0.172], focus: [0, 1.41, 0],  frac: 0.50 },
  abdomen: { y: [1.03, 1.29],  x: [0, 0.172], focus: [0, 1.16, 0],  frac: 0.50 },
  pelvis:  { y: [0.84, 1.03],  x: [0, 0.20],  focus: [0, 0.94, 0],  frac: 0.52 },
  arms:    { y: [0.85, 1.56],  x: [0.18, 10], focus: [0, 1.20, 0],  frac: 0.78 },
  legs:    { y: [-0.10, 0.88], x: [0, 10],    focus: [0, 0.45, 0],  frac: 0.80 }
};

export function regionAt(x, y) {
  const ax = Math.abs(x);
  if (y >= 1.70) return 'head';
  if (y >= 1.545 && ax < 0.10) return 'neck';
  if (y < 0.88) return 'legs';
  if (y > 0.85 && y < 1.56 && ax > 0.18) return 'arms';
  if (y >= 1.29) return 'chest';
  if (y >= 1.03) return 'abdomen';
  return 'pelvis';
}

export function createUniforms(THREE, reduce) {
  return { uTime: { value: 0 }, uScan: { value: 0 }, uFlick: { value: reduce ? 0 : 1 }, uSkin: { value: 1 } };
}

const SKIN_V = 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; vec4 mv=viewMatrix*wp; vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }';
const SKIN_F = [
  'uniform float uTime; uniform float uScan; uniform float uFlick; uniform float uSkin; uniform float uSel;',
  'uniform vec3 uColor; uniform vec3 uHot; uniform vec3 uSelColor; uniform vec2 uBand; uniform vec2 uXr;',
  'varying vec3 vN; varying vec3 vV; varying vec3 vW;',
  'void main(){',
  '  vec3 n=normalize(vN); vec3 v=normalize(vV);',
  '  float f=1.0-abs(dot(n,v));',
  '  float rim=pow(f,2.3);',
  '  float d=(vW.y-uScan)*9.0; float band=exp(-d*d);',
  '  float below=step(vW.y,uScan)*exp(-(uScan-vW.y)*3.2);',
  '  float dl=abs(fract(vW.y*34.0)-0.5); float lines=smoothstep(0.455,0.5,dl);',
  '  float flick=1.0-uFlick*0.07*(0.5+0.5*sin(uTime*41.0+vW.y*9.0));',
  '  float a=(0.045+rim*0.8+lines*(0.10+rim*0.25)+band*0.75+below*0.10)*flick*uSkin;',
  '  if(!gl_FrontFacing) a*=0.55;',
  '  float ax=abs(vW.x); float lo=uXr.x<0.001?-1.0:uXr.x;',
  '  float inX=smoothstep(lo-0.012,lo+0.012,ax)*(1.0-smoothstep(uXr.y-0.012,uXr.y+0.012,ax));',
  '  float inB=smoothstep(uBand.x-0.012,uBand.x+0.012,vW.y)*(1.0-smoothstep(uBand.y-0.012,uBand.y+0.012,vW.y));',
  '  float e1=(vW.y-uBand.x)*70.0; float e2=(vW.y-uBand.y)*70.0;',
  '  float edge=(exp(-e1*e1)+exp(-e2*e2))*inX;',
  '  float sel=uSel*inB*inX;',
  '  a+=sel*(0.10+pow(f,1.3)*1.1)+uSel*edge*0.55;',
  '  vec3 col=mix(uColor,uHot,clamp(band+rim*0.4,0.0,1.0));',
  '  col=mix(col,uSelColor,clamp(sel*0.9+uSel*edge*0.6,0.0,1.0));',
  '  gl_FragColor=vec4(col*(0.75+band*1.1+sel*0.6),clamp(a,0.0,1.0));',
  '}'].join('\n');

const ORGAN_V = 'varying vec3 vN; varying vec3 vV; varying vec3 vL; void main(){ vL=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }';
const ORGAN_F = [
  'uniform float uTime; uniform float uGlow; uniform float uFreq; uniform vec3 uColor;',
  'varying vec3 vN; varying vec3 vV; varying vec3 vL;',
  'void main(){',
  '  vec3 n=normalize(vN); vec3 v=normalize(vV);',
  '  float f=1.0-abs(dot(n,v));',
  '  vec3 p=vL*uFreq;',
  '  float pat=0.5+0.5*sin(p.x*1.1+p.y*0.9+uTime*1.6)*sin(p.z*1.0-uTime);',
  '  float a=(0.16+0.55*pow(f,1.6)+0.10*pat)*uGlow;',
  '  vec3 c=uColor*(0.85+0.9*f)+vec3(0.15)*pow(f,3.0);',
  '  gl_FragColor=vec4(c,clamp(a,0.0,1.0));',
  '}'].join('\n');

const STYLE = {
  brain:      { label: 'Brain',      color: 0xc3a8ff },
  thyroid:    { label: 'Thyroid',    color: 0xffc46b },
  lungs:      { label: 'Lungs',      color: 0x62e6ff },
  heart:      { label: 'Heart',      color: 0xff6b7a },
  liver:      { label: 'Liver',      color: 0xf2a14e },
  stomach:    { label: 'Stomach',    color: 0xffd479 },
  spleen:     { label: 'Spleen',     color: 0xd07bff },
  intestines: { label: 'Intestines', color: 0xe9c46a },
  kidneys:    { label: 'Kidneys',    color: 0xff9b6b }
};

export function buildBody(THREE, U, opts) {
  opts = opts || {};
  const reduce = !!opts.reduce;
  const ADD = THREE.AdditiveBlending;

  const rig = new THREE.Group(); rig.position.y = 0.015;
  const skinGroup = new THREE.Group(), organsG = new THREE.Group(), boneG = new THREE.Group(), vesselG = new THREE.Group();
  boneG.visible = false; vesselG.visible = false;
  rig.add(skinGroup, organsG, boneG, vesselG);

  /* ---- shared skin material: one shader lights any region by y and |x| ranges ---- */
  const skinMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uScan: U.uScan, uFlick: U.uFlick, uSkin: U.uSkin,
      uColor: { value: new THREE.Color(0x2fe0d2) }, uHot: { value: new THREE.Color(0xd9fbff) },
      uSelColor: { value: new THREE.Color(0x66ffd9) }, uSel: { value: 0 },
      uBand: { value: new THREE.Vector2(-10, 10) }, uXr: { value: new THREE.Vector2(0, 10) }
    },
    vertexShader: SKIN_V, fragmentShader: SKIN_F,
    transparent: true, depthWrite: false, blending: ADD, side: THREE.DoubleSide
  });
  const pickMeshes = [];
  function skinMesh(geo) { const m = new THREE.Mesh(geo, skinMat); pickMeshes.push(m); return m; }

  /* ---- geometry helpers ---- */
  function smooth(sec, count) {
    const pts = sec.map(function (s) { return new THREE.Vector3(s[1], s[2], s[0]); });
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    return c.getPoints(count).map(function (p) { return { y: p.z, rx: Math.max(p.x, 0.0006), rz: Math.max(p.y, 0.0006) }; });
  }
  function loft(sections, seg) {
    const pos = [], idx = [], row = seg + 1;
    sections.forEach(function (s) {
      for (let j = 0; j <= seg; j++) { const a = j / seg * Math.PI * 2; pos.push(s.rx * Math.cos(a), s.y, s.rz * Math.sin(a)); }
    });
    for (let i = 0; i < sections.length - 1; i++) {
      for (let j = 0; j < seg; j++) { const a = i * row + j, b = a + 1, c = a + row, d = c + 1; idx.push(a, c, b, b, c, d); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const n = g.attributes.normal;
    for (let k = 0; k < sections.length; k++) { // weld the seam normals
      const p = k * row, q = p + seg;
      const x = n.getX(p) + n.getX(q), y = n.getY(p) + n.getY(q), z = n.getZ(p) + n.getZ(q), l = Math.sqrt(x * x + y * y + z * z) || 1;
      n.setXYZ(p, x / l, y / l, z / l); n.setXYZ(q, x / l, y / l, z / l);
    }
    return g;
  }
  function ell(rx, ry, rz, mat, w, h) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, w || 40, h || 28), mat); m.scale.set(rx, ry, rz); return m;
  }
  function at(m, v) { m.position.copy(v); return m; }
  function boneBetween(a, b, r1, r2, mat) {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 8, 1), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  }

  /* ---- skin: torso, head, legs, arms ---- */
  const TORSO = [
    [0.84, 0.12, 0.085], [0.90, 0.165, 0.10], [1.00, 0.175, 0.105], [1.08, 0.155, 0.098], [1.16, 0.138, 0.09],
    [1.26, 0.146, 0.092], [1.36, 0.165, 0.10], [1.44, 0.172, 0.102], [1.50, 0.165, 0.095], [1.54, 0.11, 0.075],
    [1.58, 0.058, 0.058], [1.64, 0.052, 0.055], [1.72, 0.05, 0.055], [1.74, 0.04, 0.04]
  ];
  function torsoAt(y) {
    for (let i = 0; i < TORSO.length - 1; i++) {
      const a = TORSO[i], b = TORSO[i + 1];
      if (y >= a[0] && y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0]); return { rx: a[1] + (b[1] - a[1]) * t, rz: a[2] + (b[2] - a[2]) * t }; }
    }
    return { rx: 0.15, rz: 0.09 };
  }
  skinGroup.add(skinMesh(loft(smooth(TORSO, 80), 56)));

  const head = skinMesh(new THREE.SphereGeometry(1, 48, 32)); head.scale.set(0.083, 0.108, 0.1); head.position.set(0, 1.805, 0.002); skinGroup.add(head);
  const jaw = skinMesh(new THREE.SphereGeometry(1, 36, 24)); jaw.scale.set(0.064, 0.058, 0.078); jaw.position.set(0, 1.735, 0.014); skinGroup.add(jaw);
  const nose = skinMesh(new THREE.SphereGeometry(1, 16, 12)); nose.scale.set(0.012, 0.026, 0.02); nose.position.set(0, 1.79, 0.104); skinGroup.add(nose);

  const LEG = [[0.04, 0.03, 0.03], [0.07, 0.034, 0.034], [0.14, 0.04, 0.04], [0.28, 0.056, 0.056], [0.36, 0.062, 0.06],
    [0.44, 0.06, 0.06], [0.5, 0.062, 0.064], [0.62, 0.078, 0.08], [0.78, 0.095, 0.097], [0.88, 0.098, 0.098], [0.9, 0.06, 0.06]];
  const legGeo = loft(smooth(LEG, 60), 32);
  [-1, 1].forEach(function (s) {
    const leg = skinMesh(legGeo); leg.position.x = 0.093 * s; skinGroup.add(leg);
    const foot = skinMesh(new THREE.SphereGeometry(1, 24, 16)); foot.scale.set(0.04, 0.028, 0.1); foot.position.set(0.095 * s, 0.028, 0.05); skinGroup.add(foot);
  });

  const ARM = [[-0.605, 0.004, 0.004], [-0.6, 0.022, 0.022], [-0.58, 0.026, 0.026], [-0.46, 0.034, 0.034], [-0.34, 0.04, 0.04],
    [-0.3, 0.038, 0.038], [-0.2, 0.043, 0.043], [-0.08, 0.05, 0.05], [0, 0.052, 0.052], [0.02, 0.03, 0.03]];
  const armGeo = loft(smooth(ARM, 56), 28);
  const ARM_ANG = 0.12, SHOULDER = [0.19, 1.485];
  [-1, 1].forEach(function (s) {
    const arm = new THREE.Group(); arm.position.set(SHOULDER[0] * s, SHOULDER[1], 0); arm.rotation.z = ARM_ANG * s;
    arm.add(skinMesh(armGeo));
    const sh = skinMesh(new THREE.SphereGeometry(1, 24, 16)); sh.scale.set(0.055, 0.055, 0.055); arm.add(sh);
    const hand = skinMesh(new THREE.SphereGeometry(1, 16, 12)); hand.scale.set(0.026, 0.066, 0.014); hand.position.set(0, -0.665, 0); arm.add(hand);
    skinGroup.add(arm);
  });
  function armPt(s, L) { return new THREE.Vector3(SHOULDER[0] * s + L * Math.sin(ARM_ANG) * s, SHOULDER[1] - L * Math.cos(ARM_ANG), 0); }

  /* ---- organ material ---- */
  function organMat(hex, freq) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uGlow: { value: 0.6 }, uFreq: { value: freq }, uColor: { value: new THREE.Color(hex) } },
      vertexShader: ORGAN_V, fragmentShader: ORGAN_F, transparent: true, depthWrite: false, blending: ADD, side: THREE.DoubleSide
    });
  }

  /* ---- skeleton ---- */
  const boneMat = new THREE.MeshBasicMaterial({ color: 0xcff7ff, transparent: true, opacity: 0.32, blending: ADD, depthWrite: false });
  const boneShell = organMat(0xcfeaff, 8); boneShell.uniforms.uGlow.value = 0.45;
  const vert = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.017, 0.016, 10), boneMat, 24);
  const dm = new THREE.Object3D();
  for (let vi = 0; vi < 24; vi++) {
    const tt = vi / 23; dm.position.set(0, 1.6 - tt * 0.62, -0.058 - 0.024 * Math.sin(tt * Math.PI * 1.1));
    dm.updateMatrix(); vert.setMatrixAt(vi, dm.matrix);
  }
  vert.instanceMatrix.needsUpdate = true; boneG.add(vert);
  for (let ri = 0; ri < 10; ri++) {
    const y0 = 1.49 - 0.034 * ri, ts = torsoAt(y0), rx = ts.rx * 0.86, rz = ts.rz * 0.82;
    [-1, 1].forEach(function (s) {
      const pts = [];
      for (let si = 0; si <= 16; si++) { const u = si / 16, a = 0.12 + (Math.PI - 0.2) * u; pts.push(new THREE.Vector3(s * rx * Math.sin(a), y0 - 0.045 * (1 - u), rz * Math.cos(a))); }
      boneG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0045, 5, false), boneMat));
    });
  }
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.008), boneMat);
  sternum.position.set(0, 1.4, torsoAt(1.4).rz * 0.82 + 0.004); boneG.add(sternum);
  boneG.add(at(ell(0.074, 0.095, 0.088, boneShell, 32, 22), new THREE.Vector3(0, 1.815, 0)));
  boneG.add(at(ell(0.055, 0.04, 0.065, boneShell, 24, 16), new THREE.Vector3(0, 1.74, 0.025)));
  [-1, 1].forEach(function (s) {
    boneG.add(boneBetween(new THREE.Vector3(0, 1.54, 0.055), new THREE.Vector3(0.17 * s, 1.51, 0.02), 0.007, 0.007, boneMat));
    boneG.add(boneBetween(armPt(s, 0.02), armPt(s, 0.3), 0.014, 0.011, boneShell));
    boneG.add(boneBetween(armPt(s, 0.3), armPt(s, 0.58), 0.011, 0.008, boneShell));
    boneG.add(at(ell(0.022, 0.022, 0.022, boneShell, 16, 12), armPt(s, 0.02)));
    boneG.add(at(ell(0.016, 0.016, 0.016, boneShell, 16, 12), armPt(s, 0.3)));
    boneG.add(boneBetween(new THREE.Vector3(0.093 * s, 0.84, 0), new THREE.Vector3(0.093 * s, 0.47, 0.01), 0.02, 0.017, boneShell));
    boneG.add(boneBetween(new THREE.Vector3(0.093 * s, 0.46, 0.01), new THREE.Vector3(0.093 * s, 0.07, 0), 0.016, 0.011, boneShell));
    boneG.add(at(ell(0.024, 0.024, 0.024, boneShell, 16, 12), new THREE.Vector3(0.093 * s, 0.465, 0.012)));
    const il = ell(0.075, 0.05, 0.03, boneShell, 20, 14); il.position.set(0.09 * s, 0.97, -0.02); il.rotation.z = 0.5 * s; boneG.add(il);
  });
  boneG.add(at(ell(0.03, 0.05, 0.02, boneShell, 16, 12), new THREE.Vector3(0, 0.95, -0.065)));

  /* ---- vessels ---- */
  const artMat = new THREE.MeshBasicMaterial({ color: 0xff6b7a, transparent: true, opacity: 0.8, blending: ADD, depthWrite: false });
  const veinMat = new THREE.MeshBasicMaterial({ color: 0x62b8ff, transparent: true, opacity: 0.8, blending: ADD, depthWrite: false });
  function vessel(pts, r, mat) { vesselG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, r, 6, false), mat)); }
  const V3 = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  vessel([V3(0.02, 1.37, 0.015), V3(0.0, 1.445, -0.005), V3(0.03, 1.43, -0.03), V3(0.025, 1.3, -0.045), V3(0.015, 1.1, -0.04), V3(0, 0.95, -0.03)], 0.013, artMat);
  vessel([V3(-0.02, 0.95, -0.03), V3(-0.025, 1.1, -0.035), V3(-0.02, 1.3, -0.02), V3(-0.01, 1.34, 0)], 0.014, veinMat);
  [-1, 1].forEach(function (s) {
    vessel([V3(0, 0.95, -0.03), V3(0.05 * s, 0.9, -0.02), V3(0.088 * s, 0.7, 0), V3(0.09 * s, 0.45, 0.01), V3(0.088 * s, 0.15, 0)], 0.008, artMat);
    vessel([V3(-0.02, 0.95, -0.03), V3(0.07 * s, 0.88, -0.02), V3(0.1 * s, 0.7, -0.012), V3(0.103 * s, 0.45, -0.01), V3(0.095 * s, 0.15, -0.01)], 0.008, veinMat);
    vessel([V3(0.06 * s, 1.49, 0), V3(0.17 * s, 1.46, 0), armPt(s, 0.3), armPt(s, 0.58)], 0.006, artMat);
    vessel([V3(0.03 * s, 1.4, 0.005), V3(0.03 * s, 1.55, 0.005), V3(0.03 * s, 1.68, 0.005)], 0.007, artMat);
    vessel([V3(0.045 * s, 1.4, 0.015), V3(0.045 * s, 1.55, 0.015), V3(0.045 * s, 1.68, 0.015)], 0.006, veinMat);
  });

  /* ---- organs ---- */
  const glowTex = (function () {
    if (typeof document === 'undefined') return null;
    const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d'); if (!x) return null;
    const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, s, s); return new THREE.CanvasTexture(c);
  })();
  const organs = {}, organList = [];
  function makeOrgan(id, pos, freq, rad, frac, anchors, build) {
    const st = STYLE[id], g = new THREE.Group(); g.position.set(pos[0], pos[1], pos[2]);
    const mat = organMat(st.color, freq);
    build(g, mat);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: st.color, transparent: true, opacity: 0.3, blending: ADD, depthWrite: false, depthTest: false }));
    sp.scale.set(rad * 3.4, rad * 3.4, 1); g.add(sp);
    organsG.add(g);
    const o = { id: id, label: st.label, group: g, mat: mat, sprite: sp, y: pos[1], rad: rad, frac: frac, glow: 0.6,
      anchors: anchors.map(function (a) { return new THREE.Vector3(a[0], a[1], a[2]); }) };
    organs[id] = o; organList.push(o); return o;
  }

  makeOrgan('brain', [0, 1.815, 0.005], 12, 0.085, 0.34, [[0, 0, 0]], function (g, m) {
    [-1, 1].forEach(function (s) { const h = ell(0.037, 0.058, 0.078, m, 32, 24); h.position.x = 0.034 * s; g.add(h); });
    const cb = ell(0.04, 0.025, 0.035, m, 20, 14); cb.position.set(0, -0.045, -0.055); g.add(cb);
  });
  makeOrgan('thyroid', [0, 1.6, 0.04], 12, 0.04, 0.26, [[0, 0, 0]], function (g, m) {
    [-1, 1].forEach(function (s) { const l = ell(0.012, 0.03, 0.012, m, 16, 12); l.position.x = 0.02 * s; g.add(l); });
    g.add(ell(0.02, 0.006, 0.008, m, 16, 10));
  });
  const lobe = loft(smooth([[-0.14, 0.003, 0.004], [-0.13, 0.035, 0.04], [-0.11, 0.052, 0.058], [-0.06, 0.06, 0.068], [0, 0.058, 0.068], [0.06, 0.05, 0.062], [0.11, 0.032, 0.048], [0.14, 0.012, 0.02]], 48), 32);
  makeOrgan('lungs', [0, 1.335, -0.005], 130, 0.085, 0.42, [[-0.082, 0, 0], [0.082, 0, 0]], function (g, m) {
    const r = new THREE.Mesh(lobe, m); r.position.x = -0.082; g.add(r);
    const l = new THREE.Mesh(lobe, m); l.position.x = 0.082; l.scale.set(0.94, 1, 1); g.add(l);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.35, 14, 1, true), m); tr.position.set(0, 0.155, 0.02); g.add(tr);
  });
  makeOrgan('heart', [0.03, 1.325, 0.02], 12, 0.06, 0.30, [[0, 0, 0]], function (g, m) {
    g.rotation.z = 0.45; g.add(ell(0.04, 0.052, 0.038, m, 32, 24));
    const ao = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.045, 12, 1, true), m); ao.position.set(-0.006, 0.06, 0); g.add(ao);
  });
  makeOrgan('liver', [-0.065, 1.235, 0.02], 12, 0.07, 0.36, [[0, 0, 0]], function (g, m) { g.rotation.z = -0.15; g.add(ell(0.088, 0.042, 0.058, m, 32, 22)); });
  makeOrgan('stomach', [0.06, 1.205, 0.02], 12, 0.05, 0.32, [[0, 0, 0]], function (g, m) { g.rotation.z = 0.6; g.add(ell(0.04, 0.058, 0.034, m, 28, 20)); });
  makeOrgan('spleen', [0.108, 1.215, -0.04], 12, 0.04, 0.30, [[0, 0, 0]], function (g, m) { g.rotation.z = 0.25; g.add(ell(0.022, 0.05, 0.03, m, 24, 18)); });
  makeOrgan('kidneys', [0, 1.135, -0.05], 12, 0.045, 0.34, [[-0.06, 0, 0], [0.06, 0, 0]], function (g, m) {
    [-1, 1].forEach(function (s) { const k = ell(0.02, 0.04, 0.018, m, 20, 16); k.position.x = 0.06 * s; k.rotation.z = 0.15 * s; g.add(k); });
  });
  makeOrgan('intestines', [0, 1.05, 0.01], 130, 0.1, 0.38, [[0, 0, 0]], function (g, m) {
    const pts = []; for (let k = 0; k <= 48; k++) pts.push(new THREE.Vector3(0.095 * Math.sin(k * 0.9), -0.06 + 0.12 * (k / 48) + 0.01 * Math.sin(k * 2.1), 0.035 * Math.cos(k * 1.3)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.012, 8, false), m));
  });
  rig.updateMatrixWorld(true);

  /* ---- selection + per-frame update ---- */
  let selT = 0;
  const BEAT = 60 / 72;
  const api = {
    rig: rig, skinGroup: skinGroup, organsG: organsG, boneG: boneG, vesselG: vesselG, skinMat: skinMat,
    pickMeshes: pickMeshes, organs: organs, organList: organList, BAND: BAND, regionAt: regionAt,
    setRegion: function (id) {
      const b = id && BAND[id];
      selT = b ? 1 : 0;
      if (b) { skinMat.uniforms.uBand.value.set(b.y[0], b.y[1]); skinMat.uniforms.uXr.value.set(b.x[0], b.x[1]); }
    },
    update: function (dt, T, ctx) {
      const k = Math.min(1, dt * 10);
      organList.forEach(function (o) {
        const dd = (ctx.scanY - o.y) / 0.07, hit = ctx.scanning ? Math.exp(-dd * dd) : 0;
        const tgt = 0.55 + hit + (o.id === ctx.sel ? 0.9 : 0) + (o.id === ctx.hover ? 0.4 : 0);
        o.glow += (tgt - o.glow) * k;
        o.mat.uniforms.uGlow.value = o.glow;
        o.sprite.material.opacity = Math.min(0.9, 0.12 + 0.3 * o.glow);
      });
      const p = (T % BEAT) / BEAT, lub = Math.exp(-Math.pow((p - 0.06) / 0.035, 2)), dub = 0.7 * Math.exp(-Math.pow((p - 0.3) / 0.04, 2));
      organs.heart.group.scale.setScalar(1 + (reduce ? 0.05 : 0.11) * (lub + dub));
      const br = 0.5 + 0.5 * Math.sin(T * Math.PI * 2 / 4.2);
      organs.lungs.group.scale.set(1 + 0.025 * br, 1 + 0.035 * br, 1 + 0.03 * br);
      const u = skinMat.uniforms.uSel; u.value += (selT - u.value) * Math.min(1, dt * 8);
    },
    dispose: function () {
      rig.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
      [skinMat, boneMat, boneShell, artMat, veinMat].forEach(function (m) { m.dispose(); });
      organList.forEach(function (o) { o.mat.dispose(); o.sprite.material.dispose(); });
    }
  };
  return api;
}

/* Use a licensed GLB as the skin shell. Internals stay procedural; see anatomy/README.md for alignment notes. */
export function adaptSkinGlb(THREE, root, body) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (!(size.y > 0)) throw new Error('GLB has no measurable height');
  root.scale.multiplyScalar(1.9 / size.y);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse(function (o) { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) throw new Error('GLB contains no meshes');
  body.skinGroup.visible = false;
  body.pickMeshes.length = 0;
  meshes.forEach(function (m) {
    m.material = body.skinMat;
    if (m.geometry && !m.geometry.attributes.normal) m.geometry.computeVertexNormals();
    body.pickMeshes.push(m);
  });
  body.rig.add(root);
  body.glbRoot = root;
  return meshes.length;
}
