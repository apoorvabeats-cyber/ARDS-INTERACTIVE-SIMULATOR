/* Memory Lab service worker — stale-while-revalidate, bump V to refresh */
const V = 'ccmem-v4';
const SHELL = ['./', 'index.html', 'style.css?v=2', 'app.js?v=4', 'dicom.js', 'focus.js', 'fsrs.js', 'store.js', 'waves.js', 'decks/index.json', 'decks/reviews.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('ccmem-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin || /\.(mp3|mp4|wav)$/.test(new URL(r.url).pathname)) return;   /* sound and video use range requests: leave them to the browser */
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
