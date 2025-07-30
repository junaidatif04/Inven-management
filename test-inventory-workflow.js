// Test script to debug inventory creation workflow
// Run this with: node test-inventory-workflow.js

console.log('🔍 Testing inventory creation workflow...');

// Simulate the inventory creation process
function simulateInventoryCreation() {
  console.log('\n1. Simulating quantity request approval...');
  
  // Mock data that would come from a quantity request
  const mockQuantityRequest = {
    id: 'test-request-123',
    productId: 'test-product-456',
    productName: 'Test Product',
    supplierId: 'test-supplier-789',
    supplierName: 'Test Supplier',
    requestedQuantity: 100,
    status: 'pending'
  };
  
  const mockResponse = {
    status: 'approved_full',
    approvedQuantity: 100,
    notes: 'Approved for testing'
  };
  
  console.log('Mock quantity request:', mockQuantityRequest);
  console.log('Mock response:', mockResponse);
  
  // Simulate the inventory data creation
  console.log('\n2. Creating inventory data...');
  
  const inventoryData = {
    productId: mockQuantityRequest.productId,
    name: mockQuantityRequest.productName,
    description: '',
    sku: mockQuantityRequest.productId, // Using productId as SKU for direct requests
    category: 'Uncategorized', // Fallback category
    quantity: mockResponse.approvedQuantity,
    minStockLevel: Math.max(1, Math.floor(mockResponse.approvedQuantity * 0.1)),
    maxStockLevel: mockResponse.approvedQuantity * 2,
    unitPrice: 0,
    supplierId: mockQuantityRequest.supplierId,
    supplierName: mockQuantityRequest.supplierName,
    location: 'Main Warehouse',
    isPublished: false
  };
  
  console.log('Generated inventory data:', inventoryData);
  
  // Check for potential issues
  console.log('\n3. Checking for potential issues...');
  
  const issues = [];
  
  if (!inventoryData.productId) {
    issues.push('❌ Missing productId');
  }
  
  if (!inventoryData.name || inventoryData.name.trim() === '') {
    issues.push('❌ Missing or empty product name');
  }
  
  if (!inventoryData.supplierId) {
    issues.push('❌ Missing supplierId');
  }
  
  if (!inventoryData.supplierName || inventoryData.supplierName.trim() === '') {
    issues.push('❌ Missing or empty supplier name');
  }
  
  if (inventoryData.quantity <= 0) {
    issues.push('❌ Invalid quantity (must be > 0)');
  }
  
  if (!inventoryData.sku || inventoryData.sku.trim() === '') {
    issues.push('❌ Missing or empty SKU');
  }
  
  if (issues.length > 0) {
    console.log('Found issues:');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('✅ All required fields are present and valid');
  }
  
  // Simulate status calculation
  console.log('\n4. Calculating inventory status...');
  
  const status = inventoryData.quantity <= 0 ? 'out_of_stock' : 
                inventoryData.quantity <= inventoryData.minStockLevel ? 'low_stock' : 'in_stock';
  
  console.log(`Calculated status: ${status}`);
  
  // Simulate the complete inventory item
  const completeInventoryItem = {
    ...inventoryData,
    status,
    supplier: inventoryData.supplierName, // Backward compatibility
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('\n5. Complete inventory item that would be created:');
  console.log(JSON.stringify(completeInventoryItem, null, 2));
  
  return completeInventoryItem;
}

// Test the workflow
try {
  const result = simulateInventoryCreation();
  console.log('\n✅ Simulation completed successfully');
  console.log('\n📋 Summary:');
  console.log(`- Product: ${result.name}`);
  console.log(`- Supplier: ${result.supplierName}`);
  console.log(`- Quantity: ${result.quantity}`);
  console.log(`- Status: ${result.status}`);
  console.log(`- SKU: ${result.sku}`);
  console.log(`- Category: ${result.category}`);
} catch (error) {
  console.error('❌ Simulation failed:', error);
}

console.log('\n🏁 Test completed');