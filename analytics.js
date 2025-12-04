import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let transactions = [];
let currentUser = null;

// Check authentication and load data
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
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        
        calculateAnalytics();
        createCategoryChart();
        createExpenseHistogram();
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
    
    // Update stats
    document.querySelector('.stats-grid .stat-card:nth-child(2) .amount').textContent = `$${totalIncome.toFixed(2)}`;
    document.querySelector('.stats-grid .stat-card:nth-child(3) .amount').textContent = `$${totalExpense.toFixed(2)}`;
    
    // Calculate top category
    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    });
    
    const topCategoryKey = Object.keys(categoryTotals).length > 0 
        ? Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b)
        : null;
    
    document.querySelector('.stats-grid .stat-card:nth-child(1) .amount').textContent = 
        topCategoryKey ? `$${categoryTotals[topCategoryKey].toFixed(2)}` : '$0.00';
}

// Create pie chart for spending by category
function createCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No expense data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const categoryData = {};
    expenses.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + Math.abs(t.amount);
    });
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    new Chart(ctx, {
        type: 'doughnut',
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
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Create histogram for monthly expenses
function createExpenseHistogram() {
    const ctx = document.getElementById('expenseHistogram').getContext('2d');
    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No expense data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // Group by month
    const monthlyData = {};
    expenses.forEach(t => {
        const month = t.date.slice(0, 7); // YYYY-MM
        monthlyData[month] = (monthlyData[month] || 0) + Math.abs(t.amount);
    });
    
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(month => monthlyData[month]);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(month => {
                const date = new Date(month + '-01');
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }),
            datasets: [{
                label: 'Monthly Expenses',
                data: data,
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
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