// static/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = { entities: [], locations: [], events: [] };
    let autosaveTimeout;
    let startNewAfterSave = false;
    // *** 1. ADDED: State variable to track sort direction. 'desc' means the first click will sort descending. ***
    let currentSortDirection = 'desc';

    // --- DOM ELEMENT CACHE ---
    const dom = {
        entityList: document.getElementById('entity-list'),
        newEntityName: document.getElementById('new-entity-name'),
        newEntityType: document.getElementById('new-entity-type'),
        addEntityBtn: document.getElementById('add-entity-btn'),
        locationList: document.getElementById('location-list'),
        newLocationName: document.getElementById('new-location-name'),
        addLocationBtn: document.getElementById('add-location-btn'),
        eventBlocksContainer: document.getElementById('event-blocks-container'),
        addEventBtn: document.getElementById('add-event-btn'),
        eventBlockTemplate: document.getElementById('event-block-template'),
        currentScenarioName: document.getElementById('current-scenario-name'),
        autosaveIndicator: document.getElementById('autosave-indicator'),
        generateBtn: document.getElementById('generate-btn'),
        styleSelect: document.getElementById('style-select'),
        resultsContainer: document.querySelector('.results-container'),
        promptOutput: document.getElementById('prompt-output'),
        copyBtn: document.getElementById('copy-btn'),
        saveBtn: document.getElementById('save-btn'),
        saveModal: document.getElementById('save-modal'),
        cancelSaveBtn: document.getElementById('cancel-save-btn'),
        confirmSaveBtn: document.getElementById('confirm-save-btn'),
        scenarioNameInput: document.getElementById('scenario-name-input'),
        savedBtn: document.getElementById('saved-btn'),
        savedModal: document.getElementById('saved-modal'),
        closeSavedBtn: document.getElementById('close-saved-btn'),
        savedScenariosList: document.getElementById('saved-scenarios-list'),
        importBtn: document.getElementById('import-btn'),
        exportBtn: document.getElementById('export-btn'),
        importFileInput: document.getElementById('import-file-input'),
        newScenarioBtn: document.getElementById('new-scenario-btn'),
        newScenarioModal: document.getElementById('new-scenario-modal'),
        cancelNewScenarioBtn: document.getElementById('cancel-new-scenario-btn'),
        confirmDiscardAndNewBtn: document.getElementById('confirm-discard-and-new-btn'),
        confirmSaveAndNewBtn: document.getElementById('confirm-save-and-new-btn'),
        managePromptsBtn: document.getElementById('manage-prompts-btn'),
        promptsModal: document.getElementById('prompts-modal'),
        closePromptsBtn: document.getElementById('close-prompts-btn'),
        promptList: document.getElementById('prompt-list'),
        addPromptForm: document.getElementById('add-prompt-form'),
        newPromptName: document.getElementById('new-prompt-name'),
        newPromptInstruction: document.getElementById('new-prompt-instruction'),
        sortEventsBtn: document.getElementById('sort-events-btn'),
    };

    // --- PROMPT MANAGEMENT FUNCTIONS ---
    const populateGenerateDropdown = async () => {
        try {
            const response = await fetch('/api/prompts');
            const prompts = await response.json();
            dom.styleSelect.innerHTML = prompts.map(p => 
                `<option value="${p.id}">${p.name}</option>`
            ).join('');
        } catch (error) {
            console.error('Failed to load prompts for dropdown:', error);
            dom.styleSelect.innerHTML = `<option>Error loading prompts</option>`;
        }
    };

    const renderPromptsList = (prompts) => {
        dom.promptList.innerHTML = prompts.map(p => `
            <div class="prompt-item" data-id="${p.id}">
                ${p.is_deletable 
                    ? `<div class="prompt-lock-icon"></div>` 
                    : `<div class="prompt-lock-icon"><i class="fas fa-lock"></i></div>`
                }
                <div class="prompt-info">
                    <strong>${p.name}</strong>
                    <p>${p.instruction}</p>
                </div>
                ${p.is_deletable 
                    ? `<button type="button" class="btn delete-prompt-btn">×</button>` 
                    : ``
                }
            </div>
        `).join('');
    };

    const handleOpenPromptsModal = async () => {
        dom.promptList.innerHTML = '<p>Loading...</p>';
        dom.promptsModal.style.display = 'flex';
        try {
            const response = await fetch('/api/prompts');
            const prompts = await response.json();
            renderPromptsList(prompts);
        } catch (error) {
            dom.promptList.innerHTML = '<p>Could not load prompts.</p>';
            console.error(error);
        }
    };

    const handleAddPrompt = async (e) => {
        e.preventDefault();
        const name = dom.newPromptName.value.trim();
        const instruction = dom.newPromptInstruction.value.trim();
        if (!name || !instruction) return;
        
        try {
            const response = await fetch('/api/prompts/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, instruction }),
            });
            if (response.ok) {
                dom.addPromptForm.reset();
                await handleOpenPromptsModal();
                await populateGenerateDropdown();
            } else {
                const err = await response.json();
                alert(`Error: ${err.message}`);
            }
        } catch (error) {
            console.error('Failed to add prompt:', error);
        }
    };

    const handleDeletePrompt = async (e) => {
        if (!e.target.classList.contains('delete-prompt-btn')) return;
        const promptItem = e.target.closest('.prompt-item');
        const promptId = promptItem.dataset.id;
        if (confirm('Are you sure you want to delete this custom prompt?')) {
            try {
                const response = await fetch(`/api/prompts/delete/${promptId}`, { method: 'POST' });
                if (response.ok) {
                    promptItem.remove();
                    await populateGenerateDropdown();
                } else {
                    const err = await response.json();
                    alert(`Error: ${err.message}`);
                }
            } catch (error) {
                console.error('Failed to delete prompt:', error);
            }
        }
    };

    // --- RENDER FUNCTIONS ---
    const renderEntities = () => {
        dom.entityList.innerHTML = state.entities.map((entity, i) => `
            <div class="item" data-index="${i}">
                <span><strong>${entity.name}</strong> (${entity.type})</span>
                <button type="button" class="btn btn-danger delete-entity-btn">×</button>
            </div>`).join('');
        updateAllWhoSelectors();
    };

    const renderLocations = () => {
        dom.locationList.innerHTML = state.locations.map((loc, i) => `
            <div class="item" data-index="${i}">
                <span>${loc.name}</span>
                <button type="button" class="btn btn-danger delete-location-btn">×</button>
            </div>`).join('');
        updateAllWhereDropdowns();
    };
    
    const renderEvents = () => {
        dom.eventBlocksContainer.innerHTML = '';
        if (state.events.length === 0) addEventBlock();
        else state.events.forEach(() => addEventBlock(false));
    };

    // --- ENHANCED "WHO" SELECTOR LOGIC ---
    const updatePillsForSelect = (selectElement) => {
        const group = selectElement.closest('.who-selector-group');
        const pillsContainer = group.querySelector('.selected-pills');
        const selectedOptions = Array.from(selectElement.selectedOptions);
        
        pillsContainer.innerHTML = selectedOptions.map(opt => `
            <div class="pill" data-value="${opt.value}">
                ${opt.textContent}
                <span class="remove-pill">×</span>
            </div>
        `).join('');
    };

    const setupWhoSelectorEvents = (group) => {
        const searchInput = group.querySelector('.who-search-input');
        const selectElement = group.querySelector('.who');
        const pillsContainer = group.querySelector('.selected-pills');

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            Array.from(selectElement.options).forEach(opt => {
                const isMatch = opt.textContent.toLowerCase().includes(searchTerm);
                opt.style.display = isMatch ? '' : 'none';
            });
        });

        selectElement.addEventListener('change', () => {
            updatePillsForSelect(selectElement);
            triggerAutosave();
        });

        pillsContainer.addEventListener('click', e => {
            if (e.target.classList.contains('remove-pill')) {
                const valueToRemove = e.target.parentElement.dataset.value;
                const optionToDeselect = selectElement.querySelector(`option[value="${valueToRemove}"]`);
                if (optionToDeselect) {
                    optionToDeselect.selected = false;
                }
                selectElement.dispatchEvent(new Event('change'));
            }
        });
    };
    
    const updateAllWhoSelectors = () => {
        document.querySelectorAll('.who-selector-group').forEach(group => {
            const selectElement = group.querySelector('.who');
            const selectedValues = Array.from(selectElement.selectedOptions).map(opt => opt.value);
            
            selectElement.innerHTML = state.entities.map(e => 
                `<option value="${e.name}">${e.name} (${e.type})</option>`
            ).join('');

            Array.from(selectElement.options).forEach(opt => {
                opt.selected = selectedValues.includes(opt.value);
            });
            updatePillsForSelect(selectElement);
        });
    };
    
    const updateAllWhereDropdowns = () => {
        const whereSelects = document.querySelectorAll('.where');
        const locationOptions = '<option value="">N/A</option>' + state.locations.map(l => `<option value="${l.name}">${l.name}</option>`).join('');
        whereSelects.forEach(select => {
            const selected = select.value;
            select.innerHTML = locationOptions;
            select.value = selected;
        });
    };

    // --- DATA GATHERING ---
    const gatherStateFromDOM = () => {
        const eventBlocks = dom.eventBlocksContainer.querySelectorAll('.event-block');
        state.events = Array.from(eventBlocks).map(block => ({
            who: Array.from(block.querySelector('.who').selectedOptions).map(opt => opt.value),
            what: block.querySelector('.what').value.trim(),
            where: block.querySelector('.where').value,
            when: block.querySelector('.when').value,
            why: block.querySelector('.why').value.trim()
        }));
        return state;
    };

    // --- CORE ACTIONS ---
    const addEntity = () => {
        const name = dom.newEntityName.value.trim();
        if (name && !state.entities.find(e => e.name === name)) {
            state.entities.push({ name, type: dom.newEntityType.value });
            dom.newEntityName.value = '';
            renderEntities();
            triggerAutosave();
        }
    };
    
    const addLocation = () => {
        const name = dom.newLocationName.value.trim();
        if (name && !state.locations.find(l => l.name === name)) {
            state.locations.push({ name });
            dom.newLocationName.value = '';
            renderLocations();
            triggerAutosave();
        }
    };

    const addEventBlock = (triggerSave = true) => {
        const content = dom.eventBlockTemplate.content.cloneNode(true);
        const newBlock = content.querySelector('.event-block');
        dom.eventBlocksContainer.appendChild(newBlock);
        
        const whoGroup = newBlock.querySelector('.who-selector-group');
        setupWhoSelectorEvents(whoGroup);
        
        updateAllWhoSelectors();
        updateAllWhereDropdowns();

        if (triggerSave) triggerAutosave();
    };
    
    const deleteItem = (e, listName, renderFunc) => {
        const item = e.target.closest('.item');
        if (item) {
            state[listName].splice(item.dataset.index, 1);
            renderFunc();
            triggerAutosave();
        }
    };
    
    // *** 2. MODIFIED: The entire sort function is replaced with the toggling version ***
    const sortEventsByDate = () => {
        const eventBlocks = Array.from(dom.eventBlocksContainer.children);
        const icon = dom.sortEventsBtn.querySelector('i');

        // Capture the direction for this sort operation
        const sortDirectionThisClick = currentSortDirection;

        eventBlocks.sort((blockA, blockB) => {
            const dateA = blockA.querySelector('.when').value;
            const dateB = blockB.querySelector('.when').value;

            // Events without a date are always pushed to the end
            if (!dateA) return 1;
            if (!dateB) return -1;

            // Sort based on the captured direction
            if (sortDirectionThisClick === 'asc') {
                return new Date(dateA) - new Date(dateB); // Oldest to Newest
            } else {
                return new Date(dateB) - new Date(dateA); // Newest to Oldest
            }
        });

        // Re-append sorted elements to the DOM
        eventBlocks.forEach(block => dom.eventBlocksContainer.appendChild(block));

        // Update UI to reflect the sort that just happened
        // Note: The icons are 'down' for descending (newest first, like a pile)
        // and 'up' for ascending (oldest first, building up). Font Awesome's logic.
        if (sortDirectionThisClick === 'desc') {
            dom.sortEventsBtn.title = "Sorted: Newest to Oldest. Click to sort ascending.";
            icon.classList.remove('fa-sort-amount-down');
            icon.classList.add('fa-sort-amount-up');
        } else { // 'asc'
            dom.sortEventsBtn.title = "Sorted: Oldest to Newest. Click to sort descending.";
            icon.classList.remove('fa-sort-amount-up');
            icon.classList.add('fa-sort-amount-down');
        }

        // Flip the direction for the *next* click
        currentSortDirection = (sortDirectionThisClick === 'asc') ? 'desc' : 'asc';

        triggerAutosave();
    };

    // --- API & MODAL HANDLERS ---
    const triggerAutosave = () => {
        dom.autosaveIndicator.textContent = 'Saving...';
        dom.autosaveIndicator.style.opacity = '1';
        clearTimeout(autosaveTimeout);
        autosaveTimeout = setTimeout(async () => {
            const currentData = gatherStateFromDOM();
            try {
                const response = await fetch('/api/autosave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentData) });
                await response.json();
                dom.autosaveIndicator.textContent = `Saved!`;
            } catch (error) {
                console.error('Autosave failed:', error);
                dom.autosaveIndicator.textContent = 'Save Failed';
            }
            setTimeout(() => dom.autosaveIndicator.style.opacity = '0', 2000);
        }, 1000);
    };

    const handleSave = async () => {
        const name = dom.scenarioNameInput.value.trim();
        if (!name) { alert('Please enter a name for the scenario.'); return; }
        const content = gatherStateFromDOM();
        try {
            const response = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, content }) });
            const result = await response.json();
            if (result.status === 'success') {
                dom.saveModal.style.display = 'none';
                dom.scenarioNameInput.value = '';
                if (startNewAfterSave) { startNewAfterSave = false; await handleDiscardAndNew(); } 
                else { alert('Scenario saved successfully!'); }
            } else { alert(`Error: ${result.message}`); }
        } catch (error) { console.error('Save failed:', error); alert('An error occurred while saving.'); }
    };

    const handleDiscardAndNew = async () => {
        try {
            const response = await fetch('/api/new-scenario', { method: 'POST' });
            if (!response.ok) throw new Error('Server-side reset failed.');
            window.location.href = '/';
        } catch (error) { console.error("Failed to start new scenario:", error); alert("Could not start a new scenario. Please try refreshing the page."); }
    };

    const handleGeneratePrompt = async () => {
        const scenario = gatherStateFromDOM();
        const prompt_id = dom.styleSelect.value;
        const response = await fetch('/api/generate-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt_id, scenario })
        });
        const data = await response.json();
        dom.promptOutput.value = data.prompt;
        dom.resultsContainer.style.display = 'block';
        dom.promptOutput.style.height = 'auto';
        dom.promptOutput.style.height = (dom.promptOutput.scrollHeight) + 'px';
        dom.promptOutput.focus(); dom.promptOutput.select();
    };

    const handleOpenSavedModal = async () => {
        dom.savedScenariosList.innerHTML = '<p>Loading...</p>';
        dom.savedModal.style.display = 'flex';
        try {
            const response = await fetch('/api/saved-scenarios');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const scenarios = await response.json();
            renderSavedScenarios(scenarios);
        } catch (error) { console.error('Failed to fetch saved scenarios:', error); dom.savedScenariosList.innerHTML = '<p style="color: var(--danger-color);">Could not load scenarios.</p>'; }
    };
    
    const renderSavedScenarios = (scenarios) => {
        if (scenarios.length === 0) { dom.savedScenariosList.innerHTML = '<p>No saved scenarios yet.</p>'; return; }
        dom.savedScenariosList.innerHTML = scenarios.map(s => `
            <div class="saved-item" data-id="${s.id}">
                <div class="saved-item-info">
                    <a href="/load/${s.id}" class="saved-item-name" title="${s.name}">${s.name}</a>
                    <span class="saved-item-date">Updated: ${s.last_updated}</span>
                </div>
                <button type="button" class="btn delete-saved-btn">Delete</button>
            </div>`).join('');
    };

    const handleSavedListActions = async (e) => {
        if (e.target.classList.contains('delete-saved-btn')) {
            e.preventDefault();
            const item = e.target.closest('.saved-item');
            const scenarioId = item.dataset.id;
            if (confirm(`Are you sure you want to permanently delete this scenario? This cannot be undone.`)) {
                try {
                    const response = await fetch(`/api/delete/${scenarioId}`, { method: 'POST' });
                    const result = await response.json();
                    if (response.ok && result.status === 'success') { item.style.transition = 'opacity 0.3s'; item.style.opacity = '0'; setTimeout(() => item.remove(), 300); } 
                    else { alert(`Error: ${result.message || 'Could not delete scenario.'}`); }
                } catch (error) { console.error('Delete failed:', error); alert('An error occurred while trying to delete the scenario.'); }
            }
        }
    };

    // --- IMPORT / EXPORT with METADATA ---
    const exportData = () => {
        const scenarioData = gatherStateFromDOM();
        const exportObject = {
            meta: {
                exported_at: new Date().toISOString(),
                app_version: "1.0"
            },
            scenario_data: scenarioData
        };
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
        const filename = `report-engine_${timestamp}.json`;

        const dataStr = JSON.stringify(exportObject, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                loadState(importedData);
            } catch (err) {
                alert('Error: Invalid JSON file.');
                console.error(err);
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    const loadState = (data) => {
        const scenarioData = (data.scenario_data && data.meta) ? data.scenario_data : data;

        state = {
            entities: scenarioData.entities || [],
            locations: scenarioData.locations || [],
            events: scenarioData.events || []
        };
        renderAll();
        
        const eventBlocks = dom.eventBlocksContainer.querySelectorAll('.event-block');
        eventBlocks.forEach((block, index) => {
            const eventData = state.events[index];
            if (!eventData) return;

            const whoSelect = block.querySelector('.who');
            if(whoSelect && eventData.who) {
                Array.from(whoSelect.options).forEach(opt => {
                    opt.selected = eventData.who.includes(opt.value);
                });
                updatePillsForSelect(whoSelect);
            }

            block.querySelector('.what').value = eventData.what || '';
            block.querySelector('.where').value = eventData.where || '';
            block.querySelector('.when').value = eventData.when || '';
            block.querySelector('.why').value = eventData.why || '';
        });
        triggerAutosave();
    };
    
    const renderAll = () => {
        renderEntities();
        renderLocations();
        renderEvents();
    };

    // --- EVENT LISTENERS SETUP ---
    const setupEventListeners = () => {
        dom.sortEventsBtn.addEventListener('click', sortEventsByDate);
        dom.addEntityBtn.addEventListener('click', addEntity);
        dom.addLocationBtn.addEventListener('click', addLocation);
        dom.addEventBtn.addEventListener('click', () => addEventBlock());
        dom.generateBtn.addEventListener('click', handleGeneratePrompt);
        dom.entityList.addEventListener('click', (e) => e.target.classList.contains('delete-entity-btn') && deleteItem(e, 'entities', renderEntities));
        dom.locationList.addEventListener('click', (e) => e.target.classList.contains('delete-location-btn') && deleteItem(e, 'locations', renderLocations));
        dom.eventBlocksContainer.addEventListener('click', e => { if (e.target.classList.contains('delete-block-btn')) { e.target.closest('.event-block').remove(); triggerAutosave(); } });
        
        dom.eventBlocksContainer.addEventListener('change', e => {
            if (e.target.matches('input:not(.who-search-input), select, textarea')) {
                triggerAutosave();
            }
        });

        dom.saveBtn.addEventListener('click', () => dom.saveModal.style.display = 'flex');
        dom.cancelSaveBtn.addEventListener('click', () => { startNewAfterSave = false; dom.saveModal.style.display = 'none'; });
        dom.confirmSaveBtn.addEventListener('click', handleSave);
        dom.savedBtn.addEventListener('click', handleOpenSavedModal);
        dom.closeSavedBtn.addEventListener('click', () => dom.savedModal.style.display = 'none');
        dom.savedScenariosList.addEventListener('click', handleSavedListActions);
        
        dom.newScenarioBtn.addEventListener('click', () => dom.newScenarioModal.style.display = 'flex');
        dom.cancelNewScenarioBtn.addEventListener('click', () => dom.newScenarioModal.style.display = 'none');
        dom.confirmDiscardAndNewBtn.addEventListener('click', handleDiscardAndNew);
        dom.confirmSaveAndNewBtn.addEventListener('click', () => { startNewAfterSave = true; dom.newScenarioModal.style.display = 'none'; dom.saveModal.style.display = 'flex'; });
        
        dom.managePromptsBtn.addEventListener('click', handleOpenPromptsModal);
        dom.closePromptsBtn.addEventListener('click', () => dom.promptsModal.style.display = 'none');
        dom.addPromptForm.addEventListener('submit', handleAddPrompt);
        dom.promptList.addEventListener('click', handleDeletePrompt);
        
        dom.copyBtn.addEventListener('click', () => navigator.clipboard.writeText(dom.promptOutput.value));
        dom.exportBtn.addEventListener('click', exportData);
        dom.importBtn.addEventListener('click', () => dom.importFileInput.click());
        dom.importFileInput.addEventListener('change', importData);
    };

    const init = () => {
        setupEventListeners();
        populateGenerateDropdown();
        if (typeof loaded_data_string === 'string' && loaded_data_string.trim() !== '') {
            try { loadState(JSON.parse(loaded_data_string)); } 
            catch (e) { console.error("Failed to parse initial data, starting fresh.", e); addEventBlock(); }
        } else { addEventBlock(); }
    };
    
    init();
});
