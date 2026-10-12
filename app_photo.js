// ========================================== //
// 1. INITIALISATION ET UI                    //
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
});

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} show`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (document.body.contains(toast)) toast.remove(); }, 500);
    }, 3000);
}

// ========================================== //
// 2. GESTION DES IMAGES                      //
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

                showToast("Image ajoutée et compressée.", "success");
            }
        };
        reader.readAsDataURL(file);
    }
}

function clearImage(index) {
    document.getElementById(`desc-img-${index}-base64`).value = "";
    const fileInput = document.getElementById(`desc-img-${index}`);
    if (fileInput) fileInput.value = ""; 
    const previewEl = document.getElementById(`desc-img-${index}-preview`);
    if(previewEl) {
        previewEl.src = "";
        previewEl.style.display = 'none';
    }
    const clearBtn = document.getElementById(`desc-img-${index}-clear`);
    if (clearBtn) clearBtn.style.display = 'none';
}

// ========================================== //
// 3. MOTEUR DE SAUVEGARDE                    //
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
        if (key && key.startsWith('PHOTO_')) {
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
        else if (el.id && !el.id.startsWith('desc-img-')) el.value = ''; 
    });

    for (let i = 1; i <= 4; i++) {
        clearImage(`0${i}`);
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
    showToast("Écran réinitialisé.", "success");
}

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const selectedKey = dropdown.value;
    if (!selectedKey) { showToast("Veuillez d'abord sélectionner un rapport.", "info"); return; }

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
    const rawDate = new Date().toISOString().split('T')[0];
    const techName = document.getElementById('sig-prep-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `englobe_${rawDate}_${noProjet}_PHOTOS_${techInitials}`;

    if (!saveKey || isDuplicate) {
        if (isDuplicate) baseName += "_copie";
        const promptMsg = isDuplicate ? "Nom pour la COPIE :" : "Nom de sauvegarde du rapport :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        saveKey = 'PHOTO_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    } else {
        const existingDataStr = localStorage.getItem(saveKey);
        if (existingDataStr) {
            try {
                const existingData = JSON.parse(existingDataStr);
                if (existingData.displayName) baseName = existingData.displayName;
            } catch(e) {}
        }
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown' || el.type === 'file') return; 
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
    
    document.getElementById('saved-reports-dropdown').value = saveKey;
    showToast(isDuplicate ? "Copie sauvegardée." : "Rapport sauvegardé.", "success");
}

let deleteArmed = false;
let deleteTimeout = null;

function deleteReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const targetKey = currentActiveReportKey || (dropdown ? dropdown.value : null);

    if (!targetKey) { showToast("Sélectionnez un rapport à supprimer.", "info"); return; }

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
    showToast(`Rapport supprimé avec succès.`, "success");
    currentActiveReportKey = null; 
    clearForm(); 
    updateDropdown(); 
}

// ========================================== //
// 4. MOTEUR D'EXPORT PDF (Images)            //
// ========================================== //

// ========================================== //
// 4. MOTEUR D'EXPORT PDF (Images)            //
// ========================================== //

async function exportToPDF() {
    if (typeof TEMPLATE_JOURNAL_PHOTO === 'undefined') {
        showToast("Erreur: Le modèle PDF TEMPLATE_JOURNAL_PHOTO est introuvable.", "error");
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

        const pdfDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_PHOTO));
        pdfDoc.registerFontkit(fontkit);
        const form = pdfDoc.getForm();
        const pagesArr = pdfDoc.getPages();

        // 1. Remplissage du texte
        const allInputs = document.querySelectorAll('input[id], textarea[id]');
        allInputs.forEach(el => {
            const name = el.id;
            try {
                if (el.type !== 'file' && el.type !== 'hidden') {
                    form.getTextField(name).setText(el.value || "");
                }
            } catch (e) {} 
        });

        // 2. CRITIQUE : Figer le texte AVANT de dessiner les images avec Tahoma
        try {
            const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
            const tahomaFont = await pdfDoc.embedFont(fontBytes);
            form.updateFieldAppearances(tahomaFont);
            if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch(e) {}

        // 3. Moteur d'injection des images

        /*
        const drawImg = async (inputId, pdfFieldId) => {
            const hiddenInput = document.getElementById(inputId);
            if (hiddenInput && hiddenInput.value) {
                try {
                    const field = form.getField(pdfFieldId);
                    const widget = field.acroField.getWidgets()[0];
                    const rect = widget.getRectangle();
                    
                    const widgetPageRef = widget.dict.get(PDFLib.PDFName.of('P'));
                    let targetPage = pagesArr.find(p => p.ref === widgetPageRef) || pagesArr[0];

                    const base64String = hiddenInput.value.split(',')[1];
                    const pdfImage = await pdfDoc.embedJpg(base64String);

                    const scaled = pdfImage.scaleToFit(rect.width, rect.height);
                    const centerX = rect.x + (rect.width - scaled.width) / 2;
                    const centerY = rect.y + (rect.height - scaled.height) / 2;

                    targetPage.drawImage(pdfImage, { x: centerX, y: centerY, width: scaled.width, height: scaled.height });
                } catch (e) {
                    console.error("Erreur image", e);
                }
            }
        };*/

        // 3. Moteur d'injection des images
        const drawImg = async (inputId, pdfFieldId, pageIndex) => {
            const hiddenInput = document.getElementById(inputId);
            if (hiddenInput && hiddenInput.value) {
                try {
                    const field = form.getField(pdfFieldId);
                    const widget = field.acroField.getWidgets()[0];
                    const rect = widget.getRectangle();
                    
                    // CRITIQUE : On force la page cible (0 = Page 1, 1 = Page 2)
                    let targetPage = pagesArr[pageIndex];

                    const base64String = hiddenInput.value.split(',')[1];
                    const pdfImage = await pdfDoc.embedJpg(base64String);

                    const scaled = pdfImage.scaleToFit(rect.width, rect.height);
                    const centerX = rect.x + (rect.width - scaled.width) / 2;
                    const centerY = rect.y + (rect.height - scaled.height) / 2;

                    targetPage.drawImage(pdfImage, { x: centerX, y: centerY, width: scaled.width, height: scaled.height });
                } catch (e) {
                    console.error("Erreur image", e);
                }
            }
        };

        // Images 1 et 2 vont sur la Page 1 (index 0)
        await drawImg('desc-img-01-base64', 'desc-img-01', 0);
        await drawImg('desc-img-02-base64', 'desc-img-02', 0);
        
        // Images 3 et 4 vont sur la Page 2 (index 1)
        await drawImg('desc-img-03-base64', 'desc-img-03', 1);
        await drawImg('desc-img-04-base64', 'desc-img-04', 1);

        form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_Fphoto'); } catch(e){} });

        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
        
        const pdfBytes = await pdfDoc.save();
        const fileName = `JPhotos_${rawDate}_${noProjet}_${techInitials}.pdf`;

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
    if (typeof TEMPLATE_JOURNAL_PHOTO === 'undefined') {
        showToast("Erreur: Le modèle PDF TEMPLATE_JOURNAL_PHOTO est introuvable.", "error");
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

        const pdfDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_JOURNAL_PHOTO));
        pdfDoc.registerFontkit(fontkit);
        const form = pdfDoc.getForm();
        const pagesArr = pdfDoc.getPages();

        // 1. Remplissage du texte
        const allInputs = document.querySelectorAll('input[id], textarea[id]');
        allInputs.forEach(el => {
            const name = el.id;
            try {
                if (el.type !== 'file' && el.type !== 'hidden') {
                    form.getTextField(name).setText(el.value || "");
                }
            } catch (e) {} 
        });

        // 2. CRITIQUE : Figer le texte AVANT de dessiner les images avec Tahoma
        try {
            const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
            const tahomaFont = await pdfDoc.embedFont(fontBytes);
            form.updateFieldAppearances(tahomaFont);
            if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch(e) {}

        // 3. Moteur d'injection des images

        ---- OLD BELOW

        // 3. Moteur d'injection des images
        const drawImg = async (inputId, pdfFieldId, pageIndex) => {
            const hiddenInput = document.getElementById(inputId);
            if (hiddenInput && hiddenInput.value) {
                try {
                    const field = form.getField(pdfFieldId);
                    const widget = field.acroField.getWidgets()[0];
                    const rect = widget.getRectangle();
                    
                    // CRITIQUE : On force la page cible (0 = Page 1, 1 = Page 2)
                    let targetPage = pagesArr[pageIndex];

                    const base64String = hiddenInput.value.split(',')[1];
                    const pdfImage = await pdfDoc.embedJpg(base64String);

                    const scaled = pdfImage.scaleToFit(rect.width, rect.height);
                    const centerX = rect.x + (rect.width - scaled.width) / 2;
                    const centerY = rect.y + (rect.height - scaled.height) / 2;

                    targetPage.drawImage(pdfImage, { x: centerX, y: centerY, width: scaled.width, height: scaled.height });
                } catch (e) {
                    console.error("Erreur image", e);
                }
            }
        };

        // Images 1 et 2 vont sur la Page 1 (index 0)
        await drawImg('desc-img-01-base64', 'desc-img-01', 0);
        await drawImg('desc-img-02-base64', 'desc-img-02', 0);
        
        // Images 3 et 4 vont sur la Page 2 (index 1)
        await drawImg('desc-img-03-base64', 'desc-img-03', 1);
        await drawImg('desc-img-04-base64', 'desc-img-04', 1);

        form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_Fphoto'); } catch(e){} });

        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Photos_${rawDate}_${noProjet}_${techInitials}.pdf`;

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

/*
        const drawImg = async (inputId, pdfFieldId) => {
            const hiddenInput = document.getElementById(inputId);
            if (hiddenInput && hiddenInput.value) {
                try {
                    const field = form.getField(pdfFieldId);
                    const widget = field.acroField.getWidgets()[0];
                    const rect = widget.getRectangle();
                    
                    const widgetPageRef = widget.dict.get(PDFLib.PDFName.of('P'));
                    let targetPage = pagesArr.find(p => p.ref === widgetPageRef) || pagesArr[0];

                    const base64String = hiddenInput.value.split(',')[1];
                    const pdfImage = await pdfDoc.embedJpg(base64String);

                    const scaled = pdfImage.scaleToFit(rect.width, rect.height);
                    const centerX = rect.x + (rect.width - scaled.width) / 2;
                    const centerY = rect.y + (rect.height - scaled.height) / 2;

                    targetPage.drawImage(pdfImage, { x: centerX, y: centerY, width: scaled.width, height: scaled.height });
                } catch (e) {
                    console.error("Erreur image", e);
                }
            }
        };*/