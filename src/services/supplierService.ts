import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Supplier } from '@/types/inventory';
import { User } from '@/types/auth';
import { getAllUsers } from './userService';

export interface CreateSupplier {
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
}

export interface UpdateSupplier extends Partial<CreateSupplier> {
  id: string;
  status?: 'active' | 'inactive';
}

// Supplier CRUD Operations
export const getAllSuppliers = async (): Promise<Supplier[]> => {
  try {
    // Get all suppliers
    const q = query(collection(db, 'suppliers'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    const allSuppliers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Supplier[];

    // Get all approved supplier users
    const users = await getAllUsers();
    const approvedSupplierEmails = new Set(
      users
        .filter(user => user.role === 'supplier' && user.status === 'approved')
        .map(user => user.email)
    );

    // Filter suppliers to only include those with approved user accounts
    return allSuppliers.filter(supplier => 
      approvedSupplierEmails.has(supplier.email)
    );
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

export const getSupplier = async (id: string): Promise<Supplier | null> => {
  try {
    const docRef = doc(db, 'suppliers', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Supplier;
    }
    return null;
  } catch (error) {
    console.error('Error fetching supplier:', error);
    throw error;
  }
};

export const createSupplier = async (supplier: CreateSupplier): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'suppliers'), {
      ...supplier,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (supplier: UpdateSupplier): Promise<void> => {
  try {
    const { id, ...updateData } = supplier;
    
    await updateDoc(doc(db, 'suppliers', id), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'suppliers', id));
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
};

export const toggleSupplierStatus = async (id: string, status: 'active' | 'inactive'): Promise<void> => {
  try {
    await updateDoc(doc(db, 'suppliers', id), {
      status,
      updatedAt: serverTimestamp()
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
    // Get all active suppliers
    const q = query(
      collection(db, 'suppliers'), 
      where('status', '==', 'active'),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    const activeSuppliers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Supplier[];

    // Get all approved supplier users
    const users = await getAllUsers();
    const approvedSupplierEmails = new Set(
      users
        .filter(user => user.role === 'supplier' && user.status === 'approved')
        .map(user => user.email)
    );

    // Filter active suppliers to only include those with approved user accounts
    return activeSuppliers.filter(supplier => 
      approvedSupplierEmails.has(supplier.email)
    );
  } catch (error) {
    console.error('Error fetching active suppliers:', error);
    throw error;
  }
};

// Auto-register approved supplier users as suppliers
export const autoRegisterSupplier = async (user: User): Promise<void> => {
  if (user.role !== 'supplier') {
    return;
  }

  // Check if supplier already exists
  const existingSupplier = await getSupplierByEmail(user.email);
  if (existingSupplier) {
    // Update existing supplier with latest user data
    await updateSupplier({
      id: existingSupplier.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      contactPerson: user.name
    });
    return;
  }

  // Create new supplier record
  const supplierData: CreateSupplier = {
    name: user.companyName || user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    contactPerson: user.name
  };

  await createSupplier(supplierData);
};

// Get supplier by email
export const getSupplierByEmail = async (email: string): Promise<Supplier | null> => {
  try {
    const q = query(
      collection(db, 'suppliers'),
      where('email', '==', email)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Supplier;
  } catch (error) {
    console.error('Error fetching supplier by email:', error);
    throw error;
  }
};

// Seed suppliers from approved supplier users
export const seedSuppliersFromUsers = async (): Promise<void> => {
  try {
    const users = await getAllUsers();
    const supplierUsers = users.filter(user => 
      user.role === 'supplier'
    );

    for (const user of supplierUsers) {
      await autoRegisterSupplier(user);
    }
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

// Sync supplier data with user profile
export const syncSupplierWithUser = async (user: User): Promise<void> => {
  try {
    if (user.role !== 'supplier') {
      return;
    }

    const supplier = await getSupplierByEmail(user.email);
    if (supplier) {
      await updateSupplier({
        id: supplier.id,
        name: user.companyName || user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        contactPerson: user.name
      });
    }
  } catch (error) {
    console.error('Error syncing supplier with user:', error);
    throw error;
  }
};
