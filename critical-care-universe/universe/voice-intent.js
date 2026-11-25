/* What a doctor means, as distinct from the words that happen to be in the sentence.
   Layer 3 of the MDT voice engine (intent) and the meeting itself (layer 5, the part that is talk, not orders).

     "Should we intubate?"            a question   -> answered, nothing ordered
     "We may need intubation."        a thought    -> noted
     "Prepare for intubation."        preparation  -> ready, not done
     "Intubate the patient."          an order     -> goes on, and a risky one asks to be confirmed
     "I don't think we should ..."    a negative opinion  /  "Do not give fluids."  a prohibition
     "What if we give fluids?"        a hypothetical      /  "No, go back to the previous setting."  a reversal

   Only an order reaches the order parser. Everything else is held, said back in plain words, and offered as a button.
   It also runs the meeting: "ask the intensivist", "call all specialists", "summarise the discussion", "assign tasks".
   No network, no model. The opinions of the specialists are worked out from the patient's numbers and are teaching aids, not advice. */
import { parseOrders } from "./voice-orders.js?v=20261125a";
import { BY_ID } from "./order-catalogue.js?v=20261125a";

/* ---------------------------------------------------------------- risk */
export const HIGH_RISK = new Set(["proc:intubate", "proc:ecmo", "proc:pericard", "proc:evd", "proc:chestdrain", "proc:cardioversion", "proc:pacing", "proc:source", "proc:cath", "proc:trach", "proc:tips", "proc:balloon", "drug:alteplase", "drug:kcl", "drug:anaesthetic", "drug:mtp", "drug:adrenaline", "drug:amiodarone", "shock"]);
export const isHigh = (id) => HIGH_RISK.has(id);

/* ---------------------------------------------------------------- Hinglish: the Hindi frame around English medical words */
const HVERBS = [
  [/\b(?:shuru karo|shuru kijiye|chalu karo|chalu kijiye|laga do|lagao|lagana|lagaiye|lagado|laga dijiye)\b/, "start"],
  [/\b(?:band karo|band kar do|bandh karo|rok do|roko|rokiye|band kijiye)\b/, "stop"],
  [/\b(?:badhao|badha do|badhaiye|badha dijiye|zyada karo|jyada karo)\b/, "increase"],
  [/\b(?:kam karo|kam kar do|ghatao|ghata do|ghataiye|kam kijiye)\b/, "reduce"],
  [/\b(?:bulao|bula lo|bula do|bulaiye|bulao na)\b/, "call"],
  [/\b(?:dikhao|dikha do|dikhaiye|dikhana)\b/, "show"],
  [/\b(?:batao|bata do|bataiye|batana)\b/, "tell me"],
  [/\b(?:bhejo|bhej do|bhejiye|bhejna)\b/, "send"],
  [/\b(?:de do|dena|dijiye|de dijiye|de dena|do na)\b/, "give"],
  [/\b(?:dekho|dekhiye|dekh lo|check kar lo)\b/, "check"],
  [/\b(?:karo|kar do|kijiye|kar dijiye|karna|karein)\b/, "do"],
];
const HPHRASE = [
  [/\bpatient ki halat kharab\b|\bmareez ki halat kharab\b|\bhalat kharab (?:ho rahi|hai)\b/g, "the patient is deteriorating"],
  [/\b(\w+) gir (?:raha|rahi|rahe) hai\b/g, "$1 is falling"],
  [/\b(\w+) badh (?:raha|rahi|rahe) hai\b/g, "$1 is rising"],
  [/\b(\w+) kam (?:ho raha|ho rahi|ho gaya|ho gayi) hai\b/g, "$1 has fallen"],
  [/\b(\w+) badh gaya hai\b/g, "$1 has risen"],
  [/\bpeshab (?:nahi|nahin) aa raha\b|\bpeshab band\b|\burine (?:nahi|nahin) aa raha\b/g, "there is no urine output"],
  [/\bpeshab kam\b|\bpishab kam\b/g, "urine output has fallen"],
  [/\bsaans (?:phool|phul) raha\b|\bsaans lene mein takleef\b|\bsaans ki takleef\b/g, "respiratory distress"],
  [/\bbehosh\b/g, "unconscious"], [/\bbukhar\b/g, "fever"], [/\bkhoon ki jaanch\b|\bkhoon ka test\b/g, "blood tests"],
  [/\bgurde ka doctor\b|\bkidney ka doctor\b/g, "nephrologist"], [/\bdil ka doctor\b|\bheart ka doctor\b/g, "cardiologist"], [/\bphephde ka doctor\b|\bchest ka doctor\b/g, "pulmonologist"], [/\bdimaag ka doctor\b/g, "neurologist"],
  [/\bmareez\b|\bmarij\b/g, "patient"], [/\bdawai\b|\bdawa\b/g, "medication"], [/\bpani\b/g, "fluid"], [/\bsaans\b/g, "breathing"], [/\bpeshab\b|\bpishab\b/g, "urine"],
];
const HNEG = /\b(?:mat|nahi|nahin|na dena|bilkul nahi)\b/;
const HHINT = /\b(?:karo|kar do|kijiye|kar dijiye|karna|karein|lagao|laga do|lagana|lagaiye|lagado|bulao|bula lo|bula do|bulaiye|dikhao|dikha do|batao|bata do|bataiye|bhejo|bhej do|bhejiye|badhao|badha do|kam karo|ghatao|dena|de do|dijiye|de dijiye|dekho|dekhiye|chalu karo|shuru karo|band karo|rok do|roko|mat|nahi|nahin|hai|raha|rahi|ko|ka|ki|ke|kya|kitna|kitni|abhi|pehle|baad mein)\b/;
export function hinglish(text) {
  let t = String(text || ""); const low = " " + t.toLowerCase() + " ";
  if (!HHINT.test(low)) return t;
  t = low.replace(/[‘’`´]/g, "'");
  for (const [re, to] of HPHRASE) t = t.replace(re, to);
  t = t.replace(/\b(mat|nahi|nahin)\s+(?:do|de|dena|dijiye|dijiyega)\b/g, "$1 de do");
  const neg = HNEG.test(t);
  t = t.replace(HNEG, " ");
  for (const [re, verb] of HVERBS) {
    const m = re.exec(t); if (!m) continue;
    const before = t.slice(0, m.index).replace(/\b(?:ko|ka|ki|ke|ab|abhi|ye|yeh|is|isko|usko|aap|please|plz)\b/g, " ").replace(/\s+/g, " ").trim(), after = t.slice(m.index + m[0].length).trim();
    t = (neg ? "do not " : "") + verb + " " + before + " " + after; break;
  }
  t = t.replace(/\b(?:ko|ka|ki|ke|kya|hai|hain|toh|to|na|bhi|abhi|ab|zara|jaldi)\b/g, " ").replace(/\bkitna\b|\bkitni\b/g, "how much").replace(/\bpehle\b/g, "first").replace(/\bbaad mein\b/g, "later");
  return t.replace(/\s+/g, " ").trim();
}

/* ---------------------------------------------------------------- the specialists */
export const SPEC_LABEL = { intensivist: "Intensivist", pulmonologist: "Pulmonologist", cardiologist: "Cardiologist", nephrologist: "Nephrologist", neurologist: "Neurologist", infectious: "Infectious disease", gastroenterologist: "Gastroenterologist", surgeon: "Surgeon" };
const SP = [
  ["intensivist", ["intensivist", "intensivists", "icu doctor", "icu consultant", "critical care", "intensive care"]],
  ["nephrologist", ["nephrologist", "nephrology", "nephro", "renal", "kidney specialist", "kidney doctor", "kidney team"]],
  ["cardiologist", ["cardiologist", "cardiology", "cardio", "heart specialist", "heart doctor", "cardiac team"]],
  ["pulmonologist", ["pulmonologist", "pulmonology", "pulmo", "chest physician", "lung specialist", "lung doctor", "respiratory physician", "respiratory"]],
  ["neurologist", ["neurologist", "neurology", "neuro", "neurosurgeon", "neurosurgery"]],
  ["infectious", ["infectious disease", "infectious diseases", "infectious", "id specialist", "id doctor", "id team", "id consultant", "microbiologist", "microbiology"]],
  ["gastroenterologist", ["gastroenterologist", "gastroenterology", "gastro", "hepatologist", "hepatology", "gi specialist", "gi doctor", "gi team"]],
  ["surgeon", ["surgeon", "surgeons", "surgery", "surgical team", "surgical"]],
];
const SPRE = SP.map(([id, ws]) => [id, new RegExp("\\b(?:" + ws.slice().sort((a, b) => b.length - a.length).join("|") + ")\\b")]);
export function findSpec(n) { for (const [id, re] of SPRE) if (re.test(n)) return id; return null; }
const SPSTART = SP.map(([id, ws]) => [id, new RegExp("^(?:hey |ok |okay |so |and |dr |doctor )?(?:" + ws.slice().sort((a, b) => b.length - a.length).join("|") + ")\\b[ ,]*")]);
const specStart = (n) => { for (const [id, re] of SPSTART) { const m = re.exec(n); if (m) return { sp: id, rest: n.slice(m[0].length).trim() }; } return null; };

/* ---------------------------------------------------------------- the meeting's memory (one case at a time) */
const M = { key: null, paused: false, turn: null, cursor: 0, asked: {}, said: {}, notes: [], disagree: [], counts: {} };
/* how many times a hint has been asked for. Typing a line and previewing it must not count: only a sent line (ctx.commit) does. */
export function tier(key, ctx, reset) { if (reset) { M.counts[key] = 0; return 0; } const n = (M.counts[key] || 0) + 1; if (ctx && ctx.commit) M.counts[key] = n; return n; }
const mstate = (ctx) => { const k = (ctx.story && ctx.story.text) || "·"; if (M.key !== k) Object.assign(M, { key: k, paused: false, turn: null, cursor: 0, asked: {}, said: {}, notes: [], disagree: [], counts: {} }); return M; };
export const resetMeeting = () => { M.key = null; };

/* ---------------------------------------------------------------- reading a sentence */
const norm = (s) => " " + String(s || "").toLowerCase().replace(/[‘’`´]/g, "'").replace(/\blet's\b/g, "lets").replace(/\b(what|who|how|that|it|he|she|there|where|when|here)'s\b/g, "$1 is").replace(/\bcan't\b/g, "can not").replace(/\bwon't\b/g, "will not").replace(/n't\b/g, " not").replace(/\bcannot\b/g, "can not").replace(/'s\b/g, "").replace(/[^a-z0-9? ]/g, " ").replace(/\s+/g, " ").trim() + " ";
const trim = (s) => s.trim();
const SPLIT_BEFORE = /(?<!,)\s+(?<!\b(?:think|feel|believe|suggest|recommend|say|said|that|if|but)\s)(?=(?:i think|i feel|i believe|in my opinion|we should|should we|what if|can we|could we|do we need|prepare for|get ready for|let us reconsider|lets reconsider|i disagree|i dont think|i don't think|i do not think)\b)/i;
export function sentences(t) {
  const parts = String(t || "").split(/(?<=[.?!])\s+|[\n;]+/).flatMap((x) => x.split(SPLIT_BEFORE)).map((x) => x.trim()).filter(Boolean), out = [];
  for (let i = 0; i < parts.length; i += 1) { const ss = specStart(norm(parts[i]).trim()); if (ss && !ss.rest && i + 1 < parts.length) { out.push(parts[i] + " " + parts[i + 1]); i += 1; } else out.push(parts[i]); }
  return out;
}

const RE = {
  reverse: /\b(?:go back|going back|revert|roll ?back|undo|take that back|scratch that|ignore that|never ?mind|cancel that|reverse that|previous setting|previous settings|previous dose|previous rate|as before|like before|back to previous)\b/,
  hypo: /\b(?:what if|what happens if|what would happen|what will happen|suppose|supposing|in case we|if we were to|would it help if|would it be useful if|how would (?:he|she|the patient) respond)\b|^if /,
  prohibit: /^(?:please |kindly |and |also |now )*(?:do not|never|avoid|refrain from|hold off|no more|no further)\b|^(?:i said|i told you|i told|as i said)\b.*\b(?:do not|never|avoid)\b/,
  negrec: /\b(?:i do not think|do not think we|should not|must not|no need (?:to|for)|not needed|not required|not indicated|no indication|(?:is|are) contraindicated|not a good idea|would not|better not|i do not (?:want|recommend|advise))\b/,
  question: /^(?:should|shall|can we|could we|would we|may we|might we|do we (?:need|want|have to|give|start|put|do|go|continue|stop|escalate)|does (?:he|she|the|this|it) (?:need|require|want)|is there (?:an? )?(?:indication|need|role|benefit|point|reason|any)|is it (?:time|worth|safe|appropriate|reasonable|necessary|indicated|better|too late)|are we|will (?:it|this)|would (?:it|this)|what about|how about|why not|whether|do you think|do you want|any (?:role|need|indication)|is (?:the patient|he|she) (?:suitable|ready|fit|a candidate|stable enough)|which (?:antibiotic|drug|investigation|test|ventilator mode)|what (?:antibiotic|drug|dose|should we|else should)|who (?:should|will))\b/,
  polite: /^(?:please |kindly )?(?:can|could|would|will) you\b/,
  consider: /\b(?:may|might|could|possibly|perhaps|maybe|probably|likely)\s+(?:need|require|want|have to|be needing|be requiring)\b|\b(?:considering|contemplating|thinking (?:of|about)|wondering (?:if|about|whether)|not sure (?:if|whether)|undecided)\b|^(?:consider|think about|maybe|perhaps|possibly|probably|we could|i could|might)\b/,
  recommend: /^(?:i think|i feel|i believe|i suggest|i recommend|i would|i d|in my opinion|my suggestion|my recommendation|my plan|we should|we ought|we had better|we must|we need to|it would be (?:good|better|wise|reasonable|prudent|sensible|advisable)|it might be (?:better|wise)|would be (?:good|better|wise)|let us (?:consider|think))\b|\bwe should\b|\bi think we\b/,
  prepare: /^(?:please |kindly |and |also )*(?:prepare|prep|get ready|be ready|make ready|keep ready|ready the)\b|\bprepare (?:for|the patient for)\b|\bget ready for\b/,
};
const REASON = [
  [/^(?:my (?:first |second |working |leading )?(?:differential|diagnosis|impression)\b)/, "A differential diagnosis was put forward."],
  [/\b(?:rule out|exclude)\b/, "Something is to be excluded."],
  [/\bwe can not exclude\b|\bcan not exclude\b|\bcannot be excluded\b/, "A diagnosis cannot be excluded."],
  [/\bpossibility of\b/, "A possibility was raised."],
  [/\b(?:less|more) likely\b/, "The likelihood of a diagnosis was weighed."],
  [/^(?:lets|let us) prioriti[sz]e\b/, "Priorities were set."],
  [/\bbenefits? outweigh\b|\bbalance (?:the )?risks?\b|\brisks? and benefits?\b/, "Risks and benefits were weighed."],
  [/\bno indication\b|\bnot indicated\b|\bcontraindicated\b/, "An intervention was ruled out."],
  [/^(?:lets|let us) wait for\b/, "The team will wait for results."],
  [/\bneed more (?:clinical )?information\b|\bmore information\b/, "More information is needed."],
  [/\b(?:current )?treatment is not working\b|\bnot responding\b/, "The current treatment is not working."],
  [/\bchange our strategy\b|\bchange the strategy\b/, "The strategy needs to change."],
  [/\bbackup plan\b|\bplan b\b/, "A backup plan was asked for."],
  [/\bwhat happens if\b|\bpossible complications\b|\bwhat are the complications\b|\bwhat can go wrong\b/, "Complications were asked about."],
];
const RULEOUT = [
  [/tamponade|pericardial|obstructive shock/, [["img:echo", "Bedside echo"]], "Look for effusion and a collapsed right heart."],
  [/pulmonary embol|\bpe\b|clot in the lung/, [["img:ctpa", "CT pulmonary angiogram"], ["lab:ddimer", "D-dimer"]], "Echo for right-heart strain is the quick look."],
  [/pneumothorax|tension/, [["img:cxr", "Chest X-ray"], ["img:usg", "Lung ultrasound"]], "In a tension pneumothorax do not wait for the film."],
  [/sepsis|infection/, [["lab:cultures", "Blood cultures"], ["lab:lactate", "Lactate"]], "Cultures first, antibiotics within the hour."],
  [/ischemi|ischaemi|bowel|mesenteric|perforat/, [["img:ctabd", "CT abdomen"], ["lab:lactate", "Lactate"]], "A normal lactate does not exclude it."],
  [/stroke|bleed|haemorrhage|hemorrhage|ich\b|raised icp|intracranial/, [["img:cthead", "CT brain"]], "Check the pupils and the GCS trend as well."],
  [/\bacs\b|infarct|\bmi\b|stemi|ischaemia of the heart/, [["img:ecg", "ECG"], ["lab:trop", "Troponin"]], "Repeat the ECG if the first is normal."],
];

/* one sentence → its mode and what is left of it to act on */
export function classify(sentence) {
  const raw = String(sentence || "").trim(); let n = norm(raw).trim(); const qm = /\?\s*$/.test(raw);
  const m1 = /^(?:no|nope|sorry|actually|wait|hold on|not that|i meant|i mean)\b[ ,]*/.exec(n);
  let corrected = false;
  if (m1) { const rest = n.slice(m1[0].length).replace(/^(?:i meant|i mean)\s*/, ""); if (RE.reverse.test(n)) return { mode: "reverse", text: n }; if (rest) { n = rest; corrected = true; } else return { mode: "reverse", text: n }; }
  if (RE.reverse.test(n) && !RE.question.test(n)) return { mode: "reverse", text: n };
  if (RE.hypo.test(n)) return { mode: "hypo", text: n };
  if (RE.prohibit.test(n)) return { mode: "prohibit", text: n };
  if (RE.negrec.test(n)) return { mode: "negative", text: n };
  if (RE.polite.test(n)) return { mode: "direct", text: n, corrected };
  if (RE.question.test(n) || (qm && !/^(?:what|how|why|when|where|who|which|is|are|was|were|has|have|had|any|does|did)\b/.test(n))) return { mode: "question", text: n };
  for (const [re, what] of REASON) if (re.test(n)) return { mode: "reason", text: n, what };
  if (RE.consider.test(n)) return { mode: "consider", text: n };
  if (RE.recommend.test(n)) return { mode: "recommend", text: n };
  if (RE.prepare.test(n)) return { mode: "prepare", text: n };
  return { mode: "direct", text: n, corrected };
}

/* a short, honest view of whether the step is wanted, from the numbers on the monitor */
function advise(id, P, H) {
  if (!P) return "";
  const shock = P.map < 65 || P.sbp < 90, hypox = P.spo2 < 90, wet = (P.spo2 < 92 && P.rr > 24) || (P.fluidMl || 0) > 3000;
  switch (id) {
    case "proc:intubate": return P.tube ? "He is already on the ventilator." : P.gcs <= 8 || P.spo2 < 85 || P.rr > 35 || P.alive === false ? `The numbers support it: GCS ${P.gcs}, SpO₂ ${P.spo2}%, RR ${P.rr}.` : `Not clearly yet: GCS ${P.gcs}, SpO₂ ${P.spo2}%, RR ${P.rr}. Try oxygen, HFNC or NIV first if he is protecting his airway.`;
    case "drug:fluids": return shock ? (wet ? `He is hypotensive but looks wet (SpO₂ ${P.spo2}%, RR ${P.rr}). Test fluid responsiveness before more fluid.` : `Reasonable: MAP ${P.map}. A 250 to 500 mL balanced crystalloid bolus, then reassess.`) : `No hypotension now (MAP ${P.map}). Fluids only if he is responsive and hypoperfused.`;
    case "drug:norepi": return P.norepi ? "Noradrenaline is already running." : shock ? `Reasonable if MAP stays under 65 after fluid (MAP ${P.map} now).` : `Not needed now: MAP ${P.map}.`;
    case "drug:vaso": return P.norepi && P.map < 65 ? "Reasonable: MAP is still low on noradrenaline." : "Usually added only when noradrenaline is already running and MAP is still low.";
    case "proc:dialysis": return P.k >= 6.5 || P.k >= 6 && P.uo < 20 ? `Potassium ${P.k} with low urine output points towards dialysis.` : "Absolute reasons are refractory hyperkalaemia, acidosis, overload, uraemic signs and some poisons. Check potassium, pH and the fluid balance.";
    case "proc:prone": return P.tube && P.spo2 < 92 ? "Consider it in a ventilated patient with a low P/F ratio." : "Proning is for a ventilated patient with severe hypoxaemia.";
    case "proc:niv": return hypox && !P.tube ? "A reasonable step if he is awake and protecting his airway." : "";
    case "drug:furosemide": return wet ? "Reasonable: signs of overload." : "Only if there is overload and a urine response is likely.";
    default: return "";
  }
}

const labelsOf = (s) => { let r; try { r = parseOrders(s); } catch (e) { r = { orders: [], negated: [] }; } return r; };
const quoteFor = (r) => r.orders.filter((o) => !o.choose).slice(0, 3);
function actionsFor(orders, P, H) {
  return orders.map((o) => {
    if (o.id === "call") return { label: "Call " + (SPEC_LABEL[o.specialty] || o.specialty), order: "call", specialty: o.specialty };
    const hi = isHigh(o.id); return { label: (hi ? "Confirm: " : "Do now: ") + o.label, order: o.id, confirm: hi, heard: o.heard };
  });
}
const joinNames = (a) => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

/* the card for a sentence that is not an order. Returns { cards, negated } */
export function heldCard(H, c, P, n, sentence) {
  const { card } = H, r = labelsOf(sentence), os = quoteFor(r), names = r.orders.map((o) => o.label).concat(r.negated), what = names.length ? joinNames([...new Set(names)]) : "";
  const adv = os.length ? advise(os[0].id, P, H) : "";
  const acts = actionsFor(os, P, H), id = "intent:" + c.mode + ":" + (what || n.slice(0, 24));
  const say = (t) => ({ spoken: t });
  switch (c.mode) {
    case "question": return { cards: [card(id, what ? "Not ordered. You asked: " + what : "Question noted", [what ? `I have not ordered ${what}. It was a question.` : "That was a question, so nothing has been ordered.", adv, os.length ? "Say it as an order, or tap the button, to do it." : ""], { tone: "info", actions: acts, ...say(what ? "Not ordered. " + (adv || "That was a question.") : "That was a question.") })], negated: [] };
    case "hypo": return { cards: [card(id, "What if: nothing has been done", [what ? `Imagining ${what}. Nothing was given.` : "A what-if question. Nothing was changed.", adv], { tone: "info", actions: acts, ...say("Nothing was done. " + adv) })], negated: [] };
    case "consider": return { cards: [card(id, "Noted as a consideration", [what ? `The team is considering ${what}.` : "Noted as a thought.", adv, os.length ? "Nothing is ordered until someone gives the order." : ""], { tone: "info", actions: acts, ...say("Noted. " + (what ? "Considering " + what + "." : "")) })], negated: [] };
    case "recommend": return { cards: [card(id, "Recorded as a recommendation", [what ? `Recommendation: ${what}.` : "Recommendation noted.", adv, "It is not an order yet. Say the order, or tap the button."], { tone: "info", actions: acts, ...say("Recorded as a recommendation. " + adv) })], negated: [] };
    case "prepare": return { cards: [card(id, "Preparing, not done yet", [what ? `Getting ready for ${what}: equipment, drugs and team.` : "Getting ready.", os.some((o) => isHigh(o.id)) ? "This is a high-risk step. It needs a confirmation to go ahead." : "Say it, or tap the button, when you want it done."], { tone: "info", actions: acts, ...say("Getting ready. Not done yet.") })], negated: [] };
    case "negative": case "prohibit": return { cards: [card(id, c.mode === "prohibit" ? "Understood: do not" : "Understood: not advised", [what ? `Not ordered: ${what}.` : "Understood. Nothing will be ordered for that.", "The team has it as a decision against."], { tone: "warn", ...say(what ? "Understood. Not " + what + "." : "Understood.") })], negated: r.orders.map((o) => o.label).concat(r.negated) };
    case "reverse": return { cards: [card("intent:reverse", "Reversal heard. Nothing changed", ["Nothing was ordered, so there is nothing to undo here.", "Say what you want now, for example ‘PEEP 8’ or ‘stop the infusion now’."], { tone: "info", ...say("Nothing was changed. Say what you want now.") })], negated: [] };
    case "reason": {
      const lines = [c.what]; let acts2 = [];
      for (const [re, items, tip] of RULEOUT) if (re.test(n)) { acts2 = items.map(([o, l]) => ({ label: l, order: o })); lines.push("To settle it: " + items.map((x) => x[1]).join(", ") + ". " + tip); break; }
      return { cards: [card("intent:reason:" + n.slice(0, 24), "Noted for the discussion", lines, { tone: "info", actions: acts2.slice(0, 3), spoken: c.what })], negated: [] };
    }
    default: return { cards: [], negated: [] };
  }
}

/* ---------------------------------------------------------------- patient facts for the specialists */
const num = (x, d) => (x == null || Number.isNaN(+x) ? null : Math.round(x * (d || 1)) / (d || 1));
const res = (P, re) => ((P && P.results) || []).filter((r) => re.test((r.label || "") + " " + (r.id || ""))).pop();
function priority(P, H) {
  const A = (label, order, confirm) => ({ label, order, confirm: !!confirm });
  if (!P) return null;
  if (P.alive === false || (P.rhythm && P.rhythm !== "sinus")) return { title: "Rhythm or arrest comes first", lines: [`Rhythm: ${P.rhythm || "no output"}. Start CPR and shock if the rhythm is shockable.`], acts: [A("Examine now", "examine")] };
  if (P.gcs <= 8 || P.spo2 < 85) return { title: "Airway and breathing come first", lines: [`GCS ${P.gcs}, SpO₂ ${P.spo2}%, RR ${P.rr}.`, "Secure the airway if he cannot protect it. Oxygen on now."], acts: [A("Oxygen", "proc:oxygen"), A("Confirm: Intubate", "proc:intubate", true)] };
  if (P.spo2 < 92 || P.rr > 30) return { title: "Breathing comes first", lines: [`SpO₂ ${P.spo2}%, RR ${P.rr}.`, P.tube ? "Check the ventilator, the tube and the lungs." : "Oxygen, then HFNC or NIV if it does not settle."], acts: [A("Oxygen", "proc:oxygen"), A("HFNC", "proc:hfnc")] };
  if (P.map < 65 || P.sbp < 90) return { title: "Circulation comes first", lines: [`BP ${P.sbp}/${P.dbp}, MAP ${P.map}, HR ${P.hr}.`, "Fluid if he is dry and responsive, noradrenaline if MAP stays low. Look for the cause."], acts: [A("IV fluid", "drug:fluids"), A("Noradrenaline", "drug:norepi")] };
  if (P.gcs < 13) return { title: "Disability needs a look", lines: [`GCS ${P.gcs}.`, "Check the glucose and the pupils first."], acts: [A("Blood glucose", "lab:glucose")] };
  return { title: "No immediate threat from the numbers", lines: [`BP ${P.sbp}/${P.dbp}, HR ${P.hr}, SpO₂ ${P.spo2}%, RR ${P.rr}, GCS ${P.gcs}.`, "Keep looking: examine, gas, lactate, kidney function, cultures."], acts: [A("Examine now", "examine")] };
}
function warnings(P) {
  const L = [];
  const row = (t, now) => L.push(`${t} (now ${now})`);
  row("SpO₂ below 90%", (P.spo2 ?? "?") + "%"); row("MAP below 65", P.map ?? "?"); row("Respiratory rate above 30", P.rr ?? "?"); row("GCS dropping by 2 or more", P.gcs ?? "?"); row("Urine output below 0.5 mL/kg/h", P.uo == null ? "not measured" : P.uo + " mL/h"); row("Lactate above 4 or rising", P.lactate == null ? "not sent" : P.lactate); row("New arrhythmia or heart rate above 130", (P.rhythm || "sinus") + ", " + (P.hr ?? "?"));
  return L;
}
function differential(P, H) {
  const o = [], f = P || {};
  if (f.spo2 < 94 || f.rr > 24 || f.tube) o.push("Lungs: pneumonia, ARDS, pulmonary oedema, pulmonary embolism, asthma or COPD");
  if (f.map < 65 || f.sbp < 90) o.push("Shock: septic, cardiogenic, hypovolaemic, obstructive (tamponade, PE, tension pneumothorax)");
  if (f.uo != null && f.uo < 35 || f.cr > 1.5) o.push("Kidney: pre-renal, ATN, obstruction, rhabdomyolysis, glomerular");
  if (f.gcs < 15) o.push("Brain: metabolic, septic, toxic, structural, seizure");
  if (f.temp > 38 || f.temp < 36) o.push("Infection or inflammation: look for the source");
  return o.length ? o : ["No organ is clearly failing yet. Take the history again, examine, and send a gas, lactate, kidney function and cultures."];
}

/* ---------------------------------------------------------------- what each specialist says */
function opinion(H, sp, q, P, ctx, st) {
  const { card } = H, g = (id) => H.given(P, id), acts = [], L = [];
  const A = (label, order, confirm) => acts.push({ label, order, confirm: !!confirm });
  const shock = P.map < 65 || P.sbp < 90, wet = (P.spo2 < 92 && P.rr > 24) || (P.fluidMl || 0) > 3000;
  const ask = (re) => re.test(q || "");
  const rv = (key) => { const m = H.latestItem ? H.latestItem(P, key) : null; return m ? num(m.it.v, 10) : null; };   /* only a result that is back: the specialists do not know a value nobody has measured */
  const lac = rv("lactate"), cr = rv("cr"), k = rv("k"), uo = num(P.uo);
  switch (sp) {
    case "nephrologist":
      L.push(`Urine output ${uo == null ? "not measured" : uo + " mL/h"}${cr != null ? ", creatinine " + cr : ""}${k != null ? ", potassium " + k : ""}${P.fluidMl ? ", about " + P.fluidMl + " mL of fluid so far" : ""}.`);
      if (ask(/fluid/)) L.push(wet ? `I would hold more fluid. He looks wet (SpO₂ ${P.spo2}%, RR ${P.rr}). Check fluid responsiveness first; a diuretic or ultrafiltration may be needed.` : shock ? "Yes, a further 250 to 500 mL balanced crystalloid is reasonable if he is fluid responsive. Reassess after each bolus." : "He is not hypotensive. No extra fluid unless he is hypoperfused and fluid responsive.");
      else if (ask(/dialys|rrt|crrt|sled|renal replacement|ultrafiltr/)) L.push(k >= 6.5 || (k >= 6 && uo != null && uo < 20) ? `Yes, an indication is building: potassium ${k}. Prepare a dialysis catheter.` : "I do not see an absolute indication yet. The reasons are refractory hyperkalaemia, acidosis, overload, uraemic signs and some poisons. Recheck potassium and pH.");
      else L.push(uo != null && uo < 35 ? "Oliguria: look for obstruction, volume status and nephrotoxins. Get a kidney profile and a urine routine." : "Kidney function looks acceptable on the numbers. Trend the creatinine and potassium.");
      if (k != null && k >= 6) { L.splice(1, 0, `Potassium ${k} is the first problem. ${P.hr < 50 ? "The slow pulse fits. " : ""}Calcium gluconate to protect the heart, then insulin with dextrose and dialysis.`); A("Calcium gluconate", "drug:calcium"); A("Insulin with dextrose", "drug:insulindex"); }
      if (uo != null && uo < 35) A("Kidney function", "lab:kft"); if (!g("proc:foley")) A("Urinary catheter", "proc:foley"); break;
    case "cardiologist": {
      const ecg = res(P, /ecg/i);
      L.push(`HR ${P.hr}, BP ${P.sbp}/${P.dbp}, rhythm ${P.rhythm || "sinus"}${P.norepi ? ", on noradrenaline" : ""}.`);
      if (ask(/ecg|ekg/)) { if (ecg) L.push("ECG: " + (ecg.text || ecg.label)); else { L.push("There is no ECG yet. I want a 12-lead before I say more."); A("ECG", "img:ecg"); } }
      else if (ask(/inotrop|vasopress|contractil|preload|afterload|output|shock|echo/)) { L.push(shock ? "Get a bedside echo for LV and RV function and the IVC. Low output with high filling pressure: dobutamine. Vasoplegic: noradrenaline, then vasopressin." : "He is not in shock. An echo still helps if the cause is unclear."); A("Bedside echo", "img:echo"); }
      else { L.push(shock ? "Pressure is low. An echo will tell us pump, preload or obstruction." : "Circulation is holding. An ECG and troponin if there is any chest pain or arrhythmia."); A("ECG", "img:ecg"); A("Bedside echo", "img:echo"); }
      break; }
    case "pulmonologist":
      L.push(`SpO₂ ${P.spo2}% ${P.tube ? "on the ventilator" : P.oxygen ? "on oxygen" : "on room air"}, RR ${P.rr}.`);
      if (ask(/vent|peep|tidal|setting|mode|plateau|driving/)) L.push(P.tube ? "Lung protective: tidal volume 6 mL/kg predicted weight, plateau under 30, driving pressure under 15. Raise PEEP for hypoxaemia; consider proning if the P/F ratio is under 150." : "He is not ventilated. Settings only matter once he is intubated.");
      else if (ask(/prone/)) L.push(P.tube && P.spo2 < 92 ? "Yes, consider proning: ventilated and hypoxaemic. Sixteen hours a day." : "Proning is for a ventilated patient with severe hypoxaemia.");
      else L.push(P.spo2 < 90 ? (P.tube ? "Check the tube, the lungs for a pneumothorax, secretions and the ventilator settings." : "Escalate: HFNC or NIV, and intubate if he tires or the gas worsens.") : "Oxygenation is acceptable. Send a gas and look at the chest film.");
      A("ABG", "lab:abg"); A("Chest X-ray", "img:cxr"); break;
    case "neurologist":
      L.push(`GCS ${P.gcs}${P.hr < 55 && P.sbp > 160 ? ", with a slow pulse and high pressure" : ""}.`);
      if (ask(/icp|intracranial|herniat|pupil/)) L.push(P.gcs <= 8 || (P.hr < 55 && P.sbp > 160) ? "I suspect raised ICP. Check the pupils, get a CT brain, head up 30 degrees, and have osmotherapy ready." : "Nothing on the numbers suggests raised ICP. Check the pupils and repeat the GCS.");
      else if (ask(/thrombectom|stroke|nihss|large vessel/)) { L.push("He is a candidate if a large-vessel occlusion shows on CT angiography, within 6 hours (up to 24 with a perfusion mismatch), a NIHSS of 6 or more, and no haemorrhage. He needs a CT and a CT angiogram now."); A("CT brain", "img:cthead"); A("CT angiogram", "img:ctangio"); }
      else if (ask(/status|seiz|fit/)) { L.push("Treat a seizure over 5 minutes: a benzodiazepine, then a second-line drug, and check the glucose. EEG if he does not wake."); A("Lorazepam / midazolam", "drug:benzo"); A("Second-line antiepileptic", "drug:antiepileptic"); A("EEG", "proc:eeg"); }
      else L.push(P.gcs < 15 ? "Check the glucose, the pupils and focal signs. A CT brain if it is not metabolic." : "He is alert. Repeat the neurological examination if anything changes.");
      A("CT brain", "img:cthead"); A("Blood glucose", "lab:glucose"); break;
    case "infectious": {
      const abx = Object.keys((P && P.given) || {}).some((x) => x.startsWith("abx:") && g(x)), cu = g("lab:cultures");
      L.push(`Temperature ${P.temp}${lac != null ? ", lactate " + lac : ""}. Cultures ${cu ? "sent" : "not sent"}, antibiotics ${abx ? "given" : "not given"}.`);
      if (ask(/escalat|antibiotic|antimicrob|cover|spectrum|fung/)) L.push(!abx ? "Nothing to escalate: no antibiotic yet. Cultures, then a broad first dose within the hour." : "Check the culture, the source and the response at 48 to 72 hours. Escalate if he is worse on a drug that should work, or a resistant organism is likely.");
      else L.push(!abx ? "Send cultures, then give a broad antibiotic within the hour. Find the source." : "Antibiotics are on. Review the cultures and the source; de-escalate when we know the organism.");
      if (!cu) A("Blood cultures", "lab:cultures"); A("Procalcitonin", "lab:pct"); break; }
    case "surgeon":
      L.push(`${lac != null ? "Lactate " + lac + ". " : ""}${P.map < 65 ? "He is hypotensive." : "Pressure is acceptable."}`);
      if (ask(/perforat|free air|acute abdomen/)) { L.push("Examine for guarding and rigidity; an erect chest film or a CT abdomen shows free air. Perforation needs resuscitation, antibiotics and the theatre."); A("CT abdomen", "img:ctabd"); A("Chest X-ray", "img:cxr"); }
      else if (ask(/conservativ|non operative|nonoperative/)) { L.push("Conservative management is reasonable if he is stable, there is no peritonitis, no ischaemia and any collection is drained. Serial examination and a low threshold to operate."); A("Examine now", "examine"); }
      else if (ask(/drain|image guided/)) { L.push("Image-guided drainage suits a well-defined collection and a patient who is too sick for the theatre. It needs a CT or ultrasound, and a safe window."); A("CT abdomen", "img:ctabd"); A("Bedside ultrasound", "img:usg"); }
      else if (ask(/postop|post op|wound|anastomo|leak/)) { L.push("Look for a leak, a collection, bleeding, wound infection and an ileus. A CT with contrast and the drain output usually tell."); A("CT abdomen", "img:ctabd"); }
      else { L.push(ask(/surg|intervention|emergency|laparotomy|operat/) ? "He needs the theatre if there is peritonitis, perforation, ischaemic bowel, an obstructed infected system, a bleed that will not stop, or necrotising infection. Examine the abdomen and image him." : "Examine the abdomen and look for a source that needs control. A CT abdomen if the examination is unclear."); A("CT abdomen", "img:ctabd"); A("Examine now", "examine"); }
      break;
    case "gastroenterologist":
      L.push(lac != null ? `Lactate ${lac}${cr != null ? ", creatinine " + cr : ""}.` : "Look at the liver, the gut and any bleeding.");
      if (ask(/liver failure|acute liver|\balf\b|inr|bilirubin|encephal/)) { L.push("Send LFT, INR, ammonia and glucose. Grade the encephalopathy, treat the cause (paracetamol: N-acetylcysteine), and involve a transplant centre early."); A("LFT", "lab:lft"); A("Coagulation", "lab:coag"); A("Ammonia", "lab:nh3"); }
      else if (ask(/hepatorenal|hrs/)) { L.push("Think of HRS-AKI: AKI in cirrhosis that does not respond to two days of albumin, with no shock and no nephrotoxin. Then terlipressin with albumin."); A("Kidney function", "lab:kft"); }
      else if (ask(/peritonitis|\bsbp\b|paracentesis|ascit/)) { L.push("Tap the ascites. A neutrophil count of 250 per mm³ or more is SBP: ceftriaxone and albumin."); A("Diagnostic paracentesis", "proc:paracentesis"); }
      else if (ask(/bleed|haematemesis|hematemesis|melaena|melena|endoscop|varic/)) { L.push("Resuscitate first, check haemoglobin and coagulation, start a PPI. If varices are likely add terlipressin or octreotide and an antibiotic, and scope within 12 hours."); A("Upper GI endoscopy", "proc:endo"); A("PPI", "drug:ppi"); A("CBC", "lab:cbc"); }
      else if (ask(/portal/)) { L.push("Look for ascites, varices, splenomegaly and a low platelet count. An ultrasound with Doppler helps."); A("Bedside ultrasound", "img:usg"); }
      else { L.push("Send an LFT and a coagulation profile, and look for a bleed."); A("LFT", "lab:lft"); A("Coagulation", "lab:coag"); }
      break;
    default: { /* the intensivist */
      const p = priority(P, H);
      L.push(p.title + ".", ...p.lines); p.acts.forEach((x) => acts.push(x));
      if (ask(/first|assess/)) L.push("Then the team should give its assessment, one by one."); }
  }
  /* the case engine's own list, one step at a time: a nudge first, the step itself on the next ask */
  const mine = (P.left || []).filter((x) => x.owner === sp);
  if (mine.length) { const t = tier("op:" + sp, ctx); L.push(t === 1 ? `${mine.length} step${mine.length > 1 ? "s" : ""} of my part are still open.` : `Still open from me: ${mine.slice(0, 3).map((x) => x.label).join(", ")}.`); }
  const first = L[0], out = L.slice();
  st.said[sp] = L.slice(1, 3).join(" ");
  return card("mdt:" + sp, SPEC_LABEL[sp] || sp, out, { tone: "info", actions: acts.slice(0, 3), spoken: (SPEC_LABEL[sp] || sp) + ". " + L.slice(1, 3).join(" "), who: sp, first });
}

/* ---------------------------------------------------------------- the meeting */
const callOrder = (sp) => ({ id: "call", specialty: sp, label: "Call " + (SPEC_LABEL[sp] || sp), heard: "call " + sp, at: [0, 0] });
const teamOf = (P, ctx) => { const s = new Set(["intensivist"]); ((P && P.problems) || []).forEach((q) => q.specialty && s.add(q.specialty)); ((ctx.team) || []).forEach((m) => m.specialty && s.add(m.specialty)); return [...s]; };
const calledOf = (P, ctx) => { const s = new Set(["intensivist"]); ((P && P.problems) || []).forEach((q) => q.called && q.specialty && s.add(q.specialty)); ((ctx.team) || []).forEach((m) => m.specialty && s.add(m.specialty)); return s; };
const NEED_NEXT = [["examine", "Examine the patient"], ["lab:abg", "Blood gas"], ["lab:lactate", "Lactate"], ["lab:cbc", "CBC"], ["lab:kft", "Kidney function"], ["img:ecg", "ECG"], ["img:cxr", "Chest X-ray"], ["lab:cultures", "Cultures"]];

/* returns { cards, orders } or null when the sentence is not about the meeting */
export function meeting(H, n, P, ctx) {
  const { card } = H, st = mstate(ctx), out = { cards: [], orders: [] }, has = (re) => re.test(n), story = ctx.story, P0 = P || {};
  const nowMin = Math.floor((P0.elapsedMs || 0) / 60000);
  const named = (spr) => { const sp = spr || findSpec(n); return sp; };
  const respond = (sp, q) => { if (st.paused) { out.cards.push(card("mdt:paused", "The discussion is paused", ["Say ‘resume discussion’ to continue."], { tone: "warn", spoken: "The discussion is paused." })); return; } st.turn = sp; out.cards.push(opinion(H, sp, q, P0, ctx, st)); if (sp !== "intensivist" && ((P0.problems || []).some((x) => x.specialty === sp && !x.called))) { out.orders.push(callOrder(sp)); } };

  // --- "increase the oxygen" in any of its wordings: the next rung of the ladder, from where the patient is now
  if (has(/\b(?:escalate|increase|step up|upgrade|more|higher|raise|boost|improve)\b.*\b(?:oxygen|o2|fio2|oxygenation|respiratory support|oxygen support|breathing support)\b|\bgive (?:him |her )?more oxygen\b|\bhigher oxygen concentration\b/) && !has(/\b(?:what|should|can|could|do we|if|whether|may|might)\b/)) {
    const step = !P0.oxygen && !P0.tube && !H.given(P, "proc:oxygen") ? "proc:oxygen" : P0.tube ? null : !H.given(P, "proc:hfnc") ? "proc:hfnc" : !H.given(P, "proc:niv") ? "proc:niv" : "proc:intubate";
    if (!step) out.cards.push(card("mdt:o2", "Already ventilated", ["He is on the ventilator. Ask the pulmonologist about FiO₂ and PEEP, or check the tube and the lungs."], { tone: "info", spoken: "He is already ventilated." }));
    else { const lab = BY_ID[step].label; out.cards.push(card("mdt:o2", "Next step up: " + lab, [`SpO₂ ${P0.spo2}% now${step === "proc:intubate" ? ", despite oxygen, HFNC and NIV" : ""}.`, isHigh(step) ? "This is high risk. Tap Confirm to go ahead." : "Tap to start it."], { tone: "warn", actions: [{ label: (isHigh(step) ? "Confirm: " : "Do now: ") + lab, order: step, confirm: isHigh(step) }], spoken: "The next step up is " + lab + "." })); }
    return out;
  }
  // --- the meeting's own controls
  if (has(/^(?:start|begin|open) (?:the |a |this |new )?(?:case|meeting|mdt)\b|^lets (?:start|begin|discuss|look at) (?:the |this )?(?:case|patient)\b|^present (?:the |this )?(?:case|patient)\b|^(?:case )?presentation\b/)) {
    out.cards.push(card("mdt:present", story ? story.title : "The case", [story ? story.text : "Open the History page.", P ? `BP ${P.sbp}/${P.dbp}, HR ${P.hr}, SpO₂ ${P.spo2}%, RR ${P.rr}, GCS ${P.gcs}.` : ""], { tone: "info", section: "history", autoOpen: true, spoken: story ? story.text : "Here is the case." })); return out;
  }
  if (has(/^(?:show|open|see|display|pull up|review) (?:me )?(?:the )?(?:patient |clinical |case )?(?:history|presentation)\b/)) { out.cards.push(card("mdt:history", "Clinical history", [story ? story.text : "Open the History page."], { tone: "info", section: "history", autoOpen: true, spoken: story ? story.text : "Here is the history." })); return out; }
  if (has(/^(?:show|open|see|display|pull up) (?:me )?(?:the )?(?:current |patient )?(?:vitals|monitor|vital signs)\b/)) { out.cards.push(P && H.summaryCard ? { ...H.summaryCard(P), id: "mdt:vitals", section: "vitals", autoOpen: true } : card("mdt:vitals", "Vital signs", ["No monitor yet."], { tone: "info", section: "vitals", autoOpen: true })); return out; }
  if (has(/^(?:show|open|see|display|pull up|review) (?:me )?(?:the )?(?:laboratory|lab|investigation|blood|test)(?: reports?| results?| tests?)?\b|^(?:show|open) (?:the )?investigations\b/)) { const r = (P0.results || []).slice(-4).map((x) => (x.label || "Result") + ": " + (x.text || "")); out.cards.push(card("mdt:labs", "Investigations", r.length ? r : ["Nothing has come back yet."], { tone: "info", section: "invest", autoOpen: true, spoken: "Here are the investigations." })); return out; }
  if (has(/^(?:show|open|see|display|pull up|review) (?:me )?(?:the )?(?:imaging|radiology|x ray|scans?|images?)\b/)) { out.cards.push(card("mdt:imaging", "Imaging", ["Open the Investigations page for the films and scans."], { tone: "info", section: "invest", autoOpen: true, spoken: "Here is the imaging." })); return out; }
  if (has(/^(?:pause|hold|stop) (?:the )?(?:discussion|meeting|mdt)\b/)) { st.paused = true; out.cards.push(card("mdt:pause", "Discussion paused", ["The specialists will not speak until you resume. The patient keeps running.", "Say ‘resume discussion’."], { tone: "warn", spoken: "Paused." })); return out; }
  if (has(/^(?:resume|continue|restart|carry on with) (?:the )?(?:discussion|meeting|mdt)\b|^resume\b/)) { st.paused = false; out.cards.push(card("mdt:resume", "Discussion resumed", ["Ask a specialist, or say ‘go one by one’."], { tone: "ok", spoken: "Resumed." })); return out; }
  if (has(/^(?:end|close|finish|conclude|adjourn) (?:the )?(?:meeting|mdt|session|discussion)\b/)) { out.cards.push(card("mdt:end", "Close the MDT?", [`The patient is ${P && P.outcome ? (P.outcome === "held" ? "stable. Well done." : "no longer with us.") : "still being treated."}`, P && P.pctDone != null && !P.outcome ? `${P.pctDone}% of the care is done. The case ends when the patient settles at ${P.pctNeeded}% or more.` : "", "Leave with Universe at the top left when the team is done."], { tone: "info", spoken: "Leave the meeting from the Universe button when you are done." })); return out; }

  // --- who speaks
  if (has(/^(?:call|bring in|invite|get|page) (?:all|every|each) (?:the )?(?:specialists?|doctors?|team|consultants?)\b|^(?:activate|assemble) (?:the )?(?:mdt|team)\b|^everyone in\b/)) {
    const need = ((P0.problems) || []).filter((q) => q.specialty && q.specialty !== "intensivist" && !q.called).map((q) => q.specialty);
    const uniq = [...new Set(need)]; uniq.forEach((sp) => out.orders.push(callOrder(sp)));
    out.cards.push(card("mdt:callall", uniq.length ? "Calling the team" : "The team is already here", [uniq.length ? "Calling: " + uniq.map((x) => SPEC_LABEL[x] || x).join(", ") + ". Press send to place the calls." : "Every specialist this case needs has been called."], { tone: "info", spoken: uniq.length ? "Calling the team." : "Everyone is already here." })); return out;
  }
  if (has(/^(?:next|another) (?:specialist|doctor|speaker|one)\b|^who is next\b|^(?:move|go) (?:on )?to the next\b/)) {
    const list = [...calledOf(P0, ctx)]; const i = (list.indexOf(st.turn) + 1) % list.length; respond(list[i], ""); return out;
  }
  if (has(/\b(?:each|every) specialist\b|\bone by one\b|\bgo around the (?:table|room)\b|\beveryone s (?:view|opinion|assessment)\b|\bhear from everyone\b|\bdoes anybody (?:have|think)\b|\banyone (?:disagree|have a different)\b|\bany (?:other|different) opinions?\b|\bdoes anyone (?:disagree|object|have)\b/)) {
    const dissent = has(/\bdifferent|disagree|object/); const list = [...calledOf(P0, ctx)];
    if (st.paused) { out.cards.push(card("mdt:paused", "The discussion is paused", ["Say ‘resume discussion’ to continue."], { tone: "warn", spoken: "The discussion is paused." })); return out; }
    list.forEach((sp) => out.cards.push(opinion(H, sp, dissent ? "disagree" : "", P0, ctx, st))); st.turn = list[list.length - 1];
    const away = teamOf(P0, ctx).filter((x) => !list.includes(x)); if (away.length) out.cards.push(card("mdt:away", "Not here yet", [away.map((x) => SPEC_LABEL[x] || x).join(", ") + ". Say ‘call all specialists’ to bring them in."], { tone: "warn", actions: away.slice(0, 2).map((x) => ({ label: "Call " + (SPEC_LABEL[x] || x), order: "call", specialty: x })), spoken: "Some specialists are not here yet." }));
    if (dissent) st.notes.push(`${nowMin} min: asked the team for any different opinion.`); return out;
  }
  if (has(/^(?:lets |lets |let us )?(?:hear|start) (?:from )?(?:the )?(?:\w+ )?first\b/) && findSpec(n)) { respond(findSpec(n), ""); return out; }
  if (has(/^(?:ask|let|get|hear|want|call on) (?:the |a |an |dr )?/) && findSpec(n) && has(/\b(?:respond|response|speak|answer|say|opinion|review|assess|assessment|input|advice|thoughts|view|turn|talk|comment|see (?:him|her|the patient))\b/)) { respond(findSpec(n), n); return out; }
  if (has(/^(?:i )?(?:want|need|would like) (?:an? |the )?\w+(?: \w+)? (?:opinion|review|assessment|input)\b|^(?:ask|get) (?:me )?(?:an? |the )?\w+(?: \w+)? (?:opinion|to review|to assess|to see)\b/) && findSpec(n)) { respond(findSpec(n), n); return out; }
  if (has(/^(?:ask|let) (?:the )?(?:intensivist|icu doctor)\b/)) { respond("intensivist", n); return out; }
  const ss = specStart(n);
  if (ss && ss.rest && /^(?:what|can|could|should|do|does|would|is|are|how|any|please|your|give|tell|you|will|may|why|which|have|has|whats|opinion|view|thoughts|assess|review|look)\b/.test(ss.rest)) { respond(ss.sp, ss.rest); return out; }
  if (has(/^(?:can|could|should|would|will|do|does) (?:the )?\w+(?: \w+)? (?:assess|review|see|advise|comment|look|examine|opine|weigh in|help)\b/) && findSpec(n)) { respond(findSpec(n), n); return out; }
  if (has(/^(?:what is|what s|whats|give me) (?:your|the) (?:opinion|view|thoughts|assessment)\b|^what do you (?:think|suggest|recommend)\b|^your (?:opinion|view|thoughts)\b/)) {
    const sp = st.turn || "intensivist"; respond(sp, ""); return out;
  }

  // --- the reasoning of the room
  if (has(/^(?:do you|does everyone|does everybody|is everyone|are we all) agree\b|\bdo you agree with (?:this|the|my) (?:plan|approach|decision)\b|\bagree with (?:this|the) (?:plan|approach)\b/)) {
    const list = [...calledOf(P0, ctx)], rows = list.map((sp) => { const mine = (P0.left || []).filter((x) => x.owner === sp && x.overdue); return `${SPEC_LABEL[sp] || sp}: ${mine.length ? "agrees, but " + mine.slice(0, 2).map((x) => x.label).join(" and ") + " is overdue" : "agrees"}`; });
    st.notes.push(`${nowMin} min: plan put to the team.`); out.cards.push(card("mdt:agree", "Do you agree with the plan?", rows, { tone: "info", spoken: "The team was asked. " + rows.slice(0, 2).join(". ") })); return out;
  }
  if (has(/^i (?:do not agree|disagree)\b|^i disagree\b|\bi disagree with (?:this|that|the)\b|\bi do not agree with (?:this|that|the)\b|^(?:i object|i have (?:a |some )?(?:concern|objection|reservation)s?)\b/)) {
    st.disagree.push({ min: nowMin, text: n.trim(), by: "you" }); st.notes.push(`${nowMin} min: you disagreed with the approach.`);
    out.cards.push(card("mdt:disagree", "Disagreement registered", ["It is in the notes. Say why, or ask the specialist who would manage it.", "Say ‘show conflicting opinions’ to see all."], { tone: "warn", spoken: "Disagreement registered." })); return out;
  }
  if (has(/^(?:show|list|display|what are) (?:me )?(?:the )?(?:conflicting|differing|different|opposing) (?:opinions|views|positions)\b|\bconflicting opinions\b|\bwhere (?:do|are) we disagree\b/)) {
    out.cards.push(card("mdt:conflict", st.disagree.length ? "Conflicting opinions" : "No conflict recorded", st.disagree.length ? st.disagree.map((d) => `${d.min} min, ${d.by}: ${d.text}`) : ["Nobody has registered a disagreement. Ask ‘does anybody have a different opinion?’."], { tone: st.disagree.length ? "warn" : "ok", spoken: st.disagree.length ? "There is a recorded disagreement." : "No conflict recorded." })); return out;
  }
  if (has(/^(?:any|what) (?:other |alternative |different )?(?:alternative |other )?diagnos[ie]s\b|\balternative diagnos[ie]s\b|^(?:what is|give me|build|list|make|show) (?:the |a |our )?differential\b|^lets reconsider (?:the )?diagnosis\b|^reconsider (?:the )?diagnosis\b|\blets reconsider\b|^what is the most likely diagnosis\b|^what is the likely diagnosis\b|\bmost likely diagnosis\b/)) {
    st.notes.push(`${nowMin} min: the diagnosis was reopened.`);
    out.cards.push(card("mdt:ddx", has(/reconsider/) ? "Reopening the diagnosis" : "Build the differential from the findings", [...differential(P0, H), "The diagnosis stays hidden until the case ends. Test each idea: examine, gas, lactate, imaging, cultures."], { tone: "info", actions: [{ label: "Examine now", order: "examine" }, { label: "ABG", order: "lab:abg" }], section: "diagnosis", spoken: "Here is a differential to test." })); return out;
  }
  if (has(/\bimmediate(?:ly)? life threatening\b|^what (?:needs|should|do we need) to (?:be )?(?:addressed|done|treated|fixed|handled) first\b|^what is (?:the )?(?:first )?priority\b|^what s (?:the )?priority\b|\bwhat to address first\b|\bwhat first\b/)) {
    const p = priority(P, H); if (p) out.cards.push(card("mdt:priority", p.title, p.lines, { tone: "warn", actions: p.acts.slice(0, 3), spoken: p.title + ". " + p.lines[0] })); return out;
  }
  if (has(/\bwarning signs?\b|\bsigns? of deterioration\b|\bwhat should we watch\b|\bwhat to watch\b/)) { out.cards.push(card("mdt:warn", "Warning signs of deterioration", warnings(P0), { tone: "info", spoken: "Watch the oxygen, the pressure, the breathing, the GCS and the urine." })); return out; }
  if (has(/^(?:highlight|show|list|read) (?:me )?(?:the )?(?:abnormal|critical)\b|^identify (?:the )?critical\b|\babnormal results\b|\bcritical (?:lab|laboratory|values?)\b/)) {
    const ab = (P0.results || []).filter((r) => r.abnormal || r.critical || r.tone === "crit" || r.tone === "warn"); const L = (ab.length ? ab : []).slice(-6).map((r) => (r.label || "Result") + ": " + (r.text || ""));
    out.cards.push(card("mdt:abn", L.length ? "Abnormal results" : "No abnormal result flagged", L.length ? L : ["Nothing flagged so far. Open the Investigations page for everything."], { tone: L.length ? "warn" : "info", section: "invest", spoken: L.length ? "Here are the abnormal results." : "Nothing flagged." })); return out;
  }
  if (has(/^which (?:investigation|test|tests|investigations) (?:should|do we|must|needs?)\b|^what (?:test|tests|investigation|investigations) (?:next|should|do we)\b|\bwhich investigation\b.*\bnext\b/)) {
    const need = NEED_NEXT.filter(([id]) => !H.given(P, id)); out.cards.push(card("mdt:nextinv", need.length ? "Not yet done" : "The usual first tests are done", need.length ? need.slice(0, 4).map(([, l]) => l) : ["Now choose tests by what the results show."], { tone: "info", actions: need.slice(0, 3).map(([id, l]) => ({ label: l, order: id })), spoken: need.length ? "Next: " + need.slice(0, 3).map(([, l]) => l).join(", ") + "." : "The usual first tests are done." })); return out;
  }

  if (has(/\bpossible complications\b|\bwhat are the complications\b|\bwhat can go wrong\b|\bcomplications of\b|\bwhat happens if (?:this|it|that|the \w+) fails\b|\bif (?:this|it|that) fails\b/)) {
    const L = ["Falling pressure, a falling saturation and a new rhythm are the first signs of trouble."];
    if (P0.tube) L.push("On the ventilator: hypotension, barotrauma, ventilator pneumonia, tube displacement."); if (P0.norepi) L.push("On noradrenaline: arrhythmia, extravasation, poor limb and gut perfusion."); if ((P0.fluidMl || 0) > 2000) L.push("After much fluid: pulmonary oedema, abdominal compartment syndrome."); if (H.given(P, "proc:cvc")) L.push("Central line: infection, thrombosis, pneumothorax.");
    L.push("If it fails: say what you will do next. Ask ‘what is our backup plan?’."); out.cards.push(card("mdt:compl", "Complications to watch", L, { tone: "warn", spoken: "Watch the pressure, the saturation and the rhythm." })); return out;
  }
  if (has(/\bbackup plan\b|\bplan b\b|\bfallback\b|\bif (?:this|it|that) does not work\b/)) {
    const L = ["Oxygenation fails: HFNC or NIV, then intubate; prone if ventilated and still hypoxaemic; call the pulmonologist."]; L.push("Pressure stays low: add vasopressin, check the echo and the IVC, think of steroids, and look for tamponade or bleeding.", "Not responding at all: widen the differential, repeat the examination, gas and lactate, and ask the team.");
    out.cards.push(card("mdt:backup", "Backup plan", L, { tone: "info", spoken: "Here is the backup plan." })); return out;
  }

  // --- a statement of a finding, or a calculation: checked against the numbers, with the next step
  const gi = /\b(?:acute liver failure|liver failure|hepatorenal|portal hypertension|hepatic encephalopathy|spontaneous bacterial|paracentesis|gastrointestinal bleed\w*|gi bleed\w*|active (?:gastrointestinal|gi) bleeding|upper gi endoscopy)\b/, su = /\b(?:perforation|acute abdomen|laparotomy|emergency surgery|bowel ischemia|bowel ischaemia|conservatively|image guided drainage|postoperative|post operative|source control possible)\b/;
  if (!has(/^(?:what|how)\b/) && gi.test(n) && !/\b(?:send|order|do|perform|arrange|insert)\b/.test(n)) { respond("gastroenterologist", n); return out; }
  if (!has(/^(?:what|how)\b/) && su.test(n)) { respond("surgeon", n); return out; }
  if (has(/\bthrombectomy\b/)) { respond("neurologist", n); return out; }
  if (has(/\bright ventricular (?:dysfunction|failure|strain)\b|\brv (?:dysfunction|failure|strain)\b|\brwma\b|regional wall motion/)) { out.cards.push(card("mdt:rv", "Look at the heart", ["A bedside echo shows RV size and function, wall motion and any effusion.", P0.map < 65 ? `MAP ${P0.map}: pressure is low, so the pump matters.` : ""], { tone: "info", actions: [{ label: "Bedside echo", order: "img:echo" }, { label: "ECG", order: "img:ecg" }], spoken: "A bedside echo will show it." })); return out; }
  if (has(/\b(?:calculate|compute|work out|what is)\b.*\b(?:cpp|cerebral perfusion)\b|\bcerebral perfusion pressure\b/)) { out.cards.push(card("mdt:cpp", "Cerebral perfusion pressure", [`CPP = MAP − ICP. MAP is ${P0.map}.`, "ICP is not measured. An EVD or an ICP monitor would give it; a CPP above 60 is the usual aim."], { tone: "info", actions: [{ label: "EVD / decompression", order: "proc:evd", confirm: true }], spoken: "Cerebral perfusion pressure is MAP minus ICP. ICP is not measured." })); return out; }
  if (has(/\burine output per (?:kilogram|kg)\b|\buo per (?:kilogram|kg)\b|\bml per kg per hour\b/)) { const kg = 70, v = P0.uo == null ? null : Math.round(P0.uo / kg * 100) / 100; out.cards.push(card("mdt:uokg", v == null ? "Urine output not measured" : `Urine output ${v} mL/kg/h`, [v == null ? "Put in a urinary catheter and measure it hourly." : `${P0.uo} mL/h for an assumed 70 kg. Below 0.5 mL/kg/h is oliguria.`], { tone: v != null && v < 0.5 ? "warn" : "info", actions: v == null ? [{ label: "Urinary catheter", order: "proc:foley" }] : [], spoken: v == null ? "Not measured." : v + " millilitres per kilogram per hour." })); return out; }
  if (has(/\bcaloric (?:requirement|need|target)|\bcalorie (?:requirement|need|target)|\bprotein (?:requirement|need|target)|\bdaily nutritional target|\bnutritional (?:risk|target|requirement)|\bfeeding rate\b/)) { out.cards.push(card("mdt:nutr", "Nutrition target", ["For an assumed 70 kg: about 25 kcal/kg a day (1750 kcal) and 1.2 to 2 g/kg of protein (84 to 140 g).", "Start low in the first days, build over 3 to 5 days, and watch phosphate, magnesium and potassium for refeeding.", "Enteral first; parenteral only if the gut cannot be used."], { tone: "info", actions: [{ label: "Enteral feeds", order: "drug:enteral" }, { label: "Nasogastric tube", order: "proc:ngt" }], spoken: "About 1750 calories and 84 to 140 grams of protein a day, for 70 kilograms." })); return out; }
  if (has(/\bantibiogram\b|\bisolate\b|\bndm\b|\boxa 48\b|\bculture sensitivity\b|\bsensitive to\b.*\b(?:meropenem|piperacillin|ceftriaxone)\b|\bduration of (?:antimicrobial|antibiotic)\b|\bplanned duration\b/)) { const cu = res(P, /cultur/i); out.cards.push(card("mdt:micro", /duration/.test(n) ? "Duration of antibiotics" : "Microbiology", [/duration/.test(n) ? "Most infections need 5 to 7 days when the source is controlled and he is improving. Review at 48 to 72 hours with cultures and procalcitonin." : (cu ? "Culture: " + (cu.text || cu.label) : "No isolate has come back yet."), /duration/.test(n) ? "" : "The local antibiogram guides the empirical choice. A carbapenemase gene (NDM, OXA-48) needs a different drug, so ask the microbiologist."], { tone: "info", actions: cu || /duration/.test(n) ? [] : [{ label: "Blood cultures", order: "lab:cultures" }], spoken: "Here is the microbiology." })); return out; }
  if (has(/^(?:compare|contrast)\b.*\b(?:investigation|report|result|lab|vitals?|reading)s?\b|\bcompare the (?:previous|current|latest)\b|\bcorrelate\b.*\b(?:clinical|result|echo|finding)/)) { out.cards.push(H.trendCard ? { ...H.trendCard(P, ctx.hist), id: "mdt:compare" } : card("mdt:compare", "Compare", ["Open the Investigations page."], { tone: "info", section: "invest" })); out.cards.push(...(H.summaryCard && P ? [{ ...H.summaryCard(P), id: "mdt:corr" }] : [])); return out; }
  const FIND = [
    [/\bcritically ill\b|\bcompensat\w+\b|\bpoor (?:peripheral )?perfusion\b/, "Is he critically ill or compensating?", () => [`BP ${P0.sbp}/${P0.dbp}, MAP ${P0.map}, HR ${P0.hr}, SpO₂ ${P0.spo2}%, RR ${P0.rr}, GCS ${P0.gcs}.`, P0.map < 65 || P0.sbp < 90 ? "The pressure is already low: he is not compensating any more." : P0.hr > 110 || P0.rr > 24 ? "Tachycardia and tachypnoea with a held pressure: compensated for now. Look at the lactate and the capillary refill." : "The numbers look stable."], [["examine", "Examine now"], ["lab:lactate", "Lactate"]]],
    [/\baccessory muscle|\bwork of breathing\b|\brespiratory distress\b/, "Respiratory distress", () => [`RR ${P0.rr}, SpO₂ ${P0.spo2}%${P0.tube ? ", on the ventilator" : P0.oxygen ? ", on oxygen" : ", on room air"}.`, "Support the breathing and look for the cause. Watch for tiring: a falling rate with a rising CO₂ is a late sign."], [["proc:oxygen", "Oxygen"], ["proc:hfnc", "HFNC"], ["lab:abg", "ABG"]]],
    [/\bnot synchroni[sz]ing\b|\basynchrony\b|\bventilator synchrony\b|\bfighting the ventilator\b/, "Patient–ventilator asynchrony", () => [P0.tube ? "Check the waveforms for double triggering and auto-PEEP, the tube and the secretions, pain and agitation, and exclude a pneumothorax." : "He is not on a ventilator yet.", "Then adjust the trigger, the flow and the sedation."], [["img:cxr", "Chest X-ray"], ["lab:abg", "ABG"]]],
    [/\bbronchospasm\b|\bwheez\w+\b/, "Bronchospasm", () => [`SpO₂ ${P0.spo2}%, RR ${P0.rr}.`, "Bronchodilators and a steroid. In a ventilated patient, lengthen the expiratory time and look for auto-PEEP."], [["drug:salbutamol", "Salbutamol / ipratropium"], ["drug:steroid", "Hydrocortisone"], ["lab:abg", "ABG"]]],
    [/\b(?:has )?developed (?:aki|acute kidney injury)\b|\bacute kidney (?:injury|disease)\b|\brenal recovery\b|\bpersistent kidney dysfunction\b/, "Kidney injury", () => [`Creatinine ${P0.cr ?? "not sent"}, urine output ${P0.uo == null ? "not measured" : P0.uo + " mL/h"}, potassium ${P0.k ?? "not sent"}.`, /recover/.test(n) ? "Recovery shows as a rising urine output and a falling creatinine over days. Trend both." : "Find the cause (volume, sepsis, obstruction, drugs), stop nephrotoxins and check for the urgent indications for dialysis."], [["lab:kft", "Kidney function"], ["lab:ua", "Urine routine"], ["img:usg", "Bedside ultrasound"]]],
    [/\banisocoria\b|\bunequal pupils\b|\bimpending herniation\b|\bsigns? of herniation\b|\bbrain herniation\b/, "Possible herniation", () => [`GCS ${P0.gcs}, HR ${P0.hr}, BP ${P0.sbp}/${P0.dbp}.`, "A blown pupil, a falling GCS and a Cushing's response (slow pulse, high pressure) mean the brain is shifting. Head up, osmotherapy, a secure airway, and a CT brain when it is safe."], [["img:cthead", "CT brain"], ["drug:mannitol", "Mannitol"], ["drug:saline3", "3% saline"]]],
    [/\bstatus epilepticus\b/, "Status epilepticus", () => ["A seizure over 5 minutes. Protect the airway, check the glucose, give a benzodiazepine, then a second-line drug."], [["drug:benzo", "Lorazepam / midazolam"], ["drug:antiepileptic", "Second-line antiepileptic"], ["lab:glucose", "Blood glucose"]]],
    [/\bclinical criteria for sepsis\b|\bmeets? (?:the )?(?:sepsis|sirs|sofa)\b|\bqsofa\b|\bsofa score\b/, "Sepsis criteria", () => [`qSOFA: RR ${P0.rr} (22 or more), SBP ${P0.sbp} (100 or less), GCS ${P0.gcs} (under 15).`, "Sepsis is a suspected infection with organ dysfunction (SOFA up by 2). Send cultures and a lactate, and give an antibiotic within the hour."], [["lab:cultures", "Blood cultures"], ["lab:lactate", "Lactate"], ["abx:any", "Antibiotics"]]],
    [/\b(?:xdr|mdr|extensively drug resistant|multidrug resistant|carbapenem resistant)\b/, "Resistant organism", () => ["Confirm it on the culture and the antibiogram. For a carbapenem-resistant organism ask the microbiologist about ceftazidime-avibactam, colistin or combination therapy, and isolate the patient."], [["lab:cultures", "Blood cultures"]]],
  ];
  if (!has(/^(?:what|how|is|are|why|when|who|which|do|does|did|can|could|should)\b/) || has(/^(?:is there|are there) (?:any )?evidence\b|^(?:look|check) for\b/)) for (const [re, title, f, items] of FIND) {
    if (!re.test(n)) continue;
    const lines = f(); out.cards.push(card("mdt:find:" + title.slice(0, 12), title, lines, { tone: "info", actions: items.map(([o, l]) => ({ label: l, order: o })), spoken: title + ". " + lines[1] })); return out;
  }

  // --- checks that are a look or a measurement, with no order of their own: say what to do and offer the nearest orders
  const CHK = [
    [/\bpneumothorax\b/, "Look for a pneumothorax", ["Listen for reduced air entry, look for hyperresonance, and check the ventilator pressures.", "Lung ultrasound (no sliding) or a chest X-ray. In a tension pneumothorax with shock, decompress without waiting for the film."], [["img:usg", "Lung ultrasound"], ["img:cxr", "Chest X-ray"]]],
    [/\bpassive leg rais\w*|\bplr\b/, "Passive leg raise", ["Lie him semi-recumbent, then raise the legs to 45 degrees for 60 to 90 seconds.", "A rise of 10% or more in cardiac output or stroke volume, by echo or an arterial line, means he is fluid responsive."], [["img:echo", "Bedside echo"], ["proc:artline", "Arterial line"]]],
    [/\bsvr\b|systemic vascular resistance/, "Systemic vascular resistance", [`SVR = 80 × (MAP − CVP) ÷ cardiac output. MAP is ${P0.map} now; the cardiac output comes from an echo or a monitor.`, "Low in vasoplegic and septic shock, high in cardiogenic and hypovolaemic shock."], [["img:echo", "Bedside echo"]]],
    [/\bppv\b|pulse pressure variation|stroke volume variation|\bsvv\b/, "Pulse pressure variation", ["Above 12% predicts fluid responsiveness, but only in sinus rhythm, on a ventilator with a tidal volume of 8 mL/kg or more and no spontaneous breaths.", "It needs an arterial line."], [["proc:artline", "Arterial line"]]],
    [/gastric residual|\bgrv\b|feeding intolerance|feed intolerance/, "Gastric residual volume", ["Aspirate through the nasogastric tube. Hold the feeds and add a prokinetic if the residual is above 500 mL or he vomits or is distended."], [["proc:ngt", "Nasogastric tube"]]],
    [/\bcardiac (?:output|index)\b|\bstroke volume\b|\bcontractility\b|\bafterload\b|\bpreload\b/, "Cardiac output and filling", ["A bedside echo gives the output (VTI), the IVC, and LV and RV function. A passive leg raise tests preload.", `MAP ${P0.map}, HR ${P0.hr}${P0.norepi ? ", on noradrenaline" : ""}.`], [["img:echo", "Bedside echo"]]],
    [/\bscvo2\b|central venous oxygen|\blactate clearance\b/, "Is the tissue getting oxygen?", ["Lactate clearance of 10% or more over two hours is reassuring. ScvO₂ below 70% suggests low delivery or high extraction; it needs a central line.", P0.lactate != null ? `Lactate now ${P0.lactate}.` : "No lactate yet."], [["lab:lactate", "Lactate"], ["proc:cvc", "Central line"]]],
    [/\bgag reflex\b|\bairway protection\b|\bprotect (?:the |his |her )?airway\b|\bcuff pressure\b|\btube position\b|\bconfirm (?:the )?(?:endotracheal )?tube\b/, "Airway and tube check", [P0.tube ? "Confirm the tube with waveform capnography, equal air entry and the depth at the teeth. Cuff pressure should be 20 to 30 cmH₂O." : `GCS ${P0.gcs}. A gag and cough reflex, the ability to clear secretions and a GCS above 8 mean he can usually protect his airway.`, "A chest X-ray confirms the tube tip above the carina."], [["img:cxr", "Chest X-ray"], ["examine", "Examine now"]]],
    [/\bvexus\b|\bivc\b|venous congestion/, "Venous congestion", ["Plethoric IVC, hepatic vein and portal vein pulsatility, and a renal venous flow pattern argue for decongestion, not fluid.", "A bedside ultrasound is the tool."], [["img:usg", "Bedside ultrasound"]]],
    [/drug interactions?|\bcontraindications?\b|reconcile (?:the )?medication|medication chart|cumulative dose|renal dosing|adjust\w* (?:for|according to) renal|renal function dose|change the route|convert (?:iv )?(?:medication )?to oral|\bhold the medication\b/, "Medication review", [(() => { const g = Object.keys(P0.given || {}).filter((k) => H.given(P, k)).map((k) => BY_ID[k] ? BY_ID[k].label : k); return g.length ? "Given so far: " + g.slice(0, 10).join(", ") + "." : "Nothing has been given yet."; })(), P0.cr != null ? `Creatinine ${P0.cr}: adjust renally cleared drugs (many antibiotics, enoxaparin) and avoid nephrotoxins.` : "Check the kidney function before dosing renally cleared drugs.", "Tell me the drug and I will check it."], []],
    [/^(?:please )?(?:give|start|increase|reduce|decrease|lower|raise|adjust|change|titrate|halve|double|continue|resume|withhold|discontinue|stop|administer) (?:the |a |an )?(?:loading|maintenance|current|usual|same|previous)? ?(?:dose|dosing|rate|infusion rate|medication|medicine|drug|infusion|bolus)\b|^(?:administer|give|run|change|convert|switch) (?:it |this |that )?(?:as|to|into) (?:an? )?(?:infusion|bolus|oral|iv)\b/, "Which drug?", ["Say the drug with it, for example ‘give a loading dose of amiodarone’ or ‘reduce the noradrenaline’.", (() => { const g = Object.keys(P0.given || {}).filter((k) => /^(?:drug|abx):/.test(k) && H.given(P, k)).map((k) => BY_ID[k] ? BY_ID[k].label : k); return g.length ? "Running or given: " + g.slice(0, 8).join(", ") + "." : ""; })()], []],
  ];
  if (!has(/^(?:what|how|is|are|why|when|who|which)\b/) || has(/^(?:check|show)\b/)) for (const [re, title, lines, items] of CHK) {
    if (!re.test(n)) continue;
    if (/^which drug/i.test(title) && (labelsOf(n).orders.length || /\?\s*$/.test(n) || /^(?:should|can we|could we|do we)\b/.test(n))) break;
    out.cards.push(card("mdt:chk:" + title.slice(0, 12), title, lines, { tone: "info", actions: items.map(([o, l]) => ({ label: l, order: o })), spoken: title + ". " + lines[0] })); return out;
  }

  // --- the written record
  if (has(/^(?:summari[sz]e|sum up|recap|brief)\b.*\b(?:case|patient)\b|^(?:summary of|sit ?rep on) (?:the )?case\b/)) {
    const done = Object.keys((P0.given) || {}).filter((k) => H.given(P, k)).map((k) => (BY_ID[k] ? BY_ID[k].label : k)).slice(0, 10);
    out.cards.push(card("mdt:sumcase", "Case summary", [story ? story.title + ". " + story.text : "", P ? `Now: BP ${P.sbp}/${P.dbp}, HR ${P.hr}, SpO₂ ${P.spo2}%, RR ${P.rr}, GCS ${P.gcs}.` : "", done.length ? "Done: " + done.join(", ") + "." : "Nothing has been ordered yet.", P && P.pctDone != null ? `${P.pctDone}% of the care is done.` : ""], { tone: "info", section: "history", spoken: "Here is the summary." })); return out;
  }
  if (has(/^(?:summari[sz]e|sum up|recap)\b.*\b(?:discussion|meeting|mdt|conversation)\b|^(?:summari[sz]e|sum up)\s*$|^(?:document|record|write up|minute)\b.*\b(?:discussion|meeting|mdt)\b|^(?:generate|make|write) (?:the )?(?:mdt )?(?:notes|minutes|summary)\b/)) {
    const said = Object.entries(st.said).filter(([, t]) => t).map(([sp, t]) => `${SPEC_LABEL[sp] || sp}: ${t}`), done = Object.keys((P0.given) || {}).filter((k) => H.given(P, k)).map((k) => (BY_ID[k] ? BY_ID[k].label : k)).slice(0, 8);
    const doc = has(/document|record|write up|minute|notes|minutes/);
    out.cards.push(card("mdt:notes", doc ? "MDT notes" : "Discussion so far", [`${nowMin} min into the case. ${story ? story.title + "." : ""}`, ...(said.length ? said : ["No specialist has spoken yet."]), st.disagree.length ? "Disagreement: " + st.disagree.map((d) => d.text).join("; ") : "No disagreement recorded.", done.length ? "Done: " + done.join(", ") + "." : "", ...st.notes.slice(-4)], { tone: "info", spoken: doc ? "The notes are written." : "That is the discussion so far." })); return out;
  }
  if (has(/^(?:prepare|draw up|make|generate|show|give me|write) (?:the |a |an )?(?:proposed )?(?:treatment|management|care) plan\b|^(?:what is|what s) (?:the |our )?(?:plan|management plan)\b|^(?:what is|what s) (?:the )?plan\b/)) {
    const called = calledOf(P0, ctx), L = P0.left || [], by = {};
    L.forEach((x) => { (by[x.owner] = by[x.owner] || []).push(x); });
    const rows = Object.keys(by).map((sp) => called.has(sp) ? `${SPEC_LABEL[sp] || sp}: ${by[sp].slice(0, 3).map((x) => x.label).join(", ")}${by[sp].length > 3 ? " and more" : ""}` : `${SPEC_LABEL[sp] || sp}: not called yet, ${by[sp].length} step${by[sp].length > 1 ? "s" : ""} wait for them`);
    const done = Object.keys((P0.given) || {}).filter((k) => H.given(P, k)).map((k) => (BY_ID[k] ? BY_ID[k].label : k)).slice(0, 8);
    out.cards.push(card("mdt:plan", "Proposed plan", [done.length ? "Done: " + done.join(", ") + "." : "Nothing done yet.", ...(rows.length ? ["To do:", ...rows] : ["Nothing more is waiting on the list. Let him settle."])], { tone: "info", section: "treat", spoken: rows.length ? "Here is the plan." : "Nothing more is waiting." })); return out;
  }
  if (has(/^(?:give me|what is|what s|show me|lets have) (?:the |our )?(?:final )?consensus\b|^finali[sz]e (?:the )?plan\b|^(?:lets |lets )?(?:proceed|go ahead|move on|move forward) with (?:the )?(?:agreed|final) plan\b|^lets proceed\b|\bfinal consensus\b/)) {
    const open = (P0.left || []).filter((x) => x.must || x.overdue); const impl = has(/proceed|go ahead|move on|move forward/);
    out.cards.push(card("mdt:consensus", impl ? "Moving to implementation" : "Consensus", [st.disagree.length ? `Open disagreement: ${st.disagree.length}. Settle it first.` : "No disagreement is recorded.", open.length ? "Agreed and still to do: " + open.slice(0, 4).map((x) => x.label).join(", ") + "." : "The decisive steps are done.", impl ? "Place the orders now. The room will carry them out." : "Say ‘let’s proceed with the agreed plan’ to start."], { tone: st.disagree.length ? "warn" : "ok", actions: open.slice(0, 3).filter((x) => BY_ID[x.id]).map((x) => ({ label: (isHigh(x.id) ? "Confirm: " : "Do now: ") + x.label, order: x.id, confirm: isHigh(x.id) })), spoken: "Here is the consensus." })); st.notes.push(`${nowMin} min: ${impl ? "moved to implementation" : "consensus asked"}.`); return out;
  }
  if (has(/^assign (?:the )?tasks\b|^who (?:will|would|is going to|should) (?:take|own|be) (?:the )?(?:responsib|charge|lead)\w*|^(?:allocate|delegate|divide) (?:the )?(?:tasks|work|responsibilit\w*)\b|^who is responsible\b|\bwho will take responsibility\b/)) {
    const L = P0.left || [], by = {}; L.forEach((x) => { (by[x.owner] = by[x.owner] || []).push(x); });
    const members = ctx.team || [], rows = Object.keys(by).map((sp) => { const who = members.filter((m) => m.specialty === sp).map((m) => m.name); return `${SPEC_LABEL[sp] || sp} (${who.length ? who.join(", ") : "no one seated"}): ${by[sp].length} step${by[sp].length > 1 ? "s" : ""}`; });
    const idle = (P0.problems || []).filter((q) => q.idle && !q.covered && q.specialty);
    out.cards.push(card("mdt:assign", "Who takes what", rows.length ? rows : ["Nothing is waiting on anyone."], { tone: "info", actions: idle.slice(0, 2).map((q) => ({ label: "Continue the " + q.specialty + " part", order: "cover", specialty: q.specialty })), spoken: rows.length ? "Here is who takes what." : "Nothing is waiting." })); return out;
  }
  return null;
}

/* ---------------------------------------------------------------- the entry point used by voice-brain */
/* splits the line, lets the meeting answer what is about the meeting, holds what is not an order,
   and returns the sentences that may go on to the order parser. */
/* a sentence is cut at its commas, so that "do not intubate yet, get an ABG" is a prohibition and an order. A comma after a bare
   "no" or after a specialist's name does not cut; "or", "and" or "then" after a soft opinion stays inside that opinion. */
const SOFT = new Set(["question", "consider", "recommend", "hypo"]);
const BARE = /^(?:no|nope|sorry|actually|wait|hold on|ok|okay|so|well|yes|hmm|doctor|dr|please|and|also|now|first|then|right|look)$/i;
function units(sentence) {
  const pieces = String(sentence).split(/,\s+|\s+(?:but)\s+(?=(?:get|start|give|send|do|check|order|call|put|insert|run|arrange|obtain|perform|examine|repeat)\b)/i).map((x) => x.trim()).filter(Boolean), out = [];
  for (let i = 0; i < pieces.length; i += 1) {
    let p = pieces[i];
    while (i + 1 < pieces.length && (BARE.test(norm(p).trim()) || (specStart(norm(p).trim()) && !specStart(norm(p).trim()).rest))) { p += ", " + pieces[i + 1]; i += 1; }
    const prev = out[out.length - 1];
    if (prev && /^(?:or|and|then|so|plus|also)\b/i.test(p) && SOFT.has(classify(prev).mode)) out[out.length - 1] = prev + ", " + p; else out.push(p);
  }
  return out;
}

const DEFQ = /^\s*(?:what does|what do you mean|what is meant|define|meaning of|explain|what is the meaning|full form of|expand|what is the full form)\b/i;
export function intent(H, raw, ctx) {
  const P = ctx.P || null, cards = [], orders = [], negated = [], pass = [], held = [];
  for (const s0 of sentences(raw)) for (const s of units(s0)) {
    if (DEFQ.test(s) || (H.lexHit && H.lexHit(s))) { pass.push(s); continue; }   // a word asked about, or a glossary phrase: the lexicon answers it
    const n = norm(s).trim(), m = meeting(H, n, P, ctx);
    if (m) { m.cards.forEach((c) => cards.push(c)); m.orders.forEach((o) => orders.push(o)); continue; }
    const c = classify(s);
    if (c.mode === "direct") { pass.push(c.corrected ? c.text : s); continue; }
    if (c.mode === "question") { const r = labelsOf(s); if (!r.orders.length && !r.negated.length && !/^(?:stop|hold|withhold|discontinue|increase|reduce|decrease|titrate|start|give|switch|change|restart|resume|wean|extubate)\b/.test(n)) { pass.push(s); continue; } }   // an information question with no order in it belongs to the answers
    const h = heldCard(H, c, P, n, s); h.cards.forEach((x) => cards.push(x)); h.negated.forEach((x) => negated.push(x)); held.push({ mode: c.mode, text: s });
    if (c.mode !== "negative" && c.mode !== "prohibit" && c.mode !== "reverse" && c.mode !== "reason" && P) { try { const r = H.readClause(H.repair(s), ctx); if (r && r.cards) r.cards.forEach((x) => { if (!cards.some((y) => y.id === x.id)) cards.push(x); }); } catch (e) { /* the held card stands alone */ } }
  }
  return { pass: pass.join(" . "), cards, orders, negated, held };
}

/* ======================================================================================
   THE UNIVERSAL QUESTION LAYER
   Any question a doctor asks the room gets an answer. First the intent (why, what next, what if ...), then the specialists who
   should speak, then one lead card that answers the intent from the live numbers. This is the offline answer. With the MDT model
   connected (mdt-ask.js) the model answers instead, and this is what stands in when the model is not there.
   The room only knows what the room has seen: vitals, results that are back, what has been given. Nothing hidden.
   ====================================================================================== */
const QINTENT = [
  ["challenge", /\b(?:challenge (?:me|my|this)|critique|devil s advocate|poke holes|am i wrong|what is wrong with (?:my|this)|argue against|disagree with me|play devil)\b/],
  ["evaluate", /\b(?:is (?:this|that|it|my (?:plan|decision|approach)) (?:correct|right|ok|okay|safe|reasonable|appropriate|good)|am i right|is this the right|did i do (?:the right|it right|well)|was (?:that|this) (?:right|correct)|check my (?:plan|decision))\b/],
  ["missing", /\b(?:what (?:am i|are we|have i|have we) (?:missing|forgotten|overlooked|overlooking)|what (?:did|have) (?:i|we) (?:miss|missed|forget|forgot)|anything (?:i am|we are|i have|we have) (?:missing|missed|forgotten)|what else (?:should|do) (?:i|we) (?:check|consider|look)|any gaps|did i miss|did we miss|overlook\w*)\b/],
  ["calculate", /\b(?:calculate|calculation|compute|\bcalc\b|what is the (?:map|shock index|anion gap|qsofa|pulse pressure|corrected \w+|p f|pf ratio)|anion gap|shock index|qsofa|pulse pressure|corrected (?:calcium|sodium)|map from)\b/],
  ["whatif", /\b(?:what (?:if|happens|will happen|would happen|can happen)|if (?:i|we) (?:give|start|increase|decrease|stop|add|do|intubate|put)|consequences?|predict|simulate|effect of|what is the risk of)\b/],
  ["compare", /\b(?:compare|comparison|versus|\bvs\b|instead of|rather than|which is better|better than|difference between|or should (?:i|we)|can i use \w+(?: \w+)? instead|choose between)\b/],
  ["stop", /\b(?:when (?:should|do|can|to) (?:i|we)? ?(?:stop|wean|withdraw|discontinue|taper|extubate)|can (?:i|we) stop|should (?:i|we) stop|time to stop|stop criteria|wean(?:ing)?)\b/],
  ["guidelines", /\b(?:guidelines?|evidence|surviving sepsis|\bssc\b|\bkdigo\b|\bats\b|\besicm\b|\bscc?m\b|trial|protocols?|recommendations? (?:say|suggest|state)|what does the .{2,30} (?:say|recommend|suggest)|is there (?:any )?evidence|is it evidence based)\b/],
  ["why", /^ ?(?:why|how come)\b|\bwhy (?:is|are|does|did|do|has|have|was|would|am|can t|cannot)\b|\b(?:what (?:is|are) (?:the )?(?:cause|causes|reason|reasons|causing)|what (?:caused|causes|explains|is behind)|causes? of|reason for|reasons for|mechanism behind)\b/],
  ["else", /\b(?:what else|differential|differentials|other (?:causes|options|possibilities|diagnoses|explanations)|alternatives?|could it be|could this be|what other|rule out|anything else)\b/],
  ["explain", /\b(?:explain|pathophysiology|mechanism|teach me|walk me through|like an? (?:intensivist|consultant|resident|student)|in simple terms|simply)\b/],
  ["next", /\b(?:what (?:should|do|can|shall|must) (?:i|we)|what next|next (?:best )?(?:step|steps|action|move)|what now|what to do|how (?:do|should|can|shall) (?:i|we)|should (?:i|we)|do (?:i|we) need to|is it time to|plan|management|how to manage|how to treat|best (?:option|approach|step)|priorities|priority|can (?:i|we)|may (?:i|we))\b/],
];
export function questionIntent(text) { const n = norm(text); for (const [k, re] of QINTENT) if (re.test(n)) return k; return /\?\s*$/.test(String(text).trim()) || /^ ?(?:what|how|is|are|does|do|can|could|would|will|which|who|where|when|tell|explain|give me|show me)\b/.test(n) ? "general" : null; }
/* a question the room should think about, not just look up. A plain "what is the BP?" is not one of these. */
export const isDeepQuestion = (text) => { const k = questionIntent(text); return !!k && k !== "general"; };

const WHO = [
  ["pulmonologist", /\b(?:lung|lungs|ventilat\w*|oxygen\w*|spo2|sats?|hypox\w*|intubat\w*|extubat\w*|peep|fio2|ards|pneumonia|niv|bipap|cpap|hfnc|prone|proning|ecmo|bronch\w*|breath\w*|respirat\w*|abg|gas|pco2|hypercap\w*|asthma|copd|pleural|chest drain|tracheost\w*)\b/],
  ["cardiologist", /\b(?:bp|blood pressure|hypotens\w*|hypertens\w*|shock|pressor\w*|vasopress\w*|noradrenaline|norepinephrine|vasopressin|dobutamine|inotrop\w*|echo|ecg|ekg|arrhythm\w*|troponin|fluid\w*|map|heart|cardiac|tamponade|pericard\w*|tachycardi\w*|bradycardi\w*|rhythm|afib|infarct\w*|mi|stemi|embol\w*|preload|afterload|cardiogenic)\b/],
  ["nephrologist", /\b(?:kidney|renal|aki|creatinine|urine|oligur\w*|anuri\w*|dialysis|crrt|rrt|potassium|hyperkal\w*|hypokal\w*|sodium|hyponat\w*|hypernat\w*|electrolytes?|acidosis|alkalosis|bicarb\w*|acid base|diuretic\w*|furosemide|fluid balance|uremi\w*|rhabdo\w*)\b/],
  ["infectious", /\b(?:antibiotic\w*|antimicrob\w*|infect\w*|sepsis|septic|culture\w*|fever|febrile|source|fung\w*|viral|virus|bacteri\w*|malaria|meningitis|mrsa|resistan\w*|de escalat\w*|procalcitonin|pct|crp|line sepsis)\b/],
  ["neurologist", /\b(?:seizure\w*|fit|fits|status|gcs|conscious\w*|stroke|icp|intracranial|brain|head|neuro\w*|sedat\w*|pupil\w*|coma|encephal\w*|cerebral|delirium|hemorrhage in the brain|ich|subdural)\b/],
  ["gastroenterologist", /\b(?:liver|hepat\w*|bleed\w*|variceal|varices|cirrho\w*|pancreat\w*|gi bleed|haematemesis|melaena|ascites|jaundice|bilirubin|inr|ammonia|encephalopathy|endoscop\w*|ulcer|gut|feeding|nutrition)\b/],
  ["surgeon", /\b(?:surg\w*|operat\w*|theatre|laparotomy|perforat\w*|debrid\w*|abdomen|abdominal|peritonit\w*|ischaemi\w*|ischemi\w*|trauma|source control|drain\w*|necrotis\w*|collection|abscess)\b/],
];
const DRUGQ = /\b(?:dose|dosing|dosage|how much|how many mg|rate|infusion rate|dilut\w*|prepar\w*|mg|mcg|units?|interaction\w*|contraindicat\w*|side effects?|adverse|toxicity|renal adjust\w*|loading|maintenance|titrat\w*)\b/;
export function whoShouldSpeak(text, P) {
  const n = norm(text), out = [];
  for (const [sp, re] of WHO) if (re.test(n)) out.push(sp);
  const named = findSpec(n); if (named && !out.includes(named)) out.unshift(named);
  if (!out.length && P) { if (P.spo2 < 92 || P.rr > 28) out.push("pulmonologist"); if (P.map < 65 || P.sbp < 90) out.push("cardiologist"); if (P.uo != null && P.uo < 35) out.push("nephrologist"); if (P.gcs < 13) out.push("neurologist"); if (P.temp > 38.3) out.push("infectious"); }
  return ["intensivist", ...out.filter((x) => x !== "intensivist")].slice(0, 4);
}
export const wantsPharmacology = (text) => DRUGQ.test(norm(text));

/* what the room can see: only numbers that are back */
const seen = (H, P, key) => { const m = H.latestItem ? H.latestItem(P, key) : null; return m ? m.it.v : null; };
function missingNow(H, P) {
  const out = [], g = (id) => H.given(P, id);
  if (P.map < 65 && !P.norepi && !g("drug:norepi")) out.push(["MAP is low and no vasopressor is running.", { label: "Noradrenaline", order: "drug:norepi" }]);
  if ((P.spo2 < 92) && !P.oxygen && !P.tube) out.push(["SpO₂ is low and he is not on any oxygen.", { label: "Oxygen", order: "proc:oxygen" }]);
  if ((P.temp > 38 || P.map < 65) && !g("lab:cultures")) out.push(["Cultures have not been sent. Send them before the antibiotic.", { label: "Blood cultures", order: "lab:cultures" }]);
  if (P.gcs < 13 && !g("lab:glucose") && !g("lab:abg")) out.push(["GCS is low and nobody has checked the glucose.", { label: "Blood glucose", order: "lab:glucose" }]);
  if (!g("lab:abg") && !g("lab:lactate")) out.push(["No blood gas or lactate yet.", { label: "ABG with lactate", order: "lab:abg" }]);
  if (!g("img:ecg") && (P.hr > 120 || P.hr < 50 || P.map < 65)) out.push(["No ECG yet, with an abnormal pulse or pressure.", { label: "ECG", order: "img:ecg" }]);
  if (!g("lab:kft") && !g("lab:lyte")) out.push(["No kidney profile or electrolytes yet.", { label: "Kidney function", order: "lab:kft" }]);
  if (!g("proc:foley") && P.map < 65) out.push(["No hourly urine output is being measured.", { label: "Urinary catheter", order: "proc:foley" }]);
  if (!g("examine")) out.push(["He has not been examined yet.", { label: "Examine now", order: "examine" }]);
  const ab = Object.keys(P.given || {}).some((x) => x.startsWith("abx:"));
  if (!ab && (P.temp > 38 || P.map < 65) && g("lab:cultures")) out.push(["Cultures are sent but no antibiotic is on.", { label: "Antibiotics", order: "abx:any" }]);
  return out;
}
function flawsIn(H, P) {
  const out = [], g = (id) => H.given(P, id);
  if (P.map < 65 && !P.norepi && (P.fluidMl || 0) >= 2000) out.push("About " + P.fluidMl + " mL of fluid is in and the MAP is still low. More fluid without a pressor risks wet lungs. Think about a vasopressor.");
  if ((P.fluidMl || 0) > 3000 && P.spo2 < 93) out.push("A lot of fluid has gone in and the saturation is low. Is he wet? Stop and test fluid responsiveness.");
  if (P.spo2 < 90 && !P.tube && P.rr > 30) out.push("He is tiring: RR " + P.rr + " and SpO₂ " + P.spo2 + "%. Waiting is a decision too.");
  if (Object.keys(P.given || {}).some((x) => x.startsWith("abx:")) && !g("lab:cultures")) out.push("Antibiotics went in with no cultures sent first. The yield falls.");
  if (P.gcs <= 8 && !P.tube) out.push("GCS " + P.gcs + " and the airway is not secured.");
  if (P.map >= 65 && P.norepi && P.sbp > 140) out.push("The pressure is good and a vasopressor is still running. Can it be weaned?");
  return out;
}
const calc = (H, P, n) => {
  const L = [], num1 = (x) => Math.round(x * 10) / 10;
  if (/shock index/.test(n) || /calculate|compute|calc/.test(n) && !/anion|corrected|qsofa|map|pulse pressure/.test(n)) if (P.sbp > 0) L.push(`Shock index = HR ÷ SBP = ${P.hr} ÷ ${P.sbp} = ${num1(P.hr / P.sbp)}. Above 0.9 to 1.0 suggests shock.`);
  if (/\bmap\b/.test(n) || /calculate|compute|calc/.test(n) && !/anion|corrected|qsofa|shock index|pulse pressure/.test(n)) L.push(`MAP = DBP + (SBP − DBP) ÷ 3 = ${P.dbp} + (${P.sbp} − ${P.dbp}) ÷ 3 = ${num1(P.dbp + (P.sbp - P.dbp) / 3)} mmHg.`);
  if (/pulse pressure/.test(n)) L.push(`Pulse pressure = SBP − DBP = ${P.sbp - P.dbp} mmHg.`);
  if (/qsofa/.test(n) || /calculate|compute|calc/.test(n) && /sofa|sepsis/.test(n)) { const pts = (P.rr >= 22 ? 1 : 0) + (P.sbp <= 100 ? 1 : 0) + (P.gcs < 15 ? 1 : 0); L.push(`qSOFA = ${pts} of 3 (RR ${P.rr}: ${P.rr >= 22 ? "1" : "0"}, SBP ${P.sbp}: ${P.sbp <= 100 ? "1" : "0"}, GCS ${P.gcs}: ${P.gcs < 15 ? "1" : "0"}). 2 or more is a high-risk screen. It screens, it does not diagnose.`); }
  if (/anion gap/.test(n)) { const na = seen(H, P, "na"), cl = seen(H, P, "cl"), hc = seen(H, P, "hco3"); L.push(na != null && cl != null && hc != null ? `Anion gap = Na − (Cl + HCO₃) = ${na} − (${cl} + ${hc}) = ${num1(na - cl - hc)} mmol/L. About 8 to 12 is normal; higher is a raised-gap acidosis.` : "I need the sodium, chloride and bicarbonate results. Send the electrolytes and a gas first."); }
  if (/corrected (?:calcium|sodium)/.test(n)) L.push("I need a reported calcium and albumin (or glucose and sodium) from the lab. Send them first.");
  return L.length ? L : [`I can work out the MAP, shock index, pulse pressure, qSOFA and the anion gap from what is on the monitor and in the results. For doses and infusion rates, use your validated protocol or the pharmacist.`];
};

const INTENT_TITLE = { next: "Next step", why: "Why this is happening", else: "What else it could be", whatif: "What if", evaluate: "Is this right?", missing: "What we may be missing", compare: "Comparing the options", stop: "When to stop or step down", guidelines: "Guidelines and evidence", calculate: "Calculation", challenge: "The team challenges the plan", explain: "Explained", general: "The team's view" };
/* the lead card for a question: answers the intent from the live numbers */
export function leadFor(H, intentKey, question, P, ctx) {
  const { card } = H, n = norm(question), r = labelsOf(question), os = quoteFor(r), A = (label, order, confirm) => ({ label, order, confirm: !!confirm });
  const base = { tone: "info" }, title = "MDT: " + (INTENT_TITLE[intentKey] || "Answer"), id = "mdt:ask:" + intentKey;
  switch (intentKey) {
    case "next": { const p = priority(P, H); return card(id, title + ": " + p.title.toLowerCase(), [...p.lines], { ...base, actions: p.acts.slice(0, 3), spoken: p.title + ". " + p.lines.join(" ") }); }
    case "missing": { const m = missingNow(H, P); const lines = m.length ? m.slice(0, 4).map((x) => x[0]) : ["Nothing obvious from the numbers. Reassess the trend, the examination and the pending results."]; return card(id, title, lines, { ...base, actions: m.slice(0, 3).map((x) => x[1]), spoken: lines.slice(0, 2).join(" ") }); }
    case "else": { const d = differential(P, H); return card(id, title, d, { ...base, spoken: d[0] }); }
    case "why": { const d = differential(P, H), pr = priority(P, H); return card(id, title, [pr.title + ".", ...pr.lines, "The usual causes, from the numbers:", ...d], { ...base, spoken: d[0] }); }
    case "stop": { const L = []; if (P.norepi) L.push("Vasopressor: wean once MAP stays above 65 with a falling lactate and good perfusion, and the cause is being treated."); if (P.tube) L.push("Ventilator: look for a spontaneous breathing trial when oxygenation is acceptable, the cause is improving, and he is awake and cardiovascularly stable."); if (Object.keys(P.given || {}).some((x) => x.startsWith("abx:"))) L.push("Antibiotics: review at 48 to 72 hours against the cultures, the source and the response. De-escalate or stop."); if ((P.fluidMl || 0) > 0) L.push("Fluids: stop when he is no longer fluid responsive, or when the lungs get wetter."); if (!L.length) L.push("Nothing is running that needs a stopping rule yet. Say what you are thinking of stopping."); return card(id, title, L, { ...base, spoken: L[0] }); }
    case "whatif": case "compare": { const L = []; for (const o of os.slice(0, 3)) { const a = advise(o.id, P, H); L.push(o.label + (a ? ": " + a : ".")); } if (!L.length) L.push(intentKey === "compare" ? "Name the options, for example ‘noradrenaline or vasopressin’." : "Say what you would give or change, for example ‘what if I give 1 litre of fluid?’"); L.push("Nothing was given. The simulation changes only when you give the order."); return card(id, title, L, { ...base, actions: actionsFor(os, P, H).slice(0, 3), spoken: L[0] }); }
    case "evaluate": case "challenge": { const f = flawsIn(H, P), m = missingNow(H, P); const L = f.length ? f.slice(0, 3) : ["On the numbers I do not see a clear error."]; if (intentKey === "challenge") { L.push("The questions I would ask: is the MAP above 65? Is he fluid responsive? Is the airway safe? Has the source been found? What does the next result change?"); if (m.length) L.push(m[0][0]); } return card(id, title, L, { ...base, actions: m.slice(0, 2).map((x) => x[1]), spoken: L[0] }); }
    case "calculate": { const L = calc(H, P, n); return card(id, title, L, { ...base, spoken: L[0] }); }
    case "guidelines": return card(id, title, ["The built-in team gives teaching points, not guideline text. Guideline wording and version need the MDT model, or your own institutional protocol.", "Doses, rates and preparation always come from a validated protocol or the pharmacist, never from this room."], { ...base, spoken: "Guideline wording needs the model or your protocol." });
    default: return null;
  }
}
/* the offline answer: a lead card, then the specialists who should speak */
export function teamAnswer(H, question, P, ctx) {
  if (!P) return { intent: questionIntent(question) || "general", cards: [], specs: [] };
  const key = questionIntent(question) || "general", specs = whoShouldSpeak(question, P), st = mstate(ctx), n = norm(question), cards = [];
  const lead = leadFor(H, key, question, P, ctx); if (lead) cards.push(lead);
  const room = specs.filter((sp) => sp !== "intensivist").slice(0, key === "calculate" || key === "guidelines" ? 0 : 2);
  const first = key === "general" || key === "explain" ? ["intensivist"] : [];
  for (const sp of [...first, ...room]) cards.push(opinion(H, sp, n, P, ctx, st));
  if (wantsPharmacology(question)) cards.push(H.card("mdt:pharm", "Clinical pharmacologist", ["Dose, infusion rate, dilution, renal and hepatic adjustment and interactions come from your validated protocol or the hospital pharmacist.", "This room does not generate doses."], { tone: "warn", spoken: "Doses come from a validated protocol, not from here." }));
  return { intent: key, cards, specs };
}
