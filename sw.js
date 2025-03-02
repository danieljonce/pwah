self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener('fetch', function(event) {
    const url = new URL(event.request.url);
    if (url.searchParams.has('app')) {
      const slug = url.searchParams.get('app');
      event.respondWith(
        caches.open('pwaApps').then(cache => {
          return cache.match(new Request('/apps/' + slug)).then(response => {
            if (response) {
              // Serve the custom HTML for the user-created app.
              return response;
            } else {
              // Fallback to the network (or to your default shell) if no custom app is found.
              return fetch(event.request);
            }
          });
        })
      );
    } else {
      event.respondWith(fetch(event.request));
    }
  });
  
