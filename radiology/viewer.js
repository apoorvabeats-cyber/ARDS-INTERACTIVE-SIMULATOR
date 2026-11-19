/* Radiology Lab workstation.
   A dependency-free canvas viewer plus a case engine.
   Honest limits: images are JPEG or PNG teaching images, not DICOM. Window and level here is an
   8-bit display adjustment, not a Hounsfield window. Case sources already support
   kind "image" | "stack" | "cine" | "dicom" so Cornerstone3D and DICOMweb can be added later.
   Ground-truth regions are fractions of the image width and height. */
(function () {
  "use strict";
  var RAD = window.RAD || { cases: [] };
  var CASES = RAD.cases;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var DPR = function () { return Math.min(window.devicePixelRatio || 1, 2); };
  var MAXDIM = 2200;

  var MODS = [
    { id: "cxr", label: "Chest X-ray", modality: "CR / DX" },
    { id: "ct", label: "CT", modality: "CT" },
    { id: "mri", label: "MRI", modality: "MR" },
    { id: "us", label: "Ultrasound", modality: "US" }
  ];

  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem("radlab.v1") || "{}"); } catch (e) { return {}; } },
    set: function (o) { try { localStorage.setItem("radlab.v1", JSON.stringify(o)); } catch (e) {} }
  };

  /* Where an image came from decides how it is labelled. */
  function sourceInfo(c, src) {
    if (src && c.cmp && c.cmp.sourceTag) return c.cmp.sourceTag;
    if (!src && c.sourceTag) return c.sourceTag;
    var p = String(src || c.img);
    if (/^(pocus|echo)\//.test(p)) return { tag: "ILLUSTRATION", text: "Teaching illustration in ultrasound style. Not a clinical scan. No cine loop yet." };
    return { tag: "JPEG", text: "Teaching image (JPEG or PNG). No DICOM header. Source and licence to be recorded." };
  }

  /* ---------- Viewport ---------- */
  function Viewport(el, opts) {
    var self = this;
    this.el = el;
    this.cv = $("canvas", el);
    this.ctx = this.cv.getContext("2d");
    this.hTL = $(".tl", el); this.hTR = $(".tr", el); this.hBL = $(".bl", el);
    this.opts = opts || {};
    this.work = document.createElement("canvas");
    this.baseCv = document.createElement("canvas");
    this.baseData = null;
    this.iw = 0; this.ih = 0;
    this.crop = [0, 0, 1, 1];
    this.zoom = 1; this.panx = 0; this.pany = 0;
    this.wl = { w: 1, l: 0.5 }; this.inv = false;
    this.ann = []; this.truth = [];
    this.tool = "pan";
    this.meta = { top: "", sub: "", tag: null, hint: "" };
    this.video = null; this.stack = null; this.loaded = false;
    this.onview = null;
    this.ptrs = {};
    this.drag = null;
    this.pending = false;
    this.W = 1; this.H = 1;
    this.ro = new ResizeObserver(function () { self.resize(); });
    this.ro.observe(el);
    this.bind();
  }

  Viewport.prototype.resize = function () {
    var r = this.el.getBoundingClientRect();
    var d = DPR();
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
    this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d);
    this.draw();
  };

  Viewport.prototype.setPending = function (msg) {
    var p = $(".pending", this.el);
    if (!msg) { if (p) p.remove(); return; }
    if (!p) { p = document.createElement("div"); p.className = "pending"; this.el.appendChild(p); }
    p.textContent = msg;
  };

  Viewport.prototype.clearMedia = function () {
    if (this.video) { try { this.video.pause(); } catch (e) {} this.video = null; }
    this.stack = null; this.baseData = null; this.loaded = false; this.iw = this.ih = 0;
  };

  Viewport.prototype.loadImage = function (src, crop) {
    var self = this;
    this.clearMedia();
    this.crop = crop || [0, 0, 1, 1];
    this.setPending("");
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { self.useBitmap(im, im.naturalWidth, im.naturalHeight); res(); };
      im.onerror = function () { self.setPending("This image could not be loaded."); rej(new Error("load")); };
      im.src = src;
    });
  };

  Viewport.prototype.useBitmap = function (src, w, h) {
    var s = Math.min(1, MAXDIM / Math.max(w, h));
    var bw = Math.max(1, Math.round(w * s)), bh = Math.max(1, Math.round(h * s));
    this.baseCv.width = bw; this.baseCv.height = bh;
    var g = this.baseCv.getContext("2d", { willReadFrequently: true });
    g.drawImage(src, 0, 0, bw, bh);
    this.baseData = g.getImageData(0, 0, bw, bh);
    this.work.width = bw; this.work.height = bh;
    this.natW = w; this.natH = h;
    this.iw = bw * this.crop[2]; this.ih = bh * this.crop[3];
    this.loaded = true;
    this.lut();
    this.draw();
  };

  /* Cine: a video element drawn frame by frame so the tools stay available. */
  Viewport.prototype.loadVideo = function (src, fps) {
    var self = this;
    this.clearMedia();
    this.crop = [0, 0, 1, 1];
    this.setPending("");
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
    this.video = v; this.fps = fps || 30;
    return new Promise(function (res, rej) {
      v.onloadeddata = function () { self.vidFrame(); res(); };
      v.onerror = function () { self.setPending("This video could not be loaded."); rej(new Error("video")); };
      v.onseeked = function () { self.vidFrame(); };
      v.src = src;
    });
  };
  Viewport.prototype.vidFrame = function () {
    var v = this.video; if (!v || !v.videoWidth) return;
    var s = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    var bw = Math.round(v.videoWidth * s), bh = Math.round(v.videoHeight * s);
    if (this.baseCv.width !== bw || this.baseCv.height !== bh) { this.baseCv.width = bw; this.baseCv.height = bh; this.work.width = bw; this.work.height = bh; }
    var g = this.baseCv.getContext("2d", { willReadFrequently: true });
    g.drawImage(v, 0, 0, bw, bh);
    this.baseData = g.getImageData(0, 0, bw, bh);
    this.natW = v.videoWidth; this.natH = v.videoHeight;
    this.iw = bw; this.ih = bh; this.loaded = true;
    this.lut(); this.draw();
    if (this.onframe) this.onframe(v);
  };
  Viewport.prototype.play = function (on) {
    var self = this, v = this.video; if (!v) return;
    if (!on) { v.pause(); return; }
    v.play();
    (function loop() { if (!self.video || self.video !== v || v.paused) return; self.vidFrame(); requestAnimationFrame(loop); })();
  };

  /* 8-bit window and level, applied per channel through a lookup table. */
  Viewport.prototype.lut = function () {
    if (!this.baseData) return;
    var w = this.wl.w, l = this.wl.l, lo = l - w / 2, t = new Uint8ClampedArray(256), i;
    for (i = 0; i < 256; i++) { var v = (i / 255 - lo) / w; v = v < 0 ? 0 : v > 1 ? 1 : v; t[i] = (this.inv ? 1 - v : v) * 255; }
    var src = this.baseData.data, out = new ImageData(this.baseData.width, this.baseData.height), d = out.data, n = src.length;
    for (i = 0; i < n; i += 4) { d[i] = t[src[i]]; d[i + 1] = t[src[i + 1]]; d[i + 2] = t[src[i + 2]]; d[i + 3] = 255; }
    this.work.getContext("2d").putImageData(out, 0, 0);
  };
  Viewport.prototype.relut = function () {
    var self = this;
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(function () { self.pending = false; self.lut(); self.draw(); });
  };

  /* geometry */
  Viewport.prototype.scale = function () { return this.iw ? Math.min(this.W / this.iw, this.H / this.ih) * this.zoom : 1; };
  Viewport.prototype.origin = function () {
    var s = this.scale();
    return [(this.W - this.iw * s) / 2 + this.panx, (this.H - this.ih * s) / 2 + this.pany, s];
  };
  Viewport.prototype.toScreen = function (nx, ny) { var o = this.origin(); return [o[0] + nx * this.iw * o[2], o[1] + ny * this.ih * o[2]]; };
  Viewport.prototype.toNorm = function (sx, sy) { var o = this.origin(); return [(sx - o[0]) / (this.iw * o[2]), (sy - o[1]) / (this.ih * o[2])]; };
  Viewport.prototype.zoomAt = function (cx, cy, z) {
    if (!this.iw) return;
    var n = this.toNorm(cx, cy);
    this.zoom = clamp(z, 0.5, 24);
    var s = this.scale();
    this.panx = cx - n[0] * this.iw * s - (this.W - this.iw * s) / 2;
    this.pany = cy - n[1] * this.ih * s - (this.H - this.ih * s) / 2;
    this.changed();
  };
  Viewport.prototype.reset = function () { this.zoom = 1; this.panx = 0; this.pany = 0; this.wl = { w: 1, l: 0.5 }; this.inv = false; this.lut(); this.changed(); };
  Viewport.prototype.changed = function () { this.draw(); if (this.onview) this.onview(this); };
  /* view in units that survive a different image size or window size */
  Viewport.prototype.getView = function () { return { zoom: this.zoom, px: this.panx / this.W, py: this.pany / this.H, wl: { w: this.wl.w, l: this.wl.l }, inv: this.inv }; };
  Viewport.prototype.setView = function (v) {
    this.zoom = v.zoom; this.panx = v.px * this.W; this.pany = v.py * this.H;
    var wlChanged = v.wl.w !== this.wl.w || v.wl.l !== this.wl.l || v.inv !== this.inv;
    this.wl = { w: v.wl.w, l: v.wl.l }; this.inv = v.inv;
    if (wlChanged) this.lut();
    this.draw();
  };

  /* drawing */
  Viewport.prototype.draw = function () {
    var g = this.ctx, d = DPR();
    g.setTransform(d, 0, 0, d, 0, 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, this.W, this.H);
    if (this.loaded && this.iw) {
      var o = this.origin(), c = this.crop, bw = this.work.width, bh = this.work.height;
      g.imageSmoothingEnabled = o[2] * (this.work.width / (this.natW || this.work.width)) < 3;
      g.imageSmoothingQuality = "high";
      g.drawImage(this.work, c[0] * bw, c[1] * bh, c[2] * bw, c[3] * bh, o[0], o[1], this.iw * o[2], this.ih * o[2]);
      for (var i = 0; i < this.truth.length; i++) this.drawAnn(g, this.truth[i], "truth");
      for (i = 0; i < this.ann.length; i++) this.drawAnn(g, this.ann[i], "user");
      if (this.drag && this.drag.live) this.drawAnn(g, this.drag.live, "user");
    }
    this.hud();
  };

  Viewport.prototype.drawAnn = function (g, a, kind) {
    var col = kind === "truth" ? "#8fd0a8" : a.t === "measure" ? "#f0c36a" : "#7fd4e6";
    g.save(); g.lineWidth = 2; g.strokeStyle = col; g.fillStyle = col; g.lineJoin = "round"; g.lineCap = "round";
    g.shadowColor = "rgba(0,0,0,.85)"; g.shadowBlur = 3;
    g.font = "600 12px Figtree, system-ui, sans-serif";
    var p, q;
    if (a.t === "point") {
      p = this.toScreen(a.p[0], a.p[1]);
      g.beginPath(); g.arc(p[0], p[1], 9, 0, 6.2832); g.stroke();
      g.beginPath(); g.moveTo(p[0] - 14, p[1]); g.lineTo(p[0] - 4, p[1]); g.moveTo(p[0] + 4, p[1]); g.lineTo(p[0] + 14, p[1]);
      g.moveTo(p[0], p[1] - 14); g.lineTo(p[0], p[1] - 4); g.moveTo(p[0], p[1] + 4); g.lineTo(p[0], p[1] + 14); g.stroke();
    } else if (a.t === "circle" || a.t === "region") {
      p = this.toScreen(a.c[0], a.c[1]);
      var o = this.origin(), rx = a.r[0] * this.iw * o[2], ry = a.r[1] * this.ih * o[2];
      g.beginPath(); g.ellipse(p[0], p[1], Math.max(2, rx), Math.max(2, ry), 0, 0, 6.2832);
      if (a.t === "region") { g.setLineDash([7, 5]); g.lineWidth = 2.4; }
      g.stroke(); g.setLineDash([]);
      if (a.label) this.tag(g, a.label, p[0], p[1] - ry - 8, col);
    } else if (a.t === "arrow" || a.t === "measure") {
      p = this.toScreen(a.a[0], a.a[1]); q = this.toScreen(a.b[0], a.b[1]);
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      if (a.t === "arrow") {
        var ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        g.beginPath(); g.moveTo(q[0], q[1]);
        g.lineTo(q[0] - 14 * Math.cos(ang - 0.45), q[1] - 14 * Math.sin(ang - 0.45));
        g.lineTo(q[0] - 14 * Math.cos(ang + 0.45), q[1] - 14 * Math.sin(ang + 0.45)); g.closePath(); g.fill();
      } else {
        [p, q].forEach(function (e) { g.beginPath(); g.moveTo(e[0] - 5, e[1] - 5); g.lineTo(e[0] + 5, e[1] + 5); g.moveTo(e[0] + 5, e[1] - 5); g.lineTo(e[0] - 5, e[1] + 5); g.stroke(); });
        var dx = (a.b[0] - a.a[0]) * this.natW, dy = (a.b[1] - a.a[1]) * this.natH;
        var len = Math.sqrt(dx * dx + dy * dy);
        this.tag(g, Math.round(len) + " px, uncalibrated", (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 10, col);
      }
    }
    g.restore();
  };
  Viewport.prototype.tag = function (g, text, x, y, col) {
    g.save(); g.shadowBlur = 0;
    var w = g.measureText(text).width + 10;
    var bx = clamp(x - w / 2, 2, this.W - w - 2), by = clamp(y - 15, 2, this.H - 20);
    g.fillStyle = "rgba(0,0,0,.72)"; g.fillRect(bx, by, w, 18);
    g.fillStyle = col; g.fillText(text, bx + 5, by + 13); g.restore();
  };

  Viewport.prototype.hud = function () {
    var m = this.meta, small = this.W < 520;
    this.hTL.innerHTML = esc(m.top) + (m.sub && !small ? "<br>" + esc(m.sub) : "") + (this.natW && !small ? "<br>" + this.natW + " × " + this.natH + " px" : "");
    this.hTR.innerHTML = "Zoom ×" + this.zoom.toFixed(1) + "<br>WW " + Math.round(this.wl.w * 100) + "% · WL " + Math.round(this.wl.l * 100) + "%" + (this.inv ? "<br>Inverted" : "") +
      (this.stack ? "<br>Slice " + (this.stack.i + 1) + " / " + this.stack.n : "");
    this.hBL.innerHTML = (m.tag ? '<span class="tag' + (m.tag.ref ? " ref" : "") + '">' + esc(m.tag.tag) + "</span>" + (small ? "" : " " + esc(m.tag.text)) : "") + (m.hint && !small ? "<br>" + esc(m.hint) : "");
  };

  /* pointer interaction */
  Viewport.prototype.local = function (ev) { var r = this.cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  Viewport.prototype.bind = function () {
    var self = this, cv = this.cv;
    cv.addEventListener("pointerdown", function (ev) {
      if (!self.loaded) return;
      cv.setPointerCapture(ev.pointerId);
      var p = self.local(ev);
      self.ptrs[ev.pointerId] = p;
      var ids = Object.keys(self.ptrs);
      if (ids.length === 2) {
        var a = self.ptrs[ids[0]], b = self.ptrs[ids[1]];
        self.drag = { mode: "pinch", d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: self.zoom, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, px: self.panx, py: self.pany };
        return;
      }
      var tool = ev.button === 1 ? "pan" : self.tool;
      var n = self.toNorm(p[0], p[1]);
      self.drag = { mode: tool, start: p, n0: n, px: self.panx, py: self.pany, wl: { w: self.wl.w, l: self.wl.l }, z: self.zoom, live: null };
    });
    cv.addEventListener("pointermove", function (ev) {
      if (!self.ptrs[ev.pointerId]) return;
      var p = self.local(ev); self.ptrs[ev.pointerId] = p;
      var D = self.drag; if (!D) return;
      if (D.mode === "pinch") {
        var ids = Object.keys(self.ptrs); if (ids.length < 2) return;
        var a = self.ptrs[ids[0]], b = self.ptrs[ids[1]];
        var dist = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        self.zoomAt(mx, my, D.z * dist / Math.max(1, D.d));
        self.panx += mx - D.mx; self.pany += my - D.my; D.mx = mx; D.my = my; self.changed();
        return;
      }
      var dx = p[0] - D.start[0], dy = p[1] - D.start[1], n = self.toNorm(p[0], p[1]);
      if (D.mode === "pan") { self.panx = D.px + dx; self.pany = D.py + dy; self.changed(); }
      else if (D.mode === "zoom") { self.zoomAt(D.start[0], D.start[1], D.z * Math.exp(-dy * 0.01)); }
      else if (D.mode === "wl") {
        self.wl.l = clamp(D.wl.l + dx * 0.002, 0.02, 0.98); self.wl.w = clamp(D.wl.w - dy * 0.003, 0.05, 2);
        self.relut(); self.changed();
      }
      else if (D.mode === "measure" || D.mode === "arrow") { D.live = { t: D.mode, a: D.n0, b: n }; self.draw(); }
      else if (D.mode === "circle") {
        D.live = { t: "circle", c: [(D.n0[0] + n[0]) / 2, (D.n0[1] + n[1]) / 2], r: [Math.abs(n[0] - D.n0[0]) / 2, Math.abs(n[1] - D.n0[1]) / 2] }; self.draw();
      }
    });
    function up(ev) {
      var had = self.ptrs[ev.pointerId]; delete self.ptrs[ev.pointerId];
      var D = self.drag; if (!had || !D) return;
      if (D.mode === "pinch") { if (Object.keys(self.ptrs).length < 2) self.drag = null; return; }
      var p = self.local(ev), moved = Math.hypot(p[0] - D.start[0], p[1] - D.start[1]);
      var n = self.toNorm(p[0], p[1]), a = null;
      if (D.mode === "point") { if (moved < 8) a = { t: "point", p: n }; }
      else if (D.mode === "measure" || D.mode === "arrow") { if (moved > 8) a = { t: D.mode, a: D.n0, b: n }; }
      else if (D.mode === "circle") { if (moved > 10) a = D.live; }
      self.drag = null;
      if (a) { self.ann.push(a); if (self.onann) self.onann(self); }
      self.draw();
    }
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", function (ev) {
      if (!self.loaded) return;
      ev.preventDefault();
      if (self.stack && !ev.ctrlKey) { self.slice(ev.deltaY > 0 ? 1 : -1); return; }
      var p = self.local(ev); self.zoomAt(p[0], p[1], self.zoom * Math.exp(-ev.deltaY * 0.0015));
    }, { passive: false });
    cv.addEventListener("dblclick", function () { self.zoom = 1; self.panx = self.pany = 0; self.changed(); });
  };

  /* stacks, for CT and MR series stored as ordered frames */
  Viewport.prototype.loadStack = function (frames) {
    var self = this;
    this.clearMedia();
    this.crop = [0, 0, 1, 1];
    this.stack = { frames: frames, i: 0, n: frames.length, cache: {} };
    return this.showSlice(0);
  };
  Viewport.prototype.showSlice = function (i) {
    var self = this, s = this.stack; if (!s) return Promise.resolve();
    i = clamp(i, 0, s.n - 1); s.i = i;
    var done = function (im) { if (self.stack === s && s.i === i) self.useBitmap(im, im.naturalWidth, im.naturalHeight); };
    if (s.cache[i]) { done(s.cache[i]); return Promise.resolve(); }
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { s.cache[i] = im; done(im); res(); };
      im.onerror = function () { self.setPending("A slice could not be loaded."); res(); };
      im.src = s.frames[i];
      [i + 1, i + 2].forEach(function (j) { if (j < s.n && !s.cache[j]) { var pre = new Image(); pre.onload = function () { s.cache[j] = pre; }; pre.src = s.frames[j]; } });
    });
  };
  Viewport.prototype.slice = function (d) { if (this.stack) this.showSlice(this.stack.i + d); };

  /* ---------- App ---------- */
  var vp1 = new Viewport($("#vp1")), vp2 = new Viewport($("#vp2"));
  var stage = $("#stage"), viewer = $("#viewer"), panel = $("#panel"), caseList = $("#cases"), toolsEl = $("#tools"), cineEl = $("#cine");
  var state = { mod: "cxr", id: null, cmp: false, revealed: false, answer: null, quiz: {}, lastByMod: {}, filter: "" };
  var progress = store.get();

  var TOOLS = [
    ["pan", "Pan", "Drag to move the image. Wheel or pinch to zoom."],
    ["zoom", "Zoom", "Drag up or down to zoom."],
    ["wl", "W/L", "Drag to change window (up and down) and level (left and right)."],
    ["measure", "Measure", "Drag a line. Distances are in pixels, uncalibrated."],
    ["arrow", "Arrow", "Drag to draw an arrow to a finding."],
    ["circle", "Circle", "Drag a box corner to corner to circle an area."],
    ["point", "Point", "Tap the abnormal area."]
  ];

  function buildTools() {
    var h = "";
    TOOLS.forEach(function (t) { h += '<button type="button" data-tool="' + t[0] + '" aria-pressed="' + (t[0] === "pan") + '" title="' + esc(t[2]) + '">' + t[1] + "</button>"; });
    h += '<span class="gap"></span>' +
      '<button type="button" data-act="invert" aria-pressed="false">Invert</button>' +
      '<button type="button" data-act="reset">Reset</button>' +
      '<button type="button" data-act="undo">Undo</button>' +
      '<button type="button" data-act="clear">Clear</button>' +
      '<span class="gap"></span>' +
      '<button type="button" data-act="compare" aria-pressed="false">Compare</button>' +
      '<button type="button" data-act="full">Full screen</button>';
    toolsEl.innerHTML = h;
  }
  function setTool(t) {
    vp1.tool = vp2.tool = t;
    [vp1, vp2].forEach(function (v) { v.el.className = v.el.className.replace(/\bt-\w+/g, "").trim() + " t-" + t; });
    toolsEl.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.tool === t); });
    var info = TOOLS.filter(function (x) { return x[0] === t; })[0];
    [vp1, vp2].forEach(function (v) { v.meta.hint = info ? info[2] : ""; v.draw(); });
  }
  function act(a) {
    if (a === "invert") { vp1.inv = !vp1.inv; vp2.inv = vp1.inv; vp1.lut(); vp2.lut(); vp1.changed(); vp2.draw(); toolsEl.querySelector('[data-act="invert"]').setAttribute("aria-pressed", vp1.inv); }
    else if (a === "reset") { vp1.reset(); vp2.reset(); toolsEl.querySelector('[data-act="invert"]').setAttribute("aria-pressed", "false"); }
    else if (a === "undo") { vp1.ann.pop(); vp1.draw(); refreshTask(); }
    else if (a === "clear") { vp1.ann = []; vp1.draw(); refreshTask(); }
    else if (a === "compare") { setCompare(!state.cmp); }
    else if (a === "full") { toggleFull(); }
  }
  toolsEl.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.tool) setTool(b.dataset.tool); else if (b.dataset.act) act(b.dataset.act);
  });

  function toggleFull() {
    var on = viewer.classList.contains("fs") || document.fullscreenElement === viewer;
    if (on) {
      viewer.classList.remove("fs");
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    } else if (viewer.requestFullscreen) {
      viewer.requestFullscreen().catch(function () { viewer.classList.add("fs"); });
    } else { viewer.classList.add("fs"); }
    setTimeout(function () { vp1.resize(); vp2.resize(); }, 120);
  }
  document.addEventListener("fullscreenchange", function () { setTimeout(function () { vp1.resize(); vp2.resize(); }, 120); });

  /* link the two viewports so compare behaves like one workstation */
  function link() {
    var guard = false;
    function mk(a, b) { a.onview = function () { if (guard || !state.cmp) return; guard = true; b.setView(a.getView()); guard = false; }; }
    mk(vp1, vp2); mk(vp2, vp1);
  }

  function byId(id) { return CASES.filter(function (c) { return c.id === id; })[0]; }
  function modCases(m) { return CASES.filter(function (c) { return c.mod === m; }); }

  function buildMods() {
    var h = "";
    MODS.forEach(function (m) {
      var n = modCases(m.id).length, done = modCases(m.id).filter(function (c) { return progress[c.id] && progress[c.id].done; }).length;
      h += '<button type="button" role="tab" data-mod="' + m.id + '" aria-selected="' + (m.id === state.mod) + '">' + m.label + "<small>" + done + "/" + n + "</small></button>";
    });
    $("#mods").innerHTML = h;
  }
  $("#mods").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-mod]"); if (!b) return;
    setMod(b.dataset.mod);
  });
  function setMod(m) {
    state.mod = m; state.filter = "";
    buildMods(); buildList();
    var id = state.lastByMod[m] || modCases(m)[0].id;
    select(id);
  }

  function buildList() {
    var list = modCases(state.mod), f = state.filter.toLowerCase();
    var order = [];
    list.forEach(function (c) { if (order.indexOf(c.grp) < 0) order.push(c.grp); });
    list = list.slice().sort(function (a, b) { return order.indexOf(a.grp) - order.indexOf(b.grp); });
    var h = '<div class="srch"><input type="search" id="q" placeholder="Search cases" aria-label="Search cases" value="' + esc(state.filter) + '"></div>', last = "";
    list.forEach(function (c) {
      if (f && (c.t + " " + c.grp).toLowerCase().indexOf(f) < 0) return;
      if (c.grp !== last) { h += '<div class="grp">' + esc(c.grp) + "</div>"; last = c.grp; }
      var ok = progress[c.id] && progress[c.id].done;
      h += '<button type="button" class="case" data-id="' + c.id + '" aria-current="' + (c.id === state.id) + '"><span class="t">' + esc(c.t) + "</span>" + (ok ? '<span class="ok" aria-label="completed">✓</span>' : "") + "</button>";
    });
    caseList.innerHTML = h;
    var q = $("#q", caseList);
    q.addEventListener("input", function () { state.filter = q.value; var pos = q.selectionStart; buildList(); var n = $("#q", caseList); n.focus(); n.setSelectionRange(pos, pos); });
  }
  caseList.addEventListener("click", function (ev) {
    var b = ev.target.closest(".case"); if (!b) return;
    select(b.dataset.id); document.body.classList.remove("cases-open"); $("#casesBtn").setAttribute("aria-expanded", "false");
  });
  $("#casesBtn").addEventListener("click", function () { var o = document.body.classList.toggle("cases-open"); this.setAttribute("aria-expanded", o); });
  $("#scrim").addEventListener("click", function () { document.body.classList.remove("cases-open"); $("#casesBtn").setAttribute("aria-expanded", "false"); });

  function modOf(c) { return MODS.filter(function (m) { return m.id === c.mod; })[0]; }

  function select(id) {
    var c = byId(id); if (!c) return;
    state.id = id; state.revealed = false; state.answer = null; state.quiz = {}; state.lastByMod[c.mod] = id;
    if (c.mod !== state.mod) { state.mod = c.mod; buildMods(); buildList(); }
    caseList.querySelectorAll(".case").forEach(function (b) { b.setAttribute("aria-current", b.dataset.id === id); });
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    vp1.ann = []; vp1.truth = []; vp2.ann = []; vp2.truth = [];
    vp1.zoom = vp2.zoom = 1; vp1.panx = vp1.pany = vp2.panx = vp2.pany = 0; vp1.wl = vp2.wl = { w: 1, l: 0.5 }; vp1.inv = vp2.inv = false;
    vp1.wl = { w: 1, l: 0.5 }; vp2.wl = { w: 1, l: 0.5 };
    toolsEl.querySelector('[data-act="invert"]').setAttribute("aria-pressed", "false");
    var si = sourceInfo(c);
    vp1.meta = { top: modOf(c).modality + " · " + c.view, sub: c.t, tag: si, hint: vp1.meta.hint };
    vp1.natW = vp1.natH = 0; vp1.loaded = false; vp1.draw();
    vp1.cv.setAttribute("aria-label", c.alt || c.t);
    var firstPanel = c.panels && c.panels[0];
    var p = c.kind === "dicom" ? (vp1.setPending("DICOM series. Connect Cornerstone3D and a DICOMweb source (see radiology/README.md) to load this study."), Promise.resolve())
      : c.kind === "cine" ? vp1.loadVideo(c.img, c.fps)
      : c.kind === "stack" ? vp1.loadStack(c.frames)
      : vp1.loadImage(c.img, firstPanel ? firstPanel.rect : null);
    p.then(function () {
      if (state.id !== id) return;
      vp1.meta.sub = c.t + (firstPanel ? " · " + firstPanel.label : "");
      vp1.draw(); vp2.draw();
    }).catch(function () {});
    state.panel = firstPanel ? firstPanel.id : null;
    setCompare(false);
    buildCine(c);
    renderPanel();
  }

  /* compare: a second image with its own label, kept in step with the first */
  function setCompare(on) {
    var c = byId(state.id), btn = toolsEl.querySelector('[data-act="compare"]');
    var ref = c && (c.cmp || (state.panel && c.panels ? { panelCompare: true } : null));
    if (c && c.panels && on) { /* panel compare: show another sequence beside the first */
      var other = c.panels.filter(function (x) { return x.id !== state.panel; })[0];
      state.cmp = true; stage.classList.add("two"); vp2.el.hidden = false;
      vp2.meta = { top: "Compare · " + other.label, sub: c.t, tag: { tag: "SAME PATIENT", text: other.label + " panel from the same figure", ref: true }, hint: "" };
      vp2.resize(); vp2.loadImage(c.img, other.rect).then(function () { vp2.setView(vp1.getView()); vp2.draw(); });
      btn.setAttribute("aria-pressed", "true"); return;
    }
    if (!on || !c) {
      state.cmp = false; stage.classList.remove("two"); vp2.el.hidden = true; vp2.setPending(""); vp2.clearMedia();
      btn.setAttribute("aria-pressed", "false");
      btn.disabled = false; btn.title = c && !c.cmp && !c.panels ? "No reference image for this case yet. Press to see what is missing." : "Show a reference image beside this one.";
      setTimeout(function () { vp1.resize(); }, 0);
      return;
    }
    state.cmp = true; stage.classList.add("two"); vp2.el.hidden = false;
    btn.setAttribute("aria-pressed", "true");
    vp2.resize(); vp1.resize();
    if (c.cmp) {
      var si = sourceInfo(c, c.cmp.src);
      vp2.meta = { top: "Reference · " + modOf(c).modality, sub: c.cmp.cap, tag: { tag: si.tag, text: si.text, ref: true }, hint: "" };
      vp2.loadImage(c.cmp.src).then(function () { vp2.setView(vp1.getView()); vp2.draw(); });
    } else {
      vp2.clearMedia(); vp2.loaded = false; vp2.draw();
      vp2.meta = { top: "Reference", sub: "", tag: null, hint: "" };
      vp2.setPending("No normal reference image has been added for this case yet. A real, licensed normal study will be shown here. Nothing is drawn or generated in its place.");
    }
  }

  /* cine controls. Stills are labelled as stills and the controls stay off. */
  function buildCine(c) {
    var show = c.mod === "us" || c.kind === "cine" || c.kind === "stack";
    cineEl.hidden = !show; if (!show) return;
    var live = c.kind === "cine", stack = c.kind === "stack";
    if (stack) {
      cineEl.innerHTML = '<button type="button" data-c="prev">Prev</button><input type="range" min="1" max="' + c.frames.length + '" value="1" id="sl" aria-label="Slice"><button type="button" data-c="next">Next</button><span class="note">Scroll the wheel to move through slices.</span>';
      return;
    }
    cineEl.innerHTML =
      '<button type="button" data-c="play" ' + (live ? "" : "disabled") + ' aria-pressed="false">Play</button>' +
      '<button type="button" data-c="back" ' + (live ? "" : "disabled") + ">−1 frame</button>" +
      '<button type="button" data-c="fwd" ' + (live ? "" : "disabled") + ">+1 frame</button>" +
      '<button type="button" data-c="slow" ' + (live ? "" : "disabled") + ' aria-pressed="false">0.25×</button>' +
      '<button type="button" data-c="half" ' + (live ? "" : "disabled") + ' aria-pressed="false">0.5×</button>' +
      '<button type="button" data-c="norm" ' + (live ? "" : "disabled") + ' aria-pressed="true">1×</button>' +
      (live ? '<span class="frame" id="fr" aria-live="off"></span>' : "") +
      '<span class="note">' + (live ? (c.mod === "us" ? "Real cine loop. Loops continuously." : "Real scan, scrolled slice by slice. Use the frame buttons to step one slice. Loops continuously.") : "Still frame. A real cine loop (probe movement, sliding, Doppler) has not been added yet, so playback is off.") + "</span>";
  }
  vp1.onframe = function (v) {
    var el = document.getElementById("fr"), c = byId(state.id);
    if (!el || !c || c.kind !== "cine" || !v.duration) return;
    var n = Math.round(v.duration * (vp1.fps || 30)), k = Math.min(n, Math.floor(v.currentTime * (vp1.fps || 30) + 0.001) + 1);
    el.textContent = (c.unit || "Frame") + " " + k + " / " + n;
  };
  cineEl.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b || b.disabled) return;
    var k = b.dataset.c, v = vp1.video;
    if (k === "prev") vp1.slice(-1); else if (k === "next") vp1.slice(1);
    else if (!v) return;
    else if (k === "play") { var on = v.paused; vp1.play(on); b.setAttribute("aria-pressed", on); b.textContent = on ? "Pause" : "Play"; }
    else if (k === "back" || k === "fwd") { v.pause(); vp1.play(false); var f = vp1.fps || 30, cur = Math.floor(v.currentTime * f + 0.001), last = Math.max(0, Math.round((v.duration || 0) * f) - 1); v.currentTime = (clamp(cur + (k === "fwd" ? 1 : -1), 0, last) + 0.5) / f; }
    else { v.playbackRate = k === "slow" ? 0.25 : k === "half" ? 0.5 : 1; cineEl.querySelectorAll("[data-c=slow],[data-c=half],[data-c=norm]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); }
  });
  cineEl.addEventListener("input", function (ev) { if (ev.target.id === "sl") vp1.showSlice(+ev.target.value - 1); });

  /* ---------- Case panel ---------- */
  function list(a) { return a && a.length ? "<ul>" + a.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : ""; }
  function renderPanel() {
    var c = byId(state.id), si = sourceInfo(c), h = "";
    h += "<h2>" + esc(c.t) + '</h2><div class="chips"><span class="chip">' + esc(modOf(c).label) + '</span><span class="chip">' + esc(c.view) + '</span><span class="chip ' + (si.real ? "real" : "warn") + '">' + esc(si.chip || (si.tag === "ILLUSTRATION" ? "Illustration, not a clinical scan" : "Teaching image")) + "</span></div>";
    h += '<div class="sec"><h3>Clinical presentation</h3><p>' + esc(c.hx) + "</p></div>";
    if (c.panels) {
      h += '<div class="sec"><h3>Sequence</h3><div class="opts" id="pan" style="flex-direction:row;flex-wrap:wrap">' +
        c.panels.map(function (p) { return '<button type="button" data-pan="' + p.id + '" class="' + (p.id === state.panel ? "sel" : "") + '" style="min-width:64px">' + esc(p.label) + "</button>"; }).join("") + "</div>" +
        '<p class="why">Pick a panel to view, then press Compare to see a second sequence beside it.</p></div>';
    }
    h += '<div class="sec" id="task"><h3>Your task</h3><p>' + esc(c.task) + '</p><div id="taskbody"></div></div>';
    h += '<div id="reveal"></div>';
    h += '<div class="foot">' + esc(si.text) + " The teaching text is a draft and needs clinical review before use. This lab teaches image recognition and is not a diagnostic tool.</div>";
    h += creditHtml(c);
    if (c.mod === "ct") h += CT_REF;
    if (c.grp === "Lines and tubes") h += LINE_REF;
    panel.innerHTML = h; panel.scrollTop = 0;
    refreshTask();
  }

  function creditHtml(c) {
    var ids = (c.cr || []).concat(c.cmp && c.cmp.cr ? c.cmp.cr : []), C = (window.RAD && window.RAD.credits) || {};
    ids = ids.filter(function (k, i) { return C[k] && ids.indexOf(k) === i; });
    if (!ids.length) return "";
    return '<details class="credit"><summary>Image credit and licence</summary>' + ids.map(function (k) {
      var x = C[k];
      return "<p><b>" + esc(x.name) + "</b><br>" + esc(x.authors) + ". " + esc(x.source) + ' <a href="' + esc(x.url) + '" target="_blank" rel="noopener">Source</a><br>Licence: ' +
        (x.licUrl && /^https:\/\/creativecommons/.test(x.licUrl) ? '<a href="' + esc(x.licUrl) + '" target="_blank" rel="noopener">' + esc(x.lic) + "</a>" : esc(x.lic)) +
        "<br>" + esc(x.via) + "<br>Changes: " + esc(x.changes) + (x.cite ? "<br>" + esc(x.cite) : "") + (x.note ? "<br>" + esc(x.note) : "") + "</p>";
    }).join("") + "</details>";
  }

  var CT_REF = '<details><summary>CT window reference (Hounsfield units)</summary><table><tr><th>Window</th><th>Centre / width</th><th>Use</th></tr>' +
    "<tr><td>Brain</td><td>40 / 80</td><td>Grey-white differentiation, early infarct</td></tr>" +
    "<tr><td>Subdural</td><td>75 / 215</td><td>Thin extra-axial blood against bone</td></tr>" +
    "<tr><td>Stroke</td><td>40 / 40</td><td>Narrow window for subtle hypodensity</td></tr>" +
    "<tr><td>Lung</td><td>-600 / 1500</td><td>Airways, ground-glass, pneumothorax</td></tr>" +
    "<tr><td>Mediastinum</td><td>50 / 350</td><td>Vessels, nodes, pleura</td></tr>" +
    "<tr><td>Abdomen</td><td>40 / 400</td><td>Solid organs, bowel</td></tr>" +
    "<tr><td>Bone</td><td>400 / 1800</td><td>Fractures</td></tr></table>" +
    '<p class="why">The W/L tool here changes 8-bit display contrast only. It cannot reproduce these windows, which need the original DICOM Hounsfield data.</p></details>';
  var LINE_REF = '<details open><summary>Lines and tubes: target positions</summary><table><tr><th>Device</th><th>Target tip</th></tr>' +
    "<tr><td>Endotracheal tube</td><td>About 5 cm (3 to 7) above the carina, neck neutral</td></tr>" +
    "<tr><td>Central venous catheter</td><td>Lower third of the SVC or cavo-atrial junction. Not in the atrium, not curled up the neck</td></tr>" +
    "<tr><td>Dialysis catheter</td><td>Cavo-atrial junction or right atrium, as the device and unit protocol specify</td></tr>" +
    "<tr><td>Nasogastric tube</td><td>Below the left hemidiaphragm, tip in the stomach, all side holes below the diaphragm</td></tr>" +
    "<tr><td>Chest drain</td><td>Within the pleural space with all side holes inside. Apical for air, basal and posterior for fluid</td></tr></table></details>";

  function answerPoints() {
    var pts = [];
    vp1.ann.forEach(function (a) {
      if (a.t === "point") pts.push(a.p);
      else if (a.t === "arrow") pts.push(a.b);
      else if (a.t === "circle") pts.push(a.c);
    });
    return pts;
  }
  function inside(p, r, slack) {
    var rx = r[2] * 1.35 + slack, ry = r[3] * 1.35 + slack;
    var dx = (p[0] - r[0]) / rx, dy = (p[1] - r[1]) / ry;
    return dx * dx + dy * dy <= 1;
  }
  function grade(c) {
    var pts = answerPoints(), hit = c.reg.map(function (r) { return pts.some(function (p) { return inside(p, r, 0.025); }); });
    var n = hit.filter(Boolean).length;
    return { hit: hit, n: n, of: c.reg.length, pts: pts.length };
  }

  function refreshTask() {
    var c = byId(state.id), body = $("#taskbody"); if (!body) return;
    if (state.revealed) { body.innerHTML = state.resultHtml || ""; return; }
    var h = "";
    if (c.choice) {
      h += '<p class="why">Look at the image, then answer.</p><p><b>' + esc(c.choice.q) + '</b></p><div class="opts" id="copts">' +
        c.choice.o.map(function (o, i) { return '<button type="button" data-o="' + i + '" class="' + (state.answer === i ? "sel" : "") + '">' + esc(o) + "</button>"; }).join("") + "</div>";
      h += '<div class="btnrow"><button type="button" class="btn pri" id="submit" ' + (state.answer == null ? "disabled" : "") + ">Submit</button></div>";
    } else {
      var n = answerPoints().length;
      h += '<p class="why">Use Point, Arrow or Circle on the image. ' + (n ? n + " mark" + (n > 1 ? "s" : "") + " placed." : "No marks yet.") + "</p>";
      h += '<div class="btnrow"><button type="button" class="btn pri" id="submit" ' + (n ? "" : "disabled") + '>Submit my interpretation</button><button type="button" class="btn" id="skip">Show the answer</button></div>';
    }
    body.innerHTML = h;
  }
  vp1.onann = refreshTask;

  panel.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    var c = byId(state.id);
    if (b.dataset.pan) {
      var p = c.panels.filter(function (x) { return x.id === b.dataset.pan; })[0];
      state.panel = p.id; vp1.loadImage(c.img, p.rect).then(function () { vp1.meta.sub = c.t + " · " + p.label; vp1.draw(); if (state.cmp) setCompare(true); });
      panel.querySelectorAll("[data-pan]").forEach(function (x) { x.classList.toggle("sel", x === b); });
    } else if (b.dataset.o != null && b.parentElement.id === "copts") {
      state.answer = +b.dataset.o; refreshTask();
    } else if (b.id === "submit") {
      if (c.choice) {
        var ok = state.answer === c.choice.a;
        reveal(c, ok ? "ok" : "no", (ok ? "Correct. " : "Not quite. The answer is: " + c.choice.o[c.choice.a] + ". ") + c.choice.w);
      } else {
        var g = grade(c);
        if (g.n === g.of) reveal(c, "ok", "You found it. " + (g.of > 1 ? "All " + g.of + " areas are marked." : "Your mark is on the abnormal area."));
        else if (g.n > 0) reveal(c, "part", "Partly right. You found " + g.n + " of " + g.of + " areas. The green dashed outlines show all of them.");
        else reveal(c, "no", "Your marks missed the abnormal area. The green dashed outline shows where it is.");
      }
    } else if (b.id === "skip") {
      reveal(c, "part", "Answer shown without a submission. This does not count as completed.", true);
    } else if (b.dataset.q != null) {
      answerQuiz(c, +b.dataset.q, +b.dataset.k);
    }
  });

  function reveal(c, kind, msg, skipped) {
    state.revealed = true;
    state.resultHtml = '<div class="result ' + kind + '">' + esc(msg) + "</div>";
    state.skipped = !!skipped; state.correct = kind === "ok";
    if (!c.choice) vp1.truth = c.reg.map(function (r) { return { t: "region", c: [r[0], r[1]], r: [r[2], r[3]], label: r[4] }; });
    vp1.draw();
    var h = '<div class="sec"><h3>Findings</h3>' + list(c.find) + "</div>" +
      '<div class="sec"><h3>Radiological interpretation</h3><p>' + esc(c.rep) + "</p></div>" +
      (c.ddx && c.ddx.length ? '<div class="sec"><h3>Differential diagnosis</h3>' + list(c.ddx) + "</div>" : "") +
      '<div class="sec"><h3>Why it matters</h3><p>' + esc(c.sig) + "</p></div>" +
      (c.icu && c.icu.length ? '<div class="sec"><h3>' + esc(c.icuTitle || "ICU management") + "</h3>" + list(c.icu) + "</div>" : "") +
      '<div class="sec" id="quiz"><h3>Check your understanding</h3>' + (c.q || []).map(function (q, i) {
        return '<p style="margin-top:8px"><b>' + esc(q.q) + '</b></p><div class="opts" data-qi="' + i + '">' + q.o.map(function (o, k) { return '<button type="button" data-q="' + i + '" data-k="' + k + '">' + esc(o) + "</button>"; }).join("") + '</div><p class="why" id="why' + i + '"></p>';
      }).join("") + "</div>";
    $("#reveal").innerHTML = h;
    refreshTask();
    if (!skipped) markDone(c, kind);
    $("#reveal").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function markDone(c, kind) {
    progress[c.id] = { done: true, found: kind === "ok" ? 1 : kind === "part" ? 0.5 : 0 };
    store.set(progress); buildMods(); buildList();
  }
  function answerQuiz(c, qi, k) {
    var q = c.q[qi]; if (state.quiz[qi] != null) return;
    state.quiz[qi] = k;
    var wrap = panel.querySelector('[data-qi="' + qi + '"]');
    wrap.querySelectorAll("button").forEach(function (b, i) { b.disabled = true; b.classList.toggle("right", i === q.a); b.classList.toggle("wrong", i === k && k !== q.a); });
    $("#why" + qi).textContent = (k === q.a ? "Correct. " : "Not quite. ") + q.w;
  }

  /* keyboard */
  document.addEventListener("keydown", function (ev) {
    if (/INPUT|TEXTAREA|SELECT/.test((ev.target.tagName || ""))) return;
    var map = { p: "pan", z: "zoom", w: "wl", m: "measure", a: "arrow", c: "circle", x: "point" };
    var k = ev.key.toLowerCase();
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (map[k]) setTool(map[k]);
    else if (k === "i") act("invert"); else if (k === "r") act("reset"); else if (k === "f") act("full");
    else if (k === "arrowdown" && vp1.stack) { vp1.slice(1); ev.preventDefault(); }
    else if (k === "arrowup" && vp1.stack) { vp1.slice(-1); ev.preventDefault(); }
  });

  /* start */
  buildTools(); link(); buildMods();
  var start = (location.hash || "").slice(1), sc = byId(start);
  state.mod = sc ? sc.mod : "cxr";
  buildMods(); buildList(); setTool("pan");
  select(sc ? sc.id : modCases(state.mod)[0].id);
  window.addEventListener("hashchange", function () { var h = location.hash.slice(1); if (byId(h) && h !== state.id) select(h); });
  window.RADLAB = { select: select, vp1: vp1, vp2: vp2, state: state, cases: CASES, setTool: setTool, grade: grade, setCompare: setCompare };
})();
