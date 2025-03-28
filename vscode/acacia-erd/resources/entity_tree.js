const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const filterInput = document.getElementById('filter-input');
    const sortSelect = document.getElementById('sort-select');
    const entityTree = document.getElementById('entity-tree');

    let entities = [];

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
            entityTree.appendChild(li);
        });
    }
});