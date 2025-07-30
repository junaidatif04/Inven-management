// Test Firebase inventory creation workflow
// This script tests the actual Firebase functions to identify issues

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase config (using environment variables or default)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: process.env.VITE_FIREBASE_APP_ID || "your-app-id"
};

console.log('🔥 Initializing Firebase for testing...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Test function to simulate inventory creation
async function testInventoryCreation() {
  try {
    console.log('\n🧪 Testing Firebase inventory creation...');
    
    // Test data that mimics what would come from quantity request approval
    const testInventoryData = {
      productId: 'test-product-' + Date.now(),
      name: 'Test Product for Inventory',
      description: 'Test product created during quantity request approval',
      sku: 'TEST-SKU-' + Date.now(),
      category: 'Test Category',
      quantity: 50,
      minStockLevel: 5,
      maxStockLevel: 100,
      unitPrice: 25.99,
      supplierId: 'test-supplier-123',
      supplierName: 'Test Supplier Company',
      supplier: 'Test Supplier Company', // Backward compatibility
      location: 'Main Warehouse',
      isPublished: false,
      status: 'in_stock',
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      updatedBy: 'test-user-id'
    };
    
    console.log('📦 Test inventory data:', testInventoryData);
    
    // Attempt to create inventory item
    console.log('\n🚀 Attempting to create inventory item...');
    const docRef = await addDoc(collection(db, 'inventory'), testInventoryData);
    
    console.log('✅ Successfully created inventory item with ID:', docRef.id);
    
    // Verify the item was created
    console.log('\n🔍 Verifying inventory item creation...');
    const verifyQuery = query(
      collection(db, 'inventory'),
      where('productId', '==', testInventoryData.productId)
    );
    
    const querySnapshot = await getDocs(verifyQuery);
    
    if (querySnapshot.empty) {
      console.error('❌ Inventory item was not found after creation!');
      return false;
    } else {
      console.log('✅ Inventory item verified in database');
      const createdItem = querySnapshot.docs[0].data();
      console.log('📋 Created item details:', {
        id: querySnapshot.docs[0].id,
        name: createdItem.name,
        quantity: createdItem.quantity,
        status: createdItem.status,
        supplierId: createdItem.supplierId
      });
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error during inventory creation test:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Test function to check Firestore permissions
async function testFirestorePermissions() {
  try {
    console.log('\n🔐 Testing Firestore permissions...');
    
    // Test reading inventory collection
    console.log('📖 Testing read permissions...');
    const readQuery = query(collection(db, 'inventory'));
    const readSnapshot = await getDocs(readQuery);
    console.log(`✅ Read test successful. Found ${readSnapshot.size} inventory items.`);
    
    // Test writing to inventory collection
    console.log('✍️ Testing write permissions...');
    const testDoc = {
      name: 'Permission Test Item',
      quantity: 1,
      status: 'test',
      createdAt: serverTimestamp()
    };
    
    const writeRef = await addDoc(collection(db, 'inventory'), testDoc);
    console.log('✅ Write test successful. Created document:', writeRef.id);
    
    return true;
  } catch (error) {
    console.error('❌ Permission test failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Firebase inventory creation tests...');
  console.log('Project ID:', firebaseConfig.projectId);
  
  try {
    // Test permissions first
    const permissionsOk = await testFirestorePermissions();
    if (!permissionsOk) {
      console.error('❌ Permission tests failed. Cannot proceed with inventory tests.');
      return;
    }
    
    // Test inventory creation
    const inventoryOk = await testInventoryCreation();
    if (inventoryOk) {
      console.log('\n🎉 All tests passed! Inventory creation workflow is working.');
    } else {
      console.log('\n❌ Inventory creation test failed.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
  
  console.log('\n🏁 Test suite completed.');
}

// Run the tests
runTests().catch(console.error);