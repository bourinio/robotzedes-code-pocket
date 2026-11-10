/* Offline cache. Άλλαξε το VERSION σε κάθε έκδοση για να ανανεωθούν τα αρχεία. */
const VERSION = "roboatlas-v1";
const FILES = ["./", "index.html", "css/app.css", "icon.svg", "manifest.webmanifest",
  "data/equipment.js", "data/competitions.js", "data/suppliers.js", "js/i18n.js", "js/engine.js", "js/app.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Πρώτα δίκτυο (για φρέσκα δεδομένα), αλλιώς cache
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
