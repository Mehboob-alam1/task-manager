# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Project Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Services**
   - **Authentication**: Go to Authentication > Sign-in method > Enable Email/Password
   - **Firestore**: Go to Firestore Database > Create database (start in production mode)
   - **Cloud Functions**: Go to Functions > Get started
   - **Cloud Messaging**: Go to Project Settings > Cloud Messaging > Enable

3. **Get Configuration**
   - Go to Project Settings > General
   - Scroll to "Your apps" > Web app
   - Copy the Firebase configuration object

4. **Update Config File**
   - Open `src/firebase/config.ts`
   - Replace the placeholder values with your Firebase config:
     ```typescript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

5. **Get VAPID Key for FCM**
   - Go to Project Settings > Cloud Messaging
   - Under "Web Push certificates", click "Generate key pair" if you don't have one
   - Copy the key
   - Update `src/firebase/config.ts`:
     ```typescript
     vapidKey: 'YOUR_VAPID_KEY'
     ```

### 3. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 4. Login to Firebase

```bash
firebase login
```

### 5. Initialize Firebase (if not already done)

```bash
firebase init
```

Select:
- Firestore (for rules and indexes)
- Functions
- Hosting

### 6. Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 7. Setup Cloud Functions

```bash
cd functions
npm install
cd ..
```

Deploy functions:
```bash
firebase deploy --only functions
```

### 8. Create Initial Admin User

**Option 1: Via Firebase Console**
1. Go to Authentication > Users
2. Click "Add user"
3. Enter email and password
4. Copy the User UID
5. Go to Firestore > Create document in `users` collection:
   - Document ID: The User UID from step 3
   - Fields:
     - `email` (string): User's email
     - `displayName` (string): User's name
     - `role` (string): "admin"
     - `createdAt` (timestamp): Current timestamp

**Option 2: Via Code (requires Admin SDK)**
- You'll need to create a Cloud Function or use Firebase Admin SDK to create users programmatically

### 9. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

### 10. Build for Production

```bash
npm run build
```

### 11. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

## Troubleshooting

### Firestore Permission Denied
- Make sure you've deployed the security rules: `firebase deploy --only firestore:rules`
- Check that your user document exists in the `users` collection with the correct role

### Functions Not Running
- Make sure you've deployed the functions: `firebase deploy --only functions`
- Check Firebase Console > Functions for any errors
- Ensure you have a billing account enabled (required for Cloud Functions)

### Notifications Not Working
- Make sure you've set the VAPID key in `src/firebase/config.ts`
- Check browser console for FCM errors
- Ensure the user has granted notification permissions

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Check that TypeScript is properly configured
- Run `npm run lint` to check for code issues

## Next Steps

1. **Email Integration**: Set up a 3rd party email service (SendGrid, Mailgun, etc.) in Cloud Functions for daily report emails
2. **Custom Domain**: Configure a custom domain in Firebase Hosting
3. **Monitoring**: Set up Firebase Performance Monitoring and Crashlytics
4. **Backup**: Configure Firestore backups

## Support

For issues or questions, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

