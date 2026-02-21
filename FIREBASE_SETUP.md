# Firebase Setup Guide

Before running the app, you need to create and configure a Firebase project.

## Steps

### 1. Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**
3. Name it **Circle of Care** (or anything you prefer)
4. Disable Google Analytics (optional — not needed for Phase 1)
5. Click **Create project**

### 2. Enable Email/Password Authentication

1. In the Firebase console sidebar, go to **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, click **Email/Password**
4. Toggle **Enable** → **Save**

### 3. Create a Firestore Database

1. In the sidebar, go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (allows all reads/writes — fine for development)
4. Select your preferred region → **Enable**

### 4. Register a Web App

1. In **Project Overview** (the home icon), click the **`</>`** (web) icon
2. Name the app (e.g. "Circle of Care Web")
3. Skip Firebase Hosting for now → **Register app**
4. Copy the config object shown — you'll need these values

### 5. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Paste your Firebase config values into `.env`:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

### 6. Run the App

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

---

## Firestore Security Rules (Production)

When ready for production, replace the test-mode rules with these in
**Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own doc
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Circle members can read their circle
    match /circles/{circleId} {
      function isMember() {
        return request.auth != null &&
          exists(/databases/$(database)/documents/circles/$(circleId)/members/$(request.auth.uid));
      }
      function isAdmin() {
        return request.auth != null &&
          get(/databases/$(database)/documents/circles/$(circleId)).data.adminId == request.auth.uid;
      }

      allow read: if isMember();
      allow write: if isAdmin();

      match /members/{memberId} {
        allow read: if isMember();
        allow write: if isAdmin();
      }

      match /invitations/{inviteCode} {
        allow read: if request.auth != null; // Anyone with link can validate
        allow create: if isAdmin();
        allow update: if request.auth != null && isMember(); // Accept invite
        allow delete: if isAdmin();
      }
    }
  }
}
```
