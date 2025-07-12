import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/services/authService';

// Create a test supplier user for testing purposes
export const createTestSupplierUser = async (): Promise<void> => {
  try {
    const testSupplierId = 'test-supplier-001';
    
    const testSupplierUser: User = {
      id: testSupplierId,
      email: 'test.supplier@example.com',
      name: 'Test Supplier Company',
      role: 'supplier',
      isEmailVerified: true,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', testSupplierId), testSupplierUser);
    console.log('Test supplier user created successfully:', testSupplierUser);
  } catch (error) {
    console.error('Error creating test supplier user:', error);
    throw error;
  }
};

// Create multiple test supplier users
export const createMultipleTestSuppliers = async (): Promise<void> => {
  try {
    const testSuppliers = [
      {
        id: 'supplier-001',
        email: 'acme.corp@example.com',
        name: 'ACME Corporation',
        role: 'supplier' as const
      },
      {
        id: 'supplier-002', 
        email: 'global.supplies@example.com',
        name: 'Global Supplies Ltd',
        role: 'supplier' as const
      },
      {
        id: 'supplier-003',
        email: 'tech.solutions@example.com', 
        name: 'Tech Solutions Inc',
        role: 'supplier' as const
      }
    ];

    for (const supplier of testSuppliers) {
      const supplierUser: User = {
        ...supplier,
        isEmailVerified: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', supplier.id), supplierUser);
      console.log('Created test supplier:', supplier.name);
    }

    console.log('All test supplier users created successfully!');
  } catch (error) {
    console.error('Error creating test supplier users:', error);
    throw error;
  }
};