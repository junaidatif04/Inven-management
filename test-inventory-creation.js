// Test script to debug inventory creation issue
// This script simulates the quantity request approval process

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { respondToQuantityRequest } from './src/services/displayRequestService.js';

// Firebase config (you'll need to add your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test function to simulate quantity request approval
async function testInventoryCreation() {
  console.log('🧪 Starting inventory creation test...');
  
  try {
    // Test data - replace with actual request ID from your database
    const testRequestId = 'test-request-id';
    const testResponse = {
      status: 'approved_full',
      approvedQuantity: 10,
      notes: 'Test approval for debugging'
    };
    const testUserId = 'test-supplier-user-id';
    
    console.log('📝 Test parameters:', {
      requestId: testRequestId,
      response: testResponse,
      userId: testUserId
    });
    
    // Call the function that should create inventory
    await respondToQuantityRequest(testRequestId, testResponse, testUserId);
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testInventoryCreation();