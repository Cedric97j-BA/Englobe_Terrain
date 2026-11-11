// ========================================================================== //
// ANNEXE PHOTO : module commun, déployé par SFGEN (assets/hub/) dans          //
// shared/js/photo_addon.js. Ne pas modifier la copie du Hub : SFGEN la remplace. //
// ========================================================================== //
// À charger APRÈS gestion_rapports.js (compression <canvas> + IndexedDB : window.InspectionPhotos)
// et AVANT croquis_addon.js (dans le PDF : feuille Croquis, puis pages photo).
//
// Deux façons de l'activer :
//   A. Bloc dans le formulaire (SFGEN, onglet 4 « Bloc Annexe Photo ») :
//        <div class="photo-annex-block" data-photo-annex data-photo-trigger="photos-oui"></div>
//      L'outil photo apparaît dans cette section quand la case data-photo-trigger est cochée
//      (toujours visible sans data-photo-trigger).
//   B. Case en bas du formulaire (REPORT_CONFIG.photos === true), à côté de « ✏️ Joindre un croquis » :
//        « 📷 Joindre une annexe photo à ce rapport ».
// Photos compressées (1200 px au plus, JPEG 0,75) et gardées dans IndexedDB avec le rapport :
// Sauvegarder / Charger / Supprimer / PARTAGER (.json) / Importer suivent le rapport.
// Export PDF (PDF, MTQ…) : pages « Journal photo » (shared/js/tpl_photo.js, 2 photos par page)
// remplies (en-tête du formulaire, photos, légendes), aplaties et ajoutées à la fin du PDF.
(function () {
    'use strict';

    const SCRIPT_SRC = document.currentScript ? document.currentScript.src : '';
    const CONFIG = window.REPORT_CONFIG || {};
    const PER_PAGE = 2;                                   // photos par page du modèle Journal photo
    const SLOT_BUTTONS = ['desc-img-01', 'desc-img-02'];  // cadres des photos de la page 1 du modèle
    // En-tête des pages photo : premier champ trouvé dans le formulaire
    const HEADER_SOURCES = {
        projet: ['global-projet'],
        client: ['global-client'],
        endroit: ['global-endroit', 'global-adresse'],
        noProjet: ['global-no-projet', 'global-no-client'],
        date: ['global-date', 'sig-prep-date', 'f2-verif-date', 'f1-verif-date'],
        tech: ['sig-prep-nom', 'f2-tech-name', 'f1-tech-name', 'sig-englobe-nom', 'sig-tech-nom'],
    };

    const state = {
        photos: [],          // { id, data (JPEG data URL), date, chainage, ident, caption }
        mode: null,          // 'A' (bloc dans une section) ou 'B' (case en bas du formulaire)
        host: null,          // conteneur de l'outil photo
        trigger: null,       // mode A : case qui montre le bloc
        toggle: null,        // mode B : case « Joindre une annexe photo »
        card: null,
        body: null,
        list: null,
        counter: null,
        busy: Promise.resolve(),  // chargement des photos d'un rapport en cours
    };

    // ---------------------------------------------------------------------- //
    // Outils                                                                  //
    // ---------------------------------------------------------------------- //
    function el(tag, cls, attrs) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === 'text') node.textContent = v;
            else node.setAttribute(k, v);
        });
        return node;
    }

    function toast(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type || 'success');
    }

    function base64ToBytes(b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    function fieldValue(ids) {
        for (const id of ids) {
            const node = document.getElementById(id);
            if (node && !node.closest('.photo-addon, .photo-annex-block') && String(node.value || '').trim()) return String(node.value).trim();
        }
        return '';
    }

    function currentReportKey() {
        const dropdown = document.getElementById('saved-reports-dropdown');
        return (typeof currentActiveReportKey !== 'undefined' && currentActiveReportKey) || (dropdown && dropdown.value) || '';
    }

    function photosApi() {
        return window.InspectionPhotos || null;
    }

    function newId() {
        return `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    // ---------------------------------------------------------------------- //
    // Modèle « Journal photo » (tpl_photo.js) : chargé à la demande            //
    // ---------------------------------------------------------------------- //
    let templatePromise = null;

    function templateBase64() {
        if (window.PDF_TEMPLATES && window.PDF_TEMPLATES.photo) return window.PDF_TEMPLATES.photo;
        return typeof TEMPLATE_JOURNAL_PHOTO !== 'undefined' ? TEMPLATE_JOURNAL_PHOTO : null;
    }

    function ensureTemplate() {
        if (templateBase64()) return Promise.resolve();
        if (!templatePromise) {
            templatePromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = new URL('tpl_photo.js', SCRIPT_SRC || location.href).href;
                script.onload = () => (templateBase64() ? resolve() : reject(new Error('tpl_photo.js sans modèle')));
                script.onerror = () => {
                    templatePromise = null;
                    reject(new Error('tpl_photo.js introuvable'));
                };
                document.head.appendChild(script);
            });
        }
        return templatePromise;
    }

    // ---------------------------------------------------------------------- //
    // Liste des photos                                                        //
    // ---------------------------------------------------------------------- //
    function isActive() {
        if (state.mode === 'A') return !state.trigger || state.trigger.checked;
        if (state.mode === 'B') return !!(state.toggle && state.toggle.checked);
        return false;
    }

    function refreshCounter() {
        if (!state.counter) return;
        const n = state.photos.length;
        state.counter.textContent = n ? `${n} photo${n > 1 ? 's' : ''} · ${Math.ceil(n / PER_PAGE)} page${n > PER_PAGE ? 's' : ''} ajoutée${n > PER_PAGE ? 's' : ''} au PDF`
            : 'Aucune photo pour l\'instant.';
    }

    function renderList() {
        if (!state.list) return;
        state.list.textContent = '';
        state.photos.forEach((photo, index) => {
            const item = el('div', 'pa-item');
            const thumb = el('img', 'pa-thumb', { alt: `Photo ${index + 1}` });
            thumb.src = photo.data;
            const fields = el('div', 'pa-fields');
            const row = el('div', 'pa-row');
            row.append(el('span', 'pa-num', { text: `Photo ${index + 1}` }));
            const bind = (input, key) => {
                input.value = photo[key] || '';
                input.addEventListener('input', () => { photo[key] = input.value; });
                return input;
            };
            row.append(bind(el('input', '', { type: 'date', 'aria-label': `Date de la photo ${index + 1}` }), 'date'));
            row.append(bind(el('input', '', { type: 'text', placeholder: 'Chaînage / localisation', 'aria-label': `Chaînage de la photo ${index + 1}` }), 'chainage'));
            fields.append(row);
            fields.append(bind(el('input', '', { type: 'text', placeholder: 'Identification', 'aria-label': `Identification de la photo ${index + 1}` }), 'ident'));
            fields.append(bind(el('textarea', '', { rows: '2', placeholder: 'Description / légende', 'aria-label': `Légende de la photo ${index + 1}` }), 'caption'));

            const actions = el('div', 'pa-actions');
            const button = (label, title, action, disabled) => {
                const b = el('button', 'pa-icon-btn', { type: 'button', title, 'aria-label': title, text: label });
                if (disabled) b.disabled = true;
                b.addEventListener('click', action);
                actions.append(b);
            };
            button('▲', 'Monter', () => movePhoto(index, -1), index === 0);
            button('▼', 'Descendre', () => movePhoto(index, 1), index === state.photos.length - 1);
            button('🗑️', 'Retirer la photo', () => removePhoto(index));
            item.append(thumb, fields, actions);
            state.list.append(item);
        });
        refreshCounter();
    }

    function movePhoto(index, delta) {
        const target = index + delta;
        if (target < 0 || target >= state.photos.length) return;
        const [photo] = state.photos.splice(index, 1);
        state.photos.splice(target, 0, photo);
        renderList();
    }

    function removePhoto(index) {
        if (!confirm(`Retirer la photo ${index + 1} de l'annexe ?`)) return;
        state.photos.splice(index, 1);
        renderList();
    }

    async function addFiles(fileList) {
        const api = photosApi();
        const files = Array.from(fileList || []).filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
        if (!files.length) return;
        const defaultDate = fieldValue(HEADER_SOURCES.date) || new Date().toISOString().slice(0, 10);
        let added = 0;
        for (const file of files) {
            try {
                const data = api ? await api.compress(file) : await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                state.photos.push({ id: newId(), data, date: defaultDate, chainage: '', ident: '', caption: '' });
                added++;
            } catch (e) {
                console.error('Annexe photo : image non ajoutée', e);
                toast(`« ${file.name} » n'a pas pu être lue.`, 'error');
            }
        }
        renderList();
        if (added) toast(`${added} photo${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''} (compressée${added > 1 ? 's' : ''}). Sauvegardez le rapport pour les garder.`);
    }

    function buildTool(host) {
        host.classList.add('pa-tool');
        const bar = el('div', 'pa-toolbar');
        const camera = el('input', 'pa-file', { type: 'file', accept: 'image/*', capture: 'environment', hidden: '' });
        const gallery = el('input', 'pa-file', { type: 'file', accept: 'image/*', multiple: '', hidden: '' });
        [camera, gallery].forEach(input => input.addEventListener('change', async () => {
            await addFiles(input.files);
            input.value = '';
        }));
        const shot = el('button', 'pa-btn pa-btn-primary', { type: 'button', text: '📷 Prendre une photo' });
        shot.addEventListener('click', () => camera.click());
        const pick = el('button', 'pa-btn', { type: 'button', text: '🖼️ Ajouter des photos' });
        pick.addEventListener('click', () => gallery.click());
        state.counter = el('span', 'pa-counter');
        bar.append(shot, pick, state.counter, camera, gallery);
        state.list = el('div', 'pa-list');
        const note = el('p', 'pa-note', { text: 'Photos réduites automatiquement (1200 px) et gardées sur l\'appareil avec le rapport. '
            + 'N° de projet, client, date et technicien du formulaire sont repris en en-tête des pages photo du PDF.' });
        host.append(bar, state.list, note);
        renderList();
    }

    // ---------------------------------------------------------------------- //
    // Mode A : bloc placé dans une section, montré par une case à cocher      //
    // ---------------------------------------------------------------------- //
    function refreshBlockVisibility() {
        if (state.mode !== 'A' || !state.host) return;
        state.host.hidden = !isActive();
        state.host.classList.toggle('is-open', isActive());
    }

    function setupBlock(host) {
        state.mode = 'A';
        state.host = host;
        const triggerId = host.getAttribute('data-photo-trigger');
        state.trigger = triggerId ? document.getElementById(triggerId) : null;
        if (state.trigger) state.trigger.addEventListener('change', refreshBlockVisibility);
        buildTool(host);
        refreshBlockVisibility();
    }

    // ---------------------------------------------------------------------- //
    // Mode B : case « Joindre une annexe photo » en bas du formulaire         //
    // ---------------------------------------------------------------------- //
    function showBody(on) {
        state.body.hidden = !on;
        state.card.classList.toggle('is-attached', on);
        if (on) ensureTemplate().catch(() => {});  // préchargé : l'export ne l'attend pas
    }

    function setupCard() {
        state.mode = 'B';
        const card = el('section', 'photo-addon', { 'aria-label': 'Annexe photo' });
        const label = el('label', 'pa-attach-toggle');
        state.toggle = el('input', 'pa-attach', { type: 'checkbox' });
        label.append(state.toggle, el('span', '', { text: '📷 Joindre une annexe photo à ce rapport' }));
        state.toggle.addEventListener('change', () => showBody(state.toggle.checked));
        state.body = el('div', 'pa-attach-body', { hidden: '' });
        card.append(label, state.body);
        state.card = card;
        state.host = state.body;
        // Après le formulaire, juste avant la case « Joindre un croquis » (ajoutée ensuite par croquis_addon.js)
        (document.getElementById('app-container') || document.body).appendChild(card);
        buildTool(state.body);
    }

    // ---------------------------------------------------------------------- //
    // Rapport : Sauvegarder / Charger / Nouveau (photos dans IndexedDB)       //
    // ---------------------------------------------------------------------- //
    function resetPhotos() {
        state.photos = [];
        if (state.toggle) {
            state.toggle.checked = false;
            showBody(false);
        }
        renderList();
        refreshBlockVisibility();
    }

    function restorePhotos() {
        const key = currentReportKey();
        let report = null;
        try {
            const raw = key && typeof window.readStoredReport === 'function' ? window.readStoredReport(key) : null;
            report = raw ? JSON.parse(raw) : null;
        } catch (e) {}
        resetPhotos();
        const api = photosApi();
        if (!key || !api) return;
        state.busy = api.get(key).then(record => {
            if (key !== currentReportKey()) return;  // un autre rapport a été ouvert entre-temps
            state.photos = (record && Array.isArray(record.photos)) ? record.photos.map(p => ({ id: p.id || newId(), ...p })) : [];
            const attached = report && report.photo_annex ? report.photo_annex.attached === true : !!(record && record.attached);
            if (state.toggle) {
                state.toggle.checked = attached && state.photos.length > 0 ? true : attached;
                showBody(state.toggle.checked);
            }
            renderList();
            refreshBlockVisibility();
        }).catch(e => {
            console.error('Annexe photo : lecture IndexedDB impossible', e);
            toast("Les photos de ce rapport n'ont pas pu être relues sur cet appareil.", 'error');
        });
    }

    function wireReport() {
        if (typeof window.storeReport === 'function') {
            const storeOriginal = window.storeReport;
            window.storeReport = function (key, reportData, isDuplicate) {
                if (reportData && typeof reportData === 'object') {
                    reportData.photo_annex = { attached: state.mode === 'B' ? isActive() : null, count: state.photos.length };
                }
                const result = storeOriginal.call(this, key, reportData, isDuplicate);
                const api = photosApi();
                if (api && key) {
                    const photos = state.photos.slice();
                    const attached = isActive();
                    state.busy.then(() => (photos.length ? api.put(key, { photos, attached }) : api.remove(key)))
                        .catch(e => {
                            console.error('Annexe photo : enregistrement IndexedDB impossible', e);
                            toast("Les photos n'ont pas pu être enregistrées sur cet appareil (IndexedDB).", 'error');
                        });
                }
                return result;
            };
        }
        runAfter('clearForm', resetPhotos);
        runAfter('loadReport', restorePhotos);
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

    // ---------------------------------------------------------------------- //
    // Export PDF : pages photo ajoutées à la fin                              //
    // ---------------------------------------------------------------------- //
    function headerValues() {
        const v = {};
        Object.entries(HEADER_SOURCES).forEach(([key, ids]) => { v[key] = fieldValue(ids); });
        v.projetLine = v.projet && v.client ? `${v.projet} — ${v.client}` : (v.projet || v.client);
        return v;
    }

    async function embedPhoto(doc, dataUrl) {
        const [meta, b64] = String(dataUrl).split(',');
        const bytes = base64ToBytes(b64 || '');
        return /image\/png/i.test(meta) ? doc.embedPng(bytes) : doc.embedJpg(bytes);
    }

    async function appendPhotoPages(target) {
        await ensureTemplate();
        const tplBytes = base64ToBytes(templateBase64());
        const head = headerValues();
        const fontBytes = typeof TAHOMA_FONT !== 'undefined' ? base64ToBytes(TAHOMA_FONT) : null;
        for (let start = 0; start < state.photos.length; start += PER_PAGE) {
            const doc = await PDFLib.PDFDocument.load(tplBytes);
            const form = doc.getForm();
            const set = (name, value) => { try { form.getTextField(name).setText(String(value || '').replace(/\s*\n\s*/g, ' ')); } catch (e) {} };
            set('global-projet', head.projetLine);
            set('global-endroit', head.endroit);
            set('global-no-projet', head.noProjet);
            set('sig-prep-nom', head.tech);
            const frames = [];
            for (let s = 0; s < PER_PAGE; s++) {
                const photo = state.photos[start + s];
                if (!photo) continue;
                const n = s + 1;
                set(`img-num-${n}`, String(start + s + 1));
                set(`img-date-${n}`, photo.date || head.date);
                set(`img-chn-${n}`, photo.chainage);
                set(`img-id-${n}`, photo.ident);
                set(`img-rem-${n}`, photo.caption);
                try {
                    const widget = form.getButton(SLOT_BUTTONS[s]).acroField.getWidgets()[0];
                    frames.push({ rect: widget.getRectangle(), data: photo.data });
                } catch (e) {
                    console.warn('Annexe photo : cadre de photo introuvable dans le modèle', SLOT_BUTTONS[s], e);
                }
            }
            if (fontBytes && window.fontkit) {
                try {
                    doc.registerFontkit(window.fontkit);
                    form.updateFieldAppearances(await doc.embedFont(fontBytes, { subset: true }));
                } catch (e) {
                    console.warn('Annexe photo : police Tahoma non appliquée', e);
                }
            }
            form.flatten();
            const page = doc.getPage(0);
            for (const { rect, data } of frames) {
                try {
                    const image = await embedPhoto(doc, data);
                    const scale = Math.min(rect.width / image.width, rect.height / image.height);
                    const w = image.width * scale, h = image.height * scale;
                    page.drawImage(image, { x: rect.x + (rect.width - w) / 2, y: rect.y + (rect.height - h) / 2, width: w, height: h });
                } catch (e) {
                    console.error('Annexe photo : image non placée', e);
                }
            }
            // Pied de page du modèle (« Page 1 de 2 » imprimé) : remplacé par la page de l'annexe photo
            try {
                const total = Math.ceil(state.photos.length / PER_PAGE);
                const footFont = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
                page.drawRectangle({ x: 470, y: 33, width: 108, height: 15, color: PDFLib.rgb(1, 1, 1) });
                const label = `Annexe photo ${start / PER_PAGE + 1} de ${total}`;
                page.drawText(label, { x: 566 - footFont.widthOfTextAtSize(label, 8.5), y: 37, size: 8.5, font: footFont });
            } catch (e) {}
            while (doc.getPageCount() > 1) doc.removePage(doc.getPageCount() - 1);  // le modèle a 2 pages : la 1re suffit
            // Page aplatie : plus aucune annotation utile. Les champs partagés avec la 2e page du modèle laissent sinon
            // des renvois vers des objets supprimés (PDF signalé « endommagé » par certains lecteurs).
            try { page.node.delete(PDFLib.PDFName.of('Annots')); } catch (e) {}
            const [copied] = await target.copyPages(doc, [0]);
            target.addPage(copied);
        }
    }

    let exporting = 0;

    function wireExport() {
        if (typeof window.exportToPDF === 'function') {
            const exportOriginal = window.exportToPDF;
            window.exportToPDF = async function (...args) {
                if (!isActive() || !state.photos.length) return exportOriginal.apply(this, args);
                try {
                    await ensureTemplate();
                } catch (e) {
                    toast("Modèle des pages photo introuvable (shared/js/tpl_photo.js) : PDF exporté sans l'annexe photo.", 'error');
                }
                exporting++;
                try {
                    return await exportOriginal.apply(this, args);
                } finally {
                    exporting--;
                }
            };
        }
        // Le PDF final de l'app est enregistré une seule fois (save) : les pages photo sont ajoutées juste avant
        if (window.PDFLib && !PDFLib.PDFDocument.prototype.__photoAnnexSave) {
            const saveOriginal = PDFLib.PDFDocument.prototype.save;
            PDFLib.PDFDocument.prototype.save = async function (options) {
                if (exporting > 0 && isActive() && state.photos.length && templateBase64() && !this.__photoAnnexAdded) {
                    this.__photoAnnexAdded = true;
                    try {
                        await appendPhotoPages(this);
                    } catch (e) {
                        console.error('Annexe photo : pages non ajoutées au PDF', e);
                        toast("L'annexe photo n'a pas pu être ajoutée au PDF.", 'error');
                    }
                }
                return saveOriginal.call(this, options);
            };
            PDFLib.PDFDocument.prototype.__photoAnnexSave = true;
        }
    }

    // ---------------------------------------------------------------------- //
    // Démarrage                                                               //
    // ---------------------------------------------------------------------- //
    function wantedMode() {
        if (window.PHOTO_ADDON === false) return null;
        if (document.querySelector('[data-photo-annex]')) return 'A';
        return (window.PHOTO_ADDON === true || CONFIG.photos === true) ? 'B' : null;
    }

    function init() {
        const mode = wantedMode();
        if (!mode || state.mode) return;
        if (mode === 'A') setupBlock(document.querySelector('[data-photo-annex]'));
        else setupCard();
        wireReport();
        wireExport();
    }

    window.PhotoAnnex = { state, isActive, appendPhotoPages, ensureTemplate, addFiles, restorePhotos };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
