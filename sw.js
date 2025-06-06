const CACHE_NAME = 'gold-converter-cache-v4'; // <--- নতুন সংস্করণ, এটি পরিবর্তন করতে ভুলবেন না!
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', // Google Fonts CSS
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-512x512.png',
    '/offline.html'
];

// এই ভেরিয়েবলটি ক্যাশিং মোড নিয়ন্ত্রণ করবে
// ডিফল্টভাবে 'CACHE_FIRST'
let currentCachingMode = 'CACHE_FIRST'; 

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

// --- Activate Event ---
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// --- Message Listener (webpage থেকে মেসেজ পাওয়ার জন্য) ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REFRESH_CACHE') {
        console.log('Service Worker: Received REFRESH_CACHE message from page.');
        // মেসেজ পেলে Stale-While-Revalidate মোড সেট করুন
        currentCachingMode = 'STALE_WHILE_REVALIDATE';
        console.log('Service Worker: Caching mode set to STALE_WHILE_REVALIDATE.');
        
        // ঐচ্ছিক: কিছু সময়ের পর মোডটিকে আবার CACHE_FIRST এ ফিরিয়ে আনা (যদি প্রয়োজন হয়)
        // setTimeout(() => {
        //     currentCachingMode = 'CACHE_FIRST';
        //     console.log('Service Worker: Caching mode reset to CACHE_FIRST.');
        // }, 10000); // 10 সেকেন্ড পর
    }
});

// --- Fetch Event (কন্ডিশনাল ক্যাশিং কৌশল) ---
self.addEventListener('fetch', (event) => {
    if (event.request.url.startsWith('http')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // ইন্টারনেট সংযোগ আছে কিনা তা পরীক্ষা করুন
                if (navigator.onLine) {
                    // --- অনলাইন থাকলে ---
                    if (currentCachingMode === 'STALE_WHILE_REVALIDATE') {
                        console.log('Service Worker: Online, applying STALE_WHILE_REVALIDATE for:', event.request.url);

                        const fetchPromise = fetch(event.request)
                            .then((networkResponse) => {
                                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                                    caches.open(CACHE_NAME).then((cache) => {
                                        cache.put(event.request, networkResponse.clone());
                                    });
                                }
                                return networkResponse;
                            })
                            .catch((error) => {
                                console.warn('Service Worker: Network fetch failed (SWR, online):', event.request.url, error);
                                return cachedResponse || caches.match('/offline.html'); // ফলব্যাক
                            });

                        return cachedResponse || fetchPromise; // ক্যাশে থেকে দাও, ব্যাকগ্রাউন্ডে আপডেট আনো

                    } else { // currentCachingMode === 'CACHE_FIRST'
                        console.log('Service Worker: Online, applying CACHE_FIRST for:', event.request.url);
                        // শুধুমাত্র ক্যাশে থেকে দাও, যদি না থাকে তবে নেটওয়ার্ক থেকে আনো এবং ক্যাশে করো
                        if (cachedResponse) {
                            return cachedResponse;
                        } else {
                            return fetch(event.request).then((networkResponse) => {
                                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                                    caches.open(CACHE_NAME).then((cache) => {
                                        cache.put(event.request, networkResponse.clone());
                                    });
                                }
                                return networkResponse;
                            }).catch(() => {
                                return caches.match('/offline.html'); // নেটওয়ার্ক ব্যর্থ হলে ফলব্যাক
                            });
                        }
                    }
                } else {
                    // --- অফলাইন থাকলে (সবসময় Cache-First/Offline-First) ---
                    console.log('Service Worker: Offline, applying Cache-First/Offline-First for:', event.request.url);
                    if (cachedResponse) {
                        return cachedResponse;
                    } else {
                        return caches.match('/offline.html'); // ক্যাশেতেও না থাকলে অফলাইন পেজ
                    }
                }
            })
        );
    }
});
