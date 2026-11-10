// Service worker: επιτρέπει «Εγκατάσταση εφαρμογής» και κρατά την εφαρμογή διαθέσιμη χωρίς σύνδεση.
// Προτιμά πάντα το δίκτυο (για να φαίνονται οι νέες εκδόσεις). Το API και οι φωτογραφίες του server δεν αποθηκεύονται.
const CACHE = 'prosvasimi-arta-v4';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/photos/')) return;
  e.respondWith((async () => {
    try {
      let res = await fetch(e.request);
      // Οι σελίδες που ανακατευθύνονται (π.χ. /admin.html → /admin) αποθηκεύονται χωρίς την ανακατεύθυνση
      if (res.redirected) res = new Response(await res.blob(), { status: res.status, headers: res.headers });
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    } catch {
      return (await caches.match(e.request, { ignoreSearch: true })) ||
        (e.request.mode === 'navigate' && (await caches.match('./'))) || Response.error();
    }
  })());
});
