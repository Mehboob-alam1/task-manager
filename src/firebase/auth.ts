import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './config';
import { getUser, createUser, updateUser } from './firestore';
import { User, UserRole } from '../types';

// Check if Firebase is properly initialized
if (!auth) {
  console.warn('Firebase Auth is not initialized. Please configure Firebase in src/firebase/config.ts');
}

export const login = async (email: string, password: string): Promise<User> => {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please update src/firebase/config.ts');
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  let user = await getUser(firebaseUser.uid);
  
  if (!user) {
    // Create user document if it doesn't exist
    await createUser(firebaseUser.uid, {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || email.split('@')[0],
      role: 'staff', // Default role, admin should be set manually
    });
    user = await getUser(firebaseUser.uid);
  }
  
  if (!user) {
    throw new Error('Failed to retrieve user data');
  }
  
  return user;
};

export const register = async (
  email: string,
  password: string,
  displayName: string,
  role: UserRole = 'staff'
): Promise<User> => {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please update src/firebase/config.ts');
  }
  try {
    console.log('[register] Creating Firebase Auth user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log('[register] Firebase Auth user created:', firebaseUser.uid);
    
    try {
      console.log('[register] Creating Firestore user document...');
      await createUser(firebaseUser.uid, {
        email: firebaseUser.email || email,
        displayName,
        role,
      });
      console.log('[register] Firestore user document created');
    } catch (firestoreError: any) {
      console.error('[register] Error creating Firestore document:', firestoreError);
      // If Firestore fails, try to delete the auth user
      try {
        await firebaseUser.delete();
      } catch (deleteError) {
        console.error('[register] Error deleting auth user:', deleteError);
      }
      throw new Error(`Failed to create user profile: ${firestoreError.message || 'Unknown error'}`);
    }
    
    // Wait a bit for Firestore to sync
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = await getUser(firebaseUser.uid);
    if (!user) {
      throw new Error('User created but profile not found. Please try logging in.');
    }
    
    console.log('[register] User registration successful');
    return user;
  } catch (error: any) {
    console.error('[register] Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please sign in instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }
    throw new Error(error.message || 'Failed to create account. Please try again.');
  }
};

export const logout = async (): Promise<void> => {
  if (!auth) {
    return;
  }
  await signOut(auth);
};

export const getCurrentUser = (): Promise<User | null> => {
  if (!auth) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      unsubscribe();
      if (firebaseUser) {
        const user = await getUser(firebaseUser.uid);
        resolve(user);
      } else {
        resolve(null);
      }
    });
  });
};

export const subscribeToAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  if (!auth) {
    console.warn('[subscribeToAuthState] Auth not initialized, returning null');
    // Call callback immediately with null, don't wait
    setTimeout(() => callback(null), 0);
    return () => {}; // Return no-op unsubscribe function
  }
  
  try {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const user = await getUser(firebaseUser.uid);
          callback(user);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('[subscribeToAuthState] Error getting user:', error);
        callback(null);
      }
    });
  } catch (error) {
    console.error('[subscribeToAuthState] Error setting up listener:', error);
    setTimeout(() => callback(null), 0);
    return () => {};
  }
};

