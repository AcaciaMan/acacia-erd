const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const filterInput = document.getElementById('filter-input');
    const sortSelect = document.getElementById('sort-select');
    const entityTree = document.getElementById('entity-tree');

    let entities = [];
    let contextMenu;

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'loadEntities') {
            entities = message.entities;
            renderEntities();
        }
    });

    // Filter entities based on input
    filterInput.addEventListener('input', () => {
        renderEntities();
    });

    // Sort entities based on selection
    sortSelect.addEventListener('change', () => {
        renderEntities();
    });

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
        }

        // Render entities
        entityTree.innerHTML = '';
        filteredEntities.forEach(entity => {
            const li = document.createElement('li');
            li.textContent = entity.name;
            li.draggable = true;
            li.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(entity));
            });
            li.addEventListener('dblclick', () => {
                vscode.postMessage({
                    command: 'openEntityDetails',
                    entity: entity
                });
            });
                        // Add right-click context menu
                        li.addEventListener('contextmenu', (event) => {
                            event.preventDefault();
                            showContextMenu(event, entity);
                        });
            entityTree.appendChild(li);
        });
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

        // Add "Describe" option
        const describeOption = document.createElement('div');
        describeOption.textContent = 'Describe';
        describeOption.addEventListener('click', () => {
            vscode.postMessage({
                command: 'describeEntity',
                entity: entity
            });
            contextMenu.remove();
        });
        contextMenu.appendChild(describeOption);

        // Add "Delete" option
        const deleteOption = document.createElement('div');
        deleteOption.textContent = 'Delete';
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

        // Remove the context menu when clicking elsewhere
        document.addEventListener('click', () => {
            if (contextMenu) {
                contextMenu.remove();
                contextMenu = null;
            }
        }, { once: true });
    }
});