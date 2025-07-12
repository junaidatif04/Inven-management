import { seedSuppliersFromUsers } from './supplierService';

// Initialize app data on startup
export const initializeApp = async (): Promise<void> => {
  try {
    console.log('Initializing app data...');
    
    // Seed suppliers from approved supplier users
    await seedSuppliersFromUsers();
    
    console.log('App initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Don't throw error to prevent app from breaking
  }
};