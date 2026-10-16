// Supporting anatomy and the holographic scanner. All units are metres.
export function buildScanStructure(THREE) {
  const group = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0xe0ded0, roughness: 0.63,
    transparent: true, opacity: 0.52, depthWrite: false });
  const artery = new THREE.MeshStandardMaterial({ color: 0xa83d38, roughness: 0.48 });
  const vein = new THREE.MeshStandardMaterial({ color: 0x426a8f, roughness: 0.48 });
  const V = (p) => new THREE.Vector3(...p);
  function ell(position, scale, material = bone) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.renderOrder = 1; group.add(mesh); return mesh;
  }
  function tube(points, radius, material = bone, segments = 36) {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(V)), segments, radius, 8, false), material);
    mesh.renderOrder = 1; group.add(mesh); return mesh;
  }
  // Vertebrae and sacrum sit behind the abdominal viscera.
  for (let i = 0; i < 25; i++) ell([0, 1.46 - i * 0.022, -0.061], [0.014, 0.009, 0.014]);
  ell([0, 0.89, -0.045], [0.036, 0.06, 0.024]);
  // Ten rib pairs curve around the lungs to the sternum, with an inferior slope.
  for (let i = 0; i < 10; i++) {
    const y = 1.37 - i * 0.023, radius = 0.088 + 0.025 * Math.sin(i / 9 * Math.PI);
    for (const side of [-1, 1]) {
      const points = [];
      for (let j = 0; j <= 24; j++) {
        const a = j / 24 * Math.PI;
        points.push([side * radius * Math.sin(a), y - 0.023 * Math.sin(a) - j / 24 * 0.012,
          -0.052 * Math.cos(a) + 0.023]);
      }
      tube(points, 0.0031);
    }
  }
  tube([[0, 1.38, 0.083], [0, 1.29, 0.084], [0, 1.19, 0.074]], 0.006);
  for (const side of [-1, 1]) {
    tube([[0, 1.399, 0.06], [side * 0.074, 1.412, 0.048], [side * 0.168, 1.386, 0.009]], 0.005);
    // Iliac crests and pubic rami.
    const ilium = ell([side * 0.077, 0.919, -0.012], [0.059, 0.062, 0.021]); ilium.rotation.z = side * 0.5;
    tube([[side * 0.11, 0.913, 0], [side * 0.066, 0.858, 0.025], [0, 0.866, 0.037]], 0.006);
    tube([[side * 0.009, 1.29, -0.012], [side * 0.021, 1.12, -0.033], [side * 0.019, 0.94, -0.015]], 0.004, side === 1 ? artery : vein);
    tube([[side * 0.019, 1.3, 0.014], [side * 0.02, 1.437, 0.02], [side * 0.022, 1.52, 0.022]], 0.004, side === 1 ? artery : vein);
  }
  // Orbital rims, nasal bridge and jaw indicate the skull without covering the brain.
  for (const side of [-1, 1]) {
    const orbit = [];
    for (let j = 0; j <= 32; j++) { const a = j / 32 * Math.PI * 2; orbit.push([side * 0.027 + Math.cos(a) * 0.018, 1.566 + Math.sin(a) * 0.014, 0.089 + Math.cos(a) * side * 0.003]); }
    tube(orbit, 0.003);
    tube([[side * 0.043, 1.565, 0.068], [side * 0.048, 1.533, 0.063], [side * 0.028, 1.505, 0.072], [0, 1.497, 0.081]], 0.0035);
    tube([[side * 0.011, 1.576, 0.088], [0, 1.548, 0.107], [side * 0.008, 1.532, 0.095]], 0.003);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 11 - 0.5) * 2.15;
    ell([Math.sin(a) * 0.029, 1.518, 0.078 + Math.cos(a) * 0.014], [0.003, 0.005, 0.003]);
  }
  // Arms are populated from the actual posed GLB joints to keep bones and skin aligned.
  const arms = new THREE.Group(); group.add(arms);
  function setArms(points) {
    // Called once after the body asset loads.
    for (const side of [-1, 1]) {
      const p = points?.[side] || [[side * 0.17, 1.388, 0], [side * 0.219, 1.132, 0.012], [side * 0.257, 0.9, 0.025]];
      const armBone = tube(p, 0.007); arms.add(armBone);
      const vessels = p.map(([x, y, z]) => [x + side * 0.009, y, z + 0.016]);
      arms.add(tube(vessels, 0.003, side === 1 ? artery : vein));
    }
  }
  function setLegs(points) {
    for (const side of [-1, 1]) {
      const p = points?.[side] || [[side * 0.09, 0.86, 0], [side * 0.09, 0.46, 0.01], [side * 0.09, 0.07, 0], [side * 0.09, 0.02, 0.1]];
      tube([p[0], p[1]], 0.011);
      ell(p[1].map((n, i) => n + (i === 2 ? 0.015 : 0)), [0.018, 0.021, 0.012]);
      tube([p[1], p[2]], 0.0065);
      tube([p[1].map((n, i) => n + (i === 0 ? side * 0.014 : 0)), p[2].map((n, i) => n + (i === 0 ? side * 0.012 : 0))], 0.0035);
      for (let toe = 0; toe < 5; toe++) {
        const end = p[3].map((n, i) => n + (i === 0 ? (toe - 2) * 0.011 : i === 2 ? 0.02 - toe * 0.005 : 0));
        tube([p[2], [end[0], end[1] + 0.008, end[2] - 0.025], end], 0.0026);
      }
      const vessels = [[side * 0.019, 0.94, -0.015], ...p.slice(0, 3).map(([x,y,z]) => [x + side * 0.012, y, z + 0.023])];
      tube(vessels, 0.0035, side === 1 ? artery : vein, 60);
    }
  }
  return { group, setArms, setLegs };
}

export function buildScanPlatform(THREE) {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.91, 0.022, 120),
    new THREE.MeshStandardMaterial({ color: 0x0f1b22, metalness: 0.5, roughness: 0.4 }));
  plate.position.y = -0.016; group.add(plate);
  for (const [radius, width, opacity] of [[0.81, 0.0025, 1], [0.89, 0.008, 0.35], [0.96, 0.001, 0.23]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, width, 10, 160),
      new THREE.MeshBasicMaterial({ color: 0xbcf3ff, transparent: true, opacity }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.002; group.add(ring);
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, '#b0eaff44'); gradient.addColorStop(0.65, '#72cce530'); gradient.addColorStop(1, '#72cce500');
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -0.031; group.add(glow);
  const scan = new THREE.Group(); group.add(scan);
  const line = new THREE.LineBasicMaterial({ color: 0x9ad7e9, transparent: true, opacity: 0.16 });
  for (const y of [0.02, 0.48, 0.93, 1.38, 1.72]) {
    const points = [];
    // Only the rear arc; the model's outline stays clear.
    for (let i = 0; i <= 100; i++) { const a = i / 100 * Math.PI; points.push(new THREE.Vector3(Math.cos(a) * 0.75, y, -Math.sin(a) * 0.56)); }
    scan.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), line));
  }
  for (let i = 0; i <= 8; i++) {
    const a = i / 8 * Math.PI, x = Math.cos(a) * 0.75, z = -Math.sin(a) * 0.56;
    scan.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0.02, z), new THREE.Vector3(x, 1.72, z)]), line));
  }
  group.scale.z = 0.55;
  group.position.z = -0.25;
  return group;
}
