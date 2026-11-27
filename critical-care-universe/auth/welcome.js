/* Critical Care Universe: beta welcome and onboarding layer.
   Loaded before auth/gate.js. It is a separate, optional layer: it never reads or changes sign-in, approval, account-deletion
   or admin logic, and it never talks to Supabase. If this file or auth/welcome.css fails to load or throws, the sign-in gate
   works exactly as before.
   It does three things:
   1. First visit only: a welcome screen over the gate. "Create account" / "I already have an account" simply close it and,
      for sign-up, press the gate's own "Create account" link.
   2. Adds a four-step progress strip (and a short note) to the gate's sign-up, verify and pending screens.
   3. Adds a discreet "Install app" link that expands a small instruction panel (never a modal). */
(function () {
  "use strict";

  var FLAG = "ccu-welcome-seen";          /* starts with "ccu", so deleting an account on this device also clears it */
  var SESSION_KEY = "ccu-beta-auth";      /* the gate's stored sign-in (read only to see whether someone is already signed in) */
  var q, overlay = null, gateRoot = null, inertOn = false, panelOpen = false, deferredInstall = null, installed = false, uid = 0;

  try { init(); } catch (e) { cleanupOverlay(); }

  /* ---------- environment ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function setFlag() { try { localStorage.setItem(FLAG, "1"); return; } catch (e) {} try { sessionStorage.setItem(FLAG, "1"); } catch (e2) {} }
  function isStandalone() {
    try { if (navigator.standalone === true) return true; } catch (e) {}
    try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: minimal-ui)").matches; } catch (e2) { return false; }
  }
  function platform() {
    var ua = String(navigator.userAgent || "");
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "";
  }
  /* The welcome screen is for people opening the app for the first time on this browser. It never shows for email links
     (confirmation, password reset, errors), deep links, an existing sign-in, or an installed Home Screen app. */
  function shouldShow() {
    var w = q.get("welcome");
    if (w === "0") return false;
    if (/(^|[#&])(access_token|refresh_token|token_hash|error|error_code|error_description|type)=/.test(String(location.hash || ""))) return false;
    if (q.has("to") || q.has("old") || q.has("home")) return false;
    if (w === "1") return true;                      /* review switch: shows the welcome screen regardless of history */
    if (isStandalone()) return false;
    if (lsGet(SESSION_KEY)) return false;
    if (lsGet(FLAG) || ssGet(FLAG)) return false;
    return true;
  }

  /* ---------- install help (inline panel) ---------- */
  function installBlocks() {
    var ios = '<div class="cw-blk"><div class="cw-lbl">iPhone &middot; Safari</div><ol>' +
      '<li>Open this page in Safari.</li><li>Tap the Share button.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>, then open <b>CC Universe</b> from your Home Screen.</li></ol></div>';
    var and = '<div class="cw-blk"><div class="cw-lbl">Android &middot; Chrome</div><ol>' +
      '<li>Open this page in Chrome and tap the &#8942; menu.</li><li>Choose <b>Install app</b>. If you only see <b>Add to Home screen</b>, choose that.</li><li>Confirm, then open <b>CC Universe</b> from your Home Screen.</li></ol></div>';
    var p = platform();
    return p === "ios" ? ios + and : p === "android" ? and + ios : ios + and;
  }
  function installHTML() {
    var id = "cwInstall" + (++uid);
    return '<div class="cw-install" data-cw-add="install">' +
      '<button type="button" class="cw-link" data-cw="install" aria-expanded="' + (panelOpen ? "true" : "false") + '" aria-controls="' + id + '">Install app</button>' +
      '<div class="cw-panel" id="' + id + '"' + (panelOpen ? "" : " hidden") + '>' +
        '<div class="cw-ptitle">Add to your Home Screen</div>' +
        '<p class="cw-psub">Optional. Opens full screen like an app. It still needs an internet connection.</p>' +
        installBlocks() +
        '<button type="button" class="cw-btn go" data-cw="installnow"' + (deferredInstall ? "" : " hidden") + '>Install now</button>' +
        '<p class="cw-warn">On iPhone, the installed app keeps its own sign-in. Register and verify your email in Safari first, then sign in once inside the app.</p>' +
      '</div></div>';
  }
  function togglePanel(btn) {
    var wrap = btn.closest("[data-cw-add=install]"), panel = wrap && wrap.querySelector(".cw-panel");
    if (!panel) return;
    panelOpen = panel.hidden;                    /* hidden now means it is about to open */
    panel.hidden = !panelOpen;
    btn.setAttribute("aria-expanded", panelOpen ? "true" : "false");
    if (panelOpen) { try { panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {} }
  }
  function installNow() {
    var d = deferredInstall; if (!d) return;
    deferredInstall = null; syncInstallNow();
    try { d.prompt(); if (d.userChoice && d.userChoice.then) d.userChoice.then(function () {}, function () {}); } catch (e) {}
  }
  function syncInstallNow() {
    var list = document.querySelectorAll("[data-cw=installnow]");
    for (var i = 0; i < list.length; i++) list[i].hidden = !deferredInstall;
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-cw]") : null; if (!t) return;
    var k = t.getAttribute("data-cw");
    if (k === "install") togglePanel(t);
    else if (k === "installnow") installNow();
  }
  window.addEventListener("beforeinstallprompt", function (e) { try { e.preventDefault(); deferredInstall = e; syncInstallNow(); } catch (x) {} });
  window.addEventListener("appinstalled", function () { installed = true; deferredInstall = null; var l = document.querySelectorAll("[data-cw-add=install]"); for (var i = 0; i < l.length; i++) l[i].hidden = true; });

  /* ---------- the gate: read-only watching, plus an inert flag while the welcome screen is up ---------- */
  function setInert(on) {
    if (!gateRoot) return;
    inertOn = on;
    try {
      if (on) { gateRoot.setAttribute("inert", ""); gateRoot.setAttribute("aria-hidden", "true"); }
      else { gateRoot.removeAttribute("inert"); gateRoot.removeAttribute("aria-hidden"); }
    } catch (e) {}
  }
  function steps(cur, done) {
    var names = ["Register", "Verify", "Approval", "Enter"], html = "";
    for (var i = 0; i < 4; i++) {
      var st = i < done ? "done" : i === cur ? "cur" + (i === 2 ? " wait" : "") : "";
      html += '<li class="' + st + '"' + (i === cur ? ' aria-current="step"' : "") + '><span class="cw-dot" aria-hidden="true">' + (i < done ? "&#10003;" : (i + 1)) + '</span>' + names[i] +
        (i < done ? '<span class="cw-sr"> (done)</span>' : "") + '</li>';
    }
    return '<ol class="cw-steps" data-cw-add="steps" aria-label="Your progress">' + html + '</ol>';
  }
  function screenOf(card) {
    if (card.querySelector('form[data-form="signup"]')) return "signup";
    if (card.querySelector("#cgResend")) return "verify";
    if (card.querySelector("#cgRefresh")) return "pending";
    return "";
  }
  function noteHTML(s) {
    return '<p class="cw-note" data-cw-add="note">' + (s === "pending"
      ? "You can also close this page and come back later. Once you are approved, signing in takes you straight in."
      : "Cannot find it? Check your spam or junk folder.") + '</p>';
  }
  function add(card, html, before) {
    var d = document.createElement("div"); d.innerHTML = html;
    var n = d.firstChild; if (!n) return;
    if (before) card.insertBefore(n, before); else card.appendChild(n);
    return n;
  }
  function enhance(card) {
    var s = screenOf(card);
    if (!s || card.querySelector("[data-cw-add]")) return;       /* nothing to add, or already added to this screen */
    var first = card.firstChild;
    add(card, steps(s === "signup" ? 0 : s === "verify" ? 1 : 2, s === "signup" ? 0 : s === "verify" ? 1 : 2), first);
    if (s !== "signup") {
      var state = card.querySelector(".cg-state");
      if (state && state.parentNode === card) { var n = document.createElement("div"); n.innerHTML = noteHTML(s); card.insertBefore(n.firstChild, state.nextSibling); }
      var inst = add(card, installHTML()); if (inst && installed) inst.hidden = true;
    }
  }
  function attachToGate() {
    var root = document.querySelector("html > .cg"); if (!root) return false;
    var card = root.querySelector("#cgCard"); if (!card) return false;
    gateRoot = root;
    if (overlay && !inertOn) setInert(true);
    card.addEventListener("click", onClick);
    if (overlay) { try { var h = overlay.querySelector("#cwTitle"); if (h) h.focus({ preventScroll: true }); } catch (e) {} }   /* the gate focuses its own field first: bring focus back to the welcome screen */
    enhance(card);
    new MutationObserver(function () { try { enhance(card); } catch (e) {} }).observe(card, { childList: true });
    return true;
  }
  function watchGate() {
    if (attachToGate()) return;
    var mo = new MutationObserver(function () { try { if (attachToGate()) mo.disconnect(); } catch (e) { mo.disconnect(); } });
    mo.observe(document.documentElement, { childList: true });
  }

  /* ---------- the welcome screen ---------- */
  function base() { try { return new URL("./", location.href).href; } catch (e) { return "./"; } }
  function welcomeHTML() {
    var b = base();
    return '<svg class="cw-ecg" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50H300l14-2 10-26 14 56 14-72 12 44 10-4h60l14-2 10-22 14 48 14-62 12 38 10-4H1200"/></svg>' +
      '<div class="cw-wrap">' +
        '<img class="cw-logo" src="./auth/logo.jpg?v=20261127d" width="640" height="624" alt="Critical Care Universe" decoding="async">' +
        '<span class="cw-chip">Private beta</span>' +
        '<h1 class="cw-h1" id="cwTitle" tabindex="-1">Welcome to the private beta</h1>' +
        '<p class="cw-tag">Learn it. Practise it. Lead the unit.</p>' +
        '<p class="cw-lead">You are invited to test an immersive critical-care learning universe: a 360&deg; human body, live updates, a bay monitor and Memory Lab.</p>' +
        '<div class="cw-card"><div class="cw-lbl">How access works</div><ol class="cw-ol">' +
          '<li>Create your account</li><li>Verify your email</li><li>Wait for approval</li><li>Enter the universe</li></ol></div>' +
        '<button type="button" class="cw-btn go" data-cw="create">Create account</button>' +
        '<button type="button" class="cw-btn" data-cw="signin">I already have an account</button>' +
        installHTML() +
        '<p class="cw-foot">Educational use only. Never enter patient information.<br>' +
          '<a href="' + b + 'legal/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> &middot; <a href="' + b + 'legal/support.html" target="_blank" rel="noopener">Support</a></p>' +
      '</div>';
  }
  function cleanupOverlay() {
    try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
    overlay = null;
    setInert(false);
  }
  function closeOverlay() {
    var o = overlay; overlay = null;
    setInert(false);
    if (!o) return;
    try { o.classList.add("cw-out"); } catch (e) {}
    setTimeout(function () { try { if (o.parentNode) o.parentNode.removeChild(o); } catch (e) {} }, 260);
  }
  function gotoSignup() {
    var tries = 0;
    (function tick() {
      var b = document.querySelector('html > .cg #cgCard [data-go="signup"]');
      if (b) { try { b.click(); } catch (e) {} return; }
      if (++tries < 60) setTimeout(tick, 100);          /* the gate is still checking for a stored sign-in: wait up to ~6 s */
    })();
  }
  function finish(toSignup) {
    try { setFlag(); } catch (e) {}
    closeOverlay();
    if (toSignup) { try { gotoSignup(); } catch (e) {} }
  }
  function showWelcome() {
    var el = document.createElement("div");
    el.className = "cw"; el.id = "cw"; el.setAttribute("role", "region"); el.setAttribute("aria-labelledby", "cwTitle");
    el.style.visibility = "hidden";                       /* revealed only once its stylesheet is confirmed */
    el.innerHTML = welcomeHTML();
    document.documentElement.appendChild(el);
    overlay = el;
    var ok = function () { return getComputedStyle(el).getPropertyValue("--cw-ok").trim() === "1"; };
    var reveal = function () {
      if (overlay !== el) return;
      el.style.visibility = "";
      if (gateRoot) setInert(true);
      try { var h = el.querySelector("#cwTitle"); if (h) h.focus({ preventScroll: true }); } catch (e) {}
    };
    el.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-cw]"); if (!t) return;
      var k = t.getAttribute("data-cw");
      if (k === "create") finish(true);
      else if (k === "signin") finish(false);
      else onClick(e);
    });
    if (ok()) reveal();
    else window.addEventListener("load", function () { if (overlay !== el) return; if (ok()) reveal(); else cleanupOverlay(); });   /* stylesheet missing: never leave an unstyled screen over the gate */
  }

  /* ---------- start ---------- */
  function init() {
    q = new URLSearchParams(location.search);
    watchGate();                                          /* progress strip and install link on the gate's own screens */
    if (shouldShow()) showWelcome();
  }
})();
