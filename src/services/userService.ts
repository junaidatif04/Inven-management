import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { deleteUser as deleteAuthUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '@/lib/firebase';
import { User, UserRole } from '@/services/authService';

export interface UpdateUser {
  id: string;
  name?: string;
  email?: string;
  role?: UserRole;
}

// User Management CRUD Operations
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const q = query(collection(db, 'users'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getUser = async (id: string): Promise<User | null> => {
  try {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const updateUser = async (user: UpdateUser): Promise<void> => {
  try {
    const { id, ...updateData } = user;
    
    await updateDoc(doc(db, 'users', id), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user from Firestore only
export const deleteUserFromFirestore = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (error) {
    console.error('Error deleting user from Firestore:', error);
    throw error;
  }
};

// Delete user from both Firestore and Firebase Authentication
// This function should be used when the current user is the one being deleted
export const deleteUser = async (id: string): Promise<void> => {
  try {
    // First delete from Firestore
    await deleteUserFromFirestore(id);
    
    // Check if the current user is the one being deleted
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === id) {
      // Delete the user from Firebase Authentication
      await deleteAuthUser(currentUser);
    } else {
      console.warn('Cannot delete user from Authentication - not the current user');
      // Note: To delete other users from Authentication, use adminDeleteUser function
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Admin function to completely delete a user from both Firestore and Firebase Authentication
// This uses Cloud Functions with Firebase Admin SDK
export const adminDeleteUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to perform this action');
    }

    // Call the Cloud Function
    const deleteUserFromAuth = httpsCallable(functions, 'deleteUserFromAuth');
    const result = await deleteUserFromAuth({
      userId: userId,
      adminId: currentUser.uid
    });

    return result.data as { success: boolean; message: string };
  } catch (error) {
    console.error('Error deleting user via admin function:', error);
    
    // Handle specific Firebase Functions errors
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as any;
      switch (firebaseError.code) {
        case 'functions/unauthenticated':
          throw new Error('You must be logged in to delete users');
        case 'functions/permission-denied':
          throw new Error('You do not have permission to delete users. Only admins can delete users.');
        case 'functions/invalid-argument':
          throw new Error('Invalid request. Admins cannot delete their own account through this method.');
        case 'functions/not-found':
          throw new Error('User not found in the system');
        default:
          throw new Error(firebaseError.message || 'An error occurred while deleting the user');
      }
    }
    
    throw error;
  }
};

export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      role,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Search and Filter Functions
export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  try {
    const allUsers = await getAllUsers();
    return allUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  try {
    const q = query(
      collection(db, 'users'), 
      where('role', '==', role),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error fetching users by role:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    } as User;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

export const getUserStats = async () => {
  try {
    const users = await getAllUsers();
    
    // Only count roles defined in the UserRole type
    const stats = {
      total: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      warehouse_staff: users.filter(u => u.role === 'warehouse_staff').length,
      supplier: users.filter(u => u.role === 'supplier').length,
      internal_user: users.filter(u => u.role === 'internal_user').length
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

// Function to migrate any users with 'user' role to 'internal_user'
export const migrateUserRoles = async (): Promise<number> => {
  try {
    // Verify authentication before proceeding
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to migrate user roles');
    }
    
    // Verify the user has a valid token
    await auth.currentUser.getIdToken();
    
    // Get all users
    const q = query(collection(db, 'users'), where('role', '==', 'user'));
    const querySnapshot = await getDocs(q);
    
    let migratedCount = 0;
    
    // Update each user with 'user' role to 'internal_user'
    const batch = writeBatch(db);
    
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { 
        role: 'internal_user',
        updatedAt: serverTimestamp()
      });
      migratedCount++;
    });
    
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`Migrated ${migratedCount} users from 'user' role to 'internal_user'`);
    }
    
    return migratedCount;
  } catch (error) {
    console.error('Error migrating user roles:', error);
    throw error;
  }
};
