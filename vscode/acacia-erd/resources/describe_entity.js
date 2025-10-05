document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('entity-table');
    const searchInput = document.getElementById('search-input');
    
    // Initialize sorting if table exists
    if (table) {
        const headers = table.querySelectorAll('th.sortable');

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
    }

    // Search functionality
    if (searchInput && table) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const tableBody = table.querySelector('tbody');
            const rows = tableBody.querySelectorAll('tr');

            rows.forEach(row => {
                const columnName = row.querySelector('.column-name').textContent.toLowerCase();
                const matches = columnName.includes(searchTerm);
                
                if (matches) {
                    row.style.display = '';
                    if (searchTerm.length > 0) {
                        row.classList.add('highlight');
                    } else {
                        row.classList.remove('highlight');
                    }
                } else {
                    row.style.display = 'none';
                    row.classList.remove('highlight');
                }
            });

            // Update empty state if no results
            const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
            if (visibleRows.length === 0 && searchTerm.length > 0) {
                // Show no results message
                let noResultsRow = tableBody.querySelector('.no-results-row');
                if (!noResultsRow) {
                    noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'no-results-row';
                    noResultsRow.innerHTML = `
                        <td colspan="2" style="text-align: center; padding: 40px; color: var(--vscode-descriptionForeground);">
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">No matching columns found</div>
                            <div style="font-size: 12px;">Try a different search term</div>
                        </td>
                    `;
                    tableBody.appendChild(noResultsRow);
                }
                noResultsRow.style.display = '';
            } else {
                const noResultsRow = tableBody.querySelector('.no-results-row');
                if (noResultsRow) {
                    noResultsRow.style.display = 'none';
                }
            }
        });

        // Focus search on Ctrl+F / Cmd+F
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        });
    }

    // Relationship tag click handlers
    const relationshipTags = document.querySelectorAll('.relationship-tag');
    relationshipTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const entityName = tag.textContent.trim();
            // Could send message to extension to navigate to this entity
            console.log('Navigate to entity:', entityName);
        });
    });

    // Add keyboard navigation for table rows
    if (table) {
        const tableBody = table.querySelector('tbody');
        let selectedRowIndex = -1;

        tableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row) {
                // Remove previous selection
                tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('highlight'));
                // Add selection to clicked row
                row.classList.add('highlight');
                selectedRowIndex = Array.from(tableBody.querySelectorAll('tr')).indexOf(row);
            }
        });

        document.addEventListener('keydown', (e) => {
            const rows = Array.from(tableBody.querySelectorAll('tr')).filter(r => r.style.display !== 'none');
            
            if (e.key === 'ArrowDown' && selectedRowIndex < rows.length - 1) {
                e.preventDefault();
                selectedRowIndex++;
                tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('highlight'));
                rows[selectedRowIndex].classList.add('highlight');
                rows[selectedRowIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (e.key === 'ArrowUp' && selectedRowIndex > 0) {
                e.preventDefault();
                selectedRowIndex--;
                tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('highlight'));
                rows[selectedRowIndex].classList.add('highlight');
                rows[selectedRowIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }
});