/* A message relay for the Multidisciplinary Team room, the shared hall and the voice line.
   The first version talked to ntfy.sh only. That free service now limits how many messages and new topics one phone may use,
   so a shift code often could not be found by the second phone. This relay sends every message to ntfy.sh AND to public MQTT
   brokers (over secure WebSocket, no account), and reads from all of them, so one working service is enough.

   ccuFetch(url, init) is a drop-in for fetch() on the ntfy.sh addresses the app already uses:
     POST  https://ntfy.sh/<topic>                    publish
     GET   https://ntfy.sh/<topic>/json?poll=1&...    everything kept for the topic
     GET   https://ntfy.sh/<topic>/json?since=...     a live stream, one JSON line per message
   Any other address goes straight to fetch().  The answers look the same as ntfy's ({"event":"message","time":..,"message":".."}). */

const BROKERS = ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt", "wss://test.mosquitto.org:8081/mqtt"];
try { const o = localStorage.getItem("ccu.relay"); if (o) BROKERS.splice(0, BROKERS.length, ...o.split(",")); } catch (e) { /* storage blocked: use the public brokers */ }
const PREFIX = "ccu1/";
const enc = new TextEncoder(), dec = new TextDecoder();

/* ---------------------------------------------------------------- a very small MQTT 3.1.1 client (QoS 0, retain) */
const varLen = (n) => { const b = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; b.push(d); } while (n > 0); return b; };
const str = (s) => { const u = enc.encode(s); return [u.length >> 8, u.length & 255, ...u]; };
const packet = (first, body) => { const a = new Uint8Array(1 + varLen(body.length).length + body.length); a[0] = first; const l = varLen(body.length); a.set(l, 1); a.set(body, 1 + l.length); return a; };

class Mqtt {
  constructor(url, onMsg) {
    this.url = url; this.onMsg = onMsg; this.ws = null; this.up = false; this.subs = new Set(); this.queue = []; this.buf = new Uint8Array(0);
    this.backoff = 1500; this.timer = 0; this.ping = 0; this.id = 0; this.dead = false; this.wait = []; this.connect();
  }
  connect() {
    if (this.dead || typeof WebSocket === "undefined") return;
    let ws; try { ws = new WebSocket(this.url, "mqtt"); } catch (e) { return this.retry(); }
    ws.binaryType = "arraybuffer"; this.ws = ws; this.buf = new Uint8Array(0);
    ws.onopen = () => { const cid = "ccu" + Math.random().toString(36).slice(2, 12); ws.send(packet(0x10, new Uint8Array([...str("MQTT"), 4, 2, 0, 45, ...str(cid)]))); };
    ws.onmessage = (e) => { const d = new Uint8Array(e.data), m = new Uint8Array(this.buf.length + d.length); m.set(this.buf); m.set(d, this.buf.length); this.buf = m; this.parse(); };
    ws.onclose = ws.onerror = () => { if (this.ws !== ws) return; this.up = false; clearInterval(this.ping); this.ws = null; this.retry(); };
  }
  retry() { if (this.dead) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.connect(), this.backoff = Math.min(this.backoff * 1.6, 15000)); }
  parse() {
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      let len = 0, mul = 1, i = 1, c;
      do { if (i >= b.length) return; c = b[i++]; len += (c & 127) * mul; mul *= 128; } while (c & 128);
      if (b.length < i + len) return;
      const type = b[0] >> 4, body = b.subarray(i, i + len); this.buf = b.slice(i + len);
      if (type === 2) { if (body[1] === 0) this.opened(); else { try { this.ws.close(); } catch (e) { /* retry */ } } }
      else if (type === 3) { const tl = (body[0] << 8) | body[1], topic = dec.decode(body.subarray(2, 2 + tl)), qos = (b[0] >> 1) & 3, off = 2 + tl + (qos ? 2 : 0); this.onMsg(topic, dec.decode(body.subarray(off))); }
    }
  }
  opened() {
    this.up = true; this.backoff = 1500; clearInterval(this.ping); this.ping = setInterval(() => { try { this.ws.send(new Uint8Array([0xc0, 0])); } catch (e) { /* closed */ } }, 25000);
    this.subs.forEach((t) => this.sendSub(t)); const q = this.queue; this.queue = []; q.forEach(([t, p, r]) => this.publish(t, p, r)); this.wait.splice(0).forEach((f) => f());
  }
  sendSub(t) { try { this.ws.send(packet(0x82, new Uint8Array([(++this.id >> 8) & 255, this.id & 255, ...str(t), 0]))); } catch (e) { /* closed */ } }
  subscribe(t) { if (this.subs.has(t)) return; this.subs.add(t); if (this.up) this.sendSub(t); }
  publish(t, payload, retain) {
    if (!this.up) { if (this.queue.length < 40) this.queue.push([t, payload, retain]); return; }
    try { this.ws.send(packet(0x30 | (retain ? 1 : 0), new Uint8Array([...str(t), ...enc.encode(payload)]))); } catch (e) { /* closed */ }
  }
  ready(ms) { return new Promise((res) => { if (this.up) return res(true); const f = () => res(true); this.wait.push(f); setTimeout(() => res(this.up), ms); }); }
  close() { this.dead = true; clearTimeout(this.timer); clearInterval(this.ping); try { this.ws && this.ws.close(); } catch (e) { /* ignore */ } }
}

/* ---------------------------------------------------------------- topics: what each broker keeps, what a stream gets */
const topics = new Map();                       // ntfy topic -> { store: Map(sub -> {t, m}), listeners: Set, since: ms }
let clients = null;
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

function brokers() {
  if (clients) return clients;
  clients = BROKERS.map((u) => new Mqtt(u, (topic, text) => {
    if (!topic.startsWith(PREFIX)) return; const rest = topic.slice(PREFIX.length), k = rest.indexOf("/"); if (k < 0) return;
    const name = rest.slice(0, k), sub = rest.slice(k + 1), T = topics.get(name); if (!T) return;
    let env; try { env = JSON.parse(text); } catch (e) { return; } if (!env || typeof env.m !== "string") return;
    const old = T.store.get(sub); if (old && old.t >= env.t && old.m === env.m) return;       // the same message from another broker
    T.store.set(sub, { t: env.t, m: env.m }); if (T.store.size > 400) T.store.delete(T.store.keys().next().value);
    T.listeners.forEach((f) => f(env));
  }));
  return clients;
}
function topicOf(name) {
  let T = topics.get(name);
  if (!T) { T = { store: new Map(), listeners: new Set(), subbed: 0 }; topics.set(name, T); }
  if (!T.subbed) { T.subbed = Date.now(); brokers().forEach((c) => c.subscribe(PREFIX + name + "/#")); }
  return T;
}
/* a room's state and each team action are kept by the brokers (retained); a call-out, an offer or a chat line is not */
function subFor(body) {
  let d = null; try { d = JSON.parse(body); } catch (e) { /* not json */ }
  if (d && d.act) return ["a" + hash(JSON.stringify(d.act)), true];
  if (d && d.id && d.code && d.rev !== undefined && d.members) return ["head", true];
  return ["e" + Math.random().toString(36).slice(2, 9), false];
}
function mqttPublish(name, body) {
  const [sub, keep] = subFor(body), env = JSON.stringify({ t: Date.now(), m: body });
  if (env.length > 20000) return; brokers().forEach((c) => c.publish(PREFIX + name + "/" + sub, env, keep));
}

/* ---------------------------------------------------------------- the ntfy half: never throws, never waits long */
const line = (time, message) => JSON.stringify({ event: "message", time: Math.floor(time / 1000), message }) + "\n";
const ntfyPost = (url, init) => fetch(url, init).catch(() => null);
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

export function ccuFetch(url, init) {
  let u; try { u = new URL(url); } catch (e) { return fetch(url, init); }
  if (u.hostname !== "ntfy.sh") return fetch(url, init);
  const rest = u.pathname.split("/").filter(Boolean), name = rest[0], json = rest[1] === "json";
  init = init || {};
  if ((init.method || "GET").toUpperCase() === "POST") {
    const body = typeof init.body === "string" ? init.body : "";
    if (name && body) mqttPublish(name, body);
    if (init.headers && init.headers["X-Ccu"] === "brokers") return Promise.resolve(new Response("", { status: 200 }));        // a quick, frequent message: not worth ntfy's daily allowance
    return ntfyPost(url, init).then((r) => r || new Response("", { status: 200 }));     // a refusal from ntfy must not look like a failure: the brokers have it
  }
  if (!json || !name) return fetch(url, init);
  const T = topicOf(name), poll = u.searchParams.get("poll") === "1", since = u.searchParams.get("since") || "";
  const lines = () => [...T.store.values()].sort((a, b) => a.t - b.t).map((e) => line(e.t, e.m)).join("");
  if (poll) {
    const first = !T.polled; T.polled = true;
    return Promise.all([withTimeout(fetch(url, init).then((r) => (r.ok ? r.text() : "")).catch(() => ""), 6000),
      first ? withTimeout(Promise.all(brokers().map((c) => c.ready(3500))).then(() => new Promise((r) => setTimeout(r, 1400))), 5200) : null])
      .then(([n]) => new Response((n || "") + lines(), { status: 200 }));
  }
  /* a live stream: ntfy's own stream (if it works) plus whatever the brokers deliver; a window of "since" history is replayed */
  const win = /^(\d+)s$/.test(since) ? +since.slice(0, -1) * 1000 : since === "all" ? 1e12 : 0;
  let ctl = null, cb = null, closed = false;
  const stream = new ReadableStream({
    start(c) {
      const out = (s) => { if (!closed) { try { c.enqueue(enc.encode(s)); } catch (e) { /* closed */ } } };
      const seen = new Map(); const dup = (m) => { const now = Date.now(), t = seen.get(m); if (t && now - t < 4000) return true; seen.set(m, now); if (seen.size > 300) seen.delete(seen.keys().next().value); return false; };
      const feed = (time, m) => { if (!dup(m)) out(line(time, m)); };
      cb = (env) => feed(env.t, env.m); T.listeners.add(cb);
      const now = Date.now(); [...T.store.values()].filter((e) => now - e.t < win).sort((a, b) => a.t - b.t).forEach((e) => feed(e.t, e.m));
      ctl = new AbortController(); if (init.signal) init.signal.addEventListener("abort", () => { closed = true; ctl.abort(); T.listeners.delete(cb); try { c.close(); } catch (e) { /* closed */ } });
      (async () => {                                                                            // ntfy's stream, whenever it can be reached
        try {
          const r = await fetch(url, { signal: ctl.signal }); if (!r.ok || !r.body) throw 0;
          const rd = r.body.getReader(), td = new TextDecoder(); let b = "";
          for (;;) { const { done, value } = await rd.read(); if (done || closed) break; b += td.decode(value, { stream: true }); let k; while ((k = b.indexOf("\n")) >= 0) { const l = b.slice(0, k); b = b.slice(k + 1); try { const m = JSON.parse(l); if (m.event === "message" && m.message) feed(m.time * 1000, m.message); } catch (e) { /* keep-alive line */ } } }
        } catch (e) { /* the brokers carry on */ }
      })();
    },
    cancel() { closed = true; try { ctl && ctl.abort(); } catch (e) { /* ignore */ } T.listeners.delete(cb); },
  });
  return Promise.resolve(new Response(stream, { status: 200 }));
}
if (typeof window !== "undefined") window.ccuFetch = ccuFetch;
export const __relayTest = { Mqtt, BROKERS: () => BROKERS, setBrokers: (l) => { BROKERS.splice(0, BROKERS.length, ...l); clients && clients.forEach((c) => c.close()); clients = null; topics.clear(); } };
