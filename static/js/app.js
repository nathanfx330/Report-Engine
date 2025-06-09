// static/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & DATA ---
    let eventCounter = 0;
    const getWorkspaceData = () => ({
        entities: Array.from(document.querySelectorAll('#entity-list .item')).map(el => ({ name: el.dataset.name, type: el.dataset.type })),
        locations: Array.from(document.querySelectorAll('#location-list .item')).map(el => ({ name: el.dataset.name })),
        events: Array.from(document.querySelectorAll('.event-block')).map(el => ({
            who: Array.from(el.querySelector('.who').selectedOptions).map(o => o.value),
            what: el.querySelector('.what').value,
            when: el.querySelector('.when').value,
            where: el.querySelector('.where').value,
            why: el.querySelector('.why').value
        }))
    });

    // --- API & UTILITIES ---
    const apiCall = async (url, method = 'GET', body = null) => {
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : null });
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            return res.json();
        } catch (e) { console.error(`API Call Failed: ${url}`, e); return null; }
    };
    const debounce = (func, delay) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay) }; };

    // --- AUTOSAVE ---
    const indicator = document.getElementById('autosave-indicator');
    const sessionNameEl = document.getElementById('current-scenario-name');
    let indicatorTimeout;
    const autoSave = async (isImmediate = false) => {
        if (isImmediate) {
            indicator.textContent = 'Saving...';
            indicator.style.opacity = '1';
        }
        const response = await apiCall('/api/autosave', 'POST', getWorkspaceData());
        if (isImmediate) {
            indicator.textContent = 'Saved ✓';
            clearTimeout(indicatorTimeout);
            indicatorTimeout = setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
        }
        if (response && response.name && !sessionNameEl.textContent.startsWith('Editing:')) {
            sessionNameEl.textContent = response.name;
        }
    };
    const debouncedAutoSave = debounce(() => autoSave(true), 1500);

    // --- DOM MANIPULATION ---
    const addToList = (listId, name, type = null) => {
        const list = document.getElementById(listId);
        const item = document.createElement('div');
        item.className = 'item';
        item.dataset.name = name;
        if (type) item.dataset.type = type;
        item.innerHTML = `<span><strong>${name}</strong> ${type ? `(${type})` : ''}</span><button type="button" class="btn btn-danger">×</button>`;
        list.appendChild(item);
    };

    const updateAllDropdowns = () => {
        const { entities, locations } = getWorkspaceData();
        document.querySelectorAll('.event-block').forEach(block => {
            const whoSelect = block.querySelector('.who');
            const whereSelect = block.querySelector('.where');
            const selectedWho = Array.from(whoSelect.selectedOptions).map(o => o.value);
            const selectedWhere = whereSelect.value;
            whoSelect.innerHTML = entities.map(e => `<option value="${e.name}" ${selectedWho.includes(e.name) ? 'selected' : ''}>${e.name} (${e.type})</option>`).join('');
            whereSelect.innerHTML = '<option value="">Select a location...</option>' + locations.map(l => `<option value="${l.name}" ${selectedWhere === l.name ? 'selected' : ''}>${l.name}</option>`).join('');
        });
    };

    const addEventBlock = () => {
        const container = document.getElementById('event-blocks-container');
        const template = document.getElementById('event-block-template');
        const clone = template.content.cloneNode(true);
        const newBlock = clone.querySelector('.event-block');
        newBlock.querySelector('h3').textContent = `Event #${++eventCounter}`;
        container.appendChild(clone);
        updateAllDropdowns();
        return newBlock;
    };

    // --- INITIALIZATION ---
    const initializeWorkspace = (data) => {
        if (!data) return addEventBlock();
        data.entities?.forEach(e => addToList('entity-list', e.name, e.type));
        data.locations?.forEach(l => addToList('location-list', l.name));
        data.events?.forEach(e => {
            const block = addEventBlock();
            block.querySelector('.what').value = e.what || '';
            block.querySelector('.when').value = e.when || '';
            block.querySelector('.where').value = e.where || '';
            block.querySelector('.why').value = e.why || '';
            e.who.forEach(whoName => {
                const option = Array.from(block.querySelector('.who').options).find(o => o.value === whoName);
                if (option) option.selected = true;
            });
        });
        if (!data.events || data.events.length === 0) addEventBlock();
    };

    // --- EVENT LISTENERS ---
    document.getElementById('add-entity-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('new-entity-name');
        if (nameInput.value.trim()) {
            addToList('entity-list', nameInput.value.trim(), document.getElementById('new-entity-type').value);
            nameInput.value = ''; updateAllDropdowns(); debouncedAutoSave();
        }
    });
    document.getElementById('add-location-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('new-location-name');
        if (nameInput.value.trim()) {
            addToList('location-list', nameInput.value.trim());
            nameInput.value = ''; updateAllDropdowns(); debouncedAutoSave();
        }
    });
    document.getElementById('add-event-btn').addEventListener('click', () => { addEventBlock(); debouncedAutoSave(); });

    document.getElementById('main-content').addEventListener('click', (e) => {
        if (e.target.matches('.item .btn-danger') || e.target.matches('.event-block .delete-block-btn')) {
            e.target.closest('.item, .event-block').remove();
            updateAllDropdowns(); debouncedAutoSave();
        }
    });
    document.getElementById('main-content').addEventListener('input', debouncedAutoSave);

    document.getElementById('generate-btn').addEventListener('click', async () => {
        await autoSave(true);
        const payload = { style: document.getElementById('style-select').value, scenario: getWorkspaceData() };
        const resultsContainer = document.querySelector('.results-container');
        const promptOutput = document.getElementById('prompt-output');
        promptOutput.value = "Generating...";
        resultsContainer.style.display = 'block';
        const response = await apiCall('/api/generate-prompt', 'POST', payload);
        if (response && response.prompt) {
            promptOutput.value = response.prompt;
            promptOutput.style.height = 'auto';
            promptOutput.style.height = (promptOutput.scrollHeight) + 'px';
        } else {
            promptOutput.value = "Error: Could not generate prompt.";
        }
    });
    
    document.getElementById('copy-btn').addEventListener('click', e => {
        navigator.clipboard.writeText(document.getElementById('prompt-output').value).then(() => {
            e.target.textContent = 'Copied!';
            setTimeout(() => e.target.textContent = 'Copy to Clipboard', 2000);
        });
    });

    // --- MODAL EVENT LISTENERS ---
    const saveModal = document.getElementById('save-modal');
    const recentModal = document.getElementById('recent-modal');
    document.getElementById('save-btn').addEventListener('click', () => saveModal.style.display = 'flex');
    document.getElementById('cancel-save-btn').addEventListener('click', () => saveModal.style.display = 'none');
    
    document.getElementById('confirm-save-btn').addEventListener('click', async () => {
        const name = document.getElementById('scenario-name-input').value;
        if (name) {
            await apiCall('/api/save', 'POST', { name, content: getWorkspaceData() });
            saveModal.style.display = 'none';
            document.getElementById('scenario-name-input').value = '';
            document.getElementById('current-scenario-name').textContent = `Editing: ${name}`;
        }
    });

    document.getElementById('recent-btn').addEventListener('click', async () => {
        const scenarios = await apiCall('/api/recent-scenarios');
        const listDiv = document.getElementById('recent-scenarios-list');
        listDiv.innerHTML = scenarios && scenarios.length > 0
            ? scenarios.map(s => `<div class="recent-item"><a href="/load/${s.id}">${s.name}</a><span>${s.last_updated}</span><button type="button" class="btn btn-danger" data-id="${s.id}">Delete</button></div>`).join('')
            : '<p>No saved scenarios found.</p>';
        recentModal.style.display = 'flex';
    });
    
    document.getElementById('close-recent-btn').addEventListener('click', () => recentModal.style.display = 'none');
    
    recentModal.addEventListener('click', async (e) => {
        if (e.target.matches('.recent-item .btn-danger')) {
            if (confirm('Are you sure you want to delete this scenario?')) {
                await apiCall(`/api/delete/${e.target.dataset.id}`, 'POST');
                e.target.closest('.recent-item').remove();
            }
        }
    });

    // --- INITIALIZE WORKSPACE ---
    // 'loaded_data_string' is injected by Flask template
    let initialData = null;
    if (loaded_data_string) {
        try {
            initialData = JSON.parse(loaded_data_string);
        } catch (error) {
            console.error("Failed to parse loaded data from server:", error);
        }
    }
    initializeWorkspace(initialData);
});
