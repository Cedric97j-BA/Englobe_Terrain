// ========================================== //
// 1. INITIALISATION ET INTERFACE GLOBALE     //
// ========================================== //

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.getElementById('main-logo');
    if (logoEl && typeof LOGO_BASE64 !== 'undefined') {
        logoEl.src = LOGO_BASE64;
    }

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    updateDropdown();
});

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    if (typeof showToast === "function") {
        showToast(isDark ? "Mode Nuit activé" : "Mode Jour activé", "info");
    }
}

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
// 2. GESTIONNAIRE DE SAUVEGARDE (HORS-LIGNE) //
// ========================================== //

let currentActiveReportKey = null;
let isClearingForm = false; 

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
            if (key && key.startsWith('echsolgra_ID_')) {
                const dataStr = localStorage.getItem(key);
                if (dataStr && dataStr.includes('{')) {
                    const data = JSON.parse(dataStr);
                    if (data && data.displayName) {
                        const displayName = data.displayName.replace('echsolgra_', '').replace(/_/g, ' ');
                        savedReports.push({ key: key, display: displayName });
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

    if (currentActiveReportKey) {
        dropdown.value = currentActiveReportKey;
    }
}

function clearForm() {
    isClearingForm = true; 
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(el => {
        if (el.id === 'saved-reports-dropdown') return; 
        if (el.type === 'checkbox') {
            el.checked = false;
        } else {
            el.value = '';
        }
    });
    isClearingForm = false; 
}

let newArmed = false;
let newTimeout = null;

function newReportPrompt() {
    const newBtn = document.querySelector('button[onclick="newReportPrompt()"]');
    if (!newArmed) {
        newArmed = true;
        if (newBtn) {
            newBtn.textContent = "⚠️ Confirmer ?";
            newBtn.style.background = "#b91c1c";
        }
        newTimeout = setTimeout(() => {
            newArmed = false;
            if (newBtn) {
                newBtn.textContent = "➕ Nouveau";
                newBtn.style.background = "#0284c7";
            }
        }, 4000);
        return; 
    }

    clearTimeout(newTimeout);
    newArmed = false;
    if (newBtn) {
        newBtn.textContent = "➕ Nouveau";
        newBtn.style.background = "#0284c7";
    }

    currentActiveReportKey = null; 
    clearForm(); 
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (dropdown) dropdown.value = ""; 

    showToast("Écran réinitialisé. Vous pouvez commencer un nouveau rapport.", "success");
}

function saveReport(isDuplicate = false) {
    let saveKey = currentActiveReportKey;

    // 1. On recalcule TOUJOURS le nom de base avec les champs actuels
    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const techName = document.getElementById('sig-prep-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    const sampleNo = document.getElementById('ech-no')?.value.trim() || 'Ech';
    
    let baseName = `echsolgra_${rawDate}_${noProjet}_${sampleNo}_${techInitials}`;

    // 2. Demande un nom SEULEMENT si c'est un nouveau rapport ou une copie
    if (!saveKey || isDuplicate) {
        const promptMsg = isDuplicate ? "Nom pour la COPIE du rapport :" : "Nom de sauvegarde du rapport (modifiable) :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('echsolgra_')) baseName = `echsolgra_${baseName}`;
        
        // Création de l'identifiant unique invisible
        saveKey = 'echsolgra_ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return;
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const reportData = {
        displayName: baseName,
        static: staticData,
        timestamp: new Date().getTime()
    };

    localStorage.setItem(saveKey, JSON.stringify(reportData));
    currentActiveReportKey = saveKey; 
    updateLastSavedStatus(reportData.timestamp);
    
    updateDropdown();
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (dropdown) dropdown.value = saveKey;
    showToast(isDuplicate ? "Copie sauvegardée avec succès" : "Rapport sauvegardé", "success");
}

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    const selectedKey = dropdown.value;

    if (!selectedKey) {
        showToast("Veuillez d'abord sélectionner un rapport sauvegardé.", "info");
        return;
    }

    const reportDataStr = localStorage.getItem(selectedKey);
    if (!reportDataStr) return;

    clearForm();
    let reportData;
    try {
        reportData = JSON.parse(reportDataStr);
    } catch (error) {
        console.error("Rapport d'échantillonnage invalide", error);
        showToast("Ce rapport est invalide ou provient d'une ancienne version.", "error");
        return;
    }
    if (!reportData || typeof reportData !== 'object' || !reportData.static) {
        showToast("Ce rapport est invalide ou provient d'une ancienne version.", "error");
        return;
    }
    updateLastSavedStatus(reportData.timestamp);

    if (reportData.static) {
        for (const [id, value] of Object.entries(reportData.static)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = value;
                } else {
                    el.value = value;
                }
            }
        }
    }

    currentActiveReportKey = selectedKey; 
    dropdown.value = selectedKey;
    showToast("Rapport chargé avec succès.", "success");
}

let deleteArmed = false;
let deleteTimeout = null;

function deleteReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const targetKey = currentActiveReportKey || (dropdown ? dropdown.value : null);

    if (!targetKey) {
        showToast("Veuillez sélectionner un rapport à supprimer.", "info");
        return;
    }

    const deleteBtn = document.querySelector('button[onclick="deleteReport()"]');
    if (!deleteArmed) {
        deleteArmed = true;
        if (deleteBtn) {
            deleteBtn.textContent = "⚠️ Confirmer ?";
            deleteBtn.style.background = "#b91c1c";
        }
        deleteTimeout = setTimeout(() => {
            deleteArmed = false;
            if (deleteBtn) {
                deleteBtn.textContent = "🗑️ Supprimer";
                deleteBtn.style.background = "#ef4444";
            }
        }, 4000);
        return; 
    }

    clearTimeout(deleteTimeout);
    deleteArmed = false;
    if (deleteBtn) {
        deleteBtn.textContent = "🗑️ Supprimer";
        deleteBtn.style.background = "#ef4444";
    }

    localStorage.removeItem(targetKey); 
    showToast(`Le rapport a été supprimé avec succès.`, "success");
    
    currentActiveReportKey = null; 
    clearForm(); 
    updateDropdown(); 
}

// ========================================== //
// 3. MOTEUR D'EXPORTATION PDF (HORS-LIGNE)   //
// ========================================== //

async function exportToPDF() {
    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) {
            btn.textContent = "⏳ Génération en cours...";
            btn.disabled = true;
        }

        const mergedPdf = await PDFLib.PDFDocument.create();
        mergedPdf.registerFontkit(fontkit);
        
        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
        const tahomaFont = await mergedPdf.embedFont(fontBytes);

        // Assurez-vous que TEMPLATE_ECHSOLGRA est bien défini dans pdf_templates.js !
        const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_ECHSOLGRA));
        subDoc.registerFontkit(fontkit);
        const form = subDoc.getForm();
        
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
                            
                            // Logique de point vs virgule
                            const lowerName = pdfName.toLowerCase();
                            const isProjectNumber = lowerName.includes('projet') || lowerName.includes('no-') || lowerName.includes('numero') || lowerName.includes('lot') || lowerName.includes('ech-');
                            
                            if (!isProjectNumber) {
                                finalStr = finalStr.replace(/(\d)\.(\d)/g, '$1,$2'); 
                            }
                            field.setText(finalStr);
                        }
                    } catch (e) {
                        console.warn(`Impossible de remplir le champ ${pdfName}`, e);
                    }
                }
            }
        });

        // Mise à jour de l'apparence des champs (Sans "Flatten" pour garder modifiable)
        try {
            const subFont = await subDoc.embedFont(fontBytes);
            form.updateFieldAppearances(subFont);
            if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch (e) {
            console.warn("Erreur d'apparence PDF", e);
        }

        const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));

        // Nom du fichier PDF
        const noProjetVal = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techNameVal = document.getElementById('sig-prep-nom')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
        const echNoVal = document.getElementById('ech-no')?.value.trim() || 'Ech';

        const pdfBytes = await mergedPdf.save();
        const fileName = `Echantillon_${rawDateVal}_${noProjetVal}_${echNoVal}_${initialsVal}.pdf`;

        // BIFURCATION : APPLICATION ANDROID vs WEB
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const pdfBase64 = await mergedPdf.saveAsBase64(); // 
                const { Filesystem, FileOpener } = window.Capacitor.Plugins;
                
                if (!Filesystem || !FileOpener) {
                    throw new Error("Plugins introuvables. npx cap sync a-t-il été fait ?");
                }
                
                // 1. Sauvegarde silencieuse en cache
                const resultat = await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: 'CACHE',
                    recursive: true
                });

                // 2. Ouverture automatique (lancera Foxit directement si défini par défaut)
                await FileOpener.open({ 
                    filePath: resultat.uri, 
                    contentType: 'application/pdf' 
                });

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
        
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }

    } catch (error) {
        console.error("Erreur lors de l'export PDF :", error);
        showToast("Erreur lors de l'export PDF. Avez-vous ajouté TEMPLATE_ECHSOLGRA dans pdf_templates.js ?", "error");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) {
            btn.textContent = "📄 Exporter en PDF";
            btn.disabled = false;
        }
    }
}

/*
async function exportToPDF() {
    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) {
            btn.textContent = "⏳ Génération en cours...";
            btn.disabled = true;
        }

        const mergedPdf = await PDFLib.PDFDocument.create();
        mergedPdf.registerFontkit(fontkit);
        
        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
        const tahomaFont = await mergedPdf.embedFont(fontBytes);

        // Assurez-vous que TEMPLATE_ECHSOLGRA est bien défini dans pdf_templates.js !
        const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_ECHSOLGRA));
        subDoc.registerFontkit(fontkit);
        const form = subDoc.getForm();
        
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
                            
                            // Logique de point vs virgule
                            const lowerName = pdfName.toLowerCase();
                            const isProjectNumber = lowerName.includes('projet') || lowerName.includes('no-') || lowerName.includes('numero') || lowerName.includes('lot') || lowerName.includes('ech-');
                            
                            if (!isProjectNumber) {
                                finalStr = finalStr.replace(/(\d)\.(\d)/g, '$1,$2'); 
                            }
                            field.setText(finalStr);
                        }
                    } catch (e) {
                        console.warn(`Impossible de remplir le champ ${pdfName}`, e);
                    }
                }
            }
        });

        // Mise à jour de l'apparence des champs (Sans "Flatten" pour garder modifiable)
        try {
            const subFont = await subDoc.embedFont(fontBytes);
            form.updateFieldAppearances(subFont);
            if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch (e) {
            console.warn("Erreur d'apparence PDF", e);
        }

        const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));

        // Nom du fichier PDF
        const noProjetVal = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techNameVal = document.getElementById('sig-prep-nom')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
        const echNoVal = document.getElementById('ech-no')?.value.trim() || 'Ech';

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Echantillon_${rawDateVal}_${noProjetVal}_${echNoVal}_${initialsVal}.pdf`;

        // ===============================================
        // LOGIQUE SÉPARÉE : APPLE VS ANDROID/PC (CORRIGÉE)
        // ===============================================
        const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || isMacTouch;
        
        let attemptedShare = false;
        try {
            // UNIQUEMENT POUR APPLE : On ouvre le menu de partage
            if (isApple && navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    attemptedShare = true;
                    await navigator.share({ files: [file] });
                }
            }
        } catch (err) {
            console.log("Partage annulé ou échoué:", err);
            if (err.name !== 'AbortError') attemptedShare = false;
        }

        // POUR ANDROID ET PC : Téléchargement local forcé
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
        
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }

    } catch (error) {
        console.error("Erreur lors de l'export PDF :", error);
        showToast("Erreur lors de l'export PDF. Avez-vous ajouté TEMPLATE_ECHSOLGRA dans pdf_templates.js ?", "error");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) {
            btn.textContent = "📄 Exporter en PDF";
            btn.disabled = false;
        }
    }
}
*/