/* Photoreal pathology stage for Critical Care Hub.
   Gross specimens use triplanar tissue photographs on anatomical meshes.
   Cellular scenes are lit 3D structures, not flat diagrams.
   A complication is added by editing pathology-models.json (organ: lung|kidney|heart|liver|brain|vessel).
   Optional glb replaces the gross mesh only. */
(function () {
  if (!window.THREE) {
    window.PathStage = { mount: function (el) { el.innerHTML = "<p style='color:#f3efe6;padding:12px'>3D engine could not load.</p>"; return { set: function () {}, destroy: function () {} }; } };
    return;
  }
  const THREE = window.THREE;
  const clamp = (x, a, b) => Math.max(a == null ? 0 : a, Math.min(b == null ? 1 : b, x));

  function hash(ix, iy, iz) {
    let n = (ix * 374761393 + iy * 668265263 + iz * 1274126177) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function noise3(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    let s = 0;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) {
      const h = hash(ix + a, iy + b, iz + c);
      s += h * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
    }
    return s;
  }
  function fbm(x, y, z) {
    let f = 0, a = 0.5, m = 0;
    for (let i = 0; i < 4; i++) {
      f += a * noise3(x, y, z); m += a; a *= 0.5;
      x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 + 4.1;
    }
    return f / m;
  }

  function loadTex(url) {
    const t = new THREE.TextureLoader().load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    return t;
  }

  function tissueMaterial(healthy, sick, scale) {
    const mat = new THREE.MeshPhysicalMaterial({
      map: healthy,
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.03,
      clearcoat: 0.78,
      clearcoatRoughness: 0.22,
      reflectivity: 0.5,
      side: THREE.FrontSide
    });
    const uMix = { value: 0 };
    mat.userData.uMix = uMix;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSick = { value: sick };
      shader.uniforms.uMix = uMix;
      shader.uniforms.uScale = { value: scale || 0.72 };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vTriW;\nvarying vec3 vTriN;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n vTriW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n vTriN = normalize(mat3(modelMatrix) * objectNormal);");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
          uniform sampler2D uSick; uniform float uMix; uniform float uScale;
          varying vec3 vTriW; varying vec3 vTriN;
          vec3 sampleTri(sampler2D tex, vec3 p, vec3 n){
            vec3 b = abs(normalize(n)); b /= (b.x+b.y+b.z+1e-5);
            return texture2D(tex, p.yz*uScale).rgb*b.x + texture2D(tex, p.xz*uScale).rgb*b.y + texture2D(tex, p.xy*uScale).rgb*b.z;
          }`)
        .replace("#include <map_fragment>", `#ifdef USE_MAP
          vec3 nrm = normalize(vTriN);
          vec3 hcol = sampleTri(map, vTriW, nrm);
          vec3 scol = sampleTri(uSick, vTriW, nrm);
          vec4 texelColor = vec4(mix(hcol, scol, clamp(uMix,0.0,1.0)), 1.0);
          texelColor = mapTexelToLinear(texelColor);
          diffuseColor *= texelColor;
        #endif`);
    };
    mat.customProgramCacheKey = () => "tri-tissue-v1";
    return mat;
  }

  function wet(color, o) {
    return new THREE.MeshPhysicalMaterial(Object.assign({
      color, roughness: 0.38, metalness: 0.04, clearcoat: 0.55, clearcoatRoughness: 0.3
    }, o || {}));
  }

  function organic(seg, amp, seed) {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.72));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = fbm(x * 2.1 + seed, y * 2.1, z * 2.1);
      const ridge = Math.abs(fbm(x * 4.2 + seed, y * 4.2 + 3, z * 4.2) * 2 - 1);
      const r = 1 + amp * (d * 2 - 1) - amp * 0.55 * ridge;
      p.setXYZ(i, x * r, y * r, z * r);
    }
    g.computeVertexNormals();
    return g;
  }

  function tube(pts, rad, mat, seg) {
    const c = new THREE.CatmullRomCurve3(pts);
    return new THREE.Mesh(new THREE.TubeGeometry(c, seg || 24, rad, 8, false), mat);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  function tag(mesh, title, body, care) {
    mesh.userData.pick = { title, body, care };
    return mesh;
  }

  function rbcGeo() {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI;
      const y = Math.cos(a) * 0.18;
      const pinch = 1 - 0.42 * Math.pow(Math.cos(a), 2);
      pts.push(new THREE.Vector2(Math.max(0.03, Math.sin(a) * 0.5 * pinch), y));
    }
    return new THREE.LatheGeometry(pts, 16);
  }

  const CATALOG = [
    { id: "ards", title: "ARDS", organ: "lung", glb: "", reversible: 0.4, textures: { healthy: "tex/lung-healthy.jpg", diseased: "tex/lung-ards.jpg" }, views: [
      { id: "organ", label: "Lungs", text: "Both lungs. Dependent lobes consolidate first." },
      { id: "cut", label: "Cut surface", text: "The cut face turns solid and dark red as alveoli fill." },
      { id: "cells", label: "Alveolus", text: "Wall, capillary, type II cells, oedema and hyaline membrane." }
    ]},
    { id: "aki", title: "Acute kidney injury", organ: "kidney", glb: "", reversible: 0.45, textures: { healthy: "tex/kidney-healthy.jpg", diseased: "tex/kidney-aki.jpg" }, views: [
      { id: "organ", label: "Kidney", text: "Swollen, pale cortex." },
      { id: "cut", label: "Cut surface", text: "Pale cortex, darker medulla." },
      { id: "cells", label: "Tubule", text: "Brush border lost, cells slough, casts form." }
    ]},
    { id: "dic", title: "DIC", organ: "vessel", mode: "dic", glb: "", reversible: 0.25, textures: { healthy: "tex/kidney-healthy.jpg", diseased: "tex/fibrin.jpg" }, views: [
      { id: "organ", label: "Microvessels", text: "Fibrin occludes small vessels." },
      { id: "cut", label: "Cut surface", text: "Thrombi in the microcirculation." },
      { id: "cells", label: "Fibrin", text: "Strands trap platelets and shear red cells." }
    ]},
    { id: "cardiac", title: "Myocardial dysfunction", organ: "heart", glb: "", reversible: 0.92, textures: { healthy: "tex/heart-healthy.jpg", diseased: "tex/heart-sick.jpg" }, views: [
      { id: "organ", label: "Heart", text: "Dilated, weaker beat. Usually reversible." },
      { id: "cut", label: "Chamber", text: "The cavity enlarges." },
      { id: "cells", label: "Myocyte", text: "Sarcomeres shorten less. Mitochondria swell." }
    ]},
    { id: "hepatic", title: "Hepatic dysfunction", organ: "liver", glb: "", reversible: 0.55, textures: { healthy: "tex/liver-healthy.jpg", diseased: "tex/liver-sick.jpg" }, views: [
      { id: "organ", label: "Liver", text: "Enlarged, congested, steatotic." },
      { id: "cut", label: "Cut surface", text: "Nutmeg congestion and fat." },
      { id: "cells", label: "Hepatocytes", text: "Fat vacuoles, slow sinusoids, a necrotic cell." }
    ]},
    { id: "enceph", title: "Encephalopathy", organ: "brain", glb: "", reversible: 0.88, textures: { healthy: "tex/brain-healthy.jpg", diseased: "tex/brain-sick.jpg" }, views: [
      { id: "organ", label: "Brain", text: "Diffuse dysfunction. No single mass." },
      { id: "cut", label: "Cut surface", text: "Almost normal to the eye. The failure is functional." },
      { id: "cells", label: "Barrier", text: "Junctions open. Microglia activate. Firing slows." }
    ]},
    { id: "shock", title: "Septic shock", organ: "vessel", mode: "shock", glb: "", reversible: 0.8, textures: { healthy: "tex/lung-healthy.jpg", diseased: "tex/lung-ards.jpg" }, views: [
      { id: "organ", label: "Vessels", text: "Dilated, slow, leaking." },
      { id: "cut", label: "Cut surface", text: "Wet tissue, wide capillaries." },
      { id: "cells", label: "Endothelium", text: "Glycocalyx shed, muscle relaxed." }
    ]}
  ];

  function buildLung(mat, lowerMat) {
    const g = new THREE.Group();
    const lobes = [
      [mat, 0.78, 0.7, 0.58, -0.95, 0.45, 0.05, 0.2],
      [lowerMat, 0.84, 0.78, 0.62, -0.85, -0.55, -0.02, 0.4],
      [mat, 0.72, 0.62, 0.55, 0.95, 0.62, 0.08, 1.2],
      [mat, 0.48, 0.38, 0.4, 0.72, 0.05, 0.28, 2.1],
      [lowerMat, 0.8, 0.74, 0.6, 0.9, -0.58, 0.02, 3.3]
    ];
    lobes.forEach((L, i) => {
      const m = new THREE.Mesh(organic(48, 0.07, L[7]), L[0]);
      m.scale.set(L[1], L[2], L[3]);
      m.position.set(L[4], L[5], L[6]);
      tag(m, i < 2 ? "Left lung" : "Right lung", "Injury is patchy. Dependent regions flood and collapse first, leaving a small aerated lung.", "Low tidal volume and prone positioning protect it.");
      g.add(m);
    });
    const air = wet(0xf0e6dc, { roughness: 0.48, clearcoat: 0.25 });
    const trachea = tube([V(0, 1.55, 0.1), V(0, 0.85, 0.05)], 0.11, air, 12);
    tag(trachea, "Airway", "Air still moves. The failure is alveolar flooding, not a blocked bronchus.", "Keep the airway and limit the tidal volume.");
    g.add(trachea);
    g.add(tube([V(0, 0.85, 0.05), V(-0.55, 0.35, 0.05), V(-0.9, -0.05, 0)], 0.07, air, 16));
    g.add(tube([V(0, 0.85, 0.05), V(0.55, 0.4, 0.08), V(0.95, 0.05, 0.05)], 0.07, air, 16));
    for (let i = 0; i < 7; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 6, 14), air);
      ring.position.set(0, 1.45 - i * 0.09, 0.1);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }
    return g;
  }

  function buildKidney(mat) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 64, 48);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.hypot(x, y, z) || 1;
      x /= n; y /= n; z /= n;
      const hil = Math.exp(-(y * y) / 0.15 - (z * z) / 0.22);
      x = x * 0.8 - (x > 0 ? 0.36 * hil : 0);
      y *= 1.25; z *= 0.58;
      const d = fbm(x * 2.4 + 2, y * 2.4, z * 2.4);
      const r = 1 + 0.04 * (d * 2 - 1);
      p.setXYZ(i, x * r, y * r, z * r);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    tag(mesh, "Kidney", "Sepsis injures tubules and the microcirculation. The organ swells and the cortex pales.", "Keep the perfusion pressure. Stop nephrotoxins. Dose-adjust drugs.");
    g.add(mesh);
    const ves = wet(0x6e2430, { roughness: 0.35 });
    g.add(tube([V(0.72, 0.05, 0.05), V(1.25, 0.15, 0.1)], 0.06, ves, 8));
    g.add(tube([V(0.7, -0.08, 0), V(1.2, -0.2, 0.05)], 0.07, wet(0x8a4058), 8));
    const ureter = tube([V(0.55, -0.35, 0), V(0.7, -1.15, 0.05)], 0.045, wet(0xe6d2b8, { roughness: 0.55 }), 8);
    tag(ureter, "Ureter", "Urine flow falls because filtration falls, not because the ureter is blocked.", "Do not chase a post-renal cause unless the story suggests one.");
    g.add(ureter);
    return g;
  }

  function buildHeart(mat) {
    const g = new THREE.Group();
    const pts = [[0.02, -1.28], [0.32, -1.2], [0.62, -0.9], [0.9, -0.4], [1.02, 0.1], [0.92, 0.5], [0.66, 0.9], [0.34, 1.12], [0.08, 1.18]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(pts, 48);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = fbm(x * 1.8, y * 1.8 + 1, z * 1.8);
      p.setXYZ(i, x * (1 + 0.03 * (d - 0.5)), y, z * (1 + 0.03 * (d - 0.5)));
    }
    geo.computeVertexNormals();
    const heart = new THREE.Mesh(geo, mat);
    heart.scale.set(0.85, 0.85, 0.68);
    tag(heart, "Left ventricle", "Dilates and ejects less in septic cardiomyopathy. The ejection fraction often recovers within 7 to 10 days.", "Dobutamine or levosimendan only if output stays low after the pressure is restored.");
    g.add(heart);
    g.userData.heart = heart;
    const aorta = tube([V(0.15, 0.95, 0), V(0.15, 1.35, 0.05), V(-0.15, 1.6, 0.1)], 0.13, wet(0xc46a6a, { roughness: 0.32 }), 14);
    tag(aorta, "Aorta", "Forward flow falls as the ventricle empties poorly.", "Treat the shock. The ventricle is usually stunned, not infarcted.");
    g.add(aorta);
    g.add(tube([V(-0.2, 0.85, 0.15), V(-0.45, 1.15, 0.25)], 0.1, wet(0x9a3a48), 8));
    const fat = wet(0xe6d7b0, { roughness: 0.72, clearcoat: 0.15 });
    const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), fat);
    f1.position.set(0.35, 0.7, 0.42); f1.scale.set(1.4, 0.6, 0.7); g.add(f1);
    return g;
  }

  function buildLiver(mat) {
    const g = new THREE.Group();
    const right = new THREE.Mesh(organic(48, 0.05, 1), mat);
    right.scale.set(1.15, 0.78, 0.62);
    right.position.set(0.35, 0, 0);
    tag(right, "Right lobe", "The liver enlarges. Sepsis causes cholestasis, steatosis and, in shock, hypoxic necrosis.", "Restore perfusion and remove the source. Stop hepatotoxic drugs.");
    g.add(right);
    const left = new THREE.Mesh(organic(40, 0.05, 4), mat);
    left.scale.set(0.62, 0.55, 0.48);
    left.position.set(-0.85, 0.12, 0.05);
    tag(left, "Left lobe", "Both lobes are involved. There is no focal abscess unless a source says so.", "Follow glucose, INR and lactate, not only bilirubin.");
    g.add(left);
    const gb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), wet(0x6d7a45, { roughness: 0.28, clearcoat: 0.7 }));
    gb.scale.set(0.7, 1.3, 0.7);
    gb.position.set(0.15, -0.62, 0.38);
    tag(gb, "Gallbladder", "Acalculous cholecystitis can accompany severe sepsis, but cholestasis alone does not mean a blocked duct.", "Image only if the clinical picture suggests biliary sepsis.");
    g.add(gb);
    return g;
  }

  function buildBrain(mat) {
    const g = new THREE.Group();
    function hemi(sign) {
      const geo = new THREE.IcosahedronGeometry(1, 4);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const nrm = Math.hypot(x, y, z) || 1;
        x /= nrm; y /= nrm; z /= nrm;
        const sul = Math.abs(fbm(x * 5.5 + sign, y * 5.5, z * 5.5) * 2 - 1);
        const r = 1 + 0.055 * sul - 0.02;
        x *= r; y *= r; z *= r;
        if (sign * x < 0.06) x = sign * 0.06;
        if (y < -0.25) y = -0.25 + (y + 0.25) * 0.35;
        p.setXYZ(i, x, y, z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(0.78, 0.62, 0.7);
      m.position.set(sign * 0.72, 0.15, 0);
      tag(m, sign < 0 ? "Left hemisphere" : "Right hemisphere", "Sepsis disturbs the whole brain. There is no focal lesion to evacuate.", "Restore pressure and oxygen. Exclude sedatives, metabolic causes, seizure and stroke.");
      return m;
    }
    g.add(hemi(-1), hemi(1));
    const cere = new THREE.Mesh(organic(32, 0.1, 8), mat);
    cere.scale.set(0.7, 0.38, 0.48);
    cere.position.set(0, -0.48, -0.42);
    tag(cere, "Cerebellum", "It shares the same diffuse process. A structural cause is still in the differential if the signs are focal.", "Image when the examination is focal, sudden, or not explained by sepsis.");
    g.add(cere);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.45, 16), mat);
    stem.position.set(0, -0.55, -0.15);
    g.add(stem);
    return g;
  }

  function buildVessel(mat, mode) {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(organic(40, 0.04, 3), mat);
    slab.scale.set(1.7, 1.15, 0.55);
    tag(slab, mode === "dic" ? "Microcirculation" : "Tissue bed", mode === "dic"
      ? "Fibrin-platelet thrombi block flow while consumption of platelets and factors causes bleeding elsewhere."
      : "Arterioles dilate and leak. Organs are underfilled even when the patient looks oedematous.",
      mode === "dic" ? "Treat the cause. Give blood products for bleeding or a procedure, not for a number alone."
        : "Noradrenaline restores the pressure. Give fluid only while the circulation still responds.");
    g.add(slab);
    const vesselMat = wet(0x7a2432, { roughness: 0.32, transparent: true, opacity: 0.92 });
    const paths = [];
    function branch(a, dir, len, rad, depth) {
      const b = a.clone().addScaledVector(dir, len);
      const mesh = tube([a, b], rad, vesselMat, 10);
      mesh.userData.base = rad;
      g.add(mesh);
      g.userData.vessels = g.userData.vessels || [];
      g.userData.vessels.push(mesh);
      paths.push({ a, b });
      if (depth <= 0) return;
      [-1, 1].forEach((sg) => {
        const n = dir.clone().applyAxisAngle(V(0, 0, 1), sg * 0.55).applyAxisAngle(V(1, 0, 0), sg * 0.4);
        n.normalize();
        branch(b, n, len * 0.68, rad * 0.68, depth - 1);
      });
    }
    branch(V(-1.3, 0.1, 0.42), V(1, 0.05, 0).normalize(), 0.7, 0.07, 3);
    const fibrinMat = wet(0xf0e2c4, { roughness: 0.6, transparent: true, opacity: 0.0 });
    const fibrins = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), fibrinMat);
      m.position.set((Math.random() - 0.2) * 1.4, (Math.random() - 0.5) * 0.9, 0.48);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      tag(m, "Fibrin", "Thrombin polymerises fibrinogen into strands that trap platelets.", "Source control is the treatment. Tranexamic acid can worsen the thrombi.");
      g.add(m); fibrins.push(m);
    }
    g.userData.fibrinMat = fibrinMat;
    g.userData.fibrins = fibrins;
    g.userData.mode = mode;
    g.userData.paths = paths;
    return g;
  }

  function buildAlveolus() {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 36), wet(0xf2cfc6, { roughness: 0.46, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    tag(wall, "Alveolar epithelium", "Type I cells cover most of the surface. Their junctions open and fluid clearance fails.", "Dexamethasone may help in moderate to severe ARDS. Surfactant replacement failed in adults.");
    g.add(wall);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.14, 12, 40), wet(0x8d3140, { transparent: true, opacity: 0.45, roughness: 0.25, depthWrite: false }));
    cap.rotation.x = Math.PI / 2.4;
    tag(cap, "Capillary", "The endothelium loses its glycocalyx and leaks protein-rich plasma.", "Vasopressors do not seal the leak. Treat the source and avoid fluid overload.");
    g.add(cap);
    const rbc = rbcGeo();
    const reds = new THREE.InstancedMesh(rbc, wet(0x9a1d2c, { roughness: 0.28, clearcoat: 0.4 }), 28);
    g.add(reds);
    g.userData.reds = reds;
    const t2 = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), wet(0xf7e2b0, { roughness: 0.4, clearcoat: 0.35 }));
      const a = i / 6 * Math.PI * 2;
      c.position.set(Math.cos(a) * 0.16, 0.72, Math.sin(a) * 0.16);
      t2.add(c);
    }
    tag(t2.children[0], "Type II cell", "These cells make surfactant and repair the wall. They fail as injury deepens.", "PEEP keeps units open. There is no surfactant drug that works in adult ARDS.");
    g.add(t2);
    const surf = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), wet(0xf3f0d8, { roughness: 0.2 }));
      const th = Math.random() * Math.PI, ph = Math.random() * Math.PI * 2;
      s.position.set(Math.sin(th) * Math.cos(ph) * 1.05, Math.cos(th) * 1.05, Math.sin(th) * Math.sin(ph) * 1.05);
      g.add(s); surf.push(s);
    }
    g.userData.surf = surf;
    const fluid = new THREE.Mesh(new THREE.SphereGeometry(1.18, 36, 28), wet(0xd9d0c2, { transparent: true, opacity: 0.0, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide }));
    fluid.material.clippingPlanes = [new THREE.Plane(V(0, -1, 0), 0)];
    tag(fluid, "Oedema fluid", "Protein-rich, unlike cardiogenic oedema. Epithelial pumps that clear it are impaired.", "A conservative fluid balance lowers lung water.");
    g.add(fluid);
    g.userData.fluid = fluid;
    const hy = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 24), wet(0xe7b7c6, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, roughness: 0.55 }));
    tag(hy, "Hyaline membrane", "Fibrin, dead cells and plasma protein lining the alveolus. Hallmark of diffuse alveolar damage.", "No drug dissolves it. Protect the lung and wait.");
    g.add(hy);
    g.userData.hy = hy;
    const neu = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), wet(0xf4e4c4, { roughness: 0.45 }));
    neu.add(body);
    for (let i = 0; i < 3; i++) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), wet(0x6a4a8a, { roughness: 0.4 }));
      n.position.set((i - 1) * 0.07, 0.04, 0.06);
      neu.add(n);
    }
    tag(body, "Neutrophil", "Neutrophils damage endothelium and epithelium. They are how indirect sepsis reaches the lung.", "Steroids dampen this. They do not replace lung-protective ventilation.");
    g.add(neu);
    g.userData.neu = neu;
    return g;
  }

  function buildTubule() {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([V(-1.3, 0.35, 0), V(-0.4, 0.1, 0.15), V(0.4, -0.05, -0.1), V(1.25, -0.25, 0.05)]);
    const wall = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.38, 14, false), wet(0xf0c8bc, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.42 }));
    tag(wall, "Proximal tubule", "The first cells to suffer. Filtrate slows, then debris blocks the lumen.", "Noradrenaline to a MAP of 65 or more. Stop NSAIDs and other nephrotoxins.");
    g.add(wall);
    const cells = [], brushes = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.08 + i / 10;
      const p = curve.getPointAt(t);
      const cell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), wet(0xf6d2c4, { roughness: 0.48 }));
      cell.position.copy(p);
      cell.userData.home = p.clone();
      tag(cell, "Tubular cell", "Brush border is lost, mitochondria swell, and the cell may slough off still alive.", "Injury at this stage can still recover if perfusion is restored and toxins stop.");
      g.add(cell); cells.push(cell);
      for (let k = 0; k < 5; k++) {
        const br = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.16, 5), wet(0xf8e7c8, { roughness: 0.5 }));
        br.position.copy(p);
        br.userData.home = p.clone();
        g.add(br); brushes.push(br);
      }
    }
    const casts = [];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), wet(0x8a6a48, { roughness: 0.7 }));
      c.scale.set(1.8, 0.7, 0.7);
      c.position.copy(curve.getPointAt(0.3 + i * 0.15));
      tag(c, "Cast", "Dead cells and protein debris obstruct the tubule and filtrate back-leaks.", "There is no drug that clears casts. Support the patient while the epithelium repairs.");
      g.add(c); casts.push(c);
    }
    const mitos = [];
    const focus = cells[3];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), wet(0xc45a32, { roughness: 0.4 }));
      m.position.copy(focus.position).add(V((i - 2) * 0.04, 0.02, 0.05));
      g.add(m); mitos.push(m);
    }
    g.userData.cells = cells; g.userData.brushes = brushes; g.userData.casts = casts; g.userData.mitos = mitos; g.userData.curve = curve;
    return g;
  }

  function buildMyocyte() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 24), wet(0xc45260, { roughness: 0.46, clearcoat: 0.35 }));
    body.rotation.z = Math.PI / 2;
    tag(body, "Cardiomyocyte", "Cytokines and nitric oxide depress the response to calcium. The cell is energy-starved, not necrotic.", "The ventricle usually recovers. Inotropes are for persistent low output, not for the ejection fraction alone.");
    g.add(body);
    [-1.1, 1.1].forEach((x) => {
      const end = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), body.material);
      end.position.x = x;
      g.add(end);
    });
    const bands = [];
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.06, 16), wet(i % 2 ? 0x9a3040 : 0xe0a0a4, { roughness: 0.4 }));
      b.rotation.z = Math.PI / 2;
      b.position.x = -1.15 + i * 0.18;
      g.add(b); bands.push(b);
    }
    const mitos = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), wet(0xd06a40, { roughness: 0.35 }));
      m.scale.set(1.6, 0.7, 0.7);
      m.position.set(-1 + i * 0.28, 0.22, 0.12);
      tag(m, "Mitochondrion", "Swells and dims as oxygen use fails. This is reversible stunning.", "Fix the shock. There is no mitochondrial drug in routine use.");
      g.add(m); mitos.push(m);
    }
    const rec = [];
    for (let i = 0; i < 18; i++) {
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), wet(0xf2e2a0, { roughness: 0.3 }));
      const a = i / 18 * Math.PI * 2;
      r.position.set(-1.1 + (i % 9) * 0.26, Math.sin(a) * 0.4, Math.cos(a) * 0.4);
      tag(r, "Beta receptor", "Receptors are pulled off the membrane, so adrenaline has less effect.", "Escalating catecholamines do not restore the missing receptors.");
      g.add(r); rec.push(r);
    }
    g.userData.bands = bands; g.userData.mitos = mitos; g.userData.rec = rec; g.userData.body = body;
    return g;
  }

  function buildHepato() {
    const g = new THREE.Group();
    const cells = [], fats = [];
    const mat = wet(0xc47258, { roughness: 0.42, clearcoat: 0.4 });
    for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 2; iy++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat);
      c.scale.set(1.15, 0.9, 0.85);
      c.position.set((ix - 1.5) * 0.52, (iy - 0.5) * 0.5, 0);
      c.userData.home = c.position.clone();
      tag(c, "Hepatocyte", "Canalicular transporters are down-regulated, so bile salts stay in the blood. Fat accumulates.", "Cholestasis of sepsis reverses when the sepsis does. Necrosis does not.");
      g.add(c); cells.push(c);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), wet(0xf4e7b0, { transparent: true, opacity: 0.2, roughness: 0.15 }));
      f.position.copy(c.position).add(V(0.06, 0.04, 0.08));
      g.add(f); fats.push(f);
    }
    const sin = tube([V(-1.3, 0, 0.32), V(1.3, 0, 0.32)], 0.08, wet(0x7a2432, { transparent: true, opacity: 0.4 }), 16);
    tag(sin, "Sinusoid", "Flow slows in shock. Central cells are the first to necrose when oxygen falls.", "Restoring cardiac output limits hypoxic hepatitis.");
    g.add(sin);
    const reds = new THREE.InstancedMesh(rbcGeo(), wet(0x9a1d2c, { roughness: 0.3 }), 10);
    g.add(reds);
    const dead = cells[5];
    g.userData.cells = cells; g.userData.fats = fats; g.userData.reds = reds; g.userData.dead = dead; g.userData.sin = sin;
    return g;
  }

  function buildBarrier() {
    const g = new THREE.Group();
    const soma = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), wet(0xe6d5cc, { roughness: 0.48, clearcoat: 0.3 }));
    tag(soma, "Neuron", "Firing slows and desynchronises. That is the slow EEG and the delirium. The cell is not destroyed.", "Dexmedetomidine causes less delirium than benzodiazepines.");
    g.add(soma);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), wet(0xcbb4c4, { roughness: 0.4 }));
    g.add(nuc);
    function dendrite(origin, dir, len, rad, depth) {
      const end = origin.clone().addScaledVector(dir, len);
      const m = tube([origin, end], rad, wet(0xe7d4cb, { roughness: 0.5 }), 6);
      g.add(m);
      if (depth <= 0) return;
      [-1, 1].forEach((sg) => {
        const n = dir.clone().applyAxisAngle(V(0, 1, 0), sg * 0.7).applyAxisAngle(V(1, 0, 0), 0.4 * sg);
        dendrite(end, n.normalize(), len * 0.62, rad * 0.65, depth - 1);
      });
    }
    dendrite(V(0.3, 0.2, 0), V(1, 0.3, 0.2).normalize(), 0.55, 0.05, 2);
    dendrite(V(-0.2, 0.3, 0.1), V(-0.6, 0.7, 0.2).normalize(), 0.5, 0.045, 2);
    const cap = tube([V(-0.2, -0.95, 0.3), V(0.9, -0.7, 0.35)], 0.1, wet(0x8a3140, { transparent: true, opacity: 0.55 }), 10);
    tag(cap, "Capillary", "The blood-brain barrier is the wall of this vessel plus the astrocyte end-feet.", "No drug is proven to seal it. Treat the sepsis.");
    g.add(cap);
    const ends = [];
    for (let i = 0; i < 2; i++) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), wet(0xf0e6c8, { transparent: true, opacity: 0.8, roughness: 0.4 }));
      a.scale.set(1.6, 0.45, 1);
      a.position.set(0.1 + i * 0.45, -0.78, 0.42);
      tag(a, "Astrocyte end-foot", "Swells and loosens its hold on the vessel as mediators arrive.", "Correct sodium and glucose. They change how swollen the brain becomes.");
      g.add(a); ends.push(a);
    }
    const bars = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.04), wet(0xf6e7a8, { roughness: 0.35 }));
      b.position.set(-0.05 + i * 0.18, -0.7, 0.48);
      tag(b, "Tight junction", "Cytokines pull the junctions apart. Protein and mediators enter the brain.", "There is no barrier drug. Source control and perfusion come first.");
      g.add(b); bars.push(b);
    }
    const mg = new THREE.Group();
    const mgBody = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), wet(0xd8c4a4, { roughness: 0.5 }));
    mg.add(mgBody);
    const arms = [];
    for (let i = 0; i < 5; i++) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.28, 5), wet(0xd8c4a4, { roughness: 0.5 }));
      const a = i / 5 * Math.PI * 2;
      arm.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0);
      arm.lookAt(arm.position.clone().multiplyScalar(2));
      mg.add(arm); arms.push(arm);
    }
    mg.position.set(-0.85, -0.35, 0.2);
    tag(mgBody, "Microglia", "Resting microglia are ramified. With sepsis they retract processes and become active.", "This is inflammatory signalling, not a primary brain infection.");
    g.add(mg);
    const pulses = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), wet(0xf4f0c8, { emissive: 0x887844, emissiveIntensity: 0.4 }));
      g.add(p); pulses.push(p);
    }
    g.userData.ends = ends; g.userData.bars = bars; g.userData.arms = arms; g.userData.mg = mg; g.userData.pulses = pulses;
    return g;
  }

  function buildCapillaryClose(mode) {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 28, 1, true), wet(0xf0c9c4, { side: THREE.DoubleSide, transparent: true, opacity: 0.55, roughness: 0.4 }));
    wall.rotation.z = Math.PI / 2;
    tag(wall, "Endothelium", "A single cell layer. In shock it leaks. In DIC it displays tissue factor.", mode === "dic"
      ? "Monocytes and endothelium start the thrombin burst."
      : "Nitric oxide relaxes the muscle and opens junctions.");
    g.add(wall);
    const muscle = [];
    for (let i = 0; i < 7; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 20), wet(0xc46a62, { roughness: 0.5 }));
      r.position.x = -1 + i * 0.32;
      g.add(r); muscle.push(r);
    }
    const hairs = [];
    for (let i = 0; i < 20; i++) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), wet(0xf8e7c0, { roughness: 0.4 }));
      const a = i / 20 * Math.PI * 2;
      h.position.set((i % 5) * 0.3 - 0.6, Math.cos(a) * 0.5, Math.sin(a) * 0.5);
      g.add(h); hairs.push(h);
    }
    const reds = new THREE.InstancedMesh(rbcGeo(), wet(0x9a1d2c, { roughness: 0.28 }), 16);
    g.add(reds);
    const fibrin = [];
    const fMat = wet(0xf3e6c8, { transparent: true, opacity: 0, roughness: 0.55 });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5), fMat);
      m.position.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
      m.rotation.set(Math.random() * 2, Math.random(), Math.random());
      tag(m, "Fibrin strand", "Cross-linked fibrin is the mesh of the microthrombus.", "Heparin reduces thrombin but raises bleeding. Use it only when bleeding is not the problem.");
      g.add(m); fibrin.push(m);
    }
    g.userData.mode = mode; g.userData.muscle = muscle; g.userData.hairs = hairs; g.userData.reds = reds; g.userData.fibrin = fibrin; g.userData.fMat = fMat; g.userData.wall = wall;
    return g;
  }

  function studioEnv(renderer) {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 64;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, "#e7eef3");
    grd.addColorStop(0.45, "#8ea4b4");
    grd.addColorStop(1, "#1a140f");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture;
    pm.dispose();
    return env;
  }

  /* Plugin organs: PathStage.register(name, { gross(kit, mat, spec), cells(kit, spec), apply(kit, entry, sev, nec, t, extra) }).
     A complication whose "organ" is a registered name is drawn by the plugin; the stage, views, clip plane and picking are shared. */
  const EXTRA = {};
  const KIT = { THREE, V, wet, organic, tube, tag, fbm, noise3, clamp, tissueMaterial, rbcGeo, buildCapillaryClose, buildVessel };

  function mount(container, hooks) {
    hooks = hooks || {};
    container.style.position = "relative";
    container.style.touchAction = "none";
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x070b10);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.localClippingEnabled = true;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    container.appendChild(renderer.domElement);

    const tagEl = document.createElement("div");
    tagEl.style.cssText = hooks.onLabel
      ? "position:absolute;right:8px;top:8px;color:#f3efe6;background:rgba(8,14,20,.72);border:1px solid rgba(243,239,230,.28);border-radius:999px;padding:6px 10px;font:600 12px/1 Figtree,sans-serif;z-index:2;pointer-events:none"
      : "position:absolute;left:10px;right:10px;bottom:8px;color:#f3efe6;font:600 13px/1.35 Figtree,Segoe UI,sans-serif;text-shadow:0 1px 4px #000;pointer-events:none;z-index:2";
    container.appendChild(tagEl);
    const bar = document.createElement("div");
    bar.style.cssText = "position:absolute;left:8px;top:8px;display:flex;gap:6px;z-index:3;flex-wrap:wrap";
    container.appendChild(bar);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b10);
    scene.fog = new THREE.Fog(0x070b10, 7.5, 16);
    try { scene.environment = studioEnv(renderer); } catch (e) { /* reflections are optional */ }
    scene.add(new THREE.HemisphereLight(0xd5e2ea, 0x2a211c, 0.55));
    const key = new THREE.DirectionalLight(0xfff3e6, 1.25);
    key.position.set(4, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd4e2, 0.55);
    rim.position.set(-5, 2, -4); scene.add(rim);
    const fill = new THREE.DirectionalLight(0xe7c39a, 0.28);
    fill.position.set(-2, 1, 4); scene.add(fill);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.92, metalness: 0.08 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1.35; scene.add(ground);

    const cam = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
    const clip = new THREE.Plane(V(1, 0, 0), 100);
    const texCache = {};
    function tex(url) { if (!texCache[url]) texCache[url] = loadTex(url); return texCache[url]; }

    const models = {};
    function ensure(spec) {
      if (models[spec.id]) return models[spec.id];
      const healthy = tex(spec.textures.healthy);
      const sick = tex(spec.textures.diseased);
      const mat = tissueMaterial(healthy, sick, spec.organ === "brain" ? 0.55 : 0.78);
      mat.clippingPlanes = [clip];
      let lower = mat;
      if (spec.organ === "lung") {
        lower = tissueMaterial(healthy, sick, 0.78);
        lower.clippingPlanes = [clip];
      }
      const root = new THREE.Group();
      let organ;
      if (spec.organ === "lung") organ = buildLung(mat, lower);
      else if (spec.organ === "kidney") organ = buildKidney(mat);
      else if (spec.organ === "heart") organ = buildHeart(mat);
      else if (spec.organ === "liver") organ = buildLiver(mat);
      else if (spec.organ === "brain") organ = buildBrain(mat);
      else if (EXTRA[spec.organ]) organ = EXTRA[spec.organ].gross(KIT, mat, spec);
      else organ = buildVessel(mat, spec.mode || "dic");
      organ.traverse((o) => { if (o.isMesh && o.material && o.material.clippingPlanes == null && o.material === mat) o.material.clippingPlanes = [clip]; });
      root.add(organ);
      let cells;
      if (spec.organ === "lung") cells = buildAlveolus();
      else if (spec.organ === "kidney") cells = buildTubule();
      else if (spec.organ === "heart") cells = buildMyocyte();
      else if (spec.organ === "liver") cells = buildHepato();
      else if (spec.organ === "brain") cells = buildBarrier();
      else if (EXTRA[spec.organ]) cells = EXTRA[spec.organ].cells(KIT, spec);
      else cells = buildCapillaryClose(spec.mode || "dic");
      cells.visible = false;
      root.add(cells);
      const capMesh = new THREE.Mesh(new THREE.CircleGeometry(spec.capR || 1.45, 48), tissueMaterial(healthy, sick, spec.capScale || 1.1));
      capMesh.rotation.y = Math.PI / 2;
      capMesh.position.x = 0.02;
      capMesh.visible = false;
      root.add(capMesh);
      root.visible = false;
      scene.add(root);
      const entry = { spec, root, organ, cells, capMesh, mat, lower, peak: 0 };
      models[spec.id] = entry;
      if (spec.glb) loadGlb(entry, spec.glb);
      return entry;
    }

    function loadGlb(entry, url) {
      function go() {
        const loader = new THREE.GLTFLoader();
        loader.load(url, (gltf) => {
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = new THREE.Vector3(); box.getSize(size);
          const s = 2.2 / Math.max(size.x, size.y, size.z, 0.001);
          gltf.scene.scale.setScalar(s);
          const center = new THREE.Vector3(); box.getCenter(center);
          gltf.scene.position.sub(center.multiplyScalar(s));
          entry.organ.visible = false;
          entry.root.add(gltf.scene);
          entry.glb = gltf.scene;
        });
      }
      if (THREE.GLTFLoader) go();
      else {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
        s.onload = go;
        document.head.appendChild(s);
      }
    }

    let catalog = CATALOG.slice();
    (hooks.catalog || []).forEach((spec) => { const i = catalog.findIndex((c) => c.id === spec.id); if (i >= 0) catalog[i] = spec; else catalog.push(spec); });
    if (!hooks.lazy) catalog.forEach(ensure);
    (hooks.modelsUrl === false ? Promise.reject() : fetch(hooks.modelsUrl || "pathology-models.json").then((r) => r.json())).then((data) => {
      if (!data || !data.complications) return;
      data.complications.forEach((spec) => {
        const i = catalog.findIndex((c) => c.id === spec.id);
        if (i >= 0) catalog[i] = Object.assign({}, catalog[i], spec);
        else catalog.push(spec);
        if (models[spec.id]) {
          models[spec.id].spec = catalog.find((c) => c.id === spec.id);
          if (spec.glb && !models[spec.id].glb) loadGlb(models[spec.id], spec.glb);
        } else if (!hooks.lazy) ensure(catalog.find((c) => c.id === spec.id));
      });
    }).catch(() => {});

    let id = hooks.start || "ards", view = "organ", severity = 0.45, shown = 0.45, mode = "live", playing = false, playT = 0;
    let yaw = 0.55, pit = 0.25, dist = 4.4, distGoal = 4.4, target = V(0, 0.05, 0);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dragging = false;

    function buttons() {
      const spec = catalog.find((c) => c.id === id) || catalog[0];
      bar.innerHTML = "";
      [["live", "Live"], ["normal", "Normal"], ["diseased", "Diseased"], ["play", playing ? "Pause" : "Play"]].forEach(([k, label]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.style.cssText = "min-height:32px;padding:0 10px;border-radius:999px;border:1px solid rgba(243,239,230,.28);background:rgba(8,14,20,.72);color:#f3efe6;font:600 12px/1 Figtree,sans-serif";
        if (k === mode || (k === "play" && playing)) b.style.borderColor = "#7fd4e6";
        b.onpointerdown = (e) => e.stopPropagation();
        b.onclick = (e) => {
          e.stopPropagation();
          if (k === "play") { playing = !playing; playT = 0; }
          else { mode = k; playing = false; }
          buttons();
        };
        bar.appendChild(b);
      });
      const v = (spec.views || []).find((x) => x.id === view) || spec.views[0];
      const state = mode === "normal" ? "Normal tissue" : mode === "diseased" ? "Established disease" : "Progression " + Math.round(shown * 100) + "%";
      tagEl.textContent = state;
      if (hooks.onLabel) hooks.onLabel("<b>" + (v ? v.label : spec.title) + "</b>" + (v ? v.text : ""));
      else tagEl.innerHTML = "<b>" + spec.title + " · " + (v ? v.label : "") + "</b><br>" + state + (v && v.text ? " — " + v.text : "");
    }

    function applyDisease(entry, sev, nec, t, extra) {
      extra = extra || {};
      entry.mat.userData.uMix.value = clamp(entry.spec.organ === "lung" ? sev * 0.75 : sev);
      if (entry.lower && entry.lower !== entry.mat) entry.lower.userData.uMix.value = clamp(sev * 1.15);
      if (entry.spec.grow) entry.root.scale.setScalar(1 + entry.spec.grow * sev);
      if (EXTRA[entry.spec.organ]) { entry.mat.userData.uMix.value = clamp(sev); if (entry.capMesh && entry.capMesh.material.userData.uMix) entry.capMesh.material.userData.uMix.value = sev; EXTRA[entry.spec.organ].apply(KIT, entry, sev, nec, t, extra || {}); return; }
      if (entry.capMesh && entry.capMesh.material.userData.uMix) entry.capMesh.material.userData.uMix.value = sev;
      const organ = entry.organ;
      if (entry.spec.organ === "lung") {
        const breathe = calm ? 1 : 1 + Math.sin(t * 1.3) * (0.012 + 0.02 * (1 - sev));
        organ.scale.setScalar(breathe * (1 + 0.04 * sev));
        const alv = entry.cells;
        if (alv.userData.fluid) {
          const fill = extra.fill != null ? extra.fill : sev * 0.85;
          alv.userData.fluid.material.opacity = 0.15 + 0.5 * fill;
          alv.userData.fluid.material.clippingPlanes[0].constant = -1.1 + 2.2 * fill;
        }
        if (alv.userData.hy) alv.userData.hy.material.opacity = 0.75 * nec;
        (alv.userData.surf || []).forEach((s, i) => { s.visible = i < Math.round(16 * (1 - sev)); });
        if (alv.userData.neu && !calm) alv.userData.neu.position.set(Math.sin(t * 0.4) * 0.4, -0.2 + sev * 0.3, Math.cos(t * 0.3) * 0.3);
        if (alv.userData.reds) spinReds(alv.userData.reds, 28, 0.82, t * (0.35 + (1 - sev)), 0.12);
      } else if (entry.spec.organ === "kidney") {
        organ.scale.setScalar(1 + 0.1 * sev);
        const tb = entry.cells;
        (tb.userData.cells || []).forEach((c, i) => {
          const fall = i > 6 ? nec : 0;
          c.position.copy(c.userData.home).add(V(0, -0.22 * fall, 0));
          c.scale.setScalar(1 + 0.25 * sev * (i % 3 === 0 ? 1 : 0.4));
        });
        (tb.userData.brushes || []).forEach((b) => { b.scale.set(1, Math.max(0.05, 1 - sev * 0.9), 1); });
        (tb.userData.casts || []).forEach((c, i) => { c.visible = nec > i / 5; });
        (tb.userData.mitos || []).forEach((m) => { m.scale.setScalar(1 + 1.4 * sev); });
      } else if (entry.spec.organ === "heart") {
        const beat = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * (extra.hr ? extra.hr / 60 * 2 : 1.6));
        const dil = 1 + 0.22 * sev;
        const contract = extra.ef != null ? clamp(extra.ef / 62) : (1 - 0.55 * sev);
        if (organ.userData.heart) organ.userData.heart.scale.set(0.85 * dil * (1 - 0.08 * contract * beat), 0.85 * dil, 0.68 * dil * (1 - 0.08 * contract * beat));
        const my = entry.cells;
        my.scale.set(1 - 0.14 * contract * beat, 1, 1);
        (my.userData.mitos || []).forEach((m) => m.scale.set(1.6 + sev, 0.7 + sev * 0.8, 0.7 + sev * 0.5));
        (my.userData.rec || []).forEach((r, i) => { r.visible = i < Math.round(18 * (1 - sev * 0.75)); });
      } else if (entry.spec.organ === "liver") {
        organ.scale.setScalar(1 + 0.12 * sev);
        const hp = entry.cells;
        (hp.userData.fats || []).forEach((f) => { f.scale.setScalar(0.4 + sev * 1.8); f.material.opacity = 0.25 + sev * 0.65; });
        if (hp.userData.dead) {
          hp.userData.dead.scale.setScalar(1 - 0.45 * nec);
          hp.userData.dead.material.color.setHex(nec > 0.4 ? 0x6a4038 : 0xc47258);
        }
        if (hp.userData.reds) spinReds(hp.userData.reds, 10, 1.1, t * (0.5 * (1 - sev * 0.7)), 0.05);
      } else if (entry.spec.organ === "brain") {
        const flat = 1 - 0.06 * sev;
        organ.scale.set(1, flat, 1);
        const br = entry.cells;
        (br.userData.bars || []).forEach((b, i) => { b.position.x = -0.05 + i * 0.18 + (i - 2) * 0.05 * sev; });
        (br.userData.ends || []).forEach((a) => a.scale.set(1.6 + sev, 0.45 + sev * 0.8, 1 + sev * 0.4));
        (br.userData.arms || []).forEach((arm) => { arm.scale.y = Math.max(0.15, 1 - sev * 0.85); });
        if (br.userData.mg) br.userData.mg.scale.setScalar(1 + 0.45 * sev);
        (br.userData.pulses || []).forEach((p, i) => {
          const u = calm ? 0.3 : (t * (0.25 + (1 - sev)) + i / 6) % 1;
          p.position.set(-0.2 + u * 1.3, 0.15, 0);
          p.visible = u < (1 - sev * 0.7);
        });
      } else {
        const shock = entry.spec.mode === "shock";
        if (organ.userData.fibrinMat) organ.userData.fibrinMat.opacity = shock ? 0 : 0.85 * nec;
        const cell = entry.cells;
        if (cell.userData.muscle) cell.userData.muscle.forEach((r) => r.scale.setScalar(shock ? 1 + 0.45 * sev : 1));
        if (cell.userData.hairs) cell.userData.hairs.forEach((h) => h.scale.y = Math.max(0.15, 1 - sev));
        if (cell.userData.fMat) cell.userData.fMat.opacity = shock ? 0 : 0.9 * nec;
        if (cell.userData.reds) spinReds(cell.userData.reds, 16, 0.9, t * (shock ? 0.25 * (1 - sev) : 0.15 * (1 - nec)), 0);
        entry.mat.userData.uMix.value = shock ? sev * 0.45 : sev;
      }
    }

    const dummy = new THREE.Object3D();
    function spinReds(mesh, n, radius, time, y0) {
      for (let i = 0; i < n; i++) {
        const u = (time + i / n) % 1;
        const a = u * Math.PI * 2;
        dummy.position.set(Math.cos(a) * radius, (y0 || 0) + Math.sin(u * Math.PI * 2) * 0.05, Math.sin(a) * radius * 0.35);
        dummy.rotation.set(0, a, Math.PI / 2);
        dummy.scale.set(0.22, 0.22, 0.22);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    function frameDist() {
      const sp = (models[id] && models[id].spec) || {};
      if (sp.dist && sp.dist[view]) return sp.dist[view];
      if (view === "cells") return 2.45;
      if (view === "cut") return 3.8;
      if (id === "ards") return 4.6;
      if (id === "brain" || id === "enceph") return 3.8;
      return 4.1;
    }

    function apply() {
      const entry = models[id] || ensure(catalog.find((c) => c.id === id) || catalog[0]);
      Object.keys(models).forEach((k) => { models[k].root.visible = k === entry.spec.id; });
      const targetSev = mode === "normal" ? 0 : mode === "diseased" ? 1 : severity;
      entry.view = view;
      entry.organ.visible = view !== "cells";
      entry.cells.visible = view === "cells";
      entry.capMesh.visible = view === "cut";
      clip.constant = view === "cut" ? 0.02 : 80;
      buttons();
      return { entry, targetSev };
    }

    let extra = {};
    let current = apply();

    const ptr = new Map();
    const down = { x: 0, y: 0, moved: false };
    renderer.domElement.addEventListener("pointerdown", (e) => {
      renderer.domElement.setPointerCapture(e.pointerId);
      ptr.set(e.pointerId, [e.clientX, e.clientY]);
      down.x = e.clientX; down.y = e.clientY; down.moved = false;
      dragging = true;
    });
    renderer.domElement.addEventListener("pointermove", (e) => {
      const o = ptr.get(e.pointerId); if (!o) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
      if (ptr.size === 1) {
        yaw -= (e.clientX - o[0]) * 0.008;
        pit = clamp(pit + (e.clientY - o[1]) * 0.008, -0.6, 1.2);
      } else if (ptr.size === 2) {
        const q = [...ptr.entries()].find(([k]) => k !== e.pointerId)[1];
        const before = Math.hypot(o[0] - q[0], o[1] - q[1]);
        const after = Math.hypot(e.clientX - q[0], e.clientY - q[1]);
        if (before > 0) { distGoal = clamp(distGoal * (before / after), 1.4, 9); dist = distGoal; }
      }
      ptr.set(e.pointerId, [e.clientX, e.clientY]);
    });
    function up(e) { ptr.delete(e.pointerId); if (ptr.size === 0) dragging = false; }
    renderer.domElement.addEventListener("pointerup", (e) => {
      up(e);
      if (down.moved || !hooks.onPick) return;
      const r = renderer.domElement.getBoundingClientRect();
      const ndc = { x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height * 2 - 1) };
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, cam);
      const hits = ray.intersectObjects(scene.children, true).filter((h) => h.object.userData && h.object.userData.pick);
      if (hits[0]) {
        let pk = hits[0].object.userData.pick;
        /* Per-complication wording: spec.picks[title] wins, then "*" (gross views) or "**" (cell view). */
        const sp = (models[id] && models[id].spec) || {};
        if (sp.picks) {
          const o = sp.picks[pk.title] || sp.picks[view === "cells" ? "**" : "*"];
          if (o) pk = { title: o.title || pk.title, body: o.body || pk.body, care: o.care != null ? o.care : pk.care };
        }
        hooks.onPick(pk);
      }
    });
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("wheel", (e) => { e.preventDefault(); distGoal = clamp(distGoal * (1 + e.deltaY * 0.001), 1.4, 9); }, { passive: false });

    function resize() {
      const w = container.clientWidth || 320, h = container.clientHeight || 240;
      renderer.setSize(w, h, false);
      cam.aspect = w / Math.max(1, h);
      cam.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize); ro.observe(container); resize();

    const clock = new THREE.Clock();
    const tickState = { id: "", view: "" };
    let dead = false;
    function tick() {
      if (dead) return;
      requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const entry = current.entry;
      if (entry.spec.id !== tickState.id || view !== tickState.view) {
        distGoal = frameDist();
        if (view === "cut") { yaw = Math.PI / 2; pit = 0.08; }
        if (view === "cells") { yaw = 0.5; pit = 0.18; }
        tickState.id = entry.spec.id;
        tickState.view = view;
      }
      dist += (distGoal - dist) * (1 - Math.exp(-dt * 3));
      if (!dragging && !calm && view === "organ") yaw += dt * 0.18;
      let targetSev = current.targetSev;
      if (playing) {
        playT += dt * 0.28;
        targetSev = severity * Math.sin(Math.min(playT, 1) * Math.PI);
        if (playT >= 1) { playing = false; buttons(); }
      }
      shown += (targetSev - shown) * (1 - Math.exp(-dt * 2.4));
      entry.peak = Math.max(shown, entry.peak * (entry.spec.reversible > 0.85 ? 0.992 : 1));
      const nec = mode === "normal" ? 0 : Math.max(shown, entry.peak * (1 - (entry.spec.reversible == null ? 0.5 : entry.spec.reversible)));
      applyDisease(entry, shown, nec, t, extra);
      const look = view === "cells" ? 0.1 : 0.05;
      cam.position.set(target.x + dist * Math.sin(yaw) * Math.cos(pit), target.y + dist * Math.sin(pit) * 0.85 + 0.2, target.z + dist * Math.cos(yaw) * Math.cos(pit));
      cam.lookAt(target.x, look, target.z);
      renderer.render(scene, cam);
    }
    tick();

    return {
      set(opts) {
        opts = opts || {};
        if (opts.id && opts.id !== id && models[opts.id]) { id = opts.id; if (models[id]) models[id].peak = Math.max(models[id].peak, severity); }
        else if (opts.id && !models[opts.id]) { const spec = catalog.find((c) => c.id === opts.id); if (spec) { ensure(spec); id = opts.id; } }
        if (opts.view) view = opts.view === "cell" ? "cells" : opts.view;
        if (opts.severity != null && mode === "live" && !playing) severity = clamp(opts.severity);
        if (opts.extra) extra = opts.extra;
        current = apply();
      },
      destroy() { dead = true; ro.disconnect(); renderer.dispose(); }
    };
  }

  window.PathStage = {
    mount,
    register: function (name, def) { EXTRA[name] = def; },
    kit: KIT,
    catalog: function () { return CATALOG.map((c) => ({ id: c.id, title: c.title, views: c.views })); }
  };
})();
