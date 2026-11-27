(() => {
  const startup = document.getElementById("startup");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const audio = document.querySelector("audio[data-score-el]");
  const musicButton = startup.querySelector(".startup-music");
  const skipButton = startup.querySelector(".startup-skip");
  const musicError = startup.querySelector(".startup-music-error");
  const logo = startup.querySelector(".startup-logo");
  let started = false;
  let loading = false;

  /* ---- the fourth screen (home) comes into THIS page --------------------------------------------------------------------
     A new page cannot start sound without a fresh tap (iPhones above all) and would start the score from nothing. Here the
     audio element that the Continue tap already unlocked just changes track, so the music never stops and never needs a tap. */
  const HOME_URL = new URL("./home/index.html", location.href);
  const HOME_QS = "?v=20261126q";
  const goesHome = (() => { const q = new URLSearchParams(location.search); return q.get("old") !== "1" && !q.has("to"); })();
  let homePrep = null;
  const prepareHome = () => {
    if (!goesHome || homePrep) return homePrep;
    homePrep = fetch(HOME_URL.href + HOME_QS, { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error("home"); return r.text(); })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const out = { doc, beat: "", css: [] };
        /* the home stylesheets are fetched now (media=print keeps them from touching this page) and switched on at the swap */
        doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
          const link = document.createElement("link");
          link.rel = "stylesheet"; link.media = "print"; link.href = new URL(l.getAttribute("href"), HOME_URL).href;
          out.css.push(new Promise((res) => { link.onload = link.onerror = () => res(link); }));
          document.head.appendChild(link);
        });
        /* the module files are downloaded now too, so the screen appears the moment the logo ends */
        doc.querySelectorAll('script[type="module"][src]').forEach((m) => {
          const link = document.createElement("link");
          link.rel = "modulepreload"; link.href = new URL(m.getAttribute("src"), HOME_URL).href;
          document.head.appendChild(link);
        });
        const a = doc.querySelector("audio#music");
        if (a && a.getAttribute("src")) {
          const beatSrc = new URL(a.getAttribute("src"), HOME_URL).href;
          out.beat = fetch(beatSrc, { cache: "force-cache" })
            .then((r) => { if (!r.ok) throw new Error("beat"); return r.arrayBuffer(); })
            .then((buf) => URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" })))
            .catch(() => beatSrc);
        }
        return out;
      });
    homePrep.catch(() => {});
    return homePrep;
  };
  const enterHome = async () => {
    const prep = await (prepareHome() || Promise.reject(new Error("no home")));
    const links = await Promise.all(prep.css);
    const beat = prep.beat ? await Promise.race([prep.beat, new Promise((res) => window.setTimeout(() => res(""), 3000))]) : "";
    const { doc } = prep;
    /* 1. the score: the same, already unlocked element, with the new track fully downloaded (it never stalls, never needs seeking) */
    audio.id = "music";
    audio.loop = true;
    audio.dataset.score = "home";
    if (beat) { audio.pause(); audio.src = beat; try { audio.load(); } catch (err) {} }
    /* 2. the page: the home markup replaces the logo page, under the logo until it has faded */
    links.forEach((l) => { l.media = "all"; });
    document.querySelectorAll("body > :not(#startup):not(audio)").forEach((n) => n.remove());
    [...doc.body.children].forEach((n) => {
      if (n.tagName === "SCRIPT" || n.tagName === "AUDIO") return;
      document.body.insertBefore(document.importNode(n, true), startup);
    });
    doc.head.querySelectorAll("style#pre").forEach((n) => { document.head.appendChild(document.importNode(n, true)); window.setTimeout(() => { const p = document.getElementById("pre"); if (p) p.remove(); }, 15000); });
    const tc = doc.head.querySelector('meta[name="theme-color"]'); if (tc) { const m = document.createElement("meta"); m.name = "theme-color"; m.content = tc.content; document.head.appendChild(m); }
    history.replaceState(null, "", HOME_URL.pathname + HOME_QS);   // reload and Back land on the home screen, not on the notices
    /* 3. its script */
    const m = doc.querySelector('script[type="module"][src]');
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.type = "module"; s.src = new URL(m.getAttribute("src"), HOME_URL).href;
      s.onload = res; s.onerror = () => rej(new Error("home.js"));
      document.body.appendChild(s);
    });
    startup.classList.add("is-finished");
    document.body.classList.add("app-ready");
    window.setTimeout(() => { startup.remove(); document.querySelectorAll('link[href*="startup.css"]').forEach((l) => l.remove()); }, reducedMotion ? 0 : 400);
  };

  const loadApp = () => {
    if (loading) return;
    loading = true;
    /* the home screen (home/index.html) is the fourth screen, after the two notices and the logo; ?old=1 or a ?to= link still opens the earlier universe app */
    const q = new URLSearchParams(location.search);
    if (q.get("old") !== "1" && !q.has("to")) {
      /* the home screen is brought into this same page, so the music carries on without a break and without another tap;
         if anything goes wrong it is opened as a page of its own, as before */
      enterHome().catch(() => {
        startup.classList.add("is-finished");
        location.replace(HOME_URL.pathname + HOME_QS);
      });
      return;
    }
    const app = document.createElement("script");
    app.src = "./assets/app.js?v=20261126i";
    app.type = "module";
    app.onerror = () => {
      startup.setAttribute("role", "alert");
      startup.setAttribute("aria-label", "The app could not be loaded. Please reload the page.");
      musicError.textContent = "The app could not be loaded. Please reload the page.";
      musicError.hidden = false;
    };
    app.onload = () => {
      document.body.classList.add("app-ready");
      startup.classList.add("is-finished");
      window.setTimeout(() => startup.remove(), reducedMotion ? 0 : 350);
    };
    document.body.appendChild(app);
  };

  let brandAt = 0;
  let scoreReady = false, timerDone = false;
  const openHint = document.createElement("p");
  openHint.className = "startup-opening"; openHint.textContent = "Opening the hall\u2026"; openHint.hidden = true;
  startup.appendChild(openHint);

  /* The logo runs on its own clock, so it can never wait for the music, and the music can never wait for the logo.
     The score is downloaded whole while the notices are read, so it starts at once and cannot stall half way. */
  const prepareScore = () => {
    const src = audio.currentSrc || audio.src;
    return fetch(src, { cache: "force-cache" })
      .then((r) => { if (!r.ok) throw new Error("score"); return r.arrayBuffer(); })
      .then((buf) => { audio.src = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" })); audio.dataset.score = "lobby"; audio.load(); })
      .catch(() => { try { audio.load(); } catch (err) {} })
      .then(() => { scoreReady = true; maybeEnable(); prepareHome(); });
  };
  const logoElapsed = () => performance.now() - brandAt;
  const joinMusic = () => {
    /* if the music starts a moment late, move it to where the logo is, so the two stay together */
    const lag = logoElapsed() / 1000;
    try { if (lag > 0.3 && Math.abs(audio.currentTime - lag) > 0.3 && audio.duration > lag) audio.currentTime = lag; } catch (err) {}
  };
  const runSvgLogo = () => {
    const list = logo.getAnimations({ subtree: true });
    list.forEach((animation) => { try { animation.pause(); animation.currentTime = 0; animation.play(); } catch (err) {} });
    window.setTimeout(() => { if (!loading) openHint.hidden = false; loadApp(); }, 8000);
  };
  /* The logo shot: a silent video of the new logo build (13 s), in step with the score. Anything wrong with the video and the
     drawn logo runs instead, exactly as before. */
  const video = startup.querySelector(".startup-video");
  const runLogo = () => {
    let fell = false;
    const fallBack = () => { if (fell) return; fell = true; try { video.pause(); } catch (err) {} startup.classList.add("is-svg-logo"); runSvgLogo(); };
    if (!video || video.error || video.readyState < 3) { fallBack(); return; }
    video.addEventListener("error", fallBack, { once: true });
    video.addEventListener("ended", () => { if (!fell && !loading) openHint.hidden = false; if (!fell) loadApp(); }, { once: true });
    try { video.currentTime = 0; } catch (err) {}
    const playing = video.play();
    if (playing && playing.catch) playing.catch(fallBack);
    window.setTimeout(() => { if (!fell && !loading) { openHint.hidden = false; loadApp(); } }, 15000);   /* never stuck on the logo */
  };

  const startMusic = async () => {
    try {
      await audio.play();
      musicError.hidden = true;
      if (!audio.paused) musicButton.hidden = true;
    } catch (error) {
      musicButton.hidden = false;
      if (error.name !== "NotAllowedError") {
        musicError.textContent = "Background music could not be played.";
        musicError.hidden = false;
      }
    }
  };

  audio.volume = 0.48;
  skipButton.addEventListener("click", loadApp);

  // Play the score straight from the audio element. Routing it through Web Audio
  // made iPhones on silent (and suspended audio contexts) play nothing while the
  // page believed the music was running.
  const armScore = () => {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (err) {}
    audio.muted = false;
    audio.volume = 0.48;
    return audio.play();
  };

  const legal1 = document.getElementById("legal-1");
  const legal2 = document.getElementById("legal-2");
  if (new URLSearchParams(location.search).get("home") === "1" || new URLSearchParams(location.search).get("to") === "team") {
    legal1.hidden = true;
    legal2.hidden = true;
    startup.classList.add("is-finished");
    loadApp();
    return;
  }
  const go = document.getElementById("legal-continue");
  let branded = false;
  go.disabled = true;
  function maybeEnable() {
    if (!timerDone) return;
    if (scoreReady || performance.now() > 40000) { go.disabled = false; go.textContent = "Continue"; }
    else { go.disabled = true; go.textContent = "Preparing the music\u2026"; window.setTimeout(maybeEnable, 700); }
  }
  prepareScore();
  const showBrand = () => {
    if (branded || go.disabled) return;
    branded = true;
    brandAt = performance.now();
    const pending = armScore();
    startup.classList.add("is-brand");
    legal1.hidden = true;
    legal2.hidden = true;
    musicButton.hidden = true;
    skipButton.hidden = true;
    audio.addEventListener("playing", () => { musicButton.hidden = true; joinMusic(); }, { once: true });
    if (pending && pending.then) pending.then(joinMusic).catch(() => { musicButton.hidden = false; });
    window.setTimeout(() => { if (audio.paused) musicButton.hidden = false; }, 1500);
    if (reducedMotion) window.setTimeout(loadApp, 400);
    else runLogo();
  };
  go.addEventListener("click", showBrand);
  musicButton.addEventListener("click", () => {
    const pending = armScore();
    if (pending && pending.then) {
      pending.then(() => { joinMusic(); musicButton.hidden = !audio.paused; }).catch(() => { musicButton.hidden = false; });
    }
  });
  window.setTimeout(() => {
    legal1.hidden = true;
    legal2.hidden = false;
    let left = 7;
    go.textContent = "Continue in " + left;
    const tick = window.setInterval(() => {
      left -= 1;
      if (left > 0) {
        go.textContent = "Continue in " + left;
        return;
      }
      window.clearInterval(tick);
      timerDone = true;
      maybeEnable();
    }, 1000);
  }, 9000);
})();
