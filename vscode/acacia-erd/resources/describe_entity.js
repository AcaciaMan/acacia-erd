document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('entity-table');
    const headers = table.querySelectorAll('th');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const tableBody = table.querySelector('tbody');
            const rows = Array.from(tableBody.querySelectorAll('tr'));
            const index = Array.from(header.parentNode.children).indexOf(header);
            const order = header.classList.contains('sort-asc') ? 'desc' : 'asc';

            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            header.classList.toggle('sort-asc', order === 'asc');
            header.classList.toggle('sort-desc', order === 'desc');

            rows.sort((a, b) => {
                const aText = a.children[index].textContent.trim();
                const bText = b.children[index].textContent.trim();

                if (header.dataset.sort === 'order') {
                    // Sort as numbers
                    const aValue = parseFloat(aText);
                    const bValue = parseFloat(bText);
                    return order === 'asc' ? aValue - bValue : bValue - aValue;
                } else {
                    // Sort as strings
                    return order === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
                }
            });

            rows.forEach(row => tableBody.appendChild(row));
        });
    });
});