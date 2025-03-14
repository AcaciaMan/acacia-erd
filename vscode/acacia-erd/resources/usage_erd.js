function attachSVGUsageEventListeners() {

    svg = document.getElementById('erd-svg');

    svg.addEventListener('mousedown', (event) => {
        if (event.target.closest('.usage')) {
            isDragging = true;
            currentUsage = event.target.closest('.usage');
            const transform = currentUsage.getAttribute('transform');
            const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
            startX = event.clientX - parseFloat(translate[1]);
            startY = event.clientY - parseFloat(translate[2]);
        }
    });

    svg.addEventListener('mousemove', (event) => {
        if (isDragging && currentUsage) {
            const x = event.clientX - startX;
            const y = event.clientY - startY;
            currentUsage.setAttribute('transform', `translate(${x}, ${y})`);
        }
    });

    svg.addEventListener('mouseup', () => {
        isDragging = false;
        currentUsage = null;
    });

    svg.addEventListener('mouseleave', () => {
        isDragging = false;
        currentUsage = null;
    });

    // Add new entity or usage on right-click
    svg.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const x = event.clientX - svg.getBoundingClientRect().left;
        const y = event.clientY - svg.getBoundingClientRect().top;
        showContextMenu(x, y);
    });
}

function showContextMenu(x, y) {
    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.backgroundColor = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.padding = '5px';
    menu.style.zIndex = '1000';

    const entityOption = document.createElement('div');
    entityOption.textContent = 'Create Entity';
    entityOption.style.cursor = 'pointer';
    entityOption.addEventListener('click', () => {
        addNewEntity(x, y);
        document.body.removeChild(menu);
    });

    const usageOption = document.createElement('div');
    usageOption.textContent = 'Create Usage';
    usageOption.style.cursor = 'pointer';
    usageOption.addEventListener('click', () => {
        addNewUsage(x, y);
        document.body.removeChild(menu);
    });

    menu.appendChild(entityOption);
    menu.appendChild(usageOption);
    document.body.appendChild(menu);

    document.addEventListener('click', () => {
        if (document.body.contains(menu)) {
            document.body.removeChild(menu);
        }
    }, { once: true });
}

function addNewEntity(x, y) {
    const newEntityId = `entity${Date.now()}`;
    const newEntity = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    newEntity.setAttribute('class', 'entity');
    newEntity.setAttribute('id', newEntityId);
    const entityData = { id: newEntityId, name: 'New Entity' };
    newEntity.setAttribute('data-entity', JSON.stringify(entityData));

    newEntity.setAttribute('transform', `translate(${x}, ${y})`);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '50');
    rect.setAttribute('fill', 'lightblue');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '25');
    text.setAttribute('y', '25');
    text.setAttribute('font-family', 'Arial');
    text.setAttribute('font-size', '14');
    text.textContent = 'New Entity';

    newEntity.appendChild(rect);
    newEntity.appendChild(text);
    svg.appendChild(newEntity);

    attachEntityEventListeners();

}

function addNewUsage(x, y) {
    const newUsageId = `usage${Date.now()}`;
    const newUsage = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    newUsage.setAttribute('class', 'usage');
    newUsage.setAttribute('id', newUsageId);
    newUsage.setAttribute('data-usage', JSON.stringify({ id: newUsageId, text: 'New Usage' }));
    newUsage.setAttribute('transform', `translate(${x}, ${y})`);
    newUsage.setAttribute('font-family', 'Arial');
    newUsage.setAttribute('font-size', '12');

    const lines = 'New Usage'.split('\n');
    lines.forEach((line, index) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', 0);
        tspan.setAttribute('dy', index === 0 ? '0' : '1.2em');
        tspan.textContent = line;
        newUsage.appendChild(tspan);
    });

    svg.appendChild(newUsage);

    attachUsageEventListeners();


}

function attachUsageEventListeners() {
    document.querySelectorAll('.usage').forEach(entityElement => {
        entityElement.addEventListener('click', (event) => {
            const entityData = JSON.parse(entityElement.getAttribute('data-usage'));

            vscode.postMessage({
                command: 'usageClicked',
                usage: entityData
            });
        });

        entityElement.addEventListener('dblclick', (event) => {
            const entityData = JSON.parse(entityElement.getAttribute('data-usage'));

            vscode.postMessage({
                command: 'openUsageDetails',
                usage: entityData
            });
        });
    });
}
// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateUsage':
            updateUsage(message.usage);
            break;
    }
});

function updateUsage(usage) {
    const usageText = document.getElementById(usage.id);
    if (usageText) {
        // Clear existing tspans
        while (usageText.firstChild) {
            usageText.removeChild(usageText.firstChild);
        }

        // Update the data-usage attribute
        usageText.setAttribute('data-usage', JSON.stringify(usage));

        const lines = usage.text.split('\n');
        lines.forEach((line, index) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.setAttribute('x', 0);
            tspan.setAttribute('dy', index === 0 ? '0' : '1.2em');
            tspan.textContent = line;
            usageText.appendChild(tspan);
        });
    }
}