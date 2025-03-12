self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// --- IndexedDB Helpers for Service Worker ---
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

function getCustomHTML(hostname) {
  return openDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      const transaction = db.transaction('app', 'readonly');
      const store = transaction.objectStore('app');
      const request = store.get(hostname);
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
  // For navigation requests, except edit mode
  if (event.request.mode === 'navigate') {
    const url = new URL(event.request.url);
    
    // Skip interception if we're in edit mode
    if (url.pathname.includes('/edit')) {
      return;
    }
    
    // Use the hostname as the app key
    const hostname = url.hostname;
    
    event.respondWith(
      getCustomHTML(hostname).then(function(html) {
        if (html) {
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
          });
        } else {
          return fetch(event.request);
        }
      }).catch(function() {
        // If there's any error, fall back to the default page
        return fetch(event.request);
      })
    );
    return;
  }
  
  // For all other requests, fetch normally
  event.respondWith(fetch(event.request));
});
