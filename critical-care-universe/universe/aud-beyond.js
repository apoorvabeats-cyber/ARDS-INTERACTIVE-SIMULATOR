/* The auditorium as seen through one of its two side gates, for the hub page and the Nexus hall page.
   Both of those rooms are separate pages, so each carries this light replica (unlit, cheap) of the real auditorium in
   critical-care-universe/universe/command3d.js: same size, same three doors, same seat blocks, banners and lit floor lanes.
   ccuAudBeyond(THREE, "W" | "E") returns a group in AUDITORIUM coordinates (x -22..-8.6, z -21..-5, y up).
   "W": seen from the hub, which lies beyond the west wall. "E": seen from the Nexus hall, beyond the east wall.
   The caller rotates and moves the group into its own room's frame. Decorative. */
(function () {
  "use strict";
  window.ccuAudBeyond = function (THREE, gate) {
    const AU = { x0: -22, x1: -8.6, z0: -21, z1: -5, h: 7.0 }, cxA = (AU.x0 + AU.x1) / 2, ZC = -17, AW = AU.x1 - AU.x0, AD = AU.z1 - AU.z0;
    const g = new THREE.Group();
    const B = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, side: THREE.DoubleSide }, o || {}));
    const cnv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
    const tex = (c) => { const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const box = (w, h, d, mat, x, y, z, par) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (par || g).add(m); return m; };
    const plane = (w, h, mat, x, y, z, ry, rx, par) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry || 0; m.rotation.x = rx || 0; (par || g).add(m); return m; };
    const cyan = B(0x36d6ff), dim = B(0x2aa7d6), white = B(0xeaf6ff);
    const ACC = { hub: "#27e0b0", exit: "#ffb347", team: "#c07bff", cmd: "#4aa8ff" };

    /* floor: dark glass with a lit trunk from the command-centre door, a junction, and a lane to each of the three gates */
    const FW = 256, FH = Math.round(256 * AD / AW), [fc, fg] = cnv(FW, FH);
    const px = (x) => (x - AU.x0) / AW * FW, py = (z) => (z - AU.z0) / AD * FH;
    const gr = fg.createLinearGradient(0, 0, 0, FH); gr.addColorStop(0, "#0a1522"); gr.addColorStop(1, "#060b12"); fg.fillStyle = gr; fg.fillRect(0, 0, FW, FH);
    fg.strokeStyle = "rgba(80,160,220,.09)"; fg.lineWidth = 1;
    for (let i = 0; i <= 13; i++) { fg.beginPath(); fg.moveTo(i * FW / 13.4, 0); fg.lineTo(i * FW / 13.4, FH); fg.stroke(); }
    for (let j = 0; j <= 16; j++) { fg.beginPath(); fg.moveTo(0, j * FH / 16); fg.lineTo(FW, j * FH / 16); fg.stroke(); }
    fg.lineCap = "round"; fg.lineJoin = "round";
    const lane = (col, pts) => { fg.strokeStyle = col; fg.shadowColor = col; fg.shadowBlur = 6; fg.lineWidth = 2.6; fg.beginPath(); pts.forEach((q, i) => (i ? fg.lineTo(px(q[0]), py(q[1])) : fg.moveTo(px(q[0]), py(q[1])))); fg.stroke(); };
    lane("#36d6ff", [[cxA, -5.6], [cxA, -14.2]]); lane(ACC.exit, [[cxA, -14.2], [cxA, -19.2]]);
    lane(ACC.hub, [[cxA, -14.2], [cxA, ZC], [AU.x0 + 1.9, ZC]]); lane(ACC.team, [[cxA, ZC], [AU.x1 - 1.9, ZC]]);
    fg.shadowBlur = 0;
    [["hub", AU.x0 + 1.4, ZC], ["exit", cxA, -19.6], ["team", AU.x1 - 1.4, ZC]].forEach(([k, x, z]) => { fg.fillStyle = ACC[k] + "33"; fg.beginPath(); fg.arc(px(x), py(z), 1.15 / AW * FW, 0, 7); fg.fill(); fg.strokeStyle = ACC[k]; fg.lineWidth = 1.6; fg.stroke(); });
    plane(AW, AD, new THREE.MeshBasicMaterial({ map: tex(fc) }), cxA, 0.002, (AU.z0 + AU.z1) / 2, 0, -Math.PI / 2);
    plane(AW, AD, B(0x0b1118), cxA, AU.h, (AU.z0 + AU.z1) / 2, 0, Math.PI / 2);

    /* the four walls in dark slats; the gate we look through has a 3.0 x 4.4 opening and a short dark tunnel */
    const wall = B(0x1a2733), zm = (AU.z0 + AU.z1) / 2;
    const wallZ = (z, ry) => plane(AW, AU.h, wall, cxA, AU.h / 2, z, ry);
    wallZ(AU.z0, 0); wallZ(AU.z1, Math.PI);
    const wallX = (x, ry, holed) => {
      if (!holed) { plane(AD, AU.h, wall, x, AU.h / 2, zm, ry); return; }
      const a = AU.z0, b = ZC - 1.5, c = ZC + 1.5, d = AU.z1;
      plane(b - a, AU.h, wall, x, AU.h / 2, (a + b) / 2, ry); plane(d - c, AU.h, wall, x, AU.h / 2, (c + d) / 2, ry); plane(3.0, AU.h - 4.4, wall, x, (AU.h + 4.4) / 2, ZC, ry);
      const out = gate === "W" ? -1 : 1, dk = B(0x0a0f14);
      plane(0.7, 4.4, dk, x + out * 0.35, 2.2, ZC - 1.5, 0); plane(0.7, 4.4, dk, x + out * 0.35, 2.2, ZC + 1.5, 0);
      plane(0.7, 3.0, dk, x + out * 0.35, 4.4, ZC, Math.PI / 2, Math.PI / 2);
    };
    wallX(AU.x0, Math.PI / 2, gate === "W"); wallX(AU.x1, -Math.PI / 2, gate === "E");
    for (let k = 0; k < 8; k++) { const z = AU.z0 + 1.2 + k * 2.1; if (Math.abs(z - ZC) < 1.9) continue; box(0.05, 5.6, 0.06, dim, AU.x0 + 0.04, 3.4, z); box(0.05, 5.6, 0.06, dim, AU.x1 - 0.04, 3.4, z); }
    box(AW, 0.06, 0.06, cyan, cxA, 6.4, AU.z0 + 0.05); box(0.06, 0.06, AD, cyan, AU.x0 + 0.05, 6.4, zm); box(0.06, 0.06, AD, cyan, AU.x1 - 0.05, 6.4, zm);
    box(AW, 0.05, 0.05, dim, cxA, 0.07, AU.z0 + 0.04); box(0.05, 0.05, AD, dim, AU.x0 + 0.04, 0.07, zm); box(0.05, 0.05, AD, dim, AU.x1 - 0.04, 0.07, zm);

    /* LED banners on the side walls */
    const [bc, bg] = cnv(1024, 300), bgr = bg.createLinearGradient(0, 0, 1024, 0); bgr.addColorStop(0, "#06182a"); bgr.addColorStop(1, "#0a2a46");
    bg.fillStyle = bgr; bg.fillRect(0, 0, 1024, 300); bg.strokeStyle = "rgba(54,214,255,.5)"; bg.lineWidth = 4; bg.strokeRect(8, 8, 1008, 284);
    bg.fillStyle = "#eaf6ff"; bg.font = "800 92px Figtree, system-ui, sans-serif"; bg.textAlign = "center"; bg.textBaseline = "middle"; bg.fillText("CRITICAL CARE UNIVERSE", 512, 130);
    bg.fillStyle = "#36d6ff"; bg.font = "600 40px Figtree, system-ui, sans-serif"; bg.fillText("Learn · Simulate · Decide · Together", 512, 232);
    const bm = new THREE.MeshBasicMaterial({ map: tex(bc), side: THREE.DoubleSide });
    plane(6.4, 6.4 * 300 / 1024, bm, AU.x0 + 0.06, 3.5, -9.2, Math.PI / 2); plane(6.4, 6.4 * 300 / 1024, bm, AU.x1 - 0.06, 3.5, -9.2, -Math.PI / 2);
    [[3.4, 0.07, 0x36d6ff], [2.2, 0.05, 0xeaf6ff], [4.6, 0.05, 0x2a7fb8]].forEach(([r, t, c]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 64), B(c)); m.position.set(cxA, 6.88, -13); m.rotation.x = Math.PI / 2; g.add(m); });
    for (let i = -2; i <= 2; i++) box(0.12, 0.04, 14, white, cxA + i * 2.6, 6.94, -13);

    /* the doors: dark leaves in an accent frame, with the same signs as the real ones. ry turns the door to face into the room. */
    const sign = (k, title, sub) => { const [c, x] = cnv(768, 200); x.fillStyle = "#06101a"; x.fillRect(0, 0, 768, 200); x.strokeStyle = ACC[k]; x.lineWidth = 5; x.strokeRect(5, 5, 758, 190);
      x.fillStyle = "#e4f6ff"; x.textAlign = "center"; x.textBaseline = "middle"; let fs = 54; x.font = "700 " + fs + "px Figtree, system-ui, sans-serif"; while (x.measureText(title).width > 700 && fs > 24) { fs -= 2; x.font = "700 " + fs + "px Figtree, system-ui, sans-serif"; }
      x.fillText(title, 384, 80); x.fillStyle = ACC[k]; x.font = "500 30px Figtree, system-ui, sans-serif"; x.fillText(sub, 384, 142); return tex(c); };
    const door = (k, x, z, ry, w, h, title, sub) => {
      const d = new THREE.Group(); d.position.set(x, 0, z); d.rotation.y = ry; g.add(d);
      const col = new THREE.Color(ACC[k]);
      box(w, h, 0.06, B(0x070b10), 0, h / 2, 0.02, d); box(w, 0.06, 0.08, B(col.getHex()), 0, h, 0.06, d); box(0.06, h, 0.08, B(col.getHex()), -w / 2, h / 2, 0.06, d); box(0.06, h, 0.08, B(col.getHex()), w / 2, h / 2, 0.06, d);
      box(0.03, h, 0.05, white, 0, h / 2, 0.08, d);
      plane(3.9, 3.9 * 200 / 768, new THREE.MeshBasicMaterial({ map: sign(k, title, sub), side: THREE.DoubleSide }), 0, h + 1.05, 0.06, 0, 0, d);
    };
    door("cmd", cxA, AU.z1 - 0.02, Math.PI, 2.4, 3.0, "COMMAND CENTRE", "Live ICU monitors");
    door("exit", cxA, AU.z0 + 0.02, 0, 3.0, 4.4, "EXIT", "Step outside to the garden");
    if (gate === "W") door("team", AU.x1 - 0.02, ZC, -Math.PI / 2, 3.0, 4.4, "MULTIDISCIPLINARY TEAM", "Case conference room");
    else door("hub", AU.x0 + 0.02, ZC, Math.PI / 2, 3.0, 4.4, "CRITICAL CARE HUB", "Simulators, labs and atlases");

    /* seat blocks, exactly where the real ones are */
    const n = 40, sb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.09, 0.48), B(0x24384a), n), sk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.56, 0.08), B(0x1d6f8f), n), sl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.08, 0.42, 8), B(0x7f93a6), n);
    const m4 = new THREE.Matrix4(); let q = 0;
    for (const side of [-1, 1]) for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const x = cxA + side * (3.15 + c * 0.6), z = -7.4 - r * 1.35;
      m4.makeTranslation(x, 0.45, z); sb.setMatrixAt(q, m4); m4.makeTranslation(x, 0.75, z + 0.24); sk.setMatrixAt(q, m4); m4.makeTranslation(x, 0.21, z); sl.setMatrixAt(q, m4); q++;
    }
    [sb, sk, sl].forEach((m) => { m.instanceMatrix.needsUpdate = true; g.add(m); });
    return g;
  };
})();
