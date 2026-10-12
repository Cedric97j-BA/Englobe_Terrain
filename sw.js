const CACHE_NAME = 'hub-inspection-v1.3.1.1'; 

const APP_ASSETS = [
    './',
    './index.html',
    './index_beton.html',
    './index_compaction.html',
    './index_echsolgra.html',
    './index_journal.html',
    './index_journal_old.html',
    './index_planche.html',
    './index_photo.html',
    './index_pavage.html',
    './changelog.html',
    './styles.css',
    './app_beton.js',
    './app_compaction.js',
    './app_echsolgra.js',
    './app_journal.js',
    './app_journal_old.js',
    './app_planche.js',
    './app_photo.js',
    './app_pavage.js',
    './pdf_templates.js',
    './logo.png',
    './logo_beton.png',
    './logo_compaction.png',
    './logo_echsolgra.png',
    './logo_journal.png',
    './logo_planche.png',
    './logo_photo.png',
    './logo_enrob.png',
    './fonts/tahoma.ttf'
];

const EXTERNAL_ASSETS = [
    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const internalPromise = cache.addAll(APP_ASSETS);
            
            const externalPromise = Promise.all(
                EXTERNAL_ASSETS.map((asset) => {
                    return fetch(asset, { mode: 'no-cors' }).then((response) => {
                        return cache.put(asset, response);
                    });
                })
            );

            return Promise.all([internalPromise, externalPromise]);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});


// NOUVEAU: Stratégie "Cache-First" avec filet de sécurité réseau
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. Retourne la version hors-ligne instantanément si elle existe
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // 2. Sinon, tente de la télécharger sur internet
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Filet de sécurité anti-écran blanc
                return new Response("Hors-ligne", { status: 503, statusText: "Service Unavailable" });
            });
        })
    );
});

/*
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok || response.type === 'opaque') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

*/