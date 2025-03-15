function applyForceLayout(entities, width, height) {

    // Randomly position entities
    entities.forEach(entity => {
        entity.x = Math.random() * width;
        entity.y = Math.random() * height;
        setWidthAndHeight(entity);

    });


    // divide width in 5 columns
    let columnWidth = width / 5;

    // assign each entity to a column
    entities.forEach((entity, index) => {
        // assign the entity to a column randomly
        entity.column = Math.floor(Math.random() * 5);
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
    });

    entities.forEach((entity, index) => {
        // calculate the y position
        // put entity in random y position and check if it overlaps with other entities, repeat 100 times max to avoid infinite loop in case of overlap
        let overlap = true;
        let iteration = 0;
        while (overlap && iteration < 100) {
            entity.y = Math.random() * height;
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


    });





    /*
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        entities.forEach(entity => {
            entity.vx = entity.vx || 0;
            entity.vy = entity.vy || 0;

            entities.forEach(other => {
                if (entity !== other) {
                    const dx = entity.x - other.x;
                    const dy = entity.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = Math.sqrt(entityWidth * entityWidth + entityHeight * entityHeight);

                    if (distance < minDistance) {
                        const force = repulsionForce / (distance * distance);

                        entity.vx += (dx / distance) * force;
                        entity.vy += (dy / distance) * force;
                    }
                }
            });
        });

        entities.forEach(entity => {
            entities.forEach(other => {
                if (entity !== other) {
                    const dx = entity.x - other.x;
                    const dy = entity.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = Math.sqrt(entityWidth * entityWidth + entityHeight * entityHeight);

                    if (distance > minDistance) {
                        const force = attractionForce * (distance - minDistance);

                        entity.vx -= (dx / distance) * force;
                        entity.vy -= (dy / distance) * force;
                    }
                }
            });
        });

        entities.forEach(entity => {
            entity.x += entity.vx;
            entity.y += entity.vy;

            entity.vx *= damping;
            entity.vy *= damping;

            // Keep entities within bounds
            entity.x = Math.max(0, Math.min(width - entityWidth, entity.x));
            entity.y = Math.max(0, Math.min(height - entityHeight, entity.y));
        });
    }
        */
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
            entity.columns.forEach(column => {
            const columnTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            columnTspan.setAttribute('x', '5');
            columnTspan.setAttribute('font-size', '12');
            columnTspan.setAttribute('dy', '1.2em'); // Line height
            columnTspan.textContent = column;
            text.appendChild(columnTspan);
            });
        }

        // Temporarily attach to the DOM to measure
        const tempsvg = document.createElementNS(svgNamespace, 'svg');
        tempsvg.appendChild(text);
        document.body.appendChild(tempsvg);

        // Update rect height and width based on text content
        const textBBox = text.getBBox();
        rect.setAttribute('width', textBBox.width + 40);
        rect.setAttribute('height', textBBox.height + 20);

        // Remove from DOM after measuring
        document.body.removeChild(tempsvg);

        group.appendChild(rect);
        group.appendChild(text);
        svg.appendChild(group);
    });

    return svg.outerHTML;
}

function setWidthAndHeight(entity) {

    // Calculate the width and height of the entity based on the name and columns
    const text = entity.name + (entity.columns ? '\n' + entity.columns.join('\n') : '');
    const lines = text.split('\n');
    const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b);
    const longestLineWidth = longestLine.length * 8; // Assuming 8 pixels per character
    const lineHeight = 20;
    entity.width = longestLineWidth + 40;
    entity.height = (lines.length + 1) * lineHeight;
}