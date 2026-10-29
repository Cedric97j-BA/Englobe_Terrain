// ========================================== //
// 1. NAVIGATION ET INITIALISATION            //
// ========================================== //

document.addEventListener('DOMContentLoaded', () => {
    const logoEl = document.getElementById('main-logo');
    if (logoEl && typeof LOGO_BASE64 !== 'undefined') {
        logoEl.src = LOGO_BASE64;
    }

    if (document.getElementById('passes-container').children.length === 0) {
        addPass();
        addPass();
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
    const allTabs = document.querySelectorAll('.tab-section');
    allTabs.forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';

    const allButtons = document.querySelectorAll('.tab-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// ========================================== //
// 2. GESTION DES PASSES ET MOTEUR MATHÉMATIQUE //
// ========================================== //

function addPass() {
    const container = document.getElementById('passes-container');
    const template = document.getElementById('pass-template');
    const clone = template.content.cloneNode(true);
    
    clone.querySelectorAll('.trigger').forEach(input => {
        input.addEventListener('input', calculateAll);
        input.addEventListener('change', calculateAll);
    });

    container.appendChild(clone);
    calculateAll();
}

let myChart = null; 

function calculateAll() {
    const cards = document.querySelectorAll('.pass-card');
    let prevMv = null, stableGaps = 0;
    let allFormsFilled = true, validSequence = true;
    let prevPassNum = 0; 
    const validPasses = []; 
    
    const finalBox = document.getElementById('final-result-box');
    const targetAlert = document.getElementById('target-alert');
    const btnAdd = document.getElementById('btn-add');

    if (finalBox) finalBox.style.display = 'none';
    if (targetAlert) targetAlert.style.display = 'none';
    if (btnAdd) btnAdd.style.display = 'block';

    cards.forEach((card, i) => {
        let mvAvg = getStrictAverageAndHighlight(Array.from(card.querySelectorAll('.den-val')));
        if (mvAvg !== null) mvAvg = Math.round(mvAvg);
        let humAvg = getStrictAverageAndHighlight(Array.from(card.querySelectorAll('.hum-val')));
        const passInput = card.querySelector('.pass-num');
        const currentPassNum = parseInt(passInput.value);

        if (currentPassNum) {
            if (currentPassNum <= prevPassNum) {
                passInput.classList.add('highlight-empty');
                validSequence = false;
            } else {
                passInput.classList.remove('highlight-empty');
            }
            prevPassNum = currentPassNum;
        }

        if (mvAvg !== null && currentPassNum) {
            validPasses.push({ pass: currentPassNum, mv: mvAvg, hum: humAvg });
        }

        card.querySelector('.den-avg').textContent = mvAvg !== null ? mvAvg.toString().replace('.', ',') : '---';
        card.querySelector('.hum-avg').textContent = humAvg !== null ? humAvg.toFixed(1).replace('.', ',') : '---';

        if (mvAvg === null || humAvg === null || !passInput.value || !card.querySelector('.sd-select').value) {
            allFormsFilled = false;
        }

        let deltaDisp = card.querySelector('.delta-mv');
        if (i === 0) {
            deltaDisp.textContent = 'N/A';
        } else if (prevMv !== null && mvAvg !== null && prevMv !== 0) {
            let delta = Math.abs(((mvAvg - prevMv) / prevMv) * 100);
            deltaDisp.textContent = delta.toFixed(2).replace('.', ',') + '%';
            stableGaps = delta < 1.0 ? stableGaps + 1 : 0;
        } else {
            deltaDisp.textContent = '---';
        }

        if (mvAvg !== null) prevMv = mvAvg;
    });

    if (stableGaps >= 2) {
        if (btnAdd) btnAdd.style.display = 'none';
        if (allFormsFilled && validSequence && validPasses.length >= 2) {
            if (finalBox) finalBox.style.display = 'block';
            const [prev, last] = [validPasses[validPasses.length - 2], validPasses[validPasses.length - 1]];
            
            const isLastHigher = last.mv >= prev.mv;
            
            document.getElementById('final-pass-opt').textContent = isLastHigher ? last.pass : prev.pass;
            document.getElementById('final-mv-opt').textContent = (isLastHigher ? last.mv : prev.mv).toString().replace('.', ',');
            document.getElementById('final-w-opt').textContent = (isLastHigher ? last.hum : prev.hum).toFixed(1).replace('.', ',');
            
            drawChart(validPasses);
        } else if (!validSequence) {
            if (targetAlert) {
                targetAlert.style.display = 'block';
                targetAlert.textContent = "⚠️ Erreur : Le nombre de passes doit toujours augmenter.";
            }
        } else {
            if (targetAlert) {
                targetAlert.style.display = 'block';
                targetAlert.textContent = "🎯 Cible atteinte (< 1%). Veuillez remplir tous les champs.";
            }
        }
    }
}

function getStrictAverageAndHighlight(inputs) {
    let sum = 0, count = 0;
    inputs.forEach(i => { if (i.value !== '') { sum += parseFloat(i.value); count++; } });
    inputs.forEach(i => i.classList.toggle('highlight-empty', count > 0 && count < 3 && i.value === ''));
    return count === 3 ? (sum / 3) : null; 
}

function drawChart(data) {
    try {
        const canvas = document.getElementById('densityChart');
        if (!canvas) return;
        
        canvas.style.height = '350px';
        canvas.style.minHeight = '350px';
        canvas.style.maxHeight = '350px';
        
        const ctx = canvas.getContext('2d');
        if (myChart) myChart.destroy(); 
        
        const mvs = data.map(d => d.mv).filter(v => v !== null && !isNaN(v));
        let yMin = 2000, yMax = 2500;
        
        if (mvs.length > 0) {
            const minMv = Math.min(...mvs);
            const maxMv = Math.max(...mvs);
            yMin = Math.floor((minMv - 20) / 50) * 50;
            yMax = Math.ceil((maxMv + 20) / 50) * 50;
        }

        const maxPass = data.length > 0 ? data[data.length - 1].pass : 10;
        const labels = [];
        for (let i = 0; i <= maxPass + 2; i++) {
            labels.push(i);
        }

        const chartData = labels.map(labelNum => {
            const found = data.find(d => d.pass === labelNum);
            return found ? found.mv : null; 
        });

        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
                    borderColor: 'black',        
                    backgroundColor: 'black',    
                    tension: 0.4, 
                    borderWidth: 4, 
                    pointRadius: 6, 
                    pointBackgroundColor: 'black',
                    spanGaps: true 
                }]
            },
            options: {
                animation: false, 
                responsive: true,
                maintainAspectRatio: false, 
                layout: {
                    padding: { left: 10, right: 20, top: 20, bottom: 10 } 
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { 
                        grid: { color: '#e5e7eb' },
                        title: { 
                            display: true, 
                            text: 'Nombre de passes (n)', 
                            color: 'black',
                            font: { weight: 'bold', size: 16 }, 
                            padding: { top: 10 }
                        },
                        ticks: {
                            color: 'black',
                            maxRotation: 0,
                            font: { size: 14, weight: 'bold' },
                            callback: function(val, index) {
                                const passNum = labels[index];
                                return (passNum % 2 === 0) ? passNum : ''; 
                            }
                        }
                    },
                    y: { 
                        min: yMin, 
                        max: yMax,
                        grid: { color: '#e5e7eb' },
                        title: { 
                            display: true, 
                            text: 'Masse volumique sèche moyenne (kg/m³)', 
                            color: 'black',
                            font: { weight: 'bold', size: 16 },
                            padding: { bottom: 15 } 
                        },
                        ticks: { 
                            color: 'black',
                            stepSize: 50, 
                            font: { size: 14, weight: 'bold' },
                            callback: function(value) { return value; } 
                        } 
                    }
                }
            }
        });
    } catch (e) {
        console.warn("Erreur de génération du graphique:", e);
    }
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
/*
function updateDropdown() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">-- Sélectionnez un rapport --</option>';
    
    let savedKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('planche_')) {
            savedKeys.push(key);
        }
    }

    savedKeys.sort().forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        const displayName = key.replace('planche_', '').replace(/_/g, ' ');
        option.textContent = displayName;
        dropdown.appendChild(option);
    });

    if (currentActiveReportKey) {
        dropdown.value = currentActiveReportKey;
    }
} */

function updateDropdown() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">-- Sélectionnez un rapport --</option>';
    
    let savedReports = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        try {
            // 1. Anciens rapports (Sauvegardés sans ID)
            if (key && key.startsWith('planche_')) {
                const displayName = key.replace('planche_', '').replace(/_/g, ' ');
                savedReports.push({ key: key, display: displayName });
            } 
            // 2. Nouveaux rapports (Sauvegardés avec ID unique)
            else if (key && key.startsWith('ID_')) {
                const dataStr = localStorage.getItem(key);
                if (dataStr && dataStr.includes('{')) {
                    const data = JSON.parse(dataStr);
                    if (data && data.displayName && data.displayName.startsWith('planche_')) {
                        const displayName = data.displayName.replace('planche_', '').replace(/_/g, ' ');
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
        option.value = report.key; // La vraie clé système (planche_... ou ID_...)
        option.textContent = report.display; // Le nom propre et formaté
        dropdown.appendChild(option);
    });

    // Garder le rapport actuel sélectionné dans la liste
    if (currentActiveReportKey) {
        dropdown.value = currentActiveReportKey;
    }
}

function clearForm() {
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(el => {
        if (el.id === 'saved-reports-dropdown') return; 
        if (el.type === 'checkbox') {
            el.checked = false;
        } else {
            el.value = '';
        }
    });

    const passesContainer = document.getElementById('passes-container');
    if (passesContainer) passesContainer.innerHTML = '';
    
    addPass();
    addPass();
    calculateAll();
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

    showToast("Écran réinitialisé. Vous pouvez commencer un nouveau rapport de planche.", "info");
}

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    const selectedKey = dropdown.value;

    if (!selectedKey) {
        showToast("Veuillez d'abord sélectionner un rapport sauvegardé dans la liste déroulante.", "error");
        return;
    }

    const reportDataStr = localStorage.getItem(selectedKey);
    if (!reportDataStr) return;

    clearForm();
    let reportData;
    try {
        reportData = JSON.parse(reportDataStr);
    } catch (error) {
        console.error("Rapport de planche invalide", error);
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
                    el.dispatchEvent(new Event('change'));
                } else {
                    el.value = value;
                }
            }
        }
    }

    if (reportData.passes && Array.isArray(reportData.passes)) {
        const container = document.getElementById('passes-container');
        container.innerHTML = '';
        
        reportData.passes.forEach(passInfo => {
            addPass();
            const cards = container.querySelectorAll('.pass-card');
            const card = cards[cards.length - 1];
            
            card.querySelector('.pass-num').value = passInfo.passNum || '';
            
            const denInputs = card.querySelectorAll('.den-val');
            if (denInputs[0]) denInputs[0].value = passInfo.den1 || '';
            if (denInputs[1]) denInputs[1].value = passInfo.den2 || '';
            if (denInputs[2]) denInputs[2].value = passInfo.den3 || '';
            
            const humInputs = card.querySelectorAll('.hum-val');
            if (humInputs[0]) humInputs[0].value = passInfo.hum1 || '';
            if (humInputs[1]) humInputs[1].value = passInfo.hum2 || '';
            if (humInputs[2]) humInputs[2].value = passInfo.hum3 || '';
            
            card.querySelector('.sd-select').value = passInfo.sdMode || '';
        });
        calculateAll();
    }

    currentActiveReportKey = selectedKey; 
    dropdown.value = selectedKey;
    showToast("Rapport chargé avec succès.", "success");
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function saveReport(isDuplicate = false) {
    let saveKey = currentActiveReportKey;

    // 1. On recalcule TOUJOURS le nom de base avec les champs actuels
    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const calibre = document.getElementById('info-calibre')?.value.trim() || 'Calibre';
    const techName = document.getElementById('sig-prep-nom')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `planche_${rawDate}_${noProjet}_${calibre}_${techInitials}`;

    // 2. Demande un nom SEULEMENT si c'est un nouveau rapport ou une copie
    if (!saveKey || isDuplicate) {
        const promptMsg = isDuplicate ? "Nom pour la COPIE du rapport :" : "Nom de sauvegarde du rapport (modifiable) :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('planche_')) baseName = `planche_${baseName}`;

        // Création de l'identifiant unique invisible
        saveKey = 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return;
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const passesData = [];
    document.querySelectorAll('.pass-card').forEach(card => {
        const denInputs = card.querySelectorAll('.den-val');
        const humInputs = card.querySelectorAll('.hum-val');
        passesData.push({
            passNum: card.querySelector('.pass-num').value,
            den1: denInputs[0]?.value || '',
            den2: denInputs[1]?.value || '',
            den3: denInputs[2]?.value || '',
            hum1: humInputs[0]?.value || '',
            hum2: humInputs[1]?.value || '',
            hum3: humInputs[2]?.value || '',
            sdMode: card.querySelector('.sd-select').value
        });
    });

    const reportData = {
        displayName: baseName, // <-- Le nom que le technicien voit
        static: staticData,
        passes: passesData,
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

let deleteArmed = false;
let deleteTimeout = null;

function deleteReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const targetKey = currentActiveReportKey || (dropdown ? dropdown.value : null);

    if (!targetKey) {
        showToast("Veuillez sélectionner un rapport sauvegardé dans la liste pour le supprimer.", "info");
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
    showToast("Le rapport a été supprimé avec succès.", "success");
    
    currentActiveReportKey = null; 
    clearForm(); 
    updateDropdown(); 
}

// ========================================== //
// 4. MOTEUR D'EXPORT PDF (PDF-LIB BASE64)    //
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

        const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_PLANCHE));
        subDoc.registerFontkit(fontkit);
        const form = subDoc.getForm();
        
        // ========================================================
        // REVERSE-MAPPING ENGINE
        // ========================================================
        form.getFields().forEach(field => {
            const pdfName = field.getName();
            let val = null;

            let el = document.getElementById(pdfName);
            if (el) {
                if (el.tagName === 'SPAN' || el.tagName === 'DIV') val = el.textContent; 
                else if (el.type === 'checkbox') val = el.checked;
                else val = el.value;
            } 
            else if (pdfName.startsWith('pass-')) {
                const parts = pdfName.split('-');
                if (parts.length >= 3) {
                    const row = parseInt(parts[1]); 
                    const prop = parts.slice(2).join('-'); 
                    
                    const passes = document.querySelectorAll('.pass-card');
                    if (row > 0 && row <= passes.length) {
                        const card = passes[row - 1];
                        
                        if (prop === 'num') val = card.querySelector('.pass-num').value;
                        else if (prop === 'den-1') val = card.querySelectorAll('.den-val')[0]?.value;
                        else if (prop === 'den-2') val = card.querySelectorAll('.den-val')[1]?.value;
                        else if (prop === 'den-3') val = card.querySelectorAll('.den-val')[2]?.value;
                        else if (prop === 'den-avg') val = card.querySelector('.den-avg').textContent;
                        else if (prop === 'hum-1') val = card.querySelectorAll('.hum-val')[0]?.value;
                        else if (prop === 'hum-2') val = card.querySelectorAll('.hum-val')[1]?.value;
                        else if (prop === 'hum-3') val = card.querySelectorAll('.hum-val')[2]?.value;
                        else if (prop === 'hum-avg') val = card.querySelector('.hum-avg').textContent;
                        else if (prop === 'delta') {
                            const dText = card.querySelector('.delta-mv').textContent;
                            val = (dText !== '---' && dText !== 'N/A') ? dText : '';
                        }
                        else if (prop === 'sd') val = card.querySelector('.sd-select').value;
                    }
                }
            }

            if (val !== null && val !== undefined && val !== '---' && val !== '') {
                try {
                    let finalStr = val.toString();
                    
                    // EXCLUSION TOTALE : Si le champ concerne un numéro de projet, on garde le point (ex: 2026.04)
                    const lowerName = pdfName.toLowerCase();
                    const isProjectNumber = lowerName.includes('projet') || lowerName.includes('no-') || lowerName.includes('numero');
                    
                    if (!isProjectNumber) {
                        finalStr = finalStr.replace(/(\d)\.(\d)/g, '$1,$2');
                    }

                    if (typeof field.setText === 'function') {
                        field.setText(finalStr);
                    } else if (typeof field.select === 'function') {
                        try { field.addOptions([finalStr]); } catch(e) {}
                        field.select(finalStr);
                    } else if (typeof field.check === 'function') {
                        if (val === true) field.check();
                        else field.uncheck();
                    }
                } catch (e) {
                    console.warn(`Warning: Could not set PDF field ${pdfName}`, e);
                }
            }
        });

        try {
            const subFont = await subDoc.embedFont(fontBytes);
            form.updateFieldAppearances(subFont);
            if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch (e) {}

        // ========================================================
        // 4. MAPPAGE DU GRAPHIQUE (BORDURE INVISIBLE & COINS RONDS)
        // ========================================================
        let rect = null;
        try {
            const chartField = form.getButton('densityChart');
            if (chartField) {
                const widget = chartField.acroField.getWidgets()[0];
                rect = widget.getRectangle();
                form.removeField(chartField); // FIX 1 : Passer l'objet chartField, pas la string 'densityChart'
            }
        } catch (e) {
            console.warn("Impossible de trouver le bouton densityChart", e);
        }

        const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));

        try {
            const canvas = document.getElementById('densityChart');
            // FIX 2 : Vérifier que myChart n'est pas null (ou récupérer l'instance Chart.js du canvas)
            const activeChart = (typeof myChart !== 'undefined' && myChart !== null)
                ? myChart
                : (typeof Chart !== 'undefined' && canvas ? Chart.getChart(canvas) : null);
            
            if (canvas && rect && activeChart) {
                const tabSection = canvas.closest('.tab-section');
                let wasHidden = false;
                if (tabSection && window.getComputedStyle(tabSection).display === 'none') {
                    wasHidden = true;
                    tabSection.style.display = 'block'; 
                    tabSection.style.visibility = 'hidden'; 
                    tabSection.style.position = 'absolute'; 
                    await new Promise(resolve => setTimeout(resolve, 50)); 
                }

                const originalWidth = canvas.style.width;
                const originalHeight = canvas.style.height;
                const originalMaxHeight = canvas.style.maxHeight;
                const originalMinHeight = canvas.style.minHeight;

                const oldAnimation = activeChart.options.animation;
                activeChart.options.animation = false;

                canvas.style.width = (rect.width * 3) + 'px'; 
                canvas.style.height = (rect.height * 3) + 'px'; 
                canvas.style.maxHeight = 'none'; 
                canvas.style.minHeight = 'none'; 
                
                activeChart.resize();
                if (typeof activeChart.update === 'function') activeChart.update('none'); 

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tCtx = tempCanvas.getContext('2d');
                
                const cornerRadius = tempCanvas.width * 0.015; 
                tCtx.beginPath();
                tCtx.moveTo(cornerRadius, 0);
                tCtx.lineTo(tempCanvas.width - cornerRadius, 0);
                tCtx.quadraticCurveTo(tempCanvas.width, 0, tempCanvas.width, cornerRadius);
                tCtx.lineTo(tempCanvas.width, tempCanvas.height - cornerRadius);
                tCtx.quadraticCurveTo(tempCanvas.width, tempCanvas.height, tempCanvas.width - cornerRadius, tempCanvas.height);
                tCtx.lineTo(cornerRadius, tempCanvas.height);
                tCtx.quadraticCurveTo(0, tempCanvas.height, 0, tempCanvas.height - cornerRadius);
                tCtx.lineTo(0, cornerRadius);
                tCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
                tCtx.closePath();
                tCtx.clip();

                tCtx.fillStyle = 'white';
                tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tCtx.drawImage(canvas, 0, 0);

                const chartImageBase64 = tempCanvas.toDataURL('image/png', 1.0);
                const pngImageBytes = await fetch(chartImageBase64).then(res => res.arrayBuffer());
                const pdfImage = await mergedPdf.embedPng(pngImageBytes);

                canvas.style.width = originalWidth;
                canvas.style.height = originalHeight;
                canvas.style.maxHeight = originalMaxHeight;
                canvas.style.minHeight = originalMinHeight;
                activeChart.options.animation = oldAnimation;
                activeChart.resize();

                if (wasHidden && tabSection) {
                    tabSection.style.display = 'none';
                    tabSection.style.visibility = ''; 
                    tabSection.style.position = '';
                }

                const finalPages = mergedPdf.getPages();
                finalPages[0].drawImage(pdfImage, {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width, 
                    height: rect.height 
                });
            }
        } catch (e) {
            console.warn("Erreur lors de la génération de l'image du graphique", e);
        }
        // ========================================================

        const noProjetVal = document.getElementById('global-no-projet')?.value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date')?.value || new Date().toISOString().split('T')[0];
        const calibreVal = document.getElementById('info-calibre')?.value.trim() || 'Calibre';
        const techNameVal = document.getElementById('sig-prep-nom')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        // FIX 3 : Utiliser mergedPdf au lieu de pdfDoc
        const pdfBytes = await mergedPdf.save();
        const fileName = `Planche_${noProjetVal}_${rawDateVal}_${calibreVal}_${initialsVal}.pdf`;

        // BIFURCATION : APPLICATION ANDROID vs WEB
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                // FIX 3b : Utiliser mergedPdf.saveAsBase64() au lieu de pdfDoc.saveAsBase64()
                const pdfBase64 = await mergedPdf.saveAsBase64();
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
        mergedPdf.registerFontkit(fontkit);
        
        const getBuffer = (base64) => {
            const str = window.atob(base64);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return bytes.buffer;
        };

        const fontBytes = new Uint8Array(getBuffer(TAHOMA_FONT));
        const tahomaFont = await mergedPdf.embedFont(fontBytes);

        const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_PLANCHE));
        subDoc.registerFontkit(fontkit);
        const form = subDoc.getForm();
        
        // ========================================================
        // REVERSE-MAPPING ENGINE
        // ========================================================
        form.getFields().forEach(field => {
            const pdfName = field.getName();
            let val = null;

            let el = document.getElementById(pdfName);
            if (el) {
                if (el.tagName === 'SPAN' || el.tagName === 'DIV') val = el.textContent; 
                else if (el.type === 'checkbox') val = el.checked;
                else val = el.value;
            } 
            else if (pdfName.startsWith('pass-')) {
                const parts = pdfName.split('-');
                if (parts.length >= 3) {
                    const row = parseInt(parts[1]); 
                    const prop = parts.slice(2).join('-'); 
                    
                    const passes = document.querySelectorAll('.pass-card');
                    if (row > 0 && row <= passes.length) {
                        const card = passes[row - 1];
                        
                        if (prop === 'num') val = card.querySelector('.pass-num').value;
                        else if (prop === 'den-1') val = card.querySelectorAll('.den-val')[0]?.value;
                        else if (prop === 'den-2') val = card.querySelectorAll('.den-val')[1]?.value;
                        else if (prop === 'den-3') val = card.querySelectorAll('.den-val')[2]?.value;
                        else if (prop === 'den-avg') val = card.querySelector('.den-avg').textContent;
                        else if (prop === 'hum-1') val = card.querySelectorAll('.hum-val')[0]?.value;
                        else if (prop === 'hum-2') val = card.querySelectorAll('.hum-val')[1]?.value;
                        else if (prop === 'hum-3') val = card.querySelectorAll('.hum-val')[2]?.value;
                        else if (prop === 'hum-avg') val = card.querySelector('.hum-avg').textContent;
                        else if (prop === 'delta') {
                            const dText = card.querySelector('.delta-mv').textContent;
                            val = (dText !== '---' && dText !== 'N/A') ? dText : '';
                        }
                        else if (prop === 'sd') val = card.querySelector('.sd-select').value;
                    }
                }
            }

            if (val !== null && val !== undefined && val !== '---' && val !== '') {
            try {
                let finalStr = val.toString();
                
                // EXCLUSION TOTALE : Si le champ concerne un numéro de projet, on garde le point (ex: 2026.04)
                const lowerName = pdfName.toLowerCase();
                const isProjectNumber = lowerName.includes('projet') || lowerName.includes('no-') || lowerName.includes('numero');
                
                if (!isProjectNumber) {
                    finalStr = finalStr.replace(/(\d)\.(\d)/g, '$1,$2');
                }

                if (typeof field.setText === 'function') {
                    field.setText(finalStr);
                } else if (typeof field.select === 'function') {
                    try { field.addOptions([finalStr]); } catch(e) {}
                    field.select(finalStr);
                } else if (typeof field.check === 'function') {
                    if (val === true) field.check();
                    else field.uncheck();
                }
            } catch (e) {
                console.warn(`Warning: Could not set PDF field ${pdfName}`, e);
            }
        }

        });

        try {
            const subFont = await subDoc.embedFont(fontBytes);
            form.updateFieldAppearances(subFont);
            if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch (e) {}

        // ========================================================
        // 4. MAPPAGE DU GRAPHIQUE (BORDURE INVISIBLE & COINS RONDS)
        // ========================================================
        let rect = null;
        try {
            const chartField = form.getButton('densityChart');
            if (chartField) {
                const widget = chartField.acroField.getWidgets()[0];
                rect = widget.getRectangle();
                form.removeField('densityChart');
            }
        } catch (e) {
            console.warn("Impossible de trouver le bouton densityChart", e);
        }

        const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));

        try {
            const canvas = document.getElementById('densityChart');
            
            if (canvas && rect && typeof myChart !== 'undefined') {
                
                const tabSection = canvas.closest('.tab-section');
                let wasHidden = false;
                if (tabSection && window.getComputedStyle(tabSection).display === 'none') {
                    wasHidden = true;
                    tabSection.style.display = 'block'; 
                    tabSection.style.visibility = 'hidden'; 
                    tabSection.style.position = 'absolute'; 
                    await new Promise(resolve => setTimeout(resolve, 50)); 
                }

                const originalWidth = canvas.style.width;
                const originalHeight = canvas.style.height;
                const originalMaxHeight = canvas.style.maxHeight;
                const originalMinHeight = canvas.style.minHeight;

                const oldAnimation = myChart.options.animation;
                myChart.options.animation = false;

                canvas.style.width = (rect.width * 3) + 'px'; 
                canvas.style.height = (rect.height * 3) + 'px'; 
                canvas.style.maxHeight = 'none'; 
                canvas.style.minHeight = 'none'; 
                
                myChart.resize();
                if (typeof myChart.update === 'function') myChart.update('none'); 

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tCtx = tempCanvas.getContext('2d');
                
                const cornerRadius = tempCanvas.width * 0.015; 
                tCtx.beginPath();
                tCtx.moveTo(cornerRadius, 0);
                tCtx.lineTo(tempCanvas.width - cornerRadius, 0);
                tCtx.quadraticCurveTo(tempCanvas.width, 0, tempCanvas.width, cornerRadius);
                tCtx.lineTo(tempCanvas.width, tempCanvas.height - cornerRadius);
                tCtx.quadraticCurveTo(tempCanvas.width, tempCanvas.height, tempCanvas.width - cornerRadius, tempCanvas.height);
                tCtx.lineTo(cornerRadius, tempCanvas.height);
                tCtx.quadraticCurveTo(0, tempCanvas.height, 0, tempCanvas.height - cornerRadius);
                tCtx.lineTo(0, cornerRadius);
                tCtx.quadraticCurveTo(0, 0, cornerRadius, 0);
                tCtx.closePath();
                tCtx.clip();

                tCtx.fillStyle = 'white';
                tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tCtx.drawImage(canvas, 0, 0);
                
                // (La bordure a été supprimée ici pour la rendre invisible)

                const chartImageBase64 = tempCanvas.toDataURL('image/png', 1.0);
                const pngImageBytes = await fetch(chartImageBase64).then(res => res.arrayBuffer());
                const pdfImage = await mergedPdf.embedPng(pngImageBytes);

                canvas.style.width = originalWidth;
                canvas.style.height = originalHeight;
                canvas.style.maxHeight = originalMaxHeight;
                canvas.style.minHeight = originalMinHeight;
                myChart.options.animation = oldAnimation;
                myChart.resize();

                if (wasHidden && tabSection) {
                    tabSection.style.display = 'none';
                    tabSection.style.visibility = ''; 
                    tabSection.style.position = '';
                }

                const finalPages = mergedPdf.getPages();
                finalPages[0].drawImage(pdfImage, {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width, 
                    height: rect.height 
                });
            }
        } catch (e) {
            console.warn("Erreur lors de la génération de l'image du graphique", e);
        }
        // ========================================================

        const noProjetVal = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const calibreVal = document.getElementById('info-calibre')?.value.trim() || 'Calibre';
        const techNameVal = document.getElementById('sig-prep-nom')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Planche_${noProjetVal}_${rawDateVal}_${calibreVal}_${initialsVal}.pdf`;

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
}
*/ 