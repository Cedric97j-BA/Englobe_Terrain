// ========================================== //
// 1. NAVIGATION ET INTERFACE GLOBALE         //
// ========================================== //

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.getElementById('main-logo');
    if (logoEl && typeof LOGO_BASE64 !== 'undefined') {
        logoEl.src = LOGO_BASE64;
        logoEl.style.display = 'block';
    }
    
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    updateDropdown();
    
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
    
    if (data) {
        card.querySelector('.task-jour').value = data.jour || '';
        card.querySelector('.task-date').value = data.date || '';
        descArea.value = data.desc || '';
    }
    
    descArea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight + 2) + 'px';
    });
    
    container.appendChild(clone);
    
    if (data && data.desc) {
        setTimeout(() => {
            descArea.style.height = 'auto';
            descArea.style.height = (descArea.scrollHeight + 2) + 'px';
        }, 50);
    }
    
    updateTaskNumbers();
    if (data) updateTaskSummary(card.querySelector('.task-jour')); 
}

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
    const jour = card.querySelector('.task-jour').value;
    const date = card.querySelector('.task-date').value;
    const summary = card.querySelector('.task-summary');
    
    if (jour || date) {
        summary.textContent = `(${jour ? jour + ' ' : ''}${date || ''})`;
    } else {
        summary.textContent = '';
    }
}

function removeTask(btn, event) {
    if (event) event.stopPropagation(); 
    const card = btn.closest('.task-card');
    if (card) {
        card.remove();
        updateTaskNumbers();
    }
}

function updateTaskNumbers() {
    const cards = document.querySelectorAll('.task-card');
    cards.forEach((card, index) => {
        card.querySelector('.task-number').textContent = index + 1;
    });
}

// ========================================== //
// 3. MOTEUR DE SAUVEGARDE (LOCALSTORAGE)     //
// ========================================== //

let currentActiveReportKey = null;

function updateLastSavedStatus(timestamp = Date.now()) {
    const status = document.getElementById('last-saved-status');
    if (status) {
        const date = new Date(timestamp);
        const dateText = date.toLocaleDateString('fr-CA');
        const timeText = date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h');
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
        if (key && key.startsWith('JRNLOLD_')) {
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
        else el.value = ''; 
    });

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

        if (reportData.static) {
            for (const [id, value] of Object.entries(reportData.static)) {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') el.checked = value;
                    else el.value = value;
                }
            }
        }
        
        const tasksContainer = document.getElementById('tasks-container');
        if (tasksContainer) tasksContainer.innerHTML = ''; 
        
        if (reportData.tasks && reportData.tasks.length > 0) {
            reportData.tasks.forEach(taskData => addTask(taskData));
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
    
    let baseName = `englobe_${rawDate}_${noProjet}_JOURNAL-ANCIEN_${techInitials}`;

    if (!saveKey || isDuplicate) {
        if (isDuplicate) baseName += "_copie";
        const promptMsg = isDuplicate ? "Nom pour la COPIE :" : "Nom de sauvegarde du rapport :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        saveKey = 'JRNLOLD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    } else {
        const existingDataStr = localStorage.getItem(saveKey);
        if (existingDataStr) {
            try {
                const existingData = JSON.parse(existingDataStr);
                if (existingData.displayName) {
                    baseName = existingData.displayName;
                }
            } catch(e) {}
        }
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return; 
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const tasksData = [];
    document.querySelectorAll('.task-card').forEach(card => {
        tasksData.push({
            jour: card.querySelector('.task-jour').value,
            date: card.querySelector('.task-date').value,
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
// 4. MOTEUR DE DÉCOUPAGE TEXTUEL             //
// ========================================== //

function splitTextIntelligently(text, maxChars = 100) {
    if (!text) return [];
    const lines = text.split('\n'); 
    const result = [];
    
    for (let line of lines) {
        if (line.trim() === '') {
            result.push('');
            continue;
        }
        let currentChunk = '';
        const words = line.split(' ');
        
        for (let word of words) {
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
        if (currentChunk.trim() !== '') {
            result.push(currentChunk.trim());
        }
    }
    return result;
}

function buildPrintableRows() {
    const maxChars = 100; 
    const printableRows = [];
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach((card, index) => {
        const jour = card.querySelector('.task-jour').value;
        let dateVal = card.querySelector('.task-date').value;
        const desc = card.querySelector('.task-desc').value.trim();
        
        if (!jour && !dateVal && !desc) return; 

        // Formater la date YYYY-MM-DD en format normal pour impression si désiré, 
        // ou laisser tel quel. Actuellement on laisse tel quel.
        
        const chunks = splitTextIntelligently(desc, maxChars);
        
        if (chunks.length === 0) {
            printableRows.push({ jour: jour, date: dateVal, text: "" });
        } else {
            printableRows.push({ jour: jour, date: dateVal, text: chunks[0] });
            
            for (let i = 1; i < chunks.length; i++) {
                printableRows.push({ jour: "", date: "", text: chunks[i] });
            }
        }
        
        if (index < taskCards.length - 1) {
            printableRows.push({ jour: "", date: "", text: "" });
        }
    });
    
    return printableRows; 
}

// ========================================== //
// 5. MOTEUR D'EXPORT PDF MULTI-PAGES         //
// ========================================== //


async function exportToPDF() {
    if (typeof TEMPLATE_JOURNAL_F0 === 'undefined') {
        showToast("Erreur: Le modèle F0 est introuvable.", "error");
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
        const ROWS_PER_PAGE = 21;
        const totalPages = Math.max(1, Math.ceil(printableRows.length / ROWS_PER_PAGE));

        const mergedPdf = await PDFLib.PDFDocument.create();
        mergedPdf.registerFontkit(fontkit);
        
        // FIX: Inject Tahoma Font to prevent Foxit crash
        const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
        await mergedPdf.embedFont(fontBytes);

        const fillGlobalFields = (form) => {
            const allInputs = document.querySelectorAll('input[id], textarea[id], select[id]');
            allInputs.forEach(el => {
                const name = el.id;
                
                // Découpage automatique Projet
                if (name === 'global-projet') {
                    const chunks = splitTextIntelligently(el.value, 33);
                    try { form.getTextField('global-projet-1').setText(chunks[0] || ""); } catch(e){}
                    try { form.getTextField('global-projet-2').setText(chunks[1] || ""); } catch(e){}
                    return; 
                }
                
                // Découpage automatique Endroit
                if (name === 'global-endroit') {
                    const chunks = splitTextIntelligently(el.value, 30);
                    try { form.getTextField('global-endroit-1').setText(chunks[0] || ""); } catch(e){}
                    try { form.getTextField('global-endroit-2').setText(chunks[1] || ""); } catch(e){}
                    try { form.getTextField('global-endroit-3').setText(chunks[2] || ""); } catch(e){}
                    return; 
                }
                
                try {
                    if (el.type === 'checkbox') {
                        el.checked ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck();
                    } else if (el.type !== 'file' && el.type !== 'hidden') {
                        form.getTextField(name).setText(el.value || "");
                    }
                } catch (e) {} 
            });
        };

        for (let p = 0; p < totalPages; p++) {
            const doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F0));
            doc.registerFontkit(fontkit);
            const form = doc.getForm();
            
            fillGlobalFields(form);
            
            try { form.getTextField('page-actuelle').setText((p + 1).toString()); } catch(e){}
            try { form.getTextField('page-totale').setText(totalPages.toString()); } catch(e){}
            
            for (let i = 0; i < ROWS_PER_PAGE; i++) {
                const rowIndex = p * ROWS_PER_PAGE + i;
                if (printableRows[rowIndex]) {
                    try { form.getTextField(`jour-${i+1}`).setText(printableRows[rowIndex].jour || ""); } catch(e){}
                    try { form.getTextField(`date-${i+1}`).setText(printableRows[rowIndex].date || ""); } catch(e){}
                    try { form.getTextField(`text_box_${i+1}`).setText(printableRows[rowIndex].text || ""); } catch(e){}
                }
            }
            
            // FIX: Use Tahoma for appearances
            try {
                const subFont = await doc.embedFont(fontBytes);
                form.updateFieldAppearances(subFont);
                if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch(e) {}

            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + (p + 1)); } catch(e){} });

            const copiedPages = await mergedPdf.copyPages(doc, [0]);
            mergedPdf.addPage(copiedPages[0]);
        }

        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await pdfDoc.save();
        const fileName = `JDC_${rawDate}_${noProjet}_${techInitials}.pdf`;

        // BIFURCATION : APPLICATION ANDROID vs WEB
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const pdfBase64 = await pdfDoc.saveAsBase64(); // Attention ici : pdfDoc
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
    if (typeof TEMPLATE_JOURNAL_F0 === 'undefined') {
        showToast("Erreur: Le modèle F0 est introuvable.", "error");
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
        const ROWS_PER_PAGE = 21;
        const totalPages = Math.max(1, Math.ceil(printableRows.length / ROWS_PER_PAGE));

        const mergedPdf = await PDFLib.PDFDocument.create();
        mergedPdf.registerFontkit(fontkit);
        
        // FIX: Inject Tahoma Font to prevent Foxit crash
        const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
        await mergedPdf.embedFont(fontBytes);

        const fillGlobalFields = (form) => {
            const allInputs = document.querySelectorAll('input[id], textarea[id], select[id]');
            allInputs.forEach(el => {
                const name = el.id;
                
                // Découpage automatique Projet
                if (name === 'global-projet') {
                    const chunks = splitTextIntelligently(el.value, 33);
                    try { form.getTextField('global-projet-1').setText(chunks[0] || ""); } catch(e){}
                    try { form.getTextField('global-projet-2').setText(chunks[1] || ""); } catch(e){}
                    return; 
                }
                
                // Découpage automatique Endroit
                if (name === 'global-endroit') {
                    const chunks = splitTextIntelligently(el.value, 30);
                    try { form.getTextField('global-endroit-1').setText(chunks[0] || ""); } catch(e){}
                    try { form.getTextField('global-endroit-2').setText(chunks[1] || ""); } catch(e){}
                    try { form.getTextField('global-endroit-3').setText(chunks[2] || ""); } catch(e){}
                    return; 
                }
                
                try {
                    if (el.type === 'checkbox') {
                        el.checked ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck();
                    } else if (el.type !== 'file' && el.type !== 'hidden') {
                        form.getTextField(name).setText(el.value || "");
                    }
                } catch (e) {} 
            });
        };

        for (let p = 0; p < totalPages; p++) {
            const doc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_F0));
            doc.registerFontkit(fontkit);
            const form = doc.getForm();
            
            fillGlobalFields(form);
            
            try { form.getTextField('page-actuelle').setText((p + 1).toString()); } catch(e){}
            try { form.getTextField('page-totale').setText(totalPages.toString()); } catch(e){}
            
            for (let i = 0; i < ROWS_PER_PAGE; i++) {
                const rowIndex = p * ROWS_PER_PAGE + i;
                if (printableRows[rowIndex]) {
                    try { form.getTextField(`jour-${i+1}`).setText(printableRows[rowIndex].jour || ""); } catch(e){}
                    try { form.getTextField(`date-${i+1}`).setText(printableRows[rowIndex].date || ""); } catch(e){}
                    try { form.getTextField(`text_box_${i+1}`).setText(printableRows[rowIndex].text || ""); } catch(e){}
                }
            }
            
            // FIX: Use Tahoma for appearances
            try {
                const subFont = await doc.embedFont(fontBytes);
                form.updateFieldAppearances(subFont);
                if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch(e) {}

            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + (p + 1)); } catch(e){} });

            const copiedPages = await mergedPdf.copyPages(doc, [0]);
            mergedPdf.addPage(copiedPages[0]);
        }

        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Journal_Ancien_${rawDate}_${noProjet}_${techInitials}.pdf`;

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