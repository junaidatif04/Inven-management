import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 

  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, CreateInventoryItem, UpdateInventoryItem, StockMovement } from '@/types/inventory';
import { deleteImage } from './imageUploadService';

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
    console.log('createInventoryItem called with:', { item, userId });
    
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
    
    const docRef = await addDoc(collection(db, 'inventory'), inventoryItemData);
    
    // Create initial stock movement record
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
    
    console.log('Successfully created inventory item with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating inventory item:', error);
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
  productName: string,
  supplierId: string,
  sku?: string
): Promise<InventoryItem | null> => {
  try {
    const q = query(
      collection(db, 'inventory'),
      where('supplierId', '==', supplierId)
    );
    const querySnapshot = await getDocs(q);
    
    // Find exact match by name and optionally SKU
    for (const doc of querySnapshot.docs) {
      const item = { id: doc.id, ...doc.data() } as InventoryItem;
      
      // Check for exact name match
      if (item.name.toLowerCase() === productName.toLowerCase()) {
        // If SKU is provided, also check SKU match
        if (sku && item.sku && item.sku.toLowerCase() === sku.toLowerCase()) {
          return item;
        }
        // If no SKU provided or SKU matches, return the item
        if (!sku || !item.sku) {
          return item;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding existing inventory item:', error);
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
