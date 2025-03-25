document.addEventListener('DOMContentLoaded', function() {
    let myChart = null; // Store chart instance

    // Chart management functions
    const initializeChart = (chartData) => {
        console.log("Initializing chart with data:", chartData);  // Debug log
        if (myChart) {
            console.log("Destroying existing chart instance", myChart);
            myChart.destroy();
        }
        
        const ctx = document.getElementById('categoryChart').getContext('2d');
        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(item => item.category),
                datasets: [{
                    label: 'Amount Spent',
                    data: chartData.map(item => item.total),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    };

    // Initial chart setup from hidden JSON element
    const initialData = JSON.parse(document.getElementById('chart-data').textContent);
    initializeChart(initialData);

    // Form submission handler for new transactions
    document.getElementById('transactionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            console.log("New transaction data:", data); // Debug log
            if (data.errors) {
                alert('Error: ' + JSON.stringify(data.errors));
                return;
            }

            // Update transaction table with new row
            const table = document.getElementById('transactionTable');
            const newRow = table.insertRow(table.rows.length - 1);
            newRow.innerHTML = `
                <td class="editable-category">${data.category}</td>
                <td class="editable-amount">${data.amount}</td>
                <td class="editable-date">${data.date}</td>
                <td>
                    <button class="edit-btn" data-transaction-id="${data.id}">Edit</button>
                    <button class="delete-btn" data-transaction-id="${data.id}">Delete</button>
                </td>
            `;

            // Update total display and reset form
            document.getElementById('totalAmount').textContent = data.total;
            this.reset();

            // Update chart with new data from response
            if (data.category_totals) {
                console.log("Updating chart with:", data.category_totals);  // Debug log
                initializeChart(data.category_totals);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Delete handler

// Delete handler
function handleDelete(e) {
    const button = e.target;
    const transactionId = button.getAttribute('data-transaction-id');
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    fetch(`/transactions/${transactionId}/delete/`, {
        method: 'DELETE',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Delete failed');
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Remove the deleted row and update total display
            button.closest('tr').remove();
            document.getElementById('totalAmount').textContent = data.total;
            // Instead of using window.location.href, fetch from the index endpoint explicitly.
            fetch('/transactions/index/?ajax=1&ts=' + new Date().getTime(), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(updatedData => {
                console.log("Fetched updated data after delete:", updatedData);  // Debug log
                initializeChart(updatedData.category_totals);
            });
        }
    })
    .catch(error => alert('Delete error: ' + error.message));
}
    // Edit handler
    function handleEdit(e) {
        const button = e.target;
        const transactionId = button.getAttribute('data-transaction-id');
        const row = button.closest('tr');
        const cells = {
            category: row.querySelector('.editable-category'),
            amount: row.querySelector('.editable-amount'),
            date: row.querySelector('.editable-date')
        };

        if (button.textContent === 'Save') {
            const inputs = {
                category: cells.category.querySelector('input').value,
                amount: cells.amount.querySelector('input').value,
                date: cells.date.querySelector('input').value || new Date().toISOString().split('T')[0]
            };

            fetch(`/transactions/${transactionId}/edit/`, {
                method: 'PUT',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inputs)
            })
            .then(response => {
                if (!response.ok) throw new Error('Edit failed');
                return response.json();
            })
            .then(data => {
                console.log("Edit response data:", data);  // Debug log
                if (data.success) {
                    // Update row cells with new data
                    cells.category.textContent = data.category;
                    cells.amount.textContent = data.amount;
                    cells.date.textContent = data.date;
                    document.getElementById('totalAmount').textContent = data.total;
                    button.textContent = 'Edit';
                    // Update chart after edit if data provided
                    if (data.category_totals) {
                        console.log("Updating chart with:", data.category_totals);  // Debug log
                        initializeChart(data.category_totals);
                    }
                }
            })
            .catch(error => alert('Edit error: ' + error.message));
        } else {
            // Turn cells into input fields for editing
            Object.entries(cells).forEach(([key, cell]) => {
                cell.innerHTML = `<input type="${key === 'date' ? 'date' : key === 'amount' ? 'number' : 'text'}" 
                                       value="${cell.textContent}">`;
            });
            button.textContent = 'Save';
        }
    }

    // Event delegation for dynamic buttons in the table
    document.getElementById('transactionTable').addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) handleDelete(e);
        if (e.target.classList.contains('edit-btn')) handleEdit(e);
    });
});
