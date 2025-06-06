const CACHE_NAME = 'gold-converter-cache-v3'; // <--- নতুন সংস্করণ, এটি পরিবর্তন করতে ভুলবেন না!
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', // Google Fonts CSS
    // আপনার কাস্টম আইকনগুলির পাথ এখানে যোগ করুন
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-512x512.png',
    '/offline.html' // অফলাইন পেজ ক্যাশেতে যোগ করা হয়েছে
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
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // ইন্টারনেট সংযোগ আছে কিনা তা পরীক্ষা করুন
                // navigator.onLine ব্রাউজারকে জানায় ডিভাইস একটি নেটওয়ার্কের সাথে সংযুক্ত কিনা।
                // এটি সম্পূর্ণ ইন্টারনেট অ্যাক্সেসের গ্যারান্টি দেয় না, তবে এটি একটি ভালো প্রথম চেক।
                if (navigator.onLine) {
                    // --- ইন্টারনেট থাকলে: Stale-While-Revalidate Strategy ---
                    console.log('Service Worker: Online, applying Stale-While-Revalidate Strategy for:', event.request.url);

                    const fetchPromise = fetch(event.request)
                        .then((networkResponse) => {
                            // যদি বৈধ নেটওয়ার্ক রেসপন্স আসে, তবে ক্যাশে আপডেট করুন
                            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, networkResponse.clone()); // নতুন রেসপন্সটি ক্যাশে করুন
                                });
                            }
                            return networkResponse; // নেটওয়ার্ক রেসপন্সটি রিটার্ন করুন
                        })
                        .catch((error) => {
                            console.warn('Service Worker: Network fetch failed (online):', event.request.url, error);
                            // নেটওয়ার্ক ব্যর্থ হলেও যদি ক্যাশেতে থাকে, সেটি ব্যবহার করা হবে
                            // না হলে, যদি request টি urlsToCache এর অংশ হয়, তাহলে ক্যাশে থেকে পাবে,
                            // অন্যথায়, যদি offline.html ক্যাশেতে থাকে, সেটি রিটার্ন করবে।
                            if (cachedResponse) { // যদি ক্যাশেতে কোনো পুরোনো রেসপন্স থাকে, সেটাই দেখান
                                return cachedResponse;
                            }
                            return caches.match('/offline.html'); // যদি ক্যাশেতেও না থাকে, অফলাইন পেজ দেখান
                        });

                    // ক্যাশে থেকে দ্রুত রেসপন্স রিটার্ন করুন (যদি থাকে), অন্যথায় নেটওয়ার্ক রেসপন্সের জন্য অপেক্ষা করুন
                    return cachedResponse || fetchPromise;

                } else {
                    // --- ইন্টারনেট না থাকলে (অফলাইন): Cache-First Strategy (সাধারণ অফলাইন মোড) ---
                    console.log('Service Worker: Offline, applying Cache-First Strategy for:', event.request.url);

                    // ক্যাশে থেকে রেসপন্স রিটার্ন করুন
                    if (cachedResponse) {
                        return cachedResponse;
                    } else {
                        // যদি ক্যাশেতেও না থাকে (সম্পূর্ণ অফলাইন), তাহলে অফলাইন পেজ দেখান
                        return caches.match('/offline.html');
                    }
                }
            })
        );
    }
});

// --- Activate Event ---
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME]; // শুধুমাত্র বর্তমান ক্যাশে সংস্করণটি রাখুন
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // হোয়াইটলিস্টে নেই এমন পুরানো ক্যাশেগুলো ডিলিট করুন
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
