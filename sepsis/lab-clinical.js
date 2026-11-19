/* Clinical controls for the sepsis 3D labs. The pictures live in path-stage.js.
   Numbers, drugs and spoken phases are unchanged from the existing labs. */
(function () {
  const clamp = (x, a, b) => Math.max(a == null ? 0 : a, Math.min(b == null ? 1 : b, x));
  const $ = (s) => document.querySelector(s);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SPECS = {
    ards: {
      sev: 0.55,
      leg: "Teal: P/F ratio. Amber: driving pressure.",
      rx: [["prone", "Prone position", "more even ventilation, less shunt"], ["fl", "Conservative fluids", "less alveolar fluid"], ["dex", "Dexamethasone", "dampens lung inflammation"], ["nmb", "Neuromuscular blockade", "less injurious patient effort"], ["b2", "IV beta-2 agonist", "no benefit, possible harm"]],
      dz: [["Sepsis (indirect)", 0.55, [], "Endothelial leak dominates. Lung protection is the treatment."], ["Pneumonia", 0.6, [], "Direct epithelial injury with focal consolidation."], ["Aspiration", 0.7, [], "Chemical epithelial injury that can progress fast."], ["Severe, proned", 0.8, ["prone", "nmb"], "Severe ARDS managed with prone positioning and paralysis."], ["Steroid trial", 0.65, ["dex"], "Dexamethasone in moderate to severe ARDS."], ["Harmful bundle", 0.65, ["b2"], "IV beta-agonist: no benefit, possible harm."]],
      info: {
        lung: ["Lungs", "Injury is patchy. Dependent regions flood and collapse first, leaving a small aerated lung to ventilate.", "Low tidal volume and prone positioning protect it."],
        alveolus: ["Alveolus", "Type I cells cover most of the surface, Type II cells make surfactant. Flooding raises surface tension and collapses units.", "PEEP keeps units open; surfactant replacement failed in adults."],
        fluid: ["Oedema fluid", "Protein-rich, unlike cardiogenic oedema. Epithelial ion transport that clears alveolar fluid is impaired.", "Conservative fluid balance lowers lung water."],
        epithelium: ["Alveolar epithelium", "Tight junctions open and fluid clearance fails. Dominant in direct injury such as pneumonia.", "Dexamethasone may help in moderate to severe ARDS."],
        capillary: ["Capillary endothelium", "Glycocalyx loss and junction disruption make it leaky. Dominant in indirect injury such as sepsis.", "Vasopressors do not fix leak; treat the source."],
        hyaline: ["Hyaline membrane", "Fibrin, dead cells and plasma protein lining the alveolus. Hallmark of diffuse alveolar damage.", "No drug dissolves it; protect the lung and wait."]
      },
      vod: ["Early lung injury. At organ level, gas exchange is still normal. At cellular level, inflammatory mediators activate the endothelium and neutrophils begin to stick to it.", "Mild ARDS. At organ level, oxygenation starts to fall and the lungs stiffen. At cellular level, junctions open and fluid leaks into the alveoli.", "Moderate ARDS. At organ level, dependent lung regions flood and collapse, which causes shunt. At cellular level, type two cells fail, surfactant is lost, and the alveoli collapse more easily.", "Severe ARDS. At organ level, only a small aerated lung remains. At cellular level, hyaline membranes line the alveoli."],
      views: ["organ", "cut", "cells"],
      stageText: ["Both lungs and the airway. Sepsis injures the lung from the blood side.", "The cut face shows hepatisation where alveoli have filled.", "Alveolar-capillary membrane: epithelium, oedema and the capillary."],
      model(s) {
        const e = clamp(s.sev + (s.rx.dex ? -0.1 : 0) + (s.rx.b2 ? 0.1 : 0));
        const rec = clamp(s.peep / 16);
        const a = e * (1 - 0.7 * rec) * (s.rx.prone ? 0.75 : 1);
        const st = clamp((s.vt - 6) / 4) * (0.4 + e) * (s.rx.nmb ? 0.6 : 1) + (s.peep > 14 ? 0.15 : 0);
        const fill = e * 0.85 * (s.rx.fl ? 0.8 : 1);
        const comp = 60 - 40 * e * (1 - 0.4 * rec);
        const dp = s.vt * 70 / comp, pl = s.peep + dp, sh = a * (s.rx.prone ? 0.65 : 1);
        const pf = Math.round(450 - 330 * sh);
        const on = s.list.filter((d) => s.rx[d[0]]);
        $("#out").innerHTML = `P/F about ${pf}, compliance ${Math.round(comp)} ml/cmH2O<br><span class="${dp > 15 ? "warn" : ""}">Driving pressure ${Math.round(dp)} cmH2O</span>, <span class="${pl > 30 ? "warn" : ""}">plateau ${Math.round(pl)} cmH2O</span>` + (st > 0.4 ? "<br><span class=\"warn\">Overdistension: stretch injury is likely</span>" : "") + (on.length ? "<ul>" + on.map((d) => `<li>${d[1]}: ${d[2]}</li>`).join("") + "</ul>" : "");
        if ($("#v0")) $("#v0").textContent = Math.round(s.sev * 100) + "%";
        if ($("#v1")) $("#v1").textContent = s.vt;
        if ($("#v2")) $("#v2").textContent = s.peep;
        s.m = { e, a, fill };
        return { severity: fill, extra: { fill, stretch: st }, key: () => [[450 - 330 * a * (s.rx.prone ? 0.65 : 1), 500, "#2ad4c0"], [s.vt * 70 / comp, 30, "#f0a030"]] };
      }
    },
    aki: {
      sev: 0.45,
      drug: true,
      leg: "Teal: GFR. Amber: urine output.",
      rx: [["nor", "Noradrenaline", -0.15, "restores renal perfusion pressure"], ["bal", "Balanced crystalloid", -0.08, "fewer kidney events than saline"], ["nsaid", "NSAID", 0.2, "constricts the afferent arteriole"], ["nephro", "Vancomycin + pip-tazo", 0.15, "injures proximal tubule cells"]],
      dz: [["Early sepsis", 0.2, [], "Perfusion intact; tubules are stressed."], ["Septic AKI", 0.55, [], "Tubular injury and falling GFR."], ["With noradrenaline", 0.55, ["nor"], "Perfusion pressure restored."], ["Nephrotoxin hit", 0.5, ["nsaid", "nephro"], "NSAID plus vancomycin with piperacillin-tazobactam."], ["Best supportive", 0.55, ["nor", "bal"], "Pressor plus balanced crystalloid."], ["Established ATN", 0.85, [], "Severe injury; expect renal replacement."]],
      vod: ["Early sepsis. At organ level, the kidneys still filter normally. At cellular level, the tubular cells are stressed.", "Early kidney injury. Urine output begins to fall. The proximal tubule loses its brush border.", "Established acute kidney injury. Filtration drops and creatinine rises. Cells slough and form casts.", "Severe acute tubular injury. Very little urine is made. Cells die, and renal replacement may be needed."],
      views: ["organ", "cut", "cells"],
      stageText: ["About a million nephrons filter blood.", "Pale cortex on the cut face.", "Proximal tubule: swollen mitochondria and casts."],
      model(s) {
        const e = clamp(s.sev + s.list.reduce((a, d) => a + (s.rx[d[0]] ? d[2] : 0), 0));
        const gfr = Math.round(100 * (1 - 0.85 * e));
        const on = s.list.filter((d) => s.rx[d[0]]);
        $("#out").innerHTML = `GFR about ${gfr} ml/min, urine ${(1 - 0.9 * e).toFixed(1)} ml/kg/h, creatinine ×${(1 / Math.max(0.08, 1 - 0.85 * e)).toFixed(1)}` + (on.length ? "<ul>" + on.map((d) => `<li>${d[1]}: ${d[3]}</li>`).join("") + "</ul>" : "");
        return { severity: e, key: () => [[100 * (1 - 0.85 * e), 100, "#2ad4c0"], [1 - 0.9 * e, 1, "#f0a030"]] };
      }
    },
    dic: {
      sev: 0.65,
      leg: "Teal: platelets. Amber: bleeding risk.",
      rx: [["src", "Source control and antibiotics", "removes the trigger"], ["hep", "Heparin", "less thrombin, more bleeding risk"], ["atc", "Antithrombin concentrate", "restores the brake, mixed evidence"], ["tx", "Platelets and FFP", "replaces what is consumed"], ["txa", "Tranexamic acid", "blocks lysis: more clots (harms)"]],
      dz: [["Early DIC", 0.35, [], "Compensated: platelets just starting to fall."], ["Overt DIC", 0.7, [], "Consumption and microthrombosis."], ["Source controlled", 0.7, ["src"], "Treating the sepsis slows the process."], ["Bleeding phenotype", 0.85, ["tx"], "Factors consumed; replace them for bleeding."], ["Heparin trial", 0.6, ["hep"], "Less thrombin, more bleeding risk."], ["Antifibrinolytic error", 0.6, ["txa"], "Tranexamic acid worsens thrombosis here."]],
      vod: ["Early sepsis. Clotting tests are still normal. Monocytes and endothelium begin to express tissue factor.", "Early DIC. Platelets fall and D-dimer rises. Thrombin bursts and fibrin begins to form.", "Overt DIC. Small clots block vessels of kidney, lung and skin. Antithrombin and protein C are used up.", "Severe DIC with bleeding. Bleeding appears from lines, wounds and mucosa. Platelets and factors are consumed."],
      views: ["organ", "cut", "cells"],
      stageText: ["Small vessels and the tissue they supply.", "The cut face shows thrombi and pale tissue.", "Fibrin strands and platelets inside a vessel."],
      model(s) {
        const dr = clamp(s.sev * (s.rx.src ? 0.65 : 1));
        const at = clamp(1 - 0.85 * dr + (s.rx.atc ? 0.35 : 0));
        const thr = clamp(dr * (1.1 - 0.5 * at) * (s.rx.hep ? 0.55 : 1));
        const bur = clamp(thr * (s.rx.txa ? 1.35 : 1));
        const plt = Math.round(250 * (1 - 0.8 * thr) + (s.rx.tx ? 60 : 0));
        const fct = clamp(1 - 0.75 * thr + (s.rx.tx ? 0.25 : 0));
        const bleed = clamp((1 - clamp(plt / 150)) * 0.7 + (1 - fct) * 0.5 + (s.rx.hep ? 0.2 : 0)) * (thr > 0.1 ? 1 : 0);
        const on = s.list.filter((d) => s.rx[d[0]]);
        $("#out").innerHTML = `<span class="${plt < 100 ? "warn" : ""}">Platelets ${plt} ×10⁹/L</span>, factors ${Math.round(fct * 100)}%, D-dimer ×${(1 + 19 * thr).toFixed(0)}, antithrombin ${Math.round(at * 100)}%<br>Clot burden ${Math.round(bur * 100)}%, <span class="${bleed > 0.5 ? "warn" : ""}">bleeding risk ${Math.round(bleed * 100)}%</span>`
          + (s.rx.hep && bleed > 0.5 ? "<br><span class=\"warn\">Heparin with active bleeding risk: harms</span>" : "")
          + (s.rx.txa && bur > 0.3 ? "<br><span class=\"warn\">Tranexamic acid worsens microthrombosis here</span>" : "")
          + (s.rx.tx && bleed < 0.3 ? "<br>Transfusion without bleeding: no benefit" : "")
          + (on.length ? "<ul>" + on.map((d) => `<li>${d[1]}: ${d[2]}</li>`).join("") + "</ul>" : "");
        if ($("#v0")) $("#v0").textContent = Math.round(s.sev * 100) + "%";
        return { severity: bur, key: () => [[plt, 300, "#2ad4c0"], [bleed, 1, "#f0a030"]] };
      }
    },
    cardiac: {
      sev: 0.55,
      leg: "Teal: ejection fraction. Amber: cardiac output.",
      rx: [["dobu", "Dobutamine", "raises contractility, adds tachycardia"], ["levo", "Levosimendan", "calcium sensitiser, limited evidence"], ["nor", "Noradrenaline", "supports coronary perfusion pressure"], ["bb", "Esmolol", "selected tachycardia only; lowers contractility"], ["epi", "High-dose adrenaline", "arrhythmia and raised lactate (harms)"]],
      dz: [["Early sepsis", 0.25, [], "Mild depression; output preserved."], ["Septic cardiomyopathy", 0.7, [], "Dilated, hypocontractile ventricle."], ["Dobutamine", 0.7, ["dobu"], "Raises output; watch the heart rate."], ["Levosimendan", 0.7, ["levo"], "Sensitises myofilaments to calcium."], ["Esmolol trial", 0.6, ["bb"], "Slows the rate but lowers contractility."], ["Adrenaline excess", 0.6, ["epi"], "Arrhythmia and lactate rise."]],
      vod: ["Early sepsis. The heart beats faster and output is preserved. Cytokines begin to dampen the response to calcium.", "Mild septic cardiomyopathy. The ventricle ejects a little less. Beta receptors are down-regulated.", "Moderate dysfunction. The ventricle dilates and the ejection fraction falls. Mitochondria swell.", "Severe dysfunction. Cardiac output is low and troponin rises. The muscle is stunned rather than dead, so recovery is possible."],
      views: ["organ", "cut", "cells"],
      stageText: ["Left ventricle, atrium and aorta. Output falls as the ventricle dilates.", "The cavity is larger and the wall relatively thinner.", "Sarcomeres shorten weakly. Receptors fall. Mitochondria swell."],
      model(s) {
        const con = clamp(1 - 0.55 * s.sev + (s.rx.dobu ? 0.3 : 0) + (s.rx.levo ? 0.15 : 0) - (s.rx.bb ? 0.15 : 0) + (s.rx.epi ? 0.2 : 0) + (s.rx.nor ? 0.04 : 0), 0.1, 1.3);
        const HR = Math.round(70 + 45 * s.sev + (s.rx.dobu ? 15 : 0) - (s.rx.bb ? 25 : 0) + (s.rx.epi ? 15 : 0));
        const EDV = 120 + 60 * s.sev;
        const EF = clamp(62 * con, 12, 75);
        const CO = EDV * EF / 100 * HR / 1000;
        const lac = 1 + Math.max(0, 4 - CO) * 1.2 + (s.rx.epi ? 1.5 : 0);
        const on = s.list.filter((d) => s.rx[d[0]]);
        $("#out").innerHTML = `<span class="${EF < 40 ? "warn" : ""}">EF ${Math.round(EF)}%</span>, HR ${HR}, EDV ${Math.round(EDV)} ml, <span class="${CO < 4 ? "warn" : ""}">CO ${CO.toFixed(1)} L/min</span>, troponin ×${(1 + 14 * s.sev).toFixed(0)}, lactate ${lac.toFixed(1)}`
          + (HR > 130 ? "<br><span class=\"warn\">Tachycardia shortens filling time</span>" : "")
          + (s.rx.epi ? "<br><span class=\"warn\">High-dose adrenaline: arrhythmia and raised lactate</span>" : "")
          + (on.length ? "<ul>" + on.map((d) => `<li>${d[1]}: ${d[2]}</li>`).join("") + "</ul>" : "");
        if ($("#v0")) $("#v0").textContent = Math.round(s.sev * 100) + "%";
        return { severity: s.sev, extra: { hr: HR, ef: EF }, key: () => [[EF, 70, "#2ad4c0"], [CO, 8, "#f0a030"]] };
      }
    },
    enceph: {
      sev: 0.55,
      leg: "Teal: GCS. Amber: barrier leak.",
      rx: [["map", "Restore MAP", "improves cerebral flow"], ["glu", "Correct glucose and sodium", "removes metabolic contributors"], ["dex", "Dexmedetomidine", "less delirium than benzodiazepines"], ["benzo", "Benzodiazepine", "deepens delirium (harms)"], ["cefe", "High-dose cefepime in renal failure", "seizures and neurotoxicity (harms)"]],
      dz: [["Early delirium", 0.3, [], "Fluctuating attention and mild EEG slowing."], ["Septic encephalopathy", 0.7, [], "Diffuse slowing and a leaky barrier."], ["MAP restored", 0.7, ["map"], "Perfusion improves; inflammation persists."], ["Benzodiazepine sedation", 0.5, ["benzo"], "Deepens delirium and slows the EEG."], ["Dexmedetomidine", 0.5, ["dex"], "Lighter sedation with less delirium."], ["Cefepime neurotoxicity", 0.5, ["cefe"], "High dose with renal failure: seizures."]],
      vod: ["Early sepsis. The brain still works. Circulating cytokines act on the blood-brain barrier.", "Mild encephalopathy. Attention fluctuates. Tight junctions loosen and microglia start to activate.", "Moderate encephalopathy. Delirium is clear and the EEG slows. Astrocyte end-feet swell.", "Severe encephalopathy. The patient is deeply drowsy or in coma. Neurons are energy starved and firing is slow."],
      views: ["organ", "cut", "cells"],
      stageText: ["Both hemispheres. Sepsis disturbs the whole brain without a structural lesion.", "The cut surface looks nearly normal. The failure is functional.", "Capillary, tight junctions, astrocyte end-feet and microglia."],
      model(s) {
        const dep = clamp(s.sev * (s.rx.map ? 0.65 : 1) * (s.rx.glu ? 0.85 : 1) + (s.rx.benzo ? 0.22 : 0) + (s.rx.cefe ? 0.15 : 0) - (s.rx.dex ? 0.06 : 0));
        const leak = clamp(s.sev * (s.rx.map ? 0.85 : 1));
        const cbf = clamp(1 - 0.45 * s.sev * (s.rx.map ? 0.4 : 1));
        const gcs = Math.round(clamp(15 - 9 * dep, 3, 15));
        const hz = 10 - 6 * dep;
        const on = s.list.filter((d) => s.rx[d[0]]);
        $("#out").innerHTML = `<span class="${gcs < 13 ? "warn" : ""}">GCS ${gcs}</span>, EEG ${hz.toFixed(1)} Hz, cerebral flow ${Math.round(cbf * 100)}%, barrier leak ${Math.round(leak * 100)}%`
          + (dep > 0.3 ? "<br><span class=\"warn\">Delirium likely (CAM-ICU positive)</span>" : "")
          + (s.rx.benzo ? "<br><span class=\"warn\">Benzodiazepine deepens delirium</span>" : "")
          + (s.rx.cefe && s.sev > 0.3 ? "<br><span class=\"warn\">Cefepime neurotoxicity: seizure risk in renal failure</span>" : "")
          + (on.length ? "<ul>" + on.map((d) => `<li>${d[1]}: ${d[2]}</li>`).join("") + "</ul>" : "");
        if ($("#v0")) $("#v0").textContent = Math.round(s.sev * 100) + "%";
        return { severity: dep, key: () => [[gcs, 15, "#2ad4c0"], [leak, 1, "#f0a030"]] };
      }
    },
    hepatic: {
      sev: 0.5,
      leg: "Teal: INR. Amber: lactate.",
      rx: [["src", "Source control", "removes the cytokine drive of cholestasis"], ["map", "Restore perfusion", "limits hypoxic hepatitis"], ["feed", "Avoid overfeeding", "less hepatic fat"], ["tox", "Hepatotoxic drugs", "worsens cholestasis (harms)"]],
      dz: [["Cholestasis of sepsis", 0.45, [], "Transporters fail. Bilirubin rises before the INR does."], ["Hypoxic hepatitis", 0.75, [], "Shock drops oxygen to the central hepatocytes."], ["Perfusion restored", 0.7, ["map", "src"], "The ischaemic hit slows. Cholestasis lingers."], ["Overfeeding", 0.55, [], "Steatosis on top of inflammation."], ["Drug injury added", 0.6, ["tox"], "A hepatotoxin on a septic liver."], ["Recovering", 0.25, ["src", "map"], "Fat and cholestasis recede. Necrosis does not."]],
      vod: ["Early sepsis. The liver still clears lactate and makes clotting factors. Cytokines begin to switch off bile transporters.", "Cholestasis. Bilirubin rises. Hepatocytes fill with small fat vacuoles. Synthetic function is still holding.", "Hypoxic hepatitis if shock is present. Central cells necrose. INR rises, glucose falls and lactate clears poorly.", "Established dysfunction. Congestion, fat and necrotic cells together. Cholestasis can reverse. Necrosis cannot."],
      views: ["organ", "cut", "cells"],
      stageText: ["The liver enlarges. Both lobes are involved.", "Nutmeg congestion and yellow fat on the cut face.", "Hepatocyte plates, sinusoids, fat vacuoles and a necrotic cell."],
      model(s) {
        const inj = clamp(s.sev * (s.rx.src ? 0.72 : 1) * (s.rx.map ? 0.78 : 1) * (s.rx.feed ? 0.9 : 1) + (s.rx.tox ? 0.18 : 0));
        const bili = 0.8 + 5.2 * inj;
        const inr = 1 + 1.15 * inj;
        const gluc = Math.max(1.8, 6.2 - 3.4 * inj);
        const lac = 1 + 4.2 * inj * (s.rx.map ? 0.7 : 1);
        const on = s.list.filter((d) => s.rx[d[0]]);
        $("#out").innerHTML = `Bilirubin ${bili.toFixed(1)} mg/dL, <span class="${inr > 1.5 ? "warn" : ""}">INR ${inr.toFixed(2)}</span>, glucose ${gluc.toFixed(1)} mmol/L, <span class="${lac > 2 ? "warn" : ""}">lactate ${lac.toFixed(1)}</span>`
          + (inj > 0.65 ? "<br><span class=\"warn\">Synthetic failure: do not wait for jaundice</span>" : "")
          + (s.rx.tox ? "<br><span class=\"warn\">Hepatotoxin on an already injured liver</span>" : "")
          + (on.length ? "<ul>" + on.map((d) => `<li>${d[1]}: ${d[2]}</li>`).join("") + "</ul>" : "");
        if ($("#v0")) $("#v0").textContent = Math.round(s.sev * 100) + "%";
        return { severity: inj, key: () => [[inr, 3, "#2ad4c0"], [lac, 6, "#f0a030"]] };
      }
    }
  };

  function boot(id) {
    const spec = SPECS[id];
    if (!spec || !window.PathStage) return;
    const cv = $("#cv");
    const stage = window.__stage = PathStage.mount(cv, {
      leader: true,
      onLabel(html) { const q = $("#info"); if (q) q.innerHTML = html; },
      onPick(info) {
        $("#info").innerHTML = `<strong>${info.title}</strong><br>${info.body}<br><em>Drugs and care:</em> ${info.care}`;
      }
    });
    fetch("pathology-models.json?v=20261119h").then((r) => r.json()).then((d) => {
      const sp = (d.complications || []).find((c) => c.id === id), host2 = $("#revslot") || $("#stages");
      if (!sp || !sp.reversibleText || !host2) return;
      const pct = Math.round(Math.max(0, Math.min(1, sp.reversible == null ? 0.5 : sp.reversible)) * 100);
      const el = document.createElement("div");
      el.className = "panel";
      el.innerHTML = "<b>Reversible or not?</b> " + sp.reversibleText +
        '<div style="margin-top:6px;height:8px;border-radius:99px;background:var(--line);overflow:hidden" role="img" aria-label="Share of the injury that can recover: ' + pct + ' percent"><div style="width:' + pct + '%;height:100%;background:var(--ok,#1d8a5a)"></div></div>' +
        '<div class="hint" style="margin:4px 0 0">Green is the share that can recover when the cause is treated. The rest is permanent damage. Press Play, then compare Normal and Diseased.</div>';
      if (host2.id === "revslot") host2.appendChild(el); else host2.insertAdjacentElement("afterend", el);
    }).catch(() => {});
    const s = { sev: spec.sev, rx: {}, vt: 8, peep: 5, list: spec.rx, m: {} };
    let viewI = 0, tsev = s.sev, ramp = false, hr = 0, hist = [], lh = 0, keyFn = () => [[0, 1, "#2ad4c0"], [0, 1, "#f0a030"]];
    const names = ["Organ", "Cut surface", "Cells"];
    function go(i) {
      viewI = i;
      const v = spec.views[i];
      stage.set({ id, view: v, severity: s.sev });
      $("#lbl").innerHTML = `<b>${spec.stageText ? names[i] : ""}</b>${spec.stageText[i]}`;
      document.querySelectorAll("[data-s]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.s === i));
      if (window.parent !== window) window.parent.postMessage({ vo: spec.stageText[i] }, "*");
    }
    function refresh() {
      const out = spec.model(s);
      keyFn = out.key;
      document.querySelectorAll("[data-rx],[data-dg]").forEach((b) => b.setAttribute("aria-pressed", !!(s.rx[b.dataset.rx || b.dataset.dg])));
      stage.set({ id, severity: out.severity, extra: out.extra || {}, view: spec.views[viewI] });
    }
    $("#stages").innerHTML = names.map((n, i) => `<button data-s="${i}">${n}</button>`).join("") + `<button data-next="1">Next stage</button>`;
    const host = $("#rx") || $("#drugs");
    if (host) host.innerHTML = spec.rx.map((d) => `<button data-${spec.drug ? "dg" : "rx"}="${d[0]}" aria-pressed="false">${d[1]}</button>`).join("");
    $("#stages").addEventListener("click", (ev) => {
      const b = ev.target.closest("button"); if (!b) return;
      go(b.dataset.next ? (viewI + 1) % 3 : +b.dataset.s);
    });
    if (host) host.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-rx],[data-dg]"); if (!b) return;
      const k = b.dataset.rx || b.dataset.dg;
      s.rx[k] = !s.rx[k];
      refresh();
      const L = spec.rx.find((d) => d[0] === k);
      const line = L[1] + (s.rx[k] ? " switched on. " : " switched off. ") + (L[3] || L[2]);
      if (window.parent !== window) window.parent.postMessage({ vo: line }, "*");
    });
    const sevEl = $("#sev");
    if (sevEl) sevEl.addEventListener("input", (ev) => { ramp = false; s.sev = ev.target.value / 100; refresh(); clearTimeout(sevEl._t); sevEl._t = setTimeout(() => speakPhase(), 700); });
    const vt = $("#vt"), pp = $("#pp");
    if (vt) vt.addEventListener("input", (ev) => { s.vt = +ev.target.value; refresh(); });
    if (pp) pp.addEventListener("input", (ev) => { s.peep = +ev.target.value; refresh(); });
    if ($("#leg")) $("#leg").textContent = spec.leg;
    function spark() {
      const c = $("#sp"); if (!c) return;
      const g = c.getContext("2d"), w = c.width, h = c.height;
      g.clearRect(0, 0, w, h); g.strokeStyle = "#8886"; g.beginPath(); g.moveTo(0, h - 1); g.lineTo(w, h - 1); g.stroke();
      [0, 1].forEach((si) => {
        g.lineWidth = 2; g.beginPath();
        hist.forEach((p, j) => {
          g.strokeStyle = p[si][2];
          const x = j / 79 * w, y = h - 4 - (h - 8) * clamp(p[si][0] / p[si][1]);
          j ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.stroke();
      });
    }
    function step(dt) {
      if (ramp && Math.abs(s.sev - tsev) > 0.003) { s.sev += (tsev - s.sev) * (1 - Math.exp(-dt * 0.5)); if (sevEl) sevEl.value = Math.round(s.sev * 100); refresh(); }
      if (!calm) hr += dt * 3;
      lh += dt;
      if (lh > 0.5) { lh = 0; hist.push(keyFn()); if (hist.length > 80) hist.shift(); spark(); const hrEl = $("#hr"); if (hrEl) hrEl.textContent = Math.floor(hr); }
    }
    const phase = () => s.sev < 0.25 ? 0 : s.sev < 0.5 ? 1 : s.sev < 0.75 ? 2 : 3;
    let lastPh = phase();
    function speakPhase(q) { if (window.parent !== window) window.parent.postMessage({ vo: spec.vod[phase()], q: !!q }, "*"); lastPh = phase(); }
    if ($("#dz")) {
      $("#dz").innerHTML = spec.dz.map((d, i) => `<button data-i="${i}" aria-pressed="false">${d[0]}</button>`).join("");
      $("#dz").addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-i]"); if (!b) return;
        const d = spec.dz[+b.dataset.i];
        Object.keys(s.rx).forEach((k) => delete s.rx[k]);
        d[2].forEach((k) => s.rx[k] = true);
        tsev = d[1]; s.sev = calm ? tsev : 0; ramp = !calm; hr = 0; hist.length = 0;
        if (sevEl) sevEl.value = Math.round(s.sev * 100);
        refresh();
        document.querySelectorAll("#dz button").forEach((x) => x.setAttribute("aria-pressed", x === b));
        $("#info").innerHTML = `<strong>${d[0]}</strong><br>${d[3]}`;
        if (window.parent !== window) window.parent.postMessage({ vo: d[0] + ". " + d[3], q: true }, "*");
      });
    }
    const clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      step(dt);
      if (ramp) { const p = phase(); if (p !== lastPh) { lastPh = p; if (window.parent !== window) window.parent.postMessage({ vo: spec.vod[p], q: true }, "*"); } }
    })();
    go(0);
    refresh();
    if (window.LabShell) {
      const shell = LabShell.attach({ stage, views: spec.views, names: ["Organ", "Cut-away", "Cells"], go });
      const g0 = go; /* keep the chips in step when the lab changes view itself */
    }
  }

  window.LabClinical = { boot };
})();
