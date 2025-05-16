const CACHE_NAME = 'pwa-cache-v1';
const OFFLINE_URL = '/lordcustomers/index.html';
const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/lordcustomers/styles.css',
  '/lordcustomers/app.js',
  '/lordcustomers/manifest.json',
  '/lordcustomers/icons/lord-icon.png'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve cache first, then network, fallback to offline page
self.addEventListener('fetch', event => {
  const req = event.request;

  // For navigation requests, always serve the app shell (index.html)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(OFFLINE_URL)
        .then(resp => resp || fetch(OFFLINE_URL))
    );
    return;
  }

  // For other requests, try cache first
  event.respondWith(
    caches.match(req)
      .then(resp => resp || fetch(req).then(fetchResp => {
        // and cache the new resource
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, fetchResp.clone());
          return fetchResp;
        });
      }))
      .catch(() => {
        // If both fail (e.g. image), you could return a default placeholder here
      })
  );
});
