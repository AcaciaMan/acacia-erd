const vscode = acquireVsCodeApi();

document.querySelector('.entity').addEventListener('click', () => {
    vscode.postMessage({
        command: 'entityClicked',
        entity: { id: 'entity1', name: 'Entity 1' }
    });
});

document.querySelector('.entity').addEventListener('dblclick', () => {
    vscode.postMessage({
        command: 'openEntityDetails',
        entity: { id: 'entity1', name: 'Entity 1' }
    });
});

// Dragging functionality
const svg = document.getElementById('erd-svg');
let isDragging = false;
let startX, startY;
let currentEntity = null;

svg.addEventListener('mousedown', (event) => {
    if (event.target.closest('.entity')) {
        isDragging = true;
        currentEntity = event.target.closest('.entity');
        const transform = currentEntity.getAttribute('transform');
        const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
        startX = event.clientX - parseFloat(translate[1]);
        startY = event.clientY - parseFloat(translate[2]);
    }
});

svg.addEventListener('mousemove', (event) => {
    if (isDragging && currentEntity) {
        const x = event.clientX - startX;
        const y = event.clientY - startY;
        currentEntity.setAttribute('transform', `translate(${x}, ${y})`);
    }
});

svg.addEventListener('mouseup', () => {
    isDragging = false;
    currentEntity = null;
});

svg.addEventListener('mouseleave', () => {
    isDragging = false;
    currentEntity = null;
});

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateEntity':
            console.log('Updating entity:', message.entity);
            updateEntity(message.entity);
            break;
    }
});

function updateEntity(entity) {
    const entityGroup = document.getElementById(entity.id);
    if (entityGroup) {
        const text = entityGroup.querySelector('text');
        text.textContent = entity.name;

        // Measure the width of the text
        const svg = document.getElementById('erd-svg');
        const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tempText.setAttribute('font-family', 'Arial');
        tempText.setAttribute('font-size', '14');
        tempText.textContent = entity.name;
        svg.appendChild(tempText);
        const textWidth = tempText.getBBox().width;
        svg.removeChild(tempText);

        // Update the width of the rectangle
        const rect = entityGroup.querySelector('rect');
        rect.setAttribute('width', textWidth + 40); // Add some padding

        console.log('Entity updated:', entity);
        console.log('text content:', text.textContent);
    }
}