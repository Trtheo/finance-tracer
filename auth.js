import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initializeCategories, initializeUser } from './init-collections.js';

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
        showSuccessModal('Welcome Back!', 'Signed in successfully. Redirecting to dashboard...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
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
        
        // Store user profile and initialize categories
        await initializeUser(userCredential.user.uid, {
            name: name,
            email: email
        });
        await initializeCategories(userCredential.user.uid);
        
        showSuccessModal('Welcome!', 'Account created successfully. Redirecting to dashboard...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
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
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            // Create user profile and initialize categories
            await initializeUser(user.uid, {
                name: user.displayName,
                email: user.email,
                provider: 'google'
            });
            await initializeCategories(user.uid);
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
            console.error('Google sign in error details:', error.code, error.message);
            console.error('Full error object:', error);
            alert(`Google sign in failed: ${error.code} - ${error.message}`);
        }
    }
}

// Forgot Password
function showForgotPassword() {
    document.getElementById('signin-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
}

function backToSignIn() {
    document.getElementById('forgot-password-form').classList.add('hidden');
    document.getElementById('signin-form').classList.remove('hidden');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    clearErrors();
}

async function handleForgotPassword(e) {
    e.preventDefault();
    clearErrors();
    
    const email = document.getElementById('forgot-email').value.trim();
    
    if (!email) {
        showError('forgot-email', 'Email is required');
        return;
    }
    
    if (!validateEmail(email)) {
        showError('forgot-email', 'Please enter a valid email address');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccessModal('Email Sent!', 'Password reset link sent to your email. Please check your inbox and spam folder.');
        setTimeout(() => {
            backToSignIn();
        }, 2000);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            showError('forgot-email', 'No account found with this email address');
        } else if (error.code === 'auth/invalid-email') {
            showError('forgot-email', 'Invalid email address');
        } else if (error.code === 'auth/missing-continue-uri') {
            showError('forgot-email', 'Configuration error. Please contact support.');
        } else if (error.code === 'auth/invalid-continue-uri') {
            showError('forgot-email', 'Configuration error. Please contact support.');
        } else if (error.code === 'auth/unauthorized-continue-uri') {
            showError('forgot-email', 'Configuration error. Please contact support.');
        } else {
            showError('forgot-email', `Error: ${error.code || 'Failed to send reset email'}`);
        }
    }
}

// Success Modal
function showSuccessModal(title, message) {
    const modal = document.createElement('div');
    modal.className = 'success-modal';
    modal.innerHTML = `
        <div class="success-modal-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Make functions global
window.showSignIn = showSignIn;
window.showSignUp = showSignUp;
window.signInWithGoogle = signInWithGoogle;
window.showForgotPassword = showForgotPassword;
window.backToSignIn = backToSignIn;
window.handleForgotPassword = handleForgotPassword;