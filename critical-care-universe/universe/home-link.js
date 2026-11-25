/* One way back to the Universe home screen, used by Pathodynamics and Memory Lab.
   On its own it goes straight to the home screen; inside a hall's overlay frame it takes the whole window there (same origin). */
export function goUniverse() {
  const url = new URL("../home/index.html?v=20261126q", import.meta.url).href;
  try { if (window.top && window.top !== window) { window.top.location.href = url; return; } } catch (e) { /* ignore */ }
  location.href = url;
}
