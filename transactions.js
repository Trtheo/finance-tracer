import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Load transactions from Firestore
async function loadTransactions() {
    try {
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        transactions = [];
        querySnapshot.forEach((docSnapshot) => {
            transactions.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });
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
                ${t.type === 'income' ? '+' : ''}$${Math.abs(t.amount).toFixed(2)}
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
    document.getElementById('add-transaction-modal').classList.remove('hidden');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    editingId = null;
    deletingId = null;
    document.getElementById('transaction-form').reset();
    document.getElementById('modal-title').textContent = 'Add Transaction';
    document.getElementById('submit-btn').textContent = 'Add';
}

// Handle form submission
document.getElementById('transaction-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const type = document.getElementById('type').value;
    
    const transactionData = {
        description,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category,
        type,
        userId: currentUser.uid
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'transactions', editingId), transactionData);
        } else {
            await addDoc(collection(db, 'transactions'), {
                ...transactionData,
                date: new Date().toISOString().split('T')[0]
            });
        }
        
        await loadTransactions();
        closeModal();
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Failed to save transaction');
    }
});

function viewTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    document.getElementById('transaction-details').innerHTML = `
        <div class="detail-item"><strong>Description:</strong> ${transaction.description}</div>
        <div class="detail-item"><strong>Amount:</strong> $${Math.abs(transaction.amount).toFixed(2)}</div>
        <div class="detail-item"><strong>Category:</strong> ${transaction.category}</div>
        <div class="detail-item"><strong>Type:</strong> ${transaction.type}</div>
        <div class="detail-item"><strong>Date:</strong> ${transaction.date}</div>
    `;
    editingId = id;
    document.getElementById('view-transaction-modal').classList.remove('hidden');
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    document.getElementById('modal-title').textContent = 'Edit Transaction';
    document.getElementById('description').value = transaction.description;
    document.getElementById('amount').value = Math.abs(transaction.amount);
    document.getElementById('category').value = transaction.category;
    document.getElementById('type').value = transaction.type;
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
    document.getElementById('delete-modal').classList.remove('hidden');
}

async function confirmDelete() {
    try {
        await deleteDoc(doc(db, 'transactions', deletingId));
        await loadTransactions();
        closeModal();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction');
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
window.signOut = handleSignOut;
window.confirmSignOut = handleSignOut;