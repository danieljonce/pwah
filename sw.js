self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
  });
  
  // --- IndexedDB Helpers for Service Worker (with appId parameter) ---
  function openDatabase() {
    return new Promise(function(resolve, reject) {
      const request = indexedDB.open('pwaGenerator', 1);
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('app')) {
          db.createObjectStore('app', { keyPath: 'id' });
        }
      };
      request.onsuccess = function(event) {
        resolve(event.target.result);
      };
      request.onerror = function(event) {
        reject(event.target.error);
      };
    });
  }
  
  function getCustomHTML(appId) {
    return openDatabase().then(function(db) {
      return new Promise(function(resolve, reject) {
        const transaction = db.transaction('app', 'readonly');
        const store = transaction.objectStore('app');
        const request = store.get(appId);
        request.onsuccess = function() {
          resolve(request.result ? request.result.html : null);
        };
        request.onerror = function() {
          resolve(null);
        };
      });
    });
  }
  
  self.addEventListener('fetch', function(event) {
    // For navigation requests, check if there's an app id in the URL.
    if (event.request.mode === 'navigate') {
      const url = new URL(event.request.url);
      const appId = url.searchParams.get('app');
      if (appId) {
        event.respondWith(
          getCustomHTML(appId).then(function(html) {
            if (html) {
              return new Response(html, {
                headers: { 'Content-Type': 'text/html' }
              });
            } else {
              return fetch(event.request);
            }
          })
        );
        return;
      }
    }
    event.respondWith(fetch(event.request));
  });
  
