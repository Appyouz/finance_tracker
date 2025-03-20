document.addEventListener('DOMContentLoaded', function() {
document.getElementById('transactionForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);

  fetch(window.location.href, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'XMLHttpRequest'  // This tells Django it's AJAX!
    }
  })
    .then(response => {
      if (!response.ok) throw new Error('Network error');
      return response.json();
    })
    .then(data => {
      if (data.errors) {
        alert('Error: ' + JSON.stringify(data.errors));
      } else {
        // Add new row to the table
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

        // const totalCell = document.querySelector('#transactionTable tr:last-child td:last-child');

        const totalCell = document.querySelector('#totalAmount');
        totalCell.textContent = data.total;
        this.reset();
      }
    })
    .catch(error => console.error('Error:', error));
});


function handleDelete(e) {
  const button = e.target;
  const transactionId = button.getAttribute('data-transaction-id');
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

  // Send DELETE request to the server
  fetch(`/transactions/${transactionId}/delete/`, {
    method: 'DELETE',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': csrfToken  // Required for CSRF protection
    }
  })
    .then(response => {
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Remove the deleted row from the table
        button.closest('tr').remove();
        // Update the total
        document.getElementById('totalAmount').textContent = data.total;
      }
    })
    .catch(error => {
      alert('Failed to delete transaction: ' + error.message);
    });
}

// Attach event listener to the table (for dynamically added buttons)
document.getElementById('transactionTable').addEventListener('click', function(e) {
  if (e.target.classList.contains('delete-btn')) {
    handleDelete(e);
  }
});



function handleEdit(e) {
  const button = e.target;
  const transactionId = button.getAttribute('data-transaction-id');
  const row = button.closest('tr');
  const categoryCell = row.querySelector('.editable-category');
  const amountCell = row.querySelector('.editable-amount');
  const dateCell = row.querySelector('.editable-date'); // New

  // Check if already in edit mode
  if (button.textContent === 'Save') {
    const categoryInput = categoryCell.querySelector('input');
    const amountInput = amountCell.querySelector('input');
    const dateInput = dateCell.querySelector('input'); // New
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Send AJAX request to save changes
    fetch(`/transactions/${transactionId}/edit/`, {
      method: 'PUT',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: categoryInput.value,
        amount: amountInput.value,
        date: dateInput.value || new Date().toISOString().split('T')[0], // Default to today
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Edit failed');
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Update the cells with new values
          categoryCell.textContent = data.category;
          amountCell.textContent = data.amount;
          dateCell.textContent = data.date; // New
          // Update the total
          document.getElementById('totalAmount').textContent = data.total;
          button.textContent = 'Edit'; // Revert button text
        }
      })
      .catch(error => alert('Error: ' + error.message));
  } else {
    // Enter edit mode: Replace text with input fields
    const currentCategory = categoryCell.textContent;
    const currentAmount = amountCell.textContent;
    const currentDate = dateCell.textContent;

    categoryCell.innerHTML = `<input type="text" value="${currentCategory}">`;
    amountCell.innerHTML = `<input type="number" value="${currentAmount}">`;
    dateCell.innerHTML = `<input type="date" value="${dateCell.textContent}">`; // Date picker
    button.textContent = 'Save'; // Change button to "Save"
  }
}

// Attach event listener for edit buttons
document.getElementById('transactionTable').addEventListener('click', function(e) {
  if (e.target.classList.contains('edit-btn')) {
    handleEdit(e);
  }
});

});
