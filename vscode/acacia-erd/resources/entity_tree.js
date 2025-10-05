const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const filterInput = document.getElementById('filter-input');
    const sortSelect = document.getElementById('sort-select');
    const entityTree = document.getElementById('entity-tree');
    const totalCountEl = document.getElementById('total-count');
    const visibleCountEl = document.getElementById('visible-count');
    const listViewBtn = document.getElementById('list-view');
    const cardViewBtn = document.getElementById('card-view');

    let entities = [];
    let contextMenu = null;
    let prevEntityName = undefined;
    let selectedEntity = null;
    let viewMode = 'list'; // 'list' or 'card'

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'loadEntities') {
            entities = message.entities;
            renderEntities();
            updateStats();
        }
    });

    // Filter entities based on input
    filterInput.addEventListener('input', () => {
        renderEntities();
        updateStats();
    });

    // Sort entities based on selection
    sortSelect.addEventListener('change', () => {
        renderEntities();
    });

    // View mode toggle
    listViewBtn.addEventListener('click', () => {
        viewMode = 'list';
        listViewBtn.classList.add('active');
        cardViewBtn.classList.remove('active');
        renderEntities();
    });

    cardViewBtn.addEventListener('click', () => {
        viewMode = 'card';
        cardViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        renderEntities();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            filterInput.focus();
            filterInput.select();
        }
    });

    function updateStats() {
        totalCountEl.textContent = entities.length;
        const filterText = filterInput.value.toLowerCase();
        const filteredCount = entities.filter(entity =>
            entity.name.toLowerCase().includes(filterText)
        ).length;
        visibleCountEl.textContent = filteredCount;
    }

    function renderEntities() {
        const filterText = filterInput.value.toLowerCase();
        const sortOption = sortSelect.value;

        // Filter entities
        let filteredEntities = entities.filter(entity =>
            entity.name.toLowerCase().includes(filterText)
        );

        // Sort entities
        if (sortOption === 'name-asc') {
            filteredEntities.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOption === 'name-desc') {
            filteredEntities.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortOption === 'columns-desc') {
            filteredEntities.sort((a, b) => (b.columns?.length || 0) - (a.columns?.length || 0));
        } else if (sortOption === 'relations-desc') {
            filteredEntities.sort((a, b) => (b.linkedEntities?.length || 0) - (a.linkedEntities?.length || 0));
        }

        // Apply view mode class
        if (viewMode === 'card') {
            entityTree.classList.add('card-view');
        } else {
            entityTree.classList.remove('card-view');
        }

        // Render entities
        entityTree.innerHTML = '';
        
        if (filteredEntities.length === 0) {
            showEmptyState();
            return;
        }

        filteredEntities.forEach(entity => {
            const li = document.createElement('li');
            
            if (viewMode === 'list') {
                li.className = 'list-item';
                if (selectedEntity === entity.name) {
                    li.classList.add('selected');
                }
                
                li.innerHTML = `
                    <svg class=\"entity-icon\" viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\">
                        <path d=\"M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z\"/>
                    </svg>
                    <div class=\"entity-content\">
                        <div class=\"entity-name\">${entity.name}</div>
                        <div class=\"entity-meta\">
                            <span>📋 ${entity.columns?.length || 0} cols</span>
                            <span>🔗 ${entity.linkedEntities?.length || 0} links</span>
                        </div>
                    </div>
                    <svg class=\"drag-indicator\" viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\">
                        <path d=\"M5 3h2v2H5V3zm4 0h2v2H9V3zM5 7h2v2H5V7zm4 0h2v2H9V7zm-4 4h2v2H5v-2zm4 0h2v2H9v-2z\"/>
                    </svg>
                `;
            } else {
                li.className = 'entity-card';
                if (selectedEntity === entity.name) {
                    li.classList.add('selected');
                }
                
                const description = entity.description || 'No description available';
                li.innerHTML = `
                    <div class=\"card-header\">
                        <svg class=\"entity-icon\" viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\">
                            <path d=\"M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z\"/>
                        </svg>
                        <div class=\"card-title\">${entity.name}</div>
                    </div>
                    <div class=\"card-description\">${description}</div>
                    <div class=\"card-stats\">
                        <span>📋 ${entity.columns?.length || 0} columns</span>
                        <span>🔗 ${entity.linkedEntities?.length || 0} relations</span>
                    </div>
                `;
            }

            // Make draggable
            li.draggable = true;
            
            li.addEventListener('dragstart', (e) => {
                li.classList.add('dragging');
                if (prevEntityName === entity.name) {
                    vscode.postMessage({
                        command: 'showInfoMessage',
                        message: 'Hold SHIFT, to get better results while dragging!'
                    });
                }
                prevEntityName = entity.name;
                e.dataTransfer.setData('application/json', JSON.stringify(entity));
            });

            li.addEventListener('dragend', () => {
                li.classList.remove('dragging');
            });

            // Click to select
            li.addEventListener('click', (e) => {
                if (e.target.closest('.context-menu')) return;
                
                // Remove selection from all items
                document.querySelectorAll('.list-item, .entity-card').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selection to clicked item
                li.classList.add('selected');
                selectedEntity = entity.name;
            });

            // Double click to open details
            li.addEventListener('dblclick', () => {
                vscode.postMessage({
                    command: 'openEntityDetails',
                    entity: entity
                });
            });

            // Right-click context menu
            li.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                showContextMenu(event, entity);
            });

            entityTree.appendChild(li);
        });
    }

    function showEmptyState() {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
            <svg viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\">
                <path d=\"M11.5 10h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2C12 2.5 9.5 0 6.5 0S1 2.5 1 5.5 3.5 11 6.5 11c1.6 0 3.1-.6 4.2-1.6l.3.3v.8l5 5 1.5-1.5-5-5zm-5 0C4 10 2 8 2 5.5S4 1 6.5 1 11 3 11 5.5 9 10 6.5 10z\"/>
            </svg>
            <div class=\"empty-state-title\">No entities found</div>
            <div class=\"empty-state-description\">
                ${filterInput.value ? 'Try adjusting your search terms' : 'No entities are available yet'}
            </div>
        `;
        entityTree.appendChild(emptyDiv);
    }

    function showContextMenu(event, entity) {
        // Remove existing context menu if present
        if (contextMenu) {
            contextMenu.remove();
        }

        // Create a new context menu
        contextMenu = document.createElement('div');
        contextMenu.classList.add('context-menu');
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.left = `${event.clientX}px`;

        // Open Details option
        const openOption = document.createElement('div');
        openOption.className = 'context-menu-item';
        openOption.innerHTML = `
            <svg viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\">
                <path d=\"M14 2H8L7 1H2L1 2v12l1 1h12l1-1V3l-1-1zM2 13V2h4.5l1 1H14v10H2z\"/>
            </svg>
            <span>Open Details</span>
        `;
        openOption.addEventListener('click', () => {
            vscode.postMessage({
                command: 'openEntityDetails',
                entity: entity
            });
            contextMenu.remove();
        });
        contextMenu.appendChild(openOption);

        // Describe option
        const describeOption = document.createElement('div');
        describeOption.className = 'context-menu-item';
        describeOption.innerHTML = `
            <svg viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\">
                <path d=\"M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z\"/>
            </svg>
            <span>Describe Entity</span>
        `;
        describeOption.addEventListener('click', () => {
            vscode.postMessage({
                command: 'describeEntity',
                entity: entity
            });
            contextMenu.remove();
        });
        contextMenu.appendChild(describeOption);

        // Separator
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        contextMenu.appendChild(separator);

        // Delete option
        const deleteOption = document.createElement('div');
        deleteOption.className = 'context-menu-item danger';
        deleteOption.innerHTML = `
            <svg viewBox=\"0 0 16 16\" xmlns=\"http://www.w3.org/2000/svg\">
                <path d=\"M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9zm2-8H5v7h1V5zm1 0h1v7H7V5zm2 0h1v7H9V5z\"/>
            </svg>
            <span>Delete Entity</span>
        `;
        deleteOption.addEventListener('click', () => {
            vscode.postMessage({
                command: 'deleteEntity',
                entityName: entity.name
            });
            contextMenu.remove();
        });
        contextMenu.appendChild(deleteOption);

        // Append the context menu to the body
        document.body.appendChild(contextMenu);

        // Position adjustment to keep menu in viewport
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }

        // Remove the context menu when clicking elsewhere
        const removeMenu = () => {
            if (contextMenu) {
                contextMenu.remove();
                contextMenu = null;
            }
            document.removeEventListener('click', removeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 100);
    }
});

