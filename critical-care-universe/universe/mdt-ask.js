/* The MDT Clinical Intelligence Engine: the client.

   Patient context -> the doctor's question -> the model (through a small proxy) -> specialist opinions -> an answer with buttons.
   If the proxy is not set, or it is slow, or it fails, the built-in team answers instead (voice-brain teamCards). The room is never silent.

   What the model is allowed to see: only what the room has seen. The vitals, the story as told, the results that are back, what has
   been given. Never the diagnosis, never the case's own list of steps, never a lab that has not come back.
   What the model is not allowed to say: doses, rates, dilutions. Those come from a validated protocol. The system prompt forbids them
   and cleanDoses() below removes them if one slips through.
   An action the model suggests is a button. It is never done until a doctor taps it. */
import { BY_ID } from "./order-catalogue.js?v=20261125a";

const SPEC_LABEL = { intensivist: "Intensivist", pulmonologist: "Pulmonologist", cardiologist: "Cardiologist", nephrologist: "Nephrologist", neurologist: "Neurologist", infectious: "Infectious disease", gastroenterologist: "Gastroenterologist", surgeon: "Surgeon", pharmacologist: "Clinical pharmacologist" };
const KEY = "ccu-mdt-url";

/* where the proxy lives: ?mdt=https://... (remembered), or window.CCU_MDT_URL, or a saved value. ?mdt=off clears it. */
export function endpoint() {
  try {
    const q = new URLSearchParams(location.search).get("mdt");
    if (q === "off" || q === "") { if (q === "off") localStorage.removeItem(KEY); }
    else if (q && /^https:\/\/|^http:\/\/localhost|^http:\/\/127\.0\.0\.1/.test(q)) { localStorage.setItem(KEY, q); return q; }
  } catch (e) { /* storage may be blocked */ }
  try { if (typeof window !== "undefined" && window.CCU_MDT_URL) return String(window.CCU_MDT_URL); } catch (e) {}
  try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
}

/* ---------------------------------------------------------------- what the model may see */
export function safeContext(ctx, history) {
  const P = (ctx && ctx.P) || {}, vit = {};
  for (const k of ["hr", "sbp", "dbp", "map", "spo2", "rr", "gcs", "temp", "uo"]) if (P[k] != null && Number.isFinite(+P[k])) vit[k] = +P[k];
  const given = Object.entries(P.given || {}).map(([id, n]) => ({ order: (BY_ID[id] || {}).label || id, times: n })).filter((x) => x.order && !/^(examine|call)$/.test(x.order));
  const results = ((P.results) || []).slice(-16).map((r) => ({ test: r.label, result: String(r.text || "").slice(0, 400), abnormal: !!r.abnormal }));
  return {
    story: (ctx && ctx.story && ctx.story.text) || "",
    minutes: Math.floor((P.elapsedMs || 0) / 60000),
    vitals: vit,
    rhythm: P.rhythm || "sinus", alive: P.alive !== false,
    support: { ventilated: !!P.tube, oxygen: !!P.oxygen, vasopressor: !!P.norepi, arterialLine: !!P.artLine, dialysisCatheter: !!P.hdLine, dialysisRunning: !!P.dialysis },
    fluidGivenMl: P.fluidMl || 0,
    given, results,
    pending: ((P.pending) || []).map((x) => x.label),
    specialistsPresent: ((ctx && ctx.team) || []).map((m) => m.specialty).filter(Boolean),
    history: (history || []).slice(-6),
  };
}

/* ---------------------------------------------------------------- the dose filter */
const DOSE = [/\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ug|g|iu|units?)\b/i, /\b(?:mg|mcg|µg|ug|units?|g)\s?\/\s?(?:kg|h|hr|hour|min|day|dose)\b/i, /\b\d+(?:[.,]\d+)?\s?(?:ml|mL)\s?\/\s?(?:h|hr|hour|min)\b/i, /\b(?:loading|maintenance|bolus) dose of \d/i, /\bover \d+\s?(?:min|minutes|hours?|h)\b/i];
const NODOSE = "[dose removed: use your validated protocol or the pharmacist]";
export function cleanDoses(text) {
  let removed = 0;
  const out = String(text || "").split(/(?<=[.!?])\s+|\n+/).map((s) => { if (DOSE.some((re) => re.test(s))) { removed += 1; return NODOSE; } return s; }).filter((s, i, a) => !(s === NODOSE && a[i - 1] === NODOSE)).join(" ");
  return { text: out, removed };
}

/* ---------------------------------------------------------------- the call */
const clip = (s, n) => String(s == null ? "" : s).slice(0, n);
export async function askModel(question, intentKey, specs, ctx, history, opts) {
  const url = (opts && opts.url) || endpoint(); if (!url) return null;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), (opts && opts.timeoutMs) || 20000);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ v: 1, question: clip(question, 600), intent: intentKey, specialists: specs, patient: safeContext(ctx, history) }), signal: ctl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    return normalise(j);
  } catch (e) { return null; } finally { clearTimeout(t); }
}

/* what comes back is data: shape it, clean it, and let only known orders become buttons */
export function normalise(j) {
  if (!j || typeof j !== "object") return null;
  let removed = 0;
  const fix = (s) => { const c = cleanDoses(clip(s, 1400)); removed += c.removed; return c.text; };
  const specialists = (Array.isArray(j.specialists) ? j.specialists : []).slice(0, 4).map((x) => ({ id: SPEC_LABEL[x && x.id] ? x.id : "intensivist", text: fix(x && x.text) })).filter((x) => x.text.trim());
  const consensus = fix(j.consensus);
  const actions = (Array.isArray(j.actions) ? j.actions : []).filter((a) => a && BY_ID[a.order]).slice(0, 3).map((a) => ({ label: clip(a.label || BY_ID[a.order].label, 40), order: a.order }));
  if (!specialists.length && !consensus.trim()) return null;
  return { specialists, consensus, actions, removed };
}

/* the model's answer as cards the room already knows how to show */
export function cardsFromModel(res, intentLabel) {
  const cards = [], ttl = 120000;
  res.specialists.forEach((x) => cards.push({ id: "mdt:m:" + x.id, title: SPEC_LABEL[x.id], lines: x.text.split(/\n+/).map((l) => l.trim()).filter(Boolean), tone: "info", who: x.id, ttl, spoken: "" }));
  const lastNote = "Teaching aid on a simulated patient. Not clinical advice." + (res.removed ? " Doses were removed: use your validated protocol." : "");
  cards.push({ id: "mdt:m:consensus", title: "MDT consensus" + (intentLabel ? ": " + intentLabel : ""), lines: res.consensus.split(/\n+/).map((l) => l.trim()).filter(Boolean), tone: "ok", actions: res.actions, note: lastNote, ttl, spoken: res.consensus.split(/(?<=[.!?])\s/).slice(0, 2).join(" ") });
  return cards;
}
