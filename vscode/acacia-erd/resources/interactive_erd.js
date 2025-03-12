const vscode = acquireVsCodeApi();

document.querySelector('.entity').addEventListener('click', () => {
    vscode.postMessage({
        command: 'entityClicked',
        entity: 'Entity 1'
    });
});

document.querySelector('.entity').addEventListener('dblclick', () => {
    vscode.postMessage({
        command: 'openEntityDetails',
        entity: 'Entity 1'
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

// Add new entity on right-click
svg.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const x = event.clientX - svg.getBoundingClientRect().left;
    const y = event.clientY - svg.getBoundingClientRect().top;
    addNewEntity(x, y);
});

function addNewEntity(x, y) {
    const newEntity = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    newEntity.setAttribute('class', 'entity');
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

    newEntity.addEventListener('click', () => {
        vscode.postMessage({
            command: 'entityClicked',
            entity: 'New Entity'
        });
    });

    newEntity.addEventListener('dblclick', () => {
        vscode.postMessage({
            command: 'openEntityDetails',
            entity: 'New Entity'
        });
    });
}