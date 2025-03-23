const CACHE_NAME = 'pwah-app-v1';

// Files to cache
const CACHE_URLS = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './sw.js',
  './styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-icon-152.png',
  './icons/apple-icon-167.png',
  './icons/apple-icon-180.png',
  './icons/splash/apple-splash-dark-2048-2732.png',
  './icons/splash/apple-splash-dark-1668-2388.png',
  './icons/splash/apple-splash-dark-1536-2048.png',
  './icons/splash/apple-splash-dark-1125-2436.png',
  './icons/splash/apple-splash-dark-750-1334.png'
];

// Install event - Cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app files');
        return cache.addAll(CACHE_URLS);
      })
      .catch(error => {
        console.error('[Service Worker] Caching failed:', error);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  self.clients.claim();
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event handler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  console.log('[Service Worker] Fetch:', url.pathname);
  
  // For navigation requests, try network first then fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the response for future use
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Falling back to cache for:', url.pathname);
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('./index.html');
            });
        })
    );
    return;
  }
  
  // For non-navigate requests (assets), try cache first then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Cache the asset for future use
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
}); 