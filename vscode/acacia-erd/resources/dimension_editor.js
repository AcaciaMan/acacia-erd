const vscode = acquireVsCodeApi();

// ── State ─────────────────────────────────────────────────────
let currentDimensions = [];
let currentAssets = [];

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
            document.getElementById(tabId + '-tab').classList.remove('hidden');
        });
    });

    // Event delegation for dimensions tab
    const dimTab = document.getElementById('dimensions-tab');
    if (dimTab) {
        dimTab.addEventListener('click', handleDimensionsTabClick);
    }

    // Event delegation for assignments tab (checkbox changes)
    const assignTab = document.getElementById('assignments-tab');
    if (assignTab) {
        assignTab.addEventListener('change', handleAssignmentsTabChange);
    }

    // Signal ready to receive data
    vscode.postMessage({ command: 'ready' });
});

// ── Message handling ──────────────────────────────────────────
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'loadData':
            currentDimensions = message.dimensions;
            currentAssets = message.assets;
            renderDimensions(currentDimensions);
            renderAssignments(currentDimensions, currentAssets);
            break;
        case 'dimensionsUpdated':
            currentDimensions = message.dimensions;
            renderDimensions(currentDimensions);
            renderAssignments(currentDimensions, currentAssets);
            break;
        case 'assetsUpdated':
            currentAssets = message.assets;
            renderAssignments(currentDimensions, currentAssets);
            break;
        case 'focusAsset': {
            const { assetType, assetName } = message;
            // Switch to the Assignments tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const assignmentsTabBtn = document.querySelector('.tab[data-tab="assignments"]');
            if (assignmentsTabBtn) { assignmentsTabBtn.classList.add('active'); }
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
            const assignmentsContent = document.getElementById('assignments-tab');
            if (assignmentsContent) { assignmentsContent.classList.remove('hidden'); }

            // Find the asset card and scroll/highlight it
            const cards = document.querySelectorAll('.asset-card');
            for (const card of cards) {
                if (card.dataset.assetType === assetType && card.dataset.assetName === assetName) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('highlight-focus');
                    setTimeout(() => card.classList.remove('highlight-focus'), 2000);
                    break;
                }
            }
            break;
        }
    }
});

// ── Event delegation handler ──────────────────────────────────
function handleDimensionsTabClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) { return; }

    const action = btn.dataset.action;
    const dimId = btn.dataset.dimensionId;
    const valId = btn.dataset.valueId;

    switch (action) {
        case 'add-dimension':
            showAddDimensionInput();
            break;
        case 'rename-dimension':
            showRenameDimensionInput(dimId);
            break;
        case 'remove-dimension':
            showConfirmation(
                btn.closest('.dimension-card'),
                `Delete dimension "${getDimensionName(dimId)}" and all its values?`,
                () => vscode.postMessage({ command: 'removeDimension', dimensionId: dimId })
            );
            break;
        case 'add-value':
            showAddValueInput(dimId);
            break;
        case 'rename-value':
            showRenameValueInput(dimId, valId);
            break;
        case 'remove-value':
            showConfirmation(
                btn.closest('.value-item'),
                `Delete value "${getValueLabel(dimId, valId)}"?`,
                () => vscode.postMessage({ command: 'removeValue', dimensionId: dimId, valueId: valId })
            );
            break;
    }
}

// ── Helpers ───────────────────────────────────────────────────
function getDimensionName(dimId) {
    const dim = currentDimensions.find(d => d.id === dimId);
    return dim ? dim.name : dimId;
}

function getValueLabel(dimId, valId) {
    const dim = currentDimensions.find(d => d.id === dimId);
    if (!dim) { return valId; }
    const val = dim.values.find(v => v.id === valId);
    return val ? val.label : valId;
}

// ── Render: Dimensions ────────────────────────────────────────
function renderDimensions(dimensions) {
    const container = document.getElementById('dimensions-tab');
    if (!container) { return; }

    container.innerHTML = '';

    // Add dimension button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn add-dimension-btn';
    addBtn.dataset.action = 'add-dimension';
    addBtn.textContent = '+ Add Dimension';
    container.appendChild(addBtn);

    if (!dimensions || dimensions.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = "No dimensions defined. Click '+ Add Dimension' to create one.";
        container.appendChild(empty);
        return;
    }

    for (const dim of dimensions) {
        container.appendChild(renderDimensionCard(dim));
    }
}

function renderDimensionCard(dimension) {
    const card = document.createElement('div');
    card.className = 'dimension-card';
    card.dataset.dimensionId = dimension.id;

    // Header
    const header = document.createElement('div');
    header.className = 'dimension-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'dimension-name';
    nameSpan.dataset.dimensionId = dimension.id;
    nameSpan.textContent = dimension.name;

    const actions = document.createElement('div');
    actions.className = 'dimension-actions';

    if (dimension.builtIn) {
        const badge = document.createElement('span');
        badge.className = 'built-in-badge';
        badge.textContent = 'built-in';
        actions.appendChild(badge);
    }

    // Rename button (always available)
    const renameBtn = document.createElement('button');
    renameBtn.className = 'icon-btn';
    renameBtn.dataset.action = 'rename-dimension';
    renameBtn.dataset.dimensionId = dimension.id;
    renameBtn.title = 'Rename dimension';
    renameBtn.textContent = '✏️';
    actions.appendChild(renameBtn);

    if (dimension.builtIn) {
        // Lock icon for built-in
        const lockBtn = document.createElement('button');
        lockBtn.className = 'icon-btn locked';
        lockBtn.title = 'Built-in dimension cannot be deleted';
        lockBtn.textContent = '🔒';
        actions.appendChild(lockBtn);
    } else {
        // Delete button for custom
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn danger';
        deleteBtn.dataset.action = 'remove-dimension';
        deleteBtn.dataset.dimensionId = dimension.id;
        deleteBtn.title = 'Delete dimension';
        deleteBtn.textContent = '🗑️';
        actions.appendChild(deleteBtn);
    }

    header.appendChild(nameSpan);
    header.appendChild(actions);
    card.appendChild(header);

    // Values list
    const valuesList = document.createElement('div');
    valuesList.className = 'dimension-values';

    const sortedValues = [...dimension.values].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const val of sortedValues) {
        valuesList.appendChild(renderValueItem(dimension, val));
    }

    // Add value button
    const addValBtn = document.createElement('button');
    addValBtn.className = 'add-btn add-value-btn';
    addValBtn.dataset.action = 'add-value';
    addValBtn.dataset.dimensionId = dimension.id;
    addValBtn.textContent = '+ Add Value';
    valuesList.appendChild(addValBtn);

    card.appendChild(valuesList);
    return card;
}

function renderValueItem(dimension, value) {
    const item = document.createElement('div');
    item.className = 'value-item';
    item.dataset.dimensionId = dimension.id;
    item.dataset.valueId = value.id;

    const bullet = document.createElement('span');
    bullet.className = 'value-bullet';
    bullet.textContent = '•';

    const label = document.createElement('span');
    label.className = 'value-label';
    label.dataset.dimensionId = dimension.id;
    label.dataset.valueId = value.id;
    label.textContent = value.label;

    const actions = document.createElement('div');
    actions.className = 'value-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'icon-btn';
    renameBtn.dataset.action = 'rename-value';
    renameBtn.dataset.dimensionId = dimension.id;
    renameBtn.dataset.valueId = value.id;
    renameBtn.title = 'Rename value';
    renameBtn.textContent = '✏️';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn danger';
    deleteBtn.dataset.action = 'remove-value';
    deleteBtn.dataset.dimensionId = dimension.id;
    deleteBtn.dataset.valueId = value.id;
    deleteBtn.title = 'Delete value';
    deleteBtn.textContent = '🗑️';

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(bullet);
    item.appendChild(label);
    item.appendChild(actions);
    return item;
}

// ── Inline input helpers ──────────────────────────────────────
function showInlineInput(container, placeholder, onSubmit, initialValue) {
    // Remove any existing inline input in the container
    const existing = container.querySelector('.inline-input');
    if (existing) { existing.remove(); }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-input';
    input.placeholder = placeholder;
    if (initialValue) { input.value = initialValue; }

    let submitted = false;
    function submit() {
        if (submitted) { return; }
        const val = input.value.trim();
        if (val) {
            submitted = true;
            onSubmit(val);
        }
        input.remove();
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            submitted = true; // prevent blur handler from submitting
            input.remove();
        }
    });
    input.addEventListener('blur', () => {
        submit();
    });
    container.appendChild(input);
    input.focus();
    if (initialValue) { input.select(); }
}

function showAddDimensionInput() {
    const container = document.getElementById('dimensions-tab');
    if (!container) { return; }

    // Insert input after the add-dimension button
    const addBtn = container.querySelector('.add-dimension-btn');
    if (!addBtn) { return; }

    // Check if input already exists
    const existingWrapper = container.querySelector('.add-dimension-input-wrapper');
    if (existingWrapper) { existingWrapper.remove(); }

    const wrapper = document.createElement('div');
    wrapper.className = 'add-dimension-input-wrapper';

    showInlineInput(wrapper, 'Dimension name...', (name) => {
        vscode.postMessage({ command: 'addDimension', name });
        wrapper.remove();
    });

    addBtn.insertAdjacentElement('afterend', wrapper);
}

function showAddValueInput(dimensionId) {
    const card = document.querySelector(`.dimension-card[data-dimension-id="${dimensionId}"]`);
    if (!card) { return; }

    const addBtn = card.querySelector('.add-value-btn');
    if (!addBtn) { return; }

    // Check if input already exists
    const existingWrapper = card.querySelector('.add-value-input-wrapper');
    if (existingWrapper) { existingWrapper.remove(); }

    const wrapper = document.createElement('div');
    wrapper.className = 'add-value-input-wrapper';

    showInlineInput(wrapper, 'Value label...', (label) => {
        vscode.postMessage({ command: 'addValue', dimensionId, label });
        wrapper.remove();
    });

    addBtn.insertAdjacentElement('beforebegin', wrapper);
}

function showRenameDimensionInput(dimensionId) {
    const nameSpan = document.querySelector(`.dimension-name[data-dimension-id="${dimensionId}"]`);
    if (!nameSpan) { return; }

    const currentName = nameSpan.textContent;
    nameSpan.style.display = 'none';

    const wrapper = document.createElement('span');
    wrapper.className = 'rename-input-wrapper';

    showInlineInput(wrapper, 'Dimension name...', (newName) => {
        if (newName !== currentName) {
            vscode.postMessage({ command: 'renameDimension', dimensionId, newName });
        } else {
            nameSpan.style.display = '';
        }
        wrapper.remove();
    }, currentName);

    nameSpan.insertAdjacentElement('afterend', wrapper);
}

function showRenameValueInput(dimensionId, valueId) {
    const label = document.querySelector(`.value-label[data-dimension-id="${dimensionId}"][data-value-id="${valueId}"]`);
    if (!label) { return; }

    const currentLabel = label.textContent;
    label.style.display = 'none';

    const wrapper = document.createElement('span');
    wrapper.className = 'rename-input-wrapper';

    showInlineInput(wrapper, 'Value label...', (newLabel) => {
        if (newLabel !== currentLabel) {
            vscode.postMessage({ command: 'renameValue', dimensionId, valueId, newLabel });
        } else {
            label.style.display = '';
        }
        wrapper.remove();
    }, currentLabel);

    label.insertAdjacentElement('afterend', wrapper);
}

// ── Confirmation dialog ───────────────────────────────────────
function showConfirmation(targetElement, message, onConfirm) {
    // Remove any existing confirmations
    document.querySelectorAll('.confirm-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const msg = document.createElement('span');
    msg.className = 'confirm-message';
    msg.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const yesBtn = document.createElement('button');
    yesBtn.className = 'confirm-yes';
    yesBtn.textContent = 'Delete';
    yesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onConfirm();
        overlay.remove();
    });

    const noBtn = document.createElement('button');
    noBtn.className = 'confirm-no';
    noBtn.textContent = 'Cancel';
    noBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.remove();
    });

    actions.appendChild(yesBtn);
    actions.appendChild(noBtn);

    overlay.appendChild(msg);
    overlay.appendChild(actions);

    if (targetElement) {
        targetElement.appendChild(overlay);
    }
}

// ── Assignments tab: checkbox handler ─────────────────────────
function handleAssignmentsTabChange(e) {
    if (e.target.type === 'checkbox' && e.target.dataset.action === 'toggle-value') {
        const assetType = e.target.dataset.assetType;
        const assetName = e.target.dataset.assetName;
        const dimensionId = e.target.dataset.dimensionId;

        // Collect all checked values for this asset+dimension
        const checkboxes = document.querySelectorAll(
            `input[data-action="toggle-value"][data-asset-type="${assetType}"][data-asset-name="${CSS.escape(assetName)}"][data-dimension-id="${dimensionId}"]`
        );
        const valueIds = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.valueId);

        vscode.postMessage({
            command: 'updateAssignment',
            assetType,
            assetName,
            dimensionId,
            valueIds
        });

        // Update the unspecified label inline without full re-render
        const row = e.target.closest('.dimension-row');
        if (row) {
            const unspecified = row.querySelector('.unspecified-label');
            if (unspecified) {
                unspecified.style.display = valueIds.length === 0 ? '' : 'none';
            }
        }
    }
}

// ── Render: Assignments ───────────────────────────────────────
function renderAssignments(dimensions, assets) {
    const container = document.getElementById('assignments-tab');
    if (!container) { return; }
    container.innerHTML = '';

    if (!assets || assets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No assets configured. Add assets via the Assets tree in the sidebar.';
        container.appendChild(empty);
        return;
    }

    // Filter bar
    container.appendChild(createFilterBar());

    // Group assets by type
    const groups = [
        { type: 'sourceFolder', title: 'Source Folders', icon: '📁', assets: assets.filter(a => a.type === 'sourceFolder') },
        { type: 'dbConnection', title: 'DB Connections', icon: '🗄️', assets: assets.filter(a => a.type === 'dbConnection') },
        { type: 'entitiesList', title: 'Entities Lists', icon: '📋', assets: assets.filter(a => a.type === 'entitiesList') },
    ];

    for (const group of groups) {
        container.appendChild(renderAssetGroup(group, dimensions));
    }
}

function renderAssetGroup(group, dimensions) {
    const section = document.createElement('div');
    section.className = 'asset-group';
    section.dataset.assetType = group.type;

    const header = document.createElement('div');
    header.className = 'asset-group-header';
    header.textContent = `${group.icon} ${group.title}`;
    section.appendChild(header);

    if (group.assets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'asset-group-empty';
        empty.textContent = `No ${group.title.toLowerCase()} configured.`;
        section.appendChild(empty);
        return section;
    }

    for (const asset of group.assets) {
        section.appendChild(renderAssetCard(asset, dimensions));
    }

    return section;
}

function renderAssetCard(asset, dimensions) {
    const card = document.createElement('div');
    card.className = 'asset-card';
    card.dataset.assetType = asset.type;
    card.dataset.assetName = asset.name;

    // Header
    const header = document.createElement('div');
    header.className = 'asset-card-header';

    const icon = getAssetIcon(asset.type);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${icon} ${asset.name}`;

    const detailSpan = document.createElement('span');
    detailSpan.className = 'asset-card-detail';
    detailSpan.textContent = `(${asset.detail})`;

    header.appendChild(nameSpan);
    header.appendChild(detailSpan);
    card.appendChild(header);

    // Body — dimension rows
    const body = document.createElement('div');
    body.className = 'asset-card-body';

    if (!dimensions || dimensions.length === 0) {
        const noDims = document.createElement('div');
        noDims.className = 'asset-group-empty';
        noDims.textContent = 'No dimensions defined.';
        body.appendChild(noDims);
    } else {
        for (const dim of dimensions) {
            body.appendChild(renderDimensionRow(asset, dim));
        }
    }

    card.appendChild(body);
    return card;
}

function renderDimensionRow(asset, dimension) {
    const row = document.createElement('div');
    row.className = 'dimension-row';

    const label = document.createElement('div');
    label.className = 'dimension-row-label';
    label.textContent = dimension.name + ':';
    row.appendChild(label);

    const valuesContainer = document.createElement('div');
    valuesContainer.className = 'dimension-row-values';

    const selectedIds = (asset.dimensions && asset.dimensions[dimension.id]) || [];
    const sortedValues = [...dimension.values].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const val of sortedValues) {
        const cbLabel = document.createElement('label');
        cbLabel.className = 'checkbox-label';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.action = 'toggle-value';
        cb.dataset.assetType = asset.type;
        cb.dataset.assetName = asset.name;
        cb.dataset.dimensionId = dimension.id;
        cb.dataset.valueId = val.id;
        cb.checked = selectedIds.includes(val.id);

        const span = document.createElement('span');
        span.textContent = val.label;

        cbLabel.appendChild(cb);
        cbLabel.appendChild(span);
        valuesContainer.appendChild(cbLabel);
    }

    // Unspecified indicator
    const unspecified = document.createElement('span');
    unspecified.className = 'unspecified-label';
    unspecified.textContent = '(Unspecified)';
    unspecified.style.display = selectedIds.length === 0 ? '' : 'none';
    valuesContainer.appendChild(unspecified);

    row.appendChild(valuesContainer);
    return row;
}

function getAssetIcon(type) {
    switch (type) {
        case 'sourceFolder': return '📁';
        case 'dbConnection': return '🗄️';
        case 'entitiesList': return '📋';
        default: return '📄';
    }
}

// ── Filter bar ────────────────────────────────────────────────
function createFilterBar() {
    const bar = document.createElement('div');
    bar.className = 'filter-bar';

    // Type filter dropdown
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Filter:';
    bar.appendChild(typeLabel);

    const select = document.createElement('select');
    select.className = 'filter-type-select';
    const options = [
        { value: 'all', text: 'All Types' },
        { value: 'sourceFolder', text: 'Source Folders' },
        { value: 'dbConnection', text: 'DB Connections' },
        { value: 'entitiesList', text: 'Entities Lists' },
    ];
    for (const opt of options) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    }
    select.addEventListener('change', applyFilters);
    bar.appendChild(select);

    // Search input
    const searchLabel = document.createElement('label');
    searchLabel.textContent = 'Search:';
    bar.appendChild(searchLabel);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'filter-search-input';
    searchInput.placeholder = 'Filter by name...';
    searchInput.addEventListener('input', applyFilters);
    bar.appendChild(searchInput);

    return bar;
}

function applyFilters() {
    const container = document.getElementById('assignments-tab');
    if (!container) { return; }

    const selectEl = container.querySelector('.filter-type-select');
    const searchEl = container.querySelector('.filter-search-input');
    const typeFilter = selectEl ? selectEl.value : 'all';
    const searchFilter = searchEl ? searchEl.value.trim().toLowerCase() : '';

    // Filter asset groups
    container.querySelectorAll('.asset-group').forEach(group => {
        const groupType = group.dataset.assetType;
        const typeMatch = typeFilter === 'all' || groupType === typeFilter;
        group.classList.toggle('filtered-out', !typeMatch);
    });

    // Filter individual asset cards by name
    container.querySelectorAll('.asset-card').forEach(card => {
        const name = (card.dataset.assetName || '').toLowerCase();
        const nameMatch = !searchFilter || name.includes(searchFilter);
        card.classList.toggle('filtered-out', !nameMatch);
    });
}
