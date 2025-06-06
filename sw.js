const CACHE_NAME = 'gold-converter-cache-v2'; // <--- CACHE_NAME পরিবর্তন করুন (V1 থেকে V2)
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-512x512.png'
];

// --- Install Event ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching essential app shell assets');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache assets during install:', error);
            })
    );
});

// --- Fetch Event (Stale-While-Revalidate Strategy) ---
self.addEventListener('fetch', (event) => {
    // Only handle HTTP/HTTPS requests
    if (event.request.url.startsWith('http')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        // Check if we received a valid network response
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            // Clone the response to cache it
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse; // Return the network response
                    })
                    .catch((error) => {
                        console.warn('Service Worker: Fetch failed for', event.request.url, error);
                        // If network fails, and no cached response, you could return an offline page
                        // return caches.match('/offline.html');
                    });

                // Return the cached response immediately if available,
                // otherwise wait for the network response.
                return cachedResponse || fetchPromise;
            })
        );
    }
});

// --- Activate Event ---
// This event fires when the service worker becomes active.
// It's used to clean up old caches.
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Delete old caches that are not in the whitelist
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
