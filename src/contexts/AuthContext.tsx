import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithGoogle,
  signInWithEmailAndPasswordAuth,
  signUpWithEmailAndPassword,
  signOut,
  onAuthStateChange,
  getCurrentUser,
  User,
  UserRole
} from '@/services/authService';
import { toast } from 'sonner';
import { initializeApp } from '@/services/appInitService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, name: string, role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app data on startup
    initializeApp();
    
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = (): Promise<boolean> => {
    setIsLoading(true);
    return signInWithGoogle()
      .then(user => {
        if (user) {
          setUser(user);
          toast.success(`Welcome, ${user.name}!`);
          return true;
        }
        return false;
      })
      .catch((error: any) => {
        console.error('Login error:', error);

        if (error.message === 'ALREADY_SIGNED_UP') {
          toast.error('This email is already registered. Please sign in instead of signing up.');
        } else if (error.message === 'UNAUTHORIZED_ACCESS') {
          toast.error('Access denied. Please submit an access request first.');
        } else {
          toast.error(error.message || 'Failed to sign in with Google');
        }
        return false;
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const loginWithEmail = (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    return signInWithEmailAndPasswordAuth(email, password)
      .then(user => {
        if (user) {
          setUser(user);
          toast.success(`Welcome, ${user.name}!`);
          return true;
        }
        return false;
      })
      .catch((error: any) => {
        console.error('Email login error:', error);
        toast.error(error.message || 'Failed to sign in with email');
        return false;
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const signUpWithEmail = (email: string, password: string, name: string, role: UserRole): Promise<boolean> => {
    setIsLoading(true);
    return signUpWithEmailAndPassword(email, password, name, role)
      .then(user => {
        if (user) {
          setUser(user);
          toast.success(`Account created successfully! Welcome, ${user.name}!`);
          return true;
        }
        return false;
      })
      .catch((error: any) => {
        console.error('Email signup error:', error);
        
        if (error.message === 'ALREADY_SIGNED_UP') {
          toast.error('This email is already registered. Please sign in instead of signing up.');
        } else {
          toast.error(error.message || 'Failed to create account');
        }
        return false;
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const logout = (): Promise<void> => {
    return signOut()
      .then(() => {
        setUser(null);
        toast.success('Signed out successfully');
      })
      .catch((error: any) => {
        console.error('Logout error:', error);
        toast.error('Failed to sign out');
      });
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value = {
    user,
    isLoading,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};