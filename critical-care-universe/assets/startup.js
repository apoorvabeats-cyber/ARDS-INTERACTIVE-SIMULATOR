(() => {
  const startup = document.getElementById("startup");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const audio = document.querySelector("audio[data-score-el]");
  const musicButton = startup.querySelector(".startup-music");
  const skipButton = startup.querySelector(".startup-skip");
  const musicError = startup.querySelector(".startup-music-error");
  const logo = startup.querySelector(".startup-logo");
  const animations = logo.getAnimations({ subtree: true });
  let started = false;
  let loading = false;

  const loadApp = () => {
    if (loading) return;
    loading = true;
    const app = document.createElement("script");
    app.src = "./assets/app.js";
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

  const syncIntro = () => {
    if (loading) return;
    const heard = !audio.paused && audio.currentTime > 0.05;
    const time = heard ? audio.currentTime * 1000 : performance.now() - brandAt;
    animations.forEach((animation) => { animation.currentTime = time; });
    if (heard) musicButton.hidden = true;
    if (time >= 8000) loadApp();
    else window.requestAnimationFrame(syncIntro);
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

  const legal1 = document.getElementById("legal-1");
  const legal2 = document.getElementById("legal-2");
  const go = document.getElementById("legal-continue");
  let branded = false;
  go.disabled = true;
  const showBrand = () => {
    if (branded || go.disabled) return;
    branded = true;
    const pending = audio.play();
    startup.classList.add("is-brand");
    legal1.hidden = true;
    legal2.hidden = true;
    if (!animations.length) animations.push(...logo.getAnimations({ subtree: true }));
    brandAt = performance.now();
    musicButton.hidden = false;
    skipButton.hidden = true;
    if (pending && pending.then) {
      pending.then(() => { if (!audio.paused) musicButton.hidden = true; }).catch(() => { musicButton.hidden = false; });
    }
    if (reducedMotion) window.setTimeout(loadApp, 400);
    else window.requestAnimationFrame(syncIntro);
  };
  go.addEventListener("click", showBrand);
  musicButton.addEventListener("click", () => {
    brandAt = performance.now();
    try { audio.currentTime = 0; } catch (err) {}
    startMusic();
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
      go.disabled = false;
      go.textContent = "Continue";
    }, 1000);
  }, 9000);
})();
