/* Critical Care Universe: beta login gate.
   Loads BEFORE the app. The existing startup flow (assets/startup.js) is only loaded after Supabase says this
   signed-in user's beta_access.access_status is "approved". Only the public URL and anon key are used here.
   NOTE: this is an access screen, not encryption. See auth/README.md (section "What a static gate can and cannot do"). */
(function () {
  "use strict";

  var CFG = window.CCU_AUTH_CONFIG || {};
  var APP_SRC = "./assets/startup.js?v=20261126q";   /* the original, unchanged startup script */
  var MIN_PW = 8;
  var WATCH_MS = 120000;                              /* re-check approval while the app is open */

  var sb = null, appStarted = false, screenName = "", curUid = null, curEmail = "";
  var evaluating = false, recovering = false, pollTimer = null, watchTimer = null, cooldownTimer = null;
  var urlNotice = null;

  /* ---------- tiny helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, el) { return (el || root).querySelector(sel); }
  function folderOf(href) { var u = new URL("./", href); return u.origin + u.pathname; }
  var BASE = folderOf(location.href);                  /* the gated page's folder, fixed at load (startup.js later rewrites the URL to /home/) */
  function baseUrl() { return BASE; }
  function goBase() { try { location.replace(BASE); } catch (e) { location.reload(); } }

  /* ---------- config check (fail closed) ---------- */
  function jwtRole(k) {
    try { var p = k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(p)).role || ""; } catch (e) { return ""; }
  }
  function configProblem() {
    var u = String(CFG.supabaseUrl || ""), k = String(CFG.supabaseAnonKey || "");
    if (!u || !k || /PASTE_YOUR/.test(u + k)) return "setup";
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)\/?$/i.test(u)) return "url";
    if (jwtRole(k) === "service_role" || /service_role/i.test(k)) return "service";
    if (k.length < 40) return "key";
    return "";
  }
  if (!window.supabase || !window.supabase.createClient) { window.__ccuGateMissingSdk = true; }

  /* ---------- overlay ---------- */
  var root = document.createElement("div");
  root.className = "cg";
  root.innerHTML =
    '<svg class="cg-ecg" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50H300l14-2 10-26 14 56 14-72 12 44 10-4h60l14-2 10-22 14 48 14-62 12 38 10-4H1200"/></svg>' +
    '<div class="cg-wrap">' +
      '<div class="cg-brand">' +
        '<img class="cg-logoimg" src="./auth/logo.jpg?v=20261127d" width="640" height="624" alt="Critical Care Universe" decoding="async">' +
        '<span class="cg-chip">Private beta</span>' +
      '</div>' +
      '<div class="cg-card" id="cgCard" aria-live="polite"></div>' +
      '<p class="cg-foot">Access is granted by approval</p>' +
    '</div>';

  function mount() {
    if (root.parentNode) return;
    document.documentElement.appendChild(root);   /* on <html>, so the home swap in startup.js never removes it */
  }

  /* ---------- screens ---------- */
  var ICON = {
    mail: '<svg class="cg-ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="cg-ring" cx="32" cy="32" r="29" fill="none" stroke="#2ceaff" stroke-width="2"/><rect x="16" y="21" width="32" height="22" rx="4" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M17 24l15 11 15-11" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wait: '<svg class="cg-ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="cg-ring" cx="32" cy="32" r="29" fill="none" stroke="#ffcf5c" stroke-width="2"/><path d="M22 16h20M22 48h20M24 16c0 10 8 10 8 16s-8 6-8 16M40 16c0 10-8 10-8 16s8 6 8 16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg class="cg-ico" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="#ff8a8a" stroke-width="2"/><rect x="21" y="29" width="22" height="16" rx="3" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M26 29v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
    warn: '<svg class="cg-ico" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="#ffcf5c" stroke-width="2"/><path d="M32 18v18M32 43v3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  function pwField(id, label, auto, ph) {
    return '<div class="cg-field cg-pw"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + id + '" type="password" autocomplete="' + auto + '" placeholder="' + (ph || "") + '" required minlength="1" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="cg-eye" type="button" data-eye="' + id + '" aria-label="Show password">Show</button></div>';
  }
  function emailField(val) {
    return '<div class="cg-field"><label for="cgEmail">Email</label><input id="cgEmail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@hospital.org" required autocapitalize="off" autocorrect="off" spellcheck="false" value="' + esc(val || "") + '"></div>';
  }
  var MSGBOX = '<div class="cg-msg" id="cgMsg" role="alert" hidden></div>';
  function btn(label, id) { return '<button class="cg-btn" type="submit" id="' + (id || "cgGo") + '"><span class="cg-lbl">' + label + '</span></button>'; }

  var SCREENS = {
    checking: function () { return '<div class="cg-state"><div class="cg-btn cg-ghost" style="pointer-events:none;border:0;background:none"><span class="cg-spin"></span></div><h1>Checking your access</h1><p class="cg-sub">One moment.</p></div>'; },
    login: function (o) {
      return '<h1>Welcome back</h1><p class="cg-sub">Sign in to enter Critical Care Universe.</p>' + MSGBOX +
        '<form data-form="login" novalidate>' + emailField(o.email) + pwField("cgPw", "Password", "current-password", "Your password") + btn("Sign in") + '</form>' +
        '<div class="cg-links"><button class="cg-link" type="button" data-go="forgot">Forgot password?</button><button class="cg-link" type="button" data-go="signup">Create account</button></div>';
    },
    signup: function (o) {
      return '<h1>Request beta access</h1><p class="cg-sub">Create an account. You will confirm your email, then wait for approval.</p>' + MSGBOX +
        '<form data-form="signup" novalidate>' + emailField(o.email) + pwField("cgPw", "Password", "new-password", "At least " + MIN_PW + " characters") +
        '<div class="cg-meter" aria-hidden="true"><i id="cgMeter"></i></div><p class="cg-hint" id="cgHint">Use ' + MIN_PW + '+ characters. A mix of letters, numbers and symbols is stronger.</p>' +
        '<div style="height:10px"></div>' + pwField("cgPw2", "Confirm password", "new-password", "Type it again") + btn("Create account") + '</form>' +
        '<div class="cg-links"><button class="cg-link" type="button" data-go="login">I already have an account</button></div>';
    },
    forgot: function (o) {
      return '<h1>Reset password</h1><p class="cg-sub">Enter your email and we will send a reset link.</p>' + MSGBOX +
        '<form data-form="forgot" novalidate>' + emailField(o.email) + btn("Send reset link") + '</form>' +
        '<div class="cg-links"><button class="cg-link" type="button" data-go="login">Back to sign in</button></div>';
    },
    reset: function () {
      return '<h1>Choose a new password</h1><p class="cg-sub">Set a new password for your account.</p>' + MSGBOX +
        '<form data-form="reset" novalidate>' + pwField("cgPw", "New password", "new-password", "At least " + MIN_PW + " characters") +
        '<div class="cg-meter" aria-hidden="true"><i id="cgMeter"></i></div><div style="height:12px"></div>' + pwField("cgPw2", "Confirm new password", "new-password", "Type it again") + btn("Save password") + '</form>';
    },
    verify: function (o) {
      return '<div class="cg-state">' + ICON.mail + '<h1>Check your email</h1><p class="cg-sub">We sent a confirmation link to <b>' + esc(o.email) + '</b>. Open it on this device to verify your address. Next, your request goes to <b>Pending approval</b> until a team member approves it.</p></div>' + MSGBOX +
        '<button class="cg-btn" type="button" id="cgResend" data-act="resend">Resend email</button>' +
        '<div class="cg-links"><button class="cg-link" type="button" data-go="login">Back to sign in</button></div>';
    },
    pending: function (o) {
      return '<div class="cg-state">' + ICON.wait + '<h1>Your request is pending</h1><p class="cg-sub">Your email is verified. A team member will review your beta request. You can leave this page open: it enters automatically once you are approved.</p></div>' + MSGBOX +
        '<button class="cg-btn" type="button" id="cgRefresh" data-act="refresh"><span class="cg-lbl">Check status now</span></button>' +
        '<button class="cg-btn cg-ghost" type="button" data-act="signout">Sign out</button><p class="cg-who">' + esc(o.email) + '</p>';
    },
    denied: function (o) {
      return '<div class="cg-state">' + ICON.lock + '<h1>Access not granted</h1><p class="cg-sub">Thank you for your interest. Beta access has not been approved for this account at this time.</p></div>' +
        '<button class="cg-btn cg-ghost" type="button" data-act="signout">Sign out</button><p class="cg-who">' + esc(o.email) + '</p>';
    },
    error: function (o) {
      return '<div class="cg-state">' + ICON.warn + '<h1>' + esc(o.title || "Something went wrong") + '</h1><p class="cg-sub">' + esc(o.text || "") + '</p></div>' +
        (o.retry ? '<button class="cg-btn" type="button" data-act="refresh"><span class="cg-lbl">Try again</span></button>' : "") +
        (o.signout ? '<button class="cg-btn cg-ghost" type="button" data-act="signout">Sign out</button>' : "");
    }
  };

  function show(name, o) {
    o = o || {};
    mount();
    screenName = name;
    clearInterval(pollTimer); pollTimer = null;
    var card = $("#cgCard");
    card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
    card.innerHTML = SCREENS[name](o);
    if (o.msg) setMsg(o.msgKind || "info", o.msg);
    var first = card.querySelector("input");
    if (first && !o.noFocus) { try { first.focus({ preventScroll: true }); } catch (e) {} }
    if (name === "pending") pollTimer = setInterval(function () { recheck(true); }, 15000);
    if (name === "verify") startCooldown(60);
    root.scrollTop = 0;
  }
  function setMsg(kind, text) {
    var m = $("#cgMsg"); if (!m) return;
    m.className = "cg-msg " + kind; m.textContent = text; m.hidden = false;
  }
  function busy(form, on, label) {
    var b = form.querySelector("#cgGo, button[type=submit]"); if (!b) return;
    b.disabled = on;
    var l = b.querySelector(".cg-lbl");
    if (on) { b.setAttribute("data-old", l.textContent); l.textContent = label || "Please wait"; if (!b.querySelector(".cg-spin")) { var s = document.createElement("span"); s.className = "cg-spin"; b.insertBefore(s, l); } }
    else { var o = b.getAttribute("data-old"); if (o) l.textContent = o; var sp = b.querySelector(".cg-spin"); if (sp) sp.remove(); }
  }

  /* ---------- friendly errors ---------- */
  function friendly(err) {
    var m = String((err && err.message) || err || "").toLowerCase(), c = String((err && err.code) || "").toLowerCase(), st = err && err.status;
    if (/failed to fetch|networkerror|network request|load failed|fetch/.test(m) && !st) return "We cannot reach the server. Check your internet connection and try again.";
    if (c === "invalid_credentials" || /invalid login credentials/.test(m)) return "That email and password do not match. Check them and try again.";
    if (c === "email_not_confirmed" || /email not confirmed/.test(m)) return "Please verify your email first. Check your inbox for the confirmation link.";
    if (c === "over_email_send_rate_limit" || c === "over_request_rate_limit" || st === 429 || /rate limit|too many/.test(m)) return "Too many attempts. Please wait a minute and try again.";
    if (c === "weak_password" || /password should|weak/.test(m)) return "That password is too weak. Use at least " + MIN_PW + " characters with a mix of letters and numbers.";
    if (c === "same_password" || /different from the old/.test(m)) return "Choose a password different from your old one.";
    if (c === "signup_disabled" || /signups not allowed|signup is disabled/.test(m)) return "New sign-ups are currently closed.";
    if (c === "user_banned") return "This account is not allowed to sign in.";
    if (c === "session_not_found" || c === "refresh_token_not_found" || /jwt expired|session.*(expired|missing|not found)|refresh token/.test(m)) return "Your session expired. Please sign in again.";
    if (c === "validation_failed" || /unable to validate email|invalid format/.test(m)) return "That email address does not look right.";
    return "Something went wrong. Please try again.";
  }
  function isAuthExpiry(err) {
    var m = String((err && err.message) || "").toLowerCase(), c = String((err && err.code) || "");
    return (err && (err.status === 401 || err.status === 403)) || c === "PGRST301" || c === "PGRST303" || /jwt|expired|not authenticated/.test(m);
  }
  function strength(p) {
    var s = 0; if (p.length >= MIN_PW) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(4, s);
  }

  /* ---------- access decision ---------- */
  function startApp(session) {
    if (appStarted) return;
    appStarted = true;
    clearInterval(pollTimer); clearInterval(cooldownTimer);
    root.style.transition = "opacity .35s"; root.style.opacity = "0";
    setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 380);
    window.ccuAuth = {
      email: session.user.email,
      signOut: signOut,
      base: BASE,
      /* Admin shortcut support: resolves {pending:n} only for an administrator (the server decides; everyone else gets null and sees nothing). */
      adminInfo: async function () {
        try {
          var g = await sb.auth.getSession(), ss = g.data && g.data.session;
          if (!ss) return null;
          var r = await fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/functions/v1/" + (CFG.adminFunction || "admin-beta"), {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ss.access_token, "apikey": CFG.supabaseAnonKey },
            body: JSON.stringify({ action: "list" })
          });
          if (!r.ok) return null;
          var j = await r.json();
          return { pending: (j.users || []).filter(function (u) { return u.access_status === "pending"; }).length };
        } catch (e) { return null; }
      }
    };
    var s = document.createElement("script");
    s.src = APP_SRC;                                 /* identical script the page used to load directly */
    document.body.appendChild(s);
    watchTimer = setInterval(function () { recheck(true); }, WATCH_MS);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) recheck(true); });
  }

  async function signOut() {
    try { await sb.auth.signOut({ scope: "local" }); } catch (e) {}
    goBase();
  }

  async function evaluate(session, silent) {
    if (recovering) return;
    if (!session) { if (appStarted) { goBase(); return; } curUid = null; show("login", { email: curEmail }); return; }
    var u = session.user; curEmail = u.email || curEmail;
    if (!u.email_confirmed_at && !u.confirmed_at) { show("verify", { email: u.email }); return; }
    if (evaluating) return;
    evaluating = true;
    try {
      if (!silent && !appStarted) show("checking");
      var r = await sb.from("beta_access").select("access_status").eq("user_id", u.id).maybeSingle();
      if (r.error) {
        if (isAuthExpiry(r.error)) {
          try { await sb.auth.signOut({ scope: "local" }); } catch (e) {}
          if (appStarted) { goBase(); return; }
          show("login", { email: curEmail, msgKind: "err", msg: "Your session expired. Please sign in again." }); return;
        }
        if (appStarted) return;                       /* transient error while the app is open: keep going, retry later */
        if (silent && screenName === "pending") return;
        show("error", { title: "Could not check your access", text: "We could not read your beta status just now. Check your connection and try again.", retry: true, signout: true }); return;
      }
      var status = r.data && r.data.access_status ? r.data.access_status : "pending";   /* no row yet = pending */
      curUid = u.id;
      if (status === "approved") { startApp(session); return; }
      if (appStarted) { goBase(); return; }                                    /* approval was withdrawn */
      if (status === "rejected") { show("denied", { email: u.email }); return; }
      if (screenName !== "pending") show("pending", { email: u.email, msgKind: urlNotice ? "ok" : "", msg: urlNotice || "" });
      urlNotice = null;
    } catch (e) {
      if (!appStarted) show("error", { title: "Could not check your access", text: friendly(e), retry: true, signout: true });
    } finally { evaluating = false; }
  }
  async function recheck(silent) {
    try {
      var g = await sb.auth.getSession();
      await evaluate(g.data && g.data.session, silent);
    } catch (e) {}
  }

  /* ---------- form handlers ---------- */
  var HANDLERS = {
    login: async function (f) {
      var email = f.email.value.trim(), pw = f.cgPw.value; curEmail = email;
      if (!email || !pw) return setMsg("err", "Enter your email and password.");
      busy(f, true, "Signing in");
      var r = await sb.auth.signInWithPassword({ email: email, password: pw });
      if (r.error) {
        busy(f, false);
        if (/email_not_confirmed/.test(String(r.error.code)) || /not confirmed/i.test(r.error.message || "")) { show("verify", { email: email }); return; }
        return setMsg("err", friendly(r.error));
      }
      /* onAuthStateChange(SIGNED_IN) continues from here */
    },
    signup: async function (f) {
      var email = f.email.value.trim(), pw = f.cgPw.value, pw2 = f.cgPw2.value; curEmail = email;
      if (!email) return setMsg("err", "Enter your email address.");
      if (pw.length < MIN_PW) return setMsg("err", "Your password needs at least " + MIN_PW + " characters.");
      if (pw !== pw2) return setMsg("err", "The two passwords do not match.");
      busy(f, true, "Creating account");
      var r = await sb.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: baseUrl() } });
      if (r.error) { busy(f, false); return setMsg("err", friendly(r.error)); }
      var u = r.data && r.data.user;
      if (u && Array.isArray(u.identities) && u.identities.length === 0) {
        busy(f, false);
        return setMsg("info", "This email may already be registered. Try signing in, or use Forgot password.");
      }
      if (r.data && r.data.session) { return; }   /* confirmation disabled server-side: SIGNED_IN will follow */
      show("verify", { email: email });
    },
    forgot: async function (f) {
      var email = f.email.value.trim(); curEmail = email;
      if (!email) return setMsg("err", "Enter your email address.");
      busy(f, true, "Sending");
      var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: baseUrl() });
      busy(f, false);
      if (r.error && (r.error.status === 429 || /rate/i.test(r.error.message || ""))) return setMsg("err", friendly(r.error));
      if (r.error && !r.error.status) return setMsg("err", friendly(r.error));
      setMsg("ok", "If an account exists for that email, a reset link is on its way. Check your inbox.");
    },
    reset: async function (f) {
      var pw = f.cgPw.value, pw2 = f.cgPw2.value;
      if (pw.length < MIN_PW) return setMsg("err", "Your password needs at least " + MIN_PW + " characters.");
      if (pw !== pw2) return setMsg("err", "The two passwords do not match.");
      busy(f, true, "Saving");
      var r = await sb.auth.updateUser({ password: pw });
      if (r.error) { busy(f, false); return setMsg("err", friendly(r.error)); }
      recovering = false;
      urlNotice = null;
      var g = await sb.auth.getSession();
      if (g.data && g.data.session) { await evaluate(g.data.session); }
      else show("login", { email: curEmail, msgKind: "ok", msg: "Password updated. Sign in with your new password." });
    }
  };

  var cooldown = 0;
  function startCooldown(n) {
    clearInterval(cooldownTimer); cooldown = n;
    function tick() {
      var b = $("#cgResend"); if (!b) { clearInterval(cooldownTimer); return; }
      if (cooldown > 0) { b.disabled = true; b.textContent = "Resend email (" + cooldown + "s)"; cooldown--; }
      else { b.disabled = false; b.textContent = "Resend email"; clearInterval(cooldownTimer); }
    }
    tick(); cooldownTimer = setInterval(tick, 1000);
  }

  root.addEventListener("submit", async function (e) {
    var f = e.target.closest("form[data-form]"); if (!f) return;
    e.preventDefault();
    var m = $("#cgMsg"); if (m) m.hidden = true;
    var h = HANDLERS[f.getAttribute("data-form")];
    try { await h(f); } catch (err) { busy(f, false); setMsg("err", friendly(err)); }
  });
  root.addEventListener("click", async function (e) {
    var t = e.target.closest("[data-go],[data-act],[data-eye]"); if (!t) return;
    if (t.hasAttribute("data-eye")) {
      var i = document.getElementById(t.getAttribute("data-eye")); var show_ = i.type === "password";
      i.type = show_ ? "text" : "password"; t.textContent = show_ ? "Hide" : "Show"; t.setAttribute("aria-label", show_ ? "Hide password" : "Show password"); return;
    }
    if (t.hasAttribute("data-go")) { var em = $("#cgEmail"); if (em && em.value) curEmail = em.value.trim(); show(t.getAttribute("data-go"), { email: curEmail }); return; }
    var act = t.getAttribute("data-act");
    if (act === "signout") { t.disabled = true; await signOut(); }
    else if (act === "refresh") { var l = t.querySelector(".cg-lbl"); t.disabled = true; if (l) l.textContent = "Checking"; await recheck(false); t.disabled = false; if (l) l.textContent = "Check status now"; }
    else if (act === "resend") {
      t.disabled = true; var email = (curEmail || "").trim();
      var r = await sb.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: baseUrl() } });
      if (r.error) { setMsg("err", friendly(r.error)); t.disabled = false; } else { setMsg("ok", "Sent. Check your inbox (and spam folder)."); startCooldown(60); }
    }
  });
  root.addEventListener("input", function (e) {
    if (e.target.id !== "cgPw") return;
    var mt = $("#cgMeter"); if (!mt) return;
    var s = strength(e.target.value), cols = ["#ff6b6b", "#ff6b6b", "#ffcf5c", "#7be0a8", "#2ceaff"];
    mt.style.width = (e.target.value ? Math.max(12, s * 25) : 0) + "%"; mt.style.background = cols[s];
  });

  /* ---------- start ---------- */
  function readUrl() {
    var h = location.hash.replace(/^#/, ""), q = new URLSearchParams(h);
    var err = q.get("error_description") || (q.get("error") ? "That link is not valid." : "");
    if (err) { urlNotice = { err: err.replace(/\+/g, " ") }; }
    else if (q.get("type") === "signup" || q.get("type") === "email") { urlNotice = "Email verified. Thank you."; }
    return q.get("type");
  }

  function boot() {
    mount();
    var problem = configProblem();
    if (window.__ccuGateMissingSdk) problem = problem || "sdk";
    if (problem) {
      var T = {
        setup: ["Beta login is not configured", "Open critical-care-universe/auth/config.js and paste your Supabase project URL and anon key. The app stays locked until then."],
        url: ["Check the Supabase URL", "The project URL in auth/config.js does not look right. It should look like https://yourproject.supabase.co"],
        key: ["Check the anon key", "The anon key in auth/config.js looks incomplete. Copy the full anon (public) key."],
        service: ["Wrong key in config", "auth/config.js contains a service_role key. That key must never be used in a web page. Replace it with the anon (public) key and rotate the service_role key in Supabase now."],
        sdk: ["Login library missing", "auth/vendor/supabase.js did not load."]
      }[problem];
      show("error", { title: T[0], text: T[1] });
      return;
    }
    var type = readUrl();
    var linkErr = urlNotice && urlNotice.err; if (linkErr) urlNotice = null;
    sb = window.supabase.createClient(CFG.supabaseUrl.replace(/\/$/, ""), CFG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit", storageKey: "ccu-beta-auth" }
    });
    window.__ccuGate = { client: sb };               /* handy for support/debug; holds no secrets */
    show("checking");
    if (type === "recovery") recovering = true;
    sb.auth.onAuthStateChange(function (event, session) {
      /* never await supabase calls directly inside this callback: defer them */
      setTimeout(function () {
        if (event === "PASSWORD_RECOVERY") { recovering = true; show("reset"); return; }
        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
        if (event === "SIGNED_OUT") { if (appStarted) goBase(); else if (!recovering) show("login", { email: curEmail }); return; }
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (session && session.user.id === curUid && (appStarted || screenName === "pending" || screenName === "denied")) return;   /* tab refocus */
          evaluate(session);
        }
      }, 0);
    });
    if (linkErr) setTimeout(function () { if (screenName === "login") setMsg("err", linkErr + " Request a new link below."); else if (!appStarted) show("login", { email: "", msgKind: "err", msg: linkErr }); }, 400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
