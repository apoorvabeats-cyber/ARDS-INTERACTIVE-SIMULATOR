/* The Live updates from the home screen of the app (guidelines and papers from the societies), for the screens in the auditorium.
   It reads the same cache the app writes (sessionStorage "ccu-live-v1"), falls back to the fixed list, and refreshes from Europe PMC in the background.
   liveUpdates() -> { items(), ready }  items() is an array of { lane, topic, title, detail, when, fresh, breaking } */

const KEY = "ccu-live-v1";
const FIXED = [
  { lane: "SCCM", topic: "Guidelines", title: "Surviving Sepsis Campaign", detail: "International guidance for sepsis and septic shock", when: "Guideline" },
  { lane: "ESICM", topic: "Guidelines", title: "ESICM intensive care guidance", detail: "Haemodynamics, ventilation, and ICU practice", when: "Guideline" },
  { lane: "KDIGO", topic: "Kidney", title: "KDIGO acute kidney injury", detail: "Prevention, staging, and renal replacement", when: "Guideline" },
  { lane: "IDSA", topic: "Infection", title: "IDSA antimicrobial stewardship", detail: "Using the right drug, for the right duration", when: "Guideline" },
  { lane: "ATS", topic: "Respiratory", title: "ATS official documents", detail: "Respiratory and critical care statements", when: "Guideline" },
  { lane: "ICMR", topic: "India", title: "ICMR public health guidance", detail: "Indian Council of Medical Research", when: "Guidance" },
  { lane: "ARDS", topic: "Landmark", title: "ARDS lung-protective ventilation", detail: "Low tidal volume and pressure limitation", when: "Landmark" },
];
const LANES = [
  ["SCCM", "Sepsis", '(TITLE:"Surviving Sepsis Campaign" OR TITLE:"Society of Critical Care Medicine") AND (guideline OR consensus OR recommendation OR update) NOT TITLE:corrigendum'],
  ["ESICM", "Intensive care", 'TITLE:"European Society of Intensive Care Medicine" NOT TITLE:corrigendum NOT TITLE:erratum'],
  ["KDIGO", "Kidney", 'TITLE:"Kidney Disease: Improving Global Outcomes" OR (TITLE:KDIGO AND (TITLE:guideline OR TITLE:"clinical practice" OR TITLE:recommendation))'],
  ["IDSA", "Infection", 'TITLE:"Infectious Diseases Society of America" AND (guideline OR stewardship OR antimicrobial OR resistance OR fungal OR sepsis)'],
  ["ATS", "Respiratory", 'TITLE:"American Thoracic Society" AND (TITLE:ARDS OR TITLE:"mechanical ventilation" OR TITLE:"noninvasive respiratory" OR TITLE:pneumonia OR TITLE:"critical care" OR TITLE:sepsis OR TITLE:"respiratory failure")'],
  ["ICMR", "India", '(AFF:"Indian Council of Medical Research" OR TITLE:"Indian Council of Medical Research") AND (TITLE:"intensive care" OR TITLE:ICU OR TITLE:sepsis OR TITLE:antimicrobial OR TITLE:fungal OR TITLE:ventilator OR TITLE:stewardship)'],
];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const clean = (s) => String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

export function liveUpdates() {
  let list = FIXED.slice(), at = 0;
  try { const j = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (j && j.items && j.items.length) { list = j.items; at = j.at || 0; } } catch (e) {}
  async function refresh() {
    try {
      const got = await Promise.all(LANES.map(async ([lane, topic, q]) => {
        try {
          const r = await fetch("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=4&resultType=lite&sort=P_PDATE_D%20desc&query=" + encodeURIComponent(q), { signal: AbortSignal.timeout(8000) });
          if (!r.ok) return null; const res = (await r.json()).resultList; let a = res && res.result; a = a ? (Array.isArray(a) ? a : [a]) : [];
          for (const e of a) { const title = clean(e.title); if (!title || title.length < 12 || /corrigendum|erratum|author correction/i.test(title)) continue;
            const d = new Date(e.firstPublicationDate || e.pubYear || 0), when = isNaN(d) ? "" : d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear();
            return { lane, topic, title, detail: clean(e.journalTitle) || "Europe PMC", when, fresh: true }; }
        } catch (e) {} return null;
      }));
      const fresh = got.filter(Boolean); if (fresh.length) { list = fresh.concat(FIXED.filter((f) => !fresh.some((x) => x.lane === f.lane))); at = Date.now(); try { sessionStorage.setItem(KEY, JSON.stringify({ at, items: list, live: fresh.length })); } catch (e) {} }
    } catch (e) {}
  }
  if (!at || Date.now() - at > 18e5) refresh();
  setInterval(() => { refresh(); }, 18e5);
  return { items: () => list };
}
