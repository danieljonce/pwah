const CACHE_NAME = 'pwah-app-v27';

// Files to cache
const CACHE_URLS = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './sw.js',
  './styles.css',
  './icons/android/android-launchericon-192-192.png',
  './icons/android/android-launchericon-512-512.png',
  './icons/ios/apple-icon-152.png',
  './icons/ios/apple-icon-167.png',
  './icons/ios/apple-icon-180.png',
  './icons/ios/apple-icon-192.png',
  './icons/ios/apple-icon-512.png',
  './icons/ios/apple-icon-1024.png',
  './icons/splash/iPhone_16_Pro_Max_portrait.png',
  './icons/splash/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_portrait.png',
  './icons/splash/iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait.png',
  './icons/splash/iPhone_11__iPhone_XR_portrait.png',
  './icons/splash/iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_portrait.png',
  './icons/splash/12.9__iPad_Pro_portrait.png',
  './icons/splash/11__iPad_Pro__10.5__iPad_Pro_portrait.png',
  './icons/splash/9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_portrait.png',
  './icons/splash/12.9__iPad_Pro_landscape.png',
  './icons/splash/11__iPad_Pro__10.5__iPad_Pro_landscape.png'
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