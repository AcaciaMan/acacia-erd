let entityMap = new Map();

function getERDEntities() {
    const entities = [];
    const entityElements = document.querySelectorAll('.entity');
    entityElements.forEach(entityElement => {
        const entity = JSON.parse(entityElement.getAttribute('data-entity'));
        entities.push(entity);
    });
    return entities;
}


function discoverLinkedEntities(entities) {

        // Create a map of entities by name for quick lookup
        entities.forEach(entity => {
            if(entity.linkedEntities === undefined) {
                entity.linkedEntities = [];
            }
            
            entityMap.set(entity.name, entity);
        });

        entities.forEach(entity => {
            // if entity name is in other entity columns, link entities
            for (const other of entities){
                if (compareNamesWithLevenshtein(entity.name, other.name)<0.5 && entity.name.length<other.name.length) {
                    if (!entity.linkedEntities.includes(other.name)) {
                    entity.linkedEntities.push(other.name);
                    }
                    continue;
                }
                if (entity !== other && other.columns) {
                    for (const column of other.columns) {
                        if (compareNamesWithLevenshtein(entity.name, column)<0.5) {
                                if (!entity.linkedEntities.includes(other.name)) {
                                entity.linkedEntities.push(other.name);
                                }
                            break;
                        }
                    }
                }
            };
        });

    return entities;
}




function applyForceLayout(entities, width, height, sliceEntities) {

    console.log('Started force layout');

    // Create a map of entities by name for quick lookup
    entities.forEach(entity => {
        entityMap.set(entity.name, entity);
    });

    // Randomly position entities
    entities.forEach(entity => {
        entity.x = Math.random() * width;
        entity.y = height;
        setWidthAndHeight(entity);
        if(entity.linkedEntities === undefined) {
           entity.linkedEntities = [];
        }
        entity.importance = 0;
        entity.second_importance = 0;

    });

    // calculate the importance of the entity
    entities.forEach(entity => {
        entity.importance = 0;
        entity.linkedEntities.forEach(other => {
                entity.importance += 1;
                entityMap.get(other).importance += 1;
            });
    });

    // calculate the second_importance of the entity based on entity name and columns
    entities.forEach(entity => {
        entity.second_importance += entity.importance;
        entity.linkedEntities.forEach(other => {
            entity.second_importance += entityMap.get(other).importance;
            entityMap.get(other).second_importance += entity.importance;
        });
    });



    // sort entities by second_importance descending
    entities.sort((a, b) => b.second_importance - a.second_importance );

    // divide width in 5 columns
    let columnWidth = width / 5;

    if(sliceEntities) {
    // generate only first 30 entities
        entities = entities.slice(0, 30);
    }

    entities.forEach(entity => {
        console.log(`Entity: ${entity.name}, Second Importance: ${entity.second_importance}`);
    });

    // assign each entity to a column
    entities.forEach((entity, index) => {
        assignColumn(entity, columnWidth, Math.floor(Math.random() * 5));
    });

    entities.forEach((entity, index) => {
        while (calculateYPosition(entity, entities, height)) {
            assignColumn(entity, columnWidth, entity.column+1);
        }
 
    });


    return entities;


}

function assignColumn(entity, columnWidth, column) {
    entity.column = column;
    // calculate in how many columns the entity spans
    entity.dcolumns = [entity.column];
    let entityWidth = entity.width;
    let entityColumn = entity.column;
    while (entityWidth > columnWidth) {
        entityWidth -= columnWidth;
        entityColumn++;
        entity.dcolumns.push(entityColumn);
    }


    // center the entity in the columns
    let entityColumns = entity.dcolumns.length;
    let entityWidthTotal = entityColumns * columnWidth;
    let entityWidthOffset = (entityWidthTotal - entity.width) / 2;
    entity.x = entity.column * columnWidth + entityWidthOffset;

}

function calculateYPosition(entity, entities, height) {
       // calculate the y position
        // put entity in random y position and check if it overlaps with other entities, repeat 100 times max to avoid infinite loop in case of overlap
        let overlap = true;
        let iteration = 0;
        while (overlap && iteration < 100) {
            // the first entities are placed closer to the middle of the screen
            // if iteration is 0, the entity is placed in the middle of the screen
            if (iteration === 0) {
                entity.y = height / 2 - entity.height / 2;
            } else if (iteration === 1) {
                entity.y = height / 4 - entity.height / 2;
            
        } else if (iteration === 2) {
                entity.y = height * 3 / 4 - entity.height   / 2;
        
    } else {
                entity.y = Math.random() * height;
            }

            overlap = false;
            entities.forEach(other => {
                if (entity !== other) {
                    if (entity.dcolumns.some(column => other.dcolumns.includes(column))) {
                        if (entity.y < other.y + other.height && entity.y + entity.height > other.y) {
                            overlap = true;
                        }
                    }
                }
            });
            iteration++;
        } 

        return overlap;
}

function generateSVG(entities) {
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('xmlns', svgNamespace);
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svg.setAttribute('id', 'erd-svg');

    entities.forEach(entity => {
        const group = document.createElementNS(svgNamespace, 'g');
        group.setAttribute('class', 'entity');
        group.setAttribute('id', entity.id);
        group.setAttribute('data-entity', JSON.stringify(entity));
        group.setAttribute('transform', `translate(${entity.x}, ${entity.y})`);

        const rect = document.createElementNS(svgNamespace, 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('fill', 'lightblue');

        const text = document.createElementNS(svgNamespace, 'text');
        // Remove existing tspan elements
        while (text.firstChild) {
            text.removeChild(text.firstChild);
        }

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
            entity.columns.forEach((column, index )=> {
                if (index < 8) {
            const columnTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            columnTspan.setAttribute('x', '5');
            columnTspan.setAttribute('font-size', '12');
            columnTspan.setAttribute('dy', '1.2em'); // Line height
            columnTspan.textContent = column;
            text.appendChild(columnTspan);
                }
                if (index === 8) {
                    const columnTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    columnTspan.setAttribute('x', '5');
                    columnTspan.setAttribute('font-size', '12');
                    columnTspan.setAttribute('dy', '1.2em'); // Line height
                    columnTspan.textContent = '...';
                    text.appendChild(columnTspan);
                }
            });
        }

        // Temporarily attach to the DOM to measure
        const tempsvg = document.createElementNS(svgNamespace, 'svg');
        tempsvg.appendChild(text);
        document.body.appendChild(tempsvg);

        // Update rect height and width based on text content
        const textBBox = text.getBBox();
        rect.setAttribute('width', textBBox.width + 20);
        rect.setAttribute('height', textBBox.height + 20);

        // Remove from DOM after measuring
        document.body.removeChild(tempsvg);

        const deleteButton = document.createElementNS(svgNamespace, 'text');
        deleteButton.setAttribute('x', textBBox.width + 10);
        deleteButton.setAttribute('y', '10');
        deleteButton.setAttribute('font-family', 'Arial');
        deleteButton.setAttribute('font-size', '12');
        deleteButton.setAttribute('fill', 'darkblue');
        deleteButton.setAttribute('class', 'delete-button');
        deleteButton.textContent = 'X';

        const describeButton = document.createElementNS(svgNamespace, 'text');
        describeButton.setAttribute('x', textBBox.width);
        describeButton.setAttribute('y', '10');
        describeButton.setAttribute('font-family', 'Arial');
        describeButton.setAttribute('font-size', '12');
        describeButton.setAttribute('fill', 'darkblue');
        describeButton.setAttribute('class', 'describe-button');
        describeButton.textContent = 'D';

        group.appendChild(rect);
        group.appendChild(text);
        group.appendChild(deleteButton);
        group.appendChild(describeButton);
        svg.appendChild(group);
    });

    return svg.outerHTML;
}

function setWidthAndHeight(entity) {


    // Calculate the width and height of the entity based on the name and columns
    /*
    const text = entity.name + (entity.columns ? '\n' + entity.columns.join('\n') : '');
    let lines = text.split('\n').slice(0, 9);
    const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b);
    const longestLineWidth = longestLine.length * 8; // Assuming 8 pixels per character
    const lineHeight = 20;
    entity.width = longestLineWidth + 24;
    entity.height = (lines.length + 1) * lineHeight;
    */

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
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
                entity.columns.forEach((column, index )=> {
                    if (index < 8) {
                const columnTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                columnTspan.setAttribute('x', '5');
                columnTspan.setAttribute('font-size', '12');
                columnTspan.setAttribute('dy', '1.2em'); // Line height
                columnTspan.textContent = column;
                text.appendChild(columnTspan);
                    }
                    if (index === 8) {
                        const columnTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                        columnTspan.setAttribute('x', '5');
                        columnTspan.setAttribute('font-size', '12');
                        columnTspan.setAttribute('dy', '1.2em'); // Line height
                        columnTspan.textContent = '...';
                        text.appendChild(columnTspan);
                    }
                });
            }
    
            // Temporarily attach to the DOM to measure
            const tempsvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            tempsvg.appendChild(text);
            document.body.appendChild(tempsvg);
    
            // Update rect height and width based on text content
            const textBBox = text.getBBox();
            entity.width = textBBox.width + 23;
            entity.height = textBBox.height + 23;
    
            // Remove from DOM after measuring
            document.body.removeChild(tempsvg);

}