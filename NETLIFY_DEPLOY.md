# Netlify Deployment Guide

## Prerequisites
- GitHub repository with your code
- Netlify account connected to your GitHub repo

## Deployment Steps

### 1. Build Settings in Netlify

In your Netlify dashboard, go to **Site settings > Build & deploy > Build settings**:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `18` (or use `.nvmrc` file)

### 2. Environment Variables

Go to **Site settings > Environment variables** and add:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

**Note**: For production, you should use environment variables instead of hardcoding in `config.ts`.

### 3. Update Firebase Config for Production

Update `src/firebase/config.ts` to use environment variables:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAWd1fGwdNlrvoUA3ELNKN5w0nEhoDUx3g",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "task-manager-5e8f5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "task-manager-5e8f5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "task-manager-5e8f5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "471275392592",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:471275392592:web:51ea4a34dbfab980704b55",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5K55BFM0D0"
};
```

### 4. Deploy Firestore Rules

Make sure your Firestore security rules are deployed:

```bash
firebase deploy --only firestore:rules
```

### 5. Deploy Cloud Functions (Optional)

If you want to use Cloud Functions:

```bash
firebase deploy --only functions
```

### 6. Firebase Hosting Domain Configuration

In Firebase Console, add your Netlify domain to authorized domains:
- Go to **Authentication > Settings > Authorized domains**
- Add your Netlify domain (e.g., `your-site.netlify.app`)

### 7. CORS Configuration

If you encounter CORS issues, make sure your Firebase project allows requests from your Netlify domain.

## Post-Deployment Checklist

- [ ] Environment variables set in Netlify
- [ ] Firestore rules deployed
- [ ] Firebase authorized domains updated
- [ ] Test login/signup functionality
- [ ] Test task creation (admin)
- [ ] Test task updates (staff)
- [ ] Verify notifications work
- [ ] Check console for any errors

## Troubleshooting

### Build Fails
- Check Node version (should be 18)
- Verify all dependencies are in `package.json`
- Check build logs in Netlify dashboard

### Authentication Not Working
- Verify Firebase authorized domains include Netlify domain
- Check environment variables are set correctly
- Verify Firestore rules allow user creation

### White Page After Deploy
- Check browser console for errors
- Verify all environment variables are set
- Check that `dist` folder contains built files

### Routing Issues
- Ensure `netlify.toml` has the SPA redirect rule
- Verify all routes redirect to `/index.html`

