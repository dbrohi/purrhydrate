// PurrHydrate service worker
// Caches the app shell (this static site) so the hydration calculator and the
// habit tracker keep working without a network connection after the first visit.
// The tracker's data itself lives in localStorage, which already works offline —
// this file is only responsible for making the PAGE ITSELF load without a network.

const CACHE_NAME = 'purrhydrate-v1';

// Everything needed to browse the site with no network. Google Fonts are
// intentionally left out — if they're unavailable offline, the page just
// falls back to system fonts, which is fine.
const APP_SHELL = [
  './',
  './index.html',
  './privacy.html',
  './terms.html',
  './affiliate-disclosure.html',
  './contact.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.error('PurrHydrate SW: install caching failed', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Strategy: network-first for same-origin page requests (so visitors editing
// the live site always see the latest version when online), falling back to
// the cache — and finally to the cached index.html — when offline.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests for our own origin; let everything else
  // (Amazon links, Google Fonts, etc.) go straight to the network as normal.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
