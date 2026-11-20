/* The world outside the Critical Care Universe building: an exit door in the auditorium opens onto a curved granite platform,
   five concentric steps lead down to a garden plaza, and behind you the building carries a scrolling LED sign.
   The sky follows the phone's clock (dawn, morning, noon, afternoon, golden hour, sunset, dusk, night); add ?hour=21 to the page address to preview a time.
   Everything is unlit (baked colours multiplied by a time-of-day tint), so it costs little and never leaks light into the interior rooms.
   buildOutdoor(T, scene, { cx, cz }) -> { group, groundY(x,z), clamp(x,z), exitness(x,z), update(t,dt,camPos,visible), info }                       */

export function buildOutdoor(T, S, opt = {}) {
  const LOW = typeof matchMedia === "function" && matchMedia("(pointer:coarse)").matches;
  const cx = opt.cx == null ? -15.3 : opt.cx, cz = opt.cz == null ? -22.2 : opt.cz;
  const R0 = 6.5, STEP = 0.8, NST = 5, DROP = 0.3, RS = R0 + STEP * NST, GY = -DROP * NST, EXITD = 3.4, HB = 10.4;   /* building height */
  const OW = 3.0, OH = 4.4;                                                                                       /* the door opening */
  const rnd = (() => { let s = 91; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  const OUT = new T.Group(); OUT.name = "outdoor"; S.add(OUT);

  /* ---------- time of day ---------- */
  const now = new Date();
  const qs = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(""); } })();
  /* where in the world: from the phone's time zone (Delhi-NCR for India), or ?lat= &lon= to override. Only used to find today's sunrise and sunset. */
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } })();
  const lat = qs.get("lat") !== null ? +qs.get("lat") : /Kolkata|Calcutta/.test(tz) ? 28.6 : /^(Australia|Pacific\/Auckland|America\/(Sao_Paulo|Argentina|Santiago|Lima)|Africa\/(Johannesburg|Maputo))/.test(tz) ? -33 : 30;
  const lon = qs.get("lon") !== null ? +qs.get("lon") : /Kolkata|Calcutta/.test(tz) ? 77.2 : -now.getTimezoneOffset() / 4;
  const sol = (() => {      /* NOAA solar equations: local solar noon, sunrise, sunset (decimal hours on the phone's clock) and the sun's declination */
    const N = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5), g = 2 * Math.PI / 365 * (N - 1 + 0.5), rd = Math.PI / 180;
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const c = (Math.cos(90.833 * rd) - Math.sin(lat * rd) * Math.sin(dec)) / (Math.cos(lat * rd) * Math.cos(dec)), ha = Math.acos(Math.max(-1, Math.min(1, c))) / rd;
    const loc = (utcMin) => (utcMin - now.getTimezoneOffset()) / 60;
    return { noon: loc(720 - 4 * lon - eq), rise: loc(720 - 4 * (lon + ha) - eq), set: loc(720 - 4 * (lon - ha) - eq), dec };
  })();
  const hour = (() => {
    const q = qs.get("hour");
    if (q !== null && q !== "" && !isNaN(+q)) return ((+q % 24) + 24) % 24;
    return now.getHours() + now.getMinutes() / 60;
  })();
  const C = (h) => new T.Color(h);
  const sr = sol.rise, ss = sol.set, nn = sol.noon;
  /* the sky is keyed to today's real sunrise and sunset: hour, sky top, sky horizon, light tint, how night-like (0..1) */
  const K = [[-0.1, 0x050a1c, 0x13233f, 0x5a6fa8, 1], [sr - 1.9, 0x070d24, 0x16264a, 0x5f74ac, 1], [sr - 0.7, 0x1a2858, 0x4a4d86, 0x8f8cb8, 0.8], [sr - 0.1, 0x2f4688, 0xd88f86, 0xc9a2a0, 0.45], [sr + 0.6, 0x4a7fc0, 0xffc08e, 0xffd2ac, 0.15],
    [sr + 2.0, 0x3d8de0, 0xc4e2ff, 0xfff1e0, 0], [nn, 0x2b83e6, 0xa8d4ff, 0xffffff, 0], [ss - 2.6, 0x3b84d6, 0xeed8b4, 0xffe8cc, 0], [ss - 1.1, 0x4a70b8, 0xffb36a, 0xffc88e, 0.04],
    [ss - 0.1, 0x3b3f88, 0xff7c5e, 0xe69a86, 0.3], [ss + 0.7, 0x161e4c, 0x7c4c80, 0x8a7aa8, 0.72], [ss + 1.6, 0x070d24, 0x16264a, 0x5f74ac, 1], [24.1, 0x050a1c, 0x13233f, 0x5a6fa8, 1]];
  const pal = (() => {
    let i = 0; while (i < K.length - 2 && hour > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], f = Math.max(0, Math.min(1, (hour - a[0]) / (b[0] - a[0])));
    return { top: C(a[1]).lerp(C(b[1]), f), hor: C(a[2]).lerp(C(b[2]), f), tint: C(a[3]).lerp(C(b[3]), f), night: a[4] + (b[4] - a[4]) * f };
  })();
  const night = pal.night;
  const phase = night > 0.72 ? "night" : night > 0.18 ? "dusk" : "day";
  const label = hour < sr - 0.7 || hour > ss + 1.2 ? "Night" : hour < sr + 0.6 ? "Dawn" : hour < nn - 1.5 ? "Morning" : hour < ss - 3 ? "Day" : hour < ss - 1.1 ? "Afternoon" : hour < ss ? "Golden hour" : "Dusk";
  const sunT = Math.max(0, Math.min(1, (hour - sr) / Math.max(1, ss - sr))), sunAz = -1.0 + 2.0 * sunT;
  const ha = (hour - nn) * 15 * Math.PI / 180, sunEl = Math.asin(Math.sin(lat * Math.PI / 180) * Math.sin(sol.dec) + Math.cos(lat * Math.PI / 180) * Math.cos(sol.dec) * Math.cos(ha));
  const sunDir = new T.Vector3(Math.sin(sunAz) * Math.cos(Math.max(0, sunEl)), sunEl, -Math.cos(sunAz) * Math.cos(Math.max(0, sunEl))).normalize();
  const nightLen = 24 - (ss - sr), sinceSet = hour >= ss ? hour - ss : hour + 24 - ss, moonT = Math.max(0, Math.min(1, sinceSet / nightLen)), moonEl = Math.sin(moonT * Math.PI) * 0.95 - 0.05;
  const moonDir = new T.Vector3(Math.sin(-0.9 + moonT * 1.8), moonEl, -0.75).normalize();
  const sunCol = C(sunEl < 0.25 ? 0xffa060 : 0xfff2d8);
  const tint = pal.tint;                                                    /* multiplies every unlit surface */
  const mix = (hex, k) => C(hex).multiply(tint).multiplyScalar(k == null ? 1 : k);
  const ctex = (w, h, fn, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); fn(g, w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  const BM = (o) => new T.MeshBasicMaterial(o);
  const add = (geo, mat, x, y, z, par) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); (par || OUT).add(m); return m; };

  /* fog is always present but far away, so the interior rooms are untouched; outdoors it hazes the distance into the horizon colour */
  S.fog = new T.Fog(pal.hor.clone().multiplyScalar(0.92), 60, 235);

  /* ---------- sky dome: gradient, sun, moon, stars ---------- */
  const skyMat = new T.ShaderMaterial({
    uniforms: { top: { value: pal.top }, hor: { value: pal.hor }, sunCol: { value: sunCol }, sunDir: { value: sunDir }, moonDir: { value: moonDir }, night: { value: night }, t: { value: 0 } },
    vertexShader: "varying vec3 vP; void main(){ vP=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }",
    fragmentShader: `uniform vec3 top,hor,sunCol,sunDir,moonDir; uniform float night,t; varying vec3 vP;
      float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){ vec3 d=normalize(vP); float h=d.y;
        vec3 col=mix(hor,top,pow(clamp(h,0.,1.),.55)); col=mix(col,hor*.7,smoothstep(0.,-.3,h));
        float s=max(dot(d,sunDir),0.); float up=smoothstep(-.12,.05,sunDir.y);
        col+=sunCol*(pow(s,900.)*4.+pow(s,30.)*.5+pow(s,5.)*.14)*up;
        float m=max(dot(d,moonDir),0.); col+=vec3(.85,.9,1.)*(smoothstep(.9991,.9995,m)*1.5+pow(m,70.)*.14)*night*step(-.05,moonDir.y);
        vec2 uv=d.xz/(abs(d.y)+.55)*55.; vec2 g=floor(uv); float r=h21(g); float tw=.55+.45*sin(t*1.8+r*50.);
        float st=step(.975,r)*smoothstep(.16,.0,length(fract(uv)-.5))*tw*smoothstep(.04,.35,h);
        col+=vec3(.8,.86,1.)*st*night*night*1.5;
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`, side: T.BackSide, depthWrite: false, fog: false });
  const sky = new T.Mesh(new T.SphereGeometry(140, 32, 20), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; OUT.add(sky);

  /* soft clouds */
  const cloudTex = ctex(256, 128, (g, w, h) => { for (let i = 0; i < 26; i++) { const x = 40 + rnd() * (w - 80), y = 44 + rnd() * (h - 80), r = 18 + rnd() * 30, gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
  const clouds = [];
  for (let i = 0; i < (LOW ? 7 : 11); i++) {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: cloudTex, color: mix(0xffffff, 1).lerp(pal.hor, 0.25), transparent: true, opacity: 0.55 * (1 - night * 0.82), depthWrite: false, fog: false }));
    const a = rnd() * 6.28, r = 95 + rnd() * 30; sp.position.set(Math.sin(a) * r, 22 + rnd() * 34, -Math.abs(Math.cos(a)) * r * 0.9 - 20); sp.scale.set(70 + rnd() * 60, 32 + rnd() * 18, 1); sp.userData.v = 0.4 + rnd() * 0.7; sp.renderOrder = -9; clouds.push(sp); OUT.add(sp);
  }

  /* ---------- ground: grass, a stone plaza, a long path, a pond ---------- */
  const grassTex = ctex(256, 256, (g, w, h) => { g.fillStyle = "#4f9143"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 60 + rnd() * 60; g.fillStyle = "rgba(" + (v * 0.6 | 0) + "," + (v + 70 | 0) + "," + (v * 0.5 | 0) + ",.35)"; g.fillRect(rnd() * w, rnd() * h, 2, 3); } }, [90, 90]);
  add(new T.PlaneGeometry(520, 520), BM({ map: grassTex, color: mix(0xffffff, 0.92) }), cx, GY - 0.02, cz - 120, OUT).rotation.x = -Math.PI / 2;
  const graniteTex = ctex(512, 512, (g, w, h) => {
    g.fillStyle = "#b9bdc2"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) { const v = 150 + rnd() * 80; g.fillStyle = "rgba(" + v + "," + v + "," + (v + 6) + "," + (0.25 + rnd() * 0.25) + ")"; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.strokeStyle = "rgba(70,78,88,.45)"; g.lineWidth = 3; for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let y = 0; y < h; y += 128) { const o = (y / 128) % 2 ? 128 : 0; for (let x = o; x <= w + 128; x += 256) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 128); g.stroke(); } }
  }, [4, 4]);
  const stoneTop = BM({ map: graniteTex, color: mix(0xffffff, 1) }), stoneRiser = BM({ map: graniteTex, color: mix(0xdde2e8, 0.74) });
  /* plaza and path */
  const plazaD = RS + EXITD + 1.2;
  const plaza = add(new T.PlaneGeometry(19, plazaD - RS + 0.4), BM({ map: graniteTex.clone(), color: mix(0xffffff, 0.97) }), cx, GY + 0.004, cz - RS - (plazaD - RS) / 2 + 0.2, OUT); plaza.rotation.x = -Math.PI / 2; plaza.material.map.needsUpdate = true; plaza.material.map.repeat.set(5, 1.4);
  const pathTex = graniteTex.clone(); pathTex.needsUpdate = true; pathTex.repeat.set(1.4, 40);
  add(new T.PlaneGeometry(5.2, 190), BM({ map: pathTex, color: mix(0xe8ecf0, 0.95) }), cx, GY + 0.006, cz - plazaD - 95 + 1, OUT).rotation.x = -Math.PI / 2;
  /* the platform and its five curved steps: half-cylinders stacked from the widest and lowest to the narrowest and highest */
  for (let i = NST; i >= 0; i--) {
    const r = R0 + STEP * i, topY = -DROP * i, h = topY - GY;
    if (h < 0.01) { const land = add(new T.CircleGeometry(r, 64, 0, Math.PI), stoneTop, cx, GY + 0.008, cz, OUT); land.rotation.x = -Math.PI / 2; continue; }
    add(new T.CylinderGeometry(r, r, h, 64, 1, false, Math.PI / 2, Math.PI), [stoneRiser, stoneTop, stoneRiser], cx, GY + h / 2, cz, OUT);
    if (i > 0) { const nose = add(new T.TorusGeometry(r, 0.022, 6, 64, Math.PI), BM({ color: mix(0xffffff, 1.05) }), cx, topY + 0.004, cz, OUT); nose.rotation.x = Math.PI / 2; nose.rotation.z = Math.PI; }
  }
  /* a guiding LED line along the platform edge */
  const edge = add(new T.TorusGeometry(R0 - 0.12, 0.03, 6, 64, Math.PI), BM({ color: C(0x36d6ff).multiplyScalar(1.4), toneMapped: false }), cx, 0.03, cz, OUT); edge.rotation.x = Math.PI / 2; edge.rotation.z = Math.PI;

  /* pond to the left, with a stone rim */
  const pondTex = ctex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, "#5fb6d8"); gr.addColorStop(1, "#2f7f9e"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(w / 2 + (rnd() - 0.5) * 60, h / 2 + (rnd() - 0.5) * 60, 20 + i * 11, 9 + i * 5, 0, 0, 7); g.stroke(); } });
  const pond = add(new T.CircleGeometry(9, 40), BM({ map: pondTex, color: mix(0xdff0ff, 1).lerp(pal.hor, 0.18) }), cx - 24, GY + 0.01, cz - 34, OUT); pond.rotation.x = -Math.PI / 2;
  const rim = add(new T.TorusGeometry(9.15, 0.22, 6, 40), BM({ color: mix(0x9aa1a8, 1) }), cx - 24, GY + 0.1, cz - 34, OUT); rim.rotation.x = Math.PI / 2;

  /* ---------- the building front ---------- */
  const BW = 40, bx0 = cx - BW / 2;
  const facadeTex = ctex(2048, 640, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#dfe3e8"); gr.addColorStop(1, "#aab0b8"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = 170 + rnd() * 60; g.fillStyle = "rgba(" + v + "," + v + "," + (v + 4) + ",.25)"; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.strokeStyle = "rgba(60,68,78,.5)"; g.lineWidth = 3; for (let x = 0; x <= w; x += w / 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = "rgba(60,68,78,.55)"; g.fillRect(0, h * 0.455, w, 4); g.fillRect(0, h * 0.062, w, 4);
  });
  const fMat = BM({ map: facadeTex, color: mix(0xffffff, 1) });
  const wallY0 = GY - 0.05, wallH = HB - wallY0;
  const fpiece = (xa, xb, ya, yb) => { const w = xb - xa, h = yb - ya, m = add(new T.PlaneGeometry(w, h), fMat, (xa + xb) / 2, (ya + yb) / 2, cz - 0.01, OUT); const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setXY(i, ((i % 2 === 0 ? xb : xa) - bx0) / BW, ((i < 2 ? yb : ya) - wallY0) / wallH); } uv.needsUpdate = true; m.rotation.y = Math.PI; return m; };
  fpiece(bx0, cx - OW / 2, wallY0, HB); fpiece(cx + OW / 2, bx0 + BW, wallY0, HB); fpiece(cx - OW / 2, cx + OW / 2, OH, HB); fpiece(cx - OW / 2, cx + OW / 2, wallY0, 0);
  /* the planes face the viewer outside (towards -z), so rotation.y = PI keeps the front texture the right way round */
  /* returns, roof and mass behind */
  const sideM = BM({ color: mix(0xaab0b8, 0.9) });
  [bx0, bx0 + BW].forEach((x, i) => { const m = add(new T.PlaneGeometry(10, wallH), sideM, x, wallY0 + wallH / 2, cz + 5, OUT); m.rotation.y = Math.PI / 2 * (i ? -1 : 1); m.material.side = T.DoubleSide; });
  const roof = add(new T.BoxGeometry(BW + 0.6, 0.35, 3.4), BM({ color: mix(0x20262e, 1) }), cx, HB + 0.1, cz + 0.8, OUT);
  const roofGlow = add(new T.BoxGeometry(BW + 0.4, 0.06, 0.06), BM({ color: C(0x36d6ff).multiplyScalar(1.6), toneMapped: false }), cx, HB - 0.12, cz - 0.9, OUT);
  /* glass curtain-wall bays either side of the door: sky reflection by day, warm room light by night */
  const glassTex = ctex(512, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#" + pal.top.getHexString()); gr.addColorStop(1, "#" + pal.hor.getHexString()); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.moveTo(0, h * 0.7); g.lineTo(w * 0.55, 0); g.lineTo(w * 0.75, 0); g.lineTo(0, h * 0.95); g.fill(); g.strokeStyle = "rgba(20,28,36,.85)"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke(); });
  const glowTex = ctex(512, 640, (g, w, h) => { g.fillStyle = "#18120a"; g.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = (r + c) % 3 === 0 ? "#ffd08a" : "#ffe9c0"; g.fillRect(c * 128 + 10, r * 160 + 12, 108, 136); } g.strokeStyle = "rgba(10,12,16,.9)"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); });
  const bays = [];
  [-1, 1].forEach((s) => { for (let k = 0; k < 3; k++) {
    const x = cx + s * (4.6 + k * 4.2), y = 3.0;
    const gl = add(new T.PlaneGeometry(3.7, 4.6), BM({ map: glassTex, color: mix(0xffffff, 1.0) }), x, y, cz - 0.04, OUT); gl.rotation.y = Math.PI;
    const wm = add(new T.PlaneGeometry(3.7, 4.6), BM({ map: glowTex, color: new T.Color(0.85, 0.74, 0.55), transparent: true, opacity: Math.min(0.8, night * 1.0), blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), x, y, cz - 0.05, OUT); wm.rotation.y = Math.PI;
  } });
  /* door reveal: a lit tunnel through the wall thickness */
  const tun = BM({ color: C(0xcfd6de).multiplyScalar(0.86) });
  [-1, 1].forEach((s) => { const m = add(new T.PlaneGeometry(1.2, OH), tun, cx + s * OW / 2, OH / 2, cz + 0.6, OUT); m.rotation.y = Math.PI / 2; m.material.side = T.DoubleSide; });
  add(new T.PlaneGeometry(OW, 1.2), BM({ color: C(0xe8eef4).multiplyScalar(1.1), side: T.DoubleSide }), cx, OH, cz + 0.6, OUT).rotation.x = Math.PI / 2;
  add(new T.PlaneGeometry(OW, 1.2), BM({ map: graniteTex.clone(), color: C(0x9aa2ac) }), cx, 0.004, cz + 0.6, OUT).rotation.x = -Math.PI / 2;
  add(new T.BoxGeometry(OW + 0.3, 0.14, 0.2), BM({ color: C(0x20262e) }), cx, OH + 0.07, cz - 0.08, OUT);
  [-1, 1].forEach((s) => add(new T.BoxGeometry(0.14, OH + 0.14, 0.2), BM({ color: C(0x20262e) }), cx + s * (OW / 2 + 0.07), OH / 2 + 0.07, cz - 0.08, OUT));

  /* EXIT sign above the door: a slim grey box with white letters, like the reference */
  const exitTex = ctex(512, 192, (g, w, h) => { g.fillStyle = "#5a6068"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c9ced4"; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = "#ffffff"; g.font = "700 118px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("EXIT", w / 2, h / 2 + 6); });
  add(new T.PlaneGeometry(1.9, 0.71), BM({ map: exitTex, color: new T.Color(1.05, 1.05, 1.05), toneMapped: false }), cx, OH + 0.85, cz - 0.1, OUT).rotation.y = Math.PI;
  const exitGlow = add(new T.PlaneGeometry(4.2, 1.8), BM({ map: ctex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 32); r.addColorStop(0, "rgba(120,255,190,.5)"); r.addColorStop(1, "rgba(120,255,190,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }), transparent: true, opacity: 0.25 + night * 0.4, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), cx, OH + 0.85, cz - 0.14, OUT); exitGlow.rotation.y = Math.PI;

  /* the dynamic signboard: a dot-matrix LED ticker scrolling "CRITICAL CARE UNIVERSE" */
  const SEG = 1900, signTex = ctex(SEG * 2, 256, (g, w, h) => {
    g.fillStyle = "#04080f"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2; k++) {
      const ox = k * SEG, gr = g.createLinearGradient(ox, 0, ox + SEG, 0); gr.addColorStop(0, "#38e1ff"); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(1, "#38e1ff");
      g.fillStyle = gr; g.font = "800 132px system-ui,'Segoe UI',sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.shadowColor = "#1fb8ff"; g.shadowBlur = 26; g.fillText("CRITICAL CARE UNIVERSE", ox + 40, h / 2 + 4);
      g.shadowBlur = 0; g.fillStyle = "#27e0b0"; const mx = ox + SEG - 120; g.fillRect(mx - 14, h / 2 - 44, 28, 88); g.fillRect(mx - 44, h / 2 - 14, 88, 28);
    }
    g.fillStyle = "rgba(0,0,0,.55)"; for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 1.4, h); for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1.4);   /* LED grid */
  });
  signTex.wrapS = T.RepeatWrapping; signTex.repeat.set(0.5, 1);
  const SW = 21, SH = 2.9, sgy = 7.6;
  add(new T.BoxGeometry(SW + 0.5, SH + 0.5, 0.25), BM({ color: C(0x0c1118) }), cx, sgy, cz - 0.1, OUT);
  const signMesh = add(new T.PlaneGeometry(SW, SH), BM({ map: signTex, toneMapped: false }), cx, sgy, cz - 0.24, OUT); signMesh.rotation.y = Math.PI;
  [-1, 1].forEach((s) => add(new T.BoxGeometry(SW + 0.5, 0.07, 0.06), BM({ color: C(0x36d6ff).multiplyScalar(1.7), toneMapped: false }), cx, sgy + s * (SH / 2 + 0.3), cz - 0.26, OUT));
  const haloTex = ctex(128, 64, (g, w, h) => { const r = g.createRadialGradient(64, 32, 2, 64, 32, 64); r.addColorStop(0, "rgba(80,220,255,.7)"); r.addColorStop(1, "rgba(80,220,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const halo = add(new T.PlaneGeometry(SW + 9, SH + 5), BM({ map: haloTex, transparent: true, opacity: 0.25 + night * 0.45, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), cx, sgy, cz - 0.4, OUT); halo.rotation.y = Math.PI;
  /* smaller tagline under the sign */
  const tag = ctex(1024, 96, (g, w, h) => { g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, w, h); g.fillStyle = "#d8f4ff"; g.font = "600 46px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#36d6ff"; g.shadowBlur = 14; g.fillText("ICU  ·  SIMULATION  ·  PATHOPHYSIOLOGY  ·  LEARNING", w / 2, h / 2); });
  add(new T.PlaneGeometry(10.5, 10.5 * 96 / 1024), BM({ map: tag, transparent: true, toneMapped: false }), cx, sgy + 2.55, cz - 0.15, OUT).rotation.y = Math.PI;

  /* ---------- trees, hedges, lamps ---------- */
  const trees = [];
  const inWalk = (x, z) => Math.abs(x - cx) < 12.5 && z < cz + 1 && z > cz - RS - 22;
  for (let tries = 0; trees.length < (LOW ? 55 : 95) && tries < 800; tries++) {
    const x = cx + (rnd() - 0.5) * 150, z = cz - 3 - rnd() * 95;
    if (inWalk(x, z) || Math.hypot(x - (cx - 24), z - (cz - 34)) < 12 || Math.abs(x - cx) < 4.5) continue;
    trees.push([x, z, 0.8 + rnd() * 0.9, rnd()]);
  }
  const tn = trees.length, trunkI = new T.InstancedMesh(new T.CylinderGeometry(0.16, 0.26, 2.4, 6), BM({ color: mix(0x6b4a33, 1) }), tn);
  const leafI = new T.InstancedMesh(new T.IcosahedronGeometry(1.6, 1), BM({ color: 0xffffff }), tn * 3);
  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), s3 = new T.Vector3(), p3 = new T.Vector3(), col = new T.Color();
  trees.forEach(([x, z, s, v], i) => {
    p3.set(x, GY + 1.2 * s, z); s3.set(s, s, s); m4.compose(p3, q4, s3); trunkI.setMatrixAt(i, m4);
    for (let k = 0; k < 3; k++) { const ls = s * (1.25 - k * 0.22); p3.set(x + (k === 1 ? 0.2 : 0), GY + (2.6 + k * 1.15) * s, z + (k === 2 ? 0.15 : 0)); s3.set(ls, ls * 0.95, ls); m4.compose(p3, q4, s3); leafI.setMatrixAt(i * 3 + k, m4);
      col.setHSL(0.27 + v * 0.07, 0.42 + v * 0.1, 0.27 + k * 0.045 + v * 0.05).multiply(tint); leafI.setColorAt(i * 3 + k, col); }
  });
  trunkI.instanceMatrix.needsUpdate = leafI.instanceMatrix.needsUpdate = true; if (leafI.instanceColor) leafI.instanceColor.needsUpdate = true; OUT.add(trunkI, leafI);
  /* hedges and low planters framing the plaza */
  const hedgeM = BM({ color: mix(0x2f6a3a, 1) });
  [-1, 1].forEach((s) => { add(new T.BoxGeometry(0.9, 0.95, plazaD - RS + 6), hedgeM, cx + s * 9.9, GY + 0.47, cz - RS - (plazaD - RS) / 2 - 1, OUT); add(new T.BoxGeometry(0.2, 0.3, plazaD - RS + 6), BM({ color: C(0x36d6ff).multiplyScalar(1.3), toneMapped: false }), cx + s * 9.35, GY + 0.16, cz - RS - (plazaD - RS) / 2 - 1, OUT); });
  /* lamp posts along the plaza and path, glowing as the light falls */
  const lampGlowTex = ctex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 1, 32, 32, 32); r.addColorStop(0, "rgba(255,230,170,.9)"); r.addColorStop(1, "rgba(255,230,170,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const lampSp = [];
  for (let i = 0; i < (LOW ? 5 : 8); i++) [-1, 1].forEach((s) => {
    const z = cz - RS - 1.2 - i * 9, x = cx + s * (i < 1 ? 8.6 : 3.9);
    add(new T.CylinderGeometry(0.05, 0.07, 3.6, 8), BM({ color: C(0x2a313a) }), x, GY + 1.8, z, OUT);
    add(new T.SphereGeometry(0.2, 12, 10), BM({ color: new T.Color(1, 0.92, 0.7).multiplyScalar(0.5 + night * 1.3), toneMapped: false }), x, GY + 3.7, z, OUT);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: lampGlowTex, transparent: true, opacity: 0.18 + night * 0.7, blending: T.AdditiveBlending, depthWrite: false, fog: false })); sp.position.set(x, GY + 3.7, z); sp.scale.set(2.8, 2.8, 1); OUT.add(sp); lampSp.push(sp);
  });
  /* bollards on the platform */
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + (i / 6) * Math.PI, x = cx + Math.sin(a) * (R0 - 0.45), z = cz + Math.cos(a) * (R0 - 0.45);
    add(new T.CylinderGeometry(0.1, 0.1, 0.55, 10), BM({ color: C(0x303a45) }), x, 0.28, z, OUT); add(new T.CylinderGeometry(0.1, 0.1, 0.06, 10), BM({ color: C(0xfff0c8).multiplyScalar(0.7 + night * 1.2), toneMapped: false }), x, 0.58, z, OUT); }
  /* distant hills, fogged into the horizon */
  const hillM = BM({ color: mix(0x3f6b5a, 1) }), hillF = BM({ color: mix(0x56806e, 1) });
  for (let i = 0; i < 16; i++) { const a = -Math.PI * 0.95 + (i / 15) * Math.PI * 1.9, r = 190 + rnd() * 25, h = 14 + rnd() * 26;
    add(new T.ConeGeometry(26 + rnd() * 22, h, 7), i % 2 ? hillM : hillF, cx + Math.sin(a) * r * 1.2, GY + h / 2 - 1, cz - 40 - Math.abs(Math.cos(a)) * r, OUT); }

  /* birds by day, fireflies by night */
  const birds = [], birdM = BM({ color: C(0x1a2230), side: T.DoubleSide, fog: false });
  const wingG = new T.BufferGeometry(); wingG.setAttribute("position", new T.BufferAttribute(new Float32Array([0, 0, 0, 1.1, 0.12, -0.35, 0.85, 0.02, 0.25]), 3)); wingG.computeVertexNormals();
  if (night < 0.6) for (let i = 0; i < 7; i++) {
    const g = new T.Group(), w1 = new T.Mesh(wingG, birdM), w2 = new T.Mesh(wingG, birdM); w2.scale.x = -1; g.add(w1, w2); g.userData = { w1, w2, a: rnd() * 6.28, r: 18 + rnd() * 30, y: 14 + rnd() * 16, sp: 0.18 + rnd() * 0.2, ph: rnd() * 6 }; g.scale.setScalar(1.0 + rnd() * 0.6); OUT.add(g); birds.push(g);
  }
  let flies = null;
  if (night > 0.4) {
    const n = LOW ? 40 : 90, pos = new Float32Array(n * 3), seed = [];
    for (let i = 0; i < n; i++) { const x = cx + (rnd() - 0.5) * 70, z = cz - 14 - rnd() * 40; pos.set([x, GY + 0.4 + rnd() * 2.4, z], i * 3); seed.push([x, GY + 0.4 + rnd() * 2.4, z, rnd() * 6.3]); }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    flies = new T.Points(geo, new T.PointsMaterial({ size: 0.1, map: lampGlowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: 0xd8ff80, opacity: 0.9 })); flies.userData.seed = seed; OUT.add(flies);
  }

  /* ---------- walking surface ---------- */
  const groundY = (x, z) => {
    if (z > cz) return 0;
    const r = Math.hypot(x - cx, z - cz);
    if (r <= R0) return 0;
    return Math.max(GY, -DROP * Math.min(NST, Math.ceil((r - R0) / STEP - 1e-6)));
  };
  const M0 = 0.45, halfW = 9.0;
  function clamp(x, z) {
    const dx = x - cx, dz = Math.min(0, z - cz);
    let r = Math.hypot(dx, dz);
    const rr = RS - M0;
    let pa = r > rr ? [cx + dx / r * rr, cz + dz / r * rr] : [x, cz + dz];
    const rx = Math.max(cx - halfW + M0, Math.min(cx + halfW - M0, x)), rz = Math.max(cz - RS - EXITD - 1.0, Math.min(cz - RS + 1.4, z));
    const pb = [rx, rz];
    const da = (pa[0] - x) ** 2 + (pa[1] - z) ** 2, db = (pb[0] - x) ** 2 + (pb[1] - z) ** 2;
    return da <= db ? pa : pb;
  }
  /* 0 on the platform and steps, rising to 1 as you walk on beyond the foot of the stairs */
  const exitness = (x, z) => Math.max(0, Math.min(1, (cz - RS - 0.8 - z) / (EXITD - 0.4)));

  const cloudV = new T.Vector3();
  function update(t, dt, cam, visible) {
    OUT.visible = visible !== false;
    if (!OUT.visible) return;
    sky.position.copy(cam); skyMat.uniforms.t.value = t;
    signTex.offset.x = (t * 0.045) % 1;
    clouds.forEach((c) => { c.position.x += dt * c.userData.v * 0.35; if (c.position.x > 150) c.position.x = -150; });
    birds.forEach((b) => { const d = b.userData; d.a += dt * d.sp; b.position.set(cx + Math.sin(d.a) * d.r * 1.4, d.y + Math.sin(d.a * 2 + d.ph) * 1.5, cz - 36 + Math.cos(d.a) * d.r); b.rotation.y = d.a + (d.sp > 0 ? Math.PI / 2 : -Math.PI / 2); const f = Math.sin(t * 9 + d.ph) * 0.55; d.w1.rotation.z = f; d.w2.rotation.z = -f; });
    if (flies) { const p = flies.geometry.attributes.position, sd = flies.userData.seed; for (let i = 0; i < sd.length; i++) p.setXYZ(i, sd[i][0] + Math.sin(t * 0.5 + sd[i][3]) * 1.2, sd[i][1] + Math.sin(t * 0.9 + sd[i][3] * 2) * 0.35, sd[i][2] + Math.cos(t * 0.4 + sd[i][3]) * 1.2); p.needsUpdate = true; flies.material.opacity = 0.55 + 0.4 * Math.sin(t * 2.2); }
  }
  return { group: OUT, groundY, clamp, exitness, update, info: { hour, phase, label, night, cx, cz, RS, R0, sunrise: sr, sunset: ss, lat, lon } };
}
