import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { User, UserRole } from '@/services/authService';

export interface UpdateUser {
  id: string;
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  address?: string;
  status?: string;
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

// Note: User deletion functionality has been moved to completeUserDeletionService.ts
// Use deleteMyAccount() for self-deletion or adminCompleteUserDeletion() for admin deletion

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
