/* The Live updates (guidelines and papers from the societies), shared by the home screen and the screens in the auditorium.
   Same sources as the app's own live strip: the fixed society links below, refreshed from Europe PMC (newest paper per society) every half hour.
   It reads and writes the same cache the app uses (sessionStorage "ccu-live-v1").
   liveUpdates() -> { items(), version(), refresh() }
   items() is an array of { lane, topic, title, detail, href, when, fresh, breaking } and every item carries a link to open. */

const KEY = "ccu-live-v1", LIVE_MS = 18e5, COLD_MS = 12e4, NEW_MS = 2592e6;
const FIXED = [
  { lane: "SCCM", topic: "Guidelines", title: "Surviving Sepsis Campaign", detail: "International guidance for sepsis and septic shock", href: "https://www.sccm.org/SurvivingSepsisCampaign/Guidelines", when: "Guideline" },
  { lane: "ESICM", topic: "Guidelines", title: "ESICM intensive care guidance", detail: "Haemodynamics, ventilation, and ICU practice", href: "https://www.esicm.org/resources/guidelines/", when: "Guideline" },
  { lane: "KDIGO", topic: "Kidney", title: "KDIGO acute kidney injury", detail: "Prevention, staging, and renal replacement", href: "https://kdigo.org/guidelines/acute-kidney-injury/", when: "Guideline" },
  { lane: "IDSA", topic: "Infection", title: "IDSA antimicrobial stewardship", detail: "Using the right drug, for the right duration", href: "https://www.idsociety.org/practice-guideline/antimicrobial-stewardship/", when: "Guideline" },
  { lane: "ATS", topic: "Respiratory", title: "ATS official documents", detail: "Respiratory and critical care statements", href: "https://www.thoracic.org/statements/", when: "Guideline" },
  { lane: "ICMR", topic: "India", title: "ICMR public health guidance", detail: "Indian Council of Medical Research", href: "https://www.icmr.gov.in/", when: "Guidance" },
  { lane: "ARDS", topic: "Landmark", title: "ARDS lung-protective ventilation", detail: "Low tidal volume and pressure limitation", href: "https://pubmed.ncbi.nlm.nih.gov/10793162/", when: "Landmark" },
].map((x) => Object.assign({ fresh: false }, x));
const LANES = [
  { lane: "SCCM", topic: "Sepsis", queries: ['(TITLE:"Surviving Sepsis Campaign" OR TITLE:"Society of Critical Care Medicine") AND (guideline OR consensus OR recommendation OR update) NOT TITLE:corrigendum'] },
  { lane: "ESICM", topic: "Intensive care", queries: ['TITLE:"European Society of Intensive Care Medicine" NOT TITLE:corrigendum NOT TITLE:erratum'] },
  { lane: "KDIGO", topic: "Kidney", queries: ['TITLE:"Kidney Disease: Improving Global Outcomes" OR (TITLE:KDIGO AND (TITLE:guideline OR TITLE:"clinical practice" OR TITLE:recommendation))'] },
  { lane: "IDSA", topic: "Infection", queries: ['TITLE:"Infectious Diseases Society of America" AND (guideline OR stewardship OR antimicrobial OR resistance OR fungal OR sepsis)', 'TITLE:ESCMID AND (TITLE:guideline OR TITLE:guidance OR TITLE:consensus)'] },
  { lane: "ATS", topic: "Respiratory", queries: ['TITLE:"American Thoracic Society" AND (TITLE:ARDS OR TITLE:"mechanical ventilation" OR TITLE:"noninvasive respiratory" OR TITLE:pneumonia OR TITLE:"critical care" OR TITLE:sepsis OR TITLE:"respiratory failure")'] },
  { lane: "ICMR", topic: "India", queries: ['(AFF:"Indian Council of Medical Research" OR TITLE:"Indian Council of Medical Research") AND (TITLE:"intensive care" OR TITLE:ICU OR TITLE:sepsis OR TITLE:antimicrobial OR TITLE:fungal OR TITLE:ventilator OR TITLE:stewardship)'] },
];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const clean = (s) => String(s == null ? "" : s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, c) => String.fromCharCode(Number(c))).replace(/\s+/g, " ").trim();
const skip = (t) => t.length < 12 || t.startsWith("[") || /corrigendum|erratum|author correction|retraction|chatgpt|rethinking|\bdebate\b|\bcommentary\b|\bperspective\b/i.test(t) || /^(comment on|reply\b|response to|letter:)/i.test(t);
const when = (ms) => { if (!ms) return "New"; const d = new Date(ms); return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); };
const stamp = (e) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(e.firstPublicationDate)); if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]); const y = Number(clean(e.pubYear)); return y > 1990 ? Date.UTC(y, 0, 1) : 0; };
const rank = (t) => /guideline|guidance|consensus|recommendation|official|statement|update/i.test(t) ? 1 : 0;
const parse = (e, lane, topic) => {
  const title = clean(e.title); if (!title || skip(title)) return null;
  const pmid = clean(e.pmid), doi = clean(e.doi), href = pmid ? "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/" : doi ? "https://doi.org/" + doi : ""; if (!href) return null;
  const ms = stamp(e), age = Date.now() - ms;
  return { lane, topic, title, detail: clean(e.journalTitle) || "Europe PMC", href, when: when(ms), ms, fresh: true, breaking: ms > 0 && age >= -1728e5 && age < NEW_MS };
};
async function search(q) {
  const r = await fetch("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=4&resultType=lite&sort=P_PDATE_D%20desc&query=" + encodeURIComponent(q), { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const a = ((await r.json()).resultList || {}).result; return a ? (Array.isArray(a) ? a : [a]) : [];
}
async function lane(L) {
  const out = [];
  for (const q of L.queries) {
    try {
      const got = (await search(q)).map((e) => parse(e, L.lane, L.topic)).filter((x) => x && !out.some((o) => o.href === x.href || o.title === x.title));
      got.sort((a, b) => rank(b.title) - rank(a.title)); if (got[0]) out.push(got[0]);
    } catch (e) {}
  }
  return out.slice(0, L.queries.length > 1 ? 2 : 1);
}
const order = (a, b) => (!!b.breaking === !!a.breaking ? (b.ms || 0) - (a.ms || 0) : Number(!!b.breaking) - Number(!!a.breaking));

export function liveUpdates() {
  let list = FIXED.slice(), at = 0, live = 0, ver = 0, busy = null;
  try {
    const j = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (j && j.items && j.items.length && j.at) { list = j.items.map((x) => (x.href ? x : Object.assign({}, x, (FIXED.find((f) => f.lane === x.lane) || {}).href ? { href: FIXED.find((f) => f.lane === x.lane).href } : {}))); at = j.at; live = j.live || 0; }
  } catch (e) {}
  function refresh() {
    if (busy) return busy;
    busy = (async () => {
      try {
        const seen = new Set(), fresh = (await Promise.all(LANES.map(lane))).flat().filter((x) => !seen.has(x.href) && (seen.add(x.href), true)).sort(order);
        if (fresh.length) {
          list = fresh.concat(FIXED.filter((f) => !seen.has(f.href))); at = Date.now(); live = fresh.length; ver++;
          try { sessionStorage.setItem(KEY, JSON.stringify({ at, items: list, live })); } catch (e) {}
        }
      } catch (e) {} busy = null;
    })();
    return busy;
  }
  if (!at || Date.now() - at > (live ? LIVE_MS : COLD_MS)) refresh();
  setInterval(refresh, LIVE_MS);
  return { items: () => list, version: () => ver, refresh };
}
