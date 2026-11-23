/* CRITICAL CARE HUB · MEMORY LAB — a spaced-repetition clinical memory system. Runs entirely in the browser; progress is kept on this device. */
import { schedule, preview, fmtIv, retrievability } from "./fsrs.js";
import { drawWave, WAVES, WAVE_Q, hashStr } from "./waves.js";
import * as DB from "./store.js";

const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
const EMBED = new URLSearchParams(location.search).has("embed");
const DAY = 864e5, MIN = 6e4;
const dn = (ts) => Math.floor((ts - new Date(ts).getTimezoneOffset() * 60000) / DAY);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const KINDS = [
  { k: "recall", n: "Standard recall", d: "Question on the front, answer on the back.", ic: "🧠", b: "CLINICAL RECALL" },
  { k: "image", n: "Image recognition", d: "Identify the ECG or image finding.", ic: "🖼", b: "IMAGE RECOGNITION" },
  { k: "wave", n: "Waveform recognition", d: "Ventilator asynchrony, ECG, arterial line, capnography.", ic: "〰", b: "WAVEFORM RECOGNITION" },
  { k: "decision", n: "Clinical decision", d: "Patient scenario, then your next step.", ic: "⚕", b: "CLINICAL DECISION" },
  { k: "drug", n: "Drug recall", d: "Dose, mechanism, cautions and renal adjustment.", ic: "💊", b: "DRUG RECALL" },
  { k: "anat", n: "Anatomy & physiology", d: "Structures, mechanisms and relationships.", ic: "🫀", b: "ANATOMY & PHYSIOLOGY" },
  { k: "guide", n: "Guideline recall", d: "KDIGO, Surviving Sepsis, AHA, IDSA and more.", ic: "📘", b: "GUIDELINE RECALL" },
];
const kind = (k) => KINDS.find((x) => x.k === k) || KINDS[0];
const kindMatch = (c, k) => (k === "image" ? c.k === "image" || c.fam === "ecg" || !!c.img : c.k === k);
const DEF = { newPerDay: 15, maxRev: 200, ret: 0.9 };

/* ------------------------------ state ------------------------------ */
const A = { decks: [], cards: [], byId: new Map(), prog: new Map(), log: [], kv: {}, set: Object.assign({}, DEF), udecks: [], mode: "idb", route: "home", se: null, rap: null, ret: null };
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); };

/* ------------------------------ decks and cards ------------------------------ */
const cid = (deck, key, suf) => deck + ":" + hashStr(key).toString(36) + (suf || "");
function expandDeck(d) {
  const out = [], tag = (c) => c.tag || d.name;
  (d.cards || []).forEach((c) => {
    try {
      if (c.t === "b" && c.q && c.a) out.push({ id: cid(d.id, c.q), deck: d.id, par: cid(d.id, c.q), t: "b", k: c.k || "recall", q: c.q, a: c.a, tag: tag(c), img: c.img, src: c.src });
      else if (c.t === "c" && c.x) { const idx = [...new Set([...c.x.matchAll(/\{\{c(\d+)::/g)].map((m) => m[1]))]; idx.forEach((n) => out.push({ id: cid(d.id, c.x, "#" + n), deck: d.id, par: cid(d.id, c.x), t: "c", k: c.k || "recall", x: c.x, n, tag: tag(c), src: c.src })); }
      else if (c.t === "m" && c.q && Array.isArray(c.o) && c.o.length > 1) out.push({ id: cid(d.id, c.q), deck: d.id, par: cid(d.id, c.q), t: "m", k: c.k || "decision", q: c.q, o: c.o, a: c.a | 0, e: c.e || "", tag: tag(c), img: c.img, src: c.src });
      else if (c.t === "d" && c.n) {
        const par = cid(d.id, "drug:" + c.n), mk = (suf, q, a) => { if (a) out.push({ id: par + suf, deck: d.id, par, t: "b", k: "drug", q, a, tag: tag(c), src: c.src }); };
        mk("#1", "**" + c.n + "**: class and mechanism of action?", [c.cls, c.moa].filter(Boolean).join("\n")); mk("#2", "**" + c.n + "**: usual adult dose and how it is given?", c.dose);
        mk("#3", "**" + c.n + "**: cautions, contraindications and key adverse effects?", c.ci); mk("#4", "**" + c.n + "**: renal / hepatic adjustment and the key pearl?", [c.renal, c.pearl].filter(Boolean).join("\n"));
      }
    } catch (e) { /* skip a malformed card */ }
  });
  return out;
}
function waveDeck() {
  return { id: "wave", name: "Waveform & ECG Lab", sub: "Ventilator graphics, ECG rhythms, arterial line and capnography", ic: "〰", col: "#5fe3ff", reviewed: true, cards: [], built: WAVES.map((w) => ({ id: "wave:" + w[0], deck: "wave", par: "wave:" + w[0], t: "w", k: "wave", w: w[0], fam: w[1], name: w[2], e: w[3], tag: "Waveforms: " + ({ ecg: "ECG", art: "Arterial line", cap: "Capnography", vent: "Ventilator" })[w[1]] })) };
}
async function loadDecks() {
  const base = new URL("decks/", import.meta.url).href; let idx = [];
  try { idx = await (await fetch(base + "index.json?v=1")).json(); } catch (e) { idx = []; }
  const loaded = await Promise.all(idx.map(async (m) => { try { const d = await (await fetch(base + m.file + "?v=1")).json(); return Object.assign({}, m, d); } catch (e) { return null; } }));
  A.decks = loaded.filter(Boolean); A.decks.push(waveDeck());
  A.udecks.forEach((u) => A.decks.push({ id: u.id, name: u.name, sub: "My own deck", ic: "✎", col: "#c792ff", own: true, reviewed: true, cards: u.cards }));
  A.cards = []; A.byId.clear();
  A.decks.forEach((d) => { const cs = d.built || expandDeck(d); d.list = cs; cs.forEach((c) => { if (!A.byId.has(c.id)) { A.byId.set(c.id, c); A.cards.push(c); } }); });
}
/* ------------------------------ scheduling queues ------------------------------ */
const today = () => dn(Date.now());
const logToday = () => A.log.filter((l) => !l.cr && dn(l.t) === today());
const newToday = () => logToday().filter((l) => l.w === 0).length;
const newLeft = () => Math.max(0, A.set.newPerDay - newToday());
function buildQueue(pool, opt) {
  opt = opt || {}; const now = Date.now(), due = [], learn = [], fresh = [];
  pool.forEach((c) => { const p = A.prog.get(c.id); if (!p) fresh.push(c); else if (p.st === 2) { if (dn(p.due) <= dn(now)) due.push([retrievability((now - p.last) / DAY, p.s), c]); } else if (p.due <= now + 20 * MIN) learn.push(c); });
  due.sort((a, b) => a[0] - b[0]);
  const by = {}; fresh.forEach((c) => (by[c.deck] = by[c.deck] || []).push(c)); const lanes = shuffle(Object.keys(by)), nw = []; const room = opt.noCap ? 1e9 : newLeft();
  for (let i = 0; nw.length < room && lanes.some((k) => by[k][i]); i++) lanes.forEach((k) => { if (by[k][i] && nw.length < room) nw.push(by[k][i]); });
  const rev = due.slice(0, A.set.maxRev).map((x) => x[1]), out = learn.slice(), step = nw.length ? Math.max(2, Math.floor(rev.length / (nw.length + 1))) : 1e9;
  let ni = 0; rev.forEach((c, i) => { out.push(c); if (ni < nw.length && (i + 1) % step === 0) out.push(nw[ni++]); }); while (ni < nw.length) out.push(nw[ni++]);
  return out;
}
const counts = (pool) => { const q = buildQueue(pool); let nw = 0; q.forEach((c) => { if (!A.prog.get(c.id)) nw++; }); return { due: q.length - nw, fresh: nw }; };
const mastered = (c) => { const p = A.prog.get(c.id); return !!p && p.st === 2 && p.s >= 21; };
function streak() {
  const days = new Set(A.log.filter((l) => !l.cr).map((l) => dn(l.t))); let d = today(), n = 0, lastFreeze = 1e9; if (!days.has(d)) d--;
  for (let i = 0; i < 4000; i++) { if (days.has(d)) { n++; d--; } else if (days.has(d - 1) && lastFreeze - d >= 7) { lastFreeze = d; d--; } else break; }
  return n;
}
function summary() {
  const q = buildQueue(A.cards), fresh = q.filter((c) => !A.prog.get(c.id)).length, done = new Set(logToday().map((l) => l.id)).size;
  const s = { t: Date.now(), due: q.length - fresh, fresh, mastered: A.cards.filter(mastered).length, streak: streak(), done, total: done + q.length, decks: A.decks.slice(0, 40).map((d) => { const c = counts(d.list); return { id: d.id, n: d.name, due: c.due, f: c.fresh }; }) };
  s.pct = s.total ? Math.round(done / s.total * 100) : 0; try { localStorage.setItem("ccmem.summary", JSON.stringify(s)); } catch (e) { /* ignore */ } return s;
}

/* ------------------------------ review session ------------------------------ */
function startSession(o) {
  const q = o.cram ? shuffle(o.pool).slice(0, o.limit || 20) : buildQueue(o.pool);
  if (!q.length) { toast(o.cram ? "No cards to practise here yet." : "Nothing due here. You are caught up."); return; }
  A.se = { title: o.title, queue: q.slice(), total: q.length, done: 0, cram: !!o.cram, ok: 0, bad: 0, t0: Date.now(), cur: null, revealed: false, conf: 2, sel: null, shown: 0, relearn: [], last: null, opts: null, ms0: 0, hist: [] };
  nextCard(); go("session");
}
function nextCard() {
  const s = A.se; let c = null, i = s.relearn.findIndex((r) => r.after <= s.done && r.card.id !== (s.last && s.last.id));
  if (i >= 0) c = s.relearn.splice(i, 1)[0].card;
  else if (s.queue.length) { let j = 0; const lp = s.last && s.last.par; if (lp && s.queue[0].par === lp) { const k = s.queue.findIndex((x) => x.par !== lp); if (k > 0 && k < 6) j = k; } c = s.queue.splice(j, 1)[0]; }
  else if (s.relearn.length) c = s.relearn.shift().card;
  s.cur = c; s.revealed = false; s.sel = null; s.conf = 2; s.ms0 = Date.now(); s.opts = null; s.hist = s.hist || [];
  if (c && (c.t === "m" || c.t === "w")) s.opts = optionsFor(c);
}
function optionsFor(c) {
  if (c.t === "m") return shuffle(c.o.map((t, i) => ({ t, ok: i === c.a })));
  const same = WAVES.filter((w) => w[1] === c.fam && w[0] !== c.w), pick = shuffle(same).slice(0, 3);
  return shuffle([{ t: c.name, ok: true }].concat(pick.map((w) => ({ t: w[2], ok: false }))));
}
function gradeCard(g) {
  const s = A.se, c = s.cur; if (!c) return; const now = Date.now(), p0 = A.prog.get(c.id) || null, was = p0 ? p0.st : 0, ms = Math.min(120000, now - s.ms0);
  if (!s.cram) { const p1 = schedule(p0, g, now, A.set.ret); p1.id = c.id; p1.deck = c.deck; A.prog.set(c.id, p1); DB.saveProg(p1); }
  const e = { t: now, id: c.id, dk: c.deck, tg: c.tag, g, ms, w: was, k: c.k, cr: s.cram ? 1 : 0, cf: s.opts ? s.conf : undefined }; A.log.push(e); DB.addLog(e);
  if (g > 1) s.ok++; else { s.bad++; s.relearn.push({ card: c, after: s.done + 4 }); }
  s.done++; s.last = c; summary(); nextCard();
  if (!s.cur) { s.end = true; } render();
}
const prevFor = (c) => preview(A.prog.get(c.id) || null, Date.now(), A.set.ret);

/* ------------------------------ navigation ------------------------------ */
function go(r) { A.route = r; if (location.hash !== "#/" + r) { try { history.pushState(null, "", "#/" + r); } catch (e) { location.hash = "/" + r; } } render(); window.scrollTo(0, 0); }
window.addEventListener("popstate", () => { const r = (location.hash || "#/home").slice(2) || "home"; A.route = r; if ((r === "session" && !A.se) || (r === "rapid" && !A.rap)) A.route = "home"; render(); });
const deckOf = (id) => A.decks.find((d) => d.id === id);

/* ------------------------------ views ------------------------------ */
const topBar = (back) => `<div class="top">${back ? `<button class="ib" data-a="home" aria-label="Back">←</button>` : ""}<div class="brand">CRITICAL CARE HUB • MEMORY LAB</div>${EMBED ? `<button class="ib" data-a="close" aria-label="Leave Memory Lab">✕</button>` : ""}</div>`;
const disclaimer = `<div class="foot">Educational use only; not a substitute for clinical judgement or local protocols. Doses are adult doses and vary by country, product and patient: verify before use. Decks marked DRAFT were written for review and have not yet been checked by the content author. Your progress is saved on this device only (back it up from Settings).</div>`;
function vHome() {
  const s = summary(), tl = s.total, pct = s.pct, ready = s.due + s.fresh;
  const cta = ready ? `START DAILY REVISION<small>${s.due} due · ${s.fresh} new · about ${Math.max(1, Math.round(ready * 0.4))} min</small>` : `ALL CAUGHT UP<small>Tap to study ahead (does not change your schedule)</small>`;
  return `<div class="hero">${topBar()}<h1>MEMORY LAB</h1><p class="sub">YOUR PERSONAL CLINICAL MEMORY SYSTEM</p><p class="tag"><b>Learn Today.</b> Recall Tomorrow. Remember for Life.</p></div>
<div class="stats"><div class="st"><b>${s.mastered}</b><span>Cards mastered</span></div><div class="st"><b>${s.due}</b><span>Due today</span></div><div class="st"><b>${s.fresh}</b><span>New cards</span></div><div class="st"><b>${s.streak}</b><span>${s.streak === 1 ? "Day" : "Days"} study streak</span></div></div>
<div class="prog"><div class="pr" style="--v:${pct}"><i>${pct}%</i></div><div><h3>TODAY'S LEARNING PROGRESS</h3><p>${s.done} of ${tl} scheduled cards completed</p></div></div>
<button class="cta" data-a="daily">${cta}</button>
<div class="tools">
<button class="tool" data-a="weak"><em>🎯</em><b>Weak Memory Zone</b><i>Topics and cards you keep missing</i></button>
<button class="tool" data-a="rapid"><em>⚡</em><b>Rapid Recall</b><i>60-second memory challenge</i></button>
<button class="tool" data-a="image"><em>🩺</em><b>Clinical Image Challenge</b><i>ECG rhythm recognition, fast</i></button>
<button class="tool" data-a="own"><em>✎</em><b>My Own Deck</b><i>Create, import, export, quick card maker</i></button>
<button class="tool" data-a="stats"><em>📈</em><b>Memory Analytics</b><i>Retention, accuracy, forecast, streak</i></button>
</div>
<h2 class="sec">SEVEN TYPES OF MEMORY CARD</h2>
<div class="kinds">${KINDS.map((k) => { const n = A.cards.filter((c) => kindMatch(c, k.k)).length; return `<button class="kd" data-a="kind" data-k="${k.k}"><em>${k.ic}</em><b>${k.n}</b><i>${k.d}</i><i style="color:var(--c);margin-top:4px">${n} cards</i></button>`; }).join("")}</div>
<h2 class="sec">SELECT YOUR MEMORY DECK</h2>
<div class="decks">${A.decks.map((d) => { const c = counts(d.list), m = d.list.filter(mastered).length, pc = d.list.length ? Math.round(m / d.list.length * 100) : 0; return `<button class="dk" data-a="deck" data-id="${esc(d.id)}" style="--dc:${esc(d.col || "#36d6ff")}"><div class="hd"><span class="ic">${esc(d.ic || "🧠")}</span><b>${esc(d.name)}</b></div><div class="ds">${esc(d.sub || "")}</div><div class="ct"><u>${c.due} due</u><s>${c.fresh} new</s><span>${d.list.length} cards</span></div><div class="bar"><i style="width:${pc}%"></i></div>${d.reviewed === false ? `<span class="chip">DRAFT · pending author review</span>` : ""}</button>`; }).join("")}</div>
${disclaimer}`;
}
function vDeck(id) {
  const d = deckOf(id); if (!d) return vHome(); const c = counts(d.list), m = d.list.filter(mastered).length, kinds = {}; d.list.forEach((x) => { kinds[x.k] = (kinds[x.k] || 0) + 1; });
  const rows = d.list.slice(0, 120).map((x) => { const p = A.prog.get(x.id), st = !p ? "New" : p.st === 2 ? "due " + (dn(p.due) <= today() ? "today" : "in " + (dn(p.due) - today()) + " d") : "learning"; const t = x.q || (x.x || "").replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, "$1") || x.name || ""; return `<div class="li"><div class="g">${esc(t.replace(/\*\*/g, "").slice(0, 110))}<small>${esc(kind(x.k).n)} · ${esc(x.tag || "")}</small></div><span class="chip" style="color:var(--c);border-color:var(--line)">${st}</span></div>`; }).join("");
  return `<div class="pg">${topBar(true)}<h2>${esc(d.ic || "")} ${esc(d.name)}</h2><p class="lead">${esc(d.sub || "")}</p>${d.reviewed === false ? `<p><span class="chip">DRAFT · pending author review</span></p>` : ""}
<div class="kv"><div><b>${d.list.length}</b><span>Cards</span></div><div><b>${c.due}</b><span>Due</span></div><div><b>${c.fresh}</b><span>New today</span></div><div><b>${m}</b><span>Mastered</span></div></div>
<div class="row2"><button class="btn" data-a="study" data-id="${esc(d.id)}">STUDY THIS DECK</button><button class="btn ghost" data-a="ahead" data-id="${esc(d.id)}">STUDY AHEAD (PRACTICE)</button></div>
<h2 class="sec">CARDS${d.list.length > 120 ? " (first 120)" : ""}</h2><div class="lst">${rows}</div>${d.own ? `<div class="row2"><button class="btn ghost" data-a="ownedit" data-id="${esc(d.id)}">EDIT THIS DECK</button><span></span></div>` : ""}</div>`;
}
const clozeHtml = (c, rev) => esc(c.x).replace(/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g, (m, n, t, h) => n === c.n ? (rev ? `<span class="cza">${t}</span>` : `<span class="cz">[ ${h || "…"} ]</span>`) : t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
function cardBody(c, s) {
  const k = kind(c.k); let h = `<span class="badge">${k.b}${c.fam ? " · " + ({ ecg: "ECG", art: "ARTERIAL LINE", cap: "CAPNOGRAPHY", vent: "VENTILATOR" })[c.fam] : ""}</span>`;
  if (c.t === "w") h += `<div class="q">${esc(WAVE_Q[c.fam])}</div><canvas class="wv${c.fam === "vent" ? " tall" : ""}" id="wv"></canvas>`;
  else if (c.t === "b") h += `<div class="q">${fmt(c.q)}</div>${c.img ? `<img alt="" src="${esc(c.img)}">` : ""}`;
  else if (c.t === "c") h += `<div class="q">${clozeHtml(c, s.revealed)}</div>`;
  else h += `<div class="q">${fmt(c.q)}</div>${c.img ? `<img alt="" src="${esc(c.img)}">` : ""}`;
  return h;
}
function vSession() {
  const s = A.se; if (!s) return vHome();
  if (!s.cur) {
    const tot = s.ok + s.bad, acc = tot ? Math.round(s.ok / tot * 100) : 0, mins = Math.max(1, Math.round((Date.now() - s.t0) / 60000)), sm = summary();
    return `<div class="sum">${topBar()}<div class="badge">${s.cram ? "PRACTICE COMPLETE" : "SESSION COMPLETE"}</div><div class="big">${acc}%</div><h2>${tot} cards · ${mins} min</h2><p class="lead">${s.cram ? "Practice mode does not change your schedule." : sm.due + sm.fresh > 0 ? "More cards are waiting today." : "You are caught up. Memory strengthens between sessions: come back tomorrow."}</p>
<div class="row2">${!s.cram && sm.due + sm.fresh > 0 ? `<button class="btn" data-a="daily">KEEP GOING</button>` : `<button class="btn" data-a="weak">WEAK MEMORY ZONE</button>`}<button class="btn ghost" data-a="home">BACK TO MEMORY LAB</button></div></div>`;
  }
  const c = s.cur, pct = Math.round(s.done / Math.max(1, s.total + s.bad) * 100), pos = Math.min(s.done + 1, s.total + s.bad), isQ = !!s.opts, prv = prevFor(c);
  const grades = (sug) => `<div class="grades">${[["Again", 1], ["Hard", 2], ["Good", 3], ["Easy", 4]].map((x) => `<button class="gr g${x[1]}${sug === x[1] ? " sug" : ""}" data-a="grade" data-g="${x[1]}"><b>${x[0]}</b><i>${s.cram ? "—" : fmtIv(prv[x[1] - 1])}</i></button>`).join("")}</div>`;
  let body = cardBody(c, s);
  if (isQ) {
    const sel = s.sel;
    body += `<div class="opts">${s.opts.map((o, i) => `<button class="opt${sel != null ? (o.ok ? " ok" : i === sel ? " no" : " dim") : ""}" data-a="opt" data-i="${i}" ${sel != null ? "disabled" : ""}><span class="l">${"ABCDE"[i]}</span><span>${fmt(o.t)}</span></button>`).join("")}</div>`;
    if (sel == null) body += `<div class="conf"><span>How sure are you?</span>${[["Guess", 1], ["Fairly sure", 2], ["Certain", 3]].map((x) => `<button class="${s.conf === x[1] ? "on" : ""}" data-a="conf" data-v="${x[1]}">${x[0]}</button>`).join("")}</div>`;
    else { const right = s.opts[sel].ok, sug = !right ? 1 : s.conf === 1 ? 2 : s.conf === 3 ? 4 : 3; body += `<div class="expl"><b>${right ? "Correct." : "Not quite."}</b> ${fmt(c.e || (c.t === "w" ? c.e : ""))}</div>${!right && s.conf === 3 ? `<div class="hint">You were certain: confident mistakes are the most valuable to fix. This card will return soon.</div>` : ""}${grades(sug)}`; }
  } else if (!s.revealed) body += `<div class="hint">Think before revealing the answer</div><button class="reveal" data-a="reveal">REVEAL ANSWER</button>`;
  else { body += `<div class="ans">${c.t === "c" ? "" : fmt(c.a)}${c.t === "c" && c.x ? `<div class="hint">Cloze ${esc(c.n)} revealed above</div>` : ""}</div>${grades(0)}`; }
  if (c.src) body += `<div class="srcline">Source: ${esc(c.src)}</div>`;
  const dk = deckOf(c.deck);
  return `<div class="sbar"><button class="ib" data-a="endsession" aria-label="End session">✕</button><div class="t"><b>${esc((s.title || "").toUpperCase())}</b><span>${esc(dk ? dk.name : "")} · CARD ${String(pos).padStart(2, "0")} / ${s.total + s.bad}</span></div></div><div class="pbar"><i style="width:${pct}%"></i></div><div class="card">${body}</div>${s.cram ? `<div class="hint" style="margin-top:8px;text-align:center">Practice mode: your schedule is not changed</div>` : ""}`;
}
/* ------------------------------ rapid recall and image challenge ------------------------------ */
function startRapid(o) {
  const pool = shuffle(o.pool.filter((c) => c.t === "m" || c.t === "w")); if (pool.length < 4) { toast("Not enough question cards for this challenge."); return; }
  A.rap = { title: o.title, q: pool, i: 0, ok: 0, bad: 0, missed: [], secs: o.secs || 0, n: o.n || 0, t0: Date.now(), streak: 0, best: 0, opts: null, sel: null, key: o.key, end: false }; rapNext(); go("rapid");
  if (A.rap.secs) { clearInterval(A.ret); A.ret = setInterval(() => { const r = A.rap; if (!r || r.end) { clearInterval(A.ret); return; } const left = r.secs - (Date.now() - r.t0) / 1000; const el = $("#rt"); if (el) el.textContent = Math.max(0, Math.ceil(left)); if (left <= 0) rapFinish(); }, 250); }
}
function rapNext() { const r = A.rap; const c = r.q[r.i % r.q.length]; r.cur = c; r.opts = optionsFor(c); r.sel = null; }
function rapPick(i) {
  const r = A.rap; if (r.sel != null || r.end) return; r.sel = i; const ok = r.opts[i].ok;
  if (ok) { r.ok++; r.streak++; r.best = Math.max(r.best, r.streak); } else { r.bad++; r.streak = 0; r.missed.push(r.cur); const e = A.kv.perr || {}; e[r.cur.id] = (e[r.cur.id] || 0) + 1; A.kv.perr = e; DB.setKV("perr", e); }
  A.log.push({ t: Date.now(), id: r.cur.id, dk: r.cur.deck, tg: r.cur.tag, g: ok ? 3 : 1, ms: 0, w: -1, k: r.cur.k, cr: 1 }); render();
  setTimeout(() => { if (!A.rap || A.rap !== r || r.end) return; r.i++; if (r.n && r.i >= r.n) rapFinish(); else { rapNext(); render(); } }, ok ? 650 : 1700);
}
function rapFinish() {
  const r = A.rap; if (!r || r.end) return; r.end = true; clearInterval(A.ret); const bk = "best-" + r.key; const prev = A.kv[bk] || 0; r.newBest = r.ok > prev; if (r.newBest) { A.kv[bk] = r.ok; DB.setKV(bk, r.ok); } render();
}
function vRapid() {
  const r = A.rap; if (!r) return vHome();
  if (r.end) return `<div class="sum">${topBar()}<div class="badge">${esc(r.title.toUpperCase())}</div><div class="big">${r.ok}</div><h2>correct of ${r.ok + r.bad}</h2><p class="lead">Best streak ${r.best}${r.newBest ? " · NEW PERSONAL BEST" : A.kv["best-" + r.key] ? " · personal best " + A.kv["best-" + r.key] : ""}</p>
${r.missed.length ? `<div class="panel" style="text-align:left"><h3>TO REVISE</h3><div class="lst">${[...new Map(r.missed.map((c) => [c.id, c])).values()].slice(0, 8).map((c) => `<div class="li"><div class="g">${esc((c.q || c.name || "").replace(/\*\*/g, "").slice(0, 120))}<small>${esc(c.t === "w" ? c.name : c.o[c.a])}</small></div></div>`).join("")}</div></div>` : ""}
<div class="row2"><button class="btn" data-a="${r.key === "img" ? "image" : "rapid"}">AGAIN</button><button class="btn ghost" data-a="home">BACK TO MEMORY LAB</button></div></div>`;
  const c = r.cur, sel = r.sel;
  return `<div class="sbar"><button class="ib" data-a="endrapid" aria-label="Stop">✕</button><div class="t"><b>${esc(r.title.toUpperCase())}</b><span class="score">CORRECT ${r.ok} · STREAK ${r.streak}</span></div>${r.secs ? `<div class="timer" id="rt">${Math.max(0, Math.ceil(r.secs - (Date.now() - r.t0) / 1000))}</div>` : `<span class="score">${r.i + 1} / ${r.n}</span>`}</div>
<div class="card"><span class="badge">${esc(kind(c.k).b)}</span>${c.t === "w" ? `<div class="q">${esc(WAVE_Q[c.fam])}</div><canvas class="wv${c.fam === "vent" ? " tall" : ""}" id="wv"></canvas>` : `<div class="q">${fmt(c.q)}</div>`}
<div class="opts">${r.opts.map((o, i) => `<button class="opt${sel != null ? (o.ok ? " ok" : i === sel ? " no" : " dim") : ""}" data-a="ropt" data-i="${i}" ${sel != null ? "disabled" : ""}><span class="l">${"ABCDE"[i]}</span><span>${fmt(o.t)}</span></button>`).join("")}</div>${sel != null && !r.opts[sel].ok ? `<div class="expl">${fmt(c.e || "")}</div>` : ""}</div>`;
}

/* ------------------------------ analytics and weak zone ------------------------------ */
const L = () => A.log.filter((l) => !l.cr);
function vStats() {
  const l = L(), n = l.length, ok = l.filter((x) => x.g > 1).length, rev30 = l.filter((x) => x.w >= 2 && Date.now() - x.t < 30 * DAY), ret = rev30.length >= 5 ? Math.round(rev30.filter((x) => x.g > 1).length / rev30.length * 100) + "%" : "—";
  const ms = l.filter((x) => x.ms > 0).map((x) => x.ms), avg = ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length / 1000) : 0, fc = new Array(14).fill(0);
  A.prog.forEach((p) => { if (p.st === 2) { const d = dn(p.due) - today(); if (d < 14) fc[Math.max(0, d)]++; } }); const mx = Math.max(1, ...fc);
  const per = {}; l.forEach((x) => { const d = dn(x.t); per[d] = (per[d] || 0) + 1; }); const t0 = today(), start = t0 - 83 - ((new Date().getDay() + 6) % 7) % 7 + 0; let heat = ""; const hmax = Math.max(1, ...Object.values(per));
  for (let d = t0 - 83; d <= t0; d++) { const v = per[d] || 0; heat += `<i title="${v} reviews" style="${v ? `background:rgba(54,214,255,${(0.2 + 0.8 * v / hmax).toFixed(2)})` : ""}"></i>`; }
  const rows = A.decks.map((d) => { const ls = l.filter((x) => x.dk === d.id), a = ls.length ? Math.round(ls.filter((x) => x.g > 1).length / ls.length * 100) : null, m = d.list.filter(mastered).length, c = counts(d.list); return `<div class="li"><div class="g">${esc(d.name)}<small>${ls.length} reviews · accuracy ${a == null ? "—" : a + "%"} · ${c.due} due</small></div><div style="width:90px"><div class="bar" style="--dc:${esc(d.col || "#36d6ff")}"><i style="width:${d.list.length ? Math.round(m / d.list.length * 100) : 0}%"></i></div><small style="color:var(--mut);font-size:10px">${m}/${d.list.length} mastered</small></div></div>`; }).join("");
  return `<div class="pg">${topBar(true)}<h2>Memory Analytics</h2><p class="lead">What you retain, not just what you read.</p>
<div class="kv"><div><b>${ret}</b><span>Retention (30 days)</span></div><div><b>${n ? Math.round(ok / n * 100) + "%" : "—"}</b><span>Accuracy</span></div><div><b>${n}</b><span>Reviews</span></div><div><b>${avg ? avg + " s" : "—"}</b><span>Per card</span></div><div><b>${A.cards.filter(mastered).length}</b><span>Mastered</span></div><div><b>${streak()}</b><span>Day streak</span></div></div>
<div class="panel" style="margin-top:12px"><h3>REVIEWS DUE · NEXT 14 DAYS</h3><div class="bars">${fc.map((v) => `<div style="height:${Math.max(2, v / mx * 100)}%"><span>${v || ""}</span></div>`).join("")}</div><div class="axis">${fc.map((v, i) => `<span>${i === 0 ? "now" : "+" + i}</span>`).join("")}</div></div>
<div class="panel"><h3>ACTIVITY · LAST 12 WEEKS</h3><div class="heat">${heat}</div></div>
<div class="panel"><h3>BY DECK</h3><div class="lst">${rows}</div></div>${n < 20 ? `<p class="lead">These figures become meaningful after a few days of reviews.</p>` : ""}</div>`;
}
function weakCards() {
  const pe = A.kv.perr || {}, out = [];
  A.cards.forEach((c) => { const p = A.prog.get(c.id), e = pe[c.id] || 0; let sc = 0; if (p) { if (p.n >= 3 && p.ok / p.n < 0.6) sc += (p.n - p.ok); if (p.lapses >= 2) sc += p.lapses; } sc += e; if (sc >= 2) out.push([sc, c, p]); });
  return out.sort((a, b) => b[0] - a[0]);
}
function vWeak() {
  const wc = weakCards(), l = L().filter((x) => Date.now() - x.t < 90 * DAY), tg = {}; l.forEach((x) => { const k = x.tg || "Other"; tg[k] = tg[k] || [0, 0]; tg[k][0]++; if (x.g === 1) tg[k][1]++; });
  const topics = Object.entries(tg).filter((e) => e[1][0] >= 4).map((e) => [e[0], e[1][1] / e[1][0], e[1][0], e[1][1]]).filter((e) => e[1] >= 0.2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return `<div class="pg">${topBar(true)}<h2>Weak Memory Zone</h2><p class="lead">Topics and cards you answer wrongly again and again. They are shown more often until they stick.</p>
<div class="panel"><h3>WEAKEST TOPICS · LAST 90 DAYS</h3>${topics.length ? `<div class="lst">${topics.map((t) => `<div class="li"><div class="g">${esc(t[0])}<small>${t[3]} misses in ${t[2]} reviews</small></div><div style="width:90px"><div class="bar" style="--dc:var(--bad)"><i style="width:${Math.round(t[1] * 100)}%"></i></div></div></div>`).join("")}</div>` : `<p class="lead" style="margin:0">Nothing flagged yet. Review for a few days and your weak spots will appear here.</p>`}</div>
<div class="panel"><h3>CARDS THAT KEEP SLIPPING (${wc.length})</h3>${wc.length ? `<div class="lst">${wc.slice(0, 12).map((x) => `<div class="li"><div class="g">${esc((x[1].q || x[1].name || (x[1].x || "").replace(/\{\{c\d+::(.*?)(::.*?)?\}\}/g, "$1")).replace(/\*\*/g, "").slice(0, 120))}<small>${esc(deckOf(x[1].deck) ? deckOf(x[1].deck).name : "")}${x[2] ? " · " + x[2].lapses + " lapses" : ""}</small></div></div>`).join("")}</div>` : `<p class="lead" style="margin:0">No leech cards. Good.</p>`}</div>
${wc.length ? `<button class="cta" data-a="drill">DRILL WEAK CARDS<small>Extra practice. Does not change your schedule.</small></button>` : ""}</div>`;
}
/* ------------------------------ my own deck ------------------------------ */
const saveU = () => DB.setKV("udecks", A.udecks);
const uid = () => "u" + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);
function cleanCard(c) {
  if (!c || typeof c !== "object") return null; const s = (v) => String(v == null ? "" : v).trim().slice(0, 1200);
  if (c.t === "b" && s(c.q) && s(c.a)) return { t: "b", q: s(c.q), a: s(c.a), tag: s(c.tag) || undefined, k: s(c.k) || undefined };
  if (c.t === "c" && /\{\{c\d+::/.test(s(c.x))) return { t: "c", x: s(c.x), tag: s(c.tag) || undefined };
  if (c.t === "m" && s(c.q) && Array.isArray(c.o) && c.o.length > 1 && Number.isInteger(c.a) && c.a >= 0 && c.a < c.o.length) return { t: "m", q: s(c.q), o: c.o.slice(0, 6).map(s), a: c.a, e: s(c.e), tag: s(c.tag) || undefined, k: s(c.k) || undefined };
  if (c.t === "d" && s(c.n)) return { t: "d", n: s(c.n), cls: s(c.cls), moa: s(c.moa), dose: s(c.dose), ci: s(c.ci), renal: s(c.renal), pearl: s(c.pearl), tag: s(c.tag) || undefined };
  return null;
}
function parseImport(txt) {
  txt = txt.trim(); let cards = [], name = "";
  try { const j = JSON.parse(txt); if (Array.isArray(j)) cards = j; else { cards = j.cards || []; name = j.name || ""; } } catch (e) {
    txt.split(/\r?\n/).forEach((ln) => { const p = ln.split(/\t|;/); if (p.length >= 2 && p[0].trim() && p[1].trim()) cards.push(/\{\{c\d+::/.test(p[0]) ? { t: "c", x: p[0] } : { t: "b", q: p[0], a: p.slice(1).join(" ") }); });
  }
  return { name, cards: cards.map(cleanCard).filter(Boolean) };
}
function quickCards(text) {
  const out = [], sents = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9*])/).map((s) => s.trim()).filter((s) => s.split(" ").length >= 6);
  sents.forEach((s) => {
    let m = s.match(/\*\*(.+?)\*\*/); let tok = m ? m[1] : null;
    if (!tok) { const nums = s.match(/\b\d+(?:[.,]\d+)?\s?(?:–|-|to)?\s?\d*(?:\.\d+)?\s?(?:mL\/kg\/h|mL\/kg|mg\/kg\/h|mg\/kg|mcg\/kg\/min|mmHg|mmol\/L|mEq\/L|cmH2O|cmH₂O|mg|mL|mcg|µg|%|hours?|hrs?|h|minutes?|min|days?|weeks?)\b/i); if (nums) tok = nums[0]; }
    if (!tok) { const ac = s.match(/\b[A-Z]{2,6}[a-z]?\b/g); if (ac) tok = ac.find((a) => !/^(The|ICU|AND)$/.test(a)) || null; }
    if (!tok) { const w = s.match(/\b[a-zA-Z]{9,}\b/g); if (w) tok = w.sort((a, b) => b.length - a.length)[0]; }
    if (!tok) return; const x = s.replace(/\*\*/g, "").replace(tok.replace(/\*\*/g, ""), "{{c1::" + tok.replace(/\*\*/g, "") + "}}"); if (x.includes("{{c1::")) out.push({ t: "c", x });
  });
  return out.slice(0, 40);
}
const aiPrompt = (text) => `You are a critical care educator. Turn the text below into spaced-repetition flashcards for ICU doctors. Return ONLY valid JSON in this exact shape, no commentary:\n{"name":"Deck name","cards":[\n {"t":"b","q":"question","a":"answer","tag":"topic"},\n {"t":"c","x":"A sentence with the key term in {{c1::cloze}} form","tag":"topic"},\n {"t":"m","q":"clinical scenario then question","o":["option A","option B","option C","option D"],"a":0,"e":"why the answer is right","tag":"topic"}\n]}\nRules: one fact per card; short answers; use mcq for decisions and scenarios; include units; never invent doses or facts not in the text.\n\nTEXT:\n${text}`;
function vOwn() {
  return `<div class="pg">${topBar(true)}<h2>My Own Deck</h2><p class="lead">Make your own cards, import decks, or turn your notes into cards. Everything stays on this device.</p>
<div class="panel"><h3>MY DECKS</h3><div class="lst">${A.udecks.length ? A.udecks.map((u) => `<div class="li"><div class="g">${esc(u.name)}<small>${u.cards.length} cards</small></div><button class="btn ghost" data-a="ownedit" data-id="${u.id}" style="padding:8px 12px">EDIT</button></div>`).join("") : `<p class="lead" style="margin:0">No decks yet.</p>`}</div>
<label>New deck name</label><input id="nd" maxlength="60" placeholder="e.g. My ventilator pearls"><div class="row2"><button class="btn" data-a="newdeck">CREATE DECK</button><span></span></div></div>
<div class="panel"><h3>QUICK CARD MAKER (ON THIS DEVICE)</h3><p class="lead" style="margin-top:0">Paste notes or a chapter paragraph. Put **double stars** around the term you want hidden, or let it pick numbers, abbreviations and long terms. Review the cards, then add the ones you want.</p><textarea id="qt" placeholder="Paste text here"></textarea><div class="row2"><button class="btn" data-a="qmake">MAKE CARDS</button><button class="btn ghost" data-a="qprompt">COPY AI PROMPT</button></div><div id="qres"></div></div>
<div class="panel"><h3>IMPORT A DECK</h3><p class="lead" style="margin-top:0">Paste deck JSON (from this app or from an AI assistant using the prompt above), or tab-separated lines (front, back) exported from Anki.</p><textarea id="im" placeholder="Paste JSON or tab-separated text"></textarea><input id="imf" type="file" accept=".json,.txt,.tsv,.csv" style="margin-top:8px"><div class="row2"><button class="btn" data-a="import">IMPORT</button><span></span></div></div></div>`;
}
function vOwnEdit(id) {
  const u = A.udecks.find((x) => x.id === id); if (!u) return vOwn();
  return `<div class="pg">${topBar(true)}<h2>${esc(u.name)}</h2><p class="lead">${u.cards.length} cards. Cloze cards use {{c1::hidden text}}.</p>
<div class="panel"><h3>ADD A CARD</h3><label>Type</label><select id="ct"><option value="b">Question and answer</option><option value="c">Cloze (fill in the blank)</option><option value="m">Multiple choice scenario</option></select>
<label>Question / text</label><textarea id="cq"></textarea><label>Answer (or correct option for multiple choice)</label><textarea id="ca"></textarea><label>Wrong options for multiple choice (one per line)</label><textarea id="co" placeholder="Used only for multiple choice"></textarea><label>Explanation (optional)</label><input id="ce"><label>Topic tag (optional)</label><input id="cg" maxlength="40"><div class="row2"><button class="btn" data-a="addcard" data-id="${u.id}">ADD CARD</button><span></span></div></div>
<div class="panel"><h3>CARDS</h3><div class="lst">${u.cards.map((c, i) => `<div class="li"><div class="g">${esc((c.q || c.x || c.n || "").slice(0, 110))}<small>${esc(c.t === "b" ? "Q&A" : c.t === "c" ? "Cloze" : c.t === "m" ? "Multiple choice" : "Drug")}</small></div><button class="btn red" data-a="delcard" data-id="${u.id}" data-i="${i}" style="padding:8px 12px">DELETE</button></div>`).join("") || "<p class='lead' style='margin:0'>No cards yet.</p>"}</div></div>
<div class="row2"><button class="btn ghost" data-a="exportdeck" data-id="${u.id}">EXPORT DECK (JSON)</button><button class="btn red" data-a="deldeck" data-id="${u.id}">DELETE DECK</button></div></div>`;
}
function vSettings() {
  const s = A.set;
  return `<div class="pg">${topBar(true)}<h2>Settings and backup</h2><p class="lead">Storage: ${A.mode === "idb" ? "saved in this browser (IndexedDB)" : "limited storage mode (localStorage)"}. Clearing site data or switching device loses progress unless you back it up.</p>
<div class="panel"><h3>DAILY LIMITS</h3><label>New cards per day</label><input id="s1" type="number" min="0" max="60" value="${s.newPerDay}"><label>Maximum reviews per day</label><input id="s2" type="number" min="20" max="600" value="${s.maxRev}"><label>Target retention</label><select id="s3">${[0.8, 0.85, 0.9, 0.95].map((v) => `<option value="${v}" ${s.ret === v ? "selected" : ""}>${Math.round(v * 100)}%${v === 0.9 ? " (recommended)" : ""}</option>`).join("")}</select><div class="row2"><button class="btn" data-a="saveset">SAVE</button><span></span></div></div>
<div class="panel"><h3>BACKUP</h3><div class="row2"><button class="btn" data-a="backup">DOWNLOAD BACKUP</button><button class="btn ghost" data-a="restore">RESTORE FROM FILE</button></div><input id="rf" type="file" accept=".json" hidden><p class="lead" style="margin:10px 0 0">Keep a backup file in your cloud drive. Restoring replaces the progress on this device.</p></div>
<div class="panel"><h3>RESET</h3><button class="btn red" data-a="reset">ERASE ALL PROGRESS ON THIS DEVICE</button></div></div>`;
}
/* ------------------------------ render and events ------------------------------ */
function render() {
  const r = A.route; let h;
  if (r === "session") h = vSession(); else if (r === "rapid") h = vRapid(); else if (r.startsWith("deck:")) h = vDeck(r.slice(5)); else if (r === "stats") h = vStats(); else if (r === "weak") h = vWeak(); else if (r === "own") h = vOwn(); else if (r.startsWith("ownedit:")) h = vOwnEdit(r.slice(8)); else if (r === "settings") h = vSettings(); else h = vHome();
  $("#app").innerHTML = h; drawNow();
}
function drawNow() { const cv = $("#wv"); if (!cv) return; const c = r0().cur; if (c && c.t === "w") requestAnimationFrame(() => drawWave(cv, c.w)); }
const r0 = () => (A.route === "rapid" ? A.rap || {} : A.se || {});
window.addEventListener("resize", () => { clearTimeout(drawNow.t); drawNow.t = setTimeout(drawNow, 150); });
const studyPool = (title, pool) => { if (buildQueue(pool).length) startSession({ title, pool }); else { const p = shuffle(pool); startSession({ title: title + " · practice", pool: p, cram: true, limit: 20 }); } };
const ahead = (pool, title) => { const rv = pool.filter((c) => A.prog.get(c.id)).sort((a, b) => A.prog.get(a.id).due - A.prog.get(b.id).due).slice(0, 14), nw = shuffle(pool.filter((c) => !A.prog.get(c.id))).slice(0, 10); startSession({ title, pool: rv.concat(nw), cram: true, limit: 24 }); };
const dl = (name, text) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
const val = (id) => ($("#" + id) ? $("#" + id).value : "");
async function reloadDecks() { await loadDecks(); summary(); render(); }
const H = {
  home: () => { A.se = null; go("home"); }, close: () => { try { parent.postMessage({ type: "ccmem-close" }, "*"); } catch (e) { /* ignore */ } },
  daily: () => { if (buildQueue(A.cards).length) startSession({ title: "Daily revision", pool: A.cards }); else ahead(A.cards, "Study ahead"); },
  deck: (e) => go("deck:" + e.id), study: (e) => { const d = deckOf(e.id); if (d) studyPool(d.name, d.list); }, ahead: (e) => { const d = deckOf(e.id); if (d) ahead(d.list, d.name + " · ahead"); },
  kind: (e) => { const k = kind(e.k); studyPool(k.n, A.cards.filter((c) => kindMatch(c, e.k))); },
  weak: () => go("weak"), drill: () => startSession({ title: "Weak card drill", pool: weakCards().map((x) => x[1]), cram: true, limit: 20 }),
  rapid: () => startRapid({ title: "Rapid Recall · 60 s", pool: A.cards, secs: 60, key: "rapid" }), image: () => startRapid({ title: "Clinical Image Challenge", pool: A.cards.filter((c) => kindMatch(c, "image") && c.t === "w"), n: 10, key: "img" }),
  own: () => go("own"), stats: () => go("stats"), settings: () => go("settings"),
  reveal: () => { A.se.revealed = true; render(); }, grade: (e) => gradeCard(+e.g), opt: (e) => { const s = A.se; if (s.sel == null) { s.sel = +e.i; render(); } }, conf: (e) => { A.se.conf = +e.v; render(); },
  endsession: () => { A.se = null; go("home"); }, ropt: (e) => rapPick(+e.i), endrapid: () => { clearInterval(A.ret); A.rap = null; go("home"); },
  newdeck: async () => { const n = val("nd").trim(); if (!n) return toast("Give the deck a name."); const u = { id: uid(), name: n, cards: [] }; A.udecks.push(u); saveU(); await loadDecks(); go("ownedit:" + u.id); },
  ownedit: (e) => go("ownedit:" + e.id),
  addcard: async (e) => { const u = A.udecks.find((x) => x.id === e.id), t = val("ct"), q = val("cq").trim(), a = val("ca").trim(), tag = val("cg").trim() || undefined; let c = null;
    if (t === "b") c = { t, q, a, tag }; else if (t === "c") c = { t, x: q, tag }; else { const wrong = val("co").split("\n").map((x) => x.trim()).filter(Boolean); const o = [a].concat(wrong); c = { t, q, o, a: 0, e: val("ce").trim(), tag }; }
    c = cleanCard(c); if (!c) return toast(t === "c" ? "A cloze needs {{c1::hidden text}}." : t === "m" ? "Add a question, the correct option and at least one wrong option." : "Add a question and an answer."); u.cards.push(c); saveU(); await loadDecks(); toast("Card added"); render(); },
  delcard: async (e) => { const u = A.udecks.find((x) => x.id === e.id); u.cards.splice(+e.i, 1); saveU(); await loadDecks(); render(); },
  deldeck: async (e) => { if (!confirm("Delete this deck and its cards?")) return; A.udecks = A.udecks.filter((x) => x.id !== e.id); saveU(); await loadDecks(); go("own"); },
  exportdeck: (e) => { const u = A.udecks.find((x) => x.id === e.id); dl("memory-lab-" + u.name.replace(/[^\w]+/g, "-").toLowerCase() + ".json", JSON.stringify({ name: u.name, cards: u.cards }, null, 1)); },
  qmake: () => { const t = val("qt"); if (t.trim().length < 30) return toast("Paste a few sentences first."); const cs = quickCards(t); A.qc = cs; $("#qres").innerHTML = cs.length ? `<div class="lst" style="margin-top:10px">${cs.map((c, i) => `<label class="li" style="margin:0;color:var(--tx)"><input type="checkbox" data-q="${i}" checked style="width:auto"><div class="g">${esc(c.x.replace(/\{\{c1::(.*?)\}\}/, "[$1]"))}</div></label>`).join("")}</div><label>Add to deck</label><select id="qd">${A.udecks.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}<option value="">+ New deck</option></select><div class="row2"><button class="btn" data-a="qadd">ADD SELECTED</button><span></span></div>` : `<p class="lead">No suitable sentences found. Try longer sentences with numbers or terms.</p>`; },
  qadd: async () => { const pick = $$("input[data-q]").filter((x) => x.checked).map((x) => A.qc[+x.dataset.q]); if (!pick.length) return toast("Select at least one card."); let id = val("qd"), u = A.udecks.find((x) => x.id === id); if (!u) { u = { id: uid(), name: "Quick cards " + new Date().toLocaleDateString(), cards: [] }; A.udecks.push(u); } u.cards.push(...pick); saveU(); await loadDecks(); toast(pick.length + " cards added to " + u.name); go("own"); },
  qprompt: async () => { const t = val("qt"); const p = aiPrompt(t.trim() || "(paste your chapter text here)"); try { await navigator.clipboard.writeText(p); toast("Prompt copied. Paste it into an AI assistant, then paste its JSON under Import."); } catch (e) { $("#qt").value = p; toast("Copy the prompt from the box."); } },
  import: async () => { let t = val("im"); const f = $("#imf") && $("#imf").files[0]; if (f) t = await f.text(); const r = parseImport(t); if (!r.cards.length) return toast("No valid cards found in that text."); const u = { id: uid(), name: r.name || "Imported deck " + new Date().toLocaleDateString(), cards: r.cards }; A.udecks.push(u); saveU(); await loadDecks(); toast(r.cards.length + " cards imported"); go("ownedit:" + u.id); },
  saveset: () => { A.set = { newPerDay: Math.max(0, Math.min(60, +val("s1") || 0)), maxRev: Math.max(20, Math.min(600, +val("s2") || 200)), ret: +val("s3") || 0.9 }; DB.setKV("settings", A.set); toast("Saved"); go("home"); },
  backup: () => dl("memory-lab-backup-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ v: 1, prog: [...A.prog.values()], log: A.log, kv: Object.assign({}, A.kv, { udecks: A.udecks, settings: A.set }) })),
  restore: () => { const f = $("#rf"); f.onchange = async () => { try { const d = JSON.parse(await f.files[0].text()); if (!d.prog || !d.log) throw 0; if (!confirm("Replace the progress on this device with this backup?")) return; await DB.restore(d); location.reload(); } catch (e) { toast("That file is not a Memory Lab backup."); } }; f.click(); },
  reset: async () => { if (!confirm("Erase all progress on this device? This cannot be undone.")) return; await DB.wipe(); location.reload(); },
};
document.addEventListener("click", (ev) => { const b = ev.target.closest("[data-a]"); if (!b || !H[b.dataset.a]) return; ev.preventDefault(); H[b.dataset.a](b.dataset); });
document.addEventListener("keydown", (ev) => {
  if (/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return; const s = A.se;
  if (A.route === "session" && s && s.cur) {
    if ((ev.key === " " || ev.key === "Enter") && !s.opts && !s.revealed) { ev.preventDefault(); H.reveal(); }
    else if (/^[1-4]$/.test(ev.key) && (s.revealed || (s.opts && s.sel != null))) gradeCard(+ev.key);
    else if (s.opts && s.sel == null && /^[a-eA-E]$/.test(ev.key)) { const i = ev.key.toLowerCase().charCodeAt(0) - 97; if (s.opts[i]) { s.sel = i; render(); } }
    else if (ev.key === "Enter" && s.opts && s.sel != null) { const right = s.opts[s.sel].ok; gradeCard(!right ? 1 : s.conf === 1 ? 2 : s.conf === 3 ? 4 : 3); }
  } else if (A.route === "rapid" && A.rap && !A.rap.end && /^[a-dA-D]$/.test(ev.key)) rapPick(ev.key.toLowerCase().charCodeAt(0) - 97);
  if (ev.key === "Escape" && EMBED && A.route === "home") H.close();
});
/* ------------------------------ start ------------------------------ */
(async function boot() {
  const d = await DB.init(); A.mode = d.mode; d.prog.forEach((p) => A.prog.set(p.id, p)); A.log = d.log; A.kv = d.kv || {}; A.set = Object.assign({}, DEF, A.kv.settings || {}); A.udecks = A.kv.udecks || [];
  await loadDecks(); summary();
  const r = (location.hash || "#/home").slice(2) || "home"; const sp = r.split("?")[0];
  A.route = "home"; render();
  if (sp.startsWith("deck:")) go(sp); else if (sp === "start") H.daily(); else if (["weak", "stats", "own", "settings"].includes(sp)) go(sp); else if (sp === "rapid") H.rapid(); else if (sp === "image") H.image(); else if (sp.startsWith("kind:")) H.kind({ k: sp.slice(5) });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js?v=1").catch(() => {});
})();
