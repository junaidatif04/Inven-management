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
exports.getAdminActionLogs = exports.checkEmailExists = exports.deleteUserFromAuth = void 0;
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