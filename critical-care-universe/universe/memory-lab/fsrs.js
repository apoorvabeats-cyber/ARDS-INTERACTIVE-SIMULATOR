/* FSRS-4.5 spaced repetition: the engine decides when each card returns, from the card's own history.
   Grades: 1 Again, 2 Hard, 3 Good, 4 Easy.  Card progress: { s: stability(days), d: difficulty 1-10, due, last, reps, lapses, st: 0 new / 1 learning / 2 review / 3 relearning } */
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5, FACTOR = 19 / 81, DAY = 864e5, STEP = 10 * 60 * 1000;
const clampD = (d) => Math.min(10, Math.max(1, d));
const d0 = (g) => clampD(W[4] - W[5] * (g - 3));
export const retrievability = (days, s) => Math.pow(1 + FACTOR * Math.max(0, days) / s, DECAY);
export const intervalFor = (s, r) => Math.max(1, Math.round(s / FACTOR * (Math.pow(r || 0.9, 1 / DECAY) - 1)));
export function schedule(p, g, now, retention) {
  const n = Object.assign({ reps: 0, lapses: 0, ok: 0, n: 0 }, p || {}), was = p ? p.st : 0;
  n.reps += 1; n.n += 1; if (g > 1) n.ok += 1;
  if (!p || !p.s) { n.s = Math.max(0.1, W[g - 1]); n.d = d0(g); }
  else {
    const dt = Math.max(0, (now - (p.last || now)) / DAY), r = retrievability(dt, p.s);
    n.d = clampD(W[7] * W[4] + (1 - W[7]) * (p.d - W[6] * (g - 3)));
    if (g === 1) { n.s = Math.max(0.1, Math.min(p.s, W[11] * Math.pow(n.d, -W[12]) * (Math.pow(p.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)))); n.lapses += 1; }
    else n.s = p.s * (1 + Math.exp(W[8]) * (11 - n.d) * Math.pow(p.s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
  }
  n.last = now;
  if (g === 1) { n.st = was === 2 || was === 3 ? 3 : 1; n.due = now + STEP; n.iv = 0; }
  else { n.st = 2; n.iv = intervalFor(n.s, retention); if (g === 2 && n.iv < 1) n.iv = 1; n.due = now + n.iv * DAY; }
  return n;
}
/* what each button would do, shown on the button so the doctor sees the consequence */
export const preview = (p, now, retention) => [1, 2, 3, 4].map((g) => { const n = schedule(p, g, now, retention); return n.st === 2 ? n.iv : 0; });
export const fmtIv = (d) => d <= 0 ? "10 min" : d < 30 ? d + (d === 1 ? " day" : " days") : d < 365 ? (d / 30.4).toFixed(d < 90 ? 1 : 0).replace(/\.0$/, "") + " mo" : (d / 365).toFixed(1).replace(/\.0$/, "") + " yr";
