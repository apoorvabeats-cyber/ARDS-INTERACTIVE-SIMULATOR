/* Memory Lab service worker — stale-while-revalidate, bump V to refresh */
const V = 'ccmem-v5';
const SHELL = ['./', 'index.html', 'style.css?v=3', 'app.js?v=5', '../home-link.js?v=20261126q', 'dicom.js', 'focus.js', 'fsrs.js', 'store.js', 'waves.js', 'decks/index.json', 'decks/reviews.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('ccmem-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  /* pages are fetched fresh first (so a new release shows at once); the cache is only the offline fallback */
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { if (res && res.ok) { const k = res.clone(); caches.open(V).then(c => c.put(r, k)); } return res; }).catch(() => caches.match(r).then(h => h || caches.match('index.html')))); return; }
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin || /\.(mp3|mp4|wav)$/.test(new URL(r.url).pathname)) return;   /* sound and video use range requests: leave them to the browser */
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
