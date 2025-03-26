const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('erd-generation-form');

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const maxEntities = document.getElementById('maxEntities').value;
        const discoverLinkedEntities = document.getElementById('discoverLinkedEntities').checked;
        const entityName = document.getElementById('entityName').value;

        vscode.postMessage({
            command: 'generateERD',
            parameters: {
                maxEntities: parseInt(maxEntities, 10),
                discoverLinkedEntities: discoverLinkedEntities,
                entityName: entityName
            }
        });
    });
});