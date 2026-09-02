// Changement du nom pour forcer la mise à jour sur les tablettes
const CACHE_NAME = 'hub-inspection-v1.1.0.4d';

const ASSETS = [
    './',
    
    // Pages HTML
    './index.html',
    './index_beton.html',
    './index_compaction.html',
    './index_planche.html',
    
    // Styles
    './styles.css',
    
    // Scripts Logiques
    './app_beton.js',
    './app_compaction.js',
    './app_planche.js',
    
    // Base64 des PDF et Polices
    './pdf_templates.js',
    
    // Logos et images
    './logo.png',
    './logo_beton.png',
    './logo_compaction.png',
    './logo_planche.png',
    
    // Librairies externes
    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Remplacement de cache.addAll par des ajouts individuels (Promise.all + cache.add).
            // Si un lien externe bloque, le reste de l'application se téléchargera quand même.
            return Promise.all(
                ASSETS.map(asset => {
                    return cache.add(asset).catch(err => {
                        console.error('Échec du téléchargement en cache pour :', asset, err);
                    });
                })
            );
        })
    );
    self.skipWaiting();
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
    self.clients.claim();
});

// Stratégie "Network First, fallback to cache"
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});