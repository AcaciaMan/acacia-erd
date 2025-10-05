const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('erd-generation-form');
    const maxEntitiesInput = document.getElementById('maxEntities');
    const maxEntitiesValue = document.getElementById('maxEntitiesValue');
    const discoverLinkedEntities = document.getElementById('discoverLinkedEntities');
    const entityNameInput = document.getElementById('entityName');
    const advancedToggle = document.getElementById('advancedToggle');
    const advancedContent = document.getElementById('advancedContent');
    const cancelButton = document.getElementById('cancelButton');
    const presetCards = document.querySelectorAll('.preset-card');

    // Preset configurations
    const presets = {
        small: { maxEntities: 5, discover: true },
        medium: { maxEntities: 15, discover: true },
        large: { maxEntities: 30, discover: true },
        all: { maxEntities: 0, discover: true }
    };

    // Update range value display
    maxEntitiesInput.addEventListener('input', () => {
        const value = maxEntitiesInput.value;
        maxEntitiesValue.textContent = value === '0' ? 'All' : value;
        
        // Remove active state from presets when manually adjusting
        presetCards.forEach(card => card.classList.remove('active'));
    });

    // Preset card selection
    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            const presetName = card.dataset.preset;
            const preset = presets[presetName];
            
            if (preset) {
                maxEntitiesInput.value = preset.maxEntities;
                maxEntitiesValue.textContent = preset.maxEntities === 0 ? 'All' : preset.maxEntities;
                discoverLinkedEntities.checked = preset.discover;
                
                // Update active state
                presetCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            }
        });
    });

    // Advanced options toggle
    advancedToggle.addEventListener('click', () => {
        const isExpanded = advancedToggle.classList.contains('expanded');
        
        if (isExpanded) {
            advancedToggle.classList.remove('expanded');
            advancedContent.classList.remove('visible');
        } else {
            advancedToggle.classList.add('expanded');
            advancedContent.classList.add('visible');
        }
    });

    // Cancel button
    cancelButton.addEventListener('click', () => {
        vscode.postMessage({
            command: 'cancel'
        });
    });

    // Form submission
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const maxEntities = parseInt(maxEntitiesInput.value, 10);
        const discover = discoverLinkedEntities.checked;
        const entityName = entityNameInput.value.trim();

        // Validation
        if (maxEntities < 0) {
            showError('Maximum entities must be 0 or greater');
            return;
        }

        vscode.postMessage({
            command: 'generateERD',
            parameters: {
                maxEntities: maxEntities,
                discoverLinkedEntities: discover,
                entityName: entityName
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            vscode.postMessage({
                command: 'cancel'
            });
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
    });

    // Initialize default values
    maxEntitiesValue.textContent = maxEntitiesInput.value;
    
    // Select medium preset by default
    const mediumPreset = document.querySelector('[data-preset="medium"]');
    if (mediumPreset) {
        mediumPreset.click();
    }

    // Helper function to show errors (could be expanded)
    function showError(message) {
        // For now, just use console.error
        // Could be enhanced to show inline validation errors
        console.error(message);
        vscode.postMessage({
            command: 'showError',
            message: message
        });
    }
});