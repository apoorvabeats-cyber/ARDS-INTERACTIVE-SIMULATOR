(function(){
  function owner(){
    try{
      if(window.parent && window.parent !== window && window.parent.__bedOwner) return window.parent;
    }catch(err){}
    return window;
  }
  function bed(){ return document.getElementById("bed"); }
  function lineBusy(){
    var line = document.getElementById("line");
    return !!(line && line.src && !line.paused && !line.ended);
  }
  function startBed(){
    if(window.soundOn === false || document.hidden || lineBusy()) return;
    if(window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) return;
    if(typeof window.startWave === "function") window.startWave();
    else {
      var node = bed();
      if(!node) return;
      node.muted = false;
      var pending = node.play();
      if(pending && pending.catch) pending.catch(function(){});
    }
  }
  if(bed()){
    window.__bedOwner = true;
    if(typeof window.voiceHold !== "number") window.voiceHold = 0;
    window.pauseBedForVoice = function(){
      window.voiceHold += 1;
      var node = bed();
      if(node && !node.paused) node.pause();
    };
    window.resumeBed = function(){
      window.voiceHold = Math.max(0, window.voiceHold - 1);
      if(window.voiceHold) return;
      startBed();
    };
    window.releaseBedVoice = function(){
      window.voiceHold = 0;
      startBed();
    };
  }
  if(window.speechSynthesis && !speechSynthesis.__bedPatched){
    var orig = speechSynthesis.speak.bind(speechSynthesis);
    var origCancel = speechSynthesis.cancel.bind(speechSynthesis);
    var active = [];
    function finish(utterance){
      var i = active.indexOf(utterance);
      if(i < 0) return;
      active.splice(i, 1);
      var host = owner();
      if(host.resumeBed) host.resumeBed();
    }
    speechSynthesis.speak = function(utterance){
      var host = owner();
      if(host.pauseBedForVoice) host.pauseBedForVoice();
      active.push(utterance);
      utterance.addEventListener("end", function(){ finish(utterance); });
      utterance.addEventListener("error", function(){ finish(utterance); });
      try { return orig(utterance); }
      catch(err){ finish(utterance); throw err; }
    };
    speechSynthesis.cancel = function(){
      var pending = active.slice();
      try { return origCancel(); }
      finally { pending.forEach(finish); }
    };
    speechSynthesis.__bedPatched = true;
  }
  window.addEventListener("pagehide", function(){
    var host = owner();
    if(host === window) return;
    try{ if(host.document.hidden) return; }catch(err){ return; }
    if(host.releaseBedVoice) host.releaseBedVoice();
  });
})();
