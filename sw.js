const CACHE_NAME = 'football-map-v2'; // Updated version
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
    // Cache OpenStreetMap tiles
    if (event.request.url.includes('tile.openstreetmap.org')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) return response;
                return fetch(event.request).then((networkResponse) => {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                });
            })
        );
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});