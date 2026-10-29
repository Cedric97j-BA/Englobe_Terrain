// ========================================== //
// 1. NAVIGATION ET INTERFACE GLOBALE         //
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
    currentTruckPage = Math.max(1, Math.ceil(truckCount / TRUCKS_PER_PAGE));
    updateTruckPagination();

}

// Fonction pour ouvrir ou fermer la carte du camion
function toggleAccordion(headerElement) {
    const content = headerElement.nextElementSibling;
    const chevron = headerElement.querySelector('.chevron');
    
    content.classList.toggle('active');
    chevron.classList.toggle('rotated');
}
/*
// Fonction pour afficher le numéro de camion et de bordereau dans l'en-tête
function updateTruckHeader(inputElement) {
    const card = inputElement.closest('.truck-card');
    if (!card) return;
    
    const truckId = card.querySelector('.truck-id').value || '---';
    const bordereau = card.querySelector('.truck-bordereau').value || '---';
    const summary = card.querySelector('.truck-header-summary');
    
    if (summary) {
        summary.textContent = `| Camion: ${truckId} | Bordereau: ${bordereau}`;
    }
} */

// Fonction pour afficher le numéro, bordereau et échantillon dans l'en-tête
function updateTruckHeader(element) {
    const card = element.closest('.truck-card');
    if (!card) return;
    
    const truckId = card.querySelector('.truck-id').value || '---';
    const bordereau = card.querySelector('.truck-bordereau').value || '---';
    const summary = card.querySelector('.truck-header-summary');
    
    // Vérifier l'échantillon
    const isSampled = card.querySelector('.truck-sample-check').checked;
    const sampleNum = card.querySelector('.truck-sample-num').value || '---';
    
    if (summary) {
        let texte = `| Camion: ${truckId} | Bordereau: ${bordereau}`;
        if (isSampled) {
            texte += ` | Éch: ${sampleNum}`;
        }
        summary.textContent = texte;
    }
}

function updateTruckColor(card) {
    const isRefused = card.querySelector('.truck-refuse') && card.querySelector('.truck-refuse').checked;
    const isSampled = card.querySelector('.truck-sample-check') && card.querySelector('.truck-sample-check').checked;
    
    const air1 = card.querySelector('.truck-air1') ? card.querySelector('.truck-air1').value : '';
    const air2 = card.querySelector('.truck-air2') ? card.querySelector('.truck-air2').value : '';
    const slump1 = card.querySelector('.truck-slump1') ? card.querySelector('.truck-slump1').value : '';
    const slump2 = card.querySelector('.truck-slump2') ? card.querySelector('.truck-slump2').value : '';
    
    const hasTest = air1 !== '' || air2 !== '' || slump1 !== '' || slump2 !== '';

    card.classList.remove('truck-status-refused', 'truck-status-sampled', 'truck-status-tested');

    if (isRefused) {
        card.classList.add('truck-status-refused');
    } else if (isSampled) {
        card.classList.add('truck-status-sampled');
    } else if (hasTest) {
        card.classList.add('truck-status-tested');
    }
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
            if (isClearingForm) {
                // If we are clearing form, don't confirm, just continue logic
            } else if (confirm(`Voulez-vous supprimer la fiche d'échantillon associée à la Ligne #${truckLineNum} ?`)) {
                linkedCard.remove();
            } else {
                checkbox.checked = true; 
                fields.style.display = 'block';
                return; // User cancelled
            }
        }
    }
    updateTruckColor(card);
    updateTruckHeader(checkbox);
}

function toggleRefuse(checkbox) {
    const card = checkbox.closest('.truck-card');
    const remarkInput = card.querySelector('.truck-remarques-list');

    if (checkbox.checked) {
        if (remarkInput) {
            let current = remarkInput.value.split(',').map(s=>s.trim()).filter(s=>s!=="");
            if (!current.includes("N/C")) current.unshift("N/C"); 
            if (current.length > 2) current = [current[0], current[1]]; // Limite à N/C + 1 lettre
            remarkInput.value = current.join(',');
        }
    } else {
        if (remarkInput) {
            let current = remarkInput.value.split(',').map(s=>s.trim()).filter(s=>s!=="N/C" && s!=="");
            remarkInput.value = current.join(',');
        }
    }
    updateTruckColor(card);
    updateAllTruckPreviews();
    calculateTotals();
}

// Variables globales pour la pagination
let currentTruckPage = 1;
const TRUCKS_PER_PAGE = 17;

// Fonction 1 : Gère l'affichage selon la page actuelle
function updateTruckPagination() {
    const trucks = document.querySelectorAll('.truck-card');
    const totalTrucks = trucks.length;
    const paginationBar = document.getElementById('truck-pagination-controls');
    
    // S'il n'y a pas de camions, on cache la barre
    if (totalTrucks === 0) {
        paginationBar.style.display = 'none';
        return;
    }
    
    const totalPages = Math.max(1, Math.ceil(totalTrucks / TRUCKS_PER_PAGE));
    
    // Sécurité : si on supprime un camion et qu'on perd une page
    if (currentTruckPage > totalPages) currentTruckPage = totalPages;
    
    // Afficher la barre de pagination
    paginationBar.style.display = 'flex';
    document.getElementById('current-page-display').textContent = currentTruckPage;
    document.getElementById('total-pages-display').textContent = totalPages;
    
    // Griser les boutons si on est au début ou à la fin
    document.getElementById('btn-prev-page').disabled = (currentTruckPage === 1);
    document.getElementById('btn-prev-page').style.opacity = (currentTruckPage === 1) ? "0.5" : "1";
    
    document.getElementById('btn-next-page').disabled = (currentTruckPage === totalPages);
    document.getElementById('btn-next-page').style.opacity = (currentTruckPage === totalPages) ? "0.5" : "1";
    
    // Cacher/Afficher les camions
    const startIndex = (currentTruckPage - 1) * TRUCKS_PER_PAGE;
    const endIndex = currentTruckPage * TRUCKS_PER_PAGE;
    
    trucks.forEach((truck, index) => {
        if (index >= startIndex && index < endIndex) {
            truck.style.display = 'block'; // Affiché
        } else {
            truck.style.display = 'none'; // Caché
        }
    });
}

// Fonction 2 : Les boutons Précédent/Suivant
function changeTruckPage(direction) {
    const totalTrucks = document.querySelectorAll('.truck-card').length;
    const totalPages = Math.max(1, Math.ceil(totalTrucks / TRUCKS_PER_PAGE));
    
    currentTruckPage += direction;
    
    // Limites
    if (currentTruckPage < 1) currentTruckPage = 1;
    if (currentTruckPage > totalPages) currentTruckPage = totalPages;
    
    updateTruckPagination();
    
    // Remonter automatiquement la vue au début de la liste des camions
    document.getElementById('truck-pagination-controls').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Fonction 3 (Bonus) : Tout réduire pour y voir plus clair
function collapseAllTrucks() {
    document.querySelectorAll('.truck-card .accordion-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.truck-card .chevron').forEach(chevron => {
        chevron.classList.add('rotated');
    });
}


// ========================================== //
// 3. MOTEUR MATHÉMATIQUE ET LIVE SYNC        //
// ========================================== //

/*
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
}); */

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

        // NOUVEAU: Si on tape dans le champ Numéro d'échantillon, on force la mise à jour de l'en-tête
        if (e.target.classList.contains('truck-sample-num')) {
            updateTruckHeader(e.target);
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

function updateRemarkLetterState() {
    const dictKeys = Object.keys(getRemarksDict());
    const assignedKeys = Array.from(document.querySelectorAll('.truck-remarques-list'))
        .flatMap(input => input.value.split(','))
        .map(value => value.trim())
        .filter(value => /^[A-Z]$/.test(value));
    const allKeys = [...dictKeys, ...assignedKeys];
    const maxCode = allKeys.length > 0
        ? Math.max(...allKeys.map(letter => letter.charCodeAt(0)))
        : 64;
    currentRemarkCharCode = Math.min(maxCode + 1, 91);
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
        showToast("Un camion refusé (N/C) ne peut avoir qu'une seule remarque supplémentaire.", "info");
        return;
    }
    if (!isRefused && lettersOnly.length >= 4) {
        showToast("Maximum de 4 remarques par camion atteint.");
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
            showToast(`La remarque ${L} n'existe pas encore. Tapez une description complète pour la créer.`, "info");
            return;
        }
    } else {
        updateRemarkLetterState();
        let nextCharCode = currentRemarkCharCode;
        if (nextCharCode >= 91) {
            showToast("Toutes les lettres de remarque disponibles sont utilisées.", "info");
            return;
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
        showToast(`La remarque ${letterToAdd} est déjà assignée à ce camion.`, "info");
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
        showToast(`La remarque ${letter} n'existe pas.`, "info");
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
            if (key && key.startsWith('englobe_')) {
                const displayName = key.replace('englobe_', '').replace(/_/g, ' ');
                savedReports.push({ key: key, display: displayName });
            } 
            // 2. Nouveaux rapports (Sauvegardés avec ID unique)
            else if (key && key.startsWith('ID_')) {
                const dataStr = localStorage.getItem(key);
                if (dataStr && dataStr.includes('{')) {
                    const data = JSON.parse(dataStr);
                    if (data && data.displayName && data.displayName.startsWith('englobe_')) {
                        const displayName = data.displayName.replace('englobe_', '').replace(/_/g, ' ');
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
        option.value = report.key; // La vraie clé système (englobe_... ou ID_...)
        option.textContent = report.display; // Le nom propre et formaté
        dropdown.appendChild(option);
    });

    // Garder le rapport actuel sélectionné dans la liste
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
    currentTruckPage = 1;
    updateTruckPagination();
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

function loadReport() {
    const dropdown = document.getElementById('saved-reports-dropdown');
    if (!dropdown) return;
    const selectedKey = dropdown.value;

    if (!selectedKey) {
        showToast("Veuillez d'abord sélectionner un rapport sauvegardé dans la liste déroulante.", "info");
        return;
    }

    const reportDataStr = localStorage.getItem(selectedKey);
    if (!reportDataStr) return;

    clearForm();
    let reportData;
    try {
        reportData = JSON.parse(reportDataStr);
    } catch (error) {
        console.error("Rapport béton invalide", error);
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
            updateTruckHeader(card.querySelector('.truck-id'));
            const rmInput = card.querySelector('.truck-remarques-list');
            if (rmInput) {
                let rawVal = truckInfo.remarquesList || truckInfo.remarqueSelect || '';
                rmInput.value = rawVal.split(',').map(s => s.trim()).filter(s => s !== "").join(',');
            }
            updateTruckColor(card);
        });
        updateRemarkLetterState();
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
    collapseAllTrucks();

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

    // 1. On calcule le nom de base par défaut
    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const resistance = document.getElementById('f2-spec-resistance')?.value.trim() || 'Mix';
    const techName = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `englobe_${rawDate}_${noProjet}_${resistance}_${techInitials}`;
    const autoBaseName = baseName; // Nom automatique calculé avec les champs ACTUELS du formulaire
    let autoNameToSave = baseName; // Mémorise le dernier nom automatique (pour savoir si l'utilisateur l'a modifié)

    // 2. Demande un nom SEULEMENT si c'est un nouveau rapport ou une copie
    if (!saveKey || isDuplicate) {
        if (isDuplicate) baseName += "_copie"; // Ajoute le tag copie par défaut
        autoNameToSave = baseName;
        const promptMsg = isDuplicate ? "Nom pour la COPIE du rapport :" : "Nom de sauvegarde du rapport (modifiable) :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        
        // Création de l'identifiant unique invisible
        saveKey = 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    } else {
        // 3. C'EST UNE MISE À JOUR : on garde le nom choisi par l'utilisateur,
        //    mais si le nom est encore celui généré automatiquement, on le met à jour
        //    avec les champs actuels (ex: "Mix" remplacé par la vraie résistance).
        const existingDataStr = localStorage.getItem(saveKey);
        if (existingDataStr) {
            try {
                const existingData = JSON.parse(existingDataStr);
                if (existingData.displayName) {
                    const oldName = existingData.displayName;
                    const copySuffix = oldName.endsWith('_copie') ? '_copie' : '';
                    // Rapports récents : on compare avec le dernier nom automatique mémorisé.
                    // Anciens rapports (sans autoName) : on détecte les valeurs par défaut (Mix, TECH, SANS-NUMERO).
                    const wasAutoName = existingData.autoName
                        ? oldName === existingData.autoName
                        : /_(Mix|TECH)(_|$)|_SANS-NUMERO_/.test(oldName);

                    if (wasAutoName) {
                        baseName = autoBaseName + copySuffix;
                        autoNameToSave = baseName;
                    } else {
                        baseName = oldName; // Nom personnalisé : on ne touche pas
                        autoNameToSave = existingData.autoName;
                    }
                }
            } catch(e) {}
        }
    }

    // Outil pour réparer les zéros manquants (".5" devient "0.5")
    const fixZero = (v) => {
        if (!v) return "";
        let str = v.toString();
        if (str.startsWith('.')) return '0' + str;
        if (str.startsWith('-.')) return '-0.' + str.substring(2);
        return str;
    };

    const staticData = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        if (el.id === 'saved-reports-dropdown') return;
        if (el.type === 'checkbox') {
            staticData[el.id] = el.checked;
        } else {
            staticData[el.id] = el.type === 'number' ? fixZero(el.value) : el.value;
        }
    });

    const trucksData = [];
    document.querySelectorAll('.truck-card').forEach(card => {
        trucksData.push({
            id: card.querySelector('.truck-id').value,
            bordereau: card.querySelector('.truck-bordereau').value,
            volume: fixZero(card.querySelector('.truck-volume').value),
            timeMix: card.querySelector('.truck-time-mix').value,
            timeStart: card.querySelector('.truck-time-start').value,
            timeEnd: card.querySelector('.truck-time-end').value,
            water: fixZero(card.querySelector('.truck-water').value),
            plast: fixZero(card.querySelector('.truck-plast').value),
            air1: fixZero(card.querySelector('.truck-air1').value),
            air2: fixZero(card.querySelector('.truck-air2').value),
            temp: fixZero(card.querySelector('.truck-temp').value),
            slump1: fixZero(card.querySelector('.truck-slump1').value),
            slump1Sp: card.querySelector('.truck-slump1-sp').checked,
            slump2: fixZero(card.querySelector('.truck-slump2').value),
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
                if (input.type === 'checkbox') data[cls] = input.checked;
                else data[cls] = input.type === 'number' ? fixZero(input.value) : input.value;
            }
        });
        samplesData.push(data);
    });

    const reportData = {
        displayName: baseName, // Le nom préservé est sauvegardé
        autoName: autoNameToSave, // Dernier nom généré automatiquement (sert à détecter une modification manuelle)
        static: staticData,
        trucks: trucksData,
        samples: samplesData,
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

/*
function saveReport(isDuplicate = false) {
    let saveKey = currentActiveReportKey;

    // 1. On recalcule TOUJOURS le nom de base avec les champs actuels
    const noProjet = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
    const rawDate = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
    const resistance = document.getElementById('f2-spec-resistance')?.value.trim() || 'Mix';
    const techName = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
    const techInitials = techName.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';
    
    let baseName = `englobe_${rawDate}_${noProjet}_${resistance}_${techInitials}`;

    // 2. Demande un nom SEULEMENT si c'est un nouveau rapport ou une copie
    if (!saveKey || isDuplicate) {
        const promptMsg = isDuplicate ? "Nom pour la COPIE du rapport :" : "Nom de sauvegarde du rapport (modifiable) :";
        let userPromptName = prompt(promptMsg, baseName);
        if (userPromptName === null) return; 
        
        baseName = userPromptName.trim() || baseName;
        if (!baseName.startsWith('englobe_')) baseName = `englobe_${baseName}`;
        
        // Création de l'identifiant unique invisible
        saveKey = 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
            if (cls) data[cls] = input.type === 'checkbox' ? input.checked : input.value;
        });
        samplesData.push(data);
    });

    const reportData = {
        displayName: baseName, // <-- Le nom que le technicien voit
        static: staticData,
        trucks: trucksData,
        samples: samplesData,
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

*/
function deleteTruckCard(btn, event) {
    event.stopPropagation(); // Empêche l'accordéon de s'ouvrir/fermer quand on clique sur le X
    if (confirm("Voulez-vous vraiment supprimer ce camion ?")) {
        const card = btn.closest('.truck-card');
        card.remove();
        renumberTrucks();
        calculateTotals();
        updateTruckPagination();
        syncForm3UI();
    }
}

function renumberTrucks() {
    const trucks = document.querySelectorAll('.truck-card');
    trucks.forEach((card, index) => {
        const newNum = index + 1;
        const numDisplay = card.querySelector('.truck-number-display');
        const oldNum = numDisplay.textContent;
        
        // 1. Mise à jour visuelle du camion
        numDisplay.textContent = newNum;
        
        // 2. Mise à jour de la liaison avec le Formulaire 3
        const linkedSamples = document.querySelectorAll(`.sample-card[data-linked-truck="${oldNum}"]`);
        linkedSamples.forEach(sample => {
            sample.dataset.linkedTruck = newNum;
            const displayEl = sample.querySelector('.sample-truck-linked');
            if (displayEl) displayEl.textContent = newNum;
        });
    });
    
    // 3. Réinitialise le compteur global pour le prochain ajout
    truckCount = trucks.length; 
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
    showToast(`Le rapport a été supprimé avec succès.`, "success");
    
    currentActiveReportKey = null; 
    clearForm(); 
    updateDropdown(); 
}

document.addEventListener('input', function(e) {
    if (e.target.matches('.truck-air1, .truck-air2, .truck-slump1, .truck-slump2')) {
        const card = e.target.closest('.truck-card');
        if (card) updateTruckColor(card);
    }
});

// === MOTEUR D'EXPORT MULTI-TEMPLATE (OFFLINE BASE64) === //
async function exportToPDF() {
    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) {
            btn.textContent = "⏳ Génération en cours...";
            btn.disabled = true;
        }

        // Utilitaire pour la conversion en format francophone sécuritaire
        const formatNum = (val) => {
            if (!val) return "";
            let str = val.toString();
            if (str.startsWith('.')) str = '0' + str;
            if (str.startsWith('-.')) str = '-0.' + str.substring(2);
            return str.replace('.', ',');
        };

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

        formF1.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F1'); } catch(e){} });

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
                        if (el.type === 'checkbox') {
                            el.checked ? formF2.getCheckBox(name).check() : formF2.getCheckBox(name).uncheck();
                        } else {
                            let val = el.value || "";
                            if (['f2-total-coulee', 'f2-total-refuse', 'f2-total-verifie'].includes(name)) {
                                val = formatNum(val);
                            }
                            formF2.getTextField(name).setText(val);
                        }
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
                        if (isCheck) {
                            el.checked ? formF2.getCheckBox(pdfName).check() : formF2.getCheckBox(pdfName).uncheck();
                        } else if (el.value) {
                            let val = el.value;
                            if (['.truck-water', '.truck-plast', '.truck-air1', '.truck-air2', '.truck-temp'].includes(cls)) {
                                val = formatNum(val);
                            }
                            formF2.getTextField(pdfName).setText(val);
                        }
                    } catch (e) {}
                };

                const isRefused = card.querySelector('.truck-refuse').checked;
                const volInput = card.querySelector('.truck-volume');
                
                if (volInput && volInput.value) {
                    let volStr = volInput.value;
                    if (volStr.startsWith('.')) volStr = '0' + volStr;
                    const vol = parseFloat(volStr) || 0;
                    if (!isRefused) {
                        volumeCumuleF2 += vol;
                    }
                    try { formF2.getTextField(`truck-${row}-vol-un`).setText(formatNum(volStr)); } catch(e) {}
                    try { formF2.getTextField(`truck-${row}-vol-cum`).setText(isRefused ? "" : formatNum(volumeCumuleF2.toFixed(1))); } catch(e) {}
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

            formF2.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F2_pg' + p); } catch(e){} });

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

            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F3_s' + num); } catch(e){} });

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

            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F4_t' + num); } catch(e){} });

            const copiedPages = await mergedPdf.copyPages(subDoc, subDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const noProjetVal = document.getElementById('global-no-projet').value.trim() || 'SANS-NUMERO';
        const rawDateVal = document.getElementById('global-date').value || new Date().toISOString().split('T')[0];
        const resistanceVal = document.getElementById('f2-spec-resistance')?.value.trim() || 'Mix';
        const techNameVal = document.getElementById('f2-tech-name')?.value || document.getElementById('f1-tech-name')?.value || '';
        const initialsVal = techNameVal.split(' ').filter(n => n).map(n => n[0].toUpperCase()).join('') || 'TECH';

        const pdfBytes = await mergedPdf.save();
        const fileName = `Rapport_${rawDateVal}_${noProjetVal}_${resistanceVal}_${initialsVal}.pdf`;

        // ==========================================
        // BIFURCATION : APPLICATION ANDROID vs WEB
        // ==========================================
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            // 1. COMPORTEMENT APPLICATION NATIVE (TABLETTE)
            try {
                const pdfBase64 = await mergedPdf.saveAsBase64(); // pdf-lib convertit ça parfaitement
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
                console.error("Erreur de sauvegarde native:", err);
                alert("Erreur lors de l'enregistrement sur la tablette.");
            }
        } else {
            // 2. COMPORTEMENT WEB ORIGINAL (GITHUB PAGES / PC)
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
            } catch (err) {
                console.log("Partage annulé ou échoué:", err);
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
// === MOTEUR D'EXPORT MULTI-TEMPLATE (OFFLINE BASE64) === //
async function exportToPDF() {
    try {
        const btn = document.querySelector('button[onclick="exportToPDF()"]');
        const originalText = btn ? btn.textContent : "📄 Exporter en PDF";
        if (btn) {
            btn.textContent = "⏳ Génération en cours...";
            btn.disabled = true;
        }

        // Utilitaire pour la conversion en format francophone sécuritaire
        const formatNum = (val) => {
            if (!val) return "";
            let str = val.toString();
            if (str.startsWith('.')) str = '0' + str;
            if (str.startsWith('-.')) str = '-0.' + str.substring(2);
            return str.replace('.', ',');
        };

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

        formF1.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F1'); } catch(e){} });

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
                        if (el.type === 'checkbox') {
                            el.checked ? formF2.getCheckBox(name).check() : formF2.getCheckBox(name).uncheck();
                        } else {
                            let val = el.value || "";
                            if (['f2-total-coulee', 'f2-total-refuse', 'f2-total-verifie'].includes(name)) {
                                val = formatNum(val);
                            }
                            formF2.getTextField(name).setText(val);
                        }
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
                        if (isCheck) {
                            el.checked ? formF2.getCheckBox(pdfName).check() : formF2.getCheckBox(pdfName).uncheck();
                        } else if (el.value) {
                            let val = el.value;
                            if (['.truck-water', '.truck-plast', '.truck-air1', '.truck-air2', '.truck-temp'].includes(cls)) {
                                val = formatNum(val);
                            }
                            formF2.getTextField(pdfName).setText(val);
                        }
                    } catch (e) {}
                };

                const isRefused = card.querySelector('.truck-refuse').checked;
                const volInput = card.querySelector('.truck-volume');
                
                if (volInput && volInput.value) {
                    let volStr = volInput.value;
                    if (volStr.startsWith('.')) volStr = '0' + volStr;
                    const vol = parseFloat(volStr) || 0;
                    if (!isRefused) {
                        volumeCumuleF2 += vol;
                    }
                    try { formF2.getTextField(`truck-${row}-vol-un`).setText(formatNum(volStr)); } catch(e) {}
                    try { formF2.getTextField(`truck-${row}-vol-cum`).setText(isRefused ? "" : formatNum(volumeCumuleF2.toFixed(1))); } catch(e) {}
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

            formF2.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F2_pg' + p); } catch(e){} });

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

            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F3_s' + num); } catch(e){} });

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

            form.getFields().forEach(f => { try { f.acroField.setPartialName(f.getName() + '_F4_t' + num); } catch(e){} });

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
            console.log("Partage annulé ou échoué:", err);
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