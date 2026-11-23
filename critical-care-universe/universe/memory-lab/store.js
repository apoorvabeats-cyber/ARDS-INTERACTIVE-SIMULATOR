/* local storage for Memory Lab: IndexedDB (progress, review history, own decks, settings). If the browser refuses IndexedDB it falls back to localStorage. */
let db = null, mem = null;
const LS = "ccmem.fallback.v1";
const open = () => new Promise((res) => {
  try {
    const rq = indexedDB.open("ccmem", 1);
    rq.onupgradeneeded = () => { const d = rq.result; d.createObjectStore("prog", { keyPath: "id" }); d.createObjectStore("log", { autoIncrement: true }); d.createObjectStore("kv", { keyPath: "k" }); };
    rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onblocked = () => res(null);
  } catch (e) { res(null); }
});
const all = (st) => new Promise((res) => { try { const out = [], rq = db.transaction(st).objectStore(st).openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { out.push(c.value); c.continue(); } else res(out); }; rq.onerror = () => res(out); } catch (e) { res([]); } });
const put = (st, v) => { try { db.transaction(st, "readwrite").objectStore(st).put(v); } catch (e) { /* ignore */ } };
const lsSave = () => { try { localStorage.setItem(LS, JSON.stringify(mem)); } catch (e) { /* ignore */ } };
export async function init() {
  db = await open();
  if (!db) { try { mem = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { mem = null; } mem = mem || { prog: [], log: [], kv: {} }; return { prog: mem.prog, log: mem.log, kv: mem.kv, mode: "local" }; }
  const [prog, log, kvs] = await Promise.all([all("prog"), all("log"), all("kv")]); const kv = {}; kvs.forEach((r) => { kv[r.k] = r.v; });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  return { prog, log, kv, mode: "idb" };
}
export const saveProg = (p) => { if (db) put("prog", p); else { const i = mem.prog.findIndex((x) => x.id === p.id); if (i < 0) mem.prog.push(p); else mem.prog[i] = p; lsSave(); } };
export const addLog = (e) => { if (db) { try { db.transaction("log", "readwrite").objectStore("log").add(e); } catch (x) { /* ignore */ } } else { mem.log.push(e); if (mem.log.length > 6000) mem.log.splice(0, mem.log.length - 6000); lsSave(); } };
export const setKV = (k, v) => { if (db) put("kv", { k, v }); else { mem.kv[k] = v; lsSave(); } };
export async function wipe() { if (db) { await new Promise((r) => { const t = db.transaction(["prog", "log"], "readwrite"); t.objectStore("prog").clear(); t.objectStore("log").clear(); t.oncomplete = r; t.onerror = r; }); } else { mem.prog = []; mem.log = []; lsSave(); } }
export async function restore(data) { await wipe(); (data.prog || []).forEach(saveProg); (data.log || []).forEach(addLog); Object.keys(data.kv || {}).forEach((k) => setKV(k, data.kv[k])); }
