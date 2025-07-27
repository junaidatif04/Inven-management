import * as functions from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

interface DeleteUserRequest {
  userId: string;
  adminId: string;
}

interface CompleteDeleteUserRequest {
  userId: string;
  isSelfDeletion?: boolean;
}

// Cloud Function to delete a user from Firebase Authentication
// This can only be called by authenticated admin users
export const deleteUserFromAuth = onCall(async (request) => {
  // Check if the request is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { userId, adminId } = request.data as DeleteUserRequest;
  const callerId = request.auth.uid;

  // Verify that the caller is the admin making the request
  if (callerId !== adminId) {
    throw new HttpsError(
      'permission-denied',
      'You can only delete users as yourself.'
    );
  }

  try {
    // Get the admin user's data from Firestore to verify they have admin role
    const adminDoc = await admin.firestore().collection('users').doc(adminId).get();
    
    if (!adminDoc.exists) {
      throw new HttpsError(
        'not-found',
        'Admin user not found in database.'
      );
    }

    const adminData = adminDoc.data();
    if (adminData?.role !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Only admin users can delete other users.'
      );
    }

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      throw new HttpsError(
        'invalid-argument',
        'Admins cannot delete their own account through this method. Use the profile page instead.'
      );
    }

    // Delete the user from Firebase Authentication
    await admin.auth().deleteUser(userId);

    // Also delete from Firestore
    await admin.firestore().collection('users').doc(userId).delete();

    // Log the deletion for audit purposes
    await admin.firestore().collection('admin_actions').add({
      action: 'delete_user',
      adminId: adminId,
      targetUserId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: 'User completely deleted from Firebase Authentication and Firestore'
    });

    return {
      success: true,
      message: 'User successfully deleted from both Authentication and Firestore'
    };

  } catch (error) {
    console.error('Error deleting user:', error);
    
    // If it's already a HttpsError, re-throw it
    if (error instanceof HttpsError) {
      throw error;
    }

    // Handle specific Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('auth/user-not-found')) {
        // User doesn't exist in Auth, but we should still try to delete from Firestore
        try {
          await admin.firestore().collection('users').doc(userId).delete();
          return {
            success: true,
            message: 'User deleted from Firestore (was not found in Authentication)'
          };
        } catch (firestoreError) {
          throw new HttpsError(
            'internal',
            'User not found in Authentication and failed to delete from Firestore'
          );
        }
      }
    }

    throw new HttpsError(
      'internal',
      'An error occurred while deleting the user'
    );
  }
});

// Comprehensive Cloud Function to completely delete a user and all related data
export const completeUserDeletion = onCall(async (request) => {
  // Check if the request is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { userId, isSelfDeletion = false } = request.data as CompleteDeleteUserRequest;
  const callerId = request.auth.uid;

  try {
    // Get the user data first to check role and permissions
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new HttpsError(
        'not-found',
        'User not found in database.'
      );
    }

    const userData = userDoc.data();
    const userRole = userData?.role;

    // Permission checks
    if (isSelfDeletion) {
      // User deleting their own account
      if (callerId !== userId) {
        throw new HttpsError(
          'permission-denied',
          'You can only delete your own account.'
        );
      }
    } else {
      // Admin deleting another user's account
      const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
      const callerData = callerDoc.data();
      
      if (callerData?.role !== 'admin') {
        throw new HttpsError(
          'permission-denied',
          'Only admin users can delete other users.'
        );
      }
      
      // Prevent admin from deleting themselves through admin panel
      if (callerId === userId) {
        throw new HttpsError(
          'invalid-argument',
          'Use self-deletion method to delete your own account.'
        );
      }
    }

    const batch = admin.firestore().batch();
    const deletionLog: string[] = [];

    // 1. Delete user's orders
    const ordersSnapshot = await admin.firestore()
      .collection('orders')
      .where('userId', '==', userId)
      .get();
    
    ordersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    deletionLog.push(`${ordersSnapshot.size} orders`);

    // 2. Delete user's products (if supplier)
    if (userRole === 'supplier') {
      const productsSnapshot = await admin.firestore()
        .collection('products')
        .where('supplierId', '==', userId)
        .get();
      
      productsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      deletionLog.push(`${productsSnapshot.size} products`);
    }

    // 3. Delete user's catalog requests
    const catalogRequestsSnapshot = await admin.firestore()
      .collection('catalogRequests')
      .where('userId', '==', userId)
      .get();
    
    catalogRequestsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    deletionLog.push(`${catalogRequestsSnapshot.size} catalog requests`);

    // 4. Delete user's quantity requests (as requester)
    const quantityRequestsSnapshot = await admin.firestore()
      .collection('quantityRequests')
      .where('requestedBy', '==', userId)
      .get();
    
    quantityRequestsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    deletionLog.push(`${quantityRequestsSnapshot.size} quantity requests (as requester)`);

    // 4.1. Delete quantity requests where user is the supplier
    if (userRole === 'supplier') {
      const supplierQuantityRequestsSnapshot = await admin.firestore()
        .collection('quantityRequests')
        .where('supplierId', '==', userId)
        .get();
      
      supplierQuantityRequestsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      deletionLog.push(`${supplierQuantityRequestsSnapshot.size} quantity requests (as supplier)`);

      // 4.2. Delete purchase orders for supplier
      const purchaseOrdersSnapshot = await admin.firestore()
        .collection('purchaseOrders')
        .where('supplierId', '==', userId)
        .get();
      
      purchaseOrdersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      deletionLog.push(`${purchaseOrdersSnapshot.size} purchase orders`);
    }

    // 4.3. Delete warehouse staff specific data
    if (userRole === 'warehouse_staff') {
      // Delete stock movements performed by warehouse staff
      const stockMovementsSnapshot = await admin.firestore()
        .collection('stockMovements')
        .where('performedBy', '==', userId)
        .get();
      
      stockMovementsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      deletionLog.push(`${stockMovementsSnapshot.size} stock movements`);

      // Delete shipments handled by warehouse staff
      const shipmentsSnapshot = await admin.firestore()
        .collection('shipments')
        .where('handledBy', '==', userId)
        .get();
      
      shipmentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      deletionLog.push(`${shipmentsSnapshot.size} shipments`);
    }

    // 5. Delete user's notifications
    const notificationsSnapshot = await admin.firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .get();
    
    notificationsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    deletionLog.push(`${notificationsSnapshot.size} notifications`);

    // 6. Delete user's access requests
    const accessRequestsSnapshot = await admin.firestore()
      .collection('accessRequests')
      .where('email', '==', userData?.email)
      .get();
    
    accessRequestsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    deletionLog.push(`${accessRequestsSnapshot.size} access requests`);

    // 6.1. Delete user's email verification records
    if (userData?.email) {
      try {
        const emailVerificationRef = admin.firestore().collection('emailVerifications').doc(userData.email);
        const emailVerificationDoc = await emailVerificationRef.get();
        
        if (emailVerificationDoc.exists) {
          batch.delete(emailVerificationRef);
          deletionLog.push('email verification record');
        }
      } catch (verificationError) {
        console.warn('Failed to delete email verification:', verificationError);
        deletionLog.push('email verification record (failed)');
      }
    }

    // 7. Delete profile picture from Storage (if exists)
    if (userData?.profilePicture) {
      try {
        const bucket = admin.storage().bucket();
        const profilePicPath = userData.profilePicture.replace(/.*\/o\/(.*?)\?.*/, '$1');
        const decodedPath = decodeURIComponent(profilePicPath);
        await bucket.file(decodedPath).delete();
        deletionLog.push('profile picture from storage');
      } catch (storageError) {
        console.warn('Failed to delete profile picture:', storageError);
        deletionLog.push('profile picture (failed)');
      }
    }

    // 8. Update inventory items where user was the last updater (set to system)
    const inventorySnapshot = await admin.firestore()
      .collection('inventory')
      .where('updatedBy', '==', userId)
      .get();
    
    inventorySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        updatedBy: 'system',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    deletionLog.push(`${inventorySnapshot.size} inventory references updated`);

    // 9. Delete the user document from Firestore
    batch.delete(admin.firestore().collection('users').doc(userId));
    deletionLog.push('user profile');

    // Commit all Firestore deletions
    await batch.commit();

    // 10. Delete user from Firebase Authentication
    try {
      await admin.auth().deleteUser(userId);
      deletionLog.push('authentication record');
    } catch (authError) {
      console.warn('Failed to delete from Authentication:', authError);
      deletionLog.push('authentication record (failed)');
    }

    // 11. Log the deletion for audit purposes
    await admin.firestore().collection('admin_actions').add({
      action: 'complete_user_deletion',
      performedBy: callerId,
      targetUserId: userId,
      targetUserEmail: userData?.email,
      targetUserRole: userRole,
      isSelfDeletion: isSelfDeletion,
      deletedItems: deletionLog,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: `Complete user deletion: ${deletionLog.join(', ')}`
    });

    return {
      success: true,
      message: `User and all related data successfully deleted: ${deletionLog.join(', ')}`,
      deletedItems: deletionLog
    };

  } catch (error) {
    console.error('Error in complete user deletion:', error);
    
    // If it's already a HttpsError, re-throw it
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'An error occurred while deleting the user and related data'
    );
  }
});

// Cloud Function to check if an email exists in the system
// This is used during signup to prevent duplicate accounts
// Note: This function allows unauthenticated calls for signup flow
export const checkEmailExists = onCall(async (request) => {
  const { email } = request.data as { email: string };

  // Validate email parameter
  if (!email || typeof email !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      'Email is required and must be a string.'
    );
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid email format.'
    );
  }

  try {
    // Query Firestore to check if email exists
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    return {
      exists: !usersSnapshot.empty
    };

  } catch (error) {
    console.error('Error checking email existence:', error);
    throw new HttpsError(
      'internal',
      'An error occurred while checking email existence'
    );
  }
});

// Cloud Function to get admin action logs
export const getAdminActionLogs = onCall(async (request) => {
  // Check if the request is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const callerId = request.auth.uid;

  try {
    // Verify that the caller is an admin
    const adminDoc = await admin.firestore().collection('users').doc(callerId).get();
    
    if (!adminDoc.exists) {
      throw new HttpsError(
        'not-found',
        'User not found in database.'
      );
    }

    const adminData = adminDoc.data();
    if (adminData?.role !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Only admin users can view action logs.'
      );
    }

    // Get the last 100 admin actions
    const logsSnapshot = await admin.firestore()
      .collection('admin_actions')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { logs };

  } catch (error) {
    console.error('Error fetching admin logs:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'An error occurred while fetching admin logs'
    );
  }
});