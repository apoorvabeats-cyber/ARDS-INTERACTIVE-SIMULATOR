import json,sys,re
db=json.load(open(sys.argv[1]));base=open(sys.argv[2]).read();VER=sys.argv[3]
nm=lambda c:' '.join(c['name']).replace('- ','')
mods={'sepsis':{"def":"shock","mf":"sepsis/map.html","lf":"sepsis/lab-{l}.html","labs":[["shock","Septic shock"],["cardiac","Myocardial dysfunction"],["ards","ARDS"],["aki","AKI"],["dic","DIC"],["enceph","Encephalopathy"]]},
      'dka':{"def":"meta","mf":"dka/map.html","lf":"dka/lab-{l}.html","labs":[["meta","Metabolism"],["kidney","Kidney and volume"],["brain","Brain"]]}}
for d in db['diseases']:
    mods[d['id']]={"mf":f"cc/map.html?d={d['id']}","lf":f"cc/lab.html?d={d['id']}&c={{l}}","labs":[[c['id'],nm(c)] for c in d['complications']]}
s=base
# markup
a=s.index('<div id="pane" hidden>');b=s.index('</div>',s.index('<iframe id="frame"'))+6
s=s[:a]+'<div id="pane" hidden>\n    <iframe id="frame" title="Disease map"></iframe>\n    <iframe id="lab" title="3D lab" hidden></iframe>\n  </div>'+s[b:]
s=s.replace('<button type="button" id="voice" aria-pressed="true">Voice on</button>','<button type="button" id="mapBack" hidden>← Map</button>\n    <button type="button" id="voice" aria-pressed="true">Voice on</button>')
s=re.sub(r'<p class="sub">.*?</p>','<p class="sub">Pick a disease, tap a complication on its map, then open the 3D lab.</p>',s,count=1,flags=re.S)
# css
a=s.index('.subtabs,.labpick{');b=s.index('</style>',a)
s=s[:a]+'''#voice,#mapBack{flex:0 0 auto;min-height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--muted);font:inherit;cursor:pointer}
#voice[aria-pressed="true"]{color:var(--fg);border-color:var(--fg)}
#mapBack{color:var(--cool);border-color:var(--cool)}
#mapBack[hidden],iframe[hidden]{display:none}
#frame,#lab{display:block;width:100%;height:calc(100dvh - 150px);min-height:560px;border:0;border-radius:14px;margin-top:10px;background:#071018}
.soon{margin-top:18px;color:var(--muted)}
'''+s[b:]
# script
a=s.index('const MODS = ');b=s.index('};',a)+2
s=s[:a]+'const MODS = '+json.dumps(mods,ensure_ascii=False,indent=1)+';'+s[b:]
s=re.sub(r'const VER = "[^"]*";','const VER = "%s";'%VER,s)
a=s.index('const state = ');b=s.index('\n',a)
s=s[:a]+'const state = {id:"sepsis", lab:null};'+s[b:]
s=s.replace('const frame = document.getElementById("frame");','const frame = document.getElementById("frame"), labf = document.getElementById("lab");')
s=s.replace('if(e.source !== frame.contentWindow) return;','if(e.source !== frame.contentWindow && e.source !== labf.contentWindow) return;')
s=s.replace('if(d.lab && mod && mod.labs.some(l=>l[0]===d.lab)){ state.tab = "lab"; state.lab[state.id] = d.lab; render(); }','if(d.lab && mod && e.source === frame.contentWindow && mod.labs.some(l=>l[0]===d.lab)){ state.lab = d.lab; render(); }')
a=s.index('function render(){');b=s.index('$("diseases").innerHTML')
s=s[:a]+'''const withV = u => u + (u.indexOf("?")<0?"?":"&") + "v=" + VER;
function render(){
  const mod = MODS[state.id];
  document.querySelectorAll("#diseases button").forEach(b=>b.classList.toggle("on", b.dataset.id===state.id));
  $("pane").hidden = !mod;
  $("soon").hidden = !!mod;
  if(!mod){
    frame.removeAttribute("src");
    $("soon").textContent = TABS.find(t=>t[0]===state.id)[1]+" is being rebuilt.";
    $("mapBack").hidden = true;
    return;
  }
  const mapSrc = withV(mod.mf);
  if(frame.getAttribute("src") !== mapSrc){ if(window.speechSynthesis) speechSynthesis.cancel(); frame.src = mapSrc; }
  frame.hidden = !!state.lab; labf.hidden = !state.lab; $("mapBack").hidden = !state.lab;
  if(state.lab){
    const ls = withV(mod.lf.replace("{l}", state.lab));
    if(labf.getAttribute("src") !== ls){ if(window.speechSynthesis) speechSynthesis.cancel(); labf.src = ls; }
  } else if(labf.getAttribute("src") !== "about:blank"){ labf.src = "about:blank"; }
}
'''+s[b:]
a=s.index('$("diseases").onclick');b=s.index('const want')
s=s[:a]+'''$("diseases").onclick = e=>{ const b=e.target.closest("[data-id]"); if(b){ if(state.id!==b.dataset.id) state.lab = null; state.id=b.dataset.id; render(); } };
$("mapBack").onclick = ()=>{ state.lab = null; if(window.speechSynthesis) speechSynthesis.cancel(); render(); };
'''+s[b:]
open(sys.argv[4],'w').write(s)
