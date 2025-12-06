import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWd1fGwdNlrvoUA3ELNKN5w0nEhoDUx3g",
  authDomain: "task-manager-5e8f5.firebaseapp.com",
  projectId: "task-manager-5e8f5",
  storageBucket: "task-manager-5e8f5.firebasestorage.app",
  messagingSenderId: "471275392592",
  appId: "1:471275392592:web:51ea4a34dbfab980704b55",
  measurementId: "G-5K55BFM0D0"
};

// Check if Firebase is configured (not using placeholder values)
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && 
                                    firebaseConfig.projectId !== "YOUR_PROJECT_ID";

// Initialize Firebase only if configured
let app;
try {
  if (isFirebaseConfigured) {
    console.log('Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase is not configured. Please update src/firebase/config.ts with your Firebase credentials.');
    // Create a mock app object to prevent errors
    app = null as any;
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Don't block the app - continue with null app
  app = null as any;
}

// Initialize Firebase services (only if app is initialized)
export const auth = app ? getAuth(app) : null as any;
export const db = app ? getFirestore(app) : null as any;
export const functions = app ? getFunctions(app) : null as any;

// Initialize Firebase Cloud Messaging (only in browser and if app is initialized)
let messaging: ReturnType<typeof getMessaging> | null = null;
if (app && typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('FCM not available:', error);
  }
}

export { messaging };

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY' // TODO: Replace with your VAPID key
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting notification token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  if (!messaging) {
    return Promise.resolve({} as any);
  }
  
  return new Promise((resolve) => {
    onMessage(messaging!, (payload) => {
      resolve(payload);
    });
  });
};

export default app;

