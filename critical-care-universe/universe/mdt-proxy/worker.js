/* MDT proxy: a Cloudflare Worker that holds the model key so the page never does.
   The page (mdt-ask.js) posts { v, question, intent, specialists, patient } and gets back
   { specialists: [{ id, text }], consensus, actions: [{ label, order }] }.

   Secrets (wrangler secret put):   ANTHROPIC_API_KEY
   Variables (wrangler.toml [vars]): ALLOWED_ORIGIN = "https://apoorvabeats-cyber.github.io"   MODEL = "claude-sonnet-5-5"
   Nothing about a real patient ever reaches this. The case is simulated. */

const SPECS = ["intensivist", "pulmonologist", "cardiologist", "nephrologist", "infectious", "neurologist", "gastroenterologist", "surgeon", "pharmacologist"];
const ORDERS = ["examine", "lab:abg", "lab:lactate", "lab:cbc", "lab:kft", "lab:lyte", "lab:lft", "lab:coag", "lab:cultures", "lab:glucose", "lab:trop", "lab:pct", "lab:crp", "img:ecg", "img:cxr", "img:echo", "img:usg", "img:cthead", "img:ctchest", "img:ctabd", "img:ctpa", "proc:oxygen", "proc:hfnc", "proc:niv", "proc:intubate", "proc:prone", "proc:artline", "proc:cvc", "proc:foley", "proc:dialysis", "proc:hdline", "drug:fluids", "drug:norepi", "drug:vaso", "drug:dobut", "drug:steroid", "drug:calcium", "drug:insulindex", "drug:bicarb", "drug:furosemide", "drug:heparin", "abx:any"];

const SYSTEM = `You are the MDT Clinical Intelligence Engine inside a critical-care teaching simulator. The patient is SIMULATED. You speak for a multidisciplinary team in an ICU meeting.

You are given: the doctor's question, its intent (why, next, else, whatif, evaluate, missing, compare, stop, guidelines, calculate, challenge, explain, general), the specialists who should speak, and the live patient state (story, vitals, support, what has been given, results that are back, what is pending, recent conversation).

Rules:
1. Use ONLY the patient state you are given. Never invent a vital sign, a result or a history. If something is not known yet, say what would settle it. Do not guess the hidden diagnosis; reason as a team would at the bedside, with a differential.
2. Answer the question that was asked, in the intent that was asked. Be direct, clinical and brief. A specialist speaks only if they add something distinct; do not repeat each other. Between one and four specialists. The first is usually the intensivist.
3. NEVER state a drug dose, an infusion rate, a dilution, a preparation or a titration step, and never put a number with mg, mcg, g, units, mL/h or mg/kg. If asked for one, say it must come from a validated protocol or the pharmacist, and explain the principle instead (the choice of drug, the monitoring, the stop conditions). Ventilator and physiology targets (for example MAP above 65, plateau pressure under 30) are fine.
4. When asked about guidelines, name the guideline body and the principle, say that wording and version must be checked in the source, and never quote text.
5. Do not give orders as commands. Recommend, give the reason, and name what would change your mind. For a high-risk step (intubation, thrombolysis, ECMO, cardioversion, pericardiocentesis, surgery) say what must be in place first.
6. If the question is unsafe, ambiguous or outside critical care, say so in one line and ask one clarifying question.
7. Hinglish or Hindi questions get an answer in the same language mix, with English medical terms.
8. "Challenge me" or "is this correct" means: find the weakest point in the doctor's plan from the state you are given, and say it plainly. Do not flatter. Agree only where the numbers agree.
9. Output ONLY JSON, no prose around it:
{"specialists":[{"id":"<one of ${SPECS.join("|")}>","text":"<2 to 4 sentences>"}],"consensus":"<the MDT's answer in 2 to 4 sentences: what to do or think now, and what to reassess>","actions":[{"label":"<button text>","order":"<one of ${ORDERS.join(" | ")}>"}]}
"actions" is optional, at most 3, and only orders from that list. They become buttons; nothing runs until the doctor taps one.`;

const clip = (x, n) => String(x == null ? "" : x).slice(0, n);
const cors = (env, req) => { const o = req.headers.get("Origin") || ""; const ok = !env.ALLOWED_ORIGIN || o === env.ALLOWED_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o); return { "Access-Control-Allow-Origin": ok ? o || "*" : "null", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" }; };
const bad = (env, req, code, msg) => new Response(JSON.stringify({ error: msg }), { status: code, headers: { "Content-Type": "application/json", ...cors(env, req) } });

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req) });
    if (req.method !== "POST") return bad(env, req, 405, "POST only");
    const origin = req.headers.get("Origin") || "";
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return bad(env, req, 403, "origin not allowed");
    if (!env.ANTHROPIC_API_KEY) return bad(env, req, 500, "key not set");
    let b; try { b = await req.json(); } catch (e) { return bad(env, req, 400, "bad json"); }
    const q = clip(b.question, 600).trim(); if (!q) return bad(env, req, 400, "no question");
    const body = JSON.stringify({ question: q, intent: clip(b.intent, 20), specialists: (Array.isArray(b.specialists) ? b.specialists : []).filter((x) => SPECS.includes(x)).slice(0, 4), patient: b.patient || {} });
    if (body.length > 20000) return bad(env, req, 413, "too large");
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: env.MODEL || "claude-sonnet-5-5", max_tokens: 900, temperature: 0.3, system: SYSTEM, messages: [{ role: "user", content: body }] }) });
    if (!r.ok) return bad(env, req, 502, "model error " + r.status);
    const j = await r.json(), text = ((j.content || []).find((c) => c.type === "text") || {}).text || "";
    let out; try { out = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch (e) { return bad(env, req, 502, "model did not return json"); }
    out.specialists = (Array.isArray(out.specialists) ? out.specialists : []).filter((x) => x && SPECS.includes(x.id)).slice(0, 4).map((x) => ({ id: x.id, text: clip(x.text, 1200) }));
    out.consensus = clip(out.consensus, 1200);
    out.actions = (Array.isArray(out.actions) ? out.actions : []).filter((a) => a && ORDERS.includes(a.order)).slice(0, 3).map((a) => ({ label: clip(a.label, 40), order: a.order }));
    return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json", ...cors(env, req) } });
  },
};
