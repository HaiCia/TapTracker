const CACHE_NAME = 'taptracker-cache-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './ui.js',
  './map.js',
  './state.js',
  './sheet.js',
  './pwa.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching partial failure, proceeding:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Check request existence and HTTP GET method at entry point
  if (!event.request || event.request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(event.request.url);
  } catch (err) {
    return;
  }

  // If protocol is NOT http/https (e.g. chrome-extension://, moz-extension://), exit immediately
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Bypass cache for Supabase APIs, realtime websockets, and external dynamic requests
  if (
    url.hostname.includes('supabase.co') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // Network-first strategy for local application assets, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
