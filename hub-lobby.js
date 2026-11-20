import * as THREE from "three";
import { createSfx } from "./critical-care-universe/universe/sfx.js?v=20261120j";

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
  scene.fog = new THREE.Fog(0x0a1626, 18, 34);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.08, 44);
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
    /* the light that spills out when it opens */
    const [pc, pg] = cnv(64, 128);
    const gr = pg.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "#d3dbe5"); gr.addColorStop(0.5, "#4a5462"); gr.addColorStop(1, "#080d14");
    pg.fillStyle = gr; pg.fillRect(0, 0, 64, 128);
    const portalTex = tex(pc);
    if (kind !== "aud") {                     /* the Auditorium door opens onto the real auditorium (see buildAudBeyond) */
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.3), new THREE.MeshBasicMaterial({ map: portalTex, side: THREE.DoubleSide }));
      portal.position.set(0, 1.25, 0.2); portal.rotation.y = Math.PI;
      g.add(portal);
    }
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

  /* What lies behind the Auditorium door: the auditorium itself, laid out like the real one (same seat blocks, central aisle,
     LED banners and the Command Centre door at the far end), so opening the door shows the seats at once.
     Door-local frame: +z leads away from the hall; x = (auditorium x) + 19.5, z = (auditorium z) + 21 (+0.18 for the wall plane). */
  function buildAudBeyond() {
    const g = new THREE.Group(); g.position.z = 0.18;
    const B = (c) => new THREE.MeshBasicMaterial({ color: c });
    const X0 = -2.5, X1 = 10.9, Z1 = 16, H = 7.0, W = X1 - X0, CX = 4.2;
    const plane = (w, h, mat, x, y, z, ry, rx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry || 0; m.rotation.x = rx || 0; g.add(m); return m; };
    const bx = (w, h, d, mat, x, y, z) => box(w, h, d, mat, x, y, z, g);
    /* floor with the lit aisle */
    const [fc, fgx] = cnv(256, 512);
    const fgr = fgx.createLinearGradient(0, 0, 0, 512); fgr.addColorStop(0, "#0b1826"); fgr.addColorStop(1, "#060b12");
    fgx.fillStyle = fgr; fgx.fillRect(0, 0, 256, 512);
    fgx.strokeStyle = "rgba(80,160,220,.10)"; fgx.lineWidth = 2;
    for (let i = 0; i <= 14; i++) { fgx.beginPath(); fgx.moveTo(i * 256 / 14, 0); fgx.lineTo(i * 256 / 14, 512); fgx.stroke(); }
    for (let j = 0; j <= 17; j++) { fgx.beginPath(); fgx.moveTo(0, j * 512 / 17); fgx.lineTo(256, j * 512 / 17); fgx.stroke(); }
    fgx.strokeStyle = "#36d6ff"; fgx.shadowColor = "#36d6ff"; fgx.shadowBlur = 10; fgx.lineWidth = 5;
    fgx.beginPath(); fgx.moveTo((CX - X0) / W * 256, 0); fgx.lineTo((CX - X0) / W * 256, 512); fgx.stroke();
    plane(W, Z1, new THREE.MeshBasicMaterial({ map: tex(fc) }), (X0 + X1) / 2, 0.002, Z1 / 2, 0, -Math.PI / 2);
    plane(W, Z1, B(0x0b1118), (X0 + X1) / 2, H, Z1 / 2, 0, Math.PI / 2);
    /* walls */
    const wall = B(0x1a2733);
    plane(Z1, H, wall, X0, H / 2, Z1 / 2, Math.PI / 2); plane(Z1, H, wall, X1, H / 2, Z1 / 2, -Math.PI / 2); plane(W, H, wall, (X0 + X1) / 2, H / 2, Z1, Math.PI);
    const cyan = B(0x36d6ff), dim = B(0x2aa7d6);
    for (let k = 0; k < 8; k++) { const z = 1.2 + k * 2.1; bx(0.05, 5.6, 0.06, dim, X0 + 0.04, 3.4, z); bx(0.05, 5.6, 0.06, dim, X1 - 0.04, 3.4, z); }
    bx(0.06, 0.06, Z1, cyan, X0 + 0.05, 6.4, Z1 / 2); bx(0.06, 0.06, Z1, cyan, X1 - 0.05, 6.4, Z1 / 2);
    bx(0.05, 0.05, Z1, dim, X0 + 0.04, 0.07, Z1 / 2); bx(0.05, 0.05, Z1, dim, X1 - 0.04, 0.07, Z1 / 2);
    /* LED banners on the side walls */
    const [bc, bg] = cnv(1024, 300), bgr = bg.createLinearGradient(0, 0, 1024, 0); bgr.addColorStop(0, "#06182a"); bgr.addColorStop(1, "#0a2a46");
    bg.fillStyle = bgr; bg.fillRect(0, 0, 1024, 300); bg.strokeStyle = "rgba(54,214,255,.5)"; bg.lineWidth = 4; bg.strokeRect(8, 8, 1008, 284);
    bg.fillStyle = "#eaf6ff"; bg.font = "800 92px Figtree, system-ui, sans-serif"; bg.textAlign = "center"; bg.textBaseline = "middle"; bg.fillText("CRITICAL CARE UNIVERSE", 512, 130);
    bg.fillStyle = "#36d6ff"; bg.font = "600 40px Figtree, system-ui, sans-serif"; bg.fillText("Learn · Simulate · Decide · Together", 512, 232);
    const bm = new THREE.MeshBasicMaterial({ map: tex(bc) });
    plane(6.4, 6.4 * 300 / 1024, bm, X0 + 0.06, 3.5, 8, Math.PI / 2); plane(6.4, 6.4 * 300 / 1024, bm, X1 - 0.06, 3.5, 8, -Math.PI / 2);
    /* ceiling rings and bars */
    [[3.4, 0.07, 0x36d6ff], [2.2, 0.05, 0xeaf6ff], [4.6, 0.05, 0x2a7fb8]].forEach(([r, t, c]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 64), B(c)); m.position.set(CX, 6.88, 8); m.rotation.x = Math.PI / 2; g.add(m); });
    for (let i = -2; i <= 2; i++) bx(0.12, 0.04, 14, B(0xeaf6ff), CX + i * 2.6, 6.94, 8);
    /* seat blocks, exactly where the real ones are */
    const n = 40, sb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.09, 0.48), B(0x24384a), n), sk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.56, 0.08), B(0x1d6f8f), n), sl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.08, 0.42, 8), B(0x6c7e90), n);
    const m4 = new THREE.Matrix4(); let q = 0;
    for (const side of [-1, 1]) for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const x = CX + side * (3.15 + c * 0.6), z = 13.6 - r * 1.35;
      m4.makeTranslation(x, 0.45, z); sb.setMatrixAt(q, m4); m4.makeTranslation(x, 0.75, z + 0.24); sk.setMatrixAt(q, m4); m4.makeTranslation(x, 0.21, z); sl.setMatrixAt(q, m4); q++;
    }
    [sb, sk, sl].forEach((m) => g.add(m));
    /* the Command Centre door at the far end */
    bx(2.5, 3.1, 0.08, B(0x070b10), CX, 1.55, Z1 - 0.05); bx(2.5, 0.05, 0.06, cyan, CX, 3.12, Z1 - 0.1); bx(0.05, 3.1, 0.06, cyan, CX - 1.25, 1.55, Z1 - 0.1); bx(0.05, 3.1, 0.06, cyan, CX + 1.25, 1.55, Z1 - 0.1);
    const [sc, sg] = cnv(768, 200); sg.fillStyle = "#0a1626"; sg.fillRect(0, 0, 768, 200); sg.strokeStyle = "#4aa8ff"; sg.lineWidth = 8; sg.strokeRect(4, 4, 760, 192);
    sg.fillStyle = "#fff"; sg.font = "800 74px Figtree, system-ui, sans-serif"; sg.textAlign = "center"; sg.textBaseline = "middle"; sg.fillText("COMMAND CENTRE", 400, 92);
    sg.fillStyle = "#4aa8ff"; sg.font = "600 34px Figtree, system-ui, sans-serif"; sg.fillText("Live ICU monitors", 400, 152);
    plane(3.9, 3.9 * 200 / 768, new THREE.MeshBasicMaterial({ map: tex(sc) }), CX, 3.9, Z1 - 0.12, Math.PI);
    return g;
  }
  DOORS.aud.add(buildAudBeyond());
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

  function finish(kind) {
    if (mode === "done") return;
    mode = "done";
    cancelAnimationFrame(raf);
    raf = 0;
    if (kind === "icu") {
      const btn = document.getElementById("icu-enter");
      if (btn) btn.click();
    } else if (kind === "aud") {
      location.href = "critical-care-universe/index.html?home=1&to=auditorium&v=20261120j";
    } else if (kind === "rad") {
      location.href = "radiology.html?v=20261119r2";
    } else if (kind === "micro") {
      location.href = "microbiology.html?v=20261119g";
    } else {
      location.href = "pathology-live.html?v=20261119g";
    }
  }

  window.returnToHall = function () {
    clearTimeout(leaveTimer);
    window.hallLock = Date.now() + 900;
    mode = "look";
    job = null;
    yaw = 0;
    pit = 0;
    eye.set(0, 1.62, 0);
    try { ALLDOORS.forEach(shut); } catch (err) {}
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

  function choose(kind) {
    if (mode !== "look") return;
    mode = "go";
    window.doorChosen = true;
    clearTimeout(window.hubVoiceTimer);
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => finish(kind), calm ? 40 : kind === "aud" ? 6500 : 1800);
    const door = DOORS[kind], face = THETA[kind], reach = kind === "aud" ? APO + 1.7 : APO + 0.7;
    const dest = new THREE.Vector3(Math.sin(face) * reach, 1.62, Math.cos(face) * reach);
    job = { kind, door, face, dest, t: 0, snd: false };
    if (calm) finish(kind);
    if (kind === "icu" && window.playIcuVoice) window.playIcuVoice();
  }

  canvas.addEventListener("pointerdown", (ev) => {
    if (Date.now() < (window.hallLock || 0)) return;
    sfx.unlock();
    dragging = true;
    moved = 0;
    lastX = ev.clientX;
    lastY = ev.clientY;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!dragging || mode !== "look") return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    lastX = ev.clientX;
    lastY = ev.clientY;
    yaw += dx * 0.012;
    pit = Math.max(-0.45, Math.min(0.35, pit - dy * 0.004));
  });
  canvas.addEventListener("pointerup", (ev) => {
    dragging = false;
    if (Date.now() < (window.hallLock || 0)) return;
    if (moved > 12 || mode !== "look") return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects(scene.children, true);
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
    if (arrive) {
      const d = DOORS.aud;
      arrive.t += dt;
            if (fade) fade.style.opacity = String(Math.max(0, 1 - arrive.t / 0.5));
      const k = Math.min(1, arrive.t / 2.0), e = 1 - Math.pow(1 - k, 2.2);
      eye.set(arrive.start.x * (1 - e), 1.62, arrive.start.z * (1 - e));
      if (arrive.t > 0.5) {
        if (!arrive.shut) { arrive.shut = true; sfx.door(false, { x: d.position.x, z: d.position.z }, 1.0); }
        const o = Math.max(0, 1 - (arrive.t - 0.5) * 1.6);
        d.userData.open = o; d.userData.left.position.x = -0.48 - o * 0.85; d.userData.right.position.x = 0.48 + o * 0.85;
      }
      if (k >= 1) { shut(d); if (fade) { fade.style.opacity = "0"; fade.style.transition = ""; } arrive = null; mode = "look"; window.doorChosen = false; }
      placeCamera(); ambient(dt); renderer.render(scene, camera); return;
    }
    if (job) {
      job.t += dt;
      const raw = job.face - yaw;
      const gap = Math.atan2(Math.sin(raw), Math.cos(raw));
      yaw += gap * (calm ? 1 : 0.14);
      pit += (0 - pit) * 0.1;
      if (job.t > 0.25) { job.door.userData.open = Math.min(1, job.door.userData.open + dt * 1.8); if (!job.snd) { job.snd = true; sfx.setListener(0, 0, yaw); sfx.door(true, { x: job.door.position.x, z: job.door.position.z }, 1.3); } }
      const o = job.door.userData.open;
      job.door.userData.left.position.x = -0.48 - o * 0.85;
      job.door.userData.right.position.x = 0.48 + o * 0.85;
      if (o > 0.45) {
        if (job.kind === "aud" && !calm) { const dv = job.dest.clone().sub(eye), dl = dv.length(); if (dl > 0.001) eye.addScaledVector(dv.normalize(), Math.min(dl, dt * 3.0)); }   /* a steady walking pace so the auditorium can be seen */
        else eye.lerp(job.dest, calm ? 1 : 0.08);
      }
      const along = eye.x * Math.sin(job.face) + eye.z * Math.cos(job.face);
      const aud = job.kind === "aud";
      if (fade) fade.style.opacity = String(aud ? Math.max(0, (along - 6.5) / 0.8) : Math.max(0, (along - 3.2) / 2.4));
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
    const start = new THREE.Vector3(Math.sin(face) * (APO - 2.5), 1.62, Math.cos(face) * (APO - 2.5));
    eye.copy(start); yaw = face + Math.PI; pit = 0;
    d.userData.open = 1; d.userData.left.position.x = -0.48 - 0.85; d.userData.right.position.x = 0.48 + 0.85;
    mode = "arrive"; arrive = { t: 0, start, snd: false, shut: false };
    if (fade) { fade.style.transition = "none"; fade.style.opacity = "1"; }
  }
  placeCamera();
  frame();
}
