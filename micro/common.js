/* shared helpers for Microbiology Lab pages: organism list and orbit camera stage */
(function () {
  'use strict';
  const M = (window.MICRO = window.MICRO || {}), T = window.THREE;
  const GCOL = { gp: '#f2b630', gn: '#3fc6b0', an: '#c2a8ff', at: '#7fb7ff', fu: '#f7d9b2', my: '#ff6f9a' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function orgList(el, onPick, allow) {
    const O = M.orgs;
    el.innerHTML = O.GROUPS.map(g => { const items = O.LIST.filter(o => o.g === g.id && (!allow || allow.includes(o.id))); return items.length ? '<h2>' + esc(g.name) + '</h2>' + items.map(o => '<button class="org" data-id="' + o.id + '" aria-pressed="false"><span class="dot" style="background:' + GCOL[g.id] + '"></span><span><i>' + esc(o.short) + '</i><small>' + esc(o.tag) + '</small></span></button>').join('') : ''; }).join('');
    el.addEventListener('click', e => { const b = e.target.closest('.org'); if (b && !b.disabled) onPick(b.dataset.id); });
    return id => el.querySelectorAll('.org').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
  }
  /* orbit stage: returns {R, scene, cam, st, onFrame(fn), focus(v,dist), reset()} or null when WebGL is missing */
  function stage(canvas, opt) {
    opt = opt || {}; let R; try { R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.setClearColor(0, 0); if (opt.clip) R.localClippingEnabled = true;
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(opt.fov || 38, 1, .1, 200);
    scene.add(new T.HemisphereLight(0xcfe8ff, 0x1a2433, .95)); const k = new T.DirectionalLight(0xffffff, 1.1); k.position.set(5, 6, 7); scene.add(k); const r = new T.DirectionalLight(0x4de3d0, .6); r.position.set(-6, -2, -5); scene.add(r);
    const st = { yaw: opt.yaw || 0, pitch: opt.pitch || .1, dist: opt.dist || 12, tYaw: opt.yaw || 0, tPitch: opt.pitch || .1, tDist: opt.dist || 12, tgt: new T.Vector3(), tTgt: new T.Vector3(), auto: opt.auto !== false, min: opt.min || 3, max: opt.max || 30 };
    const hooks = []; const ptr = new Map(); let lastD = 0, moved = 0;
    const cv = canvas;
    function size() { const p = cv.parentElement, w = p.clientWidth, h = p.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    addEventListener('resize', size); size();
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); lastD = 0; moved = 0; cv.style.cursor = 'grabbing'; });
    const up = e => { const was = ptr.has(e.pointerId); ptr.delete(e.pointerId); cv.style.cursor = 'grab'; lastD = 0; if (was && moved < 5 && opt.onTap) opt.onTap(e); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { ptr.delete(e.pointerId); });
    cv.addEventListener('pointermove', e => { const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (lastD) st.tDist = clamp(st.tDist * lastD / d, st.min, st.max); lastD = d; } else { st.tYaw -= dx * .009; st.tPitch = clamp(st.tPitch + dy * .007, -1.35, 1.35); st.auto = false; } });
    cv.addEventListener('wheel', e => { e.preventDefault(); st.tDist = clamp(st.tDist * (1 + Math.sign(e.deltaY) * .08), st.min, st.max); }, { passive: false });
    let last = performance.now(), t0 = last;
    function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
      if (st.auto && !ptr.size) st.tYaw += dt * (opt.spin || .3);
      const a = Math.min(1, dt * 7); st.yaw += (st.tYaw - st.yaw) * a; st.pitch += (st.tPitch - st.pitch) * a; st.dist += (st.tDist - st.dist) * a; st.tgt.lerp(st.tTgt, a);
      cam.position.set(st.tgt.x + Math.sin(st.yaw) * Math.cos(st.pitch) * st.dist, st.tgt.y + Math.sin(st.pitch) * st.dist, st.tgt.z + Math.cos(st.yaw) * Math.cos(st.pitch) * st.dist); cam.lookAt(st.tgt);
      hooks.forEach(h => h(t, dt)); R.render(scene, cam); requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
    return { R, scene, cam, st, size, onFrame: f => hooks.push(f), focus(v, d) { st.tTgt.copy(v); st.tDist = d; }, reset(d, yaw, pitch) { st.tTgt.set(0, 0, 0); st.tDist = d || opt.dist || 12; if (yaw != null) { st.tYaw = yaw; st.yaw = yaw; } st.tPitch = pitch == null ? .1 : pitch; } };
  }
  M.ui = { GCOL, esc, clamp, orgList, stage };
})();
