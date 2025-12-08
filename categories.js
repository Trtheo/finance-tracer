import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let editingCategory = null;
let allCategories = { income: [], expense: [] };

// Auth state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-name').textContent = user.displayName || user.email;
        await initializeDefaultCategories();
        await loadCategories();
    } else {
        window.location.href = 'index.html';
    }
});

async function initializeDefaultCategories() {
    try {
        const q = query(collection(db, 'categories'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            const defaultCategories = [
                { name: 'Salary', type: 'income', icon: '💰' },
                { name: 'Freelance', type: 'income', icon: '💼' },
                { name: 'Investment', type: 'income', icon: '📈' },
                { name: 'Food', type: 'expense', icon: '🍔' },
                { name: 'Transportation', type: 'expense', icon: '🚗' },
                { name: 'Entertainment', type: 'expense', icon: '🎬' },
                { name: 'Shopping', type: 'expense', icon: '🛍️' },
                { name: 'Utilities', type: 'expense', icon: '💡' },
                { name: 'Healthcare', type: 'expense', icon: '🏥' },
                { name: 'Education', type: 'expense', icon: '📚' }
            ];
            
            const promises = defaultCategories.map(category => 
                addDoc(collection(db, 'categories'), {
                    ...category,
                    userId: currentUser.uid,
                    createdAt: new Date()
                })
            );
            
            await Promise.all(promises);
            console.log('Default categories initialized');
        }
    } catch (error) {
        console.error('Error initializing categories:', error);
    }
}

// Profile dropdown
document.getElementById('profile-icon').addEventListener('click', () => {
    document.getElementById('profile-menu').classList.toggle('show');
});

document.getElementById('sign-out').addEventListener('click', () => {
    showSignOutModal();
});

// Modal controls
document.getElementById('add-category-btn').addEventListener('click', () => {
    openModal();
});

document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);

// Icon selector
document.querySelectorAll('.icon-option').forEach(icon => {
    icon.addEventListener('click', () => {
        document.querySelectorAll('.icon-option').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
        document.getElementById('category-icon').value = icon.dataset.icon;
    });
});

// Form submission
document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('category-name').value;
    const type = document.getElementById('category-type').value;
    const icon = document.getElementById('category-icon').value;
    
    if (!icon) {
        alert('Please select an icon');
        return;
    }
    
    try {
        if (editingCategory) {
            await updateDoc(doc(db, 'categories', editingCategory.id), {
                name, type, icon,
                userId: currentUser.uid
            });
        } else {
            await addDoc(collection(db, 'categories'), {
                name, type, icon,
                userId: currentUser.uid,
                createdAt: new Date()
            });
        }
        
        closeModal();
        await loadCategories();
        
        if (editingCategory) {
            showNotificationModal('Success', 'Category updated successfully!');
        } else {
            showNotificationModal('Success', 'Category added successfully!');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showNotificationModal('Error', `Failed to save category: ${error.message}`);
    }
});

function openModal(category = null) {
    editingCategory = category;
    
    if (category) {
        document.getElementById('modal-title').textContent = 'Edit Category';
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-type').value = category.type;
        document.getElementById('category-icon').value = category.icon;
        
        document.querySelectorAll('.icon-option').forEach(icon => {
            icon.classList.toggle('selected', icon.dataset.icon === category.icon);
        });
    } else {
        document.getElementById('modal-title').textContent = 'Add Category';
        document.getElementById('category-form').reset();
        document.querySelectorAll('.icon-option').forEach(icon => {
            icon.classList.remove('selected');
        });
    }
    
    document.getElementById('category-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('category-modal').classList.remove('show');
    editingCategory = null;
}

async function loadCategories() {
    try {
        const q = query(collection(db, 'categories'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        const incomeCategories = [];
        const expenseCategories = [];
        
        snapshot.forEach(doc => {
            const category = { id: doc.id, ...doc.data() };
            if (category.type === 'income') {
                incomeCategories.push(category);
            } else {
                expenseCategories.push(category);
            }
        });
        
        allCategories = { income: incomeCategories, expense: expenseCategories };
        applyFilters();
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategories(containerId, categories) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="empty-state">No categories yet</p>';
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <div class="category-item">
            <div class="category-info">
                <span class="category-icon">${category.icon}</span>
                <span class="category-name">${category.name}</span>
                <span class="category-type ${category.type}">${category.type}</span>
            </div>
            <div class="category-actions">
                <button class="btn-icon" onclick="editCategory('${category.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteCategory('${category.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

window.editCategory = async (categoryId) => {
    try {
        const q = query(collection(db, 'categories'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        let category = null;
        snapshot.forEach(doc => {
            if (doc.id === categoryId) {
                category = { id: doc.id, ...doc.data() };
            }
        });
        
        if (category) {
            openModal(category);
        }
    } catch (error) {
        console.error('Error loading category:', error);
    }
};

window.deleteCategory = (categoryId) => {
    showDeleteModal(categoryId);
};

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

function showDeleteModal(categoryId) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal show';
    modal.id = 'delete-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Delete Category?</h3>
            <p>Are you sure you want to delete this category? This action cannot be undone.</p>
            <div class="modal-actions">
                <button class="btn btn-cancel" onclick="closeConfirmationModal('delete-modal')">Cancel</button>
                <button class="btn btn-danger" onclick="confirmDelete('${categoryId}')">Delete</button>
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
    } catch (error) {
        console.error('Sign out error:', error);
        window.location.href = 'index.html';
    }
};

window.confirmDelete = async (categoryId) => {
    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        await loadCategories();
        closeConfirmationModal('delete-modal');
        showNotificationModal('Success', 'Category deleted successfully!');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotificationModal('Error', `Failed to delete category: ${error.message}`);
    }
};

window.showSignOutModal = showSignOutModal;

function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('filter-type')?.value || '';
    
    const filteredIncome = allCategories.income.filter(c => 
        c.name.toLowerCase().includes(searchTerm) && (!typeFilter || typeFilter === 'income')
    );
    
    const filteredExpense = allCategories.expense.filter(c => 
        c.name.toLowerCase().includes(searchTerm) && (!typeFilter || typeFilter === 'expense')
    );
    
    renderCategories('income-categories', filteredIncome);
    renderCategories('expense-categories', filteredExpense);
    
    document.getElementById('income-count').textContent = filteredIncome.length;
    document.getElementById('expense-count').textContent = filteredExpense.length;
}

window.resetFilters = () => {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-type').value = '';
    applyFilters();
};

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterType) filterType.addEventListener('change', applyFilters);
});