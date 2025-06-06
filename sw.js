const CACHE_NAME = 'gold-converter-cache-v3'; // <--- এই ভার্সনটি একই রাখছি, কিন্তু আপডেটের জন্য v4 করুন!
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

// --- Fetch Event (কন্ডিশনাল ক্যাশিং কৌশল) ---
self.addEventListener('fetch', (event) => {
    // শুধুমাত্র HTTP/HTTPS রিকোয়েস্টগুলো হ্যান্ডেল করুন
    if (event.request.url.startsWith('http')) {
        const url = new URL(event.request.url);

        // HTML ফাইলগুলোর জন্য (যেমন index.html, এবং যেকোনো .html ফাইল) Network-First কৌশল
        // এটি নিশ্চিত করবে যে রিফ্রেশ করলে সর্বদা নতুন HTML লোড হবে।
        if (url.pathname === '/' || url.pathname.endsWith('.html')) {
            console.log('Service Worker: Applying Network-First for HTML:', event.request.url);
            event.respondWith(
                fetch(event.request)
                    .then(async (networkResponse) => {
                        // যদি নেটওয়ার্ক রেসপন্স ঠিক থাকে, তাহলে ক্যাশে আপডেট করুন
                        if (networkResponse && networkResponse.status === 200) { // status 200 চেক করা যথেষ্ট, basic type সব রিকোয়েস্টের জন্য নাও হতে পারে
                            const cache = await caches.open(CACHE_NAME);
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(async () => {
                        // নেটওয়ার্ক ব্যর্থ হলে (যেমন অফলাইন), ক্যাশে থেকে দেখান
                        const cachedResponse = await caches.match(event.request);
                        if (cachedResponse) {
                            console.log('Service Worker: Serving cached HTML due to network failure:', event.request.url);
                            return cachedResponse;
                        }
                        // যদি ক্যাশেতেও না থাকে, তাহলে অফলাইন পেজ দেখান
                        console.log('Service Worker: Serving offline.html as HTML fallback:', event.request.url);
                        return caches.match('/offline.html');
                    })
            );
            return; // এই রিকোয়েস্টটি হ্যান্ডেল করা হয়েছে
        }

        // অন্যান্য সম্পদের জন্য (CSS, JS, Images, Fonts) Stale-While-Revalidate কৌশল
        // কারণ এই ফাইলগুলো দ্রুত লোড হওয়া উচিত এবং ব্যাকগ্রাউন্ডে আপডেট হওয়া উচিত।
        console.log('Service Worker: Applying Stale-While-Revalidate for other assets:', event.request.url);
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
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
                        console.warn('Service Worker: Network fetch failed (Stale-While-Revalidate):', event.request.url, error);
                        // এই ক্ষেত্রে, যদি networkResponse না আসে, cachedResponse (যদি থাকে) ব্যবহার করা হবে
                        // cachedResponse || fetchPromise লাইনটি এটি নিশ্চিত করে।
                    });

                return cachedResponse || fetchPromise;
            })
        );
    }
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
