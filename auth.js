import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Authentication functionality
function showSignIn() {
    document.getElementById('signin-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showSignUp() {
    document.getElementById('signin-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '-error');
    field.classList.add('error');
    field.classList.remove('success');
    errorDiv.textContent = message;
}

function showSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '-error');
    field.classList.add('success');
    field.classList.remove('error');
    errorDiv.textContent = '';
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('input').forEach(el => {
        el.classList.remove('error', 'success');
    });
}

// Live email validation
document.getElementById('signin-email').addEventListener('input', function() {
    const email = this.value;
    if (email && !validateEmail(email)) {
        showError('signin-email', 'Please enter a valid email address');
    } else if (email) {
        showSuccess('signin-email');
    }
});

document.getElementById('signup-email').addEventListener('input', function() {
    const email = this.value;
    if (email && !validateEmail(email)) {
        showError('signup-email', 'Please enter a valid email address');
    } else if (email) {
        showSuccess('signup-email');
    }
});

// Handle sign in
document.getElementById('signin-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    
    // Validation
    let hasErrors = false;
    
    if (!email) {
        showError('signin-email', 'Email is required');
        hasErrors = true;
    } else if (!validateEmail(email)) {
        showError('signin-email', 'Please enter a valid email address');
        hasErrors = true;
    }
    
    if (!password) {
        showError('signin-password', 'Password is required');
        hasErrors = true;
    }
    
    if (hasErrors) return;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'dashboard.html';
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            showError('signin-email', 'No account found with this email');
        } else if (error.code === 'auth/wrong-password') {
            showError('signin-password', 'Incorrect password');
        } else if (error.code === 'auth/invalid-email') {
            showError('signin-email', 'Invalid email address');
        } else if (error.code === 'auth/invalid-credential') {
            showError('signin-password', 'Invalid email or password');
        } else {
            showError('signin-password', 'Sign in failed. Please try again.');
        }
    }
});

// Handle sign up
document.getElementById('signup-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearErrors();
    
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    
    // Validation
    let hasErrors = false;
    
    if (!name) {
        showError('signup-name', 'Full name is required');
        hasErrors = true;
    }
    
    if (!email) {
        showError('signup-email', 'Email is required');
        hasErrors = true;
    } else if (!validateEmail(email)) {
        showError('signup-email', 'Please enter a valid email address');
        hasErrors = true;
    }
    
    if (!password) {
        showError('signup-password', 'Password is required');
        hasErrors = true;
    } else if (password.length < 8) {
        showError('signup-password', 'Password must be at least 8 characters long');
        hasErrors = true;
    }
    
    if (hasErrors) return;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Store user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: name,
            email: email,
            createdAt: new Date().toISOString()
        });
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showError('signup-email', 'An account with this email already exists');
        } else if (error.code === 'auth/weak-password') {
            showError('signup-password', 'Password is too weak');
        } else if (error.code === 'auth/invalid-email') {
            showError('signup-email', 'Invalid email address');
        } else {
            showError('signup-password', 'Sign up failed. Please try again.');
        }
    }
});

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'dashboard.html';
    }
});

// Google Sign In
async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            // Create user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName,
                email: user.email,
                createdAt: new Date().toISOString(),
                provider: 'google'
            });
        }
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Google sign in error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            // User closed popup, do nothing
            return;
        } else if (error.code === 'auth/cancelled-popup-request') {
            // Multiple popups, do nothing
            return;
        } else {
            alert('Google sign in failed. Please try again.');
        }
    }
}

// Make functions global
window.showSignIn = showSignIn;
window.showSignUp = showSignUp;
window.signInWithGoogle = signInWithGoogle;