/**
 * MODELYX SERVICE WORKER
 * Enables offline functionality and PWA capabilities
 */

const CACHE_NAME = 'modelyx-v12';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/editor.html',
    '/orders.html',
    '/admin.html',
    '/static/js/addressAutocomplete.js',
    '/static/js/customerNav.js',
    '/utils.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(() => {
                console.log('Some assets could not be cached');
            });
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    const apiPrefixes = ['/auth/', '/orders/', '/payments/', '/notifications/', '/geo/', '/api'];
    if (url.origin === self.location.origin && apiPrefixes.some(prefix => url.pathname.startsWith(prefix))) {
        return;
    }

    // Bypass caching for 3D model files (GLB/GLTF)
    if (url.pathname.endsWith('.glb') || url.pathname.endsWith('.gltf')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const cache = caches.open(CACHE_NAME);
                    cache.then((c) => c.put(event.request, response.clone()));
                }
                return response;
            }).catch(() => {
                // Fallback for offline
                return caches.match('/index.html');
            });
        })
    );
});
