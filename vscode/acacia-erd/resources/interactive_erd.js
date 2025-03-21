const vscode = acquireVsCodeApi();

function attachEntityEventListeners() {
    document.querySelectorAll('.entity').forEach(entityElement => {
        entityElement.addEventListener('click', (event) => {
            const entityData = JSON.parse(entityElement.getAttribute('data-entity'));

            vscode.postMessage({
                command: 'entityClicked',
                entity: entityData
            });
        });

        entityElement.addEventListener('dblclick', (event) => {
            const entityData = JSON.parse(entityElement.getAttribute('data-entity'));

            vscode.postMessage({
                command: 'openEntityDetails',
                entity: entityData
            });
        });
    });

    document.querySelectorAll('.delete-button').forEach(deleteButton => {
        deleteButton.addEventListener('click', (event) => {
            const entityElement = event.target.closest('.entity');
            const entityId = entityElement.getAttribute('id');
            vscode.postMessage({
                command: 'deleteEntity',
                entityId: entityId
            });
            entityElement.remove();
        });
    });

}

// Dragging functionality
let svg = document.getElementById('erd-svg');
let isDragging = false;
let startX, startY;
let currentEntity = null;

function attachSVGEntityEventListeners() {

    svg = document.getElementById('erd-svg');

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
}

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

        // Update the data-entity attribute
        entityGroup.setAttribute('data-entity', JSON.stringify(entity));

        const text = entityGroup.querySelector('text');
        text.textContent = entity.name;




        // Remove existing tspan elements
        while (text.firstChild) {
            text.removeChild(text.firstChild);
        }

        // Add the entity name as the first tspan
        const nameTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        nameTspan.setAttribute('x', '20');
        nameTspan.setAttribute('font-size', '14');
        nameTspan.textContent = entity.name;
        text.appendChild(nameTspan);

        // Add columns as tspan elements
        if (entity.columns) {
            entity.columns.forEach(column => {
            const columnTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            columnTspan.setAttribute('x', '5');
            columnTspan.setAttribute('font-size', '12');
            columnTspan.setAttribute('dy', '1.2em'); // Line height
            columnTspan.textContent = column;
            text.appendChild(columnTspan);
            });
        }


        // update rectangle width and height
        const bbox = text.getBBox();
        const rect = entityGroup.querySelector('rect');
        rect.setAttribute('width', bbox.width + 20);
        rect.setAttribute('height', bbox.height + 20);

        // Add delete button
        let deleteButton = entityGroup.querySelector('.delete-button');
        if (!deleteButton) {
            deleteButton = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            deleteButton.setAttribute('x', bbox.width + 10);
            deleteButton.setAttribute('y', '10');
            deleteButton.setAttribute('font-family', 'Arial');
            deleteButton.setAttribute('font-size', '12');
            deleteButton.setAttribute('fill', 'darkblue');
            deleteButton.setAttribute('class', 'delete-button');
            deleteButton.textContent = 'X';
            entityGroup.appendChild(deleteButton);
        } else {
            deleteButton.setAttribute('x', bbox.width + 10);
        }       

        console.log('Entity updated:', entity);
        console.log('text content:', text.textContent);
    }
}