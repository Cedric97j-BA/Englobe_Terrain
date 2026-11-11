// ========================================================================== //
// CROQUIS : PLANCHE À DESSIN ET « JOINDRE UN CROQUIS » (PAGE AJOUTÉE AU PDF)   //
// Fichier commun à toutes les apps, déployé par SFGEN (assets/hub/) dans       //
// shared/js/. Ne pas modifier la copie du Hub : SFGEN la remplace.             //
// ========================================================================== //
// Deux usages :
//  1. Champ « Croquis » d'une app SFGEN (ex. zone_croquis de l'app tree/GEN/croquis) :
//       <div class="sfgen-sketch" data-croquis-pad data-sketch-id="zone_croquis" data-sketch-label="...">
//           <input type="hidden" id="zone_croquis__croquis"></div>
//     La planche est construite ici ; les traits sont gardés dans le champ caché (sauvegardé avec le rapport)
//     et Croquis.embedPads(pdfDoc, form) les place dans le champ PDF du même nom à l'export.
//  2. Apps qui l'ont choisie (window.REPORT_CONFIG.croquis === true : case de SFGEN, ou bouton « ✏️ Croquis annexé »
//     de l'onglet Arborescence & Santé) : case « ✏️ Joindre un croquis annexé à ce rapport » en bas du formulaire.
//     Cochée : champs du croquis + planche ; à l'export PDF (📄 / 🏛️ / ⚡), la feuille Croquis (tpl_croquis.js,
//     chargée à la demande) est remplie, le dessin est placé dans « zone_croquis » et la page est ajoutée à la fin.
// À charger APRÈS gestion_rapports.js (enveloppe storeReport, loadReport, clearForm et exportToPDF).
// Forcer : window.CROQUIS_ADDON = true / false avant ce script.
// Toucher (iOS / Android), stylet et souris : Pointer Events ; la paume est ignorée dès qu'un stylet est vu.
(function () {
    'use strict';

    const SCRIPT_SRC = document.currentScript ? document.currentScript.src : '';
    const ZONE_FIELD = 'zone_croquis';
    const ZONE_RATIO = 467.622 / 499.592;  // hauteur / largeur du bouton « zone_croquis » de la feuille Croquis
    const DEFAULT_RATIO = 0.75;            // autres champs Croquis : format 4:3
    const BASE_WIDTH = 1600;               // résolution interne fixe : net sur téléphone comme sur un écran 4K
    const SAVED_PNG_WIDTH = 800;           // image gardée dans le rapport (croquis_data_url)
    const MAX_UNDO = 25;
    const COLORS = [['#000000', 'Noir'], ['#1d4ed8', 'Bleu'], ['#dc2626', 'Rouge']];
    const WIDTHS = [[0.003, 'Fin'], [0.006, 'Moyen'], [0.012, 'Épais']];
    const TEXT_SIZES = { 0.003: 0.02, 0.006: 0.026, 0.012: 0.034 };  // taille du texte selon l'épaisseur choisie
    const TOOLS = [['pen', '✏️', 'Crayon', 'Crayon (main levée)'], ['line', '📏', 'Ligne', 'Ligne droite'],
        ['arrow', '↗️', 'Flèche', 'Flèche'], ['text', '🔤', 'Texte', 'Texte / cote'], ['eraser', '🧽', 'Efface', 'Gomme']];
    const FONT_STACK = '"Segoe UI", Arial, Helvetica, sans-serif';

    // ---------------------------------------------------------------------- //
    // Dessin d'un élément (coordonnées relatives 0 à 1 : net à toute taille)  //
    // ---------------------------------------------------------------------- //
    // Trait libre : { c: couleur (null = gomme), w, p: [x, y, pression, ...] } (format des croquis SFGEN v1)
    // Ligne / flèche : { t: 'line' | 'arrow', c, w, a: [x1, y1, x2, y2] } ; texte : { t: 'text', c, z, x, y, s }
    // Image (croquis repris d'un PNG) : { t: 'img', d: dataURL }
    function penWidth(it, W, i) {
        const p = it.p;
        const r = i > 0 ? (p[3 * i - 1] + p[3 * i + 2]) / 2 : p[2];
        return it.w * W * (0.5 + (r || 0.5));
    }

    // Segment k du trait (k >= 1) : P0 -> milieu(P0,P1), puis courbes entre milieux (contrôle = point) ;
    // tail = dernier bout jusqu'au dernier point. Même découpage en direct et au redessin.
    function penSegment(ctx, it, k, W, H, tail) {
        const p = it.p, n = p.length / 3;
        const X = i => p[3 * i] * W, Y = i => p[3 * i + 1] * H;
        const mx = (a, b) => (X(a) + X(b)) / 2, my = (a, b) => (Y(a) + Y(b)) / 2;
        ctx.beginPath();
        if (tail) {
            if (n === 1) {
                ctx.arc(X(0), Y(0), penWidth(it, W, 0) / 2, 0, Math.PI * 2);
                ctx.fill();
                return;
            }
            ctx.lineWidth = penWidth(it, W, n - 1);
            ctx.moveTo(mx(n - 2, n - 1), my(n - 2, n - 1));
            ctx.lineTo(X(n - 1), Y(n - 1));
        } else if (k === 1) {
            ctx.lineWidth = penWidth(it, W, 1);
            ctx.moveTo(X(0), Y(0));
            ctx.lineTo(mx(0, 1), my(0, 1));
        } else {
            ctx.lineWidth = penWidth(it, W, k - 1);
            ctx.moveTo(mx(k - 2, k - 1), my(k - 2, k - 1));
            ctx.quadraticCurveTo(X(k - 1), Y(k - 1), mx(k - 1, k), my(k - 1, k));
        }
        ctx.stroke();
    }

    function prepare(ctx, it) {
        ctx.globalCompositeOperation = it.c ? 'source-over' : 'destination-out';
        ctx.strokeStyle = ctx.fillStyle = it.c || '#000000';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    function drawItem(ctx, it, W, H) {
        ctx.save();
        if (it.t === 'img') {
            if (it._img && it._img.complete && it._img.naturalWidth) ctx.drawImage(it._img, 0, 0, W, H);
        } else if (it.t === 'text') {
            prepare(ctx, it);
            ctx.font = `600 ${Math.max(8, it.z * W)}px ${FONT_STACK}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(it.s, it.x * W, it.y * H);
        } else if (it.t === 'line' || it.t === 'arrow') {
            prepare(ctx, it);
            const [x1, y1, x2, y2] = [it.a[0] * W, it.a[1] * H, it.a[2] * W, it.a[3] * H];
            ctx.lineWidth = it.w * W;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            if (it.t === 'arrow') {
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const head = Math.max(W * 0.018, it.w * W * 4);
                ctx.beginPath();
                ctx.moveTo(x2, y2);
                ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
                ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
                ctx.closePath();
                ctx.fill();
            }
        } else if (it.p && it.p.length >= 3) {
            prepare(ctx, it);
            const n = it.p.length / 3;
            for (let k = 1; k < n; k++) penSegment(ctx, it, k, W, H, false);
            penSegment(ctx, it, n, W, H, true);
        }
        ctx.restore();
    }

    function el(tag, className, attrs) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === 'text') node.textContent = v;
            else node.setAttribute(k, v);
        });
        return node;
    }

    // ---------------------------------------------------------------------- //
    // Planche à dessin                                                       //
    // ---------------------------------------------------------------------- //
    function Pad(host, opts) {
        this.host = host;
        this.id = opts.id || '';
        this.label = opts.label || this.id;
        this.ratio = opts.ratio || (this.id === ZONE_FIELD ? ZONE_RATIO : DEFAULT_RATIO);
        this.store = opts.store || null;
        this.onChange = opts.onChange || null;
        this.W = BASE_WIDTH;
        this.H = Math.round(BASE_WIDTH * this.ratio);
        this.items = [];
        this.undoStack = [];
        this.grid = true;
        this.tool = 'pen';
        this.color = COLORS[0][0];
        this.width = WIDTHS[1][0];
        this.penSeen = false;
        this.pointerId = null;
        this.current = null;
        this.build();
        this.bindPointer();
        if (this.store) this.loadData(this.store.value);
    }

    Pad.prototype.build = function () {
        const host = this.host;
        host.classList.add('crq-pad');
        const bar = el('div', 'crq-toolbar', { role: 'toolbar', 'aria-label': 'Outils de croquis' });
        const tools = el('div', 'crq-group');
        TOOLS.forEach(([key, icon, label, title]) => {
            const b = el('button', 'crq-btn crq-tool' + (key === this.tool ? ' active' : ''), { type: 'button', 'data-tool': key, title });
            b.append(icon, el('span', 'crq-lbl', { text: label }));
            b.addEventListener('click', () => this.setTool(key));
            tools.appendChild(b);
        });
        const colors = el('div', 'crq-group');
        COLORS.forEach(([value, label]) => {
            const b = el('button', 'crq-btn crq-color' + (value === this.color ? ' active' : ''), { type: 'button', 'data-color': value, title: label });
            b.appendChild(el('i', 'crq-dot'));
            b.addEventListener('click', () => this.setColor(value));
            colors.appendChild(b);
        });
        const widths = el('div', 'crq-group');
        WIDTHS.forEach(([value, label]) => {
            const b = el('button', 'crq-btn crq-width' + (value === this.width ? ' active' : ''), { type: 'button', 'data-width': String(value), title: `Trait ${label.toLowerCase()}` });
            b.append(el('i', 'crq-line'), el('span', 'crq-lbl', { text: label }));
            b.addEventListener('click', () => this.setWidth(value));
            widths.appendChild(b);
        });
        const actions = el('div', 'crq-group');
        this.btnGrid = el('button', 'crq-btn crq-grid active', { type: 'button', title: 'Grille de fond (non imprimée)' });
        this.btnGrid.append('▦', el('span', 'crq-lbl', { text: 'Grille : Oui' }));
        this.btnGrid.addEventListener('click', () => this.setGrid(!this.grid, true));
        this.btnUndo = el('button', 'crq-btn crq-undo', { type: 'button', title: 'Annuler la dernière action' });
        this.btnUndo.append('↩️', el('span', 'crq-lbl', { text: 'Annuler' }));
        this.btnUndo.addEventListener('click', () => this.undo());
        const btnClear = el('button', 'crq-btn crq-clear', { type: 'button', title: 'Tout effacer' });
        btnClear.append('🗑️', el('span', 'crq-lbl', { text: 'Tout effacer' }));
        btnClear.addEventListener('click', () => this.clear(true));
        actions.append(this.btnGrid, this.btnUndo, btnClear);
        bar.append(tools, colors, widths, actions);

        // Fond (grille) = arrière-plan de la scène ; encre et aperçu = deux calques transparents
        this.stage = el('div', 'crq-stage crq-grid-on');
        this.ink = el('canvas', 'crq-ink', { width: this.W, height: this.H });
        this.preview = el('canvas', 'crq-preview', { width: this.W, height: this.H });
        this.ctx = this.ink.getContext('2d');
        this.pctx = this.preview.getContext('2d');

        this.modal = el('div', 'crq-modal', { hidden: '' });
        const box = el('div', 'crq-modal-box', { role: 'dialog', 'aria-label': 'Texte ou cote' });
        this.modalInput = el('input', '', { type: 'text', placeholder: 'ex. 4,50 m · Nord · Camion #3', enterkeyhint: 'done', autocomplete: 'off' });
        const ok = el('button', 'crq-btn crq-ok', { type: 'button', text: 'Placer' });
        const cancel = el('button', 'crq-btn', { type: 'button', text: 'Annuler' });
        const row = el('div', 'crq-modal-actions');
        row.append(cancel, ok);
        box.append(el('label', '', { text: 'Texte / cote' }), this.modalInput, row);
        this.modal.appendChild(box);
        ok.addEventListener('click', () => this.placeText());
        cancel.addEventListener('click', () => this.closeModal());
        this.modalInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); this.placeText(); }
            if (e.key === 'Escape') { e.preventDefault(); this.closeModal(); }
        });

        this.stage.append(this.ink, this.preview, this.modal);
        host.append(bar, this.stage);
        this.refreshUndoButton();
    };

    Pad.prototype.setActive = function (selector, attr, value) {
        this.host.querySelectorAll(selector).forEach(b => b.classList.toggle('active', b.getAttribute(attr) === String(value)));
    };

    Pad.prototype.setTool = function (tool) {
        this.tool = tool;
        this.setActive('.crq-tool', 'data-tool', tool);
        this.preview.style.cursor = tool === 'text' ? 'text' : 'crosshair';
    };

    Pad.prototype.setColor = function (color) {
        this.color = color;
        this.setActive('.crq-color', 'data-color', color);
        if (this.tool === 'eraser') this.setTool('pen');
    };

    Pad.prototype.setWidth = function (width) {
        this.width = width;
        this.setActive('.crq-width', 'data-width', width);
    };

    Pad.prototype.setGrid = function (on, notify) {
        this.grid = !!on;
        this.stage.classList.toggle('crq-grid-on', this.grid);
        this.btnGrid.classList.toggle('active', this.grid);
        this.btnGrid.querySelector('.crq-lbl').textContent = this.grid ? 'Grille : Oui' : 'Grille : Non';
        if (notify) this.changed();
    };

    Pad.prototype.pos = function (e) {
        const r = this.preview.getBoundingClientRect();
        const pr = e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5;
        const clamp = v => Math.min(1, Math.max(0, v));
        return [+clamp((e.clientX - r.left) / r.width).toFixed(4), +clamp((e.clientY - r.top) / r.height).toFixed(4), +pr.toFixed(2)];
    };

    Pad.prototype.bindPointer = function () {
        const c = this.preview;
        c.addEventListener('pointerdown', e => {
            if (e.pointerType === 'pen') this.penSeen = true;
            if (this.pointerId !== null || !this.modal.hidden) return;
            if ((this.penSeen && e.pointerType === 'touch') || (e.pointerType === 'mouse' && e.button !== 0)) return;
            e.preventDefault();
            this.pointerId = e.pointerId;
            try { c.setPointerCapture(e.pointerId); } catch (err) {}
            const p = this.pos(e);
            if (this.tool === 'pen' || this.tool === 'eraser') {
                const eraser = this.tool === 'eraser';
                this.current = { c: eraser ? null : this.color, w: eraser ? this.width * 4 : this.width, p };
            } else if (this.tool === 'line' || this.tool === 'arrow') {
                this.current = { t: this.tool, c: this.color, w: this.width, a: [p[0], p[1], p[0], p[1]] };
            } else {
                this.current = { t: 'tap', x: p[0], y: p[1] };
            }
        });
        c.addEventListener('pointermove', e => {
            if (e.pointerId !== this.pointerId || !this.current) return;
            e.preventDefault();
            const cur = this.current;
            if (cur.p) {
                const events = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
                this.ctx.save();
                prepare(this.ctx, cur);
                events.forEach(ev => {
                    cur.p.push(...this.pos(ev));
                    penSegment(this.ctx, cur, cur.p.length / 3 - 1, this.W, this.H, false);
                });
                this.ctx.restore();
            } else if (cur.a) {
                const p = this.pos(e);
                cur.a[2] = p[0];
                cur.a[3] = p[1];
                this.pctx.clearRect(0, 0, this.W, this.H);
                drawItem(this.pctx, cur, this.W, this.H);
            }
        });
        const end = e => {
            if (e.pointerId !== this.pointerId) return;
            this.pointerId = null;
            const cur = this.current;
            this.current = null;
            if (!cur) return;
            if (cur.p) {
                this.ctx.save();
                prepare(this.ctx, cur);
                penSegment(this.ctx, cur, 0, this.W, this.H, true);
                this.ctx.restore();
                this.commit(cur);
            } else if (cur.a) {
                this.pctx.clearRect(0, 0, this.W, this.H);
                const long = Math.hypot(cur.a[2] - cur.a[0], (cur.a[3] - cur.a[1]) * this.ratio) > 0.004;
                if (long && e.type !== 'pointercancel') {
                    drawItem(this.ctx, cur, this.W, this.H);
                    this.commit(cur);
                }
            } else if (cur.t === 'tap' && e.type === 'pointerup') {
                this.openModal(cur.x, cur.y);
            }
        };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => c.addEventListener(t, end));
        // iOS / Android : ni défilement ni loupe pendant le dessin
        ['touchstart', 'touchmove'].forEach(t => c.addEventListener(t, e => e.preventDefault(), { passive: false }));
    };

    Pad.prototype.openModal = function (x, y) {
        this.textAt = [x, y];
        this.modalInput.value = '';
        this.modal.hidden = false;
        setTimeout(() => this.modalInput.focus(), 30);
    };

    Pad.prototype.closeModal = function () {
        this.modal.hidden = true;
        this.textAt = null;
    };

    Pad.prototype.placeText = function () {
        const text = this.modalInput.value.trim();
        const at = this.textAt;
        this.closeModal();
        if (!text || !at) return;
        const it = { t: 'text', c: this.color, z: TEXT_SIZES[this.width] || TEXT_SIZES[0.006], x: at[0], y: at[1], s: text };
        drawItem(this.ctx, it, this.W, this.H);
        this.commit(it);
    };

    Pad.prototype.commit = function (it) {
        this.pushUndo();
        this.items.push(it);
        this.changed();
    };

    Pad.prototype.pushUndo = function () {
        this.undoStack.push(this.items.slice());
        if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    };

    Pad.prototype.undo = function () {
        if (!this.undoStack.length) return;
        this.items = this.undoStack.pop();
        this.redraw();
        this.changed();
    };

    Pad.prototype.clear = function (ask) {
        if (!this.items.length) return;
        if (ask && !confirm('Effacer tout le croquis ?')) return;
        this.pushUndo();
        this.items = [];
        this.redraw();
        this.changed();
    };

    Pad.prototype.reset = function () {
        this.items = [];
        this.undoStack = [];
        this.closeModal();
        this.setGrid(true, false);
        this.redraw();
        this.refreshUndoButton();
    };

    Pad.prototype.redraw = function () {
        this.ctx.clearRect(0, 0, this.W, this.H);
        this.pctx.clearRect(0, 0, this.W, this.H);
        this.items.forEach(it => drawItem(this.ctx, it, this.W, this.H));
    };

    Pad.prototype.refreshUndoButton = function () {
        if (this.btnUndo) this.btnUndo.disabled = !this.undoStack.length;
    };

    Pad.prototype.changed = function () {
        this.refreshUndoButton();
        if (this.store) this.store.value = (this.items.length || !this.grid) ? this.serialize() : '';
        if (this.onChange) this.onChange(this);
    };

    Pad.prototype.isEmpty = function () {
        return !this.items.length;
    };

    Pad.prototype.serialize = function () {
        return JSON.stringify({ v: 2, g: this.grid ? 1 : 0, s: this.items });
    };

    function withImage(it) {
        if (it && it.t === 'img' && it.d && !it._img) {
            const img = new Image();
            Object.defineProperty(it, '_img', { value: img, enumerable: false });
            return new Promise(resolve => {
                img.onload = img.onerror = () => resolve(it);
                img.src = it.d;
            });
        }
        return Promise.resolve(it);
    }

    // Traits enregistrés (v1 de SFGEN ou v2) ; retourne une promesse résolue une fois les images prêtes
    Pad.prototype.loadData = function (text) {
        let data = null;
        try { data = text ? (typeof text === 'string' ? JSON.parse(text) : text) : null; } catch (e) {}
        this.items = data && Array.isArray(data.s) ? data.s.filter(it => it && typeof it === 'object') : [];
        this.undoStack = [];
        this.closeModal();
        this.setGrid(data ? data.g !== 0 : true, false);
        this.redraw();
        this.refreshUndoButton();
        return Promise.all(this.items.map(withImage)).then(() => this.redraw());
    };

    // Croquis repris d'une image seulement (ex. rapport reçu sans les traits) : image de fond, on peut dessiner dessus
    Pad.prototype.loadImage = function (dataUrl) {
        return this.loadData({ v: 2, g: 1, s: dataUrl ? [{ t: 'img', d: dataUrl }] : [] });
    };

    // PNG transparent (la grille n'est pas imprimée)
    Pad.prototype.toPng = function (width) {
        const W = Math.round(width || BASE_WIDTH), H = Math.round(W * this.ratio);
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        this.items.forEach(it => drawItem(ctx, it, W, H));
        return canvas.toDataURL('image/png');
    };

    // ---------------------------------------------------------------------- //
    // PDF : dessin dans le bouton « zone_croquis » (ou un champ du même nom)   //
    // ---------------------------------------------------------------------- //
    function base64ToBytes(b64) {
        const str = window.atob(b64);
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
        return bytes;
    }

    function widgetPage(pdfDoc, widget, pages) {
        const ref = pdfDoc.context.getObjectRef(widget.dict);
        return pages.find(pg => {
            const annots = pg.node.Annots();
            return annots && annots.asArray().includes(ref);
        }) || pages[0];
    }

    function findField(form, name) {
        try { return form.getButton(name); } catch (e) {}
        try { return form.getField(name); } catch (e) {}
        return null;
    }

    // Place l'image (proportions gardées, centrée) dans le rectangle du champ, puis retire le champ :
    // ni bouton ni bordure par-dessus le dessin. Retourne false si le PDF n'a pas ce champ.
    async function stampOnField(pdfDoc, form, fieldName, pngDataUrl) {
        const field = findField(form, fieldName);
        if (!field) return false;
        const pages = pdfDoc.getPages();
        const image = pngDataUrl ? await pdfDoc.embedPng(pngDataUrl) : null;
        field.acroField.getWidgets().forEach(widget => {
            if (!image) return;
            const r = widget.getRectangle();
            const scale = Math.min(r.width / image.width, r.height / image.height);
            const w = image.width * scale, h = image.height * scale;
            widgetPage(pdfDoc, widget, pages).drawImage(image, { x: r.x + (r.width - w) / 2, y: r.y + (r.height - h) / 2, width: w, height: h });
        });
        form.removeField(field);
        return true;
    }

    // ---------------------------------------------------------------------- //
    // Champs « Croquis » des apps SFGEN                                      //
    // ---------------------------------------------------------------------- //
    const pads = {};

    function initPads(root) {
        (root || document).querySelectorAll('[data-croquis-pad][data-sketch-id]').forEach(host => {
            const id = host.dataset.sketchId;
            if (pads[id]) return;
            pads[id] = new Pad(host, {
                id,
                label: host.dataset.sketchLabel || id,
                ratio: parseFloat(host.dataset.sketchRatio) || null,
                store: document.getElementById(id + '__croquis')
            });
        });
    }

    // Après chargement d'un rapport ou « Nouveau » : relit les traits gardés dans les champs cachés
    function refreshPads() {
        Object.values(pads).forEach(pad => pad.loadData(pad.store ? pad.store.value : ''));
    }

    async function embedPads(pdfDoc, form) {
        for (const pad of Object.values(pads)) {
            const png = pad.isEmpty() ? null : pad.toPng(BASE_WIDTH);
            if (await stampOnField(pdfDoc, form, pad.id, png) || !png) continue;
            // Aucun champ du même nom dans le PDF : croquis sur une page ajoutée à la fin
            const page = pdfDoc.addPage([612, 792]);
            const margin = 40;
            try { page.drawText(pad.label, { x: margin, y: 792 - margin - 14, size: 14 }); } catch (e) {}
            const image = await pdfDoc.embedPng(png);
            const scale = Math.min((612 - 2 * margin) / image.width, (792 - 2 * margin - 30) / image.height);
            const w = image.width * scale, h = image.height * scale;
            const y = 792 - margin - 30 - h;
            page.drawRectangle({ x: margin, y, width: w, height: h, borderColor: PDFLib.rgb(0.8, 0.84, 0.88), borderWidth: 0.75 });
            page.drawImage(image, { x: margin, y, width: w, height: h });
        }
    }

    // ---------------------------------------------------------------------- //
    // Feuille Croquis (tpl_croquis.js) : chargée à la demande, en cache hors ligne //
    // ---------------------------------------------------------------------- //
    let templatePromise = null;

    function templateBase64() {
        if (window.PDF_TEMPLATES && window.PDF_TEMPLATES.croquis) return window.PDF_TEMPLATES.croquis;
        return typeof TEMPLATE_CROQUIS !== 'undefined' ? TEMPLATE_CROQUIS : null;  // app Croquis autonome
    }

    function ensureTemplate() {
        if (templateBase64()) return Promise.resolve();
        if (!templatePromise) {
            templatePromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = new URL('tpl_croquis.js', SCRIPT_SRC || location.href).href;
                script.onload = () => (templateBase64() ? resolve() : reject(new Error('tpl_croquis.js sans modèle')));
                script.onerror = () => {
                    templatePromise = null;
                    reject(new Error('tpl_croquis.js introuvable'));
                };
                document.head.appendChild(script);
            });
        }
        return templatePromise;
    }

    // Découpe aux mots (et aux retours à la ligne) : même règle que les champs multi-lignes des apps SFGEN
    function splitIntoLines(text, count, fits) {
        const lines = [];
        let cur = '';
        const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split('\n');
        paragraphs.forEach((para, pi) => {
            para.split(/\s+/).filter(Boolean).forEach(word => {
                const candidate = cur ? `${cur} ${word}` : word;
                if (lines.length >= count - 1 || fits(lines.length, candidate)) {
                    cur = candidate;
                    return;
                }
                if (cur) {
                    lines.push(cur);
                    cur = '';
                }
                while (lines.length < count - 1 && !fits(lines.length, word)) {
                    let k = word.length - 1;
                    while (k > 1 && !fits(lines.length, word.slice(0, k))) k--;
                    lines.push(word.slice(0, k));
                    word = word.slice(k);
                }
                cur = word;
            });
            if (pi < paragraphs.length - 1 && lines.length < count - 1) {
                lines.push(cur);
                cur = '';
            }
        });
        lines.push(cur);
        return lines;
    }

    // Lignes de la feuille remplies par un seul texte (champ multi-lignes du formulaire, ou texte trop long pour une ligne)
    const SHEET_LINES = [['global-client-1', 'global-client-2']];

    // Feuille Croquis remplie (police Tahoma), dessin placé dans « zone_croquis », formulaire aplati
    async function buildSheet(values, pngDataUrl) {
        await ensureTemplate();
        const doc = await PDFLib.PDFDocument.load(base64ToBytes(templateBase64()));
        const form = doc.getForm();
        let font = null;
        if (typeof TAHOMA_FONT !== 'undefined' && window.fontkit) {
            try {
                doc.registerFontkit(window.fontkit);
                font = await doc.embedFont(base64ToBytes(TAHOMA_FONT), { subset: true });
            } catch (e) {
                console.warn('Croquis : police Tahoma non appliquée', e);
            }
        }
        const measureFont = font || await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        form.getFields().forEach(field => {
            const name = field.getName();
            const key = SHEET_ALIASES[name] || name;
            if (!values[key] || name === ZONE_FIELD) return;
            try { field.setText(String(values[key]).replace(/\s*\n\s*/g, ' ')); } catch (e) {}
        });
        SHEET_LINES.forEach(names => {
            const fields = names.map(n => { try { return form.getTextField(n); } catch (e) { return null; } });
            if (fields.some(f => !f) || values[names[1]]) return;  // ligne 2 remplie à part : rien à répartir
            const width = f => f.acroField.getWidgets()[0].getRectangle().width - 4;
            const size = f => {
                const m = (f.acroField.getDefaultAppearance() || '').match(/([\d.]+)\s+Tf/);
                return m && parseFloat(m[1]) > 0 ? parseFloat(m[1]) : Math.max(6, Math.min(12, f.acroField.getWidgets()[0].getRectangle().height * 0.7));
            };
            splitIntoLines(values[names[0]], fields.length, (i, s) => measureFont.widthOfTextAtSize(s, size(fields[i])) <= width(fields[i]))
                .forEach((line, i) => { try { fields[i].setText(line); } catch (e) {} });
        });
        if (font) {
            try {
                form.updateFieldAppearances(font);
            } catch (e) {
                console.warn('Croquis : police Tahoma non appliquée', e);
            }
        }
        await stampOnField(doc, form, ZONE_FIELD, pngDataUrl);
        form.flatten();
        return doc;
    }

    // ---------------------------------------------------------------------- //
    // « Joindre un croquis » dans les autres apps                            //
    // ---------------------------------------------------------------------- //
    // Champs de la feuille Croquis repris du formulaire (premier identifiant trouvé dans la page)
    const SYNCED_FIELDS = [
        ['global-date', 'Date du rapport', ['global-date'], 'date'],
        ['sig-prep-nom', 'Préparé par', ['sig-prep-nom', 'f2-tech-name', 'f1-tech-name', 'sig-englobe-nom'], 'text'],
        ['global-client-1', 'Client', ['global-client-1', 'global-client'], 'text'],
        ['global-client-2', 'Client (ligne 2)', ['global-client-2'], 'text'],
        ['global-projet', 'Projet', ['global-projet'], 'text'],
        ['global-no-projet', 'N° de projet', ['global-no-projet', 'global-no-client'], 'text'],
    ];
    // Autres noms possibles d'un champ de la feuille -> clé de la valeur
    const SHEET_ALIASES = { 'global-no-client': 'global-no-projet' };

    const addon = { pad: null, card: null, toggle: null, body: null, note: null, inputs: {} };

    function sourceOf(ids) {
        for (const id of ids) {
            const node = document.getElementById(id);
            if (node && !node.closest('.croquis-addon')) return node;
        }
        return null;
    }

    function isAttached() {
        return !!(addon.toggle && addon.toggle.checked);
    }

    // Valeurs de la feuille : formulaire principal, sinon champ du croquis ; « date » = date du croquis ou du rapport
    function sheetValues() {
        const values = {};
        SYNCED_FIELDS.forEach(([key, , ids]) => {
            const own = addon.inputs[key];
            const src = sourceOf(ids);
            values[key] = (own && own.value.trim()) || (src ? String(src.value || '').trim() : '');
        });
        const sketchDate = addon.inputs.date ? addon.inputs.date.value : '';
        values.date = sketchDate || values['global-date'];
        values['global-date'] = values['global-date'] || sketchDate;  // formulaire sans date générale
        return values;
    }

    function refreshNote() {
        if (!addon.note) return;
        const values = sheetValues();
        const shown = SYNCED_FIELDS.filter(([key, , ids]) => sourceOf(ids) && values[key]).map(([key, label]) => `${label} : ${values[key]}`);
        addon.note.textContent = shown.length ? `Repris du formulaire — ${shown.join(' · ')}` : 'Les champs Date, Client, Projet et Préparé par du formulaire seront repris sur la feuille Croquis.';
    }

    function showBody(on) {
        addon.body.hidden = !on;
        addon.card.classList.toggle('is-attached', on);
        if (on) {
            refreshNote();
            ensureTemplate().catch(() => {});  // préchargé : l'export ne l'attend pas
        }
    }

    function buildAddon() {
        const card = el('section', 'croquis-addon', { 'aria-label': 'Croquis annexé' });
        const toggleLabel = el('label', 'crq-attach-toggle');
        addon.toggle = el('input', 'crq-attach', { type: 'checkbox' });
        toggleLabel.append(addon.toggle, el('span', '', { text: '✏️ Joindre un croquis annexé à ce rapport' }));
        addon.toggle.addEventListener('change', () => showBody(addon.toggle.checked));

        addon.body = el('div', 'crq-attach-body', { hidden: '' });
        addon.note = el('p', 'crq-sync-note');
        const fields = el('div', 'crq-fields');
        const addInput = (key, label, type, hint) => {
            const wrap = el('label', 'crq-field');
            const input = el('input', '', { type, 'data-crq-field': key });
            if (hint) input.placeholder = hint;
            wrap.append(el('span', '', { text: label }), input);
            fields.appendChild(wrap);
            addon.inputs[key] = input;
        };
        addInput('date', 'Date du croquis', 'date');
        // Champs absents du formulaire : saisis ici (ex. Client ligne 2, Préparé par d'une app qui n'en a pas).
        // Sans date générale, la date du croquis sert aussi de date du rapport.
        SYNCED_FIELDS.forEach(([key, label, ids, type]) => {
            if (key !== 'global-date' && !sourceOf(ids)) addInput(key, label, type);
        });
        const padHost = el('div', 'crq-pad-host');
        addon.body.append(addon.note, fields, padHost);
        card.append(toggleLabel, addon.body);
        addon.card = card;

        // Après le dernier onglet du formulaire : visible quel que soit l'onglet ouvert
        (document.getElementById('app-container') || document.body).appendChild(card);
        addon.pad = new Pad(padHost, { id: ZONE_FIELD, label: 'Croquis' });
        document.addEventListener('input', e => {
            if (isAttached() && !card.contains(e.target)) refreshNote();
        });
    }

    function snapshot() {
        const data = { croquis_attached: isAttached() };
        const fields = {};
        Object.entries(addon.inputs).forEach(([key, input]) => { if (input.value) fields[key] = input.value; });
        if (Object.keys(fields).length) data.croquis_fields = fields;
        if (!addon.pad.isEmpty()) {
            data.croquis_strokes = addon.pad.serialize();
            if (data.croquis_attached) data.croquis_data_url = addon.pad.toPng(SAVED_PNG_WIDTH);
        }
        return data;
    }

    function resetAddon() {
        addon.toggle.checked = false;
        Object.values(addon.inputs).forEach(input => { input.value = ''; });
        addon.pad.reset();
        showBody(false);
    }

    function restoreAddon() {
        const key = (typeof currentActiveReportKey !== 'undefined' && currentActiveReportKey)
            || (document.getElementById('saved-reports-dropdown') || {}).value;
        let report = null;
        try {
            const raw = key && typeof window.readStoredReport === 'function' ? window.readStoredReport(key) : (key ? localStorage.getItem(key) : null);
            report = raw ? JSON.parse(raw) : null;
        } catch (e) {}
        resetAddon();
        if (!report) return;
        Object.entries(report.croquis_fields || {}).forEach(([k, v]) => { if (addon.inputs[k]) addon.inputs[k].value = v; });
        if (report.croquis_strokes) addon.pad.loadData(report.croquis_strokes);
        else if (report.croquis_data_url) addon.pad.loadImage(report.croquis_data_url);
        addon.toggle.checked = report.croquis_attached === true;
        showBody(addon.toggle.checked);
    }

    function runAfter(name, hook) {
        const original = window[name];
        if (typeof original !== 'function') return;
        window[name] = function (...args) {
            const result = original.apply(this, args);
            hook();
            return result;
        };
    }

    let exporting = 0;

    function wireAddon() {
        if (typeof window.storeReport === 'function') {
            const storeOriginal = window.storeReport;
            window.storeReport = function (key, reportData, isDuplicate) {
                if (reportData && typeof reportData === 'object') Object.assign(reportData, snapshot());
                return storeOriginal.call(this, key, reportData, isDuplicate);
            };
        }
        runAfter('clearForm', resetAddon);
        runAfter('loadReport', restoreAddon);

        if (typeof window.exportToPDF === 'function') {
            const exportOriginal = window.exportToPDF;
            window.exportToPDF = async function (...args) {
                if (!isAttached()) return exportOriginal.apply(this, args);
                try {
                    await ensureTemplate();
                } catch (e) {
                    if (typeof showToast === 'function') showToast("Feuille Croquis introuvable (shared/js/tpl_croquis.js) : PDF exporté sans le croquis.", "error");
                }
                exporting++;
                try {
                    return await exportOriginal.apply(this, args);
                } finally {
                    exporting--;
                }
            };
        }

        // Le PDF final de l'app est enregistré une seule fois (save) : la feuille Croquis est ajoutée juste avant
        if (window.PDFLib && !PDFLib.PDFDocument.prototype.__croquisSave) {
            const saveOriginal = PDFLib.PDFDocument.prototype.save;
            PDFLib.PDFDocument.prototype.save = async function (options) {
                if (exporting > 0 && isAttached() && templateBase64() && !this.__croquisAdded) {
                    this.__croquisAdded = true;
                    try {
                        const sheet = await buildSheet(sheetValues(), addon.pad.isEmpty() ? null : addon.pad.toPng(BASE_WIDTH));
                        const [page] = await this.copyPages(sheet, [0]);
                        this.addPage(page);
                    } catch (e) {
                        console.error('Croquis : page non ajoutée au PDF', e);
                        if (typeof showToast === 'function') showToast("Le croquis n'a pas pu être ajouté au PDF.", "error");
                    }
                }
                return saveOriginal.call(this, options);
            };
            PDFLib.PDFDocument.prototype.__croquisSave = true;
        }
    }

    function addonWanted() {
        const config = window.REPORT_CONFIG || {};
        if (window.CROQUIS_ADDON === false || config.slug === 'croquis') return false;  // l'app Croquis autonome
        if (document.querySelector(`[data-sketch-id="${ZONE_FIELD}"]`)) return false;
        return window.CROQUIS_ADDON === true || config.croquis === true;  // option choisie app par app
    }

    function init() {
        initPads();
        if (addonWanted() && !addon.card) {
            buildAddon();
            wireAddon();
        }
    }

    window.Croquis = {
        Pad, initPads, refreshPads, embedPads, stampOnField, buildSheet, ensureTemplate,
        sheetValues, isAttached, pads, addon
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
