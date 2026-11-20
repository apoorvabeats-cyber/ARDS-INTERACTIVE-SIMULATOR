/* MICRO.voice: soft voice-over using the browser's speech synthesis (no audio files).
   - Prefers a male English voice (India, then UK, then US). Which voices exist depends on the device and browser.
   - Speaks in short sentence chunks so long text is not cut off.
   - If the browser blocks speech until the page has been tapped, the text waits and plays on the first tap.
   - Adds a Voice on/off button, a voice picker and a "hear again" button to the page's .top bar. */
(function () {
  'use strict';
  const M = window.MICRO = window.MICRO || {};
  const ok = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const store = {
    get(k) { try { return localStorage.getItem('micro.voice.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('micro.voice.' + k, v); } catch (e) { } }
  };
  let on = store.get('on') !== '0', voice = null, token = 0, left = 0, startedAt = 0, budget = 0, pending = null, armed = false, lastText = '', btn = null, sel = null, rep = null;
  const FEMALE = /(female|zira|samantha|susan|hazel|heera|karen|moira|tessa|victoria|fiona|kalpana|veena|aria|jenny|sonia|libby|natasha|clara|emma|catherine|linda|heather|nicky|allison|ava|joanna|kendra|kimberly|salli|ivy|amy|olivia|serena|zoe|siri|raveena|neerja|swara)/i;
  const MALE = /(male|david|mark|guy|daniel|alex|fred|george|james|ryan|prabhat|ravi|rishi|aaron|arthur|oliver|thomas|brian|christopher|eric|davis|tony|steffan|liam|mitchell|rocko|reed|evan|gordon|hemant|madhur|rehaan)/i;
  function score(v) {
    if (!/^en/i.test(v.lang)) return -1;
    const n = v.name || '';
    if (FEMALE.test(n)) return 10;
    const m = MALE.test(n);
    const loc = /en[-_]IN/i.test(v.lang) ? 3 : /en[-_]GB/i.test(v.lang) ? 2 : /en[-_]US/i.test(v.lang) ? 1 : 0;
    return (m ? 60 : 30) + loc * 10 + (/natural|online/i.test(n) ? 4 : 0);
  }
  function englishVoices() { try { return speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a)); } catch (e) { return []; } }
  function pick() {
    const vs = englishVoices(); if (!vs.length) return;
    const saved = store.get('name');
    voice = (saved && vs.find(v => v.name === saved)) || vs[0];
    if (sel) {
      sel.innerHTML = vs.map(v => '<option value="' + v.name.replace(/"/g, '') + '"' + (voice && v.name === voice.name ? ' selected' : '') + '>' + v.name.replace(/</g, '') + ' (' + v.lang + ')</option>').join('');
      sel.hidden = vs.length < 2;
    }
  }
  function clean(t) {
    return String(t).replace(/<[^>]*>/g, ' ').replace(/·/g, ',').replace(/→/g, ' to ').replace(/≥/g, ' at least ').replace(/≤/g, ' at most ').replace(/×/g, ' times ').replace(/μ/g, 'micro').replace(/\bmg\/L\b/g, 'milligrams per litre')
      .replace(/\bβ-?\s?lactam/gi, 'beta lactam').replace(/\bPBPs?\b/g, m => m === 'PBP' ? 'P B P' : 'P B Ps').replace(/\bAST\b/g, 'A S T').replace(/\bMIC\b/g, 'M I C').replace(/\bICU\b/g, 'I C U').replace(/\s+/g, ' ').trim();
  }
  function chunk(t) {
    let parts;
    try { parts = t.split(/(?<=[a-z0-9\)])[.!?]\s+(?=[A-Z])/); } catch (e) { parts = [t]; }
    const out = [];
    parts.forEach(p => {
      p = p.trim(); if (!p) return;
      if (p.length <= 200) { out.push(p); return; }
      let cur = '';
      p.split(/(?<=[,;:])\s+/).forEach(s => { if ((cur + ' ' + s).length > 200 && cur) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s; });
      if (cur) out.push(cur);
    });
    return out;
  }
  function setup(u) {
    if (voice) u.voice = voice;
    u.lang = (voice && voice.lang) || 'en-IN';
    u.rate = .9; u.pitch = .82; u.volume = .8;
  }
  function stop() { token++; left = 0; try { speechSynthesis.cancel(); } catch (e) { } }
  function arm() {
    if (armed) return; armed = true;
    const go = () => { armed = false; ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, go, true)); if (pending) { const t = pending; pending = null; say(t, { fromTap: true }); } };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, go, true));
  }
  function say(text, o) {
    o = o || {};
    if (!ok || !text) return false;
    const t = clean(text); if (!t) return false;
    lastText = t;
    if (!on) return false;
    stop();
    const my = token, chunks = chunk(t); left = chunks.length; startedAt = performance.now(); budget = Math.min(24000, Math.max(3500, t.length * 75 + 2500));
    try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) { }
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c); setup(u);
      u.onend = () => { if (my !== token) return; left--; if (left <= 0 && o.onend) o.onend(); };
      u.onerror = e => {
        if (my !== token) return;
        if (e.error === 'not-allowed') { if (i === 0) { pending = t; arm(); } left = 0; }
        else if (e.error !== 'interrupted' && e.error !== 'canceled') left--;
      };
      try { speechSynthesis.speak(u); } catch (er) { left = 0; }
    });
    return true;
  }
  function setOn(v) {
    on = v; store.set('on', v ? '1' : '0');
    if (btn) { btn.setAttribute('aria-pressed', v); btn.textContent = v ? 'Voice on' : 'Voice off'; }
    if (!v) stop(); else if (lastText) say(lastText);
  }
  function textOf(el, max) {
    if (!el) return '';
    max = max || 900;
    const out = [], seen = new Set();
    el.querySelectorAll('h1,h2,h3,p:not(.k),li,.mrow').forEach(e => {
      if (e.closest('.bar') || e.hidden) return;
      let anc = e.parentElement, skip = false; while (anc && anc !== el) { if (seen.has(anc)) { skip = true; break; } anc = anc.parentElement; }
      if (skip) return; seen.add(e);
      let s = (e.textContent || '').replace(/\s+/g, ' ').trim(); if (!s) return;
      if (!/[.!?:]$/.test(s)) s += '.';
      out.push(s);
    });
    let t = out.join(' ');
    if (t.length > max) { const cut = t.slice(0, max), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; ')); t = i > 200 ? cut.slice(0, i + 1) : cut; }
    return t;
  }
  function mount() {
    if (!ok) return;
    if (!document.getElementById('micro-voice-css')) {
      const st = document.createElement('style'); st.id = 'micro-voice-css';
      st.textContent = '.vc{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}.vc .btn{min-height:36px;padding:4px 12px;font-size:12.5px}.vc select{max-width:150px;min-height:36px;font:inherit;font-size:12px;color:var(--ink,#e6f1f7);background:#06121c;border:1px solid var(--line,#1f3345);border-radius:8px;padding:2px 6px}';
      document.head.appendChild(st);
    }
    const top = document.querySelector('.top'); if (!top || document.getElementById('vcBtn')) return;
    const w = document.createElement('span'); w.className = 'vc';
    w.innerHTML = '<button class="btn" id="vcBtn" aria-pressed="' + on + '" title="Soft voice-over on or off">' + (on ? 'Voice on' : 'Voice off') + '</button><button class="btn" id="vcRep" title="Hear the last explanation again">Hear again</button><select id="vcSel" title="Voice" aria-label="Voice" hidden></select>';
    const badge = top.querySelector('.badge'); top.insertBefore(w, badge || null);
    btn = w.querySelector('#vcBtn'); rep = w.querySelector('#vcRep'); sel = w.querySelector('#vcSel');
    btn.onclick = () => setOn(!on);
    rep.onclick = () => { if (!lastText) return; if (!on) setOn(true); else say(lastText); };
    sel.onchange = () => { store.set('name', sel.value); pick(); if (lastText) say(lastText); };
    pick();
  }
  if (ok) { try { speechSynthesis.onvoiceschanged = () => pick(); } catch (e) { } pick(); window.addEventListener('pagehide', stop); document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }); }
  M.voice = { ok, say, stop, mount, textOf, busy: () => ok && on && left > 0 && (performance.now() - startedAt) < budget, estSeconds: t => Math.min(24, Math.max(3.5, (clean(t).length * 70 + 1500) / 1000)), enabled: () => ok && on, setOn, last: () => lastText };
})();
