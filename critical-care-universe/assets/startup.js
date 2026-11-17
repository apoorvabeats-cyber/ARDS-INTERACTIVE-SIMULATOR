(() => {
  const startup = document.getElementById("startup");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const audio = document.querySelector("audio[data-score-el]");
  const musicButton = startup.querySelector(".startup-music");
  const skipButton = startup.querySelector(".startup-skip");
  const musicError = startup.querySelector(".startup-music-error");
  const animations = [];
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

  const syncIntro = () => {
    if (loading) return;
    if (audio.error || audio.ended) {
      musicError.textContent = "Background music could not be played.";
      musicError.hidden = false;
      skipButton.hidden = false;
      return;
    }
    const time = audio.currentTime * 1000;
    animations.forEach((animation) => { animation.currentTime = time; });
    if (time >= 8000) {
      loadApp();
    } else {
      window.requestAnimationFrame(syncIntro);
    }
  };

  const startMusic = async () => {
    try {
      await audio.play();
      if (started || loading) return;
      started = true;
      musicButton.hidden = true;
      skipButton.hidden = true;
      musicError.hidden = true;
      if (reducedMotion) {
        window.setTimeout(loadApp, 400);
      } else {
        window.requestAnimationFrame(syncIntro);
      }
    } catch (error) {
      if (loading) return;
      skipButton.hidden = false;
      if (error.name === "NotAllowedError") {
        musicButton.hidden = false;
      } else {
        musicButton.hidden = true;
        musicError.textContent = "Background music could not be played.";
        musicError.hidden = false;
        console.error("Background music could not be played:", error);
      }
    }
  };

  audio.volume = 0.48;
  musicButton.addEventListener("click", startMusic);
  skipButton.addEventListener("click", loadApp);

  const legal1 = document.getElementById("legal-1");
  const legal2 = document.getElementById("legal-2");
  let brandTimer = 0;
  let branded = false;
  const showBrand = () => {
    if (branded) return;
    branded = true;
    window.clearTimeout(brandTimer);
    startup.classList.add("is-brand");
    legal1.hidden = true;
    legal2.hidden = true;
    window.requestAnimationFrame(() => {
      animations.splice(0, animations.length, ...startup.querySelector(".startup-logo").getAnimations({ subtree: true }));
      startMusic();
    });
  };
  document.getElementById("legal-continue").addEventListener("click", showBrand);
  window.setTimeout(() => {
    legal1.hidden = true;
    legal2.hidden = false;
    brandTimer = window.setTimeout(showBrand, 5000);
  }, 7000);
})();
