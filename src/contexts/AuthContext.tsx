import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { subscribeToAuthState, login, logout, register } from '../firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role: 'admin' | 'staff') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth state listener');
    let mounted = true;
    
    // Set a timeout to stop loading even if auth doesn't respond (3 seconds)
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('[AuthProvider] Loading timeout - setting loading to false');
        setLoading(false);
      }
    }, 3000);
    
    try {
      const unsubscribe = subscribeToAuthState((user) => {
        if (mounted) {
          console.log('[AuthProvider] Auth state changed', user);
          clearTimeout(timeout);
          setUser(user);
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        clearTimeout(timeout);
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error('[AuthProvider] Error setting up auth state:', error);
      clearTimeout(timeout);
      if (mounted) {
        setLoading(false);
      }
      return () => {}; // Return no-op function
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const user = await login(email, password);
    setUser(user);
  };

  const handleRegister = async (
    email: string,
    password: string,
    displayName: string,
    role: 'admin' | 'staff'
  ) => {
    const user = await register(email, password, displayName, role);
    setUser(user);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

