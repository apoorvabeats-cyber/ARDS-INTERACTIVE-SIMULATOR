/* Peer-to-peer link between the doctors in the shared ICU hall.
   Positions travel over WebRTC data channels (browser to browser). The only thing that goes through a server is the
   short "hello / offer / answer" handshake, which uses the same free public ntfy.sh topic service the Multidisciplinary
   Team room already uses, so there is nothing to host or sign up for. A BroadcastChannel signal is provided for tests.

   createHallNet({ code, id, name, spec, sex, signal?, iceServers?, onPeers, onPeerState, onPeerLeave }) ->
     { send(state), peers(), close() }
   state = { x, z, y (yaw), a (0 idle / 1 walking), bed (-1 or the bed index you stand beside) }                    */

export const ICE = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
  { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turns:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" },
];

const clean = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

/* ---- signalling over ntfy.sh (works from any browser; no account) ---- */
export function ntfySignal(code, onMsg) {
  const topic = "ccu-hall-" + clean(code).toLowerCase() + "-v1", url = "https://ntfy.sh/" + topic;
  let ctl = null, closed = false, backoff = 1000;
  const run = async () => {
    if (closed) return;
    ctl = new AbortController();
    try {
      const r = await fetch(url + "/json?since=40s", { signal: ctl.signal });
      if (!r.ok || !r.body) throw new Error("no feed");
      backoff = 1000;
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let k; while ((k = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, k); buf = buf.slice(k + 1); if (!line.trim()) continue;
          try { const m = JSON.parse(line); if (m.event === "message" && m.message) { const d = JSON.parse(m.message); onMsg(d, m.time); } } catch (e) { /* not ours */ }
        }
      }
    } catch (e) { /* retry below */ }
    if (!closed) setTimeout(run, backoff = Math.min(backoff * 1.7, 8000));
  };
  run();
  return {
    send(d) { const b = JSON.stringify(d); if (b.length > 3900) return Promise.resolve(); return fetch(url, { method: "POST", body: b }).catch(() => {}); },
    close() { closed = true; try { ctl && ctl.abort(); } catch (e) { /* ignore */ } },
  };
}

/* ---- signalling between tabs on this device (used by the automated test) ---- */
export function localSignal(code, onMsg) {
  const bc = new BroadcastChannel("ccu-hall-" + clean(code));
  bc.onmessage = (e) => onMsg(e.data, Date.now() / 1000);
  return { send(d) { bc.postMessage(d); return Promise.resolve(); }, close() { bc.close(); } };
}

export function createHallNet(o) {
  const sid = Math.random().toString(36).slice(2, 10), me = { sid, id: o.id, name: o.name, spec: o.spec, sex: o.sex, look: o.look || null };
  const cleanLook = (l) => (l && typeof l === "object" && JSON.stringify(l).length < 400 ? l : null);        // an avatar config is tiny; never relay anything bigger
  const peers = new Map();                       // sid -> { sid, id, name, spec, sex, pc, dc, open, st, t0, init }
  let closed = false, t0 = 0, helloTimer = 0, last = null, lastSend = 0, quiet = 0;
  const ice = o.iceServers || ICE;
  const sig = (o.signal || ntfySignal)(o.code, (d, time) => { if (!closed) handle(d, time); });
  const say = (d) => sig.send(Object.assign({ from: sid }, d));
  const hello = (re) => say({ t: "hi", id: me.id, name: me.name, spec: me.spec, sex: me.sex, look: me.look, re: !!re });

  function emit() { if (o.onPeers) o.onPeers([...peers.values()].map(pub)); }
  const pub = (p) => ({ sid: p.sid, id: p.id, name: p.name, spec: p.spec, sex: p.sex, look: p.look, connected: !!p.open, st: p.st });

  function drop(p, why) {
    if (!peers.has(p.sid)) return;
    try { p.dc && p.dc.close(); } catch (e) { /* ignore */ }
    try { p.pc && p.pc.close(); } catch (e) { /* ignore */ }
    peers.delete(p.sid);
    if (o.onPeerLeave) o.onPeerLeave(pub(p), why);
    emit();
  }

  function wire(p) {
    const pc = p.pc;
    pc.oniceconnectionstatechange = () => { if (self.__hallDebug) console.log('ice', p.name, pc.iceConnectionState); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") drop(p, pc.connectionState);
      else if (pc.connectionState === "disconnected") setTimeout(() => { if (peers.get(p.sid) === p && pc.connectionState !== "connected") drop(p, "disconnected"); }, 6000);
    };
  }
  function channel(p, dc) {
    p.dc = dc;
    dc.onopen = () => { p.open = true; emit(); if (last) dc.send(JSON.stringify(last)); };
    dc.onclose = () => { p.open = false; drop(p, "closed"); };
    dc.onmessage = (e) => { try { const m = JSON.parse(e.data); if (m && m.t === "s") { p.st = m; if (o.onPeerState) o.onPeerState(pub(p), m); } } catch (err) { /* ignore */ } };
  }
  const gathered = (pc) => new Promise((res) => {
    if (pc.iceGatheringState === "complete") return res();
    const f = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", f); res(); } };
    pc.addEventListener("icegatheringstatechange", f); setTimeout(res, 3500);
  });
  const sdpOf = (pc) => {
    let s = pc.localDescription.sdp;
    if (s.length > 3500) s = s.split("\r\n").filter((l) => !/typ (srflx|host).*tcptype|a=candidate:.* tcp /.test(l)).join("\r\n");
    return { type: pc.localDescription.type, sdp: s };
  };

  async function offerTo(p) {
    if (p.pc || closed) return;
    if (self.__hallDebug) console.log('offer ->', p.name);
    p.pc = new RTCPeerConnection({ iceServers: ice }); wire(p);
    channel(p, p.pc.createDataChannel("pos", { ordered: false, maxRetransmits: 0 }));
    await p.pc.setLocalDescription(await p.pc.createOffer());
    await gathered(p.pc);
    say({ t: "offer", to: p.sid, sdp: sdpOf(p.pc) });
    p.t0 = Date.now();
  }

  async function handle(d, time) {
    if (!d || d.from === sid) { if (d && d.from === sid && d.t === "hi" && !t0) t0 = time || Date.now() / 1000; return; }
    if (t0 && time && time < t0 - 40) return;                   // stale history from an earlier visit
    if (d.t === "hi") {
      let p = peers.get(d.from); const known = !!p;
      if (!p) { p = { sid: d.from, id: d.id, name: d.name, spec: d.spec, sex: d.sex, look: cleanLook(d.look), pc: null, dc: null, open: false, st: null, t0: 0 }; peers.set(d.from, p); }
      Object.assign(p, { id: d.id, name: d.name, spec: d.spec, sex: d.sex, look: cleanLook(d.look) });
      emit();
      if (!d.re && !known) hello(true);
      if (me.sid < p.sid && !p.pc) offerTo(p);                    // the lower id always starts the call
    } else if (d.t === "offer" && d.to === sid) {
      if (self.__hallDebug) console.log('offer <-', d.from);
      let p = peers.get(d.from); if (!p) return;
      if (p.pc) { try { p.pc.close(); } catch (e) { /* ignore */ } p.pc = null; }
      p.pc = new RTCPeerConnection({ iceServers: ice }); wire(p);
      p.pc.ondatachannel = (e) => channel(p, e.channel);
      await p.pc.setRemoteDescription(d.sdp);
      await p.pc.setLocalDescription(await p.pc.createAnswer());
      await gathered(p.pc);
      say({ t: "answer", to: p.sid, sdp: sdpOf(p.pc) });
    } else if (d.t === "answer" && d.to === sid) {
      if (self.__hallDebug) console.log('answer <-', d.from);
      const p = peers.get(d.from);
      if (p && p.pc && p.pc.signalingState === "have-local-offer") await p.pc.setRemoteDescription(d.sdp).catch(() => {});
    } else if (d.t === "bye") {
      const p = peers.get(d.from); if (p) drop(p, "left");
    }
  }

  hello(false);
  helloTimer = setInterval(() => {
    const now = Date.now();
    if (!peers.size && (++quiet % 3 === 0)) hello(false);       // alone: call out again now and then (kept rare: the free service rate-limits)
    peers.forEach((p) => {                                       // a call that never connected is torn down and retried
      if (!p.open && p.pc && p.t0 && now - p.t0 > 15000) { try { p.pc.close(); } catch (e) { /* ignore */ } p.pc = null; p.dc = null; p.t0 = 0; if (me.sid < p.sid) offerTo(p); }
    });
  }, 7000);
  addEventListener("pagehide", () => { closed || say({ t: "bye" }); });

  return {
    sid,
    send(st) {
      last = Object.assign({ t: "s" }, st);
      const now = performance.now(); if (now - lastSend < 90) return; lastSend = now;
      const b = JSON.stringify(last);
      peers.forEach((p) => { if (p.open && p.dc && p.dc.readyState === "open") { try { p.dc.send(b); } catch (e) { /* ignore */ } } });
    },
    peers: () => [...peers.values()].map(pub),
    close() { closed = true; clearInterval(helloTimer); say({ t: "bye" }); peers.forEach((p) => { try { p.pc && p.pc.close(); } catch (e) { /* ignore */ } }); peers.clear(); setTimeout(() => sig.close(), 400); },
  };
}
