/* The hall's voice orders and its result screen.
     createOrders(): a microphone you hold (or tap), a stop button, the words as they are heard, the orders that were understood,
                     and an arrow that sends them to the room.
     createHud():    the LCD that wakes up when something changes: vitals that go wrong on the left, abnormal results on the right,
                     normal results along the top, each with its own alarm. */
import { parseOrders, toKind } from "./voice-orders.js?v=20261122e";
import { understand } from "./voice-brain.js?v=20261122e";
import { BY_ID } from "./order-catalogue.js?v=20261122e";

const css = `
#vc{position:fixed;z-index:7;left:50%;transform:translateX(-50%);bottom:calc(12px + env(safe-area-inset-bottom));width:min(760px,calc(100vw - 20px));display:grid;gap:7px;padding:10px 12px;border-radius:18px;background:linear-gradient(180deg,rgba(7,26,42,.93),rgba(3,14,24,.95));border:1px solid rgba(95,227,255,.38);box-shadow:0 0 28px rgba(95,227,255,.16),0 14px 40px rgba(0,0,0,.5);backdrop-filter:blur(10px);color:#dff6ff;font:13px/1.35 ui-sans-serif,system-ui,sans-serif}
#vc[hidden]{display:none}
#vc .vrow{display:flex;gap:9px;align-items:stretch}
#vc textarea{flex:1;min-height:46px;max-height:96px;resize:none;border-radius:12px;border:1px solid rgba(95,227,255,.28);background:rgba(2,10,18,.78);color:#eaffff;padding:9px 11px;font:inherit;font-size:14px;outline:none}
#vc textarea:focus{border-color:#5fe3ff;box-shadow:0 0 0 2px rgba(95,227,255,.18)}
#vc textarea.live{border-color:#ff6b7c;box-shadow:0 0 0 2px rgba(255,107,124,.2)}
#vc button{font:inherit;cursor:pointer;color:#dff6ff;touch-action:manipulation}
#mic{flex:none;width:58px;min-height:58px;border-radius:50%;border:2px solid #5fe3ff;background:radial-gradient(circle at 35% 30%,#19506b,#08202f);font-size:24px;line-height:1;position:relative;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;transition:transform .12s,background .2s,border-color .2s}
#mic svg{width:26px;height:26px;pointer-events:none;fill:none;stroke:#eaffff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#mic[data-on="1"]{border-color:#ff6b7c;background:radial-gradient(circle at 35% 30%,#a02a3d,#4a0f1a);transform:scale(1.06)}
#mic[data-on="1"]::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2px solid rgba(255,107,124,.55);animation:vping 1.1s ease-out infinite}
@keyframes vping{from{transform:scale(.88);opacity:.9}to{transform:scale(1.35);opacity:0}}
#vstop{flex:none;width:46px;border-radius:12px;border:1px solid #ff6b7c;background:rgba(160,42,61,.55);font-size:19px}
#vstop[hidden]{display:none}
#vsend{flex:none;width:54px;border-radius:12px;border:1px solid #5fe3ff;background:linear-gradient(180deg,#1b6f8e,#0c3b52);font-size:22px;font-weight:800}
#vsend:disabled{opacity:.35;cursor:default}
#vsend.ok{background:linear-gradient(180deg,#2c9e6a,#126043);border-color:#6df0b0}
#vchips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:0}
#vchips:empty{display:none}
#vchips .ch{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 10px;border-radius:999px;border:1px solid rgba(109,240,176,.55);background:rgba(18,88,64,.45);font-size:12.5px;font-weight:650;color:#e9fff5}
#vchips .ch.fz{border-color:rgba(255,194,74,.7);background:rgba(110,78,12,.4)}
#vchips .ch.cl{border-color:rgba(255,194,74,.7);background:rgba(90,64,10,.4)}
#vchips .ch small{font-weight:500;opacity:.7}
#vchips .ch button{border:0;background:rgba(255,255,255,.14);border-radius:50%;width:20px;height:20px;line-height:19px;padding:0;font-size:13px;color:#fff}
#vchips select{background:#06202f;color:#fff;border:1px solid rgba(255,194,74,.7);border-radius:8px;font:inherit;font-size:12px;padding:2px 4px}
#vchips .opt{border:1px solid rgba(255,194,74,.7);background:rgba(90,64,10,.4);border-radius:999px;padding:3px 10px;font-size:12px}
#vmeta{font-size:12px;color:#9fc3d4;min-height:0}
#vmeta:empty{display:none}
#vmeta b{color:#ffc24a;font-weight:650}
#vmeta .bad{color:#ff9aa6}
#rsl{position:fixed;inset:0;z-index:9;pointer-events:none;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#rsl .col{position:absolute;display:flex;flex-direction:column;gap:8px;top:calc(104px + env(safe-area-inset-top));width:min(300px,45vw)}
#rsl .L{left:10px;align-items:flex-start}
#rsl .R{right:10px;align-items:flex-end}
#rsl .T{position:absolute;left:50%;transform:translateX(-50%);top:calc(60px + env(safe-area-inset-top));display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:min(720px,94vw)}
#rsl .rc{pointer-events:auto;cursor:pointer;position:relative;width:100%;box-sizing:border-box;padding:9px 11px 9px 13px;border-radius:10px;background:linear-gradient(180deg,rgba(2,16,22,.94),rgba(3,22,28,.92));border:1px solid rgba(90,240,200,.5);box-shadow:0 0 16px rgba(60,230,190,.22),inset 0 0 22px rgba(60,230,190,.07);color:#cffff0;animation:rcIn .35s cubic-bezier(.2,.9,.3,1.2) both;overflow:hidden}
#rsl .rc::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);pointer-events:none}
#rsl .rc::after{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--a,#4fe3b0)}
#rsl .rc.out{animation:rcOut .4s ease-in both}
@keyframes rcIn{from{opacity:0;transform:translateY(-8px) scale(.94)}to{opacity:1;transform:none}}
@keyframes rcOut{to{opacity:0;transform:scale(.96)}}
#rsl .rc h5{margin:0 0 3px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--a,#4fe3b0);display:flex;justify-content:space-between;gap:8px}
#rsl .rc .big{font-size:25px;font-weight:800;letter-spacing:.02em;color:#fff;text-shadow:0 0 10px var(--a,#4fe3b0)}
#rsl .rc .big small{font-size:12px;font-weight:600;opacity:.8;margin-left:4px}
#rsl .rc p{margin:2px 0 0;font-size:11.5px;line-height:1.35;color:#bfece0;font-family:ui-sans-serif,system-ui,sans-serif}
#rsl .rc ul{list-style:none;margin:3px 0 0;padding:0;display:grid;gap:2px;font-size:12.5px}
#rsl .rc li{display:flex;justify-content:space-between;gap:8px}
#rsl .rc li b{color:#fff;white-space:nowrap}
#rsl .rc li small{opacity:.65;font-size:10.5px}
#rsl .rc.v{--a:#ffc24a;border-color:rgba(255,194,74,.65);box-shadow:0 0 18px rgba(255,194,74,.25),inset 0 0 22px rgba(255,194,74,.06)}
#rsl .rc.v.crit,#rsl .rc.r.crit{--a:#ff5b6e;border-color:rgba(255,91,110,.85);animation:rcIn .35s both,rcPulse 1.1s ease-in-out .4s infinite}
#rsl .rc.r{--a:#ff8a5c;border-color:rgba(255,138,92,.7);box-shadow:0 0 18px rgba(255,138,92,.25),inset 0 0 22px rgba(255,138,92,.06)}
#rsl .rc.n{--a:#4fe3b0;width:auto;padding:6px 12px 6px 14px;font-size:12px}
#rsl .rc.n h5{margin:0;display:inline-flex;gap:8px;font-size:11.5px;color:#7dffd0}
#rsl .rc.n span{opacity:.75;margin-left:6px;font-family:ui-sans-serif,system-ui,sans-serif}
@keyframes rcPulse{50%{box-shadow:0 0 30px rgba(255,91,110,.75),inset 0 0 26px rgba(255,91,110,.16)}}
@media(max-width:700px){#vc{padding:8px 9px}#mic{width:52px;min-height:52px}#rsl .col{top:calc(112px + env(safe-area-inset-top));width:46vw}#rsl .rc .big{font-size:21px}}
#vans{display:grid;gap:7px;max-height:min(42vh,340px);overflow:auto;overscroll-behavior:contain}
#vans:empty{display:none}
#vans .an{position:relative;padding:9px 34px 9px 14px;border-radius:12px;background:linear-gradient(180deg,rgba(2,16,22,.94),rgba(3,22,28,.92));border:1px solid rgba(95,227,255,.5);color:#d6f6ff;overflow:hidden;animation:rcIn .3s cubic-bezier(.2,.9,.3,1.2) both}
#vans .an::after{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--a,#5fe3ff)}
#vans .an.ok{--a:#4fe3b0;border-color:rgba(79,227,176,.55)}
#vans .an.warn{--a:#ffc24a;border-color:rgba(255,194,74,.65)}
#vans .an.crit{--a:#ff5b6e;border-color:rgba(255,91,110,.85);animation:rcIn .3s both,rcPulse 1.1s ease-in-out .4s infinite}
#vans .an.info{--a:#5fe3ff}
#vans .an h5{margin:0 0 2px;font:700 11px/1.2 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--a)}
#vans .an .big{font:800 26px/1.1 ui-monospace,Menlo,Consolas,monospace;color:#fff;text-shadow:0 0 10px var(--a)}
#vans .an .big small{font-size:12px;font-weight:600;opacity:.8;margin-left:6px;text-shadow:none}
#vans .an p{margin:2px 0 0;font-size:12.5px;line-height:1.4;color:#c4eef9}
#vans .an .x{position:absolute;right:6px;top:5px;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.12);font-size:14px;line-height:20px}
#vans .an .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#vans .an .acts button{border:1px solid var(--a);background:rgba(95,227,255,.1);border-radius:999px;padding:3px 11px;font-size:12px;font-weight:650}
#vans .an .acts button:hover{background:rgba(95,227,255,.25)}
#vchips .ch.q{border-color:rgba(95,227,255,.6);background:rgba(18,70,96,.5)}
#vchips .ch.sg{border-color:rgba(160,190,255,.55);background:rgba(40,52,110,.45);padding:4px 10px;cursor:pointer}
#vchips .ch.sg:hover{background:rgba(70,90,170,.55)}
#vchips .lead{font-size:12px;color:#9fc3d4}
#vspk{flex:none;width:38px;border-radius:12px;border:1px solid rgba(95,227,255,.4);background:rgba(8,32,47,.8);font-size:17px;padding:0}
#vspk[data-on="0"]{opacity:.5}
body.using #vc{display:none}
`;

const el = (tag, attrs, html) => { const e = document.createElement(tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (html != null) e.innerHTML = html; return e; };
const MIC = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';

export function createOrders({ post, sfx, esc, onSent, say, ctx, open }) {
  if (!document.getElementById("vc-style")) { const s = el("style", { id: "vc-style" }, css); document.head.appendChild(s); }
  const root = el("div", { id: "vc", hidden: "" });
  root.innerHTML = `<div id="vans" aria-live="polite"></div><div id="vchips"></div><div id="vmeta"></div><div class="vrow"><button id="mic" type="button" aria-label="Hold to talk, or tap to start and stop">${MIC}</button><button id="vstop" type="button" aria-label="Stop listening" hidden>■</button><textarea id="vtext" rows="2" spellcheck="false" placeholder="Speak or type: what is the BP? · is he hypotensive? · urine output · get an echo · start meropenem"></textarea><button id="vspk" type="button" aria-label="Speak the answers aloud" data-on="1">🔊</button><button id="vsend" type="button" aria-label="Send" disabled>➤</button></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s), mic = $("#mic"), stopB = $("#vstop"), text = $("#vtext"), ans = $("#vans"), spk = $("#vspk"), chips = $("#vchips"), meta = $("#vmeta"), sendB = $("#vsend");
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  let rec = null, wantOn = false, listening = false, locked = false, pressAt = 0, finalText = "", parsed = understand("", null), speak = true, removed = new Set(), choice = {}, extra = [], busyMsg = "";

  /* ---- what was heard, and what it means */
  function refresh() {
    parsed = understand(text.value, getCtx());
    const orders = current();
    chips.innerHTML = orders.map((o, i) => {
      if (o.choose) { const sel = choice[o.id] || o.id; return `<span class="ch fz" data-i="${i}">${esc(o.chooseWhy || "Choose")} <select data-i="${i}">${o.choose.map((c) => `<option value="${esc(c.id)}"${c.id === sel ? " selected" : ""}>${esc(c.label)}</option>`).join("")}</select><button type="button" data-rm="${esc(o.id)}" aria-label="Remove">×</button></span>`; }
      return `<span class="ch${o.fuzzy ? " fz" : ""}" title="heard: ${esc(o.heard || "")}">${esc(o.label)}${o.fuzzy ? " <small>?</small>" : ""}<button type="button" data-rm="${esc(o.id)}" aria-label="Remove ${esc(o.label)}">×</button></span>`;
    }).join("") + parsed.answers.filter((a) => a.id !== "noted").map((a) => `<span class="ch q" title="I will answer this when you press send">Asking: ${esc(a.title)}</span>`).join("") + parsed.clarify.map((c) => `<span class="ch cl">${esc(c.prompt)} ${c.options.map((o) => `<button type="button" class="opt" data-add="${esc(o.id)}">${esc(o.label.replace(/^CT /, ""))}</button>`).join("")}</span>`).join("");
    const bits = [];
    if (parsed.suggest.length && !orders.length && !parsed.answers.length) chips.innerHTML += `<span class="lead">Did you mean</span>` + parsed.suggest.map((x, i) => `<span class="ch sg" data-sg="${i}">${esc(x.label)}</span>`).join("");
    if (parsed.unknown.length && (orders.length || parsed.answers.length)) bits.push(`Also heard: <b>${esc(parsed.unknown.join(" ").slice(0, 80))}</b>`);
    if (parsed.negated.length) bits.push(`Left out as you said no: ${esc(parsed.negated.join(", "))}`);
    if (!SR) bits.push("This browser has no speech recognition. Type the order and press ➤.");
    if (busyMsg) bits.push(esc(busyMsg));
    meta.innerHTML = bits.join(" · ");
    sendB.disabled = !text.value.trim();
    return orders;
  }
  const getCtx = () => { try { return ctx ? ctx() : null; } catch (e) { return null; } };
  function current() {
    const base = parsed.orders.filter((o) => !removed.has(o.id) && !(o.id === "abx:any" && choice["abx:any"] && removed.has(choice["abx:any"])));
    const add = extra.filter((x) => !base.some((b) => b.id === x.id) && !removed.has(x.id));
    return base.concat(add);
  }
  text.addEventListener("input", () => { removed = new Set(); refresh(); });
  text.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  chips.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]"), add = e.target.closest("[data-add]"), sg = e.target.closest("[data-sg]");
    if (sg) { const x = parsed.suggest[+sg.dataset.sg]; if (x) { if (x.kind === "order" && x.id && BY_ID[x.id]) { extra.push({ id: x.id, label: BY_ID[x.id].label }); text.value = ""; refresh(); } else { text.value = x.label; refresh(); send(); } } return; }
    if (rm) { removed.add(rm.dataset.rm); refresh(); } else if (add) { const id = add.dataset.add; extra.push({ id, label: BY_ID[id].label }); refresh(); }
  });
  chips.addEventListener("change", (e) => { const s = e.target.closest("select"); if (s) { choice["abx:any"] = s.value; } });

  /* ---- listening */
  const setUi = (on) => { listening = on; mic.dataset.on = on ? "1" : "0"; stopB.hidden = !on; text.classList.toggle("live", on); };
  function pick(res) {                       // among the alternatives the engine offers, keep the one that makes the most sense as orders
    let best = res[0].transcript, bn = -1;
    for (let k = 0; k < res.length; k += 1) { const u = understand(res[k].transcript, getCtx()), n = u.orders.length + u.answers.length; if (n > bn) { bn = n; best = res[k].transcript; } }
    return best;
  }
  function start() {
    sfx && sfx.unlock && sfx.unlock();
    if (listening) return;
    if (!SR) { busyMsg = ""; refresh(); text.focus(); return; }
    finalText = text.value ? text.value.trim() + " " : "";
    try { rec = new SR(); } catch (e) { return; }
    rec.lang = "en-IN"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    rec.onresult = (e) => { let interim = ""; for (let i = e.resultIndex; i < e.results.length; i += 1) { const r = e.results[i]; if (r.isFinal) finalText += pick(r) + " "; else interim += r[0].transcript; } text.value = (finalText + interim).trim(); refresh(); };
    rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { wantOn = false; busyMsg = "The microphone is blocked. Allow it in the browser, then try again."; } else if (e.error === "audio-capture") { wantOn = false; busyMsg = "No microphone was found."; } else if (e.error === "network") { busyMsg = "Speech recognition needs the internet."; } refresh(); };
    rec.onend = () => { if (wantOn) { try { rec.start(); } catch (e) { wantOn = false; setUi(false); } } else { setUi(false); refresh(); } };
    wantOn = true; busyMsg = ""; try { rec.start(); setUi(true); sfx && sfx.beep && sfx.beep({ f: 740, vol: 0.12 }); } catch (e) { wantOn = false; setUi(false); }
  }
  function stop() { const was = listening; wantOn = false; locked = false; try { rec && rec.stop(); } catch (e) {} setUi(false); const o = refresh(); if (was && !o.length && parsed.answers.length && !root.dataset.busyAns) setTimeout(() => { if (!listening && text.value.trim() && !current().length && understand(text.value, getCtx()).answers.length) send(); }, 250); }
  mic.addEventListener("contextmenu", (e) => e.preventDefault());
  mic.addEventListener("pointerdown", (e) => { e.preventDefault(); try { mic.setPointerCapture(e.pointerId); } catch (x) {} if (listening && locked) { stop(); pressAt = 0; return; } pressAt = Date.now(); start(); });
  const release = () => { if (!pressAt) return; const held = Date.now() - pressAt; pressAt = 0; if (!listening) return; if (held > 450) stop(); else locked = true; };
  mic.addEventListener("pointerup", release); mic.addEventListener("pointercancel", release);
  mic.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (listening) stop(); else { locked = true; start(); } } });
  stopB.addEventListener("click", stop);

  /* ---- answering */
  const dismiss = (n) => { if (!n.isConnected) return; n.remove(); };
  function say1(list) {
    if (!speak || !list.length || typeof speechSynthesis === "undefined") return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(list.map((a) => a.spoken != null ? a.spoken : a.title).filter(Boolean).slice(0, 3).join(" ")); u.lang = "en-IN"; u.rate = 1.02; if (u.text.trim()) speechSynthesis.speak(u); } catch (e) {}
  }
  function showAnswers(list, sug) {
    list.forEach((a) => {
      ans.querySelectorAll(`[data-id="${CSS.escape(a.id)}"]`).forEach(dismiss);
      const n = el("div", { class: "an " + (a.tone || "info"), "data-id": a.id });
      n.innerHTML = `<h5>${esc(a.title)}</h5>${a.big != null ? `<div class="big">${esc(String(a.big))}${a.unit ? `<small>${esc(a.unit)}</small>` : ""}</div>` : ""}${(a.lines || []).map((l) => `<p>${esc(l)}</p>`).join("")}${a.note ? `<p><i>${esc(a.note)}</i></p>` : ""}<button class="x" type="button" aria-label="Close">×</button>` +
        ((a.actions && a.actions.length) || a.section || (sug && sug.length) ? `<div class="acts">${(a.actions || []).map((x, i) => `<button type="button" data-act="${i}">${esc(x.label)}</button>`).join("")}${a.section && open ? `<button type="button" data-open="1">Open ▸</button>` : ""}${(sug || []).map((x, i) => `<button type="button" data-sg="${i}">${esc(x.label)}</button>`).join("")}</div>` : "");
      n.querySelector(".x").onclick = () => dismiss(n);
      n.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.act != null) { const x = a.actions[+b.dataset.act]; if (x && x.order) { post("hall-orders", { orders: [toKind({ id: x.order })] }); sfx && sfx.beep && sfx.beep({ f: 988, vol: 0.14 }); b.disabled = true; b.textContent = "Sent ✓"; } }
        else if (b.dataset.open) { open && open(a.section); }
        else if (b.dataset.sg != null) { const x = sug[+b.dataset.sg]; if (x) { if (x.kind === "order" && x.id && BY_ID[x.id]) { post("hall-orders", { orders: [toKind({ id: x.id })] }); b.disabled = true; b.textContent = "Sent ✓"; } else { dismiss(n); text.value = x.label; send(); } } }
      });
      ans.prepend(n); while (ans.children.length > 4) ans.lastChild.remove();
      setTimeout(() => dismiss(n), a.tone === "crit" ? 45000 : 28000);
    });
    ans.scrollTop = 0;
  }
  spk.addEventListener("click", () => { speak = !speak; spk.dataset.on = speak ? "1" : "0"; try { localStorage.setItem("ccu-voice-speak", speak ? "1" : "0"); } catch (e) {} if (!speak) { try { speechSynthesis.cancel(); } catch (e) {} } });
  try { if (localStorage.getItem("ccu-voice-speak") === "0") { speak = false; spk.dataset.on = "0"; } } catch (e) {}
  if (typeof speechSynthesis === "undefined") spk.hidden = true;

  /* ---- sending */
  function send() {
    if (!text.value.trim()) return;
    const busy = root.dataset.busy === "1", orders = refresh(), b = parsed;
    if (listening) stop();
    if (orders.length && busy) { busyMsg = "The room is busy. Press ➤ again in a moment to send the orders."; refresh(); return; }
    if (orders.length) {
      const list = orders.map((o) => { const id = o.choose && choice[o.id] ? choice[o.id] : o.id; return toKind({ id, specialty: o.specialty }); });
      post("hall-orders", { orders: list });
    }
    const names = orders.map((o) => (o.choose && choice[o.id] ? BY_ID[choice[o.id]].label : o.label));
    let shown = b.answers.filter((a) => a.id !== "noted");
    if (!orders.length && !shown.length && !b.answers.length) {
      const sg = b.suggest.length ? b.suggest : [{ kind: "ask", label: "What is the blood pressure?" }, { kind: "ask", label: "How is the patient now?" }, { kind: "ask", label: "What should we do next?" }];
      shown = [{ id: "help", title: "I can answer or do that. Which did you mean?", lines: ["Ask about a vital sign, a result or a condition, or give an order."], tone: "info", spoken: "Which of these did you mean?" }];
      showAnswers(shown, sg);
    } else showAnswers(shown, null);
    if (shown.length) say1(shown);
    sendB.classList.add("ok"); setTimeout(() => sendB.classList.remove("ok"), 1400);
    text.value = ""; finalText = ""; removed = new Set(); choice = {}; extra = []; parsed = understand("", null);
    busyMsg = names.length ? "Sent: " + names.join(", ") : ""; refresh(); if (busyMsg) setTimeout(() => { busyMsg = ""; refresh(); }, 4200);
    sfx && sfx.beep && sfx.beep({ f: 988, vol: 0.14 }); names.length && onSent && onSent(names);
  }
  sendB.addEventListener("click", send);
  refresh();
  return { show(on) { root.hidden = !on; }, setBusy(b) { root.dataset.busy = b ? "1" : "0"; refresh(); }, hear(t) { text.value = t; finalText = t + " "; removed = new Set(); refresh(); }, send, el: root, get listening() { return listening; }, get supported() { return !!SR; }, say };
}

/* ====================================================================================== the result screen */
const VT = [
  { k: "spo2", name: "SpO₂", unit: "%", lvl: (v) => (v < 90 ? 2 : v < 94 ? 1 : 0), step: 3, note: (l, v) => (l > 1 ? "Below 90%: severe hypoxaemia" : "Below 94%: falling oxygenation"), good: (v) => v >= 94 },
  { k: "map", name: "MAP", unit: "mmHg", lvl: (v) => (v < 55 ? 2 : v < 65 ? 1 : 0), step: 8, note: (l) => (l > 1 ? "Below 55: organs are not perfused" : "Below 65: the pressure is low"), good: (v) => v >= 65 },
  { k: "hr", name: "Heart rate", unit: "/min", lvl: (v) => (v > 140 || v < 40 ? 2 : v > 120 || v < 50 ? 1 : 0), step: 14, note: (l, v) => (v < 50 ? "Bradycardia" : v > 140 ? "Severe tachycardia" : "Tachycardia"), good: (v) => v >= 50 && v <= 120 },
  { k: "rr", name: "Resp rate", unit: "/min", lvl: (v) => (v > 35 || v < 8 ? 2 : v > 28 || v < 10 ? 1 : 0), step: 6, note: (l, v) => (v < 10 ? "Breathing too slowly" : "Tachypnoea: working hard to breathe"), good: (v) => v >= 10 && v <= 28 },
  { k: "gcs", name: "GCS", unit: "", lvl: (v) => (v <= 8 ? 2 : v <= 12 ? 1 : 0), step: 2, note: (l) => (l > 1 ? "GCS 8 or less: protect the airway" : "Falling consciousness"), good: (v) => v >= 13 },
  { k: "temp", name: "Temperature", unit: "°C", lvl: (v) => (v > 40 || v < 34 ? 2 : v > 38.5 || v < 35.5 ? 1 : 0), step: 0.8, note: (l, v) => (v < 35.5 ? "Hypothermia" : "Fever"), good: (v) => v >= 35.5 && v <= 38.5 },
];

export function createHud({ sfx, esc, open }) {
  if (!document.getElementById("vc-style")) document.head.appendChild(el("style", { id: "vc-style" }, css));
  const root = el("div", { id: "rsl" }, '<div class="T"></div><div class="col L"></div><div class="col R"></div>');
  document.body.appendChild(root);
  const T = root.querySelector(".T"), Lc = root.querySelector(".L"), Rc = root.querySelector(".R");
  const lastV = {}, seen = new Set(); let init = false, lastArrestRing = 0, lastDeath = false, quiet = false;
  function card(host, cls, html, ttl, key, onClick) {
    if (key) host.querySelectorAll(`[data-key="${key}"]`).forEach((n) => n.remove());
    const c = el("div", { class: "rc " + cls, "data-key": key || "" }, html);
    c.addEventListener("click", () => { if (onClick) onClick(); gone(c); });
    host.prepend(c); while (host.children.length > (host === T ? 4 : 4)) host.lastChild.remove();
    if (ttl) setTimeout(() => gone(c), ttl);
    return c;
  }
  function gone(c) { if (!c.isConnected) return; c.classList.add("out"); setTimeout(() => c.remove(), 380); }
  const arrow = (i) => (i.dir === "high" ? "▲" : "▼");
  const short = (t) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > 150 ? s.slice(0, 147) + "…" : s; };

  function vitals(P) {
    let top = 0;
    const note = (l) => { top = Math.max(top, l); };
    for (const d of VT) {
      const v = P[d.k]; if (v == null) continue;
      const lvl = P.alive === false || (P.rhythm && P.rhythm !== "sinus") ? 0 : d.lvl(v), was = lastV[d.k];
      if (!was) { lastV[d.k] = { lvl, v, at: Date.now() }; if (lvl && init === false) { card(Lc, "v" + (lvl > 1 ? " crit" : ""), vhtml(d, v, null, lvl), 16000, "v-" + d.k); } continue; }
      const worse = d.k === "spo2" || d.k === "map" || d.k === "gcs" ? was.v - v >= d.step : Math.abs(v - was.v) >= d.step && (d.k === "temp" ? v > was.v : true);
      if (lvl > was.lvl || (lvl > 0 && lvl === was.lvl && worse && Date.now() - was.at > 25000)) {
        lastV[d.k] = { lvl, v, at: Date.now() }; note(lvl + (lvl > 1 ? 1 : 0));
        card(Lc, "v" + (lvl > 1 ? " crit" : ""), vhtml(d, v, was.v, lvl), lvl > 1 ? 30000 : 18000, "v-" + d.k, () => open && open("vitals"));
      } else if (lvl === 0 && was.lvl > 0) {
        lastV[d.k] = { lvl, v, at: Date.now() };
        Lc.querySelectorAll(`[data-key="v-${d.k}"]`).forEach(gone);
        card(T, "n", `<h5>✓ ${esc(d.name)}</h5><span>back to ${esc(String(Math.round(v * 10) / 10))} ${esc(d.unit)}</span>`, 7000, "n-" + d.k);
      } else { lastV[d.k].v = lvl === was.lvl ? was.v : v; if (lvl < was.lvl) lastV[d.k].lvl = lvl; }
    }
    return top;
  }
  const vhtml = (d, v, was, lvl) => `<h5><span>${esc(d.name)}</span><span>${lvl > 1 ? "CRITICAL" : "ALERT"}</span></h5><div class="big">${esc(String(Math.round(v * 10) / 10))}<small>${esc(d.unit)}</small></div><p>${was != null ? (v < was ? "▼ " : "▲ ") + "from " + esc(String(Math.round(was * 10) / 10)) + ". " : ""}${esc(d.note(lvl, v))}</p>`;

  function results(P) {
    let level = 0;
    for (const r of P.results || []) {
      const key = r.id + "|" + r.readyAtMs; if (seen.has(key)) continue; seen.add(key);
      if (!init) continue;                                   // what was already there when the room opened
      const sec = () => open && open("invest");
      if (r.abnormal) {
        const bad = (r.items || []).filter((i) => i.abn), crit = bad.some((i) => i.k === "k" && (i.v > 6.5 || i.v < 3) || i.k === "lactate" && i.v >= 4 || i.k === "ph" && (i.v < 7.2) || i.k === "hb" && i.v < 7 || i.k === "trop" && i.v > 200);
        let body;
        if (bad.length) { const ok = (r.items || []).length - bad.length; body = `<ul>${bad.slice(0, 5).map((i) => `<li><span>${esc(i.label)}</span><b>${esc(i.text)} ${esc(i.unit)} ${arrow(i)}</b></li>`).join("")}</ul>${bad.length > 5 ? `<p>+${bad.length - 5} more abnormal</p>` : ""}${ok ? `<p>${ok} normal</p>` : ""}`; }
        else body = `<p>${esc(short(r.text))}</p>`;
        card(Rc, "r" + (crit ? " crit" : ""), `<h5><span>${esc(r.label)}</span><span>${crit ? "CRITICAL" : "ABNORMAL"}</span></h5>${body}`, crit ? 30000 : 22000, "r-" + key, sec);
        level = Math.max(level, crit ? 3 : 2);
      } else {
        const summary = (r.items || []).length ? "all values normal" : short(r.text).slice(0, 70);
        card(T, "n", `<h5>✓ ${esc(r.label)}</h5><span>${esc(summary)}</span>`, 8000, "n-" + key, sec);
        level = Math.max(level, 1);
      }
    }
    return level;
  }

  return {
    onPatient(P) {
      if (!P) return;
      const v = vitals(P), r = results(P), now = Date.now();
      if (P.alive === false && !lastDeath) { lastDeath = true; card(Lc, "v crit", `<h5><span>Patient</span><span>NO CIRCULATION</span></h5><div class="big">Died</div><p>Open the board to see what was missed.</p>`, 0, "arrest"); sfx.alert && sfx.alert(2); }
      else if (P.alive && P.rhythm && P.rhythm !== "sinus") { if (now - lastArrestRing > 20000) { lastArrestRing = now; card(Lc, "v crit", `<h5><span>Cardiac arrest</span><span>ACLS</span></h5><div class="big">${esc((P.rhythm || "").toUpperCase())}</div><p>No pulse. Compressions, adrenaline${P.rhythm === "vf" ? ", shock" : ""}.</p>`, 0, "arrest"); sfx.alert && sfx.alert(2); } }
      else if (P.alive && Lc.querySelector('[data-key="arrest"]')) { Lc.querySelectorAll('[data-key="arrest"]').forEach(gone); lastArrestRing = 0; }
      if (init && !quiet) { if (v >= 2) sfx.alert && sfx.alert(2); else if (v === 1) sfx.alert && sfx.alert(1); if (r >= 3) { sfx.alert && sfx.alert(2); } else if (r === 2) { sfx.alert && sfx.alert(1); sfx.chime && setTimeout(() => sfx.chime("lab"), 420); } else if (r === 1 && !v) sfx.chime && sfx.chime("find"); }
      init = true;
    },
    mute(b) { quiet = !!b; },
    clear() { Lc.innerHTML = ""; Rc.innerHTML = ""; T.innerHTML = ""; },
    el: root,
  };
}
