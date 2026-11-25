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

  const loadApp = () => {
    if (loading) return;
    loading = true;
    /* the home screen (home/index.html) is the fourth screen, after the two notices and the logo; ?old=1 or a ?to= link still opens the earlier universe app */
    const q = new URLSearchParams(location.search);
    if (q.get("old") !== "1" && !q.has("to")) {
      startup.classList.add("is-finished");
      location.replace("./home/index.html?v=20261126p");
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
      .then(() => { scoreReady = true; maybeEnable(); });
  };
  const logoElapsed = () => performance.now() - brandAt;
  const joinMusic = () => {
    /* if the music starts a moment late, move it to where the logo is, so the two stay together */
    const lag = logoElapsed() / 1000;
    try { if (lag > 0.3 && Math.abs(audio.currentTime - lag) > 0.3 && audio.duration > lag) audio.currentTime = lag; } catch (err) {}
  };
  const runLogo = () => {
    const list = logo.getAnimations({ subtree: true });
    list.forEach((animation) => { try { animation.pause(); animation.currentTime = 0; animation.play(); } catch (err) {} });
    window.setTimeout(() => { if (!loading) openHint.hidden = false; loadApp(); }, 8000);
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
