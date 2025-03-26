document.addEventListener('DOMContentLoaded', () => {
    const entityTree = document.getElementById('entity-tree');

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'loadEntities') {
            const entities = message.entities;
            entities.forEach(entity => {
                const li = document.createElement('li');
                li.textContent = entity.name;
                entityTree.appendChild(li);
            });
        }
    });
});