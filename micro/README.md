# Microbiology engine (`micro/`)

Reusable 3D molecular engine behind `microbiology-lab.html` (three.js r128, no build step).

| File | Role |
| --- | --- |
| `engine.js` | maths helpers, ball-and-stick `Molecule` (atoms, bonds, ring-opening morph), `blob()` space-filling protein with a carved pocket, deformable whole-bacterium `buildCell()` |
| `world.js` | `buildMol()`: LPS outer membrane with OprD porin and TonB-dependent transporter, periplasm, NDM-1 with two Zn²⁺ and coordinating residues, peptidoglycan with cross-link bars, inner membrane, PBP3 with active-site serine |
| `lab.js` | `MICRO.Lab`: renderer, camera director, user orbit/zoom, HTML molecular labels, playback clock, scrubbing |
| `scenarios.js` | choreography. Every scenario is a pure function of time `at(t)`, so it can be scrubbed, paused and run at 0.5x / 1x / 2x |

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
