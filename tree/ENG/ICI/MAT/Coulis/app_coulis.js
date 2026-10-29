// ========================================== //
// 1. INITIALISATION ET UI GLOBALE            //
// ========================================== //

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.getElementById('main-logo');
    if (logoEl && typeof LOGO_BASE64 !== 'undefined') {
        logoEl.src = LOGO_BASE64;
    }

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    // Créer les 3 cartes d'essais obligatoires au démarrage
    const container = document.getElementById('essais-container');
    if (container && container.children.length === 0) {
        for(let i=0; i<3; i++) {
            addEssai(false); // false = impossible de les supprimer
        }
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

function showTab(tabId, event) {
    document.querySelectorAll('.tab-section').forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

function toggleAccordion(headerElement) {
    const content = headerElement.nextElementSibling;
    const chevron = headerElement.querySelector('.chevron');
    
    content.classList.toggle('active');
    chevron.classList.toggle('rotated');
}

function collapseAllEssais() {
    document.querySelectorAll('.sample-card .accordion-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.sample-card .chevron').forEach(chevron => {
        chevron.classList.add('rotated');
    });
}

// ========================================== //
// 2. GESTION DYNAMIQUE DES CARTES D'ESSAIS   //
// ========================================== //

function addEssai(canDelete = true) {
    const container = document.getElementById('essais-container');
    const template = document.getElementById('template-essai');
    if(!template) return;

    const currentCards = container.querySelectorAll('.sample-card').length;
    const nextIndex = currentCards + 1;

    let templateHTML = template.innerHTML.replace(/__INDEX__/g, nextIndex);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = templateHTML;
    const newCard = tempDiv.firstElementChild;
    
    // Cacher le bouton de suppression pour les 3 premières cartes
    if (!canDelete) {
        const delBtn = newCard.querySelector('.delete-btn');
        if (delBtn) delBtn.style.display = 'none';
    }
    
    container.appendChild(newCard);
    reindexCards();
}

function deleteEssai(btn, event) {
    event.stopPropagation();
    if(confirm("Voulez-vous vraiment supprimer cet essai ?")) {
        const card = btn.closest('.sample-card');
        card.remove();
        reindexCards();
        updateGlobalEchNumbers();
    }
}

function reindexCards() {
    const cards = document.querySelectorAll('.sample-card');
    cards.forEach((card, index) => {
        const realIndex = index + 1;
        const label = card.querySelector('.card-index-label');
        if(label) label.textContent = realIndex;
    });
}

// Attacher l'écouteur d'événement pour la mise à jour automatique de l'en-tête (No1 @ NoX)
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('essais-no-ech')) {
        updateGlobalEchNumbers();
    }
});

function updateGlobalEchNumbers() {
    const inputs = document.querySelectorAll('.essais-no-ech');
    const numbers = Array.from(inputs).map(input => input.value.trim()).filter(val => val !== '');
    const globalEchInput = document.getElementById('global-no-ech');
    if(!globalEchInput) return;

    if (numbers.length === 0) {
        globalEchInput.value = '';
    } else if (numbers.length === 1) {
        globalEchInput.value = `no ${numbers[0]}`;
    } else {
        globalEchInput.value = `no ${numbers[0]} @ no ${numbers[numbers.length - 1]}`;
    }
}

// ========================================== //
// 3. GESTION DES DONNÉES ET SAUVEGARDE       //
// ========================================== //

let currentActiveReportKey = null;

function updateLastSavedStatus(timestamp = Date.now()) {
    const status = document.getElementById('last-saved-status');
    if (status) {
        const date = new Date(timestamp);
        status.textContent = `Dernière sauvegarde : ${date.toLocaleDateString('fr-CA')} - ${date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'H')}`;
    }
}

function updateDropdown() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '<option value="">-- Sélectionnez un rapport --</option>';
    
    let savedReports = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('COULIS_')) {
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
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return;
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
    });
    
    const container = document.getElementById('essais-container');
    if (container) {
        container.innerHTML = '';
        for(let i=0; i<3; i++) addEssai(false);
    }
    updateGlobalEchNumbers();
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
    showToast("Écran réinitialisé.", "success");
}

function saveReport(isDuplicate = false) {
    let saveKey = currentActiveReportKey;

    const noProjet = document.getElementById('global-no-projet')?.value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date')?.value || new Date().toISOString().split('T')[0];
    const techName = document.getElementById('sig-prep-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `englobe_${rawDate}_${noProjet}_COULIS_${techInitials}`;

    if (!saveKey || isDuplicate) {
        if (isDuplicate) baseName += "_copie";
        let userPromptName = prompt(isDuplicate ? "Nom pour la COPIE :" : "Nom de sauvegarde du rapport :", baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        saveKey = 'COULIS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    } else {
        baseName = `englobe_${rawDate}_${noProjet}_COULIS_${techInitials}`;
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown' || el.type === 'file') return; 
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const samplesData = [];
    document.querySelectorAll('.sample-card').forEach(card => {
        const data = {};
        card.querySelectorAll('input, select').forEach(input => {
            const cls = Array.from(input.classList).find(c => c.startsWith('essais-'));
            if (cls) {
                data[cls] = input.type === 'checkbox' ? input.checked : input.value;
            }
        });
        samplesData.push(data);
    });

    const reportData = {
        displayName: baseName, 
        static: staticData,
        samples: samplesData,
        timestamp: new Date().getTime()
    };

    localStorage.setItem(saveKey, JSON.stringify(reportData));
    currentActiveReportKey = saveKey; 
    updateLastSavedStatus(reportData.timestamp);
    updateDropdown();
    document.getElementById('saved-reports-dropdown').value = saveKey;
    showToast(isDuplicate ? "Copie sauvegardée." : "Rapport sauvegardé.", "success");
}

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const selectedKey = dropdown.value;
    if (!selectedKey) { showToast("Veuillez sélectionner un rapport.", "info"); return; }

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

        const container = document.getElementById('essais-container');
        if (reportData.samples && reportData.samples.length > 0) {
            container.innerHTML = '';
            reportData.samples.forEach((sampleInfo, index) => {
                addEssai(index >= 3);
                const currentCard = container.lastElementChild;
                Object.keys(sampleInfo).forEach(className => {
                    const input = currentCard.querySelector('.' + className);
                    if (input) {
                        if (input.type === 'checkbox') input.checked = sampleInfo[className];
                        else input.value = sampleInfo[className];
                    }
                });
            });
        }

        updateGlobalEchNumbers();
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
// 4. MOTEUR D'EXPORT PDF MULTI-PAGES         //
// ========================================== //

function splitTextIntelligently(text, maxChars) {
    if (!text) return [];
    let remaining = text.replace(/\n/g, ' ').trim();
    const lines = [];
    while (remaining.length > 0) {
        if (remaining.length <= maxChars) {
            lines.push(remaining);
            break;
        }
        let splitAt = remaining.lastIndexOf(' ', maxChars);
        if (splitAt === -1 || splitAt === 0) splitAt = maxChars; 
        lines.push(remaining.substring(0, splitAt).trim());
        remaining = remaining.substring(splitAt).trim();
    }
    return lines;
}

function formatNum(val, type = 'int') {
    if (val === "" || val === null || val === undefined || isNaN(val)) return "";
    const n = parseFloat(val);
    if (type === 'temp' || type === 'percent') return n.toFixed(1).replace('.', ',');
    if (type === 'ep') return n.toFixed(3).replace('.', ',');
    return Math.round(n).toString();
}

async function exportToPDF() {
    if (typeof TEMPLATE_COULIS === 'undefined') {
        showToast("Le modèle PDF TEMPLATE_COULIS n'est pas encore intégré dans tpl_coulis.js !", "error");
        return;
    }

    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) { btn.textContent = "⏳ Génération..."; btn.disabled = true; }

        const getBuffer = (base64) => {
            const str = window.atob(base64.includes(',') ? base64.split(',')[1] : base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        const finalPdf = await PDFLib.PDFDocument.create();
        if (typeof fontkit !== 'undefined') finalPdf.registerFontkit(fontkit);
        
        let tahomaFont = null;
        if (typeof TAHOMA_FONT !== 'undefined') {
            const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
            tahomaFont = await finalPdf.embedFont(fontBytes);
        }

        const cards = document.querySelectorAll('.sample-card');
        const numEssais = cards.length;
        const totalPages = Math.max(1, Math.ceil(numEssais / 3));

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            const tempPdf = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_COULIS));
            if (typeof fontkit !== 'undefined') tempPdf.registerFontkit(fontkit);
            const form = tempPdf.getForm();

            const trySetText = (id, val) => { try { form.getTextField(id).setText(val || ''); } catch(e){} };
            const trySetCheck = (id, isChecked) => { try { isChecked ? form.getCheckBox(id).check() : form.getCheckBox(id).uncheck(); } catch(e){} };

            // Champs globaux (Répétés sur toutes les pages)
            trySetText('global-client', document.getElementById('global-client').value);
            trySetText('global-ref-client', document.getElementById('global-ref-client').value);
            trySetText('global-no-projet', document.getElementById('global-no-projet').value);
            trySetText('global-date', document.getElementById('global-date').value);
            trySetText('global-endroit', document.getElementById('global-endroit').value);
            trySetText('global-entrepreneur', document.getElementById('global-entrepreneur').value);
            trySetText('global-soustraitant', document.getElementById('global-soustraitant').value);
            trySetText('sig-prep-nom', document.getElementById('sig-prep-nom').value);
            trySetText('global-no-ech', document.getElementById('global-no-ech').value);

            // Gestion des champs multi-lignes
            const projetLines = splitTextIntelligently(document.getElementById('global-projet').value, 50);
            trySetText('global-projet-1', projetLines[0]);
            trySetText('global-projet-2', projetLines[1]);

            const lieuLines = splitTextIntelligently(document.getElementById('lieu-travaux').value, 55);
            for(let i=0; i<8; i++) {
                trySetText(`lieu-travaux-${i+1}`, lieuLines[i]);
            }

            // Exigences & Spécifications
            trySetCheck('exi-astm', document.getElementById('exi-astm').checked);
            trySetCheck('exi-csa', document.getElementById('exi-csa').checked);
            trySetText('spec-res-mpa', formatNum(document.getElementById('spec-res-mpa').value, 'int'));
            trySetText('spec-res-jour', formatNum(document.getElementById('spec-res-jour').value, 'int'));
            trySetText('spec-exptotate', formatNum(document.getElementById('spec-exptotate').value, 'percent'));
            trySetText('spec-tempsmalax', formatNum(document.getElementById('spec-tempsmalax').value, 'int'));
            trySetText('spec-exsudation', formatNum(document.getElementById('spec-exsudation').value, 'percent'));
            trySetText('spec-ep', formatNum(document.getElementById('spec-ep').value, 'ep'));
            trySetText('spec-temper', formatNum(document.getElementById('spec-temper').value, 'temp'));

            // Formule & Remarques
            trySetText('formule-prod', document.getElementById('formule-prod').value);
            trySetText('formule-eau', document.getElementById('formule-eau').value);
            trySetText('formule-ep', formatNum(document.getElementById('formule-ep').value, 'ep'));
            trySetText('formule-adjuvant', document.getElementById('formule-adjuvant').value);
            trySetText('formule-agent', document.getElementById('formule-agent').value);
            trySetText('rem-malax', document.getElementById('rem-malax').value);
            trySetText('rem-pompe', document.getElementById('rem-pompe').value);
            trySetText('rem-no-moules', document.getElementById('rem-no-moules').value); // Souvent alphanumérique (ex: M-12)
            trySetText('rem-no-pilon', document.getElementById('rem-no-pilon').value);
            trySetText('rem-no-cone', document.getElementById('rem-no-cone').value);

            // Boucle sur les 3 cartes d'essais allouées pour la page courante
            for (let slot = 1; slot <= 3; slot++) {
                const essaiIndex = (pageIdx * 3) + (slot - 1);
                if (essaiIndex < numEssais) {
                    const card = cards[essaiIndex];
                    const getVal = (cls) => card.querySelector('.' + cls) ? card.querySelector('.' + cls).value : '';
                    
                    trySetText(`essais-no-ech-${slot}`, getVal('essais-no-ech'));
                    trySetText(`essais-prelev-date-${slot}`, getVal('essais-prelev-date'));
                    trySetText(`essais-prelev-heure-${slot}`, getVal('essais-prelev-heure'));
                    
                    trySetText(`essais-exsudation-${slot}`, formatNum(getVal('essais-exsudation'), 'percent'));
                    trySetText(`essais-expansion-${slot}`, formatNum(getVal('essais-expansion'), 'percent'));
                    trySetText(`essais-fluidite-malax-${slot}`, formatNum(getVal('essais-fluidite-malax'), 'int'));
                    trySetText(`essais-fluidite-sortie-${slot}`, formatNum(getVal('essais-fluidite-sortie'), 'int'));
                    
                    trySetText(`essais-temp-eau-${slot}`, formatNum(getVal('essais-temp-eau'), 'temp'));
                    trySetText(`essais-temp-coulis-${slot}`, formatNum(getVal('essais-temp-coulis'), 'temp'));
                    trySetText(`essais-temp-prod-${slot}`, formatNum(getVal('essais-temp-prod'), 'temp'));
                    
                    trySetText(`essais-inj-deb-${slot}`, getVal('essais-inj-deb'));
                    trySetText(`essais-inj-fin-${slot}`, getVal('essais-inj-fin'));
                    trySetText(`essais-pressi-inj-${slot}`, formatNum(getVal('essais-pressi-inj'), 'int'));
                    trySetText(`essais-press-maint-${slot}`, formatNum(getVal('essais-press-maint'), 'int'));
                    
                    trySetText(`essais-3j-${slot}`, formatNum(getVal('essais-3j'), 'int'));
                    trySetText(`essais-7j-${slot}`, formatNum(getVal('essais-7j'), 'int'));
                    trySetText(`essais-28j-${slot}`, formatNum(getVal('essais-28j'), 'int'));
                    trySetText(`essais-xj-${slot}`, formatNum(getVal('essais-xj'), 'int'));
                    trySetText(`essais-nb-norm-${slot}`, formatNum(getVal('essais-nb-norm'), 'int'));
                    trySetText(`essais-nb-tem-${slot}`, formatNum(getVal('essais-nb-tem'), 'int'));
                    trySetText(`essais-sac-1-${slot}`, formatNum(getVal('essais-sac-1'), 'int'));
                    trySetText(`essais-sac-2-${slot}`, formatNum(getVal('essais-sac-2'), 'int'));
                }
            }

            try {
                if(tahomaFont) form.updateFieldAppearances(tahomaFont);
                if(form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch(e) {}

            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_pg' + pageIdx); } catch(e){} });

            const copiedPages = await finalPdf.copyPages(tempPdf, tempPdf.getPageIndices());
            copiedPages.forEach(page => finalPdf.addPage(page));
        }

        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
        
        const fileName = `Rapport_Coulis_${rawDate}_${noProjet}_${techInitials}.pdf`;
        const pdfBytes = await finalPdf.save();

        // BIFURCATION : APPLICATION ANDROID vs WEB[cite: 10]
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const pdfBase64 = await finalPdf.saveAsBase64();
                const { Filesystem, FileOpener } = window.Capacitor.Plugins;
                
                if (!Filesystem || !FileOpener) throw new Error("Plugins Capacitor introuvables.");
                
                const resultat = await Filesystem.writeFile({
                    path: fileName,
                    data: pdfBase64,
                    directory: 'CACHE',
                    recursive: true
                });

                await FileOpener.open({ 
                    filePath: resultat.uri, 
                    contentType: 'application/pdf' 
                });
            } catch (err) {
                console.error("Erreur native :", err);
                alert("ERREUR TECHNIQUE : " + (err.message || JSON.stringify(err)));
            }
        } else {
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
        showToast("Génération PDF réussie !");

    } catch (error) {
        console.error(error);
        showToast("Erreur lors de l'export PDF. TEMPLATE_COULIS est-il présent ?", "error");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) { btn.textContent = "📄 Exporter en PDF"; btn.disabled = false; }
    }
}