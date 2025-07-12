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
exports.getAdminActionLogs = exports.deleteUserFromAuth = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Cloud Function to delete a user from Firebase Authentication
// This can only be called by authenticated admin users
exports.deleteUserFromAuth = functions.https.onCall(async (data, context) => {
    // Check if the request is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, adminId } = data;
    const callerId = context.auth.uid;
    // Verify that the caller is the admin making the request
    if (callerId !== adminId) {
        throw new functions.https.HttpsError('permission-denied', 'You can only delete users as yourself.');
    }
    try {
        // Get the admin user's data from Firestore to verify they have admin role
        const adminDoc = await admin.firestore().collection('users').doc(adminId).get();
        if (!adminDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Admin user not found in database.');
        }
        const adminData = adminDoc.data();
        if ((adminData === null || adminData === void 0 ? void 0 : adminData.role) !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Only admin users can delete other users.');
        }
        // Prevent admin from deleting themselves
        if (userId === adminId) {
            throw new functions.https.HttpsError('invalid-argument', 'Admins cannot delete their own account through this method. Use the profile page instead.');
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
        if (error instanceof functions.https.HttpsError) {
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
                    throw new functions.https.HttpsError('internal', 'User not found in Authentication and failed to delete from Firestore');
                }
            }
        }
        throw new functions.https.HttpsError('internal', 'An error occurred while deleting the user');
    }
});
// Cloud Function to get admin action logs
exports.getAdminActionLogs = functions.https.onCall(async (data, context) => {
    // Check if the request is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const callerId = context.auth.uid;
    try {
        // Verify that the caller is an admin
        const adminDoc = await admin.firestore().collection('users').doc(callerId).get();
        if (!adminDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found in database.');
        }
        const adminData = adminDoc.data();
        if ((adminData === null || adminData === void 0 ? void 0 : adminData.role) !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Only admin users can view action logs.');
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
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching admin logs');
    }
});
//# sourceMappingURL=index.js.map