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
    const status = item.quantity <= 0 ? 'out_of_stock' : 
                  item.quantity <= item.minStockLevel ? 'low_stock' : 'in_stock';
    
    const docRef = await addDoc(collection(db, 'inventory'), {
      ...item,
      status,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      updatedBy: userId
    });
    
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
