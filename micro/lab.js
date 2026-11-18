/* MICRO lab runtime: renderer, camera director, orbit, labels, playback clock.
   A scenario is an object { duration, scenes[], labels[], attach(W), at(t,ctx) -> {world,pos,look,focus,flash} } */
(function () {
  'use strict';
  const T = THREE, M = window.MICRO, { clamp, V } = M.u;
  M.Lab = function (canvas, stage, labelHost) {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: !!window.__MICRO_TEST });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1.6, .05, 600);
    scene.add(new T.HemisphereLight(0xbfe3ff, 0x1a2433, .85));
    const key = new T.DirectionalLight(0xffffff, .95); key.position.set(30, 60, 80); scene.add(key);
    const back = new T.DirectionalLight(0x7fd9ff, .4); back.position.set(-40, -20, -60); scene.add(back);
    const head = new T.PointLight(0xffffff, .5, 140); camera.add(head); scene.add(camera);
    const W = { cell: M.buildCell(), mol: M.buildMol() };
    scene.add(W.cell.root, W.mol.root);
    const SW = W.mol; SW.cell = W.cell; SW.mol = SW; /* scenarios address the molecular world directly, with .cell for the bacterium */
    const BG = { cell: new T.Color(0x07161f), mol: new T.Color(0x07101c) };
    const lab = { idle: 3, renderer, scene, camera, W, t: 0, playing: false, speed: 1, view: 'auto', labels: true, sc: null, onScene: null, onTime: null, onEnd: null, scn: -1, user: { yaw: 0, pit: 0, zoom: 1 } };
    const cp = V(0, 0, 30), cl = V(), tmpP = V(), tmpL = V(), lastWorld = { v: '' };
    let lastTs = 0, raf = 0, snap = true, w = 0, h = 0;

    function fit() {
      w = stage.clientWidth || 800; h = stage.clientHeight || 500; renderer.setSize(w, h, false); lab.dirty = true;
      const a = w / h; camera.aspect = a; camera.fov = a >= 1.6 ? 40 : Math.min(88, 2 * Math.atan(Math.tan(20 * Math.PI / 180) * 1.6 / a) * 180 / Math.PI); camera.updateProjectionMatrix();
    }
    new ResizeObserver(fit).observe(stage); fit();

    /* labels */
    let L = [];
    function buildLabels() {
      labelHost.innerHTML = ''; L = (lab.sc && lab.sc.labels || []).map(d => { const el = document.createElement('div'); el.className = 'ml' + (d.cls ? ' ' + d.cls : ''); el.textContent = d.text; labelHost.appendChild(el); return Object.assign({ el }, d); });
    }
    const pv = V();
    function placeLabels(world) {
      L.forEach(d => {
        const on = lab.labels && d.world === world && lab.t >= d.t0 && lab.t <= d.t1;
        if (!on) { d.el.classList.remove('on'); return; }
        pv.copy(d.a()).project(camera);
        const ok = pv.z < 1 && pv.z > -1 && Math.abs(pv.x) < 1.05 && Math.abs(pv.y) < 1.05;
        d.el.classList.toggle('on', ok);
        if (ok) { const x = (pv.x * .5 + .5) * w, y = (-pv.y * .5 + .5) * h; d.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(' + (d.dx == null ? 12 : d.dx) + 'px,' + (d.dy == null ? -14 : d.dy) + 'px)'; }
      });
    }

    /* user orbit */
    const U = lab.user; let drag = null, pinch = null;
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointermove', e => { if (!drag) return; U.yaw -= (e.clientX - drag.x) * .006; U.pit = clamp(U.pit + (e.clientY - drag.y) * .005, -1.2, 1.2); drag = { x: e.clientX, y: e.clientY }; lab.dirty = true; });
    const end = () => { drag = null; }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', e => { e.preventDefault(); U.zoom = clamp(U.zoom * (1 + e.deltaY * .001), .35, 2.4); lab.dirty = true; }, { passive: false });
    const tp = ev => Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY);
    canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = tp(e); }, { passive: true });
    canvas.addEventListener('touchmove', e => { if (e.touches.length === 2 && pinch) { const d = tp(e); U.zoom = clamp(U.zoom * pinch / d, .35, 2.4); pinch = d; lab.dirty = true; } }, { passive: true });
    canvas.addEventListener('touchend', () => { pinch = null; });
    lab.resetUser = () => { U.yaw = 0; U.pit = 0; U.zoom = 1; };

    function viewCam(res) {
      if (lab.view === 'cell') return { world: 'cell', pos: V(0, 1.8, 17), look: V(0, 0, 0) };
      if (lab.view === 'peri') return { world: 'mol', pos: V(-4, -4, 98), look: V(-4, -14, 0) };
      if (lab.view === 'mol') { const f = res.focus || V(-12.5, -4, 0); return { world: 'mol', pos: f.clone().add(V(3, 3, res.focusDist || 22)), look: f.clone() }; }
      return null;
    }
    function frame(dt) {
      const sc = lab.sc; if (!sc) return;
      const res = sc.at(lab.t, { camera, W: SW, dt }) || {};
      const vc = viewCam(res), world = vc ? vc.world : res.world, pos = vc ? vc.pos : res.pos, look = vc ? vc.look : res.look;
      W.cell.root.visible = world === 'cell'; W.mol.root.visible = world === 'mol';
      scene.background = BG[world]; scene.fog = world === 'cell' ? new T.Fog(0x07161f, 30, 70) : new T.Fog(0x07101c, 140, 330);
      /* user offset around look point */
      const v = tmpP.copy(pos).sub(look), r = v.length() * U.zoom, th = Math.atan2(v.x, v.z) + U.yaw, ph = clamp(Math.asin(clamp(v.y / (v.length() || 1), -1, 1)) + U.pit, -1.35, 1.35);
      tmpP.set(Math.sin(th) * Math.cos(ph) * r, Math.sin(ph) * r, Math.cos(th) * Math.cos(ph) * r).add(look); tmpL.copy(look);
      if (snap || lastWorld.v !== world) { cp.copy(tmpP); cl.copy(tmpL); snap = false; } else { const k = 1 - Math.exp(-dt * 7); cp.lerp(tmpP, k); cl.lerp(tmpL, k); }
      lastWorld.v = world; camera.position.copy(cp); camera.lookAt(cl);
      camera.updateMatrixWorld(true);
      placeLabels(world); lab.world = world; lab.flash = res.flash || 0;
      renderer.render(scene, camera);
    }
    function sceneIndex() { const s = lab.sc.scenes; for (let i = s.length - 1; i >= 0; i--) if (lab.t >= s[i].t0) return i; return 0; }
    function loop(ts) {
      raf = requestAnimationFrame(loop); const dt = Math.min(.05, (ts - lastTs) / 1000 || 0); lastTs = ts;
      if (!lab.sc) return;
      if (lab.playing) { lab.t += dt * lab.speed; if (lab.t >= lab.sc.duration) { lab.t = lab.sc.duration; lab.playing = false; lab.onEnd && lab.onEnd(); } }
      const i = sceneIndex(); if (i !== lab.scn) { lab.scn = i; lab.onScene && lab.onScene(i, lab.sc.scenes[i]); }
      lab.onTime && lab.onTime(lab.t);
      if (lab.playing || lab.dirty || lab.idle-- > 0) frame(dt); lab.dirty = false;
    }
    lab.setScenario = function (sc) { lab.sc = sc; sc.attach(SW); lab.idle = 3; lab.t = 0; lab.scn = -1; lab.playing = false; snap = true; buildLabels(); lab.resetUser(); };
    lab.seek = function (t) { lab.t = clamp(t, 0, lab.sc.duration); snap = true; lab.scn = -1; lab.dirty = true; };
    lab.start = function () { lastTs = performance.now(); raf = requestAnimationFrame(loop); };
    lab.renderNow = function () { const i = sceneIndex(); if (i !== lab.scn) { lab.scn = i; lab.onScene && lab.onScene(i, lab.sc.scenes[i]); } frame(.016); };
    lab.snap = () => { snap = true; lab.dirty = true; };
    lab.fit = fit;
    return lab;
  };
})();
