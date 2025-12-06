# Netlify Deployment Checklist

## ✅ Files Created/Updated

1. **netlify.toml** - Netlify configuration (build settings, redirects, headers)
2. **.nvmrc** - Node version specification
3. **NETLIFY_DEPLOY.md** - Detailed deployment guide
4. **src/firebase/config.ts** - Updated to use environment variables

## 🚀 Next Steps

### 1. Commit and Push to GitHub

```bash
git add .
git commit -m "Add Netlify deployment configuration"
git push origin main
```

### 2. Configure Netlify

#### A. Build Settings (Auto-detected from netlify.toml)
- ✅ Build command: `npm run build`
- ✅ Publish directory: `dist`
- ✅ Node version: `18`

#### B. Environment Variables
Go to **Netlify Dashboard > Site settings > Environment variables** and add:

```
VITE_FIREBASE_API_KEY=AIzaSyAWd1fGwdNlrvoUA3ELNKN5w0nEhoDUx3g
VITE_FIREBASE_AUTH_DOMAIN=task-manager-5e8f5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=task-manager-5e8f5
VITE_FIREBASE_STORAGE_BUCKET=task-manager-5e8f5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=471275392592
VITE_FIREBASE_APP_ID=1:471275392592:web:51ea4a34dbfab980704b55
VITE_FIREBASE_MEASUREMENT_ID=G-5K55BFM0D0
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

**Note**: Replace `VITE_FIREBASE_VAPID_KEY` with your actual VAPID key from Firebase Console.

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 4. Add Netlify Domain to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `task-manager-5e8f5`
3. Go to **Authentication > Settings > Authorized domains**
4. Click "Add domain"
5. Add your Netlify domain (e.g., `your-site.netlify.app` or your custom domain)

### 5. Trigger Deployment

- Netlify will auto-deploy on push to main branch
- Or manually trigger from Netlify dashboard: **Deploys > Trigger deploy**

### 6. Test Deployment

After deployment, test:
- [ ] Site loads correctly
- [ ] Login page works
- [ ] Signup page works
- [ ] User can create account
- [ ] Admin can create tasks
- [ ] Staff can view assigned tasks
- [ ] Calendar view works
- [ ] No console errors

## 🔧 Troubleshooting

### Build Fails
- Check Node version is 18
- Verify all dependencies in package.json
- Check build logs in Netlify

### White Page
- Verify environment variables are set
- Check browser console for errors
- Ensure Firebase config is correct

### Authentication Issues
- Verify Netlify domain is in Firebase authorized domains
- Check Firestore rules are deployed
- Verify environment variables match Firebase config

### Routing Issues
- Ensure netlify.toml has SPA redirect rule
- Check that all routes redirect to /index.html

## 📝 Important Notes

- Environment variables must start with `VITE_` for Vite to expose them
- The app will fall back to hardcoded values if env vars aren't set (for local dev)
- Always deploy Firestore rules after code changes
- Keep Firebase authorized domains updated

