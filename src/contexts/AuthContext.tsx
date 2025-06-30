import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithGoogle,
  signOut,
  onAuthStateChange,
  User
} from '@/services/authService';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
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
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const user = await signInWithGoogle();
      if (user) {
        setUser(user);
        toast.success(`Welcome back, ${user.name}!`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
      setUser(null);
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  const value = {
    user,
    isLoading,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};