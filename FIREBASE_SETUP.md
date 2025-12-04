# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "finance-tracker")
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

## 3. Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users
5. Click "Done"

## 4. Get Firebase Configuration

1. In Firebase Console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Enter app nickname (e.g., "Finance Tracker Web")
5. Click "Register app"
6. Copy the configuration object

## 5. Update firebase-config.js

Replace the placeholder values in `firebase-config.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## 6. Set Firestore Security Rules (Optional for Production)

In Firestore Console, go to "Rules" tab and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transactions/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## 7. Test the Application

1. Serve the files using a local server (Firebase requires HTTPS/localhost for auth)
2. You can use: `python -m http.server 8000` or `npx serve .`
3. Open `http://localhost:8000` in your browser
4. Create an account and test the functionality

## Features Implemented

✅ **Firebase Authentication**
- Email/password sign up
- Email/password sign in
- Sign out functionality
- Authentication state management

✅ **Firestore Database**
- User-specific data storage
- Real-time transaction management
- CRUD operations (Create, Read, Update, Delete)
- Data export functionality

✅ **Security**
- User data isolation (each user only sees their own data)
- Authentication required for all operations
- Secure data deletion on account removal

## Migration from localStorage

All localStorage functionality has been replaced with Firebase:
- User authentication → Firebase Auth
- Transaction storage → Firestore collections
- Data persistence → Cloud storage
- Multi-device sync → Automatic with Firebase