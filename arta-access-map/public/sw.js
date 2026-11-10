// Service worker: επιτρέπει «Εγκατάσταση εφαρμογής» από τον browser και κρατά τη σελίδα διαθέσιμη χωρίς σύνδεση.
// Πάντα προτιμά το δίκτυο (για να φαίνονται οι νέες εκδόσεις)· το API και οι φωτογραφίες δεν αποθηκεύονται.
const CACHE = 'prosvasimi-arta-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/photos/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || Response.error()))
  );
});
