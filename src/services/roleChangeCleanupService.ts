import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserRole } from '@/services/authService';
import { notificationService } from '@/services/notificationService';

interface RoleChangeCleanupResult {
  success: boolean;
  deletedItems: string[];
  message: string;
}

/**
 * Clean up user data when changing roles between internal_user and supplier
 * @param userId - The user ID whose role is being changed
 * @param oldRole - The user's current role
 * @param newRole - The new role to assign
 * @returns Promise with cleanup result
 */
export const cleanupUserDataForRoleChange = async (
  userId: string,
  oldRole: UserRole,
  newRole: UserRole
): Promise<RoleChangeCleanupResult> => {
  const deletedItems: string[] = [];
  
  try {
    const batch = writeBatch(db);
    
    // If changing from internal_user to supplier, delete orders
    if (oldRole === 'internal_user' && newRole === 'supplier') {
      // Delete user's orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      ordersSnapshot.forEach((orderDoc) => {
        batch.delete(orderDoc.ref);
      });
      
      if (ordersSnapshot.size > 0) {
        deletedItems.push(`${ordersSnapshot.size} orders`);
      }
    }
    
    // If changing from supplier to internal_user, delete products and requests
    if (oldRole === 'supplier' && newRole === 'internal_user') {
      // Delete user's products
      const productsQuery = query(
        collection(db, 'products'),
        where('supplierId', '==', userId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      
      productsSnapshot.forEach((productDoc) => {
        batch.delete(productDoc.ref);
      });
      
      if (productsSnapshot.size > 0) {
        deletedItems.push(`${productsSnapshot.size} products`);
      }
      
      // Display request cleanup removed - no longer needed
      
      // Delete user's quantity requests
      const quantityRequestsQuery = query(
        collection(db, 'quantityRequests'),
        where('requestedBy', '==', userId)
      );
      const quantityRequestsSnapshot = await getDocs(quantityRequestsQuery);
      
      quantityRequestsSnapshot.forEach((requestDoc) => {
        batch.delete(requestDoc.ref);
      });
      
      if (quantityRequestsSnapshot.size > 0) {
        deletedItems.push(`${quantityRequestsSnapshot.size} quantity requests`);
      }
    }
    
    // Clear all existing notifications for the user when role changes
    try {
      await notificationService.deleteAllUserNotifications(userId);
      deletedItems.push('all notifications');
    } catch (error) {
      console.error('Error clearing user notifications during role change:', error);
      // Don't fail the entire operation if notification cleanup fails
    }
    
    // Commit all deletions
    if (deletedItems.length > 0) {
      await batch.commit();
    }
    
    return {
      success: true,
      deletedItems,
      message: deletedItems.length > 0 
        ? `Role changed successfully. Cleaned up: ${deletedItems.join(', ')}`
        : 'Role changed successfully. No data cleanup required.'
    };
    
  } catch (error) {
    console.error('Error cleaning up user data for role change:', error);
    return {
      success: false,
      deletedItems: [],
      message: 'Role change failed during data cleanup'
    };
  }
};

/**
 * Check if a user has data that would be deleted during role change
 * @param userId - The user ID to check
 * @param oldRole - The user's current role
 * @param newRole - The new role to assign
 * @returns Promise with data counts that would be affected
 */
export const checkUserDataForRoleChange = async (
  userId: string,
  oldRole: UserRole,
  newRole: UserRole
): Promise<{ orders: number; products: number; requests: number }> => {
  try {
    let orders = 0;
    let products = 0;
    let requests = 0;
    
    // If changing from internal_user to supplier, count orders
    if (oldRole === 'internal_user' && newRole === 'supplier') {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      orders = ordersSnapshot.size;
    }
    
    // If changing from supplier to internal_user, count products and requests
    if (oldRole === 'supplier' && newRole === 'internal_user') {
      const productsQuery = query(
        collection(db, 'products'),
        where('supplierId', '==', userId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      products = productsSnapshot.size;
      
      const quantityRequestsQuery = query(
        collection(db, 'quantityRequests'),
        where('requestedBy', '==', userId)
      );
      const quantityRequestsSnapshot = await getDocs(quantityRequestsQuery);
      
      requests = quantityRequestsSnapshot.size;
    }
    
    return { orders, products, requests };
    
  } catch (error) {
    console.error('Error checking user data for role change:', error);
    return { orders: 0, products: 0, requests: 0 };
  }
};