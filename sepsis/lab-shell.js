/* Lab shell: the Nephrology Learning Lab layout for the sepsis and DKA 3D labs.
   One stage (real organ, cut-away or cells) with a live readout and a severity thermometer, a row of view chips, labelled
   structures (leader lines on the stage plus a tap list), and four tabs: Explore, Output, Drugs, Disease.
   LabShell.attach({ stage, views, names, go }) rearranges the existing page. The controls keep their ids, so each lab's
   own script keeps working.
   stage  PathStage instance (mounted with leader:true)
   views  ["organ","cut","cells"]
   names  chip captions
   go(i)  switches to view number i (the lab's own function)                                               */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  const CSS = `
#stage{position:relative;height:60vh;min-height:340px;border-radius:14px;overflow:hidden;background:#060b12;touch-action:none}
#stage #cv{position:absolute!important;inset:0!important;height:auto!important;min-height:0!important;border-radius:0!important}
#stage #lbl{display:none}
#hud{position:absolute;left:10px;bottom:44px;color:#cfeee8;font:600 11px/1.45 system-ui,sans-serif;pointer-events:none;text-shadow:0 1px 3px #000;z-index:2;max-width:70%}
#hud span.warn{color:#ff9d8f}
#tb{position:absolute;right:8px;top:8px;bottom:8px;width:14px;border:2px solid #7fd8c0;border-radius:3px 3px 9px 9px;display:flex;align-items:flex-end;overflow:hidden;z-index:2;pointer-events:none}
#tf{display:block;width:100%;height:0;background:#e8d36a;transition:height .3s,background .3s}
#nav{display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;margin:6px 0 8px;padding-bottom:2px}#nav button{white-space:nowrap}
.tabs{display:flex;gap:6px;margin:10px 0 2px}.tabs button{flex:1}
.pane{display:none}.pane.on{display:block}
.tabs button.on,#nav button[aria-pressed="true"]{border-color:var(--acc);color:#fff;background:var(--acc)}
#rx button[aria-pressed="true"],#drugs button[aria-pressed="true"]{border-color:var(--acc);color:#fff;background:var(--acc)}
#exp button{font-size:12.5px;padding:5px 10px}#exp button i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#7fd4e6}#exp button.lesion i{background:#ff7a59}
.sec{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--mute,#546579);margin:12px 0 0}
#info b,#info strong{display:block}
#stages{display:none!important}`;

  function attach(o) {
    const stage = o.stage, cv = $("#cv");
    if (!cv || !stage) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    const row = (id, cls) => { const d = document.createElement("div"); if (id) d.id = id; if (cls) d.className = cls; return d; };

    /* stage wrapper: nav chips above, stage with readout and thermometer */
    const nav = row("nav", "row"), wrap = row("stage");
    cv.parentNode.insertBefore(nav, cv); cv.parentNode.insertBefore(wrap, cv);
    wrap.appendChild(cv);
    const hud = row("hud"), tb = row("tb"), tf = document.createElement("i"); tf.id = "tf"; tb.appendChild(tf);
    wrap.appendChild(hud); wrap.appendChild(tb);

    /* tabs and panes */
    const tabs = row("tabs", "tabs");
    tabs.innerHTML = '<button data-t="0" class="on">Explore</button><button data-t="1">Output</button><button data-t="2">Drugs</button><button data-t="3">Disease</button>';
    const panes = [0, 1, 2, 3].map((i) => { const p = document.createElement("section"); p.className = "pane" + (i ? "" : " on"); p.id = "t" + i; return p; });
    wrap.insertAdjacentElement("afterend", tabs);
    let at = tabs; panes.forEach((p) => { at.insertAdjacentElement("afterend", p); at = p; });
    const put = (pane, el) => { if (el) pane.appendChild(el); };
    const lbl = (f) => document.querySelector('label[for="' + f + '"]');

    /* Explore */
    const sec = row(null, "sec"); sec.textContent = "Labelled structures · tap one";
    const exp = row("exp", "row"); exp.innerHTML = '<span class="hint">Labels load in a moment.</span>';
    put(panes[0], sec); put(panes[0], exp); put(panes[0], $("#info"));
    const leg = $("#leg"); /* the legend sits inside the chart panel; keep it there */
    /* Output */
    put(panes[1], $("#out"));
    const sp = $("#sp"); if (sp) put(panes[1], sp.closest(".panel"));
    const rev = row("revslot"); put(panes[1], rev);
    /* Drugs: the drug list and any extra controls (tidal volume, PEEP) */
    const hint2 = document.createElement("p"); hint2.className = "hint"; hint2.textContent = "Switch treatments on or off. The organ and the outputs change with them.";
    put(panes[2], hint2); put(panes[2], $("#rx") || $("#drugs"));
    ["vt", "pp"].forEach((k) => { put(panes[2], lbl(k)); put(panes[2], $("#" + k)); });
    /* Disease */
    const hint3 = document.createElement("p"); hint3.className = "hint"; hint3.textContent = "Replay the disease from early to critical, or set the severity yourself.";
    put(panes[3], hint3); put(panes[3], $("#dz")); put(panes[3], lbl("sev")); put(panes[3], $("#sev"));
    /* the old stage-button row stays in the page (hidden) because the lab's own code drives the view through it */

    tabs.addEventListener("click", (ev) => {
      const b = ev.target.closest("button"); if (!b) return;
      tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      panes.forEach((p, i) => p.classList.toggle("on", i === +b.dataset.t));
    });

    /* view chips */
    let cur = 0;
    function navBuild() {
      nav.innerHTML = o.views.map((v, i) => '<button data-i="' + i + '" aria-pressed="' + (i === cur) + '">' + esc(o.names[i]) + "</button>").join("");
    }
    navBuild();
    nav.addEventListener("click", (ev) => {
      const b = ev.target.closest("button"); if (!b) return;
      cur = +b.dataset.i; o.go(cur); navBuild(); expKey = ""; expBuild();
    });

    /* tap list of labelled structures */
    let expKey = "";
    function expBuild() {
      const L = stage.pins(), k = JSON.stringify(L.map((x) => x.label)) + cur;
      if (k === expKey) return; expKey = k;
      exp.innerHTML = L.length ? L.map((x) => '<button class="' + x.kind + '" data-i="' + x.i + '"><i></i>' + esc(x.label) + "</button>").join("") : '<span class="hint">Labels load in a moment.</span>';
    }
    exp.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-i]"); if (!b) return;
      stage.focus(+b.dataset.i);
      const q = $("#info"); if (q && q.scrollIntoView) q.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    setInterval(expBuild, 700);

    /* live readout from the lab's own output panel, and the severity thermometer from the stage */
    const out = $("#out");
    function readout() {
      if (!out) return;
      const h = out.innerHTML.split("<ul>")[0].split(/<br\s*\/?>/i).slice(0, 3);
      hud.innerHTML = h.map((x) => (/<span/.test(x) ? x : "<span>" + x + "</span>")).join("<br>");
    }
    if (out) { new MutationObserver(readout).observe(out, { childList: true, subtree: true, characterData: true }); readout(); }
    function thermo() {
      try {
        const e = stage.debug().shown || 0;
        tf.style.height = Math.round(Math.max(0, Math.min(1, e)) * 100) + "%";
        tf.style.background = "hsl(" + Math.round(55 - 55 * Math.max(0, Math.min(1, e))) + ",75%,58%)";
      } catch (err) { /* stage not ready */ }
    }
    setInterval(thermo, 400);
    return { setView(i) { cur = i; navBuild(); expKey = ""; expBuild(); } };
  }

  window.LabShell = { attach };
})();
