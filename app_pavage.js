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

    buildEssaisMatrix();
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
// 2. GÉNÉRATION DES 3 ZONES D'ESSAIS         //
// ========================================== //

function buildEssaisMatrix() {
    const container = document.getElementById('essais-matrix-container');
    if (!container) return;

    let html = '';
    for (let i = 1; i <= 3; i++) {
        html += `
        <div class="form-section truck-card">
            <h4 style="color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 5px; margin-bottom: 15px; font-weight: bold;">
                Endroit N°${i}
            </h4>
            
            <div class="input-group" style="margin-bottom: 15px;">
                <label>Description de l'endroit</label>
                <input type="text" id="essais-${i}-endroit" placeholder="Ex: Chaussée Ouest 12+345 @ 2 m du bord gauche">
            </div>

            <label style="display:block; font-size: 0.9rem; font-weight: bold; margin-bottom: 5px; color: #64748b;">Lectures Nucléodensimètre (M.V.)</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">
                <input type="number" step="0.001" id="essais-${i}-1" oninput="calculateEssais()" placeholder=" Ex Lec 1 : 2200" style="flex: 1; min-width: 80px;">
                <input type="number" step="0.001" id="essais-${i}-2" oninput="calculateEssais()" placeholder="-" style="flex: 1; min-width: 80px;">
                <input type="number" step="0.001" id="essais-${i}-3" oninput="calculateEssais()" placeholder="-" style="flex: 1; min-width: 80px;">
                <input type="number" step="0.001" id="essais-${i}-4" oninput="calculateEssais()" placeholder="-" style="flex: 1; min-width: 80px;">
                <input type="number" step="0.001" id="essais-${i}-5" oninput="calculateEssais()" placeholder="-" style="flex: 1; min-width: 80px;">
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-bottom: 15px; background: #f1f5f9; padding: 10px; border-radius: 6px;">
                <div class="input-group"><label>Médiane</label><input type="text" id="essais-${i}-med" readonly style="background: #e2e8f0; font-weight: bold;"></div>
                <div class="input-group"><label>Int. Min</label><input type="text" id="essais-${i}-int-1" readonly style="background: #e2e8f0;"></div>
                <div class="input-group"><label>Int. Max</label><input type="text" id="essais-${i}-int-2" readonly style="background: #e2e8f0;"></div>
                <div class="input-group"><label>Moyenne</label><input type="text" id="essais-${i}-moy" readonly style="background: #e2e8f0; font-weight: bold;"></div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                <div class="input-group"><label>Épaisseur (mm)</label><input type="number" step="0.1" id="essais-${i}-epaisseur" oninput="calculateEssais()" placeholder="Ex: 150"></div>
                <div class="input-group"><label style="color: #b45309;">Densité Carotte</label><input type="number" step="0.001" id="essais-${i}-carottes" oninput="calculateEssais()" placeholder="Ex: 2,450"></div>
                <div class="input-group"><label>Comp. Nucléo (%)</label><input type="text" id="essais-${i}-c_nuc" readonly style="background: #e2e8f0; font-weight: bold;"></div>
                <div class="input-group"><label>Comp. Carotte (%)</label><input type="text" id="essais-${i}-c_carot" readonly style="background: #e2e8f0; font-weight: bold;"></div>
            </div>
        </div>
        `;
    }
    container.innerHTML = html;
}

// ========================================== //
// 3. MOTEUR MATHÉMATIQUE (CALCULS)           //
// ========================================== //

function calculateEssais() {
    const densMax = parseFloat(document.getElementById('spec-dens-max').value);
    const validDensMax = !isNaN(densMax) && densMax > 0;

    let globalMoyNuc = [], globalEpais = [], globalCarot = [], globalRawCompNuc = [], globalRawCompCarot = [];

    for (let i = 1; i <= 3; i++) {
        let readings = [];
        for (let j = 1; j <= 5; j++) {
            let val = parseFloat(document.getElementById(`essais-${i}-${j}`).value);
            if (!isNaN(val)) readings.push(val);
        }

        let avg = 0, rawCompNuc = null;

        if (readings.length > 0) {
            let sorted = [...readings].sort((a, b) => a - b);
            
            let med = sorted[Math.floor(sorted.length / 2)];
            if (sorted.length % 2 === 0) med = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
            
            // On force l'arrondi à l'unité (sans virgule)
            const roundedMed = Math.round(med);
            document.getElementById(`essais-${i}-med`).value = roundedMed;
            // Intervalle = médiane ± 120 (int-1 : borne inférieure, int-2 : borne supérieure)
            document.getElementById(`essais-${i}-int-1`).value = roundedMed - 120;
            document.getElementById(`essais-${i}-int-2`).value = roundedMed + 120;
            
            avg = Math.round(readings.reduce((sum, val) => sum + val, 0) / readings.length);
            document.getElementById(`essais-${i}-moy`).value = avg;
            globalMoyNuc.push(avg);

            if (validDensMax) {
                // Utilisation de la densité de l'eau (997,044) pour un % exact
                rawCompNuc = avg / (997.044 * densMax);
                document.getElementById(`essais-${i}-c_nuc`).value = (rawCompNuc * 100).toFixed(1);
                globalRawCompNuc.push(rawCompNuc);
            } else {
                document.getElementById(`essais-${i}-c_nuc`).value = "";
            }
        } else {
            document.getElementById(`essais-${i}-med`).value = "";
            document.getElementById(`essais-${i}-int-1`).value = "";
            document.getElementById(`essais-${i}-int-2`).value = "";
            document.getElementById(`essais-${i}-moy`).value = "";
            document.getElementById(`essais-${i}-c_nuc`).value = "";
        }

        let epais = parseFloat(document.getElementById(`essais-${i}-epaisseur`).value);
        if (!isNaN(epais)) globalEpais.push(epais);

        let carot = parseFloat(document.getElementById(`essais-${i}-carottes`).value);
        if (!isNaN(carot)) {
            globalCarot.push(carot);
            if (validDensMax) {
                let rawCompCarot = carot / densMax;
                document.getElementById(`essais-${i}-c_carot`).value = (rawCompCarot * 100).toFixed(1);
                globalRawCompCarot.push(rawCompCarot);
            } else {
                document.getElementById(`essais-${i}-c_carot`).value = "";
            }
        } else {
            document.getElementById(`essais-${i}-c_carot`).value = "";
        }
    }

    // Calcul des moyennes globales
    const setAvg = (id, arr, isRoundedToUnit) => {
        if (arr.length > 0) {
            let avg = arr.reduce((sum, val) => sum + val, 0) / arr.length;
            if (isRoundedToUnit) avg = Math.round(avg);
            document.getElementById(id).value = isRoundedToUnit ? avg : avg.toFixed(1);
            return avg;
        }
        document.getElementById(id).value = "";
        return null;
    };

    let moyNuc = setAvg('essais-moy', globalMoyNuc, true); // Arrondi à l'unité
    setAvg('essais-epaisseur', globalEpais, true);
    
    // Moyenne des densités carottes
    let moyCarot = null;
    if (globalCarot.length > 0) {
        moyCarot = globalCarot.reduce((sum, val) => sum + val, 0) / globalCarot.length;
        document.getElementById('essais-carottes').value = moyCarot.toFixed(3);
    } else {
        document.getElementById('essais-carottes').value = "";
    }

    // Affichage des moyennes de compacité
    let moyRawCompNuc = null, moyRawCompCarot = null;
    if (globalRawCompNuc.length > 0) {
        moyRawCompNuc = globalRawCompNuc.reduce((sum, val) => sum + val, 0) / globalRawCompNuc.length;
        document.getElementById('essais-c_nuc').value = (moyRawCompNuc * 100).toFixed(1);
    } else {
        document.getElementById('essais-c_nuc').value = "";
    }

    if (globalRawCompCarot.length > 0) {
        moyRawCompCarot = globalRawCompCarot.reduce((sum, val) => sum + val, 0) / globalRawCompCarot.length;
        document.getElementById('essais-c_carot').value = (moyRawCompCarot * 100).toFixed(1);
    } else {
        document.getElementById('essais-c_carot').value = "";
    }

    // Facteurs de Concordance
    if (moyNuc !== null && moyCarot !== null) {
        let concMv = (moyCarot * 997.044) - moyNuc;
        document.getElementById('conc-mv').value = Math.round(concMv); // Arrondi
    } else {
        document.getElementById('conc-mv').value = "";
    }

    if (moyRawCompNuc !== null && moyRawCompCarot !== null) {
        // Le calcul en ratio décimal * 100 garantit que (-0.01 * 100) donne -1.0%
        let concPour = (moyRawCompCarot - moyRawCompNuc) * 100;
        document.getElementById('conc-pour').value = concPour.toFixed(1);
    } else {
        document.getElementById('conc-pour').value = "";
    }
}

// ========================================== //
// 4. MOTEUR DE SAUVEGARDE                    //
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
        if (key && key.startsWith('PAVAGE_')) {
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
                }
            }
        }

        calculateEssais();
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
    
    let baseName = `englobe_${rawDate}_${noProjet}_CONC-PAVAGE_${techInitials}`;

    if (!saveKey || isDuplicate) {
        if (isDuplicate) baseName += "_copie";
        let userPromptName = prompt(isDuplicate ? "Nom pour la COPIE :" : "Nom de sauvegarde du rapport :", baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        saveKey = 'PAVAGE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    } else {
        // Mise à jour dynamique intelligente du nom de base pour refléter le no de projet actuel
        baseName = `englobe_${rawDate}_${noProjet}_CONC-PAVAGE_${techInitials}`;
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

function splitRemarquesIntelligently(text) {
    if (!text) return [];
    
    // Convertit les retours à la ligne ("Enter") en espaces pour assurer une continuité fluide
    let remaining = text.replace(/\n/g, ' ').trim();
    const lines = [];
    const limits = [50, 60, 60, 60, 60]; // Limites dynamiques par ligne

    for (let i = 0; i < limits.length; i++) {
        if (!remaining) break;
        
        let limit = limits[i];
        
        if (remaining.length <= limit) {
            lines.push(remaining);
            break;
        }
        
        // Cherche le dernier espace avant la limite pour ne pas couper un mot en deux
        let splitAt = remaining.lastIndexOf(' ', limit);
        
        // Si le mot est plus long que la ligne entière, on force la coupure
        if (splitAt === -1 || splitAt === 0) splitAt = limit; 
        
        lines.push(remaining.substring(0, splitAt).trim());
        remaining = remaining.substring(splitAt).trim();
    }
    
    return lines;
}


// ========================================== //
// 5. MOTEUR D'EXPORT PDF                     //
// ========================================== //

async function exportToPDF() {
    if (typeof TEMPLATE_PAVAGE_CONCORDANCE === 'undefined') {
        showToast("Le modèle PDF n'est pas encore intégré. Préparez-le avec Python !", "info");
        return;
    }

    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) { btn.textContent = "⏳ Génération..."; btn.disabled = true; }

        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        const pdfDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_PAVAGE_CONCORDANCE));
        pdfDoc.registerFontkit(fontkit);
        const form = pdfDoc.getForm();

        /*
        const allInputs = document.querySelectorAll('input[id], textarea[id]');
        allInputs.forEach(el => {
            const name = el.id;
            try {
                if (el.type === 'checkbox') {
                    el.checked ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck();
                } else if (el.type !== 'file' && el.type !== 'hidden') {
                    let valToPrint = el.value || "";
                    if (el.type === 'number' || el.id.includes('med') || el.id.includes('int') || el.id.includes('moy') || el.id.includes('conc') || el.id.includes('c_nuc') || el.id.includes('c_carot') || el.id.includes('carottes')) {
                        if (valToPrint.includes('.')) valToPrint = valToPrint.replace('.', ',');
                    }
                    form.getTextField(name).setText(valToPrint);
                }
            } catch (e) {} 
        });
        */

        const allInputs = document.querySelectorAll('input[id], textarea[id]');
        allInputs.forEach(el => {
            const name = el.id;
            try {
                // Interception du champ de remarques pour le découpage intelligent
                if (name === 'global-remarques') {
                    const chunks = splitRemarquesIntelligently(el.value);
                    try { form.getTextField('remarques1').setText(chunks[0] || ""); } catch(e){}
                    try { form.getTextField('remarques2').setText(chunks[1] || ""); } catch(e){}
                    try { form.getTextField('remarques3').setText(chunks[2] || ""); } catch(e){}
                    try { form.getTextField('remarques4').setText(chunks[3] || ""); } catch(e){}
                    try { form.getTextField('remarques5').setText(chunks[4] || ""); } catch(e){}
                    return; // Évite que le code essaie de remplir un champ PDF "global-remarques" qui n'existe pas
                }

                // Logique standard pour le reste des champs
                if (el.type === 'checkbox') {
                    el.checked ? form.getCheckBox(name).check() : form.getCheckBox(name).uncheck();
                } else if (el.type !== 'file' && el.type !== 'hidden') {
                    let valToPrint = el.value || "";
                    // Convertit les points en virgules strictement pour les champs numériques et calculés
                    if (el.type === 'number' || el.id.match(/(med|int|moy|conc|c_nuc|c_carot|carottes|epaisseur|ecart|dens-max|essais-\d-[1-5]$)/)) {
                        valToPrint = String(valToPrint).replace(/\./g, ',');
                    }/*
                    if (el.type === 'number' || el.id.includes('med') || el.id.includes('int') || el.id.includes('moy') || el.id.includes('conc') || el.id.includes('c_nuc') || el.id.includes('c_carot') || el.id.includes('carottes')) {
                        if (valToPrint.includes('.')) valToPrint = valToPrint.replace('.', ',');
                    }*/
                    form.getTextField(name).setText(valToPrint);
                }
            } catch (e) {} 
        });

        try {
            const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
            const tahomaFont = await pdfDoc.embedFont(fontBytes);
            form.updateFieldAppearances(tahomaFont);
            if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch(e) {}

        const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const techName = document.getElementById('sig-prep-nom')?.value || '';
        const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await pdfDoc.save();
        const fileName = `Concordance_${rawDate}_${noProjet}_${techInitials}.pdf`;

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
        console.error(error);
        showToast("Erreur lors de l'export PDF.", "error");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if (btn) { btn.textContent = "📄 Exporter en PDF"; btn.disabled = false; }
    }
}