export function createCaseVoice(synthesis, Utterance, reportFailure) {
  let generation = 0;
  let timer = null;
  let current = null;
  let primed = false;
  let priming = null;

  function stop() {
    generation++;
    clearTimeout(timer);
    timer = null;
    const shouldCancel = current || priming || synthesis.speaking || synthesis.pending;
    current = null;
    priming = null;
    if (shouldCancel) synthesis.cancel();
  }

  function prime() {
    if (primed || priming || current) return;
    const utterance = new Utterance(' ');
    utterance.volume = 0;
    priming = utterance;
    utterance.onend = () => {
      if (priming !== utterance) return;
      primed = true;
      priming = null;
    };
    utterance.onerror = (event) => {
      if (priming !== utterance) return;
      priming = null;
      console.warn('Unable to prepare case narration:', event.error);
    };
    try {
      synthesis.speak(utterance);
    } catch (error) {
      priming = null;
      console.warn('Unable to prepare case narration:', error);
    }
  }

  function speak(text) {
    stop();
    const id = generation;
    const utterance = new Utterance(text);
    current = utterance;
    utterance.lang = 'en-IN';
    utterance.rate = 0.92;
    let started = false;
    const fail = (reason) => {
      if (id !== generation) return;
      stop();
      reportFailure(reason);
    };
    utterance.onstart = () => {
      if (id !== generation) return;
      started = true;
      clearTimeout(timer);
      timer = null;
    };
    utterance.onend = () => {
      if (id !== generation) return;
      if (!started) {
        fail('speech ended without starting');
        return;
      }
      clearTimeout(timer);
      timer = null;
      current = null;
    };
    utterance.onerror = (event) => fail(event.error || 'unknown');
    timer = setTimeout(() => {
      if (!started) fail('speech did not start');
    }, 3000);
    try {
      if (synthesis.paused) synthesis.resume();
      synthesis.speak(utterance);
    } catch (error) {
      fail(error.message);
    }
  }

  return { prime, speak, stop };
}
