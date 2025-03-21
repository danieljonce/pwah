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

// Function to inject a script into HTML that will check for saved gistUrl
function injectGistUrlScript(html) {
  // Script to check localStorage and redirect if needed
  const script = `
    <script>
      (function() {
        // Check if we're launched from PWA (no query params but 'source=pwa' in URL)
        const urlParams = new URLSearchParams(window.location.search);
        const isPwaLaunch = urlParams.get('source') === 'pwa' && !urlParams.get('gistUrl');
        
        // If this is a PWA launch and we have a saved gistUrl
        if (isPwaLaunch) {
          try {
            const savedGistUrl = localStorage.getItem('savedGistUrl');
            if (savedGistUrl) {
              console.log('Restoring saved gistUrl:', savedGistUrl);
              
              // We're on the root page, redirect to edit with our saved parameter
              if (!window.location.pathname.includes('/edit')) {
                window.location.href = window.location.origin + '/edit?gistUrl=' + encodeURIComponent(savedGistUrl);
                return; // Stop execution until redirect happens
              }
            }
          } catch (error) {
            console.error('Error checking localStorage:', error);
          }
        }
      })();
    </script>
  `;
  
  // Insert the script at the beginning of the head tag
  if (html.includes('<head>')) {
    return html.replace('<head>', '<head>' + script);
  } 
  // If no head tag, insert it before the body
  else if (html.includes('<body>')) {
    return html.replace('<body>', '<head>' + script + '</head><body>');
  } 
  // Last resort: add it at the beginning of the HTML
  else {
    return script + html;
  }
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
          // Inject script to handle saved gistUrl
          html = injectGistUrlScript(html);
          
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
