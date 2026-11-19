/* Specimen: connects the photoreal PathStage viewer to a Pathology Live lab page.
   Specimen.init({ key, wrap, bar, modelsUrl, ver, onLabel, onPick }) -> Promise<api|null>
     key        id of the entry in pathology-models.json, for example "pancreatitis-necro"
     wrap       empty element that receives the 3D canvas
     bar        element that receives the view buttons (Organ / Cut surface / Cells / Next)
   api: { show(), hide(), sync(severity), view(id), next(), spec }
   A missing key resolves to null, so the page keeps its own interactive model. */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function init(o) {
    const url = (o.modelsUrl || "pathology-models.json") + (o.ver ? "?v=" + encodeURIComponent(o.ver) : "");
    return fetch(url).then((r) => r.json()).then((data) => {
      const spec = (data.complications || []).find((c) => c.id === o.key);
      if (!spec || !window.PathStage) return null;
      let stage = null, curView = "organ", last = "", sev = 0.5;
      const views = spec.views || [];

      const prev = document.createElement("div");
      prev.className = "panel";
      prev.style.display = "none";
      const rev = clampPct(spec.reversible);
      prev.innerHTML = '<b>Reversible or not?</b> ' + esc(spec.reversibleText || "") +
        '<div style="margin-top:6px;height:8px;border-radius:99px;background:var(--line);overflow:hidden" role="img" aria-label="Share of the injury that can recover: ' + rev + ' percent">' +
        '<div style="width:' + rev + '%;height:100%;background:var(--ok,#1d8a5a)"></div></div>' +
        '<div class="hint" style="margin:4px 0 0">Green is the share that can recover when the cause is treated. The rest is permanent damage. Press Play, then compare Normal and Diseased.</div>';
      (o.after || o.wrap).insertAdjacentElement("afterend", prev);

      function ensureStage() {
        if (stage) return;
        stage = PathStage.mount(o.wrap, {
          catalog: [spec], lazy: true, start: spec.id, modelsUrl: false,
          onPick: (p) => { if (o.onPick) o.onPick(p); },
          onLabel: (html) => { if (html !== last) { last = html; if (o.onLabel) o.onLabel(html); } }
        });
        stage.set({ id: spec.id, view: curView, severity: sev });
      }
      function buttons() {
        o.bar.innerHTML = "";
        views.forEach((v) => {
          const b = document.createElement("button");
          b.type = "button"; b.dataset.view = v.id; b.textContent = v.label;
          b.setAttribute("aria-pressed", v.id === curView);
          o.bar.appendChild(b);
        });
        const n = document.createElement("button");
        n.type = "button"; n.dataset.next = "1"; n.textContent = "Next view";
        o.bar.appendChild(n);
      }
      function view(id) {
        if (!views.some((v) => v.id === id)) return;
        curView = id; ensureStage(); stage.set({ view: id }); buttons();
      }
      o.bar.addEventListener("click", (ev) => {
        const b = ev.target.closest("button");
        if (!b || o.bar.style.display === "none") return;
        if (b.dataset.next) { const i = views.findIndex((v) => v.id === curView); view(views[(i + 1) % views.length].id); }
        else if (b.dataset.view) view(b.dataset.view);
      });
      buttons();
      return {
        spec,
        show() { o.wrap.style.display = ""; o.bar.style.display = ""; prev.style.display = ""; ensureStage(); last = ""; stage.set({ id: spec.id, view: curView, severity: sev }); },
        hide() { o.wrap.style.display = "none"; o.bar.style.display = "none"; prev.style.display = "none"; },
        sync(s) { sev = Math.max(0, Math.min(1, s)); if (stage) stage.set({ severity: sev }); },
        view, next() { const i = views.findIndex((v) => v.id === curView); view(views[(i + 1) % views.length].id); }
      };
    }).catch(() => null);
  }
  function clampPct(x) { return Math.round(Math.max(0, Math.min(1, x == null ? 0.5 : x)) * 100); }
  window.Specimen = { init };
})();
