const CACHE_NAME = 'hub-inspection-v0.4.0.9-20261028-200028'; 

const APP_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './changelog.html',
    './logo.png',
    './shared/css/styles.css',
    './shared/fonts/tahoma.js',
    './shared/fonts/tahoma.ttf',
    './shared/libs/chart.umd.min.js',
    './shared/libs/fontkit.umd.min.js',
    './shared/libs/pdf-lib.min.js',
    './tree/ENG/ICI/MAT/Coulis/app_coulis.js',
    './tree/ENG/ICI/MAT/Coulis/index_coulis.html',
    './tree/ENG/ICI/MAT/Coulis/logo_coulis.png',
    './tree/ENG/ICI/MAT/Coulis/tpl_coulis.js',
    './tree/ENG/ICI/MAT/Ech_sol_gran/app_echsolgra.js',
    './tree/ENG/ICI/MAT/Ech_sol_gran/index_echsolgra.html',
    './tree/ENG/ICI/MAT/Ech_sol_gran/logo_echsolgra.png',
    './tree/ENG/ICI/MAT/Ech_sol_gran/tpl_echsolgra.js',
    './tree/ENG/ICI/MAT/Pavage/app_pavage.js',
    './tree/ENG/ICI/MAT/Pavage/index_pavage.html',
    './tree/ENG/ICI/MAT/Pavage/logo_enrob.png',
    './tree/ENG/ICI/MAT/Pavage/tpl_pavage.js',
    './tree/GEN/journal/app_journal.js',
    './tree/GEN/journal/index_journal.html',
    './tree/GEN/journal/logo_journal.png',
    './tree/GEN/journal/tpl_journal.js',
    './tree/HYB/beton/app_beton.js',
    './tree/HYB/beton/index_beton.html',
    './tree/HYB/beton/logo_beton.png',
    './tree/HYB/beton/tpl_beton.js',
    './tree/HYB/compaction/app_compaction.js',
    './tree/HYB/compaction/index_compaction.html',
    './tree/HYB/compaction/logo_compaction.png',
    './tree/HYB/compaction/tpl_compaction.js',
    './tree/HYB/journal/app_journal_old.js',
    './tree/HYB/journal/index_journal_old.html',
    './tree/HYB/journal/logo_journal.png',
    './tree/HYB/journal/tpl_journal_old.js',
    './tree/HYB/journal_photo/app_photo.js',
    './tree/HYB/journal_photo/index_photo.html',
    './tree/HYB/journal_photo/logo_photo.png',
    './tree/HYB/journal_photo/tpl_photo.js',
    './tree/HYB/planche/app_planche.js',
    './tree/HYB/planche/index_planche.html',
    './tree/HYB/planche/logo_planche.png',
    './tree/HYB/planche/tpl_planche.js'
];

self.addEventListener('install', (event) => {
    // Chaque fichier est mis en cache séparément : un fichier manquant ne bloque plus l'installation hors ligne
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => Promise.allSettled(
            APP_ASSETS.map((asset) => cache.add(asset).catch((e) => console.warn('Hors ligne : fichier ignoré', asset, e)))
        )).then(() => self.skipWaiting())
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

