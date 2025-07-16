import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CustomerOrder,
  CreateCustomerOrder,
  UpdateCustomerOrder,
  CustomerOrderItem
} from '@/types/order';
import { adjustStock, getInventoryItem } from './inventoryService';

const CUSTOMER_ORDERS_COLLECTION = 'customerOrders';

// Generate order number
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp.slice(-6)}${random}`;
};

// Create customer order
export const createCustomerOrder = async (orderData: CreateCustomerOrder): Promise<string> => {
  try {
    const batch = writeBatch(db);
    
    // Validate inventory availability
    for (const item of orderData.items) {
      const inventoryItem = await getInventoryItem(item.itemId);
      if (!inventoryItem) {
        throw new Error(`Product ${item.itemName} not found`);
      }
      if (!inventoryItem.isPublished) {
        throw new Error(`Product ${item.itemName} is not available for purchase`);
      }
      if (inventoryItem.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.itemName}. Available: ${inventoryItem.quantity}, Requested: ${item.quantity}`);
      }
    }
    
    // Calculate totals
    const itemsWithTotals: CustomerOrderItem[] = orderData.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice
    }));
    
    const totalAmount = itemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Create order
    const orderRef = doc(collection(db, CUSTOMER_ORDERS_COLLECTION));
    batch.set(orderRef, {
      ...orderData,
      items: itemsWithTotals,
      totalAmount,
      orderNumber: generateOrderNumber(),
      status: 'pending',
      orderDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    return orderRef.id;
  } catch (error) {
    console.error('Error creating customer order:', error);
    throw error;
  }
};

// Get all customer orders
export const getAllCustomerOrders = async (): Promise<CustomerOrder[]> => {
  try {
    const q = query(
      collection(db, CUSTOMER_ORDERS_COLLECTION),
      orderBy('orderDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CustomerOrder[];
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    throw error;
  }
};

// Get orders by customer
export const getOrdersByCustomer = async (customerId: string): Promise<CustomerOrder[]> => {
  try {
    const q = query(
      collection(db, CUSTOMER_ORDERS_COLLECTION),
      where('customerId', '==', customerId),
      orderBy('orderDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CustomerOrder[];
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    throw error;
  }
};

// Get pending orders
export const getPendingCustomerOrders = async (): Promise<CustomerOrder[]> => {
  try {
    const q = query(
      collection(db, CUSTOMER_ORDERS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('orderDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CustomerOrder[];
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    throw error;
  }
};

// Accept order (decrements inventory)
export const acceptCustomerOrder = async (orderId: string, userId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Get order details
    const orderDoc = await getDoc(doc(db, CUSTOMER_ORDERS_COLLECTION, orderId));
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }
    
    const order = orderDoc.data() as CustomerOrder;
    
    // Validate inventory again and decrement stock
    for (const item of order.items) {
      const inventoryItem = await getInventoryItem(item.itemId);
      if (!inventoryItem) {
        throw new Error(`Product ${item.itemName} not found`);
      }
      if (inventoryItem.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.itemName}. Available: ${inventoryItem.quantity}, Requested: ${item.quantity}`);
      }
      
      // Decrement inventory
      await adjustStock(
        item.itemId,
        item.quantity,
        'out',
        `Order ${order.orderNumber}`,
        userId,
        `Customer order accepted - ${item.quantity} units sold`
      );
    }
    
    // Update order status
    const orderRef = doc(db, CUSTOMER_ORDERS_COLLECTION, orderId);
    batch.update(orderRef, {
      status: 'accepted',
      acceptedDate: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error accepting customer order:', error);
    throw error;
  }
};

// Cancel order
export const cancelCustomerOrder = async (
  orderId: string,
  cancellationReason: string,
  _userId: string
): Promise<void> => {
  try {
    const orderRef = doc(db, CUSTOMER_ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, {
      status: 'cancelled',
      cancellationReason,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error cancelling customer order:', error);
    throw error;
  }
};

// Update order status
export const updateCustomerOrderStatus = async (
  orderId: string,
  updates: UpdateCustomerOrder,
  _userId: string
): Promise<void> => {
  try {
    const orderRef = doc(db, CUSTOMER_ORDERS_COLLECTION, orderId);
    
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Add timestamp fields based on status
    if (updates.status === 'shipped' && updates.shippedDate) {
      updateData.shippedDate = updates.shippedDate;
    }
    if (updates.status === 'delivered' && updates.deliveredDate) {
      updateData.deliveredDate = updates.deliveredDate;
    }
    
    await updateDoc(orderRef, updateData);
  } catch (error) {
    console.error('Error updating customer order:', error);
    throw error;
  }
};

// Get order by ID
export const getCustomerOrder = async (orderId: string): Promise<CustomerOrder | null> => {
  try {
    const docRef = doc(db, CUSTOMER_ORDERS_COLLECTION, orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as CustomerOrder;
    }
    return null;
  } catch (error) {
    console.error('Error fetching customer order:', error);
    throw error;
  }
};

// Get order statistics
export const getOrderStatistics = async (): Promise<{
  totalOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}> => {
  try {
    const orders = await getAllCustomerOrders();
    
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      acceptedOrders: orders.filter(o => o.status === 'accepted').length,
      shippedOrders: orders.filter(o => o.status === 'shipped').length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + o.totalAmount, 0)
    };
  } catch (error) {
    console.error('Error calculating order statistics:', error);
    throw error;
  }
};