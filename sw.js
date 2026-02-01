const CACHE_NAME = 'fittrack-v11';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/main.css',
    './js/app.js',
    './js/db.js',
    './js/router.js',
    './js/screens/calendar.js',
    './js/screens/home.js',
    './js/screens/insanity-calendar.js',
    './js/screens/fit-test.js',
    './js/screens/fit-test-progress.js',
    './js/screens/stronglifts-calendar.js',
    './js/screens/workout.js',
    './js/screens/settings.js',
    './js/screens/log-activity.js',
    './data/insanity-schedule.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch event - cache-first strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cached) => {
                if (cached) {
                    return cached;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-ok responses or non-GET requests
                        if (!response.ok || event.request.method !== 'GET') {
                            return response;
                        }
                        // Clone and cache
                        const clone = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(event.request, clone));
                        return response;
                    });
            })
            .catch(() => {
                // Offline fallback for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});
