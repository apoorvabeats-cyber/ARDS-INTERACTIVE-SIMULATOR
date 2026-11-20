// Hall announcer: a female public-address voice that reads out the red alarm banners.
// - one announcement at a time, never closer than `gapMs` (15 s) to the previous one
// - an alarm cuts the case narration off; narration may only resume after the announcement
// - "hall" feel: a reverberant two-note chime before the voice (see hall.chime in the page) and a quiet,
//   slower repeat of the last words afterwards, like the tail of an echo in a big hall.
//   (The browser cannot put reverb on speech synthesis itself, so the echo is simulated.)

const FEMALE = /female|zira|heera|neerja|aria|jenny|samantha|veena|karen|moira|tessa|serena|fiona|susan|hazel|libby|sonia|natasha|catherine|allison|ava\b|kate|victoria|google us english|google uk english female|swara|kalpana|lekha|priya|raveena|isha|microsoft (emma|michelle|ana)/i;
const MALE = /\bmale\b|david|mark\b|ravi|prabhat|hemant|daniel|alex\b|fred|george|rishi|james|ryan|guy\b|thomas|oliver|arthur|aaron|rocko|eddy|reed|grandpa|bruce|junior|ralph|albert|kanya/i;

export function pickFemaleVoice(voices) {
  const list = (voices || []).filter(v => /^en/i.test(v.lang || ''));
  const score = v => {
    const n = v.name || '', l = (v.lang || '').replace('_', '-').toLowerCase();
    if (MALE.test(n) && !/female/i.test(n)) return -1;
    let s = FEMALE.test(n) ? 10 : 0;
    if (s === 0) return 0;
    if (l === 'en-in') s += 4; else if (l === 'en-gb') s += 2; else if (l === 'en-us') s += 1;
    if (/natural|neural|online|enhanced|premium/i.test(n)) s += 3;
    if (v.localService === false && !/google/i.test(n)) s += 1;
    return s;
  };
  const best = list.map(v => [score(v), v]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0])[0];
  return best ? best[1] : null;
}

// Turn the on-screen banner into something a person would say over a PA system.
export function spokenAlarmText(text) {
  let t = String(text || '');
  const rep = [
    [/\(simulated\)/gi, ''], [/\s*·\s*/g, '. '], [/\bK⁺/g, 'potassium'], [/\bNa⁺/g, 'sodium'], [/\bCa²⁺/g, 'calcium'],
    [/\bmmol\/L\b/g, 'millimoles per litre'], [/\bmmHg\b/g, 'millimetres of mercury'], [/SpO₂/g, 'S P O 2'], [/FiO₂/g, 'F I O 2'],
    [/PaCO₂/g, 'P a C O 2'], [/\bICP\b/g, 'I C P'], [/\bMAP\b/g, 'M A P'], [/\bNIV\b/g, 'N I V'], [/\bIMV\b/g, 'I M V'],
    [/\s*:\s*/g, '. '], [/\s{2,}/g, ' '],
  ];
  rep.forEach(([a, b]) => { t = t.replace(a, b); });
  t = t.replace(/\bbed\s*(\d)/gi, 'Bed $1').replace(/\.\s*\./g, '.').trim();
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

export function echoTail(text, words = 3) {
  const w = String(text).replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean);
  return w.slice(-Math.min(words, w.length)).join(' ');
}

export function createAnnouncer({ synthesis, Utterance, getVoices = () => [], setTimer = setTimeout, clearTimer = clearTimeout,
  now = () => Date.now(), gapMs = 15000, chimeMs = 1500, beforeSpeak = () => {}, chime = () => {}, afterSpeak = () => {}, report = () => {} }) {
  let queue = [], busy = false, started = false, nextAllowed = 0, startedAt = 0, pumpTimer = null, watchdog = null, id = 0;

  const finish = () => {
    clearTimer(watchdog); watchdog = null;
    busy = false; nextAllowed = Math.max(now() + 3000, startedAt + gapMs);   // spacing counts from when the last one began
    try { afterSpeak(); } catch (e) { report(e.message); }
    schedule();
  };
  function schedule() {
    clearTimer(pumpTimer); pumpTimer = null;
    if (busy || !queue.length) return;
    const wait = Math.max(0, nextAllowed - now());
    pumpTimer = setTimer(pump, wait);
  }
  function utter(text, o) {
    const u = new Utterance(text), v = pickFemaleVoice(getVoices());
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-IN';
    u.rate = o.rate; u.pitch = o.pitch; u.volume = o.volume;
    return u;
  }
  function pump() {
    pumpTimer = null;
    if (busy || !queue.length) return;
    if (now() < nextAllowed) { schedule(); return; }
    const item = queue.shift(), my = ++id;
    busy = true; started = false; startedAt = now();
    try { beforeSpeak(); } catch (e) { report(e.message); }       // stops the case narration
    try { synthesis.cancel(); } catch (e) { /* nothing to cancel */ }
    try { chime(); } catch (e) { report(e.message); }
    // if speech never starts (blocked by the browser) give up on this one and keep the spacing rule
    watchdog = setTimer(() => { if (my === id && busy && !started) { report('announcement did not start'); finish(); } }, chimeMs + 6000);
    setTimer(() => {
      if (my !== id || !busy) return;
      const main = utter(item, { rate: 0.86, pitch: 1.0, volume: 1 });
      main.onstart = () => { if (my === id) started = true; };
      main.onend = () => {
        if (my !== id) return;
        const tail = echoTail(item);
        if (!tail) { finish(); return; }
        setTimer(() => {
          if (my !== id || !busy) return;
          const e = utter(tail, { rate: 0.7, pitch: 0.85, volume: 0.28 });
          e.onend = e.onerror = () => { if (my === id) finish(); };
          try { synthesis.speak(e); } catch (err) { finish(); }
        }, 380);
      };
      main.onerror = ev => { if (my !== id) return; report(ev && ev.error || 'speech error'); finish(); };
      try { synthesis.speak(main); } catch (err) { report(err.message); finish(); }
    }, chimeMs);
  }
  return {
    announce(text) {
      const t = spokenAlarmText(text);
      if (!queue.includes(t)) queue.push(t);
      if (queue.length > 3) queue = queue.slice(-3);               // stale alarms are dropped, newest kept
      schedule();
    },
    busy: () => busy,
    stop() { id++; queue = []; busy = false; clearTimer(pumpTimer); clearTimer(watchdog); pumpTimer = watchdog = null; try { synthesis.cancel(); } catch (e) {} },
    pending: () => queue.length,
  };
}
