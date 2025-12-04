import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatCurrency, Modal } from './utils.js';
import { transactionCache } from './cache.js';

let transactions = [];
let currentUser = null;
let editingId = null;
let deletingId = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadTransactions();
    } else {
        window.location.href = 'index.html';
    }
});

// Load transactions from Firestore with caching
async function loadTransactions(forceRefresh = false) {
    try {
        // Check cache first
        if (!forceRefresh) {
            const cached = transactionCache.get(currentUser.uid);
            if (cached) {
                transactions = cached;
                renderAllTransactions();
                return;
            }
        }

        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc'),
            limit(100) // Limit to recent 100 transactions
        );
        const querySnapshot = await getDocs(q);
        transactions = [];
        querySnapshot.forEach((docSnapshot) => {
            transactions.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });
        
        // Cache the results
        transactionCache.set(currentUser.uid, transactions);
        renderAllTransactions();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function renderAllTransactions() {
    const container = document.getElementById('all-transactions');
    if (transactions.length === 0) {
        container.innerHTML = '<div class="no-data">No transactions found. Start by adding your first transaction!</div>';
        return;
    }
    
    container.innerHTML = [...transactions].reverse().map(t => `
        <div class="transaction-item">
            <div class="transaction-icon" style="background: ${t.type === 'income' ? '#dcfce7' : '#fee2e2'}">
                ${getIcon(t.category)}
            </div>
            <div class="transaction-details">
                <h4>${t.description}</h4>
                <small>${t.category} • ${t.date}</small>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : ''}${formatCurrency(t.amount)}
            </div>
            <div class="transaction-actions">
                <button onclick="viewTransaction('${t.id}')" class="btn-view">👁</button>
                <button onclick="editTransaction('${t.id}')" class="btn-edit">✎</button>
                <button onclick="deleteTransaction('${t.id}')" class="btn-delete">×</button>
            </div>
        </div>
    `).join('');
}

function getIcon(category) {
    const icons = {
        'Food': '🍽️',
        'Transportation': '🚗',
        'Entertainment': '🎬',
        'Utilities': '💡',
        'Salary': '💰',
        'Freelance': '💼'
    };
    return icons[category] || '💳';
}

function showAddTransaction() {
    const modal = new Modal('add-transaction-modal', {
        title: 'Add Transaction',
        size: 'medium',
        content: `
            <form id="transaction-form">
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="description" placeholder="Enter description" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Amount</label>
                        <input type="number" id="amount" placeholder="0.00" step="0.01" min="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" id="date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="category" required>
                        <option value="">Select Category</option>
                        <option value="Food">Food</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Salary">Salary</option>
                        <option value="Freelance">Freelance</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="type" required>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                </div>
            </form>
        `,
        actions: `
            <button class="btn-secondary" onclick="closeModal('add-transaction-modal')">Cancel</button>
            <button class="btn-primary" id="submit-btn" onclick="submitTransaction()">Add</button>
        `
    });
    modal.open();
}

function closeModal(id) {
    if (id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    } else {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }
    document.body.style.overflow = '';
    editingId = null;
    deletingId = null;
}

// Handle form submission
function submitTransaction() {
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    
    // Validation
    if (!description) {
        showNotificationModal('Validation Error', 'Description is required');
        return;
    }
    if (!amount || amount <= 0) {
        showNotificationModal('Validation Error', 'Please enter a valid amount');
        return;
    }
    if (!category) {
        showNotificationModal('Validation Error', 'Please select a category');
        return;
    }
    if (!date) {
        showNotificationModal('Validation Error', 'Please select a date');
        return;
    }
    
    const transactionData = {
        description,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category,
        type,
        date,
        userId: currentUser.uid
    };
    
    saveTransaction(transactionData);
}

async function saveTransaction(transactionData) {
    try {
        if (editingId) {
            await updateDoc(doc(db, 'transactions', editingId), transactionData);
            // Update cache directly
            const index = transactions.findIndex(t => t.id === editingId);
            if (index !== -1) {
                transactions[index] = { id: editingId, ...transactionData };
            }
        } else {
            const docRef = await addDoc(collection(db, 'transactions'), transactionData);
            // Add to cache directly
            transactions.unshift({ id: docRef.id, ...transactionData });
        }
        
        // Update cache
        transactionCache.set(currentUser.uid, transactions);
        renderAllTransactions();
        closeModal();
    } catch (error) {
        console.error('Error saving transaction:', error);
        showNotificationModal('Error', 'Failed to save transaction');
    }
}

function viewTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    editingId = id;
    const modal = new Modal('view-transaction-modal', {
        title: 'Transaction Details',
        size: 'medium',
        content: `
            <div class="detail-item"><strong>Description:</strong> ${transaction.description}</div>
            <div class="detail-item"><strong>Amount:</strong> ${formatCurrency(transaction.amount)}</div>
            <div class="detail-item"><strong>Category:</strong> ${transaction.category}</div>
            <div class="detail-item"><strong>Type:</strong> ${transaction.type}</div>
            <div class="detail-item"><strong>Date:</strong> ${transaction.date}</div>
        `,
        actions: `
            <button class="btn-secondary" onclick="closeModal('view-transaction-modal')">Close</button>
            <button class="btn-primary" onclick="editFromView()">Edit</button>
        `
    });
    modal.open();
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    document.getElementById('modal-title').textContent = 'Edit Transaction';
    document.getElementById('description').value = transaction.description;
    document.getElementById('amount').value = Math.abs(transaction.amount);
    document.getElementById('category').value = transaction.category;
    document.getElementById('type').value = transaction.type;
    document.getElementById('date').value = transaction.date;
    document.getElementById('submit-btn').textContent = 'Update';
    editingId = id;
    document.getElementById('add-transaction-modal').classList.remove('hidden');
}

function editFromView() {
    closeModal();
    editTransaction(editingId);
}

function deleteTransaction(id) {
    deletingId = id;
    const modal = new Modal('delete-modal', {
        title: 'Delete Transaction',
        size: 'small',
        content: '<p>Are you sure you want to delete this transaction? This action cannot be undone.</p>',
        actions: `
            <button class="btn-secondary" onclick="closeModal('delete-modal')">Cancel</button>
            <button class="btn-danger" onclick="confirmDelete()">Delete</button>
        `
    });
    modal.open();
}

async function confirmDelete() {
    try {
        await deleteDoc(doc(db, 'transactions', deletingId));
        // Remove from cache directly
        transactions = transactions.filter(t => t.id !== deletingId);
        transactionCache.set(currentUser.uid, transactions);
        renderAllTransactions();
        closeModal();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotificationModal('Error', 'Failed to delete transaction');
    }
}

function handleSignOut() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Sign out error:', error);
    });
}

// Make functions global
window.showAddTransaction = showAddTransaction;
window.closeModal = closeModal;
window.viewTransaction = viewTransaction;
window.editTransaction = editTransaction;
window.editFromView = editFromView;
window.deleteTransaction = deleteTransaction;
window.confirmDelete = confirmDelete;
window.submitTransaction = submitTransaction;
window.signOut = handleSignOut;
window.confirmSignOut = handleSignOut;

// Notification modal function
function showNotificationModal(title, message) {
    const modal = new (window.Modal || Modal)('notification-modal', {
        title: title,
        size: 'small',
        content: `<p>${message}</p>`,
        actions: `<button class="btn-primary" onclick="closeModal('notification-modal')">OK</button>`
    });
    modal.open();
}

window.showNotificationModal = showNotificationModal;

// Listen for currency changes
window.addEventListener('currencyChanged', function() {
    if (currentUser) {
        renderAllTransactions();
    }
});