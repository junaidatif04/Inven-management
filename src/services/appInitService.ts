import { seedSuppliersFromUsers } from './supplierService';
import { auth } from '@/lib/firebase';

// Helper function to wait for authentication to be fully established
const waitForAuth = async (maxRetries = 5, delay = 500): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    if (auth.currentUser) {
      // Additional check to ensure the user token is valid
      try {
        await auth.currentUser.getIdToken();
        return true;
      } catch (error) {
        // Auth token not ready, continue retrying
      }
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

// Initialize app data on startup
export const initializeApp = async (): Promise<void> => {
  try {
    // Wait for authentication to be fully established
    const authReady = await waitForAuth();
    if (!authReady) {
      throw new Error('Authentication not ready for app initialization');
    }
    
    // Only run supplier validation if it hasn't been done before
    // This prevents unnecessary database queries on every login
    await seedSuppliersFromUsers();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Don't throw error to prevent app from breaking - just log it
    // Most app functionality should work even if this fails
  }
};