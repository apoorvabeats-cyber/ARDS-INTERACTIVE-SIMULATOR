/* Critical Care Universe: account deletion dialog and local-data cleanup.
   Loaded before auth/gate.js. It does nothing until gate.js calls window.ccuDelete.open(...).
   The real deletion happens on the server (Supabase Edge Function "delete-account"): this file only asks for the
   confirmations, sends the signed-in session and the password, and cleans THIS device after the server confirms.
   No secret of any kind lives here: only the public project URL and public (anon/publishable) key from auth/config.js are used. */
(function () {
  "use strict";

  var SUPPORT = "criticalcareuniverse@gmail.com";
  var TIMEOUT_MS = 30000;
  var HOLD_MS = 60000;          /* after an unconfirmed result, wait this long before a new attempt can be sent */
  var open_ = false;
  var holdUntil = 0;
  var UNSURE = { uncertain: 1, timeout: 1, network: 1 };   /* results where we cannot tell whether the account was deleted */

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- local cleanup ----------
     Only keys that belong to Critical Care Universe are removed. This site's address is shared with other pages, so
     localStorage.clear() / indexedDB wipe-all would be wrong. CCU's own names all start with "ccu" or "ccmem", plus the single key "licu". */
  function isOurKey(k) { return k === "licu" || /^ccu/.test(k) || /^ccmem/.test(k); }
  function wipeStorage(st) {
    var ks = [], i, n;
    try { for (i = 0; i < st.length; i++) { n = st.key(i); if (n && isOurKey(n)) ks.push(n); } } catch (e) { return false; }
    var ok = true; ks.forEach(function (k) { try { st.removeItem(k); } catch (e) { ok = false; } });
    return ok;
  }
  function dropIdb(name) {
    return new Promise(function (res) {
      if (!window.indexedDB) return res(true);
      var done = false, t = setTimeout(function () { if (!done) { done = true; res(false); } }, 3000);   /* blocked by another open tab */
      function fin(v) { if (!done) { done = true; clearTimeout(t); res(v); } }
      try {
        var rq = indexedDB.deleteDatabase(name);
        rq.onsuccess = function () { fin(true); }; rq.onerror = function () { fin(false); }; rq.onblocked = function () { /* wait for the timeout */ };
      } catch (e) { fin(false); }
    });
  }
  function wipeCaches() {
    if (!window.caches || !caches.keys) return Promise.resolve(true);
    return caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^ccmem-/.test(k); }).map(function (k) { return caches.delete(k); })); }).then(function () { return true; }, function () { return false; });
  }
  function dropWorkers() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return Promise.resolve(true);
    return navigator.serviceWorker.getRegistrations().then(function (rs) {
      return Promise.all(rs.filter(function (r) { return /\/memory-lab\//.test(r.scope || ""); }).map(function (r) { return r.unregister(); }));
    }).then(function () { return true; }, function () { return false; });
  }
  /* Resolves {ok, failed:[...]}. Never rejects: a cleanup problem must not hide the fact that the account is gone. */
  function wipeLocal() {
    var failed = [];
    if (!wipeStorage(window.localStorage)) failed.push("saved settings");
    if (!wipeStorage(window.sessionStorage)) failed.push("session data");
    return Promise.all([dropIdb("ccmem"), wipeCaches(), dropWorkers()]).then(function (r) {
      if (!r[0]) failed.push("Memory Lab data (close other open tabs of this app and clear it in your browser settings)");
      if (!r[1]) failed.push("offline copies");
      if (!r[2]) failed.push("background workers");
      wipeStorage(window.localStorage); wipeStorage(window.sessionStorage);   /* second pass: nothing should have been re-written meanwhile */
      return { ok: failed.length === 0, failed: failed };
    }, function () { return { ok: false, failed: ["some local data"] }; });
  }

  /* ---------- messages ---------- */
  function problem(kind) {
    switch (kind) {
      case "reauth_failed": return "That password is not correct. Your account has not been deleted.";
      case "admin_protected": return "Administrator accounts cannot be deleted from the app. Email " + SUPPORT + " if you need this account removed.";
      case "rate_limited": return "Too many attempts. Please wait a few minutes and try again. Your account has not been deleted.";
      case "unauthenticated": return "Your session is no longer valid. If you already deleted this account, nothing more is needed. Otherwise sign in again and retry.";
      case "forbidden": return "This account is not allowed to use self-service deletion. Email " + SUPPORT + " for help.";
      case "offline": return "You appear to be offline, so nothing was sent and your account has not been deleted. Reconnect and try again.";
      case "not_deleted": return "We tried, but your account was not deleted. It is still active, so you can try again. If it keeps failing, email " + SUPPORT + ".";
      case "auth_unavailable": return "Our sign-in service did not respond, so nothing was deleted. Please try again in a few minutes.";
      case "reauth_unavailable": return "We could not check your password right now, so nothing was deleted. Please try again in a few minutes.";
      case "hold": return "Please wait a minute before trying again, so the earlier request has time to finish.";
      case "unavailable": case "server_misconfigured": return "Account deletion is not available right now. Please email " + SUPPORT + " and we will do it for you.";
      default: return "Something went wrong. We have no sign that your account was deleted, but please try again, or email " + SUPPORT + ".";
    }
  }
  /* Result could not be confirmed: say exactly that. Never "deleted", never "not deleted". */
  function unsureParas(kind) {
    var first = kind === "timeout" ? "The request took too long, so we cannot tell whether it finished."
              : kind === "network" ? "We lost contact with the server, so we cannot tell whether the deletion happened."
              : "Our server could not confirm whether the deletion happened.";
    return [
      first + " Your account may or may not have been deleted.",
      "Please do not send the request again straight away. Wait a minute, then try signing in with your email and password: if sign-in fails, the account is gone; if it works, the account still exists and you can try again from Settings.",
      'If you are unsure, email <a class="cd-link" href="mailto:' + SUPPORT + '">' + SUPPORT + '</a> from your registered address.'
    ];
  }

  var ICON_OK = '<svg class="cd-ico" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="#5be6a8" stroke-width="2"/><path d="M20 33l8 8 17-18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_WARN = '<svg class="cd-ico" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="#ffc85a" stroke-width="2"/><path d="M32 18v18M32 43v3" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>';

  /* ---------- dialog ----------
     opts: { sb, cfg, email, setBusy(bool), onClose(), onDone() }
       sb       the existing Supabase client from gate.js (holds the signed-in session)
       setBusy  lets gate.js pause its own access re-checks while deletion runs (so the screen is not swapped underneath)
       onDone   called when the person presses Done on the final screen (gate.js returns to the sign-in page) */
  function openDialog(o) {
    if (open_) return;
    o = o || {};
    if (!o.sb || !o.cfg || !o.cfg.supabaseUrl) { /* not wired: say so rather than pretend */ window.alert("Account deletion is not available right now. Please email " + SUPPORT + "."); return; }
    open_ = true;
    var opener = document.activeElement, submitting = false, finished = false;

    var root = document.createElement("div");
    root.className = "cd";
    root.innerHTML =
      '<div class="cd-box" role="dialog" aria-modal="true" aria-labelledby="cdTitle" aria-describedby="cdLead" tabindex="-1">' +
        '<div id="cdLive" class="cd-sr" role="status" aria-live="polite" aria-atomic="true"></div>' +
        '<div id="cdForm">' +
          '<h2 id="cdTitle">Delete your account</h2>' +
          '<p class="cd-who">' + esc(o.email || "") + '</p>' +
          '<p id="cdLead"><strong>This is permanent and cannot be undone.</strong></p>' +
          '<ul>' +
            '<li>You will lose access to Critical Care Universe with this account. To use the app again you would have to register and be approved again.</li>' +
            '<li>Your account record (email address, password and beta-access status) will be deleted from our servers.</li>' +
            '<li>Data saved on this device will be erased: your profile, settings and Memory Lab progress. Memory Lab data exists only on this device, so it cannot be recovered afterwards.</li>' +
            '<li>Team-room messages already sent through outside relay services cannot be taken back. Outside services (for example email delivery, hosting and those relays) may keep logs under their own policies, which we cannot erase.</li>' +
          '</ul>' +
          '<p class="cd-warn">Never enter real patient information into Critical Care Universe.</p>' +
          '<label class="cd-check" for="cdAck"><input type="checkbox" id="cdAck"><span>I understand that deleting my account is permanent.</span></label>' +
          '<div class="cd-field cd-pw"><label for="cdPw">Current password</label><input type="password" id="cdPw" autocomplete="current-password" autocapitalize="none" spellcheck="false"><button type="button" class="cd-eye" id="cdEye" aria-controls="cdPw" aria-label="Show password">Show</button></div>' +
          '<div class="cd-field"><label for="cdTyped">Type DELETE to confirm</label><input type="text" id="cdTyped" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" aria-describedby="cdTypedHint"><span id="cdTypedHint" class="cd-sr">Type the word DELETE in capital letters.</span></div>' +
          '<div class="cd-msg" id="cdMsg" role="alert" aria-atomic="true"></div>' +
          '<div class="cd-row"><button type="button" class="cd-btn" id="cdCancel">Cancel</button><button type="button" class="cd-btn danger" id="cdGo" disabled>Delete my account</button></div>' +
        '</div>' +
        '<div id="cdDone" hidden></div>' +
      '</div>';
    document.documentElement.appendChild(root);

    var box = root.querySelector(".cd-box"), $ = function (id) { return root.querySelector("#" + id); };
    var live = $("cdLive");
    var ack = $("cdAck"), pw = $("cdPw"), typed = $("cdTyped"), go = $("cdGo"), cancel = $("cdCancel"), msg = $("cdMsg"), eye = $("cdEye");

    function ready() { return ack.checked && pw.value.length > 0 && typed.value === "DELETE" && Date.now() >= holdUntil; }
    /* While a request runs the button stays focusable (aria-disabled, not disabled) so keyboard and screen-reader focus is not dropped. */
    function refresh() { go.disabled = !submitting && !ready(); if (submitting) go.setAttribute("aria-disabled", "true"); else go.removeAttribute("aria-disabled"); }
    /* Polite status line for progress and success; the error line below is the assertive one. Each is cleared first so an identical message is announced again. */
    var liveT = null, msgT = null;   /* a newer message always cancels an older one that has not appeared yet, so a stale line can never show up late */
    function announce(t) { live.textContent = ""; clearTimeout(liveT); if (t) liveT = setTimeout(function () { if (root.parentNode) live.textContent = t; }, 50); }
    function say(t) { msg.textContent = ""; clearTimeout(msgT); if (t) msgT = setTimeout(function () { if (root.parentNode) msg.textContent = t; }, 60); }
    function holdTimer() { var w = holdUntil - Date.now(); if (w > 0) setTimeout(function () { if (root.parentNode && !submitting) refresh(); }, w + 50); }
    function lockInputs(v) { [ack, pw, typed, eye, cancel].forEach(function (e) { e.disabled = v; }); }
    function close() {
      if (submitting || finished) return;
      pw.value = ""; typed.value = ""; open_ = false;
      if (root.parentNode) root.parentNode.removeChild(root);
      if (o.onClose) try { o.onClose(); } catch (e) {}
      try { if (opener && opener.focus) opener.focus(); } catch (e) {}
    }
    function endScreen(icon, title, paras) {
      finished = true; open_ = true;
      $("cdForm").hidden = true;
      var d = $("cdDone"); d.hidden = false;
      d.innerHTML = '<div class="cd-state">' + icon + '<h2 id="cdTitle2" tabindex="-1">' + esc(title) + '</h2>' + paras.map(function (p) { return '<p>' + p + '</p>'; }).join("") + '</div><div class="cd-row"><button type="button" class="cd-btn" id="cdFin">Done</button></div>';
      box.setAttribute("aria-labelledby", "cdTitle2"); box.removeAttribute("aria-describedby");
      var fin = $("cdFin"); fin.addEventListener("click", function () { open_ = false; if (root.parentNode) root.parentNode.removeChild(root); if (o.onDone) o.onDone(); });
      announce(title + ". " + paras.map(function (p) { return String(p).replace(/<[^>]*>/g, ""); }).join(" "));
      try { fin.focus(); } catch (e) {}
    }
    /* The result could not be confirmed. Nothing is wiped (the account may still exist), the dialog can be closed, and a new attempt is held for a minute. */
    function unsureScreen(kind) {
      finished = true; open_ = true;
      $("cdForm").hidden = true;
      var d = $("cdDone"); d.hidden = false;
      d.innerHTML = '<div class="cd-state">' + ICON_WARN + '<h2 id="cdTitle2" tabindex="-1">We could not confirm the result</h2>' + unsureParas(kind).map(function (p) { return '<p>' + p + '</p>'; }).join("") + '</div><div class="cd-row"><button type="button" class="cd-btn" id="cdFin">Close</button></div>';
      box.setAttribute("aria-labelledby", "cdTitle2"); box.removeAttribute("aria-describedby");
      var fin = $("cdFin");
      fin.addEventListener("click", function () { open_ = false; if (root.parentNode) root.parentNode.removeChild(root); if (o.setBusy) o.setBusy(false); if (o.onClose) try { o.onClose(); } catch (e) {} try { if (opener && opener.focus) opener.focus(); } catch (e) {} });
      announce("We could not confirm the result. " + unsureParas(kind).slice(0, 2).join(" "));
      try { fin.focus(); } catch (e) {}
    }

    ack.addEventListener("change", refresh); pw.addEventListener("input", refresh); typed.addEventListener("input", refresh);
    eye.addEventListener("click", function () { var s = pw.type === "password"; pw.type = s ? "text" : "password"; eye.textContent = s ? "Hide" : "Show"; eye.setAttribute("aria-label", s ? "Hide password" : "Show password"); });
    cancel.addEventListener("click", close);
    root.addEventListener("mousedown", function (e) { if (e.target === root) close(); });
    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); close(); return; }
      if (e.key === "Enter" && e.target === typed && !go.disabled) { e.preventDefault(); go.click(); return; }
      if (e.key === "Tab") {   /* keep keyboard focus inside the dialog */
        var f = [].slice.call(root.querySelectorAll("button,input")).filter(function (x) { return !x.disabled && !x.closest("[hidden]"); });
        if (!f.length) { e.preventDefault(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    go.addEventListener("click", async function () {
      if (submitting || !ready()) return;          /* one submission at a time; the button is also disabled while it runs */
      if (typeof navigator !== "undefined" && navigator.onLine === false) { say(problem("offline")); return; }   /* nothing sent, so say so */
      submitting = true; refresh(); lockInputs(true); say("");
      go.classList.add("busy"); go.innerHTML = '<span class="cd-spin" aria-hidden="true"></span><span>Deleting...</span>'; go.setAttribute("aria-busy", "true");
      announce("Deleting your account. Please wait.");
      if (o.setBusy) o.setBusy(true);
      var password = pw.value, outcome = "error", ctl = null, timer = null;
      pw.value = "";                                // the password is never kept in the page after it is read
      try {
        var g = await o.sb.auth.getSession(), ss = g && g.data && g.data.session;
        if (!ss || !ss.access_token) { outcome = "unauthenticated"; }
        else {
          ctl = typeof AbortController === "function" ? new AbortController() : null;
          timer = setTimeout(function () { try { if (ctl) ctl.abort(); } catch (e) {} }, TIMEOUT_MS);
          var r = await fetch(String(o.cfg.supabaseUrl).replace(/\/$/, "") + "/functions/v1/" + (o.cfg.deleteFunction || "delete-account"), {
            method: "POST", cache: "no-store",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ss.access_token, "apikey": o.cfg.supabaseAnonKey },
            body: JSON.stringify({ action: "delete", password: password, confirm: "DELETE" }),
            signal: ctl ? ctl.signal : undefined
          });
          var j = null; try { j = await r.json(); } catch (e) { j = null; }
          if (r.ok && j && j.ok === true && j.deleted === true) outcome = "deleted";
          else if (j && j.error === "partial" && j.auth_deleted === true) outcome = "partial";
          else if (r.status === 404) outcome = "unavailable";            /* the function is not deployed yet */
          else if (j && typeof j.error === "string") outcome = j.error;
          else if (r.status === 429) outcome = "rate_limited";
          else if (r.status === 401) outcome = "unauthenticated";
          else if (r.ok || r.status >= 500) outcome = "uncertain";      /* an unreadable answer, or a gateway error: the function may have run */
          else outcome = "error";
        }
      } catch (e) { outcome = e && e.name === "AbortError" ? "timeout" : "network"; }
      finally { password = ""; if (timer) clearTimeout(timer); }

      if (outcome === "deleted" || outcome === "partial") {
        /* the account is gone on the server: sign this device out and erase what it holds */
        try { await o.sb.auth.signOut({ scope: "local" }); } catch (e) {}
        var w = await wipeLocal();
        var extra = w.ok ? "" : "We could not clear everything on this device: " + esc(w.failed.join(", ")) + ". You can clear it in your browser settings.";
        if (outcome === "deleted") {
          endScreen(ICON_OK, "Your account has been deleted", [
            "Your login and account record have been removed from our servers, and this device has been signed out and cleared.",
            "Team-room messages already sent through outside relays could not be taken back.",
            extra
          ].filter(Boolean));
        } else {
          endScreen(ICON_WARN, "Almost done: please contact us", [
            "Your login has been removed and this device has been cleared, but we could not confirm that one account record was removed.",
            'Please email <a class="cd-link" href="mailto:' + SUPPORT + '">' + SUPPORT + '</a> so we can finish it.',
            extra
          ].filter(Boolean));
        }
        return;                                       /* gate checks stay paused: the page returns to sign-in when Done is pressed */
      }

      /* result could not be confirmed: do not claim either outcome, do not wipe anything, hold new attempts */
      if (UNSURE[outcome]) {
        holdUntil = Date.now() + HOLD_MS; submitting = false;
        unsureScreen(outcome);
        return;                                      /* gate checks stay paused until Close is pressed */
      }

      /* confirmed not deleted (or never attempted): say so plainly, let the person fix it and retry */
      submitting = false; lockInputs(false); announce("");
      go.classList.remove("busy"); go.removeAttribute("aria-busy"); go.textContent = "Delete my account";
      refresh(); say(problem(outcome));
      if (o.setBusy) o.setBusy(false);
      try { pw.focus(); } catch (e) {}
    });

    if (Date.now() < holdUntil) { say(problem("hold")); holdTimer(); }
    try { box.focus(); } catch (e) {}
  }

  window.ccuDelete = { open: openDialog, wipeLocal: wipeLocal, isOurKey: isOurKey, support: SUPPORT };
})();
