// ========================================== //
// 1. NAVIGATION ET INITIALISATION            //
// ========================================== //

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    // Synchronisation automatique de global-date vers sig-prep-date si vide
    const globalDateEl = document.getElementById('global-date');
    const sigDateEl = document.getElementById('sig-prep-date');
    if (globalDateEl && sigDateEl) {
        globalDateEl.addEventListener('change', () => {
            if (!sigDateEl.value) sigDateEl.value = globalDateEl.value;
        });
    }

    

    

    updateDropdown();
    runCustomCalculations();
});

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} show`;
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) toast.remove();
        }, 500);
    }, 3000);
}

function showTab(tabId, event) {
    document.querySelectorAll('.tab-section').forEach(tab => tab.style.display = 'none');
    const target = document.getElementById(tabId);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function toggleNO(checkbox, sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    if (checkbox.checked) {
        section.style.opacity = '0.3';
        section.style.pointerEvents = 'none';
        section.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        section.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(txt => txt.value = '');
    } else {
        section.style.opacity = '1';
        section.style.pointerEvents = 'auto';
    }
}

function toggleRemarque(textareaId, checkbox) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    if (checkbox.checked) {
        textarea.style.display = 'block';
    } else {
        textarea.style.display = 'none';
        textarea.value = ''; 
    }
}










// ========================================== //
// DÉCOUPAGE TEXTUEL INTELLIGENT MULTI-LIGNES //
// ========================================== //

function splitTextIntelligently(text, maxChars = 95) {
    if (!text) return [];
    const lines = text.split('\n');
    const result = [];
    for (let line of lines) {
        if (line.trim() === '') { result.push(''); continue; }
        let currentChunk = '';
        for (let word of line.split(' ')) {
            if ((currentChunk + word).length > maxChars) {
                if (currentChunk.trim() !== '') {
                    result.push(currentChunk.trim());
                    currentChunk = word + ' ';
                } else {
                    result.push(word.substring(0, maxChars));
                    currentChunk = word.substring(maxChars) + ' ';
                }
            } else {
                currentChunk += word + ' ';
            }
        }
        if (currentChunk.trim() !== '') result.push(currentChunk.trim());
    }
    return result;
}


// ========================================== //
// CALCULS MATHÉMATIQUES SPÉCIFIQUES          //
// ========================================== //

function runCustomCalculations() {
    // Zone dédiée à vos formules mathématiques (Moyennes, Médianes, Compacité, etc.)
}

// ========================================== //
// MOTEUR DE SAUVEGARDE (LOCALSTORAGE)        //
// ========================================== //

let currentActiveReportKey = null;
const APP_STORAGE_PREFIX = 'FEXC_';

function updateLastSavedStatus(timestamp = Date.now()) {
    const status = document.getElementById('last-saved-status');
    if (status) {
        const date = new Date(timestamp);
        const dateText = date.toLocaleDateString('fr-CA');
        const timeText = date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'H');
        status.textContent = `Dernière sauvegarde : ${dateText} - ${timeText}`;
    }
}

function updateDropdown() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '<option value="">-- Sélectionnez un rapport --</option>';
    let savedReports = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            if (key && (key.startsWith(APP_STORAGE_PREFIX) || key.startsWith('ID_'))) {
                const dataStr = localStorage.getItem(key);
                if (dataStr && dataStr.includes('{')) {
                    const data = JSON.parse(dataStr);
                    if (data && data.displayName && (data.appSlug === 'fond-excav' || key.startsWith(APP_STORAGE_PREFIX))) {
                        const display = data.displayName.replace('englobe_', '').replace(/_/g, ' ');
                        savedReports.push({ key: key, display: display });
                    }
                }
            }
        } catch (e) {}
    }

    savedReports.sort((a, b) => a.display.localeCompare(b.display));
    savedReports.forEach(report => {
        const option = document.createElement('option');
        option.value = report.key;
        option.textContent = report.display;
        dropdown.appendChild(option);
    });

    if (currentActiveReportKey) dropdown.value = currentActiveReportKey;
}

function clearForm() {
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return; 
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
            el.dispatchEvent(new Event('change'));
        } else if (!el.id.startsWith('desc-img-')) {
            el.value = '';
        }
    });

    

    

    

    runCustomCalculations();
}

let newArmed = false;
let newTimeout = null;

function newReportPrompt() {
    const newBtn = document.querySelector('button[onclick="newReportPrompt()"]');
    if (!newArmed) {
        newArmed = true;
        if (newBtn) { newBtn.textContent = "⚠️ Confirmer ?"; newBtn.style.background = "#b91c1c"; }
        newTimeout = setTimeout(() => {
            newArmed = false;
            if (newBtn) { newBtn.textContent = "➕ Nouveau"; newBtn.style.background = "#0284c7"; }
        }, 4000);
        return; 
    }
    clearTimeout(newTimeout);
    newArmed = false;
    if (newBtn) { newBtn.textContent = "➕ Nouveau"; newBtn.style.background = "#0284c7"; }
    
    currentActiveReportKey = null; 
    clearForm(); 
    document.getElementById('saved-reports-dropdown').value = ""; 
    document.getElementById('last-saved-status').textContent = "Dernière sauvegarde : aucune";
    showToast("Écran réinitialisé. Nouveau rapport prêt.", "success");
}

function saveReport(isDuplicate = false) {
    let saveKey = currentActiveReportKey;
    const noProjet = document.getElementById('global-no-projet')?.value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date')?.value || new Date().toISOString().split('T')[0];
    const techName = document.getElementById('sig-prep-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `englobe_${rawDate}_${noProjet}_FOND-EXCAV_${techInitials}`;

    if (!saveKey || isDuplicate) {
        if (isDuplicate) baseName += "_copie";
        const promptMsg = isDuplicate ? "Nom pour la COPIE :" : "Nom de sauvegarde du rapport :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        saveKey = APP_STORAGE_PREFIX + generateReportId();
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown' || el.type === 'file') return;
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const cardsData = [];
    document.querySelectorAll('.essai-card').forEach(card => {
        const cObj = {};
        card.querySelectorAll('.card-input').forEach(inp => {
            const key = inp.dataset.pdfPattern || inp.className;
            cObj[key] = inp.type === 'checkbox' ? inp.checked : inp.value;
        });
        cardsData.push(cObj);
    });

    const tasksData = [];
    document.querySelectorAll('.task-card').forEach(card => {
        tasksData.push({
            start: card.querySelector('.task-start')?.value || '',
            end: card.querySelector('.task-end')?.value || '',
            desc: card.querySelector('.task-desc')?.value || ''
        });
    });

    const reportData = {
        appSlug: 'fond-excav',
        displayName: baseName,
        static: staticData,
        cards: cardsData,
        tasks: tasksData,
        timestamp: new Date().getTime()
    };

    if (!storeReport(saveKey, reportData, isDuplicate)) return;
    currentActiveReportKey = saveKey; 
    updateLastSavedStatus(reportData.timestamp);
    updateDropdown();
    document.getElementById('saved-reports-dropdown').value = saveKey;
    showToast(isDuplicate ? "Copie sauvegardée avec succès." : "Rapport sauvegardé avec succès.", "success");
}

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const selectedKey = dropdown.value;
    if (!selectedKey) return showToast("Veuillez sélectionner un rapport.", "info");

    const reportDataStr = readStoredReport(selectedKey);
    if (!reportDataStr) return;

    clearForm();
    try {
        const reportData = JSON.parse(reportDataStr);
        updateLastSavedStatus(reportData.timestamp);

        if (reportData.static) {
            for (const [id, value] of Object.entries(reportData.static)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') {
                        el.checked = value;
                        el.dispatchEvent(new Event('change'));
                    } else {
                        el.value = value;
                    }
                    if (id.startsWith('desc-img-') && id.endsWith('-base64') && value) {
                        const index = id.split('-')[2]; 
                        const previewEl = document.getElementById(`desc-img-${index}-preview`);
                        const clearBtn = document.getElementById(`desc-img-${index}-clear`);
                        if (previewEl && clearBtn) {
                            previewEl.src = value;
                            previewEl.style.display = 'block';
                            clearBtn.style.display = 'inline-block';
                        }
                    }
                }
            }
        }

        if (reportData.cards && Array.isArray(reportData.cards) && reportData.cards.length > 0) {
            const container = document.getElementById('cards-container');
            if (container) {
                container.innerHTML = '';
                reportData.cards.forEach(cData => {
                    addCard();
                    const cards = container.querySelectorAll('.essai-card');
                    const card = cards[cards.length - 1];
                    card.querySelectorAll('.card-input').forEach(inp => {
                        const key = inp.dataset.pdfPattern || inp.className;
                        if (cData[key] !== undefined) {
                            if (inp.type === 'checkbox') inp.checked = cData[key];
                            else inp.value = cData[key];
                        }
                    });
                });
                collapseAllCards();
            }
        }

        if (reportData.tasks && Array.isArray(reportData.tasks) && reportData.tasks.length > 0) {
            const tasksContainer = document.getElementById('tasks-container');
            if (tasksContainer) {
                tasksContainer.innerHTML = '';
                reportData.tasks.forEach(tData => addTask(tData));
            }
        }

        runCustomCalculations();
        currentActiveReportKey = selectedKey;
        dropdown.value = selectedKey;
        showToast("Rapport chargé avec succès.", "success");
    } catch (error) {
        showToast("Erreur lors du chargement.", "error");
    }
}

let deleteArmed = false;
let deleteTimeout = null;

function deleteReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const targetKey = currentActiveReportKey || (dropdown ? dropdown.value : null);
    if (!targetKey) return showToast("Sélectionnez un rapport à supprimer.", "info");

    const deleteBtn = document.querySelector('button[onclick="deleteReport()"]');
    if (!deleteArmed) {
        deleteArmed = true;
        if (deleteBtn) { deleteBtn.textContent = "⚠️ Confirmer ?"; deleteBtn.style.background = "#b91c1c"; }
        deleteTimeout = setTimeout(() => {
            deleteArmed = false;
            if (deleteBtn) { deleteBtn.textContent = "🗑️ Supprimer"; deleteBtn.style.background = "#ef4444"; }
        }, 4000);
        return; 
    }
    clearTimeout(deleteTimeout);
    deleteArmed = false;
    if (deleteBtn) { deleteBtn.textContent = "🗑️ Supprimer"; deleteBtn.style.background = "#ef4444"; }

    localStorage.removeItem(targetKey); 
    currentActiveReportKey = null; 
    clearForm(); 
    updateDropdown(); 
    showToast("Rapport supprimé avec succès.", "success");
}

// ========================================== //
// CHAMPS MULTI-LIGNES PDF (xxx-# -> xxx-1, xxx-2...) //
// ========================================== //
// Un seul champ dans le formulaire ; à l'export, le texte est coupé aux mots (et à chaque retour à la ligne) pour
// remplir les lignes du PDF dans l'ordre. Largeur de chaque ligne = largeur du champ PDF, mesurée avec la police du
// PDF ; limites en caractères si le dictionnaire en donne (Max Car. = 60,80). Un mot plus long qu'une ligne est coupé ;
// s'il n'y a plus de lignes, la suite va sur la dernière.
function multilineTargets(form, pattern) {
    const fields = [];
    for (let i = 1; i <= 50; i++) {
        let field = null;
        try { field = form.getTextField(pattern.replace('#', i)); } catch (e) { break; }
        fields.push(field);
    }
    return fields;
}

function fieldTextSize(field) {
    const m = (field.acroField.getDefaultAppearance() || '').match(/([\d.]+)\s+Tf/);
    const size = m ? parseFloat(m[1]) : 0;
    if (size > 0) return size;
    const r = field.acroField.getWidgets()[0].getRectangle();  // taille automatique : d'après la hauteur de la ligne
    return Math.max(6, Math.min(12, r.height * 0.7));
}

function splitIntoLines(text, count, fits) {
    const lines = [];
    let cur = '';
    const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    paragraphs.forEach((para, pi) => {
        para.split(/\s+/).filter(Boolean).forEach(word => {
            const candidate = cur ? `${cur} ${word}` : word;
            if (lines.length >= count - 1 || fits(lines.length, candidate)) {
                cur = candidate;
                return;
            }
            if (cur) {
                lines.push(cur);
                cur = '';
            }
            while (lines.length < count - 1 && !fits(lines.length, word)) {  // mot plus long qu'une ligne : coupé
                let k = word.length - 1;
                while (k > 1 && !fits(lines.length, word.slice(0, k))) k--;
                lines.push(word.slice(0, k));
                word = word.slice(k);
            }
            cur = word;
        });
        if (pi < paragraphs.length - 1 && lines.length < count - 1) {  // retour à la ligne voulu
            lines.push(cur);
            cur = '';
        }
    });
    lines.push(cur);
    return lines;
}

function fillMultilineFields(form, font) {
    document.querySelectorAll('[data-pdf-multiline]').forEach(el => {
        const fields = multilineTargets(form, el.dataset.pdfMultiline);
        if (!fields.length) return;
        const limits = (el.dataset.lineLimits || '').split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        const count = limits.length ? Math.min(limits.length, fields.length) : fields.length;
        const fits = limits.length
            ? (i, s) => s.length <= limits[i]
            : (i, s) => font.widthOfTextAtSize(s, fieldTextSize(fields[i])) <= fields[i].acroField.getWidgets()[0].getRectangle().width - 4;
        splitIntoLines(el.value, count, fits).forEach((line, i) => {
            try { fields[i].setText(line); } catch (e) {}
        });
    });
}

// ========================================== //
// MOTEUR D'EXPORT PDF (ANDROID & WEB)        //
// ========================================== //

async function exportToPDF() {

    if (typeof TEMPLATE_FOND_EXCAV === 'undefined') {
        return showToast("Modèle PDF TEMPLATE_FOND_EXCAV introuvable dans tpl_fond-excav.js.", "error");
    }
    try {
        const btn = document.getElementById('btn-export-pdf');
        const originalText = btn ? btn.textContent : "📄 PDF";
        if (btn) { btn.textContent = "⏳ Génération en cours..."; btn.disabled = true; }

        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        const mergedPdf = await PDFLib.PDFDocument.create();
        mergedPdf.registerFontkit(fontkit);
        const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_FOND_EXCAV));
        subDoc.registerFontkit(fontkit);
        const form = subDoc.getForm();

        // Police des champs (Tahoma si disponible, sinon Helvetica) : mesure des lignes multi-lignes, puis apparence des champs
        let pdfFont = null;
        if (typeof TAHOMA_FONT !== 'undefined') {
            try { pdfFont = await subDoc.embedFont(new Uint8Array(getBuffer(TAHOMA_FONT))); } catch (e) {}
        }
        const measureFont = pdfFont || await subDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        // 1. Mappage automatique des champs statiques par ID
        form.getFields().forEach(field => {
            const pdfName = field.getName();
            const el = document.getElementById(pdfName);
            if (el) {
                let val = el.type === 'checkbox' ? el.checked : el.value;
                if (val !== null && val !== undefined && val !== '') {
                    try {
                        if (el.type === 'checkbox') {
                            val ? field.check() : field.uncheck();
                        } else {
                            let finalStr = val.toString();
                            const lowerName = pdfName.toLowerCase();
                            const isProjectNumber = lowerName.includes('projet') || lowerName.includes('no-') || lowerName.includes('numero');
                            if (!isProjectNumber) finalStr = finalStr.replace(/(\d)\.(\d)/g, '$1,$2');
                            field.setText(finalStr);
                        }
                    } catch (e) {}
                }
            }
        });

        // 2. Mappage automatique des cartes (# et matrices #-#)
        // Multi-lignes PDF (ex. global-client-# -> global-client-1, global-client-2) : un seul champ dans le formulaire,
        // texte réparti aux mots (et à chaque retour à la ligne) sur les lignes du PDF, selon la largeur de chacune
        fillMultilineFields(form, measureFont);

        document.querySelectorAll('.essai-card').forEach((card, idx) => {
            const rowNum = idx + 1;
            card.querySelectorAll('.card-input').forEach(inp => {
                const pattern = inp.dataset.pdfPattern;
                if (!pattern || !inp.value) return;
                const pdfFieldName = pattern.replace('#', rowNum);
                try {
                    let valStr = inp.value.toString().replace(/(\d)\.(\d)/g, '$1,$2');
                    form.getTextField(pdfFieldName).setText(valStr);
                } catch (e) {}
            });
        });

        if (pdfFont) {
            try {
                form.updateFieldAppearances(pdfFont);
                if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch (e) {}
        }

        form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg1'); } catch(e){} });

        const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));

        const noProjetVal = document.getElementById('global-no-projet')?.value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date')?.value || new Date().toISOString().split('T')[0];
        const techNameVal = document.getElementById('sig-prep-nom')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const fileName = `Fond-excav_${noProjetVal}_${rawDateVal}_${initialsVal}.pdf`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const pdfBase64 = await mergedPdf.saveAsBase64();
            const { Filesystem, FileOpener } = window.Capacitor.Plugins;
            const resultat = await Filesystem.writeFile({
                path: fileName,
                data: pdfBase64,
                directory: 'CACHE',
                recursive: true
            });
            await FileOpener.open({ filePath: resultat.uri, contentType: 'application/pdf' });
        } else {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        }

        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    } catch (error) {
        console.error("Erreur lors de l'export PDF :", error);
        showToast("Erreur lors de l'export PDF.", "error");
        const btn = document.getElementById('btn-export-pdf');
        if (btn) { btn.textContent = "📄 PDF"; btn.disabled = false; }
    }
}

/* __SFGEN_SCHEMA_START__
   Projet SFGEN de cette app (dictionnaire, onglets, options). Relu par « Charger dossier d'app existant ».
   Ne pas modifier à la main : SFGEN le réécrit à chaque génération.
{
 "meta": {
  "title": "Fond d'excavation",
  "short": "Fond d'excavation",
  "slug": "fond-excav",
  "prefix": "FEXC",
  "doc_num": "EQ-09-GE-02",
  "desc": "Vérification du fond d'excavation",
  "version": "v0.5.0.0",
  "logo": "logo_fond-excav.png",
  "pdf_path": "template_fond-excav.pdf",
  "output_mode": "hub",
  "hub_org": "ENG",
  "hub_sector": "ICI",
  "hub_service": "GEO",
  "app_folder": ""
 },
 "active_tabs": [
  "Vérifications",
  "Actions à prendre"
 ],
 "single_page": false,
 "dictionary": [
  {
   "ID Champ": "global-client",
   "Label": "Client",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Pleine largeur",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-no-projet",
   "Label": "N° projet",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Pleine largeur",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-adresse",
   "Label": "Adresse du projet",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-entr-gen",
   "Label": "Entrepreneur général",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-entr-exc",
   "Label": "Entrepreneur excavation",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-type-ouvrage",
   "Label": "Type d'ouvrage",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-partie-inspecte",
   "Label": "Partie inspectée",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-dim-exc",
   "Label": "Dimensions de l'excavation",
   "Section": "Informations générales",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "global-date",
   "Label": "Date",
   "Section": "Informations générales",
   "Type": "Date",
   "Disposition": "Pleine largeur",
   "Décimales": "Aucune",
   "Max Car.": "N/A",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-text-#",
   "Label": "Description",
   "Section": "Description des matériaux",
   "Type": "Texte",
   "Disposition": "Pleine largeur",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Multi-lignes PDF (ex: 50,100)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-granulaire",
   "Label": "Granulaire",
   "Section": "Description des matériaux",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-remblai",
   "Label": "Remblai",
   "Section": "Description des matériaux",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-argileux",
   "Label": "Argileux",
   "Section": "Description des matériaux",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-roc",
   "Label": "Roc",
   "Section": "Description des matériaux",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-organique",
   "Label": "Organique",
   "Section": "Description des matériaux",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-comp-tlache",
   "Label": "Très lâche",
   "Section": "Description des matériaux > COMP",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-comp-lache",
   "Label": "Lâche",
   "Section": "Description des matériaux > COMP",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-comp-compacte",
   "Label": "Compacte",
   "Section": "Description des matériaux > COMP",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-comp-dense",
   "Label": "Dense",
   "Section": "Description des matériaux > COMP",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-comp-tdense",
   "Label": "Très dense",
   "Section": "Description des matériaux > COMP",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-cons-tmolle",
   "Label": "Très molle",
   "Section": "Description des matériaux > CONS",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-cons-molle",
   "Label": "Molle",
   "Section": "Description des matériaux > CONS",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-cons-ferme",
   "Label": "Ferme",
   "Section": "Description des matériaux > CONS",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-cons-raide",
   "Label": "Raide",
   "Section": "Description des matériaux > CONS",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "desc-cons-traide",
   "Label": "Très raide",
   "Section": "Description des matériaux > CONS",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-pas-eau",
   "Label": "Pas d'eau",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-sp",
   "Label": "Suintement provenant",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-sp-fond",
   "Label": "du fond",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-sp-parois",
   "Label": "des parois",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-arriv",
   "Label": "Arrivée d'eau",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "N/A",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-arriv-eau-faible",
   "Label": "Faible",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-arriv-eau-moy",
   "Label": "Moyenne",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-arriv-eau-forte",
   "Label": "Forte",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-arriv-prov-fond",
   "Label": "provenant du fond",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "N/A",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "cond-arriv-prov-parois",
   "Label": "provenant des parois",
   "Section": "Conditions d'eau",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "N/A",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "comp-pas-etude",
   "Label": "Pas d'étude",
   "Section": "Comparaisons avec l'étude géotechnique",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "comp-nat-semblable",
   "Label": "semblable",
   "Section": "Comparaisons avec l'étude géotechnique > NAT",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "comp-nat-differente",
   "Label": "différente",
   "Section": "Comparaisons avec l'étude géotechnique > NAT",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "comp-cond-semblable",
   "Label": "semblables",
   "Section": "Comparaisons avec l'étude géotechnique > COND",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "comp-cond-differente",
   "Label": "différentes",
   "Section": "Comparaisons avec l'étude géotechnique > COND",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-fe-uni-1-hor",
   "Label": "horizontal",
   "Section": "État du fond d'excavation > FE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-fe-uni-1-inc",
   "Label": "incliné",
   "Section": "État du fond d'excavation > FE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-fe-uni-2-uni",
   "Label": "uni",
   "Section": "État du fond d'excavation > FE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-fe-uni-2-irr",
   "Label": "irrégulier",
   "Section": "État du fond d'excavation > FE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-fe-stab-stab",
   "Label": "stable",
   "Section": "État du fond d'excavation > FE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-fe-stab-instab",
   "Label": "instable",
   "Section": "État du fond d'excavation > FE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-pe-uni-uni",
   "Label": "unies",
   "Section": "État des parois d'excavation > PE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-pe-uni-irr",
   "Label": "irrégulières",
   "Section": "État des parois d'excavation > PE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-pe-stab-stab",
   "Label": "stables",
   "Section": "État des parois d'excavation > PE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-pe-stab-instab",
   "Label": "instables",
   "Section": "État des parois d'excavation > PE",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-pente-h",
   "Label": "Horizontale",
   "Section": "État des parois d'excavation > PENTE",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "etat-pente-v",
   "Label": "Verticale",
   "Section": "État des parois d'excavation > PENTE",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-aucune",
   "Label": "Aucune action, fond adéquat et acceptable",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-assecher",
   "Label": "Assécher l'excavation",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-profiler",
   "Label": "Profiler la surface (faire des pentes) pour favoriser le drainage",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-regaler",
   "Label": "Régaler la surface",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-compacter",
   "Label": "Compacter les matériaux",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-trans",
   "Label": "Faire des transitions entre les matériaux de nature nature différente de :",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-trans-hor",
   "Label": "Horizontale (m)",
   "Section": "Actions à prendre",
   "Type": "Chiffre",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-trans-vert",
   "Label": "Verticale (m)",
   "Section": "Actions à prendre",
   "Type": "Chiffre",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-excav",
   "Label": "Excaver :",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-excav-mous",
   "Label": "Sols mous",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-excav-vaseux",
   "Label": "Sols vaseux",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-excav-instable",
   "Label": "Sols instables",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-excav-terre",
   "Label": "Terre végétale",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-remp",
   "Label": "Remplacer les sols excavées avec",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-remp-txt",
   "Label": "-",
   "Section": "Actions à prendre",
   "Type": "Texte",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-remp-comp",
   "Label": "Compacté à au moins (%)",
   "Section": "Actions à prendre",
   "Type": "Pourcentage",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "1 déc. (0.1)",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-remp-proc",
   "Label": "Protocole modifié par couche de (mm)",
   "Section": "Actions à prendre",
   "Type": "Chiffre",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Entier (1)",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "ech-prelev-oui",
   "Label": "Oui",
   "Section": "Échantillons prélevés > PRELEV",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "ech-prelev-non",
   "Label": "Non",
   "Section": "Échantillons prélevés > PRELEV",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "photos-oui",
   "Label": "Oui",
   "Section": "Photos",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "photos-non",
   "Label": "Non",
   "Section": "Photos",
   "Type": "Case à cocher",
   "Disposition": "Case standard",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "rem-text-#",
   "Label": "Remarques",
   "Section": "Remarques",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Multi-lignes PDF (ex: 50,100)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "sig-prep-nom",
   "Label": "Sig prep nom",
   "Section": "Signature",
   "Type": "Texte",
   "Disposition": "Normal (1/2 larg.)",
   "Décimales": "Aucune",
   "Max Car.": "",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-excav-autres",
   "Label": "Autres",
   "Section": "Actions à prendre",
   "Type": "Case à cocher",
   "Disposition": "Sous-élément Niv. 1",
   "Décimales": "Aucune",
   "Max Car.": "N/A",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  },
  {
   "ID Champ": "act-excav-autres-text",
   "Label": "Autres",
   "Section": "Actions à prendre",
   "Type": "Texte",
   "Disposition": "Sous-élément Niv. 2",
   "Décimales": "Aucune",
   "Max Car.": "N/A",
   "Mode Rép.": "Statique (1 champ)",
   "Variante": "Commun",
   "Liste": ""
  }
 ],
 "routing": {
  "Description des matériaux": {
   "tab": "Vérifications",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "Conditions d'eau": {
   "tab": "Vérifications",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "Comparaisons avec l'étude géotechnique": {
   "tab": "Vérifications",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "État du fond d'excavation": {
   "tab": "Vérifications",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "État des parois d'excavation": {
   "tab": "Vérifications",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "Actions à prendre": {
   "tab": "Actions à prendre",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "Échantillons prélevés": {
   "tab": "Actions à prendre",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "Photos": {
   "tab": "Actions à prendre",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  },
  "Remarques": {
   "tab": "Actions à prendre",
   "badge": "Aucun bouton",
   "rem": false,
   "show_title": true
  }
 },
 "sub_routing": {
  "Description des matériaux > COMP": {
   "show": true,
   "title": "Compacité (Granulaire)"
  },
  "Description des matériaux > CONS": {
   "show": true,
   "title": "Consistance (Argileuse)"
  },
  "Comparaisons avec l'étude géotechnique > NAT": {
   "show": false,
   "title": "NAT"
  },
  "Comparaisons avec l'étude géotechnique > COND": {
   "show": false,
   "title": "COND"
  },
  "État du fond d'excavation > FE": {
   "show": false,
   "title": "FE"
  },
  "État des parois d'excavation > PE": {
   "show": false,
   "title": "PE"
  },
  "État des parois d'excavation > PENTE": {
   "show": true,
   "title": "PENTE"
  },
  "Échantillons prélevés > PRELEV": {
   "show": false,
   "title": "PRELEV"
  }
 },
 "card_mode": "Auto (Selon présence de # dans le dictionnaire)",
 "fixed_card_count": "3",
 "cards_enabled": false,
 "cards_title": "Tableau des Essais",
 "hybrid": false,
 "variants": [
  {
   "key": "eng",
   "pdf_path": "template_fond-excav.pdf"
  }
 ],
 "lists": {},
 "features": {
  "feat_dup_card": false,
  "feat_pagination": false,
  "feat_letter_rem": false,
  "feat_abbrev_legend": false,
  "feat_warn_banners": false,
  "feat_tasks": false,
  "feat_text_split": true,
  "feat_photos": false,
  "feat_detailed_photos": false,
  "feat_chartjs": false,
  "feat_sig_block": true,
  "feat_sig_resp": false,
  "feat_update_hub": true
 },
 "croquis_addon": true,
 "photo_addon": true,
 "photo_block": {
  "enabled": true,
  "section": "Photos",
  "trigger": "photos-oui"
 },
 "sfgen_schema": 1
}
__SFGEN_SCHEMA_END__ */
