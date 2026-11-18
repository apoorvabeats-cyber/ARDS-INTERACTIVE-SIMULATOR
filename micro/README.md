# Microbiology engine (`micro/`)

Reusable 3D molecular engine behind `microbiology-lab.html` (three.js r128, no build step).

| File | Role |
| --- | --- |
| `engine.js` | maths helpers, ball-and-stick `Molecule` (atoms, bonds, ring-opening morph), `blob()` space-filling protein with a carved pocket, deformable whole-bacterium `buildCell()` |
| `world.js` | `buildMol()`: LPS outer membrane with OprD porin and TonB-dependent transporter, periplasm, NDM-1 with two Zn²⁺ and coordinating residues, peptidoglycan with cross-link bars, inner membrane, PBP3 with active-site serine |
| `lab.js` | `MICRO.Lab`: renderer, camera director, user orbit/zoom, HTML molecular labels, playback clock, scrubbing |
| `scenarios.js` | choreography. Every scenario is a pure function of time `at(t)`, so it can be scrubbed, paused and run at 0.5x / 1x / 2x |
| `resistance.js` | the resistance engine's data and fate model: organisms, antibiotics, mechanisms, `evaluate()`, `permutations()`, `tokens()` (no three.js, unit-testable) |
| `scn_res.js` | Resistance Lab composer: `M.scenarios.res({org, abx, mech:[ids]})` builds a timeline from exactly the ticked mechanisms |

## How a scenario works

```js
M.scenarios.my_id = () => ({
  id, duration,                       // seconds
  scenes: [{ t0, t1, title, cap, tag?, voice }],   // captions, flash tag, narration
  labels: [{ text, a: () => Vector3, t0, t1, world: 'mol' | 'cell' }],
  result: { rows: [[label, value]], learn, path: [...], good },
  attach(W) { ... },                  // W = molecular world (W.cell = bacterium)
  at(t, ctx) { return { world, pos, look, focus, flash }; }   // set every entity for time t
});
```

`react()` in `scenarios.js` drives a hero molecule through a reaction in a docked pose:
`'water'` mode = Zn²⁺-activated hydroxide attacks the β-lactam carbonyl (metallo-β-lactamase),
`'ser'` mode = PBP serine acylation. Times are "standard" times (dock at 22.4 s) and can be compressed with a factor.

## Adding KPC, OXA-48, AmpC (serine β-lactamases)

1. Build the enzyme with `M.blob({... cavity: {c, r, u, open}})` (pocket) instead of the zinc pair; put the catalytic serine where `W.serO` sits for the PBP.
2. Copy `meropenem(ndmOn)`; replace the `'water'` reaction with two phases, acylation (ring opens, ester to Ser) then deacylation (a water, activated by the general base, releases the product). KPC and OXA-48 differ in which drugs reach the deacylation step; AmpC mostly spares carbapenems but hydrolyses cephalosporins.
3. Add the antibiotic as a molecule in `M.defs` (atoms with `open` positions give the ring-opening morph) and register the scenario in `M.scenarios`.
4. Inhibitor logic belongs in the scene text and animation: avibactam binds serine β-lactamases but not metallo-β-lactamases such as NDM.

## Scientific scope

NDM is a periplasmic zinc-dependent metallo-β-lactamase. It is not a porin and it does not pump drugs out. Efflux, porin loss and AmpC are switched off in the NDM experiment. Structures are schematic and not to scale; the teaching content is for education, not for treatment decisions.

## Resistance Lab (tick-a-mechanism engine)

`MICRO.res` holds organisms (`pa`, `kp`, `ec`, `ab`), antibiotics, mechanisms and per-drug weights. `evaluate(org, abx, ticks)` returns the fate of 100 units of drug:
never entered (porin loss) -> pumped out (efflux) -> hydrolysed (enzymes) -> reached target with weak binding (altered PBP) -> bound. These are different molecules with different fates; one molecule never undergoes incompatible fates. `permutations()` returns all 2^N combinations, which feed the table in the page.

`M.scenarios.res(cfg)` composes scenes only for what was ticked: intro, entry (normal porin or porin-loss comparison), efflux (three-part RND pump), metallo-β-lactamase (Zn²⁺ / water), serine β-lactamase (acyl-enzyme then deacylation, or a "poor substrate" variant), target (normal vs altered PBP side by side), parallel pathways (6 drug molecules, fates from `tokens()`), outcome (survival / partial / lysis).

World switches (`world.js`): `W.pump` (efflux, filler `W.fillPump` when absent), `W.oprD` + `W.fillA` (OprD present or lost; `W.oprR` is a second always-present porin copy), `W.pbpBump` (altered PBP lid), `W.serEnz` (serine β-lactamase slot), `W.pbpRefG` (reference PBP copy). `P.hideAll()` resets all of them for every scenario.

### Adding a new mechanism or organism
- Organism: add to `ORGS` (mechanisms, antibiotics, porin and pump names and `group` keys into `PORIN_KEEP` / `PUMP_EFF`).
- Enzyme: add to `MECH` (`cls: 'metallo' | 'serine'`) and to `HYD[enzyme][abx]`. Serine enzymes reuse the serine slot; a metallo enzyme reuses the NDM slot.
- New structure type (for example ribosomal methylation, vancomycin D-Ala-D-Lac): add a switchable group to `world.js`, reset it in `hideAll`, and a scene runner in `scn_res.js`.
- All weights are teaching values, not MICs. Real susceptibility is isolate-specific (AST, CLSI / EUCAST).
