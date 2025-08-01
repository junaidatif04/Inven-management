import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Supplier } from '@/types/inventory';
import { User } from '@/types/auth';
import { getAllUsers, updateUser } from './userService';

// Helper function to convert User to Supplier format
const userToSupplier = (user: User): Supplier => ({
  id: user.id,
  name: user.contactPerson || user.name,
  email: user.email,
  phone: user.phone || '',
  contactPerson: user.contactPerson || user.name,
  status: user.status === 'approved' ? 'active' : 'inactive',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export interface UpdateSupplier {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  status?: 'active' | 'inactive' | 'pending';
}

// Supplier CRUD Operations
export const getAllSuppliers = async (): Promise<Supplier[]> => {
  try {
    const users = await getAllUsers();
    const supplierUsers = users.filter(user => 
      user.role === 'supplier' && user.status === 'approved'
    );
    
    return supplierUsers.map(userToSupplier).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

export const getSupplier = async (id: string): Promise<Supplier | null> => {
  try {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const user = { id: docSnap.id, ...docSnap.data() } as User;
      if (user.role === 'supplier' && user.status === 'approved') {
        return userToSupplier(user);
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (supplier: UpdateSupplier): Promise<void> => {
  try {
    const { id, status, ...supplierData } = supplier;
    
    // Convert supplier status to user status
    const userStatus = status === 'active' ? 'approved' : 'pending';
    
    // Map supplier data to UpdateUser format
    const updateUserData: any = {
      id,
      ...supplierData
    };
    
    // Add status field if it exists in User type
    if (userStatus) {
      updateUserData.status = userStatus;
    }
    
    await updateUser(updateUserData);
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
};

export const toggleSupplierStatus = async (id: string, status: 'active' | 'inactive'): Promise<void> => {
  try {
    const userStatus = status === 'active' ? 'approved' : 'pending';
    await updateUser({
      id,
      status: userStatus
    });
  } catch (error) {
    console.error('Error updating supplier status:', error);
    throw error;
  }
};

// Search and Filter Functions
export const searchSuppliers = async (searchTerm: string): Promise<Supplier[]> => {
  try {
    const allSuppliers = await getAllSuppliers();
    return allSuppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching suppliers:', error);
    throw error;
  }
};

export const getActiveSuppliers = async (): Promise<Supplier[]> => {
  try {
    const users = await getAllUsers();
    const activeSupplierUsers = users.filter(user => 
      user.role === 'supplier' && user.status === 'approved'
    );
    
    return activeSupplierUsers.map(userToSupplier).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching active suppliers:', error);
    throw error;
  }
};

// Auto-register approved supplier users as suppliers (now just validates user data)
export const autoRegisterSupplier = async (user: User): Promise<void> => {
  if (user.role !== 'supplier') {
    return;
  }

  try {
    // Since we're using users collection directly, just ensure user has required supplier fields
    if (!user.contactPerson && !user.name) {
      console.warn(`Supplier user ${user.email} missing contact person or name`);
    }
  } catch (error) {
    console.error('Error in autoRegisterSupplier:', error);
    throw error;
  }
};

// Get supplier by email
export const getSupplierByEmail = async (email: string): Promise<Supplier | null> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email),
      where('role', '==', 'supplier')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const user = {
      id: docSnap.id,
      ...docSnap.data()
    } as User;
    
    if (user.status === 'approved') {
      return userToSupplier(user);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching supplier by email:', error);
    throw error;
  }
};

// Seed suppliers from approved supplier users (now just validates existing users)
// This should only be called during initial setup or manual data migration
export const seedSuppliersFromUsers = async (): Promise<void> => {
  try {
    // Check if this is the first time running by looking for a flag in localStorage
    const hasRunBefore = localStorage.getItem('suppliers_validated');
    if (hasRunBefore) {
      return;
    }

    const users = await getAllUsers();
    const supplierUsers = users.filter(user => 
      user.role === 'supplier'
    );

    for (const user of supplierUsers) {
      await autoRegisterSupplier(user);
    }
    
    // Mark as completed to avoid running again
    localStorage.setItem('suppliers_validated', 'true');
  } catch (error) {
    console.error('Failed to seed suppliers from users:', error);
    throw error;
  }
};

// Get approved supplier users (for dropdowns and selections)
export const getApprovedSupplierUsers = async (): Promise<User[]> => {
  try {
    const users = await getAllUsers();
    return users.filter(user => 
      user.role === 'supplier' && user.status === 'approved'
    );
  } catch (error) {
    console.error('Error fetching approved supplier users:', error);
    throw error;
  }
};

// Reset supplier validation flag (for admin use)
export const resetSupplierValidation = (): void => {
  localStorage.removeItem('suppliers_validated');
};
