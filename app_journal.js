// ========================================== //
// 1. NAVIGATION ET INTERFACE GLOBALE         //
// ========================================== //

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.getElementById('main-logo');
    if (logoEl && typeof LOGO_BASE64 !== 'undefined') {
        logoEl.src = LOGO_BASE64;
        logoEl.style.display = 'block';
    }
    
    // NOUVEAU : Lecture de l'interrupteur global du Hub
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    updateDropdown();
    
    // Initialise avec une première carte de tâche vide
    if (document.getElementById('tasks-container') && document.getElementById('tasks-container').children.length === 0) {
        addTask();
    }
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
    const allTabs = document.querySelectorAll('.tab-section');
    allTabs.forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';

    const allButtons = document.querySelectorAll('.tab-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// ========================================== //
// 2. GESTION DES TÂCHES (CARTES DYNAMIQUES)  //
// ========================================== //

function addTask(data = null) {
    const container = document.getElementById('tasks-container');
    const template = document.getElementById('task-template');
    if (!container || !template) return;

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.task-card');
    const descArea = card.querySelector('.task-desc');
    
    // Remplissage si on charge une sauvegarde
    if (data) {
        card.querySelector('.task-start').value = data.start || '';
        card.querySelector('.task-end').value = data.end || '';
        descArea.value = data.desc || '';
    }
    
    // Ajustement dynamique de la hauteur lors de la frappe
    descArea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight + 2) + 'px';
    });
    
    // 1. On insère d'abord la carte dans la page (sinon la hauteur est 0)
    container.appendChild(clone);
    
    // 2. Ensuite, on ajuste la hauteur avec un petit délai de 50ms
    if (data && data.desc) {
        setTimeout(() => {
            descArea.style.height = 'auto';
            descArea.style.height = (descArea.scrollHeight + 2) + 'px';
        }, 50);
    }
    
    updateTaskNumbers();
    calculateTotalHours();
    if (data) updateTaskSummary(card.querySelector('.task-start')); 
}

// --- NOUVEAU : Logique de l'accordéon ---
function toggleTask(headerEl) {
    const body = headerEl.nextElementSibling;
    const icon = headerEl.querySelector('.accordion-icon');
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
    } else {
        body.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
    }
}

function updateTaskSummary(inputEl) {
    const card = inputEl.closest('.task-card');
    const start = card.querySelector('.task-start').value;
    const end = card.querySelector('.task-end').value;
    const summary = card.querySelector('.task-summary');
    
    if (start || end) {
        summary.textContent = `(${start || '?'} à ${end || '?'})`;
    } else {
        summary.textContent = '';
    }
}

// --- MISE À JOUR : removeTask (ajout du "event") ---
function removeTask(btn, event) {
    if (event) event.stopPropagation(); // Empêche l'accordéon de cliquer en même temps
    const card = btn.closest('.task-card');
    if (card) {
        card.remove();
        updateTaskNumbers();
        calculateTotalHours();
    }
}
function updateTaskNumbers() {
    const cards = document.querySelectorAll('.task-card');
    cards.forEach((card, index) => {
        card.querySelector('.task-number').textContent = index + 1;
    });
}

function calculateTotalHours() {
    const cards = document.querySelectorAll('.task-card');
    let grandTotal = 0;
    
    cards.forEach(card => {
        const start = card.querySelector('.task-start').value;
        const end = card.querySelector('.task-end').value;
        const durationInput = card.querySelector('.task-duration');
        
        if (start && end) {
            const startTime = new Date(`1970-01-01T${start}:00`);
            let endTime = new Date(`1970-01-01T${end}:00`);
            
            if (endTime < startTime) endTime.setDate(endTime.getDate() + 1); // Gère les quarts de nuit
            
            const diffMs = endTime - startTime;
            const diffHrs = diffMs / (1000 * 60 * 60);
            
            durationInput.value = diffHrs.toFixed(2) + ' h';
            grandTotal += diffHrs;
        } else {
            durationInput.value = '';
        }
    });
    
    const displayEl = document.getElementById('total-heures-display');
    const hiddenEl = document.getElementById('total-heures');
    
    if (displayEl) displayEl.textContent = grandTotal.toFixed(2);
    if (hiddenEl) hiddenEl.value = grandTotal.toFixed(2);
}

// ========================================== //
// 3. GESTION DES IMAGES (COMPRESSION)        //
// ========================================== //

function encodeImage(input, index) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; 
                let scaleSize = 1;
                
                if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
                
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
                document.getElementById(`desc-img-${index}-base64`).value = dataUrl;
                
                const previewEl = document.getElementById(`desc-img-${index}-preview`);
                previewEl.src = dataUrl;
                previewEl.style.display = 'block';
                document.getElementById(`desc-img-${index}-clear`).style.display = 'inline-block';

                showToast("Image ajoutée et compressée avec succès.", "success");
            }
        };
        reader.readAsDataURL(file);
    }
}

function clearImage(index) {
    document.getElementById(`desc-img-${index}-base64`).value = "";
    document.getElementById(`desc-img-${index}`).value = ""; 
    const previewEl = document.getElementById(`desc-img-${index}-preview`);
    if(previewEl) {
        previewEl.src = "";
        previewEl.style.display = 'none';
    }
    const clearBtn = document.getElementById(`desc-img-${index}-clear`);
    if (clearBtn) clearBtn.style.display = 'none';
}

// ========================================== //
// 4. MOTEUR DE SAUVEGARDE (LOCALSTORAGE)     //
// ========================================== //

let currentActiveReportKey = null;

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
        if (key && key.startsWith('JRNL_')) {
            try {
                const dataStr = localStorage.getItem(key);
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    if (data && data.displayName) {
                        const displayName = data.displayName.replace('englobe_', '').replace(/_/g, ' ');
                        savedReports.push({ key: key, display: displayName });
                    }
                }
            } catch (e) {}
        }
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
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return; 
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
        else if (el.id && !el.id.startsWith('desc-img-')) el.value = ''; // Ne vide pas les previews ici
    });

    for (let i = 1; i <= 4; i++) {
        if (typeof clearImage === 'function') clearImage(`0${i}`);
    }
    
    // Nettoie et réinitialise les tâches
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
        tasksContainer.innerHTML = '';
        addTask();
    }
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
    showToast("Écran réinitialisé. Vous pouvez commencer un nouveau rapport.", "success");
}

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const selectedKey = dropdown.value;

    if (!selectedKey) {
        showToast("Veuillez d'abord sélectionner un rapport sauvegardé.", "info");
        return;
    }

    const reportDataStr = localStorage.getItem(selectedKey);
    if (!reportDataStr) return;

    clearForm();
    try {
        const reportData = JSON.parse(reportDataStr);
        updateLastSavedStatus(reportData.timestamp);

        // 1. Charge les champs statiques
        if (reportData.static) {
            for (const [id, value] of Object.entries(reportData.static)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') el.checked = value;
                    else el.value = value;
                    
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
        
        // 2. Charge les tâches dynamiques
        const tasksContainer = document.getElementById('tasks-container');
        if (tasksContainer) tasksContainer.innerHTML = ''; // Vide la tâche vide par défaut
        
        if (reportData.tasks && reportData.tasks.length > 0) {
            // C'est une sauvegarde récente
            reportData.tasks.forEach(taskData => addTask(taskData));
        } else if (reportData.static) {
            // RÉTROCOMPATIBILITÉ : Convertit les anciennes lignes en cartes dynamiques
            let foundLegacyTasks = false;
            for (let i = 1; i <= 46; i++) {
                let sVal = reportData.static[`heure_deb_${i}`] || '';
                let eVal = reportData.static[`heure_fin_${i}`] || '';
                let tVal = reportData.static[`text_box_${i}`] || '';
                if (sVal || eVal || tVal) {
                    foundLegacyTasks = true;
                    addTask({ start: sVal, end: eVal, desc: tVal });
                }
            }
            if (!foundLegacyTasks) addTask();
        } else {
            addTask();
        }

        currentActiveReportKey = selectedKey; 
        dropdown.value = selectedKey;
        showToast("Rapport chargé avec succès.", "success");
    } catch (error) {
        showToast("Erreur lors du chargement.", "error");
    }
}

function saveReport(isDuplicate = false) {
    let saveKey = currentActiveReportKey;

    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const techName = document.getElementById('sig-prep-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `englobe_${rawDate}_${noProjet}_JOURNAL_${techInitials}`;

    // L'AJOUT EST ICI : On ajoute "_copie" si c'est une duplication
    if (isDuplicate) {
        baseName += "_copie";
    }

    if (!saveKey || isDuplicate) {
        const promptMsg = isDuplicate ? "Nom pour la COPIE :" : "Nom de sauvegarde du rapport :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        saveKey = 'JRNL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown' || el.type === 'file') return; 
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    // Sauvegarde les tâches dynamiques
    const tasksData = [];
    document.querySelectorAll('.task-card').forEach(card => {
        tasksData.push({
            start: card.querySelector('.task-start').value,
            end: card.querySelector('.task-end').value,
            desc: card.querySelector('.task-desc').value
        });
    });

    const reportData = {
        displayName: baseName, 
        static: staticData,
        tasks: tasksData,
        timestamp: new Date().getTime()
    };

    localStorage.setItem(saveKey, JSON.stringify(reportData));
    currentActiveReportKey = saveKey; 
    updateLastSavedStatus(reportData.timestamp);
    updateDropdown();
    
    document.getElementById('saved-reports-dropdown').value = saveKey;
    showToast(isDuplicate ? "Copie sauvegardée avec succès." : "Rapport sauvegardé avec succès.", "success");
}

let deleteArmed = false;
let deleteTimeout = null;

function deleteReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const targetKey = currentActiveReportKey || (dropdown ? dropdown.value : null);

    if (!targetKey) {
        showToast("Veuillez sélectionner un rapport sauvegardé dans la liste.", "info");
        return;
    }

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
    showToast(`Le rapport a été supprimé avec succès.`, "success");
    currentActiveReportKey = null; 
    clearForm(); 
    updateDropdown(); 
}

// ========================================== //
// X. MOTEUR DE DÉCOUPAGE TEXTUEL (PHASE 3)   //
// ========================================== //

// 1. Coupe un long texte en morceaux de X caractères sans casser les mots
function splitTextIntelligently(text, maxChars = 92) {
    if (!text) return [];
    const lines = text.split('\n'); // Respecte les retours à la ligne faits par le technicien
    const result = [];
    
    for (let line of lines) {
        if (line.trim() === '') {
            result.push('');
            continue;
        }
        let currentChunk = '';
        const words = line.split(' ');
        
        for (let word of words) {
            // Si l'ajout du mot dépasse la limite
            if ((currentChunk + word).length > maxChars) {
                if (currentChunk.trim() !== '') {
                    result.push(currentChunk.trim());
                    currentChunk = word + ' ';
                } else {
                    // Sécurité extrême : un seul mot fait plus de 92 caractères (ex: lien web)
                    result.push(word.substring(0, maxChars));
                    currentChunk = word.substring(maxChars) + ' ';
                }
            } else {
                currentChunk += word + ' ';
            }
        }
        if (currentChunk.trim() !== '') {
            result.push(currentChunk.trim());
        }
    }
    return result;
}

// 2. Lit les cartes et construit le tableau exact des lignes à imprimer
function buildPrintableRows() {
    const maxChars = 120; // Limite de caractères par ligne pour le PDF
    const printableRows = [];
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach((card, index) => {
        const start = card.querySelector('.task-start').value;
        const end = card.querySelector('.task-end').value;
        const desc = card.querySelector('.task-desc').value.trim();
        
        if (!start && !end && !desc) return; // Ignore les cartes 100% vides
        
        const chunks = splitTextIntelligently(desc, maxChars);
        
        if (chunks.length === 0) {
            // Tâche avec seulement des heures mais sans texte
            printableRows.push({ deb: start, fin: end, text: "" });
        } else {
            // Ligne 1 : Heures + Premier bout de texte
            printableRows.push({ deb: start, fin: end, text: chunks[0] });
            
            // Lignes suivantes : Pas d'heures + Reste du texte
            for (let i = 1; i < chunks.length; i++) {
                printableRows.push({ deb: "", fin: "", text: chunks[i] });
            }
        }
        
        // Espacement : Ajoute une ligne vide à la fin de la tâche, sauf si c'est la toute dernière
        if (index < taskCards.length - 1) {
            printableRows.push({ deb: "", fin: "", text: "" });
        }
    });
    
    return printableRows; // Renvoie un tableau prêt à être injecté dans le PDF
}

// ========================================== //
// 5. MOTEUR D'EXPORT PDF (Phase 4 : Final)   //
// ========================================== //
async function exportToPDF() {
    if (typeof TEMPLATE_JOURNAL_F1 === 'undefined' || typeof TEMPLATE_JOURNAL_F2 === 'undefined' || typeof TEMPLATE_JOURNAL_F3 === 'undefined') {
        showToast("Erreur: Les modèles F1, F2 ou F3 sont introuvables.", "error");
        return;
    }

    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) { btn.textContent = "⏳ Génération en cours..."; btn.disabled = true; }

        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };
        
        const printableRows = typeof buildPrintableRows === 'function' ? buildPrintableRows() : [];
        
        const needsF2 = printableRows.length > 15;
        const hasImg1or2 = document.getElementById('desc-img-01-base64')?.value || document.getElementById('desc-img-02-base64')?.value;
        const hasImg3or4 = document.getElementById('desc-img-03-base64')?.value || document.getElementById('desc-img-04-base64')?.value;
        const needsF3 = hasImg1or2 || hasImg3or4;
        
        let totalPages = 1; 
        if (needsF2) totalPages++;
        if (needsF3) {
            if (hasImg1or2) totalPages++;
            if (hasImg3or4) totalPages++; 
        }

        const mergedPdf = await PDFLib.PDFDocument.create();
        let currentPage = 1;

        const fillGlobalFields = (form) => {
            const allInputs = document.querySelectorAll('input[id], textarea[id], select[id]');
            allInputs.forEach(el => {
                const name = el.id;
                try {
                    if (el.type === 'checkbox') {
                        el.checked ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck();
                    } else if (el.type !== 'file' && (el.type !== 'hidden' || el.id === 'total-heures')) {
                        form.getTextField(name).setText(el.value || "");
                    }
                } catch (e) {} 
            });
        };

        // =====================================
        // TRAITEMENT DE F1
        // =====================================
        const f1Doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F1));
        const formF1 = f1Doc.getForm();
        fillGlobalFields(formF1);
        
        for (let i = 0; i < 15; i++) {
            if (printableRows[i]) {
                try { formF1.getTextField(`heure_deb_${i+1}`).setText(printableRows[i].deb || ""); } catch(e){}
                try { formF1.getTextField(`heure_fin_${i+1}`).setText(printableRows[i].fin || ""); } catch(e){}
                try { formF1.getTextField(`text_box_${i+1}`).setText(printableRows[i].text || ""); } catch(e){}
            }
        }
        
        try { formF1.getTextField('f1-page-number').setText(currentPage.toString()); } catch(e){}
        
        try {
            const fontF1 = await f1Doc.embedFont(PDFLib.StandardFonts.Helvetica);
            formF1.updateFieldAppearances(fontF1);
        } catch(e) {}

        // FIX: Dynamic field renaming for Foxit/PDF-XChange compatibility
        formF1.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + currentPage); } catch(e){} });

        const f1Pages = await mergedPdf.copyPages(f1Doc, [0]);
        mergedPdf.addPage(f1Pages[0]);
        currentPage++;

        // =====================================
        // TRAITEMENT DE F2
        // =====================================
        if (needsF2) {
            const f2Doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F2));
            const formF2 = f2Doc.getForm();
            fillGlobalFields(formF2);
            
            for (let i = 15; i < 46; i++) {
                if (printableRows[i]) {
                    try { formF2.getTextField(`heure_deb_${i+1}`).setText(printableRows[i].deb || ""); } catch(e){}
                    try { formF2.getTextField(`heure_fin_${i+1}`).setText(printableRows[i].fin || ""); } catch(e){}
                    try { formF2.getTextField(`text_box_${i+1}`).setText(printableRows[i].text || ""); } catch(e){}
                }
            }
            
            try { formF2.getTextField('f2-page-number').setText(currentPage.toString()); } catch(e){}
            
            try {
                const fontF2 = await f2Doc.embedFont(PDFLib.StandardFonts.Helvetica);
                formF2.updateFieldAppearances(fontF2);
            } catch(e) {}

            // FIX: Dynamic field renaming
            formF2.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + currentPage); } catch(e){} });

            const f2Pages = await mergedPdf.copyPages(f2Doc, [0]);
            mergedPdf.addPage(f2Pages[0]);
            currentPage++;
        }

        // =====================================
        // TRAITEMENT DE F3 (Photos)
        // =====================================
        if (needsF3) {
            const injectPhotosToDoc = async (imgA, imgB, textA, textB, pageNum) => {
                const f3Doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F3));
                const formF3 = f3Doc.getForm();
                const f3PagesArr = f3Doc.getPages();
                
                fillGlobalFields(formF3);
                
                try { formF3.getTextField('f3-page-number').setText(pageNum.toString()); } catch(e){}
                try { formF3.getTextField('desc-text-01').setText(document.getElementById(textA)?.value || ""); } catch(e){}
                try { formF3.getTextField('desc-text-02').setText(document.getElementById(textB)?.value || ""); } catch(e){}

                try {
                    const fontF3 = await f3Doc.embedFont(PDFLib.StandardFonts.Helvetica);
                    formF3.updateFieldAppearances(fontF3);
                } catch(e) {}

                const drawImg = async (inputId, pdfFieldId) => {
                    const hiddenInput = document.getElementById(inputId);
                    if (hiddenInput && hiddenInput.value) {
                        try {
                            const field = formF3.getField(pdfFieldId);
                            const widget = field.acroField.getWidgets()[0];
                            const rect = widget.getRectangle();
                            
                            const widgetPageRef = widget.dict.get(PDFLib.PDFName.of('P'));
                            let targetPage = f3PagesArr.find(p => p.ref === widgetPageRef) || f3PagesArr[0];

                            const base64String = hiddenInput.value.split(',')[1];
                            const pdfImage = await f3Doc.embedJpg(base64String);

                            const scaled = pdfImage.scaleToFit(rect.width, rect.height);
                            const centerX = rect.x + (rect.width - scaled.width) / 2;
                            const centerY = rect.y + (rect.height - scaled.height) / 2;

                            targetPage.drawImage(pdfImage, { x: centerX, y: centerY, width: scaled.width, height: scaled.height });
                        } catch (e) {}
                    }
                };

                await drawImg(imgA, 'desc-img-01');
                await drawImg(imgB, 'desc-img-02');

                // FIX: Dynamic field renaming
                formF3.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + pageNum); } catch(e){} });

                const copiedPages = await mergedPdf.copyPages(f3Doc, [0]);
                mergedPdf.addPage(copiedPages[0]);
            };

            if (hasImg1or2) {
                await injectPhotosToDoc('desc-img-01-base64', 'desc-img-02-base64', 'desc-text-01', 'desc-text-02', currentPage);
                currentPage++;
            }
            
            if (hasImg3or4) {
                await injectPhotosToDoc('desc-img-03-base64', 'desc-img-04-base64', 'desc-text-03', 'desc-text-04', currentPage);
                currentPage++;
            }
        }

        // =====================================
        // SAUVEGARDE FINALE
        // =====================================
        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const fileName = `JDC_${rawDate}_${noProjet}_${techInitials}.pdf`;

        // BIFURCATION : APPLICATION ANDROID vs WEB
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const pdfBase64 = await mergedPdf.saveAsBase64(); // Attention ici : mergedPdf
                const { Filesystem, Share } = Capacitor.Plugins;
                
                const resultat = await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: 'DOCUMENTS',
                    recursive: true
                });

                await Share.share({ title: fileName, url: resultat.uri });
            } catch (err) {
                console.error(err);
                alert("Erreur lors de l'enregistrement sur la tablette.");
            }
        } else {
            // COMPORTEMENT WEB ORIGINAL
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
            const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || isMacTouch;
            
            let attemptedShare = false;
            try {
                if (isApple && navigator.share && navigator.canShare) {
                    const file = new File([blob], fileName, { type: 'application/pdf' });
                    if (navigator.canShare({ files: [file] })) {
                        attemptedShare = true;
                        await navigator.share({ files: [file] });
                    }
                }
            } catch (err) { if (err.name !== 'AbortError') attemptedShare = false; }

            if (!attemptedShare) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            }
        }
        
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    } catch (error) {
        console.error("Erreur lors de l'export PDF :", error);
        showToast("Erreur lors de l'export PDF. Vérifiez la console.", "error");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) { btn.textContent = "📄 Exporter en PDF"; btn.disabled = false; }
    }
}

/*
async function exportToPDF() {
    if (typeof TEMPLATE_JOURNAL_F1 === 'undefined' || typeof TEMPLATE_JOURNAL_F2 === 'undefined' || typeof TEMPLATE_JOURNAL_F3 === 'undefined') {
        showToast("Erreur: Les modèles F1, F2 ou F3 sont introuvables.", "error");
        return;
    }

    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) { btn.textContent = "⏳ Génération en cours..."; btn.disabled = true; }

        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };
        
        const printableRows = typeof buildPrintableRows === 'function' ? buildPrintableRows() : [];
        
        const needsF2 = printableRows.length > 15;
        const hasImg1or2 = document.getElementById('desc-img-01-base64')?.value || document.getElementById('desc-img-02-base64')?.value;
        const hasImg3or4 = document.getElementById('desc-img-03-base64')?.value || document.getElementById('desc-img-04-base64')?.value;
        const needsF3 = hasImg1or2 || hasImg3or4;
        
        let totalPages = 1; 
        if (needsF2) totalPages++;
        if (needsF3) {
            if (hasImg1or2) totalPages++;
            if (hasImg3or4) totalPages++; 
        }

        const mergedPdf = await PDFLib.PDFDocument.create();
        let currentPage = 1;

        const fillGlobalFields = (form) => {
            const allInputs = document.querySelectorAll('input[id], textarea[id], select[id]');
            allInputs.forEach(el => {
                const name = el.id;
                try {
                    if (el.type === 'checkbox') {
                        el.checked ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck();
                    } else if (el.type !== 'file' && (el.type !== 'hidden' || el.id === 'total-heures')) {
                        form.getTextField(name).setText(el.value || "");
                    }
                } catch (e) {} 
            });
        };

        // =====================================
        // TRAITEMENT DE F1
        // =====================================
        const f1Doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F1));
        const formF1 = f1Doc.getForm();
        fillGlobalFields(formF1);
        
        for (let i = 0; i < 15; i++) {
            if (printableRows[i]) {
                try { formF1.getTextField(`heure_deb_${i+1}`).setText(printableRows[i].deb || ""); } catch(e){}
                try { formF1.getTextField(`heure_fin_${i+1}`).setText(printableRows[i].fin || ""); } catch(e){}
                try { formF1.getTextField(`text_box_${i+1}`).setText(printableRows[i].text || ""); } catch(e){}
            }
        }
        
        try { formF1.getTextField('f1-page-number').setText(currentPage.toString()); } catch(e){}
        
        try {
            const fontF1 = await f1Doc.embedFont(PDFLib.StandardFonts.Helvetica);
            formF1.updateFieldAppearances(fontF1);
        } catch(e) {}

        // FIX: Dynamic field renaming for Foxit/PDF-XChange compatibility
        formF1.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + currentPage); } catch(e){} });

        const f1Pages = await mergedPdf.copyPages(f1Doc, [0]);
        mergedPdf.addPage(f1Pages[0]);
        currentPage++;

        // =====================================
        // TRAITEMENT DE F2
        // =====================================
        if (needsF2) {
            const f2Doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F2));
            const formF2 = f2Doc.getForm();
            fillGlobalFields(formF2);
            
            for (let i = 15; i < 46; i++) {
                if (printableRows[i]) {
                    try { formF2.getTextField(`heure_deb_${i+1}`).setText(printableRows[i].deb || ""); } catch(e){}
                    try { formF2.getTextField(`heure_fin_${i+1}`).setText(printableRows[i].fin || ""); } catch(e){}
                    try { formF2.getTextField(`text_box_${i+1}`).setText(printableRows[i].text || ""); } catch(e){}
                }
            }
            
            try { formF2.getTextField('f2-page-number').setText(currentPage.toString()); } catch(e){}
            
            try {
                const fontF2 = await f2Doc.embedFont(PDFLib.StandardFonts.Helvetica);
                formF2.updateFieldAppearances(fontF2);
            } catch(e) {}

            // FIX: Dynamic field renaming
            formF2.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + currentPage); } catch(e){} });

            const f2Pages = await mergedPdf.copyPages(f2Doc, [0]);
            mergedPdf.addPage(f2Pages[0]);
            currentPage++;
        }

        // =====================================
        // TRAITEMENT DE F3 (Photos)
        // =====================================
        if (needsF3) {
            const injectPhotosToDoc = async (imgA, imgB, textA, textB, pageNum) => {
                const f3Doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F3));
                const formF3 = f3Doc.getForm();
                const f3PagesArr = f3Doc.getPages();
                
                fillGlobalFields(formF3);
                
                try { formF3.getTextField('f3-page-number').setText(pageNum.toString()); } catch(e){}
                try { formF3.getTextField('desc-text-01').setText(document.getElementById(textA)?.value || ""); } catch(e){}
                try { formF3.getTextField('desc-text-02').setText(document.getElementById(textB)?.value || ""); } catch(e){}

                try {
                    const fontF3 = await f3Doc.embedFont(PDFLib.StandardFonts.Helvetica);
                    formF3.updateFieldAppearances(fontF3);
                } catch(e) {}

                const drawImg = async (inputId, pdfFieldId) => {
                    const hiddenInput = document.getElementById(inputId);
                    if (hiddenInput && hiddenInput.value) {
                        try {
                            const field = formF3.getField(pdfFieldId);
                            const widget = field.acroField.getWidgets()[0];
                            const rect = widget.getRectangle();
                            
                            const widgetPageRef = widget.dict.get(PDFLib.PDFName.of('P'));
                            let targetPage = f3PagesArr.find(p => p.ref === widgetPageRef) || f3PagesArr[0];

                            const base64String = hiddenInput.value.split(',')[1];
                            const pdfImage = await f3Doc.embedJpg(base64String);

                            const scaled = pdfImage.scaleToFit(rect.width, rect.height);
                            const centerX = rect.x + (rect.width - scaled.width) / 2;
                            const centerY = rect.y + (rect.height - scaled.height) / 2;

                            targetPage.drawImage(pdfImage, { x: centerX, y: centerY, width: scaled.width, height: scaled.height });
                        } catch (e) {}
                    }
                };

                await drawImg(imgA, 'desc-img-01');
                await drawImg(imgB, 'desc-img-02');

                // FIX: Dynamic field renaming
                formF3.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + pageNum); } catch(e){} });

                const copiedPages = await mergedPdf.copyPages(f3Doc, [0]);
                mergedPdf.addPage(copiedPages[0]);
            };

            if (hasImg1or2) {
                await injectPhotosToDoc('desc-img-01-base64', 'desc-img-02-base64', 'desc-text-01', 'desc-text-02', currentPage);
                currentPage++;
            }
            
            if (hasImg3or4) {
                await injectPhotosToDoc('desc-img-03-base64', 'desc-img-04-base64', 'desc-text-03', 'desc-text-04', currentPage);
                currentPage++;
            }
        }

        // =====================================
        // SAUVEGARDE FINALE
        // =====================================
        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Journal_${rawDate}_${noProjet}_${techInitials}.pdf`;

        const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || isMacTouch;
        
        let attemptedShare = false;
        try {
            if (isApple && navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    attemptedShare = true;
                    await navigator.share({ files: [file] });
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') attemptedShare = false;
        }

        if (!attemptedShare) {
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
        showToast("Erreur lors de l'export PDF. Vérifiez la console.", "error");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) { btn.textContent = "📄 Exporter en PDF"; btn.disabled = false; }
    }
}

*/