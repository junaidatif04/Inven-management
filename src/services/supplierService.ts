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
    const q = query(collection(db, 'suppliers'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Supplier[];
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
    const q = query(
      collection(db, 'suppliers'), 
      where('status', '==', 'active'),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Supplier[];
  } catch (error) {
    console.error('Error fetching active suppliers:', error);
    throw error;
  }
};
