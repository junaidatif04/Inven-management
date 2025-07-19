import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface CompleteDeleteUserRequest {
  userId: string;
  isSelfDeletion?: boolean;
}

interface CompleteDeleteUserResponse {
  success: boolean;
  message: string;
  deletedItems: string[];
}

// Cloud Function to completely delete a user and all related data
const completeUserDeletionFunction = httpsCallable<CompleteDeleteUserRequest, CompleteDeleteUserResponse>(
  functions,
  'completeUserDeletion'
);

/**
 * Completely delete a user and all their related data
 * This includes: orders, products, notifications, catalog requests, quantity requests,
 * access requests, profile pictures, and updates inventory references
 * 
 * @param userId - The ID of the user to delete
 * @param isSelfDeletion - Whether this is a self-deletion (default: false)
 * @returns Promise with deletion result
 */
export const completeUserDeletion = async (
  userId: string,
  isSelfDeletion: boolean = false
): Promise<CompleteDeleteUserResponse> => {
  try {
    const result = await completeUserDeletionFunction({
      userId,
      isSelfDeletion
    });
    
    return result.data;
  } catch (error: any) {
    console.error('Error in complete user deletion:', error);
    
    // Handle Firebase Functions errors
    if (error.code) {
      switch (error.code) {
        case 'functions/permission-denied':
          throw new Error('You do not have permission to delete this user.');
        case 'functions/not-found':
          throw new Error('User not found in the database.');
        case 'functions/unauthenticated':
          throw new Error('You must be logged in to delete a user.');
        case 'functions/invalid-argument':
          throw new Error('Invalid request. Please use the appropriate deletion method.');
        default:
          throw new Error(`Deletion failed: ${error.message}`);
      }
    }
    
    throw new Error('An unexpected error occurred during user deletion.');
  }
};

/**
 * Delete the current user's account and all related data
 * This is a convenience function for self-deletion
 * 
 * @param userId - The current user's ID
 * @returns Promise with deletion result
 */
export const deleteMyAccount = async (userId: string): Promise<CompleteDeleteUserResponse> => {
  return completeUserDeletion(userId, true);
};

/**
 * Admin function to delete any user and all their related data
 * Only admins can use this function
 * 
 * @param userId - The ID of the user to delete
 * @returns Promise with deletion result
 */
export const adminCompleteUserDeletion = async (userId: string): Promise<CompleteDeleteUserResponse> => {
  return completeUserDeletion(userId, false);
};