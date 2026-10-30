window.startAnatomy = function(){
  if(window.__bodyBoot) return;
  window.__bodyBoot = true;
  const note = document.getElementById("load");
  function show(text){
    if(!note) return;
    note.textContent = text;
    note.style.cssText = "position:fixed;left:16px;right:16px;bottom:max(18px,env(safe-area-inset-bottom));z-index:90;margin:0;padding:14px 16px;border-radius:14px;background:rgba(8,12,16,.92);border:1px solid rgba(243,239,230,.35);color:#f3efe6;font:600 16px/1.35 system-ui,sans-serif;text-align:center;display:block;pointer-events:none;";
  }
  show("Loading the 3D body…");
  import("./hud-body.js?v=20261030e").catch(function(){
    window.__bodyBoot = false;
    show("The 3D body did not start. Stay on this page and open the patient again.");
  });
};
if(window.__bodyWanted) window.startAnatomy();
