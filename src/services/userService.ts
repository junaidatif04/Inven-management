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
import { UserAddress } from '@/types/auth';

export interface UpdateUser {
  id: string;
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  address?: string;
  addresses?: UserAddress[];
  companyName?: string;
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

// Address Management Functions
export const addUserAddress = async (userId: string, address: UserAddress): Promise<void> => {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentAddresses = user.addresses || [];
    
    // Check if user already has 5 addresses
    if (currentAddresses.length >= 5) {
      throw new Error('Maximum of 5 addresses allowed');
    }

    // If this is the first address, make it default
    if (currentAddresses.length === 0) {
      address.isDefault = true;
    }

    // If this address is set as default, remove default from others
    if (address.isDefault) {
      currentAddresses.forEach(addr => addr.isDefault = false);
    }

    const updatedAddresses = [...currentAddresses, address];
    
    await updateDoc(doc(db, 'users', userId), {
      addresses: updatedAddresses,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding user address:', error);
    throw error;
  }
};

export const updateUserAddress = async (userId: string, addressId: string, updatedAddress: Partial<UserAddress>): Promise<void> => {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentAddresses = user.addresses || [];
    const addressIndex = currentAddresses.findIndex(addr => addr.id === addressId);
    
    if (addressIndex === -1) {
      throw new Error('Address not found');
    }

    // If setting this address as default, remove default from others
    if (updatedAddress.isDefault) {
      currentAddresses.forEach(addr => addr.isDefault = false);
    }

    currentAddresses[addressIndex] = { ...currentAddresses[addressIndex], ...updatedAddress };
    
    await updateDoc(doc(db, 'users', userId), {
      addresses: currentAddresses,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user address:', error);
    throw error;
  }
};

export const deleteUserAddress = async (userId: string, addressId: string): Promise<void> => {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentAddresses = user.addresses || [];
    const addressToDelete = currentAddresses.find(addr => addr.id === addressId);
    
    if (!addressToDelete) {
      throw new Error('Address not found');
    }

    const updatedAddresses = currentAddresses.filter(addr => addr.id !== addressId);
    
    // If we deleted the default address and there are other addresses, make the first one default
    if (addressToDelete.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }
    
    await updateDoc(doc(db, 'users', userId), {
      addresses: updatedAddresses,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting user address:', error);
    throw error;
  }
};

export const setDefaultAddress = async (userId: string, addressId: string): Promise<void> => {
  try {
    const user = await getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentAddresses = user.addresses || [];
    const addressExists = currentAddresses.some(addr => addr.id === addressId);
    
    if (!addressExists) {
      throw new Error('Address not found');
    }

    // Remove default from all addresses and set the specified one as default
    const updatedAddresses = currentAddresses.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId
    }));
    
    await updateDoc(doc(db, 'users', userId), {
      addresses: updatedAddresses,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
};

export const getUserAddresses = async (userId: string): Promise<UserAddress[]> => {
  try {
    const user = await getUser(userId);
    return user?.addresses || [];
  } catch (error) {
    console.error('Error getting user addresses:', error);
    throw error;
  }
};
