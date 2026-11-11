// ========================================================================== //
// GESTION DES RAPPORTS : PARTAGE .JSON, IMPORT ET MODE HYBRIDE (ENG/MTQ/HDQ)   //
// Fichier commun à toutes les apps, déployé par SFGEN (assets/hub/) dans       //
// shared/js/. Ne pas modifier la copie du Hub : SFGEN la remplace.             //
// ========================================================================== //
// À charger APRÈS app_xxx.js. L'app le configure juste avant :
//   window.REPORT_CONFIG = {
//     slug: 'beton',            identifiant de l'app (vérifié à l'import)
//     keyPrefix: 'ID_',         début des clés localStorage de cette app
//     namePrefix: 'englobe_',   début obligatoire du nom (filtre de updateDropdown), facultatif
//     orgName: 'Englobe',       nom de l'organisation principale (image de marque de SFGEN), facultatif
//     orgs: ['eng', 'mtq'],     modes offerts (une seule valeur : app non hybride)
//     pdfReady: ['eng'],        facultatif : modèles PDF disponibles (défaut : tous les modes)
//     hybridActive: ['mtq']     versions MTQ / HDQ utilisables (bascule + export). Absent = aucune : leurs boutons
//                               restent grisés (« Fonctionnalité non disponible pour ce formulaire »), comme LIMS.
//   };
// L'app doit fournir : currentActiveReportKey, saveReport, loadReport, clearForm, updateDropdown, showToast.
// Elle appelle generateReportId(), storeReport() et readStoredReport() au lieu de localStorage.
(function () {
    'use strict';

    const CONFIG = window.REPORT_CONFIG || {};
    const APP_SLUG = CONFIG.slug || '';
    const KEY_PREFIX = CONFIG.keyPrefix || 'rapport_';
    const NAME_PREFIX = CONFIG.namePrefix || '';
    const DEFAULT_ORG = 'eng';
    const ORGS = CONFIG.orgs && CONFIG.orgs.length ? CONFIG.orgs : [DEFAULT_ORG];
    // Nom de l'organisation principale : image de marque de SFGEN (REPORT_CONFIG.orgName ou <body data-brand-name>)
    const ORG_LABELS = { eng: CONFIG.orgName || (document.body && document.body.dataset.brandName) || 'Englobe', mtq: 'MTQ', hdq: 'HDQ' };
    const ACTIVE_ORGS = Array.isArray(CONFIG.hybridActive) ? CONFIG.hybridActive : [];
    const FROZEN_TITLE = 'Fonctionnalité non disponible pour ce formulaire';
    const isUsable = org => org === DEFAULT_ORG || (ORGS.includes(org) && ACTIVE_ORGS.includes(org));
    const IMPORT_ICON = '📲';
    const IMPORT_MARK = '"imported_external":true';  // Détection sans analyser des rapports parfois très lourds
    const SHARE_FORMAT_VERSION = '1.0';

    let activeOrgMode = DEFAULT_ORG;
    let importedExternal = false;
    // Rapport qui n'entre plus dans localStorage (stockage plein) : { key, text }. Gardé en mémoire
    // pour que le technicien puisse continuer, exporter le PDF ou partager le rapport.
    let memoryReport = null;

    function isQuotaError(e) {
        return e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
    }

    // ---------------------------------------------------------------------- //
    // Identifiants et stockage                                               //
    // ---------------------------------------------------------------------- //
    function generateReportId() {
        return `rpt_${Date.now()}_${Math.random().toString(16).substring(2, 6)}`;
    }

    // Écrit le rapport avec ses métadonnées. false = stockage plein (rapport gardé en mémoire).
    function storeReport(key, reportData, isDuplicate = false) {
        reportData.active_org_mode = activeOrgMode;
        if (isDuplicate) importedExternal = false;  // Une copie faite ici n'est plus un rapport reçu
        if (importedExternal) reportData.imported_external = true;
        const text = JSON.stringify(reportData);
        try {
            localStorage.setItem(key, text);
        } catch (e) {
            if (!isQuotaError(e)) throw e;
            memoryReport = { key, text };
            currentActiveReportKey = key;
            updateDropdown();
            showToast("Stockage plein : rapport gardé en mémoire seulement. Exportez le PDF ou partagez le rapport.", "error");
            return false;
        }
        if (memoryReport && memoryReport.key === key) memoryReport = null;
        refreshImportedIndicator();
        return true;
    }

    function readStoredReport(key) {
        return memoryReport && memoryReport.key === key ? memoryReport.text : localStorage.getItem(key);
    }

    // ---------------------------------------------------------------------- //
    // Mode hybride                                                           //
    // ---------------------------------------------------------------------- //
    // Bouton d'une version gelée (ou LIMS) : désactivé, grisé, avec l'explication au survol
    function setFrozen(btn, frozen) {
        btn.classList.toggle('is-frozen', frozen);
        if (frozen) {
            btn.disabled = true;
            btn.title = FROZEN_TITLE;
        }
    }

    function setOrgMode(mode) {
        activeOrgMode = isUsable(mode) ? mode : DEFAULT_ORG;  // version gelée (ex. rapport ancien en mode MTQ) : Englobe
        document.body.dataset.activeOrg = activeOrgMode;
        document.querySelectorAll('#org-mode-bar [data-org-mode]').forEach(btn => {
            const isActive = btn.dataset.orgMode === activeOrgMode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
            const frozen = !isUsable(btn.dataset.orgMode);
            setFrozen(btn, frozen);
            if (!frozen) btn.disabled = false;
        });
        // Interrupteur compact (ex. « Mode MTQ » du Béton) : <input type="checkbox" data-org-toggle="mtq">
        document.querySelectorAll('[data-org-toggle]').forEach(input => {
            const org = input.dataset.orgToggle;
            const frozen = !isUsable(org);
            input.checked = !frozen && activeOrgMode === org;
            input.disabled = frozen;
            const label = input.closest('label');
            if (label) {
                label.classList.toggle('is-frozen', frozen);
                if (frozen) label.title = FROZEN_TITLE;
            }
        });
        const lims = document.getElementById('btn-export-lims');
        if (lims) setFrozen(lims, true);
        ['mtq', 'hdq'].forEach(org => {
            const btn = document.getElementById(`btn-export-${org}`);
            if (!btn) return;
            if (!isUsable(org)) return setFrozen(btn, true);
            btn.classList.remove('is-frozen');
            const unlocked = org === activeOrgMode;
            btn.disabled = !unlocked;
            btn.classList.toggle('is-locked', !unlocked);
            btn.title = unlocked ? '' : `Activez le mode ${ORG_LABELS[org]} ci-dessous pour déverrouiller`;
        });
    }

    function getActiveOrgMode() {
        return activeOrgMode;
    }

    // Petite étiquette MTQ / HDQ à côté du libellé des champs marqués à la main dans le HTML
    function addClientTags() {
        document.querySelectorAll('[data-client], .field-mtq, .field-hdq').forEach(field => {
            const org = field.dataset.client || (field.classList.contains('field-hdq') ? 'hdq' : 'mtq');
            const label = field.querySelector('label');
            if (!label || field.querySelector('.variant-badge')) return;
            const tag = document.createElement('span');
            tag.className = 'variant-badge';
            tag.textContent = org.toUpperCase();
            label.appendChild(document.createTextNode(' '));
            label.appendChild(tag);
        });
    }

    // ---------------------------------------------------------------------- //
    // Indicateur « rapport reçu d'un autre appareil »                        //
    // ---------------------------------------------------------------------- //
    function refreshImportedIndicator() {
        const indicator = document.getElementById('imported-indicator');
        if (indicator) indicator.style.display = importedExternal ? 'inline-block' : 'none';
    }

    function decorateDropdown() {
        const dropdown = document.getElementById('saved-reports-dropdown');
        if (!dropdown) return;
        if (memoryReport && !Array.from(dropdown.options).some(opt => opt.value === memoryReport.key)) {
            const option = document.createElement('option');
            option.value = memoryReport.key;
            option.textContent = displayNameOf(memoryReport.text);
            dropdown.appendChild(option);
        }
        Array.from(dropdown.options).forEach(option => {
            if (!option.value) return;
            const raw = readStoredReport(option.value);
            if (raw && raw.includes(IMPORT_MARK) && !option.textContent.startsWith(IMPORT_ICON)) {
                option.textContent = `${IMPORT_ICON} ${option.textContent}`;
            }
        });
        if (currentActiveReportKey) dropdown.value = currentActiveReportKey;
    }

    function displayNameOf(text) {
        try {
            return (JSON.parse(text).displayName || '').replace(/^englobe_/, '').replace(/_/g, ' ');
        } catch (e) {
            return '';
        }
    }

    // ---------------------------------------------------------------------- //
    // État lié au rapport ouvert (branché sur les fonctions de l'app)        //
    // ---------------------------------------------------------------------- //
    function resetReportState() {
        importedExternal = false;
        setOrgMode(DEFAULT_ORG);
        refreshImportedIndicator();
    }

    function restoreReportMeta() {
        const key = currentActiveReportKey;
        if (!key) return;
        let report = null;
        try {
            report = JSON.parse(readStoredReport(key));
        } catch (e) {}
        if (!report) return;
        importedExternal = report.imported_external === true;
        // Anciens rapports d'apps hybrides SFGEN : le mode était un champ caché du formulaire
        setOrgMode(report.active_org_mode || (report.static && report.static['active-variant']));
        refreshImportedIndicator();
    }

    function forgetDeletedMemoryReport() {
        if (memoryReport && currentActiveReportKey !== memoryReport.key) {
            memoryReport = null;
            updateDropdown();
        }
    }

    function runAfter(name, hook) {
        const original = window[name];
        if (typeof original !== 'function') return;
        window[name] = function (...args) {
            const result = original.apply(this, args);
            hook();
            return result;
        };
    }

    runAfter('clearForm', resetReportState);
    runAfter('loadReport', restoreReportMeta);
    runAfter('updateDropdown', decorateDropdown);
    runAfter('deleteReport', forgetDeletedMemoryReport);

    // Version gelée, ou modèle PDF pas encore intégré à l'app : message clair plutôt qu'un PDF sous le mauvais nom
    if (typeof window.exportToPDF === 'function') {
        const exportOriginal = window.exportToPDF;
        window.exportToPDF = function (target = DEFAULT_ORG) {
            if (!isUsable(target)) {
                showToast(`${FROZEN_TITLE} (${ORG_LABELS[target] || target}).`, "info");
                return undefined;
            }
            if (CONFIG.pdfReady && !CONFIG.pdfReady.includes(target)) {
                showToast(`Le modèle PDF ${ORG_LABELS[target] || target} de ce formulaire n'est pas encore intégré.`, "info");
                return undefined;
            }
            return exportOriginal.call(this, target);
        };
    }

    // ---------------------------------------------------------------------- //
    // Photos des rapports : compression <canvas> + base IndexedDB            //
    // ---------------------------------------------------------------------- //
    // Les photos ne vont plus dans localStorage (5 Mo pour tout l'appareil) : une entrée par rapport dans
    // IndexedDB « InspectionPhotosDB », magasin « photos », clé « <slug de l'app>::<clé du rapport> ».
    // Utilisé par shared/js/photo_addon.js (annexe photo) et par les apps Journal (photos intégrées).
    // Partage .json : les photos du rapport sont jointes au fichier ; import : remises dans IndexedDB ;
    // suppression du rapport : ses photos aussi.
    const PHOTO_DB_NAME = 'InspectionPhotosDB';
    const PHOTO_STORE = 'photos';
    const PHOTO_MAX_SIZE = 1200;     // px, plus grand côté
    const PHOTO_QUALITY = 0.75;      // JPEG
    let photoDbPromise = null;

    function openPhotoDb() {
        if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB indisponible sur cet appareil'));
        if (!photoDbPromise) {
            photoDbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(PHOTO_DB_NAME, 1);
                request.onupgradeneeded = () => {
                    if (!request.result.objectStoreNames.contains(PHOTO_STORE)) request.result.createObjectStore(PHOTO_STORE);
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => { photoDbPromise = null; reject(request.error); };
            });
        }
        return photoDbPromise;
    }

    function photoKey(reportKey) {
        return `${APP_SLUG}::${reportKey}`;
    }

    async function photoTx(mode, action) {
        const db = await openPhotoDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PHOTO_STORE, mode);
            const request = action(tx.objectStore(PHOTO_STORE));
            tx.oncomplete = () => resolve(request ? request.result : undefined);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    const getPhotos = reportKey => (reportKey ? photoTx('readonly', s => s.get(photoKey(reportKey))) : Promise.resolve(undefined));
    const putPhotos = (reportKey, record) => photoTx('readwrite', s => s.put({ ...record, saved_at: Date.now() }, photoKey(reportKey)));
    const deletePhotos = reportKey => photoTx('readwrite', s => s.delete(photoKey(reportKey)));

    function loadImageSource(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = typeof source === 'string' ? source : URL.createObjectURL(source);
            img.onload = () => {
                if (typeof source !== 'string') URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => reject(new Error('Image illisible'));
            img.src = url;
        });
    }

    // Photo (fichier ou data URL) réduite sur un <canvas> hors écran : 1200 px au plus, JPEG 0,75.
    // pdf-lib manipule ensuite de petites images : plus de manque de mémoire sur tablette.
    async function compressImage(source, maxSize = PHOTO_MAX_SIZE, quality = PHOTO_QUALITY) {
        const img = await loadImageSource(source);
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        const ratio = Math.min(1, maxSize / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * ratio));
        canvas.height = Math.max(1, Math.round(h * ratio));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';  // fond blanc : une image PNG transparente ne devient pas noire en JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
    }

    window.InspectionPhotos = {
        compress: compressImage, get: getPhotos, put: putPhotos, remove: deletePhotos, key: photoKey,
        MAX_SIZE: PHOTO_MAX_SIZE, QUALITY: PHOTO_QUALITY
    };

    // Rapport supprimé par l'app : ses photos aussi (clé lue avant la suppression)
    if (typeof window.deleteReport === 'function') {
        const deleteOriginal = window.deleteReport;
        window.deleteReport = function (...args) {
            const dropdown = document.getElementById('saved-reports-dropdown');
            const key = (typeof currentActiveReportKey !== 'undefined' && currentActiveReportKey) || (dropdown && dropdown.value);
            const result = deleteOriginal.apply(this, args);
            if (key && localStorage.getItem(key) === null) deletePhotos(key).catch(() => {});
            return result;
        };
    }

    // ---------------------------------------------------------------------- //
    // Partage d'un rapport en fichier .json                                  //
    // ---------------------------------------------------------------------- //
    function safeFileName(text) {
        return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'rapport';
    }

    function isMobileDevice() {
        const ua = navigator.userAgent || '';
        return /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    }

    function downloadFile(file) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function deliverFile(fileName, text) {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { Filesystem, Share } = window.Capacitor.Plugins;
            const written = await Filesystem.writeFile({ path: fileName, data: text, directory: 'CACHE', encoding: 'utf8', recursive: true });
            await Share.share({ title: fileName, files: [written.uri] });
            return;
        }
        const file = new File([text], fileName, { type: 'application/json' });
        if (isMobileDevice() && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: fileName });
                return;
            } catch (e) {
                if (e.name === 'AbortError') return;  // Le technicien a fermé la fenêtre de partage
            }
        }
        downloadFile(file);
    }

    async function shareReportJson() {
        window.saveReport();  // Sauvegarde d'abord : demande un nom si le rapport est nouveau
        const key = currentActiveReportKey;
        const raw = key ? readStoredReport(key) : null;
        if (!raw) return showToast("Sauvegardez le rapport avant de le partager.", "info");

        try {
            const { imported_external, active_org_mode, ...data } = JSON.parse(raw);
            const reportName = data.displayName || key;
            const payload = {
                sfgen_version: SHARE_FORMAT_VERSION,
                app_slug: APP_SLUG,
                report_id: key,
                report_name: reportName,
                exported_at: new Date().toISOString(),
                active_org_mode: activeOrgMode,
                imported_external: true,
                data
            };
            // Photos du rapport (IndexedDB) jointes au fichier partagé
            try {
                const photos = await getPhotos(key);
                if (photos) payload.photos = photos;
            } catch (e) {
                console.warn('Photos du rapport non jointes au partage :', e);
            }
            await deliverFile(`${APP_SLUG}_${safeFileName(reportName)}.json`, JSON.stringify(payload));
        } catch (e) {
            if (/cancel/i.test(e.message || '')) return;  // Partage annulé dans l'application Android
            console.error("Erreur lors du partage du rapport :", e);
            showToast("Erreur lors du partage du rapport.", "error");
        }
    }

    // ---------------------------------------------------------------------- //
    // Import d'un rapport reçu                                               //
    // ---------------------------------------------------------------------- //
    function triggerJsonImport() {
        document.getElementById('json-import-input').click();
    }

    function importReportJson(event) {
        const input = event.target;
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            input.value = '';  // Permet de choisir à nouveau le même fichier
            openImportedReport(String(reader.result));
        };
        reader.onerror = () => {
            input.value = '';
            alert("Erreur : Impossible de lire ce fichier.");
        };
        reader.readAsText(file);
    }

    async function openImportedReport(text) {
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (e) {}
        if (!json || typeof json.data !== 'object' || json.data === null || !json.app_slug) {
            return alert("Erreur : Ce fichier n'est pas un rapport valide.");
        }
        if (json.app_slug !== APP_SLUG) {
            return alert("Erreur : Ce fichier appartient au formulaire « " + json.app_slug + " » et ne peut pas être ouvert ici.");
        }

        // Identifiant du fichier repris seulement s'il suit la convention de l'app (jamais une clé quelconque de localStorage)
        const hasValidId = typeof json.report_id === 'string' && json.report_id.startsWith(KEY_PREFIX);
        let reportId = hasValidId ? json.report_id : KEY_PREFIX + generateReportId();
        let reportName = String(json.report_name || json.data.displayName || reportId);
        if (localStorage.getItem(reportId) !== null
            && !confirm("Ce rapport existe déjà sur cet appareil. Voulez-vous écraser la version locale avec ce fichier reçu ? (Cliquez sur Annuler pour l'importer comme une copie séparée)")) {
            reportId = KEY_PREFIX + generateReportId();
            reportName += ' (Copie)';
        }
        if (NAME_PREFIX && !reportName.startsWith(NAME_PREFIX)) reportName = NAME_PREFIX + reportName;

        json.imported_external = true;
        const reportText = JSON.stringify({
            ...json.data,
            displayName: reportName,
            imported_external: json.imported_external,
            active_org_mode: ORGS.includes(json.active_org_mode) ? json.active_org_mode : DEFAULT_ORG
        });

        let storageFull = false;
        try {
            localStorage.setItem(reportId, reportText);
            if (memoryReport && memoryReport.key === reportId) memoryReport = null;
        } catch (e) {
            if (!isQuotaError(e)) throw e;
            storageFull = true;
            memoryReport = { key: reportId, text: reportText };
        }

        // Photos jointes au fichier : remises dans IndexedDB avant d'ouvrir le rapport
        if (json.photos && typeof json.photos === 'object') {
            try {
                await putPhotos(reportId, json.photos);
            } catch (e) {
                console.warn('Photos du fichier non importées :', e);
                showToast("Les photos de ce rapport n'ont pas pu être enregistrées sur cet appareil.", "error");
            }
        }

        updateDropdown();
        document.getElementById('saved-reports-dropdown').value = reportId;
        window.loadReport();
        if (storageFull) {
            alert("Stockage de l'appareil plein : ce rapport est ouvert, mais il n'est pas sauvegardé sur cet appareil. Exportez le PDF avant de fermer la page, ou libérez de l'espace en supprimant d'anciens rapports.");
        }
    }

    // ---------------------------------------------------------------------- //
    // Démarrage                                                              //
    // ---------------------------------------------------------------------- //
    function init() {
        addClientTags();
        setOrgMode(DEFAULT_ORG);
        refreshImportedIndicator();
    }

    Object.assign(window, {
        generateReportId, storeReport, readStoredReport,
        setOrgMode, getActiveOrgMode,
        triggerJsonImport, importReportJson, shareReportJson
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
