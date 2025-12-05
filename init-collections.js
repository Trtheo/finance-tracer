import { db } from './firebase-config.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize default categories
export async function initializeCategories(userId) {
    const categories = [
        { name: 'Food', type: 'expense', icon: '🍔', userId },
        { name: 'Transportation', type: 'expense', icon: '🚗', userId },
        { name: 'Entertainment', type: 'expense', icon: '🎬', userId },
        { name: 'Shopping', type: 'expense', icon: '🛍️', userId },
        { name: 'Bills', type: 'expense', icon: '💡', userId },
        { name: 'Salary', type: 'income', icon: '💰', userId },
        { name: 'Freelance', type: 'income', icon: '💻', userId }
    ];

    for (const category of categories) {
        await addDoc(collection(db, 'categories'), category);
    }
}

// Initialize user profile
export async function initializeUser(userId, userData) {
    await addDoc(collection(db, 'users'), {
        userId,
        email: userData.email,
        displayName: userData.displayName || '',
        currency: 'USD',
        createdAt: new Date(),
        ...userData
    });
}