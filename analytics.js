import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { formatCurrency } from './utils.js';
import { transactionCache } from './cache.js';

let transactions = [];
let currentUser = null;

// Check authentication and load data
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

// Profile dropdown
document.getElementById('profile-icon').addEventListener('click', () => {
    document.getElementById('profile-menu').classList.toggle('show');
});

document.getElementById('sign-out').addEventListener('click', () => {
    showSignOutModal();
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile-dropdown')) {
        document.getElementById('profile-menu').classList.remove('show');
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
                calculateAnalytics();
                createCategoryChart();
                createIncomeExpenseChart();
                return;
            }
        }

        if (!currentUser || !currentUser.uid) {
            throw new Error('No authenticated user');
        }

        console.log('Loading analytics for user:', currentUser.uid);
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        transactions = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Analytics transaction:', doc.id, data);
            transactions.push({ id: doc.id, ...data });
        });
        
        console.log('Analytics total transactions:', transactions.length);
        
        // Cache the results
        transactionCache.set(currentUser.uid, transactions);
        calculateAnalytics();
        createCategoryChart();
        createIncomeExpenseChart();
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Calculate analytics data
function calculateAnalytics() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    
    const totalIncome = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpense = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Update main stats
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
    
    // Calculate top category
    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    });
    
    const topCategoryKey = Object.keys(categoryTotals).length > 0 
        ? Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b)
        : null;
    
    document.getElementById('topCategory').textContent = 
        topCategoryKey ? formatCurrency(categoryTotals[topCategoryKey]) : formatCurrency(0);
    
    // Calculate summary statistics
    const monthlyExpenses = {};
    const monthlyIncome = {};
    
    expenses.forEach(t => {
        const month = t.date.slice(0, 7);
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + Math.abs(t.amount);
    });
    
    income.forEach(t => {
        const month = t.date.slice(0, 7);
        monthlyIncome[month] = (monthlyIncome[month] || 0) + Math.abs(t.amount);
    });
    
    const avgMonthlyExpense = Object.keys(monthlyExpenses).length > 0 
        ? Object.values(monthlyExpenses).reduce((a, b) => a + b, 0) / Object.keys(monthlyExpenses).length 
        : 0;
    
    const avgMonthlyIncome = Object.keys(monthlyIncome).length > 0 
        ? Object.values(monthlyIncome).reduce((a, b) => a + b, 0) / Object.keys(monthlyIncome).length 
        : 0;
    
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;
    
    document.getElementById('avgMonthlyExpense').textContent = formatCurrency(avgMonthlyExpense);
    document.getElementById('avgMonthlyIncome').textContent = formatCurrency(avgMonthlyIncome);
    document.getElementById('savingsRate').textContent = `${Math.max(0, savingsRate).toFixed(0)}%`;
}

// Create pie chart for spending by category
function createCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    if (window.categoryChartInstance) {
        window.categoryChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No expense data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const categoryData = {};
    expenses.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + Math.abs(t.amount);
    });
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    window.categoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: window.innerWidth < 768 ? 'bottom' : 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                return {
                                    text: `${label}: ${formatCurrency(value)}`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].backgroundColor[i],
                                    pointStyle: 'circle'
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatCurrency(context.parsed)}`;
                        }
                    }
                }
            }
        }
    });
}

// Create income vs expense chart
function createIncomeExpenseChart() {
    const canvas = document.getElementById('expenseHistogram');
    if (!canvas) return;
    
    if (window.incomeExpenseChartInstance) {
        window.incomeExpenseChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    if (transactions.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Group by month
    const monthlyData = {};
    transactions.forEach(t => {
        const month = t.date.slice(0, 7);
        if (!monthlyData[month]) {
            monthlyData[month] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            monthlyData[month].income += Math.abs(t.amount);
        } else {
            monthlyData[month].expense += Math.abs(t.amount);
        }
    });
    
    const labels = Object.keys(monthlyData).sort().slice(-6);
    const incomeData = labels.map(month => monthlyData[month].income);
    const expenseData = labels.map(month => monthlyData[month].expense);
    
    window.incomeExpenseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(month => {
                const date = new Date(month + '-01');
                return date.toLocaleDateString('en-US', { month: 'short' });
            }),
            datasets: [{
                label: 'Income',
                data: incomeData,
                backgroundColor: '#10b981',
                borderRadius: 4
            }, {
                label: 'Expense',
                data: expenseData,
                backgroundColor: '#ef4444',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: window.innerWidth < 768 ? 10 : 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Refresh data when page becomes visible
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && currentUser) {
        loadTransactions();
    }
});

// Listen for currency changes
window.addEventListener('currencyChanged', function() {
    if (currentUser) {
        calculateAnalytics();
    }
});

// Refresh only if cache is stale
window.addEventListener('focus', () => {
    if (currentUser && transactionCache.needsRefresh(currentUser.uid)) {
        loadTransactions(true);
    }
});

function showSignOutModal() {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal show';
    modal.id = 'signout-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Sign Out?</h3>
            <p>Are you sure you want to sign out? You'll need to sign in again to access your account.</p>
            <div class="modal-actions">
                <button class="btn btn-cancel" onclick="closeConfirmationModal('signout-modal')">Cancel</button>
                <button class="btn btn-danger" onclick="confirmSignOut()">Sign Out</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.closeConfirmationModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
};

window.confirmSignOut = async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Sign out error:', error);
        window.location.href = 'index.html';
    }
};

window.showSignOutModal = showSignOutModal;

// Mobile menu toggle
function toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('mobile-open');
}

window.toggleMobileMenu = toggleMobileMenu;

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    const sidebar = document.querySelector('.sidebar');
    const navMenu = document.getElementById('nav-menu');
    if (!sidebar.contains(e.target) && navMenu.classList.contains('mobile-open')) {
        navMenu.classList.remove('mobile-open');
    }
});