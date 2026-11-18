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

## Entrance (`microbiology.html`, file 1 step 1)
`micro/organisms.js` holds 19 organisms in 6 groups (data plus a procedural three.js model for each: clusters, chains, lancet diplococci with capsule, rods with flagella and pili, spore-former, wall-less Mycoplasma, Chlamydia inclusion, Candida, Aspergillus conidiophore, mycobacterial cord). To add one: add a record to `O` and a builder to `MODEL`. Models are schematic; text is teaching content needing specialist review. The six module cards in the info panel (`MODS` in `microbiology.html`) link to the pages below with `?org=<id>`. Anatomy and Infection cover all 19 organisms. All six module cards now cover all 19 organisms. The original Resistance Lab is still linked for pa, kp, ec and ab.


## Microbiology Lab pages (file 1 steps 2 to 8)

| Page | Needs | Deep link |
|---|---|---|
| `microbiology-anatomy.html` | `organisms.js`, `anatomy.js`, `common.js` | `?org=&view=env&sel=` |
| `microbiology-infection.html` | `organisms.js`, `infection.js` | `?org=&t=` |
| `microbiology-antibiotics.html` | `pharm.js` | `?org=&drug=&m=&t=` |
| `microbiology-compare.html` | `pharm.js` | `?org=&d=a,b,c&m=x,y&t=` |
| `microbiology-resistance.html` | `pharm.js`, `hgt.js` | `?org=&cat=&m=&drug=&tab=hgt&k=&t=` |
| `microbiology-workstation.html` | `pharm.js` | `?case=1..9` or `?org=&spec=&m=a,b` (custom isolate) |

Shared code: `micro/ui.css` (theme), `micro/common.js` (`MICRO.ui`: organism list, orbit stage). All animations are pure functions of time, so scrub, pause and speed work. Scripts use `?v=` cache-busters; bump them together when editing a shared file.

### Fate model (`micro/pharm.js`)
`MICRO.pharm.evaluate(org, drug, mechanisms)` returns the fraction of drug that is excluded (porin), pumped out, hydrolysed, blocked at the target, bypassed, or kills. Kill of 0.6 or more is "effective", 0.25 to 0.6 "reduced", below that "fails". To add a drug, add it to `DRUGS` and to each organism's panel in `ORGS`, then give it weights in `W`. To add an organism, add an `ORGS` record (drug panel, enzyme list) and a group in the workstation (`GRP`, `BASE`, `BP0`).

### Workstation
MIC = reference MIC divided by the modelled kill fraction, rounded to doubling dilutions with a seeded +/- 1 dilution jitter. Zone diameter is illustrative and derived from the MIC. Categories (S / I / R) use editable breakpoints from "Teaching set v1" (CLSI-style, illustrative). They are not CLSI or EUCAST values: verify against the current CLSI M100 or EUCAST table before any real use. The page states that a simulated organism's mechanism is a modelling input and that a real patient's mechanism must be confirmed by testing. The antibiogram is generated, not measured.

### Organism coverage in the drug, resistance and workstation modules
`ORGS` in `micro/pharm.js` now holds 19 organisms. Each has an envelope type (`env`: gn, gp, myco, wl, fungus), a horizontal scale (`sx`, so cocci are ovoid), a drug panel (`drugs`), a list of toggleable mechanisms (`mech`, used by `mechsFor`) and optional intrinsic resistance (`intr`, with text). New target classes (wall precursors, membrane, RNA polymerase, DNA, mycobacterial wall, ATP synthase, Cyp51, ergosterol, glucan synthase, flucytosine) map to five animation branches through `ANIM`. `killSteps(drug, org)` returns the kill-step text for the organism's envelope.

To add an organism: add an `ORGS` record, any new `DRUGS` / `MECH` / `W` entries, then (workstation) `GRP`, `BASE`, `BPS.eucast`, `PROF`, `TYP`, `DEF3` and a `MEDIA` entry.

### Breakpoints in the workstation
Two sets. "EUCAST v16.1" holds values read from the EUCAST bacterial breakpoint tables (valid from 24 June 2026) and the antifungal tables v12.1 (valid from 10 April 2026) by an automated reader. Each row is tagged EUCAST or teaching; rows that were ambiguous, absent (anaerobes, colistin, some Gram-positive agents) or have no breakpoint are tagged teaching. They need checking against the source PDFs before any real use. EUCAST uses S <= and R >. CLSI M100 is not freely available and is not loaded; users can edit any value. Mycobacterium tuberculosis uses a WHO critical-concentration style (S or R only) with teaching values that were not verified. Mycoplasma, Legionella, Chlamydia and C. difficile have no clinical breakpoints; the page shows wild-type or non-wild-type against a teaching limit.

### Voice-over (`micro/voice.js`)
`MICRO.voice` reads the selected module aloud with the browser's own speech synthesis (no audio files). It prefers a male English voice (en-IN, then en-GB, then en-US), rate 0.9, pitch 0.82, volume 0.8, and speaks in sentence-sized chunks. `mount()` adds "Voice on/off", "Hear again" and a voice picker to the page's `.top` bar; the choice is kept in localStorage. Pages call `say(text)` when the user picks an organism, structure, stage, drug, mechanism, case or tab. Anatomy: tapping a structure says its name and function. Infection and horizontal gene transfer: each step is narrated and the clock waits at a step boundary until the sentence ends (`busy()`), so narration is not cut off. Pause, scrub, tab change and leaving the page stop speech.
Limits: which voices exist depends on the device (a male voice cannot be guaranteed; the picker lets the user choose); some browsers block speech until the first tap, in which case the text plays on the first tap; the voice quality was not listened to in testing, only the calls were checked with a mocked speech engine. The older Resistance Lab (`microbiology-lab.html`) keeps its own voice-over.

### Camera in the infection simulator
The camera is fixed for the whole video (one framing set when the organism is picked). Stage changes, scrubbing and the stage buttons no longer move it; the user can still orbit and zoom, and that view is kept. Earlier versions re-aimed the camera at each stage, which made the scene appear to drift.

### Content check against guidelines (19 Nov 2026)
Checked by Claude against current sources; still needs specialist review. Sources: IDSA guidance on antimicrobial-resistant Gram-negative infections (July 2024; ESBL-E, MBL-producing CRE, CRAB), IDSA/SHEA C. difficile guideline with the 2022 focused update (fidaxomicin preferred; metronidazole only IV in fulminant disease; bezlotoxumab withdrawn), WHO drug-resistant TB treatment update (April 2025: BPaLM, BDLLfxC; pre-XDR/XDR definitions), invasive candidiasis guidance (echinocandin first-line) and EUCAST v16.1 / antifungal v12.1 breakpoints. Corrected: metallo-β-lactamase options (was "cefiderocol and colistin"), C. difficile first-line therapy and the moxifloxacin note, WHO TB regimens, and CRAB, ESBL, Candida and Aspergillus guidance lines. Not checked line by line: organism biology (virulence factors, stage descriptions) beyond a read-through; WHO TB critical concentrations and CLSI M100 were not available.

### 2026 guideline check and India availability (19 Nov 2026)
Checked by Claude; needs specialist review. **IDSA 2026:** the AMR Gram-negative guidance was revised in August 2026 (aztreonam-avibactam slightly preferred for NDM; cefiderocol preferred for invasive S. maltophilia; ceftolozane-tazobactam preferred for difficult-to-treat Pseudomonas pneumonia; sulbactam-durlobactam plus a carbapenem the priority for invasive CRAB; piperacillin-tazobactam only for selected complicated UTI with ESBL; meropenem-vaborbactam slightly favoured for KPC; ceftazidime-avibactam preferred for OXA-48-like). The IDSA/ESCMID 2026 S. aureus bacteraemia guidance was added (repeat cultures at about 48 h, echocardiography, 14 days for low-risk disease). No new 2026 IDSA treatment guideline was found for C. difficile (IDSA/SHEA 2021 and the 2022 update stand; AGA 2026 agrees), candidiasis or aspergillosis treatment (2026 IDSA aspergillosis update covers prevention in transplant recipients only).
**India:** `MICRO.pharm.INDIA` tags each drug as marketed (y), supplied through NTEP (p) or not confirmed (u), and the antibiotic and compare pages show it. ICMR's carbapenem-resistant directed-therapy table (prolonged-infusion ceftazidime-avibactam with aztreonam for NDM; ceftazidime-avibactam for KPC and OXA-48; polymyxins only with a second agent; not for UTI) and NTEP's 2024 approval of BPaLM are quoted in the workstation. Cefepime-zidebactam (Zaynich) was approved by the Indian regulator in May 2026 (complicated UTI); it is not in the drug panel. Aztreonam-avibactam was supported by an expert panel and announced for launch in April 2026 by an Indian maker; not in the panel.
Limits: older drugs are tagged "marketed" from general knowledge, not a drug-by-drug check; stock and cost vary by hospital and state. Marketing could not be confirmed for cefiderocol, ceftolozane-tazobactam, ceftaroline, isavuconazole, flucytosine, sulbactam-durlobactam, meropenem-vaborbactam and imipenem-relebactam. Cefoperazone-sulbactam, widely used in India, is not in the drug panel yet. Pip-tazo ESBL and other guideline lines were taken from published summaries, not the full IDSA text.

### Known gaps
- Only C. albicans (not C. auris or C. glabrata) and A. fumigatus among fungi; no non-tuberculous mycobacteria.
- Altered PBP in Gram-negatives is a hypothetical teaching mechanism.
- Leg. pneumophila and C. pneumoniae drug entry into host cells is described in text, not animated.
- All text and numbers are teaching content written without specialist review. They are not a clinical susceptibility prediction, and MICs are generated, not measured.
- Tested with software WebGL (desktop) and a 390 px emulated viewport; not tested on real phones.
