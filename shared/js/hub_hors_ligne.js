// ========================================================================== //
// HUB : APPS HORS LIGNE ET DIAGNOSTIC — fichier géré par SFGEN               //
// (assets/hub/hub_hors_ligne.js)                                             //
// ========================================================================== //
// Le technicien choisit les apps à garder sur l'appareil (bouton sur chaque carte ou
// « Garder hors ligne les apps affichées » selon les filtres). Les fichiers vont dans le cache
// « hub-apps-hors-ligne », conservé entre les mises à jour ; le service worker
// (sw.js) met ensuite à jour seulement les fichiers modifiés.
// Le bouton « Afficher le diagnostic » du Hub (toggleDiagnostics) est aussi géré ici :
// apps gardées, rapports sauvegardés par app, stockage et mise à jour, pour CET appareil.
(function () {
    'use strict';
    const PIN_CACHE = 'hub-apps-hors-ligne';
    const abs = (p) => new URL(p, document.baseURI).href;
    const STATE_URL = abs('hors_ligne_etat.json');
    const MANIFEST_URL = abs('hors_ligne.json');
    const ONLY_KEY = 'hubHorsLigneSeulement';
    const CONFIRM_APPS = 15, CONFIRM_BYTES = 50 * 1024 * 1024;
    const LOCAL_LIMIT = 5 * 1024 * 1024; // Limite habituelle du stockage des rapports (localStorage) : ≈ 5 millions de caractères

    // Où le Hub est ouvert : seul « ok » permet de garder des apps hors ligne
    const ENV = location.protocol === 'file:' ? 'fichier'
        : (window.Capacitor || window.cordova) ? 'android'
        : (!('caches' in window) || !('serviceWorker' in navigator)) ? 'nonsupporte' : 'ok';
    const ENV_MSG = {
        fichier: "Hub ouvert comme fichier sur l'ordinateur : le mode hors ligne fonctionne seulement quand le Hub est ouvert à partir de son adresse web.",
        android: "Application Android : toutes les apps sont déjà incluses dans l'application, rien à télécharger.",
        nonsupporte: "Ce navigateur ne permet pas de garder des apps hors ligne (adresse https requise).",
    };

    let manifest = null;
    let state = { apps: [], files: {} };
    let busy = false;
    const ui = {};

    const toast = (msg, type) => (typeof window.showToast === 'function' ? window.showToast(msg, type || 'info') : alert(msg));
    const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(b / 1024)) + ' Ko');
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const hrefOf = (card) => (card.getAttribute('href') || '').replace(/\\/g, '/');
    const cards = () => Array.from(document.querySelectorAll('.app-card[href]')).filter((c) => appKey(c));
    const appKey = (card) => (manifest && manifest.apps[hrefOf(card)] ? hrefOf(card) : null);
    const appBytes = (key) => manifest.apps[key].files.reduce((s, f) => s + ((manifest.files[f] || {}).b || 0), 0);
    let offline = !navigator.onLine;
    const isOffline = () => offline;

    // Vraie vérification du réseau (navigator.onLine reste « vrai » sur un Wi-Fi de chantier sans Internet).
    // Requête HEAD : le service worker ne la sert jamais depuis son cache.
    async function probeOffline() {
        if (!navigator.onLine) return true;
        if (ENV === 'fichier' || ENV === 'android') return false; // fichiers locaux : rien à vérifier
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        try {
            const res = await fetch(MANIFEST_URL + '?verif=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
            return !res.ok;
        } catch (e) {
            return true;
        } finally {
            clearTimeout(timer);
        }
    }

    async function readState() {
        // caches.match avec cacheName ne crée pas le cache (le service worker décide alors de la 1re sélection)
        const res = await caches.match(STATE_URL, { cacheName: PIN_CACHE });
        state = res ? await res.json() : { apps: [], files: {} };
        state.apps = (state.apps || []).filter((k) => manifest.apps[k]);
        state.files = state.files || {};
    }

    async function writeState() {
        const cache = await caches.open(PIN_CACHE);
        await cache.put(STATE_URL, new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } }));
    }

    // Télécharge les fichiers des apps (ceux déjà à jour sont sautés). Retourne le nombre de fichiers en échec.
    async function pinApps(keys, onProgress) {
        const cache = await caches.open(PIN_CACHE);
        const files = [...new Set(keys.flatMap((k) => manifest.apps[k].files))];
        const failed = new Set();
        let done = 0;
        for (const f of files) {
            const h = (manifest.files[f] || {}).h;
            const upToDate = state.files[f] === h && (await cache.match(abs(f)));
            if (!upToDate) {
                try {
                    await cache.add(new Request(abs(f), { cache: 'reload' }));
                    state.files[f] = h;
                } catch (e) {
                    failed.add(f);
                }
            }
            done += 1;
            if (onProgress) onProgress(done / files.length);
        }
        keys.forEach((k) => {
            if (!manifest.apps[k].files.some((f) => failed.has(f)) && !state.apps.includes(k)) state.apps.push(k);
        });
        await writeState();
        if (navigator.storage && navigator.storage.persist) {
            try { await navigator.storage.persist(); } catch (e) { /* refusé par le navigateur */ }
        }
        return failed.size;
    }

    async function unpinApps(keys) {
        state.apps = state.apps.filter((k) => !keys.includes(k));
        const keep = new Set(state.apps.flatMap((k) => manifest.apps[k].files));
        const cache = await caches.open(PIN_CACHE);
        for (const f of Object.keys(state.files)) {
            if (!keep.has(f)) {
                await cache.delete(abs(f));
                delete state.files[f];
            }
        }
        await writeState();
    }

    // Apps utilisables sans réseau : tous leurs fichiers sont dans un cache (gardées ou ouvertes récemment)
    async function availableOffline() {
        const ok = new Set();
        for (const key of Object.keys(manifest.apps)) {
            const hits = await Promise.all(manifest.apps[key].files.map((f) => caches.match(abs(f), { ignoreSearch: true })));
            if (hits.every(Boolean)) ok.add(key);
        }
        return ok;
    }

    // ------------------------------------------------------------------ Interface
    function buildPanel() {
        const anchor = document.querySelector('.hub-filters') || document.querySelector('.dashboard-grid');
        if (!anchor) return false;
        const panel = document.createElement('section');
        panel.id = 'hl-panel';
        panel.className = 'hl-panel';
        panel.innerHTML = `
            <div class="hl-head">
                <strong class="hl-title">Apps hors ligne</strong>
                <span class="hl-status" id="hl-status">Chargement…</span>
            </div>
            <div class="hl-actions" id="hl-actions" hidden>
                <button type="button" class="hl-btn hl-primary" id="hl-pin-visible">Garder hors ligne les apps affichées</button>
                <button type="button" class="hl-btn" id="hl-only" aria-pressed="false">Seulement les apps gardées</button>
                <button type="button" class="hl-btn hl-danger" id="hl-clear">Tout retirer</button>
            </div>
            <div class="hl-progress" id="hl-progress" hidden><div class="hl-bar" id="hl-bar"></div><span id="hl-progress-text"></span></div>
            <p class="hl-note" id="hl-note"></p>`;
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
        ['hl-status', 'hl-actions', 'hl-pin-visible', 'hl-only', 'hl-clear', 'hl-progress', 'hl-bar', 'hl-progress-text', 'hl-note']
            .forEach((id) => { ui[id] = document.getElementById(id); });
        ui['hl-pin-visible'].addEventListener('click', pinVisible);
        ui['hl-clear'].addEventListener('click', clearAll);
        ui['hl-only'].addEventListener('click', () => setOnly(!document.body.classList.contains('hl-seulement')));
        return true;
    }

    // Mode hors ligne impossible ici : le panneau reste visible et dit pourquoi
    function panelMessage(text) {
        if (!ui['hl-status']) return;
        ui['hl-status'].textContent = text;
        ui['hl-actions'].hidden = true;
        document.getElementById('hl-panel').classList.add('hl-inactif');
    }

    function addToggles() {
        cards().forEach((card) => {
            if (card.querySelector('.hl-toggle')) return;
            const t = document.createElement('span');
            t.className = 'hl-toggle';
            t.setAttribute('role', 'button');
            t.setAttribute('tabindex', '0');
            const act = (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCard(card);
            };
            t.addEventListener('click', act);
            t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') act(e); });
            card.appendChild(t);
            card.addEventListener('click', (e) => {
                if (card.classList.contains('hl-indisponible')) {
                    e.preventDefault();
                    toast("Cette application n'a pas été gardée sur l'appareil : elle n'est pas disponible hors ligne.", 'error');
                }
            });
        });
    }

    function render(progressKey, pct) {
        const pinned = new Set(state.apps);
        cards().forEach((card) => {
            const key = appKey(card);
            const t = card.querySelector('.hl-toggle');
            const on = pinned.has(key);
            card.classList.toggle('hl-garde', on);
            if (!t) return;
            t.setAttribute('aria-pressed', on ? 'true' : 'false');
            t.title = on ? 'Retirer cette app de l\'appareil' : `Garder cette app sur l'appareil (≈ ${fmtSize(appBytes(key))})`;
            t.textContent = progressKey === key ? `⏳ ${Math.round(pct * 100)} %` : (on ? '✓ Hors ligne' : '⬇ Garder hors ligne');
        });
        const bytes = state.apps.reduce((s, k) => s + appBytes(k), 0);
        const total = Object.keys(manifest.apps).length;
        ui['hl-status'].textContent = state.apps.length
            ? `${state.apps.length} / ${total} app(s) gardée(s) sur l'appareil · ≈ ${fmtSize(bytes)}`
            : `Aucune app gardée sur l'appareil (${total} disponibles)`;
        ui['hl-pin-visible'].disabled = busy || isOffline();
        ui['hl-clear'].disabled = busy || !state.apps.length;
    }

    async function renderNote() {
        const notes = [];
        if (isOffline()) notes.push('Hors ligne : seules les apps gardées (ou ouvertes depuis la dernière mise à jour) peuvent être ouvertes.');
        else if (!state.apps.length) notes.push('Touchez « Garder hors ligne » sur une carte, ou gardez d\'un coup toutes les apps affichées par les filtres.');
        if (navigator.storage && navigator.storage.persisted && state.apps.length) {
            try {
                notes.push(await navigator.storage.persisted()
                    ? 'Stockage protégé : le navigateur ne videra pas ces apps.'
                    : 'Stockage non protégé : sur iPhone / iPad, ajoutez le Hub à l\'écran d\'accueil pour que les apps restent sur l\'appareil.');
            } catch (e) { /* non disponible */ }
        }
        ui['hl-note'].textContent = notes.join(' ');
    }

    function showProgress(text, pct) {
        ui['hl-progress'].hidden = pct === null;
        if (pct !== null) {
            ui['hl-bar'].style.width = Math.round(pct * 100) + '%';
            ui['hl-progress-text'].textContent = text;
        }
    }

    async function run(task) {
        if (busy) return;
        busy = true;
        document.body.classList.add('hl-occupe');
        try { await task(); } finally {
            busy = false;
            document.body.classList.remove('hl-occupe');
            showProgress('', null);
            render();
            renderNote();
        }
    }

    function toggleCard(card) {
        const key = appKey(card);
        if (!key || busy) return;
        if (state.apps.includes(key)) {
            run(async () => { await unpinApps([key]); toast('App retirée de l\'appareil.', 'info'); });
        } else {
            if (isOffline()) return toast('Connexion requise pour garder une app hors ligne.', 'error');
            run(async () => {
                const failed = await pinApps([key], (pct) => render(key, pct));
                toast(failed ? 'Téléchargement incomplet : réessayez avec une meilleure connexion.' : 'App gardée : disponible hors ligne.', failed ? 'error' : 'success');
            });
        }
    }

    function pinVisible() {
        const keys = cards().filter((c) => !c.classList.contains('is-filtered-out') && c.offsetParent !== null)
            .map(appKey).filter((k) => !state.apps.includes(k));
        if (!keys.length) return toast('Toutes les apps affichées sont déjà gardées.', 'info');
        const bytes = keys.reduce((s, k) => s + appBytes(k), 0);
        if ((keys.length > CONFIRM_APPS || bytes > CONFIRM_BYTES) &&
            !confirm(`Garder ${keys.length} apps (≈ ${fmtSize(bytes)}) sur l'appareil ?`)) return;
        run(async () => {
            const failed = await pinApps(keys, (pct) => showProgress(`Téléchargement de ${keys.length} app(s)… ${Math.round(pct * 100)} %`, pct));
            toast(failed ? 'Certaines apps n\'ont pas pu être téléchargées : réessayez.' : `${keys.length} app(s) gardée(s) sur l'appareil.`, failed ? 'error' : 'success');
        });
    }

    function clearAll() {
        if (!state.apps.length || !confirm(`Retirer les ${state.apps.length} app(s) gardée(s) de l'appareil ?`)) return;
        run(async () => { await unpinApps([...state.apps]); toast('Apps retirées de l\'appareil.', 'info'); });
    }

    function setOnly(on) {
        document.body.classList.toggle('hl-seulement', on);
        ui['hl-only'].setAttribute('aria-pressed', on ? 'true' : 'false');
        try { localStorage.setItem(ONLY_KEY, on ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    }

    async function applyOfflineState() {
        offline = await probeOffline();
        document.body.classList.toggle('hl-hors-ligne', isOffline());
        const ok = isOffline() ? await availableOffline() : null;
        cards().forEach((card) => card.classList.toggle('hl-indisponible', !!ok && !ok.has(appKey(card))));
        render();
        renderNote();
    }

    // ------------------------------------------------------------------ Diagnostic de l'appareil
    // Rapports sauvegardés (localStorage, commun au Hub et à toutes les apps) attribués à chaque app
    // selon les règles de hors_ligne.json (« rapports » : préfixes de clé, nom ou slug, lus par SFGEN dans l'app).
    function scanReports() {
        const rules = manifest ? Object.keys(manifest.apps).filter((k) => manifest.apps[k].rapports).map((k) => [k, manifest.apps[k].rapports]) : [];
        const perApp = {};
        const other = { n: 0, size: 0, last: 0 };
        let used = 0, count = 0;
        const add = (slot, size, time) => { slot.n += 1; slot.size += size; slot.last = Math.max(slot.last, time || 0); };
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key) continue;
            const raw = localStorage.getItem(key) || '';
            used += key.length + raw.length;
            let data;
            const parsed = () => {
                if (data === undefined) {
                    try { data = raw.charAt(0) === '{' ? JSON.parse(raw) : {}; } catch (e) { data = {}; }
                    if (!data || typeof data !== 'object') data = {};
                }
                return data;
            };
            let owner = null;
            for (const [app, r] of rules) if ((r.cles || []).some((p) => key.startsWith(p))) { owner = app; break; }
            if (!owner && key.startsWith('ID_')) {
                const d = parsed();
                const name = typeof d.displayName === 'string' ? d.displayName : '';
                const bySlug = rules.find(([, r]) => r.slug && d.appSlug === r.slug);
                const byName = rules.find(([, r]) => (r.id_noms || []).some((p) => name.startsWith(p)));
                owner = (bySlug || byName || [null])[0];
            }
            const isReport = owner || key.startsWith('ID_') || (raw.charAt(0) === '{' && typeof parsed().displayName === 'string');
            if (!isReport) continue;
            const d = parsed();
            const stamp = Number(d.timestamp) || Number((key.match(/_(1\d{12})_/) || [])[1]) || 0;
            count += 1;
            if (owner) add(perApp[owner] || (perApp[owner] = { n: 0, size: 0, last: 0 }), key.length + raw.length, stamp);
            else add(other, key.length + raw.length, stamp);
        }
        return { perApp, other, used, count, rulesKnown: rules.length > 0 };
    }

    const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('fr-CA') : '—');

    async function collectDiagnostic() {
        const d = { version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?' };
        const off = await probeOffline();
        d.connexion = !navigator.onLine ? ['Hors ligne', 'bad'] : off ? ['Pas d\'accès Internet', 'warn'] : ['En ligne', 'ok'];

        d.sw = ENV !== 'ok' ? [{ fichier: 'Non disponible (fichier local)', android: 'Inclus dans l\'app Android', nonsupporte: 'Non pris en charge' }[ENV], ENV === 'android' ? 'ok' : 'warn'] : null;
        d.tech = [];
        if (ENV === 'ok') {
            const reg = await navigator.serviceWorker.getRegistration();
            d.reg = reg;
            if (!reg) d.sw = ['Pas encore installé', 'warn'];
            else if (reg.installing || reg.waiting) d.sw = ['Installation en cours…', 'warn'];
            else if (reg.active && navigator.serviceWorker.controller) d.sw = ['Prêt', 'ok'];
            else if (reg.active) d.sw = ['Prêt au prochain chargement', 'warn'];
            else d.sw = ['Inactif', 'bad'];
            d.tech.push(`Service worker : ${reg && reg.active ? reg.active.state : 'aucun'} · page contrôlée : ${navigator.serviceWorker.controller ? 'oui' : 'non'}`);
            for (const name of await caches.keys()) {
                const n = (await (await caches.open(name)).keys()).length;
                d.tech.push(`Cache ${name} : ${n} fichier(s)`);
            }
        }

        d.storage = null;
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const est = await navigator.storage.estimate();
                const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
                d.storage = [`${fmtSize(est.usage || 0)} utilisés`, persisted ? 'ok' : 'warn', persisted ? 'protégé' : 'non protégé'];
                if (est.quota) d.tech.push(`Espace permis par le navigateur : ≈ ${fmtSize(est.quota)}`);
            } catch (e) { /* non disponible */ }
        }

        if (manifest && ENV === 'ok') {
            try { await readState(); } catch (e) { /* sélection illisible : affichée vide */ }
        }
        const pinned = new Set(manifest && ENV === 'ok' ? state.apps : []);
        const avail = manifest && ENV === 'ok' ? await availableOffline() : null;
        let reports;
        try { reports = scanReports(); } catch (e) { reports = { perApp: {}, other: { n: 0, size: 0, last: 0 }, used: 0, count: 0, rulesKnown: false }; }
        d.reports = reports;

        const seen = new Set();
        d.apps = Array.from(document.querySelectorAll('.app-card[href]')).map((card) => {
            const href = hrefOf(card);
            if (seen.has(href) || !/\.html?$/i.test(href)) return null; // cartes « à venir » (javascript:void(0)) ignorées
            seen.add(href);
            const title = (card.querySelector('.app-title') || card).textContent.trim().replace(/\s+/g, ' ');
            let hl = ['—', ''];
            if (avail) {
                if (pinned.has(href)) hl = avail.has(href) ? ['Gardée', 'ok'] : ['Gardée, fichiers manquants', 'bad'];
                else hl = avail.has(href) ? ['Ouverte récemment', 'warn'] : ['Non', ''];
            } else if (ENV === 'android') hl = ['Incluse', 'ok'];
            const r = reports.perApp[href] || { n: 0, size: 0, last: 0 };
            return { title, hl, r };
        }).filter(Boolean);
        d.tech.push(`Navigateur : ${navigator.userAgent}`);
        return d;
    }

    function diagnosticText(d) {
        const lines = [
            `Diagnostic du Hub — ${new Date().toLocaleString('fr-CA')}`,
            `Version : ${d.version}`,
            `Connexion : ${d.connexion[0]}`,
            `Mode hors ligne : ${d.sw ? d.sw[0] : '—'}`,
            `Stockage : ${d.storage ? d.storage[0] + ' (' + d.storage[2] + ')' : '—'}`,
            `Rapports sauvegardés : ${d.reports.count} (≈ ${fmtSize(d.reports.used)} sur ≈ 5 Mo)`,
            '',
            'Apps sur cet appareil :',
        ];
        d.apps.forEach((a) => lines.push(`- ${a.title} : hors ligne ${a.hl[0]} · ${a.r.n} rapport(s)${a.r.n ? ' · dernier ' + fmtDate(a.r.last) : ''}`));
        if (d.reports.other.n) lines.push(`- Autres rapports (app inconnue ou retirée) : ${d.reports.other.n}`);
        return lines.concat('', ...d.tech).join('\n');
    }

    function renderDiagnostic(panel, d) {
        const tile = (label, val, cls, sub) => `<div class="hd-tile ${cls ? 'hd-' + cls : ''}"><small>${esc(label)}</small><strong>${esc(val)}</strong>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
        const pct = d.reports.used / LOCAL_LIMIT;
        const rows = d.apps.map((a) => `<tr>
                <td>${esc(a.title)}</td>
                <td><span class="hd-pill ${a.hl[1] ? 'hd-' + a.hl[1] : ''}">${esc(a.hl[0])}</span></td>
                <td class="hd-num">${d.reports.rulesKnown ? a.r.n + (a.r.n ? ` <small>(${fmtSize(a.r.size)})</small>` : '') : '—'}</td>
                <td class="hd-date">${a.r.n ? fmtDate(a.r.last) : '—'}</td>
            </tr>`).join('');
        const other = d.reports.other.n ? `<tr class="hd-other"><td>Autres rapports (app inconnue ou retirée)</td><td></td>
                <td class="hd-num">${d.reports.other.n} <small>(${fmtSize(d.reports.other.size)})</small></td><td class="hd-date">${fmtDate(d.reports.other.last)}</td></tr>` : '';
        panel.innerHTML = `
            <div class="hd-tiles">
                ${tile('Connexion', d.connexion[0], d.connexion[1])}
                ${tile('Mode hors ligne', d.sw ? d.sw[0] : '—', d.sw ? d.sw[1] : '')}
                ${tile('Rapports sauvegardés', `${d.reports.count}`, pct >= 0.8 ? 'bad' : pct >= 0.5 ? 'warn' : 'ok', `≈ ${fmtSize(d.reports.used)} sur ≈ 5 Mo`)}
                ${tile('Stockage de l\'appareil', d.storage ? d.storage[0] : '—', d.storage ? d.storage[1] : '', d.storage ? d.storage[2] : '')}
            </div>
            ${pct >= 0.8 ? '<p class="hd-alert">Les rapports approchent la limite du navigateur : exportez les PDF puis supprimez les anciens rapports dans chaque app.</p>' : ''}
            <table class="hd-table">
                <thead><tr><th>App</th><th>Hors ligne</th><th class="hd-num">Rapports</th><th class="hd-date">Dernier</th></tr></thead>
                <tbody>${rows}${other}</tbody>
            </table>
            <div class="hd-actions">
                ${ENV === 'ok' ? '<button type="button" class="hl-btn hl-primary" data-hd="update">Rechercher une mise à jour</button>' : ''}
                <button type="button" class="hl-btn" data-hd="copy">Copier le diagnostic</button>
                <button type="button" class="hl-btn" data-hd="refresh">Actualiser</button>
            </div>
            <details class="hd-tech"><summary>Détails techniques · ${esc(d.version)}</summary><pre>${esc(d.tech.join('\n'))}</pre></details>`;
        panel.querySelector('[data-hd="copy"]').addEventListener('click', () => copyText(diagnosticText(d)));
        panel.querySelector('[data-hd="refresh"]').addEventListener('click', () => showDiagnostic(panel));
        const upd = panel.querySelector('[data-hd="update"]');
        if (upd) upd.addEventListener('click', () => checkUpdate(upd));
    }

    async function showDiagnostic(panel) {
        panel.innerHTML = '<p class="hd-wait">Vérification de l\'appareil…</p>';
        try {
            renderDiagnostic(panel, await collectDiagnostic());
        } catch (e) {
            panel.textContent = 'Diagnostic impossible : ' + e.message;
        }
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            const area = document.createElement('textarea');
            area.value = text;
            document.body.appendChild(area);
            area.select();
            try { document.execCommand('copy'); } catch (e2) { /* non disponible */ }
            area.remove();
        }
        toast('Diagnostic copié : collez-le dans un courriel ou un message.', 'success');
    }

    // Cherche un nouveau sw.js ; s'il y en a un, il s'installe (fichiers modifiés seulement) puis la page se recharge
    async function checkUpdate(btn) {
        if (await probeOffline()) return toast('Connexion requise pour chercher une mise à jour.', 'error');
        const label = btn.textContent;
        const reset = () => { btn.disabled = false; btn.textContent = label; };
        btn.disabled = true;
        btn.textContent = 'Recherche…';
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) { reset(); return toast('Mode hors ligne pas encore installé : rechargez la page.', 'error'); }
            await reg.update();
            const worker = reg.installing || reg.waiting;
            if (!worker) { reset(); return toast(`Le Hub est déjà à jour (${typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''}).`, 'info'); }
            btn.textContent = 'Téléchargement…';
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                try { sessionStorage.setItem('updateResult', 'Hub mis à jour.'); } catch (e) { /* stockage indisponible */ }
                location.reload();
            }, { once: true });
            if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            worker.addEventListener('statechange', () => {
                if (worker.state === 'installed' && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                if (worker.state === 'redundant') { reset(); toast('La mise à jour a échoué : réessayez avec une connexion stable.', 'error'); }
            });
        } catch (e) {
            reset();
            toast('La mise à jour a échoué : réessayez avec une connexion stable.', 'error');
        }
    }

    // Remplace l'ancien toggleDiagnostics() du Hub (bouton « Afficher le diagnostic »)
    window.toggleDiagnostics = async function () {
        const panel = document.getElementById('diagnostics-panel');
        const button = document.getElementById('diagnostics-toggle');
        if (!panel || !button) return;
        panel.classList.add('hub-diag');
        panel.removeAttribute('style');
        if (!panel.hidden) {
            panel.hidden = true;
            button.textContent = 'Afficher le diagnostic';
            return;
        }
        panel.hidden = false;
        button.textContent = 'Masquer le diagnostic';
        showDiagnostic(panel);
    };

    async function init() {
        const built = buildPanel();
        if (ENV !== 'ok') {
            if (built) panelMessage(ENV_MSG[ENV]);
            return;
        }
        try {
            const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
            if (!res.ok) throw new Error(res.status);
            manifest = await res.json();
        } catch (e) {
            // Hub pas encore mis à jour par SFGEN, ou hors ligne sans coquille
            if (built) panelMessage(navigator.onLine
                ? 'Liste des apps introuvable (hors_ligne.json) : mettez le Hub à jour avec SFGEN.'
                : 'Hors ligne : la liste des apps n\'est pas encore sur cet appareil. Ouvrez le Hub une fois en ligne.');
            return;
        }
        if (!built) return;
        ui['hl-actions'].hidden = false;
        await readState();
        addToggles();
        try { setOnly(localStorage.getItem(ONLY_KEY) === '1'); } catch (e) { setOnly(false); }
        await applyOfflineState();
        window.addEventListener('online', applyOfflineState);
        window.addEventListener('offline', applyOfflineState);
        // Nouveau service worker actif (1re installation ou mise à jour) : sa sélection est relue
        navigator.serviceWorker.addEventListener('controllerchange', async () => { await readState(); await applyOfflineState(); });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) applyOfflineState(); });
        window.hubHorsLigne = { pinApps, unpinApps, readState, scanReports, get state() { return state; }, get manifest() { return manifest; } };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
