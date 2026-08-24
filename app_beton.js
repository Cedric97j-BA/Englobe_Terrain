const APP_VERSION = 'v1.1.0.4';

// ========================================== //
// 1. NAVIGATION ET INTERFACE GLOBALE         //
// ========================================== //

document.addEventListener('DOMContentLoaded', () => {
    const versionEl = document.getElementById('app-version');
    if (versionEl) {
        versionEl.textContent = APP_VERSION;
    }
    
    const logoEl = document.getElementById('main-logo');
    if (logoEl && typeof LOGO_BASE64 !== 'undefined') {
        logoEl.src = LOGO_BASE64;
    }

    updateDropdown();
});

function showTab(tabId) {
    const allTabs = document.querySelectorAll('.tab-section');
    allTabs.forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';

    // Gère l'état actif du bouton pour qu'il reste bleu
    const allButtons = document.querySelectorAll('.tab-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    syncForm3UI();
}

function toggleRemarque(textareaId, checkbox) {
    const textarea = document.getElementById(textareaId);
    if (checkbox.checked) {
        textarea.style.display = 'block';
    } else {
        textarea.style.display = 'none';
        textarea.value = ''; 
    }
}

// ========================================== //
// 2. GESTION DES CAMIONS ET SYNCHRONISATION  //
// ========================================== //

let truckCount = 0;
let isClearingForm = false; 

function addTruck() {
    truckCount++;
    const container = document.getElementById('trucks-container');
    const template = document.getElementById('truck-template');
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.truck-number-display').textContent = truckCount;
    
    const select = clone.querySelector('.truck-remarques-select');
    if (select) {
        for (let code = 65; code < currentRemarkCharCode; code++) {
            const letter = String.fromCharCode(code);
            const opt = document.createElement('option');
            opt.value = letter;
            opt.textContent = letter;
            select.appendChild(opt);
        }
    }
    
    container.appendChild(clone);
}

function toggleSampleFields(checkbox) {
    const card = checkbox.closest('.truck-card');
    const fields = card.querySelector('.truck-sample-fields');
    const truckLineNum = card.querySelector('.truck-number-display').textContent;

    if (checkbox.checked) {
        fields.style.display = 'block';

        manualSampleCount++;
        const container = document.getElementById('samples-container');
        const template = document.getElementById('sample-template');
        const clone = template.content.cloneNode(true);

        clone.querySelector('.sample-number-display').textContent = manualSampleCount;
        clone.querySelector('.sample-truck-linked').textContent = truckLineNum;
        clone.querySelector('.sample-card').dataset.linkedTruck = truckLineNum;

        container.appendChild(clone);
        syncForm3UI(); 
        
    } else {
        fields.style.display = 'none';
        const container = document.getElementById('samples-container');
        const linkedCard = container.querySelector(`.sample-card[data-linked-truck="${truckLineNum}"]`);
        
        if (linkedCard) {
            if (isClearingForm) return; 

            if (confirm(`Voulez-vous supprimer la fiche d'échantillon associée à la Ligne #${truckLineNum} ?`)) {
                linkedCard.remove();
            } else {
                checkbox.checked = true; 
                fields.style.display = 'block';
            }
        }
    }
}

function toggleRefuse(checkbox) {
    const card = checkbox.closest('.truck-card');
    const remarkInput = card.querySelector('.truck-remarques-list');

    if (checkbox.checked) {
        card.style.borderColor = '#dc2626'; 
        card.style.backgroundColor = '#fef2f2';
        
        if (remarkInput) {
            let current = remarkInput.value.split(',').map(s=>s.trim()).filter(s=>s!=="");
            if (!current.includes("N/C")) current.unshift("N/C"); 
            if (current.length > 2) current = [current[0], current[1]]; // Limite à N/C + 1 lettre
            remarkInput.value = current.join(',');
        }
    } else {
        card.style.borderColor = '#0284c7'; 
        card.style.backgroundColor = '#f8fafc'; 
        
        if (remarkInput) {
            let current = remarkInput.value.split(',').map(s=>s.trim()).filter(s=>s!=="N/C" && s!=="");
            remarkInput.value = current.join(',');
        }
    }
    updateAllTruckPreviews();
    calculateTotals();
}

// ========================================== //
// 3. MOTEUR MATHÉMATIQUE ET LIVE SYNC        //
// ========================================== //

['input', 'change'].forEach(eventType => {
    document.addEventListener(eventType, function(e) {
        if (e.target.classList.contains('truck-volume')) {
            calculateTotals();
        }
        
        if (e.target.classList.contains('truck-sample-num') || 
            e.target.classList.contains('truck-sample-time') || 
            e.target.id === 'f2-tech-name' || 
            e.target.id === 'f1-tech-name' || 
            e.target.id === 'global-date') {
            syncForm3UI();
        }
    });
});

function calculateTotals() {
    const volumeInputs = document.querySelectorAll('.truck-volume');
    const refuseCheckboxes = document.querySelectorAll('.truck-refuse');
    
    let totalCoulee = 0;
    let totalRefuse = 0;

    volumeInputs.forEach((input, index) => {
        const vol = parseFloat(input.value) || 0;
        const isRefused = refuseCheckboxes[index].checked;

        if (isRefused) {
            totalRefuse += vol;
        } else {
            totalCoulee += vol;
        }
    });

    const totalVerifie = totalCoulee + totalRefuse;

    document.getElementById('f2-total-coulee').value = totalCoulee.toFixed(1);
    document.getElementById('f2-total-refuse').value = totalRefuse.toFixed(1);
    document.getElementById('f2-total-verifie').value = totalVerifie.toFixed(1);
}

function syncForm3UI() {
    const globalDate = document.getElementById('global-date')?.value || '';
    const globalTech = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
    const techInitials = globalTech.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('');

    const samples = document.querySelectorAll('.sample-card:not(.temoin-only-card)');
    samples.forEach(card => {
        const linkedTruckNum = card.dataset.linkedTruck;
        if (linkedTruckNum) {
            const truckCards = document.querySelectorAll('.truck-card');
            const truckCard = truckCards[linkedTruckNum - 1]; 
            if (truckCard) {
                const tNum = truckCard.querySelector('.truck-sample-num').value;
                const tTime = truckCard.querySelector('.truck-sample-time').value;

                const displayEl = card.querySelector('.sample-number-display');
                if (displayEl) displayEl.textContent = tNum ? tNum : `(Numéro manquant)`;

                const f3DateHtml = card.querySelector('.sample-prelev-date');
                const f3TechHtml = card.querySelector('.sample-prelev-tech');
                const f3TimeHtml = card.querySelector('.sample-prelev-time');

                // CORRECTIF TIME SYNC : Écrase toujours F3 avec les données de F2 (le maître)
                if (f3DateHtml) f3DateHtml.value = globalDate;
                if (f3TechHtml) f3TechHtml.value = techInitials;
                if (f3TimeHtml) f3TimeHtml.value = tTime;
            }
        }
    });
}

// ========================================== //
// 4. SYSTÈME DE REMARQUES INTELLIGENT        //
// ========================================== //

let currentRemarkCharCode = 65; 

function getRemarksDict() {
    const text = document.getElementById('f2-remarques-globales').value || "";
    const dict = {};
    text.split(';').forEach(part => {
        const match = part.trim().match(/^([A-Z])\.\s*(.*)/);
        if (match) dict[match[1]] = match[2].trim();
    });
    return dict;
}

function rebuildGlobalRemarks(dict) {
    let lines = [];
    Object.keys(dict).sort().forEach(k => {
        lines.push(`${k}. ${dict[k]}`); // Exactement un espace après le point
    });
    const el = document.getElementById('f2-remarques-globales');
    el.value = lines.join('; ') + (lines.length > 0 ? ';' : '');
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
}

function updateAllTruckPreviews() {
    const dict = getRemarksDict();
    document.querySelectorAll('.truck-card').forEach(card => {
        const input = card.querySelector('.truck-remarques-list');
        const preview = card.querySelector('.truck-remarks-preview');
        if (input && preview) {
            if (input.value.trim() !== "") {
                let letters = input.value.split(',').map(s=>s.trim());
                let previewHtml = letters.map(l => {
                    if (l === 'N/C') return "<strong>N/C</strong>. Non conforme";
                    return dict[l] ? `<strong>${l}</strong>. ${dict[l]}` : "";
                }).filter(x => x);
                preview.innerHTML = previewHtml.join('<br/>');
            } else {
                preview.innerHTML = "";
            }
        }
    });
}

function createNewRemark(btn) {
    const card = btn.closest('.truck-card');
    const input = card.querySelector('.truck-remarques-list');
    const isRefused = card.querySelector('.truck-refuse').checked;
    
    let currentList = input.value ? input.value.split(',').map(s => s.trim()).filter(s => s !== "") : [];
    let lettersOnly = currentList.filter(l => l !== 'N/C');

    if (isRefused && lettersOnly.length >= 1) {
        alert("Un camion refusé (N/C) ne peut avoir qu'une seule remarque supplémentaire.");
        return;
    }
    if (!isRefused && lettersOnly.length >= 4) {
        alert("Maximum de 4 remarques par camion atteint.");
        return;
    }

    let dict = getRemarksDict();
    let existingLetters = Object.keys(dict).sort().join(',');
    
    let msg = "AJOUTER UNE REMARQUE\n\n";
    if (existingLetters) {
        msg += `👉 Pour RÉUTILISER : Tapez une lettre existante (${existingLetters})\n`;
    }
    msg += `👉 Pour CRÉER : Tapez directement la nouvelle description :`;

    const ans = prompt(msg);
    if (!ans || ans.trim() === "") return;

    let userInput = ans.trim();
    let letterToAdd = "";

    if (userInput.length === 1 && userInput.toUpperCase().match(/^[A-Z]$/)) {
        let L = userInput.toUpperCase();
        if (dict[L]) {
            letterToAdd = L; 
        } else {
            alert(`La remarque ${L} n'existe pas encore. Tapez une description complète pour la créer.`);
            return;
        }
    } else {
        // CALCUL DYNAMIQUE : Repart à 'A' si la boîte est vide, sinon prend la lettre suivante
        let nextCharCode = 65; 
        let keys = Object.keys(dict);
        if (keys.length > 0) {
            let maxCode = Math.max(...keys.map(k => k.charCodeAt(0)));
            nextCharCode = maxCode + 1;
        }
        letterToAdd = String.fromCharCode(nextCharCode);
        
        dict[letterToAdd] = userInput;
        rebuildGlobalRemarks(dict);
    }
    
    if (!currentList.includes(letterToAdd)) {
        currentList.push(letterToAdd);
        input.value = currentList.join(','); 
        updateAllTruckPreviews();
    } else {
        alert(`La remarque ${letterToAdd} est déjà assignée à ce camion.`);
    }
}

function clearTruckRemarks(btn) {
    const card = btn.closest('.truck-card');
    const input = card.querySelector('.truck-remarques-list');
    const isRefused = card.querySelector('.truck-refuse').checked;
    input.value = isRefused ? "N/C" : "";
    updateAllTruckPreviews();
}

function editGlobalRemarkPrompt() {
    let letter = prompt("Quelle lettre voulez-vous modifier ? (Ex: A)");
    if (!letter) return;
    letter = letter.trim().toUpperCase();
    
    let dict = getRemarksDict();
    if (dict[letter]) {
        let newText = prompt(`Nouveau texte pour la remarque ${letter} :`, dict[letter]);
        if (newText !== null && newText.trim() !== "") {
            dict[letter] = newText.trim();
            rebuildGlobalRemarks(dict);
            updateAllTruckPreviews(); 
        }
    } else {
        alert(`La remarque ${letter} n'existe pas.`);
    }
}

// ========================================== //
// 5. FORMULAIRE 3 : ÉCHANTILLONS & TÉMOINS   //
// ========================================== //

let manualSampleCount = 0;
let temoinOnlyCount = 0;

function toggleTemoinSection(checkbox) {
    const temoinContainer = checkbox.closest('.form-section').querySelector('.temoin-container');
    if (checkbox.checked) {
        temoinContainer.style.display = 'block';
    } else {
        temoinContainer.style.display = 'none';
    }
}

function addManualSample() {
    manualSampleCount++;
    const container = document.getElementById('samples-container');
    const template = document.getElementById('sample-template');
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.sample-number-display').textContent = "Indépendant M-" + manualSampleCount;
    clone.querySelector('.sample-truck-linked').textContent = "Indépendant";
    
    container.appendChild(clone);
}

function addTemoinOnly() {
    temoinOnlyCount++;
    const container = document.getElementById('samples-container');
    const template = document.getElementById('temoin-only-template');
    const clone = template.content.cloneNode(true);
    
    clone.querySelector('.temoin-number-display').textContent = "T-" + temoinOnlyCount;
    
    container.appendChild(clone);
}

// ========================================== //
// 6. MOTEUR DE SAUVEGARDE (LOCALSTORAGE)     //
// ========================================== //

let currentActiveReportKey = null;

function updateDropdown() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">-- Sélectionnez un rapport --</option>';
    
    let savedKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('englobe_')) {
            savedKeys.push(key);
        }
    }

    savedKeys.sort().forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        
        const displayName = key.replace('englobe_', '').replace(/_/g, ' ');
        option.textContent = displayName;
        
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
            const event = new Event('change');
            el.dispatchEvent(event);
        } else {
            el.value = '';
        }
    });

    const trucksContainer = document.getElementById('trucks-container');
    const samplesContainer = document.getElementById('samples-container');
    if (trucksContainer) trucksContainer.innerHTML = '';
    if (samplesContainer) samplesContainer.innerHTML = '';
    
    truckCount = 0;
    manualSampleCount = 0;
    temoinOnlyCount = 0;
    currentRemarkCharCode = 65; 

    calculateTotals();
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

    alert("Écran réinitialisé. Vous pouvez commencer un nouveau rapport.");
}

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    const selectedKey = dropdown.value;

    if (!selectedKey) {
        alert("Veuillez d'abord sélectionner un rapport sauvegardé dans la liste déroulante.");
        return;
    }

    const reportDataStr = localStorage.getItem(selectedKey);
    if (!reportDataStr) return;

    clearForm();
    const reportData = JSON.parse(reportDataStr);

    if (reportData.static) {
        for (const [id, value] of Object.entries(reportData.static)) {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = value;
                    const event = new Event('change');
                    el.dispatchEvent(event);
                } else {
                    el.value = value;
                }
            }
        }
        
        const globalRem = reportData.static['f2-remarques-globales'] || '';
        const matches = globalRem.match(/([A-Z])\./g);
        if (matches && matches.length > 0) {
            const maxLetter = matches.map(m => m[0]).sort().pop();
            currentRemarkCharCode = maxLetter.charCodeAt(0) + 1; 
        }
    }

    if (reportData.trucks && Array.isArray(reportData.trucks)) {
        reportData.trucks.forEach(truckInfo => {
            addTruck(); 
            const cards = document.querySelectorAll('.truck-card');
            const card = cards[cards.length - 1]; 
            
            card.querySelector('.truck-id').value = truckInfo.id || '';
            card.querySelector('.truck-bordereau').value = truckInfo.bordereau || '';
            card.querySelector('.truck-volume').value = truckInfo.volume || '';
            card.querySelector('.truck-time-mix').value = truckInfo.timeMix || '';
            card.querySelector('.truck-time-start').value = truckInfo.timeStart || '';
            card.querySelector('.truck-time-end').value = truckInfo.timeEnd || '';
            card.querySelector('.truck-water').value = truckInfo.water || '';
            card.querySelector('.truck-plast').value = truckInfo.plast || '';
            card.querySelector('.truck-air1').value = truckInfo.air1 || '';
            card.querySelector('.truck-air2').value = truckInfo.air2 || '';
            card.querySelector('.truck-temp').value = truckInfo.temp || '';
            card.querySelector('.truck-slump1').value = truckInfo.slump1 || '';
            card.querySelector('.truck-slump1-sp').checked = !!truckInfo.slump1Sp;
            card.querySelector('.truck-slump2').value = truckInfo.slump2 || '';
            card.querySelector('.truck-slump2-sp').checked = !!truckInfo.slump2Sp;
            
            const refuseBox = card.querySelector('.truck-refuse');
            refuseBox.checked = !!truckInfo.refuse;
            toggleRefuse(refuseBox);

            const sampleBox = card.querySelector('.truck-sample-check');
            sampleBox.checked = !!truckInfo.sampleCheck;
            
            if (sampleBox.checked) {
                card.querySelector('.truck-sample-fields').style.display = 'block';
                if (!reportData.samples || reportData.samples.length === 0) {
                    toggleSampleFields(sampleBox);
                }
            }

            card.querySelector('.truck-sample-num').value = truckInfo.sampleNum || '';
            card.querySelector('.truck-sample-time').value = truckInfo.sampleTime || '';
            const rmInput = card.querySelector('.truck-remarques-list');
            if (rmInput) {
                let rawVal = truckInfo.remarquesList || truckInfo.remarqueSelect || '';
                rmInput.value = rawVal.split(',').map(s => s.trim()).filter(s => s !== "").join(',');
            }
        });
        calculateTotals();
    }

    if (reportData.samples && Array.isArray(reportData.samples)) {
        document.getElementById('samples-container').innerHTML = '';
        manualSampleCount = 0;
        temoinOnlyCount = 0;

        reportData.samples.forEach(sampleInfo => {
            if (sampleInfo.isStandaloneTemoin) {
                addTemoinOnly();
            } else {
                addManualSample(); 
            }
            
            const cards = document.querySelectorAll('.sample-card');
            const card = cards[cards.length - 1]; 
            
            if (!sampleInfo.isStandaloneTemoin && sampleInfo.linkedTruck) {
                card.dataset.linkedTruck = sampleInfo.linkedTruck;
                card.querySelector('.sample-truck-linked').textContent = sampleInfo.linkedTruck;
            }
            
            if (sampleInfo['sample-temoin-check']) {
                const cb = card.querySelector('.sample-temoin-check');
                if (cb) {
                    cb.checked = true;
                    toggleTemoinSection(cb);
                }
            }

            card.querySelectorAll('input, textarea, select').forEach(input => {
                const cls = Array.from(input.classList).find(c => c.startsWith('sample-') || c.startsWith('temoin-'));
                if (cls && sampleInfo[cls] !== undefined) {
                    if (input.type === 'checkbox') input.checked = sampleInfo[cls];
                    else input.value = sampleInfo[cls];
                }
            });
        });
    }

    syncForm3UI(); 
    currentActiveReportKey = selectedKey; 
    dropdown.value = selectedKey;
    updateAllTruckPreviews();
    alert("Rapport chargé avec succès.");
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function saveReport() {
    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const resistance = document.getElementById('f2-spec-resistance')?.value.trim() || 'Mix';
    const techName = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    // Modèle automatique par défaut
    const defaultBaseName = `englobe_${rawDate}_${noProjet}_${resistance}_${techInitials}`;
    
    // Boîte de dialogue pour valider ou personnaliser le nom
    let userPromptName = prompt("Nom de sauvegarde du rapport (modifiable) :", defaultBaseName);
    if (userPromptName === null) return; // Annulation
    
    let baseName = userPromptName.trim() || defaultBaseName;
    if (!baseName.startsWith('englobe_')) {
        baseName = `englobe_${baseName}`;
    }
    
    if (currentActiveReportKey && !currentActiveReportKey.startsWith(baseName)) {
        currentActiveReportKey = null;
    }

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return;
        staticData[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });

    const trucksData = [];
    document.querySelectorAll('.truck-card').forEach(card => {
        trucksData.push({
            id: card.querySelector('.truck-id').value,
            bordereau: card.querySelector('.truck-bordereau').value,
            volume: card.querySelector('.truck-volume').value,
            timeMix: card.querySelector('.truck-time-mix').value,
            timeStart: card.querySelector('.truck-time-start').value,
            timeEnd: card.querySelector('.truck-time-end').value,
            water: card.querySelector('.truck-water').value,
            plast: card.querySelector('.truck-plast').value,
            air1: card.querySelector('.truck-air1').value,
            air2: card.querySelector('.truck-air2').value,
            temp: card.querySelector('.truck-temp').value,
            slump1: card.querySelector('.truck-slump1').value,
            slump1Sp: card.querySelector('.truck-slump1-sp').checked,
            slump2: card.querySelector('.truck-slump2').value,
            slump2Sp: card.querySelector('.truck-slump2-sp').checked,
            refuse: card.querySelector('.truck-refuse').checked,
            sampleCheck: card.querySelector('.truck-sample-check').checked,
            sampleNum: card.querySelector('.truck-sample-num').value,
            sampleTime: card.querySelector('.truck-sample-time').value,
            remarquesList: card.querySelector('.truck-remarques-list')?.value || ''
        });
    });

    const samplesData = [];
    document.querySelectorAll('.sample-card').forEach(card => {
        const data = { 
            isStandaloneTemoin: card.classList.contains('temoin-only-card'),
            linkedTruck: card.dataset.linkedTruck || null 
        };
        
        card.querySelectorAll('input, textarea, select').forEach(input => {
            const cls = Array.from(input.classList).find(c => c.startsWith('sample-') || c.startsWith('temoin-'));
            if (cls) {
                data[cls] = input.type === 'checkbox' ? input.checked : input.value;
            }
        });
        samplesData.push(data);
    });

    let saveKey = currentActiveReportKey;
    if (!saveKey) {
        let maxIndex = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(baseName)) {
                const parts = key.path ? key.split('_') : key.split('_');
                const idx = parseInt(parts[parts.length - 1]);
                if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
            }
        }
        const nextIndex = String(maxIndex + 1).padStart(2, '0');
        saveKey = `${baseName}_${nextIndex}`;
    }

    const reportData = {
        static: staticData,
        trucks: trucksData,
        samples: samplesData,
        timestamp: new Date().getTime()
    };

    localStorage.setItem(saveKey, JSON.stringify(reportData));
    currentActiveReportKey = saveKey; 
    
    updateDropdown();
    
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (dropdown) dropdown.value = saveKey;
    alert("Rapport sauvegardé avec succès sous : " + saveKey);
}

let deleteArmed = false;
let deleteTimeout = null;

function deleteReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    const targetKey = currentActiveReportKey || (dropdown ? dropdown.value : null);

    if (!targetKey) {
        alert("Veuillez sélectionner un rapport sauvegardé dans la liste pour le supprimer.");
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
    alert(`Le rapport a été supprimé avec succès.`);
    
    currentActiveReportKey = null; 
    clearForm(); 
    updateDropdown(); 
}


// === MOTEUR D'EXPORT MULTI-TEMPLATE (OFFLINE BASE64) === //
async function exportToPDF() {
    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) {
            btn.textContent = "⏳ Génération en cours...";
            btn.disabled = true;
        }

        let compiledRemarks = [];
        for (let i = 1; i <= 8; i++) {
            const check = document.getElementById(`f1-s${i}-remarques-check`);
            const text = document.getElementById(`f1-s${i}-remarques-text`);
            if (check && check.checked && text && text.value.trim() !== "") {
                compiledRemarks.push(`${i}. ${text.value.trim()}`);
            }
        }
        
        let userS9Text = document.getElementById('f1-s9-remarques-compilation')?.value.trim() || "";
        let finalS9Text = userS9Text;
        if (compiledRemarks.length > 0) {
            finalS9Text = userS9Text ? (userS9Text + "\n\n" + compiledRemarks.join('; ')) : compiledRemarks.join('; ');
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

        // ==========================================
        // ETAPE 1 : Formulaire 1
        // ==========================================
        const subDocF1 = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_F1));
        subDocF1.registerFontkit(fontkit);
        const formF1 = subDocF1.getForm();
        
        formF1.getFields().forEach(field => {
            const name = field.getName();
            const el = document.getElementById(name);
            if (el) {
                try {
                    if (name === 'f1-s9-remarques-compilation') {
                        formF1.getTextField(name).setText(finalS9Text);
                    } else if (el.type === 'checkbox') {
                        el.checked ? formF1.getCheckBox(name).check() : formF1.getCheckBox(name).uncheck();
                    } else {
                        formF1.getTextField(name).setText(el.value || "");
                    }
                } catch (e) {}
            }
        });

        try {
            const subFont = await subDocF1.embedFont(fontBytes);
            formF1.updateFieldAppearances(subFont);
            if (formF1.acroForm) formF1.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
        } catch (e) {}

        const copiedPagesF1 = await mergedPdf.copyPages(subDocF1, subDocF1.getPageIndices());
        copiedPagesF1.forEach(page => mergedPdf.addPage(page));

        // ==========================================
        // ETAPE 2 : Formulaire 2 (Multi-pages Dynamique)
        // ==========================================
        const allTrucks = Array.from(document.querySelectorAll('.truck-card'));
        const maxTrucksPerPage = 17;
        const nbPagesF2 = Math.max(1, Math.ceil(allTrucks.length / maxTrucksPerPage));
        let volumeCumuleF2 = 0;
        
        const allRemarksText = document.getElementById('f2-remarques-globales').value || "";
        const remarksDict = {};
        const generalText = [];
        
        allRemarksText.split(';').forEach(part => {
            const match = part.trim().match(/^([A-Z])\.\s*(.*)/);
            if (match) {
                remarksDict[match[1]] = `${match[1]}. ${match[2].trim()}`;
            } else if (part.trim() !== "") {
                generalText.push(part.trim());
            }
        });

        for (let p = 0; p < nbPagesF2; p++) {
            const subDocF2 = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_F2));
            subDocF2.registerFontkit(fontkit);
            const formF2 = subDocF2.getForm();

            formF2.getFields().forEach(field => {
                const name = field.getName();
                if (name === 'f2-remarques-globales') return; 
                
                const el = document.getElementById(name);
                if (el) {
                    try {
                        if (el.type === 'checkbox') el.checked ? formF2.getCheckBox(name).check() : formF2.getCheckBox(name).uncheck();
                        else formF2.getTextField(name).setText(el.value || "");
                    } catch (e) {}
                }
            });

            try { formF2.getTextField('f2-page-number').setText(`${p + 1} de ${nbPagesF2}`); } catch(e) {}

            const chunk = allTrucks.slice(p * maxTrucksPerPage, (p + 1) * maxTrucksPerPage);
            const pageRemarksSet = new Set();
            
            chunk.forEach((card, index) => {
                const row = index + 1; 
                const trySetF2 = (cls, pdfName, isCheck = false) => {
                    const el = card.querySelector(cls);
                    if (!el) return;
                    try {
                        if (isCheck) el.checked ? formF2.getCheckBox(pdfName).check() : formF2.getCheckBox(pdfName).uncheck();
                        else if (el.value) formF2.getTextField(pdfName).setText(el.value);
                    } catch (e) {}
                };

                const isRefused = card.querySelector('.truck-refuse').checked;
                const volInput = card.querySelector('.truck-volume');
                
                if (volInput && volInput.value) {
                    const vol = parseFloat(volInput.value);
                    if (!isRefused) {
                        volumeCumuleF2 += vol;
                    }
                    try { formF2.getTextField(`truck-${row}-vol-un`).setText(vol.toString()); } catch(e) {}
                    try { formF2.getTextField(`truck-${row}-vol-cum`).setText(isRefused ? "" : volumeCumuleF2.toFixed(1)); } catch(e) {}
                }

                trySetF2('.truck-id', `truck-${row}-id`);
                trySetF2('.truck-bordereau', `truck-${row}-bordereau`);
                trySetF2('.truck-time-mix', `truck-${row}-time-mix`);
                trySetF2('.truck-time-start', `truck-${row}-time-start`);
                trySetF2('.truck-time-end', `truck-${row}-time-end`);
                trySetF2('.truck-water', `truck-${row}-water`);
                trySetF2('.truck-plast', `truck-${row}-plast`);
                trySetF2('.truck-air1', `truck-${row}-air1`);
                trySetF2('.truck-air2', `truck-${row}-air2`);
                trySetF2('.truck-temp', `truck-${row}-temp`);
                trySetF2('.truck-slump1', `truck-${row}-slump1`);
                trySetF2('.truck-slump1-sp', `truck-${row}-slump1-sp`, true);
                trySetF2('.truck-slump2', `truck-${row}-slump2`);
                trySetF2('.truck-slump2-sp', `truck-${row}-slump2-sp`, true);
                trySetF2('.truck-sample-check', `truck-${row}-sample-check`, true);
                
                trySetF2('.truck-sample-num', `truck-${row}-sample-num`);
                trySetF2('.truck-sample-time', `truck-${row}-sample-time`);
                
                const elRem = card.querySelector('.truck-remarques-list');
                
                if (isRefused) {
                    try { formF2.getCheckBox(`truck-${row}-refuse`).check(); } catch(e) {}
                }
                
                if (elRem && elRem.value) {
                    let cleanText = elRem.value.split(',').map(s=>s.trim()).filter(s=>s!=="").join(',');
                    try { formF2.getTextField(`truck-${row}-remarque`).setText(cleanText); } 
                    catch(e1) { try { formF2.getDropdown(`truck-${row}-remarque`).select(cleanText); } catch(e2) {} }
                    
                    elRem.value.split(',').forEach(l => {
                        let cleanL = l.trim();
                        if(cleanL !== "N/C" && cleanL !== "") pageRemarksSet.add(cleanL);
                    });
                } else if (isRefused) { 
                    try { formF2.getTextField(`truck-${row}-remarque`).setText("N/C"); } 
                    catch(e1) { try { formF2.getDropdown(`truck-${row}-remarque`).select("N/C"); } catch(e2) {} }
                }
            });

            const pageNotes = Array.from(pageRemarksSet).sort().map(L => remarksDict[L]).filter(x => x);
            const finalRemarksText = [...generalText, ...pageNotes].join('; ') + (pageNotes.length > 0 || generalText.length > 0 ? ';' : ''); 
            try { formF2.getTextField('f2-remarques-globales').setText(finalRemarksText); } catch(e) {}

            try {
                const subFont = await subDocF2.embedFont(fontBytes);
                formF2.updateFieldAppearances(subFont);
                if (formF2.acroForm) formF2.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch (e) {}

            const copiedPagesF2 = await mergedPdf.copyPages(subDocF2, subDocF2.getPageIndices());
            copiedPagesF2.forEach(page => mergedPdf.addPage(page));
        }

        // ==========================================
        // ETAPE 3 : Formulaire 3 (1 page par échantillon)
        // ==========================================
        const samples = document.querySelectorAll('.sample-card:not(.temoin-only-card)');
        for (const card of samples) {
            const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_F3));
            subDoc.registerFontkit(fontkit);
            const form = subDoc.getForm();

            const num = Array.from(samples).indexOf(card) + 1;
            const linkedTruckNum = card.dataset.linkedTruck;
            const globalDate = document.getElementById('global-date').value;
            const globalTech = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
            const techInitials = globalTech.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('');
            
            const f3DateHtml = card.querySelector('.sample-prelev-date');
            const f3TechHtml = card.querySelector('.sample-prelev-tech');
            const f3TimeHtml = card.querySelector('.sample-prelev-time');

            if (f3DateHtml && !f3DateHtml.value && globalDate) {
                try { form.getTextField('sample-prelev-date').setText(globalDate); } catch(e){}
                try { form.getTextField(`sample-${num}-prelev-date`).setText(globalDate); } catch(e){}
            }
            if (f3TechHtml && !f3TechHtml.value && techInitials) {
                try { form.getTextField('sample-prelev-tech').setText(techInitials); } catch(e){}
                try { form.getTextField(`sample-${num}-prelev-tech`).setText(techInitials); } catch(e){}
            }

            if (linkedTruckNum) {
                const truckCards = document.querySelectorAll('.truck-card');
                const truckCard = truckCards[linkedTruckNum - 1]; 
                if (truckCard) {
                    const tNum = truckCard.querySelector('.truck-sample-num').value;
                    const tTime = truckCard.querySelector('.truck-sample-time').value;
                    
                    if (tNum) {
                        try { form.getTextField('sample-no').setText(tNum); } catch(e){}
                        try { form.getTextField(`sample-${num}-no`).setText(tNum); } catch(e){}
                    }
                    if (f3TimeHtml && !f3TimeHtml.value && tTime) {
                        try { form.getTextField('sample-prelev-time').setText(tTime); } catch(e){}
                        try { form.getTextField(`sample-${num}-prelev-time`).setText(tTime); } catch(e){}
                    }
                }
            }

            card.querySelectorAll('input, textarea').forEach(input => {
                const targetClass = Array.from(input.classList).find(c => c.startsWith('sample-'));
                if (targetClass) {
                    const numberedName = targetClass.replace('sample-', `sample-${num}-`);
                    try {
                        if (input.type === 'checkbox') {
                            input.checked ? form.getCheckBox(targetClass).check() : form.getCheckBox(targetClass).uncheck();
                            input.checked ? form.getCheckBox(numberedName).check() : form.getCheckBox(numberedName).uncheck();
                        } else if (input.value) {
                            form.getTextField(targetClass).setText(input.value);
                            form.getTextField(numberedName).setText(input.value);
                        }
                    } catch(e) {}
                }
            });

            form.getFields().forEach(field => {
                const name = field.getName();
                if (name.startsWith('global-')) {
                    const el = document.getElementById(name);
                    if (el && el.value) {
                        try { form.getTextField(name).setText(el.value); } catch(e) {}
                    }
                }
            });

            try {
                const subFont = await subDoc.embedFont(fontBytes);
                form.updateFieldAppearances(subFont);
                if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch (e) {}

            const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        // ==========================================
        // ETAPE 4 : Formulaire 4 (1 page par témoin)
        // ==========================================
        const temoinCheckboxes = document.querySelectorAll('.sample-temoin-check:checked');
        const temoinStandalone = document.querySelectorAll('.temoin-only-card');
        
        const allTemoins = [];
        temoinCheckboxes.forEach(cb => allTemoins.push(cb.closest('.sample-card').querySelector('.temoin-container')));
        temoinStandalone.forEach(card => allTemoins.push(card));

        for (const container of allTemoins) {
            const subDoc = await PDFLib.PDFDocument.load(getBuffer(TEMPLATE_TEMOIN));
            subDoc.registerFontkit(fontkit);
            const form = subDoc.getForm();

            const num = Array.from(allTemoins).indexOf(container) + 1;
            const globalDate = document.getElementById('global-date').value;
            const globalTech = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
            const techInitials = globalTech.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('');

            container.querySelectorAll('input, textarea').forEach(input => {
                const targetClass = Array.from(input.classList).find(c => c.startsWith('temoin-'));
                if (targetClass) {
                    const numberedName = targetClass.replace('temoin-', `temoin-${num}-`);
                    try {
                        if (input.type === 'checkbox') {
                            input.checked ? form.getCheckBox(targetClass).check() : form.getCheckBox(targetClass).uncheck();
                            input.checked ? form.getCheckBox(numberedName).check() : form.getCheckBox(numberedName).uncheck();
                        } else if (input.value) {
                            form.getTextField(targetClass).setText(input.value);
                            form.getTextField(numberedName).setText(input.value);
                        }
                    } catch(e) {}
                }
            });

            const tDateHtml = container.querySelector('.temoin-prelev-date');
            const tTechHtml = container.querySelector('.temoin-prelev-tech');

            if (tDateHtml && !tDateHtml.value && globalDate) {
                try { form.getTextField('temoin-prelev-date').setText(globalDate); } catch(e){}
                try { form.getTextField(`temoin-${num}-prelev-date`).setText(globalDate); } catch(e){}
            }
            if (tTechHtml && !tTechHtml.value && techInitials) {
                try { form.getTextField('temoin-prelev-tech').setText(techInitials); } catch(e){}
                try { form.getTextField(`temoin-${num}-prelev-tech`).setText(techInitials); } catch(e){}
            }

            form.getFields().forEach(field => {
                const name = field.getName();
                if (name.startsWith('global-')) {
                    const el = document.getElementById(name);
                    if (el && el.value) {
                        try { form.getTextField(name).setText(el.value); } catch(e) {}
                    }
                }
            });

            try {
                const subFont = await subDoc.embedFont(fontBytes);
                form.updateFieldAppearances(subFont);
                if (form.acroForm) form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'), PDFLib.PDFBool.False);
            } catch (e) {}

            const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const noProjetVal = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const resistanceVal = document.getElementById('f2-spec-resistance')?.value.trim() || 'Mix';
        const techNameVal = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `Rapport_${rawDateVal}_${noProjetVal}_${resistanceVal}_${initialsVal}.pdf`;

        // CORRECTIF : Détecter mobile/tablette (incluant l'iPad qui se fait passer pour un Mac)
        const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || isMacTouch;
        
        let attemptedShare = false;

        try {
            // Utiliser le menu de partage UNIQUEMENT sur mobile/tablette
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
        } catch (err) {
            console.log("Partage annulé ou échoué:", err);
        }

        // Sur PC (ou si le partage mobile échoue), on télécharge directement
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
        console.error("Erreur lors de l'export multi-template :", error);
        alert("Erreur lors de l'export PDF. Vérifiez la console.");
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        if(btn) {
            btn.textContent = "📄 Exporter en PDF";
            btn.disabled = false;
        }
    }
}