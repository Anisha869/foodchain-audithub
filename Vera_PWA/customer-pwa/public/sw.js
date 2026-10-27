// VERA Service Worker — Offline App Shell & Static Asset Caching
// Private records, credentials, and API responses are NEVER cached in public SW cache.

const CACHE_NAME = 'vera-app-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some offline routes aren't rendered yet
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache API requests, Supabase calls, or document downloads
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase.co') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-first strategy with safe static fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && event.request.destination === 'style' || event.request.destination === 'script') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/') || new Response('Offline - VERA requires internet for verification.', {
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        return new Response('Offline', { status: 503 });
      })
  );
});
