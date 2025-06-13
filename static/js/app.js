/**
 * Report Engine Frontend Application
 * Uses the Module Pattern for robust, private state management.
 */
const ReportEngine = (function() {

    // --- 1. STATE ---
    const state = {
        entities: [], locations: [], events: [], prompts: [],
        filterTerm: '', isDirty: false, sortDirection: 'asc'
    };

    // --- 2. DOM SELECTORS ---
    const UI = {};

    // --- 3. VIEW ---
    const View = {
        init() {
            UI.sessionName = document.getElementById('session-name');
            UI.autosaveIndicator = document.getElementById('autosave-indicator');
            UI.eventsContainer = document.getElementById('events-container');
            UI.entityList = document.getElementById('entity-list');
            UI.locationList = document.getElementById('location-list');
            UI.promptSelect = document.getElementById('prompt-select');
            UI.filterInput = document.getElementById('filter-input');
            UI.clearFilterBtn = document.getElementById('clear-filter-btn');
            UI.resultsContainer = document.getElementById('results-container');
            UI.promptOutput = document.getElementById('prompt-output');
            UI.modalContainer = document.getElementById('modal-container');
            UI.eventTemplate = document.getElementById('event-block-template');
            UI.addEntityForm = document.getElementById('add-entity-form');
            UI.addLocationForm = document.getElementById('add-location-form');
            UI.importFileInput = document.getElementById('import-file-input');
            UI.sortIcon = document.getElementById('sort-icon');
        },
        renderAll() { this.renderEntities(); this.renderLocations(); this.renderEvents(); },
        renderEvents() {
            UI.eventsContainer.innerHTML = '';
            const lowerFilter = state.filterTerm.toLowerCase();
            const filteredEvents = state.events.filter(event => {
                if (!lowerFilter) return true;
                const entityMap = new Map(state.entities.map(e => [e.id, e.name]));
                const locationMap = new Map(state.locations.map(l => [l.id, l.name]));
                const who = event.who.map(id => entityMap.get(id) || '').join(' ').toLowerCase();
                const where = locationMap.get(event.where)?.toLowerCase() || '';
                return event.what.toLowerCase().includes(lowerFilter) ||
                       event.why.toLowerCase().includes(lowerFilter) ||
                       who.includes(lowerFilter) ||
                       where.includes(lowerFilter);
            });
            if (filteredEvents.length > 0) {
                filteredEvents.forEach(event => UI.eventsContainer.appendChild(this.createEventElement(event)));
            } else {
                UI.eventsContainer.innerHTML = `<p style="text-align:center; color: var(--text-secondary);">No events to display.</p>`;
            }
        },
        createEventElement(event) {
            const clone = UI.eventTemplate.content.cloneNode(true);
            const block = clone.querySelector('.event-block');
            block.dataset.id = event.id;
            block.querySelector('[name="what"]').value = event.what;
            block.querySelector('[name="when"]').value = event.when;
            block.querySelector('[name="why"]').value = event.why;
            const whereSelect = block.querySelector('[name="where"]');
            whereSelect.innerHTML = '<option value="">Select...</option>';
            state.locations.forEach(loc => {
                const option = new Option(loc.name, loc.id);
                option.selected = loc.id === event.where;
                whereSelect.appendChild(option);
            });
            this.updateWhoSelector(block, event.who);
            return block;
        },
        updateWhoSelector(block, selectedIds) {
            const whoSelect = block.querySelector('.who');
            whoSelect.innerHTML = '';
            state.entities.forEach(entity => {
                const option = new Option(`${entity.name} (${entity.type})`, entity.id);
                option.selected = selectedIds.includes(entity.id);
                whoSelect.appendChild(option);
            });
            this.renderPills(block, selectedIds);
        },
        renderPills(block, selectedIds) {
            const pillsContainer = block.querySelector('.selected-pills');
            pillsContainer.innerHTML = '';
            selectedIds.forEach(id => {
                const entity = state.entities.find(e => e.id === id);
                if (entity) {
                    const pill = document.createElement('span');
                    pill.className = 'pill';
                    pill.innerHTML = `${entity.name} <span class="remove-pill" data-action="remove-pill" data-id="${entity.id}">×</span>`;
                    pillsContainer.appendChild(pill);
                }
            });
        },
        renderEntities() {
            UI.entityList.innerHTML = '';
            state.entities.forEach(entity => {
                const item = document.createElement('div');
                item.className = 'item';
                item.innerHTML = `<span>${entity.name} <small>(${entity.type})</small></span>
                                  <button class="btn btn-danger" data-action="delete-entity" data-id="${entity.id}">×</button>`;
                UI.entityList.appendChild(item);
            });
        },
        renderLocations() {
            UI.locationList.innerHTML = '';
            state.locations.forEach(loc => {
                const item = document.createElement('div');
                item.className = 'item';
                item.innerHTML = `<span>${loc.name}</span>
                                 <button class="btn btn-danger" data-action="delete-location" data-id="${loc.id}">×</button>`;
                UI.locationList.appendChild(item);
            });
        },
        renderPrompts() { UI.promptSelect.innerHTML = ''; state.prompts.forEach(p => UI.promptSelect.add(new Option(p.name, p.id))); },
        setAutosaveIndicator(text, isError = false) {
            UI.autosaveIndicator.textContent = text;
            UI.autosaveIndicator.style.color = isError ? 'var(--danger-color)' : 'var(--text-secondary)';
            UI.autosaveIndicator.style.opacity = '1';
            setTimeout(() => UI.autosaveIndicator.style.opacity = '0', 2500);
        },
        renderModal({ title, content, actions }) {
            const actionsHTML = actions.map(a => `<button class="btn ${a.class || 'btn-secondary'}" data-action="${a.action}">${a.text}</button>`).join('');
            const modalHTML = `
                <div class="modal-overlay" data-action="close-modal">
                    <div class="modal-content" data-action="modal-content">
                        <h2>${title}</h2>
                        <div class="modal-body">${content}</div>
                        <div class="modal-actions">${actionsHTML}</div>
                    </div>
                </div>`;
            UI.modalContainer.innerHTML = modalHTML;
        },
        renderPromptsModal() {
            const deletablePrompts = state.prompts.filter(p => p.is_deletable).map(p => `
                <div class="modal-item">
                    <div class="icon"><i class="fa fa-user-edit"></i></div>
                    <div class="modal-item-info"><strong>${p.name}</strong><p>${p.instruction.substring(0, 80)}...</p></div>
                    <button class="btn btn-danger" data-action="delete-prompt" data-id="${p.id}">×</button>
                </div>`).join('');
            const defaultPrompts = state.prompts.filter(p => !p.is_deletable).map(p => `
                <div class="modal-item">
                    <div class="icon"><i class="fa fa-lock"></i></div>
                    <div class="modal-item-info"><strong>${p.name}</strong><p>${p.instruction.substring(0, 80)}...</p></div>
                </div>`).join('');
            const content = `<div class="modal-list">${deletablePrompts}${defaultPrompts}</div><div class="modal-add-form"><h3>Add Custom Prompt</h3><form id="add-prompt-form"><div class="form-group"><input name="name" type="text" placeholder="Prompt Name" required></div><div class="form-group"><textarea name="instruction" rows="3" placeholder="AI instruction..." required></textarea></div><button type="submit" class="btn btn-primary full-width">Add Prompt</button></form></div>`;
            this.renderModal({title: "Manage Prompts", content, actions: [{text: "Close", class: "btn-secondary", action: "close-modal"}] });
            UI.modalContainer.querySelector('#add-prompt-form').addEventListener('submit', Controller.handleAddPrompt.bind(Controller));
        },
        closeModal() { UI.modalContainer.innerHTML = ''; }
    };

    // --- 4. CONTROLLER ---
    const Controller = {
        init() { View.init(); this.bindEvents(); this.loadInitialState(); setInterval(this.autosave.bind(this), 5000); },
        loadInitialState() {
            const initialState = window.APP_INITIAL_STATE;
            if (initialState) {
                const sanitizedData = this.sanitizeImportedData(initialState);
                state.entities = sanitizedData.entities; state.locations = sanitizedData.locations; state.events = sanitizedData.events;
            }
            if (state.events.length === 0) this.addEvent();
            API.getPrompts().then(prompts => { state.prompts = prompts; View.renderPrompts(); });
            View.renderAll();
        },
        bindEvents() {
            UI.addEntityForm.addEventListener('submit', this.handleAddEntity.bind(this));
            UI.addLocationForm.addEventListener('submit', this.handleAddLocation.bind(this));
            UI.importFileInput.addEventListener('change', this.handleFileImport.bind(this));
            document.body.addEventListener('click', this.handleClick.bind(this));
            document.body.addEventListener('input', this.handleInput.bind(this));
            document.body.addEventListener('change', this.handleChange.bind(this));
        },
        handleAddEntity(e) { e.preventDefault(); const form = e.target, data = new FormData(form), name = data.get('name'); if (!name) return; state.entities.push({ id: this.generateId(), name, type: data.get('type') }); state.isDirty = true; View.renderAll(); form.reset(); },
        handleAddLocation(e) { e.preventDefault(); const form = e.target, data = new FormData(form), name = data.get('name'); if (!name) return; state.locations.push({ id: this.generateId(), name }); state.isDirty = true; View.renderAll(); form.reset(); },
        handleAddPrompt(e) { e.preventDefault(); const form = e.target, data = new FormData(form), name = data.get('name'), instruction = data.get('instruction'); if (!name || !instruction) return; API.addPrompt({ name, instruction }).then(newPrompt => { state.prompts.push(newPrompt); View.renderPromptsModal(); View.renderPrompts(); }); },
        handleClick(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            if (action === "modal-content") { e.stopPropagation(); return; }
            const id = target.dataset.id;
            const actions = {
                'manage-prompts': () => View.renderPromptsModal(), 'new-scenario': () => this.handleNewScenario(),
                'save': () => this.handleSave(), 'show-saved': () => this.handleShowSaved(),
                'close-modal': () => View.closeModal(), 'confirm-save': () => this.confirmSave(),
                'confirm-discard': () => { API.clearAutosave().then(() => location.reload()); }, 'delete-prompt': () => this.deletePrompt(id),
                'delete-saved': () => this.deleteSaved(id), 'import-json': () => UI.importFileInput.click(),
                'export-json': () => this.exportJSON(), 'delete-entity': () => this.deleteEntity(id),
                'delete-location': () => this.deleteLocation(id), 'add-event': () => this.addEvent(),
                'sort-events': () => this.sortEvents(), 'delete-event': () => this.deleteEvent(target.closest('.event-block').dataset.id),
                'generate-prompt': () => this.generatePrompt(), 'copy-prompt': () => navigator.clipboard.writeText(UI.promptOutput.value),
                'remove-pill': () => { const block = target.closest('.event-block'), whoSelect = block.querySelector('.who'), option = whoSelect.querySelector(`option[value="${id}"]`); if (option) option.selected = false; whoSelect.dispatchEvent(new Event('change', { bubbles: true })); }
            };
            if (actions[action]) actions[action]();
        },
        handleInput(e) { if (e.target.id === 'filter-input') { state.filterTerm = e.target.value; UI.clearFilterBtn.style.display = state.filterTerm ? 'block' : 'none'; View.renderEvents(); } else if (e.target.closest('.event-block') || e.target.id === 'scenario-name-input') { state.isDirty = true; } },
        handleChange(e) { const block = e.target.closest('.event-block'); if (!block) return; state.isDirty = true; const event = this.syncEventFromDOM(block); if (e.target.matches('.who')) View.renderPills(block, event.who); },
        
        // *** THE DEFINITIVE, INTELLIGENT DATA MIGRATION FIX ***
        sanitizeImportedData(data) {
            // First pass: Ensure all entities/locations have string IDs
            const entities = (data.entities || []).map(e => ({ ...e, id: String(e.id || this.generateId()) }));
            const locations = (data.locations || []).map(l => ({ ...l, id: String(l.id || this.generateId()) }));

            // Create lookup maps to convert old name-based relations to new ID-based relations
            const entityNameToId = new Map(entities.map(e => [e.name, e.id]));
            const locationNameToId = new Map(locations.map(l => [l.name, l.id]));

            const events = (data.events || []).map(ev => {
                let newWho = [];
                if (Array.isArray(ev.who) && ev.who.length > 0) {
                    const firstWho = ev.who[0];
                    if (typeof firstWho === 'string' && entityNameToId.has(firstWho)) {
                        // This is the old, NAME-based format. Migrate names to IDs.
                        newWho = ev.who.map(name => entityNameToId.get(name)).filter(Boolean);
                    } else {
                        // This is the ID-based format. Just ensure IDs are strings.
                        newWho = ev.who.map(id => String(id));
                    }
                }

                let newWhere = null;
                if (ev.where) {
                    if (typeof ev.where === 'string' && locationNameToId.has(ev.where)) {
                        newWhere = locationNameToId.get(ev.where); // Name-based format
                    } else {
                        newWhere = String(ev.where); // ID-based format
                    }
                }
                
                return { ...ev, id: String(ev.id || this.generateId()), who: newWho, where: newWhere };
            });

            return { entities, locations, events };
        },

        handleFileImport(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const sanitizedData = this.sanitizeImportedData(data);
                    state.entities = sanitizedData.entities; state.locations = sanitizedData.locations; state.events = sanitizedData.events;
                    state.isDirty = true; View.renderAll();
                } catch (err) { alert(`Error: Could not import file. ${err.message}`); }
            };
            reader.readAsText(file);
            e.target.value = null;
        },
        exportJSON() { this.autosave(); const dataStr = JSON.stringify({ entities: state.entities, locations: state.locations, events: state.events }, null, 2); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' })); link.download = `report-scenario-${Date.now()}.json`; link.click(); URL.revokeObjectURL(link.href); },
        deletePrompt(id) { if (!confirm("Are you sure?")) return; API.deletePrompt(id).then(() => { state.prompts = state.prompts.filter(p => p.id != id); View.renderPromptsModal(); View.renderPrompts(); }).catch(err => alert(`Error: ${err.message}`)); },
        deleteEntity(id) { state.entities = state.entities.filter(e => e.id !== id); state.events.forEach(event => event.who = event.who.filter(whoId => whoId !== id)); state.isDirty = true; View.renderAll(); },
        deleteLocation(id) { state.locations = state.locations.filter(l => l.id !== id); state.events.forEach(event => { if(event.where === id) event.where = null; }); state.isDirty = true; View.renderAll(); },
        addEvent() { state.events.push({ id: this.generateId(), what: '', when: '', where: null, who: [], why: '' }); state.isDirty = true; View.renderEvents(); },
        deleteEvent(id) { state.events = state.events.filter(e => e.id !== id); state.isDirty = true; View.renderEvents(); },
        sortEvents() { const direction = state.sortDirection; state.events.sort((a, b) => { const dateA = new Date(a.when || 0); const dateB = new Date(b.when || 0); return direction === 'asc' ? dateA - dateB : dateB - dateA; }); state.sortDirection = direction === 'asc' ? 'desc' : 'asc'; UI.sortIcon.className = state.sortDirection === 'asc' ? 'fa fa-sort-amount-down' : 'fa fa-sort-amount-up'; state.isDirty = true; View.renderEvents(); },
        syncEventFromDOM(block) { const event = state.events.find(e => e.id === block.dataset.id); if (!event) return; event.what = block.querySelector('[name="what"]').value; event.when = block.querySelector('[name="when"]').value; event.why = block.querySelector('[name="why"]').value; event.where = block.querySelector('[name="where"]').value; event.who = Array.from(block.querySelector('.who').selectedOptions).map(opt => opt.value); return event; },
        autosave() { document.querySelectorAll('.event-block').forEach(block => this.syncEventFromDOM(block)); if (!state.isDirty) return; API.saveState({ entities: state.entities, locations: state.locations, events: state.events }).then(res => { state.isDirty = false; UI.sessionName.textContent = res.name; View.setAutosaveIndicator(`Saved ${new Date().toLocaleTimeString()}`); }).catch(() => View.setAutosaveIndicator('Save failed', true)); },
        async generatePrompt() { await this.autosave(); const payload = { prompt_id: UI.promptSelect.value, scenario: { entities: state.entities, locations: state.locations, events: state.events }}; const res = await API.generatePrompt(payload); UI.promptOutput.value = res.prompt; UI.resultsContainer.style.display = 'block'; },
        handleNewScenario() { View.renderModal({ title: "Start New Scenario?", content: "<p>Your current work is in autosave. Any unsaved named versions will be kept.</p>", actions: [{ text: "Cancel", class: "btn-secondary", action: "close-modal" }, { text: "Discard & Start New", class: "btn-danger-outline", action: "confirm-discard" }] }); },
        handleSave() { View.renderModal({ title: "Save Scenario", content: `<div class="form-group"><label for="scenario-name-input">Scenario Name</label><input type="text" id="scenario-name-input" placeholder="e.g., Q3 Incident Report"></div>`, actions: [{ text: "Cancel", class: "btn-secondary", action: "close-modal" }, { text: "Save Snapshot", class: "btn-primary", action: "confirm-save" }] }); },
        async confirmSave() { const name = document.getElementById('scenario-name-input').value; if (!name) { alert("Please enter a name."); return; } await this.autosave(); await API.saveScenario({ name, content: { entities: state.entities, locations: state.locations, events: state.events } }); View.closeModal(); },
        async handleShowSaved() { const scenarios = await API.getScenarios(); const scenariosHTML = scenarios.map(s => `<div class="modal-item"><div><a href="/load/${s.id}">${s.name}</a><p class="text-secondary">${s.last_updated}</p></div><button class="btn btn-danger" data-action="delete-saved" data-id="${s.id}">×</button></div>`).join(''); View.renderModal({ title: "Saved Scenarios", content: `<div class="modal-list">${scenariosHTML || "<p>No saved scenarios.</p>"}</div>`, actions: [{ text: "Close", class: "btn-secondary", action: "close-modal" }] }); },
        async deleteSaved(id) { if (!confirm("Delete this saved scenario forever?")) return; await API.deleteScenario(id); this.handleShowSaved(); },
        generateId: () => '_' + Math.random().toString(36).substr(2, 9),
    };

    // --- 5. API ---
    const API = {
        async _fetch(url, options = {}) {
            options.headers = { 'Content-Type': 'application/json', ...options.headers };
            const response = await fetch(url, options);
            if (!response.ok) { const err = await response.json().catch(() => ({error: `HTTP error! status: ${response.status}`})); throw new Error(err.error); }
            if (response.status === 204) return null;
            return response.json();
        },
        getPrompts: () => API._fetch('/api/prompts'),
        addPrompt: (data) => API._fetch('/api/prompts', { method: 'POST', body: JSON.stringify(data) }),
        deletePrompt: (id) => API._fetch(`/api/prompts/${id}`, { method: 'DELETE' }),
        saveState: (data) => API._fetch('/api/state', { method: 'POST', body: JSON.stringify(data) }),
        generatePrompt: (data) => API._fetch('/api/generate-prompt', { method: 'POST', body: JSON.stringify(data) }),
        getScenarios: () => API._fetch('/api/scenarios'),
        saveScenario: (data) => API._fetch('/api/scenarios', { method: 'POST', body: JSON.stringify(data) }),
        deleteScenario: (id) => API._fetch(`/api/scenarios/${id}`, { method: 'DELETE' }),
        clearAutosave: () => API._fetch('/api/scenarios/new', { method: 'POST' }),
    };

    return { init: Controller.init.bind(Controller) };
})();

document.addEventListener('DOMContentLoaded', ReportEngine.init);
