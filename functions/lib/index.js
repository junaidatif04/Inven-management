"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminActionLogs = exports.checkEmailExists = exports.completeUserDeletion = exports.deleteUserFromAuth = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Cloud Function to delete a user from Firebase Authentication
// This can only be called by authenticated admin users
exports.deleteUserFromAuth = (0, https_1.onCall)(async (request) => {
    // Check if the request is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, adminId } = request.data;
    const callerId = request.auth.uid;
    // Verify that the caller is the admin making the request
    if (callerId !== adminId) {
        throw new https_1.HttpsError('permission-denied', 'You can only delete users as yourself.');
    }
    try {
        // Get the admin user's data from Firestore to verify they have admin role
        const adminDoc = await admin.firestore().collection('users').doc(adminId).get();
        if (!adminDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Admin user not found in database.');
        }
        const adminData = adminDoc.data();
        if ((adminData === null || adminData === void 0 ? void 0 : adminData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admin users can delete other users.');
        }
        // Prevent admin from deleting themselves
        if (userId === adminId) {
            throw new https_1.HttpsError('invalid-argument', 'Admins cannot delete their own account through this method. Use the profile page instead.');
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
    }
    catch (error) {
        console.error('Error deleting user:', error);
        // If it's already a HttpsError, re-throw it
        if (error instanceof https_1.HttpsError) {
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
                }
                catch (firestoreError) {
                    throw new https_1.HttpsError('internal', 'User not found in Authentication and failed to delete from Firestore');
                }
            }
        }
        throw new https_1.HttpsError('internal', 'An error occurred while deleting the user');
    }
});
// Comprehensive Cloud Function to completely delete a user and all related data
exports.completeUserDeletion = (0, https_1.onCall)(async (request) => {
    // Check if the request is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, isSelfDeletion = false } = request.data;
    const callerId = request.auth.uid;
    try {
        // Get the user data first to check role and permissions
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'User not found in database.');
        }
        const userData = userDoc.data();
        const userRole = userData === null || userData === void 0 ? void 0 : userData.role;
        // Permission checks
        if (isSelfDeletion) {
            // User deleting their own account
            if (callerId !== userId) {
                throw new https_1.HttpsError('permission-denied', 'You can only delete your own account.');
            }
        }
        else {
            // Admin deleting another user's account
            const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
            const callerData = callerDoc.data();
            if ((callerData === null || callerData === void 0 ? void 0 : callerData.role) !== 'admin') {
                throw new https_1.HttpsError('permission-denied', 'Only admin users can delete other users.');
            }
            // Prevent admin from deleting themselves through admin panel
            if (callerId === userId) {
                throw new https_1.HttpsError('invalid-argument', 'Use self-deletion method to delete your own account.');
            }
        }
        const batch = admin.firestore().batch();
        const deletionLog = [];
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
            .where('email', '==', userData === null || userData === void 0 ? void 0 : userData.email)
            .get();
        accessRequestsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        deletionLog.push(`${accessRequestsSnapshot.size} access requests`);
        // 6.1. Delete user's email verification records
        if (userData === null || userData === void 0 ? void 0 : userData.email) {
            try {
                const emailVerificationRef = admin.firestore().collection('emailVerifications').doc(userData.email);
                const emailVerificationDoc = await emailVerificationRef.get();
                if (emailVerificationDoc.exists) {
                    batch.delete(emailVerificationRef);
                    deletionLog.push('email verification record');
                }
            }
            catch (verificationError) {
                console.warn('Failed to delete email verification:', verificationError);
                deletionLog.push('email verification record (failed)');
            }
        }
        // 7. Delete profile picture from Storage (if exists)
        if (userData === null || userData === void 0 ? void 0 : userData.profilePicture) {
            try {
                const bucket = admin.storage().bucket();
                const profilePicPath = userData.profilePicture.replace(/.*\/o\/(.*?)\?.*/, '$1');
                const decodedPath = decodeURIComponent(profilePicPath);
                await bucket.file(decodedPath).delete();
                deletionLog.push('profile picture from storage');
            }
            catch (storageError) {
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
        }
        catch (authError) {
            console.warn('Failed to delete from Authentication:', authError);
            deletionLog.push('authentication record (failed)');
        }
        // 11. Log the deletion for audit purposes
        await admin.firestore().collection('admin_actions').add({
            action: 'complete_user_deletion',
            performedBy: callerId,
            targetUserId: userId,
            targetUserEmail: userData === null || userData === void 0 ? void 0 : userData.email,
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
    }
    catch (error) {
        console.error('Error in complete user deletion:', error);
        // If it's already a HttpsError, re-throw it
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An error occurred while deleting the user and related data');
    }
});
// Cloud Function to check if an email exists in the system
// This is used during signup to prevent duplicate accounts
exports.checkEmailExists = (0, https_1.onCall)(async (request) => {
    const { email } = request.data;
    // Validate email parameter
    if (!email || typeof email !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Email is required and must be a string.');
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid email format.');
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
    }
    catch (error) {
        console.error('Error checking email existence:', error);
        throw new https_1.HttpsError('internal', 'An error occurred while checking email existence');
    }
});
// Cloud Function to get admin action logs
exports.getAdminActionLogs = (0, https_1.onCall)(async (request) => {
    // Check if the request is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const callerId = request.auth.uid;
    try {
        // Verify that the caller is an admin
        const adminDoc = await admin.firestore().collection('users').doc(callerId).get();
        if (!adminDoc.exists) {
            throw new https_1.HttpsError('not-found', 'User not found in database.');
        }
        const adminData = adminDoc.data();
        if ((adminData === null || adminData === void 0 ? void 0 : adminData.role) !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Only admin users can view action logs.');
        }
        // Get the last 100 admin actions
        const logsSnapshot = await admin.firestore()
            .collection('admin_actions')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        const logs = logsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { logs };
    }
    catch (error) {
        console.error('Error fetching admin logs:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An error occurred while fetching admin logs');
    }
});
//# sourceMappingURL=index.js.map