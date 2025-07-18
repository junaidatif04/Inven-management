// Test Script for Duplicate Inventory Prevention
// Run this in browser console to test the duplicate prevention logic

// Test 1: Simulate duplicate quantity request creation
async function testDuplicateRequestPrevention() {
  console.log('=== Testing Duplicate Request Prevention ===');
  
  const testProduct = {
    productId: 'test-product-123',
    productName: 'Test Product for Duplicate Prevention',
    supplierId: 'test-supplier-456',
    supplierName: 'Test Supplier',
    supplierEmail: 'supplier@test.com',
    requestedQuantity: 50
  };
  
  try {
    // First request (should create new)
    console.log('Creating first quantity request...');
    const firstRequestId = await createQuantityRequest(
      testProduct,
      'admin-user-id',
      'Admin User'
    );
    console.log('First request created:', firstRequestId);
    
    // Second request (should combine with first)
    console.log('Creating second quantity request for same product...');
    const secondRequestId = await createQuantityRequest(
      {
        ...testProduct,
        requestedQuantity: 30 // Different quantity
      },
      'warehouse-user-id',
      'Warehouse Staff'
    );
    console.log('Second request result:', secondRequestId);
    
    // Check if they're the same (combined)
    if (firstRequestId === secondRequestId) {
      console.log('✅ SUCCESS: Requests were combined!');
      
      // Verify the combined quantity
      const combinedRequest = await getQuantityRequest(firstRequestId);
      if (combinedRequest && combinedRequest.requestedQuantity === 80) {
        console.log('✅ SUCCESS: Quantities were combined correctly (50 + 30 = 80)');
      } else {
        console.log('❌ FAIL: Quantities not combined correctly');
      }
    } else {
      console.log('❌ FAIL: Duplicate requests were created');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test 2: Simulate inventory duplicate detection
async function testInventoryDuplicateDetection() {
  console.log('=== Testing Inventory Duplicate Detection ===');
  
  const testInventoryData = {
    name: 'Test Inventory Item',
    supplierId: 'test-supplier-789',
    sku: 'TEST-SKU-001'
  };
  
  try {
    // Check for existing item (should find none initially)
    console.log('Checking for existing inventory item...');
    const existingItem = await findExistingInventoryItem(
      testInventoryData.name,
      testInventoryData.supplierId,
      testInventoryData.sku
    );
    
    if (!existingItem) {
      console.log('✅ No existing item found (as expected for new product)');
    } else {
      console.log('Found existing item:', existingItem.id);
    }
    
    // Test case variations
    console.log('Testing case-insensitive matching...');
    const caseTestItem = await findExistingInventoryItem(
      testInventoryData.name.toUpperCase(),
      testInventoryData.supplierId,
      testInventoryData.sku.toLowerCase()
    );
    
    if (existingItem && caseTestItem && existingItem.id === caseTestItem.id) {
      console.log('✅ SUCCESS: Case-insensitive matching works');
    } else if (!existingItem && !caseTestItem) {
      console.log('✅ SUCCESS: Consistent results for case variations');
    } else {
      console.log('❌ FAIL: Case-insensitive matching inconsistent');
    }
    
  } catch (error) {
    console.error('Inventory test failed:', error);
  }
}

// Test 3: End-to-end workflow test
async function testEndToEndWorkflow() {
  console.log('=== Testing End-to-End Workflow ===');
  
  const workflowTest = {
    productId: 'workflow-test-product',
    productName: 'Workflow Test Product',
    supplierId: 'workflow-test-supplier',
    supplierName: 'Workflow Test Supplier',
    supplierEmail: 'workflow@test.com'
  };
  
  try {
    // Step 1: Create quantity request
    console.log('Step 1: Creating quantity request...');
    const requestId = await createQuantityRequest(
      {
        ...workflowTest,
        requestedQuantity: 100
      },
      'test-user-id',
      'Test User'
    );
    console.log('Request created:', requestId);
    
    // Step 2: Simulate supplier approval (this would create inventory)
    console.log('Step 2: Simulating supplier approval...');
    // Note: This would typically be done through the UI
    // await respondToQuantityRequest(requestId, {
    //   status: 'approved_full',
    //   approvedQuantity: 100
    // }, 'supplier-user-id');
    
    console.log('✅ Workflow test setup complete');
    console.log('To complete test: Login as supplier and approve the request');
    
  } catch (error) {
    console.error('Workflow test failed:', error);
  }
}

// Utility function to run all tests
async function runAllTests() {
  console.log('🧪 Starting Duplicate Prevention Tests...');
  console.log('Make sure you have the necessary permissions and are logged in.');
  
  await testDuplicateRequestPrevention();
  console.log('\n');
  
  await testInventoryDuplicateDetection();
  console.log('\n');
  
  await testEndToEndWorkflow();
  
  console.log('\n🏁 All tests completed. Check console output for results.');
}

// Manual test instructions
function showManualTestInstructions() {
  console.log(`
📋 MANUAL TEST INSTRUCTIONS:

1. DUPLICATE REQUEST TEST:
   - Login as Admin
   - Create quantity request for any product (note the quantity)
   - Login as Warehouse Staff
   - Create another request for the SAME product
   - Check: Should see only ONE request with combined quantity

2. INVENTORY DUPLICATE TEST:
   - Ensure you have quantity requests for same product
   - Login as Supplier
   - Approve first request (creates inventory)
   - Approve second request for same product
   - Check: Should see only ONE inventory item with combined stock

3. VERIFICATION:
   - Open browser console
   - Look for logs starting with:
     * "Finding existing inventory item:"
     * "Checking for existing pending quantity requests:"
     * "Processing approved quantity request:"

4. DATABASE CHECK:
   - Go to Firebase Console
   - Check 'inventory' collection for duplicates
   - Check 'quantityRequests' for combined requests
   - Look for 'notes' field with "Combined request" text

Run runAllTests() to execute automated tests.
Run showManualTestInstructions() to see this again.`);
}

// Export functions for console use
window.testDuplicatePrevention = {
  runAllTests,
  testDuplicateRequestPrevention,
  testInventoryDuplicateDetection,
  testEndToEndWorkflow,
  showManualTestInstructions
};

console.log('🔧 Duplicate Prevention Test Suite Loaded!');
console.log('Available commands:');
console.log('- testDuplicatePrevention.runAllTests()');
console.log('- testDuplicatePrevention.showManualTestInstructions()');
console.log('- Individual test functions also available');

// Auto-show instructions
showManualTestInstructions();