/* Turns what a doctor says into orders. No network, no model: a fast local parser.
     "do CBC, KFT, LFT, get a chest x-ray, and start meropenem"
   becomes  lab:cbc, lab:kft, lab:lft, img:cxr, abx:meropenem.
   It matches the longest known phrase first, repairs the usual speech-recognition slips (letters said one by one,
   brand names, near-misses), drops the filler, and says what it could not place. */
import { CATALOGUE, BY_ID } from "./order-catalogue.js?v=20261122a";

const UNITS = "mg|mcg|g|gm|gms|gram|grams|ml|mls|l|litre|litres|liter|liters|units?|iu|mmol|meq|mmhg|joules?|hours?|hrs?|minutes?|mins?";
const FIRST = new Set(["ct", "abg", "cbc", "kft", "lft", "ecg", "cxr", "mri", "cpr", "icd", "niv", "usg", "ekg", "rft", "abx", "crp", "ck", "bnp", "ctpa", "hfnc", "ecmo", "pcc", "txa", "ppi", "nac", "ffp", "tpa", "ivc", "evd", "rbs", "ddimer", "lp", "ua", "mp", "cvc", "ibp", "rrt", "crrt", "ptt", "inr"]);
export function tokenize(text) {
  let s = String(text || "").toLowerCase().replace(/[‘’`´]/g, "'").replace(/(\d)\s*%/g, "$1 percent").replace(/%/g, " percent ");
  s = s.replace(/'s\b/g, "s").replace(/n't\b/g, "nt").replace(/[,;:!?]/g, " | ").replace(/[^a-z0-9.|\s]/g, " ").replace(/(\d)\.(\d)/g, "$1_$2").replace(/\./g, " | ").replace(/_/g, ".");
  s = s.replace(new RegExp(`\\b\\d+(\\.\\d+)?\\s*(${UNITS})\\b`, "g"), " ");
  const raw = s.split(/\s+/).filter(Boolean), out = [];
  for (let i = 0; i < raw.length; i += 1) {                        // "c b c" -> "cbc"
    if (/^[a-z]$/.test(raw[i]) && /^[a-z]$/.test(raw[i + 1] || "")) {
      let j = i, w = ""; while (j < raw.length && /^[a-z]$/.test(raw[j])) { w += raw[j]; j += 1; }
      if (w.length >= 3 && w[0] === "a" && !FIRST.has(w) && FIRST.has(w.slice(1))) { out.push("a"); w = w.slice(1); }   // "a c t" is "a" + "ct", not "act"
      if (w === "xr" || w === "x") out.push(...w.split("")); else out.push(w);
      i = j - 1;
    } else out.push(raw[i]);
  }
  return out;
}

const STOP = new Set("| gluconate chloride sulphate sulfate hydrochloride acetate tartrate succinate gram grams gm gms mg mcg ml mls units unit litre litres liter liters bolus iv im doses tablet tablets she he they their checked sent given started please also urgent please a an the of for on in at to with and then also plus we i me us you your please kindly now stat urgent urgently immediately get do done order send start give put patient him her his hers it this that is are be ok okay sir doctor dr sister nurse as soon possible quickly fast first next after before right away request requesting ordering ordered organise organize arrange run check take make begin commence initiate administer apply set up out off again one two three four five six ten twenty thirty fifty hundred thousand million point per times every hourly hour hours minutes minute mins over dose dosage loading maintenance lets let need needs want would like can could should must have has just so yes yeah okay alright going will shall them they these those some any more another new fresh immediate emergency emergent additionally further continue keep sending giving doing getting starting putting taking making".split(" "));
const NEG = new Set(["no", "not", "dont", "dont", "never", "cancel", "stop", "without", "avoid", "hold", "skip", "nope", "negative", "dontt"]);

const SPEC_WORDS = [
  ["nephrologist", ["nephrologist", "nephrology", "nephro", "renal doctor", "kidney doctor", "renal physician", "renal team"]],
  ["cardiologist", ["cardiologist", "cardiology", "cardio", "heart doctor", "cardiac team"]],
  ["pulmonologist", ["pulmonologist", "pulmonology", "pulmo", "chest physician", "lung doctor", "respiratory physician"]],
  ["infectious", ["infectious disease", "infectious diseases", "infectious", "id doctor", "id specialist", "id team", "id consultant", "microbiologist", "microbiology"]],
  ["gastroenterologist", ["gastroenterologist", "gastroenterology", "gastro", "gi doctor", "gi team", "hepatologist", "gi specialist"]],
  ["surgeon", ["surgeon", "surgical team", "surgery team", "general surgeon", "surgical registrar", "surgeons", "surgical"]],
  ["neurologist", ["neurologist", "neurology", "neuro", "neurosurgeon", "neurosurgery", "neurosurgical"]],
];
const CT_PARTS = { head: "img:cthead", brain: "img:cthead", cranial: "img:cthead", skull: "img:cthead", chest: "img:ctchest", thorax: "img:ctchest", lungs: "img:ctchest", lung: "img:ctchest", hrct: "img:ctchest", abdomen: "img:ctabd", abdominal: "img:ctabd", pelvis: "img:ctabd", abdo: "img:ctabd", "whole abdomen": "img:ctabd", angiogram: "img:ctangio", angio: "img:ctangio", angiography: "img:ctangio", mesenteric: "img:ctangio", pulmonary: "img:ctpa", ctpa: "img:ctpa", "pulmonary angiogram": "img:ctpa", "angio chest": "img:ctpa", "angiogram chest": "img:ctpa", "angiogram abdomen": "img:ctangio" };
const X_PARTS = { abdomen: "img:xabd", abdominal: "img:xabd", kub: "img:xabd", abdo: "img:xabd", chest: "img:cxr", lungs: "img:cxr", thorax: "img:cxr" };
const CT_FILL = new Set(["scan", "scans", "of", "the", "a", "and", "plus", "with", "also", "whole", "contrast", "plain", "non", "ncct", "cect", "at"]);
const X_FILL = new Set(["of", "the", "a", "and", "plus", "also"]);
const CALL_VERBS = new Set(["call", "page", "inform", "involve", "ask", "get", "bring", "consult", "alert", "summon", "request", "need", "want", "tell"]);

/* ---------------------------------------------------------------- the index */
const phrase = (s) => tokenize(s).join(" ");
const EXACT = new Map(), FUZZY = [], BYWORD = new Map();
let MAXLEN = 1;
for (const o of CATALOGUE) {
  const forms = new Set([...(o.say || []), o.label, o.id.split(":")[1] || o.id].map(phrase).filter(Boolean));
  for (const f of forms) {
    if (!EXACT.has(f)) EXACT.set(f, o.id);
    MAXLEN = Math.max(MAXLEN, f.split(" ").length);
    if (f.replace(/ /g, "").length >= 5) FUZZY.push([f, o.id]);
  }
}
const skeleton = (w) => w.replace(/[aeiouy]/g, "").replace(/(.)\1+/g, "$1");
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) { const cur = [i]; let best = i; for (let j = 1; j <= n; j += 1) { const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); cur[j] = v; if (v < best) best = v; } if (best > max) return max + 1; prev = cur; }
  return prev[n];
}
function fuzzyFind(w) {
  const joined = w.replace(/ /g, ""); if (joined.length < 5) return null;
  const max = joined.length <= 6 ? 1 : joined.length <= 10 ? 2 : 3; let best = null, bd = 99, tie = false;
  for (const [f, id] of FUZZY) {
    const fj = f.replace(/ /g, ""); const d = lev(joined, fj, max);
    if (d <= max) { if (d < bd) { bd = d; best = id; tie = false; } else if (d === bd && id !== best) tie = true; }
  }
  if (best && !tie) return best;
  if (!best && joined.length >= 7) { const sk = skeleton(joined); if (sk.length >= 4) { const hits = new Set(FUZZY.filter(([f]) => skeleton(f.replace(/ /g, "")) === sk).map((x) => x[1])); if (hits.size === 1) return [...hits][0]; } }
  return null;
}

const CHOICES = {
  "abx:any": ["abx:meropenem", "abx:piptaz", "abx:ceftriaxone", "abx:vancomycin", "abx:cefoperazone", "abx:azithromycin", "abx:metronidazole", "abx:oseltamivir"],
  ct: ["img:cthead", "img:ctchest", "img:ctabd", "img:ctpa", "img:ctangio"],
};

/* ---------------------------------------------------------------- the parser */
export function parseOrders(text) {
  const tokens = tokenize(text), orders = [], unknown = [], negated = [], clarify = [], seen = new Set();
  const push = (id, heard, extra) => { if (seen.has(id + (extra && extra.specialty || ""))) return; seen.add(id + (extra && extra.specialty || "")); orders.push({ id, label: id === "call" ? "Call " + (extra && extra.label) : BY_ID[id].label, heard, ...(extra || {}) }); };
  let i = 0, negPending = false;
  const eat = (id) => { if (negPending) { negPending = false; negated.push(BY_ID[id].label); return true; } return false; };
  while (i < tokens.length) {
    if (tokens[i] === "|") { negPending = false; i += 1; continue; }
    if (NEG.has(tokens[i])) { negPending = true; i += 1; continue; }
    // "call the nephrologist"
    if (CALL_VERBS.has(tokens[i])) {
      let hit = null;
      for (let skip = 1; skip <= 3 && !hit; skip += 1) for (const [sp, words] of SPEC_WORDS) for (const w of words) { const wt = w.split(" "); if (wt.every((x, k) => tokens[i + skip + k] === x)) { hit = { sp, len: skip + wt.length, w }; break; } }
      if (hit && (tokens[i] !== "get" && tokens[i] !== "need" && tokens[i] !== "want" && tokens[i] !== "request" || true)) { const lab = hit.sp === "infectious" ? "infectious disease" : hit.sp; push("call", tokens.slice(i, i + hit.len).join(" "), { specialty: hit.sp, label: lab }); i += hit.len; continue; }
    }
    // "CT scan of the abdomen", "CT chest and abdomen", "x-ray of the abdomen", "MRI of the brain": the body part comes a word or two later
    if (tokens[i] === "ct" || tokens[i] === "xray" || (tokens[i] === "x" && tokens[i + 1] === "ray")) {
      const isCt = tokens[i] === "ct", PARTS = isCt ? CT_PARTS : X_PARTS, FILL = isCt ? CT_FILL : X_FILL;
      let k = i + (tokens[i] === "x" ? 2 : 1); const parts = [];
      while (k < tokens.length) { const two = tokens[k] + " " + tokens[k + 1]; if (PARTS[two]) { parts.push(PARTS[two]); k += 2; } else if (PARTS[tokens[k]]) { parts.push(PARTS[tokens[k]]); k += 1; } else if (FILL.has(tokens[k])) k += 1; else break; }
      let chosen = parts;
      if (isCt && parts.some((x) => x === "img:ctangio" || x === "img:ctpa")) chosen = parts.includes("img:ctpa") || parts.includes("img:ctchest") ? ["img:ctpa"] : ["img:ctangio"];
      else if (!isCt && !parts.length) chosen = ["img:cxr"];
      if (chosen.length) { const heard = tokens.slice(i, k).join(" "); for (const id of [...new Set(chosen)]) { if (!eat(id)) push(id, heard); } i = Math.max(k - (FILL.has(tokens[k - 1]) ? 1 : 0), i + 1); continue; }
    }
    // the longest known phrase starting here
    let found = null;
    for (let len = Math.min(MAXLEN, tokens.length - i); len >= 1 && !found; len -= 1) { const f = tokens.slice(i, i + len).join(" "), id = EXACT.get(f); if (id) found = { id, len, heard: f }; }
    // a near-miss, one to three words
    if (!found && !STOP.has(tokens[i])) for (let len = Math.min(3, tokens.length - i); len >= 1 && !found; len -= 1) {
      const win = tokens.slice(i, i + len); if (STOP.has(win[0]) || STOP.has(win[len - 1]) || NEG.has(win[0]) || win.includes("|")) continue;
      const id = fuzzyFind(win.join(" ")); if (id) found = { id, len, heard: win.join(" "), fuzzy: true };
    }
    if (found && found.id.startsWith("lab:") && (tokens[i - 1] === "for" || (tokens[i - 1] === "the" && tokens[i - 2] === "for"))) { i += found.len; continue; }
    if (found) {
      if (eat(found.id)) { i += found.len; continue; }
      const extra = { fuzzy: !!found.fuzzy }; if (CHOICES[found.id]) { extra.choose = CHOICES[found.id].map((c) => ({ id: c, label: BY_ID[c].label })); extra.chooseWhy = "Which antibiotic?"; }
      push(found.id, found.heard, extra); i += found.len; continue;
    }
    const w = tokens[i];
    if (w === "ct" || w === "scan" || w === "scans") { if (w === "ct" && !seen.has("ct")) { seen.add("ct"); clarify.push({ id: "ct", prompt: "CT of which part?", options: CHOICES.ct.map((c) => ({ id: c, label: BY_ID[c].label })) }); } }
    else if (!STOP.has(w) && !/^\d+(\.\d+)?$/.test(w)) unknown.push(w);
    i += 1;
  }
  if (orders.some((o) => o.id.startsWith("abx:") && o.id !== "abx:any")) for (let k = orders.length - 1; k >= 0; k -= 1) if (orders[k].id === "abx:any") orders.splice(k, 1);
  return { text: String(text || "").trim(), orders, unknown: groupUnknown(unknown), negated, clarify };
}
function groupUnknown(ws) { return ws.length ? [ws.join(" ")] : []; }

/* what the room is told for one order: the canonical kind, and the specialty for a call */
export function toKind(o) { return o.id === "call" ? { kind: "call", specialty: o.specialty } : { kind: o.id }; }
