/**
 * MarkItDown Service Worker (sw.js)
 * Design and Developed by Shamim Ahmed Nahid (https://samnahid21.web.app/)
 * 
 * এই স্ক্রিপ্টটি অ্যাপটিকে অফলাইনে লোড হতে সাহায্য করে এবং স্ট্যাটিক ফাইলগুলো ক্যাশ করে রাখে।
 */

// ক্যাশের নাম নির্ধারণ (ভবিষ্যতে ফাইল পরিবর্তন হলে এই ভার্সন পরিবর্তন করতে হবে)
const CACHE_NAME = 'markitdown-cache-v1';

// যেসব ফাইল ক্যাশ করতে হবে (App Shell)
const ASSETS_TO_CACHE = [
  '/',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/manifest.json',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/favicon.png',
  
  // এক্সটার্নাল সিডিএন ফাইলসমূহ (Fonts and Libraries)
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
];

// ১. ইনস্টলেশন ইভেন্ট: ফাইলগুলো ক্যাশে জমা করা
self.addEventListener('install', (event) => {
  // সার্ভিস ওয়ার্কারকে ইনস্টল হতে বাধ্য করা এবং ব্যাকগ্রাউন্ডে ক্যাশ শুরু করা
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App Shell assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // নতুন সার্ভিস ওয়ার্কার সক্রিয় করতে বাধ্য করা
  );
});

// ২. অ্যাক্টিভেশন ইভেন্ট: পুরোনো ক্যাশ ডিলিট করা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // নতুন সার্ভিস ওয়ার্কারকে কন্ট্রোল দেওয়া
  );
});

// ৩. ফেচ ইভেন্ট: নেটওয়ার্ক বা ক্যাশ থেকে ফাইল রিটার্ন করা
self.addEventListener('fetch', (event) => {
  // শুধুমাত্র GET রিকোয়েস্ট ক্যাশ করা হবে (ফাইল কনভার্ট করার জন্য POST রিকোয়েস্ট ক্যাশ করা যাবে না)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // ক্যাশে ফাইল পাওয়া গেলে তা ফিরিয়ে দেওয়া এবং ব্যাকগ্রাউন্ডে নেটওয়ার্ক থেকে ক্যাশ আপডেট করা (Stale-While-Revalidate)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {
            // অফলাইন থাকলে বা এরর হলে ক্যাশড ফাইলই যথেষ্ট
            console.log('[Service Worker] Offline check: using cached asset');
          });
          
          return cachedResponse;
        }

        // ক্যাশে না থাকলে সরাসরি ইন্টারনেট থেকে নেওয়া
        return fetch(event.request);
      })
  );
});
