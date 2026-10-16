import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Anatomical landmarks in metres for the bundled 1.68 m body; patient left is +x.
// These teaching meshes are schematic, with volume and anterior/posterior placement.
export function buildAtlasOrgans(THREE) {
  const group = new THREE.Group(), organs = {}, pickMeshes = [];
  const v = (p) => new THREE.Vector3(...p);
  const reference = { value: null }, referenceReady = { value: 0 };
  // Deterministic fine tissue grain and vessels, shared by every organ material.
  const surface = document.createElement('canvas'); surface.width = surface.height = 256;
  const ctx = surface.getContext('2d'); ctx.fillStyle = '#d6b8ad'; ctx.fillRect(0, 0, 256, 256);
  let seed = 7301;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 6500; i++) {
    const value = Math.floor(125 + random() * 100);
    ctx.fillStyle = `rgba(${value},${value},${value},${0.12 + random() * 0.3})`;
    ctx.beginPath(); ctx.arc(random() * 256, random() * 256, 0.3 + random() * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#80525450'; ctx.lineWidth = 0.5;
  for (let i = 0; i < 35; i++) {
    const x = random() * 256, y = random() * 256;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 17, y + 10, x - 13, y + 30, x + 8, y + 53); ctx.stroke();
  }
  const tissue = new THREE.CanvasTexture(surface); tissue.wrapS = tissue.wrapT = THREE.RepeatWrapping;
  tissue.colorSpace = THREE.SRGBColorSpace;
  const relief = tissue.clone(); relief.colorSpace = THREE.NoColorSpace; relief.needsUpdate = true;
  function organ(id, color, position, build) {
    const g = new THREE.Group(); g.position.set(...position);
    const material = new THREE.MeshStandardMaterial({ color, map: tissue, bumpMap: relief, bumpScale: 0.0016, roughness: 0.58, metalness: 0,
      emissive: color, emissiveIntensity: 0.025 });
    // Project the supplied anatomical surface detail onto the front of each real
    // volume. The rear keeps its tissue material as the camera rotates around it.
    material.onBeforeCompile = (shader) => {
      shader.uniforms.anatomyReference = reference; shader.uniforms.anatomyReferenceReady = referenceReady;
      shader.vertexShader = shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec3 anatomyPoint; varying vec3 anatomyNormal;');
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nanatomyPoint=(modelMatrix*vec4(transformed,1.0)).xyz; anatomyNormal=normalize(mat3(modelMatrix)*objectNormal);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
        '#include <common>\nuniform sampler2D anatomyReference; uniform float anatomyReferenceReady; varying vec3 anatomyPoint; varying vec3 anatomyNormal;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        vec2 referenceUV=vec2(0.5046+anatomyPoint.x*1.274,0.007+anatomyPoint.y*0.583);
        vec3 referenceTissue=texture2D(anatomyReference,clamp(referenceUV,0.0,1.0)).rgb;
        float detailWeight=smoothstep(0.0,0.8,normalize(anatomyNormal).z)*anatomyReferenceReady;
        diffuseColor.rgb=mix(diffuseColor.rgb,referenceTissue*1.7,detailWeight*0.84);`);
    };
    function mesh(geometry, pos = [0, 0, 0], scale = [1, 1, 1]) {
      const m = new THREE.Mesh(geometry, material); m.position.set(...pos); m.scale.set(...scale);
      m.userData.organ = id; g.add(m); pickMeshes.push(m); return m;
    }
    function ell(pos, scale) { return mesh(new THREE.SphereGeometry(1, 36, 24), pos, scale); }
    function tube(points, radius, segments = 48) {
      return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v)), segments, radius, 10, false));
    }
    function outline(points, depth) {
      const s = new THREE.Shape(); s.moveTo(...points[0]);
      for (let i = 1; i < points.length; i += 3) s.bezierCurveTo(...points[i], ...points[i + 1], ...points[i + 2]);
      let geo = new THREE.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: true,
        bevelSegments: 4, bevelSize: 0.006, bevelThickness: 0.006, curveSegments: 28 });
      geo.translate(0, 0, -depth / 2);
      geo.computeBoundingBox();
      const box = geo.boundingBox, center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const vertices = geo.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const nx = (vertices.getX(i) - center.x) / (size.x * 0.52), ny = (vertices.getY(i) - center.y) / (size.y * 0.52);
        const bulge = Math.sqrt(Math.max(0, 1 - nx * nx)) * Math.sqrt(Math.max(0, 1 - ny * ny));
        const z = vertices.getZ(i); vertices.setZ(i, z + Math.sign(z) * depth * 0.24 * bulge);
      }
      geo.deleteAttribute('normal');
      const smooth = mergeVertices(geo, 0.00001); geo.dispose(); geo = smooth;
      geo.computeVertexNormals(); return mesh(geo);
    }
    build({ g, mesh, ell, tube, outline }); group.add(g);
    organs[id] = { group: g, material, focus: v(position) };
  }
  organ('brain', 0xd8b2b2, [0, 1.614, 0.025], ({ ell, tube }) => {
    for (const side of [-1, 1]) {
      const hemisphere = ell([side * 0.031, 0, 0], [0.036, 0.045, 0.063]);
      const vertices = hemisphere.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
        const fold = 1 + 0.035 * Math.sin(x * 19 + y * 12) * Math.sin(z * 17 - y * 9);
        vertices.setXYZ(i, x * fold, y * fold, z * fold);
      }
      hemisphere.geometry.computeVertexNormals();
      for (let row = 0; row < 5; row++) {
        const points = [], y = -0.027 + row * 0.013;
        for (let i = 0; i <= 20; i++) {
          const x = -0.027 + i / 20 * 0.054;
          const z = 0.063 * Math.sqrt(Math.max(0, 1 - (x / 0.037) ** 2 - (y / 0.049) ** 2));
          points.push([side * (0.031 + x), y + Math.sin(i * 0.7 + row) * 0.0025, z]);
        }
        tube(points, 0.0027, 26);
      }
      for (let j = 0; j < 9; j++) {
        const z = -0.052 + j * 0.013, points = [];
        for (let i = 0; i <= 18; i++) {
          const t = i / 18 * Math.PI, cross = Math.sqrt(1 - (z / 0.077) ** 2);
          points.push([side * (0.034 + 0.03 * Math.cos(t) * cross), 0.043 * Math.sin(t) * cross + 0.002 * Math.sin(i * 1.5 + j), z]);
        }
        tube(points, 0.0032, 24);
      }
    }
    ell([0, -0.044, -0.041], [0.039, 0.023, 0.028]);
    tube([[0, -0.035, -0.018], [0, -0.068, -0.01]], 0.01);
  });
  organ('thyroid', 0xd69357, [0, 1.411, 0.068], ({ ell }) => {
    for (const s of [-1, 1]) { const l = ell([s * 0.018, 0, 0], [0.012, 0.025, 0.011]); l.rotation.z = s * -0.2; }
    ell([0, -0.008, 0.001], [0.019, 0.006, 0.008]);
  });
  organ('lungs', 0xbc7776, [0, 1.262, 0.005], ({ outline, tube }) => {
    const right = outline([[-0.028, 0.115], [-0.068, 0.145], [-0.12, 0.03], [-0.134, -0.081],
      [-0.142, -0.12], [-0.073, -0.121], [-0.025, -0.101],
      [-0.02, -0.04], [-0.021, 0.06], [-0.028, 0.115]], 0.082);
    const left = outline([[0.029, 0.115], [0.071, 0.14], [0.118, 0.025], [0.128, -0.085],
      [0.131, -0.116], [0.088, -0.119], [0.063, -0.103],
      [0.077, -0.045], [0.015, -0.034], [0.024, 0.018],
      [0.026, 0.048], [0.027, 0.095], [0.029, 0.115]], 0.075);
    right.rotation.y = -0.12; left.rotation.y = 0.12;
    const airway = new THREE.MeshStandardMaterial({ color: 0xc7c8b9, roughness: 0.6 });
    const branch = (p, r) => { const m = tube(p, r); m.material = airway; };
    branch([[0, 0.151, 0.025], [0, 0.07, 0.025], [0, 0.025, 0.02]], 0.009);
    for (const s of [-1, 1]) {
      branch([[0, 0.025, 0.02], [s * 0.045, -0.006, 0.035], [s * 0.08, -0.06, 0.045]], 0.006);
      branch([[s * 0.04, 0, 0.034], [s * 0.068, 0.027, 0.045], [s * 0.075, 0.066, 0.045]], 0.004);
      branch([[s * 0.05, -0.02, 0.04], [s * 0.105, -0.065, 0.046]], 0.003);
    }
  });
  organ('heart', 0xa32c29, [0.026, 1.235, 0.067], ({ g, ell, tube }) => {
    g.rotation.z = 0.35;
    const ventricle = new THREE.SphereGeometry(1, 40, 32), p = ventricle.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), taper = 0.66 + (y + 1) * 0.17;
      p.setXYZ(i, p.getX(i) * 0.043 * taper, y * 0.061, p.getZ(i) * 0.036 * taper);
    }
    ventricle.computeVertexNormals();
    const mass = ell([0, -0.012, 0], [1, 1, 1]); mass.geometry.dispose(); mass.geometry = ventricle;
    ell([-0.023, 0.038, 0], [0.026, 0.024, 0.026]); ell([0.023, 0.035, -0.006], [0.024, 0.025, 0.025]);
    tube([[-0.009, 0.035, 0], [-0.012, 0.086, 0], [0.015, 0.092, -0.014], [0.024, 0.057, -0.025]], 0.01);
    tube([[0.02, 0.043, 0.007], [0.028, 0.067, 0.008], [0.047, 0.075, 0]], 0.008);
    tube([[0, 0.037, 0.033], [-0.011, 0, 0.034], [-0.006, -0.05, 0.016]], 0.0025);
  });
  organ('liver', 0x963f37, [-0.046, 1.102, 0.028], ({ outline }) => {
    outline([[-0.095, 0.017], [-0.08, 0.067], [-0.02, 0.062], [0.044, 0.031],
      [0.068, 0.028], [0.095, 0.02], [0.111, 0.008],
      [0.073, -0.015], [0.044, -0.021], [0.009, -0.026],
      [-0.035, -0.06], [-0.09, -0.032], [-0.095, 0.017]], 0.077);
  });
  organ('stomach', 0xd8a286, [0.071, 1.07, 0.04], ({ outline, tube }) => {
    outline([[-0.009, 0.056], [0.004, 0.03], [0.045, 0.049], [0.049, 0.006],
      [0.056, -0.045], [0.005, -0.068], [-0.026, -0.041],
      [-0.042, -0.023], [-0.029, -0.006], [-0.012, -0.019],
      [0.008, -0.034], [0.019, 0], [-0.009, 0.056]], 0.036);
    tube([[-0.009, 0.056, 0], [-0.014, 0.09, -0.008]], 0.008);
  });
  organ('spleen', 0x905982, [0.127, 1.09, -0.033], ({ ell }) => {
    const s = ell([0, 0, 0], [0.021, 0.047, 0.028]); s.rotation.z = -0.25;
  });
  organ('kidneys', 0x9c4d45, [0, 1.045, -0.06], ({ outline, tube }) => {
    for (const s of [-1, 1]) {
      const k = outline([[0, 0.037], [-0.033, 0.043], [-0.034, -0.037], [0, -0.039],
        [0.024, -0.04], [0.022, -0.013], [0.008, -0.008],
        [-0.006, 0], [0.023, 0.025], [0, 0.037]], 0.027);
      k.position.x = s * 0.073; k.scale.x = -s;
      tube([[s * 0.061, -0.01, 0], [s * 0.052, -0.07, 0], [s * 0.025, -0.15, 0.015]], 0.003);
    }
  });
  organ('bowel', 0xc28e7e, [0, 0.961, 0.035], ({ tube }) => {
    const loops = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160 * Math.PI * 6;
      loops.push([Math.sin(t * 1.7) * (0.038 + 0.014 * Math.cos(t * 0.7)),
        Math.cos(t) * 0.042 + Math.sin(t * 2.3) * 0.008 - 0.005, 0.015 + Math.sin(t * 1.3) * 0.017]);
    }
    tube(loops, 0.0075, 300);
    tube([[-0.09, -0.05, 0], [-0.095, 0.025, -0.005], [-0.078, 0.061, 0],
      [0, 0.056, 0.014], [0.086, 0.056, 0], [0.095, -0.02, -0.003],
      [0.066, -0.065, 0], [0.019, -0.07, 0], [0, -0.1, -0.015]], 0.013, 100);
  });
  return { group, organs, pickMeshes, setSurface(texture) { reference.value = texture; referenceReady.value = 1; } };
}
