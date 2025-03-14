function applyForceLayout(entities, width, height) {
    const repulsionForce = 1000;
    const attractionForce = 0.1;
    const maxIterations = 1000;
    const damping = 0.9;

    // Define the width and height of the entity rectangles
    const entityWidth = 100;
    const entityHeight = 50;

    // Randomly position entities
    entities.forEach(entity => {
        entity.x = Math.random() * width;
        entity.y = Math.random() * height;
    });

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
        rect.setAttribute('width', '100');
        rect.setAttribute('height', '50');
        rect.setAttribute('fill', 'lightblue');

        const text = document.createElementNS(svgNamespace, 'text');
        text.setAttribute('x', '25');
        text.setAttribute('y', '25');
        text.setAttribute('font-family', 'Arial');
        text.setAttribute('font-size', '14');
        text.textContent = entity.name;

        group.appendChild(rect);
        group.appendChild(text);
        svg.appendChild(group);
    });

    return svg.outerHTML;
}