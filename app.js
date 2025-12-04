import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let transactions = [];
let currentUser = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-name').textContent = user.displayName || user.email.split('@')[0];
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
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        transactions = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        
        calculateTotals();
        renderTransactions();
        initializeChart();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}



// Refresh data
function refreshData() {
    loadTransactions();
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
    
    document.getElementById('total-balance').textContent = balance.toFixed(2);
    document.getElementById('month-income').textContent = monthIncome.toFixed(2);
    document.getElementById('month-expense').textContent = monthExpense.toFixed(2);
}

// Render transactions
function renderTransactions() {
    const container = document.getElementById('recent-transactions');
    if (transactions.length === 0) {
        container.innerHTML = '<div class="no-data">No transactions yet. Add your first transaction!</div>';
        return;
    }
    
    container.innerHTML = transactions.slice(-5).reverse().map(t => `
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
    document.getElementById('add-transaction-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('add-transaction-modal').classList.add('hidden');
}

// Add transaction
document.getElementById('transaction-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const type = document.getElementById('type').value;
    
    const transaction = {
        description,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category,
        type,
        date: new Date().toISOString().split('T')[0],
        userId: currentUser.uid
    };
    
    try {
        await addDoc(collection(db, 'transactions'), transaction);
        await loadTransactions();
        closeModal();
        this.reset();
    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Failed to add transaction');
    }
});

function handleSignOut() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Sign out error:', error);
    });
}

// Make functions global
window.signOut = handleSignOut;
window.showAddTransaction = showAddTransaction;
window.closeModal = closeModal;

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

// Refresh data when window gains focus
window.addEventListener('focus', () => {
    if (currentUser) refreshData();
});

// Initialize chart when transactions are loaded
window.initializeChart = initializeChart;