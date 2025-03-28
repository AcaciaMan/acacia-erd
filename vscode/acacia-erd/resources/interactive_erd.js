const vscode = acquireVsCodeApi();


function attachEntityEventListeners() {
    document.querySelectorAll('.entity').forEach(entityElement => {

        let clickTimeout;


        // Remove existing event listeners to ensure they are added only once
        entityElement.replaceWith(entityElement.cloneNode(true));
        entityElement = document.querySelector(`.entity[id="${entityElement.id}"]`);


        entityElement.addEventListener('click', (event) => {
            // Clear any existing timeout to prevent single-click logic from executing
            clearTimeout(clickTimeout);

                        // Set a timeout to execute single-click logic
                        clickTimeout = setTimeout(() => {
                // set all other entities to lightblue
                document.querySelectorAll('.entity').forEach(entity => {
                    if (entity !== entityElement) {
                        entity.querySelector('rect').setAttribute('fill', 'lightblue');
                    }
                });

            const entityData = JSON.parse(entityElement.getAttribute('data-entity'));

            // Toggle the color of the rectangle on click
            const rect = entityElement.querySelector('rect');
            if (rect.getAttribute('fill') !== 'red') {
                rect.setAttribute('fill', 'red');
                // set all linked entities to green
                document.querySelectorAll('.entity').forEach(entity => {
                    if (entity !== entityElement) {
                        const eData = JSON.parse(entity.getAttribute('data-entity'));
                        if (entityData.linkedEntities &&  entityData.linkedEntities.includes(eData.name) ) {
                        entity.querySelector('rect').setAttribute('fill', 'green');
                        } else if (eData.linkedEntities && eData.linkedEntities.includes(entityData.name)) {
                        entity.querySelector('rect').setAttribute('fill', 'yellow');
                        }
                    }
                });


            } else {
                rect.setAttribute('fill', 'lightblue');
            }


            vscode.postMessage({
                command: 'entityClicked',
                entity: entityData
            });
        }, 200);
        });

        entityElement.addEventListener('dblclick', (event) => {
                        // Clear the timeout to prevent single-click logic from executing
                        clearTimeout(clickTimeout);
            const entityData = JSON.parse(entityElement.getAttribute('data-entity'));

            vscode.postMessage({
                command: 'openEntityDetails',
                entity: entityData
            });
        });
    });

    document.querySelectorAll('.delete-button').forEach(deleteButton => {
        deleteButton.removeEventListener('click', (event) => {});

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

    document.querySelectorAll('.describe-button').forEach(describeButton => {
        describeButton.removeEventListener('click', (event) => {});
        describeButton.addEventListener('click', (event) => {
            const entityElement = event.target.closest('.entity');
            const entityData = JSON.parse(entityElement.getAttribute('data-entity'));
            vscode.postMessage({
                command: 'describeEntity',
                entity: entityData
            });
        });
    }
    );

}

// Dragging functionality
let svg = document.getElementById('erd-svg');
let isDragging = false;
let isResizing = false;
let startX, startY, startWidth, startHeight;
let currentEntity = null;

function attachSVGEntityEventListeners() {

    svg = document.getElementById('erd-svg');

    svg.addEventListener('mousedown', (event) => {
        if (event.target.closest('.resize-handle')) {
           isResizing = true;
           currentEntity = event.target.closest('.entity');
              const rect = currentEntity.querySelector('rect');
                startX = event.clientX;
                startY = event.clientY;
                startWidth = parseFloat(rect.getAttribute('width'));
                startHeight = parseFloat(rect.getAttribute('height'));


        } else if (event.target.closest('.entity')) {
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

        if (isResizing && currentEntity) {
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;

            const newWidth = Math.max(50, startWidth + deltaX); // Minimum width: 50
            const newHeight = Math.max(30, startHeight + deltaY); // Minimum height: 30

            const rect = currentEntity.querySelector('rect');
            rect.setAttribute('width', newWidth);
            rect.setAttribute('height', newHeight);

            // Update the position of the resize handle
            const resizeHandle = currentEntity.querySelector('.resize-handle');
            resizeHandle.setAttribute('cx', newWidth);
            resizeHandle.setAttribute('cy', newHeight);
        }
    });

    svg.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            const rect = currentEntity.querySelector('rect');

            // Update the entity's data
            const entityData = JSON.parse(currentEntity.getAttribute('data-entity'));
            entityData.rectWidth = parseFloat(rect.getAttribute('width'));
            entityData.rectHeight = parseFloat(rect.getAttribute('height'));
            currentEntity.setAttribute('data-entity', JSON.stringify(entityData));
            updateEntity(entityData);
        }



        isDragging = false;
        currentEntity = null;

    });

    svg.addEventListener('mouseleave', () => {
        if (isResizing) {
            isResizing = false;

            const rect = currentEntity.querySelector('rect');
            // Update the entity's data
            const entityData = JSON.parse(currentEntity.getAttribute('data-entity'));
            entityData.rectWidth = parseFloat(rect.getAttribute('width'));
            entityData.rectHeight = parseFloat(rect.getAttribute('height'));
            currentEntity.setAttribute('data-entity', JSON.stringify(entityData));
            updateEntity(entityData);

        }
        isDragging = false;
        currentEntity = null;
    });

    svg.addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    svg.addEventListener('drop', (event) => {
        event.preventDefault();
        console.log('Dropped entity:', event.dataTransfer.getData('application/json')); 
        const entityData = event.dataTransfer.getData('application/json');
        if (entityData) {
            const entity = JSON.parse(entityData);
            entity.x = event.clientX;
            entity.y = event.clientY;
            console.log('Dropped entity:', entity);
            addEntityToSvg(svg, entity);
            attachEntityEventListeners();
        }
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

function calculateMaxChars(text, maxWidth, fontSize = 14) {
    // Create a temporary SVG text element for measurement
    const svgNS = 'http://www.w3.org/2000/svg';
    const tempText = document.createElementNS(svgNS, 'text');
    tempText.setAttribute('font-size', fontSize);
    tempText.setAttribute('font-family', 'Arial');
    
    tempText.textContent = 'i';
// Append the text element to an SVG container in the DOM
const svg = document.getElementById('erd-svg');
svg.appendChild(tempText);

    let truncatedText = '';
    for (let i = 0; i < text.length; i++) {
        tempText.textContent = truncatedText + text[i];

        
        if (tempText.getComputedTextLength() > maxWidth) {
            truncatedText += '...';
            break;
        }
        truncatedText += text[i];
    }

    // Remove the temporary text element
    svg.removeChild(tempText);

    return truncatedText;
}

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

        let columns = [];
        // if entity has rectWidth and rectHeight, calc how many columns and characters can fit in the rect
        if (entity.rectWidth && entity.rectHeight) {
            const maxLines = Math.floor(entity.rectHeight / 20); // 20 is the line height
            entity.name = calculateMaxChars(entity.name, entity.rectWidth - 40); // 40 is the padding

            if (entity.columns) {
                entity.columns.forEach((column, index) => {
                    if (index > maxLines) {
                        return;
                    }
                    if (index === maxLines) {
                        columns.push('...');
                        return;
                    }

                    columns.push(calculateMaxChars(column, entity.rectWidth - 25, 12));

                });
            }
        } else {
            if (entity.columns) {
            // show only 8 columns
            if (entity.columns.length > 8) {
            columns = entity.columns.slice(0, 7);
            columns.push('...');
            } else {
            columns = entity.columns;
            }
        }

        }
            entity.columns = columns;



        // Add the entity name as the first tspan
        const nameTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        nameTspan.setAttribute('x', '20');
        nameTspan.setAttribute('y', '4');
        nameTspan.setAttribute('dy', '1.2em'); // Line height        
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
        if (!entity.columns || entity.columns.length === 0) {
            bbox.width += 20;
        }
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
        
        // Add describe button
        let describeButton = entityGroup.querySelector('.describe-button');
        if (!describeButton) {
            describeButton = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            describeButton.setAttribute('x', bbox.width);
            describeButton.setAttribute('y', '10');
            describeButton.setAttribute('font-family', 'Arial');
            describeButton.setAttribute('font-size', '12');
            describeButton.setAttribute('fill', 'darkblue');
            describeButton.setAttribute('class', 'describe-button');
            describeButton.textContent = 'D';
            entityGroup.appendChild(describeButton);
        } else {
            describeButton.setAttribute('x', bbox.width );
        }

        // Add resize handle
        let resizeHandle = entityGroup.querySelector('.resize-handle');
        if (!resizeHandle) {
            resizeHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            resizeHandle.setAttribute('cx', bbox.width+20); // Bottom-right corner
            resizeHandle.setAttribute('cy', bbox.height + 20);
            resizeHandle.setAttribute('r', '5');
            resizeHandle.setAttribute('fill', 'darkblue');
            resizeHandle.setAttribute('class', 'resize-handle');
            entityGroup.appendChild(resizeHandle);
        } else {
            resizeHandle.setAttribute('cx', bbox.width+20);
            resizeHandle.setAttribute('cy', bbox.height+20);
        }

        console.log('Entity updated:', entity);
        console.log('text content:', text.textContent);
    }
}