const APP_VERSION = 'v1.0.0.4';

// ========================================== //
// 1. NAVIGATION ET INITIALISATION            //
// ========================================== //


document.addEventListener('DOMContentLoaded', () => {
    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.textContent = APP_VERSION;

    if (document.getElementById('essais-container').children.length === 0) {
        addEssai();
    }
    updateDropdown();
});

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

// ========================================== //
// 3. MOTEUR DE SAUVEGARDE (LOCALSTORAGE)     //
// ========================================== //

let currentActiveReportKey = null;

function updateDropdown() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">-- Sélectionnez un rapport --</option>';
    let savedKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('compactage_')) savedKeys.push(key);
    }
    savedKeys.sort().forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key.replace('compactage_', '').replace(/_/g, ' ');
        dropdown.appendChild(option);
    });
    if (currentActiveReportKey) dropdown.value = currentActiveReportKey;
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
    if (!selectedKey) return alert("Sélectionnez un rapport d'abord.");

    const reportData = JSON.parse(localStorage.getItem(selectedKey));
    if (!reportData) return;

    clearForm();

    if (reportData.static) {
        for (const [id, value] of Object.entries(reportData.static)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') el.checked = value;
                else el.value = value;
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
    alert("Rapport chargé avec succès.");
}

function saveReport() {
    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const techName = document.getElementById('sig-englobe-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    const defaultBaseName = `compactage_${rawDate}_${noProjet}_${techInitials}`;
    let userPromptName = prompt("Nom de sauvegarde du rapport :", defaultBaseName);
    if (!userPromptName) return; 
    
    let baseName = userPromptName.trim() || defaultBaseName;
    if (!baseName.startsWith('compactage_')) baseName = `compactage_${baseName}`;

    if (currentActiveReportKey && !currentActiveReportKey.startsWith(baseName)) {
        currentActiveReportKey = null;
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

    let saveKey = currentActiveReportKey;
    if (!saveKey || saveKey !== baseName) {
        let maxIndex = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(baseName)) {
                const parts = key.split('_');
                const idx = parseInt(parts[parts.length - 1]);
                if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
            }
        }
        const nextIndex = String(maxIndex + 1).padStart(2, '0');
        saveKey = `${baseName}_${nextIndex}`;
    }

    const reportData = {
        static: staticData,
        essais: essaisData,
        timestamp: new Date().getTime()
    };

    localStorage.setItem(saveKey, JSON.stringify(reportData));
    currentActiveReportKey = saveKey; 
    updateDropdown();
    document.getElementById('saved-reports-dropdown').value = saveKey;
    alert("Sauvegardé sous : " + saveKey);
}

function deleteReport() {
    const targetKey = currentActiveReportKey || document.getElementById('saved-reports-dropdown').value;
    if (!targetKey) return alert("Sélectionnez un rapport.");

    if (confirm("Supprimer ce rapport définitivement ?")) {
        localStorage.removeItem(targetKey); 
        currentActiveReportKey = null; 
        clearForm(); 
        updateDropdown(); 
        alert("Supprimé.");
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

        // Chargement de la police (Assurez-vous que TAHOMA_FONT est dans pdf_templates.js)
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

        // Logique de partage iOS/Android
        const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || isMacTouch;
        
        let attemptedShare = false;
        try {
            if (isMobileDevice && navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    attemptedShare = true;
                    await navigator.share({
                        files: [file],
                        title: fileName
                    });
                }
            }
        } catch (err) {}

        if (!attemptedShare) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function() {
                const base64data = reader.result;
                const link = document.createElement('a');
                link.href = base64data;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
        }
        
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }

    } catch (error) {
        console.error("Erreur lors de l'export PDF :", error);
        alert("Erreur lors de l'export PDF. Vérifiez la console.");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) {
            btn.textContent = "📄 Exporter en PDF";
            btn.disabled = false;
        }
    }
}