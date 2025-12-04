import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut as firebaseSignOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, query, where, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { Modal } from './utils.js';

let currentUser = null;

// Check authentication and load user data
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadUserSettings();
    } else {
        window.location.href = 'index.html';
    }
});

// Load user profile data
function loadUserProfile() {
    if (currentUser) {
        document.getElementById('profile-name').value = currentUser.displayName || '';
        document.getElementById('profile-email').value = currentUser.email || '';
    }
}

// Load user settings from localStorage
function loadUserSettings() {
    const settings = JSON.parse(localStorage.getItem('userSettings')) || {};
    
    // Set currency
    const currencySelect = document.getElementById('currency');
    if (settings.currency) {
        currencySelect.value = settings.currency;
    }
    
    // Set notifications
    const notificationsCheckbox = document.getElementById('notifications');
    if (settings.notifications !== undefined) {
        notificationsCheckbox.checked = settings.notifications;
    }
}

// Save user settings
function saveSettings() {
    const settings = {
        currency: document.getElementById('currency').value,
        notifications: document.getElementById('notifications').checked
    };
    
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // Trigger currency update across the app
    window.dispatchEvent(new CustomEvent('currencyChanged'));
    
    showNotificationModal('Success', 'Settings saved successfully!');
}

// Add event listeners for settings changes
document.addEventListener('DOMContentLoaded', () => {
    const currencySelect = document.getElementById('currency');
    const notificationsCheckbox = document.getElementById('notifications');
    
    if (currencySelect) {
        currencySelect.addEventListener('change', saveSettings);
    }
    if (notificationsCheckbox) {
        notificationsCheckbox.addEventListener('change', saveSettings);
    }
});

// Export data function
async function exportData() {
    try {
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const transactions = [];
        querySnapshot.forEach((doc) => {
            transactions.push(doc.data());
        });
        
        if (transactions.length === 0) {
            showNotificationModal('No Data', 'No transactions to export');
            return;
        }
        
        const csvContent = "Date,Description,Category,Type,Amount\n"
            + transactions.map(t => `"${t.date}","${t.description}","${t.category}","${t.type}","${Math.abs(t.amount)}"`).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotificationModal('Success', 'Transactions exported successfully!');
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotificationModal('Error', 'Failed to export data');
    }
}

// Change password function
function showChangePasswordModal() {
    const modal = new Modal('change-password-modal', {
        title: 'Change Password',
        size: 'medium',
        content: `
            <form id="change-password-form">
                <div class="form-group">
                    <label>Current Password</label>
                    <input type="password" id="current-password" placeholder="Enter current password" required>
                </div>
                <div class="form-group">
                    <label>New Password</label>
                    <input type="password" id="new-password" placeholder="Enter new password" required>
                    <small>Password must be at least 8 characters long</small>
                </div>
                <div class="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" id="confirm-password" placeholder="Confirm new password" required>
                </div>
            </form>
        `,
        actions: `
            <button class="btn-secondary" onclick="closeModal('change-password-modal')">Cancel</button>
            <button class="btn-primary" onclick="changePassword()">Change Password</button>
        `
    });
    modal.open();
}

async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (!currentPassword) {
        showNotificationModal('Validation Error', 'Current password is required');
        return;
    }
    if (!newPassword || newPassword.length < 8) {
        showNotificationModal('Validation Error', 'New password must be at least 8 characters long');
        return;
    }
    if (newPassword !== confirmPassword) {
        showNotificationModal('Validation Error', 'New passwords do not match');
        return;
    }
    
    try {
        // Re-authenticate user
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Update password
        await updatePassword(currentUser, newPassword);
        
        closeModal('change-password-modal');
        showNotificationModal('Success', 'Password changed successfully!');
    } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
            showNotificationModal('Error', 'Current password is incorrect');
        } else if (error.code === 'auth/weak-password') {
            showNotificationModal('Error', 'New password is too weak');
        } else {
            showNotificationModal('Error', 'Failed to change password. Please try again.');
        }
    }
}

function showDeleteConfirm() {
    const modal = new Modal('delete-confirm-modal', {
        title: 'Delete All Data',
        size: 'small',
        content: '<p>Are you sure you want to delete all your data? This action cannot be undone.</p>',
        actions: `
            <button class="btn-secondary" onclick="closeModal('delete-confirm-modal')">Cancel</button>
            <button class="btn-danger" onclick="confirmSignOut()">Delete All Data</button>
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
}

async function confirmSignOut() {
    try {
        // Delete all user transactions
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const deletePromises = [];
        querySnapshot.forEach((docSnapshot) => {
            deletePromises.push(deleteDoc(doc(db, 'transactions', docSnapshot.id)));
        });
        await Promise.all(deletePromises);
        
        await firebaseSignOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error during sign out:', error);
        alert('Failed to delete data');
    }
}

function handleSignOut() {
    firebaseSignOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Sign out error:', error);
    });
}

// Make functions global
window.exportData = exportData;
window.showDeleteConfirm = showDeleteConfirm;
window.closeModal = closeModal;
window.confirmSignOut = confirmSignOut;
window.signOut = handleSignOut;
window.saveSettings = saveSettings;
window.showChangePasswordModal = showChangePasswordModal;
window.changePassword = changePassword;

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