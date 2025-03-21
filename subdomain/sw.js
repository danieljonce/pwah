self.addEventListener('install', function(event) {
  // Force the waiting service worker to become the active service worker
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  // Claim control over all clients immediately
  event.waitUntil(self.clients.claim());
});

// --- IndexedDB Helpers for Service Worker ---
function openDatabase() {
  return new Promise(function(resolve, reject) {
    const request = indexedDB.open('pwaGenerator', 2);
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

function getCustomData(hostname) {
  return openDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      const transaction = db.transaction('app', 'readonly');
      const store = transaction.objectStore('app');
      const request = store.get(hostname);
      request.onsuccess = function() {
        if (request.result) {
          // Handle both new and old data format
          if ('gistUrl' in request.result) {
            resolve({
              html: request.result.html,
              gistUrl: request.result.gistUrl
            });
          } else if (typeof request.result.html === 'string') {
            resolve({
              html: request.result.html,
              gistUrl: null
            });
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = function() {
        resolve(null);
      };
    });
  });
}

// Function to inject scripts for gistUrl handling and improved PWA behavior
function injectPWAScripts(html, savedGistUrl) {
  // Script to handle PWA launch and gistUrl restoration
  const script = `
    <script>
      (function() {
        // iOS PWA detection
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                                  window.navigator.standalone || 
                                  document.referrer.includes('android-app://');
        
        // Check if we're launched from PWA
        const urlParams = new URLSearchParams(window.location.search);
        const isPwaSource = urlParams.get('source') === 'pwa';
        const isPWA = isInStandaloneMode || isPwaSource;
        
        // Special handling for PWA mode
        if (isPWA) {
          // Log the PWA launch
          console.log('Detected PWA launch mode');
          
          // Get gistUrl from URL if present
          const urlGistUrl = urlParams.get('gistUrl');
          
          // Check if we're already on the app view (root path)
          const isAppView = window.location.pathname === '/' || window.location.pathname === '';
          
          // Only redirect if we're not already in the app view and not in edit mode
          if (!isAppView && !window.location.pathname.includes('/edit')) {
            // Try the injected value from service worker
            const injectedGistUrl = "${savedGistUrl || ''}";
            
            if (injectedGistUrl) {
              console.log('Restoring gistUrl from service worker injection:', injectedGistUrl);
              
              // On iOS, we need to use replacState instead of href to avoid iOS PWA issues
              if (navigator.standalone) {
                const newUrl = window.location.origin + '/edit?source=pwa&gistUrl=' + encodeURIComponent(injectedGistUrl);
                window.history.replaceState({}, '', newUrl);
                // Force a page reload to apply changes
                window.location.reload();
              } else {
                window.location.href = window.location.origin + '/edit?source=pwa&gistUrl=' + encodeURIComponent(injectedGistUrl);
              }
              return;
            }
            
            // Try cookies, which often work better on iOS
            try {
              const cookies = document.cookie.split(';');
              for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.startsWith('gistUrlCookie=')) {
                  const cookieGistUrl = decodeURIComponent(cookie.substring('gistUrlCookie='.length));
                  if (cookieGistUrl) {
                    console.log('Restoring gistUrl from cookies:', cookieGistUrl);
                    
                    // On iOS, we need to use replacState instead of href
                    if (navigator.standalone) {
                      const newUrl = window.location.origin + '/edit?source=pwa&gistUrl=' + encodeURIComponent(cookieGistUrl);
                      window.history.replaceState({}, '', newUrl);
                      // Force a page reload to apply changes
                      window.location.reload();
                    } else {
                      window.location.href = window.location.origin + '/edit?source=pwa&gistUrl=' + encodeURIComponent(cookieGistUrl);
                    }
                    return;
                  }
                }
              }
            } catch (e) {
              console.warn('Error checking cookies:', e);
            }
            
            // Finally, try localStorage (least reliable on iOS)
            try {
              const localStorageGistUrl = localStorage.getItem('savedGistUrl');
              if (localStorageGistUrl) {
                console.log('Restoring gistUrl from localStorage:', localStorageGistUrl);
                
                // On iOS, we need to use replacState instead of href
                if (navigator.standalone) {
                  const newUrl = window.location.origin + '/edit?source=pwa&gistUrl=' + encodeURIComponent(localStorageGistUrl);
                  window.history.replaceState({}, '', newUrl);
                  // Force a page reload to apply changes
                  window.location.reload();
                } else {
                  window.location.href = window.location.origin + '/edit?source=pwa&gistUrl=' + encodeURIComponent(localStorageGistUrl);
                }
                return;
              }
            } catch (e) {
              console.warn('Error checking localStorage:', e);
            }
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
  // For navigation requests
  if (event.request.mode === 'navigate') {
    const url = new URL(event.request.url);
    const urlParams = new URLSearchParams(url.search);
    
    // Check for shared links - don't intercept if there's a gistUrl parameter in the URL
    // and no source parameter. This ensures shared links always show the editor first.
    if (urlParams.has('gistUrl') && !urlParams.has('source')) {
      return;
    }
    
    // Skip interception if we're in edit mode (let the page handle it)
    if (url.pathname.includes('/edit')) {
      return;
    }
    
    // Use the hostname as the app key
    const hostname = url.hostname;
    
    event.respondWith(
      getCustomData(hostname).then(function(data) {
        if (data && data.html) {
          // Enhanced HTML with the saved gistUrl directly injected
          const enhancedHtml = injectPWAScripts(data.html, data.gistUrl);
          
          return new Response(enhancedHtml, {
            headers: { 'Content-Type': 'text/html' }
          });
        } else {
          return fetch(event.request);
        }
      }).catch(function(error) {
        console.error('Error in fetch handler:', error);
        // If there's any error, fall back to the default page
        return fetch(event.request);
      })
    );
    return;
  }
  
  // For all other requests, fetch normally
  event.respondWith(fetch(event.request));
});
