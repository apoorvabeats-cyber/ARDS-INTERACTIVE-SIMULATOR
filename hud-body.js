/* Hub 3D body loader. Checks WebGL first so a phone without it still reaches every room. */
function hasWebGL(){
  try{ const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch(e){ return false; }
}
const FALLBACK = [["brain","Brain"],["spinal","Spinal cord"],["lungs","Lungs"],["heart","Heart"],["liver","Liver"],["stomach","Stomach"],["pancreas","Pancreas"],["spleen","Spleen"],["kidneys","Kidneys"],["bowel","Gastrointestinal"],["bladder","Bladder"],["adrenal","Adrenal"],["thyroid","Thyroid"],["vessels","Vessels"],["multi","Whole patient"]];
function showRoomList(){
  const note = document.getElementById("load");
  if(note){ note.textContent = ""; note.style.display = "none"; }
  const host = document.getElementById("figure") || (note && note.parentNode);
  if(!host || document.getElementById("no3d")) return;
  let list = FALLBACK;
  try{ if(typeof ORGANS !== "undefined" && ORGANS.length) list = ORGANS.map(function(o){ return [o.id, o.name]; }); }catch(e){}
  const box = document.createElement("nav");
  box.id = "no3d";
  box.setAttribute("aria-label", "Choose an area");
  box.style.cssText = "position:absolute;inset:0;z-index:6;overflow:auto;padding:56px 14px 18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-content:start;background:rgba(7,19,27,.96)";
  const head = document.createElement("p");
  head.textContent = "3D is unavailable on this device. Choose an area.";
  head.style.cssText = "grid-column:1/-1;margin:0 0 4px;font:500 13px/1.4 system-ui,sans-serif;color:#b7b1a4";
  box.appendChild(head);
  list.forEach(function(p){
    const b = document.createElement("button");
    b.type = "button"; b.textContent = p[1];
    b.style.cssText = "min-height:48px;padding:10px 12px;border-radius:12px;border:1px solid rgba(127,212,230,.45);background:#0c1823;color:#e7f6fb;font:600 15px system-ui,sans-serif;text-align:left";
    b.addEventListener("click", function(){ if(window.enterOrgan) window.enterOrgan(p[0]); });
    box.appendChild(b);
  });
  host.appendChild(box);
}
if(!hasWebGL()){
  showRoomList();
}else if(!window.__hudBody3dLoading){
  window.__hudBody3dLoading = true;
  try{ await import("./hud-body-3d.js?v=20261122e"); }
  catch(e){ window.__hudBody3dLoading = false; throw e; }
}
