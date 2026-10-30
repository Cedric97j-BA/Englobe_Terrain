// ========================================================================== //
// SERVICE WORKER DU HUB — généré par SFGEN (hub_tools.py). Ne pas modifier à  //
// la main : « Mettre à jour les liens du Hub » le régénère.                  //
// ========================================================================== //
// 1. Coquille (Hub, shared/, logos des cartes) : téléchargée à l'installation.
// 2. Apps gardées par le technicien (bouton « Garder hors ligne » du Hub) :
//    cache séparé conservé entre les mises à jour ; seuls les fichiers modifiés
//    sont retéléchargés (empreintes de hors_ligne.json).
// 3. Apps ouvertes en ligne : gardées jusqu'à la prochaine mise à jour.
// Hors ligne, une app non gardée affiche une page d'explication au lieu d'une page blanche.

const CACHE_NAME = 'hub-inspection-v0.4.3.0-db06454701';          // coquille (change dès qu'un fichier du Hub change)
const PIN_CACHE = 'hub-apps-hors-ligne';      // apps gardées sur l'appareil (conservé entre les versions)
const RECENT_CACHE = 'hub-apps-recentes';     // apps ouvertes depuis la dernière mise à jour
const STATE_URL = 'hors_ligne_etat.json';     // liste des apps gardées + empreintes (entrée de PIN_CACHE)
const MANIFEST_URL = 'hors_ligne.json';       // fichiers de chaque app, tailles et empreintes (généré par SFGEN)
const SHELL_STATE_URL = 'coquille_etat.json'; // empreintes de la coquille installée (entrée de CACHE_NAME)
const CORE_ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./changelog.html",
    "./logo.png",
    "./icons/icon-128.webp",
    "./icons/icon-192.webp",
    "./icons/icon-256.webp",
    "./icons/icon-48.webp",
    "./icons/icon-512.webp",
    "./icons/icon-72.webp",
    "./icons/icon-96.webp",
    "./shared/css/styles.css",
    "./shared/fonts/tahoma.js",
    "./shared/fonts/tahoma.ttf",
    "./shared/js/hub_hors_ligne.js",
    "./shared/libs/chart.umd.min.js",
    "./shared/libs/fontkit.umd.min.js",
    "./shared/libs/pdf-lib.min.js",
    "./tree/ENG/ICI/MAT/Coulis/logo_coulis.png",
    "./tree/ENG/ICI/MAT/Ech_sol_gran/logo_echsolgra.png",
    "./tree/ENG/ICI/MAT/Pavage/logo_enrob.png",
    "./tree/GEN/journal/logo_journal.png",
    "./tree/HYB/beton/logo_beton.png",
    "./tree/HYB/compaction/logo_compaction.png",
    "./tree/HYB/journal/logo_journal.png",
    "./tree/HYB/journal_photo/logo_photo.png",
    "./tree/HYB/planche/logo_planche.png",
    "./hors_ligne.json"
];
const CORE_HASHES = {
    "./index.html": "da4c77ff1941",
    "./manifest.json": "7e9f1eb7484d",
    "./changelog.html": "42cf749e1bff",
    "./logo.png": "012c2ea843e0",
    "./icons/icon-128.webp": "e78047b6cf25",
    "./icons/icon-192.webp": "55e1bc203e4d",
    "./icons/icon-256.webp": "3af2d661a2dc",
    "./icons/icon-48.webp": "7b5a4495fc0d",
    "./icons/icon-512.webp": "1fa8507d1047",
    "./icons/icon-72.webp": "af98c2bf8aa5",
    "./icons/icon-96.webp": "660c9e9aed7c",
    "./shared/css/styles.css": "a8d209df2886",
    "./shared/fonts/tahoma.js": "584bf77c1f40",
    "./shared/fonts/tahoma.ttf": "ae34f679d7f3",
    "./shared/js/hub_hors_ligne.js": "f18b65cbb6ce",
    "./shared/libs/chart.umd.min.js": "0797aad65dda",
    "./shared/libs/fontkit.umd.min.js": "ba0c6b5b234c",
    "./shared/libs/pdf-lib.min.js": "0fe9d5550429",
    "./tree/ENG/ICI/MAT/Coulis/logo_coulis.png": "95c664f26c1c",
    "./tree/ENG/ICI/MAT/Ech_sol_gran/logo_echsolgra.png": "e62a3a1f7274",
    "./tree/ENG/ICI/MAT/Pavage/logo_enrob.png": "4c3fdba9cd34",
    "./tree/GEN/journal/logo_journal.png": "d23c895dfff5",
    "./tree/HYB/beton/logo_beton.png": "f3ae1bb62317",
    "./tree/HYB/compaction/logo_compaction.png": "cae0c7bb665a",
    "./tree/HYB/journal/logo_journal.png": "d23c895dfff5",
    "./tree/HYB/journal_photo/logo_photo.png": "b0a0b048acf3",
    "./tree/HYB/planche/logo_planche.png": "948e58124774"
};

const scoped = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const core = await caches.open(CACHE_NAME);
        // Coquille précédente : ses fichiers inchangés sont recopiés au lieu d'être retéléchargés (données cellulaires)
        let oldCache = null, oldHashes = {};
        for (const key of (await caches.keys()).filter((k) => k.startsWith('hub-inspection-') && k !== CACHE_NAME)) {
            const c = await caches.open(key);
            const r = await c.match(scoped(SHELL_STATE_URL));
            if (r) { oldCache = c; oldHashes = await r.json(); break; }
        }
        // Chaque fichier séparément : un fichier manquant ne bloque pas l'installation
        await Promise.allSettled(CORE_ASSETS.map(async (asset) => {
            const h = CORE_HASHES[asset];
            if (oldCache && h && oldHashes[asset] === h) {
                const r = await oldCache.match(scoped(asset));
                if (r) return core.put(scoped(asset), r);
            }
            return core.add(new Request(asset, { cache: 'reload' }))
                .catch((e) => console.warn('Hors ligne : fichier ignoré', asset, e));
        }));
        await core.put(scoped(SHELL_STATE_URL), new Response(JSON.stringify(CORE_HASHES), { headers: { 'Content-Type': 'application/json' } }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        // Anciennes versions et apps « récentes » supprimées ; les apps gardées restent
        await Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== PIN_CACHE).map((k) => caches.delete(k)));
        await refreshPinnedApps().catch((e) => console.warn('Hors ligne : rafraîchissement incomplet', e));
        await self.clients.claim();
    })());
});

async function readManifest() {
    const core = await caches.open(CACHE_NAME);
    let res = await core.match(scoped(MANIFEST_URL), { ignoreSearch: true });
    if (!res) {
        try { res = await fetch(scoped(MANIFEST_URL), { cache: 'reload' }); } catch (e) { return null; }
    }
    return res && res.ok ? res.json() : null;
}

// Nouvelle version : les apps gardées sont mises à jour (fichiers modifiés seulement)
async function refreshPinnedApps() {
    const manifest = await readManifest();
    if (!manifest) return;
    const pin = await caches.open(PIN_CACHE);
    const stateRes = await pin.match(scoped(STATE_URL));
    const state = stateRes ? await stateRes.json() : { apps: [], files: {} };
    const allApps = Object.keys(manifest.apps);
    if (!stateRes && allApps.length <= (manifest.auto_pin_max || 0)) {
        state.apps = allApps; // aucun choix encore fait et peu d'apps : tout est gardé (comme avant)
    }
    state.apps = state.apps.filter((app) => manifest.apps[app]); // apps retirées du Hub

    const wanted = new Set();
    state.apps.forEach((app) => manifest.apps[app].files.forEach((f) => wanted.add(f)));
    for (const req of await pin.keys()) {
        const rel = req.url.replace(self.registration.scope, '');
        if (rel !== STATE_URL && !wanted.has(decodeURI(rel))) await pin.delete(req);
    }
    const files = {};
    await Promise.allSettled([...wanted].map(async (f) => {
        const hash = manifest.files[f] && manifest.files[f].h;
        if (state.files[f] === hash && await pin.match(scoped(f))) { files[f] = hash; return; }
        await pin.add(new Request(scoped(f), { cache: 'reload' }));
        files[f] = hash;
    }));
    state.files = files;
    await pin.put(scoped(STATE_URL), new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } }));
}

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

function offlinePage() {
    const hub = scoped('index.html');
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hors ligne</title></head>
<body style="margin:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;color:#334155;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
<div style="max-width:460px;background:#ffffff;border-radius:12px;padding:28px 24px;box-shadow:0 6px 20px rgba(15,23,42,.12);text-align:center;border-top:6px solid #97c6b9;">
<div style="font-size:2.4rem;">📵</div>
<h1 style="font-size:1.3rem;margin:10px 0;">Application non disponible hors ligne</h1>
<p style="line-height:1.5;margin:0 0 18px;">Cette application n'a pas été gardée sur l'appareil. À la prochaine connexion, ouvrez le Hub et touchez <strong>« Garder hors ligne »</strong> sur sa carte.</p>
<a href="${hub}" style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">🏠 Retour au Hub</a>
</div></body></html>`;
    return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Cache d'abord (coquille, apps gardées, apps récentes), sinon réseau
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    event.respondWith((async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        try {
            const res = await fetch(req);
            // Les téléchargements « Garder hors ligne » (cache: 'reload') vont seulement dans le cache des apps gardées
            if (res && res.status === 200 && res.type === 'basic' && req.cache !== 'reload') {
                const copy = res.clone();
                const target = new URL(req.url).pathname.includes('/tree/') ? RECENT_CACHE : CACHE_NAME;
                caches.open(target).then((cache) => cache.put(req, copy));
            }
            return res;
        } catch (e) {
            if (req.mode === 'navigate') return offlinePage();
            return new Response('Hors ligne', { status: 503, statusText: 'Service Unavailable' });
        }
    })());
});
