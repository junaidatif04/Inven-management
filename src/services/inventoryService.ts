import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc,
  onSnapshot, 
  updateDoc, 

  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, CreateInventoryItem, UpdateInventoryItem, StockMovement } from '@/types/inventory';
import { deleteImage, uploadImage, ImageUploadResult } from './imageUploadService';

// Inventory Items CRUD
export const getAllInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const q = query(collection(db, 'inventory'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryItem[];
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
};

export const getInventoryItem = async (id: string): Promise<InventoryItem | null> => {
  try {
    const docRef = doc(db, 'inventory', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as InventoryItem;
    }
    return null;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    throw error;
  }
};

export const createInventoryItem = async (item: CreateInventoryItem, userId: string): Promise<string> => {
  try {
    console.log('🏭 [INVENTORY SERVICE] Creating inventory item:', {
      productName: item.name,
      productId: item.productId,
      supplierId: item.supplierId,
      quantity: item.quantity,
      category: item.category,
      userId
    });
    
    const status = item.quantity <= 0 ? 'out_of_stock' : 
                  item.quantity <= item.minStockLevel ? 'low_stock' : 'in_stock';
    
    const inventoryItemData = {
      ...item,
      status,
      isPublished: item.isPublished || false, // Default to not published
      supplier: item.supplier || item.supplierName || '', // Backward compatibility
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      updatedBy: userId
    };
    
    console.log('Creating inventory item with data:', inventoryItemData);
    
    console.log('📝 [INVENTORY SERVICE] Adding document to Firestore with data:', inventoryItemData);
    
    const docRef = await addDoc(collection(db, 'inventory'), inventoryItemData);
    
    console.log('✅ [INVENTORY SERVICE] Inventory item created successfully with ID:', docRef.id);
    
    // Create initial stock movement record
    console.log('📦 [INVENTORY SERVICE] Creating initial stock movement for inventory ID:', docRef.id);
    
    await addDoc(collection(db, 'stockMovements'), {
      itemId: docRef.id,
      itemName: item.name,
      type: 'in',
      quantity: item.quantity,
      reason: 'Initial stock',
      performedBy: userId,
      timestamp: serverTimestamp(),
      notes: 'Item created with initial stock'
    });
    
    console.log('✅ [INVENTORY SERVICE] Stock movement created successfully');
    
    console.log('Successfully created inventory item with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ [INVENTORY SERVICE] Error creating inventory item:', {
      error: error,
      inventoryData: item,
      userId
    });
    throw error;
  }
};

export const updateInventoryItem = async (item: UpdateInventoryItem, userId: string): Promise<void> => {
  try {
    const { id, ...updateData } = item;
    
    // Calculate status if quantity is being updated
    if (updateData.quantity !== undefined) {
      const minStock = updateData.minStockLevel || 0;
      updateData.status = updateData.quantity <= 0 ? 'out_of_stock' : 
                         updateData.quantity <= minStock ? 'low_stock' : 'in_stock';
    }
    
    await updateDoc(doc(db, 'inventory', id), {
      ...updateData,
      lastUpdated: serverTimestamp(),
      updatedBy: userId
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  try {
    // Get the item first to check for image
    const itemDoc = await getDoc(doc(db, 'inventory', id));
    if (itemDoc.exists()) {
      const item = itemDoc.data() as InventoryItem;
      
      // Delete image if it exists
      if (item.imagePath) {
        try {
          await deleteImage(item.imagePath);
        } catch (imageError) {
          console.warn('Failed to delete image:', imageError);
        }
      }
    }
    
    const batch = writeBatch(db);
    
    // Delete the inventory item
    batch.delete(doc(db, 'inventory', id));
    
    // Delete related stock movements
    const movementsQuery = query(collection(db, 'stockMovements'), where('itemId', '==', id));
    const movementsSnapshot = await getDocs(movementsQuery);
    movementsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

// Stock Movement Functions
export const adjustStock = async (
  itemId: string, 
  quantity: number, 
  type: 'in' | 'out' | 'adjustment',
  reason: string,
  userId: string,
  notes?: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Get current item
    const itemDoc = await getDoc(doc(db, 'inventory', itemId));
    if (!itemDoc.exists()) {
      throw new Error('Item not found');
    }
    
    const currentItem = itemDoc.data() as InventoryItem;
    let newQuantity = currentItem.quantity;
    
    // Calculate new quantity based on movement type
    switch (type) {
      case 'in':
        newQuantity += quantity;
        break;
      case 'out':
        newQuantity -= quantity;
        break;
      case 'adjustment':
        newQuantity = quantity; // Direct adjustment to specific quantity
        break;
    }
    
    // Ensure quantity doesn't go negative
    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }
    
    // Calculate new status
    const status = newQuantity <= 0 ? 'out_of_stock' : 
                  newQuantity <= currentItem.minStockLevel ? 'low_stock' : 'in_stock';
    
    // Update inventory item
    batch.update(doc(db, 'inventory', itemId), {
      quantity: newQuantity,
      status,
      lastUpdated: serverTimestamp(),
      updatedBy: userId
    });
    
    // Add stock movement record
    const movementRef = doc(collection(db, 'stockMovements'));
    batch.set(movementRef, {
      itemId,
      itemName: currentItem.name,
      type,
      quantity: Math.abs(quantity),
      reason,
      performedBy: userId,
      timestamp: serverTimestamp(),
      notes: notes || ''
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error adjusting stock:', error);
    throw error;
  }
};

// New functions for the proposed workflow
export const getPublishedInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const q = query(
      collection(db, 'inventory'),
      where('isPublished', '==', true),
      where('status', 'in', ['in_stock', 'low_stock']),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryItem[];
  } catch (error) {
    console.error('Error fetching published inventory items:', error);
    throw error;
  }
};

export const getUnpublishedInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const q = query(
      collection(db, 'inventory'),
      where('isPublished', '==', false),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryItem[];
  } catch (error) {
    console.error('Error fetching unpublished inventory items:', error);
    throw error;
  }
};

export const publishInventoryItem = async (itemId: string, userId: string): Promise<void> => {
  try {
    await updateInventoryItem({ id: itemId, isPublished: true }, userId);
  } catch (error) {
    console.error('Error publishing inventory item:', error);
    throw error;
  }
};

export const unpublishInventoryItem = async (itemId: string, userId: string): Promise<void> => {
  try {
    await updateInventoryItem({ id: itemId, isPublished: false }, userId);
  } catch (error) {
    console.error('Error unpublishing inventory item:', error);
    throw error;
  }
};

export const getInStockPublishedItems = async (): Promise<InventoryItem[]> => {
  try {
    const q = query(
      collection(db, 'inventory'),
      where('isPublished', '==', true),
      where('quantity', '>', 0),
      orderBy('quantity'),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryItem[];
  } catch (error) {
    console.error('Error fetching in-stock published items:', error);
    throw error;
  }
};

export const getStockMovements = async (itemId?: string): Promise<StockMovement[]> => {
  try {
    let q;
    if (itemId) {
      q = query(
        collection(db, 'stockMovements'), 
        where('itemId', '==', itemId),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(collection(db, 'stockMovements'), orderBy('timestamp', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StockMovement[];
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw error;
  }
};

// Search and Filter Functions
export const searchInventoryItems = async (searchTerm: string): Promise<InventoryItem[]> => {
  try {
    const allItems = await getAllInventoryItems();
    return allItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching inventory items:', error);
    throw error;
  }
};

// Find existing inventory item by supplier and product details
export const findExistingInventoryItem = async (
  productId: string,
  supplierId: string,
  sku?: string
): Promise<InventoryItem | null> => {
  try {
    console.log('🔍 [INVENTORY SERVICE] Searching for existing inventory item:', { productId, supplierId, sku });
    
    const q = query(
      collection(db, 'inventory'),
      where('supplierId', '==', supplierId)
    );
    const querySnapshot = await getDocs(q);
    
    console.log('📊 [INVENTORY SERVICE] Query results:', {
      supplierItemsFound: querySnapshot.docs.length,
      supplierId
    });
    
    // Find exact match by productId first, then by SKU as fallback
    for (const doc of querySnapshot.docs) {
      const item = { id: doc.id, ...doc.data() } as InventoryItem;
      
      console.log('🔍 [INVENTORY SERVICE] Checking item:', { 
        itemId: item.id, 
        itemName: item.name,
        itemProductId: item.productId,
        itemSku: item.sku,
        searchProductId: productId,
        searchSku: sku
      });
      
      // Primary match: Check by productId if available
      if (item.productId && item.productId === productId) {
        console.log('✅ [INVENTORY SERVICE] ProductId matches, returning existing item:', {
          itemId: item.id,
          productName: item.name,
          currentQuantity: item.quantity
        });
        return item;
      }
      
      // Fallback match: Check by SKU if productId is not available or doesn't match
      if (sku && item.sku && sku.trim() !== '' && item.sku.trim() !== '') {
        if (item.sku.toLowerCase() === sku.toLowerCase()) {
          console.log('✅ [INVENTORY SERVICE] SKU matches, returning existing item:', {
            itemId: item.id,
            productName: item.name,
            currentQuantity: item.quantity
          });
          return item;
        }
      }
    }
    
    console.log('❌ [INVENTORY SERVICE] No existing inventory item found for:', {
      productId,
      supplierId,
      sku
    });
    return null;
  } catch (error) {
    console.error('❌ [INVENTORY SERVICE] Error finding existing inventory item:', error);
    throw error;
  }
};

// Add stock to existing inventory item
export const addStockToExistingItem = async (
  itemId: string,
  additionalQuantity: number,
  userId: string,
  reason: string = 'Stock replenishment from approved request'
): Promise<void> => {
  try {
    await adjustStock(itemId, additionalQuantity, 'in', reason, userId);
  } catch (error) {
    console.error('Error adding stock to existing item:', error);
    throw error;
  }
};

export const getLowStockItems = async (): Promise<InventoryItem[]> => {
  try {
    // First, update all item statuses to ensure they're current
    await updateAllItemStatuses();
    
    const q = query(
      collection(db, 'inventory'), 
      where('status', 'in', ['low_stock', 'out_of_stock'])
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryItem[];
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
};

// Function to update all inventory item statuses based on current quantity and minStockLevel
export const updateAllItemStatuses = async (): Promise<void> => {
  try {
    const allItems = await getAllInventoryItems();
    const batch = writeBatch(db);
    let updateCount = 0;
    
    for (const item of allItems) {
      const currentStatus = item.status;
      const newStatus = item.quantity <= 0 ? 'out_of_stock' : 
                       item.quantity <= item.minStockLevel ? 'low_stock' : 'in_stock';
      
      // Only update if status has changed
      if (currentStatus !== newStatus) {
        batch.update(doc(db, 'inventory', item.id), {
          status: newStatus,
          lastUpdated: serverTimestamp()
        });
        updateCount++;
      }
    }
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Updated status for ${updateCount} inventory items`);
    }
  } catch (error) {
    console.error('Error updating item statuses:', error);
    throw error;
  }
};

// Image Upload Functions
export const uploadInventoryImage = async (file: File, itemId?: string): Promise<ImageUploadResult> => {
  try {
    const folder = 'inventory';
    const fileName = itemId ? `${itemId}_${Date.now()}` : `inventory_${Date.now()}`;
    return await uploadImage(file, folder, fileName);
  } catch (error) {
    console.error('Error uploading inventory image:', error);
    throw new Error('Failed to upload inventory image');
  }
};

export const updateInventoryImage = async (itemId: string, file: File, userId: string): Promise<void> => {
  try {
    // Get current item to check for existing image
    const currentItem = await getInventoryItem(itemId);
    
    // Upload new image
    const uploadResult = await uploadInventoryImage(file, itemId);
    
    // Update item with new image data
    await updateInventoryItem({
      id: itemId,
      imageUrl: uploadResult.url,
      imagePath: uploadResult.path
    }, userId);
    
    // Delete old image if it exists
    if (currentItem?.imagePath && currentItem.imagePath !== uploadResult.path) {
      try {
        await deleteImage(currentItem.imagePath);
      } catch (imageError) {
        console.warn('Failed to delete old inventory image:', imageError);
      }
    }
  } catch (error) {
    console.error('Error updating inventory image:', error);
    throw new Error('Failed to update inventory image');
  }
};

// Stock Reservation Functions
export const reserveStock = async (itemId: string, quantity: number, userId: string): Promise<void> => {
  try {
    const item = await getInventoryItem(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const currentReserved = item.reservedQuantity || 0;
    const availableStock = item.quantity - currentReserved;
    
    if (quantity > availableStock) {
      throw new Error(`Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
    }

    await updateInventoryItem({
      id: itemId,
      reservedQuantity: currentReserved + quantity
    }, userId);

    // Create stock movement record for reservation
    await addDoc(collection(db, 'stockMovements'), {
      itemId,
      itemName: item.name,
      type: 'out',
      quantity,
      reason: 'Stock reserved for order',
      performedBy: userId,
      timestamp: serverTimestamp(),
      notes: 'Stock reservation'
    });
  } catch (error) {
    console.error('Error reserving stock:', error);
    throw error;
  }
};

export const releaseReservation = async (itemId: string, quantity: number, userId: string): Promise<void> => {
  try {
    const item = await getInventoryItem(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const currentReserved = item.reservedQuantity || 0;
    const newReserved = Math.max(0, currentReserved - quantity);

    await updateInventoryItem({
      id: itemId,
      reservedQuantity: newReserved
    }, userId);

    // Create stock movement record for reservation release
    await addDoc(collection(db, 'stockMovements'), {
      itemId,
      itemName: item.name,
      type: 'in',
      quantity,
      reason: 'Stock reservation released',
      performedBy: userId,
      timestamp: serverTimestamp(),
      notes: 'Reservation release'
    });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    throw error;
  }
};

export const confirmStockDeduction = async (itemId: string, quantity: number, userId: string): Promise<void> => {
  try {
    const item = await getInventoryItem(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const currentReserved = item.reservedQuantity || 0;
    const newQuantity = item.quantity - quantity;
    const newReserved = Math.max(0, currentReserved - quantity);

    if (newQuantity < 0) {
      throw new Error('Insufficient stock for deduction');
    }

    // Calculate new status
    const status = newQuantity <= 0 ? 'out_of_stock' : 
                  newQuantity <= item.minStockLevel ? 'low_stock' : 'in_stock';

    await updateInventoryItem({
      id: itemId,
      quantity: newQuantity,
      reservedQuantity: newReserved,
      status
    }, userId);

    // Create stock movement record for confirmed deduction
    await addDoc(collection(db, 'stockMovements'), {
      itemId,
      itemName: item.name,
      type: 'out',
      quantity,
      reason: 'Order confirmed - stock deducted',
      performedBy: userId,
      timestamp: serverTimestamp(),
      notes: 'Confirmed order deduction'
    });
  } catch (error) {
    console.error('Error confirming stock deduction:', error);
    throw error;
  }
};

export const getAvailableStock = (item: InventoryItem): number => {
  const reserved = item.reservedQuantity || 0;
  return Math.max(0, item.quantity - reserved);
};

export const getInStockPublishedItemsWithAvailability = async (): Promise<(InventoryItem & { availableStock: number })[]> => {
  try {
    const items = await getInStockPublishedItems();
    return items
      .map(item => ({
        ...item,
        availableStock: getAvailableStock(item)
      }))
      .filter(item => item.availableStock > 0);
  } catch (error) {
    console.error('Error fetching available published items:', error);
    throw error;
  }
};

// Real-time subscription for published inventory items
export const subscribeToPublishedInventoryItems = (callback: (items: InventoryItem[]) => void): (() => void) => {
  const q = query(
    collection(db, 'inventory'),
    where('isPublished', '==', true),
    where('status', 'in', ['in_stock', 'low_stock']),
    orderBy('name')
  );
  
  return onSnapshot(q, (querySnapshot: any) => {
    const items = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryItem[];
    callback(items);
  }, (error: any) => {
    console.error('Error in published inventory items subscription:', error);
    callback([]);
  });
};

// Real-time subscription for published inventory items with availability
export const subscribeToPublishedInventoryItemsWithAvailability = (callback: (items: (InventoryItem & { availableStock: number })[]) => void): (() => void) => {
  const q = query(
    collection(db, 'inventory'),
    where('isPublished', '==', true),
    where('quantity', '>', 0),
    orderBy('quantity'),
    orderBy('name')
  );
  
  return onSnapshot(q, (querySnapshot: any) => {
    const items = querySnapshot.docs.map((doc: any) => {
      const item = { id: doc.id, ...doc.data() } as InventoryItem;
      return {
        ...item,
        availableStock: getAvailableStock(item)
      };
    }).filter((item: any) => item.availableStock > 0);
    callback(items);
  }, (error: any) => {
    console.error('Error in published inventory items with availability subscription:', error);
    callback([]);
  });
};
