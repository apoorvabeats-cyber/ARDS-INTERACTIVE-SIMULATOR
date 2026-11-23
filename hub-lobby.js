import * as THREE from "three";
import { createSfx } from "./critical-care-universe/universe/sfx.js?v=20261122g";
import { buildRooms } from "./hub-rooms.js?v=20261123b";

const gate = document.getElementById("icu-gate");
const canvas = document.getElementById("lobby");
if (!gate || !canvas || !document.body.classList.contains("icu-gate")) {
  /* opened straight into the hub */
} else {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x0a1626);
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  /* one vivid colour per door, used on the door, its feature wall, its floor path and its lights */
  const SLIDE = 1.0;                              /* how far each glass leaf slides: far enough that the opening is completely clear of the leaves */
  const ACC = { icu: 0x12e3c8, micro: 0x7be34f, rad: 0x3f8cff, aud: 0xffb347, path: 0xa073ff };
  /* a pentagon: five doors, each on its own wall. theta is the compass angle of the door seen from the middle (0 = straight ahead, clockwise). */
  const KINDS = ["icu", "micro", "rad", "aud", "path"], THETA = {}, N5 = 5, APO = 5.8, DOORR = APO - 0.18, SIDE = 2 * APO * Math.tan(Math.PI / N5), RC = (APO - 0.02) / Math.cos(Math.PI / N5), RT = 7.3;
  KINDS.forEach((k, i) => { THETA[k] = i * 2 * Math.PI / N5; });
  const sfx = createSfx();
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const cnv = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")];
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, 1, 0.08, 90);
  scene.add(new THREE.HemisphereLight(0xf4f8ff, 0x7d93b4, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(2, 8, 3);
  scene.add(sun);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2f5fa, roughness: 0.55 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xd9e2ee, roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.35, metalness: 0.7 });
  const brushed = new THREE.MeshStandardMaterial({ color: 0xd5dde8, roughness: 0.3, metalness: 0.85 });
  const glow = (c, k) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k == null ? 1.6 : k, roughness: 0.4 });

  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    (parent || scene).add(m);
    return m;
  }

  /* ---------- floor: deep navy terrazzo, a medical-cross medallion and a lit path to every door ---------- */
  const floorTex = (() => {
    const S = 1024, [c, g] = cnv(S, S), px = S / 10, ppm = S / (2 * RT);
    const bg = g.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S * 0.72);
    bg.addColorStop(0, "#17496a"); bg.addColorStop(0.55, "#0d2740"); bg.addColorStop(1, "#071526");
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    g.strokeStyle = "rgba(160,205,240,.08)"; g.lineWidth = 2;
    for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(i * px, 0); g.lineTo(i * px, S); g.moveTo(0, i * px); g.lineTo(S, i * px); g.stroke(); }
    for (let i = 0; i < 1400; i++) {              /* terrazzo flecks */
      g.fillStyle = "rgba(190,225,255," + (Math.random() * 0.13) + ")";
      g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 2.2, 0, 6.3); g.fill();
    }
    /* a glowing lane from the centre to each door; canvas top is -z, so a door at compass angle theta lies along (sin theta, cos theta) */
    const lane = (theta, col) => {
      g.save(); g.translate(S / 2, S / 2); g.rotate(-theta);
      const end = DOORR * ppm - 14, gr = g.createLinearGradient(0, 80, 0, end);
      gr.addColorStop(0, col + "00"); gr.addColorStop(0.35, col + "cc"); gr.addColorStop(1, col + "ff");
      g.fillStyle = gr; g.fillRect(-16, 80, 32, end - 80);
      g.strokeStyle = col; g.lineWidth = 7; g.lineCap = "round"; g.lineJoin = "round";
      for (let k = 0; k < 3; k++) { const y = 170 + k * 70; g.globalAlpha = 0.45 + k * 0.25; g.beginPath(); g.moveTo(-34, y - 24); g.lineTo(0, y + 6); g.lineTo(34, y - 24); g.stroke(); }
      g.restore();
    };
    KINDS.forEach((k) => lane(THETA[k], hex(ACC[k])));
    g.save(); g.translate(S / 2, S / 2);
    const disc = g.createRadialGradient(0, 0, 10, 0, 0, 150);
    disc.addColorStop(0, "#1f6e93"); disc.addColorStop(1, "#0f3552");
    g.fillStyle = disc; g.beginPath(); g.arc(0, 0, 150, 0, 6.3); g.fill();
    KINDS.forEach((k) => {
      const phi = Math.PI / 2 - THETA[k], half = Math.PI / N5 - 0.12;
      g.strokeStyle = hex(ACC[k]); g.lineWidth = 12; g.lineCap = "round";
      g.beginPath(); g.arc(0, 0, 168, phi - half, phi + half); g.stroke();
    });
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 138, 0, 6.3); g.stroke();
    g.fillStyle = "#ffffff"; g.shadowColor = "#7ff3ff"; g.shadowBlur = 24;
    g.fillRect(-18, -78, 36, 156); g.fillRect(-78, -18, 156, 36);
    g.restore();
    return tex(c);
  })();
  /* a flat pentagon fan facing up (floor) or down (ceiling) */
  function pentagon(y, up, mat, uvMap) {
    const pos = [0, 0, 0], uv = [0.5, 0.5], idx = [];
    for (let i = 0; i < N5; i++) { const a = Math.PI / N5 + i * 2 * Math.PI / N5; pos.push(Math.sin(a) * RC, 0, Math.cos(a) * RC); uv.push(0.5 + Math.sin(a) * RC / (2 * RT), 0.5 - Math.cos(a) * RC / (2 * RT)); }
    for (let i = 0; i < N5; i++) { const a = 1 + i, b = 1 + (i + 1) % N5; if (up) idx.push(0, a, b); else idx.push(0, b, a); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.position.y = y; scene.add(m); return m;
  }
  pentagon(0, true, new THREE.MeshStandardMaterial({ color: 0x071526, roughness: 0.5 }));
  const floor = pentagon(0.061, true, new THREE.MeshStandardMaterial({
    map: floorTex, emissiveMap: floorTex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.22, metalness: 0.35
  }));

  /* ---------- ceiling: soft coffers and a slowly turning five-colour ring ---------- */
  pentagon(3.15, false, ceilMat);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf6ff, emissiveIntensity: 1.1, roughness: 0.4 });
  KINDS.forEach((k) => { const a = THETA[k] + Math.PI / N5, l = box(1.6, 0.05, 0.5, lampMat, Math.sin(a) * 3.3, 3.08, Math.cos(a) * 3.3); l.rotation.y = a; });
  const ring = new THREE.Group();
  KINDS.forEach((k, i) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.045, 10, 48, 2 * Math.PI / N5 - 0.14), glow(ACC[k], 2.2));
    arc.rotation.x = Math.PI / 2; arc.rotation.z = i * 2 * Math.PI / N5 + 0.07;
    ring.add(arc);
  });
  ring.position.y = 3.07;
  scene.add(ring);

  /* ---------- five walls, each with a door opening in the middle ---------- */
  KINDS.forEach((k) => {
    const th = THETA[k], g = new THREE.Group(), sw = (SIDE + 0.3 - 2.2) / 2;
    g.position.set(Math.sin(th) * APO, 0, Math.cos(th) * APO); g.rotation.y = th; scene.add(g);
    box(sw, 3.1, 0.16, wallMat, -(1.1 + sw / 2), 1.55, 0, g);
    box(sw, 3.1, 0.16, wallMat, 1.1 + sw / 2, 1.55, 0, g);
    box(2.2, 0.62, 0.16, wallMat, 0, 2.79, 0, g);
  });

  /* corner light columns */
  KINDS.forEach((k, i) => {
    const a = THETA[k] + Math.PI / N5, x = Math.sin(a) * (APO - 0.35) / Math.cos(Math.PI / N5), z = Math.cos(a) * (APO - 0.35) / Math.cos(Math.PI / N5), c = ACC[KINDS[(i + 1) % N5]];
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.0, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: c, emissiveIntensity: 1.0, roughness: 0.3, transparent: true, opacity: 0.92 }));
    col.position.set(x, 1.56, z); scene.add(col);
    [0.08, 3.04].forEach((y) => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.07, 20), steel); cap.position.set(x, y, z); scene.add(cap); });
  });

  /* ---------- sign: a lit box with an icon, a coloured band and the name ---------- */
  function icon(g, kind, cx, cy, r, col) {
    g.save(); g.translate(cx, cy); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 6; g.lineCap = "round"; g.lineJoin = "round";
    if (kind === "icu") {                          /* heart-rate trace in a ring */
      g.beginPath(); g.arc(0, 0, r, 0, 6.3); g.stroke();
      g.beginPath(); g.moveTo(-r * 0.7, 2); g.lineTo(-r * 0.3, 2); g.lineTo(-r * 0.15, -r * 0.5); g.lineTo(r * 0.1, r * 0.55); g.lineTo(r * 0.28, 2); g.lineTo(r * 0.7, 2); g.stroke();
    } else if (kind === "path") {                  /* cell with nucleus */
      g.beginPath(); g.ellipse(0, 0, r, r * 0.78, 0.5, 0, 6.3); g.stroke();
      g.beginPath(); g.arc(-r * 0.15, -r * 0.05, r * 0.3, 0, 6.3); g.fill();
      g.beginPath(); g.arc(r * 0.42, r * 0.2, r * 0.12, 0, 6.3); g.fill();
    } else if (kind === "micro") {                 /* petri dish with colonies */
      g.beginPath(); g.arc(0, 0, r, 0, 6.3); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.74, 0, 6.3); g.stroke();
      [[-0.25, -0.2, 0.17], [0.25, -0.05, 0.12], [-0.05, 0.3, 0.14], [0.3, 0.3, 0.08]].forEach(([a, b, s]) => { g.beginPath(); g.arc(a * r, b * r, s * r, 0, 6.3); g.fill(); });
    } else if (kind === "aud") {                   /* stage with curved seating rows */
      g.beginPath(); g.arc(0, r * 0.55, r * 0.35, Math.PI, 0); g.stroke();
      [0.7, 1.0, 1.3].forEach((k) => { g.beginPath(); g.arc(0, r * 0.55, r * 0.35 + r * 0.32 * (k - 0.4), Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
    } else {                                       /* scan ring with crosshair */
      g.beginPath(); g.arc(0, 0, r, 0, 6.3); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.5, 0, 6.3); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(-r * 1.15, 0); g.lineTo(-r * 0.62, 0); g.moveTo(r * 0.62, 0); g.lineTo(r * 1.15, 0); g.moveTo(0, -r * 1.15); g.lineTo(0, -r * 0.62); g.moveTo(0, r * 0.62); g.lineTo(0, r * 1.15); g.stroke();
    }
    g.restore();
  }
  function sign(kind, text) {
    const [c, g] = cnv(768, 160), col = hex(ACC[kind]);
    const bg = g.createLinearGradient(0, 0, 768, 0);
    bg.addColorStop(0, "#0d1626"); bg.addColorStop(1, "#142238");
    g.fillStyle = bg; g.fillRect(0, 0, 768, 160);
    g.fillStyle = col; g.fillRect(0, 0, 768, 9); g.fillRect(0, 151, 768, 9);
    icon(g, kind, 80, 80, 40, col);
    g.fillStyle = "#ffffff";
    g.font = (text.length > 18 ? "700 40px " : "700 54px ") + "Figtree, system-ui, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 442, 84);
    const t = tex(c);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.95, roughness: 0.5 });
  }

  /* feature wall panel: accent gradient with a faint heart-trace line */
  function panelMat(col, flip) {
    const [c, g] = cnv(512, 384), a = hex(col);
    const gr = g.createLinearGradient(0, 0, 0, 384);
    gr.addColorStop(0, a); gr.addColorStop(1, "#0b1a2c");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
    g.globalAlpha = 0.16; g.fillStyle = "#fff";
    for (let y = 18; y < 384; y += 36) for (let x = 18; x < 512; x += 36) { g.beginPath(); g.arc(x, y, 2, 0, 6.3); g.fill(); }
    g.globalAlpha = 1; g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 4; g.lineJoin = "round";
    g.beginPath(); g.moveTo(0, 230);
    const pts = [[90, 230], [120, 230], [138, 170], [158, 292], [178, 214], [200, 230], [330, 230], [352, 230], [372, 150], [396, 300], [418, 218], [440, 230], [512, 230]];
    pts.forEach(([x, y]) => g.lineTo(flip ? 512 - x : x, y));
    g.stroke();
    const t = tex(c);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.4 });
  }

  const glassMats = {};
  const decorOf = [];
  const doorLights = [];
  /* A door group: local +z points out of the room, so everything on the room side sits at negative z. */
  function door(kind, text) {
    const col = ACC[kind];
    const g = new THREE.Group(), deco = new THREE.Group();
    /* frame: graphite jambs and lintel with a glowing inner edge */
    [[-1.04, 1.2, 0.14, 2.4], [1.04, 1.2, 0.14, 2.4]].forEach(([x, y, w, h]) => box(w, h, 0.12, steel, x, y, 0, g));
    box(2.22, 0.14, 0.12, steel, 0, 2.42, 0, g);
    box(0.03, 2.34, 0.03, glow(col, 1.25), -0.955, 1.2, -0.07, g);
    box(0.03, 2.34, 0.03, glow(col, 1.25), 0.955, 1.2, -0.07, g);
    box(1.93, 0.03, 0.03, glow(col, 1.25), 0, 2.345, -0.07, g);
    /* tinted glass leaves that slide apart */
    const glass = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.07, transparent: true, opacity: 0.3, roughness: 0.06, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    glassMats[kind] = glass;
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.26, 0.035), glass);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.26, 0.035), glass);
    left.position.set(-0.48, 1.26, -0.03);
    right.position.set(0.48, 1.26, -0.03);
    [[left, 1], [right, -1]].forEach(([leaf, s]) => {
      box(0.92, 0.2, 0.045, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.7 }), 0, 0.25, 0, leaf); /* frosted band */
      box(0.025, 2.26, 0.05, brushed, -s * 0.46, 0, 0, leaf);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.95, 10), brushed);
      bar.position.set(-s * 0.39, 0, -0.07); leaf.add(bar);
    });
    g.add(left, right);
    /* sign with a soft halo */
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.46, 0.05), sign(kind, text));
    plate.position.set(0, 2.76, -0.09);
    g.add(plate);
    const [hc, hg] = cnv(128, 64);
    const hr = hg.createRadialGradient(64, 32, 2, 64, 32, 64); hr.addColorStop(0, hex(col)); hr.addColorStop(1, "#00000000");
    hg.fillStyle = hr; hg.fillRect(0, 0, 128, 64);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), new THREE.MeshBasicMaterial({ map: tex(hc), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(0, 2.76, -0.12); halo.rotation.y = Math.PI;
    g.add(halo);
    /* click target */
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.9, 0.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.position.y = 1.4; hit.userData.kind = kind;
    g.add(hit);
    g.userData.kind = kind; g.userData.left = left; g.userData.right = right; g.userData.open = 0;
    g.userData.glow = [halo, plate.material];
    scene.add(g);

    /* decoration that shares the door's frame but is not clickable: feature wall, base light, cove, benches, light */
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.5, 0.05), panelMat(col, s > 0));
      p.position.set(s * 2.6, 1.4, -0.075); deco.add(p);
      box(2.7, 0.04, 0.06, glow(col, 0.95), s * 2.6, 0.2, -0.09, deco);           /* skirting light */
      box(2.7, 0.04, 0.06, steel, s * 2.6, 2.68, -0.09, deco);
      const bench = new THREE.Group();
      box(1.5, 0.07, 0.42, new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, emissive: col, emissiveIntensity: 0.12 }), 0, 0.45, 0, bench);
      box(1.54, 0.03, 0.46, steel, 0, 0.405, 0, bench);
      [-0.64, 0.64].forEach((x) => box(0.05, 0.4, 0.34, steel, x, 0.2, 0, bench));
      bench.position.set(s * 2.6, 0.06, -0.52); deco.add(bench);
    });
    box(2.26, 0.04, 0.05, glow(col, 0.95), 0, 0.075, -0.45, deco);                   /* threshold strip */
    box(SIDE - 0.3, 0.045, 0.05, glow(col, 0.9), 0, 3.0, -0.1, deco);                      /* cove along the top */
    const pl = new THREE.PointLight(col, 6, 7.5, 2);
    pl.position.set(0, 2.3, -1.3); deco.add(pl); doorLights.push(pl);
    scene.add(deco);
    decorOf.push([g, deco]);
    return g;
  }

  const TEXT = { icu: "ENTER THE ICU", micro: "MICROBIOLOGY LAB", rad: "RADIOLOGY", aud: "AUDITORIUM", path: "PATHOPHYSIOLOGY LIVE" };
  const DOORS = {};
  KINDS.forEach((k) => {
    const d = door(k, TEXT[k]), th = THETA[k];
    d.position.set(Math.sin(th) * DOORR, 0, Math.cos(th) * DOORR); d.rotation.y = th; DOORS[k] = d;
  });
  const ALLDOORS = KINDS.map((k) => DOORS[k]);

  /* What lies behind the Auditorium door: the real auditorium, seen from its west gate (this hall lies beyond that wall).
     The shared replica is built in auditorium coordinates; turn it into this door's frame: +z leads away from the hall, local +x is the
     viewer's left, so auditorium (x, z) lands at lateral (ZC - z), depth (x - AU.x0) + 0.7 (the short tunnel between the two walls). */
  const AUD_ZC = -17, AUD_X0 = -22, HUBC = { x: AUD_X0 - 0.7 - APO, z: AUD_ZC };
  function buildAudBeyond() {
    const g = new THREE.Group(); g.position.z = 0.18;
    if (typeof window.ccuAudBeyond === "function") {
      const A = window.ccuAudBeyond(THREE, "W");
      A.rotation.y = -Math.PI / 2; A.position.set(AUD_ZC, 0, 0.7 - AUD_X0);
      g.add(A);
    }
    return g;
  }
  DOORS.aud.add(buildAudBeyond());
  /* behind every other door, a bright room: the microbiology lab, the pathophysiology suite, an ICU bay, and the radiology passage with its four scanner rooms */
  const R = buildRooms(THREE, { cnv, tex, hex, ACC, glow });
  ["micro", "path", "icu", "rad"].forEach((k) => { R[k].position.z = 0.18; DOORS[k].add(R[k]); });
  const ROOMKIND = new Set(Object.keys(R.hits));
  const MODFOR = { rx: "cxr", rct: "ct", rmri: "mri", rus: "us" };
  decorOf.forEach(([g, d]) => { d.position.copy(g.position); d.rotation.copy(g.rotation); });

  /* a few slow motes of light in the air */
  const motes = (() => {
    const n = 110, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), cs = KINDS.map((k) => new THREE.Color(ACC[k]));
    for (let i = 0; i < n; i++) {
      let x, z; do { x = (Math.random() - 0.5) * 11; z = (Math.random() - 0.5) * 11; } while (x * x + z * z < 2.4 || x * x + z * z > 30);
      pos.set([x, 0.3 + Math.random() * 2.6, z], i * 3);
      const c = cs[i % 5]; col.set([c.r, c.g, c.b], i * 3);
    }
    const [dc, dg] = cnv(32, 32), dr = dg.createRadialGradient(16, 16, 1, 16, 16, 16);
    dr.addColorStop(0, "#fff"); dr.addColorStop(1, "#fff0"); dg.fillStyle = dr; dg.fillRect(0, 0, 32, 32);
    const dot = new THREE.CanvasTexture(dc);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, map: dot, alphaTest: 0.02, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(pts);
    return pts;
  })();

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const eye = new THREE.Vector3(0, 1.62, 0);
  let yaw = 0;
  let pit = 0;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let mode = "look";
  let job = null;
  let arrive = null;
  let raf = 0;
  let leaveTimer = 0;
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
    camera.position.copy(eye);
    camera.lookAt(eye.x + Math.sin(yaw), eye.y + pit, eye.z + Math.cos(yaw));
  }

  function shut(door) {
    door.userData.open = 0;
    door.userData.left.position.x = -0.48;
    door.userData.right.position.x = 0.48;
  }

  /* leaving for the auditorium is a straight cut: keep this frame and the exact place we stand, and the auditorium picks up from there */
  const HPH = 1.3 * Math.PI, HCS = Math.cos(HPH), HSN = Math.sin(HPH);
  function keepFrame() {
    try {
      renderer.render(scene, camera);
      const c = renderer.domElement, w = Math.min(960, c.width), h = Math.round(w * c.height / c.width), t = document.createElement("canvas");
      t.width = w; t.height = h; t.getContext("2d").drawImage(c, 0, 0, w, h);
      sessionStorage.setItem("ccu-snap", t.toDataURL("image/jpeg", 0.62)); sessionStorage.setItem("ccu-snap-t", String(Date.now()));
    } catch (err) { try { sessionStorage.removeItem("ccu-snap"); } catch (e2) {} }
  }
  function keepPose() {
    try {
      const wx = HUBC.x + eye.x * HCS + eye.z * HSN, wz = HUBC.z + (-eye.x * HSN + eye.z * HCS);
      const fx = Math.sin(yaw), fz = Math.cos(yaw), fwx = fx * HCS + fz * HSN, fwz = -fx * HSN + fz * HCS;
      sessionStorage.setItem("ccu-pose", JSON.stringify({ to: "aud", x: wx, z: wz, yaw: Math.atan2(fwx, -fwz), t: Date.now() }));
    } catch (err) {}
  }
  function readPose() {
    try { const j = JSON.parse(sessionStorage.getItem("ccu-pose") || "null"); if (j && j.to === "hub" && Date.now() - j.t < 90000) return j; } catch (err) {}
    return null;
  }

  /* The auditorium is its own page, so it is loaded in a frame that sits out of sight while we walk to its door; when the walk ends the
     frame is simply shown, from exactly the place we stand. There is no navigation and no reload, in either direction. */
  let audFrame = null, audReady = false, audWait = 0;
  const AUD_URL = "critical-care-universe/index.html?home=1&to=auditorium&from=hub&embed=1&v=20261123b";
  function prepareAud(face) {
    try {
      const along = 7.25, ex = Math.sin(face) * along, ez = Math.cos(face) * along, wx = HUBC.x + ex * HCS + ez * HSN, wz = HUBC.z + (-ex * HSN + ez * HCS);
      const fx = Math.sin(face), fz = Math.cos(face), fwx = fx * HCS + fz * HSN, fwz = -fx * HSN + fz * HCS;
      sessionStorage.setItem("ccu-pose", JSON.stringify({ to: "aud", x: wx, z: wz, yaw: Math.atan2(fwx, -fwz), t: Date.now() }));
      sessionStorage.removeItem("ccu-snap");
    } catch (err) {}
    if (audFrame) return;
    audReady = false;
    const f = document.createElement("iframe");
    f.id = "aud-frame"; f.title = "Auditorium"; f.setAttribute("allow", "autoplay; fullscreen");
    f.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;border:0;background:#050b18;opacity:0;pointer-events:none;z-index:2147482000";
    f.src = AUD_URL; document.body.appendChild(f); audFrame = f;
  }
  function stopHubSound() {
    try { if (window.stopWave) window.stopWave(); } catch (err) {}
    try { document.querySelectorAll("audio").forEach((a) => { a.pause(); }); } catch (err) {}
  }
  function revealAud() {
    if (!audFrame) { prepareAud(THETA.aud); }
    if (!audReady) {                                       /* not drawn yet: hold this last frame a moment, then fall back to a normal page change */
      mode = "wait"; cancelAnimationFrame(raf); raf = 0;
      if (!audWait) audWait = setTimeout(() => { audWait = 0; if (!audReady) { keepFrame(); location.href = AUD_URL.replace("&embed=1", ""); } }, 7000);
      return;
    }
    clearTimeout(audWait); audWait = 0; clearTimeout(leaveTimer);
    mode = "parked"; cancelAnimationFrame(raf); raf = 0;
    stopHubSound();
    audFrame.style.pointerEvents = "auto"; audFrame.style.opacity = "1";
    try { audFrame.contentWindow.postMessage("ccu-shown", "*"); audFrame.contentWindow.focus(); } catch (err) {}
  }
  function backFromAud() {
    if (mode !== "parked" && mode !== "wait") return;
    const pz = readPose(), face = THETA.aud, d = DOORS.aud;
    const start = pz ? new THREE.Vector3(pz.x, 1.62, pz.z) : new THREE.Vector3(Math.sin(face) * (APO - 2.5), 1.62, Math.cos(face) * (APO - 2.5));
    eye.copy(start); yaw = pz ? pz.yaw : face + Math.PI; pit = 0;
    setDoor(d, 1);
    mode = "arrive"; arrive = { t: 0, start, snd: false, shut: false }; window.doorChosen = true; job = null;
    if (fade) { fade.style.transition = "none"; fade.style.opacity = "0"; }
    clearTimeout(leaveTimer);
    try { placeCamera(); renderer.render(scene, camera); } catch (err) {}
    if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
    /* once the hall has drawn its first frame, the auditorium frame is taken away: a straight cut, no flash */
    requestAnimationFrame(() => requestAnimationFrame(() => { if (audFrame) { audFrame.style.opacity = "0"; audFrame.style.pointerEvents = "none"; const f = audFrame; audFrame = null; audReady = false; setTimeout(() => { try { f.src = "about:blank"; f.remove(); } catch (err) {} }, 400); } }));
    if (window.playHubVoice && false) window.playHubVoice();
  }
  window.addEventListener("message", (ev) => {
    if (!audFrame || ev.source !== audFrame.contentWindow) return;
    if (ev.data === "ccu-aud-ready") { audReady = true; if (mode === "wait") revealAud(); }
    else if (ev.data === "universe-hub") backFromAud();
  });

  function finish(kind) {
    if (mode === "done" || mode === "parked") return;
    mode = "done";
    cancelAnimationFrame(raf);
    raf = 0;
    if (kind === "icu") {
      const btn = document.getElementById("icu-enter");
      if (btn) btn.click();
    } else if (kind === "aud") {
      revealAud();
    } else if (kind === "rad" || MODFOR[kind]) {
      location.href = "radiology.html?v=20261122r3" + (MODFOR[kind] ? "&mod=" + MODFOR[kind] : "");
    } else if (kind === "micro") {
      location.href = "microbiology.html?v=20261119g";
    } else {
      location.href = "pathology-live.html?v=20261119g";
    }
  }

  window.returnToHall = function () {
    clearTimeout(leaveTimer);
    if (window.ccuWelcome) window.ccuWelcome("hub");
    window.hallLock = Date.now() + 900;
    mode = "look";
    job = null;
    yaw = 0;
    pit = 0;
    eye.set(0, 1.62, 0);
    try { ALLDOORS.forEach(shut); } catch (err) {}
    backB.style.display = "none";
    if (fade) fade.style.opacity = "0";
    document.body.classList.add("icu-gate");
    document.body.classList.remove("icu-open", "in", "enter", "inside", "lab", "arena", "osce", "reference", "picking", "body-only");
    const room = document.getElementById("room");
    if (room) room.innerHTML = "";
    const gl = renderer.getContext();
    if (!gl || gl.isContextLost()) {
      location.replace(location.pathname);
      return;
    }
    fit();
    try { placeCamera(); renderer.render(scene, camera); } catch (err) {
      location.replace(location.pathname);
      return;
    }
    window.doorChosen = false;
    if (window.playHubVoice) window.playHubVoice();
    if (window.stopWave) window.stopWave();
    raf = 0;
    frame();
  };

  /* a point inside a room, given in the room's own frame (x across, z away from the hall) */
  const loc = (k, lx, lz) => { const th = THETA[k], d = DOORS[k], c = Math.cos(th), sn = Math.sin(th), z = lz + 0.18; return new THREE.Vector3(d.position.x + lx * c + z * sn, 1.62, d.position.z - lx * sn + z * c); };
  const STAND = { micro: 3.9, path: 3.0, icu: 2.9, rad: 1.8 };
  const setDoor = (d, o) => { d.userData.open = o; d.userData.left.position.x = -0.48 - o * SLIDE; d.userData.right.position.x = 0.48 + o * SLIDE; };
  const backB = document.createElement("button");
  backB.type = "button"; backB.id = "lobby-back"; backB.textContent = "Back to the hall";
  backB.style.cssText = "position:absolute;z-index:4;top:calc(10px + env(safe-area-inset-top));left:12px;min-height:40px;padding:0 14px;border:0;border-radius:999px;background:#14181c;color:#f3efe6;font:500 14px system-ui,sans-serif;display:none;cursor:pointer";
  gate.appendChild(backB);

  function choose(kind) {
    if (mode === "passage" && ROOMKIND.has(kind)) { enterRoom(kind); return; }
    if (mode !== "look" || !DOORS[kind]) return;
    mode = "go";
    window.doorChosen = true;
    clearTimeout(window.hubVoiceTimer);
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => finish(kind), calm ? 40 : kind === "aud" ? 6500 : kind === "rad" ? 60000 : 16000);
    const door = DOORS[kind], face = THETA[kind], reach = kind === "aud" ? APO + 1.7 : APO + 0.7;
    if (kind === "aud") {
      const dest = new THREE.Vector3(Math.sin(face) * reach, 1.62, Math.cos(face) * reach);
      job = { kind, door, face, dest, t: 0, snd: false };
      prepareAud(face);
    } else {
      job = { kind, door, face, t: 0, snd: false, speed: 2.7, hold: 0, holdFor: kind === "rad" ? 0 : 1.5, path: [loc(kind, 0, -1.0), loc(kind, 0, 1.0), loc(kind, 0, STAND[kind])], seg: 0, then: kind === "rad" ? "passage" : "finish" };
    }
    if (calm) finish(kind);
    if (kind === "icu" && window.playIcuVoice) window.playIcuVoice();
  }
  /* from the passage into one of its four rooms: along the passage, through the doorway, to the machine */
  function enterRoom(k) {
    const d = R.PASS.doors[k], W = R.PASS.W, side = d.side;
    mode = "go"; backB.style.display = "none"; window.doorChosen = true;
    clearTimeout(leaveTimer); leaveTimer = setTimeout(() => finish(k), calm ? 40 : 40000);
    const path = side ? [loc("rad", 0, d.z), loc("rad", side * (W / 2 + 0.3), d.z), loc("rad", side * (W / 2 + 1.0), d.z)] : [loc("rad", 0, d.z + 0.2), loc("rad", 0, d.z + 1.4)];
    job = { kind: k, door: DOORS.rad, face: THETA.rad, t: 1, snd: true, walking: true, speed: 2.3, hold: 0, holdFor: 1.7, path, seg: 0, then: "finish" };
    if (calm) finish(k);
  }
  function backToHall() {
    if (mode !== "passage") return;
    mode = "go"; backB.style.display = "none";
    job = { kind: "rad", door: DOORS.rad, face: THETA.rad + Math.PI, t: 1, snd: true, walking: true, speed: 2.8, hold: 0, holdFor: 0, path: [loc("rad", 0, -0.9), new THREE.Vector3(0, 1.62, 0)], seg: 0, then: "hall" };
    DOORS.rad.userData.open = 1;
  }
  backB.addEventListener("click", backToHall);
  /* walking in the radiology passage: the position is kept inside the passage (local x across, z along), sliding along its walls */
  let holdDir = 0, lastVMove = 0;
  function walkPassage(dist) {
    if (mode !== "passage") return;
    const th = THETA.rad, dr = DOORS.rad, c = Math.cos(th), sn = Math.sin(th);
    let nx = eye.x + Math.sin(yaw) * dist, nz = eye.z + Math.cos(yaw) * dist;
    const dx = nx - dr.position.x, dz = nz - dr.position.z, W = R.PASS.W, D = R.PASS.D;
    const lx = Math.max(-(W / 2 - 0.55), Math.min(W / 2 - 0.55, dx * c - dz * sn)), lz = Math.max(0.7, Math.min(D - 0.9, dx * sn + dz * c - 0.18));
    const p = loc("rad", lx, lz); eye.x = p.x; eye.z = p.z;
  }
  addEventListener("keydown", (ev) => {
    if (mode !== "passage" || /INPUT|SELECT|TEXTAREA/.test((ev.target || {}).tagName || "")) return;
    const k = ev.key;
    if (k === "ArrowUp" || k === "w" || k === "W") walkPassage(0.45); else if (k === "ArrowDown" || k === "s" || k === "S") walkPassage(-0.45);
    else if (k === "ArrowLeft" || k === "a" || k === "A") yaw -= 0.12; else if (k === "ArrowRight" || k === "d" || k === "D") yaw += 0.12; else return;
    ev.preventDefault();
  });
  canvas.addEventListener("wheel", (ev) => { if (mode !== "passage") return; ev.preventDefault(); walkPassage(-Math.max(-120, Math.min(120, ev.deltaY)) * 0.004); }, { passive: false });
  const turnTo = (a, rate) => { const raw = a - yaw; yaw += Math.atan2(Math.sin(raw), Math.cos(raw)) * rate; };

  canvas.addEventListener("pointerdown", (ev) => {
    if (Date.now() < (window.hallLock || 0)) return;
    sfx.unlock();
    dragging = true;
    holdDir = 0;
    moved = 0;
    lastX = ev.clientX;
    lastY = ev.clientY;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!dragging || (mode !== "look" && mode !== "passage")) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    lastX = ev.clientX;
    lastY = ev.clientY;
    yaw += dx * 0.012;
    /* in the radiology passage a finger swipe up or down walks you along it, as in the auditorium; sideways turns */
    if (mode === "passage" && Math.abs(dy) >= Math.abs(dx) * 0.5) {
      walkPassage(-dy * 0.014);
      if (Math.abs(dy) >= 1) { holdDir = dy < 0 ? 1 : -1; lastVMove = performance.now(); }
      pit += (0 - pit) * 0.2;
    } else pit = Math.max(-0.45, Math.min(0.35, pit - dy * 0.004));
  });
  canvas.addEventListener("pointercancel", () => { dragging = false; holdDir = 0; });
  canvas.addEventListener("pointerup", (ev) => {
    dragging = false; holdDir = 0;
    if (Date.now() < (window.hallLock || 0)) return;
    if (moved > 12 || (mode !== "look" && mode !== "passage")) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects(scene.children, true);
    if (mode === "passage") { const h = hits.find((x) => x.object.userData && ROOMKIND.has(x.object.userData.kind)); if (h) choose(h.object.userData.kind); return; }
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
    if (mode === "done") { raf = 0; return; }
    step();
    if (mode === "done") { raf = 0; return; }
    raf = requestAnimationFrame(frame);
  }
  let tAmb = 0;
  function ambient(dt) {
    if (calm) return;
    tAmb += dt;
    R.update(tAmb);
    ring.rotation.y = tAmb * 0.12;
    const m = motes.geometry.attributes.position;
    for (let i = 0; i < m.count; i++) {
      m.setY(i, m.getY(i) + Math.sin(tAmb * 0.6 + i) * 0.0012);
      m.setX(i, m.getX(i) + Math.cos(tAmb * 0.4 + i * 1.7) * 0.0010);
    }
    m.needsUpdate = true;
    ALLDOORS.forEach((d, i) => {
      const k = 0.5 + 0.5 * Math.sin(tAmb * 1.6 + i * 1.26);
      d.userData.glow[0].material.opacity = 0.42 + 0.3 * k;
    });
  }
  function step() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (dragging && holdDir && mode === "passage" && moved > 10 && performance.now() - lastVMove > 120) walkPassage(holdDir * dt * 1.7);
    if (arrive) {
      const d = DOORS.aud;
      arrive.t += dt;
      const k = Math.min(1, arrive.t / 2.0), e = 1 - Math.pow(1 - k, 2.2);
      eye.set(arrive.start.x * (1 - e), 1.62, arrive.start.z * (1 - e));
      if (arrive.t > 0.5) {
        if (!arrive.shut) { arrive.shut = true; sfx.door(false, { x: d.position.x, z: d.position.z }, 1.0); }
        const o = Math.max(0, 1 - (arrive.t - 0.5) * 1.6);
        d.userData.open = o; d.userData.left.position.x = -0.48 - o * SLIDE; d.userData.right.position.x = 0.48 + o * SLIDE;
      }
      if (k >= 1) { shut(d); if (fade) { fade.style.opacity = "0"; fade.style.transition = ""; } document.documentElement.classList.remove("arriving"); if (window.ccuSnapOff) window.ccuSnapOff(); arrive = null; mode = "look"; window.doorChosen = false; }
      placeCamera(); ambient(dt); renderer.render(scene, camera);
      if (window.ccuSnapOff && arrive && !arrive.shown) { arrive.shown = true; requestAnimationFrame(() => requestAnimationFrame(() => window.ccuSnapOff && window.ccuSnapOff())); }
      return;
    }
    if (job && job.path) {                                          /* walking to a room: turn, let the door slide open, walk in, linger a moment, go */
      job.t += dt;
      const d = job.door;
      if (!job.walking) {
        turnTo(job.face, calm ? 1 : 0.14); pit += (0 - pit) * 0.1;
        if (job.t > 0.25) { setDoor(d, Math.min(1, d.userData.open + dt * 1.8)); if (!job.snd) { job.snd = true; sfx.setListener(0, 0, yaw); sfx.door(true, { x: d.position.x, z: d.position.z }, 1.3); } }
        if (d.userData.open > 0.96) job.walking = true;
      }
      if (job.walking && !job.arrived) {
        const tgt = job.path[job.seg], dv = tgt.clone().sub(eye); dv.y = 0;
        const dl = dv.length(), stepLen = job.speed * dt;
        if (dl <= stepLen) { eye.x = tgt.x; eye.z = tgt.z; job.seg += 1; if (job.seg >= job.path.length) job.arrived = true; }
        else { eye.addScaledVector(dv.normalize(), stepLen); turnTo(Math.atan2(dv.x, dv.z), 1 - Math.exp(-dt * 5)); }
        if (job.seg >= 2 && job.then !== "hall" && d.userData.open > 0) setDoor(d, Math.max(0, d.userData.open - dt * 1.4));      /* the door closes behind you */
        pit += (0 - pit) * 0.08;
      }
      if (job.arrived) {
        if (job.then === "passage") { mode = "passage"; job = null; backB.style.display = "inline-flex"; if (fade) fade.style.opacity = "0"; window.doorChosen = false; clearTimeout(leaveTimer); setDoor(DOORS.rad, 0); }
        else if (job.then === "hall") { mode = "look"; job = null; window.doorChosen = false; clearTimeout(leaveTimer); setDoor(DOORS.rad, 0); turnTo(THETA.rad + Math.PI, 1); if (fade) fade.style.opacity = "0"; }
        else { job.hold += dt; if (fade) fade.style.opacity = String(Math.min(1, job.hold / Math.max(0.2, job.holdFor))); if (job.hold >= job.holdFor) { finish(job.kind); return; } }
      }
      if (job && job.t > 18) { finish(job.kind); return; }
      placeCamera();
    } else if (job) {
      job.t += dt;
      const raw = job.face - yaw;
      const gap = Math.atan2(Math.sin(raw), Math.cos(raw));
      yaw += gap * (calm ? 1 : 0.14);
      pit += (0 - pit) * 0.1;
      if (job.t > 0.25) { job.door.userData.open = Math.min(1, job.door.userData.open + dt * 1.8); if (!job.snd) { job.snd = true; sfx.setListener(0, 0, yaw); sfx.door(true, { x: job.door.position.x, z: job.door.position.z }, 1.3); } }
      const o = job.door.userData.open;
      job.door.userData.left.position.x = -0.48 - o * SLIDE;
      job.door.userData.right.position.x = 0.48 + o * SLIDE;
      if (o > 0.96) {
        if (job.kind === "aud" && !calm) { const dv = job.dest.clone().sub(eye), dl = dv.length(); if (dl > 0.001) eye.addScaledVector(dv.normalize(), Math.min(dl, dt * 3.0)); }   /* a steady walking pace so the auditorium can be seen */
        else eye.lerp(job.dest, calm ? 1 : 0.08);
      }
      const along = eye.x * Math.sin(job.face) + eye.z * Math.cos(job.face);
      const aud = job.kind === "aud";
      if (fade) fade.style.opacity = aud ? "0" : String(Math.max(0, (along - 3.2) / 2.4));
      if (aud ? (along > 7.25 || job.t > 6) : (along > 5.0 || job.t > 2.4)) {
        finish(job.kind);
        return;
      }
      placeCamera();
    } else {
      placeCamera();
    }
    ambient(dt);
    renderer.render(scene, camera);
  }
  /* coming back from the auditorium: walk in through the Auditorium door, fading up from black, no extra "exiting" step */
  if (/[?&]from=auditorium/.test(location.search) && DOORS.aud) {
    const face = THETA.aud, d = DOORS.aud;
    const pz = readPose();
    const start = pz ? new THREE.Vector3(pz.x, 1.62, pz.z) : new THREE.Vector3(Math.sin(face) * (APO - 2.5), 1.62, Math.cos(face) * (APO - 2.5));
    eye.copy(start); yaw = pz ? pz.yaw : face + Math.PI; pit = 0;
    d.userData.open = 1; d.userData.left.position.x = -0.48 - SLIDE; d.userData.right.position.x = 0.48 + SLIDE;
    mode = "arrive"; arrive = { t: 0, start, snd: false, shut: false };
    if (fade) { fade.style.transition = "none"; fade.style.opacity = "0"; }
  }
  window.__hubLobby = { R, scene, camera, choose, backToHall, teleport: (x, z, a, p) => { eye.set(x, 1.62, z); yaw = a || 0; pit = p || 0; }, loc, eye, setYaw: (v) => { yaw = v; }, getYaw: () => yaw, mode: () => mode, THETA, openDoor: (k) => { const d = DOORS[k]; d.userData.open = 1; d.userData.left.position.x = -0.48 - SLIDE; d.userData.right.position.x = 0.48 + SLIDE; } };
  placeCamera();
  if (window.ccuWelcome) window.ccuWelcome("hub");
  frame();
}
