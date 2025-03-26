document.addEventListener('DOMContentLoaded', () => {
    const entityTree = document.getElementById('entity-tree');

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'loadEntities') {
            const entities = message.entities;
            entityTree.innerHTML = ''; // Clear existing entities
            entities.forEach(entity => {
                const li = document.createElement('li');
                li.textContent = entity.name;
                li.draggable = true;
                li.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify(entity));
                });
                entityTree.appendChild(li);
            });
        }
    });
});