import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, query, where, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;

// Check authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'index.html';
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
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Date,Description,Category,Type,Amount\n"
            + transactions.map(t => `${t.date},${t.description},${t.category},${t.type},${t.amount}`).join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'transactions.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Failed to export data');
    }
}

function showDeleteConfirm() {
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('delete-modal').classList.add('hidden');
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