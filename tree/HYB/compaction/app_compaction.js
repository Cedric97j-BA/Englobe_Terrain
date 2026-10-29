// ========================================== //
// 1. NAVIGATION ET INITIALISATION            //
// ========================================== //


document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('essais-container').children.length === 0) {
        addEssai();
    }

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    updateDropdown();
});

// 2. La fonction reliée au bouton
function toggleDarkMode() {
    // Ajoute ou retire la classe "dark-mode" sur le corps de la page
    document.body.classList.toggle('dark-mode');
    
    // Vérifie si le mode est activé ou non
    const isDark = document.body.classList.contains('dark-mode');
    
    // Sauvegarde le choix dans la tablette
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    // Si vous avez gardé la fonction Toast, on peut l'utiliser !
    if (typeof showToast === "function") {
        showToast(isDark ? "Mode Nuit activé" : "Mode Jour activé", "info");
    }
}

// Fonction globale pour afficher un Toast
function showToast(message, type = 'success') {
    // 1. Création de l'élément
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type} show`;
    toast.innerText = message;
    
    // 2. Ajout à la page
    document.body.appendChild(toast);
    
    // 3. Destruction après 3 secondes (2.5s d'affichage + 0.5s d'animation de sortie)
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.remove();
            }
        }, 500);
    }, 3000);
}

function showTab(tabId) {
    document.querySelectorAll('.tab-section').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function toggleNO(checkbox, sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    if (checkbox.checked) {
        section.style.opacity = '0.3';
        section.style.pointerEvents = 'none';
        // Décoche tout le contenu
        section.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        section.querySelectorAll('input[type="text"], input[type="number"]').forEach(txt => txt.value = '');
    } else {
        section.style.opacity = '1';
        section.style.pointerEvents = 'auto';
    }
}

// ========================================== //
// 2. GESTION DES ESSAIS ET CALCULS "N-C"     //
// ========================================== //
/*
function addEssai() {
    const container = document.getElementById('essais-container');
    const template = document.getElementById('essai-template');
    const clone = template.content.cloneNode(true);
    
    clone.querySelectorAll('.trigger-calc').forEach(input => {
        input.addEventListener('input', calculateCompacite);
    });

    container.appendChild(clone);
    updateRowIndices();
}

function duplicateEssai(btn) {
    const originalCard = btn.closest('.essai-card');
    const container = document.getElementById('essais-container');
    const newCard = originalCard.cloneNode(true);
    
    // Ajout des listeners sur la nouvelle carte
    newCard.querySelectorAll('.trigger-calc').forEach(input => {
        input.addEventListener('input', calculateCompacite);
    });

    // Insertion juste après la carte copiée
    originalCard.insertAdjacentElement('afterend', newCard);
    updateRowIndices();
    calculateCompacite(); // Recalculer au cas où
}

function deleteEssai(btn) {
    if (confirm("Supprimer cette ligne d'essai ?")) {
        btn.closest('.essai-card').remove();
        updateRowIndices();
        calculateCompacite();
    }
}

function updateRowIndices() {
    const cards = document.querySelectorAll('.essai-card');
    cards.forEach((card, index) => {
        const rowNum = index + 1; // 1, 2, 3...
        // Met à jour le titre visuel de la carte
        card.querySelector('.row-index').textContent = rowNum;
        // Injecte la valeur automatique dans le champ "N° essai"
        const noInput = card.querySelector('.essai-no');
        if (noInput) noInput.value = rowNum;
    });
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function calculateCompacite() {
    const globalMaxStr = document.getElementById('carac-mv-seche-max').value;
    const globalMax = parseFloat(globalMaxStr);
    
    const exigenceStr = document.getElementById('exigence-compacite').value;
    const exigence = parseFloat(exigenceStr);

    document.querySelectorAll('.essai-card').forEach(card => {
        const mvSecheStr = card.querySelector('.essai-mv-seche').value;
        const mvMaxCorrStr = card.querySelector('.essai-mv-max-corr').value;
        const compaciteInput = card.querySelector('.essai-compacite');
        const remInput = card.querySelector('.essai-rem');

        if (!mvSecheStr) {
            compaciteInput.value = '';
            compaciteInput.style.borderColor = '#cbd5e1';
            compaciteInput.style.backgroundColor = '#f8fafc';
            compaciteInput.style.color = '#334155';
            return;
        }

        const mvSeche = parseFloat(mvSecheStr);
        // Utilise la valeur corrigée de la ligne, SINON la globale
        const referenceMax = mvMaxCorrStr ? parseFloat(mvMaxCorrStr) : globalMax;

        if (!isNaN(mvSeche) && !isNaN(referenceMax) && referenceMax > 0) {
            const compacite = Math.min((mvSeche / referenceMax) * 100, 100);
            compaciteInput.value = compacite.toFixed(1).replace('.', ',');

            // Logique N-C Intelligente
            if (!isNaN(exigence)) {
                if (compacite < exigence) {
                    compaciteInput.style.borderColor = '#ef4444'; // Rouge
                    compaciteInput.style.backgroundColor = '#fef2f2';
                    compaciteInput.style.color = '#b91c1c';
                    
                    let currentRem = remInput.value.trim();
                    if (!currentRem.includes("N-C")) {
                        remInput.value = currentRem ? "N-C, " + currentRem : "N-C";
                    }
                } else {
                    compaciteInput.style.borderColor = '#22c55e'; // Vert
                    compaciteInput.style.backgroundColor = '#f0fdf4';
                    compaciteInput.style.color = '#15803d';
                    
                    // Retire le N-C automatique si le chiffre redevient bon
                    if (remInput.value.includes("N-C")) {
                        let parts = remInput.value.split(',').map(s=>s.trim()).filter(s => s !== "N-C" && s !== "");
                        remInput.value = parts.join(', ');
                    }
                }
            } else {
                compaciteInput.style.borderColor = '#cbd5e1';
                compaciteInput.style.backgroundColor = '#f8fafc';
                compaciteInput.style.color = '#334155';
            }
        } else {
            compaciteInput.value = '';
        }
    });
}

*/

// ========================================== //
// 2. GESTION DES ESSAIS ET CALCULS "N-C"     //
// ========================================== //

function toggleAccordion(headerElement) {
    const content = headerElement.nextElementSibling;
    const chevron = headerElement.querySelector('.chevron');
    
    content.classList.toggle('active');
    chevron.classList.toggle('rotated');
}

function addEssai() {
    const container = document.getElementById('essais-container');
    const template = document.getElementById('essai-template');
    const clone = template.content.cloneNode(true);
    
    clone.querySelectorAll('.trigger-calc').forEach(input => {
        input.addEventListener('input', calculateCompacite);
    });

    container.appendChild(clone);
    updateRowIndices();
    calculateCompacite();
}

function duplicateEssai(btn, event) {
    if (event) event.stopPropagation();
    const originalCard = btn.closest('.essai-card');
    const newCard = originalCard.cloneNode(true);
    
    // Ajout des listeners sur la nouvelle carte
    newCard.querySelectorAll('.trigger-calc').forEach(input => {
        input.addEventListener('input', calculateCompacite);
    });

    // Insertion juste après la carte copiée
    originalCard.insertAdjacentElement('afterend', newCard);
    updateRowIndices();
    calculateCompacite();
}

function deleteEssai(btn, event) {
    if (event) event.stopPropagation();
    if (confirm("Supprimer cette ligne d'essai ?")) {
        btn.closest('.essai-card').remove();
        updateRowIndices();
        calculateCompacite();
    }
}

function collapseAllEssais() {
    document.querySelectorAll('.essai-card .accordion-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.essai-card .chevron').forEach(chevron => {
        chevron.classList.add('rotated');
    });
}

function updateRowIndices() {
    const cards = document.querySelectorAll('.essai-card');
    cards.forEach((card, index) => {
        const rowNum = index + 1; // 1, 2, 3...
        // Met à jour le titre visuel de la carte
        card.querySelector('.row-index').textContent = rowNum;
        // Injecte la valeur automatique dans le champ "N° essai"
        const noInput = card.querySelector('.essai-no');
        if (noInput) noInput.value = rowNum;
    });
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function calculateCompacite() {
    const globalMaxStr = document.getElementById('carac-mv-seche-max').value;
    const globalMax = parseFloat(globalMaxStr);
    
    const exigenceStr = document.getElementById('exigence-compacite').value;
    const exigence = parseFloat(exigenceStr);

    const hasGlobalMax = globalMaxStr.trim() !== '' && !isNaN(globalMax) && globalMax > 0;
    const hasExigence = exigenceStr.trim() !== '' && !isNaN(exigence) && exigence > 0;

    document.querySelectorAll('.essai-card').forEach(card => {
        // Gestion de la visibilité des avertissements
        const warnMv = card.querySelector('.warn-mv-max');
        const warnExig = card.querySelector('.warn-exigence');
        if (warnMv) warnMv.style.display = hasGlobalMax ? 'none' : 'block';
        if (warnExig) warnExig.style.display = hasExigence ? 'none' : 'block';

        const mvSecheStr = card.querySelector('.essai-mv-seche').value;
        const mvMaxCorrStr = card.querySelector('.essai-mv-max-corr').value;
        const compaciteInput = card.querySelector('.essai-compacite');
        const remInput = card.querySelector('.essai-rem');

        if (!mvSecheStr) {
            compaciteInput.value = '';
            compaciteInput.style.borderColor = '#cbd5e1';
            compaciteInput.style.backgroundColor = '#f8fafc';
            compaciteInput.style.color = '#334155';
            return;
        }

        const mvSeche = parseFloat(mvSecheStr);
        // Utilise la valeur corrigée de la ligne, SINON la globale
        const referenceMax = mvMaxCorrStr ? parseFloat(mvMaxCorrStr) : globalMax;

        if (!isNaN(mvSeche) && !isNaN(referenceMax) && referenceMax > 0) {
            const compacite = Math.min((mvSeche / referenceMax) * 100, 100);
            compaciteInput.value = compacite.toFixed(1).replace('.', ',');

            // Logique N-C Intelligente
            if (!isNaN(exigence)) {
                if (compacite < exigence) {
                    compaciteInput.style.borderColor = '#ef4444'; // Rouge
                    compaciteInput.style.backgroundColor = '#fef2f2';
                    compaciteInput.style.color = '#b91c1c';
                    
                    let currentRem = remInput.value.trim();
                    if (!currentRem.includes("N-C")) {
                        remInput.value = currentRem ? "N-C, " + currentRem : "N-C";
                    }
                } else {
                    compaciteInput.style.borderColor = '#22c55e'; // Vert
                    compaciteInput.style.backgroundColor = '#f0fdf4';
                    compaciteInput.style.color = '#15803d';
                    
                    // Retire le N-C automatique si le chiffre redevient bon
                    if (remInput.value.includes("N-C")) {
                        let parts = remInput.value.split(',').map(s=>s.trim()).filter(s => s !== "N-C" && s !== "");
                        remInput.value = parts.join(', ');
                    }
                }
            } else {
                compaciteInput.style.borderColor = '#cbd5e1';
                compaciteInput.style.backgroundColor = '#f8fafc';
                compaciteInput.style.color = '#334155';
            }
        } else {
            compaciteInput.value = '';
        }
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
            // 1. Anciens rapports (Sauvegardés sans ID)
            if (key && key.startsWith('compactage_')) {
                const displayName = key.replace('compactage_', '').replace(/_/g, ' ');
                savedReports.push({ key: key, display: displayName });
            } 
            // 2. Nouveaux rapports (Sauvegardés avec ID unique)
            else if (key && key.startsWith('ID_')) {
                const dataStr = localStorage.getItem(key);
                if (dataStr && dataStr.includes('{')) {
                    const data = JSON.parse(dataStr);
                    if (data && data.displayName && data.displayName.startsWith('compactage_')) {
                        const displayName = data.displayName.replace('compactage_', '').replace(/_/g, ' ');
                        savedReports.push({ key: key, display: displayName });
                    }
                }
            }
        } catch (e) {
            // Ignorer les fichiers corrompus dans le localStorage
        }
    }

    // Tri alphabétique basé sur le nom d'affichage
    savedReports.sort((a, b) => a.display.localeCompare(b.display));

    // Création des options dans le menu déroulant
    savedReports.forEach(report => {
        const option = document.createElement('option');
        option.value = report.key; // La vraie clé système (compactage_... ou ID_...)
        option.textContent = report.display; // Le nom propre et formaté
        dropdown.appendChild(option);
    });

    // Garder le rapport actuel sélectionné dans la liste
    if (currentActiveReportKey) {
        dropdown.value = currentActiveReportKey;
    }
}

function clearForm() {
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return; 
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
    });

    document.getElementById('section-sous-jacent').style.opacity = '1';
    document.getElementById('section-sous-jacent').style.pointerEvents = 'auto';
    document.getElementById('section-equip').style.opacity = '1';
    document.getElementById('section-equip').style.pointerEvents = 'auto';

    document.getElementById('essais-container').innerHTML = '';
    addEssai();
    calculateCompacite();
}

function newReportPrompt() {
    if (confirm("Écran réinitialisé. Vous allez commencer un nouveau rapport de compactage. Continuer ?")) {
        currentActiveReportKey = null; 
        clearForm(); 
        document.getElementById('saved-reports-dropdown').value = ""; 
    }
}

function loadReport() {
    const selectedKey = document.getElementById('saved-reports-dropdown').value;
    if (!selectedKey) return showToast("Sélectionnez un rapport d'abord.", "info");

    let reportData;
    try {
        reportData = JSON.parse(localStorage.getItem(selectedKey));
    } catch (error) {
        console.error("Rapport de compactage invalide", error);
        showToast("Ce rapport est invalide ou provient d'une ancienne version.", "error");
        return;
    }
    if (!reportData || typeof reportData !== 'object' || !reportData.static) {
        showToast("Ce rapport est invalide ou provient d'une ancienne version.", "error");
        return;
    }
    updateLastSavedStatus(reportData.timestamp);

    clearForm();

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
            }
        }
    }

    if (reportData.essais && Array.isArray(reportData.essais)) {
        const container = document.getElementById('essais-container');
        container.innerHTML = '';
        
        reportData.essais.forEach(es => {
            addEssai();
            const cards = container.querySelectorAll('.essai-card');
            const card = cards[cards.length - 1];
            
            card.querySelector('.essai-secteur').value = es.secteur || '';
            card.querySelector('.essai-no').value = es.no || '';
            card.querySelector('.essai-elevation').value = es.elevation || '';
            card.querySelector('.essai-part').value = es.part || '';
            card.querySelector('.essai-eau').value = es.eau || '';
            card.querySelector('.essai-mv-seche').value = es.mvSeche || '';
            card.querySelector('.essai-mv-max-corr').value = es.mvMaxCorr || '';
            card.querySelector('.essai-rem').value = es.rem || '';
        });
    }

    calculateCompacite();
    currentActiveReportKey = selectedKey; 
    document.getElementById('saved-reports-dropdown').value = selectedKey;
    showToast("Rapport chargé avec succès.", "success");
}

function saveReport(isDuplicate = false) {
    let saveKey = currentActiveReportKey;

    // 1. On recalcule TOUJOURS le nom de base avec les champs actuels
    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const techName = document.getElementById('sig-englobe-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `compactage_${rawDate}_${noProjet}_${techInitials}`;

    // 2. Demande un nom SEULEMENT si c'est un nouveau rapport ou une copie
    if (!saveKey || isDuplicate) {
        const promptMsg = isDuplicate ? "Nom pour la COPIE du rapport :" : "Nom de sauvegarde du rapport :";
        let userPromptName = prompt(promptMsg, baseName);
        if (!userPromptName) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('compactage_')) baseName = `compactage_${baseName}`;

        // Création de l'identifiant unique invisible
        saveKey = 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return;
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const essaisData = [];
    document.querySelectorAll('.essai-card').forEach(card => {
        essaisData.push({
            secteur: card.querySelector('.essai-secteur').value,
            no: card.querySelector('.essai-no').value,
            elevation: card.querySelector('.essai-elevation').value,
            part: card.querySelector('.essai-part').value,
            eau: card.querySelector('.essai-eau').value,
            mvSeche: card.querySelector('.essai-mv-seche').value,
            mvMaxCorr: card.querySelector('.essai-mv-max-corr').value,
            rem: card.querySelector('.essai-rem').value
        });
    });

    const reportData = {
        displayName: baseName, // <-- Le nom que le technicien voit
        static: staticData,
        essais: essaisData,
        timestamp: new Date().getTime()
    };

    localStorage.setItem(saveKey, JSON.stringify(reportData));
    currentActiveReportKey = saveKey; 
    updateLastSavedStatus(reportData.timestamp);
    
    updateDropdown();
    
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (dropdown) dropdown.value = saveKey;
    
    showToast(isDuplicate ? "Copie sauvegardée avec succès." : "Rapport sauvegardé avec succès.", "success");
}

function deleteReport() {
    const targetKey = currentActiveReportKey || document.getElementById('saved-reports-dropdown').value;
    if (!targetKey) return showToast("Sélectionnez un rapport.", "info");

    if (confirm("Supprimer ce rapport définitivement ?")) {
        localStorage.removeItem(targetKey); 
        currentActiveReportKey = null; 
        clearForm(); 
        updateDropdown(); 
        showToast("Supprimé.", "success");
    }
}

// ========================================== //
// 4. MOTEUR D'EXPORT PDF MULTI-PAGES         //
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
        
        // 1. Initialisation de Fontkit pour Foxit/Chrome/Preview
        mergedPdf.registerFontkit(fontkit);
        
        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        // Chargement de la police (Assurez-vous que TAHOMA_FONT est dans tpl_compaction.js)
        const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
        await mergedPdf.embedFont(fontBytes);

        const allEssais = Array.from(document.querySelectorAll('.essai-card'));
        const maxPerPage = 8;
        const nbPages = Math.max(1, Math.ceil(allEssais.length / maxPerPage));

        for (let p = 0; p < nbPages; p++) {
            const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_COMPACTION));
            
            // On enregistre Fontkit dans le sous-document
            subDoc.registerFontkit(fontkit);
            const subFont = await subDoc.embedFont(fontBytes);
            const form = subDoc.getForm();

            // Mappage des champs statiques
            form.getFields().forEach(field => {
                const pdfName = field.getName();
                
                if (pdfName.startsWith('essai-row-') || pdfName.startsWith('page-')) return; 
                
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

            // Mappage Invisible des Cases Maîtresses MG / CG
            try {
                if (document.querySelector('.auto-mg-sous:checked')) form.getCheckBox('sous-cal-mg').check();
                if (document.querySelector('.auto-cg-sous:checked')) form.getCheckBox('sous-cal-cg').check();
                if (document.querySelector('.auto-mg-rem:checked')) form.getCheckBox('rem-cal-mg').check();
                if (document.querySelector('.auto-cg-rem:checked')) form.getCheckBox('rem-cal-cg').check();
            } catch (e) {}

            // Numérotation des pages
            try { form.getTextField('page-actuelle').setText((p + 1).toString()); } catch(e) {}
            try { form.getTextField('page-totale').setText(nbPages.toString()); } catch(e) {}

            // Mappage de la grille (8 essais maximum par page)
            const chunk = allEssais.slice(p * maxPerPage, (p + 1) * maxPerPage);
            
            chunk.forEach((card, index) => {
                const row = index + 1; 
                
                const trySetGrid = (cls, pdfFieldSuffix) => {
                    const el = card.querySelector(cls);
                    if (el && el.value) {
                        let finalVal = el.value.toString().replace(/(\d)\.(\d)/g, '$1,$2');
                        try { form.getTextField(`essai-row-${pdfFieldSuffix}_${row}`).setText(finalVal); } catch(e) {}
                    }
                };

                trySetGrid('.essai-secteur', 'secteur');
                trySetGrid('.essai-no', 'no');
                trySetGrid('.essai-elevation', 'elevation');
                trySetGrid('.essai-part', 'part-5mm');
                trySetGrid('.essai-eau', 'teneur-eau');
                trySetGrid('.essai-mv-seche', 'mv-seche');
                trySetGrid('.essai-mv-max-corr', 'mv-max-corr');
                trySetGrid('.essai-compacite', 'compacite');
                trySetGrid('.essai-rem', 'rem');
            });

            // === LE FIX FOXIT EST ICI ===
            try {
                form.updateFieldAppearances(subFont);
                if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch (e) {
                console.warn("Erreur d'apparence PDF", e);
            }

            // FIX: Dynamic Field Renaming
            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + p); } catch(e){} });

            const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        // Nettoyage et création du nom de fichier final
        const noProjetVal = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techNameVal = document.getElementById('sig-englobe-nom')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        
        const pdfBytes = await mergedPdf.save();
        const fileName = `Compactage_${noProjetVal}_${rawDateVal}_${initialsVal}.pdf`;

        // BIFURCATION : APPLICATION ANDROID vs WEB
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const pdfBase64 = await mergedPdf.saveAsBase64(); // Attention ici : mergedPdf
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

    } catch (error) {
        console.error("Erreur lors de l'export PDF :", error);
        showToast("Erreur lors de l'export PDF. Vérifiez la console.", "error");
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
        
        // 1. Initialisation de Fontkit pour Foxit/Chrome/Preview
        mergedPdf.registerFontkit(fontkit);
        
        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        // Chargement de la police (Assurez-vous que TAHOMA_FONT est dans tpl_compaction.js)
        const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
        await mergedPdf.embedFont(fontBytes);

        const allEssais = Array.from(document.querySelectorAll('.essai-card'));
        const maxPerPage = 8;
        const nbPages = Math.max(1, Math.ceil(allEssais.length / maxPerPage));

        for (let p = 0; p < nbPages; p++) {
            const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_COMPACTION));
            
            // On enregistre Fontkit dans le sous-document
            subDoc.registerFontkit(fontkit);
            const subFont = await subDoc.embedFont(fontBytes);
            const form = subDoc.getForm();

            // Mappage des champs statiques
            form.getFields().forEach(field => {
                const pdfName = field.getName();
                
                if (pdfName.startsWith('essai-row-') || pdfName.startsWith('page-')) return; 
                
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

            // Mappage Invisible des Cases Maîtresses MG / CG
            try {
                if (document.querySelector('.auto-mg-sous:checked')) form.getCheckBox('sous-cal-mg').check();
                if (document.querySelector('.auto-cg-sous:checked')) form.getCheckBox('sous-cal-cg').check();
                if (document.querySelector('.auto-mg-rem:checked')) form.getCheckBox('rem-cal-mg').check();
                if (document.querySelector('.auto-cg-rem:checked')) form.getCheckBox('rem-cal-cg').check();
            } catch (e) {}

            // Numérotation des pages
            try { form.getTextField('page-actuelle').setText((p + 1).toString()); } catch(e) {}
            try { form.getTextField('page-totale').setText(nbPages.toString()); } catch(e) {}

            // Mappage de la grille (8 essais maximum par page)
            const chunk = allEssais.slice(p * maxPerPage, (p + 1) * maxPerPage);
            
            chunk.forEach((card, index) => {
                const row = index + 1; 
                
                const trySetGrid = (cls, pdfFieldSuffix) => {
                    const el = card.querySelector(cls);
                    if (el && el.value) {
                        let finalVal = el.value.toString().replace(/(\d)\.(\d)/g, '$1,$2');
                        try { form.getTextField(`essai-row-${pdfFieldSuffix}_${row}`).setText(finalVal); } catch(e) {}
                    }
                };

                trySetGrid('.essai-secteur', 'secteur');
                trySetGrid('.essai-no', 'no');
                trySetGrid('.essai-elevation', 'elevation');
                trySetGrid('.essai-part', 'part-5mm');
                trySetGrid('.essai-eau', 'teneur-eau');
                trySetGrid('.essai-mv-seche', 'mv-seche');
                trySetGrid('.essai-mv-max-corr', 'mv-max-corr');
                trySetGrid('.essai-compacite', 'compacite');
                trySetGrid('.essai-rem', 'rem');
            });

            // === LE FIX FOXIT EST ICI ===
            try {
                form.updateFieldAppearances(subFont);
                if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch (e) {
                console.warn("Erreur d'apparence PDF", e);
            }

            // FIX: Dynamic Field Renaming
            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + p); } catch(e){} });

            const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        // Nettoyage et création du nom de fichier final
        const noProjetVal = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techNameVal = document.getElementById('sig-englobe-nom')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Compactage_${noProjetVal}_${rawDateVal}_${initialsVal}.pdf`;

        // LOGIQUE SÉPARÉE : APPLE VS ANDROID/PC
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

        // POUR ANDROID ET PC : On sauvegarde directement le fichier en local
        if (!attemptedShare) {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click(); // Force le téléchargement direct dans le dossier de la tablette
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        }
        
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }

    } catch (error) {
        console.error("Erreur lors de l'export PDF :", error);
        showToast("Erreur lors de l'export PDF. Vérifiez la console.", "error");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) {
            btn.textContent = "📄 Exporter en PDF";
            btn.disabled = false;
        }
    }
} */