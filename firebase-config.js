// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCaneS6HGICiAir9IENBfFGy8Z0o5iGX4c",
    authDomain: "expense-tracer-3459e.firebaseapp.com",
    projectId: "expense-tracer-3459e",
    storageBucket: "expense-tracer-3459e.firebasestorage.app",
    messagingSenderId: "1028421504168",
    appId: "1:1028421504168:web:e3a6c5743c03585be0869d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);