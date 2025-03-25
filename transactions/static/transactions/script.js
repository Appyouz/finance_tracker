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

    // Set default date for new transaction input
    const newDateInput = document.getElementById('newDate');
    if (newDateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        newDateInput.value = `${year}-${month}-${day}`;
    }

    // Form submission handler for new transactions (INLINE)
    document.getElementById('saveNewTransaction').addEventListener('click', function() {
        const categoryInput = document.getElementById('newCategory');
        const amountInput = document.getElementById('newAmount');
        const dateInput = document.getElementById('newDate');
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        const newTransactionData = {
            category: categoryInput.value,
            amount: amountInput.value,
            date: dateInput.value
        };

        fetch(window.location.href, {
            method: 'POST',
            body: JSON.stringify(newTransactionData),
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            }
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
            newRow.dataset.transactionId = data.id; // Set the data-transaction-id attribute
            newRow.innerHTML = `
                <td class="editable-category">${data.category}</td>
                <td class="editable-amount">${data.amount}</td>
                <td class="editable-date">${data.date}</td>
                <td>
                    <button class="edit-btn" data-transaction-id="${data.id}">Edit</button>
                    <button class="delete-btn" data-transaction-id="${data.id}">Delete</button>
                </td>
            `;

            // Update total display and reset input fields
            document.getElementById('totalAmount').textContent = data.total;
            categoryInput.value = '';
            amountInput.value = '';
            // Keep the date as today's date after successful submission if needed
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;

            // Update chart with new data from response
            if (data.category_totals) {
                console.log("Updating chart with:", data.category_totals);  // Debug log
                initializeChart(data.category_totals);
            }
        })
        .catch(error => console.error('Error:', error));
    });

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
                    if (data.category_totals) {
                        console.log("Updating chart with:", data.category_totals);  // Debug log
                        initializeChart(data.category_totals);
                    }
                }
            })
            .catch(error => alert('Edit error: ' + error.message));
        } else {
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
