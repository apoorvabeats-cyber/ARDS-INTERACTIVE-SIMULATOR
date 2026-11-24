import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { Dp, Np, Pp, COVER, eligibleCases, caseWeights, pickCase } from './case-engine.js';
import { CASES, CASE_BY_ID, ALL_SPECS, END } from './case-pool.js';
import { BY_ID, canon } from './order-catalogue.js';
import { buildSegment } from './build-engine.mjs';

const ALL = ['intensivist', ...ALL_SPECS];
const A = (atMs, kind, spec = 'intensivist', payload = {}) => ({ atMs, userId: 'u-' + spec, name: 'Dr ' + spec, specialty: spec, kind, payload });
const mk = (id, team = ALL) => Dp(1, team, { caseId: id, noRemember: true, recent: [] });
function solve(nd) {
  if (nd.all) return nd.all;
  if (nd.cover) { const need = new Set(nd.cover), out = []; while (need.size) { let best = null, bn = 0; for (const id of Object.keys(COVER)) { const n = COVER[id].filter((x) => need.has(x)).length; if (n > bn) { bn = n; best = id; } } if (!best) break; out.push(best); COVER[best].forEach((x) => need.delete(x)); } return out; }
  return Array(nd.count || 1).fill(nd.any[0]);
}
function ideal(c, start = 15000) { const acts = [A(2000, 'examine')]; let t = start; for (const nd of [...c.needs].sort((a, b) => a.due - b.due)) for (const id of solve(nd)) { acts.push(A(t, id, nd.owner)); t += nd.count ? 17000 : 7000; } return acts; }
function firstOutcome(sc, acts, to = 1200000) { for (let m = 30000; m <= to; m += 15000) { const r = Np(sc, acts, m); if (r.outcome) return { ...r, at: m }; } return Np(sc, acts, to); }

test('the pool holds 25 cases, each with every field the engine needs', () => {
  assert.equal(CASES.length, 25); assert.equal(new Set(CASES.map((c) => c.id)).size, 25);
  for (const c of CASES) {
    for (const k of ['hr', 'sbp', 'dbp', 'spo2', 'rr', 'gcs', 'temp']) assert.equal(c.v[k].length, 3, c.id + ' ' + k);
    assert.ok(c.needs.length >= 3 && c.exam && c.story && c.dx, c.id);
    for (const nd of c.needs) { assert.ok(nd.w > 0 && nd.due > 0, c.id + nd.id); for (const id of [...(nd.any || []), ...(nd.all || [])]) assert.ok(BY_ID[id], c.id + ' unknown order ' + id); assert.ok(nd.any || nd.all || nd.cover, c.id + nd.id); }
    for (const id of Object.keys(c.harm || {})) assert.ok(BY_ID[canon(id)] || id === 'flood' || id === 'lay-flat', c.id + ' harm ' + id);
    assert.ok(!/\b(pneumonia|sepsis|septic|infarct|embolism|tamponade|ketoacidosis|meningitis|malaria|haemorrhage)\b/i.test(c.story), c.id + ' story gives the diagnosis away');
  }
});

test('a case is drawn from the specialties at the table, and never needs one that is absent', () => {
  for (const spec of ALL_SPECS) assert.ok(eligibleCases(['intensivist', spec]).length >= 3, spec + ' has fewer than 3 cases');
  assert.ok(eligibleCases(['intensivist']).every((c) => c.icu) && eligibleCases(['intensivist']).length >= 2);
  const teams = [['intensivist', 'pulmonologist'], ['intensivist', 'nephrologist', 'infectious'], ['intensivist', 'cardiologist', 'surgeon'], ['intensivist', 'neurologist'], ['intensivist', 'gastroenterologist', 'surgeon']];
  for (const team of teams) {
    const seen = new Set();
    for (let seed = 1; seed < 400; seed++) { const sc = Dp(seed, team, { noRemember: true, recent: [] }), c = CASE_BY_ID[sc.caseId]; seen.add(c.id); assert.ok(c.must.every((m) => team.includes(m)), c.id + ' needs a specialist who is not here'); assert.ok([...c.must, ...c.fit].some((m) => team.includes(m)), c.id + ' does not belong to this table'); }
    assert.ok(seen.size >= 3, team.join('+') + ' saw only ' + seen.size + ' cases');
  }
});

test('the same seed gives the same case, and the last cases are not repeated straight away', () => {
  const t = ['intensivist', 'pulmonologist', 'nephrologist'];
  assert.equal(Dp(42, t, { noRemember: true, recent: [] }).caseId, Dp(42, t, { noRemember: true, recent: [] }).caseId);
  const w = caseWeights(t, ['cap', 'aki']); assert.ok(w.find((x) => x.c.id === 'cap').w < w.find((x) => x.c.id === 'copd').w / 5);
  let repeats = 0; for (let seed = 1; seed < 300; seed++) if (pickCase(seed, t, ['cap', 'aki', 'pe']).id === 'cap') repeats++; assert.ok(repeats < 12, 'repeated too often: ' + repeats);
});

test('every case can be saved by the right steps, and gets the patient holding', () => {
  for (const c of CASES) {
    const r = firstOutcome(mk(c.id), ideal(c));
    assert.equal(r.outcome, 'held', c.id + ' did not hold: ' + r.outcome + ' s=' + r.deterioration + ' missed ' + r.missed.join('; '));
    assert.ok(r.alive && r.lactate < 3 || ['mala', 'status', 'trauma', 'mesenteric'].includes(c.id), c.id + ' lactate ' + r.lactate);
  }
});

test('each disease ends by its own mark: 85 to 90% of the care, and the steps that decide that disease', () => {
  for (const c of CASES) {
    const e = END[c.id]; assert.ok(e, c.id + ' has no ending'); assert.ok(e.pct >= 0.85 && e.pct <= 0.9, c.id + ' pct ' + e.pct); assert.ok(e.must.length >= 1 && e.must.every((id) => c.needs.some((nd) => nd.id === id)), c.id + ' must'); assert.ok(e.win.length > 60, c.id + ' win text');
  }
  assert.ok(new Set(CASES.map((c) => END[c.id].win)).size === CASES.length, 'every ending is its own');
});

test('the case does not end below its mark, however long it runs, and ends once the mark is reached', () => {
  const c = CASE_BY_ID.cap, full = ideal(c); // o2, abx, img, gas, cx
  const lacking = full.filter((a) => !/lab:(abg|lactate)|lab:cultures/.test(a.kind)); // img only: 7/9 = 78%
  for (const m of [300000, 600000, 1100000]) { const r = Np(mk('cap'), lacking, m); assert.notEqual(r.outcome, 'held', 'ended at ' + m + ' with ' + r.pctDone + '%'); assert.ok(r.pctDone < r.pctNeeded); }
  const enough = full.filter((a) => !/lab:cultures/.test(a.kind)); // 8/9 = 89%
  const r = firstOutcome(mk('cap'), enough); assert.equal(r.outcome, 'held'); assert.ok(r.pctDone >= r.pctNeeded && r.outcomeLine.includes('Oxygen was in time'));
  assert.equal(r.pending.length, 0); assert.ok(r.problems.every((p) => p.resolved));
});

test('the steps that decide a disease cannot be skipped even when the percentage is high', () => {
  const c = CASE_BY_ID.tamponade, full = ideal(c), noDrain = full.filter((a) => !/pericard/.test(a.kind));
  const r = Np(mk('tamponade'), noDrain, 600000); assert.notEqual(r.outcome, 'held');
  assert.ok(r.left.some((x) => x.id === 'drain' && x.must));
});

test('asking what is left returns the steps still open, the most urgent first, with the mark to reach', () => {
  const sc = mk('aki'), r = Np(sc, [A(2000, 'examine')], 200000);
  assert.ok(r.left.length >= 4 && r.left[0].overdue && typeof r.pctDone === 'number' && r.pctNeeded >= 85);
  assert.ok(r.left.every((x, i, a) => i === 0 || !(a[i - 1].overdue === false && x.overdue)), 'overdue first');
  const done = Np(sc, ideal(CASE_BY_ID.aki), 200000); assert.ok(done.left.length < r.left.length && done.pctDone > r.pctDone);
});

test('a specialist who has done nothing is flagged, and any doctor can continue the part', () => {
  const sc = mk('aki'), acts = [A(2000, 'examine', 'intensivist'), A(10000, 'proc:oxygen', 'intensivist')];
  const idle = Np(sc, acts, 200000).problems.find((p) => p.specialty === 'nephrologist'); assert.ok(idle.idle && !idle.covered);
  const cov = Np(sc, [...acts, A(150000, 'cover', 'intensivist', { specialty: 'nephrologist' })], 200000);
  const p = cov.problems.find((q) => q.specialty === 'nephrologist'); assert.ok(p.covered && !p.idle); assert.ok(cov.log.some((l) => /continues the Nephrologist part/.test(l.text)));
  assert.ok(Pp('cover'));
  const full = firstOutcome(mk('aki'), ideal(CASE_BY_ID.aki).map((a) => ({ ...a, specialty: 'intensivist', userId: 'u-i' })));
  assert.equal(full.outcome, 'held', 'the intensivist alone can finish the case');
});

test('doing nothing is fatal, but only after minutes, never within the first few', () => {
  for (const c of CASES) {
    const sc = mk(c.id), early = Np(sc, [], 240000), end = firstOutcome(sc, [], 1500000);
    assert.ok(early.alive && early.arrestAtMs == null, c.id + ' arrested before 4 minutes');
    assert.ok(early.map > 40 || ['tbi', 'ich', 'pedema', 'status'].includes(c.id), c.id);
    assert.equal(end.outcome, 'died', c.id);
    assert.ok(end.arrestAtMs >= 420000 && end.arrestAtMs <= 840000, c.id + ' arrested at ' + end.arrestAtMs / 1000);
  }
});

test('partial care slows the decline instead of killing quickly, and the lactate falls with the right care', () => {
  for (const c of CASES) {
    const acts = ideal(c).slice(0, 1 + Math.ceil(c.needs.length / 2)), r = Np(mk(c.id), acts, 480000);
    assert.ok(r.alive, c.id + ' died with half of the care by 8 minutes');
  }
  const sc = mk('cap'), bad = Np(sc, [], 400000), good = Np(sc, ideal(CASE_BY_ID.cap), 400000);
  assert.ok(bad.lactate > good.lactate + 1, 'untreated ' + bad.lactate + ' vs treated ' + good.lactate);
});

test('orders have results that arrive after a delay, with the abnormal ones flagged', () => {
  const sc = mk('aki'), acts = [A(1000, 'lab:kft', 'nephrologist'), A(1000, 'lab:cbc', 'nephrologist'), A(2000, 'img:ecg', 'nephrologist')];
  const early = Np(sc, acts, 5000), later = Np(sc, acts, 60000);
  assert.equal(early.results.length, 0); assert.equal(early.pending.length, 3);
  const kft = later.results.find((r) => r.id === 'lab:kft'); assert.ok(kft && kft.abnormal);
  assert.ok(kft.items.find((i) => i.k === 'k').v > 6.5 && kft.items.find((i) => i.k === 'k').abn);
  assert.equal(later.results.find((r) => r.id === 'lab:cbc').items.find((i) => i.k === 'wbc').abn, false);
  assert.match(later.results.find((r) => r.id === 'img:ecg').text, /Peaked T/);
  assert.ok(later.results.every((r) => r.readyAtMs <= 60000));
});

test('voice-style kinds and the old button kinds both reach the engine', () => {
  const sc = mk('cap');
  for (const k of ['antibiotics', 'labs', 'cxr', 'oxygen', 'echo', 'norepi', 'fluid', 'abx:meropenem', 'lab:cbc', 'drug:fluids']) assert.ok(Pp(k), k);
  assert.ok(!Pp('make-coffee'));
  const r = Np(sc, [A(1000, 'labs'), A(1000, 'cxr')], 90000); assert.ok(r.results.length >= 4);
});

test('antibiotics must cover the organisms; a partial course leaves a gap', () => {
  const sc = mk('cap'), narrow = Np(sc, [A(1000, 'abx:ceftriaxone')], 20000), full = Np(sc, [A(1000, 'abx:ceftriaxone'), A(9000, 'abx:azithromycin')], 40000);
  assert.ok(narrow.needs.find((n) => n.id === 'abx').doneAtMs == null); assert.match(narrow.log.map((l) => l.text).join(' '), /gaps/);
  assert.ok(full.needs.find((n) => n.id === 'abx').doneAtMs != null);
  assert.ok(Np(sc, [A(1000, 'abx:levofloxacin')], 20000).needs.find((n) => n.id === 'abx').doneAtMs != null);
});

test('dialysis only counts once there is a catheter', () => {
  const sc = mk('aki'), no = Np(sc, [A(1000, 'proc:dialysis', 'nephrologist')], 30000), yes = Np(sc, [A(1000, 'proc:hdline', 'nephrologist'), A(9000, 'proc:dialysis', 'nephrologist')], 30000);
  assert.equal(no.dialysis, false); assert.equal(no.needs.find((n) => n.id === 'hd').doneAtMs, null);
  assert.equal(yes.dialysis, true); assert.ok(yes.needs.find((n) => n.id === 'hd').doneAtMs != null);
});

test('the wrong treatment harms: fluid in a failing heart, potassium in hyperkalaemia, an LP with no CT', () => {
  const T = (id, acts, ms = 60000) => Np(mk(id), acts, ms);
  assert.ok(T('cardiogenic', [A(1000, 'drug:fluids')]).deterioration > T('cardiogenic', []).deterioration + 0.05);
  assert.ok(T('aki', [A(1000, 'drug:kcl')]).deterioration >= 0.4);
  assert.ok(T('mening', [A(1000, 'proc:lp')]).deterioration >= 0.2); assert.equal(T('mening', [A(1000, 'img:cthead'), A(9000, 'proc:lp')]).deterioration, 0);
  assert.ok(T('varices', [A(1000, 'drug:heparin')]).deterioration >= 0.3);
  assert.ok(T('asthma', [A(1000, 'drug:betablocker')]).deterioration >= 0.4);
  assert.ok(T('cap', [A(1000, 'proc:source')]).deterioration > 0);
  assert.match(T('cap', [A(1000, 'proc:source')]).log.map((l) => l.text).join(' '), /no indication/);
});

test('repeat orders inside the window are ignored, but fluid boluses can be repeated', () => {
  const sc = mk('cap'), r = Np(sc, [A(1000, 'lab:cbc'), A(2000, 'lab:cbc'), A(3000, 'lab:cbc')], 90000);
  assert.equal(r.results.filter((x) => x.id === 'lab:cbc').length, 1);
  const f = Np(mk('dka'), [A(1000, 'drug:fluids'), A(20000, 'drug:fluids'), A(40000, 'drug:fluids')], 70000); assert.ok(f.needs.find((n) => n.id === 'vol').doneAtMs != null);
});

test('arrest needs compressions and adrenaline (and a shock for a shockable rhythm) to bring the patient back', () => {
  const sc = mk('cardiogenic'), idle = firstOutcome(sc, [], 1500000), at = idle.arrestAtMs;
  const saved = Np(sc, [A(at + 2000, 'cpr'), A(at + 6000, 'adrenaline'), A(at + 9000, 'shock')], at + 30000);
  assert.ok(saved.alive && saved.rhythm === 'sinus', 'ACLS did not bring the circulation back');
  const noShock = Np(sc, [A(at + 2000, 'cpr'), A(at + 6000, 'adrenaline')], at + 70000); assert.equal(noShock.alive, false);
  const pea = mk('aki'), p = firstOutcome(pea, [], 1500000), ok = Np(pea, [A(p.arrestAtMs + 2000, 'cpr'), A(p.arrestAtMs + 6000, 'adrenaline')], p.arrestAtMs + 30000);
  assert.ok(ok.alive, 'PEA needs no shock');
});

test('the patient replays identically, and the returned shape is what the rooms expect', () => {
  const sc = mk('pe'), a = Np(sc, ideal(CASE_BY_ID.pe), 123000), b = Np(sc, ideal(CASE_BY_ID.pe), 123000);
  assert.deepEqual(a, b);
  for (const k of ['hour', 'elapsedMs', 'hr', 'sbp', 'dbp', 'map', 'spo2', 'rr', 'gcs', 'temp', 'lactate', 'cr', 'k', 'rhythm', 'alive', 'outcome', 'outcomeLine', 'tube', 'oxygen', 'norepi', 'artLine', 'hdLine', 'dialysis', 'dialysisWaiting', 'bronch', 'arrestAtMs', 'problems', 'results', 'log', 'missed']) assert.ok(k in a, k);
  for (const p of a.problems) for (const k of ['id', 'specialty', 'title', 'detail', 'opensAtMs', 'graceMs', 'needs', 'open', 'resolved', 'called']) assert.ok(k in p, k);
  assert.ok(a.score.total >= 0 && a.score.total <= 100);
});

test('every seated doctor gets a part of the case', () => {
  for (const team of [['intensivist', 'pulmonologist', 'nephrologist'], ['intensivist', 'surgeon'], ['intensivist', 'neurologist', 'infectious', 'cardiologist']]) for (let seed = 1; seed < 60; seed++) { const sc = Dp(seed, team, { noRemember: true, recent: [] }); for (const sp of team.filter((x) => x !== 'intensivist')) assert.ok(sc.problems.some((p) => p.specialty === sp && p.needs.length), sp + ' has nothing to do in ' + sc.caseId); }
});

test('the engine inside the app bundle is the one in these source files', () => {
  const s = fs.readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8'), a = s.indexOf('var bp=[{id:`intensivist`'), b = s.indexOf('var Fp=`ABCDEFGH');
  assert.equal(s.slice(a, b), buildSegment(s.slice(a, b)), 'run: node critical-care-universe/universe/build-engine.mjs');
  const E = new Function(s.slice(a, b) + ';return {Dp,Np,Pp}')(), sc = E.Dp(9, ['intensivist', 'surgeon'], { noRemember: true, recent: [] });
  assert.ok(CASE_BY_ID[sc.caseId].must.concat(CASE_BY_ID[sc.caseId].fit).includes('surgeon')); assert.ok(E.Np(sc, [], 5000).alive);
});
