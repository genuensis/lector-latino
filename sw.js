/* Service worker del Lector latino: guarda la aplicación y el léxico para usarlos sin conexión. */
const CACHE = 'lector-2026-10-24';
const FILES = [
  "./",
  "index.html",
  "latin.js",
  "lexworker.js",
  "manifest.webmanifest",
  "extras.js",
  "biblioteca.json",
  "data/extra.json",
  "data/lexique.txt",
  "data/modeles.txt",
  "data/regimen.txt",
  "data/tags.txt",
  "lib/jszip.min.js",
  "lib/pdf.min.js",
  "lib/pdf.worker.min.js",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512-maskable.png",
  "icons/icon-512.png"
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('lector-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // tipografías de Google: se guardan la primera vez que se descargan
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE + '-fonts').then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      try { const r = await fetch(req); c.put(req, r.clone()); return r; } catch (err) { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
