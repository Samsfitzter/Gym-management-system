const CACHE_NAME = 'sams-fitzter-pwa-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/sams_fitzter_logo.jpg'
];

// Install Event - Pre-cache core application shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching application shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle intercepting requests
self.addEventListener('fetch', (event) => {
  // 1. Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 2. Never cache or intercept API endpoints (including authentication, logout, data queries, etc.)
  if (url.pathname.startsWith('/api/')) {
    return; // Fallback to normal network behavior
  }

  // 3. Bypass developer tools HMR
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@fs') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // 4. Handle navigation requests (e.g. user reloading on a route like /members)
  // Try network first, fall back to cached index.html if offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 5. Handle static assets (JS, CSS, images, fonts)
  // We use Stale-While-Revalidate for performance and robustness
  const isStaticAsset = 
    url.pathname.includes('/assets/') ||
    /\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch from network in background to update cache
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {
            // Ignore background fetch errors (e.g. if offline)
          });
          return cachedResponse;
        }

        // Not in cache: fetch from network and store in cache
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch((err) => {
          console.error('[Service Worker] Fetch failed for asset:', url.pathname, err);
          // Return browser default offline behavior
        });
      })
    );
  }
});
