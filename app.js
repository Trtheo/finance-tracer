import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatCurrency, Modal } from './utils.js';
import { transactionCache } from './cache.js';

let transactions = [];
let currentUser = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user && user.uid) {
        // Clear previous user data
        if (currentUser && currentUser.uid !== user.uid) {
            transactions = [];
            transactionCache.invalidate(currentUser.uid);
        }
        currentUser = user;
        document.getElementById('user-name').textContent = user.displayName || user.email.split('@')[0];
        await loadTransactions();
    } else {
        transactions = [];
        currentUser = null;
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
                calculateTotals();
                renderTransactions();
                initializeChart();
                return;
            }
        }

        if (!currentUser || !currentUser.uid) {
            throw new Error('No authenticated user');
        }

        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc'),
            limit(50)
        );
        const querySnapshot = await getDocs(q);
        transactions = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        
        // Cache the results
        transactionCache.set(currentUser.uid, transactions);
        calculateTotals();
        renderTransactions();
        initializeChart();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}



// Refresh data
function refreshData(force = false) {
    loadTransactions(force);
}

// Calculate totals
function calculateTotals() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const balance = totalIncome - totalExpense;
    
    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    document.getElementById('total-balance').textContent = formatCurrency(balance);
    document.getElementById('month-income').textContent = formatCurrency(monthIncome);
    document.getElementById('month-expense').textContent = formatCurrency(monthExpense);
}

// Render transactions
function renderTransactions() {
    const container = document.getElementById('recent-transactions');
    if (transactions.length === 0) {
        container.innerHTML = '<div class="no-data">No transactions yet. Add your first transaction!</div>';
        return;
    }
    
    container.innerHTML = transactions.slice(0, 5).map(t => `
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

// Chart
function createBalanceChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    const balanceData = getBalanceTrend();
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: balanceData.labels,
            datasets: [{
                data: balanceData.balances,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false },
                x: { grid: { display: false } }
            }
        }
    });
}

function getBalanceTrend() {
    if (transactions.length === 0) {
        return { labels: ['No Data'], balances: [0] };
    }
    
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = [];
    const balances = [];
    let runningBalance = 0;
    
    sortedTransactions.forEach(t => {
        runningBalance += t.amount;
        labels.push(new Date(t.date).toLocaleDateString());
        balances.push(runningBalance);
    });
    
    return { labels: labels.slice(-7), balances: balances.slice(-7) };
}

// Modal functions
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
            <button class="btn-primary" onclick="submitDashboardTransaction()">Add</button>
        `
    });
    modal.open();
}

function closeModal(id) {
    if (id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    } else {
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.classList.remove('active');
            setTimeout(() => {
                if (m.parentNode) {
                    m.parentNode.removeChild(m);
                }
            }, 300);
        });
    }
    document.body.style.overflow = '';
}

// Add transaction
function submitDashboardTransaction() {
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
    
    const transaction = {
        description,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category,
        type,
        date,
        userId: currentUser.uid
    };
    
    saveDashboardTransaction(transaction);
}

async function saveDashboardTransaction(transaction) {
    try {
        const docRef = await addDoc(collection(db, 'transactions'), transaction);
        // Add to cache directly
        transactions.unshift({ id: docRef.id, ...transaction });
        transactionCache.set(currentUser.uid, transactions);
        
        calculateTotals();
        renderTransactions();
        initializeChart();
        closeModal('add-transaction-modal');
    } catch (error) {
        console.error('Error adding transaction:', error);
        showNotificationModal('Error', 'Failed to add transaction');
    }
}

function handleSignOut() {
    signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Sign out error:', error);
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

// Make functions global
window.signOut = handleSignOut;
window.showAddTransaction = showAddTransaction;
window.closeModal = closeModal;
window.submitDashboardTransaction = submitDashboardTransaction;

// Notification modal function
function showNotificationModal(title, message) {
    const modal = new Modal('notification-modal', {
        title: title,
        size: 'small',
        content: `<p>${message}</p>`,
        actions: `<button class="btn-primary" onclick="closeModal('notification-modal')">OK</button>`
    });
    modal.open();
}

window.showNotificationModal = showNotificationModal;

// Initialize chart after data loads
function initializeChart() {
    createBalanceChart();
}

// Refresh data when page becomes visible
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && currentUser) {
        refreshData();
    }
});

// Refresh data when window gains focus (only if cache is stale)
window.addEventListener('focus', () => {
    if (currentUser && transactionCache.needsRefresh(currentUser.uid)) {
        loadTransactions(true);
    }
});

// Listen for currency changes
window.addEventListener('currencyChanged', function() {
    if (currentUser) {
        calculateTotals();
        renderTransactions();
    }
});

// Initialize chart when transactions are loaded
window.initializeChart = initializeChart;