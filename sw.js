const CACHE_NAME = 'gold-converter-cache-v2'; // <--- এই লাইনটি পরিবর্তন করা হয়েছে!
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', // Google Fonts CSS
    // আপনার কাস্টম আইকনগুলির পাথ এখানে যোগ করুন
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-512x512.png'
];

// --- Install Event ---
// এই ইভেন্টটি সার্ভিস ওয়ার্কার প্রথমবার ইন্সটল হলে ফায়ার হয়।
// এটি সাধারণত প্রয়োজনীয় অ্যাসেটগুলো আগে থেকে ক্যাশে করার জন্য ব্যবহৃত হয়।
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
// এই ইভেন্টটি পেজ দ্বারা করা নেটওয়ার্ক রিকোয়েস্টগুলোকে ইন্টারসেপ্ট করে।
// এটি ডিফাইন করে যে সার্ভিস ওয়ার্কার কীভাবে এই রিকোয়েস্টগুলোর জবাব দেবে (যেমন, ক্যাশে থেকে সার্ভ করা)।
self.addEventListener('fetch', (event) => {
    // শুধুমাত্র HTTP/HTTPS রিকোয়েস্টগুলো হ্যান্ডেল করুন, chrome-extension:// ইত্যাদি নয়।
    if (event.request.url.startsWith('http')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // নেটওয়ার্ক থেকে একটি নতুন রেসপন্স আনার প্রমিস তৈরি করুন।
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        // আমরা একটি বৈধ নেটওয়ার্ক রেসপন্স পেয়েছি কিনা তা পরীক্ষা করুন।
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            // ক্যাশে করার জন্য রেসপন্সটি ক্লোন করুন।
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache); // নতুন রেসপন্সটি ক্যাশে করুন
                                });
                        }
                        return networkResponse; // নেটওয়ার্ক রেসপন্সটি রিটার্ন করুন
                    })
                    .catch((error) => {
                        console.warn('Service Worker: Fetch failed for', event.request.url, error);
                        // যদি নেটওয়ার্ক ব্যর্থ হয়, এবং কোনো ক্যাশে করা রেসপন্সও না থাকে,
                        // আপনি এখানে একটি ফলব্যাক পেজ (যেমন /offline.html) রিটার্ন করতে পারেন।
                        // return caches.match('/offline.html');
                    });

                // যদি ক্যাশে করা রেসপন্স পাওয়া যায়, তাহলে তাৎক্ষণিকভাবে সেটি রিটার্ন করুন।
                // অন্যথায়, নেটওয়ার্ক রেসপন্সের জন্য অপেক্ষা করুন।
                return cachedResponse || fetchPromise;
            })
        );
    }
});

// --- Activate Event ---
// এই ইভেন্টটি সার্ভিস ওয়ার্কার সক্রিয় হলে ফায়ার হয়।
// এটি সাধারণত পুরানো ক্যাশে পরিষ্কার করার জন্য ব্যবহৃত হয়।
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
