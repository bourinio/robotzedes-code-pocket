/* Service worker: η εφαρμογή εγκαθίσταται και δουλεύει χωρίς internet.
   Σε κάθε νέα έκδοση άλλαξε το VERSION ώστε να ανανεωθεί η μνήμη. */
const VERSION = "rz-v3.1";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", "js/app.js",
  "data/ev3.js", "data/spike.js", "data/microbit.js", "data/maqueen.js", "data/arduino.js",
  "data/rccar.js", "data/mbot.js", "data/esp32_pico.js", "data/guides.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Πρώτα από τη μνήμη (γρήγορο & offline), ενημέρωση στο παρασκήνιο για την επόμενη φορά.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(e.request, { ignoreSearch: true }).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached || cache.match("index.html"));
        return cached || network;
      })
    )
  );
});
