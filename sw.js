const CACHE_NAME = 'gold-converter-cache-v1'; // Change version if you update cached files
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', // Google Fonts CSS
    // Add paths to your custom icons here
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-512x512.png'
];

// --- Install Event ---
// This event fires when the service worker is first installed.
// It's typically used to pre-cache essential assets.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching essential app shell assets');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache assets:', error);
            })
    );
});

// --- Fetch Event ---
// This event intercepts network requests made by the page.
// It defines how the service worker responds to these requests (e.g., serving from cache).
self.addEventListener('fetch', (event) => {
    // Only handle HTTP/HTTPS requests, not chrome-extension:// etc.
    if (event.request.url.startsWith('http')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // If the request is in the cache, return the cached response
                    if (response) {
                        return response;
                    }

                    // Otherwise, try to fetch from the network
                    const fetchRequest = event.request.clone(); // Clone request because it's a stream

                    return fetch(fetchRequest)
                        .then((response) => {
                            // Check if we received a valid response (e.g., status 200, not opaque response for cross-origin)
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }

                            const responseToCache = response.clone(); // Clone response for caching

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache); // Cache the new response
                                });

                            return response; // Return the network response
                        })
                        .catch((error) => {
                            // This catch handles network errors, not HTTP errors
                            console.error('Service Worker: Fetch failed:', error);
                            // You could return a fallback page here for offline network errors
                            // return caches.match('/offline.html');
                        });
                })
        );
    }
});

// --- Activate Event ---
// This event fires when the service worker becomes active.
// It's typically used to clean up old caches.
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Delete old caches
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
